(function () {
  var topics = [], practice = [], quiz = [], interview = [];
  var R = String.raw; // raw template: backslashes in shell code stay exactly as typed
  var LAB_AWS = '<b>Cost risk:</b> multi-Region designs run everything twice. Aurora Global Database, a second NAT gateway, a second load balancer, cross-Region replication and idle standby instances all bill <b>per hour</b> while they exist, and cross-Region data transfer bills per GB. The default for every lab here is a <b>design exercise</b> on paper. The optional AWS steps use a sandbox account with a budget alert, the smallest sizes, one hour of runtime, and a cleanup list in reverse order (records and health checks, then replicas and secondary Regions, then primaries). Account id <code>123456789012</code>, ARNs and zone ids are placeholders; no keys or passwords appear anywhere (roles and Secrets Manager only).';
  var LAB_KIND = '<b>Lab (free, local):</b> runs on a <code>kind</code> cluster with the Istio <code>demo</code> profile. It needs about 4 CPUs and 8 GB RAM free for Docker and no cloud account. Delete everything with <code>kind delete cluster --name mesh</code>. Nothing is hardcoded: the cluster is local and no credentials are used.';
  var DESIGN = '<b>Design exercise:</b> no cloud account is needed. Optional AWS steps (if any) are marked with their cost; account id <code>123456789012</code> and all ARNs are placeholders.';
  var SKIP = { skip: 'architecture design, verified by reading' };
  function SH(code, title) { var s = { lang: 'bash', code: code }; if (title) s.title = title; return s; }   // bash -n checked
  function YM(code, title) { var s = { lang: 'yaml', code: code }; if (title) s.title = title; return s; }   // YAML parsed
  function PY(code, title) { return { lang: 'python', title: title || 'Python (tested)', code: code }; }
  function JS(code, title) { return { lang: 'json', title: title || 'JSON', code: code }; }
  function HC(code, title) { return { lang: 'hcl', check: false, title: title || 'Terraform (HCL)', code: code }; }
  function snip(c) { return typeof c === 'string' ? SH(c) : c; }
  function P(o) {
    var p = {
      title: o.t, level: o.l, tags: o.tags, companies: o.co,
      statement: o.s, constraints: o.c || DESIGN, example: o.ex,
      brute: { why: o.bw },
      mcq: { q: o.q[0], options: o.q[1], answer: o.q[2], explain: o.q[3] },
      hints: o.h,
      solution: { approach: o.a, complexity: o.cx, followUps: o.f },
      tests: o.tests || SKIP
    };
    var cs = o.code ? (Array.isArray(o.code) ? o.code : [o.code]) : [];
    if (cs.length) p.solution.code = snip(cs[0]);
    var al = cs.slice(1).concat(o.alt || []);
    if (al.length) p.solution.alt = al.map(snip);
    if (o.bc) p.brute.code = snip(o.bc);
    if (o.lang) p.lang = o.lang;
    return p;
  }
  function box(id, label, x, y, w) { return { id: id, label: label, x: x, y: y, shape: 'box', w: w || 18 }; }
  function one1(k, v) { var o = {}; o[k] = v; return o; }
  function pad4(f, tip) { while (f.length < 4) f.push({ narr: tip, parts: f[f.length - 1].parts }); return f; }
  function nums(s, what, cap) {
    var v = String(s || '').split(/[\s,]+/).filter(Boolean).map(Number);
    if (!v.length || v.some(isNaN)) throw new Error('Type ' + what);
    if (v.length > (cap || 12)) throw new Error('Use at most ' + (cap || 12) + ' numbers');
    return v;
  }

  // ── Small models shared by visualizers (the Python problem answers are written separately and tested) ──
  // Calls that reach the failing service at the bottom of a chain when every caller retries.
  function amplification(hops, retries) { return Math.pow(retries + 1, hops); }
  // Largest-remainder split of n requests by integer weights.
  function split(weights, n) {
    var total = weights.reduce(function (a, b) { return a + b; }, 0);
    var out = weights.map(function (w) { return Math.floor(w * n / total); });
    var used = out.reduce(function (a, b) { return a + b; }, 0);
    var order = weights.map(function (w, i) { return { i: i, f: (w * n) % total }; });
    order.sort(function (a, b) { return b.f - a.f || a.i - b.i; });
    for (var k = 0; used < n; k++, used++) out[order[k].i]++;
    return out;
  }
  var TIERS = [
    { name: 'backup-restore', rto: 480, rpo: 3600, cost: 1 },
    { name: 'pilot-light', rto: 60, rpo: 300, cost: 3 },
    { name: 'warm-standby', rto: 10, rpo: 60, cost: 8 },
    { name: 'multi-site', rto: 1, rpo: 1, cost: 16 }
  ];
  function pickTier(rto, rpo) {
    for (var i = 0; i < TIERS.length; i++) if (TIERS[i].rto <= rto && TIERS[i].rpo <= rpo) return TIERS[i].name;
    return 'none';
  }
  // Circuit breaker: consecutive failures open it; it rejects `cool` steps, then half-open lets one probe through.
  function breaker(outs, k, cool) {
    var st = 'closed', fails = 0, left = 0, rejected = 0, log = [];
    outs.forEach(function (o) {
      if (st === 'open') { rejected++; left--; log.push([o, 'open', 'rejected']); if (left === 0) st = 'half-open'; return; }
      if (st === 'half-open') {
        if (o === 1) { st = 'closed'; fails = 0; log.push([o, 'half-open', 'probe ok, close']); }
        else { st = 'open'; left = cool; log.push([o, 'half-open', 'probe failed, reopen']); }
        return;
      }
      if (o === 1) { fails = 0; log.push([o, 'closed', 'ok']); }
      else { fails++; log.push([o, 'closed', 'fail ' + fails]); if (fails >= k) { st = 'open'; left = cool; } }
    });
    return { rejected: rejected, log: log, state: st };
  }

  // ───────────────────────── Topic 1: microservices on the cloud ─────────────────────────
  topics.push({
    title: 'Microservices on the Cloud: Boundaries, the Distributed Monolith, Sync vs Async and Safe Retries',
    analogy: `<p>A big restaurant has one kitchen. A <b>food court</b> has twenty stalls, each with its own cook, fridge and cash till. The court can grow one stall at a time, and one stall catching fire does not close the others. But it only works if each stall can sell a meal <em>on its own</em>. Now imagine a court where the burger stall cannot serve a burger until it phones the bun stall, which phones the sauce stall, which phones the till for permission, and everybody shares one fridge. You have all the cost of twenty stalls and none of the freedom. That is a <b>distributed monolith</b>: one big program cut into pieces that still must all work at the same time.</p>`,
    explain: `<p>🟢 <b>What you already know.</b> <b>BE 10</b> taught decomposition, gateways, saga and outbox. <b>HLD 10</b> taught CAP and consistency. This module asks the cloud question: <em>what changes when twenty services run in several zones and Regions, and how do you keep them from taking each other down?</em></p>
      <p>🟢 <b>Good service boundaries.</b> A boundary is right when a change usually touches <b>one</b> service and one team. Draw lines around a <b>business capability</b> (billing, catalogue, shipping), not around a technical layer (the "database service", the "validation service"). Four tests:</p>
      ${H.table(['Test', 'Healthy', 'Distributed-monolith smell'], [
        ['<b>Data</b>', 'each service owns its tables; others use its API or events', 'many services read and write the same database or schema'],
        ['<b>Deploy</b>', 'ship service A on a Tuesday without touching B', '"release train": five services must go out together, in order'],
        ['<b>Call graph</b>', 'a request touches 1-3 services', 'one user click fans out into 15 synchronous calls, several levels deep'],
        ['<b>Failure</b>', 'if Recommendations is down, checkout still works (a fallback is shown)', 'if any service is down, everything is down']
      ])}
      <p>🟢 <b>Sync or async?</b> A <b>synchronous</b> call (HTTP or gRPC) is a phone call: the caller waits, so both must be alive now. An <b>asynchronous</b> message (SQS, SNS, EventBridge, Kafka) is a letter: the sender drops it and moves on.</p>
      ${H.table(['', 'Synchronous (REST / gRPC)', 'Asynchronous (queue / event)'], [
        ['Coupling in time', 'both sides must be up together', 'receiver can be down; the queue holds the work'],
        ['Latency seen by user', 'sum of the whole chain', 'only the first hop; the rest happens later'],
        ['Availability', 'multiplies down: 99.9% x 99.9% x 99.9% = 99.7%', 'not multiplied for the user-facing path'],
        ['Use when', 'the caller needs the answer now (price lookup, auth check, read a profile)', 'work can finish later (send email, update search index, charge after order, analytics)'],
        ['Hard parts', 'timeouts, retries, circuit breakers, cascading failure', 'duplicates (idempotent consumers), ordering, eventual consistency, DLQs']
      ])}
      <p>🔵 <b>The cloud building blocks.</b> Containers run on <b>EKS</b> or <b>ECS/Fargate</b> (Azure AKS, GCP GKE/Cloud Run). An <b>ALB or API Gateway</b> is the front door. Internal discovery is Kubernetes DNS (<code>orders.shop.svc.cluster.local</code>) or Cloud Map. Messaging is SQS/SNS/EventBridge. Each service gets its own database (or its own schema with its own credentials) and its own IAM role.</p>
      <p>🔵 <b>Failure is normal; plan each hop.</b> Every outgoing call needs four settings, chosen on purpose:</p>
      <ul><li><b>Timeout</b>: shorter than the caller's own deadline. A call with no timeout waits forever and holds a thread.</li>
      <li><b>Retry</b> only for <b>idempotent</b> calls (safe to repeat) and only on errors that may succeed next time (connection reset, 503), with <b>exponential backoff plus jitter</b> (random delay).</li>
      <li><b>Retry budget</b>: retries may add at most about 10% extra load (for example, retry only if retries so far are less than 10% of requests). This stops a retry storm.</li>
      <li><b>Circuit breaker</b>: after N failures, stop calling for a few seconds and fail fast or serve a fallback; then let one probe through.</li></ul>
      <p>🔵 <b>The retry storm, in numbers.</b> If each of <code>h</code> layers retries <code>r</code> times, one user request becomes up to <code>(r+1)<sup>h</sup></code> calls on the failing service at the bottom. With 3 layers and 2 retries each that is 3<sup>3</sup> = <b>27</b> calls per click, exactly when the service is weakest. Retry at <b>one</b> layer (usually the edge or the mesh), not at every layer.</p>`,
    clues: ['"one service is slow and the whole site is down" → <b>cascading failure</b>: timeouts, bulkheads, circuit breaker, retry budget', '"we must deploy five services together" or "all services share one database" → <b>distributed monolith</b>', '"checkout must not fail if email is down" → move email to an <b>async</b> queue/event', '"the outage got worse when clients retried" → <b>retry storm</b>: backoff + jitter + budget, retry at one layer', '"each call has 99.9% availability and there are 8 in a chain" → availability <b>multiplies</b>: 0.999<sup>8</sup> ≈ 99.2%', '"user needs the answer immediately" → sync; "can finish later" → async', '"partial failure" or "degrade gracefully" → fallbacks, cached data, feature flags per dependency'],
    code: [PY(R`import random

# A tiny retry helper: exponential backoff + full jitter + a retry budget.
# Standard library only; the "service" is simulated so the output is stable.

class RetryBudget:
    """Allow retries only while they stay under ratio x total requests (plus a small floor)."""
    def __init__(self, ratio=0.1, floor=3):
        self.ratio, self.floor = ratio, floor
        self.requests = 0
        self.retries = 0

    def record_request(self):
        self.requests += 1

    def can_retry(self):
        return self.retries < self.floor + self.ratio * self.requests

    def spend(self):
        self.retries += 1


def backoff_ms(attempt, base=100, cap=5000, rng=random):
    """Full jitter: a random wait between 0 and min(cap, base * 2^attempt)."""
    return rng.uniform(0, min(cap, base * (2 ** attempt)))


def call_with_retries(budget, max_retries=3):
    """Every attempt fails (downstream is down). Count attempts actually sent."""
    budget.record_request()
    attempts = 1                                  # the first try is not a retry
    for attempt in range(max_retries):
        if not budget.can_retry():
            break                                 # budget exhausted: fail fast instead of piling on
        budget.spend()
        attempts += 1
    return attempts


if __name__ == "__main__":
    # 1000 client requests, downstream completely down, each allows up to 3 retries
    unlimited = 1000 * (1 + 3)
    budget = RetryBudget(ratio=0.1, floor=3)
    sent = sum(call_with_retries(budget) for _ in range(1000))
    print("calls sent without a budget:", unlimited)
    print("calls sent with a 10% budget:", sent)
    print("extra load factor:", round(sent / 1000, 2), "x instead of", unlimited // 1000, "x")
    rng = random.Random(7)
    waits = [backoff_ms(a, rng=rng) for a in range(4)]
    print("backoff upper bounds (ms):", [min(5000, 100 * 2 ** a) for a in range(4)])
    print("every jittered wait within its bound:", all(w <= min(5000, 100 * 2 ** a) for a, w in enumerate(waits)))`, 'Python: retry budget + jittered backoff (runs)'),
      YM(R`# A well-behaved microservice Deployment: probes, spread over zones, limits, and a PodDisruptionBudget.
apiVersion: apps/v1
kind: Deployment
metadata:
  name: orders
  namespace: shop
  labels: { app: orders }
spec:
  replicas: 3
  selector:
    matchLabels: { app: orders }
  template:
    metadata:
      labels: { app: orders, version: v1 }
    spec:
      topologySpreadConstraints:          # one pod per zone first: an AZ outage loses 1/3, not everything
        - maxSkew: 1
          topologyKey: topology.kubernetes.io/zone
          whenUnsatisfiable: ScheduleAnyway
          labelSelector:
            matchLabels: { app: orders }
      containers:
        - name: orders
          image: 123456789012.dkr.ecr.us-east-1.amazonaws.com/orders:1.4.2
          ports: [{ containerPort: 8080 }]
          env:
            - { name: PAYMENTS_URL, value: "http://payments.shop.svc.cluster.local:8080" }
            - { name: PAYMENTS_TIMEOUT_MS, value: "800" }      # shorter than our own 2 s deadline
          readinessProbe:
            httpGet: { path: /healthz/ready, port: 8080 }      # ready = can serve (DB reachable)
            periodSeconds: 5
          livenessProbe:
            httpGet: { path: /healthz/live, port: 8080 }       # alive = process not stuck; do NOT check dependencies here
            periodSeconds: 10
          resources:
            requests: { cpu: 250m, memory: 256Mi }
            limits: { memory: 512Mi }
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: orders
  namespace: shop
spec:
  minAvailable: 2
  selector:
    matchLabels: { app: orders }`, 'Kubernetes: zone spread, probes, timeout config, PDB')],
    codeTitle: ['Python (runs): retry budget and jittered backoff', 'YAML: a resilient microservice Deployment'],
    viz: [{
      title: 'Retry storm: one click becomes many calls',
      input: '3,2',
      inputLabel: 'hops (layers that retry), retries per layer',
      gen: function (input) {
        var v = nums(input, 'two numbers, e.g. 3,2 (layers, retries)', 2);
        if (v.length !== 2) throw new Error('Type two numbers, e.g. 3,2');
        var h = Math.max(1, Math.min(5, Math.round(v[0]))), r = Math.max(0, Math.min(5, Math.round(v[1])));
        var names = ['Gateway', 'Orders', 'Payments', 'Ledger', 'Bank API'];
        var nodes = [], edges = [], i;
        for (i = 0; i <= h; i++) nodes.push(box('n' + i, i === 0 ? 'User' : names[i - 1], 4 + i * (88 / (h + 1)), 22, 15));
        for (i = 0; i < h; i++) edges.push(['n' + i, 'n' + (i + 1)]);
        function g(narr, hl, tags, ehl) { return { narr: narr, parts: [{ type: 'graph', label: 'Call chain', directed: true, height: 44, nodes: nodes, edges: edges, hl: hl, ehl: ehl || {}, tags: tags || {} }] }; }
        var f = [];
        f.push(g('A chain of <b>' + h + '</b> service layer(s). The last service (<b>' + names[h - 1] + '</b>) is overloaded and answers errors. Every caller is configured to retry <b>' + r + '</b> time(s).', {}, {}));
        var hl = {}; hl['n' + h] = 'bad';
        f.push(g('The failing service gets the first attempt: <b>1</b> call.', hl, one1('n' + h, '1 call')));
        var t = {}, c = 1;
        for (i = h - 1; i >= 1; i--) { c *= (r + 1); t['n' + (i + 1)] = c + ' calls'; }
        c *= (r + 1);
        t['n' + h] = amplification(h, r) + ' calls';
        f.push(g('Each layer above retries, and each of its attempts makes the layers below retry again. The multipliers stack: <code>(' + r + '+1)<sup>' + h + '</sup> = ' + amplification(h, r) + '</code>.', hl, t));
        f.push({ narr: 'Numbers per layer, from the top down. The deepest service receives <b>' + amplification(h, r) + 'x</b> the normal load exactly when it is already struggling, so it never recovers.', parts: [{ type: 'table', label: 'Calls arriving at each layer when the bottom fails', columns: ['Layer', 'Retries it adds', 'Calls it receives'], rows: names.slice(0, h).map(function (n, k) { return [n, r + ' per caller', Math.pow(r + 1, k + 1)]; }), hl: { 0: 'cur' } }] });
        f.push({ narr: 'The fix, step by step: (1) retry in <b>one</b> layer only: ' + (r + 1) + ' calls instead of ' + amplification(h, r) + '; (2) add a <b>retry budget</b> so retries are at most about 10% extra load; (3) add a <b>circuit breaker</b> so callers stop hammering a dead service; (4) use <b>deadlines</b> so work nobody is waiting for is dropped.', parts: [{ type: 'vars', label: 'Load on the failing service', vals: { 'all layers retry': amplification(h, r) + 'x', 'one layer retries': (r + 1) + 'x', 'with 10% retry budget': '~1.1x', 'breaker open': '0x (fail fast)' }, hl: { 'with 10% retry budget': 'ok', 'all layers retry': 'bad' } }] });
        return pad4(f, 'Done.');
      }
    }],
    examples: [
      { title: 'Incident: the retry storm that finished off a payments service', html: `<p>A database failover made <b>Payments</b> slow for 40 seconds. The Gateway, Orders and Payments clients each had "retry 3 times, no delay". One checkout became up to 4<sup>3</sup> = 64 calls. Payments' queue filled, its health checks timed out, the load balancer removed healthy pods, and the outage lasted 25 minutes instead of 40 seconds. <b>Fix applied:</b> retries only at the Gateway, 2 attempts, exponential backoff with full jitter, a 10% retry budget, a circuit breaker in Orders, and a client deadline passed down the chain so abandoned work is dropped.</p>` },
      { title: 'Spotting a distributed monolith in a review', html: `<p>A team had 14 services. The review found: 11 of them wrote to the same PostgreSQL schema, release notes said "deploy order: auth, users, orders, pricing", and a product page made 9 sequential calls. The honest label was "a monolith with network calls in the middle". <b>Next steps:</b> (1) give each service its own tables and move cross-reads behind APIs or events; (2) merge services that always change together (the cheapest fix is sometimes <em>fewer</em> services); (3) replace sequential calls with one read-model built from events; (4) measure "services touched per deploy" as a health metric.</p>` },
      { title: 'Checkout: what must be sync, what can be async', html: `<p>Place order: <b>sync</b> (user waits): validate cart, check stock, authorise payment. <b>Async</b> (after the order is saved, via an <code>OrderPlaced</code> event on SNS fan-out to SQS queues): confirmation email, loyalty points, search-index update, warehouse picking, analytics. If the email service is down for an hour, checkout still takes 300 ms; the queue holds the work and a DLQ catches poison messages. Each consumer is <b>idempotent</b> (it stores the event id) because delivery is at-least-once.</p>` }
    ],
    deepDive: `<p>🟣 <b>Availability math of a chain.</b> If a request needs services A, B and C in series, the best possible availability is the <b>product</b>: 99.9% x 99.9% x 99.9% ≈ 99.7%, about 2 hours 10 minutes of downtime a month instead of 43 minutes. Ten hard dependencies at 99.9% give 99.0%. The tools are fewer hard dependencies, fallbacks, caching, and moving work off the critical path with queues. Redundancy in parallel works the other way: two independent copies of a 99% component give 1 - 0.01<sup>2</sup> = 99.99% (only if failures are independent and failover is real).</p>
      <p>🟣 <b>Bulkheads and load shedding.</b> A bulkhead gives each dependency its own pool of threads or connections, so one slow dependency cannot use them all (a ship's watertight compartments). Under overload a service should <b>shed load</b> early: return 429/503 quickly for low-priority work rather than queue until everything times out. Queues must be <b>bounded</b>; an unbounded queue only turns overload into very high latency.</p>
      <p>🟣 <b>Deadlines, not timeouts.</b> A per-hop timeout of 2 s on 5 hops lets a request run for 10 s. Pass an absolute <b>deadline</b> (gRPC does this natively) so each hop knows how long is left and gives up when the user has already gone. Timeout order must be: inner calls shorter than outer calls, or the outer one retries while the inner is still working.</p>
      <p>🟣 <b>Idempotency and exactly-once.</b> Networks give you at-most-once or at-least-once, never magic exactly-once. Build at-least-once plus idempotent handlers: an idempotency key in the request, a unique constraint, or a processed-event table. Use the <b>transactional outbox</b> (BE 10) so "save order" and "publish event" cannot disagree.</p>
      <p>🟣 <b>Cloud-specific traps.</b> (1) Health checks that test dependencies make an outage global: when the shared DB blips, <em>every</em> pod fails readiness and the load balancer has no targets. Keep liveness shallow. (2) Chatty services across zones pay <b>cross-AZ data transfer</b> (topic 5). (3) Autoscaling a service that calls a fixed-size database just moves the bottleneck. (4) Service-to-service auth: use workload identity (IRSA, mTLS) not shared secrets.</p>
      <p>🟣 <b>When not to use microservices.</b> A team of ten with one product is usually faster with a <b>modular monolith</b>: strong module boundaries, one deploy, one database with schemas per module. Split out a service when it has a different scaling shape (video encoding), a different release cadence, a different security boundary (PCI), or a team of its own. Splitting early buys network failure modes without the benefit.</p>`,
    aiEra: `<p>🤖 Assistants happily generate "a microservice per noun" because it looks tidy, and they will add <code>retries: 3</code> to every client because that is common in tutorials. Both are exactly how distributed monoliths and retry storms are made. Ask the assistant instead: "Which of these services always change together? Which calls are on the user's critical path? What happens to each call when its dependency is down?" Use AI to draft the failure-mode table, the <code>OrderPlaced</code> event schema and a Mermaid call graph, then check three things yourself: timeouts nest correctly, retries live at one layer, and every consumer is idempotent. AI is also good at reading a trace and listing "services touched per request", which is a quick distributed-monolith detector. It cannot know your team boundaries or your incident history; that is your input.</p>`,
    problems: [P({
      t: 'Retry amplification: how many calls reach the failing service?',
      l: 'Easy', tags: ['retries', 'microservices', 'resilience'], co: ['Netflix', 'Amazon'],
      lang: 'python',
      s: `<p>A request passes through <code>hops</code> services in a chain. When the last service fails, <b>each caller</b> retries <code>retries</code> extra times before giving up (so every caller makes <code>retries + 1</code> attempts). Write <code>retry_amplification(hops, retries)</code> returning how many calls reach the <b>failing service</b> for one user request.</p><p>Then, in two sentences, say how you would cut this number without removing resilience.</p>`,
      c: `<ul><li>0 ≤ hops ≤ 10, 0 ≤ retries ≤ 9. With 0 hops the failing service is called once by the user directly.</li><li>${DESIGN}</li></ul>`,
      ex: `<p><code>(3, 2)</code> &rarr; <span class="c-r">27</span>: 3 attempts at each of 3 layers = 3<sup>3</sup>.<br><code>(3, 0)</code> &rarr; <span class="c-g">1</span>: no retries, no amplification.</p>`,
      bw: `<p>"Retries make it more reliable, so add retries everywhere." Each layer is reasonable alone; together they multiply (retries+1)<sup>hops</sup>. Nobody sees it until the failing service is already drowning.</p>`,
      q: ['Four layers each retry once (2 attempts each). How many calls hit the bottom service per user request?', ['16', '8', '5', '4'], 0, '2 attempts at each of 4 layers multiply: 2<sup>4</sup> = 16. The layers do not add, they multiply.'],
      h: ['Hint 1: one attempt at the top creates (retries+1) attempts at the next layer.', 'Hint 2: so each layer multiplies the count by retries+1.', 'Hint 3: with zero hops there is no multiplication, the answer is 1. In Python <code>(retries + 1) ** hops</code> already gives 1 for hops = 0.'],
      a: `<p>Each caller makes retries + 1 attempts, and every attempt makes the layer below repeat the same pattern, so the count is the product of the per-layer attempts: <code>(retries + 1) ** hops</code>. To cut it: retry in <b>one</b> layer only (the edge or the mesh) and give that layer a retry budget (about 10% extra load) plus a circuit breaker, so a dead service sees roughly 1.1x load instead of 27x. Pass a deadline so lower layers do not work on abandoned requests.</p>`,
      code: PY(R`def retry_amplification(hops, retries):
    """Calls reaching the failing service when every one of hops callers makes retries + 1 attempts."""
    return (retries + 1) ** hops`),
      cx: `<p>O(1) with the closed form. The point is the exponent: growth is exponential in depth, linear only in retries.</p>`,
      f: ['If only the top layer retries 3 times, what is the amplification? (4.)', 'How does a 10% retry budget change the worst case?'],
      tests: { sig: 'int int -> int', fn: 'retry_amplification', names: { python: 'retry_amplification' }, cases: [
        [[3, 2], 27], [[3, 0], 1], [[0, 3], 1], [[1, 5], 6], [[4, 1], 16], [[5, 3], 1024], [[2, 9], 100], [[10, 1], 1024], [[10, 9], 10000000000]
      ] }
    }), P({
      t: 'Split a monolith: find the boundaries and the first extraction',
      l: 'Hard', tags: ['microservices', 'boundaries', 'strangler'], co: ['Shopify', 'Uber'],
      s: `<p>A retail monolith (one Java app, one PostgreSQL database with 140 tables) handles catalogue, cart, orders, payments, inventory, email and reporting. Releases take two weeks, and the nightly report locks tables that checkout needs. Management says "go microservices". Write a design note (about one page): which <b>3 boundaries</b> you would extract first and in what order, what each service owns, which calls are sync vs async, how you migrate the data without a big bang, and which metrics prove it worked. Include one YAML snippet showing the contract of the first event.</p>`,
      ex: `<p>A strong answer extracts <span class="c-g">reporting</span> first (read-only, different scaling shape, relieves checkout), then <span class="c-g">notifications</span> (async by nature), then <span class="c-g">payments</span> (security boundary, PCI scope). It does <span class="c-r">not</span> begin with catalogue or orders, the most entangled parts.</p>`,
      bw: `<p>"Rewrite everything as 15 services in 6 months." High risk, no value until the end, shared database remains, and the team ends with a distributed monolith plus a frozen product.</p>`,
      q: ['Which is the safest first service to extract from a monolith?', ['A read-only, loosely coupled capability such as reporting or notifications', 'The orders core, because it is the most important', 'The shared "utils" library as a service', 'All tables at once, then split code later'], 0, 'Start where coupling is lowest and value is clear: reporting (a read replica or CDC feed) or notifications (events). Core transactional domains come later, once the pattern and tooling are proven.'],
      h: ['Hint 1: pick by <b>coupling and pain</b>, not by importance. Where do changes and incidents cluster?', 'Hint 2: use the strangler pattern: route one capability to the new service behind the same gateway, keep the monolith as fallback.', 'Hint 3: data first: replicate with CDC/events, switch reads, then switch writes; never two writers for the same table.'],
      a: `<p><b>Order of extraction.</b> (1) <b>Reporting</b>: build a read model from a CDC stream (Debezium or DMS into S3/Redshift or a replica). Zero write risk, and the nightly report stops locking checkout tables. (2) <b>Notifications</b>: the monolith writes an <code>OrderPlaced</code> row to an outbox table, a relay publishes to SNS, and the new service consumes from SQS. Email outages no longer affect checkout. (3) <b>Payments</b>: separate security boundary (card data, PCI scope), different release cadence, and a clean sync API (<code>authorize</code>, <code>capture</code>, <code>refund</code>) with idempotency keys. Leave catalogue, cart and orders together as one "commerce" service until a real reason to split appears.</p>
        <p><b>Data migration.</b> The service owns its data. Steps: shadow-write or CDC copy, compare, switch reads, switch writes, then drop the old tables. Never leave two writers. A strangler route at the gateway (<code>/payments/*</code>) sends a small percentage first (weighted routing), with the monolith path as the rollback.</p>
        <p><b>Sync vs async.</b> Payment authorisation is sync (user waits); everything after the order is saved is async. <b>Metrics:</b> lead time per change, deploy frequency, change failure rate, p99 checkout latency, "services touched per deploy" (should fall), and the cost of the new infrastructure.</p>`,
      code: YM(R`# Event contract for the first event (AsyncAPI-style summary, kept in the schema repo and versioned)
event: OrderPlaced
version: 1
channel: sns:arn:aws:sns:us-east-1:123456789012:order-events
delivery: at-least-once          # consumers MUST be idempotent
key: orderId                     # also the idempotency key
payload:
  orderId: { type: string, example: "ord_8f2a" }
  customerId: { type: string }
  total: { type: integer, unit: cents }
  currency: { type: string, example: USD }
  placedAt: { type: string, format: date-time }
compatibility: backward           # only add optional fields; never remove or rename`, 'YAML: the OrderPlaced event contract'),
      cx: `<p>Not an algorithm. The cost is people and time: expect months, not weeks, and keep every step reversible.</p>`,
      f: ['When would you merge two services back together?', 'How do you stop the new service from calling the monolith database directly?']
    })]
  });

  // ───────────────────────── Topic 2: service mesh and Istio ─────────────────────────
  topics.push({
    title: 'Service Meshes and Istio: Traffic Management, Resilience, mTLS, Sidecar vs Ambient',
    analogy: `<p>Imagine every office in a company gets a <b>receptionist</b> at its door. People inside no longer phone other offices directly. They tell their receptionist, who finds the right office, checks the visitor's badge, waits politely, tries again if the line is busy, stops calling an office that keeps hanging up, and writes everything in a logbook. Offices stay focused on their work. The receptionists follow rules written once in a central rulebook. That is a <b>service mesh</b>: the receptionists are small proxies (Envoy), and the rulebook is the control plane (Istio's <code>istiod</code>).</p>`,
    explain: `<p>🟢 <b>The idea.</b> Resilience and security code (timeouts, retries, mTLS, metrics) would otherwise be copied into every service in every language. A mesh moves it out of the app and into the platform. The apps keep talking plain HTTP to each other; the proxies add the rest.</p>
      ${H.table(['Piece', 'What it does'], [
        ['<b>Data plane</b>', 'Envoy proxies that carry the traffic: a <b>sidecar</b> next to every pod, or (ambient mode) one per node plus optional shared proxies'],
        ['<b>Control plane</b>', '<code>istiod</code>: reads your YAML, pushes config to every proxy, and acts as the certificate authority that issues each workload a short-lived identity certificate'],
        ['<b>VirtualService</b>', '<em>How requests are routed</em>: matches, weights, retries, timeouts, fault injection'],
        ['<b>DestinationRule</b>', '<em>What happens at the destination</em>: subsets (v1, v2 by label), load balancing, connection limits, outlier detection (circuit breaking), TLS settings'],
        ['<b>PeerAuthentication</b>', 'Does this workload accept plain text or only mTLS? (PERMISSIVE, STRICT, DISABLE)'],
        ['<b>AuthorizationPolicy</b>', 'Who may call whom: allow/deny by identity (service account), namespace, method, path']
      ])}
      <p>🟢 <b>Traffic management you will actually use.</b></p>
      <ul><li><b>Weighted routing</b> for canaries: 95% to <code>v1</code>, 5% to <code>v2</code>, then 25, 50, 100. Rolling back is editing one number. The split is by request, not by user, unless you add header or hash-based stickiness.</li>
      <li><b>Timeouts</b>: fail a request that takes longer than N seconds.</li>
      <li><b>Retries</b>: <code>attempts</code>, <code>perTryTimeout</code>, <code>retryOn</code>. <b>Istio retries twice by default for HTTP</b>, so a mesh on top of app-level retries multiplies attempts silently. Set retries on purpose in one place.</li>
      <li><b>Circuit breaking</b>: <code>connectionPool</code> limits (queue too long &rarr; fast 503) and <code>outlierDetection</code> (eject a pod that returned 5 errors in a row for 30 s).</li>
      <li><b>Fault injection</b>: deliberately add a delay or an abort to a percentage of requests to test your own timeouts and fallbacks. This is chaos testing without touching the app.</li></ul>
      <p>🔵 <b>Security: mTLS.</b> In <b>mutual TLS</b> both sides show a certificate, so the server knows <em>who</em> the caller is, not just that the traffic is encrypted. The mesh does this automatically with certificates for identities like <code>spiffe://cluster.local/ns/shop/sa/orders</code>, rotated about every 24 hours. Rollout path: PERMISSIVE (accepts both, so nothing breaks while pods get sidecars), then check telemetry, then STRICT per namespace, then mesh-wide. Pair it with <b>AuthorizationPolicy</b> so identity is actually used: "only <code>orders</code> may call <code>payments</code>".</p>
      <p>🔵 <b>Sidecar vs ambient (intro).</b></p>
      ${H.table(['', 'Sidecar mode', 'Ambient mode'], [
        ['Proxy placement', 'one Envoy container injected in <b>every pod</b>', '<b>ztunnel</b> on every node (L4: mTLS, identity, TCP telemetry) + optional <b>waypoint</b> proxy per namespace or service for L7 features'],
        ['Enable', 'label namespace <code>istio-injection=enabled</code>, restart pods', 'label namespace <code>istio.io/dataplane-mode=ambient</code>, no restart'],
        ['L7 features (retries, routing by header)', 'always available', 'only where a waypoint is deployed'],
        ['Resource cost', 'CPU/memory per pod; adds up with many small pods', 'much lower per pod; shared proxies'],
        ['Latency', 'two extra proxy hops per call (client + server sidecar)', 'ztunnel hop for L4; plus a waypoint hop only when L7 is needed'],
        ['Maturity', 'oldest, most features and docs', 'GA since Istio 1.24 (late 2024); the direction of new investment']
      ])}
      <p>🔵 <b>When a mesh is worth it.</b> Many services in several languages, a requirement for mTLS everywhere, canary rollouts without app changes, or uniform telemetry. When it is <b>not</b>: fewer than about 10 services, one language with a good client library, or a team with no capacity to operate one more control plane. A mesh also has a cost: more moving parts, more YAML, extra latency and CPU.</p>`,
    clues: ['"canary 5% of traffic to the new version without changing the app" → <b>VirtualService weights + DestinationRule subsets</b>', '"retry storm" or "unexpected 3x load on a flaky service" → check mesh <b>default retries (2)</b> plus app retries', '"stop sending traffic to a bad pod" → <b>outlierDetection</b>; "fail fast when too many requests queue" → <b>connectionPool</b> limits', '"encrypt service-to-service traffic and know who is calling" → <b>mTLS + PeerAuthentication + AuthorizationPolicy</b>', '"test what happens if payments is slow" → <b>fault injection delay</b>', '"the mesh added latency" or "too much memory for sidecars" → proxy tuning, <b>Sidecar</b> resource scoping, or <b>ambient</b> mode', '"zero-downtime migration to mTLS" → PERMISSIVE first, STRICT later'],
    code: [SH(R`#!/usr/bin/env bash
# Local Istio lab on kind (free, no cloud account). Needs Docker, kind, kubectl.
set -euo pipefail
ISTIO_VERSION=1.24.2                     # any recent 1.24+ release works; check istio.io for the latest

kind create cluster --name mesh          # a one-node local cluster

curl -L https://istio.io/downloadIstio | ISTIO_VERSION="$ISTIO_VERSION" sh -
export PATH="$PWD/istio-$ISTIO_VERSION/bin:$PATH"

istioctl install --set profile=demo -y   # demo profile: istiod + ingress gateway, high trace sampling; NOT for production
kubectl label namespace default istio-injection=enabled

# Bookinfo sample: productpage -> details + reviews (v1, v2, v3) -> ratings
kubectl apply -f "istio-$ISTIO_VERSION/samples/bookinfo/platform/kube/bookinfo.yaml"
kubectl apply -f "istio-$ISTIO_VERSION/samples/bookinfo/networking/bookinfo-gateway.yaml"
kubectl rollout status deploy/productpage-v1 --timeout=180s

# Pods should show 2/2 containers (the app + istio-proxy sidecar)
kubectl get pods

# Check the config the proxies received, and look for problems
istioctl analyze
istioctl proxy-status

# Cleanup when finished
# kind delete cluster --name mesh`, 'Bash: kind + Istio demo profile + Bookinfo'),
      YM(R`# Canary: 90% to reviews v1, 10% to v2. Subsets come from the pod label "version".
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: reviews
spec:
  host: reviews
  subsets:
    - name: v1
      labels: { version: v1 }
    - name: v2
      labels: { version: v2 }
---
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: reviews
spec:
  hosts: [reviews]
  http:
    - route:
        - destination: { host: reviews, subset: v1 }
          weight: 90
        - destination: { host: reviews, subset: v2 }
          weight: 10
      timeout: 3s                       # whole request budget, including retries
      retries:
        attempts: 2                     # set explicitly; Istio's default is also 2
        perTryTimeout: 1s
        retryOn: connect-failure,refused-stream,503`, 'YAML: weighted routing, timeout and retries'),
      YM(R`# Circuit breaking + fault injection on the "ratings" service
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: ratings
spec:
  host: ratings
  trafficPolicy:
    connectionPool:
      tcp: { maxConnections: 100 }
      http:
        http1MaxPendingRequests: 20      # queue longer than this: instant 503 instead of waiting
        http2MaxRequests: 200
        maxRequestsPerConnection: 50
    outlierDetection:                    # eject a bad pod instead of retrying into it
      consecutive5xxErrors: 5
      interval: 10s
      baseEjectionTime: 30s
      maxEjectionPercent: 50             # never eject more than half the pods
---
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: ratings-chaos
spec:
  hosts: [ratings]
  http:
    - fault:
        delay:
          percentage: { value: 10 }      # 10% of requests get 5 s extra latency
          fixedDelay: 5s
        abort:
          percentage: { value: 5 }       # 5% get an immediate 503
          httpStatus: 503
      route:
        - destination: { host: ratings }`, 'YAML: circuit breaking and fault injection'),
      YM(R`# mTLS rollout: STRICT for the namespace, then say WHO may call WHOM.
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: shop
spec:
  mtls:
    mode: STRICT                         # plain-text connections are refused (start with PERMISSIVE)
---
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: payments-allow-orders
  namespace: shop
spec:
  selector:
    matchLabels: { app: payments }
  action: ALLOW                          # once any ALLOW policy exists, everything not listed is denied
  rules:
    - from:
        - source:
            principals: ["cluster.local/ns/shop/sa/orders"]
      to:
        - operation:
            methods: ["POST"]
            paths: ["/v1/authorize", "/v1/capture"]`, 'YAML: PeerAuthentication STRICT + AuthorizationPolicy')],
    codeTitle: ['Bash: local Istio on kind', 'YAML: canary, timeout, retries', 'YAML: circuit breaker and fault injection', 'YAML: mTLS and authorization'],
    viz: [{
      title: 'Weighted canary: where do 100 requests go?',
      input: '90,10',
      inputLabel: 'weights for v1,v2,... (e.g. 90,10 or 50,30,20)',
      gen: function (input) {
        var w = nums(input, 'weights like 90,10', 5);
        if (w.some(function (x) { return x < 0; }) || w.reduce(function (a, b) { return a + b; }, 0) <= 0) throw new Error('Weights must be 0 or more and not all zero');
        var names = w.map(function (x, i) { return 'v' + (i + 1); });
        var total = w.reduce(function (a, b) { return a + b; }, 0);
        var out = split(w, 100);
        var nodes = [box('c', 'Client', 4, 22, 14), box('vs', 'Sidecar (VirtualService)', 30, 22, 26)];
        var edges = [['c', 'vs']];
        names.forEach(function (n, i) { nodes.push(box(n, 'reviews ' + n, 74, 4 + i * (36 / Math.max(1, names.length - 1)) , 20)); edges.push(['vs', n, w[i]]); });
        function g(narr, hl, tags) { return { narr: narr, parts: [{ type: 'graph', label: 'Request path', directed: true, height: 48, nodes: nodes, edges: edges, hl: hl || {}, tags: tags || {} }] }; }
        var f = [];
        f.push(g('The client calls <code>reviews</code>. Its own sidecar intercepts the call and reads the VirtualService: the weights are <b>' + w.join(' : ') + '</b>. The app code does not know any of this.', { vs: 'cur' }));
        var tg = {}; names.forEach(function (n, i) { tg[n] = (100 * w[i] / total).toFixed(w[i] * 100 % total ? 1 : 0) + '%'; });
        f.push(g('Weights are relative: each version gets weight / sum of weights. They do not have to add to 100 (but keep them tidy for people reading the YAML).', { vs: 'ok' }, tg));
        var hl = {}; names.forEach(function (n, i) { hl[n] = w[i] === 0 ? 'done' : (i === 0 ? 'ok' : 'cur'); });
        var tc = {}; names.forEach(function (n, i) { tc[n] = out[i] + ' of 100'; });
        f.push(g('Over 100 requests the proxy picks a version by weight for each request. Real traffic is random, so expect small deviations at low volume; this table shows the expected whole-number split (largest remainder).', hl, tc));
        f.push({ narr: 'The same split as bars. Canary steps are usually 1-5%, 25%, 50%, 100%, checking error rate and latency at each step. Rollback means setting the canary weight back to 0, which takes seconds because it is only proxy config.', parts: [{ type: 'bars', label: 'Requests per version (out of 100)', values: out, idxLabels: names, hl: out.reduce(function (h, v, i) { h[i] = i === 0 ? 'ok' : 'cur'; return h; }, {}) }] });
        f.push({ narr: '<b>Watch out:</b> splitting is per request. If a user must see one version for a whole session, add a header or cookie match (or consistent-hash load balancing) in front of the weighted rule. Also, weights apply only to traffic that passes through a sidecar or gateway, so a pod without a sidecar bypasses them.', parts: [{ type: 'text', label: 'Caveats', html: 'Per-request random split &bull; sessions need stickiness &bull; clients outside the mesh bypass weights' }] });
        return f;
      }
    }, {
      title: 'Circuit breaker: closed, open, half-open',
      input: '1,0,0,0,0,0,0,1,1,1',
      inputLabel: 'call results over time (1 = success, 0 = failure); threshold 3 failures, open for 2 steps',
      gen: function (input) {
        var o = nums(input, '0s and 1s, e.g. 1,0,0,0,0,0,1,1', 24);
        if (o.some(function (x) { return x !== 0 && x !== 1; })) throw new Error('Use only 0 and 1');
        var r = breaker(o, 3, 2), f = [];
        f.push({ narr: 'Rules: <b>closed</b> = calls flow; 3 failures in a row <b>open</b> the breaker; while open, calls are rejected at once for 2 steps (the dependency gets a rest); then <b>half-open</b> lets one probe through: success closes it, failure reopens it.', parts: [{ type: 'array', label: 'Call results (1 ok, 0 fail)', values: o, showIdx: true }] });
        var upto = [];
        r.log.forEach(function (row, i) {
          upto.push(row);
          if (i === r.log.length - 1 || i % 3 === 2) {
            var hl = {}; hl[upto.length - 1] = row[1] === 'open' ? 'bad' : (row[1] === 'half-open' ? 'cur' : 'ok');
            f.push({ narr: 'After step ' + (i + 1) + ': breaker was <b>' + row[1] + '</b>, outcome: ' + row[2] + '. Rejected so far: ' + upto.filter(function (x) { return x[1] === 'open'; }).length + '.', parts: [{ type: 'table', label: 'Step log', columns: ['Result', 'State before', 'What happened'], rows: upto.slice(), hl: hl }] });
          }
        });
        f.push({ narr: 'Total rejected without touching the dependency: <b>' + r.rejected + '</b>. Final state: <b>' + r.state + '</b>. In Istio the "open" part is outlier detection (eject the host for baseEjectionTime) and connection-pool limits; the half-open probing is how ejected hosts return.', parts: [{ type: 'vars', label: 'Result', vals: { rejected: r.rejected, 'final state': r.state }, hl: { rejected: 'sel' } }] });
        return pad4(f, 'Done.');
      }
    }],
    examples: [
      { title: 'Migration story: the mesh that added 30 ms', html: `<p>A team moved 40 services into Istio (sidecar mode). Median checkout latency went from 180 ms to 210 ms. A trace showed the checkout path crossing <b>9 hops</b>; each hop now went app &rarr; client sidecar &rarr; server sidecar &rarr; app, about <b>3 ms</b> more per hop when tuned, and more when not. The investigation: (1) sidecars had a CPU limit of 100m and were throttled under load; raised the request/limit. (2) Every sidecar received config for all 2,000 services in the mesh and was slow to update; a <code>Sidecar</code> resource limited each namespace to the hosts it really calls. (3) Access logs and 100% tracing were on from the demo profile; sampling went to 1%. (4) The shortest fix was architectural: three of the nine hops were avoidable calls and were merged. Result: +9 ms. <b>Lesson:</b> measure before and after, budget latency per hop, and know that the demo profile is not production.</p>` },
      { title: 'The accidental retry storm from default retries', html: `<p>An app had its own client retry (3 attempts). Istio added its default 2 retries for connect failures and 503s at the server-side route. During a deploy of <code>payments</code> a burst of 503s appeared: each user call became up to 3 x 3 = 9 attempts. The fix: keep retries only in the mesh (<code>attempts: 2</code>, <code>perTryTimeout: 1s</code>, <code>retryOn: connect-failure,refused-stream</code>, <b>not</b> on 5xx for non-idempotent POSTs), remove app retries, add <code>outlierDetection</code>, and mark the payment POST idempotent with a key.</p>` },
      { title: 'Rolling out mTLS without an outage', html: `<p>Week 1: install the mesh, inject sidecars namespace by namespace, mesh default PERMISSIVE. Week 2: use Kiali or <code>istioctl x describe</code> and the telemetry to find clients still sending plain text (batch jobs, a legacy VM, a health probe). Week 3: set STRICT for namespaces with no plain-text clients, add AuthorizationPolicy allow rules, confirm deny with a test pod from another namespace. Week 4: mesh-wide STRICT in <code>istio-system</code>. Kubernetes probes keep working because the sidecar rewrites them. Rollback at any step is changing the mode back to PERMISSIVE.</p>` }
    ],
    deepDive: `<p>🟣 <b>How a request flows (sidecar).</b> The pod's iptables (or the CNI) redirect outgoing traffic to the local Envoy. Envoy matches the destination to a cluster from the xDS config <code>istiod</code> pushed, chooses an endpoint using the load-balancing policy (default least request), opens or reuses an mTLS connection to the server-side Envoy, which verifies the certificate, applies AuthorizationPolicy, and hands plain HTTP to the app on localhost. Retries, timeouts and the circuit breaker run in the <em>caller's</em> Envoy; fault injection runs there too.</p>
      <p>🟣 <b>Retries done properly.</b> Retry only on failures that are safe and likely to pass: <code>connect-failure</code>, <code>refused-stream</code>, and <code>reset</code> before any response; add <code>5xx</code> only for idempotent routes. Always set <code>perTryTimeout</code> smaller than <code>timeout / attempts</code>. Envoy also supports a <b>retry budget</b> through circuit-breaker thresholds (<code>max_retries</code>), which limits concurrent retries; this is the proxy-level version of a retry budget. Keep retries in <b>one</b> layer.</p>
      <p>🟣 <b>Outlier detection vs connection pool.</b> They protect different things. The connection pool limits <em>concurrency to a host</em> (overflow is rejected with 503, flagged <code>UO</code> in access logs). Outlier detection <em>removes bad hosts</em> from the load-balancing pool for a time; it is passive health checking driven by real traffic. <code>maxEjectionPercent</code> keeps you from ejecting every pod and having no one left to serve.</p>
      <p>🟣 <b>Ambient internals.</b> <b>ztunnel</b> (a Rust node proxy) captures pod traffic, wraps it in mTLS using the <b>HBONE</b> tunnel (HTTP CONNECT over mTLS on port 15008), and enforces L4 authorization. Anything needing HTTP (retries, header routing, L7 authorization) is sent through a <b>waypoint</b>, a normal Envoy deployment managed with the Kubernetes Gateway API (<code>istioctl waypoint apply</code>). You pay the L7 cost only where you ask for L7. Trade-off: waypoints are shared proxies, so you design for their scaling and failure domain.</p>
      <p>🟣 <b>Failure modes of the mesh itself.</b> If <code>istiod</code> is down, existing proxies keep working with their last config, but new pods cannot get certificates or config; run 2+ replicas with a PodDisruptionBudget. Certificates expire if the CA is broken for days. A bad VirtualService can break every caller at once; use <code>istioctl analyze</code> in CI, GitOps with review, and revision-based canary upgrades of the control plane (<code>istioctl install --revision</code>).</p>
      <p>🟣 <b>Alternatives.</b> Linkerd (lighter, Rust micro-proxy), Cilium service mesh (eBPF, sidecarless), cloud-managed meshes (AWS App Mesh reached end of support on 30 September 2026, so do not choose it for new work; Google Cloud Service Mesh; Azure's Istio add-on for AKS). Libraries (gRPC client config, resilience4j) are fine for one language.</p>`,
    aiEra: `<p>🤖 Assistants write plausible Istio YAML but regularly use old API versions (<code>v1alpha3</code>), forget that a VirtualService <code>host</code> must match what clients actually call, or put <code>retries</code> on a route that already has app retries. They also love enabling STRICT mTLS immediately, which breaks every un-injected caller. Use AI to draft manifests, then run <code>istioctl analyze</code>, test with a throwaway pod, and review three questions: does the weight sum make sense, are retries only on idempotent calls, is STRICT staged behind PERMISSIVE. AI is very good at explaining an Envoy response flag (<code>UO</code>, <code>UF</code>, <code>URX</code>, <code>NR</code>) from an access-log line you paste, which saves a lot of time during an incident. Do not paste secrets or full production configs into public tools.</p>`,
    problems: [P({
      t: 'Weighted routing: exact request counts for a traffic split',
      l: 'Medium', tags: ['Istio', 'canary', 'weighted routing'], co: ['Google', 'Lyft'],
      lang: 'python',
      s: `<p>You plan a canary and want to know how many of the next <code>n</code> requests each version should get when the VirtualService weights are <code>weights</code> (integers, any sum). Write <code>split_traffic(weights, n)</code> returning a list of whole request counts that sums to exactly <code>n</code>. Use the <b>largest remainder</b> method: give each version floor(weight x n / total), then hand the leftover requests, one each, to the versions with the largest fractional parts (ties go to the lower index).</p><p>Also write, as YAML, the VirtualService and DestinationRule for <code>reviews</code> with weights 95/5 and say what you check before moving to 25%.</p>`,
      c: `<ul><li>1 ≤ len(weights) ≤ 10, weights ≥ 0 with a positive sum, 0 ≤ n ≤ 10<sup>6</sup>.</li><li>${DESIGN}</li></ul>`,
      ex: `<p><code>([50, 30, 20], 7)</code> &rarr; <span class="c-g">[4, 2, 1]</span>: exact shares are 3.5, 2.1, 1.4; floors are 3, 2, 1 (total 6); the one leftover request goes to the biggest fraction, 0.5.<br><code>([1, 1, 1], 10)</code> &rarr; <span class="c-y">[4, 3, 3]</span>: all fractions tie at 0.33, so the lowest index wins.</p>`,
      bw: `<p>Round each share: 3.5 &rarr; 4, 2.1 &rarr; 2, 1.4 &rarr; 1 gives 7, but <code>([1,1,1],10)</code> gives 3+3+3 = 9, and <code>([5,5],5)</code> gives 3+3 = 6. Plain rounding does not always sum to <code>n</code>.</p>`,
      q: ['Weights 90 and 10 with n = 5 requests. What does the largest remainder method return?', ['[5, 0] (ties go to the lower index)', '[4, 1]', '[4, 0]', '[5, 1]'], 0, 'Exact shares: 4.5 and 0.5. Floors: 4 and 0 (total 4). One request is left; both fractions are 0.5, a tie, so the lower index gets it: [5, 0].'],
      h: ['Hint 1: compute floor(w x n / total) for each version with integer division.', 'Hint 2: the leftover is n minus the sum of floors; it is always less than the number of versions.', 'Hint 3: the fractional part of w x n / total is (w x n) % total. Sort indexes by that value descending, then by index ascending, and add 1 to the first <code>leftover</code> of them.'],
      a: `<p>Integer arithmetic avoids floating point errors: each base share is <code>w * n // total</code> and the fractional part is the remainder <code>w * n % total</code>. Sort the indexes by remainder (largest first, lowest index on ties) and give one extra request to as many versions as there are leftover requests. The result sums to <code>n</code> and no version is off by more than one request from its exact share.</p>
        <p><b>Canary YAML</b> is the VirtualService shown in the lesson with weights 95 and 5 and the DestinationRule subsets keyed on <code>version</code>. Before moving to 25%: error rate (5xx) and p99 latency of v2 not worse than v1 for a full window (at least 10-15 minutes of real traffic), saturation (CPU, DB connections), business metrics (checkout success), and logs for new exception types.</p>`,
      code: PY(R`def split_traffic(weights, n):
    """Largest-remainder split of n requests by integer weights."""
    total = sum(weights)
    base = [w * n // total for w in weights]               # floor of each exact share
    left = n - sum(base)                                   # requests still unassigned
    order = sorted(range(len(weights)), key=lambda i: (-(weights[i] * n % total), i))
    for i in order[:left]:
        base[i] += 1
    return base`),
      alt: [YM(R`apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: reviews
spec:
  hosts: [reviews]
  http:
    - route:
        - destination: { host: reviews, subset: v1 }
          weight: 95
        - destination: { host: reviews, subset: v2 }
          weight: 5`, 'YAML: 95/5 canary')],
      cx: `<p>O(k log k) for k versions (sorting); O(k) space.</p>`,
      f: ['Why is the real split random rather than exact? (Each request is an independent weighted pick.)', 'How would you keep one user on one version? (Header/cookie match or consistent-hash LB.)'],
      tests: { sig: 'int[] int -> int[]', fn: 'split_traffic', names: { python: 'split_traffic' }, cases: [
        [[[90, 10], 100], [90, 10]], [[[90, 10], 5], [5, 0]], [[[50, 30, 20], 7], [4, 2, 1]], [[[1, 1, 1], 10], [4, 3, 3]],
        [[[100], 9], [9]], [[[0, 100], 10], [0, 10]], [[[33, 33, 34], 100], [33, 33, 34]], [[[70, 20, 10], 15], [11, 3, 1]], [[[5, 5], 0], [0, 0]]
      ] }
    }), P({
      t: 'Mesh migration added 30 ms: find it and fix it',
      l: 'Hard', tags: ['Istio', 'latency', 'sidecar', 'ambient'], co: ['Salesforce', 'eBay'],
      s: `<p>After moving 40 services into an Istio sidecar mesh, p50 checkout latency rose from 180 ms to 210 ms and p99 from 600 ms to 900 ms. The SLO is p99 under 700 ms. Write the investigation plan and the fixes: what you measure first, the likely causes in order, the exact Istio and Kubernetes changes (YAML/bash), what you would do about the number of hops, and when you would move some namespaces to ambient mode. State the expected result of each change.</p>`,
      c: `<ul><li>Use the local kind lab to reproduce the config changes; no cloud account is required.</li><li>${LAB_KIND}</li></ul>`,
      ex: `<p>A trace shows 9 hops per checkout. Sidecars show CPU throttling at 100m. Each sidecar holds config for 2,000 services. After tuning: <span class="c-g">p50 +9 ms, p99 under 700 ms</span> instead of +30 ms.</p>`,
      bw: `<p>"Istio is slow, roll it back." Throwing the mesh away loses mTLS and traffic control, and the cause may be fixable settings. The opposite mistake is "add more pods", which does nothing for a per-hop cost.</p>`,
      q: ['What is the first thing to do about a 30 ms regression after a mesh migration?', ['Measure per-hop latency with traces and compare to a baseline, and check sidecar CPU throttling', 'Disable mTLS everywhere', 'Add more replicas of every service', 'Remove the mesh immediately'], 0, 'Measure first. A trace shows where time goes (hop count, queueing, proxy CPU). mTLS handshakes are amortised by connection reuse, so disabling mTLS rarely helps; more replicas do not reduce a per-hop cost.'],
      h: ['Hint 1: latency added = hops x (client proxy + server proxy). Count hops with a trace before touching config.', 'Hint 2: look for CPU throttling on <code>istio-proxy</code> (container_cpu_cfs_throttled_*), huge xDS config (proxy memory, slow pushes), 100% tracing and verbose access logs from the demo profile.', 'Hint 3: shrink config with a <code>Sidecar</code> resource, cut hops with architecture changes, and consider ambient for namespaces that only need L4 mTLS.'],
      a: `<p><b>1. Measure.</b> Take a trace of one checkout (Jaeger or Tempo) and a baseline from before the migration. Compute: hops, time in each proxy (Envoy <code>duration</code> vs upstream service time in access logs), p50 and p99 per hop. Compare namespaces with and without sidecars on the same load test.</p>
        <p><b>2. Causes, most likely first.</b> (a) <b>CPU throttling</b>: sidecar limit too low; set requests and remove or raise the CPU limit. (b) <b>Config bloat</b>: each proxy knows every service; add a <code>Sidecar</code> resource per namespace listing only needed hosts; this cuts memory and push time. (c) <b>Telemetry</b>: 100% tracing sampling, access logs to stdout on every request; lower sampling to 1% and turn logs on only for errors. (d) <b>Connection churn</b>: clients not reusing connections, so mTLS handshakes repeat; use keep-alive and HTTP/2 or gRPC. (e) <b>Extra retries</b> or long <code>perTryTimeout</code> hiding slow hops.</p>
        <p><b>3. Reduce hops.</b> A mesh makes every hop cost a few milliseconds, so the best fix is fewer hops: merge chatty services, use async for non-critical calls, add an aggregate read-model. <b>4. Ambient.</b> For namespaces that only need identity and encryption, ambient gives mTLS through ztunnel without per-pod sidecars and without a second proxy hop for L7; use a waypoint only for services needing retries or header routing.</p>
        <p><b>Expected result:</b> removing throttling and config bloat usually recovers most of the tail latency; hop reduction recovers the rest. Re-run the same load test after each change and keep a number per change.</p>`,
      code: [YM(R`# Limit what each sidecar in the "shop" namespace knows about: only itself, its own namespace, and the control plane.
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: default
  namespace: shop
spec:
  egress:
    - hosts:
        - "./*"                  # services in this namespace
        - "istio-system/*"       # control plane / telemetry
        - "payments/*"           # one other namespace we really call
---
# Quieter, cheaper telemetry for production
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: mesh-default
  namespace: istio-system
spec:
  tracing:
    - randomSamplingPercentage: 1.0
  accessLogging:
    - providers: [{ name: envoy }]
      filter:
        expression: "response.code >= 400"   # log only errors`, 'YAML: Sidecar scope and telemetry'),
        SH(R`# Check for CPU throttling of the sidecar (needs Prometheus; query shown as a command-line request)
# container_cpu_cfs_throttled_periods_total / container_cpu_cfs_periods_total for container="istio-proxy"
kubectl top pod -n shop --containers | grep istio-proxy

# Per-pod proxy memory and config size
istioctl proxy-config clusters deploy/orders -n shop | wc -l

# Try ambient for a low-risk namespace (needs an ambient install):
#   istioctl install --set profile=ambient -y
kubectl label namespace reports istio.io/dataplane-mode=ambient`, 'Bash: measure sidecar cost, try ambient')],
      cx: `<p>The work is measurement. Each fix is a small config change that can be rolled back.</p>`,
      f: ['What number would make you keep the mesh despite the latency?', 'How do you A/B the sidecar overhead safely? (Two identical namespaces, one injected, same load test.)']
    })]
  });

  // ───────────────────────── Topic 3: disaster recovery, RTO and RPO ─────────────────────────
  topics.push({
    title: 'Disaster Recovery: RTO, RPO and the Four Strategies (Backup & Restore to Multi-Site)',
    analogy: `<p>Think of a <b>spare tyre</b> for your car. You can keep (1) a flat-pack tyre in the garage at home (cheap, but you must walk home, get it, and fit it: hours), (2) the wheel and tools in the boot but no air in it yet (a bit of pumping, tens of minutes), (3) a full spare mounted and inflated on a roof rack (swap in minutes), or (4) a car with <b>eight wheels</b> that keeps driving when one bursts (no stop at all, and you pay to carry all those wheels every day). Disaster recovery is choosing which spare to carry for each car you own. A delivery van that earns money every minute deserves the eight-wheel version; the garden trolley does not.</p>`,
    explain: `<p>🟢 <b>Two numbers define every DR plan.</b></p>
      ${H.table(['Term', 'Plain meaning', 'Question it answers'], [
        ['<b>RTO</b> (Recovery Time Objective)', 'how long the service may be <b>down</b> before the business is hurt', '"How fast must we be back?"'],
        ['<b>RPO</b> (Recovery Point Objective)', 'how much <b>data</b> (measured in time) we may lose', '"How old can the restored data be?"'],
        ['<b>MTD</b> / <b>WRT</b>', 'maximum tolerable downtime; work recovery time (checks after the systems are up)', '"When is it a business disaster?"']
      ])}
      <p>RTO is time <b>after</b> the failure until service is back. RPO is time <b>before</b> the failure that the restored data may be missing. If your last good copy is 15 minutes old, your RPO achieved is 15 minutes. If the database lags the primary by 40 seconds when the Region dies, you lose about 40 seconds of writes.</p>
      <p>🟢 <b>The four AWS strategies</b>, from cheapest and slowest to most expensive and fastest:</p>
      ${H.table(['Strategy', 'What runs in the DR Region before a disaster', 'Typical RTO', 'Typical RPO', 'Relative cost'], [
        ['<b>Backup &amp; restore</b>', 'only backups (snapshots, S3 copies) and your IaC code', 'hours', 'hours (age of last backup)', '1x (storage only)'],
        ['<b>Pilot light</b>', 'the <b>data</b> is replicated live (DB replica); servers are <b>off</b> or at zero; images and templates ready', 'tens of minutes', 'seconds to minutes', 'about 1.1-1.3x'],
        ['<b>Warm standby</b>', 'a <b>complete but small</b> copy of the stack always running, takes no or little traffic; scale up on failover', 'minutes', 'seconds', 'about 1.3-1.6x'],
        ['<b>Multi-site active/active</b>', 'full stack in 2+ Regions, <b>all serving live traffic</b>', 'near zero (traffic shifts)', 'near zero (but see consistency in topic 4)', 'about 2x or more']
      ])}
      <p>The cost column is a rule of thumb, not a price list: the multiplier depends on how much of your bill is data versus compute, and on cross-Region transfer.</p>
      <p>🔵 <b>Choose per workload, not per company.</b> Classify each system by what an hour of outage and an hour of lost data costs. A payments ledger might need RTO 5 minutes and RPO about 0. A nightly reporting warehouse can live with RTO 24 hours and RPO 24 hours. Giving both the same tier wastes money on one or risks the business on the other. Write the answer down as a table, get the business owner to sign it, and review it every year.</p>
      <p>🔵 <b>DR is not just backup.</b> A restore plan has parts people forget:</p>
      <ul><li><b>Data</b>: backups copied to another Region <em>and another account</em>, immutable (S3 Object Lock, AWS Backup Vault Lock) so ransomware or an angry admin cannot delete them. A replica copies a bad <code>DELETE</code> too, so replication is for availability, backups are for corruption.</li>
      <li><b>Infrastructure as code</b> that can build the stack in the DR Region, kept in sync (drift is the number one reason DR fails).</li>
      <li><b>Regional things that do not copy by themselves</b>: AMIs, KMS keys, Secrets Manager secrets, ECR images, parameters, certificates, service quotas in the DR Region.</li>
      <li><b>Traffic switch</b>: DNS failover (Route 53 health checks, low TTL) or Global Accelerator; a decision rule for <em>who</em> pushes the button.</li>
      <li><b>People and runbooks</b> stored <em>outside</em> the failed Region (a wiki hosted in us-east-1 is not available during a us-east-1 outage).</li>
      <li><b>Failback</b>: returning to the primary Region safely is a second migration.</li></ul>
      <p>🔵 <b>Test it.</b> An untested DR plan is a hope. Schedule <b>game days</b>: switch real or production-like traffic to the DR Region, time it, and fix what broke. Measure the achieved RTO and RPO and compare with the targets.</p>`,
    clues: ['"RTO of 4 hours, RPO of 24 hours" → <b>backup &amp; restore</b> is enough', '"RPO of minutes, RTO under an hour, keep cost low" → <b>pilot light</b>', '"RTO of a few minutes" and "cannot afford to wait for servers to boot" → <b>warm standby</b>', '"no downtime" or "RPO near zero" or "users in several continents" → <b>multi-site active/active</b> (and expect a consistency trade-off)', '"they deleted the production table and the replica deleted it too" → you need <b>point-in-time backups</b>, not only replication', '"ransomware" or "compromised admin" → <b>immutable backups in a separate account</b>', '"the DR test failed" → quotas, AMIs, KMS keys, secrets, DNS TTL, runbook in the failed Region', '"how do we know it works?" → <b>game days</b> and measured RTO/RPO'],
    code: [HC(R`# AWS Backup: daily backups with a copy to a vault in another Region. Run with a sandbox account; backups cost per GB-month.
resource "aws_backup_vault" "primary" {
  name = "prod-vault-use1"
}

resource "aws_backup_vault" "dr" {
  provider = aws.usw2                   # a second provider alias for the DR Region
  name     = "prod-vault-usw2"
}

resource "aws_backup_plan" "daily" {
  name = "prod-daily"

  rule {
    rule_name         = "daily-35d-copy"
    target_vault_name = aws_backup_vault.primary.name
    schedule          = "cron(0 3 * * ? *)"            # 03:00 UTC every day
    lifecycle { delete_after = 35 }

    copy_action {
      destination_vault_arn = aws_backup_vault.dr.arn   # cross-Region copy = the "restore" half of backup & restore
      lifecycle { delete_after = 35 }
    }
  }
}

resource "aws_backup_selection" "tagged" {
  name         = "tagged-backup-true"
  plan_id      = aws_backup_plan.daily.id
  iam_role_arn = "arn:aws:iam::123456789012:role/service-role/AWSBackupDefaultServiceRole"

  selection_tag {
    type  = "STRINGEQUALS"
    key   = "backup"
    value = "true"                      # tag resources instead of listing ARNs
  }
}`, 'Terraform: cross-Region backup plan'),
      SH(R`#!/usr/bin/env bash
# Pilot-light failover runbook (outline). Account 123456789012. Region names are examples.
# DR Region already has: a read replica of the DB, AMIs/images, a launch template, an ASG at 0.
set -euo pipefail
DR=us-west-2

# 1) Confirm the primary Region is really unavailable (do not fail over on a hunch)
#    -> check the AWS Health Dashboard + your own synthetic checks from a third place.

# 2) Promote the cross-Region replica to a standalone writable database
aws rds promote-read-replica --region "$DR" --db-instance-identifier orders-pg-dr

# 3) Scale the app tier from zero to the target (quotas in the DR Region must already allow this)
aws autoscaling update-auto-scaling-group --region "$DR" --auto-scaling-group-name orders-dr \
  --min-size 4 --desired-capacity 4 --max-size 12

# 4) Wait until the load balancer has healthy targets
aws elbv2 wait target-in-service --region "$DR" --target-group-arn "arn:aws:elasticloadbalancing:us-west-2:123456789012:targetgroup/orders-dr/0123456789abcdef"

# 5) Switch traffic (low TTL record prepared in advance; a manual change is the last step, taken by the incident commander)
aws route53 change-resource-record-sets --hosted-zone-id Z0123456789EXAMPLE --change-batch file://failover-to-dr.json

# 6) Record the timeline: failure time, decision time, traffic-switched time = achieved RTO.
echo "Recovered at $(date -u +%FT%TZ)"`, 'Bash: pilot-light failover runbook')],
    codeTitle: ['Terraform (HCL): backup plan with cross-Region copy', 'Bash: pilot-light failover runbook (outline)'],
    viz: [{
      title: 'Which DR tier fits? Enter RTO and RPO',
      input: '30,120',
      inputLabel: 'RTO in minutes, RPO in seconds (e.g. 30,120)',
      gen: function (input) {
        var v = nums(input, 'two numbers: RTO minutes, RPO seconds (e.g. 30,120)', 2);
        if (v.length !== 2 || v[0] < 0 || v[1] < 0) throw new Error('Type two non-negative numbers, e.g. 30,120');
        var rto = v[0], rpo = v[1], pick = pickTier(rto, rpo);
        var rows = TIERS.map(function (t) { return [t.name, t.rto + ' min', t.rpo + ' s', t.cost + 'x', t.rto <= rto && t.rpo <= rpo ? 'meets' : 'too slow']; });
        var hl = {}; TIERS.forEach(function (t, i) { hl[i] = t.name === pick ? 'ok' : (t.rto <= rto && t.rpo <= rpo ? 'win' : 'bad'); });
        var f = [];
        f.push({ narr: 'The business asks for <b>RTO ' + rto + ' min</b> (back online within) and <b>RPO ' + rpo + ' s</b> (lose at most). Planning numbers for the four tiers are in the table below; they are illustrative round numbers, not guarantees.', parts: [{ type: 'table', label: 'Tier planning numbers', columns: ['Tier', 'Achievable RTO', 'Achievable RPO', 'Relative cost', 'vs request'], rows: TIERS.map(function (t) { return [t.name, t.rto + ' min', t.rpo + ' s', t.cost + 'x', '?']; }) }] });
        f.push({ narr: 'A tier <b>meets</b> the request only if its achievable RTO is at most ' + rto + ' min <b>and</b> its achievable RPO is at most ' + rpo + ' s. Both must hold.', parts: [{ type: 'table', label: 'Check each tier', columns: ['Tier', 'Achievable RTO', 'Achievable RPO', 'Relative cost', 'vs request'], rows: rows, hl: hl }] });
        f.push({ narr: pick === 'none' ? '<b>No tier meets this.</b> RTO or RPO is tighter than even active/active planning numbers. That needs a custom design (synchronous multi-AZ plus application-level handling) and a conversation about whether the target is realistic.' : 'Tiers are ordered by cost, so the answer is the <b>first (cheapest) tier that meets both numbers</b>: <b>' + pick + '</b>.', parts: [{ type: 'vars', label: 'Decision', vals: { RTO: rto + ' min', RPO: rpo + ' s', tier: pick }, hl: { tier: 'sel' } }] });
        var cost = TIERS.filter(function (t) { return t.name === pick; })[0];
        f.push({ narr: 'Before you sign off: a plan on paper is not proof. Run a game day, measure the <b>achieved</b> RTO and RPO, and compare. The usual gaps: replication lag larger than the RPO, quotas in the DR Region, missing keys or secrets, DNS TTL longer than the RTO.', parts: [{ type: 'text', label: 'Next step', html: pick === 'none' ? 'Renegotiate the target or design a custom solution.' : 'Chosen tier <b>' + pick + '</b> at about <b>' + cost.cost + 'x</b> relative cost. Schedule a game day within the quarter.' }] });
        return f;
      }
    }],
    examples: [
      { title: 'Payments vs reporting: two systems, two tiers', html: `<p><b>Payments API</b>: each minute of downtime loses about $20,000 of revenue and failed payments cause chargebacks; losing paid-but-unrecorded orders is unacceptable. Target RTO 5 minutes, RPO under 10 seconds &rarr; <b>warm standby</b> (or active/active for the stateless tier) with an Aurora Global Database and a monitored lag alarm. <b>Reporting warehouse</b>: refreshed nightly from the source systems, used by analysts in business hours. Target RTO 24 hours, RPO 24 hours &rarr; <b>backup &amp; restore</b>: it can be rebuilt from the source systems plus the IaC code. Total DR spend is far lower than putting both on the expensive tier, and the risk is matched to the business, not to habit.</p>` },
      { title: 'The failover that never worked (because it was never tested)', html: `<p>A company ran a pilot-light DR design for two years. When the primary Region had a serious outage, the team promoted the replica, but: (1) the DR autoscaling group asked for 40 instances and the account's vCPU quota in the DR Region allowed 8; (2) the AMI was last copied 14 months earlier and the app would not start against the new schema; (3) the KMS key and database password secret did not exist in the DR Region; (4) the DNS TTL on the main record was 24 hours; (5) the runbook lived in the wiki hosted in the failed Region. The achieved RTO was 9 hours against a target of 1 hour. <b>Fix:</b> quarterly game days that fail over for real, quotas raised and alarmed, AMI and image copy in the pipeline, secrets replication, TTL 60 s, runbook printed and mirrored elsewhere.</p>` },
      { title: 'RPO missed because replication lag was not monitored', html: `<p>The design said RPO 1 minute using a cross-Region replica. Nobody alarmed on replica lag. A batch job ran a large update that day and lag grew to 14 minutes; when the Region failed during that window, 14 minutes of orders were gone. <b>Fix:</b> alarm on lag against the RPO (page at 50% of it), throttle or schedule big batch writes, keep a replayable event log (Kafka/SQS/outbox) so lost writes can be re-applied, and report achieved RPO in the weekly health review.</p>` }
    ],
    deepDive: `<p>🟣 <b>Defining the numbers properly.</b> RTO should include detection time, decision time (who may declare a disaster?), technical recovery and verification, not only "the script runtime". Many teams find that decision time is half of the RTO. Write a <b>declaration criterion</b> in advance ("Region unavailable for more than 15 minutes and AWS Health confirms") and an owner.</p>
      <p>🟣 <b>Backups vs replication vs archives.</b> Replication protects against hardware and Region loss, but copies mistakes instantly. Backups with point-in-time recovery protect against corruption and deletion. Archives (Glacier-class, WORM) protect against long-term retention and legal needs. A real design uses all three with different retention.</p>
      <p>🟣 <b>Cross-account and immutability.</b> Copy backups to a <b>separate AWS account</b> in the organisation with its own admins, with Vault Lock in compliance mode (nobody, including root, can delete before the retention ends). This is the ransomware answer. Test restores into an isolated account and verify the data (row counts, checksums, an application smoke test), because a backup that cannot be restored is not a backup.</p>
      <p>🟣 <b>Control plane vs data plane.</b> During a large regional event, API calls that <em>change</em> things (control plane: create instances, change DNS records) may fail or be slow, while things already running (data plane: serving traffic, answering DNS, DNS health checks) keep working. Good DR designs rely on data-plane actions at failover time: pre-provisioned capacity, health-check driven DNS failover, pre-created records, rather than "we will create 40 instances during the outage". Route 53 health checks and answering DNS are data-plane; editing records goes through a control plane that is in us-east-1, so do not plan to <em>edit</em> DNS in the disaster window; let health checks flip pre-built records or use Route 53 Application Recovery Controller routing controls.</p>
      <p>🟣 <b>Cost shape.</b> Backup &amp; restore costs storage plus cross-Region copy (priced per GB) and the cost of your drill. Pilot light adds the replica database instance(s) running 24/7 and replicated data. Warm standby adds a fully running small stack. Active/active doubles compute, and adds the complexity budget of multi-writer data. Reduce cost with Reserved/Savings Plans for the always-on part, smaller replica sizes, and Graviton (see topic 5).</p>
      <p>🟣 <b>Failback and data reconciliation.</b> After running in the DR Region, new data exists only there. Failing back means reverse replication, a quiet window or controlled drain, and verification. Plan it as carefully as the failover, and decide whether to simply <em>stay</em> in the new Region and rebuild the old one as the standby.</p>`,
    aiEra: `<p>🤖 Assistants produce a confident "DR plan" in seconds, usually a generic list ("replicate data, use multiple AZs"). It rarely has your numbers, your quotas or your dependencies. Better use: give it the inventory of one system (databases, queues, secrets, DNS, third-party callbacks) and ask for the <b>failure-mode table</b> with what must exist in the DR Region for each item, and a draft runbook with timings. Then review for the classic gaps (KMS, secrets, quotas, IAM, certificates, DNS TTL, runbook location). Use AI to analyse game day logs and compute achieved RTO per step. Never let a generated plan stand in for a real test; the only evidence is a timed failover that you did.</p>`,
    problems: [P({
      t: 'Choose the cheapest DR tier that meets an RTO and RPO',
      l: 'Easy', tags: ['DR', 'RTO', 'RPO', 'cost'], co: ['Amazon', 'Capital One'],
      lang: 'python',
      s: `<p>Use these planning numbers (cheapest first):</p>${H.table(['Tier', 'RTO (minutes)', 'RPO (seconds)', 'Cost'], [['backup-restore', '480', '3600', '1x'], ['pilot-light', '60', '300', '3x'], ['warm-standby', '10', '60', '8x'], ['multi-site', '1', '1', '16x']])}<p>Write <code>pick_tier(rto_min, rpo_sec)</code> that returns the name of the <b>cheapest tier whose RTO and RPO are both at most the requested values</b>, or <code>"none"</code> if no tier is good enough. Then use it to pick tiers for a payments ledger (RTO 10 min, RPO 60 s) and a reporting warehouse (RTO 1,440 min, RPO 86,400 s) and explain the cost difference.</p>`,
      c: `<ul><li>0 ≤ rto_min, rpo_sec ≤ 10<sup>7</sup>.</li><li>${DESIGN}</li></ul>`,
      ex: `<p><code>(10, 60)</code> &rarr; <span class="c-g">warm-standby</span> (8x). <code>(1440, 86400)</code> &rarr; <span class="c-g">backup-restore</span> (1x). <code>(0, 1)</code> &rarr; <span class="c-r">none</span>: nothing recovers in zero minutes.</p>`,
      bw: `<p>"Everything important gets multi-site." At 16x it burns budget on systems that can tolerate hours of downtime, and it still fails the first game day if nobody tests it. Or the opposite: "everything is backup and restore" for a payments system that loses revenue every minute.</p>`,
      q: ['A system needs RTO 90 minutes and RPO 5 minutes. Using the table, which is the cheapest tier that meets both?', ['pilot-light', 'backup-restore', 'warm-standby', 'multi-site'], 0, 'Backup-restore has RTO 480 min, too slow. Pilot light has RTO 60 min (within 90) and RPO 300 s = 5 min (exactly within), so it is the cheapest that meets both.'],
      h: ['Hint 1: the tiers are already listed from cheapest to most expensive.', 'Hint 2: a tier meets the request when <b>both</b> its RTO ≤ requested RTO and its RPO ≤ requested RPO.', 'Hint 3: return the first tier that meets both; if the loop ends, return "none".'],
      a: `<p>Walk the tiers in cost order and return the first one where both numbers are good enough. Because costs rise along the list, the first match is the cheapest. Payments (10 min, 60 s) fails backup-restore and pilot-light on RTO (480 and 60 are above 10) and first fits <b>warm-standby</b>. Reporting (1,440 min, 86,400 s) fits <b>backup-restore</b> immediately. The cost ratio is 8x to 1x per unit of baseline infrastructure, which is why DR tiers are chosen <em>per system</em>.</p>`,
      code: PY(R`TIERS = [
    ("backup-restore", 480, 3600),
    ("pilot-light", 60, 300),
    ("warm-standby", 10, 60),
    ("multi-site", 1, 1),
]


def pick_tier(rto_min, rpo_sec):
    """Cheapest tier whose RTO and RPO are both within the request, else 'none'."""
    for name, tier_rto, tier_rpo in TIERS:      # ordered cheapest first
        if tier_rto <= rto_min and tier_rpo <= rpo_sec:
            return name
    return "none"`),
      cx: `<p>O(1): at most four comparisons.</p>`,
      f: ['What would you add to the table to prefer a tier that already exists in the account?', 'How would you model the monthly cost for a system with a 2 TB database?'],
      tests: { sig: 'int int -> string', fn: 'pick_tier', names: { python: 'pick_tier' }, cases: [
        [[600, 7200], 'backup-restore'], [[480, 3600], 'backup-restore'], [[479, 3600], 'pilot-light'], [[480, 3599], 'pilot-light'],
        [[60, 300], 'pilot-light'], [[59, 300], 'warm-standby'], [[60, 299], 'warm-standby'], [[10, 60], 'warm-standby'],
        [[9, 60], 'multi-site'], [[1, 1], 'multi-site'], [[0, 1], 'none'], [[1, 0], 'none'], [[1440, 86400], 'backup-restore']
      ] }
    }), P({
      t: 'Design the DR plan for a payments system and a reporting system',
      l: 'Hard', tags: ['DR', 'design', 'game day'], co: ['Stripe', 'PayPal'],
      s: `<p>Two systems share one AWS account in <code>us-east-1</code>. <b>Payments</b>: ALB, 12 ECS tasks, Aurora PostgreSQL (800 GB), SQS, Secrets Manager, KMS; revenue about $20,000 per minute. <b>Reporting</b>: Redshift loaded nightly from S3, 6 TB, used 9-to-5 by analysts. Produce for each system: the RTO/RPO you would negotiate, the DR tier, what exists in the second Region (<code>us-west-2</code>) before a disaster, the failover steps with expected times, how you detect replication lag, the game-day schedule, and a rough monthly cost multiplier. Also describe how you protect against a <b>ransomware or accidental delete</b> scenario, which replication alone does not solve.</p>`,
      c: LAB_AWS,
      ex: `<p>Payments: RTO 5 min, RPO 10 s &rarr; warm standby in us-west-2 (Aurora Global secondary, 2 ECS tasks, scale to 12 by pre-set policy). Reporting: RTO 24 h, RPO 24 h &rarr; backup &amp; restore from S3 copies and IaC. <span class="c-g">Both documented, tested twice a year.</span></p>`,
      bw: `<p>"Take snapshots and copy them to another Region for everything." For payments that gives RPO of hours and an RTO of hours of restoring 800 GB while losing $1.2 million an hour. For reporting it is fine but untested.</p>`,
      q: ['Which control protects against a malicious or accidental DELETE that replication already copied to the DR Region?', ['Immutable, point-in-time backups in a separate account (Vault Lock / Object Lock)', 'A second read replica', 'A larger instance', 'A lower DNS TTL'], 0, 'Replication copies deletes. You need versioned or point-in-time backups, ideally immutable and in another account, so nobody (including a compromised admin) can remove them.'],
      h: ['Hint 1: start from money: minutes of downtime x cost per minute, and what a lost minute of orders costs.', 'Hint 2: list what does <b>not</b> replicate on its own: KMS keys, secrets, AMIs/images, quotas, DNS, certificates.', 'Hint 3: write the failover as numbered steps with a time estimate, and the game-day plan that proves each step.'],
      a: `<p><b>Payments (warm standby).</b> RTO 5 min, RPO 10 s. In us-west-2 before any disaster: an <b>Aurora Global Database</b> secondary cluster (storage-based replication, usually under a second of lag), an ECS service with 2 tasks behind an ALB (and tested to scale to 12 with pre-raised quotas), SQS queues recreated by IaC (messages in flight are accepted loss, or use idempotent re-submission), KMS multi-Region keys, Secrets Manager replication, ECR image replication, ACM certificate. <b>Failover:</b> (1) alarm + synthetic checks from a third location fire, incident commander declares (2 min); (2) promote the Aurora secondary with the global-database failover (about 1 min); (3) scale ECS (about 2 min with warm capacity); (4) Route 53 failover record or ARC routing control flips (TTL 60 s). Total about 5-6 min, so the target is tight and must be rehearsed. <b>Lag:</b> CloudWatch <code>AuroraGlobalDBReplicationLag</code> alarm at 5 s, page at 10 s, plus (for Aurora PostgreSQL) the <code>rds.global_db_rpo</code> setting to enforce the RPO. Cost: roughly 1.4x for this stack.</p>
        <p><b>Reporting (backup &amp; restore).</b> RTO 24 h, RPO 24 h. Redshift snapshots with cross-Region copy, source data in S3 with replication, Terraform to rebuild the cluster. Cost: roughly 1.05x. <b>Both:</b> AWS Backup with a copy into a separate backup account with Vault Lock, so a malicious delete or ransomware cannot remove history; monthly restore tests that load a copy and run checks. <b>Game days:</b> payments full failover twice a year (first in staging, then in production at a quiet hour with real traffic shifted), reporting restore once a year. Each game day produces a measured RTO/RPO and a list of fixes with owners.</p>`,
      code: SH(R`# Lag alarm for the payments Aurora Global secondary (placeholder names). SNS topic receives the page.
aws cloudwatch put-metric-alarm --region us-west-2 \
  --alarm-name payments-global-lag-high \
  --namespace AWS/RDS --metric-name AuroraGlobalDBReplicationLag \
  --dimensions Name=DBClusterIdentifier,Value=payments-secondary \
  --statistic Maximum --period 60 --evaluation-periods 3 --threshold 5000 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions arn:aws:sns:us-west-2:123456789012:oncall-page   # metric is in milliseconds; 5000 = 5 s`, 'Bash: replication-lag alarm against the RPO'),
      cx: `<p>The design is judged by the numbers and tests, not by code. Expect each game day to find at least three gaps the first time.</p>`,
      f: ['What would change if the company needed active/active for payments?', 'How do you rehearse failover without risking real customer traffic?']
    })]
  });

  // ───────────────────────── Topic 4: multi-region deployments ─────────────────────────
  topics.push({
    title: 'Multi-Region Deployments: Failover Routing, Global Data, Active-Active vs Active-Passive, Split Brain',
    analogy: `<p>A bank has branches in two cities. Customers phone one number; the phone company decides which branch answers. If branch A burns down, the phone company reroutes to branch B (<b>active-passive</b>). But B only knows about deposits that were copied over before the fire, so the last few minutes may be missing. Or both branches serve customers all day and copy their ledgers to each other (<b>active-active</b>). Faster for customers, no waiting on a fire, but now two branches can edit the same account at the same moment and must decide whose edit wins. And if the phone line between branches is cut while both stay open, each branch thinks <em>it</em> is the only one left and keeps the master ledger: that is <b>split brain</b>.</p>`,
    explain: `<p>🟢 <b>Why go multi-Region at all?</b> Three honest reasons: (1) survive a whole-Region failure (rare, but it has happened and lasts hours); (2) lower latency for users far from one Region; (3) data-residency law (EU data stays in the EU). The honest cost: roughly double infrastructure, new failure modes, cross-Region data transfer, and application changes. <b>Multi-AZ already covers most outages</b> (power, network, a rack). Go multi-Region when the business case needs it, not because it sounds safer.</p>
      ${H.table(['', 'Active-passive', 'Active-active'], [
        ['Traffic', 'all users go to the primary; the second Region waits (cold, pilot light or warm)', 'users are served by <b>both</b> Regions (nearest healthy)'],
        ['Writes', 'one writer: the primary', 'either writes (needs conflict handling) <b>or</b> each user/tenant has a "home" Region that owns their writes'],
        ['Failover', 'decision + promotion + traffic switch: minutes', 'traffic shifts; the data question remains for the failed Region'],
        ['Complexity', 'moderate; the pain is testing the standby', 'high; data consistency is the main design problem'],
        ['Cost', '1.1-1.6x', 'about 2x'],
        ['Good for', 'most systems that need RTO of minutes', 'global products; zero-downtime needs; read-heavy workloads']
      ])}
      <p>🟢 <b>Routing users to a Region (Route 53).</b></p>
      ${H.table(['Policy', 'What it does', 'Use it for'], [
        ['<b>Failover</b>', 'primary record while its <b>health check</b> passes, otherwise the secondary', 'active-passive'],
        ['<b>Latency</b>', 'answers with the Region giving the lowest measured latency to the user; can combine with health checks (unhealthy Regions are skipped)', 'active-active'],
        ['<b>Weighted</b>', 'splits by weight (95/5); weight 0 drains a Region', 'gradual shift, canary, planned maintenance'],
        ['<b>Geolocation</b>', 'by user country/continent', 'residency rules, language'],
        ['<b>Global Accelerator</b> (not DNS)', 'static anycast IPs; traffic enters AWS at the nearest edge and goes to healthy endpoints; failover in seconds, no DNS caching', 'when DNS TTL and resolver caching are too slow']
      ])}
      <p>Health-check timing sets part of your RTO. A "fast" health check runs every 10 s (standard is 30 s), and it marks a target unhealthy after the <b>failure threshold</b> (default 3) failures. Then clients keep the old answer until their DNS cache expires (<b>TTL</b>, for example 60 s). So: detect ≈ 10 x 3 = 30 s, plus up to 60 s of caching, plus any promotion work. DNS-based failover is never instant, and some resolvers ignore low TTLs.</p>
      <p>🔵 <b>Moving the data (intro).</b></p>
      ${H.table(['Service', 'How it replicates', 'Good to know'], [
        ['<b>Aurora Global Database</b>', 'storage-level replication to up to 5 read-only secondary Regions, usually under 1 s lag', 'one writer Region; <b>planned switchover</b> loses nothing; <b>unplanned failover</b> (detach and promote) can lose the lag; RTO in minutes; write forwarding lets secondaries accept writes by forwarding them to the primary'],
        ['<b>S3 Cross-Region Replication (CRR)</b>', 'asynchronous copy of new objects to another bucket (versioning required on both)', 'most objects in seconds-minutes; <b>Replication Time Control</b> gives a 15-minute SLA and metrics; existing objects need Batch Replication; Multi-Region Access Points give one endpoint with failover'],
        ['<b>DynamoDB global tables</b>', 'multi-Region, <b>multi-active</b>: every replica accepts writes', 'typically under a second between Regions; conflicts resolve by <b>last writer wins</b> (timestamp); strongly consistent reads only see writes made in the same Region (a newer multi-Region strong-consistency option exists, with limits)'],
        ['<b>ElastiCache Global Datastore</b>, <b>RDS cross-Region replica</b>', 'async replication to a read replica you can promote', 'RDS replicas: promotion takes minutes and loses un-applied changes']
      ])}
      <p>🔵 <b>Consistency in plain words.</b> Light travels about 60-80 ms round-trip between US East and US West or Europe. A <b>synchronous</b> cross-Region commit would add that to every write, so almost everything uses <b>asynchronous</b> replication: fast writes, but the other Region is a little behind (replication lag). That is the RPO. Active-active adds the question: two Regions change the same record at the same time, what is the final value?</p>
      <ul><li><b>Avoid conflicts</b> by giving every record one owner: a user's <em>home Region</em> takes their writes; others read.</li>
      <li><b>Resolve conflicts</b> with a rule: last writer wins (simple; can lose an update), merge (add-only sets, counters/CRDTs), or ask the app.</li>
      <li><b>Make writes mergeable</b>: append events instead of overwriting a field ("add item X to cart" not "set cart to [...]").</li></ul>
      <p>🔵 <b>Split brain.</b> If a network partition separates the Regions, a naive "promote the standby when the primary seems dead" gives you <b>two writable primaries</b> with diverging data, which is far worse than an outage. Defences: decide failover from <b>a third vantage point</b> (health checks from several places, a human or a quorum arbiter); <b>fence</b> the old primary (revoke its write role, shut it down, or use a lease that expires) before promoting; use managed promotion (Aurora needs an explicit detach); and prefer systems that make single-writer a hard rule.</p>`,
    clues: ['"survive a Region outage" with "RTO of minutes" → <b>active-passive</b> (warm standby) with Route 53 failover and a global database', '"users on three continents" or "latency under 100 ms everywhere" → <b>latency routing</b>, active-active reads, home-Region writes', '"DNS failover is too slow" → lower TTL, fast health checks, or <b>Global Accelerator</b>', '"two Regions updated the same item" → conflict resolution: <b>last writer wins</b>, merge, or home Region', '"both sites think they are primary" → <b>split brain</b>: fencing, quorum, third vantage point', '"RPO of seconds across Regions" → async replication + <b>lag monitoring</b>; "RPO of zero" → synchronous (high latency) or accept a single-Region write path', '"EU customer data must stay in the EU" → geolocation routing + Regional data stores, not global replication', '"how do you know failover works?" → <b>game day</b> with timed results'],
    code: [JS(R`{
  "Comment": "Failover records for api.example.com. Primary is us-east-1 (health checked), secondary is us-west-2. TTL 60 s.",
  "Changes": [
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "api.example.com.",
        "Type": "A",
        "SetIdentifier": "primary-use1",
        "Failover": "PRIMARY",
        "HealthCheckId": "11111111-2222-3333-4444-555555555555",
        "AliasTarget": {
          "HostedZoneId": "Z35SXDOTRQ7X7K",
          "DNSName": "orders-use1-1234567890.us-east-1.elb.amazonaws.com.",
          "EvaluateTargetHealth": true
        }
      }
    },
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "api.example.com.",
        "Type": "A",
        "SetIdentifier": "secondary-usw2",
        "Failover": "SECONDARY",
        "AliasTarget": {
          "HostedZoneId": "Z1H1FL5HABSF5",
          "DNSName": "orders-usw2-0987654321.us-west-2.elb.amazonaws.com.",
          "EvaluateTargetHealth": true
        }
      }
    }
  ]
}`, 'JSON: Route 53 failover records (placeholders)'),
      SH(R`#!/usr/bin/env bash
# Aurora Global Database, step by step. COST WARNING: a second cluster bills per hour (instances + I/O + storage)
# plus cross-Region replication transfer. Use the smallest instance class, one hour, then delete in reverse order.
set -euo pipefail

# 1) A regional cluster in the primary Region (assumed to exist): orders-use1. Get its ARN.
PRIMARY_ARN=$(aws rds describe-db-clusters --region us-east-1 --db-cluster-identifier orders-use1 \
  --query 'DBClusters[0].DBClusterArn' --output text)

# 2) Promote it into a global cluster
aws rds create-global-cluster --region us-east-1 --global-cluster-identifier orders-global \
  --source-db-cluster-identifier "$PRIMARY_ARN"

# 3) Add a read-only secondary Region (no master password here: it comes from the primary)
aws rds create-db-cluster --region us-west-2 --db-cluster-identifier orders-usw2 \
  --engine aurora-postgresql --global-cluster-identifier orders-global \
  --kms-key-id alias/aws/rds
aws rds create-db-instance --region us-west-2 --db-instance-identifier orders-usw2-1 \
  --db-cluster-identifier orders-usw2 --db-instance-class db.r6g.large --engine aurora-postgresql

# 4) Drill A: PLANNED switchover (no data loss; use for game days and maintenance)
aws rds failover-global-cluster --region us-east-1 --global-cluster-identifier orders-global \
  --target-db-cluster-identifier "arn:aws:rds:us-west-2:123456789012:cluster:orders-usw2" --switchover

# 5) Drill B: UNPLANNED failover when the primary Region is gone (can lose the replication lag)
# aws rds failover-global-cluster --region us-west-2 --global-cluster-identifier orders-global \
#   --target-db-cluster-identifier "arn:aws:rds:us-west-2:123456789012:cluster:orders-usw2" --allow-data-loss

# 6) Watch lag (milliseconds)
aws cloudwatch get-metric-statistics --region us-west-2 --namespace AWS/RDS \
  --metric-name AuroraGlobalDBReplicationLag --dimensions Name=DBClusterIdentifier,Value=orders-usw2 \
  --start-time "$(date -u -d '-15 min' +%Y-%m-%dT%H:%M:%SZ)" --end-time "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --period 60 --statistics Maximum --output table`, 'Bash: Aurora Global Database with switchover and failover'),
      JS(R`{
  "Role": "arn:aws:iam::123456789012:role/s3-crr-role",
  "Rules": [
    {
      "ID": "replicate-all-with-rtc",
      "Status": "Enabled",
      "Priority": 1,
      "Filter": {},
      "DeleteMarkerReplication": { "Status": "Enabled" },
      "Destination": {
        "Bucket": "arn:aws:s3:::orders-archive-usw2-123456789012",
        "StorageClass": "STANDARD",
        "ReplicationTime": { "Status": "Enabled", "Time": { "Minutes": 15 } },
        "Metrics": { "Status": "Enabled", "EventThreshold": { "Minutes": 15 } }
      }
    }
  ]
}`, 'JSON: S3 replication rule with Replication Time Control'),
      PY(R`# Worst-case failover timeline for DNS-based failover. Standard library only.

def failover_budget(interval_s, threshold, ttl_s, promote_s, scale_s, decision_s):
    """Return the stages (name, seconds) of a worst-case Route 53 failover."""
    detect = interval_s * threshold            # health checker needs 'threshold' failed checks in a row
    return [
        ("detect failure", detect),
        ("human/auto decision", decision_s),
        ("promote database", promote_s),
        ("scale compute", scale_s),
        ("clients' cached DNS expires", ttl_s),   # resolvers may keep the old answer this long
    ]


if __name__ == "__main__":
    for label, args in [("fast checks, warm standby", (10, 3, 60, 60, 120, 120)),
                        ("standard checks, pilot light", (30, 3, 300, 90, 900, 600))]:
        stages = failover_budget(*args)
        total = sum(s for _, s in stages)
        print(label)
        for name, sec in stages:
            print("  %-30s %5d s" % (name, sec))
        print("  %-30s %5d s (= %.1f min)" % ("worst-case RTO", total, total / 60))`, 'Python (runs): where the RTO goes')],
    codeTitle: ['JSON: Route 53 failover records', 'Bash: Aurora Global Database drill', 'JSON: S3 CRR with RTC', 'Python (runs): RTO budget of a DNS failover'],
    viz: [{
      title: 'Region failure timeline: what is lost, how long is it down',
      input: '20,60',
      inputLabel: 'replication lag in seconds, DNS TTL in seconds',
      gen: function (input) {
        var v = nums(input, 'two numbers: lag seconds, DNS TTL seconds (e.g. 20,60)', 2);
        if (v.length !== 2 || v[0] < 0 || v[1] < 0) throw new Error('Type two non-negative numbers, e.g. 20,60');
        var lag = v[0], ttl = v[1], detect = 30, promote = 60, scale = 90, total = detect + promote + scale + ttl;
        var nodes = [box('u', 'Users', 4, 4, 14), box('r', 'Route 53', 4, 30, 16), box('a', 'us-east-1 (primary)', 40, 4, 24), box('b', 'us-west-2 (standby)', 40, 34, 24), box('d1', 'DB primary', 76, 4, 18), box('d2', 'DB replica', 76, 34, 18)];
        var edges = [['u', 'r'], ['r', 'a'], ['a', 'd1'], ['d1', 'd2', 'lag ' + lag + 's'], ['b', 'd2']];
        function g(narr, hl, tags, ed, ehl) { return { narr: narr, parts: [{ type: 'graph', label: 'Active-passive across Regions', directed: true, height: 46, nodes: nodes, edges: ed || edges, hl: hl || {}, ehl: ehl || {}, tags: tags || {} }] }; }
        var f = [];
        f.push(g('Normal day. Users resolve the name to us-east-1. Every write there is copied to the replica in us-west-2 <b>asynchronously</b>; the copy runs about <b>' + lag + ' s</b> behind.', { a: 'ok', b: 'done' }));
        f.push(g('The primary Region fails. The last <b>' + lag + ' s</b> of committed writes never reached the replica. That is the <b>data lost (actual RPO)</b>. Monitoring the lag is how you know this number before the disaster.', { a: 'bad', d1: 'bad' }, { d1: 'LOST: ' + lag + ' s' }, edges, { 'a-d1': 'bad' }));
        f.push(g('Route 53 health checks fail 3 times in a row (about <b>' + detect + ' s</b> with 10 s checks). Only then is the primary marked unhealthy.', { a: 'bad', r: 'cur' }, { r: 'detect ' + detect + 's' }));
        f.push(g('The replica is promoted to a writable primary (about <b>' + promote + ' s</b>) and the standby app tier scales up (about <b>' + scale + ' s</b>). Done ahead of time with warm capacity, scaling shrinks.', { b: 'cur', d2: 'cur' }, { d2: 'promote ' + promote + 's', b: 'scale ' + scale + 's' }));
        f.push(g('Record answers flip to us-west-2, but clients keep the cached old answer for up to the TTL (<b>' + ttl + ' s</b>). Then traffic arrives. <b>Worst-case RTO = ' + total + ' s (' + (total / 60).toFixed(1) + ' min)</b>. Lower TTL and warm capacity shrink it; Global Accelerator removes the DNS part.', { b: 'ok', d2: 'ok', r: 'ok' }, { b: 'serving', d2: 'primary now' }, [['u', 'r'], ['r', 'b'], ['b', 'd2']], { 'r-b': 'ok' }));
        f.push({ narr: 'Summary for the review meeting. Compare to the target and decide what to change.', parts: [{ type: 'table', label: 'Achieved vs typical targets', columns: ['Measure', 'This scenario', 'Typical warm-standby target'], rows: [['RPO (data lost)', lag + ' s', '&lt; 10 s'], ['RTO (worst case)', total + ' s', '&lt; 300 s'], ['Biggest single piece', ttl >= 90 ? 'DNS TTL' : 'scaling', '']] }] });
        return f;
      }
    }],
    examples: [
      { title: 'The split-brain incident', html: `<p>A team ran PostgreSQL in two Regions with a script: "if the primary does not answer 3 pings from the standby, promote the standby". A network partition broke the link between Regions but not the users' connections. The standby promoted itself; both databases accepted orders for 40 minutes. Reconciling 1,900 diverging orders took three engineers two days, and some customers were charged twice. <b>Fixes:</b> decisions come from a <b>third location</b> (not from the standby itself), promotion first <b>fences</b> the old primary (revoke the writer's database role, stop the app tier), Aurora Global Database or a managed service enforces one writer, and every payment carries an idempotency key.</p>` },
      { title: 'Active-active shopping cart: last writer wins lost an item', html: `<p>Carts lived in a DynamoDB global table. A user added a book on a phone (Region A) and, two seconds later, a pair of shoes on a laptop (Region B). Each Region wrote the whole cart as one item; replication then applied the "latest" write, and the book disappeared. <b>Fix:</b> store cart lines as separate items (partition key = cart id, sort key = line id) so concurrent additions do not collide, or keep a per-user home Region that owns writes. Last writer wins is fine for "last login time", not for collections users add to.</p>` },
      { title: 'Latency routing for a global read-heavy site', html: `<p>A product catalogue serves users in the US, Europe and India. Design: three Regions behind Route 53 latency records with health checks, each with an app tier and a read replica or Aurora Global secondary; writes (editors updating products, rare) go to the single primary Region through write forwarding or a direct call; static assets sit in S3 with CloudFront. Result: reads under 80 ms for most users, writes tolerate 150-250 ms, and the loss of one Region only shifts users to the next-nearest one. Active-active for <em>reads</em>, single-writer for <em>writes</em>: the cheapest honest compromise.</p>` }
    ],
    deepDive: `<p>🟣 <b>PACELC in practice.</b> From <b>HLD 10</b>: during a Partition choose Availability or Consistency; Else, choose Latency or Consistency. A multi-Region system with async replication picks "EL" (low latency, eventually consistent) in normal operation, and "PA" or "PC" during a partition depending on whether the second Region serves possibly-stale or possibly-conflicting data or refuses to. State your choice per data type: reads of the catalogue can be stale for seconds; account balance must have a single writer.</p>
      <p>🟣 <b>Aurora Global Database details.</b> Replication happens in the storage layer (not by replaying SQL), which keeps lag typically under a second and does not load the primary's compute. A secondary cluster can have up to 16 read instances. <b>Managed planned failover</b> (switchover) waits for the secondary to catch up and swaps roles, giving RPO 0, ideal for game days and migrations. <b>Unplanned failover</b> detaches the secondary and promotes it; you accept whatever was not yet replicated. Aurora PostgreSQL offers an RPO setting (<code>rds.global_db_rpo</code>) which, when lag exceeds it, blocks commits on the primary, trading availability for a guaranteed RPO. After a failover the old primary must be rebuilt as a new secondary.</p>
      <p>🟣 <b>DynamoDB global tables.</b> Every replica table accepts writes; changes propagate to the others, typically within a second. Conflict resolution is last-writer-wins by internal timestamp. Conditional writes and transactions are only atomic <em>within</em> a Region; they do not coordinate across Regions. Design for it: idempotent updates, add-only items, per-Region owners. Charges include replicated write capacity in every Region plus inter-Region transfer. AWS added a multi-Region strong-consistency mode that requires specific Region sets; check the current docs before relying on it.</p>
      <p>🟣 <b>S3 replication gotchas.</b> Replication is not retroactive (use S3 Batch Replication for existing objects); deletes are only replicated as delete markers if enabled (deleting a specific version is not replicated, by design, to guard against malicious deletes); replication of objects encrypted with KMS needs a key and permissions in the destination Region; there is no ordering guarantee between objects. Use replication metrics and the <code>OperationFailedReplication</code> event, not hope.</p>
      <p>🟣 <b>The control-plane trap again.</b> The hosted-zone control plane for Route 53 is in one Region. During a big us-east-1 event, health-check driven failover (data plane) keeps working, but manual record edits may not. So pre-create the failover records, or use <b>Application Recovery Controller</b> routing controls (a highly available data-plane endpoint with 5 Regions) to flip traffic. Likewise keep your CI/CD, secrets and runbooks reachable from the surviving Region.</p>
      <p>🟣 <b>Operating multi-Region.</b> Deploy to Regions <b>one at a time</b> (canary Region first) so a bad release cannot take both down. Keep configuration identical through IaC. Watch cross-Region data transfer costs ($0.02/GB typical between US Regions) and put quotas and alarms in both. Regularly exercise the failover; a Region that never serves traffic quietly rots.</p>`,
    aiEra: `<p>🤖 Assistants are good at drafting Terraform for a second Region and for Route 53 records, and weak at the semantics that matter: they will say "DynamoDB global tables give you strong consistency everywhere", suggest promoting a replica on a simple timeout (a split brain recipe), or leave the TTL at 300 s. Review every AI design against four questions: where is the single writer for each dataset, what is lost at failover (lag), how is the old primary fenced, and what does the failover use at disaster time that is not in the failed Region. Use AI to turn game day logs into a timeline and to propose failure injection scenarios (kill the database, block cross-Region traffic, expire a certificate), then you run them.</p>`,
    problems: [P({
      t: 'Replication lag vs RPO: how long were we out of bounds?',
      l: 'Medium', tags: ['RPO', 'replication lag', 'monitoring'], co: ['Netflix', 'Datadog'],
      lang: 'python',
      s: `<p>Your RPO is <code>rpo</code> seconds. CloudWatch gives replication lag samples, one per minute, as the list <code>lags</code> (seconds). During any run of <b>consecutive</b> minutes where lag is strictly greater than the RPO, a Region failure would have broken the RPO. Write <code>longest_breach(lags, rpo)</code> returning the length of the <b>longest run</b> of such minutes (0 if none). Then write the CloudWatch alarm settings you would use so the team is paged <b>before</b> the RPO is exceeded.</p>`,
      c: `<ul><li>1 ≤ len(lags) ≤ 10<sup>5</sup>, 0 ≤ lags[i] ≤ 10<sup>6</sup>, 0 ≤ rpo ≤ 10<sup>6</sup>.</li><li>${DESIGN}</li></ul>`,
      ex: `<p><code>([1, 6, 7, 2, 8], 5)</code> &rarr; <span class="c-r">2</span>: minutes 2 and 3 are above 5 (run of 2); the single 8 is a run of 1.<br><code>([5, 5, 5], 5)</code> &rarr; <span class="c-g">0</span>: equal to the RPO is still within it.</p>`,
      bw: `<p>Count all minutes above the RPO. That says how many minutes were bad in total, but not how long the worst unbroken stretch was, which is what matters for how much data one failure could have lost. Also, an alarm set exactly at the RPO pages when it is already too late.</p>`,
      q: ['The RPO is 60 seconds. At what lag should the alarm page the on-call?', ['Well below 60 s, such as 30 s sustained for a few minutes', 'Exactly 60 s', 'Only when the lag exceeds 600 s', 'Never; lag is not related to RPO'], 0, 'Alert while there is still a margin to fix the cause (a heavy batch job, a network problem). Paging at the RPO means you are already breaking the promise.'],
      h: ['Hint 1: scan once, keeping the current run length.', 'Hint 2: a sample above the RPO extends the run; any other sample resets it to 0.', 'Hint 3: keep the maximum seen so far, and return it at the end.'],
      a: `<p>One pass with a running counter: increment when <code>lag &gt; rpo</code>, reset to zero otherwise, and record the maximum. O(n) time, O(1) space. For the alarm, use the metric <code>AuroraGlobalDBReplicationLag</code> (milliseconds) with a threshold at about half the RPO, <code>--evaluation-periods 3</code> over 60-second periods so a single spike does not page, and <code>--treat-missing-data breaching</code> so a missing metric also alerts. Add a second, higher alarm at the RPO itself as a critical page. Pair the alert with a runbook step: identify the heavy writer, throttle it, check network throughput.</p>`,
      code: PY(R`def longest_breach(lags, rpo):
    """Longest run of consecutive samples where lag is strictly greater than the RPO."""
    best = run = 0
    for lag in lags:
        if lag > rpo:
            run += 1
            if run > best:
                best = run
        else:
            run = 0
    return best`),
      cx: `<p>O(n) time, O(1) space.</p>`,
      f: ['How would you also report the total minutes out of bounds per month for an SLO?', 'Why use "treat missing data as breaching" for a lag alarm?'],
      tests: { sig: 'int[] int -> int', fn: 'longest_breach', names: { python: 'longest_breach' }, cases: [
        [[[1, 6, 7, 2, 8], 5], 2], [[[5, 5, 5], 5], 0], [[[9, 9, 9], 5], 3], [[[6], 5], 1], [[[0, 6, 0, 6, 6], 5], 2], [[[5, 5, 6, 6, 6, 5], 5], 3], [[[1, 2, 3], 5], 0], [[[7, 8, 9, 1, 7, 8, 9, 10], 6], 4]
      ] }
    }), P({
      t: 'Design a global shopping cart: active-active without losing items',
      l: 'Hard', tags: ['active-active', 'DynamoDB', 'conflicts', 'multi-region'], co: ['Amazon', 'Shopify'],
      s: `<p>An e-commerce site wants carts available in <code>us-east-1</code> and <code>eu-west-1</code> with RTO under 1 minute for either Region failing and no lost items, even when a user adds items from a phone and a laptop in different Regions at the same moment. Design the data model, replication, routing, conflict handling, failover behaviour and monitoring. Show the DynamoDB table (Terraform or CLI), the item layout, and what happens when the network between Regions is partitioned. State what you give up.</p>`,
      c: LAB_AWS,
      ex: `<p>Cart lines are separate items; adding is an insert (never overwritten); removal is a delete marker with a timestamp. Two simultaneous adds <span class="c-g">both survive</span>. Quantity changes use per-line version numbers; checkout reads the merged set and charges once with an idempotency key.</p>`,
      bw: `<p>One item per cart with a list attribute, written with "put whole item". Two Regions write different lists and last writer wins: items vanish. Or "strongly consistent global writes" with a synchronous cross-Region transaction on every click: 100+ ms added to each action and an outage whenever the link is down.</p>`,
      q: ['Why model cart lines as separate items in a global table?', ['Concurrent additions in two Regions touch different items, so last-writer-wins cannot overwrite them', 'Because items are cheaper than attributes', 'Because DynamoDB cannot store lists', 'To force strong consistency across Regions'], 0, 'Conflicts happen per item. If two Regions add different lines they write different items, and both survive replication. Only edits to the same line can conflict, and those can be merged by rule.'],
      h: ['Hint 1: conflicts happen per item, so make the unit of write small.', 'Hint 2: choose a merge rule per operation: add (union), remove (tombstone), quantity (latest version or sum of deltas).', 'Hint 3: decide partition behaviour: both Regions stay writable (AP) and merge later; payment must still be single-writer or idempotent.'],
      a: `<p><b>Routing.</b> Route 53 latency records with health checks send users to the nearest healthy Region; an unhealthy Region is skipped, so RTO is health-check time plus TTL (about 30-90 s), or use Global Accelerator for seconds.</p>
        <p><b>Data.</b> DynamoDB global table <code>cart</code> in both Regions. Partition key <code>cartId</code>, sort key <code>lineId</code> (SKU). Attributes: <code>qty</code>, <code>updatedAt</code>, <code>region</code>, <code>deleted</code> (tombstone, with TTL to clean up later). An add is a conditional put per line; a remove sets the tombstone; changing quantity writes the new qty with a per-line version, applied as "highest version wins" in the app, or stores deltas and sums them.</p>
        <p><b>Partition.</b> Both Regions keep accepting writes (availability), replicate when the link returns, and merge by line, so no item is lost. Cost of this choice: carts are <b>eventually consistent</b> across Regions (usually under a second); a user may briefly see a stale cart in the other Region. <b>Checkout</b> is different: it reads the merged cart in the user's home Region, creates the order with an idempotency key (so a retry in the other Region cannot double charge), and writes the order to a single-writer store. <b>Failover</b> needs no promotion: the other Region already has the data and accepts writes. <b>Monitoring:</b> <code>ReplicationLatency</code> per Region pair, conflict counts (app-level), throttling, and a synthetic user doing add-in-A, read-in-B every minute.</p>`,
      code: [HC(R`resource "aws_dynamodb_table" "cart" {
  name         = "cart"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "cartId"
  range_key    = "lineId"

  attribute {
    name = "cartId"
    type = "S"
  }
  attribute {
    name = "lineId"
    type = "S"
  }

  stream_enabled   = true                        # required for global tables
  stream_view_type = "NEW_AND_OLD_IMAGES"

  replica {
    region_name = "eu-west-1"                    # second Region; every replica accepts writes
  }

  ttl {
    attribute_name = "expiresAt"                 # clean up tombstones and abandoned carts
    enabled        = true
  }

  point_in_time_recovery { enabled = true }      # replication copies deletes; PITR is the undo
}`, 'Terraform: DynamoDB global table for carts')],
      cx: `<p>Design problem: the cost is application complexity, extra write cost in each Region (replicated writes), and inter-Region transfer.</p>`,
      f: ['What changes if the cart must enforce stock limits? (Reserve stock in a single-writer inventory service.)', 'How would you test the partition behaviour? (Block cross-Region traffic in a game day and compare merged carts.)']
    })]
  });

  // ───────────────────────── Topic 5: cost optimisation ─────────────────────────
  topics.push({
    title: 'Cost Optimisation: Rightsizing, Savings Plans vs RIs vs Spot, Storage Tiers, Data Transfer, Tagging and FinOps',
    analogy: `<p>Your cloud bill is a <b>household electricity bill</b>. The big wins are boring: turn off lights in empty rooms (idle and non-prod resources), swap the 200-watt bulb for a 20-watt one (rightsizing, Graviton), sign a yearly contract for the power you always use (Savings Plans), buy cheap off-peak power for flexible jobs (Spot), and move rarely used boxes to the attic (storage tiers). Then there is the <b>surprise charge</b>: the meter that spins because a door between two rooms is left open (cross-AZ and NAT data transfer). And finally the household needs a <b>meter per room</b> (tags) or nobody knows who left the heater on.</p>`,
    explain: `<p>🟢 <b>Where cloud money really goes.</b> Usually in this order: compute (EC2, containers), databases, storage, and the often forgotten <b>data transfer</b>. Start with the top three line items in Cost Explorer grouped by service, then by usage type, then by tag.</p>
      <p>🟢 <b>1. Stop paying for things nobody uses.</b> Idle load balancers, unattached EBS volumes, old snapshots, oversized dev databases, forgotten test clusters. <b>Schedule non-production</b>: a dev environment on only during working hours (50 of 168 hours a week) is about <b>70% cheaper</b> than 24/7.</p>
      <p>🟢 <b>2. Rightsize.</b> Look at 2-4 weeks of CPU, memory and network. If p95 CPU is under 40% and memory under 50%, go down a size (each size is half the price). AWS Compute Optimizer gives recommendations. Move to <b>Graviton</b> (ARM) instances: often 15-20% cheaper at equal or better performance for the same work, after you test your software on ARM. In Kubernetes, <b>pod resource requests</b> that are far above real use waste nodes: tune them (VPA recommendations).</p>
      <p>🔵 <b>3. Buy the steady part cheaper.</b></p>
      ${H.table(['Option', 'Discount (approx.)', 'Commitment', 'Flexibility', 'Best for'], [
        ['<b>On-Demand</b>', '0%', 'none', 'full', 'spiky, new or short-lived workloads'],
        ['<b>Compute Savings Plan</b>', 'up to ~66%', '$ per hour for 1 or 3 years', 'any instance family, size, Region, OS; also Fargate and Lambda', 'the steady base of compute that may change shape'],
        ['<b>EC2 Instance Savings Plan</b>', 'up to ~72%', '$ per hour, one family in one Region, 1 or 3 years', 'size and OS flexible inside the family', 'stable, known fleets'],
        ['<b>Reserved Instances</b> (Standard / Convertible)', 'up to ~72% / ~66%', 'specific instance for 1 or 3 years', 'least flexible (Convertible can be exchanged); RIs also exist for RDS, ElastiCache, OpenSearch where Savings Plans do not apply', 'databases and services without a Savings Plan'],
        ['<b>Spot</b>', 'up to ~90%', 'none', 'AWS can reclaim with <b>2 minutes</b> notice', 'fault-tolerant work: batch, CI, stateless web tier behind retries, containers with many instance types']
      ])}
      <p>A Savings Plan is a promise to spend <code>$X per hour</code>, paid <em>whether you use it or not</em>. If your usage dips below the commitment, you still pay the commitment. The rule: <b>commit to your floor, not your average</b>. Look at the minimum hourly spend over the last 30-60 days and commit to 70-80% of that.</p>
      <p>The break-even: if the plan price is a fraction <code>f</code> of on-demand (for example 62% with a 38% discount), you save only when the instance runs more than <code>f</code> of the hours. Below that you lose money compared to on-demand. For a plan equal to 62% of on-demand, that is 62% of 730 hours, about 453 hours a month (62% utilisation).</p>
      <p>🔵 <b>4. Storage tiers.</b> Data rarely read should move to cheaper classes automatically with a <b>lifecycle rule</b>:</p>
      ${H.table(['S3 class', 'Use', 'Watch out for'], [
        ['Standard', 'hot data', 'highest storage price, no retrieval fee'],
        ['Intelligent-Tiering', 'unknown or changing access', 'per-object monitoring fee; small objects (under 128 KB) are not auto-tiered'],
        ['Standard-IA / One Zone-IA', 'read about once a month; backups', '30-day minimum, 128 KB minimum billable size, retrieval fee; One Zone-IA lives in one AZ only'],
        ['Glacier Instant / Flexible Retrieval', 'archives (instant: milliseconds; flexible: minutes to hours)', '90-day minimum; retrieval cost and time'],
        ['Glacier Deep Archive', 'compliance, 7-10 year retention', '180-day minimum; restore takes hours']
      ])}
      <p>Other storage wins: EBS <b>gp3</b> instead of gp2 (about 20% cheaper with independent IOPS), delete old snapshots, enable S3 lifecycle to expire old versions and abort incomplete multipart uploads, log retention in CloudWatch Logs (default is "never expire").</p>
      <p>🔵 <b>5. Data transfer, the hidden multiplier</b> (prices are typical us-east-1 list prices; check current pricing):</p>
      ${H.table(['Traffic', 'Typical price', 'How to cut it'], [
        ['Into AWS from the internet', 'free', ''],
        ['Same AZ, private IP', 'free', 'keep chatty pairs together'],
        ['<b>Cross-AZ</b> inside a Region', '$0.01/GB <b>each direction</b> (so $0.02 per GB round)', 'zone-aware routing (<code>trafficDistribution: PreferClose</code>), put chatty services in the same AZ where HA allows, replicate less'],
        ['<b>NAT gateway</b> processing', '$0.045/GB <b>plus</b> about $0.045/hour per NAT', '<b>VPC gateway endpoints</b> for S3 and DynamoDB (free), interface endpoints for other AWS APIs, one NAT per AZ to avoid cross-AZ hops, ECR pull-through caching'],
        ['Cross-Region', 'about $0.02/GB', 'replicate only what you need; compress'],
        ['To the internet (egress)', 'about $0.09/GB after 100 GB/month free', 'CloudFront (cheaper egress, and origin fetch is free), compression, caching']
      ])}
      <p>🔵 <b>6. See the money: tags and FinOps.</b> A <b>cost allocation tag</b> (<code>team</code>, <code>env</code>, <code>service</code>, <code>cost-center</code>) lets you group the bill. Tags must be <b>activated</b> in Billing and apply only from then on. Enforce them with tag policies and IaC defaults. <b>Showback</b> = show each team its cost (a report); <b>chargeback</b> = actually bill it to their budget. <b>FinOps</b> is the habit that links engineers, finance and product: <b>Inform</b> (see costs per team and product), <b>Optimize</b> (commitments, rightsizing, waste removal), <b>Operate</b> (budgets, anomaly detection, regular reviews). Track a <b>unit cost</b> (cost per 1,000 orders, per active user), because total cost rising 20% while orders rise 50% is good news.</p>`,
    clues: ['"bill doubled but traffic did not" → check <b>data transfer</b> (NAT gateway, cross-AZ) in Cost Explorer by usage type', '"steady 24/7 workload" → <b>Savings Plan or RI</b>; "interruption tolerant batch/CI" → <b>Spot</b>; "unpredictable" → On-Demand', '"commit how much?" → the <b>floor</b> of usage, not the average', '"S3 costs growing, old data rarely read" → <b>lifecycle to IA/Glacier</b> (mind minimum durations and small objects)', '"who spent this?" → <b>tagging</b>, showback, cost allocation tags activated', '"private subnets pulling from S3 cost a fortune" → <b>gateway endpoint</b> instead of NAT', '"dev clusters idle overnight" → schedule off, or scale to zero', '"cost per customer / per transaction" → unit economics (FinOps)'],
    code: [SH(R`#!/usr/bin/env bash
# Where did the money go? (read-only; Cost Explorer API calls cost about $0.01 each)
set -euo pipefail
START=$(date -u -d '-30 days' +%F); END=$(date -u +%F)

# Top services last 30 days (sorted by cost, biggest first)
aws ce get-cost-and-usage --time-period Start="$START",End="$END" --granularity MONTHLY \
  --metrics UnblendedCost --group-by Type=DIMENSION,Key=SERVICE \
  --query 'ResultsByTime[0].Groups[].[Keys[0],Metrics.UnblendedCost.Amount]' --output text | sort -k2 -nr | head -15

# Data transfer detail: usage types that contain "DataTransfer" or "NatGateway"
aws ce get-cost-and-usage --time-period Start="$START",End="$END" --granularity MONTHLY \
  --metrics UnblendedCost --group-by Type=DIMENSION,Key=USAGE_TYPE \
  --query 'ResultsByTime[0].Groups[].[Keys[0],Metrics.UnblendedCost.Amount]' --output text \
  | grep -E 'DataTransfer|NatGateway' | sort -k2 -nr

# Cost by team tag (works only after the tag is activated as a cost allocation tag)
aws ce get-cost-and-usage --time-period Start="$START",End="$END" --granularity MONTHLY \
  --metrics UnblendedCost --group-by Type=TAG,Key=team --output table

# Safe fix for S3 traffic through NAT: a free gateway endpoint
aws ec2 create-vpc-endpoint --vpc-id vpc-0123456789abcdef0 --service-name com.amazonaws.us-east-1.s3 \
  --vpc-endpoint-type Gateway --route-table-ids rtb-0123456789abcdef0`, 'Bash: Cost Explorer queries and the S3 endpoint fix'),
      JS(R`{
  "Rules": [
    {
      "ID": "tier-then-expire-logs",
      "Status": "Enabled",
      "Filter": { "Prefix": "logs/" },
      "Transitions": [
        { "Days": 30, "StorageClass": "STANDARD_IA" },
        { "Days": 90, "StorageClass": "GLACIER" }
      ],
      "Expiration": { "Days": 365 },
      "NoncurrentVersionExpiration": { "NoncurrentDays": 30 },
      "AbortIncompleteMultipartUpload": { "DaysAfterInitiation": 7 }
    }
  ]
}`, 'JSON: S3 lifecycle (tier, then expire)'),
      YM(R`# Keep traffic inside the caller's AZ when possible (Kubernetes 1.31+; GA in 1.33): fewer cross-AZ GB.
apiVersion: v1
kind: Service
metadata:
  name: orders
  namespace: shop
  labels: { team: checkout, env: prod, cost-center: "4410" }   # labels for cost tools such as OpenCost/Kubecost
spec:
  selector: { app: orders }
  trafficDistribution: PreferClose        # prefer endpoints in the same zone, fall back if none are healthy
  ports:
    - port: 8080
      targetPort: 8080`, 'YAML: zone-aware Service to reduce cross-AZ transfer'),
      PY(R`# Compare monthly cost of one always-on instance under On-Demand, a Savings Plan and Spot. Standard library only.
HOURS = 730                       # average hours in a month

def monthly(on_demand_per_hr, hours_used, plan_discount=0.0, spot_discount=0.0, spot_interrupt_overhead=0.0):
    od = on_demand_per_hr * hours_used
    # A Savings Plan commitment is paid for ALL hours of the month, used or not (the plan covers one instance here)
    sp = on_demand_per_hr * (1 - plan_discount) * HOURS
    spot = on_demand_per_hr * (1 - spot_discount) * hours_used * (1 + spot_interrupt_overhead)
    return round(od, 2), round(sp, 2), round(spot, 2)


for used in (200, 450, 730):
    od, sp, spot = monthly(0.10, used, plan_discount=0.38, spot_discount=0.70, spot_interrupt_overhead=0.10)
    best = min((od, "on-demand"), (sp, "savings plan"), (spot, "spot"))[1]
    print("hours used %3d  on-demand $%6.2f  savings plan $%6.2f  spot $%6.2f  -> cheapest: %s" % (used, od, sp, spot, best))
print("savings plan break-even hours:", round(HOURS * (1 - 0.38)))`, 'Python (runs): On-Demand vs Savings Plan vs Spot')],
    codeTitle: ['Bash: find the money', 'JSON: S3 lifecycle', 'YAML: PreferClose Service', 'Python (runs): purchase options by usage'],
    viz: [{
      title: 'A data-transfer bill, line by line (and the fixes)',
      input: '20000,8000,3000',
      inputLabel: 'cross-AZ GB, NAT GB, internet egress GB per month',
      gen: function (input) {
        var v = nums(input, 'three numbers: cross-AZ GB, NAT GB, egress GB (e.g. 20000,8000,3000)', 3);
        if (v.length !== 3 || v.some(function (x) { return x < 0; })) throw new Error('Type three non-negative numbers, e.g. 20000,8000,3000');
        var az = v[0], nat = v[1], eg = v[2];
        function dollars(a, n, e) { return [a * 0.02, n * 0.045, Math.max(0, e - 100) * 0.09]; }
        var c = dollars(az, nat, eg), tot = c[0] + c[1] + c[2];
        var after = dollars(az * 0.5, nat * 0.4, eg * 0.5), tot2 = after[0] + after[1] + after[2];
        function usd(x) { return '$' + x.toFixed(0); }
        var f = [];
        f.push({ narr: 'Three kinds of traffic and their <b>list prices</b>: cross-AZ $0.01/GB charged in <b>each</b> direction ($0.02 per GB moved), NAT gateway data processing $0.045/GB, internet egress $0.09/GB after the first 100 GB free. (Prices change; use the pricing page for real numbers. NAT hourly charges are extra.)', parts: [{ type: 'vars', label: 'Monthly traffic (GB)', vals: { 'cross-AZ': az, 'via NAT': nat, 'internet egress': eg } }] });
        f.push({ narr: 'Multiply volume by price. Cross-AZ: ' + az + ' x $0.02 = <b>' + usd(c[0]) + '</b>. NAT: ' + nat + ' x $0.045 = <b>' + usd(c[1]) + '</b>. Egress: (' + eg + ' - 100 free) x $0.09 = <b>' + usd(c[2]) + '</b>.', parts: [{ type: 'table', label: 'Line items', columns: ['Traffic', 'GB', 'Cost'], rows: [['cross-AZ', az, usd(c[0])], ['NAT gateway', nat, usd(c[1])], ['internet egress', eg, usd(c[2])], ['TOTAL', az + nat + eg, usd(tot)]], hl: { 3: 'sel' } }] });
        f.push({ narr: 'The same numbers as bars. The biggest bar is the first place to look. Cross-AZ is a silent one: it appears from chatty microservices, replication between AZs, and load balancers spreading traffic across zones.', parts: [{ type: 'bars', label: 'Cost per line ($)', values: c.map(function (x) { return Math.round(x); }), idxLabels: ['cross-AZ', 'NAT', 'egress'], hl: { 0: c[0] >= c[1] && c[0] >= c[2] ? 'bad' : 'cur', 1: c[1] > c[0] && c[1] >= c[2] ? 'bad' : 'cur', 2: c[2] > c[0] && c[2] > c[1] ? 'bad' : 'cur' } }] });
        f.push({ narr: 'Fixes with typical assumptions: zone-aware routing keeps about <b>half</b> of the cross-AZ traffic inside a zone; an S3/DynamoDB <b>gateway endpoint</b> removes the 60% of NAT traffic that was really S3; CloudFront and compression cut egress by about half. Assumptions are yours to measure.', parts: [{ type: 'table', label: 'Before and after', columns: ['Traffic', 'Before', 'After', 'Change'], rows: [['cross-AZ', usd(c[0]), usd(after[0]), 'PreferClose / same-AZ pairs'], ['NAT gateway', usd(c[1]), usd(after[1]), 'gateway endpoints'], ['internet egress', usd(c[2]), usd(after[2]), 'CloudFront + compression'], ['TOTAL', usd(tot), usd(tot2), 'saves ' + usd(tot - tot2) + ' / month']], hl: { 3: 'ok' } }] });
        return f;
      }
    }],
    examples: [
      { title: 'The bill that doubled: NAT and cross-AZ', html: `<p>A data team moved a nightly job into private subnets. The job read 40 TB a month from S3 through a NAT gateway: 40,000 GB x $0.045 = <b>$1,800</b> in processing fees on top of the hourly NAT charge, for data that is free to read from S3 over a gateway endpoint. In the same month a chatty microservice pair running in different AZs exchanged 15 TB: 15,000 x $0.02 = <b>$300</b>. Cost Explorer grouped by <code>USAGE_TYPE</code> showed <code>NatGateway-Bytes</code> and <code>DataTransfer-Regional-Bytes</code> as the new top lines. Fixes: S3 gateway endpoint (free, one command), zone-aware routing, and an alarm from AWS Cost Anomaly Detection.</p>` },
      { title: 'Savings Plan sizing: commit to the floor', html: `<p>Hourly compute spend (On-Demand equivalent) ranges from $18 at night to $55 at peak, averaging $34. Committing for the average would leave the plan underused all night, and you pay the commitment either way. The floor is about $18, so commit about <b>$11 per hour</b> of discounted spend with a Compute Savings Plan. At 38% off, $11 covers about $11 / 0.62 = $17.70 of On-Demand-equivalent usage, saving roughly $6.70 an hour, about <b>$4,900 a month</b>, with almost no risk of an unused commitment. The variable part above the floor stays On-Demand, with batch work moved to Spot. Review every quarter and buy more in small steps (a ladder), so commitments expire at different times.</p>` },
      { title: 'Tagging and showback in practice', html: `<p>Rules: every resource has <code>team</code>, <code>env</code>, <code>service</code>, <code>cost-center</code>; IaC modules set default tags (<code>default_tags</code> in the Terraform AWS provider); a tag policy in AWS Organizations and a Config rule flag untagged resources; the keys are activated in Billing. A weekly showback email lists each team's spend, change versus last month and unit cost. After two months "unallocated" falls from 38% to 6%, and the platform team finally knows which team owns 14 forgotten GPU instances. Shared costs (NAT, Kubernetes control planes) are split by usage or by headcount, with the rule written down.</p>` }
    ],
    deepDive: `<p>🟣 <b>Savings Plan math.</b> A Compute Savings Plan applies first to the usage with the largest discount percentage, then the next, until your hourly commitment is used. Anything beyond is billed On-Demand. Savings are calculated hour by hour, not per month, which is why variable usage needs a floor-based commitment. 3-year terms give bigger discounts but lock you in; since Savings Plans cannot be resold (Standard RIs can be sold in the RI Marketplace), match the term to how stable the workload is. Convertible RIs and Instance SPs can be right for stable databases and fleets. Upfront payment gives a bit more discount; at a company with cheap capital it is often worth it, at others No Upfront is the safe choice.</p>
      <p>🟣 <b>Spot done safely.</b> Treat every Spot instance as one that will disappear. Use many instance types and AZs (diversification, <code>price-capacity-optimized</code> allocation strategy), listen to the 2-minute interruption notice (EventBridge event or instance metadata), checkpoint work, and keep a small On-Demand base in the ASG (mixed instances policy). On Kubernetes, Karpenter or managed node groups with Spot plus PodDisruptionBudgets and a spread of replicas are the common pattern. Do not run databases or singletons on Spot.</p>
      <p>🟣 <b>Kubernetes cost.</b> The scheduler packs by <b>requests</b>, not by use. A pod asking for 2 CPU and using 0.2 wastes 1.8 CPU of a node you pay for. Fixes: measure with metrics, right-size requests (VPA in recommendation mode), use cluster autoscaler or Karpenter consolidation, namespace quotas and per-namespace cost allocation with OpenCost. Also watch idle clusters, unused load balancers per Service, and logging volumes.</p>
      <p>🟣 <b>Hidden fees.</b> NAT gateway hours (one per AZ, about $33 a month each before data), unattached Elastic IPs and public IPv4 addresses (all public IPv4 addresses are billed hourly), CloudWatch Logs ingestion ($0.50/GB, often the surprise), cross-Region S3 requests, API Gateway request pricing at scale, DynamoDB on-demand for steady load (provisioned plus autoscaling is cheaper), idle RDS in non-production, and snapshot sprawl. Review these monthly.</p>
      <p>🟣 <b>Cost as an architecture property.</b> The Well-Architected cost pillar says: make cost visible, design for efficient use, stop paying for undifferentiated work. Real savings come from design choices: queue-based buffering (smaller fleet), caching (fewer database reads), compression, serverless for spiky loads and containers or instances for steady ones, and picking managed services where staff time is the larger cost. Put cost in the design review and in CI (Infracost shows the cost change of a Terraform pull request).</p>
      <p>🟣 <b>Guardrails.</b> AWS Budgets with alerts at 50/80/100% and a forecast alert, Cost Anomaly Detection by service and by tag, Service Control Policies to block expensive instance types in dev, and automated cleanup (tag-based TTL). Never rely on a person remembering to look at the console.</p>`,
    aiEra: `<p>🤖 Assistants can turn a Cost and Usage Report extract into a ranked list of suspects, explain a usage type name like <code>USE1-DataTransfer-Regional-Bytes</code>, and draft lifecycle rules and Infracost checks. They can also sound too sure about prices: AWS pricing changes (NAT, public IPv4, Savings Plan terms), so always verify numbers against the current pricing page or your own bill. Ask the assistant for the formula and the assumptions, then plug in your own data, as in this module's Python problems. Beware of confident "switch everything to Spot" or "buy a 3-year plan for everything" advice that ignores interruption tolerance and your usage floor. Use AI cost-anomaly explanations as a starting hypothesis, then confirm in Cost Explorer.</p>`,
    problems: [P({
      t: 'Monthly data-transfer bill from three traffic types',
      l: 'Easy', tags: ['cost', 'data transfer', 'NAT', 'cross-AZ'], co: ['Amazon', 'Datadog'],
      lang: 'python',
      s: `<p>Write <code>transfer_cost(cross_az_gb, nat_gb, egress_gb)</code> returning the monthly data-transfer cost in <b>mills</b> (1/1000 of a dollar, so everything stays an integer). Use these planning prices: cross-AZ <b>20 mills per GB</b> ($0.01 per direction, counted both ways), NAT gateway processing <b>45 mills per GB</b>, internet egress <b>90 mills per GB</b> for everything above the first <b>100 GB</b> (the free allowance, applied once). Then list three concrete changes that would lower the number.</p>`,
      c: `<ul><li>0 ≤ each argument ≤ 10<sup>9</sup>. Prices are planning values, not a quote; NAT hourly fees are not included.</li><li>${DESIGN}</li></ul>`,
      ex: `<p><code>(500, 200, 50)</code> &rarr; <span class="c-g">19000</span> mills = $19: cross-AZ 10,000 + NAT 9,000 + egress 0 (within the 100 GB free allowance).<br><code>(0, 0, 1100)</code> &rarr; <span class="c-y">90000</span> mills = $90: 1,000 GB billable x 90.</p>`,
      bw: `<p>"Data transfer is small compared to EC2, ignore it." At 20 TB of cross-AZ and 8 TB through NAT that is $400 + $360 a month for traffic that adds no features, and it grows with every new chatty service.</p>`,
      q: ['Which change most directly removes S3 traffic charges from a private-subnet NAT gateway?', ['A VPC gateway endpoint for S3', 'A bigger NAT gateway instance', 'A second NAT gateway in the same AZ', 'Moving the bucket to Glacier'], 0, 'Gateway endpoints for S3 and DynamoDB are free and route that traffic privately, bypassing the NAT gateway and its per-GB processing fee.'],
      h: ['Hint 1: three independent terms, then add.', 'Hint 2: egress is billable only above 100 GB: <code>max(0, egress - 100)</code>.', 'Hint 3: stay in integers (mills) to avoid float rounding.'],
      a: `<p>Cost = <code>cross_az_gb * 20 + nat_gb * 45 + max(0, egress_gb - 100) * 90</code>. Three changes: (1) S3 and DynamoDB gateway endpoints to remove that share of NAT traffic; (2) zone-aware routing (<code>trafficDistribution: PreferClose</code>) and fewer cross-AZ chatty calls; (3) CloudFront in front of public content to cut egress and compress responses. Verify with Cost Explorer grouped by usage type before and after.</p>`,
      code: PY(R`def transfer_cost(cross_az_gb, nat_gb, egress_gb):
    """Monthly data-transfer cost in mills (1/1000 dollar): cross-AZ 20, NAT 45, egress 90 above 100 GB free."""
    return cross_az_gb * 20 + nat_gb * 45 + max(0, egress_gb - 100) * 90`),
      cx: `<p>O(1) time and O(1) space: a few multiplications.</p>`,
      f: ['Add the NAT hourly fee for N gateways. Where does the number of NATs matter? (Per AZ, to avoid cross-AZ NAT traffic.)', 'Which of the three is likely to grow fastest with microservice count?'],
      tests: { sig: 'int int int -> int', fn: 'transfer_cost', names: { python: 'transfer_cost' }, cases: [
        [[0, 0, 0], 0], [[1000, 0, 0], 20000], [[0, 1000, 0], 45000], [[0, 0, 100], 0], [[0, 0, 1100], 90000], [[500, 200, 50], 19000], [[10000, 5000, 2000], 596000], [[1, 1, 101], 155]
      ] }
    }), P({
      t: 'Savings Plan break-even: how many hours must it run?',
      l: 'Medium', tags: ['Savings Plans', 'cost', 'commitment'], co: ['Amazon', 'Atlassian'],
      lang: 'python',
      s: `<p>An instance costs <code>od</code> cents per hour On-Demand. A Savings Plan would charge <code>committed</code> cents per hour for <b>all 730 hours</b> of the month, used or not. Write <code>breakeven_hours(od, committed)</code> returning the <b>smallest whole number of hours per month</b> an On-Demand instance would have to run for its cost to be at least the plan's monthly cost (below that On-Demand is cheaper). Then describe how you would choose the commitment for a fleet whose hourly spend varies between $18 and $55.</p>`,
      c: `<ul><li>1 ≤ od ≤ 10<sup>6</sup> and 0 ≤ committed ≤ od. Use integer arithmetic; ceiling division.</li><li>${DESIGN}</li></ul>`,
      ex: `<p><code>(10, 6)</code> &rarr; <span class="c-g">438</span>: the plan costs 6 x 730 = 4,380 cents; On-Demand reaches that after 438 hours (60% of the month).<br><code>(46, 29)</code> &rarr; <span class="c-y">461</span>: 21,170 / 46 = 460.2, rounded up.</p>`,
      bw: `<p>"A 38% discount means it is always cheaper." Only if the instance runs more than 62% of the hours. For a part-time job running 200 hours a month the plan costs more than On-Demand.</p>`,
      q: ['A plan costs 62% of On-Demand for all hours. Roughly what utilisation makes On-Demand the same price?', ['About 62% of hours', 'About 38% of hours', 'About 100% of hours', 'It is always cheaper'], 0, 'On-Demand cost grows with hours used; the plan is a flat monthly cost at 62% of a full month of On-Demand. They are equal when the instance runs 62% of the hours.'],
      h: ['Hint 1: plan cost per month = committed x 730.', 'Hint 2: On-Demand cost after h hours = od x h; solve od x h ≥ committed x 730.', 'Hint 3: ceiling division with integers is <code>(a + b - 1) // b</code>.'],
      a: `<p>Break-even hours = ceil(730 x committed / od). Below that the instance is cheaper On-Demand. In practice choose the commitment from the <b>floor</b> of hourly spend: here about $18/hour, so commit to about $14-16/hour; anything above stays On-Demand or moves to Spot. Revisit every quarter and ladder purchases so terms expire at different dates.</p>`,
      code: PY(R`def breakeven_hours(od, committed):
    """Hours per month at which On-Demand cost reaches the plan's flat monthly cost."""
    return (730 * committed + od - 1) // od         # ceil(730 * committed / od) in integers`),
      cx: `<p>O(1) time and O(1) space: a few multiplications.</p>`,
      f: ['How does Spot change the comparison? (Add the interruption overhead and the engineering cost.)', 'What if the plan is for a family you plan to leave? (Choose a Compute Savings Plan for flexibility.)'],
      tests: { sig: 'int int -> int', fn: 'breakeven_hours', names: { python: 'breakeven_hours' }, cases: [
        [[10, 6], 438], [[10, 7], 511], [[46, 29], 461], [[9, 5], 406], [[1, 1], 730], [[25, 16], 468], [[100, 0], 0], [[1000000, 1], 1]
      ] }
    })]
  });

  // ───────────────────────── Topic 6: the Well-Architected Framework ─────────────────────────
  topics.push({
    title: 'The Well-Architected Framework: Six Pillars, Review Questions, Trade-offs and Availability Math',
    analogy: `<p>Before a building opens, an inspector walks through with a checklist: fire exits, wiring, structure, heating bills, accessibility. The inspector does not design the building and does not say "this is ugly". They ask <b>the same good questions every time</b>, mark what is risky, and give a list of fixes in order of importance. The Well-Architected Framework is that inspector for cloud workloads: six sections, a few dozen questions each, learned from thousands of real reviews. The skill is not memorising the six names; it is knowing the right question to ask when you meet a design, and knowing that fixing one section (more redundancy) costs you in another (money).</p>`,
    explain: `<p>🟢 <b>The six pillars</b> (AWS; Azure and Google Cloud have close equivalents):</p>
      ${H.table(['Pillar', 'Core idea', 'A concrete review question'], [
        ['<b>Operational Excellence</b>', 'run and improve the workload; learn from failure', '"Can a new release be rolled back by one person in under 10 minutes? When did you last do a game day, and what changed after the last incident?"'],
        ['<b>Security</b>', 'protect data, identities and systems; least privilege', '"Does every service use a role instead of long-lived keys? Is data encrypted at rest and in transit? Who can reach production data and how is that audited?"'],
        ['<b>Reliability</b>', 'recover from failure and meet demand', '"What happens when each dependency is down? Are RTO/RPO written down per workload and tested? Are quotas and limits known in the DR Region?"'],
        ['<b>Performance Efficiency</b>', 'use the right resources and keep up with demand', '"Do you load test? Did you choose the compute and database type by measurement, and review it each year as new instance types arrive?"'],
        ['<b>Cost Optimization</b>', 'avoid unnecessary spend, get value', '"Do you know the cost per transaction? Who owns each line of the bill, and what is the Savings Plan coverage?"'],
        ['<b>Sustainability</b>', 'reduce the environmental impact of running the workload', '"Do you shut down idle resources, use efficient instance types (Graviton), and choose Regions and data retention with impact in mind?"']
      ])}
      <p>🟢 <b>How a review works.</b> A team meets for a few hours (often with an AWS partner or the AWS Well-Architected Tool, free in the console). For each pillar they answer multiple-choice questions about the real workload. Each unmet best practice becomes a risk: <b>High Risk Issue (HRI)</b> or <b>Medium Risk Issue (MRI)</b>. The output is an <b>improvement plan</b> ranked by risk, with owners and dates. You save a <b>milestone</b> and review again after fixing. Reviews run at design time, before a launch, after an incident, and yearly. <b>Lenses</b> add specialised questions (Serverless, SaaS, Data Analytics, Generative AI, Financial Services).</p>
      <p>🟢 <b>Trade-offs, not a scorecard.</b> The framework does not ask you to maximise every pillar. Multi-Region active-active improves reliability and costs 2x and adds operational load. The goal is a conscious choice per workload: reporting does not need what payments needs.</p>
      <p>🔵 <b>Reliability math you should be able to do.</b> Availability of components <b>in series</b> multiplies. Components <b>in parallel</b> (redundant copies, any one is enough) fail only if all fail.</p>
      ${H.table(['Layout', 'Formula', 'Example'], [
        ['Series (A then B)', 'A x B', '99.9% x 99.9% = 99.8%'],
        ['Parallel (n copies)', '1 - (1 - A)<sup>n</sup>', 'two 99% servers: 1 - 0.01<sup>2</sup> = 99.99%'],
        ['Mixed', 'multiply the series parts, using the parallel result for redundant parts', 'load-balanced app (2 x 99%) then one database (99.9%): 0.9999 x 0.999 = 99.89%']
      ])}
      <p>The mixed example shows the lesson: duplicating the app made it near-perfect, but the single database now limits the whole system. <b>Remove the weakest single point first.</b> Downtime per 30-day month: 99% = 7.2 h; 99.9% = 43 min; 99.99% = 4.3 min; 99.999% = 26 s.</p>
      <p>🔵 <b>Design principles that appear in every pillar.</b> Automate everything (IaC, CI/CD); stop guessing capacity (autoscale); test at production scale; design for failure ("everything fails all the time"); make changes small and reversible; use managed services; measure and keep evidence; encode security and cost rules as code.</p>
      <p>🔵 <b>How this module's topics map.</b> Microservices and the mesh: reliability and security (timeouts, mTLS). DR and multi-Region: reliability and operational excellence (game days). Cost topic: cost optimisation and sustainability (fewer idle resources). Use the framework as the <b>closing review</b> for any design in an interview: walk the six pillars out loud, highlight the two or three that drive this system, and name the trade-off you made.</p>`,
    clues: ['"review this architecture" or "what would you improve" → walk the <b>six pillars</b> and rank by risk', '"the system is only as available as its weakest component" → <b>series</b> availability multiplies; single points of failure first', '"add another server" → check <b>parallel</b> math and shared dependencies (same AZ, same DB, same deploy)', '"we have a DR plan" → ask: tested? measured RTO/RPO? quotas/keys/secrets in DR Region?', '"how do we know it is secure?" → identities, encryption, logging, least privilege, no long-lived keys', '"we are too expensive" → cost per transaction, rightsizing, commitments, data transfer', '"trade-off" → name the pillar you traded away and why (cost vs reliability)', '"Well-Architected Tool" or "HRI" → risk-ranked improvement plan with milestones'],
    code: [SH(R`#!/usr/bin/env bash
# Run a Well-Architected review from the CLI. The Tool is free. Placeholder ids; review owner is a role-based address.
set -euo pipefail

# 1) Create a workload record (no resources are created)
WL=$(aws wellarchitected create-workload \
  --workload-name payments-api --description "Card payments API, us-east-1 + us-west-2 standby" \
  --environment PRODUCTION --review-owner payments-oncall@example.com \
  --aws-regions us-east-1 us-west-2 --lenses wellarchitected \
  --query WorkloadId --output text)

# 2) Read the Reliability questions to answer in the console (or update answers with update-answer)
aws wellarchitected list-answers --workload-id "$WL" --lens-alias wellarchitected --pillar-id reliability \
  --query 'AnswerSummaries[].[QuestionId,QuestionTitle,Risk]' --output table

# 3) Save a milestone after the review, then see the risk counts per pillar
aws wellarchitected create-milestone --workload-id "$WL" --milestone-name "2026-q4-baseline"
aws wellarchitected get-workload --workload-id "$WL" --query 'Workload.RiskCounts'

# 4) Cleanup (a workload record is free, delete it if this was a trial)
# aws wellarchitected delete-workload --workload-id "$WL" --client-request-token "cleanup-$(date +%s)"`, 'Bash: Well-Architected Tool from the CLI'),
      YM(R`# A review record you can keep in the repo next to the design doc (the format is yours; this one is simple).
workload: payments-api
reviewed: 2026-10-19
owners: [payments-oncall]
targets: { rto: "5 min", rpo: "10 s", availability: "99.95%", p99_latency_ms: 400 }
findings:
  - pillar: reliability
    risk: high
    finding: "Failover to us-west-2 never tested; vCPU quota there is 8"
    action: "Game day in staging, raise quota to 200, alarm at 80%"
    owner: sre
    due: 2026-11-30
  - pillar: security
    risk: medium
    finding: "Two services use IAM user keys stored in env vars"
    action: "Move to IRSA roles, rotate and delete keys"
    owner: platform
    due: 2026-11-15
  - pillar: cost
    risk: medium
    finding: "NAT gateway moves 6 TB/month of S3 traffic"
    action: "Add S3 gateway endpoint (free)"
    owner: platform
    due: 2026-10-31
  - pillar: operational_excellence
    risk: medium
    finding: "Runbook lives in a wiki hosted only in us-east-1"
    action: "Mirror to a repo and print the one-page failover card"
    owner: sre
    due: 2026-11-10`, 'YAML: a review record with risk-ranked findings'),
      PY(R`# Availability maths for a design review. Standard library only.

def series(*parts):
    """All parts must work: multiply availabilities."""
    out = 1.0
    for a in parts:
        out *= a
    return out


def parallel(a, n):
    """n independent copies, any one is enough."""
    return 1 - (1 - a) ** n


def downtime_minutes(avail, days=30):
    return (1 - avail) * days * 24 * 60


app = parallel(0.99, 2)                  # two app servers behind a load balancer
for db_name, db in (("single DB 99.9%", 0.999), ("Multi-AZ DB 99.99%", 0.9999)):
    total = series(app, db)
    print("%-20s app pair %.4f  total %.5f  downtime %5.1f min/month" % (db_name, app, total, downtime_minutes(total)))
print("ten hard dependencies at 99.9%:", round(series(*([0.999] * 10)), 4))`, 'Python (runs): series and parallel availability')],
    codeTitle: ['Bash: Well-Architected Tool', 'YAML: a review record', 'Python (runs): availability maths'],
    viz: [{
      title: 'A pillar-by-pillar review of a workload',
      input: 'payments',
      inputLabel: 'workload: payments or reporting',
      gen: function (input) {
        var w = String(input || '').trim().toLowerCase();
        if (w !== 'payments' && w !== 'reporting') throw new Error('Type payments or reporting');
        var pay = w === 'payments';
        var rows = pay ? [
          ['Operational Excellence', 'Rollback needs a DBA; no game day in 2 years', 'High'],
          ['Security', 'Roles used; one service still has an access key in env vars', 'Medium'],
          ['Reliability', 'Warm standby planned; failover untested; quota in DR Region is 8 vCPU', 'High'],
          ['Performance Efficiency', 'Load tested last quarter; p99 400 ms met', 'None'],
          ['Cost Optimization', 'S3 traffic goes through NAT; no commitment coverage', 'Medium'],
          ['Sustainability', 'Idle staging cluster runs 24/7', 'Low']
        ] : [
          ['Operational Excellence', 'IaC rebuild documented and tested yearly', 'None'],
          ['Security', 'Analyst access uses SSO groups; data encrypted with KMS', 'None'],
          ['Reliability', 'Backup &amp; restore, RTO 24 h met in a drill', 'None'],
          ['Performance Efficiency', 'Big queries compete at 9:00; no workload management', 'Medium'],
          ['Cost Optimization', 'Cluster runs 24/7 though used 9-to-5; 6 TB in hot storage', 'Medium'],
          ['Sustainability', 'Old extracts never expire', 'Low']
        ];
        var f = [];
        f.push({ narr: 'We review <b>' + w + '</b> with the same six questions every time. The targets matter: ' + (pay ? 'revenue per minute is high, so reliability and operations weigh most.' : 'it is a back-office system, so cost and performance weigh most.'), parts: [{ type: 'text', label: 'Workload', html: pay ? 'Payments API: RTO 5 min, RPO 10 s, 99.95% availability' : 'Reporting warehouse: RTO 24 h, RPO 24 h, business hours only' }] });
        var shown = [];
        rows.forEach(function (r, i) {
          shown.push(r);
          var hl = {}; hl[shown.length - 1] = r[2] === 'High' ? 'bad' : (r[2] === 'Medium' ? 'cur' : (r[2] === 'Low' ? 'win' : 'ok'));
          f.push({ narr: '<b>' + r[0] + '</b>: ' + r[1] + '. Risk: <b>' + r[2] + '</b>.', parts: [{ type: 'table', label: 'Findings so far', columns: ['Pillar', 'What we found', 'Risk'], rows: shown.slice(), hl: hl }] });
        });
        var hi = rows.filter(function (r) { return r[2] === 'High'; }).length, me = rows.filter(function (r) { return r[2] === 'Medium'; }).length;
        f.push({ narr: 'The output is an <b>improvement plan ordered by risk</b>: fix High first, then Medium, and accept Low consciously. ' + (pay ? 'Here: game day and quota first, then rollback automation.' : 'Here: schedule the cluster to pause outside business hours and tier old data.') + ' Save a milestone, and review again after the fixes.', parts: [{ type: 'vars', label: 'Risk count', vals: { High: hi, Medium: me, 'Total findings': rows.filter(function (r) { return r[2] !== 'None'; }).length }, hl: { High: hi ? 'bad' : 'ok' } }] });
        return f;
      }
    }],
    examples: [
      { title: 'A review that saved a launch', html: `<p>A startup planned to launch on Monday. A two-hour review found three High Risk Issues: a single-AZ database with no backups tested, an S3 bucket with public write access left from a prototype, and no alarms on error rate. All three were fixed in a day. The launch had a real database failover on day 9 (Multi-AZ, 70 seconds of errors, alarm fired in 2 minutes). Cost of the review: two hours. The lesson: reviews are cheap before launch and expensive after an incident.</p>` },
      { title: 'Series maths changes a design', html: `<p>A request goes through CDN (99.99%), WAF (99.95%), ALB (99.99%), app tier with 3 instances across AZs (each 99.5% in practice, treated as parallel), one database (99.95% single-AZ), and a payments API from a third party (99.9%). Series result: 0.9999 x 0.9995 x 0.9999 x (1 - 0.005<sup>3</sup>) x 0.9995 x 0.999 ≈ <b>99.78%</b>, about 95 minutes of downtime a month, mostly from the database and the third party. Moves with the best payoff: Multi-AZ database (99.95% &rarr; about 99.99%), and an async fallback for the third party (queue the charge, confirm later). The app tier, already redundant, needs nothing.</p>` },
      { title: 'Interview: closing a design with the framework', html: `<p>You finish a system design for an order service. Say: "Reliability: Multi-AZ everywhere, RTO 5 minutes with a warm standby and tested failover. Security: mTLS between services, IAM roles, KMS encryption. Operations: IaC, canary deploys with automatic rollback, runbooks and game days. Performance: autoscaling on requests per target, cache for reads, p99 target 300 ms with load tests. Cost: Savings Plan for the floor, Spot for workers, S3 lifecycle rules, tags for showback. Sustainability: Graviton and scheduled non-prod. The main trade-off is cost versus reliability: I would accept a 4-minute RTO instead of active-active, which costs double." Twenty seconds, six pillars, one trade-off.</p>` }
    ],
    deepDive: `<p>🟣 <b>Shared responsibility and the pillars.</b> AWS secures the cloud (facilities, hypervisor); you secure what you put in it. Several pillar questions are really "did you do your half?": patching, IAM, configuration. The review makes the boundary explicit.</p>
      <p>🟣 <b>Why independence is the catch in the parallel formula.</b> <code>1 - (1 - A)^n</code> assumes failures are independent. Two instances in the same AZ share power and network; two replicas deployed by the same bad release fail together; two services on one database share its fate. Common-mode failures (bad deploy, expired certificate, quota, DNS, a shared dependency, a poisoned message) dominate real outages. That is why the review asks about <b>blast radius</b>, <b>cell-based architecture</b> (independent copies serving slices of customers), staggered deploys and shuffle sharding.</p>
      <p>🟣 <b>SLOs and error budgets.</b> A 99.95% SLO allows about 21.6 minutes a month. Measure it from the user's view (synthetic checks, load balancer success rate), not from server uptime. If the budget is spent, slow down releases and invest in reliability; if it is unused, you can ship faster. The framework gives the checklist; SLOs give the targets (see the observability modules).</p>
      <p>🟣 <b>Performance efficiency.</b> Choose by measurement: instance families (compute vs memory vs storage optimised, Graviton), database engines and access patterns, caching layers, CDN, async. Load test with realistic data. Review new offerings annually; the cheapest speed-up is often a newer instance generation.</p>
      <p>🟣 <b>Sustainability.</b> The same actions that save money usually reduce emissions: rightsizing, scheduling off non-prod, Graviton (better performance per watt), shorter retention, efficient code, regional choice. Treat the shared-responsibility model here too: AWS improves data-centre efficiency; you reduce the resources you request.</p>
      <p>🟣 <b>Using the framework without turning it into paperwork.</b> Keep reviews short and risk-based; attach findings to tickets with owners; re-review on major change or incident; never present the tool's score as a goal. A team that fixes two High risks a quarter beats a team that fills in the form perfectly once. Combine with ADRs (architecture decision records) so each trade-off is written down once.</p>`,
    aiEra: `<p>🤖 Assistants are strong at the pillar walk: paste a design description and get a decent list of questions and risks, especially for common patterns. They tend to give generic, evenly weighted advice ("add monitoring, use encryption") and miss the two or three issues that matter for <em>this</em> workload and its numbers. Prompt with targets (RTO/RPO, SLO, budget, team size) and ask for a ranked list with the trade-off for each recommendation. Always ask "what would this cost and what could it break?" Use AI to turn a review into tickets and to draft ADRs, but keep the humans who own the system in the review: the questions that find real risk are about what the team actually does on a bad day, which only they know.</p>`,
    problems: [P({
      t: 'Composite availability of a redundant app with one database',
      l: 'Medium', tags: ['availability', 'reliability', 'well-architected'], co: ['Amazon', 'Google'],
      lang: 'python',
      s: `<p>A workload has an application tier made of <code>replicas</code> identical servers behind a load balancer (each with availability <code>a_app</code>, failures independent, any one server is enough) followed in series by one database with availability <code>a_db</code>. Write <code>composite_availability(a_app, replicas, a_db)</code> returning the availability of the whole system as a number from 0 to 1. Then say which component you would improve first for (0.99, 2, 0.999) and why.</p>`,
      c: `<ul><li>0 ≤ a_app, a_db ≤ 1; 0 ≤ replicas ≤ 100. With 0 replicas nothing can serve, so the result is 0.</li><li>${DESIGN}</li></ul>`,
      ex: `<p><code>(0.99, 2, 0.999)</code> &rarr; <span class="c-g">0.9989001</span>: app pair = 1 - 0.01<sup>2</sup> = 0.9999; times 0.999.<br><code>(0.9, 0, 1.0)</code> &rarr; <span class="c-r">0.0</span>: no servers.</p>`,
      bw: `<p>Average the availabilities, or multiply every server including the redundant ones: 0.99 x 0.99 x 0.999 = 0.979, which says redundancy makes things <em>worse</em>. Series multiplies; parallel does not.</p>`,
      q: ['Two independent servers, each 99% available, either one sufficient. What is the pair\'s availability?', ['99.99%', '98.01%', '99%', '99.5%'], 0, 'The pair fails only when both fail: 0.01 x 0.01 = 0.0001, so availability is 1 - 0.0001 = 99.99%. This assumes independent failures (different AZs, no shared dependency).'],
      h: ['Hint 1: the app tier fails only when all replicas fail at once: (1 - a_app)<sup>replicas</sup>.', 'Hint 2: the tier availability is 1 minus that, then multiply by the database (series).', 'Hint 3: with zero replicas, (1 - a)<sup>0</sup> = 1, so the formula gives 0 on its own.'],
      a: `<p>Parallel part: <code>1 - (1 - a_app) ** replicas</code>. Series with the database: multiply by <code>a_db</code>. For (0.99, 2, 0.999) the app pair is 99.99% and the system is 99.89%: the single database (99.9%) is now the limit, so improve it first (Multi-AZ, which takes it to about 99.99%) rather than adding a third app server, which would change the result by less than 0.01%. This is the "remove the weakest single point" rule from the reliability pillar.</p>`,
      code: PY(R`def composite_availability(a_app, replicas, a_db):
    """Redundant app tier (any one of 'replicas' is enough) in series with one database."""
    app_tier = 1 - (1 - a_app) ** replicas       # fails only if every replica fails
    return app_tier * a_db`),
      cx: `<p>O(1) with the closed form.</p>`,
      f: ['What assumption makes the parallel formula optimistic? (Independent failures.)', 'How would a shared bad deployment change the real number?'],
      tests: { sig: 'double int double -> double', fn: 'composite_availability', cmp: 'float', names: { python: 'composite_availability' }, cases: [
        [[0.99, 2, 0.999], 0.9989001], [[0.99, 1, 1.0], 0.99], [[0.999, 3, 0.9999], 0.9998999990001001], [[0.95, 2, 0.99], 0.987525],
        [[0.9, 0, 1.0], 0.0], [[1.0, 5, 0.5], 0.5], [[0.995, 2, 0.9995], 0.9994750125], [[0.9, 10, 1.0], 0.9999999999]
      ] }
    }), P({
      t: 'Run a Well-Architected review of a described system',
      l: 'Medium', tags: ['well-architected', 'review', 'trade-offs'], co: ['AWS', 'Accenture'],
      s: `<p>A SaaS company runs: one ALB, 4 EC2 instances in one AZ, a single RDS PostgreSQL instance (Single-AZ, 7-day backups never test-restored), an S3 bucket for uploads with public read for the CDN, IAM user access keys in the app config, no alarms except CPU, deploys by SSH on Friday evenings, and a monthly bill of $9,000 of which $2,700 is NAT gateway and data transfer. Perform a review: for each of the six pillars list the findings, mark High or Medium risk, give the fix and an owner, and order the improvement plan for the first two weeks. State one trade-off you would deliberately accept.</p>`,
      ex: `<p>High risks first: <span class="c-r">single AZ + Single-AZ database + untested restore</span>, <span class="c-r">public bucket and long-lived keys</span>. The cheapest big win is the S3 gateway endpoint for the NAT bill.</p>`,
      bw: `<p>"Add more servers and turn on Multi-Region." Costs a lot, ignores the real faults (untested backups, public bucket, keys in config) and adds a new operational burden to a team that cannot deploy safely yet.</p>`,
      q: ['Which finding would you fix first?', ['Public-read bucket and long-lived keys in config (High security risk, quick to fix)', 'Moving to a different Region', 'Switching instance families for 5% savings', 'Renaming resources for tag consistency'], 0, 'Rank by risk and effort: data exposure and leaked-key risk are High and cheap to fix, and they can end the company. Optimisations like family changes can wait.'],
      h: ['Hint 1: one finding per pillar at least; cite what you saw in the description.', 'Hint 2: rank by (risk x how soon it hurts) and then by effort, so cheap High risks go first.', 'Hint 3: for each fix, say what it costs and which other pillar it affects.'],
      a: `<p><b>Reliability (High).</b> One AZ, Single-AZ database, backups never restored. Fix: Multi-AZ RDS, instances spread over two or three AZs via an ASG, restore test into a scratch instance with a documented RTO, alarms on 5xx and latency. <b>Security (High).</b> Public-read bucket: put CloudFront with Origin Access Control in front and block public access; replace IAM user keys with an instance role or IRSA, rotate and delete keys; enable CloudTrail and GuardDuty. <b>Operational excellence (High).</b> SSH deploys on Fridays: CI/CD with a pipeline, rolling or canary deploy, one-click rollback; deploy windows moved to weekdays, a runbook per alarm. <b>Performance (Medium).</b> Four fixed instances: ASG with target tracking, a load test, cache for read-heavy endpoints. <b>Cost (Medium).</b> $2,700 NAT/transfer: S3 gateway endpoint, CloudFront for egress, check cross-AZ chatter; tag resources; Savings Plan for the floor once usage is stable. <b>Sustainability (Low).</b> Schedule non-prod, Graviton instances after testing.</p>
        <p><b>Two-week order:</b> days 1-2 bucket and keys; days 2-4 backup restore test and Multi-AZ (maintenance window); week 2 CI/CD with rollback, alarms, NAT endpoint. <b>Accepted trade-off:</b> stay single-Region (RTO of hours from backups) because the business case does not justify 2x spend yet; revisit after the first big customer contract.</p>`,
      code: SH(R`# Quick, safe checks that confirm several of the findings (read-only)
aws s3api get-public-access-block --bucket uploads-example-123456789012          # is public access blocked?
aws iam list-users --query 'Users[].UserName' --output text                      # any IAM users with keys?
aws rds describe-db-instances --query 'DBInstances[].[DBInstanceIdentifier,MultiAZ,BackupRetentionPeriod]' --output table
aws ec2 describe-nat-gateways --query 'NatGateways[].[NatGatewayId,SubnetId,State]' --output table`, 'Bash: read-only checks for the review findings'),
      cx: `<p>A review takes a few hours; fixes take weeks. Order by risk and effort.</p>`,
      f: ['What would make you recommend multi-Region for this company?', 'How would you re-check progress in 30 days?']
    })]
  });

  // ───────────────────────── Practice problems ─────────────────────────
  practice.push(P({
    t: 'Match each system to a DR tier',
    l: 'Easy', tags: ['DR', 'RTO', 'RPO'], co: ['Amazon', 'Microsoft'],
    s: `<p>Using the four AWS strategies (backup &amp; restore, pilot light, warm standby, multi-site active/active), choose a tier for each system and justify it in one sentence with its RTO and RPO: (1) card-payment authorisation, (2) internal wiki, (3) nightly sales report, (4) customer-facing product catalogue read by users worldwide, (5) CI build servers.</p>`,
    ex: `<p>(1) <span class="c-g">warm standby or multi-site</span> (minutes of outage cost real money). (2) <span class="c-g">backup &amp; restore</span> (hours are fine). (3) <span class="c-g">backup &amp; restore</span> (rebuildable from sources).</p>`,
    bw: `<p>Pick one tier for everything. Either the wiki gets a 16x design or the payments system gets backups only.</p>`,
    q: ['Which system most clearly justifies paying for warm standby?', ['Card-payment authorisation with large revenue per minute', 'An internal wiki', 'CI build servers', 'A nightly report that can be re-run'], 0, 'Warm standby is for workloads where minutes of downtime cost more than the standby. The others can recover in hours or be rebuilt.'],
    h: ['Hint 1: ask "what does an hour of downtime and an hour of lost data cost?"', 'Hint 2: can the system be rebuilt from source data and code? Then backup &amp; restore is enough.', 'Hint 3: write RTO/RPO numbers, not just the tier name.'],
    a: `<p>(1) Payments: RTO 5 min, RPO about 10 s, <b>warm standby</b> with a global database; escalate to active/active only if the business needs near-zero downtime. (2) Wiki: RTO 24 h, RPO 24 h, <b>backup &amp; restore</b> from daily snapshots. (3) Nightly report: RTO 24 h, RPO 24 h, <b>backup &amp; restore</b> because the data can be recomputed. (4) Catalogue: RTO 1 min, RPO minutes (mostly read-only); <b>active/active for reads</b> with latency routing and a single writer Region, the cheapest way to get low latency and resilience. (5) CI: RTO 4 h, RPO irrelevant (code lives in Git); <b>backup &amp; restore</b> or rebuild from IaC. The pattern: only the revenue path gets expensive tiers; everything rebuildable gets the cheapest one.</p>`,
    cx: `<p>A table and five justified numbers.</p>`
  }));
  practice.push(P({
    t: 'Error budget: allowed downtime from an SLO',
    l: 'Easy', tags: ['SLO', 'availability', 'error budget'], co: ['Google', 'Datadog'], lang: 'python',
    s: `<p>An SLO is given in basis points of availability (9995 means 99.95%). Write <code>allowed_downtime_seconds(slo_bp, days)</code> returning the whole seconds of downtime allowed in <code>days</code> days (round down). Use integer arithmetic.</p>`,
    c: `<ul><li>0 ≤ slo_bp ≤ 10000, 1 ≤ days ≤ 366.</li><li>${DESIGN}</li></ul>`,
    ex: `<p><code>(9995, 30)</code> &rarr; <span class="c-g">1296</span> seconds (21.6 minutes). <code>(10000, 30)</code> &rarr; <span class="c-r">0</span>: a 100% SLO allows no downtime and is not realistic.</p>`,
    bw: `<p>Convert percentages with floats, then round. 99.95% as a float gives tiny errors on large windows and different results in different languages.</p>`,
    q: ['Roughly how much downtime per 30-day month does 99.9% allow?', ['43 minutes', '4.3 minutes', '7.2 hours', '26 seconds'], 0, '0.1% of 43,200 minutes is 43.2 minutes. 99.99% allows 4.3 minutes, 99% allows 7.2 hours, 99.999% allows about 26 seconds.'],
    h: ['Hint 1: total seconds in the window = days x 86,400.', 'Hint 2: the allowed fraction is (10000 - slo_bp) / 10000.', 'Hint 3: multiply first, divide last with <code>//</code>.'],
    a: `<p>Allowed seconds = <code>(10000 - slo_bp) * days * 86400 // 10000</code>. Multiply before dividing to keep everything exact in integers. An SLO is a budget: when it is nearly spent, pause risky releases and invest in reliability.</p>`,
    code: PY(R`def allowed_downtime_seconds(slo_bp, days):
    """Seconds of downtime allowed in 'days' days for an SLO given in basis points (9995 = 99.95%)."""
    return (10000 - slo_bp) * days * 86400 // 10000`),
    cx: `<p>O(1) time and O(1) space: one expression.</p>`,
    f: ['How would you turn this into a burn-rate alert?'],
    tests: { sig: 'int int -> int', fn: 'allowed_downtime_seconds', names: { python: 'allowed_downtime_seconds' }, cases: [
      [[9995, 30], 1296], [[9990, 30], 2592], [[9999, 30], 259], [[9900, 30], 25920], [[10000, 30], 0], [[9995, 7], 302], [[9950, 365], 157680], [[0, 1], 86400]
    ] }
  }));
  practice.push(P({
    t: 'Which Istio feature solves which symptom?',
    l: 'Easy', tags: ['Istio', 'traffic management', 'mTLS'], co: ['Google', 'Red Hat'],
    s: `<p>Name the Istio resource and the key setting for each: (1) send 5% of traffic to v2; (2) stop sending requests to a pod returning five 503s in a row; (3) fail requests that take longer than 2 seconds; (4) refuse plain-text connections to the <code>payments</code> namespace; (5) allow only <code>orders</code> to call <code>payments</code>; (6) test how the UI behaves when ratings is slow.</p>`,
    ex: `<p>(1) <span class="c-g">VirtualService weights</span> + DestinationRule subsets. (4) <span class="c-g">PeerAuthentication mode STRICT</span>.</p>`,
    bw: `<p>Change the application code for each of these. That repeats the logic in every language and every service, and each team does it differently.</p>`,
    q: ['Which resource ejects a failing pod from the load-balancing pool?', ['DestinationRule outlierDetection', 'VirtualService weights', 'PeerAuthentication', 'Gateway'], 0, 'Outlier detection in a DestinationRule is passive health checking: it removes hosts that return consecutive errors for a time.'],
    h: ['Hint 1: routing behaviour is VirtualService; destination behaviour is DestinationRule.', 'Hint 2: security is split: transport (PeerAuthentication) and who-can-call (AuthorizationPolicy).', 'Hint 3: fault injection is a VirtualService feature.'],
    a: `<p>(1) VirtualService <code>route[].weight</code> with DestinationRule subsets. (2) DestinationRule <code>trafficPolicy.outlierDetection.consecutive5xxErrors: 5</code>. (3) VirtualService <code>timeout: 2s</code>. (4) PeerAuthentication <code>mtls.mode: STRICT</code> in that namespace. (5) AuthorizationPolicy <code>ALLOW</code> with <code>from.source.principals: ["cluster.local/ns/shop/sa/orders"]</code>. (6) VirtualService <code>fault.delay</code> with a percentage and <code>fixedDelay</code>. Every one is configuration, not application code, which is the point of the mesh.</p>`,
    cx: `<p>A reference table of six settings; no computation.</p>`
  }));
  practice.push(P({
    t: 'Tagging standard and showback report',
    l: 'Easy', tags: ['FinOps', 'tagging', 'showback'], co: ['Intuit', 'Capital One'],
    s: `<p>Define a tag standard for a company with 12 teams: required keys, allowed values, how they are enforced and how cost allocation works. Show the Terraform provider setting that applies default tags and the first monthly showback report layout.</p>`,
    ex: `<p>Required: <code>team</code>, <code>env</code>, <code>service</code>, <code>cost-center</code>. Target: <span class="c-g">unallocated spend under 5%</span> within two months.</p>`,
    bw: `<p>"Please tag your resources" in a wiki page. Without enforcement coverage stays at 40% and the biggest costs are the untagged ones.</p>`,
    q: ['A new tag key is created today. When does it start showing in Cost Explorer?', ['After it is activated as a cost allocation tag, and only for usage from then on', 'Immediately, retroactively for last year', 'Only after a support ticket', 'Never; tags are not used for billing'], 0, 'Cost allocation tags must be activated in the Billing console and apply to costs from the activation forward.'],
    h: ['Hint 1: few required keys beat many optional ones.', 'Hint 2: enforce in IaC (default_tags), at the organisation level (tag policies) and by detection (Config rule).', 'Hint 3: shared costs need a documented split rule.'],
    a: `<p><b>Standard.</b> Required keys: <code>team</code> (from a fixed list), <code>env</code> (prod|stage|dev), <code>service</code>, <code>cost-center</code>. <b>Enforcement.</b> Terraform <code>default_tags</code> on the provider, an Organizations tag policy for allowed values, an AWS Config rule that flags untagged resources, SCP on creating expensive resources without tags in dev. Activate the keys as cost allocation tags. <b>Showback.</b> Monthly email per team: spend by service, change versus last month, top 5 resources, unit cost (per order), and unallocated percentage per team. Shared items (NAT gateways, Kubernetes control planes, support) are split by usage share where measurable and by headcount otherwise; publish the rule. Move to chargeback only after teams trust the numbers.</p>`,
    code: HC(R`provider "aws" {
  region = "us-east-1"

  default_tags {
    tags = {
      team        = "checkout"
      env         = "prod"
      service     = "orders"
      cost-center = "4410"
      managed-by  = "terraform"
    }
  }
}`, 'Terraform: default tags on every resource'),
    cx: `<p>Process design; the work is adoption.</p>`
  }));

  practice.push(P({
    t: 'Circuit breaker simulation: how many calls are rejected?',
    l: 'Medium', tags: ['circuit breaker', 'resilience', 'simulation'], co: ['Netflix', 'Microsoft'], lang: 'python',
    s: `<p>A circuit breaker starts <b>closed</b> with 0 consecutive failures. You get a list <code>outcomes</code> of what each call would return: 1 = success, 0 = failure. Rules per step: <b>closed</b>: a success resets the failure count; a failure adds one, and when it reaches <code>k</code> the breaker opens (the call itself still ran). <b>open</b>: the step is rejected without calling (count it), and after <code>cool</code> rejected steps it becomes <b>half-open</b>. <b>half-open</b>: the step is a probe; success closes the breaker (count 0), failure opens it again for <code>cool</code> steps. Write <code>rejected_calls(outcomes, k, cool)</code> returning how many steps were rejected.</p>`,
    c: `<ul><li>0 ≤ len(outcomes) ≤ 10<sup>5</sup>, 1 ≤ k ≤ 100, 1 ≤ cool ≤ 100. The outcome of a rejected step is ignored.</li><li>${DESIGN}</li></ul>`,
    ex: `<p><code>([0,0,0,1,1,1,1], 3, 2)</code> &rarr; <span class="c-g">2</span>: three failures open it; the next two steps are rejected; then the probe (1) closes it and the last 1 passes.</p>`,
    bw: `<p>Count failures instead of simulating states. It cannot represent the cool-down and probe, and gives the wrong answer as soon as a success appears between failures.</p>`,
    q: ['What does the half-open state do?', ['Lets one probe call through to test whether the dependency recovered', 'Rejects every call forever', 'Retries every call three times', 'Disables the breaker permanently'], 0, 'Half-open limits damage while testing recovery: one probe success closes the breaker, one failure reopens it.'],
    h: ['Hint 1: keep three variables: the state, the consecutive-failure count and the remaining cool-down.', 'Hint 2: handle the state first, then use the outcome only when the call actually ran.', 'Hint 3: after the last rejected step, switch to half-open for the next step.'],
    a: `<p>Simulate with a small state machine. While open, each step is rejected and decrements the cool-down; at zero the state becomes half-open. In half-open the step is a probe: success closes (reset failures), failure reopens with a fresh cool-down. In closed, update the failure counter and open at <code>k</code>. This is O(n) time and O(1) space. In Istio the same behaviour comes from <code>outlierDetection</code> (ejection time) rather than an explicit probe state, but the idea is the same.</p>`,
    code: PY(R`def rejected_calls(outcomes, k, cool):
    """Count steps rejected by a consecutive-failure circuit breaker with a cool-down and one probe."""
    state, fails, wait, rejected = "closed", 0, 0, 0
    for ok in outcomes:
        if state == "open":
            rejected += 1
            wait -= 1
            if wait == 0:
                state = "half-open"
        elif state == "half-open":
            if ok:
                state, fails = "closed", 0
            else:
                state, wait = "open", cool
        else:                                   # closed
            if ok:
                fails = 0
            else:
                fails += 1
                if fails >= k:
                    state, wait = "open", cool
    return rejected`),
    cx: `<p>O(n) time, O(1) space.</p>`,
    f: ['How would you let more than one probe through? (Allow N probes; close after M successes.)'],
    tests: { sig: 'int[] int int -> int', fn: 'rejected_calls', names: { python: 'rejected_calls' }, cases: [
      [[[1, 1, 1], 3, 2], 0], [[[0, 0, 0, 1, 1, 1, 1], 3, 2], 2], [[[0, 0, 0, 0, 0, 1, 1, 1], 3, 2], 2], [[[0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 3, 2], 5],
      [[[0, 0, 0, 1, 0, 0, 0, 0, 0, 0], 2, 3], 6], [[[0, 1, 0, 1, 0, 1], 2, 2], 0], [[[0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1], 3, 3], 6], [[[0, 0], 1, 1], 1]
    ] }
  }));
  practice.push(P({
    t: 'Retry budget: how many retries are allowed?',
    l: 'Medium', tags: ['retry budget', 'resilience', 'simulation'], co: ['Google', 'Twitter'], lang: 'python',
    s: `<p>A client processes requests in order. <code>fails[i]</code> is 1 if request i fails on its first attempt (and would like exactly one retry) and 0 otherwise. A retry is allowed if the retries used so far are fewer than <code>floor + ratio_pct/100 x (requests seen so far, including this one)</code>. Write <code>retries_used(fails, ratio_pct, floor)</code> returning how many retries are performed. Use integer arithmetic: compare <code>used * 100 &lt; floor * 100 + ratio_pct * i</code> where i is the 1-based request number.</p>`,
    c: `<ul><li>0 ≤ len(fails) ≤ 10<sup>5</sup>, 0 ≤ ratio_pct ≤ 100, 0 ≤ floor ≤ 100. Retries always succeed or not; only the count matters.</li><li>${DESIGN}</li></ul>`,
    ex: `<p>100 failing requests, ratio 10%, floor 0 &rarr; <span class="c-g">10</span> retries. Without a budget it would be 100.</p>`,
    bw: `<p>"Retry every failure once." During an outage every request fails, so load doubles exactly when the dependency is weakest.</p>`,
    q: ['Why does a retry budget help during an outage?', ['It caps extra load from retries at a small share of normal traffic', 'It makes every retry succeed', 'It removes the need for timeouts', 'It increases the retry count'], 0, 'With a budget, retries are limited to a percentage of requests, so a failing service sees at most about 1.1x load instead of 2x or more.'],
    h: ['Hint 1: process requests in order, tracking how many retries were used.', 'Hint 2: the limit grows with each request seen, so check it at every failing request.', 'Hint 3: only failing requests can spend; successful ones just raise the allowance.'],
    a: `<p>Loop over requests with a 1-based index <code>i</code>. If the request failed and <code>used * 100 &lt; floor * 100 + ratio_pct * i</code>, spend one retry. The floor lets rare failures retry even at low traffic, and the ratio caps amplification during an outage. This is the idea behind Envoy retry budgets and gRPC retry throttling. Combined with exponential backoff with jitter, a circuit breaker and retrying in only one layer, it prevents retry storms.</p>`,
    code: PY(R`def retries_used(fails, ratio_pct, floor):
    """Retries performed when each failure may retry once, within a ratio-plus-floor budget."""
    used = 0
    for i, failed in enumerate(fails, start=1):          # i = requests seen so far
        if failed and used * 100 < floor * 100 + ratio_pct * i:
            used += 1
    return used`),
    cx: `<p>O(n) time, O(1) space.</p>`,
    f: ['Why do some systems use a token bucket for the budget? (It smooths bursts.)'],
    tests: { sig: 'int[] int int -> int', fn: 'retries_used', names: { python: 'retries_used' }, cases: [
      [[{ $rep: 1, n: 10 }, 10, 0], 1], [[{ $rep: 1, n: 100 }, 10, 0], 10], [[{ $rep: 1, n: 100 }, 10, 3], 13], [[{ $rep: 0, n: 50 }, 10, 3], 0],
      [[[1, 0, 1, 0, 1, 0, 1, 0, 1, 0], 50, 0], 5], [[{ $rep: 1, n: 20 }, 100, 0], 20], [[{ $rep: 1, n: 30 }, 20, 2], 8], [[[1], 10, 1], 1]
    ] }
  }));
  practice.push(P({
    t: 'Right-size a pod: recommend a CPU request from usage samples',
    l: 'Medium', tags: ['rightsizing', 'Kubernetes', 'cost'], co: ['Google', 'Spotify'], lang: 'python',
    s: `<p>You have CPU usage samples in millicores for a pod. Recommend a CPU <b>request</b>: take the <code>p</code>-th percentile using the <b>nearest-rank</b> method (sort ascending; the value at position ceil(p/100 x n), 1-based), then add <code>headroom</code> percent and round <b>up</b> to a whole millicore. Write <code>recommend_request(samples, p, headroom)</code>.</p>`,
    c: `<ul><li>1 ≤ len(samples) ≤ 10<sup>5</sup>, 1 ≤ p ≤ 100, 0 ≤ headroom ≤ 100, samples ≥ 0. Integer arithmetic for the ceiling.</li><li>${DESIGN}</li></ul>`,
    ex: `<p><code>([100,200,300,400,500], 95, 20)</code> &rarr; <span class="c-g">600</span>: p95 by nearest rank is 500; plus 20% is 600.</p>`,
    bw: `<p>Set the request to the maximum ever seen, or to the average. The maximum wastes money on a rare spike; the average throttles the pod half the time.</p>`,
    q: ['Why use a high percentile plus headroom instead of the average for CPU requests?', ['The scheduler reserves the request; the average would leave the pod short half the time', 'Percentiles are cheaper to compute', 'Averages are not allowed in Kubernetes', 'Headroom makes pods start faster'], 0, 'Requests are what the scheduler guarantees. Use a high percentile (p90-p95) plus headroom so normal peaks fit without paying for the rare maximum.'],
    h: ['Hint 1: sort the samples in ascending order first.', 'Hint 2: nearest rank position = ceil(p x n / 100); the index is that minus one. Integer ceil: <code>(p * n + 99) // 100</code>.', 'Hint 3: ceil(v x (100 + h) / 100) = <code>(v * (100 + h) + 99) // 100</code>.'],
    a: `<p>Sort, pick index <code>(p * n + 99) // 100 - 1</code>, then apply headroom with integer ceiling. Check with real data over 2-4 weeks including peaks and deploys; use Vertical Pod Autoscaler in recommendation mode as a cross-check, keep memory requests near the maximum (memory is not compressible), and set CPU limits carefully (or not at all) because limits cause throttling. Savings show up only when pods fit on fewer nodes, so also let the cluster autoscaler or Karpenter consolidate.</p>`,
    code: PY(R`def recommend_request(samples, p, headroom):
    """CPU request in millicores: nearest-rank percentile plus headroom percent, rounded up."""
    ordered = sorted(samples)
    rank = (p * len(ordered) + 99) // 100               # ceil(p * n / 100), 1-based
    value = ordered[rank - 1]
    return (value * (100 + headroom) + 99) // 100        # ceil(value * (1 + headroom/100))`),
    cx: `<p>O(n log n) for the sort, O(n) space.</p>`,
    f: ['Why not set a CPU limit equal to the request? (Throttling hurts latency.)'],
    tests: { sig: 'int[] int int -> int', fn: 'recommend_request', names: { python: 'recommend_request' }, cases: [
      [[[100, 200, 300, 400, 500], 95, 20], 600], [[[50], 95, 20], 60], [[[100, 100, 100, 100], 50, 0], 100], [[{ $range: [1, 101, 1] }, 95, 20], 114],
      [[[250, 260, 240, 900, 255, 250, 245, 260, 250, 251], 95, 20], 1080], [[[250, 260, 240, 900, 255, 250, 245, 260, 250, 251], 50, 10], 275], [[[10, 20, 30], 100, 0], 30], [[[333], 1, 10], 367]
    ] }
  }));
  practice.push(P({
    t: 'Retries and timeouts for a read API and a payment POST',
    l: 'Medium', tags: ['Istio', 'retries', 'timeouts', 'idempotency'], co: ['Stripe', 'Shopify'],
    s: `<p>In the <code>shop</code> namespace, <code>catalog</code> serves GET requests (idempotent) and <code>payments</code> serves POST <code>/v1/authorize</code> (not idempotent unless an idempotency key is used). Write Istio VirtualServices for both with sensible timeouts and retries, and a DestinationRule with outlier detection for <code>catalog</code>. Explain why the retry settings differ and how you would remove app-level retries.</p>`,
    c: LAB_KIND,
    ex: `<p>catalog: 2 attempts, 500 ms per try on <code>connect-failure,refused-stream,503</code>, timeout 1.5 s. payments: 0 mesh retries on 5xx, timeout 5 s; client sends an <code>Idempotency-Key</code>.</p>`,
    bw: `<p>Same settings everywhere: <code>retries: 3</code> on 5xx for all routes. A timed-out authorise call may already have charged the card, and retrying creates a double charge.</p>`,
    q: ['Why not retry a payment POST on 5xx automatically?', ['It may have succeeded before the error, causing a duplicate charge without an idempotency key', 'POST requests cannot be retried by Envoy', '5xx never happens for payments', 'It would make payments faster'], 0, 'A 5xx or a timeout does not prove the operation failed. Retrying non-idempotent operations needs an idempotency key that the server deduplicates.'],
    h: ['Hint 1: retries are safe for idempotent reads, risky for writes.', 'Hint 2: perTryTimeout × attempts must fit inside the overall timeout.', 'Hint 3: keep retries in the mesh and remove them from the app so they do not multiply.'],
    a: `<p>catalog: <code>timeout: 1.5s</code>, <code>retries: attempts: 2, perTryTimeout: 500ms, retryOn: connect-failure,refused-stream,503</code>. Total worst case 2 x 500 ms = 1 s inside the 1.5 s budget. payments: <code>timeout: 5s</code> and <code>retries: attempts: 0</code> (or only <code>connect-failure</code>, which means the request never reached the server). The client (orders) sends <code>Idempotency-Key</code>, and payments stores key and result for 24 hours so a client-side retry returns the first result. Outlier detection on catalog ejects a pod after five consecutive 5xx for 30 s, at most 50% of pods. Remove app-level retries from catalog clients, so the total is 2 attempts, not 2 x 3.</p>`,
    code: YM(R`apiVersion: networking.istio.io/v1
kind: VirtualService
metadata: { name: catalog, namespace: shop }
spec:
  hosts: [catalog]
  http:
    - timeout: 1.5s
      retries: { attempts: 2, perTryTimeout: 500ms, retryOn: "connect-failure,refused-stream,503" }
      route: [{ destination: { host: catalog } }]
---
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata: { name: payments, namespace: shop }
spec:
  hosts: [payments]
  http:
    - timeout: 5s
      retries: { attempts: 0 }            # no automatic retries for a non-idempotent call
      route: [{ destination: { host: payments } }]
---
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata: { name: catalog, namespace: shop }
spec:
  host: catalog
  trafficPolicy:
    outlierDetection: { consecutive5xxErrors: 5, interval: 10s, baseEjectionTime: 30s, maxEjectionPercent: 50 }`, 'YAML: different retry policies per route'),
    cx: `<p>Configuration; verify with a fault-injection test.</p>`
  }));
  practice.push(P({
    t: 'S3 lifecycle plan for 200 TB of logs',
    l: 'Medium', tags: ['S3', 'storage tiering', 'cost'], co: ['Netflix', 'Snowflake'],
    s: `<p>A company stores 200 TB of application logs in S3 Standard. Logs are queried often for 14 days, occasionally to 90 days, and must be kept 2 years for audit but are almost never read. Design the lifecycle rules, state which storage classes and why (mention minimum durations, minimum object size and retrieval fees), compute the rough monthly storage saving using the planning prices below, and say what could make the plan <b>cost more</b> than doing nothing.</p><p>Planning prices per GB-month: Standard 0.023, Standard-IA 0.0125, Glacier Instant Retrieval 0.004, Deep Archive 0.001.</p>`,
    ex: `<p>Day 0-14 Standard, 14-90 Standard-IA... then Glacier-class. About <span class="c-g">$4,700 a month before, about $770 after</span> at steady state.</p>`,
    bw: `<p>Leave everything in Standard "so it is fast". At 200 TB that is about $4,700 a month (204,800 GB x 0.023) for data nobody reads.</p>`,
    q: ['What can make a lifecycle transition to Standard-IA cost more than staying in Standard?', ['Many tiny objects (128 KB minimum billable size) or objects deleted within 30 days', 'Large objects', 'Using versioning', 'Using lifecycle rules'], 0, 'IA classes bill a minimum object size and a 30-day minimum duration. Tiny or short-lived objects can cost more there.'],
    h: ['Hint 1: split data into time buckets by access pattern.', 'Hint 2: transitions are charged per 1,000 objects, so compact tiny log files first.', 'Hint 3: Glacier classes have 90- or 180-day minimums; do not use them for data you may delete earlier.'],
    a: `<p><b>Rules.</b> Days 0-14 Standard (hot queries). Day 14 &rarr; Standard-IA (read about monthly). Day 90 &rarr; Glacier Instant Retrieval (rare access with millisecond reads for the occasional audit; 90-day minimum is satisfied). Day 365 &rarr; Deep Archive (180-day minimum, restore in hours is fine for audit). Expiration at day 730. Add <code>AbortIncompleteMultipartUpload</code> and noncurrent version expiry. <b>Estimate</b> (steady state with about 200 TB across the 2-year window: 14 days hot, 76 days IA, 275 days GIR, 365 days DA, proportional): average cost per GB-month about (14 x 0.023 + 76 x 0.0125 + 275 x 0.004 + 365 x 0.001) / 730 = (0.322 + 0.95 + 1.1 + 0.365) / 730 ≈ 0.0037, so about $760 a month, versus $4,700 in Standard. <b>Risks.</b> Millions of tiny objects (transition request fees and the 128 KB IA minimum): batch small logs into larger files first (Firehose buffering). Re-reading archived data (retrieval fees). Early deletion charges. Also compress and consider Intelligent-Tiering when access is unpredictable.</p>`,
    code: JS(R`{
  "Rules": [
    {
      "ID": "logs-tiering",
      "Status": "Enabled",
      "Filter": { "Prefix": "app-logs/" },
      "Transitions": [
        { "Days": 14, "StorageClass": "STANDARD_IA" },
        { "Days": 90, "StorageClass": "GLACIER_IR" },
        { "Days": 365, "StorageClass": "DEEP_ARCHIVE" }
      ],
      "Expiration": { "Days": 730 },
      "AbortIncompleteMultipartUpload": { "DaysAfterInitiation": 7 }
    }
  ]
}`, 'JSON: lifecycle for 200 TB of logs'),
    cx: `<p>Design plus arithmetic; verify with S3 Storage Lens before and after.</p>`
  }));

  practice.push(P({
    t: 'Roll out STRICT mTLS across 40 services without an outage',
    l: 'Hard', tags: ['Istio', 'mTLS', 'migration'], co: ['Google', 'Capital One'],
    s: `<p>A 40-service cluster (six namespaces) runs a mix: 30 services have Istio sidecars, 10 are not yet injected, plus a nightly batch job and a legacy VM that call in over plain HTTP. Write a rollout plan to mesh-wide STRICT mTLS with AuthorizationPolicy default-deny for the <code>payments</code> namespace. Include the order of changes, how you find plain-text callers, the YAML, the checks and the rollback for each step, and how long it would take.</p>`,
    c: LAB_KIND,
    ex: `<p>PERMISSIVE everywhere first, telemetry shows 3 plain-text callers, fix or exempt them, then STRICT per namespace, then deny-by-default for payments with explicit allow rules.</p>`,
    bw: `<p>Apply a mesh-wide STRICT PeerAuthentication on Friday. Every un-injected caller, the batch job and health probes from the legacy VM get connection resets.</p>`,
    q: ['Which mode lets sidecar and plain-text clients both connect during migration?', ['PERMISSIVE', 'STRICT', 'DISABLE only', 'There is no such mode'], 0, 'PERMISSIVE accepts both mTLS and plain text, the safe starting mode. Move to STRICT per namespace once no plain-text callers remain.'],
    h: ['Hint 1: inject all workloads first, then tighten, never the reverse.', 'Hint 2: find plain-text clients from telemetry (connection security policy metric or access logs) before STRICT.', 'Hint 3: AuthorizationPolicy with ALLOW rules denies everything else, so test with a canary pod from another namespace.'],
    a: `<p><b>Order.</b> (1) Install with mesh default PERMISSIVE. (2) Inject remaining namespaces and restart deployments in waves; verify 2/2 containers and <code>istioctl analyze</code>. (3) Find plain-text callers using the metric <code>istio_requests_total{connection_security_policy="none"}</code> per destination, or access logs. Fix them: inject the batch job, give the legacy VM a mesh gateway or an ingress path with TLS, or add a documented PERMISSIVE port exception (<code>portLevelMtls</code>). (4) Set STRICT namespace by namespace, least critical first, watching 503/connection reset rates for 24 hours. (5) Mesh-wide STRICT in <code>istio-system</code>. (6) For <code>payments</code>: add AuthorizationPolicy ALLOW from the <code>orders</code> service account to the specific paths; the presence of an ALLOW policy makes everything else denied. Test denial from a throwaway pod. <b>Rollback</b> at each step: set mode back to PERMISSIVE, delete the policy (seconds). <b>Time:</b> 4-6 weeks, mostly finding callers and teams to restart services. Keep config in Git, reviewed, and use <code>istioctl x describe pod</code> to explain behaviour.</p>`,
    code: YM(R`# Step 4: STRICT for one namespace, with one legacy port left open on purpose (documented, with an expiry date).
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata: { name: default, namespace: shop }
spec:
  mtls: { mode: STRICT }
---
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata: { name: legacy-metrics-port, namespace: shop }
spec:
  selector: { matchLabels: { app: reports } }
  mtls: { mode: STRICT }
  portLevelMtls:
    9102: { mode: PERMISSIVE }          # legacy VM scraper; remove by 2026-12-31
---
# Step 6: default-deny style for payments: only orders may call it
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata: { name: payments-allow-orders, namespace: payments }
spec:
  action: ALLOW
  rules:
    - from: [{ source: { principals: ["cluster.local/ns/shop/sa/orders"] } }]
      to: [{ operation: { methods: ["POST"], paths: ["/v1/*"] } }]`, 'YAML: STRICT per namespace, one exception, allow-list'),
    cx: `<p>Planning exercise. Success metric: zero customer-visible errors and no plain-text traffic remaining.</p>`
  }));
  practice.push(P({
    t: 'The bill doubled: find it and cut it',
    l: 'Hard', tags: ['cost', 'NAT', 'cross-AZ', 'FinOps'], co: ['Amazon', 'Datadog'],
    s: `<p>Your monthly AWS bill went from $38,000 to $76,000 with traffic up only 8%. Cost Explorer by service shows EC2-Other doubled ($9k to $34k). Write the investigation (queries, drill-down order, hypotheses), the likely causes with numbers, the fixes (YAML/bash), and the guardrails that would have caught it in days instead of at month end.</p>`,
    c: LAB_AWS,
    ex: `<p>Usage type <code>NatGateway-Bytes</code> up 14 TB and <code>DataTransfer-Regional-Bytes</code> up 20 TB. Fix: S3/DynamoDB gateway endpoints, zone-aware routing, one NAT per AZ. Result: <span class="c-g">EC2-Other back to about $12k</span>.</p>`,
    bw: `<p>Buy a Savings Plan to "reduce the bill". It discounts compute, not data transfer, and locks in a commitment on top of a bill that has a bug.</p>`,
    q: ['EC2-Other doubled. Which usage types do you check first?', ['NatGateway-Bytes and DataTransfer-Regional-Bytes', 'BoxUsage only', 'S3 storage only', 'Support charges'], 0, 'EC2-Other contains NAT gateways, EBS and data transfer. NAT processing and cross-AZ regional transfer are the usual sources of sudden growth.'],
    h: ['Hint 1: group by service, then by usage type, then by tag or linked account.', 'Hint 2: convert GB to dollars with the rates to see which line explains the delta.', 'Hint 3: for each cause, give the fix and the alarm that detects it next time.'],
    a: `<p><b>Drill-down.</b> Cost Explorer: service &rarr; EC2-Other &rarr; usage type &rarr; (if needed) VPC Flow Logs or the NAT gateway CloudWatch metrics (<code>BytesOutToDestination</code>) to find top talkers. Use the CLI queries from the lesson. <b>Typical findings.</b> (1) A job moved to private subnets reads 14 TB from S3 through NAT: 14,000 x $0.045 = $630 plus ECR image pulls through NAT. (2) A new microservice pair in different AZs exchanges 20 TB: 20,000 x $0.02 = $400. (3) A NAT gateway in one AZ serving other AZs: cross-AZ plus NAT. (4) CloudWatch Logs ingestion at $0.50/GB from debug logging left on. Numbers above explain a part of the delta; keep drilling until the sum matches. <b>Fixes.</b> S3 and DynamoDB gateway endpoints (free), interface endpoints for ECR/CloudWatch where traffic is high, one NAT per AZ with routes by AZ, <code>trafficDistribution: PreferClose</code>, lower log level. <b>Guardrails.</b> AWS Budgets with forecast alerts, Cost Anomaly Detection per service and tag, a weekly cost review, and Infracost in pull requests.</p>`,
    code: SH(R`# Free fix for S3 and DynamoDB traffic that goes through NAT
aws ec2 create-vpc-endpoint --vpc-id vpc-0123456789abcdef0 --service-name com.amazonaws.us-east-1.s3 \
  --vpc-endpoint-type Gateway --route-table-ids rtb-0123456789abcdef0 rtb-0fedcba9876543210
aws ec2 create-vpc-endpoint --vpc-id vpc-0123456789abcdef0 --service-name com.amazonaws.us-east-1.dynamodb \
  --vpc-endpoint-type Gateway --route-table-ids rtb-0123456789abcdef0 rtb-0fedcba9876543210

# Guardrail: anomaly monitor per service, alert to email when impact exceeds $100
aws ce create-anomaly-monitor --anomaly-monitor '{"MonitorName":"by-service","MonitorType":"DIMENSIONAL","MonitorDimension":"SERVICE"}'`, 'Bash: gateway endpoints and an anomaly monitor'),
    cx: `<p>Investigation skill, not computation: follow the dollars.</p>`
  }));
  practice.push(P({
    t: 'Plan and run a Region failure game day',
    l: 'Hard', tags: ['game day', 'DR', 'chaos', 'reliability'], co: ['Netflix', 'Amazon'],
    s: `<p>Your warm-standby payments stack (us-east-1 primary, us-west-2 standby, Aurora Global Database, Route 53 failover) has never failed over for real. Write the game-day plan: goals and success numbers, scope and blast radius, the roles, the preparation checklist, the timeline of injected failures with expected results, abort criteria, what you measure, and how findings become tickets. Include how to run the first one in staging and the production one safely.</p>`,
    c: LAB_AWS,
    ex: `<p>Success: failover in under 5 minutes, loss under 10 s of data, zero double charges, runbook followed without verbal fixes. Abort if error rate exceeds the agreed limit or on-call cannot see the dashboards.</p>`,
    bw: `<p>Read the runbook aloud in a meeting and call it a drill. Nothing is executed, so quotas, keys, DNS TTLs and human delays are never discovered.</p>`,
    q: ['What is the main output of a game day?', ['Measured RTO/RPO and a list of fixed gaps with owners', 'A slide saying DR works', 'Lower AWS spend', 'A new architecture diagram'], 0, 'The value is evidence: how long it really took, what was lost, what broke, and tickets to fix it before the real event.'],
    h: ['Hint 1: define success numbers before the day, from the RTO/RPO.', 'Hint 2: start in staging with a planned switchover (no data loss), then production with traffic shifted gradually (weights), then an unplanned failure simulation.', 'Hint 3: assign roles: incident commander, scribe, operator, observer; record timestamps.'],
    a: `<p><b>Goals.</b> RTO under 5 min, RPO under 10 s, no double charges, runbook executable by someone who did not write it. <b>Prep.</b> Dashboards in both Regions, lag alarm, quotas raised, secrets/KMS/AMIs present, status page draft, a rollback plan and a freeze on deploys. <b>Stage 1 (staging):</b> planned Aurora switchover and Route 53 flip; fix what breaks. <b>Stage 2 (production, planned):</b> shift 5% then 25% then 100% of traffic to us-west-2 with weighted records, perform planned switchover, run for 30 min, fail back. <b>Stage 3 (unplanned simulation):</b> in staging, block traffic to the primary Region and run the unplanned failover with data-loss flag; measure lag and lost writes. <b>Timeline example:</b> T0 inject; T+2 min alarm fires; T+3 declare; T+4 promote; T+6 scale; T+7 traffic served; record each. <b>Abort:</b> error rate above 2% for 2 min, p99 above 3 s, or unknown state. <b>Measures:</b> time per step, data lost, errors, customer impact, human confusion points. <b>After:</b> blameless review within 48 h, ticket per gap with owner and date, repeat in 3-6 months.</p>`,
    code: SH(R`# Gradually shift traffic to the standby Region with weighted records (weights are relative). Placeholder zone id.
shift () {
  aws route53 change-resource-record-sets --hosted-zone-id Z0123456789EXAMPLE --change-batch "{
    \"Changes\": [
      {\"Action\":\"UPSERT\",\"ResourceRecordSet\":{\"Name\":\"api.example.com.\",\"Type\":\"CNAME\",\"SetIdentifier\":\"use1\",\"Weight\":$1,\"TTL\":60,\"ResourceRecords\":[{\"Value\":\"api-use1.example.com\"}]}},
      {\"Action\":\"UPSERT\",\"ResourceRecordSet\":{\"Name\":\"api.example.com.\",\"Type\":\"CNAME\",\"SetIdentifier\":\"usw2\",\"Weight\":$2,\"TTL\":60,\"ResourceRecords\":[{\"Value\":\"api-usw2.example.com\"}]}}
    ]}"
}
shift 95 5      # step 1: 5% to us-west-2, then watch error rate and latency for 10 minutes
# shift 75 25   # step 2
# shift 0 100   # step 3: full shift; planned database switchover happens here
# shift 100 0   # fail back`, 'Bash: weighted traffic shift for the game day'),
    cx: `<p>A real game day takes a day to run and a week to follow up.</p>`
  }));
  practice.push(P({
    t: 'Prevent split brain when promoting a database in another Region',
    l: 'Hard', tags: ['split brain', 'fencing', 'failover'], co: ['MongoDB', 'Cockroach Labs'],
    s: `<p>A self-managed PostgreSQL primary in Region A replicates asynchronously to a standby in Region B. A script promotes B when A fails three health checks. Explain how this can create two writable primaries, then redesign the failover so that split brain is prevented. Cover who decides, how the old primary is fenced, what happens to the lag, how clients find the new primary, and what to do on failback. Mention managed alternatives.</p>`,
    ex: `<p>Decision from a third vantage point or a quorum; <span class="c-g">fence first, promote second</span>; clients use a single endpoint updated by the controller.</p>`,
    bw: `<p>"Promote when the standby cannot reach the primary." That condition is also true during a network partition, when the primary is still alive and accepting writes from its side.</p>`,
    q: ['What must happen before the standby is promoted?', ['The old primary is fenced so it can no longer accept writes', 'Nothing; promote immediately', 'The standby is restarted twice', 'DNS TTL is raised to 24 hours'], 0, 'Fencing removes the risk of two writers: revoke credentials/shut down the old primary or use a lease that has expired. Only then promote.'],
    h: ['Hint 1: the standby alone cannot tell "primary dead" from "I am cut off".', 'Hint 2: use a third party (quorum or arbiter) and a lease with an expiry.', 'Hint 3: fence by removing the old primary\'s ability to write: stop instance, detach network, revoke role, or let a lease run out.'],
    a: `<p><b>Why it breaks.</b> The health check measures reachability from the standby only. In a partition the primary is healthy for its clients, the standby promotes itself, and now both accept writes: diverging history, double charges, a painful merge. <b>Redesign.</b> (1) <b>Decision:</b> a controller outside both Regions (or a quorum such as etcd/Consul across three places, or a managed service) decides, based on checks from several vantage points, plus a human approval for Region-level failover. (2) <b>Lease:</b> the primary may write only while it holds a lease renewed every few seconds; if it cannot renew it demotes itself (read-only). The standby promotes only after the lease expiry plus a margin, so there is never an overlap. (3) <b>Fence:</b> the controller also forces the old primary down (stop the instance via the cloud API, revoke the database role, remove security-group access); if it cannot, it does not promote automatically. (4) <b>Clients</b> use one endpoint (DNS name, proxy, or Global Accelerator) that the controller updates after promotion; pools reconnect with short TTL. (5) <b>Lag:</b> record the standby's replay position at promotion and store lost transactions for reconciliation from logs. (6) <b>Failback:</b> rebuild the old primary as a fresh standby from the new primary (pg_basebackup or rewind), never reattach it as-is. <b>Managed alternatives:</b> Aurora Global Database (explicit detach and promote, enforced single writer), RDS Multi-AZ inside one Region, or a consensus database (Spanner, CockroachDB) when you need automatic cross-Region failover with strong consistency.</p>`,
    cx: `<p>Design problem. Test it by blocking the network between Regions in a game day and verifying only one writer remains.</p>`
  }));
  practice.push(P({
    t: 'FinOps program for 40 teams: budgets, anomalies and commitments',
    l: 'Hard', tags: ['FinOps', 'budgets', 'Savings Plans', 'governance'], co: ['Intuit', 'Atlassian'],
    s: `<p>A company with 40 engineering teams and a $1.2M monthly AWS bill wants a FinOps programme in 90 days. Define the operating model (who does what), the first 30/60/90-day plan, the dashboards and unit metrics, the budget and anomaly setup (give a Terraform budget), the commitment strategy for Savings Plans and RIs, and the policies (tag enforcement, non-prod scheduling, Spot usage). Explain how you avoid making engineers feel policed.</p>`,
    ex: `<p>Day 30: visibility (tags, showback). Day 60: quick wins (waste, endpoints, scheduling) and a first commitment at 70% of the floor. Day 90: unit costs, budgets per team, quarterly review.</p>`,
    bw: `<p>Finance sends an angry email about the bill and a central team cuts instance sizes without asking owners. Services slow down, trust drops, and the savings vanish in two months.</p>`,
    q: ['Which comes first in a FinOps programme?', ['Visibility: tags, allocation and showback per team', 'A three-year commitment for everything', 'Switching all workloads to Spot', 'Blocking all new resources'], 0, 'You cannot optimise what you cannot attribute. Inform comes first, then Optimize, then Operate.'],
    h: ['Hint 1: use the three phases Inform, Optimize, Operate.', 'Hint 2: engineers own their cost; the central team gives data and tools.', 'Hint 3: report a unit cost, not only the total.'],
    a: `<p><b>Model.</b> A small FinOps team (2 people) with a champion in each group of teams; engineering owns decisions, finance owns forecast and commitments, platform owns tooling. <b>Days 0-30 (Inform):</b> tag standard and enforcement, cost allocation tags activated, showback dashboard (per team, per service, week over week), unallocated under 10%. <b>Days 30-60 (Optimize):</b> remove waste (unattached volumes, idle load balancers, old snapshots), S3 gateway endpoints, schedule non-prod off at night (about 70% of those costs), rightsizing from Compute Optimizer, Graviton pilots, first Compute Savings Plan at about 70% of the 60-day hourly floor. <b>Days 60-90 (Operate):</b> budgets per team with 50/80/100% and forecast alerts, Cost Anomaly Detection per service and tag, unit cost (cost per 1,000 orders) in the product review, quarterly commitment ladder, Spot for CI and batch. <b>Policies:</b> SCP denies expensive instance types in dev; tag-or-delete for sandbox accounts after 7 days. <b>Culture:</b> celebrate savings by the team that found them, share the wins, give teams a reinvestment share, and review costs in the same meeting as reliability. The metrics: unallocated percentage, commitment coverage and utilisation, waste percentage, unit cost trend, and forecast accuracy.</p>`,
    code: HC(R`resource "aws_budgets_budget" "team_checkout" {
  name         = "team-checkout-monthly"
  budget_type  = "COST"
  limit_amount = "60000"
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  cost_filter {
    name   = "TagKeyValue"
    values = ["user:team$checkout"]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = ["checkout-leads@example.com"]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = ["checkout-leads@example.com", "finops@example.com"]
  }
}`, 'Terraform: a per-team monthly budget'),
    cx: `<p>An operating model; results appear in the unit-cost trend over quarters.</p>`
  }));
  practice.push(P({
    t: 'Tier DR per tenant in a multi-tenant SaaS',
    l: 'Hard', tags: ['DR', 'multi-tenant', 'cost', 'design'], co: ['Salesforce', 'Atlassian'],
    s: `<p>A B2B SaaS has 2,000 tenants. Three plans: Free (no SLA), Business (99.9%, RTO 4 h, RPO 15 min), Enterprise (99.99%, RTO 15 min, RPO 1 min). All tenants share one Aurora cluster in us-east-1. Design a per-plan DR architecture that does not double the whole bill: data layout, replication, which tenants get which tier, routing, the failover procedure for each plan, how a tenant upgrades, and the cost multiplier per plan. Mention cell-based design.</p>`,
    c: LAB_AWS,
    ex: `<p>Enterprise tenants live in a dedicated cell with a warm standby in us-west-2; Business tenants get cross-Region snapshot/PITR restore; Free tenants rely on daily backups. <span class="c-g">Total uplift about 1.3x, not 2x.</span></p>`,
    bw: `<p>Put everyone on the same multi-Region active-active design: every free user costs the same DR bill as an enterprise customer.</p>`,
    q: ['What is a cell-based architecture good for in this design?', ['Isolating groups of tenants so a DR tier and blast radius can differ per cell', 'Making every tenant share one database', 'Removing the need for backups', 'Reducing DNS TTL'], 0, 'Cells are independent copies of the stack serving a slice of tenants. They limit blast radius and allow different DR tiers per slice.'],
    h: ['Hint 1: separate data by tier (cells or separate clusters) so replication can differ.', 'Hint 2: map each plan to a strategy: Enterprise warm standby/active-active, Business pilot light with PITR, Free backup &amp; restore.', 'Hint 3: include how a tenant moves between cells.'],
    a: `<p><b>Layout.</b> Cell A (Enterprise, 100 tenants): its own Aurora Global Database with a warm standby app tier in us-west-2; Route 53 failover per cell hostname. Cell B (Business, 700 tenants): single Aurora cluster with continuous backup and cross-Region snapshot copies every 15 minutes (or a smaller read replica cluster), IaC to rebuild the app tier (pilot light: database ready, compute scaled up on declaration). Cell C (Free, 1,200 tenants): daily snapshots copied to us-west-2 and rebuilt by IaC; no SLA. A router looks up the tenant's cell in a small, highly available global table (DynamoDB global table) and sends requests to that cell's endpoint. <b>Failover.</b> Enterprise: automated health check, global database failover in about a minute, scale-up, DNS in about 5 minutes. Business: runbook, restore or promote, 1-4 hours, RPO 15 min. Free: restore when capacity allows. <b>Upgrade:</b> move a tenant between cells with an online export/replicate and a switch of the router entry. <b>Cost.</b> Enterprise cell about 1.5x of its own base; Business about 1.15x; Free about 1.05x; because Enterprise is a small share of data the blended uplift is about 1.25-1.35x. <b>Operations:</b> game day per cell type, lag alarms per cell, and a clear contract that matches the plan.</p>`,
    cx: `<p>Design problem. Cells also help deployments: roll out to the Free cell first.</p>`
  }));

  // ───────────────────────── Quiz ─────────────────────────
  function Q(q, options, answer, explain) { quiz.push({ q: q, options: options, answer: answer, explain: explain }); }
  Q('Which sign most clearly shows you have built a <b>distributed monolith</b>?', ['Five services must be deployed together in a fixed order and they share one database', 'Each service has its own database and team', 'Services communicate through events', 'A service has a circuit breaker'], 0, 'Lockstep releases and a shared database mean the services are not independent: you have network calls and operational cost without independent deployability.');
  Q('Three layers each retry a failing call twice (three attempts each). How many calls reach the failing service per user request?', ['27', '9', '6', '3'], 0, 'Attempts multiply across layers: 3 x 3 x 3 = 27. Retry at one layer and use a retry budget.');
  Q('Which work belongs on an <b>asynchronous</b> path in an order flow?', ['Sending the confirmation email and updating the search index', 'Authorising the card the user is waiting on', 'Checking stock for the cart the user is viewing', 'Validating the shipping address on the form'], 0, 'The user does not wait for email or indexing; a queue/event decouples them and survives downstream outages. The other items need an answer immediately.');
  Q('In Istio, which resource defines <b>subsets</b> (v1, v2 by pod label) used by weighted routing?', ['DestinationRule', 'PeerAuthentication', 'Gateway', 'ServiceEntry'], 0, 'A DestinationRule defines subsets by label; a VirtualService then routes weights to those subsets.');
  Q('You set Istio PeerAuthentication to STRICT for a namespace before injecting sidecars into all callers. What happens to un-injected callers?', ['Their plain-text connections are refused', 'Nothing; they are upgraded automatically', 'They are sent to a waypoint proxy', 'They are limited to GET requests'], 0, 'STRICT accepts only mTLS. Start with PERMISSIVE, inject all callers, then tighten.');
  Q('Which statement about <b>ambient mode</b> is correct?', ['ztunnel provides node-level L4 mTLS, and a waypoint proxy is added only where L7 features are needed', 'Every pod still gets two sidecars', 'It removes mTLS', 'It works only without Kubernetes'], 0, 'Ambient splits L4 (shared ztunnel per node) from L7 (optional waypoint), reducing per-pod overhead and enabling the mesh without restarting pods.');
  Q('A system needs RTO 30 minutes and RPO 5 minutes, and the budget is tight. Which AWS strategy is the cheapest that fits, typically?', ['Pilot light', 'Backup and restore', 'Multi-site active/active', 'No DR; Multi-AZ only'], 0, 'Backup and restore typically takes hours. Pilot light keeps data replicated and scales compute on demand in tens of minutes. Active/active is more than needed. (Check by testing that 30 minutes is really achievable.)');
  Q('The primary Region fails and a cross-Region replica was 40 seconds behind. What does this mean?', ['About 40 seconds of committed writes are lost, which is the achieved RPO', 'Nothing is lost because the replica is synchronous', 'The RTO is 40 seconds', 'The replica must be rebuilt'], 0, 'Asynchronous replication lag at the moment of failure is the data loss. That is why lag is monitored against the RPO.');
  Q('Why are DynamoDB global tables risky for a shopping cart stored as one item with a list attribute?', ['Concurrent writes in two Regions resolve by last-writer-wins and one change can be lost', 'They do not support lists', 'They are always strongly consistent', 'They only replicate once per day'], 0, 'Conflicts resolve per item with last-writer-wins. Model additions as separate items or give each cart a home Region.');
  Q('A Savings Plan commitment of $10/hour is purchased, but usage covered is only $6/hour for a month. What happens?', ['The full $10/hour is still paid', 'Only $6/hour is billed', 'The commitment is refunded', 'The plan converts to Spot'], 0, 'Savings Plans are a commitment to spend per hour whether or not you use it, so commit to the floor of usage.');
  Q('Which change removes most of the NAT gateway data-processing charge for traffic to S3?', ['A VPC gateway endpoint for S3', 'Moving the NAT to a larger subnet', 'Using Spot instances', 'Turning on S3 Intelligent-Tiering'], 0, 'Gateway endpoints are free and route S3 traffic privately, bypassing the NAT and its per-GB fee.');
  Q('Two independent servers, each 99% available, either one sufficient, in series with a database at 99.9%. The system availability is closest to:', ['99.89%', '98.9%', '99.99%', '99.0%'], 0, 'App pair = 1 - 0.01^2 = 99.99%; times 99.9% = about 99.89%. The single database is now the limiting component.');
  Q('Which Well-Architected pillar asks "can you roll back a release quickly and learn from incidents"?', ['Operational Excellence', 'Cost Optimization', 'Sustainability', 'Performance Efficiency'], 0, 'Operational Excellence covers running workloads, deployments, runbooks, game days and learning from failure.');
  Q('A DNS failover record has TTL 300 s and the health check needs 3 failures at 10 s intervals. Roughly how long until clients can be on the standby (ignoring other work)?', ['Up to about 330 seconds', 'About 10 seconds', 'About 3 seconds', 'Exactly 300 seconds'], 0, 'Detection is about 30 s (3 x 10 s) and clients can keep the cached answer for up to the TTL (300 s). A lower TTL or Global Accelerator reduces this.');
  Q('What is the main purpose of fencing during a failover?', ['Prevent the old primary from accepting writes so there is no split brain', 'Reduce data transfer costs', 'Speed up DNS', 'Encrypt backups'], 0, 'Fencing makes sure only one writer exists: stop or isolate the old primary before promoting the new one.');

  // ───────────────────────── Interview ─────────────────────────
  interview.push({ q: 'How do you decide microservice boundaries, and how do you avoid a distributed monolith?', level: 'I', a: `<p>I draw boundaries around business capabilities and teams, not technical layers, and test them with four questions: does each service own its data, can it deploy alone, does a request touch only a few services, and does the product degrade gracefully when one is down. The warning signs are a shared database, release trains, a deep chain of synchronous calls and services that always change together. When I see them I fix the data ownership first (APIs or events instead of shared tables), merge services that always move together, and move non-critical work to asynchronous events. I would rather have fewer, well-bounded services than many tiny ones, and for a small team a modular monolith is often the right start.</p>`, followUps: ['When would you merge two services?', 'How do you migrate a shared table to one owner?'] });
  interview.push({ q: 'Explain a retry storm and how you prevent it.', level: 'I', a: `<p>If each of h layers retries r times, one request can become (r+1)^h calls on the failing service, so the failure feeds itself: more load, slower responses, more timeouts, more retries. To prevent it I retry in only one layer, use exponential backoff with jitter, add a retry budget (retries limited to about 10% of requests), put circuit breakers in front of struggling dependencies, pass deadlines so abandoned work is dropped, and shed load on the server side. I also check hidden retries: Istio retries twice by default for some failures, so a mesh on top of app retries multiplies attempts.</p>`, followUps: ['How does a circuit breaker differ from a retry budget?', 'Which errors are safe to retry?'] });
  interview.push({ q: 'Sync or async between services? Give a rule and an example.', level: 'B', a: `<p>Use synchronous calls when the caller needs the answer to continue (price lookup, authorisation) and asynchronous messages when the work can finish later (email, indexing, analytics). Sync couples availability and latency: a chain of three 99.9% services is about 99.7% available. Async decouples them, at the cost of eventual consistency, duplicates (so idempotent consumers) and a need for dead-letter queues. In a checkout, payment authorisation is synchronous and everything after the order is saved is asynchronous through events.</p>`, followUps: ['How do you make a consumer idempotent?', 'What is the outbox pattern for?'] });
  interview.push({ q: 'What does a service mesh give you, and what does it cost?', level: 'I', a: `<p>A mesh moves cross-cutting network behaviour out of the apps: mTLS and workload identity, authorisation by identity, retries, timeouts, circuit breaking, traffic splitting for canaries, fault injection and uniform telemetry, all configured centrally. The costs are an extra control plane to run and upgrade, more YAML, sidecar CPU and memory (or waypoints in ambient mode), a few milliseconds per hop, and new failure modes such as a bad VirtualService affecting many services. I would adopt one when there are many services in several languages and a need for mTLS and traffic control, and not for a handful of services.</p>`, followUps: ['When would you pick Linkerd or ambient?', 'What happens if istiod is down?'] });
  interview.push({ q: 'Show how you would do a 5% canary in Istio and what you check before going to 25%.', level: 'I', a: `<p>Label the pods with a version, define subsets in a DestinationRule, and give the VirtualService weights 95 and 5 for v1 and v2. Before 25% I compare v2 to v1 over a full window: error rate, p99 latency, saturation (CPU, DB connections), business metrics such as checkout success, and new log patterns. The split is per request, so if sessions must stay on one version I add a header or cookie match. Rollback is setting the weight back to zero. A tool like Argo Rollouts or Flagger can automate the steps with metric gates.</p>`, followUps: ['How do you keep a user on one version?', 'What if some callers bypass the sidecar?'] });
  interview.push({ q: 'How do you roll out mTLS safely and what is the difference between PeerAuthentication and AuthorizationPolicy?', level: 'A', a: `<p>PeerAuthentication controls the transport: whether a workload accepts plain text or only mTLS (PERMISSIVE, STRICT, DISABLE). AuthorizationPolicy controls who may call what, using the caller's identity (service account), namespace, methods and paths. I roll out by injecting everything under PERMISSIVE, using telemetry to find plain-text callers, fixing them, then STRICT per namespace, then mesh-wide, and finally adding ALLOW policies for sensitive services so mTLS identity is actually used. Rollback at each step is setting PERMISSIVE.</p>`, followUps: ['How do health probes work under STRICT?', 'How are certificates rotated?'] });
  interview.push({ q: 'Define RTO and RPO and describe the four AWS DR strategies.', level: 'B', a: `<p>RTO is how long the service may be down; RPO is how much data, measured in time, may be lost. Backup and restore keeps only backups (RTO hours, RPO hours). Pilot light replicates data continuously and keeps compute off or minimal (RTO tens of minutes, RPO seconds to minutes). Warm standby keeps a small full stack running (RTO minutes). Multi-site active/active runs full stacks in several Regions (RTO near zero, RPO near zero) at roughly double the cost. I choose per workload by the cost of an hour of downtime and an hour of lost data, and prove the numbers with game days.</p>`, followUps: ['Why is replication not a backup?', 'How do you decide who declares a disaster?'] });
  interview.push({ q: 'Your DR failover test failed. What are the usual causes?', level: 'I', a: `<p>The same gaps appear again and again: service quotas in the DR Region that are too low, AMIs or container images not copied or stale, KMS keys, secrets and certificates missing in the DR Region, infrastructure drift between Regions, DNS TTLs longer than the RTO, replication lag larger than the RPO, runbooks stored in the failed Region, and nobody knowing who may declare the disaster. The fix is to treat DR as a pipeline: IaC deploys both Regions, copies run automatically, quotas and lag have alarms, and quarterly game days measure the achieved RTO and RPO.</p>`, followUps: ['What belongs in a game-day plan?', 'How do you test without risking production?'] });
  interview.push({ q: 'Active-active or active-passive across Regions? How do you handle data consistency and split brain?', level: 'A', a: `<p>Active-passive is simpler and cheaper and fits most RTO targets of minutes. Active-active gives lower latency and no failover wait but needs a plan for concurrent writes. I either give each record a home Region that owns its writes, or use a conflict rule such as last-writer-wins or mergeable operations (add-only items, counters). Replication is asynchronous because synchronous cross-Region commits add 60-100 ms and block writes during a partition, so lag is the RPO and must be monitored. Split brain is avoided by a decision from a third vantage point or quorum, a lease, and fencing the old primary before promoting.</p>`, followUps: ['What does DynamoDB global tables do on conflict?', 'How does Aurora Global Database handle unplanned failover?'] });
  interview.push({ q: 'How would you route users between Regions with Route 53, and what limits failover speed?', level: 'I', a: `<p>Failover routing with health checks for active-passive, latency routing with health checks for active-active, weighted routing for gradual shifts and drains, geolocation for residency. Speed is limited by health-check interval times failure threshold (for example 10 s x 3), plus the DNS TTL that resolvers may cache, plus the time to promote and scale the standby. For seconds-level failover I would use Global Accelerator or Application Recovery Controller routing controls. I avoid relying on control-plane edits during a disaster: pre-create the records and let health checks flip them.</p>`, followUps: ['What is alias record health evaluation?', 'Why might a resolver ignore a 60 s TTL?'] });
  interview.push({ q: 'Our AWS bill doubled with only 8% more traffic. How do you investigate?', level: 'I', a: `<p>Cost Explorer by service, then usage type, then tag or account. For a sudden jump in EC2-Other I look at NatGateway-Bytes and DataTransfer-Regional-Bytes. Typical causes are a workload moved to private subnets reading S3 through a NAT, cross-AZ chatter from a new service pair, debug logging into CloudWatch Logs, or a forgotten large cluster. Fixes are gateway endpoints for S3 and DynamoDB, zone-aware routing, one NAT per AZ, lower log levels, and deleting waste. Then I add guardrails: budgets with forecast alerts, Cost Anomaly Detection and tag-based ownership. I would not buy a commitment before the bug is fixed.</p>`, followUps: ['What do cross-AZ transfers cost?', 'How would you allocate shared NAT costs to teams?'] });
  interview.push({ q: 'Savings Plans, Reserved Instances and Spot: how do you choose and how much do you commit?', level: 'I', a: `<p>Spot for interruption-tolerant work (batch, CI, stateless workers behind retries) at up to about 90% off; Savings Plans for the steady compute floor, with Compute Savings Plans for flexibility across families, Regions, Fargate and Lambda; Reserved Instances mainly where Savings Plans do not apply, such as RDS and ElastiCache. I commit to about 70-80% of the minimum hourly spend over the last 60 days, not the average, because the commitment is paid whether used or not. I buy in steps (a ladder) so terms expire at different times, and track coverage and utilisation.</p>`, followUps: ['What is the break-even utilisation of a plan at 38% discount?', 'How do you run Spot safely on Kubernetes?'] });
  interview.push({ q: 'Walk through the Well-Architected pillars for a system you designed and name the trade-off you accepted.', level: 'A', a: `<p>I walk all six: operational excellence (IaC, canary deploys, runbooks, game days), security (roles not keys, encryption, least privilege, audit), reliability (Multi-AZ, tested failover with stated RTO/RPO, timeouts and breakers), performance (load-tested autoscaling, caching, right instance family), cost (Savings Plan for the floor, Spot for workers, lifecycle rules, tags), and sustainability (Graviton, scheduled non-prod). Then I name one trade-off clearly: for example accepting a 5-minute RTO with warm standby rather than active-active because active-active doubles cost and adds data-conflict complexity the business does not need.</p>`, followUps: ['How would you run a review without it becoming paperwork?', 'Which pillar usually gets neglected, and why?'] });
  interview.push({ q: 'A team says "we added a second replica so availability is now 99.99%". How do you challenge that?', level: 'A', a: `<p>The parallel formula 1-(1-A)^n only holds for independent failures. I ask what the replicas share: the same AZ, the same bad deployment, the same database, the same dependency or quota. I then compute the series with the weakest single component, since a redundant app tier in front of one database is limited by the database. I would also ask how they measure availability (from the user's side), whether failover is automatic and tested, and what the common-mode failures are (deploys, certificates, configuration). Improvements include spreading across AZs, staggered deploys, cell-based isolation and removing single points of failure in order of impact.</p>`, followUps: ['How many minutes per month is 99.99%?', 'What is a cell-based architecture?'] });

  // Rotate the options so the correct answer is not always first (answers are written first for clarity).
  function rot(q, i) { var n = q.options.length, k = (i * 3 + 1) % n; q.options = q.options.slice(k).concat(q.options.slice(0, k)); q.answer = (q.answer - k + n) % n; }
  quiz.forEach(rot);
  practice.forEach(function (p, i) { rot(p.mcq, i + 1); });
  topics.forEach(function (t, i) { (t.problems || []).forEach(function (p) { rot(p.mcq, i + 2); }); });

  registerModule({
    id: 'devops17',
    title: 'Advanced Cloud Architecture',
    langExplain: `<p>This module uses several languages because real cloud architecture is a mix. <b>YAML</b> is the main one: Istio (VirtualService, DestinationRule, PeerAuthentication) and Kubernetes manifests. <b>Bash</b> with the AWS CLI shows runbooks, drills and cost queries. <b>JSON</b> appears in AWS API documents (Route 53 change batches, S3 replication and lifecycle). <b>Terraform (HCL)</b> shows infrastructure as code for backups, DynamoDB global tables and budgets. <b>Python</b> is used for the small calculations (retry amplification, traffic splits, DR tier choice, availability and cost) because the standard library runs them anywhere and they are easy to test. The concepts are cloud-neutral; the service names are AWS, with Azure and Google Cloud equivalents noted where useful.</p>`,
    intro: `<p>You can already run containers, Kubernetes and a cloud account. This module is about the questions that decide whether a system survives a bad day and whether the bill stays sane: <b>how to cut services apart without making a distributed monolith</b>, how a <b>service mesh (Istio)</b> adds traffic control, resilience and mTLS, how to choose a <b>disaster recovery strategy</b> from RTO and RPO, how <b>multi-Region</b> designs really work (and fail), how to <b>cut cloud cost</b> without hurting reliability, and how to review any design with the <b>Well-Architected Framework</b>. Every topic starts from an incident you will recognise: a failover never tested, a retry storm, a missed RPO, a doubled bill, a mesh that added latency.</p>
      <p>Labs are free and local (Istio on kind) or design exercises. Optional AWS steps carry cost warnings and use placeholders only.</p>`,
    goals: [
      'Draw <b>microservice boundaries</b> that avoid the distributed monolith, choose <b>sync vs async</b> per call, and protect calls with timeouts, <b>retry budgets</b>, backoff with jitter and circuit breakers',
      'Configure <b>Istio</b> weighted routing, retries and timeouts, circuit breaking (outlier detection), fault injection and <b>STRICT mTLS</b> with AuthorizationPolicy, and compare <b>sidecar and ambient</b> mode',
      'Choose a <b>DR strategy</b> (backup and restore, pilot light, warm standby, multi-site) from RTO and RPO, write the runbook, and prove it with a <b>game day</b>',
      'Design <b>multi-Region</b> systems: Route 53 failover and latency routing, Aurora Global Database, S3 replication and DynamoDB global tables, active-active vs active-passive, consistency and <b>split brain</b>',
      'Cut cloud cost with <b>rightsizing, Savings Plans/RIs/Spot, storage tiers</b>, data-transfer fixes (NAT, cross-AZ), tagging and showback, and basic <b>FinOps</b>',
      'Review a design against the six <b>Well-Architected pillars</b> with concrete questions, compute <b>composite availability</b>, and state the trade-offs you accept'
    ],
    prereqs: `<p><b>Required:</b> <b>Managed Cloud Services</b> (DevOps 12: databases, load balancers, queues) and <b>Observability &amp; Monitoring</b> (DevOps 14: metrics, SLOs, alerting), because every design here is judged by what you can measure. <b>Helpful:</b> <b>HLD 10</b> (CAP and PACELC, consistency models), <b>BE 10</b> (microservice patterns: saga, outbox, API gateway) and <b>BE 14</b> (cloud architecture on AWS). This module builds on them and does not repeat the patterns themselves.</p>`,
    hours: 14,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
