(function () {
  var topics = [], practice = [], quiz = [], interview = [];
  var R = String.raw; // raw template: backslashes in shell code stay as typed
  var LAB = '<b>Safe and free:</b> everything runs locally or in a throwaway GitHub repo. Vault runs in <b>dev mode</b> (<code>vault server -dev</code>: in memory, no TLS, auto-unsealed; <b>never in production</b>). Scanners are free open-source tools (gitleaks, trivy, semgrep, checkov, pip-audit / npm audit, GitHub CodeQL and Dependabot on public repos). AWS parts (CloudTrail, GuardDuty, Config, Security Hub, KMS) are optional and bill: a KMS key is about $1 per month plus per-request fees, GuardDuty has a 30-day trial then bills by data volume, Config bills per recorded item, Security Hub per check. Use a sandbox account with a budget alert and run the cleanup commands. <b>No real secrets anywhere:</b> tokens and keys in this module are placeholders such as <code>PASTE_...</code> or the AWS documentation example key.';
  var SKIP = { skip: 'security procedure, verified by reading' };
  var PYC = '<p>Pure computation, Python 3 standard library only. The model answer for the real task is the bash, YAML or JSON; this Python function is the part that is tested.</p>';
  // In this file "@{{" stands for the GitHub expression opener (dollar + two braces). A JS template literal would try to
  // interpolate the real thing, so fix() below turns "@{{" into the real text when the module is registered
  // (code fields get the dollar form, prose gets an HTML entity). Shell code here never uses dollar-brace.
  function Y(code, title) { var s = { lang: 'yaml', code: code }; if (title) s.title = title; return s; }     // parsed as YAML
  function SH(code, title) { var s = { lang: 'bash', code: code }; if (title) s.title = title; return s; }   // bash -n checked
  function JS(code, title) { var s = { lang: 'json', code: code }; if (title) s.title = title; return s; }   // parsed as JSON
  function PY(code, title) { return { lang: 'python', title: title || 'Python (tested)', code: code }; }
  // Vault HCL policies and Rego have no checker in tools/validate.js: lang 'text' with check: false.
  function TX(code, title) { return { lang: 'text', check: false, title: title || 'Policy (HCL)', code: code }; }
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
  // flow(): turn a list of steps [narr, hl, ehl, tags] into graph frames that share one set of nodes and edges.
  function flow(label, nodes, edges, steps, height) {
    return steps.map(function (s) {
      return { narr: s[0], parts: [{ type: 'graph', label: label, directed: true, height: height || 56, nodes: nodes, edges: edges, hl: s[1] || {}, ehl: s[2] || {}, tags: s[3] || {} }] };
    });
  }
  function pad4(f, tip) { while (f.length < 4) f.push({ narr: tip, parts: f[f.length - 1].parts }); return f; }

  // ───────────────────────── Topic 1: shift-left and pipeline gates ─────────────────────────
  topics.push({
    title: 'Shift-Left Security and Pipeline Gates: Secrets, SAST, SCA, IaC, Image and DAST',
    analogy: `<p>Think of airport security. The airline does <b>not</b> wait until the plane is in the air to find out someone carries a knife. It checks your ticket at home, scans your bag at the entrance, checks your passport at the gate, and only the last few checks happen at the aircraft door. Each check is cheap and fast, and each one catches a different kind of problem. <b>Shift-left</b> means moving security checks to the <em>left</em> of the timeline (toward the developer's laptop) so a mistake is found while it costs minutes, not after it is live and costs a breach.</p>`,
    explain: `<p>🟢 <b>The idea.</b> A bug found while typing costs a few seconds. The same bug found in production costs an incident, a customer notice and maybe a fine. So we put <b>gates</b> in the pipeline: automatic checks that must pass before the change moves on. A gate is only useful if it is <b>fast</b>, <b>accurate enough</b> that people trust it, and <b>enforced</b> (a red gate really stops the merge). The DevOps pipeline from the CI/CD module already has the road; DevSecOps adds the checkpoints.</p>
      ${H.table(['Gate', 'Where it runs', 'What it finds', 'Free tool', 'Real situation'], [
        ['<b>Secret scan</b>', 'pre-commit hook, then again in CI', 'keys, tokens, passwords in code and Git history', 'gitleaks, GitHub push protection', 'an AWS key pushed to a public repo'],
        ['<b>SAST</b> (static analysis)', 'pull request', 'insecure code patterns: SQL built from strings, weak crypto, path traversal', 'Semgrep, GitHub CodeQL', 'a string-concatenated SQL query'],
        ['<b>SCA</b> (software composition analysis)', 'pull request and nightly', 'known-vulnerable libraries (CVEs), including indirect ones', 'npm audit, pip-audit, OWASP dependency-check, Dependabot', 'a log4shell-style dependency scramble'],
        ['<b>IaC scan</b>', 'pull request', 'risky Terraform, CloudFormation, Kubernetes YAML before it is applied', 'checkov, tfsec (now part of trivy), trivy config', 'an S3 bucket made public by Terraform'],
        ['<b>Image scan</b>', 'after the image build', 'CVEs in OS packages and language packages inside the image', 'trivy image, grype', 'a critical CVE in the base image'],
        ['<b>DAST</b> (dynamic testing)', 'against a running staging copy', 'problems visible only when the app runs: missing headers, exposed admin pages, injection', 'OWASP ZAP baseline scan', 'a staging site that leaks stack traces']
      ])}
      <p>🟢 <b>Read the table left to right as time.</b> Secret scanning is the leftmost: it runs on the laptop before the commit exists. DAST is the rightmost: it needs a running app. Each tool has a blind spot, so you combine them. SAST reads your code but cannot see a vulnerable library; SCA sees the library but not your code; neither sees a misconfigured bucket.</p>
      <p>🔵 <b>Severity triage.</b> Scanners attach a severity to every finding. Most use the <b>CVSS</b> score (0.0 to 10.0): Low 0.1-3.9, Medium 4.0-6.9, High 7.0-8.9, Critical 9.0-10.0. CVSS measures how bad the flaw is in general, <b>not how risky it is for you</b>. To triage, ask five plain questions:</p>
      <ol><li><b>Is the vulnerable code reachable?</b> A flaw in a function you never call is lower risk.</li><li><b>Is it exposed?</b> Internet-facing beats internal-only.</li><li><b>Is it being exploited now?</b> Check the CISA <b>KEV</b> list (known exploited vulnerabilities) and the <b>EPSS</b> score (probability of exploitation in the next 30 days).</li><li><b>Is a fix available?</b> No fix means a mitigation, not a blocked pipeline forever.</li><li><b>How valuable is what it protects?</b> A payments service ranks above an internal wiki.</li></ol>
      <p>🔵 <b>The false-positive workflow.</b> Every scanner is wrong sometimes. If developers cannot silence a wrong finding they will disable the scanner, so build a path for it: (1) reproduce and understand the finding, (2) decide: real, accepted risk, or false positive, (3) suppress it <b>narrowly</b> (one rule, one file or one CVE, never a whole folder), (4) write a <b>reason, an owner and an expiry date</b> next to the suppression, (5) review suppressions on a schedule so they do not rot. Block the build only on <b>new</b> findings above your threshold, and keep a baseline for old ones so the team is not buried on day one.</p>
      <p>🔵 <b>Rollout that works.</b> Week 1-2: run every gate in <em>report-only</em> mode and fix the noise. Then enforce on <b>Critical and High, new findings only</b>. Keep PR gates under about ten minutes (run slow full scans nightly). Remember <code>git commit --no-verify</code> skips local hooks, so the CI copy of every local gate is the one that really counts.</p>`,
    clues: ['"how do we stop developers committing credentials?" → <b>pre-commit secret scan</b> (gitleaks) plus push protection and a CI backstop', '"a new CVE is announced, which services are affected?" → <b>SCA plus SBOMs</b>, not asking each team', '"what does shift-left mean?" → move checks earlier, where fixing is cheapest, and keep them fast and enforced', '"scanner says Critical but nobody can exploit it" → <b>triage</b> with reachability, exposure, KEV and EPSS; use a time-boxed waiver', '"the build fails on old findings we cannot fix today" → <b>baseline</b> plus gate on new findings only', '"scanner is noisy and developers ignore it" → false-positive workflow with narrow, owned, expiring suppressions'],
    code: [Y(`# .pre-commit-config.yaml - first gate, runs on the developer laptop before every commit.
# Install once per clone:  pip install pre-commit && pre-commit install
repos:
  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.21.2            # pin a release tag, never a moving branch
    hooks:
      - id: gitleaks        # scans the staged changes for keys, tokens and passwords
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.6.0
    hooks:
      - id: detect-private-key   # blocks "BEGIN RSA PRIVATE KEY" style blobs
      - id: check-added-large-files`, '.pre-commit-config.yaml: the leftmost gate'),
      Y(`# .github/workflows/security.yml - the same gates again on the server, where --no-verify cannot skip them.
name: security-gates
on:
  pull_request:
  push:
    branches: [main]
permissions:
  contents: read              # least privilege: gates only need to read the code
jobs:
  secrets:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0      # full history so old commits are scanned too
      - name: gitleaks (container, free)
        run: docker run --rm -v "$PWD:/repo" zricethezav/gitleaks:v8.21.2 detect --source /repo --redact --verbose
  sast:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: semgrep
        run: |
          pip install semgrep
          semgrep scan --config p/default --error --metrics=off .
  sca:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: pip-audit (Python) - fails on any known vulnerability
        run: |
          pip install pip-audit
          pip-audit -r requirements.txt
  iac:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: checkov on Terraform
        run: |
          pip install checkov
          checkov -d infra/ --quiet --compact
  image:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: docker build -t app:ci .
      - name: trivy image gate
        uses: aquasecurity/trivy-action@0.28.0
        with:
          image-ref: app:ci
          severity: CRITICAL,HIGH
          ignore-unfixed: true
          exit-code: '1'      # non-zero exit = red gate = merge blocked`, 'GitHub Actions: the gates as parallel jobs')],
    codeTitle: ['Pre-commit gate', 'Security workflow (GitHub Actions)'],
    viz: [{
      title: 'One pull request walking through the gates',
      input: 'iac',
      inputLabel: 'type the problem: clean, secret, sast, sca, iac, image or dast',
      gen: function (input) {
        var kind = String(input || '').trim().toLowerCase();
        var gates = [['secret', 'Pre-commit', 'gitleaks'], ['sast', 'PR: SAST', 'Semgrep / CodeQL'], ['sca', 'PR: SCA', 'pip-audit'], ['iac', 'PR: IaC', 'checkov'], ['image', 'Build: image', 'trivy image'], ['dast', 'Staging: DAST', 'ZAP baseline']];
        var why = {
          secret: 'Found a string shaped like an AWS access key in <code>config.py</code>. The commit is blocked on the laptop, so the key never reaches the server. Fix: delete it, load it from the environment or a secret manager, and if it was ever pushed, treat it as leaked and rotate it (topic 8).',
          sast: 'Found <code>cursor.execute("SELECT ... " + user_id)</code>: SQL built from a string. Fix: a parameterized query. The code is wrong even though it "works".',
          sca: 'Found <code>requests 2.19.0</code> with a known CVE and a fixed version. Fix: bump the dependency (Dependabot would have opened this PR); if no fix exists, document a time-boxed waiver.',
          iac: 'Found <code>acl = "public-read"</code> on an S3 bucket in Terraform (check CKV_AWS_20). Fix: private bucket plus Block Public Access. This is the gate that stops "the bucket the whole internet could read".',
          image: 'Found a Critical CVE in the base image\'s OpenSSL with a fixed package available. Fix: rebuild with a newer base tag (<code>--pull</code>), re-scan, redeploy.',
          dast: 'The running staging app returns a full stack trace on an error page and lacks security headers. Fix: turn off debug mode, add headers. Only a running app shows this.'
        };
        if (kind !== 'clean' && !why[kind]) throw new Error('Type one of: clean, secret, sast, sca, iac, image, dast');
        var rows = gates.map(function (g) { return [g[1], g[2], 'waiting']; });
        var frames = [];
        function snap(msg, hl) { frames.push({ narr: msg, parts: [{ type: 'table', label: 'gate results', columns: ['gate', 'tool', 'result'], rows: rows.map(function (r) { return r.slice(); }), hl: hl || {} }] }); }
        snap('A developer opens a pull request. It will pass through six gates, <b>left to right</b>. Each gate is a different tool because each has a different blind spot.', {});
        var stopped = false, i;
        for (i = 0; i < gates.length && !stopped; i++) {
          if (gates[i][0] === kind) {
            rows[i][2] = 'FAIL';
            var h = {}; h[i] = 'bad';
            snap('<b>' + gates[i][1] + ' (' + gates[i][2] + ') fails.</b> ' + why[kind], h);
            stopped = true;
          } else {
            rows[i][2] = 'pass';
            var h2 = {}; h2[i] = 'ok';
            snap(gates[i][1] + ' passes. ' + (i < 2 ? 'Cheap and fast, so it runs first.' : 'On to the next gate.'), h2);
          }
        }
        if (stopped) {
          for (; i < gates.length; i++) rows[i][2] = 'not run';
          snap('The pipeline stops here: later gates do not run, the merge button stays blocked, and the developer fixes <em>one</em> thing at a time. A suppression is allowed only with a reason, an owner and an expiry date.', {});
        } else {
          snap('All six gates are green. The change can merge. Remember: green does not mean "secure", it means "none of these six tools found a known problem". Review, threat modelling and monitoring still matter.', {});
        }
        return pad4(frames, 'Gates are cheap early checks, ordered fast to slow.');
      }
    }],
    examples: [
      { title: 'Situation: an AWS key pushed to a public repo and abused within minutes', html: `<p>A developer tests a script and commits <code>AKIAIOSFODNN7EXAMPLE</code> (AWS's own documentation example, standing in for a real key) with its secret. Bots watch GitHub's public event stream and try freshly pushed keys; security write-ups regularly report abuse starting within minutes, typically by launching GPU miners in many regions. Gate answers: (1) the <b>pre-commit hook</b> would have refused the commit, (2) <b>GitHub push protection</b> blocks known token formats at push time, (3) the <b>CI gitleaks job</b> catches what slipped through. Deleting the file in a later commit does <b>not</b> help: the key stays in Git history. Treat any pushed key as burned and rotate it (topic 8 has the full response).</p>` },
      { title: 'Situation: a log4shell-style dependency scramble', html: `<p>December 2021: <b>CVE-2021-44228</b> (CVSS 10.0) in the Java logging library log4j-core. Teams without inventory asked every squad "do you use log4j?" and waited days, because the library hides as an <em>indirect</em> dependency inside other libraries and fat JARs. Teams with <b>SCA in CI plus an SBOM per release</b> ran one query ("any component named log4j-core below 2.17.1?") and had the list in minutes. Lesson: the scan finds the flaw, the <b>inventory</b> tells you where to look, and the gate stops new vulnerable versions arriving. Topic 4 builds the SBOM side.</p>` },
      { title: 'Situation: the false-positive workflow in practice', html: `<p>Semgrep flags <code>subprocess.run(cmd, shell=True)</code> in a build helper. A developer investigates: <code>cmd</code> is a constant string in the same file, no user input reaches it. It is a false positive <em>today</em>. The wrong response is <code>--exclude tools/</code> (hides everything in the folder forever). The right response is an inline, one-rule suppression with a reason: <code># nosemgrep: python.lang.security.audit.subprocess-shell-true  -- constant command, owner: platform-team, review 2027-01</code>. Reviewers see it in the diff, the rule still protects the rest of the repo, and a quarterly job lists suppressions older than their review date.</p>` },
      { title: 'Situation: a critical CVE in the base image', html: `<p>Monday: <code>trivy image</code> reports a Critical CVE in <code>libssl3</code> inside <code>python:3.12-slim</code>. Decision tree: is a fixed package available (<code>--ignore-unfixed</code> hides ones with no fix)? If yes, rebuild with <code>docker build --pull</code> and redeploy every service built on that base; if no fix, assess whether the library is even loaded by your app, add a waiver <b>with an expiry date</b>, and watch for the fix. A weekly scheduled rebuild keeps base images fresh without waiting for a scare.</p>` }
    ],
    deepDive: `<p>🟣 <b>Signal over volume.</b> A gate lives or dies on false-positive rate. Tune like an engineer: start with a small high-confidence rule set (Semgrep <code>p/default</code> or <code>p/ci</code>, CodeQL's default suite), measure how many findings per scan are real, and only then widen. Diff-aware scanning (report only findings in changed lines or new CVEs not in the baseline) keeps PR feedback relevant. Upload results as <b>SARIF</b> to GitHub code scanning so findings appear as annotations in the PR and as a dashboard with history.</p>
      <p>🟣 <b>Tool limits to know.</b> SAST is pattern and data-flow based: CodeQL builds a database of your code and runs queries with taint tracking (deeper, slower); Semgrep matches patterns with light data-flow (faster, easy custom rules). Both miss logic flaws like broken authorization (the IDOR from the backend security module). SCA reports a CVE if the <em>package version</em> is in the affected range, whether or not you call the vulnerable function, so expect noise; <b>reachability analysis</b> (offered by some commercial and newer open tools) reduces it. DAST sees only what it crawls; it needs authenticated scans and a safe, disposable target. <code>npm audit</code> and <code>pip-audit</code> use the GitHub/OSV advisory databases; OWASP dependency-check uses NVD data via CPE matching, which is broader but has more false positives.</p>
      <p>🟣 <b>The pipeline is a target too.</b> Scanner tools run with access to your code and often your tokens. Pin tool versions (and actions by commit SHA), give jobs only <code>contents: read</code>, never expose production secrets to pull-request jobs, and treat a failing or missing scan as a failure, not a skip. If <code>continue-on-error: true</code> sneaks onto a gate, the gate is decoration. Branch protection must list the gates as <b>required status checks</b>, otherwise "red" is only advice.</p>
      <p>🟣 <b>Economics.</b> The gate that finds a hard-coded key before commit costs seconds; the same key found by an attacker costs rotation, an audit, perhaps customer notification. Mean time to remediate by severity (for example Critical 7 days, High 30, Medium 90) is the number auditors and boards ask for; the pipeline is how you measure it.</p>`,
    aiEra: `<p>🤖 <b>AI writes code faster than people review it, so gates matter more.</b> Assistants regularly produce string-built SQL, <code>verify=False</code> on TLS calls, hard-coded example keys that look real, and dependencies that do not exist (a <b>hallucinated package name</b> is a gift to attackers who register that name; SCA with an allow-list of registries and lockfiles with hashes helps). Treat AI output like code from a fast, confident junior: it goes through the same gates, no exceptions.</p>
      <p>🤖 <b>AI for triage, carefully.</b> Assistants are good at explaining a finding, proposing a fix and drafting a suppression comment. They are bad at knowing your reachability and exposure, and they will happily suggest <code>nosemgrep</code> to make the red go away. Never paste real secrets or customer data into a prompt; a gitleaks finding shown to an assistant should be the redacted form. Human rule: a suppression needs a human owner, a reason and an expiry, whoever wrote it.</p>`,
    problems: [P({
      t: 'Write the pull-request security workflow with gates and least privilege',
      l: 'Medium', tags: ['GitHub Actions', 'SAST', 'SCA', 'secrets'], co: ['GitHub', 'Datadog'],
      s: `<p>A Python service lives in a GitHub repo with <code>requirements.txt</code>, a <code>Dockerfile</code> and Terraform in <code>infra/</code>. Write <code>.github/workflows/security.yml</code> that runs on every pull request and on pushes to <code>main</code>, with these gates as separate jobs: secret scan (full history), Semgrep, <code>pip-audit</code>, checkov on <code>infra/</code>, and a trivy image scan that fails on fixed Critical and High vulnerabilities. Use least-privilege token permissions and make sure a failed gate really blocks the merge.</p>`,
      ex: `<p>Result in the PR checks list: <span class="c-g">secrets, sast, sca, iac, image</span> all green. A PR that adds a key: <span class="c-r">secrets fails</span>, the others still run, and because the five jobs are <b>required status checks</b> in branch protection, the Merge button is disabled. The workflow token is <code>contents: read</code> only, so even a compromised scanner step cannot push code.</p>`,
      bw: `<p>One giant job that runs all tools in sequence with <code>continue-on-error: true</code> "so it never blocks anyone", default write-all permissions, no required checks. It is slow (sequential), it can never fail (so nothing is gated), and a compromised step has a token that can modify the repository.</p>`,
      q: ['A scan job exits non-zero but the PR can still be merged. What is the most likely missing piece?', ['The job is not listed as a required status check in branch protection', 'The scanner version is too old', 'The workflow lacks a cache', 'The repository is private'], 0, 'A red job only blocks merging when branch protection (or a ruleset) requires that check. Otherwise it is advice. Also check for continue-on-error.'],
      h: ['Hint 1: one job per gate so they run in parallel and each shows its own red or green mark.', 'Hint 2: <code>permissions: contents: read</code> at the top; add <code>fetch-depth: 0</code> so the secret scan sees history.', 'Hint 3: every tool must exit non-zero on failure (<code>--error</code>, <code>--exit-code 1</code>), and the checks must be marked required in branch protection (a repo setting, not YAML).'],
      a: `<p>Five parallel jobs, each one tool, token limited to read access. The secret job checks out the full history. Semgrep uses <code>--error</code> so findings fail the job; pip-audit and checkov fail by default; trivy uses <code>exit-code: '1'</code> with <code>ignore-unfixed</code> so that only actionable Critical and High findings block. Finish by marking the five job names as required status checks (Settings, Branches or Rulesets), because YAML alone cannot enforce a merge block.</p>`,
      code: Y(`name: security-gates
on:
  pull_request:
  push:
    branches: [main]
permissions:
  contents: read               # the token can read code and nothing else
concurrency:
  group: security-@{{ github.ref }}
  cancel-in-progress: true     # a newer push replaces the older run
jobs:
  secrets:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0       # scan the whole history, not only the last commit
      - run: docker run --rm -v "$PWD:/repo" zricethezav/gitleaks:v8.21.2 detect --source /repo --redact
  sast:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
      - run: |
          pip install semgrep
          semgrep scan --config p/default --error --metrics=off .
  sca:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - run: |
          pip install pip-audit
          pip-audit -r requirements.txt
  iac:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - run: |
          pip install checkov
          checkov -d infra/ --quiet --compact
  image:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
      - run: docker build --pull -t app:ci .
      - uses: aquasecurity/trivy-action@0.28.0
        with:
          image-ref: app:ci
          severity: CRITICAL,HIGH
          ignore-unfixed: true
          exit-code: '1'`, 'security.yml'),
      cx: `<p>Wall-clock time is the slowest job (about 5-10 minutes), not the sum, because the jobs run in parallel.</p>`,
      f: ['How would you upload Semgrep and Trivy results as SARIF so they show as PR annotations? (Needs <code>security-events: write</code> on that one job only.)', 'How do you stop the secret job running on forks without exposing secrets? (It needs none: gitleaks needs no token.)']
    }), P({
      t: 'Severity gate with an allowlist and expiry dates',
      l: 'Medium', tags: ['CVSS', 'triage', 'waivers', 'python'], co: ['Snyk', 'Google'],
      s: PYC + `<p>Write <code>gate(findings, allow, today, threshold)</code>. <code>findings</code> are strings <code>"CVE-ID:score:package"</code>. <code>allow</code> are waivers <code>"CVE-ID:YYYY-MM-DD"</code> that are valid <b>through</b> that date (inclusive). <code>today</code> is an ISO date. A finding blocks when its score is <b>≥ threshold</b> and it has no valid waiver. Return <code>"PASS"</code> or <code>"FAIL:"</code> followed by the blocking CVE ids, de-duplicated, sorted and comma-joined.</p>`,
      ex: `<p><code>gate(["CVE-2021-44228:10.0:log4j-core","CVE-2023-0001:5.5:zlib"], [], "2026-10-19", 7.0)</code> &rarr; <span class="c-r">FAIL:CVE-2021-44228</span> (the 5.5 is below the threshold).<br>The same call with the waiver <code>"CVE-2021-44228:2026-12-31"</code> &rarr; <span class="c-g">PASS</span>. With the waiver dated <code>2026-10-18</code> the waiver expired yesterday &rarr; <span class="c-r">FAIL</span> again.</p>`,
      bw: `<p>Permanent ignore files with no dates: a finding silenced "temporarily" in 2023 is still silenced in 2026, long after the package was fixed or the system changed. Without an expiry the allowlist becomes a graveyard of accepted risk nobody owns.</p>`,
      q: ['A waiver is dated 2026-10-19 and today is 2026-10-19. With an inclusive rule, is the finding blocked?', ['No, the waiver is valid through that date', 'Yes, waivers expire at midnight before', 'Only if the score is 10.0', 'It depends on the scanner'], 0, 'Inclusive means valid through that date, so today is the last good day. Tomorrow the same finding blocks again unless someone renews it with a new reason.'],
      h: ['Hint 1: first turn the allowlist into a dictionary id &rarr; date.', 'Hint 2: ISO dates (YYYY-MM-DD) compare correctly as plain strings, no parsing needed.', 'Hint 3: use a set for the blocking ids so a CVE found in two packages is listed once, then sort.'],
      a: `<p>Build a map of waivers, walk the findings, skip those under the threshold, skip those with a waiver whose date is not before today, collect the rest in a set. Sorted output makes the result deterministic. In a real pipeline you would print the expired waivers too, because "your exception ended yesterday" is the most useful message a developer can get.</p>`,
      code: PY(`def gate(findings, allow, today, threshold):
    """Return 'PASS' or 'FAIL:<ids>' - blocking CVE ids, de-duplicated and sorted."""
    waivers = {}
    for item in allow:
        cve, until = item.split(":", 1)
        waivers[cve] = until                      # 'YYYY-MM-DD'
    blocked = set()
    for f in findings:
        cve, score, _package = f.split(":", 2)
        if float(score) < threshold:
            continue                              # below the bar: report only
        until = waivers.get(cve)
        if until is not None and until >= today:  # ISO dates compare as text; inclusive
            continue                              # a valid waiver
        blocked.add(cve)
    if not blocked:
        return "PASS"
    return "FAIL:" + ",".join(sorted(blocked))`, 'Python (tested)'),
      cx: `<p>O(F + A) time and space for F findings and A waivers (plus O(B log B) to sort the B blocking ids).</p>`,
      f: ['How would you also report waivers that expire within 14 days? (Compare dates with datetime and warn.)', 'Why is the waiver keyed by CVE id and not by package? (Keep it narrow, and re-review if the same CVE appears in a new package.)'],
      tests: { sig: 'string[] string[] string double -> string', fn: 'gate', cases: [
        [[['CVE-2021-44228:10.0:log4j-core', 'CVE-2023-0001:5.5:zlib'], [], '2026-10-19', 7.0], 'FAIL:CVE-2021-44228'],
        [[['CVE-2021-44228:10.0:log4j-core', 'CVE-2023-0001:5.5:zlib'], ['CVE-2021-44228:2026-12-31'], '2026-10-19', 7.0], 'PASS'],
        [[['CVE-2021-44228:10.0:log4j-core'], ['CVE-2021-44228:2026-10-18'], '2026-10-19', 7.0], 'FAIL:CVE-2021-44228'],
        [[['CVE-2021-44228:10.0:log4j-core'], ['CVE-2021-44228:2026-10-19'], '2026-10-19', 7.0], 'PASS'],
        [[[], [], '2026-10-19', 7.0], 'PASS'],
        [[['CVE-2024-1111:7.0:curl'], [], '2026-10-19', 7.0], 'FAIL:CVE-2024-1111'],
        [[['CVE-2024-1111:6.9:curl'], [], '2026-10-19', 7.0], 'PASS'],
        [[['CVE-2024-9:9.8:a', 'CVE-2022-1:8.1:b', 'CVE-2023-5:3.0:c'], ['CVE-2023-5:2020-01-01'], '2026-10-19', 7.0], 'FAIL:CVE-2022-1,CVE-2024-9'],
        [[['CVE-2024-9:9.8:a', 'CVE-2024-9:9.8:b'], [], '2026-10-19', 9.0], 'FAIL:CVE-2024-9'],
        [[['CVE-2024-9:9.8:a', 'CVE-2024-7:8.9:b'], [], '2026-10-19', 9.0], 'FAIL:CVE-2024-9']
      ] }
    })]
  });

  // ───────────────────────── Topic 2: Vault, KV v2, policies, AppRole, Kubernetes auth, secret zero ─────────────────────────
  topics.push({
    title: 'Secrets Management with Vault: KV v2, Policies, AppRole, Kubernetes Auth and Secret Zero',
    analogy: `<p>Think of a bank's safe-deposit room. You do not carry the valuables around, and you do not get a copy of the master key. A <b>teller</b> checks who you are (<b>authentication</b>), looks up what that person may open (<b>policy</b>), brings only that box (<b>secret engine</b>), and writes every visit in a ledger (<b>audit log</b>). Vault is the teller. The hard part is the very first visit: how do you prove who you are before anyone has given you a card? That is the <b>secret-zero problem</b>.</p>`,
    explain: `<p>🟢 <b>The problem.</b> Passwords, API keys and certificates end up in Git, in <code>.env</code> files, in container images and in CI variables. Anyone who can read any of those places can use the secret, nobody knows who read it, and changing it means redeploying everything. A <b>secrets manager</b> keeps secrets in one encrypted place, hands them out only to identities that are allowed, logs every read, and makes rotation a routine job. <b>HashiCorp Vault</b> (and the open-source fork OpenBao) is the most common self-hosted one; AWS Secrets Manager and Parameter Store, GCP Secret Manager and Azure Key Vault are the managed cousins.</p>
      <p>🟢 <b>Four words to know.</b> <b>Secret engine</b>: a plug-in that stores or creates secrets (KV for static values, database for dynamic credentials, PKI for certificates). <b>Auth method</b>: how a client proves identity (token, AppRole, Kubernetes, AWS IAM, OIDC). <b>Policy</b>: a small text file saying which paths an identity can read, write or list. <b>Token</b>: the short-lived pass Vault gives back after a successful login; every request carries one.</p>
      ${H.table(['Piece', 'Plain meaning', 'Local lab command'], [
        ['Dev server', 'in-memory Vault, no TLS, auto-unsealed. <b>Never in production.</b>', '<code>vault server -dev -dev-root-token-id=dev-only-token</code>'],
        ['KV v2 engine', 'versioned key/value store, mounted at <code>secret/</code> in dev mode', '<code>vault kv put secret/payments/db user=app pass=PASTE_FAKE</code>'],
        ['Policy', 'allow-list of paths and capabilities (<code>read</code>, <code>list</code>, <code>create</code>, <code>update</code>, <code>delete</code>)', '<code>vault policy write payments-read payments.hcl</code>'],
        ['AppRole', 'machine login: a <code>role_id</code> (like a username) plus a short-lived, usually single-use <code>secret_id</code>', '<code>vault write auth/approle/role/payments ...</code>'],
        ['Kubernetes auth', 'a pod logs in with its service-account JWT; Vault asks the cluster "is this token real?"', '<code>vault write auth/kubernetes/role/payments ...</code>']
      ])}
      <p>🔵 <b>KV v2 and the path trap.</b> KV version 2 keeps old versions (<code>vault kv get -version=2</code>, <code>vault kv rollback</code>) and soft-deletes. The CLI hides the real API path: <code>vault kv get secret/payments/db</code> actually reads <code>secret/<b>data</b>/payments/db</code>, and listing uses <code>secret/<b>metadata</b>/payments</code>. <b>Policies are written against the real path</b>, so a policy on <code>secret/payments/*</code> grants nothing and the app gets <code>403 permission denied</code>. This is the most common Vault beginner bug.</p>
      <p>🔵 <b>Policies are deny-by-default and additive.</b> No rule means no access. Write one policy per application, name the exact path, give <code>read</code> only (not <code>update</code>) to consumers, and avoid <code>*</code> on the whole mount. The <code>deny</code> capability always wins and is useful for carving out an exception.</p>
      <p>🔵 <b>Machine login, two ways.</b> <b>AppRole</b> suits VMs and pipelines: the role has TTL and policy settings, <code>role_id</code> is baked into config (not very secret), and the <code>secret_id</code> is created at deploy time by a trusted orchestrator, ideally <b>response-wrapped</b> (delivered in a one-use, short-lived envelope) and used once. <b>Kubernetes auth</b> suits pods: Vault is configured with the cluster's API address, and a role binds a service account name plus namespace to policies. The pod reads its own JWT from <code>/var/run/secrets/kubernetes.io/serviceaccount/token</code> and trades it for a Vault token. No secret was ever distributed: the platform's identity is the credential.</p>
      <p>🔵 <b>Secret zero.</b> Every scheme needs a first credential to get the rest. If you put the Vault token in an env var of the image, you only moved the problem. The honest answers all use an identity the <i>platform</i> already vouches for: a Kubernetes service-account token, an AWS instance or IAM role identity, a GitHub Actions OIDC token, or a wrapped single-use secret_id from a trusted pipeline. Then the first credential is short-lived, bound to one workload, and unusable if stolen later.</p>`,
    clues: ['"where do we keep database passwords?" → a <b>secrets manager</b> with per-app policies and audit, not Git, images or plain CI variables', '"app gets 403 on a KV v2 secret but the policy looks right" → policy path needs <b>data/</b> (and metadata/ for list)', '"how does a pod get its first credential?" → <b>Kubernetes auth</b> with the service-account JWT (platform identity) to solve secret zero', '"how do VMs or pipelines log in?" → <b>AppRole</b> with a short-lived, response-wrapped, single-use secret_id', '"who read the production password last week?" → Vault <b>audit device</b> logs every request with the identity']
    ,
    code: [
      SH(R`# Lab: Vault in DEV MODE. In-memory, no TLS, auto-unsealed, data vanishes on exit. NEVER use dev mode in production.
# Terminal 1: start the server (needs the free vault binary, or the OpenBao "bao" binary with the same commands).
vault server -dev -dev-root-token-id=dev-only-token

# Terminal 2: point the CLI at it. dev-only-token is a placeholder for this throwaway server, not a real secret.
export VAULT_ADDR=http://127.0.0.1:8200
export VAULT_TOKEN=dev-only-token
vault status

# KV v2 is already mounted at secret/ in dev mode. Values below are fake.
vault kv put secret/payments/db username=app password=PASTE_FAKE_PASSWORD
vault kv get secret/payments/db                       # shows version 1
vault kv put secret/payments/db username=app password=PASTE_FAKE_PASSWORD_2
vault kv get -version=1 secret/payments/db            # old version is still readable
vault kv rollback -version=1 secret/payments/db       # make version 1 current again (creates version 3)
vault kv metadata get secret/payments/db              # versions, who and when

# See the real API path behind the CLI shortcut (the "data/" segment is what policies must name):
vault read -format=json secret/data/payments/db | head -n 5`, 'Vault dev-mode lab: KV v2 and versions'),
      TX(R`# payments-read.hcl - least-privilege policy for ONE application (HCL).
# KV v2: the policy path includes "data/" (values) and "metadata/" (listing and versions).
path "secret/data/payments/*" {
  capabilities = ["read"]            # consumers read only; no create, update or delete
}
path "secret/metadata/payments/*" {
  capabilities = ["list", "read"]    # may list names and see version info, not values
}
# An explicit deny always wins over any allow in any policy attached to the same token.
path "secret/data/payments/admin-only" {
  capabilities = ["deny"]
}
# Everything not listed here is already denied (Vault is deny by default).`, 'payments-read.hcl (HCL policy)'),
      SH(R`# AppRole: machine login for VMs and pipelines (dev-mode lab, placeholders only).
vault policy write payments-read payments-read.hcl
vault auth enable approle
vault write auth/approle/role/payments \
    token_policies="payments-read" \
    token_ttl=15m token_max_ttl=1h \
    secret_id_ttl=10m secret_id_num_uses=1     # secret_id expires in 10 minutes and works once

# role_id is like a username: fine to put in deploy config.
ROLE_ID=$(vault read -field=role_id auth/approle/role/payments/role-id)

# secret_id is the sensitive half. Wrap it: Vault returns a single-use wrapping token instead of the value.
WRAP=$(vault write -wrap-ttl=60s -f -field=wrapping_token auth/approle/role/payments/secret-id)

# On the app side (a different shell): unwrap once, then log in. A second unwrap fails, which also reveals interception.
SECRET_ID=$(VAULT_TOKEN="$WRAP" vault unwrap -field=secret_id)
vault write auth/approle/login role_id="$ROLE_ID" secret_id="$SECRET_ID"   # returns a short-lived client token`, 'AppRole with a wrapped, single-use secret_id'),
      SH(R`# Kubernetes auth (runs against a real cluster, e.g. a local kind cluster; values are placeholders).
vault auth enable kubernetes
vault write auth/kubernetes/config kubernetes_host="https://kubernetes.default.svc"

# Bind ONE service account in ONE namespace to the policy. No secret is distributed to the pod.
vault write auth/kubernetes/role/payments \
    bound_service_account_names=payments-sa \
    bound_service_account_namespaces=prod \
    token_policies=payments-read token_ttl=15m

# Inside the pod, the app (or a Vault Agent sidecar) trades its own JWT for a Vault token:
JWT=$(cat /var/run/secrets/kubernetes.io/serviceaccount/token)
vault write auth/kubernetes/login role=payments jwt="$JWT"`, 'Kubernetes auth: the platform identity is the credential')
    ],
    codeTitle: ['Dev server and KV v2', 'Vault policy', 'AppRole', 'Kubernetes auth'],
    viz: [{
      title: 'How a workload gets its first secret (secret zero)',
      input: 'kubernetes',
      inputLabel: 'type the method: kubernetes, approle or baked (the anti-pattern)',
      gen: function (input) {
        var m = String(input || '').trim().toLowerCase();
        if (['kubernetes', 'approle', 'baked'].indexOf(m) < 0) throw new Error('Type one of: kubernetes, approle, baked');
        var nodes = [box('app', 'Workload', 8, 24), box('plat', m === 'approle' ? 'Trusted pipeline' : 'Platform / cluster', 40, 4), box('vault', 'Vault', 74, 24), box('db', 'Secret: DB password', 74, 46, 24)];
        var edges = [['plat', 'app', m === 'approle' ? 'wrapped secret_id' : 'identity JWT'], ['app', 'vault', 'login'], ['vault', 'app', 'token + secret']];
        var steps;
        if (m === 'kubernetes') steps = [
          ['The pod starts under the service account <code>payments-sa</code> in namespace <code>prod</code>. Kubernetes mounts a signed JWT into the pod. Nobody typed or stored a password.', { app: 'cur' }, {}, {}],
          ['The workload sends that JWT and its role name to Vault.', { app: 'cur', vault: 'win' }, { 'app-vault': 'ok' }, { vault: 'login' }],
          ['Vault asks the cluster API to validate the JWT (TokenReview). The cluster confirms: valid, service account payments-sa, namespace prod. Vault checks these match the role bindings.', { plat: 'ok', vault: 'win' }, { 'plat-app': 'ok' }, {}],
          ['Vault returns a short-lived token carrying only the <code>payments-read</code> policy. Then the app reads <code>secret/data/payments/db</code>. Secret zero was the platform identity: scoped, short-lived and not copyable to another namespace.', { vault: 'ok', db: 'sel', app: 'ok' }, { 'vault-app': 'ok' }, { db: 'read' }]
        ];
        else if (m === 'approle') steps = [
          ['A trusted pipeline (CI job or orchestrator) holds permission to create secret_ids for ONE role. The workload only has the non-secret <code>role_id</code> in its config.', { plat: 'cur' }, {}, {}],
          ['At deploy time the pipeline asks Vault for a secret_id with <code>-wrap-ttl=60s</code>. Vault returns a one-use wrapping token, not the value.', { plat: 'cur', vault: 'win' }, {}, { vault: 'wrap' }],
          ['The wrapping token is handed to the workload. It unwraps once (a second unwrap would fail, which tells you someone intercepted it) and gets the secret_id.', { app: 'cur' }, { 'plat-app': 'ok' }, {}],
          ['Login: role_id plus secret_id. Vault checks the secret_id is unexpired and unused, then issues a 15 minute token with <code>payments-read</code>. The secret_id is now spent: a copy found later is useless.', { vault: 'ok', app: 'ok', db: 'sel' }, { 'app-vault': 'ok', 'vault-app': 'ok' }, { db: 'read' }]
        ];
        else steps = [
          ['Anti-pattern: the Vault token is baked into the container image or an env var "so the app can start".', { app: 'bad' }, {}, { app: 'token inside' }],
          ['Anyone who can pull the image, read the pod spec, or open a crash dump now owns the token. It never expires, so a leak in 2024 still works in 2026.', { app: 'bad', vault: 'win' }, { 'app-vault': 'bad' }, {}],
          ['The token is shared by every replica and environment, so Vault logs cannot say <i>which</i> workload read the secret, and revoking it breaks all of them at once.', { vault: 'bad', db: 'bad' }, {}, { db: 'exposed' }],
          ['Fix: replace the baked token with a platform identity (Kubernetes auth) or a wrapped single-use secret_id. You have not removed trust, you have moved it to something short-lived and scoped.', { plat: 'ok', app: 'ok' }, { 'plat-app': 'ok' }, {}]
        ];
        return pad4(flow('secret zero: ' + m, nodes, edges, steps, 58), 'The first credential must come from the platform, not from a file.');
      }
    }],
    examples: [
      { title: 'Situation: secrets in environment variables showing up in crash dumps', html: `<p>A service gets <code>DB_PASSWORD</code> from an env var. It crashes, the platform saves a core dump and the error tracker uploads the full process environment, so the password now sits in a ticket, a log search index and a vendor's cloud. <code>docker inspect</code> and <code>/proc/&lt;pid&gt;/environ</code> expose it to anyone on the host too. Safer pattern: the app fetches the secret from Vault (or a mounted file with tight permissions) at start, holds it in memory only as long as needed, and the logger and crash reporter <b>scrub</b> known secret fields. Better still, use a <b>dynamic</b> credential (topic 3) that expires in an hour, so a leaked dump is already dead.</p>` },
      { title: 'Situation: "permission denied" on a KV v2 secret', html: `<p>The policy says <code>path "secret/payments/*" { capabilities = ["read"] }</code>, the app logs in fine, but <code>vault kv get secret/payments/db</code> returns 403. Debug with <code>vault token capabilities secret/data/payments/db</code> (should list <code>read</code>) and <code>vault policy read payments-read</code>. The fix is changing the policy path to <code>secret/data/payments/*</code>. The CLI shows <code>secret/payments/db</code> to be friendly, but the API, and therefore the policy, uses <code>data/</code>.</p>` },
      { title: 'Situation: rolling back a bad secret change', html: `<p>Someone updates <code>secret/payments/db</code> with a typo and logins start failing. KV v2 keeps versions: <code>vault kv metadata get</code> shows version 2 was written by the wrong person at 14:02, and <code>vault kv rollback -version=1 secret/payments/db</code> restores the last good value in seconds. Use <code>vault kv delete</code> (soft delete, can be undeleted) for mistakes and <code>vault kv destroy</code> only on purpose. Set <code>max_versions</code> so history does not grow without limit.</p>` }
    ],
    deepDive: `<p>🟣 <b>Seal and unseal.</b> Vault encrypts everything with a data key, protected by a root key that is split with Shamir's secret sharing (for example 5 key shares, any 3 reconstruct it) or automatically unsealed by a cloud KMS (<b>auto-unseal</b>). A sealed Vault can do nothing, which is the safe state after a restart. Dev mode skips all of this, which is exactly why it must never face a network. In production use integrated Raft storage with 3 or 5 nodes, TLS everywhere, auto-unseal, and revoke the initial root token after setup.</p>
      <p>🟣 <b>Tokens, TTLs and renewal.</b> Every token has a TTL, a max TTL, and a policy list; child tokens are revoked when the parent is. Short TTL plus renewal means a stolen token dies by itself. Use <b>batch tokens</b> or Vault Agent caching for high-volume workloads. <b>Vault Agent</b> (or the Vault Secrets Operator and CSI provider on Kubernetes) handles login, renewal and writes secrets to a file or env so the application code never touches the Vault API.</p>
      <p>🟣 <b>Audit and blast radius.</b> Enable at least one <b>audit device</b> (<code>vault audit enable file file_path=/var/log/vault_audit.log</code>). Vault refuses to serve requests if all audit devices fail, because an unlogged read is worse than downtime. Values in the audit log are HMAC-hashed, so logs prove access without leaking secrets. Design namespaces or mounts per team so one mistaken policy cannot reach everything.</p>
      <p>🟣 <b>Alternatives and honesty.</b> Managed secret stores (AWS Secrets Manager, GCP Secret Manager, Azure Key Vault) cost money per secret and call but remove operating Vault; Kubernetes <code>Secret</code> objects are only base64 unless you enable encryption at rest and tight RBAC; SOPS or sealed-secrets keep encrypted secrets in Git. Pick by who runs it, what rotation you need, and how many clouds you span. None of them removes the need for the secret-zero answer.</p>`,
    aiEra: `<p>🤖 <b>Assistants generate Vault policies fast, and wrongly in two classic ways</b>: they forget the KV v2 <code>data/</code> segment, and they reach for <code>path "secret/*" { capabilities = ["read","list","create","update","delete"] }</code> "to make it work". Review every generated policy against the real path and the smallest set of capabilities, and test with <code>vault token capabilities</code> using a token created from that policy.</p>
      <p>🤖 <b>Never paste real secrets, tokens or Vault output into a chat or prompt</b>: the prompt is stored, logged and possibly used for support. Paste the policy and the error with values replaced by placeholders. Also be wary of an AI agent that has a Vault token: give it its own role with read-only access to one path and a 15 minute TTL, so an injected instruction cannot read the world.</p>`,
    problems: [P({
      t: 'Design the Vault policy and Kubernetes role for the payments service',
      l: 'Medium', tags: ['Vault', 'policy', 'Kubernetes auth', 'least privilege'], co: ['HashiCorp', 'Stripe'],
      s: `<p>The <code>payments</code> service runs in namespace <code>prod</code> under service account <code>payments-sa</code>. It must read its database credentials at <code>secret/payments/db</code> and list the names under <code>secret/payments/</code>. It must <b>never</b> read <code>secret/payments/admin-only</code> or write anything. Write (1) the Vault policy in HCL, KV v2 aware, and (2) the commands that create a Kubernetes auth role limiting login to that service account and namespace, with a 15 minute token.</p>`,
      ex: `<p>Expected checks: <code>vault token capabilities secret/data/payments/db</code> prints <span class="c-g">read</span>; for <code>secret/data/payments/admin-only</code> it prints <span class="c-r">deny</span>; for <code>secret/data/other/app</code> it prints <span class="c-r">deny</span> (default). A pod in namespace <code>dev</code> with the same service account name is <span class="c-r">refused at login</span> because the namespace binding does not match.</p>`,
      bw: `<p>One policy <code>path "secret/*" { capabilities = ["read","list","update","create","delete"] }</code> attached to a role bound to <code>bound_service_account_names=*</code> and <code>bound_service_account_namespaces=*</code>. It works on day one, and then every pod in the cluster can read and overwrite every secret. One compromised pod means a full secrets breach.</p>`,
      q: ['A KV v2 policy says path "secret/payments/*" read, but reads fail with 403. What is the fix?', ['Change the path to secret/data/payments/*', 'Add the update capability', 'Move the secret to KV v1 only', 'Increase the token TTL'], 0, 'KV v2 stores values under the data/ segment and metadata under metadata/. Policies match the real API path, so without data/ the rule never applies and the default deny wins.'],
      h: ['Hint 1: KV v2 policy paths include <code>data/</code> for values and <code>metadata/</code> for listing.', 'Hint 2: give <code>read</code> on the value path, <code>list</code> on the metadata path, and an explicit <code>deny</code> for the admin-only secret.', 'Hint 3: the Kubernetes role binds both a service account name and a namespace; set <code>token_ttl=15m</code> and attach only this one policy.'],
      a: `<p>The policy grants <code>read</code> on <code>secret/data/payments/*</code>, <code>list</code> on <code>secret/metadata/payments/*</code>, and an explicit <code>deny</code> on the admin-only path, so an accidental later broad grant cannot expose it. The role names one service account and one namespace, so the same account name in <code>dev</code> cannot log in, and the 15 minute TTL limits how long a stolen token is useful. No secret was distributed: the pod authenticates with its own JWT.</p>`,
      code: TX(R`# payments-read.hcl
path "secret/data/payments/*" {
  capabilities = ["read"]
}
path "secret/metadata/payments/*" {
  capabilities = ["list"]
}
path "secret/data/payments/admin-only" {
  capabilities = ["deny"]
}

# Then, in bash (placeholders, run against a real or kind cluster):
#   vault policy write payments-read payments-read.hcl
#   vault write auth/kubernetes/role/payments \
#       bound_service_account_names=payments-sa \
#       bound_service_account_namespaces=prod \
#       token_policies=payments-read token_ttl=15m`, 'Policy and role (HCL plus commands)'),
      cx: `<p>Policy evaluation is a path match per request: effectively constant time for the caller. The effort is in reviewing the policy, not running it.</p>`,
      f: ['How would you give the same app a second path for a feature flag secret without widening to <code>secret/*</code>? (Add one more narrow <code>path</code> block, or a second policy attached to the same role.)', 'How do you prove the policy works? (Create a token with only that policy and run <code>vault token capabilities</code> on allowed, denied and unrelated paths.)']
    })]
  });

  // ───────────────────────── Topic 3: dynamic secrets, leases, rotation, envelope encryption ─────────────────────────
  topics.push({
    title: 'Dynamic Secrets, Leases and TTLs, Rotation, and Envelope Encryption with KMS',
    analogy: `<p>A static password is a <b>house key</b> you copy for the plumber and never get back. A dynamic secret is a <b>hotel key card</b>: the front desk makes a fresh card for this guest, it opens one room, it stops working at checkout time on its own, and if the guest loses it you cancel just that card. Envelope encryption is the hotel's safe with a safe inside: the big safe (KMS key) never leaves the vault room; you only ask it to lock and unlock a small box holding the key to your luggage.</p>`,
    explain: `<p>🟢 <b>Static vs dynamic.</b> A <b>static</b> secret is created once and shared (a database password everyone uses for three years). A <b>dynamic</b> secret is created <i>on demand</i> for one client with a deadline. With Vault's <b>database engine</b>, an app asks <code>database/creds/app</code>; Vault runs <code>CREATE ROLE ...</code> in the database and returns a brand-new username and password valid for, say, one hour. When the time is up (or you revoke it), Vault runs <code>DROP ROLE</code>. A stolen credential is worth minutes, the audit log says which workload held which user, and "rotate the password" stops being a scary all-hands event.</p>
      <p>🟢 <b>Lease, TTL, max TTL.</b> Every dynamic secret comes with a <b>lease</b> (a receipt with an id). <b>TTL</b> is how long it lives from now. The client may <b>renew</b> the lease to push the expiry out, but never past <b>max TTL</b> counted from creation. After max TTL the client must ask for new credentials. Example: TTL 1h, max TTL 24h: a long-running app renews every ~30 minutes for a day, then fetches a fresh user. You can revoke one lease, or every lease under a prefix (<code>vault lease revoke -prefix database/creds/app</code>) during an incident.</p>
      ${H.table(['Term', 'Plain meaning', 'Example'], [
        ['<b>Lease</b>', 'receipt for a secret with an expiry', '<code>database/creds/app/Tz9...</code>'],
        ['<b>TTL</b>', 'time left before expiry', '<code>default_ttl=1h</code>'],
        ['<b>Renew</b>', 'ask for more time (allowed until max TTL)', '<code>vault lease renew -increment=1h &lt;id&gt;</code>'],
        ['<b>Max TTL</b>', 'hard cap from creation, renewals cannot beat it', '<code>max_ttl=24h</code>'],
        ['<b>Revoke</b>', 'kill now and clean up in the target system', '<code>vault lease revoke &lt;id&gt;</code>']
      ])}
      <p>🔵 <b>Rotation for secrets that must stay static.</b> Some systems cannot do dynamic (a third-party API key, a legacy app). Then rotate on a schedule and on suspicion. Safe pattern: <b>two active versions with overlap</b>. Create the new key, deploy consumers to read the new one, confirm no traffic uses the old one, then disable and finally delete the old. Rotating by "change it and hope" causes outages. AWS Secrets Manager can rotate RDS passwords with a Lambda on a schedule; Vault can rotate its <i>own</i> database admin login (<code>vault write -f database/rotate-root/pg</code>) so even the engine's bootstrap password becomes unknown to humans.</p>
      <p>🔵 <b>Envelope encryption.</b> A KMS key (AWS KMS, GCP KMS, Azure Key Vault) is stored in hardware and never leaves it. Calling KMS to encrypt a 2 GB file directly is slow, expensive and not even allowed (direct <code>Encrypt</code> takes at most 4 KB). Instead: (1) ask KMS <code>GenerateDataKey</code> and get two copies of a fresh data key, one plaintext and one encrypted under the KMS key; (2) encrypt your data locally with the plaintext key (AES-256-GCM); (3) store the ciphertext <b>plus the encrypted data key</b> together; (4) wipe the plaintext key from memory. To read: send the encrypted data key to KMS <code>Decrypt</code>, get the data key back, decrypt locally. KMS access is controlled by IAM and a <b>key policy</b>, every call is logged in CloudTrail, and an <b>encryption context</b> (extra non-secret labels such as <code>tenant=acme</code>) binds the key to its purpose.</p>
      <p>🔵 <b>Why it is neat.</b> Rotating the KMS key (automatic yearly rotation keeps old key material for old data) does not force re-encrypting terabytes; you can re-wrap only the small data keys. Deleting the KMS key makes all data under it unreadable, a deliberate "crypto-shredding" tool that also makes <i>accidental</i> deletion catastrophic: KMS enforces a 7 to 30 day waiting period before a key is really gone.</p>`,
    clues: ['"credentials leaked, how do we limit damage?" → <b>dynamic secrets</b> with short TTL and per-workload users', '"renew keeps working until it suddenly fails" → <b>max TTL</b> reached; fetch new credentials', '"encrypt large data with KMS" → <b>envelope encryption</b>: GenerateDataKey, encrypt locally, store the wrapped key', '"rotate without downtime" → <b>two valid versions with overlap</b>, then retire the old one', '"password in a crash dump or env var" → move to short-lived fetched credentials, scrub logs, expire quickly']
    ,
    code: [
      SH(R`# Lab: dynamic database credentials with Vault dev mode + a throwaway Postgres container. All passwords are fake placeholders.
docker run -d --name pg-lab -e POSTGRES_PASSWORD=PASTE_FAKE_ADMIN_PW -p 5432:5432 postgres:16
vault server -dev -dev-root-token-id=dev-only-token &      # dev mode: never in production
export VAULT_ADDR=http://127.0.0.1:8200 VAULT_TOKEN=dev-only-token

vault secrets enable database
vault write database/config/pg \
    plugin_name=postgresql-database-plugin \
    allowed_roles=app \
    connection_url='postgresql://{{username}}:{{password}}@127.0.0.1:5432/postgres?sslmode=disable' \
    username=postgres password=PASTE_FAKE_ADMIN_PW

# Make the engine's own login unknown to humans (rotates the admin password inside Postgres):
vault write -f database/rotate-root/pg

# A role is a template: how to create a user, how long it lives.
vault write database/roles/app db_name=pg default_ttl=1h max_ttl=24h \
    creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; GRANT SELECT ON ALL TABLES IN SCHEMA public TO \"{{name}}\";"

vault read database/creds/app                    # a NEW user and password, with a lease_id and lease_duration 1h
vault lease lookup LEASE_ID_FROM_ABOVE           # time left
vault lease renew -increment=1h LEASE_ID_FROM_ABOVE      # allowed until max_ttl (24h from creation)
vault lease revoke LEASE_ID_FROM_ABOVE           # Vault drops that user in Postgres right now
vault lease revoke -prefix database/creds/app    # incident button: kill every credential this role ever issued

# Clean up the lab:
docker rm -f pg-lab`, 'Vault database engine: dynamic credentials'),
      SH(R`# Envelope encryption you can run for free, with openssl standing in for KMS (the pattern is identical).
# "master.key" plays the KMS key: in real life it never leaves the HSM and you call an API instead.
openssl rand -out master.key 32                       # the key-encryption key (stays in the safe)
openssl rand -out data.key 32                         # fresh data key for THIS file
echo "customer-report-fake-data" > report.txt

# 1) Encrypt the data locally with the data key (AES-256-CBC with PBKDF2 here; use GCM in real code).
openssl enc -aes-256-cbc -pbkdf2 -in report.txt -out report.enc -pass file:data.key
# 2) Wrap (encrypt) the small data key with the master key and keep it NEXT TO the ciphertext.
openssl enc -aes-256-cbc -pbkdf2 -in data.key -out data.key.enc -pass file:master.key
# 3) Destroy the plaintext data key.
shred -u data.key report.txt 2>/dev/null || rm -f data.key report.txt

# Read path: unwrap the data key with the master key, then decrypt the file.
openssl enc -d -aes-256-cbc -pbkdf2 -in data.key.enc -out data.key -pass file:master.key
openssl enc -d -aes-256-cbc -pbkdf2 -in report.enc -pass file:data.key
rm -f data.key master.key report.enc data.key.enc`, 'Envelope encryption demo (local, no cloud)'),
      SH(R`# Optional AWS version (costs: ~$1 per month per KMS key, plus about $0.03 per 10,000 requests; use a sandbox account).
KEY_ID=$(aws kms create-key --description "devops16 lab key" --query KeyMetadata.KeyId --output text)
aws kms enable-key-rotation --key-id "$KEY_ID"                 # automatic yearly rotation of the key material

# Ask KMS for a data key: you get Plaintext (use it, then wipe it) and CiphertextBlob (store it with the data).
aws kms generate-data-key --key-id "$KEY_ID" --key-spec AES_256 \
    --encryption-context purpose=report-lab \
    --query '{wrapped:CiphertextBlob}' --output json > wrapped-key.json

# Later: KMS unwraps it. The same encryption context must be supplied, and the call is recorded in CloudTrail.
# aws kms decrypt --ciphertext-blob fileb://<(base64 -d ...) --encryption-context purpose=report-lab

# Clean up: scheduling deletion is the only way; the minimum wait is 7 days.
aws kms schedule-key-deletion --key-id "$KEY_ID" --pending-window-in-days 7`, 'AWS KMS data keys (optional, billed)')
    ],
    codeTitle: ['Vault dynamic DB credentials', 'Envelope encryption locally', 'AWS KMS (optional)'],
    viz: [{
      title: 'Lease timeline: renewals stop at max TTL',
      input: '60,100,60,30,70,95',
      inputLabel: 'ttl, maxTtl, increment, then renewal times (seconds)',
      gen: function (input) {
        var n = String(input || '').split(',').map(function (x) { return parseInt(x, 10); });
        if (n.length < 4 || n.some(function (x) { return isNaN(x) || x < 0; }) || n.length > 14) throw new Error('Use: ttl,maxTtl,increment,renewTime1,renewTime2,... (at least one renewal, whole seconds)');
        var ttl = n[0], max = n[1], inc = n[2], rens = n.slice(3), exp = Math.min(ttl, max), ok = 0, rows = [], frames = [];
        function snap(msg, hl) { frames.push({ narr: msg, parts: [{ type: 'table', label: 'lease at max TTL ' + max + ' s', columns: ['time (s)', 'event', 'expires at (s)', 'result'], rows: rows.map(function (r) { return r.slice(); }), hl: hl || {} }] }); }
        rows.push([0, 'lease created', exp, 'ttl ' + ttl + ' s']);
        snap('Vault issues the credentials at time 0 with TTL ' + ttl + ' s. The lease expires at ' + exp + ' s unless someone renews it. Max TTL ' + max + ' s is the ceiling for the whole life.', { 0: 'ok' });
        for (var i = 0; i < rens.length; i++) {
          var t = rens[i];
          if (t >= exp) {
            rows.push([t, 'renew attempt', exp, 'TOO LATE: already expired']);
            var h = {}; h[rows.length - 1] = 'bad';
            snap('Renew at ' + t + ' s: the lease already expired at ' + exp + ' s. Vault has revoked it (the database user is dropped). The app must request new credentials.', h);
            break;
          }
          var want = t + inc, nx = Math.min(want, max);
          ok++;
          rows.push([t, 'renew +' + inc + ' s', nx, want > max ? 'capped at max TTL (wanted ' + want + ')' : 'extended']);
          var h2 = {}; h2[rows.length - 1] = want > max ? 'cur' : 'ok';
          snap('Renew at ' + t + ' s succeeds (it is before ' + exp + ' s). New expiry = min(' + t + ' + ' + inc + ', ' + max + ') = ' + nx + ' s.' + (want > max ? ' <b>The cap bites:</b> renewal cannot go past max TTL.' : ''), h2);
          exp = nx;
        }
        snap('Final: the lease ends at ' + exp + ' s after ' + ok + ' successful renewal(s). To keep working past that, the app fetches new credentials. This is why a leaked credential cannot live forever, even if the attacker keeps renewing.', {});
        return pad4(frames, 'Renew early, never later than the current expiry.');
      }
    }],
    examples: [
      { title: 'Situation: a leaked database password that lived for three years', html: `<p>An old contractor laptop is lost. The shared <code>app_prod</code> password has been in 14 config files since 2022 and nobody dares change it. Response means a coordinated change of 14 deployments at midnight. With dynamic credentials the same laptop would hold, at worst, a username that was dropped an hour after it was issued. The migration path: enable the database engine, give each service its own role (<code>default_ttl=1h</code>), and let Vault Agent renew leases; then delete the old shared user.</p>` },
      { title: 'Situation: rotating a third-party API key without an outage', html: `<p>The payment provider allows two active keys. Steps: (1) create key B; (2) store it in Vault as a new KV version; (3) roll the deployments so they read B; (4) watch the provider dashboard until key A shows zero requests for an hour; (5) disable A, wait a day, delete A. If anything breaks at step 3 you roll back by re-enabling the old version. Rotating "in place" (changing the one key) would have caused an outage between steps.</p>` },
      { title: 'Situation: why not encrypt the 2 GB export directly with KMS?', html: `<p>Direct <code>kms:Encrypt</code> accepts at most 4 KB, charges per call, and sends your plaintext to a remote service. Envelope encryption sends only a 32 byte key, so cost is two KMS calls, encryption runs at local AES speed, and the KMS key never sees your data. The cost of the shortcut shows up later: <b>store the wrapped data key with the ciphertext</b>, otherwise a perfectly encrypted file can never be decrypted.</p>` }
    ],
    deepDive: `<p>🟣 <b>Failure modes of dynamic secrets.</b> The database now sits on Vault's critical path: if Vault is down at pod start, the pod has no credentials. Mitigate with HA Vault (Raft), Vault Agent caching and renewal, and TTLs long enough to ride out short outages. Connection pools holding a user that expires break at expiry, so the app must either re-fetch on auth failure or tie pool lifetime to the lease. Beware creating thousands of database users: set <code>max_open_connections</code> and use a single role per service, not per request.</p>
      <p>🟣 <b>Encryption context and grants.</b> The KMS encryption context is authenticated but not secret, appears in CloudTrail, and must match on decrypt. Use it to tie a data key to a tenant or table, so a stolen wrapped key cannot be decrypted for another purpose. Use <b>key policies</b> to separate administrators (manage the key) from users (use the key); never grant <code>kms:*</code> to an application role. KMS keys are regional; for multi-region data use multi-Region keys deliberately.</p>
      <p>🟣 <b>Authenticated encryption only.</b> Use AES-GCM or ChaCha20-Poly1305, which detect tampering; plain CBC without a MAC does not. Never reuse a GCM nonce with the same key, which is why a fresh data key per object is a safe default. Do not invent your own scheme; use the AWS Encryption SDK, Google Tink or libsodium sealed boxes.</p>
      <p>🟣 <b>Rotation maturity.</b> Level 0: nobody knows when secrets last changed. Level 1: inventory plus a calendar. Level 2: automated rotation with overlap. Level 3: nothing long-lived (dynamic credentials, OIDC federation, workload identity). Aim each system at the highest level it can reach and write down why the others cannot.</p>`,
    aiEra: `<p>🤖 <b>AI-written code loves static keys.</b> Generated snippets put <code>AWS_ACCESS_KEY_ID</code> or a database URL with a password into examples because training data is full of it. Ask for "workload identity / dynamic credentials, no long-lived keys" explicitly, and scan what comes back. Also check generated encryption code: assistants sometimes pick ECB or CBC without authentication, reuse a nonce, or hard-code the key next to the ciphertext, which defeats the point of envelope encryption.</p>
      <p>🤖 <b>Use AI to draft a rotation runbook</b> from an inventory of where a secret is consumed, and to explain a KMS <code>AccessDenied</code>. Check every IAM or key policy it proposes against least privilege (topic 5), and never include real key ids or tokens in prompts.</p>`,
    problems: [P({
      t: 'Compute when a renewed lease finally expires',
      l: 'Medium', tags: ['Vault', 'leases', 'TTL', 'python'], co: ['HashiCorp', 'Datadog'],
      s: PYC + `<p>Write <code>lease_timeline(ttl, max_ttl, increment, renewals)</code>. A lease is created at time 0 and expires at <code>min(ttl, max_ttl)</code>. <code>renewals</code> is a list of renewal times in ascending order. A renewal at time <code>t</code> succeeds only if <code>t</code> is strictly before the current expiry; it sets the expiry to <code>min(t + increment, max_ttl)</code>. If a renewal time is at or after the current expiry, the lease is already gone: stop and ignore all later renewals. Return the string <code>"expires=E renewals=N"</code> with E the final expiry and N the number of successful renewals.</p>`,
      ex: `<p><code>lease_timeline(60, 100, 60, [30, 70, 95])</code>: expiry 60; renew at 30 &rarr; min(90,100)=90; renew at 70 &rarr; min(130,100)=100; renew at 95 (95 &lt; 100) succeeds &rarr; min(155,100)=100. Result <span class="c-g">"expires=100 renewals=3"</span>. With a renewal at 100 instead of 95, 100 is not before 100, so it fails: <span class="c-r">"expires=100 renewals=2"</span>.</p>`,
      bw: `<p>Assume "renew forever" and never model the cap: the app renews on a timer, works for 24 hours, then every request fails at once because max TTL was reached and nobody planned a re-login. The wasted work is discovering the ceiling in production. Modelling expiry as <code>t + increment</code> without <code>min(..., max_ttl)</code> gives wrong answers.</p>`,
      q: ['TTL is 1 h, max TTL 24 h. A client renews every 30 minutes for a day. What must happen after 24 h?', ['It requests new credentials; renewal can no longer extend the lease', 'Nothing, renewals continue forever', 'Vault increases max TTL automatically', 'The secret is rotated by the database'], 0, 'Max TTL is counted from creation and cannot be exceeded by renewing. After it, the lease expires and the client must fetch fresh credentials.'],
      h: ['Hint 1: keep two numbers, the current expiry and a count of successful renewals.', 'Hint 2: a renewal works only if its time is strictly less than the current expiry; the new expiry is min(t + increment, max_ttl).', 'Hint 3: on the first failed renewal, stop the loop. Format the answer as <code>expires=E renewals=N</code>.'],
      a: `<p>Start with <code>expiry = min(ttl, max_ttl)</code>. For each renewal time in order: if it is not before the expiry, break; otherwise count it and set <code>expiry = min(t + increment, max_ttl)</code>. Note the expiry can stay equal to max_ttl for later renewals, and they still count as successful. Return the formatted string.</p>`,
      code: PY(`def lease_timeline(ttl, max_ttl, increment, renewals):
    """Final expiry (seconds since creation) and number of successful renewals."""
    expiry = min(ttl, max_ttl)            # creation: lease lives ttl seconds, never past the cap
    done = 0
    for t in renewals:
        if t >= expiry:                    # lease already expired (and revoked): stop
            break
        done += 1
        expiry = min(t + increment, max_ttl)   # renew, capped by max TTL
    return "expires=%d renewals=%d" % (expiry, done)`),
      cx: `<p>O(R) time for R renewal times, O(1) extra space.</p>`,
      f: ['How would you add a safety margin so the client renews at two thirds of the TTL? (Renew at <code>created + (2/3) * ttl</code>, then re-schedule from the new expiry.)', 'What does the client do when renewal fails? (Request fresh credentials, rebuild its connection pool, and log the lease id for audit.)'],
      tests: { sig: 'int int int int[] -> string', fn: 'leaseTimeline', names: { python: 'lease_timeline' }, cases: [
        [[60, 300, 60, [30, 80, 130]], 'expires=190 renewals=3'],
        [[60, 300, 60, []], 'expires=60 renewals=0'],
        [[60, 300, 60, [30, 90]], 'expires=90 renewals=1'],
        [[60, 100, 60, [30, 70]], 'expires=100 renewals=2'],
        [[60, 100, 60, [30, 70, 95]], 'expires=100 renewals=3'],
        [[60, 100, 60, [30, 70, 100]], 'expires=100 renewals=2'],
        [[3600, 86400, 3600, [1800, 5400, 9000, 12600]], 'expires=5400 renewals=1'],
        [[3600, 7200, 3600, [3000, 6000, 7000, 7100]], 'expires=7200 renewals=4'],
        [[10, 10, 10, [5]], 'expires=10 renewals=1'],
        [[100, 50, 10, []], 'expires=50 renewals=0']
      ] }
    })]
  });

  // ───────────────────────── Topic 4: supply chain: SBOM, signing, SLSA, Dependabot, CodeQL ─────────────────────────
  topics.push({
    title: 'Software Supply Chain: SBOMs, Image Signing with cosign, SLSA, Dependabot and CodeQL',
    analogy: `<p>A food label lists every ingredient, so when a supplier recalls "contaminated flour" you can tell in seconds which products are affected. That is an <b>SBOM</b> (software bill of materials). A tamper-evident seal and the packer's name on the box is a <b>signature</b>: you can check that this exact box left <i>this</i> factory and was not swapped on the way. <b>SLSA</b> is the grade of the factory itself: does it keep records, is it locked down, can one bad worker alter the product?</p>`,
    explain: `<p>🟢 <b>Why your code is mostly other people's code.</b> A typical service has 10 direct dependencies and 300 indirect ones, plus a base image with hundreds of OS packages. Attackers know it: they publish look-alike packages, take over abandoned ones, or hit a build system. Topic 1 gave you the gates that find known-bad packages. This topic answers three more questions: <b>what exactly is in my software</b> (SBOM), <b>is this the artifact my pipeline built</b> (signature), and <b>how trustworthy was the build</b> (SLSA).</p>
      <p>🟢 <b>SBOM.</b> A machine-readable list of components with name, version and supplier. Two standard formats: <b>CycloneDX</b> (JSON or XML, security-oriented, from OWASP) and <b>SPDX</b> (a Linux Foundation standard, strong in licensing, also an ISO standard). Generate one per build with <b>syft</b> (<code>syft app:ci -o cyclonedx-json=sbom.cdx.json</code>), store it next to the image, and scan the SBOM instead of the image when a new CVE appears (<code>grype sbom:sbom.cdx.json</code>). The SBOM is the inventory that turned the log4shell scramble from days into minutes.</p>
      <p>🔵 <b>Signing with cosign and Sigstore.</b> Plain tags are mutable: <code>app:1.4</code> can be re-pushed by anyone with push rights. Use the image <b>digest</b> (<code>app@sha256:...</code>), and sign that. <b>cosign</b> stores the signature in the same registry. Two modes: <b>key-based</b> (you guard a private key, which is a secret again) and <b>keyless</b> (recommended in CI): the pipeline proves its identity with an OIDC token (GitHub Actions can mint one per job), the <b>Fulcio</b> certificate authority issues a certificate valid for about 10 minutes naming that identity, the signature is made, and the event is recorded in <b>Rekor</b>, a public append-only transparency log. There is no long-lived key to steal. Verification says: "signed by <i>this workflow in this repository</i>, issued by GitHub's OIDC", not just "signed by someone".</p>
      <p>🔵 <b>Enforce at the door.</b> A signature nobody checks is decoration. Add verification where images are admitted: a Kubernetes admission policy (Kyverno <code>verifyImages</code>, Sigstore policy-controller) rejects any image not signed by your pipeline identity. That one rule stops "a developer pushed from a laptop" and "an attacker pushed to the registry".</p>
      ${H.table(['SLSA build level (intro)', 'What it means in plain words', 'How you get there'], [
        ['<b>L0</b>', 'no guarantees: whatever was built on someone\'s machine', '-'],
        ['<b>L1</b>', 'provenance exists: a record of what was built, from which source, by which builder', 'generate provenance in CI'],
        ['<b>L2</b>', 'provenance is signed by a hosted build service, so it cannot be forged by the project', 'hosted CI plus <code>actions/attest-build-provenance</code>'],
        ['<b>L3</b>', 'builds run in isolated, hardened environments; one build cannot influence another or steal the signing identity', 'GitHub reusable workflows with the SLSA generator, ephemeral runners']
      ])}
      <p>🔵 <b>Automate the boring part.</b> <b>Dependabot</b> (free on GitHub) opens pull requests that bump vulnerable or old dependencies, and Dependabot <i>alerts</i> warn from the dependency graph. <b>CodeQL</b> (free for public repos) is the deep SAST from topic 1, run on a schedule and on pull requests. Group updates and set a schedule so humans see two weekly PRs, not forty. Pin GitHub Actions to a full commit SHA so a hijacked tag cannot change your pipeline.</p>`,
    clues: ['"which services use log4j-core below 2.17.1?" → query the <b>SBOMs</b>, do not ask teams', '"how do we know the deployed image came from our pipeline?" → <b>cosign signature + admission verification</b>, deploy by digest', '"we cannot manage signing keys" → <b>keyless</b> signing with OIDC identity, Fulcio and Rekor', '"auditors ask for provenance" → <b>SLSA provenance</b> attestation and an SBOM per release', '"too many dependency alerts" → Dependabot grouping and schedule, gate only on Critical/High with fixes']
    ,
    code: [
      SH(R`# Lab: SBOM, scan the SBOM, and sign - all free, all local. A local registry avoids touching real ones.
docker run -d --name reg -p 5000:5000 registry:2
docker build -t localhost:5000/app:1.0 . && docker push localhost:5000/app:1.0

# 1) SBOM in both standard formats (syft is free and open source)
syft localhost:5000/app:1.0 -o cyclonedx-json=sbom.cdx.json -o spdx-json=sbom.spdx.json

# 2) Ask the inventory a question, no image needed. Which versions of log4j-core are in there?
jq -r '.components[] | select(.name=="log4j-core") | .name + " " + .version' sbom.cdx.json

# 3) Scan the SBOM for known CVEs (grype), failing on High or worse
grype sbom:sbom.cdx.json --fail-on high

# 4) Sign by DIGEST with a throwaway local key pair (lab only; production CI uses keyless OIDC).
export COSIGN_PASSWORD=PASTE_LAB_PASSPHRASE
cosign generate-key-pair                              # writes cosign.key and cosign.pub - keep cosign.key out of Git
DIGEST=$(docker inspect --format '{{index .RepoDigests 0}}' localhost:5000/app:1.0)
cosign sign --key cosign.key --yes "$DIGEST"
cosign verify --key cosign.pub "$DIGEST"             # prints the verified claims; fails if the image changed

# 5) Attach the SBOM as a signed attestation so it travels with the image
cosign attest --key cosign.key --yes --type cyclonedx --predicate sbom.cdx.json "$DIGEST"

# Clean up
docker rm -f reg && rm -f cosign.key cosign.pub sbom.*.json`, 'SBOM, scan and sign locally'),
      Y(`# .github/workflows/release.yml - build once, SBOM, scan, keyless sign, verify. No signing key exists anywhere.
name: release
on:
  push:
    tags: ['v*']
permissions:
  contents: read
jobs:
  build-sign:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write          # push to GHCR
      id-token: write          # lets the job mint an OIDC token for Fulcio (this IS the signing identity)
      attestations: write
    steps:
      - uses: actions/checkout@v4
      - uses: sigstore/cosign-installer@v3.7.0
      - uses: anchore/sbom-action/download-syft@v0.17.8
      - name: Log in to GHCR
        run: echo "@{{ secrets.GITHUB_TOKEN }}" | docker login ghcr.io -u "@{{ github.actor }}" --password-stdin
      - name: Build and push (by digest)
        id: build
        uses: docker/build-push-action@v6
        with:
          push: true
          tags: ghcr.io/@{{ github.repository }}:@{{ github.ref_name }}
      - name: SBOM
        run: syft ghcr.io/@{{ github.repository }}@@{{ steps.build.outputs.digest }} -o cyclonedx-json=sbom.cdx.json
      - name: Keyless sign the digest
        run: cosign sign --yes ghcr.io/@{{ github.repository }}@@{{ steps.build.outputs.digest }}
      - name: Provenance attestation (SLSA)
        uses: actions/attest-build-provenance@v2
        with:
          subject-name: ghcr.io/@{{ github.repository }}
          subject-digest: @{{ steps.build.outputs.digest }}
          push-to-registry: true
      - name: Verify exactly as a consumer would
        run: |
          cosign verify ghcr.io/@{{ github.repository }}@@{{ steps.build.outputs.digest }} \
            --certificate-identity-regexp "^https://github.com/@{{ github.repository }}/" \
            --certificate-oidc-issuer https://token.actions.githubusercontent.com`, 'release.yml: SBOM, keyless signature and provenance'),
      Y(`# .github/dependabot.yml - free dependency updates, grouped so humans review two PRs a week, not forty.
version: 2
updates:
  - package-ecosystem: pip
    directory: /
    schedule: { interval: weekly, day: monday }
    groups:
      python-minor-patch:
        update-types: [minor, patch]
  - package-ecosystem: docker           # bumps the base image tag in the Dockerfile
    directory: /
    schedule: { interval: weekly }
  - package-ecosystem: github-actions   # keeps pinned action versions current
    directory: /
    schedule: { interval: weekly }`, 'dependabot.yml')
    ],
    codeTitle: ['SBOM and signing lab', 'Release workflow', 'Dependabot'],
    viz: [{
      title: 'Which of our services contain a vulnerable component?',
      input: 'log4j-core',
      inputLabel: 'component name to hunt in all SBOMs (try log4j-core, jackson-databind, express, zlib)',
      gen: function (input) {
        var q = String(input || '').trim().toLowerCase();
        if (!q) throw new Error('Type a component name such as log4j-core');
        var sboms = [
          ['checkout', [['spring-core', '5.3.20', 'direct'], ['log4j-core', '2.14.1', 'direct'], ['jackson-databind', '2.15.0', 'direct']]],
          ['search', [['elasticsearch-client', '7.10.0', 'direct'], ['log4j-core', '2.11.1', 'transitive'], ['zlib', '1.2.11', 'os package']]],
          ['billing', [['log4j-core', '2.17.1', 'direct'], ['jackson-databind', '2.12.0', 'transitive']]],
          ['web-ui', [['express', '4.19.2', 'direct'], ['zlib', '1.3.1', 'os package']]]
        ];
        var fixed = { 'log4j-core': '2.17.1', 'jackson-databind': '2.13.4', 'zlib': '1.2.12', 'express': '4.19.2' };
        function cmp(a, b) { var x = a.split('.').map(Number), y = b.split('.').map(Number); for (var i = 0; i < 3; i++) { if (x[i] !== y[i]) return x[i] < y[i] ? -1 : 1; } return 0; }
        var rows = [], frames = [], hits = 0, bad = 0;
        function snap(msg, hl) { frames.push({ narr: msg, parts: [{ type: 'table', label: 'query: component = ' + q, columns: ['service', 'found component', 'version', 'how it got in', 'verdict'], rows: rows.map(function (r) { return r.slice(); }), hl: hl || {} }] }); }
        snap('One SBOM (CycloneDX file) exists per service per release. The question "who uses <b>' + H.esc(q) + '</b>?" becomes a query over four small files instead of four meetings.', {});
        sboms.forEach(function (s) {
          var f = s[1].filter(function (c) { return c[0] === q; });
          var hl = {};
          if (!f.length) { rows.push([s[0], '(none)', '-', '-', 'clean']); hl[rows.length - 1] = 'ok'; snap(s[0] + ': no component named ' + H.esc(q) + '. Nothing to do.', hl); return; }
          f.forEach(function (c) {
            hits++;
            var vulnerable = fixed[q] && cmp(c[1], fixed[q]) < 0;
            if (vulnerable) bad++;
            rows.push([s[0], c[0], c[1], c[2], vulnerable ? 'VULNERABLE (fix ' + fixed[q] + ')' : 'ok']);
            hl = {}; hl[rows.length - 1] = vulnerable ? 'bad' : 'ok';
            snap(s[0] + ' has ' + c[0] + ' ' + c[1] + ' (' + c[2] + ').' + (vulnerable ? ' That is below the fixed version, so it needs a patch.' + (c[2] !== 'direct' ? ' It is <b>indirect</b>: no one wrote it in a manifest, which is exactly why asking teams fails.' : '') : ' At or above the fixed version.'), hl);
          });
        });
        snap(hits ? ('Result: ' + hits + ' occurrence(s), ' + bad + ' vulnerable. Now open exactly those repositories, bump the version, rebuild, re-sign, redeploy, and re-run the query to prove it is zero.') : 'No service ships ' + H.esc(q) + '. Try log4j-core, jackson-databind, express or zlib.', {});
        return pad4(frames, 'An SBOM turns a scramble into a query.');
      }
    }],
    examples: [
      { title: 'Situation: a critical CVE in the base image, across 80 services', html: `<p>Trivy flags a Critical OpenSSL CVE in <code>python:3.12-slim</code>. The registry holds an SBOM attestation for each image, so <code>grype sbom:</code> over the stored SBOMs lists the 23 images that contain the vulnerable <code>libssl3</code> version, with owners from labels. Dependabot (docker ecosystem) has already opened a base-image bump PR in each repo; the pipeline rebuilds, re-scans, re-signs and the admission policy accepts only the new, signed digests. Total human work: reviewing 23 small PRs.</p>` },
      { title: 'Situation: "the tag was overwritten"', html: `<p>Someone re-pushed <code>app:1.4</code> with a different build. Pods that restart pull the new content and behaviour changes with no deploy event. Fix: deploy by <b>digest</b> (<code>image: ghcr.io/org/app@sha256:ab12...</code>), make the registry tag immutable where supported, and verify the signature in admission. An attacker with push rights can overwrite a tag but cannot make a valid keyless signature for your workflow identity.</p>` },
      { title: 'Situation: a dependency confusion / typosquat attempt', html: `<p>A developer types <code>pip install reqeusts</code> and the malicious package runs code at install time. Defences that stack: lockfiles with hashes (<code>pip install --require-hashes</code>), a private registry proxy that allows only approved packages, the SCA gate, and a Dependabot-only update path so new names do not appear by hand. The SBOM diff in the PR also shows a brand-new unexpected component, which a reviewer can question.</p>` }
    ],
    deepDive: `<p>🟣 <b>What a signature does and does not prove.</b> It proves identity and integrity: this digest was signed by this workflow identity, and Rekor shows when. It does <b>not</b> prove the code is free of bugs or backdoors. A compromised repository or a malicious maintainer still produces perfectly signed bad software. Signing is one link: protect the branch (required reviews, signed commits optional), the workflow files (CODEOWNERS), and the runners.</p>
      <p>🟣 <b>SBOM limits.</b> An SBOM is only as accurate as its generator: statically linked Go or Rust binaries, vendored copies, and files copied into an image by hand can be missed. Generate it from the built artifact (the image) rather than only from the manifest, and keep the version of the generator pinned. Pair it with <b>VEX</b> (vulnerability exploitability exchange) statements that say "component X is present but CVE Y is not exploitable here", which cuts false positives for consumers.</p>
      <p>🟣 <b>SLSA done honestly.</b> The levels describe the build platform, not the source. Hosted GitHub Actions with provenance gets you L2 cheaply; L3 needs a builder where the build steps you write cannot touch the signing material, such as the SLSA reusable generator workflow. Provenance is only useful if someone <i>verifies</i> it (<code>slsa-verifier</code>, <code>gh attestation verify</code>) at deploy time.</p>
      <p>🟣 <b>Update velocity vs stability.</b> Auto-merge patch bumps only when tests pass and the diff is small. Pin versions via lockfiles, review major bumps, and keep a time budget for updates, or the backlog of 200 stale PRs becomes the next risk. Check licences too: SPDX identifiers in the SBOM let legal tools flag a GPL component before release.</p>`,
    aiEra: `<p>🤖 <b>Package hallucination ("slopsquatting").</b> Assistants sometimes recommend packages that do not exist. Attackers register those names and wait. Always check a new dependency exists, has history and real maintainers, and let SCA, lockfile hashes and the SBOM diff in the pull request catch surprises. Treat an AI-suggested <code>pip install</code> as untrusted input.</p>
      <p>🤖 <b>Also a new supply chain.</b> Models, prompts, MCP servers and agent plug-ins are components too. Record model names and versions in an AI bill of materials (CycloneDX supports ML-BOM), pin and verify downloaded model files by hash, and sign internal ones. Use AI to summarise an SBOM diff in plain words for reviewers, but keep the verification itself deterministic.</p>`,
    problems: [P({
      t: 'Release workflow: build, SBOM, scan, keyless sign and verify',
      l: 'Hard', tags: ['SBOM', 'cosign', 'Sigstore', 'SLSA', 'GitHub Actions'], co: ['Google', 'Chainguard'],
      s: `<p>On a version tag, a GitHub Actions workflow must: build and push an image to GHCR, produce a CycloneDX SBOM with syft, fail on High or Critical findings in that SBOM, sign the image <b>by digest</b> with cosign <b>keyless</b>, and finally verify the signature the way a consumer would, pinning the identity to this repository. There must be no signing key or long-lived cloud credential anywhere. State which permission makes keyless signing possible.</p>`,
      ex: `<p>Result for tag <code>v1.4.0</code>: image <code>ghcr.io/org/app@sha256:ab12...</code>, <code>sbom.cdx.json</code> attached, scan <span class="c-g">pass</span>, <code>cosign verify</code> prints the certificate identity <code>https://github.com/org/app/.github/workflows/release.yml@refs/tags/v1.4.0</code> and issuer <code>https://token.actions.githubusercontent.com</code>. Pushing the same tag from a laptop produces <span class="c-r">no valid signature</span> for that identity, so admission rejects it.</p>`,
      bw: `<p>Build on a developer laptop, tag <code>latest</code>, sign with a private key kept in a CI secret variable. The tag can be overwritten, the key can be copied by anyone who can edit the pipeline or read the variable, and nothing records which build produced which digest. A leak means re-signing everything and distrusting history.</p>`,
      q: ['Which job permission lets GitHub Actions do keyless cosign signing?', ['id-token: write', 'contents: write', 'packages: read', 'security-events: write'], 0, '<code>id-token: write</code> allows the job to request an OIDC token. Fulcio turns that identity into a short-lived signing certificate, so no long-lived signing key is needed.'],
      h: ['Hint 1: push first and capture the <b>digest</b> output of the build step; every later command uses <code>image@digest</code>, never the tag.', 'Hint 2: grant <code>id-token: write</code> and <code>packages: write</code> only on this job; the workflow default stays <code>contents: read</code>.', 'Hint 3: verify with <code>--certificate-identity-regexp</code> naming your repository and <code>--certificate-oidc-issuer https://token.actions.githubusercontent.com</code> so a signature from some other repo fails.'],
      a: `<p>Build and push with <code>docker/build-push-action</code>, read the digest output, generate the SBOM from the pushed image, scan the SBOM with grype and <code>--fail-on high</code>, then sign the digest keylessly and verify it with the identity regexp. Job-level permissions give <code>id-token: write</code> for the OIDC token and <code>packages: write</code> for the registry. The verify step doubles as a smoke test for the whole chain.</p>`,
      code: Y(`name: release
on:
  push:
    tags: ['v*']
permissions:
  contents: read
jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write          # push the image
      id-token: write          # OIDC token for keyless signing
    steps:
      - uses: actions/checkout@v4
      - uses: sigstore/cosign-installer@v3.7.0
      - uses: anchore/sbom-action/download-syft@v0.17.8
      - name: Install grype
        run: curl -sSfL https://raw.githubusercontent.com/anchore/grype/main/install.sh | sh -s -- -b /usr/local/bin
      - name: Log in
        run: echo "@{{ secrets.GITHUB_TOKEN }}" | docker login ghcr.io -u "@{{ github.actor }}" --password-stdin
      - name: Build and push
        id: build
        uses: docker/build-push-action@v6
        with:
          push: true
          tags: ghcr.io/@{{ github.repository }}:@{{ github.ref_name }}
      - name: SBOM and gate
        run: |
          IMG=ghcr.io/@{{ github.repository }}@@{{ steps.build.outputs.digest }}
          syft "$IMG" -o cyclonedx-json=sbom.cdx.json
          grype sbom:sbom.cdx.json --fail-on high
      - name: Sign (keyless) and verify
        run: |
          IMG=ghcr.io/@{{ github.repository }}@@{{ steps.build.outputs.digest }}
          cosign sign --yes "$IMG"
          cosign verify "$IMG" \
            --certificate-identity-regexp "^https://github.com/@{{ github.repository }}/" \
            --certificate-oidc-issuer https://token.actions.githubusercontent.com`, 'release.yml'),
      cx: `<p>Adds roughly two to four minutes to a release (SBOM generation, scan, two Sigstore calls). It runs once per release, not per pull request.</p>`,
      f: ['How do you enforce this in the cluster? (A Kyverno or policy-controller rule that admits only images whose signature matches that repository identity.)', 'How do you stop a developer editing the workflow to sign anything? (Branch protection plus CODEOWNERS on workflow files, and verification pinned to the tag-triggered workflow path.)']
    })]
  });

  // ───────────────────────── Topic 5: least privilege IAM: boundaries, SCPs, Access Analyzer ─────────────────────────
  topics.push({
    title: 'Least-Privilege IAM Design: Permission Boundaries, SCPs and Access Analyzer',
    analogy: `<p>Picture an office building. A <b>key card</b> (identity policy) opens specific doors for you. The <b>building rules</b> (service control policy) say what no card in this building may ever open, such as the server-room power switch. A <b>visitor badge limit</b> (permission boundary) caps what a contractor's card can be programmed to do, even if their manager tries to grant more. The <b>security desk report</b> (Access Analyzer) tells you which doors each card actually used last quarter, so you can take the unused ones away.</p>`,
    explain: `<p>🟢 <b>Least privilege in one sentence.</b> Every person and machine gets only the actions, on only the resources, for only the time it needs. You already know users, groups, roles and policies (Cloud & DevOps 6) and OIDC federation for pipelines (Cloud & DevOps 11). This topic is about <b>designing</b> permissions so a mistake or a stolen credential has a small blast radius.</p>
      <p>🟢 <b>How AWS decides.</b> Every request starts as <b>implicitly denied</b>. An <b>allow</b> in a matching policy can open it. Any <b>explicit deny</b> anywhere beats every allow. With several layers, the request must be allowed by <b>every</b> layer that applies:</p>
      ${H.table(['Layer', 'Who sets it', 'What it does', 'Grants permission?'], [
        ['<b>SCP</b> (service control policy)', 'AWS Organizations admins, on the org, an OU or an account', 'sets the maximum for every principal in the account (not the management account); cannot grant anything', 'no, it only limits'],
        ['<b>Permission boundary</b>', 'IAM admins, attached to one user or role', 'caps what identity policies can give that one principal', 'no, it only limits'],
        ['<b>Identity policy</b>', 'IAM admins or teams', 'allows actions on resources for a user, group or role', 'yes'],
        ['<b>Resource policy</b>', 'owner of the bucket, key, queue, role trust', 'allows named principals, including other accounts', 'yes'],
        ['<b>Session policy</b>', 'caller of AssumeRole', 'narrows one temporary session further', 'no, it only limits']
      ])}
      <p>🔵 <b>Effective permission</b> inside one account = (identity policy allows) AND (boundary allows, if set) AND (SCP allows) AND (no explicit deny anywhere). Resource policies can allow on their own for same-account principals. The visualizer below runs this logic one layer at a time.</p>
      <p>🔵 <b>The classic fix for "developers need to create roles".</b> If you let developers create IAM roles, they can create a role with admin rights and assume it. The safe pattern: allow <code>iam:CreateRole</code> only with the condition <code>iam:PermissionsBoundary</code> equal to the team boundary policy, and forbid removing that boundary. Developers can then self-serve roles that can never exceed the boundary.</p>
      <p>🔵 <b>SCPs as guardrails.</b> Typical SCPs: deny leaving the Organization, deny stopping or deleting CloudTrail, deny disabling GuardDuty and Config, deny regions you do not use (<code>aws:RequestedRegion</code>, with an exception list for global services), deny creating access keys for the root user, deny public S3 if you can express it. An SCP never grants: attaching <code>FullAWSAccess</code> at the root is the default allow list and your deny SCPs are subtracted from it. Test SCPs on a sandbox OU first: a wrong deny can lock out even your admins.</p>
      <p>🔵 <b>Access Analyzer.</b> Free for external access findings: it proves which resources (S3 buckets, roles, KMS keys, queues) are reachable by principals <b>outside your zone of trust</b> (account or org), using logic-based reasoning, not guessing. The paid unused-access analyzer lists roles and permissions not used in N days. <b>Policy generation</b> reads CloudTrail for a role over up to 90 days and drafts a policy with only the actions seen; you review it, because CloudTrail does not log every data event by default. <b>Policy validation</b> (<code>aws accessanalyzer validate-policy</code>) lints a policy for errors, warnings and security findings before you deploy it.</p>
      <p>🔵 <b>Practical loop.</b> Start broad but time-boxed in a sandbox, record usage, generate a draft, tighten with resource ARNs and conditions (<code>aws:PrincipalOrgID</code>, <code>aws:SourceVpc</code>, MFA present, tags), deploy through code review, and re-run analysis every quarter. Prefer <b>roles with temporary credentials</b> over long-lived access keys for everything: people through IAM Identity Center, pipelines through OIDC, workloads through instance or pod roles.</p>`,
    clues: ['"a developer needs to create IAM roles" → allow CreateRole only with a <b>permission boundary</b> condition', '"make sure no one in any account can turn off CloudTrail" → <b>SCP</b> deny (guardrail that even account admins cannot override)', '"which permissions does this role actually use?" → <b>Access Analyzer</b> policy generation and unused access findings from CloudTrail', '"effective permissions with several policies" → intersection of boundary, SCP and identity allows, minus any explicit deny', '"service account with AdministratorAccess" → replace with a generated narrow policy and a short-lived role']
    ,
    code: [
      JS(`{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ReadWriteTeamBucketOnly",
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject"],
      "Resource": "arn:aws:s3:::acme-orders-prod/orders/*"
    },
    {
      "Sid": "ListThatBucketPrefix",
      "Effect": "Allow",
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::acme-orders-prod",
      "Condition": { "StringLike": { "s3:prefix": ["orders/*"] } }
    },
    {
      "Sid": "DenyUnencryptedUploads",
      "Effect": "Deny",
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::acme-orders-prod/*",
      "Condition": { "Null": { "s3:x-amz-server-side-encryption": "true" } }
    }
  ]
}`, 'Identity policy: exact actions, exact ARNs, a guard condition'),
      JS(`{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DevsMayCreateRolesOnlyWithTheBoundary",
      "Effect": "Allow",
      "Action": ["iam:CreateRole", "iam:PutRolePermissionsBoundary"],
      "Resource": "arn:aws:iam::123456789012:role/team-orders-*",
      "Condition": {
        "StringEquals": { "iam:PermissionsBoundary": "arn:aws:iam::123456789012:policy/team-orders-boundary" }
      }
    },
    {
      "Sid": "DevsCannotRemoveOrChangeTheBoundary",
      "Effect": "Deny",
      "Action": ["iam:DeleteRolePermissionsBoundary", "iam:DeletePolicy", "iam:CreatePolicyVersion"],
      "Resource": ["arn:aws:iam::123456789012:role/team-orders-*", "arn:aws:iam::123456789012:policy/team-orders-boundary"]
    }
  ]
}`, 'Delegated admin: roles may be created only under the boundary'),
      JS(`{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ProtectTheAuditTrail",
      "Effect": "Deny",
      "Action": [
        "cloudtrail:StopLogging",
        "cloudtrail:DeleteTrail",
        "guardduty:DeleteDetector",
        "config:StopConfigurationRecorder",
        "organizations:LeaveOrganization"
      ],
      "Resource": "*"
    },
    {
      "Sid": "OnlyApprovedRegions",
      "Effect": "Deny",
      "NotAction": ["iam:*", "organizations:*", "route53:*", "cloudfront:*", "support:*", "sts:*"],
      "Resource": "*",
      "Condition": { "StringNotEquals": { "aws:RequestedRegion": ["eu-west-1", "us-east-1"] } }
    }
  ]
}`, 'SCP guardrails (attached to an OU, tested in a sandbox first)'),
      SH(R`# Access Analyzer from the CLI. Free tier covers external-access analysis; unused-access analysis is billed per role.
aws accessanalyzer create-analyzer --analyzer-name org-external --type ORGANIZATION
aws accessanalyzer list-findings-v2 --analyzer-arn ANALYZER_ARN --filter '{"status":{"eq":["ACTIVE"]}}' --query 'findings[].[resourceType,resource,findingType]' --output table

# Lint a policy BEFORE deploying it (errors, warnings, security warnings such as passrole with a wildcard).
aws accessanalyzer validate-policy --policy-type IDENTITY_POLICY --policy-document file://policy.json \
    --query 'findings[].[findingType,issueCode,findingDetails]' --output table

# Draft a least-privilege policy from what a role really did in CloudTrail over the last 30 days.
aws accessanalyzer start-policy-generation \
    --policy-generation-details principalArn=arn:aws:iam::123456789012:role/orders-service \
    --cloud-trail-details file://trail-details.json

# Ask IAM what a policy set allows, without calling the real service:
aws iam simulate-principal-policy --policy-source-arn arn:aws:iam::123456789012:role/orders-service \
    --action-names s3:GetObject s3:DeleteObject --resource-arns arn:aws:s3:::acme-orders-prod/orders/1.json \
    --query 'EvaluationResults[].[EvalActionName,EvalDecision]' --output table`, 'Access Analyzer and the policy simulator')
    ],
    codeTitle: ['Narrow identity policy', 'Boundary-guarded role creation', 'SCP guardrails', 'Access Analyzer CLI'],
    viz: [{
      title: 'Walk a request through SCP, boundary and identity policy',
      input: 'ec2:RunInstances',
      inputLabel: 'type an action: s3:GetObject, ec2:RunInstances, iam:CreateUser, cloudtrail:StopLogging, lambda:InvokeFunction',
      gen: function (input) {
        var act = String(input || '').trim();
        if (!/^[A-Za-z0-9-]+:[A-Za-z0-9*?]+$/.test(act)) throw new Error('Type an action such as s3:GetObject or ec2:RunInstances');
        function match(pat, a) { var re = new RegExp('^' + pat.replace(/[.+^$(){}|\\[\]]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$', 'i'); return re.test(a); }
        function any(list, a) { return list.some(function (p) { return match(p, a); }); }
        var scpDeny = ['cloudtrail:StopLogging', 'cloudtrail:DeleteTrail', 'organizations:LeaveOrganization'];
        var boundary = ['s3:*', 'dynamodb:*', 'lambda:*', 'logs:*'];
        var identity = ['s3:*', 'ec2:*', 'iam:*', 'lambda:InvokeFunction'];
        var rows = [], frames = [];
        function snap(msg, hl) { frames.push({ narr: msg, parts: [{ type: 'table', label: 'request: ' + H.esc(act), columns: ['layer', 'rule', 'decision'], rows: rows.map(function (r) { return r.slice(); }), hl: hl || {} }] }); }
        snap('A developer role calls <code>' + H.esc(act) + '</code>. Start from <b>implicit deny</b>; the request must pass every layer. Order does not change the answer, but this order makes the reason easy to read.', {});
        var denied = false, h = {};
        var sd = any(scpDeny, act);
        rows.push(['SCP (guardrail)', 'denies ' + scpDeny.join(', '), sd ? 'EXPLICIT DENY' : 'not denied']);
        h = {}; h[0] = sd ? 'bad' : 'ok';
        snap(sd ? 'The SCP has an explicit deny for this action. Nothing the account admin does can override it. <b>Final: denied.</b>' : 'No SCP deny matches, so the guardrail lets the request continue.', h);
        if (sd) denied = true;
        if (!denied) {
          var bo = any(boundary, act);
          rows.push(['Permission boundary', 'allows ' + boundary.join(', '), bo ? 'inside the boundary' : 'OUTSIDE the boundary']);
          h = {}; h[1] = bo ? 'ok' : 'bad';
          snap(bo ? 'The action is inside the boundary, so identity policies may allow it.' : 'The boundary does not list this action. Even if the identity policy allows it, the cap blocks it. <b>Final: denied.</b>', h);
          if (!bo) denied = true;
        }
        if (!denied) {
          var id = any(identity, act);
          rows.push(['Identity policy', 'allows ' + identity.join(', '), id ? 'allowed' : 'NO ALLOW (implicit deny)']);
          h = {}; h[2] = id ? 'ok' : 'bad';
          snap(id ? 'The role\'s own policy allows this action. All layers agree. <b>Final: allowed.</b>' : 'Nothing grants this action to the role, so the default implicit deny stands. <b>Final: denied.</b>', h);
          if (!id) denied = true;
        }
        snap(denied ? 'Remember the shape of the fix: to allow something blocked by the boundary or SCP you change <i>that</i> layer through review; adding more identity allows never helps. Note this identity policy also holds <code>iam:*</code> and <code>ec2:*</code>, which the boundary happens to cut. Trust the boundary less than a tight identity policy.' : 'Allowed here means: allowed by identity policy, inside the boundary, and not denied by an SCP. A resource policy or condition keys could still narrow it for a specific resource.', {});
        return pad4(frames, 'Effective permission is the intersection of the layers, minus explicit denies.');
      }
    }],
    examples: [
      { title: 'Situation: a developer with AdministratorAccess', html: `<p>Priya has AdministratorAccess "because she deploys". A phishing page steals her session; the attacker creates a new IAM user with a console password, copies it to another region and disables nothing because nobody monitors. Fix in layers: (1) replace admin with a role for her team scoped to the services she uses, via IAM Identity Center permission sets with 4 hour sessions; (2) a permission boundary on any role she creates; (3) an SCP that denies <code>cloudtrail:StopLogging</code> and unused regions; (4) alerts on <code>CreateUser</code> and <code>AttachUserPolicy</code> (topic 7). Her day gets slightly less convenient; the blast radius drops from the whole account to her team's services.</p>` },
      { title: 'Situation: shrinking a role with Access Analyzer', html: `<p>The <code>orders-service</code> role holds <code>s3:*</code> on <code>*</code> and <code>dynamodb:*</code>. Policy generation over 30 days of CloudTrail shows it only calls <code>s3:GetObject</code>, <code>s3:PutObject</code> on one bucket prefix and <code>dynamodb:GetItem</code>, <code>dynamodb:PutItem</code>, <code>dynamodb:Query</code> on one table. The draft becomes a pull request with ARNs filled in; the old policy is detached after a week with no <code>AccessDenied</code> in CloudTrail. The Python exercise below does the "unused grants" diff by hand.</p>` },
      { title: 'Situation: a bucket shared with an unknown account', html: `<p>Access Analyzer reports a finding: bucket <code>acme-exports</code> is accessible by account <code>999999999999</code>, outside the org. Investigation: a contractor-era bucket policy from 2022 grants <code>s3:GetObject</code> to that account. Decision: archive the finding only if it is intended; otherwise remove the statement, check CloudTrail data events for what that account read (topic 7), and add an SCP or <code>aws:PrincipalOrgID</code> condition so cross-org sharing needs an explicit exception.</p>` }
    ],
    deepDive: `<p>🟣 <b>Subtle evaluation points.</b> (1) Explicit deny wins, but a missing allow in one layer is also fatal. (2) A boundary caps identity-based permissions only; a resource policy that names the user or role directly in the same account can still allow the action despite the boundary, whereas an SCP applies to the principal whatever the resource policy says. (3) SCPs do not affect the management account or service-linked roles. (4) <code>NotAction</code> with Allow is dangerous; with Deny (region lock) it needs an exception list for global services. (5) <code>iam:PassRole</code> deserves its own narrow statement: whoever can pass an admin role to a service (Lambda, EC2, ECS) can become that admin.</p>
      <p>🟣 <b>Privilege-escalation paths.</b> Permissions that look harmless can chain: <code>iam:CreatePolicyVersion</code>, <code>iam:AttachUserPolicy</code>, <code>iam:UpdateAssumeRolePolicy</code>, <code>lambda:UpdateFunctionCode</code> on a privileged function, <code>ec2:RunInstances</code> plus <code>iam:PassRole</code>. Review IAM write permissions as if they were admin, and scan policies for them (tools like Cloudsplaining and Prowler are free).</p>
      <p>🟣 <b>ABAC for scale.</b> Instead of one policy per team, tag principals and resources (<code>team=orders</code>) and write one policy whose condition compares <code>aws:PrincipalTag/team</code> with <code>aws:ResourceTag/team</code>. It scales to hundreds of teams but makes tag control a security boundary: restrict who may change tags.</p>
      <p>🟣 <b>Operating model.</b> Policies are code: stored in Git, linted with <code>validate-policy</code> in the pipeline (topic 1 gate), reviewed by owners, and applied by Terraform. Break-glass admin access is a separate, MFA-protected, alarm-raising role with a short session, not a standing permission. Re-certify access quarterly and remove people who changed teams.</p>`,
    aiEra: `<p>🤖 <b>Assistants default to "Action": "*" when stuck.</b> The prompt "fix AccessDenied" often returns a policy with wildcards on actions and resources. Give the assistant the exact denied action and ARN from the error or CloudTrail event, ask for the narrowest statement, and run the output through <code>validate-policy</code> and the policy simulator before merging.</p>
      <p>🤖 <b>Give your AI agents their own least-privilege roles.</b> A coding agent or chatbot with tool access is a principal like any other. Use a dedicated role with read-only access to the resources it needs, a short session, and no IAM write or <code>PassRole</code>. A prompt injection should find a role that can do very little. Log what the agent role does and alert on denied calls.</p>`,
    problems: [P({
      t: 'Find the unused grants (least-privilege diff)',
      l: 'Medium', tags: ['IAM', 'least privilege', 'wildcards', 'python'], co: ['AWS', 'Netflix'],
      s: PYC + `<p>Write <code>unused_grants(granted, used)</code>. <code>granted</code> is a list of IAM action patterns from a role's policy (they may contain <code>*</code> for any characters and <code>?</code> for one character). <code>used</code> is a list of concrete actions seen in CloudTrail. IAM action matching is case-insensitive. A grant is <b>unused</b> if no used action matches it. Return <code>"OK"</code> when every grant matches at least one used action, otherwise <code>"UNUSED:"</code> followed by the unused patterns (de-duplicated, exactly as written) sorted in normal string order and joined with commas.</p>`,
      ex: `<p><code>unused_grants(["s3:GetObject","s3:PutObject","ec2:*"], ["s3:GetObject","s3:ListBucket"])</code> &rarr; <span class="c-r">"UNUSED:ec2:*,s3:PutObject"</span>. <code>unused_grants(["s3:Get*"], ["s3:GetObject"])</code> &rarr; <span class="c-g">"OK"</span>: the wildcard matched something that was used.</p>`,
      bw: `<p>Compare the two lists as plain strings: <code>"s3:Get*"</code> is not in the used list, so it looks unused even though it covered <code>s3:GetObject</code>. The result tells the team to remove grants that are in daily use, they get <code>AccessDenied</code>, and they learn to distrust the tool and ask for <code>*</code> again.</p>`,
      q: ['A role is granted "s3:Get*" and CloudTrail shows only "s3:GetObject". Is the grant unused?', ['No, at least one used action matches the pattern (though it is wider than needed)', 'Yes, because the strings differ', 'Yes, because wildcards are never allowed', 'It cannot be known without the bucket name'], 0, 'The pattern matches s3:GetObject, so it is used. It is still broader than needed; the tightening step replaces it with the exact actions observed (and the resource ARNs).'],
      h: ['Hint 1: turn each pattern into a matcher where <code>*</code> means any run of characters and <code>?</code> one character; compare in lower case.', 'Hint 2: for each pattern, check whether <b>any</b> used action matches; collect the patterns with no match in a set to remove duplicates.', 'Hint 3: Python\'s <code>fnmatch.fnmatchcase</code> on lowered strings does exactly this wildcard match. Sort the survivors and format as <code>UNUSED:a,b</code>, or return <code>OK</code> when the set is empty.'],
      a: `<p>Lower-case the used actions once. For each distinct grant, lower-case it and test it against every used action with <code>fnmatchcase</code>; if none match it is unused. Output the original spelling, sorted. This is the core of an unused-permission report; the real tools also look at resources and conditions, and at data events CloudTrail may not record.</p>`,
      code: PY(`from fnmatch import fnmatchcase

def unused_grants(granted, used):
    """'OK' or 'UNUSED:<patterns>' - grants that no used action matches."""
    used_lower = [u.lower() for u in used]            # IAM action names are case-insensitive
    unused = set()
    for pattern in set(granted):                      # de-duplicate, keep original spelling
        p = pattern.lower()
        if not any(fnmatchcase(u, p) for u in used_lower):
            unused.add(pattern)
    if not unused:
        return "OK"
    return "UNUSED:" + ",".join(sorted(unused))`),
      cx: `<p>O(G x U x L) time for G grants, U used actions and pattern length L, which is tiny in practice; O(G + U) space.</p>`,
      f: ['How would you also list used actions that no grant covers? (Those would have been denied; they signal a missing permission or a different role being used.)', 'Why is "OK" not the same as "least privilege"? (A wildcard that matched one used action may still allow dozens of unused ones; narrow it to the observed actions.)'],
      tests: { sig: 'string[] string[] -> string', fn: 'unusedGrants', names: { python: 'unused_grants' }, cases: [
        [[['s3:GetObject', 's3:PutObject', 'ec2:*'], ['s3:GetObject', 's3:ListBucket']], 'UNUSED:ec2:*,s3:PutObject'],
        [[['s3:Get*'], ['s3:GetObject']], 'OK'],
        [[['*'], []], 'UNUSED:*'],
        [[[], []], 'OK'],
        [[['S3:getobject'], ['s3:GetObject']], 'OK'],
        [[['s3:Get?bject'], ['s3:GetObject']], 'OK'],
        [[['s3:Get*', 's3:Put*', 's3:Delete*'], ['s3:GetObject', 's3:GetBucketAcl']], 'UNUSED:s3:Delete*,s3:Put*'],
        [[['iam:*', 'iam:PassRole'], ['iam:PassRole']], 'OK'],
        [[['lambda:Invoke*', 'logs:*'], ['logs:PutLogEvents', 'logs:CreateLogStream']], 'UNUSED:lambda:Invoke*'],
        [[['ec2:Start*', 'ec2:Start*'], []], 'UNUSED:ec2:Start*']
      ] }
    })]
  });

  // ───────────────────────── Topic 6: segmentation, security groups, zero trust, IaC policy ─────────────────────────
  topics.push({
    title: 'Security Groups, Network Segmentation and Zero-Trust Basics',
    analogy: `<p>A hospital does not give every visitor a master key. The lobby is open to the public, the wards need a badge, the pharmacy needs a badge <i>and</i> a second check, and the records room is behind another door that only the records staff can use. If a visitor gets past the lobby, they are still stuck in one area. That is <b>segmentation</b>. <b>Zero trust</b> goes further: even a person already inside the building shows ID at every door, because "being inside" is not proof of anything.</p>`,
    explain: `<p>🟢 <b>The old model and why it fails.</b> A "castle and moat" network trusts everything inside the firewall. One phished laptop, one vulnerable web server, one leaked VPN password, and the attacker walks sideways ("lateral movement") to the database. Cloud security design assumes the attacker <i>will</i> get in somewhere, and limits where they can go next and what they can see.</p>
      <p>🟢 <b>Segments in a VPC.</b> You know VPCs, subnets and security groups from Cloud & DevOps 3 and 6. Security-wise, use tiers: <b>public</b> subnets hold only load balancers and NAT, <b>private app</b> subnets hold services with no public IP, <b>data</b> subnets hold databases that accept connections only from the app tier. Separate environments (dev, staging, prod) in separate <b>accounts</b>, not just separate subnets, because an account is the strongest boundary AWS gives you.</p>
      ${H.table(['Control', 'Works at', 'Key facts', 'Use it for'], [
        ['<b>Security group</b>', 'network interface (instance, pod ENI, load balancer)', 'stateful; <b>allow rules only</b>; default deny inbound; can reference another security group', 'the main control: "db accepts 5432 only from the app group"'],
        ['<b>Network ACL</b>', 'subnet', 'stateless (need return rules); allow and deny; numbered rules', 'a coarse backstop, blocking a known bad range'],
        ['<b>VPC endpoint</b>', 'VPC', 'private path to S3, KMS, STS and more without internet', 'keep traffic off the internet; policy can restrict which buckets'],
        ['<b>Kubernetes NetworkPolicy</b>', 'pod', 'default-deny then allow by label; needs a CNI that enforces it', 'segment inside the cluster'],
        ['<b>SSM Session Manager</b>', 'instance access', 'shell through IAM and an agent, no open port 22, full session logs', 'replace bastions and SSH keys']
      ])}
      <p>🔵 <b>The three red flags.</b> A security group rule is dangerous when the source is <code>0.0.0.0/0</code> (or <code>::/0</code>, the IPv6 "whole internet") <b>and</b> the port is administrative or a data service: 22 (SSH), 3389 (RDP), 3306 (MySQL), 5432 (PostgreSQL), 6379 (Redis), 9200 (Elasticsearch), 27017 (MongoDB). Opening <b>all traffic</b> (protocol -1) to the world is always wrong. Ports 80 and 443 on a load balancer are meant to be public. Scanners find an open Redis within minutes of it appearing.</p>
      <p>🔵 <b>Reference groups, not IP lists.</b> Write <code>db-sg: allow 5432 from app-sg</code>. When the app scales from 3 to 30 instances nothing changes, and a new instance outside <code>app-sg</code> cannot connect. Avoid copy-pasting CIDRs and avoid "temporary" wide rules; use infrastructure as code so every rule has an owner and a review.</p>
      <p>🔵 <b>Egress matters too.</b> Malware needs to talk out to download tools and send stolen data. Default security groups allow all outbound. Tighten: private subnets reach the internet through a NAT with a proxy or <b>AWS Network Firewall / DNS firewall</b> allow-list, and workloads that only need AWS services use VPC endpoints. Force <b>IMDSv2</b> on instances (<code>HttpTokens=required</code>) so an SSRF bug in an app cannot easily steal the instance role credentials.</p>
      <p>🔵 <b>Zero trust, practically.</b> Principles: (1) <b>verify explicitly</b>: authenticate and authorise every request with identity (user, device, workload), not network location; (2) <b>least privilege</b> per request; (3) <b>assume breach</b>: segment, log, limit the radius. In practice that means SSO with MFA for people, short-lived workload identity (IAM roles, SPIFFE, service-account tokens), <b>mTLS</b> between services (a service mesh, or sidecars), identity-aware access proxies instead of a flat VPN, and device-health checks. You do not "buy zero trust"; you remove implicit trust one hop at a time.</p>`,
    clues: ['"database must be reachable only from the app tier" → <b>security group referencing the app group</b>, private data subnet, no public IP', '"an SSH port is open to the world" → close it, use <b>SSM Session Manager</b> or a VPN/identity-aware proxy', '"limit lateral movement" → <b>segmentation</b>: separate accounts, subnets, security groups, NetworkPolicy default-deny', '"S3 bucket became public through Terraform" → <b>Block Public Access</b> plus IaC policy (checkov / OPA) in the pipeline', '"zero trust" → identity-based, per-request verification, mTLS, no implicit trust for internal networks']
    ,
    code: [
      TX(R`# s3.tf (HCL) - the bucket that made the news. Checkov flags this as CKV_AWS_20 / CKV_AWS_53-56.
resource "aws_s3_bucket" "exports" {
  bucket = "acme-exports-prod"
}
resource "aws_s3_bucket_acl" "exports" {
  bucket = aws_s3_bucket.exports.id
  acl    = "public-read"              # anyone on the internet can list and read every object
}

# ---- fixed version ----
resource "aws_s3_bucket" "exports" {
  bucket = "acme-exports-prod"
}
resource "aws_s3_bucket_public_access_block" "exports" {
  bucket                  = aws_s3_bucket.exports.id
  block_public_acls       = true      # reject any request that tries to add a public ACL
  block_public_policy     = true      # reject bucket policies that grant public access
  ignore_public_acls      = true      # ignore public ACLs already present
  restrict_public_buckets = true      # cross-account/public access is blocked even if a policy slips in
}
resource "aws_s3_bucket_server_side_encryption_configuration" "exports" {
  bucket = aws_s3_bucket.exports.id
  rule {
    apply_server_side_encryption_by_default { sse_algorithm = "aws:kms" }
  }
}`, 'Terraform: public bucket, then the fix (HCL)'),
      TX(R`# policy/s3.rego - OPA/conftest policy that fails the pull request when Terraform would make a bucket public.
# Run:  terraform plan -out tf.plan && terraform show -json tf.plan > plan.json && conftest test plan.json -p policy/
package main

import rego.v1

# Rule 1: no public ACL on any planned bucket ACL
deny contains msg if {
  some rc in input.resource_changes
  rc.type == "aws_s3_bucket_acl"
  rc.change.after.acl in {"public-read", "public-read-write", "authenticated-read"}
  msg := sprintf("%s: public ACL %q is not allowed", [rc.address, rc.change.after.acl])
}

# Rule 2: every bucket needs a public access block with all four settings true
deny contains msg if {
  some b in input.resource_changes
  b.type == "aws_s3_bucket"
  not has_full_block(b.change.after.bucket)
  msg := sprintf("%s: no complete public access block", [b.address])
}

has_full_block(name) if {
  some p in input.resource_changes
  p.type == "aws_s3_bucket_public_access_block"
  p.change.after.block_public_acls == true
  p.change.after.block_public_policy == true
  p.change.after.ignore_public_acls == true
  p.change.after.restrict_public_buckets == true
}`, 'policy/s3.rego (Rego policy-as-code)'),
      TX(R`# sg.tf (HCL) - security groups that reference each other instead of IP lists.
resource "aws_security_group" "app" {
  name   = "app-sg"
  vpc_id = aws_vpc.main.id
  ingress {
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]    # only the load balancer may call the app
  }
}
resource "aws_security_group" "db" {
  name   = "db-sg"
  vpc_id = aws_vpc.main.id
  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]    # only the app tier may reach the database
  }
  # no egress block of its own: tighten in production (a database rarely needs to call the internet)
}`, 'Security groups that reference each other (HCL)'),
      Y(`# k8s NetworkPolicy: default deny for the namespace, then allow only what is needed. Needs a CNI that enforces policies (Calico, Cilium).
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: prod
spec:
  podSelector: {}
  policyTypes: [Ingress, Egress]
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-app-to-db
  namespace: prod
spec:
  podSelector:
    matchLabels: { app: db }
  policyTypes: [Ingress]
  ingress:
    - from:
        - podSelector:
            matchLabels: { app: payments }
      ports:
        - protocol: TCP
          port: 5432`, 'Kubernetes NetworkPolicy: default deny then allow'),
      SH(R`# Free local checks (no cloud account needed):
checkov -d infra/ --framework terraform --check CKV_AWS_20,CKV_AWS_53,CKV_AWS_54,CKV_AWS_55,CKV_AWS_56
trivy config infra/                               # Terraform, CloudFormation, Kubernetes, Dockerfile misconfigurations
conftest test plan.json -p policy/                # your own Rego rules against the Terraform plan

# Optional AWS: find rules open to the world right now (read-only, no cost).
aws ec2 describe-security-groups \
    --filters Name=ip-permission.cidr,Values=0.0.0.0/0 \
    --query 'SecurityGroups[].[GroupId,GroupName]' --output table`, 'IaC and live checks')
    ],
    codeTitle: ['Public bucket and fix', 'Rego policy', 'Security groups', 'NetworkPolicy', 'Scanner commands'],
    viz: [{
      title: 'Security group exposure check',
      input: 'tcp:443:443:0.0.0.0/0;tcp:22:22:0.0.0.0/0;tcp:5432:5432:10.0.0.0/16;-1:0:0:::/0',
      inputLabel: 'rules as proto:from:to:cidr separated by semicolons',
      gen: function (input) {
        var parts = String(input || '').split(';').map(function (s) { return s.trim(); }).filter(Boolean);
        if (!parts.length || parts.length > 12) throw new Error('Give 1 to 12 rules like tcp:22:22:0.0.0.0/0 separated by semicolons');
        var sens = { 22: 'SSH', 3389: 'RDP', 3306: 'MySQL', 5432: 'PostgreSQL', 6379: 'Redis', 27017: 'MongoDB' };
        var rows = [], frames = [];
        function snap(msg, hl) { frames.push({ narr: msg, parts: [{ type: 'table', label: 'inbound rules', columns: ['#', 'protocol', 'ports', 'source', 'verdict'], rows: rows.map(function (r) { return r.slice(); }), hl: hl || {} }] }); }
        snap('We check each inbound rule with three questions: is the source the whole internet, is the protocol "all", and does the port range include an administrative or data port?', {});
        var risky = [];
        parts.forEach(function (r, i) {
          var f = r.split(':'); if (f.length < 4) throw new Error('Rule "' + r + '" needs proto:from:to:cidr');
          var proto = f[0].toLowerCase(), from = parseInt(f[1], 10), to = parseInt(f[2], 10), cidr = f.slice(3).join(':');
          if (isNaN(from) || isNaN(to)) throw new Error('Ports in "' + r + '" must be numbers');
          var world = cidr === '0.0.0.0/0' || cidr === '::/0', why = '';
          if (world && proto === '-1') why = 'all traffic open to the internet';
          else if (world && (proto === 'tcp' || proto === 'udp')) { Object.keys(sens).forEach(function (p) { if (!why && from <= +p && +p <= to) why = sens[p] + ' (' + p + ') open to the internet'; }); }
          rows.push([i, proto, proto === '-1' ? 'all' : from + '-' + to, cidr, why ? 'RISK: ' + why : 'ok']);
          var h = {}; h[rows.length - 1] = why ? 'bad' : 'ok';
          if (why) risky.push(i);
          snap('Rule ' + i + ': ' + H.esc(r) + '. ' + (why ? '<b>' + why + '.</b> Close it or restrict the source to a security group or VPN range.' : (world ? 'Open to the internet, but the port is not an admin or data port; fine for a public web listener if that is its job.' : 'The source is a private range, which is not exposed to the internet.')), h);
        });
        snap(risky.length ? 'Risky rule index(es): ' + risky.join(', ') + '. In a pipeline this check (checkov, tfsec or your own) fails the pull request before anything is applied.' : 'No risky rules found. Remember this checks exposure only; it does not prove the service behind the port is patched or authenticated.', {});
        return pad4(frames, 'Open-to-the-world plus an admin port is the pattern to catch.');
      }
    }],
    examples: [
      { title: 'Situation: an S3 bucket made public by Terraform', html: `<p>A developer adds <code>acl = "public-read"</code> to share a report with a partner. <code>terraform plan</code> shows it, a rushed review approves "one line", and within hours a researcher's scanner lists 40,000 customer files. Controls that would have stopped it, in order: account-level <b>S3 Block Public Access</b> (stops the ACL from working at all), the <b>checkov/OPA gate</b> failing the pull request, an <b>SCP</b> denying <code>s3:PutBucketPublicAccessBlock</code> changes, and a <b>Config rule</b> (topic 7) alerting on public buckets. Share with partners using a pre-signed URL with a short expiry instead.</p>` },
      { title: 'Situation: Redis open to the internet', html: `<p>A quick test instance has security group rule <code>tcp 6379 from 0.0.0.0/0</code> and no password. Within hours automated scanners write a cron job into it and take over the host for mining. The rule exposure check in this topic catches it in code review; <code>aws ec2 describe-security-groups</code> with the <code>0.0.0.0/0</code> filter finds ones already live. Real fix: private subnet, group-to-group rule, AUTH and TLS, and delete test resources with a tag-based expiry job.</p>` },
      { title: 'Situation: SSH via a bastion vs Session Manager', html: `<p>A bastion host needs port 22 open, shared SSH keys, and its own patching, and nobody can say who ran which command. With SSM Session Manager the instance has an IAM role with <code>AmazonSSMManagedInstanceCore</code>, no inbound ports at all, access is granted by IAM (and MFA), and every session is logged to CloudWatch or S3 with the exact keystrokes. Cost: nothing for the service itself, plus normal log storage.</p>` }
    ],
    deepDive: `<p>🟣 <b>Stateful vs stateless in practice.</b> Security groups remember a connection, so return traffic is automatic. NACLs do not, so you must allow ephemeral ports (1024-65535) for return traffic, which is a common source of "works in the SG, blocked at the subnet" bugs. Use SGs as the primary control and NACLs only as a coarse extra layer; both are free, so layering is cheap.</p>
      <p>🟣 <b>Kubernetes specifics.</b> Without NetworkPolicies every pod can talk to every pod. Default-deny per namespace plus explicit allows is the baseline; Cilium and Calico add DNS-name and L7 policies. Pod Security Standards (restricted), no <code>hostNetwork</code>, and blocking pod access to the node metadata endpoint complete the picture. A service mesh gives mTLS and per-service authorisation policies with workload identity.</p>
      <p>🟣 <b>Zero trust maturity.</b> A realistic path: SSO with phishing-resistant MFA for everyone; remove standing admin; replace the flat VPN with an identity-aware proxy for internal tools; enforce mTLS for service-to-service; add device posture checks for sensitive apps. Measure progress by "number of resources reachable from a compromised laptop / pod", not by buying a product.</p>
      <p>🟣 <b>Policy as code and drift.</b> Pipelines catch bad changes, but people can still click in the console. Combine IaC scanning with detective controls (Config rules, Security Hub, topic 7) and consider preventing console changes in production (SCP or read-only roles) so the code stays the source of truth. Treat a deny from conftest as a feature: require a tracked exception with an owner and an expiry date.</p>`,
    aiEra: `<p>🤖 <b>"Make the connection work" is the dangerous prompt.</b> When a database connection times out, assistants often suggest opening the security group to <code>0.0.0.0/0</code> or disabling the check. Ask for the root cause (route, subnet, group reference, port) and require the answer to use a group-to-group rule. Keep an IaC scanner in the loop so generated Terraform is checked before it ships.</p>
      <p>🤖 <b>AI services need segmentation too.</b> Model endpoints, vector databases and agent tool servers usually hold sensitive data. Put them in private subnets behind VPC endpoints, give agents a narrow egress allow-list (so an injected prompt cannot exfiltrate data to an arbitrary URL), and log the tool calls. Use an assistant to explain a scanner finding or draft a Rego rule, then test the rule against both a failing and a passing plan.</p>`,
    problems: [P({
      t: 'Find the risky security-group rules',
      l: 'Medium', tags: ['security groups', 'exposure', 'python', 'segmentation'], co: ['AWS', 'Wiz'],
      s: PYC + `<p>Write <code>exposed_rules(rules, sensitive)</code>. Each rule is a string <code>"proto:from:to:cidr"</code> (split into at most 4 parts; the cidr may contain colons, as in <code>::/0</code>). A rule is <b>risky</b> when its source is <code>0.0.0.0/0</code> or <code>::/0</code> and either the protocol is <code>-1</code> (all traffic), or the protocol is <code>tcp</code> or <code>udp</code> and the port range <code>[from, to]</code> contains at least one port in <code>sensitive</code>. Other protocols (such as <code>icmp</code>) are never risky. Return <code>"OK"</code> if nothing is risky, else <code>"RISK:"</code> followed by the 0-based indices of risky rules in ascending order, comma separated.</p>`,
      ex: `<p>With sensitive ports <code>[22, 3389, 5432]</code>: <code>["tcp:443:443:0.0.0.0/0", "tcp:22:22:0.0.0.0/0"]</code> &rarr; <span class="c-r">"RISK:1"</span> (SSH open to the world; 443 is not sensitive). <code>["tcp:22:22:10.0.0.0/8"]</code> &rarr; <span class="c-g">"OK"</span> (private source).</p>`,
      bw: `<p>Only compare the port with <code>==</code>: a rule <code>tcp 0-65535</code> or <code>tcp 1000-4000</code> covers SSH-adjacent services but never equals 22, so it is missed. Splitting on every colon also breaks IPv6 cidrs like <code>::/0</code>. The wasted work is a scanner that reports clean while the whole port range is open.</p>`,
      q: ['A rule allows tcp 0-65535 from 0.0.0.0/0. Is it risky when sensitive ports include 22?', ['Yes, the range contains port 22 and the source is the whole internet', 'No, the rule does not mention port 22 exactly', 'Only if the protocol is udp', 'No, because port ranges are always safe'], 0, 'A range check, not an equality check, is required. The range contains every sensitive port, so the rule exposes SSH and everything else to the internet.'],
      h: ['Hint 1: split with <code>split(":", 3)</code> so an IPv6 cidr such as <code>::/0</code> stays in one piece.', 'Hint 2: a rule is open to the world when the cidr is exactly <code>0.0.0.0/0</code> or <code>::/0</code>.', 'Hint 3: protocol <code>-1</code> is risky on its own; for tcp and udp test <code>from &lt;= p &lt;= to</code> for each sensitive port; ignore other protocols.'],
      a: `<p>For each rule, split into protocol, from, to and cidr. If the cidr is not a world cidr, skip it. If the protocol is <code>-1</code>, it is risky. If it is tcp or udp, it is risky when any sensitive port falls inside the inclusive range. Collect the indices and format. This is the heart of what checkov and tfsec rules such as "no unrestricted ingress to SSH" do.</p>`,
      code: PY(`def exposed_rules(rules, sensitive):
    """'OK' or 'RISK:<indices>' for inbound rules that expose sensitive ports to the whole internet."""
    world = {"0.0.0.0/0", "::/0"}
    risky = []
    for i, rule in enumerate(rules):
        proto, lo, hi, cidr = rule.split(":", 3)   # maxsplit keeps '::/0' intact
        if cidr not in world:
            continue                               # private source: not internet-exposed
        proto = proto.lower()
        if proto == "-1":
            risky.append(i)                        # all traffic to everyone
        elif proto in ("tcp", "udp"):
            lo, hi = int(lo), int(hi)
            if any(lo <= p <= hi for p in sensitive):
                risky.append(i)
    if not risky:
        return "OK"
    return "RISK:" + ",".join(str(i) for i in risky)`),
      cx: `<p>O(R x S) time for R rules and S sensitive ports, O(R) space for the result.</p>`,
      f: ['How would you handle a rule whose cidr is a /1 such as 0.0.0.0/1? (Parse the network with ipaddress and treat any prefix shorter than, say, /8 as effectively public.)', 'Where do you run this? (As a pipeline gate on the Terraform plan, plus a scheduled live scan so console changes are caught.)'],
      tests: { sig: 'string[] int[] -> string', fn: 'exposedRules', names: { python: 'exposed_rules' }, cases: [
        [[['tcp:22:22:0.0.0.0/0'], [22, 3389, 3306, 5432]], 'RISK:0'],
        [[['tcp:443:443:0.0.0.0/0', 'tcp:80:80:0.0.0.0/0'], [22, 3389, 3306, 5432]], 'OK'],
        [[['tcp:22:22:10.0.0.0/8'], [22, 3389, 3306, 5432]], 'OK'],
        [[['-1:0:0:0.0.0.0/0'], [22]], 'RISK:0'],
        [[['tcp:0:65535:0.0.0.0/0'], [22, 3389]], 'RISK:0'],
        [[['tcp:1000:4000:0.0.0.0/0'], [22, 3306, 3389]], 'RISK:0'],
        [[['tcp:6000:7000:0.0.0.0/0'], [22, 3306, 3389, 5432]], 'OK'],
        [[['tcp:22:22:::/0'], [22]], 'RISK:0'],
        [[['icmp:-1:-1:0.0.0.0/0'], [22]], 'OK'],
        [[['udp:3389:3389:0.0.0.0/0', 'tcp:443:443:0.0.0.0/0', 'tcp:5432:5432:0.0.0.0/0', 'tcp:22:22:192.168.0.0/16'], [22, 3389, 3306, 5432]], 'RISK:0,2'],
        [[[], [22]], 'OK']
      ] }
    })]
  });

  // ───────────────────────── Topic 7: audit logs and detection: CloudTrail, GuardDuty, Config, Security Hub ─────────────────────────
  topics.push({
    title: 'Audit Logs and Detection: CloudTrail, GuardDuty, Config and Security Hub',
    analogy: `<p>A shop has a <b>CCTV recorder</b> that films every door (CloudTrail: who did what, when, from where), a <b>night guard</b> who watches for odd behaviour such as a stranger trying every window (GuardDuty), a <b>stocktake book</b> recording how every shelf looked each day so you can see what changed (Config), and a <b>control-room screen</b> that gathers all the alarms in one place (Security Hub). Without the recorder, "who deleted it last Tuesday?" has no answer.</p>`,
    explain: `<p>🟢 <b>CloudTrail: the activity log.</b> Every call to the AWS API (console, CLI, SDK, other services) is an event: who (<code>userIdentity</code>), what (<code>eventName</code> such as <code>DeleteBucket</code>), on what (<code>requestParameters</code>), from where (<code>sourceIPAddress</code>, <code>userAgent</code>), when (<code>eventTime</code>), and whether it worked (<code>errorCode</code>). By default you get <b>Event history</b>: the last 90 days of <b>management events</b> (create, delete, change), free, per region, not searchable beyond that. For real audit you create a <b>trail</b> that writes to an S3 bucket (kept for years, protected), ideally one <b>organization trail</b> for every account and region, with <b>log file validation</b> on (digest files prove the logs were not edited).</p>
      <p>🟢 <b>What CloudTrail does not log by default.</b> <b>Data events</b> such as S3 <code>GetObject</code> or Lambda invoke are off by default and cost extra (about $0.10 per 100,000 events). Enable them for sensitive buckets only, or you will not be able to answer "which files did the attacker read?". Also remember it logs API calls, not what happened inside an instance.</p>
      ${H.table(['Service', 'Question it answers', 'Cost note (check current pricing)', 'Free to try?'], [
        ['<b>CloudTrail</b>', 'who called which API, when and from where', 'Event history free; first management trail copy free; data events and extra trails billed', 'yes, 90-day Event history'],
        ['<b>GuardDuty</b>', 'is something suspicious happening (stolen credentials, crypto mining, odd DNS, port scans)?', '30-day free trial, then billed by log volume analysed', '30 days'],
        ['<b>AWS Config</b>', 'what did this resource look like at time T, and does it break a rule (public bucket, unencrypted volume)?', 'billed per configuration item recorded and per rule evaluation', 'no, small cost'],
        ['<b>Security Hub</b>', 'what is the combined security posture, scored against CIS and AWS best practices?', 'billed per check and per finding ingested; 30-day trial', '30 days'],
        ['<b>Access Analyzer</b>', 'who outside my org can reach my resources? (topic 5)', 'external access analysis free', 'yes']
      ])}
      <p>🔵 <b>GuardDuty in practice.</b> One click turns it on (use a delegated admin account for the org). It reads CloudTrail management events, VPC Flow Logs and DNS logs <i>without you configuring them</i>, and raises findings with a severity: for example <code>UnauthorizedAccess:IAMUser/InstanceCredentialExfiltration.OutsideAWS</code> (role credentials from an instance used from an outside IP), <code>CryptoCurrency:EC2/BitcoinTool.B!DNS</code>, or <code>Policy:IAMUser/RootCredentialUsage</code>. It sends findings to <b>EventBridge</b>, where a rule can notify the on-call channel or start an automatic response (isolate the instance, disable the key). Use sample findings (<code>create-sample-findings</code>) to test the plumbing without any attacker.</p>
      <p>🔵 <b>Config and drift.</b> Config records configuration changes as a timeline per resource. <b>Config rules</b> (managed ones like <code>s3-bucket-public-read-prohibited</code>, <code>restricted-ssh</code>, <code>cloudtrail-enabled</code>) mark resources COMPLIANT or NON_COMPLIANT; auto-remediation can fix some. This is the detective twin of the IaC gate in topic 6: the pipeline stops bad changes, Config catches console edits and things that existed before the pipeline.</p>
      <p>🔵 <b>Security Hub.</b> Collects findings from GuardDuty, Config, Inspector, Access Analyzer and partners into one format (ASFF), runs security standards (AWS Foundational Security Best Practices, CIS AWS Foundations Benchmark) and shows a score. It is the dashboard, not the cure; unfixed findings are noise, so assign owners and SLAs.</p>
      <p>🔵 <b>Alert on a short list.</b> You cannot read every event. Start with alerts for: root user activity, console login without MFA, <code>StopLogging</code> / <code>DeleteTrail</code>, IAM policy changes and new access keys, security group opened to the world, KMS key deletion scheduled, S3 public-access-block removed, and any GuardDuty finding of high severity. Each alert needs an owner and a runbook, or it will be muted.</p>`,
    clues: ['"who deleted it last Tuesday?" → <b>CloudTrail</b> (Event history for 90 days, a trail in S3 and Athena for longer)', '"which files did the attacker read?" → only answerable if <b>data events</b> were enabled for that bucket beforehand', '"detect stolen instance credentials or crypto mining" → <b>GuardDuty</b> findings to EventBridge', '"a bucket became public after a console click" → <b>Config rule</b> drift detection plus auto-remediation', '"prove the logs were not tampered with" → <b>log file validation</b>, a separate log-archive account, S3 Object Lock']
    ,
    code: [
      JS(`{
  "eventVersion": "1.09",
  "eventTime": "2026-10-13T14:02:11Z",
  "eventSource": "s3.amazonaws.com",
  "eventName": "DeleteBucket",
  "awsRegion": "eu-west-1",
  "sourceIPAddress": "203.0.113.10",
  "userAgent": "aws-cli/2.17.0 md/awscrt#0.20 ua/2.0 os/linux#6.1 md/arch#x86_64",
  "userIdentity": {
    "type": "AssumedRole",
    "arn": "arn:aws:sts::123456789012:assumed-role/dev-admin/alice",
    "sessionContext": { "sessionIssuer": { "type": "Role", "arn": "arn:aws:iam::123456789012:role/dev-admin" } }
  },
  "requestParameters": { "bucketName": "acme-reports-staging" },
  "responseElements": null,
  "recipientAccountId": "123456789012"
}`, 'A CloudTrail event, trimmed (documentation IP and account id)'),
      SH(R`# "Who deleted it last Tuesday?" - Step 1: CloudTrail Event history (free, last 90 days, management events, one region at a time).
aws cloudtrail lookup-events \
    --lookup-attributes AttributeKey=EventName,AttributeValue=DeleteBucket \
    --start-time 2026-10-13T00:00:00Z --end-time 2026-10-14T00:00:00Z \
    --region eu-west-1 \
    --query 'Events[].[EventTime,Username,EventName,CloudTrailEvent]' --output json | head -n 40

# Step 2: pivot on the actor. What else did this principal and this IP do around the same time?
aws cloudtrail lookup-events \
    --lookup-attributes AttributeKey=Username,AttributeValue=alice \
    --start-time 2026-10-13T13:00:00Z --end-time 2026-10-13T16:00:00Z \
    --query 'Events[].[EventTime,EventName,EventSource]' --output table

# Step 3 (older than 90 days, or data events): query the trail's S3 logs with Athena, see the SQL file below.

# Set up the audit trail (organization trail would be created from the management account; this is a single-account lab).
aws cloudtrail create-trail --name lab-trail --s3-bucket-name acme-trail-logs-123456789012 \
    --is-multi-region-trail --enable-log-file-validation
aws cloudtrail start-logging --name lab-trail
aws cloudtrail validate-logs --trail-arn TRAIL_ARN --start-time 2026-10-01T00:00:00Z   # proves digest files match

# GuardDuty and Config: turn on, test with sample findings, and turn off after the lab to stop charges.
aws guardduty create-detector --enable
aws guardduty create-sample-findings --detector-id DETECTOR_ID --finding-types Recon:EC2/PortProbeUnprotectedPort
aws configservice describe-compliance-by-config-rule --compliance-types NON_COMPLIANT`, 'CloudTrail investigation and setup'),
      TX(R`-- Athena over the CloudTrail S3 logs (create the table with the console's "Create Athena table" button, or use CloudTrail Lake).
-- Partition by day and always filter on it: Athena bills by data scanned.
SELECT eventtime, useridentity.arn AS who, eventname, sourceipaddress, useragent,
       json_extract_scalar(requestparameters, '$.bucketName') AS bucket, errorcode
FROM   cloudtrail_logs
WHERE  day = '2026/10/13'
  AND  eventname IN ('DeleteBucket', 'DeleteObject', 'TerminateInstances', 'DeleteDBInstance')
ORDER  BY eventtime;`, 'Athena SQL (not run in the browser)'),
      JS(`{
  "source": ["aws.cloudtrail"],
  "detail-type": ["AWS API Call via CloudTrail"],
  "detail": {
    "eventSource": ["cloudtrail.amazonaws.com", "guardduty.amazonaws.com", "config.amazonaws.com"],
    "eventName": ["StopLogging", "DeleteTrail", "UpdateTrail", "DeleteDetector", "StopConfigurationRecorder"]
  }
}`, 'EventBridge pattern: alert when someone blinds the audit trail')
    ],
    codeTitle: ['A CloudTrail event', 'CloudTrail investigation CLI', 'Athena query', 'EventBridge alert pattern'],
    viz: [{
      title: 'Reading CloudTrail to answer "who deleted it?"',
      input: 'DeleteBucket',
      inputLabel: 'event name to hunt: DeleteBucket, TerminateInstances, StopLogging or CreateAccessKey',
      gen: function (input) {
        var q = String(input || '').trim();
        var ev = [
          ['10-13 09:15', 'bob', 'ListBuckets', '198.51.100.7', 'console', 'ok'],
          ['10-13 13:55', 'alice', 'AssumeRole', '203.0.113.10', 'aws-cli', 'ok'],
          ['10-13 14:02', 'alice', 'DeleteBucket', '203.0.113.10', 'aws-cli', 'ok'],
          ['10-13 14:03', 'alice', 'StopLogging', '203.0.113.10', 'aws-cli', 'ok'],
          ['10-13 16:40', 'ci-deployer', 'TerminateInstances', '192.0.2.44', 'terraform', 'ok'],
          ['10-14 08:01', 'carol', 'CreateAccessKey', '198.51.100.99', 'console', 'ok'],
          ['10-14 08:05', 'carol', 'AttachUserPolicy', '198.51.100.99', 'console', 'AccessDenied']
        ];
        var names = {}; ev.forEach(function (e) { names[e[2]] = 1; });
        if (!names[q]) throw new Error('Type an event name from: ' + Object.keys(names).join(', '));
        var frames = [];
        function snap(msg, rows, hl) { frames.push({ narr: msg, parts: [{ type: 'table', label: 'CloudTrail events (simplified)', columns: ['time', 'principal', 'eventName', 'source IP', 'tool', 'result'], rows: rows.map(function (r) { return r.slice(); }), hl: hl || {} }] }); }
        snap('Seven events from the trail. Raw trails have millions, so we <b>filter</b> instead of reading. Question: who did <code>' + H.esc(q) + '</code>, and what else did they do?', ev, {});
        var hit = ev.filter(function (e) { return e[2] === q; });
        var hl = {}; ev.forEach(function (e, i) { if (e[2] === q) hl[i] = 'bad'; });
        snap('Step 1: filter by <code>eventName = ' + H.esc(q) + '</code>. ' + hit.length + ' event(s) match (red). The 90-day Event history, an Athena query or CloudTrail Lake can all do this filter.', ev, hl);
        var who = hit[0][1], ip = hit[0][3];
        snap('Step 2: read the fields. Principal <b>' + who + '</b>, source IP <b>' + ip + '</b>, tool <b>' + hit[0][4] + '</b>, result <b>' + hit[0][5] + '</b>. For a role session, the <code>userIdentity.arn</code> ends with the person\'s session name, so a shared role still names the human.', [hit[0]], { 0: 'sel' });
        var piv = ev.filter(function (e) { return e[1] === who || e[3] === ip; });
        snap('Step 3: pivot. Everything by <b>' + who + '</b> or from <b>' + ip + '</b>: ' + piv.length + ' events. This turns one fact into a story and often reveals more than was asked.', piv, {});
        var h3 = {}; piv.forEach(function (e, i) { if (e[2] === 'StopLogging' || e[2] === 'CreateAccessKey') h3[i] = 'bad'; });
        snap(Object.keys(h3).length ? 'Red rows are the ones to worry about: turning logging off or minting an access key right next to the action is a classic cover-your-tracks or persistence pattern. Escalate to incident response (topic 8) rather than assuming a mistake.' : 'Nothing else suspicious around it, so this looks like a normal change by that person. Ask them, record the answer in the ticket, and move on.', piv, h3);
        snap('Limits to remember: the trail only shows what was logged. If this had been <code>GetObject</code> reads, you would see nothing unless data events were on beforehand; and if the trail lived in the same account, an admin could have deleted it. Hence a separate log-archive account with Object Lock and log file validation.', [], {});
        return pad4(frames, 'Filter, read the identity fields, pivot on actor and IP.');
      }
    }],
    examples: [
      { title: 'Situation: "who deleted it last Tuesday?"', html: `<p>On Wednesday a team notices a staging bucket is gone. Event history (free, 90 days) shows <code>DeleteBucket</code> on Tuesday 14:02 by <code>assumed-role/dev-admin/alice</code> from the office IP via the CLI. Alice says she meant a different bucket in a different terminal profile. Outcome: no blame, but two fixes: bucket names that include the environment, and an SCP/permission set that does not allow bucket deletion in prod. If this had been last year, only an organization trail in S3 plus Athena could have answered.</p>` },
      { title: 'Situation: GuardDuty finds stolen instance credentials', html: `<p>Finding <code>UnauthorizedAccess:IAMUser/InstanceCredentialExfiltration.OutsideAWS</code>, severity High: temporary credentials of an EC2 role are being used from an IP that is not in AWS. Cause: an SSRF bug in the app let an attacker read the instance metadata. Automatic response: EventBridge starts a Lambda that attaches a deny-all inline policy with a condition on the token issue time (<code>aws:TokenIssueTime</code> earlier than now), which revokes all existing sessions of that role without breaking new ones. Permanent fix: IMDSv2 required, SSRF patched, the role narrowed (topic 5).</p>` },
      { title: 'Situation: a public bucket found by Config in minutes', html: `<p>Someone clears Block Public Access in the console. The Config rule <code>s3-bucket-level-public-access-prohibited</code> flips to NON_COMPLIANT within minutes, Security Hub raises a finding, and the SSM automation remediation re-enables the block and posts to chat with the CloudTrail event that did it (the principal, from CloudTrail). Detection plus auto-remediation shrinks a weeks-long exposure to minutes.</p>` }
    ],
    deepDive: `<p>🟣 <b>Protect the evidence.</b> Attackers with admin rights try <code>StopLogging</code>, delete the S3 log bucket or change its lifecycle. Defend with: organization trail that member accounts cannot modify, logs delivered to a dedicated <b>log-archive account</b>, S3 <b>Object Lock</b> (WORM) and MFA delete, SCPs denying trail changes, log file validation, and alerts on any attempt. Send a second copy to a SIEM or a different cloud.</p>
      <p>🟣 <b>Cost control.</b> Logging everything everywhere is expensive. Keep management events for all accounts, enable data events selectively (crown-jewel buckets, KMS decrypt, secrets reads), apply S3 lifecycle rules (Standard to Glacier after 90 days, delete after your retention period), and filter VPC Flow Logs or sample them. GuardDuty cost scales with log volume; check the usage tab after the trial and decide per account.</p>
      <p>🟣 <b>From detection to response.</b> A finding without a runbook is just a notification. For each alert type write: what it means, how to confirm (CloudTrail query), who decides, containment steps, and when to escalate. Start with manual steps, automate the safe ones (tag the instance, snapshot it, isolate with a quarantine security group) and keep a human in the loop for destructive ones.</p>
      <p>🟣 <b>Non-AWS audit sources.</b> The same ideas apply elsewhere: Vault's audit device (topic 2), Kubernetes audit logs (who ran <code>kubectl exec</code> in prod), GitHub audit log (who changed branch protection), and your identity provider's sign-in logs. A mature setup gathers these into one searchable place with retention matched to your compliance regime (topic 8).</p>`,
    aiEra: `<p>🤖 <b>AI is useful for reading logs and dangerous when it guesses.</b> Paste a trimmed CloudTrail event (with account ids and IPs scrubbed) and ask "explain what happened and what to check next"; assistants are good at explaining <code>userIdentity</code> chains and writing Athena queries. Always run the query yourself and check the time zone and region: an invented column name or a missing partition filter gives either an error or an expensive scan.</p>
      <p>🤖 <b>New events to watch.</b> AI features add new audit needs: log which principal called a model endpoint, which documents a retrieval system returned, and what tool calls an agent made. Alert on unusual spikes in model invocations (cost abuse after a key leak looks like a GPU-mining incident for tokens). Never send raw production logs containing customer data or secrets to an outside AI service; scrub or use an approved, private deployment.</p>`,
    problems: [P({
      t: 'Alert when anyone blinds the audit trail',
      l: 'Medium', tags: ['CloudTrail', 'EventBridge', 'GuardDuty', 'detection'], co: ['AWS', 'Datadog'],
      s: `<p>Compliance wants a guarantee that nobody can silently turn off logging. Design the detective and preventive controls: (1) an <b>EventBridge rule pattern</b> that matches the API calls that disable CloudTrail, GuardDuty and Config and sends them to an alerting target, (2) the <b>preventive SCP</b> statement, (3) the setting that proves log files were not edited afterwards, and (4) where the logs should live so an account admin cannot erase them. Explain which of the four still works if an attacker already has admin in one account.</p>`,
      ex: `<p>Event: <code>StopLogging</code> by <code>alice</code> in the dev account &rarr; the SCP returns <span class="c-r">AccessDenied</span> (preventive), and the failed attempt is itself recorded in CloudTrail; the EventBridge rule fires the alert (detective) even for the denied call, because denied calls are logged with <code>errorCode</code>. Logs sit in a separate archive account with Object Lock, so even a compromised dev admin cannot delete history.</p>`,
      bw: `<p>Rely on one trail in the same account, no validation, no alert, and admin users who can edit anything. An attacker does the damage, calls <code>StopLogging</code> and deletes the bucket; the incident review cannot say what happened. The team discovers weeks later, with nothing to investigate.</p>`,
      q: ['Which control still helps after an attacker gets admin in a member account?', ['An SCP denying StopLogging plus logs delivered to a separate archive account with Object Lock', 'A trail stored in the same account with default settings', 'An IAM policy attached to the admin user itself', 'A comment in the runbook asking admins not to stop logging'], 0, 'SCPs and a separate log-archive account are outside the member account admin\'s control. An IAM policy on the same admin can be changed by that admin, and a runbook note prevents nothing.'],
      h: ['Hint 1: the events to match are StopLogging, DeleteTrail, UpdateTrail, DeleteDetector and StopConfigurationRecorder.', 'Hint 2: preventive control = SCP deny on those actions at the OU level; detective = EventBridge rule; evidence = log file validation and a log-archive account with Object Lock.', 'Hint 3: say which control survives compromise of one account: the ones that live in the management or archive account.'],
      a: `<p>Use an organization trail created from the management account with log file validation, delivered to an S3 bucket in a log-archive account with Object Lock and a bucket policy that only CloudTrail may write. Attach an SCP that denies the disabling actions for every member account. Add the EventBridge rule so any attempt (even a denied one) pages the on-call channel. After an account-admin compromise the SCP, the archive account and the validation digests still hold because the attacker cannot change them from the member account.</p>`,
      code: JS(`{
  "source": ["aws.cloudtrail"],
  "detail-type": ["AWS API Call via CloudTrail"],
  "detail": {
    "eventSource": ["cloudtrail.amazonaws.com", "guardduty.amazonaws.com", "config.amazonaws.com"],
    "eventName": ["StopLogging", "DeleteTrail", "UpdateTrail", "DeleteDetector", "StopConfigurationRecorder"]
  }
}`, 'EventBridge pattern (the SCP is in the IAM topic)'),
      cx: `<p>Cost is small: EventBridge rules for management events are free; the archive bucket costs normal S3 storage, and an organization trail's first copy of management events is free.</p>`,
      f: ['Why must the alert fire on denied calls too? (A denied attempt is the first sign of a compromised principal probing for weak spots.)', 'How would you test the rule safely? (In a sandbox account call StopLogging on a lab trail, or send a test event with put-events.)']
    })]
  });

  // ───────────────────────── Topic 8: compliance basics and incident response for a leaked key ─────────────────────────
  topics.push({
    title: 'Compliance in Plain Words (CIS, SOC 2, ISO 27001, PCI) and Incident Response for a Leaked Key',
    analogy: `<p>Compliance is the <b>food-hygiene inspection</b>: an outsider with a checklist visits and writes down whether you wash hands, label fridges and keep temperature logs. Passing does not guarantee nobody gets sick, but failing is a warning, and customers trust the sticker. <b>Incident response</b> is the <b>fire drill</b>: when the alarm rings nobody invents the plan; everyone already knows who calls whom, which door to shut first, and where to meet afterwards.</p>`,
    explain: `<p>🟢 <b>Four names you will hear in every interview.</b></p>
      ${H.table(['Name', 'What it is, in plain words', 'Who asks for it', 'How you prove it'], [
        ['<b>CIS Benchmarks</b>', 'free, consensus checklists of secure settings for AWS, Linux, Docker, Kubernetes. Level 1 = sensible baseline; Level 2 = stricter, more effort', 'you, your security team, auditors as a yardstick', 'scanners: Prowler, kube-bench, <code>trivy</code> compliance, Security Hub CIS standard'],
        ['<b>SOC 2</b>', 'an independent auditor\'s report on how <b>you</b> run controls for Security (always) and optionally Availability, Confidentiality, Processing Integrity, Privacy. <b>Type I</b> = controls exist at one date; <b>Type II</b> = controls worked over a period (3 to 12 months)', 'US and global B2B customers, in security questionnaires', 'evidence over time: access reviews, change tickets, logs, training records'],
        ['<b>ISO/IEC 27001</b>', 'an international standard for running an information security management system (ISMS): scope, risk assessment, a Statement of Applicability, Annex A controls, internal audits, management review. A certification body issues a certificate (3 years, yearly surveillance audits)', 'customers worldwide, public sector, regulated industries', 'documented ISMS plus audit evidence'],
        ['<b>PCI DSS</b>', 'the card industry\'s rules for anyone who <b>stores, processes or transmits cardholder data</b> (12 requirement groups: network security, protecting stored data, vulnerability management, access control, logging, testing, policy). Version 4.0.x is current', 'card brands, acquirers, payment processors', 'self-assessment questionnaire (SAQ) or a qualified assessor\'s report, quarterly scans']
      ])}
      <p>🟢 <b>The big idea: controls once, evidence often.</b> Frameworks overlap heavily: MFA, least privilege, encryption, logging, patching, change control and incident response appear in all of them. Build the controls once, label which frameworks each satisfies, and <b>collect evidence automatically</b> (Config conformance packs, Security Hub standards, CloudTrail, pipeline logs, ticket history) instead of screenshots a week before the audit. Everything in this module is evidence: the pipeline gates (topic 1), Vault audit logs (topic 2), IAM reviews (topic 5), segmentation (topic 6), CloudTrail (topic 7).</p>
      <p>🔵 <b>Shrink the scope.</b> The cheapest compliance is having less in scope. For PCI, never touch raw card numbers: use the processor's hosted fields or tokens so your servers only see a token, which can move you to the lightest SAQ. For privacy rules such as GDPR, keep personal data in few places, encrypted, with retention limits. Segmentation (topic 6) is a compliance tool as well as a security tool.</p>
      <p>🔵 <b>Compliance is not security.</b> A company can pass an audit and still be breached: auditors sample, controls are checked at a point or period, and the paperwork can lag the real system. Use frameworks as a floor and a language for customers, then measure real risk with the signals in this module (mean time to fix criticals, number of standing admins, secrets older than 90 days, percentage of services with signed images).</p>
      <p>🔵 <b>Incident response (IR), the NIST view.</b> Four phases: <b>Prepare</b> (roles, contacts, runbooks, logging on, tested backups), <b>Detect and analyse</b> (alerts, scope, severity), <b>Contain, eradicate, recover</b> (stop the bleeding without destroying evidence, remove the attacker, restore service), <b>Post-incident</b> (blameless review, fixes, tracked actions). Roles: an <b>incident commander</b> who decides and communicates, a <b>technical lead</b> who investigates, and a <b>scribe</b> who keeps a timestamped log. Decide communication up front: who tells customers, regulators (many laws require notice in 72 hours for personal-data breaches) and the press.</p>
      <p>🔵 <b>Runbook: a leaked AWS key (assume it was abused).</b> (1) <b>Confirm and scope</b>: which key (id only, never paste the secret), where it leaked, since when. (2) <b>Contain</b>: set the key <code>Inactive</code> (do not delete yet: you want the evidence and the ability to correlate), and revoke active sessions of the user or role with a deny-before-time policy. (3) <b>Investigate</b>: CloudTrail <code>lookup-events</code> by <code>AccessKeyId</code> across <b>all regions</b>; look for new IAM users, roles, access keys, EC2/GPU instances, Lambda functions, SES sending, S3 reads, changed security groups. (4) <b>Eradicate</b>: remove what the attacker created, rotate every secret the key could read, and check persistence (new keys, trust-policy changes, backdoor roles). (5) <b>Recover</b>: issue the replacement through a safe path (role, OIDC, Vault). (6) <b>Clean the repository</b>: removing the key from history (<code>git filter-repo</code>) is hygiene, <b>not</b> remediation, because forks and clones keep it. (7) <b>Post-incident</b>: add the missing gate (pre-commit scan, push protection, topic 1), shrink the key's permissions, and write the blameless report with owners and dates.</p>`,
    clues: ['"what is SOC 2 Type II?" → an auditor\'s opinion that controls <b>operated over a period</b>, not just existed on one day', '"we process credit cards" → <b>PCI DSS</b>; reduce scope with tokenization / hosted fields', '"a key was pushed to GitHub, what do you do?" → <b>deactivate, scope via CloudTrail across regions, remove attacker artifacts, rotate, then clean history</b>', '"how do you pass audits without panic?" → <b>automated, continuous evidence</b> from the same controls', '"incident roles" → <b>commander, technical lead, scribe</b>, plus a pre-agreed communications plan']
    ,
    code: [
      SH(R`# Leaked-key runbook (AWS). Replace KEY_ID with the exposed access key ID (the ID is not the secret, but never paste the secret anywhere).
# The documentation example key is AKIAIOSFODNN7EXAMPLE. Run these in a sandbox account to practise; nothing here deletes evidence.
KEY_ID=AKIAIOSFODNN7EXAMPLE
USER_NAME=ci-bot

# 1) CONTAIN: make the key unusable now, but keep it for the investigation.
aws iam update-access-key --user-name "$USER_NAME" --access-key-id "$KEY_ID" --status Inactive

# 2) CONTAIN: kill any temporary sessions already minted from that user (deny everything issued before now).
NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)
cat > revoke.json <<JSON
{"Version":"2012-10-17","Statement":[{"Effect":"Deny","Action":"*","Resource":"*",
 "Condition":{"DateLessThan":{"aws:TokenIssueTime":"$NOW"}}}]}
JSON
aws iam put-user-policy --user-name "$USER_NAME" --policy-name RevokeOldSessions --policy-document file://revoke.json

# 3) SCOPE: everything this key did, in EVERY region (CloudTrail Event history is per region; 90 days).
for R in $(aws ec2 describe-regions --query 'Regions[].RegionName' --output text); do
  echo "== $R"
  aws cloudtrail lookup-events --region "$R" \
      --lookup-attributes AttributeKey=AccessKeyId,AttributeValue="$KEY_ID" \
      --query 'Events[].[EventTime,EventName,EventSource]' --output text | head -n 20
done

# 4) HUNT for attacker leftovers: new users, keys and roles; instances nobody launched.
aws iam list-users --query 'Users[].[UserName,CreateDate]' --output table     # any user created after the leak time is suspect
aws iam get-credential-report >/dev/null 2>&1 || aws iam generate-credential-report
aws ec2 describe-instances --region us-east-1 --filters Name=instance-state-name,Values=running \
    --query 'Reservations[].Instances[].[InstanceId,InstanceType,LaunchTime]' --output table

# 5) RECOVER: create the replacement as a role/OIDC (no new long-lived key), then delete the old key and the revoke policy later.
aws iam delete-access-key --user-name "$USER_NAME" --access-key-id "$KEY_ID"     # only after evidence is saved`, 'Leaked-key runbook (practise in a sandbox)'),
      SH(R`# Free compliance evidence you can run today.
prowler aws --compliance cis_2.0_aws --output-modes html     # CIS AWS Foundations check of your account (read-only)
docker run --rm --pid=host -v /etc:/etc:ro -v /var:/var:ro aquasec/kube-bench:latest   # CIS Kubernetes node checks
trivy k8s --compliance=k8s-cis-1.23 cluster --report summary                        # CIS Kubernetes via trivy
# Optional AWS (billed): Security Hub with the CIS standard shows the same as a score over time
# aws securityhub batch-enable-standards --standards-subscription-requests StandardsArn=arn:aws:securityhub:eu-west-1::standards/cis-aws-foundations-benchmark/v/1.4.0`, 'CIS checks with free tools'),
      SH(R`# History cleanup is hygiene, not remediation (forks, clones and caches keep the old commits). Do it AFTER the key is dead.
pip install git-filter-repo
git filter-repo --replace-text expressions.txt     # expressions.txt holds lines like:  regex:AKIA[0-9A-Z]{16}==>REMOVED
git push --force --all && git push --force --tags
# Ask GitHub support to purge cached views if the repo was public, and tell collaborators to re-clone.`, 'Removing the key from Git history')
    ],
    codeTitle: ['Leaked-key runbook', 'CIS checks', 'History cleanup'],
    viz: [{
      title: 'First hour of a leaked-secret incident',
      input: 'aws',
      inputLabel: 'type the secret kind: aws, github or database',
      gen: function (input) {
        var k = String(input || '').trim().toLowerCase();
        var plans = {
          aws: [['Confirm', 'Which key id, where was it exposed, since when?', 'open the ticket, name a commander'], ['Contain', 'Set key Inactive; deny sessions issued before now', 'key can no longer sign requests'], ['Scope', 'CloudTrail lookup by AccessKeyId in all regions', 'list of every action it took'], ['Hunt', 'New users/keys/roles, instances, Lambdas, SES, S3 reads', 'attacker artifacts found'], ['Eradicate', 'Delete artifacts, rotate secrets the key could read', 'no persistence left'], ['Recover', 'Role/OIDC replaces the key; delete old key', 'service restored safely'], ['Learn', 'Add push protection and pre-commit gate; blameless review', 'actions with owners and dates']],
          github: [['Confirm', 'Which token, which scopes, which repos?', 'ticket opened'], ['Contain', 'Revoke the token in GitHub settings', 'token dead immediately'], ['Scope', 'GitHub audit log by token and actor; check recent pushes, new deploy keys, webhooks, Actions secrets', 'what it touched'], ['Hunt', 'Look for added workflows, collaborators, OAuth apps', 'persistence found'], ['Eradicate', 'Revert malicious commits, rotate secrets reachable from Actions', 'repo trusted again'], ['Recover', 'Issue a fine-grained, short-lived replacement or GitHub App', 'least privilege restored'], ['Learn', 'Enable secret scanning push protection, org-wide', 'actions logged']],
          database: [['Confirm', 'Which user, which host, how exposed (log, dump, repo)?', 'ticket opened'], ['Contain', 'Rotate the password or revoke the Vault lease prefix', 'old credential rejected'], ['Scope', 'Database audit log / connection log for that user', 'queries and source IPs'], ['Hunt', 'Look for new users, grants, exports, odd large reads', 'data touched is known'], ['Eradicate', 'Drop rogue users, patch the leak source (log scrubbing, env dump)', 'cause removed'], ['Recover', 'Switch the app to dynamic credentials with short TTL', 'leak now worthless within an hour'], ['Learn', 'Assess breach-notification duty if personal data was read', 'legal and customers informed']]
        };
        if (!plans[k]) throw new Error('Type one of: aws, github, database');
        var plan = plans[k], frames = [], rows = [];
        function snap(msg, hl) { frames.push({ narr: msg, parts: [{ type: 'table', label: 'incident checklist: leaked ' + k + ' secret', columns: ['phase', 'action', 'result'], rows: rows.map(function (r) { return r.slice(); }), hl: hl || {} }] }); }
        snap('A leaked ' + k + ' secret is a <b>fire, not a typo</b>. Assume it was copied the moment it became visible. The order below matters: stop the damage first, understand it second, clean up third.', {});
        plan.forEach(function (p, i) {
          rows.push(p);
          var h = {}; h[i] = i < 2 ? 'bad' : (i === plan.length - 1 ? 'sel' : 'cur');
          snap('<b>' + p[0] + '.</b> ' + p[1] + '. ' + (i === 1 ? 'Disable instead of delete, so evidence stays and you can still correlate log lines.' : (i === 2 ? 'Do not trust a single region or a single log; the attacker chooses where to act.' : (i === 5 ? 'Do not replace the secret with another long-lived secret in the same place.' : ''))), h);
        });
        snap('Done when: the credential is dead, the scope is known, attacker artifacts are gone, the replacement is short-lived, and the review has dated actions. Rewriting Git history without those steps only hides the evidence.', {});
        return pad4(frames, 'Contain first, investigate second, clean up last.');
      }
    }],
    examples: [
      { title: 'Situation: an AWS key pushed to a public repo and abused within minutes', html: `<p>Timeline from a typical write-up: 14:00 commit with a key; 14:03 bots scrape it; 14:06 dozens of GPU instances launch in many regions; 17:30 the billing alarm fires; next morning a bill of tens of thousands of dollars. What good looked like: push protection blocks the commit (14:00, nothing leaks), or GuardDuty flags the key used from an outside address within minutes, EventBridge disables it automatically, and the runbook above scopes the damage with CloudTrail in all regions. AWS support often agrees to review charges for first-time compromised-credential cases if you act fast and show remediation.</p>` },
      { title: 'Situation: the SOC 2 Type II evidence scramble', html: `<p>An auditor asks for "all production access reviews and change approvals from April to September". Team A screenshots the console for a week. Team B already has: the SSO group membership export each quarter (access review), pull requests with required reviewers and green gates (change approval), the CloudTrail organization trail (logging), the Vault audit log (secret access) and the vulnerability ticket SLA report. Same controls, same year; team B spends one afternoon. Lesson: automate evidence at the time the work is done.</p>` },
      { title: 'Situation: cutting PCI scope with tokenization', html: `<p>A shop stores full card numbers in its orders database, so the database, the app servers, backups, logs, laptops of every developer who can query it and the network around them are in PCI scope. After switching to the payment processor's hosted card form, the shop only receives a token and the last four digits. Most systems drop out of scope, the questionnaire shrinks from hundreds of controls to a few dozen, and a breach of the shop would no longer expose card numbers. Compliance by design beats compliance by effort.</p>` }
    ],
    deepDive: `<p>🟣 <b>Evidence quality.</b> Auditors want population and sampling: "show all changes, then I pick 25". Make sure systems can export complete lists with timestamps and actors. Log retention should meet the longest requirement that applies (PCI asks for one year with three months immediately available); store logs immutably (topic 7). Access reviews must be performed by someone other than the person being reviewed, and recorded.</p>
      <p>🟣 <b>Shared responsibility.</b> AWS holds ISO 27001, SOC 1/2/3 and PCI Level 1 attestations for its infrastructure (download them from AWS Artifact), but you are responsible for what you build <i>on</i> it: your IAM, your configurations, your code. An auditor will ask for both: the provider's report and your own controls. Inheriting the provider's controls is real, but the customer-side list is long.</p>
      <p>🟣 <b>Incident response maturity.</b> Run a tabletop exercise twice a year: a facilitator reads a scenario ("a key was found in a public repo at 02:00"), the team walks through the runbook, and notes gaps (missing phone numbers, no access to CloudTrail from the incident laptop, nobody authorised to turn off a production service). Record <b>MTTD</b> (time to detect) and <b>MTTR</b> (time to restore) and track them. Keep a break-glass account and an out-of-band chat channel in case the usual tools are the thing that is compromised.</p>
      <p>🟣 <b>Blameless review.</b> The question is "what in our system let this happen and how do we make the safe path the easy path", not "who did it". Typical actions from a leaked key: pre-commit hook in the template repo, org-wide push protection, key replaced by OIDC, anomaly alarm on instance launches in unused regions, SCP limiting regions, and a canary token (a fake key that alerts when used) planted in a few places.</p>`,
    aiEra: `<p>🤖 <b>Do not paste the leaked secret, the full log lines with customer data or an unredacted CloudTrail export into a public AI tool.</b> Redact first; use an approved internal deployment when you must analyse raw data. AI helps with the parts around the incident: drafting the timeline from your notes, summarising CloudTrail events you pasted in (redacted), proposing the post-incident action list, and writing the customer message for review by legal.</p>
      <p>🤖 <b>AI as an audit helper, not an auditor.</b> It can map your controls to framework clauses, draft policies and write evidence-collection scripts. It also invents clause numbers and overstates coverage. A human who knows the system must confirm every claim, and your auditor must still see real evidence. Expect questions from customers about how you govern AI use (data handling, model providers, logging), and write that policy before you are asked.</p>`,
    problems: [P({
      t: 'Write the leaked-key response runbook',
      l: 'Hard', tags: ['incident response', 'AWS', 'CloudTrail', 'runbook'], co: ['Amazon', 'Datadog'],
      s: `<p>At 09:10 GitHub secret scanning emails you: the AWS access key <code>AKIAIOSFODNN7EXAMPLE</code> (the documentation example, standing in for a real id) belonging to IAM user <code>ci-bot</code> was committed to a public repository at 08:42. Write the runbook you would follow, in order, as commands plus one line each on why: containment, scoping across regions, hunting for persistence, recovery with no new long-lived key, and what you change so it cannot happen again. State what you do <b>not</b> do first, and why cleaning the Git history is not remediation.</p>`,
      ex: `<p>Expected shape: <span class="c-r">09:11 key set Inactive, old sessions denied</span> &rarr; <span class="c-b">09:20 CloudTrail by AccessKeyId in every region shows RunInstances (GPU) in us-east-2 and CreateUser "support-tmp"</span> &rarr; <span class="c-y">09:40 instances terminated, user and its keys deleted, trust policies diffed</span> &rarr; <span class="c-g">10:30 ci-bot replaced by a GitHub OIDC role; push protection enabled org-wide; review scheduled</span>.</p>`,
      bw: `<p>Delete the commit and force-push, tell nobody, rotate the key "when someone has time". The key stays valid and is already copied; no one checks CloudTrail, so a backdoor user created at 08:50 survives; there is no record to learn from. Cleaning history first also destroys the context you need to scope the exposure.</p>`,
      q: ['What is the correct order for a leaked cloud access key?', ['Deactivate the key, scope the activity in all regions, remove attacker artifacts, replace with short-lived access, then clean history and review', 'Rewrite Git history, then think about the key', 'Delete the key, delete CloudTrail logs, ignore the rest', 'Wait for the bill to see whether it was abused'], 0, 'Containment comes first because the key is valid until revoked. Then scope with CloudTrail in every region, remove persistence, replace the credential with a safer pattern, and finally clean history and learn.'],
      h: ['Hint 1: first action is containment of the credential, not investigation of the repository.', 'Hint 2: CloudTrail Event history is per region; loop over all regions and search by AccessKeyId; look for IAM, EC2, Lambda and SES changes.', 'Hint 3: finish with prevention: push protection, pre-commit gitleaks, OIDC instead of long-lived keys, a regional SCP, and a dated blameless review.'],
      a: `<p>Disable the key and revoke older sessions, assign roles (commander and scribe), query CloudTrail by key id in all regions, list new IAM entities and running resources, delete what the attacker made and diff trust policies, rotate secrets the key could read, replace the key with an OIDC role, only then purge history, and record actions with owners. The prevention items map to the gates of topic 1 and the IAM and SCP controls of topic 5.</p>`,
      code: SH(R`KEY_ID=AKIAIOSFODNN7EXAMPLE
USER_NAME=ci-bot
aws iam update-access-key --user-name "$USER_NAME" --access-key-id "$KEY_ID" --status Inactive       # 1 contain
for R in $(aws ec2 describe-regions --query 'Regions[].RegionName' --output text); do                  # 2 scope, every region
  aws cloudtrail lookup-events --region "$R" --lookup-attributes AttributeKey=AccessKeyId,AttributeValue="$KEY_ID" \
      --query 'Events[].[EventTime,EventName]' --output text
done
aws iam list-users --query 'Users[].[UserName,CreateDate]' --output table                              # 3 hunt: unknown users
aws iam list-access-keys --user-name "$USER_NAME"                                                      # 3 hunt: extra keys on the same user
# 4 recover: switch the pipeline to an OIDC role, then remove the old key:
aws iam delete-access-key --user-name "$USER_NAME" --access-key-id "$KEY_ID"`, 'Runbook commands'),
      cx: `<p>Time matters more than complexity: the first containment command takes seconds; the scope loop takes minutes; the full review takes days.</p>`,
      f: ['What if the key belongs to a role session and not an IAM user? (Use the deny-before-TokenIssueTime policy on the role, since you cannot deactivate session credentials.)', 'When do you notify customers or regulators? (When the investigation shows personal or customer data was accessed; check local rules, often 72 hours from awareness, and involve legal early.)']
    })]
  });

  // ───────────────────────── Practice problems (Easy -> Medium -> Hard) ─────────────────────────
  practice.push(P({
    t: 'Redact secrets from a log line',
    l: 'Easy', tags: ['logging', 'secrets', 'regex', 'python'], co: ['Datadog', 'Sentry'],
    s: PYC + `<p>Crash reports and logs are where secrets leak. Write <code>redact(line)</code>. Step 1: replace every AWS access key id (the text <code>AKIA</code> followed by exactly 16 characters from <code>A-Z</code> and <code>0-9</code>) with <code>[REDACTED_AWS_KEY]</code>. Step 2: for each occurrence of <code>password</code>, <code>passwd</code>, <code>secret</code>, <code>token</code> or <code>api_key</code> (any letter case, no word boundary needed) followed by <code>=</code> and one or more non-space characters, keep the name and the equals sign and replace the value with <code>[REDACTED]</code>. Do step 1 first. Return the new line.</p>`,
    ex: `<p><code>redact("user=bob password=hunter2 ok")</code> &rarr; <span class="c-g">"user=bob password=[REDACTED] ok"</span>. <code>redact("AKIAIOSFODNN7EXAMPLE used")</code> &rarr; <span class="c-g">"[REDACTED_AWS_KEY] used"</span>. A line with <code>password= x</code> has no value directly after the equals sign, so it is unchanged.</p>`,
    bw: `<p>Rely on developers to "never log secrets". They will: a debug line prints the whole config object, an HTTP client logs request headers, a crash handler dumps the environment. One missing scrub and the secret sits in the log index for a year, readable by everyone with log access.</p>`,
    q: ['Why scrub in the logging layer as well as avoiding secrets in code?', ['Because mistakes happen; a last-line filter limits damage when a secret reaches a log by accident', 'Because logs are encrypted anyway', 'Because scrubbing makes secrets rotate', 'Because it replaces the need for a secrets manager'], 0, 'Redaction is defence in depth. It does not replace correct handling, but it catches the accidental case before the secret is stored and shared.'],
    h: ['Hint 1: Python\'s <code>re.sub</code> does the replacement; compile the key pattern as <code>AKIA[0-9A-Z]{16}</code>.', 'Hint 2: for the key=value pattern capture the name and equals sign in a group and use <code>\\1[REDACTED]</code> as the replacement.', 'Hint 3: use <code>re.IGNORECASE</code> for the names, and <code>\\S+</code> for the value so an empty value is not matched.'],
    a: `<p>Two regular expression substitutions in a fixed order. The first removes key ids anywhere in the line, the second blanks values of sensitive names. Because the first step runs first, a line like <code>api_key=AKIA...</code> ends as <code>api_key=[REDACTED]</code>. Real redaction layers also use structured logging with allow-listed fields.</p>`,
    code: PY(`import re

KEY = re.compile(r"AKIA[0-9A-Z]{16}")
KV = re.compile(r"((?:password|passwd|secret|token|api_key)=)\\S+", re.IGNORECASE)

def redact(line):
    line = KEY.sub("[REDACTED_AWS_KEY]", line)     # step 1: key ids anywhere
    return KV.sub(r"\\1[REDACTED]", line)            # step 2: keep the name, hide the value`),
    cx: `<p>O(n) time in the line length for each of the two passes.</p>`,
    f: ['What would you add for JSON logs? (Redact by field name in the logger before serialising, not by regex afterwards.)', 'Why can regexes never be the only control? (Unknown formats and encoded secrets slip through; prevent secrets reaching logs in the first place.)'],
    tests: { sig: 'string -> string', fn: 'redact', cases: [
      [['user=bob password=hunter2 ok'], 'user=bob password=[REDACTED] ok'],
      [['AKIAIOSFODNN7EXAMPLE used'], '[REDACTED_AWS_KEY] used'],
      [['TOKEN=abc123 secret=xyz'], 'TOKEN=[REDACTED] secret=[REDACTED]'],
      [['nothing here'], 'nothing here'],
      [['api_key=AKIAIOSFODNN7EXAMPLE'], 'api_key=[REDACTED]'],
      [['mypassword=abc'], 'mypassword=[REDACTED]'],
      [['password= x'], 'password= x'],
      [['AKIAIOSFODNN7EXAMPLE and AKIAABCDEFGHIJKLMNOP'], '[REDACTED_AWS_KEY] and [REDACTED_AWS_KEY]'],
      [['AKIA123 short'], 'AKIA123 short'],
      [['Password=Secr3t, retry'], 'Password=[REDACTED] retry']
    ] }
  }));

  practice.push(P({
    t: 'Add a pre-commit secret scan and test it with a fake key',
    l: 'Easy', tags: ['gitleaks', 'pre-commit', 'secrets'], co: ['GitHub', 'GitLab'],
    s: `<p>In a throwaway repository, install a pre-commit hook that runs gitleaks, then prove it works: try to commit a file containing the AWS documentation example key and see the commit refused. Show how to also run the same scan over the whole history in CI, and why <code>--no-verify</code> makes the CI copy necessary.</p>`,
    ex: `<p>Output: <span class="c-r">Finding: aws_access_key = AKIAIOSFODNN7EXAMPLE ... RuleID: aws-access-token</span> and the commit does not happen. After removing the line, <code>git commit</code> succeeds. In CI, <code>gitleaks detect</code> scans every commit and fails the job for the same file even if a laptop skipped the hook.</p>`,
    bw: `<p>Ask everyone to "be careful" and rely on code review. Reviewers read diffs for logic, not for 40-character strings, and a key in the 14th file of a large pull request is easy to miss. It then lives in history forever.</p>`,
    q: ['A developer ran git commit --no-verify. Which control still catches the secret?', ['The CI job that runs gitleaks on the pushed commits', 'The local pre-commit hook', 'The .gitignore file', 'Nothing can catch it'], 0, 'Local hooks are advisory because the developer controls their own machine. The server-side CI scan (and push protection) cannot be skipped by the committer.'],
    h: ['Hint 1: add the gitleaks hook to <code>.pre-commit-config.yaml</code> and run <code>pre-commit install</code> once per clone.', 'Hint 2: use the documentation key <code>AKIAIOSFODNN7EXAMPLE</code> in a test file; never a real key.', 'Hint 3: in CI use <code>fetch-depth: 0</code> so history is scanned, and make the job a required status check.'],
    a: `<p>The hook scans staged changes before the commit is created. The CI job repeats the scan on the server over the full history, which is the copy that cannot be bypassed. GitHub push protection is a third layer that blocks known token formats at push time. Allow-list only with a narrow rule and a reason, never a whole folder.</p>`,
    code: SH(R`pip install pre-commit
cat > .pre-commit-config.yaml <<'YAML'
repos:
  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.21.2
    hooks:
      - id: gitleaks
YAML
pre-commit install

# Prove it works with the AWS documentation example key (not a real credential).
echo 'aws_access_key = AKIAIOSFODNN7EXAMPLE' > test_secret.txt
git add test_secret.txt
git commit -m "should be refused"      # the hook fails the commit and prints the finding
rm test_secret.txt && git reset -q

# The server-side copy (history included):
gitleaks detect --source . --redact --verbose`, 'Hook and proof'),
    cx: `<p>The hook scans only staged changes, so it takes a second or two; the CI history scan grows with repository size.</p>`,
    f: ['How do you handle a false positive in a test fixture? (A path- or rule-scoped allowlist in <code>.gitleaks.toml</code> with a comment and an owner.)', 'What do you do when the scan finds a real old key in history? (Treat it as leaked: rotate it first, then clean history.)']
  }));

  practice.push(P({
    t: 'Fix the public bucket in Terraform',
    l: 'Easy', tags: ['Terraform', 'S3', 'checkov'], co: ['AWS', 'HashiCorp'],
    s: `<p>A pull request contains <code>acl = "public-read"</code> on <code>aws_s3_bucket_acl.reports</code>. Rewrite the resources so the bucket is private with all four Block Public Access settings on and default encryption, and name the free scanner command that would have failed the pull request.</p>`,
    ex: `<p>Before: <span class="c-r">checkov: FAILED CKV_AWS_20 (S3 bucket has an ACL defined which allows public READ access)</span>. After the fix: <span class="c-g">PASSED</span> for the public access block checks, and anonymous <code>curl</code> to an object URL returns 403.</p>`,
    bw: `<p>Fix the symptom in the console: click the bucket public checkbox off after the incident. The next <code>terraform apply</code> puts it back because the code still says public-read, so the exposure returns on the next deploy.</p>`,
    q: ['Why fix the Terraform and not just the console setting?', ['The code is the source of truth; the next apply would restore the public setting', 'Terraform cannot change buckets', 'The console is always read-only', 'Block Public Access only works from the console'], 0, 'Drift is reverted by the next apply. The durable fix is in code, plus a scanner gate so the pattern cannot return.'],
    h: ['Hint 1: remove the public ACL resource, or set the ACL private.', 'Hint 2: add <code>aws_s3_bucket_public_access_block</code> with all four flags true.', 'Hint 3: run <code>checkov -d infra/</code> (or <code>trivy config infra/</code>) in the pull request pipeline.'],
    a: `<p>The public ACL is deleted, a public access block with all four flags is attached, and server-side encryption is enabled by default. The scanner command runs in the pipeline as a required check. An account-level Block Public Access setting adds a second layer that stops a future mistake in any bucket.</p>`,
    code: TX(R`resource "aws_s3_bucket" "reports" {
  bucket = "acme-reports-prod"
}
resource "aws_s3_bucket_public_access_block" "reports" {
  bucket                  = aws_s3_bucket.reports.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
resource "aws_s3_bucket_server_side_encryption_configuration" "reports" {
  bucket = aws_s3_bucket.reports.id
  rule {
    apply_server_side_encryption_by_default { sse_algorithm = "aws:kms" }
  }
}
# CI gate:  checkov -d infra/ --quiet --compact`, 'Private bucket (HCL)'),
    cx: `<p>No runtime cost; the scan adds seconds to the pipeline.</p>`,
    f: ['How do you share the report with a partner? (A pre-signed URL with a short expiry, or a role in the partner account.)', 'What is the account-level control? (S3 Block Public Access at the account level, enforced by an SCP so nobody can switch it off.)']
  }));

  practice.push(P({
    t: 'Write a read-only Vault policy for one path',
    l: 'Easy', tags: ['Vault', 'policy', 'KV v2'], co: ['HashiCorp'],
    s: `<p>Service <code>reports</code> must read the secret at <code>secret/reports/smtp</code> (KV v2) and nothing else. Write the policy in HCL, name the CLI command that proves a token made from it can read that path and cannot read <code>secret/payments/db</code>.</p>`,
    ex: `<p><code>vault token capabilities secret/data/reports/smtp</code> &rarr; <span class="c-g">read</span>. <code>vault token capabilities secret/data/payments/db</code> &rarr; <span class="c-r">deny</span>. Using the path <code>secret/reports/smtp</code> in the policy would give <span class="c-r">403</span> in practice.</p>`,
    bw: `<p>Give the service the built-in <code>default</code> plus a policy on <code>secret/*</code> with every capability "for simplicity". The service can now read and overwrite every secret in the mount, so one SSRF in the reports app becomes a full secrets breach.</p>`,
    q: ['The CLI path is secret/reports/smtp on KV v2. What path goes in the policy?', ['secret/data/reports/smtp', 'secret/reports/smtp', 'secret/metadata/reports/smtp only', 'sys/secret/reports'], 0, 'KV v2 inserts data/ for values. The policy is written against the API path, so it must include data/.'],
    h: ['Hint 1: KV v2 value paths look like <code>secret/data/&lt;name&gt;</code>.', 'Hint 2: the only capability needed by a consumer is <code>read</code>.', 'Hint 3: test with a token created with just this policy: <code>vault token create -policy=reports-read</code>, then <code>vault token capabilities</code>.'],
    a: `<p>One <code>path</code> block, exact path, read only. Everything else is denied by default. Create a test token from the policy and check capabilities on an allowed and a denied path so the policy is proven, not assumed.</p>`,
    code: TX(R`path "secret/data/reports/smtp" {
  capabilities = ["read"]
}
# test (dev-mode lab, throwaway tokens only):
#   vault policy write reports-read reports-read.hcl
#   vault token create -policy=reports-read -field=token   (use that value as VAULT_TOKEN in a new shell)
#   vault token capabilities secret/data/reports/smtp
#   vault token capabilities secret/data/payments/db`, 'reports-read.hcl'),
    cx: `<p>Policy checks are constant time per request.</p>`,
    f: ['How would the service list sibling names? (Add <code>list</code> on the metadata path, not on the data path.)', 'How do you stop a later broad policy from granting access? (An explicit <code>deny</code> block on that path in a policy attached to the same token.)']
  }));

  practice.push(P({
    t: 'Detect secrets with a Shannon entropy scanner',
    l: 'Medium', tags: ['secrets', 'entropy', 'detection', 'python'], co: ['GitHub', 'GitGuardian'],
    s: PYC + `<p>Write <code>find_secrets(lines, threshold)</code>. Split each line into tokens: maximal runs of characters that are not whitespace, <code>=</code>, <code>:</code>, <code>"</code>, <code>'</code> or <code>,</code>. A token is a <b>suspect</b> if (a) it matches exactly <code>AKIA</code> followed by 16 characters of <code>A-Z0-9</code>, or (b) it is at least 20 characters long and its Shannon entropy in bits per character, <code>-sum(p * log2(p))</code> over character frequencies, is at least <code>threshold</code>. Return <code>"CLEAN"</code> or <code>"FOUND:"</code> plus the 1-based numbers of the lines that contain a suspect, ascending, comma separated, without duplicates.</p>`,
    ex: `<p><code>find_secrets(['x = "q8Zr3kLp0vXw7TnB2sYd9HjGc4MfA1eU"'], 4.5)</code>: the token has 32 distinct characters so entropy is log<sub>2</sub>32 = 5.0, which is &ge; 4.5 &rarr; <span class="c-r">"FOUND:1"</span>. <code>this_is_a_long_variable_name_here</code> has entropy about 3.64 &rarr; <span class="c-g">"CLEAN"</span>.</p>`,
    bw: `<p>Grep for the word "password". Real secrets are random-looking strings with names like <code>x</code> or <code>cfg</code>, so the grep finds only the harmless variable names and misses the key. Flagging every long string is no better: it drowns the team in false positives.</p>`,
    q: ['What does a high Shannon entropy say about a string?', ['Its characters look random, which is typical of generated keys', 'It is certainly a password', 'It is encrypted', 'It is shorter than 20 characters'], 0, 'High entropy means characters are spread evenly, like random keys. It is a hint, not proof: UUIDs, hashes and the alphabet itself also score high, which is why scanners combine entropy with patterns and allowlists.'],
    h: ['Hint 1: split each line with <code>re.split</code> on runs of whitespace, equals, colon, both quote characters and commas, and ignore empty tokens.', 'Hint 2: entropy = sum over distinct characters of <code>-(c/n) * log2(c/n)</code>, using <code>collections.Counter</code>.', 'Hint 3: check the AWS key pattern with <code>re.fullmatch</code> first; otherwise require length &ge; 20 and entropy &ge; threshold; collect line numbers in a set and sort.'],
    a: `<p>For each line, tokenise and test every token with the two rules. Remember the line number if any token hits. Entropy needs only character counts, so it is O(length). Real tools (gitleaks, trufflehog, detect-secrets) add many provider-specific patterns and verify candidates against the provider API; entropy alone catches generic secrets but also flags hashes and the alphabet.</p>`,
    code: PY(`import math
import re
from collections import Counter

AWS = re.compile(r"AKIA[0-9A-Z]{16}")
SPLIT = re.compile(r"""[\\s=:"',]+""")

def entropy(text):
    n = len(text)
    return -sum((c / n) * math.log2(c / n) for c in Counter(text).values())

def find_secrets(lines, threshold):
    hits = set()
    for number, line in enumerate(lines, start=1):
        for token in SPLIT.split(line):
            if not token:
                continue
            if AWS.fullmatch(token) or (len(token) >= 20 and entropy(token) >= threshold):
                hits.add(number)
                break                      # one suspect is enough for this line
    if not hits:
        return "CLEAN"
    return "FOUND:" + ",".join(str(i) for i in sorted(hits))`),
    cx: `<p>O(total characters) time, O(alphabet) space per token.</p>`,
    f: ['How do you cut false positives? (Allow-list known hashes and test fixtures, verify candidates against the provider, and require pattern plus entropy for generic rules.)', 'Why is a threshold around 4.5 bits common for base64-like text? (Random base64 tops out at 6 bits per character; English words sit near 4 or below.)'],
    tests: { sig: 'string[] double -> string', fn: 'findSecrets', names: { python: 'find_secrets' }, cases: [
      [['x = "q8Zr3kLp0vXw7TnB2sYd9HjGc4MfA1eU"'], 4.5, 'FOUND:1'],
      [['name = this_is_a_long_variable_name_here'], 4.5, 'CLEAN'],
      [['key: AKIAIOSFODNN7EXAMPLE'], 4.5, 'FOUND:1'],
      [['a', 'aws_secret_access_key = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'], 4.5, 'FOUND:2'],
      [['abcdefghijklmnopqrstuvwxyz'], 4.5, 'FOUND:1'],
      [['aaaaaaaaaaaaaaaaaaaaaaaa'], 4.5, 'CLEAN'],
      [[], 4.5, 'CLEAN'],
      [['ok', 'token=q8Zr3kLp0vXw7TnB2sYd9HjGc4MfA1eU', '', 'AKIAIOSFODNN7EXAMPLE'], 4.5, 'FOUND:2,4'],
      [['ThisIsAReallyLongCamelCaseIdentifierName'], 4.0, 'FOUND:1'],
      [['ThisIsAReallyLongCamelCaseIdentifierName'], 4.5, 'CLEAN'],
      [['q8Zr3kLp0vXw7TnB2sY'], 4.0, 'CLEAN']
    ].map(function (c) { return [[c[0], c[1]], c[2]]; }) }
  }));

  practice.push(P({
    t: 'Dependabot and CodeQL for a repository',
    l: 'Medium', tags: ['Dependabot', 'CodeQL', 'SCA', 'SAST'], co: ['GitHub'],
    s: `<p>For a public GitHub repository with a Python service, a Dockerfile and GitHub Actions workflows, write <code>.github/dependabot.yml</code> (weekly, grouped minor/patch updates for pip, plus docker and github-actions) and a CodeQL workflow that runs on pull requests, on pushes to main and weekly. Give each job only the permissions it needs.</p>`,
    ex: `<p>Result: Monday morning one grouped PR "bump python minor/patch" and one for the base image; the Security tab shows CodeQL alerts; a pull request that adds an injectable SQL string gets a CodeQL annotation on the exact line.</p>`,
    bw: `<p>Dependabot with a daily schedule and no groups: forty pull requests a week, nobody reads them, they pile up and real security updates are buried. CodeQL given <code>write-all</code> permissions "to be safe".</p>`,
    q: ['Why group Dependabot updates?', ['To reduce pull request noise so reviewers actually review them', 'Because Dependabot cannot make separate PRs', 'To skip tests', 'To avoid lockfiles'], 0, 'Grouping minor and patch bumps into one weekly PR keeps review effort low, so security updates are not lost in a flood.'],
    h: ['Hint 1: <code>package-ecosystem</code> values are <code>pip</code>, <code>docker</code> and <code>github-actions</code>.', 'Hint 2: CodeQL needs <code>security-events: write</code> on the analyze job only, and <code>contents: read</code>.', 'Hint 3: add a cron trigger so new rules run on code that has not changed.'],
    a: `<p>The Dependabot file lists three ecosystems on a weekly schedule with a group for minor and patch updates. The CodeQL workflow uses the init, autobuild and analyze actions for the python language, triggered on pull_request, push and a weekly schedule, with the narrow permissions the analyze job needs.</p>`,
    code: Y(`# .github/workflows/codeql.yml
name: codeql
on:
  pull_request:
  push:
    branches: [main]
  schedule:
    - cron: '17 4 * * 1'          # Mondays: new rules run on unchanged code
permissions:
  contents: read
jobs:
  analyze:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      security-events: write      # needed to upload results to the Security tab
    steps:
      - uses: actions/checkout@v4
      - uses: github/codeql-action/init@v4
        with:
          languages: python
      - uses: github/codeql-action/analyze@v4
# .github/dependabot.yml is shown in topic 4 (pip grouped, docker, github-actions, weekly).`, 'codeql.yml'),
    cx: `<p>CodeQL on a mid-size Python repository typically takes a few minutes; Dependabot runs on GitHub's side.</p>`,
    f: ['How do you gate on CodeQL? (Make the analyze job a required check and set code-scanning alert severity thresholds in branch protection.)', 'What if CodeQL does not support your language? (Use Semgrep or the language\'s native scanner as the SAST gate.)']
  }));

  practice.push(P({
    t: 'Generate an SBOM and hunt a vulnerable component',
    l: 'Medium', tags: ['SBOM', 'syft', 'grype', 'CycloneDX'], co: ['Anchore', 'Google'],
    s: `<p>Build a small image, create a CycloneDX and an SPDX SBOM with syft, then (1) list every component whose name contains <code>openssl</code> or <code>libssl</code> using <code>jq</code>, (2) scan the SBOM with grype and fail on High, and (3) explain what you would store with the release so the next CVE announcement takes minutes to answer.</p>`,
    ex: `<p>Output: <span class="c-b">libssl3 3.0.11-1</span> from jq; grype reports <span class="c-r">libssl3 CVE-... High, fixed in 3.0.13</span>. Storing <code>sbom.cdx.json</code> next to the image digest lets you grep or scan all releases in one command when a new CVE lands.</p>`,
    bw: `<p>Scan only the final image once, at release time, and throw the result away. When the next CVE is announced you have to pull and re-scan every historical image or ask each team what it uses.</p>`,
    q: ['What is the main advantage of scanning an SBOM instead of the image later?', ['You can answer "are we affected?" for many releases without pulling the images', 'SBOMs are always more accurate', 'It removes the need for patches', 'SBOMs can be edited to hide findings'], 0, 'The SBOM is a small, searchable inventory. New vulnerability data can be matched against it quickly and centrally.'],
    h: ['Hint 1: <code>syft IMAGE -o cyclonedx-json=sbom.cdx.json -o spdx-json=sbom.spdx.json</code> writes both files in one run.', 'Hint 2: with CycloneDX JSON the components are in <code>.components[]</code>; filter with <code>select(.name | test("ssl"))</code>.', 'Hint 3: <code>grype sbom:sbom.cdx.json --fail-on high</code> returns a non-zero exit code for the gate; store the file with the image digest.'],
    a: `<p>Generate once per build, keep the SBOM with the artifact (registry attestation or release asset), query with jq for inventory questions and grype for vulnerability matching, and fail the pipeline on High or worse with fixes available. Keep generator and database versions pinned for reproducible results.</p>`,
    code: SH(R`docker build -t demo-app:1.0 .
syft demo-app:1.0 -o cyclonedx-json=sbom.cdx.json -o spdx-json=sbom.spdx.json
jq -r '.components[] | select(.name | test("openssl|libssl")) | .name + " " + .version' sbom.cdx.json
grype sbom:sbom.cdx.json --fail-on high
# Keep sbom.cdx.json with the image digest (cosign attest --type cyclonedx, or a release asset).`, 'SBOM lab'),
    cx: `<p>SBOM generation is linear in the number of files in the image; scanning an SBOM takes seconds.</p>`,
    f: ['CycloneDX or SPDX? (Either works; pick one your tools and customers accept. CycloneDX is common for security, SPDX for licensing.)', 'What does VEX add? (Statements that a present component is not exploitable here, to cut false positives.)']
  }));

  practice.push(P({
    t: 'Trivy image gate with a waiver that expires',
    l: 'Medium', tags: ['trivy', 'triage', 'waiver', 'containers'], co: ['Aqua', 'Docker'],
    s: `<p>Build a gate that fails the pipeline on fixable High and Critical vulnerabilities in <code>app:ci</code>, supports one documented waiver (<code>CVE-2024-0000</code>, example id) that expires on a fixed date, and still reports everything for visibility. Show the <code>.trivyignore.yaml</code> and the commands, and explain how the waiver cannot become permanent.</p>`,
    ex: `<p>Before the expiry date: the waived CVE is hidden from the gate and the build is green. After the date: <span class="c-r">trivy ignores the waiver and the build fails again</span> until someone re-reviews it or upgrades the package.</p>`,
    bw: `<p>A blanket <code>--exit-code 0</code> "until we have time", or an ignore file with no dates. Six months later nobody remembers why, and the vulnerable library is still in production.</p>`,
    q: ['Why give every waiver an expiry date?', ['So accepted risk gets re-reviewed instead of lasting forever', 'Because trivy requires dates', 'Because CVEs expire on their own', 'To speed up scans'], 0, 'An expiry forces a recurring decision with an owner. Without one, waivers become permanent blind spots.'],
    h: ['Hint 1: <code>trivy image --severity HIGH,CRITICAL --ignore-unfixed --exit-code 1</code> is the gate.', 'Hint 2: <code>.trivyignore.yaml</code> entries support <code>id</code>, <code>statement</code> and <code>expired_at</code>.', 'Hint 3: run a second, non-blocking report (all severities, table format) so the team still sees the full picture.'],
    a: `<p>One blocking command limited to fixable High and Critical findings, one reporting command for everything, and an ignore file whose entry carries a reason and an expiry date. After expiry trivy stops honouring the entry, which turns the waiver into a deadline.</p>`,
    code: SH(R`cat > .trivyignore.yaml <<'YAML'
vulnerabilities:
  - id: CVE-2024-0000                 # example id
    statement: "libfoo is installed but never loaded; owner platform-team; review with the next base image bump"
    expired_at: 2026-12-31
YAML
trivy image --ignorefile .trivyignore.yaml --severity HIGH,CRITICAL --ignore-unfixed --exit-code 1 app:ci   # gate
trivy image --format table app:ci                                                                          # visibility, never blocks`, 'Gate and waiver'),
    cx: `<p>A trivy scan of a typical image takes 10 to 40 seconds with a cached database.</p>`,
    f: ['What if there is no fix available? (Assess reachability and exposure, add a time-boxed waiver, mitigate with network controls, and watch for the fix.)', 'How do you keep the base image fresh? (Weekly rebuild with --pull plus Dependabot for the docker ecosystem.)']
  }));

  practice.push(P({
    t: 'Log in to Vault with AppRole using a wrapped secret_id',
    l: 'Medium', tags: ['Vault', 'AppRole', 'secret zero'], co: ['HashiCorp'],
    s: `<p>In Vault dev mode, create a role <code>demo</code> with policy <code>reports-read</code>, token TTL 15 minutes, and a secret_id that is single-use and expires in 10 minutes. Deliver the secret_id wrapped (60 second wrapping TTL), unwrap it once in a second shell, log in, and read <code>secret/reports/smtp</code>. Show that unwrapping a second time fails and what that tells you.</p>`,
    ex: `<p>First unwrap prints the <span class="c-g">secret_id</span>; login returns a token with <code>token_policies ["default" "reports-read"]</code> and TTL 15m; a second unwrap says <span class="c-r">wrapping token is not valid or does not exist</span>, which means either it was already used (by you) or someone else used it first, and the latter is an alarm.</p>`,
    bw: `<p>Write the secret_id into the deployment config or an env var in the image. It never expires, anyone who can read the repo or inspect the container logs in as the app, and Vault cannot say which copy was used.</p>`,
    q: ['What does a failed second unwrap of a response-wrapping token mean?', ['It was already used, so either your own earlier use or interception', 'Vault is down', 'The role was deleted', 'The TTL was too long'], 0, 'Wrapping tokens are single use. If the legitimate recipient finds it spent, someone else may have used it, which is a signal to investigate.'],
    h: ['Hint 1: <code>vault write -wrap-ttl=60s -f auth/approle/role/demo/secret-id</code> returns a wrapping token, not the value.', 'Hint 2: set <code>secret_id_num_uses=1</code> and <code>secret_id_ttl=10m</code> on the role.', 'Hint 3: unwrap with <code>VAULT_TOKEN=&lt;wrap&gt; vault unwrap</code>, then <code>vault write auth/approle/login</code>.'],
    a: `<p>Create the policy and role with tight TTLs and single use, request a wrapped secret_id from a trusted shell, unwrap in the application shell, log in, read the secret, then try the unwrap again to see the failure. The trusted orchestrator is what solves secret zero here: it is the only holder of permission to mint secret_ids.</p>`,
    code: SH(R`export VAULT_ADDR=http://127.0.0.1:8200 VAULT_TOKEN=dev-only-token     # dev mode lab only
vault kv put secret/reports/smtp user=mailer password=PASTE_FAKE
vault policy write reports-read - <<'HCL'
path "secret/data/reports/smtp" { capabilities = ["read"] }
HCL
vault auth enable approle
vault write auth/approle/role/demo token_policies=reports-read token_ttl=15m secret_id_ttl=10m secret_id_num_uses=1
ROLE_ID=$(vault read -field=role_id auth/approle/role/demo/role-id)
WRAP=$(vault write -wrap-ttl=60s -f -field=wrapping_token auth/approle/role/demo/secret-id)
SECRET_ID=$(VAULT_TOKEN="$WRAP" vault unwrap -field=secret_id)
TOKEN=$(vault write -field=token auth/approle/login role_id="$ROLE_ID" secret_id="$SECRET_ID")
VAULT_TOKEN="$TOKEN" vault kv get secret/reports/smtp
VAULT_TOKEN="$WRAP" vault unwrap || echo "second unwrap failed as expected"`, 'AppRole with wrapping'),
    cx: `<p>Three API calls at deploy time; the app holds a 15 minute token afterwards.</p>`,
    f: ['Why is role_id not treated as secret? (It identifies the role; it is useless without a valid secret_id, which is single use and short-lived.)', 'What replaces this on Kubernetes? (Kubernetes auth: the pod\'s service-account JWT is the credential.)']
  }));

  practice.push(P({
    t: 'Replace a bastion with Session Manager and close port 22',
    l: 'Medium', tags: ['SSM', 'security groups', 'bastion', 'AWS'], co: ['AWS'],
    s: `<p>A bastion host has port 22 open to <code>0.0.0.0/0</code> and shared SSH keys. Describe and show the change to remove inbound SSH completely and keep admin access, with per-user audit. Include the instance role, the Terraform for the security group after the change, and the command to connect.</p>`,
    ex: `<p>Result: security group has <span class="c-g">no ingress</span> rules; <code>aws ssm start-session --target i-0abc...</code> opens a shell after IAM and MFA; the session log in CloudWatch or S3 shows each command; <code>nmap</code> against the public IP finds nothing open.</p>`,
    bw: `<p>Keep the open port but restrict it to "the office IP". Office IPs change, people work remotely, the shared key is copied to laptops, and nobody knows who ran a command on the bastion.</p>`,
    q: ['What does Session Manager remove from the attack surface?', ['The inbound SSH port and shared SSH keys', 'The need for IAM', 'All logging', 'The instance'], 0, 'The agent opens an outbound connection to Systems Manager, so no inbound port is needed, and access is controlled by IAM with session logs.'],
    h: ['Hint 1: attach <code>AmazonSSMManagedInstanceCore</code> to the instance profile.', 'Hint 2: delete the ingress rule from the security group; egress to the SSM endpoints (or VPC endpoints) must still work.', 'Hint 3: enable session logging to S3 or CloudWatch and require MFA in the IAM policy that allows <code>ssm:StartSession</code>.'],
    a: `<p>Give the instance an IAM role with the managed policy for SSM, remove all inbound rules, ensure outbound HTTPS to SSM endpoints (NAT or VPC endpoints), grant people <code>ssm:StartSession</code> on tagged instances, enable session logging, and use <code>aws ssm start-session</code>. Shared keys disappear and each session is tied to an IAM identity.</p>`,
    code: TX(R`resource "aws_security_group" "bastion" {
  name   = "bastion-sg"
  vpc_id = aws_vpc.main.id
  # no ingress blocks: nothing can connect in
  egress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]       # agent talks out to Systems Manager; narrow with VPC endpoints later
  }
}
resource "aws_iam_role_policy_attachment" "ssm" {
  role       = aws_iam_role.bastion.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}
# connect:  aws ssm start-session --target i-0123456789abcdef0`, 'Bastion without port 22 (HCL)'),
    cx: `<p>Session Manager is free; logging costs normal storage.</p>`,
    f: ['How do you copy files or tunnel to a database? (Session Manager port forwarding with <code>AWS-StartPortForwardingSessionToRemoteHost</code>.)', 'How do you restrict who can reach which instance? (IAM conditions on <code>ssm:resourceTag</code>.)']
  }));

  practice.push(P({
    t: 'Write an OPA/Rego gate for a Terraform plan',
    l: 'Hard', tags: ['Rego', 'OPA', 'conftest', 'IaC'], co: ['Styra', 'HashiCorp'],
    s: `<p>Write a Rego policy for <code>conftest test plan.json</code> that fails when a planned <code>aws_security_group</code> has an ingress rule open to <code>0.0.0.0/0</code> on port 22 or 3389 (including ranges that cover them), and when an <code>aws_db_instance</code> has <code>publicly_accessible</code> true. Messages must name the resource address. Explain how you test the policy with one failing and one passing plan.</p>`,
    ex: `<p>Failing plan: <span class="c-r">FAIL - plan.json - aws_security_group.web: SSH/RDP open to the world</span>. Passing plan: <span class="c-g">no violations</span>. Unit test with <code>opa test policy/</code> proves both cases.</p>`,
    bw: `<p>Rely on human review of 800-line plan outputs. The risky line is one among hundreds, and review fatigue means it is approved. Or write a regex over the HCL text, which misses modules, variables and computed values that only show in the plan.</p>`,
    q: ['Why evaluate the plan JSON and not the raw .tf files?', ['The plan has resolved values from variables and modules', 'Plan files are smaller', 'Rego cannot read .tf files at all', 'Plans are encrypted'], 0, 'Terraform plan JSON shows the final configuration after expressions, variables and modules are evaluated, so the rule sees what will be applied.'],
    h: ['Hint 1: iterate <code>input.resource_changes</code> and filter by <code>type</code>.', 'Hint 2: for ingress rules compare <code>from_port &lt;= p</code> and <code>to_port &gt;= p</code> for p in {22, 3389} and check <code>"0.0.0.0/0"</code> in <code>cidr_blocks</code>.', 'Hint 3: write <code>_test.rego</code> files with mock inputs for a pass and a fail and run <code>opa test</code>.'],
    a: `<p>Two <code>deny</code> rules produce readable messages with <code>sprintf</code>. A helper checks whether a rule covers a sensitive port using the range. Unit tests in Rego prove the policy, and CI runs conftest on the plan so unsafe changes never reach apply. Exceptions use a documented annotation with an expiry rather than editing the policy.</p>`,
    code: TX(R`package main

import rego.v1

risky_ports := {22, 3389}

deny contains msg if {
  some rc in input.resource_changes
  rc.type == "aws_security_group"
  some rule in rc.change.after.ingress
  "0.0.0.0/0" in rule.cidr_blocks
  some p in risky_ports
  rule.from_port <= p
  p <= rule.to_port
  msg := sprintf("%s: SSH/RDP open to the world", [rc.address])
}

deny contains msg if {
  some rc in input.resource_changes
  rc.type == "aws_db_instance"
  rc.change.after.publicly_accessible == true
  msg := sprintf("%s: database must not be publicly accessible", [rc.address])
}

# policy_test.rego
# test_ssh_open_denied if { count(deny) == 1 with input as {"resource_changes": [{"address": "aws_security_group.web", "type": "aws_security_group", "change": {"after": {"ingress": [{"from_port": 22, "to_port": 22, "cidr_blocks": ["0.0.0.0/0"]}]}}}]} }`, 'policy/network.rego'),
    cx: `<p>Evaluation is linear in the number of resources and rules; typical plans evaluate in milliseconds.</p>`,
    f: ['How do you allow a justified exception? (A resource tag or a separate allow-list file with owner and expiry that the policy reads.)', 'Where else can Rego run? (Kubernetes admission with Gatekeeper, or an API authorisation layer.)']
  }));

  practice.push(P({
    t: 'Design a permission boundary and SCP for developer self-service',
    l: 'Hard', tags: ['IAM', 'permission boundary', 'SCP', 'least privilege'], co: ['AWS', 'Stripe'],
    s: `<p>Developers in team <code>orders</code> should create their own IAM roles for Lambda and ECS tasks, but never gain more than the team\'s services (S3 on <code>acme-orders-*</code>, DynamoDB table <code>orders</code>, CloudWatch Logs) and never touch IAM boundaries, CloudTrail or unapproved regions. Provide: the permission boundary policy, the developer policy that allows <code>CreateRole</code> only with that boundary, and the SCP. Explain the escalation path you closed with <code>iam:PassRole</code>.</p>`,
    ex: `<p>Developer creates role <code>team-orders-api</code> with the boundary: <span class="c-g">allowed</span>. Creates a role without the boundary: <span class="c-r">AccessDenied</span>. Attaches <code>AdministratorAccess</code> to a bounded role: the attach itself works, but the effective permissions stay inside the boundary. Trying to delete the boundary: <span class="c-r">AccessDenied</span>. Calling <code>cloudtrail:StopLogging</code>: <span class="c-r">SCP deny</span>.</p>`,
    bw: `<p>Give developers <code>iam:*</code> "so they can create roles". The first role they create is <code>AdministratorAccess</code>, because it is the quickest way to unblock a deploy, and the permission model has been bypassed on day one.</p>`,
    q: ['Why must CreateRole be conditioned on the boundary?', ['Otherwise a developer can create a role with more privilege than they hold and assume it', 'Because roles cannot exist without boundaries', 'To speed up IAM', 'Because boundaries grant permissions'], 0, 'Without the condition, role creation is a privilege-escalation path. With it, every self-made role is capped by the boundary policy.'],
    h: ['Hint 1: the boundary lists the maximum: S3 on the team prefix, the DynamoDB table, logs. It grants nothing alone.', 'Hint 2: dev policy: Allow <code>iam:CreateRole</code> with <code>StringEquals iam:PermissionsBoundary</code>, plus Deny on changing or deleting the boundary.', 'Hint 3: restrict <code>iam:PassRole</code> to <code>team-orders-*</code> roles and to the services that need them (<code>iam:PassedToService</code>).'],
    a: `<p>Three pieces. The boundary caps what any team role can ever do. The developer policy lets people create and pass only boundary-bound team roles and denies tampering with the boundary. The SCP (OU level) protects logging and limits regions for everyone. Together a compromised developer can only affect team-orders resources, and cannot hide it.</p>`,
    code: JS(`{
  "Version": "2012-10-17",
  "Statement": [
    { "Sid": "TeamServicesCeiling", "Effect": "Allow",
      "Action": ["s3:*", "dynamodb:*", "logs:*"],
      "Resource": ["arn:aws:s3:::acme-orders-*", "arn:aws:s3:::acme-orders-*/*", "arn:aws:dynamodb:*:123456789012:table/orders", "arn:aws:logs:*:123456789012:log-group:/orders/*"] },
    { "Sid": "NoIamWritesInsideBoundary", "Effect": "Deny",
      "Action": ["iam:*", "organizations:*", "cloudtrail:*"], "Resource": "*" }
  ]
}`, 'team-orders-boundary (the SCP and developer policy are in topic 5)'),
    cx: `<p>Policy evaluation adds no noticeable latency; the cost is review time to design the three pieces once.</p>`,
    f: ['How do you test? (Create a role with and without the boundary in a sandbox and use the policy simulator on the resulting role.)', 'What about resource policies? (A bucket policy naming the role directly can still allow access despite the boundary; the SCP still applies to the role.)']
  }));

  practice.push(P({
    t: 'Stop secrets in environment variables reaching crash dumps',
    l: 'Hard', tags: ['secrets', 'Vault Agent', 'Kubernetes', 'logging'], co: ['Sentry', 'Shopify'],
    s: `<p>A Node service reads <code>DB_PASSWORD</code> and <code>API_TOKEN</code> from environment variables. A crash reporter uploads the environment, and <code>kubectl describe pod</code> shows them. Redesign it: where do the secrets come from, how do they reach the process, how long do they live, and what do you change in the crash reporter and logging? Provide the Kubernetes manifest fragment.</p>`,
    ex: `<p>After the change <code>kubectl describe pod</code> shows <span class="c-g">no secret values</span>; the crash report contains no credentials; the database user is a Vault dynamic credential that expires in one hour; a core dump taken at 14:00 has a password already dead by 15:00.</p>`,
    bw: `<p>Keep the env vars and add "do not log env" to the wiki. The crash reporter, a debug endpoint, <code>/proc/&lt;pid&gt;/environ</code>, <code>docker inspect</code> and every child process still see them, and a static password lives for years.</p>`,
    q: ['Which change reduces the harm of a leaked crash dump the most?', ['Short-lived dynamic credentials, so a dump contains an already-expired secret', 'Naming the variable differently', 'Base64-encoding the variable', 'Printing less in logs'], 0, 'Even if a secret leaks, a credential that expires within an hour is nearly worthless later. Renaming or encoding do nothing; log hygiene helps but is not enough.'],
    h: ['Hint 1: fetch secrets at runtime from Vault using the pod\'s service-account identity; no secret in the pod spec.', 'Hint 2: Vault Agent sidecar renders credentials to an in-memory volume (<code>emptyDir</code> with <code>medium: Memory</code>) and renews leases.', 'Hint 3: scrub known secret fields in the crash reporter, disable env capture, and set a short database TTL.'],
    a: `<p>The pod authenticates to Vault with Kubernetes auth. A Vault Agent sidecar (or the Vault Secrets Operator) writes the credential to a memory-backed file and renews the lease. The application reads the file; the pod spec holds no values. The crash reporter is configured to drop environment data and to scrub fields by name, and the database credential TTL is one hour. A leak now yields a dead credential and a log that never held it.</p>`,
    code: Y(`# Deployment fragment: Vault Agent injector annotations (the pod gets credentials as a file, not as env vars).
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payments
spec:
  replicas: 2
  selector:
    matchLabels: { app: payments }
  template:
    metadata:
      labels: { app: payments }
      annotations:
        vault.hashicorp.com/agent-inject: "true"
        vault.hashicorp.com/role: "payments"                       # Kubernetes auth role (topic 2)
        vault.hashicorp.com/agent-inject-secret-db: "database/creds/app"   # dynamic credentials, 1 hour TTL
    spec:
      serviceAccountName: payments-sa
      containers:
        - name: app
          image: ghcr.io/acme/payments@sha256:0000000000000000000000000000000000000000000000000000000000000000   # placeholder digest
          env:
            - name: DB_CREDENTIALS_FILE
              value: /vault/secrets/db       # only a path, never a value`, 'Deployment with Vault Agent injection'),
    cx: `<p>One extra sidecar per pod; secret reads happen once per lease renewal, not per request.</p>`,
    f: ['What if the app cannot read a file? (A small wrapper reads the file and sets the connection string in memory; avoid exporting it to the environment.)', 'What if Vault is down at pod start? (Run Vault in HA, use Agent caching, and size TTLs to ride out short outages.)']
  }));

  practice.push(P({
    t: 'Plan a zero-trust migration for a flat network',
    l: 'Hard', tags: ['zero trust', 'segmentation', 'mTLS', 'architecture'], co: ['Google', 'Cloudflare'],
    s: `<p>A company runs 40 services in one flat VPC. Employees use a VPN that gives access to everything. A penetration test moved from a phished laptop to the production database in 25 minutes. Write a phased plan (90 days) with concrete steps, how you measure progress, and which risks you take first. Name what you will not do in the first phase.</p>`,
    ex: `<p>Good output has dated phases such as: Weeks 1-2 inventory and flow logs; weeks 3-6 SSO plus MFA and remove standing admin; weeks 5-10 move databases to private subnets with group-to-group rules; weeks 8-12 identity-aware proxy replaces the VPN for internal tools; metric: <span class="c-g">number of services reachable from a compromised laptop falls from 40 to 3</span>.</p>`,
    bw: `<p>Buy a "zero trust" product and switch it on everywhere in one weekend. Legitimate traffic breaks, the team adds permit-all exceptions to restore service, and the new product is configured as the old flat network with a new logo.</p>`,
    q: ['What is the best first measurable step in a zero-trust migration?', ['Inventory the real flows and shrink what a compromised laptop can reach', 'Replace the CDN', 'Rotate all passwords once', 'Buy more firewalls'], 0, 'You cannot segment what you cannot see. Mapping flows with VPC Flow Logs and cutting reachability first gives measurable progress with low risk.'],
    h: ['Hint 1: start with visibility: enable flow logs and map who talks to whom.', 'Hint 2: protect the crown jewels first (databases, secrets, CI) with group-to-group rules and identity-based access.', 'Hint 3: roll out in report mode before enforcing, and measure reachability from a test laptop after each phase.'],
    a: `<p>Phase 1 (weeks 1-3): inventory, flow logs, SSO with phishing-resistant MFA, remove standing admin access. Phase 2 (weeks 4-8): private subnets and security-group references for data stores, SSM instead of SSH, NetworkPolicy default-deny in Kubernetes in audit mode. Phase 3 (weeks 8-12): identity-aware proxy replaces the flat VPN, mTLS between the most sensitive services, device posture checks. Measure the number of services reachable from a compromised laptop, mean time to revoke a leaver, and the share of services with workload identity. Do not attempt a big-bang cutover or mTLS everywhere in phase 1.</p>`,
    cx: `<p>The effort is in coordination and testing, not in compute; each phase should be reversible.</p>`,
    f: ['How do you avoid breaking production? (Audit mode first, canary segments, rollback plan, and an owner per flow.)', 'Where does a service mesh fit? (It gives mTLS and per-service authorisation once workloads have identity, typically phase 3.)']
  }));

  // ───────────────────────── Quiz (deterministic: fixed answer positions) ─────────────────────────
  quiz.push({ q: `A developer commits an AWS key, notices within a minute and pushes a second commit deleting the file. What is the correct conclusion?`, options: [`The key is safe because the file is gone from the latest commit`, `The key is in Git history and must be treated as leaked: deactivate and rotate it`, `Only a force-push to a private fork is needed`, `Nothing, because AWS keys expire after an hour`], answer: 1, explain: `Git keeps history, and public pushes are scraped by bots within minutes. The key must be deactivated and rotated first; cleaning history afterwards is only hygiene.` });
  quiz.push({ q: `A KV v2 policy grants read on <code>secret/app/*</code> but the app gets 403 on <code>vault kv get secret/app/db</code>. Why?`, options: [`KV v2 needs the data/ segment: secret/data/app/*`, `read is not a valid capability`, `Tokens cannot read KV`, `The path must end with /metadata only`], answer: 0, explain: `KV v2 stores values under secret/data/... and policies match the real API path, so a rule without data/ never applies and the default deny wins.` });
  quiz.push({ q: `Why is <code>vault server -dev</code> unsuitable for production?`, options: [`It is too slow`, `It cannot run KV`, `It requires Kubernetes`, `It stores data in memory, uses no TLS, is auto-unsealed and prints a root token`], answer: 3, explain: `Dev mode is for learning: in-memory storage loses everything on exit, there is no TLS, it unseals itself and has a known root token. Production needs durable storage, TLS, auto-unseal and tight policies.` });
  quiz.push({ q: `A dynamic database credential has TTL 1 h and max TTL 24 h. After 25 hours of continuous renewals, what must the client do?`, options: [`Renew once more`, `Ask Vault to raise max TTL`, `Request new credentials: renewals cannot exceed max TTL`, `Nothing; Vault renews automatically forever`], answer: 2, explain: `Max TTL is a hard cap from creation. Past it the lease expires and the client must fetch a fresh credential.` });
  quiz.push({ q: `Which statement about envelope encryption with KMS is correct?`, options: [`KMS issues a data key; you encrypt locally and store the wrapped data key with the ciphertext`, `The big data is sent to KMS for encryption`, `The KMS key is exported to the application`, `It removes the need for IAM permissions`], answer: 0, explain: `Envelope encryption keeps the KMS key in the HSM. The app encrypts locally with a data key and stores the encrypted data key beside the data; decrypt needs a KMS call.` });
  quiz.push({ q: `Which job permission enables keyless signing with cosign in GitHub Actions?`, options: [`contents: write`, `packages: read`, `id-token: write`, `actions: read`], answer: 2, explain: `id-token: write lets the job request an OIDC token, which Fulcio exchanges for a short-lived signing certificate. No long-lived key exists.` });
  quiz.push({ q: `What is an SBOM mainly used for during a new-CVE announcement?`, options: [`To encrypt the build`, `To speed up the build`, `To replace code review`, `To answer quickly which releases contain the affected component`], answer: 3, explain: `An SBOM is a machine-readable inventory. A query over stored SBOMs lists affected components and owners without asking each team.` });
  quiz.push({ q: `An SCP denies <code>cloudtrail:StopLogging</code>. An account administrator has AdministratorAccess in that account. Can they stop logging?`, options: [`Yes, administrators override SCPs`, `No, the SCP limits every principal in the member account regardless of their identity policies`, `Only on weekends`, `Only through the console`], answer: 1, explain: `SCPs set the maximum permissions for member accounts. An explicit deny in an SCP beats any allow in the account, including AdministratorAccess.` });
  quiz.push({ q: `A permission boundary on a role allows only s3:* and the role's identity policy allows ec2:* and s3:*. What can the role do?`, options: [`Only s3 actions`, `ec2 and s3 actions`, `Only ec2 actions`, `Nothing`], answer: 0, explain: `Effective permissions are the intersection of the boundary and the identity policy, so only the s3 actions remain.` });
  quiz.push({ q: `Which security group rule is the clearest red flag?`, options: [`tcp 443 from 0.0.0.0/0 on a public load balancer`, `tcp 5432 from the app security group`, `tcp 22 from 0.0.0.0/0`, `tcp 8080 from 10.0.0.0/16`], answer: 2, explain: `SSH open to the whole internet is a classic compromise path. Use Session Manager or restrict the source. A public HTTPS listener on a load balancer is intended, and the other two sources are private.` });
  quiz.push({ q: `You need to know which S3 objects an attacker read last month. What must have been enabled beforehand?`, options: [`CloudTrail management events only`, `CloudTrail data events for that bucket`, `Security Hub`, `GuardDuty`], answer: 1, explain: `GetObject calls are S3 data events, which are off by default. Without them CloudTrail cannot show reads.` });
  quiz.push({ q: `A SOC 2 Type II report differs from Type I because it covers...`, options: [`More products`, `Only encryption`, `Only the cloud provider`, `Whether controls operated effectively over a period of time`], answer: 3, explain: `Type I says controls exist at a point in time; Type II tests that they worked over a period, usually 3 to 12 months.` });
  quiz.push({ q: `A scanner reports a Critical CVE in a library that your service never loads. What is the best next step?`, options: [`Ignore it forever with a folder-wide exclude`, `Assess reachability and exposure, then fix or add a narrow, owned, time-boxed waiver`, `Disable the scanner`, `Change the severity label`], answer: 1, explain: `Triage is about risk in your context. Document the reasoning in a narrow waiver with an owner and expiry, and fix when a patched version exists.` });

  // ───────────────────────── Interview ─────────────────────────
  interview.push({ level: 'B', q: `What does "shift-left" mean in DevSecOps and which gates would you add first?`, a: `<p>Shift-left means moving security checks earlier, to where fixing is cheapest. I would start with the fastest, highest-value gates: a pre-commit and CI secret scan (gitleaks plus push protection), dependency scanning (SCA) with Dependabot, and an IaC scan for Terraform. Then SAST (Semgrep or CodeQL) and an image scan (trivy), and a DAST baseline against staging last. I roll out report-only first to tune noise, then enforce on new Critical and High findings, and keep PR gates under about ten minutes. The CI copy matters most because local hooks can be skipped with <code>--no-verify</code>.</p>`, followUps: [`How do you handle a noisy gate that developers want to turn off?`, `Why does the CI copy of a local hook still matter?`] });
  interview.push({ level: 'B', q: `A developer pushed an AWS access key to a public repository. Walk me through your response.`, a: `<p>Treat the key as compromised immediately. First contain: set the access key to Inactive (keep it for evidence) and deny sessions issued before now. Then scope: search CloudTrail by AccessKeyId in every region for what it did, looking for new IAM users, keys and roles, GPU instances, Lambda functions and SES activity. Remove attacker artifacts, rotate any secret the key could read, replace the key with a role or OIDC so no long-lived key exists, and only then clean Git history, which is hygiene and not remediation because clones and forks keep it. Finish with a blameless review and prevention: push protection, pre-commit scan, regional SCP.</p>`, followUps: [`Why deactivate before deleting the key?`, `What if the credential was a role session instead of a user key?`] });
  interview.push({ level: 'I', q: `Explain the Vault KV v2 policy path gotcha and how you would debug a 403.`, a: `<p>KV v2 stores values under <code>mount/data/path</code> and metadata under <code>mount/metadata/path</code>. The CLI hides this, but policies are matched against the real API path, so a rule on <code>secret/app/*</code> never matches and Vault denies by default. I debug by creating a token with only that policy and running <code>vault token capabilities secret/data/app/db</code>, read the policy with <code>vault policy read</code>, and fix the path to <code>secret/data/app/*</code>, adding <code>list</code> on the metadata path if listing is needed. I keep consumer policies to <code>read</code> only.</p>`, followUps: [`How do you stop a broader policy from re-granting access?`, `What capability do you need to roll back a version?`] });
  interview.push({ level: 'I', q: `What is the secret-zero problem and how do you solve it for pods and for CI?`, a: `<p>Every secret manager needs a first credential to authenticate the client, and storing that credential next to the app only moves the problem. The solution is to use an identity the platform already vouches for. For pods, Vault Kubernetes auth lets the pod trade its service-account JWT for a short-lived Vault token bound to a namespace and service account. For CI, use the pipeline's OIDC token (GitHub Actions) with a cloud role or Vault JWT auth. For VMs, AppRole with a short-lived, single-use, response-wrapped secret_id delivered by a trusted orchestrator works. The first credential is then short-lived, scoped and not reusable elsewhere.</p>`, followUps: [`Why is baking a Vault token into the image wrong?`, `How does response wrapping detect interception?`] });
  interview.push({ level: 'I', q: `Dynamic secrets versus rotating static secrets: how do you choose?`, a: `<p>Dynamic secrets are created per client with a TTL and revoked automatically, so a leak is short-lived and attributable. I prefer them wherever the target supports it (databases, cloud credentials, PKI). Static secrets that cannot be dynamic, such as a third-party API key, need rotation with an overlap: create the new version, deploy consumers, watch the old one go idle, then disable and delete. Rotating in place without overlap causes outages. Operationally dynamic secrets put Vault on the critical path, so I run it highly available, use Vault Agent to renew leases, and design connection pools to refetch on authentication failure.</p>`, followUps: [`What happens when max TTL is reached?`, `How would you rotate the credentials Vault itself uses to talk to the database?`] });
  interview.push({ level: 'I', q: `Explain envelope encryption and why we use it with KMS.`, a: `<p>KMS keys live in hardware and never leave it, and direct Encrypt is limited to 4 KB and billed per call. With envelope encryption I call GenerateDataKey, get a plaintext data key and a copy encrypted under the KMS key, encrypt the data locally with AES-GCM, store the ciphertext and the encrypted data key together, and discard the plaintext key. To decrypt, I send the encrypted data key to KMS, get the data key back, and decrypt locally. Access is governed by IAM and key policies, every KMS call is in CloudTrail, an encryption context binds the key to its purpose, and key rotation does not require re-encrypting the data.</p>`, followUps: [`What does deleting a KMS key do?`, `Why must the wrapped data key be stored with the data?`] });
  interview.push({ level: 'I', q: `How do you triage a scanner report with 400 findings?`, a: `<p>I do not sort by severity alone. I ask five questions: is the vulnerable code reachable, is the service internet-facing, is the CVE being exploited (CISA KEV list, EPSS score), is a fix available, and what is the asset worth. That gives a short list to fix now (reachable, exposed, exploited), a list for the sprint, and a list to accept with a narrow, owned, time-boxed waiver. I fix classes of problems with base-image bumps and Dependabot, and track mean time to remediate by severity. False positives get a documented suppression with a reason, an owner and an expiry, never a folder-wide exclude.</p>`, followUps: [`What does CVSS not tell you?`, `How do you stop waivers becoming permanent?`] });
  interview.push({ level: 'A', q: `What is the difference between an SCP, a permission boundary and an identity policy?`, a: `<p>An identity policy grants permissions to a user or role. A permission boundary is a cap on one principal: the effective permissions are the intersection of the boundary and the identity policy, so it never grants anything alone. An SCP is a cap applied by AWS Organizations to every principal in an account or OU, again granting nothing. A request must be allowed by every applicable layer and not explicitly denied anywhere. I use SCPs for organization-wide guardrails (protect CloudTrail, limit regions), boundaries to let developers create roles safely, and narrow identity policies generated from observed usage.</p>`, followUps: [`Do SCPs affect the management account?`, `How does iam:PassRole create an escalation path?`] });
  interview.push({ level: 'A', q: `A developer has AdministratorAccess. How do you move to least privilege without stopping work?`, a: `<p>I do it in steps. First measure: Access Analyzer policy generation and unused-access findings show what the person or role really uses. Second, put people on short-lived roles through IAM Identity Center with a permission set for their team, and add a permission boundary and the SCP guardrails. Third, draft narrow policies from CloudTrail usage, review ARNs and conditions, and roll them out via Terraform. Keep a documented break-glass admin role with MFA, short sessions and alerts. Monitor AccessDenied events for a few weeks and fix gaps quickly so the safe path stays easy.</p>`, followUps: [`What does CloudTrail not log by default that affects policy generation?`, `How do you review IAM write permissions?`] });
  interview.push({ level: 'I', q: `How do you sign and verify container images, and what does a signature prove?`, a: `<p>I build once, capture the image digest, generate an SBOM, and sign the digest with cosign using keyless signing: the CI job gets an OIDC token (permission <code>id-token: write</code>), Fulcio issues a short-lived certificate, and the signature goes to the registry and the Rekor transparency log. Consumers verify with the expected certificate identity and issuer, and a Kubernetes admission policy (Kyverno or policy-controller) rejects unsigned images. A signature proves who built this exact digest and that it was not changed; it does not prove the code is safe. I also protect the workflow files and branches because a compromised repository still signs bad code.</p>`, followUps: [`What SLSA level does hosted CI with provenance reach?`, `Why deploy by digest and not by tag?`] });
  interview.push({ level: 'I', q: `Which AWS services do you use to detect and investigate suspicious activity?`, a: `<p>CloudTrail records API activity (an organization trail to an S3 bucket in a separate log-archive account with log file validation, plus data events for crown-jewel buckets). GuardDuty analyses CloudTrail, VPC flow and DNS logs for threats such as credential exfiltration and sends findings to EventBridge. Config records resource configuration history and checks rules such as public buckets. Security Hub aggregates findings and scores CIS and AWS best-practice standards. Access Analyzer shows external access. For investigation I query CloudTrail in Athena by principal, access key and source IP, and I alert on a short list like root use, StopLogging and new access keys.</p>`, followUps: [`What cost controls apply to these services?`, `How would you answer "who deleted it last Tuesday" for an event older than 90 days?`] });
  interview.push({ level: 'B', q: `What is the difference between CIS Benchmarks, SOC 2, ISO 27001 and PCI DSS?`, a: `<p>CIS Benchmarks are free, detailed configuration checklists for systems such as AWS, Linux and Kubernetes, checked with scanners. SOC 2 is an independent auditor's report on your controls for the Trust Services Criteria (Security always); Type II covers operating effectiveness over a period. ISO 27001 is a certifiable standard for running an information security management system based on risk assessment. PCI DSS is the mandatory rule set for organizations that store, process or transmit payment card data. Controls overlap, so I build them once, automate evidence, and reduce scope, for example with tokenized card data.</p>`, followUps: [`How do you collect evidence continuously?`, `What does reducing PCI scope look like?`] });
  interview.push({ level: 'A', q: `Design network segmentation for a three-tier app on AWS and explain where zero trust fits.`, a: `<p>Separate accounts for environments, a VPC with public subnets only for the load balancer and NAT, private app subnets, and data subnets with no route to the internet. Security groups reference each other: ALB to app on 8080, app to database on 5432, nothing else. VPC endpoints keep S3 and KMS traffic off the internet, egress goes through a filtered path, instances require IMDSv2, and admin access uses SSM Session Manager with no port 22. In Kubernetes I use default-deny NetworkPolicies. Zero trust adds identity to every hop: SSO and MFA for people, workload identity for services, mTLS between sensitive services, and an identity-aware proxy instead of a flat VPN. I measure what a compromised host could reach.</p>`, followUps: [`Why are security groups preferred over NACLs for most rules?`, `How do you stop a Terraform change from opening the database to the internet?`] });

  // ───────────────────────── Registration ─────────────────────────
  // fix(): "@{{" in this file means dollar + two braces (GitHub expression opener). Code fields get the real text,
  // prose gets an HTML entity so the validator and the page never see a literal dollar-brace in HTML.
  function fix(v, key) {
    if (typeof v === 'string') {
      if (key === 'code') return v.replace(/@\{\{/g, '$' + '{{');
      return v.replace(/@\{\{/g, '&#36;{{');
    }
    if (Array.isArray(v)) return v.map(function (x) { return fix(x, key); });
    if (v && typeof v === 'object') { var o = {}; Object.keys(v).forEach(function (k) { o[k] = (typeof v[k] === 'function') ? v[k] : fix(v[k], k); }); return o; }
    return v;
  }

  registerModule(fix({
    id: 'devops16',
    title: 'DevSecOps & Cloud Security',
    intro: `<p>Security is not a gate at the end of the road; it is the guard rails along the whole road. This module teaches how a real team keeps a cloud system safe without slowing delivery: checks in the pipeline that catch secrets, vulnerable code, dependencies, infrastructure mistakes and images before they ship; a secrets manager so passwords stop living in Git and environment variables; least-privilege identities so one stolen credential cannot take the account; segmented networks; audit logs that answer "who deleted it last Tuesday"; and a calm, practised response when a key does leak.</p>
      <p>Every topic is tied to a real kind of incident: an AWS key pushed to a public repo and abused within minutes, a critical CVE in a base image, a bucket made public by Terraform, a developer with AdministratorAccess, a log4shell-style scramble, and secrets in crash dumps. The labs are free and safe: Vault in dev mode on your laptop, open-source scanners, a throwaway GitHub repository. The AWS parts are optional and come with cost notes. No real secret appears anywhere.</p>`,
    goals: [
      'Build a shift-left pipeline with secret scanning, SAST, SCA, IaC scanning, image scanning and a DAST baseline, and run a triage and false-positive workflow with narrow, owned, expiring waivers',
      'Run Vault locally in dev mode (never in production): store versioned secrets in KV v2, write path-correct least-privilege policies, log in with AppRole and Kubernetes auth, and explain the secret-zero problem and its solutions',
      'Issue dynamic database credentials with leases, TTLs and renewal, rotate static secrets with overlap, and protect data with envelope encryption and KMS',
      'Generate and query SBOMs (CycloneDX and SPDX), sign images keylessly with cosign and Sigstore, verify them at admission, and explain SLSA levels at an introductory level',
      'Design least-privilege IAM with permission boundaries, SCPs and Access Analyzer, and close privilege-escalation paths such as CreateRole and PassRole',
      'Segment networks with security groups, private subnets and NetworkPolicy, apply zero-trust basics, and stop public buckets and open ports with IaC policy checks (checkov, Rego)',
      'Use CloudTrail, GuardDuty, Config and Security Hub to detect and investigate, map your controls to CIS, SOC 2, ISO 27001 and PCI in plain words, and run incident response for a leaked key'
    ],
    prereqs: `<p><b>Required:</b> Cloud & DevOps 6 (Cloud Fundamentals II: IAM users, roles, policies, security groups and VPC basics) and Cloud & DevOps 11 (CI/CD Pipelines: workflows, secrets, OIDC and pipeline hardening). <b>Helpful:</b> Backend 15 (Security Engineering: OWASP Top 10, secrets management, TLS/mTLS and zero trust ideas), and Cloud & DevOps 8 (Docker: images and registries) for the image scanning and signing labs. This module builds on them and does not repeat the basics. You need a free GitHub account and Docker; the Vault lab needs the free <code>vault</code> binary (or OpenBao). AWS labs are optional and use a sandbox account with a budget alert.</p>`,
    hours: 14,
    langExplain: `<p>Commands and pipeline code are <b>bash</b> and <b>YAML</b> because that is how security is automated in practice (CLI tools and CI workflows). Vault policies are written in <b>HCL</b>, Terraform is HCL too, and policy-as-code uses <b>Rego</b>; none of these have a checker in this site, so those snippets are shown as <code>text</code> and are not compile-checked (they are verified by reading and by the real tools: <code>vault policy fmt</code>, <code>terraform validate</code>, <code>opa test</code>). IAM and SCP policies are <b>JSON</b> and are parsed by the checker. The problems with pure computation (an entropy-based secret detector, a CVSS gate with expiring waivers, a lease and TTL timeline, a least-privilege diff, a security-group exposure check, a log redactor) use <b>Python's standard library</b> and are tested; everything else is a security procedure that you verify by running the free tools.</p>`,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  }));
})();
