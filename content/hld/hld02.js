// HLD 02 — Scalability Basics
// Vertical vs horizontal scaling, stateless services, session handling, load balancers
// (round robin, least connections), single points of failure, read replicas intro.
(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ---------- small helpers shared by the visualizers ---------- */
  // a box node for architecture diagrams
  function B(id, label, x, y, w) { var n = { id: id, label: label, x: x, y: y, shape: 'box' }; if (w) n.w = w; return n; }
  // a directed architecture graph part
  function G(label, nodes, edges, hl, ehl, tags, height) {
    return { type: 'graph', label: label, directed: true, height: height || 60, nodes: nodes, edges: edges, hl: hl || {}, ehl: ehl || {}, tags: tags || {} };
  }
  function V(label, vals, hl) { return { type: 'vars', label: label, vals: vals, hl: hl || {} }; }
  function T(html, label) { var p = { type: 'text', html: html }; if (label) p.label = label; return p; }
  function copy(o) { var r = {}; for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) r[k] = o[k]; return r; }
  // parse "key=value" pairs such as "servers=3 fail=S2 at=4"
  function kvParse(input) {
    var out = {}, re = /(\w+)\s*=\s*([\w.]+)/g, mm;
    while ((mm = re.exec(String(input || '')))) out[mm[1].toLowerCase()] = mm[2];
    return out;
  }
  function fmt(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

  /* =====================================================================
     TOPIC 1 — Vertical vs Horizontal Scaling
     ===================================================================== */
  topics.push({
    title: 'Vertical vs Horizontal Scaling (Scale Up vs Scale Out)',
    analogy: `<p>Your street food stall is famous and the queue is around the block. You have two choices.</p>
      <ul>
        <li><b>Scale up (vertical):</b> keep <i>one</i> cook, but give them a bigger stove, sharper knives and a bigger kitchen. Easy — nothing else changes. But one cook can only move so fast, a mega-kitchen costs a fortune, and if that cook gets sick the stall closes.</li>
        <li><b>Scale out (horizontal):</b> hire <i>more</i> cooks with normal stoves, and put someone at the front who sends each order to a free cook. Now you can keep adding cooks almost forever, and one sick cook is no disaster. But the cooks must follow the same recipe book and nobody may keep secret notes in their own pocket.</li>
      </ul>
      <p>That is the whole topic: <b>bigger machine</b> vs <b>more machines</b>.</p>`,
    explain: `<p><b>Scalability</b> means: when more users show up, can the system handle them by adding resources, without being rewritten? There are two basic ways to add resources.</p>
      <h4>1. Vertical scaling — "scale up"</h4>
      <p>Move your app to a bigger machine: more CPU cores, more RAM, faster disk (NVMe SSD), faster network card. In the cloud this is often just "stop the VM, pick a larger size, start it".</p>
      <ul>
        <li>${H.c('g', 'Pros:')} zero code changes, no distributed-systems headaches, one database stays simple and strongly consistent, great first move.</li>
        <li>${H.c('r', 'Cons:')} there is a <b>ceiling</b> (the biggest machine you can buy), price grows <b>faster</b> than capacity at the top end, resizing usually needs a restart (downtime), and it is still <b>one machine = one point of failure</b>.</li>
      </ul>
      <h4>2. Horizontal scaling — "scale out"</h4>
      <p>Run many copies of the app on ordinary machines and put a <b>load balancer</b> in front that spreads requests across them.</p>
      <ul>
        <li>${H.c('g', 'Pros:')} near-unlimited growth (just add boxes), cheap commodity hardware, one box dying is fine (redundancy), you can add/remove boxes automatically with traffic (autoscaling).</li>
        <li>${H.c('r', 'Cons:')} the app must be <b>stateless</b> (next topic), you need a load balancer, and shared data (database, cache, sessions) becomes the hard part.</li>
      </ul>
      ${H.table(['Question', 'Vertical (up)', 'Horizontal (out)'], [
        ['What do you add?', 'Bigger CPU/RAM on one box', 'More boxes of the same size'],
        ['Code changes?', 'None', 'Must be stateless + load balancer'],
        ['Upper limit', H.c('r', 'Hard ceiling (largest machine)'), H.c('g', 'Practically none for the app tier')],
        ['Failure', H.c('r', 'One box = single point of failure'), H.c('g', 'Lose 1 of N, keep serving')],
        ['Cost curve', 'Cheap at first, very expensive at the top', 'Roughly linear: 2× boxes ≈ 2× cost'],
        ['Typical use', 'Databases early on, quick fixes', 'Web/app servers, workers, caches']
      ])}
      <p><b>Rule of thumb used in real companies:</b> scale the <b>stateless app tier out</b> (it is easy) and scale the <b>database up</b> for as long as you can (because splitting a database is hard — that comes in later modules on replication and sharding).</p>
      <p>Small numbers to feel it: one modest 4-vCPU web server might handle about ${H.c('b', '1,000–3,000 simple requests/second')}. If your peak is 20,000 requests/second, scaling up means finding one machine ~10× stronger; scaling out means running ~10–15 of the same small machines behind a load balancer (with some headroom).</p>`,
    clues: [
      '"The server is at 95% CPU, what do you do?" → first answer: scale up quickly, then plan to scale out',
      '"Design for 10M users" / "millions of requests" → horizontal scaling of the app tier is expected',
      '"Must survive a machine failure" → one big machine is not enough; you need ≥ 2 (scale out)',
      '"Traffic spikes 10× during sales/events" → horizontal + autoscaling, not resizing a VM',
      '"Small internal tool, 50 users" → vertical (or just one small box) is the right, simple answer',
      '"Database is the bottleneck" → scale up first, then read replicas, then sharding'
    ],
    code: { lang: 'python', run: true, title: 'How many servers do I need? (runnable)', code: `import math

def servers_needed(peak_rps, per_server_rps, target_util=0.7, spares=1):
    """Size a horizontally scaled, stateless tier.

    peak_rps        -- busiest-minute traffic, not the daily average
    per_server_rps  -- measured with a load test on ONE server
    target_util     -- keep ~30% headroom for spikes, GC pauses, slow dependencies
    spares          -- N+1: we can lose one server at peak and still be fine
    """
    usable = per_server_rps * target_util          # what one server should really take
    return math.ceil(peak_rps / usable) + spares   # round UP, then add the spare(s)


for peak in [500, 5_000, 50_000, 250_000]:
    n = servers_needed(peak, per_server_rps=2_000)
    # utilisation of each survivor if one server dies at peak
    worst = peak / ((n - 1) * 2_000)
    print(f"peak {peak:>7,} rps -> {n:>3} servers  (each ~{worst:.0%} busy if one dies)")
` },
    viz: {
      title: 'Scale UP vs scale OUT as traffic grows',
      input: '500 2000 8000 30000 60000 250000',
      inputLabel: 'Peak requests/second to try (space separated, max 8 values)',
      gen: function (input) {
        var loads = String(input || '').trim().split(/[\s,]+/).filter(Boolean).map(Number);
        if (!loads.length || loads.some(function (x) { return isNaN(x) || x <= 0; })) throw new Error('Enter positive numbers like: 500 2000 8000 30000');
        if (loads.length > 8) throw new Error('Use at most 8 load values');
        // illustrative cloud-like tiers: [name, requests/s it can take, $ per month]
        var tiers = [['2 vCPU', 1000, 70], ['4 vCPU', 2000, 140], ['8 vCPU', 3900, 290], ['16 vCPU', 7500, 620], ['32 vCPU', 14000, 1350], ['64 vCPU', 25000, 3000], ['128 vCPU', 42000, 7000], ['192 vCPU', 55000, 11500]];
        var frames = [], summary = [];
        frames.push({ narr: 'Two ways to grow. <b>Scale UP</b>: move to one bigger machine. <b>Scale OUT</b>: add more 4-vCPU servers (2,000 rps each, run at 70% for headroom, plus 1 spare) behind a load balancer. Numbers are illustrative but shaped like real cloud price lists.', parts: [
          G('Scale UP (one machine)', [B('U', 'Users', 12, 10), B('S', 'Server: 2 vCPU', 62, 10)], [['U', 'S']], {}, {}, {}, 22),
          G('Scale OUT (many machines)', [B('U', 'Users', 8, 25), B('LB', 'Load Balancer', 33, 25), B('S1', 'Server 1', 74, 12), B('S2', 'Server 2', 74, 38)], [['U', 'LB'], ['LB', 'S1'], ['LB', 'S2']], {}, {}, {}, 50),
          T('Watch two things per step: <b>does the single machine still fit?</b> and <b>what does each option cost?</b>')
        ] });
        loads.forEach(function (load) {
          var tier = null;
          for (var i = 0; i < tiers.length; i++) if (tiers[i][1] >= load) { tier = tiers[i]; break; }
          var up = tier || tiers[tiers.length - 1], fits = !!tier;
          var n = Math.ceil(load / 1400) + 1, outCost = n * 140, outCap = n * 2000;
          var nodes = [B('U', 'Users', 8, 25), B('LB', 'Load Balancer', 33, 25)], edges = [['U', 'LB', fmt(load) + ' rps']], hl = { LB: 'cur' }, tags = {};
          var show = Math.min(n, 4), ys = [6, 19, 32, 45];
          for (var k = 0; k < show; k++) {
            var lab = (k === show - 1 && n > 4) ? ('Servers 4…' + n) : ('Server ' + (k + 1));
            nodes.push(B('S' + k, lab, 74, ys[k]));
            edges.push(['LB', 'S' + k]);
            hl['S' + k] = 'ok';
          }
          if (n > 4) tags['S' + (show - 1)] = '+' + (n - 3) + ' boxes';
          var upTag = fits ? Math.round(100 * load / up[1]) + '% busy' : 'OVERLOADED';
          summary.push([fmt(load), fits ? up[0] + ' ($' + fmt(up[2]) + ')' : H.c('r', 'no machine big enough'), n + ' × 4 vCPU ($' + fmt(outCost) + ')']);
          frames.push({
            narr: 'Peak <b>' + fmt(load) + ' rps</b>. ' + (fits
              ? 'Scale UP: the smallest machine that fits is <b>' + up[0] + '</b> at ~$' + fmt(up[2]) + '/month. '
              : '<span class="c-r">Scale UP fails: even the biggest machine (' + up[0] + ', ~' + fmt(up[1]) + ' rps) cannot take this load — we hit the ceiling.</span> ')
              + 'Scale OUT: <b>' + n + '</b> small servers (~$' + fmt(outCost) + '/month) including 1 spare. '
              + (fits && up[2] > outCost ? 'Notice the big box now costs <b>more</b> than many small ones — the top of the price list is a premium.' : (fits ? 'At this size the single machine is still simpler and fine.' : 'Horizontal is the only way forward.')),
            parts: [
              G('Scale UP', [B('U', 'Users', 12, 10), B('S', 'Server: ' + up[0], 62, 10)], [['U', 'S', fmt(load) + ' rps']], { S: fits ? 'ok' : 'bad' }, { 'U-S': fits ? 'ok' : 'bad' }, { S: upTag }, 22),
              G('Scale OUT', nodes, edges, hl, { 'U-LB': 'ok' }, tags, 50),
              { type: 'bars', label: 'Capacity vs load (requests/second)', values: [load, up[1], outCap], idxLabels: ['load', 'UP max', 'OUT total'], hl: { 0: 'cur', 1: fits ? 'ok' : 'bad', 2: 'ok' } },
              V('Cost per month (illustrative)', { 'scale up $': fits ? up[2] : 'impossible', 'scale out $': outCost, 'out servers': n }, { 'scale up $': fits ? '' : 'bad' })
            ]
          });
        });
        frames.push({ narr: 'Summary: scale UP is the easiest first move, but it has a <b>ceiling</b>, gets <b>expensive at the top</b>, and is always <b>one machine that can die</b>. Scale OUT keeps growing roughly linearly — as long as the app is stateless.', parts: [
          { type: 'table', label: 'What each load needs', columns: ['peak rps', 'scale UP', 'scale OUT'], rows: summary },
          T('Real teams do <b>both</b>: right-size each box (vertical) and run many of them (horizontal). This mix is sometimes called <b>diagonal scaling</b>.')
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'A side project with 100 users', html: `<p>A recipe-sharing site gets 100 users a day, maybe 2 requests/second at peak. One small VM running the app <i>and</i> the database is perfect. Adding a load balancer and 3 servers here would be ${H.c('r', 'over-engineering')}: more cost, more moving parts, no benefit.</p>
        <p>${H.c('g', 'Verdict:')} start with one box. If CPU climbs, resize the box (vertical). Interviewers like hearing "I would not distribute this yet".</p>` },
      { title: 'Black Friday: 10× traffic for 6 hours', html: `<p>An online shop normally peaks at 3,000 rps on 4 servers. On Black Friday it expects 30,000 rps for a few hours.</p>
        ${H.table(['Option', 'What happens'], [
          ['Scale up', 'Need one machine ~10× stronger; restarting it causes downtime; you pay for a monster all year or resize twice'],
          ['Scale out', 'Autoscaling group grows from 4 to ~30 servers before the sale (pre-warm), shrinks back after. Pay only for those hours']
        ])}
        <p>${H.c('g', 'Verdict:')} horizontal + autoscaling. Pre-scale before the event, because autoscalers take minutes to react.</p>` },
      { title: 'The database hits 85% CPU', html: `<p>The app tier is already 6 stateless servers. Now the single PostgreSQL box is at 85% CPU. Adding app servers will not help — they all hit the same DB.</p>
        <ol><li>Quick win: <b>scale the DB up</b> (16 → 32 vCPU, more RAM so the working set fits in memory).</li>
        <li>Then: add <b>read replicas</b> if most queries are reads (Topic 6).</li>
        <li>Later: caching (HLD 6) and sharding (HLD 5).</li></ol>
        <p>${H.c('b', 'Lesson:')} the app tier and the data tier scale differently. Always ask "which tier is the bottleneck?"</p>` },
      { title: 'Diagonal scaling in practice', html: `<p>A team runs 40 servers with 2 vCPU each. Each process uses ~1.5 GB RAM of baseline overhead (runtime, libraries). Moving to 20 servers with 4 vCPU each halves that overhead, keeps redundancy (20 is still many), and cuts the bill. Right-sizing each box (vertical) while still running many (horizontal) is normal.</p>` }
    ],
    deepDive: `<p><b>Why does vertical scaling stop paying off?</b> Doubling cores rarely doubles throughput. Threads fight over shared things — locks, memory bandwidth, CPU caches, one database connection pool. The <b>Universal Scalability Law</b> (Neil Gunther) models this: throughput grows, flattens because of <i>contention</i> (waiting for a shared resource), and can even <i>fall</i> because of <i>coherence</i> cost (cores keeping each other's caches in sync). So a 192-core box is rarely 96× a 2-core box.</p>
      <p><b>Horizontal scaling has the same law, one level up.</b> Ten app servers are only 10× faster if they do not all wait on the same thing. If every request does one write to the same database row, adding servers adds contention, not capacity. Scale-out works best for <b>embarrassingly parallel</b> work: independent requests, independent users.</p>
      <p><b>Real limits in 2026:</b> the largest general-purpose cloud VMs reach hundreds of vCPUs and multiple terabytes of RAM (memory-optimised instances go far higher). That is huge — many companies run their main database on one big box for years. The ceiling is not only size: it is also the blast radius (one failure takes everything down) and maintenance (patching the OS means a failover).</p>
      <p><b>Autoscaling realities:</b> horizontal scaling is only "elastic" if new capacity arrives fast. A VM can take 1–3 minutes to boot plus app warm-up (JIT compilation, cache filling, connection pools); containers on an existing node start in seconds. So production setups combine <b>target-tracking autoscaling</b> (e.g. keep CPU near 60%), <b>scheduled scaling</b> for known peaks, and a <b>minimum fleet</b> that already has headroom.</p>
      <p><b>Cell-based architecture</b> (used by AWS and large SaaS companies) is horizontal scaling taken further: instead of one giant fleet, run many independent copies of the whole stack ("cells"), each serving a slice of customers. A bad deploy or overload hits one cell, not everyone.</p>`,
    aiEra: `<p><b>What AI changes:</b> capacity planning used to be a spreadsheet exercise. Today you can paste load-test results and cloud metrics into an AI assistant and get a first-pass sizing ("you need ~14 m-class instances at 70% target utilisation, plus N+1"). Cloud autoscalers also use predictive models that learn daily/weekly traffic shapes and scale <i>before</i> the spike.</p>
      <p><b>AI workloads themselves:</b> serving an LLM is a fresh example of scale up vs out. A single model often needs a <b>bigger GPU</b> (more memory) — vertical. Once the model fits, you serve more users by adding <b>more replicas</b> behind a load balancer — horizontal. Very large models are split across many GPUs (tensor/pipeline parallelism), which is scaling out <i>inside</i> one request.</p>
      <p><b>Use AI as a partner:</b> <code>Here is my p95 latency and CPU from a load test of one server; estimate servers needed for 40k rps with N+1 and explain each assumption</code>. <b>Where AI goes wrong:</b> it uses averages instead of peaks, forgets headroom and the spare, and happily proposes Kubernetes + microservices for a 100-user app. <b>What you must own:</b> knowing which tier is the bottleneck, and saying "not yet" to complexity.</p>`,
    problems: [{
      title: 'Up or Out? Three Teams, Three Answers',
      level: 'Easy', tags: ['vertical scaling', 'horizontal scaling', 'trade-offs'], companies: ['Amazon', 'Microsoft'],
      statement: `<p>Three teams ask you for scaling advice. For each, choose <b>scale up</b>, <b>scale out</b>, or <b>both</b> and justify in one or two sentences.</p>
        <ol><li>Team A: an internal HR dashboard, 80 employees, server at 90% CPU because of one heavy monthly report.</li>
        <li>Team B: a public REST API, 12,000 rps peak and growing 15% per month, must survive a server crash.</li>
        <li>Team C: a single MySQL database at 80% CPU, 70% of its queries are reads, data is 300 GB.</li></ol>`,
      constraints: `Budget matters; the team has 2 engineers; no downtime allowed for Team B.`,
      example: `<p>Team A → ${H.c('g', 'scale up')} (or optimise the report). Team B → ${H.c('g', 'scale out')}. Team C → ${H.c('g', 'scale up now, then read replicas')}. The <b>why</b> is what earns points: size of traffic, availability needs, and which tier is stateful.</p>`,
      brute: { why: `<p>The naive answer is "always scale out, it is what big companies do". For Team A that adds a load balancer, a second server and session handling for 80 users — more cost and more failure modes for zero benefit. For Team C, "just add database servers" ignores that a database is <b>stateful</b>: you cannot just copy it behind a round-robin load balancer, because writes would land on different copies and diverge.</p>` },
      mcq: { q: 'Which team gains LEAST from adding more identical app servers?', options: ['Team A (80 internal users)', 'Team B (public API)', 'All gain equally'], answer: 0, explain: 'Team A has tiny traffic; its problem is one heavy job. A bigger box or a faster query fixes it with no new moving parts.' },
      hints: [`<p>Ask two questions per team: <b>how much traffic</b> (and growth), and <b>must it survive a machine failure</b>?</p>`, `<p>Stateless app servers scale out easily. Databases are stateful — scale them up first, then copy them carefully (replicas).</p>`, `<p>Recipe: tiny + no HA need → scale up. Large/growing + HA → scale out behind a load balancer with N+1. Stateful DB → vertical first, then read replicas for read-heavy load.</p>`],
      solution: {
        approach: `<p><b>Team A — scale up (or fix the query).</b> 80 users means maybe 1 request/second. The CPU spike comes from one monthly report. Options: run the report off-hours, add an index, or resize the VM. A second server adds a load balancer, shared sessions and a bigger bill for no gain.</p>
          <p><b>Team B — scale out.</b> 12,000 rps growing 15%/month is ~2× in 5 months and ~5× in a year; any single machine will hit a ceiling, and "survive a crash" requires at least 2 servers anyway. Make the API stateless, put it behind a load balancer, size with N+1 (e.g. 2,000 rps per server at 70% → ceil(12000/1400) + 1 = 10 servers), and enable autoscaling.</p>
          <p><b>Team C — scale up now, read replicas next.</b> The database is stateful, so a quick vertical bump (more CPU, RAM so the hot 300 GB working set mostly fits in memory) buys time with no code change. Since 70% of queries are reads, add 1–2 read replicas and route reporting/read queries there (Topic 6). Sharding is not needed at 300 GB.</p>`,
        complexity: `<p>Team B sizing: servers = ⌈peak ÷ (per-server rps × target utilisation)⌉ + spares = ⌈12000 ÷ 1400⌉ + 1 = 10.</p>`,
        followUps: ['Team B grows to 200,000 rps — what new bottlenecks appear?', 'When would Team C need sharding instead of replicas?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 2 — Stateless Services
     ===================================================================== */
  topics.push({
    title: 'Stateless Services: The Key That Unlocks Scale-Out',
    analogy: `<p>Call a bank's helpline. On Monday agent Priya helps you and scribbles your problem on a sticky note on <i>her</i> desk. On Tuesday you get agent Rahul — he has no idea who you are, so you start again. That helpline is <b>stateful</b>: your story lives with one agent.</p>
      <p>A good helpline writes everything into a <b>shared CRM system</b>. Any agent can pick up any call, read your history and continue. Agents can go home, new agents can join, and nobody loses your story. That helpline is <b>stateless</b>: the agents hold no memory of their own; the memory lives in one shared place.</p>`,
    explain: `<p>A service is <b>stateless</b> when <b>any copy of it can handle any request</b>, because the server keeps nothing important in its own memory or disk between requests. Everything a request needs is either <b>in the request itself</b> (a token, an id) or in a <b>shared store</b> (database, cache, object storage).</p>
      <p>Why it matters: a load balancer can only spread traffic freely if every server is interchangeable. Stateless servers can be added, removed, restarted, or crash — and users do not notice.</p>
      <h4>Where hidden "state" usually lives (and where to move it)</h4>
      ${H.table(['State in the server', 'Problem when you have 2+ servers', 'Move it to'], [
        ['Login sessions in RAM', 'Next request hits another server → logged out', 'Redis/Memcached session store, or a signed token'],
        ['Shopping cart in RAM', 'Cart "disappears" or differs per server', 'Redis or the database'],
        ['Uploaded files on local disk', 'File exists only on server 1; server 2 returns 404', 'Object storage (S3, GCS, Azure Blob)'],
        ['In-memory counters (rate limits, view counts)', 'Each server counts separately → limit is N× too loose', 'Redis INCR with expiry'],
        ['Cron / timers inside the app', 'Runs once per server → 10 servers send 10 emails', 'A scheduler, a job queue, or leader election'],
        ['Local cache', 'Not wrong, just duplicated and maybe stale', 'OK as an optimisation if a miss is harmless; else shared cache']
      ])}
      <p>The test for "stateless enough": <b>if I kill this server right now and send the next request to a brand new one, does the user notice?</b> If not, you are stateless.</p>
      <p>Note: a "stateless service" still <i>uses</i> state — it just does not <i>own</i> it. The state is pushed down to a layer built for it (databases, caches, queues), which you scale and replicate separately. This idea is factor VI of the classic <b>Twelve-Factor App</b>: "execute the app as one or more stateless, share-nothing processes".</p>`,
    clues: [
      '"Users are randomly logged out after we added a second server" → session state is in server memory',
      '"Make this service horizontally scalable" → first make it stateless',
      '"Uploaded images sometimes return 404" → files on local disk of one server; use object storage',
      '"The nightly email was sent 6 times" → in-app cron runs on every replica',
      '"Rate limit of 100/min lets 400/min through" → per-server counters with 4 servers; centralise the counter',
      '"Autoscaling / containers / Kubernetes pods" → assumes stateless, disposable instances'
    ],
    code: { lang: 'java', title: 'Stateful vs stateless cart server (Java, compiles)', code: `import java.util.*;
import java.util.concurrent.*;

// The ONE shared place session data lives. In production: Redis, Memcached or DynamoDB.
// Here a tiny in-memory fake so the example is self-contained.
interface SessionStore {
    Optional<Map<String, String>> load(String sessionId);
    void save(String sessionId, Map<String, String> data, long ttlSeconds);
}

class FakeRedis implements SessionStore {
    private final Map<String, Map<String, String>> data = new ConcurrentHashMap<>();
    private final Map<String, Long> expiresAt = new ConcurrentHashMap<>();

    public Optional<Map<String, String>> load(String id) {
        Long exp = expiresAt.get(id);
        if (exp == null || exp < System.currentTimeMillis()) {   // missing or expired
            data.remove(id);
            expiresAt.remove(id);
            return Optional.empty();
        }
        return Optional.of(new HashMap<>(data.get(id)));         // copy, like a network fetch
    }

    public void save(String id, Map<String, String> session, long ttlSeconds) {
        data.put(id, new HashMap<>(session));
        expiresAt.put(id, System.currentTimeMillis() + ttlSeconds * 1000);
    }
}

// STATEFUL: the session map lives inside THIS server's memory only.
class StatefulServer {
    private final String name;
    private final Map<String, String> loggedIn = new HashMap<>();  // sessionId -> user

    StatefulServer(String name) { this.name = name; }

    String login(String user) {
        String sid = UUID.randomUUID().toString();
        loggedIn.put(sid, user);
        return sid;
    }

    String whoAmI(String sid) {
        String user = loggedIn.get(sid);
        return user == null ? name + ": 401, please log in" : name + ": hello " + user;
    }
}

// STATELESS: load session from the shared store, do the work, save it back.
class StatelessServer {
    private final String name;
    private final SessionStore store;
    private static final long TTL_SECONDS = 1800;                  // 30-minute sliding expiry

    StatelessServer(String name, SessionStore store) { this.name = name; this.store = store; }

    String login(String user) {
        String sid = UUID.randomUUID().toString();
        Map<String, String> session = new HashMap<>();
        session.put("user", user);
        session.put("cart", "");
        store.save(sid, session, TTL_SECONDS);
        return sid;                                                // sent to the browser as a cookie
    }

    String addToCart(String sid, String item) {
        Optional<Map<String, String>> found = store.load(sid);
        if (found.isEmpty()) return name + ": 401, please log in";
        Map<String, String> session = found.get();
        String cart = session.get("cart");
        session.put("cart", cart.isEmpty() ? item : cart + "," + item);
        store.save(sid, session, TTL_SECONDS);                     // write back + refresh expiry
        return name + ": cart of " + session.get("user") + " = [" + session.get("cart") + "]";
    }
}

class Demo {
    public static void main(String[] args) {
        StatefulServer s1 = new StatefulServer("S1"), s2 = new StatefulServer("S2");
        String sid = s1.login("asha");
        System.out.println(s1.whoAmI(sid));    // S1: hello asha
        System.out.println(s2.whoAmI(sid));    // S2: 401  <-- the classic bug

        SessionStore redis = new FakeRedis();
        StatelessServer a = new StatelessServer("A", redis), b = new StatelessServer("B", redis);
        String sid2 = a.login("asha");
        System.out.println(a.addToCart(sid2, "book"));   // A: cart = [book]
        System.out.println(b.addToCart(sid2, "pen"));    // B: cart = [book,pen]  any server works
    }
}` },
    viz: {
      title: 'Asha logs in on Server 1, her next click lands on Server 2',
      gen: function () {
        var frames = [];
        function base(withStore) {
          var n = [B('U', 'Asha (browser)', 9, 30), B('LB', 'Load Balancer', 33, 30), B('S1', 'Server 1', 60, 12), B('S2', 'Server 2', 60, 48)];
          if (withStore) n.push(B('R', 'Session Store', 89, 30));
          return n;
        }
        var e0 = [['U', 'LB'], ['LB', 'S1'], ['LB', 'S2']];
        var eS = e0.concat([['S1', 'R'], ['S2', 'R']]);
        frames.push({ narr: '<b>Stateful setup.</b> Two app servers behind a load balancer. Each server keeps logged-in sessions in its <b>own RAM</b> (a HashMap). Nothing looks wrong yet.', parts: [
          G('Architecture', base(false), e0),
          { type: 'map', label: 'Server 1 memory', entries: [] }, { type: 'map', label: 'Server 2 memory', entries: [] }
        ] });
        frames.push({ narr: 'Asha sends <code>POST /login</code>. Round robin picks <b>Server 1</b>, which creates session <code>abc</code> and stores it <b>in its own memory</b>. The browser gets a cookie <code>sid=abc</code>.', parts: [
          G('Architecture', base(false), e0, { S1: 'cur' }, { 'U-LB': 'cur', 'LB-S1': 'cur' }, { S1: 'stores abc' }),
          { type: 'map', label: 'Server 1 memory', entries: [['abc', 'asha, cart=[]']], hl: { abc: 'ok' } }, { type: 'map', label: 'Server 2 memory', entries: [] }
        ] });
        frames.push({ narr: 'Asha clicks <code>Add to cart</code> with cookie <code>sid=abc</code>. Round robin now picks <b>Server 2</b>. Server 2 looks in its memory: no <code>abc</code>! <span class="c-r">401 — please log in.</span> From Asha\'s side the site "randomly logged her out".', parts: [
          G('Architecture', base(false), e0, { S2: 'bad' }, { 'U-LB': 'cur', 'LB-S2': 'bad' }, { S2: '401: who are you?' }),
          { type: 'map', label: 'Server 1 memory', entries: [['abc', 'asha, cart=[]']] }, { type: 'map', label: 'Server 2 memory', entries: [], hl: {} },
          T('<b>Root cause:</b> the session is <i>state</i>, and it lives inside one server. The servers are not interchangeable.')
        ] });
        frames.push({ narr: 'Worse: if <b>Server 1 restarts</b> (a deploy, a crash, autoscaling removes it) every session it held is <span class="c-r">gone</span>. Every user on it is logged out at once.', parts: [
          G('Architecture', base(false), e0, { S1: 'bad' }, { 'LB-S1': 'bad' }, { S1: 'restarted: memory wiped' }),
          { type: 'map', label: 'Server 1 memory', entries: [] }, { type: 'map', label: 'Server 2 memory', entries: [] }
        ] });
        frames.push({ narr: '<b>The fix: push the state out.</b> Add a shared <b>Session Store</b> (e.g. Redis). Servers keep <i>nothing</i> between requests; they load the session by id, do the work, and save it back.', parts: [
          G('Architecture', base(true), eS, { R: 'sel' }, {}, { R: 'Redis, TTL 30 min' }),
          { type: 'map', label: 'Session Store (shared)', entries: [] }
        ] });
        frames.push({ narr: 'Login again → Server 1 writes <code>sess:abc</code> into the shared store (with a 30-minute expiry) and sends the cookie.', parts: [
          G('Architecture', base(true), eS, { S1: 'cur', R: 'ok' }, { 'U-LB': 'cur', 'LB-S1': 'cur', 'S1-R': 'ok' }, { R: 'SET sess:abc' }),
          { type: 'map', label: 'Session Store (shared)', entries: [['sess:abc', 'asha, cart=[]']], hl: { 'sess:abc': 'ok' } }
        ] });
        frames.push({ narr: '<code>Add to cart</code> lands on <b>Server 2</b> this time. It reads <code>sess:abc</code> from the store → knows it is Asha → adds the book → saves. <span class="c-g">Works.</span>', parts: [
          G('Architecture', base(true), eS, { S2: 'ok', R: 'ok' }, { 'U-LB': 'cur', 'LB-S2': 'ok', 'S2-R': 'ok' }, { S2: 'GET sess:abc' }),
          { type: 'map', label: 'Session Store (shared)', entries: [['sess:abc', 'asha, cart=[book]']], hl: { 'sess:abc': 'ok' } }
        ] });
        frames.push({ narr: 'Now <b>Server 1 crashes</b>. The load balancer sends everything to Server 2, which reads sessions from the store. <span class="c-g">Nobody is logged out.</span>', parts: [
          G('Architecture', base(true), eS, { S1: 'bad', S2: 'ok' }, { 'LB-S1': 'bad', 'LB-S2': 'ok', 'S2-R': 'ok' }, { S1: 'crashed' }),
          { type: 'map', label: 'Session Store (shared)', entries: [['sess:abc', 'asha, cart=[book]']] }
        ] });
        var n3 = base(true); n3.push(B('S3', 'Server 3 (new)', 60, 30));
        frames.push({ narr: 'Traffic grows → autoscaling adds <b>Server 3</b>. It is useful <b>instantly</b>: no sessions to copy, no warm-up of user data. This is why stateless = easy horizontal scaling.', parts: [
          G('Architecture', n3, eS.concat([['LB', 'S3'], ['S3', 'R']]), { S3: 'ok' }, { 'LB-S3': 'ok', 'S3-R': 'ok' }, { S3: 'ready in seconds' }),
          T('Trade-off: every request now makes one extra network call to the store (~0.2–1 ms inside a data centre), and the store itself must be replicated so it is not a new single point of failure.')
        ] });
        frames.push({ narr: '<b>Checklist</b> — sessions are only one kind of hidden state. Hunt for all of them before you scale out.', parts: [
          { type: 'table', label: 'Hidden state → where it goes', columns: ['in the server', 'move to'], rows: [['sessions / carts', 'Redis or DB'], ['uploaded files', 'object storage (S3)'], ['rate-limit counters', 'Redis INCR + EXPIRE'], ['in-app cron jobs', 'scheduler / queue / leader'], ['WebSocket connections', 'keep, but route messages via pub/sub']], hl: { 0: 'ok' } }
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'Profile pictures returning 404', html: `<p>Users upload avatars; the app saves them to <code>/var/app/uploads</code> on whichever server took the upload. With 3 servers, a later <code>GET /avatar/42.png</code> has a 2-in-3 chance of hitting a server that does not have the file → ${H.c('r', '404')}.</p>
        <p>${H.c('g', 'Fix:')} upload straight to object storage (S3/GCS), store only the object key in the database, and serve images through a CDN. Even better, let the browser upload directly with a short-lived <b>pre-signed URL</b>, so file bytes never pass through your app servers.</p>` },
      { title: 'The welcome email sent 8 times', html: `<p>A Node.js app runs <code>setInterval(sendDigestEmails, 24h)</code> on start-up. With 8 replicas, every user gets 8 digests.</p>
        <p>${H.c('g', 'Fix options:')} (1) move the job to a separate scheduler (Kubernetes CronJob, cloud scheduler) that runs it <b>once</b>; (2) put work items on a queue that workers consume; (3) take a distributed lock / elect a leader so only one replica runs it. Make the job <b>idempotent</b> (a "sent" flag) so a retry is harmless.</p>` },
      { title: 'Rate limiter that leaks', html: `<p>Rule: 100 login attempts per IP per minute. Each server keeps <code>Map&lt;ip, count&gt;</code>. With 4 servers behind round robin, an attacker gets up to ${H.c('r', '400')} attempts/minute before every server says no.</p>
        <p>${H.c('g', 'Fix:')} one shared counter: Redis <code>INCR rl:1.2.3.4:202610141530</code> + <code>EXPIRE 60</code>. All servers see the same number. (Rate limiting algorithms get a full module in HLD 9.)</p>` },
      { title: 'A local cache that is fine', html: `<p>Each server caches the list of country codes in memory for 10 minutes. Servers have different copies — but the data barely changes and a miss just reloads it. That is <b>acceptable state</b>: losing it is harmless, so the service is still "stateless enough". The rule: <b>losing it must never hurt a user.</b></p>` }
    ],
    deepDive: `<p><b>Stateless does not mean free.</b> Moving the session to Redis adds a network round trip per request (sub-millisecond in the same zone, more across zones) and creates a new dependency. Budget for it: use connection pooling, keep sessions small (an id and a few fields, not a 50 KB blob), and replicate the store (Redis with a replica and automatic failover, or a managed service) so it does not become the new single point of failure.</p>
      <p><b>Concurrency gets real.</b> Two tabs add items at the same moment: both load the cart <code>[book]</code>, both save — one write wins and an item vanishes (a <i>lost update</i>). Fixes: store the cart as a Redis hash/list and use atomic commands (<code>HSET</code>, <code>RPUSH</code>), use optimistic locking (a version number, compare-and-set), or keep the cart in the database in a transaction.</p>
      <p><b>Connections are a special kind of state.</b> WebSockets and long-polling tie a user to one server for the life of the connection. You cannot make that stateless, but you can make it <i>recoverable</i>: keep the durable state (unread messages, presence) in shared stores, use pub/sub (Redis, Kafka, NATS) so a message for user X reaches whichever server holds X's socket, and have clients reconnect with backoff + jitter when a server dies.</p>
      <p><b>Graceful shutdown</b> is the stateless contract in practice: on SIGTERM, a server fails its readiness check (so the load balancer stops sending new requests), finishes in-flight requests (connection draining, e.g. 30 s), then exits. Without this, every deploy produces a burst of errors even for a perfectly stateless app.</p>
      <p><b>Immutable servers:</b> because servers hold nothing, you never patch them in place — you build a new image, start new instances, shift traffic, and kill the old ones. This is the basis of blue-green and canary deploys.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants are very good at the mechanical refactor: "move session handling from in-memory to Redis", "replace local file writes with S3 pre-signed uploads", "convert this setInterval into a queue consumer". Ask for it file by file and review each diff.</p>
      <p><b>AI agents are a new place for hidden state.</b> An LLM chat service keeps conversation history; an agent keeps tool results and a plan. If that lives in one server's memory, the same "random logout" bug appears as "the bot forgot what we were talking about". Production agent platforms store conversation and agent state in a database or durable workflow engine and keep the model-serving tier stateless.</p>
      <p><b>Use AI as a partner:</b> <code>List every piece of state this service keeps in memory or on local disk between requests; for each, say what breaks with 3 replicas</code>. <b>Where AI goes wrong:</b> it misses state hidden in libraries (in-process caches, local file sessions in a framework default), and forgets lost-update races. <b>What you must own:</b> the "kill it and send traffic elsewhere" test, and deciding which state is harmless.</p>`,
    problems: [{
      title: 'Make This Service Stateless',
      level: 'Medium', tags: ['stateless', 'sessions', 'object storage', 'cron'], companies: ['Google', 'Uber', 'Shopify'],
      statement: `<p>A photo-sharing backend runs on <b>one</b> server and the team wants to run 5 behind a load balancer. The service currently:</p>
        <ol><li>stores login sessions in an in-memory HashMap,</li>
        <li>saves uploaded photos to <code>/data/photos</code> on local disk,</li>
        <li>counts failed logins per user in memory and locks the account after 5,</li>
        <li>runs a thumbnail-cleanup job every hour with an in-process timer,</li>
        <li>caches the "trending tags" list in memory for 5 minutes.</li></ol>
        <p>Redesign it so any of the 5 servers can handle any request. For each item say what breaks and the fix.</p>`,
      constraints: `No user-visible downtime during the migration; 2M photos (~4 TB) already on disk.`,
      example: `<p>With 5 servers and round robin: login on S1, next request on S3 → ${H.c('r', 'logged out')}; photo uploaded to S2 → 80% of later views ${H.c('r', '404')}; failed-login lock needs ${H.c('r', '25')} attempts instead of 5; cleanup runs ${H.c('r', '5×')} per hour.</p>`,
      brute: { why: `<p>Naive fix: turn on <b>sticky sessions</b> at the load balancer and call it done. That hides the session bug only. Photos still live on one disk (a user on another server, or anyone after that server dies, gets 404), the login counter is still per-server, the cron still runs 5×, and when a server dies all its sticky users lose their sessions anyway. It also makes load uneven.</p>` },
      mcq: { q: 'Which item is acceptable to leave in local memory?', options: ['The 5-minute trending-tags cache', 'Login sessions', 'Failed-login counters', 'Uploaded photos'], answer: 0, explain: 'If a server loses its trending cache, it just recomputes it. Losing it never harms a user — that is harmless state.' },
      hints: [`<p>Apply the test to each item: "if this server dies and the next request goes elsewhere, does the user notice?"</p>`, `<p>Map each kind of state to a shared home: sessions/counters → Redis, files → object storage, jobs → scheduler or queue, harmless cache → keep.</p>`, `<p>Think about migration of 4 TB with no downtime: dual-read (try new store, fall back to old disk), background copy, then switch.</p>`],
      solution: {
        approach: `<p><b>1. Sessions</b> → Redis (replicated, managed) with key <code>sess:{id}</code> and a 30-minute sliding TTL; the browser keeps only the session id in an HttpOnly, Secure cookie. Alternative: short-lived signed tokens (Topic 3).</p>
          <p><b>2. Photos</b> → object storage (S3/GCS). Store only <code>photo_id → object key</code> in the database; serve through a CDN. Uploads go directly from the client using pre-signed URLs. Migration: a background job copies the 4 TB; meanwhile reads try object storage first and fall back to the old server's disk; when the copy is verified, remove the fallback.</p>
          <p><b>3. Failed-login counter</b> → Redis <code>INCR fail:{user}</code> with <code>EXPIRE 900</code>; lock when ≥ 5. Now the limit is global, not 5 per server.</p>
          <p><b>4. Hourly cleanup</b> → move out of the web process: a scheduled job (Kubernetes CronJob / cloud scheduler) that runs once, or a lock (<code>SET lock:cleanup NX EX 3600</code>) so only one replica runs it. Make it idempotent.</p>
          <p><b>5. Trending cache</b> → keep it local. Each server recomputes it at most every 5 minutes; slight differences between servers are harmless.</p>
          <p>Result: servers are interchangeable, so the load balancer can use plain round robin or least connections, autoscaling can add/remove instances freely, and a crash loses only in-flight requests. Remember graceful shutdown (drain connections on deploy) and replicate Redis so it is not the new single point of failure.</p>`,
        complexity: `<p>Cost: one extra Redis round trip (~0.5 ms) per request and per login attempt; object storage is cheaper per GB than server disks and removes the 4 TB from app servers entirely.</p>`,
        followUps: ['Two uploads of the same photo id race — how do you avoid overwriting?', 'Redis is down — should logins fail closed or open?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 3 — Session Handling
     ===================================================================== */
  topics.push({
    title: 'Session Handling: Sticky Sessions vs Session Store vs Tokens',
    analogy: `<p>Think of a theatre <b>coat check</b>.</p>
      <ul>
        <li><b>Sticky sessions:</b> only the attendant who took your coat knows where it is, so you must always return to <i>that</i> attendant. If they go home sick, your coat is lost.</li>
        <li><b>Central session store:</b> you get a numbered ticket and all coats hang on one shared, well-guarded rack. Any attendant can fetch it.</li>
        <li><b>Client-side token:</b> you keep your coat yourself, but it carries a tamper-proof seal from the theatre. Any attendant can check the seal — no rack needed. The catch: if the theatre wants to ban you, it cannot take back the seal until it expires.</li>
      </ul>`,
    explain: `<p>HTTP is <b>stateless</b>: each request arrives alone, with no memory of the previous one. A <b>session</b> is how a website remembers "this is Asha, she is logged in, her cart has 2 items" across requests. The browser usually sends a <b>cookie</b> each time; the question is <b>where the session data lives</b> once you have many servers.</p>
      <h4>Option 1 — Sticky sessions (session affinity)</h4>
      <p>Session data stays in one server's memory, and the load balancer always routes that user to the same server — using a cookie it sets (e.g. AWS ALB's <code>AWSALB</code>) or by hashing the client IP.</p>
      <p>${H.c('g', 'Good:')} zero code change; quick patch for a legacy app. ${H.c('r', 'Bad:')} server dies → its users lose sessions; load gets uneven (a few heavy users stuck on one box); new servers only get <i>new</i> users; IP hashing breaks for users behind one corporate NAT (thousands share one IP) and for mobile users whose IP changes.</p>
      <h4>Option 2 — Central session store</h4>
      <p>Cookie holds only a random <b>session id</b>; the data lives in Redis/Memcached/a database keyed by that id, with a TTL. Any server can read it.</p>
      <p>${H.c('g', 'Good:')} servers become stateless; logout and "log out everywhere" are instant (delete the key); session data can be big. ${H.c('r', 'Bad:')} an extra network call per request; the store must be fast and highly available.</p>
      <h4>Option 3 — Client-side signed token (e.g. JWT)</h4>
      <p>The server puts the facts ("user=asha, role=user, expires 10:15") into a token and <b>signs</b> it with a secret key. The client sends it on every request; any server verifies the signature with the key — no lookup at all.</p>
      <p>${H.c('g', 'Good:')} no shared store, scales trivially, works across services and regions. ${H.c('r', 'Bad:')} hard to <b>revoke</b> before expiry (stolen token keeps working), tokens grow large, data is readable by the client (signed ≠ encrypted), key management matters.</p>
      ${H.table(['', 'Sticky', 'Session store', 'Signed token'], [
        ['Servers stateless?', H.c('r', 'No'), H.c('g', 'Yes'), H.c('g', 'Yes')],
        ['Server dies', H.c('r', 'Users logged out'), H.c('g', 'Fine'), H.c('g', 'Fine')],
        ['Instant logout / ban', 'Yes', H.c('g', 'Yes (delete key)'), H.c('r', 'Hard (wait for expiry or deny-list)')],
        ['Extra lookup per request', 'No', 'Yes (~0.5 ms)', 'No (CPU to verify)'],
        ['Even load', H.c('r', 'Often uneven'), H.c('g', 'Yes'), H.c('g', 'Yes')]
      ])}
      <p><b>Common 2026 answer:</b> a short-lived access token (5–15 min) + a long-lived <b>refresh token</b> that is checked against a store when renewing. You get cheap per-request checks and the ability to cut someone off within minutes. For classic web apps, a server-side session store with an HttpOnly cookie is still the simplest, safest default.</p>`,
    clues: [
      '"Users are logged out when a server restarts" → sessions in server memory or sticky sessions',
      '"We need log out from all devices / ban a user immediately" → server-side session store (or a revocation list)',
      '"Many microservices need to know who the user is" → signed tokens (JWT) verified locally',
      '"Legacy app, cannot change code, must scale this week" → sticky sessions as a stop-gap',
      '"Load is uneven even though we use round robin" → check for sticky sessions / IP hash',
      '"Sessions must survive deploys" → externalise sessions'
    ],
    code: { lang: 'python', run: true, title: 'A signed session token any server can verify (runnable)', code: `import base64, hashlib, hmac, json, time

# Every app server has the same secret (from a secret manager), so ANY server can verify.
SECRET = b"rotate-me-and-keep-me-in-a-secret-manager"

def b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()

def unb64(s: str) -> bytes:
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))

def issue(user_id: str, ttl_s: int = 900) -> str:
    """payload.signature -- the same idea a JWT uses (JWT adds a header)."""
    payload = json.dumps({"sub": user_id, "exp": int(time.time()) + ttl_s},
                         separators=(",", ":")).encode()
    sig = hmac.new(SECRET, payload, hashlib.sha256).digest()
    return b64(payload) + "." + b64(sig)

def verify(token: str):
    try:
        p64, s64 = token.split(".")
        payload, sig = unb64(p64), unb64(s64)
    except ValueError:
        return None                                   # malformed
    expected = hmac.new(SECRET, payload, hashlib.sha256).digest()
    if not hmac.compare_digest(sig, expected):        # constant-time compare
        return None                                   # tampered or wrong key
    claims = json.loads(payload)
    if claims["exp"] < time.time():
        return None                                   # expired
    return claims["sub"]

token = issue("asha")
print("token          :", token[:44] + "...")
print("server 1 says  :", verify(token))
print("server 2 says  :", verify(token))              # no shared store needed

# An attacker edits the payload to become admin but cannot re-sign it.
p64, s64 = token.split(".")
forged = b64(unb64(p64).replace(b"asha", b"admin")) + "." + s64
print("forged token   :", verify(forged))             # None -> rejected
print("note: the payload is only base64, anyone can READ it:", unb64(p64).decode())
` },
    viz: {
      title: 'Three session strategies vs. one server crash',
      input: 'sticky store token',
      inputLabel: 'Strategies to compare, in order (sticky, store, token)',
      gen: function (input) {
        var list = String(input || '').trim().toLowerCase().split(/[\s,]+/).filter(Boolean);
        if (!list.length) throw new Error('Enter one or more of: sticky store token');
        if (list.length > 3) throw new Error('At most 3 strategies');
        list.forEach(function (s) { if (['sticky', 'store', 'token'].indexOf(s) < 0) throw new Error('Unknown strategy "' + s + '". Use sticky, store or token'); });
        var frames = [], score = [];
        function nodes(st) {
          var n = [B('U', 'Asha', 8, 30), B('LB', 'Load Balancer', 31, 30), B('S1', 'Server 1', 58, 12), B('S2', 'Server 2', 58, 48)];
          if (st === 'store') n.push(B('R', 'Redis sessions', 88, 30));
          return n;
        }
        function edges(st) { var e = [['U', 'LB'], ['LB', 'S1'], ['LB', 'S2']]; if (st === 'store') e.push(['S1', 'R'], ['S2', 'R']); return e; }
        frames.push({ narr: 'Same story for every strategy: Asha logs in, keeps clicking, then <b>Server 1 crashes</b>, then an admin tries to <b>ban</b> her account. Watch who survives each step.', parts: [
          G('Two servers behind a load balancer', nodes('x'), edges('x')),
          T('Strategies to replay: <b>' + list.join(' → ') + '</b>')
        ] });
        list.forEach(function (st) {
          var name = { sticky: 'Sticky sessions', store: 'Central session store', token: 'Signed token (JWT-style)' }[st];
          // step 1: login
          var hl1 = { S1: 'cur' }, eh1 = { 'U-LB': 'cur', 'LB-S1': 'cur' }, tg1 = {}, cookie1;
          if (st === 'sticky') { tg1.S1 = 'session in RAM'; cookie1 = 'sid=abc; AWSALB=→S1'; }
          if (st === 'store') { hl1.R = 'ok'; eh1['S1-R'] = 'ok'; tg1.R = 'sess:abc'; cookie1 = 'sid=abc (random id)'; }
          if (st === 'token') { tg1.S1 = 'signs token'; cookie1 = 'tok={sub:asha,exp:10:15}.SIG'; }
          frames.push({ narr: '<b>' + name + '</b> — login. ' + ({
            sticky: 'Server 1 keeps the session in its memory; the load balancer sets an affinity cookie that pins Asha to Server 1.',
            store: 'Server 1 writes the session to Redis under a random id and returns only that id in a cookie.',
            token: 'Server 1 signs a small token with the shared secret; the token itself is the session. Nothing is stored server-side.'
          })[st], parts: [G(name, nodes(st), edges(st), hl1, eh1, tg1), V('Asha\'s cookie', { cookie: cookie1 })] });
          // step 2: next requests
          var hl2 = {}, eh2 = { 'U-LB': 'cur' }, tg2 = {};
          if (st === 'sticky') { hl2.S1 = 'cur'; eh2['LB-S1'] = 'cur'; tg2.S1 = 'always S1'; tg2.S2 = 'idle for Asha'; }
          if (st === 'store') { hl2.S2 = 'ok'; hl2.R = 'ok'; eh2['LB-S2'] = 'ok'; eh2['S2-R'] = 'ok'; tg2.S2 = 'GET sess:abc'; }
          if (st === 'token') { hl2.S2 = 'ok'; eh2['LB-S2'] = 'ok'; tg2.S2 = 'verifies signature'; }
          frames.push({ narr: '<b>' + name + '</b> — Asha keeps clicking. ' + ({
            sticky: 'Every request is forced to Server 1. Works, but if many heavy users stick to S1, it gets hot while S2 sits idle.',
            store: 'Requests go to any server. Server 2 fetches the session from Redis (one ~0.5 ms network hop). Load stays even.',
            token: 'Requests go to any server. Server 2 checks the signature with the shared key — pure CPU, no lookup.'
          })[st], parts: [G(name, nodes(st), edges(st), hl2, eh2, tg2), { type: 'bars', label: 'Requests per server so far', values: st === 'sticky' ? [6, 0] : [3, 3], idxLabels: ['S1', 'S2'], hl: st === 'sticky' ? { 0: 'bad' } : { 0: 'ok', 1: 'ok' } }] });
          // step 3: crash
          var survived = st !== 'sticky';
          var hl3 = { S1: 'bad' }, eh3 = { 'U-LB': 'cur', 'LB-S1': 'bad', 'LB-S2': survived ? 'ok' : 'bad' }, tg3 = { S1: 'CRASHED' };
          hl3.S2 = survived ? 'ok' : 'bad'; tg3.S2 = survived ? 'serves Asha' : '401: unknown sid';
          if (st === 'store') { hl3.R = 'ok'; eh3['S2-R'] = 'ok'; }
          frames.push({ narr: '<b>' + name + '</b> — Server 1 crashes. ' + (survived
            ? '<span class="c-g">Asha does not notice:</span> the load balancer sends her to Server 2, which can read her session.'
            : '<span class="c-r">Asha is logged out and loses her cart.</span> Her session lived only in Server 1\'s RAM; Server 2 has never heard of <code>abc</code>.'), parts: [G(name, nodes(st), edges(st), hl3, eh3, tg3)] });
          // step 4: ban
          var banOk = st !== 'token';
          frames.push({ narr: '<b>' + name + '</b> — admin bans Asha\'s account (stolen password). ' + ({
            sticky: 'Delete the session on the server that holds it — possible, but you must know which server.',
            store: '<span class="c-g">DEL sess:abc</span> in Redis → next request from any server is rejected instantly.',
            token: '<span class="c-r">The token stays valid until it expires</span> — servers never look anything up. Fixes: short expiry (5–15 min) + refresh tokens, or a deny-list checked on each request (which brings back a lookup).'
          })[st], parts: [V('Result for ' + name, { 'survives crash': survived ? 'yes' : 'NO', 'instant ban': banOk ? 'yes' : 'NO', 'extra lookup': st === 'store' ? 'yes (~0.5 ms)' : 'no' }, { 'survives crash': survived ? 'ok' : 'bad', 'instant ban': banOk ? 'ok' : 'bad' })] });
          score.push([name, survived ? H.c('g', 'yes') : H.c('r', 'no'), banOk ? H.c('g', 'yes') : H.c('r', 'no'), st === 'sticky' ? H.c('r', 'uneven') : H.c('g', 'even')]);
        });
        frames.push({ narr: '<b>Scorecard.</b> Most production systems use a session store or short-lived tokens + refresh tokens; sticky sessions are a stop-gap for legacy apps.', parts: [
          { type: 'table', label: 'Who survived?', columns: ['strategy', 'server crash', 'instant ban', 'load'], rows: score }
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'Session store in Redis — the actual commands', html: `<p>Login creates a random 128-bit id and stores the session with a 30-minute TTL:</p>
        <pre>SET sess:9f2c...e1 '{"uid":42,"cart":[17,99]}' EX 1800
GET sess:9f2c...e1          → any server, any request
EXPIRE sess:9f2c...e1 1800  → sliding expiry on activity
DEL sess:9f2c...e1          → logout (instant)</pre>
        <p>"Log out everywhere": keep a set <code>user:42:sessions</code> of that user's ids and delete them all.</p>` },
      { title: 'Sticky sessions behind a corporate NAT', html: `<p>A B2B app uses <b>IP-hash</b> stickiness. One customer has 3,000 employees behind a single office IP. All 3,000 hash to the same server, which melts while the other 5 servers idle.</p>
        ${H.table(['Server', 'Users'], [['S1', H.c('r', '3,000 + others')], ['S2…S6', '~200 each']])}
        <p>${H.c('g', 'Fix:')} cookie-based affinity at least, and ideally no affinity at all (externalise sessions).</p>` },
      { title: 'JWT logout surprise', html: `<p>A team switches to JWTs valid for <b>24 hours</b>. A user's laptop is stolen; support "logs them out" — but the thief's token keeps working until tomorrow.</p>
        <p>${H.c('g', 'Fix:')} access tokens of ~10 minutes, a refresh token stored server-side (revocable), and a small deny-list of token ids (<code>jti</code>) for emergencies. Rule: the shorter the token life, the smaller the damage window.</p>` },
      { title: 'Choosing for three apps', html: `${H.table(['App', 'Pick', 'Why'], [
        ['Banking web app', 'Server-side session store', 'Instant revocation, idle timeouts, audit'],
        ['Mobile app + 20 microservices', 'Short JWT + refresh token', 'Each service verifies locally, no shared lookup'],
        ['10-year-old PHP app, deadline Friday', 'Sticky sessions (temporary)', 'No code change; plan the real fix next sprint']
      ])}` }
    ],
    deepDive: `<p><b>Cookie security basics every design should mention:</b> session cookies should be <code>HttpOnly</code> (JavaScript cannot read them, limiting XSS theft), <code>Secure</code> (HTTPS only), and <code>SameSite=Lax</code> or <code>Strict</code> (reduces CSRF). Session ids must be long random values (≥ 128 bits from a secure RNG), never user ids or counters. Rotate the session id at login to prevent session fixation.</p>
      <p><b>JWT details:</b> a JWT is <code>header.payload.signature</code>, base64url-encoded. HS256 uses a shared secret (every verifier can also <i>mint</i> tokens); RS256/ES256 use a private key to sign and a public key (published as JWKS) to verify, so services can verify without being able to forge. Always pin the expected algorithm (the old <code>alg: none</code> and algorithm-confusion attacks), check <code>exp</code>, <code>aud</code> and <code>iss</code>, and plan key rotation with a <code>kid</code> header.</p>
      <p><b>Sticky sessions are not always wrong.</b> They help when a server holds an expensive warm cache for a user (e.g. a game server, a collaborative document, an LLM conversation's KV cache on a GPU). Here affinity is a <i>performance</i> optimisation — the system must still work, just slower, when the user moves. That is very different from affinity as a <i>correctness</i> requirement.</p>
      <p><b>Session store sizing:</b> 10M active sessions × 1 KB ≈ 10 GB — fits in RAM of a modest Redis cluster. Reads per request at 50k rps is well within Redis's capability on a few nodes (a single Redis node commonly serves 100k+ simple ops/s). Use replication with automatic failover; if the store is unavailable, decide explicitly: fail closed (force re-login) for banking, or degrade gracefully for a content site.</p>
      <p><b>Draining sticky servers:</b> when removing a server with sticky users, load balancers support <i>connection draining / deregistration delay</i>: no new users go there, existing ones finish, then it is removed.</p>`,
    aiEra: `<p><b>What AI changes:</b> authentication is one area where you should <b>not</b> let an assistant improvise. Use well-known libraries and managed identity providers (OIDC/OAuth 2.1 providers) instead of hand-rolled token code; ask AI to wire them up and explain the settings, not to invent crypto.</p>
      <p><b>New session types:</b> AI products have long-lived "sessions" too — a chat thread, an agent run that takes minutes, an MCP tool session. The same three choices appear: pin the conversation to one GPU server (sticky, for KV-cache reuse), store the history centrally and let any server continue, or pass context with each call. Real systems combine them: prefer the warm server, but survive if it is gone.</p>
      <p><b>Use AI as a partner:</b> <code>Review this session cookie config and JWT validation code against OWASP guidance; list missing flags and checks</code>. <b>Where AI goes wrong:</b> it suggests storing JWTs in localStorage, uses 24-hour access tokens, skips <code>aud</code>/<code>iss</code> checks, or claims JWTs are encrypted. <b>What you must own:</b> the revocation story and the failure mode when the session store is down.</p>`,
    problems: [{
      title: 'Random Logouts After Adding a Second Server',
      level: 'Easy', tags: ['sessions', 'sticky sessions', 'redis', 'jwt'], companies: ['Atlassian', 'Salesforce'],
      statement: `<p>A fintech dashboard ran on one server. Last week the team added a second server behind a round-robin load balancer. Since then, about half of all clicks show "Session expired, please log in". Compliance also requires that when an account is frozen, the user is cut off within <b>60 seconds</b>.</p>
        <p>Explain the bug and choose a session strategy that satisfies both constraints.</p>`,
      constraints: `~200k daily users, peak 3,000 rps, sessions ~2 KB each, idle timeout 15 minutes.`,
      example: `<p>Request 1 → S1 (session created in S1 RAM). Request 2 → ${H.c('r', 'S2: unknown session')}. Request 3 → S1 ✓. Request 4 → ${H.c('r', 'S2 ✗')}. Exactly the "about half" the team sees.</p>`,
      brute: { why: `<p>Turning on sticky sessions makes the symptom vanish today, but: a server crash or deploy still logs out half the users, load becomes uneven, and adding a third server helps only new users. Switching to 24-hour JWTs fixes stickiness but breaks the 60-second freeze rule — a frozen user's token stays valid for up to a day.</p>` },
      mcq: { q: 'Which strategy meets the 60-second freeze rule most simply?', options: ['Server-side session store (Redis) with a TTL', 'JWT valid for 24 hours', 'Sticky sessions by IP hash'], answer: 0, explain: 'Freezing = delete the user\'s session keys; the very next request on any server fails the lookup.' },
      hints: [`<p>Round robin alternates servers; the session lives in one server's RAM. That explains "about half".</p>`, `<p>The freeze rule means every request must consult something the server can change instantly.</p>`, `<p>Recipe: session id cookie (HttpOnly, Secure, SameSite) → Redis <code>sess:{id}</code> with 15-minute sliding TTL → freeze = delete keys from <code>user:{id}:sessions</code>. Size it: 200k × 2 KB ≈ 400 MB.</p>`],
      solution: {
        approach: `<p><b>Diagnosis:</b> sessions are stored in each server's memory. Round robin sends alternate requests to S1 and S2, so ~50% of requests reach a server that never saw the session.</p>
          <p><b>Design:</b> externalise sessions into a replicated Redis (primary + replica with automatic failover, in the same region). Login creates a 128-bit random id, stores <code>sess:{id}</code> (user id, roles, CSRF token) with <code>EX 900</code>, and adds the id to <code>user:{uid}:sessions</code>. Each request: read the cookie, <code>GET</code> the session (≈0.5 ms), refresh TTL. Freeze: the compliance service deletes every key in <code>user:{uid}:sessions</code> — the next request anywhere fails within milliseconds, well under 60 s.</p>
          <p><b>Why not tokens alone:</b> a JWT would need an expiry ≤ 60 s or a deny-list lookup per request — which is a session store again. A hybrid (60-second access token + revocable refresh token) also works if many internal services need identity.</p>
          <p><b>Capacity:</b> 200k sessions × 2 KB ≈ 400 MB RAM; 3,000 rps of GETs is trivial for Redis. If Redis is down, fail closed (users must re-login) — correct for fintech.</p>`,
        complexity: `<p>One O(1) key lookup per request (~0.5 ms); memory ≈ active sessions × session size ≈ 400 MB.</p>`,
        followUps: ['How would you migrate live users from in-memory sessions to Redis without logging everyone out?', 'What changes if the app goes multi-region?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 4 — Load Balancers: Round Robin vs Least Connections
     ===================================================================== */
  function lbSim(durations, n) {
    // returns per-arrival snapshots for round robin and least connections
    var algos = { rr: { act: [], tot: [], peak: [], i: 0 }, lc: { act: [], tot: [], peak: [] } };
    ['rr', 'lc'].forEach(function (a) { for (var k = 0; k < n; k++) { algos[a].act.push([]); algos[a].tot.push(0); algos[a].peak.push(0); } });
    var snaps = [];
    durations.forEach(function (d, t) {
      var snap = { t: t, d: d };
      ['rr', 'lc'].forEach(function (a) {
        var A = algos[a], s, k;
        for (k = 0; k < n; k++) A.act[k] = A.act[k].filter(function (e) { return e > t; });
        if (a === 'rr') { s = A.i % n; A.i++; }
        else { s = 0; for (k = 1; k < n; k++) if (A.act[k].length < A.act[s].length) s = k; }
        A.act[s].push(t + d); A.tot[s]++;
        if (A.act[s].length > A.peak[s]) A.peak[s] = A.act[s].length;
        snap[a] = { pick: s, active: A.act.map(function (x) { return x.length; }), tot: A.tot.slice(), peak: A.peak.slice() };
      });
      snaps.push(snap);
    });
    return snaps;
  }
  function lbGraph(label, n, pick, active, cls) {
    var nodes = [B('LB', label, 50, 6)], edges = [], hl = { LB: 'cur' }, ehl = {}, tags = {};
    for (var k = 0; k < n; k++) {
      var x = n === 1 ? 50 : 10 + k * (80 / (n - 1));
      nodes.push(B('S' + k, 'S' + (k + 1), x, 26));
      edges.push(['LB', 'S' + k]);
      tags['S' + k] = active[k] + ' busy';
      if (active[k] >= 3) hl['S' + k] = 'bad';
    }
    if (pick !== null) { hl['S' + pick] = active[pick] >= 3 ? 'bad' : cls; ehl['LB-S' + pick] = cls; }
    return G(null, nodes, edges, hl, ehl, tags, 36);
  }

  topics.push({
    title: 'Load Balancers: Round Robin, Weighted, Least Connections',
    analogy: `<p>A busy supermarket has 4 checkout tills and a greeter at the entrance.</p>
      <ul>
        <li><b>Round robin greeter:</b> "You go to till 1, you till 2, you till 3, you till 4, you till 1…". Fair if every shopper has a basket of the same size. But if shopper #1 has a trolley piled to the roof, till 1 is stuck for 20 minutes while the greeter keeps sending people there.</li>
        <li><b>Least connections greeter:</b> looks at the queues and sends you to the till with the <b>fewest people waiting</b>. Big trolleys no longer trap everyone behind them.</li>
        <li><b>Weighted greeter:</b> till 1 has two cashiers, so it gets twice as many shoppers.</li>
      </ul>`,
    explain: `<p>A <b>load balancer (LB)</b> sits between clients and a group (a <i>pool</i>) of identical servers. Clients talk to one address — the LB — and the LB forwards each request or connection to one healthy server.</p>
      <p>What a load balancer gives you:</p>
      <ul>
        <li><b>Distribution:</b> spreads work so no server is overloaded.</li>
        <li><b>Health checks:</b> pings each server (e.g. <code>GET /health</code> every 5 s); a server that fails a few checks in a row is taken out of rotation, and put back when it recovers.</li>
        <li><b>One stable entry point:</b> servers can be added, removed or replaced behind it without clients knowing.</li>
        <li>Often also: TLS termination, connection reuse, request logging, sticky sessions (Topic 3).</li>
      </ul>
      <h4>The algorithms you must know</h4>
      ${H.table(['Algorithm', 'How it picks', 'Good when', 'Weak when'], [
        ['<b>Round robin</b>', 'Next server in a circle: 1, 2, 3, 1, 2, 3…', 'Requests cost about the same; servers are identical', 'Request cost varies a lot (slow ones pile up)'],
        ['<b>Weighted round robin</b>', 'Like RR but a server with weight 3 gets 3× the turns', 'Mixed server sizes (8 vCPU next to 2 vCPU)', 'Weights are static; does not see live load'],
        ['<b>Least connections</b>', 'Server with the fewest in-flight requests/connections right now', 'Long or uneven requests, WebSockets, uploads', 'Needs live counts; a new empty server can get flooded'],
        ['<b>Weighted least connections</b>', 'Fewest connections ÷ weight', 'Uneven requests AND uneven servers', 'More state to track'],
        ['<b>Random / power of two choices</b>', 'Pick 2 random servers, send to the less busy one', 'Many load balancers with no shared view', 'Pure random alone can be lumpy'],
        ['<b>Hashing (IP / key)</b>', 'hash(client or key) mod N', 'Affinity: same user → same server (caches)', 'Uneven keys; adding a server reshuffles (see consistent hashing, HLD 7)']
      ])}
      <p>Tiny worked example, 3 servers, 6 requests, durations ${H.arr([6, 1, 1, 6, 1, 1], { label: 'secs' })}</p>
      <p><b>Round robin</b> sends request 1 (6 s) and request 4 (6 s) both to ${H.c('r', 'S1')} — S1 holds 2 slow jobs while S2 and S3 finish their 1-second jobs and idle. <b>Least connections</b> sees S1 is busy and sends request 4 to a server with 0 active requests, so the slow jobs land on ${H.c('g', 'different servers')}.</p>
      <p><b>Layer 4 vs Layer 7</b> (more in HLD 4): an L4 LB balances TCP/UDP connections by IP and port, without reading the request — very fast. An L7 LB reads HTTP (path, headers, cookies) so it can route <code>/api</code> and <code>/images</code> to different pools and balance per request, not per connection.</p>`,
    clues: [
      '"Requests take very different times (uploads, reports, video export)" → least connections, not round robin',
      '"Servers have different sizes" → weighted round robin / weighted least connections',
      '"Long-lived WebSocket connections" → least connections (balance by open connections)',
      '"Need the same user on the same server for its local cache" → hashing / affinity (and consistent hashing)',
      '"One server keeps getting overloaded though round robin is on" → uneven request cost or sticky sessions',
      '"Many independent load balancer nodes" → power of two random choices'
    ],
    code: [{ lang: 'java', title: 'Round robin + least connections (Java, compiles)', code: `import java.util.*;
import java.util.concurrent.atomic.*;

class Backend {
    final String name;
    final AtomicInteger active = new AtomicInteger();   // in-flight requests right now
    volatile boolean healthy = true;                    // flipped by the health checker

    Backend(String name) { this.name = name; }

    @Override public String toString() { return name + "(active=" + active.get() + ")"; }
}

interface LoadBalancer {
    Backend pick();
}

// Round robin: a shared counter walks the list in a circle. Thread-safe, O(1).
class RoundRobinLB implements LoadBalancer {
    private final List<Backend> backends;
    private final AtomicLong counter = new AtomicLong();

    RoundRobinLB(List<Backend> backends) { this.backends = List.copyOf(backends); }

    public Backend pick() {
        int n = backends.size();
        for (int tries = 0; tries < n; tries++) {          // skip unhealthy servers
            int idx = (int) Math.floorMod(counter.getAndIncrement(), (long) n);
            Backend b = backends.get(idx);
            if (b.healthy) return b;
        }
        throw new IllegalStateException("no healthy backends");
    }
}

// Least connections: scan for the healthy server with the fewest in-flight requests. O(N).
class LeastConnectionsLB implements LoadBalancer {
    private final List<Backend> backends;

    LeastConnectionsLB(List<Backend> backends) { this.backends = List.copyOf(backends); }

    public Backend pick() {
        Backend best = null;
        for (Backend b : backends) {
            if (!b.healthy) continue;
            if (best == null || b.active.get() < best.active.get()) best = b;
        }
        if (best == null) throw new IllegalStateException("no healthy backends");
        return best;
    }
}

class LbDemo {
    // Wrap every forwarded request so the active counter is always correct.
    static String forward(LoadBalancer lb, String request) {
        Backend b = lb.pick();
        b.active.incrementAndGet();
        try {
            return b.name + " handled " + request;       // real code: proxy the HTTP call here
        } finally {
            b.active.decrementAndGet();                  // finally: also runs on errors
        }
    }

    public static void main(String[] args) {
        List<Backend> pool = List.of(new Backend("S1"), new Backend("S2"), new Backend("S3"));
        LoadBalancer rr = new RoundRobinLB(pool);
        for (int i = 1; i <= 4; i++) System.out.println(forward(rr, "req" + i));  // S1 S2 S3 S1

        pool.get(0).active.set(5);                       // pretend S1 is stuck on slow requests
        pool.get(1).healthy = false;                     // and S2 failed its health check
        LoadBalancer lc = new LeastConnectionsLB(pool);
        System.out.println("least-connections picks " + lc.pick());             // S3
    }
}` }, { lang: 'python', run: true, title: 'Simulate both algorithms on uneven work (runnable)', code: `def simulate(durations, n, algo):
    """One request arrives per tick; durations[i] = ticks request i keeps a server busy."""
    active = [[] for _ in range(n)]      # per server: end times of in-flight requests
    peak, total, rr = [0] * n, [0] * n, 0
    for t, d in enumerate(durations):
        for s in range(n):               # drop requests that have finished by now
            active[s] = [end for end in active[s] if end > t]
        if algo == "round_robin":
            s = rr % n
            rr += 1
        else:                            # least connections; tie -> lowest index
            s = min(range(n), key=lambda k: (len(active[k]), k))
        active[s].append(t + d)
        total[s] += 1
        peak[s] = max(peak[s], len(active[s]))
    return total, peak


work = [8, 1, 1, 8, 1, 1, 8, 1, 1, 8, 1, 1]      # every 3rd request is slow (a report)
for algo in ["round_robin", "least_connections"]:
    total, peak = simulate(work, 3, algo)
    print(f"{algo:<18} requests/server={total}  peak in-flight={peak}  worst={max(peak)}")
` }],
    viz: [{
      title: 'Round robin vs least connections on the same traffic',
      input: 'servers=3; 8 1 1 8 1 1 8 1 1 8 1 1',
      inputLabel: 'servers=N; then request durations in ticks (one request arrives per tick, max 18)',
      gen: function (input) {
        var s = String(input || ''), m = s.match(/servers\s*=\s*(\d+)/i), n = m ? Number(m[1]) : 3;
        var d = s.replace(/servers\s*=\s*\d+/i, ' ').split(/[\s,;]+/).filter(Boolean).map(Number);
        if (n < 2 || n > 5) throw new Error('servers must be between 2 and 5');
        if (!d.length || d.some(function (x) { return !(x >= 1 && x <= 20 && Math.floor(x) === x); })) throw new Error('Durations must be whole numbers 1..20, e.g. servers=3; 6 1 1 6 1 1');
        if (d.length > 18) throw new Error('Use at most 18 requests');
        var snaps = lbSim(d, n), frames = [], zeros = [];
        for (var k = 0; k < n; k++) zeros.push(0);
        frames.push({ narr: 'One request arrives every tick. Each number is how many ticks that request keeps a server busy (a 6 could be a report, a 1 a quick API call). Top: <b>round robin</b>. Bottom: <b>least connections</b>. Same traffic for both.', parts: [
          { type: 'array', label: 'request durations (ticks)', values: d },
          lbGraph('LB: round robin', n, null, zeros, 'cur'), lbGraph('LB: least connections', n, null, zeros, 'ok')
        ] });
        snaps.forEach(function (sn) {
          var hl = {}; hl[sn.t] = 'cur';
          var why = sn.rr.pick === sn.lc.pick ? 'Both pick <b>S' + (sn.rr.pick + 1) + '</b>.' :
            'Round robin blindly takes the next in line, <b>S' + (sn.rr.pick + 1) + '</b> (' + (sn.rr.active[sn.rr.pick] - 1) + ' already busy). Least connections looks at live counts and picks <b>S' + (sn.lc.pick + 1) + '</b> (' + (sn.lc.active[sn.lc.pick] - 1) + ' busy).';
          frames.push({
            narr: 'Tick ' + sn.t + ': request #' + (sn.t + 1) + ' needs <b>' + sn.d + '</b> tick' + (sn.d > 1 ? 's' : '') + '. ' + why + (Math.max.apply(null, sn.rr.active) >= 3 ? ' <span class="c-r">A round-robin server is piling up work.</span>' : ''),
            parts: [
              { type: 'array', label: 'request durations', values: d, hl: hl, ptr: (function () { var p = {}; p[sn.t] = 'now'; return p; })() },
              lbGraph('LB: round robin', n, sn.rr.pick, sn.rr.active, 'cur'),
              { type: 'bars', label: 'Round robin — in-flight per server', values: sn.rr.active, idxLabels: sn.rr.active.map(function (_, i) { return 'S' + (i + 1); }), hl: (function () { var h = {}; h[sn.rr.pick] = 'cur'; return h; })() },
              lbGraph('LB: least connections', n, sn.lc.pick, sn.lc.active, 'ok'),
              { type: 'bars', label: 'Least connections — in-flight per server', values: sn.lc.active, idxLabels: sn.lc.active.map(function (_, i) { return 'S' + (i + 1); }), hl: (function () { var h = {}; h[sn.lc.pick] = 'ok'; return h; })() },
              V('Running totals', { 'RR served': sn.rr.tot.join(' / '), 'LC served': sn.lc.tot.join(' / '), 'RR worst peak': Math.max.apply(null, sn.rr.peak), 'LC worst peak': Math.max.apply(null, sn.lc.peak) })
            ]
          });
        });
        var last = snaps[snaps.length - 1], rp = Math.max.apply(null, last.rr.peak), lp = Math.max.apply(null, last.lc.peak);
        var rows = [];
        for (k = 0; k < n; k++) rows.push(['S' + (k + 1), last.rr.tot[k], last.rr.peak[k], last.lc.tot[k], last.lc.peak[k]]);
        frames.push({ narr: 'Result: round robin gives every server the same <b>number</b> of requests, but not the same <b>amount of work</b> — its busiest server peaked at <b>' + rp + '</b> in-flight requests vs <b>' + lp + '</b> for least connections. ' + (rp > lp ? 'Uneven request cost is exactly where least connections wins.' : 'With this traffic both did equally well — when requests cost the same, simple round robin is perfect.'), parts: [
          { type: 'table', label: 'Per-server summary', columns: ['server', 'RR served', 'RR peak', 'LC served', 'LC peak'], rows: rows },
          { type: 'bars', label: 'Worst peak in-flight (lower is better)', values: [rp, lp], idxLabels: ['round robin', 'least conn'], hl: rp > lp ? { 0: 'bad', 1: 'ok' } : { 0: 'ok', 1: 'ok' } }
        ] });
        return frames;
      }
    }, {
      title: 'Weighted round robin (smooth, like nginx)',
      input: 'S1:5 S2:1 S3:1',
      inputLabel: 'name:weight pairs (2–5 servers, weights 1–9)',
      gen: function (input) {
        var pairs = String(input || '').trim().split(/[\s,]+/).filter(Boolean).map(function (p) { var a = p.split(':'); return { name: a[0], w: Number(a[1]) }; });
        if (pairs.length < 2 || pairs.length > 5) throw new Error('Give 2 to 5 servers like S1:5 S2:1 S3:1');
        pairs.forEach(function (p) { if (!p.name || !(p.w >= 1 && p.w <= 9 && Math.floor(p.w) === p.w)) throw new Error('Each entry must look like S1:3 (weight 1..9)'); });
        var total = pairs.reduce(function (s, p) { return s + p.w; }, 0), cw = pairs.map(function () { return 0; }), served = pairs.map(function () { return 0; });
        var frames = [], seq = [], names = pairs.map(function (p) { return p.name; });
        frames.push({ narr: 'Weights say how many turns each server gets per cycle (total ' + total + '). A naive version would send ' + pairs[0].name + ' ' + pairs[0].w + ' requests <i>in a row</i> — bursty. The <b>smooth</b> algorithm interleaves them: every pick, add each weight to its "current" score, pick the highest, then subtract the total from the winner.', parts: [
          { type: 'table', label: 'Servers', columns: ['server', 'weight'], rows: pairs.map(function (p) { return [p.name, p.w]; }) },
          { type: 'bars', label: 'current score', values: cw.slice(), idxLabels: names }
        ] });
        var picks = Math.min(total * 2, 18);
        for (var i = 0; i < picks; i++) {
          var k, best = 0;
          for (k = 0; k < pairs.length; k++) cw[k] += pairs[k].w;
          var before = cw.slice();
          for (k = 1; k < pairs.length; k++) if (cw[k] > cw[best]) best = k;
          cw[best] -= total; served[best]++; seq.push(pairs[best].name);
          var h = {}; h[best] = 'ok';
          frames.push({ narr: 'Pick #' + (i + 1) + ': scores after adding weights = [' + before.join(', ') + ']. Highest is <b>' + pairs[best].name + '</b> → it serves this request, then its score drops by ' + total + ' so others catch up.', parts: [
            { type: 'bars', label: 'current score (after subtracting total from the winner)', values: cw.slice(), idxLabels: names, hl: h },
            { type: 'queue', label: 'order of picks so far', items: seq.slice(-12), hl: (function () { var q = {}; q[Math.min(seq.length, 12) - 1] = 'ok'; return q; })(), frontLabel: 'older', backLabel: 'newest' },
            V('Requests served', (function () { var o = {}; pairs.forEach(function (p, j) { o[p.name] = served[j]; }); return o; })())
          ] });
        }
        frames.push({ narr: 'After ' + picks + ' picks each server has served exactly in proportion to its weight, and the big server\'s turns are spread out instead of bunched. This is how nginx and many proxies implement weights.', parts: [
          { type: 'bars', label: 'Served vs weight share', values: served, idxLabels: names.map(function (nm, j) { return nm + ' (w' + pairs[j].w + ')'; }), hl: { 0: 'sel' } },
          T('Sequence: <b>' + seq.join(' ') + '</b>')
        ] });
        return frames;
      }
    }],
    examples: [
      { title: 'Round robin, 7 requests, 3 servers', html: `<p>Request <i>i</i> (starting at 0) goes to server <code>i mod 3</code>:</p>
        ${H.table(['request', '0', '1', '2', '3', '4', '5', '6'], [['server', 'S1', 'S2', 'S3', 'S1', 'S2', 'S3', H.c('b', 'S1')]])}
        <p>S1 gets 3, S2 gets 2, S3 gets 2. Over many requests the counts are equal — but only the <b>counts</b>, not the work.</p>` },
      { title: 'Least connections with WebSockets', html: `<p>A chat service holds long-lived WebSocket connections. S1 has 9,000 open sockets, S2 has 9,200, a freshly started S3 has 0.</p>
        <p>Round robin would give S3 only 1/3 of new connections for hours. Least connections sends new connections to ${H.c('g', 'S3')} until it catches up. ${H.c('y', 'Careful:')} if S3 is cold (empty caches), flooding it can hurt — many LBs offer <b>slow start</b>, ramping a new server's share over e.g. 60 seconds.</p>` },
      { title: 'Weighted pool after a hardware upgrade', html: `<p>Pool: two old 4-vCPU servers and one new 16-vCPU server. Plain RR gives each 1/3 of traffic → the old ones run hot, the new one idles. Set weights 1 : 1 : 4 → the new box gets 4/6 ≈ 67% of requests.</p>
        ${H.table(['server', 'weight', 'share'], [['old-1', '1', '17%'], ['old-2', '1', '17%'], ['new-1', '4', H.c('g', '67%')]])}` },
      { title: 'Power of two choices', html: `<p>Ten independent LB nodes each pick a backend. If they all use "least connections" based on slightly stale numbers, they all choose the <i>same</i> currently-emptiest server at once — a herd. With <b>two random choices</b>, each LB picks 2 servers at random and sends to the less loaded one. This simple trick avoids herding and gives load nearly as even as full least connections. Envoy's default "least request" balancer works this way.</p>` }
    ],
    deepDive: `<p><b>What "connections" really means.</b> For an L4 LB it is open TCP connections. For an L7 HTTP LB with keep-alive and HTTP/2, one connection carries many requests, so modern proxies track <b>outstanding requests</b> instead ("least request" in Envoy, <code>least_conn</code> in nginx counts active upstream connections). Pick the metric that matches the unit of work.</p>
      <p><b>Least connections is not least <i>load</i>.</b> Ten idle WebSocket connections cost less than one CPU-heavy request. Advanced options: <b>least response time</b> (combine active count with measured latency), <b>EWMA latency</b> (Finagle/Linkerd "peak EWMA"), or server-reported load ("utilisation-based" balancing). Each adds signal and complexity.</p>
      <p><b>The new-server trap:</b> a just-booted server has 0 connections, so least connections sends it <i>everything</i> while its JIT, caches and connection pools are cold → it slows down or crashes → it restarts → repeat. Fixes: slow start (ramp weight over 30–120 s), warm-up requests before marking healthy, readiness checks that only pass when warm.</p>
      <p><b>Where the LB sits and how it scales:</b> the LB itself must not become the bottleneck or single point of failure. Cloud LBs (AWS ALB/NLB, Google Cloud LB, Azure Load Balancer) are distributed fleets behind the scenes. Self-run LBs (HAProxy, nginx, Envoy) are deployed in pairs or groups with a floating IP or behind DNS/anycast (Topic 5 and HLD 4).</p>
      <p><b>Client-side load balancing:</b> in microservices, callers often balance themselves using a service registry (gRPC with xDS, a service mesh sidecar), avoiding an extra hop. Same algorithms, different place.</p>
      <p><b>Health checks:</b> active (LB polls <code>/health</code>) and passive (LB notices errors/timeouts on real traffic — "outlier detection"). A good health endpoint checks the process can serve, but should <i>not</i> fail just because a shared dependency is down, or every server fails at once and the LB has nowhere to send traffic.</p>`,
    aiEra: `<p><b>What AI changes:</b> LLM inference is a fascinating load-balancing problem. Requests vary wildly (10 tokens vs 4,000 tokens), and a GPU server's real load is its queue of tokens and its KV-cache memory, not its connection count. Inference gateways in 2026 balance by <b>queue depth and KV-cache usage</b>, and prefer the server that already holds a cached prompt prefix (<i>prefix-aware / cache-aware routing</i>) — round robin is a poor fit.</p>
      <p><b>Use AI as a partner:</b> <code>Given these per-endpoint p50/p99 latencies and server sizes, which LB algorithm and weights would you choose? Show your reasoning</code>, or ask it to generate an HAProxy/nginx/Envoy config and then check every line against the docs. <b>Where AI goes wrong:</b> it confuses nginx directive names across versions, assumes "least connections" always beats round robin, and forgets slow start and health-check thresholds. <b>What you must own:</b> matching the algorithm to the shape of your traffic, and testing it with a load test before trusting it.</p>`,
    problems: [{
      title: 'Pick the Load-Balancing Algorithm',
      level: 'Medium', tags: ['load balancer', 'round robin', 'least connections', 'weights'], companies: ['Netflix', 'Cloudflare', 'Amazon'],
      statement: `<p>A media API has two kinds of requests on the same servers:</p>
        <ul><li><code>GET /metadata</code> — 95% of requests, ~20 ms each,</li>
        <li><code>POST /export</code> — 5% of requests, 30 s to 3 min of CPU each.</li></ul>
        <p>The pool has 6 servers with 8 vCPU and 2 newer servers with 32 vCPU. Users complain that some metadata calls take 10+ seconds. The LB uses plain round robin. What is happening, and what would you change?</p>`,
      constraints: `Peak 4,000 rps; p99 for /metadata must be &lt; 200 ms.`,
      example: `<p>With RR, a server that happened to receive 3 exports is CPU-starved, yet RR keeps sending it 1/8 of metadata calls → ${H.c('r', 'slow p99')}. Meanwhile the 32-vCPU servers get the same 1/8 share as the small ones → ${H.c('r', 'wasted capacity')}.</p>`,
      brute: { why: `<p>"Add more servers with round robin" lowers average load but does not fix the cause: RR is blind to how busy a server is, so exports still cluster randomly and metadata calls still queue behind them. You pay for more machines and the p99 stays spiky.</p>` },
      mcq: { q: 'Which single change helps p99 the most?', options: ['Move /export to its own pool (or async job queue)', 'Switch to IP-hash', 'Lower the health-check interval'], answer: 0, explain: 'Isolating the slow work stops it from starving fast requests; the LB algorithm then matters much less. Least connections + weights is a good second step.' },
      hints: [`<p>RR balances request <b>counts</b>, not <b>work</b>. Which request type makes the work uneven?</p>`, `<p>Two fixes stack: separate the slow work from the fast work, and make the LB aware of server size and live load.</p>`, `<p>Recipe: L7 routing by path → export pool (or a job queue); metadata pool uses weighted least-outstanding-requests with weights ∝ vCPU and slow start.</p>`],
      solution: {
        approach: `<p><b>Diagnosis:</b> round robin ignores both request cost and server size. Exports randomly pile onto some servers, saturating their CPUs; RR keeps sending fast metadata requests there, so they wait in line (head-of-line blocking) → 10-second outliers. The 32-vCPU servers are under-used because they get the same share as 8-vCPU servers.</p>
          <p><b>Fix 1 — isolate slow work (biggest win):</b> use an L7 rule: <code>/export</code> goes to a separate pool, or better, the API enqueues an export job (returns 202 + job id) and a worker fleet processes jobs from a queue at its own pace. The metadata pool now only sees uniform 20 ms requests.</p>
          <p><b>Fix 2 — smarter algorithm:</b> for the metadata pool use <b>weighted least outstanding requests</b>: weights 1 for 8-vCPU and 4 for 32-vCPU servers, so the big boxes get ~4× traffic and any temporarily slow server receives fewer new requests. Enable slow start for newly added servers. (If several LB nodes run independently, the power-of-two-choices variant avoids herding.)</p>
          <p><b>Fix 3 — guardrails:</b> timeouts on export calls, a per-server concurrency limit for exports, and health checks with outlier detection to eject a server whose latency spikes.</p>
          <p><b>Result:</b> metadata p99 depends only on 20 ms work spread by live load → well under 200 ms; exports scale independently by queue depth.</p>`,
        complexity: `<p>Round robin pick O(1); least-outstanding pick O(N) over the pool (or O(1) with power-of-two choices). Weighted share of a 32-vCPU server = 4 ÷ (6·1 + 2·4) = 4/14 ≈ 29% of metadata traffic.</p>`,
        followUps: ['How would you size the export worker pool from queue length?', 'What happens to in-flight exports during a deploy?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 5 — Single Points of Failure, Redundancy, Failover
     ===================================================================== */
  topics.push({
    title: 'Single Points of Failure, Health Checks & Failover',
    analogy: `<p>A town connected to the city by <b>one bridge</b>. On a normal day nobody thinks about it. The day the bridge closes, the whole town is cut off — ambulances, food trucks, everyone. That bridge is a <b>single point of failure (SPOF)</b>: one part whose failure stops everything.</p>
      <p>The fixes are familiar: build a <b>second bridge</b> (redundancy), put up <b>signs that redirect traffic</b> when one bridge closes (health checks + failover), and make sure both bridges are not built on the <b>same fault line</b> (independent failure domains). A car carries a <b>spare tyre</b> for the same reason; a plane has two engines and can fly on one.</p>`,
    explain: `<p>A <b>single point of failure</b> is any component that, if it fails, takes the whole system (or a whole feature) down. To find them, <b>walk the path of one request</b> from the user to the data and back, and ask at every box and arrow: <i>"If this one thing disappears right now, what happens?"</i></p>
      <h4>Typical SPOFs, from obvious to sneaky</h4>
      <ul>
        <li>One app server; one load balancer; one database; one cache/session store.</li>
        <li>Everything in one <b>availability zone</b> (one data-centre building) or one region.</li>
        <li>Shared infrastructure: one NAT gateway, one DNS provider, one message broker, one config service.</li>
        <li>Non-hardware: an expiring TLS certificate, a single API key, one engineer who knows how to deploy, a manual step in failover.</li>
      </ul>
      <h4>How to remove a SPOF: redundancy + detection + switching</h4>
      ${H.table(['Pattern', 'How it works', 'Example'], [
        ['<b>Active-active</b>', 'All copies serve traffic; if one dies the others absorb its share', 'N stateless app servers behind a LB'],
        ['<b>Active-passive (standby)</b>', 'One copy serves; a standby takes over on failure', 'Primary DB + standby replica; LB pair sharing a floating IP'],
        ['<b>N+1 / N+2</b>', 'Provision one (or two) more than needed at peak', '10 servers needed → run 11'],
        ['<b>Health checks</b>', 'LB probes each server; after X failures, remove it; after Y passes, add it back', '<code>GET /health</code> every 5 s, unhealthy after 2–3 failures']
      ])}
      <h4>Availability math (with small numbers)</h4>
      <p><b>Availability</b> = fraction of time the system works. 99.9% ("three nines") allows about <b>8.8 hours</b> of downtime per year; 99.99% about <b>53 minutes</b>.</p>
      <ul>
        <li><b>In series</b> (request needs A <i>and</i> B): multiply. LB 99.99% × app 99.9% × DB 99.9% ≈ ${H.c('r', '99.79%')} — worse than any single part!</li>
        <li><b>In parallel</b> (request needs A <i>or</i> its copy): 1 − (chance all copies are down). Two app servers at 99.9%: 1 − 0.001 × 0.001 = ${H.c('g', '99.9999%')}.</li>
      </ul>
      <p>So every SPOF you remove turns a weak link in the chain into a strong one. (Real numbers are lower than this ideal math because failures are often <b>correlated</b> — same bug, same zone, same bad deploy — and failover takes time.)</p>`,
    clues: [
      '"Fix the single point of failure" / "what happens if X dies?" → walk the request path, add redundancy per tier',
      '"Must be highly available / 99.99%" → no SPOFs, multi-AZ, automatic failover',
      '"One database server" in a diagram → primary + standby with automatic failover (and backups)',
      '"Load balancer in front of everything" → who balances the load balancer? (pair, floating IP, managed LB, DNS)',
      '"Survive a data-centre outage" → spread across availability zones / regions',
      '"Errors spike for 15 s whenever a server dies" → health check interval × threshold, retries'
    ],
    code: { lang: 'python', run: true, title: 'Availability calculator: series vs parallel (runnable)', code: `def series(*parts):
    """All parts are needed (LB AND app AND DB): multiply availabilities."""
    total = 1.0
    for a in parts:
        total *= a
    return total

def parallel(a, copies):
    """Any one copy is enough: 1 - P(all copies down). Assumes independent failures."""
    return 1 - (1 - a) ** copies

def downtime(avail):
    minutes = (1 - avail) * 365 * 24 * 60
    return f"{minutes:>9,.1f} min/year"

LB, APP, DB = 0.9999, 0.999, 0.999

single = series(LB, APP, DB)
redundant = series(parallel(LB, 2), parallel(APP, 3), parallel(DB, 2))

print(f"one of each      : {single:.6%}  -> {downtime(single)}")
print(f"2 LB, 3 app, 2 DB: {redundant:.6%}  -> {downtime(redundant)}")
print("only the app tier redundant:", f"{series(LB, parallel(APP, 3), DB):.4%}",
      "<- the remaining SPOFs (LB, DB) now dominate")
` },
    viz: [{
      title: 'A server dies: health checks detect it, traffic reroutes',
      input: 'servers=3 fail=S2 at=5 detect=3 recover=13 requests=18',
      inputLabel: 'servers (2–5), fail=Sk, at=tick it dies, detect=failed checks before removal, recover=tick it comes back, requests (≤ 24)',
      gen: function (input) {
        var o = kvParse(input), n = Number(o.servers || 3), failS = Number(String(o.fail || 'S2').replace(/\D/g, '')) - 1;
        var at = Number(o.at || 4), det = Number(o.detect || 2), rec = Number(o.recover || 0), R = Number(o.requests || 16);
        if (!(n >= 2 && n <= 5)) throw new Error('servers must be 2..5');
        if (!(failS >= 0 && failS < n)) throw new Error('fail must name an existing server, e.g. fail=S2');
        if (!(R >= 4 && R <= 24)) throw new Error('requests must be 4..24');
        if (!(at >= 1 && at <= R) || !(det >= 1 && det <= 5)) throw new Error('at must be 1..requests and detect 1..5');
        var up = [], inRot = [], served = [], fails = 0, errors = 0, passes = 0, rr = 0, frames = [], k;
        for (k = 0; k < n; k++) { up.push(true); inRot.push(true); served.push(0); }
        function draw(pick, err) {
          var nodes = [B('U', 'Users', 8, 30), B('LB', 'Load Balancer', 32, 30)], edges = [['U', 'LB']], hl = { LB: 'cur' }, ehl = { 'U-LB': 'cur' }, tags = {};
          for (var j = 0; j < n; j++) {
            var y = n === 1 ? 30 : 6 + j * (48 / (n - 1));
            nodes.push(B('S' + j, 'Server ' + (j + 1), 72, y));
            edges.push(['LB', 'S' + j]);
            if (!up[j]) { hl['S' + j] = 'bad'; tags['S' + j] = inRot[j] ? 'DOWN (LB unaware)' : 'DOWN, removed'; }
            else if (!inRot[j]) { hl['S' + j] = 'win'; tags['S' + j] = 'back, warming up'; }
            if (!inRot[j]) ehl['LB-S' + j] = 'done';
          }
          if (pick !== null) { ehl['LB-S' + pick] = err ? 'bad' : 'ok'; if (up[pick]) hl['S' + pick] = 'ok'; }
          return G('Request path', nodes, edges, hl, ehl, tags, 60);
        }
        frames.push({ narr: 'Normal day: ' + n + ' healthy servers, round robin. The LB health-checks each server every tick and removes one after <b>' + det + '</b> failed check' + (det > 1 ? 's' : '') + ' in a row. Server ' + (failS + 1) + ' will die at tick ' + at + '.', parts: [draw(null, false), { type: 'bars', label: 'Requests served per server', values: served.slice(), idxLabels: served.map(function (_, j) { return 'S' + (j + 1); }) }, V('Health', { errors: 0, 'failed checks on failed server': 0 })] });
        for (var t = 1; t <= R; t++) {
          var note = '';
          if (t === at) { up[failS] = false; note += '<span class="c-r">💥 Server ' + (failS + 1) + ' crashes.</span> '; }
          if (rec && t === rec && !up[failS]) { up[failS] = true; passes = 0; note += '<span class="c-g">Server ' + (failS + 1) + ' is repaired and restarts.</span> '; }
          // health check this tick
          if (!up[failS] && inRot[failS]) { fails++; if (fails >= det) { inRot[failS] = false; note += 'Health check failed ' + fails + '× → <b>LB removes Server ' + (failS + 1) + ' from rotation.</b> '; } else note += 'Health check failed (' + fails + '/' + det + '), LB still trusts it. '; }
          if (up[failS] && !inRot[failS]) { passes++; if (passes >= 2) { inRot[failS] = true; fails = 0; note += 'Two passing checks → <b>Server ' + (failS + 1) + ' rejoins rotation.</b> '; } else note += 'Check passed (' + passes + '/2) — not trusted yet. '; }
          var rot = []; for (k = 0; k < n; k++) if (inRot[k]) rot.push(k);
          var pick = rot[rr % rot.length]; rr++;
          var err = !up[pick];
          if (err) errors++; else served[pick]++;
          var h = {}; h[pick] = err ? 'bad' : 'ok';
          frames.push({
            narr: 'Tick ' + t + ': ' + note + 'Request #' + t + ' → Server ' + (pick + 1) + (err ? ' — <span class="c-r">it is dead but still in rotation → error (or a retry, if the LB/client retries).</span>' : ' ✓'),
            parts: [draw(pick, err), { type: 'bars', label: 'Requests served per server', values: served.slice(), idxLabels: served.map(function (_, j) { return 'S' + (j + 1); }), hl: h },
              V('Health', { errors: errors, 'failed checks on failed server': fails, 'servers in rotation': rot.length + ' of ' + n }, { errors: errors ? 'bad' : '' })]
          });
        }
        frames.push({ narr: 'Done. <b>' + errors + '</b> request(s) failed — only during the detection window (between the crash and removal). Shrink it with faster checks, lower thresholds, passive health checks on real traffic, and <b>retries on another server</b> for safe (idempotent) requests. Survivors absorbed the extra load — so size the pool N+1.', parts: [
          { type: 'bars', label: 'Final requests per server', values: served.slice(), idxLabels: served.map(function (_, j) { return 'S' + (j + 1); }), hl: (function () { var q = {}; q[failS] = 'bad'; return q; })() },
          V('Outcome', { 'total requests': R, failed: errors, 'detection window (ticks)': det })
        ] });
        return frames;
      }
    }, {
      title: 'Hunting SPOFs layer by layer',
      gen: function () {
        var f = [];
        f.push({ narr: '<b>Starting point:</b> users → DNS → one load balancer → one app server → one database. Walk the path and ask "what if this dies?" Every red box is a SPOF. (DNS from a managed provider is already spread over many servers worldwide.)', parts: [
          G('Version 1', [B('U', 'Users', 7, 30), B('DNS', 'DNS', 24, 30), B('LB', 'Load Balancer', 45, 30), B('A1', 'App 1', 67, 30), B('DB', 'Database', 89, 30)], [['U', 'DNS'], ['DNS', 'LB'], ['LB', 'A1'], ['A1', 'DB']], { LB: 'bad', A1: 'bad', DB: 'bad', DNS: 'ok' }, {}, { LB: 'SPOF', A1: 'SPOF', DB: 'SPOF' }),
          V('Availability (ideal)', { LB: '99.99%', app: '99.9%', DB: '99.9%', 'whole path': '≈ 99.79% (~18 h down/yr)' }, { 'whole path': 'bad' })
        ] });
        f.push({ narr: '<b>Fix the app tier:</b> add App 2 and App 3 (stateless, sessions in a shared store). One app server dying is now a non-event — health checks remove it.', parts: [
          G('Version 2', [B('U', 'Users', 7, 30), B('LB', 'Load Balancer', 28, 30), B('A1', 'App 1', 55, 8), B('A2', 'App 2', 55, 30), B('A3', 'App 3', 55, 52), B('DB', 'Database', 86, 30)], [['U', 'LB'], ['LB', 'A1'], ['LB', 'A2'], ['LB', 'A3'], ['A1', 'DB'], ['A2', 'DB'], ['A3', 'DB']], { LB: 'bad', A1: 'ok', A2: 'ok', A3: 'ok', DB: 'bad' }, {}, { LB: 'SPOF', DB: 'SPOF' }),
          V('Availability (ideal)', { 'app tier': '1 − 0.001³ ≈ 99.9999999%', 'whole path': '≈ 99.89%' })
        ] });
        f.push({ narr: '<b>Who balances the load balancer?</b> Run two: an active LB and a passive standby sharing a <b>floating (virtual) IP</b>. They heartbeat each other (e.g. keepalived/VRRP); if the active one stops answering, the standby claims the IP within seconds. Managed cloud load balancers do this for you across zones.', parts: [
          G('Version 3', [B('U', 'Users', 7, 30), B('VIP', 'Floating IP', 24, 30), B('LBa', 'LB active', 44, 14), B('LBb', 'LB standby', 44, 46), B('A1', 'App 1', 66, 14), B('A2', 'App 2', 66, 46), B('DB', 'Database', 89, 30)], [['U', 'VIP'], ['VIP', 'LBa'], ['VIP', 'LBb', 'takeover'], ['LBa', 'A1'], ['LBa', 'A2'], ['A1', 'DB'], ['A2', 'DB']], { LBa: 'ok', LBb: 'win', A1: 'ok', A2: 'ok', DB: 'bad' }, { 'VIP-LBb': 'done' }, { LBb: 'heartbeat', DB: 'SPOF' })
        ] });
        f.push({ narr: '<b>Fix the database:</b> a <b>primary</b> takes all writes and streams changes to a <b>standby</b> (synchronous or semi-sync, so no committed data is lost). On primary failure, an orchestrator (or the managed service) promotes the standby and repoints the DB address. Failover typically takes tens of seconds; apps must reconnect and retry.', parts: [
          G('Version 4', [B('U', 'Users', 7, 30), B('LB', 'LB pair', 26, 30), B('A1', 'App 1', 50, 14), B('A2', 'App 2', 50, 46), B('P', 'DB primary', 80, 14), B('S', 'DB standby', 80, 46)], [['U', 'LB'], ['LB', 'A1'], ['LB', 'A2'], ['A1', 'P'], ['A2', 'P'], ['P', 'S', 'replicates']], { LB: 'ok', A1: 'ok', A2: 'ok', P: 'ok', S: 'win' }, { 'P-S': 'ok' }, { S: 'ready to promote' })
        ] });
        f.push({ narr: '<b>Failure drill — the primary DB dies.</b> Writes fail for a short window; the standby is promoted; the app reconnects. Without the standby this would be an outage of hours (restore from backup).', parts: [
          G('Version 4, DB failover', [B('U', 'Users', 7, 30), B('LB', 'LB pair', 26, 30), B('A1', 'App 1', 50, 14), B('A2', 'App 2', 50, 46), B('P', 'old primary', 80, 14), B('S', 'NEW primary', 80, 46)], [['U', 'LB'], ['LB', 'A1'], ['LB', 'A2'], ['A1', 'S'], ['A2', 'S'], ['A1', 'P'], ['A2', 'P']], { P: 'bad', S: 'sel', A1: 'ok', A2: 'ok' }, { 'A1-P': 'bad', 'A2-P': 'bad', 'A1-S': 'ok', 'A2-S': 'ok' }, { P: 'crashed', S: 'promoted' })
        ] });
        f.push({ narr: '<b>Hidden SPOF: the whole building.</b> If every box is in one availability zone (one data centre), a power or network failure there takes it all. Spread each tier across <b>two or three zones</b>.', parts: [
          G('Version 5: multi-AZ', [B('U', 'Users', 7, 30), B('LB', 'Cloud LB (multi-AZ)', 30, 30), B('A1', 'App (zone A)', 60, 10), B('A2', 'App (zone B)', 60, 50), B('P', 'DB primary A', 90, 10), B('S', 'DB standby B', 90, 50)], [['U', 'LB'], ['LB', 'A1'], ['LB', 'A2'], ['A1', 'P'], ['A2', 'P'], ['P', 'S']], { A1: 'ok', A2: 'ok', P: 'ok', S: 'win', LB: 'ok' }, { 'P-S': 'ok' }, {})
        ] });
        f.push({ narr: '<b>Zone A goes dark.</b> The LB stops sending to zone A, the standby in zone B is promoted, and zone B carries everything. This only works if zone B has <b>enough spare capacity</b> to take 100% of traffic — plan for it (N+1 per zone, or 3 zones at ≤ 66% each).', parts: [
          G('Zone A outage', [B('U', 'Users', 7, 30), B('LB', 'Cloud LB (multi-AZ)', 30, 30), B('A1', 'App (zone A)', 60, 10), B('A2', 'App (zone B)', 60, 50), B('P', 'DB primary A', 90, 10), B('S', 'DB primary B', 90, 50)], [['U', 'LB'], ['LB', 'A1'], ['LB', 'A2'], ['A1', 'P'], ['A2', 'S']], { A1: 'bad', P: 'bad', A2: 'ok', S: 'sel' }, { 'LB-A1': 'bad', 'LB-A2': 'ok', 'A2-S': 'ok' }, { A1: 'zone down', P: 'zone down', S: 'promoted' })
        ] });
        f.push({ narr: '<b>The checklist</b> you can say out loud in any interview.', parts: [
          { type: 'table', label: 'SPOF checklist', columns: ['layer', 'redundancy', 'switch-over'], rows: [['DNS', 'managed, anycast, 2 providers for the paranoid', 'automatic'], ['load balancer', 'pair + floating IP, or managed multi-AZ LB', 'seconds'], ['app servers', 'N+1 stateless, multi-AZ', 'health checks, seconds'], ['session store / cache', 'replica + auto failover', 'seconds'], ['database', 'primary + standby, backups', 'tens of seconds'], ['people & process', 'runbooks, 2+ people on call, automated certs', 'practice drills']], hl: { 4: 'sel' } }
        ] });
        return f;
      }
    }],
    examples: [
      { title: 'The availability chain', html: `${H.table(['Design', 'Math', 'Availability', 'Downtime/yr'], [
        ['1 LB → 1 app → 1 DB', '0.9999 × 0.999 × 0.999', '99.79%', H.c('r', '~18 h')],
        ['1 LB → 3 apps → 1 DB', '0.9999 × (1−0.001³) × 0.999', '99.89%', '~9.6 h'],
        ['2 LB → 3 apps → 2 DB', '(1−0.0001²) × (1−0.001³) × (1−0.001²)', '≈ 99.9999%', H.c('g', '~0.5 min')]
      ])}<p>Making only the app tier redundant barely helped: the remaining SPOFs dominate. A chain is only as strong as its weakest link.</p>` },
      { title: 'The expired certificate', html: `<p>Everything is redundant: 3 zones, 12 servers, replicated DB. One morning every request fails — the single wildcard TLS certificate expired. ${H.c('r', 'A SPOF does not have to be a machine.')}</p>
        <p>${H.c('g', 'Fix:')} automatic renewal (ACME / managed certificates), alerts 30 days before expiry, and treat secrets/certs/config as part of the SPOF review.</p>` },
      { title: 'The health check that killed everything', html: `<p>The <code>/health</code> endpoint checked "can I reach the database?". The DB had a 20-second hiccup; <b>every</b> app server failed health checks at once; the LB removed all of them → total outage that lasted longer than the DB blip.</p>
        <p>${H.c('g', 'Fix:')} split <b>liveness</b> ("is my process OK?") from <b>readiness</b> ("should I get traffic?"), do not fail on shared dependencies, and many LBs "fail open" (send traffic to all) if every target is unhealthy.</p>` },
      { title: 'Sizing for failure (N+1)', html: `<p>Peak needs 6 servers at 70% utilisation. If you run exactly 6 and one dies, the other 5 jump to 84% — risky. Run 7 (N+1): losing one leaves 6, exactly the plan. Across 2 zones, each zone must handle 100% alone → 6 per zone = 12 total. Across 3 zones, each must handle 50% → 3 per zone = 9 total. ${H.c('b', 'More zones = cheaper redundancy.')}</p>` }
    ],
    deepDive: `<p><b>Failure domains:</b> redundancy only helps if copies fail <i>independently</i>. Two servers on the same rack share a switch and power supply; two zones in a region share a control plane; two regions may share your deploy pipeline and your code. Large outages are usually <b>correlated</b> failures: a bad config pushed everywhere, a certificate, a dependency that all copies call. That is why staged rollouts (one zone, then the rest) matter as much as extra hardware.</p>
      <p><b>Detection math:</b> with a 5-second check interval and an unhealthy threshold of 3, a dead server keeps receiving traffic for up to ~15 seconds. At 1,000 rps across 10 servers that is ~1,500 failed requests. Reduce it with passive checks (eject after N consecutive 5xx on real traffic), connection-level failure detection, and client/LB <b>retries</b> to another server — but only for idempotent requests, with a retry budget, or retries can amplify an outage.</p>
      <p><b>Split brain:</b> in active-passive setups, if the heartbeat link breaks but both nodes are alive, both may believe they are primary. Two DB primaries accepting writes = divergent data. Protection: a third-party arbiter/quorum (odd number of voters), fencing (STONITH — "shoot the other node in the head"), or fencing tokens. This is why database failover is usually done by a consensus-backed tool (Patroni with etcd, managed RDS/Cloud SQL) — covered in HLD 11.</p>
      <p><b>Graceful degradation:</b> not every dependency deserves to take the page down. If the recommendations service dies, show the page without recommendations. Timeouts + fallbacks + circuit breakers (HLD 12) turn a would-be SPOF into a partial feature loss.</p>
      <p><b>Test it:</b> redundancy you have never exercised is a hope, not a plan. Game days and chaos engineering (killing instances, blocking a zone) prove that failover works and that the survivors have enough capacity.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI is very good at reviewing an architecture diagram or Terraform for SPOFs: "which resources are in a single zone?", "is the DB multi-AZ?", "does anything depend on one NAT gateway?". It can also help write runbooks and analyse incident timelines.</p>
      <p><b>New SPOFs in AI systems:</b> one LLM provider, one model endpoint, one region with GPU capacity, one embedding model whose index cannot be swapped quickly. Resilient AI apps use a <b>model gateway</b> with fallback to a second provider or a smaller self-hosted model, timeouts and retries with backoff, and caching of common answers.</p>
      <p><b>Use AI as a partner:</b> <code>Here is my architecture; walk the request path and list every single point of failure, including non-hardware ones (certs, secrets, people, config)</code>. <b>Where AI goes wrong:</b> it proposes multi-region active-active for a startup, treats "two copies" as independent when they share a zone, and ignores split brain. <b>What you must own:</b> choosing which SPOFs are worth removing for the availability target and budget.</p>`,
    problems: [{
      title: 'Fix the Single Point of Failure',
      level: 'Medium', tags: ['SPOF', 'redundancy', 'failover', 'availability'], companies: ['Amazon', 'Stripe', 'Meta'],
      statement: `<p>An e-commerce site runs: <b>1 nginx load balancer → 4 app servers → 1 PostgreSQL</b> server, plus <b>1 Redis</b> holding sessions. Everything is in one availability zone. The business wants <b>99.95%</b> availability (≈ 4.4 hours downtime/year). Identify every SPOF and propose a design that meets the target, explaining how each failure is detected and handled.</p>`,
      constraints: `Peak 6,000 rps; each app server handles 2,000 rps at 70% utilisation; budget-conscious (no multi-region).`,
      example: `<p>Today: nginx dies → ${H.c('r', '100% outage')}. Postgres dies → ${H.c('r', 'outage until restored')}. Redis dies → ${H.c('r', 'everyone logged out')}. Zone fails → ${H.c('r', 'everything')}. Losing 1 of 4 app servers → OK (but at 6,000 rps, 3 servers = 6,000/3 = 2,000 each = 100% → overloaded!).</p>`,
      brute: { why: `<p>Naive fix: "add more app servers". The app tier was the only part that already had redundancy. The LB, database, Redis and the zone are still SPOFs, and the availability math stays dominated by them. Another naive fix — "take nightly backups" — protects data but not availability: restoring a database can take hours.</p>` },
      mcq: { q: 'After making the app tier redundant, what most limits availability?', options: ['The remaining single LB, DB, Redis and single zone', 'The number of app servers', 'The round robin algorithm'], answer: 0, explain: 'In a series chain the weakest single components dominate. Each must get its own redundancy.' },
      hints: [`<p>Walk one request: DNS → LB → app → Redis → Postgres. Mark each box with "what if it dies?"</p>`, `<p>Per tier: LB → managed multi-AZ LB or pair + floating IP; Redis → replica + auto-failover; Postgres → primary + synchronous standby in another zone; app → N+1 per zone.</p>`, `<p>Do the capacity math for losing a whole zone: 6,000 rps ÷ 1,400 usable per server ≈ 5 servers needed in the surviving zone.</p>`],
      solution: {
        approach: `<p><b>SPOFs found:</b> nginx LB, PostgreSQL, Redis, the single zone, and (capacity-wise) the app tier itself, since 3 survivors at 6,000 rps would run at 100%.</p>
          <p><b>Design (2 availability zones, A and B):</b></p>
          <ul><li><b>Entry:</b> a managed cloud load balancer spanning both zones (or 2 nginx nodes, one per zone, with keepalived/VRRP floating IP). Health checks every 5 s, unhealthy after 2 failures, healthy after 2 passes; connection draining on deploy.</li>
          <li><b>App tier:</b> stateless; need ⌈6000/1400⌉ = 5 servers to carry peak. To survive a full zone loss, each zone must hold 5 → 10 total (or 3 zones × 3 = 9, cheaper). Autoscaling group spans zones.</li>
          <li><b>Sessions:</b> Redis primary in zone A, replica in zone B, automatic failover (Sentinel or managed service). App reconnects on failover; worst case users re-login.</li>
          <li><b>Database:</b> PostgreSQL primary in A, synchronous standby in B; automatic failover via Patroni+etcd or a managed multi-AZ database; apps connect through a DNS name/proxy that follows the primary. Point-in-time backups to object storage for disasters (accidental deletes).</li>
          <li><b>Non-hardware:</b> managed auto-renewing TLS certs, secrets in a secret manager, deploys rolled out one zone at a time, runbooks + a failover drill each quarter.</li></ul>
          <p><b>Check the target:</b> each tier now has an independent standby; the main residual risk is failover time (LB seconds, Redis seconds, DB ~30–60 s). A few failovers a year still fit comfortably inside 4.4 hours.</p>`,
        complexity: `<p>Cost: roughly 2× infrastructure for the data tier and ~2× app servers for zone-level redundancy (or 1.5× with 3 zones). Availability ideal math ≈ 99.99%+ before correlated failures.</p>`,
        followUps: ['How would you avoid split brain between the two Postgres nodes?', 'What would change for a 99.999% target?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 6 — Read Replicas (intro)
     ===================================================================== */
  topics.push({
    title: 'Read Replicas: Scaling Reads (and the Stale-Read Trap)',
    analogy: `<p>A school has one official <b>master timetable</b> in the principal's office. Only the principal may change it. Copies are pinned on every floor so students do not crowd the office to read it. When the principal changes a class, a helper walks around and updates the copies — which takes a few minutes. For those few minutes a student reading a floor copy sees the <b>old</b> timetable.</p>
      <p>That is a database with <b>read replicas</b>: one <b>primary</b> takes every change, many <b>replicas</b> serve reads, and the copies are <b>a little behind</b>.</p>`,
    explain: `<p>Most apps read far more than they write: a social feed, a product page or a news site may do <b>10 to 100 reads for every write</b>. A single database server spends most of its CPU answering reads. Read replicas spread that work.</p>
      <h4>How it works</h4>
      <ol>
        <li>All <b>writes</b> (INSERT/UPDATE/DELETE) go to one <b>primary</b> (also called leader/master).</li>
        <li>The primary records every change in a log (PostgreSQL WAL, MySQL binlog) and <b>streams</b> it to each <b>replica</b> (follower), which replays it.</li>
        <li><b>Reads</b> are spread across replicas (round robin or least connections, just like app servers). The app or a proxy decides: writes → primary, reads → replicas.</li>
      </ol>
      ${H.table(['', 'Primary', 'Read replica'], [
        ['Accepts writes', H.c('g', 'Yes'), H.c('r', 'No (read-only)')],
        ['Serves reads', 'Yes (use for must-be-fresh reads)', H.c('g', 'Yes — this is its job')],
        ['Freshness', 'Always latest', 'Behind by the <b>replication lag</b> (usually ms, sometimes seconds or more)'],
        ['If it dies', 'Promote a replica (failover)', 'Remove it; others take its reads']
      ])}
      <h4>Numbers to feel it</h4>
      <p>A DB handles 10,000 queries/s: 9,000 reads + 1,000 writes and is at 90% CPU. Add 3 replicas and send reads there: each replica gets ~3,000 reads/s, the primary now only does 1,000 writes/s (plus replication work). Reads scale <b>almost linearly</b> with replicas.</p>
      <p>${H.c('r', 'What replicas do NOT fix:')} <b>writes</b>. Every write still goes to the one primary, and every replica must replay every write. If writes are the bottleneck you need other tools: batching, caching, queues, or <b>sharding</b> (HLD 5).</p>
      <h4>The trap: replication lag → stale reads</h4>
      <p>Most replicas are <b>asynchronous</b>: the primary says "done" before replicas have the change. Asha updates her profile name, the page reloads, the read hits a replica that is 2 seconds behind → she sees her ${H.c('r', 'old name')} and thinks the save failed. The classic fix is <b>read-your-writes</b> consistency: for a short window after a user writes, send <i>that user's</i> reads to the primary (or to a replica known to be caught up).</p>`,
    clues: [
      '"Read-heavy" / "100:1 read-to-write ratio" → read replicas (and caching)',
      '"Database CPU high, mostly SELECT queries" → add read replicas',
      '"User updates profile but still sees old data" → replication lag; read-your-writes',
      '"Heavy analytics/reporting queries slow down the app" → dedicated reporting replica',
      '"Writes are the bottleneck" → replicas will NOT help; think sharding/queues',
      '"Survive the database server dying" → a replica that can be promoted (failover)'
    ],
    code: { lang: 'java', title: 'Routing reads and writes with read-your-writes (Java, compiles)', code: `import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;

class DbNode {
    final String name;
    DbNode(String name) { this.name = name; }
    @Override public String toString() { return name; }
}

// Decides which database each query goes to.
class ReplicaRouter {
    private final DbNode primary;
    private final List<DbNode> replicas;
    private final AtomicInteger next = new AtomicInteger();
    private final long rywWindowMs;   // e.g. a bit longer than typical replication lag
    // NOTE: kept in memory only for the demo. In a stateless fleet, put "last write time"
    // in the user's session or a cookie so every app server sees it.
    private final Map<String, Long> lastWriteAt = new ConcurrentHashMap<>();

    ReplicaRouter(DbNode primary, List<DbNode> replicas, long rywWindowMs) {
        this.primary = primary;
        this.replicas = List.copyOf(replicas);
        this.rywWindowMs = rywWindowMs;
    }

    // Every write goes to the primary; remember when this user last wrote.
    DbNode forWrite(String userId, long nowMs) {
        lastWriteAt.put(userId, nowMs);
        return primary;
    }

    // Reads go to replicas, EXCEPT right after this user wrote something.
    DbNode forRead(String userId, long nowMs) {
        Long w = lastWriteAt.get(userId);
        if (w != null && nowMs - w < rywWindowMs) return primary;     // read-your-writes
        if (replicas.isEmpty()) return primary;
        return replicas.get(Math.floorMod(next.getAndIncrement(), replicas.size()));  // round robin
    }
}

class ReplicaDemo {
    public static void main(String[] args) {
        ReplicaRouter r = new ReplicaRouter(new DbNode("primary"),
                List.of(new DbNode("replica-1"), new DbNode("replica-2")), 5_000);
        long t = 0;
        System.out.println("asha reads  -> " + r.forRead("asha", t));          // replica-1
        System.out.println("asha writes -> " + r.forWrite("asha", t + 100));    // primary
        System.out.println("asha reads  -> " + r.forRead("asha", t + 600));     // primary (fresh)
        System.out.println("ben reads   -> " + r.forRead("ben", t + 700));      // replica-2
        System.out.println("asha reads  -> " + r.forRead("asha", t + 9_000));   // replica-1 again
    }
}` },
    viz: {
      title: 'Writes to the primary, reads from replicas, and a stale read',
      input: 'lag=2',
      inputLabel: 'Replication lag in ticks (0–4)',
      gen: function (input) {
        var o = kvParse(input), lag = o.lag !== undefined ? Number(o.lag) : 2;
        if (!(lag >= 0 && lag <= 4 && Math.floor(lag) === lag)) throw new Error('Use lag=0 … lag=4');
        var writes = [{ t: 0, v: 'Asha' }], rr = 0, frames = [], staleCount = 0, replicaReads = 0;
        function valAt(node, t) {
          var v = writes[0].v;
          writes.forEach(function (w) { if (node === 'P' ? w.t <= t : w.t + lag <= t) v = w.v; });
          return v;
        }
        function nodes() { return [B('U', 'Users', 7, 30), B('A', 'App servers', 29, 30), B('P', 'DB primary', 60, 8), B('R1', 'Replica 1', 88, 30), B('R2', 'Replica 2', 60, 52)]; }
        var edges = [['U', 'A'], ['A', 'P', 'writes'], ['A', 'R1'], ['A', 'R2', 'reads'], ['P', 'R1', 'log'], ['P', 'R2']];
        function tbl(t, hlRow) {
          var rows = [['primary', valAt('P', t)], ['replica 1', valAt('R1', t)], ['replica 2', valAt('R2', t)]], h = {};
          rows.forEach(function (r, i) { if (i > 0 && r[1] !== rows[0][1]) h[i] = 'bad'; });
          if (hlRow !== undefined) h[hlRow] = h[hlRow] === 'bad' ? 'bad' : 'sel';
          return { type: 'table', label: 'users.name for id=42 on each node (t=' + t + ')', columns: ['node', 'name'], rows: rows, hl: h };
        }
        frames.push({ narr: 'Setup: one <b>primary</b> takes all writes and streams its change log to <b>2 replicas</b>. Reads are spread across replicas with round robin. Replication lag = <b>' + lag + '</b> tick' + (lag === 1 ? '' : 's') + '.', parts: [G('Primary + read replicas', nodes(), edges, { P: 'sel' }, {}, { P: 'writes only here' }), tbl(0)] });
        var events = [
          { t: 1, k: 'read', u: 'asha' }, { t: 2, k: 'write', v: 'Asha K' }, { t: 3, k: 'read', u: 'asha' }, { t: 4, k: 'read', u: 'asha' },
          { t: 5, k: 'note' }, { t: 6, k: 'write', v: 'Asha Kumar', ryw: true }, { t: 7, k: 'read', u: 'asha', ryw: true }, { t: 7, k: 'read', u: 'ben', ryw: true }, { t: 7 + lag, k: 'catch' }
        ];
        var rywOn = false, lastWrite = -99;
        events.forEach(function (ev) {
          var t = ev.t;
          if (ev.k === 'write') {
            writes.push({ t: t, v: ev.v }); lastWrite = t; if (ev.ryw) rywOn = true;
            frames.push({ narr: 't=' + t + ': Asha saves her name as <b>"' + ev.v + '"</b>. The write goes to the <b>primary</b>, which commits and replies "OK" right away (asynchronous replication). Replicas will get it at t=' + (t + lag) + '.', parts: [
              G('Write path', nodes(), edges, { P: 'ok', A: 'cur' }, { 'U-A': 'cur', 'A-P': 'ok', 'P-R1': 'cur', 'P-R2': 'cur' }, { P: 'UPDATE users …' }), tbl(t, 0)] });
          } else if (ev.k === 'read') {
            var target, why;
            if (rywOn && ev.u === 'asha' && t - lastWrite < lag + 3) { target = 'P'; why = 'Read-your-writes is ON: Asha wrote ' + (t - lastWrite) + ' tick(s) ago, so <b>her</b> reads go to the primary.'; }
            else { target = rr % 2 === 0 ? 'R1' : 'R2'; rr++; replicaReads++; why = 'Read routed round-robin to <b>' + (target === 'R1' ? 'Replica 1' : 'Replica 2') + '</b>.'; }
            var got = valAt(target, t), fresh = valAt('P', t), stale = got !== fresh;
            if (stale) staleCount++;
            var hl = {}; hl[target] = stale ? 'bad' : 'ok';
            var eh = { 'U-A': 'cur' }; eh['A-' + target] = stale ? 'bad' : 'ok';
            frames.push({ narr: 't=' + t + ': <b>' + ev.u + '</b> loads the profile. ' + why + ' It returns <b>"' + got + '"</b>. ' + (stale
              ? (ev.u === 'asha' ? '<span class="c-r">STALE! Asha just saved "' + fresh + '" and sees her old name — "did my save fail?"</span>' : '<span class="c-y">Slightly stale, but Ben never saw the new value, so he cannot tell. Usually acceptable.</span>')
              : '<span class="c-g">Fresh.</span>'), parts: [
              G('Read path', nodes(), edges, hl, eh, (function () { var tg = {}; tg[target] = '→ "' + got + '"'; return tg; })()),
              tbl(t, target === 'P' ? 0 : (target === 'R1' ? 1 : 2)),
              V('Counters', { 'reads on replicas': replicaReads, 'stale reads': staleCount, 'lag (ticks)': lag }, { 'stale reads': staleCount ? 'bad' : '' })] });
          } else if (ev.k === 'note') {
            frames.push({ narr: (staleCount ? 'Asha hit a stale read because replication is asynchronous.' : 'With lag 0 no read was stale — but real lag is never guaranteed to be 0.') + ' <b>Fix: read-your-writes.</b> After a user writes, route <i>that user\'s</i> reads to the primary for a short window (longer than typical lag). Everyone else keeps using replicas.', parts: [
              { type: 'code', label: 'Routing rule', lang: 'java', code: 'if (now - lastWriteAt(user) < WINDOW)\n    return primary;      // read-your-writes\nreturn nextReplica();    // round robin', hl: { 1: 'cur', 2: 'ok' } },
              tbl(t)] });
          } else {
            frames.push({ narr: 't=' + t + ': replicas have replayed the log and <b>caught up</b> — this is <b>eventual consistency</b>: stop writing and all copies converge. Replicas absorbed most reads, so the primary\'s CPU is free for writes.', parts: [
              G('Caught up', nodes(), edges, { P: 'ok', R1: 'ok', R2: 'ok' }, { 'P-R1': 'ok', 'P-R2': 'ok' }), tbl(t),
              V('Totals', { 'reads served by replicas': replicaReads, 'stale reads seen by the writer': staleCount, 'writes handled by primary': writes.length - 1 })] });
          }
        });
        frames.push({ narr: '<b>Failover bonus:</b> if the primary dies, a replica can be <b>promoted</b> to become the new primary. With async replication the last few writes not yet copied can be lost — that is why critical systems keep at least one <b>synchronous</b> standby.', parts: [
          G('Primary failure', nodes(), [['U', 'A'], ['A', 'R1', 'writes + reads'], ['A', 'R2'], ['R1', 'R2', 'log']], { P: 'bad', R1: 'sel' }, { 'A-R1': 'ok' }, { P: 'crashed', R1: 'promoted' })] });
        return frames;
      }
    },
    examples: [
      { title: 'Read/write math for a news site', html: `<p>Peak 20,000 queries/s, 95% reads. One primary can do ~8,000 queries/s comfortably.</p>
        ${H.table(['Setup', 'Primary load', 'Each replica'], [
          ['No replicas', H.c('r', '20,000 q/s (overloaded)'), '–'],
          ['3 replicas', '1,000 writes/s', '~6,333 reads/s'],
          ['4 replicas', '1,000 writes/s', H.c('g', '4,750 reads/s')]
        ])}<p>Writes (1,000/s) are replayed on every replica too, so replicas need similar hardware to the primary.</p>` },
      { title: 'The reporting replica', html: `<p>Finance runs a 3-minute <code>SELECT … GROUP BY</code> across 2 years of orders every hour. On the primary it hogs CPU and I/O and checkout gets slow. Route analytics to a <b>dedicated replica</b> that serves no user traffic — slow reports cannot hurt checkout, and slightly old data is fine for reports. (At larger scale this becomes a data warehouse, HLD 13.)</p>` },
      { title: 'Read-your-writes three ways', html: `<ol><li><b>Time window:</b> after a user writes, read from primary for N seconds (simple; N must exceed typical lag).</li>
        <li><b>Track position:</b> remember the primary's log position (LSN/GTID) of the user's last write; read from a replica only if it has replayed past it.</li>
        <li><b>Return the new data:</b> the write API returns the saved object, so the UI shows it without re-reading.</li></ol>
        <p>Most apps combine 1 or 3 with "always read money/auth from the primary".</p>` },
      { title: 'Lag spike during a migration', html: `<p>A big <code>UPDATE</code> touching 50M rows runs on the primary. Replicas must replay it too and fall <b>minutes</b> behind. Users see stale data everywhere. ${H.c('g', 'Fix:')} batch large updates (e.g. 10k rows at a time), monitor replica lag (alert at a few seconds), and have the router stop sending reads to a replica whose lag exceeds a threshold.</p>` }
    ],
    deepDive: `<p><b>Sync vs async replication:</b> with <b>synchronous</b> replication the primary waits for a replica to confirm before acknowledging the write — no data loss on failover but higher write latency, and writes stall if that replica is slow. <b>Asynchronous</b> is fast but a failover can lose the last writes. <b>Semi-synchronous</b> (MySQL) / <code>synchronous_standby_names</code> with quorum (PostgreSQL) waits for at least one of several replicas — the common production middle ground.</p>
      <p><b>Consistency anomalies beyond stale reads:</b> <i>monotonic reads</i> — a user hits a fresh replica then a laggier one and sees data "go back in time" (fix: pin a user's reads to one replica for a session). <i>Consistent prefix</i> — seeing an answer before its question when different rows arrive in different orders (relevant once data is sharded). These are previewed here and formalised in HLD 10.</p>
      <p><b>How lag is measured:</b> PostgreSQL exposes <code>pg_stat_replication</code> (write/flush/replay lag); MySQL shows <code>Seconds_Behind_Source</code>. Proxies like ProxySQL, PgBouncer-based setups, cloud "reader endpoints" (Aurora, Cloud SQL, Azure) and drivers with read/write splitting can route automatically and avoid lagging replicas.</p>
      <p><b>Replicas are also your disaster tools:</b> a replica in another zone is a hot standby for failover; a <b>delayed replica</b> (e.g. 1 hour behind on purpose) can save you from an accidental <code>DROP TABLE</code>. But a replica is <b>not a backup</b> — a bad delete replicates instantly. Keep point-in-time backups too.</p>
      <p><b>Limits:</b> each replica adds load on the primary to ship the log, and each must replay all writes; past ~5–15 replicas teams use cascading replication or caches instead. And replicas do nothing for write throughput or dataset size — that is sharding.</p>`,
    aiEra: `<p><b>What AI changes:</b> query analysers and AI copilots for databases can classify queries (read vs write, fresh vs tolerant), suggest which can move to replicas, and spot N+1 queries that are better fixed than scaled. AI-driven anomaly detection catches replica-lag spikes early.</p>
      <p><b>AI systems use the same idea:</b> a vector database for retrieval (RAG) usually has one write path for ingesting embeddings and many read replicas for similarity search, because queries vastly outnumber document updates. And the same stale-read trap appears: a user uploads a document and immediately asks about it, but the replica's index has not caught up — read-your-writes again.</p>
      <p><b>Use AI as a partner:</b> <code>Here are our top 20 queries by total time; mark which can tolerate a few seconds of staleness and which must hit the primary</code>. <b>Where AI goes wrong:</b> it suggests replicas for write-heavy workloads, ignores lag in correctness reasoning, and calls a replica a backup. <b>What you must own:</b> deciding which reads must be fresh — that is a product decision, not a database setting.</p>`,
    problems: [{
      title: 'Database at 90% CPU, 95% of Queries Are Reads',
      level: 'Medium', tags: ['read replicas', 'replication lag', 'read-your-writes'], companies: ['LinkedIn', 'Airbnb', 'Booking.com'],
      statement: `<p>A travel review site has 8 stateless app servers and one PostgreSQL primary at <b>90% CPU</b> during evening peaks. Query mix: 95% reads (hotel pages, reviews, search filters), 5% writes (new reviews, bookings, profile edits). Users who post a review must see it immediately; booking confirmations must never show stale data. Design the read-scaling plan.</p>`,
      constraints: `Peak 12,000 queries/s; one DB box comfortably handles ~5,000 q/s; typical replica lag 50–500 ms, occasionally 5 s during batch jobs.`,
      example: `<p>11,400 reads/s ÷ ~4,000 per replica (leaving headroom) ≈ ${H.c('g', '3 replicas')}, primary keeps 600 writes/s + must-be-fresh reads. A user who posts a review and refreshes must hit ${H.c('b', 'the primary')} for that read.</p>`,
      brute: { why: `<p>Naive plan A: "add more app servers" — the DB is the bottleneck, so more app servers just send more queries to the same overloaded primary. Naive plan B: "add replicas and send <b>all</b> reads there" — CPU drops, but users who just posted a review do not see it, and booking pages can show "pending" after payment succeeded, causing duplicate bookings and support tickets.</p>` },
      mcq: { q: 'Which reads should still go to the primary?', options: ['A user\'s reads right after their own write, and booking/payment status', 'All hotel page reads', 'Nothing — replicas are always up to date'], answer: 0, explain: 'Freshness-critical reads (read-your-writes, money/booking state) go to the primary; everything else tolerates sub-second staleness.' },
      hints: [`<p>Compute reads/s and how many replicas that needs at a safe utilisation.</p>`, `<p>Classify reads: tolerant (hotel pages, search) vs must-be-fresh (my own new review, booking status).</p>`, `<p>Recipe: router with write → primary; fresh-class reads + reads within N s of the user's last write → primary; others → replicas by least connections; eject replicas whose lag &gt; 2 s.</p>`],
      solution: {
        approach: `<p><b>Capacity:</b> 12,000 q/s × 95% = 11,400 reads/s. At ~4,000 reads/s per replica (80% of capacity) → 3 replicas; run <b>4</b> so one can fail or be patched (N+1). The primary keeps 600 writes/s plus a small share of fresh reads → well under 50% CPU.</p>
          <p><b>Routing (in the data-access layer or a proxy):</b> writes → primary. Reads are tagged: <i>tolerant</i> (hotel pages, reviews list, search) → replicas via least connections; <i>fresh</i> (booking and payment status, account settings) → primary. <b>Read-your-writes:</b> when a user writes, store <code>last_write_at</code> in their session; for 5 seconds after, their reads go to the primary. The review-post API also returns the created review so the UI shows it instantly.</p>
          <p><b>Lag safety:</b> monitor replay lag per replica; the router stops sending reads to any replica more than 2 s behind (falls back to others or the primary). Batch jobs are chunked to avoid lag spikes; heavy reporting moves to a separate reporting replica.</p>
          <p><b>Availability bonus:</b> put one replica in another zone as a synchronous (or semi-sync) standby that can be promoted if the primary fails.</p>
          <p><b>Next steps if growth continues:</b> a cache (Redis) for hot hotel pages cuts replica load further (HLD 6); if writes become the bottleneck, consider sharding (HLD 5).</p>`,
        complexity: `<p>Replicas needed = ⌈reads ÷ per-replica budget⌉ + 1 = ⌈11,400 ÷ 4,000⌉ + 1 = 4. Each replica also replays all 600 writes/s.</p>`,
        followUps: ['How would you implement read-your-writes across a stateless fleet without sticky sessions?', 'A replica falls 10 minutes behind — what should the system do automatically?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 7 — The Scaling Journey: 100 → 10M users
     ===================================================================== */
  function stageOf(users) {
    if (users <= 1000) return 1;
    if (users <= 10000) return 2;
    if (users <= 100000) return 3;
    if (users <= 1000000) return 4;
    if (users <= 10000000) return 5;
    return 6;
  }
  var STAGE_NAME = { 1: 'One box does everything', 2: 'Separate the database', 3: 'Load balancer + stateless app fleet', 4: 'Cache, read replicas, CDN', 5: 'Autoscaling, multi-AZ, async queues', 6: 'Multi-region + sharding' };
  function stageGraph(st, apps, reps, bad) {
    var n, e, hl = {}, tags = {};
    if (st === 1) { n = [B('U', 'Users', 12, 30), B('S', 'Web + App + DB (1 VM)', 58, 30)]; e = [['U', 'S']]; hl.S = 'ok'; }
    else if (st === 2) { n = [B('U', 'Users', 8, 30), B('A', 'App server (bigger VM)', 42, 30), B('D', 'Database (own VM)', 82, 30)]; e = [['U', 'A'], ['A', 'D']]; hl.D = 'ok'; }
    else if (st === 3) {
      n = [B('U', 'Users', 6, 30), B('LB', 'Load Balancer', 25, 30), B('A1', 'App 1', 48, 12), B('A2', 'App 2…' + apps, 48, 48), B('R', 'Redis sessions', 80, 8), B('P', 'DB primary', 80, 30), B('SB', 'DB standby', 80, 52)];
      e = [['U', 'LB'], ['LB', 'A1'], ['LB', 'A2'], ['A1', 'R'], ['A1', 'P'], ['A2', 'P'], ['P', 'SB', 'sync']];
      hl.LB = 'ok'; hl.A2 = 'ok'; hl.R = 'ok'; hl.SB = 'ok'; tags.A2 = apps + ' stateless servers';
    } else if (st === 4) {
      n = [B('U', 'Users', 6, 34), B('CDN', 'CDN (static)', 26, 8), B('LB', 'Load Balancer', 26, 34), B('A1', 'App 1', 50, 20), B('A2', 'App 2…' + apps, 50, 50), B('C', 'Redis cache', 80, 6), B('P', 'DB primary', 80, 28), B('RR', reps + ' read replicas', 80, 52)];
      e = [['U', 'CDN'], ['U', 'LB'], ['LB', 'A1'], ['LB', 'A2'], ['A1', 'C'], ['A1', 'P'], ['A2', 'RR'], ['P', 'RR', 'repl']];
      hl.CDN = 'ok'; hl.C = 'ok'; hl.RR = 'ok'; tags.A2 = apps + ' servers';
    } else if (st === 5) {
      n = [B('U', 'Users', 6, 30), B('CDN', 'CDN', 24, 8), B('LB', 'LB (multi-AZ)', 24, 30), B('A', 'App fleet ×' + apps, 50, 30), B('Q', 'Queue', 50, 54), B('W', 'Workers', 22, 54), B('C', 'Cache cluster', 80, 8), B('P', 'DB primary', 80, 30), B('RR', reps + ' replicas', 80, 52)];
      e = [['U', 'CDN'], ['U', 'LB'], ['LB', 'A'], ['A', 'C'], ['A', 'P'], ['A', 'RR'], ['P', 'RR'], ['A', 'Q', 'jobs'], ['Q', 'W']];
      hl.A = 'ok'; hl.Q = 'ok'; hl.W = 'ok'; tags.A = 'autoscaling 2–3 AZs';
    } else {
      n = [B('U', 'Users worldwide', 8, 30), B('G', 'Geo DNS', 28, 30), B('RA', 'Region A: LB + apps', 55, 10), B('RB', 'Region B: LB + apps', 55, 50), B('DA', 'Shards (A)', 88, 10), B('DB2', 'Shards (B)', 88, 50)];
      e = [['U', 'G'], ['G', 'RA'], ['G', 'RB'], ['RA', 'DA'], ['RB', 'DB2'], ['DA', 'DB2', 'replicate']];
      hl.G = 'ok'; hl.RA = 'ok'; hl.RB = 'ok'; hl.DA = 'ok'; hl.DB2 = 'ok';
    }
    if (bad) bad.forEach(function (b) { hl[b[0]] = 'bad'; tags[b[0]] = b[1]; });
    return G('Stage ' + st + ': ' + STAGE_NAME[st], n, e, hl, {}, tags, 60);
  }
  var PAIN = {
    2: [['S', 'CPU 95%: app & DB fight']],
    3: [['A', 'maxed out + SPOF']],
    4: [['P', 'CPU 90%, mostly reads']],
    5: [['A2', 'spikes; slow tasks in requests']],
    6: [['P', 'write limit; far from users']]
  };
  var PAIN_TXT = {
    2: 'App and database share one machine: they fight for CPU and RAM, and every deploy restarts the database too.',
    3: 'The single app server is maxed out — and it is a single point of failure. A bigger box only buys a little time.',
    4: 'The database is drowning in reads (the same hot pages over and over), and serving images/JS from app servers wastes bandwidth.',
    5: 'Traffic swings 5× between night and evening, and slow work (emails, image resizing) runs inside user requests, making them slow.',
    6: 'One region is far from users on other continents, and write volume or data size is beyond what one primary can hold.'
  };
  var FIX_TXT = {
    1: 'Start simple: one VM runs web server, app and database. Cheap, easy to debug. Take backups!',
    2: 'Move the database to its own machine (or a managed DB). Each can now be sized and tuned on its own — usually scale the DB <b>up</b>.',
    3: 'Make the app <b>stateless</b> (sessions → Redis), put a <b>load balancer</b> in front of N+1 app servers, and add a DB <b>standby</b> for failover.',
    4: 'Add a <b>cache</b> for hot data, <b>read replicas</b> for the remaining reads, and a <b>CDN</b> for images, CSS and JS.',
    5: '<b>Autoscale</b> the app fleet across 2–3 availability zones, move slow work to a <b>queue + workers</b>, add replicas, split out heavy services if needed.',
    6: '<b>Multi-region</b> deployment with geo-DNS routing, and <b>shard</b> the data so writes spread over many primaries (HLD 5, 7).'
  };

  topics.push({
    title: 'The Scaling Journey: From 100 to 10 Million Users',
    analogy: `<p>A home baker sells cakes from her kitchen (100 customers). Demand grows, so she rents a small shop and moves the oven out of her kitchen (separate the database). Then she hires several bakers who all follow the same recipe book (stateless servers) with a manager handing out orders (load balancer). Then she pre-bakes the best sellers each morning (cache) and opens counters in other neighbourhoods that sell the same cakes (replicas, CDN). Finally she opens factories in other cities (regions) and splits the menu between them (sharding).</p>
      <p>She never built the factory on day one. <b>Each step was forced by a real bottleneck.</b> That is the scaling journey.</p>`,
    explain: `<p>"Scale this app from 100 to 10 million users" is one of the most common system design warm-ups. The interviewer wants to see that you evolve the design <b>step by step, driven by bottlenecks</b>, not jump straight to a giant diagram.</p>
      <h4>First, turn users into requests per second</h4>
      <p>Assume each daily active user makes ~50 requests per day and peak traffic is ~3× the average:</p>
      ${H.table(['Daily users', 'Avg req/s (users × 50 ÷ 86,400)', 'Peak req/s (×3)'], [
        ['100', '0.06', '~0.2'], ['10,000', '~6', '~17'], ['100,000', '~58', '~170'], ['1,000,000', '~580', '~1,700'], ['10,000,000', H.c('b', '~5,800'), H.c('b', '~17,000')]
      ])}
      <p>Notice: even 10M daily users is "only" ~17k requests/second at peak. That is very achievable with the ideas in this module. (HLD 3 teaches this estimation properly.)</p>
      <h4>The stages</h4>
      ${H.table(['Users', 'Stage', 'Bottleneck that forces the next step'], [
        ['~100–1k', '1. One box: app + DB together', 'App and DB fight for resources'],
        ['~10k', '2. Separate DB server; scale both up', 'Single app server maxed out, and it is a SPOF'],
        ['~100k', '3. LB + 2+ stateless app servers + session store + DB standby', 'DB overloaded by reads; static files'],
        ['~1M', '4. Cache + read replicas + CDN', 'Daily spikes; slow tasks inside requests; zone failures'],
        ['~10M', '5. Autoscaling, multi-AZ, queues + workers, more replicas', 'Write volume, global latency'],
        ['10M+', '6. Multi-region, sharding, service split', '—']
      ])}
      <p>The numbers on the left are rough — a video app hits stage 4 much earlier than a to-do app. What matters is the <b>reason</b> for each step. In an interview, say the bottleneck out loud: "<i>At this point the database CPU is the limit and 90% of queries are reads, so I add a cache and read replicas.</i>"</p>
      <p>And always measure: <b>monitor first</b> (CPU, memory, p99 latency, DB query time, error rate), then scale the tier that is actually hurting.</p>`,
    clues: [
      '"Scale this app from 100 to 10M users" → evolve stage by stage, naming the bottleneck each time',
      '"Start with a single server" → the interviewer expects you to evolve it, not to over-design it',
      '"Traffic doubled overnight" → which tier hurts first? Measure, then scale that tier',
      '"Read-heavy and global" → cache + replicas + CDN, later multi-region',
      '"Startup with 3 engineers" → managed services and the simplest stage that works',
      '"10M daily users" → ~17k peak rps: horizontal app tier, replicas, cache — sharding maybe later'
    ],
    code: { lang: 'python', run: true, title: 'Users → requests/second → which stage (runnable)', code: `import math

REQ_PER_USER_PER_DAY = 50      # assumption: say it out loud in an interview
PEAK_FACTOR = 3                # busiest hour vs daily average
SERVER_RPS = 2_000             # measured capacity of one app server
TARGET_UTIL = 0.7              # leave headroom

def stage(users):
    for limit, name in [(1_000, "1 one box"), (10_000, "2 separate DB"),
                        (100_000, "3 LB + stateless apps"), (1_000_000, "4 cache + replicas + CDN"),
                        (10_000_000, "5 autoscale + multi-AZ + queues")]:
        if users <= limit:
            return name
    return "6 multi-region + sharding"

print(f"{'users':>12} {'avg rps':>9} {'peak rps':>9} {'app servers':>12}  stage")
for users in [100, 10_000, 100_000, 1_000_000, 10_000_000, 50_000_000]:
    avg = users * REQ_PER_USER_PER_DAY / 86_400
    peak = avg * PEAK_FACTOR
    servers = max(1, math.ceil(peak / (SERVER_RPS * TARGET_UTIL))) + (1 if users > 10_000 else 0)
    print(f"{users:>12,} {avg:>9,.1f} {peak:>9,.0f} {servers:>12}  {stage(users)}")
` },
    viz: {
      title: 'Grow the app: single server → load balancer → replicas → regions',
      input: '100 10000 100000 1000000 10000000 50000000',
      inputLabel: 'Daily active users at each milestone (ascending, max 8 values)',
      gen: function (input) {
        var us = String(input || '').trim().split(/[\s,]+/).filter(Boolean).map(Number);
        if (!us.length || us.some(function (x) { return !(x >= 1); })) throw new Error('Enter user counts like: 100 10000 1000000');
        if (us.length > 8) throw new Error('At most 8 milestones');
        if (us.some(function (x) { return x > 1e10; })) throw new Error('Keep it under 10 billion users');
        for (var i = 1; i < us.length; i++) if (us[i] < us[i - 1]) throw new Error('Milestones must be in ascending order');
        var frames = [], prev = 0, rows = [];
        frames.push({ narr: 'We will grow one app through each milestone. Assumptions: <b>50 requests per user per day</b>, peak = 3× average, one app server handles 2,000 req/s and we run it at 70%. Each new stage is triggered by a <b>specific bottleneck</b>.', parts: [
          { type: 'array', label: 'milestones (daily users)', values: us.map(fmt) },
          V('Assumptions', { 'req/user/day': 50, 'peak factor': 3, 'server capacity': '2,000 rps', 'target util': '70%' })
        ] });
        us.forEach(function (u, idx) {
          var st = stageOf(u), avg = u * 50 / 86400, peak = avg * 3;
          var apps = st >= 3 ? Math.ceil(peak / 1400) + 1 : 1; if (st >= 3 && apps < 2) apps = 2;
          var reps = st === 4 ? 2 : (st >= 5 ? Math.max(3, Math.ceil(peak * 0.9 * 0.2 / 4000)) : 0);
          if (prev && st > prev) {
            for (var s = prev + 1; s <= st; s++) {
              frames.push({ narr: '<b>' + fmt(u) + ' users — pain point.</b> ' + PAIN_TXT[s], parts: [stageGraph(s - 1, Math.max(2, apps), Math.max(2, reps), PAIN[s]), V('Load now', { 'daily users': fmt(u), 'peak req/s': fmt(peak) }, { 'peak req/s': 'bad' })] });
              frames.push({ narr: '<b>Fix → Stage ' + s + ': ' + STAGE_NAME[s] + '.</b> ' + FIX_TXT[s], parts: [stageGraph(s, apps, reps), V('Sizing', { 'daily users': fmt(u), 'avg req/s': avg < 10 ? avg.toFixed(1) : fmt(avg), 'peak req/s': fmt(peak), 'app servers': apps, 'read replicas': reps }, { 'app servers': 'ok' })] });
            }
          } else {
            frames.push({ narr: '<b>' + fmt(u) + ' daily users</b> (peak ≈ ' + (peak < 10 ? peak.toFixed(1) : fmt(peak)) + ' req/s). ' + (idx === 0 ? FIX_TXT[st] : 'Still fine at Stage ' + st + ' — just add capacity within the same design.') + (st === 1 ? ' Building a 20-server cluster here would be wasted money and complexity.' : ''), parts: [stageGraph(st, apps, reps), V('Sizing', { 'daily users': fmt(u), 'avg req/s': avg < 10 ? avg.toFixed(2) : fmt(avg), 'peak req/s': peak < 10 ? peak.toFixed(1) : fmt(peak), 'app servers': apps, 'read replicas': reps })] });
          }
          rows.push([fmt(u), fmt(Math.max(1, peak)), st + ': ' + STAGE_NAME[st], apps]);
          prev = st;
        });
        frames.push({ narr: '<b>The journey at a glance.</b> Each row added only what the bottleneck demanded. In an interview, narrate it exactly like this: numbers → bottleneck → fix → new bottleneck.', parts: [
          { type: 'table', label: 'Milestones', columns: ['daily users', 'peak req/s', 'stage', 'app servers'], rows: rows, hl: (function () { var h = {}; h[rows.length - 1] = 'sel'; return h; })() },
          { type: 'bars', label: 'Peak req/s per milestone', values: us.map(function (u) { return Math.round(u * 50 / 86400 * 3); }), idxLabels: us.map(fmt) }
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'Stage 1 → 2: the 2 a.m. outage', html: `<p>A startup runs Django + PostgreSQL on one VM. A memory-hungry import job makes the OS kill the database process. Splitting the DB to its own machine (or a managed database) means app bugs can no longer kill the data tier, and each can be sized separately — the DB gets lots of RAM, the app gets CPU.</p>` },
      { title: 'Stage 3: the first load balancer', html: `<p>At ~100k users, the single app server is at 80% CPU every evening and every deploy is a minute of downtime. Steps: move sessions to Redis, move uploads to S3, put 3 app servers behind a managed LB with health checks. Bonus: <b>rolling deploys</b> — update one server at a time while the others serve, so deploys have zero downtime.</p>` },
      { title: 'Stage 4: one cache line saved the database', html: `<p>At ~1M users, 70% of DB time goes to the same 1,000 popular product pages. Caching each page's data in Redis for 60 s cuts DB reads by ~10×. Read replicas take most of what is left; the CDN serves images from servers near users. Order matters: <b>cache first</b> (cheapest win), then replicas.</p>` },
      { title: 'Stage 5: the queue that made checkout fast', html: `<p>Checkout took 2.5 s because it sent the email, generated the PDF invoice and called the analytics API inside the request. Now checkout writes the order, puts an <code>OrderPlaced</code> message on a queue and returns in 200 ms; workers send emails and invoices in the background, retrying failures. Workers scale independently by queue length.</p>` }
    ],
    deepDive: `<p><b>Order of operations matters.</b> The cheapest wins usually come first: add indexes and fix slow queries (free), add caching (cheap, huge gains for read-heavy apps), then replicas, then horizontal app scaling, and only much later sharding and multi-region (expensive, permanent complexity). Many companies serve tens of millions of users from one primary database + replicas + cache.</p>
      <p><b>Managed services shift the stages.</b> In 2026 a small team can start at "stage 3–4 quality" by using a managed database with a standby and read replicas, a managed cache, a serverless or container platform that autoscales, and a CDN — without operating any of it. The concepts are the same; the work is configuration rather than building.</p>
      <p><b>What breaks at each order of magnitude</b> (a useful mental model): 10× more users is usually fine with more of the same; 100× usually needs a new component (cache, queue, replicas); 1000× often needs a new <i>data</i> architecture (sharding, denormalisation, async pipelines). Plan one order of magnitude ahead, not three.</p>
      <p><b>Organisational scaling</b> runs in parallel: at some point one codebase with 100 engineers deploys too slowly, and teams split it into services. That is about people and deploy independence, not raw traffic — a monolith can scale technically much further than people think.</p>
      <p><b>Cost awareness:</b> each stage costs money every month. Autoscaling down at night, right-sizing instances, reserved/committed-use pricing and caching often save more than any clever architecture. Interviewers at senior levels like hearing cost trade-offs.</p>`,
    aiEra: `<p><b>What AI changes:</b> an AI assistant can draft a full "100 → 10M" evolution in seconds — which is exactly why interviewers now probe the <b>why</b>: "why a cache before replicas?", "what metric told you to add the queue?", "what does this cost per month?". Generated diagrams that jump straight to Kafka, Kubernetes and five microservices are a red flag.</p>
      <p><b>AI features change the scaling curve:</b> an LLM-powered feature can turn a cheap 20 ms request into a 2–10 s request costing real money per call. Scaling such an app means queueing and streaming responses, caching repeated prompts and embeddings, routing simple requests to small models, and rate limiting per user — the same stage-by-stage thinking, with a GPU bill attached.</p>
      <p><b>Use AI as a partner:</b> <code>Act as an interviewer: I will propose a design for each milestone from 100 to 10M users; challenge each step with "what is the bottleneck?" and "what does it cost?"</code>. <b>Where AI goes wrong:</b> it over-engineers early stages and assumes huge request rates without doing the math. <b>What you must own:</b> the numbers, the bottleneck story, and saying "not yet".</p>`,
    problems: [{
      title: 'Scale This App from 100 to 10 Million Users',
      level: 'Hard', tags: ['scaling', 'load balancer', 'cache', 'read replicas', 'cdn', 'queues'], companies: ['Amazon', 'Google', 'Meta', 'Microsoft'],
      statement: `<p>You built a recipe-sharing app: users browse recipes (with photos), search, save favourites and post new recipes. Today it runs on <b>one VM</b> (app + PostgreSQL + uploaded photos on disk) with 100 daily users. Describe how the architecture evolves as it grows to <b>10,000</b>, <b>1 million</b> and <b>10 million</b> daily users. For each step state the bottleneck, the change, and a rough size.</p>`,
      constraints: `Read:write ≈ 50:1; average 50 requests/user/day; photos average 500 KB; 99.9% availability expected from 1M users on.`,
      example: `<p>10M users × 50 ÷ 86,400 ≈ ${H.c('b', '5,800 avg rps')}, ≈ ${H.c('b', '17,000 peak rps')}. At 1,400 usable rps per app server → ~13 servers + spare. Reads ≈ 98% of requests → caching and replicas carry most of the load.</p>`,
      brute: { why: `<p><b>Naive design 1 — "just buy a bigger VM":</b> works until ~10k users, then hits the single-machine ceiling, and the whole app (including photos on its disk) dies with that one machine. <b>Naive design 2 — "microservices + Kubernetes + Kafka + sharded DB from day one":</b> months of work and big bills for 100 users, slower feature development, and more ways to fail. Both ignore the core idea: change the design when a measured bottleneck forces it.</p>` },
      mcq: { q: 'At 1M users the database is at 85% CPU, mostly from repeated recipe-page reads. First move?', options: ['Add a cache for hot recipe data (then replicas)', 'Shard the database by user id', 'Add more app servers'], answer: 0, explain: 'Repeated reads of the same hot data are exactly what a cache removes cheaply. Sharding is for write/size limits; more app servers only add DB load.' },
      hints: [`<p>Convert each milestone to peak requests/second first; that tells you which tier hurts.</p>`, `<p>Order: separate DB → stateless + LB → photos to object storage + CDN → cache → read replicas → autoscaling + queues → (maybe) sharding.</p>`, `<p>For each step say: bottleneck → change → size (servers, replicas) → what new problem appears.</p>`],
      solution: {
        approach: `<p><b>100 users (peak ~0.2 rps):</b> one VM is perfect. Add automated backups and monitoring. Nothing else.</p>
          <p><b>10,000 users (peak ~17 rps):</b> bottleneck is not raw load but fragility — app and DB share a box and photos live on its disk. Move PostgreSQL to a managed instance (automated backups, a standby), move photos to <b>object storage</b> served via a <b>CDN</b>. The app VM is now disposable.</p>
          <p><b>~100,000 users (peak ~170 rps):</b> one app server is a SPOF and deploys cause downtime. Make the app <b>stateless</b> (sessions in Redis or signed tokens), run <b>3 app servers</b> (N+1) behind a <b>load balancer</b> with health checks; rolling deploys.</p>
          <p><b>1 million users (peak ~1,700 rps, ~98% reads):</b> DB CPU climbs from repeated recipe and search reads. Add a <b>Redis cache</b> for recipe pages and popular lists (cache-aside, TTL 1–5 min), then <b>2 read replicas</b> for remaining reads with read-your-writes for a user's own posts. App tier: ⌈1700/1400⌉ + 1 = 3, spread across <b>2–3 availability zones</b>; DB primary with a standby in another zone for 99.9%. Search moves to a search engine (e.g. OpenSearch) when SQL LIKE queries get slow.</p>
          <p><b>10 million users (peak ~17,000 rps):</b> app fleet ⌈17000/1400⌉ + 1 ≈ 14 servers with <b>autoscaling</b> (night vs evening traffic). Slow work (image resizing, notification emails, feed updates) goes through a <b>queue + workers</b>. Cache cluster and 3–5 replicas absorb reads; the primary handles ~340 writes/s (2% of 17k) — still fine on one big primary, so <b>no sharding yet</b>. Add rate limiting, observability (metrics, traces), and plan the next step: if writes or data size outgrow one primary, shard (e.g. by user id); if users are global, add a second region.</p>
          <p><b>Narration tip:</b> at every step state the metric that triggered it — that is what interviewers grade.</p>`,
        complexity: `<p>Peak rps = users × 50 ÷ 86,400 × 3. App servers = ⌈peak ÷ 1,400⌉ + 1. Photo storage at 10M users: if 2% post one recipe/month with 3 photos → 600k photos/month × 0.5 MB ≈ 300 GB/month — object storage handles that easily.</p>`,
        followUps: ['Which single metric would you watch to decide each step?', 'What changes if the app becomes popular in Europe and Asia at once?', 'Where would you add the first rate limiter?']
      }
    }]
  });

  /* =====================================================================
     PRACTICE — Easy → Medium → Hard
     ===================================================================== */
  practice.push({
    title: 'Spot the Single Points of Failure',
    level: 'Easy', tags: ['SPOF', 'redundancy'], companies: ['Amazon', 'Microsoft'],
    statement: `<p>A diagram shows: <b>Users → DNS (managed) → 1 load balancer → 3 app servers → 1 MySQL database</b>. App servers also write uploaded files to a <b>single NFS file server</b>. Everything runs in one availability zone. List every single point of failure and one fix for each.</p>`,
    constraints: `Answer with a list; no budget limit given, but prefer the simplest fix.`,
    example: `<p>${H.c('r', 'LB')}, ${H.c('r', 'MySQL')}, ${H.c('r', 'NFS server')}, ${H.c('r', 'the single zone')} are SPOFs. The ${H.c('g', '3 app servers')} are not (losing one is fine), and managed DNS is already redundant.</p>`,
    brute: { why: `<p>Answering only "the database" misses half the picture. Another common miss: calling the 3 app servers a SPOF (they are redundant) while ignoring the NFS server and the single zone, which can take everything down together.</p>` },
    mcq: { q: 'Which component is NOT a SPOF here?', options: ['The app tier (3 servers)', 'The load balancer', 'The NFS file server', 'The availability zone'], answer: 0, explain: 'With 3 app servers behind health checks, one failure only reduces capacity.' },
    hints: [`<p>Walk one request through the diagram and ask "if this disappears, do requests still succeed?"</p>`, `<p>Do not forget shared storage and the physical location (zone).</p>`, `<p>Fix per SPOF: LB pair or managed LB; MySQL primary + standby with failover; NFS → object storage; spread every tier across 2–3 zones.</p>`],
    solution: {
      approach: `<p><b>SPOFs:</b></p><ul>
        <li><b>Load balancer</b> → use a managed multi-AZ load balancer, or two LBs with a floating IP (keepalived/VRRP).</li>
        <li><b>MySQL</b> → primary + standby (semi-sync replication) with automatic failover (managed multi-AZ DB or an orchestrator), plus point-in-time backups.</li>
        <li><b>NFS file server</b> → replace with object storage (S3/GCS), which is replicated across zones by the provider; serve files via a CDN.</li>
        <li><b>Single availability zone</b> → spread app servers, the LB and the DB standby across 2–3 zones, with enough capacity in the survivors.</li></ul>
        <p><b>Not SPOFs:</b> the app tier (3 stateless servers + health checks) and managed DNS. Also check non-hardware SPOFs: TLS certificates, secrets, one person who can deploy.</p>`,
      complexity: `<p>Each fix roughly doubles that tier's cost (standby/extra zone), but turns a series weak link into a parallel pair.</p>`
    }
  });

  practice.push({
    title: 'Which Server Gets Request #10?',
    level: 'Easy', tags: ['round robin', 'load balancer'], companies: ['Cisco', 'Akamai'],
    statement: `<p>A round-robin load balancer has servers <b>[S1, S2, S3, S4]</b> and starts at S1. (a) Which server receives request #10? (b) After request #10, S3 is marked unhealthy and skipped. Which servers receive requests #11 to #14? (c) How many requests has each server received after #14?</p>`,
    constraints: `Requests numbered from 1; the counter keeps increasing, unhealthy servers are skipped by moving to the next one.`,
    example: `<p>Requests 1–4 → S1 S2 S3 S4, 5–8 → S1 S2 S3 S4, ${H.c('b', '9 → S1, 10 → S2')}.</p>`,
    brute: { why: `<p>Writing out every request by hand works for 14 requests but not for "request #1,000,003". Use the modulo rule: server index = (k − 1) mod N. When servers are skipped, simulate from the point of change.</p>` },
    mcq: { q: 'With 4 servers, request #1,000,003 goes to…', options: ['S3', 'S1', 'S4', 'S2'], answer: 0, explain: '(1,000,003 − 1) mod 4 = 1,000,002 mod 4 = 2 → index 2 = S3.' },
    hints: [`<p>Index = (k − 1) mod 4 with S1 at index 0.</p>`, `<p>After #10 the next counter position is S3, which is unhealthy → skip to S4.</p>`, `<p>Write the cycle without S3: S4, S1, S2, S4, …</p>`],
    solution: {
      approach: `<p><b>(a)</b> (10 − 1) mod 4 = 1 → <b>S2</b>.</p>
        <p><b>(b)</b> The next position after S2 is S3, which is unhealthy, so the balancer skips it: #11 → <b>S4</b>, #12 → <b>S1</b>, #13 → <b>S2</b>, #14 → S3 is skipped again → <b>S4</b>.</p>
        <p><b>(c)</b> After #10: S1 = 3 (1, 5, 9), S2 = 3 (2, 6, 10), S3 = 2 (3, 7), S4 = 2 (4, 8). Then +S4, +S1, +S2, +S4 → <b>S1 = 4, S2 = 4, S3 = 2, S4 = 4</b>. Total 14 ✓. Round robin balances counts, and the healthy servers absorb the dead server's share.</p>`,
      code: { lang: 'python', run: true, code: `servers = ["S1", "S2", "S3", "S4"]
healthy = {s: True for s in servers}
counter, served = 0, {s: 0 for s in servers}

def pick():
    global counter
    for _ in range(len(servers)):          # skip unhealthy, at most one full lap
        s = servers[counter % len(servers)]
        counter += 1
        if healthy[s]:
            return s
    raise RuntimeError("no healthy servers")

for k in range(1, 15):
    if k == 11:
        healthy["S3"] = False               # health check failed after request 10
    s = pick()
    served[s] += 1
    print(k, "->", s)
print(served)
` },
      complexity: `<p>O(1) per pick normally; O(N) worst case when skipping unhealthy servers.</p>`
    }
  });

  practice.push({
    title: 'How Many App Servers Do We Need?',
    level: 'Easy', tags: ['capacity', 'horizontal scaling', 'N+1'], companies: ['Google', 'Uber'],
    statement: `<p>A load test shows one app server handles <b>1,500 requests/second</b> before latency degrades. Peak traffic is <b>12,000 rps</b>. You want each server at most <b>70%</b> busy at peak and to survive <b>one server failure</b>. How many servers? What if you must survive losing an entire availability zone out of 3?</p>`,
    constraints: `Servers are identical and stateless; load is spread evenly.`,
    example: `<p>Usable per server = 1,500 × 0.7 = ${H.c('b', '1,050 rps')}. 12,000 ÷ 1,050 = 11.4 → ${H.c('b', '12')} + 1 spare = ${H.c('g', '13')}.</p>`,
    brute: { why: `<p>Naive: 12,000 ÷ 1,500 = 8 servers. At peak they run at 100% — any spike, GC pause or slow dependency pushes latency through the roof, and losing one server overloads the other 7 (114%).</p>` },
    mcq: { q: 'Why add the "+1"?', options: ['To stay within target when one server dies at peak', 'Because load balancers need an odd number', 'To store sessions'], answer: 0, explain: 'N+1 means losing any single server still leaves enough capacity at the target utilisation.' },
    hints: [`<p>Never size to 100%: compute usable capacity = capacity × target utilisation.</p>`, `<p>Round up, then add spares for the failures you must survive.</p>`, `<p>For zones: the 2 surviving zones must carry all 12,000 rps on their own.</p>`],
    solution: {
      approach: `<p><b>Single-server failure:</b> usable = 1,500 × 0.7 = 1,050 rps. ⌈12,000 ÷ 1,050⌉ = 12, plus 1 spare = <b>13 servers</b>. If one dies, 12 remain, each at 12,000 ÷ 12 = 1,000 rps ≈ 67% of capacity ✓.</p>
        <p><b>Zone failure with 3 zones:</b> the 2 survivors must hold all 12 needed servers → 6 per zone → <b>18 servers</b> total (6 + 6 + 6). Normal day each runs at 12,000 ÷ 18 ≈ 667 rps (44%). With only 2 zones you would need 12 per zone = 24 total — more zones make redundancy cheaper.</p>
        <p>Also: re-run the load test after major releases, since per-server capacity drifts.</p>`,
      complexity: `<p>servers = ⌈peak ÷ (capacity × util)⌉ + spares; zone-safe per zone = ⌈needed ÷ (zones − 1)⌉.</p>`
    }
  });

  practice.push({
    title: 'Scale Up or Scale Out?',
    level: 'Easy', tags: ['vertical scaling', 'horizontal scaling'], companies: ['Infosys', 'TCS', 'Oracle'],
    statement: `<p>For each case, say <b>vertical</b>, <b>horizontal</b>, or <b>both</b>, with one reason: (1) a Redis cache using 95% of its 16 GB RAM, data growing slowly; (2) a stateless image-thumbnail service whose load triples every Friday evening; (3) a legacy app that stores sessions in memory and must handle 2× load next week; (4) a PostgreSQL database at 70% CPU, 60% writes.</p>`,
    constraints: `Prefer the least risky change that solves the problem.`,
    example: `<p>(2) is the textbook ${H.c('g', 'horizontal + autoscaling')} case: stateless and spiky. (3) is ${H.c('y', 'vertical for now')} — scaling out would break the in-memory sessions.</p>`,
    brute: { why: `<p>"Always horizontal" breaks the legacy app (sessions) and is overkill for a slowly growing cache. "Always vertical" fails the Friday spikes (you would pay for a giant box all week) and leaves single points of failure.</p>` },
    mcq: { q: 'Which case is the clearest fit for horizontal scaling?', options: ['The stateless thumbnail service with weekly spikes', 'The legacy app with in-memory sessions', 'The cache that grows slowly'], answer: 0, explain: 'Stateless + spiky = add/remove identical workers automatically.' },
    hints: [`<p>Is the component stateless? Can it be split?</p>`, `<p>Is the growth steady or spiky? Spiky favours elastic horizontal scaling.</p>`, `<p>Databases with many writes: scale up first; replicas do not help writes.</p>`],
    solution: {
      approach: `<p><b>(1) Vertical</b> — move to a larger memory node (e.g. 32 GB); growth is slow. Later, a Redis Cluster (horizontal, sharded) if data keeps growing — plus a replica for availability.</p>
        <p><b>(2) Horizontal</b> — stateless workers behind a load balancer or reading from a queue, with autoscaling and scheduled scale-up before Friday evening.</p>
        <p><b>(3) Vertical now, horizontal next</b> — a bigger box safely handles 2× next week; meanwhile move sessions to Redis so the app can scale out afterwards. (Sticky sessions are an emergency alternative.)</p>
        <p><b>(4) Vertical</b> — more CPU/faster disks for the primary; tune queries and indexes. Read replicas would only help the 40% reads; if writes keep growing, plan batching/queues and eventually sharding.</p>`,
      complexity: `<p>No computation — the skill is matching state, growth pattern and read/write mix to the scaling style.</p>`
    }
  });

  practice.push({
    title: 'Everyone Logged Out After Every Deploy',
    level: 'Medium', tags: ['stateless', 'sessions', 'deploys'], companies: ['Shopify', 'Atlassian'],
    statement: `<p>An app runs on 4 servers with <b>sticky sessions</b> (sessions in memory). Each deploy restarts servers one by one, and users complain they are logged out and lose their carts during every deploy (3 deploys per day). Explain why and redesign so deploys are invisible to users.</p>`,
    constraints: `200k concurrent sessions, ~3 KB each; zero-downtime deploys required; carts must survive.`,
    example: `<p>Server 2 restarts → its ~50k in-memory sessions ${H.c('r', 'vanish')} → those users are re-routed to other servers that never knew them → ${H.c('r', 'logged out, empty cart')}.</p>`,
    brute: { why: `<p>Deploying less often, or deploying at 3 a.m., hides the problem but slows the team and still logs out night users. Copying sessions between servers before restart (session replication in the app server cluster) works for 2–3 nodes but scales badly and adds complex failure modes.</p>` },
    mcq: { q: 'Root cause?', options: ['State lives inside the processes being restarted', 'Round robin is the wrong algorithm', 'The deploy is too fast'], answer: 0, explain: 'Whatever lives in a process dies with the process. Externalise it.' },
    hints: [`<p>Restarting a server = wiping its memory. What lives there?</p>`, `<p>Move sessions and carts to a shared, replicated store; then stickiness is unnecessary.</p>`, `<p>Add graceful shutdown: fail readiness, drain in-flight requests, exit. Migrate by dual-reading old and new session locations for one session lifetime.</p>`],
    solution: {
      approach: `<p><b>Why:</b> sessions and carts live only in each server's RAM, and stickiness pins users to one server. Restarting it destroys their state; the LB moves them to a server that has never seen their session id.</p>
        <p><b>Redesign:</b> (1) store sessions in a replicated Redis (≈ 200k × 3 KB ≈ 600 MB) with TTL; (2) persist carts in Redis hashes or the database (carts are valuable — many shops keep them for days); (3) remove sticky sessions so load is even; (4) graceful shutdown on deploy: mark not-ready → LB stops new requests → wait for in-flight requests (e.g. 30 s) → exit; (5) rolling or blue-green deploy keeps ≥ 3 of 4 servers serving.</p>
        <p><b>Migration with no logout:</b> deploy code that reads the session from Redis first and falls back to local memory, writing every session it touches to Redis. After one session lifetime (e.g. 30 min) all active sessions are in Redis; then remove the fallback and stickiness.</p>`,
      complexity: `<p>One extra ~0.5 ms Redis round trip per request; ~600 MB of Redis memory, replicated.</p>`
    }
  });

  practice.push({
    title: 'Chat Servers: Round Robin or Least Connections?',
    level: 'Medium', tags: ['least connections', 'websockets', 'load balancer'], companies: ['Discord', 'Slack', 'Meta'],
    statement: `<p>A chat service keeps <b>WebSocket</b> connections open for hours. It has 5 servers; after a deploy, servers come back one by one. With round robin, monitoring shows one server with 60k connections and another with 8k. Explain the imbalance and pick an algorithm. What new risk does your choice create, and how do you handle it?</p>`,
    constraints: `300k concurrent connections at peak; each server comfortably holds 80k; clients reconnect automatically.`,
    example: `<p>The first server back after the deploy received ${H.c('r', 'all reconnects')} while it was the only one up — and round robin never moves existing connections, so the imbalance stays for hours.</p>`,
    brute: { why: `<p>Round robin balances <b>new</b> connections evenly but ignores how many each server already holds. Long-lived connections never "finish", so early imbalances (deploys, restarts) persist for hours. Adding servers does not help the overloaded one either.</p>` },
    mcq: { q: 'Best default for long-lived connections?', options: ['Least connections (with slow start)', 'Round robin', 'IP hash'], answer: 0, explain: 'It sends new connections where there are fewest open ones, healing imbalance over time; slow start protects freshly added servers.' },
    hints: [`<p>Round robin assumes each unit of work ends quickly. Do WebSockets?</p>`, `<p>Least connections fixes new placements. What happens to a brand-new server with 0 connections?</p>`, `<p>Protect it with slow start / max-connection caps, and make clients reconnect with random jitter.</p>`],
    solution: {
      approach: `<p><b>Why imbalance:</b> connections are long-lived. During the rolling deploy, clients from restarted servers reconnect to whichever servers are up; the early ones collect huge numbers. Round robin then splits new connections evenly but never corrects existing counts.</p>
        <p><b>Choice: least connections</b> — new connections go to the server with the fewest open ones, so imbalance heals as users reconnect over time.</p>
        <p><b>New risk:</b> a freshly started server with 0 connections attracts <i>every</i> new connection at once (a reconnect storm) and can be overwhelmed while cold. <b>Mitigations:</b> slow start (ramp its weight over 1–2 minutes), a per-server connection cap (e.g. 80k) that the LB respects, readiness only after warm-up, and clients reconnecting with exponential backoff + random jitter so 60k clients do not reconnect in the same second.</p>
        <p><b>Optional rebalancing:</b> servers far above average can gracefully close a small percentage of connections (clients reconnect elsewhere) to converge faster. Messages for a user reach the right server via pub/sub, so it does not matter which server holds the socket.</p>`,
      complexity: `<p>Least-connections pick is O(N) over 5 servers (trivial). Target per server ≈ 300k ÷ 5 = 60k, below the 80k cap, with room for one failure (75k each on 4).</p>`
    }
  });

  practice.push({
    title: 'Stale Profile After Update',
    level: 'Medium', tags: ['read replicas', 'replication lag', 'consistency'], companies: ['LinkedIn', 'Twitter/X'],
    statement: `<p>After adding 3 async read replicas, users report: "I changed my profile photo, the page refreshed, and the old photo is back. Refreshing again shows the new one." Explain the bug and give two fixes, with their trade-offs.</p>`,
    constraints: `Replica lag is usually 100–800 ms; occasionally 5 s. Reads are 97% of traffic.`,
    example: `<p>t=0 write to ${H.c('b', 'primary')}; t=0.2 s refresh reads ${H.c('r', 'replica 2 (lag 0.8 s) → old photo')}; t=1.5 s refresh reads replica 1 → new photo. The data "flickers".</p>`,
    brute: { why: `<p>Sending all reads back to the primary fixes the bug but throws away the replicas — the primary overloads again. Making replication synchronous for all replicas slows every write and stalls writes whenever any replica is slow.</p>` },
    mcq: { q: 'What guarantee does the user expect here?', options: ['Read-your-writes', 'Strong global ordering of all events', 'Nothing — it is fine'], answer: 0, explain: 'A user must see their own writes; other users seeing it a second later is acceptable.' },
    hints: [`<p>Async replication means a replica can be behind right after a write.</p>`, `<p>Only the writing user needs fresh data immediately.</p>`, `<p>Options: route the writer's reads to primary for N seconds; or track the write's log position and use only caught-up replicas; or return the new data from the write.</p>`],
    solution: {
      approach: `<p><b>Bug:</b> asynchronous replication + round-robin reads. The refresh right after the write can land on a replica that has not yet replayed it. Successive refreshes hit different replicas with different lag, so data flickers (also a <i>monotonic reads</i> violation).</p>
        <p><b>Fix 1 — time-window read-your-writes:</b> on write, store <code>last_write_at</code> in the user's session; for ~10 s (above worst normal lag) route that user's reads to the primary. Simple; small extra primary load (only recent writers). Risk: a lag spike longer than the window.</p>
        <p><b>Fix 2 — position-based:</b> after the write, record the primary's log position (LSN/GTID) in the session; route the user's reads only to replicas that have replayed past it (or the primary if none). Precise and robust to lag spikes; more complex, needs lag/position visibility in the router.</p>
        <p><b>Also:</b> return the new photo URL in the write response so the UI updates instantly; pin a user's reads to one replica per session to avoid flicker; and since profile photos are cached by the CDN, use a new file name (versioned URL) per upload instead of overwriting.</p>`,
      complexity: `<p>Extra primary reads ≈ (writes/s × reads per user in the window) — tiny compared with 97% read traffic.</p>`
    }
  });

  practice.push({
    title: 'Mixed Fleet: Old and New Servers',
    level: 'Medium', tags: ['weighted round robin', 'load balancer', 'capacity'], companies: ['Netflix', 'Walmart'],
    statement: `<p>Your pool has 6 old servers (each handles 1,000 rps) and you add 3 new servers (each handles 3,000 rps). Peak load is 9,000 rps. With plain round robin, what happens? Choose weights so every server runs at the same utilisation, and compute that utilisation. How should the new servers be introduced safely?</p>`,
    constraints: `Total capacity = 6×1,000 + 3×3,000 = 15,000 rps.`,
    example: `<p>Round robin: each of 9 servers gets 1,000 rps → old servers at ${H.c('r', '100%')}, new at ${H.c('y', '33%')}. Weights 1 : 3 → old 600 rps (${H.c('g', '60%')}), new 1,800 rps (${H.c('g', '60%')}).</p>`,
    brute: { why: `<p>Round robin treats all servers as equal. The old servers hit 100% and latency explodes, while the new servers — the ones you just paid for — sit two-thirds idle. Removing the old servers entirely leaves 9,000 rps on 9,000 rps capacity (100%) and no redundancy.</p>` },
    mcq: { q: 'With weights 1 (old) and 3 (new), what share does ONE new server get?', options: ['3/15 = 20%', '1/9 ≈ 11%', '1/3 ≈ 33%'], answer: 0, explain: 'Total weight = 6×1 + 3×3 = 15; one new server has weight 3 → 3/15.' },
    hints: [`<p>Weights should be proportional to capacity.</p>`, `<p>Share of a server = its weight ÷ sum of all weights.</p>`, `<p>Safe introduction: slow start, canary weight first, watch error rate and latency, then full weight.</p>`],
    solution: {
      approach: `<p><b>Plain RR:</b> 9,000 ÷ 9 = 1,000 rps each → old servers at 100% (slow, errors), new at 33%.</p>
        <p><b>Weights ∝ capacity:</b> old = 1, new = 3; total weight 15. Old server gets 9,000 × 1/15 = 600 rps (60% of 1,000); new gets 9,000 × 3/15 = 1,800 rps (60% of 3,000). Equal 60% utilisation everywhere. Use smooth weighted RR (interleaved) or weighted least connections if request costs vary.</p>
        <p><b>Safe rollout:</b> add new servers with a low weight first (canary), enable slow start so caches/JIT warm up, compare latency and error rate with the old ones, then raise to weight 3. Once stable, consider retiring the old servers: 3 new servers alone = 9,000 capacity — not enough with headroom, so keep some old ones or add a 4th/5th new one (9,000 ÷ 2,100 usable ≈ 5 servers incl. N+1).</p>`,
      complexity: `<p>Utilisation = load ÷ total capacity = 9,000 ÷ 15,000 = 60% when weights match capacity.</p>`
    }
  });

  practice.push({
    title: 'The In-Memory Rate Limiter That Leaks',
    level: 'Medium', tags: ['stateless', 'rate limiting', 'redis'], companies: ['Stripe', 'Cloudflare'],
    statement: `<p>An API promises "max 100 requests per minute per API key". Each of the 8 app servers counts requests in a local HashMap. Customers notice they can make ~800/min, and the limit also resets whenever a server restarts. Fix it so the limit is global and survives restarts, and explain what happens if the shared counter store is unavailable.</p>`,
    constraints: `Peak 40,000 rps total; added latency must stay under 1 ms; 50k active API keys.`,
    example: `<p>8 servers × 100 per server = ${H.c('r', '800/min')} effective limit. Shared counter: <code>INCR rl:key42:202610151204</code> → ${H.c('g', '101 → reject')} no matter which server.</p>`,
    brute: { why: `<p>Dividing the limit by the number of servers (12 per server) breaks with uneven routing, changes whenever autoscaling adds servers, and still resets on restart. Sticky routing by API key makes load uneven and fails when a server dies.</p>` },
    mcq: { q: 'Why does the local counter allow ~800/min?', options: ['Each of 8 servers counts separately', 'HashMaps are slow', 'Round robin skips servers'], answer: 0, explain: 'Requests are spread across 8 servers, each with its own independent count of up to 100.' },
    hints: [`<p>The counter is state; state must leave the app server.</p>`, `<p>Redis INCR is atomic; add EXPIRE so old windows disappear.</p>`, `<p>Decide fail-open vs fail-closed; consider a small local fallback limit.</p>`],
    solution: {
      approach: `<p><b>Design:</b> move the counter to a shared, replicated Redis. Per request: <code>INCR rl:{key}:{minute}</code>; if the result is 1, set <code>EXPIRE 60</code> (or do both atomically with a small Lua script / pipeline). If the count &gt; 100 → HTTP 429 with a <code>Retry-After</code> header. Every server sees the same count; restarts do not matter.</p>
        <p><b>Scale:</b> 40,000 rps → 40,000 Redis ops/s — fine for a small Redis cluster; keys are spread by API key. Latency ≈ 0.2–0.5 ms in the same zone. Memory: 50k keys × ~100 bytes ≈ 5 MB.</p>
        <p><b>Accuracy:</b> fixed windows allow up to 2× bursts at the window boundary; a sliding-window or token-bucket algorithm smooths it (HLD 9).</p>
        <p><b>Redis down:</b> choose explicitly. <i>Fail open</i> (allow requests, maybe with a generous local per-server limit) keeps the API available — typical for rate limits. <i>Fail closed</i> (reject) is for abuse-sensitive endpoints like login. Add a circuit breaker so a slow Redis does not slow every request.</p>`,
      complexity: `<p>O(1) atomic operation per request; memory O(active keys).</p>`
    }
  });

  practice.push({
    title: 'Flash Sale: 50× Traffic in 5 Minutes',
    level: 'Hard', tags: ['autoscaling', 'horizontal scaling', 'queues', 'load shedding'], companies: ['Flipkart', 'Amazon', 'Alibaba'],
    statement: `<p>A shop normally peaks at 2,000 rps on 4 app servers. A sneaker drop at 10:00 is expected to bring <b>100,000 rps</b> within 5 minutes, mostly people refreshing the product page and pressing "Buy". Only 5,000 pairs exist. Design how the system scales and stays up, and what happens to requests beyond capacity.</p>`,
    constraints: `Autoscaling adds a server in ~3 minutes; the DB primary handles ~3,000 writes/s; overselling is unacceptable.`,
    example: `<p>Reactive autoscaling alone: at 10:00 load jumps 50×; new servers arrive at 10:03 — ${H.c('r', 'three minutes of timeouts')}, and 100k "Buy" clicks hammering one inventory row would melt the DB.</p>`,
    brute: { why: `<p>"Turn on autoscaling" is too slow (minutes) for a spike that arrives in seconds, and it scales only the app tier — the database and the single hot inventory row become the bottleneck. Letting every click hit the DB with <code>UPDATE stock = stock − 1</code> causes lock contention, timeouts and, with sloppy code, overselling.</p>` },
    mcq: { q: 'What absorbs the read storm (people refreshing the product page) most cheaply?', options: ['CDN/edge cache of the product page with a short TTL', 'More database replicas', 'Bigger app servers'], answer: 0, explain: 'The page is identical for everyone; serving it from the edge removes most of the 100k rps before it reaches your servers.' },
    hints: [`<p>Separate the read storm (page views) from the write storm (buy attempts). They need different tools.</p>`, `<p>Pre-scale before 10:00; cache the page at the edge; put buy requests through a queue or a virtual waiting room.</p>`, `<p>Inventory: atomic decrement in Redis (or reservation tokens) before the DB; shed load gracefully with 429/"sold out" instead of timeouts.</p>`],
    solution: {
      approach: `<p><b>1. Pre-scale (scheduled, not reactive):</b> at 09:45 scale the app tier to the expected peak (e.g. 100,000 × 10% reaching origin ÷ 1,400 ≈ 8 + spares → ~12 servers, more if the CDN hit rate is lower), warm caches, raise DB connection limits. Reactive autoscaling stays on as backup.</p>
        <p><b>2. Kill the read storm at the edge:</b> product page served from the CDN with a 1–5 s TTL; stock count shown from a cached value. 90%+ of the 100k rps never reaches the origin.</p>
        <p><b>3. Control the write storm:</b> a <b>virtual waiting room</b> admits users at a rate the backend can handle (e.g. 2,000/s). "Buy" does an <b>atomic decrement</b> of a Redis counter (<code>DECR stock:sku42</code>); if the result ≥ 0 the user gets a reservation; otherwise "sold out" immediately. Reservations are written to an order queue; workers create orders in the DB at a steady ~1,000/s. Exactly 5,000 reservations exist, so <b>no overselling</b>; unpaid reservations expire after 10 minutes and return to stock.</p>
        <p><b>4. Shed load gracefully:</b> rate limits per user/IP (bots), fast 429 or "sold out" responses instead of timeouts, circuit breakers around non-essential services (recommendations off during the drop).</p>
        <p><b>5. Redundancy:</b> Redis with a replica, multi-AZ app tier, DB standby; run a load test of the whole flow beforehand.</p>`,
      complexity: `<p>Origin load ≈ (1 − CDN hit rate) × 100k rps; inventory decision O(1) in Redis; DB writes capped by the queue consumer rate (~1,000/s).</p>`,
      followUps: ['How do you keep the Redis counter and the DB inventory in sync if a worker crashes?', 'How do you stop bots from taking all 5,000 pairs?']
    }
  });

  practice.push({
    title: 'Design for 99.99%: Remove Every SPOF',
    level: 'Hard', tags: ['availability', 'SPOF', 'multi-AZ', 'failover'], companies: ['Stripe', 'Google', 'Microsoft'],
    statement: `<p>A payments-status API must reach <b>99.99%</b> availability (≈ 52 minutes downtime/year). Current: 1 LB (99.95%), 2 app servers (99.9% each), 1 PostgreSQL (99.9%), 1 Redis (99.9%), all in one zone. Compute today's theoretical availability, then design a version that meets the target and show the math. State what the math ignores.</p>`,
    constraints: `Single region allowed; 3 availability zones available; DB failover takes ~30 s; budget is not the main concern.`,
    example: `<p>Today: 0.9995 × (1 − 0.001²) × 0.999 × 0.999 ≈ ${H.c('r', '99.75%')} ≈ 22 h/year. The single DB and Redis dominate.</p>`,
    brute: { why: `<p>Adding app servers alone changes 0.999999 to 0.999999999 — meaningless — because the series chain is dominated by the single LB, DB and Redis. Going multi-region active-active immediately adds huge complexity (data conflicts) when a well-built single region with 3 zones can reach the target.</p>` },
    mcq: { q: 'Which change raises availability the most from the current design?', options: ['Making the DB and Redis redundant with automatic failover', 'Adding a third app server', 'A faster load-balancing algorithm'], answer: 0, explain: 'Single 99.9% components in series cap the whole system near 99.8%; giving them standbys removes the biggest weak links.' },
    hints: [`<p>Series: multiply. Parallel: 1 − (1 − a)<sup>n</sup>.</p>`, `<p>Make every tier at least 2-way redundant across zones; use a managed multi-AZ LB.</p>`, `<p>Then account for failover time: 30 s per DB failover × expected failovers/year must fit inside 52 minutes along with everything else.</p>`],
    solution: {
      approach: `<p><b>Today:</b> LB 0.9995 × app (1 − 0.001²) = 0.999999 × DB 0.999 × Redis 0.999 ≈ <b>0.99750</b> → ~22 hours/year.</p>
        <p><b>Design (3 zones):</b> managed multi-AZ load balancer (provider SLA typically 99.99%; or 2 self-run LBs with floating IP); app servers 2 per zone (6 total, N+1 per zone — any zone can be lost); PostgreSQL primary + synchronous standby in a second zone + async replica in the third, with automatic failover (managed multi-AZ or Patroni/etcd quorum to avoid split brain); Redis primary + 2 replicas across zones with automatic failover.</p>
        <p><b>Math:</b> LB ≈ 0.9999; app 1 − 0.001⁶ ≈ 1; DB pair 1 − 0.001² = 0.999999; Redis 1 − 0.001³ ≈ 1. Product ≈ <b>0.99990</b> → dominated by the LB. Add failover time: e.g. 4 DB failovers × 30 s + 4 Redis failovers × 10 s ≈ 2.7 minutes/year. Total ≈ 53 + 3 minutes — right at the edge, so add client retries for idempotent reads (hides most failover blips) and consider a second LB path (DNS failover) to buy margin.</p>
        <p><b>What the math ignores:</b> correlated failures (bad deploys, config pushes, cert expiry, a region-wide control-plane issue), human error, dependency outages, and partial failures (slow, not dead). Mitigate with staged rollouts per zone, automated rollback, chaos drills, and SLO-based alerting. Real 99.99% is as much process as hardware.</p>`,
      complexity: `<p>Availability budget: 0.01% of 525,600 min ≈ 52.6 min/year; each redundant tier turns (1 − a) into (1 − a)<sup>n</sup>.</p>`
    }
  });

  practice.push({
    title: 'Reconnect Storm After a Server Dies',
    level: 'Hard', tags: ['least connections', 'websockets', 'thundering herd', 'failover'], companies: ['Discord', 'WhatsApp', 'Zoom'],
    statement: `<p>A real-time notifications service holds <b>1.2M WebSocket connections</b> on 12 servers (100k each, max 130k). One server crashes: its 100k clients reconnect within ~2 seconds. The LB uses least connections. Ten minutes later autoscaling adds a 13th server. Walk through what happens at each step, what can go wrong, and how to design it to be safe.</p>`,
    constraints: `TLS handshake + auth costs ~5 ms CPU per connection; a server can accept ~3,000 new connections/s safely.`,
    example: `<p>100k reconnects in 2 s = ${H.c('r', '50,000 handshakes/s')} across 11 servers ≈ 4,500/s each — above the 3,000/s safe rate. Later the new 13th server has 0 connections, so least connections sends it ${H.c('r', 'every')} new connection.</p>`,
    brute: { why: `<p>Naive view: "least connections + autoscaling handles it". In reality the instant reconnect storm overloads TLS/auth CPU on all survivors (and the auth service), causing timeouts → clients retry immediately → an even bigger storm (a thundering herd). Then the empty new server is flooded by least connections while cold.</p>` },
    mcq: { q: 'The single most effective client-side fix for reconnect storms is…', options: ['Exponential backoff with random jitter', 'Reconnecting faster', 'Using IP hash'], answer: 0, explain: 'Jitter spreads 100k reconnects over tens of seconds instead of 2, keeping per-server handshake rate safe.' },
    hints: [`<p>Compute handshake rate per surviving server and compare with the safe rate.</p>`, `<p>Spread the reconnects in time (client jitter) and cap acceptance per server (server/LB side).</p>`, `<p>For the new server: slow start or connection-rate caps; optionally move a few connections from the fullest servers gradually.</p>`],
    solution: {
      approach: `<p><b>Crash:</b> 100k clients lose their sockets. Least connections spreads reconnects over the 11 survivors (each heads from 100k toward ~109k, under the 130k cap ✓). But arriving in ~2 s means ~4,500 handshakes/s per server — over the 3,000/s safe rate — and the auth service gets 50k requests/s. Timeouts trigger immediate retries → herd.</p>
        <p><b>Fixes for the storm:</b> (1) clients reconnect with <b>exponential backoff + full jitter</b> (first retry random 0–30 s), spreading 100k over ~30 s ≈ 300/s per server; (2) servers/LB enforce a <b>max accept rate</b> and return a fast "retry later" instead of timing out; (3) resumable sessions: short-lived resume tokens validated locally (signed) so reconnects skip the expensive auth call; (4) TLS session resumption to cut handshake CPU.</p>
        <p><b>New 13th server:</b> it has 0 connections, so least connections would send it all new connections. Use <b>slow start</b> (ramp weight over minutes) and a per-server new-connection rate cap. Rebalancing: the fullest servers gracefully close a small percentage of connections per minute (with jitter) so load converges toward 1.2M ÷ 13 ≈ 92k each.</p>
        <p><b>Capacity planning:</b> keep headroom for one server's worth of connections on the rest (11 × 130k = 1.43M ≥ 1.2M ✓) and add servers before reaching ~85% of cap. Message delivery stays correct throughout because routing goes through pub/sub keyed by user, not by server.</p>`,
      complexity: `<p>Reconnect rate per server ≈ dropped connections ÷ (survivors × spread window): 100k ÷ (11 × 30 s) ≈ 300/s with 30 s jitter vs 4,500/s without.</p>`,
      followUps: ['How would you detect and fix the imbalance automatically?', 'What changes if an entire zone (4 servers) fails at once?']
    }
  });

  practice.push({
    title: 'Global Photo App: 10k to 10M Users',
    level: 'Hard', tags: ['scaling journey', 'cdn', 'object storage', 'replicas', 'stateless'], companies: ['Instagram/Meta', 'Pinterest', 'Snap'],
    statement: `<p>A photo-sharing app (upload photos, view a feed of people you follow, like, comment) has 10k users in one country, running on 2 VMs (app + PostgreSQL), photos stored on the app VM's disk. It is going viral: 1M users in 6 months, 10M in 18 months, users on 3 continents. Propose the scaling plan with key numbers, focusing on the ideas from this module (stateless app, load balancing, SPOFs, read replicas) and noting where later topics take over.</p>`,
    constraints: `Each user views ~200 photos/day, uploads ~1 photo/week (2 MB original); read:write ≈ 500:1; target 99.9% → 99.95%.`,
    example: `<p>10M users × 200 views ÷ 86,400 ≈ ${H.c('b', '23,000 photo views/s')} average (~70k peak) — photo <b>bytes</b> must come from a CDN, not your servers. Uploads ≈ 10M ÷ 7 ÷ 86,400 ≈ ${H.c('b', '17/s')} × 2 MB = 34 MB/s.</p>`,
    brute: { why: `<p>Keeping photos on app server disks makes the app stateful (can't scale out, a dead disk loses photos), and serving 70k image requests/s from app servers would need a huge fleet and terabits of bandwidth. Just "adding bigger servers" ignores the 3-continent latency and leaves the single DB as a SPOF.</p>` },
    mcq: { q: 'First architectural change as growth starts?', options: ['Move photos to object storage + CDN and make app servers stateless', 'Shard PostgreSQL by user id', 'Rewrite into microservices'], answer: 0, explain: 'It removes the biggest state from the app tier and the biggest bandwidth load, enabling horizontal scaling.' },
    hints: [`<p>Separate the byte-heavy path (images) from the metadata path (feed, likes, comments).</p>`, `<p>Images: object storage + CDN. Metadata: stateless API fleet + LB + DB primary/standby + replicas + cache.</p>`, `<p>At 10M across continents: CDN handles global image latency; consider read replicas in other regions; feed generation is a later topic (HLD 15).</p>`],
    solution: {
      approach: `<p><b>Step 1 (now, 10k → 100k):</b> move photos to <b>object storage</b> (uploads via pre-signed URLs, multiple sizes generated by background workers), serve them via a <b>CDN</b>. Make the API <b>stateless</b> (token or Redis sessions). Managed PostgreSQL with a standby (removes the DB SPOF). 2–3 API servers behind a <b>load balancer</b> with health checks.</p>
        <p><b>Step 2 (1M users):</b> metadata reads ≈ 1M × ~300 API calls/day ÷ 86,400 ≈ 3,500 rps avg, ~10k peak. API fleet ⌈10,000 ÷ 1,400⌉ + 1 ≈ 9 servers across 2–3 zones with autoscaling. DB: add a <b>Redis cache</b> for hot data (user profiles, like counts) and <b>2–3 read replicas</b>; read-your-writes for a user's own posts and comments. Queue + workers for thumbnails and notifications.</p>
        <p><b>Step 3 (10M users, 3 continents):</b> photo views ~70k/s peak are served almost entirely by the CDN's edge locations near users. API traffic ~100k rps peak → ~75+ servers with autoscaling. Writes ≈ a few hundred/s (likes, comments, uploads) — still OK for one primary with good indexing, but the feed query becomes the hot spot: precompute feeds (fan-out, HLD 15) and cache them. To cut API latency on other continents, deploy read-only API stacks with <b>cross-region read replicas</b> in 2 more regions; writes go to the home region (or later, shard users by region). Storage: 10M ÷ 7 × 2 MB × 365 ≈ 1 PB/year originals → object storage tiers.</p>
        <p><b>SPOF review at each step:</b> LB (managed multi-AZ), API (N+1 per zone), DB (standby + replicas), Redis (replica), CDN (provider-redundant; optionally multi-CDN), workers (queue-based, any can die).</p>`,
      complexity: `<p>Photo views ≈ users × 200 ÷ 86,400 (×3 for peak); upload bandwidth ≈ uploads/s × 2 MB; storage ≈ 1 PB/year at 10M users.</p>`
    }
  });

  /* =====================================================================
     QUIZ
     ===================================================================== */
  quiz.push(
    { q: 'What is <b>horizontal</b> scaling?', options: ['Adding more machines and spreading load across them', 'Moving to a machine with more CPU and RAM', 'Adding indexes to the database', 'Compressing responses'], answer: 0, explain: 'Scale out = more machines behind a load balancer. Scale up (vertical) = a bigger machine.' },
    { q: 'Which is the main reason a web tier must be <b>stateless</b> before scaling out?', options: ['So any server can handle any request and servers can be added/removed freely', 'Stateless code runs faster on one CPU', 'Load balancers refuse stateful servers', 'It removes the need for a database'], answer: 0, explain: 'If state lives in one server, requests routed elsewhere break and that server cannot be safely removed.' },
    { q: 'After adding a second app server, users are "randomly" logged out about half the time. Most likely cause?', options: ['Sessions are stored in each server\'s memory', 'The database is too slow', 'DNS caching', 'The CDN is misconfigured'], answer: 0, explain: 'Round robin alternates servers; the one that did not create the session does not know it.' },
    { q: 'Requests take either 10 ms or 30 s, unpredictably. Which LB algorithm handles this best?', options: ['Least connections (or least outstanding requests)', 'Round robin', 'IP hash', 'Random with no checks'], answer: 0, explain: 'It sends new work to the server with the least in-flight work, so slow requests do not pile up on one server.' },
    { q: 'Servers A (weight 3) and B (weight 1) use weighted round robin. Out of 400 requests, A gets about…', options: ['300', '200', '100', '400'], answer: 0, explain: 'Share = 3 ÷ (3 + 1) = 75% → 300.' },
    { q: 'Two independent app servers each have 99% availability and either can serve all traffic. Availability of the app tier?', options: ['99.99%', '98.01%', '99%', '99.5%'], answer: 0, explain: 'Parallel: 1 − 0.01 × 0.01 = 0.9999.' },
    { q: 'LB 99.99% → app tier 99.99% → DB 99.9% in series. Overall availability is closest to…', options: ['99.88%', '99.99%', '99.9%', '99.999%'], answer: 0, explain: 'Series: 0.9999 × 0.9999 × 0.999 ≈ 0.9988. The weakest link dominates.' },
    { q: 'What do read replicas NOT help with?', options: ['Write throughput on the primary', 'Read-heavy load', 'Isolating slow reporting queries', 'Having a standby to promote on failure'], answer: 0, explain: 'Every write still goes to the single primary, and every replica must replay all writes.' },
    { q: 'A user edits a post and immediately sees the old version. Which fix targets exactly this?', options: ['Read-your-writes: route that user\'s reads to the primary briefly', 'Add more replicas', 'Use round robin for writes', 'Increase the cache TTL'], answer: 0, explain: 'The user is reading from a lagging async replica; only the writer needs immediate freshness.' },
    { q: 'Main drawback of sticky sessions?', options: ['A server failure loses its users\' sessions and load can become uneven', 'They need a database', 'They make requests slower by 1 second', 'They only work with UDP'], answer: 0, explain: 'State still lives in one server; affinity just hides that until the server dies or gets overloaded.' },
    { q: 'Why is a JWT harder to revoke than a server-side session?', options: ['Servers verify it locally without a lookup, so it stays valid until it expires', 'JWTs are encrypted with the user\'s password', 'JWTs cannot have an expiry', 'Browsers never delete JWTs'], answer: 0, explain: 'No lookup means nothing to delete; revocation needs short expiry, refresh tokens, or a deny-list lookup.' },
    { q: 'A freshly added server under least connections often gets overloaded because…', options: ['It has 0 connections, so it receives all new connections while still cold', 'Least connections ignores new servers', 'It is skipped by health checks', 'Its weight defaults to zero'], answer: 0, explain: 'Use slow start / warm-up and connection-rate caps.' },
    { q: 'Peak 9,000 rps, each server handles 1,500 rps, target 75% utilisation, N+1. How many servers?', options: ['9', '6', '7', '12'], answer: 0, explain: 'Usable = 1,125 rps; ⌈9,000 ÷ 1,125⌉ = 8; +1 spare = 9.' }
  );

  /* =====================================================================
     INTERVIEW Q&A
     ===================================================================== */
  interview.push(
    { q: 'What is the difference between vertical and horizontal scaling? When would you choose each?', level: 'B',
      a: `<p><b>Vertical</b> (scale up) = a bigger machine: more CPU, RAM, faster disks. No code change and no distributed-systems complexity, but there is a hardware ceiling, cost grows steeply at the top, resizing often needs a restart, and it remains a single point of failure.</p>
        <p><b>Horizontal</b> (scale out) = more machines behind a load balancer. Near-unlimited growth, redundancy, autoscaling — but the service must be stateless and shared data becomes the hard part.</p>
        <p><b>Choice:</b> scale stateless app servers out; scale the database up as long as reasonable, then add replicas/caching, and shard only when needed. For tiny apps, one box is the right answer.</p>`,
      followUps: ['What is diagonal scaling?', 'Why doesn\'t doubling cores double throughput?'] },
    { q: 'What does it mean for a service to be stateless, and how do you make an existing service stateless?', level: 'B',
      a: `<p>A stateless service keeps nothing between requests that another copy would need: any instance can serve any request, and killing an instance loses nothing but in-flight work.</p>
        <p>To get there, find every kind of hidden state and move it out: sessions → Redis or signed tokens; uploaded files → object storage; counters (rate limits) → Redis atomic ops; in-app cron → a scheduler/queue or leader election; carts → Redis/DB. Harmless local caches can stay. Add graceful shutdown so deploys drain connections. Test: kill a server mid-traffic — users should not notice.</p>`,
      followUps: ['Is a WebSocket server stateless?', 'Where would you store a shopping cart and why?'] },
    { q: 'Compare sticky sessions, a central session store, and JWTs.', level: 'I',
      a: `<p><b>Sticky sessions:</b> LB pins a user to one server holding their session in memory. No code change, but uneven load, sessions lost on crash/deploy, scale-out only helps new users.</p>
        <p><b>Central store (Redis):</b> cookie holds a random id; data lives in a replicated store with TTL. Servers are stateless; instant logout/revocation; costs ~0.5 ms lookup per request and the store must be highly available.</p>
        <p><b>JWT / signed token:</b> claims signed by the server and verified locally — no lookup, great across microservices. Hard to revoke before expiry, larger cookies, readable payload. Common pattern: short-lived access tokens (5–15 min) + revocable refresh tokens.</p>`,
      followUps: ['How do you log a user out of all devices with each approach?', 'Where should a browser store a token?'] },
    { q: 'Explain round robin vs least connections. When does round robin fail?', level: 'B',
      a: `<p><b>Round robin</b> sends requests to servers in a fixed rotation. It is simple, stateless and perfect when requests cost about the same and servers are identical.</p>
        <p><b>Least connections</b> sends each new request/connection to the server with the fewest in-flight ones, so it adapts to uneven request durations and long-lived connections.</p>
        <p>Round robin fails when work is uneven (some requests take 30 s), when servers differ in size (use weights), and with long-lived connections where early imbalances persist. Least connections has its own trap: a new empty server gets flooded — use slow start.</p>`,
      followUps: ['What is the power of two choices?', 'What does "least connections" mean with HTTP/2 multiplexing?'] },
    { q: 'How does a load balancer know a server is down, and what happens to requests during that time?', level: 'I',
      a: `<p><b>Active health checks:</b> the LB probes each server (e.g. <code>GET /health</code> every 5 s); after N consecutive failures (e.g. 2–3) it removes the server, after M successes it adds it back. <b>Passive checks / outlier detection:</b> the LB watches real traffic and ejects servers returning errors or timing out.</p>
        <p>Between the crash and removal (interval × threshold, e.g. 10–15 s) some requests fail. Reduce it with passive checks, shorter intervals, and retries to another server for idempotent requests (with a retry budget to avoid amplifying load). Keep health checks shallow so a shared dependency blip does not mark every server unhealthy.</p>`,
      followUps: ['Liveness vs readiness — what is the difference?', 'What should a load balancer do if ALL targets are unhealthy?'] },
    { q: 'What is a single point of failure? How do you find and remove them?', level: 'B',
      a: `<p>A SPOF is a component whose failure stops the whole system or a whole feature. Find them by walking one request path end to end (DNS → LB → app → cache → DB → storage) and asking "what if this disappears?" — including non-hardware ones: TLS certs, secrets, a config service, one region/zone, one engineer.</p>
        <p>Remove them with redundancy (active-active or active-passive), detection (health checks, heartbeats), and automatic switching (failover, floating IPs, promotion). Make copies fail independently — different zones — and size the survivors to carry the full load (N+1).</p>`,
      followUps: ['Who load-balances the load balancer?', 'Give an example of a non-hardware SPOF you have seen.'] },
    { q: 'Calculate the availability of: 2 LBs in parallel (99.9% each) → 3 app servers in parallel (99% each) → 1 database (99.95%).', level: 'I',
      a: `<p>LB tier: 1 − 0.001² = 0.999999. App tier: 1 − 0.01³ = 0.999999. DB: 0.9995. In series: 0.999999 × 0.999999 × 0.9995 ≈ <b>0.999498 ≈ 99.95%</b> — about 4.4 hours/year of downtime.</p>
        <p>The single database dominates; adding app servers would change almost nothing. Next step: a standby DB with automatic failover (1 − 0.0005² ≈ 0.99999975), then budget for failover time. Caveat: this assumes independent failures — real systems have correlated failures (bad deploys, zone outages), so measured availability is lower.</p>`,
      followUps: ['How much downtime per year is 99.99%?', 'Why does real availability fall short of this math?'] },
    { q: 'What are read replicas, and what problems do they introduce?', level: 'I',
      a: `<p>Read replicas are copies of the database that replay the primary's change log and serve read queries. Writes go to the primary; reads are spread over replicas, so read capacity scales nearly linearly. Replicas also serve as failover candidates and can isolate heavy reporting queries.</p>
        <p>Problems: <b>replication lag</b> with async replication → stale reads (fix with read-your-writes, position-aware routing, pinning a user to one replica for monotonic reads); they do <b>nothing for writes</b>; every replica replays all writes; failover with async replication can lose recent writes; and a replica is not a backup (deletes replicate too).</p>`,
      followUps: ['Synchronous vs asynchronous replication trade-off?', 'How would you route reads automatically?'] },
    { q: 'Walk me through scaling a web app from 100 users to 10 million users.', level: 'I',
      a: `<p>Convert to load first: 10M DAU × ~50 requests ÷ 86,400 ≈ 5,800 rps avg, ~17k peak. Then evolve by bottleneck:</p>
        <ol><li><b>100–1k:</b> one box, backups, monitoring.</li>
        <li><b>~10k:</b> separate DB (managed), files to object storage + CDN.</li>
        <li><b>~100k:</b> stateless app, LB + N+1 servers, sessions in Redis, DB standby.</li>
        <li><b>~1M:</b> cache hot reads, read replicas with read-your-writes, multi-AZ.</li>
        <li><b>~10M:</b> autoscaling (~14 servers at peak), queues + workers for slow tasks, more replicas, observability, rate limiting.</li>
        <li><b>Beyond:</b> sharding when writes/size outgrow one primary, multi-region for global latency.</li></ol>
        <p>At each step I name the metric that triggered it.</p>`,
      followUps: ['What would you do first if the DB is the bottleneck at 1M users?', 'When would you split into microservices?'] },
    { q: 'Your API servers are at 90% CPU but the database is at 20%. What do you do, short term and long term?', level: 'B',
      a: `<p><b>Short term:</b> if the service is stateless, add servers behind the load balancer (or raise the autoscaling max) — that is the fastest relief. If it is not stateless, scale the instances up vertically as a stop-gap.</p>
        <p><b>Then investigate:</b> profile where CPU goes (JSON serialisation, TLS, inefficient code, a hot loop, GC pressure), check whether one endpoint dominates, and whether a cache could avoid recomputing responses. <b>Long term:</b> autoscaling on CPU or request rate with headroom, right-sized instances, offloading heavy work to async workers, and performance fixes — often cheaper than more servers.</p>`,
      followUps: ['What metric would you autoscale on?', 'How would you avoid overloading the DB when you add servers?'] },
    { q: 'How do you scale the load balancer itself and avoid it being a SPOF?', level: 'A',
      a: `<p>Options: (1) <b>Managed cloud LBs</b> (AWS ALB/NLB, Google Cloud LB) are already distributed fleets across zones and scale automatically. (2) <b>Self-hosted pair</b> (HAProxy/nginx/Envoy) in active-passive with a floating IP via VRRP/keepalived; heartbeat failover in seconds. (3) <b>Active-active</b> LB nodes behind DNS round robin or anycast/ECMP routing, so many LB nodes share traffic and failures are absorbed. (4) Layered: an L4 tier spreading to an L7 tier.</p>
        <p>Also: health-check the LBs, spread them across zones, and keep configs in version control with staged rollouts — a bad LB config push is a classic global outage.</p>`,
      followUps: ['What is anycast?', 'What is split brain in an active-passive LB pair?'] },
    { q: 'A server crashes holding 100k WebSocket connections. What happens and how do you design for it?', level: 'A',
      a: `<p>All 100k clients reconnect almost simultaneously — a thundering herd. Survivors face a spike of TLS handshakes and auth calls; if they slow down, clients time out and retry, making it worse. Least connections then also floods any newly added server.</p>
        <p>Design: clients use exponential backoff with full jitter; servers cap the accept rate and reply fast with "retry later"; resumable sessions with locally verifiable resume tokens skip the auth service; TLS session resumption; slow start for new servers; capacity headroom so N−1 servers hold all connections; message routing via pub/sub so any server can deliver to any user.</p>`,
      followUps: ['How do you rebalance connections after the storm?', 'How do you deploy such servers without causing storms?'] },
    { q: 'How do you handle in-flight requests during deploys in a horizontally scaled service?', level: 'I',
      a: `<p>Use rolling, blue-green or canary deploys plus <b>graceful shutdown</b>: on SIGTERM the instance fails its readiness check, the LB stops sending new requests (deregistration/connection draining), the instance finishes in-flight requests within a timeout (e.g. 30 s), closes long-lived connections politely, then exits. New instances become ready only after warm-up.</p>
        <p>Requirements: stateless servers (no session loss), backward-compatible API and DB changes during the overlap (old and new code run together), and health-check-based automated rollback if error rates rise.</p>`,
      followUps: ['Blue-green vs canary — when would you pick each?', 'How do you handle a DB schema change during a rolling deploy?'] }
  );

  /* ---------- vary the position of the correct option (deterministic rotation) ---------- */
  function rotateMcq(m, shift) {
    if (!m || !m.options) return;
    var n = m.options.length, s = shift % n;
    if (!s) return;
    var correct = m.options[m.answer];
    m.options = m.options.slice(n - s).concat(m.options.slice(0, n - s));
    m.answer = m.options.indexOf(correct);
  }
  quiz.forEach(function (q, i) { rotateMcq(q, i * 3 + 1); });
  practice.forEach(function (p, i) { rotateMcq(p.mcq, i + 1); });
  topics.forEach(function (t, i) { (t.problems || []).forEach(function (p, j) { rotateMcq(p.mcq, i + j + 2); }); });

  registerModule({
  langExplain: `<p><b>About the code here.</b> System design is language-neutral, and interviews never require a particular language for it. The short samples are Python (and occasionally Java) only to make an idea concrete, such as an estimate, a hash ring or a rate limiter. Read them like pseudocode; the runnable ones are calculators you can change and re-run.</p>`,
    id: 'hld02',
    title: 'Scalability Basics',
    intro: `<p>Your app works for 100 users. What happens at 100,000? At 10 million? This module is about the first, most important moves every system makes as it grows: <b>bigger machines vs more machines</b>, making servers <b>stateless</b> so they can be copied freely, handling <b>sessions</b> once there is more than one server, spreading traffic with <b>load balancers</b> (round robin, weighted, least connections), hunting down <b>single points of failure</b>, and taking read load off the database with <b>read replicas</b>.</p>
      <p>Every idea comes with an everyday analogy, animated architecture diagrams that evolve step by step (single server → load balancer → replicas → regions), worked numbers, and interview-style practice like <i>"scale this app from 100 to 10M users"</i>, <i>"fix the single point of failure"</i> and <i>"make this service stateless"</i>. These are the building blocks every later HLD module assumes.</p>`,
    goals: [
      'Explain vertical vs horizontal scaling with pros, cons and cost curves, and pick the right one for a given tier',
      'Make a service stateless by finding hidden state (sessions, files, counters, cron) and moving it to shared stores',
      'Compare sticky sessions, central session stores and signed tokens (JWT), including revocation trade-offs',
      'Simulate round robin, weighted round robin and least connections, and choose an algorithm from traffic shape',
      'Find single points of failure, design redundancy and failover, and compute availability for series/parallel components',
      'Use read replicas to scale reads, explain replication lag, and apply read-your-writes',
      'Narrate a step-by-step scaling plan from 100 to 10M users, sizing servers with peak QPS, headroom and N+1'
    ],
    prereqs: `HLD 1 (Client-Server &amp; Request Flow): what a server, request and database are, and the meaning of latency, throughput and availability. Comfort with simple multiplication and percentages. Code is optional (small Java/Python examples).`,
    hours: 9,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
