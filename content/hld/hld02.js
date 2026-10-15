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

registerModule({ id: 'hld02', title: 'Scalability Basics', intro: '<p>x</p>', goals: [], prereqs: 'x', hours: 8, topics: topics, practice: practice, quiz: quiz, interview: interview }); })();
