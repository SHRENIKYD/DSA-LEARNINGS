(function () {
  var topics = [], practice = [], quiz = [], interview = [];
  var LAB = '<b>Safe and free:</b> everything runs on a local <b>kind</b> cluster (Kubernetes 1.30+) on your laptop. Istio 1.2x (<code>istioctl install --set profile=ambient</code> or the default sidecar profile), Linkerd 2.x (<code>linkerd install</code>), Kyverno, Gatekeeper and Falco all install with free Helm charts. Use throwaway namespaces and never point lab policies at a shared cluster.';
  var SKIP = { skip: 'manifest or written design, verified by reading and by applying to a kind cluster' };
  var PYC = '<p>Pure computation, Python 3 standard library only. The real control lives in Kubernetes or the mesh; this small model of its decision logic is the part that is tested, so you can prove you understand the rules.</p>';
  function Y(code, title) { var s = { lang: 'yaml', code: code }; if (title) s.title = title; return s; }     // parsed as YAML (multi-document ok)
  function SH(code, title) { var s = { lang: 'bash', code: code }; if (title) s.title = title; return s; }   // bash -n checked
  function PY(code, title) { return { lang: 'python', title: title || 'Python (tested)', code: code }; }
  // Rego has no checker in tools/validate.js: lang 'text' with check: false (verify with `opa test` / gator).
  function TX(code, title) { return { lang: 'text', check: false, title: title || 'Rego', code: code }; }
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
  function flow(label, nodes, edges, steps, height) {
    return steps.map(function (s) {
      return { narr: s[0], parts: [{ type: 'graph', label: label, directed: true, height: height || 56, nodes: nodes, edges: edges, hl: s[1] || {}, ehl: s[2] || {}, tags: s[3] || {} }] };
    });
  }
  function pad4(f, tip) { while (f.length < 4) f.push({ narr: tip, parts: f[f.length - 1].parts }); return f; }
  var DIG = 'sha256:' + 'ab'.repeat(32);   // a well-formed (fake) image digest for tests

  // ───────────────────────── Topic 1: mesh concepts, sidecar vs ambient ─────────────────────────
  topics.push({
    title: 'Service Mesh Concepts: Data Plane vs Control Plane, Sidecar vs Ambient, Istio vs Linkerd',
    analogy: `<p>Think of a big office where every department sends parcels to every other department. Without help, each department must learn to pack, label, insure, track and re-send lost parcels itself, and each does it a bit differently. A <b>service mesh</b> is a building-wide mailroom service: a <b>courier</b> sits next to every desk (the <b>sidecar</b>) or on every floor (the <b>ambient</b> node proxy), and a <b>head office</b> (the <b>control plane</b>) hands every courier the same rule book: which parcels need a sealed envelope, how many times to retry, and who may send to whom. The departments just hand over the parcel.</p>`,
    explain: `<p>🟢 <b>The problem.</b> Fifty microservices call each other. Each needs timeouts, retries, encryption, identity checks, and metrics for every call. Writing that into every service, in every language, gives fifty slightly different and slightly wrong versions. A <b>service mesh</b> moves this "network plumbing" out of the app into proxies that the platform team runs and configures centrally.</p>
      <p>🟢 <b>Two halves.</b> The <b>data plane</b> is the set of proxies that actually carry every request (Envoy in Istio sidecars and waypoints, <code>ztunnel</code> in Istio ambient, <code>linkerd2-proxy</code> in Linkerd). The <b>control plane</b> never touches your requests: it watches the Kubernetes API, turns your YAML into proxy configuration, pushes it out (Istio's <code>istiod</code> uses the xDS protocol), and acts as the <b>certificate authority</b> that gives each workload its identity.</p>
      ${H.table(['Model', 'Where the proxy runs', 'What you get', 'Cost'], [
        ['<b>Sidecar</b> (Istio classic, Linkerd)', 'an extra container in every Pod, injected by a mutating webhook; iptables (or the CNI plugin) redirects the Pod\'s traffic into it', 'full L7 features per Pod: HTTP routing, retries, mTLS, metrics', 'one proxy per Pod (CPU, memory), Pod restart to inject or upgrade, startup ordering issues'],
        ['<b>Ambient</b> (Istio, GA since 1.24)', '<code>ztunnel</code>: one per <b>node</b> (DaemonSet) for L4 + mTLS; optional <b>waypoint</b> Envoy per namespace or service for L7', 'mTLS and L4 policy for every Pod with zero app changes; L7 only where you deploy a waypoint', 'shared node proxy; L7 hop adds a network hop; newer, fewer battle scars'],
        ['<b>No mesh</b>', 'none', 'app libraries do retries; cert-manager or app code does TLS', 'inconsistent, language-specific, hard to audit']
      ])}
      <p>🔵 <b>Turning it on.</b> Istio sidecar: <code>kubectl label ns shop istio-injection=enabled</code> then restart Pods. Istio ambient: <code>kubectl label ns shop istio.io/dataplane-mode=ambient</code>, no restart needed; add L7 with <code>istioctl waypoint apply -n shop --enroll-namespace</code>. Linkerd: annotate the namespace <code>linkerd.io/inject: enabled</code> and restart; Linkerd's Rust micro-proxy is small and Linkerd turns on mTLS for all meshed TCP traffic automatically.</p>
      <p>🔵 <b>Istio vs Linkerd in one line each.</b> Istio: the most features (rich routing, Gateway API and its own APIs, ambient mode, multi-cluster, Wasm extensions), more moving parts. Linkerd: deliberately smaller, simpler to run, automatic mTLS and golden metrics out of the box, uses Gateway API <code>HTTPRoute</code> for routing; stable release builds now come from Buoyant (open-source edge releases remain free).</p>`,
    clues: ['"we need mTLS between all services without changing code" → a <b>service mesh</b> (ambient ztunnel is the lightest way)', '"sidecar memory is eating our nodes" / "thousands of Pods" → consider <b>ambient</b> (per-node ztunnel, waypoints only where L7 is needed)', '"retries and timeouts implemented differently in every language" → move them into the <b>data plane</b> and configure centrally', '"what does istiod do?" → <b>control plane</b>: config translation (xDS), certificate authority, service discovery; it is not on the request path', '"Job Pods never finish after we added the mesh" → sidecar lifecycle; use native sidecars (Kubernetes 1.29+) or ambient', '"Istio or Linkerd?" → feature breadth vs operational simplicity'],
    code: [SH(`# Kubernetes 1.30+ on kind, Istio in AMBIENT mode (no sidecars)
kind create cluster --name mesh
istioctl install --set profile=ambient --skip-confirmation
kubectl get pods -n istio-system            # istiod, istio-cni-node (DaemonSet), ztunnel (DaemonSet)

kubectl create namespace shop
kubectl label namespace shop istio.io/dataplane-mode=ambient   # L4 + mTLS from now on, no restarts
istioctl waypoint apply -n shop --enroll-namespace             # optional L7 proxy for the namespace
istioctl ztunnel-config workloads | grep shop                  # which Pods ztunnel captures

# Classic SIDECAR mode instead
istioctl install --set profile=default --skip-confirmation
kubectl label namespace shop istio-injection=enabled
kubectl rollout restart deployment -n shop                     # injection happens at Pod creation
istioctl proxy-status                                          # is every Envoy in sync with istiod?`, 'Istio: ambient vs sidecar'),
      SH(`# Linkerd 2.x: CRDs, control plane, then mesh a namespace
linkerd check --pre
linkerd install --crds | kubectl apply -f -
linkerd install | kubectl apply -f -
linkerd check
kubectl annotate namespace shop linkerd.io/inject=enabled
kubectl rollout restart deployment -n shop
linkerd viz install | kubectl apply -f -      # optional dashboard and golden metrics
linkerd viz stat deploy -n shop               # success rate, RPS, latency per deployment`, 'Linkerd: install and inject')],
    codeTitle: ['Istio ambient and sidecar', 'Linkerd'],
    viz: [{
      title: 'One request through a sidecar mesh vs an ambient mesh',
      input: 'ambient',
      inputLabel: 'mode: sidecar or ambient',
      gen: function (input) {
        var mode = String(input || '').trim().toLowerCase();
        if (mode !== 'sidecar' && mode !== 'ambient') throw new Error('Type sidecar or ambient');
        if (mode === 'sidecar') {
          var n = [box('a', 'frontend app', 6, 10, 16), box('pa', 'Envoy sidecar', 30, 10, 16), box('pb', 'Envoy sidecar', 58, 10, 16), box('b', 'cart app', 84, 10, 14), box('cp', 'istiod (control plane)', 44, 46, 26)];
          var e = [['a', 'pa', 'localhost'], ['pa', 'pb', 'mTLS'], ['pb', 'b', 'localhost'], ['cp', 'pa', 'xDS + cert'], ['cp', 'pb', 'xDS + cert']];
          return flow('sidecar mode', n, e, [
            ['Before any request, <b>istiod</b> pushes config (routes, retries, policies) and a short-lived certificate to <b>every sidecar</b> over xDS. It is not on the request path.', { cp: 'cur' }, { 'cp-pa': 'cur', 'cp-pb': 'cur' }],
            ['The frontend calls <code>http://cart:8080</code>. iptables rules (set up by an init container or the Istio CNI) silently redirect the call into <b>its own sidecar</b>.', { a: 'cur', pa: 'win' }, { 'a-pa': 'cur' }],
            ['The client sidecar applies L7 rules (route, timeout, retry), opens <b>mTLS</b> with its certificate, and sends to a cart Pod chosen by its load balancer.', { pa: 'cur' }, { 'pa-pb': 'cur' }, { pa: 'L7' }],
            ['The server sidecar checks the peer certificate (SPIFFE identity) against AuthorizationPolicy, then hands plain HTTP to the cart app on localhost.', { pb: 'cur', b: 'ok' }, { 'pb-b': 'ok' }, { pb: 'authz' }],
            ['Cost: <b>two Envoys per hop</b> and one per Pod. 1,000 Pods means 1,000 proxies to run, upgrade (by restarting Pods) and feed config.', { pa: 'bad', pb: 'bad' }, {}]
          ]);
        }
        var n2 = [box('a', 'frontend Pod', 6, 8, 16), box('z1', 'ztunnel node 1', 30, 8, 16), box('w', 'waypoint (L7)', 56, 30, 18), box('z2', 'ztunnel node 2', 56, 8, 16), box('b', 'cart Pod', 84, 8, 14), box('cp', 'istiod', 24, 46, 16)];
        var e2 = [['a', 'z1', 'redirected'], ['z1', 'w', 'HBONE'], ['w', 'z2', 'HBONE'], ['z1', 'z2', 'HBONE (no waypoint)'], ['z2', 'b', 'plain'], ['cp', 'z1', 'xDS + certs']];
        return flow('ambient mode', n2, e2, [
          ['The Pods have <b>no sidecar</b>. A per-node <b>ztunnel</b> (written in Rust) holds certificates for every Pod on its node; istiod pushes them.', { cp: 'cur', z1: 'win' }, { 'cp-z1': 'cur' }],
          ['The frontend sends to <code>cart:8080</code>. The Istio CNI redirects the traffic <b>inside the Pod\'s network namespace</b> to the local ztunnel.', { a: 'cur' }, { 'a-z1': 'cur' }],
          ['Without a waypoint: ztunnel opens an <b>HBONE</b> tunnel (HTTP CONNECT over mTLS, port 15008) straight to the destination node\'s ztunnel. You get mTLS, L4 authorization and TCP metrics.', { z1: 'cur', z2: 'ok' }, { 'z1-z2': 'cur' }],
          ['With a <b>waypoint</b> for the cart service: traffic goes through one Envoy that applies HTTP routing, retries and L7 AuthorizationPolicy, then on to the destination ztunnel.', { w: 'cur' }, { 'z1-w': 'cur', 'w-z2': 'cur' }, { w: 'L7' }],
          ['The destination ztunnel ends the tunnel and delivers to the cart Pod. Cost: one ztunnel per node, plus waypoints only where you need L7.', { b: 'ok', z2: 'ok' }, { 'z2-b': 'ok' }]
        ]);
      }
    }],
    examples: [
      { title: 'Situation: sidecar memory on a 2,000-Pod cluster', html: `<p>A platform team runs 2,000 Pods with Istio sidecars. Each sidecar requests 100m CPU and 128 MiB, so the mesh reserves <b>200 CPU cores and 250 GiB</b> before serving a single request, and every Istio upgrade means restarting every Pod. Moving to ambient: 40 nodes × one ztunnel, plus 6 waypoints for the services that need HTTP routing. The reservation drops by more than 90%, and upgrades roll the ztunnel DaemonSet instead of every app. Trade-off they accepted: L7 features now require deciding where waypoints go.</p>` },
      { title: 'Situation: Jobs that never finish', html: `<p>After enabling sidecar injection, nightly CronJob Pods stay <code>Running</code> forever: the app container exits, but the Envoy sidecar keeps running, so the Pod never completes. Old fixes were hacks (curl <code>/quitquitquit</code> at the end of the script). Modern fixes: Kubernetes <b>native sidecars</b> (init containers with <code>restartPolicy: Always</code>, on by default since 1.29), which Istio uses when <code>ENABLE_NATIVE_SIDECARS</code> is on (default in recent releases), or put the namespace in ambient mode, where there is no sidecar to outlive the Job.</p>` },
      { title: 'Situation: choosing Linkerd for a small team', html: `<p>A 6-person team with 25 services wants mTLS and per-service success rates for an audit. They try Linkerd: <code>linkerd check</code>, inject two namespaces, and <code>linkerd viz stat</code> shows success rate, RPS and p50/p95/p99 latency per deployment within an hour, with mTLS on by default and no policy objects written. They do not need multi-cluster or Wasm, so Istio's extra power would be cost without value. Rule of thumb: pick the smallest mesh that meets the requirement, or no mesh if a library and cert-manager do.</p>` }
    ],
    deepDive: `<p>🟣 <b>How traffic gets into the proxy.</b> Sidecar mode uses iptables REDIRECT rules in each Pod's network namespace (installed by the <code>istio-init</code> init container, which needs NET_ADMIN, or by the <b>Istio CNI</b> node agent so app Pods need no extra privileges). Outbound traffic goes to Envoy port 15001, inbound to 15006. Ambient mode's CNI agent sets up redirection inside the Pod's namespace to the node's ztunnel (ports 15001/15006/15008), which is why ztunnel can act with the Pod's identity without sharing a network namespace with it.</p>
      <p>🟣 <b>xDS.</b> Envoy learns everything dynamically: Listener (LDS), Route (RDS), Cluster (CDS), Endpoint (EDS) and Secret (SDS) discovery. In a big cluster the control plane cost is pushing config to every proxy on each change; Istio's <code>Sidecar</code> resource (or <code>discoverySelectors</code> in mesh config) limits what each proxy needs to know, which cuts istiod CPU and proxy memory dramatically. <code>istioctl proxy-config routes|clusters|endpoints &lt;pod&gt;</code> shows what a proxy actually received.</p>
      <p>🟣 <b>HBONE.</b> Ambient's tunnel is HTTP/2 CONNECT inside mTLS on port 15008. Many connections are multiplexed, the original destination travels in the CONNECT request, and the mTLS identity is the source workload's SPIFFE ID (ztunnel holds certificates per service account on its node, never one shared node identity). Waypoints are ordinary Envoy Deployments managed through the Gateway API (<code>gatewayClassName: istio-waypoint</code>), so you scale them like any other workload.</p>
      <p>🟣 <b>Failure modes.</b> If istiod is down, proxies keep their last config and certificates keep working until they expire (24h by default), so new Pods cannot get certificates; run istiod with replicas and a PodDisruptionBudget. A mesh also adds latency (often a fraction of a millisecond to a few ms per hop at p99) and a new layer to debug, so measure it.</p>`,
    aiEra: `<p>🤖 <b>AI is good at the YAML, weak at the topology.</b> Assistants produce valid-looking VirtualServices and AuthorizationPolicies quickly, but they often mix sidecar and ambient assumptions (for example, writing an L7 policy that needs a waypoint into a namespace that has none, where ztunnel can only enforce L4). Always ask: which proxy will enforce this rule? Then check with <code>istioctl analyze</code> and <code>istioctl x describe pod</code>.</p>
      <p>🤖 <b>Meshes for AI workloads.</b> LLM gateways and model servers are now mesh citizens too: long streaming responses need generous timeouts and no retries on non-idempotent generations, and the Gateway API Inference Extension adds model-aware routing on top of the same Gateway API resources. Treat an AI agent's outbound calls like any other workload: give it its own service account so mesh policy can restrict what it can reach.</p>`,
    problems: [P({
      t: 'Estimate mesh memory: sidecar vs ambient vs Linkerd',
      l: 'Easy', tags: ['capacity', 'ambient', 'sidecar', 'python'], co: ['Google', 'Solo.io'],
      s: PYC + `<p>Write <code>mesh_memory_mib(pods_per_node, mode, waypoints)</code> using these illustrative per-proxy figures: Istio <b>sidecar</b> 60 MiB per Pod; <b>ambient</b> 40 MiB per node for ztunnel (every node in the list, even with 0 Pods) plus 80 MiB per waypoint; <b>linkerd</b> sidecar 20 MiB per Pod. Waypoints count only in ambient mode. An unknown mode returns <code>-1</code>.</p>`,
      ex: `<p><code>mesh_memory_mib([10,10,10], "sidecar", 0)</code> &rarr; <span class="c-r">1800</span> (30 Pods × 60). <code>mesh_memory_mib([10,10,10], "ambient", 2)</code> &rarr; <span class="c-g">280</span> (3 nodes × 40 + 2 × 80).</p>`,
      bw: `<p>Guessing "the mesh is a bit of overhead" without numbers. Teams then discover in production that proxies reserve more memory than some apps, and the cluster autoscaler adds nodes just to host sidecars.</p>`,
      q: ['Which number grows with the Pod count in ambient mode?', ['None of the ztunnel memory: ztunnel scales with nodes, not Pods', 'Waypoint count', 'Sidecar count', 'istiod replicas'], 0, 'ztunnel is a DaemonSet: one per node. Ambient cost tracks nodes plus the waypoints you choose to deploy.'],
      h: ['Hint 1: sidecar and linkerd modes depend only on the total number of Pods.', 'Hint 2: ambient depends on the number of nodes (the length of the list) and the waypoint count.', 'Hint 3: check the mode first; return -1 for anything that is not sidecar, ambient or linkerd.'],
      a: `<p>Sum the Pods for the per-Pod modes; use the list length for ambient. The model shows why ambient wins on dense nodes: 10 Pods per node costs 600 MiB of sidecars but 40 MiB of ztunnel. Real numbers vary with traffic and config size, so measure with <code>kubectl top pod --containers</code>.</p>`,
      code: PY(`def mesh_memory_mib(pods_per_node, mode, waypoints):
    pods = sum(pods_per_node)
    if mode == "sidecar":
        return 60 * pods                     # one Envoy per Pod
    if mode == "linkerd":
        return 20 * pods                     # one small Rust proxy per Pod
    if mode == "ambient":
        return 40 * len(pods_per_node) + 80 * waypoints   # ztunnel per node + waypoints
    return -1`),
      cx: `<p>O(N) time for N nodes, O(1) extra space.</p>`,
      f: ['Add CPU with the same structure. Which mode is most sensitive to request rate rather than Pod count?', 'How would you place waypoints to keep the ambient number low (per namespace vs per service)?'],
      tests: { sig: 'int[] string int -> int', fn: 'meshMemoryMib', cases: [
        [[[10, 10, 10], 'sidecar', 0], 1800], [[[10, 10, 10], 'ambient', 0], 120], [[[10, 10, 10], 'ambient', 2], 280],
        [[[], 'sidecar', 0], 0], [[[], 'ambient', 1], 80], [[[0, 5], 'ambient', 0], 80], [[[0, 5], 'sidecar', 3], 300],
        [[[1], 'linkerd', 0], 20], [[[3, 4], 'linkerd', 0], 140], [[[1], 'mystery', 0], -1]
      ] }
    })]
  });

  // ───────────────────────── Topic 2: traffic management ─────────────────────────
  topics.push({
    title: 'Traffic Management: Traffic Splitting, Retries, Timeouts and Circuit Breaking (Istio and Linkerd)',
    analogy: `<p>Think of a restaurant kitchen during a new-menu trial. The head chef sends <b>one plate in ten</b> to the new cook (traffic splitting). If a dish is not ready in 5 minutes it is cancelled rather than leaving the customer waiting forever (timeout). A dropped plate is remade once, but not five times, or the kitchen drowns (retry budget). And a cook who ruins three plates in a row is <b>benched for a while</b> so the others take the orders (circuit breaking / outlier detection).</p>`,
    explain: `<p>🟢 <b>Four tools, one goal: fail small.</b> The mesh lets you change how requests flow without redeploying apps.</p>
      ${H.table(['Tool', 'Istio API', 'Linkerd / Gateway API', 'What it protects against'], [
        ['<b>Traffic split</b>', '<code>VirtualService</code> route <code>weight</code> + <code>DestinationRule</code> subsets', '<code>HTTPRoute</code> <code>backendRefs</code> with <code>weight</code>', 'a bad release hitting 100% of users'],
        ['<b>Timeout</b>', '<code>timeout: 2s</code> on the route (HTTP has no default timeout in Istio)', 'HTTPRoute <code>timeouts.request</code>; Linkerd timeout annotations', 'threads and connections piling up behind a slow dependency'],
        ['<b>Retry</b>', '<code>retries: {attempts, perTryTimeout, retryOn}</code> (Istio retries 2 times by default on connect errors and some 503s)', 'Linkerd: <code>retry.linkerd.io/http: 5xx</code>, <code>retry.linkerd.io/limit</code> annotations on Service or HTTPRoute', 'brief blips: a Pod restarting, a dropped connection'],
        ['<b>Circuit breaking</b>', '<code>DestinationRule</code> <code>connectionPool</code> limits + <code>outlierDetection</code>', 'Linkerd failure accrual (consecutive failures) on the Service', 'one sick Pod or an overloaded service dragging everyone down']
      ])}
      <p>🟢 <b>Weights.</b> A 90/10 split means, over many requests, 90% go to v1 and 10% to v2. Proxies pick per request (or per connection for TCP), so you see the ratio over time, not exactly every tenth request.</p>
      <p>🔵 <b>The retry storm.</b> Three layers each retrying 3 times turns 1 failing call into 4 × 4 × 4 = <b>64</b> calls on the bottom service. Rules: retry at <b>one</b> layer (usually the mesh, closest to the caller), only <b>idempotent</b> requests (GET, or POSTs with an idempotency key), with a <b>per-try timeout</b> smaller than the overall timeout, and with a budget. Linkerd's retry budget (a ratio of extra load, e.g. 20%) is designed exactly for this.</p>
      <p>🔵 <b>Circuit breaking in Istio</b> has two parts. <code>connectionPool</code> caps concurrent connections and pending requests; overflow fails fast with 503 and the flag <code>UO</code> (upstream overflow) in the access log. <code>outlierDetection</code> ejects an individual Pod after <code>consecutive5xxErrors</code>, for <code>baseEjectionTime</code> × the number of times it has been ejected, never more than <code>maxEjectionPercent</code> of the pool.</p>`,
    clues: ['"canary 10% of traffic to v2" → weighted routes (VirtualService weights or HTTPRoute backendRefs weight)', '"one bad Pod keeps returning 500s" → <b>outlier detection</b> ejects it from the pool', '"a slow dependency takes the whole site down" → <b>timeouts</b> plus connection pool limits (fail fast)', '"retries made the outage worse" → retry storm; retry at one layer, idempotent only, with a budget and per-try timeout', '"route the beta header to v2" → match on headers before the weighted default route', '"503 with UO / UF / URX flags in Envoy logs" → overflow, connection failure, retries exhausted'],
    code: [Y(`# Istio: 90/10 canary for "reviews" with timeout, retries and circuit breaking
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: reviews
  namespace: shop
spec:
  host: reviews.shop.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100          # cap open connections to the whole service
      http:
        http1MaxPendingRequests: 50  # queue beyond this fails fast (503, flag UO)
        maxRequestsPerConnection: 0
    outlierDetection:
      consecutive5xxErrors: 5        # 5 errors in a row ejects that Pod
      interval: 10s
      baseEjectionTime: 30s          # 30s, then 60s, 90s ... on repeat ejections
      maxEjectionPercent: 50         # never eject more than half the Pods
  subsets:
    - name: v1
      labels: {version: v1}
    - name: v2
      labels: {version: v2}
---
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: reviews
  namespace: shop
spec:
  hosts: [reviews]
  http:
    - match:
        - headers:
            x-beta: {exact: "true"}  # testers always get v2
      route:
        - destination: {host: reviews, subset: v2}
    - route:
        - destination: {host: reviews, subset: v1}
          weight: 90
        - destination: {host: reviews, subset: v2}
          weight: 10
      timeout: 3s                     # whole request, all retries included
      retries:
        attempts: 2                   # 2 retries after the first try
        perTryTimeout: 1s
        retryOn: connect-failure,refused-stream,unavailable,cancelled,503`, 'Istio DestinationRule + VirtualService'),
      Y(`# Gateway API HTTPRoute (works with Linkerd and with Istio waypoints / gateways)
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: reviews-split
  namespace: shop
  annotations:
    retry.linkerd.io/http: 5xx        # Linkerd: retry 5xx responses
    retry.linkerd.io/limit: "2"
    retry.linkerd.io/timeout: 300ms   # per-try timeout
spec:
  parentRefs:
    - name: reviews                   # attach to the Service (GAMMA / mesh routing)
      kind: Service
      group: ""
      port: 9080
  rules:
    - backendRefs:
        - name: reviews-v1
          port: 9080
          weight: 90
        - name: reviews-v2
          port: 9080
          weight: 10
      timeouts:
        request: 3s`, 'Gateway API HTTPRoute (mesh)')],
    codeTitle: ['Istio canary + resilience', 'Gateway API / Linkerd'],
    viz: [{
      title: 'Smooth weighted routing: which version gets each request?',
      input: '90,10',
      inputLabel: 'weights for v1,v2 (or v1,v2,v3), e.g. 90,10 or 5,1,1',
      gen: function (input) {
        var w = String(input || '').split(',').map(function (s) { return parseInt(s.trim(), 10); });
        if (w.length < 2 || w.length > 3 || w.some(function (x) { return isNaN(x) || x < 0 || x > 1000; })) throw new Error('Give 2 or 3 weights from 0 to 1000, e.g. 90,10');
        var total = w.reduce(function (a, b) { return a + b; }, 0);
        if (!total) throw new Error('At least one weight must be above 0');
        var names = ['v1', 'v2', 'v3'].slice(0, w.length), cur = w.map(function () { return 0; }), got = w.map(function () { return 0; });
        var frames = [{ narr: 'Weights ' + w.join(' / ') + ' (total ' + total + '). Each request: add each weight to its running score, send to the highest score, then subtract the total from the winner. This is the "smooth weighted round robin" many proxies use; it spreads picks evenly instead of bursting.', parts: [{ type: 'bars', label: 'running score', values: cur.slice(), idxLabels: names }, { type: 'vars', label: 'requests sent', vals: { v1: 0, v2: 0 } }] }];
        var steps = Math.min(total, 12);
        for (var k = 1; k <= steps; k++) {
          var best = 0, i;
          for (i = 0; i < w.length; i++) cur[i] += w[i];
          for (i = 1; i < w.length; i++) if (cur[i] > cur[best]) best = i;
          var before = cur.slice();
          cur[best] -= total; got[best]++;
          var vals = {}; names.forEach(function (nm, j) { vals[nm] = got[j]; });
          var hl = {}; hl[best] = 'ok';
          frames.push({ narr: 'Request ' + k + ': scores after adding weights = [' + before.join(', ') + ']. Highest is <b>' + names[best] + '</b>' + (before.filter(function (x) { return x === before[best]; }).length > 1 ? ' (tie: lowest index wins)' : '') + ', so it gets the request and drops by ' + total + '.', parts: [{ type: 'bars', label: 'running score after the pick', values: cur.slice(), idxLabels: names, hl: hl }, { type: 'vars', label: 'requests sent', vals: vals, hl: (function () { var o = {}; o[names[best]] = 'ok'; return o; })() }] });
        }
        frames.push({ narr: 'After ' + steps + ' requests the counts are ' + names.map(function (nm, j) { return nm + '=' + got[j]; }).join(', ') + '. Over every block of ' + total + ' requests the split is exact. Envoy itself uses random weighted picks per request, so real traffic matches the ratio statistically rather than this exact pattern.', parts: frames[frames.length - 1].parts });
        return pad4(frames, 'Weights decide the long-run share.');
      }
    }],
    examples: [
      { title: 'Situation: the retry storm', html: `<p>Checkout calls payments, which calls a fraud service. Each app library retries 3 times and Istio adds 2 more retries per hop. The fraud service slows down; within a minute it receives roughly 20× its normal traffic, all retries of retries, and falls over completely. Fix: remove library retries (the mesh does it once), keep retries only on the hop closest to the failure, add <code>perTryTimeout</code> and an overall <code>timeout</code>, and limit concurrency with <code>connectionPool</code> so overload fails fast instead of queueing.</p>` },
      { title: 'Situation: one bad Pod out of ten', html: `<p>A node with a broken disk makes one <code>reviews</code> Pod return 500s. Without outlier detection, about 10% of requests fail forever (readiness still passes because <code>/healthz</code> does not touch the disk). With <code>consecutive5xxErrors: 5</code>, the Pod is ejected after five failures for 30 seconds, then 60, then 90 on repeat offences, and the error rate falls to near zero while the on-call engineer drains the node.</p>` },
      { title: 'Situation: canary by header, then by weight', html: `<p>Step 1: QA sends <code>x-beta: true</code> and gets v2 while customers see only v1 (the header match comes <b>first</b> in the route list; Istio uses the first match). Step 2: weights 95/5, watch v2's success rate and p99 for 15 minutes. Step 3: 75/25, then 50/50, then 0/100. Tools such as Flagger or Argo Rollouts automate exactly this loop, rolling back when metrics fall below a threshold.</p>` }
    ],
    deepDive: `<p>🟣 <b>Ordering and defaults.</b> Istio evaluates <code>http</code> routes top to bottom; the first match wins, so put specific matches before the catch-all. The default HTTP retry policy in Istio is 2 attempts on <code>connect-failure,refused-stream,unavailable,cancelled,retriable-status-codes</code>; set <code>retries.attempts: 0</code> for non-idempotent endpoints. A per-try timeout × (attempts + 1) can exceed the route <code>timeout</code>; the overall timeout always wins, so later retries may never happen.</p>
      <p>🟣 <b>Outlier detection details.</b> The ejection time grows linearly: <code>baseEjectionTime × times_ejected</code>. <code>maxEjectionPercent</code> stops a cascading failure from emptying the pool (if all Pods fail, ejecting them all would turn degraded into dead). With very few endpoints, set <code>minHealthPercent</code> thinking in mind: Envoy enters "panic mode" and ignores health when too few hosts are healthy. Outlier detection is passive (it watches real traffic); Kubernetes readiness probes are active; you want both.</p>
      <p>🟣 <b>Locality and connection reuse.</b> HTTP/2 between proxies multiplexes many requests on few connections, so <code>maxConnections</code> may not be the limit you expect; <code>http2MaxRequests</code> caps concurrent requests. Locality-aware load balancing (requires outlier detection to be on) keeps traffic in the same zone and fails over across zones, which also saves cross-AZ data charges. In ambient mode, all these L7 policies are enforced by the <b>waypoint</b>; ztunnel alone only does L4.</p>
      <p>🟣 <b>Linkerd specifics.</b> Linkerd 2.16+ configures retries and timeouts with annotations on Service, HTTPRoute or GRPCRoute, and does consecutive-failure circuit breaking with <code>balancer.linkerd.io/failure-accrual: consecutive</code>. Its load balancer is EWMA latency-aware by default, which already steers away from slow Pods.</p>`,
    aiEra: `<p>🤖 <b>AI generates rollout configs; metrics decide.</b> Assistants write VirtualService weights and Argo Rollouts analysis templates well. What they cannot know is your real SLO and which endpoints are idempotent. Ask the assistant to list every route that has retries enabled and to justify each as idempotent; that review catches the double-charge bug before customers do.</p>
      <p>🤖 <b>LLM traffic changes the defaults.</b> Model inference calls take seconds to minutes and stream tokens. A 3s mesh timeout kills them; a blind retry doubles GPU cost and may produce a different answer. Use long timeouts on those routes, no automatic retries on generation endpoints, and concurrency limits (connectionPool) to protect scarce GPUs.</p>`,
    problems: [P({
      t: 'Weighted traffic-split router (smooth weighted round robin)',
      l: 'Medium', tags: ['traffic split', 'canary', 'load balancing', 'python'], co: ['Lyft', 'NGINX', 'Google'],
      s: PYC + `<p>Write <code>smooth_weighted(names, weights, n)</code> returning the backend chosen for each of <code>n</code> requests. Each step: add every weight to that backend's running score; pick the highest score (ties go to the <b>lowest index</b>); subtract the total weight from the winner. If the total weight is 0 (no healthy route) or <code>n</code> is 0, return an empty list.</p>`,
      ex: `<p><code>smooth_weighted(["a","b","c"], [5,1,1], 7)</code> &rarr; <span class="c-g">["a","a","b","a","c","a","a"]</span>. Scores go [5,1,1] &rarr; a wins &rarr; [-2,1,1]; then [3,2,2] &rarr; a; then [1,3,3] &rarr; b (tie, lower index) and so on. Over 7 requests a gets exactly 5.</p>`,
      bw: `<p>Plain weighted round robin sends a block of 5 a's then b then c. Burst-shaped traffic hurts the canary (5 requests in a row to one backend) and random picks only match the ratio on average, so small tests look wrong.</p>`,
      q: ['With weights [3,1], what is the 3rd pick?', ['v2', 'v1', 'either, randomly', 'none'], 0, 'Scores: [3,1] v1 → [-1,1]; [2,2] tie v1 → [-2,2]; [1,3] v2. So the order is v1, v1, v2, v1.'],
      h: ['Hint 1: keep one running score per backend, starting at zero.', 'Hint 2: each step add all weights, find the max with a strict greater-than so ties keep the lowest index, then subtract the total from the winner.', 'Hint 3: handle total weight 0 and n = 0 first; a backend with weight 0 is never picked once any other weight is positive.'],
      a: `<p>Keep scores, add weights, pick max, subtract total. The sum of scores is always 0 after each step, which is why the pattern repeats every <code>total</code> requests with exactly the right counts. This is the algorithm NGINX uses for weighted upstreams; Envoy uses weighted random or EDF scheduling, which has the same long-run ratio.</p>`,
      code: PY(`def smooth_weighted(names, weights, n):
    total = sum(weights)
    if total == 0 or n <= 0:
        return []                              # nothing routable
    score = [0] * len(weights)
    picks = []
    for _ in range(n):
        best = 0
        for i in range(len(weights)):
            score[i] += weights[i]
        for i in range(1, len(weights)):
            if score[i] > score[best]:         # strict: ties keep the lowest index
                best = i
        score[best] -= total
        picks.append(names[best])
    return picks`),
      cx: `<p>O(n × b) for n requests and b backends.</p>`,
      f: ['How would you make the split sticky per user (consistent hashing on a header or cookie) while keeping the ratio?', 'Why does Envoy prefer random weighted picks across many proxies? (No shared state between hundreds of sidecars.)'],
      tests: { sig: 'string[] int[] int -> string[]', fn: 'smoothWeighted', cases: [
        [[['v1', 'v2'], [3, 1], 4], ['v1', 'v1', 'v2', 'v1']],
        [[['a', 'b', 'c'], [5, 1, 1], 7], ['a', 'a', 'b', 'a', 'c', 'a', 'a']],
        [[['v1', 'v2'], [100, 0], 3], ['v1', 'v1', 'v1']],
        [[['v1', 'v2'], [0, 0], 2], []],
        [[['v1', 'v2'], [90, 10], 0], []],
        [[['x', 'y'], [1, 1], 4], ['x', 'y', 'x', 'y']],
        [[['v1', 'v2'], [90, 10], 10], ['v1', 'v1', 'v1', 'v1', 'v1', 'v2', 'v1', 'v1', 'v1', 'v1']]
      ] }
    })]
  });

  // ───────────────────────── Topic 3: mTLS, SPIFFE identity, AuthorizationPolicy ─────────────────────────
  topics.push({
    title: 'mTLS and Workload Identity: SPIFFE IDs, PeerAuthentication and AuthorizationPolicy',
    analogy: `<p>Think of a hospital where staff badges are reissued every morning. Every door has a reader: you show your badge, and the door shows <b>its</b> badge too, so you know you are entering the real pharmacy and not a fake room (that is <b>mutual</b> TLS). The badge does not say "desk 4, IP 10.0.3.7"; it says "<b>Nurse, Ward B</b>", because people move between desks but their role stays the same. The list on each door ("only Ward B nurses and pharmacists") is the <b>authorization policy</b>.</p>`,
    explain: `<p>🟢 <b>Why IPs are a bad identity.</b> In Kubernetes, Pod IPs change on every restart and get reused by other Pods minutes later. A rule like "allow 10.0.3.7" may allow the wrong workload tomorrow. A mesh gives each workload a <b>cryptographic identity</b> instead, tied to its <b>service account</b>, and proves it on every connection with mutual TLS.</p>
      <p>🟢 <b>SPIFFE</b> (Secure Production Identity Framework For Everyone, a CNCF standard) defines the name format and the document that proves it. Istio and Linkerd both issue SPIFFE-style X.509 certificates:</p>
      ${H.table(['Piece', 'Example', 'Meaning'], [
        ['SPIFFE ID', '<code>spiffe://cluster.local/ns/shop/sa/frontend</code>', 'trust domain <code>cluster.local</code>, namespace <code>shop</code>, service account <code>frontend</code>'],
        ['SVID', 'X.509 certificate with that ID in the URI SAN', 'the "badge"; Istio default lifetime 24h, rotated automatically well before expiry'],
        ['Trust bundle', 'the root CA certificate(s)', 'what every proxy uses to check the other side\'s badge'],
        ['Istio principal', '<code>cluster.local/ns/shop/sa/frontend</code>', 'the SPIFFE ID without <code>spiffe://</code>, used in AuthorizationPolicy']
      ])}
      <p>🔵 <b>Turning mTLS on.</b> Istio already uses mTLS between meshed workloads by default (<b>PERMISSIVE</b> mode: accept both mTLS and plain text, so unmeshed clients keep working during migration). <b>STRICT</b> rejects plain text. Apply a <code>PeerAuthentication</code> in <code>istio-system</code> to set it mesh-wide. In ambient mode, ztunnel always uses mTLS between meshed Pods. Linkerd enables mTLS for all meshed TCP traffic automatically.</p>
      <p>🔵 <b>Authorization</b> decides <i>who may call what</i>. Istio's <code>AuthorizationPolicy</code> evaluation order: <b>CUSTOM</b> (external authorizer) first, then <b>DENY</b> (any match denies), then <b>ALLOW</b>: if <b>no ALLOW policy</b> selects the workload, the request is allowed; if at least one exists, the request must match one of them. Linkerd uses <code>Server</code> + <code>AuthorizationPolicy</code> + <code>MeshTLSAuthentication</code> resources with a default policy you can set to <code>deny</code>.</p>`,
    clues: ['"zero trust between services" / "encrypt east-west traffic" → mesh <b>mTLS STRICT</b> + identity-based AuthorizationPolicy', '"Pod IPs change, firewall rules break" → identity from <b>service accounts</b> (SPIFFE), not IPs', '"only the frontend may call payments" → AuthorizationPolicy with <code>principals</code>', '"after STRICT, the legacy VM can no longer connect" → it is not in the mesh; PERMISSIVE during migration, or mesh the VM', '"an empty ALLOW policy blocks everything" → allow-nothing semantics; know the evaluation order', '"how are certificates rotated?" → the agent/ztunnel requests new SVIDs from istiod via SDS; 24h default'],
    code: [Y(`# 1) Mesh-wide STRICT mTLS (only after every client is meshed!)
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system      # root namespace = mesh-wide
spec:
  mtls:
    mode: STRICT
---
# 2) Default deny for the namespace: an ALLOW policy with no rules matches nothing
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-nothing
  namespace: shop
spec:
  action: ALLOW
---
# 3) Only the frontend's identity may call payments, and only POST /charge
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: payments-from-frontend
  namespace: shop
spec:
  selector:
    matchLabels: {app: payments}
  action: ALLOW
  rules:
    - from:
        - source:
            principals: ["cluster.local/ns/shop/sa/frontend"]   # SPIFFE ID minus spiffe://
      to:
        - operation:
            methods: ["POST"]
            paths: ["/charge"]
---
# 4) A DENY that wins over any ALLOW: nobody from the dev namespace, ever
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-dev
  namespace: shop
spec:
  action: DENY
  rules:
    - from:
        - source:
            namespaces: ["dev"]`, 'Istio PeerAuthentication + AuthorizationPolicy'),
      SH(`# Inspect identities and certificates
istioctl proxy-config secret deploy/frontend -n shop          # sidecar: cert chain, validity
istioctl ztunnel-config certificates                          # ambient: certs held by ztunnel
kubectl exec deploy/frontend -n shop -c istio-proxy -- \\
  openssl s_client -connect payments:8080 -showcerts </dev/null 2>/dev/null | openssl x509 -noout -ext subjectAltName
linkerd viz edges deploy -n shop       # Linkerd: which edges are mTLS, with client and server identities
linkerd viz tap deploy/payments -n shop | grep tls=true`, 'Check mTLS in practice')],
    codeTitle: ['mTLS + authorization', 'Verify certificates'],
    viz: [{
      title: 'AuthorizationPolicy evaluation: CUSTOM → DENY → ALLOW',
      input: 'cluster.local/ns/shop/sa/frontend POST /charge',
      inputLabel: 'principal method path (try ns/dev, sa/batch or GET)',
      gen: function (input) {
        var p = String(input || '').trim().split(/\s+/);
        if (p.length !== 3 || p[2].charAt(0) !== '/') throw new Error('Format: principal METHOD /path, e.g. cluster.local/ns/shop/sa/frontend POST /charge');
        var who = p[0], method = p[1].toUpperCase(), path = p[2];
        var ns = (who.match(/\/ns\/([^/]+)/) || [])[1] || '?';
        var rows = [['deny-dev', 'DENY', 'source namespace = dev', '?'], ['allow-nothing', 'ALLOW', '(no rules: matches nothing)', '?'], ['payments-from-frontend', 'ALLOW', 'principal frontend AND POST /charge', '?']];
        var frames = [];
        function snap(msg, hl) { frames.push({ narr: msg, parts: [{ type: 'table', label: 'policies selecting the payments workload', columns: ['policy', 'action', 'matches when', 'result'], rows: rows.map(function (r) { return r.slice(); }), hl: hl || {} }, { type: 'vars', label: 'request', vals: { principal: who, namespace: ns, method: method, path: path } }] }); }
        snap('The request reaches the payments proxy. Its mTLS certificate proves the caller is <code>' + who + '</code>. No CUSTOM policy exists, so evaluation starts with DENY policies.', {});
        var denied = ns === 'dev';
        rows[0][3] = denied ? 'MATCH' : 'no match';
        snap(denied ? '<b>DENY policy matches</b>: the caller is in namespace dev. DENY always wins, whatever ALLOW policies say. Result: <b>403 RBAC: access denied</b>.' : 'DENY policy does not match (namespace ' + ns + '). Move on to ALLOW policies.', { 0: denied ? 'bad' : 'done' });
        if (denied) { snap('Evaluation stops here. Tip: DENY policies are the right tool for hard guard rails that teams must not override with an ALLOW.', { 0: 'bad' }); return frames; }
        rows[1][3] = 'no match';
        snap('<code>allow-nothing</code> has no rules, so it never matches. Its job is to make sure at least one ALLOW policy exists, which switches the workload to "default deny".', { 1: 'done' });
        var ok = who === 'cluster.local/ns/shop/sa/frontend' && method === 'POST' && path === '/charge';
        rows[2][3] = ok ? 'MATCH' : 'no match';
        snap(ok ? 'The principal, method and path all match <code>payments-from-frontend</code>. Fields inside one rule are AND-ed.' : 'This ALLOW rule needs principal frontend AND POST AND /charge; at least one does not match.', { 2: ok ? 'ok' : 'bad' });
        snap(ok ? 'At least one ALLOW matched: <b>request allowed</b>.' : 'ALLOW policies exist and none matched, so the request is <b>denied (403)</b>. This is what default-deny looks like.', { 2: ok ? 'sel' : 'bad' });
        return frames;
      }
    }],
    examples: [
      { title: 'Situation: STRICT broke the legacy monitoring scraper', html: `<p>The team flips the mesh to STRICT on Friday. Prometheus, running <b>outside</b> the mesh, starts getting connection resets from every app's metrics port, and dashboards go blank. Root cause: PERMISSIVE was silently accepting plain text from the unmeshed scraper. Fix: mesh Prometheus (Istio documents an option to give it certificates), or add a port-level exception with <code>portLevelMtls</code> for the metrics port, and before STRICT check Kiali or <code>istio_requests_total{connection_security_policy="none"}</code> for remaining plain-text clients.</p>` },
      { title: 'Situation: "we allowed the frontend, now everything else is 403"', html: `<p>An engineer adds one ALLOW policy for <code>frontend → payments</code>. Ten minutes later the batch reconciler (which also calls payments) gets <code>RBAC: access denied</code>. Not a bug: as soon as <b>one</b> ALLOW policy selects a workload, everything not explicitly allowed is denied. The fix is a second rule for the batch service account, and the lesson is to inventory callers first (<code>linkerd viz edges</code>, Kiali graph or <code>istio_requests_total</code> by <code>source_principal</code>).</p>` },
      { title: 'Situation: the stolen Pod and lateral movement', html: `<p>An attacker gets code execution in the <code>reviews</code> Pod through an app bug. Without identity-based policy, the Pod can call payments, the admin API and the database proxy. With default-deny AuthorizationPolicies, the proxy only lets <code>sa/reviews</code> reach what reviews needs, and every other call is a logged 403. The attacker cannot forge <code>sa/frontend</code>: the private key for that identity lives only in the frontend's proxy (or in ztunnel's memory for that workload).</p>` }
    ],
    deepDive: `<p>🟣 <b>Certificate flow.</b> In sidecar mode the <code>istio-agent</code> in each proxy generates a private key, sends a CSR to istiod authenticated with the Pod's projected service-account token, and serves the signed cert to Envoy over SDS (the key never leaves the Pod). In ambient mode ztunnel requests certificates for each service account that has Pods on its node, using its own token plus impersonation rules enforced by istiod. Plug in your own CA with <code>cacerts</code> or cert-manager's istio-csr; production meshes chain to an offline root and rotate intermediates.</p>
      <p>🟣 <b>Trust domain and multi-cluster.</b> <code>cluster.local</code> is the default trust domain. Two clusters sharing a root CA can authenticate each other's workloads; give each cluster its own trust domain (and use <code>trustDomainAliases</code> during migrations) if you need to tell them apart in policy. SPIRE is the reference SPIFFE implementation and can federate identities across Kubernetes, VMs and clouds; Istio can consume SPIRE-issued SVIDs.</p>
      <p>🟣 <b>L4 vs L7 policy in ambient.</b> ztunnel enforces policies with only L4 attributes (principals, namespaces, ports, IP blocks). A policy with HTTP methods or paths must target the <b>waypoint</b> (<code>targetRefs</code> to the Service or the waypoint Gateway); if you attach an L7 rule where only ztunnel runs, Istio treats the unenforceable ALLOW conservatively (it denies) and reports it with <code>istioctl analyze</code>. JWT-based end-user identity (<code>RequestAuthentication</code> + <code>requestPrincipals</code>) is also L7.</p>
      <p>🟣 <b>mTLS is not authorization.</b> Encryption plus identity tells you <i>who</i> is calling; only an explicit policy says whether they may. Many teams stop at STRICT and still have a flat network where any workload can call any other.</p>`,
    aiEra: `<p>🤖 <b>Policy from observed traffic.</b> Mesh telemetry (source and destination principals for every call) is the perfect input for an assistant: "here are 30 days of edges, draft least-privilege AuthorizationPolicies". Review the draft against the edge list and roll it out with <code>action: AUDIT</code> or in a staging namespace first, because an assistant cannot know about the monthly job that did not run in that window.</p>
      <p>🤖 <b>Agent identity.</b> AI agents that call internal tools should each run under their own service account, so their SPIFFE identity appears in every log line and policy can restrict them to exactly the tools they need. "The agent did it" is only auditable if the agent has a name.</p>`,
    problems: [P({
      t: 'Istio AuthorizationPolicy evaluator (DENY before ALLOW)',
      l: 'Medium', tags: ['zero trust', 'authorization', 'SPIFFE', 'python'], co: ['Google', 'Microsoft', 'Solo.io'],
      s: PYC + `<p>Write <code>authorize(policies, source, path)</code>. Each policy is <code>"ACTION|principal|path"</code> where ACTION is ALLOW or DENY, principal is an exact principal or <code>*</code>, and path is <code>*</code> (any), a prefix ending in <code>*</code> (e.g. <code>/api/*</code>), or an exact path. Rules: any matching DENY &rarr; <code>"DENY"</code>; else if there are <b>no ALLOW policies at all</b> &rarr; <code>"ALLOW"</code>; else <code>"ALLOW"</code> if some ALLOW matches, otherwise <code>"DENY"</code>.</p>`,
      ex: `<p>Policies <code>["ALLOW|*|*", "DENY|*|/admin*"]</code>, path <code>/admin/users</code> &rarr; <span class="c-r">DENY</span> (DENY wins). Policies <code>["DENY|cluster.local/ns/dev/sa/x|*"]</code>, source frontend &rarr; <span class="c-g">ALLOW</span> (no ALLOW policies exist, nothing denied).</p>`,
      bw: `<p>Evaluate the list top to bottom and take the first match, like a firewall. That gets Istio wrong: order in the list does not matter, DENY always beats ALLOW, and the mere existence of an ALLOW policy flips the default.</p>`,
      q: ['Only DENY policies select a workload and none match. Result?', ['ALLOW', 'DENY', '403 only for GET', 'Depends on policy order'], 0, 'With no ALLOW policy at all, a request that no DENY matches is allowed.'],
      h: ['Hint 1: write a helper that tests one pattern: <code>*</code>, prefix with a trailing <code>*</code>, or exact.', 'Hint 2: do two passes: first any DENY match, then the ALLOW logic.', 'Hint 3: remember the "no ALLOW policies" case before checking ALLOW matches.'],
      a: `<p>Split each policy, match the principal and path, and apply the three-step order. The shape mirrors Istio exactly (minus CUSTOM, which runs even earlier). It explains both classic surprises: one ALLOW policy denies everything else, and a DENY cannot be overridden.</p>`,
      code: PY(`def _match(pattern, value):
    if pattern == "*":
        return True
    if pattern.endswith("*"):
        return value.startswith(pattern[:-1])   # prefix match
    return pattern == value                      # exact match

def authorize(policies, source, path):
    parsed = [p.split("|") for p in policies]
    for action, who, where in parsed:
        if action == "DENY" and _match(who, source) and _match(where, path):
            return "DENY"                        # DENY always wins
    allows = [p for p in parsed if p[0] == "ALLOW"]
    if not allows:
        return "ALLOW"                           # no ALLOW policy: default allow
    for _, who, where in allows:
        if _match(who, source) and _match(where, path):
            return "ALLOW"
    return "DENY"`),
      cx: `<p>O(P) per request for P policies (Envoy compiles them into matchers, still linear in rules).</p>`,
      f: ['Add namespaces as a source field and methods as an operation field; how do multiple values inside one field combine (OR) versus different fields (AND)?', 'How would CUSTOM (ext_authz) change the order?'],
      tests: { sig: 'string[] string string -> string', fn: 'authorize', cases: [
        [[[], 'cluster.local/ns/a/sa/x', '/'], 'ALLOW'],
        [[['ALLOW|cluster.local/ns/shop/sa/frontend|/api/*'], 'cluster.local/ns/shop/sa/frontend', '/api/orders'], 'ALLOW'],
        [[['ALLOW|cluster.local/ns/shop/sa/frontend|/api/*'], 'cluster.local/ns/shop/sa/batch', '/api/orders'], 'DENY'],
        [[['ALLOW|cluster.local/ns/shop/sa/frontend|/api/*'], 'cluster.local/ns/shop/sa/frontend', '/admin'], 'DENY'],
        [[['ALLOW|*|*', 'DENY|*|/admin*'], 'cluster.local/ns/shop/sa/frontend', '/admin/users'], 'DENY'],
        [[['DENY|cluster.local/ns/dev/sa/x|*'], 'cluster.local/ns/shop/sa/frontend', '/x'], 'ALLOW'],
        [[['ALLOW|*|/healthz'], 'anything', '/healthz'], 'ALLOW'],
        [[['ALLOW|*|/healthz'], 'anything', '/healthz/deep'], 'DENY']
      ] }
    })]
  });

  // ───────────────────────── Topic 4: mesh observability ─────────────────────────
  topics.push({
    title: 'Mesh Observability: Golden Metrics, Access Logs, Traces and Service Graphs',
    analogy: `<p>Think of a motorway with toll gates at every junction. Because every car passes a gate, the operator knows, without asking any driver, how many cars use each road, how many broke down, and how long the trip took. A mesh proxy is a toll gate in front of every service: it sees every request and reports the same three numbers for everyone, whichever language the app is written in.</p>`,
    explain: `<p>🟢 <b>Free, uniform telemetry.</b> Because every request goes through a proxy, the mesh can emit the <b>golden metrics</b> for every service-to-service edge with zero app code: <b>request rate</b> (RPS), <b>success rate</b> (share of non-5xx responses) and <b>latency</b> percentiles (p50, p95, p99). Together with saturation from Kubernetes, that is enough for SLOs on every service.</p>
      ${H.table(['Signal', 'Istio', 'Linkerd'], [
        ['Request count', '<code>istio_requests_total</code> with labels <code>source_workload</code>, <code>destination_service</code>, <code>response_code</code>, <code>connection_security_policy</code>', '<code>request_total</code>, <code>response_total</code> with <code>classification="success|failure"</code>'],
        ['Latency', '<code>istio_request_duration_milliseconds_bucket</code> (histogram)', '<code>response_latency_ms_bucket</code>'],
        ['TCP', '<code>istio_tcp_sent_bytes_total</code>, <code>istio_tcp_connections_opened_total</code> (ztunnel reports these in ambient)', '<code>tcp_open_connections</code>'],
        ['Dashboards', 'Kiali (service graph, config validation), Grafana', '<code>linkerd viz</code> (stat, top, tap, edges), Grafana'],
        ['Tracing', 'Envoy creates spans; Telemetry API sends to OpenTelemetry/Zipkin', 'proxy spans exported via OpenTelemetry']
      ])}
      <p>🟢 <b>Success rate</b> = successful ÷ total. A 404 is the client's fault and usually counts as success for the server; 5xx counts as failure. <b>p99</b> is the latency 99% of requests beat; averages hide the slow tail that users actually feel.</p>
      <p>🔵 <b>The trace header trap.</b> The proxy starts and ends spans, but it cannot link the inbound request to the outbound calls your app makes. Your app must <b>copy the trace headers</b> (<code>traceparent</code>/<code>tracestate</code> for W3C, or <code>x-b3-*</code>) from incoming to outgoing requests, best done with an OpenTelemetry SDK. Without it you get many one-hop traces instead of one end-to-end trace.</p>
      <p>🔵 <b>Ambient detail.</b> ztunnel only sees L4, so it reports TCP metrics; HTTP metrics (codes, latency per request) come from waypoints. If your dashboard shows no HTTP metrics for an ambient service, it probably has no waypoint.</p>`,
    clues: ['"success rate and latency for every service without changing code" → mesh golden metrics', '"which services call payments?" → service graph (Kiali, <code>linkerd viz edges</code>) from proxy telemetry', '"traces are broken into single hops" → the app does not propagate trace headers', '"p99 vs average" → the tail matters; use histograms and percentiles', '"prove all traffic is encrypted for the audit" → metric label <code>connection_security_policy="mutual_tls"</code> or <code>linkerd viz edges</code>', '"Prometheus is overwhelmed by mesh metrics" → label cardinality; drop or aggregate labels with the Telemetry API'],
    code: [SH(`# PromQL you will use every day (Istio metric names)
# Success rate of payments over 5 minutes, per caller
#   sum by (source_workload) (rate(istio_requests_total{destination_service=~"payments.*",response_code!~"5.."}[5m]))
# / sum by (source_workload) (rate(istio_requests_total{destination_service=~"payments.*"}[5m]))
#
# p99 latency of payments
#   histogram_quantile(0.99, sum by (le) (rate(istio_request_duration_milliseconds_bucket{destination_service=~"payments.*"}[5m])))
#
# Plain-text (non-mTLS) traffic left in the mesh: should be zero before STRICT
#   sum by (source_workload, destination_workload) (rate(istio_requests_total{connection_security_policy!="mutual_tls"}[5m]))

istioctl dashboard kiali            # service graph with success rates on each edge
linkerd viz stat deploy -n shop     # SUCCESS  RPS  LATENCY_P50  LATENCY_P95  LATENCY_P99
linkerd viz top deploy/payments -n shop   # live most-called paths
linkerd viz tap deploy/payments -n shop --path /charge   # stream individual requests`, 'PromQL and CLI'),
      Y(`# Istio Telemetry API: 10% trace sampling to an OpenTelemetry collector, access logs only for errors
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: mesh-default
  namespace: istio-system
spec:
  tracing:
    - providers:
        - name: otel                      # defined in meshConfig.extensionProviders
      randomSamplingPercentage: 10
  accessLogging:
    - providers:
        - name: envoy
      filter:
        expression: "response.code >= 500"`, 'Telemetry API')],
    codeTitle: ['Golden-metric queries', 'Tracing and access logs'],
    viz: [{
      title: 'From raw requests to success rate and p99',
      input: '200:12,200:15,500:40,200:18,404:9,200:220,200:14,503:35',
      inputLabel: 'code:latencyMs list',
      gen: function (input) {
        var items = String(input || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
        if (!items.length || items.length > 20) throw new Error('Give 1 to 20 items like 200:12');
        var reqs = items.map(function (s) { var a = s.split(':'), c = parseInt(a[0], 10), l = parseInt(a[1], 10); if (isNaN(c) || isNaN(l)) throw new Error('Each item is code:latencyMs, e.g. 503:35'); return [c, l]; });
        var frames = [], ok = 0;
        var codes = reqs.map(function (r) { return r[0]; });
        frames.push({ narr: 'The proxy records every request: a status code and a latency. ' + reqs.length + ' requests here. Step 1: classify. 5xx = failure (the server broke); anything else counts as success for the server.', parts: [{ type: 'array', label: 'status codes', values: codes }] });
        var hl = {};
        reqs.forEach(function (r, i) { if (r[0] >= 500) hl[i] = 'bad'; else { hl[i] = 'ok'; ok++; } });
        frames.push({ narr: 'Successes in green, failures in red. Success rate = ' + ok + ' / ' + reqs.length + ' = <b>' + (100 * ok / reqs.length).toFixed(1) + '%</b>. Note the 404 counts as success: the server answered correctly that the thing does not exist.', parts: [{ type: 'array', label: 'status codes', values: codes, hl: hl }] });
        var lat = reqs.map(function (r) { return r[1]; });
        frames.push({ narr: 'Step 2: latency. The average is ' + Math.round(lat.reduce(function (a, b) { return a + b; }, 0) / lat.length) + ' ms, which hides the slow tail. Sort the latencies to read percentiles.', parts: [{ type: 'bars', label: 'latency (ms), arrival order', values: lat }] });
        var sorted = lat.slice().sort(function (a, b) { return a - b; });
        var rank = Math.floor((99 * sorted.length + 99) / 100), h2 = {}; h2[rank - 1] = 'sel';
        frames.push({ narr: 'Nearest-rank p99: position ceil(0.99 × ' + sorted.length + ') = ' + rank + ', so p99 = <b>' + sorted[rank - 1] + ' ms</b>. With few requests p99 is simply the slowest one, which is why dashboards need enough traffic (or longer windows) before percentiles mean much.', parts: [{ type: 'bars', label: 'latency sorted', values: sorted, hl: h2 }] });
        frames.push({ narr: 'In production the proxy does not keep every value: it increments <b>histogram buckets</b> (le=5, 10, 25, 50, 100, 250 ... ms) and Prometheus estimates percentiles from them with <code>histogram_quantile</code>. Same idea, bounded memory.', parts: [{ type: 'vars', label: 'golden metrics', vals: { requests: reqs.length, success_rate: (100 * ok / reqs.length).toFixed(1) + '%', p99_ms: sorted[rank - 1] } }] });
        return frames;
      }
    }],
    examples: [
      { title: 'Situation: "the site is slow" but averages look fine', html: `<p>Average latency of the cart service is 40 ms, unchanged. Users still complain. The mesh histogram shows p99 jumped from 120 ms to 2.4 s at 14:05, only for calls from <code>checkout</code> to <code>inventory</code>. The Kiali graph shows the edge in amber, and <code>linkerd viz tap</code> (or Envoy access logs with <code>%DURATION%</code>) shows a single slow SQL-backed path. Without per-edge percentiles, this would have been hours of guessing.</p>` },
      { title: 'Situation: proving encryption for an audit', html: `<p>The auditor asks: "Is all internal traffic encrypted?" Answer with data: a Grafana panel of <code>istio_requests_total</code> split by <code>connection_security_policy</code> over 30 days shows 100% <code>mutual_tls</code> in production namespaces, plus the STRICT PeerAuthentication in Git. With Linkerd, <code>linkerd viz edges</code> lists every edge with its client and server identity. Evidence produced by the platform beats screenshots.</p>` },
      { title: 'Situation: the metrics bill', html: `<p>After meshing 400 services, Prometheus memory triples. The cause is label cardinality: every pair of source and destination workloads × response codes × versions creates a time series, and request path labels (if someone added them) explode it. Fixes: drop unused labels with the Telemetry API <code>metrics.overrides</code>, aggregate at the edge with recording rules, keep raw high-cardinality data only in traces and logs.</p>` }
    ],
    deepDive: `<p>🟣 <b>What is "success" really?</b> Istio labels the raw <code>response_code</code>; you decide. Linkerd classifies 5xx as failure by default and gRPC responses by <code>grpc-status</code> (a gRPC error arrives with HTTP 200!). Always check gRPC services with the gRPC status, otherwise a failing gRPC API reports 100% success.</p>
      <p>🟣 <b>Percentiles do not add up.</b> You cannot average p99s across Pods; aggregate the histogram buckets first (<code>sum by (le)</code>) and then compute the quantile. Bucket boundaries limit precision: if buckets are 100 ms and 250 ms, a reported p99 of 180 ms is an interpolation. Native histograms in recent Prometheus versions reduce this error.</p>
      <p>🟣 <b>Sampling and cost.</b> Tracing every request is expensive. Head sampling (decide at the first hop, e.g. 1-10%) is cheap but misses rare errors; tail sampling in the OpenTelemetry Collector keeps all error and slow traces. The proxy's span is only as useful as the context the app propagates.</p>
      <p>🟣 <b>Observability of the mesh itself.</b> Watch istiod push latency (<code>pilot_proxy_convergence_time</code>), config rejections (<code>pilot_total_xds_rejects</code>), certificate expiry, and proxy CPU. A mesh you cannot observe becomes the thing that causes outages.</p>`,
    aiEra: `<p>🤖 <b>AI on top of uniform telemetry.</b> Because every edge reports the same metrics, anomaly detection and AI incident assistants work far better on mesh data than on hand-rolled app metrics. An assistant can correlate "p99 of checkout → inventory rose at 14:05" with "deployment inventory-v42 rolled out at 14:04" in seconds. Give it read-only access to metrics and deploy history, not write access to the mesh.</p>
      <p>🤖 <b>LLM services need extra signals.</b> Request count and latency are not enough for model endpoints: add tokens per second, time to first token and cost per request as app metrics; the mesh still provides the network side (who called, from where, with which identity).</p>`,
    problems: [P({
      t: 'Golden metrics from a request log (success rate and p99)',
      l: 'Easy', tags: ['observability', 'SLO', 'percentiles', 'python'], co: ['Datadog', 'Buoyant', 'Grafana Labs'],
      s: PYC + `<p>Write <code>golden_signals(codes, latencies)</code>. A request is a success when its code is below 500. Success rate = successes ÷ total × 100, formatted with one decimal. p99 uses the <b>nearest-rank</b> method: sort the latencies, rank = ceil(0.99 × n), answer = the value at that rank (1-based). Use integer maths for the rank: <code>(99 * n + 99) // 100</code>. Return <code>"sr=&lt;rate&gt;% p99=&lt;ms&gt;ms"</code>, or <code>"sr=n/a p99=n/a"</code> for no requests.</p>`,
      ex: `<p>codes <code>[200,200,500,200]</code>, latencies <code>[10,20,30,40]</code> &rarr; <span class="c-g">"sr=75.0% p99=40ms"</span> (rank = 4). codes <code>[404,200,503]</code>, latencies <code>[5,15,25]</code> &rarr; <span class="c-g">"sr=66.7% p99=25ms"</span>: the 404 is a success.</p>`,
      bw: `<p>Report the average latency and the share of 200 responses. The average hides the tail, and counting only 200 as success marks 201, 204 and 404 as failures, so the SLO alarm fires on healthy traffic.</p>`,
      q: ['Why use integer maths for the nearest rank?', ['0.99 × n in floating point can land a hair above a whole number and round up the wrong way', 'Python has no ceil', 'Percentiles must be integers', 'It is faster'], 0, '0.99 is not exact in binary floating point; (99n + 99) // 100 is the exact ceiling of 99n/100.'],
      h: ['Hint 1: handle the empty list first, before any division.', 'Hint 2: count codes below 500 for the success rate; format with an f-string and :.1f.', 'Hint 3: sort the latencies and take index rank - 1 where rank = (99*n + 99) // 100.'],
      a: `<p>Count, divide, format; sort and index for p99. The same two numbers, computed per edge every 10 seconds, are what <code>linkerd viz stat</code> and Kiali display.</p>`,
      code: PY(`def golden_signals(codes, latencies):
    n = len(codes)
    if n == 0:
        return "sr=n/a p99=n/a"
    ok = sum(1 for c in codes if c < 500)        # 5xx = server failure
    rank = (99 * n + 99) // 100                  # ceil(0.99 * n) without floats
    p99 = sorted(latencies)[rank - 1]
    return f"sr={100 * ok / n:.1f}% p99={p99}ms"`),
      cx: `<p>O(n log n) for the sort; real proxies use fixed histogram buckets for O(1) per request.</p>`,
      f: ['How would you compute p99 from histogram buckets instead of raw values?', 'gRPC returns HTTP 200 with grpc-status 14 (UNAVAILABLE). How would you classify it?'],
      tests: { sig: 'int[] int[] -> string', fn: 'goldenSignals', cases: [
        [[[200, 200, 500, 200], [10, 20, 30, 40]], 'sr=75.0% p99=40ms'],
        [[[], []], 'sr=n/a p99=n/a'],
        [[[200], [7]], 'sr=100.0% p99=7ms'],
        [[[404, 200, 503], [5, 15, 25]], 'sr=66.7% p99=25ms'],
        [[{ $rep: 200, n: 100 }, { $range: [1, 101] }], 'sr=100.0% p99=99ms'],
        [[[500, 502], [100, 300]], 'sr=0.0% p99=300ms'],
        [[[200, 200, 200], [50, 10, 30]], 'sr=100.0% p99=50ms']
      ] }
    })]
  });

  // ───────────────────────── Topic 5: RBAC and service accounts ─────────────────────────
  topics.push({
    title: 'Kubernetes RBAC and Service Accounts: Roles, Bindings, Tokens and Escalation Paths',
    analogy: `<p>Think of a hotel. A <b>Role</b> is a job description ("housekeeping: may enter rooms on floor 3, may not open the safe"). A <b>RoleBinding</b> is handing that job to a named person for <b>one floor</b>. A <b>ClusterRole</b> is a job description that could apply to any floor, and a <b>ClusterRoleBinding</b> gives it for the whole building. A <b>service account</b> is the badge a robot vacuum gets: it is not a person, but it still needs a job description, and it should not get the master key just because nobody thought about it.</p>`,
    explain: `<p>🟢 <b>Every API request</b> is authenticated (who are you: a user from OIDC or a certificate, or a <b>service account</b> token), then authorized. RBAC answers one question: may <i>subject</i> do <i>verb</i> on <i>resource</i> in <i>namespace</i>? RBAC is <b>allow-only</b>: there are no deny rules, everything not granted is forbidden, and permissions from several bindings simply add up.</p>
      ${H.table(['Object', 'Scope', 'Contains', 'Typical use'], [
        ['<b>Role</b>', 'one namespace', 'rules: apiGroups, resources, verbs (get, list, watch, create, update, patch, delete)', '"read Pods in shop"'],
        ['<b>ClusterRole</b>', 'cluster-wide definition', 'same rules, plus cluster-scoped resources (nodes, namespaces, PVs) and non-resource URLs', 'reusable roles: view, edit, admin; node readers'],
        ['<b>RoleBinding</b>', 'one namespace', 'subjects + roleRef to a Role <b>or a ClusterRole</b>', 'grant a ClusterRole only inside this namespace'],
        ['<b>ClusterRoleBinding</b>', 'all namespaces + cluster scope', 'subjects + roleRef to a ClusterRole', 'platform admins, cluster-wide controllers']
      ])}
      <p>🟢 <b>Service accounts.</b> Every Pod runs as a service account (the namespace's <code>default</code> if you do not choose). Since Kubernetes 1.24 Pods get <b>projected, short-lived, audience-bound tokens</b> (about 1 hour, rotated by the kubelet, invalid once the Pod is deleted) instead of forever-valid Secret tokens. Set <code>automountServiceAccountToken: false</code> for Pods that never call the API, and create one service account per workload so each gets only what it needs.</p>
      <p>🔵 <b>Escalation paths to know by heart.</b> RBAC blocks you from granting permissions you do not have, <b>except</b> with these verbs and resources: <code>escalate</code> on roles (edit a Role beyond your rights), <code>bind</code> on roles (bind a role you do not hold), <code>impersonate</code> on users/groups/serviceaccounts, <code>create</code> on <code>pods</code> (a Pod can mount any service account token in that namespace, so pod-create ≈ that namespace's strongest SA), <code>get/list</code> on <code>secrets</code>, <code>create</code> on <code>pods/exec</code>, and <code>update</code> on validating/mutating webhooks. <code>list</code> on Secrets returns their values: there is no "names only" list.</p>`,
    clues: ['"least privilege for a CI deployer" → a namespaced Role + RoleBinding to a dedicated service account, no ClusterRoleBinding', '"how do I check what someone can do?" → <code>kubectl auth can-i --list --as=...</code>', '"the Pod does not need the API" → <code>automountServiceAccountToken: false</code>', '"give the same read-only role in 20 namespaces" → one ClusterRole + 20 RoleBindings', '"a user who can create Pods is effectively admin of the namespace" → pod-create escalation via service accounts', '"long-lived token in a Secret" → legacy; use TokenRequest / projected tokens or workload identity (IRSA, Workload Identity)'],
    code: [Y(`# Least-privilege deployer for one namespace
apiVersion: v1
kind: ServiceAccount
metadata:
  name: ci-deployer
  namespace: shop
automountServiceAccountToken: false     # only mounted where explicitly needed
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: deployer
  namespace: shop
rules:
  - apiGroups: ["apps"]
    resources: ["deployments"]
    verbs: ["get", "list", "watch", "patch", "update"]   # roll out, not delete
  - apiGroups: [""]
    resources: ["pods"]
    verbs: ["get", "list", "watch"]                      # read status, no create, no exec
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: ci-deployer
  namespace: shop
subjects:
  - kind: ServiceAccount
    name: ci-deployer
    namespace: shop
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: deployer
---
# Reuse the built-in "view" ClusterRole, but only inside shop
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: support-view
  namespace: shop
subjects:
  - kind: Group
    name: support-team               # group name from your OIDC provider
    apiGroup: rbac.authorization.k8s.io
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: view                         # built-in view excludes Secrets on purpose`, 'ServiceAccount, Role, RoleBindings'),
      SH(`# Ask the authorizer directly
kubectl auth can-i patch deployments -n shop --as=system:serviceaccount:shop:ci-deployer   # yes
kubectl auth can-i create pods -n shop --as=system:serviceaccount:shop:ci-deployer        # no
kubectl auth can-i --list -n shop --as=system:serviceaccount:shop:ci-deployer
kubectl auth whoami                                   # GA in 1.28+: who does the API think I am?

# Short-lived token for a CI job (no Secret objects)
kubectl create token ci-deployer -n shop --duration=15m --audience=https://kubernetes.default.svc

# Find dangerous grants: who can read secrets or create pods cluster-wide?
kubectl get clusterrolebindings -o wide | grep -E 'cluster-admin'
kubectl auth can-i list secrets --all-namespaces --as=system:serviceaccount:monitoring:prometheus`, 'kubectl auth and tokens')],
    codeTitle: ['Least-privilege RBAC', 'Inspect and audit'],
    viz: [{
      title: 'How the RBAC authorizer answers "can alice get secrets in shop?"',
      input: 'bob get secrets dev',
      inputLabel: 'user verb resource namespace (users: alice, bob, root; namespaces: shop, dev)',
      gen: function (input) {
        var p = String(input || '').trim().split(/\s+/);
        if (p.length !== 4) throw new Error('Format: user verb resource namespace, e.g. bob get secrets dev');
        var user = p[0], verb = p[1], res = p[2], ns = p[3];
        var binds = [['RoleBinding', 'shop', 'alice', 'Role/reader', 'get,list pods'], ['RoleBinding', 'shop', 'bob', 'ClusterRole/secret-reader', 'get secrets'], ['ClusterRoleBinding', '(all)', 'root', 'ClusterRole/admin', '* *']];
        var frames = [], rows = binds.map(function (b) { return b.concat(['?']); }), allowed = false;
        function snap(msg, hl) { frames.push({ narr: msg, parts: [{ type: 'table', label: 'bindings in the cluster', columns: ['kind', 'namespace', 'subject', 'roleRef', 'rules', 'applies?'], rows: rows.map(function (r) { return r.slice(); }), hl: hl || {} }, { type: 'vars', label: 'request', vals: { user: user, verb: verb, resource: res, namespace: ns } }] }); }
        snap('The API server authenticated <b>' + user + '</b>. RBAC now scans every binding. There are no deny rules: the answer is yes if <b>any</b> binding grants it.', {});
        binds.forEach(function (b, i) {
          var why, hit = false, h = {};
          if (b[2] !== user) why = 'subject is ' + b[2] + ', not ' + user;
          else if (b[0] === 'RoleBinding' && b[1] !== ns) why = 'a RoleBinding only grants inside its own namespace (' + b[1] + '), even when it points at a ClusterRole';
          else {
            var r = b[4].split(' '), vs = r[0].split(','), rs = r[1].split(',');
            var vOk = vs.indexOf('*') >= 0 || vs.indexOf(verb) >= 0, rOk = rs.indexOf('*') >= 0 || rs.indexOf(res) >= 0;
            hit = vOk && rOk;
            why = hit ? 'subject, scope, verb and resource all match' : 'scope matches but the rules allow only ' + b[4];
          }
          rows[i][5] = hit ? 'GRANTS' : 'no';
          h[i] = hit ? 'ok' : 'done';
          if (hit) allowed = true;
          snap('Binding ' + (i + 1) + ' (' + b[0] + ' → ' + b[3] + '): ' + why + '.', h);
        });
        snap(allowed ? '<b>Allowed.</b> One grant is enough. <code>kubectl auth can-i ' + verb + ' ' + res + ' -n ' + ns + ' --as=' + user + '</code> would print <b>yes</b>.' : '<b>Forbidden (403).</b> Nothing granted it, and RBAC defaults to deny. The audit log records the denied request with the user and verb.', {});
        return frames;
      }
    }],
    examples: [
      { title: 'Situation: the monitoring agent that could read every Secret', html: `<p>A vendor's Helm chart installs a ClusterRole with <code>resources: ["*"], verbs: ["get","list","watch"]</code> and a ClusterRoleBinding to its service account. That includes <b>every Secret in the cluster</b>. A bug in the agent (or a compromised image) now leaks database passwords from all namespaces. Fix: review chart RBAC before install (<code>helm template | grep -A20 ClusterRole</code>), replace wildcards with the exact resources it needs (pods, nodes, metrics), and alert on new ClusterRoleBindings in the audit log.</p>` },
      { title: 'Situation: "only deploy rights", yet a full namespace takeover', html: `<p>A CI service account has <code>create</code> on <code>pods</code> in <code>shop</code> "to run migration Jobs". An attacker with the CI token creates a Pod with <code>serviceAccountName: shop-admin-controller</code> and reads that account's token from the mounted file. Now they have the controller's rights. Fixes: CI deploys by patching Deployments, Jobs run as their own minimal SA, and an admission policy restricts which service accounts Pods in that namespace may use.</p>` },
      { title: 'Situation: token in an old Secret', html: `<p>A 2021 runbook created <code>kubernetes.io/service-account-token</code> Secrets for scripts. Those tokens never expire. Kubernetes 1.29+ labels unused legacy tokens (<code>kubernetes.io/legacy-token-last-used</code>) and auto-cleans invalidated ones. Migration: <code>kubectl create token</code> with a short <code>--duration</code> for humans and CI, cloud workload identity (IRSA / EKS Pod Identity, GKE Workload Identity, Azure Workload Identity) for cloud APIs, then delete the old Secrets.</p>` }
    ],
    deepDive: `<p>🟣 <b>Aggregated ClusterRoles.</b> The built-in <code>admin</code>, <code>edit</code> and <code>view</code> use <code>aggregationRule</code>: any ClusterRole labelled <code>rbac.authorization.k8s.io/aggregate-to-edit: "true"</code> is merged in. Installing a CRD operator can silently widen <code>edit</code>. Review aggregated labels when auditing.</p>
      <p>🟣 <b>Escalation prevention.</b> The API server refuses to create or update a Role/RoleBinding that grants permissions the requester does not hold, unless the requester has <code>escalate</code> (for roles) or <code>bind</code> (for bindings). That is why <code>bind</code> and <code>escalate</code> are effectively admin. <code>impersonate</code> lets you act as another user or group (<code>--as=system:masters</code> group would be cluster-admin), so treat it as admin too.</p>
      <p>🟣 <b>Bound tokens.</b> Projected tokens are JWTs with an <code>aud</code> (audience), <code>exp</code> and a binding to the Pod object (and, from 1.30+, node info). The API server rejects them once the Pod is gone. External systems (Vault Kubernetes auth, cloud IAM via OIDC federation) validate the same JWTs, which is how "secret zero" disappears for Pods. Since 1.30, <code>system:masters</code> and break-glass certificates still bypass RBAC, so keep them offline.</p>
      <p>🟣 <b>Other authorizers.</b> The API server chain usually is <code>Node,RBAC</code>. The Node authorizer limits kubelets to objects for their own Pods (with the NodeRestriction admission plugin). Structured authorization configuration (beta in 1.30) lets you add CEL-filtered webhooks. ValidatingAdmissionPolicy, covered next, can reject things RBAC cannot express ("you may create Pods, but not privileged ones").</p>`,
    aiEra: `<p>🤖 <b>Agents with kubectl are just principals.</b> An AI ops agent that runs <code>kubectl</code> must have its own service account with a narrow Role, ideally read-only plus a few specific write verbs, and every action shows up in the audit log under its identity. Never give an agent cluster-admin "so it can fix anything"; a prompt-injected log line could then delete a namespace.</p>
      <p>🤖 <b>AI-assisted RBAC review.</b> Dumping <code>kubectl get roles,clusterroles,rolebindings,clusterrolebindings -A -o yaml</code> into an assistant and asking "which subjects can read Secrets or create Pods in prod?" works well as a first pass. Verify each claim with <code>kubectl auth can-i --as</code>, because the model may miss aggregated roles or group membership from your identity provider.</p>`,
    problems: [P({
      t: 'RBAC authorizer over Roles, ClusterRoles and bindings',
      l: 'Medium', tags: ['RBAC', 'authorization', 'least privilege', 'python'], co: ['Google', 'Red Hat', 'VMware'],
      s: PYC + `<p>Write <code>can_i(roles, bindings, user, verb, resource, namespace)</code>. Roles are <code>"Role|ns|name|verbs|resources"</code> or <code>"ClusterRole||name|verbs|resources"</code> (comma lists, <code>*</code> = any). Bindings are <code>"RoleBinding|ns|subject|Role or ClusterRole|roleName"</code> or <code>"ClusterRoleBinding||subject|ClusterRole|roleName"</code>. A RoleBinding grants only in its namespace, and its Role must exist in that same namespace. A ClusterRoleBinding grants everywhere, including cluster-scoped requests (<code>namespace = ""</code>). Return true if any binding grants the request.</p>`,
      ex: `<p>With <code>RoleBinding|shop|bob|ClusterRole|secret-reader</code>: bob get secrets in <code>shop</code> &rarr; <span class="c-g">true</span>; in <code>dev</code> &rarr; <span class="c-r">false</span> (the RoleBinding limits the ClusterRole to shop).</p>`,
      bw: `<p>Check only whether the user has a role whose rules match, ignoring where it was bound. That treats a RoleBinding to a ClusterRole as cluster-wide, exactly the misunderstanding that leads people to grant too much (or to think they did not).</p>`,
      q: ['A RoleBinding in namespace qa points to Role "reader", but Role reader exists only in dev. What does the subject get in qa?', ['Nothing: roleRef resolves inside the binding\'s namespace', 'dev\'s reader rules, in qa', 'dev\'s reader rules, in dev', 'An error at request time for everyone'], 0, 'A RoleBinding\'s Role reference is resolved in its own namespace. A missing role grants nothing.'],
      h: ['Hint 1: index roles by (kind, namespace, name); ClusterRoles use an empty namespace.', 'Hint 2: for each binding with the right subject, work out where it applies: a RoleBinding only when namespace == binding namespace; a ClusterRoleBinding always.', 'Hint 3: look up the referenced role (Role in the binding\'s namespace, or ClusterRole), then match the verb and resource lists, treating * as any.'],
      a: `<p>Index the roles, scan bindings for the subject, apply the scope rule, resolve the role reference and match verbs and resources. This is the core of the real RBAC authorizer (minus apiGroups, resourceNames, subresources and groups).</p>`,
      code: PY(`def can_i(roles, bindings, user, verb, resource, namespace):
    index = {}
    for r in roles:
        kind, ns, name, verbs, resources = r.split("|")
        index[(kind, ns, name)] = (verbs.split(","), resources.split(","))
    for b in bindings:
        kind, ns, subject, ref_kind, ref_name = b.split("|")
        if subject != user:
            continue
        if kind == "RoleBinding" and ns != namespace:
            continue                                   # scoped to its own namespace
        role_ns = ns if ref_kind == "Role" else ""      # ClusterRoles have no namespace
        rules = index.get((ref_kind, role_ns, ref_name))
        if rules is None:
            continue                                   # dangling roleRef grants nothing
        verbs, resources = rules
        if ("*" in verbs or verb in verbs) and ("*" in resources or resource in resources):
            return True
    return False`),
      cx: `<p>O(R + B) per request; the real authorizer caches indexed rules per subject.</p>`,
      f: ['Add groups (system:serviceaccounts:shop, oidc:team-a): how does the subject check change?', 'How would you list every subject that can read Secrets in a namespace (the reverse question)?'],
      tests: (function () {
        var R = ['Role|shop|reader|get,list|pods', 'ClusterRole||secret-reader|get|secrets', 'ClusterRole||admin|*|*', 'Role|dev|reader|get,list|pods'];
        var B = ['RoleBinding|shop|alice|Role|reader', 'RoleBinding|shop|bob|ClusterRole|secret-reader', 'ClusterRoleBinding||root|ClusterRole|admin', 'RoleBinding|dev|dave|Role|reader', 'RoleBinding|qa|erin|Role|reader'];
        return { sig: 'string[] string[] string string string string -> bool', fn: 'canI', cases: [
          [[R, B, 'alice', 'get', 'pods', 'shop'], true], [[R, B, 'alice', 'delete', 'pods', 'shop'], false],
          [[R, B, 'alice', 'get', 'pods', 'dev'], false], [[R, B, 'bob', 'get', 'secrets', 'shop'], true],
          [[R, B, 'bob', 'get', 'secrets', 'dev'], false], [[R, B, 'root', 'delete', 'nodes', ''], true],
          [[R, B, 'carol', 'get', 'pods', 'shop'], false], [[R, B, 'alice', 'list', 'pods', 'shop'], true],
          [[R, B, 'dave', 'get', 'pods', 'dev'], true], [[R, B, 'erin', 'get', 'pods', 'qa'], false],
          [[R, B, 'bob', 'get', 'secrets', ''], false]
        ] };
      })()
    })]
  });

  // ───────────────────────── Topic 6: Pod Security Standards and admission control ─────────────────────────
  topics.push({
    title: 'Pod Security Standards and Admission Control: PSA, ValidatingAdmissionPolicy, Gatekeeper and Kyverno',
    analogy: `<p>Think of the security desk at a building entrance. RBAC is the <b>keycard</b>: it says whether you may enter the delivery bay at all. Admission control is the <b>guard who opens every box</b>: you may deliver furniture, but not a box that is ticking, not one without a label, and the guard may also <b>add a sticker</b> ("fragile") before it goes up. Pod Security Standards are the printed list of forbidden items taped to the guard's desk.</p>`,
    explain: `<p>🟢 <b>Admission control</b> runs after authentication and RBAC, before an object is saved to etcd. <b>Mutating</b> admission can change the object (inject a sidecar, add default labels); <b>validating</b> admission can only accept or reject. RBAC can say "you may create Pods"; only admission can say "but not privileged ones".</p>
      <p>🟢 <b>Pod Security Standards (PSS)</b> define three levels, enforced by the built-in <b>Pod Security Admission</b> (PSA, GA since 1.25) with namespace labels:</p>
      ${H.table(['Level', 'Blocks', 'For'], [
        ['<b>privileged</b>', 'nothing', 'system namespaces: CNI, storage drivers, Falco'],
        ['<b>baseline</b>', 'privileged containers, host namespaces (hostNetwork/PID/IPC), hostPath volumes, hostPorts, adding capabilities beyond a safe default set, seccomp Unconfined, unsafe sysctls', 'most apps with minimal changes'],
        ['<b>restricted</b>', 'everything in baseline, plus: must set <code>runAsNonRoot: true</code>, <code>allowPrivilegeEscalation: false</code>, drop <b>ALL</b> capabilities (may add back only NET_BIND_SERVICE), seccomp <code>RuntimeDefault</code> or <code>Localhost</code>, only safe volume types', 'the target for app namespaces']
      ])}
      <p>🔵 <b>Modes.</b> Each namespace can set <code>enforce</code> (reject), <code>audit</code> (annotate the audit log) and <code>warn</code> (warning to the client), each with a level and version: <code>pod-security.kubernetes.io/enforce: restricted</code>. Roll out with warn and audit first, then enforce. PSA checks Pods, and warns at the Deployment level so you see problems before the ReplicaSet fails silently.</p>
      <p>🔵 <b>Beyond PSS: policy engines.</b> <b>ValidatingAdmissionPolicy</b> (GA in 1.30) writes rules in CEL inside the API server, no webhook needed. <b>OPA Gatekeeper</b> uses ConstraintTemplates in <b>Rego</b> plus Constraints, with audit of existing resources. <b>Kyverno</b> writes policies as Kubernetes YAML and can validate, <b>mutate</b>, generate resources and verify image signatures. Typical rules: required labels, no <code>:latest</code>, allowed registries, resource limits set, signed images only.</p>`,
    clues: ['"stop privileged Pods in app namespaces" → PSA label <code>enforce: restricted</code> (or baseline)', '"RBAC lets them create Pods, but we must block hostPath" → admission control, not RBAC', '"require labels / allowed registries / no latest tag" → ValidatingAdmissionPolicy (CEL), Kyverno or Gatekeeper', '"we need to add defaults automatically" → mutating admission (Kyverno mutate, MutatingAdmissionPolicy in newer releases)', '"policy as code with tests and audit of existing objects" → Gatekeeper (Rego, gator) or Kyverno (CLI, PolicyReports)', '"the webhook is down and nobody can deploy" → <code>failurePolicy</code>, timeouts, HA and excluding kube-system'],
    code: [Y(`# 1) Pod Security Admission: per-namespace labels
apiVersion: v1
kind: Namespace
metadata:
  name: shop
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/enforce-version: v1.30
    pod-security.kubernetes.io/warn: restricted
    pod-security.kubernetes.io/audit: restricted
---
# 2) A Pod that passes "restricted"
apiVersion: v1
kind: Pod
metadata:
  name: web
  namespace: shop
spec:
  automountServiceAccountToken: false
  securityContext:
    runAsNonRoot: true
    runAsUser: 10001
    seccompProfile:
      type: RuntimeDefault
  containers:
    - name: web
      image: ghcr.io/acme/web@sha256:3f1c0d9e8b7a6f5e4d3c2b1a09f8e7d6c5b4a3928170f6e5d4c3b2a190807060
      securityContext:
        allowPrivilegeEscalation: false
        readOnlyRootFilesystem: true
        capabilities:
          drop: ["ALL"]
      resources:
        requests: {cpu: 100m, memory: 128Mi}
        limits: {memory: 256Mi}`, 'PSA labels and a restricted Pod'),
      Y(`# 3) ValidatingAdmissionPolicy (CEL, built in, GA 1.30): no ":latest" or untagged images
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicy
metadata:
  name: no-latest-tag
spec:
  failurePolicy: Fail
  matchConstraints:
    resourceRules:
      - apiGroups: ["apps"]
        apiVersions: ["v1"]
        operations: ["CREATE", "UPDATE"]
        resources: ["deployments"]
  validations:
    - expression: >-
        object.spec.template.spec.containers.all(c,
          c.image.contains('@sha256:') ||
          (c.image.split('/')[size(c.image.split('/')) - 1].contains(':') && !c.image.endsWith(':latest')))
      message: "images must be pinned to a tag other than latest, or to a digest"
---
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicyBinding
metadata:
  name: no-latest-tag-binding
spec:
  policyName: no-latest-tag
  validationActions: ["Deny"]           # start with ["Warn", "Audit"] during rollout
  matchResources:
    namespaceSelector:
      matchLabels: {env: prod}
---
# 4) Kyverno: require resource limits (validate) and add a default label (mutate)
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-limits-and-team
spec:
  validationFailureAction: Enforce
  background: true                      # also report on existing resources
  rules:
    - name: require-memory-limit
      match:
        any:
          - resources:
              kinds: ["Pod"]
      validate:
        message: "every container needs a memory limit"
        pattern:
          spec:
            containers:
              - resources:
                  limits:
                    memory: "?*"
    - name: default-team-label
      match:
        any:
          - resources:
              kinds: ["Pod"]
      mutate:
        patchStrategicMerge:
          metadata:
            labels:
              +(team): unassigned         # add only if missing`, 'ValidatingAdmissionPolicy and Kyverno'),
      TX(`# 5) OPA Gatekeeper ConstraintTemplate (Rego) - verify with: gator verify ./policies
package k8sallowedrepos

violation[{"msg": msg}] {
  container := input_containers[_]
  not startswith_any(container.image, input.parameters.repos)
  msg := sprintf("container %v uses image %v from a registry that is not allowed", [container.name, container.image])
}

input_containers[c] { c := input.review.object.spec.containers[_] }
input_containers[c] { c := input.review.object.spec.initContainers[_] }

startswith_any(image, repos) { startswith(image, repos[_]) }

# Constraint (YAML) that uses it:
#   kind: K8sAllowedRepos
#   spec:
#     match: {kinds: [{apiGroups: [""], kinds: ["Pod"]}], namespaces: ["shop"]}
#     parameters: {repos: ["ghcr.io/acme/"]}`, 'Gatekeeper Rego (not compile-checked)')],
    codeTitle: ['Pod Security Admission', 'CEL and Kyverno', 'Gatekeeper Rego'],
    viz: [{
      title: 'A Pod create request through the admission chain',
      input: 'hostPath',
      inputLabel: 'what is wrong with the Pod: none, privileged, hostPath, latest or nolimits',
      gen: function (input) {
        var bad = String(input || '').trim().toLowerCase();
        var stages = ['authn', 'rbac', 'mutating', 'schema', 'psa', 'vap', 'webhook', 'etcd'];
        if (['none', 'privileged', 'hostpath', 'latest', 'nolimits'].indexOf(bad) < 0) throw new Error('Type none, privileged, hostPath, latest or nolimits');
        var stop = { privileged: 'psa', hostpath: 'psa', latest: 'vap', nolimits: 'webhook' }[bad];
        var nodes = [box('authn', 'authenticate', 6, 10, 14), box('rbac', 'RBAC: may create pods?', 24, 10, 18), box('mutating', 'mutating webhooks (inject, defaults)', 44, 10, 20), box('schema', 'schema validation', 64, 10, 14), box('psa', 'Pod Security Admission', 82, 10, 16), box('vap', 'ValidatingAdmissionPolicy (CEL)', 24, 44, 22), box('webhook', 'validating webhooks (Kyverno / Gatekeeper)', 52, 44, 24), box('etcd', 'saved to etcd', 82, 44, 14)];
        var edges = [['authn', 'rbac'], ['rbac', 'mutating'], ['mutating', 'schema'], ['schema', 'psa'], ['psa', 'vap'], ['vap', 'webhook'], ['webhook', 'etcd']];
        var say = {
          authn: 'The API server identifies the caller (OIDC user, certificate, or service account token).',
          rbac: 'RBAC: may this subject <b>create pods</b> in this namespace? Yes. RBAC cannot look inside the Pod spec.',
          mutating: 'Mutating admission runs first so validators see the final object: the Istio webhook may inject a sidecar, Kyverno may add a team label.',
          schema: 'The object is checked against the API schema (types, required fields).',
          psa: 'Pod Security Admission compares the spec with the namespace level (restricted here).',
          vap: 'ValidatingAdmissionPolicy evaluates CEL expressions inside the API server: fast, no network hop.',
          webhook: 'Validating webhooks (Kyverno, Gatekeeper) receive an AdmissionReview and answer allowed true or false with a message.',
          etcd: 'Every gate said yes: the Pod is persisted and the scheduler can pick it up.'
        };
        var why = { psa: bad === 'privileged' ? '<code>privileged: true</code> violates baseline and restricted. Rejected with <i>violates PodSecurity "restricted:v1.30"</i>.' : 'a <code>hostPath</code> volume violates baseline: it can read the node\'s files. Rejected.', vap: 'the image ends in <code>:latest</code>; the CEL rule returns false and the request is denied with the policy message.', webhook: 'Kyverno\'s require-memory-limit rule fails: no memory limit. Rejected with the policy message.' };
        var steps = [], hl = {}, ehl = {};
        for (var i = 0; i < stages.length; i++) {
          var s = stages[i];
          var h = {}; Object.keys(hl).forEach(function (k) { h[k] = hl[k]; });
          if (s === stop) { h[s] = 'bad'; steps.push(['<b>Rejected at ' + s + ':</b> ' + why[s] + ' Nothing is written to etcd and later stages never run.', h, ehl]); break; }
          h[s] = s === 'etcd' ? 'ok' : 'cur';
          steps.push([say[s], h, JSON.parse(JSON.stringify(ehl))]);
          hl[s] = 'done';
          if (i + 1 < stages.length) ehl[s + '-' + stages[i + 1]] = 'ok';
        }
        return pad4(flow('admission chain', nodes, edges, steps, 60), 'Mutate first, then validate; any validator can say no.');
      }
    }],
    examples: [
      { title: 'Situation: the container escape that baseline would have stopped', html: `<p>A debugging Pod was deployed with <code>privileged: true</code> and <code>hostPID: true</code> "temporarily". An attacker who reached it through an exposed debug port ran <code>nsenter -t 1 -m -u -i -n sh</code> and had a root shell on the node, then read the kubelet's credentials. Every one of those settings is blocked by the <b>baseline</b> level. One namespace label (<code>enforce: baseline</code>, then <code>restricted</code>) turns this into a rejected <code>kubectl apply</code>.</p>` },
      { title: 'Situation: the webhook outage that froze deployments', html: `<p>A policy webhook runs as one replica. Its node is drained, and because the webhook config has <code>failurePolicy: Fail</code> for all namespaces, <b>no Pod can be created anywhere</b>, including the webhook's own replacement Pod. Recovery means deleting the webhook config by hand. Prevention: run 3 replicas with a PodDisruptionBudget, exclude <code>kube-system</code> and the policy engine's own namespace via <code>namespaceSelector</code>, set short <code>timeoutSeconds</code>, and prefer in-process ValidatingAdmissionPolicy for simple rules.</p>` },
      { title: 'Situation: rolling out restricted without breaking 40 teams', html: `<p>Week 1: label all app namespaces <code>warn: restricted</code> and <code>audit: restricted</code>. Developers see warnings on every <code>kubectl apply</code>, and the audit log lists violating workloads. Week 2-4: teams fix securityContexts (usually <code>runAsNonRoot</code>, dropping capabilities, seccomp). A dry run shows what would break: <code>kubectl label --dry-run=server --overwrite ns shop pod-security.kubernetes.io/enforce=restricted</code> prints warnings for existing Pods. Then enforce, namespace by namespace, with an exemption process for the few that genuinely need more.</p>` }
    ],
    deepDive: `<p>🟣 <b>Order of admission.</b> Mutating admission (built-in plugins, then webhooks, which may be re-invoked when <code>reinvocationPolicy: IfNeeded</code>), then schema validation, then validating admission (built-ins like PodSecurity, then ValidatingAdmissionPolicy and validating webhooks, which run in parallel). Validators must never assume they run in a particular order relative to each other.</p>
      <p>🟣 <b>Engine trade-offs.</b> ValidatingAdmissionPolicy: no extra Pods, no network hop, cannot mutate (MutatingAdmissionPolicy arrives in newer releases), limited to data in the request plus params. Gatekeeper: Rego is powerful, can reference other cluster objects via data replication, has strong audit and the <code>gator</code> test CLI; Rego has a learning curve. Kyverno: YAML-native, mutate and generate (e.g. create a default-deny NetworkPolicy in every new namespace), image verification, PolicyReports; complex logic becomes awkward YAML. Many teams use PSA + VAP for simple rules and one engine for the rest.</p>
      <p>🟣 <b>Bypass paths.</b> PSA evaluates Pods, so controllers creating Pods are covered, but exemptions (usernames, runtimeClasses, namespaces) in the AdmissionConfiguration can open holes. Static Pods on the node skip admission entirely. A user with <code>update</code> on the webhook configuration can disable a policy, so RBAC for <code>validatingwebhookconfigurations</code> and Kyverno/Gatekeeper CRDs matters. Background audit catches objects created before the policy existed.</p>
      <p>🟣 <b>restricted fine print.</b> <code>runAsNonRoot</code> may be set at Pod or container level; <code>runAsUser: 0</code> is forbidden; Windows Pods have their own rules; ephemeral debug containers (<code>kubectl debug</code>) are checked too, so use <code>--profile=restricted</code>.</p>`,
    aiEra: `<p>🤖 <b>Policies are now easy to write and easy to get wrong.</b> Assistants write CEL, Rego and Kyverno YAML fluently, but a subtle mistake (matching only <code>containers</code> and forgetting <code>initContainers</code> and <code>ephemeralContainers</code>) leaves a bypass. Always test policies with positive and negative fixtures: <code>kyverno test</code>, <code>gator verify</code>, or a kind cluster with <code>kubectl apply --dry-run=server</code>.</p>
      <p>🤖 <b>Guard rails for AI-generated manifests.</b> As more YAML is generated by assistants and agents, admission policy is the last line that does not depend on a human reading every line. Enforce restricted PSS, allowed registries and signed images in production, so a hallucinated <code>privileged: true</code> or a typo-squatted image never runs.</p>`,
    problems: [P({
      t: 'Pod Security Standards checker (baseline and restricted)',
      l: 'Medium', tags: ['Pod Security', 'admission', 'hardening', 'python'], co: ['Google', 'Red Hat', 'Aqua Security'],
      s: PYC + `<p>A Pod's security settings come as strings <code>"key=value"</code> (simplified model): <code>privileged</code>, <code>hostNetwork</code>, <code>hostPID</code>, <code>hostIPC</code>, <code>hostPath</code> (any value means a hostPath volume), <code>capabilities.add</code> (may repeat), <code>capabilities.drop</code> (may repeat), <code>seccomp</code>, <code>runAsNonRoot</code>, <code>allowPrivilegeEscalation</code>. Write <code>pss_check(fields, level)</code> returning the sorted, de-duplicated violation names.</p>
        <p><b>baseline:</b> <code>privileged</code> if privileged=true; <code>hostNamespaces</code> if any host* namespace is true; <code>hostPath</code> if present; <code>capabilities</code> if an added capability is outside {AUDIT_WRITE, CHOWN, DAC_OVERRIDE, FOWNER, FSETID, KILL, MKNOD, NET_BIND_SERVICE, SETFCAP, SETGID, SETPCAP, SETUID, SYS_CHROOT}; <code>seccomp</code> if seccomp=Unconfined.<br><b>restricted:</b> all baseline checks plus <code>allowPrivilegeEscalation</code> unless it is exactly false; <code>runAsNonRoot</code> unless exactly true; <code>capabilities</code> if drop lacks ALL or any add other than NET_BIND_SERVICE; <code>seccomp</code> unless RuntimeDefault or Localhost.<br><b>privileged:</b> always empty.</p>`,
      ex: `<p><code>pss_check([], "restricted")</code> &rarr; <span class="c-r">["allowPrivilegeEscalation","capabilities","runAsNonRoot","seccomp"]</span>: restricted needs explicit safe settings. <code>pss_check(["capabilities.add=NET_ADMIN","hostNetwork=true"], "baseline")</code> &rarr; <span class="c-r">["capabilities","hostNamespaces"]</span>.</p>`,
      bw: `<p>Check only for <code>privileged: true</code>. That misses hostPath (read the node's disk), hostPID (see and signal every process on the node) and added capabilities like SYS_ADMIN, each of which is close to root on the node.</p>`,
      q: ['A Pod sets nothing at all. Which level does it pass?', ['baseline, but not restricted', 'restricted', 'neither', 'only privileged'], 0, 'Baseline only forbids dangerous settings, so an empty spec passes. Restricted requires explicit safe settings (non-root, no privilege escalation, drop ALL, seccomp).'],
      h: ['Hint 1: parse into a dict of single values plus lists for capabilities.add and capabilities.drop.', 'Hint 2: run the baseline checks for both baseline and restricted; add the restricted-only checks on top.', 'Hint 3: collect names in a set and return sorted(set); return [] immediately for the privileged level.'],
      a: `<p>Parse, then apply two rule layers into a set. The structure mirrors PSA: restricted is a superset of baseline, so the code literally runs baseline first. Real PSA has more checks (hostPorts, AppArmor, SELinux, /proc mount, sysctls, volume types), each one more rule in the same shape.</p>`,
      code: PY(`BASE_CAPS = {"AUDIT_WRITE", "CHOWN", "DAC_OVERRIDE", "FOWNER", "FSETID", "KILL", "MKNOD",
             "NET_BIND_SERVICE", "SETFCAP", "SETGID", "SETPCAP", "SETUID", "SYS_CHROOT"}

def pss_check(fields, level):
    if level == "privileged":
        return []
    val, add, drop = {}, [], []
    for f in fields:
        k, v = f.split("=", 1)
        if k == "capabilities.add":
            add.append(v)
        elif k == "capabilities.drop":
            drop.append(v)
        else:
            val[k] = v
    out = set()
    # baseline
    if val.get("privileged") == "true":
        out.add("privileged")
    if any(val.get(k) == "true" for k in ("hostNetwork", "hostPID", "hostIPC")):
        out.add("hostNamespaces")
    if "hostPath" in val:
        out.add("hostPath")
    if any(c not in BASE_CAPS for c in add):
        out.add("capabilities")
    if val.get("seccomp") == "Unconfined":
        out.add("seccomp")
    # restricted adds explicit requirements
    if level == "restricted":
        if val.get("allowPrivilegeEscalation") != "false":
            out.add("allowPrivilegeEscalation")
        if val.get("runAsNonRoot") != "true":
            out.add("runAsNonRoot")
        if "ALL" not in drop or any(c != "NET_BIND_SERVICE" for c in add):
            out.add("capabilities")
        if val.get("seccomp") not in ("RuntimeDefault", "Localhost"):
            out.add("seccomp")
    return sorted(out)`),
      cx: `<p>O(F) for F fields plus sorting at most a handful of names.</p>`,
      f: ['How would you report the violating container name for multi-container Pods?', 'Where would you put an exemption (a namespace or a runtimeClass) so it is visible and reviewed?'],
      tests: { sig: 'string[] string -> string[]', fn: 'pssCheck', cases: [
        [[[], 'privileged'], []],
        [[['privileged=true'], 'baseline'], ['privileged']],
        [[[], 'baseline'], []],
        [[[], 'restricted'], ['allowPrivilegeEscalation', 'capabilities', 'runAsNonRoot', 'seccomp']],
        [[['allowPrivilegeEscalation=false', 'runAsNonRoot=true', 'capabilities.drop=ALL', 'seccomp=RuntimeDefault'], 'restricted'], []],
        [[['allowPrivilegeEscalation=false', 'runAsNonRoot=true', 'capabilities.drop=ALL', 'seccomp=RuntimeDefault', 'capabilities.add=NET_BIND_SERVICE'], 'restricted'], []],
        [[['capabilities.add=NET_ADMIN', 'hostNetwork=true'], 'baseline'], ['capabilities', 'hostNamespaces']],
        [[['capabilities.add=CHOWN', 'seccomp=Unconfined', 'hostPath=/var/log'], 'baseline'], ['hostPath', 'seccomp']],
        [[['allowPrivilegeEscalation=false', 'runAsNonRoot=true', 'capabilities.drop=ALL', 'seccomp=Localhost', 'capabilities.add=CHOWN'], 'restricted'], ['capabilities']],
        [[['privileged=true'], 'restricted'], ['allowPrivilegeEscalation', 'capabilities', 'privileged', 'runAsNonRoot', 'seccomp']]
      ] }
    })]
  });

  // ───────────────────────── Topic 7: NetworkPolicies ─────────────────────────
  topics.push({
    title: 'NetworkPolicies: Default Deny, Selectors, the AND/OR Trap, Egress and DNS',
    analogy: `<p>Think of an apartment building where, by default, every door is unlocked and anyone can walk into any flat. A NetworkPolicy is a <b>guest list taped to one door</b>: the moment a flat has a list, only the people on it get in. Flats without a list stay open. The trap is in how the list is written: "residents of floor 3 <b>who are</b> plumbers" is not the same as "residents of floor 3, <b>or</b> any plumber", and in YAML the difference is a single dash.</p>`,
    explain: `<p>🟢 <b>Default: everything talks to everything.</b> Kubernetes networking is flat: any Pod can reach any other Pod's IP in any namespace. A <b>NetworkPolicy</b> selects Pods (by labels, in its namespace) and lists what traffic is allowed in (<code>ingress</code>) and out (<code>egress</code>). Rules are <b>additive allow-lists</b>: a Pod selected by at least one policy for a direction becomes <b>isolated</b> in that direction, and only traffic some policy allows gets through. The <b>CNI plugin</b> enforces them (Calico, Cilium, Antrea; kind's default kindnet supports them in recent releases); a CNI without support silently ignores them.</p>
      ${H.table(['Peer written as', 'Means'], [
        ['<code>- podSelector: {app: api}</code>', 'Pods with app=api <b>in the policy\'s own namespace</b>'],
        ['<code>- namespaceSelector: {team: obs}</code>', '<b>all</b> Pods in namespaces labelled team=obs'],
        ['<code>- namespaceSelector: {team: obs}</code><br><code>&nbsp;&nbsp;podSelector: {app: prom}</code> (one dash)', 'Pods with app=prom <b>AND</b> in a team=obs namespace'],
        ['<code>- namespaceSelector: {team: obs}</code><br><code>- podSelector: {app: prom}</code> (two dashes)', 'any Pod in team=obs namespaces <b>OR</b> app=prom Pods in my namespace'],
        ['<code>- ipBlock: {cidr: 10.0.0.0/8, except: [10.9.0.0/16]}</code>', 'IP ranges, for traffic leaving or entering the cluster'],
        ['<code>from: []</code> missing / <code>- {}</code>', '<code>ingress: [{}]</code> allows all; <code>ingress: []</code> or no ingress rules allows nothing']
      ])}
      <p>🔵 <b>The standard recipe.</b> (1) In every app namespace, a <b>default-deny</b> policy selecting all Pods for Ingress and Egress. (2) Allow <b>DNS egress</b> to kube-dns (UDP and TCP 53) or every name lookup breaks. (3) Allow each real flow explicitly: ingress controller → web, web → api, api → db:5432, Prometheus → metrics port. Kubernetes 1.21+ labels every namespace with <code>kubernetes.io/metadata.name</code>, so you can select a namespace by name.</p>
      <p>🔵 <b>NetworkPolicy vs mesh policy.</b> NetworkPolicy works on IPs and ports at L3/L4 in the kernel (or eBPF), and works even for unmeshed Pods. Mesh AuthorizationPolicy uses cryptographic identity and can see HTTP paths. Use both: NetworkPolicy as the coarse wall, mesh policy as the identity-aware door.</p>`,
    clues: ['"isolate namespaces" / "Pods can talk to everything" → default-deny NetworkPolicy per namespace', '"after default deny, nothing resolves names" → allow egress to kube-dns on port 53 UDP and TCP', '"allow Prometheus from the monitoring namespace" → namespaceSelector (and podSelector in the same peer for AND)', '"policy applied but nothing changed" → the CNI does not enforce NetworkPolicy, or the podSelector matches no Pods', '"allow egress only to the payment provider\'s IPs" → <code>ipBlock</code> egress (FQDN rules need Cilium/Calico extensions)', '"block access to the cloud metadata endpoint 169.254.169.254" → egress ipBlock with except'],
    code: [Y(`# 1) Default deny everything in, everything out, for all Pods in shop
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: shop
spec:
  podSelector: {}                # every Pod in the namespace
  policyTypes: ["Ingress", "Egress"]
---
# 2) Allow DNS lookups to kube-dns (or nothing resolves)
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns-egress
  namespace: shop
spec:
  podSelector: {}
  policyTypes: ["Egress"]
  egress:
    - to:
        - namespaceSelector:
            matchLabels: {kubernetes.io/metadata.name: kube-system}
          podSelector:
            matchLabels: {k8s-app: kube-dns}       # one dash: AND
      ports:
        - {protocol: UDP, port: 53}
        - {protocol: TCP, port: 53}
---
# 3) api -> db on 5432 only (ingress side on the db)
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: db-from-api
  namespace: shop
spec:
  podSelector:
    matchLabels: {app: db}
  policyTypes: ["Ingress"]
  ingress:
    - from:
        - podSelector:
            matchLabels: {app: api}
      ports:
        - {protocol: TCP, port: 5432}
---
# 4) ... and the matching egress side on the api (both ends must allow it under default deny)
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: api-to-db
  namespace: shop
spec:
  podSelector:
    matchLabels: {app: api}
  policyTypes: ["Egress"]
  egress:
    - to:
        - podSelector:
            matchLabels: {app: db}
      ports:
        - {protocol: TCP, port: 5432}
    - to:
        - ipBlock:
            cidr: 0.0.0.0/0
            except: ["169.254.169.254/32", "10.0.0.0/8"]   # no metadata endpoint, no other internal ranges
      ports:
        - {protocol: TCP, port: 443}`, 'Default deny, DNS, and one flow'),
      SH(`# Test policies from inside the cluster
kubectl run probe -n shop --rm -it --image=busybox:1.36 --labels=app=api -- sh -c 'nc -zv -w 2 db 5432'
kubectl run probe -n shop --rm -it --image=busybox:1.36 --labels=app=web -- sh -c 'nc -zv -w 2 db 5432'  # should time out
kubectl get networkpolicy -n shop
kubectl describe networkpolicy db-from-api -n shop
# Cilium users: see verdicts live
#   hubble observe --namespace shop --verdict DROPPED`, 'Probe the rules')],
    codeTitle: ['NetworkPolicies', 'Testing'],
    viz: [{
      title: 'Is this connection allowed? (ingress side)',
      input: 'monitoring/scraper -> shop/db',
      inputLabel: 'srcNs/app -> dstNs/app (try shop/api, shop/web, dev/api, monitoring/scraper)',
      gen: function (input) {
        var m = String(input || '').trim().match(/^([a-z0-9-]+)\/([a-z0-9-]+)\s*->\s*([a-z0-9-]+)\/([a-z0-9-]+)$/);
        if (!m) throw new Error('Format: srcNs/app -> dstNs/app, e.g. shop/api -> shop/db');
        var src = { ns: m[1], app: m[2] }, dst = { ns: m[3], app: m[4] };
        var pols = [
          { name: 'default-deny (shop, all Pods)', ns: 'shop', sel: '*', peers: [] },
          { name: 'db-ingress (shop, app=db)', ns: 'shop', sel: 'db', peers: [{ ns: 'monitoring' }, { app: 'api' }] }
        ];
        var rows = pols.map(function (p) { return [p.name, p.peers.length ? p.peers.map(function (q) { return q.ns ? 'any Pod in ns ' + q.ns : 'app=' + q.app + ' in shop'; }).join(' OR ') : '(nothing)', '?']; });
        var frames = [];
        function snap(msg, hl) { frames.push({ narr: msg, parts: [{ type: 'table', label: 'policies in namespace ' + dst.ns, columns: ['policy', 'allowed peers', 'verdict'], rows: rows.map(function (r) { return r.slice(); }), hl: hl || {} }, { type: 'vars', label: 'connection', vals: { from: src.ns + '/' + src.app, to: dst.ns + '/' + dst.app } }] }); }
        snap('A connection from <b>' + src.ns + '/' + src.app + '</b> to <b>' + dst.ns + '/' + dst.app + '</b>. Step 1: which policies in the destination namespace select the destination Pod?', {});
        var selecting = pols.filter(function (p) { return p.ns === dst.ns && (p.sel === '*' || p.sel === dst.app); });
        if (!selecting.length) {
          rows.forEach(function (r) { r[2] = 'does not select'; });
          snap('No policy selects this Pod, so it is <b>not isolated</b>. Kubernetes default applies: <b>allowed</b>. This is why every namespace needs a default-deny policy.', {});
          snap('Lesson: policies only protect Pods they select. A new namespace without policies is wide open.', {});
          return frames;
        }
        var allowed = false, hl = {};
        pols.forEach(function (p, i) {
          if (selecting.indexOf(p) < 0) { rows[i][2] = 'does not select'; hl[i] = 'done'; return; }
          var hit = p.peers.some(function (q) { return q.ns ? src.ns === q.ns : (src.ns === p.ns && src.app === q.app); });
          rows[i][2] = hit ? 'ALLOWS' : 'selects, no matching peer';
          hl[i] = hit ? 'ok' : 'bad';
          if (hit) allowed = true;
        });
        snap(selecting.length + ' polic' + (selecting.length > 1 ? 'ies select' : 'y selects') + ' the Pod, so it is <b>isolated</b>. Each policy is an allow-list; they are OR-ed together. The two peers in db-ingress are separate list items (two dashes), so they are OR-ed as well.', hl);
        snap(allowed ? '<b>Allowed</b>: at least one selecting policy has a matching peer. Remember the source also needs an <b>egress</b> allow if its namespace has default-deny egress.' : '<b>Dropped</b>: isolated and no peer matches. Note <code>app=api</code> in a bare podSelector means api Pods <b>in shop only</b>; dev/api does not match.', {});
        snap('If db-ingress had used one dash (namespaceSelector AND podSelector in one peer), the rule would mean "app=api Pods inside the monitoring namespace", a completely different and much narrower rule.', {});
        return frames;
      }
    }],
    examples: [
      { title: 'Situation: default deny took down every service', html: `<p>A team applies <code>default-deny-all</code> with both policy types on a Friday. Every Pod starts failing with <code>getaddrinfo EAI_AGAIN</code>: DNS egress to kube-dns is now blocked. They also forgot the ingress controller namespace and the health checks from the cloud load balancer. Correct order: allow DNS and the known flows first (in audit-like fashion, e.g. Cilium policy audit mode or Hubble flow logs to discover flows), then add default deny.</p>` },
      { title: 'Situation: the one-dash bug that opened the database', html: `<p>Intended: "Prometheus Pods in the monitoring namespace may scrape the db metrics port". Written with two dashes: <code>- namespaceSelector: {name: monitoring}</code> and <code>- podSelector: {app: prometheus}</code>. Effect: <b>every</b> Pod in monitoring (including a vendor's agent with a known RCE) could reach the db. A policy linter or a simple test Pod from the wrong place catches it; the fix is putting both selectors in one list item.</p>` },
      { title: 'Situation: SSRF to the metadata endpoint', html: `<p>An app with a server-side request forgery bug lets an attacker fetch <code>http://169.254.169.254/latest/meta-data/iam/security-credentials/</code> and steal the node's cloud credentials. Defences in layers: IMDSv2 with hop limit 1 on nodes, workload identity instead of node roles, and an <b>egress NetworkPolicy</b> that excludes <code>169.254.169.254/32</code> from allowed destinations for app Pods.</p>` }
    ],
    deepDive: `<p>🟣 <b>Semantics that bite.</b> Policies are namespaced and select Pods only in their own namespace. Isolation is per direction: a policy with only <code>policyTypes: [Ingress]</code> does not isolate egress. Allowed traffic is connection-based: the reply packets of an allowed connection are allowed automatically. <code>ipBlock</code> is meant for cluster-external IPs; Pod IPs may be rewritten by NAT or a load balancer, so for in-cluster peers use selectors. Traffic to a node's own host-network Pods and from the kubelet (probes) is handled differently by each CNI.</p>
      <p>🟣 <b>What the core API cannot do.</b> No deny rules, no FQDN (domain name) egress, no cluster-wide policies, no L7. CNIs add CRDs: Calico <code>GlobalNetworkPolicy</code> with order and deny, Cilium <code>CiliumNetworkPolicy</code> with <code>toFQDNs</code> and HTTP rules. The upstream <b>AdminNetworkPolicy</b> and BaselineAdminNetworkPolicy (alpha, network-policy-api project) add cluster-scoped, ordered, deny-capable policies for platform teams.</p>
      <p>🟣 <b>Performance.</b> iptables-based enforcement grows with rules × Pods; eBPF dataplanes (Cilium, Calico eBPF) use maps keyed by identity, so evaluation is nearly constant per packet. Cilium assigns numeric identities to label sets, the same "identity, not IP" idea as the mesh, enforced in the kernel.</p>
      <p>🟣 <b>Testing.</b> Treat policies as code: a matrix of source × destination × port with expected verdicts, run in CI against kind (tools like <code>cyclonus</code> or a simple probe Job). Without tests, policy drift quietly reopens paths.</p>`,
    aiEra: `<p>🤖 <b>Generate from observed flows, then tighten.</b> Hubble or Calico flow logs plus an assistant produce a reasonable first set of policies ("these 14 flows were seen in 7 days"). The assistant cannot know about the quarterly batch job or the DR failover path, so roll out per namespace with a probe test matrix and watch drop counters.</p>
      <p>🤖 <b>Egress for AI agents.</b> Agents that browse or call tools are classic SSRF and data-exfiltration risks. Put them in their own namespace with default-deny egress, allow only the model API and approved tool endpoints (FQDN policies via Cilium or an egress gateway), and log everything.</p>`,
    problems: [P({
      t: 'NetworkPolicy evaluator for pod-to-pod ingress',
      l: 'Hard', tags: ['NetworkPolicy', 'segmentation', 'zero trust', 'python'], co: ['Isovalent', 'Tigera', 'Google'],
      s: PYC + `<p>Write <code>np_allowed(policies, src, dst, port)</code>. Pods are <code>"ns/app"</code>. A policy is <code>"ns|selector|peers|ports"</code>: <code>selector</code> is an app name or <code>*</code> (all Pods in ns). <code>peers</code> is empty (allow nothing), <code>*</code> (allow from anywhere), or a <code>;</code>-separated list where each peer is <code>ns=X</code> (all Pods in namespace X), <code>app=Y</code> (app Y in the <b>policy's</b> namespace) or <code>ns=X,app=Y</code> (both: AND). <code>ports</code> is <code>*</code> or a comma list. If no policy selects the destination, the traffic is allowed; otherwise it is allowed only if some selecting policy has a peer matching the source <b>and</b> a matching port.</p>`,
      ex: `<p>Policies <code>["shop|db|ns=shop,app=api|5432", "shop|*||*"]</code>: shop/api &rarr; shop/db:5432 <span class="c-g">true</span>; shop/api &rarr; shop/web:80 <span class="c-r">false</span> (default deny selects web); dev/api &rarr; dev/web:80 <span class="c-g">true</span> (dev has no policies).</p>`,
      bw: `<p>Treat the first matching policy as the answer, or treat a policy with no peers as "no opinion". Both are wrong: policies are OR-ed allow-lists, and a selecting policy with no peers isolates the Pod.</p>`,
      q: ['Policy peers "ns=monitoring;app=api". Is dev/api allowed into shop/db?', ['No: app=api alone means api Pods in the policy\'s own namespace (shop)', 'Yes: app matches', 'Yes: OR means anything matches', 'Only on port 80'], 0, 'A bare podSelector is limited to the policy\'s namespace. dev/api is neither in monitoring nor in shop.'],
      h: ['Hint 1: first collect the policies whose namespace equals the destination namespace and whose selector is * or the destination app.', 'Hint 2: no selecting policy → True. Otherwise check each policy: port match, then any peer match.', 'Hint 3: a peer is a set of conditions joined by commas (AND); missing ns means the policy\'s namespace.'],
      a: `<p>Find selecting policies; if none, allow. For each, check ports, then parse peers into (ns, app) conditions where a missing ns defaults to the policy's namespace and a missing app means any Pod. This captures isolation, OR across policies and peers, AND inside a peer, and namespace-scoping of bare podSelectors.</p>`,
      code: PY(`def _peer_ok(peer, pol_ns, src_ns, src_app):
    if peer == "*":
        return True
    cond = dict(part.split("=", 1) for part in peer.split(","))
    ns = cond.get("ns", pol_ns)            # bare podSelector: policy's own namespace
    if src_ns != ns:
        return False
    return "app" not in cond or cond["app"] == src_app

def np_allowed(policies, src, dst, port):
    src_ns, src_app = src.split("/")
    dst_ns, dst_app = dst.split("/")
    selecting = []
    for p in policies:
        ns, sel, peers, ports = p.split("|")
        if ns == dst_ns and sel in ("*", dst_app):
            selecting.append((ns, peers, ports))
    if not selecting:
        return True                        # not isolated
    for ns, peers, ports in selecting:
        if ports != "*" and str(port) not in ports.split(","):
            continue
        if peers and any(_peer_ok(pe, ns, src_ns, src_app) for pe in peers.split(";")):
            return True
    return False`),
      cx: `<p>O(P × K) for P policies with K peers each.</p>`,
      f: ['Add egress: the connection needs the source side to allow it too when the source is isolated for egress.', 'How would ipBlock peers change the model?'],
      tests: (function () {
        var P1 = ['shop|db|ns=shop,app=api|5432', 'shop|*||*'];
        var P2 = ['shop|db|ns=monitoring;app=api|*'];
        var P3 = ['shop|db|ns=monitoring,app=scraper|*'];
        var P4 = ['shop|web|*|80'];
        return { sig: 'string[] string string int -> bool', fn: 'npAllowed', cases: [
          [[P1, 'shop/api', 'shop/db', 5432], true], [[P1, 'shop/api', 'shop/db', 6379], false],
          [[P1, 'shop/web', 'shop/db', 5432], false], [[P1, 'shop/api', 'shop/web', 80], false],
          [[P1, 'dev/api', 'dev/web', 80], true], [[P2, 'monitoring/scraper', 'shop/db', 9187], true],
          [[P2, 'dev/api', 'shop/db', 5432], false], [[P2, 'shop/api', 'shop/db', 5432], true],
          [[P3, 'monitoring/other', 'shop/db', 9187], false], [[P3, 'monitoring/scraper', 'shop/db', 9187], true],
          [[P4, 'dev/x', 'shop/web', 80], true], [[P4, 'dev/x', 'shop/web', 443], false], [[[], 'a/b', 'c/d', 1], true]
        ] };
      })()
    })]
  });

  // ───────────────────────── Topic 8: supply chain, runtime, secrets ─────────────────────────
  topics.push({
    title: 'Supply Chain at Admission, Runtime Security with Falco, and Kubernetes Secrets Management',
    analogy: `<p>Think of a pharmacy. <b>Supply chain security</b> is checking the factory seal and batch number on every box before it goes on the shelf (signed images, SBOM). <b>Runtime security</b> is the CCTV that notices someone opening boxes in the back room at 3 a.m. (Falco). <b>Secrets management</b> is where the controlled-drug cabinet key lives: not taped under the counter (a plain Secret in Git), but in a safe that logs who opened it, with the key changed regularly.</p>`,
    explain: `<p>🟢 <b>Three questions for every running container.</b> (1) <i>Is this the image we built?</i> (signature and provenance checked at admission). (2) <i>Is it behaving the way it should?</i> (runtime detection). (3) <i>Where do its credentials come from, and who else can read them?</i> (secrets management). The DevSecOps module covered signing images with cosign and generating SBOMs in CI; here we <b>enforce</b> them inside the cluster.</p>
      ${H.table(['Layer', 'Tool', 'What it does in the cluster'], [
        ['Signature at admission', 'Sigstore <b>policy-controller</b>, <b>Kyverno verifyImages</b>, Ratify + Gatekeeper', 'rejects Pods whose image is not signed by an allowed identity (keyless: OIDC issuer + subject, e.g. your release workflow); can rewrite tags to digests'],
        ['Attestations', 'cosign attestations (SLSA provenance, CycloneDX/SPDX SBOM, vuln scan)', 'policy can require "built by our CI from main" and "SBOM attached" before admit'],
        ['Runtime detection', '<b>Falco</b> (CNCF graduated; eBPF probe), Tetragon, Tracee', 'watches syscalls and Kubernetes audit events: shell in a container, write below /etc, read of /etc/shadow, unexpected outbound connection'],
        ['Secrets at rest', '<code>EncryptionConfiguration</code> with a <b>KMS v2</b> provider (GA 1.29)', 'Secrets encrypted in etcd with envelope encryption; base64 is not encryption'],
        ['External secrets', '<b>External Secrets Operator</b>, <b>Secrets Store CSI Driver</b>, Vault Agent injector', 'the source of truth stays in Vault / AWS Secrets Manager / GCP / Azure; sync or mount into Pods with rotation'],
        ['Secrets in Git', '<b>Sealed Secrets</b>, SOPS', 'only encrypted values in Git; the controller or CD tool decrypts']
      ])}
      <p>🔵 <b>Why "just use a Secret" is not enough.</b> A Kubernetes Secret is base64-encoded, stored in etcd (encrypted only if you configured it), readable by anyone with <code>get</code> on secrets in the namespace, and by anyone who can create a Pod that mounts it. Good practice: encryption at rest with KMS, tight RBAC, mount as files (not env vars, which leak into crash dumps and <code>kubectl describe</code>), short-lived credentials from an external manager, and <code>immutable: true</code> for values that should never change in place.</p>
      <p>🔵 <b>Falco rules</b> have a <code>condition</code> (a filter over syscall fields like <code>proc.name</code>, <code>fd.name</code>, <code>container.id</code>, <code>k8s.ns.name</code>), an <code>output</code> template and a <code>priority</code>. Alerts go to stdout, then to Slack, a SIEM or an automated response via Falcosidekick (for example, label the Pod for quarantine by a NetworkPolicy).</p>`,
    clues: ['"only images built by our pipeline may run" → signature verification at admission (Kyverno verifyImages / Sigstore policy-controller) with keyless identity', '"deploy by digest, not tag" → admission rewrites or requires <code>@sha256:</code> digests', '"detect a shell spawned in a production container" → Falco (runtime syscall detection)', '"Secrets are only base64" → encryption at rest with KMS v2, RBAC, external secret store', '"sync secrets from AWS Secrets Manager / Vault into Kubernetes" → External Secrets Operator or Secrets Store CSI', '"secrets in Git for GitOps" → Sealed Secrets or SOPS, never plain Secret YAML'],
    code: [Y(`# 1) Kyverno: only keyless-signed images from our release workflow, pinned by digest
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: verify-signed-images
spec:
  validationFailureAction: Enforce
  webhookTimeoutSeconds: 15
  rules:
    - name: acme-images-signed
      match:
        any:
          - resources:
              kinds: ["Pod"]
      verifyImages:
        - imageReferences: ["ghcr.io/acme/*"]
          mutateDigest: true            # rewrite tag -> digest so the verified image is the one that runs
          verifyDigest: true
          attestors:
            - entries:
                - keyless:
                    issuer: "https://token.actions.githubusercontent.com"
                    subject: "https://github.com/acme/*/.github/workflows/release.yml@refs/heads/main"
                    rekor:
                      url: https://rekor.sigstore.dev
---
# 2) Falco custom rule: interactive shell in a production container
- rule: Shell in prod container
  desc: A shell was spawned inside a container in a prod namespace
  condition: >
    spawned_process and container and
    proc.name in (bash, sh, zsh, ash) and
    k8s.ns.name startswith "prod"
  output: >
    Shell in container (user=%user.name ns=%k8s.ns.name pod=%k8s.pod.name
    image=%container.image.repository cmd=%proc.cmdline parent=%proc.pname)
  priority: WARNING
  tags: [container, shell, mitre_execution]`, 'Kyverno verifyImages and a Falco rule'),
      Y(`# 3) Encrypt Secrets at rest with KMS v2 (kube-apiserver --encryption-provider-config)
apiVersion: apiserver.config.k8s.io/v1
kind: EncryptionConfiguration
resources:
  - resources: ["secrets"]
    providers:
      - kms:
          apiVersion: v2
          name: cloud-kms
          endpoint: unix:///var/run/kms-plugin/socket.sock
          timeout: 3s
      - identity: {}                    # still able to read old unencrypted data during migration
---
# 4) External Secrets Operator: pull from AWS Secrets Manager, refresh hourly
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: payments-db
  namespace: shop
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets            # a SecretStore using IRSA / Pod Identity, no static keys
    kind: SecretStore
  target:
    name: payments-db            # the Kubernetes Secret ESO creates and keeps in sync
    creationPolicy: Owner
  data:
    - secretKey: password
      remoteRef:
        key: prod/payments/db
        property: password`, 'Encryption at rest and External Secrets'),
      SH(`# Verify what admission will verify, by hand
cosign verify ghcr.io/acme/web@sha256:<digest> \\
  --certificate-identity-regexp 'https://github.com/acme/.*/.github/workflows/release.yml@refs/heads/main' \\
  --certificate-oidc-issuer https://token.actions.githubusercontent.com
cosign verify-attestation --type cyclonedx ghcr.io/acme/web@sha256:<digest> \\
  --certificate-identity-regexp 'https://github.com/acme/.*' --certificate-oidc-issuer https://token.actions.githubusercontent.com

# Falco on kind with the modern eBPF probe
helm repo add falcosecurity https://falcosecurity.github.io/charts
helm install falco falcosecurity/falco -n falco --create-namespace --set driver.kind=modern_ebpf
kubectl exec -it deploy/web -n shop -- sh -c 'cat /etc/shadow'   # triggers a default rule
kubectl logs -n falco -l app.kubernetes.io/name=falco | grep -i shadow

# After enabling encryption, rewrite existing Secrets so they are stored encrypted
kubectl get secrets -A -o json | kubectl replace -f -`, 'Verify, detect, re-encrypt')],
    codeTitle: ['Admission and runtime', 'Secrets at rest and ESO', 'CLI'],
    viz: [{
      title: 'An image admission decision: registry, digest, signature',
      input: 'ghcr.io/acme/web:1.4',
      inputLabel: 'image reference (try ghcr.io/acme/web@sha256:..., docker.io/library/nginx:1.27, ghcr.io/acme/web:1.4)',
      gen: function (input) {
        var img = String(input || '').trim();
        if (!img || img.length > 200 || /\s/.test(img)) throw new Error('Give one image reference without spaces');
        var checks = [['allowed registry', 'ghcr.io/acme/'], ['pinned by digest', '@sha256:'], ['signed by release workflow', 'keyless cert subject'], ['SBOM attestation', 'cyclonedx']];
        var rows = checks.map(function (c) { return [c[0], c[1], '?']; }), frames = [];
        function snap(msg, hl) { frames.push({ narr: msg, parts: [{ type: 'table', label: 'admission checks for ' + img, columns: ['check', 'needs', 'result'], rows: rows.map(function (r) { return r.slice(); }), hl: hl || {} }] }); }
        snap('A Pod referencing <code>' + img + '</code> arrives at the admission webhook. Checks run cheapest first; the first failure rejects the Pod.', {});
        if (img.indexOf('ghcr.io/acme/') !== 0) { rows[0][2] = 'FAIL'; snap('Registry check fails: only <code>ghcr.io/acme/</code> is allowed. Public images must be mirrored, scanned and re-signed into our registry first. <b>Rejected.</b>', { 0: 'bad' }); snap('This blocks typo-squatted or random Docker Hub images, and images an attacker pushes to their own registry.', { 0: 'bad' }); return frames; }
        rows[0][2] = 'pass';
        snap('Registry is ours. Next: is the reference pinned to an immutable digest?', { 0: 'ok' });
        var hasDigest = /@sha256:[0-9a-f]{64}$/.test(img);
        if (!hasDigest) {
          rows[1][2] = 'mutate';
          snap('Only a tag (<code>:1.4</code>), and tags can be re-pushed. With <code>mutateDigest: true</code> Kyverno resolves the tag to its current digest and <b>rewrites the Pod spec</b>, so the image verified is exactly the image that runs.', { 1: 'cur' });
        } else { rows[1][2] = 'pass'; snap('Pinned by digest: the content is fixed forever.', { 1: 'ok' }); }
        rows[2][2] = 'pass';
        snap('Signature: cosign looks up the signature for the digest, checks the Fulcio certificate\'s OIDC issuer and subject (<code>.../release.yml@refs/heads/main</code>) and the Rekor transparency log entry. A signature by a fork or a developer laptop would fail here.', { 2: 'ok' });
        rows[3][2] = 'pass';
        snap('Attestation: an SBOM (CycloneDX) is attached and signed by the same identity, so later CVE queries can find this exact image. <b>Admitted.</b>', { 3: 'ok' });
        return frames;
      }
    }],
    examples: [
      { title: 'Situation: a compromised CI token pushes a backdoored tag', html: `<p>An attacker steals a registry push token and overwrites <code>ghcr.io/acme/web:1.4</code>. The next Pod restart pulls the backdoored image. With Kyverno verifyImages requiring a keyless signature from <code>release.yml@refs/heads/main</code>, the new digest has no valid signature (the attacker cannot get a Fulcio certificate for your workflow identity without running inside your repo's main branch), so admission rejects it and the old ReplicaSet keeps running. Deploying by digest would have avoided even the attempted pull.</p>` },
      { title: 'Situation: Falco catches a cryptominer', html: `<p>03:12: Falco fires <i>Drop and execute new binary in container</i> and <i>Outbound connection to a known mining pool port</i> for a Pod in <code>prod-web</code>. Falcosidekick posts to the on-call channel and applies the label <code>quarantine=true</code>; a pre-existing NetworkPolicy denies all egress for that label. Investigation shows an exposed Jupyter endpoint. Without runtime detection, the first signal would have been the cloud bill.</p>` },
      { title: 'Situation: "our Secrets are encrypted" (they were base64)', html: `<p>An audit asks how Kubernetes Secrets are protected. The answer was "they are encoded". A backup of etcd (copied to a shared bucket for DR testing) contained every database password in clear text after base64 decoding. Fixes: EncryptionConfiguration with KMS v2 (managed clusters: EKS envelope encryption, GKE application-layer secrets encryption, AKS KMS), re-write all Secrets, restrict etcd backup access, and move high-value credentials to dynamic secrets in Vault via External Secrets or the CSI driver.</p>` }
    ],
    deepDive: `<p>🟣 <b>Keyless trust model.</b> cosign keyless signing gets a short-lived certificate from <b>Fulcio</b> bound to an OIDC identity (e.g. the GitHub Actions workflow), signs, and records the event in the <b>Rekor</b> transparency log. Verification checks the certificate chain, that the signature was made while the certificate was valid (using the Rekor timestamp), and that the identity matches your policy. The policy is the important part: matching only the issuer (any GitHub workflow anywhere) gives almost no security.</p>
      <p>🟣 <b>Admission caveats.</b> Image verification calls registries and Rekor, so cache results and set timeouts; decide whether failure is open or closed per namespace. Mutating tags to digests must happen before other validators read the image. Also cover initContainers and ephemeralContainers. SLSA provenance lets policy demand "built from this repo, by this builder", which is stronger than "signed by someone with the key".</p>
      <p>🟣 <b>Falco internals.</b> The modern eBPF probe (CO-RE, kernel 5.8+) is the default; rules use macros and lists (<code>spawned_process</code>, <code>container</code>). Tune with exceptions rather than disabling rules, and ship the plugin for Kubernetes audit logs to catch API-level events (exec into a Pod, ClusterRoleBinding created). Detection must be wired to response, or alerts become noise.</p>
      <p>🟣 <b>Secrets patterns compared.</b> ESO syncs into native Secrets (simple for apps, but the value exists in etcd); the Secrets Store CSI driver mounts directly from the external store into a tmpfs volume (can avoid etcd entirely, optional sync); Vault Agent injector renders templates and renews dynamic leases. KMS v2 uses a per-key DEK cached in memory and a KEK in the cloud KMS, so rotation of the KEK does not require re-encrypting every Secret at once.</p>`,
    aiEra: `<p>🤖 <b>AI raises the stakes on provenance.</b> Assistants pull images and packages by name, and attackers register names that assistants hallucinate. Admission rules (our registry only, signed by our pipeline, digest-pinned) make the cluster indifferent to how the manifest was written.</p>
      <p>🤖 <b>AI-assisted detection triage.</b> Falco plus an LLM summariser turns a burst of 40 alerts into "one Pod, one exposed notebook, one miner download". Keep the response automation deterministic (quarantine label, scale to zero) and let the model explain, not act, unless a human approves. Never paste secret values from alerts into a prompt.</p>`,
    problems: [P({
      t: 'Image admission check: registry, digest and signer identity',
      l: 'Medium', tags: ['supply chain', 'Sigstore', 'admission', 'python'], co: ['Chainguard', 'Google', 'GitHub'],
      s: PYC + `<p>Write <code>admit_image(image, signers, allowed_ids, registries)</code> returning the first failing check in this order: <code>"DENY:registry"</code> unless the image starts with one of the registries followed by <code>/</code>; <code>"DENY:digest"</code> unless the image contains <code>@sha256:</code> followed by exactly 64 lowercase hex characters at the end; <code>"DENY:signature"</code> unless at least one verified signer identity is in <code>allowed_ids</code>; otherwise <code>"ALLOW"</code>.</p>`,
      ex: `<p><code>ghcr.io/acme/app:1.4</code> &rarr; <span class="c-r">DENY:digest</span> (tags can be re-pushed). <code>ghcr.io/acmeevil/app@sha256:…</code> with registry <code>ghcr.io/acme</code> &rarr; <span class="c-r">DENY:registry</span>: the trailing slash in the check stops prefix tricks. <code>ghcr.io/acme/app:1.4@sha256:&lt;64 hex&gt;</code> signed by the release workflow &rarr; <span class="c-g">ALLOW</span>.</p>`,
      bw: `<p>Check <code>image.startswith("ghcr.io/acme")</code> and that "some signature exists". The prefix check admits <code>ghcr.io/acmeevil/...</code>, and "any signature" admits images signed by anyone with a GitHub account.</p>`,
      q: ['Why check the signer identity instead of "is it signed"?', ['Anyone can sign any image with their own OIDC identity; only your workflow\'s identity proves your pipeline built it', 'Unsigned images are faster', 'Rekor only stores your signatures', 'Digests already prove who built it'], 0, 'Keyless signing is open to everyone; the trust comes from matching the issuer and subject to your release workflow.'],
      h: ['Hint 1: build the registry check as image.startswith(reg + "/") for any allowed registry.', 'Hint 2: split on "@sha256:" and check the last part has length 64 and only 0-9a-f.', 'Hint 3: the signature check is a set intersection between signers and allowed ids.'],
      a: `<p>Three checks in order, each a few lines. The order matters for clear error messages (and for cost: registry and digest checks are free, signature verification calls out to the registry and Rekor in real admission controllers).</p>`,
      code: PY(`HEX = set("0123456789abcdef")

def admit_image(image, signers, allowed_ids, registries):
    if not any(image.startswith(r + "/") for r in registries):
        return "DENY:registry"
    if "@sha256:" not in image:
        return "DENY:digest"
    digest = image.split("@sha256:")[-1]
    if len(digest) != 64 or not set(digest) <= HEX:
        return "DENY:digest"
    if not set(signers) & set(allowed_ids):
        return "DENY:signature"
    return "ALLOW"`),
      cx: `<p>O(R + S + A) for registries, signers and allowed identities.</p>`,
      f: ['How would you support a wildcard identity like workflows under any repo of the acme org?', 'What should happen when Rekor is unreachable: fail open or closed, and for which namespaces?'],
      tests: (function () {
        var ID = 'https://github.com/acme/app/.github/workflows/release.yml@refs/heads/main', REG = ['ghcr.io/acme'];
        return { sig: 'string string[] string[] string[] -> string', fn: 'admitImage', cases: [
          [['ghcr.io/acme/app@' + DIG, [ID], [ID], REG], 'ALLOW'],
          [['ghcr.io/acme/app:1.4', [ID], [ID], REG], 'DENY:digest'],
          [['docker.io/library/nginx@' + DIG, [ID], [ID], REG], 'DENY:registry'],
          [['ghcr.io/acme/app@' + DIG, [], [ID], REG], 'DENY:signature'],
          [['ghcr.io/acme/app@' + DIG, ['https://github.com/evil/fork/.github/workflows/release.yml@refs/heads/main'], [ID], REG], 'DENY:signature'],
          [['ghcr.io/acmeevil/app@' + DIG, [ID], [ID], REG], 'DENY:registry'],
          [['ghcr.io/acme/app@sha256:abc', [ID], [ID], REG], 'DENY:digest'],
          [['ghcr.io/acme/app:1.4@' + DIG, [ID], [ID], REG], 'ALLOW']
        ] };
      })()
    })]
  });

  // ───────────────────────── Practice arena ─────────────────────────
  practice.push(P({
    t: 'Parse and validate a SPIFFE ID',
    l: 'Easy', tags: ['SPIFFE', 'identity', 'python'], co: ['Google', 'Uber'],
    s: PYC + `<p>Write <code>spiffe_parts(spiffe_id)</code>. A Kubernetes-style SPIFFE ID looks like <code>spiffe://&lt;trust-domain&gt;/ns/&lt;namespace&gt;/sa/&lt;service-account&gt;</code>. Return <code>[trust_domain, namespace, service_account]</code>, or an empty list if the string does not have exactly that shape with all three values non-empty.</p>`,
    ex: `<p><code>"spiffe://cluster.local/ns/shop/sa/frontend"</code> &rarr; <span class="c-g">["cluster.local","shop","frontend"]</span>. <code>"cluster.local/ns/shop/sa/frontend"</code> (an Istio principal, missing the scheme) &rarr; <span class="c-r">[]</span>.</p>`,
    bw: `<p>Split on <code>/</code> and take positions 2, 4 and 6 without checking the scheme, the literal <code>ns</code> and <code>sa</code> segments or empty parts. A policy tool built on that would accept <code>spiffe://cluster.local/sa/x/ns/y</code> and read the wrong namespace.</p>`,
    q: ['In Istio AuthorizationPolicy, how do you write the principal for spiffe://cluster.local/ns/shop/sa/frontend?', ['cluster.local/ns/shop/sa/frontend', 'shop/frontend', 'frontend.shop.svc.cluster.local', 'spiffe:frontend'], 0, 'Istio principals are the SPIFFE ID without the spiffe:// prefix.'],
    h: ['Hint 1: check and strip the <code>spiffe://</code> prefix first.', 'Hint 2: split the rest on <code>/</code>; you need exactly 5 parts.', 'Hint 3: parts 1 and 3 must be the literals ns and sa, and parts 0, 2 and 4 must be non-empty.'],
    a: `<p>Prefix check, split, shape check. Being strict matters: identity parsing is security code, and anything ambiguous must be rejected rather than guessed.</p>`,
    code: PY(`def spiffe_parts(spiffe_id):
    prefix = "spiffe://"
    if not spiffe_id.startswith(prefix):
        return []
    parts = spiffe_id[len(prefix):].split("/")
    if len(parts) != 5 or parts[1] != "ns" or parts[3] != "sa":
        return []
    td, ns, sa = parts[0], parts[2], parts[4]
    if not td or not ns or not sa:
        return []
    return [td, ns, sa]`),
    cx: `<p>O(L) for an ID of length L.</p>`,
    f: ['How would you check the trust domain against an allow-list for multi-cluster federation?', 'Why is the service account, not the Pod name, part of the identity?'],
    tests: { sig: 'string -> string[]', fn: 'spiffeParts', cases: [
      [['spiffe://cluster.local/ns/shop/sa/frontend'], ['cluster.local', 'shop', 'frontend']],
      [['spiffe://prod.acme.com/ns/payments/sa/api'], ['prod.acme.com', 'payments', 'api']],
      [['cluster.local/ns/shop/sa/frontend'], []], [['spiffe://cluster.local/ns/shop'], []],
      [['spiffe://cluster.local/sa/x/ns/y'], []], [['spiffe:///ns/a/sa/b'], []],
      [['spiffe://td/ns//sa/b'], []], [[''], []]
    ] }
  }));

  practice.push(P({
    t: 'Default-deny a namespace without breaking DNS',
    l: 'Easy', tags: ['NetworkPolicy', 'DNS', 'YAML'], co: ['Amazon', 'Shopify'],
    s: `<p>Namespace <code>shop</code> runs <code>web</code> (port 8080, reached from the <code>ingress-nginx</code> namespace) and <code>api</code> (port 9000, reached only from web). Write NetworkPolicies that deny all ingress and egress by default, keep DNS working, and allow exactly these two flows (both ends, since egress is denied too).</p>`,
    ex: `<p>After applying: <code>web</code> receives traffic from the ingress controller, <code>web &rarr; api:9000</code> works, <code>nslookup api</code> works from every Pod, and a test Pod with <code>app=web</code> cannot reach <code>api:22</code> or the internet.</p>`,
    bw: `<p>Applying only <code>default-deny-all</code> and "fixing things as they break". Every Pod fails DNS lookups first, which looks like an app outage, and engineers end up deleting the policy under pressure.</p>`,
    q: ['Which ports must the DNS egress rule open?', ['53 UDP and 53 TCP to kube-dns', '53 UDP only', '443 to the API server', '8053 to CoreDNS'], 0, 'DNS uses UDP 53 normally and TCP 53 for large responses and retries; CoreDNS Pods listen on 53 (kube-dns Service).'],
    h: ['Hint 1: start with podSelector: {} and both policyTypes and no rules.', 'Hint 2: DNS egress goes to the kube-system namespace and k8s-app=kube-dns Pods, in one peer (AND).', 'Hint 3: for each flow write ingress on the receiver and egress on the sender; select the ingress controller namespace by kubernetes.io/metadata.name.'],
    a: `<p>Four policies: default deny, DNS egress for all Pods, web (ingress from ingress-nginx on 8080 plus egress to api:9000), api (ingress from web on 9000). Under default-deny both directions, every flow needs both halves. Verify with throwaway probe Pods carrying the right and wrong labels.</p>`,
    code: Y(`apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata: {name: default-deny-all, namespace: shop}
spec:
  podSelector: {}
  policyTypes: ["Ingress", "Egress"]
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata: {name: allow-dns, namespace: shop}
spec:
  podSelector: {}
  policyTypes: ["Egress"]
  egress:
    - to:
        - namespaceSelector: {matchLabels: {kubernetes.io/metadata.name: kube-system}}
          podSelector: {matchLabels: {k8s-app: kube-dns}}
      ports: [{protocol: UDP, port: 53}, {protocol: TCP, port: 53}]
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata: {name: web, namespace: shop}
spec:
  podSelector: {matchLabels: {app: web}}
  policyTypes: ["Ingress", "Egress"]
  ingress:
    - from:
        - namespaceSelector: {matchLabels: {kubernetes.io/metadata.name: ingress-nginx}}
      ports: [{protocol: TCP, port: 8080}]
  egress:
    - to:
        - podSelector: {matchLabels: {app: api}}
      ports: [{protocol: TCP, port: 9000}]
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata: {name: api, namespace: shop}
spec:
  podSelector: {matchLabels: {app: api}}
  policyTypes: ["Ingress"]
  ingress:
    - from:
        - podSelector: {matchLabels: {app: web}}
      ports: [{protocol: TCP, port: 9000}]`, 'shop-netpol.yaml'),
    cx: `<p>Four objects; enforcement cost is in the CNI (constant per packet with eBPF dataplanes).</p>`,
    f: ['How would Kyverno generate the default-deny and DNS policies automatically for every new namespace?', 'What changes if the api must also call an external payment API on 443?']
  }));

  practice.push(P({
    t: 'Worst-case latency of a retried call',
    l: 'Easy', tags: ['retries', 'timeouts', 'python'], co: ['Netflix', 'Lyft'],
    s: PYC + `<p>A mesh route has a per-try timeout, a number of <b>retries</b> (extra attempts after the first, as in Istio's <code>attempts</code>) and an overall route timeout (0 = no overall timeout). Write <code>worst_case_latency(per_try_ms, retries, timeout_ms)</code>: the longest a caller can wait when every try times out. Ignore backoff.</p>`,
    ex: `<p><code>worst_case_latency(1000, 2, 3000)</code> &rarr; <span class="c-g">3000</span> (3 tries × 1 s fits exactly). <code>worst_case_latency(1000, 2, 2500)</code> &rarr; <span class="c-r">2500</span>: the overall timeout cuts the third try short. <code>worst_case_latency(300, 3, 0)</code> &rarr; 1200.</p>`,
    bw: `<p>Assume latency equals the per-try timeout. With 2 retries the user can wait three times as long, and if the caller's own timeout is shorter, the extra retries are wasted load that nobody is waiting for.</p>`,
    q: ['Caller timeout 2 s, per-try 1 s, retries 3. What is wrong?', ['At most 2 tries can complete before the caller gives up; the extra retries only add load', 'Nothing', 'Retries must be 0 with a timeout', 'The per-try timeout must be larger than the overall timeout'], 0, 'Retries beyond the caller\'s budget just generate work nobody waits for. Size per-try × (retries + 1) to fit the overall timeout.'],
    h: ['Hint 1: total tries = retries + 1 (the first try is not a retry).', 'Hint 2: worst case without an overall timeout is per_try × tries.', 'Hint 3: with an overall timeout above 0, take the minimum of the two.'],
    a: `<p>Multiply and cap. The exercise is the design rule: per-try timeout × (retries + 1) should be no more than the overall timeout, and the overall timeout should be less than the caller's own timeout, all the way up the call chain.</p>`,
    code: PY(`def worst_case_latency(per_try_ms, retries, timeout_ms):
    total = per_try_ms * (retries + 1)       # first try + retries
    if timeout_ms > 0:
        return min(total, timeout_ms)        # the route timeout always wins
    return total`),
    cx: `<p>O(1) time and space: two multiplications and a min.</p>`,
    f: ['Add exponential backoff with a base of 25 ms (Envoy default) between tries.', 'How do budgets compose across three hops?'],
    tests: { sig: 'int int int -> int', fn: 'worstCaseLatency', cases: [
      [[1000, 2, 3000], 3000], [[1000, 2, 2500], 2500], [[500, 0, 0], 500], [[300, 3, 0], 1200],
      [[300, 3, 10000], 1200], [[0, 5, 100], 0], [[1000, 2, 0], 3000]
    ] }
  }));

  practice.push(P({
    t: 'Progressive delivery: next canary weight',
    l: 'Medium', tags: ['canary', 'Flagger', 'Argo Rollouts', 'python'], co: ['Weaveworks', 'Intuit'],
    s: PYC + `<p>An automated canary controller (like Flagger or Argo Rollouts) runs every minute. Write <code>next_canary_weight(current, step, max_weight, success_rate, threshold)</code>: if the canary's success rate is <b>below</b> the threshold, roll back (return 0); if the current weight has reached <code>max_weight</code>, promote (return 100); otherwise return <code>min(current + step, max_weight)</code>.</p>`,
    ex: `<p><code>(40, 10, 50, 99.5, 99.0)</code> &rarr; <span class="c-g">50</span>. <code>(50, 10, 50, 99.5, 99.0)</code> &rarr; <span class="c-g">100</span> (promote). <code>(30, 10, 50, 98.0, 99.0)</code> &rarr; <span class="c-r">0</span> (rollback).</p>`,
    bw: `<p>A human edits VirtualService weights by hand and watches a dashboard. At 2 a.m. nobody watches, steps get skipped, and a bad canary reaches 100% because the person was in a meeting.</p>`,
    q: ['Success rate equals the threshold exactly. Rollback or advance?', ['Advance: only strictly below the threshold rolls back', 'Rollback', 'Promote to 100 immediately', 'Pause'], 0, 'The rule is "below threshold rolls back"; equal passes. Make the boundary explicit in real configs too.'],
    h: ['Hint 1: the rollback check comes first, whatever the weight.', 'Hint 2: then the promotion check (current at or above max).', 'Hint 3: otherwise step up, capped at max_weight.'],
    a: `<p>Three ordered rules. Real controllers also require a minimum request count before trusting the metric, check latency as well as success rate, and count failed checks before rolling back (Flagger's <code>threshold</code> of failed iterations).</p>`,
    code: PY(`def next_canary_weight(current, step, max_weight, success_rate, threshold):
    if success_rate < threshold:
        return 0                         # rollback: all traffic back to stable
    if current >= max_weight:
        return 100                       # promote the canary
    return min(current + step, max_weight)`),
    cx: `<p>O(1) per controller iteration.</p>`,
    f: ['Add a minimum request volume: with fewer than 100 requests, hold the weight.', 'How would the controller apply the weight: VirtualService, HTTPRoute or SMI TrafficSplit?'],
    tests: { sig: 'int int int double double -> int', fn: 'nextCanaryWeight', cases: [
      [[0, 10, 50, 99.9, 99.0], 10], [[40, 10, 50, 99.5, 99.0], 50], [[50, 10, 50, 99.5, 99.0], 100],
      [[30, 10, 50, 98.0, 99.0], 0], [[45, 10, 50, 99.0, 99.0], 50], [[0, 20, 50, 100.0, 99.0], 20], [[50, 10, 50, 50.0, 99.0], 0]
    ] }
  }));

  practice.push(P({
    t: 'Canary with header override, retries and outlier detection (Istio)',
    l: 'Medium', tags: ['Istio', 'VirtualService', 'DestinationRule', 'YAML'], co: ['Airbnb', 'eBay'],
    s: `<p>Service <code>checkout</code> in namespace <code>shop</code> has Deployments labelled <code>version: v1</code> and <code>version: v2</code>. Write the Istio resources so that: requests with header <code>x-canary: always</code> go to v2; everyone else is split 95/5; the route has a 2 s overall timeout and 2 retries with a 600 ms per-try timeout on connection failures and 503 only (checkout is a POST with an idempotency key); a Pod with 3 consecutive 5xx errors is ejected for at least 30 s, never more than a third of the Pods.</p>`,
    ex: `<p><code>curl -H 'x-canary: always' checkout/pay</code> always reaches v2. 1,000 normal requests: about 950 v1, 50 v2. A broken v2 Pod disappears from the pool after its third straight 500.</p>`,
    bw: `<p>Two Deployments behind one Service with replica counts 19:1 to "approximate 5%". Splitting by replica count ties traffic to capacity, cannot do header routing, and every Pod restart changes the ratio.</p>`,
    q: ['Why must the header match come before the weighted route?', ['Istio uses the first matching HTTP route', 'Header routes are slower', 'Weights must be last in YAML syntax', 'It does not matter'], 0, 'Routes are evaluated in order and the first match wins; a catch-all weighted route first would swallow the header traffic.'],
    h: ['Hint 1: DestinationRule defines subsets v1 and v2 by the version label and holds outlierDetection.', 'Hint 2: VirtualService http[0] matches the header; http[1] has two weighted destinations.', 'Hint 3: perTryTimeout × 3 tries should fit in the 2 s timeout; retryOn: connect-failure,503.'],
    a: `<p>A DestinationRule with subsets and <code>outlierDetection</code> (<code>consecutive5xxErrors: 3</code>, <code>baseEjectionTime: 30s</code>, <code>maxEjectionPercent: 33</code>), and a VirtualService with the header route first, then the 95/5 route carrying the timeout and retries. 600 ms × 3 = 1.8 s fits within 2 s.</p>`,
    code: Y(`apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata: {name: checkout, namespace: shop}
spec:
  host: checkout.shop.svc.cluster.local
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 5s
      baseEjectionTime: 30s
      maxEjectionPercent: 33
  subsets:
    - {name: v1, labels: {version: v1}}
    - {name: v2, labels: {version: v2}}
---
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata: {name: checkout, namespace: shop}
spec:
  hosts: [checkout]
  http:
    - match:
        - headers:
            x-canary: {exact: always}
      route:
        - destination: {host: checkout, subset: v2}
    - route:
        - destination: {host: checkout, subset: v1}
          weight: 95
        - destination: {host: checkout, subset: v2}
          weight: 5
      timeout: 2s
      retries:
        attempts: 2
        perTryTimeout: 600ms
        retryOn: connect-failure,503`, 'checkout-canary.yaml'),
    cx: `<p>Two objects; istiod pushes them to the affected proxies (or the waypoint in ambient mode) in seconds.</p>`,
    f: ['Write the equivalent with a Gateway API HTTPRoute (header match plus weighted backendRefs).', 'How would Flagger own the weights so humans do not edit them?']
  }));

  practice.push(P({
    t: 'Kyverno policy: non-root, no latest tag, approved registry',
    l: 'Medium', tags: ['Kyverno', 'admission', 'YAML'], co: ['Nirmata', 'Adobe'],
    s: `<p>Write one Kyverno <code>ClusterPolicy</code> for all namespaces labelled <code>env: prod</code> that: (1) rejects Pods whose containers do not set <code>runAsNonRoot: true</code> (at Pod or container level, simplified to container level), (2) rejects images using the <code>:latest</code> tag, (3) rejects images outside <code>ghcr.io/acme/</code>. Use Enforce mode and background scanning so existing Pods are reported.</p>`,
    ex: `<p><code>kubectl run t --image=nginx -n prod-web</code> &rarr; <span class="c-r">denied</span> with three messages. A Deployment using <code>ghcr.io/acme/web:2.1</code> with <code>runAsNonRoot: true</code> &rarr; <span class="c-g">admitted</span>. <code>kubectl get policyreport -A</code> lists older Pods that violate.</p>`,
    bw: `<p>A wiki page saying "please do not use latest" and a quarterly manual audit. People forget, and the audit finds problems months after they shipped.</p>`,
    q: ['Why also enable background scanning?', ['Admission only sees new or updated objects; background reports cover what already runs', 'It makes admission faster', 'It mutates old Pods', 'It is required for Enforce'], 0, 'Policies added later do not touch running Pods; background mode produces PolicyReports for them.'],
    h: ['Hint 1: three rules, each with match on kind Pod and a namespaceSelector on env: prod.', 'Hint 2: pattern validation: <code>image: "!*:latest"</code> and <code>image: "ghcr.io/acme/*"</code> under containers.', 'Hint 3: for runAsNonRoot use a pattern on <code>securityContext.runAsNonRoot: true</code> for every container.'],
    a: `<p>Three validate rules with patterns. Kyverno applies the container pattern to every element of the list. In production also cover initContainers and ephemeralContainers (Kyverno autogen rules handle Deployments and other Pod controllers automatically).</p>`,
    code: Y(`apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: prod-pod-baseline
spec:
  validationFailureAction: Enforce
  background: true
  rules:
    - name: run-as-non-root
      match:
        any:
          - resources:
              kinds: ["Pod"]
              namespaceSelector: {matchLabels: {env: prod}}
      validate:
        message: "containers must set securityContext.runAsNonRoot: true"
        pattern:
          spec:
            containers:
              - securityContext:
                  runAsNonRoot: true
    - name: no-latest
      match:
        any:
          - resources:
              kinds: ["Pod"]
              namespaceSelector: {matchLabels: {env: prod}}
      validate:
        message: "the :latest tag is not allowed"
        pattern:
          spec:
            containers:
              - image: "!*:latest"
    - name: approved-registry
      match:
        any:
          - resources:
              kinds: ["Pod"]
              namespaceSelector: {matchLabels: {env: prod}}
      validate:
        message: "images must come from ghcr.io/acme/"
        pattern:
          spec:
            containers:
              - image: "ghcr.io/acme/*"`, 'prod-pod-baseline.yaml'),
    cx: `<p>Each admission request evaluates three patterns per container: microseconds inside the Kyverno webhook.</p>`,
    f: ['How would you test this with <code>kyverno test</code> and fixture Pods?', 'Write rule 2 as a ValidatingAdmissionPolicy in CEL instead.']
  }));

  practice.push(P({
    t: 'Find dangerous RBAC rules',
    l: 'Medium', tags: ['RBAC', 'audit', 'privilege escalation', 'python'], co: ['Wiz', 'Palo Alto Networks'],
    s: PYC + `<p>Rules are <code>"verbs:resources"</code> (comma lists). Write <code>risky_rules(rules)</code> returning the sorted, de-duplicated risk labels: <code>wildcard</code> if <code>*</code> appears in verbs or resources; <code>secrets</code> if <code>secrets</code> is listed with get, list, watch or *; <code>exec</code> if <code>pods/exec</code> is listed with create, get or *; <code>escalate</code> if the verbs include escalate, bind or impersonate; <code>podCreate</code> if <code>pods</code> is listed with create or *.</p>`,
    ex: `<p><code>["watch:secrets,configmaps", "*:pods"]</code> &rarr; <span class="c-r">["podCreate","secrets","wildcard"]</span>. <code>["get,list:pods"]</code> &rarr; <span class="c-g">[]</span>.</p>`,
    bw: `<p>Only search for <code>cluster-admin</code> bindings. Many real escalations come from narrower-looking rules: watch on secrets, create on pods, bind on roles, impersonate on users.</p>`,
    q: ['Why is "list secrets" as dangerous as "get secrets"?', ['A list response contains every Secret\'s full data', 'list triggers a rotation', 'list is cluster-wide always', 'It is not dangerous'], 0, 'There is no names-only list: list and watch return the whole objects, values included.'],
    h: ['Hint 1: split each rule on ":" then each side on ",".', 'Hint 2: write each label as one condition over the verb set and resource set.', 'Hint 3: collect into a set, return sorted.'],
    a: `<p>Parse into sets and test five conditions. Tools such as <code>rbac-police</code>, <code>KubiScan</code> and <code>kubectl-who-can</code> do the same at scale, plus resolving which subjects are bound to the risky roles.</p>`,
    code: PY(`def risky_rules(rules):
    out = set()
    for r in rules:
        verbs_s, res_s = r.split(":", 1)
        verbs, res = set(verbs_s.split(",")), set(res_s.split(","))
        if "*" in verbs or "*" in res:
            out.add("wildcard")
        if "secrets" in res and verbs & {"get", "list", "watch", "*"}:
            out.add("secrets")
        if "pods/exec" in res and verbs & {"create", "get", "*"}:
            out.add("exec")
        if verbs & {"escalate", "bind", "impersonate"}:
            out.add("escalate")
        if "pods" in res and verbs & {"create", "*"}:
            out.add("podCreate")
    return sorted(out)`),
    cx: `<p>O(total rule length).</p>`,
    f: ['Extend the input with the bound subjects and report "who can read secrets in prod".', 'Why is update on mutatingwebhookconfigurations a cluster takeover path?'],
    tests: { sig: 'string[] -> string[]', fn: 'riskyRules', cases: [
      [[['get,list:pods']], []], [[['get:secrets']], ['secrets']], [[['*:*']], ['wildcard']],
      [[['create:pods/exec', 'create:pods']], ['exec', 'podCreate']], [[['bind:clusterroles', 'impersonate:users']], ['escalate']],
      [[['watch:secrets,configmaps', '*:pods']], ['podCreate', 'secrets', 'wildcard']], [[[]], []], [[['update:secrets']], []]
    ] }
  }));

  practice.push(P({
    t: 'Outlier detection simulator (consecutive 5xx ejection)',
    l: 'Hard', tags: ['circuit breaking', 'Envoy', 'resilience', 'python'], co: ['Lyft', 'Uber', 'Google'],
    s: PYC + `<p>Model Envoy outlier detection. Events are <code>"t:host:code"</code> in time order (t in ms). Write <code>ejections(events, consecutive, base_ms)</code>. Per host: if the host is ejected (<code>t &lt; until</code>), ignore the event (no traffic reaches it). Otherwise a code ≥ 500 adds 1 to its consecutive counter and any other code resets it to 0. When the counter reaches <code>consecutive</code>: the host's ejection count increases by 1, <code>until = t + base_ms × ejection_count</code>, the counter resets, and you output <code>"host@t-until"</code>. Return outputs in order.</p>`,
    ex: `<p><code>["0:a:500","1:a:500","10:a:500","20:a:500","1000:a:500","1001:a:500"]</code>, consecutive 2, base 100 &rarr; <span class="c-r">["a@1-101","a@1001-1201"]</span>: events at 10 and 20 are ignored (ejected), and the second ejection lasts twice as long.</p>`,
    bw: `<p>Eject a host on the first error, or for a fixed time forever. The first ejects healthy Pods on a single blip; the second lets a flapping Pod come back and fail every 30 s without ever being sidelined longer.</p>`,
    q: ['Why does the ejection time grow with each ejection?', ['A repeatedly failing host is probably really broken; longer ejections reduce flapping', 'To save memory', 'Envoy cannot count beyond 1', 'To balance zones'], 0, 'baseEjectionTime × times ejected backs off a chronic offender; maxEjectionPercent protects capacity.'],
    h: ['Hint 1: keep three dicts per host: counter, ejection count and ejected-until time.', 'Hint 2: check the ejected-until time before counting the event.', 'Hint 3: 4xx codes reset the counter like 2xx; only 5xx count.'],
    a: `<p>A per-host state machine. Real Envoy also brings hosts back after the ejection time, decrements the ejection multiplier over time, checks success-rate and failure-percentage outliers, and stops at <code>maxEjectionPercent</code>.</p>`,
    code: PY(`def ejections(events, consecutive, base_ms):
    count, times, until, out = {}, {}, {}, []
    for e in events:
        t_s, host, code_s = e.split(":")
        t, code = int(t_s), int(code_s)
        if t < until.get(host, -1):
            continue                                   # ejected: no traffic reaches it
        if code >= 500:
            count[host] = count.get(host, 0) + 1
        else:
            count[host] = 0                            # success or 4xx resets the streak
        if count[host] >= consecutive:
            times[host] = times.get(host, 0) + 1
            until[host] = t + base_ms * times[host]   # longer each time
            count[host] = 0
            out.append(f"{host}@{t}-{until[host]}")
    return out`),
    cx: `<p>O(E) for E events, O(H) memory for H hosts.</p>`,
    f: ['Add maxEjectionPercent: never eject if that would leave fewer than half the hosts.', 'How does this interact with Kubernetes readiness probes?'],
    tests: { sig: 'string[] int int -> string[]', fn: 'ejections', cases: [
      [[['0:a:500', '1:a:500', '2:a:500'], 3, 1000], ['a@2-1002']],
      [[['0:a:500', '1:a:200', '2:a:500', '3:a:500'], 3, 1000], []],
      [[[], 3, 1000], []],
      [[['0:a:503', '1:b:503', '2:a:503', '3:b:200', '4:a:503'], 3, 100], ['a@4-104']],
      [[['0:a:500', '1:a:500', '10:a:500', '20:a:500', '1000:a:500', '1001:a:500'], 2, 100], ['a@1-101', 'a@1001-1201']],
      [[['5:x:502', '6:x:200'], 1, 50], ['x@5-55']],
      [[['0:a:404', '1:a:404'], 1, 10], []]
    ] }
  }));

  practice.push(P({
    t: 'Mini Falco: runtime alerts from syscall events',
    l: 'Hard', tags: ['Falco', 'runtime security', 'detection', 'python'], co: ['Sysdig', 'CrowdStrike'],
    s: PYC + `<p>Events are <code>"pod|process|action|target"</code>. Write <code>falco_alerts(events)</code> with four rules: <code>shell:&lt;pod&gt;</code> when action is <code>spawn</code> and process is bash, sh, zsh or ash; <code>sensitive_read:&lt;pod&gt;</code> when action is <code>open_read</code> and target is <code>/etc/shadow</code>; <code>etc_write:&lt;pod&gt;</code> when action is <code>open_write</code> and target starts with <code>/etc/</code>; <code>miner_port:&lt;pod&gt;</code> when action is <code>connect</code> and the port (text after the last <code>:</code>) is 3333, 4444 or 14444. Return alerts in first-seen order, each alert string at most once.</p>`,
    ex: `<p><code>["api|sh|spawn|", "api|sh|spawn|", "api|curl|connect|1.2.3.4:3333"]</code> &rarr; <span class="c-r">["shell:api","miner_port:api"]</span>. The duplicate shell alert is collapsed.</p>`,
    bw: `<p>Grep container logs for "bash". Attackers do not log their own commands, and the app logs nothing about syscalls. Detection must watch the kernel, which is what Falco's eBPF probe does.</p>`,
    q: ['Why de-duplicate alerts?', ['Repeated identical alerts flood on-call and hide new signals', 'Falco can only store one alert', 'Duplicates mean a false positive', 'For compliance'], 0, 'Alert fatigue is the enemy of detection; Falcosidekick and SIEMs group repeats.'],
    h: ['Hint 1: split each event with split("|", 3) so an empty target still parses.', 'Hint 2: use rsplit(":", 1) on the target to get the port, which also works for IPv6 like [::1]:14444.', 'Hint 3: keep a set of seen alerts and a list for order.'],
    a: `<p>Parse, test four rule conditions, emit alerts once in order. Real Falco rules are the same idea expressed in its condition language over hundreds of fields, with lists and macros for maintenance and exceptions for known-good behaviour.</p>`,
    code: PY(`SHELLS = {"bash", "sh", "zsh", "ash"}
MINER_PORTS = {"3333", "4444", "14444"}

def falco_alerts(events):
    seen, out = set(), []
    for e in events:
        pod, proc, action, target = e.split("|", 3)
        alert = None
        if action == "spawn" and proc in SHELLS:
            alert = "shell:" + pod
        elif action == "open_read" and target == "/etc/shadow":
            alert = "sensitive_read:" + pod
        elif action == "open_write" and target.startswith("/etc/"):
            alert = "etc_write:" + pod
        elif action == "connect" and target.rsplit(":", 1)[-1] in MINER_PORTS:
            alert = "miner_port:" + pod
        if alert and alert not in seen:
            seen.add(alert)
            out.append(alert)
    return out`),
    cx: `<p>O(E) time for E events, O(A) memory for distinct alerts.</p>`,
    f: ['Add an exception list: the backup Pod may write /etc/cron.d. Where should exceptions live?', 'Wire the miner alert to an automatic quarantine. What could go wrong?'],
    tests: { sig: 'string[] -> string[]', fn: 'falcoAlerts', cases: [
      [[[]], []], [[['web|bash|spawn|']], ['shell:web']], [[['web|python|spawn|']], []],
      [[['web|cat|open_read|/etc/shadow', 'web|cat|open_read|/etc/hosts']], ['sensitive_read:web']],
      [[['api|sh|spawn|', 'api|sh|spawn|', 'api|curl|connect|1.2.3.4:3333']], ['shell:api', 'miner_port:api']],
      [[['db|vi|open_write|/etc/passwd', 'db|app|open_write|/var/lib/x', 'db|app|connect|10.0.0.5:5432']], ['etc_write:db']],
      [[['a|zsh|spawn|', 'b|zsh|spawn|']], ['shell:a', 'shell:b']],
      [[['w|x|connect|[::1]:14444']], ['miner_port:w']]
    ] }
  }));

  practice.push(P({
    t: 'Egress ipBlock evaluator with except ranges',
    l: 'Hard', tags: ['NetworkPolicy', 'egress', 'CIDR', 'python'], co: ['AWS', 'Cloudflare'],
    s: PYC + `<p>A Pod is isolated for egress. Its rules are <code>"cidr|except1,except2|port"</code> (except list may be empty; port <code>*</code> = any). Write <code>egress_allowed(rules, ip, port)</code>: true if some rule's CIDR contains the IP, none of that rule's except ranges contain it, and the port matches. No rules means nothing is allowed. Use the standard <code>ipaddress</code> module.</p>`,
    ex: `<p>Rules <code>["0.0.0.0/0|169.254.169.254/32,10.0.0.0/8|443", "10.20.0.0/16||5432"]</code>: <code>93.184.216.34:443</code> <span class="c-g">true</span>; <code>169.254.169.254:443</code> <span class="c-r">false</span> (metadata endpoint excluded); <code>10.20.3.4:5432</code> <span class="c-g">true</span> via the second rule; <code>10.20.3.4:443</code> <span class="c-r">false</span>.</p>`,
    bw: `<p>Compare IP strings with startswith ("10.2" matches 10.200.x too) or forget that an except applies only within its own rule. Both open or close the wrong paths.</p>`,
    q: ['Rule A excepts 10.0.0.0/8; rule B allows 10.20.0.0/16 on 5432. Is 10.20.3.4:5432 allowed?', ['Yes: rules are OR-ed; B allows it even though A excludes it', 'No: an except in any rule blocks everywhere', 'Only if A is listed first', 'Only for UDP'], 0, 'except narrows only the ipBlock it belongs to; another rule can still allow the address.'],
    h: ['Hint 1: ipaddress.ip_address(ip) in ipaddress.ip_network(cidr) does the containment test.', 'Hint 2: split each rule into three fields; an empty except field means no exceptions.', 'Hint 3: return True on the first rule that matches all three conditions; False otherwise.'],
    a: `<p>Parse each rule, test containment with <code>ipaddress</code>, apply the rule's own excepts and the port. The model shows why metadata-endpoint blocking is written as an except inside the broad internet rule.</p>`,
    code: PY(`import ipaddress

def egress_allowed(rules, ip, port):
    addr = ipaddress.ip_address(ip)
    for rule in rules:
        cidr, excepts, ports = rule.split("|")
        if addr not in ipaddress.ip_network(cidr):
            continue
        if excepts and any(addr in ipaddress.ip_network(x) for x in excepts.split(",")):
            continue                              # excluded by this rule only
        if ports == "*" or str(port) in ports.split(","):
            return True
    return False`),
    cx: `<p>O(R × X) for R rules with X except ranges each.</p>`,
    f: ['Why are ipBlocks unreliable for Pod-to-Pod traffic inside the cluster?', 'How would you allow a SaaS API whose IPs change? (FQDN policies or an egress gateway.)'],
    tests: (function () {
      var R = ['0.0.0.0/0|169.254.169.254/32,10.0.0.0/8|443', '10.20.0.0/16||5432'];
      return { sig: 'string[] string int -> bool', fn: 'egressAllowed', cases: [
        [[R, '93.184.216.34', 443], true], [[R, '169.254.169.254', 443], false], [[R, '169.254.169.254', 80], false],
        [[R, '10.20.3.4', 5432], true], [[R, '10.20.3.4', 443], false], [[R, '10.30.0.1', 5432], false],
        [[[], '1.1.1.1', 53], false], [[['1.1.1.0/24||*'], '1.1.1.255', 9999], true], [[['1.1.1.0/24||*'], '1.1.2.0', 9999], false]
      ] };
    })()
  }));

  practice.push(P({
    t: 'Migrate a production mesh from sidecars to ambient without downtime',
    l: 'Hard', tags: ['Istio', 'ambient', 'migration', 'design'], co: ['Solo.io', 'Salesforce'],
    s: `<p>A cluster runs Istio 1.2x in sidecar mode: 60 namespaces, STRICT mTLS, about 200 AuthorizationPolicies (a third use HTTP paths or methods), VirtualServices with retries and canaries. Plan the move to ambient mode namespace by namespace with no customer-visible downtime and no gap in policy enforcement.</p>`,
    ex: `<p>A good plan ends with: every namespace labelled <code>istio.io/dataplane-mode=ambient</code>, waypoints only where L7 features are used, L7 policies re-targeted to waypoints, sidecars removed, and dashboards showing unchanged success rates throughout.</p>`,
    bw: `<p>Flip all namespaces to ambient on one night and remove injection labels. L7 AuthorizationPolicies silently lose their enforcer (no waypoint), retries and canary weights stop applying, and the rollback is a cluster-wide restart.</p>`,
    q: ['A namespace\'s AuthorizationPolicy checks HTTP paths. What must exist before moving it to ambient?', ['A waypoint for the target service or namespace, with the policy targeting it', 'Nothing, ztunnel handles paths', 'A NetworkPolicy', 'An Ingress'], 0, 'ztunnel enforces L4 only; HTTP attributes need a waypoint.'],
    h: ['Hint 1: inventory first: which namespaces use L7 features (HTTP policy, retries, splits)?', 'Hint 2: sidecar and ambient workloads interoperate in one mesh, so you can migrate one namespace at a time.', 'Hint 3: deploy and verify waypoints and policy targetRefs before removing sidecars; keep a rollback per namespace.'],
    a: `<p><b>1. Prepare:</b> upgrade to a release with ambient GA, install with the ambient profile alongside existing sidecars (istio-cni and ztunnel DaemonSets), confirm <code>istioctl analyze</code> is clean. <b>2. Inventory:</b> per namespace, list AuthorizationPolicies with L7 fields, VirtualServices with retries, timeouts, splits or fault injection, and EnvoyFilters (these have no ambient equivalent and need redesign). <b>3. Low-risk first:</b> pick namespaces with L4-only needs; label <code>istio.io/dataplane-mode=ambient</code>, remove <code>istio-injection</code>, rolling-restart: Pods come up without sidecars and ztunnel takes over mTLS. Watch success rate and p99 per edge. <b>4. L7 namespaces:</b> deploy waypoints (<code>istioctl waypoint apply --enroll-namespace</code> or per service), convert policies to use <code>targetRefs</code> to the Service or waypoint, verify that the waypoint enforces (test denied paths), then switch the namespace and restart. <b>5. Verify continuously:</b> STRICT mTLS metrics (<code>connection_security_policy</code>), denied-request counts, canary weights. <b>6. Rollback</b> per namespace: re-add the injection label and restart. <b>7. Clean up</b> sidecar-only config and update runbooks (debug with <code>istioctl ztunnel-config</code> instead of proxy-config on Pods).</p>`,
    code: SH(`# Per-namespace switch (after waypoints and policies are ready)
NS=payments
istioctl waypoint apply -n "$NS" --enroll-namespace --wait
kubectl label namespace "$NS" istio-injection- istio.io/dataplane-mode=ambient --overwrite
kubectl rollout restart deployment -n "$NS"
kubectl rollout status deployment -n "$NS" --timeout=10m
istioctl ztunnel-config workloads | grep "$NS"       # captured by ztunnel, protocol HBONE
istioctl analyze -n "$NS"
# Rollback: kubectl label namespace "$NS" istio.io/dataplane-mode- istio-injection=enabled && kubectl rollout restart deployment -n "$NS"`),
    cx: `<p>Linear in namespaces; each switch is one rolling restart. Budget days to weeks for L7-heavy namespaces.</p>`,
    f: ['What happens to EnvoyFilter customisations in ambient?', 'How would you size and scale waypoints for a namespace with 5k RPS?']
  }));

  practice.push(P({
    t: 'Incident: a compromised Pod in production',
    l: 'Hard', tags: ['incident response', 'Falco', 'RBAC', 'NetworkPolicy', 'design'], co: ['Datadog', 'Stripe', 'Wiz'],
    s: `<p>Falco reports a shell and an outbound connection to port 3333 from <code>prod-web/web-7c9f</code>. The Pod's service account can list Secrets in its namespace. Walk through the first hour: contain, preserve evidence, scope the blast radius, eradicate, and the controls you will add so this class of incident cannot recur.</p>`,
    ex: `<p>Within 10 minutes the Pod is isolated but preserved, the service account's token is useless, Secrets readable by it are being rotated, and the team knows whether the attacker used the Kubernetes API.</p>`,
    bw: `<p><code>kubectl delete pod</code> immediately. The Deployment recreates the same vulnerable Pod, the evidence (processes, files, network connections) is gone, and nobody checks whether the attacker already read Secrets with the service account token.</p>`,
    q: ['Why isolate rather than delete the Pod first?', ['Deleting destroys evidence and the controller recreates the same vulnerable Pod', 'Deleting is not allowed in prod', 'Isolation is faster to type', 'Falco needs the Pod alive'], 0, 'Contain first (network isolation, remove from Service by changing labels), capture evidence, then remove.'],
    h: ['Hint 1: contain with a pre-made quarantine NetworkPolicy and by relabelling the Pod so the Service and ReplicaSet drop it.', 'Hint 2: the service account token is a credential: check the API audit log for what it did, then rotate everything it could read.', 'Hint 3: prevention spans admission (restricted PSS, signed images), RBAC (no list secrets), egress policy and runtime response automation.'],
    a: `<p><b>Contain (minutes 0-10):</b> label the Pod <code>quarantine=true</code> (a standing NetworkPolicy denies all ingress and egress for that label) and change its <code>app</code> label so the ReplicaSet creates a clean replacement and the Service stops routing to it; cordon the node if host compromise is possible. <b>Preserve:</b> <code>kubectl debug</code> with a forensic image or a runtime checkpoint (<code>kubectl</code> checkpoint API, beta), copy <code>/proc</code> data, Falco events, container filesystem diff, mesh access logs. <b>Scope:</b> query the API audit log for the SA's user (<code>system:serviceaccount:prod-web:web</code>): which Secrets were listed or read, any exec or create calls; check mesh telemetry for calls to other services and egress. Projected tokens expire within an hour and are invalidated once the Pod is deleted, but anything read is burned: rotate every Secret the SA could list, and the credentials inside them (DB users, API keys). <b>Eradicate:</b> find the entry point (vulnerable dependency, exposed endpoint), patch, rebuild, re-sign, redeploy; delete the quarantined Pod after evidence capture. <b>Prevent:</b> remove list/get secrets from the SA (mount only what it needs as files, or use External Secrets with a narrow store), <code>automountServiceAccountToken: false</code> where the API is not needed, restricted PSS with read-only root FS, default-deny egress, signed-image admission, Falco response automation, and a postmortem with the timeline.</p>`,
    code: Y(`# Standing quarantine policy: any Pod labelled quarantine=true is cut off
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: quarantine
  namespace: prod-web
spec:
  podSelector:
    matchLabels: {quarantine: "true"}
  policyTypes: ["Ingress", "Egress"]
# no ingress or egress rules: nothing in, nothing out
# Apply in an incident:
#   kubectl label pod web-7c9f -n prod-web quarantine=true app=web-quarantined --overwrite`, 'quarantine.yaml'),
    cx: `<p>Containment in minutes if the quarantine policy and runbook exist beforehand; hours if they must be invented during the incident.</p>`,
    f: ['How would you automate the quarantine label from Falcosidekick safely?', 'Which audit-log fields prove whether Secrets were read?']
  }));

  // ───────────────────────── Quiz ─────────────────────────
  quiz.push({ q: `In Istio, which component is on the request path of every service-to-service call?`, options: [`istiod`, `The data-plane proxies (Envoy sidecars, or ztunnel and waypoints in ambient)`, `The Kubernetes API server`, `CoreDNS`], answer: 1, explain: `istiod is the control plane: it pushes config and certificates but never handles requests. The proxies carry every request.` });
  quiz.push({ q: `In Istio ambient mode, which proxy enforces an AuthorizationPolicy that checks HTTP paths?`, options: [`ztunnel on the source node`, `ztunnel on the destination node`, `A waypoint proxy`, `kube-proxy`], answer: 2, explain: `ztunnel works at L4 only (identities, ports). HTTP attributes need an Envoy waypoint, and the policy must target it.` });
  quiz.push({ q: `A VirtualService has retries.attempts: 2, perTryTimeout: 1s and timeout: 2s. Every try hangs. How long does the caller wait at most?`, options: [`1 s`, `2 s`, `3 s`, `6 s`], answer: 1, explain: `Three tries of 1 s would need 3 s, but the overall route timeout of 2 s always wins.` });
  quiz.push({ q: `With outlierDetection consecutive5xxErrors: 5 and baseEjectionTime: 30s, a Pod is ejected for the third time. For how long?`, options: [`30 s`, `60 s`, `90 s`, `Permanently`], answer: 2, explain: `Ejection time = baseEjectionTime × number of times ejected = 30 s × 3.` });
  quiz.push({ q: `One AuthorizationPolicy with action ALLOW now selects the payments workload. A caller matches no policy. Result?`, options: [`Allowed, because nothing denied it`, `Denied, because ALLOW policies exist and none matched`, `Allowed only over mTLS`, `Depends on policy creation order`], answer: 1, explain: `Once any ALLOW policy applies to a workload, requests must match one of them; otherwise they are denied.` });
  quiz.push({ q: `What does the SPIFFE ID spiffe://cluster.local/ns/shop/sa/cart identify?`, options: [`A Pod by IP`, `The cart service account in namespace shop, in trust domain cluster.local`, `A node`, `The Service named cart`], answer: 1, explain: `Kubernetes mesh identities are bound to service accounts, not Pods, IPs or Services.` });
  quiz.push({ q: `A RoleBinding in namespace shop references the ClusterRole "view". Where can the subject view resources?`, options: [`Everywhere`, `Only in shop`, `Only cluster-scoped resources`, `Nowhere, RoleBindings cannot reference ClusterRoles`], answer: 1, explain: `A RoleBinding always grants within its own namespace, even when the role it references is a ClusterRole.` });
  quiz.push({ q: `Which permission effectively lets a user act with any service account's rights in a namespace?`, options: [`get configmaps`, `create pods`, `list services`, `get events`], answer: 1, explain: `A created Pod can name any service account in the namespace and use its mounted token.` });
  quiz.push({ q: `Which Pod setting is allowed by baseline but rejected by the restricted Pod Security Standard?`, options: [`privileged: true`, `hostNetwork: true`, `Not setting runAsNonRoot (running with defaults)`, `A hostPath volume`], answer: 2, explain: `Baseline only blocks dangerous settings; restricted also requires explicit hardening: runAsNonRoot, no privilege escalation, drop ALL, seccomp.` });
  quiz.push({ q: `Two items under one "from" list: "- namespaceSelector: {team: obs}" and "- podSelector: {app: prom}". What do they allow?`, options: [`Pods labelled app=prom in team=obs namespaces only`, `Any Pod in team=obs namespaces, OR app=prom Pods in the policy's own namespace`, `Nothing`, `All Pods everywhere`], answer: 1, explain: `Separate list items are OR-ed. Putting both selectors in the same item (one dash) would mean AND.` });
  quiz.push({ q: `After applying a default-deny NetworkPolicy for Ingress and Egress, every app logs name-resolution errors. What is missing?`, options: [`An egress allow to kube-dns on port 53 UDP and TCP`, `A ClusterRoleBinding for CoreDNS`, `mTLS STRICT`, `A Service for each Pod`], answer: 0, explain: `Default deny blocks DNS egress too; allow it explicitly to the kube-dns Pods in kube-system.` });
  quiz.push({ q: `Kubernetes Secrets in etcd with no EncryptionConfiguration are protected by...`, options: [`AES-256 by default`, `Only base64 encoding, which is not encryption`, `The CNI`, `Sigstore`], answer: 1, explain: `Without an encryption provider (ideally KMS v2), Secrets are stored base64-encoded, readable by anyone with etcd or backup access.` });
  quiz.push({ q: `A Kyverno verifyImages rule checks keyless signatures. Which check gives real assurance that your pipeline built the image?`, options: [`The signature exists in Rekor`, `The certificate's OIDC issuer AND subject match your release workflow identity`, `The image tag is semver`, `The image is under 200 MB`], answer: 1, explain: `Anyone can sign any image keylessly with their own identity. Trust comes from pinning the issuer and the exact workflow subject.` });
  quiz.push({ q: `Which tool detects a shell spawned inside a running container?`, options: [`Gatekeeper`, `Falco`, `cosign`, `Kiali`], answer: 1, explain: `Falco watches syscalls at runtime. Admission tools only see objects when they are created or updated.` });

  // ───────────────────────── Interview ─────────────────────────
  interview.push({ level: 'B', q: `What is a service mesh, and what are the data plane and the control plane?`, a: `<p>A service mesh moves service-to-service networking concerns (mTLS, identity, retries, timeouts, traffic splitting, metrics) out of application code into proxies run by the platform. The <b>data plane</b> is the set of proxies that carry every request: Envoy sidecars in Istio's classic mode, ztunnel plus optional waypoint proxies in ambient mode, linkerd2-proxy in Linkerd. The <b>control plane</b> (istiod, Linkerd's destination and identity services) watches Kubernetes, translates your resources into proxy configuration (xDS for Envoy), and acts as the certificate authority. It is not on the request path, so if it goes down, traffic keeps flowing with the last config until certificates expire.</p>`, followUps: [`What happens to new Pods if istiod is down?`, `When would you not use a mesh at all?`] });
  interview.push({ level: 'I', q: `Compare sidecar and ambient mode in Istio. When would you choose each?`, a: `<p><b>Sidecar</b>: an Envoy in every Pod, injected by a webhook; full L7 for every workload, mature, but one proxy per Pod (CPU and memory), Pod restarts to inject or upgrade, and lifecycle issues with Jobs (mostly fixed by native sidecars). <b>Ambient</b>: a per-node ztunnel (Rust, L4, mTLS via HBONE) captures traffic with no Pod changes; L7 features come from waypoint proxies deployed per namespace or service only where needed. Ambient cuts resource use dramatically and decouples upgrades from apps. I choose ambient for new meshes and large clusters where most services need mTLS and L4 policy; sidecars where I depend on per-Pod Envoy features such as EnvoyFilters, or tooling that assumes sidecars. Mixed meshes interoperate, so migration can be per namespace.</p>`, followUps: [`What is HBONE?`, `How do you decide where waypoints go?`] });
  interview.push({ level: 'I', q: `How do you implement a canary release with a mesh, and what can go wrong?`, a: `<p>Deploy v2 alongside v1 with a version label, define subsets in a DestinationRule (or separate Services for Gateway API), and route with weights in a VirtualService or HTTPRoute: 95/5, then 75/25, 50/50, 100. Add a header match first for internal testers. Automate the steps with Flagger or Argo Rollouts, which read success rate and latency from mesh metrics and roll back automatically. Pitfalls: sticky sessions or connection reuse skewing the split (HTTP/2 multiplexing, gRPC long-lived connections), too little traffic for the metrics to be meaningful, database schema changes that v1 cannot handle, and the catch-all route placed before the header match so testers never reach v2.</p>`, followUps: [`How would you split traffic for a gRPC service?`, `How do you canary a change that includes a DB migration?`] });
  interview.push({ level: 'A', q: `Explain retries, timeouts and circuit breaking in a mesh, and how to avoid a retry storm.`, a: `<p>Timeouts bound how long a caller waits; Istio has no default HTTP timeout, so set one per route. Retries hide transient failures; Istio retries twice by default on connect failures and some 503s, with a per-try timeout. Circuit breaking has two parts: <code>connectionPool</code> limits concurrent connections and pending requests so overload fails fast (503 UO), and <code>outlierDetection</code> ejects individual hosts after consecutive errors, with ejection time growing per offence and capped by <code>maxEjectionPercent</code>. To avoid storms: retry at one layer only (remove library retries), only idempotent operations, per-try timeout × tries ≤ overall timeout ≤ the caller's timeout, retry budgets (Linkerd) or low attempts, and jittered backoff. Retries multiply across layers: 3 layers × 3 retries means 64× load on the bottom.</p>`, followUps: [`What does Envoy's panic threshold do?`, `Which status codes are safe to retry for a POST?`] });
  interview.push({ level: 'I', q: `How does mTLS work in a mesh, and what is SPIFFE?`, a: `<p>Each workload gets an X.509 certificate whose URI SAN is a SPIFFE ID such as <code>spiffe://cluster.local/ns/shop/sa/cart</code>, bound to its Kubernetes service account. In Istio the agent (or ztunnel in ambient) creates a key, sends a CSR authenticated with the Pod's projected service-account token, and istiod signs it; certificates last 24 hours by default and rotate automatically. On every connection both sides present certificates and verify them against the trust bundle, so the server knows exactly which workload is calling. PeerAuthentication controls PERMISSIVE vs STRICT; AuthorizationPolicy then uses the principal to allow or deny. SPIFFE is the CNCF standard for these identities; SPIRE is its reference implementation and can extend the same identities to VMs and other clusters.</p>`, followUps: [`Why not use IP-based rules instead?`, `How would you migrate from PERMISSIVE to STRICT safely?`] });
  interview.push({ level: 'A', q: `Walk through Istio AuthorizationPolicy evaluation and design default-deny for a namespace.`, a: `<p>Order: CUSTOM policies (external authorizer) first, then DENY (any match denies), then ALLOW: if no ALLOW policy selects the workload, allow; otherwise the request must match at least one ALLOW. Default deny: apply an ALLOW policy with no rules (matches nothing) to the namespace, then explicit ALLOW policies per workload listing source principals and, where needed, methods and paths. Guard rails that must never be overridden go in DENY policies (for example, nothing from the dev namespace). Roll out by inventorying edges from telemetry first, test in staging, watch 403 counts, and remember that in ambient mode L7 rules need a waypoint while ztunnel enforces L4. mTLS STRICT is a prerequisite, otherwise principals are empty for plain-text callers.</p>`, followUps: [`What happens to a plain-text client hitting a principal-based ALLOW policy?`, `How do you use the AUDIT action?`] });
  interview.push({ level: 'I', q: `Explain Kubernetes RBAC: Role, ClusterRole, RoleBinding, ClusterRoleBinding. How do you give least privilege to a CI deployer?`, a: `<p>Roles hold rules (apiGroups, resources, verbs) in one namespace; ClusterRoles hold rules that can be reused anywhere and cover cluster-scoped resources. RoleBindings grant a Role or ClusterRole to subjects within one namespace; ClusterRoleBindings grant a ClusterRole cluster-wide. RBAC is allow-only and additive. For a CI deployer: a dedicated service account per environment and namespace, a Role allowing get/list/watch/patch/update on deployments (and whatever objects it manages) but not create on pods, exec, or secrets read; a RoleBinding in that namespace; short-lived tokens via <code>kubectl create token</code> or OIDC federation from the CI system rather than a static Secret; and verification with <code>kubectl auth can-i --list --as=system:serviceaccount:ns:ci-deployer</code>.</p>`, followUps: [`Why is create pods a privilege escalation path?`, `What do escalate, bind and impersonate do?`] });
  interview.push({ level: 'I', q: `What are Pod Security Standards and how do you roll out "restricted" across a cluster?`, a: `<p>PSS define three levels: privileged (no restrictions), baseline (blocks known escalations: privileged containers, host namespaces, hostPath, dangerous capabilities, unconfined seccomp) and restricted (baseline plus required hardening: runAsNonRoot, allowPrivilegeEscalation false, drop ALL capabilities, seccomp RuntimeDefault, limited volume types). Pod Security Admission enforces them with namespace labels for enforce, audit and warn. Rollout: set warn and audit to restricted everywhere, use server-side dry-run label changes to list violations, give teams time and examples to fix securityContexts, then enforce namespace by namespace; keep privileged only for system namespaces (CNI, Falco, storage), and add a policy engine for rules PSS does not cover.</p>`, followUps: [`Why pin enforce-version?`, `How do ephemeral debug containers interact with PSA?`] });
  interview.push({ level: 'A', q: `Compare ValidatingAdmissionPolicy, OPA Gatekeeper and Kyverno. Which would you choose?`, a: `<p>ValidatingAdmissionPolicy (GA in 1.30) runs CEL inside the API server: no webhook to operate, fast, safe failure behaviour, but validation only and limited context. Gatekeeper uses Rego ConstraintTemplates: very expressive, can reference replicated cluster data, strong audit and testing (gator), but Rego has a learning curve and it is a webhook to keep highly available. Kyverno writes policies in YAML: validate, mutate, generate (for example a default-deny NetworkPolicy in every new namespace), verify image signatures, with PolicyReports; complex logic becomes awkward. My default: PSA for pod security, VAP for simple validations, and Kyverno for mutation, generation and image verification (or Gatekeeper if the organisation already uses OPA/Rego elsewhere). Whatever the engine: policies in Git, tests with fixtures, audit mode first, and HA webhooks with namespace exclusions.</p>`, followUps: [`How do you stop a policy webhook outage from blocking all deployments?`, `How do you test policies in CI?`] });
  interview.push({ level: 'I', q: `How do NetworkPolicies work, and what are the common mistakes?`, a: `<p>A NetworkPolicy selects Pods in its namespace and lists allowed ingress and/or egress peers (podSelector, namespaceSelector, ipBlock) and ports. A Pod selected by any policy for a direction becomes isolated for it; allowed traffic is the union of all policies; replies are allowed automatically. The CNI enforces them, so a CNI without support ignores them silently. Common mistakes: no default-deny so new Pods are open; default-deny egress without a DNS rule; the AND/OR confusion between one list item with two selectors versus two items; assuming a bare podSelector matches other namespaces; forgetting the egress side when both directions are denied; using ipBlock for in-cluster Pods; and never testing. I add default-deny plus DNS per namespace (generated by Kyverno), explicit flows, and a probe test matrix in CI.</p>`, followUps: [`What does the core API not support that Cilium or Calico add?`, `How do NetworkPolicy and mesh AuthorizationPolicy complement each other?`] });
  interview.push({ level: 'A', q: `How would you make sure only trusted images run in a cluster?`, a: `<p>Layers: build in CI from a pinned base, scan, generate an SBOM and SLSA provenance, and sign the digest keylessly with cosign (Fulcio certificate bound to the workflow identity, recorded in Rekor). In the cluster: an admission policy (Kyverno verifyImages, Sigstore policy-controller, or Ratify with Gatekeeper) that allows only our registry, requires signatures whose issuer and subject match our release workflow on the main branch, optionally requires SBOM and provenance attestations, and rewrites tags to digests so the verified image is what runs. Registry tag immutability, pull-through mirrors for third-party images (scanned and re-signed), and a background report of running images that predate the policy close the gaps. Decide fail-open or fail-closed per namespace and cache verification results.</p>`, followUps: [`Why is checking only the OIDC issuer insufficient?`, `How do you handle third-party images like ingress controllers?`] });
  interview.push({ level: 'E', q: `Design security for a multi-tenant Kubernetes platform hosting 50 teams. Cover identity, network, workload hardening, supply chain, runtime and secrets.`, a: `<p><b>Tenancy:</b> namespace per team and environment, created by a platform pipeline with labels, quotas, LimitRanges and generated policies. <b>Identity and RBAC:</b> SSO groups map to namespaced RoleBindings of built-in edit/view; no cluster-admin for humans except break-glass; one service account per workload, tokens not automounted unless needed; cloud access via workload identity. <b>Network:</b> default-deny ingress and egress plus DNS per namespace, explicit flows, egress to the internet through an egress gateway, metadata endpoint blocked; a mesh (ambient for cost) with STRICT mTLS and default-deny AuthorizationPolicies by SPIFFE identity. <b>Workloads:</b> PSA restricted enforced, VAP/Kyverno for limits, labels and allowed registries. <b>Supply chain:</b> signed, digest-pinned images with SBOM and provenance verified at admission. <b>Runtime:</b> Falco with automated quarantine labels, API audit logs to the SIEM. <b>Secrets:</b> KMS v2 encryption at rest, External Secrets or CSI from Vault/cloud stores, dynamic credentials where possible, no list on secrets. Everything as code with tests, and per-team dashboards from mesh metrics.</p>`, followUps: [`When is namespace isolation not enough and you need separate clusters or sandboxed runtimes (gVisor, Kata)?`, `How would you give a team self-service without letting them weaken policies?`] });
  interview.push({ level: 'A', q: `How should secrets be managed in Kubernetes, and what is wrong with plain Secrets?`, a: `<p>Plain Secrets are base64, stored in etcd (encrypted only if EncryptionConfiguration is set), readable by anyone with get/list on secrets in the namespace or anyone who can create a Pod that mounts them, and often end up in Git or Helm values. Better: enable encryption at rest with a KMS v2 provider; restrict RBAC (no list/watch on secrets for apps or humans by default); mount secrets as files rather than env vars; keep the source of truth in Vault or a cloud secrets manager and sync with External Secrets Operator or mount with the Secrets Store CSI driver; prefer dynamic, short-lived credentials (Vault database engine) and workload identity for cloud APIs so there is no static key at all; for GitOps, store only encrypted values with Sealed Secrets or SOPS; audit access and rotate on a schedule and after any incident.</p>`, followUps: [`ESO versus CSI driver: what are the trade-offs?`, `How does KMS v2 reduce the cost of encryption at rest?`] });

  // ───────────────────────── Registration ─────────────────────────
  registerModule({
    id: 'devops21',
    title: 'Service Mesh & Kubernetes Security',
    intro: `<p>Kubernetes gets your containers running; this module makes them talk to each other safely and keeps an attacker who gets into one container from taking the rest. The first half is the <b>service mesh</b>: what the data plane and control plane do, sidecar versus Istio's newer <b>ambient</b> mode (per-node ztunnel plus optional waypoints), traffic management in Istio and Linkerd (weighted canaries, retries, timeouts, circuit breaking), <b>mTLS with SPIFFE workload identity</b>, identity-based authorization, and the golden metrics every proxy gives you for free.</p>
      <p>The second half is <b>Kubernetes security</b> in depth: RBAC and service accounts with their real escalation paths, Pod Security Standards, admission control with ValidatingAdmissionPolicy, OPA Gatekeeper and Kyverno, NetworkPolicies and their AND/OR traps, enforcing signed images and SBOMs at admission with Sigstore, runtime detection with Falco, and secrets management with KMS encryption and external secret stores. Each topic includes a small tested model of the real decision logic (an RBAC authorizer, a NetworkPolicy evaluator, a weighted router, an outlier-detection simulator, a Pod Security checker), so you understand the rules, not just the YAML. Everything runs on a free local kind cluster.</p>`,
    goals: [
      'Explain data plane vs control plane and choose between Istio sidecar, Istio ambient (ztunnel + waypoints) and Linkerd for a given cluster',
      'Configure weighted traffic splits, timeouts, retries and circuit breaking (connection pools and outlier detection) in Istio and Gateway API / Linkerd, and avoid retry storms',
      'Enable STRICT mTLS, read SPIFFE identities, and design default-deny AuthorizationPolicies; use mesh golden metrics and traces to debug and to prove encryption',
      'Design least-privilege RBAC and service accounts, spot escalation paths (create pods, secrets list, bind, escalate, impersonate) and use short-lived tokens',
      'Roll out Pod Security Standards and write admission policies with ValidatingAdmissionPolicy (CEL), Gatekeeper (Rego) and Kyverno (validate, mutate, verifyImages)',
      'Write and test NetworkPolicies (default deny, DNS, AND vs OR peers, egress ipBlocks) and combine them with mesh identity policy',
      'Enforce signed, digest-pinned images with SBOM attestations, detect runtime threats with Falco, and manage secrets with KMS v2, External Secrets and the CSI driver'
    ],
    prereqs: `<p><b>Required:</b> <b>Cloud &amp; DevOps 13</b> (Kubernetes Core: Pods, Deployments, Services, Ingress, ConfigMaps and Secrets, namespaces, kubectl on kind) and <b>Cloud &amp; DevOps 16</b> (DevSecOps &amp; Cloud Security: pipeline gates, Vault, cosign signing and SBOM generation, least privilege, zero-trust basics). This module builds on both and does not repeat them: it goes inside the cluster and the mesh. You need Docker, kind, kubectl, Helm, and the free <code>istioctl</code> and <code>linkerd</code> CLIs.</p>`,
    hours: 16,
    langExplain: `<p>Cluster and mesh configuration is <b>YAML</b> (parsed by the checker) and operations are <b>bash</b> with kubectl, istioctl, linkerd, cosign and helm, because that is how this work is done. Gatekeeper's <b>Rego</b> has no checker on this site, so it is shown as text and verified with <code>gator verify</code> / <code>opa test</code>. The tested problems are small <b>Python</b> models of the real decision logic (RBAC, NetworkPolicy, AuthorizationPolicy, Pod Security, weighted routing, outlier detection, admission, Falco rules), written with the standard library so any learner can read them whatever their main language.</p>`,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
