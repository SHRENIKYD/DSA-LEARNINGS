(function () {
  var topics = [], practice = [], quiz = [], interview = [];
  var R = String.raw; // raw template: backslashes in shell code and Dockerfiles stay exactly as typed
  var LAB = 'Your own machine with <b>Docker Desktop</b> (macOS/Windows), <b>Docker Engine</b> on Linux or WSL 2, or <b>Podman</b> (<code>alias docker=podman</code> works for most commands; differences are noted). No cloud account needed. Registry steps use a local registry: <code>docker run -d -p 5000:5000 --name registry registry:2</code>. All secrets are placeholders.';
  var SKIP = { skip: 'container procedure, verified by reading' };
  // Dockerfiles have no checker in tools/validate.js, so they use lang 'text' with check: false (the same convention as be13).
  function DF(code, title) { return { lang: 'text', check: false, title: title || 'Dockerfile', code: code }; }
  function Y(code, title) { return { lang: 'yaml', title: title || 'compose.yaml', code: code }; }   // parsed as YAML by the validator
  function SH(code, title) { var s = { lang: 'bash', code: code }; if (title) s.title = title; return s; } // bash -n checked
  function PY(code, title) { return { lang: 'python', title: title || 'Python model (tested)', code: code }; }
  function snip(c) { return typeof c === 'string' ? SH(c) : c; }
  // Compact problem builder. Code is bash unless a DF/Y/PY snippet object is passed.
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

  // ── Small models shared by the visualizers (the Python problem answers are written separately) ──
  // Which build steps rebuild when files change? (single-stage Dockerfile, base image unchanged)
  function globRe(p) { return new RegExp('^' + p.replace(/[.+^(){}|[\]\\$]/g, '\\$&').replace(/\*/g, '[^/]*').replace(/\?/g, '.') + '$'); }
  function srcMatches(src, file) {
    src = src.replace(/^\.\//, '');
    file = file.replace(/^\.\//, '');
    if (src === '' || src === '.') return true;
    if (src.indexOf('*') >= 0 || src.indexOf('?') >= 0) return globRe(src).test(file);
    if (src.charAt(src.length - 1) === '/') return file.indexOf(src) === 0;
    return file === src || file.indexOf(src + '/') === 0;
  }
  function stepStatus(steps, changed) {
    var dirty = false;
    return steps.map(function (st, i) {
      var w = st.trim().split(/\s+/), ins = (w[0] || '').toUpperCase(), why = '';
      if (i === 0 || ins === 'FROM') return { s: 'CACHED', why: 'base image unchanged' };
      if (dirty) return { s: 'REBUILD', why: 'an earlier layer changed, so every later cache key changes' };
      if (ins === 'COPY' || ins === 'ADD') {
        var args = w.slice(1).filter(function (t) { return t.indexOf('--') !== 0; });
        var srcs = args.slice(0, -1), hit = null;
        changed.forEach(function (f) { srcs.forEach(function (s) { if (!hit && srcMatches(s, f)) hit = f; }); });
        if (hit) { dirty = true; return { s: 'REBUILD', why: '<code>' + H.esc(hit) + '</code> is in the copied files, so the checksum changed' }; }
        why = 'none of the changed files are copied here';
      } else why = 'same instruction text and same parent layer';
      return { s: 'CACHED', why: why };
    });
  }
  // Final image size: only the last stage ships; FROM <earlier stage> starts from that stage's size.
  function sizeModel(lines) {
    var stages = {}, cur = null, order = [];
    lines.forEach(function (ln) {
      var parts = ln.split('|'), txt = parts[0].trim(), mb = Number((parts[1] || '0').trim());
      if (isNaN(mb) || mb < 0) throw new Error('Each line needs " | size in MB", e.g. RUN go build | 40');
      var w = txt.split(/\s+/);
      if (w[0].toUpperCase() === 'FROM') {
        var t = w.slice(1).filter(function (x) { return x.indexOf('--') !== 0; });
        var base = t[0] || 'scratch', name = (t[1] && t[1].toUpperCase() === 'AS') ? t[2] : 'stage' + order.length;
        var start = stages.hasOwnProperty(base.toLowerCase()) ? stages[base.toLowerCase()].size : mb;
        cur = { name: name.toLowerCase(), label: name, size: start, base: base };
        stages[cur.name] = cur; order.push(cur);
      } else {
        if (!cur) throw new Error('The first line must be a FROM line');
        cur.size += mb;
      }
    });
    if (!cur) throw new Error('Add at least one FROM line');
    return order;
  }
  function parsePortJs(s) {
    var m = String(s).trim().match(/^(?:(\d{1,3}(?:\.\d{1,3}){3}):)?(?:(\d*):)?(\d+)(?:\/(tcp|udp|sctp))?$/);
    if (!m) return null;
    var ok = function (p) { return /^\d+$/.test(p) && +p >= 1 && +p <= 65535; };
    if (!ok(m[3]) || (m[2] && !ok(m[2]))) return null;
    return { ip: m[1] || '0.0.0.0', host: m[2] || 'random', cport: m[3], proto: m[4] || 'tcp' };
  }
  function exitInfo(code) {
    var map = { 0: 'success', 125: 'docker run failed', 126: 'command not executable', 127: 'command not found', 137: 'SIGKILL (OOM or docker kill/stop timeout)', 139: 'SIGSEGV', 143: 'SIGTERM' };
    if (code < 0 || code > 255) return 'invalid';
    if (map.hasOwnProperty(code)) return map[code];
    if (code > 128) return 'signal ' + (code - 128);
    return 'application error';
  }

  // ───────────────────────── Topic 1: images vs containers ─────────────────────────
  topics.push({
    title: 'Images vs Containers: the Recipe and the Meal',
    analogy: `<p>An <b>image</b> is a frozen ready-meal in the freezer: sealed, labelled, identical every time you buy it. A <b>container</b> is one meal you have heated up and are eating. You can heat up ten meals from the same box design, add salt to one of them, and the box in the freezer never changes. Throw the plate away and the salt you added is gone with it. Docker is the microwave plus the freezer aisle: it stores images, heats them into containers, and cleans up the plates.</p>`,
    explain: `<p>🟢 <b>The two words everyone mixes up.</b></p>
      ${H.table(['', 'Image', 'Container'], [
        ['What it is', 'a read-only bundle of files (a filesystem) plus settings: which command to run, which user, which ports, environment variables', 'a <b>running process</b> started from an image, with a thin writable layer on top and its own isolated view of the machine'],
        ['How you make it', '<code>docker build</code> (from a Dockerfile) or <code>docker pull</code>', '<code>docker run</code> (= create + start)'],
        ['Does it change?', 'never: a new build makes a new image with a new ID', 'yes: files written inside go into its writable layer'],
        ['How many?', 'one image', 'as many containers as you like from that image'],
        ['Removed with', '<code>docker rmi</code> / <code>docker image prune</code>', '<code>docker rm</code> (its writable layer is deleted too)']
      ])}
      <p>🟢 <b>A container is just a process.</b> There is no tiny computer inside. When you run <code>docker run nginx</code>, the Linux kernel starts the nginx program, but puts it in a fenced-off view: it sees its own files, its own process list, its own network card, and it gets a limited share of CPU and memory. The fences are kernel features called <b>namespaces</b> and <b>cgroups</b>; <b>CS Core 9</b> explains how they work inside, so here we only use them. On macOS and Windows, Docker Desktop runs a small Linux virtual machine and your containers live inside it.</p>
      <p>🔵 <b>Names you will see.</b> An image reference looks like <code>registry/namespace/name:tag</code>, for example <code>docker.io/library/python:3.12-slim</code>. If you leave out the registry, Docker assumes Docker Hub; if you leave out the tag, it assumes <code>:latest</code> (which just means "whatever was pushed last", not "newest stable"). Every image also has a <b>digest</b> (<code>sha256:...</code>), a fingerprint of its exact content. Tags can move; digests cannot.</p>
      <p>🔵 <b>The container lifecycle.</b> <code>created → running → exited</code>, and from exited you can <code>start</code> again or <code>rm</code>. A container keeps its writable layer while it exists, even when stopped. It loses it only on <code>docker rm</code> (or <code>--rm</code>, which removes it automatically on exit).</p>
      ${H.table(['Command', 'What it does'], [
        ['<code>docker run -d --name web -p 8080:80 nginx:1.27</code>', 'pull if needed, create, start in the background (<code>-d</code>), publish port 80 as 8080 on your machine'],
        ['<code>docker ps</code> / <code>docker ps -a</code>', 'running containers / all containers including exited ones'],
        ['<code>docker stop web</code>', 'send SIGTERM, wait 10 s, then SIGKILL'],
        ['<code>docker rm web</code>', 'delete the container and its writable layer'],
        ['<code>docker images</code>', 'local images with tags, IDs and sizes'],
        ['<code>docker diff web</code>', 'files the container added (A), changed (C) or deleted (D) compared with its image']
      ])}
      <p>🔵 <b>Docker, Podman and friends.</b> The image format is an open standard (OCI), so the same image runs on Docker Engine, Docker Desktop, Podman, containerd (used by Kubernetes) and cloud services. Docker uses a background daemon (<code>dockerd</code>); <b>Podman</b> has no daemon and runs <b>rootless</b> by default, as your normal user. Most commands are identical (<code>alias docker=podman</code>), but Podman wants full image names (<code>docker.io/library/nginx</code>) unless short names are configured, uses <code>podman compose</code> or <code>podman-compose</code>, and needs <code>:Z</code> on bind mounts on SELinux systems such as Fedora.</p>`,
    clues: [
      '"What is the difference between an image and a container?" → template vs running instance; read-only layers vs one writable layer on top',
      '"I changed a file inside the container and it disappeared after a redeploy" → the writable layer belongs to that container only; change the image (Dockerfile) or use a volume',
      '"Is a container a lightweight VM?" → no, a process isolated by namespaces and limited by cgroups, sharing the host kernel (CS Core 9)',
      '"Which version is actually running in production?" → compare the image <b>digest</b>, not the tag; tags such as <code>latest</code> move',
      '"Disk is full on the Docker host" → <code>docker system df</code>, then prune stopped containers, dangling images and build cache',
      '"Can I use Podman instead of Docker?" → yes, same OCI images; note rootless, full image names, <code>:Z</code> labels and compose differences'
    ],
    code: [R`#!/usr/bin/env bash
# Lab: images vs containers in five minutes. Safe: everything is local and cleaned up at the end.
set -euo pipefail

docker pull nginx:1.27                      # download the image (read-only layers)
docker image inspect nginx:1.27 --format 'id={{.Id}} size={{.Size}} cmd={{json .Config.Cmd}}'

# Two containers from ONE image
docker run -d --name web1 -p 8081:80 nginx:1.27
docker run -d --name web2 -p 8082:80 nginx:1.27

# Change a file inside web1 only (this lands in web1's writable layer)
docker exec web1 sh -c 'echo "hello from web1" > /usr/share/nginx/html/index.html'
curl -s localhost:8081        # hello from web1
curl -s localhost:8082 | head -n 4   # the default nginx page: web2 is untouched

docker diff web1              # C /usr/share/nginx/html/index.html  (C = changed)

# Remove web1: its writable layer, and the edit, are gone for good
docker rm -f web1
docker run -d --name web1 -p 8081:80 nginx:1.27
curl -s localhost:8081 | head -n 4   # default page again

docker ps -a --filter name=web       # both containers, status Up
docker system df                     # space used by images, containers, volumes, build cache

docker rm -f web1 web2               # clean up`],
    codeTitle: ['Two containers, one image: prove the image never changes'],
    viz: [{
      title: 'Container lifecycle: one image, many writable layers',
      input: 'pull nginx:1.27; run web nginx:1.27; run web2 nginx:1.27; write web /usr/share/nginx/html/index.html; stop web; start web; rm web; run web nginx:1.27',
      inputLabel: 'commands separated by ; (pull IMG · run NAME IMG · write NAME FILE · stop NAME · start NAME · rm NAME · rmi IMG)',
      gen: function (input) {
        var cmds = String(input || '').split(';').map(function (s) { return s.trim(); }).filter(Boolean);
        if (!cmds.length) throw new Error('Type commands like: pull nginx:1.27; run web nginx:1.27; stop web');
        if (cmds.length > 16) throw new Error('Use at most 16 commands');
        var images = [], ctrs = {}, order = [], f = [];
        function rows() { return order.map(function (n) { var c = ctrs[n]; return [n, c.image, c.state, c.files.length ? c.files.join(', ') : '(empty)']; }); }
        function snap(narr, hlName, cls) {
          var hl = {}; order.forEach(function (n, i) { if (n === hlName) hl[i] = cls; });
          f.push({ narr: narr, parts: [
            { type: 'set', label: 'local images (read-only, shared)', items: images.length ? images.slice() : ['(none yet)'] },
            { type: 'table', label: 'containers', columns: ['name', 'image', 'state', 'writable layer'], rows: rows().length ? rows() : [['(none)', '', '', '']], hl: hl }
          ] });
        }
        snap('We start with an empty machine: no images, no containers.', null, '');
        cmds.forEach(function (line) {
          var w = line.split(/\s+/), op = w[0].toLowerCase(), c = ctrs[w[1]];
          if (op === 'pull') {
            if (!w[1]) throw new Error('pull needs an image, e.g. pull nginx:1.27');
            if (images.indexOf(w[1]) < 0) images.push(w[1]);
            snap('<code>docker pull ' + H.esc(w[1]) + '</code> downloads the image layers once. They are read-only and every container from this image will share them.', null, '');
          } else if (op === 'run') {
            if (!w[1] || !w[2]) throw new Error('run needs a name and an image, e.g. run web nginx:1.27');
            if (c) { snap('<code>docker run --name ' + H.esc(w[1]) + '</code> fails: <b>the name is already in use</b> by a container (even an exited one). Remove it first with <code>docker rm</code>.', w[1], 'bad'); return; }
            var pulled = images.indexOf(w[2]) < 0; if (pulled) images.push(w[2]);
            ctrs[w[1]] = { image: w[2], state: 'running', files: [] }; order.push(w[1]);
            snap('<code>docker run --name ' + H.esc(w[1]) + ' ' + H.esc(w[2]) + '</code>' + (pulled ? ' pulls the image first, then' : '') + ' creates a container: a fresh, <b>empty</b> writable layer on top of the shared image, and starts its main process.', w[1], 'ok');
          } else if (op === 'write') {
            if (!c) throw new Error('write needs an existing container name: ' + (w[1] || '?'));
            if (c.state !== 'running') { snap('You cannot <code>exec</code> into a stopped container. Start it first.', w[1], 'bad'); return; }
            var file = w[2] || '/tmp/file'; if (c.files.indexOf(file) < 0) c.files.push(file);
            snap('A write inside <b>' + H.esc(w[1]) + '</b> goes to <b>its</b> writable layer only (copy-up from the image). The image and the other containers do not see it.', w[1], 'cur');
          } else if (op === 'stop') {
            if (!c) throw new Error('stop needs an existing container name: ' + (w[1] || '?'));
            c.state = 'exited (0)';
            snap('<code>docker stop</code> sends SIGTERM, waits up to 10 s, then SIGKILL. The process is gone but the container <b>and its writable layer are kept</b>.', w[1], 'done');
          } else if (op === 'start') {
            if (!c) throw new Error('start needs an existing container name: ' + (w[1] || '?'));
            c.state = 'running';
            snap('<code>docker start</code> runs the same container again. Its writable layer is still there, so earlier edits survive a stop/start.', w[1], 'ok');
          } else if (op === 'rm') {
            if (!c) throw new Error('rm needs an existing container name: ' + (w[1] || '?'));
            var lost = c.files.length;
            delete ctrs[w[1]]; order.splice(order.indexOf(w[1]), 1);
            snap('<code>docker rm ' + H.esc(w[1]) + '</code> deletes the container <b>and its writable layer</b>' + (lost ? ': the ' + lost + ' edited file(s) are gone for good. Data that must survive belongs in a volume.' : '.') + ' The image stays.', null, '');
          } else if (op === 'rmi') {
            var users = order.filter(function (n) { return ctrs[n].image === w[1]; });
            if (users.length) { snap('<code>docker rmi ' + H.esc(w[1]) + '</code> is refused: container(s) ' + users.join(', ') + ' still use it.', users[0], 'bad'); return; }
            images = images.filter(function (x) { return x !== w[1]; });
            snap('<code>docker rmi</code> deletes the image now that no container needs it.', null, '');
          } else throw new Error('Unknown command "' + op + '" (use pull, run, write, stop, start, rm, rmi)');
        });
        snap('<b>Summary:</b> ' + images.length + ' image(s) shared by ' + order.length + ' container(s). Each container owns only its thin writable layer; the image never changed.', null, '');
        return f;
      }
    }, {
      title: 'What happens on docker run (who talks to whom)',
      gen: function () {
        var nodes = [box('cli', 'docker CLI', 8, 10, 16), box('d', 'dockerd (API)', 32, 10, 18), box('reg', 'registry', 32, 45, 16), box('ctd', 'containerd', 58, 10, 16), box('shim', 'shim', 58, 45, 12), box('runc', 'runc', 80, 45, 12), box('k', 'Linux kernel', 80, 10, 18)];
        var edges = [['cli', 'd', 'REST'], ['d', 'reg', 'pull'], ['d', 'ctd', 'gRPC'], ['ctd', 'shim'], ['shim', 'runc'], ['runc', 'k', 'clone()']];
        var steps = [
          ['cli', 'cli-d', 'You type <code>docker run -d nginx:1.27</code>. The CLI is only a client: it sends a REST call to the daemon over <code>/var/run/docker.sock</code>. (Whoever can write to that socket is effectively root on the host.)'],
          ['reg', 'd-reg', 'The daemon checks for the image locally. Missing, so it pulls the manifest and only the layers it does not already have from the registry.'],
          ['ctd', 'd-ctd', 'dockerd hands the job to <b>containerd</b>, the runtime that also powers Kubernetes nodes. It unpacks layers into a snapshot (overlayfs).'],
          ['shim', 'ctd-shim', 'A small <b>shim</b> process becomes the parent of the container, so containerd and dockerd can restart without killing your containers.'],
          ['runc', 'shim-runc', '<b>runc</b> reads the OCI spec (command, user, mounts, limits) and sets up the isolation.'],
          ['k', 'runc-k', 'The kernel creates namespaces and cgroups (details in CS Core 9) and starts nginx as <b>PID 1</b> of the new PID namespace. runc exits; nginx keeps running. Podman skips the daemon: the CLI itself calls the runtime (crun or runc).']
        ];
        return steps.map(function (s) { return { narr: s[2], parts: [{ type: 'graph', directed: true, height: 60, nodes: nodes, edges: edges, hl: one(s[0], 'cur'), ehl: one(s[1], 'ok') }] }; });
      }
    }],
    examples: [
      { title: 'Reading an image reference', html: `${H.table(['Reference', 'Registry', 'Repository', 'Tag / digest'], [
        ['<code>nginx</code>', 'docker.io (default)', 'library/nginx', ':latest (default)'],
        ['<code>python:3.12-slim</code>', 'docker.io', 'library/python', ':3.12-slim'],
        ['<code>ghcr.io/acme/api:1.4.2</code>', 'ghcr.io', 'acme/api', ':1.4.2'],
        ['<code>localhost:5000/api:dev</code>', 'localhost:5000 (your local registry)', 'api', ':dev'],
        ['<code>redis@sha256:&lt;64 hex&gt;</code>', 'docker.io', 'library/redis', 'an exact digest, never moves']
      ])}<p>If the first part has a dot or a colon (<code>ghcr.io</code>, <code>localhost:5000</code>), it is a registry host. Otherwise it is a Docker Hub namespace.</p>` },
      { title: 'Stopped is not deleted', html: `<p>A teammate says "I stopped the container, so the disk space is free". <code>docker ps -a</code> shows 40 exited containers, each with logs and a writable layer. <code>docker system df</code> reports them under <b>Containers</b> with "reclaimable" space. Fix: <code>docker container prune</code> (asks for confirmation), and use <code>docker run --rm</code> for one-off commands so they clean up after themselves.</p>` },
      { title: 'Docker Desktop vs Engine vs Podman: the same lab, three hosts', html: `${H.table(['Topic', 'Docker Desktop', 'Docker Engine (Linux/WSL)', 'Podman'], [
        ['Where containers run', 'inside a small Linux VM', 'directly on your Linux kernel', 'directly, as your user (rootless)'],
        ['Daemon', 'yes (in the VM)', 'yes, <code>dockerd</code> as root', 'none'],
        ['Reach the host from a container', '<code>host.docker.internal</code>', 'add <code>--add-host=host.docker.internal:host-gateway</code>', '<code>host.containers.internal</code>'],
        ['Ports below 1024', 'fine', 'fine (rootful)', 'needs a sysctl change when rootless'],
        ['Compose', '<code>docker compose</code>', '<code>docker compose</code> plugin', '<code>podman compose</code> / podman-compose']
      ])}` }
    ],
    deepDive: `<p>🟣 <b>What an image really is.</b> On disk and in a registry an image is three kinds of JSON and tar files: a <b>manifest</b> (list of layer digests plus a config digest), a <b>config</b> (the command, env, user, working dir, exposed ports and the build history), and the <b>layers</b> (compressed tar files of file changes). A <b>manifest list</b> (also called an OCI index) points to one manifest per platform, such as <code>linux/amd64</code> and <code>linux/arm64</code>. That is how <code>docker pull python:3.12</code> gets the right build for an Apple Silicon laptop and for an Intel server from the same tag.</p>
      <p>🟣 <b>IDs vs digests.</b> The image ID is the hash of the config; the repo digest is the hash of the manifest as stored in a registry. They differ, and a rebuild with identical files can still produce a new ID because timestamps in the config change. For deploys, record the <b>repo digest</b> (<code>docker inspect --format '{{index .RepoDigests 0}}'</code>).</p>
      <p>🟣 <b>Storage.</b> On Linux, Docker keeps images under <code>/var/lib/docker</code> and joins layers with the overlay2 driver (copy-up, whiteouts: see CS Core 9). Docker Desktop and newer Engine installs can use the containerd image store instead, which keeps multi-platform images locally. Rootless Podman stores everything under <code>~/.local/share/containers</code>, so each user has a separate image cache.</p>
      <p>🟣 <b>Production reality.</b> Treat containers as <b>cattle, not pets</b>: never fix things by hand with <code>docker exec</code> in production. Fix the Dockerfile, build a new image, roll it out. That gives you a reproducible, reviewed, scanned artifact and an easy rollback (redeploy the previous digest).</p>`,
    aiEra: `<p>🤖 <b>What AI changes.</b> Assistants can explain any <code>docker inspect</code> blob, write the run command for a given image and translate between Docker and Podman flags. Agentic tools often run commands in containers for you, which makes "what is running where" even more important to understand.</p>
      <p><b>Use AI as a partner:</b> paste <code>docker image inspect</code> output and ask what user, command, ports and env the image will run with, then check one claim yourself with <code>docker run --rm --entrypoint id IMAGE</code>.</p>
      <p><b>Where AI goes wrong:</b> it happily suggests <code>docker exec</code> plus <code>apt-get install</code> as a "fix" in a running container, or <code>docker commit</code> to save it. Both create undocumented images nobody can rebuild. It also assumes <code>:latest</code> is the newest release. <b>You still own:</b> pinning versions, knowing which digest is deployed, and keeping fixes in the Dockerfile.</p>`,
    problems: [P({
      t: 'The hotfix that vanished after a redeploy', l: 'Easy', tags: ['images', 'containers', 'writable layer'], co: ['Accenture', 'AWS Support', 'Infosys'],
      s: `<p>On Friday a teammate fixed a broken nginx setting by running <code>docker exec -it web vi /etc/nginx/conf.d/default.conf</code> and reloading nginx. On Monday a deploy recreated the container from the image and the bug is back. Explain what happened, then show the commands that find exactly what was changed by hand and turn it into a proper, repeatable fix.</p>`,
      ex: `<p>${H.c('r', 'docker diff web')} on the old container (if it still exists) would have shown <code>C /etc/nginx/conf.d/default.conf</code>. The edit lived in that container's <b>writable layer</b>. Recreating the container started a new, empty writable layer on top of the unchanged image, so the edit was lost.</p>`,
      bw: `<p>Edit the file again with <code>docker exec</code>, or freeze the container with <code>docker commit web web:fixed</code>. Both "work" until the next deploy or the next teammate, and neither leaves a reviewed, rebuildable record of what changed or why.</p>`,
      bc: `docker exec -it web vi /etc/nginx/conf.d/default.conf   # by hand, again
docker commit web web:fixed                               # a mystery image nobody can rebuild`,
      q: ['Where did Friday\'s edit live?', ['In the container\'s writable layer, deleted when the container was removed', 'In the image, which the deploy overwrote', 'In a volume that was not mounted', 'In the registry cache'], 0, 'Images are read-only. Writes inside a running container go to its own writable layer, which <code>docker rm</code> (or a recreate) throws away.'],
      h: ['<p>Hint 1: images never change after they are built; only a container has a writable layer.</p>', '<p>Hint 2: <code>docker diff</code> lists what a container changed, and <code>docker cp</code> copies a file out of it.</p>', '<p>Hint 3: recipe: copy the changed file out, put it in the repo next to the Dockerfile, add a <code>COPY</code> line, build a new tag, test it, deploy that tag.</p>'],
      a: `<p>The image is the source of truth; a container is disposable. To keep a change, it must be in the image (for code and config) or in a volume (for data). So: inspect the drift with <code>docker diff</code>, rescue the file with <code>docker cp</code>, commit it to Git, add it with <code>COPY</code>, build a <b>new tag</b>, prove it with a fresh container, and only then roll out. The old image stays available for rollback.</p>`,
      code: SH(R`#!/usr/bin/env bash
set -euo pipefail
# 1) What did the hand-edited container change? (A = added, C = changed, D = deleted)
docker diff web | grep -v '^C /var/cache' || true

# 2) Rescue the fixed file into the repo (works on running or stopped containers)
mkdir -p nginx
docker cp web:/etc/nginx/conf.d/default.conf nginx/default.conf
git diff --no-index <(docker run --rm nginx:1.27 cat /etc/nginx/conf.d/default.conf) nginx/default.conf || true

# 3) Bake it into the image (Dockerfile next to the nginx/ folder):
cat > Dockerfile <<'DOCKER'
FROM nginx:1.27
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
DOCKER

# 4) Build a new tag, test in a throwaway container, check the config is valid
docker build -t web:1.0.1 .
docker run --rm web:1.0.1 nginx -t
docker run -d --rm --name web-test -p 8089:80 web:1.0.1
curl -fsS localhost:8089 >/dev/null && echo "web:1.0.1 serves OK"
docker stop web-test

# 5) Commit the change so the next build includes it, then deploy web:1.0.1
git add Dockerfile nginx/default.conf
git commit -m "nginx: fix default.conf (was hand-edited in prod)"`),
      cx: `<p>Minutes of work, once. After that every rebuild and every new host gets the fix automatically, and rollback is "run the previous tag".</p>`,
      f: ['How would you stop people from editing production containers by hand? (read-only root filesystem, no shell in the image, audit <code>docker exec</code> events)', 'When is <code>docker commit</code> acceptable? (local debugging snapshots only)']
    })]
  });

  // ───────────────────────── Topic 2: writing Dockerfiles, PID 1, CMD vs ENTRYPOINT ─────────────────────────
  var PY_DOCKERFILE = R`# syntax=docker/dockerfile:1
# Python web API (Flask/FastAPI style) served by gunicorn on port 8000.
FROM python:3.12-slim

# Python behaves better in containers with these two: no .pyc files, unbuffered logs
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# 1) Dependencies first: this layer is reused until requirements.txt changes
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 2) A normal user with a fixed UID (never run the app as root)
RUN useradd --create-home --uid 10001 app

# 3) Code last: it changes most often, so only these layers rebuild on a code edit
COPY --chown=app:app src/ ./src/

USER 10001
EXPOSE 8000

# python:slim has no curl, so check health with Python itself
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/healthz', timeout=2)"

# Exec form: gunicorn is PID 1 and receives SIGTERM directly on docker stop
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "2", "src.app:app"]`;

  var NODE_DOCKERFILE = R`# syntax=docker/dockerfile:1
# Node.js API on port 3000. Two stages: build with dev dependencies, run with production ones only.
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci                                  # exact versions from the lockfile, dev deps included
COPY . .
RUN npm run build && npm prune --omit=dev   # compile (e.g. TypeScript), then drop dev deps

FROM node:22-slim
ENV NODE_ENV=production
WORKDIR /app
# The official image already has a non-root user called "node" (UID 1000)
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json ./
USER node
EXPOSE 3000
# Run node directly (not "npm start"): npm does not forward SIGTERM reliably
CMD ["node", "dist/server.js"]`;

  topics.push({
    title: 'Writing Dockerfiles: Instructions, PID 1, and Why Containers Exit',
    analogy: `<p>A Dockerfile is a <b>recipe card</b> for the frozen meal. Each line is one step: "start from this base dish", "add these ingredients", "cook like this". At the very bottom the card says how to <b>serve</b> it: the one command that runs when someone heats it up. A container lives exactly as long as that one served dish is on the table. If the command finishes in a second, the meal is over in a second, which is why "my container exits immediately" is almost always a recipe problem, not a Docker bug.</p>`,
    explain: `<p>🟢 <b>The instructions you will use 95% of the time.</b></p>
      ${H.table(['Instruction', 'What it does', 'Makes a layer?'], [
        ['<code>FROM python:3.12-slim</code>', 'the base image to start from (must be first, except <code>ARG</code>)', 'uses the base layers'],
        ['<code>WORKDIR /app</code>', 'cd into this folder (creates it) for all later steps and at run time', 'tiny'],
        ['<code>COPY src/ ./src/</code>', 'copy files from the <b>build context</b> (the folder you build from) into the image', 'yes'],
        ['<code>RUN pip install ...</code>', 'run a command <b>at build time</b> and save the resulting files', 'yes'],
        ['<code>ENV KEY=value</code>', 'environment variable at build and run time (visible in <code>docker inspect</code>: never secrets)', 'metadata'],
        ['<code>ARG VERSION=1.0</code>', 'a build-time variable (<code>--build-arg</code>); also recorded in history, so also never secrets', 'metadata'],
        ['<code>USER 10001</code>', 'which user later steps and the container run as', 'metadata'],
        ['<code>EXPOSE 8000</code>', 'documentation only: it does not publish the port (<code>-p</code> does)', 'metadata'],
        ['<code>ENTRYPOINT [...]</code> / <code>CMD [...]</code>', 'what runs when the container starts', 'metadata'],
        ['<code>HEALTHCHECK CMD ...</code>', 'a command Docker runs regularly to mark the container healthy or unhealthy', 'metadata']
      ])}
      <p>🟢 <b>The build context.</b> <code>docker build -t api:1.0 .</code> sends the folder <code>.</code> to the builder. <code>COPY</code> can only see files in it, and everything you do not exclude in <code>.dockerignore</code> is sent (your <code>.git</code>, <code>node_modules</code>, and that <code>.env</code> file too).</p>
      <p>🔵 <b>Shell form vs exec form.</b> <code>CMD python app.py</code> (shell form) really runs <code>/bin/sh -c "python app.py"</code>, so <b>sh is PID 1</b> and Python is its child. <code>CMD ["python", "app.py"]</code> (exec form, a JSON array with double quotes) runs Python directly as <b>PID 1</b>. This matters because <code>docker stop</code> sends SIGTERM to PID 1 only, and many shells do not pass it on. The result: Docker waits 10 seconds, sends SIGKILL, and your app never got to finish requests or close database connections (exit code <b>137</b>).</p>
      <p>🔵 <b>CMD vs ENTRYPOINT.</b> ENTRYPOINT is the fixed program; CMD is the default arguments, which <code>docker run IMAGE args</code> replaces.</p>
      ${H.table(['Dockerfile', 'docker run img', 'docker run img --port 9000'], [
        ['<code>CMD ["python","app.py"]</code>', 'python app.py', '<span class="c-r">--port 9000</span> (CMD replaced: "executable not found")'],
        ['<code>ENTRYPOINT ["python","app.py"]</code>', 'python app.py', 'python app.py --port 9000'],
        ['<code>ENTRYPOINT ["python","app.py"]</code> + <code>CMD ["--port","8000"]</code>', 'python app.py --port 8000', 'python app.py --port 9000'],
        ['<code>ENTRYPOINT ["/entrypoint.sh"]</code> + <code>CMD ["gunicorn","app:app"]</code>', 'script runs, then <code>exec "$@"</code> starts gunicorn as PID 1', 'script runs, then your command']
      ])}
      <p>🔵 <b>Why a container exits immediately.</b> The container stops when PID 1 exits. Common causes: (1) the command <b>daemonizes</b> (goes to the background), like <code>service nginx start</code>, so PID 1 returns and the container ends with exit 0; (2) the app crashes at start (missing env var, wrong path): <code>docker logs</code> shows why; (3) the command is a one-shot task that simply finished; (4) <code>CMD</code> was overridden by run arguments. Run servers in the <b>foreground</b>: <code>nginx -g "daemon off;"</code>, <code>gunicorn</code>, <code>node server.js</code>.</p>
      <p>🔵 <b>Zombies and <code>--init</code>.</b> PID 1 has one more job on Linux: <b>reaping</b> finished child processes. A normal app does not do that, so if it spawns children (shell scripts, headless browsers, <code>git</code> calls) their dead entries pile up as <b>zombies</b> (<code>&lt;defunct&gt;</code> in <code>ps</code>) until the PID limit is hit. <code>docker run --init</code> (or <code>init: true</code> in compose, or <code>tini</code> as ENTRYPOINT) puts a tiny init process at PID 1 that forwards signals and reaps zombies.</p>`,
    clues: [
      '"My container exits immediately with code 0" → PID 1 finished or daemonized; run the server in the foreground',
      '"docker stop takes 10 seconds and exits with 137" → shell form CMD or a wrapper script without <code>exec</code>: SIGTERM never reached the app',
      '"Difference between CMD and ENTRYPOINT" → ENTRYPOINT = fixed program, CMD = default args you can override',
      '"ps shows many &lt;defunct&gt; processes in the container" → nobody reaps children at PID 1: use <code>--init</code> / tini',
      '"EXPOSE did not open the port" → EXPOSE is documentation; publish with <code>-p host:container</code>',
      '"COPY failed: file not found in build context" → wrong build folder, or the file is excluded by .dockerignore'
    ],
    code: [DF(PY_DOCKERFILE, 'Dockerfile: Python API (gunicorn)'), DF(NODE_DOCKERFILE, 'Dockerfile: Node.js API (two stages)'), SH(R`#!/bin/sh
# entrypoint.sh: one-time setup, then hand PID 1 to the real program.
# Dockerfile: COPY entrypoint.sh /entrypoint.sh
#             ENTRYPOINT ["/entrypoint.sh"]
#             CMD ["gunicorn", "--bind", "0.0.0.0:8000", "src.app:app"]
set -eu

# Fail fast with a clear message if required config is missing (value comes from the runtime env)
: "$DATABASE_URL"

echo "entrypoint: running migrations" >&2
python -m src.migrate

# exec REPLACES this shell with the CMD, so the app becomes PID 1 and gets SIGTERM directly
exec "$@"`, 'entrypoint.sh: setup, then exec "$@"'), SH(R`#!/usr/bin/env bash
# Lab: see shell form vs exec form with your own eyes
set -euo pipefail
mkdir -p pid1-lab && cd pid1-lab

printf 'FROM python:3.12-slim\nCMD python -c "import time; time.sleep(600)"\n' > Dockerfile.shell
printf 'FROM python:3.12-slim\nCMD ["python", "-c", "import time; time.sleep(600)"]\n' > Dockerfile.exec
docker build -q -t pid1:shell -f Dockerfile.shell .
docker build -q -t pid1:exec -f Dockerfile.exec .

for t in shell exec; do
  docker run -d --name "p-$t" "pid1:$t" >/dev/null
  docker exec "p-$t" sh -c 'cat /proc/1/cmdline | tr "\0" " "; echo'   # what is PID 1?
  time docker stop "p-$t"                                              # shell: about 10 s, exec: under 1 s
  docker inspect -f "$t exit={{.State.ExitCode}}" "p-$t"               # shell: 137, exec: 0 or 143
  docker rm "p-$t" >/dev/null
done
# Note: python:3.12-slim uses dash as /bin/sh; some shells exec the last command themselves,
# so results can differ by base image. Exec form is predictable everywhere.`, 'Lab: measure docker stop with shell vs exec form')],
    codeTitle: ['Python Dockerfile', 'Node Dockerfile', 'Entrypoint wrapper', 'PID 1 lab'],
    viz: [{
      title: 'Who is PID 1, and who gets SIGTERM?',
      input: 'CMD python app.py',
      inputLabel: 'a start line: CMD python app.py · CMD ["python","app.py"] · --init CMD python app.py · ENTRYPOINT ["./start.sh"]',
      gen: function (input) {
        var s = String(input || '').trim(), init = false;
        if (/^--init\s+/.test(s)) { init = true; s = s.replace(/^--init\s+/, ''); }
        var m = s.match(/^(CMD|ENTRYPOINT)\s+(.+)$/i);
        if (!m) throw new Error('Start with CMD or ENTRYPOINT, e.g. CMD ["python","app.py"] (prefix --init to add tini)');
        var body = m[2].trim(), exec = body.charAt(0) === '[', words;
        if (exec) { try { words = JSON.parse(body); } catch (e) { throw new Error('Exec form must be a JSON array with double quotes: ["python","app.py"]'); } }
        else words = body.split(/\s+/);
        if (!Array.isArray(words) || !words.length) throw new Error('Give a command to run');
        var cmd = words.join(' '), script = /\.sh$/.test(words[0]);
        var procs = [];
        if (init) procs.push(['1', 'docker-init (tini)', 'forwards signals, reaps zombies']);
        if (!exec) procs.push([String(procs.length + 1), '/bin/sh -c "' + cmd + '"', 'a shell that may ignore SIGTERM']);
        else if (script) procs.push([String(procs.length + 1), words[0] + ' (a shell script)', 'gets SIGTERM; passes it on only if it ends with exec']);
        procs.push([String(procs.length + 1), (script ? 'your app (started by the script)' : cmd), 'the real application']);
        var f = [];
        f.push({ narr: 'Docker reads <code>' + H.esc(m[1].toUpperCase() + ' ' + body) + '</code>. ' + (exec ? '<b>Exec form</b> (JSON array): the program is started directly, with no shell in between.' : '<b>Shell form</b> (plain text): Docker wraps it as <code>/bin/sh -c "..."</code>, so the shell starts first.') + (init ? ' <code>--init</code> adds tini in front.' : ''), parts: [{ type: 'table', label: 'process tree inside the container (PID 1 at the top)', columns: ['PID', 'process', 'note'], rows: procs.slice(0, 1), hl: { 0: 'cur' } }] });
        f.push({ narr: 'The full process tree. Only <b>PID 1</b> is special: the kernel will not apply default signal actions to it, so if PID 1 has no SIGTERM handler, SIGTERM is simply ignored.', parts: [{ type: 'table', label: 'process tree', columns: ['PID', 'process', 'note'], rows: procs, hl: { 0: 'sel' } }] });
        var good = init || (exec && !script);
        f.push({ narr: '<code>docker stop</code> sends <b>SIGTERM to PID 1 only</b> (' + H.esc(procs[0][1]) + ').', parts: [{ type: 'table', label: 'process tree', columns: ['PID', 'process', 'SIGTERM?'], rows: procs.map(function (p, i) { return [p[0], p[1], i === 0 ? 'received' : (good && i === procs.length - 1 ? 'forwarded' : '?')]; }), hl: { 0: 'cur' } }] });
        if (good) f.push({ narr: H.c('g', 'Graceful stop.') + ' ' + (init ? 'tini forwards SIGTERM to the app' : 'The app itself is PID 1') + ', it finishes in-flight requests and exits in well under 10 s with code 0 or 143.', parts: [{ type: 'vars', label: 'docker stop result', vals: { 'time': '< 1 s', 'exit code': '0 or 143', 'zombies reaped': init ? 'yes (tini)' : 'only if the app reaps children' }, hl: { 'exit code': 'ok' } }] });
        else f.push({ narr: H.c('r', 'Ungraceful stop.') + ' ' + (script ? 'The script got SIGTERM but did not pass it on (no <code>exec "$@"</code>).' : 'The shell is PID 1 and does not pass SIGTERM to its child.') + ' Docker waits the 10 s grace period, then sends SIGKILL to everything: exit <b>137</b>, open requests are cut off.', parts: [{ type: 'vars', label: 'docker stop result', vals: { 'time': '10 s', 'exit code': '137 (SIGKILL)', 'fix': script ? 'end the script with exec "$@"' : 'use exec form or --init' }, hl: { 'exit code': 'bad' } }] });
        f.push({ narr: 'Rule of thumb: <b>exec form</b> for CMD/ENTRYPOINT, <code>exec "$@"</code> at the end of wrapper scripts, and <code>--init</code> (or <code>init: true</code> in compose) when the app starts child processes.', parts: [{ type: 'text', label: 'checklist', html: '<ul><li>CMD ["app", "arg"] (JSON, double quotes)</li><li>wrapper script ends with exec "$@"</li><li>children spawned? add --init</li><li>app handles SIGTERM: stop accepting, drain, exit</li></ul>' }] });
        return f;
      }
    }, {
      title: 'Building the Python Dockerfile line by line',
      gen: function () {
        var lines = ['FROM python:3.12-slim', 'ENV PYTHONUNBUFFERED=1', 'WORKDIR /app', 'COPY requirements.txt .', 'RUN pip install --no-cache-dir -r requirements.txt', 'RUN useradd --create-home --uid 10001 app', 'COPY --chown=app:app src/ ./src/', 'USER 10001', 'EXPOSE 8000', 'CMD ["gunicorn", "--bind", "0.0.0.0:8000", "src.app:app"]'];
        var notes = [
          ['base layers from Docker Hub (Debian slim + Python)', { base: 'python:3.12-slim', layers: 1 }],
          ['config only: stored in the image config, no files', { env: 'PYTHONUNBUFFERED=1' }],
          ['creates /app and sets the working directory', { workdir: '/app' }],
          ['new layer: just one small file', { layers: 2 }],
          ['new layer: all installed packages (the big one)', { layers: 3 }],
          ['new layer: /etc/passwd entry and home folder', { layers: 4 }],
          ['new layer: your code, owned by app', { layers: 5 }],
          ['config: the container will run as UID 10001', { user: '10001' }],
          ['config: documents the port; publishing needs -p', { expose: '8000/tcp' }],
          ['config: the default command, exec form so gunicorn is PID 1', { cmd: 'gunicorn ...' }]
        ];
        var state = { base: '-', layers: 0, workdir: '/', user: 'root (0)', env: '-', expose: '-', cmd: '-' };
        var code = lines.join('\n');
        return lines.map(function (ln, i) {
          var ch = notes[i][1], hl = {};
          Object.keys(ch).forEach(function (k) { state[k] = ch[k]; hl[k] = 'ok'; });
          var cp = {}; Object.keys(state).forEach(function (k) { cp[k] = state[k]; });
          var h = {}; h[i + 1] = 'cur';
          return { narr: '<code>' + H.esc(ln) + '</code>: ' + notes[i][0] + '.', parts: [{ type: 'code', label: 'Dockerfile', lang: 'text', code: code, hl: h }, { type: 'vars', label: 'image so far', vals: cp, hl: hl }] };
        });
      }
    }],
    examples: [
      { title: 'Exits immediately: the daemon trap', html: `<p><code>CMD service nginx start</code> starts nginx in the background and returns. PID 1 (the shell) is done, so the container exits with code 0 a second later. <code>docker ps -a</code> shows <code>Exited (0) 1 second ago</code> and <code>docker logs</code> shows only "Starting nginx". Fix: <code>CMD ["nginx", "-g", "daemon off;"]</code> keeps nginx in the foreground as PID 1, which is exactly what the official <code>nginx</code> image does.</p>` },
      { title: 'Overriding the command for one run', html: `${H.table(['Goal', 'Command'], [
        ['open a shell in an image that has an ENTRYPOINT', '<code>docker run --rm -it --entrypoint sh api:1.0</code>'],
        ['run a one-off task with the same image', '<code>docker run --rm api:1.0 python -m src.migrate</code> (replaces CMD)'],
        ['see the configured command', "<code>docker inspect -f '{{json .Config.Entrypoint}} {{json .Config.Cmd}}' api:1.0</code>"]
      ])}<p>Distroless images have no shell, so <code>--entrypoint sh</code> fails there; use a <code>:debug</code> variant or <code>docker debug</code> (topic 8).</p>` },
      { title: 'Zombie pile-up in a scraper', html: `<p>A Node scraper launches headless Chrome for every page. After a day, <code>docker exec scraper ps -eo pid,stat,comm | grep -c Z</code> prints 3000 and new pages fail with "fork: Resource temporarily unavailable" (the cgroup PID limit). Node is PID 1 and never calls <code>wait()</code> for grandchildren whose parents died. Fix: <code>docker run --init</code> or compose <code>init: true</code>; the count stays near zero.</p>` },
      { title: 'One process per container (mostly)', html: `<p>Do not cram nginx, the app and cron into one container with a process manager. Each concern gets its own container from its own image, so each can be scaled, restarted, logged and updated separately. Exceptions exist (a tiny sidecar-free appliance), but then use a real init such as tini or s6, not a shell loop.</p>` }
    ],
    deepDive: `<p>🟣 <b>Signals and PID 1 in detail.</b> In a new PID namespace the first process is PID 1, and the kernel protects it: signals with the default action (SIGTERM, SIGINT) are dropped unless PID 1 installed a handler. SIGKILL from outside the namespace still works, which is what Docker sends after the grace period (<code>--stop-timeout</code>, or <code>stop_grace_period</code> in compose). You can change the stop signal with <code>STOPSIGNAL SIGQUIT</code> (nginx uses this for a graceful shutdown).</p>
      <p>🟣 <b>Exec form has no shell.</b> So <code>CMD ["echo", "$HOME"]</code> prints the literal text <code>$HOME</code>. If you need variable expansion, either use a wrapper script that ends with <code>exec</code>, or <code>CMD ["sh", "-c", "exec gunicorn --bind 0.0.0.0:$PORT app:app"]</code>, where the inner <code>exec</code> keeps the app as PID 1.</p>
      <p>🟣 <b>Build-time vs run-time.</b> <code>RUN</code> happens once, on the build machine; <code>CMD</code> happens every time a container starts, on the server. Migrations, waiting for a database and reading secrets belong at run time (entrypoint or orchestrator job), never in <code>RUN</code>. Also, <code>RUN</code> has no network access to your compose services, because they do not exist during the build.</p>
      <p>🟣 <b>Heredocs and the syntax line.</b> <code># syntax=docker/dockerfile:1</code> asks BuildKit for the latest stable Dockerfile frontend, which enables <code>RUN --mount</code> (cache and secret mounts) and heredocs (<code>RUN &lt;&lt;EOF ... EOF</code>) for multi-line scripts without long <code>&amp;&amp; \\</code> chains. <code>docker build --check .</code> runs the built-in lint rules (for example, warning about JSON args written in shell form).</p>`,
    aiEra: `<p>🤖 <b>What AI changes.</b> "Write me a Dockerfile for this repo" is one prompt now, and IDE assistants and <code>docker init</code> generate decent starting points with a .dockerignore and compose file. That moves your job from typing to <b>reviewing</b>.</p>
      <p><b>Use AI as a partner:</b> ask it to explain every line of a generated Dockerfile and to list which lines run at build time vs run time. Ask "what is PID 1 here, and what happens on docker stop?" If it cannot answer clearly, neither will the on-call engineer at 3 a.m.</p>
      <p><b>Where AI goes wrong:</b> shell-form CMD, <code>npm start</code> as PID 1, running as root, <code>COPY . .</code> before installing dependencies, <code>apt-get</code> without cleaning lists, and <code>ENV</code> lines with example tokens that become real tokens later. <b>You still own:</b> testing <code>docker stop</code> timing, checking <code>docker exec CONTAINER id</code>, and reading the final image config with <code>docker inspect</code>.</p>`,
    problems: [P({
      t: 'Fix the container that exits at once and the one that will not stop', l: 'Medium', tags: ['dockerfile', 'pid 1', 'signals', 'cmd vs entrypoint'], co: ['Amazon', 'Thoughtworks', 'Red Hat'],
      s: `<p>Two images from your team misbehave:</p><p><b>A (web)</b> exits a second after start with <code>Exited (0)</code>:</p><pre>FROM ubuntu:24.04
RUN apt-get update &amp;&amp; apt-get install -y nginx
COPY site/ /var/www/html/
CMD service nginx start</pre><p><b>B (worker)</b> runs fine, but every <code>docker stop</code> takes 10 seconds and ends with exit code 137, and jobs are cut in half:</p><pre>FROM python:3.12-slim
WORKDIR /app
COPY . .
RUN pip install -r requirements.txt
ENTRYPOINT ./start.sh</pre><p><code>start.sh</code> waits for the queue, then runs <code>python worker.py</code>. Rewrite both so A stays up and B stops gracefully. Explain each fix.</p>`,
      ex: `<p>A: PID 1 is <code>/bin/sh -c "service nginx start"</code>. The service script forks nginx into the background and returns ${H.c('r', '→ PID 1 exits → container exits 0')}. B: PID 1 is <code>/bin/sh -c ./start.sh</code>; SIGTERM stops at the shell, so Python never hears it ${H.c('r', '→ SIGKILL after 10 s → 137')}.</p>`,
      bw: `<p>Keeping A alive with <code>CMD service nginx start &amp;&amp; tail -f /dev/null</code>. The container now "runs", but PID 1 is <code>tail</code>: if nginx crashes the container still looks healthy, logs go nowhere useful, and <code>docker stop</code> still takes 10 seconds. For B, raising the stop timeout to 60 s just makes the hard kill later.</p>`,
      bc: DF(`FROM ubuntu:24.04
RUN apt-get update && apt-get install -y nginx
CMD service nginx start && tail -f /dev/null   # alive, but PID 1 is tail`),
      q: ['What is the root cause shared by both images?', ['PID 1 is not the real application process', 'The base images are too big', 'They do not EXPOSE a port', 'They are missing a HEALTHCHECK'], 0, 'In A, PID 1 exits after starting a background daemon; in B, PID 1 is a shell that swallows SIGTERM. Both are fixed by making the app itself (or a real init) PID 1.'],
      h: ['<p>Hint 1: a container lives as long as PID 1, and <code>docker stop</code> signals only PID 1.</p>', '<p>Hint 2: run servers in the foreground; use exec form (JSON array) for ENTRYPOINT and CMD.</p>', '<p>Hint 3: a wrapper script must end with <code>exec "$@"</code> so the app replaces the shell; add <code>--init</code> if the worker spawns children.</p>'],
      a: `<p><b>A:</b> start from the official <code>nginx</code> image, which already runs <code>nginx -g "daemon off;"</code> in exec form and logs to stdout. If you must stay on Ubuntu, write that CMD yourself. <b>B:</b> make the entrypoint exec form, end <code>start.sh</code> with <code>exec "$@"</code>, and pass the worker as CMD, so after the setup the shell is replaced and Python is PID 1. The worker must handle SIGTERM (finish the current job, then exit). Also reorder B so dependencies install before the code is copied, and run as a non-root user.</p>`,
      code: DF(R`# ---------- A: web ----------
FROM nginx:1.27
COPY site/ /usr/share/nginx/html/
# Inherited from the base image: CMD ["nginx", "-g", "daemon off;"] and STOPSIGNAL SIGQUIT
# (On a plain Ubuntu base you would write that CMD yourself, in exec form.)

# ---------- B: worker (separate Dockerfile) ----------
# FROM python:3.12-slim
# WORKDIR /app
# COPY requirements.txt .
# RUN pip install --no-cache-dir -r requirements.txt
# RUN useradd --create-home --uid 10001 app
# COPY --chown=app:app . .
# USER 10001
# ENTRYPOINT ["./start.sh"]          # exec form: no extra shell in front
# CMD ["python", "worker.py"]        # start.sh ends with: exec "$@"`, 'Dockerfiles for A and B'),
      alt: [SH(R`#!/bin/sh
# start.sh for image B
set -eu
echo "waiting for the queue at $QUEUE_HOST:5672" >&2
i=0
until python -c "import socket,os; socket.create_connection((os.environ['QUEUE_HOST'], 5672), 2)"; do
  i=$((i + 1))
  [ "$i" -ge 30 ] && { echo "queue not reachable after 30 tries" >&2; exit 1; }
  sleep 2
done
# Replace this shell with the CMD (python worker.py): it becomes PID 1 and receives SIGTERM
exec "$@"`, 'start.sh'), SH(R`#!/usr/bin/env bash
# Verify both fixes
set -euo pipefail
docker build -t web:fixed -f Dockerfile.web .
docker run -d --name web -p 8080:80 web:fixed
sleep 2; docker ps --filter name=web --format '{{.Names}} {{.Status}}'   # Up, not Exited
docker build -t worker:fixed -f Dockerfile.worker .
docker run -d --name worker --init -e QUEUE_HOST=queue.example.internal worker:fixed
docker exec worker cat /proc/1/cmdline | tr '\0' ' '; echo   # docker-init then python worker.py
time docker stop worker                                       # well under 10 s
docker inspect -f '{{.State.ExitCode}}' worker                 # 0 or 143, not 137
docker rm -f web worker`, 'verify')],
      cx: `<p>No extra runtime cost: removing the shell even saves a process. Stop time drops from 10 s to the time the app needs to drain.</p>`,
      f: ['How would you make the worker finish the current job before exiting on SIGTERM?', 'When would you set <code>STOPSIGNAL</code> or <code>stop_grace_period</code>?']
    })]
  });

  // ───────────────────────── Topic 3: layers and build cache ─────────────────────────
  var BAD_STEPS = ['FROM python:3.12-slim', 'WORKDIR /app', 'COPY . .', 'RUN pip install -r requirements.txt', 'CMD python src/app.py'];
  var GOOD_STEPS = ['FROM python:3.12-slim', 'WORKDIR /app', 'COPY requirements.txt .', 'RUN pip install -r requirements.txt', 'COPY src/ ./src/', 'CMD python src/app.py'];
  var STEP_SECS = function (st) { return /pip install|npm ci|go mod download|apt-get/.test(st) ? 95 : 1; };

  topics.push({
    title: 'Layers and the Build Cache: Stop Reinstalling Dependencies on Every Edit',
    analogy: `<p>Think of a stack of <b>pancakes</b>, each one cooked on top of the one below. If you change the third pancake, every pancake above it has to be cooked again, because each one was cooked on the one under it. The ones below can stay. Docker's build cache works the same way: each instruction makes a layer on top of the previous one. Put the pancakes that rarely change (the base, your dependencies) at the <b>bottom</b>, and the one that changes every five minutes (your code) at the <b>top</b>.</p>`,
    explain: `<p>🟢 <b>One instruction, one layer (roughly).</b> <code>RUN</code>, <code>COPY</code> and <code>ADD</code> each save a layer of file changes. <code>ENV</code>, <code>CMD</code>, <code>USER</code> and friends only change the image config. Layers are stacked, and an image is the sum of all of them.</p>
      <p>🟢 <b>How the cache decides.</b> For each step, BuildKit asks: "have I built <b>exactly this step</b> on top of <b>exactly this parent</b> before?"</p>
      ${H.table(['Instruction', 'Cache hit when...', 'Surprise'], [
        ['<code>RUN cmd</code>', 'the command text is the same and the parent layer is the same', '<code>RUN apt-get update</code> is cached forever, even when the package lists are a month old'],
        ['<code>COPY / ADD</code>', 'the <b>checksums of the copied files</b> are the same (timestamps do not matter)', '<code>COPY . .</code> changes if <b>any</b> file in the context changes, even README.md'],
        ['any step after a miss', 'never: the parent changed, so the key changed', 'one early miss rebuilds everything below it']
      ])}
      <p>🔵 <b>The classic slow build.</b> With <code>COPY . .</code> before <code>RUN pip install</code>, a one-line code change invalidates the COPY layer, so pip reinstalls every package: 2 minutes per build instead of 3 seconds. The fix is order: copy only the dependency manifest (<code>requirements.txt</code>, <code>package.json</code> + lockfile, <code>go.mod</code> + <code>go.sum</code>, <code>pom.xml</code>), install, and <b>then</b> copy the source.</p>
      ${H.table(['Ecosystem', 'Copy first', 'Then install', 'Then copy'], [
        ['Python', '<code>requirements.txt</code> (or <code>pyproject.toml</code> + lock)', '<code>pip install --no-cache-dir -r requirements.txt</code>', '<code>src/</code>'],
        ['Node', '<code>package.json package-lock.json</code>', '<code>npm ci</code>', 'everything else'],
        ['Go', '<code>go.mod go.sum</code>', '<code>go mod download</code>', 'source, then <code>go build</code>'],
        ['Java (Maven)', '<code>pom.xml</code>', '<code>mvn dependency:go-offline</code>', '<code>src/</code>, then <code>mvn package</code>']
      ])}
      <p>🔵 <b>.dockerignore.</b> A file next to the Dockerfile listing what <b>not</b> to send in the build context, with the same idea as <code>.gitignore</code>. Exclude <code>.git</code>, <code>node_modules</code>, virtualenvs, build output, logs, test data and every <code>.env</code> file. Smaller context = faster builds, fewer cache misses (a changing <code>.git</code> folder busts <code>COPY . .</code>), and no secrets sneaking into images.</p>
      <p>🔵 <b>Deleting later does not shrink.</b> Layers only add. If one <code>RUN</code> downloads a 500 MB archive and the next <code>RUN</code> deletes it, the image still carries 500 MB (CS Core 9 shows the whiteout mechanics). Download, use and delete in the <b>same</b> <code>RUN</code>, or do the work in a separate build stage (topic 4).</p>
      <p>🔵 <b>Look at the layers.</b> <code>docker history IMAGE</code> lists layers with sizes and the instruction that made them. The free tool <code>dive</code> lets you browse each layer's files and points out wasted space.</p>`,
    clues: [
      '"Every code change reinstalls all dependencies" → COPY the dependency manifest, install, then COPY the source',
      '"Builds are slow in CI but fast locally" → no cache on fresh runners: use cache export (<code>--cache-to/--cache-from</code>, registry or GitHub Actions cache)',
      '"I deleted the file but the image did not get smaller" → it is still in a lower layer; delete in the same RUN or use multi-stage',
      '"apt-get install fails with 404" → a stale cached <code>apt-get update</code> layer; always combine <code>update &amp;&amp; install</code> in one RUN',
      '"Build context is 2 GB" / "Sending build context takes ages" → add a .dockerignore',
      '"Which steps rebuild if I change X?" → find the first COPY/ADD whose files include X; it and everything after it rebuild'
    ],
    code: [DF(R`# syntax=docker/dockerfile:1
FROM python:3.12-slim
WORKDIR /app

# System packages: update + install + clean in ONE layer, so the list is never stale
# and the apt cache is not stored in the image
RUN apt-get update \
 && apt-get install -y --no-install-recommends libpq5 \
 && rm -rf /var/lib/apt/lists/*

# Dependency manifest first, then install: cached until requirements.txt changes.
# The cache mount keeps pip's download cache between builds WITHOUT putting it in a layer.
COPY requirements.txt .
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements.txt

# Source last: a code edit only rebuilds from here down
COPY src/ ./src/
CMD ["python", "-m", "src.app"]`, 'Dockerfile with cache-friendly order and a cache mount'), { lang: 'text', check: false, title: '.dockerignore', code: R`# Version control and editor junk
.git
.gitignore
.vscode/
.idea/

# Dependencies and build output are rebuilt INSIDE the image
node_modules/
.venv/
__pycache__/
*.pyc
dist/
build/
target/

# Secrets and local config: never in the build context
.env
.env.*
*.pem
*.key
secrets/

# Big stuff the image does not need
*.log
data/
tests/fixtures/large/
docs/

# Keep the Dockerfile itself out of COPY . . (harmless, avoids busting the cache when it changes)
Dockerfile
compose*.yaml` }, SH(R`#!/usr/bin/env bash
# Lab: watch the cache work
set -euo pipefail
docker build -t cache-lab:1 .                    # first build: everything runs
echo "# tiny edit" >> src/app.py
docker build --progress=plain -t cache-lab:2 . 2>&1 | grep -E 'CACHED|RUN|COPY'
# Expect: CACHED for WORKDIR, apt-get, COPY requirements.txt, pip install; COPY src/ runs again
docker history --format 'table {{.Size}}\t{{.CreatedBy}}' cache-lab:2 | head -n 8
docker builder du | tail -n 3                    # how much build cache you are keeping
# Clean up the build cache when disk is tight (asks for confirmation):
# docker builder prune`, 'Lab: see CACHED vs rebuilt steps')],
    codeTitle: ['Cache-friendly Python Dockerfile', '.dockerignore', 'Cache lab'],
    viz: [{
      title: 'Which steps rebuild? Bad order vs good order',
      input: 'src/app.py',
      inputLabel: 'changed files, comma separated (try src/app.py, requirements.txt, README.md)',
      gen: function (input) {
        var changed = String(input || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
        if (changed.length > 6) throw new Error('List at most 6 changed files');
        changed.forEach(function (c) { if (!/^[\w./*-]+$/.test(c)) throw new Error('Use plain file paths like src/app.py'); });
        var f = [];
        function run(steps, label) {
          var st = stepStatus(steps, changed), secs = 0;
          var rows = steps.map(function (s) { return [s, '', '']; });
          steps.forEach(function (s, i) {
            rows[i][1] = st[i].s; var t = st[i].s === 'REBUILD' ? STEP_SECS(s) : 0; secs += t; rows[i][2] = st[i].s === 'REBUILD' ? t + ' s' : '0 s';
            var hl = {}; for (var k = 0; k <= i; k++) hl[k] = rows[k][1] === 'REBUILD' ? 'bad' : 'ok'; hl[i] = st[i].s === 'REBUILD' ? 'bad' : 'cur';
            f.push({ narr: '<b>' + label + '</b>, step ' + (i + 1) + ': <code>' + H.esc(s) + '</code> → ' + (st[i].s === 'REBUILD' ? H.c('r', 'REBUILD') : H.c('g', 'CACHED')) + ' because ' + st[i].why + '.', parts: [{ type: 'table', label: label + ' (changed: ' + (changed.join(', ') || 'nothing') + ')', columns: ['instruction', 'cache', 'time'], rows: rows.map(function (r, k) { return k <= i ? r.slice() : [r[0], '', '']; }), hl: hl }] });
          });
          return secs;
        }
        var bad = run(BAD_STEPS, 'Bad order');
        var good = run(GOOD_STEPS, 'Good order');
        f.push({ narr: 'Result for this change: bad order ≈ <b>' + bad + ' s</b>, good order ≈ <b>' + good + ' s</b>. The dependency install only reruns when the dependency manifest changes.' + (changed.length ? '' : ' (Nothing changed, so everything is cached in both.)'), parts: [{ type: 'bars', label: 'rebuild time in seconds', values: [bad, good], idxLabels: ['bad order', 'good order'], texts: [bad + ' s', good + ' s'], hl: { 0: 'bad', 1: 'ok' } }] });
        return f;
      }
    }],
    examples: [
      { title: 'The 6-minute README typo', html: `<p>A CI pipeline rebuilt a Node image for a README fix and spent 6 minutes in <code>npm install</code>. The Dockerfile had <code>COPY . .</code> then <code>RUN npm install</code>. After reordering to <code>COPY package.json package-lock.json ./</code> → <code>RUN npm ci</code> → <code>COPY . .</code>, and adding <code>README.md</code> and <code>docs/</code> to <code>.dockerignore</code>, the same change builds in 9 seconds.</p>` },
      { title: 'apt-get: why update and install go together', html: `${H.table(['Dockerfile', 'What goes wrong'], [
        ['<code>RUN apt-get update</code><br><code>RUN apt-get install -y curl</code>', 'the update layer is cached for months; adding a package later reuses old lists → 404 errors or old versions'],
        ['<code>RUN apt-get update &amp;&amp; apt-get install -y --no-install-recommends curl &amp;&amp; rm -rf /var/lib/apt/lists/*</code>', 'one layer: fresh lists every time the line changes, no recommended extras, list files not kept']
      ])}` },
      { title: 'Reading docker history', html: `<pre>SIZE      CREATED BY
12.3kB    COPY src/ ./src/
4.1kB     RUN useradd --create-home --uid 10001 app
182MB     RUN pip install --no-cache-dir -r requirements.txt
1.2kB     COPY requirements.txt .
0B        WORKDIR /app
...       (base image layers)</pre><p>The 182 MB pip layer is the place to look: maybe a heavy library is only needed for tests, or a build-only compiler got installed. Small layers at the top are what change on each deploy, and that is exactly what you want: a deploy pulls only kilobytes.</p>` },
      { title: 'CI with a remote cache', html: `<p>Fresh CI runners have no local cache. BuildKit can export and import it: <code>docker buildx build --cache-from type=registry,ref=localhost:5000/api:buildcache --cache-to type=registry,ref=localhost:5000/api:buildcache,mode=max -t localhost:5000/api:1.2 --push .</code>. On GitHub Actions, <code>type=gha</code> uses the Actions cache instead. <b>Cloud &amp; DevOps 11</b> (CI/CD) builds on this.</p>` }
    ],
    deepDive: `<p>🟣 <b>Cache keys, precisely.</b> BuildKit builds a graph (LLB) from the Dockerfile. Each vertex's cache key combines its parent's key, the instruction and its options, and for <code>COPY</code>/<code>ADD</code> a content hash of the selected files including permissions (not mtimes). <code>ARG</code> values used by a <code>RUN</code> are part of that RUN's key, so <code>--build-arg BUILD_DATE=$(date)</code> placed early busts everything below it: declare such ARGs as late as possible.</p>
      <p>🟣 <b>Cache mounts vs layers.</b> <code>RUN --mount=type=cache,target=/root/.cache/pip</code> gives the step a persistent folder that lives in the builder, not in the image. Even when the layer must rebuild (requirements changed), pip downloads only what is new. Use them for <code>~/.npm</code>, <code>/go/pkg/mod</code>, <code>~/.m2</code> and the apt cache (<code>/var/cache/apt</code> with <code>sharing=locked</code>). They do not travel with <code>--cache-to</code>, so in CI they help only on persistent builders.</p>
      <p>🟣 <b>Parallel stages and skipped stages.</b> BuildKit builds independent stages in parallel and skips stages the target does not need, so splitting dependencies, tests and build into stages often speeds things up beyond caching.</p>
      <p>🟣 <b>Reproducibility.</b> Cache hits make builds fast but not reproducible: <code>pip install requests</code> resolves differently next month. Lock files (<code>package-lock.json</code>, <code>poetry.lock</code>, <code>uv.lock</code>, <code>go.sum</code>, hashes in <code>requirements.txt</code>) plus a digest-pinned base image make two builds of the same commit produce the same packages. <code>SOURCE_DATE_EPOCH</code> support in BuildKit goes further, to byte-identical layers.</p>`,
    aiEra: `<p>🤖 <b>What AI changes.</b> Ask an assistant to "optimize my Dockerfile for caching" and it will usually reorder steps correctly and add cache mounts. Build tools now print cache hit rates, and Docker Build Cloud and CI dashboards show which step is slow.</p>
      <p><b>Use AI as a partner:</b> paste your Dockerfile plus <code>docker build --progress=plain</code> output and ask which step missed the cache and why. Then prove the answer by touching one file and rebuilding.</p>
      <p><b>Where AI goes wrong:</b> it splits <code>apt-get update</code> and <code>install</code> into separate RUNs "for readability", puts <code>rm -rf</code> in a later RUN and claims the image shrank, or adds <code>--no-cache</code> to "fix" a stale build (which makes every build slow forever). <b>You still own:</b> the order of steps, the .dockerignore, and measuring build time before and after.</p>`,
    problems: [P({
      t: 'Predict which steps rebuild, then fix the order', l: 'Medium', tags: ['layers', 'build cache', 'dockerfile', 'python'], co: ['Google', 'Atlassian', 'Swiggy'],
      s: `<p>Your Python service rebuilds all dependencies on every commit. First, write <code>rebuild_steps(steps, changed)</code>: given the Dockerfile instructions (one string per step) and the list of changed file paths, return the 0-based indices of the steps that will <b>not</b> be served from the cache. Then rewrite the Dockerfile so a source change does not reinstall dependencies.</p><p>Model rules (BuildKit, simplified): step 0 is <code>FROM</code> and never rebuilds (base unchanged). A <code>COPY</code>/<code>ADD</code> rebuilds when any changed file is one of its sources: sources are all arguments except the last (the destination), ignoring <code>--flags</code>; <code>.</code> matches every file; <code>dir/</code> or <code>dir</code> matches files inside it; <code>*</code> and <code>?</code> are globs that do not cross <code>/</code>; anything else is an exact path. Any other instruction rebuilds only if an earlier step rebuilt. Once one step rebuilds, every later step rebuilds.</p>`,
      c: `<p>Single-stage Dockerfiles, 1-30 steps, paths relative to the build context without leading <code>./</code>, no .dockerignore. Python 3 standard library.</p>`,
      ex: `<p>Steps <code>["FROM python:3.12-slim", "WORKDIR /app", "COPY . .", "RUN pip install -r requirements.txt", "CMD python app.py"]</code>, changed <code>["src/app.py"]</code> → ${H.c('r', '[2, 3, 4]')}: <code>COPY . .</code> includes the file, so pip reinstalls. With the reordered file (<code>COPY requirements.txt .</code> at 2, pip at 3, <code>COPY src/ ./src/</code> at 4, CMD at 5) the same change gives ${H.c('g', '[4, 5]')}.</p>`,
      bw: `<p>Adding <code>--no-cache</code> to "make sure it is fresh", or buying a bigger CI runner. Both keep reinstalling every package on every commit; the waste is the step order, not the machine.</p>`,
      bc: DF(`FROM python:3.12-slim
WORKDIR /app
COPY . .
RUN pip install -r requirements.txt
CMD python app.py`),
      q: ['You edit only <code>src/app.py</code>. In the good order, which step is the first to rebuild?', ['<code>COPY src/ ./src/</code>', '<code>RUN pip install</code>', '<code>WORKDIR /app</code>', 'None: code changes never rebuild'], 0, 'Only the COPY that includes <code>src/app.py</code> misses the cache; the pip layer above it depends only on <code>requirements.txt</code>, which did not change.'],
      h: ['<p>Hint 1: walk the steps top to bottom with a flag "dirty = False". Only COPY/ADD can flip it; after it flips, everything is rebuilt.</p>', '<p>Hint 2: for COPY, drop words starting with <code>--</code>, the last word is the destination, the rest are sources. Check every (source, changed file) pair.</p>', '<p>Hint 3: matching: <code>.</code> → always; contains * or ? → glob where * does not cross /; ends with / → prefix; otherwise exact or <code>src + "/"</code> prefix. Fix the Dockerfile by moving the manifest COPY and install above the source COPY.</p>'],
      a: `<p>The cache is a chain: each step's key includes its parent. So the first step whose input changed breaks the chain and everything below rebuilds. The only steps whose inputs depend on your files are COPY/ADD, so the model scans for the first COPY that includes a changed file. The fix follows directly: put the step that copies the dependency manifest and the install <b>above</b> the step that copies the source, so a source edit breaks the chain only after the expensive install.</p>`,
      code: DF(R`# syntax=docker/dockerfile:1
FROM python:3.12-slim
WORKDIR /app
# step 2: copy only the dependency manifest
COPY requirements.txt .
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements.txt                        # step 3: cached until requirements.txt changes
RUN useradd --create-home --uid 10001 app
# code edits rebuild from here
COPY --chown=app:app src/ ./src/
USER 10001
CMD ["python", "-m", "src.app"]`, 'Dockerfile (fixed order)'),
      alt: [PY(R`import re


def _glob_regex(pattern):
    # Docker COPY globs follow Go's filepath.Match: * and ? never cross a "/"
    parts = []
    for ch in pattern:
        if ch == "*":
            parts.append("[^/]*")
        elif ch == "?":
            parts.append("[^/]")
        else:
            parts.append(re.escape(ch))
    return re.compile("^" + "".join(parts) + "$")


def _copies(src, path):
    """True if COPY source src would include the file path."""
    if src.startswith("./"):
        src = src[2:]
    if src in ("", "."):
        return True                                  # the whole context
    if "*" in src or "?" in src:
        return _glob_regex(src).match(path) is not None
    if src.endswith("/"):
        return path.startswith(src)                  # a directory
    return path == src or path.startswith(src + "/")  # a file, or a directory without the slash


def rebuild_steps(steps, changed):
    rebuilt = []
    dirty = False                                    # has the cache chain been broken yet?
    for i, step in enumerate(steps):
        words = step.split()
        op = words[0].upper() if words else ""
        if i == 0 or op == "FROM":
            continue                                 # base image unchanged in this model
        if not dirty and op in ("COPY", "ADD"):
            args = [w for w in words[1:] if not w.startswith("--")]
            sources = args[:-1]                      # the last argument is the destination
            if any(_copies(s, f) for s in sources for f in changed):
                dirty = True
        if dirty:
            rebuilt.append(i)
    return rebuilt`, 'rebuild_steps (tested)')],
      cx: `<p>O(S × A × F) for S steps, A sources per COPY and F changed files: tiny. The build itself drops from "reinstall everything" (minutes) to "copy the source" (seconds) for code-only commits.</p>`,
      f: ['How would .dockerignore change the answer if <code>README.md</code> is ignored and the Dockerfile uses <code>COPY . .</code>?', 'Extend the model: <code>ARG</code> values and <code>--build-arg</code> changes also break the chain at the first step that uses them.'],
      tests: { sig: 'string[] string[] -> int[]', fn: 'rebuildSteps', cases: [
        [[['FROM python:3.12-slim', 'WORKDIR /app', 'COPY . .', 'RUN pip install -r requirements.txt', 'CMD python app.py'], ['src/app.py']], [2, 3, 4]],
        [[['FROM python:3.12-slim', 'WORKDIR /app', 'COPY requirements.txt .', 'RUN pip install -r requirements.txt', 'COPY src/ ./src/', 'CMD python src/app.py'], ['src/app.py']], [4, 5]],
        [[['FROM python:3.12-slim', 'WORKDIR /app', 'COPY requirements.txt .', 'RUN pip install -r requirements.txt', 'COPY src/ ./src/', 'CMD python src/app.py'], ['requirements.txt']], [2, 3, 4, 5]],
        [[['FROM python:3.12-slim', 'WORKDIR /app', 'COPY requirements.txt .', 'RUN pip install -r requirements.txt', 'COPY src/ ./src/', 'CMD python src/app.py'], ['README.md']], []],
        [[['FROM python:3.12-slim', 'WORKDIR /app', 'COPY requirements.txt .', 'RUN pip install -r requirements.txt', 'COPY src/ ./src/', 'CMD python src/app.py'], []], []],
        [[['FROM python:3.12-slim', 'WORKDIR /app', 'COPY requirements.txt .', 'RUN pip install -r requirements.txt', 'COPY src/ ./src/', 'CMD python src/app.py'], ['src/app.py', 'requirements.txt']], [2, 3, 4, 5]],
        [[['FROM node:22-slim', 'WORKDIR /app', 'COPY package.json package-lock.json ./', 'RUN npm ci', 'COPY . .', 'RUN npm run build'], ['package-lock.json']], [2, 3, 4, 5]],
        [[['FROM node:22-slim', 'WORKDIR /app', 'COPY package.json package-lock.json ./', 'RUN npm ci', 'COPY . .', 'RUN npm run build'], ['docs/x.md']], [4, 5]],
        [[['FROM golang:1.23', 'COPY go.* ./', 'RUN go mod download', 'COPY cmd ./cmd', 'RUN go build ./cmd/api'], ['go.sum']], [1, 2, 3, 4]],
        [[['FROM golang:1.23', 'COPY go.* ./', 'RUN go mod download', 'COPY cmd ./cmd', 'RUN go build ./cmd/api'], ['cmd/api/main.go']], [3, 4]],
        [[['FROM golang:1.23', 'COPY go.* ./', 'RUN go mod download', 'COPY cmd ./cmd', 'RUN go build ./cmd/api'], ['cmdx/a.go']], []],
        [[['FROM golang:1.23', 'COPY go.* ./', 'RUN go mod download', 'COPY cmd ./cmd', 'RUN go build ./cmd/api'], ['internal/db.go']], []],
        [[['FROM python:3.12-slim', 'COPY --chown=app:app requirements.txt .', 'RUN pip install -r requirements.txt'], ['requirements.txt']], [1, 2]]
      ] }
    })]
  });

  // ───────────────────────── Topic 4: multi-stage builds and architectures ─────────────────────────
  var GO_DOCKERFILE = R`# syntax=docker/dockerfile:1
# Go API: compile in a big image, ship only the binary in a tiny one.
# --platform=$BUILDPLATFORM runs the compiler natively (fast) and cross-compiles for each target.
FROM --platform=$BUILDPLATFORM golang:1.23 AS build
ARG TARGETOS
ARG TARGETARCH
WORKDIR /src
COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod go mod download
COPY . .
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 GOOS=$TARGETOS GOARCH=$TARGETARCH \
    go build -trimpath -ldflags="-s -w" -o /out/api ./cmd/api

# Optional test stage: "docker build --target test ." runs it; normal builds skip it
FROM build AS test
RUN go test ./...

# Runtime: no shell, no package manager, runs as UID 65532 ("nonroot")
FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /out/api /api
USER nonroot:nonroot
EXPOSE 8080
ENTRYPOINT ["/api"]`;

  var JAVA_DOCKERFILE = R`# syntax=docker/dockerfile:1
# Spring Boot (Maven) service: JDK + Maven to build, JRE only to run.
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /src
COPY pom.xml .
RUN --mount=type=cache,target=/root/.m2 mvn -B -q dependency:go-offline
COPY src ./src
# pom.xml sets <finalName>app</finalName>, so the jar is target/app.jar
RUN --mount=type=cache,target=/root/.m2 mvn -B -q package -DskipTests

FROM eclipse-temurin:21-jre
RUN useradd --system --uid 10001 --no-create-home app
WORKDIR /app
COPY --from=build --chown=app:app /src/target/app.jar ./app.jar
USER 10001
EXPOSE 8080
# The JVM reads the cgroup memory limit; let it use 75% of it for the heap
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-jar", "/app/app.jar"]`;

  topics.push({
    title: 'Multi-Stage Builds and Multi-Architecture Images',
    analogy: `<p>A furniture factory has saws, glue, sawdust and a dozen workers. The customer receives only the <b>finished chair</b> in a box, not the factory. A multi-stage build is the same: one stage is the workshop (compilers, dev dependencies, test tools) and the final stage is the box that ships. And because customers live in different countries, you might ship the same chair with a <b>different plug</b> for each one: that is a multi-architecture image, one name with an amd64 build and an arm64 build inside.</p>`,
    explain: `<p>🟢 <b>The problem.</b> To build a Go, Java, Node or Python-with-C-extensions app you need compilers and dev tools: often 800 MB to 1.5 GB. To <b>run</b> the result you need a few MB to a couple of hundred. A single-stage image ships the whole workshop: slow pulls, slow scale-up, and hundreds of extra packages with vulnerabilities.</p>
      <p>🟢 <b>The fix: several FROM lines in one Dockerfile.</b> Each <code>FROM ... AS name</code> starts a new stage with a clean filesystem. <code>COPY --from=name /path /path</code> pulls only the files you choose from an earlier stage. <b>Only the last stage</b> (or the one you pick with <code>--target</code>) becomes the image; earlier stages are thrown away.</p>
      ${H.table(['Language', 'Build stage', 'Runtime stage', 'Typical final size'], [
        ['Go (static)', '<code>golang:1.23</code> (~800 MB)', '<code>gcr.io/distroless/static-debian12</code> or <code>scratch</code>', '10-25 MB'],
        ['Java', '<code>maven:3.9-eclipse-temurin-21</code>', '<code>eclipse-temurin:21-jre</code> (or a jlink custom runtime)', '200-300 MB (80-120 MB with jlink)'],
        ['Node', '<code>node:22</code> + dev deps, <code>npm run build</code>', '<code>node:22-slim</code> + prod deps only', '150-250 MB'],
        ['Python', '<code>python:3.12</code> + build-essential, build wheels', '<code>python:3.12-slim</code>, install the wheels', '150-300 MB']
      ])}
      <p>🔵 <b>Situation: the 1.5 GB image.</b> A Python API image is 1.5 GB because it starts from the full <code>python:3.12</code> image (about 1 GB), installs <code>build-essential</code> (≈ 380 MB), keeps pip's cache, and <code>COPY . .</code> brings in <code>.git</code> and a <code>data/</code> folder. Multi-stage (compile wheels in the builder, install them in <code>-slim</code>), <code>--no-cache-dir</code> and a <code>.dockerignore</code> bring it to about 200 MB without changing a line of app code.</p>
      <p>🔵 <b>Situation: "works on my machine" across CPUs.</b> An image built on an Apple Silicon Mac is <code>linux/arm64</code>. Pushed and run on an Intel/AMD server, it fails at once with <code>exec /app: exec format error</code> (or <code>no matching manifest for linux/amd64</code>). The reverse is "it works but is very slow" when Docker Desktop emulates amd64 with QEMU or Rosetta. Fixes: build for the server's platform (<code>docker build --platform linux/amd64</code>), or better, publish a <b>multi-platform</b> image with <code>docker buildx build --platform linux/amd64,linux/arm64 --push</code>. Each machine then pulls the build that matches its CPU from the same tag.</p>`,
    clues: [
      '"Our image is 1.5 GB" → multi-stage, slim/distroless runtime, .dockerignore, no caches in layers',
      '"exec format error" / "no matching manifest for linux/amd64" → built for the wrong CPU architecture: buildx with --platform',
      '"Build on M1/M2/M3 Mac, deploy on x86 servers" (or Graviton) → multi-platform image (manifest list)',
      '"The compiler and test tools are in the production image" → split build and runtime stages; COPY --from',
      '"Run tests during the image build without shipping them" → a separate <code>test</code> stage with <code>--target test</code>',
      '"Cross-compiling is slow under emulation" → <code>FROM --platform=$BUILDPLATFORM</code> with TARGETOS/TARGETARCH'
    ],
    code: [DF(GO_DOCKERFILE, 'Dockerfile: Go, multi-stage to distroless'), DF(JAVA_DOCKERFILE, 'Dockerfile: Java (Maven), JDK to JRE'), SH(R`#!/usr/bin/env bash
# Lab: build one tag for two CPU architectures and push it to a LOCAL registry.
set -euo pipefail

docker run -d -p 5000:5000 --name registry registry:2 2>/dev/null || docker start registry

# A builder that can produce multi-platform images. "host" networking lets it reach localhost:5000.
docker buildx create --name multi --driver docker-container --driver-opt network=host --use 2>/dev/null \
  || docker buildx use multi
docker buildx inspect --bootstrap | grep -i platforms

docker buildx build --platform linux/amd64,linux/arm64 -t localhost:5000/api:1.0 --push .

# One tag, two manifests:
docker buildx imagetools inspect localhost:5000/api:1.0 | grep -E 'Platform|Name'

# Which architecture does THIS machine pull?
docker pull localhost:5000/api:1.0
docker image inspect -f '{{.Os}}/{{.Architecture}}' localhost:5000/api:1.0
# Podman: podman build --platform linux/amd64,linux/arm64 --manifest localhost:5000/api:1.0 .
#         podman manifest push --tls-verify=false localhost:5000/api:1.0`, 'Lab: multi-platform build with buildx')],
    codeTitle: ['Go multi-stage', 'Java multi-stage', 'buildx multi-platform lab'],
    viz: [{
      title: 'Only the last stage ships: final size from the layers',
      input: 'FROM golang:1.23 AS build | 820; RUN go mod download | 150; COPY . . | 5; RUN go build -o /out/api | 40; FROM gcr.io/distroless/static-debian12 | 2; COPY --from=build /out/api /api | 12',
      inputLabel: 'Dockerfile lines with sizes in MB: INSTRUCTION | MB; ... (FROM name AS stage starts a stage; FROM stage reuses it)',
      gen: function (input) {
        var lines = String(input || '').split(';').map(function (s) { return s.trim(); }).filter(Boolean);
        if (!lines.length) throw new Error('Type lines like: FROM golang:1.23 AS build | 820; RUN go build | 40');
        if (lines.length > 14) throw new Error('Use at most 14 lines');
        var f = [];
        lines.forEach(function (ln, i) {
          var st = sizeModel(lines.slice(0, i + 1)), cur = st[st.length - 1];
          var isFrom = /^FROM\s/i.test(ln);
          f.push({ narr: (isFrom ? 'A new stage <b>' + H.esc(cur.label) + '</b> starts from <code>' + H.esc(cur.base) + '</code> at ' + cur.size + ' MB. Files from earlier stages are not included unless copied.' : '<code>' + H.esc(ln.split('|')[0].trim()) + '</code> adds a layer to <b>' + H.esc(cur.label) + '</b>, which is now ' + cur.size + ' MB. Layers only add: deleting in a later step would not subtract.'), parts: [
            { type: 'bars', label: 'size of each stage so far (MB)', values: st.map(function (s) { return s.size; }), idxLabels: st.map(function (s) { return s.label; }), texts: st.map(function (s) { return s.size + ' MB'; }), hl: one(st.length - 1, 'cur') }
          ] });
        });
        var all = sizeModel(lines), last = all[all.length - 1], biggest = Math.max.apply(null, all.map(function (s) { return s.size; }));
        f.push({ narr: 'Build finished. <b>Only the last stage</b> (' + H.esc(last.label) + ') becomes the image: ' + H.c('g', last.size + ' MB') + '. ' + (all.length > 1 ? 'The other stages (up to ' + biggest + ' MB) stay in the build cache and never reach the registry.' : 'Single stage: everything you installed ships.'), parts: [
          { type: 'bars', label: 'stage sizes (MB); the shipped one is highlighted', values: all.map(function (s) { return s.size; }), idxLabels: all.map(function (s) { return s.label; }), texts: all.map(function (s) { return s.size + ' MB'; }), hl: one(all.length - 1, 'ok') }
        ] });
        return pad4(f, 'Try adding a second FROM line to see a multi-stage build.');
      }
    }, {
      title: 'One tag, two CPUs: the manifest list',
      input: 'arm64,amd64',
      inputLabel: 'build machine CPU, server CPU (arm64 or amd64)',
      gen: function (input) {
        var p = String(input || '').split(',').map(function (s) { return s.trim().toLowerCase(); });
        if (p.length !== 2 || p.some(function (x) { return x !== 'arm64' && x !== 'amd64'; })) throw new Error('Use two values from arm64/amd64, e.g. arm64,amd64');
        var b = p[0], s = p[1], same = b === s;
        var nodes = [box('dev', 'laptop (' + b + ')', 12, 12, 20), box('reg', 'registry api:1.0', 50, 12, 22), box('srv', 'server (' + s + ')', 88, 12, 20), box('idx', 'manifest list', 50, 45, 20)];
        var f = [];
        f.push({ narr: 'You run a plain <code>docker build -t api:1.0 .</code> on your ' + b + ' machine. The result is a <b>linux/' + b + '</b> image only.', parts: [{ type: 'graph', directed: true, height: 60, nodes: nodes.slice(0, 3), edges: [['dev', 'reg', 'push']], hl: { dev: 'cur' }, ehl: {} }] });
        f.push({ narr: 'You push it. The registry stores one manifest for linux/' + b + '.', parts: [{ type: 'graph', directed: true, height: 60, nodes: nodes.slice(0, 3), edges: [['dev', 'reg', 'push'], ['reg', 'srv', 'pull']], hl: { reg: 'cur' }, ehl: { 'dev-reg': 'ok' } }] });
        f.push({ narr: same ? 'The ' + s + ' server pulls and runs it. ' + H.c('g', 'Works') + ', because the CPUs match.' : 'The ' + s + ' server pulls and starts it: ' + H.c('r', 'exec /app: exec format error') + '. The binary contains ' + b + ' machine code. (With Docker Desktop the opposite case "works" through emulation, just slowly.)', parts: [{ type: 'graph', directed: true, height: 60, nodes: nodes.slice(0, 3), edges: [['dev', 'reg', 'push'], ['reg', 'srv', 'pull']], hl: { srv: same ? 'ok' : 'bad' }, ehl: { 'reg-srv': same ? 'ok' : 'bad' } }] });
        f.push({ narr: 'Fix: <code>docker buildx build --platform linux/amd64,linux/arm64 -t localhost:5000/api:1.0 --push .</code> builds both (cross-compiling or emulating) and pushes a <b>manifest list</b> that points to one image per platform.', parts: [{ type: 'graph', directed: true, height: 60, nodes: nodes, edges: [['dev', 'reg', 'push x2'], ['reg', 'idx'], ['reg', 'srv', 'pull']], hl: { idx: 'sel' }, ehl: { 'dev-reg': 'ok', 'reg-idx': 'ok' } }] });
        f.push({ narr: 'The server asks for <code>api:1.0</code>, the registry returns the manifest list, and the client picks the <b>linux/' + s + '</b> entry. ' + H.c('g', 'Same tag, right binary everywhere') + ': laptops, x86 servers and Graviton/Ampere arm64 nodes.', parts: [{ type: 'table', label: 'manifest list for api:1.0', columns: ['platform', 'manifest digest', 'pulled by'], rows: [['linux/amd64', 'sha256:a1f0 (example)', s === 'amd64' ? 'this server' : (b === 'amd64' ? 'your laptop' : '-')], ['linux/arm64', 'sha256:7c2e (example)', s === 'arm64' ? 'this server' : (b === 'arm64' ? 'your laptop' : '-')]], hl: one(s === 'amd64' ? 0 : 1, 'ok') }] });
        return f;
      }
    }],
    examples: [
      { title: 'Python wheels: build with compilers, run without', html: `<p>Packages like <code>psycopg2</code> or <code>uwsgi</code> compile C code. Stage 1 (<code>python:3.12</code> + <code>build-essential</code> + <code>libpq-dev</code>) runs <code>pip wheel -r requirements.txt -w /wheels</code>. Stage 2 (<code>python:3.12-slim</code> + runtime-only <code>libpq5</code>) runs <code>pip install --no-cache-dir /wheels/*</code>. The compilers never reach the final image. The guided problem below does exactly this.</p>` },
      { title: 'Go to scratch: when you can and when you cannot', html: `${H.table(['Need', 'scratch', 'distroless/static'], [
        ['static binary (CGO_ENABLED=0)', 'yes', 'yes'],
        ['CA certificates for HTTPS calls', 'copy them in yourself', 'included'],
        ['/etc/passwd with a nonroot user', 'add yourself', 'included (UID 65532)'],
        ['timezone data', 'embed with <code>-tags timetzdata</code>', 'included'],
        ['shell for debugging', 'no', 'no (use the <code>:debug</code> tag)']
      ])}<p>For most Go services distroless/static is the easy safe default at ~2 MB.</p>` },
      { title: 'Size before and after (real-world numbers)', html: `${H.table(['Image', 'Single-stage', 'Multi-stage'], [
        ['Go API', '<span class="c-r">1.0 GB</span> (golang:1.23)', '<span class="c-g">14 MB</span> (distroless/static)'],
        ['Spring Boot', '<span class="c-r">780 MB</span> (maven + JDK)', '<span class="c-g">290 MB</span> (JRE)'],
        ['Node API', '<span class="c-r">1.2 GB</span> (node:22, dev deps)', '<span class="c-g">210 MB</span> (node:22-slim, prod deps)'],
        ['Python + C extensions', '<span class="c-r">1.5 GB</span> (python:3.12 + build-essential)', '<span class="c-g">210 MB</span> (python:3.12-slim + wheels)']
      ])}<p>Exact numbers vary by version; the order of magnitude does not.</p>` }
    ],
    deepDive: `<p>🟣 <b>How BuildKit runs stages.</b> Stages form a dependency graph. BuildKit builds only what the target needs, and runs independent stages in parallel. <code>FROM build AS test</code> reuses the <code>build</code> stage's filesystem, so the test stage starts warm. <code>COPY --from</code> can also take an image (<code>COPY --from=nginx:1.27 /etc/nginx/nginx.conf .</code>).</p>
      <p>🟣 <b>Build arguments for platforms.</b> BuildKit predefines <code>BUILDPLATFORM</code> (where the build runs) and <code>TARGETPLATFORM</code>, <code>TARGETOS</code>, <code>TARGETARCH</code> (what you are building for). Running the compiler on <code>$BUILDPLATFORM</code> and cross-compiling (Go, Rust, Java bytecode) is fast. Anything that must <b>execute</b> target binaries during the build (for example <code>RUN pip install</code> with native wheels for arm64) uses QEMU emulation on a different-CPU builder: correct but 5-20x slower. Native arm64 CI runners remove that cost.</p>
      <p>🟣 <b>Local image store and multi-platform.</b> The classic Docker image store keeps one platform per tag, which is why the lab pushes with <code>--push</code> instead of <code>--load</code>. With the containerd image store enabled, Docker Engine and Desktop can keep multi-platform images locally. Kubernetes nodes simply pull the right entry from the manifest list.</p>
      <p>🟣 <b>Java-specific shrinking.</b> <code>jdeps</code> lists the JDK modules your app uses, and <code>jlink</code> builds a custom runtime with only those (often under 80 MB). Spring Boot's layered jars (<code>java -Djarmode=tools -jar app.jar extract --layers</code>) split dependencies from your classes so the dependency layer is cached across releases.</p>`,
    aiEra: `<p>🤖 <b>What AI changes.</b> Assistants convert single-stage Dockerfiles to multi-stage reliably, and can explain an <code>exec format error</code> instantly if you paste the platform output. CI templates for multi-arch builds are one prompt away.</p>
      <p><b>Use AI as a partner:</b> ask "what does the runtime stage actually need at run time?" and have it list files, libraries and env vars. Then verify by running the final image and exercising every endpoint, because missing runtime libraries (like <code>libpq5</code>) only show up when code paths run.</p>
      <p><b>Where AI goes wrong:</b> it copies the whole build folder (<code>COPY --from=build /src /src</code>), which ships the source and dev dependencies again; it picks <code>scratch</code> for an app that needs CA certificates; and it suggests <code>--platform linux/amd64</code> everywhere, which makes arm64 Macs and Graviton servers run under emulation. <b>You still own:</b> the runtime file list, the platform matrix, and the before/after size check.</p>`,
    problems: [P({
      t: 'Shrink the 1.5 GB Python image', l: 'Medium', tags: ['multi-stage', 'image size', 'python', '.dockerignore'], co: ['Amazon', 'Flipkart', 'Deloitte'],
      s: `<p>The <code>reports-api</code> image is 1.5 GB, deploys pull it on every autoscaling event, and the security scanner reports 600+ CVEs. The Dockerfile:</p><pre>FROM python:3.12
RUN apt-get update &amp;&amp; apt-get install -y build-essential libpq-dev
WORKDIR /app
COPY . .
RUN pip install -r requirements.txt
CMD python -m reports.api</pre><p>The repo has a <code>.git</code> folder (120 MB) and <code>data/</code> with sample CSVs (180 MB). <code>requirements.txt</code> includes <code>psycopg2</code> (needs a compiler and libpq headers to build). Rewrite it to be small and fast to rebuild, and estimate the new size.</p>`,
      ex: `<p>Estimate before: python:3.12 ${H.c('r', '≈ 1020 MB')} + build-essential/libpq-dev ${H.c('r', '≈ 380 MB')} + context (.git, data) ${H.c('r', '≈ 300 MB')} + packages and pip cache ≈ 140 MB → about 1.5-1.8 GB depending on compression. After: python:3.12-slim ${H.c('g', '≈ 125 MB')} + libpq5 ≈ 10 MB + installed packages ≈ 70 MB + code ≈ 1 MB → about ${H.c('g', '210 MB')}.</p>`,
      bw: `<p>Adding <code>RUN apt-get purge -y build-essential &amp;&amp; rm -rf ~/.cache/pip</code> at the end. It runs, but the bytes stay in the earlier layers, so the image does not shrink at all. Switching only to <code>python:3.12-alpine</code> breaks the psycopg2 build (musl, no manylinux wheels) and adds build time instead.</p>`,
      bc: DF(`FROM python:3.12
RUN apt-get update && apt-get install -y build-essential libpq-dev
WORKDIR /app
COPY . .
RUN pip install -r requirements.txt
RUN apt-get purge -y build-essential && rm -rf /root/.cache/pip   # does not shrink anything`),
      q: ['Which change saves the most space here?', ['Building wheels in a builder stage and installing them into python:3.12-slim', 'Adding <code>rm -rf /root/.cache/pip</code> in a final RUN', 'Using <code>docker image prune</code> after the build', 'Combining CMD and ENTRYPOINT'], 0, 'The full base image plus compilers are over 1.3 GB. A slim runtime stage that receives only wheels drops both. Deleting in a later layer and pruning do not change this image.'],
      h: ['<p>Hint 1: list what is needed only to <b>build</b> (compilers, headers, pip cache) and what is needed to <b>run</b> (Python, libpq runtime, installed packages, your code).</p>', '<p>Hint 2: stage 1 runs <code>pip wheel</code> to produce .whl files; stage 2 starts from <code>-slim</code>, installs <code>libpq5</code> and the wheels with <code>--no-cache-dir</code>.</p>', '<p>Hint 3: add a .dockerignore (.git, data/, .venv, tests, .env) and copy only <code>reports/</code>; keep requirements first for caching; finish with a non-root user and exec-form CMD.</p>'],
      a: `<p>Split the work. The <b>builder</b> stage has everything needed to compile and produces wheels in <code>/wheels</code>. The <b>runtime</b> stage starts from <code>python:3.12-slim</code>, installs only the runtime shared library (<code>libpq5</code>, not <code>-dev</code>), installs the prebuilt wheels without any cache, copies just the package directory, and drops root. A .dockerignore keeps .git, data and secrets out of the context entirely. Verify with <code>docker images</code>, <code>docker history</code>, and a scan before and after.</p>`,
      code: DF(R`# syntax=docker/dockerfile:1
# ---------- builder: compilers live here only ----------
FROM python:3.12 AS builder
RUN apt-get update \
 && apt-get install -y --no-install-recommends build-essential libpq-dev \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /build
COPY requirements.txt .
RUN --mount=type=cache,target=/root/.cache/pip \
    pip wheel --wheel-dir /wheels -r requirements.txt

# ---------- runtime: slim base + wheels + code ----------
FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
RUN apt-get update \
 && apt-get install -y --no-install-recommends libpq5 \
 && rm -rf /var/lib/apt/lists/* \
 && useradd --create-home --uid 10001 app
WORKDIR /app
COPY --from=builder /wheels /wheels
RUN pip install --no-cache-dir --no-index --find-links=/wheels /wheels/* && rm -rf /wheels
COPY --chown=app:app reports/ ./reports/
USER 10001
EXPOSE 8000
CMD ["python", "-m", "reports.api"]`, 'Dockerfile (multi-stage)'),
      alt: [SH(R`#!/usr/bin/env bash
# .dockerignore plus before/after measurements
set -euo pipefail
printf '%s\n' .git data/ .venv/ __pycache__/ '*.pyc' tests/ .env '.env.*' '*.log' > .dockerignore

docker build -t reports-api:before -f Dockerfile.old .
docker build -t reports-api:after .
docker images reports-api --format 'table {{.Tag}}\t{{.Size}}'
docker history --format '{{.Size}}\t{{.CreatedBy}}' reports-api:after | head -n 6

# Smoke test: the runtime stage must still import psycopg2 (catches a missing libpq5)
docker run --rm reports-api:after python -c "import psycopg2; print('psycopg2 ok', psycopg2.__version__)"
# Optional: compare vulnerability counts
docker scout quickview reports-api:before || true
docker scout quickview reports-api:after || true`, 'measure')],
      cx: `<p>Image ≈ 1.5 GB → ≈ 210 MB (about 7x smaller): faster pulls on every scale-out, far fewer packages to patch. Build time is similar on the first build and much faster afterwards thanks to the cached wheel stage.</p>`,
      f: ['How would you go further with distroless (<code>gcr.io/distroless/python3-debian12</code>) and what would you lose?', 'Why might <code>python:3.12-alpine</code> make this image slower to build, or even larger?']
    })]
  });

  // ───────────────────────── Topic 5: small and secure images, secrets ─────────────────────────
  topics.push({
    title: 'Small and Secure Images: Base Choice, Non-Root, Scanning, and Never Baking Secrets',
    analogy: `<p>Packing for a trip through airport security: the <b>less you carry, the less there is to inspect</b> and the less can be stolen. You also do not tape your house key to the outside of the suitcase, because everyone who handles the bag can copy it. A container image is a suitcase that gets copied to every laptop, CI runner and server that pulls it. Carry only what the app needs, lock it (non-root, read-only), get it X-rayed (scanning), and keep keys in your pocket (runtime secrets), never in the bag.</p>`,
    explain: `<p>🟢 <b>Choosing a base image.</b></p>
      ${H.table(['Base', 'Size', 'Good for', 'Watch out'], [
        ['<code>python:3.12</code>, <code>node:22</code> (full Debian)', '≈ 1 GB', 'build stages', 'hundreds of packages you never use'],
        ['<code>-slim</code> (Debian slim)', '≈ 75-200 MB', 'the safe default runtime for most apps', 'add runtime libraries yourself'],
        ['<code>alpine</code>', '≈ 5-50 MB', 'static tools, Go, small utilities', '<b>musl libc</b>, not glibc: many Python wheels must compile from source (slow builds, sometimes bigger images), subtle DNS and locale differences, different memory allocator performance'],
        ['<code>gcr.io/distroless/...</code>', '≈ 2-60 MB', 'production runtimes (static, base, python3, java, nodejs)', 'no shell or package manager: debug with <code>:debug</code> tags or <code>docker debug</code>'],
        ['<code>scratch</code>', '0 MB', 'fully static binaries', 'no CA certs, no users, no timezone data unless you add them']
      ])}
      <p>🟢 <b>Run as a non-root user.</b> By default the process in a container runs as <b>root</b> (UID 0). If an attacker breaks the app, root inside the container makes escaping much easier and lets them overwrite anything in the image. Add a user and switch to it with <code>USER 10001</code> (a number, so Kubernetes' <code>runAsNonRoot</code> can verify it). Official Node images have <code>node</code>; distroless has <code>nonroot</code> (65532). Check with <code>docker run --rm IMAGE id</code>.</p>
      <p>🔵 <b>Pin your base by digest.</b> <code>FROM python:3.12-slim</code> is a moving tag: next week it is a different image. <code>FROM python:3.12-slim@sha256:&lt;digest&gt;</code> is exact and tamper-proof. Bots such as Renovate or Dependabot open a pull request when a new digest appears, so you get both reproducibility and patches.</p>
      <p>🔵 <b>Scan.</b> <code>docker scout cves IMAGE</code> (built into Docker Desktop and the CLI plugin) or <code>trivy image IMAGE</code> (open source) list known vulnerabilities (CVEs) in OS packages and language dependencies. In CI, fail the build on fixable HIGH/CRITICAL findings and produce an SBOM (software bill of materials) for later questions like "are we affected by the new OpenSSL bug?"</p>
      <p>🔵 <b>Lock it down at run time.</b> <code>--read-only</code> makes the root filesystem read-only (give the app <code>--tmpfs /tmp</code> for scratch files), <code>--cap-drop ALL</code> removes Linux capabilities (add back only what is needed, like <code>NET_BIND_SERVICE</code> for ports below 1024), <code>--security-opt no-new-privileges</code> blocks setuid tricks, and <code>--memory</code>/<code>--pids-limit</code> stop one container from starving the host. Never mount <code>/var/run/docker.sock</code> into an app container: that is root on the host.</p>
      <p>🔵 <b>Secrets: the four rules.</b></p>
      ${H.table(['Do not', 'Why it leaks', 'Do instead'], [
        ['<code>ENV API_KEY=sk_live_PLACEHOLDER</code>', 'stored in the image config: <code>docker inspect</code> and <code>docker history</code> show it to anyone who can pull', 'pass at run time: <code>--env-file .env</code> (gitignored) or a secrets manager'],
        ['<code>ARG NPM_TOKEN</code> + <code>--build-arg</code>', 'build args are recorded in the image history and provenance', '<code>RUN --mount=type=secret,id=npmrc,target=/root/.npmrc npm ci</code>'],
        ['<code>COPY .env .</code> then <code>RUN rm .env</code>', 'the file stays in the COPY layer; <code>docker save</code> + <code>tar</code> extracts it', 'exclude <code>.env</code> in .dockerignore; inject at run time'],
        ['secrets in compose <code>environment:</code> committed to Git', 'the repo becomes the leak', 'compose <code>secrets:</code> from a gitignored file, read from <code>/run/secrets/NAME</code>']
      ])}`,
    clues: [
      '"Our image has 600 CVEs" → smaller base (slim/distroless), multi-stage, rebuild regularly on patched bases, scan in CI',
      '"Should we use alpine?" → musl caveats for Python/Node native modules; slim or distroless is often the safer default',
      '"How do you pass a token to npm/pip during the build?" → BuildKit secret mount, never ARG/ENV/COPY',
      '"Someone can see our API key with docker history" → it was baked in; rotate the key first, then rebuild with runtime secrets',
      '"Container runs as root" / "runAsNonRoot failed" → <code>USER 10001</code> (numeric) in the Dockerfile',
      '"Harden this container" → read-only root fs, tmpfs, cap-drop ALL, no-new-privileges, resource limits, pinned digest, scanning'
    ],
    code: [DF(R`# syntax=docker/dockerfile:1
# Node app that installs private packages: the npm token is used at BUILD time
# through a secret mount. It is never written to a layer, ARG, ENV or history.
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
# The secret file appears at /root/.npmrc for this RUN only, then disappears
RUN --mount=type=secret,id=npmrc,target=/root/.npmrc \
    npm ci --omit=dev
COPY . .

FROM node:22-slim
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /app ./
USER node
CMD ["node", "server.js"]
# Build:  docker build --secret id=npmrc,src=$HOME/.npmrc -t shop-web:1.0 .
# Run:    docker run --env-file .env shop-web:1.0     (.env is in .gitignore and .dockerignore)`, 'Dockerfile with a BuildKit secret mount'), SH(R`#!/usr/bin/env bash
# Lab: prove that ENV and COPY leak, and that a secret mount does not.
# Uses only a FAKE placeholder value.
set -euo pipefail
mkdir -p leak-lab && cd leak-lab
echo 'API_KEY=PLACEHOLDER_not_a_real_key' > .env

cat > Dockerfile.bad <<'DOCKER'
FROM alpine:3.20
ENV API_KEY=PLACEHOLDER_not_a_real_key
COPY .env /app/.env
RUN rm /app/.env
DOCKER
docker build -q -t leak:bad -f Dockerfile.bad .

docker history --no-trunc leak:bad | grep -i api_key      # the ENV line, in plain text
docker inspect -f '{{json .Config.Env}}' leak:bad         # API_KEY=... in the config
docker save leak:bad -o leak.tar && mkdir -p x && tar -xf leak.tar -C x
for l in x/blobs/sha256/*; do tar -tf "$l" 2>/dev/null | grep -q 'app/.env' && echo "found .env in layer $l"; done

cat > Dockerfile.good <<'DOCKER'
# syntax=docker/dockerfile:1
FROM alpine:3.20
RUN --mount=type=secret,id=api_key,target=/run/secrets/api_key \
    test -s /run/secrets/api_key && echo "secret was available during this step only"
DOCKER
docker build -q --secret id=api_key,src=.env -t leak:good -f Dockerfile.good .
docker history --no-trunc leak:good | grep -ci placeholder || echo "no secret in history"

cd .. && rm -rf leak-lab && docker rmi leak:bad leak:good >/dev/null`, 'Lab: see the leak, then the fix'), SH(R`#!/usr/bin/env bash
# Run-time hardening flags, all at once (works on Docker Engine, Desktop and Podman)
set -euo pipefail
docker run -d --name api \
  --read-only --tmpfs /tmp:rw,size=64m \
  --cap-drop ALL \
  --security-opt no-new-privileges:true \
  --user 10001:10001 \
  --memory 256m --cpus 0.5 --pids-limit 200 \
  --env-file ./.env \
  -p 127.0.0.1:8000:8000 \
  api:1.0

# Pin the base by digest: look it up, then write it into the Dockerfile
docker pull python:3.12-slim >/dev/null
docker inspect --format '{{index .RepoDigests 0}}' python:3.12-slim   # python@sha256:...

# Scan (either tool). Fail CI on fixable HIGH/CRITICAL findings.
docker scout cves --only-severity critical,high api:1.0 || true
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy:0.56.2 \
  image --severity HIGH,CRITICAL --ignore-unfixed --exit-code 1 api:1.0`, 'Hardened run, digest lookup and scanning')],
    codeTitle: ['Secret mount at build time', 'Leak lab', 'Hardening and scanning'],
    viz: [{
      title: 'Where does the secret end up?',
      input: 'COPY',
      inputLabel: 'how the secret is passed: ENV, ARG, COPY or SECRET',
      gen: function (input) {
        var m = String(input || '').trim().toUpperCase();
        if (['ENV', 'ARG', 'COPY', 'SECRET'].indexOf(m) < 0) throw new Error('Type one of: ENV, ARG, COPY, SECRET');
        var lines = {
          ENV: ['FROM node:22-slim', 'ENV NPM_TOKEN=PLACEHOLDER', 'RUN npm ci', 'COPY . .'],
          ARG: ['FROM node:22-slim', 'ARG NPM_TOKEN', 'RUN echo "//registry.npmjs.org/:_authToken=$NPM_TOKEN" > .npmrc && npm ci && rm .npmrc', 'COPY . .'],
          COPY: ['FROM node:22-slim', 'COPY .npmrc .', 'RUN npm ci', 'RUN rm .npmrc', 'COPY . .'],
          SECRET: ['FROM node:22-slim', 'RUN --mount=type=secret,id=npmrc,target=/root/.npmrc npm ci', 'COPY . .']
        }[m];
        var leak = {
          ENV: [['docker inspect (Config.Env)', 'NPM_TOKEN=PLACEHOLDER', true], ['docker history', 'ENV NPM_TOKEN=PLACEHOLDER', true], ['layer files', 'none', false], ['every running container', 'printenv shows it', true]],
          ARG: [['docker inspect (Config.Env)', 'not set', false], ['docker history', 'RUN |1 NPM_TOKEN=PLACEHOLDER ...', true], ['layer files', '.npmrc removed in same RUN', false], ['build provenance', 'build args recorded', true]],
          COPY: [['docker inspect (Config.Env)', 'not set', false], ['docker history', 'COPY .npmrc (size 52B)', false], ['layer files', '.npmrc still inside the COPY layer', true], ['docker save | tar', 'extracts the token', true]],
          SECRET: [['docker inspect (Config.Env)', 'not set', false], ['docker history', 'RUN --mount=type=secret ... (no value)', false], ['layer files', 'nothing: tmpfs mount for one step', false], ['every running container', 'nothing', false]]
        }[m];
        var f = [], stack = [];
        lines.forEach(function (ln, i) {
          stack.push(ln.length > 46 ? ln.slice(0, 44) + '..' : ln);
          var risky = /NPM_TOKEN=|\.npmrc \.|ARG NPM_TOKEN/.test(ln) && m !== 'SECRET';
          var hl = {}; hl[stack.length - 1] = risky ? 'bad' : (/secret/.test(ln) ? 'ok' : 'cur');
          f.push({ narr: 'Build step ' + (i + 1) + ': <code>' + H.esc(ln) + '</code>' + (risky ? ' ' + H.c('r', '← the token touches the image here') : (/rm \.npmrc/.test(ln) ? ' (deletes it from the <b>top</b> layer only; the lower layer still has it)' : (/secret/.test(ln) ? ' ' + H.c('g', '← token mounted for this step only') : ''))), parts: [{ type: 'stack', label: 'image layers and config (bottom → top)', items: stack.slice(), hl: hl }] });
        });
        f.push({ narr: 'Someone with pull access (a contractor, a CI job, an attacker with a stolen registry token) inspects the image.', parts: [{ type: 'table', label: 'what they can see', columns: ['where', 'what is there', 'leak?'], rows: leak.map(function (r) { return [r[0], r[1], r[2] ? 'LEAK' : 'safe']; }), hl: leak.reduce(function (a, r, i) { a[i] = r[2] ? 'bad' : 'ok'; return a; }, {}) }] });
        var any = leak.some(function (r) { return r[2]; });
        f.push({ narr: any ? H.c('r', 'Leaked.') + ' Treat the token as compromised: <b>rotate it first</b>, then rebuild with a secret mount and delete the old tags from the registry. Deleting the image later does not un-leak copies already pulled.' : H.c('g', 'No leak.') + ' The secret existed only in a temporary mount during one RUN. At run time, inject secrets with an env file, compose secrets, or a secrets manager.', parts: [{ type: 'vars', label: 'verdict', vals: { method: m, leaked: any ? 'yes' : 'no', next: any ? 'rotate, rebuild, purge tags' : 'nothing to do' }, hl: { leaked: any ? 'bad' : 'ok' } }] });
        return f;
      }
    }],
    examples: [
      { title: 'Alpine and Python: the slow, big surprise', html: `<p>A team switched <code>python:3.12-slim</code> to <code>python:3.12-alpine</code> to save space. Builds went from 40 s to 9 minutes: <code>pandas</code> and <code>numpy</code> have no prebuilt musl wheels for their pinned versions, so pip compiled them, which needed <code>gcc</code>, <code>g++</code> and headers. The final image was <b>larger</b>. Alpine is great for Go binaries and shell tools; for Python and Node with native modules, slim or distroless is usually smaller in practice and avoids musl surprises.</p>` },
      { title: 'Reading a scan report', html: `${H.table(['Finding', 'Severity', 'Fixed in', 'Action'], [
        ['openssl in base image', '<span class="c-r">CRITICAL</span>', '3.0.15-1~deb12u1', 'rebuild on the latest base digest'],
        ['requests 2.31.0 (Python)', '<span class="c-y">MEDIUM</span>', '2.32.0', 'bump in requirements, rebuild'],
        ['perl in base', 'LOW', 'no fix', 'accept, or move to distroless where perl is absent'],
        ['curl in runtime', 'HIGH', '-', 'remove: the app does not need curl at run time']
      ])}<p>Most findings disappear by <b>removing</b> packages, not by patching them.</p>` },
      { title: 'Runtime secrets in three flavours', html: `${H.table(['Where it runs', 'How the app gets the secret'], [
        ['local docker run', '<code>--env-file .env</code> with <code>.env</code> in <code>.gitignore</code> and <code>.dockerignore</code>; commit a <code>.env.example</code> with placeholders'],
        ['docker compose', '<code>secrets:</code> backed by a gitignored file, mounted read-only at <code>/run/secrets/db_password</code>; many images accept <code>*_FILE</code> variables'],
        ['cloud / Kubernetes', 'a secrets manager (AWS Secrets Manager, Vault) or Kubernetes Secrets mounted as files (Cloud &amp; DevOps 13 and 16)']
      ])}` },
      { title: 'Check that hardening did not break the app', html: `<p>After <code>--read-only</code> the app crashes with <code>OSError: [Errno 30] Read-only file system: '/app/cache'</code>. Find every path it writes (<code>docker diff</code> on a normal run lists them), then give each a <code>--tmpfs</code> (scratch) or a volume (data). With <code>--cap-drop ALL</code>, nginx on port 80 needs <code>--cap-add NET_BIND_SERVICE</code>, or better, listen on 8080 inside the container.</p>` }
    ],
    deepDive: `<p>🟣 <b>Why root in a container is risky even with namespaces.</b> Without user namespaces, UID 0 in the container is UID 0 on the host kernel, limited by dropped capabilities, seccomp and AppArmor/SELinux. A kernel bug or a mistake (a bind-mounted host path, <code>--privileged</code>, the Docker socket) turns that into host root. Rootless Docker and rootless Podman map container root to your unprivileged user, which removes most of that risk; Kubernetes adds <code>runAsNonRoot</code>, <code>readOnlyRootFilesystem</code> and <code>allowPrivilegeEscalation: false</code> (CS Core 9 covers the kernel side).</p>
      <p>🟣 <b>Default capabilities.</b> Docker already drops many capabilities but keeps about 14, including <code>CHOWN</code>, <code>SETUID</code>, <code>NET_RAW</code> (raw sockets, ping) and <code>DAC_OVERRIDE</code>. Most web apps need none of them. Start from <code>--cap-drop ALL</code> and add back only what breaks.</p>
      <p>🟣 <b>Supply chain.</b> Beyond CVE scans: <b>SBOMs</b> (<code>docker buildx build --sbom=true</code>, or <code>syft</code>) list every package; <b>provenance attestations</b> (<code>--provenance=mode=max</code>) record how the image was built; <b>signatures</b> (cosign, Notation) let the cluster refuse unsigned images. Note that max-mode provenance records build args, one more reason never to pass secrets as ARGs.</p>
      <p>🟣 <b>Leaked secret response.</b> Order matters: (1) revoke or rotate the credential at the provider, (2) remove it from the Dockerfile and rebuild, (3) delete affected tags and digests from registries and run garbage collection, (4) check access logs for use. Steps 2-4 without step 1 leave the old secret valid in every copy already pulled.</p>`,
    aiEra: `<p>🤖 <b>What AI changes.</b> Scanners now summarise CVEs in plain language and suggest the smallest base upgrade; Docker Scout and others recommend alternative base images automatically. Assistants can turn a scan report into a prioritised fix list in seconds.</p>
      <p><b>Use AI as a partner:</b> paste a trivy report and ask which findings disappear if you switch to distroless or remove a package. Ask it to review a Dockerfile <b>only</b> for secret handling and root usage.</p>
      <p><b>Where AI goes wrong:</b> generated examples often contain <code>ENV OPENAI_API_KEY=...</code> or <code>ARG GITHUB_TOKEN</code> "for convenience", recommend alpine for everything, or "fix" a permission error by removing <code>USER</code>. Treat any token-shaped string in AI output as a placeholder that must never become real in a Dockerfile. <b>You still own:</b> secret handling, the decision to accept a CVE, and the runtime hardening flags.</p>`,
    problems: [P({
      t: 'Remove the token baked into the image', l: 'Hard', tags: ['secrets', 'buildkit', 'security', 'node'], co: ['GitHub', 'Stripe', 'Razorpay'],
      s: `<p>A security review found this in the <code>shop-web</code> Dockerfile, built and pushed weekly for a year:</p><pre>FROM node:22
ARG NPM_TOKEN
ENV NPM_TOKEN=$NPM_TOKEN
COPY .npmrc .env ./
RUN npm install
RUN rm .npmrc
COPY . .
CMD npm start</pre><p><code>.npmrc</code> reads the token for a private registry; <code>.env</code> holds <code>STRIPE_KEY</code> and <code>DB_PASSWORD</code> (values here are placeholders). Explain exactly where each secret is exposed, then give the incident steps and a fixed Dockerfile plus the build and run commands.</p>`,
      ex: `<p>${H.c('r', 'docker history --no-trunc shop-web:latest')} shows <code>ARG NPM_TOKEN</code> and <code>ENV NPM_TOKEN=npm_PLACEHOLDER</code>; ${H.c('r', 'docker inspect')} lists it in <code>Config.Env</code>; ${H.c('r', 'docker save | tar')} finds both <code>.npmrc</code> and <code>.env</code> in the COPY layer (the later <code>rm</code> only hides <code>.npmrc</code> in the top layer). Every image pulled in the last year contains all three secrets.</p>`,
      bw: `<p>Adding <code>RUN rm .env</code> and <code>unset NPM_TOKEN</code>, then pushing a new tag. The new image still contains the files in its COPY layer, the ENV is still in the config, and every old tag in the registry and on every laptop still holds the live secrets.</p>`,
      bc: DF(`FROM node:22
ARG NPM_TOKEN
ENV NPM_TOKEN=$NPM_TOKEN
COPY .npmrc .env ./
RUN npm install && rm .npmrc .env    # still in the COPY layer and in Config.Env`),
      q: ['What must happen FIRST?', ['Revoke and rotate the npm token, Stripe key and DB password', 'Rebuild the image with a secret mount', 'Delete the old tags from the registry', 'Add .env to .dockerignore'], 0, 'Copies of the old images exist wherever they were pulled, and you cannot recall them. Only rotation makes the leaked values useless; the rebuild and cleanup come after.'],
      h: ['<p>Hint 1: list each exposure: ARG (history/provenance), ENV (config, every container\'s environment), COPY (layer content, even after rm).</p>', '<p>Hint 2: build-time secret = <code>RUN --mount=type=secret</code>; run-time secrets = <code>--env-file</code> or compose secrets, never in the image.</p>', '<p>Hint 3: incident order: rotate → fix and rebuild → purge old tags and GC the registry → scan history in Git for the same values → add guards (.dockerignore, secret scanning in CI).</p>'],
      a: `<p><b>Exposures:</b> the npm token in ARG (history) and ENV (config and every running container); <code>.npmrc</code> and <code>.env</code> in the COPY layer forever. <b>Response:</b> rotate all three credentials now; then fix the build so no secret enters any layer: the token arrives through a BuildKit secret mount for the single <code>npm ci</code> step, <code>.env</code> and <code>.npmrc</code> are excluded by .dockerignore, and the app reads <code>STRIPE_KEY</code>/<code>DB_PASSWORD</code> from the runtime environment (an env file outside Git locally, a secrets manager in the cloud). Purge old tags, run registry garbage collection, and add a CI check (trivy's secret scanner or gitleaks) so it cannot come back. Also: multi-stage, prod deps only, non-root, exec-form CMD.</p>`,
      code: DF(R`# syntax=docker/dockerfile:1
FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# Token available ONLY during this RUN, as a tmpfs file. Not in layers, ARG, ENV or history.
RUN --mount=type=secret,id=npmrc,target=/root/.npmrc \
    npm ci --omit=dev

FROM node:22-slim
ENV NODE_ENV=production
WORKDIR /app
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node . .
USER node
EXPOSE 3000
CMD ["node", "server.js"]
# .dockerignore contains: .env  .env.*  .npmrc  .git  node_modules`, 'Dockerfile (fixed)'),
      alt: [SH(R`#!/usr/bin/env bash
# Incident and rebuild runbook (values are placeholders; never paste real secrets into scripts)
set -euo pipefail

# 0) Rotate first: npm token, Stripe key, DB password (done in each provider's console/CLI).

# 1) Make sure secrets can never enter the build context or Git again
printf '%s\n' .env '.env.*' .npmrc .git node_modules >> .dockerignore
grep -qxF '.env' .gitignore || echo '.env' >> .gitignore

# 2) Build with the NEW token provided as a BuildKit secret (file stays on your machine)
docker build --secret id=npmrc,src="$HOME/.npmrc" -t localhost:5000/shop-web:2.0.0 .

# 3) Prove it is clean
docker history --no-trunc localhost:5000/shop-web:2.0.0 | grep -Ei 'token|stripe|password' && exit 1 || echo "history clean"
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy:0.56.2 \
  image --scanners secret --exit-code 1 localhost:5000/shop-web:2.0.0

# 4) Run with secrets injected at run time from a gitignored env file
docker run -d --name shop-web --env-file ./.env -p 127.0.0.1:3000:3000 localhost:5000/shop-web:2.0.0
docker push localhost:5000/shop-web:2.0.0

# 5) Delete leaked tags from the registry (for registry:2 the delete API must be enabled,
#    then run its garbage collector); on Docker Hub/GHCR/ECR delete the versions in the UI/CLI.`, 'runbook')],
      cx: `<p>Rotation is the urgent part (minutes). The Dockerfile change is small; the build is also smaller and faster thanks to multi-stage and <code>npm ci --omit=dev</code>.</p>`,
      f: ['How would you find out whether the leaked Stripe key was used?', 'How do you pass a secret to a build in GitHub Actions without it appearing in logs?']
    })]
  });

  // ───────────────────────── Topic 6: volumes and networks ─────────────────────────
  topics.push({
    title: 'Volumes and Networks: Keeping Data and Talking to Each Other',
    analogy: `<p>A container is a <b>hotel room</b>: you can unpack, but when you check out, housekeeping wipes it. A <b>volume</b> is a <b>storage locker</b> in the basement with your name on it: check out, check into a new room, and your boxes are still there. A <b>Docker network</b> is the hotel's <b>internal phone system</b>: rooms on the same system can dial each other by name ("call room <i>db</i>"), while a <b>published port</b> is the front desk line that people outside the hotel can call.</p>`,
    explain: `<p>🟢 <b>Three ways to give a container storage.</b></p>
      ${H.table(['Type', 'Example', 'Lives where', 'Use for'], [
        ['named volume', '<code>-v pgdata:/var/lib/postgresql/data</code>', 'managed by Docker (<code>/var/lib/docker/volumes</code>)', 'databases and any data that must survive <code>docker rm</code>'],
        ['bind mount', '<code>-v "$PWD/src":/app/src</code>', 'a folder on your machine', 'live code editing in development, config files'],
        ['tmpfs', '<code>--tmpfs /tmp</code>', 'memory only', 'scratch files, read-only containers']
      ])}
      <p>🟢 <b>Situation: "the database lost everything".</b> Someone ran Postgres with <code>docker run postgres:16</code>, filled it with test data, then did <code>docker rm -f</code> and started a fresh one. The data lived in the old container's storage. With a named volume, the new container mounts the same locker and the data is still there. Rule: <b>every database container gets a named volume</b> (and a backup).</p>
      <p>🔵 <b>Volume housekeeping.</b> <code>docker volume ls</code>, <code>docker volume inspect pgdata</code>, and <code>docker volume prune</code> (removes volumes no container uses: be careful). Many official images declare a <code>VOLUME</code>, so if you forget <code>-v</code> Docker creates an <b>anonymous</b> volume with a random name. <code>docker rm</code> leaves it behind (recoverable), but <code>docker rm -v</code> and <code>--rm</code> delete it.</p>
      <p>🔵 <b>Networks.</b> Every container gets its own network stack (its own <code>localhost</code>!).</p>
      ${H.table(['Network', 'Name lookup', 'Use'], [
        ['default <code>bridge</code>', '<span class="c-r">no</span> DNS by container name', 'quick one-off containers'],
        ['user-defined bridge (<code>docker network create app</code>)', '<span class="c-g">yes</span>: <code>db</code>, <code>api</code> resolve via Docker\'s DNS at 127.0.0.11', 'anything with more than one container (compose does this for you)'],
        ['<code>host</code>', 'shares the host network (Linux only; no isolation, no -p needed)', 'special cases: network tools, high packet rates'],
        ['<code>none</code>', 'no network at all', 'batch jobs that must be offline']
      ])}
      <p>🔵 <b>localhost is the container itself.</b> Inside the <code>api</code> container, <code>localhost:5432</code> means "port 5432 in the api container", where nothing listens. Containers on the same user-defined network talk by <b>name</b>: <code>db:5432</code>. To reach a service on your <b>host</b> from a container use <code>host.docker.internal</code> (Docker Desktop; on Linux add <code>--add-host=host.docker.internal:host-gateway</code>; Podman has <code>host.containers.internal</code>).</p>
      <p>🔵 <b>Publishing ports.</b> <code>-p 8080:80</code> = host port 8080 → container port 80, on <b>all</b> host interfaces (0.0.0.0). <code>-p 127.0.0.1:8080:80</code> = only from this machine. On Linux, Docker writes its own iptables rules, so a published port can be reachable from the internet <b>even if ufw says it is blocked</b>. Bind databases to 127.0.0.1, or do not publish them at all: other containers reach them over the internal network without <code>-p</code>.</p>`,
    clues: [
      '"Data was lost when the container was removed/recreated" → named volume (and backups); check for a dangling anonymous volume',
      '"Connection refused to localhost:5432 from my app container" → localhost is the app container; use the service/container name on a shared network',
      '"Containers cannot resolve each other by name" → they are on the default bridge; create a user-defined network',
      '"Database port is open to the internet even though the firewall blocks it" → Docker\'s iptables rules; bind to 127.0.0.1 or do not publish',
      '"Permission denied writing to a bind mount" → UID mismatch between container user and host folder (Podman: <code>:U</code>, SELinux: <code>:Z</code>)',
      '"Container needs to call an API running on my laptop" → <code>host.docker.internal</code> (with host-gateway on Linux)'
    ],
    code: [SH(R`#!/usr/bin/env bash
# Lab: data that survives, and containers that find each other by name
set -euo pipefail

docker network create labnet
docker volume create pgdata

# Postgres with a named volume, NOT published to the host (only labnet can reach it)
docker run -d --name db --network labnet \
  -e POSTGRES_PASSWORD=PLACEHOLDER_local_only \
  -v pgdata:/var/lib/postgresql/data \
  postgres:16
sleep 5
docker exec db psql -U postgres -c "CREATE TABLE notes(t text); INSERT INTO notes VALUES ('survives');"

# Remove the container completely, start a new one on the same volume
docker rm -f db
docker run -d --name db --network labnet -e POSTGRES_PASSWORD=PLACEHOLDER_local_only \
  -v pgdata:/var/lib/postgresql/data postgres:16
sleep 5
docker exec db psql -U postgres -tAc "SELECT t FROM notes;"     # survives

# Another container on labnet reaches it BY NAME; localhost would fail
docker run --rm --network labnet postgres:16 pg_isready -h db -p 5432        # accepting connections
docker run --rm --network labnet postgres:16 pg_isready -h localhost -p 5432 || echo "localhost = this container"

# Back up the volume with a throwaway container (works for any volume)
docker run --rm -v pgdata:/data:ro -v "$PWD":/backup alpine:3.20 \
  tar czf /backup/pgdata-$(date +%F).tgz -C /data .
# For a consistent database backup prefer: docker exec db pg_dump -U postgres > dump.sql

docker rm -f db && docker network rm labnet    # the volume stays until: docker volume rm pgdata`, 'Lab: named volume, backup, name-based networking'), SH(R`#!/usr/bin/env bash
# Development bind mount: edit code on the host, the container sees it live
set -euo pipefail
docker run --rm -it -p 127.0.0.1:8000:8000 \
  -v "$PWD/src":/app/src \
  -e FLASK_DEBUG=1 \
  api:dev
# Podman on SELinux (Fedora/RHEL):  -v "$PWD/src":/app/src:Z
# Rootless Podman, fix ownership:   -v "$PWD/data":/data:U
# Read-only config mount:           -v "$PWD/nginx.conf":/etc/nginx/nginx.conf:ro`, 'Bind mount for development')],
    codeTitle: ['Volumes and networks lab', 'Bind mounts'],
    viz: [{
      title: 'Follow a request: published port vs internal name vs localhost',
      input: '127.0.0.1:8080:80',
      inputLabel: 'a -p value: [ip:]hostPort:containerPort[/proto], or just containerPort',
      gen: function (input) {
        var p = parsePortJs(input);
        if (!p) throw new Error('Use a port mapping like 8080:80, 127.0.0.1:8080:80, 5353:53/udp or 80 (ports 1-65535)');
        var local = p.ip === '127.0.0.1';
        var hp = p.host === 'random' ? '49153 (random)' : p.host;
        var nodes = [box('lan', 'other PC on LAN', 10, 8, 18), box('br', 'your browser', 10, 40, 16), box('host', 'host ' + (local ? '127.0.0.1' : p.ip) + ':' + (p.host === 'random' ? '?' : p.host), 40, 24, 22), box('web', 'web :' + p.cport, 72, 24, 14), box('api', 'api', 72, 52, 12), box('dns', 'DNS 127.0.0.11', 92, 52, 14)];
        var edges = [['lan', 'host'], ['br', 'host'], ['host', 'web', 'DNAT'], ['api', 'web', 'web:' + p.cport], ['api', 'dns']];
        function g(hl, ehl) { return { type: 'graph', directed: true, height: 62, nodes: nodes, edges: edges, hl: hl, ehl: ehl }; }
        var f = [];
        f.push({ narr: '<code>-p ' + H.esc(input) + '</code> parses as: host IP <b>' + p.ip + '</b>, host port <b>' + p.host + '</b>, container port <b>' + p.cport + '</b>, protocol <b>' + p.proto + '</b>.' + (p.host === 'random' ? ' No host port given, so Docker picks a free high port; find it with <code>docker port web</code>.' : ''), parts: [{ type: 'table', label: 'port mapping', columns: ['field', 'value', 'meaning'], rows: [['host IP', p.ip, p.ip === '0.0.0.0' ? 'all interfaces: LAN and internet too' : 'only that address'], ['host port', hp, 'what clients outside connect to'], ['container port', p.cport, 'what the app listens on inside'], ['protocol', p.proto, p.proto === 'tcp' ? 'default' : 'must match the app']], hl: { 0: p.ip === '0.0.0.0' ? 'bad' : 'ok' } }] });
        f.push({ narr: 'Your browser opens <code>http://localhost:' + hp.split(' ')[0] + '</code>. Docker\'s NAT rule (or docker-proxy / Docker Desktop\'s port forwarder) sends it to the web container on port ' + p.cport + '. ' + H.c('g', 'Works.'), parts: [g({ br: 'cur', web: 'ok' }, { 'br-host': 'ok', 'host-web': 'ok' })] });
        f.push({ narr: 'A machine on your network tries the same port. ' + (local ? H.c('g', 'Refused') + ': the port is bound to 127.0.0.1 only. Good for databases and admin UIs.' : H.c('r', 'Reaches the container') + ': bound to all interfaces, and on Linux Docker\'s iptables rules bypass ufw. Bind to 127.0.0.1 unless the world should reach it.'), parts: [g({ lan: local ? 'bad' : 'cur', web: local ? '' : 'bad' }, local ? { 'lan-host': 'bad' } : { 'lan-host': 'bad', 'host-web': 'bad' })] });
        f.push({ narr: 'Now the <b>api</b> container (same user-defined network) calls <code>http://web:' + p.cport + '</code>. Docker\'s embedded DNS at 127.0.0.11 answers with web\'s internal IP. Note: it uses the <b>container port</b> ' + p.cport + ', not the published port, and needs no <code>-p</code> at all.', parts: [g({ api: 'cur', dns: 'sel', web: 'ok' }, { 'api-dns': 'ok', 'api-web': 'ok' })] });
        f.push({ narr: 'The api container tries <code>http://localhost:' + p.cport + '</code> instead. ' + H.c('r', 'Connection refused') + ': localhost is the api container\'s own network stack, where nothing listens on ' + p.cport + '. This is the #1 "two services cannot reach each other" bug.', parts: [g({ api: 'bad', web: 'done' }, {})] });
        return f;
      }
    }],
    examples: [
      { title: 'Recovering "lost" Postgres data from an anonymous volume', html: `<p>The official <code>postgres</code> image declares <code>VOLUME /var/lib/postgresql/data</code>. If the old container was removed with plain <code>docker rm</code> (no <code>-v</code>), its data is in a dangling anonymous volume: <code>docker volume ls -f dangling=true</code> lists long hex names. Mount one read-only into a throwaway container (<code>docker run --rm -v HEX:/data:ro alpine ls /data</code>) to find the right one, then copy it into a named volume. The guided problem walks through it.</p>` },
      { title: 'Default bridge vs user-defined network', html: `${H.table(['Command', 'Result'], [
        ['<code>docker run -d --name db redis:7</code><br><code>docker run --rm redis:7 redis-cli -h db ping</code>', '<span class="c-r">Could not resolve "db"</span> (default bridge: no DNS)'],
        ['<code>docker network create app</code><br><code>docker run -d --name db --network app redis:7</code><br><code>docker run --rm --network app redis:7 redis-cli -h db ping</code>', '<span class="c-g">PONG</span>']
      ])}` },
      { title: 'Bind mount permissions with a non-root container', html: `<p>The container runs as UID 10001 and writes to <code>-v "$PWD/out":/out</code>, but the folder on the host belongs to your user (UID 1000): <code>Permission denied</code>. Options: create the folder with the right owner (<code>sudo chown 10001 out</code>), run with <code>--user "$(id -u):$(id -g)"</code> in development, or on rootless Podman use <code>:U</code> to chown the mount automatically. Named volumes avoid most of this, because Docker copies ownership from the image path on first use.</p>` }
    ],
    deepDive: `<p>🟣 <b>What a bridge network is.</b> Docker creates a Linux bridge (like a virtual switch, e.g. <code>br-3f2a...</code>), gives each container a veth pair (one end inside the container's network namespace as <code>eth0</code>, one end on the bridge), and adds NAT rules for outbound traffic and published ports. The embedded DNS server at 127.0.0.11 inside each container answers for container names, service names and <code>--network-alias</code> names, and forwards everything else to the host's resolvers. CS Core 9 and Cloud &amp; DevOps 3 explain namespaces and NAT themselves.</p>
      <p>🟣 <b>Rootless networking.</b> Rootless Docker and Podman cannot create bridges on the host, so they use user-mode networking (slirp4netns or pasta). Consequences: ports below 1024 need <code>net.ipv4.ip_unprivileged_port_start</code>, the source IP seen by the app may be the gateway rather than the real client, and throughput is lower. Docker Desktop runs everything in a VM and forwards published ports from your OS into it.</p>
      <p>🟣 <b>Storage drivers and performance.</b> Volumes bypass the overlay filesystem, so they avoid copy-up costs: this is why databases belong on volumes. On Docker Desktop for macOS/Windows, bind mounts cross the VM boundary (VirtioFS); large <code>node_modules</code> on a bind mount are slow, so keep them in a named volume or inside the image. Volume drivers (NFS, cloud block storage) exist, but in the cloud you usually let the orchestrator handle persistent volumes (Cloud &amp; DevOps 14).</p>
      <p>🟣 <b>Backups.</b> A tar of a live database's files can be inconsistent. Use the database's own tool (<code>pg_dump</code>, <code>mysqldump</code>) or stop the container first, and <b>test restores</b>. A backup that was never restored is a hope, not a backup.</p>`,
    aiEra: `<p>🤖 <b>What AI changes.</b> "Why can my container not reach my database?" is a common AI question, and assistants answer it well when you include the network list and the connection string. They also generate backup one-liners for any volume.</p>
      <p><b>Use AI as a partner:</b> paste <code>docker network inspect NAME</code> and <code>docker inspect -f '{{json .NetworkSettings.Networks}}' api</code> and ask whether api and db share a network and what name api should use.</p>
      <p><b>Where AI goes wrong:</b> it suggests <code>--network host</code> to "fix" connectivity (removing isolation, and it does not work the same on Docker Desktop), publishes database ports on 0.0.0.0, or runs <code>docker volume prune</code> casually in a cleanup script. <b>You still own:</b> which ports are exposed to whom, and never deleting volumes without a tested backup.</p>`,
    problems: [P({
      t: 'The Postgres data that vanished: recover it and make it durable', l: 'Medium', tags: ['volumes', 'postgres', 'backup', 'data loss'], co: ['Zoho', 'Wipro', 'Shopify'],
      s: `<p>A shared test environment ran <code>docker run -d --name db -e POSTGRES_PASSWORD=... postgres:16</code>. Yesterday someone ran <code>docker rm -f db</code> and started it again with the same command, and three weeks of test data is gone. Find out whether it can be recovered, recover it into a named volume, and set things up so a recreate can never lose data again, including a backup you can restore.</p>`,
      ex: `<p>${H.c('y', 'docker volume ls -f dangling=true')} shows two 64-hex-character volumes. The official image declares <code>VOLUME /var/lib/postgresql/data</code>, so each container got an <b>anonymous</b> volume, and <code>docker rm -f</code> without <code>-v</code> left the old one behind. The new container uses a new, empty one.</p>`,
      bw: `<p>Assuming the data is gone and reseeding by hand, or running <code>docker volume prune</code> to "clean up" first, which would delete the only copy. Another weak fix is a bind mount to a random home folder with root-owned files and no backup.</p>`,
      bc: `docker volume prune -f      # deletes the dangling volume that still holds the data!
docker run -d --name db -e POSTGRES_PASSWORD=PLACEHOLDER postgres:16`,
      q: ['Why might the data still exist?', ['The image declares a VOLUME, so an anonymous volume was created and docker rm without -v kept it', 'Docker keeps a snapshot of every removed container for 30 days', 'Postgres syncs its data to the image on shutdown', 'The registry stores container data'], 0, 'A declared VOLUME creates an anonymous volume per container. It is deleted only with <code>docker rm -v</code>, <code>--rm</code> or a volume prune.'],
      h: ['<p>Hint 1: list dangling volumes and look inside each one with a throwaway, read-only container before deleting anything.</p>', '<p>Hint 2: copy the right one into a new named volume with a tar pipe (or just mount it directly under a proper name via a new container).</p>', '<p>Hint 3: from now on: <code>-v pgdata:/var/lib/postgresql/data</code>, a scheduled <code>pg_dump</code>, and a restore test into a scratch container.</p>'],
      a: `<p>Do not prune. Inspect each dangling volume read-only to find the one with your data (look for <code>PG_VERSION</code> and recent file times). Stop the new empty db, copy the old volume into a named volume <code>pgdata</code>, and start Postgres on it. Then make the setup durable: a named volume in the run command (or compose file), a logical backup with <code>pg_dump</code> on a schedule, and a restore drill into a throwaway container to prove the backup works.</p>`,
      code: SH(R`#!/usr/bin/env bash
set -euo pipefail
# Usage: ./recover.sh            -> list candidate volumes
#        ./recover.sh VOLUME     -> recover that volume into "pgdata"
# 1) Find candidate anonymous volumes (do NOT prune)
if [ "$#" -eq 0 ]; then
  docker volume ls -f dangling=true -q | while read -r v; do
    echo "== $v"
    docker run --rm -v "$v":/data:ro alpine:3.20 sh -c 'cat /data/PG_VERSION 2>/dev/null; ls -l /data | tail -n 3'
  done
  echo "Run again with the volume that holds your data: $0 VOLUME"
  exit 0
fi
OLD="$1"

# 2) Copy it into a properly named volume
docker volume create pgdata
docker run --rm -v "$OLD":/from:ro -v pgdata:/to alpine:3.20 sh -c 'cd /from && tar cf - . | tar xf - -C /to'

# 3) Restart Postgres on the named volume (same major version as the data!)
docker rm -f db
docker run -d --name db --network labnet --restart unless-stopped \
  --env-file ./db.env \
  -v pgdata:/var/lib/postgresql/data \
  -p 127.0.0.1:5432:5432 postgres:16
sleep 5 && docker exec db psql -U postgres -c '\l'

# 4) Logical backup + a restore drill into a scratch container
mkdir -p backups
docker exec db pg_dumpall -U postgres | gzip > "backups/all-$(date +%F).sql.gz"
docker run -d --name restore-test --env-file ./db.env postgres:16
sleep 5
gunzip -c "backups/all-$(date +%F).sql.gz" | docker exec -i restore-test psql -U postgres -q
docker exec restore-test psql -U postgres -tAc "SELECT count(*) FROM pg_database;"
docker rm -f restore-test`),
      cx: `<p>The copy is as fast as the disk (a few GB in under a minute). Backups cost storage and a cron job; restore drills cost minutes and are the only proof a backup works.</p>`,
      f: ['Why must the Postgres major version match when you reuse a data directory?', 'How would you schedule the backup and keep only the last 7 (see Cloud &amp; DevOps 2)?']
    })]
  });

  // ───────────────────────── Topic 7: docker compose for local stacks ─────────────────────────
  var COMPOSE_STACK = R`# compose.yaml: a local stack (web -> api -> postgres + redis)
# Start: docker compose up -d --build     Stop: docker compose down   (add -v to also delete volumes)
name: shop

services:
  web:
    build: ./web
    ports:
      - "127.0.0.1:8080:80"          # only this machine can reach it
    depends_on:
      api:
        condition: service_healthy

  api:
    build: ./api
    env_file: .env                    # gitignored; commit .env.example with placeholders
    environment:
      DATABASE_HOST: db               # the SERVICE NAME, not localhost
      DATABASE_PORT: "5432"
      DATABASE_PASSWORD_FILE: /run/secrets/db_password
      REDIS_URL: redis://cache:6379/0
    secrets:
      - db_password
    init: true                        # tini as PID 1: signals + zombie reaping
    healthcheck:
      test: ["CMD", "python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/healthz', timeout=2)"]
      interval: 10s
      timeout: 3s
      retries: 5
      start_period: 15s
    depends_on:
      db:
        condition: service_healthy    # wait until Postgres accepts connections
      cache:
        condition: service_started
    restart: unless-stopped

  db:
    image: postgres:16
    environment:
      POSTGRES_USER: app
      POSTGRES_DB: app
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password   # the image reads the file
    secrets:
      - db_password
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app -d app"]
      interval: 5s
      timeout: 3s
      retries: 10
    # no "ports:" - only services on this project's network can reach it

  cache:
    image: redis:7-alpine
    command: ["redis-server", "--save", "", "--appendonly", "no"]

  adminer:                            # optional tool, started only with --profile tools
    image: adminer:4
    profiles: ["tools"]
    ports:
      - "127.0.0.1:8081:8080"

volumes:
  pgdata:

secrets:
  db_password:
    file: ./secrets/db_password.txt   # gitignored file with a local-only value`;

  topics.push({
    title: 'Docker Compose: a Whole Local Stack in One File',
    analogy: `<p>Running five containers by hand is like cooking a five-course dinner by shouting instructions across the kitchen. A <b>compose file</b> is the <b>written menu and timing plan</b>: which dishes, which pans, what must be ready before what ("the sauce waits until the stock is done"), and which cooks share a station. One command, <code>docker compose up</code>, and the whole dinner starts in the right order, every time, on every laptop.</p>`,
    explain: `<p>🟢 <b>What compose gives you.</b> A YAML file (<code>compose.yaml</code>) that describes <b>services</b> (containers), plus the <b>networks</b>, <b>volumes</b> and <b>secrets</b> they use. Commands:</p>
      ${H.table(['Command', 'What it does'], [
        ['<code>docker compose up -d --build</code>', 'build images if needed, create the network and volumes, start everything in dependency order'],
        ['<code>docker compose ps</code>', 'services with state and health'],
        ['<code>docker compose logs -f api</code>', 'follow one service\'s logs'],
        ['<code>docker compose exec api sh</code>', 'a shell in the running api container'],
        ['<code>docker compose run --rm api python -m src.migrate</code>', 'a one-off task with the service\'s config'],
        ['<code>docker compose down</code>', 'stop and remove containers and the network (<b>volumes are kept</b>)'],
        ['<code>docker compose down -v</code>', 'also delete named volumes: your local database is gone']
      ])}
      <p>🟢 <b>Service names are hostnames.</b> Compose puts all services of a project on one network (<code>shop_default</code>) and registers each service name in DNS. So the api connects to <code>db:5432</code> and <code>cache:6379</code>. Using <code>localhost</code> inside a service is the classic "two services cannot reach each other" bug: localhost is the api container itself.</p>
      <p>🔵 <b>Start order vs ready.</b> <code>depends_on: [db]</code> only waits until the db <b>container has started</b>, not until Postgres accepts connections (that takes a few seconds). The api starts, fails to connect, and crashes. The fix is a <b>healthcheck</b> on the db plus <code>condition: service_healthy</code> on the dependency. Apps should still retry connections, because a database can restart at any time.</p>
      <p>🔵 <b>Config and secrets.</b> <code>environment:</code> for non-secret settings; <code>env_file: .env</code> for local values (gitignored, with a committed <code>.env.example</code>); <code>secrets:</code> for passwords, mounted as files at <code>/run/secrets/NAME</code>. Official images such as postgres and mysql read <code>*_FILE</code> variables, so the password never appears in <code>docker inspect</code>.</p>
      <p>🔵 <b>More useful keys.</b> <code>profiles</code> (optional tools like adminer start only with <code>--profile tools</code>), <code>init: true</code>, <code>restart: unless-stopped</code>, resource limits (<code>mem_limit</code>, <code>cpus</code>), and a <code>compose.override.yaml</code> that is merged automatically for development-only settings like bind mounts. <code>develop: watch</code> with <code>docker compose watch</code> syncs code into running containers as you save.</p>
      <p>🔵 <b>Podman.</b> <code>podman compose</code> runs the same file through a compose provider (docker-compose or podman-compose). Most keys work; check healthcheck conditions and secrets support in your version, and use <code>:Z</code> on bind mounts under SELinux.</p>`,
    clues: [
      '"api cannot connect to the database in docker compose" → use the service name (<code>db</code>), not localhost; same project network',
      '"api crashes on startup because the DB is not ready" → db healthcheck + <code>depends_on: condition: service_healthy</code>, plus retries in the app',
      '"Set up a local dev environment for a new joiner" → one compose file, <code>.env.example</code>, <code>docker compose up</code>',
      '"Database password is in the compose file in Git" → compose <code>secrets:</code> from a gitignored file, <code>*_FILE</code> variables',
      '"docker compose down deleted my data" → someone used <code>-v</code>; data lives in named volumes, back them up',
      '"Run an optional tool only sometimes" → <code>profiles</code>'
    ],
    code: [Y(COMPOSE_STACK, 'compose.yaml: web, api, postgres, redis'), Y(R`# compose.override.yaml: merged automatically by "docker compose up" on dev machines.
# Production-like runs use: docker compose -f compose.yaml up
services:
  api:
    build:
      context: ./api
      target: dev                    # a dev stage with reload tools
    volumes:
      - ./api/src:/app/src           # live code
    environment:
      LOG_LEVEL: debug
    develop:
      watch:
        - action: sync
          path: ./api/src
          target: /app/src
        - action: rebuild
          path: ./api/requirements.txt`, 'compose.override.yaml (development only)'), SH(R`#!/usr/bin/env bash
# First-time setup for the stack above (placeholders only)
set -euo pipefail
mkdir -p secrets
[ -f secrets/db_password.txt ] || openssl rand -base64 24 > secrets/db_password.txt   # random local-only value
[ -f .env ] || cp .env.example .env
printf '%s\n' '.env' 'secrets/' >> .gitignore

docker compose config --quiet && echo "compose file is valid"
docker compose up -d --build
docker compose ps                                  # db: healthy, api: healthy
docker compose exec api python -c "import socket; print(socket.gethostbyname('db'))"   # service name resolves
curl -fsS localhost:8080/ >/dev/null && echo "web OK"
docker compose --profile tools up -d adminer        # optional DB UI on 127.0.0.1:8081
docker compose logs --since 5m api | tail -n 20`, 'Bring the stack up and check it')],
    codeTitle: ['compose.yaml', 'compose.override.yaml', 'Setup script'],
    viz: [{
      title: 'Start order with healthchecks',
      input: 'web->api(healthy), api->db(healthy), api->cache, worker->db(healthy)',
      inputLabel: 'dependencies: service->dependency, add (healthy) to wait for health; db needs 3 ticks to become healthy, others 1',
      gen: function (input) {
        var deps = {}, svcs = [];
        function add(s) { if (svcs.indexOf(s) < 0) { svcs.push(s); deps[s] = deps[s] || []; } }
        String(input || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean).forEach(function (e) {
          var m = e.match(/^([a-z][\w-]*)\s*->\s*([a-z][\w-]*)\s*(\(healthy\))?$/i);
          if (!m) throw new Error('Write edges like api->db(healthy), web->api');
          add(m[1]); add(m[2]); deps[m[1]].push({ on: m[2], healthy: !!m[3] });
        });
        if (!svcs.length) throw new Error('Give at least one edge, e.g. api->db(healthy)');
        if (svcs.length > 8) throw new Error('At most 8 services');
        svcs.sort();
        var st = {}, t0 = {}; svcs.forEach(function (s) { st[s] = 'waiting'; });
        var need = function (s) { return /^(db|postgres|mysql|database)$/.test(s) ? 3 : 1; };
        var f = [], tick = 0, guard = 0;
        function row() { return svcs.map(function (s) { return [s, deps[s].map(function (d) { return d.on + (d.healthy ? ' (healthy)' : ' (started)'); }).join(', ') || '-', st[s]]; }); }
        function hl() { var h = {}; svcs.forEach(function (s, i) { h[i] = st[s] === 'healthy' ? 'ok' : (st[s] === 'starting' ? 'cur' : (st[s] === 'blocked: cycle' ? 'bad' : '')); }); return h; }
        f.push({ narr: '<code>docker compose up</code> reads the dependency graph. Nothing runs yet. Services with no dependencies can start right away.', parts: [{ type: 'table', label: 'tick 0', columns: ['service', 'waits for', 'state'], rows: row(), hl: hl() }] });
        while (svcs.some(function (s) { return st[s] !== 'healthy'; }) && guard++ < 30) {
          tick++;
          var events = [];
          svcs.forEach(function (s) { if (st[s] === 'starting' && tick - t0[s] >= need(s)) { st[s] = 'healthy'; events.push(s + ' is healthy'); } });
          svcs.forEach(function (s) {
            if (st[s] !== 'waiting') return;
            var ready = deps[s].every(function (d) { return d.healthy ? st[d.on] === 'healthy' : st[d.on] !== 'waiting'; });
            if (ready) { st[s] = 'starting'; t0[s] = tick; events.push(s + ' starts'); }
          });
          if (!events.length && !svcs.some(function (s) { return st[s] === 'starting'; })) {
            svcs.forEach(function (s) { if (st[s] === 'waiting') st[s] = 'blocked: cycle'; });
            f.push({ narr: H.c('r', 'Deadlock') + ': the remaining services wait on each other (a dependency cycle). Compose refuses such a file with "dependency cycle detected".', parts: [{ type: 'table', label: 'tick ' + tick, columns: ['service', 'waits for', 'state'], rows: row(), hl: hl() }] });
            break;
          }
          f.push({ narr: 'Tick ' + tick + ': ' + (events.length ? events.join('; ') : 'waiting for healthchecks to pass') + '.' + (events.some(function (e) { return /db starts/.test(e); }) ? ' The db container is <b>started</b>, but Postgres needs a few seconds before <code>pg_isready</code> succeeds.' : ''), parts: [{ type: 'table', label: 'tick ' + tick, columns: ['service', 'waits for', 'state'], rows: row(), hl: hl() }] });
        }
        f.push({ narr: 'Without <code>condition: service_healthy</code>, dependents would start as soon as the db <b>container</b> started, then crash with "connection refused" while Postgres is still initialising. With it, each service starts only when what it needs is actually ready.', parts: [{ type: 'text', label: 'rule', html: '<ul><li>healthcheck on every service others depend on</li><li><code>condition: service_healthy</code> for databases and APIs</li><li>apps still retry: health can change later</li></ul>' }] });
        return pad4(f, 'Add more edges to see a longer start sequence.');
      }
    }],
    examples: [
      { title: 'The localhost bug in one line', html: `${H.table(['In api\'s config', 'Result in compose'], [
        ['<code>DATABASE_URL=postgresql://app:PLACEHOLDER@localhost:5432/app</code>', '<span class="c-r">connection refused</span>: nothing listens on 5432 inside the api container'],
        ['<code>DATABASE_URL=postgresql://app:PLACEHOLDER@db:5432/app</code>', '<span class="c-g">connects</span>: <code>db</code> resolves to the db container on <code>shop_default</code>'],
        ['<code>...@host.docker.internal:5432/app</code>', 'connects to a Postgres on your <b>laptop</b>, not the compose one']
      ])}<p>It "worked on my machine" because the developer ran the api directly on the laptop, where localhost did have Postgres on 5432.</p>` },
      { title: 'down vs down -v vs rm', html: `${H.table(['Command', 'Containers', 'Network', 'Named volumes'], [
        ['<code>docker compose stop</code>', 'stopped (kept)', 'kept', 'kept'],
        ['<code>docker compose down</code>', 'removed', 'removed', '<span class="c-g">kept</span>'],
        ['<code>docker compose down -v</code>', 'removed', 'removed', '<span class="c-r">deleted</span>']
      ])}` },
      { title: 'Segmenting networks', html: `<p>By default every service shares one network. For a closer match to production, define <code>frontend</code> and <code>backend</code> networks: web on both, api on both, db only on backend. Now web cannot talk to the database directly, even by mistake. Use <code>internal: true</code> on backend to block outbound internet from the database too.</p>` }
    ],
    deepDive: `<p>🟣 <b>How compose names things.</b> The project name (folder name, <code>name:</code> key or <code>-p</code>) prefixes everything: network <code>shop_default</code>, volume <code>shop_pgdata</code>, containers <code>shop-api-1</code>. Two clones of the same repo in folders with the same name share volumes, a common source of "my data changed". Labels (<code>com.docker.compose.project</code>) let compose find its resources again.</p>
      <p>🟣 <b>Recreate rules.</b> <code>up</code> compares the desired config hash with each running container and recreates only changed services. <code>--build</code> rebuilds images; <code>--force-recreate</code> recreates all; <code>--no-deps</code> touches one service. Changing an <code>env_file</code> value does recreate the container on the next <code>up</code>.</p>
      <p>🟣 <b>Interpolation.</b> Compose substitutes dollar-brace variables from your shell and a <code>.env</code> file in the project folder <b>before</b> parsing (for example an image tag variable). That <code>.env</code> is for compose itself; <code>env_file:</code> is for the container. Mixing them up is a frequent confusion. <code>docker compose config</code> prints the fully resolved file, which is the first debugging step.</p>
      <p>🟣 <b>Compose in production?</b> Fine for a single host (small internal tools, edge boxes), with <code>restart:</code> policies and a reverse proxy. For several hosts, rolling updates and self-healing across machines, move to Kubernetes or a managed container service (Cloud &amp; DevOps 12-14). The Compose Specification is also accepted by some platforms directly, and tools like Kompose translate it to Kubernetes manifests as a starting point.</p>`,
    aiEra: `<p>🤖 <b>What AI changes.</b> "Write a compose file for Django + Postgres + Redis + Celery" is one prompt, and agents spin up compose stacks to run integration tests. AI is good at the YAML; it is weaker at the operational details.</p>
      <p><b>Use AI as a partner:</b> paste <code>docker compose config</code> output and ask: which services depend on health, which ports are reachable from outside, and where secrets come from.</p>
      <p><b>Where AI goes wrong:</b> it still emits the obsolete <code>version: "3.8"</code> key, uses <code>depends_on</code> without health conditions, writes <code>POSTGRES_PASSWORD: password</code> inline, publishes the database on 0.0.0.0, and uses <code>localhost</code> in connection strings. <b>You still own:</b> service-name addressing, healthchecks, secrets and which ports are published.</p>`,
    problems: [P({
      t: 'Two services that cannot reach each other', l: 'Medium', tags: ['docker compose', 'networking', 'healthcheck', 'secrets'], co: ['Microsoft', 'Freshworks', 'Paytm'],
      s: `<p>A new joiner runs the team's stack and the api keeps restarting with <code>could not connect to server: Connection refused (localhost:5432)</code>. Sometimes, after a few restarts, it fails with <code>the database system is starting up</code> instead. The compose file:</p><pre>version: "3.8"
services:
  api:
    build: ./api
    ports: ["8000:8000"]
    environment:
      DATABASE_URL: postgresql://app:supersecret@localhost:5432/app
    depends_on: [db]
  db:
    image: postgres:16
    ports: ["5432:5432"]
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: supersecret
      POSTGRES_DB: app</pre><p>Fix connectivity and start order, stop the password living in Git, keep the data across restarts, and stop exposing the database to the network.</p>`,
      ex: `<p>Inside the api container, ${H.c('r', 'localhost:5432')} is the api container itself. ${H.c('g', 'db:5432')} is Postgres. And <code>depends_on: [db]</code> only waits for the db container to <b>start</b>, so the api races Postgres initialisation.</p>`,
      bw: `<p>Setting <code>network_mode: host</code> on both services so localhost "works". It removes isolation, breaks on Docker Desktop (where host means the VM), and leaves the start race and the committed password in place. Adding <code>sleep 20</code> to the api command is the other classic: slow and still flaky.</p>`,
      bc: Y(`services:
  api:
    build: ./api
    network_mode: host        # hides the bug, removes isolation
    command: ["sh", "-c", "sleep 20 && python -m src.app"]`),
      q: ['Which change fixes the "Connection refused (localhost:5432)" error by itself?', ['Use <code>db</code> as the host in the connection string', 'Add <code>ports: ["5432:5432"]</code> to db', 'Add <code>restart: always</code> to api', 'Remove <code>depends_on</code>'], 0, 'Services on the same compose network reach each other by service name. Publishing ports only matters for clients outside Docker.'],
      h: ['<p>Hint 1: inside a container, localhost is that container. Compose registers each service name in DNS on the project network.</p>', '<p>Hint 2: a healthcheck with <code>pg_isready</code> plus <code>depends_on: db: condition: service_healthy</code> fixes the race.</p>', '<p>Hint 3: password → compose <code>secrets:</code> + <code>POSTGRES_PASSWORD_FILE</code>; data → named volume; exposure → drop db <code>ports</code> (or bind to 127.0.0.1); drop the obsolete <code>version:</code> key.</p>'],
      a: `<p>Address the database by service name; gate the api on a real readiness signal; move the password out of Git into a secret file that both services read; give Postgres a named volume; publish only what humans need (the api, on 127.0.0.1). The api builds its connection string from <code>DATABASE_HOST</code> plus the password file and retries on failure, so a database restart does not crash-loop it.</p>`,
      code: Y(R`services:
  api:
    build: ./api
    ports:
      - "127.0.0.1:8000:8000"
    environment:
      DATABASE_HOST: db                       # service name on the project network
      DATABASE_PORT: "5432"
      DATABASE_USER: app
      DATABASE_NAME: app
      DATABASE_PASSWORD_FILE: /run/secrets/db_password
    secrets:
      - db_password
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped

  db:
    image: postgres:16
    environment:
      POSTGRES_USER: app
      POSTGRES_DB: app
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    secrets:
      - db_password
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app -d app"]
      interval: 5s
      timeout: 3s
      retries: 10
      start_period: 10s

volumes:
  pgdata:

secrets:
  db_password:
    file: ./secrets/db_password.txt           # gitignored`, 'compose.yaml (fixed)'),
      alt: [SH(R`#!/usr/bin/env bash
# Prove each fix
set -euo pipefail
mkdir -p secrets && [ -f secrets/db_password.txt ] || openssl rand -base64 24 > secrets/db_password.txt
grep -qxF 'secrets/' .gitignore || echo 'secrets/' >> .gitignore
docker compose up -d --build
docker compose ps                                   # db (healthy), api (running)
docker compose exec api getent hosts db             # 172.x.y.z  db
docker compose exec api sh -c 'test -r /run/secrets/db_password && echo "secret mounted"'
docker inspect -f '{{json .Config.Env}}' "$(docker compose ps -q db)" | grep -c supersecret || echo "no password in env"
nc -z -w 2 "$(hostname -I | awk '{print $1}')" 5432 || echo "db not reachable from the LAN (good)"
docker compose down && docker compose up -d && docker compose exec db psql -U app -d app -c '\dt'   # data kept`, 'verify')],
      cx: `<p>Startup waits a few seconds for the healthcheck instead of crash-looping. No runtime cost; one less open port.</p>`,
      f: ['Why should the app still retry even with <code>service_healthy</code>?', 'How would you run database migrations once before the api starts? (a one-shot service with <code>condition: service_completed_successfully</code>)']
    })]
  });

  // ───────────────────────── Topic 8: registries and debugging containers ─────────────────────────
  topics.push({
    title: 'Registries and Debugging Containers: Ship It, Then Find Out Why It Broke',
    analogy: `<p>A <b>registry</b> is a <b>warehouse</b> for frozen meals: you deliver boxes with a label (the tag), the warehouse stamps each box with a unique barcode (the digest), and any kitchen can order by label or, more safely, by barcode. <b>Debugging a container</b> is being the restaurant manager when a dish comes back: first read the complaint (logs), then look into the kitchen (exec), read the order ticket (inspect), and check whether the cooks are overloaded (stats). You go in that order because each step is cheaper than the next.</p>`,
    explain: `<p>🟢 <b>Registries in four commands.</b> <code>docker tag api:1.0 localhost:5000/api:1.0</code> gives the image a name that includes the registry host. <code>docker push localhost:5000/api:1.0</code> uploads only the layers the registry does not have yet. <code>docker pull</code> does the reverse on another machine. <code>docker login HOST</code> stores credentials for private registries.</p>
      ${H.table(['Registry', 'Name format', 'Notes'], [
        ['local <code>registry:2</code>', '<code>localhost:5000/api:1.0</code>', 'what our labs use; no account; Docker allows plain HTTP for localhost (Podman needs <code>--tls-verify=false</code>)'],
        ['Docker Hub', '<code>docker.io/acme/api:1.0</code>', 'default; anonymous pulls are rate-limited, so CI should log in or use a mirror'],
        ['GitHub (GHCR)', '<code>ghcr.io/acme/api:1.0</code>', 'login with a token that has package scopes; good for GitHub Actions'],
        ['AWS ECR', '<code>123456789012.dkr.ecr.eu-west-1.amazonaws.com/api:1.0</code>', '<code>aws ecr get-login-password | docker login --password-stdin ...</code>; supports immutable tags and scan on push']
      ])}
      <p>🟢 <b>Tags vs digests.</b> A tag is a <b>sticky note</b> that can be moved to a new image; a digest is the content's fingerprint. Use meaningful, unique tags (<code>1.4.2</code>, the Git SHA), never deploy <code>latest</code>, and record the digest that was deployed. Turn on <b>tag immutability</b> where the registry supports it, so <code>1.4.2</code> can never be overwritten.</p>
      <p>🔵 <b>The debugging ladder.</b> Climb one step at a time:</p>
      ${H.table(['Step', 'Command', 'Answers'], [
        ['1. Status', '<code>docker ps -a</code>', 'running, restarting, or exited, and with which exit code?'],
        ['2. Logs', '<code>docker logs --tail 100 -t api</code>', 'what did the app say before it died? (works on exited containers too)'],
        ['3. Inspect', "<code>docker inspect -f '{{json .State}}' api</code>", 'ExitCode, OOMKilled, Error, health log, restart count; also env, mounts, networks, command'],
        ['4. Exec', '<code>docker exec -it api sh</code>', 'look around inside a running container: files, env, DNS, connectivity'],
        ['5. Stats', '<code>docker stats --no-stream</code>', 'CPU, memory vs limit, network and PIDs right now'],
        ['6. Events', '<code>docker events --since 30m --filter container=api</code>', 'a timeline: die, oom, health_status, restart']
      ])}
      <p>🔵 <b>Exit codes tell you a lot.</b> 0 = finished normally (was it supposed to?), 1 = the app failed (read the logs), 125 = <code>docker run</code> itself failed (bad flag), 126 = the command is not executable, 127 = command not found (typo, missing binary, Windows line endings in a script), <b>137</b> = killed by SIGKILL (out of memory or <code>docker stop</code> timed out), 139 = segfault, 143 = SIGTERM (normal stop). Codes above 128 are "128 + signal number".</p>
      <p>🔵 <b>No shell in the image?</b> Distroless and scratch images have no <code>sh</code>. Options: <code>docker debug api</code> (Docker Desktop and Pro: attaches a toolbox shell), a debug sidecar sharing the namespaces (<code>docker run -it --rm --pid container:api --network container:api nicolaka/netshoot</code>), or the image's <code>:debug</code> variant.</p>`,
    clues: [
      '"Container keeps restarting" / "CrashLoop" → <code>docker ps -a</code> exit code, <code>docker logs</code>, <code>inspect .State</code> (OOMKilled?)',
      '"Exited (137)" → SIGKILL: out of memory (check OOMKilled and the memory limit) or a stop timeout',
      '"Exited (127)" → command not found: wrong path, missing binary, CRLF line endings, wrong architecture shell',
      '"How do you debug a distroless container?" → docker debug, a netshoot sidecar sharing its namespaces, or a :debug image',
      '"Which version is running?" → <code>docker inspect</code> image digest; tags can move',
      '"Pull rate limit exceeded in CI" → log in to Docker Hub, use a pull-through mirror or your own registry'
    ],
    code: [SH(R`#!/usr/bin/env bash
# Lab: a local registry, push, pull by digest, and list what is stored. No account needed.
set -euo pipefail
docker run -d -p 5000:5000 --restart unless-stopped --name registry \
  -v registry-data:/var/lib/registry registry:2 2>/dev/null || docker start registry

docker pull alpine:3.20
docker tag alpine:3.20 localhost:5000/tools/alpine:3.20
docker push localhost:5000/tools/alpine:3.20        # prints "digest: sha256:..."

curl -s localhost:5000/v2/_catalog                    # {"repositories":["tools/alpine"]}
curl -s localhost:5000/v2/tools/alpine/tags/list      # {"name":"tools/alpine","tags":["3.20"]}

# Pull by digest: exactly this content, forever
digest=$(docker inspect --format '{{index .RepoDigests 0}}' localhost:5000/tools/alpine:3.20)
echo "$digest"
docker rmi localhost:5000/tools/alpine:3.20
docker pull "$digest"

# Podman equivalents:
#   podman push --tls-verify=false localhost:5000/tools/alpine:3.20
# Optional real registries (need accounts): docker login ghcr.io / docker.io / ECR`, 'Lab: local registry'), SH(R`#!/usr/bin/env bash
# The debugging ladder as a reusable script: ./why.sh CONTAINER
set -euo pipefail
c="$1"
echo "== status";   docker ps -a --filter "name=^$c$" --format '{{.Names}}  {{.Status}}  {{.Image}}'
echo "== state";    docker inspect -f 'exit={{.State.ExitCode}} oom={{.State.OOMKilled}} restarts={{.RestartCount}} error={{.State.Error}}' "$c"
echo "== health";   docker inspect -f '{{if .State.Health}}{{.State.Health.Status}} {{range .State.Health.Log}}[{{.ExitCode}}] {{.Output}}{{end}}{{else}}no healthcheck{{end}}' "$c"
echo "== limits";   docker inspect -f 'memory={{.HostConfig.Memory}} cpus={{.HostConfig.NanoCpus}} pids={{.HostConfig.PidsLimit}}' "$c"
echo "== command";  docker inspect -f 'entrypoint={{json .Config.Entrypoint}} cmd={{json .Config.Cmd}} user={{.Config.User}}' "$c"
echo "== logs";     docker logs --tail 30 -t "$c" 2>&1
echo "== events";   docker events --since 30m --until 0s --filter "container=$c" --format '{{.Time}} {{.Action}}'
if [ "$(docker inspect -f '{{.State.Running}}' "$c")" = "true" ]; then
  echo "== stats";  docker stats --no-stream "$c"
  echo "== procs";  docker top "$c"
fi`, 'why.sh: the debugging ladder in one script'), SH(R`#!/usr/bin/env bash
# Debugging inside: when there is a shell, and when there is not
set -euo pipefail
docker exec api sh -c 'id; env | sort | grep -v -i -E "pass|secret|token|key"; cat /etc/resolv.conf'
docker exec api getent hosts db                       # does the name resolve?
# A distroless container: borrow tools from a sidecar that shares its PID and network namespaces
docker run --rm -it --pid container:api --network container:api nicolaka/netshoot \
  sh -c 'ps aux; ss -lntp; curl -sv http://127.0.0.1:8000/healthz'
# Start a crashing image with a shell instead of its command, to look around
docker run --rm -it --entrypoint sh api:1.0
# Copy a file out of a stopped container for analysis
docker cp api:/app/logs/error.log ./error.log`, 'Getting inside')],
    codeTitle: ['Local registry lab', 'Debugging ladder script', 'Getting inside a container'],
    viz: [{
      title: 'From exit code to next command',
      input: '137',
      inputLabel: 'the exit code from docker ps -a (0-255)',
      gen: function (input) {
        var code = Number(String(input || '').trim());
        if (!/^\d+$/.test(String(input || '').trim()) || code > 255) throw new Error('Type an exit code between 0 and 255, e.g. 137');
        var meaning = exitInfo(code);
        var next = {
          0: ['Was it meant to keep running? Check if CMD daemonizes or is a one-shot task.', "docker inspect -f '{{json .Config.Cmd}}' api"],
          125: ['The run command itself failed (bad flag, name conflict, port in use).', 'read the error printed by docker run'],
          126: ['The file exists but cannot be executed: missing +x or wrong architecture.', "docker run --rm --entrypoint sh api:1.0 -c 'ls -l /app'"],
          127: ['Command not found: typo, binary missing in the runtime stage, or CRLF line endings in a script.', "docker run --rm --entrypoint sh api:1.0 -c 'which gunicorn; head -1 /entrypoint.sh | od -c | head -2'"],
          137: ['SIGKILL: check OOMKilled first, then whether docker stop timed out.', "docker inspect -f '{{.State.OOMKilled}}' api; docker stats --no-stream"],
          139: ['Segmentation fault in native code: often a musl/glibc mismatch or a wrong-arch library.', 'docker logs api; check base image and platform'],
          143: ['SIGTERM: a normal stop (docker stop, compose down, a deploy).', 'docker events --filter container=api --since 1h']
        };
        var n = next[code] || (code > 128 ? ['Killed by signal ' + (code - 128) + '.', 'kill -l ' + (code - 128) + '; docker events'] : ['The application exited with an error.', 'docker logs --tail 100 api']);
        var steps = [
          ['1. status', 'docker ps -a', 'api  Exited (' + code + ') 5 seconds ago'],
          ['2. meaning', code > 128 ? code + ' = 128 + ' + (code - 128) : 'plain exit code', meaning],
          ['3. evidence', n[1], n[0]],
          ['4. logs', 'docker logs --tail 50 api', 'the app\'s last words, if it had time to say any']
        ];
        var f = [];
        steps.forEach(function (s, i) {
          var hl = {}; for (var k = 0; k < i; k++) hl[k] = 'done'; hl[i] = 'cur';
          f.push({ narr: '<b>' + s[0] + '</b>: <code>' + H.esc(s[1]) + '</code> → ' + H.esc(s[2]), parts: [{ type: 'table', label: 'debugging ladder for exit ' + code, columns: ['step', 'command', 'finding'], rows: steps.slice(0, i + 1).map(function (r) { return r.slice(); }), hl: hl }] });
        });
        var fix = code === 137 ? 'If OOMKilled=true: find the leak or raise the memory limit; for the JVM set -XX:MaxRAMPercentage. If false: make the app handle SIGTERM (exec form, --init).' : code === 127 || code === 126 ? 'Fix the image: copy the binary into the runtime stage, chmod +x, convert CRLF, build for the right platform.' : code === 0 ? 'Run the server in the foreground as PID 1.' : 'Read the logs, reproduce with docker run --rm -it, fix, rebuild with a new tag.';
        f.push({ narr: 'Next action: ' + fix, parts: [{ type: 'vars', label: 'summary', vals: { exit: code, meaning: meaning, next: n[1] }, hl: { meaning: code === 0 || code === 143 ? 'ok' : 'bad' } }] });
        return f;
      }
    }, {
      title: 'docker push: only missing layers travel',
      gen: function () {
        var layers = [['base (debian slim)', 'exists'], ['python runtime', 'exists'], ['pip packages', 'exists'], ['your code', 'new'], ['config + manifest', 'new']];
        var f = [], rows = layers.map(function (l) { return [l[0], '?', '']; });
        f.push({ narr: '<code>docker push localhost:5000/api:1.0.1</code>. A code change rebuilt only the top layer, so most layers are already in the registry from 1.0.0.', parts: [{ type: 'table', label: 'layers of api:1.0.1', columns: ['layer', 'in registry?', 'action'], rows: rows.map(function (r) { return r.slice(); }), hl: {} }] });
        layers.forEach(function (l, i) {
          rows[i][1] = l[1] === 'exists' ? 'yes' : 'no'; rows[i][2] = l[1] === 'exists' ? 'Layer already exists (skipped)' : 'Pushed';
          var hl = {}; hl[i] = l[1] === 'exists' ? 'done' : 'ok';
          f.push({ narr: 'The client asks the registry (HEAD request by digest) whether <b>' + l[0] + '</b> exists. ' + (l[1] === 'exists' ? 'Yes: skipped. This is why good layer order also makes pushes and pulls fast.' : 'No: uploaded.'), parts: [{ type: 'table', label: 'layers of api:1.0.1', columns: ['layer', 'in registry?', 'action'], rows: rows.map(function (r) { return r.slice(); }), hl: hl }] });
        });
        f.push({ narr: 'Finally the manifest is stored and the tag <code>1.0.1</code> points to it. The push prints the <b>digest</b>: record it in your deploy log.', parts: [{ type: 'vars', label: 'result', vals: { tag: '1.0.1', digest: 'sha256:... (printed by push)', uploaded: '2 of 5 items' }, hl: { digest: 'sel' } }] });
        return f;
      }
    }],
    examples: [
      { title: 'Exit 127 that is not a typo', html: `<p>An image built on Windows runs <code>ENTRYPOINT ["/entrypoint.sh"]</code> and dies with <code>exec /entrypoint.sh: no such file or directory</code> (exit 127 or 255) although the file is there. The first line is <code>#!/bin/sh\\r</code>: Windows line endings make the kernel look for a program called <code>sh\\r</code>. Fix: <code>.gitattributes</code> with <code>*.sh text eol=lf</code>, or <code>sed -i 's/\\r$//'</code> in the build.</p>` },
      { title: 'docker stats during a load test', html: `<pre>NAME   CPU %   MEM USAGE / LIMIT   MEM %   PIDS
api    185%    498MiB / 512MiB     97.3%   41
db     22%     310MiB / 1GiB       30.3%   12</pre><p>api is at 97% of its memory limit and uses almost 2 CPUs: the next spike gets it OOM-killed (exit 137, <code>OOMKilled=true</code>). Either the limit is too low for this load or memory grows without bound (a leak): compare over time before raising the limit.</p>` },
      { title: 'Healthcheck says unhealthy, logs say fine', html: `<p><code>docker inspect -f '{{json .State.Health}}' api</code> shows the check output: <code>curl: not found</code>. The team moved to a slim base without curl, so every healthcheck fails and compose never starts the web service that waits for <code>service_healthy</code>. Fix: a check that uses tools in the image (Python, the app binary with a <code>--health</code> flag, or <code>wget</code> on alpine).</p>` }
    ],
    deepDive: `<p>🟣 <b>Registry protocol.</b> The OCI Distribution API is plain HTTP: <code>GET /v2/NAME/manifests/TAG</code> returns a manifest (or an index for multi-platform), blobs are fetched by digest from <code>/v2/NAME/blobs/sha256:...</code>, and uploads are chunked with a final digest check. Deleting a tag removes a pointer; space returns only after the registry's garbage collection. Pull-through caches (registry:2 with <code>proxy.remoteurl</code>, or a cloud cache) protect CI from rate limits and upstream outages.</p>
      <p>🟣 <b>Logs.</b> <code>docker logs</code> reads what PID 1 writes to stdout/stderr, stored by the logging driver (default <code>json-file</code>, which grows without limit unless you set <code>max-size</code>/<code>max-file</code> in <code>daemon.json</code>). Apps that log to files inside the container are invisible to <code>docker logs</code>; symlink them to <code>/dev/stdout</code> as the nginx image does. Cloud &amp; DevOps 15 ships these logs to a central system.</p>
      <p>🟣 <b>Going below Docker.</b> When the daemon itself is the problem, <code>journalctl -u docker</code> and <code>journalctl -u containerd</code> show its logs; <code>nsenter -t PID -n ss -lntp</code> enters a container's network namespace from the host using the PID from <code>docker inspect -f '{{.State.Pid}}'</code>; <code>systemd-cgls</code> and the cgroup files show real memory use. CS Core 9 explains what those namespaces and cgroups are.</p>
      <p>🟣 <b>OOM details.</b> When a container hits its memory limit, the kernel's OOM killer kills a process in that cgroup. If it was PID 1, the container exits 137 with <code>OOMKilled=true</code>; if it was a child (a gunicorn worker), the container keeps running and the app just loses a worker, visible only in <code>dmesg</code> or the app logs. Language runtimes need to know the limit: modern JVMs, Node (set <code>--max-old-space-size</code>) and Go (<code>GOMEMLIMIT</code>) each handle it differently.</p>`,
    aiEra: `<p>🤖 <b>What AI changes.</b> Pasting <code>docker logs</code> and <code>docker inspect</code> output into an assistant gives a fast first diagnosis, and AI-assisted tools (Docker's own assistant, IDE agents) can run the ladder for you. Registries now summarise scan results and suggest fixed base images.</p>
      <p><b>Use AI as a partner:</b> give it the exit code, OOMKilled flag, memory limit, the last 50 log lines and the Dockerfile, and ask for the two most likely causes and the command that would confirm each. Remove secrets from env output before pasting.</p>
      <p><b>Where AI goes wrong:</b> it jumps to "raise the memory limit" or "add restart: always" without checking for a leak, invents flags, or suggests <code>--privileged</code> to make a debugging tool work. <b>You still own:</b> confirming the cause with evidence, redacting secrets from what you share, and turning the fix into a new image rather than a hand edit.</p>`,
    problems: [P({
      t: 'Debug the container that keeps restarting', l: 'Hard', tags: ['debugging', 'oom', 'exit codes', 'docker stats'], co: ['Netflix', 'Uber', 'PhonePe'],
      s: `<p>After a release, <code>docker ps</code> shows <code>reports-api  Restarting (137) 12 seconds ago</code>. It was started with <code>--restart unless-stopped --memory 256m</code>. The logs end abruptly in the middle of a "generating monthly report" line, with no stack trace. Find the cause with evidence, fix it properly, and add a guard so you hear about it before users do.</p>`,
      ex: `<p>${H.c('r', 'docker inspect -f "{{.State.OOMKilled}} {{.RestartCount}}"')} prints <code>true 14</code>. ${H.c('y', 'docker stats')} shows memory climbing from 120 MiB to 256 MiB in about 40 s after each start. The new release loads a whole month of rows into memory at once for the report.</p>`,
      bw: `<p>Raising <code>--memory</code> to 4g and moving on. The crash stops for now, but the report still loads everything into memory; next month's bigger data set kills it again, and in the meantime the container can starve its neighbours on the host.</p>`,
      bc: `docker update --memory 4g --memory-swap 4g reports-api   # hides the problem until next month`,
      q: ['Exit 137 with <code>OOMKilled=false</code> would most likely mean...', ['A SIGKILL from outside, such as docker stop timing out after SIGTERM was ignored', 'The container ran out of memory', 'A command was not found', 'The image was the wrong architecture'], 0, '137 = 128 + 9 (SIGKILL). If the kernel OOM killer did not do it, the usual sender is Docker after the stop grace period, or someone running docker kill.'],
      h: ['<p>Hint 1: the exit code 137 means SIGKILL; the logs end without an error because the process got no chance to write one.</p>', '<p>Hint 2: <code>inspect .State.OOMKilled</code> plus <code>docker stats</code> over time separates "limit too small" from "unbounded growth".</p>', '<p>Hint 3: fix the code path (stream or paginate the query), set a limit that matches real peak plus headroom, tell the runtime about it, add a healthcheck and alert on restarts.</p>'],
      a: `<p>Evidence first: exit 137, <code>OOMKilled=true</code>, restart count climbing, and memory rising steadily to the 256 MiB limit after each start. That points to the release's report code holding a month of rows in memory. Fix in the app: stream rows in batches (server-side cursor) so memory stays flat. Then right-size: measure the new peak under a realistic report, set the limit to peak plus headroom, and make the runtime respect it. Finally add detection: a healthcheck, a restart-count alert, and a reproduction of the fix in a throwaway container with the same limit before redeploying a new tag.</p>`,
      code: SH(R`#!/usr/bin/env bash
set -euo pipefail
c=reports-api
# 1) Evidence
docker ps -a --filter "name=^$c$" --format '{{.Status}}'
docker inspect -f 'exit={{.State.ExitCode}} oom={{.State.OOMKilled}} restarts={{.RestartCount}} limit={{.HostConfig.Memory}}' "$c"
docker events --since 1h --filter "container=$c" --filter event=oom --format '{{.Time}} {{.Action}}' --until 0s
docker logs --tail 20 -t "$c"

# 2) Watch memory grow after a restart (one sample every 5 s, 12 samples)
for i in $(seq 1 12); do
  docker stats --no-stream --format '{{.Name}} {{.MemUsage}} {{.MemPerc}}' "$c"
  sleep 5
done

# 3) Reproduce the fixed build under the SAME limit before deploying
docker build -t reports-api:1.8.1 .
docker run -d --name reports-test --memory 256m --memory-swap 256m \
  --env-file ./.env reports-api:1.8.1
docker exec reports-test python -m reports.monthly --month 2026-09
docker stats --no-stream reports-test       # stays flat (batches of 5,000 rows)
docker inspect -f 'oom={{.State.OOMKilled}}' reports-test
docker rm -f reports-test

# 4) Redeploy with a right-sized limit, a healthcheck and visible restarts
docker rm -f "$c"
docker run -d --name "$c" --restart unless-stopped --memory 384m --memory-swap 384m \
  --health-cmd "python -c \"import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/healthz', timeout=2)\"" \
  --health-interval 15s --env-file ./.env -p 127.0.0.1:8000:8000 reports-api:1.8.1
# Simple guard: alert (here, print) if the restart count grows; run from cron every 5 minutes
[ "$(docker inspect -f '{{.RestartCount}}' "$c")" -gt 0 ] && echo "ALERT: $c restarted" >&2 || true`),
      cx: `<p>Diagnosis takes minutes with the ladder. The real fix (streaming) makes memory O(batch size) instead of O(rows in a month), so the limit stays valid as data grows.</p>`,
      f: ['How would the same symptom look in Kubernetes? (<code>OOMKilled</code> in <code>kubectl describe pod</code>, CrashLoopBackOff)', 'Why is <code>--memory-swap</code> set equal to <code>--memory</code>?']
    })]
  });

  // ───────────────────────── Practice: Easy ─────────────────────────
  var PYC = '<p>Pure computation, Python 3 standard library only. The model answer for the real task is the bash/Dockerfile snippet; the Python function is tested.</p>';

  practice.push(P({
    t: 'Parse a -p port mapping', l: 'Easy', tags: ['ports', 'networking', 'python'], co: ['AWS Support', 'TCS', 'Cognizant'], c: PYC,
    s: `<p>Support tickets often say "I ran <code>-p 127.0.0.1:8080:80</code> and my colleague cannot reach it". Write <code>parse_port(spec)</code> that splits a Docker <code>-p</code> value into <code>[host_ip, host_port, container_port, protocol]</code>. Formats: <code>CPORT</code>, <code>HPORT:CPORT</code>, <code>IP:HPORT:CPORT</code>, <code>IP::CPORT</code>, each optionally ending in <code>/tcp</code>, <code>/udp</code> or <code>/sctp</code>. Defaults: IP <code>0.0.0.0</code>, protocol <code>tcp</code>, and a missing host port is <code>"random"</code>. Ports must be 1-65535 and IPv4 octets 0-255; anything else returns <code>["invalid"]</code>. No port ranges, no IPv6.</p>`,
    ex: `<p><code>parse_port("127.0.0.1:8080:80")</code> → ${H.c('g', '["127.0.0.1", "8080", "80", "tcp"]')}: only this machine can connect, on 8080. <code>parse_port("80")</code> → ${H.c('y', '["0.0.0.0", "random", "80", "tcp"]')}: Docker picks a free host port (see <code>docker port</code>). <code>parse_port("70000:80")</code> → ${H.c('r', '["invalid"]')}.</p>`,
    bw: `<p>Splitting on <code>:</code> and assuming three parts. It crashes on <code>80</code>, swaps fields on <code>8080:80</code>, and keeps <code>/udp</code> glued to the container port.</p>`,
    bc: PY(`def parse_port(spec):
    ip, host, cont = spec.split(":")      # fails for "80" and "8080:80"
    return [ip, host, cont, "tcp"]`, 'naive'),
    q: ['Who can reach a container started with <code>-p 8080:80</code> on a Linux server with ufw blocking 8080?', ['Anyone who can reach the server: Docker\'s iptables rules bypass ufw', 'Only localhost', 'Nobody, ufw blocks it', 'Only other containers'], 0, 'No IP means 0.0.0.0, all interfaces. Docker inserts its own NAT rules ahead of ufw\'s, a well-known surprise. Bind to 127.0.0.1 when only local access is intended.'],
    h: ['<p>Hint 1: peel off an optional <code>/proto</code> suffix first, then split the rest on <code>:</code>.</p>', '<p>Hint 2: 1 part = container port; 2 parts = host:container; 3 parts = ip:host:container (host may be empty).</p>', '<p>Hint 3: validate every number (1-65535) and every octet (0-255); empty host port becomes "random".</p>'],
    a: `<p>Normalise the string, take the protocol suffix off, decide the shape by the number of colon-separated parts, fill defaults, and validate. In real life, check what Docker actually bound with <code>docker port web</code> and <code>ss -lntp</code> on the host.</p>`,
    code: SH(R`#!/usr/bin/env bash
# What did Docker actually publish?
set -euo pipefail
docker run -d --name web -p 127.0.0.1:8080:80 -p 9090:80 -p 80 nginx:1.27
docker port web                     # 80/tcp -> 127.0.0.1:8080, 0.0.0.0:9090, 0.0.0.0:<random>
sudo ss -lntp | grep -E ':(8080|9090)\b'
docker rm -f web`),
    alt: [PY(R`def _port_ok(p):
    return p.isdigit() and 1 <= int(p) <= 65535


def _ip_ok(ip):
    parts = ip.split(".")
    return len(parts) == 4 and all(x.isdigit() and int(x) <= 255 for x in parts)


def parse_port(spec):
    spec = spec.strip()
    proto = "tcp"
    if "/" in spec:
        spec, proto = spec.rsplit("/", 1)
        if proto not in ("tcp", "udp", "sctp"):
            return ["invalid"]
    parts = spec.split(":")
    if len(parts) == 1:
        ip, host, cont = "0.0.0.0", "", parts[0]
    elif len(parts) == 2:
        ip, host, cont = "0.0.0.0", parts[0], parts[1]
    elif len(parts) == 3:
        ip, host, cont = parts
    else:
        return ["invalid"]
    if not _ip_ok(ip) or not _port_ok(cont) or (host != "" and not _port_ok(host)):
        return ["invalid"]
    return [ip, host if host else "random", cont, proto]`, 'parse_port (tested)')],
    cx: `<p>O(length of the string).</p>`,
    f: ['Extend it to port ranges like <code>8000-8001:80-81</code>.', 'How would IPv6 (<code>[::1]:8080:80</code>) change the parsing?'],
    tests: { sig: 'string -> string[]', fn: 'parsePort', cases: [
      [['8080:80'], ['0.0.0.0', '8080', '80', 'tcp']],
      [['127.0.0.1:8080:80'], ['127.0.0.1', '8080', '80', 'tcp']],
      [['80'], ['0.0.0.0', 'random', '80', 'tcp']],
      [['5353:53/udp'], ['0.0.0.0', '5353', '53', 'udp']],
      [['127.0.0.1::5432'], ['127.0.0.1', 'random', '5432', 'tcp']],
      [['65535:1/sctp'], ['0.0.0.0', '65535', '1', 'sctp']],
      [['70000:80'], ['invalid']],
      [['8080:80/http'], ['invalid']],
      [['a:b'], ['invalid']],
      [[''], ['invalid']],
      [['300.1.1.1:80:80'], ['invalid']],
      [['1:2:3:4'], ['invalid']]
    ] }
  }));

  practice.push(P({
    t: 'What does this exit code mean?', l: 'Easy', tags: ['exit codes', 'debugging', 'python'], co: ['Red Hat', 'Infosys', 'Oracle'], c: PYC,
    s: `<p>Write <code>explain_exit(code)</code> for an on-call helper bot. Return exactly: 0 → <code>"success"</code>; 125 → <code>"docker run failed"</code>; 126 → <code>"command not executable"</code>; 127 → <code>"command not found"</code>; 137 → <code>"SIGKILL (OOM or docker kill/stop timeout)"</code>; 139 → <code>"SIGSEGV"</code>; 143 → <code>"SIGTERM"</code>; any other code from 129 to 255 → <code>"signal N"</code> where N = code − 128; any other code from 1 to 128 → <code>"application error"</code>; below 0 or above 255 → <code>"invalid"</code>.</p>`,
    ex: `<p><code>explain_exit(137)</code> → ${H.c('r', '"SIGKILL (OOM or docker kill/stop timeout)"')}; <code>explain_exit(130)</code> → ${H.c('y', '"signal 2"')} (SIGINT, someone pressed Ctrl+C); <code>explain_exit(1)</code> → <code>"application error"</code>.</p>`,
    bw: `<p>A dictionary with only the famous codes that returns <code>None</code> for 130 or 134, so the bot says nothing exactly when the on-call engineer needs a hint.</p>`,
    bc: PY(`def explain_exit(code):
    return {0: "success", 137: "OOM"}.get(code)   # wrong for 137 without OOM, silent for the rest`, 'naive'),
    q: ['A container exits with 134. What happened?', ['It received signal 6 (SIGABRT), e.g. an assertion or abort() in native code', 'It ran out of memory', 'The command was not found', 'It was stopped normally'], 0, '134 − 128 = 6 = SIGABRT. Look for "Aborted" or a core-dump message in the logs.'],
    h: ['<p>Hint 1: check the range first so 256 and −1 never reach the table.</p>', '<p>Hint 2: special codes go in a dictionary; look them up before the general rules.</p>', '<p>Hint 3: then: above 128 → "signal " + (code − 128); otherwise "application error".</p>'],
    a: `<p>Range check, then the named special cases, then the 128 + signal rule, then the generic application error. In practice pair the code with <code>OOMKilled</code> from <code>docker inspect</code>, because 137 alone cannot tell an OOM kill from a stop timeout.</p>`,
    code: SH(R`#!/usr/bin/env bash
set -euo pipefail
docker run --name t1 alpine:3.20 sh -c 'exit 3' || true
docker run --name t2 alpine:3.20 nosuchcmd || true
docker run --name t3 --memory 32m --memory-swap 32m alpine:3.20 sh -c 'tail /dev/zero' || true
for c in t1 t2 t3; do
  docker inspect -f "$c exit={{.State.ExitCode}} oom={{.State.OOMKilled}}" "$c"   # 3, 127, 137 true
done
docker rm t1 t2 t3 >/dev/null`),
    alt: [PY(R`SPECIAL = {
    0: "success",
    125: "docker run failed",
    126: "command not executable",
    127: "command not found",
    137: "SIGKILL (OOM or docker kill/stop timeout)",
    139: "SIGSEGV",
    143: "SIGTERM",
}


def explain_exit(code):
    if code < 0 or code > 255:
        return "invalid"
    if code in SPECIAL:
        return SPECIAL[code]
    if code > 128:
        return "signal " + str(code - 128)
    return "application error"`, 'explain_exit (tested)')],
    cx: `<p>O(1): one range check and one dictionary lookup.</p>`,
    f: ['Add the signal names (2 → SIGINT, 6 → SIGABRT, 9 → SIGKILL) using Python\'s <code>signal</code> module.'],
    tests: { sig: 'int -> string', fn: 'explainExit', cases: [
      [[0], 'success'], [[1], 'application error'], [[2], 'application error'], [[125], 'docker run failed'],
      [[126], 'command not executable'], [[127], 'command not found'], [[128], 'application error'], [[130], 'signal 2'],
      [[134], 'signal 6'], [[137], 'SIGKILL (OOM or docker kill/stop timeout)'], [[139], 'SIGSEGV'], [[143], 'SIGTERM'],
      [[255], 'signal 127'], [[256], 'invalid'], [[-1], 'invalid']
    ] }
  }));

  practice.push(P({
    t: 'Write a .dockerignore for a Node repo', l: 'Easy', tags: ['.dockerignore', 'build context', 'secrets'], co: ['Vercel', 'Zomato', 'Capgemini'],
    s: `<p>A Node service's build sends a 900 MB context ("Sending build context to Docker daemon 912MB" in old builders, a long "transferring context" step in BuildKit). The repo has <code>.git/</code>, <code>node_modules/</code>, <code>coverage/</code>, <code>dist/</code>, <code>.env</code> and <code>.env.local</code>, <code>logs/</code>, <code>cypress/videos/</code> and a <code>docs/</code> site. The Dockerfile runs <code>npm ci</code> and <code>npm run build</code> inside the image. Write the <code>.dockerignore</code> and show how to verify what is sent.</p>`,
    ex: `<p>After the file, the context drops to ${H.c('g', 'about 2 MB')}: <code>package.json</code>, the lockfile, <code>src/</code> and config. ${H.c('r', '.env')} can no longer be copied into an image by <code>COPY . .</code>, even by accident.</p>`,
    bw: `<p>Leaving out .dockerignore and trusting <code>COPY src/ ./src/</code>: the whole folder is still sent to the builder on every build, and the first teammate who writes <code>COPY . .</code> ships <code>.env</code> and a stale <code>node_modules</code> built for another OS.</p>`,
    q: ['Why exclude <code>node_modules</code> even though the image needs dependencies?', ['They are installed inside the image by npm ci for the image\'s OS and CPU; host copies are big and may be the wrong platform', 'Docker cannot copy folders with many files', 'npm ci refuses to run if they exist', 'They contain secrets'], 0, 'Native modules built on macOS do not run on Linux. Installing inside the build gives the right binaries and a clean lockfile install.'],
    h: ['<p>Hint 1: anything rebuilt inside the image (node_modules, dist, coverage) does not belong in the context.</p>', '<p>Hint 2: secrets and local config: <code>.env</code>, <code>.env.*</code>, but you may keep <code>.env.example</code> with <code>!.env.example</code>.</p>', '<p>Hint 3: verify by building a tiny image that copies the context and listing it.</p>'],
    a: `<p>Exclude version control, dependencies and build output that the image rebuilds, test artifacts, logs, docs and every secret file, then re-include the harmless example env file. Verify with a throwaway build that lists what arrived.</p>`,
    code: { lang: 'text', check: false, title: '.dockerignore', code: R`.git
.gitignore
node_modules/
dist/
coverage/
logs/
*.log
cypress/videos/
cypress/screenshots/
docs/
.env
.env.*
!.env.example
*.pem
.DS_Store
.vscode/
.idea/` },
    alt: [SH(R`#!/usr/bin/env bash
# Show exactly what the build context contains
set -euo pipefail
printf 'FROM busybox:1.36\nCOPY . /ctx\nRUN find /ctx -maxdepth 2 | sort && du -sh /ctx\n' > /tmp/Dockerfile.ctx
docker build --no-cache --progress=plain -f /tmp/Dockerfile.ctx . 2>&1 | grep -E '/ctx|ctx$' | head -n 40`, 'verify')],
    cx: `<p>Context 900 MB → about 2 MB: the "transferring context" step goes from tens of seconds to instant, and <code>COPY . .</code> stops missing the cache when <code>.git</code> changes.</p>`,
    f: ['How do .dockerignore rules differ from .gitignore (anchoring, <code>**</code>)?', 'Can you have a different ignore file per Dockerfile? (<code>Dockerfile.prod.dockerignore</code>)']
  }));

  practice.push(P({
    t: 'Run a local registry and ship an image through it', l: 'Easy', tags: ['registry', 'tags', 'digests'], co: ['GitLab', 'DigitalOcean', 'HCL'],
    s: `<p>Without any cloud account, set up a registry on your machine, push a small image you built under two tags (a version and the Git commit), pull it back by <b>digest</b> after deleting the local copy, and list the registry's repositories and tags. Note what changes for Podman.</p>`,
    ex: `<p>${H.c('g', 'docker push localhost:5000/hello:1.0.0')} prints <code>1.0.0: digest: sha256:... size: 527</code>. Pushing the same image as <code>localhost:5000/hello:3f2a9c1</code> uploads nothing new: every layer "already exists".</p>`,
    bw: `<p>Using <code>docker save | docker load</code> with a tar file passed around on a USB stick or chat. It works once, but there are no tags, no digests to verify, no partial layer reuse and no history.</p>`,
    q: ['You push the same image under a second tag. How much data is uploaded?', ['Almost none: the layers and config already exist; only a tag pointing to the same manifest is added', 'The whole image again', 'Only the base layer', 'Nothing, and the tag is not created'], 0, 'Registries are content-addressed. Same content, same digests: only the new tag reference is written.'],
    h: ['<p>Hint 1: <code>docker run -d -p 5000:5000 --name registry registry:2</code>, with a named volume to keep data.</p>', '<p>Hint 2: the registry host is part of the image name: tag as <code>localhost:5000/NAME:TAG</code>.</p>', '<p>Hint 3: get the digest with <code>docker inspect --format \'{{index .RepoDigests 0}}\'</code> and pull <code>NAME@sha256:...</code>; list with <code>curl localhost:5000/v2/_catalog</code>.</p>'],
    a: `<p>Start <code>registry:2</code> with a volume, build a small image, tag it twice with the registry prefix, push both, read the digest, remove the local images, and pull by digest. The HTTP API shows catalog and tags. Docker treats localhost registries as allowed over plain HTTP; Podman needs <code>--tls-verify=false</code> (or an entry in <code>registries.conf</code>).</p>`,
    code: SH(R`#!/usr/bin/env bash
set -euo pipefail
docker volume create registry-data >/dev/null
docker run -d -p 5000:5000 --name registry -v registry-data:/var/lib/registry registry:2 2>/dev/null || docker start registry

mkdir -p hello && cd hello
printf 'FROM busybox:1.36\nCMD ["echo", "hello from the local registry"]\n' > Dockerfile
sha=$(git rev-parse --short HEAD 2>/dev/null || echo dev0001)
docker build -t localhost:5000/hello:1.0.0 -t "localhost:5000/hello:$sha" .
docker push localhost:5000/hello:1.0.0
docker push "localhost:5000/hello:$sha"          # layers already exist

ref=$(docker inspect --format '{{index .RepoDigests 0}}' localhost:5000/hello:1.0.0)
docker rmi localhost:5000/hello:1.0.0 "localhost:5000/hello:$sha"
docker pull "$ref" && docker run --rm "$ref"

curl -s localhost:5000/v2/_catalog
curl -s localhost:5000/v2/hello/tags/list
# Podman: podman push --tls-verify=false localhost:5000/hello:1.0.0`),
    cx: `<p>Seconds. The second push and any later pull of shared layers transfer almost nothing.</p>`,
    f: ['How would you add basic auth and TLS to this registry?', 'Why is pulling by digest safer than pulling by tag in production?']
  }));

  // ───────────────────────── Practice: Medium ─────────────────────────
  practice.push(P({
    t: 'Production Dockerfile for a FastAPI service', l: 'Medium', tags: ['python', 'dockerfile', 'non-root', 'healthcheck'], co: ['Razorpay', 'Atlassian', 'Accenture'],
    s: `<p>Containerise a FastAPI app (<code>app/main.py</code> with <code>app = FastAPI()</code> and a <code>/healthz</code> route) whose dependencies are pinned in <code>requirements.txt</code>. Requirements: small image, fast rebuilds on code changes, non-root, logs visible in <code>docker logs</code> immediately, graceful stop in under a second, a healthcheck that works without curl, and configuration (port, log level, database URL) from the runtime environment.</p>`,
    ex: `<p>${H.c('g', 'docker run --rm -p 127.0.0.1:8000:8000 --env-file .env api:1.0')} → uvicorn logs appear instantly; <code>docker exec</code> shows <code>uid=10001</code>; <code>docker stop</code> returns in ~0.3 s with exit 0; <code>docker ps</code> shows <code>(healthy)</code> after ~10 s.</p>`,
    bw: `<p><code>FROM python:3.12</code>, <code>COPY . .</code>, <code>pip install</code>, <code>CMD uvicorn app.main:app</code> (shell form) as root: ~1.1 GB, reinstalls on every edit, logs buffered, 10 s stops, and <code>--reload</code> left on from development.</p>`,
    bc: DF(`FROM python:3.12
COPY . .
RUN pip install -r requirements.txt
CMD uvicorn app.main:app --host 0.0.0.0 --reload`),
    q: ['Why set <code>PYTHONUNBUFFERED=1</code>?', ['So print/log output reaches docker logs immediately instead of sitting in a buffer', 'To make Python faster', 'To disable .pyc files', 'To allow non-root users'], 0, 'When stdout is not a terminal, Python buffers it. Without this, logs appear late or are lost when the container is killed.'],
    h: ['<p>Hint 1: slim base, requirements first, <code>--no-cache-dir</code>, code last.</p>', '<p>Hint 2: exec-form CMD with uvicorn; read the port from env through a tiny <code>sh -c "exec ..."</code> or fix it at 8000.</p>', '<p>Hint 3: HEALTHCHECK using <code>python -c</code> and urllib; <code>USER 10001</code>.</p>'],
    a: `<p>Cache-friendly order, slim base, a fixed numeric non-root user, unbuffered output, an exec-form command so uvicorn is PID 1 (or behind <code>exec</code> in a shell wrapper when the port comes from the environment), a Python-based healthcheck, and no configuration baked in except safe defaults.</p>`,
    code: DF(R`# syntax=docker/dockerfile:1
FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PORT=8000 LOG_LEVEL=info
WORKDIR /srv
COPY requirements.txt .
RUN --mount=type=cache,target=/root/.cache/pip pip install -r requirements.txt \
 && useradd --create-home --uid 10001 app
COPY --chown=app:app app/ ./app/
USER 10001
EXPOSE 8000
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
  CMD python -c "import os, urllib.request; urllib.request.urlopen('http://127.0.0.1:' + os.environ.get('PORT', '8000') + '/healthz', timeout=2)"
# sh expands $PORT, then exec replaces sh so uvicorn is PID 1
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port $PORT --log-level $LOG_LEVEL --proxy-headers"]`),
    alt: [SH(R`#!/usr/bin/env bash
set -euo pipefail
docker build -t api:1.0 .
docker run -d --name api -p 127.0.0.1:8000:8000 --env-file .env api:1.0
docker exec api id                                   # uid=10001(app)
sleep 12 && docker ps --filter name=api --format '{{.Status}}'   # Up ... (healthy)
time docker stop api && docker inspect -f '{{.State.ExitCode}}' api
docker rm api`, 'verify')],
    cx: `<p>≈ 150-200 MB depending on dependencies; code-only rebuilds in seconds.</p>`,
    f: ['When would you put gunicorn with uvicorn workers in front instead of plain uvicorn?', 'How do you run migrations without putting them in RUN?']
  }));

  practice.push(P({
    t: 'Node + TypeScript image with prod-only dependencies', l: 'Medium', tags: ['node', 'multi-stage', 'npm ci', 'signals'], co: ['Swiggy', 'Shopify', 'Thoughtworks'],
    s: `<p>An Express API written in TypeScript builds with <code>npm run build</code> (tsc → <code>dist/</code>). The current image is 1.2 GB, includes TypeScript, Jest and ESLint, runs <code>npm start</code> as root, and takes 10 s to stop. The app also spawns <code>git</code> processes to read repo metadata. Write a multi-stage Dockerfile and the run command.</p>`,
    ex: `<p>Result: ${H.c('g', '≈ 210 MB')}, only production dependencies, <code>node dist/server.js</code> behind tini, user <code>node</code>, stops in under a second, no <code>&lt;defunct&gt;</code> git processes piling up.</p>`,
    bw: `<p>One stage <code>FROM node:22</code>, <code>COPY . .</code>, <code>npm install</code>, <code>npm run build</code>, <code>CMD npm start</code>. Dev dependencies ship, npm sits as PID 1 and does not forward SIGTERM reliably, and nobody reaps the git children.</p>`,
    q: ['Why prefer <code>npm ci</code> over <code>npm install</code> in a Dockerfile?', ['It installs exactly what the lockfile says and fails if package.json and the lockfile disagree', 'It is the only command that works offline', 'It skips dev dependencies automatically', 'It runs as non-root'], 0, '<code>npm ci</code> is the reproducible install for CI and images. Add <code>--omit=dev</code> (or prune) to drop dev dependencies.'],
    h: ['<p>Hint 1: stage 1: lockfile + <code>npm ci</code> (all deps), copy source, build, then <code>npm prune --omit=dev</code>.</p>', '<p>Hint 2: stage 2 from <code>node:22-slim</code>: copy <code>node_modules</code>, <code>dist</code>, <code>package.json</code>; <code>USER node</code>.</p>', '<p>Hint 3: <code>CMD ["node", "dist/server.js"]</code>; run with <code>--init</code> (or ENTRYPOINT tini) because the app spawns children; install git in the runtime stage since the app needs it.</p>'],
    a: `<p>Build with everything, ship only what runs. Running <code>node</code> directly makes it PID 1 for signals; because the app spawns git subprocesses, an init (tini via <code>--init</code>, or installed and used as ENTRYPOINT so it is not forgotten) reaps zombies. The runtime needs git, so install it there, minimally.</p>`,
    code: DF(R`# syntax=docker/dockerfile:1
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build && npm prune --omit=dev

FROM node:22-slim
RUN apt-get update \
 && apt-get install -y --no-install-recommends git tini \
 && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json ./
USER node
EXPOSE 3000
# tini is PID 1: forwards SIGTERM to node and reaps the git children
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "dist/server.js"]`),
    alt: [SH(R`#!/usr/bin/env bash
set -euo pipefail
docker build -t orders-api:2.0 .
docker run -d --name orders -p 127.0.0.1:3000:3000 --env-file .env orders-api:2.0
docker exec orders ps -eo pid,ppid,stat,comm     # PID 1 tini, node child, no Z states after git calls
time docker stop orders
docker images orders-api`, 'verify')],
    cx: `<p>1.2 GB → ≈ 210 MB; stop time 10 s → under 1 s.</p>`,
    f: ['What changes if you use <code>gcr.io/distroless/nodejs22-debian12</code>? (no shell, no apt: git would have to go)', 'Why does <code>npm start</code> as PID 1 cause signal problems?']
  }));

  practice.push(P({
    t: 'Estimate the final image size from the layers', l: 'Medium', tags: ['multi-stage', 'image size', 'layers', 'python'], co: ['Google', 'Amazon', 'Walmart'], c: PYC,
    s: `<p>Before a build-review meeting you want quick size estimates. Write <code>image_size(lines)</code>. Each line is <code>"INSTRUCTION ... | MB"</code>. A <code>FROM</code> line starts a new stage: its MB is the base image size, unless the image name (first word after FROM that does not start with <code>--</code>) is an <b>earlier stage name</b> (case-insensitive), in which case the stage starts at that stage's current size and the MB on the FROM line is ignored. <code>FROM x AS name</code> names a stage. Every other line adds its MB to the current stage (deleting files adds 0: layers never subtract). Return the size of the <b>last</b> stage, the one that ships.</p>`,
    ex: `<p>Go build: <code>["FROM golang:1.23 AS build | 820", "RUN go mod download | 150", "COPY . . | 5", "RUN go build -o /app | 40", "FROM gcr.io/distroless/static-debian12 | 2", "COPY --from=build /app /app | 12"]</code> → ${H.c('g', '14')}. The 1015 MB build stage never ships.</p>`,
    bw: `<p>Summing every line: 1029 MB for the Go example. That is the build cache, not the image, and it leads teams to reject multi-stage builds as "not helping".</p>`,
    bc: PY(`def image_size(lines):
    return sum(int(l.split("|")[1]) for l in lines)   # counts every stage`, 'naive'),
    q: ['A stage does <code>RUN curl ... big.tgz | 500</code> then <code>RUN rm big.tgz | 0</code>. How much does it add?', ['500 MB: the download layer keeps the bytes', '0 MB', '250 MB', 'It depends on compression only'], 0, 'Layers are additive; the delete only adds a whiteout on top. Combine both in one RUN, or do it in a build stage.'],
    h: ['<p>Hint 1: keep a dictionary <code>stage name → size</code> and the current stage\'s name and size.</p>', '<p>Hint 2: on FROM, skip <code>--flags</code>, read the image name and optional <code>AS name</code>; start from the earlier stage\'s size if the name matches.</p>', '<p>Hint 3: on every other line, add MB to the current stage and update the dictionary; return the current size at the end.</p>'],
    a: `<p>Simulate the build stage by stage. Only the final stage's layers are in the image; stages that build on an earlier stage inherit its layers. This mirrors what <code>docker history</code> will show for the final image.</p>`,
    code: SH(R`#!/usr/bin/env bash
# Check the estimate against reality
set -euo pipefail
docker build -t sizes:final .
docker image inspect -f '{{.Size}}' sizes:final | awk '{printf "%.0f MB\n", $1/1000/1000}'
docker history --format '{{.Size}}\t{{.CreatedBy}}' sizes:final`),
    alt: [PY(R`def image_size(lines):
    stages = {}            # stage name -> size so far
    name = None
    size = 0
    for line in lines:
        text, _, mb = line.partition("|")
        mb = int(mb.strip() or "0")
        words = text.split()
        if words[0].upper() == "FROM":
            args = [w for w in words[1:] if not w.startswith("--")]
            image = args[0].lower()
            size = stages[image] if image in stages else mb   # FROM an earlier stage reuses its layers
            name = args[2].lower() if len(args) >= 3 and args[1].upper() == "AS" else None
        else:
            size += mb
        if name is not None:
            stages[name] = size
    return size`, 'image_size (tested)')],
    cx: `<p>O(number of lines), with one dictionary lookup per FROM.</p>`,
    f: ['Add <code>--target NAME</code>: return that stage\'s size instead of the last one.', 'Real images are compressed in the registry: why can the pulled size differ from <code>docker images</code>?'],
    tests: { sig: 'string[] -> int', fn: 'imageSize', cases: [
      [[['FROM python:3.12 | 1020', 'RUN apt-get install build-essential | 380', 'COPY . . | 95', 'RUN pip install -r requirements.txt | 140']], 1635],
      [[['FROM golang:1.23 AS build | 820', 'RUN go mod download | 150', 'COPY . . | 5', 'RUN go build -o /app | 40', 'FROM gcr.io/distroless/static-debian12 | 2', 'COPY --from=build /app /app | 12']], 14],
      [[['FROM node:22-slim AS base | 220', 'COPY package*.json ./ | 1', 'FROM base AS deps | 0', 'RUN npm ci | 180', 'FROM base AS runtime | 0', 'COPY --from=deps /app/node_modules ./node_modules | 60', 'COPY . . | 3']], 284],
      [[['FROM ubuntu:24.04 | 78', 'RUN curl -o /tmp/big.tgz https://example.com/big.tgz | 500', 'RUN rm /tmp/big.tgz | 0']], 578],
      [[['FROM scratch | 0', 'COPY app / | 7']], 7],
      [[['FROM alpine:3.20 | 8']], 8],
      [[['FROM a AS one | 10', 'RUN x | 5', 'FROM one AS two | 0', 'RUN y | 1', 'FROM two | 0', 'RUN z | 2']], 18],
      [[['FROM --platform=linux/amd64 golang:1.23 AS Build | 800', 'RUN go build | 40', 'FROM BUILD | 0', 'RUN go test ./... | 30']], 870]
    ] }
  }));

  practice.push(P({
    t: '"exec format error" after deploying from a Mac', l: 'Medium', tags: ['buildx', 'multi-arch', 'arm64', 'amd64'], co: ['Apple', 'AWS', 'Postman'],
    s: `<p>A developer on an Apple Silicon Mac builds <code>api:1.3</code> and pushes it. The x86 staging server fails with <code>exec /usr/local/bin/api: exec format error</code>. Meanwhile, the platform team wants to move some servers to arm64 (Graviton) to save money. Diagnose with commands, then publish one tag that works on both, using a local registry.</p>`,
    ex: `<p>${H.c('r', "docker image inspect -f '{{.Os}}/{{.Architecture}}' api:1.3")} on the Mac prints <code>linux/arm64</code>. The server's <code>uname -m</code> says <code>x86_64</code>. After the fix, <code>docker buildx imagetools inspect localhost:5000/api:1.3</code> lists ${H.c('g', 'linux/amd64 and linux/arm64')}.</p>`,
    bw: `<p>Hard-coding <code>FROM --platform=linux/amd64</code> in the Dockerfile. The server works, but every Mac and every arm64 server now runs the app under emulation: slow, and sometimes crashing on CPU-specific code.</p>`,
    q: ['Which builder setting cross-compiles a Go binary natively instead of emulating?', ['<code>FROM --platform=$BUILDPLATFORM golang</code> with GOOS/GOARCH from TARGETOS/TARGETARCH', '<code>--network host</code>', '<code>--no-cache</code>', '<code>--squash</code>'], 0, 'The compiler runs on the build machine\'s own CPU and produces binaries for the target. Only RUN steps that execute target binaries need emulation.'],
    h: ['<p>Hint 1: compare the image\'s <code>.Architecture</code> with the server\'s <code>uname -m</code>.</p>', '<p>Hint 2: a docker-container buildx builder can build several platforms; QEMU (Docker Desktop includes it; on Linux install <code>tonistiigi/binfmt</code>) covers emulated steps.</p>', '<p>Hint 3: build with <code>--platform linux/amd64,linux/arm64 --push</code> to a registry and verify with imagetools.</p>'],
    a: `<p>Prove the mismatch, then publish a manifest list. Prefer cross-compilation in the Dockerfile (<code>$BUILDPLATFORM</code> + target args) for speed; emulation handles the rest. Each host pulls the matching entry automatically, so the same tag works on Macs, x86 servers and Graviton.</p>`,
    code: SH(R`#!/usr/bin/env bash
set -euo pipefail
# Diagnose
docker image inspect -f '{{.Os}}/{{.Architecture}}' api:1.3       # on the Mac: linux/arm64
uname -m                                                          # on the server: x86_64

# Linux hosts only: register QEMU emulators (Docker Desktop already has them)
docker run --privileged --rm tonistiigi/binfmt --install arm64,amd64

# Multi-platform builder that can reach the local registry
docker run -d -p 5000:5000 --name registry registry:2 2>/dev/null || docker start registry
docker buildx create --name multi --driver docker-container --driver-opt network=host --use 2>/dev/null || docker buildx use multi
docker buildx build --platform linux/amd64,linux/arm64 -t localhost:5000/api:1.3 --push .
docker buildx imagetools inspect localhost:5000/api:1.3 | grep Platform

# On each server
docker pull localhost:5000/api:1.3 && docker image inspect -f '{{.Architecture}}' localhost:5000/api:1.3`),
    cx: `<p>Two builds per release; with cross-compilation the arm64 build costs about the same as the amd64 one. Emulated steps can be 5-20x slower: move them to native runners if they dominate.</p>`,
    f: ['Why does <code>docker buildx build --load</code> fail for two platforms on the classic image store?', 'How would GitHub Actions build this on native arm64 runners?']
  }));

  practice.push(P({
    t: 'Zombie processes and a container that never stops cleanly', l: 'Medium', tags: ['pid 1', 'zombies', '--init', 'compose'], co: ['Meta', 'BrowserStack', 'Infosys'],
    s: `<p>A screenshot service (Python) launches headless Chromium for every request through <code>subprocess</code>. After a day: <code>fork: Resource temporarily unavailable</code>. <code>docker exec shots ps -eo stat | grep -c Z</code> prints 4096, and <code>docker stop shots</code> always takes 10 s. Show how to confirm the diagnosis and fix it for both <code>docker run</code> and compose, without changing app code.</p>`,
    ex: `<p>${H.c('r', 'ps -eo pid,ppid,stat,comm')} shows thousands of <code>Z</code> (<code>&lt;defunct&gt;</code>) Chromium helpers whose parent is PID 1 (python), and <code>docker inspect</code> shows <code>PidsLimit 4096</code>. After the fix: zero zombies and a sub-second stop.</p>`,
    bw: `<p>Raising <code>--pids-limit</code> or restarting the container nightly with cron. The leak continues; you just hit the wall later, and every restart drops in-flight requests.</p>`,
    q: ['Why do the zombies attach to PID 1?', ['Orphaned processes are re-parented to PID 1, which must call wait() to reap them', 'Chromium always forks from PID 1', 'Docker moves all processes to PID 1', 'Because the container runs as root'], 0, 'When a parent dies before its children, the children are adopted by PID 1 of the namespace. A normal app never reaps them; an init like tini does.'],
    h: ['<p>Hint 1: count Z states and look at their PPID.</p>', '<p>Hint 2: <code>--init</code> injects <code>docker-init</code> (tini) as PID 1; compose has <code>init: true</code>.</p>', '<p>Hint 3: check that the app\'s CMD is exec form so tini forwards SIGTERM to Python directly, and set a PID limit as a safety net.</p>'],
    a: `<p>Python is PID 1 and adopts orphaned Chromium helpers but never reaps them, and as PID 1 it also ignores SIGTERM without a handler. Adding an init fixes both: it reaps every adopted child and forwards signals. Keep a PID limit to contain future leaks and alert on PID count.</p>`,
    code: SH(R`#!/usr/bin/env bash
set -euo pipefail
# Confirm: zombies, their parent, and the limit
docker exec shots sh -c 'ps -eo pid,ppid,stat,comm | awk "\$3 ~ /Z/" | head -n 5; ps -eo stat | grep -c Z'
docker inspect -f 'pids-limit={{.HostConfig.PidsLimit}}' shots
docker stats --no-stream --format '{{.Name}} PIDs={{.PIDs}}' shots

# Fix: same image, with an init as PID 1
docker rm -f shots
docker run -d --name shots --init --pids-limit 512 -p 127.0.0.1:8080:8080 shots:1.4
docker exec shots ps -o pid,comm -p 1             # docker-init
time docker stop shots`),
    alt: [Y(R`services:
  shots:
    image: shots:1.4
    init: true                 # tini as PID 1: reaps zombies, forwards signals
    pids_limit: 512            # safety net
    stop_grace_period: 15s     # time to finish in-flight screenshots
    ports:
      - "127.0.0.1:8080:8080"`, 'compose.yaml')],
    cx: `<p>tini costs about 1 MB of memory. The zombie count stays near zero regardless of request volume.</p>`,
    f: ['How would you fix it inside the image instead, so nobody can forget <code>--init</code>?', 'What does Kubernetes do about PID 1 (shareProcessNamespace, no built-in init)?']
  }));

  practice.push(P({
    t: 'Harden a running service: read-only, no capabilities, non-root', l: 'Medium', tags: ['security', 'read-only', 'capabilities', 'compose'], co: ['CrowdStrike', 'Okta', 'Deloitte'],
    s: `<p>A security audit asks you to harden the <code>api</code> service in compose: non-root, read-only root filesystem, no Linux capabilities, no privilege escalation, memory/CPU/PID limits, secrets as files, and no database port on the network. The app writes temporary uploads to <code>/tmp</code> and a cache to <code>/app/.cache</code>. Write the compose service and the checks that prove each control.</p>`,
    ex: `<p>${H.c('g', 'docker compose exec api touch /app/x')} → <code>Read-only file system</code>; <code>docker compose exec api id</code> → <code>uid=10001</code>; <code>grep Cap /proc/1/status</code> inside shows <code>CapEff: 0000000000000000</code>.</p>`,
    bw: `<p>Adding <code>read_only: true</code> alone. The app crashes on its first upload (<code>EROFS</code>), someone reverts the whole change "to unblock the release", and the service ends up less hardened than before.</p>`,
    q: ['The app listens on port 8080 inside the container. Which capability does it need after <code>cap_drop: [ALL]</code>?', ['None: only ports below 1024 need NET_BIND_SERVICE', 'NET_ADMIN', 'SYS_ADMIN', 'NET_RAW'], 0, 'Unprivileged ports (1024+) need no capability. Listening on a high port inside and mapping 80 → 8080 outside is the clean pattern.'],
    h: ['<p>Hint 1: list the paths the app writes to (<code>docker diff</code> after a normal run) and give each a tmpfs or volume.</p>', '<p>Hint 2: compose keys: <code>user</code>, <code>read_only</code>, <code>tmpfs</code>, <code>cap_drop</code>, <code>security_opt</code>, <code>mem_limit</code>, <code>cpus</code>, <code>pids_limit</code>, <code>secrets</code>.</p>', '<p>Hint 3: verify each control with one command; keep the db on an internal network with no <code>ports</code>.</p>'],
    a: `<p>Apply each control and give the app exactly the writable paths it needs. Put the database on an <code>internal</code> backend network and publish only the api on 127.0.0.1 (a reverse proxy would handle public traffic). Prove each control with a check, so the hardening is testable in CI.</p>`,
    code: Y(R`services:
  api:
    image: localhost:5000/api:2.1.0
    user: "10001:10001"
    read_only: true
    tmpfs:
      - /tmp:size=64m
      - /app/.cache:size=32m,uid=10001,gid=10001
    cap_drop: [ALL]
    security_opt:
      - no-new-privileges:true
    mem_limit: 256m
    cpus: 0.5
    pids_limit: 200
    init: true
    environment:
      DATABASE_HOST: db
      DATABASE_PASSWORD_FILE: /run/secrets/db_password
    secrets: [db_password]
    ports:
      - "127.0.0.1:8080:8080"
    networks: [frontend, backend]

  db:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    secrets: [db_password]
    volumes: [pgdata:/var/lib/postgresql/data]
    networks: [backend]          # no ports: unreachable from outside Docker

networks:
  frontend: {}
  backend:
    internal: true               # no outbound internet for this network

volumes:
  pgdata: {}

secrets:
  db_password:
    file: ./secrets/db_password.txt`, 'compose.yaml (hardened api)'),
    alt: [SH(R`#!/usr/bin/env bash
set -euo pipefail
docker compose up -d
docker compose exec api id                                    # uid=10001
docker compose exec api sh -c 'touch /app/x' && exit 1 || echo "root fs is read-only"
docker compose exec api sh -c 'touch /tmp/ok && echo "tmp is writable"'
docker compose exec api grep CapEff /proc/1/status            # all zeros
docker compose exec api grep NoNewPrivs /proc/1/status        # 1
docker stats --no-stream --format '{{.Name}} {{.MemUsage}} PIDs={{.PIDs}}'
nc -z -w 2 127.0.0.1 5432 && exit 1 || echo "db port not published"`, 'verify')],
    cx: `<p>No runtime cost; the limits protect neighbours on the same host.</p>`,
    f: ['How do these map to a Kubernetes securityContext?', 'Which seccomp/AppArmor profile is applied by default, and when would you write your own?']
  }));

  // ───────────────────────── Practice: Hard ─────────────────────────
  practice.push(P({
    t: 'Compute the compose start order (and catch cycles)', l: 'Hard', tags: ['docker compose', 'depends_on', 'topological sort', 'python'], co: ['Uber', 'Docker', 'Atlassian'], c: PYC,
    s: `<p>Before reviewing a 20-service compose file you want to see the start order. Write <code>start_order(specs)</code>, where each spec is <code>"service:dep1,dep2"</code> (deps may be empty: <code>"db:"</code>). Return services in a valid start order where every service comes after all its dependencies; when several are ready at once, take the alphabetically smallest first (deterministic output). If a dependency is not a defined service, return <code>["UNKNOWN:name"]</code> for the first one found (specs in order, deps in order). If the dependencies contain a cycle, return <code>["CYCLE"]</code>. Unknown names are checked before cycles.</p>`,
    ex: `<p><code>["web:api", "api:db,cache", "db:", "cache:"]</code> → ${H.c('g', '["cache", "db", "api", "web"]')}: cache and db are ready first (alphabetical), api needs both, web needs api. <code>["a:b", "b:a"]</code> → ${H.c('r', '["CYCLE"]')}, which <code>docker compose</code> reports as "dependency cycle detected".</p>`,
    bw: `<p>Repeatedly scanning the whole list for "a service whose deps have all started" (O(n²) per pass, O(n³) overall) and looping forever on a cycle because nothing ever becomes ready.</p>`,
    q: ['How does the algorithm detect a cycle?', ['Fewer services come out of the queue than exist: the rest never reached in-degree 0', 'A service appears twice in the output', 'The queue becomes empty at the start', 'A dependency has no dependencies'], 0, 'Kahn\'s algorithm only emits nodes whose in-degree drops to zero. Nodes on a cycle never get there.'],
    h: ['<p>Hint 1: parse into a map service → list of deps; check every dep exists first.</p>', '<p>Hint 2: in-degree = number of distinct deps; also build the reverse map dep → dependents.</p>', '<p>Hint 3: Kahn\'s algorithm with a min-heap for the alphabetical tie-break; if the output is shorter than the service count, return CYCLE.</p>'],
    a: `<p>This is a topological sort. Count unmet dependencies per service; start with those at zero; each time a service "starts", decrement its dependents and push the ones that reach zero. A heap gives the deterministic alphabetical choice. In real compose, a dependency with <code>condition: service_healthy</code> also waits for the healthcheck, but the order is the same graph. <code>docker compose config</code> and <code>docker compose up --dry-run</code> show the real plan.</p>`,
    code: SH(R`#!/usr/bin/env bash
# See compose's own view of the plan
set -euo pipefail
docker compose config --services                 # all services
docker compose up --dry-run -d 2>&1 | grep -E 'Creat|Start|Wait|Healthy'`),
    alt: [PY(R`import heapq


def start_order(specs):
    deps = {}
    names = []
    for spec in specs:
        name, _, rest = spec.partition(":")
        names.append(name)
        deps[name] = [d for d in rest.split(",") if d]
    for name in names:                                # unknown names first
        for d in deps[name]:
            if d not in deps:
                return ["UNKNOWN:" + d]
    indegree = {n: len(set(deps[n])) for n in deps}
    dependents = {n: [] for n in deps}
    for n in deps:
        for d in set(deps[n]):
            dependents[d].append(n)
    ready = [n for n in deps if indegree[n] == 0]
    heapq.heapify(ready)
    order = []
    while ready:
        n = heapq.heappop(ready)                      # alphabetically smallest ready service
        order.append(n)
        for m in dependents[n]:
            indegree[m] -= 1
            if indegree[m] == 0:
                heapq.heappush(ready, m)
    if len(order) < len(deps):
        return ["CYCLE"]
    return order`, 'start_order (tested)')],
    cx: `<p>O((S + E) log S) for S services and E dependency edges.</p>`,
    f: ['Return "waves" (services that can start in parallel) instead of a flat order.', 'How would <code>condition: service_completed_successfully</code> (a migration job) fit into this model?'],
    tests: { sig: 'string[] -> string[]', fn: 'startOrder', cases: [
      [[['web:api', 'api:db,cache', 'db:', 'cache:']], ['cache', 'db', 'api', 'web']],
      [[['a:b', 'b:a']], ['CYCLE']],
      [[['worker:db,queue', 'web:db', 'db:', 'queue:']], ['db', 'queue', 'web', 'worker']],
      [[['api:db', 'db:']], ['db', 'api']],
      [[['solo:']], ['solo']],
      [[['api:db']], ['UNKNOWN:db']],
      [[['a:', 'b:c', 'c:b', 'd:a']], ['CYCLE']],
      [[['z:', 'y:', 'x:z,y']], ['y', 'z', 'x']],
      [[['web:api', 'api:cache', 'cache:ghost', 'ghost2:']], ['UNKNOWN:ghost']],
      [[['self:self']], ['CYCLE']]
    ] }
  }));

  practice.push(P({
    t: 'Java service: multi-stage, cached dependencies, container-aware JVM', l: 'Hard', tags: ['java', 'multi-stage', 'jvm memory', 'buildkit cache'], co: ['Goldman Sachs', 'Oracle', 'JPMorgan'],
    s: `<p>A Spring Boot service's image is 780 MB (<code>maven:3.9-eclipse-temurin-21</code> as the runtime), every build downloads all Maven dependencies (6 minutes in CI), it runs as root, and under <code>--memory 512m</code> it gets OOM-killed (137) during traffic spikes because the heap was set with <code>-Xmx1g</code> long ago. Rewrite the Dockerfile and the run command. Bonus: make dependency layers stable across releases.</p>`,
    ex: `<p>After: ${H.c('g', '≈ 290 MB')} on <code>eclipse-temurin:21-jre</code>, code-only builds in under a minute (dependency layer cached, Maven cache mount), UID 10001, heap sized at 75% of the container limit, no more 137 at 512 MB with the same traffic.</p>`,
    bw: `<p>Lowering <code>-Xmx</code> to 400m by hand. It can still be killed, because the JVM uses memory outside the heap (metaspace, threads, direct buffers, code cache), and the hard-coded number breaks again whenever someone changes the limit.</p>`,
    q: ['What does <code>-XX:MaxRAMPercentage=75</code> do in a container?', ['Sizes the max heap to 75% of the cgroup memory limit, leaving room for non-heap memory', 'Limits CPU usage to 75%', 'Reserves 75% of host RAM', 'Makes the container use swap at 75%'], 0, 'Modern JVMs read the cgroup limit. A percentage scales with the limit you set and leaves headroom for metaspace, threads and buffers.'],
    h: ['<p>Hint 1: copy <code>pom.xml</code> first and run <code>mvn dependency:go-offline</code> with a <code>--mount=type=cache,target=/root/.m2</code>.</p>', '<p>Hint 2: runtime stage on a JRE; extract the Spring Boot layered jar so dependencies, loader and your classes are separate COPY layers.</p>', '<p>Hint 3: non-root user, exec-form ENTRYPOINT, <code>-XX:MaxRAMPercentage</code> instead of <code>-Xmx</code>, and a matching <code>--memory</code>.</p>'],
    a: `<p>Separate build and runtime, cache dependencies two ways (layer order for the dependency resolution step, a cache mount for the local Maven repository), and use Spring Boot's layer extraction so the large, rarely changing dependency layer is reused between releases while only the small application layer changes. Run on a JRE as a numeric non-root user with a heap that scales with the container limit.</p>`,
    code: DF(R`# syntax=docker/dockerfile:1
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /src
COPY pom.xml .
RUN --mount=type=cache,target=/root/.m2 mvn -B -q dependency:go-offline
COPY src ./src
RUN --mount=type=cache,target=/root/.m2 mvn -B -q package -DskipTests \
 && java -Djarmode=tools -jar target/app.jar extract --layers --launcher --destination /layers

FROM eclipse-temurin:21-jre
RUN useradd --system --uid 10001 --no-create-home app
WORKDIR /app
# Least to most frequently changing: these four layers are cached independently
COPY --from=build --chown=app:app /layers/dependencies/ ./
COPY --from=build --chown=app:app /layers/spring-boot-loader/ ./
COPY --from=build --chown=app:app /layers/snapshot-dependencies/ ./
COPY --from=build --chown=app:app /layers/application/ ./
USER 10001
EXPOSE 8080
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-XX:+ExitOnOutOfMemoryError", "org.springframework.boot.loader.launch.JarLauncher"]`),
    alt: [SH(R`#!/usr/bin/env bash
set -euo pipefail
docker build -t orders:3.0 .
docker run -d --name orders --memory 512m --memory-swap 512m --cpus 1 \
  --env-file .env -p 127.0.0.1:8080:8080 orders:3.0
docker exec orders java -XX:MaxRAMPercentage=75 -XX:+PrintFlagsFinal -version | grep -E 'MaxHeapSize'   # about 384 MB
docker exec orders id
docker history --format '{{.Size}}\t{{.CreatedBy}}' orders:3.0 | head -n 6
docker images orders:3.0`, 'verify')],
    cx: `<p>780 MB → ≈ 290 MB; CI build 6 min → under 1 min for code-only changes; a release usually pushes only the small application layer.</p>`,
    f: ['How would jlink cut the runtime further, and what is the maintenance cost?', 'Why add <code>-XX:+ExitOnOutOfMemoryError</code> in a container with a restart policy?']
  }));

  practice.push(P({
    t: 'A complete local stack: web, api, worker, Postgres, Redis, migrations', l: 'Hard', tags: ['docker compose', 'healthcheck', 'secrets', 'networks', 'profiles'], co: ['Stripe', 'Freshworks', 'Booking.com'],
    s: `<p>Design the compose file a new joiner runs on day one. Services: <code>web</code> (nginx serving a SPA and proxying <code>/api</code>), <code>api</code> (Python), <code>worker</code> (same image as api, different command), <code>db</code> (Postgres 16), <code>cache</code> (Redis 7), and <code>migrate</code> (runs once before api and worker). Requirements: only web is reachable from the host; db not reachable from web; api and worker wait for a healthy db and a <b>successful</b> migration; passwords via secrets; data survives <code>down</code>; an optional mail catcher under a profile; works with Docker Desktop and Docker Engine.</p>`,
    ex: `<p>${H.c('g', 'docker compose up -d')} → db healthy → migrate exits 0 → api and worker start → web starts after api is healthy. ${H.c('r', 'docker compose exec web getent hosts db')} returns nothing (different network).</p>`,
    bw: `<p>A single default network with every port published, <code>depends_on</code> lists without conditions, migrations inside the api entrypoint (so api and worker race to migrate), and passwords inline. It starts on the second or third try, exposes Postgres and Redis to the LAN, and leaks credentials into Git.</p>`,
    q: ['Which condition makes api wait for the migration job to finish successfully?', ['<code>condition: service_completed_successfully</code>', '<code>condition: service_healthy</code>', '<code>condition: service_started</code>', '<code>restart: on-failure</code>'], 0, 'One-shot jobs never become "healthy"; they exit. <code>service_completed_successfully</code> waits for exit code 0 and blocks dependents if it fails.'],
    h: ['<p>Hint 1: two networks: <code>edge</code> (web, api) and <code>data</code> (api, worker, migrate, db, cache), with <code>data</code> internal.</p>', '<p>Hint 2: healthchecks on db, cache and api; migrate depends on healthy db; api/worker depend on migrate completed successfully.</p>', '<p>Hint 3: build the Python image once and reuse it for api, worker and migrate with different commands; mail catcher under <code>profiles: ["mail"]</code>.</p>'],
    a: `<p>Model the real dependencies explicitly: health for long-running services, successful completion for the one-shot migration. Segment networks so the edge cannot touch data stores, publish only web on 127.0.0.1, use one image for api/worker/migrate (built once, tagged once), secrets as files, named volumes for state, and profiles for optional tools. Everything else (the SPA build, nginx config) lives in the repo so <code>docker compose up</code> is the whole onboarding.</p>`,
    code: Y(R`name: shop

x-app: &app
  image: localhost:5000/shop-api:dev
  build: ./api
  env_file: .env
  environment:
    DATABASE_HOST: db
    DATABASE_PASSWORD_FILE: /run/secrets/db_password
    REDIS_URL: redis://cache:6379/0
  secrets: [db_password]
  init: true
  networks: [data]

services:
  web:
    build: ./web
    ports:
      - "127.0.0.1:8080:80"
    depends_on:
      api:
        condition: service_healthy
    networks: [edge]

  migrate:
    <<: *app
    command: ["python", "-m", "shop.migrate"]
    restart: "no"
    depends_on:
      db:
        condition: service_healthy

  api:
    <<: *app
    command: ["gunicorn", "--bind", "0.0.0.0:8000", "shop.app:app"]
    networks: [edge, data]
    healthcheck:
      test: ["CMD", "python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/healthz', timeout=2)"]
      interval: 10s
      retries: 5
      start_period: 15s
    depends_on:
      migrate:
        condition: service_completed_successfully
      cache:
        condition: service_healthy
    restart: unless-stopped

  worker:
    <<: *app
    command: ["python", "-m", "shop.worker"]
    depends_on:
      migrate:
        condition: service_completed_successfully
      cache:
        condition: service_healthy
    restart: unless-stopped

  db:
    image: postgres:16
    environment:
      POSTGRES_USER: shop
      POSTGRES_DB: shop
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    secrets: [db_password]
    volumes: [pgdata:/var/lib/postgresql/data]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U shop -d shop"]
      interval: 5s
      retries: 10
    networks: [data]

  cache:
    image: redis:7-alpine
    volumes: [redisdata:/data]
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      retries: 10
    networks: [data]

  mail:
    image: axllent/mailpit:v1.20
    profiles: ["mail"]
    ports:
      - "127.0.0.1:8025:8025"
    networks: [data]

networks:
  edge: {}
  data:
    internal: true

volumes:
  pgdata: {}
  redisdata: {}

secrets:
  db_password:
    file: ./secrets/db_password.txt`, 'compose.yaml'),
    alt: [SH(R`#!/usr/bin/env bash
# Day-one onboarding
set -euo pipefail
mkdir -p secrets
[ -f secrets/db_password.txt ] || openssl rand -base64 24 > secrets/db_password.txt
[ -f .env ] || cp .env.example .env
docker compose config --quiet
docker compose up -d --build
docker compose ps -a                                   # migrate: Exited (0); others healthy
docker compose exec web sh -c 'getent hosts db || echo "web cannot see db (good)"'
curl -fsS localhost:8080/api/healthz && echo " api via web OK"
docker compose --profile mail up -d mail               # optional mail catcher on :8025`, 'onboarding')],
    cx: `<p>First start ≈ build time plus ~15 s of health waits; later starts a few seconds. One image for three services means one build and one scan.</p>`,
    f: ['Note: with <code>data</code> internal, worker (which is only on <code>data</code>) cannot reach the internet, while api can through <code>edge</code>. How would you allow outbound calls for worker only?', 'How would you run the same stack in CI for integration tests and tear it down reliably?']
  }));

  practice.push(P({
    t: 'Supply chain: pin, scan, SBOM, and keep it patched', l: 'Hard', tags: ['digest pinning', 'scanning', 'sbom', 'security'], co: ['Google', 'Snyk', 'Wiz'],
    s: `<p>After a widely publicised base-image CVE, leadership asks three questions: which of our images are affected, how fast can we patch, and how do we make sure nothing unscanned ships? You own 12 Dockerfiles that use floating tags like <code>python:3.12-slim</code>. Design and script the process: digest pinning with automated updates, a scan gate that fails on fixable HIGH/CRITICAL findings, an SBOM per image to answer "are we affected?", and a local registry to practise on.</p>`,
    ex: `<p>Gate output: ${H.c('r', 'Total: 3 (HIGH: 2, CRITICAL: 1)')} → exit code 1 → the build stops. After bumping the base digest and rebuilding: ${H.c('g', 'Total: 0')} → pushed with an SBOM. Query: <code>grep -l openssl sboms/*.json</code> lists affected images in seconds.</p>`,
    bw: `<p>Running a scanner by hand once a quarter and pasting results into a spreadsheet. Floating tags mean two builds of the same commit can contain different packages, and nobody can say which version of openssl is in production today.</p>`,
    q: ['Why pin by digest AND use a bot to bump it?', ['Pinning makes builds reproducible; the bot still delivers patched bases as reviewed, tested pull requests', 'Digests are smaller than tags', 'Bots cannot read tags', 'Pinning disables scanning'], 0, 'A pinned digest never changes silently. Renovate or Dependabot watches the tag and proposes the new digest, so patches arrive through CI and review.'],
    h: ['<p>Hint 1: resolve each base tag to a digest (<code>docker inspect --format \'{{index .RepoDigests 0}}\'</code> after a pull, or <code>docker buildx imagetools inspect</code>) and write <code>FROM image:tag@sha256:...</code>.</p>', '<p>Hint 2: scan gate: <code>trivy image --severity HIGH,CRITICAL --ignore-unfixed --exit-code 1</code>, or <code>docker scout cves --exit-code --only-severity critical,high</code>.</p>', '<p>Hint 3: SBOM with <code>trivy image --format cyclonedx</code> (or <code>docker buildx build --sbom=true</code>), stored per image digest; Renovate config with <code>pinDigests: true</code>.</p>'],
    a: `<p>Reproducibility (digest pins), freshness (a bot that proposes new digests weekly and on security advisories), a hard gate in CI (no push unless the scan passes, with documented exceptions for unfixable findings), and an inventory (an SBOM stored next to every pushed digest) that turns "are we affected?" into a grep. Rebuild images regularly even when the code does not change, because the base keeps getting patched.</p>`,
    code: SH(R`#!/usr/bin/env bash
# pin-scan-push.sh IMAGE_NAME VERSION   (run from the folder with the Dockerfile)
set -euo pipefail
name="$1"; version="$2"; reg=localhost:5000
TRIVY="docker run --rm -v /var/run/docker.sock:/var/run/docker.sock -v $PWD:/out aquasec/trivy:0.56.2"

# 1) Pin every FROM line that is not already pinned
grep -E '^FROM ' Dockerfile | awk '{for (i=2;i<=NF;i++) if ($i !~ /^--/) {print $i; break}}' | sort -u |
while read -r base; do
  case "$base" in *@sha256:*|scratch) continue ;; esac
  grep -qiE "AS $base\$" Dockerfile && continue          # skip references to earlier stages
  docker pull -q "$base" >/dev/null
  digest=$(docker inspect --format '{{index .RepoDigests 0}}' "$base" | cut -d@ -f2)
  sed -i "s|^FROM \(.*\)$base\b|FROM \1$base@$digest|" Dockerfile
  echo "pinned $base@$digest"
done

# 2) Build, scan (gate), SBOM, push
docker build -t "$reg/$name:$version" .
$TRIVY image --severity HIGH,CRITICAL --ignore-unfixed --exit-code 1 "$reg/$name:$version"
mkdir -p sboms
$TRIVY image --format cyclonedx --output "/out/sboms/$name-$version.cdx.json" "$reg/$name:$version"
docker push "$reg/$name:$version"
docker inspect --format '{{index .RepoDigests 0}}' "$reg/$name:$version" | tee -a deployed-digests.txt

# 3) "Are we affected?" later: grep the inventory
grep -l '"name": "openssl"' sboms/*.json || echo "no image contains openssl"`),
    alt: [{ lang: 'json', title: 'renovate.json (automated digest bumps)', code: R`{
  "extends": ["config:recommended"],
  "pinDigests": true,
  "packageRules": [
    {
      "matchDatasources": ["docker"],
      "matchUpdateTypes": ["digest", "patch"],
      "automerge": true,
      "schedule": ["before 6am on monday"]
    }
  ],
  "vulnerabilityAlerts": { "enabled": true, "schedule": ["at any time"] }
}` }],
    cx: `<p>Scans add 20-60 s per image; SBOMs a few seconds. Patch time drops from "find out which images, by hand" to "merge the bot's PRs and let CI rebuild".</p>`,
    f: ['How would you sign the image (cosign) and make the deploy refuse unsigned digests?', 'When is it acceptable to ship with a known HIGH finding, and how do you record that decision?']
  }));

  // ───────────────────────── Quiz ─────────────────────────
  quiz.push({ q: 'You change a file inside a running container with <code>docker exec</code>, then run <code>docker rm -f</code> and <code>docker run</code> again from the same image. Is the change there?', options: ['No: it lived in the old container\'s writable layer', 'Yes: docker exec writes to the image', 'Yes, if the container was stopped first', 'Only on Docker Desktop'], answer: 0, explain: 'Images are read-only. Each container has its own writable layer, deleted with the container. Put changes in the Dockerfile (or data in a volume).' });
  quiz.push({ q: 'Which CMD lets the app receive SIGTERM directly on <code>docker stop</code>?', options: ['<code>CMD ["gunicorn", "app:app"]</code>', '<code>CMD gunicorn app:app</code>', '<code>CMD sh -c "gunicorn app:app"</code>', '<code>CMD npm start</code>'], answer: 0, explain: 'Exec form (a JSON array) starts the program as PID 1. Shell form runs <code>/bin/sh -c</code> as PID 1, which may not forward the signal; npm has the same problem.' });
  quiz.push({ q: 'Dockerfile: <code>ENTRYPOINT ["python", "app.py"]</code> and <code>CMD ["--port", "8000"]</code>. What runs for <code>docker run img --port 9000</code>?', options: ['<code>python app.py --port 9000</code>', '<code>--port 9000</code>', '<code>python app.py --port 8000 --port 9000</code>', '<code>python app.py</code>'], answer: 0, explain: 'Run arguments replace CMD; ENTRYPOINT stays. CMD is only the default argument list.' });
  quiz.push({ q: 'Why does putting <code>COPY . .</code> before <code>RUN pip install -r requirements.txt</code> slow down builds?', options: ['Any file change invalidates the COPY layer, so the install below it reruns', 'COPY . . is slower than COPY src/', 'pip cannot use the cache after a COPY', 'It makes the image larger'], answer: 0, explain: 'A cache miss breaks the chain: every later step rebuilds. Copy the dependency manifest, install, then copy the source.' });
  quiz.push({ q: 'A Dockerfile downloads a 500 MB file in one RUN and deletes it in the next RUN. How much does this add to the image?', options: ['About 500 MB', '0 MB', 'About 250 MB', 'It depends on .dockerignore'], answer: 0, explain: 'Layers only add. The delete creates a whiteout in a new layer; the bytes stay in the earlier one. Download, use and delete in one RUN, or use a build stage.' });
  quiz.push({ q: 'In a multi-stage build, what ends up in the final image?', options: ['Only the last stage (or the --target stage) plus files it copied with COPY --from', 'All stages merged', 'The first stage only', 'Every stage\'s layers, but compressed'], answer: 0, explain: 'Earlier stages are build-only. That is how compilers, dev dependencies and caches stay out of production images.' });
  quiz.push({ q: 'An image built on an Apple Silicon Mac fails on an x86 server with <code>exec format error</code>. Best fix?', options: ['Publish a multi-platform image with <code>docker buildx build --platform linux/amd64,linux/arm64 --push</code>', 'Add <code>--privileged</code> on the server', 'Use the <code>:latest</code> tag', 'Install QEMU on the server and keep the arm64 image'], answer: 0, explain: 'The binary is arm64 machine code. A manifest list carries one image per platform under one tag, and each host pulls its own.' });
  quiz.push({ q: 'Which way of giving a build an npm token leaves nothing in the image or its history?', options: ['<code>RUN --mount=type=secret,id=npmrc,target=/root/.npmrc npm ci</code>', '<code>ARG NPM_TOKEN</code> with <code>--build-arg</code>', '<code>ENV NPM_TOKEN=...</code>', '<code>COPY .npmrc .</code> then <code>RUN rm .npmrc</code>'], answer: 0, explain: 'A secret mount exists only during that RUN, as a temporary file. ARG is recorded in history, ENV in the config, and COPY in a layer.' });
  quiz.push({ q: 'In docker compose, the api service connects to <code>localhost:5432</code> and gets "connection refused". The database service is called <code>db</code>. Why?', options: ['localhost is the api container itself; use <code>db:5432</code>', 'The db port is not published', 'Compose services cannot talk to each other', 'Postgres only accepts 127.0.0.1'], answer: 0, explain: 'Each container has its own network stack. Compose registers service names in DNS on the project network; no published port is needed between services.' });
  quiz.push({ q: 'What does <code>depends_on: [db]</code> (without a condition) wait for?', options: ['Only for the db container to be started', 'For Postgres to accept connections', 'For the db healthcheck to pass', 'For the db image to be pulled on all hosts'], answer: 0, explain: 'Started is not ready. Use a healthcheck plus <code>condition: service_healthy</code>, and keep retries in the app.' });
  quiz.push({ q: 'A container shows <code>Exited (137)</code> and <code>OOMKilled=true</code>. What happened?', options: ['The kernel killed it with SIGKILL for exceeding its memory limit', 'It received SIGTERM and stopped cleanly', 'The command was not found', 'The image architecture was wrong'], answer: 0, explain: '137 = 128 + 9 (SIGKILL). With OOMKilled=true the sender was the OOM killer. Check memory growth with docker stats before raising the limit.' });
  quiz.push({ q: 'Which command removes a compose stack AND deletes its named volumes?', options: ['<code>docker compose down -v</code>', '<code>docker compose down</code>', '<code>docker compose stop</code>', '<code>docker compose rm</code>'], answer: 0, explain: 'Plain <code>down</code> keeps named volumes so data survives. <code>-v</code> deletes them, including your local database.' });
  quiz.push({ q: 'Why is <code>python:3.12-alpine</code> often a poor choice for a Python app with numpy and pandas?', options: ['Alpine uses musl, so many wheels must compile from source: slow builds, sometimes bigger images', 'Alpine cannot run Python 3.12', 'Alpine images cannot be scanned', 'Alpine has no non-root users'], answer: 0, explain: 'manylinux wheels target glibc. On musl, pip often builds from source, needing compilers in the image. Slim (glibc) or distroless is usually the better default.' });
  quiz.push({ q: 'What does <code>docker run --init</code> add?', options: ['A tiny init (tini) as PID 1 that forwards signals and reaps zombie processes', 'An init container that runs before the app', 'A healthcheck', 'A default entrypoint script'], answer: 0, explain: 'Apps that spawn children need someone at PID 1 to reap them. tini does that and passes SIGTERM on to the app.' });

  // ───────────────────────── Interview ─────────────────────────
  interview.push({ q: 'What is the difference between an image and a container?', level: 'B', a: `<p>An <b>image</b> is a read-only template: a stack of filesystem layers plus config (command, user, env, ports), identified by a digest. A <b>container</b> is a running (or stopped) instance of an image: a process isolated with namespaces and limited with cgroups, plus a thin writable layer on top of the image's layers. Many containers can share one image; deleting a container deletes its writable layer but not the image. That is why fixes belong in the Dockerfile and data belongs in volumes.</p>`, followUps: ['Where is the writable layer stored on Linux?', 'What is the difference between an image ID and a repo digest?'] });
  interview.push({ q: 'CMD vs ENTRYPOINT, and shell form vs exec form?', level: 'B', a: `<p>ENTRYPOINT is the fixed executable; CMD supplies default arguments (or the whole command if there is no ENTRYPOINT), and anything after the image name in <code>docker run</code> replaces CMD. Exec form (<code>["app", "arg"]</code>) runs the program directly as PID 1; shell form wraps it in <code>/bin/sh -c</code>, so the shell is PID 1 and may not forward SIGTERM, causing 10-second stops and SIGKILL (137). I use exec form, a wrapper script ending in <code>exec "$@"</code> when setup is needed, and <code>--init</code> when the app spawns children.</p>`, followUps: ['How do you expand an environment variable in an exec-form CMD?', 'What does STOPSIGNAL do?'] });
  interview.push({ q: 'A container exits immediately after starting. How do you debug it?', level: 'B', a: `<p>First <code>docker ps -a</code> for the exit code, then <code>docker logs</code>. Exit 0 usually means PID 1 finished: the command daemonized (<code>service nginx start</code>) or was a one-shot; run the server in the foreground. Exit 1 is an app error: missing env var or config, visible in logs. 127/126 mean the command is missing or not executable (wrong path, CRLF endings, binary not copied into the runtime stage). Then <code>docker inspect</code> to check the effective Entrypoint/Cmd, and <code>docker run --rm -it --entrypoint sh IMAGE</code> to look around.</p>`, followUps: ['How would you debug the same issue in a distroless image?', 'What does exit code 125 mean?'] });
  interview.push({ q: 'How does Docker layer caching work and how do you write a cache-friendly Dockerfile?', level: 'I', a: `<p>Each instruction produces a layer whose cache key depends on its parent and its inputs: the command text for RUN, file checksums for COPY/ADD, and used build args. The first miss rebuilds every later step. So order from least to most frequently changing: base, system packages, dependency manifest and install, then source. Use .dockerignore so irrelevant files (.git, docs) do not bust <code>COPY . .</code>, combine <code>apt-get update</code> and <code>install</code> in one RUN, use BuildKit cache mounts for package-manager caches, and in CI export/import cache (<code>--cache-to/--cache-from</code>) because runners start empty.</p>`, followUps: ['Why can a cached apt-get update layer cause 404s?', 'How does a build arg placed early hurt caching?'] });
  interview.push({ q: 'How would you shrink a 1.5 GB image?', level: 'I', a: `<p>Look first: <code>docker history</code> or dive shows the fat layers. Then: a multi-stage build so compilers and dev dependencies stay in the builder; a slim or distroless runtime base; install only runtime libraries; no package caches in layers (<code>--no-cache-dir</code>, <code>rm -rf /var/lib/apt/lists/*</code> in the same RUN, or cache mounts); a .dockerignore to keep .git, data and test fixtures out; copy only the needed artifact. A typical Python or Node app goes from 1.5 GB to about 200 MB, and Go to under 20 MB. I measure before and after and scan both: fewer packages also means fewer CVEs.</p>`, followUps: ['Why does deleting files in a later RUN not help?', 'When is alpine the wrong choice?'] });
  interview.push({ q: 'How do you handle secrets when building and running containers?', level: 'I', a: `<p>Never in the image: <code>ENV</code> shows in <code>docker inspect</code> and history, <code>ARG</code> is recorded in history and provenance, and <code>COPY .env</code> stays in a layer even after <code>rm</code>. At build time I use BuildKit secret mounts (<code>RUN --mount=type=secret,id=npmrc,target=/root/.npmrc</code>, built with <code>--secret id=npmrc,src=...</code>). At run time secrets come from the environment via a gitignored env file locally, compose <code>secrets:</code> mounted at <code>/run/secrets</code>, or a secrets manager / Kubernetes Secrets in the cloud. .dockerignore excludes .env files, and CI runs a secret scanner on images. If a secret ever leaked into an image, I rotate it first.</p>`, followUps: ['Why rotate before deleting the leaked image?', 'How does the <code>*_FILE</code> convention work in official images?'] });
  interview.push({ q: 'What makes a container image secure?', level: 'I', a: `<p>Small attack surface (slim/distroless, multi-stage, no shells or compilers where possible); a numeric non-root <code>USER</code>; base images pinned by digest and updated by a bot; vulnerability scanning in CI with a gate on fixable HIGH/CRITICAL; an SBOM and ideally a signature; no secrets inside. At run time: read-only root filesystem with tmpfs for scratch, <code>--cap-drop ALL</code>, <code>no-new-privileges</code>, memory/CPU/PID limits, no <code>--privileged</code> and no Docker socket mount, and published ports bound narrowly. Rootless Docker or Podman adds another layer.</p>`, followUps: ['Why is mounting /var/run/docker.sock dangerous?', 'Which capabilities does Docker keep by default?'] });
  interview.push({ q: 'Explain Docker networking: bridge, user-defined networks, host, and port publishing.', level: 'I', a: `<p>Each container gets its own network namespace. On a bridge network it gets a veth interface attached to a Linux bridge, NAT for outbound traffic, and an IP on a private subnet. The default bridge has no name resolution; user-defined bridges (and every compose project) provide DNS at 127.0.0.11, so containers reach each other by name on the container port without publishing. <code>-p host:container</code> adds a DNAT rule from the host; without an IP it binds 0.0.0.0 and on Linux can bypass ufw, so bind to 127.0.0.1 for private services. <code>--network host</code> shares the host stack (Linux only) and removes isolation. Inside a container, localhost is the container itself.</p>`, followUps: ['How does a container reach a service on the host?', 'What changes with rootless networking?'] });
  interview.push({ q: 'Volumes vs bind mounts vs tmpfs: when do you use each?', level: 'B', a: `<p>Named volumes are managed by Docker, survive container removal, bypass the overlay filesystem (good performance for databases), and are the default for persistent data. Bind mounts map a host path into the container: great for live code in development and for injecting config, but tied to host paths and permissions (UID mismatches, SELinux <code>:Z</code>). tmpfs lives in memory for scratch data and pairs with read-only root filesystems. Anything that must survive goes on a volume with a backup that has been test-restored; <code>docker compose down -v</code> and <code>docker volume prune</code> are the commands that destroy data.</p>`, followUps: ['How do you back up a named volume?', 'Why are bind mounts slow on Docker Desktop for macOS?'] });
  interview.push({ q: 'How do you make services in docker compose start in the right order?', level: 'I', a: `<p><code>depends_on</code> alone only orders container start, not readiness. I add healthchecks to dependencies (<code>pg_isready</code> for Postgres, <code>redis-cli ping</code>, an HTTP <code>/healthz</code> for APIs) and use <code>condition: service_healthy</code>; for one-shot jobs like migrations, <code>condition: service_completed_successfully</code>. The app still retries connections with backoff, because a dependency can restart later and orchestrators like Kubernetes do not order start-up at all. Healthchecks must use tools that exist in the image.</p>`, followUps: ['What happens if the migration job fails?', 'How is this handled in Kubernetes?'] });
  interview.push({ q: 'What is PID 1\'s special role in a container, and what are zombie processes?', level: 'A', a: `<p>In a PID namespace the first process is PID 1. The kernel does not apply default signal actions to it, so without a handler SIGTERM is ignored and Docker ends up sending SIGKILL after the grace period. PID 1 also adopts orphaned processes and must <code>wait()</code> for them; if it does not, exited children stay as zombies, consuming PID slots until the cgroup PID limit is hit and forks fail. Fixes: run the app in exec form with a proper SIGTERM handler, and use an init (<code>--init</code>, <code>init: true</code>, tini or dumb-init as ENTRYPOINT) whenever the app spawns subprocesses.</p>`, followUps: ['Why does <code>npm start</code> as PID 1 cause trouble?', 'How does Kubernetes handle the grace period?'] });
  interview.push({ q: 'How do multi-architecture images work, and how do you build them?', level: 'A', a: `<p>A tag can point to an OCI image index (manifest list) with one manifest per platform, such as linux/amd64 and linux/arm64. The client picks the entry that matches its platform, so the same tag works on x86 servers, Graviton and Apple Silicon. I build with <code>docker buildx build --platform linux/amd64,linux/arm64 --push</code> on a docker-container builder. For speed, compiled languages use <code>FROM --platform=$BUILDPLATFORM</code> and cross-compile with TARGETOS/TARGETARCH; steps that execute target binaries run under QEMU emulation, which is slow, so native arm64 runners help. The classic image store keeps one platform locally, so I push to a registry and verify with <code>imagetools inspect</code>.</p>`, followUps: ['What error do you see when the platform does not match?', 'What is BUILDPLATFORM vs TARGETPLATFORM?'] });
  interview.push({ q: 'A container keeps restarting in production. Walk me through your investigation.', level: 'A', a: `<p>I climb the ladder: <code>docker ps -a</code> for status and exit code; <code>docker logs --tail</code> for the last words; <code>docker inspect</code> for State (ExitCode, OOMKilled, Error, health log), RestartCount, limits and the effective command; <code>docker events</code> for a timeline of die/oom/health events; <code>docker stats</code> for memory and CPU against limits. 137 with OOMKilled points to memory: I check whether usage grows over time (leak or unbounded batch) before touching the limit, and make the runtime aware of it (JVM percentage, GOMEMLIMIT, Node heap flag). 1 means an app error in the logs; 127 a broken image. I reproduce with the same image digest and limits in a throwaway container, fix in code or Dockerfile, ship a new tag, and add alerting on restart counts.</p>`, followUps: ['How do you get a shell in a distroless container?', 'Why can the logs be empty even though the app crashed?'] });
  interview.push({ q: 'Docker vs Podman: what differs in practice?', level: 'I', a: `<p>Both run OCI images and most CLI commands match (<code>alias docker=podman</code>). Podman has no daemon: the CLI forks the runtime directly, and it is rootless by default, mapping container root to your user via user namespaces, which reduces risk. Practical differences: Podman prefers fully qualified image names (<code>docker.io/library/nginx</code>); compose runs via <code>podman compose</code> or podman-compose; SELinux hosts need <code>:Z</code>/<code>:z</code> on bind mounts and <code>:U</code> fixes ownership; rootless networking uses pasta/slirp4netns, so ports below 1024 need a sysctl; pushing to a plain-HTTP local registry needs <code>--tls-verify=false</code>. Podman also has pods (grouped containers like Kubernetes) and can generate Kubernetes YAML or systemd units.</p>`, followUps: ['What are the trade-offs of rootless containers?', 'How does Docker Desktop differ from Docker Engine on Linux?'] });
  interview.push({ q: 'How do registries, tags and digests fit into a deployment pipeline?', level: 'I', a: `<p>CI builds an image once, tags it with an immutable version and the Git SHA, scans it, pushes it, and records the digest the registry returns. Deploys reference that digest (or an immutable tag), never <code>latest</code>, so every environment runs the exact same bytes and rollback is "deploy the previous digest". Registries are content-addressed, so pushes and pulls transfer only missing layers; good layer order makes releases tiny. I enable tag immutability and scan-on-push where available, use a pull-through cache to avoid Docker Hub rate limits, and set retention rules plus garbage collection to control storage. For practice, <code>registry:2</code> on localhost:5000 behaves like the real thing.</p>`, followUps: ['Why can two builds of the same commit produce different digests?', 'How would you promote an image from staging to production?'] });

  registerModule({
    id: 'devops08',
    title: 'Containers with Docker',
    lang: 'bash',
    intro: `<p>Containers are how almost every team packages and ships software in 2026, and "can you containerise this?" is one of the first real tasks a cloud support or junior DevOps engineer gets. This module teaches Docker as you will use it at work: what images and containers really are, how to write Dockerfiles that build fast (layer order and caching), stay small (multi-stage builds, slim and distroless bases) and stay safe (non-root users, pinned digests, scanning, read-only containers, and <b>never baking secrets into images</b>), how to keep data in volumes, connect services on networks, run a whole local stack with docker compose, ship images through a registry, and debug containers that crash, hang or will not stop.</p>
      <p>Every topic starts from a real incident: the 1.5 GB image, the build that reinstalls dependencies on every commit, the image built on a Mac that fails on x86 servers, the container that exits at once, the database that lost its data, the api that cannot reach its database because it uses <code>localhost</code>, the zombie pile-up and the OOM-killed restart loop. Example Dockerfiles cover Python, Node, Go and Java. All labs run on <b>Docker Desktop, Docker Engine on Linux/WSL, or Podman</b>, use a <b>local registry</b> (<code>registry:2</code>), and need no cloud account. Dockerfiles are shown as plain text (no checker exists for them); bash and compose YAML are syntax-checked.</p>`,
    goals: [
      'Explain images vs containers, layers, the writable layer, tags vs digests and the container lifecycle, and use Docker, Docker Desktop or Podman with their differences in mind',
      'Write Dockerfiles for Python, Node, Go and Java services with exec-form commands, correct PID 1 behaviour, graceful shutdown, healthchecks and <code>--init</code> where children are spawned',
      'Order Dockerfile steps for the build cache, write a .dockerignore, use BuildKit cache mounts, and predict which steps rebuild after a change',
      'Shrink images with multi-stage builds and slim/distroless bases, and publish multi-architecture images with buildx for amd64 and arm64',
      'Harden images and containers: non-root users, digest pinning, scanning with docker scout or trivy, read-only root filesystems, dropped capabilities, and secrets via BuildKit secret mounts, env files and compose secrets',
      'Keep data with named volumes and tested backups, connect containers on user-defined networks by name, and publish ports safely',
      'Run a multi-service local stack with docker compose using healthchecks, <code>depends_on</code> conditions, secrets, networks and profiles',
      'Push and pull through a registry by tag and digest, and debug containers with logs, exec, inspect, stats and events, reading exit codes such as 127, 137 and 143'
    ],
    prereqs: `<b>Required:</b> <b>Cloud &amp; DevOps 1</b> (Linux for the Cloud) for processes, signals, permissions, users and the filesystem, and <b>Cloud &amp; DevOps 2</b> (Bash Scripting for Operations) for the scripts, quoting and <code>set -euo pipefail</code> used in every lab. <b>Helpful:</b> <b>CS Core 9</b> (Containers, Virtualization &amp; High-Performance I/O), which explains the kernel side: namespaces, cgroups, OverlayFS and copy-up. This module uses those ideas without repeating them. Later, <b>Cloud &amp; DevOps 11</b> (CI/CD) builds these images in pipelines and <b>Cloud &amp; DevOps 13</b> (Kubernetes Core) runs them in clusters.`,
    hours: 12,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
