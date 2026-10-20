(function () {
  var topics = [], practice = [], quiz = [], interview = [];
  var R = String.raw; // raw template: backslashes in shell code stay exactly as typed
  var LAB = 'A throwaway local repo on your own machine, WSL or a container (<code>mkdir lab &amp;&amp; cd lab &amp;&amp; git init</code>). Git 2.30 or newer. No GitHub or GitLab account needed; hosted steps are marked optional.';
  // Compact problem builder: every problem has the same shape; all code is bash.
  function P(o) {
    var p = {
      title: o.t, level: o.l, tags: o.tags, companies: o.co,
      statement: o.s, constraints: o.c || LAB, example: o.ex,
      brute: { why: o.bw },
      mcq: { q: o.q[0], options: o.q[1], answer: o.q[2], explain: o.q[3] },
      hints: o.h,
      solution: { approach: o.a, code: { lang: 'bash', code: o.code }, complexity: o.cx, followUps: o.f },
      tests: { skip: 'command sequence, verified by reading' }
    };
    if (o.bc) p.brute.code = { lang: 'bash', code: o.bc };
    return p;
  }
  function box(id, label, x, y, w) { return { id: id, label: label, x: x, y: y, shape: 'box', w: w || 18 }; }
  function one(k, v) { var h = {}; h[k] = v; return h; }

  // ───────────────────────── Mini Git simulator for the commit-graph visualizers ─────────────────────────
  // Supports: commit [msg] · branch NAME · switch NAME · switch -c NAME · checkout [-b] NAME|COMMIT
  //           merge [--no-ff|--ff-only] NAME · rebase NAME · reset [--soft|--mixed|--hard] REF
  //           revert REF · cherry-pick REF · tag NAME · branch -d NAME
  // Refs: branch, tag, commit label (C3, C4'), HEAD, HEAD~2, main~1.
  function gitSim(script, opts) {
    opts = opts || {};
    var cmds = String(script || '').split(/[;\n]/).map(function (s) { return s.trim(); }).filter(Boolean);
    if (!cmds.length) throw new Error('Type git commands separated by ; for example: commit; switch -c feature; commit; switch main; merge feature');
    if (cmds.length > 24) throw new Error('Use at most 24 commands so the graph stays readable');
    var C = {}, order = [], branches = {}, tags = {}, head = { branch: 'main' }, lanes = { main: 0 }, laneN = 1, reflog = [], plain = 0, merges = 0, k = 0;
    var snaps = [], laneHint = null;
    function laneOf(name) {
      if (!(name in lanes)) {
        if (laneN >= 5) throw new Error('At most 5 branches fit in this picture');
        lanes[name] = laneN++;
      }
      return lanes[name];
    }
    function tip() { return head.branch ? branches[head.branch] : head.detached; }
    function setTip(id) { if (head.branch) branches[head.branch] = id; else head.detached = id; }
    function headName() { return head.branch ? head.branch : 'detached HEAD'; }
    function lab(id) { return id ? C[id].label : '(none)'; }
    function make(parents, msg, label) {
      if (order.length >= 14) throw new Error('At most 14 commits fit in this picture');
      var id = 'k' + (++k);
      var lane = laneHint ? laneOf(laneHint) : head.branch ? laneOf(head.branch) : laneOf('(detached)');
      C[id] = { id: id, parents: parents.filter(Boolean), msg: msg, label: label, lane: lane };
      order.push(id);
      return id;
    }
    function anc(id) {
      var seen = {}, st = id ? [id] : [];
      while (st.length) { var x = st.pop(); if (seen[x]) continue; seen[x] = 1; C[x].parents.forEach(function (p) { st.push(p); }); }
      return seen;
    }
    function resolve(ref) {
      if (!ref) throw new Error('A command needs a branch or commit name');
      var m = ref.match(/^(.+?)~(\d+)$/), base = m ? m[1] : ref, n = m ? Number(m[2]) : 0, id;
      var rl = base.match(/^HEAD@\{(\d+)\}$/);
      if (rl) { if (!reflog[Number(rl[1])]) throw new Error('The reflog has no entry ' + base); id = reflog[Number(rl[1])].id; }
      else if (base === 'HEAD') id = tip();
      else if (base in branches) id = branches[base];
      else if (base in tags) id = tags[base];
      else { for (var i = order.length - 1; i >= 0; i--) if (C[order[i]].label === base) { id = order[i]; break; } }
      if (!id) throw new Error('Unknown branch or commit "' + ref + '"');
      for (var j = 0; j < n; j++) { if (!C[id].parents.length) throw new Error(ref + ' goes back past the first commit'); id = C[id].parents[0]; }
      return id;
    }
    function log(why) { reflog.unshift({ to: lab(tip()), id: tip(), why: why }); if (reflog.length > 8) reflog.pop(); }
    function snap(narr, hl, ehl) {
      snaps.push({ narr: narr, order: order.slice(), branches: JSON.parse(JSON.stringify(branches)), tags: JSON.parse(JSON.stringify(tags)), head: JSON.parse(JSON.stringify(head)), reflog: reflog.slice(), hl: hl || {}, ehl: ehl || {} });
    }
    function newHl(id) { var h = {}; h[id] = 'ok'; var e = {}; C[id].parents.forEach(function (p) { e[id + '-' + p] = 'ok'; }); return { hl: h, ehl: e }; }

    snap(opts.intro || 'An empty repository. Each command you typed becomes one step. Circles are <b>commits</b> (snapshots). Arrows point from a commit to its <b>parent</b>, the commit it was built on, exactly like <code>git log</code> walks history. Labels under a circle are <b>branches</b> and <b>tags</b>: just sticky notes pointing at one commit.');
    cmds.forEach(function (raw) {
      var c = raw.replace(/^git\s+/, '').replace(/\s+/g, ' ');
      var w = c.split(' '), cmd = w[0], h, id, t, i;
      if (cmd === 'commit') {
        var msg = c.replace(/^commit\s*/, '').replace(/^-a?m\s*/, '').replace(/^["']|["']$/g, '') || ('change ' + (plain + 1));
        id = make([tip()], msg, 'C' + (++plain));
        setTip(id); log('commit: ' + msg);
        h = newHl(id);
        snap('<code>git commit</code> "' + H.esc(msg) + '" makes snapshot <b>' + C[id].label + '</b>' + (C[id].parents.length ? ' whose parent is <b>' + lab(C[id].parents[0]) + '</b>' : ' (the very first commit, no parent)') + '. The current branch <b>' + headName() + '</b> moves forward to it. Nothing else moves.', h.hl, h.ehl);
      } else if (cmd === 'branch' && (w[1] === '-d' || w[1] === '-D')) {
        t = w[2];
        if (!(t in branches)) throw new Error('No branch named ' + t);
        if (head.branch === t) { snap('<code>' + H.esc(c) + '</code>: <span class="c-r">git refuses</span>: you cannot delete the branch you are on. Switch to another branch first.', one(branches[t], 'bad')); return; }
        var merged = anc(tip())[branches[t]];
        if (!merged && w[1] === '-d') { snap('<code>' + H.esc(c) + '</code>: <span class="c-r">error: the branch \'' + H.esc(t) + '\' is not fully merged.</span> Its commits are not in ' + headName() + ', so deleting the label would orphan them. Check with <code>git log ' + headName() + '..' + H.esc(t) + '</code>; use <code>-D</code> only if you are sure.', one(branches[t], 'bad')); return; }
        var was = branches[t]; delete branches[t];
        snap('<code>git branch ' + w[1] + ' ' + H.esc(t) + '</code> deletes only the <b>label</b>. ' + (merged ? 'Commit ' + lab(was) + ' stays, because it is already part of ' + headName() + '\'s history.' : 'Commit ' + lab(was) + ' is now unreachable (faded): only the reflog remembers it.'), one(was, merged ? 'cur' : 'bad'));
      } else if (cmd === 'branch' || ((cmd === 'switch' && w[1] === '-c') || (cmd === 'checkout' && w[1] === '-b'))) {
        var create = cmd === 'branch' ? w[1] : w[2];
        if (!create) throw new Error('Name the new branch, e.g. switch -c feature');
        if (create in branches) throw new Error('Branch ' + create + ' already exists');
        var start = cmd === 'branch' && w[2] ? resolve(w[2]) : tip();
        if (!start) throw new Error('Make a commit first: a branch must point at a commit');
        branches[create] = start; laneOf(create);
        if (cmd !== 'branch') { head = { branch: create }; log('checkout: moving to ' + create); }
        snap((cmd === 'branch' ? '<code>git branch ' + H.esc(create) + '</code> creates' : '<code>' + H.esc(c) + '</code> creates and switches to') + ' a new branch <b>' + H.esc(create) + '</b> pointing at <b>' + lab(start) + '</b>. No files are copied: a branch is a 41-byte file holding one commit ID. ' + (cmd === 'branch' ? 'HEAD stays on ' + headName() + '.' : 'HEAD now follows ' + H.esc(create) + ', so the next commit moves it.'), one(start, 'cur'));
      } else if (cmd === 'switch' || cmd === 'checkout') {
        t = w[1] === '--detach' ? w[2] : w[1];
        if (t in branches && w[1] !== '--detach') {
          head = { branch: t }; log('checkout: moving to ' + t);
          snap('<code>' + H.esc(c) + '</code>: HEAD now points at branch <b>' + H.esc(t) + '</b>, so your files change to snapshot <b>' + lab(branches[t]) + '</b>. New commits will move ' + H.esc(t) + '.', one(branches[t], 'cur'));
        } else {
          id = resolve(t); head = { detached: id }; log('checkout: moving to ' + lab(id));
          snap('<code>' + H.esc(c) + '</code>: you checked out a commit, not a branch. This is <b>detached HEAD</b>: fine for looking around, but commits made here belong to no branch. Create one with <code>git switch -c NAME</code> before you leave.', one(id, 'cur'));
        }
      } else if (cmd === 'merge') {
        var mode = w[1] === '--no-ff' || w[1] === '--ff-only' ? w[1] : '';
        t = mode ? w[2] : w[1];
        id = resolve(t);
        var cur = tip(), A = anc(cur);
        if (A[id]) { snap('<code>' + H.esc(c) + '</code>: <b>Already up to date.</b> Every commit of ' + H.esc(t) + ' is already in ' + headName() + ', so there is nothing to do.', one(cur, 'cur')); return; }
        if (anc(id)[cur] && mode !== '--no-ff') {
          setTip(id); log('merge ' + t + ': Fast-forward');
          snap('<code>' + H.esc(c) + '</code>: <b>Fast-forward.</b> ' + headName() + ' had no new commits of its own, so Git just slides the label forward from ' + lab(cur) + ' to <b>' + lab(id) + '</b>. No merge commit, history stays a straight line.', one(id, 'ok'));
          return;
        }
        if (mode === '--ff-only') { snap('<code>' + H.esc(c) + '</code>: <span class="c-r">fatal: Not possible to fast-forward, aborting.</span> The branches have diverged, and you asked for fast-forward only, so nothing changes. Rebase ' + H.esc(t) + ' onto ' + headName() + ' first, or merge without --ff-only.', (function () { var hh = {}; hh[cur] = 'bad'; hh[id] = 'bad'; return hh; })()); return; }
        var other = resolve(t);
        var mid = make([cur, other], 'Merge branch ' + t, 'M' + (++merges));
        setTip(mid); log('merge ' + t + ': Merge made by the ort strategy');
        h = newHl(mid); h.hl[other] = 'cur';
        snap('<code>' + H.esc(c) + '</code>: the branches have <b>diverged</b>' + (mode ? ' (or you asked for --no-ff)' : '') + ', so Git does a <b>three-way merge</b> using their common ancestor and creates merge commit <b>' + C[mid].label + '</b> with <b>two parents</b>: ' + lab(cur) + ' and ' + lab(other) + '. Both histories are kept exactly as they happened.', h.hl, h.ehl);
      } else if (cmd === 'rebase') {
        t = w[1];
        var onto = resolve(t), me = tip();
        if (!head.branch) throw new Error('Switch to a branch before rebasing');
        var AO = anc(onto), mine = [], x = me;
        // commits on my branch that the target does not have (first-parent walk)
        while (x && !AO[x]) { mine.unshift(x); x = C[x].parents[0]; }
        if (!mine.length) { snap('<code>' + H.esc(c) + '</code>: ' + head.branch + ' has no commits that ' + H.esc(t) + ' lacks. Git just fast-forwards it.', one(onto, 'cur')); setTip(onto); return; }
        if (anc(me)[onto]) { snap('<code>' + H.esc(c) + '</code>: <b>Current branch is up to date.</b> ' + head.branch + ' already sits on top of ' + H.esc(t) + '.', one(me, 'cur')); return; }
        snap('<code>' + H.esc(c) + '</code> step 1: Git finds the commits on <b>' + head.branch + '</b> that ' + H.esc(t) + ' does not have: <b>' + mine.map(lab).join(', ') + '</b>. It will replay them, one by one, on top of <b>' + lab(onto) + '</b>.', (function () { var hh = {}; mine.forEach(function (m) { hh[m] = 'cur'; }); hh[onto] = 'sel'; return hh; })());
        var base = onto, copies = [], rbBranch = head.branch, rebasing = { detached: onto };
        head = rebasing; laneHint = rbBranch;
        mine.forEach(function (m) {
          var nid = make([base], C[m].msg, C[m].label + "'");
          copies.push(nid); base = nid;
          var hh = newHl(nid); hh.hl[m] = 'done';
          rebasing.detached = nid;
          snap('Replay <b>' + C[m].label + '</b> → new commit <b>' + C[nid].label + '</b>. Same change, same message, but a <b>new parent</b>, so it gets a <b>new commit ID</b>. That is why rebasing rewrites history. (While a rebase runs, HEAD is detached on the new copy.)', hh.hl, hh.ehl);
        });
        head = { branch: rbBranch }; laneHint = null;
        setTip(base); log('rebase (finish): returning to refs/heads/' + head.branch);
        var fh = {}; copies.forEach(function (n) { fh[n] = 'ok'; }); mine.forEach(function (m) { fh[m] = 'done'; });
        snap('Rebase done: <b>' + head.branch + '</b> now points at <b>' + lab(base) + '</b>. The old commits ' + mine.map(lab).join(', ') + ' are no longer on any branch (faded). Nobody else should be using them, which is the golden rule: <b>only rebase commits you have not shared</b>.', fh);
      } else if (cmd === 'reset') {
        var rm = /^--(soft|mixed|hard)$/.test(w[1]) ? w[1] : '--mixed';
        t = /^--/.test(w[1]) ? w[2] : w[1];
        id = resolve(t); var from = tip();
        setTip(id); log('reset: moving to ' + t);
        var what = { '--soft': 'Your changes stay <b>staged</b>, ready to commit again.', '--mixed': 'Your changes stay in your files but are <b>unstaged</b>.', '--hard': 'Your files are <b>overwritten</b> to match ' + lab(id) + '. Uncommitted work is gone for good.' }[rm];
        var lost = []; var AN = anc(id); var y = from; while (y && !AN[y]) { lost.push(y); y = C[y].parents[0]; }
        var rh = one(id, 'cur'); lost.forEach(function (l) { rh[l] = 'bad'; });
        snap('<code>git reset ' + rm + ' ' + H.esc(t) + '</code> moves <b>' + headName() + '</b> back from ' + lab(from) + ' to <b>' + lab(id) + '</b>. ' + what + (lost.length ? ' Commits ' + lost.map(lab).join(', ') + ' are now on no branch, but the <b>reflog</b> still remembers them for weeks.' : ''), rh);
      } else if (cmd === 'revert') {
        t = w[1]; id = resolve(t);
        var rid = make([tip()], 'Revert "' + C[id].msg + '"', 'C' + (++plain));
        setTip(rid); log('revert: Revert "' + C[id].msg + '"');
        h = newHl(rid); h.hl[id] = 'bad';
        snap('<code>git revert ' + H.esc(t) + '</code> adds a <b>new</b> commit <b>' + C[rid].label + '</b> that applies the exact opposite of ' + lab(id) + ' ("' + H.esc(C[id].msg) + '"). Nothing is deleted and no history is rewritten, so teammates can simply pull it. This is the safe undo for a <b>shared</b> branch.', h.hl, h.ehl);
      } else if (cmd === 'cherry-pick') {
        t = w[1]; id = resolve(t);
        var cid = make([tip()], C[id].msg, C[id].label + "'");
        setTip(cid); log('cherry-pick: ' + C[id].msg);
        h = newHl(cid); h.hl[id] = 'cur';
        snap('<code>git cherry-pick ' + H.esc(t) + '</code> copies the change from ' + lab(id) + ' onto ' + headName() + ' as a new commit <b>' + C[cid].label + '</b> (new ID, same diff). Handy for backporting one fix to a release branch.', h.hl, h.ehl);
      } else if (cmd === 'tag') {
        w = w.filter(function (x) { return x !== '-a'; }); t = w[1];
        if (!t) throw new Error('Name the tag, e.g. tag v1.0.0');
        if (t in tags) throw new Error('Tag ' + t + ' already exists; tags should never move');
        id = w[2] && w[2] !== '-m' ? resolve(w[2]) : tip();
        tags[t] = id;
        snap('<code>git tag ' + H.esc(t) + '</code> sticks a <b>permanent</b> label on <b>' + lab(id) + '</b>. Unlike a branch, a tag never moves when you commit, so "v-something" always means exactly this snapshot.', one(id, 'sel'));
      } else {
        throw new Error('Unknown command "' + raw + '". Try: commit, branch, switch, switch -c, merge, rebase, reset, revert, cherry-pick, tag');
      }
    });
    var norm = function (x) { return String(x || '').replace(/\s+/g, ' ').trim(); };
    if (opts.outro && opts.def !== undefined && norm(opts.def) !== norm(script)) snap('Your own sequence is done. Read the graph left (oldest) to right (newest): arrows point to parents, a circle with two arrows is a merge commit, faded circles are on no branch (only the reflog remembers them), and the labels show exactly where each branch, tag and HEAD point now.', {});
    else if (opts.outro) snap(opts.outro, {});
    // ---- render snapshots into frames (positions are fixed by the final commit count) ----
    var N = order.length, dx = N > 1 ? Math.min(12, 84 / (N - 1)) : 12;
    var H0 = 9 + (laneN - 1) * 15 + 9;
    var lanesNames = Object.keys(lanes).sort(function (a, b) { return lanes[a] - lanes[b]; });
    return snaps.map(function (s) {
      var reach = {};
      Object.keys(s.branches).forEach(function (b) { var a = anc(s.branches[b]); for (var q in a) reach[q] = 1; });
      Object.keys(s.tags).forEach(function (b) { var a = anc(s.tags[b]); for (var q in a) reach[q] = 1; });
      if (s.head.detached) { var ad = anc(s.head.detached); for (var q2 in ad) reach[q2] = 1; }
      var refs = {};
      Object.keys(s.branches).forEach(function (b) { var id2 = s.branches[b]; (refs[id2] = refs[id2] || []).push((s.head.branch === b ? 'HEAD→' : '') + b); });
      Object.keys(s.tags).forEach(function (b) { (refs[s.tags[b]] = refs[s.tags[b]] || []).push(b); });
      if (s.head.detached) (refs[s.head.detached] = refs[s.head.detached] || []).unshift('HEAD');
      var nodes = [], edges = [], hl = {}, tg = {};
      s.order.forEach(function (id2) {
        var cm = C[id2];
        nodes.push({ id: id2, label: cm.label, x: 8 + order.indexOf(id2) * dx, y: 9 + cm.lane * 15 });
        cm.parents.forEach(function (p) { edges.push([id2, p]); });
        if (refs[id2]) tg[id2] = refs[id2].join(', ');
        if (!reach[id2]) { hl[id2] = 'done'; if (!tg[id2]) tg[id2] = '(reflog only)'; }
      });
      for (var hk in s.hl) hl[hk] = s.hl[hk];
      if (!nodes.length) nodes.push({ id: 'empty', label: 'no commits', x: 50, y: 9, shape: 'box', w: 22 });
      var vals = { HEAD: s.head.branch ? '→ ' + s.head.branch : 'detached at ' + lab(s.head.detached) };
      Object.keys(s.branches).forEach(function (b) { vals[b] = lab(s.branches[b]); });
      Object.keys(s.tags).forEach(function (b) { vals['tag ' + b] = lab(s.tags[b]); });
      var parts = [
        { type: 'graph', label: 'commit graph (lanes: ' + lanesNames.join(', ') + ')', directed: true, height: Math.max(H0, 20), nodes: nodes, edges: edges, hl: hl, ehl: s.ehl, tags: tg },
        { type: 'vars', label: 'refs: what each name points at', vals: vals }
      ];
      if (opts.reflog && s.reflog.length) parts.push({ type: 'table', label: 'git reflog (newest first)', columns: ['entry', 'HEAD was at', 'why'], rows: s.reflog.map(function (r, i) { return ['HEAD@{' + i + '}', r.to, r.why]; }), hl: { 0: 'cur' } });
      return { narr: s.narr, parts: parts };
    });
  }

  // ───────────────────────── Topic 1: commits and the three areas ─────────────────────────
  topics.push({
    title: 'Commits and the Commit Graph: Snapshots, the Staging Area and Clean History',
    analogy: `<p>Think of a <b>photo album of your project</b>. Your desk is messy while you work (the <b>working tree</b>). When something is worth keeping, you put the pieces you want into a <b>photo frame</b> (the <b>staging area</b>) and then take the picture (a <b>commit</b>). Every photo is glued onto the page after the previous one, with a note saying who took it, when and why. You can always flip back to any photo, and nobody can secretly repaint an old one without it showing.</p>`,
    explain: `<p>🟢 <b>What Git is.</b> Git is a <b>version control system</b>: it records snapshots of a folder over time so you can see what changed, go back, and work in parallel with other people. It is <b>distributed</b>: every clone has the full history, so you can commit, branch and look at old versions with no network. GitHub and GitLab are websites that <i>host</i> a copy and add teamwork tools on top; Git itself is the program on your machine.</p>
      <p>🟢 <b>The three places your files live.</b></p>
      ${H.table(['Area', 'Plain meaning', 'Command that moves things in'], [
        ['Working tree', 'the files you see and edit', 'you edit; <code>git restore FILE</code> throws away edits'],
        ['Staging area (index)', 'the next photo you are framing', '<code>git add FILE</code>; <code>git restore --staged FILE</code> takes it back out'],
        ['Repository (<code>.git</code>)', 'the album of saved commits', '<code>git commit -m "message"</code>']
      ])}
      <p>🟢 <b>A commit</b> is a full snapshot of every tracked file plus a small label: author, date, message and a pointer to its <b>parent</b> commit. Its ID is a long hash such as <code>3f9a1c2…</code> calculated from all of that content, so if anything changes, the ID changes. Commits pointing to parents form the <b>commit graph</b>: the picture you will see in every topic of this module.</p>
      <p>🔵 <b>The daily loop.</b> <code>git status</code> (what changed?) → <code>git diff</code> (show me the edits) → <code>git add -p</code> or <code>git add FILE</code> (pick what goes in) → <code>git diff --staged</code> (check the frame) → <code>git commit</code> → <code>git log --oneline --graph</code> (see the album).</p>
      <p>🔵 <b>Good commits</b> are <b>small and about one thing</b> ("Raise web replicas to 3", not "stuff"). The message has a short subject line (about 50 characters, imperative mood: "Add", "Fix", "Remove"), a blank line, then a body saying <i>why</i>. Many teams use <b>Conventional Commits</b> (<code>feat:</code>, <code>fix:</code>, <code>chore:</code>) so tools can build release notes automatically (see topic 8). Good messages are what you will read at 3 a.m. when you need to know why a config changed.</p>`,
    clues: [
      '"what is the difference between git add and git commit" → staging area (index) vs repository',
      '"I committed the wrong file / typo in the message, not pushed yet" → <code>git commit --amend</code>',
      '"only commit part of my changes" → <code>git add -p</code> (patch mode)',
      '"who changed this line and why" → <code>git log -p FILE</code>, <code>git blame FILE</code>, <code>git show SHA</code>',
      '"Git is distributed" / "works offline" → every clone has the full history',
      '"history is tamper-evident" → commit IDs are hashes of content plus parent IDs'
    ],
    code: [R`# Lab 1: a throwaway repo. Safe to delete at any time with: cd .. && rm -rf lab
mkdir lab && cd lab
git init -b main                         # new repo, first branch called main
git config user.name "Lab Learner"       # identity stored in every commit (repo-local here)
git config user.email "learner@example.com"

printf 'service: web\nreplicas: 2\n' > app.yaml
git status                               # app.yaml is "untracked"
git add app.yaml                         # put it in the staging area
git status                               # now "Changes to be committed"
git commit -m "Add web service config"   # first snapshot

sed -i 's/replicas: 2/replicas: 3/' app.yaml   # on macOS: sed -i '' 's/.../.../' app.yaml
git diff                                 # working tree vs staging area
git add app.yaml
git diff --staged                        # staging area vs last commit
git commit -m "Raise web replicas to 3" -m "Traffic doubled after the launch; 2 pods hit 90% CPU."

git log --oneline --graph --decorate     # the album, newest first
git show HEAD                            # what the last commit changed`, { lang: 'bash', title: 'Peek inside .git (read-only, safe)', code: R`git cat-file -t HEAD          # "commit"
git cat-file -p HEAD          # tree ID, parent ID, author, committer, message
git cat-file -p 'HEAD^{tree}' # the snapshot: one line per file (blob ID + name)
ls .git                       # HEAD, refs/, objects/, config ...
cat .git/HEAD                 # "ref: refs/heads/main" - HEAD points at a branch
cat .git/refs/heads/main      # the branch is just a file holding one commit ID` }],
    codeTitle: ['First repo, first commits', 'What a commit really is'],
    viz: [{
      title: 'Working tree → staging area → commit',
      input: 'edit app.yaml; edit README.md; add app.yaml; commit; edit app.yaml; add .; commit; edit app.yaml; restore app.yaml',
      inputLabel: 'steps separated by ; (edit F, add F, add ., commit, restore F, restore --staged F)',
      gen: function (input) {
        var cmds = String(input || '').split(';').map(function (s) { return s.trim(); }).filter(Boolean);
        if (!cmds.length || cmds.length > 14) throw new Error('Give 1-14 steps like: edit app.yaml; add app.yaml; commit');
        var files = {}, names = [], commits = 0, f = [];
        function st(n) {
          var x = files[n];
          if (x.head === null && x.index === null) return 'untracked';
          if (x.index !== x.head && x.work !== x.index) return 'staged + more edits';
          if (x.index !== x.head) return x.head === null ? 'new file (staged)' : 'modified (staged)';
          if (x.work !== x.index) return 'modified (not staged)';
          return 'clean';
        }
        function v(n) { return n === null ? '-' : 'v' + n; }
        function frame(narr, hot, arrow) {
          var rows = names.map(function (n) { return [n, v(files[n].work), v(files[n].index), v(files[n].head), st(n)]; });
          var hl = {}; names.forEach(function (n, i) { if (n === hot || hot === '*') hl[i] = 'cur'; });
          var ehl = {}; if (arrow) ehl[arrow] = 'ok';
          f.push({ narr: narr, parts: [
            { type: 'graph', label: 'where your changes move', directed: true, height: 22, nodes: [box('w', 'working tree', 14, 11, 22), box('i', 'staging area', 50, 11, 22), box('r', 'repository', 86, 11, 22)], edges: [['w', 'i', 'add'], ['i', 'r', 'commit']].concat(arrow === 'i-w' ? [['i', 'w', 'restore']] : arrow === 'r-i' ? [['r', 'i', 'restore --staged']] : []), ehl: ehl, hl: arrow ? one(arrow.split('-')[1], 'ok') : {} },
            { type: 'table', label: 'git status, file by file (v = version of the file)', columns: ['file', 'working tree', 'staging area', 'last commit', 'git status says'], rows: rows.length ? rows : [['(no files yet)', '-', '-', '-', '-']], hl: hl }
          ] });
        }
        frame('A new, empty repo (<code>git init</code>). Three places matter: the files you edit, the <b>staging area</b> where you build the next snapshot, and the repository of saved commits.', null, null);
        cmds.forEach(function (c) {
          var m = c.match(/^(edit|add|restore|commit)(?:\s+(--staged)?\s*(\S+)?)?/), name;
          if (!m) throw new Error('Unknown step "' + c + '". Use edit F, add F, add ., commit, restore F, restore --staged F');
          name = m[3];
          if (m[1] === 'edit') {
            if (!name) throw new Error('edit needs a file name');
            if (!files[name]) { if (names.length >= 5) throw new Error('At most 5 files'); files[name] = { work: 0, index: null, head: null }; names.push(name); }
            files[name].work += 1;
            frame('You edit <b>' + H.esc(name) + '</b> (now v' + files[name].work + '). Only the working tree changes. Git notices but saves nothing yet: <code>git status</code> shows it as <b>' + st(name) + '</b>.', name, null);
          } else if (m[1] === 'add') {
            var list = name === '.' ? names.slice() : [name];
            list.forEach(function (n) { if (!files[n]) throw new Error('No file ' + n + ' to add; edit it first'); files[n].index = files[n].work; });
            frame('<code>git add ' + H.esc(name || '') + '</code> copies the current version into the <b>staging area</b>. ' + (name === '.' ? 'The dot means "every changed file here" - convenient, but it is also how a stray <code>.env</code> gets committed. Check <code>git status</code> first.' : 'You choose exactly what goes into the next commit.'), name === '.' ? '*' : name, 'w-i');
          } else if (m[1] === 'commit') {
            var ch = names.filter(function (n) { return files[n].index !== files[n].head; });
            if (!ch.length) { frame('<code>git commit</code>: <b>nothing to commit</b>. Edits that are not staged are not included - you must <code>git add</code> them first.', null, null); return; }
            commits++;
            ch.forEach(function (n) { files[n].head = files[n].index; });
            frame('<code>git commit</code> saves the staging area as commit <b>C' + commits + '</b> (files: ' + ch.map(H.esc).join(', ') + '). Edits still only in the working tree are <b>not</b> in it.', '*', 'i-r');
          } else if (m[1] === 'restore') {
            if (!name || !files[name]) throw new Error('restore needs a known file name');
            if (m[2]) { files[name].index = files[name].head; frame('<code>git restore --staged ' + H.esc(name) + '</code> takes the file back out of the staging area. Your edits stay in the working tree, so nothing is lost.', name, 'r-i'); }
            else { files[name].work = files[name].index === null ? files[name].work : files[name].index; frame('<code>git restore ' + H.esc(name) + '</code> throws away the <b>unstaged</b> edits and puts back the staged (or committed) version. Careful: those edits were never saved, so Git cannot bring them back.', name, 'i-w'); }
          }
        });
        frame('Summary: <b>edit</b> changes the working tree, <b>add</b> builds the next snapshot, <b>commit</b> saves it forever. <code>git diff</code> compares working tree vs staging; <code>git diff --staged</code> compares staging vs last commit.', '*', null);
        return f;
      }
    }, {
      title: 'Commits form a chain: each one points at its parent',
      input: 'commit Add web config; commit Raise replicas to 3; commit Add health check; tag v0.1.0; commit Fix typo in README',
      inputLabel: 'git commands separated by ; (commit MESSAGE, tag NAME)',
      gen: function (input) {
        return gitSim(input, { def: this && this.input, outro: 'This straight line is the simplest history. HEAD → main means "you are on main". Every later topic grows this picture: branches add lanes, merges join them, rebases copy commits, and resets move labels.' });
      }
    }],
    examples: [
      { title: 'Two unrelated changes, two commits with add -p', html: `<p>You fixed a typo in <code>README.md</code> and raised a memory limit in <code>app.yaml</code>, and you also left a debug line in <code>app.yaml</code>. A reviewer wants each idea in its own commit. <code>git add -p app.yaml</code> walks through each <b>hunk</b> (block of changes) and asks y/n, so you stage only the memory change. The debug line stays unstaged and you throw it away with <code>git restore</code>.</p>`, code: `git status --short             # " M README.md" and " M app.yaml"
git add -p app.yaml            # answer y for the memory hunk, n for the debug hunk
git commit -m "Raise web memory limit to 512Mi"
git add README.md
git commit -m "Fix typo in README setup section"
git restore app.yaml           # drop the leftover debug line (unstaged, so it is gone)
git log --oneline -n 2` },
      { title: 'Fix the last commit before pushing: --amend', html: `<p>You committed, then noticed you forgot <code>CHANGELOG.md</code> and the message says "Fxi". Because you have <b>not pushed</b>, you can replace the last commit. <code>--amend</code> makes a brand-new commit with a new ID; the old one is dropped from the branch. If you <b>had</b> pushed, amending would rewrite shared history (topic 3 explains why that hurts).</p>`, code: `git add CHANGELOG.md
git commit --amend -m "Fix health check path in app.yaml"
git log --oneline -n 1          # new ID, new message, includes CHANGELOG.md` },
      { title: 'Ticket: "who changed the replicas and why?"', html: `<p>Production runs 1 replica instead of 3. Instead of guessing, ask history. <code>git log -p -G'replicas' -- app.yaml</code> lists commits whose diff added or removed a line containing that word. <code>git blame</code> shows the last commit for each line. <code>git show</code> on that commit gives the author, date and message. This is why good messages matter: "temp" tells you nothing, "Lower replicas to 1 during DB migration (revert after)" tells you exactly what to do.</p>`, code: `git log --oneline -- app.yaml           # commits touching this file
git log -p -G'replicas' -- app.yaml     # commits whose diff touches a line matching 'replicas'
git blame -L '/replicas/,+1' app.yaml   # last commit to touch the replicas line
git show --stat HEAD~1                  # author, date, message, files changed` },
      { title: 'Writing a commit message people can use', html: `<p>Weak: ${H.c('r', 'update')}. Strong:</p><pre>fix(web): raise readiness timeout to 10s

The new image loads a 200 MB model at startup and needed ~7s,
so pods were killed before becoming ready (CrashLoopBackOff).
Refs: OPS-412</pre><p>Subject in imperative mood, under ~50 characters, optional type prefix; a blank line; then the <b>why</b> and a ticket link. <code>git commit</code> without <code>-m</code> opens your editor for multi-line messages (set it with <code>git config --global core.editor "nano"</code>).</p>` }
    ],
    deepDive: `<p>🟣 <b>Git is a content-addressed database.</b> Inside <code>.git/objects</code> there are four object types: a <b>blob</b> (a file's bytes), a <b>tree</b> (a folder listing: names → blob or tree IDs), a <b>commit</b> (a top tree ID, parent IDs, author, committer, message) and an annotated <b>tag</b>. Each object's ID is the hash of its content, so identical files are stored once, and changing one byte in an old file would change its blob ID, the tree IDs above it, and every commit ID after it. That chain is why Git history is tamper-evident and why "rewriting history" always produces new IDs. Git still uses SHA-1 by default (hardened against the known collision attack) and supports SHA-256 repositories with <code>git init --object-format=sha256</code>; the project is moving toward SHA-256 as the default.</p>
      <p><b>Snapshots, not diffs.</b> Conceptually every commit is a full snapshot; the diffs you see are computed on demand. On disk, Git packs objects into <b>packfiles</b> with delta compression (<code>git gc</code>), so history stays small. Branches are tiny files in <code>.git/refs/heads/</code> (or packed into <code>.git/packed-refs</code>), and <code>HEAD</code> is a file saying which branch you are on.</p>
      <p><b>The index</b> (<code>.git/index</code>) is a binary list of the paths, modes and blob IDs for the next commit, plus file timestamps so <code>git status</code> is fast. Production gotchas: line endings (set <code>core.autocrlf</code> on Windows or, better, a <code>.gitattributes</code> with <code>* text=auto</code>); file mode changes showing as diffs on shared drives (<code>core.fileMode</code>); and large binaries bloating the repo forever - use <b>Git LFS</b> for big assets and never commit build output, dumps or Terraform state.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> editors and CLIs can draft commit messages from the staged diff, and coding agents now make commits and open pull requests on their own. That saves typing, but a generated message describes <i>what</i> changed (which the diff already shows) and often guesses the <i>why</i>. Edit it so the reason, ticket and risk are correct; you are the author on record.</p>
      <p><b>Watch the staging step.</b> Agents and scripts love <code>git add -A</code>, which happily stages <code>.env</code> files, debug dumps and large binaries. Review <code>git status</code> and <code>git diff --staged</code> before any commit, whether you or a tool made it, and keep a good <code>.gitignore</code> plus a secret-scanning hook (topic 7). Many teams mark AI help with a <code>Co-authored-by:</code> trailer and require agents to work on their own branch so a human reviews every change before it reaches main.</p>`,
    problems: [P({
      t: 'Turn a messy working folder into one clean commit', l: 'Easy', tags: ['status', 'add -p', 'restore', 'commit'], co: ['Infosys', 'Accenture'],
      s: `<p>In your lab repo, <code>app.yaml</code> has two edits: <code>replicas: 2</code> → <code>replicas: 3</code> (wanted) and a new line <code>debug: true</code> (left over from testing). You also created <code>notes.txt</code>, which should never be committed. Commit <b>only</b> the replicas change with a good message, throw away the debug line, and leave <code>notes.txt</code> out of Git.</p>`,
      ex: `<p>Before: <code>git status --short</code> → ${H.c('y', ' M app.yaml')} and ${H.c('r', '?? notes.txt')}. After: <code>git log -1 --stat</code> shows ${H.c('g', 'Raise web replicas to 3 · app.yaml | 2 +-')} and <code>git status --short</code> shows only <code>?? notes.txt</code> (or nothing, once it is in <code>.git/info/exclude</code>).</p>`,
      bw: `<p><code>git add . &amp;&amp; git commit -m "changes"</code>. It commits the debug flag (which may turn on verbose logs in production) and the private notes file, and the message tells future readers nothing.</p>`,
      bc: `git add .
git commit -m "changes"     # debug: true and notes.txt are now in history`,
      q: ['Which command lets you stage the replicas edit but not the debug line in the same file?', ['<code>git add -p app.yaml</code>', '<code>git add app.yaml</code>', '<code>git commit -a</code>', '<code>git stash</code>'], 0, 'Patch mode shows each hunk and lets you answer y or n, so one file can contribute only part of its changes to the commit. git add FILE and commit -a take the whole file.'],
      h: ['<p>Hint 1: start with <code>git status --short</code> and <code>git diff</code> so you know exactly what changed.</p>', '<p>Hint 2: <code>git add -p</code> stages hunk by hunk; if both edits are in one hunk, press <code>s</code> to split it or <code>e</code> to edit it.</p>', '<p>Hint 3: check with <code>git diff --staged</code>, commit, then <code>git restore app.yaml</code> drops the unstaged debug line. Keep <code>notes.txt</code> out with <code>.git/info/exclude</code> (local only) or <code>.gitignore</code> (shared).</p>'],
      a: `<p>Look first (<code>status</code>, <code>diff</code>), then stage only the wanted hunk with <code>git add -p</code> and verify with <code>git diff --staged</code>. Commit with an imperative subject and a short why. What is left unstaged in <code>app.yaml</code> is only the debug line, so <code>git restore app.yaml</code> resets the file to the version you just committed. For <code>notes.txt</code>, a personal file, add it to <code>.git/info/exclude</code>, which works like <code>.gitignore</code> but is never shared. Graph effect: one new commit on main; the working tree ends clean.</p>`,
      code: R`# Setup (run once in an empty folder) so you can practise
mkdir lab && cd lab && git init -b main
printf 'service: web\nreplicas: 2\n' > app.yaml
git add app.yaml && git commit -m "Add web service config"
printf 'service: web\nreplicas: 3\ndebug: true\n' > app.yaml
echo "call Sam about quota" > notes.txt

# 1. Look before you act
git status --short           # " M app.yaml" and "?? notes.txt"
git diff                     # shows both the replicas edit and the debug line

# 2. Stage only the wanted change (answer y / n per hunk; s splits, e edits a hunk)
git add -p app.yaml
git diff --staged            # must show replicas 2 -> 3 and nothing else

# 3. Commit with a useful message
git commit -m "Raise web replicas to 3" -m "Two pods ran at 90% CPU after the launch."

# 4. Throw away the leftover debug line (it was never committed, so it is gone)
git restore app.yaml

# 5. Keep the personal notes out of Git without touching the shared .gitignore
echo "notes.txt" >> .git/info/exclude
git status --short           # clean
git log --oneline --stat -n 1`,
      cx: `<p>Five commands. Graph: main gains exactly one small commit. Risk: <code>git restore</code> deletes unstaged edits for good, so only run it after <code>git diff</code> shows nothing you want.</p>`,
      f: ['If you had already committed <code>debug: true</code> but not pushed, how would you fix it?', 'What is the difference between <code>.gitignore</code> and <code>.git/info/exclude</code>?']
    })]
  });

  // ───────────────────────── Topic 2: branches and merging ─────────────────────────
  topics.push({
    title: 'Branches and Merging: Fast-Forward vs Merge Commit',
    analogy: `<p>A branch is a <b>bookmark</b>, not a photocopy of the book. Two people can each put their own bookmark in the same book and keep writing new pages after it. When one of them finished on top of the other's page, joining is easy: just move the first bookmark forward (<b>fast-forward</b>). When both wrote different new pages, you need a <b>joining page</b> that says "both stories continue from here" (a <b>merge commit</b>).</p>`,
    explain: `<p>🟢 <b>A branch is a movable label</b> that points at one commit. When you commit, the branch you are on moves forward to the new commit. <b>HEAD</b> is a second label that says which branch you are on. Creating a branch is instant and costs a few bytes, so make one for every task: <code>git switch -c fix-login-timeout</code>.</p>
      <p>🟢 <b>Why branch?</b> Your half-finished work stays away from <code>main</code>, which should always be deployable. Several people (or several tasks) can move forward in parallel, and each piece of work is reviewed and merged when ready.</p>
      ${H.table(['Command', 'What it does'], [
        ['<code>git switch -c NAME</code>', 'create a branch here and move onto it (older form: <code>git checkout -b NAME</code>)'],
        ['<code>git switch NAME</code>', 'move HEAD to another branch; your files change to its snapshot'],
        ['<code>git branch -vv</code>', 'list branches with their last commit and remote tracking info'],
        ['<code>git merge NAME</code>', 'bring NAME\'s commits into the current branch'],
        ['<code>git branch -d NAME</code>', 'delete a branch label that is already merged (safe)'],
        ['<code>git log --oneline --graph --all</code>', 'draw every branch as a graph in the terminal']
      ])}
      <p>🔵 <b>The two kinds of merge.</b></p>
      ${H.table(['Situation', 'What Git does', 'Result'], [
        ['main has no new commits since you branched', '<b>fast-forward</b>: slide the main label forward', 'straight line, no extra commit'],
        ['both branches have new commits (diverged)', '<b>three-way merge</b> from the common ancestor', 'a merge commit with <b>two parents</b>'],
        ['you pass <code>--no-ff</code>', 'always create a merge commit', 'keeps a visible "feature X merged" bump'],
        ['you pass <code>--ff-only</code>', 'fast-forward or refuse', 'never creates surprise merge commits']
      ])}
      <p>🔵 <b>Three-way merge in one sentence:</b> Git compares both tips to their <b>merge base</b> (the last commit they share). Lines changed on only one side are taken automatically. Lines changed differently on both sides are a <b>conflict</b> you resolve by hand (topic 4).</p>`,
    clues: [
      '"what is a fast-forward merge" → target has no new commits; the label just moves',
      '"why is there a merge commit with two parents" → branches diverged, three-way merge',
      '"keep main always deployable" → short-lived feature branches merged after review',
      '"pull created an ugly merge commit" → set <code>pull.ff only</code> or <code>pull.rebase true</code>',
      '"clean up old branches" → <code>git branch --merged main</code> then <code>git branch -d</code>',
      '"show only the merges into main" → <code>git log --first-parent main</code>'
    ],
    code: R`# Lab 2: branches and both kinds of merge (continue in your lab repo)
git switch -c feature/healthcheck          # new branch at the current commit
printf 'healthcheck: /healthz\n' >> app.yaml
git commit -am "Add health check path"     # -a stages tracked, modified files
git switch main
git merge feature/healthcheck              # "Fast-forward": main had nothing new
git log --oneline --graph --all

# Now make the branches diverge
git switch -c feature/logging
printf 'logLevel: info\n' >> app.yaml
git commit -am "Add log level"
git switch main
printf '# owner: platform-team\n' > OWNERS
git add OWNERS && git commit -m "Add OWNERS file"
git merge --no-edit feature/logging        # "Merge made by the 'ort' strategy."
git log --oneline --graph --all            # a merge commit with two parents

git branch --merged main                   # branches fully contained in main
git branch -d feature/healthcheck feature/logging`,
    codeTitle: 'Branching and merging lab',
    viz: [{
      title: 'Fast-forward: main just slides forward',
      input: 'commit Add config; commit Add Dockerfile; switch -c feature; commit Add health check; commit Add readiness probe; switch main; merge feature; branch -d feature',
      inputLabel: 'git commands separated by ;',
      gen: function (input) { return gitSim(input, { def: this && this.input, outro: 'Because main never moved while feature was being built, the merge is a fast-forward: no new commit, the history is a straight line, and the feature label can be deleted. Try adding <code>--no-ff</code> to the merge to force a merge commit.' }); }
    }, {
      title: 'Diverged branches: a three-way merge commit',
      input: 'commit Add config; commit Add Dockerfile; switch -c feature; commit Add logging; commit Tune log level; switch main; commit Hotfix port; merge feature',
      inputLabel: 'git commands separated by ;',
      gen: function (input) { return gitSim(input, { def: this && this.input, outro: 'The merge commit has two parents, so <code>git log --graph</code> shows a diamond. <code>git log --first-parent main</code> walks only the left-hand parent and reads like "what landed on main, one merge at a time".' }); }
    }],
    examples: [
      { title: 'Daily flow: one branch per ticket', html: `<p>Ticket OPS-77 asks for a readiness probe. You branch from an up-to-date main, commit in small steps, and merge back when done. The branch name says what it is for; many teams prefix with the ticket ID so tools link them.</p>`, code: `git switch main && git pull --ff-only     # start from the latest main
git switch -c OPS-77-readiness-probe
# ...edit, then:
git commit -am "Add readiness probe to web deployment"
git switch main && git merge --ff-only OPS-77-readiness-probe
git branch -d OPS-77-readiness-probe` },
      { title: '"Not fully merged" saves you from losing work', html: `<p><code>git branch -d old-experiment</code> answers ${H.c('r', "error: the branch 'old-experiment' is not fully merged")}. Git is warning that the branch has commits no other branch contains: deleting the label would orphan them. Look first with <code>git log main..old-experiment</code> (commits on the branch but not on main). Only use <code>-D</code> when you are sure, and remember the reflog can still bring them back for a while.</p>`, code: `git log --oneline main..old-experiment   # what would be lost
git branch -D old-experiment             # force delete only after checking` },
      { title: 'Make pull safe: --ff-only by default', html: `<p>A plain <code>git pull</code> is <code>fetch</code> + <code>merge</code>. If you have local commits and the remote does too, it silently creates a "Merge branch 'main' of github.com…" commit. Setting <code>pull.ff only</code> makes pull refuse in that case so you decide: rebase your local commits (topic 3) or merge on purpose.</p>`, code: `git config --global pull.ff only          # pull fails instead of making surprise merges
git pull                                  # "fatal: Not possible to fast-forward, aborting."
git pull --rebase                         # replay your local commits on top instead` },
      { title: 'Reading a merge in the log', html: `<p>A merge commit lists two parents. <code>HEAD^1</code> is the branch you were on (main), <code>HEAD^2</code> is the branch you merged in. <code>git diff HEAD^1 HEAD</code> shows everything the feature brought to main. This is exactly what you need later to revert a whole merged feature with <code>git revert -m 1</code> (topic 5).</p>`, code: `git log -1 --format='%H%nparents: %P' HEAD   # two parent IDs for a merge
git diff --stat HEAD^1 HEAD                   # what the merge brought into main
git log --oneline --first-parent -n 10 main   # one line per merge on main` }
    ],
    deepDive: `<p>🟣 <b>Merge base and strategy.</b> <code>git merge-base main feature</code> prints the best common ancestor. Since Git 2.34 the default strategy is <b>ort</b> (it replaced <b>recursive</b>): faster, better at renames, same three-way idea. When there are several equally good common ancestors (criss-cross merges), ort merges them into a virtual base first. Per-file, Git takes a change if only one side touched a region; if both changed the same region differently it writes conflict markers.</p>
      <p><b>Merge commit vs squash vs rebase-merge</b> (the three buttons on GitHub and GitLab): a <b>merge commit</b> keeps every commit and records when the feature landed; a <b>squash merge</b> turns the whole branch into one new commit on main (clean history, but the branch's commits are not ancestors of main, so <code>git branch -d</code> says "not fully merged" and you delete with <code>-D</code>); a <b>rebase merge</b> replays the commits onto main for a linear history. Teams pick one and enforce it in repository settings.</p>
      <p><b>HEAD^ vs HEAD~.</b> <code>~n</code> follows the <i>first</i> parent n times (back along main); <code>^n</code> picks the n-th parent of a merge. <code>A..B</code> means "commits reachable from B but not from A" and is the everyday way to ask "what is on my branch that main does not have" (<code>main..HEAD</code>) or "what came in from upstream" (<code>HEAD..origin/main</code>). Octopus merges (more than two parents) exist but are rare outside tooling.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> assistants can explain a confusing <code>git log --graph</code>, write the right <code>A..B</code> range for a question, or summarise "what did this branch change" from <code>git diff main...HEAD</code>. Merge decisions are quick to automate (merge queues and bots that keep branches up to date), so the human part shifts to choosing the team's merge style and reviewing what lands.</p>
      <p><b>Where it goes wrong:</b> a model may say "just use <code>git branch -D</code>" to clear the "not fully merged" error, or suggest <code>git merge -X theirs</code> to make conflicts disappear, which silently throws away one side's changes. Ask it to explain what each flag does to the <b>graph</b>, and check with <code>git log main..BRANCH</code> before deleting anything. Your job is still the mental model: labels move, commits stay, merges join histories.</p>`,
    problems: [P({
      t: 'Urgent hotfix while you are halfway through a feature', l: 'Medium', tags: ['switch', 'stash', 'merge', 'fast-forward'], co: ['Flipkart', 'Thoughtworks'],
      s: `<p>You are on branch <code>feature/caching</code> with <b>uncommitted</b> edits in <code>cache.yaml</code>. Production needs a one-line fix right now: in <code>app.yaml</code> the port must change from <code>8080</code> to <code>8081</code>. Ship the fix on <code>main</code> through its own short branch, without mixing your caching work into it, then continue your feature on top of the fixed main.</p>`,
      ex: `<p>Graph after: ${H.c('g', 'main: C1 - C2 - Fix')} (fast-forwarded from <code>hotfix/port</code>), and ${H.c('b', 'feature/caching')} has a merge commit (or is rebased) so it contains the fix. Your caching edits are back in the working tree, untouched.</p>`,
      bw: `<p>Fixing the port directly on <code>feature/caching</code> and pushing that branch, or committing everything together with <code>git commit -am "fix + wip"</code>. The urgent fix is now stuck behind unfinished, unreviewed caching code, and reverting one means reverting both.</p>`,
      bc: `git commit -am "fix port + caching wip"   # urgent fix tied to half-done work
git push origin feature/caching`,
      q: ['You have uncommitted edits and must switch branches. What is the cleanest temporary option?', ['<code>git stash push -m "caching wip"</code>, switch, later <code>git stash pop</code>', '<code>git reset --hard</code>', 'Delete the branch and start again', '<code>git switch -f main</code>'], 0, 'stash saves your working-tree and staged edits as a hidden commit and cleans the folder, so you can switch safely and restore them later. reset --hard and switch -f throw the edits away.'],
      h: ['<p>Hint 1: park the unfinished work first: <code>git stash push -m "..."</code> (or a quick "WIP" commit on the feature branch).</p>', '<p>Hint 2: branch the hotfix from <b>main</b>, not from your feature branch, so it contains only the fix. Merge it back with <code>--ff-only</code>.</p>', '<p>Hint 3: go back to the feature, bring main in with <code>git merge main</code> (or rebase, topic 3), then <code>git stash pop</code>. Check <code>git log --graph --all</code> at each step.</p>'],
      a: `<p>1) <code>git stash push</code> saves the caching edits and leaves a clean tree. 2) Switch to main and create <code>hotfix/port</code> <b>from main</b>, so the fix has no feature code in it. 3) Make the one-line change and commit with a clear message. 4) Switch to main and <code>merge --ff-only</code>: main had no new commits, so it simply moves forward; delete the hotfix branch. (In a team you would push the hotfix branch and open a pull request instead.) 5) Switch back to the feature and <code>git merge main</code> so the feature contains the fix; this creates a merge commit because the branches diverged. 6) <code>git stash pop</code> restores your caching edits. Graph: main gets one commit; the feature gets a merge commit joining main.</p>`,
      code: R`# Setup for practice: main with app.yaml, a feature branch with one commit and uncommitted edits
mkdir lab && cd lab && git init -b main
printf 'service: web\nport: 8080\n' > app.yaml
git add app.yaml && git commit -m "Add web config"
git switch -c feature/caching
printf 'ttl: 60\n' > cache.yaml && git add cache.yaml && git commit -m "Add cache config"
printf 'ttl: 300\n' > cache.yaml             # uncommitted work in progress

# 1. Park the unfinished work (tracked edits; add -u for untracked files)
git stash push -m "caching wip"
git status --short                          # clean

# 2. Branch the hotfix from main, not from the feature
git switch main
git switch -c hotfix/port

# 3. Make and commit the one-line fix
sed -i 's/port: 8080/port: 8081/' app.yaml
git commit -am "Fix web port to 8081 to match the load balancer"

# 4. Bring it into main (fast-forward only) and clean up
git switch main
git merge --ff-only hotfix/port
git branch -d hotfix/port
git log --oneline --graph --all

# 5. Continue the feature on top of the fixed main
git switch feature/caching
git merge --no-edit main                    # merge commit: the branches diverged
git stash pop                               # caching edits are back
git log --oneline --graph --all`,
      cx: `<p>About ten commands. Graph: one new commit on main (fast-forward), one merge commit on the feature. Risk: low; the stash keeps your edits even if you get interrupted (<code>git stash list</code>).</p>`,
      f: ['What would change if you used <code>git rebase main</code> instead of <code>git merge main</code> on the feature?', 'How would the hotfix also reach an already-cut <code>release/1.4</code> branch?']
    })]
  });

  // ───────────────────────── Topic 3: rebase, rewriting history, force-push ─────────────────────────
  // Three repos side by side (server, Alice, Bob), each drawn as a row of commits.
  function rows3(spec, hlMap, note) {
    var names = ['origin (server)', 'alice (laptop)', 'bob (laptop)'], keys = ['srv', 'alice', 'bob'], nodes = [], edges = [], hl = {}, tg = {};
    keys.forEach(function (k, r) {
      var y = 8 + r * 15;
      nodes.push(box(k, names[r], 9, y, 16));
      var list = spec[k], prev = null;
      list.forEach(function (c, i) {
        var id = k + '_' + c;
        nodes.push({ id: id, label: c, x: 27 + i * 13, y: y });
        if (prev) edges.push([id, prev]);
        prev = id;
        if (hlMap && hlMap[k] && hlMap[k][c]) hl[id] = hlMap[k][c];
      });
      if (prev) tg[prev] = spec[k + 'Tag'] || 'main';
    });
    return { type: 'graph', label: note || 'three copies of the same repository', directed: true, height: 46, nodes: nodes, edges: edges, hl: hl, tags: tg };
  }

  topics.push({
    title: 'Rebasing and Rewriting History: Rebase, Interactive Rebase and Safe Force-Push',
    analogy: `<p>Imagine you wrote three pages of notes starting from page 10 of a shared notebook, but meanwhile the team added pages 11 and 12. <b>Rebasing</b> is <b>re-writing your three pages on top of page 12</b>, so it reads as if you started there. Your words are the same, but they are <b>new sheets</b>. That is fine for your private notes. If someone already photocopied your old sheets, the two versions now disagree, which is why you only rebase work nobody else has.</p>`,
    explain: `<p>🟢 <b>What rebase does.</b> <code>git rebase main</code> (while on your feature branch) finds the commits on your branch that main does not have, sets them aside, moves your branch to the tip of main, and <b>replays</b> each commit on top, one at a time. The result: a straight line, as if you had started from the latest main. Each replayed commit gets a <b>new ID</b> because its parent changed.</p>
      ${H.table(['', 'git merge main (into feature)', 'git rebase main (on feature)'], [
        ['History', 'keeps exactly what happened, adds a merge commit', 'linear, rewritten copies of your commits'],
        ['Commit IDs', 'unchanged', 'your commits get new IDs'],
        ['Conflicts', 'resolved once, in the merge', 'possibly once per replayed commit'],
        ['Safe on shared branches?', '<span class="c-g">yes</span>', '<span class="c-r">no</span> - only on your own unshared commits']
      ])}
      <p>🟢 <b>The golden rule:</b> never rebase (or amend) commits that other people have already pulled, such as <code>main</code>. Rebase <i>your own</i> feature branch freely.</p>
      <p>🔵 <b>Interactive rebase</b> (<code>git rebase -i main</code>) opens a to-do list of your commits. Change <code>pick</code> to <code>squash</code>/<code>fixup</code> (fold into the previous commit), <code>reword</code> (change message), <code>drop</code> (remove) or reorder lines. Use it to turn "wip", "fix typo", "really fix" into one clean commit before review. <code>git commit --fixup=SHA</code> plus <code>git rebase -i --autosquash</code> does this almost automatically.</p>
      <p>🔵 <b>Force-pushing.</b> After rebasing a branch you already pushed, a normal push is rejected because the server's branch is not an ancestor of yours. <code>git push --force</code> overwrites the server's branch with yours <b>no matter what is there</b>, including commits a teammate pushed in the meantime. <code>git push --force-with-lease</code> only overwrites if the server still has what <i>you last saw</i>; otherwise it refuses. Always use the lease, and let branch protection block force-pushes to <code>main</code> entirely.</p>`,
    clues: [
      '"rebase vs merge" → linear rewritten history vs preserved history with merge commits; golden rule',
      '"squash my 7 WIP commits before the PR" → <code>git rebase -i</code> with fixup/squash, or <code>--autosquash</code>',
      '"push rejected (non-fast-forward) after I rebased" → <code>git push --force-with-lease</code> on your own branch only',
      '"a teammate\'s commits disappeared from the branch" → someone force-pushed; recover from a local clone or reflog',
      '"keep my branch up to date with main without merge commits" → <code>git pull --rebase</code> / <code>git rebase origin/main</code>',
      '"move my branch from develop onto main" → <code>git rebase --onto</code>'
    ],
    code: [R`# Lab 3: rebase a feature branch onto an updated main
git switch main
git switch -c feature/metrics
printf 'metrics: true\n' >> app.yaml && git commit -am "Enable metrics"
printf 'metricsPort: 9100\n' >> app.yaml && git commit -am "Set metrics port"

git switch main                               # meanwhile, main moves on
printf 'team: platform\n' > TEAM && git add TEAM && git commit -m "Add TEAM file"

git switch feature/metrics
git log --oneline --graph --all               # diverged: diamond shape
git rebase main                               # replay 2 commits on top of main
git log --oneline --graph --all               # straight line, new IDs for your 2 commits

git switch main && git merge --ff-only feature/metrics   # now a fast-forward`, { lang: 'bash', title: 'Squash fixups with --autosquash (no editor needed)', code: R`git switch -c feature/alerts main
printf 'alerts: on\n' > alerts.yaml && git add alerts.yaml && git commit -m "Add alert config"
printf 'alerts: on\nthreshold: 90\n' > alerts.yaml
git commit -am "fixup! Add alert config"          # or: git commit --fixup=SHA
# GIT_SEQUENCE_EDITOR=true accepts the generated to-do list without opening an editor
GIT_SEQUENCE_EDITOR=true git rebase -i --autosquash main
git log --oneline main..HEAD                      # one clean commit` }, { lang: 'bash', title: 'Safe force-push habits', code: R`git config --global push.default current     # push the current branch to the same name
git push --force-with-lease                    # refuse if the server changed since your last fetch
git push --force-with-lease --force-if-includes   # also refuse if you never integrated those changes
# never: git push --force origin main` }],
    codeTitle: ['Rebase lab', 'Clean up commits', 'Force-push safely'],
    viz: [{
      title: 'Rebase replays your commits on top of main',
      input: 'commit Add config; commit Add Dockerfile; switch -c feature; commit Enable metrics; commit Set metrics port; switch main; commit Add TEAM file; switch feature; rebase main; switch main; merge feature',
      inputLabel: 'git commands separated by ;',
      gen: function (input) { return gitSim(input, { def: this && this.input, outro: 'Compare with the merge visualizer in topic 2: same final files, but a straight line and no merge commit. The price: your two commits were copied with new IDs. If anyone had pulled the old C3/C4, their copy and yours would now disagree.' }); }
    }, {
      title: 'Force-push vs --force-with-lease',
      input: 'force',
      inputLabel: 'type force or lease',
      gen: function (input) {
        var mode = String(input || '').trim().toLowerCase();
        if (mode !== 'force' && mode !== 'lease') throw new Error('Type force or lease');
        var f = [];
        f.push({ narr: 'Alice and Bob both cloned the shared branch <b>release-notes</b> (shown as main here). All three copies agree: C1 → C2.', parts: [rows3({ srv: ['C1', 'C2'], alice: ['C1', 'C2'], bob: ['C1', 'C2'] })] });
        f.push({ narr: 'Bob commits <b>B1</b> "Fix timeout" and pushes. The server now has C1 → C2 → B1. Alice has not fetched, so <i>her</i> idea of the server (<code>origin/main</code>) is still C2.', parts: [rows3({ srv: ['C1', 'C2', 'B1'], alice: ['C1', 'C2'], bob: ['C1', 'C2', 'B1'] }, { srv: { B1: 'ok' }, bob: { B1: 'ok' } }), { type: 'vars', label: 'Alice\'s remote-tracking ref', vals: { 'origin/main (her last fetch)': 'C2', 'server main (real)': 'B1' }, hl: { 'server main (real)': 'cur' } }] });
        f.push({ narr: 'Alice amends and rebases her own work into <b>A1</b> on top of C2 and runs <code>git push</code>. The server refuses: <code>! [rejected] main -&gt; main (fetch first)</code>, because B1 is not in her history. This rejection is Git protecting Bob.', parts: [rows3({ srv: ['C1', 'C2', 'B1'], alice: ['C1', 'C2', 'A1'], bob: ['C1', 'C2', 'B1'] }, { alice: { A1: 'cur' }, srv: { B1: 'sel' } }), { type: 'code', label: 'Alice\'s terminal', lang: 'bash', code: 'git push\n# ! [rejected]  main -> main (fetch first)\n# hint: Updates were rejected because the remote contains work that you do not have locally.', hl: { 2: 'bad' } }] });
        if (mode === 'force') {
          f.push({ narr: 'Annoyed, Alice runs <code>git push --force</code>. The server branch is <b>replaced</b> by hers: C1 → C2 → A1. <span class="c-r">Bob\'s B1 is gone from the server.</span> No error, no warning.', parts: [rows3({ srv: ['C1', 'C2', 'A1'], alice: ['C1', 'C2', 'A1'], bob: ['C1', 'C2', 'B1'] }, { srv: { A1: 'bad' }, bob: { B1: 'sel' } }), { type: 'code', label: 'Alice\'s terminal', lang: 'bash', code: 'git push --force\n#  + 4c1e2a9...7b3d0f1 main -> main (forced update)', hl: { 2: 'bad' } }] });
          f.push({ narr: 'Next day the pipeline deploys from the server. The timeout fix is missing and the bug is back. New clones never see B1. The only copies of B1 are in <b>Bob\'s laptop</b> (and his reflog), plus any CI caches.', parts: [rows3({ srv: ['C1', 'C2', 'A1'], alice: ['C1', 'C2', 'A1'], bob: ['C1', 'C2', 'B1'] }, { bob: { B1: 'ok' }, srv: { A1: 'cur' } }, 'B1 survives only on Bob\'s machine')] });
          f.push({ narr: 'Recovery: Bob runs <code>git fetch</code>, then <code>git rebase origin/main</code>, which replays B1 on top of A1 as <b>B1\'</b>, and pushes normally. Everyone fetches. Then the team turns on <b>branch protection</b> so nobody can force-push this branch again.', parts: [rows3({ srv: ['C1', 'C2', 'A1', "B1'"], alice: ['C1', 'C2', 'A1'], bob: ['C1', 'C2', 'A1', "B1'"] }, { srv: { "B1'": 'ok' }, bob: { "B1'": 'ok' } }), { type: 'code', label: 'Bob\'s terminal', lang: 'bash', code: 'git fetch origin\ngit rebase origin/main\ngit push', hl: { 3: 'ok' } }] });
        } else {
          f.push({ narr: 'Alice runs <code>git push --force-with-lease</code>. Git tells the server: "replace main <b>only if it is still C2</b>" (her last fetch). The server has B1, so it <span class="c-g">refuses</span>: <code>! [rejected] main -&gt; main (stale info)</code>. Bob\'s work is safe.', parts: [rows3({ srv: ['C1', 'C2', 'B1'], alice: ['C1', 'C2', 'A1'], bob: ['C1', 'C2', 'B1'] }, { srv: { B1: 'ok' }, alice: { A1: 'cur' } }), { type: 'code', label: 'Alice\'s terminal', lang: 'bash', code: 'git push --force-with-lease\n# ! [rejected]  main -> main (stale info)', hl: { 2: 'ok' } }] });
          f.push({ narr: 'Alice fetches and sees B1. She rebases her work on top: <code>git rebase origin/main</code> replays A1 as <b>A1\'</b> after B1. Now her branch contains everything the server has.', parts: [rows3({ srv: ['C1', 'C2', 'B1'], alice: ['C1', 'C2', 'B1', "A1'"], bob: ['C1', 'C2', 'B1'] }, { alice: { "A1'": 'ok', B1: 'cur' } })] });
          f.push({ narr: 'A <b>normal</b> push now succeeds because it is a fast-forward for the server. Nothing was lost. Bob pulls and gets A1\'.', parts: [rows3({ srv: ['C1', 'C2', 'B1', "A1'"], alice: ['C1', 'C2', 'B1', "A1'"], bob: ['C1', 'C2', 'B1', "A1'"] }, { srv: { "A1'": 'ok' }, bob: { "A1'": 'ok' } })] });
        }
        f.push({ narr: 'Takeaway: <code>--force</code> means "I do not care what is there". <code>--force-with-lease</code> means "only if it is what I expect". Add <code>--force-if-includes</code> so a background fetch in your IDE cannot quietly satisfy the lease. Best of all: protect shared branches so force-push is impossible. Type <b>' + (mode === 'force' ? 'lease' : 'force') + '</b> to see the other story.', parts: [{ type: 'table', label: 'which push to use', columns: ['Command', 'Overwrites teammate work?', 'Use it'], rows: [['git push', 'never', 'always try first'], ['git push --force-with-lease', 'no: refuses on surprise', 'after rebasing your own branch'], ['git push --force', 'yes, silently', 'almost never'], ['force-push to protected main', 'blocked by server', 'should be impossible']], hl: { 1: 'ok', 2: 'bad' } }] });
        return f;
      }
    }],
    examples: [
      { title: 'Keep your PR branch current with pull --rebase', html: `<p>Your PR branch is 4 commits behind main and CI asks you to update it. Fetch, then rebase your branch on the fresh <code>origin/main</code>. Because you already pushed the branch for the PR, the rebase rewrote it, so finish with a <b>lease</b> force-push. Nobody else commits to your PR branch, so this is safe.</p>`, code: `git fetch origin
git rebase origin/main               # replay your commits on top of the latest main
git push --force-with-lease          # update the PR branch safely` },
      { title: 'Interactive rebase: tidy before review', html: `<p><code>git rebase -i origin/main</code> opens the to-do list below in your editor. Lines are oldest first. You keep the first commit, fold the two fixes into it and reword the last one. Save and close; Git replays the list. If you panic mid-way, <code>git rebase --abort</code> puts everything back.</p><pre>pick   1a2b3c4 Add metrics endpoint
fixup  5d6e7f8 fix typo
fixup  9a0b1c2 really fix typo
reword 3d4e5f6 add dashboard</pre>`, code: `git rebase -i origin/main     # edit the to-do list as shown, save, close
git log --oneline origin/main..HEAD
git rebase --abort            # only if something went wrong mid-rebase` },
      { title: 'Rebase conflicts: one commit at a time', html: `<p>During a rebase, Git stops at the first commit that does not apply cleanly. You fix the file, <code>git add</code> it, and <code>git rebase --continue</code>; Git moves to the next commit. Note the confusing naming: during a rebase, <b>"ours" is the branch you are rebasing onto</b> (main) and <b>"theirs" is your own commit</b> being replayed. That is the opposite of a merge.</p>`, code: `git rebase origin/main
# CONFLICT (content): Merge conflict in app.yaml
git status                       # "interactive rebase in progress; onto 7f3c2d1"
# edit app.yaml, remove the markers, then:
git add app.yaml
git rebase --continue            # next commit; repeat until "Successfully rebased"` },
      { title: 'Move a branch to a different base with --onto', html: `<p>You branched <code>feature/x</code> from <code>develop</code> by mistake, but it must go to <code>main</code> without the develop-only commits. <code>git rebase --onto main develop feature/x</code> means "take the commits after develop up to feature/x and replay them onto main".</p>`, code: `git log --oneline develop..feature/x        # the commits that will move
git rebase --onto main develop feature/x
git log --oneline --graph main feature/x` }
    ],
    deepDive: `<p>🟣 <b>How rebase works inside.</b> A rebase is a scripted series of <b>cherry-picks</b>. Git saves your old tip as <code>ORIG_HEAD</code>, detaches HEAD at the new base, applies each commit's diff and commits it with the original author, date and message, then moves your branch label to the last copy. Progress lives in <code>.git/rebase-merge/</code>, which is how <code>--continue</code>, <code>--skip</code> and <code>--abort</code> work. Commits whose change is already upstream (same patch ID) are skipped automatically. <code>git config rerere.enabled true</code> ("reuse recorded resolution") remembers how you resolved a conflict and replays it next time, which helps a lot with long-running branches.</p>
      <p><b>Stacked branches.</b> If <code>feature-b</code> is built on <code>feature-a</code>, rebasing <code>a</code> leaves <code>b</code> pointing at the old copies. <code>git rebase --update-refs</code> (Git 2.38+) moves every branch label in the stack together. <b>Merge commits</b> are dropped by a plain rebase (it linearises); <code>--rebase-merges</code> keeps their shape.</p>
      <p><b>Leases in detail.</b> <code>--force-with-lease</code> without arguments compares the server branch with your <i>remote-tracking</i> ref (<code>origin/main</code>). If an IDE or a <code>git fetch</code> updated that ref in the background, the lease passes even though you never looked at the new commits. <code>--force-if-includes</code> (Git 2.30+) adds a check that the remote tip is somewhere in your branch's reflog, so you must have actually integrated it. For full control, name the expected value: <code>--force-with-lease=main:4c1e2a9</code>. On the server side, GitHub rulesets and branch protection, and GitLab protected branches, can block force-pushes and deletions for chosen branches; that is the real safety net.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> AI is very good at the mechanical part of rebasing: proposing a squash plan for a messy branch, writing <code>--onto</code> commands, and even resolving simple replay conflicts. Coding agents often finish by rebasing their branch on main and force-pushing it to the PR, which is fine on the agent's own branch.</p>
      <p><b>The danger is scope.</b> "Push rejected? Use <code>git push --force</code>" is one of the most common bad suggestions, and an agent with write access can wipe a shared branch in one command. Guardrails: agents push only to their own branches, the token cannot bypass branch protection, the wrapper uses <code>--force-with-lease --force-if-includes</code>, and protected branches block force-pushes for everyone, humans included. When an assistant suggests rewriting history, ask "who else has these commits?" first.</p>`,
    problems: [P({
      t: 'A force-push wiped a teammate\'s commit from the shared branch', l: 'Medium', tags: ['force-push', 'force-with-lease', 'recovery', 'branch protection'], co: ['Atlassian', 'Red Hat'],
      s: `<p>The team shares branch <code>main</code> on a server. Bob pushed commit "Fix DB timeout". Ten minutes later Alice, whose push was rejected, ran <code>git push --force</code>. Bob's commit is gone from the server and the next deploy brought the bug back. Reproduce this locally with a bare repo standing in for GitHub/GitLab, recover Bob's commit without losing Alice's, and show the command Alice should have used.</p>`,
      c: LAB + ' The "server" is a local bare repository (<code>git init --bare</code>), so no hosted account is needed.',
      ex: `<p>After the force-push, <code>git log origin/main</code> shows ${H.c('r', 'C1 - Alice: add retries')} (no Bob commit). After recovery: ${H.c('g', 'C1 - Alice: add retries - Bob: fix DB timeout')} on the server, and <code>--force-with-lease</code> in a replay is ${H.c('g', 'rejected (stale info)')}.</p>`,
      bw: `<p>Bob runs <code>git push --force</code> from his laptop to "put it back". That restores his commit but now wipes <b>Alice's</b> commit instead. Two wrongs: the team keeps losing work in turns.</p>`,
      bc: `git push --force      # Bob overwrites Alice's commit in return`,
      q: ['Where can Bob\'s lost commit still be found after the force-push?', ['In Bob\'s local clone (his branch and reflog)', 'Nowhere: force-push deletes it everywhere', 'Only in Alice\'s stash', 'In the .gitignore'], 0, 'A force-push changes only the server\'s branch label. Bob\'s own repository still has the commit on his main (and in his reflog), and so does any clone that fetched it. Hosting platforms may also show it in the activity log.'],
      h: ['<p>Hint 1: build the scene with <code>git init --bare server.git</code> and two clones, <code>alice</code> and <code>bob</code>.</p>', '<p>Hint 2: Bob still has his commit. <code>git fetch</code> then <code>git rebase origin/main</code> replays it on top of Alice\'s new history, and a <b>normal</b> push works.</p>', '<p>Hint 3: to prove the lease, make the server move again, then try <code>git push --force-with-lease</code> from a clone that has not fetched: it is rejected. Finally, protect the branch on the real server.</p>'],
      a: `<p>Set up a bare "server" and two clones. Bob pushes B1; Alice, behind, commits A1 and force-pushes, replacing the server's main with C1 → A1: B1 is no longer on the server. Recovery happens on Bob's machine, which still has B1: <code>git fetch</code> updates <code>origin/main</code> to Alice's A1, <code>git rebase origin/main</code> replays B1 on top (B1'), and a plain <code>git push</code> is a fast-forward, so no one else's work is touched. If Bob had already reset his branch, <code>git reflog</code> would still show B1 for weeks. Then show the prevention: with <code>--force-with-lease</code>, Alice's push is refused because the server's main is not what she last fetched. Real fix: protect <code>main</code> on GitHub/GitLab (no force-push, PRs required) and set <code>alias.pushf</code> to the lease form.</p>`,
      code: R`# 1. A local "server" and two teammates
mkdir lab && cd lab
git init --bare -b main server.git
git clone server.git alice && git clone server.git bob
cd alice
git config user.name "Alice" && git config user.email "alice@example.com"
echo "timeout: 5" > db.yaml && git add db.yaml && git commit -m "Add DB config" && git push -u origin main
cd ../bob
git config user.name "Bob" && git config user.email "bob@example.com"
git pull origin main
echo "timeout: 30" > db.yaml && git commit -am "Fix DB timeout" && git push -u origin main   # B1 on the server

# 2. Alice is behind, commits, gets rejected, and force-pushes (the mistake)
cd ../alice
echo "retries: 3" > retry.yaml && git add retry.yaml && git commit -m "Add retries"
git push || echo "rejected: the server has work Alice does not have"
git push --force                       # overwrites the server's main: B1 is gone there
git log --oneline origin/main          # C1, Add retries

# 3. Recover from Bob's clone without touching Alice's commit
cd ../bob
git log --oneline -n 2                 # Bob still has "Fix DB timeout"
git fetch origin
git rebase origin/main                 # replays B1 on top of Alice's commit
git push                               # normal push, a fast-forward for the server
git log --oneline --graph origin/main

# 4. What Alice should have done: the lease refuses when the server moved
cd ../alice
echo "retries: 5" > retry.yaml && git commit -am "Tune retries"
git push --force-with-lease || echo "rejected (stale info): fetch and rebase first"
git fetch origin && git rebase origin/main && git push

# 5. Habits: a safe alias for everyone
git config --global alias.pushf "push --force-with-lease --force-if-includes"`,
      cx: `<p>About 25 commands, all local. Graph: the server's main goes C1-B1 → C1-A1 (forced) → C1-A1-B1' (recovered) → C1-A1-B1'-A2'. Prevention on the real server: branch protection that blocks force-push on main.</p>`,
      f: ['If Bob had deleted his clone, where else could you look for B1?', 'Why can <code>--force-with-lease</code> still be fooled by an IDE that fetches in the background?']
    })]
  });

  // ───────────────────────── Topic 4: resolving conflicts ─────────────────────────
  topics.push({
    title: 'Resolving Merge Conflicts: Reading the Markers and Fixing a Config File Calmly',
    analogy: `<p>Two editors work on copies of the same recipe. One changes "2 eggs" to "3 eggs"; the other changes it to "5 eggs". The printer cannot guess who is right, so it prints <b>both suggestions side by side</b> with big brackets around them and stops. You, the head chef, read both, decide (maybe 4 eggs is right), cross out the brackets and send it to print. A merge conflict is exactly that: Git refuses to guess.</p>`,
    explain: `<p>🟢 <b>When conflicts happen.</b> In a three-way merge Git compares each region of a file in three versions: the <b>base</b> (common ancestor), <b>ours</b> (the branch you are on) and <b>theirs</b> (the branch coming in).</p>
      ${H.table(['base', 'ours', 'theirs', 'Git does'], [
        ['replicas: 2', 'replicas: 2', 'replicas: 5', 'take theirs (only they changed it)'],
        ['replicas: 2', 'replicas: 3', 'replicas: 2', 'take ours (only we changed it)'],
        ['replicas: 2', 'replicas: 3', 'replicas: 3', 'take it (same change on both sides)'],
        ['replicas: 2', 'replicas: 3', 'replicas: 5', '<span class="c-r">CONFLICT</span>: both changed it differently'],
        ['file exists', 'edited', 'deleted', '<span class="c-r">CONFLICT</span> (modify/delete)']
      ])}
      <p>🟢 <b>What you see.</b> The merge stops with <code>CONFLICT (content): Merge conflict in app.yaml</code>. <code>git status</code> lists the file under "Unmerged paths: both modified". Inside the file, Git writes <b>conflict markers</b>:</p>
      <pre>&lt;&lt;&lt;&lt;&lt;&lt;&lt; HEAD
replicas: 3
=======
replicas: 5
&gt;&gt;&gt;&gt;&gt;&gt;&gt; feature/scale-up</pre>
      <p>Top half = ours (HEAD), bottom half = theirs (the named branch). Everything outside the markers merged cleanly.</p>
      <p>🔵 <b>The calm recipe.</b> 1) <code>git status</code> to list conflicted files. 2) Open each one and decide the right content: ours, theirs, a mix, or something new. If unsure, ask the other author. 3) Delete <b>all</b> marker lines. 4) <b>Validate</b>: for config files run a parser or linter, for code run the tests. 5) <code>git add FILE</code> to mark it resolved. 6) <code>git commit</code> (for a merge) or <code>git rebase --continue</code> (for a rebase). Changed your mind? <code>git merge --abort</code> or <code>git rebase --abort</code> puts everything back.</p>
      <p>🔵 <b>See the base too.</b> <code>git config --global merge.conflictStyle zdiff3</code> adds a <code>|||||||</code> section with the original lines, so you can see <i>what each side changed</i>, not just where they ended up. This makes most conflicts obvious.</p>`,
    clues: [
      '"CONFLICT (content): Merge conflict in X" → open X, resolve markers, validate, <code>git add</code>, continue',
      '"both modified" / "Unmerged paths" in git status → conflicts still to resolve',
      '"I want to start over" → <code>git merge --abort</code> / <code>git rebase --abort</code>',
      '"take their whole file" → <code>git checkout --theirs FILE</code> (careful: swapped meaning during rebase)',
      '"conflict in package-lock.json / go.sum" → take one side, then regenerate with the package manager',
      '"CONFLICT (modify/delete)" → decide whether the file should exist; <code>git rm</code> or <code>git add</code>'
    ],
    code: R`# Lab 4: create and resolve a real conflict in a config file
git switch main
printf 'service: web\nimage: shop/web:1.4.0\nreplicas: 2\nlogLevel: info\n' > app.yaml
git commit -am "Reset app.yaml for the conflict lab"

git switch -c feature/scale-up
sed -i 's/replicas: 2/replicas: 5/' app.yaml && git commit -am "Scale web to 5 for the sale"
git switch main
sed -i 's/replicas: 2/replicas: 3/' app.yaml && git commit -am "Scale web to 3"

git config merge.conflictStyle zdiff3     # also show the base version
git merge feature/scale-up                # CONFLICT (content): Merge conflict in app.yaml
git status                                # Unmerged paths: both modified: app.yaml
cat app.yaml                              # read the markers

# Decide (here: the sale needs 5), write the final content, check no markers remain
sed -i '/^<<<<<<< /,/^>>>>>>> /c\replicas: 5' app.yaml
grep -n '^[<=>|]\{7\}' app.yaml || echo "no conflict markers left"
python3 -c 'import yaml, sys; yaml.safe_load(open("app.yaml")); print("valid YAML")'
git add app.yaml
git commit --no-edit                      # finishes the merge with the default message
git log --oneline --graph -n 4`,
    codeTitle: 'Conflict lab',
    viz: [{
      title: 'Three-way merge of app.yaml: which lines conflict?',
      input: 'ours: replicas=3 logLevel=debug | theirs: replicas=5 image=shop/web:1.5.0',
      inputLabel: 'ours: key=value ... | theirs: key=value ...  (keys: service, image, replicas, logLevel)',
      gen: function (input) {
        var keys = ['service', 'image', 'replicas', 'logLevel'], base = { service: 'web', image: 'shop/web:1.4.0', replicas: '2', logLevel: 'info' };
        var halves = String(input || '').split('|');
        if (halves.length !== 2) throw new Error('Use: ours: replicas=3 | theirs: replicas=5');
        function side(txt, name) {
          var m = txt.trim().match(new RegExp('^' + name + '\\s*:?(.*)$', 'i'));
          if (!m) throw new Error('Start each half with ' + name + ':');
          var o = {};
          m[1].trim().split(/\s+/).filter(Boolean).forEach(function (kv) {
            var p = kv.split('=');
            if (p.length !== 2 || keys.indexOf(p[0]) < 0 || !p[1]) throw new Error('Use key=value with keys service, image, replicas, logLevel (got "' + kv + '")');
            o[p[0]] = p[1];
          });
          return o;
        }
        var ours = side(halves[0], 'ours'), theirs = side(halves[1], 'theirs');
        function file(over) { return keys.map(function (k) { return k + ': ' + (over[k] !== undefined ? over[k] : base[k]); }).join('\n'); }
        function changedHl(over) { var h = {}; keys.forEach(function (k, i) { if (over[k] !== undefined && over[k] !== base[k]) h[i + 1] = 'ok'; }); return h; }
        var f = [];
        f.push({ narr: 'The <b>base</b>: app.yaml as it was when the feature branch was created. Both branches started from this exact file.', parts: [{ type: 'code', label: 'base (merge-base)', lang: 'yaml', code: file({}) }] });
        f.push({ narr: '<b>Ours</b> (main, where you run <code>git merge</code>) changed: ' + (Object.keys(ours).map(function (k) { return k + ' → ' + H.esc(ours[k]); }).join(', ') || 'nothing') + '.', parts: [{ type: 'code', label: 'ours (HEAD = main)', lang: 'yaml', code: file(ours), hl: changedHl(ours) }] });
        f.push({ narr: '<b>Theirs</b> (the feature branch coming in) changed: ' + (Object.keys(theirs).map(function (k) { return k + ' → ' + H.esc(theirs[k]); }).join(', ') || 'nothing') + '.', parts: [{ type: 'code', label: 'theirs (feature/scale-up)', lang: 'yaml', code: file(theirs), hl: changedHl(theirs) }] });
        var rows = [], conflicts = [], merged = [], rhl = {};
        keys.forEach(function (k, i) {
          var b = base[k], o = ours[k] !== undefined ? ours[k] : b, t = theirs[k] !== undefined ? theirs[k] : b, res;
          if (o === t) res = o === b ? 'unchanged' : 'same change both sides: take it';
          else if (o === b) res = 'only theirs changed: take theirs';
          else if (t === b) res = 'only ours changed: take ours';
          else { res = 'CONFLICT'; conflicts.push(k); rhl[i] = 'bad'; }
          if (res !== 'CONFLICT' && res !== 'unchanged') rhl[i] = 'ok';
          rows.push([k, b, o, t, res]);
          merged.push({ k: k, o: o, t: t, c: res === 'CONFLICT' });
        });
        f.push({ narr: 'Git compares the three versions <b>line by line</b> (really, region by region). A line changed on only one side is merged automatically. Only lines changed <b>differently on both sides</b> conflict' + (conflicts.length ? ': here <b>' + conflicts.join(', ') + '</b>.' : '. Here there are none!'), parts: [{ type: 'table', label: 'three-way decision per line', columns: ['line', 'base', 'ours', 'theirs', 'result'], rows: rows, hl: rhl }] });
        if (!conflicts.length) {
          var clean = merged.map(function (x) { return x.k + ': ' + (x.o !== base[x.k] ? x.o : x.t); }).join('\n');
          f.push({ narr: 'No line was changed differently on both sides, so <code>git merge</code> succeeds on its own and creates the merge commit. Still read the result: a clean merge can be <b>logically</b> wrong (for example two changes that each assume the old value).', parts: [{ type: 'code', label: 'app.yaml after an automatic merge', lang: 'yaml', code: clean }] });
          f.push({ narr: 'Try a conflict: change the same key on both sides, for example <code>ours: replicas=3 | theirs: replicas=5</code>.', parts: [{ type: 'text', html: 'Same line, different change → conflict. Different lines → automatic merge.' }] });
          return f;
        }
        var lines = [], mhl = {};
        merged.forEach(function (x) {
          if (!x.c) { lines.push(x.k + ': ' + (x.o !== base[x.k] ? x.o : x.t)); return; }
          lines.push('<<<<<<< HEAD'); mhl[lines.length] = 'bad';
          lines.push(x.k + ': ' + x.o); mhl[lines.length] = 'cur';
          lines.push('||||||| base'); mhl[lines.length] = 'bad';
          lines.push(x.k + ': ' + base[x.k]); mhl[lines.length] = 'win';
          lines.push('======='); mhl[lines.length] = 'bad';
          lines.push(x.k + ': ' + x.t); mhl[lines.length] = 'cur';
          lines.push('>>>>>>> feature/scale-up'); mhl[lines.length] = 'bad';
        });
        f.push({ narr: '<code>git merge</code> stops: <code>CONFLICT (content): Merge conflict in app.yaml</code>. The clean lines are already merged. Each conflict shows <b>ours</b> (top), the <b>base</b> (middle, thanks to <code>zdiff3</code>) and <b>theirs</b> (bottom). The file is now invalid YAML until you fix it.', parts: [{ type: 'code', label: 'app.yaml with conflict markers', lang: 'text', code: lines.join('\n'), hl: mhl }, { type: 'code', label: 'git status', lang: 'text', code: 'You have unmerged paths.\n  (fix conflicts and run "git commit")\nUnmerged paths:\n\tboth modified:   app.yaml', hl: { 4: 'bad' } }] });
        var finalLines = merged.map(function (x) { return x.k + ': ' + (x.c ? x.t : (x.o !== base[x.k] ? x.o : x.t)); });
        f.push({ narr: 'You decide. Read the base: both sides started from ' + conflicts.map(function (k) { return k + ': ' + base[k]; }).join(', ') + '. Ask why each side changed it (a quick message to the author beats guessing). Say the feature needs ' + conflicts.map(function (k) { return k + ' = ' + H.esc(theirs[k]); }).join(', ') + '. Write the final line and delete <b>every</b> marker line.', parts: [{ type: 'code', label: 'app.yaml resolved', lang: 'yaml', code: finalLines.join('\n'), hl: (function () { var h = {}; merged.forEach(function (x, i) { if (x.c) h[i + 1] = 'ok'; }); return h; })() }] });
        f.push({ narr: 'Validate before you mark it resolved: grep for leftover markers and parse the YAML (or run the tests). Then <code>git add app.yaml</code> tells Git "this file is resolved", and <code>git commit</code> finishes the merge commit.', parts: [{ type: 'code', label: 'finish', lang: 'bash', code: "grep -n '^[<=>|]\\{7\\}' app.yaml || echo 'no markers'\npython3 -c 'import yaml; yaml.safe_load(open(\"app.yaml\"))'\ngit add app.yaml\ngit commit --no-edit", hl: { 3: 'ok', 4: 'ok' } }] });
        f.push({ narr: 'Done: the merge commit has two parents and the agreed content. If at any point the conflict looked wrong, <code>git merge --abort</code> would have returned you to the state before the merge, with nothing lost.', parts: [{ type: 'table', label: 'escape hatches', columns: ['command', 'effect'], rows: [['git merge --abort', 'undo the whole merge attempt'], ['git checkout --ours app.yaml', 'take main\'s whole file'], ['git checkout --theirs app.yaml', 'take the incoming whole file'], ['git diff', 'during a conflict: shows only the unresolved parts']], hl: { 0: 'ok' } }] });
        return f;
      }
    }],
    examples: [
      { title: 'Ticket: conflict in app.yaml before the release', html: `<p>Release branch merge stops on <code>app.yaml</code>: main set <code>replicas: 3</code> for cost savings, the feature set <code>replicas: 5</code> for a sale. This is a <b>decision</b>, not a typing problem. You check with the feature owner, agree on 5 until the sale ends with an HPA to scale down later, resolve, and write the reason into the merge commit message so the next reader understands.</p>`, code: `git merge release/2026-10
# CONFLICT (content): Merge conflict in app.yaml
git diff                                # shows only the conflicted hunks
# edit app.yaml: keep "replicas: 5", remove markers
python3 -c 'import yaml; yaml.safe_load(open("app.yaml"))'
git add app.yaml
git commit -m "Merge release/2026-10" -m "Conflict in app.yaml: keep 5 replicas for the sale (agreed with @priya), revisit after 2026-11-01."` },
      { title: 'Lockfile conflict: do not hand-edit, regenerate', html: `<p><code>package-lock.json</code> (or <code>poetry.lock</code>, <code>go.sum</code>) conflicts are noisy and machine-generated. Hand-merging them often breaks installs. Take one side, then let the tool rebuild the lock from the merged <code>package.json</code>, and run the tests.</p>`, code: `git checkout --theirs package-lock.json   # start from the incoming lock file
npm install                               # regenerates it from the merged package.json
git add package-lock.json
npm test && git commit --no-edit` },
      { title: 'Modify/delete conflict', html: `<p>You edited <code>deploy/old-cron.yaml</code>; a teammate deleted it because the job moved to a new scheduler. Git reports ${H.c('r', 'CONFLICT (modify/delete)')}. Decide whether the file should exist. If the deletion is right, <code>git rm</code> it (and move your change to the new place). If it must stay, <code>git add</code> your version.</p>`, code: `git status                         # "deleted by them: deploy/old-cron.yaml"
git rm deploy/old-cron.yaml        # accept the deletion
git commit --no-edit` },
      { title: 'Same conflict again and again? Turn on rerere', html: `<p>A long-lived branch that is regularly updated from main hits the same conflict every time. <b>rerere</b> (reuse recorded resolution) records your fix the first time and applies it automatically later. You still review and <code>git add</code>.</p>`, code: `git config --global rerere.enabled true
git merge main         # first time: resolve by hand, Git records it ("Recorded resolution")
# next time the same conflict appears: "Resolved 'app.yaml' using previous resolution."
git diff --staged      # still check the result` }
    ],
    deepDive: `<p>🟣 <b>Why conflicts are line-based.</b> Git's merge works on text regions, not meaning. It runs a diff from base to ours and from base to theirs; if the changed regions overlap or touch, it is a conflict, even when a human sees no clash (two different keys added at the end of the same YAML file often conflict because both inserted at the same place). Conversely a "clean" merge can still be wrong: one branch renames a config key while the other adds a new use of the old key. That is why CI must run on the merged result, and why merge queues test the exact commit that will land.</p>
      <p><b>Index stages.</b> During a conflict the index holds up to three versions of the file: stage 1 = base, 2 = ours, 3 = theirs. <code>git show :1:app.yaml</code>, <code>:2:</code>, <code>:3:</code> print them, and <code>git checkout --ours/--theirs</code> copies stage 2 or 3 to the working tree. During a <b>rebase</b>, "ours" is the branch being rebased onto and "theirs" is your replayed commit, so <code>--ours</code> means the opposite of what people expect. <code>git log --merge -p FILE</code> shows only the commits on both sides that touched the conflicted file.</p>
      <p><b>Reducing conflicts.</b> Integrate often (small PRs, daily rebases or merges from main), keep generated files out of Git or regenerate them, format code automatically so whitespace never conflicts, and split huge config files (one file per service). <code>.gitattributes</code> can set merge drivers, for example <code>CHANGELOG.md merge=union</code> keeps both sides' lines, and <code>*.lock merge=binary</code> forces you to pick one side and regenerate. Tools: VS Code's merge editor, <code>git mergetool</code> with vimdiff/meld/kdiff3, and JetBrains' three-pane merge all show base, ours and theirs.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> editors now offer "resolve with AI" buttons that read both sides and propose a merged file, and for mechanical conflicts (imports, both sides adding list items, renamed variables) they are usually right. For a lockfile or generated code, a good assistant will tell you to regenerate rather than merge text.</p>
      <p><b>Where you must stay in charge:</b> config and infrastructure conflicts are often <b>business decisions</b> (3 vs 5 replicas, which image tag, which timeout). A model cannot know the sale starts tomorrow. It may also happily produce valid-looking YAML that quietly drops one side. After any AI resolution: read the diff against both parents (<code>git diff HEAD</code> and <code>git diff MERGE_HEAD</code>), run linters and tests, and write the reason in the commit message. Never let an agent resolve conflicts on <code>main</code> without review.</p>`,
    problems: [P({
      t: 'Your branch is 3 commits behind main with a conflict in app.yaml', l: 'Medium', tags: ['rebase', 'conflict', 'yaml', 'fast-forward'], co: ['Microsoft', 'Zoho'],
      s: `<p>Your branch <code>feature/cache</code> has one commit that sets <code>replicas: 4</code> and adds a <code>cache:</code> line in <code>app.yaml</code>. Meanwhile <code>main</code> got 3 new commits, one of which set <code>replicas: 3</code>. Get your branch merged into main cleanly, with a <b>linear history</b> (the team merges with fast-forward only), the final replica count agreed as <code>4</code>, and valid YAML.</p>`,
      ex: `<p>Before: ${H.c('y', 'main: C1-M1-M2-M3')}, ${H.c('b', 'feature/cache: C1-F1')}. After: ${H.c('g', "main: C1-M1-M2-M3-F1'")}, one straight line; <code>app.yaml</code> has <code>replicas: 4</code>, the <code>cache</code> line, everything from main, and no markers.</p>`,
      bw: `<p>Merging main into the feature with <code>-X ours</code> to make the conflict "go away". It silently drops main's side of every conflicting hunk (and violates the team's linear-history rule because it creates a merge commit). Or resolving by deleting only the <code>&lt;&lt;&lt;&lt;&lt;&lt;&lt;</code> line and committing a file that still contains <code>=======</code>.</p>`,
      bc: `git merge -X ours main     # conflicts "vanish": main's change to those lines is silently discarded`,
      q: ['During <code>git rebase main</code>, which side does <code>git checkout --theirs app.yaml</code> take?', ['Your feature commit being replayed', 'main', 'The merge base', 'The remote server version'], 0, 'In a rebase Git replays your commits onto main, so HEAD (ours) is the main-based copy and theirs is your commit being applied. It is the reverse of a merge, which is why many people prefer to edit the file by hand.'],
      h: ['<p>Hint 1: see how far behind you are: <code>git log --oneline feature/cache..main</code> lists the 3 commits you lack.</p>', '<p>Hint 2: on the feature branch run <code>git rebase main</code>. It stops on your commit with a conflict in <code>app.yaml</code>.</p>', '<p>Hint 3: write the agreed content, check for markers, parse the YAML, <code>git add</code>, <code>git rebase --continue</code>. Then on main, <code>git merge --ff-only feature/cache</code>.</p>'],
      a: `<p>Rebase, do not merge, because the team wants a linear history. <code>git rebase main</code> sets your commit aside, moves the branch to main's tip (M3) and replays F1. F1 and M-something both changed the <code>replicas</code> line, so Git stops with a conflict. Resolve to the agreed final content (4 replicas, keep the cache line and everything main added), confirm no markers remain and that the YAML parses, then <code>git add</code> and <code>git rebase --continue</code>: Git creates F1' on top of M3. Back on main, <code>git merge --ff-only</code> just moves main to F1'. In a hosted setup you would push with <code>--force-with-lease</code> to update the PR and let the platform fast-forward or rebase-merge it.</p>`,
      code: R`# Setup: main moves 3 commits ahead while feature/cache changes the same line
mkdir lab && cd lab && git init -b main
printf 'service: web\nreplicas: 2\n' > app.yaml
git add app.yaml && git commit -m "Add app config"
git switch -c feature/cache
printf 'service: web\nreplicas: 4\ncache: redis\n' > app.yaml && git commit -am "Add cache and scale to 4"
git switch main
printf 'service: web\nreplicas: 3\n' > app.yaml && git commit -am "Scale web to 3"
printf 'team: platform\n' > TEAM && git add TEAM && git commit -m "Add TEAM file"
printf 'service: web\nreplicas: 3\nlogLevel: info\n' > app.yaml && git commit -am "Add log level"

# 1. How far behind is the branch?
git switch feature/cache
git log --oneline feature/cache..main      # the 3 commits you do not have

# 2. Replay your commit on top of main (stops on the conflict)
git rebase main || git status              # "both modified: app.yaml"

# 3. Resolve: write the agreed content (4 replicas, cache, and main's logLevel)
printf 'service: web\nreplicas: 4\nlogLevel: info\ncache: redis\n' > app.yaml
grep -n '^[<=>|]\{7\}' app.yaml && echo "markers left!" || echo "no markers"
python3 -c 'import yaml; print(yaml.safe_load(open("app.yaml")))'

# 4. Mark resolved and let the rebase finish
git add app.yaml
GIT_EDITOR=true git rebase --continue      # keep the original message without opening an editor

# 5. Fast-forward main: a straight line
git switch main
git merge --ff-only feature/cache
git log --oneline --graph -n 5
git branch -d feature/cache
# Hosted (optional): git push --force-with-lease origin feature/cache, then merge the PR`,
      cx: `<p>About eight commands after setup. Graph: F1 is replaced by F1' on top of M3 and main fast-forwards to it. With several commits on the branch you may resolve once per commit; <code>rerere</code> helps.</p>`,
      f: ['How would the steps change if the team allowed merge commits?', 'How do you abort if the rebase goes wrong halfway through?']
    })]
  });

  // ───────────────────────── Topic 5: undo and recovery ─────────────────────────
  topics.push({
    title: 'Undo and Recovery: restore, reset, revert and the reflog Safety Net',
    analogy: `<p>Your <b>private diary</b> and the <b>morning newspaper</b> need different kinds of undo. In your diary you can tear out yesterday's page and nobody will ever know (<b>reset</b>). Once the newspaper is printed and delivered, you cannot pull it back from every doorstep; you print a <b>correction</b> in tomorrow's paper (<b>revert</b>). And the <b>reflog</b> is the security camera in your own house: it recorded every place your bookmark has been, so even a torn-out page can usually be found again.</p>`,
    explain: `<p>🟢 <b>Pick the undo by asking two questions:</b> <i>is the mistake committed?</i> and <i>has anyone else got it (pushed)?</i></p>
      ${H.table(['I want to undo…', 'Command', 'Rewrites history?'], [
        ['edits in a file I have not staged', '<code>git restore FILE</code>', 'no (edits are lost)'],
        ['a file I staged by mistake', '<code>git restore --staged FILE</code>', 'no'],
        ['the last commit, not pushed, keep the changes', '<code>git reset --soft HEAD~1</code>', 'yes, locally'],
        ['the last commit message / forgot a file, not pushed', '<code>git commit --amend</code>', 'yes, locally'],
        ['a commit that is <b>already on a shared branch</b>', '<code>git revert SHA</code>', '<span class="c-g">no: adds a new commit</span>'],
        ['a whole merged feature on main', '<code>git revert -m 1 MERGE_SHA</code>', 'no'],
        ['"I reset/rebased and lost a commit!"', '<code>git reflog</code>, then <code>git branch rescue SHA</code>', 'no']
      ])}
      <p>🟢 <b>reset moves the branch label backwards.</b> The three modes differ only in what happens to your files:</p>
      ${H.table(['Mode', 'Branch label', 'Staging area', 'Working files'], [
        ['<code>--soft</code>', 'moves', 'keeps the changes staged', 'unchanged'],
        ['<code>--mixed</code> (default)', 'moves', 'reset (changes unstaged)', 'unchanged'],
        ['<code>--hard</code>', 'moves', 'reset', '<span class="c-r">overwritten</span>: uncommitted work is lost']
      ])}
      <p>🔵 <b>Why revert, not reset, on a shared branch.</b> If you <code>reset</code> main and force-push, every teammate and CI runner still has the old commits. Their next push brings them back, or their pulls break with confusing errors. <code>git revert</code> creates a <b>new commit</b> that applies the opposite change. History stays honest ("we shipped X, then undid it"), everyone just pulls, and you can even revert the revert later.</p>
      <p>🔵 <b>The reflog</b> (<code>git reflog</code>) is a local diary of every position HEAD has had: commits, resets, rebases, checkouts. A commit you "lost" with <code>reset --hard</code> or a bad rebase is almost always still there for weeks; find its line and put a branch on it. Note what the reflog <b>cannot</b> save: edits you never committed or stashed.</p>`,
    clues: [
      '"undo a commit that is already pushed to main" → <code>git revert</code>, never reset + force-push',
      '"I ran git reset --hard and lost my commit" → <code>git reflog</code>, then branch or reset to <code>HEAD@{n}</code>',
      '"undo the last commit but keep my changes" → <code>git reset --soft HEAD~1</code> (or --mixed)',
      '"roll back a merged PR that broke prod" → <code>git revert -m 1 MERGE_SHA</code> (or the Revert button on the PR)',
      '"deleted a branch by accident" → reflog shows its last commit; <code>git branch NAME SHA</code>',
      '"get one file back from last week" → <code>git restore --source=SHA FILE</code>'
    ],
    code: [R`# Lab 5a: lose a commit on purpose, then get it back
git switch main
echo "a" > a.txt && git add a.txt && git commit -m "Add a"
echo "b" > b.txt && git add b.txt && git commit -m "Add b"
echo "c" > c.txt && git add c.txt && git commit -m "Add c (important)"
git reset --hard HEAD~2          # oops: "Add b" and "Add c" are gone from main
git log --oneline -n 3           # only up to "Add a"
git reflog -n 5                  # HEAD@{1}: commit: Add c (important)
git branch rescue 'HEAD@{1}'     # put a label on it before anything else
git reset --hard rescue          # or: bring main back to it
git log --oneline -n 3`, { lang: 'bash', title: 'Lab 5b: revert on a shared branch', code: R`echo "timeout: 30" > db.yaml && git add db.yaml && git commit -m "Set DB timeout"
echo "timeout: 1" > db.yaml && git commit -am "Lower DB timeout to 1s"    # the bad change, pushed
echo "docs" > README.md && git add README.md && git commit -m "Add README"
git revert --no-edit HEAD~1      # new commit undoing only the bad change
cat db.yaml                      # timeout: 30 again; README.md is still there
git log --oneline -n 4           # history keeps the bad commit and its revert` }],
    codeTitle: ['Recover with reflog', 'Undo safely with revert'],
    viz: [{
      title: 'reset --hard "loses" commits, the reflog finds them',
      input: 'commit Add config; commit Add cache; commit Add alerts; reset --hard HEAD~2; reset --hard HEAD@{1}',
      inputLabel: 'git commands separated by ; (try HEAD@{n} from the reflog table)',
      gen: function (input) { return gitSim(input, { def: this && this.input, reflog: true, outro: 'The reflog is your local undo history: every move of HEAD gets a line, newest first. Faded commits are unreachable but not deleted; Git keeps them for weeks (30 days by default for unreachable entries) before garbage collection may remove them. Tip: <code>git branch rescue HEAD@{1}</code> is the safest first move.' }); }
    }, {
      title: 'Undo on a shared branch: revert adds, reset removes',
      input: 'commit Set DB timeout; commit Lower timeout to 1s; commit Add README; revert C2',
      inputLabel: 'git commands separated by ; (compare with: ...; reset --hard C1)',
      gen: function (input) { return gitSim(input, { def: this && this.input, outro: 'With revert, main only moved <b>forward</b>, so teammates simply pull the fix and nothing they have is invalid. With <code>reset --hard</code> you would also lose "Add README", and you would need a force-push that breaks everyone else\'s clone. Shared branch → revert.' }); }
    }],
    examples: [
      { title: 'Roll back a merged PR that broke production', html: `<p>PR #212 was merged into main with a merge commit and production errors spiked. The fastest safe rollback is to revert the <b>merge</b>. <code>-m 1</code> tells Git "parent 1 (main) is the mainline; undo what parent 2 brought in". GitHub and GitLab both have a <b>Revert</b> button on a merged PR/MR that does the same thing through a new PR.</p>`, code: `git switch main && git pull --ff-only
git log --oneline --merges -n 3            # find the merge commit, e.g. 8e1f0c2
git revert -m 1 --no-edit 8e1f0c2          # new commit that undoes the whole feature
git push                                   # normal push, no force needed
# Later, to re-apply the fixed feature: revert the revert, then merge the fix
git revert --no-edit HEAD` },
      { title: 'Undo the last commit, keep the work (not pushed)', html: `<p>You committed to <code>main</code> by mistake instead of a feature branch. You have not pushed. Make the branch where the commit should be, then move main back. The commit is now only on the new branch, and nothing was lost.</p>`, code: `git branch feature/oops-moved          # label the current commit
git reset --hard HEAD~1                # move main back one commit (work is safe on the new branch)
git switch feature/oops-moved` },
      { title: 'Bring back a deleted branch', html: `<p>You ran <code>git branch -D spike/redis</code> and then realised it had the only copy of a prototype. The commit is still in the object database. The reflog of HEAD shows the last time you were on it (<code>checkout: moving from spike/redis to main</code>); the commit just before that move is the tip.</p>`, code: `git reflog | grep -m 3 'spike/redis'   # find where you left the branch
git branch spike/redis 'HEAD@{4}'      # recreate the label at that entry
git log --oneline -n 3 spike/redis` },
      { title: 'Get one file back from an older commit', html: `<p>Someone broke <code>nginx.conf</code> three commits ago and you only want the old file back, not a whole revert. <code>git restore --source</code> copies the file from any commit into your working tree; then you commit it as a normal change.</p>`, code: `git log --oneline -- nginx.conf            # find a good commit, e.g. 41d2b9e
git restore --source=41d2b9e nginx.conf
git diff                                   # check what changes
git commit -am "Restore nginx.conf from 41d2b9e (broken in 9c0e1aa)"` }
    ],
    deepDive: `<p>🟣 <b>What the reflog really is.</b> Every time a ref moves, Git appends a line to <code>.git/logs/HEAD</code> and <code>.git/logs/refs/heads/BRANCH</code>: old ID, new ID, who, when, why. <code>HEAD@{2}</code> means "where HEAD was two moves ago"; <code>main@{yesterday}</code> uses time. The reflog is <b>local only</b>: it is not pushed or cloned, so a teammate's machine has a different one, and a fresh clone has none. Entries expire: by default 90 days for reachable entries (<code>gc.reflogExpire</code>) and 30 days for unreachable ones (<code>gc.reflogExpireUnreachable</code>); after that, <code>git gc</code> may delete the objects. For commits that are not even in a reflog (for example a dropped stash), <code>git fsck --lost-found</code> lists dangling commits.</p>
      <p><b>ORIG_HEAD</b> is set by risky commands (reset, rebase, merge) to where you were before, so <code>git reset --hard ORIG_HEAD</code> undoes a rebase right after it finished. <b>Reverting a merge</b> has a trap: after <code>revert -m 1</code>, Git considers the feature's commits already merged, so merging the same branch again brings in only <i>new</i> commits. To re-land it, revert the revert first.</p>
      <p><b>What cannot be recovered:</b> uncommitted, unstashed edits overwritten by <code>reset --hard</code>, <code>restore</code>, <code>checkout -- FILE</code> or <code>clean -fd</code>. Commit or stash often ("WIP" commits on your own branch are fine; squash them later). On the server side, hosting platforms usually keep the old branch tip in the push activity log, which helps after a bad force-push but is not a backup strategy.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> "I messed up my Git" is one of the most common things people paste into an assistant, and a good one will ask for <code>git status</code>, <code>git log --oneline --graph -n 15</code> and <code>git reflog -n 15</code> and give you the exact recovery command. That is a real time-saver.</p>
      <p><b>Where it goes wrong:</b> the classic bad answer is "<code>git reset --hard origin/main</code> and force-push" on a shared branch, or "<code>git clean -fdx</code>" to clean up, which deletes untracked files including your local <code>.env</code> and uncommitted work. Before running any suggested undo, ask: <i>does this rewrite shared history? does it delete uncommitted work?</i> When in doubt, make a safety label first (<code>git branch backup-before-fix</code>) and copy the folder; both are free and make any mistake reversible.</p>`,
    problems: [P({
      t: 'Recover a "lost" commit after reset --hard', l: 'Easy', tags: ['reflog', 'reset', 'recovery'], co: ['TCS', 'Capgemini'],
      s: `<p>A junior engineer wanted to "clean up" and ran <code>git reset --hard HEAD~3</code> on their local <code>feature/billing</code> branch. Two of those three commits had not been pushed, including a whole day of work on <code>invoice.yaml</code>. Get the commits back exactly as they were.</p>`,
      ex: `<p>Before the mistake: ${H.c('g', 'F1 - F2 - F3 (tip)')}. After: branch at ${H.c('r', 'C0')}. <code>git reflog</code> shows ${H.c('y', 'HEAD@{1}: commit: Add invoice totals')}. After recovery: <code>git log --oneline -n 3</code> shows F3, F2, F1 again.</p>`,
      bw: `<p>Rewriting the work from memory, or re-cloning the repository (a fresh clone has no reflog and does not have the unpushed commits at all).</p>`,
      q: ['Why does the reflog still know about the commits?', ['It records every position HEAD had locally, and the objects are kept until garbage collection', 'The server keeps a copy of every local commit', 'reset --hard only hides commits for one minute', 'Git copies them to the stash'], 0, 'reset only moved the branch label. The commit objects still exist, and the reflog lists where HEAD was before, so you can point a branch at them again. They are only pruned after the reflog entry expires and gc runs.'],
      h: ['<p>Hint 1: do not run anything that changes history again (no more resets, no gc). Look first: <code>git reflog -n 10</code>.</p>', '<p>Hint 2: the entry <i>just before</i> the reset line is where the branch was. It is usually <code>HEAD@{1}</code>.</p>', '<p>Hint 3: label it first (<code>git branch rescue HEAD@{1}</code>), check it with <code>git log</code>, then move your branch back with <code>git reset --hard rescue</code>.</p>'],
      a: `<p>The reset moved the branch label back three commits; the commits themselves are untouched objects. <code>git reflog</code> shows, newest first, the reset (<code>HEAD@{0}: reset: moving to HEAD~3</code>) and before it the last commit (<code>HEAD@{1}</code>). Create a safety branch there, inspect it, and reset the feature branch back to it. Graph: the label jumps forward again to F3; nothing new is created. Lesson: commit or stash before experiments, and make a backup branch before any reset.</p>`,
      code: R`# Setup: four commits, then the mistake
mkdir lab && cd lab && git init -b main
echo "base" > README.md && git add README.md && git commit -m "Initial commit"
git switch -c feature/billing
for n in 1 2 3; do echo "line $n" >> invoice.yaml; git add invoice.yaml; git commit -m "Invoice step $n"; done
git reset --hard HEAD~3                  # the mistake
git log --oneline                        # only "Initial commit"

# 1. Look, do not touch
git reflog -n 6
# HEAD@{0}: reset: moving to HEAD~3
# HEAD@{1}: commit: Invoice step 3      <- where the branch was

# 2. Put a safety label on it and check it
git branch rescue 'HEAD@{1}'
git log --oneline -n 4 rescue            # Invoice step 3, 2, 1, Initial commit

# 3. Move the feature branch back to it and clean up
git reset --hard rescue
git branch -d rescue
git log --oneline -n 4
# Prevention next time: git branch backup-before-cleanup   (before any reset)`,
      cx: `<p>Four commands. Graph: only the branch label moves; commit IDs are identical to before. Works for about 30 days on unreachable commits by default.</p>`,
      f: ['What if the commits had never been committed, only edited in files?', 'How would you find a commit that is not in any reflog?']
    }), P({
      t: 'Undo a bad commit on the shared main branch', l: 'Medium', tags: ['revert', 'shared branch', 'rollback'], co: ['Amazon', 'Swiggy'],
      s: `<p>Yesterday someone pushed a commit to <code>main</code> that set <code>maxConnections: 5</code> in <code>db.yaml</code>; production now fails under load. Since then, two good commits were pushed on top. Five people and the CI system have pulled main. Undo only the bad change, keep the two good commits, and do it without force-pushing.</p>`,
      c: LAB + ' Use a local bare repo as the shared server.',
      ex: `<p>Before: ${H.c('y', 'main: C1 - BAD - G1 - G2')}. After: ${H.c('g', 'main: C1 - BAD - G1 - G2 - Revert "BAD"')}; <code>db.yaml</code> is back to <code>maxConnections: 100</code>, G1 and G2 still apply, and a normal <code>git push</code> succeeds.</p>`,
      bw: `<p><code>git reset --hard C1</code> then <code>git push --force</code>. It also deletes G1 and G2, every teammate's clone now disagrees with the server, CI caches point at missing commits, and the next push from a teammate may bring BAD back.</p>`,
      bc: `git reset --hard HEAD~3
git push --force      # rewrites shared history for 5 people and CI`,
      q: ['Why is <code>git revert</code> the right tool here?', ['It adds a new commit that undoes BAD, so nobody\'s history is invalidated', 'It deletes BAD from every clone', 'It is faster than reset', 'It skips CI'], 0, 'revert only moves main forward. Everyone pulls the new commit normally; the record shows what happened and when it was undone.'],
      h: ['<p>Hint 1: find the exact bad commit: <code>git log --oneline -- db.yaml</code> or <code>git log -G"maxConnections"</code>.</p>', '<p>Hint 2: <code>git revert SHA</code> undoes just that commit. If it was a merge, add <code>-m 1</code>.</p>', '<p>Hint 3: check the file, run tests, push normally. If G1 touched the same lines, revert can conflict; resolve like any conflict.</p>'],
      a: `<p>Locate the bad commit by searching history for the file or string. <code>git revert</code> computes the inverse diff of that commit and applies it on top of the current main as a new commit, leaving G1 and G2 alone. Check the result, then push normally: it is a fast-forward for the server, so nobody needs to do anything special. In a team with PRs you would create a branch, revert there and open a PR (or press the Revert button), but for an outage a direct revert by an authorised person is the fastest safe rollback. Afterwards, write down why review did not catch it.</p>`,
      code: R`# Setup: a shared "server" and a clone with C1, BAD, G1, G2 already pushed
mkdir lab && cd lab
git init --bare -b main server.git
git clone server.git work && cd work
echo "maxConnections: 100" > db.yaml && git add db.yaml && git commit -m "Add DB config"
echo "maxConnections: 5" > db.yaml && git commit -am "Tune DB pool"          # the bad change
echo "replicas: 3" > app.yaml && git add app.yaml && git commit -m "Scale web to 3"
echo "# runbook" > RUNBOOK.md && git add RUNBOOK.md && git commit -m "Add runbook"
git push -u origin main

# 1. Find the commit that changed the setting
git log --oneline -G'maxConnections' -- db.yaml     # commits whose diff touches that line, newest first
BAD=$(git log --format=%h -n 1 -S'maxConnections: 5' -- db.yaml)
git show --stat "$BAD"

# 2. Undo only that commit with a new commit
git revert --no-edit "$BAD"
cat db.yaml                                         # maxConnections: 100
ls app.yaml RUNBOOK.md                              # the good commits are still here

# 3. Share it the normal way: no force needed
git push
git log --oneline --graph -n 5`,
      cx: `<p>Three steps. Graph: one new commit on main; nothing removed. Rollback time is a couple of minutes plus the deploy pipeline.</p>`,
      f: ['What changes if the bad change arrived as a merge commit from a PR?', 'Later the fix for the pool size is ready. How do you bring the original change back?']
    })]
  });

  // ───────────────────────── Topic 6: remotes, pull requests, GitHub and GitLab ─────────────────────────
  topics.push({
    title: 'Remotes, Pull Requests and Code Review on GitHub and GitLab',
    analogy: `<p>The shared repository is the team's <b>library</b>. You take home a full copy (<b>clone</b>), write in it as much as you like, and every so often check what is new on the library shelves (<b>fetch</b>). When you want your pages on the official shelf, you leave them at the <b>review desk</b> (a <b>pull request</b>) with a note explaining them. A colleague reads them, a robot checks the spelling (<b>CI</b>), and only then the librarian files them (<b>merge</b>).</p>`,
    explain: `<p>🟢 <b>Remotes.</b> A <b>remote</b> is a named URL of another copy of the repository, usually <code>origin</code> (the one you cloned from). Commands that talk to it:</p>
      ${H.table(['Command', 'What it does', 'Changes your files?'], [
        ['<code>git clone URL</code>', 'copy the whole repo and history, set up <code>origin</code>', 'creates them'],
        ['<code>git fetch</code>', 'download new commits; update <code>origin/main</code> and friends', '<span class="c-g">no</span>'],
        ['<code>git pull</code>', '<code>fetch</code> + integrate (merge, or rebase with <code>--rebase</code>)', 'yes'],
        ['<code>git push -u origin BRANCH</code>', 'upload your branch; <code>-u</code> remembers it as the upstream', 'no'],
        ['<code>git remote -v</code>', 'list remotes and their URLs', 'no']
      ])}
      <p>🟢 <b>origin/main</b> is a <b>remote-tracking branch</b>: your local note of "where main was on the server the last time I fetched". It only moves when you fetch, pull or push. <code>git status</code> saying "Your branch is up to date with 'origin/main'" means up to date with that <i>note</i>, not necessarily with the server right now.</p>
      <p>🟢 <b>Pull request (GitHub) = merge request (GitLab).</b> You push a branch, then open a PR/MR asking to merge it into main. The page shows the diff, runs CI, and lets teammates comment line by line, <b>request changes</b> or <b>approve</b>. You push more commits to the same branch to address feedback; the PR updates itself.</p>
      ${H.table(['Idea', 'GitHub', 'GitLab'], [
        ['change proposal', 'Pull Request (PR)', 'Merge Request (MR)'],
        ['CI system', 'GitHub Actions (<code>.github/workflows/*.yml</code>)', 'GitLab CI/CD (<code>.gitlab-ci.yml</code>)'],
        ['guard main', 'branch protection rules / rulesets', 'protected branches + approval rules'],
        ['auto-assign reviewers', '<code>CODEOWNERS</code> file', '<code>CODEOWNERS</code> file (Premium tiers for required approval)'],
        ['command-line tool', '<code>gh</code>', '<code>glab</code>'],
        ['copy of someone else\'s repo', 'fork', 'fork']
      ])}
      <p>🔵 <b>Good PRs and good reviews.</b> Small (a few hundred lines at most), one purpose, a description that says <b>what, why, how it was tested and how to roll back</b>. Reviewers check correctness, security (secrets, permissions, open ports), blast radius (for infra: read the <code>terraform plan</code> or rendered manifest), and readability. Be specific and kind; label tiny points as <code>nit:</code>. Approve when it is good enough and safe, not when it is exactly how you would have written it.</p>`,
    clues: [
      '"fetch vs pull" → fetch downloads only; pull = fetch + merge/rebase',
      '"Your branch is behind origin/main by 3 commits" → remote-tracking branch; pull or rebase',
      '"enforce reviews and passing CI before merge" → branch protection / rulesets, protected branches',
      '"auto-request the platform team for changes to /terraform" → <code>CODEOWNERS</code>',
      '"contribute to a repo you cannot push to" → fork, push to your fork, PR to upstream',
      '"what do you look for when reviewing an infra PR" → plan output, secrets, blast radius, rollback'
    ],
    code: [R`# Lab 6: a fake "GitHub" on your own disk. No account needed.
mkdir -p ~/git-lab && cd ~/git-lab
git init --bare -b main shared.git           # the "server": a repo with no working files
git clone shared.git dev                     # you
git clone shared.git reviewer                # your teammate

cd dev
echo "service: web" > app.yaml && git add app.yaml && git commit -m "Add app config"
git push -u origin main                      # first push; -u sets the upstream

git switch -c feature/readiness
echo "readinessPath: /ready" >> app.yaml && git commit -am "Add readiness path"
git push -u origin feature/readiness         # this is what you would open a PR from

cd ../reviewer
git fetch origin                             # downloads main and feature/readiness
git branch -r                                # origin/main, origin/feature/readiness
git log --oneline origin/main..origin/feature/readiness   # commits in the "PR"
git diff origin/main...origin/feature/readiness           # the "Files changed" tab
git switch main && git pull --ff-only
git merge --no-ff --no-edit origin/feature/readiness      # the "Merge" button
git push                                     # main on the server now has the feature
git push origin --delete feature/readiness   # "Delete branch" after merging

cd ../dev
git switch main && git pull --ff-only        # you get the merged result
git fetch --prune                            # forget origin/feature/readiness
git branch -d feature/readiness`, { lang: 'bash', title: 'Optional: the same flow on GitHub or GitLab (needs an account)', code: R`# GitHub with the gh CLI (gh auth login first)
gh pr create --fill --base main --head feature/readiness   # title/body from commits
gh pr checks                                               # CI status
gh pr review --approve                                     # as the reviewer
gh pr merge --squash --delete-branch

# GitLab with push options (no extra tool) or the glab CLI
git push -o merge_request.create -o merge_request.target=main origin feature/readiness
glab mr create --fill --target-branch main
glab mr merge --squash --remove-source-branch` }],
    codeTitle: ['Local remote + PR flow', 'Hosted PR/MR commands'],
    viz: [{
      title: 'Life of a pull request',
      input: 'review rounds=1 ci=fail-then-pass',
      inputLabel: 'review rounds=0..3 ci=pass | fail-then-pass',
      gen: function (input) {
        var m = String(input || '').match(/rounds\s*=\s*(\d)/), c = String(input || '').match(/ci\s*=\s*(pass|fail-then-pass)/);
        if (!m || !c) throw new Error('Use: review rounds=1 ci=pass   (rounds 0-3, ci pass or fail-then-pass)');
        var rounds = Number(m[1]), ciFail = c[1] === 'fail-then-pass';
        if (rounds > 3) throw new Error('Use 0-3 review rounds');
        var nodes = [box('dev', 'your laptop', 12, 10, 16), box('br', 'origin: feature branch', 44, 10, 22), box('pr', 'PR / MR page', 44, 30, 18), box('ci', 'CI pipeline', 80, 10, 16), box('rev', 'reviewer', 80, 30, 14), box('main', 'origin: main', 44, 50, 18), box('team', 'teammates', 12, 50, 14)];
        var edges = [['dev', 'br', 'push'], ['br', 'pr', 'open'], ['pr', 'ci', 'run'], ['pr', 'rev', 'request'], ['rev', 'pr', 'comment/approve'], ['pr', 'main', 'merge'], ['main', 'team', 'pull']];
        var f = [], status = { checks: 'not run', approvals: '0 / 1 required', branch: 'feature/readiness', mergeable: 'no' };
        function fr(narr, hlN, hlE, extra) {
          var ehl = {}; (hlE || []).forEach(function (e) { ehl[e] = 'ok'; });
          var hl = {}; (hlN || []).forEach(function (n) { hl[n] = 'cur'; });
          var parts = [{ type: 'graph', label: 'who does what', directed: true, height: 60, nodes: nodes, edges: edges, hl: hl, ehl: ehl }, { type: 'vars', label: 'PR status box', vals: JSON.parse(JSON.stringify(status)), hl: extra || {} }];
          f.push({ narr: narr, parts: parts });
        }
        fr('You finished a small change on <code>feature/readiness</code> locally and ran the tests. Nothing is shared yet.', ['dev']);
        fr('<code>git push -u origin feature/readiness</code> uploads the branch. Main is untouched: a pushed branch is just a proposal waiting to happen.', ['br'], ['dev-br']);
        fr('You open the PR (GitHub) / MR (GitLab) from that branch into <code>main</code>, with a description: what, why, how tested, how to roll back. CODEOWNERS automatically requests the platform team.', ['pr'], ['br-pr', 'pr-rev']);
        status.checks = ciFail ? 'failed: yamllint' : 'passed';
        fr('CI runs on the PR: lint, tests, maybe <code>terraform plan</code>. ' + (ciFail ? '<span class="c-r">It fails</span>: yamllint found bad indentation. Branch protection blocks merging while required checks fail.' : '<span class="c-g">All checks pass.</span>'), ['ci'], ['pr-ci'], { checks: ciFail ? 'bad' : 'ok' });
        if (ciFail) {
          status.checks = 'passed';
          fr('You fix the indentation locally, commit, and <code>git push</code> again to the <b>same branch</b>. The PR updates itself and CI re-runs: green.', ['dev', 'ci'], ['dev-br', 'pr-ci'], { checks: 'ok' });
        }
        for (var r = 1; r <= rounds; r++) {
          status.approvals = '0 / 1 required (changes requested)';
          fr('Review round ' + r + ': the reviewer leaves line comments, e.g. "<i>nit: name the probe port</i>" and "<i>what happens if /ready is slow? add a timeout</i>", and chooses <b>Request changes</b>.', ['rev'], ['rev-pr'], { approvals: 'bad' });
          fr('You reply to each comment, push a follow-up commit to the branch, and re-request review. Small PRs make this loop fast; huge PRs get rubber-stamped or stall for days.', ['dev', 'br'], ['dev-br', 'br-pr']);
        }
        status.approvals = '1 / 1 required'; status.mergeable = 'yes';
        fr('The reviewer approves. Required checks are green and the required approval is there, so branch protection lets the PR merge.', ['rev', 'pr'], ['rev-pr'], { approvals: 'ok', mergeable: 'ok' });
        status.branch = 'deleted after merge';
        fr('Merge (with the team\'s chosen method: merge commit, squash or rebase). <code>main</code> moves forward on the server and the feature branch is deleted. The deploy pipeline for main starts.', ['main'], ['pr-main'], { branch: 'done' });
        fr('Teammates run <code>git pull</code> (or <code>git fetch</code> + rebase) and get the change. You switch to main, pull, and delete your local branch. One small change, reviewed and tested, is now in production.', ['team', 'dev'], ['main-team']);
        return f;
      }
    }, {
      title: 'fetch vs pull: what moves where',
      input: 'fetch',
      inputLabel: 'type fetch or pull',
      gen: function (input) {
        var mode = String(input || '').trim();
        if (mode !== 'fetch' && mode !== 'pull') throw new Error('Type fetch or pull');
        function g(server, tracking, local, hl) {
          return { type: 'table', label: 'three pointers you should know', columns: ['pointer', 'where it lives', 'points at'], rows: [['main', 'server (GitHub/GitLab)', server], ['origin/main', 'your laptop (a cached note)', tracking], ['main', 'your laptop (your branch)', local]], hl: hl || {} };
        }
        var f = [];
        f.push({ narr: 'Right after cloning, all three agree on C2.', parts: [g('C2', 'C2', 'C2')] });
        f.push({ narr: 'A teammate pushes C3 and C4. The server moves. Your laptop knows nothing: <code>git status</code> still says "up to date with origin/main", because it compares with your cached note.', parts: [g('C4', 'C2', 'C2', { 0: 'cur' })] });
        f.push({ narr: '<code>git fetch</code> downloads C3 and C4 and moves <b>origin/main</b> to C4. Your own main and your files do <b>not</b> change. Now <code>git status</code> says "behind by 2 commits", and you can inspect safely with <code>git log main..origin/main</code>.', parts: [g('C4', 'C4', 'C2', { 1: 'ok' })] });
        if (mode === 'pull') {
          f.push({ narr: '<code>git pull</code> = fetch + integrate. With no local commits it fast-forwards your main to C4 and updates your files. With local commits it would merge (or rebase with <code>--rebase</code>), which is why <code>pull.ff only</code> is a good default.', parts: [g('C4', 'C4', 'C4', { 2: 'ok' })] });
        } else {
          f.push({ narr: 'You stay on C2 until you choose: <code>git merge --ff-only origin/main</code>, <code>git rebase origin/main</code>, or nothing. Fetch is always safe, which is why many engineers fetch often and pull deliberately.', parts: [g('C4', 'C4', 'C2', { 2: 'cur' })] });
          f.push({ narr: '<code>git merge --ff-only origin/main</code> moves your main to C4. Together, fetch + merge is exactly what <code>git pull</code> does in one step. Type <b>pull</b> to compare.', parts: [g('C4', 'C4', 'C4', { 2: 'ok' })] });
        }
        f.push({ narr: '<code>git push</code> is the mirror image: it uploads your commits and moves the <b>server\'s</b> main, then updates your origin/main to match. If the server has commits you lack, the push is rejected until you integrate them.', parts: [g('C5', 'C5', 'C5', { 0: 'ok', 1: 'ok', 2: 'ok' })] });
        return f;
      }
    }],
    examples: [
      { title: 'Contributing through a fork', html: `<p>You want to fix a typo in an open-source Helm chart you cannot push to. Fork it on GitHub/GitLab, clone <b>your fork</b> as <code>origin</code>, add the original as <code>upstream</code>, branch from <code>upstream/main</code>, push to your fork and open the PR to upstream. Keep your fork current by fetching upstream.</p>`, code: `git clone git@github.com:YOU/charts.git && cd charts
git remote add upstream https://github.com/ORG/charts.git
git fetch upstream
git switch -c fix-readme-typo upstream/main
git commit -am "Fix typo in README install section"
git push -u origin fix-readme-typo     # then open the PR: YOU:fix-readme-typo -> ORG:main` },
      { title: 'CODEOWNERS: the right reviewers automatically', html: `<p>Put a <code>CODEOWNERS</code> file in <code>.github/</code> (GitHub) or the repo root, <code>docs/</code> or <code>.gitlab/</code> (GitLab). Each line maps a path pattern to owners; the last matching line wins. With "require review from code owners" turned on, a change to <code>terraform/</code> cannot merge without the platform team.</p>`, code: `mkdir -p .github
cat > .github/CODEOWNERS <<'EOF'
# path pattern            owners
*                         @acme/backend
/terraform/               @acme/platform
/.github/workflows/       @acme/platform @acme/security
*.tf                      @acme/platform
EOF
git add .github/CODEOWNERS && git commit -m "Add CODEOWNERS for infra paths"` },
      { title: 'A PR description reviewers love', html: `<p>Reviewers spend most of their time understanding <i>why</i>. A short template in <code>.github/pull_request_template.md</code> (GitHub) or <code>.gitlab/merge_request_templates/</code> (GitLab) makes every PR answer the same questions.</p><pre>## What
Raise web replicas 3 → 5 and add an HPA (min 3, max 8).
## Why
Black Friday load test hit 85% CPU at 3 replicas (OPS-512).
## How tested
helm template + kubeconform; staging load test 2x traffic, p95 180 ms.
## Rollback
Revert this PR; HPA is removed with it.</pre>` },
      { title: 'Review checklist for an infrastructure PR', html: `<p>When the change is config or infrastructure, a reviewer checks things a unit test will not:</p>${H.table(['Check', 'Why'], [['Is the <code>terraform plan</code> / rendered manifest attached?', 'review the effect, not just the text'], ['Any destroy/replace of stateful resources?', 'data loss risk'], ['Secrets, tokens, real hostnames in the diff?', 'leaks are forever (topic 7)'], ['Security groups opened to 0.0.0.0/0?', 'exposure'], ['Can it be rolled back by a revert?', 'some changes (migrations) cannot'], ['Who is on call when it deploys?', 'merge Friday 6 pm is a choice']])}` }
    ],
    deepDive: `<p>🟣 <b>Refspecs and tracking.</b> <code>git remote add origin URL</code> writes a fetch refspec <code>+refs/heads/*:refs/remotes/origin/*</code>: "copy every server branch into my <code>origin/</code> namespace". That is all <code>origin/main</code> is. <code>git fetch --prune</code> (or <code>fetch.prune true</code>) deletes tracking refs for branches removed on the server. A branch's <b>upstream</b> (<code>branch.NAME.remote</code> and <code>.merge</code> in <code>.git/config</code>, set by <code>push -u</code>) is what makes plain <code>git pull</code>, <code>git push</code> and "ahead 2, behind 1" work. GitHub exposes every PR as <code>refs/pull/N/head</code> and GitLab as <code>refs/merge-requests/N/head</code>, so you can fetch any PR locally to test it.</p>
      <p><b>Authentication.</b> Use SSH keys (see Cloud &amp; DevOps 1) or HTTPS with a credential helper and a <b>fine-grained, expiring</b> personal access token; passwords are not accepted for Git operations on GitHub. In CI use the platform's short-lived job token (<code>GITHUB_TOKEN</code>, <code>CI_JOB_TOKEN</code>) or OIDC rather than a personal token. Commit signing (GPG, SSH or Sigstore gitsign) lets platforms show "Verified" and rulesets can require it.</p>
      <p><b>Guarding main at scale.</b> Branch protection or rulesets (GitHub) and protected branches with approval rules (GitLab) can require: a PR for every change, N approvals, code-owner approval, passing required checks, up-to-date branches, linear history, signed commits, and no force-push or deletion. Busy repos add a <b>merge queue</b> (GitHub merge queue, GitLab merge trains) that tests each PR on top of the PRs ahead of it, so main stays green even when many PRs merge per hour.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> AI review assistants (GitHub Copilot code review, GitLab Duo, CodeRabbit and others) now leave the first round of comments within minutes: possible bugs, missing tests, risky IAM wildcards, secrets in the diff. They also summarise long PRs and draft descriptions. Coding agents open PRs themselves, so reviewers see more PRs than ever.</p>
      <p><b>How to use it well:</b> treat bot comments as a linter with opinions, not as approval. The human reviewer still owns the questions a bot cannot answer: is this the right change, what is the blast radius, who gets paged if it fails, can we roll it back. Keep branch protection requiring a <b>human</b> approval and make sure agent tokens cannot approve or merge their own PRs. Smaller PRs help both humans and AI reviewers; a 3,000-line agent PR should be split before anyone reviews it.</p>`,
    problems: [P({
      t: 'Run a full pull-request flow locally with two teammates', l: 'Easy', tags: ['remote', 'push', 'fetch', 'pull request'], co: ['GitLab', 'Wipro'],
      s: `<p>Your company has not given you GitHub access yet, but you want to practise the PR flow. Using only local folders, create a shared "server", a <code>dev</code> clone and a <code>reviewer</code> clone. As <code>dev</code>, push a branch that adds a <code>healthcheck</code> line to <code>app.yaml</code>. As <code>reviewer</code>, inspect exactly what the "PR" would change, request one fix, then merge it with a merge commit and delete the branch. Finally update <code>dev</code>.</p>`,
      ex: `<p>Server main after: ${H.c('g', 'C1 - M (merge of feature/health: H1, H2)')}. <code>git branch -r</code> in dev after <code>fetch --prune</code> shows only ${H.c('b', 'origin/main')}.</p>`,
      bw: `<p>Copying the changed file from one folder to the other, or committing straight to main from dev. There is no review step, no record of what changed and why, and no way to practise the real commands.</p>`,
      q: ['Which command shows the reviewer exactly what the PR would change compared with main?', ['<code>git diff origin/main...origin/feature/health</code>', '<code>git pull</code>', '<code>git status</code>', '<code>git log origin/main</code>'], 0, 'The three-dot diff compares the feature tip with the merge base it shares with main, which is exactly the "Files changed" view of a PR, even if main has moved since.'],
      h: ['<p>Hint 1: a bare repository (<code>git init --bare</code>) has no working files and accepts pushes, just like a hosted repo.</p>', '<p>Hint 2: the reviewer runs <code>git fetch</code>, then <code>git log</code> and <code>git diff</code> with <code>origin/main...origin/feature/health</code>.</p>', '<p>Hint 3: "request changes" = dev pushes another commit to the same branch. "Merge" = reviewer merges <code>--no-ff</code> into main and pushes; delete with <code>git push origin --delete</code>.</p>'],
      a: `<p>The bare repo plays GitHub/GitLab. dev pushes main once, then a feature branch with <code>-u</code>. The reviewer fetches, reads the commit list (<code>main..feature</code>) and the three-dot diff (the PR's "Files changed" tab). The requested fix is simply a second commit on the same branch, pushed again; the reviewer fetches again. Merging with <code>--no-ff</code> mirrors the default "Create a merge commit" button and keeps the PR visible as one merge in <code>git log --first-parent</code>. After pushing main, the reviewer deletes the remote branch; dev pulls main, prunes the stale tracking ref and deletes the local branch. Graph: main gains one merge commit with the two feature commits on its second parent.</p>`,
      code: R`# 1. A shared "server" and two clones
mkdir lab && cd lab
git init --bare -b main server.git
git clone server.git dev && git clone server.git reviewer
cd dev
printf 'service: web\nreplicas: 2\n' > app.yaml
git add app.yaml && git commit -m "Add app config" && git push -u origin main

# 2. dev opens the "PR": push a feature branch
git switch -c feature/health
echo "healthcheck: /health" >> app.yaml && git commit -am "Add health check path"
git push -u origin feature/health

# 3. reviewer reads the PR
cd ../reviewer
git fetch origin
git log --oneline origin/main..origin/feature/health     # commits in the PR
git diff origin/main...origin/feature/health             # "Files changed"
# Review comment: "please use /healthz like the other services"

# 4. dev addresses the comment with a new commit on the same branch
cd ../dev
sed -i 's#/health$#/healthz#' app.yaml && git commit -am "Use /healthz path"
git push

# 5. reviewer approves and merges with a merge commit, then deletes the branch
cd ../reviewer
git fetch origin
git switch main && git pull --ff-only origin main
git merge --no-ff -m "Merge feature/health (PR #1)" origin/feature/health
git push origin main
git push origin --delete feature/health

# 6. dev catches up and cleans up
cd ../dev
git switch main && git pull --ff-only
git fetch --prune
git branch -d feature/health
git log --oneline --graph -n 5`,
      cx: `<p>About 20 commands. Graph: server main gets a merge commit whose second parent chain holds the two feature commits. On a real platform steps 3-5 are buttons, but the Git underneath is the same.</p>`,
      f: ['How would you make the server reject direct pushes to main?', 'Why might a team pick squash merge instead of a merge commit here?']
    })]
  });

  // ───────────────────────── Topic 7: .gitignore and secrets hygiene ─────────────────────────
  // Simplified .gitignore matcher (order matters, last match wins, ! re-includes, dir/ for folders,
  // a slash inside the pattern anchors it to the repo root, an excluded folder cannot be re-included).
  function ignoreRx(glob) {
    var s = '', i;
    for (i = 0; i < glob.length; i++) {
      var ch = glob.charAt(i);
      if (ch === '*' && glob.charAt(i + 1) === '*') { s += '.*'; i++; if (glob.charAt(i + 1) === '/') i++; }
      else if (ch === '*') s += '[^/]*';
      else if (ch === '?') s += '[^/]';
      else s += ch.replace(/[.+^$(){}|[\]\\]/g, '\\$&');
    }
    return new RegExp('^' + s + '$');
  }
  function ignoreMatch(p, path, isDir) {
    var neg = p.charAt(0) === '!', pat = neg ? p.slice(1) : p, dirOnly = /\/$/.test(pat);
    pat = pat.replace(/\/$/, '');
    if (dirOnly && !isDir) return null;
    var anchored = pat.indexOf('/') >= 0;
    pat = pat.replace(/^\//, '');
    var target = anchored ? path : path.split('/').pop();
    return ignoreRx(pat).test(target) ? (neg ? 'include' : 'ignore') : null;
  }
  function ignoreState(pats, path, isDir) {
    var st = null, by = null;
    pats.forEach(function (p) { var r = ignoreMatch(p, path, isDir); if (r) { st = r; by = p; } });
    return { ignored: st === 'ignore', by: by };
  }
  function ignoreFile(pats, file) {
    var segs = file.split('/');
    for (var i = 1; i < segs.length; i++) {
      var d = segs.slice(0, i).join('/'), s = ignoreState(pats, d, true);
      if (s.ignored) return { ignored: true, by: s.by + ' (whole folder ' + d + '/ excluded)' };
    }
    return ignoreState(pats, file, false);
  }

  topics.push({
    title: '.gitignore and Secrets Hygiene: Keep Junk Out, and What to Do When a Key Leaks',
    analogy: `<p><code>.gitignore</code> is the <b>"do not pack" list</b> taped inside your suitcase: dirty laundry (logs), the hotel's towels (build output) and your house keys (secrets) stay behind. If you <b>do</b> mail a copy of your house key to the whole team by mistake, shredding your own copy does nothing about the copies already delivered. The only real fix is to <b>change the locks</b> (rotate the secret) first. Cleaning up afterwards is good hygiene, not the rescue.</p>`,
    explain: `<p>🟢 <b>.gitignore</b> is a text file listing patterns of files Git should not offer to track. It only affects <b>untracked</b> files: if a file is already committed, ignoring it later does nothing until you untrack it with <code>git rm --cached FILE</code>.</p>
      ${H.table(['Pattern', 'Matches'], [
        ['<code>*.log</code>', 'any file ending in .log, in any folder'],
        ['<code>.env</code>', 'a file or folder named .env anywhere'],
        ['<code>build/</code>', 'folders named build (and everything inside)'],
        ['<code>/config.local.yaml</code>', 'only at the repo root (a slash anchors it)'],
        ['<code>**/secrets/*.pem</code>', '.pem files inside any secrets folder'],
        ['<code>!.env.example</code>', 'exception: do track this one'],
        ['<code># comment</code>', 'ignored line']
      ])}
      <p>Order matters: the <b>last</b> matching line wins. <code>git check-ignore -v FILE</code> tells you exactly which line ignores a file. Typical DevOps entries: <code>.env</code>, <code>*.pem</code>, <code>*.key</code>, <code>kubeconfig</code>, <code>*.tfstate</code>, <code>.terraform/</code>, <code>node_modules/</code>, <code>__pycache__/</code>, <code>*.log</code>, <code>dist/</code>.</p>
      <p>🟢 <b>Secrets never go in Git</b>, not even in a private repo: every clone, fork, CI cache and backup gets a copy, and history keeps it forever. Code reads secrets from the environment (<code>process.env.API_KEY</code>, <code>os.environ["API_KEY"]</code>) and the real values live in a secret manager or the CI platform's secret store. Commit a <code>.env.example</code> with placeholders like <code>API_KEY=changeme</code> so people know what to set.</p>
      <p>🔵 <b>If a secret is committed (the order matters):</b></p>
      <ol><li><b>Rotate it first.</b> Create a new key, deploy it, and revoke the old one at the provider. Assume it is already stolen: bots scan public pushes within minutes.</li>
      <li><b>Check for misuse</b> in the provider's logs (for example CloudTrail for an AWS key).</li>
      <li><b>Fix the code</b> to read the value from the environment, and ignore the file.</li>
      <li><b>Remove it from history</b> with <code>git filter-repo</code>, force-push the rewritten branches and tags, and have everyone re-clone. Ask the host to purge cached views and PR refs if needed.</li>
      <li><b>Prevent:</b> a pre-commit secret scanner (gitleaks) and server-side push protection.</li></ol>
      <p>🔵 <b>Why removal alone is not enough:</b> the old commits still exist in teammates' clones, forks, CI caches, container images built from the repo, and in the hands of anyone who already scraped it. Rewriting history hides it from <i>new</i> clones only. A revoked key is harmless wherever it is copied.</p>`,
    clues: [
      '"I added it to .gitignore but Git still tracks it" → already tracked: <code>git rm --cached FILE</code>',
      '"why is this file ignored?" → <code>git check-ignore -v FILE</code>',
      '"we pushed an AWS key to GitHub" → rotate/revoke first, check logs, then filter-repo and force-push',
      '"is deleting the file in a new commit enough?" → no: it is still in history, clones and forks',
      '"stop secrets before they are committed" → pre-commit gitleaks + push protection',
      '"where should the real values live?" → env vars injected from a secret manager / CI secrets, with a committed .env.example'
    ],
    code: [{ lang: 'text', title: '.gitignore for a typical DevOps repo', code: `# Secrets and local config: never commit
.env
.env.*
!.env.example
*.pem
*.key
kubeconfig
*.kubeconfig

# Terraform: state can contain secrets; providers are huge
*.tfstate
*.tfstate.*
.terraform/
crash.log

# Build output, dependencies, caches
dist/
build/
node_modules/
__pycache__/
*.pyc

# Logs and OS/editor junk
*.log
.DS_Store
.idea/
.vscode/*
!.vscode/extensions.json` }, R`# Lab 7: ignore, untrack, and check
printf 'API_KEY=changeme\n' > .env            # a fake local secret file
printf 'API_KEY=changeme\n' > .env.example    # placeholder that IS committed
printf '.env\n.env.*\n!.env.example\n*.log\n' > .gitignore
touch debug.log
git status --short                            # shows .gitignore and .env.example only
git check-ignore -v .env debug.log            # which line ignores each file
git add .gitignore .env.example && git commit -m "Add gitignore and env example"

# A file that was committed BEFORE it was ignored stays tracked:
git ls-files | grep -x '.env' && git rm --cached .env   # untrack, keep the local file

# Global ignores for your machine only (editor files, OS junk)
git config --global core.excludesFile ~/.gitignore_global
printf '.DS_Store\n.idea/\n' >> ~/.gitignore_global`, { lang: 'yaml', title: '.pre-commit-config.yaml: scan every commit for secrets', code: `repos:
  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.24.2
    hooks:
      - id: gitleaks
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v5.0.0
    hooks:
      - id: detect-private-key
      - id: check-added-large-files
        args: ["--maxkb=500"]` }],
    codeTitle: ['.gitignore template', 'Ignore and untrack lab', 'Pre-commit secret scanning'],
    viz: [{
      title: '.gitignore tester: which files would git add . pick up?',
      input: '*.log, .env*, !.env.example, build/, *.tfstate, !logs/keep.log, node_modules/',
      inputLabel: 'patterns, comma separated, in file order',
      gen: function (input) {
        var pats = String(input || '').split(',').map(function (s) { return s.trim(); }).filter(function (s) { return s && s.charAt(0) !== '#'; });
        if (!pats.length || pats.length > 10) throw new Error('Give 1-10 patterns separated by commas, e.g. *.log, .env, build/');
        pats.forEach(function (p) { if (!/^!?[\w.*?\/-]+$/.test(p)) throw new Error('Keep patterns simple: letters, digits, . * ? / - and an optional leading ! (got "' + p + '")'); });
        var files = ['.env', '.env.example', '.env.prod', 'app.log', 'logs/keep.log', 'src/app.js', 'build/app.js', 'terraform/main.tf', 'terraform/terraform.tfstate', 'node_modules/lib/index.js'];
        function table(n, newHl) {
          var used = pats.slice(0, n), hl = {};
          var rows = files.map(function (f, i) {
            var r = ignoreFile(used, f);
            if (newHl && newHl[i]) hl[i] = newHl[i];
            return [f, r.ignored ? 'ignored' : 'would be committed', r.by || '-'];
          });
          return { type: 'table', label: 'git status after these patterns', columns: ['file', 'result', 'decided by'], rows: rows, hl: hl };
        }
        var f = [{ narr: 'With no .gitignore, <code>git add .</code> would stage <b>everything</b>, including <code>.env</code>, state files and dependencies. Patterns are read top to bottom; for each file the <b>last</b> matching pattern wins.', parts: [table(0, (function () { var h = {}; files.forEach(function (_, i) { h[i] = 'cur'; }); return h; })())] }];
        pats.forEach(function (p, k) {
          var before = files.map(function (fl) { return ignoreFile(pats.slice(0, k), fl).ignored; });
          var after = files.map(function (fl) { return ignoreFile(pats.slice(0, k + 1), fl).ignored; });
          var hl = {}, changed = [];
          files.forEach(function (fl, i) { if (before[i] !== after[i]) { hl[i] = after[i] ? 'bad' : 'ok'; changed.push(fl); } });
          var why = p.charAt(0) === '!' ? 'A leading <code>!</code> is an exception: it re-includes files an earlier pattern ignored. It cannot rescue a file whose <b>folder</b> is excluded.' : /\/$/.test(p) ? 'A trailing <code>/</code> means "folders only": everything inside is ignored.' : p.indexOf('/') >= 0 ? 'A slash in the middle anchors the pattern to the repo root.' : 'No slash, so it matches the file name in any folder.';
          f.push({ narr: 'Pattern ' + (k + 1) + ': <code>' + H.esc(p) + '</code>. ' + why + ' ' + (changed.length ? 'Changed: <b>' + changed.map(H.esc).join(', ') + '</b>.' : 'Nothing changed for these files.'), parts: [table(k + 1, hl)] });
        });
        var leaks = files.filter(function (fl) { return /\.env(?!\.example)|tfstate/.test(fl) && !ignoreFile(pats, fl).ignored; });
        f.push({ narr: leaks.length ? '<span class="c-r">Warning:</span> ' + leaks.map(H.esc).join(', ') + ' would still be committed. Secret-looking files must be ignored. Check any file with <code>git check-ignore -v FILE</code>.' : 'Good: secrets and state stay local, <code>.env.example</code> is shared, and dependencies are rebuilt instead of committed. Remember: .gitignore does nothing for files that are already tracked.', parts: [table(pats.length, (function () { var h = {}; files.forEach(function (fl, i) { if (leaks.indexOf(fl) >= 0) h[i] = 'bad'; }); return h; })())] });
        return f;
      }
    }, {
      title: 'A leaked key: why rotation comes first',
      input: 'public',
      inputLabel: 'type public or private (repository visibility)',
      gen: function (input) {
        var vis = String(input || '').trim().toLowerCase();
        if (vis !== 'public' && vis !== 'private') throw new Error('Type public or private');
        var copies = ['your laptop'], f = [], tl = [];
        function fr(t, ev, narr, hl, keyState) {
          tl.push([t, ev]);
          var h = {}; (hl || []).forEach(function (x) { h[x] = keyState === 'revoked' ? 'done' : 'bad'; });
          f.push({ narr: narr, parts: [{ type: 'table', label: 'timeline', columns: ['time', 'event'], rows: tl.slice(), hl: one(tl.length - 1, 'cur') }, { type: 'set', label: 'places holding a copy of API_KEY', items: copies.slice(), hl: h }, { type: 'vars', label: 'the key at the provider', vals: { status: keyState }, hl: { status: keyState === 'revoked' ? 'ok' : 'bad' } }] });
        }
        fr('09:00', 'commit .env with API_KEY', 'You commit <code>.env</code> by accident. So far the key is only on your laptop, inside the <code>.git</code> folder. If you notice <b>now</b>, before pushing, <code>git reset --soft HEAD~1</code> plus a .gitignore line fixes it and nothing leaks.', ['your laptop'], 'active');
        copies.push('server repo'); copies.push('CI runner cache');
        fr('09:05', 'git push; CI runs', 'You push. The server has it, and the CI job that cloned the repo has it in its cache and maybe in a built image.', ['server repo', 'CI runner cache'], 'active');
        if (vis === 'public') { copies.push('scraper bots'); copies.push('a fork'); fr('09:06', 'scanners find it', 'On a <b>public</b> repo, automated scrapers watch every push and test leaked keys within minutes. Someone may already be using it. GitHub secret scanning may also alert the provider, which can quarantine or revoke some key types.', ['scraper bots', 'a fork'], 'active'); }
        else { copies.push('3 teammates\' clones'); fr('09:30', 'teammates pull', 'On a <b>private</b> repo the audience is smaller, but every teammate, contractor and integration with read access now has it, and private repos can become public or leak later.', ['3 teammates\' clones'], 'active'); }
        fr('09:40', 'you notice', 'You notice. The tempting move is to delete the file in a new commit and move on. But the key is still in history and in every place listed on the right.', copies.slice(), 'active');
        fr('09:45', 'ROTATE: new key, deploy, revoke old', '<b>Step 1: rotate.</b> Create a new key, put it in the secret manager / CI secrets, deploy, then revoke the old key at the provider. Now every copy everywhere is a dead key. This is the step that actually stops the damage.', copies.slice(), 'revoked');
        fr('10:00', 'check provider logs', '<b>Step 2: check for misuse</b> between 09:05 and 09:45 (for example in CloudTrail, the billing dashboard or the API provider\'s usage logs). Open an incident if anything looks wrong.', copies.slice(), 'revoked');
        copies = copies.filter(function (c) { return c !== 'server repo'; });
        fr('10:30', 'filter-repo + force-push + re-clone', '<b>Step 3: clean history.</b> <code>git filter-repo</code> rewrites every commit without the secret; you force-push all branches and tags and ask everyone to re-clone. New clones are clean. Old clones, forks, caches and scrapers still hold the (now dead) key, which is why step 1 had to come first.', copies.slice(), 'revoked');
        fr('11:00', 'prevent: hooks + push protection', '<b>Step 4: prevent.</b> Add a gitleaks pre-commit hook and enable server-side push protection so the next leaked secret is blocked before it is pushed. Write a short blameless postmortem.', copies.slice(), 'revoked');
        return f;
      }
    }],
    examples: [
      { title: 'Read secrets from the environment, not from code', html: `<p>Instead of a hard-coded key, the app reads an environment variable and fails fast if it is missing. Locally, developers copy <code>.env.example</code> to <code>.env</code> (ignored). In CI and production, the platform injects the value from its secret store.</p>`, code: { lang: 'js', title: 'config.js', code: `// Read configuration from the environment; never hard-code secrets.
const apiKey = process.env.API_KEY;
if (!apiKey) {
  // Fail fast with a clear message, but never print the value itself.
  throw new Error('API_KEY is not set. Copy .env.example to .env for local runs.');
}
module.exports = { apiKey };`, alt: [
        { lang: 'python', title: 'config.py', code: `# Read configuration from the environment; never hard-code secrets.
import os

API_KEY = os.environ.get("API_KEY")
if not API_KEY:
    # Fail fast with a clear message, but never print the value itself.
    raise RuntimeError("API_KEY is not set. Copy .env.example to .env for local runs.")` },
        { lang: 'java', title: 'Config.java', code: `// Read configuration from the environment; never hard-code secrets.
final class Config {
    static final String API_KEY = require("API_KEY");

    private static String require(String name) {
        String value = System.getenv(name);
        if (value == null || value.isEmpty()) {
            // Fail fast with a clear message, but never print the value itself.
            throw new IllegalStateException(name + " is not set. Copy .env.example to .env for local runs.");
        }
        return value;
    }
}` },
        { lang: 'cpp', title: 'config.cpp', code: `// Read configuration from the environment; never hard-code secrets.
#include <cstdlib>
#include <stdexcept>
#include <string>

std::string apiKey() {
    const char* value = std::getenv("API_KEY");
    if (value == nullptr || *value == '\\0') {
        // Fail fast with a clear message, but never print the value itself.
        throw std::runtime_error("API_KEY is not set. Copy .env.example to .env for local runs.");
    }
    return value;
}` }
      ] } },
      { title: '"It is in .gitignore but still shows up"', html: `<p>Someone committed <code>config/local.yaml</code> last month; today you added it to <code>.gitignore</code>, but every edit still shows in <code>git status</code>. Ignore rules only apply to <b>untracked</b> files. Untrack it (the local file stays), commit, and tell teammates: their next pull will <b>delete</b> the file from their working tree, so they should back it up first. If it held secrets, also rotate them.</p>`, code: `git rm --cached config/local.yaml          # stop tracking, keep my copy
echo "config/local.yaml" >> .gitignore
git commit -am "Stop tracking local config"
git check-ignore -v config/local.yaml      # .gitignore:12:config/local.yaml` },
      { title: 'Scan the whole history once', html: `<p>Before open-sourcing an internal repo, scan <b>all</b> history, not just the current files: a key deleted two years ago is still in an old commit. gitleaks reports the commit, file and line; then rotate anything real and clean history before publishing.</p>`, code: `gitleaks git -v .                              # scan every commit (gitleaks 8.19+)
git log --all --oneline -S'changeme' -- .env    # find commits that added/removed a string
git log --all --diff-filter=A --name-only --format='%h %s' -- '*.pem'   # who ever added .pem files` },
      { title: 'Remove a secret from history with git filter-repo', html: `<p>After rotating, rewrite history. Work in a fresh clone, because filter-repo rewrites everything and refuses to run on a repo with local changes. Either drop the whole file from every commit, or replace the secret text. filter-repo removes the <code>origin</code> remote on purpose, so you must re-add it and force-push deliberately.</p>`, code: `git clone --no-local server.git cleanup && cd cleanup   # fresh clone (use the real URL)
git filter-repo --invert-paths --path .env               # drop .env from every commit
printf 'changeme-LEAKED-EXAMPLE==>REMOVED\n' > ../replacements.txt
git filter-repo --replace-text ../replacements.txt       # or: replace the text everywhere
git log --all -S'LEAKED' --oneline                       # should print nothing
git remote add origin ../server.git
git push --force --all origin && git push --force --tags origin` }
    ],
    deepDive: `<p>🟣 <b>Ignore rules in detail.</b> Git reads, from lowest to highest priority: <code>core.excludesFile</code> (your global list), <code>.git/info/exclude</code> (this clone only, not shared), and <code>.gitignore</code> files (in the root and any subfolder, each relative to its folder). Within a file the last match wins, and a negation cannot re-include a file if a parent folder is excluded, because Git does not even look inside an ignored folder for speed (use <code>logs/*</code> plus <code>!logs/keep.log</code> instead of <code>logs/</code>). Trailing spaces are significant, and <code>git add -f</code> overrides ignores. <code>git status --ignored</code> lists ignored files; <code>git clean -ndX</code> previews deleting only ignored files.</p>
      <p><b>What filter-repo actually does.</b> It reads every commit through <code>git fast-export</code>, changes trees or blobs as you asked, and writes new commits with <code>fast-import</code>. Every commit from the first change onwards gets a new ID, so every branch, tag and open PR is affected, and anyone who merges an old clone back in reintroduces the secret. Plan it: announce a freeze, rewrite, force-push all refs, have everyone re-clone (not pull), and close or re-create open PRs. On GitHub, old commits can stay reachable through cached views and <code>refs/pull/*</code> until GitHub Support purges them; GitLab has a repository cleanup feature that takes the filter-repo commit map. BFG Repo-Cleaner is an older, faster tool with fewer options.</p>
      <p><b>Prevention layers.</b> Pre-commit hooks (gitleaks, detect-secrets, trufflehog) catch most leaks on the laptop but can be skipped with <code>--no-verify</code>, so add server-side checks: GitHub secret scanning with <b>push protection</b> and GitLab secret push protection reject pushes containing known token formats. Use short-lived credentials (OIDC from CI to the cloud, SSO sessions) so that even a leak expires quickly. Terraform state, kubeconfigs and Helm values files are frequent hidden leak sources; keep state in a remote backend, never in Git.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> assistants generate good <code>.gitignore</code> files for a stack in seconds, explain why a file is ignored, and help write the incident checklist for a leak. AI review bots and secret scanners increasingly flag hard-coded credentials in PRs automatically.</p>
      <p><b>New risks:</b> people paste config files, logs and <code>.env</code> contents into chat tools; that is a leak to a third party, so redact first and use approved tools. Coding agents may "helpfully" hard-code a key to make a test pass, or run <code>git add -A</code> and commit your local secrets. Defend in depth: ignore rules, pre-commit scanning, push protection, agents running with no access to real secrets, and short-lived credentials. And if an AI suggests "just delete the file and force-push" after a leak, remember the order: <b>rotate first</b>.</p>`,
    problems: [P({
      t: 'A secret was committed and pushed: rotate, then clean history', l: 'Hard', tags: ['secrets', 'filter-repo', 'force-push', 'incident'], co: ['Amazon', 'Paytm', 'Deloitte'],
      s: `<p>Three commits ago, someone committed <code>.env</code> containing <code>API_KEY=changeme-LEAKED-EXAMPLE</code> (in real life: a live payment-provider key) and pushed it to the shared server. Two more commits were pushed on top. Handle it properly: write down the rotation step, change the app to read the key from the environment, stop tracking and ignore <code>.env</code>, remove it from <b>all</b> history with <code>git filter-repo</code>, force-push the rewritten history, and verify that a fresh clone has no trace of the value.</p>`,
      c: LAB + ' Install git filter-repo first (<code>pip install git-filter-repo</code>, <code>brew install git-filter-repo</code> or your distro package). The secret is a fake placeholder; never practise with a real one.',
      ex: `<p>Before: <code>git log --all -S'LEAKED' --oneline</code> on the server shows ${H.c('r', 'a1b2c3d Add env config')}. After: ${H.c('g', 'no output')} in a fresh clone, every commit ID from that point on has changed, and the old key is ${H.c('g', 'revoked')} at the provider.</p>`,
      bw: `<p>Deleting <code>.env</code> in a new commit ("remove secret") and pushing. The key is still in the history of the server and in every clone, fork and CI cache, and it is still valid, so anyone who copied it can keep using it.</p>`,
      bc: `git rm .env && git commit -m "remove secret" && git push   # still in history, still valid`,
      q: ['What is the FIRST thing to do after a live secret is pushed?', ['Rotate it: issue a new key, deploy it, revoke the old one', 'Run git filter-repo', 'Make the repository private', 'Delete the file in a new commit'], 0, 'History rewriting cannot reach copies that already exist in clones, forks, caches or attackers\' hands. Only revoking the key makes all of those copies useless, so it comes first; cleanup follows.'],
      h: ['<p>Hint 1: rotation happens at the provider (console or CLI), not in Git. Do it before anything else and note the time for the incident report.</p>', '<p>Hint 2: work in a <b>fresh clone</b>: <code>git clone --no-local SERVER cleanup</code>, then <code>git filter-repo --invert-paths --path .env</code>.</p>', '<p>Hint 3: filter-repo removes <code>origin</code>; re-add it, <code>git push --force --all</code> and <code>--tags</code>, then verify with <code>git log --all -S\'LEAKED\'</code> in a brand-new clone. Everyone re-clones.</p>'],
      a: `<p>1) <b>Rotate</b>: create a new key at the provider, store it in the secret manager or CI secret store, deploy, revoke the old key, and check the provider's logs for use between the push and the revocation. 2) <b>Fix forward</b>: the app reads <code>process.env.API_KEY</code>; commit a <code>.env.example</code> with a placeholder, add <code>.env</code> to <code>.gitignore</code>, and <code>git rm --cached .env</code>. 3) <b>Rewrite history</b> in a fresh clone: <code>git filter-repo --invert-paths --path .env</code> removes the file from every commit; commits after the first appearance get new IDs. 4) Re-add the remote and force-push all branches and tags; on a real host, temporarily allow the force-push on the protected branch, then re-enable protection, and ask the host to purge cached refs. 5) <b>Verify</b> in a brand-new clone and tell everyone to re-clone, because merging an old clone would bring the commits back. 6) Add gitleaks pre-commit and push protection. Graph: the whole branch from the leaking commit onwards is replaced by new copies.</p>`,
      code: R`# --- Setup: a shared server with the leak three commits back ---
mkdir lab && cd lab
git init --bare -b main server.git
git clone server.git work && cd work
echo "console.log('app')" > app.js && git add app.js && git commit -m "Add app"
printf 'API_KEY=changeme-LEAKED-EXAMPLE\n' > .env && git add .env && git commit -m "Add env config"   # the (fake) leak
echo "// retry logic" >> app.js && git commit -am "Add retries"
echo "# docs" > README.md && git add README.md && git commit -m "Add README"
git push -u origin main
cd ..

# --- Step 1: ROTATE FIRST (at the provider, not in Git). Example for an AWS access key:
#   aws iam create-access-key --user-name app-bot          # new key -> secret manager -> deploy
#   aws iam update-access-key --user-name app-bot --access-key-id OLD_KEY_ID --status Inactive
#   aws iam delete-access-key --user-name app-bot --access-key-id OLD_KEY_ID
#   Then review CloudTrail for the old key ID between the push and now.

# --- Step 2: fix forward so the secret never comes back ---
cd work
cat > config.js <<'EOF'
const apiKey = process.env.API_KEY;   // injected from the secret store at deploy time
if (!apiKey) throw new Error('API_KEY is not set');
module.exports = { apiKey };
EOF
printf 'API_KEY=changeme\n' > .env.example
printf '.env\n' >> .gitignore
git rm --cached .env
git add config.js .env.example .gitignore
git commit -m "Read API_KEY from the environment and ignore .env"
git push
cd ..

# --- Step 3: rewrite ALL history in a fresh clone ---
git clone --no-local server.git cleanup && cd cleanup
git log --all --oneline -- .env                # commits that touched .env
git filter-repo --invert-paths --path .env     # drop .env from every commit
git log --all -S'LEAKED' --oneline            # nothing left anywhere in history

# --- Step 4: force-push the rewritten history (filter-repo removed origin on purpose) ---
git remote add origin ../server.git
git push --force --all origin
git push --force --tags origin
cd ..

# --- Step 5: verify from a brand-new clone; everyone else must re-clone, not pull ---
git clone server.git verify
git -C verify log --all --oneline -- .env      # empty: .env never existed
git -C verify log --all -S'LEAKED' --oneline   # empty: the value is gone from history
git -C verify log --oneline                    # same messages, new commit IDs
ls -a verify                                   # .env.example and config.js, no .env`,
      cx: `<p>Rotation: minutes, and it is what stops the damage. History rewrite: minutes for small repos, but every commit ID after the leak changes, so plan a short freeze and a team-wide re-clone.</p>`,
      f: ['Why must teammates re-clone instead of pulling after the rewrite?', 'What extra steps does a public GitHub repo with forks and open PRs need?']
    })]
  });

  // ───────────────────────── Topic 8: tags, releases and branching models ─────────────────────────
  topics.push({
    title: 'Tags, Releases and Branching Models: Trunk-Based vs Git Flow',
    analogy: `<p>A <b>tag</b> is the <b>edition number printed on a book</b>: "2nd edition" always means exactly that text, even after the author keeps writing. A <b>branching model</b> is how a restaurant kitchen runs. <b>Trunk-based</b> is a busy noodle bar: one counter, small dishes go out all day, and any cook can see what is on it. <b>Git flow</b> is a wedding caterer: separate prep areas for the next banquet, the current banquet and emergency fixes, with a careful hand-off between them. Both work, for different kinds of service.</p>`,
    explain: `<p>🟢 <b>Tags mark releases.</b> A tag is a label that, unlike a branch, <b>never moves</b>. Use <b>annotated</b> tags for releases (<code>git tag -a v1.4.0 -m "Release 1.4.0"</code>): they store who, when and a message, and can be signed. <b>Lightweight</b> tags (<code>git tag tmp-test</code>) are just a name and are fine for private bookmarks. Tags are <b>not pushed by default</b>: use <code>git push origin v1.4.0</code> or <code>git push --follow-tags</code>.</p>
      <p>🟢 <b>Semantic Versioning</b> (<code>MAJOR.MINOR.PATCH</code>): PATCH for bug fixes, MINOR for new backward-compatible features, MAJOR for breaking changes. A <b>release</b> on GitHub or GitLab is a tag plus a page with notes and downloadable assets (binaries, checksums, SBOMs). Pipelines often build and deploy when a tag matching <code>v*</code> is pushed.</p>
      <p>🔵 <b>Branching models.</b></p>
      ${H.table(['Model', 'How it works', 'Fits'], [
        ['<b>Trunk-based</b>', 'everyone merges small changes to <code>main</code> at least daily via short-lived branches (hours, not weeks); unfinished work hides behind <b>feature flags</b>; release from main with tags', 'teams deploying daily or continuously (web services, SaaS, most DevOps teams)'],
        ['<b>GitHub flow</b>', 'trunk-based with a PR for every branch; main is always deployable; deploy after merge', 'the default for most teams on GitHub/GitLab'],
        ['<b>Git flow</b>', 'long-lived <code>develop</code> and <code>main</code>, plus <code>feature/*</code>, <code>release/*</code> and <code>hotfix/*</code> branches with planned merges between them', 'scheduled releases of versioned software (on-prem products, SDKs) with several versions supported'],
        ['<b>Release branches</b> (GitLab flow style)', 'trunk-based main plus a <code>release/1.4</code> branch cut per version; fixes land on main first and are cherry-picked back', 'mobile apps, appliances, LTS versions']
      ])}
      <p>🔵 <b>Choosing for a team that deploys daily:</b> pick <b>trunk-based (GitHub flow)</b>. Long-lived branches cause big, scary merges, slow feedback and "it worked on develop" surprises. Research on delivery performance (the DORA reports) links trunk-based development with higher deploy frequency and lower change-failure rates. The enablers are small PRs, fast CI, branch protection, feature flags, and tags for every release so rollback is "redeploy the previous tag".</p>`,
    clues: [
      '"we deploy several times a day" → trunk-based / GitHub flow with feature flags',
      '"we ship a desktop app quarterly and support 3 versions" → release branches or Git flow',
      '"merge hell every release" / "develop and main drifted" → long-lived branches; move toward trunk-based',
      '"mark exactly what went to production" → annotated tag <code>vX.Y.Z</code>, release notes',
      '"pipeline should deploy when we tag" → CI trigger on tags matching <code>v*</code>',
      '"merge unfinished code without exposing it" → feature flag (toggle), not a long-lived branch'
    ],
    code: [R`# Lab 8a: tag a release and read history between releases
git switch main
git tag -a v1.0.0 -m "First stable release"
echo "feature: search" >> app.yaml && git commit -am "feat: add search"
echo "fix: timeout" >> app.yaml && git commit -am "fix: raise search timeout"
git tag -a v1.1.0 -m "Release 1.1.0: search"
git tag --list 'v*'                         # v1.0.0  v1.1.0
git show v1.1.0 --stat                      # tagger, date, message, then the commit
git log --oneline v1.0.0..v1.1.0            # what changed between releases = release notes
git describe --tags                         # e.g. v1.1.0 (or v1.1.0-2-g1a2b3c4 after more commits)
# With a remote: git push origin v1.1.0   or   git push --follow-tags`, { lang: 'bash', title: 'Lab 8b: a release branch and a hotfix with cherry-pick', code: R`git switch -c release/1.1 v1.1.0           # branch for patching 1.1.x
git switch main
echo "fix: null check" >> app.yaml && git commit -am "fix: null check in search"
FIX=$(git rev-parse HEAD)                   # fixes land on main first
git switch release/1.1
git cherry-pick -x "$FIX"                    # -x records "(cherry picked from commit ...)"
git tag -a v1.1.1 -m "Patch 1.1.1: null check"
git log --oneline --graph --all -n 8` }, { lang: 'bash', title: 'Optional: publish the release on GitHub or GitLab', code: R`gh release create v1.1.0 --generate-notes --title "v1.1.0"        # GitHub
glab release create v1.1.0 --notes "Search feature and timeout fix" # GitLab` }],
    codeTitle: ['Tags and release notes', 'Release branch + hotfix', 'Hosted releases'],
    viz: [{
      title: 'Semantic versioning: what each change does to the number',
      input: '1.4.2: fix, feat, fix, breaking, feat',
      inputLabel: 'start version: change, change, ... (fix, feat, breaking)',
      gen: function (input) {
        var m = String(input || '').match(/^\s*v?(\d+)\.(\d+)\.(\d+)\s*:\s*(.+)$/);
        if (!m) throw new Error('Use: 1.4.2: fix, feat, breaking');
        var v = [Number(m[1]), Number(m[2]), Number(m[3])], ch = m[4].split(',').map(function (s) { return s.trim().toLowerCase(); }).filter(Boolean);
        if (!ch.length || ch.length > 10) throw new Error('Give 1-10 changes');
        var f = [], hist = [['start', 'v' + v.join('.'), '-']];
        f.push({ narr: 'Current release <b>v' + v.join('.') + '</b>. MAJOR.MINOR.PATCH: the number tells users how risky an upgrade is. Each tag below would be <code>git tag -a vX.Y.Z</code> on the release commit.', parts: [{ type: 'array', label: 'MAJOR . MINOR . PATCH', values: v.slice(), idxLabels: ['MAJOR', 'MINOR', 'PATCH'] }, { type: 'table', label: 'tags so far', columns: ['change', 'tag', 'rule'], rows: hist.slice() }] });
        ch.forEach(function (c) {
          var idx, rule;
          if (c === 'fix') { v[2]++; idx = 2; rule = 'bug fix, nothing new → PATCH +1'; }
          else if (c === 'feat') { v[1]++; v[2] = 0; idx = 1; rule = 'new backward-compatible feature → MINOR +1, PATCH resets to 0'; }
          else if (c === 'breaking') { v[0]++; v[1] = 0; v[2] = 0; idx = 0; rule = 'breaking change (removed flag, changed API) → MAJOR +1, others reset'; }
          else throw new Error('Changes must be fix, feat or breaking (got "' + c + '")');
          hist.push([c, 'v' + v.join('.'), rule]);
          f.push({ narr: '<b>' + c + '</b>: ' + rule + '. New tag <b>v' + v.join('.') + '</b>. With Conventional Commits (<code>fix:</code>, <code>feat:</code>, <code>feat!:</code>) tools like release-please or semantic-release compute this bump automatically.', parts: [{ type: 'array', label: 'MAJOR . MINOR . PATCH', values: v.slice(), idxLabels: ['MAJOR', 'MINOR', 'PATCH'], hl: one(idx, c === 'breaking' ? 'bad' : 'ok') }, { type: 'table', label: 'tags so far', columns: ['change', 'tag', 'rule'], rows: hist.slice(), hl: one(hist.length - 1, 'cur') }] });
        });
        f.push({ narr: 'Final: <b>v' + v.join('.') + '</b>. Rules of thumb: never re-use or move a pushed tag (people and pipelines cached it), and before 1.0.0 anything may change. Container images are often tagged with both the version and the commit SHA.', parts: [{ type: 'table', label: 'release history', columns: ['change', 'tag', 'rule'], rows: hist.slice(), hl: one(hist.length - 1, 'sel') }] });
        return f;
      }
    }, {
      title: 'Trunk-based: short branches, merged and tagged every day',
      input: 'commit Add service; tag v1.0.0; switch -c add-search; commit feat: search behind flag; switch main; merge add-search; tag v1.1.0; switch -c fix-timeout; commit fix: timeout; switch main; merge fix-timeout; tag v1.1.1',
      inputLabel: 'git commands separated by ;',
      gen: function (input) { return gitSim(input, { def: this && this.input, outro: 'Every branch lived for hours and was merged by fast-forward, so main is one straight line of small, tested changes, each with a tag you can redeploy. Unfinished features ship dark behind flags instead of waiting on a long branch.' }); }
    }, {
      title: 'Git flow: develop, feature, release and main',
      input: 'commit Initial; tag v1.0.0; switch -c develop; switch -c feature/search; commit Add search; commit Search tests; switch develop; merge --no-ff feature/search; switch -c release/1.1; commit Bump version; switch main; merge --no-ff release/1.1; tag v1.1.0; switch develop; merge --no-ff release/1.1',
      inputLabel: 'git commands separated by ;',
      gen: function (input) { return gitSim(input, { def: this && this.input, outro: 'Git flow keeps four kinds of branch and several merges per release. That structure helps when you ship versioned releases on a schedule and patch old ones, but for a team deploying daily it adds waiting and merge work. Its author added a note in 2020 recommending simpler flows for continuously delivered software.' }); }
    }],
    examples: [
      { title: 'Release from main and deploy by tag', html: `<p>The pipeline deploys to production when a <code>v*</code> tag is pushed. You tag the commit that passed staging, push only that tag, and the release page gets generated notes. Rollback is "redeploy the previous tag", which is fast and boring, exactly as it should be.</p>`, code: `git switch main && git pull --ff-only
git log --oneline v1.6.0..HEAD           # what this release contains
git tag -a v1.7.0 -m "Release 1.7.0"
git push origin v1.7.0                    # triggers the deploy job for tags v*
# Rollback: redeploy v1.6.0 from the pipeline UI, or re-run its tag pipeline` },
      { title: 'Feature flags instead of a long-lived branch', html: `<p>The new checkout flow needs three weeks. Instead of a 3-week branch, the team merges small PRs daily with the new code switched off by a flag. Production runs the old path until the flag is turned on for 5% of users, then 100%. The flag is deleted afterwards, so it does not become permanent clutter.</p>`, code: { lang: 'yaml', title: 'flags.yaml (read by the app at startup)', code: `flags:
  newCheckout:
    enabled: false        # merged to main daily, but dark in production
    rolloutPercent: 0
    owner: payments-team
    removeBy: 2026-12-15` } },
      { title: 'Never move a pushed tag', html: `<p>You tagged <code>v2.3.0</code>, pushed it, then found a typo. Moving the tag (<code>git tag -f</code> + force-push) means some machines have the old v2.3.0 and some the new one, and caches (container registries, package mirrors, Go module proxy) may keep the first forever. Make <b>v2.3.1</b> instead. Hosts can protect tags so nobody can delete or move <code>v*</code>.</p>`, code: `git tag -a v2.3.1 -m "Fix typo in v2.3.0 config"   # new version, never re-tag
git push origin v2.3.1` },
      { title: 'Case: choosing a model for three different teams', html: `${H.table(['Team', 'Ships', 'Model'], [['Web API team', '10 deploys a day', 'trunk-based / GitHub flow, flags, tag each deploy'], ['Mobile app', 'store release every 2 weeks, support last 2 versions', 'trunk-based + release/x.y branches, cherry-pick fixes'], ['On-prem product', 'quarterly, customers on 4 versions', 'release branches (or Git flow) with hotfix branches per version']])}<p>The question is not "which model is best" but "how often do we release, and how many versions do we support?"</p>` }
    ],
    deepDive: `<p>🟣 <b>Tags under the hood.</b> A lightweight tag is a ref in <code>refs/tags/</code> pointing straight at a commit. An annotated tag is a real <b>tag object</b> (tagger, date, message, optional signature) that points at the commit; <code>git describe</code> and <code>--follow-tags</code> only consider annotated tags by default. Sign release tags (<code>git tag -s</code> with GPG or SSH keys) and verify with <code>git tag -v</code>. <code>git fetch</code> brings tags that point into fetched history; deleted remote tags linger locally until <code>git fetch --prune --prune-tags</code>.</p>
      <p><b>Release automation.</b> With Conventional Commits, tools like release-please or semantic-release read the commit messages since the last tag, pick the next version, write the CHANGELOG and create the tag and release. Build pipelines usually tag images with the version and the short SHA (<code>web:1.7.0</code>, <code>web:sha-1a2b3c4</code>) so you can always trace a running container back to the exact commit.</p>
      <p><b>Trunk-based in practice.</b> It needs fast CI (under about 10 minutes), required checks on main, a merge queue when many PRs land, feature flags with owners and removal dates, and the habit of splitting work into small vertical slices. Git flow, published by Vincent Driessen in 2010, was designed for explicitly versioned software; in 2020 he added a note saying teams doing continuous delivery should adopt a simpler workflow such as GitHub flow. A sign your model is too heavy: PRs wait days, "merge develop into main" is a meeting, or hotfixes have to be applied in three places by hand.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> release notes are a natural job for AI: give it <code>git log v1.6.0..v1.7.0</code> and the merged PR titles and it writes a readable summary for customers. Bots also propose version bumps and open "release PRs". With coding agents opening many small PRs, trunk-based habits (small changes, fast CI, flags) become even more important, because big long-lived branches multiply conflicts between agents and humans.</p>
      <p><b>Keep humans on the decisions:</b> whether a change is breaking (MAJOR) is a contract question for your users, which AI can get wrong from the diff alone. Review generated notes for accuracy and for leaking internal details (ticket links, customer names). And keep tag protection on: an automated tool should create release tags through the pipeline, not move or delete them.</p>`,
    problems: [P({
      t: 'Choose and set up a branching model for a team that deploys daily', l: 'Medium', tags: ['trunk-based', 'feature flags', 'tags', 'branch protection'], co: ['Spotify', 'Razorpay', 'Thoughtworks'],
      s: `<p>A six-person platform team deploys its API to production every day, but today they use Git flow: features live on branches for two weeks, <code>develop</code> drifts from <code>main</code>, and every Friday's release merge has conflicts. Recommend a model and show, in a local repo, the daily routine you want: a short-lived branch, a feature-flagged change merged the same day, a fast-forward to main and a release tag. List the server-side settings the team should enable.</p>`,
      ex: `<p>Recommendation: ${H.c('g', 'trunk-based (GitHub flow)')}. Graph after a day: ${H.c('b', 'main: C1(v1.4.0) - C2 (flagged feature) - C3 (fix) [v1.4.1]')}: one straight line, branches deleted within hours.</p>`,
      bw: `<p>Keeping Git flow and adding a "merge freeze" day, or switching to "everyone commits straight to main with no review". The first keeps long branches and big merges; the second removes review and CI gates.</p>`,
      q: ['What lets a team merge an unfinished feature to main every day without users seeing it?', ['A feature flag that keeps the new path off in production', 'A long-lived feature branch', 'Tagging it as a pre-release', 'Putting it on develop'], 0, 'A flag separates deploying code from releasing a feature. The code is merged and deployed in small pieces but switched off until it is ready, then rolled out gradually and the flag removed.'],
      h: ['<p>Hint 1: ask two questions: how often do we deploy (daily) and how many versions do we support (one, the live one)? That points to trunk-based.</p>', '<p>Hint 2: daily routine = branch from fresh main, small change, flag if unfinished, PR with CI, merge (fast-forward or squash), delete branch, tag the release.</p>', '<p>Hint 3: server side: protect main (PR required, checks required, no force-push), auto-delete merged branches, merge queue if busy, tag protection for <code>v*</code>, deploy on tag.</p>'],
      a: `<p><b>Recommend trunk-based development with short-lived PR branches (GitHub flow).</b> The team ships one live version daily, so there is no need for <code>develop</code> or release branches; they only add waiting and merge conflicts. Rules: branches live less than a day or two, PRs are small, unfinished work is merged behind feature flags, main is always deployable, every production deploy is an annotated tag so rollback is redeploying the previous tag. Migration: merge <code>develop</code> into main once, make main the default branch, delete develop, and retire open long branches by splitting them into flagged slices. Server settings: protect main (PR + 1 approval + required CI, no force-push, linear history if wanted), auto-delete head branches, a merge queue if many PRs land, protected <code>v*</code> tags, and a pipeline that deploys on tags. Graph: a single straight main with frequent tags.</p>`,
      code: R`# Local demo of the daily trunk-based routine
mkdir lab && cd lab && git init -b main
printf 'flags:\n  newSearch: false\n' > flags.yaml
echo "api: v1" > app.yaml
git add . && git commit -m "Initial API config"
git tag -a v1.4.0 -m "Release 1.4.0"

# Morning: a short-lived branch from fresh main (in a team: git pull --ff-only first)
git switch -c search-v2
echo "search: v2   # only used when flags.newSearch is true" >> app.yaml
git commit -am "feat: add search v2 behind newSearch flag"
# (push + PR + CI + review would happen here: git push -u origin search-v2)

# Same day: merge to main as a fast-forward and delete the branch
git switch main
git merge --ff-only search-v2
git branch -d search-v2

# Afternoon: a small fix, same routine
git switch -c fix-timeout
echo "timeoutSeconds: 10" >> app.yaml
git commit -am "fix: raise API timeout to 10s"
git switch main && git merge --ff-only fix-timeout && git branch -d fix-timeout

# Release what passed staging: tag it (the pipeline deploys tags v*)
git tag -a v1.4.1 -m "Release 1.4.1: search v2 (dark), timeout fix"
git log --oneline --graph --decorate
git log --oneline v1.4.0..v1.4.1          # release notes

# Later: turn the feature on with a one-line, reviewable change
sed -i 's/newSearch: false/newSearch: true/' flags.yaml
git commit -am "feat: enable search v2 for all users"`,
      cx: `<p>The routine is a few commands per change; the real cost is cultural (small PRs, fast CI, flag hygiene). Expect fewer merge conflicts and same-day feedback instead of a Friday merge marathon.</p>`,
      f: ['What would make you keep a release branch even with trunk-based development?', 'How do you stop feature flags from piling up forever?']
    })]
  });

  // ───────────────────────── Practice: Easy ─────────────────────────
  practice.push(P({
    t: 'Commits show the wrong author email', l: 'Easy', tags: ['config', 'identity', 'amend'], co: ['Infosys', 'HCL'],
    s: `<p>Your first two commits on a new work laptop show <code>Author: root &lt;root@localhost&gt;</code>, and the company's GitHub rejects pushes from unverified emails. Nothing is pushed yet. Set your identity correctly for this repo (work email) and globally (personal email), and fix the author on the last commit.</p>`,
    ex: `<p>Before: <code>git log -1 --format='%an &lt;%ae&gt;'</code> → ${H.c('r', 'root &lt;root@localhost&gt;')}. After: ${H.c('g', 'Asha Rao &lt;asha.rao@example.com&gt;')}; <code>git config --show-origin user.email</code> shows the repo-level value wins.</p>`,
    bw: `<p>Editing <code>/etc/gitconfig</code> as root or creating a brand-new repo and copying files over. The first changes everyone on the machine; the second throws away history.</p>`,
    q: ['Which config level wins if user.email is set in both ~/.gitconfig and the repo\'s .git/config?', ['The repository (local) level', 'The global level', 'The system level', 'Whichever was set first'], 0, 'Git reads system, then global, then local config; later levels override earlier ones. <code>git config --show-origin</code> shows where each value comes from.'],
    h: ['<p>Hint 1: <code>git config user.email</code> without <code>--global</code> writes to <code>.git/config</code> for this repo only.</p>', '<p>Hint 2: an already-made commit keeps its author; <code>git commit --amend --reset-author --no-edit</code> rewrites the last one with the new identity.</p>', '<p>Hint 3: for older unpushed commits, <code>git rebase -r --exec "git commit --amend --no-edit --reset-author" ROOT_OR_BASE</code>. Never do this on pushed, shared commits.</p>'],
    a: `<p>Identity is just config: <code>user.name</code> and <code>user.email</code>, read from system, global and local levels with local winning. Set the personal default with <code>--global</code> and the work email in this repo. The existing commit still carries the old author, so amend it with <code>--reset-author</code>, which creates a new commit (new ID) with your current identity; that is safe because it was never pushed. For many commits, rebase with <code>--exec</code>. Optional: <code>includeIf "gitdir:~/work/"</code> in the global config applies the work email to every repo under a folder automatically.</p>`,
    code: R`# Setup: a commit made with a bad identity
mkdir lab && cd lab && git init -b main
git -c user.name=root -c user.email=root@localhost commit --allow-empty -m "Initial commit"

# 1. Global default (personal) and repo-local override (work)
git config --global user.name "Asha Rao"
git config --global user.email "asha@personal.example"
git config user.email "asha.rao@example.com"          # this repo only
git config --show-origin --get-all user.email           # see which file each value comes from

# 2. Fix the author of the last, unpushed commit
git commit --amend --reset-author --no-edit
git log -1 --format='%an <%ae>'                         # Asha Rao <asha.rao@example.com>

# 3. Optional: use the work email automatically for every repo under ~/work/
cat >> ~/.gitconfig <<'EOF'
[includeIf "gitdir:~/work/"]
    path = ~/.gitconfig-work
EOF
printf '[user]\n    email = asha.rao@example.com\n' > ~/.gitconfig-work`,
    cx: `<p>A minute. Graph: the last commit is replaced by a copy with a new ID (fine because it is unpushed).</p>`,
    f: ['Why does GitHub show some commits as "Unverified", and how do signed commits help?', 'What happens if you amend a commit that a teammate already pulled?']
  }));

  practice.push(P({
    t: 'node_modules and logs were committed by mistake', l: 'Easy', tags: ['gitignore', 'rm --cached'], co: ['Wipro', 'Mindtree'],
    s: `<p>A new teammate ran <code>git add .</code> and pushed <code>node_modules/</code> (40,000 files) and <code>server.log</code>. The repo is now slow to clone and every log write shows up in <code>git status</code>. Stop tracking them without deleting anyone's local copy, and make sure it cannot happen again.</p>`,
    ex: `<p>Before: <code>git ls-files | wc -l</code> → ${H.c('r', '40213')}. After: ${H.c('g', '57')}; <code>git status</code> is clean while the app keeps writing <code>server.log</code>; <code>git check-ignore -v server.log</code> → <code>.gitignore:2:*.log</code>.</p>`,
    bw: `<p><code>rm -rf node_modules server.log</code> and commit. It breaks the running app locally, and the next <code>npm install</code> or log write brings them straight back into <code>git status</code> because nothing ignores them.</p>`,
    q: ['Which command stops tracking a folder but keeps the files on disk?', ['<code>git rm -r --cached node_modules</code>', '<code>git rm -r node_modules</code>', '<code>git restore node_modules</code>', '<code>git clean -fd node_modules</code>'], 0, '--cached removes the paths from the index (the next commit) only. Without it, git rm also deletes the files from the working tree; clean deletes untracked files.'],
    h: ['<p>Hint 1: ignore rules do not apply to files that are already tracked.</p>', '<p>Hint 2: first add the patterns to <code>.gitignore</code>, then <code>git rm -r --cached</code> the paths.</p>', '<p>Hint 3: commit both together and verify with <code>git ls-files</code> and <code>git check-ignore -v</code>. The old blobs remain in history; that is fine for junk (not for secrets).</p>'],
    a: `<p>Add <code>node_modules/</code> and <code>*.log</code> to <code>.gitignore</code>, remove the paths from the index with <code>git rm -r --cached</code> (files stay on disk), and commit. From now on Git ignores them. Teammates pulling this commit will see Git delete those paths from their working tree because they are removed from tracking, so they run <code>npm install</code> again; mention it in the PR. History still contains the old files, so clone size only shrinks if you rewrite history, which is rarely worth it for junk. Add a pre-commit check for large files to prevent a repeat.</p>`,
    code: R`# Setup: junk committed by mistake
mkdir lab && cd lab && git init -b main
mkdir -p node_modules/left-pad && echo "module.exports = 1" > node_modules/left-pad/index.js
echo '{"name": "api"}' > package.json && echo "started" > server.log
git add . && git commit -m "Initial commit"
git ls-files                                   # node_modules and server.log are tracked

# 1. Ignore them from now on
printf 'node_modules/\n*.log\n' >> .gitignore

# 2. Stop tracking, keep the files on disk
git rm -r --cached node_modules server.log
git add .gitignore
git commit -m "Stop tracking node_modules and logs"

# 3. Verify
git ls-files                                   # .gitignore and package.json only
echo "more log" >> server.log && git status --short   # clean: the log is ignored
git check-ignore -v server.log node_modules/left-pad/index.js
ls node_modules server.log                     # still on disk`,
    cx: `<p>Three commands. Graph: one commit that deletes paths from tracking. Clone size stays the same unless history is rewritten.</p>`,
    f: ['When would it be worth rewriting history to remove big files?', 'How would you block files over 500 KB from being committed in future?']
  }));

  practice.push(P({
    t: 'Push rejected: "Updates were rejected because the tip of your current branch is behind"', l: 'Easy', tags: ['pull --rebase', 'push', 'non-fast-forward'], co: ['TCS', 'Cognizant'],
    s: `<p>You committed a small change to <code>main</code> locally and ran <code>git push</code>. It fails with <code>! [rejected] main -&gt; main (non-fast-forward)</code>. A teammate pushed two commits in the meantime. Get your commit onto the server without a merge commit and without overwriting the teammate's work.</p>`,
    c: LAB + ' Use a local bare repo as the server.',
    ex: `<p>Server before: ${H.c('y', 'C1 - T1 - T2')}; yours: ${H.c('b', 'C1 - Y1')}. After <code>git pull --rebase</code> and <code>git push</code>: ${H.c('g', "C1 - T1 - T2 - Y1'")} on both.</p>`,
    bw: `<p><code>git push --force</code>. It "works" by deleting T1 and T2 from the server.</p>`,
    bc: `git push --force    # deletes the teammate's two commits from the server`,
    q: ['What does <code>git pull --rebase</code> do here?', ['Fetches T1 and T2, then replays your Y1 on top of them', 'Merges with a merge commit', 'Deletes your commit', 'Pushes first, then pulls'], 0, 'With --rebase, pull is fetch + rebase onto the upstream, so your local commit gets a new parent (T2) and the history stays linear.'],
    h: ['<p>Hint 1: "rejected (non-fast-forward / fetch first)" means the server has commits you do not.</p>', '<p>Hint 2: integrate them first: <code>git pull --rebase</code> (or <code>git fetch</code> + <code>git rebase origin/main</code>).</p>', '<p>Hint 3: resolve conflicts if any, then a plain <code>git push</code>. Set <code>git config --global pull.rebase true</code> to make this the default.</p>'],
    a: `<p>The server's main is not an ancestor of your main, so a push would drop T1 and T2; Git refuses. <code>git pull --rebase</code> fetches them and replays your commit on top as Y1'. Now your main contains everything the server has plus one commit, so <code>git push</code> is a fast-forward and succeeds. If the replay conflicts, resolve, <code>git add</code>, <code>git rebase --continue</code>. Rebasing is safe here because Y1 was never shared.</p>`,
    code: R`# Setup: server + two clones, the teammate pushes first
mkdir lab && cd lab
git init --bare -b main server.git
git clone server.git me && git clone server.git mate
cd me && echo "v1" > app.txt && git add app.txt && git commit -m "C1" && git push -u origin main
cd ../mate && git pull origin main
echo "t1" > t1.txt && git add t1.txt && git commit -m "T1"
echo "t2" > t2.txt && git add t2.txt && git commit -m "T2" && git push -u origin main
cd ../me && echo "y1" > y1.txt && git add y1.txt && git commit -m "Y1"
git push || echo "rejected: the server has T1 and T2"

# Fix: integrate first, then push normally
git pull --rebase                      # fetch T1, T2 and replay Y1 on top
git log --oneline --graph -n 4         # Y1' on top of T2, a straight line
git push
git config --global pull.rebase true   # make this the default for future pulls`,
    cx: `<p>Two commands. Graph: your commit gets a new ID (new parent T2); the server just moves forward.</p>`,
    f: ['When would you prefer <code>git pull</code> with a merge instead?', 'What does <code>pull.ff only</code> do differently from <code>pull.rebase true</code>?']
  }));

  practice.push(P({
    t: 'Committed to main instead of a feature branch (not pushed)', l: 'Easy', tags: ['branch', 'reset', 'switch'], co: ['Accenture', 'Freshworks'],
    s: `<p>You made three commits for ticket OPS-91 directly on your local <code>main</code>. The team requires a PR for every change and main is protected, so your push will be refused. Move the three commits onto a new branch <code>OPS-91-alerts</code> and put your local <code>main</code> back to where <code>origin/main</code> is.</p>`,
    c: LAB + ' Use a local bare repo as the server.',
    ex: `<p>Before: ${H.c('r', 'main: C1 - A1 - A2 - A3')}, origin/main at ${H.c('b', 'C1')}. After: ${H.c('g', 'OPS-91-alerts: C1 - A1 - A2 - A3')}, ${H.c('g', 'main = origin/main = C1')}.</p>`,
    bw: `<p>Copying the changed files somewhere, resetting main, re-creating them on a new branch and committing again. It loses the three separate commits and their messages, and it is easy to forget a file.</p>`,
    q: ['After <code>git branch OPS-91-alerts</code>, why is <code>git reset --hard origin/main</code> on main safe?', ['The new branch label already points at the three commits, so nothing becomes unreachable', 'reset --hard never deletes anything', 'Because main is protected', 'Because origin/main has the commits'], 0, 'The branch keeps the commits reachable. reset only moves main\'s label back; the commits stay on OPS-91-alerts. (Uncommitted edits would be lost, so check git status first.)'],
    h: ['<p>Hint 1: a branch is only a label. Put a new label on the current commit first.</p>', '<p>Hint 2: then move <code>main</code> back to <code>origin/main</code> with <code>git reset --hard</code> (check <code>git status</code> is clean first).</p>', '<p>Hint 3: switch to the new branch and push it with <code>-u</code> to open the PR.</p>'],
    a: `<p>Create <code>OPS-91-alerts</code> at the current commit: it now holds A1-A3. On main, <code>git reset --hard origin/main</code> moves the label back to C1; nothing is lost because the new branch still reaches A1-A3. Switch to the branch and push it for a PR. Graph: no commits are created or rewritten; two labels simply point at different places. If origin/main had moved meanwhile, rebase the branch on it before opening the PR.</p>`,
    code: R`# Setup: three commits accidentally made on main
mkdir lab && cd lab
git init --bare -b main server.git && git clone server.git work && cd work
echo "base" > README.md && git add README.md && git commit -m "C1" && git push -u origin main
for n in 1 2 3; do echo "rule $n" >> alerts.yaml; git add alerts.yaml; git commit -m "OPS-91: alert rule $n"; done
git status -sb                           # "## main...origin/main [ahead 3]"

# 1. Label the work where it is
git branch OPS-91-alerts

# 2. Put main back where the server is (working tree is clean, so nothing is lost)
git reset --hard origin/main

# 3. Continue on the feature branch and open the PR
git switch OPS-91-alerts
git push -u origin OPS-91-alerts
git log --oneline --graph --all -n 5`,
    cx: `<p>Three commands, no commits rewritten. Takes seconds.</p>`,
    f: ['What if you had already pushed main (and it was not protected)?', 'How would you move only the last of the three commits?']
  }));

  // ───────────────────────── Practice: Medium ─────────────────────────
  practice.push(P({
    t: 'Squash six WIP commits into one before review', l: 'Medium', tags: ['interactive rebase', 'fixup', 'force-with-lease'], co: ['Atlassian', 'Postman'],
    s: `<p>Your PR branch <code>feature/rate-limit</code> has 6 commits: "add limiter", "wip", "fix", "fix again", "typo", "address review". The team wants one meaningful commit per PR (they rebase-merge). Squash them into one commit with a good message, keep the final content identical, and update the already-pushed PR branch safely.</p>`,
    c: LAB + ' Use a local bare repo as the server.',
    ex: `<p>Before: <code>git log --oneline main..HEAD</code> → ${H.c('r', '6 commits')}. After: ${H.c('g', '1 commit: "Add per-client rate limiting to the API gateway"')}; <code>git diff ORIG_HEAD HEAD</code> is empty (same content).</p>`,
    bw: `<p>Creating a new branch and copying the final files over by hand. It works, but it is slow, error-prone, and loses authorship and the PR's history; or squashing on <code>main</code> after merging, which rewrites shared history.</p>`,
    q: ['Which approach squashes all branch commits into one without an editor?', ['<code>git reset --soft $(git merge-base main HEAD)</code> then one <code>git commit</code>', '<code>git reset --hard main</code>', '<code>git merge --squash main</code>', '<code>git revert HEAD~6..HEAD</code>'], 0, 'A soft reset to the merge base moves the branch label back but leaves all changes staged, so a single commit captures exactly the same final content. Interactive rebase with fixup does the same with more control.'],
    h: ['<p>Hint 1: find where the branch started: <code>git merge-base main HEAD</code>.</p>', '<p>Hint 2: either <code>git rebase -i</code> and change <code>pick</code> to <code>fixup</code> on lines 2-6, or <code>git reset --soft</code> to the merge base and commit once.</p>', '<p>Hint 3: verify the content is unchanged with <code>git diff ORIG_HEAD HEAD</code> (empty), then <code>git push --force-with-lease</code>.</p>'],
    a: `<p>Two equivalent ways. (a) <code>git rebase -i $(git merge-base main HEAD)</code>, keep the first <code>pick</code>, change the rest to <code>fixup</code>, reword the message. (b) <code>git reset --soft</code> to the merge base: the branch label jumps back, all changes stay staged, and one <code>git commit</code> records them with a proper message. The final tree is identical, which <code>git diff ORIG_HEAD HEAD</code> proves. Because the PR branch was pushed, the server's copy has the 6 old commits; <code>--force-with-lease</code> replaces it only if nobody else pushed to your branch meanwhile. Graph: 6 commits become 1 new commit on the same base.</p>`,
    code: R`# Setup: a pushed PR branch with six noisy commits
mkdir lab && cd lab
git init --bare -b main server.git && git clone server.git work && cd work
echo "gateway: on" > gateway.yaml && git add gateway.yaml && git commit -m "Initial gateway" && git push -u origin main
git switch -c feature/rate-limit
for msg in "add limiter" "wip" "fix" "fix again" "typo" "address review"; do
  echo "# $msg" >> gateway.yaml && git commit -qam "$msg"
done
git push -u origin feature/rate-limit
git log --oneline main..HEAD                     # 6 commits

# Option B (no editor): soft reset to the branch start, commit once
BASE=$(git merge-base main HEAD)
git reset --soft "$BASE"                         # label moves back, all changes stay staged
git commit -m "Add per-client rate limiting to the API gateway" -m "Limits each API key to 100 req/s with a burst of 20; returns 429 with Retry-After."
git diff ORIG_HEAD HEAD --stat                   # empty: same final content
git log --oneline main..HEAD                     # 1 commit

# Update the PR branch safely
git push --force-with-lease

# Option A, for reference: git rebase -i "$BASE"  (pick the first line, fixup the other five)`,
    cx: `<p>A few commands. Graph: six commits replaced by one new commit on the same base; only your PR branch is rewritten.</p>`,
    f: ['Why is ORIG_HEAD useful right after a reset or rebase?', 'When should you NOT squash a branch?']
  }));

  practice.push(P({
    t: 'Roll back a merged PR that broke staging', l: 'Medium', tags: ['revert', 'merge commit', '-m 1'], co: ['Amazon', 'PhonePe'],
    s: `<p>PR "Add new Redis cache config" was merged into <code>main</code> with a merge commit, and staging immediately started failing health checks. Two other PRs merged after it are fine. Undo exactly that PR on main with a normal (non-force) push, and verify the other two PRs' changes are still there.</p>`,
    ex: `<p>Graph: ${H.c('y', 'main: C1 - M1 (redis PR) - M2 - M3')}. After <code>git revert -m 1 M1</code>: ${H.c('g', 'C1 - M1 - M2 - M3 - Revert M1')}; <code>cache.yaml</code> is back to the old version; files from M2 and M3 are unchanged.</p>`,
    bw: `<p><code>git revert M1</code> without <code>-m</code>: Git refuses ("is a merge but no -m option was given"). Or resetting main to before M1 and force-pushing, which also removes M2 and M3 and breaks every clone.</p>`,
    q: ['In <code>git revert -m 1 MERGE</code>, what does the 1 mean?', ['Parent 1 (the main line before the merge) is kept; the changes from parent 2 are undone', 'Revert only the first file', 'Revert the first commit of the PR', 'Revert once'], 0, 'A merge has two parents. -m 1 says "main was the mainline", so the revert removes everything the merged branch (parent 2) introduced.'],
    h: ['<p>Hint 1: list merges on main: <code>git log --oneline --merges --first-parent main</code>.</p>', '<p>Hint 2: <code>git revert -m 1 SHA</code> for a merge commit.</p>', '<p>Hint 3: check with <code>git diff SHA^1 HEAD -- cache.yaml</code> (should be empty) and that M2/M3 files exist; push normally.</p>'],
    a: `<p>Find the merge commit (first-parent log of main shows one line per merged PR). <code>git revert -m 1</code> creates a new commit whose diff is the inverse of what the PR brought in, relative to main's previous state. Later PRs are untouched unless they edited the same lines (then resolve a conflict). Push normally. Important follow-up: when the fixed Redis PR is ready, you must first revert this revert (or the old PR commits are considered "already merged"), then merge the fix.</p>`,
    code: R`# Setup: three PRs merged into main with merge commits
mkdir lab && cd lab && git init -b main
echo "cache: memory" > cache.yaml && git add cache.yaml && git commit -m "C1: initial"
git switch -c pr/redis && echo "cache: redis://redis:6379" > cache.yaml && git commit -am "Add new Redis cache config"
git switch main && git merge --no-ff -m "Merge PR #41: Redis cache" pr/redis
git switch -c pr/docs && echo "docs" > DOCS.md && git add DOCS.md && git commit -m "Add docs"
git switch main && git merge --no-ff -m "Merge PR #42: docs" pr/docs
git switch -c pr/limits && echo "cpu: 500m" > limits.yaml && git add limits.yaml && git commit -m "Add limits"
git switch main && git merge --no-ff -m "Merge PR #43: limits" pr/limits

# 1. Find the merge that brought the Redis change
git log --oneline --merges --first-parent main
MERGE=$(git log --format=%h --merges --first-parent --grep='PR #41' main)

# 2. Revert the whole PR relative to main (parent 1)
git revert -m 1 --no-edit "$MERGE"

# 3. Verify: cache.yaml is as before the PR, other PRs intact
cat cache.yaml                             # cache: memory
ls DOCS.md limits.yaml
git diff "$MERGE^1" HEAD -- cache.yaml     # empty
git log --oneline --first-parent -n 5
# With a server: git push   (a normal push, no force)`,
    cx: `<p>Two commands plus checks. Graph: one new commit on main. Rollback is as fast as your pipeline.</p>`,
    f: ['How do you re-land the fixed Redis change later?', 'How would you do this via the GitHub or GitLab UI?']
  }));

  practice.push(P({
    t: 'Backport a security fix to release/2.3 and tag v2.3.4', l: 'Medium', tags: ['cherry-pick', 'release branch', 'tags'], co: ['Red Hat', 'SAP'],
    s: `<p>Customers still run version 2.3, maintained on <code>release/2.3</code> (last tag <code>v2.3.3</code>). A TLS-config fix just landed on <code>main</code> as one commit. Bring only that fix to the release branch, record where it came from, tag <code>v2.3.4</code>, and show the release notes since v2.3.3.</p>`,
    ex: `<p>Graph: ${H.c('b', "release/2.3: ... v2.3.3 - Fix'(v2.3.4)")}; the commit message ends with ${H.c('g', '(cherry picked from commit 9f1c2ab)')}. <code>git log v2.3.3..v2.3.4 --oneline</code> shows exactly one line.</p>`,
    bw: `<p><code>git merge main</code> into the release branch. It drags every new feature from main into a patch release, which breaks the "patch = fixes only" promise.</p>`,
    bc: `git switch release/2.3 && git merge main     # ships all of main's features in a patch`,
    q: ['Why use <code>cherry-pick -x</code>?', ['It appends "(cherry picked from commit SHA)" so you can trace the backport', 'It skips conflicts', 'It signs the commit', 'It pushes automatically'], 0, 'The copy gets a new ID, so -x records the original commit in the message. Auditors and future you can see that v2.3.4 contains main\'s fix.'],
    h: ['<p>Hint 1: fixes go to main first, then are copied back. Find the SHA with <code>git log --oneline --grep</code>.</p>', '<p>Hint 2: on <code>release/2.3</code>, <code>git cherry-pick -x SHA</code>.</p>', '<p>Hint 3: annotated tag <code>v2.3.4</code>, then <code>git log v2.3.3..v2.3.4</code> for notes; push the branch and the tag.</p>'],
    a: `<p>A release branch receives only selected fixes. <code>git cherry-pick -x</code> applies the fix commit's diff onto the release branch as a new commit and records the source SHA. Resolve conflicts if the old code differs. Run tests, then create an annotated tag <code>v2.3.4</code> and list commits since <code>v2.3.3</code> for the notes. With a server, push the branch and the tag (<code>git push origin release/2.3 v2.3.4</code>), which triggers the release pipeline.</p>`,
    code: R`# Setup: a release branch at v2.3.3 and a main that moved on
mkdir lab && cd lab && git init -b main
printf 'tls: "1.0"\n' > tls.yaml && git add tls.yaml && git commit -m "Add TLS config"
git tag -a v2.3.3 -m "Release 2.3.3"
git branch release/2.3 v2.3.3
echo "feature: dashboards" > features.yaml && git add features.yaml && git commit -m "feat: dashboards (3.0 only)"
printf 'tls: "1.2"\n' > tls.yaml && git commit -am "fix: require TLS 1.2 minimum"

# 1. Find the fix on main
FIX=$(git log --format=%h -n 1 --grep='require TLS 1.2' main)
git show --stat "$FIX"

# 2. Copy it onto the release branch, recording the source
git switch release/2.3
git cherry-pick -x "$FIX"
cat tls.yaml                     # tls: "1.2"
ls features.yaml 2>/dev/null || echo "dashboards feature correctly NOT backported"

# 3. Tag the patch release and produce notes
git tag -a v2.3.4 -m "Release 2.3.4: require TLS 1.2"
git log --oneline v2.3.3..v2.3.4
# With a server: git push origin release/2.3 v2.3.4`,
    cx: `<p>A few commands. Graph: one new commit on the release branch plus a tag; main is untouched.</p>`,
    f: ['Why should the fix land on main first rather than on the release branch?', 'What if the cherry-pick conflicts because 2.3 code is older?']
  }));

  practice.push(P({
    t: 'Find the commit that broke the config with git bisect', l: 'Medium', tags: ['bisect', 'history', 'automation'], co: ['Google', 'Juspay'],
    s: `<p>Deploys of <code>main</code> fail validation: <code>app.yaml</code> no longer parses. Tag <code>v1.0.0</code> (40 commits ago) was fine. Nobody knows which commit broke it. Use <code>git bisect</code> with an automatic check to find the first bad commit in a handful of steps.</p>`,
    ex: `<p>With 40 commits between good and bad, bisect needs about ${H.c('b', 'log₂ 40 ≈ 6')} tests. Output: ${H.c('r', 'a1b2c3d is the first bad commit · "Add sidecar config"')}.</p>`,
    bw: `<p>Checking out commits one by one from newest to oldest and testing each by hand: up to 40 checkouts and a lot of guessing.</p>`,
    q: ['How many tests does bisect need for 1,000 commits?', ['About 10', 'About 100', '1,000', '500'], 0, 'Each test halves the range of suspects, so it takes about log₂(1000) ≈ 10 tests. That is why bisect scales to huge histories.'],
    h: ['<p>Hint 1: <code>git bisect start BAD GOOD</code> with <code>HEAD</code> and <code>v1.0.0</code>.</p>', '<p>Hint 2: write a tiny check that exits 0 when good and non-zero when bad, then <code>git bisect run ./check.sh</code>.</p>', '<p>Hint 3: keep the check script outside the tracked files (or untracked), and finish with <code>git bisect reset</code> to return to your branch.</p>'],
    a: `<p>Bisect is binary search over history. You mark one good and one bad commit; Git checks out the midpoint and you (or a script) say good or bad, halving the suspects each time. <code>git bisect run CMD</code> automates it: exit code 0 = good, 1-127 (except 125) = bad, 125 = skip (cannot test). Here the check parses <code>app.yaml</code>. Git prints the first bad commit; <code>git show</code> it, then fix forward with a revert or a new commit. <code>git bisect reset</code> returns you to where you started.</p>`,
    code: R`# Setup: 12 good commits, one that breaks YAML, then more commits on top
mkdir lab && cd lab && git init -b main
printf 'service: web\n' > app.yaml && git add app.yaml && git commit -m "Initial config"
git tag v1.0.0
for n in $(seq 1 12); do echo "# note $n" >> app.yaml; git commit -qam "Add note $n"; done
printf 'sidecar: [unclosed\n' >> app.yaml && git commit -qam "Add sidecar config"   # the culprit
for n in $(seq 13 20); do echo "# note $n" >> app.yaml; git commit -qam "Add note $n"; done

# A check that exits 0 if app.yaml parses, 1 if not (kept untracked, outside the repo)
cat > ../check.sh <<'EOF'
#!/usr/bin/env bash
python3 -c 'import sys, yaml; yaml.safe_load(open("app.yaml"))' 2>/dev/null
EOF
chmod +x ../check.sh

# Binary search: bad = HEAD, good = v1.0.0
git bisect start HEAD v1.0.0
git bisect run ../check.sh              # prints "<sha> is the first bad commit"
git bisect log | tail -n 3
git bisect reset                        # back to main`,
    cx: `<p>O(log₂ N) test runs: about 5 here, about 17 for 100,000 commits. The check must be reliable; a flaky test misleads bisect.</p>`,
    f: ['What do you do with commits that do not build at all during bisect?', 'How could CI prevent this kind of breakage from reaching main?']
  }));

  practice.push(P({
    t: 'Work done in "detached HEAD" is about to be lost', l: 'Medium', tags: ['detached HEAD', 'branch', 'reflog'], co: ['Oracle', 'Zoho'],
    s: `<p>To debug an old release you ran <code>git checkout v1.2.0</code>, then made two commits with a useful fix. Git printed a warning about "detached HEAD" that you ignored. Now you are about to <code>git switch main</code>. Keep the two commits on a proper branch, and explain what would have happened otherwise.</p>`,
    ex: `<p><code>git status</code> → ${H.c('y', 'HEAD detached from v1.2.0')}. After <code>git switch -c fix/old-release</code>: ${H.c('g', 'On branch fix/old-release')}, and the two commits stay reachable after switching to main.</p>`,
    bw: `<p>Switching to main first and hoping. The two commits belong to no branch; Git warns once, and after that only the reflog knows them until they are garbage-collected.</p>`,
    q: ['What does "detached HEAD" mean?', ['HEAD points straight at a commit instead of at a branch', 'The repository is corrupted', 'You lost your remote', 'HEAD was deleted'], 0, 'Normally HEAD names a branch and commits move that branch. Detached, HEAD names a commit, so new commits are not on any branch unless you create one.'],
    h: ['<p>Hint 1: <code>git status</code> and <code>git log --oneline -n 3</code> show where you are.</p>', '<p>Hint 2: <code>git switch -c NAME</code> creates a branch right here, keeping the commits.</p>', '<p>Hint 3: if you already left, the reflog line "checkout: moving from SHA to main" tells you the SHA; <code>git branch NAME SHA</code>.</p>'],
    a: `<p>Checking out a tag or commit detaches HEAD: you are on a commit, not a branch. Commits you make move HEAD only. If you switch away, nothing points at them and they become unreachable (Git prints a warning with their SHA). Creating a branch at the current position makes them permanent. If you already switched, recover from the reflog. Better habit: <code>git switch -c fix/x v1.2.0</code> from the start.</p>`,
    code: R`# Setup: an old tag, then work in detached HEAD
mkdir lab && cd lab && git init -b main
echo "v1.2" > version.txt && git add version.txt && git commit -m "Release 1.2.0" && git tag v1.2.0
echo "v2.0" > version.txt && git commit -am "Release 2.0.0"
git -c advice.detachedHead=false checkout v1.2.0
echo "fix" > fix.txt && git add fix.txt && git commit -m "Fix crash on empty config"
echo "test" > test.txt && git add test.txt && git commit -m "Add regression test"
git status | head -n 1                 # HEAD detached from v1.2.0

# Save the work on a real branch BEFORE leaving
git switch -c fix/old-release
git switch main
git log --oneline -n 3 fix/old-release # both commits are safe

# If you had already left: find the commit in the reflog and label it
git reflog -n 5
# git branch fix/old-release <sha-from-reflog>`,
    cx: `<p>One command if done in time; one reflog lookup otherwise. Graph: a new label on the detached commits.</p>`,
    f: ['How would you then get this fix onto main?', 'Why do CI systems often build in detached HEAD?']
  }));

  practice.push(P({
    t: 'Write a pre-commit hook that blocks obvious secrets', l: 'Medium', tags: ['hooks', 'secrets', 'pre-commit'], co: ['Paytm', 'CRED'],
    s: `<p>Before the team rolls out a full scanner, you want a quick local safety net: a <code>pre-commit</code> hook that refuses a commit if the <b>staged</b> changes add a line that looks like a secret (<code>API_KEY=</code>, <code>SECRET=</code>, <code>PASSWORD=</code> with a real value, or a private key header), or if someone tries to commit a <code>.env</code> file. Placeholders like <code>changeme</code> are allowed. Test both a blocked and an allowed commit.</p>`,
    ex: `<p><code>git commit</code> with <code>.env</code> staged → ${H.c('r', 'BLOCKED: .env must not be committed')}. With <code>API_KEY=changeme</code> in <code>.env.example</code> → ${H.c('g', 'commit succeeds')}.</p>`,
    bw: `<p>Scanning the whole working tree with <code>grep -r</code>. It flags files that are not even being committed, is slow on big repos, and misses that only <b>staged</b> content matters.</p>`,
    q: ['Why scan <code>git diff --cached</code> rather than the files on disk?', ['The commit contains exactly the staged content, which can differ from the files on disk', 'It is the only command allowed in hooks', 'Files on disk are encrypted', 'It includes the remote'], 0, 'With git add -p a file can be partly staged. The hook must check what will actually be committed: the index, shown by git diff --cached.'],
    h: ['<p>Hint 1: hooks live in <code>.git/hooks/</code> (not shared), or in a tracked folder pointed to by <code>git config core.hooksPath .githooks</code>.</p>', '<p>Hint 2: list staged files with <code>git diff --cached --name-only</code>; added lines with <code>git diff --cached -U0</code> and lines starting with <code>+</code>.</p>', '<p>Hint 3: exit non-zero to block. Exclude placeholders with a second grep. Remember anyone can skip hooks with <code>--no-verify</code>, so add server-side push protection too.</p>'],
    a: `<p>A pre-commit hook is any executable that Git runs before creating a commit; a non-zero exit aborts the commit. Keep it in a tracked <code>.githooks/</code> folder and set <code>core.hooksPath</code> so the team shares it. The script checks staged file names (block <code>.env</code> and <code>*.pem</code>) and the added lines in the staged diff for secret-looking assignments or key headers, ignoring obvious placeholders. It is a safety net, not a guarantee: hooks can be bypassed, and real scanners (gitleaks) know hundreds of token formats; pair it with push protection on the server.</p>`,
    code: R`# Setup
mkdir lab && cd lab && git init -b main
mkdir -p .githooks
cat > .githooks/pre-commit <<'EOF'
#!/usr/bin/env bash
# Block commits that add obvious secrets. A safety net, not a full scanner.
set -euo pipefail
staged=$(git diff --cached --name-only --diff-filter=ACM)
if printf '%s\n' "$staged" | grep -Eq '(^|/)\.env$|\.pem$'; then
  echo "BLOCKED: .env and .pem files must not be committed" >&2
  exit 1
fi
added=$(git diff --cached -U0 | grep -E '^\+[^+]' || true)
hits=$(printf '%s\n' "$added" \
  | grep -Ei '(api_?key|secret|password|token)[[:space:]]*[=:][[:space:]]*[^[:space:]]+|BEGIN [A-Z ]*PRIVATE KEY' \
  | grep -Eiv 'changeme|example|process\.env|os\.environ|<[a-z_]+>' || true)
if [ -n "$hits" ]; then
  echo "BLOCKED: possible secret in staged changes:" >&2
  printf '%s\n' "$hits" >&2
  exit 1
fi
EOF
chmod +x .githooks/pre-commit
git config core.hooksPath .githooks          # share hooks from a tracked folder

# Test 1: blocked (.env file)
printf 'API_KEY=changeme\n' > .env && git add .env
git commit -m "Add env" || echo "commit refused, as expected"
git rm --cached -q .env

# Test 2: blocked (a real-looking value in code)
printf 'API_KEY=not-a-placeholder-123\n' > settings.ini && git add settings.ini
git commit -m "Add settings" || echo "commit refused, as expected"
git rm --cached -q settings.ini && rm settings.ini

# Test 3: allowed (placeholder in the example file)
printf 'API_KEY=changeme\n' > .env.example
git add .env.example .githooks/pre-commit
git commit -m "Add env example and pre-commit hook"
git log --oneline -n 1`,
    cx: `<p>The hook runs in milliseconds on staged changes only. Expect some false positives; tune the allow-list. Not a substitute for gitleaks or push protection.</p>`,
    f: ['How do you make sure every developer actually has the hook enabled?', 'Why is server-side push protection still needed?']
  }));

  // ───────────────────────── Practice: Hard ─────────────────────────
  practice.push(P({
    t: 'Rebase a stacked branch after its base PR was squash-merged', l: 'Hard', tags: ['rebase --onto', 'squash merge', 'stacked PRs'], co: ['Meta', 'Uber'],
    s: `<p>You split a big change into two PRs: <code>feature/api</code> (commits A1, A2) and <code>feature/ui</code> built on top of it (commit U1). <code>feature/api</code> was <b>squash-merged</b> into main as one new commit S. Now <code>git rebase main</code> on <code>feature/ui</code> hits conflicts on A1 and A2, even though their changes are already in main. Move only U1 onto the new main cleanly.</p>`,
    ex: `<p>Before: ${H.c('y', 'main: C1 - S')}, ${H.c('b', 'feature/ui: C1 - A1 - A2 - U1')}. After <code>git rebase --onto main feature/api feature/ui</code>: ${H.c('g', "feature/ui: C1 - S - U1'")}.</p>`,
    bw: `<p>Plain <code>git rebase main</code> and resolving the A1/A2 conflicts by hand. Squashing gave S a different ID and patch than A1 and A2, so Git tries to replay them again; you resolve conflicts for work that is already merged, and risk getting it wrong.</p>`,
    bc: `git switch feature/ui
git rebase main        # tries to replay A1 and A2 again on top of S: conflicts`,
    q: ['In <code>git rebase --onto main feature/api feature/ui</code>, which commits are replayed?', ['Those reachable from feature/ui but not from feature/api: only U1', 'All commits of feature/ui', 'Only the commits of feature/api', 'Commits on main'], 0, 'The form is --onto NEWBASE UPSTREAM BRANCH: replay UPSTREAM..BRANCH onto NEWBASE. feature/api still points at A2, so feature/api..feature/ui is just U1.'],
    h: ['<p>Hint 1: a squash merge creates a new commit; A1 and A2 are not ancestors of main, so Git does not know they are "done".</p>', '<p>Hint 2: you only want the commits after the old base: <code>git log --oneline feature/api..feature/ui</code>.</p>', '<p>Hint 3: <code>git rebase --onto main feature/api feature/ui</code>, then push with <code>--force-with-lease</code> and retarget the PR to main. If <code>feature/api</code> is already deleted, use the SHA of A2 instead (from the PR page or the reflog).</p>'],
    a: `<p>After a squash merge, main contains the <i>changes</i> of A1 and A2 but not the <i>commits</i>, so <code>main..feature/ui</code> still lists A1, A2 and U1. <code>--onto</code> lets you name the old base explicitly: take the commits after <code>feature/api</code> (just U1) and replay them on main. U1 applies cleanly on S because S already contains everything U1 was built on. Then delete the old branch, force-push the UI branch with a lease, and change the PR's base to main. Git 2.38+ also offers <code>git rebase --update-refs</code> for stacks that are rebased together before merging.</p>`,
    code: R`# Setup: a stack of two branches, then a squash merge of the first
mkdir lab && cd lab && git init -b main
echo "app" > app.txt && git add app.txt && git commit -m "C1"
git switch -c feature/api
echo "GET /items" > api.txt && git add api.txt && git commit -m "A1: add items endpoint"
echo "POST /items" >> api.txt && git commit -am "A2: add create endpoint"
git switch -c feature/ui
echo "items page" > ui.txt && git add ui.txt && git commit -m "U1: add items page"
git switch main
git merge --squash feature/api && git commit -m "Add items API (#51)"     # S

# The problem: main..feature/ui still lists A1, A2 and U1
git log --oneline main..feature/ui

# The fix: replay only the commits after feature/api onto main
git log --oneline feature/api..feature/ui      # just U1
git rebase --onto main feature/api feature/ui
git log --oneline --graph -n 3                  # U1' on top of S
git branch -D feature/api                       # squash-merged: -D is needed and safe
# With a server: git push --force-with-lease origin feature/ui, then retarget the PR to main`,
    cx: `<p>One rebase replaying one commit instead of three. Graph: U1 gets a new parent S; A1 and A2 are left behind (their content lives on in S).</p>`,
    f: ['What would you do if feature/api had already been deleted locally and on the server?', 'How does <code>--update-refs</code> help when you rebase a stack of three branches?']
  }));

  practice.push(P({
    t: 'Re-land a reverted feature: why merging again brings nothing', l: 'Hard', tags: ['revert', 'merge', 'revert the revert'], co: ['Microsoft', 'Flipkart'],
    s: `<p>Feature branch <code>feature/cdn</code> was merged into main (merge M), broke production, and was rolled back with <code>git revert -m 1 M</code> (commit R). The author fixed the bug with one more commit F on <code>feature/cdn</code> (it adds origin timeouts in <code>cdn-timeouts.yaml</code>) and merged the branch again. Production now has <b>only</b> the small fix F, not the CDN feature itself. Explain why, and land the full feature correctly.</p>`,
    ex: `<p>After the second merge, <code>cdn-timeouts.yaml</code> is on main but <code>cdn.yaml</code> is ${H.c('r', 'missing')}, even though the branch has it. After reverting R and merging F: ${H.c('g', 'cdn.yaml and cdn-timeouts.yaml both present')}.</p>`,
    bw: `<p>Cherry-picking the original feature commits again one by one, or force-resetting main to before R. The first duplicates commits and is error-prone; the second rewrites shared history.</p>`,
    q: ['Why did merging feature/cdn a second time not bring back the feature?', ['The original feature commits are already ancestors of main; the revert removed their changes, and a merge only adds commits that are new', 'Git ignores branches that were reverted', 'The merge used the wrong strategy', 'Because F conflicted'], 0, 'Merge looks at history, not content. The old commits are in main\'s history (via M), so only F is new. The revert R is also in history and keeps their changes undone, until you revert R.'],
    h: ['<p>Hint 1: draw the graph: M has the feature commits as ancestors; R undoes their changes; the second merge adds only F.</p>', '<p>Hint 2: the clean fix is "revert the revert": <code>git revert R</code> re-applies the original feature.</p>', '<p>Hint 3: order: revert R first (feature back), then merge the fix F, then test. Doing it in one PR keeps deploys atomic.</p>'],
    a: `<p>Git merges by history. After M, the feature commits are part of main. R is a normal commit that removes their changes. When the branch is merged again, Git asks "which commits does main not have yet?" and the answer is only F, so the feature stays reverted and only the fix lands, which may even break things further. The correct sequence is to <b>revert the revert</b> (a new commit that brings the original changes back) and then merge the fix. In a team, do both in one PR from a branch so the feature and its fix deploy together.</p>`,
    code: R`# Setup: merge, revert, fix, merge again (the confusing state)
mkdir lab && cd lab && git init -b main
echo "web" > app.txt && git add app.txt && git commit -m "C1"
git switch -c feature/cdn
printf 'cdn: on\nttl: 0\n' > cdn.yaml && git add cdn.yaml && git commit -m "Add CDN config"
git switch main && git merge --no-ff -m "Merge feature/cdn" feature/cdn
M=$(git rev-parse HEAD)
git revert -m 1 --no-edit "$M"                     # R: production rolled back
R=$(git rev-parse HEAD)
git switch feature/cdn
printf 'originTimeoutSeconds: 10\n' > cdn-timeouts.yaml && git add cdn-timeouts.yaml && git commit -m "Fix CDN: add origin timeout"   # F
git switch main && git merge --no-ff -m "Merge feature/cdn again" feature/cdn
ls cdn-timeouts.yaml && ls cdn.yaml 2>/dev/null || echo "cdn.yaml missing: only F was 'new' to main"

# Fix: go back to before the second merge, revert the revert, then merge the fix
git reset --hard "$R"                              # local only: the second merge was not pushed
git revert --no-edit "$R"                          # brings the original CDN config back
git merge --no-ff -m "Merge feature/cdn fix" feature/cdn
cat cdn.yaml cdn-timeouts.yaml                     # the feature and its fix, together
git log --oneline --graph -n 6`,
    cx: `<p>Two commits (revert of the revert, merge of the fix). If the bad second merge had already been pushed, skip the reset and simply revert R on top: history only moves forward.</p>`,
    f: ['If the second merge was already pushed, what exactly would you do?', 'How do squash merges change this problem?']
  }));

  practice.push(P({
    t: 'Upstream history was rewritten while you had local commits', l: 'Hard', tags: ['rebase --onto', 'force-push aftermath', 'reflog'], co: ['GitLab', 'Shopify'],
    s: `<p>To remove a leaked secret, a maintainer rewrote <code>main</code> on the server and force-pushed. You had two local, unpushed commits on the old main. Now <code>git status</code> says your branch and <code>origin/main</code> "have diverged". A plain <code>git pull</code> would merge the old history (including the secret) back in. Move only your two commits onto the new main.</p>`,
    c: LAB + ' Use a local bare repo as the server; the rewrite is simulated with an amend and a force-push.',
    ex: `<p>Old upstream: ${H.c('r', 'C1 - X')} (X contained the secret), new upstream: ${H.c('g', "C1 - X'")}. Your branch: ${H.c('y', 'C1 - X - Y1 - Y2')}. After <code>git rebase --onto origin/main 'origin/main@{1}' main</code>: ${H.c('g', "C1 - X' - Y1' - Y2'")}; X is not in your history.</p>`,
    bw: `<p><code>git pull</code> (merge). It creates a merge commit joining the old and new histories, so the secret-containing commit X is back in main and the next push re-publishes it. The maintainer's cleanup is undone.</p>`,
    bc: `git pull --no-rebase && git push     # merges the old history back in: X (and the secret) returns`,
    q: ['What does <code>origin/main@{1}</code> refer to here?', ['Where your remote-tracking ref pointed before the last fetch: the old upstream tip X', 'The first commit on main', 'The server\'s reflog', 'The commit before HEAD'], 0, 'Remote-tracking refs have their own reflog. After the fetch that saw the forced update, @{1} is the previous value, which is exactly the old base your commits were built on.'],
    h: ['<p>Hint 1: <code>git fetch</code> shows "(forced update)" for origin/main. Do not pull.</p>', '<p>Hint 2: your own commits are <code>origin/main@{1}..main</code>: the ones after the old upstream tip.</p>', '<p>Hint 3: <code>git rebase --onto origin/main origin/main@{1} main</code>, then verify the old commit is not an ancestor (<code>git merge-base --is-ancestor</code>), then push normally.</p>'],
    a: `<p>After a history rewrite, the old and new upstream commits have different IDs, so Git sees two diverged histories. Merging would join them and resurrect the removed commits. Instead, identify your own work as the commits after the <i>old</i> upstream tip, which the remote-tracking reflog remembers as <code>origin/main@{1}</code>, and replay just those onto the new upstream with <code>--onto</code>. Verify that the old commit is not reachable from your branch, then push normally (it is a fast-forward for the server). (<code>git pull --rebase</code> often gets this right automatically using the same fork-point logic, but the explicit form is clearer and safe.) Everyone else with old clones should re-clone or do the same.</p>`,
    code: R`# Setup: server, maintainer clone, your clone with two local commits
mkdir lab && cd lab
git init --bare -b main server.git
git clone server.git maintainer && git clone server.git me
cd maintainer
echo "app" > app.txt && git add app.txt && git commit -m "C1"
printf 'url: https://api.example.com\ntoken: changeme-LEAKED-EXAMPLE\n' > api.yaml && git add api.yaml && git commit -m "X: add API config"
git push -u origin main
cd ../me && git pull origin main && git branch --set-upstream-to=origin/main main
echo "y1" > y1.txt && git add y1.txt && git commit -m "Y1: my first change"
echo "y2" > y2.txt && git add y2.txt && git commit -m "Y2: my second change"

# The maintainer rewrites X without the secret and force-pushes
cd ../maintainer
printf 'url: https://api.example.com\ntoken: changeme\n' > api.yaml && git commit -a --amend --no-edit
git push --force-with-lease

# You: fetch (look for "forced update"), do NOT pull
cd ../me
git fetch origin
git status -sb                                  # diverged
git log --oneline 'origin/main@{1}..main'       # exactly Y1 and Y2: your own work

# Replay only your commits onto the rewritten main
OLD=$(git rev-parse 'origin/main@{1}')
git rebase --onto origin/main "$OLD" main
git merge-base --is-ancestor "$OLD" main && echo "old X still here!" || echo "old X is gone from your history"
grep -q LEAKED api.yaml && echo "secret present!" || echo "clean config"
git push
git log --oneline --graph -n 4`,
    cx: `<p>One fetch, one rebase. Graph: Y1 and Y2 get new IDs on top of X'; the old X is no longer reachable from main.</p>`,
    f: ['How would you find the old base if the reflog entry had already been overwritten by more fetches?', 'How do you check that no teammate re-pushes the old history?']
  }));

  practice.push(P({
    t: 'Merge the release branch back into main: content and modify/delete conflicts', l: 'Hard', tags: ['conflicts', 'modify/delete', 'yaml', 'release'], co: ['Oracle', 'Infosys'],
    s: `<p>After the October release, <code>release/2026.10</code> must be merged back into <code>main</code>. While the release was being stabilised: on main, <code>app.yaml</code> got <code>replicas: 4</code> and a new <code>logLevel</code>, and <code>cron/cleanup.yaml</code> was deleted (the job moved to a Kubernetes CronJob in <code>k8s/cleanup-cronjob.yaml</code>). On the release branch, a hotfix set <code>timeoutSeconds: 30</code> in <code>app.yaml</code> on the line next to replicas and also edited <code>cron/cleanup.yaml</code> to run hourly. Merge so that main keeps all valid changes, the hourly schedule ends up in the new CronJob file, and everything parses.</p>`,
    ex: `<p><code>git merge release/2026.10</code> → ${H.c('r', 'CONFLICT (content): app.yaml')} and ${H.c('r', 'CONFLICT (modify/delete): cron/cleanup.yaml deleted in HEAD and modified in release/2026.10')}. Result: <code>app.yaml</code> has <code>replicas: 4</code>, <code>timeoutSeconds: 30</code>, <code>logLevel: info</code>; <code>cron/cleanup.yaml</code> stays deleted; <code>k8s/cleanup-cronjob.yaml</code> has <code>schedule: "0 * * * *"</code>.</p>`,
    bw: `<p><code>git checkout --theirs .</code> and commit. The release branch's whole files win: replicas goes back to the old value, logLevel disappears, and the deleted cron file returns, so the cleanup job now runs twice (old cron plus new CronJob).</p>`,
    bc: `git checkout --theirs . && git add -A && git commit --no-edit    # silently undoes main's changes`,
    q: ['For the modify/delete conflict, the job now lives in the new CronJob file. What is right?', ['Keep the file deleted (<code>git rm</code>) and port the hourly schedule into the new CronJob file', 'Keep the old file because it was modified', 'Delete both files', 'Ignore it; Git decides'], 0, 'The deletion reflects a real design change (the job moved). The release-branch edit carries an intent (run hourly) that must be applied in the new place; restoring the old file would run the job twice.'],
    h: ['<p>Hint 1: <code>git status</code> lists two kinds of conflict; handle them one by one. <code>git diff</code> shows the content hunks.</p>', '<p>Hint 2: for app.yaml, combine: replicas and logLevel from main, timeoutSeconds from release. For the cron file, read what the release changed with <code>git show release/2026.10 -- cron/cleanup.yaml</code>.</p>', '<p>Hint 3: <code>git rm cron/cleanup.yaml</code>, edit the CronJob schedule, validate all YAML, then <code>git add</code> and <code>git commit</code> with a message explaining both decisions.</p>'],
    a: `<p>Treat each conflict as a decision. <b>app.yaml</b>: both sides changed neighbouring lines, so Git could not merge them; the right result keeps main's <code>replicas: 4</code> and <code>logLevel</code> and the release hotfix's <code>timeoutSeconds: 30</code>. <b>cron/cleanup.yaml</b> (modify/delete): main deleted it because the job moved to a CronJob; the release branch changed its schedule. Keep it deleted and carry the <i>intent</i> (hourly) into <code>k8s/cleanup-cronjob.yaml</code>. Validate every YAML file, check no markers remain, stage the resolutions (<code>git add</code>, <code>git rm</code>), and commit with a message that records both decisions. Graph: one merge commit with main and the release branch as parents.</p>`,
    code: R`# Setup: a release branch and main diverge on the same files
mkdir lab && cd lab && git init -b main
mkdir -p cron k8s
printf 'service: web\nreplicas: 2\n' > app.yaml
printf 'schedule: "0 3 * * *"\ncommand: cleanup\n' > cron/cleanup.yaml
git add . && git commit -m "Initial config"
git switch -c release/2026.10
printf 'service: web\nreplicas: 2\ntimeoutSeconds: 30\n' > app.yaml
printf 'schedule: "0 * * * *"\ncommand: cleanup\n' > cron/cleanup.yaml
git commit -am "Hotfix: 30s timeout, run cleanup hourly"
git switch main
printf 'service: web\nreplicas: 4\nlogLevel: info\n' > app.yaml
git rm -q cron/cleanup.yaml
printf 'apiVersion: batch/v1\nkind: CronJob\nmetadata:\n  name: cleanup\nspec:\n  schedule: "0 3 * * *"\n' > k8s/cleanup-cronjob.yaml
git add . && git commit -m "Scale to 4, add logLevel, move cleanup to a CronJob"

# 1. Merge and look at what conflicts
git merge release/2026.10 || git status --short   # UU app.yaml, DU cron/cleanup.yaml
git diff -- app.yaml
git show release/2026.10 -- cron/cleanup.yaml     # the release's intent: hourly

# 2. Content conflict: combine both sides
printf 'service: web\nreplicas: 4\ntimeoutSeconds: 30\nlogLevel: info\n' > app.yaml
git add app.yaml

# 3. Modify/delete: keep it deleted, move the intent to the new file
git rm -q cron/cleanup.yaml
sed -i 's/schedule: "0 3 \* \* \*"/schedule: "0 * * * *"/' k8s/cleanup-cronjob.yaml
git add k8s/cleanup-cronjob.yaml

# 4. Validate everything, then commit with the reasons
grep -rn '^[<=>|]\{7\}' app.yaml k8s/ && echo "markers left!" || echo "no markers"
for f in app.yaml k8s/cleanup-cronjob.yaml; do python3 -c 'import sys, yaml; yaml.safe_load(open(sys.argv[1]))' "$f" && echo "ok $f"; done
git commit -m "Merge release/2026.10 into main" -m "app.yaml: keep replicas 4 and logLevel from main, timeout 30s from the hotfix. cron/cleanup.yaml stays deleted; hourly schedule ported to k8s/cleanup-cronjob.yaml."
git log --oneline --graph -n 4`,
    cx: `<p>Around ten commands; the real work is the two decisions. Graph: one merge commit. Always validate merged config before pushing, because a "resolved" file can still be invalid.</p>`,
    f: ['How would trunk-based development have avoided most of this merge?', 'How would you have the CronJob change reviewed separately from the merge?']
  }));

  // ───────────────────────── Quiz ─────────────────────────
  quiz.push({ q: 'You edited <code>app.yaml</code> and ran <code>git add app.yaml</code>, then edited it again. What will <code>git commit</code> save?', options: ['The version from the moment you ran git add', 'The latest version on disk', 'Both versions as two commits', 'Nothing until you push'], answer: 0, explain: 'A commit saves the staging area. The second edit is only in the working tree until you add it again; <code>git status</code> shows the file as both staged and modified.' });
  quiz.push({ q: 'main has had no new commits since you created <code>feature</code>. What does <code>git switch main &amp;&amp; git merge feature</code> do?', options: ['Fast-forward: moves main to feature\'s tip, no merge commit', 'Creates a merge commit with two parents', 'Rebases feature onto main', 'Refuses because the branches differ'], answer: 0, explain: 'When the current branch is an ancestor of the one being merged, Git just slides the label forward. Use <code>--no-ff</code> if you want a merge commit anyway.' });
  quiz.push({ q: 'Which statement about <code>git rebase main</code> on your feature branch is true?', options: ['Your feature commits are replayed on top of main and get new commit IDs', 'main is changed to include your commits', 'It creates a merge commit', 'It keeps the original commit IDs'], answer: 0, explain: 'Rebase copies each of your commits onto the new base. Because the parent changes, every copy gets a new ID. main itself does not move.' });
  quiz.push({ q: 'Your push to your own PR branch is rejected after a rebase. What should you run?', options: ['<code>git push --force-with-lease</code>', '<code>git push --force origin main</code>', '<code>git pull</code> then push', '<code>git reset --hard origin/main</code>'], answer: 0, explain: 'The rebase rewrote the branch, so a normal push is a non-fast-forward. The lease overwrites only if the server still has what you last fetched, protecting any commits a teammate added. Pulling would merge the old copies back in.' });
  quiz.push({ q: 'A bad commit is already on the shared <code>main</code> and five people have pulled it. How do you undo it?', options: ['<code>git revert SHA</code> and push normally', '<code>git reset --hard SHA~1</code> and force-push', 'Delete the branch and recreate it', '<code>git commit --amend</code>'], answer: 0, explain: 'revert adds a new commit with the inverse change, so history only moves forward and nobody\'s clone is invalidated. reset + force-push rewrites shared history.' });
  quiz.push({ q: 'After <code>git reset --hard HEAD~2</code> you realise you needed those commits. What is the first command to run?', options: ['<code>git reflog</code>', '<code>git gc</code>', '<code>git clone</code> the repo again', '<code>git revert HEAD</code>'], answer: 0, explain: 'The reflog lists where HEAD has been, including the commit before the reset (usually HEAD@{1}). Put a branch on it. gc could delete unreachable objects and a fresh clone has no local commits.' });
  quiz.push({ q: 'In a merge conflict, which part of the markers is <i>your current branch</i>?', options: ['Between <code>&lt;&lt;&lt;&lt;&lt;&lt;&lt; HEAD</code> and <code>=======</code>', 'Between <code>=======</code> and <code>&gt;&gt;&gt;&gt;&gt;&gt;&gt; branch</code>', 'Outside the markers', 'Git does not show it'], answer: 0, explain: 'The top section (HEAD) is ours, the bottom is the incoming branch. With merge.conflictStyle zdiff3 a middle ||||||| section shows the base. During a rebase, HEAD is the branch you are rebasing onto.' });
  quiz.push({ q: 'You added <code>.env</code> to <code>.gitignore</code> but it still appears as modified. Why?', options: ['It was already tracked; ignore rules only affect untracked files', '.gitignore only works after a push', 'The pattern needs a leading !', 'Git caches .gitignore for a day'], answer: 0, explain: 'Once a file is in the index, Git keeps tracking it. <code>git rm --cached .env</code> untracks it while keeping the local file, and from then on the ignore rule applies.' });
  quiz.push({ q: 'An AWS access key was pushed to a public repo 10 minutes ago. What comes first?', options: ['Revoke/rotate the key at AWS and check CloudTrail', 'Run git filter-repo', 'Make the repo private', 'Commit a deletion of the file'], answer: 0, explain: 'Scrapers find keys in minutes and copies already exist in forks and clones. Only revoking makes those copies useless. History cleanup with filter-repo comes after, as hygiene.' });
  quiz.push({ q: 'What is the difference between <code>git fetch</code> and <code>git pull</code>?', options: ['fetch only downloads and updates origin/* refs; pull also merges or rebases into your branch', 'fetch uploads, pull downloads', 'They are identical', 'fetch deletes remote branches'], answer: 0, explain: 'fetch is always safe: your branches and files do not change. pull = fetch + integrate, which can create merge commits or conflicts.' });
  quiz.push({ q: 'A team deploys its web API to production several times a day and supports one live version. Which branching model fits best?', options: ['Trunk-based development / GitHub flow with feature flags', 'Git flow with develop and release branches', 'One long-lived branch per developer', 'No branches and no reviews'], answer: 0, explain: 'Short-lived branches merged daily keep integration small and continuous; feature flags hide unfinished work. Git flow suits scheduled, versioned releases with several supported versions.' });
  quiz.push({ q: 'Which tag type should you use for a release, and how is it shared?', options: ['Annotated (<code>git tag -a v1.2.0 -m ...</code>), pushed with <code>git push origin v1.2.0</code>', 'Lightweight, pushed automatically with every push', 'A branch named v1.2.0', 'Annotated, but tags cannot be pushed'], answer: 0, explain: 'Annotated tags store tagger, date and message and can be signed. Tags are not pushed by default: push them by name or with --follow-tags.' });
  quiz.push({ q: 'You used <code>git push --force-with-lease</code>, yet it overwrote a teammate\'s commit. What most likely happened?', options: ['A background fetch updated origin/main, so the lease matched; --force-if-includes would have caught it', 'The lease is ignored on GitHub', 'The teammate used --force', 'Leases expire after 24 hours'], answer: 0, explain: 'The lease compares the server with your remote-tracking ref. If an IDE fetched in the background, that ref already pointed at the new commit even though you never integrated it. --force-if-includes also checks your reflog.' });

  // ───────────────────────── Interview ─────────────────────────
  interview.push({ level: 'B', q: 'What is the difference between Git and GitHub (or GitLab)?', a: `<p>Git is the version control program that runs on your machine. It stores the full history of a project as commits in the <code>.git</code> folder, and works offline: committing, branching, merging and looking at history need no server. GitHub and GitLab are hosting platforms that keep a shared copy of the repository and add team features around it: pull or merge requests, code review, branch protection, CI/CD (GitHub Actions, GitLab CI), issue tracking, releases, and access control. Because Git is distributed, every clone is a full copy; the hosted repo is simply the agreed "source of truth" the team pushes to and pulls from. You could use Git with a plain SSH server or even a folder (<code>git init --bare</code>) and no platform at all.</p>`, followUps: ['What does "distributed" buy you compared with a central system?', 'Name two features you would configure on a new GitHub repo for a team.'] });
  interview.push({ level: 'B', q: 'Explain the working tree, the staging area and a commit.', a: `<p>The working tree is the files you edit. The staging area (index) is the draft of the next commit: <code>git add</code> copies a file's current content there, so I choose exactly what goes in, even part of a file with <code>git add -p</code>. A commit is a permanent snapshot of the staging area plus metadata: author, date, message and a pointer to the parent commit; its ID is a hash of all of that, so history is tamper-evident. <code>git diff</code> compares working tree and staging, <code>git diff --staged</code> compares staging and the last commit. I keep commits small and about one thing, with an imperative subject and a body explaining why, because that is what helps during an incident.</p>`, followUps: ['How do you undo a git add?', 'What makes a good commit message?'] });
  interview.push({ level: 'B', q: 'Merge vs rebase: what is the difference and when do you use each?', a: `<p>Both integrate changes from one branch into another. A merge keeps history exactly as it happened: if the branches diverged it creates a merge commit with two parents; if not, it fast-forwards. A rebase replays my commits on top of the other branch, giving a linear history but creating new commit IDs. I rebase my own, unshared feature branch to keep it up to date with main and to tidy commits before review (<code>git rebase -i</code>), and then force-push my PR branch with <code>--force-with-lease</code>. I never rebase shared branches like main, because others have the old commits. For integrating into main, the team's chosen merge method (merge commit, squash or rebase-merge) applies; I follow it consistently.</p>`, followUps: ['What is the golden rule of rebasing?', 'Why might a team prefer squash merges?'] });
  interview.push({ level: 'B', q: 'How do you resolve a merge conflict?', a: `<p>First I read <code>git status</code> to see which files conflict and what kind (content, modify/delete). In each file Git marks the conflict: the HEAD section is ours, the other section is the incoming branch, and with <code>merge.conflictStyle zdiff3</code> I also see the base, which tells me what each side changed. I decide the correct content, which may be one side, both, or something new, and talk to the other author if it is a business decision, for example replica counts in a config file. I remove all markers, validate (parse the YAML, run tests, <code>terraform validate</code>), then <code>git add</code> the file and finish with <code>git commit</code> or <code>git rebase --continue</code>. If it goes wrong, <code>git merge --abort</code> returns to the start. For lockfiles I take one side and regenerate.</p>`, followUps: ['Why can a merge with no conflicts still be wrong?', 'What does rerere do?'] });
  interview.push({ level: 'B', q: 'What should never be committed to a repository, and how do you prevent it?', a: `<p>Secrets (API keys, passwords, tokens, private keys, kubeconfigs, <code>.env</code> files), Terraform state (it can contain secrets), build output and dependencies (<code>dist/</code>, <code>node_modules/</code>), logs, large binaries and personal editor files. Prevention is layered: a <code>.gitignore</code> with those patterns plus a committed <code>.env.example</code> with placeholders; reading secrets from environment variables injected from a secret manager or CI secret store; a pre-commit secret scanner such as gitleaks; and server-side push protection (GitHub secret scanning, GitLab secret push protection) because local hooks can be skipped. Reviewers also look for secrets in diffs. If a file is already tracked, <code>git rm --cached</code> untracks it.</p>`, followUps: ['What is the difference between .gitignore and .git/info/exclude?', 'How do short-lived credentials reduce the impact of a leak?'] });
  interview.push({ level: 'I', q: 'Someone committed and pushed an API key. Walk me through your response.', a: `<p>1) Rotate first: create a new key, put it in the secret store, deploy, and revoke the old key at the provider. Assume it is compromised, because scrapers find keys in minutes and copies already exist in clones, forks and CI caches. 2) Check the provider's logs (for example CloudTrail) for use of the old key between the push and revocation, and open an incident if needed. 3) Fix forward: code reads the key from the environment, the file is ignored and untracked. 4) Clean history in a fresh clone with <code>git filter-repo</code> (drop the file or replace the text), force-push all branches and tags, have everyone re-clone, and ask the host to purge cached views and PR refs. I explain that removal alone is not enough: it only cleans future clones. 5) Prevent: pre-commit scanning, push protection, and a blameless postmortem.</p>`, followUps: ['Why must teammates re-clone instead of pull after the rewrite?', 'How would you handle open pull requests during the rewrite?'] });
  interview.push({ level: 'I', q: 'When do you use revert, reset and the reflog?', a: `<p><code>git revert</code> is for undoing commits on shared branches: it adds a new commit with the inverse change, so history only moves forward and nobody's clone is invalidated; for a merged PR I use <code>git revert -m 1 MERGE</code>. <code>git reset</code> moves a branch label and is for local, unpushed work: <code>--soft</code> keeps changes staged, <code>--mixed</code> keeps them unstaged, <code>--hard</code> also overwrites files and loses uncommitted edits. The reflog is my safety net: it records every position of HEAD locally, so after a bad reset, rebase or branch deletion I find the old commit there and put a branch on it, usually within the 30-90 day expiry. It cannot recover edits that were never committed or stashed.</p>`, followUps: ['How do you re-land a feature after reverting its merge?', 'What is ORIG_HEAD?'] });
  interview.push({ level: 'I', q: 'A teammate force-pushed and your commits disappeared from main. What do you do?', a: `<p>Stay calm: a force-push only moves the server's branch label. My commits still exist in my clone (on my branch or in my reflog) and in any clone that fetched them; the platform's activity log also shows the previous tip. I <code>git fetch</code> (it will say "forced update"), compare <code>git log origin/main..main</code> to see which of my commits are missing upstream, then <code>git rebase origin/main</code> (or cherry-pick the missing commits) so they sit on top of the new history, and push normally. I do not force-push back, which would delete the teammate's work in turn. Afterwards: enable branch protection to block force-pushes on main, require PRs, and teach <code>--force-with-lease --force-if-includes</code> for personal branches.</p>`, followUps: ['How exactly does --force-with-lease decide to refuse?', 'What if the commits existed only on the server?'] });
  interview.push({ level: 'I', q: 'What makes a good pull request, and what do you look for when reviewing an infrastructure change?', a: `<p>A good PR is small (a few hundred lines), does one thing, and has a description: what, why, how it was tested and how to roll it back, with links to the ticket. CI must be green. As a reviewer of infrastructure changes I read the effect, not just the text: the <code>terraform plan</code> or rendered Kubernetes manifests, watching for destroy/replace of stateful resources, security groups opened to <code>0.0.0.0/0</code>, IAM wildcards, secrets or real hostnames in the diff, missing resource limits or probes, and whether a revert actually rolls it back (migrations often do not). I also ask about timing and blast radius: who is on call, staged rollout, feature flag. Comments are specific and kind, minor ones marked <code>nit:</code>; I approve when it is safe and good, not when it matches my style.</p>`, followUps: ['How do CODEOWNERS and branch protection support this?', 'How do you handle a 3,000-line PR?'] });
  interview.push({ level: 'I', q: 'Explain trunk-based development vs Git flow. Which would you pick for a team deploying daily?', a: `<p>Git flow uses long-lived <code>main</code> and <code>develop</code> branches plus feature, release and hotfix branches with planned merges between them; it suits software released on a schedule with several supported versions. Trunk-based development has everyone merge small changes into main at least daily through short-lived branches and PRs; unfinished work is hidden behind feature flags, main is always deployable, and releases are tags on main. For a team deploying daily I pick trunk-based (GitHub flow): long branches cause big merges, slow feedback and drift between develop and main, and the DORA research associates trunk-based work with better delivery performance. It needs fast CI, branch protection, small PRs, flag hygiene and tags so rollback is "redeploy the previous tag". If we later had to support old versions, I would add release branches with cherry-picked fixes.</p>`, followUps: ['How do feature flags change the meaning of "release"?', 'How would you migrate a team from Git flow?'] });
  interview.push({ level: 'I', q: 'How do you version and release software with Git?', a: `<p>I use Semantic Versioning (MAJOR.MINOR.PATCH): patch for fixes, minor for backward-compatible features, major for breaking changes. A release is an annotated, ideally signed tag on the exact commit that passed staging (<code>git tag -a v1.7.0 -m ...</code>), pushed explicitly because tags are not pushed by default. The pipeline triggers on <code>v*</code> tags, builds artifacts or images tagged with the version and the commit SHA, and creates a GitHub/GitLab release with notes generated from <code>git log v1.6.0..v1.7.0</code> or from Conventional Commits via release-please or semantic-release. Tags are never moved or reused; a mistake becomes a new patch version, and tag protection prevents deletion. Supported old versions get release branches where fixes from main are cherry-picked with <code>-x</code>.</p>`, followUps: ['Why is moving a pushed tag dangerous?', 'Lightweight vs annotated tags?'] });
  interview.push({ level: 'A', q: 'How would you design the Git and review setup for a 40-engineer platform team so that main is always deployable?', a: `<p>Trunk-based with short-lived branches and PRs. Main is protected by rulesets/protected branches: PR required, at least one approval plus code-owner approval for sensitive paths (<code>terraform/</code>, workflows), required status checks (lint, unit tests, plan, security scans), no force-push or deletion, optionally linear history and signed commits. A merge queue (GitHub merge queue or GitLab merge trains) tests each PR on top of the ones ahead, so concurrent merges cannot break main. Merged branches auto-delete; stale branches are reported. Every deploy is a protected tag; rollback is redeploying the previous tag or reverting. Secrets: push protection and pre-commit scanning, CI using OIDC to the cloud instead of stored keys. CI tokens and bots, including AI agents, use least privilege and cannot approve their own PRs. We track PR size, review time and change-failure rate to tune the process.</p>`, followUps: ['How do you keep CI under ten minutes as the repo grows?', 'Monorepo or many repos for this team?'] });
  interview.push({ level: 'A', q: 'Your repo history must be rewritten (a secret, or a huge binary). How do you plan it so the team is not disrupted?', a: `<p>If it is a secret, rotation happens first; the rewrite is hygiene. Then: announce a short freeze and ask people to push or note their unpushed work; work in a fresh mirror or <code>--no-local</code> clone; run <code>git filter-repo</code> (<code>--invert-paths --path</code> to drop files, <code>--replace-text</code> for strings, <code>--strip-blobs-bigger-than</code> for binaries); verify with <code>git log --all -S</code> or a scanner; temporarily allow force-push on protected branches, push all branches and tags, re-enable protection. Everyone re-clones, because merging an old clone brings the old commits back; for local unpushed work they use <code>git rebase --onto NEW OLD branch</code>. Open PRs are rebased or recreated, CI caches and mirrors are cleared, and the host is asked to purge cached refs (GitHub Support, GitLab repository cleanup). Long term, move large files to Git LFS or artifact storage.</p>`, followUps: ['Why does filter-repo remove the origin remote?', 'How would you detect someone re-pushing the old history?'] });
  interview.push({ level: 'E', q: 'How do AI coding assistants and agents change Git workflows, and what guardrails do you put in place?', a: `<p>AI writes commit messages and PR descriptions, reviews diffs within minutes, resolves simple conflicts, and agents now open whole PRs on their own branches. That increases PR volume and speed, so the process has to scale: small PRs, fast CI, merge queues and clear ownership matter more than ever. Guardrails: agents work only on their own branches and cannot push to or bypass protection on main; their tokens are least-privilege and short-lived, and they cannot approve or merge their own PRs; a human reviewer remains accountable for every merge; force-push from automation always uses the lease form; secret scanning and push protection catch the classic agent mistake of <code>git add -A</code> with a <code>.env</code> file. AI review comments are treated like a smart linter. People must also avoid pasting secrets or customer data from repos into external AI tools.</p>`, followUps: ['How would you measure whether AI reviews improve quality?', 'What would you log for an agent that commits code?'] });

  // ───────────────────────── Module registration ─────────────────────────
  registerModule({
    id: 'devops04',
    title: 'Git & Collaboration Workflows',
    lang: 'bash',
    intro: `<p>Every DevOps change, from a one-line config fix to a Terraform module, travels through Git. Pipelines trigger on pushes and tags, reviews happen on pull requests, and rollbacks are often just a revert. This module teaches Git the way a <b>Junior DevOps or Cloud Support Engineer</b> uses it on a team: commits and the staging area, branches, fast-forward and merge commits, rebasing, resolving conflicts in config files, pull requests and code review on GitHub and GitLab, tags and releases, <code>.gitignore</code> and secrets hygiene, and choosing between trunk-based development and Git flow.</p>
      <p>The commit graph is drawn step by step in the visualizers: you will watch branches split, merges join them, a rebase replay commits with new IDs, a force-push wipe a teammate's work, and the reflog bring "lost" commits back. Every topic is tied to a real team situation: a conflict in <code>app.yaml</code>, a force-push accident, a bad commit on shared main, a leaked API key, a team that deploys daily. All labs run in a <b>throwaway local repo</b> (<code>mkdir lab &amp;&amp; cd lab &amp;&amp; git init</code>), and a local bare repository stands in for GitHub or GitLab, so you can break things safely and no hosted account is needed. Hosted steps are marked optional. Secrets in the examples are obvious fakes like <code>API_KEY=changeme</code>.</p>`,
    goals: [
      'Explain the working tree, staging area and commits, write clean small commits with useful messages, and read history with <code>git log --graph</code>, <code>git show</code> and <code>git blame</code>',
      'Create branches and predict whether a merge will fast-forward or create a merge commit, and keep <code>pull</code> safe with <code>--ff-only</code> or <code>--rebase</code>',
      'Rebase and tidy a feature branch with interactive rebase, and update a pushed branch safely with <code>--force-with-lease</code> (never plain <code>--force</code> on shared branches)',
      'Resolve content and modify/delete conflicts in config files calmly: read the markers (with the base), decide, validate, continue or abort',
      'Choose the right undo: <code>restore</code>, <code>reset</code>, <code>revert</code> (including <code>-m 1</code> for merges) and recover lost commits with the reflog',
      'Run a full pull-request flow with remotes, fetch, push and review, and configure branch protection and CODEOWNERS on GitHub or GitLab',
      'Keep junk and secrets out of Git with <code>.gitignore</code> and scanning, and handle a leaked secret in the right order: rotate, check, fix, <code>git filter-repo</code>, prevent',
      'Tag releases with Semantic Versioning, backport fixes with cherry-pick, and recommend trunk-based development or Git flow for a given team'
    ],
    prereqs: `<b>Cloud &amp; DevOps 1</b> (Linux for the Cloud) is helpful: you need to be comfortable in a terminal (<code>cd</code>, <code>ls</code>, editing files, running commands) and with SSH keys, which you will reuse to authenticate to GitHub or GitLab. No previous Git knowledge is assumed. Later modules build on this one: <b>Cloud &amp; DevOps 9</b> (Terraform) and <b>Cloud &amp; DevOps 11</b> (CI/CD Pipelines) assume you can branch, open a PR and tag a release.`,
    hours: 8,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
