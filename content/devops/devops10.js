(function () {
  var topics = [], practice = [], quiz = [], interview = [];
  var R = String.raw; // raw template: backslashes, Jinja braces and shell code stay exactly as typed
  var LAB = '<p>Everything runs on your own machine, no cloud account. Install once: <code>pipx install ansible-core</code> (or <code>python3 -m pip install --user ansible-core</code>); check with <code>ansible --version</code> (2.15 or newer). Managed hosts are either <b>localhost</b> (<code>ansible_connection=local</code>) or throwaway <b>containers</b> reached with the <code>community.docker.docker</code> connection (<code>ansible-galaxy collection install community.docker</code>; Podman users can use <code>community.podman.podman</code> or SSH). Lab files live under <code>/tmp</code> or a scratch folder. Every password, token and key shown is a placeholder.</p>';
  var PYC = '<p>Python 3, standard library only. This is a small model of the real Ansible rule: good enough to reason with, simpler than the real engine.</p>';
  var SKIP = { skip: 'configuration code, verified by reading' };
  // INI inventories and Jinja2 templates have no checker in tools/validate.js, so they use lang 'text' with check: false (same convention as devops08 Dockerfiles).
  function INI(code, title) { return { lang: 'text', check: false, title: title || 'inventory.ini', code: code }; }
  function J2(code, title) { return { lang: 'text', check: false, title: title || 'template.j2', code: code }; }
  function Y(code, title) { return { lang: 'yaml', title: title || 'playbook.yml', code: code }; }   // parsed as YAML by the validator
  function SH(code, title) { var s = { lang: 'bash', code: code }; if (title) s.title = title; return s; } // bash -n checked
  function PY(code, title) { return { lang: 'python', title: title || 'Python model (tested)', code: code }; }
  function snip(c) { return typeof c === 'string' ? SH(c) : c; }
  // Compact problem builder. Code is bash unless a Y/INI/J2/PY snippet object is passed.
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
    if (o.lang) p.lang = o.lang;
    if (o.alt) p.solution.alt = o.alt.map(snip);
    if (o.bc) p.brute.code = o.bcl === 'yaml' ? Y(o.bc, 'Naive version') : o.lang === 'python' ? PY(o.bc, 'Naive version') : snip(o.bc);
    return p;
  }
  function box(id, label, x, y, w) { return { id: id, label: label, x: x, y: y, shape: 'box', w: w || 18 }; }
  function one(k, v) { var h = {}; h[k] = v; return h; }
  function pad4(f, tip) { while (f.length < 4) f.push({ narr: tip, parts: f[f.length - 1].parts }); return f; }

  // ── Small models shared by the visualizers (the Python problems are written separately and tested) ──
  // Inventory: "web=w1,w2; db=d1; prod>web,db; ?prod:!db"  (name=hosts, name>child groups, ?pattern)
  function parseInv(str) {
    var inv = { hosts: {}, kids: {}, order: [], pattern: 'all' };
    String(str || '').split(';').map(function (s) { return s.trim(); }).filter(Boolean).forEach(function (ln) {
      var m;
      if (ln.charAt(0) === '?') { inv.pattern = ln.slice(1).trim(); return; }
      if ((m = ln.match(/^([\w-]+)\s*>\s*(.*)$/))) {
        inv.kids[m[1]] = (inv.kids[m[1]] || []).concat(m[2].split(',').map(function (s) { return s.trim(); }).filter(Boolean));
        if (inv.order.indexOf(m[1]) < 0) inv.order.push(m[1]);
      } else if ((m = ln.match(/^([\w-]+)\s*=\s*(.*)$/))) {
        inv.hosts[m[1]] = (inv.hosts[m[1]] || []).concat(m[2].split(',').map(function (s) { return s.trim(); }).filter(Boolean));
        if (inv.order.indexOf(m[1]) < 0) inv.order.push(m[1]);
      } else throw new Error('Use name=host1,host2 or name>childgroup1,childgroup2 or ?pattern, separated by ;');
    });
    if (!inv.order.length) throw new Error('Add at least one group, e.g. web=w1,w2');
    if (inv.order.length > 12) throw new Error('Use at most 12 groups');
    return inv;
  }
  function expandGroup(inv, g, seen) {
    seen = seen || {};
    if (seen[g]) return [];
    seen[g] = true;
    var out = (inv.hosts[g] || []).slice();
    (inv.kids[g] || []).forEach(function (c) { expandGroup(inv, c, seen).forEach(function (h) { if (out.indexOf(h) < 0) out.push(h); }); });
    return out;
  }
  function allHosts(inv) {
    var out = [];
    inv.order.forEach(function (g) { (inv.hosts[g] || []).forEach(function (h) { if (out.indexOf(h) < 0) out.push(h); }); });
    return out;
  }
  function groupOrAll(inv, g) { return g === 'all' ? allHosts(inv) : expandGroup(inv, g); }
  // Variable precedence (simplified): later in this list wins
  var LEVELS = ['role_defaults', 'inventory_group_all', 'inventory_group', 'host_vars', 'play_vars', 'set_fact', 'extra_vars'];
  // Batch sizes for "serial": counts or percentages of the TOTAL host count, last entry repeats
  function batchPlan(n, serialStr) {
    var spec = String(serialStr).split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    if (!spec.length) throw new Error('serial needs a value such as 2 or 10% or 1,25%,100%');
    var out = [], left = n, i = 0;
    while (left > 0 && out.length < 60) {
      var s = spec[Math.min(i, spec.length - 1)], size;
      if (/^\d+%$/.test(s)) size = Math.floor(parseInt(s, 10) * n / 100);
      else if (/^\d+$/.test(s)) size = parseInt(s, 10);
      else throw new Error('serial entries are counts like 2 or percentages like 25% (got "' + s + '")');
      size = Math.min(Math.max(size, 1), left);
      out.push(size); left -= size; i++;
    }
    return out;
  }

  // ───────────────────────── Topic 1: why Ansible, inventory, ad-hoc ─────────────────────────
  topics.push({
    title: 'Inventory and Ad-hoc Commands: the Address Book and the Megaphone',
    analogy: `<p>Imagine you are the manager of 20 identical coffee shops and you need every one of them to switch off the old menu board. You could drive to each shop. Or you could keep an <b>address book</b> (which shops exist, and which are "city" shops versus "airport" shops) and send one <b>message through a megaphone</b>: "all airport shops, do this". Ansible's <b>inventory</b> is the address book. An <b>ad-hoc command</b> is one quick shout. Nothing is installed in the shops first: Ansible just walks in over SSH, does the job and leaves.</p>`,
    explain: `<p>🟢 <b>What Ansible is.</b> Ansible is a tool that makes many machines look the way you describe. You write down what you want ("nginx installed, this config file, service running"), and Ansible makes it so on every machine. It is <b>agentless</b>: nothing runs permanently on the managed machines. The <b>control node</b> (your laptop or a CI runner) connects over SSH (or WinRM for Windows), copies a tiny Python helper, runs it, collects the result and removes it. The managed machines only need SSH and Python 3.</p>
      <p>🟢 <b>The inventory.</b> It answers two questions: <i>which machines exist</i> and <i>how are they grouped</i>. Groups are how you say "all web servers" or "everything in production". A machine can be in many groups. A group can contain other groups (<b>children</b>). Two groups always exist: <code>all</code> (every host) and <code>ungrouped</code>.</p>
      ${H.table(['Format', 'Looks like', 'Use it when'], [
        ['INI', '<code>[web]</code> then one host per line, <code>[prod:children]</code> for groups of groups', 'small, hand-written, easy to read'],
        ['YAML', 'the same data as nested keys: <code>all: children: web: hosts: ...</code>', 'you want structure, or to generate it with a script'],
        ['Dynamic', 'a plugin or script that asks AWS, Azure or VMware who exists right now', 'cloud fleets that change every day (Terraform makes machines, the plugin finds them)']
      ])}
      <p>🔵 <b>Ad-hoc commands.</b> <code>ansible &lt;pattern&gt; -m &lt;module&gt; -a "&lt;arguments&gt;"</code> runs one module on the hosts that match the pattern. They are great for quick questions ("is every host reachable?", "what is the disk usage?") and quick, safe actions. Real configuration goes into playbooks (next topic) because playbooks are written down, reviewed and repeatable.</p>
      ${H.table(['Command', 'What it does'], [
        ['<code>ansible all -m ansible.builtin.ping</code>', 'not ICMP ping: it logs in and checks that Python works. A green "pong" means Ansible can really manage the host'],
        ['<code>ansible web -m ansible.builtin.command -a "uptime"</code>', 'run one program on the group <code>web</code>'],
        ['<code>ansible web -b -m ansible.builtin.apt -a "name=nginx state=present"</code>', '<code>-b</code> (become) = use sudo. This installs nginx only if it is missing'],
        ['<code>ansible all -m ansible.builtin.setup -a "filter=ansible_distribution*"</code>', 'print facts Ansible discovered about each host'],
        ['<code>ansible-inventory -i inventory.ini --graph</code>', 'draw the groups as a tree: the first thing to check when a pattern selects the wrong hosts'],
        ['<code>ansible web:!staging --list-hosts</code>', 'which hosts would be selected? (changes nothing)']
      ])}
      <p>🔵 <b>Patterns.</b> A colon joins groups: <code>web:db</code> = web <i>or</i> db (union), <code>web:&amp;prod</code> = in web <i>and</i> prod (intersection), <code>web:!staging</code> = web <i>except</i> staging. They are read left to right. <code>--limit</code> narrows any playbook run the same way. Always test a risky pattern with <code>--list-hosts</code> first.</p>
      <p>🔵 <b>Config and safety.</b> Put an <code>ansible.cfg</code> next to your project so <code>inventory = inventory.ini</code> is automatic. Use SSH keys, not passwords. <code>host_key_checking</code> should stay on in real life; in a throwaway lab you may set the environment variable <code>ANSIBLE_HOST_KEY_CHECKING=False</code>, never in production.</p>`,
    clues: [
      '"Configure 20 servers the same way" or "no agent allowed on the servers" → Ansible over SSH with an inventory of groups',
      '"Run this on only the production web servers" → inventory groups plus a pattern such as <code>web:&amp;prod</code> or <code>--limit</code>',
      '"Which hosts will this touch?" → <code>--list-hosts</code> and <code>ansible-inventory --graph</code> before you run anything',
      '"Servers come and go every day (autoscaling)" → a dynamic inventory plugin (<code>amazon.aws.aws_ec2</code>), not a hand-edited file',
      '"Quick check that everything is reachable" → <code>ansible all -m ansible.builtin.ping</code> (a login test, not network ping)',
      '"One-off action, no need to write a playbook" → an ad-hoc command, but anything you will repeat belongs in a playbook'
    ],
    code: [INI(`# inventory.ini - the address book. Hosts under a [group], groups of groups with :children
[web]
web1 ansible_host=10.0.1.11
web2 ansible_host=10.0.1.12

[db]
db1 ansible_host=10.0.2.21

[staging]
web2                      # a host can be in many groups

[prod:children]           # prod = everything in web + db
web
db

[all:vars]                # variables for every host
ansible_user=deploy
ansible_python_interpreter=/usr/bin/python3`, 'inventory.ini (INI format)'),
      Y(`# inventory.yml - the same inventory in YAML
all:
  vars:
    ansible_user: deploy
    ansible_python_interpreter: /usr/bin/python3
  children:
    web:
      hosts:
        web1: { ansible_host: 10.0.1.11 }
        web2: { ansible_host: 10.0.1.12 }
    db:
      hosts:
        db1: { ansible_host: 10.0.2.21 }
    staging:
      hosts:
        web2:
    prod:
      children:
        web:
        db:`, 'inventory.yml (YAML format)'),
      SH(R`#!/usr/bin/env bash
# Lab: a throwaway fleet of three containers, managed from your laptop. Safe: nothing outside Docker changes.
set -euo pipefail
pipx install ansible-core                      # or: python3 -m pip install --user ansible-core
ansible-galaxy collection install community.docker

# Three Debian containers with Python 3 (Ansible's only requirement besides a connection)
for n in web1 web2 db1; do
  docker run -d --name "$n" debian:12 sleep infinity
  docker exec "$n" sh -c 'apt-get update -qq && apt-get install -y -qq python3 >/dev/null'
done

cat > inventory.ini <<'INV'
[web]
web1
web2
[db]
db1
[prod:children]
web
db
[all:vars]
ansible_connection=community.docker.docker
ansible_python_interpreter=/usr/bin/python3
INV

ansible-inventory -i inventory.ini --graph      # see the tree of groups
ansible web:\!web2 -i inventory.ini --list-hosts # web except web2 (\! only because bash treats ! specially)
ansible all -i inventory.ini -m ansible.builtin.ping
ansible prod -i inventory.ini -m ansible.builtin.command -a "cat /etc/os-release"

docker rm -f web1 web2 db1                     # clean up`, 'Lab: three containers as managed hosts')],
    viz: [{
      title: 'Inventory expansion and host patterns',
      input: 'web=w1,w2,w3; db=d1; staging=w3; prod>web,db; ?prod:!staging',
      inputLabel: 'name=hosts · name>child groups · ?pattern, separated by ;  (pattern: a:b union, a:&b both, a:!b except)',
      gen: function (input) {
        var inv = parseInv(input), f = [];
        var rows = inv.order.map(function (g) { return [g, (inv.hosts[g] || []).join(', ') || '-', (inv.kids[g] || []).join(', ') || '-']; });
        f.push({ narr: 'This is the address book you wrote. A group can hold <b>hosts</b> directly or <b>child groups</b>. Ansible adds the built-in group <code>all</code> on top.', parts: [{ type: 'table', label: 'inventory as written', columns: ['group', 'hosts', 'child groups'], rows: rows }] });
        inv.order.forEach(function (g) {
          if (!(inv.kids[g] || []).length) return;
          var hl = {}; hl[inv.order.indexOf(g)] = 'cur';
          f.push({ narr: 'Group <b>' + H.esc(g) + '</b> contains child groups <b>' + H.esc(inv.kids[g].join(', ')) + '</b>, so its real members are every host of those children (and their children, recursively). Ansible removes duplicates.', parts: [
            { type: 'table', label: 'inventory as written', columns: ['group', 'hosts', 'child groups'], rows: rows, hl: hl },
            { type: 'set', label: H.esc(g) + ' expands to', items: expandGroup(inv, g).length ? expandGroup(inv, g) : ['(no hosts)'] }] });
        });
        var toks = inv.pattern.split(':').filter(Boolean);
        if (toks.length > 8) throw new Error('Use at most 8 pattern parts');
        var cur = groupOrAll(inv, toks[0].replace(/^[&!]/, ''));
        f.push({ narr: 'Pattern <code>' + H.esc(inv.pattern) + '</code> is read left to right. Start with the first group: <b>' + H.esc(toks[0]) + '</b>.', parts: [{ type: 'set', label: 'selected so far', items: cur.length ? cur : ['(none)'] }] });
        toks.slice(1).forEach(function (t) {
          var op = t.charAt(0) === '&' ? '&' : t.charAt(0) === '!' ? '!' : '+', name = t.replace(/^[&!]/, ''), g = groupOrAll(inv, name), before = cur.slice();
          if (op === '&') cur = cur.filter(function (h) { return g.indexOf(h) >= 0; });
          else if (op === '!') cur = cur.filter(function (h) { return g.indexOf(h) < 0; });
          else g.forEach(function (h) { if (cur.indexOf(h) < 0) cur.push(h); });
          var word = op === '&' ? 'keep only the hosts that are ALSO in' : op === '!' ? 'remove the hosts that are in' : 'add the hosts of';
          var hl = {}; cur.forEach(function (h) { hl[h] = 'ok'; });
          f.push({ narr: '<code>' + H.esc(t) + '</code>: ' + word + ' <b>' + H.esc(name) + '</b> (' + (g.join(', ') || 'no hosts') + '). Before: ' + (before.join(', ') || 'none') + '.', parts: [{ type: 'set', label: 'selected so far', items: cur.length ? cur : ['(none)'], hl: hl }] });
        });
        f.push({ narr: 'Final answer: <b>' + (cur.join(', ') || 'no hosts') + '</b>. This is exactly what <code>ansible \'' + H.esc(inv.pattern) + '\' --list-hosts</code> would print. A playbook with this pattern would touch only these machines.', parts: [{ type: 'set', label: 'hosts that will be touched', items: cur.length ? cur : ['(none)'], hl: cur.reduce(function (a, h) { a[h] = 'sel'; return a; }, {}) }] });
        return pad4(f, 'Done.');
      }
    }],
    examples: [
      { title: 'One group, 20 identical web servers', html: `<p>You need nginx configured identically on 20 servers. Put them in one group, <code>web</code>. A range saves typing: <code>web[01:20].example.com</code> in INI means web01 to web20. Now <code>ansible web -m ansible.builtin.ping</code> checks all 20 at once, and the playbook in the next topic targets <code>hosts: web</code>. Twenty servers, one description.</p>` },
      { title: 'A host in two groups, and pattern maths', html: `<p>From the lab inventory: <code>web2</code> is in <code>web</code> and <code>staging</code>. ${H.table(['Pattern', 'Selects'], [['<code>web</code>', 'web1, web2'], ['<code>web:&amp;staging</code>', 'web2 (in both)'], ['<code>web:!staging</code>', 'web1 (web minus staging)'], ['<code>prod</code>', 'web1, web2, db1 (children expanded)']])}</p><p>Quote patterns with <code>!</code> or <code>&amp;</code> in your shell: <code>'web:!staging'</code>.</p>` },
      { title: 'Ad-hoc: disk space on every host, and why not to over-use it', html: `<p>Quick question from your manager: "is any server nearly out of disk?" One line answers it: <code>ansible all -m ansible.builtin.command -a "df -h /"</code>. Output is grouped per host. Fine for reading. But if the next step is "clean the logs", write a playbook with a <code>file</code> or <code>find</code> task: it is reviewed, repeatable and does not depend on someone remembering the right flags at 2 a.m.</p>` },
      { title: 'Variables beside the inventory', html: `<p>Host-specific and group-specific values live in folders next to the inventory: <code>group_vars/web.yml</code> applies to every host in <code>web</code>; <code>host_vars/web1.yml</code> only to <code>web1</code>. You will use them heavily in the variables topic. Keeping them out of the inventory file keeps the address book readable.</p>` }
    ],
    deepDive: `<p>🟣 <b>How a run really works.</b> For each task and host, Ansible (1) opens or reuses an SSH connection (ControlPersist keeps it open), (2) builds a small Python "module" payload with the arguments, (3) copies it to a temp folder on the host, (4) runs it with the host's Python, (5) reads the JSON result (<code>changed</code>, <code>failed</code>, output) and (6) deletes the temp files. Hosts are processed in parallel, <code>forks</code> at a time (default 5). Raising <code>forks</code> to 20 to 50 is the first speed-up for a big fleet. <code>pipelining = True</code> and keeping SSH connections open remove most of the overhead.</p>
      <p>🟣 <b>Inventory details.</b> Host and group variables (<code>ansible_host</code>, <code>ansible_user</code>, <code>ansible_port</code>, <code>ansible_connection</code>, <code>ansible_python_interpreter</code>) are normal variables. Use <code>ansible_connection=local</code> for the control machine itself, and <code>community.docker.docker</code> for containers. You can pass several inventories (<code>-i prod -i extra</code>) or a directory. <code>ansible-inventory --list</code> prints the merged result including every variable: use it to debug "why does this host have that value?".</p>
      <p>🟣 <b>Dynamic inventory in production.</b> Plugins such as <code>amazon.aws.aws_ec2</code> build groups from tags (<code>keyed_groups</code>), so "all instances tagged role=web in prod" becomes a group automatically. This is where Terraform and Ansible meet: Terraform creates the instances and tags them, Ansible's inventory plugin finds them by tag (see the last topic). Never copy IP addresses from a console into a file by hand.</p>
      <p>🟣 <b>Pitfalls.</b> Wrong Python path on the host (set <code>ansible_python_interpreter</code>). Host key prompts hanging a CI job. An <code>ansible_user</code> without sudo rights when you used <code>-b</code>. A pattern with a typo selects nothing and Ansible only warns "provided hosts list is empty": in CI, treat that warning as a failure. Windows hosts use WinRM or SSH with the <code>ansible.windows</code> collection, a different module family.</p>`,
    aiEra: `<p>🤖 <b>What AI changes.</b> An assistant can turn a spreadsheet of servers into an INI or YAML inventory in seconds, and explain why a pattern selected the wrong machines. Agentic tools can also run <code>ansible</code> commands for you, which is powerful and dangerous: a wrong pattern with <code>-b</code> touches real servers.</p>
      <p><b>Use AI as a partner:</b> paste the output of <code>ansible-inventory --graph</code> and ask "which hosts does <code>web:&amp;prod:!canary</code> select?". Then confirm with <code>--list-hosts</code> yourself.</p>
      <p><b>Where AI goes wrong:</b> it invents module names that do not exist, uses short names like <code>apt</code> instead of the full <code>ansible.builtin.apt</code>, puts passwords into the inventory as <code>ansible_password=</code>, and runs against <code>all</code> when you meant one group. Always run <code>--list-hosts</code> and use <code>--check</code> before an AI-written command touches anything that matters.</p>`,
    problems: [P({
      t: 'Which 20 servers? Group them and check before you touch them', l: 'Easy', tags: ['inventory', 'patterns', 'ad-hoc'], co: ['Accenture', 'Infosys', 'Red Hat'],
      s: `<p>You inherit a fleet: <code>web01</code> to <code>web20</code>, and <code>db01</code>, <code>db02</code>. <code>web19</code> and <code>web20</code> are the canary servers that get changes first. Write an inventory (YAML) with groups <code>web</code>, <code>db</code>, <code>canary</code> and <code>prod</code> (web plus db), then show the commands that (1) draw the groups, (2) list "web except canary", and (3) check that every web host answers, without touching anything.</p>`,
      ex: `<p><code>ansible 'web:!canary' --list-hosts</code> should print ${H.c('g', '18 hosts')} (web01 to web18). If it prints 20, your canary group is empty or misspelled; if it prints 0, the group <code>web</code> does not exist in that inventory.</p>`,
      bw: `<p>Keeping a text file of IP addresses and running a <code>for</code> loop with <code>ssh</code> in bash. No groups, no parallelism, no patterns, no record of which hosts were skipped when one failed, and every new teammate has to learn your script.</p>`,
      q: ['What does <code>ansible all -m ansible.builtin.ping</code> prove?', ['That Ansible can log in and run Python on every host', 'That ICMP ping works to every host', 'That every service is healthy', 'That the playbook is correct'], 0, 'The ping module connects with SSH and runs a tiny Python module. It tests the whole Ansible path, not just the network.'],
      h: ['<p>Hint 1: ranges like <code>web[01:20]</code> work in INI, but in YAML you list hosts or generate them; a script or <code>ansible-inventory</code> plugin can expand ranges.</p>', '<p>Hint 2: a host can be listed under two groups; <code>prod</code> is a group of groups (<code>children</code>).</p>', '<p>Hint 3: use <code>--list-hosts</code> and <code>ansible-inventory --graph</code> to verify; quote patterns containing <code>!</code>.</p>'],
      a: `<p>Write the hosts once under <code>web</code>, list the two canaries again under <code>canary</code> (a host may appear in several groups), and make <code>prod</code> a group whose children are <code>web</code> and <code>db</code>. Verify with the read-only commands: the graph shows the tree, <code>--list-hosts</code> shows what a pattern would select, and <code>ping</code> proves connectivity. Only after all three look right do you run anything that changes machines. INI supports <code>web[01:20]</code>; YAML inventories accept the same range syntax in host names (<code>web[01:20]:</code>), which keeps the file short.</p>`,
      code: Y(`# inventory.yml
all:
  vars:
    ansible_user: deploy
  children:
    web:
      hosts:
        web[01:20]:          # range: web01 ... web20
    canary:
      hosts:
        web19:
        web20:
    db:
      hosts:
        db01:
        db02:
    prod:
      children:
        web:
        db:`, 'inventory.yml'),
      alt: [SH(R`ansible-inventory -i inventory.yml --graph            # draw the groups
ansible -i inventory.yml 'web:!canary' --list-hosts   # 18 hosts expected, touches nothing
ansible -i inventory.yml web -m ansible.builtin.ping  # login + Python check on all 20
ansible -i inventory.yml 'web:&canary' --list-hosts   # intersection: the 2 canaries`, 'Verification commands')],
      cx: `<p>Setup is one file. Cost of a run grows with hosts divided by <code>forks</code> (default 5): 20 hosts take about 4 rounds.</p>`,
      f: ['How would you make the inventory come from AWS tags instead of a file?', 'What changes if the canary hosts must also receive the change first in a rolling deploy? (the <code>serial</code> topic)']
    })]
  });

  // ───────────────────────── Topic 2: playbooks, tasks, handlers ─────────────────────────
  topics.push({
    title: 'Playbooks, Tasks and Handlers: the Recipe and the Bell',
    analogy: `<p>A <b>playbook</b> is a recipe card for the kitchen crew: "for the web servers, do step 1, step 2, step 3, in this order". Each step is a <b>task</b> that calls one tool (a <b>module</b>). A <b>handler</b> is a bell that only rings if something changed. When you rewrite the menu board (task), you ring the bell "restart the display" (notify). The crew rings it <b>once</b>, at the end of the shift, even if you rewrote ten boards. If nothing changed, the bell stays silent and nobody restarts anything.</p>`,
    explain: `<p>🟢 <b>The shape of a playbook.</b> A playbook is a YAML file: a list of <b>plays</b>. A play says <i>which hosts</i> and <i>what to do</i>. What to do is a list of tasks, run top to bottom, on every host, one task at a time across all hosts (the default "linear" strategy).</p>
      ${H.table(['Part', 'Meaning', 'Example'], [
        ['<code>hosts</code>', 'which inventory group or pattern', '<code>hosts: web</code>'],
        ['<code>become</code>', 'run as root with sudo', '<code>become: true</code>'],
        ['<code>vars</code>', 'values used by tasks', '<code>nginx_port: 8080</code>'],
        ['<code>tasks</code>', 'ordered steps, each one module call with a <code>name</code>', '<code>ansible.builtin.apt: name=nginx state=present</code>'],
        ['<code>handlers</code>', 'tasks that run only when notified, once, at the end of the play', '<code>Reload nginx</code>'],
        ['<code>tags</code>', 'labels so you can run a subset', '<code>--tags config</code>']
      ])}
      <p>🟢 <b>Every task result has one of these states.</b> <b>ok</b> (already correct, nothing done), <b>changed</b> (Ansible changed something), <b>failed</b> (error, the host stops), <b>skipped</b> (a <code>when:</code> was false), <b>unreachable</b> (could not connect). The summary at the end (<code>PLAY RECAP</code>) counts these per host.</p>
      <p>🔵 <b>Handlers.</b> A task adds <code>notify: Reload nginx</code>. If that task reports <b>changed</b>, the handler named <code>Reload nginx</code> is queued. At the end of the play (or at <code>meta: flush_handlers</code>) each queued handler runs once. If the task was <b>ok</b>, nothing is queued. This is how you avoid restarting nginx 20 times, or at all when the config did not change.</p>
      <p>🔵 <b>Handler traps (the classics).</b></p>
      <ul><li><b>Name typo.</b> <code>notify: reload nginx</code> and a handler called <code>Reload nginx</code> do not match. Newer ansible-core reports an unknown handler as an error; older setups silently did nothing. Use <code>listen:</code> topics so many tasks can notify one short topic name.</li>
        <li><b>A failure before the end of the play.</b> By default, handlers do not run on a host that failed. The config file was changed (and now looks right on disk), the play stopped, nothing reloaded. On the next run the file is already correct, the task says <b>ok</b>, the handler is never queued, and the server keeps the old config. Fix: <code>--force-handlers</code> or <code>force_handlers: true</code> in the play, and/or <code>meta: flush_handlers</code> right after the config task.</li>
        <li><b>Order.</b> Handlers run in the order they are <i>defined</i>, not the order they were notified.</li></ul>
      <p>🔵 <b>Running it.</b> <code>ansible-playbook -i inventory.ini site.yml</code>. Useful flags: <code>--check</code> (dry run), <code>--diff</code> (show file changes), <code>--limit web1</code>, <code>--tags config</code>, <code>-v</code> to <code>-vvv</code> for detail, <code>--syntax-check</code>, and <code>--start-at-task "Name"</code>.</p>
      <p>🔵 <b>Conditions and loops.</b> <code>when: ansible_os_family == "Debian"</code> skips a task on other systems. <code>loop: [a, b, c]</code> repeats a task with <code>item</code>. <code>register: result</code> stores a task's output for later tasks. Keep each task named in plain English: the names are your log.</p>`,
    clues: [
      '"Restart the service only if the config changed" → a handler with <code>notify</code>, not a task that always restarts',
      '"The config is updated on the server but the service still uses the old one" → the handler never fired: failed play, name mismatch, or the task was already ok on a re-run',
      '"Run the same steps on many servers in order" → a playbook with one play and ordered tasks',
      '"Only run the configuration part" or "skip the slow part" → tags (<code>--tags</code>, <code>--skip-tags</code>)',
      '"Preview what would change" → <code>--check --diff</code>',
      '"Several tasks should trigger one reload" → <code>listen:</code> topic names or the same handler name'
    ],
    code: [Y(`# site.yml - install nginx, configure it, serve a page. Idempotent and safe to re-run.
- name: Configure web servers
  hosts: web
  become: true
  vars:
    nginx_port: 8080
  tasks:
    - name: Install nginx
      ansible.builtin.apt:
        name: nginx
        state: present
        update_cache: true
        cache_valid_time: 3600     # do not refresh the index if it is under an hour old
      tags: [packages]

    - name: Deploy the nginx site config
      ansible.builtin.template:
        src: site.conf.j2
        dest: /etc/nginx/conf.d/site.conf
        owner: root
        group: root
        mode: "0644"
      notify: Reload nginx           # queued only if this task reports changed
      tags: [config]

    - name: Make sure nginx is running and starts at boot
      ansible.builtin.service:
        name: nginx
        state: started
        enabled: true

  handlers:
    - name: Reload nginx
      ansible.builtin.service:
        name: nginx
        state: reloaded
      listen: "nginx config changed"   # other tasks may notify this topic name instead`, 'site.yml'),
      Y(`# lab.yml - a playbook that needs no root and no servers: it only writes files under /tmp/lab
- name: Learn handlers on localhost
  hosts: localhost
  connection: local
  gather_facts: false
  tasks:
    - name: Create the lab folder
      ansible.builtin.file:
        path: /tmp/lab
        state: directory
        mode: "0755"

    - name: Write a config file
      ansible.builtin.copy:
        dest: /tmp/lab/app.conf
        content: |
          port=8080
        mode: "0644"
      notify: Pretend to reload

  handlers:
    - name: Pretend to reload
      ansible.builtin.debug:
        msg: "handler ran: the config changed"`, 'lab.yml: run it twice and compare')],
    viz: [{
      title: 'A play from top to bottom: when does the handler ring?',
      input: 'install:ok; config:changed:reload; site:changed:reload; enable:ok',
      inputLabel: 'task:status (ok | changed | failed) or task:status:handler, separated by ;',
      gen: function (input) {
        var tasks = String(input || '').split(';').map(function (s) { return s.trim(); }).filter(Boolean).map(function (s) {
          var w = s.split(':').map(function (x) { return x.trim(); });
          if (['ok', 'changed', 'failed'].indexOf(w[1]) < 0) throw new Error('Each task is name:ok, name:changed or name:failed (optionally :handler), e.g. config:changed:reload');
          return { name: w[0], st: w[1], h: w[2] || '' };
        });
        if (!tasks.length) throw new Error('Add tasks like install:ok; config:changed:reload');
        if (tasks.length > 10) throw new Error('Use at most 10 tasks');
        var f = [], queue = [], done = [], stopped = false;
        function tbl(upto) {
          return { type: 'table', label: 'tasks', columns: ['task', 'result', 'notifies'], rows: tasks.map(function (t, i) { return [t.name, i < upto ? t.st : 'pending', t.h || '-']; }), hl: (function () { var h = {}; if (upto > 0 && upto <= tasks.length) h[upto - 1] = tasks[upto - 1].st === 'failed' ? 'bad' : tasks[upto - 1].st === 'changed' ? 'cur' : 'done'; return h; })() };
        }
        f.push({ narr: 'The play starts. Tasks run top to bottom. The handler queue is empty. Handlers never run in the middle of the play (unless you flush them).', parts: [tbl(0), { type: 'queue', label: 'queued handlers', items: ['(empty)'] }] });
        tasks.forEach(function (t, i) {
          if (stopped) return;
          var msg;
          if (t.st === 'failed') { stopped = true; msg = 'Task <b>' + H.esc(t.name) + '</b> <span class="c-r">FAILED</span>. The host drops out of the play. Queued handlers (' + (queue.join(', ') || 'none') + ') will <b>not</b> run unless <code>force_handlers: true</code>.'; }
          else if (t.st === 'changed') { msg = 'Task <b>' + H.esc(t.name) + '</b> reports <span class="c-y">changed</span>.' + (t.h ? ' It notifies <b>' + H.esc(t.h) + '</b>' + (queue.indexOf(t.h) >= 0 ? ', which is already queued: queued once only.' : ', so the handler is queued.') : ' It notifies nothing.'); if (t.h && queue.indexOf(t.h) < 0) queue.push(t.h); }
          else msg = 'Task <b>' + H.esc(t.name) + '</b> is <span class="c-g">ok</span>: already correct, nothing changed, so it notifies nothing' + (t.h ? ' (even though it names ' + H.esc(t.h) + ')' : '') + '.';
          f.push({ narr: msg, parts: [tbl(i + 1), { type: 'queue', label: 'queued handlers', items: queue.length ? queue.slice() : ['(empty)'], hl: queue.length ? one(queue.length - 1, 'cur') : {} }] });
        });
        if (stopped) {
          f.push({ narr: '<b>The trap:</b> the play ended on a failure, so the handler never rang. If an earlier task already rewrote the config file, a re-run will say <b>ok</b> for that task (the file is already right), queue nothing, and the service keeps running the <b>old</b> config. Fix: <code>--force-handlers</code>, or <code>meta: flush_handlers</code> right after the config task.', parts: [tbl(tasks.length), { type: 'queue', label: 'queued handlers (lost)', items: queue.length ? queue.slice() : ['(empty)'], hl: queue.reduce(function (a, q, i) { a[i] = 'bad'; return a; }, {}) }] });
        } else {
          queue.forEach(function (q) {
            done.push(q);
            f.push({ narr: 'End of the play: handler <b>' + H.esc(q) + '</b> runs <b>once</b>, no matter how many tasks notified it.', parts: [tbl(tasks.length), { type: 'queue', label: 'queued handlers', items: queue.slice(), hl: queue.reduce(function (a, x, i) { a[i] = done.indexOf(x) >= 0 ? 'ok' : 'cur'; return a; }, {}) }] });
          });
          f.push({ narr: queue.length ? 'Play finished. ' + queue.length + ' handler(s) ran. Run it again: every task is now <b>ok</b>, nothing is notified, and no handler runs.' : 'Play finished. Nothing changed, so no handler ran. This is what a healthy second run looks like.', parts: [tbl(tasks.length)] });
        }
        return pad4(f, 'Done.');
      }
    }],
    examples: [
      { title: 'Twenty servers, one reload each, only where needed', html: `<p>You change the nginx port in a template. On 18 servers the file differs, so the template task reports <b>changed</b> there and the reload handler runs on those 18. On 2 servers someone had already made the same change by hand: <b>ok</b>, no reload. A plain <code>service: state=restarted</code> task would have bounced all 20 and caused 20 small outages.</p>` },
      { title: 'Reading the PLAY RECAP', html: `<pre>PLAY RECAP ************************
web1 : ok=5 changed=2 unreachable=0 failed=0 skipped=0
web2 : ok=3 changed=0 unreachable=0 failed=1 skipped=0</pre><p>web1 is healthy: two tasks changed something. web2 failed on its third task; <code>ok=3</code> counts the tasks completed before it. A good pipeline fails on <code>failed&gt;0</code> or <code>unreachable&gt;0</code>.</p>` },
      { title: 'Two tasks, one topic', html: `<p>The nginx config and a TLS certificate both need a reload. Give each task <code>notify: "nginx config changed"</code> and put <code>listen: "nginx config changed"</code> on the handler. If both change, the reload still happens once. The topic name is a stable contract: roles can notify it without knowing the handler's real name.</p>` },
      { title: 'Run only part of a playbook', html: `<p>You are testing a template. Tag it <code>config</code> and run <code>ansible-playbook site.yml --tags config --check --diff -l web1</code>: only that task, on one host, as a dry run showing the file diff. <code>--skip-tags packages</code> skips the slow apt step. Tasks with no tag are skipped when you pass <code>--tags</code>, except those tagged <code>always</code>.</p>` }
    ],
    deepDive: `<p>🟣 <b>Execution model.</b> The default <code>linear</code> strategy runs task 1 on all hosts in the batch (forks at a time), waits for all, then task 2. Handlers are flushed at the end of each play, and at each <code>meta: flush_handlers</code>. Within <code>pre_tasks</code>, <code>roles</code>, <code>tasks</code> and <code>post_tasks</code> there are separate handler flush points, so a role's handlers fire at the end of the roles section. <code>strategy: free</code> lets fast hosts run ahead, useful when hosts are independent. <code>ansible-playbook --step</code> asks before each task, handy for learning.</p>
      <p>🟣 <b>changed_when, failed_when.</b> Modules decide for themselves whether they changed something. For <code>command</code> and <code>shell</code> they cannot, so you tell them: <code>changed_when: "'created' in result.stdout"</code>. <code>failed_when</code> redefines failure ("exit code 2 is fine"). <code>ignore_errors: true</code> keeps going but hides real problems: prefer <code>failed_when</code> with a precise condition. <code>register</code> plus <code>when</code> lets later tasks react to earlier results.</p>
      <p>🟣 <b>Validate before you replace.</b> The <code>validate</code> option of <code>template</code>, <code>copy</code> and <code>lineinfile</code> runs a command on a temporary copy of the new file and only installs it if the command succeeds (<code>%s</code> is the temp file path). For a full <code>nginx.conf</code> the pattern is <code>validate: "nginx -t -c %s"</code>. A <code>conf.d</code> fragment cannot be tested alone, so write it, then run a separate <code>nginx -t</code> task (with <code>changed_when: false</code>) before the reload handler. The validate string must contain <code>%s</code> or the module refuses it. For sudoers always use <code>validate: "visudo -cf %s"</code>.</p>
      <p>🟣 <b>Structure for real projects.</b> One top-level <code>site.yml</code> imports per-tier playbooks (<code>import_playbook: web.yml</code>). <code>import_tasks</code> is static (parsed up front, tags and <code>--list-tasks</code> work); <code>include_tasks</code> is dynamic (evaluated when reached, needed for loops over files). Name every play and task: the names are what the on-call engineer reads in the CI log.</p>`,
    aiEra: `<p>🤖 <b>What AI changes.</b> Assistants write a first-draft playbook from a sentence ("install nginx and serve this config") and can read a long <code>-vvv</code> failure and point at the cause. They are good at YAML indentation errors and at converting a bash script into tasks.</p>
      <p><b>Use AI as a partner:</b> ask for a playbook, then review it like a pull request: are module names fully qualified, are tasks idempotent, is every restart a handler, are secrets absent, does <code>--check --diff</code> look sensible?</p>
      <p><b>Where AI goes wrong:</b> it writes <code>shell: apt-get install -y nginx</code> (works, but reports changed every run), restarts services in plain tasks instead of handlers, forgets <code>become</code>, and uses deprecated forms such as <code>with_items</code> or bare <code>include</code>. It also mixes module arguments that do not exist. Run <code>ansible-lint</code> on everything an assistant writes.</p>`,
    problems: [P({
      t: 'The handler that did not fire', l: 'Medium', tags: ['handlers', 'notify', 'flush_handlers', 'debugging'], co: ['Red Hat', 'Cisco', 'Wipro'],
      s: `<p>Yesterday's run changed <code>/etc/nginx/conf.d/site.conf</code> on <code>web3</code>, then failed on a later task (a package repo was down). Today you re-run the playbook after the repo is back. It finishes green, but <code>curl</code> on web3 still serves the <b>old</b> behaviour. The file on disk is correct. Explain exactly why, fix the playbook so it cannot happen again, and show how to recover web3 right now.</p>`,
      ex: `<p>Run 1 on web3: config task ${H.c('y', 'changed')} (handler queued) → next task ${H.c('r', 'failed')} → play stops → queued handler ${H.c('r', 'never runs')}. Run 2: config task ${H.c('g', 'ok')} (file already right) → nothing queued → handler ${H.c('r', 'never runs')}. The reload is lost forever unless something forces it.</p>`,
      bw: `<p>Adding <code>state: restarted</code> as a normal task so nginx restarts on every run. It "fixes" web3 but restarts every server on every run, drops connections, and hides the real problem (handlers are lost on failure).</p>`,
      bcl: 'yaml', bc: `- name: Restart nginx every time (works, but bounces all servers on every run)
  ansible.builtin.service:
    name: nginx
    state: restarted`,
      q: ['Why does run 2 not reload nginx?', ['The config task reports ok, so it notifies nothing', 'Handlers only run on the first execution of a playbook', 'nginx ignores reload signals', 'Handlers need --force-handlers every time'], 0, 'Handlers are queued only by a task that reports changed. The file was already correct, so the task was ok and nothing was queued.'],
      h: ['<p>Hint 1: when is a handler queued, and what happens to the queue if the play fails?</p>', '<p>Hint 2: two tools: <code>meta: flush_handlers</code> to run handlers immediately after the important task, and <code>force_handlers: true</code> so a failure later does not discard the queue.</p>', '<p>Hint 3: for web3 itself, run the reload by hand as an ad-hoc command, or temporarily make the file differ, or run a tagged play that only reloads.</p>'],
      a: `<p>Handlers are a queue held in memory for one run. A failure drops that queue. The next run sees the file already correct, so nothing is queued: the change and the notification got separated forever. Two fixes belong in the playbook: (1) <code>force_handlers: true</code> on the play so a later failure still runs queued handlers on hosts that got that far, and (2) <code>meta: flush_handlers</code> straight after the config task so the reload happens <b>before</b> risky later tasks such as package installs. Better still, validate the config before installing it, so a broken file never lands. To recover web3 now, reload once with an ad-hoc command; then the system is consistent again.</p>`,
      code: Y(`- name: Configure web servers
  hosts: web
  become: true
  force_handlers: true           # a later failure must not throw away queued handlers
  tasks:
    - name: Deploy the nginx site config
      ansible.builtin.template:
        src: site.conf.j2
        dest: /etc/nginx/conf.d/site.conf
        mode: "0644"
      notify: Reload nginx

    - name: Reload nginx now, before the risky tasks below
      ansible.builtin.meta: flush_handlers

    - name: Install the monitoring agent (this is what failed yesterday)
      ansible.builtin.apt:
        name: prometheus-node-exporter
        state: present

  handlers:
    - name: Reload nginx
      ansible.builtin.service:
        name: nginx
        state: reloaded`, 'site.yml (fixed)'),
      alt: [SH(R`# Recover web3 right now: reload nginx once, as an ad-hoc command
ansible web3 -i inventory.ini -b -m ansible.builtin.service -a "name=nginx state=reloaded"
# Prove the running config matches the file (the test must pass before and after)
ansible web3 -i inventory.ini -b -m ansible.builtin.command -a "nginx -t"
# Preview a full run: with the fix, config is ok and no handler is queued
ansible-playbook -i inventory.ini site.yml --limit web3 --check --diff`, 'Recovery commands')],
      cx: `<p>One extra meta task per play. The cost is a possible extra reload per run, which is exactly the point.</p>`,
      f: ['What does <code>--force-handlers</code> do on the command line, and when is it unsafe? (handlers then run on hosts that failed midway)', 'How would a CI check detect a handler name that no task notifies? (ansible-lint rules, running with <code>--check</code>)']
    })]
  });

  // ───────────────────────── Topic 3: idempotent modules ─────────────────────────
  topics.push({
    title: 'Idempotent Modules: Describe the Result, Not the Steps',
    analogy: `<p>A light switch marked "ON" versus a button marked "toggle". If you press "toggle" twice you are back in the dark. If you tell a smart assistant "lights on" twice, the light is simply on, and it says "already on". Ansible modules are the smart assistant: you say <b>what state you want</b> (<code>state: present</code>), and the module checks first, then acts only if needed. A <code>shell</code> command is the toggle button: it does what it says every time, even when nothing needs doing.</p>`,
    explain: `<p>🟢 <b>Idempotent</b> is a long word for "safe to repeat". Run it once or ten times and the machine ends up the same, and the later runs change nothing. This is the most important idea in Ansible, because it lets you run the same playbook every night to fix drift, and to trust that a green run with <code>changed=0</code> means "the servers already match the description".</p>
      <p>🟢 <b>How a module does it.</b> Every good module follows three steps: <b>look</b> at the current state, <b>compare</b> with the wanted state, <b>act only if they differ</b> and report <code>changed</code>. If they match it reports <code>ok</code>.</p>
      ${H.table(['Want this', 'Idempotent module', 'The trap (non-idempotent)'], [
        ['package installed', '<code>ansible.builtin.apt</code> / <code>dnf</code> / <code>package</code> with <code>state: present</code>', '<code>shell: apt-get install -y nginx</code> (reports changed every time)'],
        ['a line in a file', '<code>ansible.builtin.lineinfile</code>', '<code>shell: echo "PORT=80" &gt;&gt; app.conf</code> (appends again and again)'],
        ['a file with this content', '<code>ansible.builtin.copy</code> / <code>template</code>', '<code>shell: cat &gt; file &lt;&lt; EOF</code>'],
        ['a user exists', '<code>ansible.builtin.user</code>', '<code>shell: useradd bob</code> (fails the second time)'],
        ['a service running and enabled', '<code>ansible.builtin.service</code> / <code>systemd</code>', '<code>shell: systemctl start nginx</code>'],
        ['a directory with permissions', '<code>ansible.builtin.file</code> with <code>state: directory</code>', '<code>shell: mkdir -p x &amp;&amp; chmod 755 x</code>']
      ])}
      <p>🔵 <b>When you really need <code>command</code> or <code>shell</code>.</b> Sometimes no module exists. Then you teach Ansible how to decide "changed":</p>
      <ul><li><code>creates: /path</code> / <code>removes: /path</code>: skip the command if the file exists / does not exist.</li>
        <li><code>changed_when:</code> a condition on the output, for example <code>changed_when: "'created' in result.stdout"</code>, or <code>changed_when: false</code> for read-only commands.</li>
        <li><code>failed_when:</code> your own definition of failure ("exit code 1 means not found, that is fine").</li>
        <li>Use <code>command</code> (no shell features, safer) unless you need pipes, redirects or <code>&amp;&amp;</code>; then use <code>shell</code> and quote carefully.</li></ul>
      <p>🔵 <b>Check mode and diff.</b> <code>--check</code> asks every module "what <i>would</i> you change?" without changing anything. <code>--diff</code> shows the before/after of files. Together they are your safety net before touching production. Not every module supports check mode (<code>command</code> and <code>shell</code> are skipped unless they have <code>creates</code>/<code>removes</code>), so a read-only command that later tasks depend on needs <code>check_mode: false</code> to still run during a dry run.</p>
      <p>🔵 <b>Zero-change as a test.</b> Run the playbook twice. The second run must show <code>changed=0</code>. If it does not, you have found a non-idempotent task. This is also how <code>molecule</code> tests roles (see roles topic).</p>`,
    clues: [
      '"The playbook reports changed on every run" → a <code>shell</code>/<code>command</code> task, or a template with a timestamp inside; replace with a real module or add <code>changed_when</code>',
      '"Safe to run repeatedly" or "fix configuration drift" → idempotent modules and a nightly run with <code>--check</code> to report drift',
      '"My <code>lineinfile</code> keeps adding duplicates" → the <code>regexp</code> does not match the line it wrote, so it appends again',
      '"Command is not available in check mode" → <code>check_mode: false</code> on read-only commands, or <code>creates</code> to make them skippable',
      '"Preview changes before production" → <code>--check --diff</code>',
      '"Run this command only once" → <code>creates:</code> / <code>removes:</code> or a registered check plus <code>when:</code>'
    ],
    code: [Y(`# idempotent.yml - the same intentions done two ways. Run twice and compare the recap.
- name: Idempotency lab on localhost (no root needed)
  hosts: localhost
  connection: local
  gather_facts: false
  tasks:
    # WRONG: appends a new line on every run and always reports changed
    - name: Set port (bad)
      ansible.builtin.shell: echo "PORT=8080" >> /tmp/lab/bad.conf
      tags: [bad]

    # RIGHT: one line, replaced in place, ok on the second run
    - name: Set port (good)
      ansible.builtin.lineinfile:
        path: /tmp/lab/good.conf
        regexp: '^PORT='
        line: "PORT=8080"
        create: true
        mode: "0644"
      tags: [good]

    # A command with no module: teach Ansible when it is "changed"
    - name: Build the index once
      ansible.builtin.command: touch /tmp/lab/index.built
      args:
        creates: /tmp/lab/index.built   # skipped if the file already exists

    # A read-only check: never "changed", and it must still run under --check
    - name: Count config lines
      ansible.builtin.command: wc -l /tmp/lab/good.conf
      register: line_count
      changed_when: false
      check_mode: false`, 'idempotent.yml'),
      SH(R`mkdir -p /tmp/lab && rm -f /tmp/lab/*.conf /tmp/lab/index.built
ansible-playbook idempotent.yml          # run 1: everything changes
ansible-playbook idempotent.yml          # run 2: bad = changed again, good = ok
ansible-playbook idempotent.yml --check --diff   # dry run with file diffs
wc -l /tmp/lab/bad.conf /tmp/lab/good.conf       # bad grows by one line per run`, 'Run it twice and look at the recap'),
      PY(`# Model of an idempotent module: compare wanted and current state, change only if different.
def apply_line(lines, key, wanted):
    """Like lineinfile with regexp '^KEY=': replace the line or add it. Returns (lines, changed)."""
    new = f"{key}={wanted}"
    for i, ln in enumerate(lines):
        if ln.startswith(key + "="):
            if ln == new:
                return lines, False          # already correct -> ok
            out = list(lines); out[i] = new
            return out, True                 # replaced -> changed
    return lines + [new], True               # missing -> added -> changed

def shell_append(lines, key, wanted):
    """Like shell: echo KEY=VALUE >> file. It cannot look first, so it always 'changes'."""
    return lines + [f"{key}={wanted}"], True

good, bad = [], []
for run in range(1, 4):
    good, g = apply_line(good, "PORT", 8080)
    bad, b = shell_append(bad, "PORT", 8080)
    print(f"run {run}: lineinfile changed={g} lines={len(good)} | shell changed={b} lines={len(bad)}")`, 'Python model of idempotency (runs in the browser)')],
    codeTitle: ['Good and bad versions of the same task', 'Prove it by running twice', 'Idempotency in 15 lines of Python'],
    viz: [{
      title: 'Run the playbook again and again: shell vs module',
      input: '4',
      inputLabel: 'number of runs (1 to 8)',
      gen: function (input) {
        var n = parseInt(String(input).trim(), 10);
        if (isNaN(n) || n < 1 || n > 8) throw new Error('Type a number of runs from 1 to 8, e.g. 4');
        var f = [], rows = [], badLines = 0, goodLines = 0;
        f.push({ narr: 'Two tasks both mean "make sure <code>PORT=8080</code> is in the config". Task A is <code>shell: echo PORT=8080 &gt;&gt; file</code>. Task B is <code>lineinfile</code>. Watch what happens when we run the playbook again and again.', parts: [{ type: 'table', label: 'results per run', columns: ['run', 'A: shell result', 'A: file lines', 'B: lineinfile result', 'B: file lines'], rows: [['-', '-', '0', '-', '0']] }] });
        for (var r = 1; r <= n; r++) {
          badLines++;
          var gch = goodLines === 0; if (gch) goodLines = 1;
          rows.push([String(r), 'changed', String(badLines), gch ? 'changed' : 'ok', String(goodLines)]);
          var hl = {}; hl[rows.length - 1] = r === 1 ? 'cur' : 'bad';
          f.push({ narr: r === 1 ? 'Run 1: both report <b>changed</b>. That is correct: the file did not exist, so both created the line.' : 'Run ' + r + ': A (shell) appends <b>again</b> and reports <span class="c-r">changed</span>; the file now has ' + badLines + ' copies of the line. B (lineinfile) looked first, saw the line was right, and reported <span class="c-g">ok</span>. One line, no change.', parts: [{ type: 'table', label: 'results per run', columns: ['run', 'A: shell result', 'A: file lines', 'B: lineinfile result', 'B: file lines'], rows: rows.map(function (x) { return x.slice(); }), hl: hl }] });
        }
        f.push({ narr: 'After ' + n + ' run(s): the shell file has <b>' + badLines + '</b> lines and a recap of <code>changed=1</code> every time, so you can never tell a healthy run from a broken one. The module file has <b>1</b> line, and from run 2 on the recap says <code>changed=0</code>. That zero is a meaningful signal: "the server already matches the description".', parts: [{ type: 'table', label: 'results per run', columns: ['run', 'A: shell result', 'A: file lines', 'B: lineinfile result', 'B: file lines'], rows: rows.map(function (x) { return x.slice(); }) }, { type: 'text', label: 'rule', html: '<p>Prefer a module with <code>state:</code>. For <code>command</code>/<code>shell</code>, add <code>creates</code>, <code>changed_when</code> and <code>failed_when</code>.</p>' }] });
        return pad4(f, 'Done.');
      }
    }],
    examples: [
      { title: 'The task that says changed every run', html: `<p>Your nightly drift report shows <code>changed=3</code> on every server even though nobody touched anything. The culprits: <code>shell: systemctl enable nginx</code> (no way to know it was already enabled), <code>shell: apt-get update</code> (always "changes"), and a template containing <code>{{ ansible_date_time.iso8601 }}</code> (a new timestamp every run, so the file differs every time). Fixes: <code>service: enabled: true</code>; <code>apt: update_cache: true cache_valid_time: 3600</code>; remove the timestamp from the file.</p>` },
      { title: 'lineinfile that duplicates', html: `<p>Task: <code>lineinfile: path=/etc/ssh/sshd_config line="PermitRootLogin no"</code> with no <code>regexp</code>. The file already has <code>PermitRootLogin yes</code>. Without a regexp the module sees "my exact line is missing" and appends a second line, leaving two conflicting settings. Add <code>regexp: '^#?PermitRootLogin'</code>: it now <b>replaces</b> the existing line, and the second run is ok. Add <code>validate: "sshd -t -f %s"</code> so a bad edit can never lock you out.</p>` },
      { title: 'A command that is safe to repeat', html: `<p>You must run a vendor installer <code>/opt/vendor/install.sh</code> once. Write: <code>command: /opt/vendor/install.sh</code> with <code>args: creates: /opt/vendor/.installed</code>, and let the installer (or a following task) create that marker. Ansible skips the task when the file exists and reports <b>ok</b>. In <code>--check</code> mode it correctly predicts whether the task would run.</p>` },
      { title: 'Check mode with a command that others need', html: `<p>A task registers <code>nginx -v</code> output and later tasks use it. In <code>--check</code> mode a plain command is skipped, so later tasks fail on a missing variable. Add <code>check_mode: false</code> (it is read-only, so it is safe to run for real) and <code>changed_when: false</code>. Dry runs now work end to end.</p>` }
    ],
    deepDive: `<p>🟣 <b>What "changed" really means.</b> It is the module's own report, nothing more. A module computes it by comparing state: <code>copy</code> compares checksums (SHA-1) of the existing and new file; <code>apt</code> asks the package database; <code>user</code> compares UID, groups, shell; <code>file</code> compares owner, group, mode. Because it relies on correct comparison, idempotency can break in subtle ways: a template that renders hostnames in a different order each time (use <code>| sort</code>), a dictionary dumped without sorted keys, a timestamp, a random password generated on every run (use <code>lookup('password', ...)</code>, which stores the result and returns it again).</p>
      <p>🟣 <b>Convergent vs imperative.</b> Idempotent modules make configuration <i>convergent</i>: whatever the starting state, the end state is the same. Ordering matters less, and re-runs repair drift. The cost is that you must express your wish as state. Operations that are inherently one-off (database migrations, rolling restarts, "wait for the cluster") are handled with guards: <code>creates</code>, registered facts plus <code>when</code>, <code>run_once</code>, or tools designed for that job.</p>
      <p>🟣 <b>Testing idempotency.</b> In CI, run the playbook twice against a throwaway container and fail if the second run has <code>changed&gt;0</code>. <code>molecule</code> does exactly this with its <i>idempotence</i> step. <code>ansible-lint</code> flags the usual suspects: <code>command-instead-of-module</code> (using shell where a module exists), <code>no-changed-when</code> (a command without <code>changed_when</code>), and <code>risky-shell-pipe</code> (a pipe without <code>pipefail</code>).</p>
      <p>🟣 <b>Production reality.</b> Idempotent does not mean harmless. A correct but wrong description (a template that drops a needed setting) is applied perfectly to all 20 servers. That is why you combine idempotency with <code>--check --diff</code> review, a canary host first, and <code>serial</code> (see rolling updates). Also, a nightly <code>--check</code> that reports <i>drift</i> is useful, but a nightly real run can quietly overwrite an emergency fix someone made by hand; agree on that policy with your team.</p>`,
    aiEra: `<p>🤖 <b>What AI changes.</b> Assistants can convert a bash script into Ansible tasks and suggest the matching module. They can also read a recap and tell you which task is the non-idempotent one. This is a very good use: give it a task list and ask "which of these will report changed on the second run, and why?"</p>
      <p><b>Use AI as a partner:</b> ask for the module-based equivalent of each <code>shell</code> line and for the <code>changed_when</code> reasoning for any that must stay. Then prove it yourself: run twice, read <code>changed=</code>.</p>
      <p><b>Where AI goes wrong:</b> it loves <code>shell</code> because it works on the first try, adds <code>ignore_errors: true</code> to silence failures, and writes <code>changed_when: false</code> on tasks that really do change things, which makes the playbook lie. A wrongly silenced <code>changed</code> is worse than a noisy one, because drift reports become meaningless. Review every <code>changed_when</code> and <code>ignore_errors</code> line by hand.</p>`,
    problems: [P({
      t: 'Fix the playbook that is never green', l: 'Medium', tags: ['idempotency', 'shell', 'changed_when', 'lineinfile'], co: ['Accenture', 'Capgemini', 'Red Hat'],
      s: `<p>A teammate's playbook for new web servers works but reports <code>changed=5</code> on every run, so the nightly drift check always alerts and nobody trusts it. Rewrite it with proper modules. Keep one task as a <code>command</code> because the company tool has no module, but make it safe to repeat.</p>
        <pre>- hosts: web
  become: true
  tasks:
    - shell: apt-get update &amp;&amp; apt-get install -y nginx
    - shell: systemctl enable nginx &amp;&amp; systemctl start nginx
    - shell: echo "worker_processes 2;" &gt;&gt; /etc/nginx/conf.d/tuning.conf
    - shell: useradd -m deploy
    - shell: /opt/company/register-host.sh   # writes /var/lib/company/registered when done</pre>`,
      ex: `<p>After the rewrite, run 1 shows ${H.c('y', 'changed')} for the tasks that really change things, and run 2 shows ${H.c('g', 'changed=0')}. The <code>useradd</code> task also no longer ${H.c('r', 'fails')} with "user already exists".</p>`,
      bw: `<p>Leaving the shell lines and adding <code>ignore_errors: true</code> and <code>changed_when: false</code> everywhere. The recap turns green, but now it lies: a real change is hidden and the extra <code>echo</code> line is still appended on every run, so the file grows without bound.</p>`,
      bcl: 'yaml', bc: `- hosts: web
  become: true
  tasks:
    - shell: echo "worker_processes 2;" >> /etc/nginx/conf.d/tuning.conf
      changed_when: false      # lies: it DID change the file
      ignore_errors: true      # hides real problems`,
      q: ['Which line makes <code>lineinfile</code> replace an existing setting instead of adding a second one?', ['<code>regexp</code> that matches the old line', '<code>backup: true</code>', '<code>create: true</code>', '<code>mode: "0644"</code>'], 0, 'Without a regexp, lineinfile only compares the exact line. With a regexp it finds the existing line and replaces it.'],
      h: ['<p>Hint 1: for each shell line, name the module for that intent: package, service, file content, user.</p>', '<p>Hint 2: the tuning file is a whole file you own: <code>copy</code> with <code>content</code> is simpler and safer than appending lines.</p>', '<p>Hint 3: for the vendor script use <code>args: creates: /var/lib/company/registered</code>; check the second run says <code>changed=0</code>.</p>'],
      a: `<p>Replace each shell line with the module that describes the end state. Package: <code>apt</code> with <code>state: present</code> and a cache lifetime. Service: <code>service</code> with <code>enabled</code> and <code>state: started</code>. The tuning file: <code>copy</code> with <code>content</code>, so the file always has exactly those lines and a change triggers a reload handler. User: <code>user</code> with <code>state: present</code>. The vendor script: <code>command</code> with <code>creates</code> pointing at the marker file it writes. Proof: run twice; the second recap must say <code>changed=0</code>. If it does not, one of the tasks is still not idempotent.</p>`,
      code: Y(`- name: Web servers, idempotent version
  hosts: web
  become: true
  tasks:
    - name: Install nginx
      ansible.builtin.apt:
        name: nginx
        state: present
        update_cache: true
        cache_valid_time: 3600

    - name: Tune nginx workers
      ansible.builtin.copy:
        dest: /etc/nginx/conf.d/tuning.conf
        content: |
          # managed by Ansible
          worker_processes 2;
        owner: root
        group: root
        mode: "0644"
      notify: Reload nginx

    - name: Enable and start nginx
      ansible.builtin.service:
        name: nginx
        state: started
        enabled: true

    - name: Create the deploy user
      ansible.builtin.user:
        name: deploy
        create_home: true
        shell: /bin/bash
        state: present

    - name: Register the host with the company tool (once)
      ansible.builtin.command: /opt/company/register-host.sh
      args:
        creates: /var/lib/company/registered

  handlers:
    - name: Reload nginx
      ansible.builtin.service:
        name: nginx
        state: reloaded`, 'site.yml (idempotent)'),
      cx: `<p>Each module does one cheap state check per run, so a converged run is fast: mostly "ok" lines. The shell version did real work (and real writes) every time.</p>`,
      f: ['How do you prove idempotency in CI? (run twice, fail if the second run has changed&gt;0; molecule does this)', 'What if the vendor script cannot create a marker file? (register a read-only check command with <code>changed_when: false</code> and use <code>when:</code>)']
    })]
  });

  // ───────────────────────── Topic 4: variables, facts, precedence ─────────────────────────
  topics.push({
    title: 'Variables, Facts and Precedence: the Sticky Notes on the Fridge',
    analogy: `<p>Picture a shared house with sticky notes about what to cook. The landlord left a default note on the fridge ("pasta"). The flat has its own note ("curry on Fridays"). One room-mate has a personal note on their door ("vegan"). And tonight someone shouts across the kitchen: "TONIGHT: pizza, I'm paying". The loudest, most specific, most recent instruction wins. Ansible variables work the same way: the same name can be set in many places, and a fixed ranking decides whose value is used. <b>Facts</b> are different: they are notes Ansible writes itself after looking at each machine ("this one runs Ubuntu 24.04, has 8 GB RAM").</p>`,
    explain: `<p>🟢 <b>A variable is a name with a value</b> you can use in tasks with double braces: <code>{{ nginx_port }}</code>. Put it in quotes when it starts a YAML value: <code>port: "{{ nginx_port }}"</code>. Variables make one playbook serve many servers: same task, different value per host or group.</p>
      <p>🟢 <b>Where to put them (the layout that scales).</b></p>
      ${H.table(['Location', 'Applies to', 'Typical use'], [
        ['<code>roles/x/defaults/main.yml</code>', 'the role, lowest priority', 'safe defaults a user is expected to override'],
        ['<code>group_vars/all.yml</code>', 'every host', 'company-wide values: NTP server, DNS'],
        ['<code>group_vars/web.yml</code>', 'hosts in group <code>web</code>', 'nginx_port, worker count'],
        ['<code>host_vars/web1.yml</code>', 'one host', 'an exception for one machine'],
        ['<code>vars:</code> in a play', 'that play', 'values the playbook author owns'],
        ['<code>-e name=value</code> (extra vars)', 'this run only, <b>always wins</b>', 'one-off overrides, CI parameters']
      ])}
      <p>🔵 <b>Precedence, simplified.</b> Ansible really has 22 levels. For daily work remember this ladder, from weakest to strongest:</p>
      <p><code>role defaults</code> &lt; <code>group_vars/all</code> &lt; <code>group_vars/&lt;group&gt;</code> &lt; <code>host_vars</code> &lt; <code>play vars</code> &lt; <code>set_fact / register</code> &lt; <code>extra vars (-e)</code></p>
      <p>Rule of thumb: <b>more specific beats more general</b> (a host beats its group), and <b>explicit beats default</b>. The two ends matter most: put overridable defaults in <code>role defaults</code>, and know that <code>-e</code> beats everything, which makes it useful in an emergency and dangerous in a habit.</p>
      <p>🔵 <b>Facts.</b> At the start of each play (<code>gather_facts: true</code>, the default) Ansible runs the <code>setup</code> module and stores what it found, under <code>ansible_facts</code>: OS name (<code>ansible_facts['distribution']</code>), family (<code>os_family</code> = Debian or RedHat), memory, CPU count, IP addresses, mounts. You use them in conditions (<code>when: ansible_facts['os_family'] == "Debian"</code>) and templates (<code>{{ ansible_facts['processor_vcpus'] }}</code>). See them all with <code>ansible web1 -m ansible.builtin.setup</code>. Gathering takes a second or two per host; <code>gather_facts: false</code> speeds up plays that do not need them, and <code>gather_subset: min</code> collects only the basics.</p>
      <p>🔵 <b>Other ways to make variables.</b> <code>register:</code> saves a task's result. <code>set_fact:</code> creates a variable on the fly. <code>vars_files:</code> loads a file. <code>vars_prompt:</code> asks the person (rarely in automation). Magic variables describe the run itself: <code>inventory_hostname</code>, <code>groups</code>, <code>hostvars</code>, <code>group_names</code>.</p>
      <p>🔵 <b>Naming.</b> Prefix every variable with its role or app: <code>nginx_port</code>, not <code>port</code>. Variables share one big namespace, so generic names collide across roles.</p>`,
    clues: [
      '"The value in group_vars is ignored" → something stronger overrides it: host_vars, play vars, set_fact or <code>-e</code>; use <code>debug: var=</code> and <code>ansible-inventory --host</code>',
      '"Different settings for production and staging" → <code>group_vars/prod.yml</code> and <code>group_vars/staging.yml</code>, one playbook',
      '"One server needs an exception" → <code>host_vars/hostname.yml</code>',
      '"Behave differently on Ubuntu and RHEL" → facts: <code>ansible_facts[\'os_family\']</code> in <code>when:</code> or a vars file per OS',
      '"Override just for this run" → <code>-e key=value</code> (beats everything)',
      '"Where does this value come from?" → <code>ansible-inventory --host web1</code>, <code>-vvv</code>, or a <code>debug</code> task'
    ],
    code: [Y(`# group_vars/web.yml - values for every host in the "web" group
nginx_port: 8080
nginx_worker_connections: 1024
app_env: production`, 'group_vars/web.yml'),
      Y(`# host_vars/web3.yml - web3 is a bigger machine, so one exception
nginx_worker_connections: 4096`, 'host_vars/web3.yml'),
      Y(`# vars-demo.yml - see the winner, the facts and a derived value
- name: Variables and facts
  hosts: web
  gather_facts: true
  vars:
    nginx_port: 8081            # play vars beat group_vars, so this wins unless -e is given
  tasks:
    - name: Show where the value ends up
      ansible.builtin.debug:
        msg: "{{ inventory_hostname }} listens on {{ nginx_port }} with {{ nginx_worker_connections }} connections"

    - name: Use a fact in a condition
      ansible.builtin.debug:
        msg: "This host is {{ ansible_facts['distribution'] }} {{ ansible_facts['distribution_version'] }}"
      when: ansible_facts['os_family'] == "Debian"

    - name: Compute a value from facts and remember it
      ansible.builtin.set_fact:
        nginx_workers: "{{ [ansible_facts['processor_vcpus'], 8] | min }}"   # one per CPU, at most 8

    - name: Register the output of a command
      ansible.builtin.command: nginx -v
      register: nginx_version
      changed_when: false
      failed_when: false

    - name: Show registered output
      ansible.builtin.debug:
        var: nginx_version.stderr       # nginx prints its version on stderr`, 'vars-demo.yml'),
      SH(R`ansible-playbook -i inventory.ini vars-demo.yml                 # play vars win: port 8081
ansible-playbook -i inventory.ini vars-demo.yml -e nginx_port=9999   # extra vars beat everything: 9999
ansible-inventory -i inventory.ini --host web3                        # merged inventory view for one host
ansible web3 -i inventory.ini -m ansible.builtin.setup -a "filter=ansible_processor*"`, 'Run it three ways')],
    codeTitle: ['group_vars: values for a group', 'host_vars: one exception', 'Facts, set_fact, register in one play', 'Same playbook, three results'],
    viz: [{
      title: 'Who wins? The precedence ladder',
      input: 'role_defaults:nginx_port=80; inventory_group_all:env=dev; inventory_group:nginx_port=8080; host_vars:nginx_port=9090; extra_vars:env=prod',
      inputLabel: 'level:name=value ; levels (weak to strong): ' + LEVELS.join(', '),
      gen: function (input) {
        var items = String(input || '').split(';').map(function (s) { return s.trim(); }).filter(Boolean).map(function (s) {
          var m = s.match(/^(\w+):\s*([\w-]+)\s*=\s*(.*)$/);
          if (!m || LEVELS.indexOf(m[1]) < 0) throw new Error('Use level:name=value. Levels: ' + LEVELS.join(', '));
          return { lvl: m[1], rank: LEVELS.indexOf(m[1]), name: m[2], val: m[3] };
        });
        if (!items.length) throw new Error('Add at least one setting, e.g. role_defaults:port=80');
        if (items.length > 12) throw new Error('Use at most 12 settings');
        items = items.map(function (x, i) { x.i = i; return x; }).sort(function (a, b) { return a.rank - b.rank || a.i - b.i; });
        var cur = {}, order = [], f = [];
        function tbl(hlName) {
          var hl = {}; order.forEach(function (n, i) { if (n === hlName) hl[i] = 'cur'; });
          return { type: 'table', label: 'value each variable has now', columns: ['variable', 'current value', 'set by'], rows: order.length ? order.map(function (n) { return [n, cur[n].val, cur[n].lvl]; }) : [['(nothing yet)', '', '']], hl: hl };
        }
        f.push({ narr: 'Ansible collects every place a variable is set, then applies them from the <b>weakest</b> level to the <b>strongest</b>. Later levels overwrite earlier ones. Ladder: ' + LEVELS.join(' &lt; ') + '.', parts: [tbl(null)] });
        items.forEach(function (x) {
          var old = cur[x.name];
          if (!old) order.push(x.name);
          cur[x.name] = { val: x.val, lvl: x.lvl };
          f.push({ narr: old ? '<b>' + H.esc(x.lvl) + '</b> sets <code>' + H.esc(x.name) + '</code> = <code>' + H.esc(x.val) + '</code>. It is stronger than <b>' + H.esc(old.lvl) + '</b>, so <span class="c-y">it overrides</span> <code>' + H.esc(old.val) + '</code>.' : '<b>' + H.esc(x.lvl) + '</b> defines <code>' + H.esc(x.name) + '</code> = <code>' + H.esc(x.val) + '</code>. Nothing else has set it yet.', parts: [tbl(x.name)] });
        });
        f.push({ narr: 'Final values. Read the "set by" column: it is the answer to "why is this the value?". If it is not what you expected, a stronger level is overriding yours. <code>ansible-inventory --host NAME</code> and a <code>debug</code> task show the same result on a real run.', parts: [tbl(null), { type: 'text', label: 'tip', html: '<p>Name variables with a prefix (<code>nginx_port</code>), put defaults in the role, keep <code>-e</code> for emergencies.</p>' }] });
        return pad4(f, 'Done.');
      }
    }],
    examples: [
      { title: 'Prod and staging from one playbook', html: `<p>Layout: <code>inventories/prod/hosts.ini</code> and <code>inventories/prod/group_vars/all.yml</code> (<code>app_env: production</code>, <code>log_level: warn</code>), <code>inventories/staging/...</code> (<code>app_env: staging</code>, <code>log_level: debug</code>). Same playbook, different folder: <code>ansible-playbook -i inventories/staging site.yml</code>. Each environment's values are separate, reviewed in Git, and cannot leak into the other.</p>` },
      { title: 'One variable, five places, which wins?', html: `<p><code>nginx_port</code> is 80 in the role defaults, 8080 in <code>group_vars/web.yml</code>, 9090 in <code>host_vars/web1.yml</code>, 8081 in the play's <code>vars:</code>. On <code>web1</code> the value is <b>8081</b> (play vars beat host_vars in this simplified ladder). Add <code>-e nginx_port=7000</code> and it becomes <b>7000</b>. If you expected 9090, the surprise is that play <code>vars:</code> are stronger than inventory <code>host_vars</code>.</p>` },
      { title: 'Facts pick the right package', html: `<p>Debian calls the Apache package <code>apache2</code>, Red Hat calls it <code>httpd</code>. Use a map: <code>apache_pkg: "{{ {'Debian': 'apache2', 'RedHat': 'httpd'}[ansible_facts['os_family']] }}"</code>, or load <code>vars/{{ ansible_facts['os_family'] }}.yml</code> with <code>include_vars</code>. One playbook, two operating systems, no copy-paste.</p>` },
      { title: 'The classic typo', html: `<p>A task says <code>port: {{ nginx_port }}</code> without quotes. YAML sees <code>{</code> and tries to read a dictionary: "could not find expected ':'". Quote it: <code>port: "{{ nginx_port }}"</code>. Also remember that a variable which is not defined is an <b>error</b> by default (a good thing). Use <code>| default(80)</code> only where a missing value is truly acceptable.</p>` }
    ],
    deepDive: `<p>🟣 <b>The real precedence list.</b> Lowest to highest (abridged): command-line options (like <code>-u</code>), role defaults, inventory file/script group vars, inventory <code>group_vars/all</code>, playbook <code>group_vars/all</code>, inventory <code>group_vars/*</code>, playbook <code>group_vars/*</code>, inventory file host vars, inventory <code>host_vars/*</code>, playbook <code>host_vars/*</code>, host facts and cached <code>set_facts</code>, play <code>vars</code>, play <code>vars_prompt</code>, play <code>vars_files</code>, role <code>vars/main.yml</code>, block vars, task vars, <code>include_vars</code>, <code>set_fact</code> and <code>register</code>, role and include params, and finally extra vars (<code>-e</code>). Our seven-step ladder is a faithful summary of the order of the big groups. Two surprises worth knowing: role <code>vars/</code> beats play <code>vars</code> (defaults are for overriding, <code>vars</code> are for keeping), and when two groups set the same variable for one host, the group processed last (alphabetical, or by <code>ansible_group_priority</code>) wins; parent groups are weaker than child groups.</p>
      <p>🟣 <b>Merging.</b> By default a dictionary variable from a stronger level <i>replaces</i> the weaker one entirely. To merge, use the <code>combine</code> filter: <code>settings: "{{ base_settings | combine(site_settings, recursive=True) }}"</code>. Lists are replaced, not appended, unless you write <code>list1 + list2</code>.</p>
      <p>🟣 <b>Facts in depth.</b> Facts are variables with the highest "host" trust level and are cached only if you configure a fact cache (<code>fact_caching = jsonfile</code> or Redis), which also lets playbooks read the facts of hosts that are not in the current play. Add <b>custom facts</b> with a file in <code>/etc/ansible/facts.d/*.fact</code> (INI or JSON), available as <code>ansible_local</code>. Use <code>ansible_facts['x']</code> rather than the old injected <code>ansible_x</code> names: it avoids collisions and works when <code>inject_facts_as_vars</code> is turned off.</p>
      <p>🟣 <b>Production reality.</b> Debugging precedence costs real hours. Keep the number of places small: defaults in the role, environment values in <code>group_vars</code>, a few <code>host_vars</code> exceptions, and nothing in <code>vars:</code> that is also in group_vars. Never put secrets in plain <code>group_vars</code> (next topic): vault them.</p>`,
    aiEra: `<p>🤖 <b>What AI changes.</b> Assistants are good at explaining a precedence puzzle if you paste the files and the observed value, and at converting hard-coded values into a clean <code>group_vars</code> layout with prefixed names.</p>
      <p><b>Use AI as a partner:</b> paste <code>ansible-inventory --host web1</code> output and ask "which file most likely set this value?", then check that file. Ask it to propose a naming scheme for variables across roles.</p>
      <p><b>Where AI goes wrong:</b> it confuses play <code>vars</code> with role <code>defaults</code>, claims host_vars always win, uses old facts such as <code>ansible_os_family</code> without the <code>ansible_facts[...]</code> form, forgets to quote <code>"{{ }}"</code>, and sometimes invents variables that do not exist. Treat its precedence claims as hypotheses and verify with a <code>debug</code> task.</p>`,
    problems: [P({
      t: 'Why is the port 8081 and not the 9090 I set for web1?', l: 'Medium', tags: ['variables', 'precedence', 'host_vars', 'debugging'], co: ['Cisco', 'Red Hat', 'IBM'],
      s: `<p>Your repo has <code>group_vars/web.yml</code> with <code>nginx_port: 8080</code> and <code>host_vars/web1.yml</code> with <code>nginx_port: 9090</code>. The playbook says <code>vars: {nginx_port: 8081}</code>. After a deploy, web1 listens on 8081. List every level that sets the value, state which one wins and why, and restructure so that <code>host_vars</code> can really override group values. Show how to prove the final value without running a deploy.</p>`,
      ex: `<p>Levels set: group_vars ${H.c('b', '8080')}, host_vars ${H.c('b', '9090')}, play vars ${H.c('g', '8081')}. Play vars are stronger than inventory variables, so ${H.c('g', '8081')} wins. Moving the play value into <code>group_vars</code> (or removing it) lets ${H.c('y', '9090')} win for web1.</p>`,
      bw: `<p>Adding <code>-e nginx_port=9090</code> to the command in the CI job. It "fixes" web1 but forces 9090 on <b>every</b> host in the run, because extra vars beat everything and apply to all hosts.</p>`,
      bc: `ansible-playbook site.yml -e nginx_port=9090   # sets it everywhere: wrong for the other 19 servers`,
      q: ['Which is stronger in the usual ladder?', ['Play <code>vars:</code> over inventory <code>host_vars</code>', 'Inventory <code>host_vars</code> over play <code>vars:</code>', 'Role defaults over everything', 'They are equal and the last file read wins'], 0, 'Inventory sources (group_vars, host_vars) are weaker than variables defined inside the playbook. Extra vars (-e) are strongest of all.'],
      h: ['<p>Hint 1: list every file or line that sets <code>nginx_port</code>.</p>', '<p>Hint 2: rank them with the ladder: group_vars &lt; host_vars &lt; play vars.</p>', '<p>Hint 3: if inventory should control the value, the playbook must not set it. Verify with <code>ansible-inventory --host web1</code>, which shows inventory-level values only, and a <code>debug</code> task for the final value.</p>'],
      a: `<p>Three levels set the variable. Inventory group_vars (8080) is weakest, inventory host_vars (9090) is stronger for web1, but the play's own <code>vars:</code> (8081) is stronger than both, so 8081 wins everywhere. The fix is design, not a flag: the playbook should not own environment values. Put the shared default in the role's <code>defaults/main.yml</code>, the environment value in <code>group_vars/web.yml</code>, and the exception in <code>host_vars/web1.yml</code>; delete the play-level <code>vars:</code>. Now the ladder works as intended: role default &lt; group &lt; host. Prove it without deploying: <code>ansible-inventory --host web1</code> shows 9090, and <code>ansible-playbook ... --tags show --limit web1</code> with a tagged debug task shows the value the play would use.</p>`,
      code: Y(`# roles/nginx/defaults/main.yml - a default that anyone may override
nginx_port: 80
---
# group_vars/web.yml - the environment decides
nginx_port: 8080
---
# host_vars/web1.yml - web1 is the exception (this now wins for web1)
nginx_port: 9090`, 'Three files, no vars: in the play'),
      alt: [SH(R`# What does inventory say about web1? (does not include play vars or -e)
ansible-inventory -i inventory.ini --host web1 | grep nginx_port
# What will the play actually use? A tagged debug task answers it without changing anything
ansible-playbook -i inventory.ini site.yml --limit web1 --tags show_vars`, 'Prove the value'),
        Y(`# add to the play: a read-only task to show the final value
- name: Show the value this play will use
  ansible.builtin.debug:
    var: nginx_port
  tags: [show_vars, always]`, 'Debug task')],
      cx: `<p>No runtime cost. The cost is discipline: one owner per variable.</p>`,
      f: ['When is putting a variable in <code>vars:</code> of the play right? (values the playbook author owns and nobody should override)', 'Which tool shows all variables for a host? (<code>ansible-inventory --host</code>, <code>setup</code>, <code>-vvv</code>)']
    })]
  });

  // ───────────────────────── Topic 5: Jinja2 templates ─────────────────────────
  var NGINX_J2 = `# {{ ansible_managed }}
worker_processes {{ workers | default('auto') }};
upstream app {
{% for h in upstreams %}
    server {{ h }}:{{ port }};
{% endfor %}
}
server {
    listen {{ port }};
{% if tls == 'yes' %}
    ssl_certificate /etc/ssl/site.pem;
{% endif %}
}`;
  topics.push({
    title: 'Templates with Jinja2: the Mail-Merge Letter',
    analogy: `<p>A mail-merge letter says "Dear {name}, your order {number} ships on {date}". You write the letter once, and the computer fills in the blanks for each customer. A <b>Jinja2 template</b> is a mail-merge for configuration files: you write one <code>nginx.conf.j2</code> with blanks like <code>{{ nginx_port }}</code>, and Ansible fills it in separately for every server using that server's variables and facts. One file in Git, twenty different correct results on disk.</p>`,
    explain: `<p>🟢 <b>Why templates.</b> Config files are mostly the same on every server, with a few values that differ (port, hostname, memory, list of peers). Copying twenty slightly different files by hand is how mistakes happen. The <code>ansible.builtin.template</code> module takes a <code>.j2</code> file from your project, renders it with the host's variables, and writes the result to the server. It is idempotent: if the rendered text equals the file already there, the task is <b>ok</b>; if not, it is <b>changed</b> and can notify a reload handler.</p>
      <p>🟢 <b>The three kinds of markers.</b></p>
      ${H.table(['Marker', 'Meaning', 'Example'], [
        ['<code>{{ ... }}</code>', 'print a value (an expression)', '<code>listen {{ nginx_port }};</code>'],
        ['<code>{% ... %}</code>', 'logic: if, for, set (prints nothing)', '<code>{% for h in groups[\'web\'] %}</code>'],
        ['<code>{# ... #}</code>', 'a comment that does not appear in the output', '<code>{# explain why #}</code>']
      ])}
      <p>🔵 <b>Filters</b> transform values with a pipe: <code>{{ name | upper }}</code>, <code>{{ port | default(80) }}</code> (use 80 if undefined), <code>{{ hosts | join(',') }}</code>, <code>{{ items | sort }}</code>, <code>{{ x | int }}</code>, <code>{{ data | to_nice_json }}</code>, <code>{{ path | basename }}</code>, <code>{{ secret | password_hash('sha512') }}</code> (in a task, not a template). Tests ask yes/no questions: <code>when: path is exists</code>, <code>x is defined</code>.</p>
      <p>🔵 <b>Loops and conditions.</b> <code>{% for h in groups['web'] %} ... {% endfor %}</code> repeats a block for each web host, which is how a load balancer config lists its backends automatically. <code>{% if tls | bool %} ... {% endif %}</code> includes a block only when needed. Inside a loop you get <code>loop.index</code>, <code>loop.first</code>, <code>loop.last</code>.</p>
      <p>🔵 <b>Reading other hosts.</b> Magic variables let a template see the whole inventory: <code>groups['web']</code> lists host names, <code>hostvars['web1']['ansible_host']</code> reads another host's variable. For another host's <i>facts</i>, that host must have been in an earlier play (or fact caching is on).</p>
      <p>🔵 <b>Good habits.</b> Put <code>{{ ansible_managed }}</code> (or "managed by Ansible, do not edit") at the top so no one edits the file by hand. Keep logic in the playbook or variables, and templates mostly plain text. Use <code>--check --diff</code> to see exactly how a rendered file will differ before it is written. Avoid timestamps in templates, because they change every run and break idempotency.</p>`,
    clues: [
      '"Same config file on many servers, with a few values different" → a Jinja2 template with variables',
      '"Build a backend list from the servers in a group" → <code>{% for h in groups[\'web\'] %}</code> with <code>hostvars</code>',
      '"Show me what will change in the file" → <code>--check --diff</code> with the <code>template</code> module',
      '"The file changes every run" → a timestamp, random value, or unsorted dictionary inside the template',
      '"undefined variable" in a template → a typo or a missing group_vars entry; fail loudly, use <code>default()</code> only on purpose',
      '"Restart only when the config differs" → <code>template</code> + <code>notify</code> handler'
    ],
    code: [J2(NGINX_J2, 'templates/nginx.conf.j2'),
      Y(`# render the template on every web host; reload only if the rendered text differs
- name: Render nginx config
  hosts: web
  become: true
  vars:
    port: 8080
    upstreams: ["10.0.0.11", "10.0.0.12"]
    tls: "no"
  tasks:
    - name: Deploy nginx config from template
      ansible.builtin.template:
        src: nginx.conf.j2
        dest: /etc/nginx/conf.d/app.conf
        owner: root
        group: root
        mode: "0644"
        backup: true              # keep a timestamped copy of the old file on the host
      notify: Reload nginx

  handlers:
    - name: Reload nginx
      ansible.builtin.service:
        name: nginx
        state: reloaded`, 'template task'),
      J2(`{# haproxy.cfg.j2 - backends are the web group, built from the inventory #}
backend web_pool
    balance roundrobin
{% for h in groups['web'] | sort %}
    server {{ h }} {{ hostvars[h]['ansible_host'] | default(h) }}:{{ nginx_port | default(80) }} check
{% endfor %}`, 'templates/haproxy.cfg.j2'),
      SH(R`# Preview the rendered result before touching the server: no changes, shows a diff
ansible-playbook -i inventory.ini render.yml --check --diff --limit web1`, 'Dry run with diff')],
    codeTitle: ['A template with a loop, a condition and a filter', 'The task that renders it', 'A load balancer built from the inventory', 'Preview'],
    viz: [{
      title: 'Rendering a Jinja2 template, line by line',
      input: 'port=8080; workers=auto; upstreams=10.0.0.11,10.0.0.12; tls=yes',
      inputLabel: 'port=...; workers=... (optional); upstreams=a,b,c; tls=yes|no',
      gen: function (input) {
        var v = { port: '80', workers: '', upstreams: '', tls: 'no' };
        String(input || '').split(';').forEach(function (s) { var m = s.trim().match(/^(\w+)\s*=\s*(.*)$/); if (m) v[m[1]] = m[2].trim(); });
        var ups = v.upstreams.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
        if (!ups.length) throw new Error('Give at least one upstream, e.g. upstreams=10.0.0.11,10.0.0.12');
        if (ups.length > 6) throw new Error('Use at most 6 upstreams');
        var T = NGINX_J2.split('\n'), out = [], f = [];
        function frame(narr, line, extra) {
          var hl = {}; hl[line] = 'cur';
          f.push({ narr: narr, parts: [{ type: 'code', label: 'template (nginx.conf.j2)', lang: 'text', code: NGINX_J2, hl: hl }, { type: 'code', label: 'rendered file so far', lang: 'text', code: out.length ? out.join('\n') : '(empty)' }, { type: 'vars', label: 'variables', vals: { port: v.port, workers: v.workers || '(undefined)', tls: v.tls, upstreams: ups.join(' ') }, hl: extra || {} }] });
        }
        out.push('# Ansible managed');
        frame('Line 1: <code>{{ ansible_managed }}</code> is replaced by Ansible\'s "do not edit by hand" text.', 1);
        out.push('worker_processes ' + (v.workers || 'auto') + ';');
        frame(v.workers ? 'Line 2: <code>workers</code> is defined (' + H.esc(v.workers) + '), so the <code>default(\'auto\')</code> filter is not needed.' : 'Line 2: <code>workers</code> is <b>not defined</b>, so the <code>default(\'auto\')</code> filter supplies <b>auto</b>. Without the filter this would be an "undefined variable" error.', 2, one('workers', 'cur'));
        out.push('upstream app {');
        frame('Line 3: plain text is copied as it is.', 3);
        ups.forEach(function (h, i) {
          frame('Lines 4 to 6: <code>{% for h in upstreams %}</code>, pass ' + (i + 1) + ' of ' + ups.length + ': <code>h</code> = <b>' + H.esc(h) + '</b>. Block lines are not printed themselves, only the line inside.', 4, one('upstreams', 'cur'));
          out.push('    server ' + h + ':' + v.port + ';');
          frame('Inside the loop: <code>{{ h }}:{{ port }}</code> becomes <b>' + H.esc(h + ':' + v.port) + '</b>.', 5, one('port', 'cur'));
        });
        out.push('}');
        frame('Line 7: the loop is finished (<code>{% endfor %}</code>); the closing brace is copied.', 7);
        out.push('server {'); out.push('    listen ' + v.port + ';');
        frame('Lines 8 and 9: <code>{{ port }}</code> becomes <b>' + H.esc(v.port) + '</b>.', 9, one('port', 'cur'));
        if (v.tls === 'yes') { out.push('    ssl_certificate /etc/ssl/site.pem;'); frame('Line 10: <code>tls == \'yes\'</code> is <b>true</b>, so the lines up to <code>{% endif %}</code> are included.', 11, one('tls', 'ok')); }
        else frame('Line 10: <code>tls == \'yes\'</code> is <b>false</b> (tls = ' + H.esc(v.tls) + '), so the certificate line is left out.', 10, one('tls', 'bad'));
        out.push('}');
        frame('Done. If this text equals the file already on the server, the task reports <b>ok</b>; otherwise <b>changed</b> and the reload handler is queued. Run with <code>--diff</code> to see the difference first.', 13);
        return f;
      }
    }],
    examples: [
      { title: 'One template, 20 servers, 20 correct files', html: `<p>Your <code>nginx.conf.j2</code> has <code>worker_processes {{ ansible_facts['processor_vcpus'] }};</code> and <code>listen {{ nginx_port }};</code>. A 2-CPU host renders 2, a 16-CPU host renders 16, and web3 (with a <code>host_vars</code> exception) renders its own port. You reviewed one file; every server gets the right one.</p>` },
      { title: 'Backends from the inventory', html: `<p>A load balancer needs the list of web servers. Hard-coding IPs means a new server is forgotten. The loop <code>{% for h in groups['web'] %}</code> reads the inventory, so adding <code>web21</code> to the group and re-running the playbook updates the balancer's config and reloads it, with no template edit.</p>` },
      { title: 'Whitespace', html: `<p>Block tags leave empty lines behind. In the <code>template</code> module, <code>trim_blocks</code> (default <code>true</code>) removes the newline after a block tag, and <code>lstrip_blocks: true</code> strips spaces before one, so indented <code>{% if %}</code> lines do not leave blanks. In-template control: <code>{%- ... -%}</code> trims on either side.</p>` },
      { title: 'A file that changes every run', html: `<p>A template contains <code>generated at {{ ansible_date_time.iso8601 }}</code>. Every run renders a new time, the file differs, the task reports <b>changed</b> and the handler reloads nginx every time. Remove the timestamp (the managed-by comment is enough), or take it from a fixed variable such as a Git commit id.</p>` }
    ],
    deepDive: `<p>🟣 <b>Where it runs.</b> Templates are rendered on the <b>control node</b>, then the finished text is copied to the host. So filters and lookups run on your machine, the host needs no Jinja2, and a variable that exists only on the managed host (a file's content) must be fetched first with a task and <code>register</code>. Use <code>ansible.builtin.template</code> for files and the plain <code>"{{ }}"</code> in YAML for values inside playbooks. Do not use a template to generate YAML for another tool unless you must; <code>to_nice_yaml</code> or the tool's native config module is safer than string pasting.</p>
      <p>🟣 <b>Safety and validation.</b> Always <code>validate:</code> full config files: <code>validate: "nginx -t -c %s"</code> for <code>nginx.conf</code>, <code>visudo -cf %s</code> for sudoers, <code>sshd -t -f %s</code> for sshd. The module writes to a temp file, runs the command and only installs the file if it passes. Set <code>mode</code> explicitly, since config files with secrets must not be world-readable. Use <code>backup: true</code> sparingly (it accumulates files); version control is the real history.</p>
      <p>🟣 <b>Undefined and strictness.</b> Ansible fails on undefined variables by default, which catches typos. Keep it that way: add <code>default()</code> only for genuinely optional values, and use <code>mandatory</code> to demand one: <code>{{ db_host | mandatory }}</code>. Be careful with <code>| default('')</code> on a value that is <i>defined but empty</i> (use <code>default('', true)</code> for that).</p>
      <p>🟣 <b>Performance and gotchas.</b> Templating a loop over a huge <code>hostvars</code> is slow on thousands of hosts; limit what you read. <code>hostvars[h]['ansible_facts']</code> exists only for hosts that have gathered facts in this run. A literal <code>{{</code> in the output (for example Go or Prometheus templates) needs <code>{% raw %}...{% endraw %}</code>, or the template engine will try to evaluate it. Ordered output matters: <code>| sort</code> your lists so the file is stable between runs.</p>`,
    aiEra: `<p>🤖 <b>What AI changes.</b> Assistants are strong at drafting a <code>.j2</code> file from an existing config ("turn this nginx.conf into a template with port and upstreams as variables") and at explaining a Jinja2 error message with its line number.</p>
      <p><b>Use AI as a partner:</b> paste the current production config and ask for the variable list and a first template. Then render it with <code>--check --diff</code> against the real file: a correct template produces <b>no diff</b> on a server that is already right.</p>
      <p><b>Where AI goes wrong:</b> it forgets <code>{% raw %}</code> for brace-heavy files, mixes up <code>{{ }}</code> and <code>{% %}</code>, writes <code>if var == true</code> where the value is the string "true" (use <code>| bool</code>), leaves timestamps in, and hard-codes values that should be variables. A no-diff render on an already-correct server is the best test.</p>`,
    problems: [P({
      t: 'Build the load balancer backend list from the inventory', l: 'Medium', tags: ['jinja2', 'template', 'hostvars', 'groups'], co: ['Thoughtworks', 'Cisco', 'Capgemini'],
      s: `<p>A <code>lb</code> host runs HAProxy and needs one <code>server</code> line per web host, using each host's <code>ansible_host</code> address and the web port from <code>group_vars/web.yml</code> (<code>web_port: 8080</code>). Today the list is edited by hand and someone always forgets a new server. Write the template and the playbook so adding a host to the <code>web</code> group is the only change needed. Include a validate step and a reload only on change.</p>`,
      ex: `<p>With web1 (10.0.1.11) and web2 (10.0.1.12) the file contains ${H.c('g', 'server web1 10.0.1.11:8080 check')} and ${H.c('g', 'server web2 10.0.1.12:8080 check')}. Add web3 to the inventory, re-run, and a third line appears; the task is ${H.c('y', 'changed')} once, then ${H.c('g', 'ok')}.</p>`,
      bw: `<p>A static <code>haproxy.cfg</code> copied with the <code>copy</code> module and edited by hand for every server change. It drifts from the inventory and a forgotten host silently receives no traffic.</p>`,
      bcl: 'yaml', bc: `- name: Copy a hand-edited balancer config
  ansible.builtin.copy:
    src: haproxy.cfg
    dest: /etc/haproxy/haproxy.cfg`,
      q: ['Where does a Jinja2 template get rendered?', ['On the control node, then the result is copied to the host', 'On each managed host by its own Jinja2', 'In the Ansible Galaxy server', 'In the nginx process'], 0, 'Ansible renders templates locally and sends the finished file. Hosts need only Python for modules, not Jinja2 templates.'],
      h: ['<p>Hint 1: <code>groups[\'web\']</code> is the list of host names in the group.</p>', '<p>Hint 2: <code>hostvars[h][\'ansible_host\']</code> reads another host\'s variable. This works even though the play runs on <code>lb</code>, because inventory variables exist for all hosts.</p>', '<p>Hint 3: sort the list so the output is stable; add <code>validate</code> with <code>haproxy -c -f %s</code> and notify a reload handler.</p>'],
      a: `<p>The template loops over the <code>web</code> group, so the inventory is the single source of truth. <code>hostvars[h]['ansible_host']</code> gives each address (with <code>default(h)</code> as a fallback to the name), and <code>web_port</code> comes from group_vars. Sorting keeps the output stable between runs so the task is <b>ok</b> when nothing changed. <code>validate</code> refuses to install a broken config, and the reload handler only fires when the rendered file differs. Test with <code>--check --diff</code> on the <code>lb</code> host first. Note: <code>web_port</code> is defined in <code>group_vars/web.yml</code>, which applies to web hosts, so read it from a web host: <code>hostvars[h]['web_port']</code>, not from the lb host's own scope.</p>`,
      code: Y(`# lb.yml
- name: Configure the load balancer from the inventory
  hosts: lb
  become: true
  tasks:
    - name: Render haproxy.cfg
      ansible.builtin.template:
        src: haproxy.cfg.j2
        dest: /etc/haproxy/haproxy.cfg
        owner: root
        group: root
        mode: "0644"
        validate: "haproxy -c -f %s"
      notify: Reload haproxy

  handlers:
    - name: Reload haproxy
      ansible.builtin.service:
        name: haproxy
        state: reloaded`, 'lb.yml'),
      alt: [J2(`# {{ ansible_managed }}
global
    log /dev/log local0
defaults
    mode http
    timeout connect 5s
    timeout client  30s
    timeout server  30s
frontend www
    bind *:80
    default_backend web_pool
backend web_pool
    balance roundrobin
{% for h in groups['web'] | sort %}
    server {{ h }} {{ hostvars[h]['ansible_host'] | default(h) }}:{{ hostvars[h]['web_port'] }} check
{% endfor %}`, 'templates/haproxy.cfg.j2')],
      cx: `<p>Rendering is linear in the number of web hosts. Reading <code>hostvars</code> for 20 hosts is instant; for thousands, prefer a smaller derived list.</p>`,
      f: ['What if the lb should only list healthy hosts? (health checks in HAProxy; or set a fact per host and filter with <code>selectattr</code>)', 'How do you stop the lb from reloading on every run? (sorted output, no timestamps, handler on change only)']
    })]
  });

  // ───────────────────────── Topic 6: roles, Galaxy, collections, lint, molecule ─────────────────────────
  topics.push({
    title: 'Roles, Galaxy and Collections: Labelled Boxes of Tools',
    analogy: `<p>A messy garage has every tool in one pile. A tidy workshop has labelled drawers: "plumbing", "electrical", "paint". When you need to fix a tap you open one drawer. A <b>role</b> is one drawer: everything needed to set up one thing (nginx, a database, a monitoring agent) in a fixed layout: tasks, handlers, templates, default values. <b>Galaxy</b> is the public hardware shop where people share drawers, and a <b>collection</b> is a whole toolbox from one vendor (modules and roles together). You borrow, pin the version you tested, and never melt down someone else's tools.</p>`,
    explain: `<p>🟢 <b>Why roles.</b> A playbook that does everything in one file grows to hundreds of lines nobody dares to touch, and you copy-paste it for the next project. A role packages one job so you can reuse it: <code>roles: [common, nginx, app]</code>. The directory layout is a convention, so every Ansible user knows where things are.</p>
      ${H.table(['Folder', 'What goes there'], [
        ['<code>tasks/main.yml</code>', 'the steps (the only required file)'],
        ['<code>handlers/main.yml</code>', 'handlers the tasks notify'],
        ['<code>defaults/main.yml</code>', 'default values, <b>lowest</b> precedence: made to be overridden'],
        ['<code>vars/main.yml</code>', 'internal constants, high precedence: not meant to be overridden'],
        ['<code>templates/</code> and <code>files/</code>', 'Jinja2 templates; static files (found automatically by name)'],
        ['<code>meta/main.yml</code>', 'author, supported platforms, <b>dependencies</b> on other roles'],
        ['<code>molecule/</code>', 'tests for the role']
      ])}
      <p>🟢 <b>Make one.</b> <code>ansible-galaxy init roles/nginx</code> creates the empty layout. Move tasks in, turn hard-coded values into <code>defaults</code>, name every variable with the role prefix (<code>nginx_port</code>), and call the role from a short playbook. A good role reads like a small API: "set these variables, get this result".</p>
      <p>🔵 <b>Collections and Galaxy.</b> Since Ansible 2.10 most modules live in <b>collections</b>, versioned bundles installed separately: <code>ansible.posix</code>, <code>community.general</code>, <code>community.docker</code>, <code>amazon.aws</code>. Roles from the community come from <b>Ansible Galaxy</b>. Declare what you need in <code>requirements.yml</code> and install with <code>ansible-galaxy collection install -r requirements.yml</code> (and <code>ansible-galaxy role install -r requirements.yml</code> for roles). Use the full name <code>namespace.collection.module</code> (FQCN) in tasks so there is no doubt where a module comes from.</p>
      <p>🔵 <b>Pin versions.</b> <code>version: "&gt;=2.0.0,&lt;3.0.0"</code> in <code>requirements.yml</code>. An unpinned role can change tomorrow and break tonight's deploy. Read a Galaxy role before you run it as root on your servers: it is code from strangers.</p>
      <p>🔵 <b>Run order.</b> In a play: <code>pre_tasks</code>, then <code>roles</code> (each role's <code>meta</code> dependencies first, then its tasks), then <code>tasks</code>, then <code>post_tasks</code>. A role listed twice runs once, unless its arguments differ. For flexible reuse prefer <code>include_role</code> / <code>import_role</code> inside <code>tasks</code>: you control where in the sequence it runs and can pass variables and tags.</p>
      <p>🔵 <b>Quality: lint and test.</b> <code>ansible-lint</code> reads your playbooks and roles and flags bad habits: <code>shell</code> where a module exists, missing <code>name</code>, no FQCN, risky file permissions, and so on. Run it in CI. <b>Molecule</b> tests a role: it starts a throwaway container, applies the role (<code>converge</code>), applies it again to prove <code>changed=0</code> (<code>idempotence</code>), and runs checks (<code>verify</code>). Together they catch most mistakes before a server sees them.</p>`,
    clues: [
      '"We copy the same tasks into every playbook" → extract a role (or a collection) and reuse it',
      '"Share automation between teams" → a role or collection in Git/Galaxy with <code>requirements.yml</code> and pinned versions',
      '"A community role changed and our deploy broke" → pin the version; vendor or mirror critical roles',
      '"How do you test Ansible code?" → <code>ansible-lint</code> for style and risk, <code>molecule</code> in a container for converge + idempotence + verify',
      '"Module not found: community.docker.docker_container" → the collection is not installed; add it to <code>requirements.yml</code>',
      '"Role needs another role first" → <code>dependencies</code> in <code>meta/main.yml</code>'
    ],
    code: [SH(R`# Create a role skeleton and look at it
ansible-galaxy init roles/nginx
find roles/nginx -type f | sort
# roles/nginx/README.md
# roles/nginx/defaults/main.yml
# roles/nginx/handlers/main.yml
# roles/nginx/meta/main.yml
# roles/nginx/tasks/main.yml
# roles/nginx/templates/ (empty)
# roles/nginx/tests/inventory, test.yml
# roles/nginx/vars/main.yml`, 'ansible-galaxy init'),
      Y(`# roles/nginx/tasks/main.yml
- name: Install nginx
  ansible.builtin.apt:
    name: nginx
    state: present
    update_cache: true
    cache_valid_time: 3600

- name: Render the site config
  ansible.builtin.template:
    src: site.conf.j2            # found in roles/nginx/templates/ automatically
    dest: /etc/nginx/conf.d/site.conf
    owner: root
    group: root
    mode: "0644"
  notify: Reload nginx

- name: Enable and start nginx
  ansible.builtin.service:
    name: nginx
    state: started
    enabled: true`, 'roles/nginx/tasks/main.yml'),
      Y(`# roles/nginx/defaults/main.yml - the "public settings" of the role
nginx_port: 80
nginx_server_name: "_"
nginx_worker_connections: 1024`, 'roles/nginx/defaults/main.yml'),
      Y(`# roles/nginx/handlers/main.yml
- name: Reload nginx
  ansible.builtin.service:
    name: nginx
    state: reloaded`, 'roles/nginx/handlers/main.yml'),
      Y(`# roles/app/meta/main.yml - app needs common and nginx first
galaxy_info:
  author: you
  description: Deploys the app behind nginx
  license: MIT
  min_ansible_version: "2.15"
  platforms:
    - name: Debian
      versions: [bookworm]
dependencies:
  - role: common
  - role: nginx
    vars:
      nginx_port: 8080`, 'roles/app/meta/main.yml'),
      Y(`# requirements.yml - everything the project needs from outside, pinned
collections:
  - name: community.general
    version: ">=8.0.0,<10.0.0"
  - name: community.docker
    version: ">=3.4.0"
  - name: ansible.posix
roles:
  - name: geerlingguy.pip           # an example Galaxy role; read it before you trust it
    version: "3.0.0"`, 'requirements.yml'),
      Y(`# site.yml - the playbook becomes short and readable
- name: Web tier
  hosts: web
  become: true
  roles:
    - common
    - role: nginx
      vars:
        nginx_port: 8080`, 'site.yml using roles'),
      Y(`# roles/nginx/molecule/default/molecule.yml - test the role in a throwaway container
driver:
  name: docker
platforms:
  - name: instance
    image: geerlingguy/docker-debian12-ansible:latest   # Debian with systemd + Python, built for Ansible testing
    pre_build_image: true
    privileged: true
    command: ""
provisioner:
  name: ansible
verifier:
  name: ansible`, 'molecule.yml'),
      SH(R`ansible-galaxy collection install -r requirements.yml
ansible-galaxy role install -r requirements.yml -p roles/
ansible-lint site.yml roles/    # style and risk checks
cd roles/nginx && molecule test # create, converge, idempotence, verify, destroy`, 'Install, lint, test')],
    codeTitle: ['Create a role', 'Role tasks', 'Role defaults', 'Role handlers', 'Role dependencies', 'requirements.yml', 'Playbook with roles', 'Molecule config', 'Install, lint, test'],
    viz: [{
      title: 'Role dependencies decide the run order',
      input: 'app>nginx,common; nginx>common; common>',
      inputLabel: 'role>dependency1,dependency2 ; ... The first role is the one the play asks for',
      gen: function (input) {
        var deps = {}, names = [];
        String(input || '').split(';').map(function (s) { return s.trim(); }).filter(Boolean).forEach(function (s) {
          var m = s.match(/^([\w-]+)\s*>\s*(.*)$/);
          if (!m) throw new Error('Use role>dep1,dep2 separated by ;  (leave empty after > for no dependencies)');
          deps[m[1]] = m[2].split(',').map(function (x) { return x.trim(); }).filter(Boolean); names.push(m[1]);
        });
        if (!names.length) throw new Error('Add at least one role, e.g. app>nginx,common');
        if (names.length > 8) throw new Error('Use at most 8 roles');
        var done = [], stack = [], f = [], guard = 0;
        function snap(narr, hl) { f.push({ narr: narr, parts: [{ type: 'stack', label: 'resolving now (top = current)', items: stack.length ? stack.slice() : ['(none)'], hl: hl || {} }, { type: 'queue', label: 'run order so far', items: done.length ? done.slice() : ['(nothing yet)'], frontLabel: 'first', backLabel: 'last' }] }); }
        function visit(r) {
          if (guard++ > 60) throw new Error('Too many steps: is there a circular dependency?');
          if (done.indexOf(r) >= 0) { snap('<b>' + H.esc(r) + '</b> already ran, so it is <span class="c-g">skipped</span>. A role runs once per play even if several roles depend on it.', {}); return; }
          if (stack.indexOf(r) >= 0) throw new Error('Circular dependency at ' + r);
          stack.push(r);
          snap('Play asks for / needs <b>' + H.esc(r) + '</b>. Its dependencies (' + ((deps[r] || []).join(', ') || 'none') + ') must run <b>before</b> its own tasks.', one(stack.length - 1, 'cur'));
          (deps[r] || []).forEach(visit);
          done.push(r);
          snap('<b>' + H.esc(r) + '</b>: all dependencies are done, so now its own <code>tasks/main.yml</code> runs.', {});
          stack.pop();
        }
        visit(names[0]);
        snap('Order of execution: <b>' + done.join(' → ') + '</b>. This is what <code>ansible-playbook --list-tasks</code> would show. Handlers of each role fire at the end of the roles section.', {});
        return pad4(f, 'Done.');
      }
    }],
    examples: [
      { title: 'From 400 lines to a role', html: `<p>A teammate's <code>webserver.yml</code> has 400 lines: users, packages, nginx, TLS, logging. Split it: <code>common</code> (users, ssh, ntp), <code>nginx</code> (package, config, service), <code>tls</code> (certificates). The playbook becomes <code>roles: [common, nginx, tls]</code>. The next project reuses all three with different variables, and each role can be tested alone.</p>` },
      { title: 'A collection is not a role', html: `<p>A <b>role</b> is a bundle of tasks for one job. A <b>collection</b> is a distribution unit that can contain modules, plugins, roles and playbooks, named <code>namespace.name</code> (<code>community.docker</code>). You install collections to get <i>modules</i> (<code>community.docker.docker_container</code>); you write roles to hold <i>your own</i> procedure.</p>` },
      { title: 'Pinning saved a Friday', html: `<p>A role from Galaxy released a new major version that renamed a variable. Teams with <code>version: "3.0.0"</code> in <code>requirements.yml</code> saw no change. A team that installed "latest" found their nightly job failing. Update deliberately: bump the pin in a branch, run lint and molecule, read the changelog, merge.</p>` },
      { title: 'Lint output you will actually see', html: `<pre>site.yml:12: fqcn[action-core]: Use FQCN for builtin module actions (apt).
site.yml:20: no-changed-when: Commands should not change things if nothing needs doing.
site.yml:31: yaml[truthy]: Truthy value should be one of [false, true]</pre><p>Each line gives the file, the line and a rule name you can look up. Fix the cause, not the warning: do not blanket-disable rules in <code>.ansible-lint</code> to get green.</p>` }
    ],
    deepDive: `<p>🟣 <b>defaults vs vars in roles.</b> <code>defaults/main.yml</code> is the lowest precedence on purpose: anyone can override it from inventory. <code>vars/main.yml</code> is high precedence: use it for constants that must not change (package names per OS). If you put tunable values in <code>vars/</code> users will fight your role with <code>-e</code>. Document every default in the README as the role's interface, and validate input with <code>meta/argument_specs.yml</code>, which lets Ansible reject wrong or missing variables with a clear message before any task runs.</p>
      <p>🟣 <b>Role design.</b> One role, one responsibility. Make it work on the OS families you claim (use <code>include_tasks: "{{ ansible_facts['os_family'] }}.yml"</code> or a vars file per family). Keep tasks idempotent and tag them. Avoid roles that call other roles through many layers: dependencies hide order. Prefer explicit lists in the playbook. Use <code>import_role</code> for static, tag-friendly inclusion and <code>include_role</code> when the choice is made at runtime (a loop or a <code>when</code>).</p>
      <p>🟣 <b>Collections as products.</b> In larger organisations roles and custom modules are published as an internal collection (<code>acme.platform</code>) to a private Galaxy (Automation Hub, or a Git repo referenced in <code>requirements.yml</code> with <code>type: git</code>). Version it with semantic versioning, write a changelog, and run <code>ansible-test sanity</code> if it has plugins. Python dependencies of a collection go into a requirements file; <b>execution environments</b> (container images built with <code>ansible-builder</code>) freeze ansible-core, collections and Python libraries so a run behaves the same on a laptop and in the automation platform.</p>
      <p>🟣 <b>Testing in production reality.</b> Molecule with the Docker driver is fast but has no real kernel services (systemd needs the special image shown above, privileged mode). Real behaviour such as firewalls and kernel settings needs a VM driver or a staging environment. Treat Molecule as the first gate: converge passes, a second run reports <code>changed=0</code>, verify asserts the port answers. Add <code>ansible-lint</code> with the <code>production</code> profile to the pipeline and make it block the merge.</p>`,
    aiEra: `<p>🤖 <b>What AI changes.</b> Assistants can refactor a long playbook into roles, write <code>defaults/main.yml</code> with sensible names, draft Molecule scenarios and explain every <code>ansible-lint</code> finding. For a community role they can summarise what it does so you can review it faster.</p>
      <p><b>Use AI as a partner:</b> ask it to review a Galaxy role for risky tasks (shell, downloads without checksums, <code>become</code> to unknown users) before you adopt it, and to write the Molecule <code>verify.yml</code> assertions. Then run them.</p>
      <p><b>Where AI goes wrong:</b> it suggests roles or collections that do not exist or were renamed (<code>geerlingguy.nginx</code> variants, old <code>community.general</code> module names), leaves versions unpinned, and mixes tunable variables into <code>vars/</code>. Supply-chain risk is real: installing an unreviewed Galaxy role, or a name an assistant invented that an attacker later registers, runs strangers' code as root on your servers. Always look the name up and read the source.</p>`,
    problems: [P({
      t: 'Turn the 200-line playbook into a tested role', l: 'Medium', tags: ['roles', 'galaxy', 'molecule', 'lint'], co: ['Red Hat', 'Thoughtworks', 'Accenture'],
      s: `<p>Your team has <code>webserver.yml</code> with tasks for nginx (package, config template, service) and a handler, with the port hard-coded as 80 in the template. Create a reusable role <code>nginx</code> with a configurable <code>nginx_port</code> (default 80), call it from a short playbook that sets 8080 for the <code>web</code> group, and add a Molecule scenario that converges the role in a container. Install one collection the team needs through <code>requirements.yml</code>, pinned.</p>`,
      ex: `<p>After the refactor <code>ansible-playbook site.yml</code> shows the same results as before, ${H.c('g', 'changed=0')} on a second run, and <code>molecule test</code> shows ${H.c('g', 'converge, idempotence and verify all passing')}.</p>`,
      bw: `<p>Copying <code>webserver.yml</code> into each new project and editing the port by hand. Fixes to the original never reach the copies, and nobody can test the pieces separately.</p>`,
      q: ['Where should a tunable value such as <code>nginx_port</code> live in a role?', ['<code>defaults/main.yml</code>, so users can override it', '<code>vars/main.yml</code>, so nobody can change it', '<code>tasks/main.yml</code> as a literal', '<code>meta/main.yml</code>'], 0, 'Defaults have the lowest precedence, which is exactly what a public setting of a role needs. vars/ is for internal constants.'],
      h: ['<p>Hint 1: <code>ansible-galaxy init roles/nginx</code> creates the layout; move tasks, handlers and the template into it.</p>', '<p>Hint 2: replace the literal 80 in the template with <code>{{ nginx_port }}</code> and define the default.</p>', '<p>Hint 3: Molecule needs <code>molecule.yml</code> (platform) and <code>converge.yml</code> (apply the role); add an assertion that the port answers in <code>verify.yml</code>.</p>'],
      a: `<p>Create the skeleton, then move each piece to its place: tasks to <code>tasks/main.yml</code>, the handler to <code>handlers/main.yml</code>, the template to <code>templates/</code>, and every tunable to <code>defaults/main.yml</code> with a role prefix. The project playbook now only says which hosts and which values. Add <code>requirements.yml</code> with a pinned collection and install it. For Molecule, one scenario with a systemd-capable Debian image runs <code>converge.yml</code> (which includes the role) and then automatically a second pass to check idempotence; <code>verify.yml</code> uses the <code>ansible.builtin.uri</code> or <code>wait_for</code> module to check that nginx answers on the configured port. Wire <code>ansible-lint</code> and <code>molecule test</code> into CI so every change to the role is checked in a throwaway container.</p>`,
      code: Y(`# site.yml - the project playbook (the role lives in roles/nginx)
- name: Web tier
  hosts: web
  become: true
  roles:
    - role: nginx
      vars:
        nginx_port: 8080`, 'site.yml'),
      alt: [Y(`# roles/nginx/molecule/default/converge.yml - apply the role inside the test container
- name: Converge
  hosts: all
  become: true
  roles:
    - role: nginx
      vars:
        nginx_port: 8080`, 'converge.yml'),
        Y(`# roles/nginx/molecule/default/verify.yml - assert the result, do not just trust "no error"
- name: Verify
  hosts: all
  gather_facts: false
  tasks:
    - name: Nginx answers on the configured port
      ansible.builtin.uri:
        url: http://127.0.0.1:8080/
        status_code: 200
      register: web
      retries: 5
      delay: 2
      until: web.status == 200`, 'verify.yml'),
        SH(R`ansible-galaxy init roles/nginx
mv webserver-template.j2 roles/nginx/templates/site.conf.j2
cat > requirements.yml <<'REQ'
collections:
  - name: ansible.posix
    version: ">=1.5.0"
REQ
ansible-galaxy collection install -r requirements.yml
ansible-lint site.yml roles/nginx
cd roles/nginx && molecule test`, 'Commands')],
      cx: `<p>One-time refactor. Molecule adds container start-up time to CI (about a minute), traded for catching broken roles before they reach servers.</p>`,
      f: ['How would you make the role support both Debian and Red Hat? (OS-family task files or vars, tested in two Molecule platforms)', 'How do you stop callers from passing a wrong type for <code>nginx_port</code>? (<code>meta/argument_specs.yml</code>)']
    })]
  });

  // ───────────────────────── Topic 7: vault and secrets ─────────────────────────
  topics.push({
    title: 'Ansible Vault and Secrets: the Safe and Its Key',
    analogy: `<p>Your restaurant keeps its recipes in a notebook that every cook reads, and that is copied to every branch. The secret sauce recipe must not be in that notebook in plain words. So you put it in a <b>locked safe</b> that travels with the notebook, and each manager gets the <b>key</b> separately, never taped to the safe. <code>ansible-vault</code> is the safe: secret values are encrypted inside your repository, so the repo can be shared, and only a person or pipeline holding the vault password can open them. Writing a password in plain text in Git is like taping the recipe to the shop window.</p>`,
    explain: `<p>🟢 <b>The problem.</b> Playbooks need secrets: database passwords, API tokens, TLS private keys. Your playbooks live in Git, which many people can read and which remembers everything forever. A plain-text secret in <code>group_vars</code> is a leak the moment it is committed, even if you delete it later, because it stays in history and in every clone.</p>
      <p>🟢 <b>The three tools.</b></p>
      ${H.table(['Tool', 'What it does', 'Example'], [
        ['<code>ansible-vault encrypt_string</code>', 'encrypts <b>one value</b>; paste it into a normal vars file', '<code>db_password: !vault |</code> followed by an encrypted block'],
        ['<code>ansible-vault encrypt/create/edit</code>', 'encrypts <b>a whole file</b> (AES-256); the file starts with <code>$ANSIBLE_VAULT;1.1;AES256</code>', '<code>group_vars/prod/vault.yml</code>'],
        ['<code>no_log: true</code>', 'keeps a task\'s arguments and results <b>out of the logs</b>', 'tasks that handle passwords or tokens']
      ])}
      <p>🔵 <b>Giving Ansible the key (never in the repo).</b></p>
      <ul><li><code>--ask-vault-pass</code>: Ansible prompts you. Good for a human at a terminal.</li>
        <li><code>--vault-password-file ~/.config/ansible/vault_pass</code>: a file <b>outside the repository</b>, mode <code>0600</code>. Good for you on your own machine. In CI, write the password from the CI system's secret store to a temp file for the job.</li>
        <li>A file that is an <b>executable script</b> (starts with <code>#!</code>) is run and its output is the password: use it to fetch the key from a password manager or cloud secret service.</li></ul>
      <p>🔵 <b>Vault IDs.</b> Use separate passwords for separate environments with labels: <code>--vault-id dev@prompt --vault-id prod@~/.config/ansible/vault_prod</code>. Encrypt with a label (<code>encrypt_string --vault-id prod@...</code>) and Ansible tries the right password for each secret. Developers can then hold the dev key and never see production.</p>
      <p>🔵 <b>Good layout.</b> Keep names visible and values vaulted: <code>group_vars/prod/vars.yml</code> contains <code>db_password: "{{ vault_db_password }}"</code>, and <code>group_vars/prod/vault.yml</code> (encrypted) contains <code>vault_db_password: ...</code>. A code review can see which variable is used where, and <code>grep</code> still works.</p>
      <p>🔵 <b>no_log.</b> Even encrypted at rest, a secret is decrypted in memory and appears in task output with <code>-v</code>, in <code>register</code>ed results, in CI logs and in the callback output. Put <code>no_log: true</code> on every task that handles it (or on the whole play for sensitive roles). The trade-off: failures become harder to read, so for debugging use a temporary <code>no_log: "{{ not debug_secrets | default(false) }}"</code>, and never <code>-vvv</code> a production run.</p>
      <p>🔵 <b>The honest limits.</b> Vault protects secrets in the repository. It does not protect them on the managed host (a file with the password is readable by whoever has the right permissions), and one shared password for everybody is hard to rotate. For larger teams use a secret manager (HashiCorp Vault, AWS Secrets Manager) through a lookup, so Ansible fetches short-lived secrets at run time.</p>`,
    clues: [
      '"A database password is in group_vars in Git" → treat as leaked: <b>rotate first</b>, then vault the new value; history rewriting alone is not enough',
      '"Keep secrets in the repo safely" → <code>ansible-vault encrypt_string</code> or an encrypted <code>vault.yml</code>, with the key outside the repo',
      '"Different secrets for dev and prod" → vault IDs with separate passwords',
      '"The password appears in the CI log" → missing <code>no_log: true</code> (and no <code>-vvv</code> in production runs)',
      '"How does CI get the vault password?" → CI secret store written to a temp file, or a password-script that fetches it; never committed',
      '"Secrets that change often or must be audited" → an external secret manager and a lookup, not a static vault file'
    ],
    code: [SH(R`#!/usr/bin/env bash
# Lab: make and use a vault. Every secret here is a placeholder you type at the prompt.
set -euo pipefail

# 1) Keep the vault password OUTSIDE the repo, readable only by you
mkdir -p ~/.config/ansible
umask 077
read -rsp "Choose a vault password: " VP && echo
printf '%s\n' "$VP" > ~/.config/ansible/vault_pass_dev
unset VP

# 2) Encrypt ONE value. --stdin-name reads the secret from stdin, so it never appears in your shell history
read -rsp "Value for db_password: " DBPW && echo
printf '%s' "$DBPW" | ansible-vault encrypt_string --vault-id dev@~/.config/ansible/vault_pass_dev --stdin-name 'vault_db_password'
unset DBPW
# -> prints a "vault_db_password: !vault |" block. Paste it into group_vars/dev/vault.yml

# 3) Or encrypt a whole file, then edit and view it
ansible-vault encrypt --vault-id dev@~/.config/ansible/vault_pass_dev group_vars/dev/vault.yml
ansible-vault edit    --vault-id dev@~/.config/ansible/vault_pass_dev group_vars/dev/vault.yml
ansible-vault view    --vault-id dev@~/.config/ansible/vault_pass_dev group_vars/dev/vault.yml

# 4) Use it
ansible-playbook site.yml --vault-id dev@~/.config/ansible/vault_pass_dev   # key from a file
ansible-playbook site.yml --ask-vault-pass                                   # key typed at a prompt

# 5) Change the password for a file (rekey)
ansible-vault rekey --vault-id dev@~/.config/ansible/vault_pass_dev --new-vault-id dev@prompt group_vars/dev/vault.yml`, 'ansible-vault in practice'),
      Y(`# group_vars/prod/vars.yml - readable names, no values
db_user: app
db_password: "{{ vault_db_password }}"      # the value lives in the encrypted vault.yml next to it`, 'group_vars/prod/vars.yml'),
      { lang: 'text', check: false, title: 'group_vars/prod/vault.yml (what Git stores: fake ciphertext for illustration)', code: `$ANSIBLE_VAULT;1.1;AES256;prod
30613233643463393938353163303633313262623738646533643766653137386161626365646162
6264336435336331376133313566343637663262313665300a373561636264316333396638326333
(...more lines of hexadecimal ciphertext...)` },
      Y(`# use-secret.yml - a task that touches a secret MUST hide it from the logs
- name: Create the application database user
  hosts: db
  become: true
  tasks:
    - name: Set the application database password
      community.mysql.mysql_user:
        name: "{{ db_user }}"
        password: "{{ db_password }}"
        priv: "appdb.*:ALL"
        state: present
      no_log: true                 # hides arguments AND results, even with -vvv

    - name: Write an environment file for the app (secret inside)
      ansible.builtin.template:
        src: app.env.j2
        dest: /etc/app/app.env
        owner: root
        group: app
        mode: "0640"               # readable by the app group only, never world-readable
      no_log: true`, 'use-secret.yml'),
      SH(R`# .gitignore guard + a pre-commit scan, so a plaintext secret cannot be committed by mistake
printf '%s\n' '*.vault_pass*' '.vault_pass' 'vault_pass*' >> .gitignore
git secrets --scan || gitleaks detect --no-banner   # either scanner, run in CI too`, 'Prevent the next leak')],
    codeTitle: ['Vault commands', 'Names in plain text, values in the vault', 'What the encrypted file looks like in Git', 'A task with no_log', 'Guard rails'],
    viz: [{
      title: 'Where does the secret travel? Vault, key and no_log',
      input: 'vault=yes; no_log=no',
      inputLabel: 'vault=yes|no  (secret encrypted in Git?) ; no_log=yes|no  (hidden in task output?)',
      gen: function (input) {
        var o = { vault: 'yes', no_log: 'no' };
        String(input || '').split(';').forEach(function (s) { var m = s.trim().match(/^(\w+)\s*=\s*(yes|no)$/i); if (m) o[m[1].toLowerCase()] = m[2].toLowerCase(); });
        var v = o.vault === 'yes', n = o.no_log === 'yes', f = [];
        function st(repo, run, log) { return { type: 'table', label: 'where the secret is visible', columns: ['place', 'secret visible?'], rows: [['Git repository and its history', repo], ['Ansible run (memory of control node)', run], ['Task output and CI log', log]], hl: {} }; }
        f.push({ narr: 'A playbook needs the database password. The question is where a person or a scanner could read it. Settings: vault = <b>' + o.vault + '</b>, no_log = <b>' + o.no_log + '</b>.', parts: [st('?', '?', '?')] });
        f.push({ narr: v ? 'You encrypted the value (<code>ansible-vault encrypt_string</code>). Git stores only <code>$ANSIBLE_VAULT;1.1;AES256...</code> ciphertext. Cloning the repo does <b>not</b> reveal the password.' : '<b>The value is written in plain text in group_vars.</b> Anyone with read access to the repo, every fork, every old commit and every CI cache can read it. Deleting it later does not remove it from history. Treat it as leaked: rotate it first.', parts: [Object.assign(st(v ? 'no (ciphertext)' : 'YES, forever', '?', '?'), { hl: v ? {} : { 0: 'bad' } })] });
        f.push({ narr: v ? 'At run time you supply the key from <b>outside</b> the repo (<code>--ask-vault-pass</code> or a 0600 file). Ansible decrypts the value in memory on the control node for the tasks that need it.' : 'At run time Ansible reads the plain value straight from the file. Nothing protects it.', parts: [Object.assign(st(v ? 'no (ciphertext)' : 'YES, forever', 'yes (needed to work)', '?'), { hl: v ? { 1: 'cur' } : { 0: 'bad', 1: 'cur' } })] });
        f.push({ narr: n ? 'The task that sets the password has <code>no_log: true</code>. Its arguments and results are replaced by "censored" in the output, even with <code>-vvv</code>.' : 'The task has <b>no no_log</b>. With <code>-v</code> (or on a failure) the full arguments, including the password, are printed to the terminal and stored by the CI system\'s log for months.', parts: [Object.assign(st(v ? 'no (ciphertext)' : 'YES, forever', 'yes (needed to work)', n ? 'no (censored)' : 'YES, in plain text'), { hl: n ? (v ? {} : { 0: 'bad' }) : (v ? { 2: 'bad' } : { 0: 'bad', 2: 'bad' }) })] });
        var good = v && n;
        f.push({ narr: good ? 'Result: the secret is encrypted at rest and hidden in logs. It exists in plain text only inside the running process (and in the target file with a strict mode). This is the safe pattern. Remaining risks: a shared vault password (rotate it when people leave) and the managed host itself.' : 'Result: <b>not safe</b>. ' + (!v ? 'Rotate the secret now, then vault the new one. ' : '') + (!n ? 'Add <code>no_log: true</code> to every task that handles it, and check old CI logs. ' : '') + 'Add a scanner (gitleaks) so the next mistake is caught before it is pushed.', parts: [{ type: 'text', label: good ? 'safe' : 'fix list', html: good ? '<p><span class="c-g">Vault + no_log + key outside the repo.</span></p>' : '<p><span class="c-r">Rotate, vault, no_log, scan.</span></p>' }] });
        return f;
      }
    }],
    examples: [
      { title: 'The secret committed in group_vars (the real incident)', html: `<p>A new teammate runs <code>git log -p</code> and finds <code>db_password: &lt;real value&gt;</code> in <code>group_vars/prod.yml</code> from last year. Correct order: (1) <b>rotate</b> the password on the database and in the app now; the old one must stop working, (2) put the new value in the vault, (3) remove the plain text from the current files, (4) optionally rewrite history with <code>git filter-repo</code> and tell everyone to re-clone, (5) add a secret scanner to CI. Step 1 is the only one that really closes the hole; steps 3 and 4 only stop new readers.</p>` },
      { title: 'Two environments, two keys', html: `<p>Developers hold only the <code>dev</code> vault password. CI holds <code>prod</code> as a protected secret that only the main branch can read. <code>ansible-playbook site.yml --vault-id dev@prompt --vault-id prod@/run/secrets/vault_prod</code> decrypts each file with the matching label. A developer without the prod key sees a clear "Decryption failed" if they try to run against prod.</p>` },
      { title: 'The leak you do not see', html: `<p>A debug task prints <code>"{{ lookup('file', '/etc/app/token') }}"</code>, or a failed task shows its arguments, or a <code>register</code> variable is dumped with <code>-vvv</code>. Encrypted at rest does not matter if it is printed. Add <code>no_log: true</code>, and review old CI logs for printed secrets: if one appears, treat it as leaked and rotate.</p>` },
      { title: 'What goes wrong with the password file', html: `<p>Committing <code>.vault_pass</code> next to the vault file defeats the lock. Put it outside the repo (<code>~/.config/ansible/</code>), <code>chmod 600</code>, and add its name to <code>.gitignore</code> anyway as a safety net. In <code>ansible.cfg</code> you may set <code>vault_password_file</code> to that path (a path, never the password itself).</p>` }
    ],
    deepDive: `<p>🟣 <b>What vault does.</b> It derives a key from your password with PBKDF2 (10,000 iterations of HMAC-SHA256 plus a random salt), then encrypts with AES-256 in CTR mode and authenticates with an HMAC. The format <code>$ANSIBLE_VAULT;1.1;AES256[;label]</code> is followed by hex. Because the key comes from a password, <b>a weak vault password is the weak point</b>: use a long random passphrase from a password manager. Encrypting a whole file hides variable <i>names</i> too (bad for review and grep); <code>encrypt_string</code> and the vars/vault split keep names visible.</p>
      <p>🟣 <b>Diffs and merges.</b> An encrypted file changes completely when re-encrypted (new random salt), so Git diffs are useless and merges conflict. Edit rarely, keep vault files small, one per environment, and review changes through <code>ansible-vault view</code>. Some teams add a Git <code>textconv</code> filter to show decrypted diffs locally.</p>
      <p>🟣 <b>no_log details.</b> <code>no_log</code> replaces the result with a "censored" message, so <code>register</code> still holds the data for later tasks, but it hides failure details too. Loops can leak through the <code>item</code> label: use <code>loop_control: {label: "{{ item.name }}"}</code> so the printed loop item does not include secret fields. Callback plugins and logging to file (<code>log_path</code>) record what is printed, so no_log protects those as well; <code>ANSIBLE_DEBUG</code> can still show module internals, so never use it in production.</p>
      <p>🟣 <b>Beyond static vault.</b> For dynamic secrets use lookups: <code>community.hashi_vault.hashi_vault</code>, <code>amazon.aws.aws_secret</code> (which uses the controller's AWS identity, so no stored key), Azure Key Vault, CyberArk. Secrets arrive at run time, are short-lived, and every read is audited. Also scan for leaks continuously (gitleaks, trufflehog, GitHub secret scanning with push protection), and tell people the policy: any secret that reached Git is rotated.</p>`,
    aiEra: `<p>🤖 <b>What AI changes.</b> Assistants help structure vars/vault files, write the <code>vault-id</code> commands and review playbooks for missing <code>no_log</code>. AI scanners also find secrets in repos and logs faster than a human.</p>
      <p><b>The big new risk:</b> pasting configuration into a chat or an AI coding tool can send secrets to a third party. Never paste vault passwords, decrypted vault files, tokens or private keys into a prompt. Redact first (replace values with <code>&lt;placeholder&gt;</code>), and use company-approved tools only. Agentic tools that read your repo may read a plaintext <code>.vault_pass</code> in the working folder, so keep it outside.</p>
      <p><b>Where AI goes wrong:</b> it writes example playbooks with <code>password: "SuperSecret123"</code> inline, puts <code>ansible_password</code> in inventory, forgets <code>no_log</code>, or suggests committing the vault password file "for convenience". Treat any literal secret in generated code as a bug and replace it with a vaulted variable.</p>`,
    problems: [P({
      t: 'A production password is in group_vars. Now what?', l: 'Hard', tags: ['vault', 'secrets', 'incident', 'no_log', 'rotation'], co: ['Cisco', 'Red Hat', 'Accenture'],
      s: `<p>A security scanner reports that <code>group_vars/prod.yml</code> in your Git repo contains <code>db_password</code> in plain text, committed 14 months ago, and the repo is readable by 60 people and a CI system. Write the response in the correct order. Provide the commands and playbook changes for: rotating the credential, moving the new value into an <code>ansible-vault</code> encrypted file with a vault ID, keeping the variable name visible, hiding it in task output, and preventing a repeat. Use only placeholders for secrets.</p>`,
      ex: `<p>Order: ${H.c('r', '1. rotate (old password dies)')} → ${H.c('y', '2. vault the new one')} → ${H.c('y', '3. no_log + scanner')} → ${H.c('g', '4. optional history cleanup')}. If you vault the <i>old</i> value and skip rotation, the scanner turns green and the real hole stays open.</p>`,
      bw: `<p>Deleting the line, committing "remove password" and closing the ticket. The value is still in 14 months of history, in every clone, fork and CI cache, and the password still works. Or vaulting the same password: encrypting a leaked secret does not un-leak it.</p>`,
      bc: `sed -i '/db_password/d' group_vars/prod.yml
git commit -am "remove password"     # still in history; the password still works`,
      q: ['What is the FIRST action when a real password was committed to Git?', ['Rotate it so the old value stops working', 'Encrypt the old value with ansible-vault', 'Delete the file and push', 'Add the file to .gitignore'], 0, 'Anyone who cloned the repo already has the old value. Only changing the credential at its source makes that value useless. Everything else limits future exposure.'],
      h: ['<p>Hint 1: assume the old password is known to attackers. What makes it useless?</p>', '<p>Hint 2: after rotation, store the NEW value as <code>vault_db_password</code> in an encrypted file; keep <code>db_password: "{{ vault_db_password }}"</code> in plain vars so the name stays visible.</p>', '<p>Hint 3: add <code>no_log: true</code> to tasks that use it, put the vault key outside the repo, and add a scanner and a check to CI. Then check old CI logs.</p>'],
      a: `<p>Treat the old password as public. (1) <b>Rotate</b>: create a new credential on the database (or via your secret manager), deploy it, and disable the old one. During the switch, update the app and Ansible together to avoid an outage. (2) <b>Vault the new value</b> with a <code>prod</code> vault ID: <code>encrypt_string --stdin-name vault_db_password</code> so the secret never touches shell history, and keep the key in the CI secret store and a password manager, not in the repo. (3) Keep <code>db_password: "{{ vault_db_password }}"</code> in plain <code>group_vars/prod/vars.yml</code> so reviewers see the names. (4) Add <code>no_log: true</code> to tasks that use it, and inspect old CI logs for printed secrets. (5) Remove the plaintext from history with <code>git filter-repo</code> if policy requires it, knowing that this only reduces future exposure. (6) Prevent a repeat: gitleaks or push protection in CI, a pre-commit hook, and a short written rule: a secret that reaches Git gets rotated.</p>`,
      code: SH(R`#!/usr/bin/env bash
set -euo pipefail
# 1) ROTATE FIRST (placeholder: use your database's or secret manager's real procedure)
#    e.g. create the new DB password, deploy it to the app, then disable the old one.

# 2) Vault the NEW value with a prod vault id (key lives outside the repo)
mkdir -p group_vars/prod
read -rsp "NEW db password: " NEWPW && echo
printf 'vault_db_password: %s\n' "$NEWPW" > /tmp/vault_plain.yml && unset NEWPW
cp /tmp/vault_plain.yml group_vars/prod/vault.yml && shred -u /tmp/vault_plain.yml
ansible-vault encrypt --vault-id prod@~/.config/ansible/vault_prod group_vars/prod/vault.yml

# 3) Names stay visible; values stay vaulted
cat > group_vars/prod/vars.yml <<'VARS'
db_password: "{{ vault_db_password }}"
VARS

# 4) Remove the plaintext line from the current file and commit
sed -i '/^db_password:/d' group_vars/prod.yml
git add group_vars && git commit -m "vault db password (value rotated; see ticket)"

# 5) Optional: purge history, then force-push and ask everyone to re-clone
#    git filter-repo --replace-text <(echo 'OLD_VALUE==>REMOVED')   # OLD_VALUE is your leaked, now-dead password

# 6) Prevent a repeat
gitleaks detect --no-banner`),
      alt: [Y(`# in every task that uses the secret
- name: Set the application database password
  community.mysql.mysql_user:
    name: "{{ db_user }}"
    password: "{{ db_password }}"
    state: present
  no_log: true`, 'no_log on the task')],
      cx: `<p>Minutes for the code change; the real work is coordinating the rotation without downtime, and following up in logs and caches.</p>`,
      f: ['How would you rotate the vault password itself? (<code>ansible-vault rekey</code>, update the CI secret, tell the team)', 'When would you stop using static vault files? (many secrets, frequent rotation, audit needs: use a secret manager lookup)']
    })]
  });

  // ───────────────────────── Topic 8: rolling updates, serial, block/rescue, tags ─────────────────────────
  topics.push({
    title: 'Rolling Updates: serial, block/rescue and Tags',
    analogy: `<p>A hotel is repainting 20 rooms. The wrong way: close the whole hotel and paint all rooms at once. If the paint turns out the wrong colour, 20 rooms are ruined and every guest is angry. The right way: paint <b>one</b> room, look at it, then do a few, then the rest. If room 1 looks wrong, stop and fix the plan; 19 rooms are untouched and guests still have beds. <code>serial</code> is "how many rooms at a time", <code>block/rescue</code> is "if the paint is wrong, put the old colour back", and <b>tags</b> are the labels on the work orders so you can do only "ceilings" tonight.</p>`,
    explain: `<p>🟢 <b>The default is "all at once" (within forks).</b> If you run a restart play on 20 web servers with the default settings, Ansible does each task on up to 5 hosts at a time and moves through all 20 quickly. For a config change that breaks nginx, that is 20 broken servers and a full outage. <b><code>serial</code></b> limits how many hosts finish the <b>whole play</b> before the next batch begins.</p>
      ${H.table(['Setting', 'Meaning', 'Example'], [
        ['<code>serial: 1</code>', 'one host at a time', 'safest, slowest'],
        ['<code>serial: "20%"</code>', 'a percentage of the total (at least 1)', '20 hosts → batches of 4'],
        ['<code>serial: [1, "25%", "100%"]</code>', 'a ramp: canary first, then bigger batches. The last entry repeats', '1, then 5, then all remaining'],
        ['<code>max_fail_percentage: 0</code>', 'abort the whole play if more than this % of a <b>batch</b> fails', 'the default behaviour is "any failure in a serial batch stops the run"'],
        ['<code>any_errors_fatal: true</code>', 'stop everything on the first failure anywhere', 'for tightly coupled clusters']
      ])}
      <p>🟢 <b>Failure is the point.</b> With <code>serial</code>, if the canary host fails its health check, Ansible stops before touching the other 19. That is the whole value of a rolling update: the blast radius of a bad change is one host.</p>
      <p>🔵 <b>A safe rolling update recipe.</b> For each batch: (1) take hosts out of the load balancer (<code>delegate_to</code> the balancer), (2) change them, (3) verify with a real health check (<code>ansible.builtin.uri</code> or <code>wait_for</code>), (4) put them back. Do the verification before moving on, never "it ran without errors, so it works".</p>
      <p>🔵 <b>block / rescue / always.</b> A <code>block</code> groups tasks; if any fails, the <code>rescue</code> tasks run (like <code>catch</code>), and <code>always</code> runs regardless (like <code>finally</code>). Important: if the rescue section completes, the host counts as <b>recovered</b>, not failed, and the play continues. To stop the rollout after rolling back, end the rescue with <code>ansible.builtin.fail</code>.</p>
      <p>🔵 <b>Tags.</b> Label tasks (<code>tags: [config]</code>) and run a slice: <code>--tags config</code>, <code>--skip-tags packages</code>, <code>--list-tags</code>. The special tag <code>always</code> runs unless skipped. Tags on blocks apply to every task inside. Good tags are few and meaningful (<code>packages</code>, <code>config</code>, <code>users</code>, <code>deploy</code>).</p>
      <p>🔵 <b>Other rollout tools.</b> <code>run_once: true</code> runs a task on the first host only (a database migration). <code>delegate_to</code> runs a task on another machine on behalf of the current host (talk to the load balancer). <code>throttle: 2</code> limits a single task's concurrency. <code>wait_for_connection</code> and <code>reboot</code> handle restarts. <code>--check --diff --limit canary</code> rehearses the change on one host.</p>`,
    clues: [
      '"Roll out a change without downtime" or "one server at a time" → <code>serial</code> (plus load balancer drain and health check)',
      '"Test on one canary first, then the rest" → <code>serial: [1, "25%", "100%"]</code>',
      '"If the new config fails, roll back automatically" → <code>block / rescue</code> that restores the backup, then <code>fail</code>',
      '"A bad change took down all 20 servers" → no serial, no health gate, no canary',
      '"Run only the config part, skip packages" → tags and <code>--tags</code> / <code>--skip-tags</code>',
      '"A task should run once for the whole group, not per host" → <code>run_once: true</code> (database migrations), often with <code>delegate_to</code>'
    ],
    code: [Y(`# rolling.yml - change the nginx template on 20 servers safely
- name: Roll out the new nginx config
  hosts: web
  become: true
  serial: [1, "25%", "100%"]      # canary, then a quarter at a time, then everything left
  max_fail_percentage: 0          # any failure in a batch aborts the whole rollout
  tasks:
    - name: Take the host out of the load balancer
      ansible.builtin.command: "/usr/local/bin/lb-ctl drain {{ inventory_hostname }}"
      delegate_to: lb1
      changed_when: true
      tags: [deploy]

    - name: Change the config, check it, roll back on failure
      block:
        - name: Deploy the config (keep a backup of the old one)
          ansible.builtin.template:
            src: site.conf.j2
            dest: /etc/nginx/conf.d/site.conf
            mode: "0644"
            backup: true
          register: cfg
          notify: Reload nginx

        - name: Reload nginx now so the test sees the new config
          ansible.builtin.meta: flush_handlers

        - name: Smoke test - the site must answer 200
          ansible.builtin.uri:
            url: "http://127.0.0.1:{{ nginx_port }}/healthz"
            status_code: 200
          register: health
          retries: 5
          delay: 3
          until: health.status == 200
      rescue:
        - name: Restore the previous config
          ansible.builtin.copy:
            src: "{{ cfg.backup_file }}"
            dest: /etc/nginx/conf.d/site.conf
            remote_src: true
            mode: "0644"
          when: cfg.backup_file is defined

        - name: Reload nginx with the old config
          ansible.builtin.service:
            name: nginx
            state: reloaded

        - name: Stop the rollout - this host failed the smoke test
          ansible.builtin.fail:
            msg: "New config failed on {{ inventory_hostname }}; rolled back and aborting"
      tags: [deploy, config]

    - name: Put the host back into the load balancer
      ansible.builtin.command: "/usr/local/bin/lb-ctl enable {{ inventory_hostname }}"
      delegate_to: lb1
      changed_when: true
      tags: [deploy]

  handlers:
    - name: Reload nginx
      ansible.builtin.service:
        name: nginx
        state: reloaded`, 'rolling.yml'),
      SH(R`# Rehearse on the canary only, as a dry run with file diffs
ansible-playbook -i inventory.ini rolling.yml --limit web19 --check --diff
# Run for real; stop reading the plan and start reading the recap
ansible-playbook -i inventory.ini rolling.yml
# Only the config tasks, skipping everything else
ansible-playbook -i inventory.ini rolling.yml --tags config
ansible-playbook -i inventory.ini rolling.yml --list-tags   # what labels exist?`, 'Run commands'),
      Y(`# A one-off job inside a rolling play: run a migration once, not on every host
- name: Deploy app v2
  hosts: app
  become: true
  serial: 2
  tasks:
    - name: Run the database migration on the first host only
      ansible.builtin.command: /opt/app/bin/migrate --apply
      run_once: true
      register: migrate
      changed_when: "'Applied' in migrate.stdout"
      failed_when: migrate.rc != 0`, 'run_once for migrations')],
    codeTitle: ['Canary, batches, smoke test, rollback', 'Run it in the safe order', 'run_once: do it one time only'],
    viz: [{
      title: 'serial batches and a failing canary',
      input: 'hosts=10; serial=1,25%,100%; bad=4; max_fail=0',
      inputLabel: 'hosts=N (<=30); serial=1,25%,100% ; bad=host number that fails (0 = none) ; max_fail=percent of a batch allowed to fail',
      gen: function (input) {
        var o = { hosts: '10', serial: '1,25%,100%', bad: '0', max_fail: '0' };
        String(input || '').split(';').forEach(function (s) { var m = s.trim().match(/^(\w+)\s*=\s*(.*)$/); if (m) o[m[1]] = m[2].trim(); });
        var n = parseInt(o.hosts, 10), bad = o.bad.split(/[ ,]+/).map(Number).filter(function (x) { return x > 0; }), mf = parseInt(o.max_fail, 10);
        if (isNaN(n) || n < 1 || n > 30) throw new Error('hosts must be between 1 and 30');
        if (isNaN(mf) || mf < 0 || mf > 100) throw new Error('max_fail must be 0 to 100');
        var plan = batchPlan(n, o.serial), names = [], hl = {}, f = [], i, start = 0, aborted = false;
        for (i = 1; i <= n; i++) names.push('h' + i);
        function arr(label) { return { type: 'array', label: label, values: names.slice(), hl: Object.assign({}, hl), showIdx: false }; }
        f.push({ narr: n + ' hosts, <code>serial: ' + H.esc(o.serial) + '</code> gives batch sizes <b>' + plan.join(', ') + '</b>. Percentages are of the total host count. Each batch must finish the <b>entire play</b> before the next one starts.', parts: [arr('hosts (untouched)'), { type: 'text', label: 'bad hosts', html: bad.length ? '<p>Hosts that will fail the smoke test: <b>' + bad.map(function (x) { return 'h' + x; }).join(', ') + '</b>. Allowed failures per batch: ' + mf + '%.</p>' : '<p>No host fails.</p>' }] });
        plan.forEach(function (size, bi) {
          if (aborted) return;
          for (i = start; i < start + size; i++) hl[i] = 'cur';
          f.push({ narr: 'Batch ' + (bi + 1) + ' (' + size + ' host' + (size > 1 ? 's' : '') + '): h' + (start + 1) + (size > 1 ? ' to h' + (start + size) : '') + '. Drain from the load balancer, change the config, reload, smoke test.', parts: [arr('batch ' + (bi + 1) + ' running')] });
          var failed = 0;
          for (i = start; i < start + size; i++) { if (bad.indexOf(i + 1) >= 0) { hl[i] = 'bad'; failed++; } else hl[i] = 'ok'; }
          var pct = failed * 100 / size;
          if (failed && pct > mf) {
            aborted = true;
            for (i = start + size; i < n; i++) hl[i] = 'done';
            f.push({ narr: failed + ' of ' + size + ' failed (' + Math.round(pct) + '%), which is more than max_fail_percentage (' + mf + '%). <b>The play aborts.</b> The failed host rolled back (rescue); the remaining ' + (n - start - size) + ' host(s) were <b>never touched</b> and still serve traffic on the old config. This is the whole point of a rolling update.', parts: [arr('rollout aborted after batch ' + (bi + 1))] });
          } else {
            f.push({ narr: failed ? failed + ' failed but ' + Math.round(pct) + '% is within the allowed ' + mf + '%, so the rollout continues.' : 'Batch ' + (bi + 1) + ' passed its smoke test. Hosts go back into the load balancer, then the next batch starts.', parts: [arr('batch ' + (bi + 1) + ' done')] });
          }
          start += size;
        });
        if (!aborted) f.push({ narr: 'All ' + n + ' hosts updated in ' + plan.length + ' batch(es). Compare with no <code>serial</code>: everything at once, and a bad change would hit all hosts together.', parts: [arr('rollout complete')] });
        return pad4(f, 'Done.');
      }
    }],
    examples: [
      { title: 'A template change rolled out with serial', html: `<p>The nginx template now adds <code>gzip on;</code>. On web1 (canary) the reload succeeds and the smoke test passes. Ansible moves to a batch of 5 hosts, then the remaining 14. If web1 had failed (a typo in the template), the other 19 would never have been touched, and the <code>rescue</code> restored the previous file so web1 serves traffic again. Compare the no-serial version: 20 broken servers.</p>` },
      { title: 'Percentages, rounded down', html: `<p>20 hosts: <code>serial: "10%"</code> → 2 per batch. <code>"25%"</code> → 5. 3 hosts with <code>"10%"</code> → 0.3 rounds down to 0, but Ansible uses at least 1. A list <code>[1, "25%", "100%"]</code> on 10 hosts gives batches 1, 2 and 7. The final entry repeats until all hosts are done.</p>` },
      { title: 'Rescue hides failure unless you re-fail', html: `<p>A rollout with <code>rescue</code> that restores the file and ends: the host is now <b>recovered</b>. The play continues to the next batch, and the recap shows <code>rescued=1</code> and <code>failed=0</code>. If you want the rollout to stop, end the rescue with <code>ansible.builtin.fail</code>, as in the example.</p>` },
      { title: 'Tags save a night', html: `<p>You only want to refresh certificates. Tag the cert tasks <code>tls</code> and run <code>--tags tls</code>: five seconds instead of ten minutes. Run <code>--list-tasks --tags tls</code> first to see exactly which tasks match. A task with no tags does not run under <code>--tags</code>, which surprises people who forgot to tag the new task.</p>` }
    ],
    deepDive: `<p>🟣 <b>How serial interacts with the rest.</b> Each batch runs the play from the first task to the last, including handlers flushed at the end of the play, before the next batch starts. <code>serial</code> applies to the play, not a single task; for one slow task use <code>throttle</code>. <code>max_fail_percentage</code> is judged per batch against its size: with <code>serial: 1</code> a single failure is 100%, so any value below 100 aborts. <code>ansible_play_batch</code> lists hosts in the current batch and <code>ansible_play_hosts_all</code> all of them, useful for logic such as "only the last batch does the cleanup".</p>
      <p>🟣 <b>Verify properly.</b> A task returning "ok" proves the file was written, not that the service works. Gate on user-visible health: <code>uri</code> against <code>/healthz</code> with <code>retries/until</code>, <code>wait_for port=... timeout=...</code>, a smoke test of a real request, and checks of key metrics after the load balancer re-adds the host. Keep a fast rollback path: <code>backup: true</code> files, or deploying immutable versions you can switch back (symlink to a release directory).</p>
      <p>🟣 <b>Errors and strategy.</b> <code>any_errors_fatal</code> aborts the play for <i>all</i> hosts on the first error, used when hosts form a cluster that must change together. <code>ignore_unreachable</code>, <code>ignore_errors</code> and <code>failed_when</code> let you treat expected failures as normal. <code>strategy: free</code> would break a rolling design, because it lets hosts race ahead of each other. <code>forks</code> does not override <code>serial</code>; both limits apply, the smaller wins.</p>
      <p>🟣 <b>Production reality.</b> Rolling updates only work if the system tolerates a mixed fleet, old and new versions side by side. Schema changes must be backwards compatible (expand, migrate, contract). Capacity must survive losing a batch (a batch of 25% leaves 75%). For immutable infrastructure (replace servers with Terraform or a new image) the rolling logic lives in the platform (auto scaling instance refresh, Kubernetes rollout). Ansible's <code>serial</code> shines for long-lived servers and VMs.</p>`,
    aiEra: `<p>🤖 <b>What AI changes.</b> Assistants can propose a rollout plan, write the drain, change, verify, enable sequence, and generate block/rescue skeletons. They are also good at reading a failed recap and finding which batch stopped and why.</p>
      <p><b>Use AI as a partner:</b> describe your fleet (count, load balancer, tolerance for lost capacity) and ask for a <code>serial</code> ramp, then check the maths yourself: batch size times host share must leave enough capacity. Ask it to list the ways the rollback can fail.</p>
      <p><b>Where AI goes wrong:</b> it forgets that a completed <code>rescue</code> counts as success (so the rollout continues), picks <code>serial: 50%</code> for a service that needs 60% capacity, omits the health check ("ran without error" is its idea of verified) and skips <code>delegate_to</code> for the load balancer. Rehearse with <code>--check --diff --limit</code> on a canary before any production run.</p>`,
    problems: [P({
      t: 'Roll out a template change safely across 20 servers', l: 'Hard', tags: ['serial', 'block/rescue', 'canary', 'rollout'], co: ['Netflix', 'Cisco', 'Thoughtworks'],
      s: `<p>The nginx site template changes (new <code>proxy_pass</code> target). You must roll it out to 20 web servers behind one load balancer (<code>lb1</code>) with no customer-visible outage and automatic rollback on a failing host. Requirements: canary of 1 host first, then 25%, then the rest; drain each host from the balancer before changing it and re-enable after; validate with a health check; roll back the file on failure and stop the rollout; give the command that rehearses it on the canary as a dry run.</p>`,
      ex: `<p>Batches for 20 hosts: ${H.c('b', '1')}, ${H.c('b', '5')}, ${H.c('b', '14')}. If the canary fails: file restored, host re-enabled on old config, ${H.c('r', 'play aborts')}, 19 hosts untouched.</p>`,
      bw: `<p>A plain play with a template task and a restart handler against <code>hosts: web</code>. If the template has a typo, all 20 nginx instances reload or restart on the bad config within seconds, and the site is down while someone figures out the rollback.</p>`,
      bcl: 'yaml', bc: `- hosts: web
  become: true
  tasks:
    - ansible.builtin.template: {src: site.conf.j2, dest: /etc/nginx/conf.d/site.conf}
      notify: Restart nginx
  handlers:
    - name: Restart nginx
      ansible.builtin.service: {name: nginx, state: restarted}`,
      q: ['A task in <code>rescue</code> restores the old file and nothing else. What does the play do next?', ['Treats the host as recovered and continues with the next batch', 'Aborts the play on that host and all others', 'Retries the block forever', 'Marks the host unreachable'], 0, 'A rescue that finishes successfully clears the failure. To stop the rollout after rolling back, end the rescue with ansible.builtin.fail.'],
      h: ['<p>Hint 1: <code>serial: [1, "25%", "100%"]</code> and <code>max_fail_percentage: 0</code>.</p>', '<p>Hint 2: drain and enable run on the balancer with <code>delegate_to: lb1</code>; make sure enable still happens or the host stays out of rotation.</p>', '<p>Hint 3: use <code>backup: true</code> and register the result; restore from <code>cfg.backup_file</code> in <code>rescue</code>; end with <code>fail</code>. Think about what happens to the drained host when the block fails: re-enable it in the rescue, after the rollback.</p>'],
      a: `<p>Wrap the risky part in a <code>block</code>: template with a backup, flush handlers so nginx reloads now, then a health check with retries. In <code>rescue</code>, put the backup file back, reload nginx on the old config, and then <code>fail</code> so the play aborts and the untouched hosts stay on the known-good version. The steps around the block drain the host before it and re-enable it after. On failure the host never reaches that last task, so the rescue re-enables it itself once the old config is back and healthy, which returns the balancer to full capacity, and only then fails. Serial ramp 1, 25%, 100% gives batch sizes 1, 5, 14 for 20 hosts; with <code>max_fail_percentage: 0</code>, the first failure stops everything. Rehearse with <code>--limit web19 --check --diff</code>.</p>`,
      code: Y(`- name: Roll out the new nginx proxy target
  hosts: web
  become: true
  serial: [1, "25%", "100%"]
  max_fail_percentage: 0
  tasks:
    - name: Drain this host from the load balancer
      ansible.builtin.command: "/usr/local/bin/lb-ctl drain {{ inventory_hostname }}"
      delegate_to: lb1
      changed_when: true

    - name: Deploy, verify, roll back on failure
      block:
        - name: Deploy the new config
          ansible.builtin.template:
            src: site.conf.j2
            dest: /etc/nginx/conf.d/site.conf
            mode: "0644"
            backup: true
          register: cfg
          notify: Reload nginx

        - name: Apply it now
          ansible.builtin.meta: flush_handlers

        - name: Health check through the new proxy target
          ansible.builtin.uri:
            url: "http://127.0.0.1/healthz"
            status_code: 200
          register: health
          retries: 5
          delay: 3
          until: health.status == 200
      rescue:
        - name: Restore the previous file
          ansible.builtin.copy:
            src: "{{ cfg.backup_file }}"
            dest: /etc/nginx/conf.d/site.conf
            remote_src: true
            mode: "0644"
          when: cfg.backup_file is defined
        - name: Reload on the old config
          ansible.builtin.service:
            name: nginx
            state: reloaded
        - name: Put the host back (it is healthy again on the old config), then stop the rollout
          ansible.builtin.command: "/usr/local/bin/lb-ctl enable {{ inventory_hostname }}"
          delegate_to: lb1
          changed_when: true
        - name: Abort
          ansible.builtin.fail:
            msg: "Rollout aborted on {{ inventory_hostname }}"

    - name: Re-enable the host in the load balancer
      ansible.builtin.command: "/usr/local/bin/lb-ctl enable {{ inventory_hostname }}"
      delegate_to: lb1
      changed_when: true

  handlers:
    - name: Reload nginx
      ansible.builtin.service:
        name: nginx
        state: reloaded`, 'rolling-template.yml'),
      alt: [SH(R`# 1) Rehearse on the canary: no changes, shows the diff
ansible-playbook -i inventory.ini rolling-template.yml --limit web19 --check --diff
# 2) See the plan: which hosts, which tasks
ansible-playbook -i inventory.ini rolling-template.yml --list-hosts --list-tasks
# 3) Roll out; watch the first batch's recap before the second starts
ansible-playbook -i inventory.ini rolling-template.yml`, 'Rehearse, plan, run')],
      cx: `<p>Total time is the sum of batch times: about 3 batches here instead of 1, plus health-check waits. In return, the maximum blast radius of a bad change is one host.</p>`,
      f: ['How would you also stop the rollout if error rates rise after a batch? (a metrics check task using <code>uri</code> against Prometheus, <code>failed_when</code> on the result)', 'Why does <code>serial: 50%</code> on 4 hosts need thought? (half the capacity is out at once)']
    })]
  });

  // ───────────────────────── Topic 9: Ansible vs Terraform ─────────────────────────
  function whichTool(item) {
    var t = String(item).toLowerCase();
    var rules = [
      ['firewall', 'Both', 'The cloud security group or firewall rule is infrastructure (Terraform). The host firewall (ufw, firewalld) is configuration (Ansible).'],
      ['database instance', 'Terraform', 'A managed database is a cloud resource with a lifecycle and a state: create, resize, destroy.'],
      ['load balancer', 'Terraform', 'A cloud load balancer is a resource you create and track in state.'],
      ['vpc', 'Terraform', 'Networks are cloud resources whose existence and relationships Terraform tracks.'],
      ['subnet', 'Terraform', 'Networks are cloud resources whose existence and relationships Terraform tracks.'],
      ['network', 'Terraform', 'Networks are cloud resources whose existence and relationships Terraform tracks.'],
      ['dns', 'Terraform', 'DNS records are provider resources; Terraform plans and tracks them.'],
      ['bucket', 'Terraform', 'Storage buckets are cloud resources.'],
      ['iam', 'Terraform', 'Cloud identities and policies are resources, best reviewed as a plan.'],
      ['vm', 'Terraform', 'Creating the machine itself is provisioning.'],
      ['server', 'Terraform', 'Creating the machine itself is provisioning (configuring it is Ansible).'],
      ['instance', 'Terraform', 'Creating the machine itself is provisioning.'],
      ['install', 'Ansible', 'Software inside a machine is configuration.'],
      ['package', 'Ansible', 'Software inside a machine is configuration.'],
      ['config', 'Ansible', 'Files and settings inside a machine are configuration.'],
      ['patch', 'Ansible', 'Updating existing machines in place, in rolling batches, is Ansible\'s home ground.'],
      ['user', 'Ansible', 'Accounts and keys on a host are configuration.'],
      ['ssh', 'Ansible', 'Daemon settings on a host are configuration.'],
      ['service', 'Ansible', 'Starting and enabling services on a host is configuration.'],
      ['deploy', 'Ansible', 'Pushing an application release onto hosts, with ordering and health checks.'],
      ['restart', 'Ansible', 'An operational action on existing hosts.'],
      ['cron', 'Ansible', 'Scheduled jobs on a host are configuration.']
    ];
    for (var i = 0; i < rules.length; i++) if (t.indexOf(rules[i][0]) >= 0) return { tool: rules[i][1], why: rules[i][2] };
    return { tool: 'Ask', why: 'No clear rule: ask "is this a cloud resource with a lifecycle (Terraform) or a state inside a machine (Ansible)?"' };
  }
  topics.push({
    title: 'Ansible vs Terraform: Build the House or Furnish It',
    analogy: `<p>Terraform is the <b>builder</b> who raises the house: walls, plumbing, a front door, according to blueprints, and who keeps a precise record of everything built. Ansible is the <b>interior team</b> who comes in afterwards: puts up the shelves, sets the thermostat, installs the kettle, and returns every month to fix what drifted. The builder wants to know what exists; the interior team wants to know what it looks like inside. You need both for a home you can live in, and arguing "builder or interior team?" misses that they work in sequence.</p>`,
    explain: `<p>🟢 <b>Two jobs, two tools.</b> <b>Provisioning</b> means creating the things that exist outside a machine: networks, VMs, load balancers, databases, DNS, IAM. <b>Configuration management</b> means making the inside of existing machines right: packages, files, users, services, application versions. Terraform (<b>CS/DevOps 9</b>) is built for the first; Ansible for the second.</p>
      ${H.table(['', 'Terraform', 'Ansible'], [
        ['Main job', 'create and change cloud resources', 'configure software and settings on machines'],
        ['Model', 'declarative: describe the end state, tool computes the plan', 'tasks in order, most modules declarative (idempotent), but you decide the sequence'],
        ['Remembers what exists?', 'yes, in a <b>state file</b> (the source of truth, store it remotely and lock it)', 'no state file; it looks at the machine every run (facts and module checks)'],
        ['Preview', '<code>terraform plan</code> is a precise, central feature', '<code>--check --diff</code> is useful but depends on each module'],
        ['Agent?', 'no, calls cloud APIs', 'no agent, uses SSH/WinRM (or APIs for network and cloud modules)'],
        ['Deletes things?', 'yes: removed from code → destroyed (that is the point)', 'only what you tell it (<code>state: absent</code>)'],
        ['Great at', 'repeatable environments, dependency graphs between resources', 'patching, rolling changes, one-off operations, hybrid and on-prem fleets']
      ])}
      <p>🟢 <b>A simple rule.</b> If the thing has a <b>lifecycle of its own in a cloud console</b> (you could see it in a list of resources and delete it), it is Terraform's. If it is a <b>state inside a machine</b> (a file, a package, a service), it is Ansible's. Overlap exists (both can create an EC2 instance), but doing it the other way round gets awkward quickly.</p>
      <p>🔵 <b>How they work together.</b> Terraform creates VMs and tags them (<code>Role=web</code>, <code>Environment=prod</code>). Ansible's dynamic inventory (<code>amazon.aws.aws_ec2</code>) finds the machines by tag and configures them. Terraform outputs (IP addresses, names) can feed an inventory file. The handoff is data, not code: do not embed Ansible commands inside Terraform with <code>local-exec</code> provisioners, because they run only at creation, hide failures and are hard to re-run. Run them as separate pipeline stages.</p>
      <p>🔵 <b>Immutable vs mutable.</b> With containers or golden images (Packer builds an image, Terraform launches it) there is little left to configure at run time: the "configuration" is baked in. Ansible is still used to <i>build</i> those images (as a Packer provisioner) and for long-lived servers that are patched in place. Kubernetes shifts most application configuration into manifests; Ansible then manages the nodes underneath or the cluster bootstrap.</p>
      <p>🔵 <b>Decision questions.</b> Is it a cloud resource? → Terraform. Is it inside a machine? → Ansible. Do you need a plan and a state record? → Terraform. Do you need ordered, rolling operations on running hosts? → Ansible. Do you run mostly containers on managed services? → Terraform plus container tooling, with little Ansible.</p>`,
    clues: [
      '"Create the network, VMs and load balancer" → Terraform (infrastructure as code with state)',
      '"Install packages and configure services on existing servers" → Ansible',
      '"Patch 200 servers in rolling batches" → Ansible with <code>serial</code>',
      '"Which tool for what?" or "Terraform vs Ansible" → provisioning vs configuration, used in sequence',
      '"The machines already exist; we need to find them automatically" → dynamic inventory driven by tags',
      '"Drift: someone changed a server by hand" → Ansible re-run (<code>--check</code> to report drift); for cloud resource drift, <code>terraform plan</code>'
    ],
    code: [SH(R`#!/usr/bin/env bash
# The handoff in a pipeline: two stages, data passes between them.
# Stage 1 - provision (Terraform): creates machines and tags them; see CS/DevOps 9 for the Terraform side.
#   terraform init && terraform apply -auto-approve
#   terraform output -json web_ips > web_ips.json

# Stage 2 - configure (Ansible): no cloud account needed for this lab, containers stand in for the VMs
set -euo pipefail
for n in web1 web2; do docker run -d --name "$n" debian:12 sleep infinity; done   # stand-in for "terraform apply"

ansible-playbook -i inventory.ini site.yml --check --diff    # preview the configuration
ansible-playbook -i inventory.ini site.yml                   # configure
ansible-playbook -i inventory.ini site.yml                   # drift check: should show changed=0

docker rm -f web1 web2                                       # stand-in for "terraform destroy"`, 'Two stages, one handoff (lab uses containers)'),
      Y(`# inventory.aws_ec2.yml - how Ansible finds Terraform's machines by tag (needs an AWS account, so read it, do not run it in the free lab)
plugin: amazon.aws.aws_ec2
regions:
  - us-east-1
filters:
  tag:Environment: prod
  instance-state-name: running
keyed_groups:
  - key: tags.Role
    prefix: role              # creates groups such as role_web and role_db
hostnames:
  - private-ip-address
compose:
  ansible_host: private_ip_address`, 'Dynamic inventory plugin'),
      Y(`# site.yml - targets the group that the inventory plugin built from the Role tag
- name: Configure web servers created by Terraform
  hosts: role_web
  become: true
  roles:
    - nginx`, 'Configure what Terraform created')],
    codeTitle: ['Provision, then configure', 'Find machines by tag', 'Configure by group'],
    viz: [{
      title: 'Terraform or Ansible? Sort the jobs',
      input: 'create VPC; create VM; install nginx; open firewall rule; patch OS monthly; create database instance; configure ssh; deploy app release',
      inputLabel: 'jobs separated by ;',
      gen: function (input) {
        var jobs = String(input || '').split(';').map(function (s) { return s.trim(); }).filter(Boolean);
        if (!jobs.length) throw new Error('List jobs separated by ;  e.g. create VM; install nginx');
        if (jobs.length > 12) throw new Error('Use at most 12 jobs');
        var rows = [], f = [], tf = 0, an = 0;
        f.push({ narr: 'Rule of thumb: a thing with its own <b>lifecycle in a cloud console</b> is Terraform\'s; a <b>state inside a machine</b> is Ansible\'s. Let\'s sort your jobs.', parts: [{ type: 'table', label: 'job → tool', columns: ['job', 'tool', 'why'], rows: [['(none yet)', '', '']] }] });
        jobs.forEach(function (j) {
          var r = whichTool(j); if (r.tool === 'Terraform') tf++; else if (r.tool === 'Ansible') an++;
          rows.push([j, r.tool, r.why]);
          var hl = {}; hl[rows.length - 1] = r.tool === 'Terraform' ? 'win' : r.tool === 'Ansible' ? 'ok' : 'cur';
          f.push({ narr: '<b>' + H.esc(j) + '</b> → <b>' + r.tool + '</b>. ' + H.esc(r.why), parts: [{ type: 'table', label: 'job → tool', columns: ['job', 'tool', 'why'], rows: rows.map(function (x) { return x.slice(); }), hl: hl }] });
        });
        f.push({ narr: 'Summary: <b>' + tf + '</b> job(s) for Terraform, <b>' + an + '</b> for Ansible' + (jobs.length - tf - an ? ', ' + (jobs.length - tf - an) + ' mixed or unclear' : '') + '. In a pipeline Terraform runs first (provision, tag), then Ansible (find by tag, configure), and Ansible runs again later for patching and drift.', parts: [{ type: 'graph', label: 'the handoff', height: 40, nodes: [box('tf', 'Terraform apply', 14, 20, 22), box('vm', 'VMs tagged Role=web', 50, 20, 24), box('an', 'Ansible (inventory by tag)', 86, 20, 26)], edges: [['tf', 'vm', 'creates'], ['vm', 'an', 'found by tag']], hl: { tf: 'win', an: 'ok' } }] });
        return f;
      }
    }],
    examples: [
      { title: 'New environment, start to finish', html: `<p>Day 0: Terraform creates a VPC, two subnets, three VMs (tagged <code>Role=web</code>), a load balancer and a DNS name. Day 0 also: Ansible's inventory plugin finds the three VMs; a playbook installs nginx and deploys the app. Day 30: Ansible patches the VMs in rolling batches. Day 90: you need a fourth VM: change <code>count = 4</code> in Terraform, apply, run Ansible: the new machine is configured exactly like the others.</p>` },
      { title: 'The anti-pattern: local-exec', html: `<p>A Terraform resource with <code>provisioner "local-exec" { command = "ansible-playbook ..." }</code> runs once at creation. If the playbook fails, Terraform marks the resource tainted, and you cannot easily re-run just the configuration. Keep Terraform and Ansible as separate pipeline stages, and pass data (IPs, tags) between them.</p>` },
      { title: 'Which one when a server drifts?', html: `<p>Someone edits <code>sshd_config</code> by hand. Terraform cannot see inside the machine, so <code>terraform plan</code> shows nothing. A scheduled <code>ansible-playbook --check --diff</code> run reports the drifted file, and a normal run fixes it. In contrast, someone deletes a security group in the console: Terraform's next <code>plan</code> notices and offers to recreate it.</p>` },
      { title: 'When you may need only one', html: `<p>All-managed services (a serverless app, managed database, managed Kubernetes with Helm): almost entirely Terraform. A small fleet of on-prem servers with no cloud API: almost entirely Ansible. Plain VMs in the cloud: both. Choose by what you manage, not by fashion.</p>` }
    ],
    deepDive: `<p>🟣 <b>State vs facts.</b> Terraform's state file is a database of what it created; losing or corrupting it is a serious incident (hence remote backends with locking and versioning). Ansible has no equivalent, which makes it simple to start and awkward for deletion: a host removed from the inventory is simply not touched, while resources removed from Terraform code are destroyed. Because Ansible has no memory, "remove the old package" must be an explicit <code>state: absent</code> task.</p>
      <p>🟣 <b>Overlap and trade-offs.</b> Ansible has cloud modules (<code>amazon.aws.ec2_instance</code>, <code>azure.azcollection</code>), and Terraform has provisioners and a <code>cloud-init</code> / user-data hook. For a one-off lab either works; at scale you want a plan, a state and dependency ordering for infrastructure (Terraform), and idempotent, sequenced operations for hosts (Ansible). OpenTofu is an open-source fork of Terraform with a compatible workflow; Pulumi, CloudFormation and Bicep occupy the provisioning side; Puppet, Chef and Salt compete with Ansible in configuration management, mainly with an agent and a pull model.</p>
      <p>🟣 <b>Pipelines.</b> Typical CI/CD: pull request → <code>terraform plan</code> and <code>ansible-lint</code> posted as comments → approval → <code>terraform apply</code> → wait for hosts to be reachable (<code>wait_for_connection</code>) → <code>ansible-playbook</code> with <code>--check</code> in staging first. Credentials: Terraform and Ansible runners use short-lived federated identities (OIDC) instead of stored cloud keys; Ansible vault keys come from the CI secret store.</p>
      <p>🟣 <b>Immutable infrastructure.</b> In mature container/Kubernetes shops, patching in place is replaced by rebuilding images and replacing instances; Ansible's role shrinks to image building (Packer + Ansible), node bootstrap, network devices and legacy servers. Know both worlds: interviews often probe whether you can explain why a given team chose configuration management, immutable images, or a mix.</p>`,
    aiEra: `<p>🤖 <b>What AI changes.</b> Assistants can draft both Terraform and Ansible, and can port between them. The hard decision, "should this be Terraform or Ansible?", is still a design judgement, and assistants often blur the line, offering to "do everything in Ansible" or "do everything in Terraform with provisioners".</p>
      <p><b>Use AI as a partner:</b> describe your environment and ask for a stage-by-stage pipeline with the handoff data, then check the order, the ownership of each resource, and which stage re-runs for patching.</p>
      <p><b>Where AI goes wrong:</b> it uses <code>local-exec</code> to call Ansible, creates the same resource in both tools (two sources of truth that fight), generates cloud-account-wide admin credentials in examples, and forgets that Terraform will destroy what is removed from code. Review the plan and never let an agent run <code>apply</code> or a real playbook without a human reading the plan and the check-mode diff.</p>`,
    problems: [P({
      t: 'Plan the pipeline: which tool does which job?', l: 'Medium', tags: ['terraform', 'ansible', 'dynamic inventory', 'pipeline'], co: ['Thoughtworks', 'AWS', 'Accenture'],
      s: `<p>A team wants a new staging environment in a cloud account: one network, three web VMs, one load balancer, a managed database, nginx configured on the VMs, a monthly OS patch, and a deploy of app releases every week. Assign each job to Terraform or Ansible, explain the order of stages, say how Ansible learns which machines exist, and write the Ansible side (inventory by tag and a play) plus the command sequence for the pipeline. The lab version uses containers instead of cloud VMs.</p>`,
      ex: `<p>${H.c('b', 'Terraform')}: network, VMs (tag Role=web), load balancer, database. ${H.c('g', 'Ansible')}: nginx, monthly patch (rolling), weekly app deploy. Handoff: ${H.c('y', 'tags')} found by the inventory plugin.</p>`,
      bw: `<p>Doing everything in one Terraform file with <code>remote-exec</code> and <code>local-exec</code> provisioners to install nginx and deploy. It works on the first apply; patching and deploying later means re-creating machines or hand-run scripts, and a failed provisioner leaves tainted resources.</p>`,
      bc: `# Terraform with provisioners doing configuration work (anti-pattern)
# provisioner "remote-exec" { inline = ["apt-get update", "apt-get install -y nginx"] }
echo "runs only at creation; no way to re-apply or patch later"`,
      q: ['Who should remember which machines exist in the cloud?', ['Terraform state for what it created; Ansible finds machines by tag at run time', 'Ansible keeps a state file of every host', 'Nobody: use a spreadsheet', 'The load balancer'], 0, 'Terraform tracks the resources it created in its state. Ansible has no state and discovers hosts through its inventory, often a dynamic plugin keyed on tags.'],
      h: ['<p>Hint 1: split by "cloud resource" vs "inside a machine".</p>', '<p>Hint 2: Terraform must tag the VMs so Ansible can group them (<code>Role=web</code>).</p>', '<p>Hint 3: monthly patching and weekly deploys are repeated operations on existing hosts: Ansible with <code>serial</code>, not a Terraform rebuild.</p>'],
      a: `<p>Terraform owns the network, VMs, load balancer and database, and tags the VMs. Ansible owns what is inside the VMs: nginx, the patch playbook (rolling, with a health gate) and the app deploy playbook. Pipeline: (1) pull request: <code>terraform plan</code> and <code>ansible-lint</code>; (2) approval; (3) <code>terraform apply</code>; (4) wait until the hosts accept SSH; (5) Ansible reads the inventory plugin (groups from tags), runs <code>--check --diff</code> in staging, then the real run. Later runs of stages 5 (patch, deploy) do not touch Terraform at all. The lab replaces the cloud with throwaway containers listed in a static inventory but keeps the same playbooks, which shows that the Ansible side does not care how the hosts were born.</p>`,
      code: Y(`# site.yml - the Ansible side; identical in the cloud and in the container lab
- name: Configure the web tier
  hosts: role_web              # group built from the Role=web tag (cloud) or defined in the lab inventory
  become: true
  serial: "34%"                # about one VM at a time for three hosts
  roles:
    - nginx

- name: Monthly OS patch (run separately, on a schedule)
  hosts: role_web
  become: true
  serial: 1
  tasks:
    - name: Upgrade packages
      ansible.builtin.apt:
        upgrade: dist
        update_cache: true
      tags: [patch, never]      # the "never" tag means: runs only when you ask with --tags patch`, 'site.yml'),
      alt: [SH(R`# Pipeline stages (cloud version; commands only, nothing is run in the free lab)
terraform plan -out=tfplan                        # review the plan
terraform apply tfplan                            # provision and tag
ansible-inventory -i inventory.aws_ec2.yml --graph   # do the tags produce the groups we expect?
ansible-playbook -i inventory.aws_ec2.yml site.yml --check --diff
ansible-playbook -i inventory.aws_ec2.yml site.yml
# monthly
ansible-playbook -i inventory.aws_ec2.yml site.yml --tags patch`, 'Pipeline commands'),
        INI(`# inventory.ini - the lab stand-in: containers named like the VMs, in the group the playbook expects
[role_web]
web1
web2
web3

[all:vars]
ansible_connection=community.docker.docker
ansible_python_interpreter=/usr/bin/python3`, 'Lab inventory')],
      cx: `<p>Terraform plan/apply scales with resources; Ansible scales with hosts divided by forks and batches. Splitting the stages keeps each re-runnable and independently reviewable.</p>`,
      f: ['What changes if the web tier becomes an autoscaling group with an image built by Packer? (patching becomes a rebuild; Ansible moves into image build)', 'How do you stop two tools fighting over the same resource? (one owner per resource; document it)']
    })]
  });

  // ═════════════════════════ Practice problems ═════════════════════════
  // ---- Easy ----
  practice.push(P({
    t: 'Changed or ok? Model an idempotent package task', l: 'Easy', tags: ['idempotency', 'check mode', 'python'], co: ['Red Hat', 'Wipro', 'Infosys'], lang: 'python', c: PYC,
    s: `<p>Ansible's <code>package</code>-style modules look at the current state and decide whether to act. Write <code>task_status(state, installed, outdated)</code> that returns what a run would report: <code>"ok"</code> (nothing to do) or <code>"changed"</code> (it would act). Rules: <code>state</code> is <code>"present"</code> (needs the package installed), <code>"absent"</code> (needs it removed) or <code>"latest"</code> (needs it installed <b>and</b> up to date; <code>outdated</code> tells you whether a newer version exists). Any other state returns <code>"error"</code>. Check mode must predict the same answer without changing anything.</p>`,
    ex: `<p><code>task_status("present", True, True)</code> → ${H.c('g', '"ok"')}: present only needs the package to exist, an older version is fine. <code>task_status("latest", True, True)</code> → ${H.c('y', '"changed"')}: it would upgrade. <code>task_status("absent", False, False)</code> → ${H.c('g', '"ok"')}: already gone.</p>`,
    bw: `<p>Always returning <code>"changed"</code> because "the command runs". That is what <code>shell: apt-get install -y nginx</code> effectively does: it cannot tell whether work was needed, so the recap is useless.</p>`,
    bc: `def task_status(state, installed, outdated):
    return "changed"      # what a shell task reports, whatever the machine looks like`,
    q: ['<code>state: present</code> on a host that has an older version installed. What does the apt module report?', ['ok: present means installed, not newest', 'changed: it upgrades', 'failed: version mismatch', 'skipped'], 0, 'present only requires that the package exists. To upgrade you must ask for state: latest.'],
    h: ['<p>Hint 1: compare wanted state with current state, per rule.</p>', '<p>Hint 2: for <code>latest</code>, there are two reasons to act: not installed, or outdated.</p>', '<p>Hint 3: check an unknown state first or last, and return "error" instead of guessing.</p>'],
    a: `<p>Each state is a small yes/no question about the machine. <code>present</code> acts only if the package is missing. <code>absent</code> acts only if it is installed. <code>latest</code> acts if it is missing or outdated. Anything else is an error. Check mode uses exactly this comparison but skips the action, which is why a module that supports check mode can predict <code>changed</code> honestly.</p>`,
    code: PY(`def task_status(state, installed, outdated):
    """Return "ok" or "changed" like an idempotent package module; "error" for an unknown state."""
    if state == "present":
        return "ok" if installed else "changed"
    if state == "absent":
        return "changed" if installed else "ok"
    if state == "latest":
        return "changed" if (not installed or outdated) else "ok"
    return "error"`),
    cx: `<p>O(1): three comparisons.</p>`,
    f: ['Why does <code>state: latest</code> make a nightly run slower and riskier than <code>present</code>? (it upgrades whenever a new version appears)', 'How would you model <code>state: absent</code> for a package with a dependency? (the module decides, not Ansible)'],
    tests: { sig: 'string bool bool -> string', fn: 'taskStatus', cases: [
      [['present', true, false], 'ok'], [['present', false, false], 'changed'], [['present', true, true], 'ok'], [['absent', true, false], 'changed'],
      [['absent', false, false], 'ok'], [['latest', true, true], 'changed'], [['latest', true, false], 'ok'], [['latest', false, false], 'changed'],
      [['absent', true, true], 'changed'], [['started', true, false], 'error'], [['latest', false, true], 'changed']
    ] }
  }));

  practice.push(P({
    t: 'Ad-hoc commands for a morning health check', l: 'Easy', tags: ['ad-hoc', 'inventory', 'patterns'], co: ['Accenture', 'Cognizant', 'Infosys'],
    s: `<p>Using the inventory from the first lesson (groups <code>web</code>, <code>db</code>, <code>prod</code>), write the ad-hoc commands for: (1) check that every host is reachable, (2) show uptime on the web servers only, (3) show free disk space on production hosts except the database, (4) show the OS release of one host, <code>web1</code>, using facts, (5) install <code>htop</code> on the db group as root. Say which of these change anything.</p>`,
    ex: `<p>(1) prints ${H.c('g', 'pong')} per host. (5) is the only one that changes anything: ${H.c('y', 'changed')} the first time, ${H.c('g', 'ok')} afterwards.</p>`,
    bw: `<p>A bash loop: <code>for h in $(cat hosts); do ssh $h uptime; done</code>. Serial, one slow host blocks the rest, no grouping, no tidy results, and no safe way to express "except the database".</p>`,
    bc: `for h in $(cat hosts.txt); do ssh "$h" uptime; done`,
    q: ['What does <code>ansible all -m ansible.builtin.ping</code> test?', ['Login plus a working Python on each host', 'ICMP reachability', 'Disk space', 'Whether nginx runs'], 0, 'It is a login and Python test, which is exactly what every later module needs.'],
    h: ['<p>Hint 1: <code>ansible PATTERN -m MODULE -a "ARGS"</code>; add <code>-i inventory.ini</code> if there is no ansible.cfg.</p>', '<p>Hint 2: "prod except db" is <code>prod:!db</code>; quote it for the shell.</p>', '<p>Hint 3: packages need <code>-b</code> (become) and the <code>apt</code> module with <code>state=present</code>.</p>'],
    a: `<p>Patterns select hosts, modules do the work. Use the <code>command</code> module for read-only programs and the <code>setup</code> module with a filter for facts. Only the <code>apt</code> command writes anything, and because it uses <code>state=present</code> it is idempotent, so you can repeat it safely. Use <code>--list-hosts</code> first if you are unsure which hosts a pattern selects.</p>`,
    code: SH(R`ansible all -i inventory.ini -m ansible.builtin.ping                                    # 1: login + Python check
ansible web -i inventory.ini -m ansible.builtin.command -a "uptime"                          # 2: web only
ansible 'prod:!db' -i inventory.ini -m ansible.builtin.command -a "df -h /"                  # 3: prod except db
ansible web1 -i inventory.ini -m ansible.builtin.setup -a "filter=ansible_distribution*"     # 4: facts
ansible db -i inventory.ini -b -m ansible.builtin.apt -a "name=htop state=present"           # 5: the only change`),
    cx: `<p>One command each; hosts run in parallel, 5 at a time by default.</p>`,
    f: ['Which flag raises the parallelism? (<code>-f</code> / <code>forks</code>)', 'When should an ad-hoc change become a playbook? (when you will repeat it or someone else should review it)']
  }));

  practice.push(P({
    t: 'Fix the broken playbook (YAML and Jinja quoting)', l: 'Easy', tags: ['yaml', 'jinja2', 'debugging', 'syntax'], co: ['Cisco', 'IBM', 'Capgemini'],
    s: `<p>This playbook fails with "could not find expected ':'" and then with "'nginx_port' is undefined". Find all the problems and fix them. Show the command that catches such mistakes without running anything.</p>
      <pre>- hosts: web
  become: true
  vars
    nginx_port: 8080
  tasks:
    - name: Show the port
      ansible.builtin.debug:
        msg: {{ nginx_port }}

    - name: Write the config
      ansible.builtin.copy:
        dest: /tmp/lab/nginx.conf
        content: "listen {{ nginx_prot }};"</pre>`,
    ex: `<p>Problems: ${H.c('r', 'vars')} has no colon, ${H.c('r', 'msg: {{ ... }}')} is not quoted so YAML reads a dictionary, and ${H.c('r', 'nginx_prot')} is a typo for nginx_port. After the fixes the file prints 8080 and writes <code>listen 8080;</code>.</p>`,
    bw: `<p>Fixing one error at a time by running the playbook against real hosts and waiting for the next failure. Each round trip costs time and might partially change servers.</p>`,
    q: ['Why must <code>msg: "{{ nginx_port }}"</code> be quoted?', ['A value starting with { is read by YAML as a mapping', 'Quotes make it faster', 'Jinja requires quotes in every file', 'Quoted values are encrypted'], 0, 'YAML treats a leading { as the start of a dictionary. Quoting makes it a string that Jinja then renders.'],
    h: ['<p>Hint 1: run the syntax check first; it reports line numbers.</p>', '<p>Hint 2: every key needs a colon; every value starting with <code>{{</code> needs quotes.</p>', '<p>Hint 3: undefined-variable errors are often typos: search for the variable name.</p>'],
    a: `<p>Three mistakes. A play keyword without a colon (<code>vars:</code>). An unquoted template as a YAML value. A misspelled variable name that Ansible correctly refuses to render as empty. The tool for catching syntax errors early is <code>ansible-playbook --syntax-check</code>; <code>ansible-lint</code> catches style and risk problems; <code>--check</code> catches module-level problems without changing anything.</p>`,
    code: Y(`- name: Show and write the port
  hosts: web
  become: true
  vars:
    nginx_port: 8080
  tasks:
    - name: Show the port
      ansible.builtin.debug:
        msg: "{{ nginx_port }}"

    - name: Write the config
      ansible.builtin.copy:
        dest: /tmp/lab/nginx.conf
        content: "listen {{ nginx_port }};"`, 'fixed.yml'),
    alt: [SH(R`ansible-playbook -i inventory.ini fixed.yml --syntax-check   # parse only, no connection
ansible-lint fixed.yml                                       # style and risk rules
ansible-playbook -i inventory.ini fixed.yml --check --diff   # dry run`, 'Catch it early')],
    cx: `<p>Syntax check: instant. Lint: a second or two.</p>`,
    f: ['Which editor setting helps with YAML? (a YAML language server plus the Ansible extension for schema hints)', 'What does <code>default(\'x\')</code> do to an undefined variable error? (hides it: use only on purpose)']
  }));

  practice.push(P({
    t: 'One playbook, two operating systems (facts)', l: 'Easy', tags: ['facts', 'when', 'os_family', 'package'], co: ['Red Hat', 'Oracle', 'Wipro'],
    s: `<p>Your fleet has Debian/Ubuntu and RHEL/Rocky hosts. Write one play that installs the Apache web server (package <code>apache2</code> on Debian, <code>httpd</code> on RedHat), starts and enables it under the right service name, and prints which OS it found. Use facts, not separate playbooks. Use only FQCN modules.</p>`,
    ex: `<p>On an Ubuntu host the play installs ${H.c('g', 'apache2')}; on Rocky it installs ${H.c('g', 'httpd')}. Same file, same run, 100 hosts of both kinds.</p>`,
    bw: `<p>Two copies of the playbook (<code>site-debian.yml</code>, <code>site-redhat.yml</code>) kept in sync by hand. A fix applied to one copy is forgotten in the other.</p>`,
    q: ['Which fact tells you "Debian or RedHat family"?', ['<code>ansible_facts[\'os_family\']</code>', '<code>inventory_hostname</code>', '<code>ansible_host</code>', '<code>groups</code>'], 0, 'os_family groups related distributions: Debian covers Ubuntu, RedHat covers RHEL, Rocky and Alma.'],
    h: ['<p>Hint 1: a map from os_family to package name in <code>vars</code>.</p>', '<p>Hint 2: <code>ansible.builtin.package</code> works on both families if the name is right; or use <code>apt</code>/<code>dnf</code> with <code>when</code>.</p>', '<p>Hint 3: the service name is also different, so put it in the same map.</p>'],
    a: `<p>Facts describe each host; a dictionary maps the family to names, so the tasks stay identical. Index the map with the fact: <code>apache[ansible_facts['os_family']]</code>. The generic <code>package</code> module delegates to apt or dnf, so there is one install task. An unknown family fails clearly because the key is missing, which is better than silently doing nothing.</p>`,
    code: Y(`- name: Apache on Debian and RedHat families
  hosts: web
  become: true
  gather_facts: true
  vars:
    apache:
      Debian: { package: apache2, service: apache2 }
      RedHat: { package: httpd, service: httpd }
  tasks:
    - name: Show the OS found
      ansible.builtin.debug:
        msg: "{{ ansible_facts['distribution'] }} {{ ansible_facts['distribution_version'] }} ({{ ansible_facts['os_family'] }})"

    - name: Install Apache
      ansible.builtin.package:
        name: "{{ apache[ansible_facts['os_family']].package }}"
        state: present

    - name: Start and enable Apache
      ansible.builtin.service:
        name: "{{ apache[ansible_facts['os_family']].service }}"
        state: started
        enabled: true`, 'apache.yml'),
    cx: `<p>Fact gathering adds a second or two per host; turn it off for plays that do not need facts.</p>`,
    f: ['How would you share this map across roles? (a role vars file per OS family, loaded with <code>include_vars</code>)', 'What if the fleet includes Windows? (a different module family, <code>ansible.windows</code>, and WinRM or SSH)']
  }));

  // ---- Medium ----
  practice.push(P({
    t: 'Plan the rolling batches (serial maths)', l: 'Medium', tags: ['serial', 'rolling update', 'python'], co: ['Netflix', 'Amazon', 'Thoughtworks'], lang: 'python', c: PYC,
    s: `<p>Write <code>serial_batches(n, serial)</code> that returns the list of batch sizes Ansible would use for <code>n</code> hosts. <code>serial</code> is a comma-separated string of entries; each entry is a count (<code>"2"</code>) or a percentage of the <b>total</b> host count (<code>"25%"</code>). A percentage is rounded <b>down</b> but is at least 1. Entries are used in order; the <b>last entry repeats</b> until all hosts are covered. The final batch is smaller if hosts run out. Use integer arithmetic (<code>percent * n // 100</code>).</p>`,
    ex: `<p><code>serial_batches(10, "1,25%,100%")</code> → ${H.c('g', '[1, 2, 7]')}: 1 canary; 25% of 10 is 2.5 → 2; then 100% would be 10 but only 7 remain. <code>serial_batches(5, "2")</code> → ${H.c('g', '[2, 2, 1]')}.</p>`,
    bw: `<p>Computing every percentage against the <b>remaining</b> hosts, or letting the last batch exceed the hosts left. The first gives wrong batch sizes (25% of 9 remaining is not 25% of 10); the second invents hosts.</p>`,
    bc: `def serial_batches(n, serial):
    size = int(serial.split(",")[0])      # only the first entry, no percentages, no repeat
    return [size] * (n // size)           # drops the remainder host(s)`,
    q: ['20 hosts and <code>serial: [1, "25%", "100%"]</code>. What are the batch sizes?', ['1, 5, 14', '1, 5, 20', '5, 5, 5, 5', '1, 4, 15'], 0, '1 canary; 25% of 20 = 5; "100%" asks for 20 but only 14 remain.'],
    h: ['<p>Hint 1: percentages are of the total host count <code>n</code>, not of what remains.</p>', '<p>Hint 2: loop while hosts remain; pick entry <code>min(i, last)</code>; size = max(size, 1); then cap at the remaining hosts.</p>', '<p>Hint 3: integer maths: <code>int(p) * n // 100</code>. Edge cases: <code>n = 0</code> gives <code>[]</code>; <code>"10%"</code> of 3 hosts → 0 → bumped to 1.</p>'],
    a: `<p>Parse the entries once. Keep a counter of remaining hosts and a position in the list of entries. For each batch compute the size: a percentage entry is <code>pct * n // 100</code>, a count entry is the number. Force at least 1 (a batch of 0 would never finish), cap by the remaining hosts, record it, and move to the next entry, staying on the last one when the list ends. This is the same arithmetic Ansible uses to build its batches, so you can predict a rollout and check that a bad canary only risks the first batch.</p>`,
    code: PY(`def serial_batches(n, serial):
    """Batch sizes Ansible uses for n hosts and a serial spec like "1,25%,100%"."""
    spec = [s.strip() for s in serial.split(",") if s.strip()]
    out, remaining, i = [], n, 0
    while remaining > 0:
        entry = spec[min(i, len(spec) - 1)]        # the last entry repeats
        if entry.endswith("%"):
            size = int(entry[:-1]) * n // 100       # percent of the TOTAL, rounded down
        else:
            size = int(entry)
        size = min(max(size, 1), remaining)        # at least 1, never more than what is left
        out.append(size)
        remaining -= size
        i += 1
    return out`),
    cx: `<p>O(number of batches), at most n iterations.</p>`,
    f: ['What <code>max_fail_percentage</code> would tolerate one failing host in a batch of 5? (more than 20%)', 'Why is the first batch of 1 valuable? (a bad change harms only one host)'],
    tests: { sig: 'int string -> int[]', fn: 'serialBatches', cases: [
      [[10, '1,25%,100%'], [1, 2, 7]], [[5, '2'], [2, 2, 1]], [[20, '10%'], [2, 2, 2, 2, 2, 2, 2, 2, 2, 2]], [[3, '10%'], [1, 1, 1]],
      [[0, '5'], []], [[7, '1,3'], [1, 3, 3]], [[50, '1,5,10'], [1, 5, 10, 10, 10, 10, 4]], [[10, '50%,100%'], [5, 5]],
      [[4, '100%'], [4]], [[10, '30%'], [3, 3, 3, 1]], [[100, '25%'], [25, 25, 25, 25]], [[8, '1,3,100%'], [1, 3, 4]], [[1, '1,100%'], [1]]
    ] }
  }));

  practice.push(P({
    t: 'Create a deploy user with key and limited sudo', l: 'Medium', tags: ['user', 'authorized_key', 'sudoers', 'validate'], co: ['Red Hat', 'Cisco', 'Deloitte'],
    s: `<p>Write tasks (idempotent, FQCN) that ensure a user <code>deploy</code> exists with a home directory and bash shell, has the public key from the variable <code>deploy_public_key</code> in its <code>authorized_keys</code>, and can run only <code>systemctl reload nginx</code> through sudo without a password. The sudoers file must be validated so a typo cannot lock everyone out. No private key or password may appear anywhere.</p>`,
    ex: `<p>Run 1: ${H.c('y', 'changed')} for the user, the key and the sudoers file. Run 2: ${H.c('g', 'ok')} for all. A deliberately broken sudoers line fails ${H.c('r', 'validation')} and the live <code>/etc/sudoers.d/deploy</code> is never replaced.</p>`,
    bw: `<p><code>shell: useradd deploy; echo "deploy ALL=(ALL) NOPASSWD: ALL" >> /etc/sudoers</code>. Not idempotent (fails on the second run), full root for the deploy user, and an appended line without validation can break sudo for every account.</p>`,
    bc: `useradd deploy && echo "deploy ALL=(ALL) NOPASSWD: ALL" >> /etc/sudoers`,
    q: ['Why use <code>validate: "visudo -cf %s"</code>?', ['The new file is checked before it replaces the live one', 'It encrypts the file', 'It adds the file to Git', 'It speeds up sudo'], 0, 'validate writes the content to a temp file, runs the command on it, and only installs the file if the check passes.'],
    h: ['<p>Hint 1: three modules: <code>ansible.builtin.user</code>, <code>ansible.posix.authorized_key</code>, <code>ansible.builtin.copy</code> (or <code>lineinfile</code>) into <code>/etc/sudoers.d/</code>.</p>', '<p>Hint 2: sudoers.d files need mode <code>0440</code> and owner root.</p>', '<p>Hint 3: the public key is not secret, but keep it in group_vars; the private key stays with the person and is never in the repo.</p>'],
    a: `<p>Use one module per intent so each is idempotent. The <code>user</code> module creates the account only if missing. <code>authorized_key</code> (from the <code>ansible.posix</code> collection, listed in <code>requirements.yml</code>) adds the key only if absent, never duplicating lines. The sudoers drop-in is its own file, mode 0440, with narrowly scoped rights (one command, no wildcards) and <code>validate</code> to protect the system. Least privilege here means the deploy user can reload nginx and nothing else.</p>`,
    code: Y(`- name: Deploy user with limited sudo
  hosts: web
  become: true
  tasks:
    - name: Create the deploy user
      ansible.builtin.user:
        name: deploy
        shell: /bin/bash
        create_home: true
        state: present

    - name: Authorize the deploy public key
      ansible.posix.authorized_key:
        user: deploy
        key: "{{ deploy_public_key }}"      # a PUBLIC key from group_vars; the private key never enters the repo
        state: present

    - name: Allow reloading nginx without a password (and nothing else)
      ansible.builtin.copy:
        dest: /etc/sudoers.d/deploy
        content: |
          deploy ALL=(root) NOPASSWD: /usr/bin/systemctl reload nginx
        owner: root
        group: root
        mode: "0440"
        validate: "visudo -cf %s"`, 'deploy-user.yml'),
    cx: `<p>Three cheap state checks per run.</p>`,
    f: ['What would you check about the key variable? (it is a public key only; a private key in vars is a leak)', 'Why a drop-in file rather than editing <code>/etc/sudoers</code>? (smaller blast radius, idempotent, easy to remove)']
  }));

  practice.push(P({
    t: 'Dry-run one host, then run one tag', l: 'Medium', tags: ['tags', 'check', 'diff', 'limit'], co: ['Accenture', 'Red Hat', 'Infosys'],
    s: `<p>The playbook has tasks tagged <code>packages</code>, <code>config</code> and <code>users</code>. You changed only the nginx template. Give the commands to: (1) list the available tags, (2) see which tasks a run with <code>--tags config</code> would execute, (3) dry-run that on <code>web1</code> with a file diff, (4) run it for real on <code>web1</code> only, then on the rest in one command that skips <code>web1</code>. Add the tags to a block of the playbook so the template task and its handler flush are both covered.</p>`,
    ex: `<p>Step (3) prints a unified diff of <code>site.conf</code> and ends with ${H.c('y', 'changed=1')}, but the file on disk is ${H.c('g', 'untouched')} because of <code>--check</code>.</p>`,
    bw: `<p>Editing the template, running the full playbook against all hosts and watching. It re-checks packages and users (slow), and any problem hits every host at once.</p>`,
    q: ['A task has no tag. What happens with <code>--tags config</code>?', ['It is skipped', 'It runs anyway', 'It fails', 'It runs only on localhost'], 0, 'With --tags, only tasks carrying a selected tag run (plus tasks tagged always).'],
    h: ['<p>Hint 1: <code>--list-tags</code> and <code>--list-tasks --tags config</code> change nothing.</p>', '<p>Hint 2: <code>--check --diff --limit web1</code> is the safe rehearsal.</p>', '<p>Hint 3: <code>--limit \'web:!web1\'</code> selects everyone else.</p>'],
    a: `<p>Preview first, then a canary, then the rest. Tag the task with the template and the handler flush with the same tag, otherwise the reload would be skipped. The rehearsal shows the diff without writing. Running the real change on web1 gives you a canary with real traffic; if it is healthy, run on the remaining hosts with the exclusion limit. This is the manual version of what <code>serial</code> does automatically.</p>`,
    code: SH(R`ansible-playbook -i inventory.ini site.yml --list-tags                                  # 1: available tags
ansible-playbook -i inventory.ini site.yml --tags config --list-tasks                      # 2: what would run
ansible-playbook -i inventory.ini site.yml --tags config --limit web1 --check --diff       # 3: dry run with diff
ansible-playbook -i inventory.ini site.yml --tags config --limit web1                      # 4a: canary
ansible-playbook -i inventory.ini site.yml --tags config --limit 'web:!web1'               # 4b: the rest`),
    alt: [Y(`- name: Configure nginx
  hosts: web
  become: true
  tasks:
    - name: Config block (template plus reload)
      tags: [config]
      block:
        - name: Deploy the site config
          ansible.builtin.template:
            src: site.conf.j2
            dest: /etc/nginx/conf.d/site.conf
            mode: "0644"
          notify: Reload nginx
        - name: Reload now so the change takes effect inside this tag run
          ansible.builtin.meta: flush_handlers

  handlers:
    - name: Reload nginx
      ansible.builtin.service:
        name: nginx
        state: reloaded`, 'Tagged block')],
    cx: `<p>The tagged run takes seconds; the full run would take minutes.</p>`,
    f: ['Which tag is special? (<code>always</code>, and <code>never</code> for opt-in tasks)', 'What if the handler lives outside the tag? (it only runs if its notifying task runs)']
  }));

  practice.push(P({
    t: 'Vault a database password and use it safely in CI', l: 'Medium', tags: ['vault', 'vault-id', 'no_log', 'ci'], co: ['Cisco', 'Thoughtworks', 'Accenture'],
    s: `<p>Store a database password for production so it can live in Git. Show: how to create the encrypted value without it appearing in shell history, where to put the plain-named variable, how to run the playbook locally (prompt) and in CI (password from the CI secret store written to a temporary file), and how to keep the password out of the logs. Use only placeholders.</p>`,
    ex: `<p>Git contains ${H.c('g', '$ANSIBLE_VAULT;1.1;AES256;prod ...')} only. Local run: prompt. CI run: the key lives in the ${H.c('b', 'CI secret store')}, is written to a ${H.c('y', '0600 temp file')}, used and deleted.</p>`,
    bw: `<p>Committing <code>.vault_pass</code> "so CI works", or passing the secret as <code>-e db_password=...</code> on the command line (visible in process lists and CI logs).</p>`,
    q: ['Which keeps the secret out of shell history?', ['<code>encrypt_string --stdin-name</code> reading from stdin', '<code>encrypt_string \'value\'</code> on the command line', 'echo the value into a file in the repo', 'put it in <code>-e</code>'], 0, 'A value on the command line is stored in history and visible in ps. Reading from stdin avoids both.'],
    h: ['<p>Hint 1: <code>ansible-vault encrypt_string --vault-id prod@prompt --stdin-name vault_db_password</code>.</p>', '<p>Hint 2: keep <code>db_password: "{{ vault_db_password }}"</code> in plain vars so names are readable.</p>', '<p>Hint 3: in CI, <code>umask 077</code>, write the secret to a temp file, pass <code>--vault-id prod@FILE</code>, delete with a <code>trap</code>.</p>'],
    a: `<p>Encrypt just the value, read from stdin, with a <code>prod</code> vault ID. Paste the resulting block into <code>group_vars/prod/vault.yml</code>. Reference it from <code>group_vars/prod/vars.yml</code> by a plain-named variable. Locally you type the vault password at a prompt; in CI the password comes from the CI system's secret store (not the repo), is written to a private temp file and removed on exit. Every task that uses the value gets <code>no_log: true</code>, and the pipeline never runs with <code>-vvv</code> against production.</p>`,
    code: SH(R`#!/usr/bin/env bash
set -euo pipefail
# --- once, on your machine: create the encrypted value (nothing sensitive enters your history) ---
read -rsp "Production DB password (placeholder in this lab): " PW && echo
printf '%s' "$PW" | ansible-vault encrypt_string --vault-id prod@prompt --stdin-name vault_db_password
unset PW
# paste the printed "vault_db_password: !vault |" block into group_vars/prod/vault.yml

# --- local run: Ansible prompts for the vault password ---
ansible-playbook -i inventories/prod site.yml --vault-id prod@prompt

# --- CI run: the secret store provides $VAULT_PASSWORD_PROD; write it to a private temp file ---
umask 077
VP_FILE="$(mktemp)"
trap 'rm -f "$VP_FILE"' EXIT
printf '%s' "$VAULT_PASSWORD_PROD" > "$VP_FILE"
ansible-playbook -i inventories/prod site.yml --vault-id "prod@$VP_FILE"`),
    alt: [Y(`# group_vars/prod/vars.yml (plain text: names visible, no values)
db_user: app
db_password: "{{ vault_db_password }}"`, 'vars.yml'),
      Y(`- name: Use the secret without logging it
  community.mysql.mysql_user:
    name: "{{ db_user }}"
    password: "{{ db_password }}"
    state: present
  no_log: true`, 'task with no_log')],
    cx: `<p>One-time setup; each run decrypts in memory in milliseconds.</p>`,
    f: ['How do developers run the playbook without the production key? (they hold only the dev vault ID)', 'What if the CI log still shows the secret? (treat as leaked: rotate, then fix no_log)']
  }));

  practice.push(P({
    t: 'Generate /etc/hosts for the whole cluster', l: 'Medium', tags: ['jinja2', 'template', 'hostvars', 'blockinfile'], co: ['Red Hat', 'Cisco', 'Wipro'],
    s: `<p>Every host in the <code>cluster</code> group must know every other host by name, because there is no DNS yet. Produce a managed block in <code>/etc/hosts</code> listing each host's <code>ansible_host</code> address and name, sorted, updated automatically when hosts join or leave, without touching the other lines of the file. Show the template-based approach and say why the block approach is the right choice here.</p>`,
    ex: `<p>With hosts <code>c1</code> (10.0.0.1) and <code>c2</code> (10.0.0.2) the file gains a block between ${H.c('b', '# BEGIN ANSIBLE MANAGED BLOCK')} and ${H.c('b', '# END ANSIBLE MANAGED BLOCK')} with <code>10.0.0.1 c1</code> and <code>10.0.0.2 c2</code>. Add <code>c3</code> to the group: only that block changes.</p>`,
    bw: `<p>Overwriting <code>/etc/hosts</code> with a template: it drops the localhost lines and cloud-init entries, and breaks name resolution on the host itself.</p>`,
    q: ['Why use <code>blockinfile</code> here instead of <code>template</code>?', ['It manages only its own marked block and leaves the rest of the file alone', 'It is faster', 'It encrypts the file', 'It supports loops, template does not'], 0, 'blockinfile inserts or updates a delimited block, so the other lines stay as the OS or cloud-init wrote them.'],
    h: ['<p>Hint 1: <code>groups[\'cluster\']</code> is the list of host names.</p>', '<p>Hint 2: <code>hostvars[h][\'ansible_host\']</code>, with <code>default(h)</code> as a fallback.</p>', '<p>Hint 3: sort the list so the block is stable and the task stays <b>ok</b> when nothing changed.</p>'],
    a: `<p>Use <code>blockinfile</code> with a Jinja2 loop in its <code>block</code>. The module surrounds the content with markers and rewrites only that region on later runs, so it is idempotent as long as the content is stable: hence the <code>sort</code>. The loop reads the inventory, so adding or removing a host in the group changes the block on the next run. Keep <code>backup: true</code> off by default and use <code>validate</code> only when the target has a checker (hosts files do not).</p>`,
    code: Y(`- name: Cluster name resolution
  hosts: cluster
  become: true
  tasks:
    - name: Manage the cluster block in /etc/hosts
      ansible.builtin.blockinfile:
        path: /etc/hosts
        marker: "# {mark} ANSIBLE MANAGED BLOCK (cluster)"
        block: |
          {% for h in groups['cluster'] | sort %}
          {{ hostvars[h]['ansible_host'] | default(h) }} {{ h }}
          {% endfor %}`, 'hosts.yml'),
    cx: `<p>Linear in the number of hosts in the group; every host does the same rendering.</p>`,
    f: ['What breaks if a host has no <code>ansible_host</code>? (the default falls back to the name; resolve it with DNS)', 'When is DNS the better answer? (more than a handful of hosts, changing addresses)']
  }));

  // ---- Hard ----
  practice.push(P({
    t: 'Which value wins? Resolve a variable through the precedence ladder', l: 'Hard', tags: ['variables', 'precedence', 'python'], co: ['Red Hat', 'Cisco', 'Thoughtworks'], lang: 'python', c: PYC + '<p>Levels, weakest to strongest: <code>role_defaults</code>, <code>inventory_group_all</code>, <code>inventory_group</code>, <code>host_vars</code>, <code>play_vars</code>, <code>set_fact</code>, <code>extra_vars</code>.</p>',
    s: `<p>Write <code>resolve_var(lines, name)</code>. Each line is <code>"level:name=value"</code>, for example <code>"host_vars:nginx_port=9090"</code>. Return the value of <code>name</code> from the <b>strongest</b> level that sets it. If two lines of the same level set it, the <b>later line</b> wins. The value is everything after the first <code>=</code> (it may contain more <code>=</code> characters). Lines with an unknown level are ignored. If nothing sets the name return <code>"UNDEFINED"</code>. The order of the lines never matters between different levels.</p>`,
    ex: `<p><code>["role_defaults:port=80", "host_vars:port=9090", "inventory_group:port=8080"]</code>, name <code>port</code> → ${H.c('g', '"9090"')}: host_vars is stronger than inventory_group, whatever the line order. Adding <code>"extra_vars:port=7000"</code> makes it ${H.c('y', '"7000"')}.</p>`,
    bw: `<p>Taking the last line in the list. That is "last write wins", which is wrong here: the winner depends on the level, not the position in the file, and <code>-e</code> beats everything even though it is on the command line first.</p>`,
    bc: `def resolve_var(lines, name):
    val = "UNDEFINED"
    for ln in lines:
        k, v = ln.split(":", 1)[1].split("=", 1)
        if k == name:
            val = v           # last line wins: ignores the level
    return val`,
    q: ['<code>-e port=7000</code> appears first on the command line; <code>host_vars</code> says 9090. Which is used?', ['7000: extra vars beat all other sources', '9090: host_vars is more specific', 'Whichever appears last', 'It fails with a conflict'], 0, 'Extra vars are the strongest level. Position does not matter; the ranking does.'],
    h: ['<p>Hint 1: give every level a number from its position in the ladder.</p>', '<p>Hint 2: keep the best (rank, value) seen so far; replace it when a line has rank greater than or equal to the best.</p>', '<p>Hint 3: split carefully: level up to the first <code>:</code>, name up to the first <code>=</code>, value is the rest. Ignore lines whose level is not in the ladder.</p>'],
    a: `<p>Rank each level by its index in the ladder. Scan every line once, keeping the highest rank seen for the requested name. Using "greater than or equal" lets a later line at the same level overwrite an earlier one, which models two files at the same level where the one loaded last wins. Because the comparison is on rank, the order of lines at different levels is irrelevant. Splitting on the first colon and first equals sign keeps URLs and expressions in the value intact.</p>`,
    code: PY(`LEVELS = ["role_defaults", "inventory_group_all", "inventory_group", "host_vars",
          "play_vars", "set_fact", "extra_vars"]
RANK = {name: i for i, name in enumerate(LEVELS)}

def resolve_var(lines, name):
    """Value of 'name' from the strongest level; later line wins inside one level."""
    best_rank, best_val = -1, "UNDEFINED"
    for ln in lines:
        level, _, rest = ln.partition(":")
        if level not in RANK:
            continue                              # unknown level: ignore the line
        key, eq, value = rest.partition("=")
        if not eq or key != name:
            continue
        if RANK[level] >= best_rank:              # >= : same level, later line wins
            best_rank, best_val = RANK[level], value
    return best_val`),
    cx: `<p>O(L) for L lines, O(1) extra space.</p>`,
    f: ['What really decides between two groups that set the same variable? (alphabetical order, or <code>ansible_group_priority</code>; child groups beat parents)', 'Which command shows the merged inventory values for one host? (<code>ansible-inventory --host</code>)'],
    tests: { sig: 'string[] string -> string', fn: 'resolveVar', cases: [
      [[['role_defaults:port=80', 'host_vars:port=9090'], 'port'], '9090'],
      [[['extra_vars:port=1', 'host_vars:port=2', 'play_vars:port=3'], 'port'], '1'],
      [[['role_defaults:port=80'], 'missing'], 'UNDEFINED'],
      [[['inventory_group_all:env=dev', 'inventory_group:env=prod'], 'env'], 'prod'],
      [[['host_vars:x=a', 'host_vars:x=b'], 'x'], 'b'],
      [[['play_vars:x=1', 'set_fact:x=2'], 'x'], '2'],
      [[['role_defaults:x=1', 'inventory_group_all:y=2'], 'x'], '1'],
      [[[], 'x'], 'UNDEFINED'],
      [[['inventory_group:x=g', 'inventory_group_all:x=a'], 'x'], 'g'],
      [[['role_defaults:url=a=b'], 'url'], 'a=b'],
      [[['bogus_level:x=9', 'role_defaults:x=1'], 'x'], '1'],
      [[['host_vars:x=h', 'extra_vars:y=e', 'role_defaults:x=d'], 'x'], 'h']
    ] }
  }));

  practice.push(P({
    t: 'Which hosts does this pattern select?', l: 'Hard', tags: ['inventory', 'patterns', 'groups', 'python'], co: ['Red Hat', 'Cisco', 'Amazon'], lang: 'python', c: PYC + '<p>Input lines: <code>"group=host1,host2"</code> lists hosts of a group; <code>"group>child1,child2"</code> lists child groups. A group may have both. Group names are not nested deeper than the lines say, and cycles may occur by mistake.</p>',
    s: `<p>Write <code>match_hosts(lines, pattern)</code> that returns the <b>sorted list of unique host names</b> Ansible would select. A group contains its own hosts plus the hosts of its child groups, recursively. A pattern is groups joined with <code>:</code>, read left to right: the first group (or <code>all</code>, meaning every host that appears in any <code>=</code> line) starts the set; <code>:&amp;g</code> keeps only hosts also in <code>g</code>; <code>:!g</code> removes the hosts in <code>g</code>; a plain <code>:g</code> adds the hosts of <code>g</code>. An unknown group has no hosts. A cycle (a is a child of b and b of a) must not loop forever.</p>`,
    ex: `<p>Inventory <code>["web=w1,w2", "db=d1", "staging=w3", "prod>web,db"]</code>. Pattern <code>prod:!db</code> → ${H.c('g', '["w1", "w2"]')}. Pattern <code>web:staging</code> → ${H.c('g', '["w1", "w2", "w3"]')}. Pattern <code>all:&amp;staging</code> → ${H.c('g', '["w3"]')}.</p>`,
    bw: `<p>Treating child groups as plain host lists (no recursion) so <code>prod</code> returns nothing, or recursing without a visited set so a mistaken cycle crashes with infinite recursion.</p>`,
    bc: `def match_hosts(lines, pattern):
    hosts = {}
    for ln in lines:
        if "=" in ln:
            g, rest = ln.split("=", 1)
            hosts[g] = rest.split(",")
    return sorted(hosts.get(pattern, []))     # no children, no operators`,
    q: ['<code>web:&amp;staging</code> means:', ['hosts that are in web AND in staging', 'hosts in web OR staging', 'hosts in web but not staging', 'all hosts'], 0, 'Colon-ampersand is intersection; colon-bang is exclusion; a plain colon is union.'],
    h: ['<p>Hint 1: parse the lines into two dictionaries: group → hosts, group → children.</p>', '<p>Hint 2: write <code>expand(group, seen)</code> that adds hosts and recurses into children, skipping groups already in <code>seen</code>.</p>', '<p>Hint 3: split the pattern on <code>:</code>; start with the first token, then fold each later token by its first character (<code>&amp;</code>, <code>!</code> or none). <code>all</code> is the union of all hosts from <code>=</code> lines.</p>'],
    a: `<p>Parse once, expand recursively with a visited set (which also defeats cycles), then fold the pattern tokens over a set of hosts: intersection, difference or union. Return the set sorted, so the answer is stable. This mirrors what <code>ansible 'prod:!db' --list-hosts</code> prints and is the check to run before any risky <code>--limit</code>. Two real-Ansible details to remember: the order of tokens matters, and an empty result only produces a warning, so CI should treat "no hosts matched" as a failure.</p>`,
    code: PY(`def match_hosts(lines, pattern):
    """Sorted unique hosts selected by an Ansible-style pattern such as 'prod:!db'."""
    hosts, kids = {}, {}
    for ln in lines:
        if ">" in ln:
            g, rest = ln.split(">", 1)
            kids.setdefault(g.strip(), []).extend(x.strip() for x in rest.split(",") if x.strip())
        elif "=" in ln:
            g, rest = ln.split("=", 1)
            hosts.setdefault(g.strip(), []).extend(x.strip() for x in rest.split(",") if x.strip())

    def expand(group, seen):
        if group in seen:                           # cycle or repeat: stop here
            return set()
        seen.add(group)
        out = set(hosts.get(group, []))
        for child in kids.get(group, []):
            out |= expand(child, seen)
        return out

    def select(name):
        if name == "all":
            return {h for lst in hosts.values() for h in lst}
        return expand(name, set())

    tokens = pattern.split(":")
    result = select(tokens[0])
    for tok in tokens[1:]:
        if tok.startswith("&"):
            result &= select(tok[1:])
        elif tok.startswith("!"):
            result -= select(tok[1:])
        else:
            result |= select(tok)
    return sorted(result)`),
    cx: `<p>O(G + H) per group expansion with the visited set; the fold does one set operation per token.</p>`,
    f: ['What does a regex pattern look like in Ansible? (<code>~web\\d+</code>)', 'How would you make CI fail when a pattern selects zero hosts? (check <code>--list-hosts</code> output, or use <code>ansible_play_hosts</code> in an assert)'],
    tests: { sig: 'string[] string -> string[]', fn: 'matchHosts', cases: [
      [[['web=w1,w2', 'db=d1', 'staging=w3', 'prod>web,db'], 'prod'], ['d1', 'w1', 'w2']],
      [[['web=w1,w2', 'db=d1', 'staging=w3', 'prod>web,db'], 'prod:!db'], ['w1', 'w2']],
      [[['web=w1,w2', 'db=d1', 'staging=w3', 'prod>web,db'], 'web:staging'], ['w1', 'w2', 'w3']],
      [[['web=w1,w2', 'db=d1', 'staging=w3', 'prod>web,db'], 'all'], ['d1', 'w1', 'w2', 'w3']],
      [[['web=w1,w2', 'db=d1', 'staging=w3', 'prod>web,db'], 'all:&web'], ['w1', 'w2']],
      [[['web=w1,w2', 'db=d1', 'staging=w3', 'prod>web,db'], 'nosuch'], []],
      [[['a>b', 'b>a', 'a=h1', 'b=h2'], 'a'], ['h1', 'h2']],
      [[['a>b', 'a>c', 'b>d', 'c>d', 'd=x'], 'a'], ['x']],
      [[['web=w1,w2'], 'web:!web'], []],
      [[['web=w1,w2', 'db=d1', 'staging=w3', 'prod>web,db'], 'prod:&staging'], []],
      [[['web=w1,w2', 'db=d1', 'staging=w3', 'prod>web,db'], 'staging:prod'], ['d1', 'w1', 'w2', 'w3']],
      [[[], 'all'], []],
      [[['web=w1,w2', 'db=d1', 'prod>web,db'], 'all:!prod:w9'], []],
      [[['web=w1,w2', 'w9x=w9'], 'all:!web'], ['w9']]
    ] }
  }));

  practice.push(P({
    t: 'Zero-downtime kernel patching and reboot of a database cluster', l: 'Hard', tags: ['serial', 'reboot', 'health gate', 'any_errors_fatal'], co: ['Amazon', 'Red Hat', 'Cisco'],
    s: `<p>Three database nodes (<code>db1</code>, <code>db2</code>, <code>db3</code>) form a replicated cluster that tolerates losing one node. Write a playbook that patches the OS and reboots only if needed, one node at a time. Before touching a node it must verify the cluster is healthy; after the reboot it must wait until the node is back <b>and</b> has caught up with replication before the next node starts. If any check fails, stop the whole run. Do not reboot nodes in parallel and do not reboot when no reboot is required.</p>`,
    ex: `<p>Order: db1 patched, rebooted, ${H.c('g', 'caught up')} → db2 ... → db3. If db2 never catches up, the play ${H.c('r', 'aborts')} and db3 is never rebooted, so the cluster still has two healthy nodes.</p>`,
    bw: `<p>Patching all nodes in parallel with <code>ansible.builtin.reboot</code> and no health gates. All three reboot at once; the cluster loses quorum and the database is down until someone restores it by hand.</p>`,
    bcl: 'yaml', bc: `- hosts: db
  become: true
  tasks:
    - ansible.builtin.apt: {upgrade: dist}
    - ansible.builtin.reboot:        # all nodes at the same time: outage`,
    q: ['Which setting makes sure only one node is processed at a time?', ['<code>serial: 1</code>', '<code>forks: 1</code> only', '<code>strategy: free</code>', '<code>run_once: true</code>'], 0, 'serial limits how many hosts run the whole play together. With serial 1 each node finishes completely before the next begins. forks is a separate concurrency limit.'],
    h: ['<p>Hint 1: <code>serial: 1</code> plus <code>any_errors_fatal: true</code> so the first failure stops everything.</p>', '<p>Hint 2: <code>/var/run/reboot-required</code> (Debian) via <code>stat</code> tells you whether a reboot is needed.</p>', '<p>Hint 3: health gates are tasks that fail when the cluster is not healthy: a command with <code>until</code>/<code>retries</code> run against the cluster, before and after.</p>'],
    a: `<p>The safety comes from structure, not speed. <code>serial: 1</code> makes sure only one node is out at a time; <code>any_errors_fatal</code> stops the run if any gate fails. A pre-check proves the cluster is healthy <i>before</i> a node leaves; <code>ansible.builtin.reboot</code> handles shutdown, waiting for SSH and a post-reboot test command; a post-check loops with <code>retries</code> until replication lag is back to zero. Only then does the next node start. The reboot task runs only when the system reports that one is required. Keep the commands that query the cluster as read-only tasks with <code>changed_when: false</code>.</p>`,
    code: Y(`- name: Rolling OS patch for the database cluster
  hosts: db
  become: true
  serial: 1                       # one node at a time
  any_errors_fatal: true          # any failed gate stops the entire run
  tasks:
    - name: Pre-check - the cluster must be healthy before this node leaves
      ansible.builtin.command: /usr/local/bin/cluster-health --quorum
      register: pre
      changed_when: false
      failed_when: pre.rc != 0

    - name: Patch the operating system
      ansible.builtin.apt:
        upgrade: dist
        update_cache: true
        cache_valid_time: 3600

    - name: Is a reboot required?
      ansible.builtin.stat:
        path: /var/run/reboot-required
      register: reboot_required

    - name: Reboot, and wait until the node answers a command again
      ansible.builtin.reboot:
        reboot_timeout: 900
        test_command: systemctl is-active postgresql
      when: reboot_required.stat.exists

    - name: Post-check - replication must be caught up before the next node
      ansible.builtin.command: /usr/local/bin/cluster-health --replication-lag-zero
      register: post
      changed_when: false
      retries: 30
      delay: 10
      until: post.rc == 0`, 'rolling-patch.yml'),
    cx: `<p>Total time is the sum of the node times (about three reboots plus catch-up). That is the price of never losing quorum.</p>`,
    f: ['Where would you take the node out of a load balancer? (before the patch task, with <code>delegate_to</code>)', 'What if one node must never be rebooted before the others? (order the group, or use separate plays)']
  }));

  practice.push(P({
    t: 'A CI pipeline for Ansible: lint, test, dry run, deploy', l: 'Hard', tags: ['ci', 'ansible-lint', 'molecule', 'vault', 'pipeline'], co: ['Thoughtworks', 'Cisco', 'Accenture'],
    s: `<p>Design a CI workflow (GitHub Actions syntax) for an Ansible repository. On every pull request: install pinned tools, run <code>ansible-lint</code> and a syntax check, test the <code>nginx</code> role with Molecule in a container, and run a <b>check-mode dry run with diff</b> against staging. On merge to <code>main</code>: apply to staging, then production only after a manual approval. Secrets (vault password, SSH key) come from the CI secret store; the vault password never touches the repo and never appears in logs. Explain how you prove idempotence.</p>`,
    ex: `<p>A pull request shows ${H.c('g', 'lint passed')}, ${H.c('g', 'molecule: idempotence passed (changed=0)')}, and the ${H.c('b', 'check-mode diff')} as a log reviewers read. Merging triggers staging; production waits for a person.</p>`,
    bw: `<p>A single job that runs <code>ansible-playbook site.yml</code> against production on every push, with the vault password echoed into a file in the repo checkout and no lint, test or dry run. One typo is applied everywhere.</p>`,
    bcl: 'yaml', bc: `jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - run: ansible-playbook -i prod site.yml    # no lint, no test, no dry run, no approval`,
    q: ['What does the Molecule <em>idempotence</em> step check?', ['That a second converge run reports changed=0', 'That the role is fast', 'That lint passes', 'That the vault is encrypted'], 0, 'Molecule runs the role twice and fails if the second run changes anything, which catches non-idempotent tasks.'],
    h: ['<p>Hint 1: split into jobs: lint, molecule, dry-run (pull requests) and deploy (main).</p>', '<p>Hint 2: use a protected <em>environment</em> for production so a person must approve; keep the vault password as an environment secret.</p>', '<p>Hint 3: write the vault password to a temp file with <code>umask 077</code>, pass it with <code>--vault-id</code>, and remove it with a final step that always runs. Pin action and tool versions.</p>'],
    a: `<p>Fast checks come first and are required for merge: lint and syntax check. Molecule exercises the role in a container including the idempotence step. A check-mode dry run against staging produces the diff a reviewer reads. After merge the pipeline applies to staging automatically and uses a protected environment for production, where GitHub requires an approval and releases the environment secrets only to that job. Vault and SSH secrets are written to private temp files and removed in an <code>if: always()</code> step; <code>no_log</code> in the playbooks keeps values out of the logs. Tool versions are pinned so the pipeline does not change under you.</p>`,
    code: Y(`name: ansible-ci
on:
  pull_request:
  push:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v4
      - run: python3 -m pip install ansible-core==2.17.* ansible-lint==24.*
      - run: ansible-galaxy collection install -r requirements.yml
      - run: ansible-playbook -i inventories/staging site.yml --syntax-check
      - run: ansible-lint site.yml roles/

  molecule:
    runs-on: ubuntu-24.04
    needs: lint
    steps:
      - uses: actions/checkout@v4
      - run: python3 -m pip install ansible-core==2.17.* molecule molecule-plugins[docker]
      - run: molecule test            # create, converge, idempotence (changed=0), verify, destroy
        working-directory: roles/nginx

  dry-run-staging:
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-24.04
    needs: molecule
    environment: staging
    steps:
      - uses: actions/checkout@v4
      - run: python3 -m pip install ansible-core==2.17.*
      - run: ansible-galaxy collection install -r requirements.yml
      - name: Dry run with diff
        env:
          VAULT_PW: @@{{ secrets.VAULT_PASSWORD_STAGING }}
        run: |
          umask 077
          printf '%s' "$VAULT_PW" > "$RUNNER_TEMP/vp"
          ansible-playbook -i inventories/staging site.yml --check --diff --vault-id "staging@$RUNNER_TEMP/vp"
      - name: Remove the vault password file
        if: always()
        run: rm -f "$RUNNER_TEMP/vp"

  deploy-staging:
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-24.04
    needs: molecule
    environment: staging
    steps:
      - uses: actions/checkout@v4
      - run: python3 -m pip install ansible-core==2.17.*
      - run: ansible-galaxy collection install -r requirements.yml
      - name: Apply to staging
        env:
          VAULT_PW: @@{{ secrets.VAULT_PASSWORD_STAGING }}
        run: |
          umask 077
          printf '%s' "$VAULT_PW" > "$RUNNER_TEMP/vp"
          ansible-playbook -i inventories/staging site.yml --vault-id "staging@$RUNNER_TEMP/vp"
      - name: Remove the vault password file
        if: always()
        run: rm -f "$RUNNER_TEMP/vp"

  deploy-production:
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-24.04
    needs: deploy-staging
    environment: production        # protected environment: requires a manual approval
    steps:
      - uses: actions/checkout@v4
      - run: python3 -m pip install ansible-core==2.17.*
      - run: ansible-galaxy collection install -r requirements.yml
      - name: Apply to production, rolling
        env:
          VAULT_PW: @@{{ secrets.VAULT_PASSWORD_PROD }}
        run: |
          umask 077
          printf '%s' "$VAULT_PW" > "$RUNNER_TEMP/vp"
          ansible-playbook -i inventories/prod site.yml --vault-id "prod@$RUNNER_TEMP/vp"
      - name: Remove the vault password file
        if: always()
        run: rm -f "$RUNNER_TEMP/vp"`.split('@@{').join('$' + '{'), '.github/workflows/ansible-ci.yml'),
    cx: `<p>Lint and syntax check take seconds; Molecule about a minute per role; dry run and deploy scale with the fleet. Parallel jobs keep pull-request feedback fast.</p>`,
    f: ['How do you give the runner an SSH key safely? (CI secret, loaded into ssh-agent for the job, or OIDC-issued short-lived certificates)', 'How would you test against two operating systems? (a Molecule platform matrix, one container per OS)']
  }));

  // ═════════════════════════ Quiz ═════════════════════════
  quiz.push({ q: 'You run the same playbook twice. The second recap shows <code>changed=3</code>, though nobody touched the servers. What is the most likely cause?', options: ['Three tasks use <code>shell</code>/<code>command</code> (or a template with a timestamp) and always report changed', 'Ansible caches results and is stale', 'The inventory has too many hosts', 'Handlers always run twice'], answer: 0, explain: 'Modules compare state and report ok when nothing needs doing. Plain shell commands cannot, and a changing value inside a template makes the file differ every run.' });
  quiz.push({ q: 'A task changed <code>/etc/nginx/conf.d/site.conf</code> and then the play failed on a later task. You fix the cause and re-run. The config task now says ok and nginx still has the old config. Why?', options: ['The queued reload handler was lost on failure, and the second run queued nothing because the task was ok', 'nginx ignores reload', 'Ansible reverted the file', 'Handlers only run on Mondays'], answer: 0, explain: 'Handlers are queued only when a task reports changed, and the queue is dropped when the host fails. Use force_handlers or meta: flush_handlers right after the config task.' });
  quiz.push({ q: 'Which inventory pattern selects every web host except the canary ones?', options: ['<code>web:!canary</code>', '<code>web:&amp;canary</code>', '<code>web:canary</code>', '<code>!web:canary</code>'], answer: 0, explain: 'Colon-bang excludes. Colon-ampersand intersects, and a plain colon is a union.' });
  quiz.push({ q: '<code>nginx_port</code> is set in role defaults (80), group_vars (8080), host_vars (9090) and the play\'s <code>vars:</code> (8081). With no <code>-e</code>, what does the host use?', options: ['8081', '9090', '8080', '80'], answer: 0, explain: 'Play vars are stronger than inventory group_vars and host_vars. Role defaults are the weakest, and extra vars (-e) would beat all of them.' });
  quiz.push({ q: 'Which is the safest way to give Ansible a vault password in CI?', options: ['Write it from the CI secret store to a private temp file, pass <code>--vault-id</code>, delete the file afterwards', 'Commit <code>.vault_pass</code> next to the vault file', 'Pass <code>-e vault_password=...</code> on the command line', 'Put it in the inventory as <code>ansible_password</code>'], answer: 0, explain: 'The key must stay outside the repository and out of process lists and logs. A temp file with strict permissions, removed after the job, meets that.' });
  quiz.push({ q: 'A real database password was found in plain text in <code>group_vars</code> in Git history. What must you do first?', options: ['Rotate the password so the old value stops working', 'Encrypt the old value with ansible-vault', 'Delete the line and push', 'Make the repository private'], answer: 0, explain: 'The old value is already copied into clones, forks and caches. Only rotation makes it useless. Vaulting the new value, no_log and scanning come after.' });
  quiz.push({ q: 'What does <code>serial: [1, "25%", "100%"]</code> do for 20 hosts?', options: ['Batches of 1, 5, then the remaining 14', 'Batches of 1, 25, 100', 'Everything at once', 'Batches of 5 only'], answer: 0, explain: 'The first batch is a canary of 1, then 25% of the total (5), then 100% which is capped at the 14 hosts left.' });
  quiz.push({ q: 'In a <code>block</code> / <code>rescue</code> rollout the rescue restores the old file and finishes without error. What is the host\'s status?', options: ['Recovered: the play continues unless rescue ends with <code>fail</code>', 'Failed', 'Unreachable', 'Skipped forever'], answer: 0, explain: 'A rescue that completes clears the failure. End it with ansible.builtin.fail if you want the rollout to stop.' });
  quiz.push({ q: 'Which module call is idempotent for "make sure this line is in the file, replacing any old setting"?', options: ['<code>lineinfile</code> with a <code>regexp</code>', '<code>shell: echo "PORT=80" &gt;&gt; file</code>', '<code>command: sed -i ...</code> with no checks', '<code>raw: echo ...</code>'], answer: 0, explain: 'lineinfile compares the file with the wanted line and the regexp finds the old one to replace, so repeated runs change nothing.' });
  quiz.push({ q: 'Where is a Jinja2 template rendered?', options: ['On the control node; the finished file is copied to the host', 'On each managed host', 'In the Galaxy server', 'Inside the target service'], answer: 0, explain: 'Ansible renders locally and transfers the result. Hosts only need Python for modules.' });
  quiz.push({ q: 'Which belongs to Terraform rather than Ansible?', options: ['Creating the VPC, VMs and load balancer', 'Installing packages on running servers', 'Rolling patching of 200 hosts', 'Rendering a config file per host'], answer: 0, explain: 'Cloud resources with their own lifecycle and state are provisioning. Software and files inside machines are configuration.' });
  quiz.push({ q: 'You want all hosts in <code>web</code> to use the port from a variable that a teammate can override per environment without editing the role. Where do you define the default?', options: ['<code>roles/nginx/defaults/main.yml</code>', '<code>roles/nginx/vars/main.yml</code>', 'inside the template as a literal', 'in <code>meta/main.yml</code>'], answer: 0, explain: 'Role defaults have the lowest precedence on purpose, so group_vars, host_vars and the play can override them.' });
  quiz.push({ q: 'A task prints a database password in the CI log when it fails. What is the right fix?', options: ['<code>no_log: true</code> on the task, and rotate the password because it is already in the logs', 'Run with <code>-vvv</code> to see the cause', 'Use ignore_errors', 'Delete the CI log only'], answer: 0, explain: 'no_log hides arguments and results. A secret that reached a log is treated as exposed, so rotate it.' });

  // ═════════════════════════ Interview ═════════════════════════
  interview.push({ q: 'What is Ansible, and why is it called agentless?', level: 'B', a: `<p>Ansible is an automation tool that makes servers match a description you write in YAML: packages, files, users, services. It is <b>agentless</b>: nothing permanent runs on the managed hosts. The control node connects over SSH (WinRM for Windows), copies a small Python module, runs it, reads the JSON result and deletes the temporary files. The hosts only need SSH and Python. That makes it easy to start (no bootstrap of agents) and means no extra service to patch or secure on every server, at the cost of needing a reachable control node and slower runs than a pull-based agent for very large fleets.</p>`, followUps: ['How does Ansible compare to Puppet or Chef? (push over SSH vs agent pull)', 'What do hosts need installed? (Python and SSH)'] });
  interview.push({ q: 'What is idempotency, and how do you keep playbooks idempotent?', level: 'B', a: `<p>Idempotent means running something repeatedly gives the same end state, and later runs change nothing. Ansible modules achieve this by checking current state first and acting only when it differs, then reporting <b>changed</b> or <b>ok</b>. To keep playbooks idempotent: use real modules with <code>state:</code> (apt, user, service, file, template, lineinfile) instead of <code>shell</code>; for unavoidable commands add <code>creates</code>/<code>removes</code> and <code>changed_when</code>/<code>failed_when</code>; avoid timestamps and unsorted output in templates. Prove it by running the play twice: the second recap must show <code>changed=0</code>. Molecule automates this check.</p>`, followUps: ['Why does a template with a timestamp break idempotency?', 'What does check mode do with a shell task?'] });
  interview.push({ q: 'Explain inventory, groups and host patterns. How would you target only the production web servers except the canary?', level: 'B', a: `<p>The inventory lists the hosts and groups them (INI or YAML, or a dynamic plugin for cloud fleets). A host can be in several groups; groups can have child groups; <code>all</code> and <code>ungrouped</code> always exist. Patterns select hosts: <code>web:db</code> is a union, <code>web:&amp;prod</code> an intersection, <code>web:!canary</code> an exclusion, read left to right. For the production web servers except canaries: <code>web:&amp;prod:!canary</code>. I verify with <code>--list-hosts</code> and <code>ansible-inventory --graph</code> before running anything that changes machines, and quote patterns with <code>!</code> in the shell.</p>`, followUps: ['How does a dynamic inventory find AWS instances? (tags and keyed_groups)', 'What does an empty match produce? (only a warning, so CI should check)'] });
  interview.push({ q: 'How do handlers work, and why might a handler not fire?', level: 'I', a: `<p>A handler is a task that runs only when notified by a task that reported <b>changed</b>. Notified handlers are queued and run once at the end of the play (or at <code>meta: flush_handlers</code>), in the order they are defined. Why one might not fire: the notifying task was ok (nothing changed); the play failed before the end and the queue was dropped, so a re-run sees the file already correct and never queues it; the notify name does not match the handler name or <code>listen</code> topic; the handler lives in a different play or role scope than expected. Fixes: <code>force_handlers: true</code>, <code>meta: flush_handlers</code> after the important task, correct names, and validating config before reload.</p>`, followUps: ['What does listen do?', 'Do handlers run when a host fails? (not by default)'] });
  interview.push({ q: 'Describe Ansible variable precedence and how you debug a value that is not what you expected.', level: 'I', a: `<p>There are many levels, but the working ladder from weakest to strongest is: role defaults, group_vars/all, group_vars/group, host_vars, play vars, set_fact/register, and extra vars (<code>-e</code>) last. More specific beats more general, and explicit beats default. To debug: run <code>ansible-inventory --host NAME</code> for the inventory-level values, add a <code>debug: var=</code> task for the final value, use <code>-vvv</code> to see where files load, and search the repo for every definition of the name. I avoid surprises by prefixing variable names, keeping defaults only in roles, environment values in group_vars, and almost nothing in play <code>vars:</code>.</p>`, followUps: ['What is stronger: host_vars or play vars?', 'How do you merge dictionaries across levels? (combine filter)'] });
  interview.push({ q: 'How do you manage secrets in Ansible?', level: 'I', a: `<p>Never plain text in Git. For repository secrets I use ansible-vault: <code>encrypt_string</code> for single values or an encrypted <code>vault.yml</code> per environment, with the plain variable name referring to the vaulted one so reviews stay readable. Vault IDs give dev and prod different passwords. The vault password lives outside the repo: a prompt locally, a CI secret written to a temp file in pipelines, or a script that fetches it from a password manager. I add <code>no_log: true</code> to tasks that handle secrets, restrict file modes, scan repos with gitleaks, and for dynamic or audited secrets use a lookup into a secret manager such as HashiCorp Vault. If a secret ever reached Git or logs, I rotate it first.</p>`, followUps: ['How do you rotate the vault password? (ansible-vault rekey)', 'What are the limits of vault? (shared password, secret visible on the host)'] });
  interview.push({ q: 'When would you use a role, and what does a good role look like?', level: 'I', a: `<p>Use a role when the same job (install and configure nginx, a user baseline) is needed in more than one playbook or by more than one team. A good role has one responsibility; a clear public interface in <code>defaults/main.yml</code> with prefixed variable names (<code>nginx_port</code>); internal constants in <code>vars/</code>; idempotent tasks with FQCN modules; handlers for reloads; templates with validation; a README; supported platforms in <code>meta/main.yml</code>; and tests: <code>ansible-lint</code> plus a Molecule scenario that converges in a container and checks idempotence and behaviour. Dependencies are explicit and few. Roles and collections are pinned in <code>requirements.yml</code>.</p>`, followUps: ['Role vs collection?', 'import_role vs include_role? (static vs dynamic)'] });
  interview.push({ q: 'How would you roll out a risky config change to 200 servers with no downtime?', level: 'A', a: `<p>Rehearse first with <code>--check --diff</code> on a canary. Then use <code>serial</code> with a ramp such as <code>[1, "5%", "25%", "100%"]</code>, <code>max_fail_percentage: 0</code>, and per batch: drain the host from the load balancer (<code>delegate_to</code>), apply the change inside a block with <code>backup: true</code>, flush handlers, run a real health check with retries, and in <code>rescue</code> restore the backup, reload and then <code>fail</code> so the rollout stops. Re-enable the host only when healthy. I check capacity (a batch must not remove more than the system tolerates), watch metrics between batches, and rely on backwards-compatible changes since old and new versions run side by side.</p>`, followUps: ['What does a completed rescue do to the failure state?', 'How does this change with immutable images? (rolling lives in the platform)'] });
  interview.push({ q: 'Ansible vs Terraform: how do you choose, and how do they work together?', level: 'I', a: `<p>Terraform provisions cloud resources (networks, VMs, load balancers, databases, DNS, IAM) declaratively, with a state file and a plan that shows exactly what will change. Ansible configures what is inside machines (packages, files, users, services, app releases) and runs ordered, rolling operations; it keeps no state and inspects each host each run. They work in sequence: Terraform creates and tags the machines, Ansible's dynamic inventory finds them by tag and configures them, and Ansible later handles patching and drift. I avoid <code>local-exec</code> provisioners that call Ansible, and I give every resource one owner. With immutable images or Kubernetes the configuration moves into image builds and manifests, and Ansible's role shrinks.</p>`, followUps: ['What happens to a resource removed from Terraform code vs a host removed from the inventory?', 'Where does Packer fit?'] });
  interview.push({ q: 'How do you test Ansible code before it touches production?', level: 'I', a: `<p>In layers. <code>ansible-playbook --syntax-check</code> and <code>ansible-lint</code> (production profile) in CI catch syntax and risky habits. Molecule converges each role in a throwaway container, runs it a second time to prove <code>changed=0</code>, and runs verify assertions (port answers, file content). Playbooks are exercised in a staging environment that mirrors production, first with <code>--check --diff</code>, then for real on a canary. Production runs use <code>serial</code>, health gates and an approval step. I also keep roles small so they are testable, pin tool and collection versions, and treat a non-zero <code>changed</code> on a second run as a bug.</p>`, followUps: ['What can Molecule not test well? (kernel and systemd-heavy behaviour; use VMs)', 'What does --check not catch? (modules without check support, runtime-only failures)'] });
  interview.push({ q: 'A playbook works on the first run but fails on the second. How do you debug it?', level: 'A', a: `<p>That usually means a non-idempotent task: a shell command that errors if the thing already exists (<code>useradd</code>, <code>mkdir</code> without -p), a <code>lineinfile</code> without regexp creating duplicates, or a task depending on a registered value that is empty the second time. I read the failing task with <code>-v</code> (not <code>-vvv</code> in production), reproduce on a container, then replace the shell with a module that has <code>state:</code>, or add <code>creates</code>, <code>changed_when</code> and <code>failed_when</code>. I add a Molecule idempotence check so the regression cannot return. I also check whether first-run side effects (a service started, a file created) change the second run's conditions.</p>`, followUps: ['How do you see which task is slow? (callback profile_tasks)', 'What is --start-at-task for?'] });
  interview.push({ q: 'What are facts, and how do you use or limit them?', level: 'B', a: `<p>Facts are variables Ansible discovers about each host by running the <code>setup</code> module at the start of a play: OS family and version, CPUs, memory, network interfaces, mounts. They live under <code>ansible_facts</code> and are used in conditions (<code>when: ansible_facts['os_family'] == "Debian"</code>) and templates (workers per CPU). Gathering takes time on big fleets, so I set <code>gather_facts: false</code> for plays that do not need them, or <code>gather_subset: min</code>, and enable fact caching (jsonfile or Redis) when plays need facts from hosts outside the current play. Custom facts can be dropped in <code>/etc/ansible/facts.d</code>. I prefer the <code>ansible_facts[...]</code> form over injected top-level names.</p>`, followUps: ['How do you read another host\'s facts? (hostvars, if gathered or cached)', 'What does set_fact do and where does it rank in precedence?'] });
  interview.push({ q: 'You find a plaintext password in group_vars in Git. Walk me through your response.', level: 'A', a: `<p>First rotate the credential: create a new password at the source (database or secret manager), deploy it to the app and Ansible, and disable the old one, because the old value is already in history, clones and caches. Second, store the new value with ansible-vault under a prod vault ID using <code>encrypt_string --stdin-name</code> so it never enters shell history, keep a plain variable name pointing at the vaulted one, and add <code>no_log: true</code> to tasks using it. Third, remove the plaintext from current files, and if policy requires, purge history with git filter-repo and have everyone re-clone, knowing this only limits future readers. Fourth, check CI logs and other places it may have been printed. Finally add secret scanning (gitleaks, push protection) and a written rule that any secret in Git is rotated.</p>`, followUps: ['How would you tell if the old password was used by someone else? (database audit logs, access logs)', 'How do you give CI the vault key? (secret store, temp file)'] });
  interview.push({ q: 'What are the downsides of Ansible, and when would you not use it?', level: 'A', a: `<p>Ansible has no state file, so it cannot reliably remove things you have deleted from code, and drift is only noticed when you run it. Runs over SSH are slower than pull agents for thousands of hosts (mitigate with forks, pipelining, mitosis-style pull with ansible-pull, or Automation Platform). YAML plus Jinja2 gets unreadable with heavy logic, and variable precedence is complex. Idempotency depends on module quality, and shell tasks undermine it. I would not use it for creating cloud infrastructure at scale (Terraform fits better), for fully immutable container platforms where configuration is baked into images and manifests, or for real-time, event-driven control where an agent or Kubernetes controller reconciles continuously.</p>`, followUps: ['What does ansible-pull do?', 'How would you scale to thousands of hosts? (forks, pipelining, execution environments, AWX or Automation Platform)'] });

  registerModule({
    id: 'devops10',
    title: 'Configuration Management with Ansible',
    intro: `<p>Setting up one server by hand is easy. Setting up 20 so that they are <b>identical</b>, and keeping them that way for years, is where people make mistakes. Ansible lets you describe the result you want (nginx installed, this config file, service running) in plain YAML, and then makes every server match it, over SSH, with nothing to install on the servers. This module teaches Ansible the way you use it at work: inventories and groups, ad-hoc commands, playbooks with tasks and handlers, idempotent modules, variables, facts and precedence, Jinja2 templates, roles, collections and Galaxy, ansible-vault for secrets, safe rolling updates, and how Ansible fits next to Terraform.</p>
      <p>Every topic starts from a real situation: nginx on 20 servers, a task that says "changed" every single run, a handler that never fired, a template rolled out one server at a time, a password found in Git, and the question "Terraform or Ansible?". All labs are safe: they run on your own machine, against <code>localhost</code> or throwaway containers, and every secret is a placeholder.</p>`,
    goals: [
      'Write an inventory (INI and YAML) with groups, child groups and variables, select hosts with patterns such as <code>web:&amp;prod:!canary</code>, and check the result with <code>--list-hosts</code> and <code>ansible-inventory --graph</code>',
      'Run ad-hoc commands and write playbooks with named tasks, <code>become</code>, conditions, loops, tags, <code>register</code> and handlers (<code>notify</code>, <code>listen</code>, <code>flush_handlers</code>), and explain why a handler did not fire',
      'Choose idempotent modules over <code>shell</code>, use <code>creates</code>, <code>changed_when</code>, <code>failed_when</code> and check mode with <code>--diff</code>, and prove idempotency by running twice and reading <code>changed=0</code>',
      'Use variables, facts and the precedence ladder correctly, lay out <code>group_vars</code> and <code>host_vars</code>, and find where a value comes from',
      'Render configuration with Jinja2 templates (variables, filters, loops, conditions, <code>hostvars</code>) and validate files before installing them',
      'Build and test roles (<code>ansible-galaxy init</code>, defaults, handlers, dependencies), pin collections and roles in <code>requirements.yml</code>, and lint and test with <code>ansible-lint</code> and Molecule',
      'Protect secrets with <code>ansible-vault</code> (<code>encrypt_string</code>, vault IDs, password files outside the repo) and <code>no_log</code>, and handle a secret committed to Git by rotating it first',
      'Roll changes out safely with <code>serial</code>, <code>max_fail_percentage</code>, <code>block</code>/<code>rescue</code>, health checks, <code>delegate_to</code> and <code>run_once</code>, and explain when to use Terraform and when to use Ansible'
    ],
    prereqs: `<b>Required:</b> <b>Cloud &amp; DevOps 1</b> (Linux for the Cloud) for SSH, users, permissions, packages, services and the filesystem, and <b>Cloud &amp; DevOps 2</b> (Bash Scripting for Operations) for the shell commands, quoting and safe scripting used in every lab. <b>Helpful:</b> <b>Cloud &amp; DevOps 8</b> (Docker) for the throwaway container hosts used in the labs, and <b>Cloud &amp; DevOps 9</b> (Terraform), the provisioning counterpart: Terraform creates the machines, Ansible configures them (the last lesson shows the handoff). You do not need a cloud account.`,
    hours: 12,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
