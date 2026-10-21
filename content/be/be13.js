(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ---------- shared helpers ---------- */
  function cp(o) { return JSON.parse(JSON.stringify(o)); }
  function bx(id, label, x, y, w) {
    var n = { id: id, label: label === undefined ? id : label, x: x, y: y, shape: 'box' };
    if (w) n.w = w;
    return n;
  }
  function ints(input, max, hint) {
    var a = String(input == null ? '' : input).trim().split(/[\s,]+/).filter(function (s) { return s !== ''; }).map(Number);
    if (!a.length || a.some(function (x) { return isNaN(x); })) throw new Error(hint);
    if (a.length > max) throw new Error('Use at most ' + max + ' numbers');
    return a;
  }

  /* ================================================================
     TOPIC 1 — Containers vs VMs, images and layers
     ================================================================ */
  topics.push({
    title: 'Containers vs VMs, Images and Layers',
    analogy: `<p>A <b>virtual machine</b> is like building a whole <b>separate house</b> for every family: own foundation, own plumbing, own electricity. Safe, but slow to build and heavy. A <b>container</b> is like an <b>apartment in one big building</b>: everyone shares the foundation and plumbing (the host's operating-system kernel), but each family has a locked door and its own rooms.</p>
<p>An <b>image</b> is the <b>recipe plus pre-packed ingredients</b> in a sealed box, and a <b>container</b> is the dish you cook from it. The box is built in <b>layers</b>, like a lasagna: if you change only the top sauce, you do not rebuild the pasta.</p>`,
    explain: `<p>🟢 <b>The problem containers solve:</b> "It works on my laptop!" Your app needs a certain Java version, certain libraries and certain settings. A container packs the app <b>and everything it needs</b> into one box that runs the same on your laptop, in CI and in production.</p>
<p><b>VM vs container in one line:</b> a VM carries its own full operating system (GBs, boots in minutes); a container shares the host's kernel and only carries the app plus its files (MBs, starts in a second).</p>
${H.table(['', 'Virtual machine', 'Container'], [
  ['Has its own OS kernel?', 'Yes (guest OS)', 'No - shares host kernel'],
  ['Typical size', '1-20 GB', '10-500 MB'],
  ['Start time', '30 s - minutes', 'milliseconds - seconds'],
  ['Isolation', 'Strong (hypervisor)', 'Good (namespaces + cgroups), weaker than VM'],
  ['Good for', 'Different OSes, strong tenant isolation', 'Packaging and scaling apps']
])}
<p>🔵 <b>Image vs container.</b> An <b>image</b> is a read-only, layered file system plus metadata (start command, environment, ports). A <b>container</b> is a running process created from an image, with a thin <b>writable layer</b> on top. You can start 100 containers from one image; they share the read-only layers on disk.</p>
<p><b>Layers.</b> Every Dockerfile instruction that changes files (<code>RUN</code>, <code>COPY</code>, <code>ADD</code>) creates a new layer. Layers are identified by a hash of their content, so they can be cached and shared. Pulling an image downloads only the layers you do not already have.</p>
<p><b>What makes a container a container?</b> Two Linux features: <b>namespaces</b> (each container sees its own process list, network, hostname, file system) and <b>cgroups</b> (limits on CPU and memory). There is no magic - a container is just a normal process with blinders on.</p>`,
    clues: ['"works on my machine" / "make deploys reproducible" → containers + images', '"start in seconds", "pack many apps on one host" → containers, not VMs', '"untrusted tenants / different OS" → VM (or microVM like Firecracker)', '"image is 1 GB, pulls are slow" → layers, base image choice, multi-stage', '"same image dev → staging → prod" → immutable images, config from the outside', '"container keeps eating all memory" → cgroup limits'],
    code: [
      { lang: 'bash', title: 'Everyday image and container commands', check: false, code: `# Build an image from the Dockerfile in this folder and tag it
docker build -t shop-api:1.0 .

# See the layers (one row per instruction, with sizes)
docker history shop-api:1.0

# Run a container: map host port 8080 to container port 8080, limit memory
docker run -d --name shop -p 8080:8080 --memory=512m shop-api:1.0

# Look inside, read logs, stop and clean up
docker exec -it shop sh
docker logs -f shop
docker stop shop && docker rm shop` },
      { lang: 'text', title: 'Layers of a typical Java image (bottom to top)', check: false, code: `L1  FROM eclipse-temurin:21-jre-alpine   ~ 190 MB   (base OS + JRE)
L2  RUN adduser -S app                  ~   1 MB   (non-root user)
L3  COPY libs/ /app/libs/               ~  60 MB   (dependencies - change rarely)
L4  COPY app.jar /app/app.jar           ~  25 MB   (your code - changes every commit)
--  container writable layer            ~   0 MB   (logs, temp files; gone when container is removed)` }
    ],
    viz: [{
      title: 'Building an image layer by layer',
      gen: function () {
        var layers = [
          ['L1 FROM jre-alpine 190MB', 'The base image: a tiny OS plus a Java runtime. Everything above sits on top of it.'],
          ['L2 adduser app 1MB', 'A small layer that creates a non-root user. Each instruction that touches files makes a new layer.'],
          ['L3 COPY libs 60MB', 'Dependencies. They change rarely, so this layer is reused build after build.'],
          ['L4 COPY app.jar 25MB', 'Your own code on top. It changes every commit, so it must be the LAST big layer.']
        ];
        var frames = [], items = [];
        frames.push({ narr: 'An image starts empty. Layers are stacked <b>bottom to top</b>, and each one is <b>read-only</b>.', parts: [{ type: 'stack', label: 'Image layers (bottom to top)', items: [] }] });
        layers.forEach(function (l, i) {
          items.push(l[0]);
          var hl = {}; hl[i] = 'ok';
          frames.push({ narr: '<b>Add ' + l[0].split(' ')[0] + '.</b> ' + l[1], parts: [
            { type: 'stack', label: 'Image layers (bottom to top)', items: items.slice(), hl: hl },
            { type: 'vars', vals: { layers: items.length, 'size so far (MB)': [190, 191, 251, 276][i] } }
          ] });
        });
        var withRw = items.concat(['RW container layer (temp, logs)']);
        var h2 = {}; h2[4] = 'cur';
        frames.push({ narr: 'Running a container adds ONE thin <b>writable layer</b> on top. It is thrown away when the container is removed - so never store real data there.', parts: [
          { type: 'stack', label: 'Container = image layers + writable layer', items: withRw, hl: h2 }
        ] });
        frames.push({ narr: 'Ten containers from this image share the same four read-only layers on disk. Only each thin writable layer is different. That is why containers start fast and use little space.', parts: [
          { type: 'stack', label: 'Shared read-only layers', items: items.slice(), hl: { 0: 'done', 1: 'done', 2: 'done', 3: 'done' } },
          { type: 'vars', vals: { containers: 10, 'disk for layers (MB)': 276, 'extra per container (MB)': '~0' }, hl: { 'disk for layers (MB)': 'ok' } }
        ] });
        return frames;
      }
    }, {
      title: 'VM vs container: who carries an operating system?',
      gen: function () {
        var vm = {
          type: 'graph', label: 'Virtual machines', directed: false, height: 70,
          nodes: [bx('hw', 'Hardware', 50, 62, 40), bx('hyp', 'Hypervisor', 50, 46, 40), bx('os1', 'Guest OS 1', 22, 30, 24), bx('os2', 'Guest OS 2', 78, 30, 24), bx('a1', 'App A', 22, 12, 20), bx('a2', 'App B', 78, 12, 20)],
          edges: [['hw', 'hyp'], ['hyp', 'os1'], ['hyp', 'os2'], ['os1', 'a1'], ['os2', 'a2']], hl: {}, tags: { os1: '~1-5 GB', os2: '~1-5 GB' }
        };
        var ct = {
          type: 'graph', label: 'Containers', directed: false, height: 70,
          nodes: [bx('hw', 'Hardware', 50, 62, 40), bx('os', 'Host OS + kernel', 50, 46, 40), bx('rt', 'Container runtime', 50, 30, 40), bx('c1', 'App A + libs', 22, 12, 28), bx('c2', 'App B + libs', 78, 12, 28)],
          edges: [['hw', 'os'], ['os', 'rt'], ['rt', 'c1'], ['rt', 'c2']], hl: {}, tags: { c1: '~100 MB', c2: '~100 MB' }
        };
        var frames = [];
        frames.push({ narr: 'With <b>VMs</b>, each app drags a full guest operating system along. Strong walls, but every VM costs GBs of disk and RAM and takes a while to boot.', parts: [cp(vm)] });
        var vm2 = cp(vm); vm2.hl = { os1: 'bad', os2: 'bad' };
        frames.push({ narr: 'The red boxes are the <b>duplicated</b> operating systems. Two apps = two kernels.', parts: [vm2] });
        frames.push({ narr: 'With <b>containers</b>, apps share the host kernel. Each container only holds the app and its libraries.', parts: [cp(ct)] });
        var ct2 = cp(ct); ct2.hl = { c1: 'ok', c2: 'ok' }; ct2.ehl = { 'rt-c1': 'ok', 'rt-c2': 'ok' };
        frames.push({ narr: 'No duplicate kernel: containers are small and start in about a second. The trade-off: a kernel bug can affect every container on the host, so isolation is a bit weaker than VMs.', parts: [ct2] });
        return frames;
      }
    }],
    examples: [
      { title: 'Reading docker history', html: `<p>The command <code>docker history shop-api:1.0</code> prints one row per layer, newest first. Look for the <b>fat rows</b>: a 400 MB row means one instruction (often <code>RUN apt-get install</code> or <code>COPY . .</code>) is dragging that much into the image. That is where you shrink first.</p>${H.table(['Layer', 'Size', 'Verdict'], [['COPY app.jar', '25 MB', 'fine'], ['COPY libs/', '60 MB', 'fine, cached'], ['RUN apt-get install build-essential', '<span class="c-r">410 MB</span>', 'build tools in runtime image - remove'], ['FROM ubuntu:22.04', '<span class="c-r">77 MB</span>', 'bigger base than needed']])}` },
      { title: 'Containers are processes', html: `<p>On a Linux host, run a container and then <code>ps aux</code> on the <b>host</b>: you will see your Java process listed like any other. Inside the container it is "PID 1" because of the PID namespace. It looks like a tiny computer, but it is only a process with its own view of the world and CPU/memory limits (cgroups).</p><p>Gotcha: because it is PID 1, it must handle <code>SIGTERM</code> properly or <code>docker stop</code> waits 10 s and then kills it. Java and Node handle this fine when started directly; shell wrappers (<code>CMD run.sh</code>) often swallow the signal. Use the exec form: <code>CMD ["java","-jar","app.jar"]</code>.</p>` },
      { title: 'When a VM is still the right answer', html: `<p>A company runs code uploaded by <b>strangers</b> (online code judge, SaaS plug-ins). A container escape bug would be catastrophic, so they run each job in a <b>microVM</b> (Firecracker, gVisor-style sandbox): VM-grade walls with container-like speed. Rule of thumb: <b>trusted code, many copies → containers; untrusted code or other OS → VM or microVM</b>. Kubernetes nodes themselves are usually VMs, and the containers run inside them.</p>` }
    ],
    deepDive: `<p>🟣 <b>How layers really work.</b> Images use a <b>union file system</b> (overlayfs on modern Linux). The read-only layers are stacked; when the container writes to a file that lives in a lower layer, the file is first <b>copied up</b> into the writable layer (copy-on-write). Deleting a file in a later layer only adds a "whiteout" marker - the bytes still exist in the lower layer! So <code>RUN rm big.tar</code> in a <i>separate</i> instruction does NOT shrink the image; you must download, use and delete in the <b>same</b> <code>RUN</code>.</p>
<p><b>Content addressing.</b> Each layer and the image config is stored by its SHA-256 digest. A tag like <code>:1.0</code> is a movable label; a digest <code>@sha256:...</code> is an immutable fingerprint. For reproducible production deploys, pin by digest (or at least by an exact version tag), never <code>:latest</code>.</p>
<p><b>Registries and OCI.</b> Images follow the <b>OCI</b> spec, so Docker, containerd, Podman and Kubernetes all understand them. A registry (Docker Hub, Amazon ECR, Google Artifact Registry, GHCR) stores layers and a <b>manifest</b> listing them. Multi-architecture images use a manifest list (amd64 + arm64) - building on an Apple-silicon laptop and deploying on amd64 nodes is a classic "exec format error".</p>
<p><b>Limits are real.</b> Without <code>--memory</code>, a JVM may size its heap off the whole host. Modern JVMs (container-aware since 10) read the cgroup limit; use <code>-XX:MaxRAMPercentage=75</code> rather than a fixed <code>-Xmx</code>. When a process exceeds its memory limit the kernel OOM-kills it (exit code 137) - you will meet this in Kubernetes as <code>OOMKilled</code>.</p>
<p><b>Security basics.</b> Containers are not a security boundary by themselves: run as non-root, drop capabilities, use a read-only root file system where possible, scan images for known CVEs, and never bake secrets into layers - anyone with the image can read every layer.</p>`,
    aiEra: `<p>🤖 <b>What AI changes.</b> Assistants generate Dockerfiles in seconds, and "containerize this repo" is now a one-prompt job. Tools can also summarise <code>docker history</code> output and point at the fat layer, and AI image scanners explain CVEs in plain English.</p>
<p><b>Use AI as a partner:</b> paste your Dockerfile and ask <code>Which instruction makes this image biggest, and which edits keep the build cache effective?</code> Ask it to explain each line, then verify with <code>docker history</code> yourself.</p>
<p><b>Where AI goes wrong:</b> it often picks <code>:latest</code> tags, runs as root, copies the whole repo with <code>COPY . .</code> (including <code>.env</code> files!), or invents base-image tags that do not exist. It also loves putting secrets in <code>ENV</code> lines "for convenience".</p>
<p><b>What you must still own:</b> choosing the base image and pinning it, knowing what ends up in each layer, and the secret-handling rule - <b>nothing sensitive in an image, ever</b>. Also, containers now run AI workloads (GPU images are huge: 5-15 GB), so layer discipline matters even more there.</p>`,
    problems: [{
      title: 'Why Did the Image Not Shrink After rm?',
      level: 'Easy', tags: ['docker', 'layers'], companies: ['Amazon', 'Google'],
      statement: `<p>A teammate's Dockerfile has these two lines and the image is still 600 MB larger than expected, even though the archive is deleted:</p><pre>RUN curl -sSL https://example.com/tool.tar.gz -o /tmp/tool.tar.gz
RUN tar -xzf /tmp/tool.tar.gz -C /opt &amp;&amp; rm /tmp/tool.tar.gz</pre><p>Explain why and fix it.</p>`,
      constraints: `Image must keep /opt/tool; the archive must not remain in any layer.`,
      example: `<p>Layer A (curl) = +600 MB. Layer B (tar + rm) = +extracted files, plus a whiteout marker for the archive. Total includes the 600 MB from layer A: ${H.c('r', 'deleted in B, still stored in A')}.</p>`,
      brute: { why: `<p>Keep both <code>RUN</code> lines and hope <code>rm</code> frees space. It does not: layers are immutable, so layer A still holds the archive bytes forever.</p>`, code: { lang: 'text', check: false, code: `RUN curl -o /tmp/tool.tar.gz URL\nRUN tar -xzf /tmp/tool.tar.gz -C /opt && rm /tmp/tool.tar.gz` } },
      mcq: { q: 'Which change really removes the archive from the image?', options: ['Download, extract and delete in ONE RUN instruction', 'Add a third RUN rm -rf /tmp', 'Use docker system prune before building'], answer: 0, explain: 'A layer only records the file changes of its own instruction. If the file never exists at the end of a single instruction, it never lands in any layer.' },
      hints: [`<p>Think about what a layer is: a diff stored forever. Can a later diff remove bytes from an earlier one?</p>`, `<p>The download and the delete must happen inside the same instruction.</p>`, `<p>Join with <code>&amp;&amp;</code> and a backslash. Alternative: use a multi-stage build and copy only <code>/opt/tool</code> to the final image.</p>`],
      solution: {
        approach: `<p>Each <code>RUN</code> creates an immutable layer. Layer 1 contains the 600 MB archive; layer 2's <code>rm</code> only adds a whiteout marker, so the data is still shipped. Fix: do download, extract and cleanup in a single <code>RUN</code>, so the archive never exists at the end of an instruction. Even better, use a multi-stage build: download and extract in a <code>builder</code> stage and <code>COPY --from=builder /opt/tool /opt/tool</code> into a clean final stage.</p>`,
        code: { lang: 'text', check: false, code: `RUN curl -sSL https://example.com/tool.tar.gz -o /tmp/tool.tar.gz \\
 && tar -xzf /tmp/tool.tar.gz -C /opt \\
 && rm /tmp/tool.tar.gz` },
        complexity: `<p>Image size drops by the archive size (600 MB here). Build time is the same.</p>`,
        followUps: ['How would you verify with docker history?', 'Why is a multi-stage build even cleaner?']
      }
    }]
  });

  /* ================================================================
     TOPIC 2 — Dockerfile best practices
     ================================================================ */
  topics.push({
    title: 'Dockerfile Best Practices: Multi-Stage, Small, Non-Root, Cache-Friendly',
    analogy: `<p>Packing for a trip: you do not carry the <b>whole workshop</b> that built your suitcase. You build in the workshop (the <b>build stage</b>), then move only the finished suitcase into the car (the <b>runtime stage</b>). And you pack in order of <b>how often things change</b>: socks and passport (rarely change) go in first; today's snacks go on top, so repacking is quick.</p>`,
    explain: `<p>🟢 <b>Five habits that fix 90% of bad Dockerfiles:</b></p>
<ol>
<li><b>Multi-stage build</b> - compile in a fat "builder" image (JDK, Maven, npm dev-deps), then copy just the result (a jar, a <code>dist/</code> folder) into a tiny runtime image (JRE only). A 1 GB image often becomes ~200 MB.</li>
<li><b>Small, pinned base</b> - <code>eclipse-temurin:21-jre-alpine</code> or "distroless" instead of <code>ubuntu</code>. Pin the version (never <code>:latest</code>).</li>
<li><b>Run as non-root</b> - add <code>USER app</code>. If someone breaks into the app, they are not root in the container.</li>
<li><b>Order for the cache</b> - copy the files that change <b>least</b> first (dependency list), install dependencies, and copy the source code <b>last</b>.</li>
<li><b>Ignore junk</b> - a <code>.dockerignore</code> with <code>.git</code>, <code>target/</code>, <code>node_modules</code>, <code>.env</code> keeps the build context small and secrets out.</li>
</ol>
<p>🔵 <b>How the build cache works.</b> Docker walks the instructions top to bottom. For each one it asks: "Do I already have a layer made from the <b>same parent layer</b> and the <b>same instruction + same input files</b>?" If yes → <span class="c-g">cache HIT</span>, reuse instantly. If no → <span class="c-r">MISS</span>, run it, and <b>every instruction after it also misses</b> (because its parent changed). One early change busts everything below it.</p>
${H.table(['Step (BAD order)', 'You edit one .java file', 'Step (GOOD order)', 'You edit one .java file'], [
  ['FROM jdk', '<span class="c-g">HIT</span>', 'FROM jdk', '<span class="c-g">HIT</span>'],
  ['COPY . .', '<span class="c-r">MISS</span>', 'COPY pom.xml', '<span class="c-g">HIT</span>'],
  ['RUN mvn dependency:go-offline', '<span class="c-r">MISS (re-download!)</span>', 'RUN mvn dependency:go-offline', '<span class="c-g">HIT</span>'],
  ['RUN mvn package', '<span class="c-r">MISS</span>', 'COPY src ./src', '<span class="c-r">MISS</span>'],
  ['', '', 'RUN mvn package', '<span class="c-r">MISS</span>']
])}
<p>Same edit: the bad file re-downloads every dependency (minutes); the good file only recompiles (seconds).</p>`,
    clues: ['"image is huge / 1 GB+" → multi-stage + smaller base', '"every build re-downloads dependencies" → copy dependency manifest first', '"build takes 10 minutes in CI for a one-line change" → cache order / cache backend', '"container runs as root" / "security scan failed" → USER, minimal base', '".env or .git ended up in the image" → .dockerignore, secret mounts', '"docker stop takes 10 seconds" → PID 1 / signal handling, exec-form CMD', '"pin the version for reproducible builds" → exact tags or digests'],
    code: [
      { lang: 'text', title: 'Multi-stage Dockerfile for a Spring Boot app (Dockerfile)', check: false, code: `# ---------- Stage 1: builder (fat: JDK + Maven, thrown away) ----------
FROM maven:3.9-eclipse-temurin-21 AS builder
WORKDIR /build

# 1) Copy ONLY the dependency list first -> this layer is cached until pom.xml changes
COPY pom.xml .
RUN mvn -B -q dependency:go-offline

# 2) Now copy the source (changes on every commit) and build
COPY src ./src
RUN mvn -B -q package -DskipTests

# ---------- Stage 2: runtime (small: JRE only) ----------
FROM eclipse-temurin:21-jre-alpine
# Non-root user, no shell login, no home needed
RUN addgroup -S app && adduser -S -G app app
WORKDIR /app

# Copy ONLY the finished jar from the builder stage
COPY --from=builder /build/target/shop-api.jar app.jar

USER app
EXPOSE 8080
# Let the JVM size its heap from the container memory limit
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75"
# Exec form: java is PID 1 and receives SIGTERM directly
ENTRYPOINT ["java", "-jar", "app.jar"]` },
      { lang: 'text', title: '.dockerignore', check: false, code: `.git
target/
node_modules/
*.log
.env
.env.*
Dockerfile
docker-compose*.yml` },
      { lang: 'js', run: true, title: 'Build-cache simulator: HIT or MISS per step (runnable)', code: `// Each layer's cache key = hash(parent key + instruction + hash of the files it copies).
// If the key was seen in a previous build -> HIT. A MISS changes the key of every later step.
function hash(s) { var h = 5381; for (var i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0; return h.toString(16); }

function build(steps, files, cache) {
  var parent = 'root', out = [];
  steps.forEach(function (st) {
    var input = (st.copies || []).map(function (f) { return f + '=' + files[f]; }).join(';');
    var key = hash(parent + '|' + st.cmd + '|' + input);
    var hit = cache.has(key);
    cache.add(key);
    out.push((hit ? 'HIT  ' : 'MISS ') + st.cmd);
    parent = key;                       // children depend on this key
  });
  return out;
}

var bad = [
  { cmd: 'FROM jdk' },
  { cmd: 'COPY . .', copies: ['pom.xml', 'src'] },
  { cmd: 'RUN mvn dependency:go-offline' },
  { cmd: 'RUN mvn package' }
];
var good = [
  { cmd: 'FROM jdk' },
  { cmd: 'COPY pom.xml .', copies: ['pom.xml'] },
  { cmd: 'RUN mvn dependency:go-offline' },
  { cmd: 'COPY src ./src', copies: ['src'] },
  { cmd: 'RUN mvn package' }
];

[['BAD order', bad], ['GOOD order', good]].forEach(function (p) {
  var cache = new Set();
  build(p[1], { 'pom.xml': 'v1', src: 'v1' }, cache);                 // first build warms the cache
  var second = build(p[1], { 'pom.xml': 'v1', src: 'v2' }, cache);    // you edited one source file
  console.log('--- ' + p[0] + ': after editing one .java file ---');
  second.forEach(function (l) { console.log(l); });
  console.log('rebuilt steps: ' + second.filter(function (l) { return l.indexOf('MISS') === 0; }).length + ' of ' + second.length);
});` }
    ],
    viz: {
      title: 'Layer cache: HIT or MISS after one change',
      input: 'good 4',
      inputLabel: 'Dockerfile order (good|bad) and which step number you edited',
      gen: function (input) {
        var m = String(input || '').trim().toLowerCase().match(/^(good|bad)\s+(\d+)$/);
        if (!m) throw new Error('Type good or bad, then the step number you changed, e.g. "good 4"');
        var good = m[1] === 'good', ch = parseInt(m[2], 10);
        var steps = good
          ? ['FROM jre-base', 'COPY pom.xml', 'RUN deps (slow 90s)', 'COPY src', 'RUN package (20s)', 'USER app']
          : ['FROM jre-base', 'COPY . .', 'RUN deps (slow 90s)', 'RUN package (20s)', 'USER app'];
        if (ch < 1 || ch > steps.length) throw new Error('Step number must be 1 to ' + steps.length);
        var frames = [], items = [], hl = {}, missed = false, cost = 0;
        var secs = good ? [0, 0, 90, 0, 20, 0] : [0, 0, 90, 20, 0];
        frames.push({ narr: 'Dockerfile order: <b>' + (good ? 'GOOD (rarely-changing first)' : 'BAD (COPY . . first)') + '</b>. You edited the files used by <b>step ' + ch + '</b>. Docker now walks the steps top to bottom.', parts: [
          { type: 'stack', label: 'Layers (bottom to top)', items: steps.slice() },
          { type: 'vars', vals: { 'edited step': ch, 'build seconds': 0 } }] });
        steps.forEach(function (s, i) {
          if (i + 1 === ch) missed = true;
          var miss = missed;
          items.push((miss ? 'MISS ' : 'HIT ') + s);
          hl[i] = miss ? 'bad' : 'ok';
          if (miss) cost += secs[i];
          var why = i + 1 === ch ? 'its input changed' : (miss ? 'the layer BELOW it changed, so the parent differs' : 'same parent, same instruction, same files');
          frames.push({ narr: 'Step ' + (i + 1) + ' <b>' + s + '</b>: ' + (miss ? '<span class="c-r">MISS</span>' : '<span class="c-g">HIT</span>') + ' - ' + why + '.' + (miss && secs[i] ? ' It runs for real (' + secs[i] + ' s).' : ''), parts: [
            { type: 'stack', label: 'Layers (bottom to top)', items: items.slice(), hl: JSON.parse(JSON.stringify(hl)) },
            { type: 'vars', vals: { 'edited step': ch, 'build seconds': cost }, hl: miss ? { 'build seconds': 'bad' } : {} }] });
        });
        frames.push({ narr: 'Done. Total real work: <b>' + cost + ' s</b>. ' + (cost >= 90 ? 'The slow dependency step re-ran - everything below the first change is rebuilt.' : 'The slow dependency layer was reused. Try "bad 4" to see the damage of a bad order.'), parts: [
          { type: 'stack', label: 'Final layers', items: items.slice(), hl: JSON.parse(JSON.stringify(hl)) },
          { type: 'vars', vals: { 'build seconds': cost }, hl: { 'build seconds': cost >= 90 ? 'bad' : 'ok' } }] });
        return frames;
      }
    },
    examples: [
      { title: 'Shrink a 1 GB image with a multi-stage build', html: `<p><b>Before</b> (one stage, everything stays):</p><pre>FROM maven:3.9-eclipse-temurin-21
COPY . .
RUN mvn package -DskipTests
CMD ["java","-jar","target/shop-api.jar"]</pre><p>Ships Maven, the JDK, <code>~/.m2</code> (hundreds of MB of jars), the source, and test output.</p>${H.table(['Version', 'Contents', 'Size'], [['Single stage (maven image)', 'JDK + Maven + .m2 + source + jar', '<span class="c-r">~1.0 GB</span>'], ['Multi-stage, temurin JRE', 'JRE + jar', '<span class="c-y">~280 MB</span>'], ['Multi-stage, JRE alpine', 'small OS + JRE + jar', '<span class="c-g">~190 MB</span>'], ['jlink custom runtime / distroless', 'only the Java modules you use', '<span class="c-g">~100-150 MB</span>']])}<p>Same app, same behaviour, 5x smaller, faster pulls, fewer CVEs to patch.</p>` },
      { title: 'Fix a Dockerfile that busts the cache (Node)', html: `<p><b>Bad:</b></p><pre>FROM node:22-alpine
WORKDIR /app
COPY . .
RUN npm ci
CMD ["node","server.js"]</pre><p>Any edit to any file invalidates <code>COPY . .</code>, so <code>npm ci</code> reruns every time.</p><p><b>Good:</b></p><pre>FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY . .
USER node
CMD ["node","server.js"]</pre><p>Now <code>npm ci</code> reruns only when the lockfile changes. Also add <code>node_modules</code> to <code>.dockerignore</code> so a local folder does not overwrite the clean install.</p>` },
      { title: 'Secrets in builds: the wrong and right way', html: `<p><b>Wrong:</b> <code>ENV NPM_TOKEN=abc123</code> or <code>COPY .npmrc .</code>. The value is stored in a layer; <code>docker history</code> or unpacking the image reveals it - even if you delete the file later.</p><p><b>Right:</b> BuildKit secret mounts - the secret exists only while that one <code>RUN</code> executes and is never written to a layer:</p><pre>RUN --mount=type=secret,id=npmrc,target=/root/.npmrc npm ci
# build with:  docker build --secret id=npmrc,src=./npmrc.local .</pre><p>At runtime, secrets arrive from outside (environment from a secret store, mounted files), never from the image.</p>` },
      { title: 'Cheat sheet: bad vs good', html: `${H.table(['Smell', 'Fix'], [['FROM ubuntu:latest', 'FROM eclipse-temurin:21-jre-alpine (pinned)'], ['COPY . . before installing deps', 'COPY dependency manifest, install, then COPY . .'], ['RUN apt-get update then install on separate lines', 'One RUN: update &amp;&amp; install --no-install-recommends &amp;&amp; rm -rf /var/lib/apt/lists/*'], ['Running as root', 'adduser + USER'], ['CMD java -jar app.jar (shell form)', 'ENTRYPOINT ["java","-jar","app.jar"] (exec form)'], ['No .dockerignore', 'Ignore .git, build output, .env']])}` }
    ],
    deepDive: `<p>🟣 <b>BuildKit.</b> Modern Docker uses BuildKit: it builds independent stages <b>in parallel</b>, skips stages the final target does not need, and supports cache mounts (<code>--mount=type=cache,target=/root/.m2</code>) that keep the Maven or npm cache between builds without putting it in a layer. In CI, where each job starts on a clean machine, push/pull the cache to a registry (<code>--cache-to / --cache-from type=registry</code>) or use the CI provider's cache action - otherwise you have written a cache-friendly Dockerfile that never gets a hit.</p>
<p><b>Cache-key details.</b> For <code>RUN</code>, the key is the command <i>text</i> (not what it downloads) - so <code>RUN apt-get update</code> can stay "cached" for months and serve stale packages. For <code>COPY</code>/<code>ADD</code>, the key includes a checksum of the copied files, ignoring timestamps. <code>ARG</code> values used in a RUN affect the key. Use <code>--no-cache</code> or bump a version ARG when you really want a fresh download.</p>
<p><b>Minimal runtimes.</b> Alpine uses musl libc: small, but some native libs (and glibc-built JNI code, some Python wheels) misbehave. Alternatives: <b>distroless</b> (no shell, no package manager - smallest attack surface, harder to debug; use ephemeral debug containers in Kubernetes), Debian-slim, or <b>jlink</b> to build a custom JRE with only needed modules. <b>Spring Boot layered jars</b> (<code>java -Djarmode=tools -jar app.jar extract --layers</code>; older Spring Boot used <code>layertools</code>) split dependencies and application classes into separate layers so a code change only re-pushes a few KB. Buildpacks (<code>mvn spring-boot:build-image</code>) and Jib build good layered images without a Dockerfile.</p>
<p><b>Reproducibility and supply chain.</b> Pin base images by digest, rebuild regularly to pick up patches, generate an SBOM, scan with a tool such as Trivy or Grype in CI, and sign images (cosign). A non-root user plus <code>readOnlyRootFilesystem</code> and dropped Linux capabilities in Kubernetes turns many exploits into non-events. Remember <b>HEALTHCHECK</b> is Docker-only; Kubernetes ignores it and uses its own probes (next topics).</p>`,
    aiEra: `<p>🤖 <b>What AI changes.</b> Assistants write a working multi-stage Dockerfile for most stacks on the first try, and can migrate you from a single-stage file to a multi-stage one. "Why is my build slow?" paste-the-log prompts are very effective at spotting a cache bust.</p>
<p><b>Use AI as a partner:</b> <code>Rewrite this Dockerfile as multi-stage, non-root, with dependency caching. Keep the Java version. Explain each change.</code> Then run <code>docker build</code> twice, edit one source file, and confirm the dependency step says CACHED.</p>
<p><b>Where AI goes wrong:</b> suggests <code>alpine</code> for everything (breaks glibc-only native libraries), forgets <code>.dockerignore</code>, copies <code>.env</code> into the image, uses <code>latest</code>, puts <code>ENV API_KEY=...</code> in the file, or "fixes" a permission error by switching back to root.</p>
<p><b>What you must still own:</b> measuring (image size, build time, cache hit rate), the non-root and no-secrets rules, and base-image patching policy. AI-generated GPU/ML images deserve extra care - they are huge, so slim runtime stages and cached model downloads (as a volume, not a layer) matter a lot.</p>`,
    problems: [{
      title: 'Fix the Dockerfile That Busts the Cache',
      level: 'Medium', tags: ['docker', 'cache', 'build'], companies: ['Uber', 'Shopify'],
      statement: `<p>This Python service's CI build takes 6 minutes even for a README typo. Find the problem and fix the Dockerfile.</p><pre>FROM python:3.12
WORKDIR /app
COPY . .
RUN pip install -r requirements.txt
CMD ["python", "main.py"]</pre>`,
      constraints: `Must still run as the same app; image should be smaller; dependencies must reinstall only when requirements.txt changes.`,
      example: `<p>Edit README.md → ${H.c('r', 'COPY . . MISS')} → ${H.c('r', 'pip install MISS (5 min)')}. Goal: README edit → ${H.c('g', 'pip install HIT')}.</p>`,
      brute: { why: `<p>Leave it. <code>COPY . .</code> copies <i>every</i> file, so any change anywhere invalidates that layer and all layers after it, including the slow <code>pip install</code>.</p>`, code: { lang: 'text', check: false, code: `COPY . .\nRUN pip install -r requirements.txt` } },
      mcq: { q: 'What is the minimum change that makes pip install cacheable?', options: ['COPY requirements.txt first, run pip install, then COPY the rest', 'Use pip install --no-cache-dir', 'Move CMD to the top'], answer: 0, explain: 'The dependency list changes rarely; copying only it first gives pip install a cache key that ignores source edits.' },
      hints: [`<p>Which file does <code>pip install</code> really depend on?</p>`, `<p>Split <code>COPY . .</code> into two COPYs with the install between them.</p>`, `<p>Also: slim base image, <code>--no-cache-dir</code>, <code>.dockerignore</code> for <code>.git</code> and <code>__pycache__</code>, and a non-root <code>USER</code>.</p>`],
      solution: {
        approach: `<p>Put things in order of change frequency: base image, dependency manifest, install, source, run command. Switching to <code>python:3.12-slim</code> cuts hundreds of MB, <code>--no-cache-dir</code> avoids storing pip's download cache in the layer, and a non-root user limits damage. A <code>.dockerignore</code> keeps <code>.git</code> and caches out of the build context so unrelated files cannot bust the <code>COPY . .</code> layer more often than needed.</p>`,
        code: { lang: 'text', check: false, code: `FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN useradd --create-home app
USER app
CMD ["python", "main.py"]` },
        complexity: `<p>Typical edit: build drops from ~6 min to ~10 s because only the final COPY layer (and below) rebuilds.</p>`,
        followUps: ['How do you share the cache between CI runners?', 'How would a BuildKit cache mount help?']
      }
    }, {
      title: 'Shrink a 1 GB Image',
      level: 'Medium', tags: ['docker', 'multi-stage', 'size'], companies: ['Netflix', 'Atlassian'],
      statement: `<p>The Java image from the example is 1.0 GB. List the concrete steps you would take to get it under 250 MB and say how you would check the result.</p>`,
      constraints: `Behaviour unchanged; security scan findings should drop; builds stay reproducible.`,
      example: `<p>Before: maven image (1.0 GB). After: JRE alpine + jar (${H.c('g', '~190 MB')}).</p>`,
      brute: { why: `<p>Delete files at the end of the Dockerfile with <code>RUN rm -rf</code>. Layers are append-only, so the bytes stay in earlier layers and the image barely shrinks.</p>`, code: { lang: 'text', check: false, code: `RUN mvn package\nRUN rm -rf /root/.m2 /build/src` } },
      mcq: { q: 'Which is the biggest single win?', options: ['Multi-stage: build with JDK/Maven, ship only a JRE + jar', 'Rename the image', 'Add more RUN rm lines'], answer: 0, explain: 'Build tools never need to exist in the runtime image. Multi-stage drops them completely.' },
      hints: [`<p>What does the running app need, compared with what only the build needs?</p>`, `<p>Use two <code>FROM</code> lines and then <code>COPY --from=builder</code> for the jar.</p>`, `<p>Then: JRE (not JDK) base, alpine or distroless, <code>.dockerignore</code>, layered jar. Verify with <code>docker images</code>, <code>docker history</code> and a Trivy/Grype scan.</p>`],
      solution: {
        approach: `<p>1) Split into builder and runtime stages and copy only the jar. 2) Use a JRE-only, pinned, small base (temurin JRE alpine or distroless). 3) Add <code>.dockerignore</code> so the context excludes <code>.git</code>, <code>target</code>, logs. 4) Optionally use Spring Boot layered jars or jlink for a custom runtime. 5) Verify: <code>docker history</code> to confirm no fat layers, <code>docker images</code> for the size, run the app and its smoke test, and re-scan for CVEs. Record before/after numbers in the PR so the saving is visible.</p>`,
        complexity: `<p>Expected: 1.0 GB → ~190 MB; pull time and CVE count drop proportionally.</p>`,
        followUps: ['When would alpine be a bad choice?', 'How does distroless change debugging in Kubernetes?']
      }
    }]
  });

  /* ================================================================
     TOPIC 3 — Kubernetes core: pods, deployments, services, ingress
     ================================================================ */
  topics.push({
    title: 'Kubernetes Core: Pods, Deployments, Services and Ingress',
    analogy: `<p>Kubernetes is a <b>shipping port manager</b>. Containers are the shipping boxes. A <b>pod</b> is a small crate holding one box (sometimes two that must travel together). A <b>node</b> is a truck. The <b>scheduler</b> decides which truck each crate goes on. A <b>Deployment</b> is the standing order: "always keep 3 crates of type shop-api on the road". If a truck breaks down, the manager notices and loads a replacement crate on another truck. A <b>Service</b> is the <b>reception desk with one phone number</b>: callers dial it, and the desk forwards the call to whichever crate is free. An <b>Ingress</b> is the main gate of the port that reads the address label (<code>/shop</code>, <code>/pay</code>) and sends visitors to the right desk.</p>`,
    explain: `<p>🟢 <b>Why Kubernetes?</b> Running one container is easy. Running 200 containers across 20 machines, restarting the dead ones, rolling out new versions with no downtime and scaling with traffic is hard. Kubernetes (K8s) does that for you. You write down the <b>desired state</b> in YAML ("3 copies of this image, reachable on port 80"), and K8s keeps working until reality matches it. This loop is called <b>reconciliation</b>.</p>
${H.table(['Object', 'What it is', 'Plain meaning'], [
  ['Pod', 'Smallest unit; 1+ containers sharing network + storage', 'One crate. Gets its own IP. Mortal - replaced, not repaired.'],
  ['ReplicaSet', 'Keeps N identical pods alive', 'The foreman counting crates. You rarely create it yourself.'],
  ['Deployment', 'Manages ReplicaSets; rolling updates and rollback', 'The standing order for a stateless app.'],
  ['Service', 'Stable IP + DNS name that load-balances to matching pods', 'Reception desk with one phone number.'],
  ['Ingress', 'HTTP(S) routing rules from outside to Services', 'Main gate that reads the URL.'],
  ['Node', 'A machine (VM) running pods', 'The truck.'],
  ['Namespace', 'A named folder to group and isolate objects', 'A department.']
])}
<p>🔵 <b>Pods are mortal, so Services exist.</b> Pod IPs change every time a pod is replaced. A Service gives clients one <b>stable</b> name (<code>shop-api.default.svc.cluster.local</code>) and finds its pods with a <b>label selector</b> (<code>app: shop-api</code>). Only pods that are <b>Ready</b> receive traffic.</p>
<p><b>Service types:</b> <code>ClusterIP</code> (default, inside the cluster only), <code>NodePort</code> (opens a port on every node), <code>LoadBalancer</code> (asks the cloud for a real load balancer). For HTTP, one <b>Ingress</b> + an ingress controller (Traefik, a cloud ALB, ...; the community ingress-nginx was retired in March 2026) shares one entry point across many Services, with host/path routing and TLS.</p>
<p><b>Scheduling.</b> Each pod declares <b>resource requests</b> ("I need 0.5 CPU and 512 MiB") and <b>limits</b> (ceiling). The scheduler only places a pod on a node with enough <i>unreserved</i> room for the requests. No room → the pod stays <code>Pending</code>. Requests drive scheduling and autoscaling math; limits drive throttling (CPU) and OOM-kill (memory).</p>`,
    clues: ['"keep N copies running / self-healing" → Deployment (ReplicaSet)', '"stable address for pods that keep changing IPs" → Service', '"route /api to one service and /web to another, with TLS" → Ingress', '"pod stuck in Pending" → not enough CPU/memory requests fit, or taints/affinity/PVC', '"expose to the internet" → LoadBalancer Service or Ingress', '"one pod per node (log shipper)" → DaemonSet; "stable identity + disk" → StatefulSet', '"batch / run once" → Job / CronJob'],
    code: [
      { lang: 'yaml', title: 'A single Pod (checked)', code: `apiVersion: v1
kind: Pod
metadata:
  name: hello
  labels:
    app: hello
spec:
  containers:
    - name: web
      image: nginx:1.27-alpine
      ports:
        - containerPort: 80
      resources:
        requests: { cpu: "100m", memory: "64Mi" }
        limits: { cpu: "250m", memory: "128Mi" }` },
      { lang: 'yaml', title: 'Deployment + Service + Ingress (three objects, one file)', check: false, code: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: shop-api
spec:
  replicas: 3
  selector:
    matchLabels: { app: shop-api }       # which pods this Deployment owns
  template:                              # the pod blueprint
    metadata:
      labels: { app: shop-api }
    spec:
      containers:
        - name: api
          image: registry.example.com/shop-api:1.4.2   # exact tag, never :latest
          ports: [{ containerPort: 8080 }]
          resources:
            requests: { cpu: "250m", memory: "384Mi" }
            limits:   { memory: "512Mi" }
---
apiVersion: v1
kind: Service
metadata:
  name: shop-api
spec:
  selector: { app: shop-api }            # sends traffic to READY pods with this label
  ports:
    - port: 80
      targetPort: 8080
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: shop
spec:
  ingressClassName: nginx
  tls:
    - hosts: [shop.example.com]
      secretName: shop-tls               # certificate lives in a Secret
  rules:
    - host: shop.example.com
      http:
        paths:
          - path: /api
            pathType: Prefix
            backend:
              service: { name: shop-api, port: { number: 80 } }` },
      { lang: 'bash', title: 'kubectl you will use daily', check: false, code: `kubectl apply -f shop.yaml                 # declare desired state
kubectl get pods -o wide                   # which node is each pod on?
kubectl describe pod shop-api-abc12        # events: scheduling, pulls, probe failures
kubectl logs shop-api-abc12 --previous     # logs of the crashed previous container
kubectl rollout status deploy/shop-api     # wait for a rollout
kubectl scale deploy/shop-api --replicas=5
kubectl get endpoints shop-api             # which pod IPs does the Service use?` }
    ],
    viz: [{
      title: 'The scheduler places pods on nodes (grid: 1 cell = 1 CPU request unit)',
      input: '2 1 1 3 2 1 2',
      inputLabel: 'CPU units each pod requests, in order (each node has 4 units, 3 nodes)',
      gen: function (input) {
        var req = ints(input, 10, 'Enter pod CPU requests (1-4) separated by spaces, e.g. 2 1 1 3 2');
        if (req.some(function (x) { return x < 1 || x > 4 || x % 1 !== 0; })) throw new Error('Each request must be a whole number from 1 to 4');
        var N = 3, CAP = 4;
        var rows = [], used = [];
        for (var n = 0; n < N; n++) { rows.push(['', '', '', '']); used.push(0); }
        var hl = {}, frames = [], pending = [];
        function snap(extra) {
          return [{ type: 'grid', label: 'Nodes (rows) x CPU slots (cols)', rowHead: ['node-1', 'node-2', 'node-3'], colHead: ['cpu1', 'cpu2', 'cpu3', 'cpu4'], rows: cp(rows), hl: cp(hl) },
            { type: 'vars', vals: { 'free node-1': CAP - used[0], 'free node-2': CAP - used[1], 'free node-3': CAP - used[2], 'Pending pods': pending.length } }].concat(extra || []);
        }
        frames.push({ narr: 'Three nodes, 4 CPU units each. The scheduler takes pods one by one: <b>filter</b> nodes that have enough free room, then <b>score</b> them (here: pick the one with the MOST free room, like the default spreading behaviour).', parts: snap() });
        req.forEach(function (r, p) {
          var best = -1;
          for (var n2 = 0; n2 < N; n2++) { if (CAP - used[n2] >= r && (best < 0 || CAP - used[n2] > CAP - used[best])) best = n2; }
          var name = 'P' + (p + 1);
          if (best < 0) {
            pending.push(name);
            frames.push({ narr: 'Pod <b>' + name + '</b> asks for ' + r + ' CPU. <span class="c-r">No node has ' + r + ' free units</span> - the pod stays <b>Pending</b>. (Real fix: add nodes, lower requests, or let the cluster autoscaler add a node.)', parts: snap([{ type: 'queue', label: 'Pending pods', items: pending.slice(), hl: { 0: 'bad' } }]) });
          } else {
            for (var k = 0; k < r; k++) { rows[best][used[best] + k] = name; hl[best + ',' + (used[best] + k)] = 'ok'; }
            used[best] += r;
            frames.push({ narr: 'Pod <b>' + name + '</b> asks for ' + r + ' CPU → fits on <b>node-' + (best + 1) + '</b> (it had the most free room). That room is now reserved, even if the pod is idle.', parts: snap() });
          }
        });
        frames.push({ narr: 'Result: ' + (pending.length ? '<span class="c-r">' + pending.length + ' pod(s) Pending</span> although total free CPU may exist - it is <b>fragmented</b> across nodes.' : '<span class="c-g">All pods scheduled.</span>') + ' Remember: scheduling uses <b>requests</b>, not real usage.', parts: snap() });
        return frames;
      }
    }, {
      title: 'Service -> pods: load balancing only to READY pods',
      input: '1 1 0',
      inputLabel: 'Pod readiness for pod-a pod-b pod-c (1 = ready, 0 = not ready)',
      gen: function (input) {
        var rd = ints(input, 3, 'Enter three 0/1 flags like: 1 1 0');
        if (rd.length !== 3 || rd.some(function (x) { return x !== 0 && x !== 1; })) throw new Error('Enter exactly three flags (0 or 1) like: 1 1 0');
        var names = ['pa', 'pb', 'pc'];
        var nodes = [bx('cl', 'Client', 8, 30, 14), bx('sv', 'Service shop-api', 36, 30, 26), bx('pa', 'pod-a', 82, 8, 20), bx('pb', 'pod-b', 82, 30, 20), bx('pc', 'pod-c', 82, 52, 20)];
        var edges = [['cl', 'sv'], ['sv', 'pa'], ['sv', 'pb'], ['sv', 'pc']];
        var tags = {}, hl = {};
        names.forEach(function (n, i) { tags[n] = rd[i] ? 'Ready' : 'NotReady'; if (!rd[i]) hl[n] = 'bad'; });
        function g(ehl, h2) { return { type: 'graph', label: 'Service load balancing', directed: true, height: 60, nodes: cp(nodes), edges: cp(edges), hl: cp(h2 || hl), ehl: ehl || {}, tags: cp(tags) }; }
        var ready = names.filter(function (n, i) { return rd[i]; });
        var frames = [{ narr: 'The Service watches pods matching its label. Only <b>Ready</b> pods are in its endpoint list; red = not ready, so it gets <b>no traffic</b>.', parts: [g()] }];
        if (!ready.length) { frames.push({ narr: '<span class="c-r">No ready pods</span> - the Service has zero endpoints and every request fails. This is why readiness matters.', parts: [g({ 'cl-sv': 'bad' })] }); frames.push({ narr: 'Fix the readiness problem (see probes) to bring traffic back.', parts: [g()] }); frames.push({ narr: 'End.', parts: [g()] }); return frames; }
        var counts = { pa: 0, pb: 0, pc: 0 };
        for (var r = 0; r < 6; r++) {
          var t = ready[r % ready.length];
          counts[t]++;
          var e = { 'cl-sv': 'cur' }; e['sv-' + t] = 'ok';
          var h = cp(hl); h.sv = 'cur'; h[t] = 'ok';
          frames.push({ narr: 'Request <b>' + (r + 1) + '</b> arrives at the Service and is forwarded to <b>' + t.replace('p', 'pod-') + '</b> (round-robin over ready pods).', parts: [g(e, h), { type: 'vars', vals: { 'pod-a': counts.pa, 'pod-b': counts.pb, 'pod-c': counts.pc } }] });
        }
        return frames;
      }
    }],
    examples: [
      { title: 'Write a Deployment + Service in 30 seconds', html: `<p>Checklist: (1) <code>replicas</code>, (2) <code>selector.matchLabels</code> equal to <code>template.metadata.labels</code> (the #1 typo), (3) exact image tag, (4) <code>containerPort</code>, (5) requests/limits, (6) a Service whose <code>selector</code> equals the pod labels and whose <code>targetPort</code> equals the container port. If <code>kubectl get endpoints shop-api</code> is empty, check labels first.</p>` },
      { title: 'Pod stuck in Pending: read the Events', html: `<p><code>kubectl describe pod</code> → Events at the bottom:</p><pre>0/3 nodes are available: 3 Insufficient cpu.</pre><p>Meaning: requests do not fit anywhere. Options: reduce <code>requests</code> if they are inflated (most services request far more than they use), add nodes, or enable the cluster autoscaler. Other common Pending messages: <i>node(s) had untolerated taint</i> (add toleration or use another node pool), <i>unbound PersistentVolumeClaim</i> (storage not provisioned).</p>` },
      { title: 'Sidecar: two containers in one pod', html: `<p>A pod can hold a main container plus a <b>sidecar</b> (log shipper, service-mesh proxy, TLS terminator). They share <code>localhost</code> and volumes and always start/stop together. Use this only for tightly coupled helpers - not to put a database next to the app (they scale differently).</p>` },
      { title: 'Why not just kubectl run pods?', html: `<p>A bare Pod is never rescheduled if its node dies. A Deployment is: the ReplicaSet notices the missing pod and creates a new one on a healthy node. Rule: <b>never run bare pods in production</b>; use Deployment (stateless), StatefulSet (stable identity + disks), DaemonSet (one per node), Job/CronJob (batch).</p>` }
    ],
    deepDive: `<p>🟣 <b>Control plane.</b> The <b>API server</b> is the only front door and stores everything in <b>etcd</b> (a consistent key-value store). <b>Controllers</b> (inside controller-manager) are loops: "observe actual state, compare to desired, act". The <b>scheduler</b> watches for pods with no node, filters and scores nodes, and writes the choice back. On each node, the <b>kubelet</b> asks the container runtime (containerd) to start the containers and reports status; <b>kube-proxy</b> (or eBPF, e.g. Cilium) programs rules so Service IPs reach pods.</p>
<p><b>Services are virtual.</b> A ClusterIP is not an interface on any machine; it is a rule that rewrites packets to one of the endpoint pod IPs. Load balancing is per <i>connection</i>, so long-lived HTTP/2 or gRPC connections stick to one pod - use a headless Service plus client-side balancing, or a mesh/L7 proxy for gRPC.</p>
<p><b>Requests vs limits and QoS.</b> Pods with requests = limits are <code>Guaranteed</code>; requests &lt; limits are <code>Burstable</code>; none are <code>BestEffort</code> (first to be evicted under node pressure). Exceeding the CPU limit makes the process <b>throttled</b> (slow, not killed); exceeding the memory limit makes it <b>OOMKilled</b>. Many teams set memory request = limit and leave CPU limit unset to avoid throttling latency spikes.</p>
<p><b>Placement controls.</b> <code>nodeSelector</code>/affinity (pods want certain nodes), anti-affinity and <code>topologySpreadConstraints</code> (spread replicas across zones so one zone outage does not kill all copies), taints/tolerations (reserve nodes, e.g. GPU), and <code>PodDisruptionBudget</code> (never drain below N ready pods during node upgrades). Namespaces + <code>ResourceQuota</code> + <code>NetworkPolicy</code> give multi-team isolation; RBAC controls who can do what.</p>
<p><b>Ingress vs Gateway API.</b> Ingress is HTTP-only and annotation-heavy; the newer <b>Gateway API</b> (GatewayClass, Gateway, HTTPRoute) is the role-oriented successor with richer routing, traffic splitting (handy for canaries) and TCP/gRPC support. Managed clusters (EKS/GKE/AKS) hide the control plane; you still own your pods, requests and upgrades.</p>`,
    aiEra: `<p>🤖 <b>What AI changes.</b> Assistants draft manifests, translate a docker-compose file into Deployments and Services, and explain <code>kubectl describe</code> output. Cluster-aware tools (K8sGPT-style analysers, built-in cloud assistants) read events and suggest "your selector matches no pods".</p>
<p><b>Use AI as a partner:</b> <code>Here is kubectl describe pod output (secrets removed). What is the most likely reason for Pending, and which command proves it?</code> Always ask for the <i>verifying</i> command, not just the answer.</p>
<p><b>Where AI goes wrong:</b> uses deprecated API versions (<code>extensions/v1beta1</code>), mismatched labels and selectors, no resource requests (so the scheduler and HPA cannot work), <code>:latest</code> images, <code>LoadBalancer</code> for every service (a cost bomb), and pastes real credentials into a <code>Secret</code> manifest that then lands in git.</p>
<p><b>What you must still own:</b> capacity and request sizing, failure-domain spreading, who can access what (RBAC), and never letting an AI agent run <code>kubectl delete</code> or <code>apply</code> against production without a human review. Treat cluster credentials for AI agents as least-privilege, read-only by default.</p>`,
    problems: [{
      title: 'Write a Deployment and Service for shop-api',
      level: 'Medium', tags: ['kubernetes', 'deployment', 'service'], companies: ['Google', 'Stripe'],
      statement: `<p>Write the Kubernetes objects to run <code>registry.example.com/shop-api:1.4.2</code> (listens on 8080) with 3 replicas, resource requests of 250m CPU / 384Mi memory and a memory limit of 512Mi, reachable inside the cluster as <code>shop-api</code> on port 80.</p>`,
      constraints: `Labels must tie Deployment, pods and Service together; no :latest tag.`,
      example: `<p>Result: <code>kubectl get pods -l app=shop-api</code> shows ${H.c('g', '3/3 Running')} and <code>kubectl get endpoints shop-api</code> lists 3 pod IPs on 8080.</p>`,
      brute: { why: `<p>Start three bare pods with <code>kubectl run</code> and give clients the pod IPs. If a pod dies nothing replaces it, and its IP changes, so clients break.</p>`, code: { lang: 'bash', check: false, code: `kubectl run api1 --image=registry.example.com/shop-api:1.4.2\nkubectl run api2 --image=registry.example.com/shop-api:1.4.2\nkubectl run api3 --image=registry.example.com/shop-api:1.4.2` } },
      mcq: { q: 'Service endpoints are empty. Most likely cause?', options: ['Service selector does not match pod labels (or pods not Ready)', 'The Deployment has too many replicas', 'The image is too small'], answer: 0, explain: 'A Service builds its endpoints from Ready pods whose labels match its selector.' },
      hints: [`<p>Deployment owns pods through <code>selector.matchLabels</code>; the Service finds the same pods through its <code>selector</code>.</p>`, `<p>Pod template labels must match both. <code>port</code> (80) is the Service port; <code>targetPort</code> (8080) is the container port.</p>`, `<p>Write Deployment (replicas 3, resources), then Service (ClusterIP default). Verify with <code>kubectl get endpoints</code>.</p>`],
      solution: {
        approach: `<p>Create a Deployment whose pod template has label <code>app: shop-api</code> and selector <code>matchLabels: app: shop-api</code>. Add the container with port 8080 and the requests and limit. Create a ClusterIP Service whose selector is <code>app: shop-api</code>, <code>port: 80</code> and <code>targetPort: 8080</code>. Self-healing comes from the Deployment (it recreates dead pods) and stable addressing from the Service. Verify with <code>kubectl rollout status</code>, <code>kubectl get endpoints shop-api</code> and a curl from a debug pod to <code>http://shop-api</code>.</p>`,
        code: { lang: 'yaml', check: false, code: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: shop-api
spec:
  replicas: 3
  selector:
    matchLabels: { app: shop-api }
  template:
    metadata:
      labels: { app: shop-api }
    spec:
      containers:
        - name: api
          image: registry.example.com/shop-api:1.4.2
          ports: [{ containerPort: 8080 }]
          resources:
            requests: { cpu: "250m", memory: "384Mi" }
            limits: { memory: "512Mi" }
---
apiVersion: v1
kind: Service
metadata:
  name: shop-api
spec:
  selector: { app: shop-api }
  ports:
    - port: 80
      targetPort: 8080` },
        complexity: `<p>Not algorithmic. Capacity check: 3 pods x 250m = 750m CPU and 3 x 384Mi = 1.1 GiB must fit on your nodes.</p>`,
        followUps: ['Add an Ingress with TLS for shop.example.com.', 'How do you spread the three replicas across zones?']
      }
    }, {
      title: 'Why Is My Pod Pending?',
      level: 'Easy', tags: ['kubernetes', 'scheduling', 'debugging'], companies: ['Amazon'],
      statement: `<p><code>kubectl get pods</code> shows <code>report-job-7d9 0/1 Pending</code> for 20 minutes. <code>describe</code> says <i>0/3 nodes are available: 3 Insufficient memory</i>. The nodes have 16 GiB each and are mostly idle. What happened and what do you do?</p>`,
      constraints: `Do not just add nodes before checking the request.`,
      example: `<p>Pod requests ${H.c('r', '24Gi')} memory → no node can ever fit it, even idle ones.</p>`,
      brute: { why: `<p>Keep deleting and recreating the pod hoping it lands somewhere. The scheduler decides on requests; the same pod will be Pending again.</p>`, code: { lang: 'bash', check: false, code: `kubectl delete pod report-job-7d9` } },
      mcq: { q: 'Idle nodes, pod Pending with "Insufficient memory". Why?', options: ['Scheduling uses requested memory, not actual usage', 'Idle nodes refuse new pods', 'Pods may only run on node-1'], answer: 0, explain: 'The scheduler reserves by requests; a request larger than any node can offer never fits.' },
      hints: [`<p>Look at the pod spec's <code>resources.requests</code>, not at node usage.</p>`, `<p>Compare the request with node <i>allocatable</i> (<code>kubectl describe node</code>).</p>`, `<p>Lower the request to realistic usage (measure it), or use a larger node pool with a nodeSelector/toleration.</p>`],
      solution: {
        approach: `<p>The pod requests more memory than any node can allocate (24 GiB vs 16 GiB nodes, less system reserved). Scheduling is based on <b>requests</b>, not current usage, so idle nodes do not help. Steps: read <code>kubectl describe pod</code> events, check the request in the spec, compare to <code>kubectl describe node</code> allocatable. Fix by right-sizing the request from real metrics (a Java report job rarely needs its heap plus 8 GiB headroom), or by creating a high-memory node pool and targeting it with a nodeSelector and toleration. Adding identical nodes would not fix it.</p>`,
        complexity: `<p>Diagnosis is O(1): one describe command.</p>`,
        followUps: ['What is the difference between capacity and allocatable?', 'How would the cluster autoscaler react to this pod?']
      }
    }]
  });

  /* ================================================================
     TOPIC 4 — Config, Secrets, probes, rolling updates
     ================================================================ */
  topics.push({
    title: 'ConfigMaps, Secrets, Probes and Rolling Updates',
    analogy: `<p>A new chef (your pod) arrives at the restaurant. The <b>recipe</b> is the image: it never changes between kitchens. The <b>settings on the wall</b> ("oven 200C, today's special: soup") are the <b>ConfigMap</b>. The <b>safe key</b> to the cash drawer is a <b>Secret</b> - handed over at the door, never written into the recipe.</p>
<p>The manager has two checks. <b>Readiness</b>: "Are you dressed and ready to take orders?" - until yes, no customers are sent to you. <b>Liveness</b>: "Are you still conscious?" - if not, you are replaced. A <b>rolling update</b> is replacing the chefs one at a time during a busy night, so the kitchen never goes empty.</p>`,
    explain: `<p>🟢 <b>Config outside the image.</b> One image runs in dev, staging and prod; only the settings differ. K8s gives two objects:</p>
<ul><li><b>ConfigMap</b> - non-secret settings (log level, feature flags, URLs). Injected as environment variables or mounted files.</li>
<li><b>Secret</b> - sensitive values (DB password, API key). Same injection ways, but access can be restricted with RBAC. <span class="c-y">Warning:</span> a Secret is only <b>base64-encoded</b> by default, not encrypted - enable encryption at rest and prefer an external secret store.</li></ul>
<p>🔵 <b>Three probes</b> (checks run by the kubelet):</p>
${H.table(['Probe', 'Question', 'If it fails'], [
  ['<b>startup</b>', 'Has the slow app finished booting?', 'Keeps waiting; after the limit, restarts the container. Other probes are paused meanwhile.'],
  ['<b>readiness</b>', 'Can you take traffic NOW?', '<span class="c-y">Removed from Service endpoints</span> (no restart). Comes back when it passes.'],
  ['<b>liveness</b>', 'Are you stuck for good (deadlock)?', '<span class="c-r">Container is restarted</span>.']
])}
<p><b>Golden rule:</b> readiness may check dependencies lightly (am I warmed up? can I reach my DB?), but <b>liveness must be cheap and only about this process</b>. If liveness also checks the database, a DB outage makes K8s restart every pod - turning a small problem into a total outage.</p>
<p>🔵 <b>Rolling update</b> (the Deployment default). When you change the image, the Deployment makes a <b>new ReplicaSet</b> and moves pods over gradually, controlled by two numbers: <code>maxSurge</code> (how many extra pods may exist) and <code>maxUnavailable</code> (how many may be missing). A new pod counts only once it is <b>Ready</b>, so a bad version stalls the rollout while old pods keep serving. <code>kubectl rollout undo</code> goes back.</p>`,
    clues: ['"zero-downtime deploy" → rolling update + readiness probe + graceful shutdown', '"traffic hits a pod that is still starting" → missing/weak readiness probe', '"pod restarts again and again" → CrashLoopBackOff: check logs --previous, exit code, liveness too aggressive', '"slow-starting Java app gets killed at boot" → startupProbe / bigger initialDelay', '"change config without rebuilding the image" → ConfigMap / Secret', '"never commit passwords" → Secret + external secret manager / sealed secrets', '"rollout stuck at 2 of 4" → new pods never Ready, rollback'],
    code: [
      { lang: 'yaml', title: 'ConfigMap (checked) - plain settings only', code: `apiVersion: v1
kind: ConfigMap
metadata:
  name: shop-api-config
data:
  LOG_LEVEL: "info"
  PAYMENTS_URL: "http://payments.default.svc.cluster.local:8080"
  application.properties: |
    server.shutdown=graceful
    spring.lifecycle.timeout-per-shutdown-phase=20s` },
      { lang: 'yaml', title: 'Deployment with env from ConfigMap/Secret, probes and rolling strategy', check: false, code: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: shop-api
spec:
  replicas: 4
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1            # at most 5 pods during the update
      maxUnavailable: 0      # never drop below 4 ready pods
  selector:
    matchLabels: { app: shop-api }
  template:
    metadata:
      labels: { app: shop-api }
    spec:
      terminationGracePeriodSeconds: 30
      containers:
        - name: api
          image: registry.example.com/shop-api:1.5.0
          ports: [{ containerPort: 8080 }]
          envFrom:
            - configMapRef: { name: shop-api-config }
          env:
            - name: DB_PASSWORD              # value comes from a Secret, never from this file
              valueFrom:
                secretKeyRef: { name: shop-db, key: password }
          startupProbe:                      # give a slow JVM up to 30 x 5 = 150 s to boot
            httpGet: { path: /livez, port: 8080 }
            periodSeconds: 5
            failureThreshold: 30
          readinessProbe:                    # take traffic only when really ready
            httpGet: { path: /readyz, port: 8080 }
            periodSeconds: 5
            failureThreshold: 2
          livenessProbe:                     # cheap: is THIS process alive?
            httpGet: { path: /livez, port: 8080 }
            periodSeconds: 10
            failureThreshold: 3
          lifecycle:
            preStop:                         # let the load balancer stop sending traffic first
              exec: { command: ["sleep", "5"] }` },
      { lang: 'bash', title: 'Create the Secret from outside git (placeholders only)', check: false, code: `# Value is read from a prompt/CI secret store, NOT typed into a file you commit
kubectl create secret generic shop-db \\
  --from-literal=password="$DB_PASSWORD_FROM_VAULT"

# Roll out, watch, and roll back if needed
kubectl set image deploy/shop-api api=registry.example.com/shop-api:1.5.0
kubectl rollout status deploy/shop-api --timeout=120s || kubectl rollout undo deploy/shop-api
kubectl rollout history deploy/shop-api` },
      { lang: 'java', title: 'Liveness vs readiness endpoints in plain Java (compiles with the JDK)', code: `import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.util.concurrent.atomic.AtomicBoolean;

public class HealthServer {
    // flips to true once caches are warm and the DB pool is open
    static final AtomicBoolean ready = new AtomicBoolean(false);

    static void reply(com.sun.net.httpserver.HttpExchange ex, int code, String body) throws java.io.IOException {
        byte[] b = body.getBytes();
        ex.sendResponseHeaders(code, b.length);
        try (var os = ex.getResponseBody()) { os.write(b); }
    }

    public static void main(String[] args) throws Exception {
        HttpServer server = HttpServer.create(new InetSocketAddress(8080), 0);
        // LIVENESS: cheap, only proves the process can answer. Never call the database here.
        server.createContext("/livez", ex -> reply(ex, 200, "alive"));
        // READINESS: 200 only when we can really serve; 503 pulls us out of the Service.
        server.createContext("/readyz", ex -> {
            if (ready.get()) reply(ex, 200, "ready"); else reply(ex, 503, "warming up");
        });
        server.start();
        Thread.sleep(2000);          // pretend to warm up caches / open pools
        ready.set(true);
        System.out.println("started, ready=" + ready.get());
        server.stop(0);              // demo only: exit instead of serving forever
    }
}` }
    ],
    viz: {
      title: 'Rolling update replaces pods v1 → v2 without dropping capacity',
      input: '4 1 0',
      inputLabel: 'replicas maxSurge maxUnavailable [bad]  (add "bad" so new pods never become Ready)',
      gen: function (input) {
        var t = String(input || '').trim().toLowerCase().split(/\s+/);
        var bad = t.length > 3 && t[3] === 'bad';
        var n = t.slice(0, 3).map(Number);
        if (n.length < 3 || n.some(function (x) { return isNaN(x) || x < 0 || x % 1 !== 0; })) throw new Error('Type: replicas maxSurge maxUnavailable, e.g. "4 1 0" (optionally add "bad")');
        var R = n[0], S = n[1], U = n[2];
        if (R < 1 || R > 8) throw new Error('replicas must be 1 to 8');
        if (S === 0 && U === 0) throw new Error('maxSurge and maxUnavailable cannot both be 0');
        var pods = [];
        for (var i = 0; i < R; i++) pods.push({ v: 1, ready: true });
        var frames = [];
        function view(label) {
          var vals = pods.map(function (p) { return p.v === 1 ? 'v1' : (p.ready ? 'v2' : 'v2..'); });
          var hl = {};
          pods.forEach(function (p, ix) { hl[ix] = p.v === 1 ? 'done' : (p.ready ? 'ok' : (bad ? 'bad' : 'cur')); });
          var readyN = pods.filter(function (p) { return p.ready; }).length;
          return [{ type: 'array', label: label || 'Pods (v1 = old, v2.. = starting, v2 = ready)', values: vals, hl: hl },
            { type: 'vars', vals: { 'ready pods': readyN, 'total pods': pods.length, 'min allowed ready': R - U, 'max allowed total': R + S }, hl: { 'ready pods': readyN < R - U ? 'bad' : 'ok' } }];
        }
        frames.push({ narr: 'Deployment has <b>' + R + '</b> pods running v1. You change the image to v2. Rules: ready pods must stay at least <b>' + (R - U) + '</b>, total pods at most <b>' + (R + S) + '</b>.', parts: view() });
        for (var guard = 0; guard < 40; guard++) {
          var newCount = pods.filter(function (p) { return p.v === 2; }).length;
          var oldCount = pods.length - newCount;
          if (oldCount === 0 && pods.every(function (p) { return p.ready; })) break;
          var added = 0;
          while (pods.length < R + S && newCount + added < R) { pods.push({ v: 2, ready: false }); added++; }
          if (added) frames.push({ narr: '<b>Surge:</b> start ' + added + ' new v2 pod(s). They are NOT ready yet, so they receive no traffic and do not count as capacity.', parts: view() });
          var starting = pods.filter(function (p) { return p.v === 2 && !p.ready; });
          if (starting.length && !bad) {
            starting.forEach(function (p) { p.ready = true; });
            frames.push({ narr: 'The <b>readiness probe passes</b> - the new pods are Ready and join the Service.', parts: view() });
          } else if (starting.length && bad) {
            frames.push({ narr: '<span class="c-r">Readiness keeps failing</span> (bug in v2). The new pods never become Ready, so the Deployment <b>stops</b>. The old v1 pods keep serving users - this is the safety net. Time to <code>kubectl rollout undo</code>.', parts: view() });
            frames.push({ narr: 'Result: rollout stalled, users unaffected. A readiness probe turned a bad release into a non-event.', parts: view() });
            return frames;
          }
          var removed = 0;
          for (var k = pods.length - 1; k >= 0; k--) {
            var readyN2 = pods.filter(function (p) { return p.ready; }).length;
            if (pods[k].v === 1 && readyN2 - 1 >= R - U) { pods.splice(k, 1); removed++; }
          }
          if (removed) frames.push({ narr: '<b>Retire:</b> remove ' + removed + ' old v1 pod(s) while keeping ready pods ≥ ' + (R - U) + '.', parts: view() });
          else if (!added && !starting.length) break;
        }
        frames.push({ narr: '<span class="c-g">Rollout complete:</span> all ' + R + ' pods run v2 and are Ready, and capacity never fell below the minimum.', parts: view() });
        if (frames.length < 4) frames.push({ narr: 'Done.', parts: view() });
        return frames;
      }
    },
    examples: [
      { title: 'Debug CrashLoopBackOff step by step', html: `<p><code>CrashLoopBackOff</code> means: "the container starts, exits, and K8s keeps restarting it with growing delays (10 s, 20 s ... up to 5 min)". It is a symptom, not a cause. Work down this list:</p>${H.table(['Step', 'Command', 'What to look for'], [['1', '<code>kubectl describe pod X</code>', 'Last State: Terminated, <b>Reason</b> and <b>Exit Code</b>. Events: probe failures'], ['2', '<code>kubectl logs X --previous</code>', 'The stack trace from the crashed run (current logs are empty after restart)'], ['3', 'Exit code 1', 'App error: bad config, cannot connect to DB, missing env var'], ['4', 'Exit code 137 / OOMKilled', 'Memory limit too low or a leak - raise memory or fix heap (MaxRAMPercentage)'], ['5', 'Exit code 143 or liveness events', 'Liveness probe killing a slow start - add startupProbe'], ['6', 'Exit code 126/127', 'Wrong ENTRYPOINT or missing binary/permissions in the image'], ['7', '<code>kubectl get events --sort-by=.lastTimestamp</code>', 'ImagePullBackOff, volume mount errors, missing Secret']])}` },
      { title: 'Zero-downtime checklist', html: `<p>Rolling update alone is not enough. For truly no dropped requests: (1) <b>readiness probe</b> that only passes when warmed up; (2) <code>maxUnavailable: 0</code>; (3) <b>graceful shutdown</b>: on SIGTERM stop accepting new requests, finish in-flight ones (Spring: <code>server.shutdown=graceful</code>); (4) a short <code>preStop sleep</code> because endpoint removal and SIGTERM race; (5) <code>terminationGracePeriodSeconds</code> longer than your slowest request; (6) a <b>PodDisruptionBudget</b> for node drains; (7) backward-compatible database changes (old and new versions run side by side during the roll).</p>` },
      { title: 'Config change without rebuilding', html: `<p>Changing a ConfigMap does <b>not</b> restart pods that read it as env vars - they only see new values on restart. Mounted files update in place after about a minute, but most apps read config once at startup. Common patterns: add a hash of the config in a pod-template annotation (Helm does this) so any change triggers a rollout, or run <code>kubectl rollout restart deploy/shop-api</code>.</p>` },
      { title: 'Liveness probe that causes an outage', html: `<p>A team's liveness probe called <code>/health</code>, which checked the database. The database was slow for 2 minutes; every pod failed liveness and was restarted at the same time; with cold caches they could not pass readiness, so the whole service was down for 15 more minutes. Lesson: <b>liveness = "is my process wedged?" only</b>. Dependency checks belong (lightly) in readiness, and many teams leave dependencies out even there to avoid mass unreadiness.</p>` }
    ],
    deepDive: `<p>🟣 <b>Probe mechanics.</b> Each probe has <code>initialDelaySeconds, periodSeconds, timeoutSeconds, successThreshold, failureThreshold</code>. Time-to-detect = <code>period x failureThreshold</code>. Types: HTTP GET, TCP socket, exec command, and gRPC. A startupProbe replaces large <code>initialDelay</code> guesses: liveness and readiness are disabled until it succeeds once. Timeouts that are too tight plus a GC pause or CPU throttling yields flapping pods - tune against p99 latency, not the average.</p>
<p><b>Secrets properly.</b> Kubernetes Secrets are base64, stored in etcd; turn on <b>encryption at rest</b> (KMS provider), restrict <code>get/list secrets</code> in RBAC, and avoid env vars when you can (they leak into crash dumps and <code>/proc</code>; mounted files are a bit safer and can be rotated). Better: an <b>external secrets manager</b> (cloud secret stores, Vault) synced by the External Secrets Operator or the CSI driver; GitOps users encrypt with <b>Sealed Secrets</b> or SOPS so only ciphertext is in git. Rotate credentials and make apps re-read them without a restart if possible. Never print secrets in logs and never bake them into images.</p>
<p><b>Rollout internals.</b> The Deployment controller scales the new ReplicaSet up and the old one down within surge/unavailable limits. <code>minReadySeconds</code> requires a pod to stay Ready for N seconds before it counts. <code>progressDeadlineSeconds</code> (default 600) marks a stuck rollout as failed - but it does <b>not</b> roll back automatically; your pipeline must (<code>rollout status</code> exit code, or progressive-delivery tools like Argo Rollouts/Flagger that auto-abort). <code>revisionHistoryLimit</code> controls how many old ReplicaSets remain for undo. Percentages are allowed: default is 25% surge and 25% unavailable, rounded up for surge and down for unavailable.</p>
<p><b>Backward compatibility is the real problem.</b> During a roll, v1 and v2 serve traffic together and share the database. Use the <b>expand/contract</b> migration pattern: first deploy a schema that both versions understand (add nullable column), then the new code, then later remove the old column. Otherwise "zero-downtime deploy" still breaks users.</p>`,
    aiEra: `<p>🤖 <b>What AI changes.</b> Paste a crash log and an assistant will usually name the cause (missing env var, OOM, wrong port) in seconds, and can draft probes and PodDisruptionBudgets. AIOps tools correlate a bad rollout with the error-rate jump and can propose a rollback.</p>
<p><b>Use AI as a partner:</b> <code>Pod is CrashLoopBackOff, exit code 137, memory limit 512Mi, JVM with default flags. Give me a ranked list of causes and the kubectl command that confirms each.</code></p>
<p><b>Where AI goes wrong:</b> proposes a liveness probe that hits the database, sets <code>initialDelaySeconds: 5</code> for a 90-second JVM boot, "fixes" a crash by removing the probe, writes Secrets with literal sample passwords that people then keep, or suggests <code>kubectl delete pod</code> as a cure when the cause is a bad config.</p>
<p><b>What you must still own:</b> deciding what readiness means for <i>your</i> service, protecting secrets (AI prompts and logs are leak paths - never paste real tokens, redact first), and the rollback decision. If an AI agent can run <code>rollout undo</code> for you, give it that single permission, not cluster-admin.</p>`,
    problems: [{
      title: 'Debug a CrashLoopBackOff',
      level: 'Medium', tags: ['kubernetes', 'debugging', 'probes'], companies: ['Datadog', 'Airbnb'],
      statement: `<p>After deploying v1.5.0, pods show <code>CrashLoopBackOff</code>. <code>describe</code> reports: <i>Last State: Terminated, Reason: Error, Exit Code: 143</i>; Events: <i>Liveness probe failed: Get "http://10.1.2.3:8080/livez": dial tcp ... connection refused</i>. The Spring app needs about 70 seconds to start. The liveness probe has <code>initialDelaySeconds: 10, periodSeconds: 5, failureThreshold: 3</code>. Find the cause and fix it.</p>`,
      constraints: `Do not remove liveness; the fix must also keep detecting a truly frozen app.`,
      example: `<p>Timeline: t=0 start · t=20 s ${H.c('r', '3rd liveness failure → SIGTERM (143)')} · t=70 s app would have been ready (too late).</p>`,
      brute: { why: `<p>Delete the liveness probe or set a huge <code>failureThreshold</code> for everything. The pod stops crashing, but a real deadlock will never be detected and detection of other failures is delayed.</p>`, code: { lang: 'yaml', check: false, code: `# remove livenessProbe entirely` } },
      mcq: { q: 'What is the best fix here?', options: ['Add a startupProbe (e.g. 5 s x 30) so liveness only begins after boot', 'Delete liveness', 'Increase replicas'], answer: 0, explain: 'The startup probe tolerates a slow boot once; afterwards liveness stays tight to catch real hangs.' },
      hints: [`<p>Exit code 143 = 128 + 15, SIGTERM: the kubelet killed it. Who sends that? The probe.</p>`, `<p>Liveness started after 10 s and gave up at the 3rd failed check (10, 15 and 20 s) - long before the app listens.</p>`, `<p>Use <code>startupProbe</code> with enough budget (150 s), keep liveness cheap and tight, and verify with <code>kubectl logs --previous</code>.</p>`],
      solution: {
        approach: `<p>The pod is not crashing by itself: the kubelet kills it. Liveness begins after 10 s and tolerates 3 failures at 5 s intervals, so the third failed check comes at about 20 s and the container receives SIGTERM (exit 143) - 50 seconds before the app finishes starting. Fix: add a <code>startupProbe</code> on the same endpoint with <code>periodSeconds: 5, failureThreshold: 30</code> (up to 150 s to boot). Liveness and readiness are held back until it succeeds, after which liveness can stay strict (period 10, threshold 3). Also confirm <code>/livez</code> is cheap (no DB call), set <code>server.shutdown=graceful</code>, and verify with <code>kubectl describe</code> that restarts stop. Long term, speed up startup (lazy init, CDS/AppCDS, native image).</p>`,
        code: { lang: 'yaml', check: false, code: `startupProbe:
  httpGet: { path: /livez, port: 8080 }
  periodSeconds: 5
  failureThreshold: 30     # up to 150 s to start
livenessProbe:
  httpGet: { path: /livez, port: 8080 }
  periodSeconds: 10
  failureThreshold: 3` },
        complexity: `<p>Detection time after boot: period x threshold = 30 s for a frozen app.</p>`,
        followUps: ['What if exit code were 137 with OOMKilled?', 'Why is liveness hitting the database dangerous?']
      }
    }, {
      title: 'Roll Out v2 With Zero Downtime',
      level: 'Medium', tags: ['kubernetes', 'rolling-update'], companies: ['Shopify', 'Lyft'],
      statement: `<p>You run 6 replicas and must ship v2 with no capacity loss, using at most 2 extra pods. Choose <code>maxSurge</code> and <code>maxUnavailable</code>, and say what else is required for no dropped requests.</p>`,
      constraints: `Capacity of 6 ready pods must hold throughout; cluster has room for 8 pods.`,
      example: `<p>maxSurge 2, maxUnavailable 0: 6 ready → 8 total (2 new starting) → new ready → retire 2 old → repeat. Ready pods never drop below ${H.c('g', '6')}.</p>`,
      brute: { why: `<p>Use <code>Recreate</code> strategy: kill all v1 pods, then start v2. Simple, but the app is fully down for the whole startup time.</p>`, code: { lang: 'yaml', check: false, code: `strategy:\n  type: Recreate` } },
      mcq: { q: 'Which settings guarantee no loss of ready capacity?', options: ['maxUnavailable: 0 with maxSurge >= 1', 'maxSurge: 0 with maxUnavailable: 3', 'Recreate'], answer: 0, explain: 'With zero unavailable, old pods are removed only after new ones are Ready.' },
      hints: [`<p>Capacity can only stay at 6 if old pods leave <i>after</i> new ones are ready.</p>`, `<p>That needs extra room (surge) and <code>maxUnavailable: 0</code>.</p>`, `<p>Also: readiness probe, graceful shutdown, preStop sleep, PDB, backward-compatible DB changes.</p>`],
      solution: {
        approach: `<p>Set <code>maxSurge: 2</code> and <code>maxUnavailable: 0</code>. The controller starts two v2 pods (8 total, the cluster limit), waits for them to be Ready, then removes two v1 pods, and repeats until 6 v2 pods remain. A correct readiness probe is essential, because Ready is what the controller trusts. Add graceful shutdown with a preStop delay so in-flight requests finish, a PodDisruptionBudget for node upgrades, and expand/contract database migrations so v1 and v2 can run side by side. If the rollout stalls, <code>rollout status</code> fails and the pipeline runs <code>rollout undo</code>.</p>`,
        code: { lang: 'yaml', check: false, code: `strategy:
  type: RollingUpdate
  rollingUpdate:
    maxSurge: 2
    maxUnavailable: 0` },
        complexity: `<p>Rollout takes about (replicas / maxSurge) x readiness time = 3 x 40 s = 2 min.</p>`,
        followUps: ['What changes if the cluster only has room for 6 pods?', 'How do you auto-rollback?']
      }
    }]
  });

  /* ================================================================
     TOPIC 5 — Autoscaling with HPA
     ================================================================ */
  topics.push({
    title: 'Autoscaling: HPA, the Replica Formula and Friends',
    analogy: `<p>A supermarket has checkout lanes. When the average queue per open lane grows past 5 people, the manager opens more lanes; when queues are tiny for a while, lanes close. The manager does not react to every single customer (that would be chaotic), and there is always a minimum of 2 lanes open and a maximum of 10 (the number of tills). The <b>Horizontal Pod Autoscaler (HPA)</b> is that manager: it watches a metric (usually CPU) and changes the number of pod replicas.</p>`,
    explain: `<p>🟢 <b>The one formula you must know:</b></p>
<p style="text-align:center"><b>desired replicas = ceil( current replicas x current metric / target metric )</b></p>
<p>Worked example: 4 pods, average CPU is 90% of their <i>request</i>, target is 60%. desired = ceil(4 x 90 / 60) = ceil(6.0) = <b>6</b>. Load fell to 20%? ceil(6 x 20 / 60) = ceil(2) = <b>2</b>, but never below <code>minReplicas</code>.</p>
${H.table(['Current pods', 'Avg CPU', 'Target', 'Calculation', 'Desired'], [
  ['2', '100%', '50%', 'ceil(2 x 100/50)', '<b>4</b>'],
  ['4', '75%', '50%', 'ceil(4 x 1.5)', '<b>6</b>'],
  ['6', '25%', '50%', 'ceil(6 x 0.5)', '<b>3</b>'],
  ['3', '52%', '50%', 'ratio 1.04 is within 10% tolerance', '<span class="c-m">no change (3)</span>']
])}
<p>🔵 <b>How it runs.</b> Every ~15 s the HPA controller reads metrics (from metrics-server for CPU/memory, or custom metrics such as requests per second via an adapter), computes the formula, clamps to <code>[minReplicas, maxReplicas]</code>, and updates the Deployment's <code>replicas</code>. A <b>10% tolerance</b> avoids flapping on tiny differences.</p>
<p><b>Requirements:</b> pods must declare <b>CPU requests</b> - utilisation is measured as <i>usage / request</i>. No request, no percentage, no scaling. The app must be <b>stateless</b> and <b>start fast</b>; and the nodes must have room (or a cluster autoscaler adds nodes).</p>
<p><b>Scale-up is quick, scale-down is patient.</b> By default the HPA scales up immediately but waits a 5-minute <i>stabilization window</i> before scaling down, using the highest recommendation of that window - so a short dip does not remove pods you will need again in a minute.</p>
${H.table(['Autoscaler', 'Changes', 'Good for'], [['HPA', 'Number of pods', 'Stateless web/API traffic'], ['VPA', 'CPU/memory requests of pods', 'Right-sizing; batch; things that cannot scale out'], ['Cluster Autoscaler / Karpenter', 'Number of nodes', 'Give Pending pods somewhere to run'], ['KEDA', 'Pods based on events (queue length, Kafka lag), can scale to zero', 'Workers, consumers']])}`,
    clues: ['"traffic spikes during sales / daily peak" → HPA (+ cluster autoscaler)', '"scale on queue length / Kafka lag" → KEDA or HPA with external metric', '"pods flap up and down" → stabilization window, tolerance, better metric', '"HPA shows &lt;unknown&gt; for CPU" → missing metrics-server or missing CPU requests', '"pods scale but stay Pending" → node capacity, cluster autoscaler', '"every replica opens 20 DB connections" → scaling out hits DB connection limit', '"latency rises before CPU does" → scale on RPS/latency, not CPU'],
    code: [
      { lang: 'yaml', title: 'HorizontalPodAutoscaler (autoscaling/v2, checked)', code: `apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: shop-api
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: shop-api
  minReplicas: 3            # never fewer: survives one pod/zone loss
  maxReplicas: 12           # cost + DB-connection ceiling
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 60     # target = 60% of the CPU REQUEST
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
        - type: Percent
          value: 100                 # may double every 60 s
          periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300   # wait 5 min of low load before shrinking
      policies:
        - type: Pods
          value: 1                   # remove at most 1 pod per minute
          periodSeconds: 60` },
      { lang: 'python', run: true, title: 'HPA replica calculator with clamp and tolerance (runnable)', code: `import math

def hpa_desired(current, metric, target, min_r=2, max_r=10, tolerance=0.10):
    """Kubernetes HPA formula: ceil(current * metric / target), clamped to [min, max].
    If the ratio is within +-10% of 1.0 the controller does nothing (avoids flapping)."""
    ratio = metric / target
    if abs(ratio - 1.0) <= tolerance:
        return current, ratio, "within tolerance, no change"
    desired = math.ceil(current * ratio)
    clamped = max(min_r, min(max_r, desired))
    note = "scale up" if clamped > current else "scale down" if clamped < current else "clamped, same"
    if clamped != desired:
        note += " (clamped from %d)" % desired
    return clamped, ratio, note

# Simulate total demand = 'cores worth of CPU %' spread across pods.
target = 50
replicas = 2
for demand in [90, 200, 400, 800, 1200, 1200, 600, 300, 100]:
    metric = demand / replicas                      # average % CPU per pod
    new, ratio, note = hpa_desired(replicas, metric, target)
    print("demand=%4d  pods=%2d  avgCPU=%6.1f%%  ratio=%.2f -> %2d  %s" % (demand, replicas, metric, ratio, new, note))
    replicas = new

# The worked examples from the lesson
print(hpa_desired(4, 90, 60))   # (6, 1.5, 'scale up')
print(hpa_desired(6, 20, 60))   # (3 or 2 depending on min, 0.33, ...)` }
    ],
    viz: {
      title: 'HPA reacts to load: replicas follow CPU',
      input: '90 200 400 800 1200 600 300 100',
      inputLabel: 'Total demand per minute (CPU % summed over pods; target 50% per pod, min 2, max 10)',
      gen: function (input) {
        var demand = ints(input, 14, 'Enter demand numbers (like 90 200 400 800) separated by spaces');
        if (demand.some(function (d) { return d < 0 || d > 5000; })) throw new Error('Demand must be between 0 and 5000');
        var TARGET = 50, MIN = 2, MAX = 10, TOL = 0.1;
        var replicas = 2, repHist = [], cpuHist = [], frames = [];
        frames.push({ narr: 'Start: <b>2 pods</b>, target <b>50%</b> CPU per pod, min 2, max 10. Each tick: avg CPU = demand / pods, then desired = ceil(pods x avgCPU / 50).', parts: [
          { type: 'vars', vals: { pods: 2, target: '50%', min: MIN, max: MAX } }] });
        demand.forEach(function (d, i) {
          var cpu = Math.round(d / replicas * 10) / 10;
          var ratio = cpu / TARGET;
          var raw = Math.ceil(replicas * ratio - 1e-9);
          var desired, why;
          if (Math.abs(ratio - 1) <= TOL) { desired = replicas; why = 'ratio ' + ratio.toFixed(2) + ' is within the 10% tolerance → <b>no change</b>'; }
          else {
            desired = Math.max(MIN, Math.min(MAX, raw));
            why = 'ceil(' + replicas + ' x ' + cpu + ' / ' + TARGET + ') = ' + raw + (desired !== raw ? ' → clamped to <b>' + desired + '</b>' : ' → <b>' + desired + '</b>');
          }
          repHist.push(replicas); cpuHist.push(Math.min(cpu, 200));
          var hlc = {}, hlr = {};
          hlc[i] = cpu > TARGET * (1 + TOL) ? 'bad' : (cpu < TARGET * (1 - TOL) ? 'win' : 'ok');
          hlr[i] = 'sel';
          var dir = desired > replicas ? 'ok' : (desired < replicas ? 'cur' : '');
          frames.push({ narr: 'Minute ' + (i + 1) + ': demand <b>' + d + '</b> over <b>' + replicas + '</b> pods = avg CPU <b>' + cpu + '%</b>. ' + why + '.' + (desired > replicas ? ' <span class="c-g">Scale UP.</span>' : desired < replicas ? ' <span class="c-y">Scale DOWN.</span>' : ''), parts: [
            { type: 'bars', label: 'Avg CPU % per pod (capped at 200)', values: cpuHist.slice(), hl: hlc },
            { type: 'bars', label: 'Replicas at that minute', values: repHist.slice(), hl: hlr },
            { type: 'vars', vals: { pods: replicas, 'avg CPU %': cpu, 'desired': desired }, hl: { desired: dir || 'cur' } }] });
          replicas = desired;
        });
        frames.push({ narr: 'Final: <b>' + replicas + ' pods</b>. Notice scale-up happens in big jumps, while real clusters shrink slowly (stabilization window) so a short lull does not remove capacity.', parts: [
          { type: 'bars', label: 'Replicas over time', values: repHist.concat([replicas]), hl: {} }, { type: 'vars', vals: { pods: replicas } }] });
        return frames;
      }
    },
    examples: [
      { title: 'Write a Deployment + Service + HPA (the full trio)', html: `<p>Combine the manifests from the earlier topics: the Deployment <b>must</b> have <code>resources.requests.cpu</code>; the HPA targets the Deployment by name; the Service needs no change because it follows labels, not replica counts. Do <b>not</b> set <code>replicas</code> in the Deployment manifest when you use an HPA via GitOps - otherwise every <code>apply</code> resets the count and fights the autoscaler.</p>` },
      { title: 'Why "unknown" CPU?', html: `<p><code>kubectl get hpa</code> shows <code>cpu: &lt;unknown&gt;/60%</code>. Checklist: (1) is <b>metrics-server</b> installed (<code>kubectl top pods</code> works?), (2) does every container in the pod have a CPU <b>request</b>, (3) are the pods Ready for at least a minute. Sidecars without requests also break the percentage.</p>` },
      { title: 'Scaling hits the database', html: `<p>Autoscale from 4 to 40 pods and each pod holds a connection pool of 20: that is 800 connections - Postgres defaults to 100. Autoscaling stateless pods moves the bottleneck to the database. Use smaller pools per pod, a pooler (PgBouncer, RDS Proxy), and cap <code>maxReplicas</code> to what the downstream can survive.</p>` },
      { title: 'CPU is the wrong signal', html: `<p>An I/O-heavy API waits on the network, so CPU stays at 15% while the queue grows and latency explodes. Scale on <b>requests per second per pod</b>, <b>queue depth</b> or <b>consumer lag</b> (custom/external metrics, KEDA). Rule: pick the metric that rises <i>before</i> users feel pain and falls when pods are added.</p>` }
    ],
    deepDive: `<p>🟣 <b>Control loop details.</b> HPA works from the <b>average across ready pods</b>. Missing metrics, not-yet-ready pods and just-started pods are treated conservatively (assumed 0% when scaling up, 100% when scaling down) to avoid overreacting. With several metrics, it computes a desired count for each and takes the <b>maximum</b>. Stabilization and <code>behavior.scaleUp/scaleDown</code> policies let you limit speed (e.g. at most +100% per minute, -1 pod per minute), which tames thundering herds on cold start.</p>
<p><b>The chain of latency.</b> Real reaction time = metrics scrape (~15-60 s) + HPA sync (15 s) + node provisioning if no room (1-5 min) + image pull (seconds to minutes; big images hurt here, which ties back to Dockerfile size) + app boot and readiness (seconds to minutes). A sudden 10x spike hits before any of it finishes. Defences: keep headroom (target 50-60%, not 90%), min replicas for baseline, pre-scale before known events, small fast-starting images, <b>overprovisioning</b> pause pods, and graceful degradation/rate limiting at the edge.</p>
<p><b>VPA, KEDA, Karpenter.</b> Do not run HPA and VPA on the same CPU/memory metric (they fight). VPA in recommend-only mode is a great source of correct <code>requests</code>. KEDA can scale to zero for event-driven workers. Karpenter/cluster-autoscaler provision nodes for Pending pods and consolidate when pods leave. Cost lives in requests: inflated requests mean idle money.</p>
<p><b>Capacity maths.</b> If one pod can handle 200 RPS at 100% CPU and you want to run at 60%, a 5,000 RPS peak needs ceil(5000 / 200 / 0.6) ≈ 42 pods - plus N+1 or a zone's worth of redundancy. HPA is not a substitute for load testing: find the real per-pod throughput first, then set min/max from numbers.</p>`,
    aiEra: `<p>🤖 <b>What AI changes.</b> Predictive autoscaling (forecasting the next hour from history) is now common in cloud products, and LLM workloads add GPU pods whose scaling signals are different: tokens per second, queue length, GPU utilisation, KV-cache pressure. Assistants can compute the HPA formula for a scenario and generate the YAML.</p>
<p><b>Use AI as a partner:</b> <code>Our API does 180 RPS per pod at p95 under 200 ms. Peak is 4,000 RPS. Suggest min/max replicas and a target, and list what could break the autoscaler.</code> Then validate the numbers with a load test.</p>
<p><b>Where AI goes wrong:</b> forgets CPU requests, scales on memory for a JVM (memory rarely drops, so it never scales down), sets min 1 for a production service, ignores the database ceiling, or recommends HPA and VPA together on CPU.</p>
<p><b>What you must still own:</b> the cost ceiling (<code>maxReplicas</code> is a budget decision), the SLO, and the failure mode when scaling cannot keep up. Be careful with AI inference autoscaling: GPU pods are expensive and slow to start (large model images), so scale-to-zero has a cold-start price users will feel.</p>`,
    problems: [{
      title: 'HPA Replica Calculation',
      level: 'Easy', tags: ['kubernetes', 'hpa', 'math'], companies: ['Google', 'Microsoft'],
      statement: `<p>A Deployment has 5 pods, an HPA with target CPU 50%, min 3, max 12. Average CPU across pods is now 120%. How many replicas does the HPA want? Later, at 8 pods, CPU drops to 20%: what now? What if CPU is 53% with 8 pods?</p>`,
      constraints: `Use desired = ceil(current x metric / target), clamp to min/max, 10% tolerance.`,
      example: `<p>5 x 120 / 50 = 12 → ${H.c('g', '12')}. 8 x 20 / 50 = 3.2 → ceil = ${H.c('y', '4')}. 53/50 = 1.06 → ${H.c('m', 'no change (8)')}.</p>`,
      brute: { why: `<p>Add one pod whenever CPU is above target: from 5 to 12 pods takes 7 control-loop cycles - too slow for a spike.</p>`, code: { lang: 'python', code: `def naive(current, metric, target):\n    return current + 1 if metric > target else current - 1  # slow, can't jump` } },
      mcq: { q: '4 pods at 90% CPU, target 60%. Desired replicas?', options: ['6', '5', '7'], answer: 0, explain: 'ceil(4 x 90 / 60) = ceil(6.0) = 6.' },
      hints: [`<p>Ratio = metric / target tells you how overloaded each pod is.</p>`, `<p>Multiply the pod count by that ratio and round UP.</p>`, `<p>Clamp to [min, max]; skip if the ratio is within 0.9-1.1.</p>`],
      solution: {
        approach: `<p>Apply the formula each time. Case 1: ceil(5 x 120/50) = ceil(12) = 12, which is exactly the max, so 12. Case 2: ceil(8 x 20/50) = ceil(3.2) = 4 (above min 3), so scale down to 4 - though in a real cluster the scale-down stabilization window delays it by up to 5 minutes. Case 3: ratio 53/50 = 1.06 is within the 10% tolerance, so the HPA changes nothing. Rounding up is deliberate: it is safer to have slightly more capacity than slightly less.</p>`,
        code: { lang: 'python', run: true, code: `import math\ndef desired(cur, m, t, lo, hi, tol=0.10):\n    r = m / t\n    if abs(r - 1) <= tol:\n        return cur\n    return max(lo, min(hi, math.ceil(cur * r)))\n\nprint(desired(5, 120, 50, 3, 12))  # 12\nprint(desired(8, 20, 50, 3, 12))   # 4\nprint(desired(8, 53, 50, 3, 12))   # 8` },
        complexity: `<p>O(1) per evaluation.</p>`,
        followUps: ['Why does the HPA scale down more slowly than up?', 'What if two metrics disagree?']
      }
    }, {
      title: 'Design Autoscaling for a Flash Sale',
      level: 'Hard', tags: ['kubernetes', 'hpa', 'capacity', 'design'], companies: ['Amazon', 'Flipkart'],
      statement: `<p>Your checkout API normally gets 300 RPS and will see 5,000 RPS for 20 minutes during a sale, ramping up in 2 minutes. One pod handles 150 RPS at 60% CPU. Image is 700 MB, boot takes 60 s. Design the autoscaling and say what you would change before the sale.</p>`,
      constraints: `p95 < 300 ms; the database allows 400 connections; pool size per pod is 10.`,
      example: `<p>Needed: ceil(5000 / 150) = 34 pods at 60% CPU. DB limit: 400 / 10 = ${H.c('r', '40 pods max')}. So max replicas about 40 (and shrink the pool).</p>`,
      brute: { why: `<p>Rely on default HPA at target 80% with min 2: it reacts after the spike lands, new pods need image pull + 60 s boot, so the first minutes see timeouts and errors.</p>`, code: { lang: 'yaml', check: false, code: `minReplicas: 2\nmaxReplicas: 100\ntarget: 80` } },
      mcq: { q: 'Which is most important for a known sale?', options: ['Pre-scale (raise minReplicas) before the event and load test', 'Lower the CPU target to 10%', 'Remove maxReplicas'], answer: 0, explain: 'Reaction latency (metrics, nodes, pulls, boot) is longer than a 2-minute ramp, so you must have capacity ready in advance.' },
      hints: [`<p>Compute capacity: peak RPS / RPS per pod / target utilisation.</p>`, `<p>Where will scaling bottleneck? Database connections, nodes, image pull, boot time.</p>`, `<p>Pre-scale, scale-up policy, smaller image, pooler, load test, degrade gracefully (queue/shed non-critical work).</p>`],
      solution: {
        approach: `<p>Capacity: 5,000 / 150 ≈ 34 pods at 60% CPU; add 20-25% headroom and zone redundancy → plan for about 40. The database caps total connections: 40 pods x 10 = 400 exactly, so reduce pool size to 5 or put a pooler (PgBouncer/RDS Proxy) in front, and keep maxReplicas at 40. Because the ramp is 2 minutes but pods take about 60 s to boot plus image pull (and possibly a new node, 2-4 min), purely reactive HPA is too slow: raise minReplicas to about 30 an hour before the sale (scheduled via CronJob/KEDA cron scaler), keep the HPA target at 60%, allow fast scale-up (100% per minute) and slow scale-down. Shrink the image (multi-stage) and pre-pull it on nodes, add overprovisioning pause pods or Karpenter headroom so nodes already exist. Run a load test at 6,000 RPS beforehand. Protect the system with rate limiting, a queue for non-critical work, and a rollback plan.</p>`,
        complexity: `<p>Capacity math O(1); the design cost is dominated by pre-warming and the downstream limits.</p>`,
        followUps: ['How would you scale down safely after the sale?', 'Which metric would you use besides CPU?']
      }
    }]
  });

  /* ================================================================
     TOPIC 6 — CI/CD pipelines
     ================================================================ */
  topics.push({
    title: 'CI/CD Pipelines: From Commit to Production',
    analogy: `<p>A car factory line. A part (your commit) moves along a <b>conveyor belt</b> past stations: measure it, test it, paint it, crash-test a sample, then ship. If any station rejects the part, the belt <b>stops there</b> and nothing defective reaches the showroom. <b>CI</b> (Continuous Integration) is the early stations: every change is automatically built and tested. <b>CD</b> (Continuous Delivery/Deployment) is the late stations: the tested package is automatically shipped - delivery means "ready to ship at the press of a button", deployment means "ships by itself".</p>`,
    explain: `<p>🟢 <b>The idea:</b> instead of "build it on Friday and pray", every push to git triggers a robot that builds, tests and (if all is green) deploys. Small changes, shipped often, each one checked by a machine - fewer surprises, faster fixes.</p>
<p>🔵 <b>A typical pipeline, stage by stage:</b></p>
${H.table(['#', 'Stage', 'What it does', 'Fails when'], [
  ['1', 'Checkout', 'Get the exact commit', '-'],
  ['2', 'Build + unit tests', 'Compile, run fast tests (seconds-minutes)', 'Compile error, failing test'],
  ['3', 'Static checks', 'Lint, format, SAST, dependency/CVE scan, secret scan', 'Policy violation, leaked key'],
  ['4', 'Build image', 'Multi-stage Dockerfile, tag with the git SHA', 'Dockerfile error'],
  ['5', 'Scan + push', 'Scan image, sign, push to registry', 'Critical CVE'],
  ['6', 'Deploy to staging', 'Apply manifests/Helm with the new tag', 'Rollout does not become Ready'],
  ['7', 'Integration / smoke tests', 'Hit staging endpoints, contract tests', 'Broken behaviour'],
  ['8', 'Approve (optional)', 'Human gate for regulated systems', 'Rejected'],
  ['9', 'Deploy to production', 'Rolling / blue-green / canary + auto rollback', 'Health checks fail']
])}
<p><b>Golden rules:</b> (1) <b>Build once, deploy many</b> - the exact same image that passed staging is promoted to prod; never rebuild for prod. (2) <b>Fail fast</b> - cheap checks first, slow ones later; run independent jobs in parallel. (3) <b>Tag images with the commit SHA</b>, not <code>latest</code>, so every deploy is traceable and rollback is "deploy the previous SHA". (4) <b>Secrets live in the CI secret store</b> and are injected at run time, never committed. (5) Keep the pipeline <b>as code</b> in the repo (YAML), reviewed like any code. (6) A red main branch is an emergency: fix or revert first.</p>
<p><b>GitOps (modern CD).</b> CI builds and pushes the image and then changes a git repo that describes the desired cluster state (new image tag); a controller inside the cluster (Argo CD, Flux) pulls and applies it. Git is the source of truth, every deploy is a commit, and rollback is <code>git revert</code>.</p>`,
    clues: ['"design a CI/CD pipeline for a microservice" → stages, gates, artifacts, rollback', '"deploy takes 45 minutes / flaky tests" → parallelise, cache, quarantine flaky tests, test pyramid', '"same artifact in staging and prod" → build once, promote', '"how do you roll back?" → previous SHA / git revert / blue-green / rollout undo', '"secrets in the pipeline" → CI secret store, OIDC short-lived credentials', '"multiple environments, approvals" → promotion with gates; GitOps', '"monorepo, many services" → path filters, build only what changed'],
    code: [
      { lang: 'yaml', title: 'GitHub Actions: test, build image, push (check: false - uses Actions expressions)', check: false, code: `name: ci
on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: "21"
          cache: maven                 # cache ~/.m2 between runs
      - run: mvn -B verify             # compile + unit + integration tests

  image:
    needs: test                        # runs only if tests passed
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: \${{ github.actor }}
          password: \${{ secrets.GITHUB_TOKEN }}     # injected by the platform, never in the repo
      - uses: docker/build-push-action@v6
        with:
          push: true
          tags: ghcr.io/example-org/shop-api:\${{ github.sha }}   # immutable tag = the commit
          cache-from: type=gha
          cache-to: type=gha,mode=max` },
      { lang: 'yaml', title: 'Same shape in GitLab CI (checked)', code: `stages: [test, build, deploy]

test:
  stage: test
  image: maven:3.9-eclipse-temurin-21
  script:
    - mvn -B verify

build-image:
  stage: build
  image: docker:27
  services: [docker:27-dind]
  script:
    # CI_REGISTRY_* and CI_COMMIT_SHA are provided by the platform; the password is a masked variable
    - echo "$CI_REGISTRY_PASSWORD" | docker login -u "$CI_REGISTRY_USER" --password-stdin "$CI_REGISTRY"
    - docker build -t "$CI_REGISTRY_IMAGE:$CI_COMMIT_SHA" .
    - docker push "$CI_REGISTRY_IMAGE:$CI_COMMIT_SHA"
  rules:
    - if: $CI_COMMIT_BRANCH == "main"

deploy-staging:
  stage: deploy
  script:
    - kubectl set image deploy/shop-api api="$CI_REGISTRY_IMAGE:$CI_COMMIT_SHA" -n staging
    - kubectl rollout status deploy/shop-api -n staging --timeout=120s
  environment: staging
  needs: [build-image]` },
      { lang: 'python', run: true, title: 'Fail-fast pipeline runner (runnable)', code: `# A pipeline is an ordered list of stages. The first failure stops everything after it.
def run_pipeline(stages, failing=None):
    done, skipped = [], []
    failed = None
    for name in stages:
        if failed is not None:
            skipped.append(name)          # never runs: belt stopped
        elif name == failing:
            failed = name
            print("  [FAIL]", name)
        else:
            done.append(name)
            print("  [ ok ]", name)
    for s in skipped:
        print("  [skip]", s)
    return failed is None

stages = ["checkout", "unit-tests", "scan", "build-image", "push", "deploy-staging", "smoke-tests", "deploy-prod"]
for f in [None, "scan"]:
    print("Pipeline, failing stage =", f)
    ok = run_pipeline(stages, f)
    print("  => release allowed:", ok)` }
    ],
    viz: {
      title: 'Pipeline stages as a queue: a failure stops the line',
      input: '0',
      inputLabel: 'Which stage fails? 0 = none, or 1-8 (e.g. 4 = scan)',
      gen: function (input) {
        var f = ints(input, 1, 'Enter a stage number 0-8 (0 = all pass)')[0];
        var stages = ['checkout', 'unit tests', 'scan', 'build image', 'push', 'deploy staging', 'smoke tests', 'deploy prod'];
        if (f < 0 || f > stages.length || f % 1 !== 0) throw new Error('Stage number must be 0 to 8');
        var frames = [];
        function q(statusUpTo, failIdx) {
          var hl = {};
          stages.forEach(function (s, i) {
            if (failIdx === i) hl[i] = 'bad';
            else if (failIdx >= 0 && i > failIdx) hl[i] = 'done';
            else if (i < statusUpTo) hl[i] = 'ok';
            else if (i === statusUpTo) hl[i] = 'cur';
          });
          return { type: 'queue', label: 'Pipeline stages (front = next to run)', items: stages.slice(), hl: hl, frontLabel: 'first', backLabel: 'last' };
        }
        frames.push({ narr: 'A commit lands on <code>main</code>. The pipeline is a line of <b>' + stages.length + ' stages</b>. Cheap, fast checks come first (fail fast); expensive ones later.', parts: [q(-1, -1)] });
        for (var i = 0; i < stages.length; i++) {
          if (f === i + 1) {
            frames.push({ narr: 'Stage <b>' + stages[i] + '</b> <span class="c-r">FAILS</span>. The belt stops. All later stages are <b>skipped</b>, and nothing reaches production. The developer gets a notification with logs.', parts: [q(i, i), { type: 'vars', vals: { failed: stages[i], 'stages skipped': stages.length - i - 1, 'prod changed?': 'no' }, hl: { failed: 'bad' } }] });
            frames.push({ narr: 'Fix the cause (or revert), push again: a new run starts from stage 1. The key promise: <b>a red stage means no release</b>.', parts: [q(i, i)] });
            return frames;
          }
          frames.push({ narr: 'Stage <b>' + stages[i] + '</b> ' + (i < 2 ? 'runs and <span class="c-g">passes</span> - ' + (i === 0 ? 'we have the exact commit.' : 'fast tests give feedback in minutes.') : i === 3 ? 'passes - the image is tagged with the commit SHA.' : i === 4 ? 'passes - the image is stored in the registry; the SAME image is used for every environment.' : i === 7 ? 'passes - production now runs the new version.' : '<span class="c-g">passes</span>.'), parts: [q(i, -1)] });
        }
        var done = {}; stages.forEach(function (s, i) { done[i] = 'ok'; });
        frames.push({ narr: '<span class="c-g">All stages green.</span> The change is in production, usually within minutes of the commit.', parts: [{ type: 'queue', label: 'Pipeline complete', items: stages.slice(), hl: done }] });
        return frames;
      }
    },
    examples: [
      { title: 'Design a CI pipeline for a Spring Boot microservice (interview answer)', html: `<p><b>Triggers:</b> every PR runs test + scan; merge to main also builds, pushes and deploys. <b>Jobs:</b> (1) build+unit test with a Maven cache; (2) in parallel: lint, SAST, dependency scan, secret scan; (3) integration tests with Testcontainers; (4) build image, tag <code>git-sha</code>, scan, sign, push; (5) deploy to staging by updating the GitOps repo; (6) smoke + contract tests; (7) prod with canary and auto-rollback on SLO breach. <b>Practices:</b> artifacts built once, short-lived cloud credentials via OIDC (no long-lived keys), required status checks + code review on main, flaky-test quarantine, pipeline duration budget (10 min for PR feedback), notifications on failure.</p>` },
      { title: 'Rollback strategies', html: `${H.table(['Strategy', 'How', 'Speed'], [['Redeploy previous image SHA', 'Pipeline with the old tag (build once pays off)', 'minutes'], ['kubectl rollout undo', 'Deployment returns to previous ReplicaSet', 'seconds-minutes'], ['GitOps revert', 'git revert the change; controller reconciles', 'minutes, auditable'], ['Blue-green switch back', 'Point the router at the old environment', 'seconds'], ['Feature flag off', 'Disable the new code path without deploying', 'seconds'], ['Database', 'Hard! Use expand/contract so old code still works', 'plan ahead']])}<p>The fastest rollback is the one you rehearsed. Practise it in staging.</p>` },
      { title: 'Secrets in CI', html: `<p>Never echo secrets (CI masks them, but base64 or splitting defeats masking). Store them in the CI secret store or a vault, scope them per environment (staging keys cannot touch prod), and prefer <b>OIDC federation</b>: the job proves its identity to the cloud and receives a token valid for minutes. Pull requests from forks must not receive secrets. If a key leaks: rotate first, investigate second.</p>` }
    ],
    deepDive: `<p>🟣 <b>Speed is a feature.</b> A PR pipeline over ~10 minutes makes people context-switch and batch changes, which defeats CI. Levers: dependency and Docker layer caches (remember: a clean runner has no cache unless you restore one), splitting tests across parallel shards, running only affected modules in a monorepo (path filters, build graph tools), test pyramid discipline (many unit tests, fewer integration, very few E2E), and quarantining flaky tests with an owner and deadline. Track <b>DORA metrics</b>: deployment frequency, lead time for changes, change-failure rate, time to restore.</p>
<p><b>Continuous delivery vs deployment.</b> Delivery keeps a human "release" button; deployment ships every green commit. Either way, decouple <b>deploy</b> (code reaches servers) from <b>release</b> (users see it) with feature flags, so unfinished work can merge to main safely (trunk-based development) and be switched on gradually.</p>
<p><b>Supply-chain security.</b> Pin actions and base images by digest, use least-privilege tokens (<code>permissions:</code> block), generate an SBOM, sign artifacts (cosign) and verify the signature at admission time in the cluster, run builds on ephemeral runners, and treat third-party actions as code you are executing with your credentials. Protect main with required reviews, status checks and signed commits.</p>
<p><b>Environments and promotion.</b> Same image, different config per environment. Promotion = changing which version an environment points to (a git commit in GitOps). Add automated gates (error rate, latency, smoke tests) between environments; manual approvals only where compliance requires it. Database migrations run as a separate, backward-compatible step (Flyway/Liquibase job) before the app rollout, never as something that can only go forward.</p>
<p><b>Observability of the pipeline itself.</b> Record which commit is running where (deploy markers on dashboards), so an error spike can be traced to a deploy in seconds.</p>`,
    aiEra: `<p>🤖 <b>What AI changes.</b> AI writes pipeline YAML, explains failing logs ("the test failed because the container was not ready - add a wait"), proposes fixes in pull requests, summarises changes and flags risky diffs. Some teams use AI reviewers and AI test generators as pipeline stages. Agents can now open PRs that the pipeline validates.</p>
<p><b>Use AI as a partner:</b> <code>Here is the failed job log (secrets redacted). Give the root cause in one sentence and the smallest fix.</code> Or: <code>Design a pipeline for this repo; list each stage's purpose and failure policy.</code></p>
<p><b>Where AI goes wrong:</b> unpinned third-party actions, <code>permissions: write-all</code>, echoing secrets for "debugging", deploying on every PR (including forks), skipping tests to "make it green", or hallucinating action versions that do not exist.</p>
<p><b>What you must still own:</b> the pipeline is a high-privilege system - it holds the keys to production. Pipeline gates are the safety net for <b>AI-written code</b>: the more code an agent produces, the more you rely on strong tests, scans and review. Never let AI-generated changes bypass required checks, and keep humans on approval for production.</p>`,
    problems: [{
      title: 'Design a CI/CD Pipeline',
      level: 'Medium', tags: ['ci-cd', 'design', 'pipeline'], companies: ['Atlassian', 'Intuit'],
      statement: `<p>Design a CI/CD pipeline for a team of 20 shipping a containerised Java service to Kubernetes several times a day. List stages, what runs on PRs vs main, how secrets are handled, how you promote across environments and how you roll back.</p>`,
      constraints: `PR feedback under 10 minutes; production deploys must be auditable and reversible within 5 minutes.`,
      example: `<p>PR: build + test + scan (${H.c('g', '8 min')}). Main: + image + staging + smoke + canary prod (${H.c('g', '25 min')}). Rollback: redeploy previous SHA.</p>`,
      brute: { why: `<p>One giant script on a shared server: build on the server, copy the jar by SSH, restart manually. No tests gate it, secrets live on the box, rebuilding for prod can differ from staging, and rollback means "find the old jar".</p>`, code: { lang: 'bash', check: false, code: `ssh prod "cd app && git pull && mvn package && systemctl restart app"` } },
      mcq: { q: 'Best way to promote to production?', options: ['Deploy the exact image already tested in staging', 'Rebuild from source for production', 'Copy files by hand'], answer: 0, explain: 'Build once, deploy many: rebuilding can produce a different artifact than the one you tested.' },
      hints: [`<p>Separate fast PR checks from slower main-branch work.</p>`, `<p>One immutable artifact (image tagged with the SHA) flows through environments.</p>`, `<p>Secrets from a store/OIDC, gates between environments, progressive prod rollout, automated rollback signal.</p>`],
      solution: {
        approach: `<p>PRs run build, unit tests, lint, SAST, dependency and secret scans in parallel with caches, and Testcontainers integration tests; branch protection requires green checks and one review. On merge to main: build the image once (multi-stage, tagged with the commit SHA), scan, sign and push to the registry; update the GitOps repo (or run helm upgrade) for staging; run smoke and contract tests; then promote the same SHA to production with a canary (5%, 25%, 100%) guarded by error-rate and latency checks. Secrets come from the CI secret store or OIDC short-lived cloud credentials, scoped per environment; forks get none. Rollback is redeploying the previous SHA or git revert in the GitOps repo, plus feature flags for instant disable. Database changes are backward compatible (expand/contract). Pipeline metrics (duration, flake rate, change-failure rate) are tracked, and deploy markers appear on dashboards.</p>`,
        complexity: `<p>Wall time = longest path; parallelising independent checks keeps PR feedback under 10 minutes.</p>`,
        followUps: ['How do you handle a flaky test blocking everyone?', 'How would you deploy a database migration safely?']
      }
    }, {
      title: 'Pipeline Passed But Prod Broke',
      level: 'Hard', tags: ['ci-cd', 'incident', 'testing'], companies: ['Cloudflare', 'GitHub'],
      statement: `<p>All checks were green, staging looked fine, but production returned 500 errors minutes after release. Give a structured investigation plan and the pipeline changes that prevent repeat incidents.</p>`,
      constraints: `Mitigate first, learn second; propose at least four concrete pipeline improvements.`,
      example: `<p>Cause found: prod has a feature-flag service and a bigger data set; the new query times out only at ${H.c('r', '10M rows')}.</p>`,
      brute: { why: `<p>Immediately debug in production by reading code and live-patching. Users keep suffering; fixes are untested; you may make it worse.</p>`, code: { lang: 'text', check: false, code: `ssh prod; edit file; restart` } },
      mcq: { q: 'First action when a fresh release causes errors?', options: ['Roll back / disable the flag to restore service', 'Write the postmortem', 'Add more tests'], answer: 0, explain: 'Mitigate user impact first; diagnose afterwards using logs, traces and the diff.' },
      hints: [`<p>What can you do in 2 minutes that undoes the change?</p>`, `<p>Compare staging vs prod: data volume, config, dependencies, traffic shape.</p>`, `<p>Add canary + automated SLO gates, prod-like test data, config validation, and better alerts tied to deploy markers.</p>`],
      solution: {
        approach: `<p>Mitigate: roll back to the previous SHA (or flip the feature flag), confirm error rate recovers, and open an incident channel. Investigate: correlate the error start time with the deploy marker, read error logs and traces, diff the release, and compare environment differences (data volume, config values, secrets, third-party limits, traffic shape). Typical finding: staging data is small, so a slow query or a missing index only hurts in production. Prevent: roll out with canary and automatic abort on error-rate or latency regression, test with production-like data or replayed traffic, add performance tests for critical queries, validate configuration in CI, keep feature flags for risky paths, add synthetic probes post-deploy, and run a blameless postmortem with owners for each action item.</p>`,
        complexity: `<p>Time-to-restore is the metric: the target is minutes via rollback, not hours via hotfix.</p>`,
        followUps: ['How would a canary have caught this?', 'What belongs in the postmortem?']
      }
    }]
  });

  /* ================================================================
     TOPIC 7 — Blue-green and canary releases
     ================================================================ */
  topics.push({
    title: 'Blue-Green and Canary Releases',
    analogy: `<p><b>Blue-green</b> is a theatre with <b>two identical stages</b>. The audience watches stage Blue while the crew sets up the new show on stage Green behind the curtain and rehearses it. When ready, you flip the spotlight to Green in one move. If the new show flops, flip back to Blue in a second.</p>
<p><b>Canary</b> is the old coal-mine canary: send one small bird in first. You let <b>5% of visitors</b> try the new version while watching their health (errors, speed). If the canary is fine, let in 50%, then everyone. If it coughs, pull it out - only a few were affected.</p>`,
    explain: `<p>🟢 <b>Why not just replace everything?</b> Even good tests miss problems that only real traffic reveals. Release strategies limit the <b>blast radius</b> (how many users a bad release can hurt) and the <b>time to recover</b>.</p>
${H.table(['Strategy', 'How', 'Pros', 'Cons'], [
  ['Recreate', 'Stop v1, start v2', 'Simplest', 'Downtime'],
  ['Rolling', 'Replace pods gradually', 'No extra infra, built in', 'v1 and v2 mix; rollback is another rollout; no real traffic-split control'],
  ['<b>Blue-green</b>', 'Two full environments; switch the router', 'Instant switch AND instant rollback; test green before users', '2x capacity during release; database must work with both'],
  ['<b>Canary</b>', 'Send a small % of traffic to v2, grow it while checking metrics', 'Smallest blast radius; real-traffic validation', 'Needs traffic-splitting + good metrics; slower'],
  ['Shadow / mirror', 'Copy real traffic to v2, ignore its responses', 'Zero user risk', 'Side effects (emails, writes) must be avoided']
])}
<p>🔵 <b>Blue-green steps:</b> (1) Blue (v1) serves all traffic. (2) Deploy v2 to Green; run smoke tests against it with no user traffic. (3) Flip the router/load balancer/Service selector to Green. (4) Watch. (5) <b>Keep Blue idle</b> for a while - rollback is flipping back. (6) Later reuse Blue for the next release.</p>
<p>🔵 <b>Canary steps and rollback criteria.</b> Plan the ladder <b>before</b> you start, e.g. <b>5% → 50% → 100%</b>, with a pause at each step and written <b>abort rules</b> compared to the stable version:</p>
${H.table(['Step', 'Traffic to v2', 'Hold', 'Promote if ALL true', 'Rollback if ANY true'], [
  ['1', '5%', '10 min', 'error rate ≤ baseline + 0.5 pt; p95 ≤ 1.2 x baseline; no new error types', 'error rate > baseline + 1 pt; p95 > 1.5 x baseline; crash loops; business KPI drop (checkout success)'],
  ['2', '50%', '20 min', 'same, with a statistically meaningful sample', 'same'],
  ['3', '100%', '-', 'finish rollout, keep old ReplicaSet for undo', 'same, plus alert']
])}
<p><b>Rollback decision = numbers, not feelings.</b> Compare canary vs baseline at the same time (not vs yesterday), require enough requests (a 5% slice of low traffic may be too few to judge), and automate the abort so it happens in seconds even at 3 a.m.</p>`,
    clues: ['"release with minimal risk / limit blast radius" → canary or blue-green', '"instant rollback" → blue-green (flip back) or feature flag', '"validate with real traffic" → canary / shadow traffic', '"need double the infrastructure" → blue-green cost', '"v1 and v2 share the database" → backward-compatible migrations (expand/contract)', '"5% then 50% then 100%" → canary ladder with metric gates', '"sticky users / sessions" → consistent hashing so a user stays on one version'],
    code: [
      { lang: 'js', run: true, title: 'Canary traffic split + rollback decider (runnable)', code: `// 1) Deterministic traffic split: the same user always lands on the same version.
function bucket(userId) {              // simple string hash -> 0..99
  var h = 0;
  for (var i = 0; i < userId.length; i++) h = (h * 31 + userId.charCodeAt(i)) >>> 0;
  return h % 100;
}
function route(userId, canaryPercent) { return bucket(userId) < canaryPercent ? 'v2-canary' : 'v1-stable'; }

var counts = { 'v1-stable': 0, 'v2-canary': 0 };
for (var u = 0; u < 10000; u++) counts[route('user-' + u, 5)]++;
console.log('5% canary over 10000 users ->', JSON.stringify(counts));

// 2) Decide: compare canary metrics to the stable baseline at the SAME time.
function decide(baseline, canary, minRequests) {
  if (canary.requests < minRequests) return { action: 'HOLD', why: 'not enough traffic yet (' + canary.requests + ' < ' + minRequests + ')' };
  var errDelta = canary.errPct - baseline.errPct;      // percentage points
  var latRatio = canary.p95 / baseline.p95;
  if (errDelta > 1.0) return { action: 'ROLLBACK', why: 'error rate +' + errDelta.toFixed(2) + ' pt (limit 1.0)' };
  if (latRatio > 1.5) return { action: 'ROLLBACK', why: 'p95 is ' + latRatio.toFixed(2) + 'x baseline (limit 1.5x)' };
  if (errDelta > 0.5 || latRatio > 1.2) return { action: 'HOLD', why: 'borderline (err +' + errDelta.toFixed(2) + ' pt, latency ' + latRatio.toFixed(2) + 'x) - wait and re-check' };
  return { action: 'PROMOTE', why: 'healthy (err +' + errDelta.toFixed(2) + ' pt, latency ' + latRatio.toFixed(2) + 'x)' };
}

var ladder = [5, 50, 100];
var observed = [
  { baseline: { errPct: 0.30, p95: 180 }, canary: { requests: 900,  errPct: 0.40, p95: 190 } },
  { baseline: { errPct: 0.30, p95: 180 }, canary: { requests: 9000, errPct: 1.90, p95: 200 } }  // regression at 50%!
];
for (var s = 0; s < observed.length; s++) {
  var d = decide(observed[s].baseline, observed[s].canary, 500);
  console.log('step ' + ladder[s] + '% -> ' + d.action + ': ' + d.why);
  if (d.action === 'ROLLBACK') { console.log('traffic back to 0% canary; stable v1 untouched'); break; }
}` }
    ],
    viz: [{
      title: 'Blue-green: switch the router, keep blue for rollback',
      input: 'ok',
      inputLabel: 'After the switch, does green behave? (ok or fail)',
      gen: function (input) {
        var res = String(input || 'ok').trim().toLowerCase();
        if (res !== 'ok' && res !== 'fail') throw new Error('Type ok or fail');
        function g(live, ehl, hl, tags, label) {
          return { type: 'graph', label: label || 'Blue-green', directed: true, height: 60,
            nodes: [bx('u', 'Users', 8, 30, 14), bx('r', 'Router / LB', 36, 30, 22), bx('b', 'BLUE v1', 80, 10, 24), bx('gr', 'GREEN v2', 80, 50, 24), bx('db', 'Database', 80, 30, 24)],
            edges: [['u', 'r'], ['r', 'b'], ['r', 'gr'], ['b', 'db'], ['gr', 'db']], hl: hl || {}, ehl: ehl || {}, tags: tags || {} };
        }
        var frames = [];
        frames.push({ narr: 'Blue (v1) is <b>live</b>: the router sends all users to it. Green is empty/idle.', parts: [g(0, { 'u-r': 'ok', 'r-b': 'ok' }, { b: 'ok' }, { b: 'LIVE 100%', gr: 'idle' })] });
        frames.push({ narr: '<b>Deploy v2 to Green.</b> No user traffic touches it, so there is no risk while it starts and migrations run (they must stay compatible with v1!).', parts: [g(0, { 'u-r': 'ok', 'r-b': 'ok' }, { b: 'ok', gr: 'cur' }, { b: 'LIVE 100%', gr: 'v2 deploying' })] });
        frames.push({ narr: '<b>Test Green privately</b> (smoke tests, internal users). Real production-like environment, zero customer exposure.', parts: [g(0, { 'u-r': 'ok', 'r-b': 'ok' }, { b: 'ok', gr: 'sel' }, { b: 'LIVE 100%', gr: 'testing' })] });
        frames.push({ narr: '<b>Flip the switch:</b> the router now points to Green. One atomic change - users move together, no half-updated mix.', parts: [g(0, { 'u-r': 'ok', 'r-gr': 'ok' }, { gr: 'ok', b: 'done' }, { gr: 'LIVE 100%', b: 'standby' })] });
        if (res === 'ok') {
          frames.push({ narr: 'Metrics are healthy. <span class="c-g">Release succeeded.</span> Blue stays on standby for a while (the rollback button), then is reused for the next release.', parts: [g(0, { 'u-r': 'ok', 'r-gr': 'ok' }, { gr: 'ok', b: 'done' }, { gr: 'LIVE 100%', b: 'standby 1h' })] });
        } else {
          frames.push({ narr: '<span class="c-r">Green is failing</span> (errors up). Decision rule hit - <b>flip back</b>.', parts: [g(0, { 'u-r': 'ok', 'r-gr': 'bad' }, { gr: 'bad', b: 'done' }, { gr: 'FAILING', b: 'standby' })] });
          frames.push({ narr: 'The router points to Blue again - recovery in seconds, with no redeploy. Users were affected only between the flip and the flip-back.', parts: [g(0, { 'u-r': 'ok', 'r-b': 'ok' }, { b: 'ok', gr: 'bad' }, { b: 'LIVE 100%', gr: 'fix later' })] });
        }
        frames.push({ narr: 'Remember the shared <b>database</b>: both colours may talk to it, so schema changes must work with v1 AND v2 (expand/contract). Otherwise the flip-back cannot work.', parts: [g(0, { 'b-db': 'cur', 'gr-db': 'cur' }, { db: 'sel' }, { db: 'shared!' }), { type: 'text', html: 'Blue-green doubles compute cost during the window and does <b>not</b> protect you from a bad data migration.' }] });
        return frames;
      }
    }, {
      title: 'Canary 5% → 50% → 100% with rollback criteria',
      input: '0.4 0.5 0.4',
      inputLabel: 'Canary error % observed at 5%, 50%, 100% (baseline is 0.3%; rollback if more than +1.0 pt)',
      gen: function (input) {
        var errs = String(input || '').trim().split(/[\s,]+/).map(Number);
        if (errs.length < 1 || errs.length > 3 || errs.some(function (x) { return isNaN(x) || x < 0 || x > 100; })) throw new Error('Enter up to three error percentages, e.g. 0.4 0.5 0.4 or 0.4 2.1');
        var steps = [5, 50, 100], base = 0.3, LIMIT = 1.0, frames = [];
        frames.push({ narr: 'Plan: ladder <b>5% → 50% → 100%</b>. Baseline error rate is <b>' + base + '%</b>. Abort rule: canary error rate more than <b>' + LIMIT + ' point</b> above baseline.', parts: [{ type: 'bars', label: 'Traffic to v2 (%)', values: [0, 0, 0], idxLabels: ['5%', '50%', '100%'] }, { type: 'vars', vals: { baseline: base + '%', 'abort if above': (base + LIMIT).toFixed(1) + '%' } }] });
        var traffic = [0, 0, 0];
        for (var i = 0; i < errs.length; i++) {
          traffic[i] = steps[i];
          var e = errs[i], bad = e - base > LIMIT;
          var hl = {}; hl[i] = bad ? 'bad' : 'ok';
          frames.push({ narr: 'Step <b>' + steps[i] + '%</b>: hold and watch. Canary error rate = <b>' + e + '%</b> vs baseline ' + base + '% (delta ' + (e - base).toFixed(2) + ' pt). ' + (bad ? '<span class="c-r">Above the abort limit.</span>' : '<span class="c-g">Within limits.</span>'), parts: [
            { type: 'bars', label: 'Traffic to v2 (%)', values: traffic.slice(), hl: hl, idxLabels: ['5%', '50%', '100%'] },
            { type: 'vars', vals: { 'canary error %': e, 'baseline %': base, 'delta pt': +(e - base).toFixed(2), decision: bad ? 'ROLLBACK' : (i === 2 ? 'DONE' : 'PROMOTE') }, hl: { decision: bad ? 'bad' : 'ok' } }] });
          if (bad) {
            frames.push({ narr: '<b>Automatic rollback:</b> traffic to v2 set back to 0%. Only about ' + steps[i] + '% of users saw the problem, for a few minutes. v1 never stopped serving.', parts: [{ type: 'bars', label: 'Traffic to v2 (%)', values: [0, 0, 0], idxLabels: ['5%', '50%', '100%'] }, { type: 'vars', vals: { 'users affected': '<= ' + steps[i] + '%', status: 'rolled back' }, hl: { status: 'bad' } }] });
            return frames;
          }
        }
        if (errs.length < 3) frames.push({ narr: 'You gave fewer than three readings; the ladder pauses here, still healthy.', parts: [{ type: 'bars', label: 'Traffic to v2 (%)', values: traffic.slice(), idxLabels: ['5%', '50%', '100%'] }] });
        else frames.push({ narr: '<span class="c-g">Fully promoted.</span> Keep the old ReplicaSet for a while so <code>rollout undo</code> is still instant.', parts: [{ type: 'bars', label: 'Traffic to v2 (%)', values: [5, 50, 100], hl: { 2: 'sel' }, idxLabels: ['5%', '50%', '100%'] }] });
        return frames;
      }
    }],
    examples: [
      { title: 'Canary in Kubernetes without extra tools', html: `<p>Poor man's canary: two Deployments (<code>shop-api-stable</code> with 9 replicas, <code>shop-api-canary</code> with 1) sharing the label <code>app: shop-api</code> that the Service selects. About 10% of requests hit the canary (traffic follows the pod ratio). Simple but coarse. For exact percentages (5%, 25%) and header-based routing use an <b>ingress controller with weights</b> (e.g. ingress-nginx canary annotations, now retired, or weighted backends in a Gateway API HTTPRoute), a <b>service mesh</b> (Istio/Linkerd), or <b>Argo Rollouts / Flagger</b>, which also automate the metric checks and abort.</p>` },
      { title: 'Blue-green in Kubernetes', html: `<p>Run <code>shop-api-blue</code> and <code>shop-api-green</code> Deployments with a label <code>version: blue|green</code>. The Service selector includes <code>version: blue</code>. To switch: <code>kubectl patch service shop-api -p '{"spec":{"selector":{"app":"shop-api","version":"green"}}}'</code>. Rollback = patch it back. In the cloud, the same idea swaps target groups on a load balancer.</p>` },
      { title: 'What to measure on a canary', html: `${H.table(['Signal', 'Why', 'Example rule'], [['Error rate (5xx)', 'Direct correctness signal', 'abort if > baseline + 1 pt'], ['Latency p95/p99', 'Performance regressions', 'abort if > 1.5x baseline'], ['Saturation (CPU, memory, GC, DB connections)', 'Resource regressions that bite later', 'hold if climbing'], ['Business KPIs (checkout success, sign-ups)', 'Bugs with no errors', 'abort if drop > 2%'], ['Logs: new error types', 'Unknown failure modes', 'hold + investigate']])}` },
      { title: 'Feature flags vs deployments', html: `<p>A canary exposes a <i>version</i> to a % of traffic; a <b>feature flag</b> exposes a <i>feature</i> to a % of users inside one version. They combine well: deploy dark (flag off) to everyone via a safe rolling update, then turn the feature on for 1%, 10%, 100% and switch it off instantly if needed. Clean up old flags - they become debt.</p>` }
    ],
    deepDive: `<p>🟣 <b>Statistics of canaries.</b> A 5% slice of 100 RPS is 5 RPS; in 10 minutes that is only 3,000 requests - a 0.5% error rate is 15 errors, easily noise. Judge with confidence intervals or sequential tests (what Kayenta/Flagger-style analysers do), require a minimum sample, and compare canary against a <b>baseline cohort running the old version at the same time</b> (best: a fresh baseline deployment of v1, not the long-running stable one, to remove "warm vs cold" bias). Choose few, meaningful metrics; too many metrics guarantee false alarms.</p>
<p><b>Sticky routing.</b> Per-request random splitting can show one user v1 on one click and v2 on the next. Use consistent hashing on user or session id (as in the runnable example) or a cookie. Be careful with API versions and caches - mixed versions must be compatible on the wire.</p>
<p><b>Data is the hard part.</b> Code rolls back; data does not. Use <b>expand/contract</b>: (1) add new column/table, keep old; (2) deploy code writing both; (3) backfill; (4) switch reads; (5) later drop the old. Never ship a destructive migration in the same release as the code that needs it. Message formats (Kafka events) need backward/forward-compatible schemas, since v1 and v2 consumers/producers coexist.</p>
<p><b>Cost and capacity.</b> Blue-green holds roughly 2x capacity; cloud autoscaling and short windows make it cheap, but stateful systems (large DBs, caches that must be warm) are harder - warm the green caches before the flip or you will take a latency hit. Canary needs capacity for the extra version only. <b>Progressive delivery</b> controllers (Argo Rollouts, Flagger) implement the ladder, analysis and automatic rollback declaratively; <b>ring deployments</b> go internal → one region → all regions. Always keep a <b>manual abort button</b> and an on-call who knows it.</p>`,
    aiEra: `<p>🤖 <b>What AI changes.</b> More code ships faster (including AI-written code), so safe release machinery matters more. AI-assisted analysis can compare canary and baseline metrics, summarise "what changed in the last hour", and suggest a rollback. For AI features themselves (a new prompt, model or retrieval change), canary and shadow traffic are standard: send 5% to the new model, compare quality scores, cost and latency before widening.</p>
<p><b>Use AI as a partner:</b> <code>Design a canary plan for this service: traffic steps, hold times, the metrics to compare with thresholds, and the abort conditions. Assume 200 RPS and a 0.3% baseline error rate.</code> Then sanity-check sample sizes yourself.</p>
<p><b>Where AI goes wrong:</b> ignores statistical significance, promotes on "looks fine", forgets data-migration compatibility, picks thresholds with no basis, or suggests blue-green for a stateful DB schema change as if it solved it.</p>
<p><b>What you must still own:</b> the abort criteria (agreed <i>before</i> the release), the blast-radius decision, and the on-call process. Do not let an autonomous agent promote to 100% without hard automated gates and a human-visible audit trail; non-deterministic AI changes (prompts, models) need evaluation metrics, not only error rates.</p>`,
    problems: [{
      title: 'Run a Canary 5% → 50% → 100% With Rollback Criteria',
      level: 'Medium', tags: ['canary', 'release', 'sre'], companies: ['Netflix', 'Meta'],
      statement: `<p>Your service handles 400 RPS with baseline error rate 0.3% and p95 180 ms. Define a canary plan: steps, hold times, promote conditions and rollback conditions. Then decide for this observation at the 5% step: canary 1,200 requests, error rate 1.9%, p95 190 ms.</p>`,
      constraints: `Rollback must be automatic; consider sample size.`,
      example: `<p>5% of 400 RPS = 20 RPS → 10 minutes = ${H.c('b', '12,000 requests')} (enough). Observation: delta = 1.9 − 0.3 = ${H.c('r', '+1.6 pt')} → above 1.0 pt limit → ${H.c('r', 'ROLLBACK')}.</p>`,
      brute: { why: `<p>Deploy to everyone and watch a dashboard by eye. If errors rise, 100% of users are hit before anyone reacts, and the decision depends on whoever happens to be looking.</p>`, code: { lang: 'text', check: false, code: `kubectl set image deploy/shop-api api=...:v2   # all pods at once, hope` } },
      mcq: { q: 'Canary has only 40 requests so far and looks fine. What do you do?', options: ['Hold: the sample is too small to judge', 'Promote to 100%', 'Roll back'], answer: 0, explain: 'A tiny sample cannot distinguish a real problem from noise; wait for a minimum request count.' },
      hints: [`<p>Compute the requests the canary slice receives during the hold time.</p>`, `<p>Write rules relative to the baseline measured at the same time.</p>`, `<p>Add a minimum-request gate, automate abort, and keep v1 untouched until 100% is reached.</p>`],
      solution: {
        approach: `<p>Plan: 5% for 10 min, 50% for 20 min, then 100% with the old ReplicaSet kept for undo. At each step compare canary with the baseline measured at the same time and require a minimum sample (e.g. 500 requests). Promote only if error delta ≤ 0.5 pt, p95 ≤ 1.2x baseline, no new error types and business KPIs steady. Roll back automatically if error delta &gt; 1.0 pt, p95 &gt; 1.5x baseline, crash loops, or a KPI drop. For the observation: 1,200 requests is enough; error delta +1.6 pt exceeds the limit, so ROLLBACK - set canary weight to 0%, keep v1 serving, and open an investigation with the diff and logs. Impact was limited to about 5% of traffic for one hold window.</p>`,
        code: { lang: 'js', run: true, code: `function decide(b, c, minReq) {\n  if (c.requests < minReq) return 'HOLD';\n  if (c.err - b.err > 1.0 || c.p95 / b.p95 > 1.5) return 'ROLLBACK';\n  if (c.err - b.err > 0.5 || c.p95 / b.p95 > 1.2) return 'HOLD';\n  return 'PROMOTE';\n}\nconsole.log(decide({ err: 0.3, p95: 180 }, { requests: 1200, err: 1.9, p95: 190 }, 500)); // ROLLBACK\nconsole.log(decide({ err: 0.3, p95: 180 }, { requests: 40, err: 0.0, p95: 150 }, 500));   // HOLD` },
        complexity: `<p>O(1) decision per check; the cost is the monitoring and traffic-splitting infrastructure.</p>`,
        followUps: ['How would you handle a business KPI that moves slowly?', 'How do you keep users sticky to one version?']
      }
    }, {
      title: 'Blue-Green and the Database',
      level: 'Hard', tags: ['blue-green', 'migrations', 'design'], companies: ['Stripe', 'Square'],
      statement: `<p>v2 renames the column <code>users.fullname</code> to <code>users.display_name</code>. You use blue-green with one shared database. Explain why a naive release breaks rollback and design the migration.</p>`,
      constraints: `Rollback to blue must stay possible at every step; no downtime.`,
      example: `<p>Naive: run <code>ALTER TABLE ... RENAME COLUMN</code>, flip to green. Rollback to blue → blue reads ${H.c('r', 'fullname')}: <b>column does not exist</b>.</p>`,
      brute: { why: `<p>Rename the column in the same release. After the flip, blue (v1) cannot run against the new schema, so the safety net is gone - and even a brief window with both versions live fails.</p>`, code: { lang: 'sql', check: false, code: `ALTER TABLE users RENAME COLUMN fullname TO display_name;` } },
      mcq: { q: 'Which pattern keeps both versions working?', options: ['Expand/contract in several releases', 'One big migration with the release', 'Stop traffic during migration'], answer: 0, explain: 'Expand first (additive), migrate code and data, contract (remove) only after no old version can run.' },
      hints: [`<p>Both blue and green must work with the schema at every moment.</p>`, `<p>Additive changes are safe; destructive ones are not.</p>`, `<p>Release 1: add column, write both. Backfill. Release 2: read new. Release 3: drop old.</p>`],
      solution: {
        approach: `<p>Use expand/contract over several releases so v1 and v2 always work together. Release A (expand): add nullable <code>display_name</code>; v2 writes both columns and reads <code>fullname</code>. Backfill existing rows in batches (a background job, not one long lock). Release B: v3 reads <code>display_name</code> (falling back to fullname if null) and still writes both. Verify no readers of the old column remain (query logs/metrics). Release C (contract): stop writing the old column, then later drop it. At every step blue-green rollback is safe because the older version still understands the schema. The cost is more releases and temporary duplication, which is the price of zero-downtime and reversibility.</p>`,
        code: { lang: 'sql', check: false, code: `-- Release A (expand): additive and backward compatible
ALTER TABLE users ADD COLUMN display_name TEXT;
-- Backfill in small batches (repeat until 0 rows updated)
UPDATE users SET display_name = fullname WHERE display_name IS NULL AND id BETWEEN 1 AND 10000;
-- Release C (contract), only after no version reads fullname:
-- ALTER TABLE users DROP COLUMN fullname;` },
        complexity: `<p>Three releases instead of one; backfill is O(rows) done in batches to avoid locks.</p>`,
        followUps: ['How do you detect that nothing reads the old column anymore?', 'What changes for Kafka event schemas?']
      }
    }]
  });

  /* ================================================================
     TOPIC 8 — Terraform basics
     ================================================================ */
  topics.push({
    title: 'Infrastructure as Code with Terraform: Plan, Apply, State',
    analogy: `<p>Building a house from <b>blueprints</b> instead of by memory. The blueprint (your <code>.tf</code> files) says "2 bedrooms, 1 kitchen". The <b>inspector's notebook</b> (the <b>state file</b>) records what has actually been built. Before any work, the foreman shows a <b>change list</b> - "add a window, remove nothing" (<code>terraform plan</code>) - and only builds after you say go (<code>terraform apply</code>). If someone secretly knocks down a wall at night, the next plan notices the difference between blueprint and reality (<b>drift</b>) and proposes repairing it.</p>`,
    explain: `<p>🟢 <b>Infrastructure as Code (IaC):</b> instead of clicking in a cloud console (slow, undocumented, impossible to repeat), you describe servers, databases, buckets and networks in text files, keep them in git, review them in pull requests and apply them with a tool. Same files → same infrastructure, in dev, staging and prod. <b>Terraform</b> (and its open-source fork <b>OpenTofu</b>) is the most common tool; it is <b>declarative</b>: you say <i>what</i> you want, not the steps.</p>
<p>🔵 <b>The workflow</b> (memorise these four commands):</p>
${H.table(['Command', 'What it does', 'Safe?'], [
  ['<code>terraform init</code>', 'Download providers (AWS, GCP, ...) and set up the backend for state', 'yes'],
  ['<code>terraform plan</code>', 'Compare config vs state vs real world; print what WOULD change: <span class="c-g">+ create</span>, <span class="c-y">~ update</span>, <span class="c-r">- destroy</span>', 'yes, read-only'],
  ['<code>terraform apply</code>', 'Execute the plan (asks for confirmation) and update the state', 'changes real things'],
  ['<code>terraform destroy</code>', 'Delete everything in this configuration', 'dangerous']
])}
<p><b>Building blocks:</b> <code>provider</code> (plugin that talks to a cloud API), <code>resource</code> (a thing to create), <code>variable</code> (input), <code>output</code> (value to show/share), <code>data</code> (read something that exists), <code>module</code> (reusable bundle), <code>locals</code> (named expressions). Resources refer to each other (<code>aws_s3_bucket.logs.id</code>), which creates a <b>dependency graph</b>; Terraform builds things in a correct order and in parallel where possible.</p>
<p><b>State</b> (<code>terraform.tfstate</code>) maps each resource block to the real object's ID and stores its attributes. It is how Terraform knows "this bucket is mine, update rather than create". Rules: (1) never edit it by hand, (2) never commit it to git (it can contain secrets), (3) in a team, use a <b>remote backend</b> (for example an S3 bucket with versioning and encryption, with state <b>locking</b>) so two people cannot apply at the same time.</p>`,
    clues: ['"manage infrastructure in git / repeatable environments" → IaC, Terraform', '"what will this change do before I run it?" → terraform plan', '"someone changed it in the console" → drift; plan shows it, import/apply fixes it', '"two engineers applied at once and broke state" → remote state with locking', '"state file has database password in it" → protect state: encryption, access control, no git', '"same infra for dev/stage/prod" → modules + variables / workspaces / separate state per env', '"declarative vs imperative" → desired end state vs scripted steps'],
    code: [
      { lang: 'text', title: 'main.tf - a private, encrypted S3 bucket (HCL, no secrets, no credentials)', check: false, code: `terraform {
  required_version = ">= 1.6"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"          # allow 5.x, not 6.0
    }
  }
  # Remote state with locking (bucket + lock table created once, separately)
  backend "s3" {
    bucket         = "example-org-tfstate"
    key            = "shop/prod/terraform.tfstate"
    region         = "eu-west-1"
    dynamodb_table = "example-org-tflock"
    encrypt        = true
  }
}

provider "aws" {
  region = var.region            # credentials come from the environment / assumed role, NEVER from this file
}

variable "region"      { type = string  default = "eu-west-1" }
variable "bucket_name" { type = string }          # must be globally unique

resource "aws_s3_bucket" "assets" {
  bucket = var.bucket_name
  tags   = { app = "shop", env = "prod" }
}

# Safe defaults: nobody can make this bucket public by accident
resource "aws_s3_bucket_public_access_block" "assets" {
  bucket                  = aws_s3_bucket.assets.id    # reference = dependency edge
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "assets" {
  bucket = aws_s3_bucket.assets.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "assets" {
  bucket = aws_s3_bucket.assets.id
  rule {
    apply_server_side_encryption_by_default { sse_algorithm = "AES256" }
  }
}

output "bucket_arn" { value = aws_s3_bucket.assets.arn }` },
      { lang: 'bash', title: 'The daily loop', check: false, code: `terraform init                               # once per checkout / provider change
terraform fmt -check && terraform validate   # style + syntax, run in CI
terraform plan -var="bucket_name=example-org-shop-assets" -out=tfplan   # review the diff!
terraform apply tfplan                       # applies exactly the reviewed plan
terraform state list                         # what Terraform manages
terraform plan                               # run again: "No changes" means state == reality` },
      { lang: 'python', run: true, title: 'A tiny plan engine: diff desired config vs state (runnable)', code: `# Terraform's core idea in 25 lines: compare DESIRED (config) with STATE (what exists).
def plan(desired, state):
    changes = []
    for name, cfg in desired.items():
        if name not in state:
            changes.append(("+ create", name, cfg))
        elif state[name] != cfg:
            diff = {k: (state[name].get(k), cfg.get(k)) for k in cfg if state[name].get(k) != cfg.get(k)}
            changes.append(("~ update", name, diff))
    for name in state:
        if name not in desired:
            changes.append(("- destroy", name, state[name]))
    return changes

def show(title, changes):
    print(title)
    if not changes:
        print("  No changes. Infrastructure matches the configuration.")
    for kind, name, detail in changes:
        print("  %-10s %-28s %s" % (kind, name, detail))

desired = {"aws_s3_bucket.assets": {"versioning": "Enabled", "public": False}}
state = {}
show("1) first plan (empty state)", plan(desired, state))
state = {k: dict(v) for k, v in desired.items()}          # 'apply' copies desired into state
show("2) plan after apply", plan(desired, state))
state["aws_s3_bucket.assets"]["public"] = True            # someone clicked 'make public' in the console
show("3) drift detected", plan(desired, state))
desired["aws_s3_bucket.logs"] = {"versioning": "Suspended", "public": False}
show("4) after adding a logs bucket", plan(desired, state))` }
    ],
    viz: {
      title: 'plan / apply / state, step by step (create, change, drift)',
      gen: function () {
        function tbl(label, cols, rows, hl) { return { type: 'table', label: label, columns: cols, rows: rows, hl: hl || {} }; }
        var C = ['resource', 'setting', 'value'];
        var frames = [];
        frames.push({ narr: '<b>1. Write config.</b> Desired: bucket <code>assets</code>, versioning OFF. Reality: nothing exists. State: empty.', parts: [
          tbl('Config (desired)', C, [['aws_s3_bucket.assets', 'versioning', 'Disabled']]),
          tbl('State (what Terraform knows)', C, []),
          { type: 'text', html: 'Real world: <b>no bucket</b>.' }] });
        frames.push({ narr: '<b>2. terraform plan.</b> Config vs state: the bucket is missing → <span class="c-g">+ create</span>. Nothing has changed yet; plan is read-only.', parts: [
          tbl('Plan output', ['symbol', 'resource', 'change'], [['+', 'aws_s3_bucket.assets', 'will be created']], { 0: 'ok' }),
          { type: 'text', html: 'Plan: <b>1 to add, 0 to change, 0 to destroy.</b>' }] });
        frames.push({ narr: '<b>3. terraform apply.</b> Terraform calls the cloud API, creates the bucket, then <b>records it in the state</b> (with its real ID).', parts: [
          tbl('State after apply', ['resource', 'id', 'versioning'], [['aws_s3_bucket.assets', 'example-org-assets', 'Disabled']], { 0: 'ok' }),
          { type: 'text', html: 'Apply complete! 1 added.' }] });
        frames.push({ narr: '<b>4. plan again → no changes.</b> Config, state and reality agree. This "converged" result is what you want to see on every healthy run.', parts: [
          tbl('Plan output', ['symbol', 'resource', 'change'], [['', '(none)', 'No changes. Infrastructure up-to-date.']], { 0: 'done' })] });
        frames.push({ narr: '<b>5. You edit the config:</b> versioning → Enabled. Plan shows an <span class="c-y">~ in-place update</span> - the bucket is not recreated.', parts: [
          tbl('Plan output', ['symbol', 'resource', 'change'], [['~', 'aws_s3_bucket.assets', 'versioning: "Disabled" → "Enabled"']], { 0: 'cur' })] });
        frames.push({ narr: '<b>6. Drift:</b> a teammate clicks the console and turns versioning back off. Terraform has not been told - state still says Enabled.', parts: [
          tbl('State (stale)', ['resource', 'versioning'], [['aws_s3_bucket.assets', 'Enabled']]),
          { type: 'text', html: 'Real world: versioning <b class="c-r">Disabled</b> (changed outside Terraform).' }] });
        frames.push({ narr: '<b>7. plan refreshes</b> real values, sees the difference and proposes a fix: <span class="c-y">~ update</span> back to Enabled. Apply would restore the intended setting. Process rule: <b>change infra only through code</b>.', parts: [
          tbl('Plan output', ['symbol', 'resource', 'change'], [['~', 'aws_s3_bucket.assets', 'versioning: "Disabled" → "Enabled" (drift repair)']], { 0: 'bad' })] });
        frames.push({ narr: '<b>8. Careful with replacements.</b> Changing an immutable field (like the bucket <b>name</b>) shows <span class="c-r">-/+ destroy and recreate</span> - the data would be lost! Always read the plan for "must be replaced" and "destroy".', parts: [
          tbl('Plan output', ['symbol', 'resource', 'change'], [['-/+', 'aws_s3_bucket.assets', 'bucket: "example-org-assets" → "example-org-shop" (forces replacement)']], { 0: 'bad' }),
          { type: 'text', html: 'Protect critical resources with <code>lifecycle { prevent_destroy = true }</code> and review plans in the PR.' }] });
        return frames;
      }
    },
    examples: [
      { title: 'Terraform an S3 bucket (the minimal workflow)', html: `<p>1) Write <code>main.tf</code> (see code above), 2) export credentials via your normal cloud login or CI role (never in the .tf file), 3) <code>terraform init</code>, 4) <code>plan -out=tfplan</code> and read it, 5) <code>apply tfplan</code>, 6) commit the <code>.tf</code> files and <code>.terraform.lock.hcl</code> (provider version lock), <b>not</b> the state or <code>.terraform/</code>. Then add a <code>.gitignore</code> with <code>*.tfstate*</code>, <code>.terraform/</code> and <code>*.tfvars</code> that hold sensitive values.</p>` },
      { title: 'Variables and secrets', html: `<p>Pass non-secret inputs with <code>-var</code> or <code>terraform.tfvars</code>. For secrets: mark the variable <code>sensitive = true</code> (hides it in output), take values from environment variables like <code>TF_VAR_db_password</code> set by your CI secret store, or - better - have Terraform create the secret in a secrets manager and let the app read it at runtime. Remember: <b>sensitive values still land in the state file</b>, so the state backend must be encrypted and access-controlled.</p>` },
      { title: 'Team workflow: plan in the PR, apply on merge', html: `<p>Standard setup: pull request → CI runs <code>fmt</code>, <code>validate</code>, a security scan (tfsec/Checkov/Trivy config), and <code>plan</code>, posting the plan as a PR comment; reviewers read the diff of <i>infrastructure</i>. Merge to main → pipeline runs <code>apply</code> with the saved plan under a role with only the permissions it needs. Separate state per environment (<code>dev</code>, <code>stage</code>, <code>prod</code>) limits blast radius. Tools like Atlantis, Terraform Cloud/HCP, Spacelift or GitHub Actions automate this.</p>` },
      { title: 'Terraform vs Kubernetes YAML vs Helm', html: `${H.table(['Tool', 'Manages', 'Style'], [['Terraform / OpenTofu', 'Cloud resources: networks, clusters, databases, buckets, IAM, DNS', 'Declarative, state-based, plan/apply'], ['kubectl / Helm / Kustomize', 'Objects inside a cluster: Deployments, Services', 'Declarative; the cluster is the state'], ['Ansible', 'Configuring machines (packages, files)', 'Procedural-ish, agent-less'], ['Pulumi / CDK', 'Same as Terraform but with real programming languages', 'Declarative result, code authoring']])}<p>Common split: Terraform creates the cluster and the cloud pieces; GitOps (Argo CD) deploys apps into it.</p>` }
    ],
    deepDive: `<p>🟣 <b>How plan really works.</b> Terraform (1) reads config and builds a dependency graph, (2) <b>refreshes</b> state by querying the provider for each resource's real attributes, (3) diffs desired vs refreshed state per attribute, the provider schema marking each attribute as updatable in place or <i>force-new</i>, (4) walks the graph with parallelism (default 10), creating dependencies first and destroying in reverse. <code>count</code> and <code>for_each</code> create many instances; prefer <code>for_each</code> with stable keys, because <code>count</code> uses list indexes and removing item 0 shifts and destroys everything after it.</p>
<p><b>State is the dangerous part.</b> Lost state means Terraform will try to create duplicates; corrupt or concurrent writes break things. So: remote backend, versioned bucket, <b>locking</b>, small states split by team/environment/layer (network, data, apps) rather than one monolith, and restricted access because state may hold secrets. Useful commands: <code>state list/show/mv/rm</code>, <code>import</code> (adopt an existing resource; the newer <code>import</code> block is declarative), <code>apply -replace=ADDRESS</code> to force recreation (the older <code>terraform taint</code> is deprecated), and <code>moved</code> blocks to refactor names without destroying.</p>
<p><b>Modules and versions.</b> Modules package conventions (a "secure bucket" module used by all teams); pin their versions. Pin provider versions and commit the lock file. Upgrade deliberately with a plan review. Test with <code>terraform test</code>, plan-only checks, and policy-as-code (OPA/Sentinel) that blocks e.g. public buckets or unencrypted disks.</p>
<p><b>Failure modes.</b> A partially failed apply leaves real resources that the state records only up to the failure point - re-run apply, it converges. Cloud APIs are eventually consistent, causing flaky "not found" right after create. Deleting a resource block deletes the real thing: <b>read every "destroy" in the plan</b>, use <code>prevent_destroy</code> on databases and buckets with data, and keep deletion protection on in the cloud as a second lock. The licence change (BSL) led to the OpenTofu fork; both read the same HCL for most configs.</p>`,
    aiEra: `<p>🤖 <b>What AI changes.</b> Assistants write Terraform quickly and translate a console setup or a diagram into HCL. AI plan reviewers summarise a plan ("this replaces the production database - risky!"), and agents can run plan/apply loops. Policy and drift tools use AI to explain violations.</p>
<p><b>Use AI as a partner:</b> <code>Write Terraform for a private encrypted versioned S3 bucket. Use variables, no hard-coded credentials, and explain every resource. Then list risks if I change the bucket name.</code> Run <code>fmt</code>, <code>validate</code> and <code>plan</code> yourself.</p>
<p><b>Where AI goes wrong:</b> uses outdated syntax (the old inline <code>versioning</code> block on <code>aws_s3_bucket</code>, now separate resources), invents arguments that do not exist, hard-codes access keys "for the example", makes buckets public, forgets the backend and locking, or runs <code>apply -auto-approve</code>.</p>
<p><b>What you must still own:</b> reading the plan - especially anything destroyed or replaced - plus least-privilege credentials, state security, and the approval step. Never give an autonomous agent permission to apply to production unattended; keep a human approval gate and give any AI tool read-only plan permissions by default.</p>`,
    problems: [{
      title: 'Terraform an S3 Bucket Safely',
      level: 'Medium', tags: ['terraform', 'iac', 's3', 'security'], companies: ['HashiCorp', 'Amazon'],
      statement: `<p>Write Terraform for an S3 bucket named from a variable, with versioning, default encryption and public access fully blocked, using a remote state backend with locking. Explain the commands you run and how you keep secrets out.</p>`,
      constraints: `No credentials or secret values in any file; the plan must be reviewed before apply.`,
      example: `<p><code>terraform plan</code> → ${H.c('g', 'Plan: 4 to add, 0 to change, 0 to destroy')} (bucket, public-access-block, versioning, encryption).</p>`,
      brute: { why: `<p>Create the bucket in the console, tick options by hand, and note it in a wiki. It cannot be reviewed, repeated for staging, or audited; settings drift and nobody knows why.</p>`, code: { lang: 'text', check: false, code: `AWS console -> S3 -> Create bucket -> click, click, click` } },
      mcq: { q: 'Where should the state file live for a team?', options: ['Remote encrypted backend with locking', 'In git next to the .tf files', 'On each engineer\'s laptop'], answer: 0, explain: 'Remote state is shared and lockable; git exposes secrets in state; laptops diverge.' },
      hints: [`<p>Terraform needs: provider, resource, variable, backend.</p>`, `<p>Modern AWS provider splits settings into separate resources linked by the bucket id.</p>`, `<p>Credentials come from the environment or an assumed role; never put keys in .tf or tfvars in git.</p>`],
      solution: {
        approach: `<p>Define a provider with only the region, a <code>bucket_name</code> variable, the <code>aws_s3_bucket</code> resource plus separate public-access-block, versioning and server-side-encryption resources that reference the bucket id (which also creates the dependency order). Configure an S3 backend with encryption and state locking (S3 native lock file with <code>use_lockfile</code> in Terraform 1.10+; older setups use a DynamoDB lock table). Authenticate through the environment, an SSO profile or a CI role, so no secret is in code. Run <code>init</code>, <code>fmt</code> and <code>validate</code>, then <code>plan -out=tfplan</code> and read it (expect 4 to add, nothing destroyed), then <code>apply tfplan</code>. A second <code>plan</code> must say no changes. Commit the .tf files and lock file, ignore state and tfvars. In CI, run plan on PRs and apply on merge with a least-privilege role, plus a scanner such as Checkov to flag public buckets.</p>`,
        complexity: `<p>Plan/apply time is dominated by cloud API calls (seconds for four resources); parallelism defaults to 10.</p>`,
        followUps: ['How would you import an existing bucket?', 'What happens if you rename the resource block?']
      }
    }]
  });

  /* ================================================================
     PRACTICE
     ================================================================ */
  function P(o) {
    var p = {
      title: o.title, level: o.level, tags: o.tags, companies: o.companies,
      statement: o.statement, constraints: o.constraints, example: o.example,
      brute: { why: o.brute },
      mcq: { q: o.mcq[0], options: o.mcq[1], answer: o.mcq[2], explain: o.mcq[3] },
      hints: o.hints,
      solution: { approach: o.approach, complexity: o.complexity, followUps: o.followUps }
    };
    if (o.bruteCode) p.brute.code = o.bruteCode;
    if (o.code) p.solution.code = o.code;
    return p;
  }

  practice.push(P({
    title: 'Container or VM?', level: 'Easy', tags: ['containers', 'vm'], companies: ['Amazon', 'Cisco'],
    statement: `<p>For each workload choose container, VM or microVM and give one reason: (a) 40 copies of a stateless REST API, (b) a Windows-only legacy app next to Linux services, (c) running code submitted by anonymous users on a coding site.</p>`,
    constraints: `One sentence of reasoning per workload.`,
    example: `<p>(a) ${H.c('g', 'container')} - fast start, small, easy to scale. (b) ${H.c('y', 'VM')} - needs a different OS kernel. (c) ${H.c('p', 'microVM/VM')} - untrusted code needs strong isolation.</p>`,
    brute: `<p>Put everything in VMs "to be safe". Works, but 40 copies of a full OS waste memory, start slowly and make scaling expensive.</p>`,
    mcq: ['What do containers on the same host share?', ['The host OS kernel', 'A full guest OS each', 'Nothing'], 0, 'Namespaces and cgroups isolate processes, but the kernel is shared, which makes containers light and also less isolated than VMs.'],
    hints: [`<p>Ask first: does this workload need its own kernel or operating system?</p>`, `<p>Ask: do I trust the code running inside?</p>`, `<p>Trusted + many copies = container. Different OS or hostile code = VM or microVM.</p>`],
    approach: `<p>(a) Containers: the API is trusted, stateless and needs fast scaling; containers start in seconds and pack densely on nodes. (b) A VM: a Windows app needs a Windows kernel, and containers share the Linux host kernel, so a VM is the practical boundary. (c) A microVM (Firecracker style) or a hardened sandbox: untrusted code could try to escape a shared-kernel container, so you want a hypervisor boundary while keeping startup fast. In practice Kubernetes nodes are VMs and your containers run inside them, so the two layers combine.</p>`,
    complexity: `<p>Not algorithmic; the trade-off is isolation strength versus density and start time.</p>`,
    followUps: ['What are namespaces and cgroups?', 'Why are Kubernetes nodes usually VMs?']
  }));

  practice.push(P({
    title: 'Reorder the Dockerfile for the Cache', level: 'Easy', tags: ['docker', 'cache'], companies: ['Google', 'Spotify'],
    statement: `<p>Put these steps into the best order for build-cache reuse: <code>COPY src/ ./src/</code>, <code>FROM node:22-alpine</code>, <code>RUN npm ci</code>, <code>COPY package.json package-lock.json ./</code>, <code>CMD ["node","src/index.js"]</code>.</p>`,
    constraints: `Dependencies change rarely; source changes on every commit.`,
    example: `<p>${H.arr(['FROM', 'COPY package*.json', 'RUN npm ci', 'COPY src', 'CMD'], { hl: { 2: 'g' } })}<p>Editing source only invalidates the last two steps.</p>`,
    brute: `<p>Copy the source first and install after: every code edit re-runs <code>npm ci</code>, wasting minutes per build.</p>`,
    mcq: ['Which layer should come LAST among COPY steps?', ['The source code', 'The lockfile', 'The base image'], 0, 'The most frequently changing input goes last so it invalidates as few later layers as possible.'],
    hints: [`<p>Rank the inputs by how often they change.</p>`, `<p>Least frequent first: base image, dependency manifest, install, source.</p>`, `<p>CMD is metadata and does not affect caching; keep it at the end.</p>`],
    approach: `<p>Order: FROM node:22-alpine; COPY package.json package-lock.json ./; RUN npm ci; COPY src/ ./src/; CMD. The dependency layer's cache key only depends on the two manifest files, so changing source code leaves FROM, the manifest COPY and npm ci cached. A change in the lockfile invalidates npm ci and everything after it, which is correct because dependencies really changed. Add a .dockerignore so node_modules and .git do not enter the context.</p>`,
    complexity: `<p>Typical code edit: rebuild time drops from minutes to seconds.</p>`,
    followUps: ['Why does a lockfile (not only package.json) matter?', 'How do CI runners keep the cache?']
  }));

  practice.push(P({
    title: 'Service Has No Endpoints', level: 'Easy', tags: ['kubernetes', 'service', 'debugging'], companies: ['Red Hat', 'IBM'],
    statement: `<p>Clients get "connection refused" through Service <code>orders</code>, but <code>kubectl get pods</code> shows 3 pods Running. <code>kubectl get endpoints orders</code> is empty. List the three most likely causes in order.</p>`,
    constraints: `Give a command to confirm each.`,
    example: `<p>Service selector ${H.c('r', 'app: order')} vs pod label ${H.c('g', 'app: orders')} → no match → no endpoints.</p>`,
    brute: `<p>Restart all pods. If the label or readiness is wrong the new pods will have the same problem.</p>`,
    mcq: ['Pods Running but 0/1 READY. Do they get Service traffic?', ['No - only Ready pods are endpoints', 'Yes - Running is enough', 'Only the first one'], 0, 'Readiness gates membership of the Service endpoint list.'],
    hints: [`<p>The Service builds endpoints from pods that match its selector AND are Ready.</p>`, `<p>Compare <code>kubectl get svc orders -o yaml</code> selector with <code>kubectl get pods --show-labels</code>.</p>`, `<p>Then check that readiness passes and that targetPort is correct.</p>`],
    approach: `<p>1) Selector/label mismatch: compare the Service selector to the pod labels with --show-labels (most common cause, typos like order vs orders). 2) Pods not Ready: READY column 0/1 means the readiness probe fails; describe the pod and check probe events and the app's /readyz. 3) Wrong port: if the targetPort differs from the port the container listens on, endpoints exist but connections are refused; check containerPort, targetPort and a curl from a debug pod. Also check the namespace (the Service selects only pods in its own namespace). Fix the label or probe rather than restarting.</p>`,
    complexity: `<p>Constant: three commands.</p>`,
    followUps: ['What is a headless Service?', 'How does a NetworkPolicy change the picture?']
  }));

  practice.push(P({
    title: 'Liveness or Readiness?', level: 'Easy', tags: ['kubernetes', 'probes'], companies: ['Microsoft'],
    statement: `<p>For each situation say which probe handles it: (a) app is warming a 2 GB cache for 40 s after start, (b) app thread deadlocked, process alive but never answers, (c) JVM takes 90 s to boot, (d) temporary overload: pod should stop receiving traffic for a while but must not be killed.</p>`,
    constraints: `One probe per case: startup, readiness or liveness.`,
    example: `<p>(a) ${H.c('b', 'readiness')} · (b) ${H.c('r', 'liveness')} · (c) ${H.c('p', 'startup')} · (d) ${H.c('b', 'readiness')}.</p>`,
    brute: `<p>Use one <code>/health</code> endpoint for liveness and readiness. Warm-up gets the pod killed, and overload triggers restarts that make things worse.</p>`,
    mcq: ['A failing readiness probe causes...', ['Removal from Service endpoints, no restart', 'Container restart', 'Node reboot'], 0, 'Readiness only controls traffic; liveness controls restarts.'],
    hints: [`<p>Ask: should it be restarted, or should it just stop getting traffic?</p>`, `<p>Slow boot is not a hang: it needs patience once, at start.</p>`, `<p>Liveness must be cheap and not depend on downstream services.</p>`],
    approach: `<p>(a) Readiness: the process is healthy but not yet able to serve fast, so keep it out of the Service until warm. (b) Liveness: only a restart can fix a deadlock, so liveness must fail and trigger it. (c) Startup probe: it allows up to period x failureThreshold for booting before liveness starts, so a slow JVM is not killed. (d) Readiness: report not-ready while overloaded so the load balancer drains it, and recover automatically afterwards. Keep liveness endpoint checks local (no database calls) to avoid cascading restarts.</p>`,
    complexity: `<p>Detection delay = periodSeconds x failureThreshold.</p>`,
    followUps: ['What happens if liveness checks the database?', 'How do probes interact with rolling updates?']
  }));

  practice.push(P({
    title: 'How Many Steps Rebuild?', level: 'Medium', tags: ['docker', 'cache', 'analysis'], companies: ['Uber'],
    statement: `<p>A Dockerfile has 7 steps: 1 FROM, 2 COPY pom.xml, 3 RUN deps (90 s), 4 COPY src, 5 RUN package (30 s), 6 RUN adduser, 7 USER. Case A: you edit a Java file. Case B: you add a dependency to pom.xml. Case C: the base image tag is bumped. For each case, which steps are cache MISS and how many seconds does the build take?</p>`,
    constraints: `Assume all other steps take 0 s; every miss after the first changed step also misses.`,
    example: `<p>Case A: change at step 4 → misses on 4,5,6,7 → ${H.c('g', '30 s')}. Case B: step 2 → misses 2-7 → ${H.c('r', '120 s')}. Case C: step 1 → all 7 miss → ${H.c('r', '120 s')} plus a base-image pull.</p>`,
    brute: `<p>Assume each step is cached independently. Wrong: a cache key includes the parent layer, so one miss cascades through every later step.</p>`,
    mcq: ['After step 4 misses, does step 5 hit?', ['No - its parent layer changed', 'Yes - the command text is the same', 'Depends on timestamps'], 0, 'A layer is keyed by parent layer + instruction + inputs; a new parent means a new key.'],
    hints: [`<p>Find the earliest changed step in each case.</p>`, `<p>Everything from that step to the end misses.</p>`, `<p>Add the durations of the missed steps: 90 and 30.</p>`],
    approach: `<p>Case A: the source edit changes the input of step 4, so steps 4-7 miss; only step 5 is slow: 30 s. Case B: pom.xml changes at step 2, so steps 2-7 miss, including the slow dependency download (90 s) and package (30 s): 120 s. Case C: step 1 changes, so all 7 miss: 120 s plus pulling the new base. The lesson: order instructions by change frequency, and keep rarely-changing slow work early. A runnable simulator (in the lesson) shows the HIT and MISS list for each order.</p>`,
    complexity: `<p>Cost = sum of the durations of all steps from the first changed one.</p>`,
    followUps: ['How would you cache Maven downloads across clean CI runners?', 'What does a BuildKit cache mount change?']
  }));

  practice.push(P({
    title: 'Multi-Stage Dockerfile for a Node API', level: 'Medium', tags: ['docker', 'multi-stage', 'node'], companies: ['PayPal', 'Walmart'],
    statement: `<p>Write a Dockerfile for a TypeScript API (build with <code>npm run build</code> into <code>dist/</code>, run <code>node dist/server.js</code> on 3000). Requirements: multi-stage, only production dependencies at runtime, non-root, cache-friendly, pinned base.</p>`,
    constraints: `No secrets in the image; final image should not contain TypeScript or dev dependencies.`,
    example: `<p>Single stage with dev deps: ${H.c('r', '~1.1 GB')}. Multi-stage: ${H.c('g', '~180 MB')}.</p>`,
    brute: `<p>One stage that installs everything, compiles and runs as root: the image includes the compiler, dev dependencies and source.</p>`,
    bruteCode: { lang: 'text', check: false, code: `FROM node:22\nCOPY . .\nRUN npm install && npm run build\nCMD ["node","dist/server.js"]` },
    mcq: ['How do you get only prod dependencies in the final image?', ['npm ci --omit=dev in the runtime stage (or prune)', 'rm -rf node_modules at the end', 'Use --force'], 0, 'Install production dependencies in the final stage so dev packages never become a layer.'],
    hints: [`<p>Two stages: builder (all deps + compile) and runtime (prod deps + dist).</p>`, `<p>Copy manifests first in both stages for caching.</p>`, `<p>Use the node user, an exec-form CMD, and a .dockerignore.</p>`],
    approach: `<p>Builder stage: node:22-alpine, copy package manifests, npm ci, copy sources, npm run build. Runtime stage: fresh node:22-alpine, copy manifests, npm ci --omit=dev, then COPY --from=builder /app/dist ./dist. Switch to the non-root node user, set NODE_ENV=production, EXPOSE 3000 and use the exec-form CMD so Node receives SIGTERM. The manifest-first order keeps npm ci cached until dependencies change. Add a .dockerignore with node_modules, .git and .env. Verify with docker history and a vulnerability scan.</p>`,
    complexity: `<p>Build time: dependency layers cached; image size roughly 180 MB instead of 1 GB.</p>`,
    code: { lang: 'text', check: false, code: `FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=builder /app/dist ./dist
USER node
EXPOSE 3000
CMD ["node", "dist/server.js"]` },
    followUps: ['How would you add a healthcheck for Docker (not K8s)?', 'Why exec form for CMD?']
  }));

  practice.push(P({
    title: 'Two-Step HPA Calculation', level: 'Medium', tags: ['hpa', 'math', 'kubernetes'], companies: ['Google', 'Twilio'],
    statement: `<p>Deployment starts with 3 pods; HPA target 60% CPU, min 3, max 8. Load generates a total of 360% CPU-demand (spread across pods) in minute 1, 720% in minute 2, then 150% in minute 3. Using desired = ceil(current x metric/target) with a 10% tolerance, give the replica count after each minute (assume changes apply instantly and ignore the scale-down window).</p>`,
    constraints: `Average CPU per pod = total demand / pods.`,
    example: `<p>Minute 1: 360/3 = 120% → ceil(3 x 2) = ${H.c('g', '6')}.</p>`,
    brute: `<p>Add one pod per minute when above target. It would take far too long to catch the spike (3 to 8 in five steps).</p>`,
    mcq: ['At 6 pods and 120% average CPU (target 60%), desired is...', ['12 → clamped to max 8', '6', '7'], 0, 'ceil(6 x 2) = 12, and the HPA never exceeds maxReplicas.'],
    hints: [`<p>Average CPU per pod = total demand divided by the current pod count.</p>`, `<p>Then ratio = avg / 60; desired = ceil(pods x ratio) = ceil(demand / 60).</p>`, `<p>Clamp the result to 3..8 and check the 10% tolerance first.</p>`],
    approach: `<p>Minute 1: avg = 360/3 = 120%; ratio 2; desired = ceil(3 x 2) = 6, within the bounds, so 6 pods. Minute 2: avg = 720/6 = 120%; desired = ceil(6 x 2) = 12, clamped to max 8, so 8 pods (the cap is hit, so users may still see 90% CPU). Minute 3: avg = 150/8 = 18.75%; ratio 0.31; desired = ceil(8 x 0.3125) = 3, which equals min, so 3 pods; real clusters wait the stabilization window (about 5 min) before scaling down. Insight: desired = ceil(total demand / target) independent of the current pod count, which is why the formula converges.</p>`,
    complexity: `<p>O(1) per evaluation.</p>`,
    followUps: ['What if maxReplicas is too low for the load?', 'Why scale down more slowly?']
  }));

  practice.push(P({
    title: 'Design Config and Secrets for a Service', level: 'Medium', tags: ['kubernetes', 'secrets', 'config'], companies: ['Okta', 'Stripe'],
    statement: `<p>The shop-api needs a log level, a payments URL and a database password. Design how each reaches the pod across dev, staging and prod, how the password is rotated, and what must never happen.</p>`,
    constraints: `Same image in all environments; no secret in git or images.`,
    example: `<p>LOG_LEVEL → ConfigMap (${H.c('g', 'plain')}); DB password → Secret via external store (${H.c('r', 'sensitive')}).</p>`,
    brute: `<p>Bake an environment-specific <code>application-prod.properties</code> with the password into the image. Anyone who can pull the image reads the password and every change needs a rebuild.</p>`,
    mcq: ['Are Kubernetes Secrets encrypted by default in etcd?', ['No - base64-encoded only, enable encryption at rest', 'Yes, AES-256 always', 'They are never stored'], 0, 'Base64 is encoding, not encryption; enable KMS encryption at rest and restrict RBAC.'],
    hints: [`<p>Separate plain config from sensitive config.</p>`, `<p>Inject from outside the image: env or mounted files, per-environment objects.</p>`, `<p>Think rotation: who creates the new value and how do pods pick it up?</p>`],
    approach: `<p>Plain settings (log level, payments URL) go in a ConfigMap per environment, injected with envFrom or a mounted file; the image is identical everywhere. The database password lives in an external secrets manager (cloud secret store or Vault) and is synced into a Kubernetes Secret by the External Secrets Operator or mounted via the CSI driver; the Deployment references it with secretKeyRef, so no value appears in git or the image. Enable encryption at rest for etcd, restrict get/list on secrets with RBAC, use separate credentials per environment, and give the app a dedicated DB user with minimal rights. Rotation: create the new credential in the store, let the sync update the Secret, and roll the pods (rollout restart) or reload on file change; support two valid passwords during the switch. Never log secrets, commit them, bake them in images, or paste them into chat or AI tools.</p>`,
    complexity: `<p>Operational design; rotation frequency is set by policy (for example 30-90 days or dynamic short-lived credentials).</p>`,
    followUps: ['What are dynamic database credentials?', 'How does GitOps handle secrets?']
  }));

  practice.push(P({
    title: 'Rolling Update Arithmetic', level: 'Medium', tags: ['kubernetes', 'rolling-update'], companies: ['LinkedIn'],
    statement: `<p>A Deployment has 10 replicas with <code>maxSurge: 25%</code> and <code>maxUnavailable: 25%</code> (the defaults). What are the minimum ready pods and maximum total pods during the update? Then set values for a service that must never lose capacity and has room for 2 extra pods.</p>`,
    constraints: `Surge rounds up, unavailable rounds down.`,
    example: `<p>25% of 10 = 2.5 → surge ${H.c('b', '3')} (up), unavailable ${H.c('b', '2')} (down) → ready ≥ 8, total ≤ 13.</p>`,
    brute: `<p>Use Recreate to be "simple". Everything is down during startup, so users see errors on every release.</p>`,
    mcq: ['What guarantees no capacity loss?', ['maxUnavailable: 0 with maxSurge >= 1', 'maxSurge: 0 with maxUnavailable: 25%', 'Recreate'], 0, 'With zero unavailable the controller can only remove an old pod after a new one is Ready.'],
    hints: [`<p>Convert the percentages to pod counts with the rounding rules.</p>`, `<p>Min ready = replicas − maxUnavailable; max total = replicas + maxSurge.</p>`, `<p>For no loss set unavailable to 0 and surge to the free room.</p>`],
    approach: `<p>25% of 10 is 2.5. maxSurge rounds up to 3, so at most 13 pods exist; maxUnavailable rounds down to 2, so at least 8 pods must stay ready. For a service that must never lose capacity with room for 2 extra pods, set maxSurge: 2 and maxUnavailable: 0: the controller starts 2 new pods, waits for Ready, removes 2 old ones and repeats until 10 new pods run (5 batches). Pair this with readiness probes, graceful shutdown and a PodDisruptionBudget.</p>`,
    complexity: `<p>Rollout duration ≈ ceil(replicas / maxSurge) x time-to-ready.</p>`,
    followUps: ['What does minReadySeconds add?', 'What if the new pods never become Ready?']
  }));

  practice.push(P({
    title: 'Read the Terraform Plan', level: 'Medium', tags: ['terraform', 'plan'], companies: ['HashiCorp', 'Datadog'],
    statement: `<p>A plan shows: <code>+ aws_s3_bucket.logs</code>, <code>~ aws_s3_bucket_versioning.assets (Disabled → Enabled)</code>, and <code>-/+ aws_db_instance.main (must be replaced: identifier changed)</code>. Explain each line and what you do before applying.</p>`,
    constraints: `Treat the database as holding production data.`,
    example: `<p>Summary: ${H.c('g', '1 to add')}, ${H.c('y', '1 to change')}, ${H.c('r', '1 to destroy and recreate')}.</p>`,
    brute: `<p>Run <code>apply -auto-approve</code> because "it is only a small PR". The replacement would delete the production database and create an empty one.</p>`,
    mcq: ['What does -/+ mean in a plan?', ['Destroy then create (replacement)', 'Add then remove a tag', 'No change'], 0, 'The provider cannot change that attribute in place, so the resource is replaced.'],
    hints: [`<p>Symbols: + means create, ~ means update in place, -/+ means replace (destroy then create).</p>`, `<p>Which of the three lines could destroy production data if applied?</p>`, `<p>Stop, find out why the identifier changed, and use a safe path (rename without replacement, snapshot, prevent_destroy).</p>`],
    approach: `<p>The first line creates a new logs bucket (safe). The second updates versioning in place on an existing bucket (safe, no data loss). The third replaces the production database: Terraform will destroy it and create a new empty one because the identifier is a force-new attribute. Do not apply. Revert the identifier change or restructure; if renaming is needed, take a snapshot and restore into the new name, or import the existing instance under the new configuration; add lifecycle prevent_destroy and cloud deletion protection so this cannot happen silently. Have a second person review plans containing -/+ or destroy, and apply the saved plan file only after approval.</p>`,
    complexity: `<p>Review cost is minutes; the cost of missing it is potentially permanent data loss.</p>`,
    followUps: ['How does prevent_destroy behave?', 'How would you import the existing DB?']
  }));

  practice.push(P({
    title: 'Pick the Release Strategy', level: 'Hard', tags: ['release', 'design', 'canary', 'blue-green'], companies: ['Stripe', 'PayPal'],
    statement: `<p>You ship three changes this week: (1) a UI copy change in a stateless web tier, (2) a new payment-authorization algorithm, (3) a database engine major upgrade. Choose a strategy for each (rolling, canary, blue-green, feature flag) and justify.</p>`,
    constraints: `Payments errors cost real money; database cannot be rolled back casually.`,
    example: `<p>(1) ${H.c('g', 'rolling')}; (2) ${H.c('y', 'canary + flag')}; (3) ${H.c('p', 'blue-green style replica cutover')}.</p>`,
    brute: `<p>Use the same rolling update for all three. A flawed payment algorithm reaches 100% of transactions before anyone notices, and a DB upgrade has no clean undo.</p>`,
    mcq: ['Which fits a risky new payment algorithm best?', ['Canary with automatic abort plus a feature flag', 'Recreate', 'Blue-green with no monitoring'], 0, 'Limit the blast radius with a small % and metric gates; the flag allows an instant switch-off.'],
    hints: [`<p>Match risk and reversibility to the strategy.</p>`, `<p>For payments think blast radius and business metrics, not only HTTP errors.</p>`, `<p>For the DB think of a replica running the new engine, validated, then promoted - with the old one kept for fallback.</p>`],
    approach: `<p>(1) Copy change: a plain rolling update with readiness probes; low risk, instantly reversible. (2) Payment algorithm: dark launch behind a feature flag, then canary 1% → 5% → 25% → 100% by consistent user hash, with gates on authorization success rate, decline rate, latency and refunds/chargebacks, an automatic abort, and shadow evaluation before any real traffic if possible. (3) Database upgrade: not a pod rollout. Build a new-version replica (logical replication or managed blue/green), validate with replayed queries and load tests, rehearse the cutover, then switch the writer during a short window while keeping the old cluster and replication in the reverse direction for fallback. Backward-compatible schema and application changes come first. For all three: define abort criteria upfront, keep on-call ready, and record deploy markers on dashboards.</p>`,
    complexity: `<p>Cost grows with risk: extra capacity (blue-green), monitoring effort (canary), rehearsal time (DB).</p>`,
    followUps: ['How would you handle a payment already authorised by the canary when you roll back?', 'How long do you hold each canary step?']
  }));

  practice.push(P({
    title: 'The Restart Storm Post-Mortem', level: 'Hard', tags: ['incident', 'probes', 'sre'], companies: ['Cloudflare', 'Datadog'],
    statement: `<p>At 14:02 the database had 90 seconds of high latency. By 14:05 all 20 API pods were restarting repeatedly and the site was down until 14:40, long after the DB recovered. Logs show liveness failures. Explain the chain of events and list fixes.</p>`,
    constraints: `Name at least five concrete changes.`,
    example: `<p>Liveness <code>/health</code> queried the DB (${H.c('r', 'slow')}) → timeouts → kubelet restarts every pod → cold caches + stampede → readiness fails.</p>`,
    brute: `<p>Blame the database only. Ignoring the amplification means the next DB blip repeats the outage.</p>`,
    mcq: ['What should the liveness probe check?', ['Only that this process is not wedged', 'The database and all downstream services', 'Disk usage of the node'], 0, 'Liveness failures cause restarts; downstream problems must not trigger them.'],
    hints: [`<p>What does a restart fix? A deadlocked process, not a slow database.</p>`, `<p>What happens when 20 pods restart at once with cold caches?</p>`, `<p>Think probes, startup behaviour, retries/backoff, connection pools, PDB, load shedding.</p>`],
    approach: `<p>Chain: the DB slowed; the liveness endpoint called the DB, so its health check timed out; the kubelet killed pods (restart count rose); all pods restarted nearly simultaneously, losing capacity and warm caches; each starting pod then opened new DB connections at once (connection stampede), keeping the DB overloaded; readiness could not pass and the outage outlasted its trigger. Fixes: make liveness local and cheap; keep dependency checks out of liveness and use readiness carefully (or only light checks); add a startupProbe and sensible thresholds; use connection-pool limits, jittered retries and circuit breakers; add a PodDisruptionBudget and slow rollout of restarts; cache and warm-up strategies; load shedding and rate limiting; alerts on restart rate; and a runbook plus a blameless post-mortem with owners. Validate by chaos testing a slow-DB scenario in staging.</p>`,
    complexity: `<p>Recovery time shrinks from a 35-minute cascade to roughly the DB incident length (90 s).</p>`,
    followUps: ['How do circuit breakers interact with readiness?', 'How would you test this failure mode?']
  }));

  practice.push(P({
    title: 'Two Engineers Applied at Once', level: 'Hard', tags: ['terraform', 'state', 'team'], companies: ['HashiCorp', 'Atlassian'],
    statement: `<p>Two engineers ran <code>terraform apply</code> from laptops with local state. Now resources are duplicated and the state does not match reality. Describe recovery and the process that prevents it.</p>`,
    constraints: `No data loss; production keeps running.`,
    example: `<p>Laptop A state: bucket-1. Laptop B state: bucket-1 and bucket-2 (${H.c('r', 'duplicate')}). Neither is the whole truth.</p>`,
    brute: `<p>Delete the state and re-run apply. Terraform no longer knows the existing resources and tries to create all of them again, failing or duplicating.</p>`,
    mcq: ['What prevents concurrent applies?', ['Remote backend with state locking', 'Larger laptops', 'Using -auto-approve'], 0, 'A lock (for example a DynamoDB table or the backend native lock) makes the second apply wait or fail.'],
    hints: [`<p>First freeze changes so nobody applies again.</p>`, `<p>Find the real resources, then reconcile state with <code>import</code> or <code>state rm</code>.</p>`, `<p>The permanent fix is remote state + locking + CI-only applies.</p>`],
    approach: `<p>Recovery: freeze applies and back up every state copy. Inventory real resources (cloud console or CLI, tags). Choose the authoritative configuration, then reconcile: import resources that exist but are missing from state, remove state entries for resources that no longer exist (state rm), and delete true duplicates deliberately (after confirming they hold no data). Run plan repeatedly until it shows no changes. Prevention: move to a remote backend with versioning, encryption and locking; run plan on PRs and apply only from CI with a single serialised pipeline and a least-privilege role; split states per environment and layer; block local applies by removing human write credentials for production; and document the break-glass process.</p>`,
    complexity: `<p>Effort grows with the number of drifted resources; the process change makes recurrence near zero.</p>`,
    followUps: ['What does state locking actually lock?', 'How do you import an existing resource?']
  }));

  practice.push(P({
    title: 'Pipeline and GitOps for 50 Microservices', level: 'Hard', tags: ['ci-cd', 'gitops', 'monorepo', 'design'], companies: ['Shopify', 'Uber'],
    statement: `<p>A company has 50 services in a monorepo, 8 teams and 3 environments on Kubernetes. Design CI/CD and GitOps so each service can ship independently several times a day safely, with fast PR feedback.</p>`,
    constraints: `PR pipeline under 10 minutes; production changes auditable; rollback under 5 minutes.`,
    example: `<p>Change in <code>services/cart/</code> → only ${H.c('g', 'cart')} builds, tests and deploys; the other 49 are untouched.</p>`,
    brute: `<p>Build and test all 50 services on every commit and deploy them together. Pipelines take an hour, any flaky test blocks everyone, and a small change risks the whole system.</p>`,
    mcq: ['How do you avoid rebuilding every service on each commit?', ['Path filters / affected-target detection plus per-service pipelines', 'Build everything nightly only', 'Disable tests'], 0, 'Build only what changed and its dependents, using path filters or a build graph tool.'],
    hints: [`<p>Think change detection: which services does a diff touch?</p>`, `<p>Separate CI (build and publish an image) from CD (a GitOps repo describing desired state).</p>`, `<p>Add progressive delivery, per-env promotion and shared pipeline templates.</p>`],
    approach: `<p>CI: detect affected services from the diff (path filters or a build graph tool such as Bazel/Nx), run build, tests, scans and image build for those only, with remote caches; publish an immutable image tagged with the commit SHA and sign it. Shared pipeline templates give every team the same secure defaults. CD via GitOps: CI opens an automated PR (or commits) to an environments repo changing the image tag for the target environment; Argo CD or Flux reconciles each cluster. Dev deploys on merge, staging after automated smoke tests, production through progressive delivery (Argo Rollouts: canary with metric gates and automatic abort) and optional approval for sensitive services. Every deploy is a git commit, so audit is free and rollback is a revert, which meets the 5-minute target. Add contract tests between services, feature flags to decouple deploy from release, per-team namespaces with RBAC, secrets via an external manager, and DORA metrics dashboards.</p>`,
    complexity: `<p>CI cost scales with the size of the change, not with the number of services.</p>`,
    followUps: ['How do you test changes that span two services?', 'How do you deal with shared libraries?']
  }));

  /* ================================================================
     QUIZ
     ================================================================ */
  quiz.push({ q: 'What do containers on one host share?', options: ['The host operating system kernel', 'A complete guest OS each', 'The same file system, writable', 'Nothing at all'], answer: 0, explain: 'Containers are isolated processes (namespaces + cgroups) on a shared kernel, which is why they are small and start fast.' });
  quiz.push({ q: 'You delete a 500 MB file with <code>RUN rm</code> in a later Dockerfile instruction. The image size...', options: ['Stays about the same - the earlier layer still holds the bytes', 'Shrinks by 500 MB', 'Doubles', 'Becomes zero'], answer: 0, explain: 'Layers are immutable; a later delete only adds a whiteout marker. Download and delete in the same RUN, or use multi-stage.' });
  quiz.push({ q: 'Why copy <code>pom.xml</code> before the source in a Dockerfile?', options: ['So the dependency-download layer stays cached when only code changes', 'Because Maven requires it', 'To make the image smaller by default', 'Docker forbids copying source first'], answer: 0, explain: 'The dependency layer key depends only on the manifest, so code edits do not invalidate it.' });
  quiz.push({ q: 'In a multi-stage build, what usually ends up in the final image?', options: ['Only what you COPY --from the builder stage', 'Everything from every stage', 'The build cache', 'Maven and the JDK'], answer: 0, explain: 'Earlier stages are discarded; the final stage keeps only what you copy into it.' });
  quiz.push({ q: 'A Service has zero endpoints although 3 pods are Running. Which is NOT a likely cause?', options: ['The container image is too large', 'Selector does not match the pod labels', 'Pods are not Ready (readiness failing)', 'Pods are in a different namespace'], answer: 0, explain: 'Image size does not affect endpoints. Endpoints need a selector match and Ready pods in the same namespace.' });
  quiz.push({ q: 'A failing <b>readiness</b> probe causes Kubernetes to...', options: ['Stop sending traffic to the pod, without restarting it', 'Restart the container', 'Delete the node', 'Scale the Deployment'], answer: 0, explain: 'Readiness gates Service membership; liveness triggers restarts.' });
  quiz.push({ q: 'Exit code 137 with reason OOMKilled means...', options: ['The container exceeded its memory limit', 'The app exited normally', 'The image failed to pull', 'The liveness probe timed out'], answer: 0, explain: '137 = 128 + SIGKILL(9); with OOMKilled the kernel killed it for using more memory than its limit.' });
  quiz.push({ q: '5 pods at 90% CPU, target 60%, max 10. The HPA wants...', options: ['8', '6', '10', '5'], answer: 0, explain: 'ceil(5 x 90 / 60) = ceil(7.5) = 8.' });
  quiz.push({ q: 'Which metric requirement is essential for CPU-based HPA percentages?', options: ['CPU requests defined on the containers', 'CPU limits equal to zero', 'A LoadBalancer Service', 'An Ingress'], answer: 0, explain: 'Utilisation is usage divided by the request; with no request, there is no percentage.' });
  quiz.push({ q: 'What best describes blue-green deployment?', options: ['Two environments; switch traffic at once and keep the old one for instant rollback', 'Gradually replacing pods one by one', 'Sending 5% of traffic to the new version', 'Deploying only on weekends'], answer: 0, explain: 'Blue-green flips the router between two full environments; rolling and canary are different strategies.' });
  quiz.push({ q: 'Which is a good canary rollback rule?', options: ['Canary error rate exceeds baseline by more than a set margin with enough requests', 'Rollback whenever someone feels nervous', 'Rollback only after 24 hours', 'Never roll back automatically'], answer: 0, explain: 'Rules should be numeric, compared with a baseline, backed by a minimum sample and automated.' });
  quiz.push({ q: 'What does <code>terraform plan</code> do?', options: ['Shows what would change without changing anything', 'Creates all resources', 'Deletes the state file', 'Formats the code'], answer: 0, explain: 'Plan compares config, state and reality and prints the proposed create/update/destroy actions; apply executes.' });
  quiz.push({ q: 'Where should Terraform state live for a team?', options: ['A remote encrypted backend with locking', 'In the git repository', 'In each laptop home directory', 'Inside the container image'], answer: 0, explain: 'Remote state is shared and locked; state can contain secrets, so it must not be committed.' });
  quiz.push({ q: 'In CI/CD, "build once, deploy many" means...', options: ['Promote the same tested image through environments', 'Rebuild for each environment from source', 'Build only on Fridays', 'Deploy to many regions at once'], answer: 0, explain: 'The artifact that passed staging is exactly what runs in production; only configuration differs.' });

  /* ================================================================
     INTERVIEW
     ================================================================ */
  interview.push({ q: 'What is the difference between a container and a virtual machine?', level: 'B', a: `<p>A VM virtualises hardware: each VM runs its own full guest operating system with its own kernel on top of a hypervisor, so it is heavy (GBs) and boots in tens of seconds to minutes. A container virtualises at the operating-system level: it is an isolated process (using Linux namespaces for what it can see and cgroups for how much CPU and memory it may use) that shares the host kernel, so it is small (tens to hundreds of MB) and starts in about a second. Containers pack more densely and are ideal for packaging and scaling trusted apps; VMs give stronger isolation and can run a different OS, which is why untrusted code often uses VMs or microVMs, and why Kubernetes nodes are typically VMs.</p>`, followUps: ['What is a namespace, and what is a cgroup?', 'Can a container run a different OS than the host?'] });
  interview.push({ q: 'Explain image layers and why they matter.', level: 'B', a: `<p>An image is a stack of read-only layers, one per file-changing Dockerfile instruction, identified by content hashes. A container adds a thin writable layer on top. Layers matter for three reasons: <b>caching</b> (an unchanged instruction with unchanged inputs and parent reuses its layer), <b>sharing</b> (images and containers share identical layers on disk and in registries, so pulls fetch only missing layers) and <b>size</b> (deleting in a later layer does not shrink the image, so you clean up in the same RUN or use multi-stage). The practical consequence: order instructions by change frequency, keep layers lean, and never put secrets in a layer because every layer can be inspected.</p>`, followUps: ['How does copy-on-write affect a running container?', 'What is a digest versus a tag?'] });
  interview.push({ q: 'How would you shrink a 1 GB image and speed up builds?', level: 'I', a: `<p>Start by measuring with <code>docker history</code> to find fat layers. Then: multi-stage build so JDK, Maven and sources stay in the builder and only the jar goes into a JRE-only runtime; choose a small pinned base (JRE alpine, slim or distroless, remembering glibc versus musl); add a .dockerignore; order COPY steps so the dependency manifest comes first and the install layer is cached; combine download-use-delete in one RUN; consider layered jars or jlink; and in CI persist the build cache with a registry or CI cache backend. Verify size, scan results, startup time and cache hit rate before and after. Typical outcome is 5x smaller with faster pulls, so also faster autoscaling.</p>`, followUps: ['When is alpine a bad choice?', 'What does a BuildKit cache mount do?'] });
  interview.push({ q: 'What are the security best practices for a Dockerfile and container?', level: 'I', a: `<p>Run as a non-root user; use a minimal pinned base image and rebuild regularly for patches; scan images in CI and sign them; keep secrets out of the image (use runtime injection or BuildKit secret mounts); use a .dockerignore so .env and .git never enter the context; drop Linux capabilities, use a read-only root file system and no privileged mode; do not install unnecessary tools like curl or a shell in the final image; and set resource limits. In Kubernetes enforce these with securityContext, Pod Security Standards and admission policies, and verify image signatures at admission.</p>`, followUps: ['Why is baking a secret into an image dangerous even if you delete it later?', 'What is a distroless image and what is the trade-off?'] });
  interview.push({ q: 'Explain Pod, ReplicaSet, Deployment, Service and Ingress and how they connect.', level: 'B', a: `<p>A <b>Pod</b> is the smallest deployable unit: one or more containers sharing network and storage, with its own IP; pods are disposable. A <b>ReplicaSet</b> keeps N identical pods running. A <b>Deployment</b> manages ReplicaSets to give declarative rolling updates and rollbacks. A <b>Service</b> gives a stable virtual IP and DNS name and load-balances to the Ready pods whose labels match its selector. An <b>Ingress</b> (or Gateway API) defines HTTP routing from outside the cluster to Services by host and path, with TLS, via an ingress controller. Flow: client → Ingress → Service → Ready pod owned by a ReplicaSet owned by a Deployment.</p>`, followUps: ['When would you use a StatefulSet or DaemonSet?', 'Why do Pod IPs change and how does a Service hide that?'] });
  interview.push({ q: 'A pod is in CrashLoopBackOff. Walk through your debugging.', level: 'I', a: `<p>CrashLoopBackOff means the container keeps exiting and the kubelet restarts it with increasing back-off. I run <code>kubectl describe pod</code> to read the last state, reason, exit code and events; then <code>kubectl logs --previous</code> for the crashed run's output. Exit code 1 usually means an application error (bad config, missing env var or secret, unreachable dependency). 137 with OOMKilled means the memory limit was exceeded. 143 or events about liveness failures mean the probe killed a slow-starting app, which a startupProbe fixes. 126/127 point to a wrong command or missing binary in the image. I also check events for image pull or mount problems, compare config with a working environment, and reproduce locally with <code>docker run</code> using the same image and env. Fix the cause rather than disabling the probe.</p>`, followUps: ['How do you debug a distroless image with no shell?', 'What does the back-off sequence look like?'] });
  interview.push({ q: 'Liveness vs readiness vs startup probes: how do you design them?', level: 'I', a: `<p>Startup probe: protects slow boot; liveness and readiness are disabled until it passes. Readiness: "can I serve now?" - failing removes the pod from Service endpoints without restart; it covers warm-up, temporary overload and (lightly) required dependencies. Liveness: "is this process wedged?" - failing restarts the container, so it must be cheap, local and tolerant, and must never depend on downstream services, otherwise a database blip causes a restart storm. Tune period, timeout and failureThreshold against real p99 behaviour; time-to-detect is period x threshold. Combine with graceful shutdown (SIGTERM handling, preStop delay) so rolling updates do not drop requests.</p>`, followUps: ['What happens if readiness depends on the database?', 'How do probes interact with rolling updates?'] });
  interview.push({ q: 'How does a rolling update work and how do you get zero downtime?', level: 'I', a: `<p>On a pod-template change the Deployment creates a new ReplicaSet and shifts pods gradually within maxSurge (extra pods allowed) and maxUnavailable (missing pods allowed); a new pod counts only when Ready, so a broken version stalls while old pods still serve. For true zero downtime: maxUnavailable 0 (with surge room), correct readiness probes, graceful shutdown with a short preStop sleep because endpoint removal races with SIGTERM, a termination grace period longer than your longest request, PodDisruptionBudgets for node drains, and backward-compatible database changes (expand/contract) since old and new versions run together. The rollout does not auto-rollback; the pipeline checks <code>rollout status</code> and runs <code>rollout undo</code>, or a progressive-delivery controller aborts.</p>`, followUps: ['What does minReadySeconds do?', 'How do you roll back?'] });
  interview.push({ q: 'How does the HPA decide the number of replicas, and what are its limits?', level: 'I', a: `<p>desired = ceil(current replicas x current metric / target metric), clamped to min and max, with a 10% tolerance to avoid flapping. It evaluates every ~15 s from metrics-server or custom/external metrics, scales up quickly and scales down after a stabilization window (default 5 min), and with several metrics takes the maximum. Limits: it needs CPU requests for percentages, reacts after metrics lag plus node provisioning, image pull and app boot, so it cannot catch instant spikes unless you keep headroom or pre-scale; CPU may be the wrong signal for I/O-bound services (use RPS, queue depth, or KEDA); and scaling out can overload downstream resources such as database connections. Pair it with the cluster autoscaler for nodes and a sensible maxReplicas.</p>`, followUps: ['HPA versus VPA versus Cluster Autoscaler?', 'How would you autoscale a Kafka consumer?'] });
  interview.push({ q: 'Design a CI/CD pipeline for a microservice.', level: 'I', a: `<p>PRs: build, unit tests, lint, static analysis, dependency and secret scans, integration tests (Testcontainers), all with caches and parallel jobs; required checks and review on main. Main: build the image once from a multi-stage Dockerfile, tag with the commit SHA, scan, sign and push; update the GitOps repo or deploy to staging; run smoke and contract tests; promote the same artifact to production through a canary with metric-based automatic abort. Secrets come from the CI secret store or OIDC short-lived credentials, scoped per environment; forks get none. Rollback = redeploy the previous SHA or git revert, plus feature flags. Database migrations are backward compatible. Track build duration, flake rate and DORA metrics, and show deploy markers on dashboards.</p>`, followUps: ['How do you deal with flaky tests?', 'Where do manual approvals belong?'] });
  interview.push({ q: 'Compare rolling, blue-green and canary deployments.', level: 'I', a: `<p><b>Rolling</b> replaces instances gradually using existing capacity; simple and built into Kubernetes, but old and new versions mix and there is no precise traffic control. <b>Blue-green</b> runs two full environments and switches the router at once; it gives instant rollback and lets you test the new environment privately, but costs double capacity during release and does not solve shared database changes. <b>Canary</b> sends a small, growing share of real traffic (for example 5%, 50%, 100%) to the new version while comparing metrics to a baseline with pre-agreed abort rules; it has the smallest blast radius but needs traffic splitting and good observability. Often combined with feature flags to separate deploy from release.</p>`, followUps: ['How do you keep a user on one version during a canary?', 'What metrics gate a canary?'] });
  interview.push({ q: 'What is Terraform state and why is it risky?', level: 'I', a: `<p>State is Terraform's record mapping each resource block to the real object (IDs and attributes). Plan compares configuration, refreshed state and reality to decide create, update or destroy. It is risky because losing it makes Terraform forget existing resources and try to recreate them, concurrent writes can corrupt it, and it can contain secrets in plain text. So: use a remote backend (S3 with versioning, encryption and locking, or Terraform Cloud), restrict access, never commit it, never hand-edit it (use <code>state mv/rm</code> and <code>import</code>), split state by environment and layer to limit blast radius, and apply only through CI.</p>`, followUps: ['What is drift and how do you detect it?', 'How do count and for_each differ for state stability?'] });
  interview.push({ q: 'How do you handle secrets across Docker, Kubernetes, CI and Terraform?', level: 'A', a: `<p>The rule is the same everywhere: secrets are injected at runtime from a controlled store, never stored in images, git, logs or AI chats. Docker: BuildKit secret mounts for build-time needs and runtime injection for the app. Kubernetes: Secrets with etcd encryption at rest and tight RBAC, ideally synced from an external manager (Vault or a cloud secret store) with External Secrets or the CSI driver; rotate regularly and reload. CI: platform secret store, per-environment scope, OIDC federation for short-lived cloud credentials, no secrets for forked PRs, masked logs. Terraform: sensitive variables from the environment or a secrets manager, encrypted remote state because state contains values, and least-privilege roles. Add secret scanning in CI and pre-commit hooks, and have a rotation-and-revocation runbook for leaks.</p>`, followUps: ['What do you do the moment a key leaks in git?', 'Why are environment variables a weaker choice than mounted files?'] });
  interview.push({ q: 'Your canary shows slightly higher latency but no errors. What do you do?', level: 'A', a: `<p>First check whether the sample is large enough and whether the comparison is fair: canary against a baseline measured at the same time, with matching traffic mix and warmed caches (JIT warm-up and cold caches make new pods look slow). If the delta is within the pre-agreed band, hold and gather more data instead of promoting or aborting on a hunch. If it exceeds the band (for example p95 above 1.5x baseline), abort automatically and investigate with traces and profiles of the diff. Also look at saturation signals (CPU, GC, connection pool) and business metrics, because a latency regression that grows with load can look harmless at 5% and hurt at 100%. The decision rules should have been written before the release.</p>`, followUps: ['How long should the hold at each step be?', 'How do you separate warm-up effects from a real regression?'] });
  interview.push({ q: 'How do AI tools change the way you work with containers, Kubernetes and IaC, and what are the risks?', level: 'E', a: `<p>Assistants draft Dockerfiles, manifests, pipelines and Terraform, explain logs and events, and propose fixes, which speeds up routine work. The risks are plausible but wrong output: outdated API versions, invented arguments, root containers, :latest tags, hard-coded credentials, public buckets, probes that cause outages. My approach: use AI for drafts and explanations, but validate everything with tooling (lint, validate, plan, dry-run, policy checks, image scans) and read the plan or diff myself; never paste real secrets into prompts; give any agent read-only or least-privilege access by default; keep human approval for production applies and rollbacks; and rely on strong pipeline gates because more AI-generated code means more need for automated verification. Understanding fundamentals is what lets me spot a confident but wrong answer.</p>`, followUps: ['What permissions would you give an AI agent for a cluster?', 'How do you verify an AI-generated Terraform change?'] });

  registerModule({
    id: 'be13',
    title: 'DevOps: Docker, Kubernetes, CI/CD & IaC',
    intro: `<p>Writing the code is half the job; the other half is getting it to run reliably for real users. This module is your tour of the delivery machine: packaging an app into a <b>container image</b>, running many copies on <b>Kubernetes</b>, shipping safely with a <b>CI/CD pipeline</b> and <b>blue-green or canary</b> releases, scaling automatically with the <b>HPA</b>, and describing cloud infrastructure as code with <b>Terraform</b>.</p><p>You will shrink a 1 GB image, fix a Dockerfile that busts the cache, write a Deployment + Service + HPA, debug <code>CrashLoopBackOff</code>, design a pipeline, plan a 5% → 50% → 100% canary with rollback rules and Terraform an S3 bucket. Every topic starts with an analogy, has an animated visualizer and runnable models, and ends with how AI changes the work. It builds on the Spring Boot and microservices modules and prepares you for Cloud, Security and Observability.</p>`,
    goals: [
      'Explain containers vs VMs and how image layers, caching and size work',
      'Write a multi-stage, non-root, cache-friendly Dockerfile and shrink an image',
      'Write a Deployment, Service, Ingress, ConfigMap, Secret reference and HPA, and explain how pods are scheduled',
      'Design liveness, readiness and startup probes and perform zero-downtime rolling updates',
      'Debug CrashLoopBackOff, Pending pods and empty Service endpoints',
      'Design a CI/CD pipeline with build-once promotion, secrets handling and rollback',
      'Run blue-green and canary releases with numeric rollback criteria',
      'Use Terraform plan/apply/state safely, including remote state and drift'
    ],
    prereqs: `Backend modules 1-12 (especially Spring Boot Deep Dive and Microservices Patterns), basic Linux command line, and comfort with YAML. Helpful: Git basics and HTTP.`,
    hours: 14,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
