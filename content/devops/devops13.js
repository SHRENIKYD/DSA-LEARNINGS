(function () {
  var topics = [], practice = [], quiz = [], interview = [];
  var R = String.raw; // raw template: backslashes in shell code stay exactly as typed
  var LAB = 'A local cluster only: <b>kind</b> (Kubernetes in Docker) or <b>minikube</b>, on Linux, macOS or Windows with WSL 2. You need Docker (or Podman) from Cloud &amp; DevOps 8 and <code>kubectl</code>. No cloud account, no cost. All secrets are placeholders such as <code>&lt;DB_PASSWORD&gt;</code>.';
  var SKIP = { skip: 'cluster procedure, verified by reading' };
  function Y(code, title) { return { lang: 'yaml', title: title || 'manifest.yaml', code: code }; }   // parsed as YAML by the validator (multi-document is fine)
  function SH(code, title) { var s = { lang: 'bash', code: code }; if (title) s.title = title; return s; } // bash -n checked
  function PY(code, title) { return { lang: 'python', title: title || 'Python model (tested)', code: code }; }
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
  function esc(s) { return H.esc(String(s)); }

  // ── Small models shared by the visualizers (the Python problem answers are written separately) ──
  var MEMU = { Ki: 1024, Mi: 1048576, Gi: 1073741824, Ti: 1099511627776, K: 1e3, M: 1e6, G: 1e9, T: 1e12 };
  // cpu -> millicores, memory -> bytes; NaN when invalid
  function qty(kind, q) {
    q = String(q).trim();
    if (kind === 'cpu') {
      if (/^\d+m$/.test(q)) return parseInt(q, 10);
      if (/^\d+(\.\d+)?$/.test(q)) return Math.ceil(parseFloat(q) * 1000 - 1e-9);
      return NaN;
    }
    var m = q.match(/^(\d+(?:\.\d+)?)(Ki|Mi|Gi|Ti|K|M|G|T)?$/);
    if (!m) return NaN;
    return Math.ceil(parseFloat(m[1]) * (m[2] ? MEMU[m[2]] : 1) - 1e-6);
  }
  function fmtMem(b) { return b >= 1073741824 ? (b / 1073741824) + 'Gi' : b >= 1048576 ? (b / 1048576) + 'Mi' : b + 'B'; }
  // "app=web,tier=fe" -> {app:'web', tier:'fe'}
  function labelMap(s) {
    var o = {};
    String(s || '').split(',').forEach(function (kv) { kv = kv.trim(); if (!kv) return; var i = kv.indexOf('='); if (i < 1) throw new Error('Labels look like app=web,tier=fe (got "' + kv + '")'); o[kv.slice(0, i).trim()] = kv.slice(i + 1).trim(); });
    return o;
  }
  function selects(sel, labels) {
    var ks = Object.keys(sel);
    if (!ks.length) return false;
    return ks.every(function (k) { return labels.hasOwnProperty(k) && labels[k] === sel[k]; });
  }
  // rolling update: [{old,new}] after each round (simplified: new pods are Ready as soon as they are created)
  function pct(v, n, up) {
    v = String(v).trim();
    if (/^\d+%$/.test(v)) { var p = parseInt(v, 10); return up ? Math.floor((n * p + 99) / 100) : Math.floor(n * p / 100); }
    if (/^\d+$/.test(v)) return parseInt(v, 10);
    return NaN;
  }
  function rolling(n, surgeIn, unavIn) {
    var s = pct(surgeIn, n, true), u = pct(unavIn, n, false);
    if (isNaN(s) || isNaN(u) || n < 1 || (s === 0 && u === 0)) return null;
    var o = n, w = 0, out = [], g = 0;
    while (!(o === 0 && w === n) && g++ < 100) {
      var c = Math.max(0, Math.min(n - w, n + s - o - w));
      w += c;
      var d = Math.max(0, Math.min(o, o + w - (n - u)));
      o -= d;
      out.push({ old: o, neu: w, created: c, deleted: d });
    }
    return { s: s, u: u, steps: out };
  }
  // startup / readiness style probe schedule: first success time or kill time
  function startup(initial, period, failure, boot) {
    if (period < 1 || failure < 1 || initial < 0 || boot < 0) return null;
    var fails = 0, t = initial, rows = [];
    for (var k = 0; k < 500; k++) {
      var ok = t >= boot;
      rows.push([String(t) + 's', ok ? 'success' : 'fail', ok ? 'started' : 'failures ' + (fails + 1) + ' of ' + failure]);
      if (ok) return { verdict: 'started@' + t, rows: rows };
      fails++;
      if (fails >= failure) return { verdict: 'killed@' + t, rows: rows };
      t += period;
    }
    return null;
  }
  function qosOf(list) {
    var any = false, guaranteed = true;
    list.forEach(function (c) {
      var v = c.split(',').map(function (x) { return x.trim(); });
      var cr = v[0], cl = v[1], mr = v[2], ml = v[3];
      var set = function (x) { return x && x !== '-'; };
      if (set(cr) || set(cl) || set(mr) || set(ml)) any = true;
      if (!set(cl) || !set(ml)) { guaranteed = false; return; }
      if (set(cr) && qty('cpu', cr) !== qty('cpu', cl)) guaranteed = false;
      if (set(mr) && qty('memory', mr) !== qty('memory', ml)) guaranteed = false;
    });
    return !any ? 'BestEffort' : guaranteed ? 'Guaranteed' : 'Burstable';
  }

  // ───────────────────────── Topic 1: architecture, local clusters, kubectl basics ─────────────────────────
  topics.push({
    title: 'Cluster architecture, kind or minikube, and your first kubectl commands',
    analogy: `<p>Think of a restaurant. Customers (you) hand an order slip to the <b>front desk</b> (the API server). The desk writes every order in a <b>ledger</b> (etcd). A <b>manager</b> (controllers) keeps checking "does the kitchen match the ledger?". A <b>host</b> (scheduler) picks which cook station gets each new order. Each station has a <b>station lead</b> (kubelet) who makes sure the dish is really cooked. You never walk into the kitchen. You only change the ledger, and the restaurant works to match it.</p>`,
    explain: `<p>Kubernetes (often written K8s) runs your containers across many machines and keeps them running. You do not say "start this container on that machine". You say "I want 3 copies of this app" and Kubernetes keeps making that true. This is called a <b>declarative</b> model with a <b>reconciliation loop</b>: desired state is stored, and controllers keep nudging the real world toward it.</p>
      <p><b>The control plane</b> (the brain) has four main parts:</p>
      <ul>
        <li><b>kube-apiserver</b>: the only door. Every tool, including <code>kubectl</code>, talks to it over HTTPS. It checks who you are, what you may do, and whether the object is valid.</li>
        <li><b>etcd</b>: a small, strongly consistent key-value database. It is the cluster's single source of truth.</li>
        <li><b>kube-scheduler</b>: watches for Pods with no node and picks one that fits (enough CPU and memory, no blocking taint).</li>
        <li><b>kube-controller-manager</b>: runs many loops (Deployment, ReplicaSet, Node, Job...) that create or delete objects until reality matches the spec.</li>
      </ul>
      <p><b>Each worker node</b> runs the <b>kubelet</b> (starts and watches the Pods assigned to its node), a <b>container runtime</b> (containerd or CRI-O, the same engine inside Docker from devops08) and <b>kube-proxy</b> (or an eBPF replacement) that makes Service addresses work.</p>
      <p>${H.table(['Piece', 'Where', 'If it dies'], [
        ['API server', 'control plane', 'kubectl fails; running Pods keep running'],
        ['etcd', 'control plane', 'no changes possible; data loss if no backup'],
        ['scheduler', 'control plane', 'new Pods stay <code>Pending</code>'],
        ['controller manager', 'control plane', 'nothing heals or scales'],
        ['kubelet', 'every node', 'that node goes <code>NotReady</code>; its Pods are rescheduled later']
      ])}</p>
      <p><b>Your lab cluster.</b> <b>kind</b> runs each "node" as a Docker container, so a 3-node cluster costs a few hundred MB of RAM. <b>minikube</b> runs one node in a VM or container and has handy add-ons. Both are free, throw-away and perfect for learning. Cloud services (EKS, AKS, GKE) run the control plane for you, but they cost money even when idle, so this track mentions them only as an optional comparison.</p>
      <p><b>kubectl</b> reads <code>~/.kube/config</code>, which holds clusters, users and <b>contexts</b> (a cluster + user + default namespace). Always check which context you are in before you change anything.</p>`,
    clues: [
      '"declarative", "desired state", "reconciliation loop" → controllers compare spec with status and keep fixing the gap',
      '"what happens when you run kubectl apply?" → API server → validation → etcd → controllers → scheduler → kubelet',
      '"the node is NotReady" → kubelet or the network plugin on that node, not your app',
      '"kubectl works but nothing new starts" → scheduler or controller manager is down or Pods are unschedulable',
      '"I changed prod by mistake" → wrong kubectl context; name contexts clearly and show the context in your prompt',
      '"practice without paying for a cloud" → kind or minikube on your laptop'
    ],
    code: [SH(R`#!/usr/bin/env bash
# Install kubectl, kind and minikube. Pick ONE route for your machine.
set -euo pipefail

# --- macOS or Linux with Homebrew -------------------------------------------
brew install kubectl kind minikube

# --- Linux / WSL 2 without Homebrew (check the releases pages for current versions) ---
KUBECTL_VERSION="$(curl -L -s https://dl.k8s.io/release/stable.txt)"
curl -fsSLO "https://dl.k8s.io/release/$KUBECTL_VERSION/bin/linux/amd64/kubectl"
sudo install -m 0755 kubectl /usr/local/bin/kubectl          # arm64: replace amd64 with arm64

KIND_VERSION=v0.27.0                                         # example: use the newest from github.com/kubernetes-sigs/kind/releases
curl -fsSLo ./kind "https://kind.sigs.k8s.io/dl/$KIND_VERSION/kind-linux-amd64"
sudo install -m 0755 kind /usr/local/bin/kind

curl -fsSLO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
sudo install -m 0755 minikube-linux-amd64 /usr/local/bin/minikube

# --- Check ---------------------------------------------------------------------
docker version --format '{{.Server.Version}}'                # kind needs a running Docker (or Podman)
kubectl version --client
kind version
minikube version`, 'Install the tools'),
      Y(R`# kind-config.yaml: 1 control-plane + 2 workers, with ports 80/443 mapped to your laptop (used by the Ingress lab)
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
  - role: control-plane
    kubeadmConfigPatches:
      - |
        kind: InitConfiguration
        nodeRegistration:
          kubeletExtraArgs:
            node-labels: "ingress-ready=true"
    extraPortMappings:
      - containerPort: 80
        hostPort: 80
        protocol: TCP
      - containerPort: 443
        hostPort: 443
        protocol: TCP
  - role: worker
  - role: worker`, 'kind-config.yaml'),
      SH(R`#!/usr/bin/env bash
set -euo pipefail
kind create cluster --name lab --config kind-config.yaml     # about a minute
# minikube alternative (one node, add -n 3 for three):  minikube start --driver=docker -p lab

kubectl config get-contexts                                  # kind-lab is now the current context
kubectl cluster-info                                         # API server address
kubectl get nodes -o wide                                    # 3 nodes, STATUS Ready
kubectl get pods -A                                          # the control plane itself runs as Pods in kube-system
kubectl api-resources | head -n 20                           # every kind of object this cluster knows
kubectl explain pod.spec.containers.resources                # built-in docs for any field, no browser needed

docker ps --format '{{.Names}}'                              # lab-control-plane, lab-worker, lab-worker2 are just containers

kind delete cluster --name lab                               # throw it away when you are done`, 'Cluster up, look around, tear down')
    ],
    codeTitle: ['Install kubectl, kind, minikube', 'A 3-node kind config', 'First commands'],
    viz: [{
      title: 'What happens when you run kubectl apply -f deploy.yaml',
      gen: function () {
        var nodes = [box('you', 'kubectl', 6, 10, 14), box('api', 'API server', 30, 10, 18), box('etcd', 'etcd', 30, 48, 12), box('cm', 'controllers', 58, 10, 18), box('sch', 'scheduler', 58, 48, 16), box('kl', 'kubelet (node)', 84, 10, 20), box('rt', 'containerd', 84, 48, 18)];
        var edges = [['you', 'api', 'HTTPS'], ['api', 'etcd', 'store'], ['cm', 'api', 'watch'], ['sch', 'api', 'watch'], ['kl', 'api', 'watch'], ['kl', 'rt', 'CRI']];
        var steps = [
          ['you', 'you-api', 'You run <code>kubectl apply -f deploy.yaml</code>. kubectl reads the file and sends it to the <b>API server</b> over HTTPS with your credentials from the kubeconfig.'],
          ['api', 'you-api', 'The API server checks <b>who you are</b> (authentication), <b>what you may do</b> (RBAC) and runs <b>admission</b> checks (defaults, quota, policies). Then it validates the shape of the object.'],
          ['etcd', 'api-etcd', 'The accepted Deployment is written to <b>etcd</b>. Your <code>kubectl</code> call is already finished: you only stored a wish. Nothing is running yet.'],
          ['cm', 'cm-api', 'The Deployment controller is <b>watching</b> the API server. It sees the new Deployment and creates a ReplicaSet; the ReplicaSet controller then creates the Pod objects. Still no containers.'],
          ['sch', 'sch-api', 'The scheduler sees Pods with no node. It filters nodes (enough CPU/memory? taints?) and scores the rest, then writes the chosen node name into each Pod.'],
          ['kl', 'kl-api', 'The kubelet on that node sees "a Pod is assigned to me". It pulls the image, sets up volumes and networking, and asks the runtime to start the containers.'],
          ['rt', 'kl-rt', 'containerd starts the containers. The kubelet reports status back to the API server, which stores it. <code>kubectl get pods</code> now shows <code>Running</code>. Every step was a controller reacting to a change it saw on the API server.']
        ];
        return steps.map(function (s) { return { narr: s[2], parts: [{ type: 'graph', directed: true, height: 60, nodes: nodes, edges: edges, hl: one(s[0], 'cur'), ehl: one(s[1], 'ok') }] }; });
      }
    }],
    examples: [
      { title: 'kubectl get nodes, read line by line', html: `${H.table(['Column', 'Example', 'Meaning'], [
        ['NAME', 'lab-worker', 'node name (a Docker container in kind)'],
        ['STATUS', 'Ready', 'kubelet reports healthy; <code>NotReady</code> means it stopped reporting'],
        ['ROLES', 'control-plane', 'workers show <code>&lt;none&gt;</code>, that is normal'],
        ['VERSION', 'v1.31.x', 'kubelet version; keep nodes within one or two minors of the API server'],
        ['INTERNAL-IP', '172.18.0.3', 'a Docker network address in kind']
      ])}<p>Add <code>-o wide</code> for IPs and runtime, <code>-o yaml</code> for the full object, <code>-w</code> to watch changes live.</p>` },
      { title: 'Wrong context: the classic accident', html: `<p>A teammate runs <code>kubectl delete deployment web</code> and the <b>production</b> site goes down. They thought they were on kind. The current context was <code>prod-eks</code>.</p>
        <p>Habits that prevent it: <code>kubectl config current-context</code> before every change; short context names (<code>kind-lab</code>, <code>prod</code>); a prompt that shows the context (kube-ps1); <code>kubectl --context kind-lab get pods</code> in scripts; separate kubeconfig files via <code>KUBECONFIG</code>; and RBAC that stops developers deleting in prod at all.</p>` },
      { title: 'kind vs minikube vs a cloud cluster', html: `${H.table(['', 'kind', 'minikube', 'EKS / AKS / GKE (optional)'], [
        ['Nodes', 'Docker containers, multi-node is easy', 'one node by default, <code>-n</code> for more', 'real VMs'],
        ['Best for', 'CI, quick throw-away labs, testing manifests', 'add-ons (<code>ingress</code>, <code>metrics-server</code>, <code>dashboard</code>), local LoadBalancer via <code>minikube tunnel</code>', 'real load balancers, IAM, autoscaling'],
        ['LoadBalancer Services', 'stay <code>&lt;pending&gt;</code> unless you add cloud-provider-kind or MetalLB', '<code>minikube tunnel</code> gives them an IP', 'a real cloud load balancer'],
        ['Cost', 'free', 'free', '<span class="c-r">cluster fee plus nodes plus load balancers; delete when done</span>']
      ])}<p>Use cloud clusters only for a short comparison, set a budget alert, and delete the cluster the same day.</p>` }
    ],
    deepDive: `<p>🟣 <b>Everything is an API object.</b> A Pod, a Service, even a Node is a record with <code>apiVersion</code>, <code>kind</code>, <code>metadata</code>, <code>spec</code> (what you want) and <code>status</code> (what is true now, written by the system). Controllers compare spec and status. <code>kubectl explain pod.spec</code> shows every field and <code>kubectl api-resources</code> lists every kind, including CRDs (custom resource definitions) that operators add.</p>
      <p>🟣 <b>Watches, not polling.</b> Components do not ask "anything new?" every second. They open a long-lived <b>watch</b> on the API server and receive change events. etcd keeps a revision number (<code>resourceVersion</code>) so a component can resume a watch. This is why Kubernetes scales: the API server is the hub, and etcd only talks to the API server.</p>
      <p>🟣 <b>Failure behaviour.</b> If the control plane goes down, <b>running Pods keep running</b> because kubelet and the runtime do not need it. What you lose is change: no scaling, no healing, no new deploys. A managed cloud control plane hides this, but self-run clusters need etcd backups (<code>etcdctl snapshot save</code>) and usually 3 or 5 control-plane nodes for quorum.</p>
      <p>🟣 <b>Version skew.</b> Kubernetes ships a minor version every few months and supports roughly the latest three. kubectl may differ from the API server by one minor version. Manifests in this module target 1.29 and newer; old API versions such as <code>extensions/v1beta1</code> Ingress and <code>apps/v1beta1</code> Deployment are removed, so ancient blog posts will fail with "no matches for kind". <code>kubectl explain</code> and <code>kubectl api-versions</code> tell you what your cluster accepts.</p>
      <p>🟣 <b>Production reality.</b> Real clusters add RBAC with least privilege, network policies, a CNI plugin (the thing that gives Pods IPs), a CSI plugin for storage, and a GitOps tool that applies manifests from Git instead of from laptops. Later modules cover those; here you learn the objects they all build on.</p>`,
    aiEra: `<p>🤖 <b>What AI changes.</b> Assistants can write a manifest in seconds, explain an error message, and translate between <code>kubectl</code> flags. Agents and MCP servers can even run <code>kubectl</code> for you. That makes the context and RBAC question more important, not less: an agent with an admin kubeconfig can delete as fast as it can create.</p>
      <p><b>Use AI as a partner:</b> paste <code>kubectl describe</code> output and ask for the likely cause, then verify with one command. Ask it to explain a field, then confirm with <code>kubectl explain</code>.</p>
      <p><b>Where AI goes wrong:</b> it invents fields, mixes API versions from old tutorials, and confidently uses removed APIs. It also defaults to cluster-admin examples. <b>You still own:</b> the target context, least-privilege credentials, and reading what a command will do before it runs. A good habit is <code>kubectl diff -f file.yaml</code> and <code>--dry-run=server</code> before <code>apply</code>.</p>`,
    problems: [P({
      t: 'Stand up a three-node lab and prove the control plane is just Pods', l: 'Easy', tags: ['kind', 'minikube', 'kubectl', 'architecture'], co: ['Amazon', 'Red Hat', 'Infosys'],
      s: `<p>Your team wants everyone to practise on a disposable cluster. Create a 3-node <b>kind</b> cluster named <code>lab</code> (or a 3-node minikube profile), then use only <code>kubectl</code> to answer: which version is the API server, which Pods make up the control plane and on which node do they run, what is the node's internal IP, and what are the current context and namespace? Finally switch to a second throw-away cluster and back without touching the wrong one, then delete both.</p>`,
      ex: `<p><code>kubectl get pods -n kube-system -o wide</code> shows ${H.c('g', 'kube-apiserver-lab-control-plane')}, etcd, scheduler and controller-manager Pods all on <code>lab-control-plane</code>, plus kube-proxy and the CNI on every node. <code>kubectl config current-context</code> prints ${H.c('b', 'kind-lab')}.</p>`,
      bw: `<p>Clicking around a cloud console or installing kubeadm by hand just to learn kubectl. It costs money or an afternoon, and a mistake can hit something real. A disposable local cluster removes both risks.</p>`,
      q: ['After you stop the API server for ten minutes, what happens to Pods already running on workers?', ['They keep running; you just cannot change anything', 'They are all killed at once', 'They move to the control-plane node', 'They stop but keep their IPs'], 0, 'The kubelet and the container runtime keep the containers alive on their own. You lose scheduling, scaling, healing and new deploys until the API server returns.'],
      h: ['<p>Hint 1: kind needs a kind config with one control-plane and two workers.</p>', '<p>Hint 2: control-plane components are static Pods in the <code>kube-system</code> namespace; <code>-o wide</code> shows the node.</p>', '<p>Hint 3: <code>kubectl config get-contexts</code>, <code>use-context</code> and <code>--context</code> pick the cluster; <code>kind delete cluster --name</code> cleans up.</p>'],
      a: `<p>Create the cluster from a config, then ask the API server about itself. Because kind nodes are containers, <code>docker ps</code> shows them too, which proves a node is just an environment where a kubelet runs. Switching clusters is only a change of context; passing <code>--context</code> explicitly on destructive commands removes the chance of hitting the wrong cluster.</p>`,
      code: SH(R`#!/usr/bin/env bash
set -euo pipefail
cat > /tmp/kind-3.yaml <<'YAML'
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
  - role: control-plane
  - role: worker
  - role: worker
YAML
kind create cluster --name lab  --config /tmp/kind-3.yaml
kind create cluster --name lab2                              # second, single-node cluster

kubectl config get-contexts                                  # kind-lab, kind-lab2 (* marks current)
kubectl --context kind-lab version                           # Client and Server versions
kubectl --context kind-lab get nodes -o wide                 # 3 nodes, INTERNAL-IP column
kubectl --context kind-lab get pods -n kube-system -o wide   # apiserver, etcd, scheduler, controller-manager
kubectl config current-context                               # kind-lab2 (the last one created)
kubectl config use-context kind-lab                          # switch back on purpose
kubectl config set-context --current --namespace=default     # pin the default namespace

kind delete cluster --name lab2
kind delete cluster --name lab`),
      cx: `<p>Time: about two minutes and roughly 1.5 GB RAM for three nodes. Cost: zero. Cleanup is one command per cluster.</p>`,
      f: ['How would you do the same with minikube profiles (<code>minikube start -p lab -n 3</code>)?', 'Which of these Pods would be missing on a managed cloud cluster, and why?']
    })]
  });

  // ───────────────────────── Topic 2: Pods, ReplicaSets, Deployments ─────────────────────────
  topics.push({
    title: 'Pods, ReplicaSets and Deployments (rolling updates and rollbacks)',
    analogy: `<p>A <b>Pod</b> is one rented food stall: one or more cooks (containers) sharing one counter, one address and one fridge. A <b>ReplicaSet</b> is a supervisor with a single rule: "always keep exactly 3 identical stalls open". A <b>Deployment</b> is the head office: when the menu changes, it opens new stalls with the new menu a few at a time, closes old ones only when the new ones are serving, and keeps the old supervisor's notes so it can go back.</p>`,
    explain: `<p><b>Pod</b> = the smallest thing Kubernetes runs. It holds one or more containers that share a network namespace (one IP, they talk over <code>localhost</code>) and volumes. Most Pods have one app container; extra "sidecar" containers handle logging or proxying. Pods are <b>mortal</b>: when one dies or its node dies, it is not repaired, it is replaced by a new Pod with a new name and a new IP.</p>
      <p>So you almost never create bare Pods. You create a <b>controller</b> that owns Pods:</p>
      <ul>
        <li><b>ReplicaSet</b>: keeps N Pods matching a label selector alive.</li>
        <li><b>Deployment</b>: manages ReplicaSets for you. Each change to the Pod template (new image, new env) makes a <b>new ReplicaSet</b>, and the Deployment moves Pods from the old one to the new one gradually. That is the <b>rolling update</b>.</li>
      </ul>
      <p>Two numbers control the speed:</p>
      <p>${H.table(['Setting', 'Default', 'Plain meaning'], [
        ['<code>maxSurge</code>', '25%', 'how many <b>extra</b> Pods above the desired count may exist during the update (rounded up)'],
        ['<code>maxUnavailable</code>', '25%', 'how many Pods may be <b>missing</b> from the ready count (rounded down)']
      ])}</p>
      <p>With 3 replicas and the defaults, surge is 1 and unavailable is 0. Kubernetes starts one new Pod, waits until it is <b>Ready</b>, removes an old one, and repeats. If the new Pod never becomes Ready, the rollout stops "stuck" while the old Pods keep serving. That is a feature: bad releases do not take you down.</p>
      <p>The <b>selector</b> must match the Pod template's labels, and in <code>apps/v1</code> the selector cannot be changed after creation. Put <code>app: web</code> in both places. The Deployment keeps history, so <code>kubectl rollout undo</code> goes back to the previous ReplicaSet in seconds.</p>`,
    clues: [
      '"zero-downtime deploy" → rolling update with <code>maxUnavailable: 0</code> plus a readiness probe',
      '"deployment stuck at 1/3 updated" or "waiting for rollout to finish: 1 out of 3 new replicas" → new Pods are not becoming Ready',
      '"roll back the last release" → <code>kubectl rollout undo deployment/NAME</code>',
      '"why did my Pod get a new IP/name?" → Pods are replaced, not repaired; use a Service for a stable address',
      '"selector does not match template labels" → apply is rejected; the two must agree',
      '"upgrade faster" → raise <code>maxSurge</code>; "need spare capacity" → keep <code>maxUnavailable: 0</code>'
    ],
    code: [Y(R`# web.yaml: a Deployment with 3 replicas and a safe rolling update
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
  labels:
    app: web
spec:
  replicas: 3
  revisionHistoryLimit: 5          # keep 5 old ReplicaSets for rollbacks
  progressDeadlineSeconds: 120     # report "ProgressDeadlineExceeded" if no progress for 2 minutes
  selector:
    matchLabels:
      app: web                     # must match the template labels below
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1                  # at most 4 Pods exist during the update
      maxUnavailable: 0            # never drop below 3 ready Pods
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
        - name: web
          image: ghcr.io/stefanprodan/podinfo:6.7.0
          ports:
            - containerPort: 9898
          readinessProbe:          # a Pod only counts as ready when this passes
            httpGet:
              path: /readyz
              port: 9898
            periodSeconds: 5
          resources:
            requests:
              cpu: 50m
              memory: 64Mi
            limits:
              memory: 128Mi`, 'web.yaml'),
      SH(R`#!/usr/bin/env bash
set -euo pipefail
kubectl apply -f web.yaml
kubectl rollout status deployment/web                        # waits until all 3 are ready
kubectl get deploy,rs,pods -l app=web                        # 1 Deployment, 1 ReplicaSet, 3 Pods

# Roll out a new version and watch it happen
kubectl set image deployment/web web=ghcr.io/stefanprodan/podinfo:6.7.1
kubectl get pods -l app=web -w &                             # background watch; stop it later with: kill %1
kubectl rollout status deployment/web --timeout=120s
kill %1 2>/dev/null || true
kubectl get rs -l app=web                                    # old ReplicaSet scaled to 0, new one at 3

kubectl rollout history deployment/web                       # revisions 1 and 2
kubectl annotate deployment/web kubernetes.io/change-cause="upgrade to 6.7.1" --overwrite
kubectl rollout undo deployment/web                          # back to the previous ReplicaSet
kubectl rollout undo deployment/web --to-revision=1          # or to a specific revision
kubectl rollout restart deployment/web                       # same image, fresh Pods (for example to re-read env vars)
kubectl scale deployment/web --replicas=5                    # imperative; prefer editing the file in real life`, 'Deploy, update, roll back')],
    codeTitle: ['A Deployment with a safe rolling update', 'Rollout workflow'],
    viz: [{
      title: 'Rolling update, round by round (simplified model)',
      input: '3,1,0',
      inputLabel: 'replicas, maxSurge, maxUnavailable (numbers or percentages, e.g. 10,25%,25%)',
      gen: function (input) {
        var w = String(input || '').split(',').map(function (x) { return x.trim(); });
        if (w.length !== 3) throw new Error('Type three values like 3,1,0 or 10,25%,25%');
        var n = parseInt(w[0], 10);
        if (isNaN(n) || n < 1 || n > 12) throw new Error('replicas must be a whole number from 1 to 12');
        var r = rolling(n, w[1], w[2]);
        if (!r) throw new Error('maxSurge and maxUnavailable must be numbers or percentages, and they cannot both be 0 (nothing could ever change)');
        function pods(o, nw, hlNew) {
          var vals = [], hl = {};
          for (var i = 0; i < o; i++) vals.push('v1');
          for (var j = 0; j < nw; j++) { hl[vals.length] = hlNew ? 'ok' : 'win'; vals.push('v2'); }
          return { type: 'array', label: 'Pods (v1 = old ReplicaSet, v2 = new ReplicaSet)', values: vals.length ? vals : ['(none)'], hl: hl };
        }
        var f = [{ narr: 'Start: <b>' + n + '</b> Pods run v1. <code>maxSurge</code> = <b>' + r.s + '</b> extra Pod(s) allowed, <code>maxUnavailable</code> = <b>' + r.u + '</b> Pod(s) may be missing. You change the image to v2, so the Deployment creates a second ReplicaSet.', parts: [pods(n, 0), { type: 'vars', vals: { desired: n, maxSurge: r.s, maxUnavailable: r.u, maxTotal: n + r.s, minReady: n - r.u } }] }];
        var o = n, nw = 0;
        r.steps.forEach(function (s, i) {
          var mid = o + s.created ;
          if (s.created) {
            nw += s.created;
            f.push({ narr: 'Round ' + (i + 1) + ': the new ReplicaSet creates <b>' + s.created + '</b> v2 Pod(s). Total is now ' + (o + nw) + ' (limit ' + (n + r.s) + '). They are started, and a readiness probe must pass before they count.', parts: [pods(o, nw, true), { type: 'vars', vals: { total: o + nw, limit: n + r.s }, hl: { total: 'ok' } }] });
          }
          if (s.deleted) {
            f.push({ narr: 'Now ' + (o + nw) + ' Pods are ready, so the old ReplicaSet may drop <b>' + s.deleted + '</b> v1 Pod(s) without going below ' + (n - r.u) + ' ready. After this round: ' + s.old + ' v1 and ' + s.neu + ' v2.', parts: [pods(s.old, s.neu, false), { type: 'vars', vals: { ready: s.old + s.neu, minReady: n - r.u }, hl: { ready: 'cur' } }] });
          }
          o = s.old; nw = s.neu;
        });
        f.push({ narr: '<b>Done:</b> the old ReplicaSet is at 0 (kept for <code>rollout undo</code>), the new one has ' + n + '. If a v2 Pod had never become ready, the loop would stop at its current round and the remaining v1 Pods would keep serving.', parts: [pods(0, n, false)] });
        return f;
      }
    }],
    examples: [
      { title: 'Stuck at "1 out of 3 new replicas have been updated"', html: `<p>You deploy a new image and <code>kubectl rollout status</code> prints <code>Waiting for deployment "web" rollout to finish: 1 out of 3 new replicas have been updated...</code> and never finishes.</p>
        <p>Read it as: the first new Pod was created, but it never became <b>Ready</b>, so the Deployment refuses to remove old Pods. The old version still serves traffic. Check in this order: <code>kubectl get pods -l app=web</code> (is the new Pod <code>Running</code> but <code>0/1</code>?), <code>kubectl describe pod NEW</code> (probe failures in Events), <code>kubectl logs NEW</code> (app error). If you need to stop the bleeding now: <code>kubectl rollout undo deployment/web</code>.</p>` },
      { title: 'Why a Deployment name has two random parts', html: `<p>A Pod named <code>web-6d8f9c7b5d-x2k4q</code> means: Deployment <code>web</code>, ReplicaSet hash <code>6d8f9c7b5d</code> (a hash of the Pod template), Pod suffix <code>x2k4q</code>. Change the image and the hash changes, which is how you see old and new Pods apart. Change only <code>replicas</code> and the hash stays: scaling is not a rollout.</p>` },
      { title: 'Choosing maxSurge and maxUnavailable', html: `${H.table(['Goal', 'Setting', 'Trade-off'], [
        ['Never lose capacity', '<code>maxUnavailable: 0</code>, <code>maxSurge: 1</code> or <code>25%</code>', 'needs room for the extra Pod(s); slower'],
        ['Fast rollout, spare cluster', '<code>maxSurge: 100%</code>', 'doubles Pods for a moment; may hit quota'],
        ['No spare room at all', '<code>maxSurge: 0</code>, <code>maxUnavailable: 1</code>', 'capacity dips by one while updating'],
        ['Cannot run two versions together', '<code>strategy: Recreate</code>', 'downtime between old and new']
      ])}` }
    ],
    deepDive: `<p>🟣 <b>What a Deployment really stores.</b> The Deployment owns ReplicaSets through <code>ownerReferences</code>. Each ReplicaSet carries the label <code>pod-template-hash</code> so two ReplicaSets with the same app label never fight over Pods. Only changes under <code>spec.template</code> create a new ReplicaSet. History is kept up to <code>revisionHistoryLimit</code> (default 10); set it low to keep <code>kubectl get rs</code> readable.</p>
      <p>🟣 <b>Rolling update algorithm.</b> The controller scales the new ReplicaSet up as far as <code>maxSurge</code> allows, then scales the old one down as far as <code>maxUnavailable</code> allows, using the count of <b>available</b> Pods (ready for at least <code>minReadySeconds</code>). Percentages are converted to whole Pods: surge rounds <b>up</b>, unavailable rounds <b>down</b>. The visualizer above uses a simplified model where new Pods are ready at once; real Pods take as long as their image pull plus probes.</p>
      <p>🟣 <b>progressDeadlineSeconds.</b> If no progress happens for this long (default 600 s), the Deployment gets condition <code>Progressing=False, reason=ProgressDeadlineExceeded</code>. Kubernetes does <b>not</b> roll back by itself. CI pipelines should run <code>kubectl rollout status --timeout</code> and call <code>rollout undo</code> on failure, or let a tool such as Argo Rollouts or Flagger do canary analysis.</p>
      <p>🟣 <b>Graceful shutdown.</b> To remove a Pod, Kubernetes sets a deletion timestamp, removes it from Service endpoints, sends <code>SIGTERM</code> and waits <code>terminationGracePeriodSeconds</code> (default 30) before <code>SIGKILL</code>. Endpoint removal and SIGTERM happen in parallel, so a few requests can still arrive after SIGTERM. Good apps handle SIGTERM (PID 1 rules from devops08) and sometimes use a short <code>preStop</code> sleep. Without this, "zero-downtime" deploys still drop requests.</p>
      <p>🟣 <b>Other controllers.</b> StatefulSet (stable names and disks), DaemonSet (one Pod per node), Job and CronJob (run to completion). They share the same idea: a controller keeps reality equal to a spec. Use a Deployment for stateless web services.</p>`,
    aiEra: `<p>🤖 <b>What AI changes.</b> AI is great at drafting a Deployment, converting a <code>docker run</code> command into a manifest, and explaining a rollout message. It can also review a diff and warn "you removed the readiness probe".</p>
      <p><b>Use AI as a partner:</b> give it your <code>docker run</code> flags and ask for a Deployment, then check that selector and template labels match, the image is pinned to a version, and there are probes and resource requests. Run <code>kubectl apply --dry-run=server</code> to let the real API server validate it.</p>
      <p><b>Where AI goes wrong:</b> it uses <code>image: app:latest</code> (and then wonders why nothing updates), forgets that changing a selector is not allowed, or suggests <code>kubectl delete pod</code> as a "fix" for a bad rollout. <b>You still own:</b> the rollout strategy, the rollback decision, and noticing when a "successful" apply produced Pods that never became Ready.</p>`,
    problems: [P({
      t: 'How many rounds will the rollout take?', l: 'Medium', tags: ['deployment', 'rolling update', 'python', 'maxSurge'], co: ['Google', 'Flipkart', 'Thoughtworks'],
      s: `<p>Before a release, the on-call engineer wants to know how the Deployment will move through the update. Write <code>rolling_steps(replicas, max_surge, max_unavailable)</code> in Python. The two limits are strings: a whole number such as <code>"1"</code> or a percentage such as <code>"25%"</code>. Convert percentages to Pods (surge rounds <b>up</b>, unavailable rounds <b>down</b>). Return one string <code>"old/new"</code> per round, showing the Pod counts after that round.</p>
        <p>Simplified model: all Pods are ready at the start; each round (1) creates <code>c = min(replicas - new, replicas + surge - old - new)</code> new Pods which are ready at once, then (2) deletes <code>d = min(old, old + new - (replicas - unavailable))</code> old Pods (never below zero). Stop when old is 0 and new equals replicas. Return <code>["invalid"]</code> if replicas is below 1, a value cannot be parsed, or both limits resolve to 0 (the rollout could never start). Then write the Deployment strategy that gives zero downtime for 3 replicas.</p>`,
      c: `<p>Python 3 standard library. replicas up to 1000. At most 100 rounds. The model is simplified: real Pods take time to become Ready.</p>`,
      ex: `<p><code>rolling_steps(3, "1", "0")</code> → ${H.c('g', '["2/1", "1/2", "0/3"]')}: create one v2 (4 Pods), remove one v1, repeat. <code>rolling_steps(10, "25%", "25%")</code> → ${H.c('b', '["5/3", "0/8", "0/10"]')}: surge is 3 (25% of 10 rounded up) and unavailable is 2 (rounded down). <code>rolling_steps(1, "0", "0")</code> → ${H.c('r', '["invalid"]')}.</p>`,
      bw: `<p>Always assume "one at a time" and promise a 3-round rollout. The defaults actually depend on percentages, and with 10 replicas the first round replaces 5 Pods at once. Surprises like this are why people check the numbers first.</p>`,
      q: ['With 3 replicas, maxSurge 1 and maxUnavailable 0, what is the most Pods that can exist, and the fewest ready?', ['4 Pods at most, 3 ready at least', '3 Pods at most, 2 ready at least', '4 Pods at most, 2 ready at least', '6 Pods at most, 3 ready at least'], 0, 'Surge adds one extra Pod (3 + 1 = 4). Unavailable 0 means ready never drops below 3.'],
      h: ['<p>Hint 1: first turn both limits into plain Pod counts. Percentages: surge rounds up, unavailable rounds down.</p>', '<p>Hint 2: loop. In each round compute c (create) then d (delete) with the two formulas; update old and new and record the string.</p>', '<p>Hint 3: edge cases: both limits 0, replicas below 1, text that is not a number; stop when old is 0 and new equals replicas.</p>'],
      a: `<p>Rolling updates are a bounded dance between two counters. The upper bound (replicas + surge) limits how many Pods may exist, and the lower bound (replicas - unavailable) limits how many must be ready. Each round fills the room under the upper bound with new Pods, then removes as many old Pods as the lower bound allows. The loop ends when the old ReplicaSet reaches zero. For zero downtime keep <code>maxUnavailable: 0</code> and a working readiness probe, because "ready" is what the lower bound counts.</p>`,
      code: Y(R`apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
spec:
  replicas: 3
  minReadySeconds: 5               # a new Pod must stay ready 5 s before it counts as available
  selector:
    matchLabels:
      app: web
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    metadata:
      labels:
        app: web
    spec:
      terminationGracePeriodSeconds: 30
      containers:
        - name: web
          image: ghcr.io/stefanprodan/podinfo:6.7.1
          ports:
            - containerPort: 9898
          readinessProbe:
            httpGet: { path: /readyz, port: 9898 }
            periodSeconds: 5
          lifecycle:
            preStop:
              exec:
                command: ["sleep", "5"]   # let endpoint removal propagate before SIGTERM is handled
          resources:
            requests: { cpu: 50m, memory: 64Mi }
            limits: { memory: 128Mi }`, 'zero-downtime strategy'),
      alt: [PY(R`def rolling_steps(replicas, max_surge, max_unavailable):
    def resolve(value, round_up):
        value = value.strip()
        if value.endswith("%"):
            pct = int(value[:-1])
            if round_up:
                return (replicas * pct + 99) // 100      # ceil without floats
            return replicas * pct // 100                 # floor
        return int(value)

    try:
        surge = resolve(max_surge, True)
        unavailable = resolve(max_unavailable, False)
    except ValueError:
        return ["invalid"]
    if replicas < 1 or surge < 0 or unavailable < 0 or (surge == 0 and unavailable == 0):
        return ["invalid"]

    old, new = replicas, 0
    steps = []
    while not (old == 0 and new == replicas) and len(steps) < 100:
        create = max(0, min(replicas - new, replicas + surge - old - new))
        new += create                                    # new Pods are ready at once in this model
        delete = max(0, min(old, old + new - (replicas - unavailable)))
        old -= delete
        steps.append(str(old) + "/" + str(new))
    return steps`, 'rolling_steps (tested)')],
      cx: `<p>O(rounds), at most 100 here. In real life the rollout time is roughly rounds x (image pull + startup + readiness delay), which is why fast readiness checks and small images shorten deploys.</p>`,
      f: ['Why does the real controller wait for <code>minReadySeconds</code> before counting a Pod available?', 'What changes if the cluster has no room for the surge Pod? (a Pending Pod and a stalled rollout)'],
      tests: { sig: 'int string string -> string[]', fn: 'rollingSteps', cases: [
        [[3, '1', '0'], ['2/1', '1/2', '0/3']],
        [[3, '25%', '25%'], ['2/1', '1/2', '0/3']],
        [[10, '25%', '25%'], ['5/3', '0/8', '0/10']],
        [[4, '0', '1'], ['3/0', '2/1', '1/2', '0/3', '0/4']],
        [[1, '1', '0'], ['0/1']],
        [[1, '0', '0'], ['invalid']],
        [[5, '100%', '0'], ['0/5']],
        [[6, '2', '2'], ['2/2', '0/6']],
        [[3, '0%', '0%'], ['invalid']],
        [[0, '1', '1'], ['invalid']],
        [[8, '3', '0'], ['5/3', '2/6', '0/8']],
        [[2, '0', '50%'], ['1/0', '0/1', '0/2']],
        [[4, '25%', '0'], ['3/1', '2/2', '1/3', '0/4']],
        [[3, 'x', '1'], ['invalid']]
      ] }
    })]
  });

  // ───────────────────────── Topic 3: Services and Ingress ─────────────────────────
  topics.push({
    title: 'Services and Ingress controllers (stable addresses and HTTP routing)',
    analogy: `<p>Pods are food-truck cooks who come and go, each with a different phone number. A <b>Service</b> is the restaurant's single, permanent phone number: calls go to whichever cooks are on shift and ready. The Service finds them by <b>name tags</b> (labels), not by number. An <b>Ingress</b> is the receptionist at the building's front door: "table bookings go to the left, takeaway orders go to the right", based on the web address and path in the request.</p>`,
    explain: `<p>Pod IPs change every time a Pod is replaced, so nobody should call a Pod directly. A <b>Service</b> gives a group of Pods one stable virtual IP and one DNS name (for example <code>web.default.svc.cluster.local</code>, or just <code>web</code> from the same namespace). It picks its Pods with a <b>label selector</b>, and only Pods that are <b>Ready</b> receive traffic. The list of ready Pod addresses lives in <b>EndpointSlice</b> objects (the older <code>Endpoints</code> object still exists, but is deprecated in newer versions).</p>
      <p>${H.table(['Service type', 'Who can reach it', 'Typical use'], [
        ['<code>ClusterIP</code> (default)', 'only inside the cluster', 'internal APIs, databases'],
        ['<code>NodePort</code>', 'any node IP on a port 30000-32767', 'quick tests, or as the base for a load balancer'],
        ['<code>LoadBalancer</code>', 'an external IP from a cloud (or MetalLB/minikube tunnel)', 'one public service; each one costs a cloud load balancer'],
        ['Headless (<code>clusterIP: None</code>)', 'DNS returns the Pod IPs directly, no virtual IP', 'StatefulSets, clients that do their own balancing'],
        ['<code>ExternalName</code>', 'DNS alias to an outside name', 'point an in-cluster name at an external database']
      ])}</p>
      <p>Public HTTP apps usually need more than one Service type per app. An <b>Ingress</b> is a set of HTTP routing rules (host and path to Service). The rules do nothing alone: you must install an <b>Ingress controller</b> (a Pod that reads the rules and runs a real proxy such as NGINX or Traefik), and set <code>ingressClassName</code> to pick it. One controller and one load balancer can then serve many apps.</p>
      <p>The #1 Service bug: <b>the selector does not match the Pod labels</b>, so the Service has no endpoints and every request fails with "connection refused" or a 503. The second: the <code>targetPort</code> is not the port the app listens on. A third: Pods exist but are not Ready, so they are left out on purpose.</p>
      <p>Note on controllers: the community <b>ingress-nginx</b> project was retired in March 2026 (no more releases or security fixes), and the Kubernetes project is steering people to the <b>Gateway API</b> (the newer, richer successor to Ingress). Ingress still works everywhere and is the interview staple, so learn it; check the status of the controller before using it in production.</p>`,
    clues: [
      '"Service has no endpoints" or "connection refused through the Service" → selector vs Pod labels mismatch, or no Ready Pods',
      '"expose the app outside the cluster" → NodePort for tests, LoadBalancer for one service, Ingress/Gateway for many HTTP apps',
      '"route /api and /web to different services" or "host-based routing" → Ingress rules with <code>pathType</code>',
      '"Ingress created but gives 404 and no address" → no controller installed, or wrong <code>ingressClassName</code>',
      '"stable DNS name per Pod" → headless Service (with a StatefulSet)',
      '"works with port-forward but not through the Service" → wrong <code>targetPort</code> or selector'
    ],
    code: [Y(R`# services.yaml: the same Pods exposed three ways
apiVersion: v1
kind: Service
metadata:
  name: web                      # DNS name: web.<namespace>.svc.cluster.local
spec:
  type: ClusterIP                # default: reachable inside the cluster only
  selector:
    app: web                     # MUST equal the Pod template labels
  ports:
    - name: http
      port: 80                   # port clients use on the Service
      targetPort: 9898           # port the container listens on
---
apiVersion: v1
kind: Service
metadata:
  name: web-nodeport
spec:
  type: NodePort
  selector:
    app: web
  ports:
    - port: 80
      targetPort: 9898
      nodePort: 30080            # optional; omit to get a random port in 30000-32767
---
apiVersion: v1
kind: Service
metadata:
  name: web-headless
spec:
  clusterIP: None                # headless: DNS returns every ready Pod IP
  selector:
    app: web
  ports:
    - port: 9898`, 'services.yaml (ClusterIP, NodePort, headless)'),
      Y(R`# ingress.yaml: networking.k8s.io/v1 with ingressClassName
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: shop
spec:
  ingressClassName: nginx        # which controller owns this rule (kubectl get ingressclass)
  rules:
    - host: shop.localtest.me    # *.localtest.me resolves to 127.0.0.1, handy for kind
      http:
        paths:
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: api
                port:
                  number: 80
          - path: /
            pathType: Prefix
            backend:
              service:
                name: web
                port:
                  number: 80`, 'ingress.yaml'),
      SH(R`#!/usr/bin/env bash
set -euo pipefail
kubectl apply -f services.yaml
kubectl get svc                                              # CLUSTER-IP, TYPE, PORT(S)
kubectl get endpointslices -l kubernetes.io/service-name=web # the Pod IPs behind the Service
kubectl describe svc web | grep -E 'Selector|Endpoints'      # empty Endpoints means a selector or readiness problem

# Call the Service from inside the cluster (a throw-away Pod)
kubectl run tmp --rm -it --restart=Never --image=busybox:1.36 -- wget -qO- http://web.default.svc.cluster.local/healthz

# From your laptop, without any Ingress
kubectl port-forward svc/web 8080:80 &
sleep 2; curl -s localhost:8080/healthz; kill %1

# Ingress on kind: install a controller once (the kind docs maintain this manifest), then wait for it
kubectl apply -f https://kind.sigs.k8s.io/examples/ingress/deploy-ingress-nginx.yaml
kubectl wait --namespace ingress-nginx --for=condition=ready pod --selector=app.kubernetes.io/component=controller --timeout=120s
kubectl apply -f ingress.yaml
curl -s http://shop.localtest.me/api/healthz
# minikube instead:  minikube addons enable ingress   (then use "minikube tunnel" or the printed IP)`, 'Inspect, test, install a controller')],
    codeTitle: ['ClusterIP, NodePort, headless', 'Ingress with two paths', 'Test the chain'],
    viz: [{
      title: 'Which Pods does the Service select?',
      input: 'app=web | web-1:app=web,tier=fe:Ready; web-2:app=web:NotReady; db-1:app=db:Ready; web-3:app=webb:Ready',
      inputLabel: 'selector | name:labels:Ready or NotReady ; ... (labels like k=v,k=v)',
      gen: function (input) {
        var halves = String(input || '').split('|');
        if (halves.length !== 2) throw new Error('Format: app=web | pod-1:app=web:Ready; pod-2:app=db:Ready');
        var sel = labelMap(halves[0]);
        var pods = halves[1].split(';').map(function (s) { return s.trim(); }).filter(Boolean).map(function (s) {
          var p = s.split(':');
          if (p.length !== 3) throw new Error('Each Pod looks like name:app=web:Ready (got "' + s + '")');
          return { name: p[0].trim(), labels: labelMap(p[1]), ready: p[2].trim().toLowerCase() === 'ready' };
        });
        if (!pods.length || pods.length > 10) throw new Error('Give 1 to 10 Pods');
        if (!Object.keys(sel).length) throw new Error('The selector needs at least one label, e.g. app=web (an empty selector selects nothing)');
        var f = [], rows = [], hl = {}, eps = [];
        f.push({ narr: 'The Service selector is <code>' + esc(Object.keys(sel).map(function (k) { return k + '=' + sel[k]; }).join(',')) + '</code>. A Pod matches only if it has <b>every</b> one of these labels with exactly this value (case matters). Extra labels on the Pod are fine.', parts: [{ type: 'table', label: 'Pods in the namespace', columns: ['Pod', 'labels', 'state'], rows: pods.map(function (p) { return [p.name, Object.keys(p.labels).map(function (k) { return k + '=' + p.labels[k]; }).join(', ') || '(none)', p.ready ? 'Ready' : 'NotReady']; }) }] });
        pods.forEach(function (p, i) {
          var m = selects(sel, p.labels), why;
          if (!m) {
            var miss = Object.keys(sel).filter(function (k) { return p.labels[k] !== sel[k]; })[0];
            why = 'label <code>' + esc(miss) + '</code> is ' + (p.labels.hasOwnProperty(miss) ? 'set to <code>' + esc(p.labels[miss]) + '</code>, not <code>' + esc(sel[miss]) + '</code>' : 'missing') + ': <b>not selected</b>.';
          } else if (!p.ready) why = 'labels match, but the Pod is <b>NotReady</b> (readiness probe failing), so the endpoint controller leaves it out until it passes.';
          else { why = 'labels match and the Pod is Ready: its IP is <b>added to the EndpointSlice</b>.'; eps.push(p.name); }
          hl[i] = !m ? 'bad' : (p.ready ? 'ok' : 'cur');
          rows.push([p.name, m ? 'yes' : 'no', p.ready ? 'yes' : 'no', eps.indexOf(p.name) >= 0 ? 'IN' : 'out']);
          f.push({ narr: '<b>' + esc(p.name) + '</b>: ' + why, parts: [{ type: 'table', label: 'selector check', columns: ['Pod', 'labels match', 'ready', 'endpoint'], rows: rows.slice(), hl: Object.assign({}, hl) }] });
        });
        f.push({ narr: eps.length ? '<b>Result:</b> the Service sends traffic to ' + eps.length + ' endpoint(s): <b>' + eps.map(esc).join(', ') + '</b>.' : '<b>Result: no endpoints.</b> Requests to this Service will be refused. Compare <code>kubectl describe svc</code> (Selector) with <code>kubectl get pods --show-labels</code>.', parts: [{ type: 'set', label: 'EndpointSlice', items: eps.length ? eps : ['(empty)'] }] });
        return f;
      }
    }, {
      title: 'A request from the internet to a Pod',
      gen: function () {
        var nodes = [box('u', 'browser', 6, 10, 14), box('lb', 'LoadBalancer / node port', 26, 10, 22), box('ic', 'Ingress controller', 54, 10, 22), box('svc', 'Service web', 54, 48, 18), box('p1', 'Pod web-1', 84, 38, 16), box('p2', 'Pod web-2', 84, 54, 16)];
        var edges = [['u', 'lb', 'HTTP'], ['lb', 'ic'], ['ic', 'svc', 'rule'], ['svc', 'p1'], ['svc', 'p2']];
        var steps = [
          ['u', 'u-lb', 'A user opens <code>http://shop.example.com/</code>. DNS points that name at the cluster\'s entry point.'],
          ['lb', 'u-lb', 'The packet reaches a cloud load balancer (or in kind, a mapped host port) and is forwarded to the Ingress controller Pods through a Service of type LoadBalancer or NodePort.'],
          ['ic', 'lb-ic', 'The controller is a real proxy (NGINX, Traefik...). It reloads its config from <b>Ingress</b> objects and picks the rule matching host <code>shop.example.com</code> and path <code>/</code>.'],
          ['svc', 'ic-svc', 'The rule names Service <code>web</code>. The proxy asks for its endpoints and picks a ready Pod itself, so the Service virtual IP is often skipped here.'],
          ['p1', 'svc-p1', 'The request lands on one ready Pod. Pods that are NotReady were removed from the list, which is how readiness probes protect users.'],
          ['p2', 'svc-p2', 'The next request may go to the other Pod. Replacing Pods during a rollout changes this list but not the Service name, the Ingress rule or the user\'s URL.']
        ];
        return steps.map(function (s) { return { narr: s[2], parts: [{ type: 'graph', directed: true, height: 66, nodes: nodes, edges: edges, hl: one(s[0], 'cur'), ehl: one(s[1], 'ok') }] }; });
      }
    }],
    examples: [
      { title: 'The empty-endpoints hunt', html: `<p>Symptom: <code>curl</code> to the Service hangs or is refused. Steps:</p>
        ${H.table(['Command', 'You see', 'Meaning'], [
          ['<code>kubectl get endpointslices -l kubernetes.io/service-name=web</code>', 'ENDPOINTS <code>&lt;unset&gt;</code>', 'nothing selected or nothing Ready'],
          ['<code>kubectl get svc web -o jsonpath=\'{.spec.selector}\'</code>', '<code>{"app":"web"}</code>', 'what the Service looks for'],
          ['<code>kubectl get pods --show-labels</code>', '<code>app=webapp</code>', 'typo: <code>web</code> vs <code>webapp</code>'],
          ['<code>kubectl get pods</code>', 'READY <code>0/1</code>', 'labels fine, but the readiness probe is failing']
        ])}<p>Fix the label in the Deployment <b>template</b> (not on a single Pod; a hand-edited Pod label disappears on the next rollout).</p>` },
      { title: 'port, targetPort and nodePort', html: `<p>For <code>port: 80, targetPort: 9898, nodePort: 30080</code>: a client inside the cluster calls <code>web:80</code>; Kubernetes forwards to <code>Pod-IP:9898</code>; a client outside calls <code>NODE-IP:30080</code>. If the app listens on 8080 but <code>targetPort</code> says 9898, the Service has endpoints and <b>still</b> refuses connections. You can name the container port (<code>name: http</code>) and use that name in <code>targetPort</code> so the number lives in one place.</p>` },
      { title: 'LoadBalancer on a laptop', html: `<p>On kind a <code>type: LoadBalancer</code> Service stays <code>EXTERNAL-IP &lt;pending&gt;</code> forever, because nothing provisions an address. Options: use NodePort or <code>kubectl port-forward</code> for tests; run <code>cloud-provider-kind</code> (a small helper from the kind project); on minikube run <code>minikube tunnel</code> in another terminal. In a real cloud the same manifest works unchanged but creates a billed load balancer, so delete test Services.</p>` }
    ],
    deepDive: `<p>🟣 <b>How a ClusterIP works.</b> The virtual IP does not belong to any machine. <b>kube-proxy</b> on each node programs iptables or IPVS (or the CNI uses eBPF) so that packets sent to the ClusterIP are rewritten to one of the endpoint Pod IPs. That is why you cannot <code>ping</code> a Service IP (ICMP is not forwarded), but TCP and UDP ports work. DNS (CoreDNS) maps <code>web.default.svc.cluster.local</code> to that IP.</p>
      <p>🟣 <b>EndpointSlices.</b> A Service with thousands of Pods would make one giant Endpoints object, so Kubernetes splits it into slices of up to 100 addresses. The endpoint controller adds a Pod only when it is Ready, which is the quiet link between probes and traffic. <code>publishNotReadyAddresses: true</code> (used by some databases) changes that.</p>
      <p>🟣 <b>Session affinity and external traffic.</b> <code>sessionAffinity: ClientIP</code> pins a client to one Pod. With NodePort or LoadBalancer, <code>externalTrafficPolicy: Local</code> keeps the client source IP and avoids an extra hop, but only nodes that run a Pod answer. Default <code>Cluster</code> spreads traffic but hides the client IP.</p>
      <p>🟣 <b>Ingress details.</b> <code>pathType</code> is <code>Exact</code>, <code>Prefix</code> (matches whole path segments: <code>/api</code> matches <code>/api/x</code> but not <code>/apix</code>) or <code>ImplementationSpecific</code>. TLS is added with <code>spec.tls</code> and a Secret of type <code>kubernetes.io/tls</code>, often issued automatically by cert-manager. Controller-specific behaviour (rewrites, timeouts, body size) lives in annotations, which is why Ingress YAML is not fully portable.</p>
      <p>🟣 <b>Gateway API.</b> It splits the roles: a platform team owns <code>GatewayClass</code> and <code>Gateway</code>, app teams own <code>HTTPRoute</code>. It supports header matching, traffic splitting and TCP/gRPC routes without annotations. Expect new projects to prefer it, and expect interviews to ask how it differs from Ingress.</p>
      <p>🟣 <b>Cost warning.</b> On EKS, AKS or GKE every <code>type: LoadBalancer</code> Service creates a billed load balancer. Ten small apps behind ten load balancers cost far more than ten apps behind one Ingress controller. Never leave test Services running.</p>`,
    aiEra: `<p>🤖 <b>What AI changes.</b> AI can draft Services and Ingress rules, convert annotations between controllers, and walk a failing request hop by hop. Paste <code>kubectl describe svc</code>, <code>get endpointslices</code> and <code>get pods --show-labels</code> together and it will usually spot the mismatch at once.</p>
      <p><b>Use AI as a partner:</b> ask it to list every place a port number appears (container, probe, Service targetPort, Ingress backend) and check they agree.</p>
      <p><b>Where AI goes wrong:</b> it uses removed Ingress APIs (<code>extensions/v1beta1</code>, <code>serviceName:</code> and <code>servicePort:</code> fields) or the old <code>kubernetes.io/ingress.class</code> annotation, forgets <code>pathType</code>, and invents controller annotations. It may also suggest <code>type: LoadBalancer</code> for everything, which is an expensive habit in a cloud. <b>You still own:</b> the exposure decision (what is public at all), TLS, and the bill.</p>`,
    problems: [P({
      t: 'The Service that routes to nobody', l: 'Easy', tags: ['service', 'labels', 'endpoints', 'python'], co: ['Google', 'Red Hat', 'Zalando'],
      s: `<p>Users report 503s after a release. <code>kubectl get endpointslices</code> shows the Service <code>web</code> has no endpoints, yet three Pods are running. First write <code>service_endpoints(selector, pods)</code> in Python: <code>selector</code> is a list of <code>"key=value"</code> strings, <code>pods</code> is a list of <code>"name:labels:state"</code> strings (labels are comma-separated <code>k=v</code>, state is <code>Ready</code> or <code>NotReady</code>). Return the sorted names of Pods that carry <b>all</b> selector labels with exactly equal values <b>and</b> are Ready. An empty selector selects nothing. Then give the kubectl commands that find the bug and the fix.</p>`,
      c: `<p>Python 3 standard library. Matching is case-sensitive. Up to 1000 Pods. Label values contain no ":" or ",".</p>`,
      ex: `<p>Selector <code>["app=web"]</code>; Pods <code>web-1:app=web,tier=fe:Ready</code>, <code>web-2:app=web:NotReady</code>, <code>db-1:app=db:Ready</code> → ${H.c('g', '["web-1"]')}. <code>web-2</code> matches but is not Ready, and <code>db-1</code> does not match. With Pod label <code>app=Web</code> the result is ${H.c('r', '[]')}: case matters.</p>`,
      bw: `<p>Restart the Pods, or scale the Deployment up, hoping the Service "notices". Neither changes the labels, so the Service still selects nothing. Hand-labelling one Pod with <code>kubectl label</code> would work for a minute, then vanish at the next rollout.</p>`,
      q: ['A Service has selector <code>app: web</code>. A Pod has labels <code>app: web, version: v2</code> and READY 0/1. Is it an endpoint?', ['No: labels match, but a NotReady Pod is excluded', 'Yes: extra labels never matter and readiness is ignored', 'No: the Pod must have exactly the same label set', 'Yes, but only if it is the only Pod'], 0, 'Extra Pod labels are fine, but only Ready Pods are listed as endpoints.'],
      h: ['<p>Hint 1: parse each selector item into a (key, value) pair and each Pod into a dict of labels.</p>', '<p>Hint 2: a Pod is selected if every selector pair is present with an equal value.</p>', '<p>Hint 3: then require Ready, return a sorted list, and return an empty list for an empty selector.</p>'],
      a: `<p>The Service controller does nothing clever: it lists Pods in the same namespace and keeps those that have <b>every</b> selector label and are Ready. So debugging is always the same three-way comparison: what the Service selects, what labels the Pods really have, and whether the Pods are Ready. Fix the label in the Deployment template so new Pods are correct, and wait for the rollout.</p>`,
      code: SH(R`#!/usr/bin/env bash
set -euo pipefail
kubectl get svc web -o jsonpath='{.spec.selector}{"\n"}'            # what the Service looks for
kubectl get endpointslices -l kubernetes.io/service-name=web       # ENDPOINTS <unset> = nothing selected
kubectl get pods --show-labels                                     # what the Pods really carry
kubectl get pods -l app=web                                        # try the selector yourself: empty means mismatch

# Fix the template (not a single Pod) and let the Deployment roll out
kubectl patch deployment web --type=merge -p '{"spec":{"template":{"metadata":{"labels":{"app":"web"}}}}}'
kubectl rollout status deployment/web
kubectl get endpointslices -l kubernetes.io/service-name=web       # three addresses now`),
      alt: [PY(R`def service_endpoints(selector, pods):
    wanted = {}
    for item in selector:
        key, _, value = item.partition("=")
        wanted[key] = value
    if not wanted:
        return []                                   # a Service with no selector selects nothing
    result = []
    for pod in pods:
        name, labels_text, state = pod.split(":")
        labels = {}
        for pair in labels_text.split(","):
            if pair:
                k, _, v = pair.partition("=")
                labels[k] = v
        matches = all(k in labels and labels[k] == v for k, v in wanted.items())
        if matches and state == "Ready":
            result.append(name)
    return sorted(result)`, 'service_endpoints (tested)')],
      cx: `<p>O(P x L) for P Pods and L labels: trivial. The controller does this incrementally from watch events, not by scanning all Pods each time.</p>`,
      f: ['What changes if a selector uses <code>matchExpressions</code> in a Deployment (set-based selectors)? Services only support equality maps.', 'Why is a Service with no selector sometimes useful? (you manage EndpointSlices yourself, for example for an external database)'],
      tests: { sig: 'string[] string[] -> string[]', fn: 'serviceEndpoints', cases: [
        [[['app=web'], ['web-1:app=web,tier=fe:Ready', 'web-2:app=web:NotReady', 'db-1:app=db:Ready']], ['web-1']],
        [[['app=web', 'tier=fe'], ['a:app=web:Ready', 'b:app=web,tier=fe:Ready']], ['b']],
        [[[], ['a:app=web:Ready']], []],
        [[['app=web'], ['w1:app=Web:Ready']], []],
        [[['app=web'], ['b:app=web:Ready', 'a:app=web:Ready']], ['a', 'b']],
        [[['app=web'], []], []],
        [[['app=web'], ['w:app=web,app2=x:Ready']], ['w']],
        [[['app=web'], ['w:tier=fe:Ready']], []],
        [[['app=web', 'app=web'], ['w1:app=web:Ready']], ['w1']],
        [[['app=web'], ['w1::Ready']], []],
        [[['app=web', 'env=prod'], ['p1:app=web,env=prod:Ready', 'p2:app=web,env=dev:Ready', 'p3:env=prod,app=web:NotReady']], ['p1']]
      ] }
    })]
  });

  // ───────────────────────── Topic 4: ConfigMaps and Secrets ─────────────────────────
  topics.push({
    title: 'ConfigMaps and Secrets (env vars, mounted files, and keeping secrets safe)',
    analogy: `<p>A container image is a printed recipe book: the same book for dev, test and prod. A <b>ConfigMap</b> is the sticky note on the kitchen wall: "oven at 200, serve in English". A <b>Secret</b> is the key to the safe. Both are kept outside the book, so one image works everywhere. But a sticky note read at the start of a shift (an environment variable) does not change until the next shift. A note pinned on the wall (a mounted file) can be swapped while people work. And a Secret is not a locked safe by default: it is a note in a sealed-looking envelope that anyone with access to the filing cabinet can open.</p>`,
    explain: `<p>Build the image once, configure it per environment. Kubernetes gives you two objects:</p>
      <ul>
        <li><b>ConfigMap</b>: non-sensitive settings (URLs, feature flags, config files).</li>
        <li><b>Secret</b>: sensitive values (passwords, tokens, keys, TLS certificates).</li>
      </ul>
      <p>You can feed either into a Pod in two ways:</p>
      <p>${H.table(['Method', 'How it looks in the app', 'Updates when the object changes?'], [
        ['Environment variable (<code>env</code>, <code>envFrom</code>)', 'normal env var', '<span class="c-r">No.</span> Read once at container start. You need a Pod restart (<code>kubectl rollout restart</code>).'],
        ['Mounted volume', 'a file per key under the mount path', '<span class="c-g">Yes, eventually</span> (about a minute). The app must re-read the file.'],
        ['Volume with <code>subPath</code>', 'one file placed in an existing folder', '<span class="c-r">No.</span> subPath mounts never update.']
      ])}</p>
      <p>This is the most common "my config change did nothing" ticket. Fix it by restarting, or by making the app reload files, or by adding a hash of the config to the Pod template (so Helm or Kustomize roll the Deployment automatically).</p>
      <p><b>Secrets are not encrypted by default.</b> The values are only <b>base64-encoded</b>, which is a text format, not protection: <code>echo c2VjcmV0 | base64 -d</code> prints the value. By default they sit unencrypted in etcd, and anyone who can <code>get secrets</code> in the namespace (or read etcd backups) can read them. What makes Secrets safer in practice:</p>
      <ul>
        <li><b>RBAC</b>: only the right service accounts and people can read Secrets.</li>
        <li><b>Encryption at rest</b>: an API server <code>EncryptionConfiguration</code> (AES, or a cloud KMS provider) encrypts Secrets before they reach etcd.</li>
        <li><b>External secret stores</b>: keep the real value in Vault, AWS Secrets Manager, Azure Key Vault or Google Secret Manager, and let a tool sync or mount it: <b>External Secrets Operator</b> (creates a normal Secret from the store), <b>Secrets Store CSI driver</b> (mounts values as files), or <b>Sealed Secrets</b> (you commit an <i>encrypted</i> object that only the cluster can decrypt, so Git is safe).</li>
        <li>Prefer files over env vars (env vars leak into crash dumps, <code>kubectl describe</code> of the Pod spec, and child processes).</li>
      </ul>
      <p><b>Rule for this track:</b> never put a real secret in a manifest, a repo, an image or a screenshot. Examples here use placeholders such as <code>&lt;DB_PASSWORD&gt;</code>.</p>`,
    clues: [
      '"I changed the ConfigMap but the app still uses the old value" → env vars are fixed at start; restart, or use a mounted volume the app re-reads',
      '"is a Kubernetes Secret encrypted?" → only base64-encoded; enable encryption at rest and tight RBAC',
      '"how do you manage secrets in GitOps?" → Sealed Secrets or External Secrets Operator, never plain Secret YAML in Git',
      '"Pod stuck in CreateContainerConfigError" → a referenced ConfigMap or Secret (or key) does not exist',
      '"config file mounted but the rest of the folder disappeared" → mounting a volume over a directory hides its contents; use <code>subPath</code> for one file (which then never updates)',
      '"same image in dev and prod" → externalize config in ConfigMaps/Secrets'
    ],
    code: [Y(R`# config-demo.yaml: a ConfigMap used as env vars AND as a mounted file
apiVersion: v1
kind: ConfigMap
metadata:
  name: web-config
data:
  LOG_LEVEL: info                       # simple key -> becomes a file named LOG_LEVEL when mounted
  FEATURE_BANNER: "off"                 # quote on/off/yes/no so YAML keeps them as strings
  app.properties: |                     # a whole config file in one key
    greeting=hello
    theme=light
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
spec:
  replicas: 2
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
        - name: web
          image: busybox:1.36
          command: ["sh", "-c", "while true; do echo level=$LOG_LEVEL file=$(cat /etc/web/app.properties | head -n 1); sleep 10; done"]
          env:
            - name: LOG_LEVEL
              valueFrom:
                configMapKeyRef:
                  name: web-config
                  key: LOG_LEVEL
            - name: DB_PASSWORD
              valueFrom:
                secretKeyRef:           # the Secret is created by a command, never committed
                  name: db-creds
                  key: password
                  optional: false       # Pod fails with CreateContainerConfigError if it is missing
          volumeMounts:
            - name: cfg
              mountPath: /etc/web       # a directory with one file per key; updates reach the file in ~1 minute
              readOnly: true
            - name: creds
              mountPath: /etc/secrets
              readOnly: true
          resources:
            requests: { cpu: 10m, memory: 16Mi }
            limits: { memory: 32Mi }
      volumes:
        - name: cfg
          configMap:
            name: web-config
        - name: creds
          secret:
            secretName: db-creds
            defaultMode: 0400           # files readable by the owner only`, 'ConfigMap and Secret as env and as files'),
      SH(R`#!/usr/bin/env bash
set -euo pipefail
# Create the Secret from a value typed into the terminal: it never lands in a file or in shell history.
read -rsp "DB password (not shown): " DB_PASSWORD; echo
kubectl create secret generic db-creds \
  --from-literal=username=app \
  --from-literal=password="$DB_PASSWORD"
unset DB_PASSWORD
# Placeholder form for documentation:  --from-literal=password='<DB_PASSWORD>'   (never paste a real one into a script)

kubectl get secret db-creds -o yaml                            # values appear base64-encoded: only encoded, NOT encrypted
kubectl get secret db-creds -o jsonpath='{.data.username}' | base64 -d; echo   # anyone with "get secret" can decode it

kubectl apply -f config-demo.yaml
kubectl rollout status deployment/web
kubectl logs deploy/web --tail=2                               # level=info file=greeting=hello

# Change the ConfigMap
kubectl patch configmap web-config --type=merge -p '{"data":{"LOG_LEVEL":"debug","app.properties":"greeting=bonjour\ntheme=dark\n"}}'
sleep 75
kubectl exec deploy/web -- cat /etc/web/app.properties         # the MOUNTED file changed (eventually)
kubectl exec deploy/web -- sh -c 'echo $LOG_LEVEL'             # still info: env vars are fixed at container start
kubectl rollout restart deployment/web                         # new Pods read the new env value
kubectl rollout status deployment/web`, 'Create a Secret safely, then watch what updates')],
    codeTitle: ['ConfigMap and Secret used two ways', 'Create, inspect and change'],
    viz: [{
      title: 'Who sees a ConfigMap change? Env var vs mounted file vs subPath',
      input: 'edit; wait; restart; edit; restart',
      inputLabel: 'actions separated by ; (edit = change the ConfigMap, wait = about a minute passes, restart = kubectl rollout restart)',
      gen: function (input) {
        var acts = String(input || '').split(';').map(function (s) { return s.trim().toLowerCase(); }).filter(Boolean);
        if (!acts.length || acts.length > 12) throw new Error('Use 1 to 12 actions from: edit, wait, restart');
        var cm = 1, env = 1, vol = 1, sub = 1, f = [];
        function snap(narr, hl) {
          f.push({ narr: narr, parts: [{ type: 'table', label: 'value each place currently shows (v1, v2...)', columns: ['ConfigMap object', 'env var in the container', 'mounted file', 'subPath file'], rows: [['v' + cm, 'v' + env, 'v' + vol, 'v' + sub]], hl: {} }, { type: 'vars', vals: { configMap: 'v' + cm, env: 'v' + env, volume: 'v' + vol, subPath: 'v' + sub }, hl: hl || {} }] });
        }
        snap('Start: ConfigMap, env var, mounted file and subPath file all show <b>v1</b>. The container read its env var once, when it started.');
        acts.forEach(function (a) {
          if (a === 'edit') { cm++; snap('You edit the ConfigMap to <b>v' + cm + '</b>. Only the stored object changed. Running containers have not been told anything.', { configMap: 'cur' }); }
          else if (a === 'wait') {
            var changed = vol !== cm; vol = cm;
            snap(changed ? 'The kubelet re-syncs mounted ConfigMaps about every minute. The <b>mounted file</b> now shows v' + vol + ' (the app must re-read it). The env var and the subPath file are unchanged.' : 'A minute passes. Nothing new to sync: the mounted file already matches.', changed ? { volume: 'ok' } : {});
          }
          else if (a === 'restart') {
            env = cm; vol = cm; sub = cm;
            snap('<code>kubectl rollout restart</code> replaces the Pods. New containers start fresh: env var, mounted file and even the subPath file now show <b>v' + cm + '</b>.', { env: 'ok', volume: 'ok', subPath: 'ok' });
          }
          else throw new Error('Unknown action "' + a + '" (use edit, wait, restart)');
        });
        snap('<b>Summary:</b> env vars and subPath mounts only change on restart; plain mounted files follow the ConfigMap after a short delay. Immutable ConfigMaps (<code>immutable: true</code>) forbid edits, so you create <code>web-config-v2</code> and roll the Deployment to it.', {});
        return f;
      }
    }],
    examples: [
      { title: 'CreateContainerConfigError', html: `<p><code>kubectl get pods</code> shows <code>CreateContainerConfigError</code>. <code>kubectl describe pod</code> Events say <code>Error: secret "db-creds" not found</code> (or <code>couldn't find key password in Secret</code>). The Pod was scheduled and the image pulled, but the kubelet cannot build the container config.</p>
        <p>Fix: create the Secret in the <b>same namespace</b> (Secrets and ConfigMaps are namespaced), fix the key name, or set <code>optional: true</code> if the value is truly optional. The Pod starts by itself once the object exists.</p>` },
      { title: 'Decode a Secret in one line (and why that matters)', html: `<pre>kubectl get secret db-creds -o jsonpath='{.data.password}' | base64 -d</pre><p>This works for anyone who can <code>get</code> Secrets. So: grant that verb rarely, never to "view all" roles on production namespaces, and remember <code>kubectl get secret -o yaml</code> output pasted into chat or tickets is a leak. If it happened, <b>rotate</b> the value; deleting the message is not enough.</p>` },
      { title: 'Picking a secret strategy', html: `${H.table(['Approach', 'Where the real value lives', 'Good for', 'Watch out'], [
        ['Plain Secret + RBAC + encryption at rest', 'etcd (encrypted)', 'small clusters, learning', 'not in Git; manual rotation'],
        ['Sealed Secrets', 'encrypted object in Git; cluster key decrypts', 'GitOps with few secrets', 'tied to the cluster key; back it up'],
        ['External Secrets Operator', 'cloud or Vault secret store', 'many secrets, rotation, audit', 'still creates a normal Secret in the cluster'],
        ['Secrets Store CSI driver', 'cloud or Vault; mounted as files', 'avoiding K8s Secrets entirely', 'extra driver and provider per cloud']
      ])}` }
    ],
    deepDive: `<p>🟣 <b>How mounted updates work.</b> A ConfigMap volume is a directory of symlinks: <code>app.properties -&gt; ..data/app.properties</code>, and <code>..data</code> is a symlink to a timestamped folder. When the ConfigMap changes, the kubelet writes a new folder and atomically flips the <code>..data</code> symlink. That is why editors that watch single files sometimes miss it, and why <code>subPath</code> (which bind-mounts the file itself) never sees the change. Delay is the kubelet sync period plus cache TTL: usually under two minutes.</p>
      <p>🟣 <b>Limits.</b> A ConfigMap or Secret is limited to 1 MiB by etcd. Use <code>immutable: true</code> for static config: the kubelet stops watching it (less API load) and accidental edits are impossible. Env var names must be valid identifiers; <code>envFrom</code> silently skips invalid key names, which can look like "my variable is missing".</p>
      <p>🟣 <b>Encryption at rest.</b> The API server flag <code>--encryption-provider-config</code> points to an <code>EncryptionConfiguration</code> that lists providers per resource. The first provider encrypts new writes; the others can still read. <code>identity</code> means no encryption. Local keys (<code>aescbc</code>, <code>secretbox</code>) protect against a stolen etcd disk, but the key sits on the control-plane node. A <b>KMS provider</b> (v2) keeps the key in a cloud KMS or HSM and is the better production answer. After enabling it, re-write existing Secrets (<code>kubectl get secrets -A -o json | kubectl replace -f -</code>) so old ones are encrypted too. Managed clusters (EKS, AKS, GKE) offer this as a checkbox.</p>
      <p>🟣 <b>Other leaks.</b> Anyone who can <b>create a Pod</b> in a namespace can mount any Secret in it and print it. Pod creation rights are secret-read rights. Also watch container logs, <code>kubectl describe</code>, CI output, Helm values files, and image layers (never <code>ENV</code> or <code>COPY</code> a secret in a Dockerfile; see devops08).</p>
      <p>🟣 <b>Rotation.</b> Environment variables need a restart to pick up a new secret; mounted secret files update in place, but the app has to reload them. Tools like Reloader watch ConfigMaps and Secrets and restart the Deployment for you. Designing the app to accept both the old and new credential during rotation avoids downtime.</p>`,
    aiEra: `<p>🤖 <b>What AI changes.</b> AI is quick at writing ConfigMap and Deployment YAML, converting a <code>.env</code> file into a ConfigMap and a Secret, and explaining why a value did not update. Coding agents also read your files and terminal output, so what you paste into a prompt may leave your machine.</p>
      <p><b>Use AI as a partner:</b> ask it to review a manifest for secrets that should not be there, or to explain the difference between three secret-management tools for your cloud. Give it the placeholder form, never the real value.</p>
      <p><b>Where AI goes wrong:</b> it writes <code>kind: Secret</code> with <code>stringData</code> filled with example passwords that people then commit, tells you base64 "encrypts" the data, or puts passwords in a ConfigMap. It forgets that env vars do not hot-reload. <b>You still own:</b> keeping real secrets out of prompts, repos and logs, enabling encryption and RBAC, and rotating anything that leaked, including into an AI chat.</p>`,
    problems: [P({
      t: 'The config change that did nothing', l: 'Medium', tags: ['configmap', 'secret', 'env', 'volume'], co: ['Atlassian', 'Shopify', 'Capgemini'],
      s: `<p>Your team changed <code>LOG_LEVEL</code> in the ConfigMap <code>web-config</code> to <code>debug</code>, applied it, and the app still logs at <code>info</code>. A second complaint: the database password was rotated in the secret store, but the Pods still use the old one. Reproduce the first problem on kind, explain exactly which delivery method causes it, and fix it three ways: (a) a restart, (b) switching the setting to a mounted file the app re-reads, (c) a config checksum annotation so every config change triggers a rollout. Create the Secret with a placeholder-safe command, never a literal password in a file.</p>`,
      ex: `<p>After the patch: ${H.c('r', 'kubectl exec deploy/web -- printenv LOG_LEVEL')} still prints <code>info</code> (env vars are fixed at container start), while ${H.c('g', 'kubectl exec deploy/web -- cat /etc/web/LOG_LEVEL')} shows <code>debug</code> within about a minute (a ConfigMap volume is refreshed).</p>`,
      bw: `<p>Delete Pods one by one by hand, or edit the live Pod. A hand-deleted Pod is replaced from the same Deployment template (which now has the new value only on restart), and nothing records that a restart was needed, so the next ConfigMap edit repeats the surprise.</p>`,
      q: ['A container reads LOG_LEVEL from <code>configMapKeyRef</code>. You edit the ConfigMap. When does the running container see the new value?', ['Only after the container restarts', 'Within about a minute, automatically', 'Immediately', 'Never, even after a restart'], 0, 'Env vars are copied into the container once at start. Mounted files are refreshed, env vars are not.'],
      h: ['<p>Hint 1: check how the value reaches the container: <code>env</code>/<code>envFrom</code> or a <code>volumeMounts</code> entry.</p>', '<p>Hint 2: <code>kubectl rollout restart</code> makes new Pods; mounted files update on their own but the app must re-read them.</p>', '<p>Hint 3: a Pod template annotation containing a hash of the ConfigMap changes the template, so the Deployment rolls out automatically. Helm does it with <code>sha256sum</code> of the rendered file.</p>'],
      a: `<p>Environment variables are baked into the container when it starts, so changing the source object cannot change them. The honest fixes are to restart (simple, explicit), to move the value to a mounted file plus an app that reloads (no restart, needs app support), or to make the config part of the Pod template via a checksum annotation (GitOps-friendly: config change equals new rollout). For the rotated password do the same: update the Secret through the secret store or ESO, then restart or reload. Never edit a Secret by pasting the value into a file in Git.</p>`,
      code: Y(R`# Fix (c): the annotation changes whenever the config changes, so the Deployment rolls out by itself.
# In practice a tool computes the hash (Helm: sha256sum, Kustomize: configMapGenerator suffix).
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
spec:
  replicas: 2
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
      annotations:
        checksum/config: "3f1a9c-REPLACE-WITH-HASH-OF-web-config"
    spec:
      containers:
        - name: web
          image: ghcr.io/stefanprodan/podinfo:6.7.1
          env:
            - name: PODINFO_UI_MESSAGE
              valueFrom:
                configMapKeyRef:
                  name: web-config
                  key: UI_MESSAGE
          volumeMounts:
            - name: cfg
              mountPath: /etc/web
              readOnly: true
          resources:
            requests: { cpu: 50m, memory: 64Mi }
            limits: { memory: 128Mi }
      volumes:
        - name: cfg
          configMap:
            name: web-config`, 'checksum annotation pattern'),
      alt: [SH(R`#!/usr/bin/env bash
set -euo pipefail
# Reproduce: env var does not follow the ConfigMap
kubectl patch configmap web-config --type=merge -p '{"data":{"LOG_LEVEL":"debug"}}'
kubectl exec deploy/web -- printenv LOG_LEVEL                  # still the old value
# (a) restart
kubectl rollout restart deployment/web && kubectl rollout status deployment/web
kubectl exec deploy/web -- printenv LOG_LEVEL                  # debug
# (b) mounted file: no restart needed, the app must re-read it
kubectl exec deploy/web -- cat /etc/web/LOG_LEVEL
# (c) compute the checksum yourself (Helm and Kustomize do this for you)
HASH="$(kubectl get configmap web-config -o json | jq -c .data | sha256sum | cut -c1-12)"
kubectl patch deployment web --type=merge -p "{\"spec\":{\"template\":{\"metadata\":{\"annotations\":{\"checksum/config\":\"$HASH\"}}}}}"
# Secret rotation: update the Secret from your secret store or a typed value, then restart
read -rsp "New DB password: " NEW_PW; echo
kubectl create secret generic db-creds --from-literal=username=app --from-literal=password="$NEW_PW" --dry-run=client -o yaml | kubectl apply -f -
unset NEW_PW
kubectl rollout restart deployment/web`, 'Commands')],
      cx: `<p>A restart replaces Pods one at a time, so it costs one rolling update. The checksum pattern makes that automatic and auditable.</p>`,
      f: ['Why does <code>subPath</code> make this worse?', 'What does <code>immutable: true</code> change about how you roll out config?']
    })]
  });

  // ───────────────────────── Topic 5: probes ─────────────────────────
  topics.push({
    title: 'Liveness, readiness and startup probes',
    analogy: `<p>Picture a waiter in a restaurant. The <b>startup probe</b> asks a new chef "are you finished setting up your station?" and waits patiently, because a slow start is not a crime. The <b>readiness probe</b> asks "can you take another order right now?" If the chef is busy washing up, the waiter simply sends customers elsewhere for a while. The <b>liveness probe</b> asks "are you conscious?" If not, the manager sends the chef home and a new one takes over. Mixing these up is how restaurants (and clusters) end up sending the chef home for being busy.</p>`,
    explain: `<p>Kubernetes only knows a container is <b>running</b>, not that your app works. Probes let the kubelet ask the app. There are three, with three very different consequences:</p>
      <p>${H.table(['Probe', 'Question', 'If it fails', 'Use it for'], [
        ['<b>startup</b>', 'has the app finished booting?', 'after <code>failureThreshold</code> misses, the container is <b>killed</b> and restarted. While it runs, liveness and readiness are paused.', 'slow starters (JVM, big caches, migrations)'],
        ['<b>readiness</b>', 'can it serve traffic now?', 'the Pod is <b>removed from Service endpoints</b>, nothing is restarted', 'warm-up, dependency down, overloaded'],
        ['<b>liveness</b>', 'is it stuck for good?', 'the container is <b>killed</b> and restarted (CrashLoopBackOff if it repeats)', 'deadlocks only the app can recover from by restart']
      ])}</p>
      <p>Each probe can be an <code>httpGet</code> (status 200-399 is success), a <code>tcpSocket</code> (port opens), an <code>exec</code> (command exit code 0) or <code>grpc</code>. Tuning knobs: <code>initialDelaySeconds</code>, <code>periodSeconds</code> (default 10), <code>timeoutSeconds</code> (default 1), <code>failureThreshold</code> (default 3) and <code>successThreshold</code> (default 1; must stay 1 for liveness and startup).</p>
      <p><b>Golden rules:</b></p>
      <ul>
        <li>Always add a <b>readiness</b> probe to anything behind a Service. Without it, a Pod receives traffic the moment its process starts, and rolling updates cannot tell good Pods from bad ones.</li>
        <li>Keep <b>liveness simple</b>: "is the process responsive?" Never make it check the database or other services. When the database blips, every Pod would be restarted at once and you turn a small outage into a big one.</li>
        <li>Use a <b>startup</b> probe for slow apps instead of a huge <code>initialDelaySeconds</code>. The budget is <code>failureThreshold x periodSeconds</code> (for example 30 x 5 = 150 seconds, counted to the last allowed check at about 145 s), but a fast app starts the moment it is ready.</li>
      </ul>
      <p>Two real-life symptoms: a <b>liveness probe that starts too early</b> kills the app before it finished booting, so you see restarts and <code>CrashLoopBackOff</code> although the app is fine. And a <b>readiness probe pointing at a wrong path</b> leaves Pods at <code>0/1</code> forever; during a deploy the rollout stalls at "1 out of 3" while the old Pods keep serving.</p>`,
    clues: [
      '"restarts every minute but the app is fine locally" → liveness probe too aggressive or starts before boot finishes; add a startup probe',
      '"rollout stuck, new Pods Running but 0/1 READY" → readiness probe failing (wrong path/port, app slow, dependency down)',
      '"Pod removed from the Service but not restarted" → readiness failing, as designed',
      '"JVM takes 90 s to start" → startupProbe with a generous <code>failureThreshold</code>, not a big initial delay',
      '"all Pods restarted when the DB went down" → liveness checks the database; it should not',
      '"Readiness probe failed: HTTP probe failed with statuscode: 404" in Events → wrong path'
    ],
    code: [Y(R`# probes.yaml: all three probes on one app (podinfo serves /healthz and /readyz on port 9898)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      containers:
        - name: api
          image: ghcr.io/stefanprodan/podinfo:6.7.1
          ports:
            - name: http
              containerPort: 9898
          startupProbe:                # runs first; budget = 30 x 5 s = 150 s to boot
            httpGet: { path: /healthz, port: http }
            periodSeconds: 5
            failureThreshold: 30
          readinessProbe:              # decides whether the Pod gets traffic
            httpGet: { path: /readyz, port: http }
            periodSeconds: 5
            timeoutSeconds: 2
            failureThreshold: 3
            successThreshold: 1
          livenessProbe:               # last resort: restart a stuck process. Cheap and local only.
            httpGet: { path: /healthz, port: http }
            periodSeconds: 10
            timeoutSeconds: 2
            failureThreshold: 3
          resources:
            requests: { cpu: 50m, memory: 64Mi }
            limits: { memory: 128Mi }`, 'Three probes'),
      SH(R`#!/usr/bin/env bash
set -euo pipefail
kubectl apply -f probes.yaml
kubectl rollout status deployment/api

# Make one Pod unready on purpose (podinfo has a switch for it) and watch it leave the Service
kubectl expose deployment api --port=80 --target-port=http --name=api
POD="$(kubectl get pod -l app=api -o jsonpath='{.items[0].metadata.name}')"
kubectl exec "$POD" -- podcli check http localhost:9898/readyz   # 200 now
kubectl port-forward "pod/$POD" 9899:9898 &
sleep 2
curl -s -X POST localhost:9899/readyz/disable                    # readiness now fails (the container keeps running)
sleep 12
kubectl get pods -l app=api                                      # that Pod shows READY 0/1, RESTARTS 0
kubectl get endpointslices -l kubernetes.io/service-name=api     # one address fewer
curl -s -X POST localhost:9899/readyz/enable                     # back in rotation
kill %1

# Evidence of probe failures lives in Events, not in logs
kubectl describe pod "$POD" | sed -n '/Events:/,$p'`, 'Break readiness on purpose and watch the endpoints')],
    codeTitle: ['Startup, readiness and liveness together', 'Watch readiness remove a Pod from the Service'],
    viz: [{
      title: 'Startup probe timeline: does the container make it?',
      input: '0,10,3,25',
      inputLabel: 'initialDelaySeconds, periodSeconds, failureThreshold, seconds the app needs to boot',
      gen: function (input) {
        var v = String(input || '').split(',').map(function (x) { return parseInt(x, 10); });
        if (v.length !== 4 || v.some(isNaN)) throw new Error('Type four whole numbers like 0,10,3,25');
        if (v[1] < 1 || v[2] < 1 || v[0] < 0 || v[3] < 0 || v[1] > 120 || v[2] > 60) throw new Error('period 1-120, failureThreshold 1-60, delays and boot time 0 or more');
        var r = startup(v[0], v[1], v[2], v[3]);
        if (!r) throw new Error('Those numbers never finish; try a smaller boot time');
        var f = [{ narr: 'The container starts at <b>0 s</b>. The app needs <b>' + v[3] + ' s</b> to boot. The probe waits <b>' + v[0] + ' s</b>, then checks every <b>' + v[1] + ' s</b>. After <b>' + v[2] + '</b> failed checks in a row the kubelet kills the container.', parts: [{ type: 'vars', vals: { initialDelay: v[0], period: v[1], failureThreshold: v[2], appBootsAt: v[3] + 's' } }] }];
        var rows = [];
        r.rows.forEach(function (row, i) {
          rows.push(row);
          var ok = row[1] === 'success';
          f.push({ narr: ok ? 'At <b>' + row[0] + '</b> the app is up, the probe <b>succeeds</b>. The startup probe is finished; liveness and readiness probes now begin.' : 'At <b>' + row[0] + '</b> the app is still booting (needs ' + v[3] + ' s), so the probe <b>fails</b> (' + row[2] + '). ' + (i + 1 >= v[2] ? 'That was the last allowed failure.' : 'Not enough failures yet to kill it.'), parts: [{ type: 'table', label: 'probe attempts', columns: ['time', 'result', 'counter'], rows: rows.slice(), hl: (function () { var h = {}; h[i] = ok ? 'ok' : 'bad'; return h; })() }] });
        });
        var started = r.verdict.indexOf('started') === 0, t = r.verdict.split('@')[1];
        f.push({ narr: started ? '<b>Result: started at ' + t + ' s.</b> The budget was ' + (v[0] + (v[2] - 1) * v[1]) + ' s (last allowed failure at that time). Readiness decides when traffic arrives.' : '<b>Result: killed at ' + t + ' s.</b> The app needed ' + v[3] + ' s, but the probe gave up at ' + t + ' s. The container restarts and the same thing happens again: restarts climb and the Pod ends in <code>CrashLoopBackOff</code>. Fix: raise <code>failureThreshold</code> (or period) so the budget exceeds the real boot time.', parts: [{ type: 'vars', vals: { verdict: r.verdict, budget: (v[0] + (v[2] - 1) * v[1]) + 's', boot: v[3] + 's' }, hl: { verdict: started ? 'ok' : 'bad' } }] });
        return f;
      }
    }],
    examples: [
      { title: 'Liveness kills a healthy-but-slow app', html: `<p>A Java service needs 60 s to start. Someone adds <code>livenessProbe</code> with <code>initialDelaySeconds: 10</code>, <code>periodSeconds: 10</code>, <code>failureThreshold: 3</code>. The probe fails at 10, 20 and 30 s, so the kubelet kills the container at about 30 s, every time. Result: <code>Restarts: 7</code> and eventually <code>CrashLoopBackOff</code>, logs that stop mid-startup, and nothing wrong with the code.</p>
        <p>Fix: a <b>startup probe</b> with <code>periodSeconds: 5, failureThreshold: 30</code> (150 s budget). Liveness only begins after startup passes.</p>` },
      { title: 'Readiness never passes during a deploy', html: `<p>You push a new image and <code>kubectl rollout status</code> hangs on "1 out of 3 new replicas". <code>kubectl get pods</code> shows the new Pod <code>Running 0/1</code>, <code>kubectl describe pod</code> shows <code>Readiness probe failed: HTTP probe failed with statuscode: 404</code>. The new release moved the health endpoint from <code>/health</code> to <code>/healthz</code> but the manifest still probes <code>/health</code>.</p>
        <p>Good news: the old Pods still serve, thanks to <code>maxUnavailable: 0</code> and readiness. Fix the path and re-apply, or <code>kubectl rollout undo</code> right away if users are affected.</p>` },
      { title: 'Which probe type for which service', html: `${H.table(['Service', 'Probe', 'Why'], [
        ['HTTP API', '<code>httpGet</code> on a cheap local endpoint', 'fast, tests the real HTTP stack'],
        ['Database or cache', '<code>exec</code> (<code>pg_isready</code>, <code>redis-cli ping</code>) or <code>tcpSocket</code>', 'no HTTP endpoint exists'],
        ['gRPC service', '<code>grpc</code> probe (health checking protocol)', 'native since 1.24, stable in 1.27'],
        ['Background worker', '<code>exec</code> that checks a heartbeat file', 'no port at all']
      ])}` }
    ],
    deepDive: `<p>🟣 <b>Who runs the probes.</b> The kubelet on the Pod's node (not the API server and not kube-proxy). <code>httpGet</code> probes go to the Pod IP, so a NetworkPolicy does not block them, and they do not pass through a Service. Readiness changes the Pod's <code>Ready</code> condition, which the endpoint controller watches; that is the whole link between a probe and traffic.</p>
      <p>🟣 <b>Math of the budget.</b> Probes run at <code>initialDelaySeconds + k x periodSeconds</code>. The container is declared failed at the <code>failureThreshold</code>-th consecutive failure, so the time window is <code>initialDelaySeconds + (failureThreshold - 1) x periodSeconds</code>, plus up to <code>timeoutSeconds</code> for a hanging probe. The Python exercise in this lesson models exactly this. For readiness with <code>successThreshold: 2</code> a Pod needs two passes in a row before it counts.</p>
      <p>🟣 <b>Dependency checks and cascading failure.</b> Put dependency checks in <b>readiness</b> at most, and think twice: if 50 Pods all depend on one database and it slows down, all 50 go NotReady and the Service has zero endpoints, which is worse than serving some errors. Many teams make readiness check only "I can accept requests" and use circuit breakers in code for the rest.</p>
      <p>🟣 <b>Related features.</b> <code>minReadySeconds</code> on a Deployment keeps a new Pod out of the "available" count for a while, slowing a bad rollout. <code>terminationGracePeriodSeconds</code> and a <code>preStop</code> hook shape shutdown. You can also use <code>readinessGates</code> (external systems such as cloud load balancers adding their own condition) and sidecar containers (<code>restartPolicy: Always</code> on an init container, beta in 1.29 and stable since 1.33) with their own probes.</p>
      <p>🟣 <b>Common mistakes.</b> Probing a path that needs authentication (401 counts as failure); a probe timeout of 1 s on a busy app under load (spurious failures); the same endpoint for liveness and readiness (a slow dependency restarts your Pods); exec probes that fork heavy scripts every few seconds.</p>`,
    aiEra: `<p>🤖 <b>What AI changes.</b> AI can propose probe settings from a description ("Spring Boot, 60 s start") and explain Events such as <code>Liveness probe failed: Get "http://10.244.1.7:8080/health": context deadline exceeded</code>. Observability tools with AI summaries can flag "restarts correlate with probe failures".</p>
      <p><b>Use AI as a partner:</b> give it your measured start time (from logs or <code>kubectl get pod -w</code>) and ask for startup probe numbers with a safety margin, then test with a deliberately slow start.</p>
      <p><b>Where AI goes wrong:</b> it copies the same <code>httpGet</code> block into liveness and readiness, makes liveness check a database, or sets <code>initialDelaySeconds: 5</code> because "that's typical". It rarely asks how long your app really takes to boot. <b>You still own:</b> measuring real behaviour and deciding what a failing probe should cost: a restart, or just a pause in traffic.</p>`,
    problems: [P({
      t: 'Will the container survive its own boot?', l: 'Medium', tags: ['probes', 'startup', 'python', 'crashloop'], co: ['Amazon', 'Datadog', 'Wipro'],
      s: `<p>A service takes a known number of seconds to boot. Before choosing probe settings, write <code>startup_verdict(initial, period, failure, boot)</code> in Python. The container starts at second 0. The probe first runs at <code>initial</code> seconds, then every <code>period</code> seconds. A probe succeeds when the time is at least <code>boot</code>; otherwise it fails. If <code>failure</code> probes fail in a row, the container is killed at the time of the last failing probe. Return <code>"started@T"</code> (T = time of the first successful probe) or <code>"killed@T"</code>. Return <code>"invalid"</code> if period or failure is below 1, or initial or boot is negative. Then write the probe block that fixes a 75-second boot with a safety margin.</p>`,
      c: `<p>Python 3 standard library. All inputs are integers; period up to 10<sup>4</sup>. Ignore timeoutSeconds and network delay.</p>`,
      ex: `<p><code>startup_verdict(0, 10, 3, 25)</code> → ${H.c('r', '"killed@20"')}: probes at 0, 10 and 20 s all fail because the app is up at 25 s, and three failures kill it. <code>startup_verdict(0, 10, 3, 12)</code> → ${H.c('g', '"started@20"')}: probes at 0 and 10 fail, the one at 20 passes. A 75 s boot with <code>period: 5, failureThreshold: 30</code> gives a budget of 145 s.</p>`,
      bw: `<p>Guess <code>initialDelaySeconds: 60</code> and hope. If the app sometimes needs 61 s, it is killed; if it needs 10 s, every start still waits 60 s before the Pod can become ready, which slows every deploy and every failure recovery.</p>`,
      q: ['Why prefer a startup probe over a large <code>initialDelaySeconds</code> on the liveness probe?', ['A fast start is noticed quickly, while a slow start is still tolerated', 'A startup probe makes the container boot faster', 'initialDelaySeconds is not allowed with HTTP probes', 'A startup probe never restarts anything'], 0, 'The startup probe checks repeatedly, so the Pod becomes ready as soon as the app is up, yet a slow boot is allowed up to the failure budget.'],
      h: ['<p>Hint 1: probes happen at initial, initial + period, initial + 2 x period and so on.</p>', '<p>Hint 2: if boot is at most initial, the very first probe succeeds. Otherwise count how many probes fail before one passes: k = ceil((boot - initial) / period).</p>', '<p>Hint 3: if k reaches the failure threshold the container dies at initial + (failure - 1) x period, else it starts at initial + k x period. Use integer math for the ceiling.</p>'],
      a: `<p>The kubelet's probe loop is just an arithmetic sequence of times. Count the failures that happen before the app is ready (k). If k is below the threshold, the next probe succeeds and the container is declared started. If k is at or above the threshold, the container is killed at the failure-th probe time. For a 75 s boot, choose a budget well above it: <code>periodSeconds: 5</code>, <code>failureThreshold: 30</code> gives 145 s. Liveness and readiness stay small and quick because the startup probe shields them while booting.</p>`,
      code: Y(R`startupProbe:
  httpGet: { path: /healthz, port: http }
  periodSeconds: 5
  failureThreshold: 30        # budget: 0 + (30 - 1) x 5 = 145 s for a 75 s boot (about 2x margin)
readinessProbe:
  httpGet: { path: /readyz, port: http }
  periodSeconds: 5
livenessProbe:
  httpGet: { path: /healthz, port: http }
  periodSeconds: 10
  failureThreshold: 3`, 'container probes snippet'),
      alt: [PY(R`def startup_verdict(initial, period, failure, boot):
    if period < 1 or failure < 1 or initial < 0 or boot < 0:
        return "invalid"
    if boot <= initial:
        return "started@" + str(initial)             # the very first probe already succeeds
    misses = (boot - initial + period - 1) // period  # probes that fail before the app is up (ceil)
    if misses >= failure:
        return "killed@" + str(initial + (failure - 1) * period)
    return "started@" + str(initial + misses * period)`, 'startup_verdict (tested)')],
      cx: `<p>O(1) arithmetic. In practice, measure boot time from <code>kubectl get pod -w</code> timestamps across several starts (cold image pull, busy node) and add margin.</p>`,
      f: ['How would the answer change with <code>timeoutSeconds</code> and a probe that hangs instead of failing quickly?', 'Why must <code>successThreshold</code> be 1 for liveness and startup probes?'],
      tests: { sig: 'int int int int -> string', fn: 'startupVerdict', cases: [
        [[0, 10, 3, 0], 'started@0'],
        [[5, 10, 3, 0], 'started@5'],
        [[5, 10, 3, 5], 'started@5'],
        [[0, 10, 3, 12], 'started@20'],
        [[0, 10, 3, 25], 'killed@20'],
        [[0, 10, 3, 30], 'killed@20'],
        [[0, 10, 3, 31], 'killed@20'],
        [[10, 5, 6, 60], 'killed@35'],
        [[10, 5, 6, 40], 'killed@35'],
        [[0, 1, 1, 1], 'killed@0'],
        [[0, 1, 1, 0], 'started@0'],
        [[20, 10, 3, 45], 'killed@40'],
        [[0, 0, 3, 5], 'invalid'],
        [[0, 10, 0, 5], 'invalid'],
        [[-1, 10, 3, 5], 'invalid'],
        [[3, 7, 4, 100], 'killed@24'],
        [[0, 5, 30, 75], 'started@75']
      ] }
    })]
  });

  // ───────────────────────── Topic 6: resources, QoS, namespaces ─────────────────────────
  topics.push({
    title: 'Resource requests and limits, QoS classes, and namespaces with quotas',
    analogy: `<p>A cluster node is a flat-share with a fixed number of seats and a fixed amount of fridge space. A <b>request</b> is the seat you <b>reserve</b>: the landlord (scheduler) only moves you in if that much is still free, and it stays yours even if you are out. A <b>limit</b> is the house rule "you may never use more than this": go over the fridge limit and your food is thrown away (<b>OOMKilled</b>); go over the CPU limit and you are just made to queue (<b>throttled</b>). A <b>namespace</b> is a separate floor of the building, and a <b>ResourceQuota</b> is the total budget each floor may reserve.</p>`,
    explain: `<p>Every container can declare two numbers for CPU and memory:</p>
      <p>${H.table(['', 'Request', 'Limit'], [
        ['Meaning', 'the amount the scheduler <b>reserves</b> for you', 'the most you may <b>use</b>'],
        ['Used by', 'scheduler (placement), eviction order, HPA percentages', 'kubelet/kernel cgroups at run time'],
        ['CPU over the limit', '-', '<b>throttled</b> (slower, not killed)'],
        ['Memory over the limit', '-', '<b>OOMKilled</b> (exit code 137, restart count goes up)'],
        ['Units', '<code>500m</code> = half a CPU, <code>2</code> = two CPUs', '<code>256Mi</code>, <code>1Gi</code> (binary); <code>256M</code> is decimal and slightly smaller']
      ])}</p>
      <p>The scheduler adds up the <b>requests</b> of Pods on a node and compares them with the node's <b>allocatable</b> amount (capacity minus system reservations). If no node has enough room, the Pod stays <code>Pending</code> with an event like <code>0/3 nodes are available: 3 Insufficient cpu</code>. Note: it looks at requests, not real usage, so a node can be "full" while idle.</p>
      <p>From requests and limits Kubernetes assigns a <b>QoS class</b>, used to decide who is evicted first when a node runs out of memory:</p>
      <ul>
        <li><b>Guaranteed</b>: every container has CPU and memory limits, and requests equal limits (or are unset, then they copy the limits). Evicted last.</li>
        <li><b>Burstable</b>: at least one request or limit is set, but not Guaranteed. The common middle.</li>
        <li><b>BestEffort</b>: nothing set anywhere. Evicted first, and gets the leftovers.</li>
      </ul>
      <p>Common practice: set a memory request equal to the memory limit (memory cannot be squeezed, only killed), set a CPU request near typical use, and be careful with CPU limits (many teams omit them to avoid throttling, others keep them for fairness).</p>
      <p><b>Namespaces</b> split one cluster into virtual rooms for teams or environments. Names must be unique inside a namespace, not across the cluster. Two helpers make them safe: <b>ResourceQuota</b> caps the total CPU, memory, Pod count and so on in a namespace, and <b>LimitRange</b> gives containers default requests and limits (and min/max). With a CPU/memory quota, every Pod must declare requests, otherwise the API server rejects it; a LimitRange default fixes that for lazy manifests.</p>`,
    clues: [
      '"Pod stays Pending with Insufficient cpu/memory" → requests larger than what any node has free; shrink requests, add nodes, or free space',
      '"container restarted, exit code 137, reason OOMKilled" → memory limit too low or a leak',
      '"app is slow but CPU shows low" → CPU limit throttling',
      '"which Pods are evicted first under memory pressure?" → BestEffort, then Burstable over their requests, Guaranteed last',
      '"forbidden: exceeded quota" → namespace ResourceQuota; "must specify limits.memory" → add requests/limits or a LimitRange default',
      '"separate dev and prod teams on one cluster" → namespaces + quota + RBAC (+ NetworkPolicy)'
    ],
    code: [Y(R`# team-a.yaml: a namespace with a budget and sensible defaults
apiVersion: v1
kind: Namespace
metadata:
  name: team-a
  labels:
    team: a
---
apiVersion: v1
kind: ResourceQuota
metadata:
  name: team-a-quota
  namespace: team-a
spec:
  hard:
    pods: "10"
    requests.cpu: "2"            # total CPU the namespace may reserve
    requests.memory: 2Gi
    limits.memory: 4Gi
---
apiVersion: v1
kind: LimitRange
metadata:
  name: team-a-defaults
  namespace: team-a
spec:
  limits:
    - type: Container
      defaultRequest:            # applied when a container sets no requests
        cpu: 100m
        memory: 128Mi
      default:                   # applied when a container sets no limits
        memory: 256Mi
      max:
        memory: 1Gi              # nobody gets more than 1Gi per container`, 'Namespace, ResourceQuota, LimitRange'),
      Y(R`# resources.yaml: three Pods, three QoS classes
apiVersion: v1
kind: Pod
metadata:
  name: qos-guaranteed
spec:
  containers:
    - name: app
      image: nginx:1.27
      resources:
        requests: { cpu: 250m, memory: 128Mi }
        limits: { cpu: 250m, memory: 128Mi }     # equal -> Guaranteed
---
apiVersion: v1
kind: Pod
metadata:
  name: qos-burstable
spec:
  containers:
    - name: app
      image: nginx:1.27
      resources:
        requests: { cpu: 100m, memory: 64Mi }
        limits: { memory: 256Mi }                # request below limit -> Burstable
---
apiVersion: v1
kind: Pod
metadata:
  name: qos-besteffort
spec:
  containers:
    - name: app
      image: nginx:1.27                          # nothing set -> BestEffort`, 'Three QoS classes'),
      Y(R`# oom.yaml: allocates 150 MB with a 100 MiB limit, so the kernel kills it
apiVersion: v1
kind: Pod
metadata:
  name: oom-demo
spec:
  restartPolicy: Always
  containers:
    - name: stress
      image: polinux/stress
      command: ["stress"]
      args: ["--vm", "1", "--vm-bytes", "150M", "--vm-hang", "1"]
      resources:
        requests: { cpu: 10m, memory: 64Mi }
        limits: { memory: 100Mi }`, 'oom.yaml'),
      SH(R`#!/usr/bin/env bash
set -euo pipefail
kubectl apply -f team-a.yaml
kubectl get quota,limitrange -n team-a
kubectl describe quota team-a-quota -n team-a               # Used vs Hard

kubectl apply -f resources.yaml
kubectl get pod qos-guaranteed qos-burstable qos-besteffort -o custom-columns=NAME:.metadata.name,QOS:.status.qosClass

kubectl apply -f oom.yaml
sleep 20
kubectl get pod oom-demo                                     # RESTARTS climbing, then CrashLoopBackOff
kubectl describe pod oom-demo | grep -A6 'Last State'        # Reason: OOMKilled, Exit Code: 137
kubectl get pod oom-demo -o jsonpath='{.status.containerStatuses[0].lastState.terminated.reason}{"\n"}'

# Live usage needs metrics-server (minikube: minikube addons enable metrics-server;
# kind: install it and add --kubelet-insecure-tls to its args because kind kubelets use self-signed certs)
kubectl top nodes
kubectl top pods -A

kubectl describe node lab-worker | sed -n '/Allocated resources:/,/Events:/p'   # requests/limits already reserved
kubectl config set-context --current --namespace=team-a      # work inside team-a without -n
kubectl delete -f oom.yaml -f resources.yaml --ignore-not-found`, 'Quota, QoS and an OOM kill')],
    codeTitle: ['Namespace with quota and defaults', 'QoS class examples', 'An OOMKilled container', 'Observe it'],
    viz: [{
      title: 'The scheduler fits Pods onto nodes by requests',
      input: 'n1:2:4Gi:, n2:1:2Gi:, n3:4:8Gi:gpu | a:1:1Gi:, b:1500m:1Gi:, c:3:2Gi:gpu, d:1:1Gi:, e:8:1Gi:',
      inputLabel: 'nodes name:cpu:memory:taint , ... | pods name:cpuRequest:memRequest:toleratedTaint , ... (first fit in node order; empty taint means none)',
      gen: function (input) {
        var halves = String(input || '').split('|');
        if (halves.length !== 2) throw new Error('Format: n1:2:4Gi:, n2:1:2Gi: | a:500m:1Gi:, b:1:1Gi:');
        function parse(s, what) {
          return s.split(',').map(function (x) { return x.trim(); }).filter(Boolean).map(function (x) {
            var p = x.split(':');
            if (p.length !== 4) throw new Error(what + ' items look like name:cpu:memory:taint (taint may be empty), got "' + x + '"');
            var c = qty('cpu', p[1]), m = qty('memory', p[2]);
            if (isNaN(c) || isNaN(m)) throw new Error('Bad quantity in "' + x + '" (use 500m, 2, 256Mi, 1Gi)');
            return { name: p[0], cpu: c, mem: m, taint: p[3] };
          });
        }
        var nodes = parse(halves[0], 'node'), pods = parse(halves[1], 'pod');
        if (!nodes.length || !pods.length || nodes.length > 5 || pods.length > 8) throw new Error('Use 1-5 nodes and 1-8 Pods');
        function view(hl) {
          return { type: 'table', label: 'node free capacity (allocatable minus requests)', columns: ['node', 'free CPU', 'free memory', 'taint'], rows: nodes.map(function (n) { return [n.name, n.cpu + 'm', fmtMem(n.mem), n.taint || '-']; }), hl: hl || {} };
        }
        var f = [{ narr: 'The scheduler keeps a running total of what is <b>free</b> on each node (allocatable minus the requests of Pods already placed). It never looks at real usage. A node with a <b>taint</b> only accepts Pods that tolerate it.', parts: [view()] }];
        pods.forEach(function (p) {
          var pick = -1, whyList = [];
          nodes.forEach(function (n, i) {
            if (pick >= 0) return;
            if (n.taint && n.taint !== p.taint) { whyList.push(n.name + ': taint ' + n.taint + ' not tolerated'); return; }
            if (n.cpu < p.cpu) { whyList.push(n.name + ': Insufficient cpu'); return; }
            if (n.mem < p.mem) { whyList.push(n.name + ': Insufficient memory'); return; }
            pick = i;
          });
          var hl = {};
          if (pick >= 0) {
            nodes[pick].cpu -= p.cpu; nodes[pick].mem -= p.mem; hl[pick] = 'ok';
            f.push({ narr: 'Pod <b>' + esc(p.name) + '</b> asks for ' + p.cpu + 'm CPU and ' + fmtMem(p.mem) + '. First node that fits: <b>' + esc(nodes[pick].name) + '</b>' + (whyList.length ? ' (skipped: ' + esc(whyList.join('; ')) + ')' : '') + '. Its free capacity shrinks.', parts: [view(hl)] });
          } else {
            f.push({ narr: 'Pod <b>' + esc(p.name) + '</b> asks for ' + p.cpu + 'm CPU and ' + fmtMem(p.mem) + ' and fits <b>nowhere</b>: ' + esc(whyList.join('; ')) + '. It stays <code>Pending</code>, and <code>kubectl describe pod</code> shows <code>0/' + nodes.length + ' nodes are available</code> with these reasons.', parts: [view(), { type: 'text', html: '<b>Pending</b>: ' + esc(p.name) }] });
          }
        });
        return f;
      }
    }],
    examples: [
      { title: 'Pending: Insufficient cpu', html: `<p><code>kubectl describe pod api-0</code> ends with:</p><pre>Warning  FailedScheduling  0/3 nodes are available: 1 node(s) had untolerated taint {node-role.kubernetes.io/control-plane: }, 2 Insufficient cpu.</pre>
        <p>Read it: one node is a control-plane node with a taint, and the two workers have less free CPU <i>reserved</i> than the Pod requests. Check with <code>kubectl describe node lab-worker</code> (the "Allocated resources" table). Options: lower the request to what the app really uses, remove or scale down other workloads, or add a node. In kind, the machine's free RAM and CPU are the real limit.</p>` },
      { title: 'OOMKilled vs evicted', html: `${H.table(['What you see', 'Cause', 'Fix'], [
        ['<code>OOMKilled</code>, exit code 137, <code>Last State: Terminated</code>', 'the container went over <b>its own</b> memory limit', 'raise the limit, fix the leak, cap memory in the runtime (for example JVM <code>-XX:MaxRAMPercentage</code>)'],
        ['Pod <code>Evicted</code>, message "node was low on resource: memory"', 'the <b>node</b> ran out; low-QoS Pods go first', 'set requests so the scheduler packs correctly; use Guaranteed for critical Pods'],
        ['Slow but alive, CPU graph flat at the limit', 'CPU throttling', 'raise or remove the CPU limit; keep a CPU request']
      ])}` },
      { title: 'Quota rejects a deploy', html: `<p><code>kubectl apply</code> prints <code>Error from server (Forbidden): exceeded quota: team-a-quota, requested: requests.cpu=1, used: requests.cpu=1500m, limited: requests.cpu=2</code>. A quota rejects Pods at creation (via the ReplicaSet). The Deployment looks fine, but <code>kubectl get rs</code> shows <code>DESIRED 3, CURRENT 1</code>, and <code>kubectl describe rs</code> holds the error. This is easy to miss: always check ReplicaSet events when Pods are missing.</p>` }
    ],
    deepDive: `<p>🟣 <b>How limits are enforced.</b> The kubelet turns limits into Linux cgroup settings. A memory limit becomes <code>memory.max</code>: when the cgroup goes over, the kernel's OOM killer picks a process inside it. CPU limit becomes a quota per 100 ms period (<code>cpu.max</code>): at 500m the container may run 50 ms per 100 ms, then waits. Requests become <code>cpu.weight</code> (shares): under contention the CPU is split by request, so a request is also your guaranteed minimum. See the cgroup details in CS Core 9.</p>
      <p>🟣 <b>Allocatable.</b> Node capacity minus <code>kube-reserved</code>, <code>system-reserved</code> and eviction thresholds. On a 4 GiB node, perhaps 3 GiB is allocatable. That is why "the node has 4 GiB but my 3.5 GiB request is Pending".</p>
      <p>🟣 <b>Taints, tolerations and affinity.</b> A taint repels Pods (<code>NoSchedule</code>, <code>PreferNoSchedule</code>, <code>NoExecute</code>) unless they tolerate it; control-plane nodes carry <code>node-role.kubernetes.io/control-plane:NoSchedule</code>. Node affinity and <code>nodeSelector</code> attract Pods to labelled nodes; topology spread constraints spread replicas across zones. Any of these can leave a Pod Pending even when CPU is free.</p>
      <p>🟣 <b>Vertical and horizontal scaling.</b> The Horizontal Pod Autoscaler (HPA) scales replicas on <b>CPU utilisation relative to requests</b>, so requests that are far too big or too small make autoscaling silly. VPA can recommend request values. Right-sizing starts from real data: <code>kubectl top</code>, then metrics over weeks. Over-requested clusters waste money; under-requested clusters get OOM kills.</p>
      <p>🟣 <b>Namespaces are not a security boundary alone.</b> They scope names, quota and RBAC, but by default Pods in different namespaces can still talk to each other. Add NetworkPolicies (needs a CNI that enforces them) and Pod Security Admission labels (<code>pod-security.kubernetes.io/enforce: baseline</code> or <code>restricted</code>) for real isolation. Deleting a namespace deletes everything inside it, so treat that command with care.</p>`,
    aiEra: `<p>🤖 <b>What AI changes.</b> AI can suggest starting requests for a framework, explain a <code>FailedScheduling</code> message and convert units quickly. Cost tools use AI to recommend right-sizing from usage history.</p>
      <p><b>Use AI as a partner:</b> paste <code>kubectl describe node</code> (Allocated resources) with a Pending Pod's events and ask which constraint is blocking placement. Ask for a first guess of requests, then replace the guess with measured values.</p>
      <p><b>Where AI goes wrong:</b> it invents "typical" numbers (<code>cpu: 500m, memory: 512Mi</code> everywhere), mixes <code>M</code> and <code>Mi</code>, sets tiny memory limits for JVM or Node apps that cannot survive them, or gives every Pod the same big request until the cluster is "full". <b>You still own:</b> the measurements, the QoS choice for critical Pods and the quota policy.</p>`,
    problems: [P({
      t: 'Predict the QoS class before you deploy', l: 'Medium', tags: ['qos', 'resources', 'python', 'eviction'], co: ['Microsoft', 'Cisco', 'Mindtree'],
      s: `<p>The platform team wants a pre-merge check that tells reviewers which QoS class a Pod will get. Write <code>qos_class(containers)</code> in Python. Each container is a string <code>"cpuReq,cpuLim,memReq,memLim"</code> where <code>-</code> means unset (for example <code>"250m,500m,128Mi,256Mi"</code>). Return <code>"Guaranteed"</code>, <code>"Burstable"</code> or <code>"BestEffort"</code>. Rules: if a limit is set and the request is not, the request defaults to the limit. BestEffort = no container sets anything. Guaranteed = <b>every</b> container has both a CPU and a memory limit, and each request (if set) equals its limit as a quantity (<code>1</code> equals <code>1000m</code>, <code>1Gi</code> equals <code>1024Mi</code>). Everything else is Burstable. Then show the <code>resources</code> block that makes a critical API Guaranteed, and the command that proves the class.</p>`,
      c: `<p>Python 3 standard library. Quantities: CPU as <code>500m</code>, <code>1</code> or <code>0.5</code>; memory as plain bytes or with <code>Ki Mi Gi Ti K M G T</code>. 1-10 containers.</p>`,
      ex: `<p><code>["500m,500m,256Mi,256Mi"]</code> → ${H.c('g', 'Guaranteed')}. <code>["-,500m,-,256Mi"]</code> → ${H.c('g', 'Guaranteed')} (requests copy the limits). <code>["100m,500m,128Mi,256Mi"]</code> → ${H.c('y', 'Burstable')}. <code>["-,-,-,-"]</code> → ${H.c('r', 'BestEffort')}. A Pod with one Guaranteed container and one empty container is ${H.c('y', 'Burstable')}.</p>`,
      bw: `<p>Reading only the first container, or comparing the request and limit strings with <code>==</code>. Then <code>1</code> vs <code>1000m</code> is wrongly "different", and a sidecar with no resources silently drops the whole Pod out of Guaranteed.</p>`,
      q: ['A Pod has an app container with equal requests and limits, and a logging sidecar with no resources at all. Its QoS class is...', ['Burstable', 'Guaranteed', 'BestEffort', 'Depends on the node'], 0, 'All containers must be Guaranteed for the Pod to be Guaranteed. One container with nothing set breaks that, but the app container has resources, so the Pod is not BestEffort either.'],
      h: ['<p>Hint 1: first convert quantities to numbers (millicores and bytes), so equal amounts compare equal.</p>', '<p>Hint 2: track two flags over all containers: "anything set anywhere" and "still Guaranteed".</p>', '<p>Hint 3: for each container Guaranteed needs both limits; a set request must equal its limit; an unset request copies the limit.</p>'],
      a: `<p>QoS is a pure function of the resource fields, evaluated over all containers. If nothing is set the Pod is BestEffort. If every container has CPU and memory limits and equal requests, it is Guaranteed. Anything between is Burstable. Compare quantities after converting units, never as text. For critical services, set requests equal to limits for memory at least, and verify with <code>kubectl get pod -o jsonpath='{.status.qosClass}'</code>.</p>`,
      code: Y(R`# A Guaranteed API: every container has CPU and memory limits, requests equal limits
apiVersion: v1
kind: Pod
metadata:
  name: api-guaranteed
spec:
  containers:
    - name: api
      image: ghcr.io/stefanprodan/podinfo:6.7.1
      resources:
        requests: { cpu: 500m, memory: 256Mi }
        limits: { cpu: 500m, memory: 256Mi }
    - name: log-shipper              # sidecars count too
      image: busybox:1.36
      command: ["sh", "-c", "sleep 3600"]
      resources:
        requests: { cpu: 50m, memory: 32Mi }
        limits: { cpu: 50m, memory: 32Mi }
# Prove it:  kubectl get pod api-guaranteed -o jsonpath='{.status.qosClass}'   -> Guaranteed`, 'a Guaranteed Pod'),
      alt: [PY(R`import math
from fractions import Fraction

_MEM = {"Ki": 1024, "Mi": 1024 ** 2, "Gi": 1024 ** 3, "Ti": 1024 ** 4,
        "K": 1000, "M": 1000 ** 2, "G": 1000 ** 3, "T": 1000 ** 4}


def _cpu(text):
    # millicores
    if text.endswith("m"):
        return int(text[:-1])
    return math.ceil(Fraction(text) * 1000)


def _mem(text):
    for suffix in ("Ki", "Mi", "Gi", "Ti", "K", "M", "G", "T"):
        if text.endswith(suffix):
            return math.ceil(Fraction(text[:-len(suffix)]) * _MEM[suffix])
    return math.ceil(Fraction(text))


def qos_class(containers):
    anything = False
    guaranteed = True
    for item in containers:
        cpu_req, cpu_lim, mem_req, mem_lim = [x.strip() for x in item.split(",")]
        values = [cpu_req, cpu_lim, mem_req, mem_lim]
        if any(v != "-" for v in values):
            anything = True
        if cpu_lim == "-" or mem_lim == "-":
            guaranteed = False                       # Guaranteed needs both limits
            continue
        if cpu_req != "-" and _cpu(cpu_req) != _cpu(cpu_lim):
            guaranteed = False
        if mem_req != "-" and _mem(mem_req) != _mem(mem_lim):
            guaranteed = False
    if not anything:
        return "BestEffort"
    return "Guaranteed" if guaranteed else "Burstable"`, 'qos_class (tested)')],
      cx: `<p>O(C) for C containers. Kubernetes computes the class at admission and stores it in <code>status.qosClass</code>; it cannot be changed later without recreating the Pod.</p>`,
      f: ['Which class do init containers influence? (the effective request is the max of init containers and the sum of app containers)', 'How does the kubelet pick eviction victims inside the Burstable class? (those using most memory above their request)'],
      tests: { sig: 'string[] -> string', fn: 'qosClass', cases: [
        [[['-,-,-,-']], 'BestEffort'],
        [[['500m,500m,256Mi,256Mi']], 'Guaranteed'],
        [[['-,500m,-,256Mi']], 'Guaranteed'],
        [[['100m,500m,128Mi,256Mi']], 'Burstable'],
        [[['100m,-,-,-']], 'Burstable'],
        [[['-,-,128Mi,128Mi']], 'Burstable'],
        [[['1,1000m,1Gi,1024Mi']], 'Guaranteed'],
        [[['500m,500m,256Mi,256Mi', '-,-,-,-']], 'Burstable'],
        [[['500m,500m,256Mi,256Mi', '250m,250m,64Mi,64Mi']], 'Guaranteed'],
        [[['500m,500m,256Mi,512Mi']], 'Burstable'],
        [[['-,-,-,256Mi']], 'Burstable'],
        [[['0.5,500m,1G,1000M']], 'Guaranteed'],
        [[['500m,500m,-,256Mi']], 'Guaranteed']
      ] }
    })]
  });

  // ───────────────────────── Topic 7: kubectl workflows and troubleshooting ─────────────────────────
  topics.push({
    title: 'kubectl workflows and troubleshooting broken Pods',
    analogy: `<p>A doctor does not guess. They read the chart (<code>get</code>), ask the patient "what happened?" (<code>describe</code>, the events), look at the diary (<code>logs</code>), and only then run tests (<code>exec</code>, <code>port-forward</code>). The status on the chart, such as <code>Pending</code> or <code>CrashLoopBackOff</code>, tells you which department to visit. Treating every sick Pod with "delete it and see" is like giving every patient the same pill.</p>`,
    explain: `<p>Troubleshooting Kubernetes is a short, repeatable ladder. Learn it once and it solves 90% of tickets:</p>
      <ol>
        <li><b><code>kubectl get pods</code></b> (add <code>-o wide</code>, <code>-w</code>, <code>--show-labels</code>): read STATUS, READY and RESTARTS.</li>
        <li><b><code>kubectl describe pod NAME</code></b>: scroll to <b>Events</b> at the bottom. Scheduling, image pull, probe and OOM messages are there.</li>
        <li><b><code>kubectl logs NAME</code></b> (add <code>--previous</code> for the crashed container, <code>-c</code> for a container, <code>-f</code> to follow).</li>
        <li><b><code>kubectl exec -it NAME -- sh</code></b> or <b><code>kubectl debug</code></b> to look from the inside, and <b><code>kubectl port-forward</code></b> to call the app from your laptop.</li>
        <li>Look one level up: the Deployment, ReplicaSet (<code>describe rs</code> shows quota errors) and Service endpoints.</li>
      </ol>
      <p>The status tells you where to start:</p>
      <p>${H.table(['Status', 'Plain meaning', 'First look'], [
        ['<code>Pending</code>', 'no node chosen yet', '<code>describe</code> Events: Insufficient cpu/memory, untolerated taint, unbound volume'],
        ['<code>ImagePullBackOff</code> / <code>ErrImagePull</code>', 'cannot download the image', 'wrong name or tag, private registry without <code>imagePullSecrets</code>, no network'],
        ['<code>CrashLoopBackOff</code>', 'starts, exits, restarts, waits longer each time', '<code>logs --previous</code>, exit code in <code>describe</code>, bad command or config, a liveness probe killing it'],
        ['<code>CreateContainerConfigError</code>', 'cannot assemble the container', 'missing ConfigMap or Secret or key'],
        ['<code>Running</code> but <code>0/1</code>', 'readiness probe failing', 'Events: Readiness probe failed; logs'],
        ['<code>OOMKilled</code> (in Last State)', 'went over its memory limit', 'raise limit or fix the leak'],
        ['<code>Evicted</code>', 'node ran out of memory or disk', '<code>describe node</code> conditions, QoS, requests'],
        ['<code>Terminating</code> for long', 'stuck deletion', 'finalizers, a node that is down, a process ignoring SIGTERM']
      ])}</p>
      <p><b>Everyday kubectl moves.</b> Create YAML fast with <code>kubectl create deployment web --image=nginx:1.27 --dry-run=client -o yaml</code> and edit it. Preview a change with <code>kubectl diff -f</code> and validate with <code>kubectl apply --dry-run=server -f</code>. Query precisely with <code>-o jsonpath</code>, <code>-o custom-columns</code> and label selectors (<code>-l app=web</code>). Use <code>kubectl explain deployment.spec.strategy</code> instead of searching the web. Switch with <code>kubectl config use-context</code> and set a default namespace with <code>kubectl config set-context --current --namespace=NAME</code>. Prefer <b>declarative</b> <code>apply</code> from files in Git over <code>edit</code>/<code>patch</code>/<code>scale</code> on a live cluster, because the file is the record.</p>`,
    clues: [
      '"Pod is CrashLoopBackOff, where do you look?" → <code>kubectl logs --previous</code>, then <code>describe</code> for exit code and probe events',
      '"ImagePullBackOff" → misspelled image or tag, missing pull secret, registry unreachable from the node',
      '"Pending" → read FailedScheduling in Events: resources, taints, node selectors, PVC',
      '"Service works for some requests only" → one Pod unready or crashing; compare endpoints and restarts',
      '"how do you debug a distroless container with no shell?" → <code>kubectl debug -it POD --image=busybox:1.36 --target=CONTAINER</code>',
      '"developer says it worked yesterday" → <code>kubectl rollout history</code>, <code>get events --sort-by=.lastTimestamp</code>, recent apply'
    ],
    code: [SH(R`#!/usr/bin/env bash
# A copy-paste troubleshooting kit. Replace POD and DEPLOY.
set -euo pipefail
POD=web-abc123; DEPLOY=web

kubectl get pods -o wide                                    # status, restarts, node, IP
kubectl describe pod "$POD" | sed -n '/Events:/,$p'         # the reason is almost always here
kubectl logs "$POD" --tail=50                               # current container
kubectl logs "$POD" --previous --tail=50                    # the container that just crashed
kubectl get events --sort-by=.lastTimestamp | tail -n 20    # namespace-wide recent events
kubectl get pod "$POD" -o jsonpath='{.status.containerStatuses[0].lastState}{"\n"}'   # exit code and reason

# Look inside
kubectl exec -it "$POD" -- sh                               # a shell, if the image has one
kubectl debug -it "$POD" --image=busybox:1.36 --target=web  # ephemeral debug container sharing the process space
kubectl port-forward "pod/$POD" 8080:9898                   # call the app from your laptop

# Look up the chain
kubectl rollout status deployment/"$DEPLOY" --timeout=60s
kubectl describe rs -l app="$DEPLOY" | sed -n '/Events:/,$p'   # quota and creation errors appear here
kubectl get endpointslices -l kubernetes.io/service-name="$DEPLOY"
kubectl top pod "$POD"                                      # needs metrics-server

# Change safely
kubectl diff -f deploy.yaml || true                         # exit code 1 simply means "there are differences"
kubectl apply --dry-run=server -f deploy.yaml               # real validation, nothing stored
kubectl rollout undo deployment/"$DEPLOY"                   # fastest rollback`, 'The troubleshooting ladder'),
      SH(R`#!/usr/bin/env bash
set -euo pipefail
# Read the built-in docs instead of searching the web
kubectl explain deployment.spec.strategy.rollingUpdate
kubectl explain pod.spec.containers.livenessProbe --recursive | head -n 30
kubectl api-resources --namespaced=true | head -n 15

# Contexts and namespaces
kubectl config get-contexts
kubectl config use-context kind-lab
kubectl config set-context --current --namespace=team-a
kubectl get pods -A                                          # all namespaces
kubectl get pods --all-namespaces --field-selector=status.phase!=Running   # only unhealthy ones

# Generate YAML instead of typing it
kubectl create deployment web --image=nginx:1.27 --replicas=2 --dry-run=client -o yaml > web.yaml
kubectl expose deployment web --port=80 --dry-run=client -o yaml > web-svc.yaml
kubectl run tmp --rm -it --restart=Never --image=busybox:1.36 -- nslookup kubernetes.default   # DNS test from inside

# Tidy output
kubectl get pods -o custom-columns=NAME:.metadata.name,NODE:.spec.nodeName,STATUS:.status.phase
kubectl get deploy web -o jsonpath='{.spec.template.spec.containers[*].image}{"\n"}'
kubectl wait --for=condition=available deployment/web --timeout=90s`, 'Everyday kubectl: explain, contexts, dry-run, output')],
    codeTitle: ['A troubleshooting kit', 'Everyday kubectl'],
    viz: [{
      title: 'Triage a Pod by its STATUS',
      input: 'CrashLoopBackOff',
      inputLabel: 'a Pod status: Pending, ImagePullBackOff, CrashLoopBackOff, CreateContainerConfigError, NotReady, OOMKilled',
      gen: function (input) {
        var db = {
          pending: ['Pending', 'The scheduler has not placed the Pod on a node.', 'kubectl describe pod POD', 'Events show <code>0/3 nodes are available: 3 Insufficient cpu</code> or <code>had untolerated taint</code>.', ['requests bigger than free capacity', 'a taint the Pod does not tolerate', 'nodeSelector or affinity matches no node', 'a PersistentVolumeClaim that is not bound'], 'Lower requests, add capacity, add a toleration, or fix the selector. Re-check with <code>kubectl get pod -w</code>.'],
          imagepullbackoff: ['ImagePullBackOff', 'The node tried to download the image, failed, and now waits longer between retries.', 'kubectl describe pod POD', 'Events show <code>Failed to pull image ... not found</code> or <code>pull access denied</code>.', ['typo in the image name or tag', 'private registry without imagePullSecrets', 'tag deleted or never pushed', 'node cannot reach the registry (kind: image not loaded)'], 'Fix the reference, create a pull secret (<code>kubectl create secret docker-registry</code>), or <code>kind load docker-image</code> for local images.'],
          crashloopbackoff: ['CrashLoopBackOff', 'The container starts, exits quickly, and Kubernetes waits longer (10 s, 20 s... up to 5 min) before each restart.', 'kubectl logs POD --previous', 'The last lines of the crashed run show the real error; <code>describe</code> shows the exit code.', ['app error or missing config at start (exit 1)', 'wrong command or entrypoint (exit 127 or 126)', 'OOM kill (exit 137)', 'liveness probe killing a slow-starting app', 'port already in use or bad permissions'], 'Fix the cause in the manifest or image, not the Pod. Test locally with the same image and env.'],
          createcontainerconfigerror: ['CreateContainerConfigError', 'The image is pulled, but the container cannot be created from the Pod spec.', 'kubectl describe pod POD', 'Events show <code>secret "db-creds" not found</code> or <code>couldn\'t find key X in ConfigMap</code>.', ['Secret or ConfigMap missing', 'wrong key name', 'object lives in another namespace', 'invalid securityContext (runAsNonRoot with a root image)'], 'Create the object in the same namespace or fix the reference. The Pod starts by itself afterwards.'],
          notready: ['Running 0/1 (NotReady)', 'The container runs, but its readiness probe fails, so the Pod gets no traffic. During a rollout this stalls the update.', 'kubectl describe pod POD', 'Events show <code>Readiness probe failed: HTTP probe failed with statuscode: 404</code> or <code>connection refused</code>.', ['wrong probe path or port', 'app slow to warm up (needs a startup probe)', 'dependency down', 'probe timeout too short'], 'Fix the probe or the app. If a release is the cause: <code>kubectl rollout undo deployment/NAME</code>.'],
          oomkilled: ['OOMKilled', 'The container used more memory than its limit and the kernel killed it (exit code 137).', 'kubectl describe pod POD', '<code>Last State: Terminated, Reason: OOMKilled, Exit Code: 137</code> and a rising RESTARTS count.', ['limit lower than real working set', 'memory leak', 'runtime not told about the limit (JVM heap, Node old space)', 'one big request or batch'], 'Measure with <code>kubectl top</code>, raise the limit with margin, set runtime memory flags, fix leaks.']
        };
        var key = String(input || '').trim().toLowerCase().replace(/[^a-z]/g, '');
        if (key === 'errimagepull') key = 'imagepullbackoff';
        if (!db.hasOwnProperty(key)) throw new Error('Try one of: Pending, ImagePullBackOff, CrashLoopBackOff, CreateContainerConfigError, NotReady, OOMKilled');
        var d = db[key];
        return [
          { narr: '<b>' + d[0] + '</b>: ' + d[1], parts: [{ type: 'vars', vals: { status: d[0] }, hl: { status: 'bad' } }] },
          { narr: 'Step 1: run <code>' + d[2] + '</code>.', parts: [{ type: 'code', label: 'command', lang: 'bash', code: d[2], hl: { 1: 'cur' } }] },
          { narr: 'Step 2: read the result. ' + d[3], parts: [{ type: 'text', html: d[3] }] },
          { narr: 'Step 3: match it to the usual causes.', parts: [{ type: 'set', label: 'usual causes', items: d[4] }] },
          { narr: 'Step 4: fix it at the source and verify. ' + d[5], parts: [{ type: 'text', html: d[5] }, { type: 'code', label: 'verify', lang: 'bash', code: 'kubectl get pods -w\nkubectl rollout status deployment/NAME', hl: { 1: 'ok' } }] }
        ];
      }
    }],
    examples: [
      { title: 'ImagePullBackOff, step by step', html: `<pre>$ kubectl get pods
NAME                   READY   STATUS             RESTARTS   AGE
web-7d4b9c8f6-q2x9k    0/1     ImagePullBackOff   0          2m
$ kubectl describe pod web-7d4b9c8f6-q2x9k | tail -n 4
  Warning  Failed   Failed to pull image "nginx:1.277": ... manifest unknown
  Warning  Failed   Error: ErrImagePull
  Normal   BackOff  Back-off pulling image "nginx:1.277"</pre><p>A tag typo (<code>1.277</code>). Fix the Deployment image, <code>kubectl apply</code>, and the rollout creates a good Pod. In kind, an image you built locally is <b>not</b> visible to the nodes: run <code>kind load docker-image myapp:dev --name lab</code> and use <code>imagePullPolicy: IfNotPresent</code> with a non-<code>latest</code> tag.</p>` },
      { title: 'CrashLoopBackOff, step by step', html: `<pre>$ kubectl logs api-5c9d7f6b8-m4t2z --previous
Error: environment variable DATABASE_URL is required
$ kubectl get pod api-5c9d7f6b8-m4t2z -o jsonpath='{.status.containerStatuses[0].lastState.terminated.exitCode}'
1</pre><p>Exit code 1 and a clear message: the app needs <code>DATABASE_URL</code>. Add it from a ConfigMap or Secret and re-apply. Exit code <b>127</b> means "command not found" (wrong <code>command</code>/<code>args</code>), <b>126</b> "not executable", <b>137</b> a kill (OOM or liveness), <b>143</b> a normal SIGTERM stop.</p>` },
      { title: 'Rollout stuck at 1 of 3, solved in five commands', html: `${H.table(['#', 'Command', 'Finding'], [
        ['1', '<code>kubectl rollout status deploy/web</code>', '"1 out of 3 new replicas have been updated"'],
        ['2', '<code>kubectl get pods -l app=web</code>', 'one new Pod <code>Running 0/1</code>, two old Pods <code>1/1</code>'],
        ['3', '<code>kubectl describe pod NEW</code>', '"Readiness probe failed: statuscode: 404"'],
        ['4', '<code>kubectl rollout undo deploy/web</code>', 'users are safe again within seconds'],
        ['5', 'fix <code>readinessProbe.httpGet.path</code> in Git, then apply', 'a good rollout goes through']
      ])}<p>Rollback first, root-cause second.</p>` }
    ],
    deepDive: `<p>🟣 <b>Where messages come from.</b> Events are objects with a short life (about an hour). <code>kubectl describe</code> merges the object with its events. If an event is already gone, use <code>kubectl get events --sort-by=.lastTimestamp</code> soon after a failure, or ship events to your logging stack. Pod <code>status.conditions</code> (<code>PodScheduled</code>, <code>Initialized</code>, <code>ContainersReady</code>, <code>Ready</code>) are a fast way to see which stage failed.</p>
      <p>🟣 <b>Back-off.</b> After each crash the kubelet waits 10 s, 20 s, 40 s... up to 5 minutes (<code>CrashLoopBackOff</code>), and resets after 10 minutes of stable running. So "it will retry soon" is false after a few crashes: a corrected manifest triggers a new rollout, while <code>kubectl delete pod</code> only resets the timer.</p>
      <p>🟣 <b>Debugging minimal images.</b> Distroless and scratch images have no shell. <code>kubectl debug -it POD --image=busybox:1.36 --target=app</code> adds an <b>ephemeral container</b> that shares the target's process namespace so you can see its processes and files at <code>/proc/PID/root</code>. <code>kubectl debug node/NAME -it --image=busybox:1.36</code> gives a shell on a node (the host filesystem is mounted at <code>/host</code>). In production these powers need strong RBAC and an audit trail.</p>
      <p>🟣 <b>Apply semantics.</b> <code>kubectl apply</code> stores the last applied configuration and merges three ways (last applied, live, new). <code>--server-side</code> apply tracks field ownership on the server and is the modern choice for tools and GitOps (<code>--force-conflicts</code> takes fields from another manager). <code>kubectl replace</code> overwrites; <code>patch</code> changes selected fields; <code>edit</code> opens the live object. Mixing imperative edits with GitOps leads to "drift" where Git and the cluster disagree.</p>
      <p>🟣 <b>Production reality.</b> Real incidents add dashboards, logs and traces, but the ladder above still starts every investigation. Write the commands in a runbook, practise on a kind cluster by breaking things on purpose (a wrong tag, a bad probe, a tiny memory limit), and keep an eye on the blast radius: <code>kubectl delete</code> with a label selector in the wrong namespace is a classic outage.</p>`,
    aiEra: `<p>🤖 <b>What AI changes.</b> Pasting <code>kubectl describe</code> output into an assistant is now the fastest first-pass triage, and agent tools can run the ladder for you. Some teams connect AI to read-only cluster access to summarise incidents.</p>
      <p><b>Use AI as a partner:</b> paste the Events section plus <code>logs --previous</code> and ask for ranked hypotheses and the single command that would confirm each. Then run that command yourself.</p>
      <p><b>Where AI goes wrong:</b> it suggests "delete the Pod" (hides the cause), <code>kubectl apply --force</code>, or privileged debug Pods. It may describe a log line that is not in your output. If an agent has write access, a confident wrong fix runs at machine speed. <b>You still own:</b> read-only access by default, confirming a diagnosis with evidence, and the rollback decision.</p>`,
    problems: [P({
      t: 'One Deployment, two different failures', l: 'Medium', tags: ['troubleshooting', 'ImagePullBackOff', 'CrashLoopBackOff', 'kubectl'], co: ['Amazon', 'Rackspace', 'HCLTech'],
      s: `<p>On a kind cluster, apply the manifest below. Two Deployments will not become healthy: <code>shop-web</code> (status <code>ImagePullBackOff</code>) and <code>shop-worker</code> (<code>CrashLoopBackOff</code>). For each, write the exact commands you run in order, quote the evidence you expect to see, name the root cause, and give the corrected YAML or command. Do not delete Pods as a fix.</p>`,
      ex: `<p>Expected evidence: ${H.c('r', 'Failed to pull image "nginx:1.277": manifest unknown')} for the web Deployment, and ${H.c('r', 'sh: 1: nonexistent-command: not found')} with exit code ${H.c('y', '127')} for the worker.</p>`,
      bw: `<p>Run <code>kubectl delete pod --all</code> "to refresh", or re-apply the same file repeatedly. The Deployment recreates identical broken Pods, the back-off timer restarts, and you learned nothing new.</p>`,
      q: ['A container exits with code 127. What does that most likely mean?', ['The command in the container is not found', 'It was OOMKilled', 'It received SIGTERM and stopped normally', 'The liveness probe failed'], 0, '127 is the shell\'s "command not found". OOM is 137 and a normal SIGTERM stop is 143.'],
      h: ['<p>Hint 1: <code>kubectl get pods</code> shows which status each Deployment has; the status picks the first command.</p>', '<p>Hint 2: ImagePullBackOff evidence is in <code>describe</code> Events; CrashLoopBackOff evidence is in <code>logs --previous</code> and the exit code.</p>', '<p>Hint 3: fix the Deployment template (image tag, command) and apply; watch with <code>rollout status</code>.</p>'],
      a: `<p>Follow the ladder. For web: <code>get pods</code> shows ImagePullBackOff, <code>describe pod</code> Events say the tag <code>1.277</code> does not exist. Fix the tag to <code>1.27</code>. For worker: <code>get pods</code> shows CrashLoopBackOff, <code>logs --previous</code> prints "not found", and the exit code is 127. The container command is wrong; replace it with a valid command. Always change the Deployment template (a new rollout), never the single Pod.</p>`,
      code: SH(R`#!/usr/bin/env bash
set -euo pipefail
cat > shop-broken.yaml <<'YAML'
apiVersion: apps/v1
kind: Deployment
metadata: { name: shop-web }
spec:
  replicas: 1
  selector: { matchLabels: { app: shop-web } }
  template:
    metadata: { labels: { app: shop-web } }
    spec:
      containers:
        - name: web
          image: nginx:1.277            # BUG: tag does not exist
---
apiVersion: apps/v1
kind: Deployment
metadata: { name: shop-worker }
spec:
  replicas: 1
  selector: { matchLabels: { app: shop-worker } }
  template:
    metadata: { labels: { app: shop-worker } }
    spec:
      containers:
        - name: worker
          image: busybox:1.36
          command: ["sh", "-c", "nonexistent-command"]   # BUG: command does not exist
YAML
kubectl apply -f shop-broken.yaml
sleep 20
kubectl get pods                                              # ImagePullBackOff and CrashLoopBackOff

# shop-web
WEB="$(kubectl get pod -l app=shop-web -o jsonpath='{.items[0].metadata.name}')"
kubectl describe pod "$WEB" | sed -n '/Events:/,$p'           # manifest unknown for nginx:1.277
kubectl set image deployment/shop-web web=nginx:1.27
kubectl rollout status deployment/shop-web --timeout=90s

# shop-worker
WORKER="$(kubectl get pod -l app=shop-worker -o jsonpath='{.items[0].metadata.name}')"
kubectl logs "$WORKER" --previous                             # nonexistent-command: not found
kubectl get pod "$WORKER" -o jsonpath='{.status.containerStatuses[0].lastState.terminated.exitCode}{"\n"}'   # 127
kubectl patch deployment shop-worker --type=json -p '[{"op":"replace","path":"/spec/template/spec/containers/0/command","value":["sh","-c","while true; do echo working; sleep 10; done"]}]'
kubectl rollout status deployment/shop-worker --timeout=90s
kubectl get pods`),
      cx: `<p>Two minutes of reading evidence beats any amount of random restarts. Cost is zero on kind.</p>`,
      f: ['How would the symptoms differ if the registry required a login?', 'When would you choose <code>kubectl rollout undo</code> instead of fixing forward?']
    })]
  });

  // ───────────────────────── Practice: Easy ─────────────────────────
  var PYC = '<p>Pure computation, Python 3 standard library only. The model answer for the real task is the YAML/kubectl snippet; the Python function is tested.</p>';

  practice.push(P({
    t: 'Read the quantity: 500m, 256Mi, 1G', l: 'Easy', tags: ['resources', 'units', 'python'], co: ['Amazon', 'TCS', 'Accenture'], c: PYC,
    s: `<p>A teammate wrote <code>memory: 512M</code> and the Pod is OOMKilled earlier than expected; another wrote <code>cpu: 0.5</code> and asked if it equals <code>500m</code>. Write <code>parse_quantity(kind, q)</code> in Python. For <code>kind = "cpu"</code> return millicores; for <code>kind = "memory"</code> return bytes (rounded up). CPU accepts <code>500m</code>, <code>2</code>, <code>0.5</code>. Memory accepts a plain number or a number with <code>Ki Mi Gi Ti</code> (powers of 1024) or <code>K M G T</code> (powers of 1000), and decimals such as <code>1.5Gi</code>. Return <code>-1</code> for anything else (unknown kind, negative numbers, unknown suffix, <code>500m</code> for memory). Then write a Pod where the memory limit is exactly 256 MiB and show how to confirm what Kubernetes stored.</p>`,
    ex: `<p><code>parse_quantity("cpu", "0.5")</code> → ${H.c('g', '500')}; <code>parse_quantity("memory", "256Mi")</code> → ${H.c('g', '268435456')}; <code>parse_quantity("memory", "256M")</code> → ${H.c('y', '256000000')} (about 12 MiB less, which is why Mi is safer); <code>parse_quantity("memory", "10Xi")</code> → ${H.c('r', '-1')}.</p>`,
    bw: `<p>Strip the last two letters and multiply by 1,000,000. That mishandles <code>1Gi</code> vs <code>1G</code>, plain numbers, decimals and the <code>m</code> suffix, so a limit like <code>512M</code> and <code>512Mi</code> are silently treated as the same.</p>`,
    bc: PY(`def parse_quantity(kind, q):
    return int(q[:-2]) * 1000000          # wrong for cpu, 1G, 1500, 0.5, ...`, 'naive'),
    q: ['Which is larger: <code>1G</code> or <code>1Gi</code> of memory?', ['1Gi (1,073,741,824 bytes)', '1G (1,000,000,000 bytes)', 'They are identical', 'It depends on the node'], 0, 'The i suffixes are powers of 1024, plain letters are powers of 1000. Prefer Mi and Gi in manifests.'],
    h: ['<p>Hint 1: split the text into a number part and an optional suffix with a regular expression.</p>', '<p>Hint 2: use <code>fractions.Fraction</code> for decimals so 1.5Gi is exact, then round up with <code>math.ceil</code>.</p>', '<p>Hint 3: CPU suffix can only be <code>m</code>; memory suffix is one of the eight units. Everything else returns -1.</p>'],
    a: `<p>Kubernetes quantities are a number plus an optional unit. For CPU, no suffix means whole cores (so multiply by 1000 to get millicores) and <code>m</code> means thousandths. For memory, binary suffixes are powers of 1024 and decimal suffixes are powers of 1000. Fractions are rounded up, as the API server does. Confirm what was stored with <code>kubectl get pod NAME -o jsonpath='{.spec.containers[0].resources}'</code>.</p>`,
    code: Y(R`apiVersion: v1
kind: Pod
metadata:
  name: exact-limit
spec:
  containers:
    - name: app
      image: nginx:1.27
      resources:
        requests:
          cpu: 250m              # a quarter of a core
          memory: 128Mi
        limits:
          memory: 256Mi          # 256 * 1024 * 1024 = 268435456 bytes
# Check:  kubectl get pod exact-limit -o jsonpath='{.spec.containers[0].resources.limits.memory}'
# Inside the container (cgroup v2):  kubectl exec exact-limit -- cat /sys/fs/cgroup/memory.max   -> 268435456`),
    alt: [PY(R`import math
import re
from fractions import Fraction

_UNITS = {"Ki": 1024, "Mi": 1024 ** 2, "Gi": 1024 ** 3, "Ti": 1024 ** 4,
          "K": 1000, "M": 1000 ** 2, "G": 1000 ** 3, "T": 1000 ** 4}


def parse_quantity(kind, q):
    q = q.strip()
    if kind == "cpu":
        milli = re.fullmatch(r"([0-9]+)m", q)
        if milli:
            return int(milli.group(1))
        if re.fullmatch(r"[0-9]+(\.[0-9]+)?", q):
            return math.ceil(Fraction(q) * 1000)      # whole or fractional cores
        return -1
    if kind == "memory":
        m = re.fullmatch(r"([0-9]+(?:\.[0-9]+)?)(Ki|Mi|Gi|Ti|K|M|G|T)?", q)
        if not m:
            return -1
        factor = _UNITS[m.group(2)] if m.group(2) else 1
        return math.ceil(Fraction(m.group(1)) * factor)
    return -1`, 'parse_quantity (tested)')],
    cx: `<p>O(length of the text).</p>`,
    f: ['What does the API server do with <code>cpu: 0.0005</code>? (it rounds up to 1m)', 'Why do many teams write memory only with Mi and Gi?'],
    tests: { sig: 'string string -> long', fn: 'parseQuantity', cases: [
        [['cpu', '500m'], 500],
        [['cpu', '2'], 2000],
        [['cpu', '0.5'], 500],
        [['cpu', '100m'], 100],
        [['cpu', '1.5'], 1500],
        [['cpu', '0.0005'], 1],
        [['cpu', '1Gi'], -1],
        [['cpu', ''], -1],
        [['cpu', '-1'], -1],
        [['cpu', '0'], 0],
        [['memory', '256Mi'], 268435456],
        [['memory', '1Gi'], 1073741824],
        [['memory', '128M'], 128000000],
        [['memory', '1G'], 1000000000],
        [['memory', '1500'], 1500],
        [['memory', '1.5Gi'], 1610612736],
        [['memory', '500m'], -1],
        [['memory', '2Ti'], 2199023255552],
        [['memory', '10Xi'], -1],
        [['memory', '-5Mi'], -1],
        [['memory', '0'], 0],
        [['disk', '1Gi'], -1]
    ] }
  }));

  practice.push(P({
    t: 'Your first app on minikube: Deployment, Service, browser', l: 'Easy', tags: ['minikube', 'deployment', 'service', 'port-forward'],  co: ['Infosys', 'Cognizant', 'Deloitte'],
    s: `<p>Start a local cluster with minikube (kind works too), run an <code>nginx</code> Deployment with 2 replicas, expose it with a Service, and open it in your browser two different ways: <code>kubectl port-forward</code> and a NodePort (via <code>minikube service</code>). Scale to 4 replicas, update the image to a newer tag, watch the rollout, and delete everything. Write the commands and the manifest.</p>`,
    ex: `<p>After <code>kubectl apply</code> you expect ${H.c('g', 'deployment.apps/hello created')} and <code>kubectl get pods</code> shows two Pods <code>1/1 Running</code>; <code>curl localhost:8080</code> through the port-forward returns the nginx welcome page.</p>`,
    bw: `<p>Run <code>kubectl run</code> for a single bare Pod and a hand-typed IP. When the Pod dies nothing replaces it, and its IP changes, so the "app" disappears.</p>`,
    q: ['Which command reaches a Service from your laptop without creating anything public?', ['<code>kubectl port-forward svc/hello 8080:80</code>', '<code>kubectl expose --type=LoadBalancer</code>', '<code>kubectl delete svc</code>', '<code>kubectl taint nodes</code>'], 0, 'port-forward opens a tunnel from a local port through the API server to the Service or Pod. It exists only while the command runs.'],
    h: ['<p>Hint 1: <code>minikube start --driver=docker</code> and check <code>kubectl get nodes</code>.</p>', '<p>Hint 2: a Deployment needs matching selector and template labels, a Service selects those labels.</p>', '<p>Hint 3: <code>kubectl rollout status</code> proves a change finished; <code>minikube delete</code> removes the whole cluster.</p>'],
    a: `<p>The Deployment keeps two Pods alive; the Service gives them one stable address and balances over the ready ones. port-forward is the safest way to test, NodePort shows how outside traffic enters a node, and an image bump demonstrates a rolling update with nothing for users to notice.</p>`,
    code: SH(R`#!/usr/bin/env bash
set -euo pipefail
minikube start --driver=docker -p lab                         # or: kind create cluster --name lab
kubectl config use-context lab                                # minikube names the context after the profile
kubectl get nodes

cat > hello.yaml <<'YAML'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hello
spec:
  replicas: 2
  selector:
    matchLabels: { app: hello }
  template:
    metadata:
      labels: { app: hello }
    spec:
      containers:
        - name: nginx
          image: nginx:1.26
          ports: [{ containerPort: 80 }]
          readinessProbe:
            httpGet: { path: /, port: 80 }
          resources:
            requests: { cpu: 25m, memory: 32Mi }
            limits: { memory: 64Mi }
---
apiVersion: v1
kind: Service
metadata:
  name: hello
spec:
  type: NodePort
  selector: { app: hello }
  ports:
    - port: 80
      targetPort: 80
YAML
kubectl apply -f hello.yaml
kubectl rollout status deployment/hello
kubectl get deploy,pods,svc -l app=hello

kubectl port-forward svc/hello 8080:80 &                      # way 1: tunnel
sleep 2; curl -s localhost:8080 | head -n 4; kill %1
minikube service hello -p lab --url                           # way 2: NodePort URL (kind: use a node IP and port from kubectl get svc)

kubectl scale deployment/hello --replicas=4                   # imperative, fine for a lab
kubectl set image deployment/hello nginx=nginx:1.27           # a rolling update
kubectl rollout status deployment/hello
kubectl rollout history deployment/hello

kubectl delete -f hello.yaml
minikube delete -p lab`),
    cx: `<p>About 3 minutes and around 2 GB of RAM. Nothing leaves your laptop and nothing is billed.</p>`,
    f: ['What would you change to make the Service reachable on a stable port from your laptop in kind?', 'How does the rollout differ if you set the image to a tag that does not exist?']
  }));

  practice.push(P({
    t: 'Local image, ImagePullBackOff, and kind load', l: 'Easy', tags: ['imagepullbackoff', 'kind', 'docker', 'images'], co: ['Red Hat', 'Wipro', 'IBM'],
    s: `<p>You built <code>shop-api:dev</code> with Docker (devops08) and applied a Deployment that uses it. The Pod shows <code>ErrImagePull</code> then <code>ImagePullBackOff</code>, although <code>docker images</code> lists the image. Explain why, then fix it for kind and for minikube, and say which <code>imagePullPolicy</code> and tag choice avoid the problem. Include a short note on pulling from a private registry with an <code>imagePullSecret</code> created from placeholders.</p>`,
    ex: `<p>Events: ${H.c('r', 'Failed to pull image "shop-api:dev": ... pull access denied, repository does not exist or may require authorization')}. The kind node is a separate container with its own image store, so it cannot see your host's Docker images.</p>`,
    bw: `<p>Push the image to Docker Hub as a public repo to make the error go away. That publishes private code and still leaves you with a mutable tag.</p>`,
    q: ['Why can a kind node not find an image you just built with Docker?', ['The node has its own container runtime and image store', 'kind only supports Docker Hub images', 'Docker images need a Service first', 'The image name is lower case'], 0, 'kind nodes are containers running containerd. Load images into them with <code>kind load docker-image</code> (minikube: <code>minikube image load</code>).'],
    h: ['<p>Hint 1: read the Events in <code>kubectl describe pod</code>; it tells you which image and why.</p>', '<p>Hint 2: <code>kind load docker-image shop-api:dev --name lab</code> copies the image into every node.</p>', '<p>Hint 3: with tag <code>latest</code> the default policy is Always (tries to pull); with another tag it is IfNotPresent. Use a real version tag.</p>'],
    a: `<p>Each node pulls images itself from a registry. A local Docker image is only visible to the Docker daemon on your laptop, not to the node containers. Load the image into the nodes, use a non-<code>latest</code> tag with <code>imagePullPolicy: IfNotPresent</code>, and for real registries create a docker-registry Secret and reference it from the Pod spec or the ServiceAccount.</p>`,
    code: SH(R`#!/usr/bin/env bash
set -euo pipefail
cat > Dockerfile <<'DOCKERFILE'
FROM nginx:1.27
RUN echo "shop-api dev build" > /usr/share/nginx/html/index.html
DOCKERFILE
docker build -t shop-api:dev .

kubectl create deployment shop-api --image=shop-api:dev --dry-run=client -o yaml > shop-api.yaml
kubectl apply -f shop-api.yaml
kubectl get pods                                              # ErrImagePull / ImagePullBackOff
kubectl describe pod -l app=shop-api | sed -n '/Events:/,$p'

# kind
kind load docker-image shop-api:dev --name lab
# minikube alternative:  minikube image load shop-api:dev -p lab
kubectl patch deployment shop-api --type=json -p '[{"op":"add","path":"/spec/template/spec/containers/0/imagePullPolicy","value":"IfNotPresent"}]'
kubectl rollout status deployment/shop-api

# Private registry: placeholders only, never real credentials in files or history
read -rsp "Registry token: " REG_TOKEN; echo
kubectl create secret docker-registry regcred \
  --docker-server=registry.example.com \
  --docker-username='<REGISTRY_USER>' \
  --docker-password="$REG_TOKEN"
unset REG_TOKEN
kubectl patch serviceaccount default -p '{"imagePullSecrets":[{"name":"regcred"}]}'`),
    cx: `<p>One command moves an image into a kind node. In a real cluster, push to a registry instead.</p>`,
    f: ['Why is an immutable tag or a digest better than <code>dev</code> for repeatable deploys?', 'Where would you point a cluster at a registry mirror to avoid Docker Hub rate limits?']
  }));

  // ───────────────────────── Practice: Medium ─────────────────────────
  practice.push(P({
    t: 'Why is my Pod Pending? Simulate the scheduler', l: 'Medium', tags: ['scheduler', 'pending', 'taints', 'python'], co: ['Google', 'Nutanix', 'Oracle'], c: PYC,
    s: `<p>Three Pods stay <code>Pending</code> and nobody knows why. Write <code>schedule_pods(nodes, pods)</code> in Python that mimics a simple scheduler. Each node is <code>"name:cpu:memory:taint"</code> (taint may be empty), each Pod is <code>"name:cpuRequest:memRequest:tolerates"</code> (a Pod tolerates at most one taint key; empty means none). Quantities use the Kubernetes formats (<code>500m</code>, <code>2</code>, <code>256Mi</code>, <code>4Gi</code>). Place Pods in the given order on the <b>first</b> node (in list order) that is not blocked by an untolerated taint and has enough free CPU <b>and</b> memory; subtract the request. Return one string per Pod: <code>"pod-&gt;node"</code> or <code>"pod-&gt;Pending(reason)"</code>. Reason: <code>taint</code> if every node is blocked by a taint, otherwise <code>cpu</code> if no unblocked node has enough CPU, otherwise <code>memory</code>. Then show the kubectl commands that find the same reason on a real cluster.</p>`,
    ex: `<p>Nodes <code>["n1:2:4Gi:", "n2:1:2Gi:", "n3:4:8Gi:gpu"]</code>, Pods <code>["a:1:1Gi:", "b:1500m:1Gi:", "c:3:2Gi:gpu"]</code> → ${H.c('g', '["a->n1", "b->Pending(cpu)", "c->n3"]')}. b needs 1.5 CPU but n1 has 1 left, n2 has 1, and n3 is tainted.</p>`,
    bw: `<p>Add another worker node every time a Pod is Pending. If the cause is a taint, a nodeSelector or a huge request, the new node changes nothing and the bill grows.</p>`,
    q: ['The scheduler says <code>0/3 nodes are available: 3 Insufficient memory</code> although the nodes are using little memory. Why?', ['It compares the Pod\'s request with allocatable minus other Pods\' requests, not real usage', 'Memory is always reserved for the system', 'The nodes are all in another namespace', 'The scheduler counts limits, not requests'], 0, 'Placement uses requests. Idle but heavily requested nodes look full.'],
    h: ['<p>Hint 1: convert CPU to millicores and memory to bytes once, up front.</p>', '<p>Hint 2: for each Pod, scan nodes in order: skip tainted nodes the Pod does not tolerate; the first with enough of both wins.</p>', '<p>Hint 3: for the Pending reason, look at the nodes that were not blocked by taints: does any have enough CPU? If not it is cpu, else memory. If none is unblocked, it is taint.</p>'],
    a: `<p>The scheduler first <b>filters</b> nodes (taints, selectors, free requests) and then <b>scores</b> the survivors; this model uses only the filters and picks the first fit. The Pending reason in a real cluster is printed in Events: <code>FailedScheduling</code>. Read it, compare with <code>kubectl describe node</code> "Allocated resources", and fix the actual constraint: smaller requests, a toleration, or capacity.</p>`,
    code: SH(R`#!/usr/bin/env bash
set -euo pipefail
kubectl get pods --field-selector=status.phase=Pending       # which Pods are stuck
kubectl describe pod big-job | sed -n '/Events:/,$p'         # FailedScheduling: 0/3 nodes are available: ...
kubectl describe nodes | grep -E 'Name:|Taints:|cpu |memory '   # taints, and requested vs allocatable
kubectl get nodes -o custom-columns=NAME:.metadata.name,CPU:.status.allocatable.cpu,MEM:.status.allocatable.memory
kubectl get pod big-job -o jsonpath='{.spec.containers[*].resources.requests}{"\n"}'

# Fix options (pick by evidence):
kubectl patch deployment big-job --type=json -p '[{"op":"replace","path":"/spec/template/spec/containers/0/resources/requests/cpu","value":"250m"}]'
kubectl taint nodes lab-worker dedicated=batch:NoSchedule    # how a taint is created...
kubectl taint nodes lab-worker dedicated=batch:NoSchedule-   # ...and removed (the trailing minus)`),
    alt: [PY(R`import math
import re
from fractions import Fraction

_UNITS = {"Ki": 1024, "Mi": 1024 ** 2, "Gi": 1024 ** 3, "Ti": 1024 ** 4,
          "K": 1000, "M": 1000 ** 2, "G": 1000 ** 3, "T": 1000 ** 4}


def _cpu(q):
    m = re.fullmatch(r"([0-9]+)m", q)
    if m:
        return int(m.group(1))
    return math.ceil(Fraction(q) * 1000)


def _mem(q):
    m = re.fullmatch(r"([0-9]+(?:\.[0-9]+)?)(Ki|Mi|Gi|Ti|K|M|G|T)?", q)
    return math.ceil(Fraction(m.group(1)) * (_UNITS[m.group(2)] if m.group(2) else 1))


def schedule_pods(nodes, pods):
    free = []
    for item in nodes:
        name, cpu, mem, taint = item.split(":")
        free.append({"name": name, "cpu": _cpu(cpu), "mem": _mem(mem), "taint": taint})
    result = []
    for item in pods:
        name, cpu, mem, tolerates = item.split(":")
        need_cpu, need_mem = _cpu(cpu), _mem(mem)
        usable = [n for n in free if not n["taint"] or n["taint"] == tolerates]
        chosen = None
        for node in usable:                           # list order = first fit
            if node["cpu"] >= need_cpu and node["mem"] >= need_mem:
                chosen = node
                break
        if chosen:
            chosen["cpu"] -= need_cpu
            chosen["mem"] -= need_mem
            result.append(name + "->" + chosen["name"])
        elif not usable:
            result.append(name + "->Pending(taint)")
        elif not any(n["cpu"] >= need_cpu for n in usable):
            result.append(name + "->Pending(cpu)")
        else:
            result.append(name + "->Pending(memory)")
    return result`, 'schedule_pods (tested)')],
    cx: `<p>O(P x N) for P Pods and N nodes. The real scheduler is also O(P x N) with sampling on huge clusters, plus scoring and preemption.</p>`,
    f: ['What does preemption do when a high-priority Pod cannot be placed? (evicts lower-priority Pods)', 'How would a PersistentVolumeClaim in another zone make a Pod Pending?'],
    tests: { sig: 'string[] string[] -> string[]', fn: 'schedulePods', cases: [
        [[['n1:2:4Gi:', 'n2:1:2Gi:', 'n3:4:8Gi:gpu'], ['a:1:1Gi:', 'b:1500m:1Gi:', 'c:3:2Gi:gpu', 'd:1:1Gi:', 'e:8:1Gi:']], ['a->n1', 'b->Pending(cpu)', 'c->n3', 'd->n1', 'e->Pending(cpu)']],
        [[['n1:1:1Gi:'], ['a:500m:512Mi:', 'b:500m:512Mi:', 'c:100m:1Mi:']], ['a->n1', 'b->n1', 'c->Pending(cpu)']],
        [[['n1:2:2Gi:'], ['big:1:3Gi:', 'ok:1:1Gi:']], ['big->Pending(memory)', 'ok->n1']],
        [[['cp:2:4Gi:control', 'w1:1:1Gi:'], ['a:500m:256Mi:', 'b:2:1Gi:', 'c:2:1Gi:control']], ['a->w1', 'b->Pending(cpu)', 'c->cp']],
        [[['w1:4:8Gi:', 'w2:4:8Gi:'], ['a:3:1Gi:', 'b:3:1Gi:', 'c:3:1Gi:', 'd:1:6Gi:', 'e:1:7Gi:']], ['a->w1', 'b->w2', 'c->Pending(cpu)', 'd->w1', 'e->w2']],
        [[['w1:1:1Gi:gpu'], ['a:100m:100Mi:']], ['a->Pending(taint)']],
        [[['w1:1:1Gi:gpu'], ['a:100m:100Mi:gpu', 'b:100m:100Mi:ssd']], ['a->w1', 'b->Pending(taint)']],
        [[['w1:1500m:2Gi:', 'w2:500m:4Gi:'], ['a:1:1Gi:', 'b:1:1Gi:', 'c:500m:3Gi:', 'd:500m:1Gi:']], ['a->w1', 'b->Pending(cpu)', 'c->w2', 'd->w1']],
        [[['w1:1:1Gi:'], []], []]
    ] }
  }));

  practice.push(P({
    t: 'Namespace quota: who gets rejected?', l: 'Medium', tags: ['resourcequota', 'namespace', 'python'], co: ['VMware', 'Atlassian', 'Capgemini'], c: PYC,
    s: `<p>The team-a namespace has a ResourceQuota. Write <code>quota_check(quota, pods)</code> in Python. <code>quota</code> is a list like <code>["pods=3", "cpu=2", "memory=4Gi"]</code> (any subset; a resource not listed is unlimited). <code>pods</code> is a list of <code>"name:cpuRequest:memRequest"</code> in the order they are created. A Pod is admitted only if adding it keeps every limited total at or under its hard limit; check <code>pods</code> first, then <code>cpu</code>, then <code>memory</code>, and report the first one exceeded. Rejected Pods use nothing. Return <code>"name:admitted"</code> or <code>"name:rejected(resource)"</code>. Then write the Namespace, ResourceQuota and LimitRange YAML and the commands that show used vs hard.</p>`,
    ex: `<p><code>["pods=3","cpu=2","memory=4Gi"]</code> with four Pods of <code>500m</code> and <code>1Gi</code> each → ${H.c('g', '["a:admitted", "b:admitted", "c:admitted"')}, ${H.c('r', '"d:rejected(pods)"]')}: the 4th Pod would exceed the Pod count even though CPU and memory still have room.</p>`,
    bw: `<p>Raise the quota every time a deploy fails. Quota exists to cap one team's footprint; unlimited quota is no quota, and the real bug (requests copied from a template, ten replicas by mistake) stays hidden.</p>`,
    q: ['A ResourceQuota limits <code>requests.cpu</code>. A Pod is created without any CPU request. What happens?', ['It is rejected unless a LimitRange gives it a default request', 'It is admitted with zero CPU', 'It is admitted but never scheduled', 'The quota is ignored'], 0, 'When a quota covers a resource, Pods must specify it (or inherit it from a LimitRange default).'],
    h: ['<p>Hint 1: parse quota entries into a dict and convert units to millicores and bytes.</p>', '<p>Hint 2: keep running totals only for admitted Pods.</p>', '<p>Hint 3: test the three resources in the fixed order and stop at the first that would go over.</p>'],
    a: `<p>A quota is an admission check at creation time: the API server adds the new object's usage to the namespace total and rejects it if the sum would pass a hard limit. Existing Pods are never evicted when a quota shrinks. With Deployments the rejection happens when the ReplicaSet tries to create Pods, so look at <code>kubectl describe rs</code> events when Pods are missing.</p>`,
    code: Y(R`apiVersion: v1
kind: Namespace
metadata:
  name: team-a
---
apiVersion: v1
kind: ResourceQuota
metadata:
  name: compute
  namespace: team-a
spec:
  hard:
    pods: "3"
    requests.cpu: "2"
    requests.memory: 4Gi
---
apiVersion: v1
kind: LimitRange
metadata:
  name: defaults
  namespace: team-a
spec:
  limits:
    - type: Container
      defaultRequest: { cpu: 100m, memory: 128Mi }   # lazy manifests still pass the quota check
      default: { memory: 256Mi }
# kubectl describe quota compute -n team-a        -> Used / Hard table
# kubectl get events -n team-a --field-selector reason=FailedCreate`),
    alt: [PY(R`import math
import re
from fractions import Fraction

_UNITS = {"Ki": 1024, "Mi": 1024 ** 2, "Gi": 1024 ** 3, "Ti": 1024 ** 4,
          "K": 1000, "M": 1000 ** 2, "G": 1000 ** 3, "T": 1000 ** 4}


def _cpu(q):
    m = re.fullmatch(r"([0-9]+)m", q)
    return int(m.group(1)) if m else math.ceil(Fraction(q) * 1000)


def _mem(q):
    m = re.fullmatch(r"([0-9]+(?:\.[0-9]+)?)(Ki|Mi|Gi|Ti|K|M|G|T)?", q)
    return math.ceil(Fraction(m.group(1)) * (_UNITS[m.group(2)] if m.group(2) else 1))


def quota_check(quota, pods):
    hard = {}
    for item in quota:
        key, _, value = item.partition("=")
        hard[key] = value
    limit_pods = int(hard["pods"]) if "pods" in hard else None
    limit_cpu = _cpu(hard["cpu"]) if "cpu" in hard else None
    limit_mem = _mem(hard["memory"]) if "memory" in hard else None
    used_pods = used_cpu = used_mem = 0
    out = []
    for item in pods:
        name, cpu, mem = item.split(":")
        c, m = _cpu(cpu), _mem(mem)
        if limit_pods is not None and used_pods + 1 > limit_pods:
            out.append(name + ":rejected(pods)")
        elif limit_cpu is not None and used_cpu + c > limit_cpu:
            out.append(name + ":rejected(cpu)")
        elif limit_mem is not None and used_mem + m > limit_mem:
            out.append(name + ":rejected(memory)")
        else:
            used_pods += 1
            used_cpu += c
            used_mem += m
            out.append(name + ":admitted")
    return out`, 'quota_check (tested)')],
    cx: `<p>O(P). Quota usage is kept in the quota object's status and updated by the quota controller.</p>`,
    f: ['What is the difference between <code>requests.cpu</code> and <code>limits.cpu</code> in a quota?', 'How would you give each team its own namespace automatically (Terraform, a controller, or Hierarchical Namespaces)?'],
    tests: { sig: 'string[] string[] -> string[]', fn: 'quotaCheck', cases: [
        [[['pods=3', 'cpu=2', 'memory=4Gi'], ['a:500m:1Gi', 'b:500m:1Gi', 'c:500m:1Gi', 'd:500m:1Gi']], ['a:admitted', 'b:admitted', 'c:admitted', 'd:rejected(pods)']],
        [[['cpu=1'], ['a:600m:1Gi', 'b:600m:1Gi', 'c:400m:1Gi']], ['a:admitted', 'b:rejected(cpu)', 'c:admitted']],
        [[['memory=1Gi'], ['a:100m:600Mi', 'b:100m:600Mi', 'c:100m:400Mi']], ['a:admitted', 'b:rejected(memory)', 'c:admitted']],
        [[['pods=1', 'cpu=100m'], ['a:1:1Gi', 'b:100m:1Mi']], ['a:rejected(cpu)', 'b:admitted']],
        [[[], ['a:1:1Gi', 'b:1:1Gi']], ['a:admitted', 'b:admitted']],
        [[['pods=2', 'cpu=2', 'memory=2Gi'], ['a:1:1Gi', 'b:1:1Gi', 'c:1:1Gi']], ['a:admitted', 'b:admitted', 'c:rejected(pods)']],
        [[['cpu=2', 'memory=2Gi'], ['a:1500m:1Gi', 'b:1500m:512Mi', 'c:500m:1Gi', 'd:1:1Gi']], ['a:admitted', 'b:rejected(cpu)', 'c:admitted', 'd:rejected(cpu)']],
        [[['pods=0'], ['a:1m:1Ki']], ['a:rejected(pods)']],
        [[['memory=1G'], ['a:1:1G', 'b:1:1']], ['a:admitted', 'b:rejected(memory)']]
    ] }
  }));

  practice.push(P({
    t: 'Two apps behind one Ingress on kind', l: 'Medium', tags: ['ingress', 'service', 'kind', 'routing'], co: ['Amazon', 'ThoughtWorks', 'Paytm'],
    s: `<p>Run two tiny apps, <code>web</code> and <code>api</code>, on your kind cluster (created with the config from the first lesson, with ports 80/443 mapped). Install an Ingress controller, then publish them on one host: <code>/</code> goes to web and <code>/api</code> goes to api. Use <code>networking.k8s.io/v1</code> with <code>ingressClassName</code>. Show how to test with <code>curl</code> without editing <code>/etc/hosts</code>, and how you would debug a 404 and a 503.</p>`,
    ex: `<p><code>curl -H "Host: shop.localtest.me" localhost/</code> → ${H.c('g', 'web says hello')}; <code>curl -H "Host: shop.localtest.me" localhost/api</code> → ${H.c('b', 'api says hello')}. A request with another Host returns the controller's default 404.</p>`,
    bw: `<p>Give each app its own <code>type: LoadBalancer</code> Service. In a cloud that means two billed load balancers and two public IPs for a lab that needs one.</p>`,
    q: ['An Ingress returns a 503 from the controller. What is the most likely cause?', ['The backend Service has no ready endpoints', 'The Ingress YAML is invalid', 'The namespace has no quota', 'DNS for the cluster is down'], 0, 'A 404 usually means no rule matched (host, path or class); a 503 means a rule matched but the Service has no healthy Pods.'],
    h: ['<p>Hint 1: the controller needs to be installed first (<code>kubectl get ingressclass</code> lists the class name to use).</p>', '<p>Hint 2: two Deployments, two ClusterIP Services, one Ingress with two paths.</p>', '<p>Hint 3: <code>curl -H "Host: ..."</code> or <code>--resolve host:80:127.0.0.1</code> avoids editing hosts files.</p>'],
    a: `<p>The Ingress object is only configuration. The controller Pod watches it and updates its proxy. Each backend Service must have ready endpoints. On kind, the host ports 80/443 map to the control-plane node where the controller runs, so <code>localhost</code> works. For debugging, follow the chain: curl, controller logs, Ingress events, Service endpoints, Pod readiness.</p>`,
    code: Y(R`# apps.yaml: two echo apps with Services and one Ingress
apiVersion: apps/v1
kind: Deployment
metadata: { name: web }
spec:
  replicas: 2
  selector: { matchLabels: { app: web } }
  template:
    metadata: { labels: { app: web } }
    spec:
      containers:
        - name: echo
          image: hashicorp/http-echo:1.0
          args: ["-text=web says hello", "-listen=:5678"]
          ports: [{ containerPort: 5678 }]
          readinessProbe: { httpGet: { path: /, port: 5678 } }
          resources: { requests: { cpu: 10m, memory: 16Mi }, limits: { memory: 32Mi } }
---
apiVersion: v1
kind: Service
metadata: { name: web }
spec:
  selector: { app: web }
  ports: [{ port: 80, targetPort: 5678 }]
---
apiVersion: apps/v1
kind: Deployment
metadata: { name: api }
spec:
  replicas: 2
  selector: { matchLabels: { app: api } }
  template:
    metadata: { labels: { app: api } }
    spec:
      containers:
        - name: echo
          image: hashicorp/http-echo:1.0
          args: ["-text=api says hello", "-listen=:5678"]
          ports: [{ containerPort: 5678 }]
          readinessProbe: { httpGet: { path: /, port: 5678 } }
          resources: { requests: { cpu: 10m, memory: 16Mi }, limits: { memory: 32Mi } }
---
apiVersion: v1
kind: Service
metadata: { name: api }
spec:
  selector: { app: api }
  ports: [{ port: 80, targetPort: 5678 }]
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata: { name: shop }
spec:
  ingressClassName: nginx
  rules:
    - host: shop.localtest.me
      http:
        paths:
          - path: /api
            pathType: Prefix
            backend: { service: { name: api, port: { number: 80 } } }
          - path: /
            pathType: Prefix
            backend: { service: { name: web, port: { number: 80 } } }`, 'apps.yaml'),
    alt: [SH(R`#!/usr/bin/env bash
set -euo pipefail
kubectl apply -f https://kind.sigs.k8s.io/examples/ingress/deploy-ingress-nginx.yaml   # check the controller's status before using it beyond a lab
kubectl wait -n ingress-nginx --for=condition=ready pod -l app.kubernetes.io/component=controller --timeout=120s
kubectl get ingressclass                                      # use this name in ingressClassName

kubectl apply -f apps.yaml
kubectl rollout status deployment/web && kubectl rollout status deployment/api
kubectl get ingress shop                                      # ADDRESS may stay empty on kind; that is fine

curl -s -H "Host: shop.localtest.me" localhost/               # web says hello
curl -s -H "Host: shop.localtest.me" localhost/api            # api says hello
curl -s -o /dev/null -w "%{http_code}\n" localhost/           # 404: no host matched

# Debugging a 503
kubectl get endpointslices -l kubernetes.io/service-name=api
kubectl logs -n ingress-nginx -l app.kubernetes.io/component=controller --tail=20
kubectl describe ingress shop | sed -n '/Rules:/,$p'`, 'install, test, debug')],
    cx: `<p>One controller, one entry point, any number of apps. Replace the controller with a Gateway API implementation for new designs.</p>`,
    f: ['How would you add TLS for <code>shop.example.com</code>? (a <code>kubernetes.io/tls</code> Secret and <code>spec.tls</code>, issued by cert-manager)', 'What is different about this Ingress with Gateway API objects (Gateway and HTTPRoute)?']
  }));

  practice.push(P({
    t: 'The liveness probe that kills a healthy app', l: 'Medium', tags: ['probes', 'crashloopbackoff', 'startup'], co: ['Netflix', 'Uber', 'Mphasis'],
    s: `<p>A worker needs about 40 seconds to warm up, then it creates <code>/tmp/ready</code>. Its liveness probe checks that file every 5 seconds with <code>failureThreshold: 3</code>. The Pod restarts again and again and ends in CrashLoopBackOff. Reproduce it with the provided Pod, prove from Events and restart counts that the probe is the killer, and fix it with a startup probe plus a readiness probe, keeping liveness small.</p>`,
    ex: `<p>${H.c('r', 'Liveness probe failed: cat: can\'t open \'/tmp/ready\': No such file or directory')} followed by ${H.c('y', 'Container worker failed liveness probe, will be restarted')}, with RESTARTS climbing every ~15-20 seconds. Nothing is wrong with the application itself.</p>`,
    bw: `<p>Remove all probes, or set <code>initialDelaySeconds: 300</code> on liveness. The first hides a real hang; the second makes every real failure take five minutes to notice and slows readiness too.</p>`,
    q: ['Which probe is designed to give a slow-starting container time without delaying later checks?', ['startupProbe', 'livenessProbe with a bigger period', 'readinessProbe with successThreshold 3', 'preStop hook'], 0, 'While a startup probe has not succeeded, liveness and readiness checks are held back. After it succeeds they take over with their normal short intervals.'],
    h: ['<p>Hint 1: <code>kubectl describe pod</code> shows <code>Liveness probe failed</code> events just before each restart.</p>', '<p>Hint 2: the budget of the liveness probe here is about 3 x 5 = 15 seconds, far less than 40.</p>', '<p>Hint 3: add a startupProbe with a budget well over 40 seconds (for example 5 s x 30), then keep the liveness probe as it was.</p>'],
    a: `<p>The liveness probe starts counting at container start and gives up after about 15 seconds, so the app is killed while it is still warming up, over and over. A startup probe measures when the app is ready to be probed: until it passes, liveness and readiness do not run. Once it passes at about 40 seconds, the quick liveness probe protects against hangs and readiness gates traffic.</p>`,
    code: Y(R`# fixed.yaml (the broken version had only the liveness probe: periodSeconds 5, failureThreshold 3, a ~15 s budget)
apiVersion: v1
kind: Pod
metadata:
  name: worker
spec:
  containers:
    - name: worker
      image: busybox:1.36
      command: ["sh", "-c", "sleep 40; touch /tmp/ready; sleep 3600"]
      startupProbe:                # budget 5 x 30 = 150 s, passes at about 40 s
        exec: { command: ["cat", "/tmp/ready"] }
        periodSeconds: 5
        failureThreshold: 30
      readinessProbe:
        exec: { command: ["cat", "/tmp/ready"] }
        periodSeconds: 5
      livenessProbe:
        exec: { command: ["cat", "/tmp/ready"] }
        periodSeconds: 10
        failureThreshold: 3
      resources:
        requests: { cpu: 10m, memory: 16Mi }
        limits: { memory: 32Mi }`, 'fixed.yaml'),
    alt: [SH(R`#!/usr/bin/env bash
set -euo pipefail
# Reproduce the bug with the liveness-only Pod
kubectl apply -f - <<'YAML'
apiVersion: v1
kind: Pod
metadata: { name: worker }
spec:
  containers:
    - name: worker
      image: busybox:1.36
      command: ["sh", "-c", "sleep 40; touch /tmp/ready; sleep 3600"]
      livenessProbe:
        exec: { command: ["cat", "/tmp/ready"] }
        periodSeconds: 5
        failureThreshold: 3
YAML
sleep 60
kubectl get pod worker                                         # RESTARTS 2 or 3
kubectl describe pod worker | sed -n '/Events:/,$p'            # Liveness probe failed ... will be restarted
kubectl delete pod worker
kubectl apply -f fixed.yaml
kubectl wait --for=condition=ready pod/worker --timeout=120s   # becomes Ready after ~40 s
kubectl get pod worker                                         # RESTARTS 0`, 'reproduce and verify')],
    cx: `<p>The slow start is paid once, and later failures are detected within seconds.</p>`,
    f: ['What goes wrong if the readiness and liveness probes check the same slow dependency?', 'How do <code>kubectl get pod -w</code> timestamps help you choose the startup budget?']
  }));

  practice.push(P({
    t: 'Pick the Service type for each requirement', l: 'Medium', tags: ['service', 'clusterip', 'nodeport', 'loadbalancer', 'headless'], co: ['Google', 'Cisco', 'Tech Mahindra'],
    s: `<p>For each requirement below choose the Service type, write the manifest, and verify it with one command: (1) an internal API reached only by other Pods; (2) a quick demo that a colleague on the same network must reach through a node port; (3) a single public service on a cloud provider (state the cost warning) or on minikube; (4) a clustered database whose clients need the IP of every Pod. Explain why you did not use LoadBalancer for the first two.</p>`,
    ex: `<p>(4) <code>kubectl run -it --rm dns --image=busybox:1.36 --restart=Never -- nslookup db-headless</code> returns ${H.c('g', 'several A records')}, one per ready Pod, while a ClusterIP Service name returns just one address.</p>`,
    bw: `<p>Use <code>type: LoadBalancer</code> for everything "so it works". Each one is a billed cloud load balancer with a public address, and internal APIs end up exposed to the internet.</p>`,
    q: ['What does <code>clusterIP: None</code> change?', ['DNS returns the Pod IPs directly instead of one virtual IP', 'The Service becomes public', 'Traffic is encrypted', 'Pods stop being load balanced by kube-proxy and also stop running'], 0, 'A headless Service skips the virtual IP. Clients get all ready Pod addresses and choose themselves.'],
    h: ['<p>Hint 1: ask who the caller is: Pods, a colleague, the internet, or a smart client.</p>', '<p>Hint 2: ClusterIP for internal; NodePort for a quick outside test; LoadBalancer for one public endpoint; headless when each Pod matters.</p>', '<p>Hint 3: verify with <code>kubectl get svc</code>, <code>kubectl get endpointslices</code> and a DNS query from a throw-away Pod.</p>'],
    a: `<p>Match exposure to need. ClusterIP is the default and cheapest. NodePort opens a high port on every node (fine for demos, not for production). LoadBalancer asks the cloud for an address; on minikube, <code>minikube tunnel</code> assigns one locally, on kind it stays pending without an add-on. Headless Services give stable per-Pod DNS names when paired with a StatefulSet. Anything HTTP and public usually belongs behind one Ingress or Gateway instead of many load balancers.</p>`,
    code: Y(R`apiVersion: v1
kind: Service
metadata: { name: orders-internal }          # (1) internal API
spec:
  type: ClusterIP
  selector: { app: orders }
  ports: [{ port: 80, targetPort: 8080 }]
---
apiVersion: v1
kind: Service
metadata: { name: orders-demo }              # (2) quick outside access via node IP:30090
spec:
  type: NodePort
  selector: { app: orders }
  ports: [{ port: 80, targetPort: 8080, nodePort: 30090 }]
---
apiVersion: v1
kind: Service
metadata:
  name: orders-public                        # (3) COST: a cloud load balancer is billed while it exists; delete when done
spec:
  type: LoadBalancer
  selector: { app: orders }
  ports: [{ port: 443, targetPort: 8080 }]
---
apiVersion: v1
kind: Service
metadata: { name: db-headless }              # (4) one DNS record per ready Pod
spec:
  clusterIP: None
  selector: { app: db }
  ports: [{ port: 5432 }]
# Verify:  kubectl get svc ; kubectl get endpointslices -l kubernetes.io/service-name=db-headless
# minikube: run "minikube tunnel" in another terminal to give (3) an address`),
    cx: `<p>The choice has no performance cost; the cost is money (load balancers) and exposure (NodePort on every node).</p>`,
    f: ['When would you use ExternalName?', 'What does <code>externalTrafficPolicy: Local</code> do for a LoadBalancer Service?']
  }));

  practice.push(P({
    t: 'Mount a config file without hiding the folder', l: 'Medium', tags: ['configmap', 'volume', 'subpath', 'nginx'], co: ['Salesforce', 'HCLTech', 'Mindtree'],
    s: `<p>You want to override only <code>/etc/nginx/conf.d/default.conf</code> in an nginx container using a ConfigMap. Your first attempt mounted the ConfigMap at <code>/etc/nginx/conf.d</code> and nginx failed, because other files in that folder vanished. Fix it two ways: mount the whole directory (when you own every file) or mount a single file with <code>subPath</code>. State the update behaviour of each, and what you do to reload.</p>`,
    ex: `<p>Mounting a volume at a path <b>replaces</b> whatever the image had there. The subPath file keeps its siblings, but ${H.c('r', 'subPath mounts never receive ConfigMap updates')}: you need a Pod restart. A whole-directory mount updates in about a minute, and nginx still needs <code>nginx -s reload</code>.</p>`,
    bw: `<p>Bake the config into a new image for every tweak. It works, but slows every change, and per-environment differences multiply images.</p>`,
    q: ['You mount a ConfigMap with <code>subPath</code>. After editing the ConfigMap, the file in the Pod...', ['stays the same until the Pod is recreated', 'updates in about a minute', 'updates immediately', 'is deleted'], 0, 'subPath bind-mounts one file and bypasses the symlink swap used for updates.'],
    h: ['<p>Hint 1: a volume mount hides existing content at <code>mountPath</code>.</p>', '<p>Hint 2: <code>subPath: default.conf</code> with <code>mountPath: /etc/nginx/conf.d/default.conf</code> mounts only that key as a file.</p>', '<p>Hint 3: the reload needs either a Pod restart (<code>rollout restart</code>) or <code>kubectl exec ... nginx -s reload</code> with a directory mount.</p>'],
    a: `<p>Choose by trade-off. A directory mount gives live updates but replaces the whole directory, so include every file you need. A subPath mount is surgical but static. In production, many teams prefer a checksum annotation so a config change rolls the Deployment, which works for both patterns.</p>`,
    code: Y(R`apiVersion: v1
kind: ConfigMap
metadata: { name: nginx-conf }
data:
  default.conf: |
    server {
      listen 8080;
      location / { return 200 "configured by a ConfigMap\n"; }
    }
---
apiVersion: apps/v1
kind: Deployment
metadata: { name: site }
spec:
  replicas: 1
  selector: { matchLabels: { app: site } }
  template:
    metadata:
      labels: { app: site }
    spec:
      containers:
        - name: nginx
          image: nginxinc/nginx-unprivileged:1.27
          ports: [{ containerPort: 8080 }]
          volumeMounts:
            - name: conf
              mountPath: /etc/nginx/conf.d/default.conf   # one file; siblings stay
              subPath: default.conf                        # never auto-updates
              readOnly: true
          resources:
            requests: { cpu: 10m, memory: 32Mi }
            limits: { memory: 64Mi }
      volumes:
        - name: conf
          configMap: { name: nginx-conf }
# Directory-mount variant: mountPath: /etc/nginx/conf.d  (no subPath), live updates, then:
#   kubectl exec deploy/site -- nginx -s reload`),
    cx: `<p>No image rebuild. A change costs one restart (subPath) or one reload (directory).</p>`,
    f: ['How would <code>immutable: true</code> change this workflow?', 'Why does <code>envFrom</code> on a ConfigMap not need any volume at all?']
  }));


  // ───────────────────────── Practice: Hard ─────────────────────────
  practice.push(P({
    t: 'Node under memory pressure: who is evicted first?', l: 'Hard', tags: ['eviction', 'qos', 'oomkilled', 'python'], co: ['Google', 'Red Hat', 'Cisco'], c: PYC,
    s: `<p>A node runs low on memory and the kubelet must evict Pods. Write <code>eviction_order(pods)</code> in Python. Each Pod is <code>"name:priority:requestMi:usageMi"</code> (integers; priority is the PriorityClass value, request and usage are in Mi). Return the Pod names in the order they would be evicted, using this simplified version of the kubelet's ranking:</p>
      <ol><li>Pods whose usage is <b>above</b> their request go first; Pods at or below their request go after them.</li><li>Inside each group, lower priority goes first.</li><li>If priority ties, the larger value of (usage - request) goes first.</li><li>If still tied, the smaller name (alphabetical) goes first.</li></ol>
      <p>Then explain in the kubectl answer how to see which Pods were evicted and why.</p>`,
    ex: `<p><code>["a:10:100:120","b:5:100:300","c:5:100:110","d:0:50:40"]</code> → ${H.c('g', '["b", "c", "a", "d"]')}. a, b, c are over their request, so they come first: b and c have priority 5 (lower than a's 10), and b is 200 Mi over while c is 10 Mi over. d stays within its request, so it is last.</p>`,
    bw: `<p>Evict the Pod with the highest memory usage. That punishes a Pod that stayed inside its own request and protects a noisy neighbour that used far more than it asked for, which is the opposite of what requests are for.</p>`,
    q: ['Which Pod does the kubelet protect best during node memory pressure?', ['One that uses less memory than it requested, with high priority', 'One that has no requests or limits', 'One with the biggest memory limit', 'The oldest Pod on the node'], 0, 'Using less than the request and having high priority puts a Pod at the end of the eviction list. A Pod with no requests can never be "within" them, so it is among the first to go.'],
    h: ['<p>Hint 1: the rule is a sort with a four-part key, so build the key for each Pod.</p>', '<p>Hint 2: the first part is 0 for over-request Pods and 1 for the rest; the third part is the negative of (usage - request) so bigger overage sorts first.</p>', '<p>Hint 3: parse the numbers with <code>int</code>, keep the name last as the final tie-break, and return only the names.</p>'],
    a: `<p>The kubelet signals memory pressure when free memory crosses an eviction threshold, taints the node (<code>node.kubernetes.io/memory-pressure</code>), and evicts Pods until it recovers. It prefers Pods that use more than they requested, then lower priority, then the biggest overage. That is why honest requests matter: a Pod that asks for what it uses is the last to be touched. This is different from the kernel's OOM kill, which hits a container that passes its own memory limit (exit code 137, <code>OOMKilled</code>).</p>`,
    code: SH(R`#!/usr/bin/env bash
set -euo pipefail
kubectl get pods -A --field-selector=status.phase=Failed          # evicted Pods end as Failed, reason Evicted
kubectl get events -A --field-selector reason=Evicted             # the kubelet's message names the signal
kubectl describe node lab-worker | sed -n '/Conditions:/,/Addresses:/p'   # MemoryPressure True/False
kubectl top pods -A --sort-by=memory | head                       # needs metrics-server (see the troubleshooting lesson)
kubectl get pod web-7d9 -o jsonpath='{.status.qosClass}{" "}{.spec.priority}{"\n"}'

# OOMKilled is a different path: the container hit its own limit
kubectl get pod web-7d9 -o jsonpath='{.status.containerStatuses[0].lastState.terminated.reason}{"\n"}'`),
    alt: [PY(R`def eviction_order(pods):
    ranked = []
    for item in pods:
        name, priority, request, usage = item.split(":")
        priority, request, usage = int(priority), int(request), int(usage)
        over = usage > request
        # key: over-request first, lower priority first, bigger overage first, then name
        ranked.append(((0 if over else 1), priority, -(usage - request), name))
    ranked.sort()
    return [r[3] for r in ranked]`, 'eviction_order (tested)')],
    cx: `<p>O(P log P) for P Pods.</p>`,
    f: ['What is the difference between a node-pressure eviction and an API-initiated eviction (PodDisruptionBudget)?', 'Why does a Guaranteed Pod still get evicted sometimes?'],
    tests: { sig: 'string[] -> string[]', fn: 'evictionOrder', cases: [
        [[['a:0:100:300', 'b:0:100:150', 'c:0:100:50']], ['a', 'b', 'c']],
        [[['hi:1000:100:500', 'lo:0:100:200']], ['lo', 'hi']],
        [[['x:0:500:100', 'y:0:100:50']], ['y', 'x']],
        [[[]], []],
        [[['b:0:10:20', 'a:0:10:20']], ['a', 'b']],
        [[['g:2000:200:200', 'bu:0:100:90', 'over:500:100:101']], ['over', 'bu', 'g']],
        [[['p:0:0:10']], ['p']],
        [[['a:10:100:120', 'b:5:100:300', 'c:5:100:110', 'd:0:50:40']], ['b', 'c', 'a', 'd']]
    ] }
  }));

  practice.push(P({
    t: 'Zero-downtime rollout: surge, readiness, preStop and a PodDisruptionBudget', l: 'Hard', tags: ['deployment', 'rollout', 'pdb', 'readiness', 'graceful shutdown'], co: ['Amazon', 'Shopify', 'Thoughtworks'],
    s: `<p>Users see a burst of 502 errors on every deploy of <code>shop-api</code> (3 replicas). Rewrite the manifests so that a rollout and a node drain never remove capacity: the rollout must create a new Pod before removing an old one, a Pod only receives traffic when it is ready, a terminating Pod keeps serving long enough for the Service and Ingress to forget it, and at least 2 Pods must always stay available during voluntary disruptions. Prove it on kind with a loop of requests running while you roll out and drain.</p>`,
    ex: `<p>Before: no readiness probe (new Pods get traffic while still booting), no <code>preStop</code> (the Pod gets SIGTERM while endpoints still list it) and no PodDisruptionBudget (a drain can evict all 3 Pods together). After: ${H.c('g', 'maxSurge 1, maxUnavailable 0, readiness probe, preStop sleep, PDB minAvailable 2')} and the request loop shows only 200 during the rollout.</p>`,
    bw: `<p>Set <code>replicas: 10</code> "to be safe" and hope. More Pods do not fix a missing readiness probe or a Pod that drops its connections the moment SIGTERM arrives, and every deploy still has a few seconds of errors.</p>`,
    q: ['Why add a short <code>preStop</code> sleep before the app handles SIGTERM?', ['Endpoint removal and SIGTERM happen in parallel, so traffic can still arrive for a moment after termination starts', 'Kubernetes cannot send SIGTERM without it', 'It makes the image pull faster', 'It resets the restart counter'], 0, 'Removing the Pod from endpoints (and from proxies and load balancers) takes a few seconds to spread. A short sleep keeps the Pod serving until that is done.'],
    h: ['<p>Hint 1: three separate causes: new Pods taking traffic too early, old Pods dying too fast, and a drain that evicts too many at once.</p>', '<p>Hint 2: <code>maxUnavailable: 0</code> forces surge-first; a readiness probe gates traffic; <code>preStop</code> plus <code>terminationGracePeriodSeconds</code> covers the shutdown gap.</p>', '<p>Hint 3: a PodDisruptionBudget protects only voluntary disruptions (drain, eviction API), not crashes; test with <code>kubectl drain --ignore-daemonsets</code> and watch it wait.</p>'],
    a: `<p>Four settings work together. <b>Strategy:</b> <code>maxSurge: 1</code> and <code>maxUnavailable: 0</code> start a new Pod first and remove an old one only after the new one is Ready. <b>Readiness probe:</b> decides when a Pod enters the Service endpoints. <b>Graceful shutdown:</b> <code>preStop</code> sleeps a few seconds so endpoints update, then SIGTERM lets the app finish in-flight requests, all inside <code>terminationGracePeriodSeconds</code>. <b>PDB:</b> <code>minAvailable: 2</code> makes <code>kubectl drain</code> wait instead of evicting all three Pods together. Verify with a request loop, not by reading YAML.</p>`,
    code: Y(R`apiVersion: apps/v1
kind: Deployment
metadata:
  name: shop-api
spec:
  replicas: 3
  selector: { matchLabels: { app: shop-api } }
  strategy:
    type: RollingUpdate
    rollingUpdate: { maxSurge: 1, maxUnavailable: 0 }   # create first, delete after Ready
  minReadySeconds: 5                                    # a new Pod must stay Ready 5s to count
  template:
    metadata:
      labels: { app: shop-api }
    spec:
      terminationGracePeriodSeconds: 30
      containers:
        - name: api
          image: nginxinc/nginx-unprivileged:1.27
          ports: [{ containerPort: 8080 }]
          readinessProbe:
            httpGet: { path: /, port: 8080 }
            periodSeconds: 3
            failureThreshold: 2
          lifecycle:
            preStop:
              exec: { command: ["sleep", "8"] }         # keep serving while endpoints update
          resources:
            requests: { cpu: 50m, memory: 64Mi }
            limits: { memory: 128Mi }
---
apiVersion: v1
kind: Service
metadata: { name: shop-api }
spec:
  selector: { app: shop-api }
  ports: [{ port: 80, targetPort: 8080 }]
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata: { name: shop-api }
spec:
  minAvailable: 2
  selector: { matchLabels: { app: shop-api } }
# Test (second terminal):  kubectl port-forward svc/shop-api 8080:80
#   while true; do curl -s -o /dev/null -w "%{http_code}\n" localhost:8080; sleep 0.2; done | sort | uniq -c
# Then:  kubectl set image deploy/shop-api api=nginxinc/nginx-unprivileged:1.27.1
#        kubectl drain lab-worker --ignore-daemonsets --delete-emptydir-data`),
    cx: `<p>The cost is time: each rollout takes longer (surge, minReadySeconds, preStop). That is the price of no errors.</p>`,
    f: ['Why does a PDB with <code>minAvailable: 3</code> on 3 replicas block every node drain?', 'How would <code>topologySpreadConstraints</code> keep the 3 replicas on different nodes?']
  }));

  practice.push(P({
    t: 'A secret in a Pod without a secret in Git', l: 'Hard', tags: ['secrets', 'rbac', 'external secrets', 'encryption at rest'], co: ['Stripe', 'HashiCorp', 'Deloitte'],
    s: `<p>A scan finds a base64 database password in <code>k8s/secret.yaml</code> in Git. A manager says "it is encoded, so it is fine". Do three things: (1) show on kind why that is wrong by decoding the value from the cluster; (2) create the Secret without ever writing the value in a file, mount it as a file, and limit who can read it with RBAC; (3) show, at intro level, how an external store (here the External Secrets Operator) syncs the value into a Kubernetes Secret, and where encryption at rest fits. All values are placeholders and the first step is to rotate the leaked password.</p>`,
    ex: `<p><code>kubectl get secret db -o jsonpath='{.data.password}' | base64 -d</code> prints ${H.c('r', 'the clear text')}. base64 is a format, not protection. Anyone with <code>get secrets</code> in the namespace, or read access to etcd or its backup, sees it.</p>`,
    bw: `<p>Keep the Secret YAML in Git "because it is encoded", or "encrypt" it by base64 twice. Both leak the password to everyone with repository access, forever, because Git history keeps it.</p>`,
    q: ['What does Kubernetes do to a Secret by default?', ['Stores it base64-encoded in etcd, readable by anyone allowed to read the object', 'Encrypts it with a per-namespace key', 'Hashes it so it cannot be read back', 'Stores it only in memory on the node'], 0, 'Secrets are only encoded by default. Real protection is RBAC, encryption at rest for etcd (EncryptionConfiguration or a KMS provider), and keeping the source of truth in an external store.'],
    h: ['<p>Hint 1: rotate first. Anything that was in Git is already compromised; removing the file does not undo that.</p>', '<p>Hint 2: <code>kubectl create secret generic --from-file</code> or <code>--from-literal</code> reading from a prompt keeps the value out of files and history.</p>', '<p>Hint 3: mount as a file (not an env var) when possible, scope RBAC with <code>resourceNames</code>, and let an operator sync from the external store.</p>'],
    a: `<p><b>1. Prove it:</b> decode the value. <b>2. Safer delivery:</b> create the Secret from a prompt, mount it read-only as a file, and give only the workload's ServiceAccount a Role with <code>get</code> on that one Secret name. <b>3. External store:</b> keep the password in a manager (cloud secret manager, Vault); the External Secrets Operator reads it with its own identity and keeps a Kubernetes Secret up to date, so Git holds only the <code>ExternalSecret</code> (a pointer, no value). <b>Encryption at rest</b> is configured on the API server (<code>EncryptionConfiguration</code> with a KMS provider in production) and protects etcd and its backups; managed clusters usually offer it as a setting. The operator and a store are optional extras; kind runs the first two steps for free.</p>`,
    code: SH(R`#!/usr/bin/env bash
set -euo pipefail
# 1. The "encoded is fine" myth
kubectl create secret generic demo --from-literal=password='<EXAMPLE_ONLY>'
kubectl get secret demo -o jsonpath='{.data.password}' | base64 -d; echo      # clear text again

# 2. Create without a file, mount as a file, narrow access
read -rsp "New DB password: " DB_PASSWORD; echo
kubectl create secret generic db --from-literal=password="$DB_PASSWORD"
unset DB_PASSWORD
kubectl create serviceaccount api
kubectl create role read-db --verb=get --resource=secrets --resource-name=db
kubectl create rolebinding api-read-db --role=read-db --serviceaccount=default:api
kubectl auth can-i get secret/db --as=system:serviceaccount:default:api        # yes
kubectl auth can-i get secret/other --as=system:serviceaccount:default:api     # no

kubectl apply -f - <<'YAML'
apiVersion: v1
kind: Pod
metadata: { name: api }
spec:
  serviceAccountName: api
  containers:
    - name: api
      image: busybox:1.36
      command: ["sh", "-c", "ls -l /etc/db && sleep 3600"]
      volumeMounts: [{ name: db, mountPath: /etc/db, readOnly: true }]
      resources: { requests: { cpu: 10m, memory: 16Mi }, limits: { memory: 32Mi } }
  volumes:
    - name: db
      secret: { secretName: db, defaultMode: 0400 }
YAML
kubectl logs api`),
    alt: [Y(R`# 3a. External Secrets Operator (installed separately with Helm, see its docs).
# Git holds only this pointer. The value lives in the external store.
apiVersion: external-secrets.io/v1
kind: ExternalSecret
metadata: { name: db }
spec:
  refreshInterval: 1h                      # re-read the store hourly, so rotation flows in
  secretStoreRef: { name: cloud-store, kind: SecretStore }
  target: { name: db }                     # the Kubernetes Secret it creates and updates
  data:
    - secretKey: password
      remoteRef: { key: prod/shop/db-password }
---
# 3b. Encryption at rest, API server side (on a managed cluster this is a setting, not a file).
apiVersion: apiserver.config.k8s.io/v1
kind: EncryptionConfiguration
resources:
  - resources: [secrets]
    providers:
      - kms:
          apiVersion: v2
          name: example-kms
          endpoint: unix:///var/run/kms/socket.sock
      - identity: {}                       # fallback to read old, unencrypted data`, 'external-secret.yaml')],
    cx: `<p>Minutes on kind for steps 1 and 2. The operator and a real store are optional and may cost money on a cloud account.</p>`,
    f: ['Why is an env var a riskier delivery method than a mounted file?', 'What would you add to find secrets before they reach Git (pre-commit scanning, CI scanning)?']
  }));

  practice.push(P({
    t: 'Incident drill: three seeded faults, one runbook', l: 'Hard', tags: ['troubleshooting', 'crashloopbackoff', 'service', 'rollout', 'incident'], co: ['Netflix', 'Datadog', 'Atlassian'],
    s: `<p>Apply the broken manifest below on kind. It contains three independent faults that match common incidents: a Service that has no endpoints, a readiness probe that never passes, and a rollout that gets stuck on a bad image tag. Write the runbook you would follow: the exact commands, the order, what you expect to see for each fault, the fix, and the final check. You may not edit the YAML until the evidence says which line is wrong.</p>`,
    ex: `<p>Symptoms in order: ${H.c('r', 'curl via the Service fails')} (no endpoints, selector says <code>app: shop</code> but the Pods are labelled <code>app: shop-api</code>); ${H.c('y', 'Pods 0/1 Ready')} (the probe path <code>/healthz</code> does not exist on nginx); ${H.c('r', 'rollout stuck at 1 new Pod ImagePullBackOff')} (tag <code>1.27.99</code> does not exist). The old Pods keep serving while the rollout is stuck.</p>`,
    bw: `<p>Delete everything and re-apply, or restart Pods one by one. A restart fixes none of the three faults, and deleting the namespace destroys the evidence (events, previous logs) you need for the incident notes.</p>`,
    q: ['A Service exists, its Pods are Running, but connections are refused. Which command shows the problem fastest?', ['kubectl get endpointslices (or get endpoints) for the Service', 'kubectl delete svc and recreate it', 'kubectl rollout restart', 'kubectl top nodes'], 0, 'Empty endpoints mean the selector matches no Ready Pod. Compare the Service selector with the Pod labels and check readiness.'],
    h: ['<p>Hint 1: go from outside in: Service and endpoints first, then Pod readiness, then the rollout history.</p>', '<p>Hint 2: <code>describe</code> shows Events; <code>get pods --show-labels</code> and <code>get endpoints</code> show label mismatches in one line each.</p>', '<p>Hint 3: fix with <code>kubectl patch</code> or <code>kubectl set</code>, then <code>rollout status</code>; use <code>rollout undo</code> if the evidence says the new revision is the cause.</p>'],
    a: `<p>Work outside in and change only what the evidence blames. <b>Fault 1:</b> <code>get endpoints shop</code> is empty, <code>get pods --show-labels</code> shows <code>app=shop-api</code> while <code>describe svc shop</code> shows selector <code>app=shop</code>; fix the selector. <b>Fault 2:</b> <code>describe pod</code> shows <code>Readiness probe failed: HTTP probe failed with statuscode: 404</code>; fix the path, and note the Pod was never restarted because it is a readiness (not liveness) probe. <b>Fault 3:</b> <code>rollout status</code> hangs, <code>get pods</code> shows <code>ImagePullBackOff</code>, <code>describe</code> shows <code>manifest unknown</code>; run <code>rollout undo</code> or set a real tag. End by checking that the endpoints list every Pod and a request through the Service returns 200.</p>`,
    code: SH(R`#!/usr/bin/env bash
set -euo pipefail
kubectl create namespace drill
kubectl apply -n drill -f - <<'YAML'
apiVersion: apps/v1
kind: Deployment
metadata: { name: shop-api }
spec:
  replicas: 2
  selector: { matchLabels: { app: shop-api } }
  template:
    metadata: { labels: { app: shop-api } }
    spec:
      containers:
        - name: web
          image: nginxinc/nginx-unprivileged:1.27
          ports: [{ containerPort: 8080 }]
          readinessProbe: { httpGet: { path: /healthz, port: 8080 }, periodSeconds: 3 }   # fault 2
          resources: { requests: { cpu: 10m, memory: 32Mi }, limits: { memory: 64Mi } }
---
apiVersion: v1
kind: Service
metadata: { name: shop }
spec:
  selector: { app: shop }                                                                   # fault 1
  ports: [{ port: 80, targetPort: 8080 }]
YAML
kubectl set image -n drill deploy/shop-api web=nginxinc/nginx-unprivileged:1.27.99          # fault 3

# --- the runbook ---
kubectl -n drill get deploy,rs,pods,svc,endpoints -o wide --show-labels
kubectl -n drill describe svc shop | grep -E 'Selector|Endpoints'
kubectl -n drill get events --sort-by=.lastTimestamp | tail -15
kubectl -n drill describe pod -l app=shop-api | sed -n '/Events:/,$p'
kubectl -n drill rollout status deploy/shop-api --timeout=30s || true
kubectl -n drill rollout history deploy/shop-api

# fixes, one at a time, re-checking after each
kubectl -n drill patch svc shop -p '{"spec":{"selector":{"app":"shop-api"}}}'
kubectl -n drill rollout undo deploy/shop-api
kubectl -n drill patch deploy shop-api --type=json -p '[{"op":"replace","path":"/spec/template/spec/containers/0/readinessProbe/httpGet/path","value":"/"}]'
kubectl -n drill rollout status deploy/shop-api
kubectl -n drill get endpoints shop
kubectl delete namespace drill`),
    cx: `<p>Ten minutes once the order is a habit. The cost of guessing is much higher than the cost of reading Events.</p>`,
    f: ['How would you write the timeline and the "what we changed" part of the postmortem?', 'Which of the three faults would a CI check (kubeconform, a policy tool, a smoke test) have caught before deploy?']
  }));

  // ───────────────────────── Quiz ─────────────────────────
  function Q(q, options, answer, explain) { quiz.push({ q: q, options: options, answer: answer, explain: explain }); }
  Q('Which control plane component stores all cluster state?', ['etcd', 'kube-scheduler', 'kubelet', 'kube-proxy'], 0, 'etcd is the key-value store behind the API server. Everything else reads and writes state through the API server, and loses nothing important if it restarts.');
  Q('You edit a Pod template label in a Deployment. What happens?', ['A new ReplicaSet is created and a rolling update starts', 'Nothing, Pods are immutable', 'All Pods restart at once', 'The Service is deleted'], 0, 'Any change to <code>spec.template</code> creates a new ReplicaSet (a new revision). The Deployment then moves Pods across using maxSurge and maxUnavailable.');
  Q('A Service shows <code>Endpoints: &lt;none&gt;</code> although 3 Pods are Running. Most likely cause?', ['The selector does not match the Pod labels, or the Pods are not Ready', 'The Service type must be NodePort', 'The cluster has too few nodes', 'The image is too large'], 0, 'Endpoints are Ready Pods whose labels match the selector. Compare <code>kubectl get pods --show-labels</code> with the selector, then check readiness.');
  Q('Which manifest field selects the controller for an Ingress in Kubernetes 1.29+?', ['spec.ingressClassName', 'metadata.annotations["kubernetes.io/ingress.class"] only', 'spec.controller', 'spec.type: LoadBalancer'], 0, 'The annotation is deprecated. <code>spec.ingressClassName</code> references an IngressClass, and an Ingress does nothing unless a controller is installed.');
  Q('You change a ConfigMap that is injected with <code>envFrom</code>. The running Pods...', ['keep the old values until they are restarted', 'pick up the new values within a minute', 'are restarted automatically', 'fail their readiness probe'], 0, 'Environment variables are fixed when the container starts. Mounted files (without subPath) update eventually, but the app must re-read them. Restart with <code>kubectl rollout restart</code>.');
  Q('What protects the data in a Kubernetes Secret by default?', ['Nothing beyond base64 encoding; RBAC and encryption at rest must be added', 'AES encryption with a cluster key', 'A one-way hash', 'Only the namespace boundary'], 0, 'base64 is not encryption. Limit access with RBAC, enable encryption at rest, and keep the source of truth in an external store.');
  Q('A container keeps restarting and <code>kubectl get pod</code> shows CrashLoopBackOff. Which command gives the cause of the last crash?', ['kubectl logs POD --previous and kubectl describe pod', 'kubectl get nodes', 'kubectl scale --replicas=0', 'kubectl expose'], 0, '<code>--previous</code> shows the logs of the container instance that crashed, and <code>describe</code> shows the exit code, reason and Events.');
  Q('A failing <b>readiness</b> probe causes the kubelet to...', ['remove the Pod from Service endpoints without restarting it', 'restart the container', 'delete the Pod', 'reschedule it to another node'], 0, 'Readiness controls traffic. Liveness restarts the container. Startup holds the other two off until the app has booted.');
  Q('A container has requests cpu 250m, memory 256Mi and limits cpu 500m, memory 256Mi. QoS class?', ['Burstable', 'Guaranteed', 'BestEffort', 'Critical'], 0, 'Guaranteed needs requests equal to limits for every resource in every container. Here CPU differs, so the Pod is Burstable.');
  Q('A Pod exceeds its memory <b>limit</b>. What happens?', ['The container is killed (OOMKilled, exit code 137)', 'It is throttled like CPU', 'The Pod is moved to another node', 'The limit is raised automatically'], 0, 'Memory cannot be throttled, so the kernel kills the process. CPU over the limit is only slowed down.');
  Q('Which command watches a rollout and fails if it does not finish?', ['kubectl rollout status deployment/web --timeout=120s', 'kubectl get deploy', 'kubectl logs deploy/web', 'kubectl diff'], 0, '<code>rollout status</code> waits for the new revision and exits non-zero on timeout, so CI can react. <code>rollout undo</code> then goes back.');
  Q('A namespace has a ResourceQuota for <code>requests.cpu</code>. A new Pod has no CPU request. What happens?', ['It is rejected unless a LimitRange supplies a default request', 'It is admitted with zero requests', 'It runs as BestEffort', 'The quota is ignored for it'], 0, 'The quota admission check needs a request value. A LimitRange with <code>defaultRequest</code> fills it in for lazy manifests.');
  Q('In kind, <code>docker build -t app:dev .</code> succeeded but the Pod shows ImagePullBackOff. The fix?', ['kind load docker-image app:dev, and use a non-latest tag or IfNotPresent', 'Restart Docker', 'Increase the Pod memory', 'Create an Ingress'], 0, 'The kind nodes are containers with their own image store. Load the image into them (or push to a registry). A <code>:latest</code> tag defaults to Always pull.');

  // ───────────────────────── Interview ─────────────────────────
  function IQ(level, q, a, followUps) { interview.push({ q: q, a: a, level: level, followUps: followUps }); }
  IQ('B', 'Walk me through what happens when you run <code>kubectl apply -f deployment.yaml</code>.', `<p>kubectl sends the object to the <b>API server</b>, which authenticates, authorizes (RBAC), runs admission checks (quota, defaults) and stores it in <b>etcd</b>. The <b>Deployment controller</b> (in kube-controller-manager) sees it and creates a <b>ReplicaSet</b>, which creates Pod objects. The <b>scheduler</b> picks a node for each unscheduled Pod based on requests, taints and selectors. The <b>kubelet</b> on that node sees the Pod assigned to it, asks the container runtime to pull the image and start containers, and reports status back. Every component talks only to the API server and works by watching and reconciling desired versus actual state.</p>`, ['Which component is the only one that talks to etcd?', 'What happens to running Pods if the control plane goes down for ten minutes?']);
  IQ('B', 'What is the difference between a Pod, a ReplicaSet and a Deployment?', `<p>A <b>Pod</b> is the smallest unit: one or more containers sharing a network namespace and volumes, with a single IP. A <b>ReplicaSet</b> keeps N identical Pods running and replaces any that disappear. A <b>Deployment</b> manages ReplicaSets to give you declarative updates: it creates a new ReplicaSet for each Pod template change, shifts Pods over with a rolling update, and keeps old ReplicaSets so you can roll back. In practice you write Deployments, rarely bare Pods or ReplicaSets, because a bare Pod is not recreated if its node dies.</p>`, ['Why does a Deployment keep old ReplicaSets, and how many (revisionHistoryLimit)?', 'When would you use a StatefulSet or DaemonSet instead?']);
  IQ('B', 'A Service has no endpoints. How do you debug it?', `<p>Endpoints are the Ready Pods matched by the selector, so there are two usual causes. First compare labels: <code>kubectl describe svc NAME</code> for the selector and <code>kubectl get pods --show-labels</code>; a typo here is the most common cause. Second, check readiness: <code>kubectl get pods</code> shows 0/1 if the readiness probe fails, and <code>describe pod</code> shows the probe error. Also check that <code>targetPort</code> matches the container port, in the same namespace, with <code>kubectl get endpointslices</code>. Fix the selector or the probe, never recreate the Service blindly.</p>`, ['How does a named targetPort help during port changes?', 'What does a headless Service (clusterIP: None) return from DNS?']);
  IQ('I', 'Explain liveness, readiness and startup probes and a mistake each one invites.', `<p><b>Readiness</b> decides whether a Pod receives Service traffic; failing removes it from endpoints without a restart. <b>Liveness</b> decides whether the container is stuck and should be restarted. <b>Startup</b> runs first and disables the other two until the app has booted, so a slow starter is not killed. Mistakes: a readiness probe that checks a shared dependency can take every Pod out of rotation at once; a liveness probe that is too strict or hits a slow endpoint restarts healthy apps into CrashLoopBackOff; a missing startup probe forces a huge <code>initialDelaySeconds</code> on liveness. Keep liveness cheap and local to the process.</p>`, ['How would you size failureThreshold and periodSeconds for an app that takes 90 seconds to boot?', 'Can a Pod be Running but not Ready? What does that look like in kubectl?']);
  IQ('I', 'What is the difference between resource requests and limits, and what are QoS classes?', `<p>A <b>request</b> is what the scheduler reserves; a Pod fits a node only if the sum of requests fits its allocatable capacity. A <b>limit</b> is the ceiling enforced at runtime: CPU above the limit is throttled, memory above the limit gets the container OOMKilled. QoS follows from the values: <b>Guaranteed</b> when every container has requests equal to limits for CPU and memory, <b>Burstable</b> when at least one request or limit is set, <b>BestEffort</b> when none are. Under node memory pressure the kubelet evicts BestEffort and over-request Pods first. A common policy is to set memory request equal to limit and avoid a CPU limit for latency-sensitive services.</p>`, ['Why can CPU limits hurt latency even when the node has spare CPU?', 'What does the scheduler do with limits? (nothing for placement)']);
  IQ('I', 'A Pod is stuck in Pending. List what you check.', `<p>Run <code>kubectl describe pod</code> and read the <code>FailedScheduling</code> event; it names the cause. Typical: <b>Insufficient cpu or memory</b> (requests exceed what is free on every node, even if real usage is low); <b>untolerated taints</b> or a <b>nodeSelector or affinity</b> that matches no node; a <b>PersistentVolumeClaim</b> that is unbound or in another zone; a <b>ResourceQuota</b> blocking creation (then the Pod does not exist at all and the ReplicaSet events show the error). Fix by lowering requests, adding capacity or a toleration, or correcting the selector, based on the event, not by guessing.</p>`, ['How is a Pod with a failing quota different from a Pending Pod?', 'What does Cluster Autoscaler do for a Pending Pod?']);
  IQ('I', 'How do you roll out a bad version, notice, and recover?', `<p>The Deployment updates by creating a new ReplicaSet and scaling it up while scaling the old one down within maxSurge and maxUnavailable. With a readiness probe, a bad version never becomes Ready, so the rollout stalls while old Pods keep serving. <code>kubectl rollout status</code> shows it stuck (and fails with a timeout in CI, and <code>progressDeadlineSeconds</code> marks the Deployment as not progressing). Then <code>kubectl rollout undo deploy/NAME</code> returns to the previous ReplicaSet; <code>rollout history</code> lists revisions. Afterwards fix forward in Git and apply again, because the manifest in Git must stay the source of truth.</p>`, ['What would happen without a readiness probe?', 'Why is the revision change cause worth recording with an annotation or a commit message?']);
  IQ('I', 'Explain ClusterIP, NodePort and LoadBalancer Services, and where Ingress fits.', `<p><b>ClusterIP</b> is a stable virtual IP and DNS name reachable only inside the cluster. <b>NodePort</b> also opens a port (30000-32767) on every node. <b>LoadBalancer</b> asks the cloud provider for an external load balancer (which costs money on a cloud, and does not exist by itself on kind or minikube). An <b>Ingress</b> is a set of HTTP routing rules (host and path to Service) executed by an <b>Ingress controller</b> such as ingress-nginx that you must install; you select it with <code>ingressClassName</code>. One load balancer in front of the controller can serve many apps. The Gateway API is the newer, more expressive successor.</p>`, ['How do you get an Ingress working on kind (port mappings, ingress-nginx manifest)?', 'What changes with TLS and cert-manager?']);
  IQ('A', 'Kubernetes Secrets are only base64. How do you actually protect them?', `<p>Defence in depth. <b>Do not store the value in Git</b>: create it from a secure source or sync it from an external store (cloud secret manager, Vault) with something like the External Secrets Operator or the Secrets Store CSI driver. <b>RBAC</b>: grant <code>get/list secrets</code> narrowly, using <code>resourceNames</code>; <code>list</code> reveals all values. <b>Encryption at rest</b> for etcd with an EncryptionConfiguration, ideally a KMS provider so keys are not on the control plane disk. <b>Delivery</b>: prefer mounted files (mode 0400) over environment variables, which leak through crash dumps and child processes. <b>Rotate</b> on any exposure, and audit access.</p>`, ['Why is <code>list secrets</code> as dangerous as <code>get</code>?', 'How does a rotation reach the Pod when the value is an env var versus a mounted file?']);
  IQ('A', 'Why can a ConfigMap change leave an application unchanged, and how do you solve it?', `<p>Environment variables from a ConfigMap are copied when the container starts, and a mount that uses <code>subPath</code> never receives updates. A directory mount does update (after the kubelet sync period), but most apps read config once at startup. Options: restart on change with <code>kubectl rollout restart</code>; put a hash of the config in a Pod template annotation (Helm checksum pattern, Kustomize configMapGenerator suffix) so a change triggers a normal rolling update; or make the app reload on a signal or file watch. <code>immutable: true</code> ConfigMaps force the versioned-name approach and reduce API server load.</p>`, ['What does Kustomize configMapGenerator do with the name?', 'How would you validate config before rollout?']);
  IQ('A', 'Design namespaces for three teams sharing one cluster.', `<p>One namespace per team (and per environment if they share a cluster), each with: a <b>ResourceQuota</b> to cap total requests and Pod count, a <b>LimitRange</b> for default requests and limits so lazy manifests still pass the quota, <b>RBAC</b> RoleBindings scoped to the namespace, and <b>NetworkPolicies</b> with a default deny (needs a CNI that enforces them). Namespaces are not a hard security boundary on their own: nodes, the kernel and cluster-scoped objects are shared. For stronger isolation use separate clusters or node pools with taints, and Pod Security Admission labels (<code>restricted</code>) on each namespace.</p>`, ['What does a LimitRange add that a quota does not?', 'When would you prefer separate clusters over namespaces?']);
  IQ('A', 'A Pod was OOMKilled and a different Pod was Evicted. Explain the difference and how to prevent each.', `<p><b>OOMKilled</b>: the container went over its own memory <b>limit</b>, so the kernel killed it (exit code 137); the kubelet restarts it and you may see CrashLoopBackOff. Fix by finding the leak or raising the limit with evidence from metrics. <b>Evicted</b>: the <b>node</b> ran short of memory or disk, and the kubelet removed Pods, preferring those above their requests and with low priority. Prevent by setting realistic requests (so scheduling does not overcommit the node), using Guaranteed or higher priority for critical Pods, and adding capacity or autoscaling. Check <code>describe pod</code> (last state reason) and <code>get events</code>.</p>`, ['How would the Java heap and the container limit interact?', 'What does a PodDisruptionBudget protect against, and what not?']);
  IQ('E', 'How would you run a safe, zero-downtime deploy for a critical API, including node maintenance?', `<p>Rolling strategy with <code>maxUnavailable: 0</code> and <code>maxSurge: 1</code>, a readiness probe that reflects the ability to serve, <code>minReadySeconds</code>, a startup probe for slow boots, and graceful shutdown (a short <code>preStop</code> sleep so endpoints update, then SIGTERM handling inside <code>terminationGracePeriodSeconds</code>). Add a PodDisruptionBudget so drains wait, topology spread constraints so replicas sit on different nodes and zones, requests that match reality, and an HPA with a sane minimum. Gate with a smoke test and <code>rollout status</code> in CI, with automatic <code>rollout undo</code> on failure, and run the whole sequence on kind first with a request loop to prove no 5xx.</p>`, ['What does a PDB not protect against?', 'How would you do a canary release with only core Kubernetes objects, and what do you gain from a service mesh or Argo Rollouts?']);

  registerModule({
    id: 'devops13',
    title: 'Kubernetes Core',
    intro: `<p>Kubernetes runs your containers on a group of machines and keeps them in the shape you describe: how many copies, which image, how much memory, how traffic reaches them. This module takes you from the cluster architecture to the daily work: Pods, ReplicaSets and Deployments with rolling updates and rollbacks, Services and Ingress, ConfigMaps and Secrets, probes, requests, limits and QoS, namespaces with quotas, and the kubectl commands that find out why something is broken.</p>
      <p>Every topic starts from a real incident: a CrashLoopBackOff, an ImagePullBackOff, a Pod that stays Pending, a Service with no endpoints, an OOMKilled container, a readiness probe that never passes, a config change nobody picked up, and a rollout that sticks halfway. All labs run free on a local <b>kind</b> or <b>minikube</b> cluster; cloud clusters are an optional comparison with cost warnings. Secrets in examples are placeholders, and you learn why a Kubernetes Secret is only base64-encoded by default and how external secret stores fit in. Manifests target Kubernetes 1.29 or newer.</p>`,
    goals: [
      'Explain the control plane (API server, etcd, scheduler, controller manager) and node components (kubelet, container runtime, kube-proxy), and trace what happens from <code>kubectl apply</code> to a running container',
      'Run a local cluster with kind or minikube, load local images into it, and use contexts, namespaces and the core kubectl commands',
      'Write Deployments with rolling updates with maxSurge and maxUnavailable, and roll back or pause a rollout, including a stuck one',
      'Expose apps with ClusterIP, NodePort and LoadBalancer Services and route HTTP with an Ingress using <code>ingressClassName</code> and an installed controller, and debug a Service with no endpoints',
      'Configure Pods with ConfigMaps and Secrets (env, envFrom, volumes, subPath), explain why Secrets are only base64 by default, and describe RBAC, encryption at rest and external secret stores',
      'Choose liveness, readiness and startup probes correctly, and explain CrashLoopBackOff and readiness failures',
      'Set requests and limits, predict QoS classes and OOMKilled versus Evicted, and use namespaces with ResourceQuota and LimitRange',
      'Debug broken Pods with get, describe, logs --previous, events, exec, port-forward and debug, and fix ImagePullBackOff, Pending and CrashLoopBackOff from evidence'
    ],
    prereqs: `<b>Required:</b> <b>Cloud &amp; DevOps 3</b> (Networking for Cloud Engineers) for IP addresses, ports, DNS and load balancing, which Services and Ingress build on, and <b>Cloud &amp; DevOps 8</b> (Containers with Docker) for images, registries, containers and the build workflow used in every lab. You do not need a cloud account: everything runs on your own machine with kind or minikube.`,
    hours: 16,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
