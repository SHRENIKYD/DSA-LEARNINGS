(function () {
  var topics = [], practice = [], quiz = [], interview = [];
  // C`...` = raw code template (backslashes stay as typed). HCL and bash use ${...} for interpolation, which a JS
  // template would try to evaluate, so inside C`...` we write @{ and it becomes a literal ${ in the published code.
  function C(s) { return String.raw.apply(null, arguments).replace(/@\{/g, '$' + '{'); }
  // HCL cannot be compiled by the site's validator, so every Terraform snippet is lang 'hcl' with check: false.
  function hcl(code, title) { var s = { lang: 'hcl', code: code, check: false }; if (title) s.title = title; return s; }
  function sh(code, title) { var s = { lang: 'bash', code: code }; if (title) s.title = title; return s; }
  var LAB = 'Local labs need only the <code>terraform</code> (1.6+) or <code>tofu</code> CLI, and Docker for the docker-provider labs: no cloud account, no cost. AWS parts need your own account with a <b>budget alert</b>, the AWS CLI signed in through a named profile (<code>aws sso login --profile lab</code>) and free-tier-sized resources. Never put access keys in <code>.tf</code> files. Every AWS answer ends with <code>terraform destroy</code>.';
  var SKIP = { skip: 'infrastructure code, verified by reading' };
  // Problem builder: solution.code is HCL (o.hcl) or bash (o.code); o.sh adds a bash tab; o.py adds a tested Python tab.
  function P(o) {
    var p = {
      title: o.t, level: o.l, tags: o.tags, companies: o.co,
      statement: o.s, constraints: o.c || LAB, example: o.ex,
      brute: { why: o.bw },
      mcq: { q: o.q[0], options: o.q[1], answer: o.q[2], explain: o.q[3] },
      hints: o.h,
      solution: { approach: o.a, code: o.hcl ? hcl(o.hcl) : o.yaml ? { lang: 'yaml', code: o.yaml } : sh(o.code), complexity: o.cx, followUps: o.f },
      tests: o.tests || SKIP
    };
    var alt = [];
    if (o.sh) alt.push(sh(o.sh));
    if (o.alt) alt = alt.concat(o.alt);
    if (o.py) alt.push({ lang: 'python', code: o.py });
    if (alt.length) p.solution.alt = alt;
    if (o.bc) p.brute.code = o.bc;
    return p;
  }
  function box(id, label, x, y, w) { return { id: id, label: label, x: x, y: y, shape: 'box', w: w || 18 }; }
  function one(k, v) { var h = {}; h[k] = v; return h; }
  // "a=1 b=2" -> [['a','1'],['b','2']] (split on the first '=' only)
  function pairs(s, hint) {
    return String(s || '').trim().split(/[\s,]+/).filter(Boolean).map(function (tok) {
      var i = tok.indexOf('=');
      if (i < 1 || !/^[a-zA-Z][\w-]*$/.test(tok.slice(0, i))) throw new Error(hint);
      return [tok.slice(0, i), tok.slice(i + 1)];
    });
  }

  // ───────────────────────── Topic 1: declarative IaC and the core workflow ─────────────────────────
  topics.push({
    title: 'Declarative Infrastructure: What Terraform Is and the init, plan, apply Loop',
    analogy: `<p>Ordering furniture for a new office. The <b>old way</b> is to phone the shop every time: "add one desk", "move a chair", "remove the old lamp". If you lose track of the calls, nobody knows what the office should look like. The <b>declarative way</b> is a <b>floor plan</b>: "this room has 4 desks, 8 chairs, 1 printer". A helper compares the plan with the room, tells you "I will bring 1 desk and take away 1 lamp", and only does it after you say yes. Terraform is that helper; your <code>.tf</code> files are the floor plan; the <b>plan</b> is the list it shows you before lifting anything.</p>`,
    explain: `<p>🟢 <b>Infrastructure as Code (IaC)</b> means describing servers, networks, buckets and permissions in text files that live in Git, instead of clicking in a web console. You get the same benefits code has: review in a pull request, history of who changed what, the same setup rebuilt in another account in minutes.</p>
      <p>🟢 <b>Imperative vs declarative.</b> A Bash script with <code>aws ec2 run-instances</code> is <b>imperative</b>: it lists <i>steps</i>. Run it twice and you get two servers. Terraform is <b>declarative</b>: you describe the <i>end result</i> ("one server of type t3.micro") and Terraform works out the steps. Run it twice and the second run says "No changes". That property - running again changes nothing - is called <b>idempotence</b>.</p>
      ${H.table(['', 'Imperative script (CLI/SDK)', 'Declarative (Terraform / OpenTofu)'], [
        ['You write', 'Steps: create, then tag, then attach', 'The desired end state'],
        ['Run it twice', H.c('r', 'Duplicates or errors'), H.c('g', '"No changes"')],
        ['Delete something', 'Write a separate delete script', 'Remove the block; plan shows the destroy'],
        ['Knows what exists', 'Must query every time', 'Keeps a <b>state</b> file mapping code to real IDs'],
        ['Preview before acting', 'Rarely', '<code>terraform plan</code>, always']
      ])}
      <p>🟢 <b>The pieces.</b> You write <b>HCL</b> (HashiCorp Configuration Language) in <code>.tf</code> files. A <b>provider</b> is a plugin that talks to one API (AWS, Docker, GitHub, even your local disk). A <b>resource</b> block is one thing to manage. Terraform remembers what it created in <b>state</b> (<code>terraform.tfstate</code>). Each run compares three things: your <b>code</b> (wanted), the <b>state</b> (what it created last time) and the <b>real world</b> (refreshed from the API).</p>
      <p>🔵 <b>The loop you will type a thousand times:</b></p>
      <ol>
        <li><code>terraform init</code> - downloads providers into <code>.terraform/</code>, sets up the backend, writes <code>.terraform.lock.hcl</code> (exact provider versions and checksums - <b>commit it</b>).</li>
        <li><code>terraform fmt</code> and <code>terraform validate</code> - tidy formatting and catch typos or wrong argument names without touching any API.</li>
        <li><code>terraform plan -out=tfplan</code> - refresh, compare, show the change list, and <b>save</b> it.</li>
        <li><code>terraform apply tfplan</code> - do exactly the saved plan, nothing else.</li>
        <li><code>terraform destroy</code> - remove everything this configuration manages (labs!).</li>
      </ol>
      <p>🔵 <b>Reading a plan:</b> ${H.c('g', '+ create')}, ${H.c('y', '~ update in-place')}, ${H.c('r', '- destroy')}, ${H.c('r', '-/+ destroy and then create replacement')} (look for <code># forces replacement</code> next to the attribute that caused it), <code>+/-</code> create the replacement first, <code>&lt;=</code> read a data source. The last line sums it up: <code>Plan: 1 to add, 1 to change, 1 to destroy.</code> A replacement counts as one add <i>and</i> one destroy.</p>
      <p>🔵 <b>Terraform and OpenTofu.</b> In 2023 HashiCorp moved Terraform to the Business Source License (HashiCorp itself is now part of IBM). The community forked the last open-source version into <b>OpenTofu</b>, run by the Linux Foundation, licensed MPL 2.0. The CLI is <code>tofu</code> instead of <code>terraform</code>, the HCL syntax and state format are compatible for everything in this module, and providers come from the OpenTofu registry (the same providers). Each project has added its own features since (OpenTofu: client-side state encryption; Terraform: HCP Terraform integrations, Stacks), so pick one per repository and pin its version. Every command here works with <code>tofu</code> by swapping the word.</p>`,
    clues: [
      '"we built prod by clicking in the console and cannot recreate it" → Infrastructure as Code; import what exists (Topic 7), then manage it in Git',
      '"the script created a second load balancer when we re-ran it" → imperative scripts are not idempotent; declarative tools converge to one desired state',
      '"what will this change actually do?" → <code>terraform plan</code>; in CI <code>plan -out</code> then <code>apply</code> that exact file',
      '"<code>-/+</code> ... forces replacement" in a plan → the resource will be destroyed and recreated; stop and check it is not a database',
      '"we cannot use BSL-licensed tools" or "open-source Terraform" → <b>OpenTofu</b>, same HCL, <code>tofu</code> CLI',
      '"works on my laptop, CI downloaded a different provider" → commit <code>.terraform.lock.hcl</code> and pin <code>required_providers</code>'
    ],
    code: [hcl(C`# main.tf - your first configuration. No cloud account needed: these providers only
# generate random names and write files on your own disk.
terraform {
  required_version = ">= 1.6.0"            # refuse to run on older CLIs

  required_providers {
    random = {
      source  = "hashicorp/random"         # registry address: namespace/name
      version = "~> 3.6"                   # any 3.x from 3.6 up, never 4.0
    }
    local = {
      source  = "hashicorp/local"
      version = "~> 2.5"
    }
  }
}

# A resource block: resource "<TYPE>" "<LOCAL NAME>" { arguments }
# Its address in state is random_pet.server.
resource "random_pet" "server" {
  length    = 2                            # two words, e.g. "brave-otter"
  separator = "-"
}

resource "local_file" "motd" {
  # Referencing random_pet.server.id creates an implicit dependency:
  # Terraform creates the pet name first, then the file.
  filename        = "@{path.module}/out/motd.txt"
  content         = "Welcome to @{random_pet.server.id}\n"
  file_permission = "0644"
}

# terraform_data (built in since 1.4) replaces the old null_resource for
# "run something when an input changes" - here it just stores a value.
resource "terraform_data" "build_marker" {
  input = random_pet.server.id
}

output "server_name" {
  description = "Generated name, printed after apply"
  value       = random_pet.server.id
}`, 'main.tf: random_pet + local_file + terraform_data'), sh(C`#!/usr/bin/env bash
# The everyday loop. Works the same with OpenTofu: replace "terraform" by "tofu".
set -euo pipefail

terraform version                  # check you have 1.6 or newer
terraform init                     # download providers, write .terraform.lock.hcl
terraform fmt -recursive           # canonical formatting (CI uses: fmt -check)
terraform validate                 # syntax, types, argument names - no API calls

terraform plan -out=tfplan         # show and SAVE the change list
terraform apply tfplan             # apply exactly that plan (no second prompt)

terraform output server_name       # read an output
cat out/motd.txt

terraform plan                     # run again: "No changes." = idempotent
terraform destroy -auto-approve    # labs only; in real life read the destroy plan
rm -f tfplan`, 'The workflow: init, fmt, validate, plan -out, apply, destroy')],
    codeTitle: ['main.tf: random_pet + local_file + terraform_data', 'The workflow: init, fmt, validate, plan -out, apply, destroy'],
    viz: [{
      title: 'How plan decides: desired (code) vs current (state)',
      input: 'desired: cache=t3.micro db=t3.small web=t3.micro | current: db=t3.medium old=t3.nano web=t3.micro',
      inputLabel: 'desired: name=value ... | current: name=value ... (up to 8 each)',
      gen: function (input) {
        var hint = 'Use: desired: web=t3.micro db=t3.small | current: web=t3.micro old=t3.nano';
        var halves = String(input || '').split('|');
        if (halves.length !== 2) throw new Error(hint);
        var want = pairs(halves[0].replace(/^\s*desired\s*:/i, ''), hint), have = pairs(halves[1].replace(/^\s*current\s*:/i, ''), hint);
        if (want.length > 8 || have.length > 8) throw new Error('Keep it to 8 resources on each side');
        var W = {}, S = {};
        want.forEach(function (p) { W[p[0]] = p[1]; });
        have.forEach(function (p) { S[p[0]] = p[1]; });
        var names = Object.keys(W).concat(Object.keys(S).filter(function (k) { return !(k in W); })).sort();
        var rows = [], f = [], add = 0, chg = 0, del = 0;
        function snap(cur) {
          return [
            { type: 'map', label: 'desired (your .tf code)', entries: Object.keys(W).sort().map(function (k) { return [k, W[k]]; }), hl: cur && cur in W ? one(cur, 'cur') : {} },
            { type: 'map', label: 'current (state, after refresh)', entries: Object.keys(S).sort().map(function (k) { return [k, S[k]]; }), hl: cur && cur in S ? one(cur, 'cur') : {} },
            { type: 'table', label: 'plan so far', columns: ['address', 'action'], rows: rows.map(function (r) { return r.slice(); }), hl: rows.length ? one(rows.length - 1, 'cur') : {} }
          ];
        }
        f.push({ narr: 'Terraform has two lists: what your code <b>wants</b>, and what state says <b>exists</b> (after refreshing it from the real API). It walks every resource address in either list, in a stable order, and decides one action per address.', parts: snap(null) });
        names.forEach(function (k) {
          var narr;
          if (!(k in S)) { add++; rows.push([k, '+ create']); narr = '<b>' + k + '</b> is in the code but not in state: nothing real exists yet, so the action is ' + H.c('g', '+ create') + '.'; }
          else if (!(k in W)) { del++; rows.push([k, '- destroy']); narr = '<b>' + k + '</b> is in state but no longer in the code. Removing a block means "this should not exist": ' + H.c('r', '- destroy') + '. This is why deleting a block by accident is dangerous.'; }
          else if (W[k] !== S[k]) { chg++; rows.push([k, '~ update']); narr = '<b>' + k + '</b> exists but its value differs (' + S[k] + ' → ' + W[k] + '). Most attribute changes are ' + H.c('y', '~ update in-place') + '; some (like an AMI or a DB engine) force <code>-/+</code> replacement.'; }
          else { rows.push([k, '(no-op)']); narr = '<b>' + k + '</b> matches exactly. No action - that is idempotence: unchanged code means unchanged infrastructure.'; }
          f.push({ narr: narr, parts: snap(k) });
        });
        f.push({ narr: 'The summary line counts the actions: <b>Plan: ' + add + ' to add, ' + chg + ' to change, ' + del + ' to destroy.</b> Read the destroys first, every time. <code>plan -out=tfplan</code> freezes this list so <code>apply tfplan</code> does exactly this and nothing else.', parts: [{ type: 'table', label: 'final plan', columns: ['address', 'action'], rows: rows }, { type: 'vars', label: 'summary', vals: { to_add: add, to_change: chg, to_destroy: del }, hl: del ? { to_destroy: 'bad' } : {} }] });
        return f;
      }
    }],
    examples: [
      { title: 'Click-ops vs code: the same bucket twice', html: `<p>A teammate creates a bucket in the console, then another in a second account for staging, and forgets to enable encryption on the second. Six months later nobody remembers the settings. With Terraform the bucket, its versioning and encryption are 20 lines in Git; staging and prod use the same code with a different name. The review happens in a pull request, and the plan shows exactly what will be created. ${H.c('g', 'Repeatable, reviewable, recoverable.')}</p>` },
      { title: 'Reading a real plan before saying yes', html: `<p>You change an instance's <code>instance_type</code> and its <code>ami</code>. The plan prints:</p>${H.table(['line', 'meaning'], [
        ['<code>~ instance_type = "t3.micro" -&gt; "t3.small"</code>', 'can change in place (the instance is stopped and started)'],
        ['<code>~ ami = "ami-0aa..." -&gt; "ami-0bb..." # forces replacement</code>', H.c('r', 'this attribute alone makes it -/+')],
        ['<code>Plan: 1 to add, 0 to change, 1 to destroy.</code>', 'the server is rebuilt: anything on its local disk is lost']
      ])}<p>The habit: scroll to the summary, then search the plan for <code>destroy</code> and <code>forces replacement</code> before anything else.</p>` },
      { title: 'Why "plan -out" matters in a team', html: `<p>You run <code>terraform plan</code>, read it, then run <code>terraform apply</code> ten minutes later. Plain <code>apply</code> makes a <b>new</b> plan - if a colleague merged a change in between, you approve something you never read. Saving the plan (<code>plan -out=tfplan</code>) and running <code>apply tfplan</code> applies exactly what was reviewed; if the state changed meanwhile, Terraform refuses with "Saved plan is stale". CI pipelines always use this pair.</p>`, code: sh(C`terraform plan -out=tfplan -input=false
terraform show tfplan            # human-readable, for the reviewer
terraform show -json tfplan > tfplan.json   # machine-readable, for policy checks
terraform apply -input=false tfplan`) },
      { title: 'Switching a repo to OpenTofu', html: `<p>A company policy forbids BSL-licensed tools. For a project on Terraform 1.5-1.6 era syntax the switch is usually: install <code>tofu</code>, run <code>tofu init</code> (it re-resolves providers from the OpenTofu registry and updates the lock file), then <code>tofu plan</code> must show <b>No changes</b>. Do it on a branch, back up the state first, and keep everyone on one tool per repository - mixing both CLIs on the same state after they diverge is asking for trouble.</p>`, code: sh(C`# back up the current state first (remote backends: terraform state pull)
terraform state pull > backup-before-tofu.tfstate
tofu init -upgrade
tofu plan            # expect: No changes. Your infrastructure matches the configuration.`) }
    ],
    deepDive: `<p>🟣 <b>What happens inside one <code>plan</code>.</b> (1) Parse every <code>.tf</code> file in the directory (file names do not matter; Terraform merges them; <code>main.tf</code>, <code>variables.tf</code>, <code>outputs.tf</code>, <code>versions.tf</code> are just convention). (2) Build a <b>dependency graph</b> from references. (3) <b>Refresh</b>: ask each provider to read the real object for every resource in state. (4) For each resource the provider computes a <b>diff</b> between config and the refreshed state, and decides update vs replace using its schema (attributes marked <i>ForceNew</i>). (5) Values unknown until apply (a new instance's ID) show as <code>(known after apply)</code>.</p>
      <p><b>Version constraints.</b> <code>= 5.40.0</code> exact; <code>&gt;= 5.0, &lt; 6.0</code> a range; <code>~&gt; 5.40</code> means "5.40 or newer but below 6.0"; <code>~&gt; 5.40.0</code> means "5.40.x only". Libraries (reusable modules) should use wide ranges; root configurations pin tightly and rely on the lock file for exact versions. <code>terraform init -upgrade</code> picks the newest version allowed by the constraints and rewrites the lock file - do that on purpose, in its own pull request. For CI runners on another OS, record checksums for every platform: <code>terraform providers lock -platform=linux_amd64 -platform=darwin_arm64</code>.</p>
      <p><b>Where it does not fit.</b> Terraform manages the <i>lifecycle</i> of infrastructure objects. It is weak at things that change minute by minute (autoscaling counts, container image tags deployed many times a day) and at configuring inside a server (packages, files: that is Ansible or a baked image, next module). And "declarative" has edges: provisioners (<code>local-exec</code>, <code>remote-exec</code>) run imperative scripts and are a last resort, because Terraform cannot plan or undo what they did.</p>
      <p><b>Other IaC tools you will meet:</b> AWS CloudFormation / CDK, Azure Bicep, Pulumi (real programming languages, same plan/apply idea), Crossplane (Kubernetes-style). The concepts here - desired state, plan, state, drift - carry over to all of them.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> assistants write decent HCL quickly: "an S3 bucket with versioning, encryption and blocked public access" becomes four correct-looking resources in seconds, and they explain an unfamiliar plan line well. Agents can now run <code>plan</code> themselves and summarise it.</p>
      <p><b>Where it goes wrong:</b> models mix provider versions (the old AWS v3 style with <code>versioning { }</code> inside <code>aws_s3_bucket</code> is everywhere in training data), invent arguments that <code>validate</code> rejects, and sometimes suggest <code>-auto-approve</code> or <code>-target</code> to "get past" an error. <b>How to work with it:</b> generate, then <code>fmt</code>, <code>validate</code>, <code>plan</code> - the plan is the ground truth, not the chat. Never let an agent run <code>apply</code> or <code>destroy</code> without a human reading the saved plan, and give agents read-only cloud credentials for planning. <b>What you still own:</b> understanding every <code>-/+</code> and <code>-</code> line before approving.</p>`,
    problems: [P({
      t: 'Build a tiny plan calculator', l: 'Medium', tags: ['plan', 'declarative', 'diff'], co: ['HashiCorp', 'Thoughtworks', 'Amazon'],
      s: `<p>To really understand <code>terraform plan</code>, write the core of it. <code>planDiff(desired, current)</code> receives two lists of strings <code>"name=value"</code>: the resources your code wants and the resources state says exist. Return the actions, <b>sorted by name</b>: <code>"create NAME"</code> (only desired), <code>"update NAME"</code> (both, different value), <code>"delete NAME"</code> (only current). Unchanged resources produce nothing. Values may themselves contain <code>=</code>; split on the first one. Then show the real Terraform commands that print this summary for a configuration.</p>`,
      c: `<p>0-1000 entries per list, names unique within a list. Pure computation: nothing is created, no cost. The real-commands part uses only local providers.</p>`,
      ex: `<p>desired <code>["web=t3.micro","db=t3.small","cache=t3.micro"]</code>, current <code>["web=t3.micro","db=t3.medium","old=t3.nano"]</code> → ${H.c('g', '["create cache","update db","delete old"]')}. <code>web</code> matches, so it is a no-op and does not appear. Order is by name: cache, db, old.</p>`,
      bw: `<p>For every desired entry scan the whole current list, and for every current entry scan the whole desired list: O(n·m). Works, but slow for big states, and easy to get wrong - many first attempts forget the deletes entirely, which is exactly the mistake that leaves orphaned (still billed) resources behind in hand-written scripts.</p>`,
      bc: { lang: 'python', code: C`def plan_diff_slow(desired, current):
    out = []
    for d in desired:                       # O(n*m) nested scans
        name, val = d.split("=", 1)
        match = [c for c in current if c.split("=", 1)[0] == name]
        if not match:
            out.append("create " + name)
        elif match[0].split("=", 1)[1] != val:
            out.append("update " + name)
    # deletes are easy to forget - here they are, but only after another full scan
    for c in current:
        name = c.split("=", 1)[0]
        if not any(d.split("=", 1)[0] == name for d in desired):
            out.append("delete " + name)
    return sorted(out, key=lambda a: a.split(" ", 1)[1])` },
      q: ['Your code no longer contains a resource that is still in state. What will the plan do?', ['Destroy it', 'Ignore it', 'Import it', 'Mark it as drift and stop'], 0, 'State lists what Terraform manages. A managed resource missing from the code is "not wanted any more", so it is planned for destruction. To stop managing it without deleting it, use a <code>removed</code> block or <code>terraform state rm</code> (Topic 7).'],
      h: ['<p>Hint 1: this is a set comparison by <b>name</b>. Names only in desired are creates, only in current are deletes, in both with different values are updates.</p>', '<p>Hint 2: turn both lists into dictionaries (<code>name → value</code>) with <code>split("=", 1)</code>, then walk the sorted union of keys once.</p>', '<p>Hint 3: empty lists are valid (fresh project, or <code>destroy</code> of everything). Values like <code>tag=env=prod</code> must keep everything after the first <code>=</code>. Recipe: build dicts, union keys, sort, emit one action per differing key.</p>'],
      a: `<p>Build two maps keyed by resource name and walk the sorted union of their keys once. For each key: missing from <i>current</i> → create; missing from <i>desired</i> → delete; present in both with a different value → update; otherwise no-op. That is the heart of Terraform's plan: the real one also refreshes current state from the API first, and asks the provider whether an update can happen in place or forces replacement.</p>
        <p>To see Terraform produce the same summary for real, the HCL tab declares three local files; change one, delete one, add one, and the plan shows <code>+</code>, <code>~</code> and <code>-</code>. The bash tab runs it and extracts the summary line and the per-resource actions from the JSON plan.</p>`,
      hcl: C`# Real-world mirror of the exercise: three local files keyed by name.
terraform {
  required_version = ">= 1.6.0"
  required_providers {
    local = { source = "hashicorp/local", version = "~> 2.5" }
  }
}

variable "files" {
  description = "name => content; edit this map and re-plan to see create/update/delete"
  type        = map(string)
  default = {
    web   = "t3.micro"
    db    = "t3.small"
    cache = "t3.micro"
  }
}

resource "local_file" "res" {
  for_each = var.files                       # one file per map key
  filename = "@{path.module}/out/@{each.key}.txt"
  content  = each.value
}`,
      sh: C`#!/usr/bin/env bash
set -euo pipefail
terraform init -input=false
terraform apply -auto-approve -input=false     # lab: create the first version

# Change the desired map: db changes value, old appears, cache disappears
terraform plan -out=tfplan -input=false \
  -var='files={"web":"t3.micro","db":"t3.medium","old":"t3.nano"}'

# One line per resource: address and actions, straight from the JSON plan
terraform show -json tfplan \
  | jq -r '.resource_changes[] | select(.change.actions != ["no-op"]) | "\(.change.actions | join(",")) \(.address)"'

terraform show tfplan | grep -E '^Plan:'       # Plan: 1 to add, 1 to change, 1 to destroy.
terraform destroy -auto-approve && rm -f tfplan`,
      py: C`def plan_diff(desired, current):
    """Actions that turn current into desired, sorted by resource name."""
    want = dict(item.split("=", 1) for item in desired)    # name -> value
    have = dict(item.split("=", 1) for item in current)
    actions = []
    for name in sorted(set(want) | set(have)):            # one pass over the union
        if name not in have:
            actions.append("create " + name)
        elif name not in want:
            actions.append("delete " + name)              # in state, not in code
        elif want[name] != have[name]:
            actions.append("update " + name)
        # equal -> no-op: nothing to do (idempotence)
    return actions`,
      cx: `<p>O((n + m) log(n + m)) for sorting the union, O(n + m) memory. Real Terraform is dominated by API calls during refresh, not by the diff; that is why huge states plan slowly and why splitting state helps (Topic 6).</p>`,
      f: ['How would you represent "forces replacement" in this calculator?', 'Why does Terraform refresh before diffing, and what does <code>-refresh=false</code> risk?'],
      tests: { sig: 'string[] string[] -> string[]', fn: 'planDiff', cases: [
        [[['web=t3.micro', 'db=t3.small', 'cache=t3.micro'], ['web=t3.micro', 'db=t3.medium', 'old=t3.nano']], ['create cache', 'update db', 'delete old']],
        [[['a=1', 'b=2'], ['a=1', 'b=3']], ['update b']],
        [[['a=1'], []], ['create a']],
        [[[], ['a=1']], ['delete a']],
        [[[], []], []],
        [[['x=1', 'y=2'], ['x=1', 'y=2']], []],
        [[['b=1', 'a=2'], ['c=3']], ['create a', 'create b', 'delete c']],
        [[['tag=env=prod'], ['tag=env=dev']], ['update tag']]
      ] }
    })]
  });

  // ───────────────────────── Topic 2: providers, resources, data sources, the graph ─────────────────────────
  topics.push({
    title: 'Providers, Resources and Data Sources: From Docker on Your Laptop to AWS, and the Dependency Graph',
    analogy: `<p>A building site. The <b>providers</b> are specialist subcontractors: one does plumbing (AWS), one does electrics (Docker), one paints (GitHub). Each <b>resource</b> is a job on the list: "lay foundation", "build walls", "fit windows". Some jobs must wait for others - windows need walls - and the site manager (Terraform) reads the job sheet, works out what depends on what, and runs every job that is free <b>in parallel</b>. A <b>data source</b> is checking something that already exists - "what size is the plot?" - without building anything.</p>`,
    explain: `<p>🟢 <b>Provider</b> = a plugin, downloaded by <code>init</code>, that translates HCL into API calls. You declare <i>which</i> one and <i>which version</i> in <code>required_providers</code>, and configure it (region, endpoint) in a <code>provider</code> block. There are thousands in the registry: <code>hashicorp/aws</code>, <code>hashicorp/azurerm</code>, <code>hashicorp/google</code>, <code>kreuzwerker/docker</code>, <code>integrations/github</code>, <code>hashicorp/kubernetes</code>.</p>
      <p>🟢 <b>Resource</b> = something Terraform creates, updates and deletes: <code>resource "docker_container" "web" { ... }</code>. Its <b>address</b> is <code>docker_container.web</code>; after apply you can read its attributes (<code>docker_container.web.id</code>). <b>Data source</b> = something Terraform only <i>reads</i>: <code>data "aws_ami" "al2023" { ... }</code>, address <code>data.aws_ami.al2023</code>. Use data sources to look up things you do not own: the latest image, the current account ID, an existing VPC from another team.</p>
      <p>🔵 <b>Start with no cloud at all: Docker.</b> The <code>kreuzwerker/docker</code> provider talks to your local Docker daemon, so you can practise the whole loop - providers, references, outputs, replacement, destroy - for free in seconds. The first code tab runs nginx in a container on port 8080.</p>
      <p>🔵 <b>Then AWS, without keys in code.</b> The AWS provider finds credentials the same way the AWS CLI does (the <b>default credential chain</b>): environment variables set by your shell or CI, then the shared config with SSO profiles (<code>AWS_PROFILE=lab</code> after <code>aws sso login</code>), then an instance or container role. So the <code>provider "aws"</code> block contains a <b>region</b> and maybe a <b>profile</b>, and <b>never</b> <code>access_key</code>/<code>secret_key</code> - those would end up in Git. <code>default_tags</code> stamps every resource with owner and project tags, which makes cost reports and cleanup easy.</p>
      <p>🔵 <b>The dependency graph.</b> When one resource references another (<code>image = docker_image.nginx.image_id</code>), Terraform knows the image must exist first: an <b>implicit dependency</b>. It builds a graph of all resources and runs everything whose dependencies are done at the same time (10 in parallel by default, <code>-parallelism=N</code>). <b>Destroy runs the graph backwards</b>: the container goes before the image, the instance before the subnet. If a dependency is real but invisible in the code - for example an instance whose startup script needs an IAM policy that it never references - you add <code>depends_on = [aws_iam_role_policy_attachment.read_bucket]</code>. Use it rarely: a reference is always better because it also passes the value.</p>
      ${H.table(['Block', 'Does', 'Example address'], [
        ['<code>provider</code>', 'configures a plugin (region, endpoint, alias)', '<code>provider["registry.terraform.io/hashicorp/aws"]</code>'],
        ['<code>resource</code>', 'create / update / delete one object', '<code>aws_instance.web</code>'],
        ['<code>data</code>', 'read an existing object', '<code>data.aws_ami.al2023</code>'],
        ['<code>terraform_data</code>', 'store a value or trigger replacement, no API', '<code>terraform_data.release</code>']
      ])}`,
    clues: [
      '"practise Terraform without a cloud account / without spending money" → <code>local</code>, <code>random</code>, <code>terraform_data</code> and the <code>docker</code> provider',
      '"where do I put the AWS keys in the provider block" → nowhere: default credential chain, SSO profile locally, OIDC role in CI',
      '"look up the latest Amazon Linux AMI / the VPC another team owns" → a <b>data source</b>, not a resource',
      '"the instance started before its IAM policy was attached" → hidden dependency: add <code>depends_on</code> (or reference the attachment)',
      '"create a certificate in us-east-1 while everything else is in eu-west-1" → second provider block with <code>alias</code>, <code>provider = aws.use1</code>',
      '"apply is slow with 400 resources" → the graph runs 10 at a time; raise <code>-parallelism</code> carefully or split the state'
    ],
    code: [hcl(C`# docker-lab/main.tf - full Terraform loop against your local Docker. Free, no cloud.
terraform {
  required_version = ">= 1.6.0"
  required_providers {
    docker = {
      source  = "kreuzwerker/docker"     # community provider, very widely used
      version = "~> 3.0"
    }
  }
}

# Empty block = use the local daemon (unix:///var/run/docker.sock).
provider "docker" {}

variable "host_port" {
  type    = number
  default = 8080
}

resource "docker_network" "app" {
  name = "tf-lab-net"
}

resource "docker_image" "nginx" {
  name         = "nginx:1.27-alpine"     # pin a tag, never "latest"
  keep_locally = true                    # do not delete the image on destroy
}

resource "docker_container" "web" {
  name  = "tf-lab-web"
  image = docker_image.nginx.image_id    # reference = implicit dependency

  ports {
    internal = 80
    external = var.host_port
  }

  networks_advanced {
    name = docker_network.app.name       # second implicit dependency
  }
}

output "url" {
  value = "http://localhost:@{var.host_port}"
}`, 'Docker lab: nginx container managed by Terraform'), hcl(C`# aws/providers.tf - AWS provider v5 with NO credentials in code.
terraform {
  required_version = ">= 1.6.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"                 # >= 5.0, < 6.0
    }
  }
}

provider "aws" {
  region = "eu-west-1"
  # Credentials come from the default chain: AWS_PROFILE=lab after
  # "aws sso login --profile lab" on a laptop, an OIDC-assumed role in CI.
  # Never write access_key / secret_key here.
  default_tags {
    tags = {
      project    = "tf-lab"
      owner      = "your-name"
      managed_by = "terraform"
    }
  }
}

# Second, aliased provider for the few things that must live in us-east-1
provider "aws" {
  alias  = "use1"
  region = "us-east-1"
}

# Read-only lookups: who am I, and which AMI is current?
data "aws_caller_identity" "me" {}

data "aws_ami" "al2023" {
  most_recent = true
  owners      = ["amazon"]
  filter {
    name   = "name"
    values = ["al2023-ami-2023.*-x86_64"]
  }
}

# Cost note: t3.micro is free-tier eligible (750 h/month in the first year on
# older accounts, or covered by credits on newer ones); otherwise about
# $0.01/hour. Run "terraform destroy" when you finish.
resource "aws_instance" "web" {
  ami           = data.aws_ami.al2023.id
  instance_type = "t3.micro"

  metadata_options {
    http_tokens = "required"             # IMDSv2 only
  }

  tags = { Name = "tf-lab-web" }
}

output "account_id" { value = data.aws_caller_identity.me.account_id }
output "instance_id" { value = aws_instance.web.id }`, 'AWS provider v5: region, default_tags, alias, data sources')],
    codeTitle: ['Docker lab: nginx container managed by Terraform', 'AWS provider v5: region, default_tags, alias, data sources'],
    viz: [{
      title: 'Dependency graph: which resources Terraform creates together',
      input: 'vpc: | subnet:vpc | sg:vpc | instance:subnet,sg | eip:instance | bucket:',
      inputLabel: 'resource:dep1,dep2 separated by | (up to 10 resources)',
      gen: function (input) {
        var hint = 'Use: vpc: | subnet:vpc | instance:subnet';
        var items = String(input || '').split('|').map(function (s) { return s.trim(); }).filter(Boolean);
        if (!items.length || items.length > 10) throw new Error('Give 1-10 resources. ' + hint);
        var deps = {}, order = [];
        items.forEach(function (it) {
          var m = it.match(/^([a-zA-Z][\w-]*)\s*:\s*([\w,\s-]*)$/);
          if (!m) throw new Error(hint);
          deps[m[1]] = m[2].split(',').map(function (d) { return d.trim(); }).filter(Boolean);
          order.push(m[1]);
        });
        order.forEach(function (n) { deps[n].forEach(function (d) { if (!deps[d]) throw new Error('"' + n + '" depends on undeclared "' + d + '"'); }); });
        var level = {}, waves = [], done = {}, left = order.slice();
        while (left.length) {
          var ready = left.filter(function (n) { return deps[n].every(function (d) { return done[d]; }); }).sort();
          if (!ready.length) break;
          ready.forEach(function (n) { level[n] = waves.length; });
          ready.forEach(function (n) { done[n] = true; });
          waves.push(ready);
          left = left.filter(function (n) { return !done[n]; });
        }
        var cyc = left.length > 0;
        var cols = waves.length + (cyc ? 1 : 0);
        var nodes = [], edges = [];
        var byCol = {};
        order.forEach(function (n) { var c = n in level ? level[n] : waves.length; (byCol[c] = byCol[c] || []).push(n); });
        Object.keys(byCol).forEach(function (c) {
          byCol[c].forEach(function (n, i) {
            nodes.push(box(n, n, Math.round(100 / (cols + 1) * (+c + 1)), Math.round(60 / (byCol[c].length + 1) * (i + 1)), 14));
          });
        });
        order.forEach(function (n) { deps[n].forEach(function (d) { edges.push([d, n]); }); });
        function g(hl, label) { return { type: 'graph', label: label || 'dependency graph (arrow = "must exist before")', directed: true, height: 60, nodes: nodes, edges: edges, hl: hl }; }
        var f = [];
        f.push({ narr: 'Terraform reads every reference and draws an arrow from a resource to each resource that uses it. Nobody wrote the order down - it falls out of the references.', parts: [g({}), { type: 'map', label: 'depends on', entries: order.map(function (n) { return [n, deps[n].join(', ') || '(nothing)']; }) }] });
        var hl = {};
        waves.forEach(function (w, i) {
          var cur = Object.assign({}, hl);
          w.forEach(function (n) { cur[n] = 'cur'; });
          f.push({ narr: 'Wave ' + (i + 1) + ': <b>' + w.join(', ') + '</b> ' + (w.length > 1 ? 'have' : 'has') + ' every dependency finished, so ' + (w.length > 1 ? 'they are created <b>at the same time</b> (up to 10 in parallel by default).' : 'it is created now.') + (i === 0 ? ' Resources with no dependencies always start first.' : ''), parts: [g(cur), { type: 'queue', label: 'running now', items: w.slice(), frontLabel: 'API calls', backLabel: '' }] });
          w.forEach(function (n) { hl[n] = 'ok'; });
        });
        if (cyc) {
          var bad = {}; left.forEach(function (n) { bad[n] = 'bad'; });
          f.push({ narr: H.c('r', 'Cycle!') + ' <b>' + left.join(', ') + '</b> wait for each other forever. Terraform stops with "Error: Cycle" before touching anything. Fix: break one reference (often a security group rule that points both ways - move it into a separate rule resource).', parts: [g(Object.assign({}, hl, bad))] });
        } else {
          f.push({ narr: 'All ' + order.length + ' resources created in <b>' + waves.length + '</b> waves instead of ' + order.length + ' one-by-one steps. That parallelism is why a 50-resource apply can take minutes, not an hour.', parts: [g(hl), { type: 'table', label: 'apply order', columns: ['wave', 'resources'], rows: waves.map(function (w, i) { return [String(i + 1), w.join(', ')]; }) }] });
          f.push({ narr: '<b>Destroy walks the same graph backwards</b>: users of a resource go first. The last wave is removed first, the first wave last - you cannot delete a VPC while a subnet still lives in it.', parts: [{ type: 'table', label: 'destroy order', columns: ['step', 'resources'], rows: waves.slice().reverse().map(function (w, i) { return [String(i + 1), w.join(', ')]; }) }] });
        }
        return f;
      }
    }],
    examples: [
      { title: 'Lab: run nginx with Terraform and watch a replacement', html: `<p>Apply the Docker lab, open <code>http://localhost:8080</code>, then change the image tag to <code>nginx:1.27.3-alpine</code>. The plan shows the image <code>-/+</code> and the container <code>-/+</code> because its <code>image</code> argument forces replacement. Change only <code>host_port</code> and the container is replaced too (ports cannot change on a running container). That is the safest place to learn what "forces replacement" feels like.</p>`, code: sh(C`cd docker-lab
terraform init && terraform apply -auto-approve
curl -sI http://localhost:8080 | head -1        # HTTP/1.1 200 OK
docker ps --filter name=tf-lab-web --format '{{.Names}} {{.Image}}'
terraform plan -var host_port=8081              # -/+ docker_container.web (forces replacement)
terraform destroy -auto-approve`) },
      { title: 'Hidden dependency: the instance boots before its permission exists', html: `<p>An EC2 instance's user data runs <code>aws s3 cp s3://example-config-bucket/app.conf /etc/app/</code>. It references the instance profile, but not the <code>aws_iam_role_policy_attachment</code> that grants S3 read. Terraform creates both in parallel; sometimes the instance boots first and the copy fails. The instance never uses a value of the attachment, so no reference exists - this is the textbook case for <code>depends_on</code>.</p>`, code: hcl(C`resource "aws_instance" "app" {
  ami                  = data.aws_ami.al2023.id
  instance_type        = "t3.micro"
  iam_instance_profile = aws_iam_instance_profile.app.name
  user_data            = file("@{path.module}/boot.sh")

  # The boot script needs S3 read, granted by a resource we never reference
  depends_on = [aws_iam_role_policy_attachment.app_s3_read]
}`) },
      { title: 'Two regions in one configuration', html: `<p>CloudFront only accepts certificates from <code>us-east-1</code>, while the app lives in <code>eu-west-1</code>. Declare a second <code>provider "aws"</code> with <code>alias = "use1"</code> and point just that resource at it. Modules receive aliased providers through a <code>providers = { aws = aws.use1 }</code> map.</p>`, code: hcl(C`resource "aws_acm_certificate" "cdn" {
  provider          = aws.use1             # created in us-east-1
  domain_name       = "www.example.com"
  validation_method = "DNS"
}`) },
      { title: 'Data source instead of copy-paste IDs', html: `<p>A tutorial hardcodes <code>ami = "ami-0abc..."</code>. That ID exists in one region only and goes stale. Using <code>data "aws_ami"</code> (or the SSM public parameter for Amazon Linux) always finds the current image in whatever region the provider uses. Downside: a new AMI release makes the next plan want to <b>replace</b> the instance - many teams pin the AMI in a variable for long-lived servers and update it on purpose, or add <code>lifecycle { ignore_changes = [ami] }</code> (Topic 5).</p>` }
    ],
    deepDive: `<p>🟣 <b>How providers work.</b> A provider is a separate binary; Terraform talks to it over gRPC. Each provider publishes a <b>schema</b>: every resource type, its arguments, which are required, which are computed and which force replacement. <code>validate</code> checks your code against that schema; <code>plan</code> asks the provider to compute the diff (<i>PlanResourceChange</i>), and <code>apply</code> asks it to make it happen (<i>ApplyResourceChange</i>). That is why the same Terraform core can manage AWS, a Docker daemon or a PagerDuty schedule.</p>
      <p><b>Provider addresses and mirrors.</b> <code>source = "hashicorp/aws"</code> is short for <code>registry.terraform.io/hashicorp/aws</code> (OpenTofu: <code>registry.opentofu.org/hashicorp/aws</code>). In air-gapped companies, a <code>provider_installation</code> block in the CLI config points to an internal mirror, and <code>TF_PLUGIN_CACHE_DIR</code> avoids downloading the 600 MB AWS provider into every project.</p>
      <p><b>Graph details.</b> <code>terraform graph | dot -Tsvg &gt; graph.svg</code> draws the real graph. Data sources are read during plan when their inputs are known, or deferred to apply (<code>&lt;=</code> in the plan) when they depend on something not yet created. <code>depends_on</code> on a data source forces that deferral every time and causes noisy plans - avoid it. Provider configuration can only use values known at plan time, so do not configure a provider from a resource created in the same run (for example a Kubernetes provider from a cluster created in the same apply); split into two configurations or stages.</p>
      <p><b>Credential chain order (AWS provider v5):</b> provider arguments (do not), environment variables (<code>AWS_ACCESS_KEY_ID</code> etc., set by CI or <code>aws configure export-credentials</code>), shared config/credentials files with <code>profile</code> / <code>AWS_PROFILE</code> (SSO, <code>credential_process</code>, <code>role_arn</code> chains), then container credentials (ECS/EKS) and EC2 instance metadata. An <code>assume_role { role_arn = ... }</code> block in the provider lets one pipeline identity deploy into many accounts.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> "write me Terraform for X" is now a first draft in seconds, and assistants are good at explaining a provider error like <code>UnauthorizedOperation</code> or <code>InvalidParameterCombination</code>, or at producing the <code>depends_on</code> you forgot. MCP servers for the Terraform registry let an agent look up the <i>current</i> schema of a resource instead of guessing.</p>
      <p><b>Where it goes wrong:</b> models love to "fix" authentication by putting <code>access_key</code> into the provider block, hardcode AMI IDs from another region, and add <code>depends_on</code> everywhere, which slows plans and hides real design problems. <b>How to work with it:</b> ask for references instead of <code>depends_on</code>, ask for data sources instead of literal IDs, and check every resource type against the provider docs for the version in your lock file. <b>What you still own:</b> credentials hygiene and the decision of what Terraform should manage versus only read.</p>`,
    problems: [P({
      t: 'In what order will apply create these resources?', l: 'Medium', tags: ['dependency graph', 'topological sort', 'parallelism'], co: ['HashiCorp', 'Atlassian', 'Google'],
      s: `<p>Write <code>applyWaves(resources)</code>. Each entry is <code>"name:dep1,dep2"</code> (nothing after the colon = no dependencies). Return the <b>waves</b> Terraform would run: wave 1 = every resource with no dependencies, wave 2 = every resource whose dependencies are all in earlier waves, and so on. Each wave is the names <b>sorted and joined by commas</b>. If some resources can never start because of a cycle, return <code>["cycle"]</code>. Then write the matching HCL so the real graph has the same shape.</p>`,
      c: `<p>0-500 resources; every dependency is a declared name; a resource may (wrongly) list itself. Pure computation: no cost. The HCL is a plan-only sketch using <code>terraform_data</code>, so it is also free.</p>`,
      ex: `<p><code>["vpc:","subnet:vpc","sg:vpc","instance:subnet,sg","eip:instance","bucket:"]</code> → ${H.c('g', '["bucket,vpc","sg,subnet","instance","eip"]')}. bucket and vpc need nothing; subnet and sg need only vpc; instance needs both; the Elastic IP needs the instance. Four waves instead of six serial steps.</p>`,
      bw: `<p>Create resources in the order they appear in the file and retry whatever fails. That is how hand-written scripts behave: they break as soon as someone reorders lines, waste time on failed API calls, and never run independent things in parallel. Another naive approach - repeatedly scanning all resources until nothing changes - is O(n²) and does not detect cycles cleanly.</p>`,
      q: ['Two resources reference each other (A uses B\'s ID and B uses A\'s ID). What does Terraform do?', ['Stops with a cycle error before changing anything', 'Creates A, then B, then updates A', 'Creates both in parallel', 'Picks the one declared first'], 0, 'A cycle has no valid order. Terraform detects it while building the graph and errors out. The usual fix is splitting one side into its own resource, for example a separate security-group rule.'],
      h: ['<p>Hint 1: this is a topological sort of a directed graph, done <b>level by level</b> (Kahn\'s algorithm) because each level is one parallel wave.</p>', '<p>Hint 2: count unfinished dependencies per resource (in-degree). Wave = all resources with count 0; after finishing a wave, decrement the counts of everything that depends on its members.</p>', '<p>Hint 3: if resources remain but none has count 0, there is a cycle (a self-dependency is a cycle of length one). Empty input returns an empty list. Sort each wave before joining.</p>'],
      a: `<p>Parse each entry into a name and its dependency list. Build a reverse map <i>dependency → dependents</i> and an in-degree count per resource. The first wave is every resource with in-degree 0. Process wave by wave: for each member, decrement the in-degree of its dependents; those reaching 0 form the next wave. If the waves end before every resource has been placed, the leftovers are stuck in (or behind) a cycle: return <code>["cycle"]</code>. This is exactly what Terraform's graph walker does, except that it starts a resource the moment its own dependencies finish rather than waiting for the whole wave, and caps concurrency with <code>-parallelism</code> (default 10).</p>
        <p>The HCL tab builds the same graph shape with <code>terraform_data</code> resources whose <code>input</code> references the dependencies; <code>terraform graph</code> prints it, and <code>apply</code> shows the creation order in its log.</p>`,
      hcl: C`# graph-lab/main.tf - same shape as the example, no cloud needed.
terraform {
  required_version = ">= 1.6.0"
}

resource "terraform_data" "vpc" {
  input = "vpc"
}

resource "terraform_data" "bucket" {
  input = "bucket"
}

resource "terraform_data" "subnet" {
  input = "subnet in @{terraform_data.vpc.output}"          # depends on vpc
}

resource "terraform_data" "sg" {
  input = "sg in @{terraform_data.vpc.output}"              # depends on vpc
}

resource "terraform_data" "instance" {
  input = {
    subnet = terraform_data.subnet.output                   # depends on subnet
    sg     = terraform_data.sg.output                       # and on sg
  }
}

resource "terraform_data" "eip" {
  input = terraform_data.instance.id                        # depends on instance
}`,
      sh: C`#!/usr/bin/env bash
set -euo pipefail
cd graph-lab
terraform init -input=false
terraform graph > graph.dot                   # DOT text; render with: dot -Tsvg graph.dot > graph.svg
terraform apply -auto-approve -parallelism=10 2>&1 | grep -E 'Creating|Creation complete'
terraform destroy -auto-approve 2>&1 | grep -E 'Destroying|Destruction complete'   # reverse order`,
      py: C`def apply_waves(resources):
    """Kahn's algorithm, level by level: each level is one parallel wave."""
    deps = {}
    for item in resources:
        name, _, rest = item.partition(":")
        deps[name] = [d for d in rest.split(",") if d]
    indeg = {n: len(set(ds)) for n, ds in deps.items()}     # unfinished dependencies
    users = {n: [] for n in deps}                            # dependency -> dependents
    for n, ds in deps.items():
        for d in set(ds):
            users[d].append(n)
    wave = sorted(n for n in deps if indeg[n] == 0)
    waves, placed = [], 0
    while wave:
        waves.append(",".join(wave))
        placed += len(wave)
        nxt = []
        for n in wave:
            for u in users[n]:
                indeg[u] -= 1
                if indeg[u] == 0:
                    nxt.append(u)
        wave = sorted(nxt)
    if placed < len(deps):                                   # something never became ready
        return ["cycle"]
    return waves`,
      cx: `<p>O(V + E) for the walk plus sorting each wave, O(V + E) memory. Terraform's real walk is the same complexity; wall-clock time is dominated by the slowest resource on the <b>critical path</b> (for example a database that takes 10 minutes to create).</p>`,
      f: ['With <code>-parallelism=2</code>, how long does the example take if every resource takes 1 minute?', 'Why does Terraform not need you to list resources in order in the file?'],
      tests: { sig: 'string[] -> string[]', fn: 'applyWaves', cases: [
        [[['vpc:', 'subnet:vpc', 'sg:vpc', 'instance:subnet,sg', 'eip:instance', 'bucket:']], ['bucket,vpc', 'sg,subnet', 'instance', 'eip']],
        [[['a:']], ['a']],
        [[[]], []],
        [[['a:b', 'b:a']], ['cycle']],
        [[['c:', 'b:', 'a:']], ['a,b,c']],
        [[['d:c', 'c:b', 'b:a', 'a:']], ['a', 'b', 'c', 'd']],
        [[['x:y', 'y:z', 'z:x', 'w:']], ['cycle']],
        [[['app:db,cache', 'db:net', 'cache:net', 'net:', 'dns:app']], ['net', 'cache,db', 'app', 'dns']],
        [[['a:a']], ['cycle']]
      ] }
    })]
  });

  // ───────────────────────── Topic 3: variables, locals, outputs, count vs for_each ─────────────────────────
  topics.push({
    title: 'Variables, Locals, Outputs and Expressions: count vs for_each, dynamic Blocks and Sensitive Values',
    analogy: `<p>A recipe card. <b>Variables</b> are the blanks you fill in each time ("serves ___ people"). <b>Locals</b> are the cook's own notes worked out from those blanks ("flour = people x 100 g"). <b>Outputs</b> are what you tell the table when it is ready ("dinner for 6, gluten-free"). And <b>count vs for_each</b> is the difference between labelling plates <i>1, 2, 3</i> or by the <i>guest's name</i>: if guest 2 leaves and plates are numbered, everyone after them shifts seat and gets the wrong meal; with names on the plates, only that one plate is cleared.</p>`,
    explain: `<p>🟢 <b>Input variables</b> make one configuration reusable: <code>variable "instance_type" { default = "t3.micro" }</code>, used as <code>var.instance_type</code>. Give every variable a <code>type</code> and <code>description</code>, and add <code>validation</code> blocks so bad input fails at plan time with a friendly message instead of a cryptic API error.</p>
      <p>🟢 <b>Where values come from</b>, later ones win:</p>
      ${H.table(['Priority (low → high)', 'Source', 'Typical use'], [
        ['1', '<code>default</code> in the variable block', 'safe lab values'],
        ['2', '<code>TF_VAR_name</code> environment variable', 'CI secrets injected at runtime'],
        ['3', '<code>terraform.tfvars</code>, then <code>*.auto.tfvars</code> (alphabetical)', 'per-directory settings'],
        ['4', '<code>-var-file=prod.tfvars</code>, <code>-var name=value</code> (in command-line order)', 'per-environment files, one-off overrides']
      ])}
      <p>🟢 <b>Locals</b> (<code>locals { name_prefix = "@{var.project}-@{var.env}" }</code>, used as <code>local.name_prefix</code>) give a name to a computed value so you write it once. <b>Outputs</b> publish values after apply - for humans (<code>terraform output</code>), for scripts (<code>terraform output -json</code>), and for other configurations or a parent module.</p>
      <p>🔵 <b>Many copies of one resource.</b> <code>count = 3</code> makes <code>aws_instance.web[0]</code>, <code>[1]</code>, <code>[2]</code>, addressed by <b>position</b>. <code>for_each = toset(["api", "worker"])</code> or a map makes <code>aws_instance.web["api"]</code>, addressed by <b>key</b>. Positions shift when you remove an item from the middle of a list; keys do not. Rule of thumb: <code>count</code> only for "N identical things" or an on/off switch (<code>count = var.enabled ? 1 : 0</code>); <code>for_each</code> whenever items have identity.</p>
      <p>🔵 <b>dynamic blocks</b> generate repeated <i>nested</i> blocks (ports, ingress rules, tags on some resources) from a list: <code>dynamic "ports" { for_each = var.ports; content { ... } }</code>. Use them to remove copy-paste, not to build unreadable meta-programs.</p>
      <p>🔵 <b>Secrets.</b> Mark secret inputs and outputs <code>sensitive = true</code>: Terraform then prints <code>(sensitive value)</code> in plans and logs, and refuses to show an output that uses a sensitive value unless the output is also marked sensitive. But <b>sensitive is display-only</b>: the real value is still written in plain text to the state file and to saved plan files. That is why state must be encrypted and access-controlled (next topic), and why the best secret is one Terraform never sees (let AWS generate it, as in the RDS example).</p>`,
    clues: [
      '"we removed one server from the list and Terraform wanted to destroy a different one" → <code>count</code> index shift; switch to <code>for_each</code> with <code>moved</code> blocks',
      '"same code, different sizes for dev and prod" → typed variables + one <code>.tfvars</code> per environment',
      '"the database password is printed in the CI log" → <code>sensitive = true</code> on the variable and output, and keep it out of state if possible',
      '"create the bucket only in prod" → <code>count = var.env == "prod" ? 1 : 0</code>',
      '"twelve nearly identical ingress blocks" → a <code>dynamic</code> block or <code>for_each</code> over a map of rules',
      '"invalid value for instance_type caught only after 5 minutes of apply" → <code>validation</code> blocks fail fast at plan'
    ],
    code: [hcl(C`# variables.tf - typed, documented, validated inputs
variable "project" {
  description = "Short project name used in every resource name"
  type        = string
  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{2,20}$", var.project))
    error_message = "project must be 3-21 lowercase letters, digits or dashes."
  }
}

variable "env" {
  type = string
  validation {
    condition     = contains(["dev", "staging", "prod"], var.env)
    error_message = "env must be dev, staging or prod."
  }
}

variable "servers" {
  description = "One entry per server; the KEY is its stable identity"
  type = map(object({
    size = string
    port = optional(number, 8080)        # optional attribute with a default
  }))
  default = {
    api    = { size = "small" }
    worker = { size = "small", port = 9090 }
  }
}

variable "db_password" {
  description = "Only for the lab; prefer a password the cloud generates"
  type        = string
  sensitive   = true                     # hidden in plan output and logs
  nullable    = false
}

# locals.tf - computed once, reused everywhere
locals {
  name_prefix = "@{var.project}-@{var.env}"
  is_prod     = var.env == "prod"
  common_tags = {
    project = var.project
    env     = var.env
  }
  # for expression: map of server name => external port
  ports = { for name, s in var.servers : name => s.port }
}`, 'variables.tf and locals.tf: types, validation, optional, sensitive'), hcl(C`# servers.tf - for_each with identity, a dynamic block, and outputs (Docker, no cloud)
terraform {
  required_version = ">= 1.6.0"
  required_providers {
    docker = { source = "kreuzwerker/docker", version = "~> 3.0" }
  }
}

resource "docker_image" "app" {
  name         = "nginx:1.27-alpine"
  keep_locally = true
}

resource "docker_container" "server" {
  for_each = var.servers                         # address: docker_container.server["api"]
  name     = "@{local.name_prefix}-@{each.key}"
  image    = docker_image.app.image_id
  env      = ["SIZE=@{each.value.size}"]

  # one ports block per entry in the list - here just one, but the list could grow
  dynamic "ports" {
    for_each = [each.value.port]
    content {
      internal = 80
      external = ports.value
    }
  }
}

# Only exists in prod: count as an on/off switch
resource "docker_container" "debug" {
  count = local.is_prod ? 0 : 1
  name  = "@{local.name_prefix}-debug"
  image = docker_image.app.image_id
}

output "server_names" {
  value = { for k, c in docker_container.server : k => c.name }
}

output "connection_string" {
  # Uses a sensitive variable, so the output MUST be sensitive too
  value     = "postgres://app:@{var.db_password}@db.internal:5432/app"
  sensitive = true
}`, 'servers.tf: for_each, dynamic block, count switch, sensitive output'), sh(C`# Supplying values without putting secrets in files that get committed
export TF_VAR_db_password="$(openssl rand -base64 24)"   # lab only; real secrets come from a vault
terraform plan -var-file=dev.tfvars -out=tfplan
terraform apply tfplan
terraform output server_names
terraform output -json connection_string   # deliberate reveal; never in CI logs
unset TF_VAR_db_password`, 'Passing variables: tfvars files and TF_VAR_ environment variables')],
    codeTitle: ['variables.tf and locals.tf: types, validation, optional, sensitive', 'servers.tf: for_each, dynamic block, count switch, sensitive output', 'Passing variables: tfvars files and TF_VAR_ environment variables'],
    viz: [{
      title: 'Remove one server: count shifts, for_each does not',
      input: 'servers=alpha,bravo,charlie,delta remove=bravo',
      inputLabel: 'servers = comma list (2-6 names), remove = the one to delete',
      gen: function (input) {
        var m = String(input || '').match(/servers\s*=\s*([\w,-]+)\s+remove\s*=\s*([\w-]+)/);
        if (!m) throw new Error('Use: servers=alpha,bravo,charlie remove=bravo');
        var old = m[1].split(',').filter(Boolean), gone = m[2];
        if (old.length < 2 || old.length > 6) throw new Error('Give 2-6 server names');
        var at = old.indexOf(gone);
        if (at < 0) throw new Error('"' + gone + '" is not in the list');
        var nw = old.filter(function (n) { return n !== gone; });
        var f = [];
        f.push({ narr: 'The <b>' + old.length + '</b> servers created with <code>count = length(var.servers)</code> and <code>name = var.servers[count.index]</code>. State remembers them by <b>position</b>: web[0], web[1], ... Each real server has its own disk with its own data.', parts: [{ type: 'array', label: 'count addresses in state (web[i] → real server)', values: old.slice(), showIdx: true }] });
        f.push({ narr: 'You delete <b>' + gone + '</b> from the list. The new list is shorter, and every name after position ' + at + ' moves one place to the left.', parts: [{ type: 'array', label: 'old list', values: old.slice(), hl: one(at, 'bad'), showIdx: true }, { type: 'array', label: 'new list', values: nw.slice(), hl: (function () { var h = {}; for (var i = at; i < nw.length; i++) h[i] = 'cur'; return h; })(), showIdx: true }] });
        var rows = [];
        for (var i = 0; i < old.length; i++) {
          if (i >= nw.length) rows.push(['web[' + i + ']', old[i], '(none)', '- destroy']);
          else if (old[i] !== nw[i]) rows.push(['web[' + i + ']', old[i], nw[i], '~ update (or -/+ replace)']);
          else rows.push(['web[' + i + ']', old[i], nw[i], 'no-op']);
        }
        var hlRows = {}; rows.forEach(function (r, i) { if (r[3] !== 'no-op') hlRows[i] = r[3].charAt(0) === '-' ? 'bad' : 'cur'; });
        f.push({ narr: 'Terraform compares <b>by index</b>. Every index after ' + at + ' now has a different name, so those servers are updated (renamed, and replaced if the name forces it), and the <b>last</b> index - <b>' + old[old.length - 1] + '</b>, a server nobody wanted to touch - is ' + H.c('r', 'destroyed') + '. Meanwhile the real ' + gone + ' machine survives and is relabelled.', parts: [{ type: 'table', label: 'plan with count', columns: ['address', 'was', 'becomes', 'action'], rows: rows, hl: hlRows }] });
        f.push({ narr: 'The same change with <code>for_each = toset(var.servers)</code>. State remembers servers by <b>key</b>: web["alpha"], web["bravo"], ...', parts: [{ type: 'map', label: 'for_each addresses in state', entries: old.map(function (n) { return ['web["' + n + '"]', 'server ' + n]; }) }] });
        f.push({ narr: 'Remove <b>' + gone + '</b>: only the key <code>web["' + gone + '"]</code> disappears. Every other key is unchanged, so the plan is exactly ' + H.c('g', '1 to destroy') + ', and it is the right one.', parts: [{ type: 'map', label: 'for_each addresses after', entries: old.map(function (n) { return ['web["' + n + '"]', n === gone ? 'destroy' : 'no-op']; }), hl: one('web["' + gone + '"]', 'bad') }, { type: 'vars', label: 'plan summary', vals: { count_changes: rows.filter(function (r) { return r[3] !== 'no-op'; }).length, for_each_changes: 1 }, hl: { count_changes: 'bad', for_each_changes: 'ok' } }] });
        f.push({ narr: 'Moving existing count resources to for_each without rebuilding them: one <code>moved { from = web[0] to = web["alpha"] }</code> block per server (Topic 7). Then the plan shows only moves, no destroys.', parts: [{ type: 'table', label: 'moved blocks', columns: ['from', 'to'], rows: old.map(function (n, i) { return ['web[' + i + ']', 'web["' + n + '"]']; }) }] });
        return f;
      }
    }],
    examples: [
      { title: 'Incident: the wrong server was deleted', html: `<p>A team ran three app servers with <code>count = length(var.hosts)</code> and <code>hosts = ["app-a", "app-b", "app-c"]</code>. Decommissioning <code>app-b</code>, someone removed it from the list. The plan said "1 to destroy, 1 to change"; the reviewer saw a destroy and assumed it was app-b. It was <b>app-c</b> (index 2 no longer existed), and app-b's machine was renamed to app-c. The fix that stuck: move to <code>for_each</code> with <code>moved</code> blocks, and a review rule "every destroy line in a plan must name the resource we meant to delete".</p>` },
      { title: 'One configuration, three sizes', html: `<p><code>dev.tfvars</code> sets <code>instance_type = "t3.micro"</code> and <code>min_size = 1</code>; <code>prod.tfvars</code> sets <code>"m7g.large"</code> and <code>3</code>. Same code, different values: <code>terraform plan -var-file=prod.tfvars</code>. A rule such as "no instance bigger than t3.small in dev" looks at two variables at once; Terraform 1.9+ lets a <code>validation</code> block reference other variables, and on older versions the rule belongs in policy (Topic 8).</p>`, code: hcl(C`# dev.tfvars - safe to commit: no secrets in here
env           = "dev"
instance_type = "t3.micro"
min_size      = 1

# prod.tfvars
# env           = "prod"
# instance_type = "m7g.large"
# min_size      = 3`) },
      { title: 'Functions you use every week', html: `${H.table(['Expression', 'Result'], [
        ['<code>merge(local.common_tags, { Name = "web" })</code>', 'one tag map with an extra key'],
        ['<code>lookup(var.sizes, var.env, "t3.micro")</code>', 'map lookup with a default'],
        ['<code>[for s in var.subnets : s.id if s.public]</code>', 'filter a list'],
        ['<code>aws_instance.web[*].id</code>', 'splat: all IDs of a count resource'],
        ['<code>try(var.config.port, 8080)</code>', 'first expression that does not error'],
        ['<code>templatefile("boot.sh.tftpl", { port = 8080 })</code>', 'render a script template'],
        ['<code>cidrsubnet("10.0.0.0/16", 8, 2)</code>', '<code>"10.0.2.0/24"</code> (Topic 5)']
      ])}<p>Try them interactively with <code>terraform console</code> - it evaluates expressions against your real variables and state.</p>`, code: sh(C`echo 'cidrsubnet("10.0.0.0/16", 8, 2)' | terraform console
echo '[for n in ["a","b"] : upper(n)]' | terraform console`) },
      { title: 'The password that leaked through an output', html: `<p>A module output <code>db_url</code> built from the password. Terraform 0.15+ refused to show it ("Output refers to sensitive values"), so a developer "fixed" it with <code>nonsensitive()</code>. The URL, password included, then appeared in every CI job log. Correct fixes, in order of preference: do not output secrets at all (output the secret's ARN in Secrets Manager instead); or mark the output <code>sensitive = true</code> and read it deliberately with <code>terraform output -raw db_url</code> on a trusted machine.</p>` }
    ],
    deepDive: `<p>🟣 <b>count and for_each rules.</b> Both must be known at <b>plan</b> time: <code>for_each = toset(aws_instance.x[*].id)</code> fails with "Invalid for_each argument" when the IDs are not created yet. Use keys you choose (names from variables), not IDs computed by the cloud. <code>for_each</code> accepts a map or a set of strings (convert lists with <code>toset()</code>); inside, <code>each.key</code> and <code>each.value</code>. You cannot use both on one resource. For modules, <code>count</code> and <code>for_each</code> work the same way (<code>module.vpc["eu"]</code>).</p>
      <p><b>Types.</b> <code>string</code>, <code>number</code>, <code>bool</code>, <code>list(T)</code>, <code>set(T)</code>, <code>map(T)</code>, <code>object({...})</code>, <code>tuple([...])</code>, and <code>any</code> (avoid). <code>optional(type, default)</code> inside objects (Terraform 1.3+) keeps callers short. Terraform converts types where it safely can ("5" → 5), which hides bugs; tight types plus validation catch them early.</p>
      <p><b>Sensitive values in depth.</b> Sensitivity propagates: anything computed from a sensitive value is sensitive too. Providers mark some attributes sensitive themselves (<code>aws_db_instance.password</code>). None of this encrypts anything. Newer releases add better tools: <b>ephemeral</b> variables and resources (Terraform 1.10+, OpenTofu 1.11+) whose values are never written to state or plan, and <b>write-only arguments</b> (Terraform 1.11+, for example <code>password_wo</code> on <code>aws_db_instance</code> in recent AWS provider 5.x releases) that are sent to the API but not stored. For RDS, the simplest answer is <code>manage_master_user_password = true</code>: AWS creates the password in Secrets Manager and Terraform only ever sees its ARN.</p>
      <p><b>dynamic block pitfalls.</b> The iterator is named after the block (<code>ports.value</code>), or set <code>iterator = p</code>. Dynamic blocks cannot generate <code>lifecycle</code> or <code>provisioner</code> blocks. Overusing them makes plans hard to read; for security group rules the AWS provider v5 recommends separate <code>aws_vpc_security_group_ingress_rule</code> resources with <code>for_each</code> instead of inline blocks.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> assistants are excellent at boilerplate here - writing typed variable blocks with descriptions and validations from a short spec, converting a <code>count</code> resource to <code>for_each</code> and generating the matching <code>moved</code> blocks, or writing a tricky <code>for</code> expression.</p>
      <p><b>Where it goes wrong:</b> they often reach for <code>count</code> by habit, use <code>nonsensitive()</code> to silence an error, put real-looking secrets into example <code>.tfvars</code> files, and forget that <code>for_each</code> keys must be known at plan time. <b>How to work with it:</b> ask explicitly for <code>for_each</code> with stable keys, verify every expression in <code>terraform console</code>, and grep generated code for <code>nonsensitive</code>, <code>password =</code> and literal keys before committing. <b>What you still own:</b> choosing identities (keys) that will stay stable for years, and where secrets live.</p>`,
    problems: [P({
      t: 'Predict the damage: count vs for_each address mapping', l: 'Medium', tags: ['count', 'for_each', 'state addresses'], co: ['HashiCorp', 'Spotify', 'Shopify'],
      s: `<p>A server list changes from <code>old</code> to <code>new</code>. Write <code>countVsForEach(old, new, useForEach)</code> returning the plan actions for resource <code>web</code>. With <code>count</code> (<code>useForEach = false</code>) addresses are positions: for each index, <code>"update web[i]"</code> if the name at that index changed, <code>"create web[i]"</code> for indexes only in <code>new</code>, <code>"destroy web[i]"</code> for indexes only in <code>old</code>, in index order. With <code>for_each</code> addresses are names: <code>'create web["k"]'</code> or <code>'destroy web["k"]'</code>, sorted by key. Unchanged addresses produce nothing. Then write the HCL migration from count to for_each that destroys nothing.</p>`,
      c: `<p>0-1000 unique names per list. Pure computation, no cost. The migration HCL uses <code>moved</code> blocks and the Docker provider (free).</p>`,
      ex: `<p>old <code>["a","b","c"]</code>, new <code>["a","c"]</code>. count → ${H.c('r', '["update web[1]","destroy web[2]"]')}: index 1 changes b→c, and index 2 (the real <b>c</b>!) is destroyed. for_each → ${H.c('g', 'one action: destroy web["b"]')}: exactly the server you removed.</p>`,
      bw: `<p>"Just remove the item and read the plan summary": the summary says <i>1 to change, 1 to destroy</i> either way and does not say <b>which</b> machine is destroyed. Teams that only read the summary line are the ones who delete the wrong server. Another bad fix is <code>terraform state rm</code> on the wrong index, which orphans a real, still-billed server.</p>`,
      q: ['You need 3 servers named api, worker and cron that will be added and removed independently over time. Which meta-argument?', ['<code>for_each</code> over a set or map of names', '<code>count = 3</code>', '<code>count = length(var.names)</code>', '<code>depends_on</code>'], 0, 'Items with identity need stable keys. With count, removing an item from the middle shifts every later index and changes or destroys servers you did not mean to touch.'],
      h: ['<p>Hint 1: count compares <b>old[i] with new[i]</b> position by position; for_each compares <b>sets of names</b>.</p>', '<p>Hint 2: for count loop <code>i</code> from 0 to <code>max(len(old), len(new)) - 1</code>; for for_each take the sorted union of names and emit create/destroy for names in only one side.</p>', '<p>Hint 3: the address string for for_each contains double quotes: <code>web["b"]</code>. Empty lists are valid. Same lists produce an empty plan in both modes.</p>'],
      a: `<p><b>count:</b> walk indexes 0..max(len)-1. Where both lists have an element and they differ, the resource at that index gets new arguments: update (or replace, if the name forces it). Indexes beyond the new length are destroyed, indexes beyond the old length are created. <b>for_each:</b> the address is the key itself, so only names that appear or disappear produce actions. That is the whole reason to prefer for_each for anything with identity.</p>
        <p><b>Migration without downtime:</b> change the resource to <code>for_each = toset(var.servers)</code> and add one <code>moved</code> block per existing index, mapping <code>web[i]</code> to <code>web["name"]</code>. The plan then shows "has moved to" lines and <b>0 to destroy</b>. Apply that first, and only then remove the unwanted server in a separate change - one intent per plan.</p>`,
      hcl: C`# Step 1: switch count -> for_each and record where every existing object goes.
variable "servers" {
  type    = list(string)
  default = ["a", "b", "c"]
}

resource "docker_container" "web" {
  for_each = toset(var.servers)                 # was: count = length(var.servers)
  name     = "web-@{each.key}"                   # was: "web-@{var.servers[count.index]}"
  image    = docker_image.app.image_id
}

# One block per old index. Plan shows "has moved to", no destroys.
moved {
  from = docker_container.web[0]
  to   = docker_container.web["a"]
}
moved {
  from = docker_container.web[1]
  to   = docker_container.web["b"]
}
moved {
  from = docker_container.web[2]
  to   = docker_container.web["c"]
}

# Step 2 (a separate PR, after step 1 is applied): remove "b" from var.servers.
# The plan is then exactly: docker_container.web["b"] will be destroyed.`,
      sh: C`#!/usr/bin/env bash
set -euo pipefail
terraform plan -out=tfplan
# Prove nothing is destroyed before applying the refactor
terraform show -json tfplan | jq -e '[.resource_changes[] | select(.change.actions | index("delete"))] | length == 0'
terraform apply tfplan
terraform state list | grep docker_container.web   # web["a"] web["b"] web["c"]`,
      py: C`def count_vs_for_each(old, new, use_for_each):
    """Plan actions for resource 'web' when its name list changes from old to new."""
    actions = []
    if not use_for_each:
        for i in range(max(len(old), len(new))):        # addresses are positions
            if i >= len(new):
                actions.append("destroy web[%d]" % i)
            elif i >= len(old):
                actions.append("create web[%d]" % i)
            elif old[i] != new[i]:
                actions.append("update web[%d]" % i)
        return actions
    before, after = set(old), set(new)                  # addresses are names
    for k in sorted(before | after):
        if k not in after:
            actions.append('destroy web["%s"]' % k)
        elif k not in before:
            actions.append('create web["%s"]' % k)
    return actions`,
      cx: `<p>O(n) for count, O(n log n) for for_each (sorting keys). The real cost is human: with count, one removal can touch up to n resources; with for_each, exactly one.</p>`,
      f: ['What happens with count if you add a server at the <b>start</b> of the list?', 'How would you migrate 200 servers from count to for_each without writing 200 moved blocks by hand?'],
      tests: { sig: 'string[] string[] bool -> string[]', fn: 'countVsForEach', cases: [
        [[['a', 'b', 'c'], ['a', 'c'], false], ['update web[1]', 'destroy web[2]']],
        [[['a', 'b', 'c'], ['a', 'c'], true], ['destroy web["b"]']],
        [[['a', 'b'], ['a', 'b', 'c'], false], ['create web[2]']],
        [[['a', 'b'], ['a', 'b', 'c'], true], ['create web["c"]']],
        [[[], ['x'], false], ['create web[0]']],
        [[['a', 'b', 'c'], ['b', 'c'], false], ['update web[0]', 'update web[1]', 'destroy web[2]']],
        [[['a', 'b', 'c'], ['z', 'a', 'b', 'c'], false], ['update web[0]', 'update web[1]', 'update web[2]', 'create web[3]']],
        [[['a', 'b', 'c'], ['z', 'a', 'b', 'c'], true], ['create web["z"]']],
        [[['a'], [], true], ['destroy web["a"]']],
        [[['b', 'c'], ['a', 'd'], true], ['create web["a"]', 'destroy web["b"]', 'destroy web["c"]', 'create web["d"]']],
        [[['a', 'b'], ['a', 'b'], false], []]
      ] }
    })]
  });

  // ───────────────────────── Topic 4: state, remote backends and locking ─────────────────────────
  topics.push({
    title: 'State, Remote Backends and Locking: One Source of Truth, Two Engineers, Zero Leaked Secrets',
    analogy: `<p>A shared <b>notebook at the hardware store's tool hire desk</b> listing every tool lent out and to whom. If each clerk kept a private copy, two clerks would lend the same drill twice. So there is one notebook on the desk (the <b>remote backend</b>), and whoever is writing in it holds the <b>pen</b> (the <b>lock</b>); the other clerk waits a minute. And because the notebook contains customers' phone numbers and addresses (<b>secrets in state</b>), it stays in a locked drawer, not photocopied into the shop window (Git).</p>`,
    explain: `<p>🟢 <b>What state is.</b> <code>terraform.tfstate</code> is a JSON file mapping each resource address (<code>aws_instance.web</code>) to the real object's ID (<code>i-0abc...</code>) and <b>all of its attributes</b>. Without it Terraform cannot know that <i>this</i> block owns <i>that</i> server; it would try to create everything again. It also caches attributes so plans are fast, and records dependencies so it can destroy in the right order after you delete the code.</p>
      <p>🟢 <b>Why the default local file is not enough for a team.</b> (1) It lives on one laptop - lose the laptop, lose track of production. (2) Two people with two copies drift apart. (3) Two applies at the same moment corrupt each other's changes. (4) It contains <b>secrets in plain text</b>: database passwords, private keys generated by <code>tls_private_key</code>, tokens - even ones you marked <code>sensitive</code>.</p>
      <p>🟢 <b>Rules:</b> never commit <code>terraform.tfstate</code> or <code>*.tfstate.backup</code>; never edit it by hand; keep it in a <b>remote backend</b> that is encrypted, versioned, access-restricted and <b>locked</b> during writes.</p>
      <p>🔵 <b>The S3 backend</b> stores state as an object in a bucket. Since <b>Terraform 1.10</b> it can lock natively with a lock file next to the state (<code>use_lockfile = true</code>, which uses S3 conditional writes; generally available from 1.11). Older setups used a <b>DynamoDB table</b> (<code>dynamodb_table = "terraform-locks"</code> with a <code>LockID</code> string key); that option is now deprecated, and you can enable both during a migration. OpenTofu 1.10+ supports <code>use_lockfile</code> as well. Other backends: <code>azurerm</code> (blob lease locking), <code>gcs</code>, HCP Terraform / Terraform Enterprise (<code>cloud</code> block), and Kubernetes or PostgreSQL for special cases.</p>
      ${H.table(['Protection', 'How on S3', 'Why'], [
        ['Encryption at rest', '<code>encrypt = true</code>, bucket default SSE-KMS', 'state holds secrets'],
        ['Access control', 'IAM: only the CI role and a break-glass admin role can read/write the key', 'reading state = reading every secret'],
        ['Locking', '<code>use_lockfile = true</code> (or legacy DynamoDB)', 'two applies at once corrupt state'],
        ['History', 'bucket versioning', 'roll back a broken state'],
        ['No public access', 'Block Public Access on', 'obviously'],
        ['Not in Git', '<code>.gitignore</code>', 'Git history keeps secrets forever']
      ])}
      <p>🔵 <b>The bootstrap problem.</b> The bucket that stores state must exist before any configuration can use it. Common answer: a tiny <code>bootstrap/</code> configuration with local state creates the bucket (versioning, encryption, public access block, <code>prevent_destroy</code>), then every other configuration points its backend at it. Backend blocks cannot use variables, so per-environment values come from <code>-backend-config</code> files.</p>`,
    clues: [
      '"two engineers applied at the same time and resources vanished from state" → no locking; remote backend with <code>use_lockfile = true</code>',
      '"Error acquiring the state lock" → someone else is applying, or a crashed run left a lock; check before <code>terraform force-unlock</code>',
      '"we found terraform.tfstate in our GitHub repo" → secrets leaked: rotate them, purge history, move state to an encrypted backend, add <code>.gitignore</code>',
      '"DynamoDB table for Terraform locks" → the legacy S3 locking; Terraform 1.10+ does it with a lock file in S3',
      '"backend configuration cannot contain variables" → partial configuration with <code>-backend-config=env/prod.hcl</code>',
      '"state got corrupted after a bad apply" → restore the previous object version from the versioned bucket'
    ],
    code: [hcl(C`# bootstrap/main.tf - run ONCE per account with local state; creates the state bucket.
# Cost note: an S3 bucket with a few small state files costs cents per month.
terraform {
  required_version = ">= 1.10.0"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
}

provider "aws" {
  region = "eu-west-1"                   # credentials: AWS_PROFILE / SSO, never keys in code
}

resource "aws_s3_bucket" "state" {
  bucket = "example-tfstate-123456789012-euw1"   # globally unique name
  lifecycle {
    prevent_destroy = true               # "terraform destroy" refuses to delete it
  }
}

resource "aws_s3_bucket_versioning" "state" {
  bucket = aws_s3_bucket.state.id
  versioning_configuration {
    status = "Enabled"                   # every write keeps the previous version
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "state" {
  bucket = aws_s3_bucket.state.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "aws:kms"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "state" {
  bucket                  = aws_s3_bucket.state.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}`, 'bootstrap: the encrypted, versioned state bucket'), hcl(C`# app/backend.tf - every other configuration stores state remotely
terraform {
  required_version = ">= 1.10.0"

  backend "s3" {
    bucket       = "example-tfstate-123456789012-euw1"
    key          = "network/prod/terraform.tfstate"   # one key per state
    region       = "eu-west-1"
    encrypt      = true
    use_lockfile = true      # native S3 locking: writes network/prod/terraform.tfstate.tflock

    # Legacy (Terraform < 1.10, deprecated now): a DynamoDB table with a
    # string partition key named "LockID".
    # dynamodb_table = "terraform-locks"
  }
}`, 'backend "s3" with native lockfile locking'), sh(C`#!/usr/bin/env bash
# Moving an existing local state into the new backend, safely.
set -euo pipefail
cp terraform.tfstate "backup-$(date +%Y%m%d%H%M).tfstate"   # keep this file somewhere private
terraform init -migrate-state      # answers "yes" to copy local state to S3
terraform plan                     # must say: No changes
rm terraform.tfstate terraform.tfstate.backup                # the remote copy is now the truth

# Everyday state commands (read-only ones first)
terraform state list
terraform state show aws_instance.web
terraform state pull > /tmp/peek.tfstate && chmod 600 /tmp/peek.tfstate

# Only when you are SURE nobody is running (the error message prints the lock ID)
terraform force-unlock 6f1c2d7e-1234-4bcd-9a10-abcdef012345`, 'Migrating to the backend and everyday state commands'), { lang: 'text', code: C`# .gitignore for every Terraform repository
.terraform/
*.tfstate
*.tfstate.*
*.tfplan
tfplan
crash.log
crash.*.log
override.tf
override.tf.json
*_override.tf
# tfvars files that hold secrets; commit only non-secret ones such as dev.tfvars
secrets.auto.tfvars
*.secret.tfvars
# DO commit: .terraform.lock.hcl` }],
    codeTitle: ['bootstrap: the encrypted, versioned state bucket', 'backend "s3" with native lockfile locking', 'Migrating to the backend and everyday state commands', '.gitignore: state, plans, provider cache and secret tfvars'],
    viz: [{
      title: 'Two engineers apply at the same moment',
      input: 'locking=on',
      inputLabel: 'locking=on or locking=off',
      gen: function (input) {
        var m = String(input || '').match(/locking\s*=\s*(on|off)/i);
        if (!m) throw new Error('Use: locking=on or locking=off');
        var on = m[1].toLowerCase() === 'on';
        var nodes = [box('a', 'Asha (adds bucket)', 15, 10, 24), box('b', 'Ben (adds queue)', 15, 50, 24), box('s3', 'S3: state serial 41', 65, 30, 26), box('lk', 'lock file', 92, 30, 14)];
        function g(label, hl, ehl, edges) { return { type: 'graph', label: label, directed: true, height: 60, nodes: nodes.map(function (n) { return n.id === 's3' ? box('s3', label, 65, 30, 26) : n; }), edges: edges, hl: hl, ehl: ehl || {} }; }
        var rows = [], f = [];
        function t(r, cls) { rows.push(r); var h = {}; if (cls) h[rows.length - 1] = cls; return { type: 'table', label: 'timeline', columns: ['time', 'Asha', 'Ben'], rows: rows.map(function (x) { return x.slice(); }), hl: h }; }
        f.push({ narr: 'State in S3 is at <b>serial 41</b> (every write increases the serial). Asha adds a bucket, Ben adds a queue, in different branches. Both type <code>terraform apply</code> at 10:00.', parts: [g('S3: state serial 41', {}, {}, [['a', 's3'], ['b', 's3']]), t(['10:00', 'apply', 'apply'])] });
        if (on) {
          f.push({ narr: 'Asha\'s run is a few milliseconds faster: it creates <code>terraform.tfstate.tflock</code> with a <b>conditional write</b> ("only if it does not exist"). It succeeds - Asha holds the lock.', parts: [g('S3: state serial 41', { a: 'ok', lk: 'cur' }, { 'a-lk': 'ok' }, [['a', 'lk'], ['b', 's3']]), t(['10:00:01', 'lock acquired', ''], 'ok')] });
          f.push({ narr: 'Ben\'s run tries the same conditional write and fails, because the lock file exists. Terraform stops <b>before reading or changing anything</b>: "Error acquiring the state lock ... Lock Info: Who: asha@laptop, Operation: OperationTypeApply". Nothing is damaged.', parts: [g('S3: state serial 41', { a: 'ok', b: 'bad', lk: 'cur' }, { 'b-lk': 'bad' }, [['a', 'lk'], ['b', 'lk']]), t(['10:00:01', '', 'Error acquiring the state lock'], 'bad')] });
          f.push({ narr: 'Asha\'s apply creates the bucket and writes state <b>serial 42</b>, then deletes the lock file.', parts: [g('S3: state serial 42', { a: 'ok', s3: 'ok' }, { 'a-s3': 'ok' }, [['a', 's3']]), t(['10:02', 'state 42 written, lock released', ''], 'ok')] });
          f.push({ narr: 'Ben runs again (or used <code>-lock-timeout=5m</code> to wait automatically). His plan now reads serial 42, sees Asha\'s bucket as existing, and only adds the queue. State goes to <b>serial 43</b> containing both changes.', parts: [g('S3: state serial 43', { b: 'ok', s3: 'ok' }, { 'b-s3': 'ok' }, [['b', 's3']]), t(['10:03', '', 'plan: 1 to add (queue), state 43'], 'ok')] });
          f.push({ narr: H.c('g', 'Safe.') + ' The lock turns two simultaneous writers into a queue. If a run crashes while holding the lock, the lock file stays; <code>terraform force-unlock LOCK_ID</code> removes it - but only after confirming nobody is still running.', parts: [{ type: 'vars', label: 'result', vals: { final_serial: 43, bucket_in_state: 'yes', queue_in_state: 'yes' }, hl: { final_serial: 'ok' } }] });
        } else {
          f.push({ narr: 'No lock. Both runs read state serial 41 at the same time, so both plans are based on the same old picture.', parts: [g('S3: state serial 41', { a: 'cur', b: 'cur' }, { 'a-s3': 'cur', 'b-s3': 'cur' }, [['a', 's3'], ['b', 's3']]), t(['10:00:01', 'read state 41', 'read state 41'], 'cur')] });
          f.push({ narr: 'Asha\'s apply creates the bucket and writes state 42 = <b>41 + bucket</b>.', parts: [g('S3: state serial 42', { a: 'ok' }, { 'a-s3': 'ok' }, [['a', 's3']]), t(['10:02', 'write 42 (41 + bucket)', ''], 'ok')] });
          f.push({ narr: 'Ben\'s apply creates the queue and writes <b>41 + queue</b>, also numbered serial 42. The backend simply stores the new object, so his write <b>replaces</b> Asha\'s. Her bucket still exists in AWS, but it is ' + H.c('r', 'gone from state') + '.', parts: [g('S3: state 42 (bucket lost)', { b: 'bad', s3: 'bad' }, { 'b-s3': 'bad' }, [['b', 's3']]), t(['10:03', '', 'write 42 (41 + queue)'], 'bad')] });
          f.push({ narr: H.c('r', 'Lost update.') + ' Next plan: the bucket is not in state, so Terraform tries to <b>create it again</b> and fails with BucketAlreadyOwnedByYou; meanwhile nobody manages the real bucket. Recovery: <code>terraform import</code> the bucket (Topic 7) or restore the right state version. Prevention: locking.', parts: [{ type: 'vars', label: 'result', vals: { final_serial: 42, bucket_in_state: 'NO (orphaned)', queue_in_state: 'yes' }, hl: { bucket_in_state: 'bad' } }] });
        }
        return f;
      }
    }],
    examples: [
      { title: 'Secret leak: state committed to Git', html: `<p>A junior engineer ran <code>git add .</code> in a Terraform folder with local state. The repo was public for a week. The state contained an RDS master password and a <code>tls_private_key</code>. Response: (1) treat every secret in the file as <b>compromised</b> and rotate it now; (2) remove the file from history (<code>git filter-repo</code>) and ask the host to purge caches - but rotation matters more, because forks and clones may already exist; (3) move state to the S3 backend; (4) add the <code>.gitignore</code> and a pre-commit secret scanner (gitleaks or trufflehog). Root cause in the review: "local state" was the default nobody changed.</p>`, code: sh(C`# Find state or plan files that were ever committed
git log --all --diff-filter=A --name-only --format= | grep -E '\.tfstate|tfplan' | sort -u
# Check what is staged right now, before it is too late
git status --porcelain | grep -E 'tfstate|\.terraform/' && echo "STOP: state or cache staged"`) },
      { title: 'Partial backend configuration per environment', html: `<p>A backend block cannot use <code>var.env</code>. Keep the shared settings in code and the per-environment key in small files, chosen at <code>init</code> time. The same code then points at different states for staging and prod.</p>`, code: sh(C`# env/staging.s3.tfbackend contains:  key = "app/staging/terraform.tfstate"
# env/prod.s3.tfbackend    contains:  key = "app/prod/terraform.tfstate"
terraform init -reconfigure -backend-config=env/staging.s3.tfbackend
terraform plan -var-file=staging.tfvars`) },
      { title: 'Recovering a broken state from S3 versioning', html: `<p>After a failed manual <code>terraform state rm</code> the state lost twenty resources. Because the bucket is versioned, list the versions of the key, download the one from before the mistake, check it, and push it back. <code>state push</code> refuses an older serial unless forced, which is exactly the moment to double-check with a colleague.</p>`, code: sh(C`aws s3api list-object-versions --bucket example-tfstate-123456789012-euw1 \
  --prefix app/prod/terraform.tfstate --query 'Versions[].[VersionId,LastModified]' --output table
aws s3api get-object --bucket example-tfstate-123456789012-euw1 \
  --key app/prod/terraform.tfstate --version-id "EXAMPLEVERSIONID" restore.tfstate
jq '.serial, (.resources | length)' restore.tfstate
terraform state push -force restore.tfstate   # only with a second person watching
terraform plan                                # expect No changes, or only the intended ones`) },
      { title: 'Restricting who can read state', html: `<p>Anyone who can <code>s3:GetObject</code> the state key can read every secret in it. A bucket policy (or IAM policy) gives read/write only to the CI deploy role and a break-glass admin role, scoped to the prefix, and allows the lock file operations. Developers plan through CI or with a read-only role that cannot read prod state at all.</p>`, code: { lang: 'json', code: C`{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "StateAccessForDeployRoleOnly",
      "Effect": "Allow",
      "Principal": { "AWS": "arn:aws:iam::123456789012:role/terraform-deploy" },
      "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::example-tfstate-123456789012-euw1/app/prod/*"
    },
    {
      "Sid": "ListForDeployRole",
      "Effect": "Allow",
      "Principal": { "AWS": "arn:aws:iam::123456789012:role/terraform-deploy" },
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::example-tfstate-123456789012-euw1"
    }
  ]
}` } }
    ],
    deepDive: `<p>🟣 <b>Inside the state file.</b> Top-level fields: <code>version</code> (format, currently 4), <code>terraform_version</code>, <code>serial</code> (increments on every write), <code>lineage</code> (a UUID fixed when the state was born - Terraform refuses to overwrite a state with a different lineage, which catches pointing two configurations at one key), <code>outputs</code>, and <code>resources</code> with <code>mode</code>, <code>type</code>, <code>name</code>, <code>provider</code> and <code>instances[].attributes</code>. Read it with <code>terraform show -json</code> rather than parsing the raw file, whose layout is not a stable API.</p>
      <p><b>How native S3 locking works.</b> S3 added conditional writes (<code>If-None-Match: *</code>) in 2024: a PUT that succeeds only if the object does not exist. Terraform writes <code>&lt;key&gt;.tflock</code> that way, holds it during the operation and deletes it after. That removed the need for a second service (DynamoDB) just for a mutex. The lock protects <b>writes</b>; <code>plan</code> also takes the lock by default (use <code>-lock=false</code> only for read-only checks you understand), and <code>-lock-timeout=5m</code> waits instead of failing.</p>
      <p><b>How big should one state be?</b> One state per <i>blast radius</i> and per <i>rate of change</i>: networking (rarely changes, high impact) separate from the app (changes daily); prod separate from staging. Huge states mean slow plans, wide lock contention and terrifying blast radius; tiny states mean many cross-references. Configurations share values through outputs read by <code>data "terraform_remote_state"</code> (needs read access to the whole other state, including its secrets) or, better, through published values such as SSM parameters or data-source lookups by tag.</p>
      <p><b>Encryption beyond S3.</b> SSE-KMS protects the object at rest in AWS, but anyone with <code>GetObject</code> and <code>kms:Decrypt</code> reads it in clear text. <b>OpenTofu 1.7+</b> offers client-side <b>state encryption</b> (state and plan files encrypted with a key from KMS, a passphrase or another provider before they leave the machine) - a notable difference from Terraform. HCP Terraform encrypts state with Vault-managed keys and controls access per workspace.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> an assistant writes the bootstrap configuration, the bucket policy and the backend block in a minute, and is good at decoding a lock error message or a "state serial mismatch". Some teams let an agent answer "what does state say about X?" by running <code>terraform state show</code>.</p>
      <p><b>Where it goes wrong:</b> generated backends still often use the DynamoDB table (training data predates 1.10), and "fixes" suggested for lock errors are frequently <code>-lock=false</code> or an immediate <code>force-unlock</code>, which is how two runs end up writing at once. Worse: pasting a state file into a chat to "debug" it hands every secret inside it to a third party. <b>How to work with it:</b> share <code>terraform state list</code> or a redacted <code>state show</code>, never the file; check the lock holder (the error prints who and when) before unlocking. <b>What you still own:</b> who can read state, and the decision to break a lock.</p>`,
    problems: [P({
      t: 'Give a two-person team safe shared state', l: 'Medium', tags: ['state', 'S3 backend', 'locking', 'secrets'], co: ['Amazon', 'Thoughtworks', 'Revolut'],
      s: `<p>Asha and Ben manage a small AWS setup with Terraform using <b>local state</b> on Asha's laptop. Last week they both applied at once and lost a bucket from state; the state also contains the RDS master password. Design and implement the fix: a remote backend with locking, encryption, versioning and restricted access; migrate the existing state without recreating anything; stop secrets leaking through state and Git; and give them a routine for lock errors.</p>`,
      ex: `<p>After the change: Ben's simultaneous apply fails fast with ${H.c('y', 'Error acquiring the state lock')} instead of corrupting state; <code>git status</code> never shows <code>terraform.tfstate</code>; a bad state can be rolled back from S3 versions; and the database password is managed by AWS (only its secret ARN is in state).</p>`,
      bw: `<p>Commit <code>terraform.tfstate</code> to Git "so both have it". Git does not lock (two people still apply at once and then hit merge conflicts in a JSON file), and the password is now in Git history forever. Copying the file by Slack is the same mistake with less history.</p>`,
      q: ['Which backend setting gives S3 native state locking in Terraform 1.10+?', ['<code>use_lockfile = true</code>', '<code>dynamodb_table = "locks"</code>', '<code>encrypt = true</code>', '<code>lock = "s3"</code>'], 0, '<code>use_lockfile</code> writes a .tflock object with an S3 conditional write. <code>dynamodb_table</code> is the older, now-deprecated mechanism; <code>encrypt</code> is about encryption, not locking.'],
      h: ['<p>Hint 1: the bucket that holds state cannot be created by the configuration that stores its state there - bootstrap it separately, protect it with <code>prevent_destroy</code>.</p>', '<p>Hint 2: <code>terraform init -migrate-state</code> copies local state into a new backend; afterwards <code>plan</code> must show no changes.</p>', '<p>Hint 3: sensitive does not keep values out of state. Remove the secret from Terraform\'s hands (<code>manage_master_user_password</code>), restrict who can read the key, ignore state in Git, and rotate the old password because it was exposed.</p>'],
      a: `<p><b>1. Bootstrap</b> a state bucket with versioning, SSE-KMS, Block Public Access and <code>prevent_destroy</code> (the Topic code). <b>2. Backend</b>: add <code>backend "s3"</code> with <code>use_lockfile = true</code> and <code>encrypt = true</code>, back up the local file, run <code>terraform init -migrate-state</code>, confirm <code>terraform plan</code> says <i>No changes</i>, delete the local copies. <b>3. Repair the lost bucket</b> with an <code>import</code> block so it is managed again. <b>4. Secrets</b>: switch RDS to <code>manage_master_user_password = true</code> so AWS keeps the password in Secrets Manager; rotate the old password because it has been sitting in a laptop file; mark any remaining secret variables and outputs <code>sensitive</code>. <b>5. Access</b>: only the deploy role (and break-glass admin) may read/write the state prefix. <b>6. Git</b>: add the <code>.gitignore</code>, a gitleaks pre-commit hook, and commit <code>.terraform.lock.hcl</code>. <b>7. Routine for lock errors</b>: read the lock info (who, when, operation), ask that person, wait or use <code>-lock-timeout</code>; <code>force-unlock</code> only when the run is known to be dead. Longer term both apply only from CI, so the pipeline serialises applies anyway.</p>`,
      hcl: C`terraform {
  required_version = ">= 1.10.0"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
  backend "s3" {
    bucket       = "example-tfstate-123456789012-euw1"
    key          = "shop/prod/terraform.tfstate"
    region       = "eu-west-1"
    encrypt      = true
    use_lockfile = true
  }
}

provider "aws" {
  region = "eu-west-1"
}

# Re-adopt the bucket that the lost update dropped from state
import {
  to = aws_s3_bucket.uploads
  id = "example-shop-uploads-123456789012"
}

resource "aws_s3_bucket" "uploads" {
  bucket = "example-shop-uploads-123456789012"
}

# The password never passes through Terraform: AWS generates it and stores
# it in Secrets Manager. Cost note: db.t4g.micro is free-tier eligible on
# older accounts; otherwise roughly $12-15/month plus storage. Destroy labs.
resource "aws_db_instance" "shop" {
  identifier                  = "shop-prod"
  engine                      = "postgres"
  engine_version              = "16"
  instance_class              = "db.t4g.micro"
  allocated_storage           = 20
  username                    = "shop_admin"
  manage_master_user_password = true
  storage_encrypted           = true
  skip_final_snapshot         = false
  final_snapshot_identifier   = "shop-prod-final"
  deletion_protection         = true
}

output "db_secret_arn" {
  description = "Where the password lives; the password itself is never output"
  value       = aws_db_instance.shop.master_user_secret[0].secret_arn
}`,
      sh: C`#!/usr/bin/env bash
set -euo pipefail
export AWS_PROFILE=lab
cp terraform.tfstate "/secure/backup-$(date +%s).tfstate"
terraform init -migrate-state -input=false
terraform plan -out=tfplan        # expect: import 1 bucket, update the DB password management
terraform apply tfplan
rm -f terraform.tfstate terraform.tfstate.backup tfplan

printf '.terraform/\n*.tfstate\n*.tfstate.*\ntfplan\n*.secret.tfvars\n' >> .gitignore
git add .gitignore .terraform.lock.hcl *.tf
git commit -m "Move state to encrypted S3 backend with locking"

# When a lock error appears: read who holds it, then wait instead of breaking it
terraform plan -lock-timeout=5m`,
      cx: `<p>One-off setup of about an hour. Running cost: cents per month for S3 (and nothing for locking, which used to need a DynamoDB table). The removed risks - lost state, corrupted state, leaked passwords - are the most expensive Terraform incidents there are.</p>`,
      f: ['How would you share the VPC ID from the network state with the app state without giving the app read access to network secrets?', 'When is <code>terraform force-unlock</code> the right call, and what do you check first?']
    })]
  });

  // ───────────────────────── Topic 5: a real AWS network as code + lifecycle ─────────────────────────
  topics.push({
    title: 'A Real Network as Code: VPC, Subnets with cidrsubnet, Security Groups and lifecycle Rules',
    analogy: `<p>Planning a new housing estate. The council gives you one big plot (the <b>VPC</b>, say 10.0.0.0/16). You divide it into equal streets (<b>subnets</b>) with a simple rule - "street number N starts at house N x 256" - which is exactly what <code>cidrsubnet</code> calculates. Some streets face the main road (<b>public subnets</b> with a route to the internet gateway), others are quiet cul-de-sacs (<b>private</b>). Each house has a door policy (<b>security group</b>). And some buildings have special rules: the school must never be knocked down (<code>prevent_destroy</code>), and when you rebuild the shop you open the new one <i>before</i> closing the old (<code>create_before_destroy</code>).</p>`,
    explain: `<p>🟢 In Cloud &amp; DevOps 6 you built a <b>two-tier network</b> by hand: a VPC, public and private subnets in two Availability Zones, an internet gateway, route tables, maybe a NAT gateway, and security groups where the database only accepts traffic from the web tier. Here you write the same thing as code, so it can be reviewed, rebuilt in another region and destroyed cleanly after the lab.</p>
      <p>🟢 <b>Subnet maths with <code>cidrsubnet(prefix, newbits, netnum)</code>.</b> Take the VPC range, add <code>newbits</code> bits to its prefix length, and return block number <code>netnum</code>. For <code>10.0.0.0/16</code> with 8 new bits you get /24 blocks of 256 addresses: netnum 0 → <code>10.0.0.0/24</code>, 1 → <code>10.0.1.0/24</code>, 10 → <code>10.0.10.0/24</code>. A common pattern: public subnets use netnums 0, 1, 2 and private ones 10, 11, 12 - or let a <code>for</code> expression compute them from the list of AZs so nothing is typed by hand.</p>
      ${H.table(['VPC', 'newbits', 'subnet size', 'how many', 'netnum 3 is'], [
        ['10.0.0.0/16', '8', '/24 (256 addresses, 251 usable on AWS)', '256', '10.0.3.0/24'],
        ['10.0.0.0/16', '4', '/20 (4096)', '16', '10.0.48.0/20'],
        ['10.20.0.0/20', '4', '/24', '16', '10.20.3.0/24'],
        ['192.168.0.0/24', '2', '/26 (64)', '4', '192.168.0.192/26']
      ])}
      <p>🔵 <b>Security groups in AWS provider v5.</b> Prefer one <code>aws_security_group</code> plus separate <code>aws_vpc_security_group_ingress_rule</code> / <code>egress_rule</code> resources (one rule each). Inline <code>ingress { }</code> blocks still work, but mixing both styles on one group makes Terraform fight itself, and separate rules give cleaner plans and avoid cycles between groups that reference each other.</p>
      <p>🔵 <b>The lifecycle block</b> changes how Terraform handles a resource:</p>
      ${H.table(['Setting', 'Effect', 'Use it for'], [
        ['<code>create_before_destroy = true</code>', 'build the replacement first, then delete the old one', 'launch templates, certificates, anything in use (needs unique names, e.g. <code>name_prefix</code>)'],
        ['<code>prevent_destroy = true</code>', 'any plan that would destroy it fails', 'databases, state buckets, KMS keys'],
        ['<code>ignore_changes = [tags["LastScan"], desired_capacity]</code>', 'do not undo changes made outside Terraform to these attributes', 'values another system owns (autoscaling, security scanners)'],
        ['<code>replace_triggered_by = [terraform_data.release]</code>', 'replace when something else changes', 'restart a server when a config version bumps']
      ])}
      <p>🔵 <b>Cost notes for this lab.</b> VPCs, subnets, route tables, internet gateways and security groups are <b>free</b>. A <b>NAT gateway is not</b>: roughly $0.045 per hour (about $32 per month) plus per-GB processing, per AZ, and public IPv4 addresses cost about $0.005 per hour each. The code makes the NAT gateway optional and off by default. Run <code>terraform destroy</code> when you finish.</p>`,
    clues: [
      '"split 10.0.0.0/16 into a /24 per AZ" → <code>cidrsubnet(var.vpc_cidr, 8, index)</code> in a <code>for</code> expression',
      '"the database got replaced when we changed a tag / engine version" → read the <code>-/+</code>, add <code>prevent_destroy</code> and <code>deletion_protection</code>',
      '"Terraform keeps reverting the desired count the autoscaler set" → <code>lifecycle { ignore_changes = [desired_capacity] }</code>',
      '"downtime while the certificate / launch template was replaced" → <code>create_before_destroy</code> with <code>name_prefix</code>',
      '"two security groups reference each other: Cycle error" → separate <code>aws_vpc_security_group_ingress_rule</code> resources',
      '"surprise $33 on the lab bill" → a NAT gateway left running; make it optional and destroy after the lab'
    ],
    code: [hcl(C`# network/main.tf - the two-tier VPC from Cloud & DevOps 6, as code (AWS provider v5).
# Free: VPC, subnets, IGW, route tables, SGs. Not free: the optional NAT gateway.
variable "name" {
  type    = string
  default = "lab"
}

variable "vpc_cidr" {
  type    = string
  default = "10.0.0.0/16"
  validation {
    condition     = can(cidrhost(var.vpc_cidr, 0))
    error_message = "vpc_cidr must be a valid CIDR block."
  }
}

variable "az_count" {
  type    = number
  default = 2
}

variable "enable_nat" {
  description = "NAT gateway costs about $32/month plus data; keep false for labs"
  type        = bool
  default     = false
}

data "aws_availability_zones" "available" {
  state = "available"
}

locals {
  azs = slice(data.aws_availability_zones.available.names, 0, var.az_count)
  # AZ name => CIDR. Public: netnum 0,1,..  Private: netnum 10,11,..
  public_cidrs  = { for i, az in local.azs : az => cidrsubnet(var.vpc_cidr, 8, i) }
  private_cidrs = { for i, az in local.azs : az => cidrsubnet(var.vpc_cidr, 8, i + 10) }
}

resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true
  tags                 = { Name = "@{var.name}-vpc" }
}

resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = "@{var.name}-igw" }
}

resource "aws_subnet" "public" {
  for_each                = local.public_cidrs          # keyed by AZ: stable identity
  vpc_id                  = aws_vpc.main.id
  availability_zone       = each.key
  cidr_block              = each.value
  map_public_ip_on_launch = true
  tags                    = { Name = "@{var.name}-public-@{each.key}", tier = "public" }
}

resource "aws_subnet" "private" {
  for_each          = local.private_cidrs
  vpc_id            = aws_vpc.main.id
  availability_zone = each.key
  cidr_block        = each.value
  tags              = { Name = "@{var.name}-private-@{each.key}", tier = "private" }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }
  tags = { Name = "@{var.name}-public-rt" }
}

resource "aws_route_table_association" "public" {
  for_each       = aws_subnet.public
  subnet_id      = each.value.id
  route_table_id = aws_route_table.public.id
}

# Private subnets: local routing only, plus a default route via NAT if enabled
resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = "@{var.name}-private-rt" }
}

resource "aws_route_table_association" "private" {
  for_each       = aws_subnet.private
  subnet_id      = each.value.id
  route_table_id = aws_route_table.private.id
}

resource "aws_eip" "nat" {
  count  = var.enable_nat ? 1 : 0
  domain = "vpc"
}

resource "aws_nat_gateway" "nat" {
  count         = var.enable_nat ? 1 : 0             # one NAT for the lab; one per AZ in prod
  allocation_id = aws_eip.nat[0].id
  subnet_id     = aws_subnet.public[local.azs[0]].id
  depends_on    = [aws_internet_gateway.igw]
}

resource "aws_route" "private_default" {
  count                  = var.enable_nat ? 1 : 0
  route_table_id         = aws_route_table.private.id
  destination_cidr_block = "0.0.0.0/0"
  nat_gateway_id         = aws_nat_gateway.nat[0].id
}`, 'network/main.tf: VPC, subnets by AZ with cidrsubnet, routes, optional NAT'), hcl(C`# network/security.tf - web accepts HTTPS from anywhere; db accepts 5432 only from web.
resource "aws_security_group" "web" {
  name_prefix = "web-"
  description = "Web tier"
  vpc_id      = aws_vpc.main.id
  lifecycle {
    create_before_destroy = true      # new group exists before the old one is removed
  }
}

resource "aws_security_group" "db" {
  name_prefix = "db-"
  description = "Database tier"
  vpc_id      = aws_vpc.main.id
  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_vpc_security_group_ingress_rule" "web_https" {
  security_group_id = aws_security_group.web.id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "tcp"
  from_port         = 443
  to_port           = 443
  description       = "HTTPS from the internet"
}

resource "aws_vpc_security_group_ingress_rule" "db_from_web" {
  security_group_id            = aws_security_group.db.id
  referenced_security_group_id = aws_security_group.web.id   # only the web tier
  ip_protocol                  = "tcp"
  from_port                    = 5432
  to_port                      = 5432
}

resource "aws_vpc_security_group_egress_rule" "web_all" {
  security_group_id = aws_security_group.web.id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1"                                   # all protocols
}

output "vpc_id" { value = aws_vpc.main.id }
output "public_subnet_ids" { value = [for s in aws_subnet.public : s.id] }
output "private_subnet_ids" { value = [for s in aws_subnet.private : s.id] }
output "web_sg_id" { value = aws_security_group.web.id }
output "db_sg_id" { value = aws_security_group.db.id }`, 'network/security.tf: security groups with v5 rule resources, and outputs'), sh(C`#!/usr/bin/env bash
set -euo pipefail
export AWS_PROFILE=lab
cd network
terraform init
terraform plan -out=tfplan               # about 15 resources, all free while enable_nat=false
terraform apply tfplan
terraform output -json private_subnet_ids
aws ec2 describe-subnets --filters "Name=vpc-id,Values=$(terraform output -raw vpc_id)" \
  --query 'Subnets[].[AvailabilityZone,CidrBlock,MapPublicIpOnLaunch]' --output table
terraform destroy                        # read the destroy plan, type yes
rm -f tfplan`, 'Lab run: apply, inspect with the AWS CLI, destroy')],
    codeTitle: ['network/main.tf: VPC, subnets by AZ with cidrsubnet, routes, optional NAT', 'network/security.tf: security groups with v5 rule resources, and outputs', 'Lab run: apply, inspect with the AWS CLI, destroy'],
    viz: [{
      title: 'cidrsubnet: carving a VPC into equal subnets, bit by bit',
      input: '10.0.0.0/16 newbits=8 count=4',
      inputLabel: 'VPC CIDR (prefix /8 to /28), newbits (1-8), count = subnets to show (1-6)',
      gen: function (input) {
        var m = String(input || '').match(/^\s*(\d+)\.(\d+)\.(\d+)\.(\d+)\/(\d+)\s+newbits\s*=\s*(\d+)\s+count\s*=\s*(\d+)\s*$/);
        if (!m) throw new Error('Use: 10.0.0.0/16 newbits=8 count=4');
        var oct = [+m[1], +m[2], +m[3], +m[4]], pre = +m[5], nb = +m[6], cnt = +m[7];
        if (oct.some(function (o) { return o > 255; }) || pre < 8 || pre > 28 || nb < 1 || nb > 8 || pre + nb > 30 || cnt < 1 || cnt > 6) throw new Error('Keep prefix 8-28, newbits 1-8 (prefix+newbits at most 30), count 1-6');
        var ip = ((oct[0] * 256 + oct[1]) * 256 + oct[2]) * 256 + oct[3];
        var hostBits = 32 - pre, size = Math.pow(2, hostBits);
        var net = Math.floor(ip / size) * size;
        function dotted(n) { return [Math.floor(n / 16777216) % 256, Math.floor(n / 65536) % 256, Math.floor(n / 256) % 256, n % 256].join('.'); }
        var low = function (n) { return n % size; };
        var hlNew = {}; for (var b = hostBits - nb; b < hostBits; b++) hlNew[b] = 'cur';
        var f = [];
        f.push({ narr: 'The VPC <b>' + dotted(net) + '/' + pre + '</b> fixes the first ' + pre + ' bits. The remaining <b>' + hostBits + '</b> bits are ours to divide (shown below; the fixed part is left out). ' + (net !== ip ? 'Note: you typed host bits, so Terraform first masks the address down to the network ' + dotted(net) + '.' : ''), parts: [{ type: 'bits', label: 'host part of ' + dotted(net) + '/' + pre, value: 0, width: hostBits }, { type: 'vars', label: 'inputs', vals: { prefix: '/' + pre, newbits: nb, new_prefix: '/' + (pre + nb), subnets_possible: Math.pow(2, nb), addresses_each: Math.pow(2, hostBits - nb) } }] });
        f.push({ narr: '<code>newbits = ' + nb + '</code> borrows the <b>top ' + nb + '</b> of those bits (amber) as the subnet number. That gives 2<sup>' + nb + '</sup> = ' + Math.pow(2, nb) + ' subnets of 2<sup>' + (hostBits - nb) + '</sup> = ' + Math.pow(2, hostBits - nb) + ' addresses each. <code>netnum</code> must stay below ' + Math.pow(2, nb) + ', or Terraform errors.', parts: [{ type: 'bits', label: 'subnet-number bits (amber)', value: 0, width: hostBits, hl: hlNew }] });
        var rows = [];
        for (var k = 0; k < cnt && k < Math.pow(2, nb); k++) {
          var start = net + k * Math.pow(2, hostBits - nb);
          rows.push(['cidrsubnet(..., ' + nb + ', ' + k + ')', dotted(start) + '/' + (pre + nb), dotted(start + Math.pow(2, hostBits - nb) - 1)]);
          f.push({ narr: 'netnum <b>' + k + '</b>: write ' + k + ' in binary into the amber bits, zeros below. Start = network + ' + k + ' x ' + Math.pow(2, hostBits - nb) + ' = <b>' + dotted(start) + '/' + (pre + nb) + '</b>.', parts: [{ type: 'bits', label: 'host part for netnum ' + k, value: low(start - net), width: hostBits, hl: hlNew }, { type: 'table', label: 'subnets so far', columns: ['call', 'CIDR', 'last address'], rows: rows.map(function (r) { return r.slice(); }), hl: one(rows.length - 1, 'ok') }] });
        }
        f.push({ narr: 'In HCL you never type these: <code>{ for i, az in local.azs : az => cidrsubnet(var.vpc_cidr, ' + nb + ', i) }</code>. On AWS remember that each subnet loses 5 addresses (network, router, DNS, reserved, broadcast), so a /' + (pre + nb) + ' has ' + Math.max(0, Math.pow(2, hostBits - nb) - 5) + ' usable.', parts: [{ type: 'table', label: 'result', columns: ['call', 'CIDR', 'last address'], rows: rows }] });
        return f;
      }
    }],
    examples: [
      { title: 'The database that would have been destroyed', html: `<p>A pull request changed <code>aws_db_instance.orders</code> from <code>engine_version = "15"</code> to <code>"16"</code> and also changed its <code>identifier</code> to match a naming standard. The plan said <code>-/+ ... # forces replacement</code> on the identifier: a <b>new empty database</b> and the old one deleted. The reviewer caught it. Afterwards the team added <code>prevent_destroy</code> (Terraform refuses the plan) and <code>deletion_protection = true</code> (AWS refuses the API call even from the console) to every stateful resource. Renames of the Terraform <i>address</i> are handled with <code>moved</code> (Topic 7); renames of the real object's name usually mean a migration.</p>`, code: hcl(C`resource "aws_db_instance" "orders" {
  identifier          = "orders-prod"        # changing this forces replacement
  engine              = "postgres"
  engine_version      = "16"
  instance_class      = "db.t4g.micro"
  allocated_storage   = 20
  username            = "orders_admin"
  manage_master_user_password = true
  deletion_protection = true                  # AWS-side guard

  lifecycle {
    prevent_destroy = true                    # Terraform-side guard
    ignore_changes  = [snapshot_identifier]   # set once at restore, never re-applied
  }
}`) },
      { title: 'Autoscaling vs Terraform: who owns desired_capacity?', html: `<p>Terraform sets <code>desired_capacity = 2</code> on an Auto Scaling group. At lunchtime the scaling policy raises it to 6. The next <code>apply</code> for an unrelated change sets it back to 2 - and drops four servers during peak. The fix: let Terraform own <code>min_size</code>/<code>max_size</code> and the scaling policy, and add <code>ignore_changes = [desired_capacity]</code> so the runtime value is not reverted.</p>` },
      { title: 'Zero-downtime replacement with create_before_destroy', html: `<p>Changing the AMI in a launch template used by running instances, or replacing an ACM certificate attached to a load balancer: by default Terraform deletes the old object first and the delete fails ("in use") or causes an outage. With <code>create_before_destroy = true</code> the new one is created, references are switched, and the old one is removed. It requires names that can coexist, so use <code>name_prefix</code> instead of a fixed <code>name</code>. Note it is <b>inherited</b>: resources that the old one depends on are also forced into create-before-destroy order.</p>` },
      { title: 'Why the subnets are keyed by AZ, not counted', html: `<p>With <code>count = 2</code> and <code>availability_zone = local.azs[count.index]</code>, moving from 2 to 3 AZs is fine - but if AWS's AZ list changes order or you drop the first AZ, every subnet shifts and Terraform wants to <b>replace subnets with servers in them</b> (subnets cannot be modified in place to another AZ or CIDR). Keying by the AZ name and computing the CIDR from a fixed netnum per AZ keeps existing subnets stable when the list changes.</p>` }
    ],
    deepDive: `<p>🟣 <b>cidrsubnet precisely.</b> Terraform parses the prefix, masks it to its network address (<code>10.0.5.7/16</code> → <code>10.0.0.0/16</code>), checks that <code>prefix + newbits</code> is at most 32 (128 for IPv6) and that <code>netnum &lt; 2<sup>newbits</sup></code>, then returns <code>network + netnum x 2<sup>(32 - prefix - newbits)</sup></code> with the new prefix length. Related functions: <code>cidrhost(prefix, n)</code> (the n-th address, handy for a fixed DNS server IP), <code>cidrnetmask</code>, and <code>cidrsubnets(prefix, 4, 4, 8, 8)</code> which packs <b>different-sized</b> consecutive subnets without overlap.</p>
      <p><b>Planning address space for real.</b> Leave room: a /16 per environment, /20 or /19 subnets for workloads that run many pods (EKS gives every pod a VPC IP), and do not overlap with the office VPN or other VPCs you might peer with later - overlapping CIDRs cannot be routed and are painful to fix. Teams often use IPAM (AWS VPC IPAM) to hand out non-overlapping blocks, read by Terraform through data sources.</p>
      <p><b>lifecycle gotchas.</b> <code>prevent_destroy</code> only works while the block is in the code: deleting the whole resource block removes the protection with it, which is why <code>deletion_protection</code> on the cloud side is also needed. <code>ignore_changes = all</code> makes Terraform blind to every change - rarely what you want. <code>ignore_changes</code> also ignores your <i>own</i> edits to those attributes in code. For tags set by other tools at the provider level use the provider's <code>ignore_tags</code> setting.</p>
      <p><b>Modules for networking.</b> In production most teams use the community <code>terraform-aws-modules/vpc/aws</code> module (pinned version) rather than 15 hand-written resources: it handles per-AZ NAT, flow logs, endpoints and IPv6. Writing it yourself once, as here, is how you learn to read that module's plan.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> this is where assistants save real time: "two-tier VPC in 3 AZs, NAT per AZ, flow logs" becomes 200 lines of plausible HCL, and they are good at cidrsubnet maths and at turning a whiteboard diagram into security-group rules.</p>
      <p><b>Where it goes wrong:</b> generated networks often open <code>0.0.0.0/0</code> on port 22 or 5432 "for testing", put databases in public subnets, use inline <code>ingress</code> blocks mixed with rule resources, or create a NAT gateway per AZ in a lab and leave you a $100 bill. CIDR plans that overlap your VPN range are common because the model does not know your network. <b>How to work with it:</b> give it your CIDR plan and constraints, then check the plan for every <code>0.0.0.0/0</code>, run <code>checkov</code>/<code>trivy config</code> (Topic 8), and price anything with an hourly charge. <b>What you still own:</b> the address plan and the exposure decisions.</p>`,
    problems: [P({
      t: 'Implement cidrsubnet for a subnet plan', l: 'Medium', tags: ['cidrsubnet', 'subnetting', 'VPC'], co: ['Amazon', 'Cisco', 'Cloudflare'],
      s: `<p>Your team reviews VPC plans before anyone runs Terraform. Write <code>cidrSubnet(prefix, newbits, netnum)</code> with Terraform's semantics for IPv4: mask <code>prefix</code> to its network address, extend the prefix length by <code>newbits</code>, and return block number <code>netnum</code> as <code>"a.b.c.d/len"</code>. Return <code>"error"</code> if the new length would exceed 32 or <code>netnum</code> does not fit in <code>newbits</code> bits. Then write the HCL that creates public and private subnets per AZ using the real function.</p>`,
      c: `<p><code>prefix</code> is a valid IPv4 CIDR; <code>0 ≤ newbits ≤ 32</code>; <code>0 ≤ netnum &lt; 2<sup>32</sup></code>. The function is pure maths. The HCL creates only free resources (VPC, subnets).</p>`,
      ex: `<p><code>("10.0.0.0/16", 8, 2)</code> → ${H.c('g', '"10.0.2.0/24"')}: block size 2<sup>32-24</sup> = 256, start = 10.0.0.0 + 2 x 256. <code>("10.0.0.0/16", 4, 16)</code> → ${H.c('r', '"error"')} because 4 bits only number 0-15. <code>("10.0.5.7/16", 8, 1)</code> → <code>"10.0.1.0/24"</code> after masking.</p>`,
      bw: `<p>Edit the third octet as text: "10.0.N.0/24". It works only for /16 → /24 and silently produces wrong or overlapping ranges for /20 or /26 subnets, and never notices when netnum is too big - exactly the mistakes that surface weeks later as "CIDR conflicts with existing subnet".</p>`,
      q: ['What does <code>cidrsubnet("10.0.0.0/16", 4, 3)</code> return?', ['<code>10.0.48.0/20</code>', '<code>10.0.3.0/20</code>', '<code>10.0.3.0/24</code>', '<code>10.3.0.0/20</code>'], 0, 'Adding 4 bits gives /20 blocks of 4096 addresses = 16 values of the third octet. Block 3 starts at 3 x 16 = 48 in the third octet: 10.0.48.0/20.'],
      h: ['<p>Hint 1: convert the IP to a 32-bit integer; CIDR maths is just integer maths on it.</p>', '<p>Hint 2: network = ip with the low <code>32 - len</code> bits cleared; block size = 2<sup>32 - (len + newbits)</sup>; result = network + netnum x size.</p>', '<p>Hint 3: check <code>len + newbits ≤ 32</code> and <code>netnum &lt; 2<sup>newbits</sup></code> first. newbits = 0 returns the network itself. Convert back with shifts and <code>&amp; 255</code>.</p>'],
      a: `<p>Parse <code>a.b.c.d/len</code> into a 32-bit integer and a prefix length. Clear the host bits to get the network address. Validate: the new length <code>len + newbits</code> must be at most 32, and <code>netnum</code> must be below <code>2<sup>newbits</sup></code>. The block size is <code>2<sup>32 - newLen</sup></code>, so the answer is <code>network + netnum x size</code>, printed in dotted form with the new length. This is exactly Terraform's <code>cidrsubnet</code> for IPv4.</p>
        <p>In HCL, compute every subnet from the AZ list with fixed netnum offsets (public 0.., private 10..), keyed by AZ name so changes to the AZ list do not shift existing subnets. Check the result in <code>terraform console</code> before applying.</p>`,
      hcl: C`variable "vpc_cidr" {
  type    = string
  default = "10.0.0.0/16"
}

variable "azs" {
  type    = list(string)
  default = ["eu-west-1a", "eu-west-1b", "eu-west-1c"]
}

locals {
  public  = { for i, az in var.azs : az => cidrsubnet(var.vpc_cidr, 8, i) }       # 10.0.0-2.0/24
  private = { for i, az in var.azs : az => cidrsubnet(var.vpc_cidr, 8, i + 10) }  # 10.0.10-12.0/24
}

resource "aws_vpc" "main" {
  cidr_block = var.vpc_cidr
}

resource "aws_subnet" "public" {
  for_each          = local.public
  vpc_id            = aws_vpc.main.id
  availability_zone = each.key
  cidr_block        = each.value
}

resource "aws_subnet" "private" {
  for_each          = local.private
  vpc_id            = aws_vpc.main.id
  availability_zone = each.key
  cidr_block        = each.value
}

output "subnet_plan" {
  value = { public = local.public, private = local.private }
}`,
      sh: C`#!/usr/bin/env bash
set -euo pipefail
# Check the maths before creating anything
echo 'cidrsubnet("10.0.0.0/16", 8, 2)'  | terraform console     # "10.0.2.0/24"
echo 'cidrsubnet("10.0.0.0/16", 4, 3)'  | terraform console     # "10.0.48.0/20"
echo 'cidrsubnet("10.0.0.0/16", 4, 16)' | terraform console || echo "expected error: netnum too big"
export AWS_PROFILE=lab
terraform init && terraform plan -out=tfplan && terraform apply tfplan
terraform output subnet_plan
terraform destroy -auto-approve && rm -f tfplan                    # free resources, but clean up anyway`,
      py: C`def cidr_subnet(prefix, newbits, netnum):
    """Terraform's cidrsubnet() for IPv4, returning "error" where Terraform would fail."""
    addr, length = prefix.split("/")
    length = int(length)
    a, b, c, d = (int(x) for x in addr.split("."))
    ip = (a << 24) | (b << 16) | (c << 8) | d
    new_len = length + newbits
    if new_len > 32 or netnum >= (1 << newbits):
        return "error"
    host_bits = 32 - length
    network = (ip >> host_bits) << host_bits if host_bits < 32 else 0   # clear host bits
    start = network + netnum * (1 << (32 - new_len))
    octets = [(start >> s) & 255 for s in (24, 16, 8, 0)]
    return ".".join(str(o) for o in octets) + "/" + str(new_len)`,
      cx: `<p>O(1) integer arithmetic. The reviewing value is in catching overlaps and exhausted ranges before an apply fails half-way.</p>`,
      f: ['How would you check that a list of subnets does not overlap?', 'Why might EKS clusters need /19 subnets instead of /24?'],
      tests: { sig: 'string int int -> string', fn: 'cidrSubnet', cases: [
        [['10.0.0.0/16', 8, 2], '10.0.2.0/24'],
        [['10.0.0.0/16', 8, 0], '10.0.0.0/24'],
        [['10.0.0.0/16', 4, 15], '10.0.240.0/20'],
        [['10.0.0.0/16', 4, 16], 'error'],
        [['172.16.0.0/12', 4, 3], '172.19.0.0/16'],
        [['10.1.0.0/16', 8, 255], '10.1.255.0/24'],
        [['192.168.1.0/24', 2, 1], '192.168.1.64/26'],
        [['10.0.0.0/30', 3, 0], 'error'],
        [['10.0.5.7/16', 8, 1], '10.0.1.0/24'],
        [['10.0.0.0/16', 0, 0], '10.0.0.0/16'],
        [['0.0.0.0/0', 1, 1], '128.0.0.0/1'],
        [['10.0.0.0/16', 4, 3], '10.0.48.0/20']
      ] }
    })]
  });

  // ───────────────────────── Topic 6: modules, workspaces and environments ─────────────────────────
  topics.push({
    title: 'Modules and Environments: Reusable Building Blocks, Version Pinning, Workspaces vs Separate States',
    analogy: `<p>A flat-pack furniture company. The design team publishes <b>version 1.4 of the "Billy" shelf</b> (a <b>module</b>) with instructions and a parts list (variables and outputs). The test showroom (<b>staging</b>) gets 1.4 first; the shops (<b>prod</b>) keep selling 1.3 until the showroom has had it for a week without wobbles. Then the shops switch to <i>exactly</i> 1.4 - not "whatever the factory made today". Each shop also keeps its <b>own stock book</b> (separate state), so a mistake in the showroom's books cannot empty a shop.</p>`,
    explain: `<p>🟢 <b>A module is just a folder of <code>.tf</code> files.</b> The folder you run Terraform in is the <b>root module</b>; folders it calls with a <code>module</code> block are <b>child modules</b>. A module's <b>inputs</b> are its variables, its <b>outputs</b> are its return values, and everything else is private. Good modules wrap one idea ("a network", "a static website bucket", "a service with its alarms") and hide the 20 resources behind 6 meaningful inputs.</p>
      <p>🟢 <b>Sources and versions.</b></p>
      ${H.table(['Source', 'Example', 'Version pinning'], [
        ['Local path', '<code>source = "../modules/network"</code>', 'same commit as the caller (no version argument)'],
        ['Public / private registry', '<code>source = "terraform-aws-modules/vpc/aws"</code>', '<code>version = "~&gt; 5.8"</code> (or exact)'],
        ['Git tag', '<code>source = "git::https://github.com/acme/tf-modules.git//network?ref=v1.4.0"</code>', 'the <code>ref</code> (tag or commit SHA)'],
        ['S3 / HTTP archive', '<code>source = "s3::https://s3.amazonaws.com/acme-modules/network-1.4.0.zip"</code>', 'the file name']
      ])}
      <p>After adding or changing a module source run <code>terraform init</code> (or <code>init -upgrade</code> to move to a newer allowed version). Module addresses nest: <code>module.network.aws_subnet.private["eu-west-1a"]</code>.</p>
      <p>🔵 <b>Environments: two ways to run the same code for dev, staging and prod.</b></p>
      ${H.table(['', 'CLI workspaces', 'Separate directories (one root per env)'], [
        ['How', '<code>terraform workspace new staging</code>; one directory, several states', '<code>envs/staging/</code> and <code>envs/prod/</code> each call the module with their own backend'],
        ['State', 'same backend, key prefix <code>env:/staging/...</code>', 'own key, often own bucket and AWS account'],
        ['Differences', '<code>terraform.workspace</code> in expressions, per-env tfvars', 'explicit in each directory: different sizes, module versions'],
        ['Credentials', 'one set for all envs (risky)', 'different role per env/account'],
        ['Danger', 'forgetting which workspace is selected → apply to prod', 'some duplication of small root files'],
        ['Good for', 'short-lived copies (feature branches, test stacks)', H.c('g', 'long-lived staging and prod')]
      ])}
      <p>🔵 <b>Promotion</b> means prod runs the <b>same module version</b> that staging already proved. Tag the module repository (<code>v1.4.0</code>), bump staging's <code>ref</code>, apply, test, then bump prod's <code>ref</code> in a separate pull request. Never point prod at a branch like <code>main</code>: the code would change under you without a pull request in the prod directory.</p>
      <p>🔵 <b>Terragrunt</b> (by Gruntwork) is a thin wrapper some teams add to avoid repeating backend blocks and provider settings across dozens of environment folders, and to run many roots at once. It is optional: learn plain Terraform first; newer native features (and HCP Terraform Stacks) cover some of the same ground.</p>`,
    clues: [
      '"we copy-pasted the same 300 lines for each service" → extract a module with a small, typed interface',
      '"staging and prod must be identical except size" → one module, called from <code>envs/staging</code> and <code>envs/prod</code> with different inputs',
      '"someone applied the staging change to prod by mistake" → workspaces with shared credentials; move to separate states, accounts and roles',
      '"the module changed and broke prod without anyone touching prod" → module source pinned to a branch; pin a tag or version',
      '"promote the tested change to production" → bump the module <code>ref</code>/<code>version</code> in the prod root in its own PR',
      '"DRY backend config across 40 folders" → Terragrunt, or a generated backend file; mention briefly, not as a first step'
    ],
    code: [hcl(C`# modules/web-service/variables.tf + main.tf + outputs.tf (shown together)
# A small module: a security group and N containers-or-instances behind it.
variable "name" {
  description = "Service name, used as a prefix"
  type        = string
}

variable "vpc_id" {
  type = string
}

variable "subnet_ids" {
  type = list(string)
}

variable "instance_type" {
  type    = string
  default = "t3.micro"
}

variable "instances" {
  description = "Instance names; keys are stable identities"
  type        = set(string)
  default     = ["a", "b"]
}

data "aws_ami" "al2023" {
  most_recent = true
  owners      = ["amazon"]
  filter {
    name   = "name"
    values = ["al2023-ami-2023.*-x86_64"]
  }
}

resource "aws_security_group" "this" {
  name_prefix = "@{var.name}-"
  vpc_id      = var.vpc_id
  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_instance" "this" {
  for_each               = var.instances
  ami                    = data.aws_ami.al2023.id
  instance_type          = var.instance_type
  subnet_id              = element(var.subnet_ids, index(sort(tolist(var.instances)), each.key))
  vpc_security_group_ids = [aws_security_group.this.id]
  metadata_options {
    http_tokens = "required"
  }
  tags = { Name = "@{var.name}-@{each.key}" }
}

output "instance_ids" {
  value = { for k, i in aws_instance.this : k => i.id }
}

output "security_group_id" {
  value = aws_security_group.this.id
}`, 'modules/web-service: inputs, resources, outputs'), hcl(C`# envs/staging/main.tf - one root per environment, own backend, own module version
terraform {
  required_version = ">= 1.10.0"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
  backend "s3" {
    bucket       = "example-tfstate-staging-111111111111"
    key          = "web/terraform.tfstate"
    region       = "eu-west-1"
    encrypt      = true
    use_lockfile = true
  }
}

provider "aws" {
  region = "eu-west-1"
  # CI assumes the staging deploy role; prod uses a different role in another account
}

module "network" {
  source  = "terraform-aws-modules/vpc/aws"   # community module from the registry
  version = "~> 5.8"
  name    = "staging"
  cidr    = "10.10.0.0/16"
  azs     = ["eu-west-1a", "eu-west-1b"]
  private_subnets = ["10.10.10.0/24", "10.10.11.0/24"]
  public_subnets  = ["10.10.0.0/24", "10.10.1.0/24"]
  enable_nat_gateway = false                  # cost: NAT is about $32/month per gateway
}

module "web" {
  source        = "git::https://github.com/acme/tf-modules.git//web-service?ref=v1.4.0"   # being tested
  name          = "web-staging"
  vpc_id        = module.network.vpc_id
  subnet_ids    = module.network.private_subnets
  instance_type = "t3.micro"
  instances     = ["a"]
}

# envs/prod/main.tf is the same file with its own bucket/account, bigger sizes,
# and ref=v1.3.0 until staging has proven v1.4.0.`, 'envs/staging: pinned registry module + git-tagged module'), sh(C`#!/usr/bin/env bash
# Workspaces: fine for throwaway copies, risky for prod.
set -euo pipefail
terraform workspace list                 # * default
terraform workspace new feature-login    # new, empty state: env:/feature-login/<key> in S3
terraform plan -var-file=dev.tfvars      # inside code: terraform.workspace == "feature-login"
terraform apply -var-file=dev.tfvars
terraform destroy -var-file=dev.tfvars   # remove the copy
terraform workspace select default
terraform workspace delete feature-login

# Separate directories: the environment is the folder you are in.
cd envs/staging && terraform init && terraform plan -out=tfplan`, 'Workspaces for throwaway copies, directories for real environments')],
    codeTitle: ['modules/web-service: inputs, resources, outputs', 'envs/staging: pinned registry module + git-tagged module', 'Workspaces for throwaway copies, directories for real environments'],
    viz: [{
      title: 'Promoting one module version from staging to prod',
      gen: function () {
        var nodes = [box('mod', 'module repo', 12, 30, 18), box('st', 'envs/staging', 50, 14, 20), box('pr', 'envs/prod', 50, 46, 20), box('sa', 'staging account', 88, 14, 22), box('pa', 'prod account', 88, 46, 22)];
        var edges = [['mod', 'st'], ['mod', 'pr'], ['st', 'sa'], ['pr', 'pa']];
        function g(hl, ehl, lab) { return { type: 'graph', label: lab || 'who uses which version', directed: true, height: 60, nodes: nodes, edges: edges, hl: hl, ehl: ehl || {} }; }
        function t(st, pr, hl) { return { type: 'table', label: 'pinned versions', columns: ['root', 'module ref', 'state key / account'], rows: [['envs/staging', st, 'staging bucket, account 1111...'], ['envs/prod', pr, 'prod bucket, account 2222...']], hl: hl || {} }; }
        return [
          { narr: 'Starting point: both environments call the <b>same module</b> at the same tag <code>v1.3.0</code>, each with its own backend, account and deploy role. The module repository has a new tag <code>v1.4.0</code> (adds an alarm and changes the instance type default).', parts: [g({ mod: 'cur' }), t('v1.3.0', 'v1.3.0')] },
          { narr: 'PR #1 changes <b>only</b> <code>envs/staging</code>: <code>?ref=v1.4.0</code>. CI runs <code>init</code>, <code>plan</code>, policy checks, and posts the plan on the PR: "2 to add, 1 to change, 0 to destroy".', parts: [g({ st: 'cur' }, { 'mod-st': 'cur' }), t('v1.4.0 (PR)', 'v1.3.0', { 0: 'cur' })] },
          { narr: 'After approval CI applies the <b>saved</b> plan to staging. Smoke tests and a day of normal traffic run against it. Prod is untouched - a bug in v1.4.0 can only hurt staging.', parts: [g({ st: 'ok', sa: 'ok' }, { 'mod-st': 'ok', 'st-sa': 'ok' }), t('v1.4.0', 'v1.3.0', { 0: 'ok' })] },
          { narr: 'Suppose staging had shown a problem: you fix the module, tag <code>v1.4.1</code> and repeat. Prod never saw v1.4.0. ' + H.c('y', 'Pinning to a tag is what makes this possible') + ' - with <code>ref=main</code>, prod would pick up every change on its next plan.', parts: [g({ st: 'cur', mod: 'cur' }), { type: 'text', label: 'why not ref=main', html: '<p>A branch moves. Two plans of the same prod code a day apart could build different things, and nobody reviewed the change in the prod folder.</p>' }] },
          { narr: 'PR #2 changes <b>only</b> <code>envs/prod</code> to <code>v1.4.0</code>. Its plan should match staging\'s shape (same adds and changes, different sizes). Any extra destroy in the prod plan is a red flag: prod has drifted or differs.', parts: [g({ pr: 'cur' }, { 'mod-pr': 'cur' }), t('v1.4.0', 'v1.4.0 (PR)', { 1: 'cur' })] },
          { narr: 'Apply to prod with a manual approval in the pipeline. Both environments now run the same, tested module version. Rolling back = a PR that sets <code>v1.3.0</code> again (and a plan to read).', parts: [g({ st: 'ok', pr: 'ok', sa: 'ok', pa: 'ok' }, { 'mod-st': 'ok', 'mod-pr': 'ok', 'st-sa': 'ok', 'pr-pa': 'ok' }), t('v1.4.0', 'v1.4.0', { 0: 'ok', 1: 'ok' })] }
        ];
      }
    }],
    examples: [
      { title: 'Incident: "terraform apply" in the wrong workspace', html: `<p>An engineer tested a change with <code>terraform workspace select staging</code>, went to lunch, came back in a new terminal tab in the same folder - where the <code>prod</code> workspace was still selected (the selection is stored in <code>.terraform/environment</code>) - and applied a half-finished change to production. Mitigations: show the workspace in the shell prompt, add a guard (<code>precondition</code> that <code>terraform.workspace</code> matches an expected variable), and for long-lived environments move to separate directories, separate accounts and separate deploy roles so a staging credential simply cannot touch prod.</p>`, code: hcl(C`variable "expected_workspace" {
  type = string
}

resource "terraform_data" "workspace_guard" {
  input = terraform.workspace
  lifecycle {
    precondition {
      condition     = terraform.workspace == var.expected_workspace
      error_message = "Selected workspace does not match expected_workspace. Check before applying."
    }
  }
}`) },
      { title: 'Good module interface vs leaky one', html: `<p>A leaky module exposes 60 variables that mirror every argument of the resources inside; callers must understand the internals anyway. A good one asks for <b>intent</b> (<code>name</code>, <code>vpc_id</code>, <code>subnet_ids</code>, <code>size = "small"|"large"</code>, <code>public = false</code>) and maps it to details inside, with validation and safe defaults (encryption on, public off). It outputs the IDs others need, not whole resource objects. Version it with semantic versioning: a removed variable or a change that replaces resources is a <b>major</b> version.</p>` },
      { title: 'Calling a module once per region with for_each', html: `<p>Modules accept <code>for_each</code> like resources, but a provider cannot be chosen dynamically per instance. For two regions, declare two aliased providers and two module blocks, or one module call per region directory. For many similar copies in one region (one bucket module per team), <code>for_each</code> on the module is ideal.</p>`, code: hcl(C`module "team_bucket" {
  source   = "./modules/team-bucket"
  for_each = toset(["payments", "search", "growth"])
  team     = each.key
}

# addresses: module.team_bucket["payments"].aws_s3_bucket.this, ...`) },
      { title: 'Testing a module before tagging it', html: `<p>Terraform 1.6 added <code>terraform test</code>: <code>.tftest.hcl</code> files with <code>run</code> blocks that plan or apply the module and check <code>assert</code> conditions, then destroy what they created. Plan-only runs are free; apply runs create real (and possibly billed) resources in a sandbox account. Tag the module only after tests pass in CI.</p>`, code: hcl(C`# modules/web-service/tests/basic.tftest.hcl
variables {
  name       = "test"
  vpc_id     = "vpc-0123456789abcdef0"
  subnet_ids = ["subnet-0123456789abcdef0"]
}

run "plan_only_checks" {
  command = plan
  assert {
    condition     = length(aws_instance.this) == 2
    error_message = "Expected two instances by default."
  }
}`) }
    ],
    deepDive: `<p>🟣 <b>Module design rules that survive years.</b> Keep providers out of reusable modules (declare <code>required_providers</code> with a wide version range, but no <code>provider</code> blocks), so callers control regions, accounts and aliases. Do not nest modules more than two levels deep - debugging <code>module.a.module.b.module.c</code> is miserable. Prefer composition at the root (network module output → app module input) over modules that call everything.</p>
      <p><b>Refactoring into modules without rebuilding.</b> Moving <code>aws_vpc.main</code> into <code>module.network</code> changes its address. Without help, Terraform plans destroy + create. A <code>moved { from = aws_vpc.main  to = module.network.aws_vpc.this }</code> block makes it a pure state move (Topic 7). Module authors can ship <code>moved</code> blocks inside the module so callers upgrade safely.</p>
      <p><b>Workspaces in depth.</b> CLI workspaces are just multiple states for one configuration. With the S3 backend, the default workspace uses <code>key</code>, and workspace <code>w</code> uses <code>workspace_key_prefix/w/key</code> (default prefix <code>env:</code>), all in the same bucket with the same credentials. HCP Terraform also calls its unit a "workspace", but there it is a full environment: its own state, variables, permissions and run history - not the same thing. The two names cause endless interview confusion; say which you mean.</p>
      <p><b>Environment layout options</b> seen in real companies: (1) <code>envs/&lt;env&gt;/&lt;component&gt;</code> roots with pinned module refs (most common); (2) one root with per-env tfvars and backend files chosen in CI; (3) Terragrunt hierarchies with <code>terragrunt.hcl</code> per folder; (4) HCP Terraform workspaces or Stacks with VCS-driven runs. All share the same principles: one state per env and component, separate credentials per env, promotion by version.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> an assistant can extract a module from a big root configuration, propose its variables and outputs, generate the <code>moved</code> blocks for the refactor, write README tables from the variable descriptions (terraform-docs does this deterministically too), and draft <code>terraform test</code> files.</p>
      <p><b>Where it goes wrong:</b> generated modules tend to be thin wrappers that expose every argument, contain <code>provider</code> blocks, or reference community modules with versions that do not exist or with inputs renamed in a newer major version. Agents also happily run commands in whatever workspace is selected. <b>How to work with it:</b> give the intended interface first ("these 6 inputs, these 3 outputs"), check community module inputs against the pinned version's docs, and make environment selection explicit in every command an agent runs (directories, not workspaces). <b>What you still own:</b> module boundaries and the promotion policy.</p>`,
    problems: [P({
      t: 'Promote the same module to staging and prod safely', l: 'Hard', tags: ['modules', 'environments', 'promotion', 'workspaces'], co: ['Atlassian', 'Booking.com', 'Monzo'],
      s: `<p>Today the team has one root configuration and uses CLI workspaces <code>staging</code> and <code>prod</code> with the same AWS credentials. Last month a staging change was applied to prod by accident. Redesign it: a versioned <code>web-service</code> module, one root per environment with its own backend and credentials, a way to promote a module version from staging to prod, and a migration of the existing workspace states into the new layout <b>without recreating any resource</b>.</p>`,
      ex: `<p>Before: <code>s3://tfstate/env:/prod/web/terraform.tfstate</code>, chosen by whatever workspace is selected. After: <code>envs/prod/</code> with its own bucket in the prod account, <code>ref=v1.3.0</code>; <code>envs/staging/</code> at <code>ref=v1.4.0</code>. Migration plan for each env: ${H.c('g', '0 to add, 0 to change, 0 to destroy')} with only "has moved to" lines.</p>`,
      bw: `<p>Keep workspaces and "be more careful". The failure mode stays - one credential and one selected-workspace file decide where an apply lands. Or create fresh directories and run <code>apply</code>: Terraform would create a second copy of everything (or fail on names), because the new states are empty.</p>`,
      q: ['Prod should get exactly the module code staging tested. How do you reference it in envs/prod?', ['A Git tag or registry version, e.g. <code>?ref=v1.4.0</code>', '<code>?ref=main</code>', 'A relative path to the module folder on main', 'Copy the module files into envs/prod'], 0, 'Tags (or exact registry versions) are immutable labels for a commit. A branch moves, and a path follows whatever the repo contains today, so prod could change without a prod PR.'],
      h: ['<p>Hint 1: the resources do not move - only their state does. Get each workspace state out with <code>terraform state pull</code> and into the new backend.</p>', '<p>Hint 2: if the resources now live inside <code>module.web</code>, their addresses change; add <code>moved</code> blocks in the new roots so the plan shows moves, not replacements.</p>', '<p>Hint 3: promotion = two pull requests (staging ref bump, then prod ref bump), each with its own saved plan and approval; the prod deploy role exists only in the prod account.</p>'],
      a: `<p><b>Module:</b> move the shared resources into <code>modules/web-service</code> in a modules repo, tag <code>v1.3.0</code> (current behaviour). <b>Roots:</b> create <code>envs/staging</code> and <code>envs/prod</code>, each with a backend in its own account's state bucket (<code>use_lockfile = true</code>), a provider that relies on the environment's deploy role, and <code>module "web" { source = "git::...//web-service?ref=v1.3.0" }</code> plus <code>moved</code> blocks from the old root addresses to <code>module.web.*</code>. <b>Migrate state</b> per environment: select the old workspace, <code>state pull</code> to a protected file, <code>init</code> the new root, <code>state push</code> it, then <code>plan</code> must show only moves (if it shows destroys, stop). <b>Promote:</b> tag <code>v1.4.0</code>, PR bumping staging, apply, test; PR bumping prod, manual approval, apply the saved plan. <b>Lock down:</b> staging CI role cannot assume the prod role; delete the old workspaces once both new roots plan clean.</p>`,
      hcl: C`# envs/prod/main.tf
terraform {
  required_version = ">= 1.10.0"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
  backend "s3" {
    bucket       = "example-tfstate-prod-222222222222"
    key          = "web/terraform.tfstate"
    region       = "eu-west-1"
    encrypt      = true
    use_lockfile = true
  }
}

provider "aws" {
  region = "eu-west-1"     # credentials: CI assumes arn:aws:iam::222222222222:role/terraform-deploy-prod
}

module "web" {
  source        = "git::https://github.com/acme/tf-modules.git//web-service?ref=v1.3.0"
  name          = "web-prod"
  vpc_id        = "vpc-0prod0000000000000"
  subnet_ids    = ["subnet-0prodaaaaaaaaaaaa", "subnet-0prodbbbbbbbbbbbb"]
  instance_type = "m7g.large"
  instances     = ["a", "b", "c"]
}

# The old root had these resources at the top level; record the new home.
moved {
  from = aws_security_group.web
  to   = module.web.aws_security_group.this
}
moved {
  from = aws_instance.web["a"]
  to   = module.web.aws_instance.this["a"]
}
moved {
  from = aws_instance.web["b"]
  to   = module.web.aws_instance.this["b"]
}
moved {
  from = aws_instance.web["c"]
  to   = module.web.aws_instance.this["c"]
}`,
      sh: C`#!/usr/bin/env bash
set -euo pipefail
# 1. Export the old workspace state (run in the OLD root, prod credentials)
cd legacy-root
terraform workspace select prod
terraform state pull > /secure/prod-web.tfstate
chmod 600 /secure/prod-web.tfstate

# 2. Load it into the new root's backend
cd ../envs/prod
terraform init -input=false
terraform state push /secure/prod-web.tfstate

# 3. The plan must show only moves
terraform plan -out=tfplan
terraform show -json tfplan | jq -e '[.resource_changes[] | select(.change.actions != ["no-op"])] | length == 0'
terraform apply tfplan          # records the moves in state; nothing changes in AWS

# 4. Promotion later: bump ref in envs/staging (PR 1), then envs/prod (PR 2)
grep -n 'ref=' ../staging/main.tf main.tf`,
      cx: `<p>Migration effort: roughly an hour per environment, zero resources changed. Ongoing: two small PRs per module release instead of one risky apply; staging catches problems before prod ever sees them.</p>`,
      f: ['When are CLI workspaces still the right tool?', 'How would Terragrunt reduce the duplication between envs/staging and envs/prod?']
    })]
  });

  // ───────────────────────── Topic 7: moved, import, state surgery, drift ─────────────────────────
  topics.push({
    title: 'Changing Live Infrastructure Safely: moved and import Blocks, State Surgery, -target and Drift',
    analogy: `<p>A library catalogue. Renaming a shelf label from "DB" to "Databases" should update the <b>catalogue card</b>, not burn the books and buy new copies - that is a <code>moved</code> block. A donated box of books that was never catalogued gets <b>cards written for it</b> - that is <code>import</code>. Taking a card out without removing the book (it now belongs to another library) is <code>removed</code> / <code>state rm</code>. And when someone rearranges shelves at night without updating the catalogue, the morning check that spots the mismatch is <b>drift detection</b>.</p>`,
    explain: `<p>🟢 Terraform identifies everything by its <b>address</b> in state. Change the address in code - rename <code>aws_db_instance.db</code> to <code>aws_db_instance.orders</code>, wrap it in a module, switch count to for_each - and Terraform sees "old address gone, new address appeared": <b>destroy one, create one</b>. For a database that means an empty new database and a deleted old one. Four tools let you change addresses and ownership without touching the real object:</p>
      ${H.table(['Tool', 'Since', 'What it does', 'Reviewed in a PR?'], [
        ['<code>moved { from = ..., to = ... }</code>', '1.1', 'tell Terraform an object changed address', H.c('g', 'yes - it is code')],
        ['<code>import { to = ..., id = "..." }</code>', '1.5 (for_each in 1.7)', 'adopt an existing real object into state', H.c('g', 'yes, and plan shows it')],
        ['<code>removed { from = ... }</code>', '1.7', 'stop managing an object without destroying it', H.c('g', 'yes')],
        ['<code>terraform state mv / rm</code>, <code>terraform import ADDR ID</code>', 'old', 'same effects, done immediately from the CLI', H.c('r', 'no - leaves no trace in code')]
      ])}
      <p>Prefer the <b>blocks</b>: they go through review, CI shows the plan ("has moved to", "will be imported"), and they work for every environment that shares the code. Keep the CLI commands for emergencies and one-off local states.</p>
      <p>🔵 <b>Importing hand-made resources.</b> Write an <code>import</code> block with the target address and the provider's import ID (bucket name, <code>sg-...</code>, <code>i-...</code>). Then either write the resource block yourself, or run <code>terraform plan -generate-config-out=generated.tf</code> to have Terraform write it from the real object. Iterate until the plan says <b>import 1, change 0</b> - then the code truly describes what exists.</p>
      <p>🔵 <b>Drift</b> = the real world no longer matches state and code, usually because someone clicked in the console during an incident. Detect it with <code>terraform plan -detailed-exitcode</code> on a schedule (exit 0 = no changes, 2 = changes, 1 = error), or <code>plan -refresh-only</code> to see only what changed outside Terraform. Then decide per change: <b>revert</b> (apply the code), <b>adopt</b> (update the code to match, then apply shows no change), or <b>hand ownership away</b> (<code>ignore_changes</code> when another system owns that attribute). <code>terraform apply -refresh-only</code> records the real values in state without changing infrastructure.</p>
      <p>🔵 <b>-target and -replace.</b> <code>terraform apply -target=aws_instance.web</code> applies only part of the graph. It exists for recovery ("the provider is broken for one resource, fix everything else"), but routine use leaves the rest of the configuration un-applied and state out of step with code - Terraform itself prints a warning. <code>-replace=aws_instance.web</code> forces one object to be recreated (the replacement for the old <code>terraform taint</code>), shown in the plan for review.</p>`,
    clues: [
      '"rename the resource without destroying the database" → <code>moved</code> block; plan must show "has moved to" and 0 to destroy',
      '"bring the VPC we created by hand under Terraform" → <code>import</code> blocks + <code>plan -generate-config-out</code>, iterate to zero changes',
      '"hand this bucket over to another team\'s Terraform without deleting it" → <code>removed</code> block with <code>lifecycle { destroy = false }</code>, import on their side',
      '"someone opened port 22 in the console during the incident" → drift; scheduled <code>plan -detailed-exitcode</code>, then revert or adopt',
      '"just use -target to get it through" → recovery tool only; it hides the rest of the plan',
      '"the server is broken, rebuild just that one" → <code>terraform apply -replace=ADDRESS</code>'
    ],
    code: [hcl(C`# refactor.tf - the four refactoring blocks together.

# 1) Rename: the database keeps running; only its address changes.
resource "aws_db_instance" "orders" {         # was: aws_db_instance.db
  identifier                  = "orders-prod"  # the REAL name is unchanged
  engine                      = "postgres"
  engine_version              = "16"
  instance_class              = "db.t4g.micro"
  allocated_storage           = 20
  username                    = "orders_admin"
  manage_master_user_password = true
  deletion_protection         = true
  lifecycle {
    prevent_destroy = true
  }
}

moved {
  from = aws_db_instance.db
  to   = aws_db_instance.orders
}

# 2) Adopt a bucket and a security group someone created in the console.
import {
  to = aws_s3_bucket.reports
  id = "example-reports-123456789012"           # import ID for buckets = bucket name
}

resource "aws_s3_bucket" "reports" {
  bucket = "example-reports-123456789012"
}

import {
  to = aws_security_group.legacy_web
  id = "sg-0123456789abcdef0"
}
# The resource block for the SG can be generated (see the bash tab).

# 3) Import many at once (Terraform 1.7+): for_each on import blocks.
locals {
  log_buckets = {
    app   = "example-logs-app-123456789012"
    audit = "example-logs-audit-123456789012"
  }
}

import {
  for_each = local.log_buckets
  to       = aws_s3_bucket.logs[each.key]
  id       = each.value
}

resource "aws_s3_bucket" "logs" {
  for_each = local.log_buckets
  bucket   = each.value
}

# 4) Stop managing something WITHOUT deleting it (Terraform 1.7+).
removed {
  from = aws_s3_bucket.handed_to_data_team
  lifecycle {
    destroy = false                              # forget it, keep the real bucket
  }
}`, 'refactor.tf: moved, import (incl. for_each) and removed blocks'), sh(C`#!/usr/bin/env bash
set -euo pipefail
export AWS_PROFILE=lab

# Generate HCL for imported objects that have import blocks but no resource block yet
terraform plan -generate-config-out=generated.tf
# Read generated.tf, delete read-only/default noise, move it into a proper file, re-plan
terraform plan -out=tfplan             # goal: "N to import, 0 to add, 0 to change, 0 to destroy"
terraform apply tfplan

# CLI equivalents (no review trail - for emergencies and local experiments)
terraform state mv aws_db_instance.db aws_db_instance.orders
terraform import aws_s3_bucket.reports example-reports-123456789012
terraform state rm aws_s3_bucket.handed_to_data_team

# Drift detection: 0 = clean, 2 = something differs, 1 = error
set +e
terraform plan -detailed-exitcode -lock=false -input=false > drift.txt
code=$?
set -e
if [ "$code" -eq 2 ]; then echo "DRIFT or pending changes - see drift.txt"; fi

terraform plan -refresh-only           # only what changed OUTSIDE Terraform
terraform apply -replace=aws_instance.web   # rebuild one broken server, plan shown first`, 'Generating config, CLI state surgery, drift checks and -replace')],
    codeTitle: ['refactor.tf: moved, import (incl. for_each) and removed blocks', 'Generating config, CLI state surgery, drift checks and -replace'],
    viz: [{
      title: 'Renaming a database: with and without a moved block',
      input: 'from=aws_db_instance.db to=aws_db_instance.orders',
      inputLabel: 'from=OLD_ADDRESS to=NEW_ADDRESS',
      gen: function (input) {
        var m = String(input || '').match(/from\s*=\s*([\w.\[\]"-]+)\s+to\s*=\s*([\w.\[\]"-]+)/);
        if (!m) throw new Error('Use: from=aws_db_instance.db to=aws_db_instance.orders');
        var from = m[1], to = m[2];
        if (from === to) throw new Error('from and to must differ');
        var real = 'orders-prod (db-ABC123, 40 GB of orders)';
        return [
          { narr: 'State maps the address <code>' + from + '</code> to the real database <b>orders-prod</b>. Someone renames the resource block to <code>' + to + '</code> to match a naming standard. The real database does not care about Terraform names.', parts: [{ type: 'map', label: 'state', entries: [[from, real]], hl: one(from, 'cur') }, { type: 'map', label: 'code', entries: [[to, 'identifier = "orders-prod"']] }] },
          { narr: '<b>Without moved:</b> Terraform sees <code>' + from + '</code> in state but not in code (→ destroy) and <code>' + to + '</code> in code but not in state (→ create). The plan reads like an innocent rename but means ' + H.c('r', 'delete the production database and create an empty one') + '. (Creation would even fail on the duplicate identifier - after the delete.)', parts: [{ type: 'table', label: 'plan WITHOUT moved', columns: ['address', 'action'], rows: [[from, '- destroy'], [to, '+ create']], hl: { 0: 'bad', 1: 'bad' } }, { type: 'vars', label: 'summary', vals: { to_add: 1, to_destroy: 1 }, hl: { to_destroy: 'bad' } }] },
          { narr: 'Guards that would stop it: <code>prevent_destroy</code> makes the plan fail; <code>deletion_protection</code> makes the AWS API refuse. Good - but they only block the mistake, they do not let you rename. For that:', parts: [{ type: 'code', label: 'refactor.tf', lang: 'text', code: 'moved {\n  from = ' + from + '\n  to   = ' + to + '\n}', hl: { 2: 'cur', 3: 'cur' } }] },
          { narr: '<b>With moved:</b> before diffing, Terraform rewrites the state entry from the old address to the new one. Now code and state agree; the only plan line is "<code>' + from + '</code> has moved to <code>' + to + '</code>".', parts: [{ type: 'map', label: 'state (after move)', entries: [[to, real]], hl: one(to, 'ok') }, { type: 'table', label: 'plan WITH moved', columns: ['address', 'action'], rows: [[from + ' → ' + to, 'moved (no change)']], hl: { 0: 'ok' } }, { type: 'vars', label: 'summary', vals: { to_add: 0, to_change: 0, to_destroy: 0 }, hl: { to_destroy: 'ok' } }] },
          { narr: 'Keep the <code>moved</code> block for a while: every environment and every teammate\'s state must pass through it once. Remove it later (a release or two) - removing it is a breaking change for anyone who has not applied yet. CLI alternative: <code>terraform state mv ' + from + ' ' + to + '</code>, which works immediately but leaves no reviewed record.', parts: [{ type: 'table', label: 'options', columns: ['method', 'reviewed?', 'all environments?'], rows: [['moved block', 'yes', 'yes, automatically'], ['terraform state mv', 'no', 'run by hand per state']], hl: { 0: 'ok' } }] }
        ];
      }
    }, {
      title: 'Drift: a console change meets the code',
      input: 'code=443 state=443 real=443,22',
      inputLabel: 'open ports in code, in state, and really open (comma lists)',
      gen: function (input) {
        var m = String(input || '').match(/code\s*=\s*([\d,]*)\s+state\s*=\s*([\d,]*)\s+real\s*=\s*([\d,]*)/);
        if (!m) throw new Error('Use: code=443 state=443 real=443,22');
        function L(s) { return s.split(',').filter(Boolean).sort(function (a, b) { return a - b; }); }
        var c = L(m[1]), s = L(m[2]), r = L(m[3]);
        var added = r.filter(function (p) { return s.indexOf(p) < 0; }), removed = s.filter(function (p) { return r.indexOf(p) < 0; });
        var plus = c.filter(function (p) { return r.indexOf(p) < 0; }), minus = r.filter(function (p) { return c.indexOf(p) < 0; });
        return [
          { narr: 'Three views of one security group. <b>Code</b> is what you want, <b>state</b> is what Terraform last saw, <b>real</b> is the AWS API right now.', parts: [{ type: 'set', label: 'code', items: c }, { type: 'set', label: 'state', items: s }, { type: 'set', label: 'real (AWS)', items: r }] },
          { narr: 'Refresh compares state with reality: ' + (added.length || removed.length ? H.c('y', 'drift found') + ' - opened outside Terraform: ' + (added.join(', ') || 'none') + '; closed outside Terraform: ' + (removed.join(', ') || 'none') + '. <code>plan -refresh-only</code> shows exactly this.' : 'no drift: reality matches state.'), parts: [{ type: 'set', label: 'real (AWS)', items: r, hl: (function () { var h = {}; added.forEach(function (p) { h[p] = 'bad'; }); return h; })() }, { type: 'vars', label: 'drift', vals: { opened_outside: added.join(',') || '-', closed_outside: removed.join(',') || '-' } }] },
          { narr: 'Normal plan compares <b>code</b> with refreshed reality: it would ' + (minus.length ? H.c('r', 'remove ' + minus.join(', ')) : 'remove nothing') + ' and ' + (plus.length ? H.c('g', 'add ' + plus.join(', ')) : 'add nothing') + '. In a scheduled job, <code>plan -detailed-exitcode</code> exits <b>' + (plus.length || minus.length ? '2' : '0') + '</b>.', parts: [{ type: 'table', label: 'plan', columns: ['port', 'action'], rows: minus.map(function (p) { return [p, '- remove rule']; }).concat(plus.map(function (p) { return [p, '+ add rule']; })).concat(minus.length || plus.length ? [] : [['-', 'no changes']]) }] },
          { narr: 'Now a human decides. <b>Revert</b>: apply the plan (port 22 to the world was an incident hack - close it). <b>Adopt</b>: if the change was right, add it to the code in a PR so the plan becomes empty. <b>Hand over</b>: if another system owns the attribute, <code>ignore_changes</code>. Never silently "accept" drift with <code>apply -refresh-only</code> unless you also fix the code.', parts: [{ type: 'table', label: 'choices', columns: ['choice', 'how', 'when'], rows: [['revert', 'terraform apply', 'console change was wrong or temporary'], ['adopt', 'edit code, PR, apply = no-op', 'change was right'], ['hand over', 'lifecycle ignore_changes', 'another tool owns it']], hl: { 0: 'sel' } }] }
        ];
      }
    }],
    examples: [
      { title: 'Importing a hand-built production VPC', html: `<p>A start-up built its VPC, four subnets, two route tables and three security groups by clicking. Plan: (1) list them with the AWS CLI; (2) write one <code>import</code> block per object (IDs from the CLI); (3) run <code>plan -generate-config-out=generated.tf</code>; (4) clean the generated code (remove computed attributes, replace literal IDs with references like <code>aws_vpc.main.id</code>); (5) re-plan until <b>N to import, 0 to change</b>; (6) apply - only state changes. Rules imported this way may show up differently from how they were created (inline vs separate rule resources), so pick one style and import rules as <code>aws_vpc_security_group_ingress_rule</code> with their <code>sgr-</code> IDs.</p>`, code: sh(C`export AWS_PROFILE=lab
aws ec2 describe-vpcs --filters Name=tag:Name,Values=prod --query 'Vpcs[].VpcId' --output text
aws ec2 describe-subnets --filters Name=vpc-id,Values=vpc-0123456789abcdef0 \
  --query 'Subnets[].[SubnetId,AvailabilityZone,CidrBlock]' --output text
aws ec2 describe-security-group-rules --filters Name=group-id,Values=sg-0123456789abcdef0 \
  --query 'SecurityGroupRules[].[SecurityGroupRuleId,IsEgress,FromPort,CidrIpv4]' --output text`) },
      { title: 'Postmortem: console change, then apply reverted the fix', html: `<p>During an outage an engineer raised an ALB idle timeout from 60 to 300 seconds in the console; it fixed the problem. Two days later an unrelated Terraform apply set it back to 60 and the outage returned. Lessons: every console change during an incident gets a follow-up PR to adopt it in code; a nightly drift job (<code>plan -detailed-exitcode</code>) alerts on exit code 2; and the deploy pipeline shows the full plan, where <code>~ idle_timeout = 300 -&gt; 60</code> would have been visible.</p>` },
      { title: 'Splitting a state with removed + import', html: `<p>The monolith state holds the network and 40 app resources; the network team wants its own state. In the old root, a <code>removed</code> block (with <code>destroy = false</code>) for each network resource drops them from the app state without touching AWS. In the new network root, <code>import</code> blocks adopt the same objects. Apply the new root first (import), then the old one (forget), so there is never a moment when nobody manages the network - and never a moment when both try to.</p>`, code: hcl(C`# old app root
removed {
  from = aws_vpc.main
  lifecycle {
    destroy = false
  }
}

# new network root
import {
  to = aws_vpc.main
  id = "vpc-0123456789abcdef0"
}`) },
      { title: 'When -target is acceptable', html: `<p>A provider bug makes one CloudFront distribution fail to plan, blocking a critical security-group fix. Using <code>terraform apply -target=aws_vpc_security_group_ingress_rule.block_bad_ip</code> to ship the fix while the provider issue is investigated is reasonable - written down in the incident log, followed by a full plan as soon as possible. Using <code>-target</code> every day because "the full plan is too slow or noisy" is a sign the state is too big or drifted; fix that instead.</p>` }
    ],
    deepDive: `<p>🟣 <b>How moved works.</b> During planning Terraform applies all <code>moved</code> statements to the prior state before diffing; chains (<code>a → b</code>, <code>b → c</code>) are followed. You can move whole modules (<code>module.old → module.new</code>), between count and for_each instances, and into or out of modules - but not across states or between different resource types (since Terraform 1.8 some providers support moving between types, for example <code>null_resource</code> to <code>terraform_data</code>). Moving into a module from another <i>state</i> is a state migration (removed + import, or state pull/push), not a moved block.</p>
      <p><b>Import details.</b> The import ID is provider-specific - check the "Import" section at the bottom of each resource's docs (security group rule: <code>sgr-...</code>; IAM role policy attachment: <code>role-name/policy-arn</code>; route table association: <code>subnet-id/rtb-id</code>). An <code>import</code> block is idempotent: once the object is in state it is a no-op, so you may leave it or delete it after apply. Generated config is a starting point: it includes every attribute, sometimes conflicting ones, and never references, so expect cleanup.</p>
      <p><b>Drift sources</b> beyond console clicks: AWS changing defaults, other tools (Kubernetes controllers tagging resources, security scanners adding tags), auto-scaling, and provider upgrades that read attributes differently ("perpetual diffs"). Each needs a different answer: discipline, <code>ignore_changes</code>, provider-level <code>ignore_tags</code>, or a provider version pin. Services like HCP Terraform and some CI tools run health assessments (scheduled drift checks) for you; the underlying mechanism is the same refresh-and-plan.</p>
      <p><b>Preventing drift at the source:</b> remove write access in the console for humans in prod (read-only roles, break-glass role with logging for incidents), use SCPs or permission boundaries, and make "fix it in code" faster than "fix it in the console" with a quick pipeline.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> this is one of the most valuable uses of an assistant. Give it <code>terraform state list</code> before and after a refactor and it writes the <code>moved</code> blocks; give it a CLI listing of console-built resources and it writes <code>import</code> blocks with the right ID formats; give it <code>generated.tf</code> and it replaces literal IDs with references. Agents can run the drift job and summarise "what changed outside Terraform, who probably did it (CloudTrail), and whether to revert".</p>
      <p><b>Where it goes wrong:</b> models often suggest <code>terraform state rm</code> + <code>import</code> by hand where a <code>moved</code> block would leave a reviewed trail, invent import ID formats, and recommend <code>-target</code> or <code>apply -refresh-only</code> to "make the plan clean". <b>How to work with it:</b> require that every refactor PR's plan shows <b>0 to destroy</b> before merge, and treat any suggested CLI state command as a change needing a second reviewer. <b>What you still own:</b> deciding whether drift was a mistake to revert or a fix to adopt.</p>`,
    problems: [P({
      t: 'Rename and restructure without destroying the database', l: 'Medium', tags: ['moved', 'refactoring', 'prevent_destroy'], co: ['Stripe', 'Zalando', 'Amazon'],
      s: `<p>A configuration has <code>aws_db_instance.db</code> (production orders database) and <code>aws_instance.app[0]</code>, <code>aws_instance.app[1]</code> created with <code>count</code> over <code>["blue", "green"]</code>. The team wants: the database renamed to <code>aws_db_instance.orders</code> and moved into a module <code>module.data</code>, and the app servers switched to <code>for_each</code>. Write the code so the plan shows <b>no destroy and no create</b>, add guards so a future mistake cannot delete the database, and list the commands that prove it is safe.</p>`,
      ex: `<p>Expected plan: ${H.c('g', 'aws_db_instance.db has moved to module.data.aws_db_instance.orders')}, <code>aws_instance.app[0] has moved to aws_instance.app["blue"]</code>, <code>aws_instance.app[1] has moved to aws_instance.app["green"]</code>, then <code>Plan: 0 to add, 0 to change, 0 to destroy.</code></p>`,
      bw: `<p>Rename in code and apply. The plan shows "1 to add, 1 to destroy" for the DB and two replacements for the servers; if someone approves without reading, production data is gone. Running <code>terraform state mv</code> by hand works for one state but must be repeated, unreviewed, in staging and every other copy - and is easy to get wrong.</p>`,
      q: ['A moved block from <code>aws_db_instance.db</code> to <code>module.data.aws_db_instance.orders</code> is applied. What happens in AWS?', ['Nothing - only the state address changes', 'The database is renamed to "orders"', 'A snapshot is taken and restored', 'The database is restarted'], 0, 'moved only rewrites state. The real object keeps its identifier and data; the real name would change only if an argument like identifier changed, which would show as an update or replacement in the plan.'],
      h: ['<p>Hint 1: the address of a resource inside a module is <code>module.NAME.TYPE.LOCAL</code>; moved blocks live in the calling (root) module.</p>', '<p>Hint 2: count to for_each needs one moved block per index, mapping <code>app[0]</code> to <code>app["blue"]</code> using the old list order.</p>', '<p>Hint 3: guard with <code>prevent_destroy</code> in the module and <code>deletion_protection = true</code>; prove safety with a JSON plan check that no action contains <code>delete</code>.</p>'],
      a: `<p>Create <code>modules/data</code> containing the database as <code>aws_db_instance.orders</code> with <b>identical arguments</b> (especially <code>identifier</code>), <code>prevent_destroy</code> and <code>deletion_protection</code>. Call it as <code>module "data"</code>. In the root, add <code>moved { from = aws_db_instance.db  to = module.data.aws_db_instance.orders }</code>. Convert the app servers to <code>for_each = toset(["blue", "green"])</code> and add moved blocks for indexes 0 and 1. Run <code>init</code> (new module), <code>plan -out</code>, and check with <code>jq</code> that no resource change contains a <code>delete</code>; the plan must read 0/0/0 apart from moves. Apply, then keep the moved blocks for at least one release so every environment passes through them.</p>`,
      hcl: C`# modules/data/main.tf
variable "instance_class" {
  type    = string
  default = "db.t4g.micro"
}

resource "aws_db_instance" "orders" {
  identifier                  = "orders-prod"     # unchanged: no replacement
  engine                      = "postgres"
  engine_version              = "16"
  instance_class              = var.instance_class
  allocated_storage           = 20
  username                    = "orders_admin"
  manage_master_user_password = true
  storage_encrypted           = true
  deletion_protection         = true              # AWS refuses deletes
  final_snapshot_identifier   = "orders-prod-final"
  lifecycle {
    prevent_destroy = true                        # Terraform refuses destroy plans
  }
}

output "endpoint" {
  value = aws_db_instance.orders.address
}

# ---- root main.tf ----
module "data" {
  source = "./modules/data"
}

moved {
  from = aws_db_instance.db
  to   = module.data.aws_db_instance.orders
}

resource "aws_instance" "app" {
  for_each      = toset(["blue", "green"])        # was: count = 2
  ami           = data.aws_ami.al2023.id
  instance_type = "t3.micro"
  tags          = { Name = "app-@{each.key}" }
}

moved {
  from = aws_instance.app[0]
  to   = aws_instance.app["blue"]
}

moved {
  from = aws_instance.app[1]
  to   = aws_instance.app["green"]
}`,
      sh: C`#!/usr/bin/env bash
set -euo pipefail
export AWS_PROFILE=lab
terraform init -input=false            # picks up the new local module
terraform plan -out=tfplan -input=false
terraform show tfplan | grep -E 'has moved to|^Plan:'
# Hard gate: fail if any action deletes something
terraform show -json tfplan \
  | jq -e '[.resource_changes[] | select(.change.actions | index("delete"))] | length == 0' \
  && echo "safe: no deletes"
terraform apply tfplan
terraform state list | grep -E 'module.data|aws_instance.app'`,
      cx: `<p>Only state is rewritten: seconds, no downtime, no cost. The guards add zero runtime cost and turn a catastrophic mistake into a failed plan.</p>`,
      f: ['What if staging\'s state still has <code>aws_db_instance.db</code> when you delete the moved block?', 'How would you rename the real database identifier too, safely?']
    })]
  });

  // ───────────────────────── Topic 8: policy as code and Terraform in CI ─────────────────────────
  var REGO = C`# policy/terraform.rego - run with: conftest test tfplan.json --policy policy/
# Input is "terraform show -json tfplan". Rego v1 syntax (OPA 1.0+).
package main

import rego.v1

protected_types := {"aws_db_instance", "aws_s3_bucket", "aws_kms_key", "aws_dynamodb_table"}

admin_ports := {22, 3389, 5432, 3306}

allowed_instance_types := {"t3.micro", "t3.small", "t4g.micro", "t4g.small", "m7g.large"}

# 1) Never delete (or replace) stateful resources through a normal pipeline
deny contains msg if {
	rc := input.resource_changes[_]
	protected_types[rc.type]
	"delete" in rc.change.actions
	msg := sprintf("%s would be deleted (actions %v): protected type %s", [rc.address, rc.change.actions, rc.type])
}

# 2) No admin ports open to the whole internet
deny contains msg if {
	rc := input.resource_changes[_]
	rc.type == "aws_vpc_security_group_ingress_rule"
	rc.change.after.cidr_ipv4 == "0.0.0.0/0"
	admin_ports[rc.change.after.from_port]
	msg := sprintf("%s opens port %d to 0.0.0.0/0", [rc.address, rc.change.after.from_port])
}

# 3) Only approved instance sizes (cost guardrail)
deny contains msg if {
	rc := input.resource_changes[_]
	rc.type == "aws_instance"
	"create" in rc.change.actions
	not allowed_instance_types[rc.change.after.instance_type]
	msg := sprintf("%s uses %s, not in the approved list", [rc.address, rc.change.after.instance_type])
}`;

  topics.push({
    title: 'Policy as Code and Terraform in CI: fmt, validate, tflint, checkov, trivy, OPA/conftest and Sentinel',
    analogy: `<p>An airport. Before a plane leaves, an automated checklist runs (<b>fmt, validate, lint</b>: is the paperwork filled in correctly?), security scans every bag (<b>checkov / trivy</b>: known dangerous items), and then a rulebook specific to this airline is checked (<b>policy as code</b>: "no flights over 12 hours with one pilot", or "no database deletions without approval"). Only then does a human in the tower give clearance (<b>approval</b>), and the plane flies <b>exactly the flight plan that was filed</b> (<code>apply tfplan</code>), not a new one improvised on the runway.</p>`,
    explain: `<p>🟢 <b>Why CI for Terraform?</b> Laptops have different CLI versions, different credentials and no audit trail. A pipeline runs the same tool version, with a deploy role nobody types by hand, shows the plan in the pull request, serialises applies, and records who approved what. The usual rule: humans <b>plan</b> locally if they like, but only CI <b>applies</b> to shared environments.</p>
      <p>🟢 <b>The checks, cheapest first:</b></p>
      ${H.table(['Stage', 'Command', 'Catches'], [
        ['Format', '<code>terraform fmt -check -recursive</code>', 'style noise in diffs'],
        ['Validate', '<code>terraform init -backend=false</code> + <code>terraform validate</code>', 'syntax, types, unknown arguments'],
        ['Lint', '<code>tflint --init</code> + <code>tflint --recursive</code>', 'invalid instance types, deprecated syntax, unused variables, naming (provider rulesets)'],
        ['Security scan (static)', '<code>checkov -d .</code> or <code>trivy config .</code>', 'unencrypted buckets, open security groups, missing logging (hundreds of built-in rules; tfsec now lives on in trivy)'],
        ['Plan', '<code>terraform plan -out=tfplan</code>', 'what will really change, with real values'],
        ['Policy on the plan', '<code>terraform show -json tfplan &gt; tfplan.json</code> + <code>conftest test tfplan.json</code>', 'your company rules: no deletes of databases, approved sizes, required tags'],
        ['Approval + apply', 'protected environment, then <code>terraform apply tfplan</code>', 'humans read the destroys; the reviewed plan is what runs']
      ])}
      <p>🔵 <b>Static scan vs plan-time policy.</b> checkov and trivy read your <code>.tf</code> files (and can also read plan JSON) and know common best practices. <b>Policy as code</b> encodes <i>your</i> rules and runs against the <b>plan</b>, where values from variables and modules are resolved and the <b>actions</b> are known - so it can say "this plan deletes a database", which no static scanner can. Two main engines: <b>OPA</b> (Open Policy Agent) with the <b>Rego</b> language, run with <code>conftest</code> in any CI (also supported natively in HCP Terraform), and <b>Sentinel</b>, HashiCorp's language, available in HCP Terraform and Terraform Enterprise with advisory, soft-mandatory (can be overridden by an authorised person) and hard-mandatory levels.</p>
      <p>🔵 <b>Credentials in CI: no stored keys.</b> GitHub Actions, GitLab CI and others can request a short-lived <b>OIDC</b> token; AWS trusts the CI provider's identity and lets the job assume a role (for example only from the <code>main</code> branch of one repository). Use a read-only <b>plan</b> role for pull requests and a separate <b>apply</b> role, only on <code>main</code>, behind an environment approval. Saved plan files and plan JSON contain secrets too: keep artifacts private and short-lived.</p>`,
    clues: [
      '"how do you stop someone merging a change that deletes the database" → policy on the plan JSON (OPA/conftest or Sentinel) + required review',
      '"we found an unencrypted bucket in prod" → checkov / trivy config in CI before merge, and a policy rule',
      '"the plan we approved is not what got applied" → <code>plan -out</code> in the PR pipeline, <code>apply tfplan</code> after approval',
      '"AWS keys stored as CI secrets" → OIDC federation to an IAM role, separate plan and apply roles',
      '"Sentinel vs OPA" → Sentinel in HCP Terraform/Enterprise; OPA/Rego anywhere via conftest (and in HCP Terraform)',
      '"nightly check that nobody changed prod by hand" → scheduled <code>plan -detailed-exitcode</code> drift job'
    ],
    code: [{ lang: 'text', code: REGO, check: false, title: 'policy/terraform.rego' }, sh(C`#!/usr/bin/env bash
# Run the same checks locally that CI runs. Tools: tflint, checkov (pip), trivy, conftest.
set -euo pipefail
terraform fmt -check -recursive
terraform init -input=false
terraform validate
tflint --init && tflint --recursive          # uses .tflint.hcl (AWS ruleset)
checkov -d . --framework terraform --quiet   # or: trivy config --severity HIGH,CRITICAL .
terraform plan -out=tfplan -input=false -lock-timeout=5m
terraform show -json tfplan > tfplan.json
conftest test tfplan.json --policy policy/   # non-zero exit = policy violation
rm -f tfplan tfplan.json                     # both may contain secrets`, 'Local pre-merge checks, cheapest first'), hcl(C`# .tflint.hcl - enable the AWS ruleset (checks instance types, deprecated args, ...)
plugin "terraform" {
  enabled = true
  preset  = "recommended"
}

plugin "aws" {
  enabled = true
  version = "0.38.0"
  source  = "github.com/terraform-linters/tflint-ruleset-aws"
}`, '.tflint.hcl')],
    codeTitle: ['policy/terraform.rego: deny deletes, open admin ports, unapproved sizes', 'Local pre-merge checks, cheapest first', '.tflint.hcl'],
    viz: [{
      title: 'A pull request through the Terraform pipeline',
      input: 'fail=conftest',
      inputLabel: 'fail = none, fmt, validate, tflint, checkov, plan, conftest or review',
      gen: function (input) {
        var m = String(input || '').match(/fail\s*=\s*(none|fmt|validate|tflint|checkov|plan|conftest|review)/i);
        if (!m) throw new Error('Use: fail=none (or fmt, validate, tflint, checkov, plan, conftest, review)');
        var fail = m[1].toLowerCase();
        var st = [
          ['fmt', 'fmt -check', 'formatting differs in network.tf; run terraform fmt'],
          ['validate', 'validate', 'Unsupported argument: "instance_typ" is not expected here (typo in aws_instance)'],
          ['tflint', 'tflint', 'aws_instance_invalid_type: "t3.mirco" is not a valid instance type'],
          ['checkov', 'checkov / trivy', 'CKV_AWS_24: security group allows ingress from 0.0.0.0/0 to port 22'],
          ['plan', 'plan -out', 'Error: AccessDenied - the plan role cannot read the new resource type'],
          ['conftest', 'conftest (OPA)', 'aws_db_instance.orders would be deleted (actions ["delete","create"]): protected type'],
          ['review', 'human review', 'reviewer sees "-/+ forces replacement" on a cache cluster and requests changes'],
          ['apply', 'apply tfplan', '']
        ];
        var nodes = st.map(function (s, i) { return box(s[0], s[1], 7 + i * 12.3, i % 2 ? 40 : 20, 12); });
        var edges = st.slice(1).map(function (s, i) { return [st[i][0], s[0]]; });
        function g(hl, ehl) { return { type: 'graph', label: 'pipeline', directed: true, height: 60, nodes: nodes, edges: edges, hl: hl, ehl: ehl || {} }; }
        var f = [{ narr: 'A pull request changes the network and the database module. The pipeline runs cheap, fast checks first, so most mistakes are caught in seconds without any cloud credentials.', parts: [g({}), { type: 'vars', label: 'PR #482', vals: { branch: 'feat/orders-db', files: 'network.tf, modules/data', credentials: 'plan role via OIDC (read-only)' } }] }];
        var hl = {}, ehl = {};
        for (var i = 0; i < st.length; i++) {
          var s = st[i], cur = Object.assign({}, hl);
          if (s[0] === 'apply') {
            cur.apply = 'ok';
            f.push({ narr: 'Approved. The apply job (apply role, only on <code>main</code>, protected environment) runs <code>terraform apply tfplan</code> - the <b>exact</b> plan the reviewers read. If state changed in between, Terraform refuses the stale plan and the pipeline plans again.', parts: [g(cur, ehl), { type: 'text', label: 'result', html: '<p>' + H.c('g', 'Applied') + '. Plan file and JSON artifacts expire after a day because they contain secrets.</p>' }] });
            break;
          }
          if (s[0] === fail) {
            cur[s[0]] = 'bad';
            f.push({ narr: H.c('r', s[1] + ' failed') + ': <i>' + s[2] + '</i>. The pipeline stops here; nothing later runs, nothing is applied. The author fixes it and pushes again.', parts: [g(cur, ehl), { type: 'text', label: 'check output', html: '<p><code>' + H.esc(s[2]) + '</code></p>' }] });
            f.push({ narr: 'Why the order matters: a failure at <b>' + s[1] + '</b> cost ' + (i < 3 ? 'seconds and no cloud access' : i < 5 ? 'a minute and only read-only access' : 'a full plan, but it was caught before any change') + '. Every stage after it would have been wasted work - or worse, an apply.', parts: [{ type: 'table', label: 'stage costs', columns: ['stage', 'needs cloud?', 'typical time'], rows: [['fmt / validate / tflint', 'no', 'seconds'], ['checkov / trivy', 'no', 'seconds'], ['plan', 'read-only role', '1-5 min'], ['conftest', 'no (reads plan JSON)', 'seconds'], ['apply', 'apply role + approval', 'minutes']] }] });
            return f;
          }
          cur[s[0]] = 'ok';
          f.push({ narr: H.c('g', s[1] + ' passed.') + (s[0] === 'plan' ? ' The plan is saved as <code>tfplan</code> and converted to JSON for policy; a summary is posted as a PR comment.' : s[0] === 'conftest' ? ' No deny rules matched the plan JSON.' : s[0] === 'review' ? ' A reviewer read the destroy and replace lines and approved.' : ''), parts: [g(cur, ehl)] });
          hl[s[0]] = 'ok';
          if (i + 1 < st.length) ehl[s[0] + '-' + st[i + 1][0]] = 'ok';
        }
        return f;
      }
    }],
    examples: [
      { title: 'The policy that saved the orders database', html: `<p>A refactor PR renamed a module without a <code>moved</code> block. The plan showed <code>-/+</code> for the orders database among 30 other lines, and the reviewer missed it. <code>conftest</code> failed: "aws_db_instance.orders would be deleted ... protected type". The author added the moved block; the next plan showed only moves. Policies are a <b>second reviewer that never gets tired</b> - not a replacement for reading the plan.</p>` },
      { title: 'OIDC: CI deploys to AWS without any stored key', html: `<p>The IAM role trusts GitHub's OIDC provider and only tokens for one repository's <code>main</code> branch (or one GitHub environment). The workflow requests <code>id-token: write</code> and assumes the role; credentials last an hour and never exist as a secret.</p>`, code: { lang: 'json', code: C`{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Federated": "arn:aws:iam::222222222222:oidc-provider/token.actions.githubusercontent.com" },
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {
      "StringEquals": {
        "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
        "token.actions.githubusercontent.com:sub": "repo:acme/infra:environment:production"
      }
    }
  }]
}` } },
      { title: 'Sentinel in HCP Terraform (and when it is the choice)', html: `<p>Companies on HCP Terraform or Terraform Enterprise attach <b>policy sets</b> to workspaces; Sentinel (or OPA) runs between plan and apply. A <i>soft-mandatory</i> policy ("instance types above m7g.xlarge need approval") can be overridden by a named role with an audit record; <i>hard-mandatory</i> ones ("no public S3 buckets") cannot. With plain CI or OpenTofu, OPA/conftest gives the same result; Sentinel itself is only available inside HashiCorp's products.</p>`, code: { lang: 'text', check: false, code: C`# restrict-instance-type.sentinel (HCP Terraform policy set)
import "tfplan/v2" as tfplan

allowed = ["t3.micro", "t3.small", "m7g.large"]

instances = filter tfplan.resource_changes as _, rc {
  rc.type is "aws_instance" and
  (rc.change.actions contains "create" or rc.change.actions contains "update")
}

main = rule {
  all instances as _, rc {
    rc.change.after.instance_type in allowed
  }
}` } },
      { title: 'Nightly drift job', html: `<p>A scheduled pipeline runs <code>terraform plan -detailed-exitcode</code> in every environment with the read-only role. Exit 2 opens a ticket with the plan attached (redacted), exit 1 pages nobody but alerts the platform channel. Over a quarter, the drift tickets show which teams still change prod by hand - useful data for removing console write access.</p>`, code: sh(C`set +e
terraform plan -detailed-exitcode -input=false -lock=false -no-color > plan.txt 2>&1
rc=$?
set -e
case "$rc" in
  0) echo "no drift" ;;
  2) echo "drift detected"; grep -E '^\s+[-~+]|^Plan:' plan.txt | head -50 ;;
  *) echo "plan failed"; tail -20 plan.txt; exit 1 ;;
esac`) }
    ],
    deepDive: `<p>🟣 <b>The plan JSON is the contract.</b> <code>terraform show -json tfplan</code> produces <code>resource_changes[]</code> with <code>address</code>, <code>type</code>, <code>mode</code>, and <code>change.actions</code> - one of <code>["no-op"]</code>, <code>["create"]</code>, <code>["read"]</code>, <code>["update"]</code>, <code>["delete"]</code>, <code>["delete","create"]</code> (replace) or <code>["create","delete"]</code> (create-before-destroy replace) - plus <code>change.before</code>, <code>change.after</code> and <code>after_unknown</code>. Policies must handle unknown values (known only after apply) and modules (addresses with <code>module.</code> prefixes). Write unit tests for Rego (<code>opa test</code> / <code>conftest verify</code>) with small JSON fixtures, just like application code.</p>
      <p><b>Tool landscape (2026):</b> tflint (linting, provider-aware rules); checkov (Prisma Cloud, graph-based checks across Terraform, Kubernetes, Dockerfiles); trivy config (Aqua; absorbed tfsec); KICS; OPA/conftest and Sentinel for custom policy; Infracost for "this PR adds $412/month" comments; terraform-docs for module READMEs; pre-commit hooks running fmt, validate, tflint and secret scanners before code leaves the laptop. Platforms such as Atlantis, HCP Terraform, Spacelift, env0 and Terrateam wrap the plan-comment-approve-apply loop with locking per directory.</p>
      <p><b>Pipeline hardening.</b> Pin tool versions (Terraform, providers via the lock file, tflint plugins, actions by commit SHA - supply-chain attacks on popular CI actions have happened). Plan with a role that cannot write; apply with a role that only CI on <code>main</code> can assume; run one apply at a time per state (CI concurrency group plus state locking). Never print plan JSON or <code>TF_LOG=DEBUG</code> output in public logs: both can contain secrets. And be careful with plans for pull requests from forks: the PR can change code that runs during plan (external data sources, provider configuration), so forks get no cloud credentials at all.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> assistants write Rego and Sentinel well when given a sample plan JSON, explain checkov findings and suggest the fix, and summarise a 400-line plan into "3 creates, 1 risky replace of the cache cluster". AI review bots now comment on Terraform PRs. Some platforms let an agent open the PR, run the pipeline and iterate on failures.</p>
      <p><b>Where it goes wrong:</b> generated policies often use old Rego syntax (pre-1.0 <code>deny[msg] {</code>), forget <code>["delete","create"]</code> replacements, or match on attributes that are unknown at plan time and so never fire. AI plan summaries can miss the one dangerous line. Suppressing a checkov rule with a skip comment is the "easy fix" models like to suggest. <b>How to work with it:</b> test every policy against a fixture where it <b>must</b> fail; require a written reason for every scanner suppression; keep the human approval on applies. <b>What you still own:</b> which rules are hard stops, and the final read of the destroy lines.</p>`,
    problems: [P({
      t: 'Build a Terraform pipeline with policy gates', l: 'Hard', tags: ['CI/CD', 'policy as code', 'OPA', 'OIDC', 'GitHub Actions'], co: ['GitHub', 'Datadog', 'Capital One'],
      s: `<p>Your platform team wants every change to <code>envs/prod</code> to go through GitHub Actions: formatting, validation, linting, a security scan, a saved plan, OPA policy checks on the plan (no deletion of protected types, no admin ports open to the internet, approved instance sizes), a human approval, and an apply of exactly the reviewed plan. No AWS keys may be stored in GitHub. Write the workflow and the policy, and explain how you would prove the policy works.</p>`,
      ex: `<p>A PR that sets <code>from_port = 22</code> with <code>cidr_ipv4 = "0.0.0.0/0"</code> fails at conftest with ${H.c('r', 'aws_vpc_security_group_ingress_rule.ssh opens port 22 to 0.0.0.0/0')}. A clean PR passes and shows its plan; merging runs plan again on <code>main</code>, waits for approval on the <code>production</code> environment, then runs ${H.c('g', 'terraform apply tfplan')}.</p>`,
      bw: `<p>One job that runs <code>terraform apply -auto-approve</code> on every push to main, with long-lived access keys in repository secrets. No preview, no policy, no approval; the keys are a standing credential that every workflow (and anyone who can edit one) can use.</p>`,
      q: ['In CI, why run <code>apply tfplan</code> instead of <code>apply -auto-approve</code>?', ['It applies exactly the plan that was reviewed and policy-checked; a stale plan is refused', 'It is faster because it skips refresh', 'It does not need state locking', 'It does not need credentials'], 0, 'auto-approve creates a fresh plan that nobody has seen. A saved plan ties approval and policy checks to the exact change, and Terraform rejects it if state changed since.'],
      h: ['<p>Hint 1: split into a <b>plan</b> job (any PR and main, read-only role) and an <b>apply</b> job (main only, <code>environment: production</code> with required reviewers, apply role), passing <code>tfplan</code> as an artifact.</p>', '<p>Hint 2: authenticate with <code>aws-actions/configure-aws-credentials</code> and <code>permissions: id-token: write</code>; the IAM trust policy limits which repo/branch/environment can assume each role.</p>', '<p>Hint 3: policy input is <code>terraform show -json tfplan</code>; test the Rego with fixtures that must fail (a delete of aws_db_instance, port 22 open) and must pass.</p>'],
      a: `<p><b>Plan job</b> (PRs and pushes to main): checkout, install a pinned Terraform, assume the read-only plan role via OIDC, then <code>fmt -check</code>, <code>init</code>, <code>validate</code>, <code>tflint</code>, <code>checkov</code>, <code>plan -out=tfplan</code>, <code>show -json</code>, <code>conftest test</code>. Upload <code>tfplan</code> as a short-lived artifact. <b>Apply job</b> (push to main only): <code>needs: plan</code>, <code>environment: production</code> (required reviewers in repository settings), assume the apply role (trusted only for that environment), <code>init</code>, download the artifact, <code>apply tfplan</code>. A <code>concurrency</code> group keeps one prod run at a time; state locking is the second guard. <b>Policy</b>: the Rego tab denies deletes of protected types (including replacements, whose actions contain <code>delete</code>), admin ports open to <code>0.0.0.0/0</code> and unapproved instance sizes. <b>Proof</b>: <code>conftest verify</code> unit tests plus two fixture plan JSONs - one must produce exactly the expected deny messages, one must pass - run in the same pipeline.</p>`,
      yaml: C`# .github/workflows/terraform-prod.yml
name: terraform-prod
on:
  pull_request:
    paths: ["envs/prod/**", "modules/**", "policy/**"]
  push:
    branches: [main]
    paths: ["envs/prod/**", "modules/**", "policy/**"]

permissions:
  id-token: write        # OIDC token for AWS, no stored keys
  contents: read

concurrency:
  group: terraform-prod
  cancel-in-progress: false

env:
  TF_IN_AUTOMATION: "true"

jobs:
  plan:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: envs/prod
    steps:
      - uses: actions/checkout@v4                        # pin to a commit SHA in real repos
      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: "1.10.5"
          terraform_wrapper: false
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::222222222222:role/terraform-plan-prod   # read-only
          aws-region: eu-west-1
      - run: terraform fmt -check -recursive
      - run: terraform init -input=false
      - run: terraform validate
      - uses: terraform-linters/setup-tflint@v4
      - run: tflint --init && tflint --recursive
      - run: pip install checkov==3.2.* && checkov -d . --framework terraform --quiet
      - run: terraform plan -out=tfplan -input=false -lock-timeout=5m
      - run: terraform show -json tfplan > tfplan.json
      - run: docker run --rm -v "@{{ github.workspace }}:/project" -w /project openpolicyagent/conftest:v0.56.0 test envs/prod/tfplan.json --policy policy/
      - uses: actions/upload-artifact@v4
        with:
          name: tfplan
          path: envs/prod/tfplan
          retention-days: 1                              # plans contain secrets

  apply:
    needs: plan
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production                              # required reviewers approve here
    defaults:
      run:
        working-directory: envs/prod
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: "1.10.5"
          terraform_wrapper: false
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::222222222222:role/terraform-apply-prod  # only this environment
          aws-region: eu-west-1
      - run: terraform init -input=false
      - uses: actions/download-artifact@v4
        with:
          name: tfplan
          path: envs/prod
      - run: terraform apply -input=false tfplan`,
      alt: [{ lang: 'text', check: false, code: REGO }],
      sh: C`#!/usr/bin/env bash
# Prove the policy: fixtures that must fail and must pass
set -euo pipefail
mkdir -p fixtures
cat > fixtures/bad.json <<'JSON'
{"resource_changes": [
  {"address": "aws_db_instance.orders", "type": "aws_db_instance", "mode": "managed",
   "change": {"actions": ["delete", "create"], "after": {}}},
  {"address": "aws_vpc_security_group_ingress_rule.ssh", "type": "aws_vpc_security_group_ingress_rule", "mode": "managed",
   "change": {"actions": ["create"], "after": {"cidr_ipv4": "0.0.0.0/0", "from_port": 22}}}
]}
JSON
cat > fixtures/good.json <<'JSON'
{"resource_changes": [
  {"address": "aws_instance.web", "type": "aws_instance", "mode": "managed",
   "change": {"actions": ["create"], "after": {"instance_type": "t3.micro"}}}
]}
JSON
if conftest test fixtures/bad.json --policy policy/; then echo "policy too weak"; exit 1; fi
conftest test fixtures/good.json --policy policy/
echo "policy behaves as expected"`,
      cx: `<p>Pipeline time: about 1-2 minutes of checks plus the plan; apply time unchanged. Cost: CI minutes only; no stored credentials to rotate, and every prod change has a reviewed plan, a policy result and an approver on record.</p>`,
      f: ['How do you handle pull requests from forks safely?', 'Where would you add an Infracost estimate, and should it ever block a merge?']
    })]
  });

  // ───────────────────────── Practice: Easy ─────────────────────────
  practice.push(P({
    t: 'Your first Terraform project, with no cloud account', l: 'Easy', tags: ['workflow', 'random', 'local', 'gitignore'], co: ['Infosys', 'Accenture', 'AWS Support'],
    s: `<p>Set up a new repository that a trainee can run on any laptop: Terraform 1.6+ pinned, the <code>random</code> and <code>local</code> providers pinned, a random two-word environment name, a file <code>out/env.txt</code> containing it, an output, a <code>.gitignore</code> that keeps state and caches out of Git, and the commands for the full loop including cleanup. Explain which files get committed.</p>`,
    ex: `<p>After <code>terraform apply</code>: output ${H.c('g', 'env_name = "quiet-heron"')} and <code>out/env.txt</code> containing it. Running <code>terraform plan</code> again prints ${H.c('g', 'No changes')}. <code>git status</code> shows <code>main.tf</code>, <code>.gitignore</code>, <code>.terraform.lock.hcl</code> - never <code>terraform.tfstate</code> or <code>.terraform/</code>.</p>`,
    bw: `<p>Skip version pins and the <code>.gitignore</code>; run <code>git add .</code>. The next <code>init</code> on another laptop may pull a new major provider version, and the commit contains the state file and a 100 MB provider binary in <code>.terraform/</code>.</p>`,
    q: ['Which file should be committed?', ['<code>.terraform.lock.hcl</code>', '<code>terraform.tfstate</code>', '<code>.terraform/providers/...</code>', '<code>tfplan</code>'], 0, 'The lock file records exact provider versions and checksums so everyone gets the same providers. State and plans may contain secrets; .terraform is a download cache.'],
    h: ['<p>Hint 1: a <code>terraform</code> block holds <code>required_version</code> and <code>required_providers</code> with <code>source</code> and <code>version</code>.</p>', '<p>Hint 2: reference <code>random_pet.env.id</code> inside the file content so Terraform orders them.</p>', '<p>Hint 3: ignore <code>.terraform/</code>, <code>*.tfstate</code>, <code>*.tfstate.*</code>, plan files and secret tfvars; commit the lock file.</p>'],
    a: `<p>Pin the CLI (<code>&gt;= 1.6.0</code>) and both providers with <code>~&gt;</code> constraints; <code>init</code> writes the lock file, which is committed so every machine and CI resolve identical provider builds. <code>random_pet</code> generates the name, <code>local_file</code> writes it (implicit dependency through the reference), an <code>output</code> prints it. The loop is <code>init → fmt → validate → plan -out → apply tfplan</code>; a second plan shows no changes (idempotence); <code>destroy</code> removes the file and the name. The <code>.gitignore</code> keeps state, plans and the provider cache out of Git.</p>`,
    hcl: C`terraform {
  required_version = ">= 1.6.0"
  required_providers {
    random = { source = "hashicorp/random", version = "~> 3.6" }
    local  = { source = "hashicorp/local", version = "~> 2.5" }
  }
}

resource "random_pet" "env" {
  length = 2
}

resource "local_file" "env" {
  filename        = "@{path.module}/out/env.txt"
  content         = "@{random_pet.env.id}\n"
  file_permission = "0644"
}

output "env_name" {
  value = random_pet.env.id
}`,
    sh: C`#!/usr/bin/env bash
set -euo pipefail
printf '%s\n' '.terraform/' '*.tfstate' '*.tfstate.*' 'tfplan' '*.tfplan' 'crash.log' '*.secret.tfvars' 'out/' > .gitignore
terraform init
terraform fmt -check || terraform fmt
terraform validate
terraform plan -out=tfplan
terraform apply tfplan
cat out/env.txt
terraform plan                       # No changes.
git add .gitignore main.tf .terraform.lock.hcl
git status --short                   # no tfstate, no .terraform/
terraform destroy -auto-approve && rm -f tfplan`,
    cx: `<p>Seconds to run, zero cost. The habits (pins, lock file, ignore rules, plan -out) are the same ones used for production.</p>`,
    f: ['What changes in the lock file after <code>terraform init -upgrade</code>?', 'Why does the random name not change on the second apply?']
  }));

  practice.push(P({
    t: 'Where does each workspace keep its state?', l: 'Easy', tags: ['workspaces', 'S3 backend', 'state'], co: ['Amazon', 'Thoughtworks'],
    s: `<p>The S3 backend stores the <code>default</code> workspace at <code>key</code>, and any other workspace at <code>workspace_key_prefix/WORKSPACE/key</code>, where the prefix defaults to <code>env:</code>. Write <code>stateKey(key, workspace, prefix)</code> returning the S3 object key (an empty <code>prefix</code> means the default <code>env:</code>). Then show the commands that confirm it in a real bucket.</p>`,
    c: `<p>Keys and workspace names are non-empty strings without spaces. Pure string logic; the bucket check only lists objects (free).</p>`,
    ex: `<p><code>("network/terraform.tfstate", "staging", "env:")</code> → ${H.c('g', '"env:/staging/network/terraform.tfstate"')}; <code>("network/terraform.tfstate", "default", "env:")</code> → <code>"network/terraform.tfstate"</code>; prefix <code>"workspaces"</code> → <code>"workspaces/prod/app.tfstate"</code>.</p>`,
    bw: `<p>Guess the path, or assume each workspace gets its own bucket. During an incident people then look at the wrong object, or "restore" the default workspace's state into prod. Knowing the exact layout is what lets you find and recover the right file.</p>`,
    q: ['Two CLI workspaces, staging and prod, use one S3 backend. What separates their state?', ['Different object keys in the same bucket', 'Different buckets automatically', 'Different AWS accounts', 'Nothing - they share one state'], 0, 'Workspaces are separate states in the same backend: same bucket, same credentials, different key prefixes. That is why they are weak isolation for prod.'],
    h: ['<p>Hint 1: the default workspace is special: no prefix at all.</p>', '<p>Hint 2: otherwise join prefix, workspace and key with <code>/</code>.</p>', '<p>Hint 3: replace an empty prefix with <code>env:</code> first.</p>'],
    a: `<p>If the workspace is <code>default</code>, return <code>key</code> unchanged. Otherwise use the prefix (or <code>env:</code> when empty) and return <code>prefix + "/" + workspace + "/" + key</code>. In practice, <code>aws s3 ls --recursive</code> on the bucket shows exactly these keys (plus <code>.tflock</code> files while a run holds the lock).</p>`,
    hcl: C`terraform {
  backend "s3" {
    bucket               = "example-tfstate-123456789012-euw1"
    key                  = "network/terraform.tfstate"
    region               = "eu-west-1"
    encrypt              = true
    use_lockfile         = true
    workspace_key_prefix = "env:"        # the default, shown for clarity
  }
}`,
    sh: C`#!/usr/bin/env bash
set -euo pipefail
export AWS_PROFILE=lab
terraform workspace new staging || terraform workspace select staging
terraform apply -auto-approve
aws s3 ls s3://example-tfstate-123456789012-euw1 --recursive | grep terraform.tfstate
# 2026-05-01 10:00:00   1234 env:/staging/network/terraform.tfstate
# 2026-05-01 09:00:00   5678 network/terraform.tfstate          <- default workspace`,
    py: C`def state_key(key, workspace, prefix):
    """S3 object key for a workspace's state, following the S3 backend's layout."""
    if workspace == "default":
        return key                       # default workspace: the key itself
    prefix = prefix or "env:"            # backend default for workspace_key_prefix
    return prefix + "/" + workspace + "/" + key`,
    cx: `<p>O(length of the strings).</p>`,
    f: ['Why does this layout make it easy to give one IAM policy access to all workspaces - and why is that a problem for prod?', 'How would separate directories change where prod state lives?'],
    tests: { sig: 'string string string -> string', fn: 'stateKey', cases: [
      [['network/terraform.tfstate', 'default', 'env:'], 'network/terraform.tfstate'],
      [['network/terraform.tfstate', 'staging', 'env:'], 'env:/staging/network/terraform.tfstate'],
      [['app.tfstate', 'prod', ''], 'env:/prod/app.tfstate'],
      [['app.tfstate', 'prod', 'workspaces'], 'workspaces/prod/app.tfstate'],
      [['a/b/c.tfstate', 'feature-x', 'env:'], 'env:/feature-x/a/b/c.tfstate'],
      [['app.tfstate', 'default', ''], 'app.tfstate']
    ] }
  }));

  practice.push(P({
    t: 'Run a web container with the Docker provider', l: 'Easy', tags: ['docker provider', 'outputs', 'replacement'], co: ['Docker', 'Red Hat'],
    s: `<p>Without any cloud account, use the <code>kreuzwerker/docker</code> provider to run two nginx containers, <code>blue</code> on port 8081 and <code>green</code> on port 8082, from one pinned image, on a dedicated network. Output both URLs. Then predict and verify what the plan does when you change green's port, and clean up.</p>`,
    ex: `<p>Outputs: ${H.c('g', 'urls = { blue = "http://localhost:8081", green = "http://localhost:8082" }')}. Changing green to 8083: plan shows <code>docker_container.web["green"]</code> <b>must be replaced</b> (ports force replacement) and blue untouched: <code>1 to add, 0 to change, 1 to destroy</code>.</p>`,
    bw: `<p>Two copy-pasted container blocks with <code>image = "nginx:latest"</code>. The copy-paste drifts apart, and <code>latest</code> means two applies a week apart run different software.</p>`,
    q: ['You change the external port of a running docker_container. What does the plan show?', ['-/+ replace the container', '~ update in place', 'No changes', 'An error'], 0, 'A running container\'s port mapping cannot be changed, so the provider marks ports as forcing replacement. The same idea applies to many cloud attributes such as an EC2 AMI.'],
    h: ['<p>Hint 1: one <code>docker_image</code>, one <code>docker_network</code>, and <code>docker_container</code> with <code>for_each</code> over a map of name to port.</p>', '<p>Hint 2: <code>image = docker_image.nginx.image_id</code> creates the dependency; <code>networks_advanced</code> attaches the network.</p>', '<p>Hint 3: the output is a <code>for</code> expression over the map; verify with <code>curl</code>, clean up with <code>destroy</code>.</p>'],
    a: `<p>A map variable <code>{ blue = 8081, green = 8082 }</code> drives <code>for_each</code>, so each container has a stable key. The image is pinned to a tag and kept locally on destroy. The URLs output is built from the same map. Changing one port replaces only that container, which you confirm in the plan before applying. This is a free, fast rehearsal of the replacement behaviour you will meet with servers and databases.</p>`,
    hcl: C`terraform {
  required_version = ">= 1.6.0"
  required_providers {
    docker = { source = "kreuzwerker/docker", version = "~> 3.0" }
  }
}

provider "docker" {}

variable "sites" {
  type    = map(number)
  default = { blue = 8081, green = 8082 }
}

resource "docker_network" "web" {
  name = "tf-web"
}

resource "docker_image" "nginx" {
  name         = "nginx:1.27-alpine"
  keep_locally = true
}

resource "docker_container" "web" {
  for_each = var.sites
  name     = "web-@{each.key}"
  image    = docker_image.nginx.image_id
  ports {
    internal = 80
    external = each.value
  }
  networks_advanced {
    name = docker_network.web.name
  }
}

output "urls" {
  value = { for name, port in var.sites : name => "http://localhost:@{port}" }
}`,
    sh: C`#!/usr/bin/env bash
set -euo pipefail
terraform init && terraform apply -auto-approve
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8081   # 200
terraform plan -var='sites={"blue":8081,"green":8083}' | grep -E 'must be replaced|^Plan:'
terraform destroy -auto-approve`,
    cx: `<p>Seconds; free. Same mechanics as a cloud provider without the bill.</p>`,
    f: ['How would you roll out a new nginx version to blue first, then green?', 'What does <code>keep_locally</code> change at destroy time?']
  }));

  practice.push(P({
    t: 'Pin providers and make every machine use the same build', l: 'Easy', tags: ['required_providers', 'lock file', 'versions'], co: ['HashiCorp', 'GitLab'],
    s: `<p>CI fails with "the cached package for registry.terraform.io/hashicorp/aws ... does not match any of the checksums recorded in the dependency lock file", while laptops (macOS ARM) work. Also, a teammate's laptop pulled AWS provider 6.x and the plan exploded. Fix the configuration so all machines use the same provider build, explain the version constraint you chose, and show how to upgrade on purpose later.</p>`,
    ex: `<p>After the fix, <code>.terraform.lock.hcl</code> lists <code>version = "5.x.y"</code> with hashes for <code>linux_amd64</code> and <code>darwin_arm64</code>; CI and laptops print the same provider version in <code>terraform version</code>; nobody gets 6.x until a deliberate upgrade PR.</p>`,
    bw: `<p>Delete the lock file "to fix" CI, or add <code>-upgrade</code> to every <code>init</code>. Both mean each run may pick a different provider build - the opposite of reproducible.</p>`,
    q: ['What does <code>version = "~&gt; 5.40"</code> allow?', ['5.40 and any newer 5.x, but not 6.0', 'Only 5.40.x', 'Any version above 5.40, including 6.x', 'Exactly 5.40.0'], 0, 'The pessimistic operator lets only the rightmost given part grow: with two parts, minor versions can increase; the major is fixed.'],
    h: ['<p>Hint 1: the constraint lives in <code>required_providers</code>; the exact build lives in the lock file.</p>', '<p>Hint 2: a lock file created on a Mac only holds hashes for that platform; <code>terraform providers lock -platform=...</code> adds others.</p>', '<p>Hint 3: upgrades are a separate PR: <code>init -upgrade</code>, read the provider changelog, plan every environment.</p>'],
    a: `<p>Set <code>required_version</code> for the CLI and <code>version = "~&gt; 5.40"</code> for AWS: newer 5.x fixes are allowed, 6.0 (which can contain breaking changes) is not. The lock file pins the exact version chosen at init. Regenerate it with hashes for every platform that runs Terraform (<code>terraform providers lock -platform=linux_amd64 -platform=darwin_arm64 -platform=darwin_amd64</code>) and commit it. CI runs plain <code>init</code> (never <code>-upgrade</code>), so it uses the locked build. Upgrades happen deliberately in their own PR with plans for every environment.</p>`,
    hcl: C`terraform {
  required_version = ">= 1.6.0, < 2.0.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.40"            # 5.40 <= v < 6.0
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
}`,
    sh: C`#!/usr/bin/env bash
set -euo pipefail
terraform init
terraform providers lock -platform=linux_amd64 -platform=darwin_arm64 -platform=darwin_amd64
grep -A3 'hashicorp/aws' .terraform.lock.hcl
git add .terraform.lock.hcl && git commit -m "Lock providers for all platforms"
# Later, on purpose, in its own PR:
terraform init -upgrade
git diff .terraform.lock.hcl
terraform plan`,
    cx: `<p>One-off, minutes. Prevents "works on my machine" provider drift for good.</p>`,
    f: ['Why should reusable modules use wider constraints than root configurations?', 'Where can a company mirror providers for air-gapped CI?']
  }));

  // ───────────────────────── Practice: Medium ─────────────────────────
  practice.push(P({
    t: 'Does this version satisfy the constraint?', l: 'Medium', tags: ['version constraints', 'parsing', 'providers'], co: ['HashiCorp', 'Microsoft'],
    s: `<p>Write <code>versionAllowed(constraint, version)</code> implementing Terraform's version constraints for plain <code>MAJOR.MINOR.PATCH</code> versions. A constraint is a comma-separated list; every part must hold. Operators: <code>=</code> (or none), <code>!=</code>, <code>&gt;</code>, <code>&gt;=</code>, <code>&lt;</code>, <code>&lt;=</code>, and <code>~&gt;</code> (pessimistic: <code>~&gt; 1.2</code> means <code>&gt;= 1.2.0, &lt; 2.0.0</code>; <code>~&gt; 1.2.3</code> means <code>&gt;= 1.2.3, &lt; 1.3.0</code>). Missing parts count as 0. Compare numerically.</p>`,
    c: `<p>Constraint versions have 2 or 3 parts; the checked version has 3. No pre-release tags. Pure computation.</p>`,
    ex: `<p><code>("~&gt; 5.0", "5.40.0")</code> → ${H.c('g', 'true')}; <code>("~&gt; 5.40.0", "5.41.0")</code> → ${H.c('r', 'false')}; <code>("&gt;= 1.6.0", "1.10.5")</code> → <code>true</code> (10 &gt; 6 numerically, even though "1.10" &lt; "1.6" as text).</p>`,
    bw: `<p>Compare version strings as text. <code>"1.10.5" &lt; "1.6.0"</code> as strings, so a correct CLI gets rejected - a classic bug in home-made CI scripts that check tool versions.</p>`,
    q: ['Which versions does <code>~&gt; 5.40.0</code> allow?', ['5.40.0 up to (not including) 5.41.0', '5.40.0 up to 6.0.0', 'Only 5.40.0', 'Anything from 5.40.0'], 0, 'With three parts given, only the patch number may grow.'],
    h: ['<p>Hint 1: parse every version into a tuple of 3 integers so tuple comparison does the work.</p>', '<p>Hint 2: <code>~&gt;</code> with n given parts: lower bound is the version; upper bound bumps part n-2 (0-based) and zeroes the rest.</p>', '<p>Hint 3: split the constraint on commas, strip spaces, read the operator with a regex, and require all parts to pass.</p>'],
    a: `<p>Normalise each version to <code>(major, minor, patch)</code>, padding with zeros. For each comma-separated clause, read the operator (default <code>=</code>) and the version. Ordinary operators compare tuples. For <code>~&gt;</code> with <i>n</i> parts, the lower bound is the version itself and the upper bound increments part <i>n-2</i> and zeroes everything after it: <code>~&gt; 5.0</code> → <code>&lt; 6.0.0</code>, <code>~&gt; 5.40.0</code> → <code>&lt; 5.41.0</code>. Return true only if every clause holds. This is the same logic <code>terraform init</code> uses to choose a provider version, before the lock file freezes the choice.</p>`,
    hcl: C`terraform {
  required_version = ">= 1.6.0, < 2.0.0"        # two clauses, both must hold
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.40, != 5.41.0"             # skip one known-bad release
    }
  }
}`,
    sh: C`#!/usr/bin/env bash
set -euo pipefail
terraform version -json | jq -r '.terraform_version'
terraform init -upgrade >/dev/null
terraform version -json | jq -r '.provider_selections'`,
    py: C`import re

def _parse(v):
    parts = [int(p) for p in v.split(".")]
    return tuple(parts + [0] * (3 - len(parts))), len(parts)

def version_allowed(constraint, version):
    """Terraform-style constraint check for MAJOR.MINOR.PATCH versions."""
    have, _ = _parse(version)
    for clause in constraint.split(","):
        m = re.match(r"^\s*(~>|>=|<=|!=|=|>|<)?\s*([\d.]+)\s*$", clause)
        op, want_s = (m.group(1) or "="), m.group(2)
        want, n = _parse(want_s)
        if op == "~>":
            upper = list(want)
            i = max(n - 2, 0)                  # the part allowed to grow is the last given one
            upper[i] += 1
            for j in range(i + 1, 3):
                upper[j] = 0
            ok = want <= have < tuple(upper)
        else:
            ok = {"=": have == want, "!=": have != want, ">": have > want,
                  ">=": have >= want, "<": have < want, "<=": have <= want}[op]
        if not ok:
            return False
    return True`,
    cx: `<p>O(number of clauses).</p>`,
    f: ['Why do module authors prefer <code>&gt;= 5.0</code> while root configs pin <code>~&gt; 5.40</code>?', 'How do pre-release versions such as 1.11.0-beta1 change the rules?'],
    tests: { sig: 'string string -> bool', fn: 'versionAllowed', cases: [
      [['~> 5.0', '5.40.0'], true], [['~> 5.0', '6.0.0'], false], [['~> 5.40.0', '5.40.9'], true], [['~> 5.40.0', '5.41.0'], false],
      [['>= 1.6.0', '1.10.5'], true], [['>= 1.6.0, < 2.0.0', '2.0.0'], false], [['= 3.6.2', '3.6.2'], true], [['3.6.2', '3.6.3'], false],
      [['!= 5.1.0, ~> 5.0', '5.1.0'], false], [['~> 5.0', '4.67.0'], false], [['< 1.10', '1.9.8'], true], [['> 1.6.0', '1.6.0'], false],
      [['~> 1.6', '1.6.0'], true]
    ] }
  }));

  practice.push(P({
    t: 'Count the plan summary from plan JSON actions', l: 'Medium', tags: ['plan JSON', 'replace', 'automation'], co: ['Atlassian', 'Spacelift'],
    s: `<p>A PR bot reads <code>terraform show -json tfplan</code> and must print Terraform's summary line. Each resource change has an actions list, given to you joined by commas: <code>"create"</code>, <code>"update"</code>, <code>"delete"</code>, <code>"delete,create"</code> (replace), <code>"create,delete"</code> (create-before-destroy replace), <code>"read"</code> or <code>"no-op"</code>. Write <code>planSummary(actions)</code> returning <code>[toAdd, toChange, toDestroy]</code>. A replacement counts as one add and one destroy.</p>`,
    c: `<p>0-10 000 entries. Pure computation; the bash tab shows the same with <code>jq</code> on a real plan.</p>`,
    ex: `<p><code>["create","create","delete,create","update","update","delete"]</code> → ${H.c('g', '[3, 2, 2]')}: two creates plus the replacement's create; two updates; the replacement's delete plus one delete.</p>`,
    bw: `<p>Count entries by their first action only. Replacements then count as destroys only (or creates only), and the bot reports "0 to destroy" for a plan that recreates a database - the one number reviewers trust most is wrong.</p>`,
    q: ['How does Terraform count a <code>-/+</code> replacement in the summary?', ['1 to add and 1 to destroy', '1 to change', '1 to add only', 'It is not counted'], 0, 'A replacement creates a new object and destroys the old one, so it appears in both counts. That is why "1 to add, 0 to change, 1 to destroy" often means one replacement.'],
    h: ['<p>Hint 1: split each entry on commas into a set of actions.</p>', '<p>Hint 2: "create" in the set adds one to add; "delete" adds one to destroy; "update" one to change.</p>', '<p>Hint 3: "read" and "no-op" count as nothing.</p>'],
    a: `<p>For each entry, split into actions. Increment <i>add</i> if it contains <code>create</code>, <i>destroy</i> if it contains <code>delete</code>, <i>change</i> if it contains <code>update</code>. Both replacement orders contain create and delete, so they count once in each. Data source reads and no-ops are ignored. A PR bot should also list the addresses of every entry containing <code>delete</code>, because the summary alone does not say <b>which</b> resources go.</p>`,
    code: C`#!/usr/bin/env bash
# Same summary from a real plan, plus the list of everything that will be deleted
set -euo pipefail
terraform plan -out=tfplan -input=false >/dev/null
terraform show -json tfplan > tfplan.json
jq -r '[.resource_changes[].change.actions] as $a
  | "Plan: \([$a[] | select(index("create"))] | length) to add, \([$a[] | select(index("update"))] | length) to change, \([$a[] | select(index("delete"))] | length) to destroy."' tfplan.json
jq -r '.resource_changes[] | select(.change.actions | index("delete")) | "DELETES: \(.address) \(.change.actions | join(","))"' tfplan.json
rm -f tfplan tfplan.json`,
    py: C`def plan_summary(actions):
    """[to_add, to_change, to_destroy] exactly as Terraform's summary line counts them."""
    add = change = destroy = 0
    for entry in actions:
        acts = set(entry.split(","))
        if "create" in acts:
            add += 1
        if "update" in acts:
            change += 1
        if "delete" in acts:
            destroy += 1          # replacements count here AND in add
    return [add, change, destroy]`,
    cx: `<p>O(n) time, O(1) memory: one pass over the resource changes.</p>`,
    f: ['How would the bot highlight replacements of protected resource types?', 'Why is <code>["read"]</code> shown for some data sources at plan time?'],
    tests: { sig: 'string[] -> int[]', fn: 'planSummary', cases: [
      [[['create', 'update', 'delete']], [1, 1, 1]], [[['delete,create']], [1, 0, 1]], [[['create,delete', 'no-op', 'read']], [1, 0, 1]],
      [[[]], [0, 0, 0]], [[['no-op', 'no-op']], [0, 0, 0]], [[['create', 'create', 'delete,create', 'update', 'update', 'delete']], [3, 2, 2]],
      [[['read', 'read']], [0, 0, 0]]
    ] }
  }));

  practice.push(P({
    t: 'Move existing local state to S3 and retire the DynamoDB lock table', l: 'Medium', tags: ['backend', 'migration', 'locking'], co: ['Amazon', 'Booking.com'],
    s: `<p>Two projects need backend work. Project A still uses local state. Project B uses the S3 backend with <code>dynamodb_table = "terraform-locks"</code> on Terraform 1.5. Move A to S3 with native locking, and move B to Terraform 1.10+ with <code>use_lockfile</code>, without any window where two runs could both get a lock, then retire the DynamoDB table. Include cost notes and cleanup.</p>`,
    ex: `<p>A: <code>terraform init -migrate-state</code> copies the state; plan shows ${H.c('g', 'No changes')}. B: during the transition both <code>use_lockfile = true</code> and <code>dynamodb_table</code> are set, so old and new CLIs exclude each other; once every pipeline runs 1.10+, the DynamoDB setting and table are removed.</p>`,
    bw: `<p>Switch B straight to <code>use_lockfile</code> while some pipelines still run 1.5 with DynamoDB: the old runs lock DynamoDB, the new runs lock the S3 file, and both can write state at once. Or delete the table first and break every old pipeline.</p>`,
    q: ['Why enable both lock mechanisms during the migration?', ['Old and new Terraform versions then both see each other\'s locks', 'DynamoDB is faster', 'S3 locking needs DynamoDB to work', 'It encrypts the lock'], 0, 'With both set, new versions acquire both locks; old versions acquire the DynamoDB one, which the new versions also check. Once nothing old remains, drop DynamoDB.'],
    h: ['<p>Hint 1: back up state before any backend change (<code>state pull</code>).</p>', '<p>Hint 2: changing backend settings requires <code>init -reconfigure</code> (no state copy) or <code>-migrate-state</code> (copy).</p>', '<p>Hint 3: remove the DynamoDB table only after every pipeline and laptop uses 1.10+; it costs almost nothing on on-demand billing, so there is no hurry.</p>'],
    a: `<p><b>A:</b> add the <code>backend "s3"</code> block with <code>encrypt</code> and <code>use_lockfile</code>, back up <code>terraform.tfstate</code>, run <code>init -migrate-state</code>, verify a clean plan, delete the local files. <b>B:</b> upgrade CI and laptops to Terraform 1.10+ (1.11+ for GA locking) in a PR that sets <b>both</b> <code>use_lockfile = true</code> and <code>dynamodb_table</code>; run <code>init -reconfigure</code> (same state location, no copy). When every runner is upgraded, remove <code>dynamodb_table</code> in a second PR; check the table has no items, then delete it. Costs: S3 state and lock objects are cents per month; an on-demand DynamoDB lock table is usually under $1/month, so the main gain is simplicity, not money.</p>`,
    hcl: C`terraform {
  required_version = ">= 1.10.0"
  backend "s3" {
    bucket       = "example-tfstate-123456789012-euw1"
    key          = "project-b/terraform.tfstate"
    region       = "eu-west-1"
    encrypt      = true
    use_lockfile = true                   # new: S3 lock file
    dynamodb_table = "terraform-locks"    # transition only; remove in the next PR
  }
}`,
    sh: C`#!/usr/bin/env bash
set -euo pipefail
export AWS_PROFILE=lab
# Project A: local -> S3
cd project-a
cp terraform.tfstate "/secure/project-a-$(date +%s).tfstate"
terraform init -migrate-state
terraform plan -detailed-exitcode && echo "clean"
rm -f terraform.tfstate terraform.tfstate.backup

# Project B: same state location, new lock mechanism
cd ../project-b
terraform state pull > "/secure/project-b-$(date +%s).tfstate"
terraform init -reconfigure
terraform plan
# After every runner is on 1.10+ and dynamodb_table is removed from code:
aws dynamodb scan --table-name terraform-locks --select COUNT
aws dynamodb delete-table --table-name terraform-locks`,
    cx: `<p>Minutes per project; no resources change. Risk is concentrated in the transition window, which the dual-lock step removes.</p>`,
    f: ['What does <code>init -reconfigure</code> do differently from <code>-migrate-state</code>?', 'How would you find every repository that still references the lock table?']
  }));

  practice.push(P({
    t: 'Import a hand-made bucket and security group', l: 'Medium', tags: ['import', 'generate-config-out', 'adoption'], co: ['AWS Support', 'Deloitte', 'Capgemini'],
    s: `<p>Production has an S3 bucket <code>example-invoices-123456789012</code> (versioning on, SSE-S3) and a security group <code>sg-0a1b2c3d4e5f60718</code> with one HTTPS rule <code>sgr-0123456789abcdef0</code>, all created in the console. Bring them under Terraform with <b>no changes</b> to the real resources, using import blocks and generated configuration, and write the clean final code.</p>`,
    ex: `<p>Goal plan: ${H.c('g', 'Plan: 5 to import, 0 to add, 0 to change, 0 to destroy.')} (bucket, versioning, encryption configuration, security group, ingress rule). After apply, a second plan shows <code>No changes</code>.</p>`,
    bw: `<p>Write resource blocks from memory and run <code>apply</code>. Terraform does not know the objects exist: it tries to create a bucket with the same name (fails, the name is taken) and a duplicate security group (succeeds - now there are two).</p>`,
    q: ['What is the import ID for <code>aws_s3_bucket</code>?', ['The bucket name', 'The bucket ARN', 'The account ID', 'The region'], 0, 'Each resource type documents its import ID at the bottom of its docs page. For buckets it is the name; for security group rules the sgr- ID; for instances the i- ID.'],
    h: ['<p>Hint 1: in AWS provider v5 a bucket\'s versioning and encryption are separate resources - import each.</p>', '<p>Hint 2: write import blocks only, then <code>terraform plan -generate-config-out=generated.tf</code>.</p>', '<p>Hint 3: clean the generated code (references instead of literal IDs, drop computed noise) and re-plan until 0 to change.</p>'],
    a: `<p>List the objects with read-only CLI calls. Write <code>import</code> blocks for the bucket, its versioning, its encryption configuration, the security group and the rule (ID formats: bucket name for the bucket and its sub-resources, <code>sg-</code> and <code>sgr-</code> IDs). Generate config, then tidy it: replace <code>bucket = "example-invoices-..."</code> in sub-resources with <code>aws_s3_bucket.invoices.id</code>, replace the rule's group ID with a reference, remove empty or computed arguments. Iterate until the plan shows only imports. Apply (state-only), keep the code, and optionally delete the import blocks afterwards.</p>`,
    hcl: C`import {
  to = aws_s3_bucket.invoices
  id = "example-invoices-123456789012"
}
import {
  to = aws_s3_bucket_versioning.invoices
  id = "example-invoices-123456789012"
}
import {
  to = aws_s3_bucket_server_side_encryption_configuration.invoices
  id = "example-invoices-123456789012"
}
import {
  to = aws_security_group.web
  id = "sg-0a1b2c3d4e5f60718"
}
import {
  to = aws_vpc_security_group_ingress_rule.web_https
  id = "sgr-0123456789abcdef0"
}

resource "aws_s3_bucket" "invoices" {
  bucket = "example-invoices-123456789012"
  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_s3_bucket_versioning" "invoices" {
  bucket = aws_s3_bucket.invoices.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "invoices" {
  bucket = aws_s3_bucket.invoices.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_security_group" "web" {
  name        = "web-prod"                 # must match the existing name exactly
  description = "web tier"                 # changing description forces replacement
  vpc_id      = "vpc-0123456789abcdef0"
}

resource "aws_vpc_security_group_ingress_rule" "web_https" {
  security_group_id = aws_security_group.web.id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "tcp"
  from_port         = 443
  to_port           = 443
}`,
    sh: C`#!/usr/bin/env bash
set -euo pipefail
export AWS_PROFILE=lab
aws s3api get-bucket-versioning --bucket example-invoices-123456789012
aws ec2 describe-security-groups --group-ids sg-0a1b2c3d4e5f60718 \
  --query 'SecurityGroups[0].[GroupName,Description,VpcId]' --output text
terraform init
terraform plan -generate-config-out=generated.tf     # only for import targets with no resource block
terraform plan -out=tfplan                           # iterate until: N to import, 0 to change
terraform apply tfplan
terraform plan                                       # No changes.`,
    cx: `<p>Under an hour for a handful of resources; zero changes to the real objects. Watch for attributes that force replacement (security group <code>name</code>/<code>description</code>) - copy them exactly.</p>`,
    f: ['How would you import 300 buckets?', 'Which tools can discover unmanaged resources across an account?']
  }));

  practice.push(P({
    t: 'Stop a secret leaking through outputs and state', l: 'Medium', tags: ['sensitive', 'secrets', 'state', 'RDS'], co: ['Revolut', 'Coinbase', 'Amazon'],
    s: `<p>A module generates the RDS master password with <code>random_password</code>, passes it to <code>aws_db_instance</code>, and outputs <code>db_url</code> containing it. Someone wrapped the output in <code>nonsensitive()</code> because Terraform complained, so the password appears in CI logs. Fix the leak at every layer: logs, outputs, state, and the password itself. Explain what <code>sensitive</code> does and does not protect.</p>`,
    ex: `<p>After the fix: CI logs show ${H.c('g', 'master_user_secret_arn = "arn:aws:secretsmanager:...:secret:rds!db-..."')} and no password; the state contains no password (AWS generated and stores it); the leaked password has been rotated; apps read it from Secrets Manager at runtime.</p>`,
    bw: `<p>Add <code>sensitive = true</code> to the output and call it done. Logs are clean, but the password is still in the state file in clear text (and in any saved plan), readable by everyone with state access - and the already-leaked password is still valid.</p>`,
    q: ['A variable is marked <code>sensitive = true</code>. Where can its value still be read in clear text?', ['In the state file and saved plan files', 'Nowhere - it is encrypted', 'Only in the AWS console', 'Only in terraform.tfvars'], 0, 'sensitive only redacts CLI and log output. State and plan files store real values, which is why they need encryption and access control, and why secrets are best kept out of Terraform entirely.'],
    h: ['<p>Hint 1: the safest secret is one Terraform never sees: RDS <code>manage_master_user_password = true</code>.</p>', '<p>Hint 2: output the secret\'s ARN, not the secret; remove <code>nonsensitive()</code>.</p>', '<p>Hint 3: rotate the leaked password, purge or restrict old CI logs and old state versions, and lock down state access.</p>'],
    a: `<p><b>Contain:</b> rotate the password now (it is compromised), restrict and expire the CI logs that contain it, and review who could read state. <b>Fix:</b> remove <code>random_password</code> and the <code>password</code> argument; set <code>manage_master_user_password = true</code>, so AWS generates the password, stores it in Secrets Manager and rotates it - Terraform state then holds only the secret ARN. Replace <code>db_url</code> with outputs for host, port and the secret ARN; apps fetch the password at runtime with their IAM role. Any remaining secret variables keep <code>sensitive = true</code>; never use <code>nonsensitive()</code> on secrets. <b>Protect state anyway:</b> encrypted backend, least-privilege access, and old state versions that contained the password expired with a lifecycle rule. On newer versions, ephemeral values and write-only arguments are other ways to keep secrets out of state.</p>`,
    hcl: C`resource "aws_db_instance" "app" {
  identifier                  = "app-prod"
  engine                      = "postgres"
  engine_version              = "16"
  instance_class              = "db.t4g.micro"
  allocated_storage           = 20
  username                    = "app_admin"
  manage_master_user_password = true       # AWS creates + stores the password; not in state
  storage_encrypted           = true
  deletion_protection         = true
  final_snapshot_identifier   = "app-prod-final"
}

output "db_host" {
  value = aws_db_instance.app.address
}

output "db_port" {
  value = aws_db_instance.app.port
}

output "db_secret_arn" {
  description = "Apps read the password from here at runtime"
  value       = aws_db_instance.app.master_user_secret[0].secret_arn
}

variable "third_party_api_token" {
  type      = string
  sensitive = true                         # still lands in state: prefer a secret manager
}`,
    sh: C`#!/usr/bin/env bash
set -euo pipefail
export AWS_PROFILE=lab
terraform plan -out=tfplan && terraform apply tfplan
# Prove the state no longer holds a password
terraform state pull | jq '[.resources[] | select(.type=="aws_db_instance") | .instances[].attributes.password] '
# Expect: [null]
SECRET_ARN=$(terraform output -raw db_secret_arn)
aws secretsmanager describe-secret --secret-id "$SECRET_ARN" --query '[Name,RotationEnabled]'
# Old CLI-visible secrets: search the repo history and CI config for leftovers
git grep -n 'nonsensitive(' -- '*.tf' || echo "no nonsensitive() calls"`,
    cx: `<p>A small change; the switch to managed passwords modifies the DB instance in place (brief settings update, no data loss). Secrets Manager costs about $0.40 per secret per month.</p>`,
    f: ['How do ephemeral resources (Terraform 1.10+) help with secrets you must pass to a provider?', 'How should the app get the password without a restart when it rotates?']
  }));

  // ───────────────────────── Practice: Hard ─────────────────────────
  practice.push(P({
    t: 'Write the policy gate that reads the plan', l: 'Hard', tags: ['policy as code', 'plan JSON', 'OPA'], co: ['Capital One', 'Goldman Sachs', 'Datadog'],
    s: `<p>Before adopting OPA, your team prototypes the rules in Python. Each planned change is given as <code>"type|address|actions|k=v;k=v"</code> (actions comma-joined as in plan JSON; attributes from <code>change.after</code>, possibly empty). Write <code>policyViolations(changes)</code> returning messages in input order (rules checked in this order per change):</p>
      <ul><li><code>"delete ADDRESS"</code> if the type is protected (<code>aws_db_instance</code>, <code>aws_s3_bucket</code>, <code>aws_kms_key</code>, <code>aws_dynamodb_table</code>) and actions contain <code>delete</code> (replacements included);</li>
      <li><code>"open ADDRESS PORT"</code> for an <code>aws_vpc_security_group_ingress_rule</code> being created or updated with <code>cidr_ipv4=0.0.0.0/0</code> and <code>from_port</code> in 22, 3389, 3306, 5432;</li>
      <li><code>"size ADDRESS TYPE"</code> for an <code>aws_instance</code> being created whose <code>instance_type</code> is not in t3.micro, t3.small, t4g.micro, t4g.small, m7g.large (use <code>unknown</code> if missing).</li></ul>
      <p>Then give the equivalent Rego.</p>`,
    c: `<p>0-10 000 changes; addresses may include <code>module.</code> prefixes. Pure computation; the Rego runs locally with conftest.</p>`,
    ex: `<p><code>["aws_kms_key|aws_kms_key.k|create,delete|", "aws_vpc_security_group_ingress_rule|r.rdp|create|cidr_ipv4=0.0.0.0/0;from_port=3389"]</code> → ${H.c('r', '["delete aws_kms_key.k", "open r.rdp 3389"]')}. A create-before-destroy replacement still deletes the old key; RDP open to the world is denied. Deleting an open rule is <i>fine</i> - it makes things safer.</p>`,
    bw: `<p>Grep the human-readable plan for "destroy". It misses <code>-/+</code> lines phrased differently, matches comments and resource names containing "destroy", knows nothing about ports or sizes, and breaks whenever Terraform changes its output wording. The JSON plan is the stable interface.</p>`,
    q: ['Which plan actions represent a replacement that a "no deletes" policy must catch?', ['Both ["delete","create"] and ["create","delete"]', 'Only ["delete"]', 'Only ["delete","create"]', '["update"]'], 0, 'Replacement appears in either order depending on create_before_destroy. Both destroy the old object, so a policy must check whether delete is contained in actions, not equal to it.'],
    h: ['<p>Hint 1: split on <code>|</code> into 4 fields; parse attributes with <code>;</code> and the first <code>=</code>.</p>', '<p>Hint 2: use sets of actions and of protected types; check "delete" membership, not equality.</p>', '<p>Hint 3: the open-port rule applies only to create/update (deleting a bad rule is good); the size rule only to creates; a missing instance_type is reported as unknown.</p>'],
    a: `<p>Parse each change; build the actions set and an attribute dictionary. Rule 1: protected type and <code>delete</code> in actions → deny. Rule 2: ingress rule with create or update, world CIDR, admin port → deny. Rule 3: instance creation with a type outside the allow-list (or unknown) → deny. Messages are appended in input order. The Rego in the text tab expresses the same rules over <code>input.resource_changes</code>; the Python is a fast way to design and unit-test the rules with the team before writing Rego, and both should share the same fixtures.</p>`,
    code: C`#!/usr/bin/env bash
# Run the real policy (Rego tab) against a real plan
set -euo pipefail
terraform plan -out=tfplan -input=false
terraform show -json tfplan > tfplan.json
conftest test tfplan.json --policy policy/ --output table
rm -f tfplan tfplan.json`,
    alt: [{ lang: 'text', check: false, code: REGO }],
    py: C`PROTECTED = {"aws_db_instance", "aws_s3_bucket", "aws_kms_key", "aws_dynamodb_table"}
ADMIN_PORTS = {"22", "3389", "3306", "5432"}
ALLOWED = {"t3.micro", "t3.small", "t4g.micro", "t4g.small", "m7g.large"}

def policy_violations(changes):
    """Deny messages for planned changes, in input order."""
    out = []
    for change in changes:
        rtype, address, actions_s, attrs_s = change.split("|", 3)
        actions = set(actions_s.split(","))
        attrs = dict(kv.split("=", 1) for kv in attrs_s.split(";") if kv)
        if rtype in PROTECTED and "delete" in actions:
            out.append("delete " + address)
        if (rtype == "aws_vpc_security_group_ingress_rule"
                and actions & {"create", "update"}
                and attrs.get("cidr_ipv4") == "0.0.0.0/0"
                and attrs.get("from_port") in ADMIN_PORTS):
            out.append("open " + address + " " + attrs["from_port"])
        if rtype == "aws_instance" and "create" in actions:
            itype = attrs.get("instance_type", "unknown")
            if itype not in ALLOWED:
                out.append("size " + address + " " + itype)
    return out`,
    cx: `<p>O(total input size). Policy evaluation is milliseconds even for plans with thousands of changes; the plan itself dominates pipeline time.</p>`,
    f: ['How do you handle attributes that are unknown until apply (after_unknown)?', 'Which rules should be advisory (warn) rather than deny?'],
    tests: { sig: 'string[] -> string[]', fn: 'policyViolations', cases: [
      [[['aws_db_instance|aws_db_instance.orders|delete,create|']], ['delete aws_db_instance.orders']],
      [[['aws_vpc_security_group_ingress_rule|aws_vpc_security_group_ingress_rule.ssh|create|cidr_ipv4=0.0.0.0/0;from_port=22']], ['open aws_vpc_security_group_ingress_rule.ssh 22']],
      [[['aws_vpc_security_group_ingress_rule|aws_vpc_security_group_ingress_rule.https|create|cidr_ipv4=0.0.0.0/0;from_port=443']], []],
      [[['aws_instance|aws_instance.web|create|instance_type=t3.micro', 'aws_instance|aws_instance.big|create|instance_type=x2iedn.32xlarge']], ['size aws_instance.big x2iedn.32xlarge']],
      [[[]], []],
      [[['aws_s3_bucket|module.logs.aws_s3_bucket.this|update|', 'aws_s3_bucket|aws_s3_bucket.tmp|delete|']], ['delete aws_s3_bucket.tmp']],
      [[['aws_instance|aws_instance.x|update|instance_type=r7g.4xlarge']], []],
      [[['aws_vpc_security_group_ingress_rule|r.db|update|cidr_ipv4=10.0.0.0/16;from_port=5432']], []],
      [[['aws_instance|aws_instance.y|create|']], ['size aws_instance.y unknown']],
      [[['aws_kms_key|aws_kms_key.k|create,delete|', 'aws_vpc_security_group_ingress_rule|r.rdp|create|cidr_ipv4=0.0.0.0/0;from_port=3389']], ['delete aws_kms_key.k', 'open r.rdp 3389']],
      [[['aws_vpc_security_group_ingress_rule|r.old|delete|cidr_ipv4=0.0.0.0/0;from_port=22']], []]
    ] }
  }));

  practice.push(P({
    t: 'Split a monolith state into network and app states', l: 'Hard', tags: ['state', 'removed', 'import', 'refactoring'], co: ['Atlassian', 'Zalando', 'Shopify'],
    s: `<p>One root configuration manages the VPC (12 resources) and the application (60 resources) in a single state. Plans take 6 minutes, every app change locks the network, and an app engineer once nearly deleted a subnet. Split it into <code>network/</code> and <code>app/</code> roots with separate states, with the app reading network IDs without access to network state, and with <b>no resource destroyed or recreated</b> at any point.</p>`,
    ex: `<p>Sequence of plans: network root ${H.c('g', '12 to import, 0 to add, 0 to change, 0 to destroy')}; old root (now app) ${H.c('g', '0 to destroy')} with 12 "will no longer be managed" lines; app plan afterwards ${H.c('g', 'No changes')}. Plan time for app drops to about a minute.</p>`,
    bw: `<p>Copy the network resources into a new folder and run <code>apply</code> there: Terraform creates a second VPC (or fails on names). Or delete the blocks from the old root and apply: Terraform destroys the network. Both happen in real companies.</p>`,
    q: ['How should the app state get the VPC and subnet IDs after the split?', ['Read published values (SSM parameters or data sources by tag)', '<code>terraform_remote_state</code> with full read access to network state', 'Hardcode them in variables', 'Keep the network resources in both states'], 0, 'Data sources or published parameters give only the values needed. terraform_remote_state works, but requires read access to the whole other state, secrets included. Two states managing one object is a guaranteed fight.'],
    h: ['<p>Hint 1: the order matters: adopt in the new state first (import), forget in the old one second (removed with destroy = false).</p>', '<p>Hint 2: get every import ID from <code>terraform state show</code> in the old root before you start.</p>', '<p>Hint 3: publish outputs as SSM parameters from network; the app reads them with <code>data "aws_ssm_parameter"</code>; freeze changes during the window.</p>'],
    a: `<p><b>Prepare:</b> announce a change freeze on both parts, back up the state (<code>state pull</code>), and list the network addresses and their IDs. <b>Network root:</b> copy the network resource blocks, add <code>import</code> blocks with the IDs, add <code>aws_ssm_parameter</code> resources publishing the VPC and subnet IDs; plan must show only imports (plus the new parameters); apply. <b>Old root → app:</b> delete the network blocks and add <code>removed { from = ...; lifecycle { destroy = false } }</code> for each; replace references with <code>data "aws_ssm_parameter"</code> lookups; plan must show 0 to destroy; apply. <b>Verify</b> both roots plan clean, then remove import/removed blocks in a later PR. Give the app's CI role no access to network state.</p>`,
    hcl: C`# ---- network/main.tf (new root, own backend key network/terraform.tfstate) ----
import {
  to = aws_vpc.main
  id = "vpc-0123456789abcdef0"
}
import {
  for_each = {
    "eu-west-1a" = "subnet-0aaaaaaaaaaaaaaaa"
    "eu-west-1b" = "subnet-0bbbbbbbbbbbbbbbb"
  }
  to = aws_subnet.private[each.key]
  id = each.value
}

resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
}

resource "aws_subnet" "private" {
  for_each          = { "eu-west-1a" = "10.0.10.0/24", "eu-west-1b" = "10.0.11.0/24" }
  vpc_id            = aws_vpc.main.id
  availability_zone = each.key
  cidr_block        = each.value
}

resource "aws_ssm_parameter" "vpc_id" {
  name  = "/network/prod/vpc_id"
  type  = "String"
  value = aws_vpc.main.id
}

resource "aws_ssm_parameter" "private_subnets" {
  name  = "/network/prod/private_subnet_ids"
  type  = "StringList"
  value = join(",", [for s in aws_subnet.private : s.id])
}

# ---- app/main.tf (the old root, after the split) ----
removed {
  from = aws_vpc.main
  lifecycle {
    destroy = false
  }
}
removed {
  from = aws_subnet.private
  lifecycle {
    destroy = false
  }
}

data "aws_ssm_parameter" "vpc_id" {
  name = "/network/prod/vpc_id"
}

data "aws_ssm_parameter" "private_subnets" {
  name = "/network/prod/private_subnet_ids"
}

locals {
  vpc_id             = data.aws_ssm_parameter.vpc_id.value
  private_subnet_ids = split(",", data.aws_ssm_parameter.private_subnets.value)
}`,
    sh: C`#!/usr/bin/env bash
set -euo pipefail
export AWS_PROFILE=lab
cd monolith && terraform state pull > /secure/monolith-before-split.tfstate
terraform state show aws_vpc.main | grep -E '^\s+id\s'
cd ../network && terraform init && terraform plan -out=tfplan
terraform show -json tfplan | jq -e '[.resource_changes[] | select(.change.actions | index("delete"))] | length == 0'
terraform apply tfplan
cd ../monolith && terraform plan -out=tfplan       # expect: 0 to destroy, N no longer managed
terraform show -json tfplan | jq -e '[.resource_changes[] | select(.change.actions | index("delete"))] | length == 0'
terraform apply tfplan
cd ../network && terraform plan && cd ../monolith && terraform plan   # both: No changes`,
    cx: `<p>A few hours including review; zero downtime and zero recreated resources. Afterwards each state is smaller (faster plans), locks are independent, and blast radius is limited by permissions.</p>`,
    f: ['What breaks if someone applies the old root between the two steps?', 'When is <code>terraform_remote_state</code> acceptable anyway?']
  }));

  practice.push(P({
    t: 'Run a drift program for production', l: 'Hard', tags: ['drift', 'ignore_changes', 'CI', 'governance'], co: ['Netflix', 'Monzo', 'AWS Support'],
    s: `<p>Production has 9 Terraform roots. In the last month: an engineer opened SSH in the console during an incident and forgot it; the autoscaler's desired count was reset by an apply during peak; a security tool adds a <code>LastScanned</code> tag that shows up in every plan; and someone changed an ALB idle timeout by hand, which fixed a real bug. Design a drift program: detection, triage rules for each case, code changes, and prevention.</p>`,
    ex: `<p>After the program: nightly job reports ${H.c('y', '2 roots drifted')} with the plan excerpt; SSH rule ${H.c('r', 'reverted')}; idle timeout ${H.c('g', 'adopted')} into code; <code>desired_capacity</code> and <code>LastScanned</code> handed over with <code>ignore_changes</code> / <code>ignore_tags</code>; noise-free plans the next morning.</p>`,
    bw: `<p>Run <code>terraform apply</code> everywhere every night to "enforce" the code. It closes the SSH hole, but also reverts the idle timeout fix (re-breaking production), fights the autoscaler at peak, and flaps the scanner tag forever.</p>`,
    q: ['A plan shows drift on an attribute another system legitimately owns (ASG desired capacity). Best fix?', ['<code>lifecycle { ignore_changes = [desired_capacity] }</code>', 'Apply nightly to reset it', '<code>terraform apply -refresh-only</code> every night', 'Remove the ASG from Terraform'], 0, 'Hand that attribute to its owner: Terraform keeps managing everything else. refresh-only would just keep copying the value into state while the code still disagrees.'],
    h: ['<p>Hint 1: detection = scheduled <code>plan -detailed-exitcode</code> per root with a read-only role; exit code 2 means drift (or unapplied code).</p>', '<p>Hint 2: triage per change: revert (wrong), adopt (right, update code), hand over (another owner: <code>ignore_changes</code> / provider <code>ignore_tags</code>).</p>', '<p>Hint 3: prevention: read-only console in prod, break-glass role with alerts, CloudTrail to find who changed what, and a fast path for emergency fixes in code.</p>'],
    a: `<p><b>Detect:</b> a nightly matrix job runs <code>terraform plan -detailed-exitcode -lock=false</code> in each root with a read-only role; exit 2 opens or updates a ticket with a redacted plan excerpt; exit 1 alerts the platform channel. <b>Triage:</b> SSH rule → <b>revert</b> by applying the code (and check CloudTrail for who/why). Idle timeout → <b>adopt</b>: PR updating the code to 300, plan becomes no-op. Desired capacity → <b>hand over</b> with <code>ignore_changes = [desired_capacity]</code>. Scanner tag → <b>hand over</b> with the AWS provider's <code>ignore_tags { keys = ["LastScanned"] }</code>. <b>Prevent:</b> engineers get read-only console access in prod; a break-glass role exists for incidents, with an alert and a rule that every break-glass change gets a follow-up PR within 24 hours; track drift tickets per team as a metric.</p>`,
    hcl: C`provider "aws" {
  region = "eu-west-1"
  ignore_tags {
    keys = ["LastScanned"]           # owned by the security scanner
  }
}

resource "aws_autoscaling_group" "web" {
  name_prefix         = "web-"
  min_size            = 2
  max_size            = 12
  desired_capacity    = 2
  vpc_zone_identifier = var.private_subnet_ids
  launch_template {
    id      = aws_launch_template.web.id
    version = "$Latest"
  }
  lifecycle {
    ignore_changes = [desired_capacity]   # owned by scaling policies at runtime
  }
}

resource "aws_lb" "web" {
  name               = "web-prod"
  load_balancer_type = "application"
  subnets            = var.public_subnet_ids
  idle_timeout       = 300               # adopted from the incident fix
}`,
    sh: C`#!/usr/bin/env bash
# nightly-drift.sh - run by a scheduled CI job with a read-only role
set -uo pipefail
status=0
for root in envs/prod/*/; do
  ( cd "$root" && terraform init -input=false >/dev/null \
    && terraform plan -detailed-exitcode -input=false -lock=false -no-color > drift.txt 2>&1 )
  rc=$?
  case "$rc" in
    0) echo "OK     $root" ;;
    2) echo "DRIFT  $root"; grep -E '^\s+# .* (will|must) be|^Plan:' "$root/drift.txt"; status=2 ;;
    *) echo "ERROR  $root"; tail -5 "$root/drift.txt"; status=1 ;;
  esac
done
exit "$status"`,
    cx: `<p>The job is read-only and cheap (CI minutes and API reads). The value is cultural: drift becomes visible and owned instead of discovered during the next incident.</p>`,
    f: ['How would you find who made a console change from CloudTrail?', 'When would you turn a recurring drift into an AWS Config rule or SCP instead?']
  }));

  practice.push(P({
    t: 'Upgrade the AWS provider across a major version safely', l: 'Hard', tags: ['providers', 'upgrades', 'lock file', 'S3'], co: ['HashiCorp', 'Adobe', 'Intuit'],
    s: `<p>A legacy root pins <code>hashicorp/aws ~&gt; 4.0</code> and uses <code>aws_s3_bucket</code> with inline <code>versioning</code>, <code>server_side_encryption_configuration</code> and <code>acl</code> blocks, plus inline <code>ingress</code> blocks on security groups. Upgrade it to provider v5 and Terraform 1.10+ without replacing any bucket or security group, and in a way the team can review and roll back.</p>`,
    ex: `<p>Final plan on v5: ${H.c('g', '4 to import, 0 to add, 0 to change, 0 to destroy')} for the split-out S3 sub-resources (versioning, encryption, ownership controls, public access block), then <code>No changes</code>. The lock file diff shows only the AWS provider moving from 4.67.0 to 5.x.</p>`,
    bw: `<p>Change <code>~&gt; 4.0</code> to <code>~&gt; 5.0</code>, run <code>init -upgrade</code>, see dozens of deprecation warnings, delete the blocks to make them go away, and apply. Versioning and encryption settings now exist in AWS but in no code; future changes to them are invisible to review.</p>`,
    q: ['In AWS provider v5, how is S3 bucket versioning managed?', ['A separate <code>aws_s3_bucket_versioning</code> resource', 'An inline <code>versioning {}</code> block in aws_s3_bucket', 'A provider-level setting', 'Only in the console'], 0, 'Since v4 the bucket sub-configurations moved to separate resources, and the old inline arguments are deprecated. Existing settings are adopted with import blocks so nothing changes in AWS.'],
    h: ['<p>Hint 1: upgrade in steps: latest 4.x first (read deprecation warnings), then Terraform CLI, then 5.x; one PR per step with a plan for every environment.</p>', '<p>Hint 2: for each bucket, move inline blocks into separate resources and add import blocks (ID = bucket name) so state adopts the existing configuration.</p>', '<p>Hint 3: security groups: either keep inline rules consistently, or migrate to rule resources by importing the <code>sgr-</code> IDs - never mix both on one group.</p>'],
    a: `<p><b>Step 1:</b> <code>~&gt; 4.67</code>, <code>init -upgrade</code>, fix all deprecation warnings (the v4 provider already supports the separate S3 resources), plan clean. <b>Step 2:</b> rewrite each bucket into <code>aws_s3_bucket</code> + <code>aws_s3_bucket_versioning</code> + <code>aws_s3_bucket_server_side_encryption_configuration</code> + <code>aws_s3_bucket_ownership_controls</code>/<code>aws_s3_bucket_public_access_block</code> (ACLs are disabled by default for new buckets), with <code>import</code> blocks; plan must show only imports. <b>Step 3:</b> bump to <code>~&gt; 5.0</code> and Terraform 1.10+, regenerate the lock file for all platforms, plan every environment: expect no changes (fix any perpetual diff before applying). <b>Rollback:</b> each step is a separate PR; state backups via bucket versioning; the lock file in Git records exactly which provider each commit used.</p>`,
    hcl: C`terraform {
  required_version = ">= 1.10.0"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
}

resource "aws_s3_bucket" "assets" {
  bucket = "example-assets-123456789012"
}

import {
  to = aws_s3_bucket_versioning.assets
  id = "example-assets-123456789012"
}
resource "aws_s3_bucket_versioning" "assets" {
  bucket = aws_s3_bucket.assets.id
  versioning_configuration {
    status = "Enabled"
  }
}

import {
  to = aws_s3_bucket_server_side_encryption_configuration.assets
  id = "example-assets-123456789012"
}
resource "aws_s3_bucket_server_side_encryption_configuration" "assets" {
  bucket = aws_s3_bucket.assets.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

import {
  to = aws_s3_bucket_ownership_controls.assets
  id = "example-assets-123456789012"
}
resource "aws_s3_bucket_ownership_controls" "assets" {
  bucket = aws_s3_bucket.assets.id
  rule {
    object_ownership = "BucketOwnerEnforced"   # ACLs off
  }
}

import {
  to = aws_s3_bucket_public_access_block.assets
  id = "example-assets-123456789012"
}
resource "aws_s3_bucket_public_access_block" "assets" {
  bucket                  = aws_s3_bucket.assets.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}`,
    sh: C`#!/usr/bin/env bash
set -euo pipefail
export AWS_PROFILE=lab
terraform state pull > "/secure/pre-upgrade-$(date +%s).tfstate"
terraform init -upgrade
terraform providers lock -platform=linux_amd64 -platform=darwin_arm64
git diff --stat .terraform.lock.hcl
for env in staging prod; do
  terraform plan -var-file="$env.tfvars" -out="$env.tfplan" -input=false
  terraform show -json "$env.tfplan" | jq -e '[.resource_changes[] | select(.change.actions | index("delete"))] | length == 0'
done`,
    cx: `<p>A few days elapsed for a large root, mostly review and per-environment plans; zero resources replaced. Doing it in small steps is what keeps each plan readable.</p>`,
    f: ['What is a "perpetual diff" and how do you diagnose one after an upgrade?', 'How would you roll the upgrade across 40 repositories?']
  }));

  // ───────────────────────── Quiz ─────────────────────────
  quiz.push({ q: 'You run <code>terraform apply</code> twice in a row with no code changes. What does the second run do?', options: ['Reports no changes', 'Creates a second copy of everything', 'Destroys and recreates everything', 'Fails because the resources exist'], answer: 0, explain: 'Terraform is declarative and idempotent: the second plan finds code, state and reality already matching.' });
  quiz.push({ q: 'Which file should be committed to Git?', options: ['<code>.terraform.lock.hcl</code>', '<code>terraform.tfstate</code>', '<code>.terraform/</code>', '<code>tfplan</code>'], answer: 0, explain: 'The lock file pins exact provider builds. State and plans can contain secrets; .terraform is a cache.' });
  quiz.push({ q: 'A plan line says <code>-/+ resource "aws_instance" "web"</code> with <code># forces replacement</code> on <code>ami</code>. What happens on apply?', options: ['The instance is destroyed and a new one created', 'The AMI is swapped in place', 'Nothing until reboot', 'Only the tags change'], answer: 0, explain: 'Some attributes cannot change on an existing object. The summary counts it as 1 to add and 1 to destroy; local disk data is lost.' });
  quiz.push({ q: 'How should the AWS provider get credentials on a laptop?', options: ['Default credential chain, e.g. <code>AWS_PROFILE</code> with an SSO profile', '<code>access_key</code> and <code>secret_key</code> in the provider block', 'A variable with a default value holding the key', 'A <code>terraform.tfvars</code> file in Git'], answer: 0, explain: 'The provider reads credentials like the AWS CLI does. Keys in code end up in Git and state; SSO profiles and CI OIDC roles give short-lived credentials.' });
  quiz.push({ q: 'A list <code>["a","b","c"]</code> drives <code>count</code>. You remove <code>"b"</code>. Which real server is destroyed?', options: ['The one that was "c" (index 2)', 'The one that was "b"', 'None', 'All three are replaced'], answer: 0, explain: 'Index 1 now means "c" (an update of b\'s server) and index 2 no longer exists, so c\'s server is destroyed. for_each with names avoids this.' });
  quiz.push({ q: 'What does <code>sensitive = true</code> on an output do?', options: ['Hides the value in CLI output and logs; it is still stored in state', 'Encrypts the value in state', 'Removes the value from state', 'Stores the value in AWS Secrets Manager'], answer: 0, explain: 'Sensitive is a display setting. State and plan files keep the real value, so they must be protected - or the secret kept out of Terraform.' });
  quiz.push({ q: 'Which S3 backend setting enables native state locking in Terraform 1.10+?', options: ['<code>use_lockfile = true</code>', '<code>dynamodb_table</code>', '<code>encrypt = true</code>', '<code>versioning = true</code>'], answer: 0, explain: 'use_lockfile writes a .tflock object with a conditional write. dynamodb_table is the older, now deprecated method.' });
  quiz.push({ q: 'What does <code>cidrsubnet("10.0.0.0/16", 8, 10)</code> return?', options: ['<code>10.0.10.0/24</code>', '<code>10.10.0.0/24</code>', '<code>10.0.0.10/24</code>', '<code>10.0.160.0/20</code>'], answer: 0, explain: '8 new bits make /24 blocks of 256 addresses; block 10 starts at 10 x 256 = the third octet 10.' });
  quiz.push({ q: 'You rename <code>aws_db_instance.db</code> to <code>aws_db_instance.orders</code> in code. What prevents a destroy and create?', options: ['A <code>moved</code> block from the old to the new address', '<code>ignore_changes = all</code>', '<code>-target</code>', '<code>depends_on</code>'], answer: 0, explain: 'moved rewrites the state address before diffing, so the plan shows "has moved to" and nothing else.' });
  quiz.push({ q: 'A security group was created by hand. How do you bring it under Terraform without recreating it?', options: ['An <code>import</code> block (or <code>terraform import</code>) plus a matching resource block', 'Write the resource block and apply', '<code>terraform state rm</code>', '<code>terraform apply -refresh-only</code>'], answer: 0, explain: 'Import adopts the existing object into state. Applying a new block without import tries to create a duplicate.' });
  quiz.push({ q: '<code>terraform plan -detailed-exitcode</code> exits with 2. What does that mean?', options: ['The plan has changes (drift or unapplied code)', 'An error occurred', 'No changes', 'The state is locked'], answer: 0, explain: '0 = no changes, 1 = error, 2 = changes present. Scheduled drift jobs rely on this.' });
  quiz.push({ q: 'Why do long-lived prod and staging usually get separate directories (and accounts) instead of CLI workspaces?', options: ['Separate state, credentials and module versions; no "wrong workspace selected" accidents', 'Workspaces cannot use the S3 backend', 'Workspaces do not support modules', 'Directories make plans faster'], answer: 0, explain: 'Workspaces share one backend and one set of credentials; the selected workspace is hidden state on disk. Directories make the environment explicit and isolatable.' });
  quiz.push({ q: 'Which tool evaluates your own rules against the <b>plan JSON</b> (for example "no deletes of databases")?', options: ['OPA with conftest (or Sentinel in HCP Terraform)', '<code>terraform fmt</code>', '<code>tflint</code> only', '<code>terraform validate</code>'], answer: 0, explain: 'Policy-as-code engines read terraform show -json output, where actions and resolved values are known. fmt/validate/tflint check code, not planned actions.' });
  quiz.push({ q: 'What is OpenTofu?', options: ['An open-source (MPL) fork of Terraform under the Linux Foundation with compatible HCL', 'A Terraform linter', 'HashiCorp\'s paid version of Terraform', 'A Terraform provider for Kubernetes'], answer: 0, explain: 'It forked from Terraform 1.5 after the 2023 license change. The CLI is tofu; configurations and state are compatible for common use, with some features unique to each project since.' });

  // ───────────────────────── Interview ─────────────────────────
  interview.push({ level: 'B', q: 'What is Infrastructure as Code, and what does "declarative" mean in Terraform?', a: `<p>IaC means describing infrastructure - networks, servers, buckets, permissions - in version-controlled files instead of clicking in a console, so changes are reviewed in pull requests, repeatable across environments and auditable. Terraform is <b>declarative</b>: I describe the end state ("two t3.micro instances behind this security group"), and Terraform computes the steps by comparing my code with its state and the real world. Running it again with no code change does nothing (idempotence). An imperative script lists steps and creates duplicates when re-run. The plan step shows exactly what will be created, changed or destroyed before anything happens.</p>`, followUps: ['When would you still write an imperative script?', 'How does Terraform know what already exists?'] });
  interview.push({ level: 'B', q: 'Walk me through init, plan and apply. Why save the plan?', a: `<p><code>init</code> downloads providers and modules, configures the backend and writes the lock file. <code>plan</code> refreshes real objects, diffs them against the code and shows creates, updates, replacements and destroys. <code>apply</code> executes. In a team or CI I run <code>plan -out=tfplan</code> and later <code>apply tfplan</code>: what gets applied is exactly what was reviewed and policy-checked. A plain <code>apply</code> recomputes the plan, so changes merged in between would slip through unread; with a saved plan, Terraform refuses if state changed meanwhile. Before that: <code>fmt -check</code> and <code>validate</code> in CI for cheap early failures.</p>`, followUps: ['What does "-/+" mean in a plan?', 'What do you look for first when reviewing a plan?'] });
  interview.push({ level: 'B', q: 'What is Terraform state, and why should it never be committed to Git?', a: `<p>State maps each resource address in code to a real object ID and caches its attributes and dependencies. Terraform needs it to know what it manages, to compute diffs and to destroy in the right order. It must not go to Git because it contains <b>secrets in plain text</b> (database passwords, generated keys, tokens - sensitive marking does not encrypt them), because Git has no locking, and because history keeps leaked secrets forever. It belongs in a remote backend: encrypted, versioned, access-restricted, and locked during writes. The <code>.gitignore</code> excludes <code>*.tfstate*</code>, <code>.terraform/</code> and plan files; the lock file is committed.</p>`, followUps: ['If state leaked, what do you do first?', 'What is the lineage field for?'] });
  interview.push({ level: 'I', q: 'Two engineers ran apply at the same time and a bucket disappeared from state. Explain and fix.', a: `<p>Without locking both runs read the same state version, each applied its change, and the second write replaced the first; the bucket still exists in AWS but no longer in state - orphaned. Next plan would try to create it again. <b>Recover:</b> restore the right state version from bucket versioning, or re-adopt the bucket with an <code>import</code> block. <b>Prevent:</b> S3 backend with <code>use_lockfile = true</code> (Terraform 1.10+; older setups used a DynamoDB lock table), encryption and versioning on, and applies only from CI with a concurrency group. Lock errors are then handled by checking the lock holder and waiting (<code>-lock-timeout</code>); <code>force-unlock</code> only for a confirmed dead run.</p>`, followUps: ['How does S3 native locking work under the hood?', 'Why does plan also take the lock?'] });
  interview.push({ level: 'I', q: 'count or for_each? Give an example where the wrong choice causes an outage.', a: `<p><code>count</code> addresses by index, <code>for_each</code> by key. Use count for N identical things or an on/off switch (<code>count = var.enabled ? 1 : 0</code>); use for_each when items have identity. Example: three servers via <code>count</code> over <code>["a","b","c"]</code>; removing <code>"b"</code> shifts c to index 1, so Terraform updates b's server into c and <b>destroys the real c</b> at index 2. With for_each only <code>web["b"]</code> is destroyed. Migrating existing count resources uses one <code>moved</code> block per index so nothing is rebuilt. Also, for_each keys must be known at plan time - use names, not IDs created in the same run.</p>`, followUps: ['How would you migrate 200 counted resources?', 'Why can for_each not use instance IDs as keys?'] });
  interview.push({ level: 'I', q: 'How do you handle secrets in Terraform?', a: `<p>Layers. (1) Credentials for providers never in code: SSO profiles locally, OIDC roles in CI. (2) Avoid giving Terraform secrets at all: RDS <code>manage_master_user_password = true</code>, generated keys stored in a secret manager by the service itself, apps reading secrets at runtime. (3) Where Terraform must handle one, <code>sensitive = true</code> on variables and outputs to keep it out of logs - knowing it is still written to state and plans; newer versions add ephemeral values and write-only arguments that are not persisted. (4) Protect state: encrypted backend, least-privilege access, versioning with expiry, never in Git; OpenTofu can also encrypt state client-side. (5) Scanners and pre-commit hooks for leaked keys, and no <code>nonsensitive()</code> on secrets.</p>`, followUps: ['What is in state for an aws_db_instance with a password argument?', 'How would you rotate a leaked secret that Terraform manages?'] });
  interview.push({ level: 'I', q: 'What is a module, and how do you promote a module change from staging to prod?', a: `<p>A module is a folder of Terraform with variables as inputs and outputs as return values; it packages one idea (a network, a service) behind a small interface. Reusable modules declare required providers but no provider blocks. Promotion: modules are versioned (Git tags or a registry), each environment has its own root directory with its own backend and credentials, pinned to a version. I tag <code>v1.4.0</code>, open a PR that bumps only staging, apply the saved plan, test; then a separate PR bumps prod, its plan should match staging's shape, apply after approval. Rollback is a PR back to the old tag. Never point prod at a branch - it would change without a prod PR.</p>`, followUps: ['How do you test a module before tagging it?', 'What makes a module change a major version?'] });
  interview.push({ level: 'I', q: 'Workspaces vs separate directories for environments: which and why?', a: `<p>CLI workspaces are multiple states for one configuration in the same backend (S3 keys under <code>env:/NAME/</code>), selected by a hidden setting on disk, using the same credentials. They suit short-lived copies like feature-branch stacks. For staging and prod I use separate root directories (or separate pipelines) with their own state bucket, AWS account and deploy role, and explicit module versions: a staging credential cannot touch prod, there is no "wrong workspace selected" failure, and prod can lag staging by a version. The cost is a little duplication, which Terragrunt or generated backend files can reduce. Note HCP Terraform "workspaces" are a different concept - a full environment with its own variables and permissions.</p>`, followUps: ['How would you guard a workspace-based setup if you had to keep it?', 'What does Terragrunt add?'] });
  interview.push({ level: 'I', q: 'How do you bring resources created by hand under Terraform?', a: `<p>List them with read-only CLI calls; write <code>import</code> blocks (Terraform 1.5+, with <code>for_each</code> from 1.7) with each resource's import ID from the provider docs; run <code>terraform plan -generate-config-out=generated.tf</code> to draft resource blocks; clean the draft (references instead of literal IDs, remove computed noise, copy attributes that force replacement exactly); iterate until the plan shows <b>N to import, 0 to change</b>; apply, which only writes state. The import blocks go through review like any code, unlike the old <code>terraform import</code> CLI command, which I keep for one-off local work. For whole accounts, discovery tools can list unmanaged resources first.</p>`, followUps: ['What if the plan after import still shows changes?', 'How do you hand a resource from one state to another?'] });
  interview.push({ level: 'A', q: 'What is drift, how do you detect it, and how do you decide what to do?', a: `<p>Drift is reality diverging from state and code - console changes during incidents, other tools editing tags, autoscaling, provider upgrades reading attributes differently. Detect with a scheduled <code>terraform plan -detailed-exitcode</code> per root (exit 2) with a read-only role, or <code>plan -refresh-only</code> to see only external changes. Decide per change: <b>revert</b> by applying the code if the change was wrong (SSH opened in an incident); <b>adopt</b> by updating the code if it was right (a timeout fix) so the plan becomes a no-op; <b>hand over</b> with <code>ignore_changes</code> or provider <code>ignore_tags</code> if another system owns the attribute. Prevent by making console access read-only in prod, with a logged break-glass role and a rule that emergency changes get a follow-up PR.</p>`, followUps: ['Why is apply -refresh-only alone not a fix?', 'How would you find who made the change?'] });
  interview.push({ level: 'A', q: 'When would you use -target, -replace, state mv, state rm and removed blocks?', a: `<p><code>-target</code>: recovery only - applying an urgent fix when another part of the graph is broken; routine use leaves state and code out of step. <code>-replace=ADDR</code>: deliberately rebuild one object (a broken instance), shown in the plan; it replaced <code>taint</code>. <code>state mv</code>: change an address immediately - but a <code>moved</code> block does the same reviewably for every environment, so I prefer it. <code>state rm</code>: forget an object without destroying it - the <code>removed</code> block with <code>destroy = false</code> (1.7+) is the reviewable version. All CLI state commands need a backup (<code>state pull</code>) and a second person, because they skip the plan.</p>`, followUps: ['Why is removing a moved block later a breaking change?', 'How do you undo a wrong state rm?'] });
  interview.push({ level: 'A', q: 'Design a CI/CD pipeline for Terraform with policy checks.', a: `<p>Pull requests: pinned Terraform, OIDC to a <b>read-only plan role</b>, then <code>fmt -check</code>, <code>validate</code>, <code>tflint</code>, <code>checkov</code> or <code>trivy config</code>, <code>plan -out</code>, <code>show -json</code>, and <code>conftest</code> with Rego policies (no deletes of protected types including replacements, no admin ports open to the internet, approved sizes, required tags); post the plan summary and a cost estimate on the PR. Main: plan again, store the plan as a short-lived private artifact, wait for approval on a protected environment, then an <b>apply role</b> (trusted only for that environment) runs <code>apply tfplan</code>. Concurrency group plus state locking keep one apply per state. Nightly drift jobs. On HCP Terraform, Sentinel or OPA policy sets give the same gate with soft/hard enforcement. Policies are unit-tested with fixtures.</p>`, followUps: ['How do you handle PRs from forks?', 'Which policies would you make advisory rather than blocking?'] });
  interview.push({ level: 'E', q: 'Terraform or OpenTofu for a new platform in 2026, and how do AI tools change Terraform work?', a: `<p>Both use compatible HCL and state for common work. Terraform (BSL, now under IBM) brings HCP Terraform, Stacks and the largest commercial ecosystem; OpenTofu (MPL, Linux Foundation) is open source with features like client-side state encryption and is a safe default where licensing matters or for vendors building on it. I pick one per repository, pin its version and avoid features only one supports unless they are worth the lock-in. On AI: assistants draft HCL, moved/import blocks and Rego quickly and summarise plans; agents can run plans. They also suggest outdated provider syntax, keys in provider blocks, <code>-target</code> or <code>nonsensitive()</code> as shortcuts. So: plans and policies stay the ground truth, agents get read-only credentials, a human approves every apply, and nobody pastes state into a chat.</p>`, followUps: ['How would you migrate a large estate from Terraform to OpenTofu?', 'What guardrails would you put around an agent that opens Terraform PRs?'] });

  // ───────────────────────── Module registration ─────────────────────────
  registerModule({
    id: 'devops09',
    title: 'Infrastructure as Code with Terraform',
    lang: 'bash',
    langExplain: `<p>Terraform code in this module is <b>HCL</b> (HashiCorp Configuration Language). The site cannot compile HCL, so those snippets are shown as plain text and were checked by reading against <b>Terraform 1.6+</b> (1.10+ where S3 native locking is used) and the <b>AWS provider v5</b>; everything also works with <b>OpenTofu</b> by typing <code>tofu</code> instead of <code>terraform</code>. Commands are <b>Bash</b>, the CI workflow is YAML, policies are Rego, and the problems that are pure logic (plan diffs, apply order, count vs for_each addresses, cidrsubnet, version constraints, policy rules) include a tested <b>Python</b> version. Labs start with providers that need no cloud account (<code>random</code>, <code>local</code>, <code>terraform_data</code>, Docker); AWS parts use SSO profiles, placeholder account ID <code>123456789012</code>, cost notes and <code>terraform destroy</code>.</p>`,
    intro: `<p>Clicking in a cloud console does not scale: nobody can review it, repeat it in another region, or say who changed what. <b>Terraform</b> (and its open-source fork <b>OpenTofu</b>) lets you describe infrastructure as code, preview every change with a <b>plan</b>, and apply it the same way every time. This module takes you from your first <code>random_pet</code> to running Terraform safely for a team.</p>
      <p>You will learn <b>declarative infrastructure</b> and the init/plan/apply loop; <b>providers, resources, data sources</b> and the dependency graph, practising on Docker before AWS; <b>variables, locals, outputs</b>, <code>count</code> vs <code>for_each</code>, dynamic blocks and sensitive values; <b>state</b>, the S3 backend with native locking and why state holds secrets; building the <b>VPC from Cloud &amp; DevOps 6</b> as code with <code>cidrsubnet</code> and lifecycle rules; <b>modules and environments</b>, workspaces vs separate states, promotion from staging to prod; <b>moved and import</b> blocks, state surgery and <b>drift</b>; and <b>policy as code</b> with tflint, checkov, trivy, OPA/conftest and Sentinel in a CI pipeline. Every topic starts from a real incident: two engineers applying at once, a rename that almost deleted a database, a count index shift deleting the wrong server, a password leaked through state.</p>`,
    goals: [
      'Explain declarative IaC and run the full loop (init, fmt, validate, plan -out, apply tfplan, destroy) with pinned providers and a committed lock file, in Terraform or OpenTofu',
      'Configure providers without hardcoded credentials, use data sources, and predict apply and destroy order from the dependency graph, adding depends_on only for hidden dependencies',
      'Write typed, validated variables, locals and outputs; choose for_each over count for resources with identity; use dynamic blocks; and keep secrets out of logs and, where possible, out of state',
      'Run shared state on an encrypted, versioned S3 backend with use_lockfile locking, migrate local state into it, and recover from lock errors and broken state versions',
      'Build a multi-AZ VPC, subnets with cidrsubnet and security groups as code, and protect stateful resources with lifecycle rules (prevent_destroy, create_before_destroy, ignore_changes)',
      'Design versioned modules and per-environment roots, promote a module version from staging to prod, and explain workspaces vs separate states (and where Terragrunt fits)',
      'Refactor and adopt live infrastructure with moved, import and removed blocks, detect and triage drift, and gate changes in CI with tflint, checkov/trivy, OPA/conftest or Sentinel'
    ],
    prereqs: `Required: <b>Cloud &amp; DevOps 4</b> (Git &amp; Collaboration Workflows) - Terraform changes live in pull requests, <code>.gitignore</code> and secrets hygiene matter from the first lab - and <b>Cloud &amp; DevOps 6</b> (Cloud Fundamentals II: Identity &amp; Networks), because you will write the IAM roles, VPC, subnets, route tables, NAT and security groups taught there as code. Helpful: Cloud &amp; DevOps 2 (Bash) for the command scripts, Cloud &amp; DevOps 8 (Docker) for the Docker-provider labs, and Python for Automation for the tested logic problems. Tools: Terraform 1.6+ (1.10+ for S3 native locking) or OpenTofu, Docker, and for AWS parts your own account with a budget alert and an SSO CLI profile.`,
    hours: 14,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
