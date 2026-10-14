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
    String(input || '').replace(/;/g, ' ').replace(/,/g, ' ');
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

registerModule({ id: 'hld02', title: 'Scalability Basics', intro: '<p>x</p>', goals: [], prereqs: 'x', hours: 8, topics: topics, practice: practice, quiz: quiz, interview: interview }); })();
