(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ---------- small shared helpers for the visualizers in this module ---------- */
  function num(s, def) { var n = Number(s); return isNaN(n) ? def : n; }
  function r2(x) { return Math.round(x * 100) / 100; }
  function parseKV(str) {
    var out = {};
    String(str || '').trim().split(/[\s,]+/).forEach(function (tok) {
      var p = tok.split('=');
      if (p.length === 2 && p[0]) out[p[0].toLowerCase()] = p[1];
    });
    return out;
  }
  function nums(str, maxN, hint) {
    var t = String(str || '').trim().split(/[\s,]+/).filter(function (x) { return x !== ''; }).map(Number);
    if (!t.length || t.some(isNaN)) throw new Error(hint);
    if (t.length > maxN) throw new Error('Use at most ' + maxN + ' numbers');
    return t;
  }

  /* =====================================================================
     TOPIC 1 — Redundancy, Failover, Health Checks
     ===================================================================== */
  topics.push({
    title: 'Redundancy & Failover: Never Have One of Anything',
    analogy: `<p>A hospital does not have <b>one</b> power supply. It has the city grid, a diesel generator that kicks in within seconds, and batteries for the gap in between. Nobody plans for the grid to fail on a quiet day — they plan for it to fail <b>during an operation</b>.</p>
      <p>That is <b>redundancy</b> (extra copies of the important thing) and <b>failover</b> (the automatic switch from the broken copy to the working one). The two rules: <i>every important part has a spare</i>, and <i>the switch must happen without a human running to the basement</i>.</p>`,
    explain: `<p>A <b>single point of failure (SPOF)</b> is any one part whose death takes the whole product down: one server, one database, one load balancer, one network link, even one person who knows the password. Reliability starts with <b>hunting SPOFs and giving each a spare</b>.</p>
      <p><b>The two basic shapes</b></p>
      ${H.table(['Shape', 'How it works', 'Good', 'Costly part'], [
        ['<b>Active-passive</b> (hot standby)', 'One node serves everything. A second node is running and copying data but gets <b>no traffic</b>. If the first dies, the standby is promoted.', 'Simple to reason about. No write conflicts (only one writer).', 'Half your hardware idles. Failover takes seconds to minutes. Standby may be a little behind (data loss).'],
        ['<b>Active-active</b>', 'Both nodes serve traffic at once behind a load balancer. If one dies, the other simply takes more load.', 'No idle hardware. Failure is almost invisible: just a drop in capacity.', 'Each node must be able to carry the <i>whole</i> load alone (N+1 sizing). Writes need conflict handling.']
      ])}
      <p><b>Warm and cold standbys:</b> <i>hot</i> = running and in sync (seconds to switch), <i>warm</i> = running but behind or scaled-down (minutes), <i>cold</i> = just backups and scripts, you must build the machine first (hours). Cheaper, slower.</p>
      <p><b>Failure domains.</b> Two servers in the same rack share a power strip, so they are really <i>one</i> thing. Spread copies across <b>host → rack → availability zone (AZ) → region</b>. A common rule: stateless apps across 3 AZs, databases with a synchronous replica in another AZ, and (for the biggest products) a second region.</p>
      <p><b>How does the system know a node is dead?</b> <b>Health checks.</b> The load balancer (or a cluster manager) pings each node every few seconds. After <b>N consecutive misses</b> (say 3 misses at 2 s apart = 6 s) it marks the node DOWN and stops sending it traffic. Two kinds matter:</p>
      <ul><li><b>Liveness</b> — "is the process alive?" If not, restart it.</li>
      <li><b>Readiness</b> — "can it serve right now?" (DB connected, cache warmed). If not, just keep traffic away; do not restart.</li></ul>
      <p><b>The numbers (availability maths).</b> If one node is up 99% of the time, and you run <b>two independent nodes in parallel</b> (either one is enough), the system is down only when <i>both</i> are down: 0.01 × 0.01 = 0.0001 → <b>99.99%</b>. But parts in <b>series</b> (a request needs all of them) multiply the other way: 99.9% × 99.9% × 99.9% = 99.7%. A chain is weaker than its weakest link.</p>
      ${H.table(['Availability', 'Down per year', 'Down per month', 'Common name'], [
        ['99%', '3.65 days', '7.3 hours', 'two nines'],
        ['99.9%', '8.76 hours', '43.8 minutes', 'three nines'],
        ['99.99%', '52.6 minutes', '4.4 minutes', 'four nines'],
        ['99.999%', '5.3 minutes', '26 seconds', 'five nines']
      ])}
      <p><b>RTO and RPO</b> — the two numbers a failover plan must state. <b>RTO</b> (recovery time objective) = how long we may be down. <b>RPO</b> (recovery point objective) = how much recent data we may lose. Async replication gives RPO &gt; 0 (the standby is a few hundred ms behind); synchronous replication gives RPO = 0 but every write waits for the second copy.</p>`,
    clues: [
      '"no single point of failure" / "what if this server dies?" → redundancy + automatic failover',
      '"99.99% availability" / "four nines" → at most ~4.4 min downtime a month, so humans cannot be in the failover loop',
      '"RTO of 30 seconds, RPO of zero" → hot standby with synchronous replication (and say what it costs in write latency)',
      '"survive an entire data centre / AZ outage" → copies in 3 AZs; "survive a region outage" → multi-region (active-active or warm standby)',
      '"stateless web tier" → trivially active-active; "stateful database" → one leader + replicas, failover needs leader election and fencing',
      '"two nodes both think they are the leader" → split-brain; answer with quorum, leases and fencing tokens'
    ],
    code: [
      { lang: 'python', run: true, title: 'Availability maths: series vs parallel (runnable)', code: `# Availability of a system built from parts.
# series   : a request needs ALL parts      -> multiply the availabilities
# parallel : ANY one part is enough          -> 1 - product of unavailabilities

def series(parts):
    a = 1.0
    for p in parts:
        a *= p
    return a

def parallel(parts):
    down = 1.0
    for p in parts:
        down *= (1.0 - p)      # system is down only if every copy is down
    return 1.0 - down

def downtime_min_per_month(avail):
    return (1.0 - avail) * 30 * 24 * 60

lb, app, db = 0.999, 0.99, 0.999
print("single everything :", round(series([lb, app, db]) * 100, 3), "%")
# add a second copy of each part (parallel) then chain the three groups (series)
redundant = series([parallel([lb, lb]), parallel([app, app]), parallel([db, db])])
print("2 copies of each  :", round(redundant * 100, 4), "%")
print("downtime/month    :", round(downtime_min_per_month(redundant), 2), "minutes")
print("with 3 app copies :", round(series([parallel([lb, lb]), parallel([app, app, app]), parallel([db, db])]) * 100, 5), "%")
` },
      { lang: 'yaml', check: false, title: 'Kubernetes: liveness vs readiness probes (reference)', code: `# A pod that restarts only when truly stuck, and receives traffic only when ready
apiVersion: v1
kind: Pod
metadata:
  name: checkout
spec:
  containers:
    - name: app
      image: shop/checkout:1.8.2
      livenessProbe:            # "is the process alive?"  fail 3x -> kubelet restarts the container
        httpGet: { path: /healthz, port: 8080 }
        periodSeconds: 5
        failureThreshold: 3
      readinessProbe:           # "can it serve right now?" fail -> removed from the Service, NOT restarted
        httpGet: { path: /ready, port: 8080 }
        periodSeconds: 2
        failureThreshold: 2
` }
    ],
    codeTitle: ['Availability maths (Python)', 'Health probes (YAML)'],
    viz: [
      {
        title: 'Active-passive failover, step by step',
        input: 'passive',
        inputLabel: 'Mode: passive (active-passive) or active (active-active)',
        gen: function (input) {
          var mode = String(input).trim().toLowerCase();
          if (mode.indexOf('act') === 0 && mode.indexOf('pass') < 0) mode = 'active';
          else if (mode.indexOf('pass') === 0) mode = 'passive';
          else throw new Error('Type "passive" or "active"');
          var act = mode === 'active';
          function g(tags, hl, ehl, edges) {
            return { type: 'graph', directed: true, height: 56, label: act ? 'Active-active pair behind a load balancer' : 'Active-passive pair with a virtual IP',
              nodes: [
                { id: 'C', label: 'Clients', x: 9, y: 28, shape: 'box' },
                { id: 'LB', label: act ? 'Load Balancer' : 'Virtual IP / LB', x: 36, y: 28, shape: 'box', w: 17 },
                { id: 'A', label: 'Node A', x: 72, y: 10, shape: 'box' },
                { id: 'B', label: 'Node B', x: 72, y: 46, shape: 'box' }
              ],
              edges: edges, hl: hl, ehl: ehl, tags: tags };
          }
          var e1 = act ? [['C', 'LB', 'req'], ['LB', 'A'], ['LB', 'B'], ['A', 'B', 'sync']] : [['C', 'LB', 'req'], ['LB', 'A'], ['LB', 'B', 'idle'], ['A', 'B', 'replicate']];
          var fr = [];
          fr.push({ narr: act ? 'Healthy: <b>both nodes serve traffic</b>. The load balancer spreads requests 50/50. Each node is sized so it can carry 100% alone if needed.' : 'Healthy: <b>Node A (primary)</b> serves everything. <b>Node B (standby)</b> is running, copying A\'s data, and gets <b>no</b> user traffic.',
            parts: [g({ A: 'UP · serving', B: act ? 'UP · serving' : 'UP · standby' }, { A: 'ok', B: act ? 'ok' : 'done' }, act ? { 'C-LB': 'ok', 'LB-A': 'ok', 'LB-B': 'ok' } : { 'C-LB': 'ok', 'LB-A': 'ok' }, e1), { type: 'vars', vals: { 'missed checks on A': 0, 'RTO so far (s)': 0 } }] });
          fr.push({ narr: '<b>Node A crashes</b> (power supply died). Nobody knows yet: the next health check has not run.', parts: [g({ A: 'DOWN (unknown to LB)', B: act ? 'UP · serving' : 'UP · standby' }, { A: 'bad', B: act ? 'ok' : 'done' }, act ? { 'C-LB': 'ok', 'LB-A': 'bad', 'LB-B': 'ok' } : { 'C-LB': 'ok', 'LB-A': 'bad' }, e1), { type: 'vars', vals: { 'missed checks on A': 0, 'RTO so far (s)': 0 }, hl: { 'missed checks on A': 'bad' } }] });
          for (var m = 1; m <= 3; m++) {
            fr.push({ narr: 'Health check #' + m + ' to A <b>times out</b>. Rule: mark DOWN after <b>3 misses</b> (checks are 2 s apart). We wait for 3 so one dropped packet does not cause a needless failover.' + (m < 3 ? ' Users hitting A see errors right now.' : ''),
              parts: [g({ A: 'misses ' + m + '/3', B: act ? 'UP · serving' : 'UP · standby' }, { A: 'bad', B: act ? 'ok' : 'done' }, { 'LB-A': 'bad' }, e1), { type: 'vars', vals: { 'missed checks on A': m, 'RTO so far (s)': m * 2 }, hl: { 'missed checks on A': m === 3 ? 'bad' : 'cur' } }] });
          }
          if (act) {
            fr.push({ narr: 'A is marked <b>DOWN</b>. The load balancer simply stops sending it traffic. <b>Node B was already serving</b>, so there is nothing to promote — users only noticed ~6 s of errors on 50% of requests, and retries hide even that.',
              parts: [g({ A: 'DOWN · removed', B: 'UP · now 100% of load' }, { A: 'bad', B: 'sel' }, { 'C-LB': 'ok', 'LB-B': 'ok' }, [['C', 'LB', 'req'], ['LB', 'B']]), { type: 'vars', vals: { 'missed checks on A': 3, 'RTO so far (s)': 6, 'capacity left': '50%' }, hl: { 'capacity left': 'cur' } }] });
            fr.push({ narr: 'Ops replaces A. When it passes the <b>readiness</b> check it is added back and load returns to 50/50. Lesson: active-active turns a crash into a <i>capacity</i> problem, not an outage — but only if B had spare room.',
              parts: [g({ A: 'UP · rejoined', B: 'UP · serving' }, { A: 'ok', B: 'ok' }, { 'C-LB': 'ok', 'LB-A': 'ok', 'LB-B': 'ok' }, e1), { type: 'vars', vals: { 'missed checks on A': 0, 'RTO so far (s)': 6, 'capacity left': '100%' }, hl: { 'capacity left': 'ok' } }] });
          } else {
            fr.push({ narr: 'A is marked <b>DOWN</b>. The cluster manager must now <b>promote B</b>: make sure A is really dead (<b>fence</b> it so it cannot wake up and write too — otherwise <i>split-brain</i>), replay any last log, switch the virtual IP.',
              parts: [g({ A: 'DOWN · fenced', B: 'PROMOTING…' }, { A: 'bad', B: 'cur' }, {}, e1), { type: 'vars', vals: { 'missed checks on A': 3, 'RTO so far (s)': 8, 'RPO': '≈ last 200 ms of writes' }, hl: { RPO: 'bad' } }] });
            fr.push({ narr: 'Virtual IP now points to <b>B</b>. Clients retry and succeed. Total outage ≈ <b>10–30 s</b>. Because replication was async, the last few writes A never shipped are <span class="c-r">lost</span> (RPO &gt; 0). With synchronous replication RPO would be 0, but every write would have waited for B.',
              parts: [g({ A: 'DOWN · fenced', B: 'UP · NEW PRIMARY' }, { A: 'bad', B: 'sel' }, { 'C-LB': 'ok', 'LB-B': 'ok' }, [['C', 'LB', 'req'], ['LB', 'B']]), { type: 'vars', vals: { 'missed checks on A': 3, 'RTO so far (s)': 12, 'RPO': '≈ last 200 ms of writes' }, hl: { 'RTO so far (s)': 'ok' } }] });
            fr.push({ narr: 'A is repaired. It must come back as the <b>new standby</b> (it re-syncs from B). If A simply resumed as primary it would overwrite newer data — never "fail back" blindly.',
              parts: [g({ A: 'UP · standby (re-syncing)', B: 'UP · PRIMARY' }, { A: 'done', B: 'ok' }, { 'C-LB': 'ok', 'LB-B': 'ok' }, [['C', 'LB', 'req'], ['LB', 'B'], ['B', 'A', 'replicate']]), { type: 'vars', vals: { roles: 'B=primary, A=standby' }, hl: { roles: 'ok' } }] });
          }
          return fr;
        }
      },
      {
        title: 'How much does a spare copy buy you? (availability maths)',
        input: '0.99 4',
        inputLabel: 'Single-node availability (0..1) and number of copies (1-6)',
        gen: function (input) {
          var p = nums(input, 2, 'Enter two numbers, e.g. 0.99 4');
          var a = p[0], n = Math.floor(p[1]);
          if (!(a > 0 && a < 1) || !(n >= 1 && n <= 6)) throw new Error('Availability must be between 0 and 1 (e.g. 0.99), copies 1 to 6');
          var fr = [], vals = [], rows = [], texts = [], lbl = [];
          fr.push({ narr: 'One node is up <b>' + (a * 100) + '%</b> of the time. That is about <b>' + r2((1 - a) * 30 * 24 * 60) + ' minutes of downtime a month</b>. Now add independent copies where any one is enough.', parts: [{ type: 'bars', label: 'Downtime minutes per month', values: [r2((1 - a) * 30 * 24 * 60)], texts: [r2((1 - a) * 43200) + ' min'], idxLabels: ['1 copy'] }] });
          for (var k = 1; k <= n; k++) {
            var down = Math.pow(1 - a, k), av = 1 - down, mins = r2(down * 43200);
            vals.push(Math.max(mins, 0.01)); texts.push(mins + ' min'); lbl.push(k + (k === 1 ? ' copy' : ' copies'));
            rows.push([k, r2(av * 100000) / 1000 + '%', mins + ' min/month', '(1 − ' + a + ')<sup>' + k + '</sup> = ' + down.toExponential(2)]);
            fr.push({ narr: 'With <b>' + k + '</b> independent ' + (k === 1 ? 'copy' : 'copies') + ': the system is down only if <i>all ' + k + '</i> are down at once → (1 − ' + a + ')<sup>' + k + '</sup> = ' + down.toExponential(2) + '. Availability = <b>' + r2(av * 100000) / 1000 + '%</b>.',
              parts: [{ type: 'bars', label: 'Downtime minutes per month (lower is better)', values: vals.slice(), texts: texts.slice(), idxLabels: lbl.slice(), hl: (function () { var h = {}; h[k - 1] = 'sel'; return h; })() }, { type: 'table', label: 'Summary so far', columns: ['copies', 'availability', 'downtime', 'formula'], rows: rows.slice(), hl: { 0: 'done' } }] });
          }
          fr.push({ narr: '<b>Catch:</b> this assumes copies fail <i>independently</i>. Same rack, same bad deploy, same shared database = they fail <i>together</i>, and the real number is much worse. Redundancy only counts across separate <b>failure domains</b>.', parts: [{ type: 'text', html: '<b>Rule of thumb:</b> 2 copies give you roughly double the nines; the 3rd copy mostly buys you the right to lose one <i>during maintenance</i> and still have a spare.' }] });
          return fr;
        }
      }
    ],
    examples: [
      { title: 'Stateless web tier: trivially active-active', html: `<p>The checkout web servers keep no data on disk — sessions live in Redis, orders live in the DB. So you run <b>6 servers across 3 AZs</b> (2 per AZ) behind a load balancer. Losing one whole AZ leaves 4 of 6 servers (67% capacity). Plan for that: normal peak load must be ≤ 67% of full capacity, otherwise the "spare" servers are actually needed and an AZ outage becomes a brown-out. This is called <b>N+1 / AZ-loss sizing</b>.</p>${H.table(['AZ', 'Servers', 'After AZ-1 dies'], [['AZ-1', '2', H.c('r', 'gone')], ['AZ-2', '2', 'alive'], ['AZ-3', '2', 'alive']])}` },
      { title: 'Database primary + standby with a quorum witness', html: `<p>Two database nodes alone cannot tell "the other one died" from "the network between us broke" — each might promote itself (<b>split-brain</b>). Fix: add a tiny <b>third voter</b> (a witness in another AZ). A node may be primary only while it can talk to <b>a majority (2 of 3)</b>. The isolated node sees only itself (1 of 3), steps down, and the other side keeps the majority. That is also how Raft/etcd/Patroni/Orchestrator pick a leader.</p>${H.table(['Scenario', 'A sees', 'B sees', 'Result'], [['A dies', '—', 'B + witness = 2/3', 'B promoted'], ['Network cut A|B,W', 'A only = 1/3', 'B + W = 2/3', 'A steps down, B primary'], ['Without a witness', 'A only', 'B only', H.c('r', 'both promote → split-brain')]])}` },
      { title: 'DNS failover: slow but cheap (TTL matters)', html: `<p>Global failover often uses DNS: when region 1 fails health checks, the DNS service starts answering with region 2's IP. But clients and resolvers <b>cache</b> the old answer for the record's <b>TTL</b>. With TTL = 300 s some users stay on the dead region up to 5 minutes. With TTL = 30 s you fail over faster but pay more DNS queries. Many large systems skip DNS for fast failover and use <b>anycast IPs / global load balancers</b> that withdraw a region in seconds. Lesson: your RTO includes <i>detection time + decision time + propagation time</i>, not just "start the standby".</p>${H.table(['Phase', 'Typical time'], [['Detect (3 misses × 10 s)', '30 s'], ['Decide/promote', '5–20 s'], ['DNS TTL expiry', '30–300 s'], ['Total RTO', H.c('y', '≈ 1–6 minutes')]])}` },
      { title: 'Dependencies in series: the hidden math', html: `<p>Your API is 99.99% available, but it calls 4 internal services, each 99.95%, <b>synchronously</b>. Availability ≈ 0.9999 × 0.9995<sup>4</sup> ≈ <b>99.79%</b> — about 1.5 hours a month, not 4 minutes. Each hard dependency subtracts from your nines. Fixes: make dependencies optional (serve without recommendations), cache their answers, or call them asynchronously. This is why the next topics (timeouts, breakers, bulkheads) exist.</p>` }
    ],
    deepDive: `<p><b>Detection is a trade-off, not a number.</b> Aggressive checking (1 s interval, 2 misses) fails over in ~2 s but causes <i>flapping</i>: a 3-second GC pause makes a healthy node look dead, traffic shifts, the other node overloads, it looks dead too — a <b>cascading failover</b>. Typical fix: separate fast <i>readiness</i> (cheap, removes from rotation) from slow <i>liveness</i> (restart only after much longer), use hysteresis (need 5 passes to come back, 3 misses to leave), and make health checks cheap and local (do not call the database inside <code>/healthz</code>, or a DB blip makes every app node "unhealthy" at once and you drain the whole fleet).</p>
      <p><b>Split-brain and fencing.</b> A leader that was paused (long GC, VM stall) may wake up <i>after</i> a new leader was elected and keep writing. Defences: <b>leases</b> (leader must renew every few seconds or lose the right), <b>fencing tokens</b> (every leadership term has an increasing number; storage rejects writes from older terms), and <b>STONITH</b> ("shoot the other node in the head" — power it off via the management interface before promoting).</p>
      <p><b>Replication and the failover data-loss window.</b> Async replication: lag of ~10–500 ms means RPO &gt; 0. Semi-synchronous (wait for <i>one</i> replica to acknowledge) gives RPO = 0 for single failures at the cost of a network round trip per commit (~1–2 ms in-region, tens of ms cross-region). Quorum systems (Raft, Spanner, Aurora's 4-of-6 write quorum) tolerate failures without a "promotion" at all — the surviving majority just continues.</p>
      <p><b>Failing back is riskier than failing over.</b> Failover is forced; fail-back is optional, so do it deliberately, in business-quiet hours, after re-syncing. Many teams never fail back: the new primary simply <i>is</i> the primary.</p>
      <p><b>Practise it.</b> Untested failover is a hope, not a feature. Run game days where you kill the primary in production-like environments (see the chaos topic), measure the real RTO, and write it in the runbook. Also remember <b>correlated failures</b>: a bad config pushed to all nodes, expired TLS certificates, a full disk everywhere, a shared dependency (DNS, auth, the secrets store). Redundancy does not protect against a mistake you made identically N times — only staged rollouts (canary, one AZ at a time) do.</p>`,
    aiEra: `<p><b>What AI changes:</b> AIOps tools now watch hundreds of signals and predict failures (disk about to fill, node getting slower) before health checks fail, and LLM agents can read a runbook and propose or run the failover steps. GPU-serving fleets add a new redundancy question: a model replica takes minutes to load multi-GB weights, so "warm standby" replicas matter far more than for stateless web servers, and a single bad GPU node can poison a whole batch of requests.</p>
      <p><b>Use AI as a partner:</b> <code>Here is my architecture diagram. List every single point of failure and rank them by blast radius.</code> or <code>Write the failover runbook for a Postgres primary loss and list every command that can lose data.</code> — then verify each step yourself.</p>
      <p><b>Where AI goes wrong:</b> it happily says "just add a second node" and forgets the shared dependency, the split-brain risk, replication lag, or that both nodes sit in the same AZ. It may also invent flags for a specific tool.</p>
      <p><b>What you must still own:</b> choosing RTO/RPO with the business, deciding which failures are worth paying for, and <b>testing</b> the failover. An AI-written runbook that nobody has executed is fiction.</p>`,
    problems: [{
      title: 'Make a Single-Server Checkout Survive a Zone Outage', level: 'Medium', tags: ['redundancy', 'failover', 'RTO/RPO', 'availability'], companies: ['Amazon', 'Flipkart', 'Shopify'],
      statement: `<p>A small shop runs checkout on <b>one VM</b> in one availability zone, with a <b>PostgreSQL</b> database on the same VM. Last month a zone outage took the shop down for 4 hours on Black Friday. The business now asks for: <b>99.95%</b> availability, <b>RTO ≤ 2 minutes</b>, and <b>no committed order may be lost</b> (RPO = 0). Design the change.</p>`,
      constraints: `Peak 800 orders/min, ~2,000 page views/s. Budget allows roughly 3× the current infra cost. Two to three AZs are available in the region.`,
      example: `<p>Allowed downtime at 99.95% = ${H.c('b', '0.0005 × 43,200 min ≈ 21.6 minutes per month')}. The 4-hour outage alone used up <b>11 months</b> of budget.</p>`,
      brute: { why: `<p><b>Naive design:</b> "just add a second identical VM in the same zone, with its own database that we copy nightly". Problems: (1) same AZ = same failure domain, so a zone outage still kills both; (2) nightly copy means up to 24 h of lost orders (RPO = 24 h, breaks the "no lost order" rule); (3) nobody decides which VM is in charge, so a network blip could make two databases accept orders (split-brain); (4) the web code still shares one DB, a SPOF.</p>` },
      mcq: { q: 'Which single change most directly satisfies "no committed order may be lost" when the primary database dies?', options: ['A nightly backup copied to another region', 'A synchronous (or semi-sync) replica in a different AZ', 'More RAM for the database VM', 'A second web server'], answer: 1, explain: 'RPO = 0 means a commit must exist on a second machine before the client is told "done". That is synchronous or quorum replication in another failure domain. Backups and bigger hardware do not give RPO = 0.' },
      hints: [`<p>Hint 1: Split the system into <b>stateless</b> (web) and <b>stateful</b> (database). They need different redundancy styles.</p>`, `<p>Hint 2: Web: 3 instances, one per AZ behind a load balancer (active-active). DB: primary in AZ-1, synchronous standby in AZ-2, automatic failover manager with a witness in AZ-3.</p>`, `<p>Hint 3: Check the maths: RTO = detect (3 × 5 s) + promote (≈15–30 s) + reconnect ≈ 45–60 s &lt; 2 min. Size so 2 of 3 web servers carry peak load. Add runbook + a quarterly failover drill.</p>`],
      solution: {
        approach: `<p><b>Design.</b></p><ol>
<li><b>Web tier (active-active).</b> 3 app instances, one in each of 3 AZs, behind a managed load balancer with health checks every 5 s, 3 misses to eject. Sessions move to Redis (replicated) or signed cookies so any instance can serve any user. Sizing: peak must fit on 2 instances (AZ loss) → each instance handles ≥ 50% of peak.</li>
<li><b>Database (active-passive with RPO = 0).</b> Managed PostgreSQL (or Patroni) with a primary in AZ-1 and a <b>synchronous standby in AZ-2</b>; commit returns only after the standby has written the WAL. A consensus store/witness (etcd or the cloud control plane) runs in 3 AZs, so only the side with a majority may hold the leader lease → no split-brain. Old primary is fenced before promotion.</li>
<li><b>Clients.</b> Connection string uses a stable DNS/endpoint that follows the leader; apps retry idempotent operations (see next topic) with short backoff. Order creation uses an idempotency key, so a retry after failover never double-charges.</li>
<li><b>Maths.</b> RTO ≈ 15 s detection + 20 s promotion + 10 s reconnect ≈ 45 s (target 2 min). RPO = 0 because of sync commit. Availability: web (3 AZ) ≈ 99.99%+, DB failover ≈ 1–2 incidents/year × ~1 min ≈ 2 min/year, load balancer managed at 99.99% → overall comfortably above 99.95% (21 min/month).</li>
<li><b>Cost &amp; trade-off.</b> ~2.5× today's spend; commit latency rises ~1–2 ms (cross-AZ round trip) — acceptable for checkout. Backups + point-in-time recovery still exist for human mistakes (a <code>DELETE</code> replicates instantly to the standby!).</li>
<li><b>Prove it.</b> A scheduled game day kills the primary and the AZ; record the real RTO in the runbook.</li></ol>`,
        complexity: `<p>Cost ≈ 3 web nodes + 2 DB nodes + witness ≈ 2.5–3× baseline. Write latency +1–2 ms. RTO ≈ 45–60 s, RPO = 0, AZ-loss capacity = 100% of peak.</p>`,
        followUps: ['Now require survival of a whole-region failure — what changes (RPO, cost, write path)?', 'A bad deploy kills all three web instances — which of your measures helps?', 'How do you test failover safely in production?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 2 — Timeouts, Retries, Exponential Backoff + Jitter
     ===================================================================== */
  topics.push({
    title: 'Timeouts & Retries: Exponential Backoff, Jitter and Retry Budgets',
    analogy: `<p>You call a friend and it rings. <b>Timeout:</b> after about 6 rings you hang up — you do not hold the phone to your ear for an hour. <b>Retry:</b> you try again. But a polite person waits <i>a bit longer each time</i> (1 minute, then 5, then 20) — that is <b>exponential backoff</b>. And if 1,000 people all dropped the same call at the same moment and all redial at exactly the 1-minute mark, the phone line jams again. So everyone adds a <b>random wiggle</b> to their wait — that is <b>jitter</b>.</p>`,
    explain: `<p>In a distributed system a call can end three ways: <b>success</b>, <b>fast failure</b> (an error right away) or <b>silence</b>. Silence is the dangerous one. Without a limit, your thread waits forever, holding memory, a DB connection and a user's patience.</p>
      <p><b>1. Timeouts — always set them.</b> Default timeouts in many libraries are <i>infinite</i> or 30–60 s. Set at least three:</p>
      <ul><li><b>Connect timeout</b> — time to open the TCP/TLS connection (short: 100 ms–1 s; if the host is up, this is fast).</li>
      <li><b>Read/response timeout</b> — time to wait for the reply after sending (based on the dependency's real latency; a good start is <b>p99 × 1.5–2</b>).</li>
      <li><b>Total deadline</b> — the overall budget for the user's request, shared across all steps and retries. Pass the <i>remaining</i> time down the call chain (gRPC deadlines, <code>X-Request-Deadline</code>). If 800 ms of a 1 s budget is gone, the next service should not start a 5 s query.</li></ul>
      <p><b>2. Retries — fix blips, but be careful.</b> Many failures are brief (a node restarting, a dropped packet). A retry often just works. But retries are also how small outages become big ones. Rules:</p>
      <ul><li><b>Only retry what is safe:</b> idempotent operations (GET, PUT, DELETE, or POST with an <b>idempotency key</b>). A timed-out "charge card" call may have actually succeeded!</li>
      <li><b>Only retry errors that can change:</b> timeouts, connection resets, <code>503</code>, <code>429</code> (obey <code>Retry-After</code>). Never retry <code>400/401/403/404</code> — they will fail identically.</li>
      <li><b>Limit attempts</b> (usually 3 total) <b>and total time</b> (the deadline).</li>
      <li><b>Retry at one layer only.</b> If the browser, gateway, service and SDK each retry 3 times, one user click becomes 3<sup>4</sup> = <b>81</b> calls on the database. This is <b>retry amplification</b>.</li></ul>
      <p><b>3. Exponential backoff.</b> Wait before retry n: <code>delay = min(cap, base × 2<sup>n</sup>)</code>. Example base = 100 ms, cap = 10 s: 100, 200, 400, 800, 1600, 3200, 6400, 10000 ms … It gives a struggling server breathing room, and the wait grows fast so you do not hammer it.</p>
      <p><b>4. Jitter — add randomness.</b> If 10,000 clients fail together and all use plain backoff, they all retry at t+100 ms, then t+300 ms … in <b>synchronised waves</b> (a <i>thundering herd</i>). Jitter spreads them out. The three popular recipes (from the AWS Architecture Blog):</p>
      ${H.table(['Name', 'Formula', 'Notes'], [
        ['Full jitter', '<code>sleep = random(0, min(cap, base × 2<sup>n</sup>))</code>', H.c('g', 'Best default. Spreads load the most, lowest total server work.')],
        ['Equal jitter', '<code>t = min(cap, base × 2<sup>n</sup>); sleep = t/2 + random(0, t/2)</code>', 'Keeps a guaranteed minimum wait; slightly less spread.'],
        ['Decorrelated jitter', '<code>sleep = min(cap, random(base, prev_sleep × 3))</code>', 'Each wait depends on the last one; very good spread, a bit harder to reason about.']
      ])}
      <p><b>5. Retry budgets.</b> Even with backoff, if the whole fleet is retrying during an outage the dependency never recovers. A <b>retry budget</b> says "retries may be at most <b>10%</b> of normal request volume". When the budget is used up, fail fast instead of retrying. (Finagle, Envoy and gRPC have this built in.)</p>
      <p><b>6. Hedged requests</b> (advanced): for latency, not failure — send a duplicate request to a second replica if the first has not answered by the p95 latency, take the first reply, cancel the other. Cuts tail latency a lot for ~5% extra load. Only for idempotent reads.</p>`,
    clues: [
      '"the downstream service is slow / sometimes hangs" → timeouts first, retries second',
      '"transient errors", "occasional 503", "network blips" → retry with exponential backoff + jitter',
      '"many clients retry at the same time", "thundering herd after an outage" → jitter and retry budget',
      '"charge the card" / "send the email" / "create order" + retry → idempotency key, otherwise duplicates',
      '"the call chain has 4 services" → deadline propagation and retry at ONE layer (retry amplification)',
      '"tail latency p99 is bad but average is fine" → tighter timeouts, hedged requests',
      '"the API returned 429 with Retry-After" → honour the header instead of guessing'
    ],
    code: [
      { lang: 'java', title: 'Retry with full jitter and a deadline', code: `/** Retry with exponential backoff + FULL jitter and an overall deadline. */
import java.util.*;
import java.util.concurrent.Callable;

class RetryWithJitter {
    private final int maxAttempts;     // total tries, including the first (e.g. 3)
    private final long baseMs;         // first backoff ceiling (e.g. 100)
    private final long capMs;          // never wait longer than this (e.g. 2000)
    private final Random random = new Random();

    RetryWithJitter(int maxAttempts, long baseMs, long capMs) {
        this.maxAttempts = maxAttempts;
        this.baseMs = baseMs;
        this.capMs = capMs;
    }

    /** Only retry things that can change on a second try. */
    static boolean isRetryable(Exception e) {
        return e instanceof java.net.SocketTimeoutException
            || e instanceof java.net.ConnectException
            || e instanceof java.io.IOException;       // 4xx-style errors should throw a different type
    }

    /** Full jitter: random value in [0, min(cap, base * 2^attempt)]. */
    long backoffMs(int attempt) {
        long ceiling = Math.min(capMs, baseMs * (1L << Math.min(attempt, 20))); // clamp shift: no overflow
        return (long) (random.nextDouble() * ceiling);
    }

    <T> T call(Callable<T> op, long deadlineMs) throws Exception {
        long start = System.currentTimeMillis();
        Exception last = null;
        for (int attempt = 0; attempt < maxAttempts; attempt++) {
            try {
                return op.call();                                  // success -> done
            } catch (Exception e) {
                last = e;
                if (!isRetryable(e)) throw e;                      // 400/403/validation: do not retry
                if (attempt == maxAttempts - 1) break;             // out of attempts
                long wait = backoffMs(attempt);
                long elapsed = System.currentTimeMillis() - start;
                if (elapsed + wait >= deadlineMs) break;           // no time budget left: fail fast
                Thread.sleep(wait);                                // jittered backoff
            }
        }
        throw last;                                                // surface the real error
    }
}` },
      { lang: 'python', run: true, title: 'Payment call policy: timeout, backoff, idempotency key (runnable simulation)', code: `import random, uuid

random.seed(7)

class PaymentGateway:
    """Fake gateway. Remembers idempotency keys, like real ones (Stripe, Razorpay...)."""
    def __init__(self):
        self.done = {}            # key -> charge id
        self.calls = 0
    def charge(self, key, amount, outcome):
        self.calls += 1
        if outcome == "timeout_but_charged":
            self.done.setdefault(key, "ch_" + uuid.uuid4().hex[:6])   # money moved, reply lost
            raise TimeoutError("no reply")
        if outcome == "503":
            raise ConnectionError("503 service unavailable")
        return self.done.setdefault(key, "ch_" + uuid.uuid4().hex[:6])

def backoff(attempt, base=0.1, cap=2.0):
    return random.uniform(0, min(cap, base * 2 ** attempt))       # full jitter

def pay(gw, amount, plan, max_attempts=4, deadline=3.0):
    key = "order-1001-pay"        # SAME key on every retry -> gateway can dedupe
    spent = 0.0
    for attempt in range(max_attempts):
        try:
            charge = gw.charge(key, amount, plan[attempt])
            print(f"attempt {attempt + 1}: OK  charge={charge}")
            return charge
        except (TimeoutError, ConnectionError) as e:
            wait = backoff(attempt)
            print(f"attempt {attempt + 1}: {e}; wait {wait * 1000:.0f} ms")
            spent += wait
            if spent >= deadline:
                break
    raise RuntimeError("payment failed; show 'pending' and reconcile later")

gw = PaymentGateway()
pay(gw, 499, ["timeout_but_charged", "503", "ok", "ok"])
print("distinct charges created:", len(gw.done), "(must be 1)")
` }
    ],
    codeTitle: ['Retry with jitter (Java)', 'Payment retry policy (Python)'],
    viz: [
      {
        title: 'Retry attempts and their backoff delays',
        input: 'base=100 cap=3000 attempts=7 jitter=none',
        inputLabel: 'base ms, cap ms, attempts (1-10), jitter = none | full | equal',
        gen: function (input) {
          var kv = parseKV(input);
          var base = num(kv.base, 100), cap = num(kv.cap, 3000), n = Math.floor(num(kv.attempts, 7)), j = (kv.jitter || 'none').toLowerCase();
          if (!(base > 0 && cap >= base && n >= 1 && n <= 10) || ['none', 'full', 'equal'].indexOf(j) < 0) throw new Error('Example: base=100 cap=3000 attempts=7 jitter=full');
          var seed = 12345;
          function rnd() { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; }
          var fr = [], waits = [], ceils = [], texts = [], labels = [], total = 0;
          fr.push({ narr: 'A call just failed. We will retry with <b>exponential backoff</b>: ceiling = min(cap, base × 2<sup>n</sup>) with base = ' + base + ' ms, cap = ' + cap + ' ms. Jitter mode: <b>' + j + '</b>.', parts: [{ type: 'vars', vals: { base: base + ' ms', cap: cap + ' ms', 'max attempts': n, jitter: j } }] });
          for (var a = 0; a < n - 1; a++) {
            var ceil = Math.min(cap, base * Math.pow(2, a)), w;
            if (j === 'none') w = ceil; else if (j === 'full') w = Math.round(rnd() * ceil); else w = Math.round(ceil / 2 + rnd() * ceil / 2);
            waits.push(w); ceils.push(ceil); total += w; labels.push('wait ' + (a + 1)); texts.push(w + ' ms');
            var capped = base * Math.pow(2, a) > cap;
            fr.push({ narr: 'Attempt ' + (a + 1) + ' failed. Ceiling = min(' + cap + ', ' + base + ' × 2<sup>' + a + '</sup>) = <b>' + ceil + ' ms</b>' + (capped ? ' <span class="c-y">(capped!)</span>' : '') + '. ' + (j === 'none' ? 'No jitter: wait exactly the ceiling.' : j === 'full' ? 'Full jitter: pick a random value between 0 and the ceiling → <b>' + w + ' ms</b>.' : 'Equal jitter: half fixed + half random → <b>' + w + ' ms</b>.'),
              parts: [{ type: 'bars', label: 'Wait before each retry (ms)', values: waits.slice(), texts: texts.slice(), idxLabels: labels.slice(), hl: (function () { var h = {}; h[a] = capped ? 'bad' : 'cur'; return h; })() }, { type: 'vars', vals: { 'attempt that just failed': a + 1, 'this wait': w + ' ms', 'total waited so far': total + ' ms' }, hl: { 'this wait': 'cur' } }] });
          }
          fr.push({ narr: 'After <b>' + n + '</b> attempts we give up and surface the error. Total time spent just waiting: <b>' + total + ' ms</b>. In a real call add the time of each attempt itself, and check this against the user\'s <b>deadline</b> — if the budget is smaller, stop earlier.', parts: [{ type: 'bars', label: 'Final: waits (ms)', values: waits.slice(), texts: texts.slice(), idxLabels: labels.slice(), hl: { 0: 'done' } }, { type: 'vars', vals: { 'total waiting': total + ' ms', outcome: 'give up → error / fallback' }, hl: { outcome: 'bad' } }] });
          return fr;
        }
      },
      {
        title: 'Why jitter matters: 1,000 clients retrying after an outage',
        input: 'jitter=none',
        inputLabel: 'jitter = none | full',
        gen: function (input) {
          var kv = parseKV(input), j = (kv.jitter || 'none').toLowerCase();
          if (j !== 'none' && j !== 'full') throw new Error('Type jitter=none or jitter=full');
          var clients = 1000, base = 100, seed = 99;
          function rnd() { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; }
          var fr = [], buckets = 12; // 12 buckets of 50 ms = 600 ms window
          fr.push({ narr: 'An outage ends at t = 0. All <b>1,000 clients</b> failed at the same instant, so all start their retry timer together. The server can handle ~150 requests per 50 ms bucket.', parts: [{ type: 'vars', vals: { clients: clients, 'server capacity': '150 per 50 ms', jitter: j } }] });
          var tt = [0, 1, 2];
          var load = [], labels = [];
          for (var b = 0; b < buckets; b++) { load.push(0); labels.push((b * 50) + 'ms'); }
          for (var round = 0; round < 3; round++) {
            var cnt = load.slice().map(function () { return 0; });
            var ceilMs = base * Math.pow(2, round);
            for (var c = 0; c < clients; c++) {
              var w = j === 'none' ? ceilMs : rnd() * ceilMs;
              var bk = Math.min(buckets - 1, Math.floor((round === 0 ? w : (round === 1 ? w : w)) / 50));
              cnt[bk]++;
            }
            var peak = Math.max.apply(null, cnt), hl = {};
            cnt.forEach(function (v, i) { if (v > 150) hl[i] = 'bad'; else if (v > 0) hl[i] = 'ok'; });
            fr.push({ narr: 'Retry round ' + (round + 1) + ': ceiling = ' + ceilMs + ' ms. ' + (j === 'none' ? 'Everyone waits exactly ' + ceilMs + ' ms, so <b>all 1,000 land in one bucket</b>. <span class="c-r">Peak = ' + peak + ' requests vs capacity 150 — the server falls over again.</span>' : 'Each client waits a random 0–' + ceilMs + ' ms, so the load is <b>smeared</b> over the window. Peak = <b>' + peak + '</b> per bucket' + (peak > 150 ? ' (still above 150 for the first round, but far lower than 1,000)' : ' — within capacity') + '.'),
              parts: [{ type: 'bars', label: 'Requests arriving per 50 ms bucket (round ' + (round + 1) + ')', values: cnt, idxLabels: labels, hl: hl, texts: cnt.map(String) }, { type: 'vars', vals: { 'peak per bucket': peak, capacity: 150 }, hl: { 'peak per bucket': peak > 150 ? 'bad' : 'ok' } }] });
          }
          fr.push({ narr: 'Takeaway: <b>backoff</b> spaces out one client\'s attempts; <b>jitter</b> spaces out <i>different clients from each other</i>. You need both. Add a retry budget on top so the fleet as a whole cannot exceed ~10% extra load.', parts: [{ type: 'text', html: 'Full jitter turns a <b>spike</b> into a <b>gentle slope</b> — that is the difference between recovering and falling over again.' }] });
          return fr;
        }
      }
    ],
    examples: [
      { title: 'Choosing a read timeout from real latency numbers', html: `<p>The inventory service has p50 = 20 ms, p99 = 120 ms, p99.9 = 400 ms. If you set a 5 s timeout, a hung call ties up a thread for 5 s — and during an incident every thread is hung. If you set 50 ms you cut off 5% of healthy requests. A sensible read timeout is ~<b>p99 × 2 = 250 ms</b>, with 1 retry allowed inside a total budget of 600 ms. Revisit when latency changes.</p>${H.table(['Percentile', 'Latency', 'Meaning'], [['p50', '20 ms', 'half of calls are faster'], ['p99', '120 ms', '1 in 100 is slower'], ['p99.9', '400 ms', '1 in 1000 is slower'], ['Chosen timeout', H.c('g', '250 ms'), 'cuts only the real tail']])}` },
      { title: 'Retry amplification across layers', html: `<p>Browser → gateway → order-service → payment-service → bank. Each layer retries 3 times on failure. When the bank is down, one click produces 3 × 3 × 3 × 3 = <b>81</b> attempts at the bank and <b>27</b> at payment-service. The fix is a policy: <b>retry only at the layer closest to the failing dependency</b> (here, payment-service → bank). Upper layers fail fast and pass a clear error ("503, don't retry me"). Also use a retry budget (≤ 10% extra) at that one layer.</p>${H.table(['Layers retrying', 'Attempts at bank for 1 click'], [['1 (only payment→bank)', '3'], ['2', '9'], ['3', '27'], ['4', H.c('r', '81')]])}` },
      { title: 'Idempotency key saves a double charge', html: `<p>The client calls <code>POST /charge</code> with <code>Idempotency-Key: ord-1001</code>. The gateway charges the card, but the reply is lost (timeout). The client retries with the <b>same key</b>. The gateway looks the key up, sees it already succeeded, and returns the <i>stored result</i> instead of charging again. Without the key the customer is billed twice. Keys should be generated <b>once per user intent</b> (when the order is created), not per HTTP attempt, and stored with the result for 24 h+.</p>` },
      { title: 'Honouring 429 and Retry-After', html: `<p>An API replies <code>429 Too Many Requests</code> with <code>Retry-After: 7</code>. Do <b>not</b> use your own backoff here — wait at least 7 s (plus a little jitter so all clients that got the same header do not return at exactly second 7). If there is no header, fall back to exponential backoff with jitter. If your retry budget is empty, give up and queue the work for later.</p>` }
    ],
    deepDive: `<p><b>Why exponential?</b> If a dependency is overloaded, its recovery time is unknown. Doubling means after k retries you have waited ~2<sup>k</sup> × base in total — you quickly probe longer timescales (milliseconds to tens of seconds) with only O(log T) attempts. Linear backoff would need many more attempts, each adding load.</p>
      <p><b>Why full jitter wins.</b> The AWS simulation (Marc Brooker, 2015) of N clients contending for one resource shows: no jitter → total work grows like N² with synchronized spikes; full jitter → near-minimal total calls and completion time. Decorrelated jitter is close. The intuition: with full jitter each client's retry time is uniform over the window, so the arrival process looks like a smooth Poisson stream instead of a comb.</p>
      <p><b>Retries and queueing theory.</b> A server with capacity C and a request rate λ close to C has exploding queue time. Retries add λ<sub>retry</sub> = λ × failure_rate × attempts. If failure_rate rises (because load rose), retries raise load more — a <b>positive feedback loop</b> (a <i>metastable failure</i>). The system can stay broken even after the original trigger is gone. Defences: retry budgets, circuit breakers, load shedding, and client-side rate limits that <i>drop</i> rather than queue.</p>
      <p><b>Timeouts and the wasted work problem.</b> When the caller times out, the callee often keeps working on a request nobody wants. Propagate <b>cancellation</b> (gRPC cancels the context; HTTP: close the connection and check it) and propagate deadlines so downstream stops early. Set timeouts <i>decreasing</i> down the chain: the outer timeout (1 s) must be larger than the sum of the inner ones (300 ms × up to 2 tries) or the outer will give up while the inner is still happily retrying.</p>
      <p><b>"At-most-once", "at-least-once", "exactly-once".</b> With retries you get at-least-once. To make that look like exactly-once you need idempotent handlers: idempotency keys, natural keys (<code>INSERT … ON CONFLICT DO NOTHING</code>), conditional updates (version numbers), or a dedupe table. Remember the dedupe store must survive failover too.</p>
      <p><b>What to retry on the client side.</b> Mobile clients: retry with jitter but also stop on user cancel, on low battery/offline (use connectivity signals), and honour server hints. SDK defaults (AWS SDK: 3 attempts, full jitter; gRPC: service-config retry policy with maxAttempts, initialBackoff, maxBackoff, backoffMultiplier, retryableStatusCodes) — know that you rarely need to write your own loop.</p>`,
    aiEra: `<p><b>What AI changes:</b> LLM APIs are the new flaky dependency: they are slow (seconds), rate-limited (429 with token-per-minute limits) and occasionally overloaded (529/503). Everything in this topic applies — plus a twist: an LLM call is <b>expensive</b>, so a naive retry of a 30-second generation doubles your bill and your latency. Use shorter streaming timeouts (time-to-first-token and idle-between-tokens, not just one total), provider fallbacks, and resume/cached partial results where possible. AI agents that call tools in loops can create <i>retry storms</i> of their own — cap tool calls per task.</p>
      <p><b>Use AI as a partner:</b> <code>Review this client code and list every call with no timeout, every retry without a cap, and every non-idempotent call that is retried.</code> It is good at spotting missing timeouts in a big diff.</p>
      <p><b>Where AI goes wrong:</b> generated code often does <code>while(true){ try{...}catch{ sleep(1000);} }</code> — fixed delay, no cap, no jitter, retries every exception including 400s. It also forgets idempotency for POST.</p>
      <p><b>What you must still own:</b> deciding what is safe to retry, which layer retries, the numeric budget, and the user-visible behaviour when all retries fail.</p>`,
    problems: [{
      title: 'Design the Retry Policy for a Payment Call', level: 'Medium', tags: ['retries', 'backoff', 'jitter', 'idempotency', 'timeouts'], companies: ['Stripe', 'PayPal', 'Razorpay', 'Amazon'],
      statement: `<p>Your <b>order-service</b> calls an external <b>payment gateway</b> (<code>POST /charge</code>) when a customer clicks "Pay". The gateway p50 = 300 ms, p99 = 1.2 s, and has had 3-minute brownouts twice this year. The user's browser gives up at 10 s. Design the <b>timeout + retry policy</b>: which errors to retry, how many times, what backoff, how to avoid double charges, and what the user sees if everything fails.</p>`,
      constraints: `Peak 300 payments/s. Gateway rate limit 600 req/s. Customers must never be charged twice. Total user-facing budget 10 s.`,
      example: `<p>Timeline of a good run: attempt 1 times out at 2.5 s (the money <i>might</i> have moved) → wait ≈ 0.3 s (jitter) → attempt 2 with the <b>same idempotency key</b> returns the stored success → order confirmed. ${H.c('g', 'One charge, user happy.')}</p>`,
      brute: { why: `<p><b>Naive design:</b> <code>while (!ok) { try { charge(); ok = true } catch (e) { sleep(1000) } }</code>. Failure modes: (1) no timeout → threads hang for minutes during a brownout; (2) infinite retries, fixed 1 s sleep, no jitter → 300 req/s × all clients retry together = hammering a sick gateway; (3) a timeout may mean the charge <i>succeeded</i> — retrying without an idempotency key charges the card again; (4) retries at 4xx (card declined) never succeed; (5) after 10 s the browser already gave up but the server keeps retrying.</p>` },
      mcq: { q: 'The charge call times out after 2.5 s. What is the safest next step?', options: ['Retry with a NEW random idempotency key', 'Retry with the SAME idempotency key after a jittered backoff', 'Assume it failed and tell the user to pay again', 'Retry immediately in a tight loop until it works'], answer: 1, explain: 'The charge might have succeeded. The same key lets the gateway return the stored result instead of charging again. A new key would create a second charge; immediate loops hammer a sick service.' },
      hints: [`<p>Hint 1: A timeout on a payment is <b>ambiguous</b> — the money may have moved. Safety comes from an idempotency key created once per order, not from "don't retry".</p>`, `<p>Hint 2: Timeouts: connect 500 ms, read 2.5 s (≈ 2× p99), total deadline 8 s (leave 2 s margin under the browser's 10 s). Max 3 attempts, full jitter, base 300 ms, cap 2 s.</p>`, `<p>Hint 3: Retry on timeout / connection error / 502 / 503 / 429 (Retry-After). Never on 4xx like "card declined". Add a retry budget (10%) + circuit breaker, and a fallback: mark the order <i>pending</i>, return to the user, reconcile via webhook or a status lookup.</p>`],
      solution: {
        approach: `<p><b>Policy.</b></p><ol>
<li><b>Idempotency first.</b> Generate <code>payment_intent_id</code> when the order is created and send it as <code>Idempotency-Key</code> on <i>every</i> attempt. Store attempt state in our DB (<code>PENDING</code> → <code>SUCCEEDED/FAILED</code>) before calling.</li>
<li><b>Timeouts.</b> Connect 500 ms; read 2.5 s (p99 1.2 s × 2); <b>total deadline 8 s</b> measured from the start of the request, leaving 2 s slack under the browser's 10 s. Remaining deadline is passed to each attempt.</li>
<li><b>Which errors.</b> Retry: connect/read timeout, connection reset, <code>502/503/504</code>, <code>429</code> (wait for <code>Retry-After</code>). Do <b>not</b> retry: <code>400/401/402 declined/403/404/422</code> — surface to the user immediately.</li>
<li><b>Backoff.</b> Max 3 attempts total. Full jitter: wait = random(0, min(2 s, 300 ms × 2<sup>n</sup>)) → ceilings 300 ms then 600 ms. Skip the retry if the remaining deadline is smaller than the wait + one p50.</li>
<li><b>Protect the gateway.</b> Retry budget: retries ≤ 10% of first attempts (≈ 30/s extra at peak), and a circuit breaker that opens when ≥ 50% of the last 20 calls fail; while open, skip the call and go straight to the fallback.</li>
<li><b>If everything fails.</b> Do not say "payment failed" if we do not know. Show <i>"We're confirming your payment"</i>, keep the order in <code>PENDING</code>, and resolve with (a) the gateway webhook, (b) a reconciliation job that queries the gateway by idempotency key every minute for 24 h. Only then email success or failure.</li>
<li><b>Observability.</b> Metrics: attempts per payment, retry rate, budget exhaustion, timeouts, duplicate-key hits (proves dedupe works); alert when retry rate &gt; 5%.</li></ol>
<p><b>Why it is correct:</b> worst-case latency = 8 s deadline &lt; 10 s browser limit; worst-case extra load = 3 attempts × 300/s only for the budgeted fraction; the card can be charged at most once because the key is stable.</p>`,
        complexity: `<p>Worst-case time ≈ 0.5 + 2.5 + 0.3 + 2.5 + 0.6 + 2.5 ≈ 8.9 s without the deadline check → the deadline cuts it to ≤ 8 s. Extra gateway load ≤ 10% (budget).</p>`,
        followUps: ['The gateway has no idempotency-key support — what now?', 'What if the process crashes between "charge succeeded" and "save result"?', 'How would hedged requests change this (hint: should you hedge a payment)?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 3 — Circuit Breakers
     ===================================================================== */
  topics.push({
    title: 'Circuit Breakers: Stop Calling What Is Already Broken',
    analogy: `<p>In your house, the <b>electrical circuit breaker</b> trips when too much current flows, cutting power before the wires catch fire. You fix the toaster, then flip the switch back. A software circuit breaker does the same for calls: if a dependency keeps failing, it <b>"trips" and stops sending requests</b> for a while. Your app fails instantly (or shows a fallback) instead of waiting 2 seconds per call for something that is clearly down — and the sick service gets quiet time to recover.</p>`,
    explain: `<p><b>The problem it solves.</b> Service A calls service B. B becomes slow. A's threads each wait for B's timeout (2 s). Soon all of A's threads are stuck waiting, A stops answering <i>its</i> callers, and the failure <b>cascades</b> up the chain. Retries make it worse: the broken service B is hit with even <i>more</i> traffic exactly when it is weakest.</p>
      <p><b>The idea.</b> Wrap each remote call in a small state machine with <b>three states</b>:</p>
      ${H.table(['State', 'What happens to calls', 'How it leaves this state'], [
        ['<b>CLOSED</b> (normal, "switch on")', 'Calls go through. The breaker quietly counts failures.', 'Too many failures (e.g. 5 in a row, or ≥ 50% of the last 20 calls) → <b>OPEN</b>'],
        ['<b>OPEN</b> (tripped, "switch off")', 'Calls are <b>rejected immediately</b> (microseconds) — return a fallback or an error. No traffic reaches B.', 'After a cool-down (e.g. 30 s) → <b>HALF_OPEN</b>'],
        ['<b>HALF_OPEN</b> ("let me test it")', 'A <b>few trial calls</b> (probes) are allowed through; the rest are still rejected.', 'Probes succeed (e.g. 3 in a row) → <b>CLOSED</b>. Any probe fails → back to <b>OPEN</b> (cool-down restarts).']
      ])}
      <p><b>What counts as a failure?</b> Timeouts, connection errors, <code>5xx</code>. <b>Not</b> a <code>404</code> or a validation error — those are the caller's fault and say nothing about B's health. Many breakers also count <b>slow calls</b> (e.g. &gt; 1 s) as failures, because slow is the usual early sign of trouble.</p>
      <p><b>The knobs.</b></p>
      <ul><li><b>Failure threshold</b> — consecutive count, or a <b>failure rate</b> over a sliding window with a <b>minimum number of calls</b> (otherwise 1 failure out of 1 call = "100% failing" and it trips for nothing).</li>
      <li><b>Open duration</b> — how long to stay OPEN. Too short = hammering a sick service; too long = staying dark after it healed. 10–60 s is common; add a little jitter so a fleet does not all probe in the same second.</li>
      <li><b>Half-open probes</b> — allow only a small number (1–5) of concurrent trial calls.</li>
      <li><b>Scope</b> — one breaker <b>per dependency</b> (even per endpoint or per host), never one global breaker, or one bad API trips calls to healthy ones.</li></ul>
      <p><b>What do you return while OPEN?</b> A <b>fallback</b>: cached data (yesterday's recommendations), a default (empty list, "popular items"), a degraded result (skip the optional widget), a queued write ("we'll process it shortly"), or a clean error with <code>503</code> and <code>Retry-After</code>. Choosing the fallback is a <i>product</i> decision, not just a code one.</p>
      <p><b>Where it lives:</b> in your client library (Resilience4j for Java; Polly for .NET; <code>pybreaker</code> for Python; Hystrix is retired), or in the infrastructure — the service mesh/proxy (Envoy "outlier detection" ejects bad hosts, Istio, Linkerd) so every language gets it.</p>`,
    clues: [
      '"one slow dependency makes the whole site slow" / "cascading failure" → circuit breaker + timeout + bulkhead',
      '"stop hammering a service that is down" / "give it time to recover" → OPEN state with cool-down',
      '"fail fast" / "return cached or default data when the recommendation service is down" → breaker with fallback',
      '"how do you know when the dependency is healthy again?" → HALF_OPEN probes',
      '"retries make the outage worse" → breaker (and retry budget) bounds the retry load',
      '"per-service" / "service mesh" / "Envoy" / "outlier detection" → infrastructure-level breaking'
    ],
    code: [
      { lang: 'java', title: 'A small circuit breaker (CLOSED / OPEN / HALF_OPEN)', code: `import java.util.concurrent.Callable;
import java.util.function.Supplier;
import java.util.function.LongSupplier;

/** Minimal, thread-safe circuit breaker: consecutive-failure threshold, timed OPEN, limited probes. */
class CircuitBreaker {
    enum State { CLOSED, OPEN, HALF_OPEN }

    private final int failureThreshold;      // consecutive failures that trip the breaker
    private final long openMillis;           // how long to stay OPEN before probing
    private final int probesNeeded;          // consecutive probe successes needed to close
    private final LongSupplier clock;        // injectable clock -> easy to unit test

    private State state = State.CLOSED;
    private int failures = 0;                // consecutive failures while CLOSED
    private int probeSuccesses = 0;          // successes while HALF_OPEN
    private boolean probeInFlight = false;   // allow ONE trial call at a time in HALF_OPEN
    private long openedAt = 0;

    CircuitBreaker(int failureThreshold, long openMillis, int probesNeeded, LongSupplier clock) {
        this.failureThreshold = failureThreshold;
        this.openMillis = openMillis;
        this.probesNeeded = probesNeeded;
        this.clock = clock;
    }

    /** Ask permission BEFORE calling the dependency. */
    synchronized boolean allowRequest() {
        if (state == State.OPEN) {
            if (clock.getAsLong() - openedAt >= openMillis) {   // cool-down finished -> test the water
                state = State.HALF_OPEN;
                probeSuccesses = 0;
                probeInFlight = false;
            } else {
                return false;                                   // still OPEN: reject instantly
            }
        }
        if (state == State.HALF_OPEN) {
            if (probeInFlight) return false;                    // only one probe at a time
            probeInFlight = true;
        }
        return true;                                            // CLOSED, or the one allowed probe
    }

    synchronized void onSuccess() {
        if (state == State.HALF_OPEN) {
            probeInFlight = false;
            if (++probeSuccesses >= probesNeeded) {             // healthy again
                state = State.CLOSED;
                failures = 0;
            }
        } else {
            failures = 0;                                       // a success resets the streak
        }
    }

    synchronized void onFailure() {
        if (state == State.HALF_OPEN) {                         // probe failed: back to OPEN, restart timer
            trip();
        } else if (++failures >= failureThreshold) {
            trip();
        }
    }

    private void trip() {
        state = State.OPEN;
        openedAt = clock.getAsLong();
        probeInFlight = false;
        failures = 0;
    }

    synchronized State state() { return state; }

    /** Wrap a remote call. The fallback runs when the breaker rejects OR the call fails. */
    <T> T call(Callable<T> op, Supplier<T> fallback) {
        if (!allowRequest()) return fallback.get();             // fail fast, no network call
        try {
            T result = op.call();
            onSuccess();
            return result;
        } catch (Exception e) {
            onFailure();
            return fallback.get();
        }
    }
}` },
      { lang: 'python', run: true, title: 'Circuit breaker around a flaky dependency (runnable)', code: `import time

class CircuitBreaker:
    def __init__(self, threshold=3, open_for=5.0, probes=2, clock=time.monotonic):
        self.threshold, self.open_for, self.probes, self.clock = threshold, open_for, probes, clock
        self.state, self.fails, self.ok, self.opened_at = "CLOSED", 0, 0, 0.0

    def call(self, fn, fallback):
        if self.state == "OPEN":
            if self.clock() - self.opened_at >= self.open_for:
                self.state, self.ok = "HALF_OPEN", 0       # cool-down over: allow trial calls
            else:
                return fallback()                           # fail fast, no network call
        try:
            result = fn()
        except Exception:
            self.fails += 1
            if self.state == "HALF_OPEN" or self.fails >= self.threshold:
                self.state, self.opened_at, self.fails = "OPEN", self.clock(), 0
            return fallback()
        if self.state == "HALF_OPEN":
            self.ok += 1
            if self.ok >= self.probes:
                self.state, self.fails = "CLOSED", 0
        else:
            self.fails = 0
        return result

# ---- simulate: a recommendation service that is down for ticks 3..9 ----
now = [0.0]
def recs(): 
    if 3 <= now[0] <= 9:
        raise TimeoutError("recs timeout")
    return ["laptop", "mouse"]

cb = CircuitBreaker(threshold=3, open_for=3.0, probes=2, clock=lambda: now[0])
for t in range(0, 16):
    now[0] = float(t)
    out = cb.call(recs, lambda: ["popular-items(cache)"])
    print(f"t={t:2d} state={cb.state:9s} -> {out}")
` }
    ],
    codeTitle: ['Circuit breaker (Java)', 'Circuit breaker simulation (Python)'],
    viz: [
      {
        title: 'The circuit breaker state machine: CLOSED → OPEN → HALF_OPEN',
        input: 's s f f f s s s s s f s s s',
        inputLabel: 'Outcome of each call attempt: s = dependency would succeed, f = would fail. Optional: t=3 open=3 probes=2',
        gen: function (input) {
          var toks = String(input).trim().split(/\s+/), kv = {}, seq = [];
          toks.forEach(function (x) {
            if (x.indexOf('=') > 0) { var p = x.split('='); kv[p[0].toLowerCase()] = Number(p[1]); }
            else if (x.toLowerCase() === 's' || x.toLowerCase() === 'f') seq.push(x.toLowerCase());
            else throw new Error('Use s and f only, e.g. s s f f f s s s');
          });
          if (!seq.length || seq.length > 30) throw new Error('Give 1 to 30 outcomes of s / f');
          var T = kv.t || 3, OPEN = kv.open || 3, PROBES = kv.probes || 2;
          if (!(T >= 1 && T <= 10 && OPEN >= 1 && OPEN <= 10 && PROBES >= 1 && PROBES <= 5)) throw new Error('t 1-10, open 1-10, probes 1-5');
          var state = 'CLOSED', fails = 0, left = 0, okp = 0, fr = [], rej = 0;
          function graph(st, ehl, tag) {
            var hl = {}; hl[st] = st === 'CLOSED' ? 'ok' : (st === 'OPEN' ? 'bad' : 'cur');
            var tags = {}; tags[st] = tag || 'current';
            return { type: 'graph', directed: true, height: 52, label: 'Breaker state', nodes: [
              { id: 'CLOSED', label: 'CLOSED', x: 14, y: 14, shape: 'box', w: 16 },
              { id: 'OPEN', label: 'OPEN', x: 82, y: 14, shape: 'box', w: 16 },
              { id: 'HALF_OPEN', label: 'HALF_OPEN', x: 48, y: 42, shape: 'box', w: 20 }],
              edges: [['CLOSED', 'OPEN', T + ' fails'], ['OPEN', 'HALF_OPEN', 'cool-down'], ['HALF_OPEN', 'CLOSED', PROBES + ' ok'], ['HALF_OPEN', 'OPEN', '1 fail']], hl: hl, ehl: ehl || {}, tags: tags };
          }
          function vars(extra) {
            var v = { state: state, 'consecutive fails': fails, 'open ticks left': left, 'probe successes': okp + '/' + PROBES, 'calls rejected so far': rej };
            return { type: 'vars', vals: v, hl: extra || {} };
          }
          fr.push({ narr: 'Settings: trip after <b>' + T + '</b> consecutive failures, stay OPEN <b>' + OPEN + '</b> ticks, need <b>' + PROBES + '</b> good probes to close. We start <b>CLOSED</b>: calls flow normally.', parts: [graph('CLOSED'), vars()] });
          for (var i = 0; i < seq.length; i++) {
            var would = seq[i], narr, ehl = {}, calls = '';
            if (state === 'OPEN') {
              rej++; left--;
              if (left <= 0) {
                state = 'HALF_OPEN'; okp = 0;
                narr = 'Tick ' + (i + 1) + ': still OPEN → call <b>rejected instantly</b> (fallback served). Cool-down is over, so the breaker moves to <b>HALF_OPEN</b>: the next call is a probe.';
                ehl['OPEN-HALF_OPEN'] = 'cur';
              } else narr = 'Tick ' + (i + 1) + ': breaker is OPEN → call <b>rejected without touching the dependency</b> (' + left + ' tick(s) of cool-down left). The sick service gets quiet time.';
              fr.push({ narr: narr, parts: [graph(state, ehl), vars({ 'calls rejected so far': 'bad' })] });
              continue;
            }
            if (state === 'CLOSED') {
              if (would === 's') { fails = 0; narr = 'Tick ' + (i + 1) + ': call goes through and <span class="c-g">succeeds</span>. Failure streak resets to 0.'; }
              else {
                fails++;
                if (fails >= T) { state = 'OPEN'; left = OPEN; fails = 0; narr = 'Tick ' + (i + 1) + ': call <span class="c-r">fails</span> — that is failure number ' + T + ' in a row. <b>Trip! CLOSED → OPEN.</b>'; ehl['CLOSED-OPEN'] = 'bad'; }
                else narr = 'Tick ' + (i + 1) + ': call <span class="c-r">fails</span> (streak ' + fails + '/' + T + '). Still CLOSED, but counting.';
              }
            } else { // HALF_OPEN
              if (would === 's') {
                okp++;
                if (okp >= PROBES) { state = 'CLOSED'; fails = 0; okp = 0; narr = 'Tick ' + (i + 1) + ': probe <span class="c-g">succeeds</span> — that is ' + PROBES + ' good probes. <b>HALF_OPEN → CLOSED</b>. Traffic is fully back.'; ehl['HALF_OPEN-CLOSED'] = 'ok'; }
                else narr = 'Tick ' + (i + 1) + ': probe <span class="c-g">succeeds</span> (' + okp + '/' + PROBES + '). Not convinced yet — still HALF_OPEN.';
              } else { state = 'OPEN'; left = OPEN; okp = 0; narr = 'Tick ' + (i + 1) + ': probe <span class="c-r">fails</span>. The dependency is not healed. <b>HALF_OPEN → OPEN</b>, cool-down restarts.'; ehl['HALF_OPEN-OPEN'] = 'bad'; }
            }
            fr.push({ narr: narr, parts: [graph(state, ehl), vars({ state: state === 'CLOSED' ? 'ok' : state === 'OPEN' ? 'bad' : 'cur' })] });
          }
          return fr;
        }
      },
      {
        title: 'Cost of NOT having a breaker: time wasted on a dead dependency',
        input: 'timeout=2000 calls=10 threshold=3',
        inputLabel: 'timeout ms, number of calls, trip threshold',
        gen: function (input) {
          var kv = parseKV(input), to = num(kv.timeout, 2000), n = Math.floor(num(kv.calls, 10)), th = Math.floor(num(kv.threshold, 3));
          if (!(to >= 100 && n >= 3 && n <= 14 && th >= 1 && th <= n)) throw new Error('Example: timeout=2000 calls=10 threshold=3');
          var fr = [], without = [], withB = [], lab = [], cumA = 0, cumB = 0;
          fr.push({ narr: 'The dependency is <b>completely down</b>. Each call waits the full timeout of <b>' + to + ' ms</b> before failing. Compare thread-time wasted with and without a breaker (threshold ' + th + ').', parts: [{ type: 'vars', vals: { timeout: to + ' ms', calls: n, 'breaker trips after': th + ' failures' } }] });
          for (var i = 1; i <= n; i++) {
            lab.push('call ' + i);
            without.push(to); cumA += to;
            var fast = i > th;
            withB.push(fast ? 1 : to); cumB += fast ? 1 : to;
            fr.push({ narr: 'Call ' + i + ': <b>without</b> breaker → waits ' + to + ' ms (thread blocked). <b>With</b> breaker → ' + (fast ? '<span class="c-g">rejected in ~1 ms (OPEN)</span>' : 'still CLOSED, waits ' + to + ' ms and counts the failure') + '.',
              parts: [{ type: 'bars', label: 'Time this call blocks a thread (ms) — NO breaker', values: without.slice(), idxLabels: lab.slice(), hl: (function () { var h = {}; h[i - 1] = 'bad'; return h; })() }, { type: 'bars', label: 'Time this call blocks a thread (ms) — WITH breaker', values: withB.slice(), idxLabels: lab.slice(), hl: (function () { var h = {}; h[i - 1] = fast ? 'ok' : 'cur'; return h; })() }, { type: 'vars', vals: { 'total thread-ms, no breaker': cumA, 'total thread-ms, with breaker': cumB }, hl: { 'total thread-ms, with breaker': 'ok' } }] });
          }
          fr.push({ narr: 'Result: <b>' + cumA + ' ms</b> wasted without the breaker vs <b>' + cumB + ' ms</b> with it — about <b>' + Math.round(cumA / cumB) + '×</b> less. Fewer stuck threads means your own service stays alive, and the dependency receives no traffic to recover from.', parts: [{ type: 'table', columns: ['', 'thread-ms blocked', 'effect'], rows: [['No breaker', cumA, 'threads pile up → cascade'], ['Breaker', cumB, 'fails fast → fallback']], hl: { 1: 'ok', 0: 'bad' } }] });
          return fr;
        }
      }
    ],
    examples: [
      { title: 'Recommendations widget on a product page', html: `<p>The product page calls 6 services. <i>Recommendations</i> starts timing out. Without a breaker every page view waits 2 s for it and the page crawls. With a breaker: after 5 failures it opens, and the page renders in 150 ms with the fallback <b>"Popular right now"</b> (a cached list refreshed every 10 minutes). Customers can still buy; they just see less-personalised suggestions. The breaker is <b>per dependency</b>, so payments and inventory stay untouched.</p>${H.table(['Dependency', 'Critical?', 'Fallback when OPEN'], [['Recommendations', 'No', 'cached "popular" list'], ['Reviews', 'No', 'hide the section'], ['Inventory', 'Yes', 'show "check availability at checkout"'], ['Payments', 'Yes', 'fail clearly; queue as PENDING']])}` },
      { title: 'Failure RATE with a minimum call count', html: `<p>A busy service makes 200 calls/s. Using "5 failures in a row" is too jumpy for noisy traffic. Better: look at the last <b>20 s</b> sliding window, trip if <b>≥ 50% fail</b> <i>and</i> there were at least <b>20 calls</b>. Why the minimum? At 3 a.m. one failed call out of one call is "100% failure" — tripping on that is silly.</p>${H.table(['Window', 'Calls', 'Failures', 'Rate', 'Trip?'], [['quiet', '1', '1', '100%', 'No — below min calls'], ['busy, healthy', '400', '8', '2%', 'No'], ['busy, sick', '380', '210', '55%', H.c('r', 'Yes')]])}` },
      { title: 'Slow calls count too', html: `<p>Dependency B still returns <code>200 OK</code> — but takes 4 s instead of 80 ms. Pure error counting never trips, yet your threads are all tied up. Configure a <b>slow-call threshold</b> (e.g. &gt; 1 s) and a <b>slow-call rate</b> (e.g. ≥ 60%) to open the breaker. In Resilience4j this is <code>slowCallDurationThreshold</code> and <code>slowCallRateThreshold</code>.</p>` },
      { title: 'Breaker + retry together', html: `<p>Order: <b>retry wraps breaker wraps timeout</b> (outer → inner), or retry inside depending on library. Key rule: when the breaker is OPEN, a "call not permitted" exception must <b>not</b> be retried — otherwise the retry loop spins on a closed door. Mark it non-retryable, and go straight to the fallback.</p>` }
    ],
    deepDive: `<p><b>Sliding windows.</b> Count-based (last N calls) is simple and memory-bounded; time-based (last T seconds, split into 1-second buckets) reacts consistently regardless of traffic. Use buckets rather than storing every call — O(buckets) memory and O(1) update. Resilience4j uses a circular array for count windows and a ring of partial aggregations for time windows.</p>
      <p><b>The thundering herd on recovery.</b> If the cool-down expires at the same instant in 500 instances, all 500 send probes and hit the service together. Solutions: random jitter on the open duration (±20%), one probe per instance (not per thread), and <b>ramp-up</b>: after CLOSED, slowly admit traffic (10% → 50% → 100%), or let the server shed load. Envoy's outlier detection uses increasing ejection time (base × number of ejections) so repeat offenders stay out longer.</p>
      <p><b>Client vs server vs mesh.</b> Client-side breakers (library) know the exact call and can return a smart fallback. Mesh-level breakers (Envoy circuit-breaking = max connections / max pending requests / max retries, plus outlier detection) give uniform protection to every language but can only return a generic error. Use both: mesh for safety, library for graceful degradation.</p>
      <p><b>Related protection tools — know the differences.</b> <b>Timeout</b>: bounds one call. <b>Retry</b>: hides blips. <b>Circuit breaker</b>: stops calling something unhealthy. <b>Bulkhead</b>: limits how much of <i>my</i> capacity one dependency may consume. <b>Rate limiter</b>: protects <i>me</i> from callers. <b>Load shedding</b>: server drops excess work early to stay healthy. Together they form "defence in depth"; none replaces the others.</p>
      <p><b>Pitfalls.</b> (1) One breaker for all endpoints hides a single bad endpoint behind everyone's failure. (2) Fallbacks that call another failing service just move the problem — keep fallbacks local and cheap (cache, constant). (3) Stateful breakers per instance mean each instance learns separately; fine, usually preferable to a shared Redis breaker which is itself a dependency. (4) Test it: a breaker that has never tripped in staging will surprise you in production (use fault injection). (5) Alert on <b>state changes</b> — an OPEN breaker is a symptom somebody needs to see, not just a silent fallback.</p>
      <p><b>Metastable failures.</b> After a breaker closes, a rush of queued work may push the dependency over again, flapping CLOSED↔OPEN. Hysteresis (more probes, gradual ramp) and load shedding on the server are the cure.</p>`,
    aiEra: `<p><b>What AI changes:</b> every LLM provider call, vector-DB query and tool call in an AI product is a remote dependency that can be slow or down. Breakers are now standard in <b>LLM gateways</b> (LiteLLM, Portkey, internal routers): when provider A has 40% errors, the gateway trips A's breaker and routes to provider B or a smaller local model — a <i>fallback chain</i>. Agents need a breaker per <b>tool</b>, otherwise an agent loop keeps calling a broken tool and burns tokens. The "fallback" for an AI feature can be a cheaper model, a cached answer, or a plain non-AI search.</p>
      <p><b>Use AI as a partner:</b> <code>Given these service SLOs and call graph, suggest a breaker configuration (window, threshold, min calls, open duration) per dependency, and explain the fallback options for each.</code> Then check numbers against real latency data.</p>
      <p><b>Where AI goes wrong:</b> it picks "5 failures, 30 s" for everything, forgets min-calls, counts 4xx as failures, or writes a breaker that is not thread-safe.</p>
      <p><b>What you must still own:</b> which fallback is acceptable to the business, which errors count, and verifying behaviour with fault injection before an incident does it for you.</p>`,
    problems: [{
      title: 'Add a Circuit Breaker to a Flaky Recommendation Service', level: 'Medium', tags: ['circuit breaker', 'fallback', 'cascading failure', 'timeouts'], companies: ['Netflix', 'Amazon', 'Uber'],
      statement: `<p>The <b>home-page service</b> calls <b>recommendation-service</b> on every page load (3,000 requests/s). Recommendations occasionally goes slow (p99 jumps from 80 ms to 6 s for ~10 minutes) and last Tuesday that froze the whole home page: all 400 worker threads were stuck waiting. Add a circuit breaker and decide every parameter.</p>`,
      constraints: `Home page SLO: p99 &lt; 400 ms. Recommendations is "nice to have" (not required to render). Stale recommendations up to 1 hour are acceptable. 20 home-page instances.`,
      example: `<p>Without a breaker: 3,000 req/s × 6 s ≈ <b>18,000 threads</b> wanted, only 400 exist → page dead in under a second. With a breaker: ${H.c('g', 'after ~20 slow calls it opens, the page renders in ~120 ms using cached picks')}.</p>`,
      brute: { why: `<p><b>Naive design:</b> keep the default 30 s HTTP timeout, retry 3 times, and let each page request wait for recommendations. During a slowdown each request holds a thread up to 90 s; with 3,000 req/s all 400 threads are consumed in ~0.13 s and <i>every</i> endpoint (not just home) stops answering. The retries multiply load on recommendation-service by 3×, so it can never recover.</p>` },
      mcq: { q: 'The breaker for recommendations is OPEN. What should the home-page service do for each request?', options: ['Queue the request until the breaker closes', 'Return the fallback (cached/popular list) immediately and render the page', 'Retry the call 3 times with backoff', 'Return HTTP 500 for the whole page'], answer: 1, explain: 'OPEN means fail fast. Recommendations are optional, so serve a cheap local fallback and keep the page healthy. Queueing and retrying re-create the thread pile-up; a 500 turns a minor outage into a major one.' },
      hints: [`<p>Hint 1: It is a <b>slow</b> failure, not an error failure — so timeouts and a <b>slow-call</b> rate must be part of the trip condition.</p>`, `<p>Hint 2: Timeout 150 ms (≈ p99 80 ms × ~2). Breaker per instance: sliding window 10 s, min 50 calls, trip if failures+slow ≥ 50%, open 20 s ±20% jitter, 3 probes.</p>`, `<p>Hint 3: Fallback = last-good personalised list in a local in-memory cache (TTL 1 h) else "popular" list. Put recommendations in its own small thread pool (bulkhead). Emit state-change metrics and alert.</p>`],
      solution: {
        approach: `<p><b>Design.</b></p><ol>
<li><b>Timeout.</b> Per call 150 ms (healthy p99 is 80 ms). Never wait on this dependency longer than it deserves; the page's budget is 400 ms in total.</li>
<li><b>Failure definition.</b> Timeouts, connection errors, <code>5xx</code>, and any call slower than 120 ms count as "bad". 4xx do not.</li>
<li><b>Breaker config (per instance, per dependency).</b> Time-based sliding window of 10 s; <b>minimum 50 calls</b> (each instance sees ~150 calls/s, so this fills in &lt; 1 s); trip when <b>≥ 50%</b> of calls are bad; stay OPEN <b>20 s ± 20% jitter</b>; HALF_OPEN allows 1 concurrent probe, needs 3 consecutive good probes to close.</li>
<li><b>Fallback.</b> Return the user's last-good list from a local cache (TTL 1 h; refreshed on every successful call) → else a precomputed "popular for your region" list → else an empty widget. No network call in the fallback.</li>
<li><b>Retries.</b> At most 1 retry, only if the breaker is CLOSED and budget allows; <i>never</i> retry a "call not permitted" rejection.</li>
<li><b>Bulkhead.</b> Run recommendation calls in their own semaphore/thread pool of 40 slots, so even before the breaker trips it can only take 40 of the 400 threads.</li>
<li><b>Observability.</b> Metrics: breaker state, calls rejected, fallback served, slow-call rate. Alert when the breaker is OPEN &gt; 2 minutes or fallback rate &gt; 20%. Dashboard shows state timeline per instance.</li>
<li><b>Test.</b> Inject 6 s latency in staging; confirm p99 stays &lt; 400 ms, the breaker opens within 2 s, probes close it after recovery, and no thundering herd when it closes (jittered cool-down, ramp-up).</li></ol>
<p><b>Why this works:</b> the worst a slowdown can cost is ~40 slots for the first second, then ~0 threads (calls rejected in microseconds) — the home page keeps its 400 ms SLO and recommendation-service gets near-zero traffic to heal.</p>`,
        complexity: `<p>Overhead per call: O(1) counter update (bucketed window). Memory: ~10 buckets per breaker. Blocked threads at worst ≈ bulkhead size (40) instead of 400.</p>`,
        followUps: ['Where would a shared (cross-instance) breaker help, and why is it risky?', 'The cached fallback itself is stale after a deploy — how do you handle cold caches?', 'How would you do this in the mesh instead of in code?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 4 — Bulkheads, Load Shedding, Graceful Degradation
     ===================================================================== */
  topics.push({
    title: 'Bulkheads, Load Shedding & Graceful Degradation',
    analogy: `<p>A ship's hull is split into <b>watertight compartments</b> called <i>bulkheads</i>. If one compartment is breached and floods, the others stay dry and the ship floats. The Titanic is the famous example of bulkheads that were <i>not</i> sealed at the top — water spilled over from one compartment to the next.</p>
      <p>Software is the same: give each dependency or customer its <b>own small slice</b> of threads/connections, so one flooded slice cannot sink the rest. And when the whole ship is overloaded, a good crew <b>throws cargo overboard</b> (load shedding) rather than sinking with all of it.</p>`,
    explain: `<p><b>Bulkhead pattern.</b> Isolate resources so a failure in one area cannot use up everything. The shared resources that run out first are: <b>threads</b>, <b>database/HTTP connections</b>, <b>memory</b>, and <b>queue space</b>. Typical bulkheads:</p>
      <ul><li><b>Per-dependency thread pools or semaphores.</b> Calls to Payments use pool A (max 30), Recommendations use pool B (max 10). If Recs hangs, it can pin at most 10 threads; Payments still has its 30.</li>
      <li><b>Per-tenant or per-priority limits.</b> One noisy customer cannot take more than 20% of capacity; "free tier" traffic is capped so "paid" always has headroom.</li>
      <li><b>Separate deployments</b> — admin API and public API run as different services; batch jobs on different machines than the user-facing path.</li>
      <li><b>Cells (cell-based architecture).</b> The whole stack is cloned into independent cells that each serve a slice of customers (e.g. 5%). A bad deploy or poison request takes down one cell, not everyone. <b>Shuffle sharding</b> goes further: each customer is mapped to a random small set of workers, so two customers rarely share the same set — blast radius shrinks quadratically.</li></ul>
      ${H.table(['Bulkhead style', 'How', 'Good for', 'Watch out'], [
        ['<b>Thread-pool</b>', 'Separate bounded executor per dependency; calls run on that pool, caller times out waiting', 'Blocking I/O; also enforces a timeout cleanly', 'Context switches, more memory'],
        ['<b>Semaphore</b>', 'Count of in-flight calls; <code>tryAcquire</code> or reject', 'Cheap; async/reactive code; in-process limits', 'Cannot interrupt a hung call by itself — needs a timeout'],
        ['<b>Process / container / cell</b>', 'Separate OS process, pod, or whole stack', 'Strong isolation (memory leaks, crashes)', 'Cost, operational weight']
      ])}
      <p><b>How big should a pool be?</b> Use <b>Little's Law</b>: <code>in-flight requests L = arrival rate λ × time in system W</code>. If Payments gets 200 calls/s and each takes 150 ms, L = 200 × 0.15 = <b>30</b> concurrent calls. Add ~30–50% headroom → 40. If it slows to 3 s, L would be 600 — the bulkhead stops that from eating your whole server.</p>
      <p><b>Load shedding.</b> When demand is more than capacity, you cannot serve everyone, and trying to makes things <i>worse</i>: queues grow, every request becomes slow, clients time out, retry, and your servers spend all their time on requests nobody is waiting for. <b>Shedding</b> = deliberately reject some requests <i>early and cheaply</i> (HTTP <code>503</code>/<code>429</code> with <code>Retry-After</code>) so the ones you accept finish quickly. Ways:</p>
      <ul><li><b>Bounded queues</b> — a queue of 100, not unlimited; when full, reject. An unbounded queue just hides overload as latency.</li>
      <li><b>Concurrency limits</b> — max N in-flight; the (N+1)th gets rejected immediately (adaptive versions like Netflix's <code>concurrency-limits</code> tune N automatically).</li>
      <li><b>Priority shedding</b> — drop analytics and prefetch first, search next, checkout last.</li>
      <li><b>LIFO under overload</b> — serve the newest request first; the oldest has probably timed out already.</li>
      <li><b>Drop requests whose deadline already passed</b> — doing the work is pure waste.</li></ul>
      <p><b>Graceful degradation.</b> Instead of all-or-nothing, return a <i>reduced</i> product: hide recommendations, show cached prices, turn off images, switch search to "simple mode", disable expensive features with feature flags ("brownout"). Decide in advance which features are <b>critical</b> (login, browse, pay) and which are <b>optional</b>.</p>`,
    clues: [
      '"one tenant / one noisy neighbour hogs resources" → bulkhead per tenant, quotas, shuffle sharding',
      '"slow dependency exhausts the thread pool" → per-dependency pool/semaphore + timeout + circuit breaker',
      '"traffic spike 10× during a flash sale" → load shedding, admission control, queue + backpressure, prioritise checkout',
      '"limit the blast radius" / "a bad deploy should only affect a small part of users" → cells, canary, shuffle sharding',
      '"autoscaling takes minutes but the spike is in seconds" → you need shedding and degradation, not just scale-out',
      '"unbounded queue" / "latency keeps growing under load" → bounded queue + reject (fail fast)'
    ],
    code: [
      { lang: 'java', title: 'Semaphore bulkhead + bounded thread pool', code: `import java.util.concurrent.*;
import java.util.function.Supplier;

/** Semaphore bulkhead: at most 'maxConcurrent' calls in flight for ONE dependency. */
class Bulkhead {
    final Semaphore permits;          // package-private so the demo below can drain it
    private final String name;

    Bulkhead(String name, int maxConcurrent) {
        this.name = name;
        this.permits = new Semaphore(maxConcurrent);
    }

    <T> T call(Callable<T> op, Supplier<T> fallback) {
        if (!permits.tryAcquire()) {              // no free slot: shed this call instantly (do NOT wait)
            return fallback.get();
        }
        try {
            return op.call();
        } catch (Exception e) {
            return fallback.get();
        } finally {
            permits.release();                    // ALWAYS give the slot back, even on failure
        }
    }

    int available() { return permits.availablePermits(); }
}

class Pools {
    /** A bounded pool: 10 threads, 20 waiting tasks, then REJECT (AbortPolicy) -> load shedding. */
    static ThreadPoolExecutor boundedPool(String namePrefix) {
        return new ThreadPoolExecutor(
            10, 10,                                        // core = max = 10 threads
            0L, TimeUnit.MILLISECONDS,
            new ArrayBlockingQueue<>(20),                  // BOUNDED queue (never use an unbounded one)
            r -> new Thread(r, namePrefix + "-worker"),    // name threads: they show up in thread dumps
            new ThreadPoolExecutor.AbortPolicy());         // full -> throws RejectedExecutionException
    }

    public static void main(String[] args) throws Exception {
        Bulkhead recs = new Bulkhead("recommendations", 2);
        // pretend both slots are stuck on slow calls, then a third call arrives:
        recs.permits.drainPermits();
        String r = recs.call(() -> "live-recs", () -> "fallback: popular items");
        System.out.println(r);                              // prints the fallback immediately
    }
}` },
      { lang: 'python', run: true, title: 'Size a bulkhead with Little\'s Law (runnable)', code: `import math

def pool_size(rate_per_s, latency_s, headroom=1.4):
    """L = lambda * W  (concurrent requests in flight), plus safety headroom."""
    return math.ceil(rate_per_s * latency_s * headroom)

deps = {
    "payments":        (200, 0.150),
    "search":          (900, 0.040),
    "recommendations": (600, 0.080),
}
total = 0
for name, (rate, lat) in deps.items():
    n = pool_size(rate, lat)
    total += n
    print(f"{name:16s} rate={rate:4d}/s latency={lat * 1000:4.0f}ms -> pool={n}")
print("total threads needed:", total)

# What if recommendations degrades to 3 seconds?  Without a bulkhead it wants:
want = math.ceil(600 * 3.0)
print("recs would want", want, "concurrent calls; bulkhead caps it at", pool_size(600, 0.080))
` }
    ],
    codeTitle: ['Bulkhead & bounded pool (Java)', 'Little\'s Law sizing (Python)'],
    viz: [
      {
        title: 'Bulkhead thread pools: a hung dependency, with and without isolation',
        input: 'mode=shared ticks=6',
        inputLabel: 'mode = shared | bulkhead, ticks (2-8)',
        gen: function (input) {
          var kv = parseKV(input), mode = (kv.mode || 'shared').toLowerCase(), ticks = Math.floor(num(kv.ticks, 6));
          if (['shared', 'bulkhead'].indexOf(mode) < 0 || !(ticks >= 2 && ticks <= 8)) throw new Error('Example: mode=bulkhead ticks=6');
          var shared = mode === 'shared';
          // pools: shared = one pool of 8; bulkhead = P:3, S:3, R:2
          var pools = shared ? [{ name: 'shared (8)', size: 8, slots: [] }] : [{ name: 'Payments (3)', size: 3, slots: [] }, { name: 'Search (3)', size: 3, slots: [] }, { name: 'Recs (2)', size: 2, slots: [] }];
          var stat = { P: { ok: 0, rej: 0 }, S: { ok: 0, rej: 0 }, R: { ok: 0, rej: 0 } };
          function poolFor(t) { return shared ? pools[0] : pools[t === 'P' ? 0 : t === 'S' ? 1 : 2]; }
          function gridPart() {
            var maxN = 0; pools.forEach(function (p) { if (p.size > maxN) maxN = p.size; });
            var rows = [], hl = {};
            pools.forEach(function (p, r) {
              var row = [];
              for (var c = 0; c < maxN; c++) {
                if (c >= p.size) { row.push(''); continue; }
                var v = p.slots[c];
                row.push(v ? v : '·');
                if (v === 'R') hl[r + ',' + c] = 'bad'; else if (v === 'P') hl[r + ',' + c] = 'ok'; else if (v === 'S') hl[r + ',' + c] = 'win';
              }
              rows.push(row);
            });
            var ch = []; for (var k = 1; k <= maxN; k++) ch.push('t' + k);
            return { type: 'grid', label: 'Thread slots (P = Payments, S = Search, R = Recommendations HUNG, · = free)', rows: rows, rowHead: pools.map(function (p) { return p.name; }), colHead: ch, hl: hl };
          }
          function statPart() {
            return { type: 'table', label: 'Requests so far', columns: ['type', 'served', 'rejected / failed'], rows: [['Payments', stat.P.ok, stat.P.rej], ['Search', stat.S.ok, stat.S.rej], ['Recommendations', stat.R.ok + ' (all hang)', stat.R.rej]], hl: { 0: stat.P.rej > 0 ? 'bad' : 'ok', 1: stat.S.rej > 0 ? 'bad' : 'ok' } };
          }
          var fr = [];
          fr.push({ narr: (shared ? 'ONE shared pool of 8 threads serves everything.' : 'Three <b>bulkheads</b>: Payments 3 threads, Search 3, Recommendations 2.') + ' The Recommendations service is <b>hung</b>: its calls never return. Each tick the app receives 1 Payment, 1 Search and 2 Recs requests. Payment and Search finish within the tick.', parts: [gridPart(), statPart()] });
          for (var t = 1; t <= ticks; t++) {
            // finish P and S from previous tick
            pools.forEach(function (p) { p.slots = p.slots.map(function (v) { return (v === 'P' || v === 'S') ? null : v; }); });
            var notes = [];
            ['P', 'S', 'R', 'R'].forEach(function (typ) {
              var p = poolFor(typ), idx = -1;
              for (var i = 0; i < p.size; i++) { if (!p.slots[i]) { idx = i; break; } }
              if (idx >= 0) { p.slots[idx] = typ; stat[typ].ok++; }
              else { stat[typ].rej++; notes.push(typ === 'P' ? '<span class="c-r">Payment REJECTED</span>' : typ === 'S' ? '<span class="c-r">Search REJECTED</span>' : 'a Recs call rejected instantly (fast fail)'); }
            });
            fr.push({ narr: 'Tick ' + t + ': new requests arrive. ' + (notes.length ? notes.join('; ') + '.' : 'Everything found a free thread.') + (shared ? ' Each hung Recs call keeps its thread <b>forever</b>, so the pool slowly fills with R.' : ' Recs can fill only <b>its own 2</b> slots; Payments and Search have their own threads.'),
              parts: [gridPart(), statPart()] });
          }
          fr.push({ narr: shared ? '<span class="c-r"><b>Cascade:</b></span> the pool is full of hung R threads, so healthy Payments and Search are being rejected too. One optional dependency took down the whole service.' : '<span class="c-g"><b>Contained:</b></span> Recs is saturated (and failing fast), but Payments and Search kept being served every tick. Run again with <code>mode=shared</code> to see the difference.', parts: [gridPart(), statPart()] });
          return fr;
        }
      },
      {
        title: 'Load shedding: goodput as offered load rises (illustrative model)',
        input: 'capacity=100 shed=on',
        inputLabel: 'capacity (requests/s) and shed = on | off',
        gen: function (input) {
          var kv = parseKV(input), cap = num(kv.capacity, 100), shed = (kv.shed || 'on').toLowerCase();
          if (!(cap >= 10 && cap <= 10000) || ['on', 'off'].indexOf(shed) < 0) throw new Error('Example: capacity=100 shed=off');
          var loads = [0.5, 0.8, 1.0, 1.2, 1.5, 2.0, 3.0], fr = [], vals = [], lab = [], tx = [];
          fr.push({ narr: 'A service can finish <b>' + cap + '</b> requests/s. Watch useful throughput ("goodput") as offered load rises. Shedding is <b>' + shed + '</b>. (Model: without shedding, past capacity queues grow, requests time out, and the share of work that is still useful falls roughly like capacity ÷ load squared.)', parts: [{ type: 'vars', vals: { capacity: cap + '/s', shedding: shed } }] });
          loads.forEach(function (m) {
            var off = Math.round(cap * m), good;
            if (m <= 1) good = off;
            else if (shed === 'on') good = cap;
            else good = Math.max(5, Math.round(cap / (m * m)));
            vals.push(good); lab.push(off + '/s'); tx.push(good + '');
            fr.push({ narr: 'Offered <b>' + off + '/s</b> (' + Math.round(m * 100) + '% of capacity) → goodput <b>' + good + '/s</b>. ' + (m <= 1 ? 'Under capacity: everything is served.' : shed === 'on' ? 'The excess ' + (off - cap) + '/s gets an instant <code>503</code> (cheap), so the accepted requests finish on time.' : '<span class="c-r">Queues build, latency rises past client timeouts, work is done for nobody — goodput collapses.</span>'),
              parts: [{ type: 'bars', label: 'Goodput (successful requests per second) at each offered load', values: vals.slice(), texts: tx.slice(), idxLabels: lab.slice(), hl: (function () { var h = {}; h[vals.length - 1] = m <= 1 ? 'ok' : (shed === 'on' ? 'sel' : 'bad'); return h; })() }] });
          });
          fr.push({ narr: shed === 'on' ? 'With shedding, goodput stays flat at capacity: <b>serving some users well beats serving nobody</b>.' : 'Without shedding the system does <i>less</i> useful work the harder it is pushed — the classic "congestion collapse". Try <code>shed=on</code>.', parts: [{ type: 'text', html: 'Rule: <b>reject early, reject cheaply, reject the least important first.</b>' }] });
          return fr;
        }
      }
    ],
    examples: [
      { title: 'Sizing three pools with Little\'s Law', html: `<p>Use L = λ × W with 40% headroom.</p>${H.table(['Dependency', 'λ (req/s)', 'W (s)', 'L = λ × W', 'Pool (×1.4)'], [['Payments', '200', '0.150', '30', '42'], ['Search', '900', '0.040', '36', '51'], ['Recs', '600', '0.080', '48', '68']])}<p>If Recs slows to 3 s, it would want 600 × 3 = <b>1,800</b> concurrent calls. Its bulkhead of 68 caps the damage at 68 threads; everything else is fast-failed to the fallback.</p>` },
      { title: 'Noisy neighbour in a multi-tenant API', html: `<p>Tenant "Acme" runs a script sending 5,000 req/s. Without isolation they use 90% of capacity and everyone's p99 goes up. Fixes, layered: (1) <b>per-tenant rate limit</b> (token bucket) at the gateway; (2) <b>per-tenant concurrency cap</b> (max 20% of worker slots); (3) <b>weighted fair queueing</b> so each tenant gets a fair share first; (4) for enterprise customers, <b>dedicated cells</b>. Message to Acme: <code>429 Too Many Requests</code>, <code>Retry-After: 2</code>.</p>` },
      { title: 'Shuffle sharding: shrink the blast radius', html: `<p>100 workers. Each customer is assigned a random set of <b>4</b> workers. A poison-pill customer who crashes workers takes down their 4. Another customer is affected only if all their 4 workers overlap — probability ≈ 1 / C(100,4) ≈ <b>1 in 3.9 million</b>. Clients that retry across their 4 workers still get served by a healthy one. Amazon Route 53 uses this idea so one customer's DDoS cannot take down others.</p>${H.table(['Design', 'Customers hurt by 1 bad customer'], [['All share 100 workers', H.c('r', '100%')], ['Split into 25 fixed groups of 4', '4%'], ['Shuffle sharding (4 of 100)', H.c('g', '≈ 0.00003%')]])}` },
      { title: 'Graceful degradation ladder for a flash sale', html: `<p>Pre-plan levels you can switch to with a flag, as load climbs:</p>${H.table(['Level', 'Trigger (CPU / queue)', 'What we turn off'], [['0 Normal', '< 60%', '—'], ['1 Light', '60–75%', 'recommendations carousel, reviews summary'], ['2 Medium', '75–90%', 'image zoom, search facets, personalisation; cache TTLs ×5'], ['3 Heavy', '> 90%', 'search → simple mode; shed anonymous traffic; waiting-room queue for new visitors'], ['4 Critical', 'DB lag high', 'only login, cart, checkout pages']])}` }
    ],
    deepDive: `<p><b>Why unbounded queues are dangerous.</b> With an arrival rate λ above service rate μ, a queue grows without bound and the wait is q/μ. Even at λ slightly <i>below</i> μ the average wait explodes as utilisation ρ → 1 (for a simple M/M/1 queue, mean wait ∝ ρ / (1 − ρ): 50% → 1×, 90% → 9×, 99% → 99×). That is why systems should run well below 100% (60–70% target utilisation), and why queues must be <b>bounded</b>: a short queue turns overload into rejections; a long one turns it into timeouts <i>and</i> wasted work.</p>
      <p><b>Adaptive concurrency limits.</b> Instead of a hard-coded limit, algorithms like AIMD (additive increase, multiplicative decrease — same idea as TCP congestion control), Vegas or Gradient measure latency: if latency rises above the no-load baseline, shrink the limit; otherwise grow it slowly. Netflix's <code>concurrency-limits</code> library and Envoy's adaptive concurrency filter do this, so you do not have to guess the right N as hardware and dependencies change.</p>
      <p><b>Backpressure.</b> Overload should travel <i>upstream</i> as a signal instead of silently buffering: HTTP/2 flow control, TCP windows, reactive streams <code>request(n)</code>, Kafka consumers pulling at their own pace, queues returning "full". Where a producer can slow down (batch jobs), push back; where it cannot (human users), shed.</p>
      <p><b>Priority and fairness.</b> Tag requests with a criticality class at the edge (Google's SRE: CRITICAL_PLUS, CRITICAL, SHEDDABLE_PLUS, SHEDDABLE) and propagate it through the call tree, so every service sheds in the same order. Combine with fair queueing so a single tenant of the top class cannot starve the others.</p>
      <p><b>Thread pool bulkhead vs semaphore.</b> A thread-pool bulkhead gives you a hard timeout and isolates the caller from <i>blocking</i> calls (the caller thread is free to time out and give up). A semaphore is cheaper but the call runs on the caller's thread, so a hung call still pins that thread unless you have I/O timeouts. In async/reactive stacks (Netty, Vert.x, Node.js), use semaphores or token-based limits, and remember CPU-bound work still needs its own pool or it blocks the event loop.</p>
      <p><b>Cost of isolation.</b> Many small pools mean idle capacity in one pool while another is full. Trade-offs: size pools with Little's Law, allow bursts through a shared "overflow" with a small cap, and review sizes whenever traffic or latency changes. Over-isolation wastes money; under-isolation loses availability.</p>`,
    aiEra: `<p><b>What AI changes:</b> GPU capacity is the scarcest, most expensive bulkhead resource. An LLM inference server has a fixed number of concurrent sequences it can batch; one tenant sending huge prompts can starve everyone. Real systems use <b>per-tenant token-per-minute quotas</b>, separate queues per priority (interactive chat vs batch embedding), and shed batch work first. Agentic apps need bulkheads on <b>tool calls</b> and a max-steps/budget per task so a looping agent cannot exhaust shared resources. "Graceful degradation" now includes <i>switching to a smaller model, shortening context, or turning off the AI feature</i> when the GPU pool is saturated.</p>
      <p><b>Use AI as a partner:</b> <code>Here is my service's dependency list with traffic and latency. Propose bulkhead sizes using Little's Law and flag which dependencies are critical vs optional.</code> Use it to generate the tabular first draft; you validate against production data.</p>
      <p><b>Where AI goes wrong:</b> it recommends "add autoscaling" for sudden spikes (too slow), proposes unbounded queues, or sizes pools without headroom or measuring real latency.</p>
      <p><b>What you must still own:</b> classifying which features are critical, the business rule for who gets shed first, and checking fairness (is the shed user the free one or the VIP?).</p>`,
    problems: [{
      title: 'Isolate Tenants and Dependencies in a Shared API Service', level: 'Medium', tags: ['bulkhead', 'load shedding', 'multi-tenant', 'Little\'s law'], companies: ['Stripe', 'Atlassian', 'AWS'],
      statement: `<p>A multi-tenant B2B API runs on 20 pods, each with 200 worker threads. It calls three dependencies: <b>Auth</b> (critical), <b>Billing</b> (critical), <b>Analytics</b> (optional). Two incidents: (1) Analytics got slow and every thread piled up on it; (2) one tenant launched a bulk import and others saw 10× latency. Propose the isolation design with numbers.</p>`,
      constraints: `Per pod: ~400 req/s total. Auth 100 req/s @ 20 ms. Billing 120 req/s @ 100 ms. Analytics 400 req/s @ 50 ms (but sometimes 5 s). Free-tier tenants must not impact enterprise tenants.`,
      example: `<p>Little's Law, per pod: Auth ${H.c('b', '100 × 0.02 = 2')} threads, Billing ${H.c('b', '120 × 0.1 = 12')}, Analytics ${H.c('b', '400 × 0.05 = 20')}. Analytics at 5 s would want ${H.c('r', '400 × 5 = 2,000')} threads — ten times the pod.</p>`,
      brute: { why: `<p><b>Naive design:</b> everything shares one 200-thread pool and an unbounded request queue. When Analytics takes 5 s, it needs 2,000 threads; after ~0.5 s all 200 are blocked on Analytics, auth and billing calls wait in the queue, the queue grows, health checks time out, Kubernetes restarts pods, and the restart makes the rest of the fleet take more load (a cascade). The bulk-import tenant is just one more producer into the same queue, so everyone shares the pain.</p>` },
      mcq: { q: 'Which is the best first protection against a slow OPTIONAL dependency (Analytics)?', options: ['Increase the shared pool to 2,000 threads', 'Give it a small bounded bulkhead plus a short timeout and drop its data when full', 'Retry it 5 times with backoff', 'Run more pods'], answer: 1, explain: 'It is optional, so cap what it can consume (e.g. 30 slots), time out fast, and shed its work. Bigger pools, retries and more pods all spend resources on something not worth it and do not stop the pile-up.' },
      hints: [`<p>Hint 1: Size each dependency pool with L = λ × W and headroom; the slow case (5 s) is exactly what the cap is for.</p>`, `<p>Hint 2: Critical deps get reserved capacity (Auth 10, Billing 30); Analytics gets a tiny pool (30) with a 100 ms timeout and fire-and-forget fallback (drop or queue to Kafka).</p>`, `<p>Hint 3: Tenant fairness: per-tenant token bucket at the gateway + per-tenant concurrency cap (e.g. 15% of workers) + priority tiers so enterprise has reserved slots; bounded request queue (~50) with 503 + Retry-After.</p>`],
      solution: {
        approach: `<p><b>Design.</b></p><ol>
<li><b>Request thread budget.</b> 200 workers per pod, split into bulkheads: <b>Auth 10</b> (needs 2), <b>Billing 30</b> (needs 12), <b>Analytics 30</b> (needs 20 normally), leaving ≥ 100 for core request handling and non-blocking work. Use semaphores/pools per dependency with short timeouts: Auth 100 ms, Billing 500 ms, Analytics 100 ms.</li>
<li><b>Analytics is optional → fire-and-forget.</b> Write analytics events to a local bounded buffer / Kafka producer with a non-blocking send; if the buffer is full, drop the event and increment a counter. The request path never waits for Analytics. Add a circuit breaker so a dead Analytics is not even attempted.</li>
<li><b>Tenant isolation.</b> (a) Gateway token bucket per tenant (limit tiered: free 20 rps, pro 100, enterprise 500, bursts 2×). (b) Per-tenant concurrency cap (≤ 15% of pod workers) so a bulk import cannot occupy more than 30 workers. (c) Reserve capacity: 40% of workers can only be used by enterprise tier. (d) Move bulk imports to an async job queue with its own worker pool (separate deployment).</li>
<li><b>Bounded queue + shedding.</b> Request queue limited to 50 per pod; when full or when a request is older than its deadline, return <code>503</code> with <code>Retry-After</code>. Shed order: anonymous/free → pro → enterprise; never shed health checks.</li>
<li><b>Blast radius.</b> Deploy as 4 cells; shuffle-shard the biggest tenants across 2 cells; canary new versions on one cell first.</li>
<li><b>Verify.</b> Fault-inject Analytics latency = 5 s, expect auth/billing p99 unchanged; blast the API with a synthetic noisy tenant and confirm other tenants stay under SLO. Alert on bulkhead saturation and shed counts per tenant.</li></ol>
<p><b>Result:</b> incident 1 can pin at most 30 threads; incident 2 can use at most 15% of workers and gets 429s beyond its quota.</p>`,
        complexity: `<p>O(1) per request for token-bucket and semaphore checks. Memory: one counter per tenant/dependency. Max damage from slow Analytics = 30 threads (15%) instead of 200 (100%).</p>`,
        followUps: ['How would you pick the bulkhead sizes automatically (adaptive limits)?', 'How do you stop a "reserved" enterprise pool wasting capacity when idle?', 'What changes if the service is async/reactive with no thread-per-request?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 5 — SLIs, SLOs, SLAs, Error Budgets
     ===================================================================== */
  topics.push({
    title: 'SLIs, SLOs, SLAs & Error Budgets',
    analogy: `<p>Think of a <b>school attendance rule</b>. The <b>SLI</b> is what you measure: "days present ÷ school days". The <b>SLO</b> is your own goal: "I will attend at least 95% of days". The <b>SLA</b> is the official rule with a penalty: "below 85% and you repeat the year". And your <b>error budget</b> is the 5% of days you are <i>allowed</i> to miss. Use them wisely (a cold, a trip), and when the budget is almost gone you stop taking optional days off.</p>
      <p>Perfect attendance (100%) is not the goal — it would mean going to school with a fever. The same is true for software: 100% reliability costs infinitely much and users cannot even notice the last tiny fraction.</p>`,
    explain: `<p>"Make it reliable" is not a goal; <b>"99.9% of checkout requests succeed in under 500 ms"</b> is. The vocabulary:</p>
      ${H.table(['Term', 'Meaning', 'Example'], [
        ['<b>SLI</b> — Service Level <i>Indicator</i>', 'A number that measures one aspect of how well the service is doing. Best written as <b>good events ÷ valid events</b> (so it is a percentage).', '<code>successful_requests / total_requests</code>; <code>requests_under_300ms / total_requests</code>'],
        ['<b>SLO</b> — Service Level <i>Objective</i>', 'The <b>target</b> for an SLI over a time window. Internal promise.', '99.9% of requests succeed over a rolling 30 days'],
        ['<b>SLA</b> — Service Level <i>Agreement</i>', 'A <b>contract</b> with customers, with consequences (credits/refunds). Always looser than the SLO.', '99.5% monthly uptime, or 10% credit'],
        ['<b>Error budget</b>', '<code>1 − SLO</code> = how much failure you may have in the window. A shared "spending allowance" for risk.', '0.1% of 100M requests = 100,000 bad requests, or 43.2 min of full outage / 30 days']
      ])}
      <p><b>Which SLIs?</b> Pick what the <i>user</i> feels, measured as close to the user as practical (load balancer or client, not just the app's own log):</p>
      <ul><li><b>Request-driven services (APIs, web):</b> availability (non-5xx ÷ total), latency (share faster than X, e.g. p95 &lt; 300 ms, p99 &lt; 1 s), sometimes quality (not served degraded).</li>
      <li><b>Data pipelines:</b> freshness (data is less than 10 min old), correctness, coverage (99.9% of records processed).</li>
      <li><b>Storage:</b> durability (no object lost), availability, throughput.</li>
      <li><b>Critical user journeys:</b> "search → add to cart → pay" end to end — often the best SLI of all.</li></ul>
      <p><b>Use percentiles or "fraction under threshold", not averages.</b> An average of 100 ms can hide 5% of requests taking 4 s. And exclude things that are not your fault (client 4xx) from the denominator — they are not <i>valid</i> events.</p>
      <p><b>Choosing the number.</b> Start from what users need and what you can deliver today, then pick a tight-enough SLO that is <i>just</i> better than the point where users complain. Every extra nine roughly costs 10× the effort and slows feature work. Don't promise more than your dependencies: if you depend on three services at 99.9% in series, you cannot honestly promise 99.99%.</p>
      <p><b>Error budgets turn arguments into maths.</b> Product wants to ship fast; reliability wants to be careful. The budget is the referee:</p>
      <ul><li>Plenty of budget left → ship features, run risky experiments, do chaos tests.</li>
      <li>Budget nearly spent (&lt; 25%) → slow down: only reliability fixes and small, safe changes.</li>
      <li>Budget exhausted → <b>freeze</b> feature releases until the window recovers or the cause is fixed. This policy must be agreed <i>in advance</i> with product and management.</li></ul>
      <p><b>Burn rate</b> = how fast you are spending the budget compared with an even spend. <code>burn rate = current error rate ÷ (1 − SLO)</code>. At burn rate 1 you use exactly the whole budget over the window. At burn rate 14.4 you would burn a whole 30-day budget in 30 ÷ 14.4 ≈ 2 days — page someone <i>now</i>.</p>`,
    clues: [
      '"how do you define reliability / what does 99.9% mean?" → SLI as good ÷ valid events, SLO as target over a window',
      '"how much downtime is allowed?" → compute the error budget (time-based and request-based)',
      '"product wants to ship, SRE wants stability" → error budget policy (freeze when exhausted)',
      '"alert fatigue" / "when should we page?" → alert on burn rate (multi-window), not on every error',
      '"our average latency looks fine but users complain" → percentiles / threshold-based latency SLI',
      '"SLA vs SLO" → SLA has contract + penalties and is looser than the SLO'
    ],
    code: [
      { lang: 'python', run: true, title: 'Error budget and burn-rate calculator (runnable)', code: `def budget(slo, total_requests, days=30):
    """slo as a fraction, e.g. 0.999"""
    allowed_bad = total_requests * (1 - slo)
    allowed_minutes = days * 24 * 60 * (1 - slo)
    return allowed_bad, allowed_minutes

def burn_rate(error_rate, slo):
    """How many times faster than 'even spend' we are burning the budget."""
    return error_rate / (1 - slo)

slo = 0.999
bad, mins = budget(slo, total_requests=100_000_000)
print(f"SLO {slo * 100}% -> {bad:,.0f} bad requests OR {mins:.1f} minutes of full outage per 30 days")

# An incident: 25 minutes of 100% errors at the average rate, plus a bad deploy with 8,000 failures
rps = 100_000_000 / (30 * 24 * 3600)
spent = 25 * 60 * rps + 8_000
print(f"spent {spent:,.0f} of {bad:,.0f} -> {spent / bad * 100:.0f}% of budget used")
print("policy:", "FREEZE releases" if spent / bad >= 1 else "slow down" if spent / bad >= 0.75 else "ship normally")

# Burn-rate alert windows (Google SRE workbook): (rate, long window, short window, action)
for err in (0.0005, 0.005, 0.0144):
    br = burn_rate(err, slo)
    days_left = 30 / br
    action = "PAGE" if br >= 14.4 else "page (slow burn)" if br >= 6 else "ticket" if br >= 1 else "ok"
    print(f"error rate {err * 100:.2f}% -> burn {br:5.1f}x -> budget gone in {days_left:5.1f} days -> {action}")
` },
      { lang: 'text', check: false, title: 'PromQL: availability SLI and a fast-burn alert (reference)', code: `# SLI: fraction of requests that are NOT 5xx over 5 minutes
sum(rate(http_requests_total{job="checkout", code!~"5.."}[5m]))
  /
sum(rate(http_requests_total{job="checkout"}[5m]))

# Fast burn page: error ratio over the last 1h AND 5m both exceed 14.4 x (1 - 0.999)
(
  sum(rate(http_requests_total{job="checkout", code=~"5.."}[1h])) / sum(rate(http_requests_total{job="checkout"}[1h])) > (14.4 * 0.001)
)
and
(
  sum(rate(http_requests_total{job="checkout", code=~"5.."}[5m])) / sum(rate(http_requests_total{job="checkout"}[5m])) > (14.4 * 0.001)
)` }
    ],
    codeTitle: ['Error budget calculator (Python)', 'SLI and burn-rate alert (PromQL)'],
    viz: [
      {
        title: 'Spending the error budget through the month',
        input: 'slo=99.9 incidents=5,12,3,20',
        inputLabel: 'SLO % and incident downtimes in minutes (30-day window, time-based budget)',
        gen: function (input) {
          var kv = parseKV(input), slo = num(kv.slo, 99.9);
          if (!(slo > 90 && slo < 100)) throw new Error('SLO must be between 90 and 99.9999, e.g. slo=99.9');
          var im = /incidents=([0-9.,]+)/i.exec(String(input)), inc = String(im ? im[1] : '5,12,3,20').split(',').filter(function (x) { return x !== ''; }).map(Number);
          if (!inc.length || inc.length > 10 || inc.some(function (x) { return isNaN(x) || x < 0; })) throw new Error('Example: slo=99.9 incidents=5,12,3,20 (minutes, up to 10)');
          var total = r2((100 - slo) / 100 * 43200), used = 0, fr = [], vals = [], lab = [], tx = [], rows = [];
          fr.push({ narr: 'SLO <b>' + slo + '%</b> over 30 days = 43,200 minutes. Error budget = (100 − ' + slo + ')% × 43,200 = <b>' + total + ' minutes</b> of full outage we are allowed. Policy: &gt; 50% left → ship freely; 25–50% → be careful; &lt; 25% → reliability work only; 0% → <b>feature freeze</b>.', parts: [{ type: 'bars', label: 'Budget (minutes)', values: [total], texts: [total + ' min'], idxLabels: ['total'], hl: { 0: 'ok' } }] });
          inc.forEach(function (m, i) {
            used = r2(used + m);
            var left = r2(total - used), pct = Math.max(0, Math.round(left / total * 100));
            var status = left <= 0 ? 'FREEZE releases' : pct < 25 ? 'reliability work only' : pct < 50 ? 'be careful' : 'ship freely';
            vals.push(Math.max(left, 0)); tx.push(Math.max(left, 0) + ' min'); lab.push('after #' + (i + 1));
            rows.push(['#' + (i + 1), m + ' min', used + ' min', Math.max(left, 0) + ' min', pct + '%', status]);
            fr.push({ narr: 'Incident <b>#' + (i + 1) + '</b>: ' + m + ' minutes of outage. Used so far <b>' + used + '</b> of ' + total + ' min. Remaining <b>' + Math.max(left, 0) + ' min (' + pct + '%)</b> → policy: <b>' + status + '</b>.' + (left <= 0 ? ' <span class="c-r">Budget exhausted: the SLO is already missed for this window.</span>' : ''),
              parts: [{ type: 'bars', label: 'Error budget remaining (minutes)', values: vals.slice(), texts: tx.slice(), idxLabels: lab.slice(), hl: (function () { var h = {}; h[i] = left <= 0 ? 'bad' : pct < 25 ? 'cur' : 'ok'; return h; })() }, { type: 'table', label: 'Budget ledger', columns: ['incident', 'downtime', 'used', 'left', 'left %', 'policy'], rows: rows.slice(), hl: (function () { var h = {}; h[i] = left <= 0 ? 'bad' : pct < 25 ? 'sel' : 'done'; return h; })() }] });
          });
          fr.push({ narr: 'One more way to see it: <b>' + total + ' minutes</b> a month is the whole allowance for deploys gone wrong, dependency outages, and experiments. This is why "99.99%" (4.3 min) means almost every incident must be fixed automatically, with no human in the loop.', parts: [{ type: 'text', html: 'Budget = a <b>shared currency</b>: features spend it by taking risk; reliability work earns it back.' }] });
          return fr;
        }
      },
      {
        title: 'Burn rate: how fast are we spending, and should we page?',
        input: 'slo=99.9 errors=0.5',
        inputLabel: 'SLO % and the CURRENT error rate % (e.g. 0.5 means 0.5% of requests failing)',
        gen: function (input) {
          var kv = parseKV(input), slo = num(kv.slo, 99.9), err = num(kv.errors, 0.5);
          if (!(slo > 90 && slo < 100) || !(err >= 0 && err <= 100)) throw new Error('Example: slo=99.9 errors=0.5');
          var budgetRate = (100 - slo), br = r2(err / budgetRate), days = br > 0 ? r2(30 / br) : Infinity, fr = [];
          fr.push({ narr: 'The SLO allows <b>' + r2(budgetRate) + '%</b> of requests to fail on average. Right now <b>' + err + '%</b> are failing.', parts: [{ type: 'vars', vals: { SLO: slo + '%', 'allowed error rate': r2(budgetRate) + '%', 'current error rate': err + '%' } }] });
          fr.push({ narr: 'Burn rate = current error rate ÷ allowed error rate = ' + err + ' ÷ ' + r2(budgetRate) + ' = <b>' + br + '×</b>. At 1× the budget lasts exactly the window (30 days).', parts: [{ type: 'vars', vals: { 'burn rate': br + '×' }, hl: { 'burn rate': br >= 14.4 ? 'bad' : br >= 6 ? 'cur' : br >= 1 ? 'sel' : 'ok' } }] });
          fr.push({ narr: 'At this pace the <b>whole 30-day budget is gone in ' + (days === Infinity ? '∞ (no errors)' : days + ' days (' + r2(days * 24) + ' hours)') + '</b>.', parts: [{ type: 'bars', label: 'Days until budget is exhausted (30 = on track)', values: [days === Infinity ? 30 : Math.min(days, 30)], texts: [days === Infinity ? '∞' : days + ' d'], idxLabels: ['at this burn'], hl: { 0: br >= 6 ? 'bad' : br >= 1 ? 'cur' : 'ok' } }] });
          var rules = [['Fast burn', 14.4, '1 h + 5 min', '2% of budget', 'PAGE immediately'], ['Slow burn', 6, '6 h + 30 min', '5% of budget', 'PAGE'], ['Trickle', 1, '3 d + 6 h', '10% of budget', 'open a TICKET']];
          var rows = rules.map(function (r) { return [r[0], r[1] + '×', r[2], r[3], br >= r[1] ? 'FIRING → ' + r[4] : 'no']; });
          var hl = {}; rules.forEach(function (r, i) { if (br >= r[1]) hl[i] = i === 2 ? 'sel' : 'bad'; });
          fr.push({ narr: 'Multi-window, multi-burn-rate alerts (Google SRE workbook). A rule fires only if the error rate exceeds the threshold over <b>both</b> a long window (is it real?) and a short one (is it still happening?). At ' + br + '× the rules that fire are highlighted.', parts: [{ type: 'table', label: 'Alert rules', columns: ['rule', 'burn ≥', 'windows', 'budget consumed if it lasts', 'status now'], rows: rows, hl: hl }] });
          fr.push({ narr: br >= 14.4 ? '<span class="c-r">Wake someone up</span>: at this speed nothing will be left in about ' + r2(days * 24) + ' hours.' : br >= 6 ? 'A serious slow burn — page, but there is time to investigate.' : br >= 1 ? 'Not an emergency, but budget will run out before the window ends: create a ticket and fix it this week.' : 'Within budget: no alert. Alerting on every error would just train people to ignore the pager.', parts: [{ type: 'text', html: 'Alert on <b>symptoms users feel</b> (burn rate), not on causes (CPU 85%).' }] });
          return fr;
        }
      }
    ],
    examples: [
      { title: 'Compute an error budget two ways', html: `<p>SLO = 99.95% over 30 days.</p>${H.table(['View', 'Calculation', 'Result'], [['Time-based', '0.0005 × 30 × 24 × 60 = 0.0005 × 43,200', H.c('b', '21.6 minutes of full outage')], ['Request-based, 200M requests', '0.0005 × 200,000,000', H.c('b', '100,000 failed requests')], ['Partial outage', '10 min at 40% errors', '= 4 equivalent full-outage minutes']])}<p>Request-based is fairer: a 3 a.m. outage costs fewer requests than a noon one.</p>` },
      { title: 'A latency SLI with two thresholds', html: `<p>Instead of "average latency", write: <b>95%</b> of checkout requests complete in &lt; <b>300 ms</b> AND <b>99%</b> in &lt; <b>1 s</b>, measured at the load balancer over 28 days. In a histogram metric this is the share of requests in the buckets below the threshold, so you can alert from it.</p>${H.table(['Bucket (ms)', 'Requests'], [['≤ 100', '700,000'], ['≤ 300', '260,000'], ['≤ 1000', '30,000'], ['> 1000', '10,000']])}<p>≤ 300 ms: 960,000 / 1,000,000 = <b>96%</b> ✓ (target 95%). ≤ 1 s: 990,000 / 1,000,000 = <b>99%</b> ✓ (target 99%, zero slack).</p>` },
      { title: 'SLO vs SLA: keep a safety margin', html: `<p>The contract (SLA) promises customers <b>99.9%</b> with credits. Internally the team targets an SLO of <b>99.95%</b>. Why? You want to notice and fix problems <i>long before</i> you owe money. SLA = the cliff; SLO = the fence you keep a few steps back from the cliff.</p>` },
      { title: 'Dependencies cap your SLO', html: `<p>Your service calls Auth, Payments and Inventory synchronously, each at 99.9%. Best-case combined = 0.999³ ≈ <b>99.7%</b>, so a 99.95% SLO is mathematically out of reach <i>unless</i> you add fallbacks, caching or make some calls optional. Use this in design reviews: "which dependencies are hard, and what is their SLO?"</p>` }
    ],
    deepDive: `<p><b>Time-based vs request-based.</b> Time-based ("up" for 99.9% of minutes) is easy to explain but treats a 1% error rate for an hour the same as 0%. Request-based good/total is smoother and uses all the data. Most modern SLO tools (Sloth, Pyrra, Nobl9, Google Cloud SLO monitoring, Datadog SLOs) use <b>request-based ratios over a rolling window</b>.</p>
      <p><b>Window choice.</b> A rolling 28/30-day window avoids the calendar reset problem (on the 1st the budget magically refills). A calendar window matches SLAs and billing. Many teams use both: rolling for engineering decisions, calendar for reporting. Longer windows are smoother; shorter ones (7 d) reward fast recovery but get volatile.</p>
      <p><b>Why multi-window, multi-burn-rate alerts.</b> A simple "error rate &gt; X for 5 minutes" alert pages on harmless blips and misses slow leaks. Burn-rate alerts are proportional to budget: fast burn (14.4×) catches big outages in minutes with a 1 h window; slow burn (6×, 1×) catches smaller sustained problems. Requiring a short window too (5 min) means the alert resets quickly after the problem stops, avoiding stale pages. Typical precision/recall/detection-time/reset-time trade-offs are explained in <i>The SRE Workbook</i>, chapter "Alerting on SLOs".</p>
      <p><b>Choosing SLIs wisely.</b> Pitfalls: (1) measuring at the server hides failures that never reach it (DNS, LB drops) — measure at the edge or client; (2) health-check traffic and bot traffic skew ratios — filter; (3) counting 4xx caused by users as failures; (4) too many SLOs — 2–5 per service, tied to user journeys; (5) SLOs without a policy are decoration. A beautiful dashboard that does not change anyone's behaviour is not an SLO.</p>
      <p><b>SLOs for internal platforms.</b> The platform team's customers are other engineers. Define SLOs for CI latency, deploy success, queue delay — and use the budget to decide platform roadmap vs stability.</p>
      <p><b>Error budget policies in practice.</b> Write them down: who declares the freeze, what is still allowed (security fixes, reliability patches), how to unfreeze, how exceptions are approved. Include "budget well-underspent" outcomes too — an SLO consistently met by a wide margin means you may be over-investing in reliability or the SLO is too loose; consider tightening or taking more risk (launch faster, run chaos experiments).</p>
      <p><b>The cost curve.</b> From 99% to 99.9% might need multi-AZ and automation; 99.99% needs multi-region, safe rollouts, automated failover; 99.999% means ~5 minutes a year and usually specialised hardware or telecom-grade engineering. Always ask: <i>what does one more nine buy the user, and what does it cost?</i></p>`,
    aiEra: `<p><b>What AI changes:</b> AI products need <b>new SLIs</b> next to classic ones: time-to-first-token and tokens/s for chat; answer <b>quality</b> (a rated or LLM-judged score on a sampled set), hallucination/refusal rate, grounding rate for RAG, cost per request. An LLM endpoint that returns <code>200 OK</code> with a wrong or empty answer is "up" but broken, so the SLO must include a quality SLI. Evaluation sets run continuously in production act like synthetic probes. Error budgets also cover <b>model rollouts</b>: a new model version gets canaried against the quality SLI before taking all traffic.</p>
      <p><b>Use AI as a partner:</b> <code>Given this service description and these user journeys, propose 3 SLIs with exact good/valid event definitions and suggested SLO targets, and list the traps.</code> It is also good at turning a raw metrics list into candidate PromQL.</p>
      <p><b>Where AI goes wrong:</b> it suggests "five nines" by default, writes ratios whose denominator includes 4xx or health checks, and proposes alerts on CPU instead of user-facing burn.</p>
      <p><b>What you must still own:</b> agreeing the targets with product, writing the error budget policy so leadership honours it, and checking that the SLI really reflects user pain.</p>`,
    problems: [{
      title: 'Compute the Error Budget and Decide: Ship or Freeze?', level: 'Easy', tags: ['SLO', 'error budget', 'burn rate'], companies: ['Google', 'Atlassian', 'Datadog'],
      statement: `<p>Checkout API: <b>SLO 99.95%</b> of requests succeed (non-5xx), rolling <b>30 days</b>. Traffic ≈ <b>200 million</b> requests per 30 days (average ≈ 77 req/s). So far this window: a <b>15-minute total outage</b> (every request failed) and a bad deploy that caused <b>20,000</b> extra failed requests. A team wants to ship a risky migration tomorrow. (a) What is the error budget in requests and minutes? (b) How much is spent? (c) Ship or freeze? (d) At what current error rate would you page?</p>`,
      constraints: `Treat traffic as uniform at 77.16 req/s. Use the standard burn-rate thresholds 14.4× (page), 6× (page), 1× (ticket).`,
      example: `<p>Budget: 0.0005 × 200,000,000 = ${H.c('b', '100,000 bad requests')} = ${H.c('b', '21.6 min')} of total outage. Outage cost: 900 s × 77.16 ≈ ${H.c('r', '69,444')}. Plus deploy: ${H.c('r', '20,000')} → ${H.c('r', '89,444 spent (89%)')}, remaining ${H.c('g', '10,556')}.</p>`,
      brute: { why: `<p><b>Naive approach:</b> "we had 15 minutes of downtime in a month, that is 99.97% uptime, so we are above 99.95%. Ship it!" This is wrong because it ignores the deploy failures (the time view hides partial failures) and ignores that <b>89% of the budget is already gone</b> with 3 weeks of window possibly remaining — one more small incident breaks the SLO. Also, "uptime" alone is not the SLI.</p>` },
      mcq: { q: 'Budget is 89% used with part of the window still ahead. What does a sensible error-budget policy say?', options: ['Ship the risky migration; we are still under 100%', 'Slow down: only low-risk or reliability changes; delay the risky migration until budget recovers', 'Raise the SLO to 99.99%', 'Disable alerting to avoid noise'], answer: 1, explain: 'With only ~11% of the budget left, one bad migration would blow the SLO. The policy says to protect remaining budget: postpone risky changes, ship only safe ones, invest in reliability.' },
      hints: [`<p>Hint 1: error budget = (1 − SLO) × total events (or × minutes in the window).</p>`, `<p>Hint 2: convert the outage minutes to requests with the average rate: 15 × 60 × 77.16 ≈ 69,444.</p>`, `<p>Hint 3: burn rate = error rate ÷ 0.0005. 14.4× page threshold ⇒ error rate = 14.4 × 0.0005 = 0.72%.</p>`],
      solution: {
        approach: `<p><b>Answer.</b></p><ol>
<li><b>Budget.</b> (1 − 0.9995) = 0.0005. Requests: 0.0005 × 200,000,000 = <b>100,000</b> bad requests. Time-based: 0.0005 × 43,200 min = <b>21.6 min</b> of full outage.</li>
<li><b>Spent.</b> Outage: 15 min × 60 × 77.16 req/s ≈ 69,444 failed. Deploy: 20,000. Total ≈ <b>89,444 = 89.4%</b>. Remaining ≈ 10,556 requests (≈ 2.3 minutes of full outage).</li>
<li><b>Decision.</b> Under a typical policy (&lt; 25% left → reliability only), <b>do not ship the risky migration now</b>. Options: ship it behind a feature flag with canary at 1% and an automatic rollback; or wait for the old incident to age out of the rolling window; or do the migration in smaller reversible steps. Run a post-incident review for the deploy failure so the budget stops leaking.</li>
<li><b>Paging.</b> Burn rate = error rate ÷ 0.0005. Fast burn (14.4×) ⇒ error rate ≥ 0.72% over 1 h and 5 min → page. 6× ⇒ ≥ 0.30% over 6 h and 30 min → page. 1× ⇒ ≥ 0.05% over 3 days → ticket. With only 10,556 requests left, a sustained 0.72% error rate (≈ 0.55 req/s) would exhaust it in about 5.3 hours (10,556 ÷ 0.555).</li>
<li><b>Dashboards.</b> Show remaining budget (%) and 28-day trend; annotate with deploys and incidents.</li></ol>`,
        complexity: `<p>Pure arithmetic: O(1). The important part is judgement: apply the agreed policy rather than negotiating each time.</p>`,
        followUps: ['How would the answer change with a calendar-month window and only 5 days left?', 'What if the outage happened at 3 a.m. with 10× fewer requests — time vs request budget?', 'How would you define the SLI so bot traffic does not hide real failures?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 6 — Observability: Logs, Metrics, Traces
     ===================================================================== */
  topics.push({
    title: 'Observability: Logs, Metrics & Distributed Traces',
    analogy: `<p>When you feel ill, a doctor uses three kinds of information. <b>Metrics</b> are your <i>vital signs</i> on the monitor (temperature, heart rate, over time): quick, cheap, tell you <b>that</b> something is wrong. <b>Traces</b> are an <i>MRI scan following one blood cell through the body</i>: they show <b>where</b> in the path the problem is. <b>Logs</b> are the <i>doctor's detailed notes</i>: they tell you <b>why</b> — the exact error message. You usually go vitals → scan → notes.</p>`,
    explain: `<p><b>Monitoring</b> asks known questions ("is CPU &gt; 90%?"). <b>Observability</b> means your system emits enough data that you can ask <i>new</i> questions during an incident without shipping new code ("why is checkout slow only for users in Brazil on Android?"). The three classic signals:</p>
      ${H.table(['Signal', 'What it is', 'Great for', 'Cost / catch'], [
        ['<b>Metrics</b>', 'Numbers over time, aggregated: counters, gauges, histograms. <code>http_requests_total{route="/pay",code="500"}</code>', 'Dashboards, alerts, SLOs, trends. Cheap and fast.', 'Aggregated, so you lose individual requests. <b>High cardinality</b> (user_id as a label) explodes cost.'],
        ['<b>Logs</b>', 'Timestamped records of events. Best as <b>structured JSON</b>.', 'The exact error, stack trace, business context.', 'Large and expensive; hard to search at scale; may contain private data.'],
        ['<b>Traces</b>', 'The journey of ONE request across services, as a tree of timed <b>spans</b>.', 'Finding which hop is slow or failing in a microservice call chain.', 'Needs every service instrumented and context passed along; usually sampled.']
      ])}
      <p><b>Metrics: types and what to measure.</b></p>
      <ul><li><b>Counter</b> — only goes up (requests, errors). You look at its <i>rate</i>.</li>
      <li><b>Gauge</b> — goes up and down (queue length, memory in use).</li>
      <li><b>Histogram</b> — counts values into buckets (latency ≤ 50 ms, ≤ 100 ms …) so you can compute <b>p50 / p95 / p99</b>. Never average percentiles from different servers; add the buckets, then compute.</li></ul>
      <p>Two checklists everyone uses: <b>RED</b> for services — <b>R</b>ate (requests/s), <b>E</b>rrors (failed/s), <b>D</b>uration (latency). <b>USE</b> for resources like CPU, disk, pool — <b>U</b>tilisation, <b>S</b>aturation (queue/wait), <b>E</b>rrors. Google's <b>Four Golden Signals</b>: latency, traffic, errors, saturation.</p>
      <p><b>Logs: do it well.</b></p>
      <ul><li><b>Structured</b> (JSON key/values), not free text: <code>{"level":"ERROR","msg":"charge failed","order_id":"o-91","trace_id":"4bf9...","latency_ms":2503}</code>.</li>
      <li>Always include a <b>correlation / trace ID</b> so you can pull every log line of one request across services.</li>
      <li>Use levels sensibly (DEBUG off in prod by default). Don't log secrets, card numbers, or personal data. Control volume with sampling and retention (hot 7 days, cold 90).</li></ul>
      <p><b>Traces: how they work.</b> The first service creates a <b>trace ID</b> and a <b>span</b> (a named, timed unit of work). When it calls another service it passes the IDs in a header (W3C standard: <code>traceparent: 00-&lt;trace-id&gt;-&lt;parent-span-id&gt;-01</code>). The callee creates a <b>child span</b> with that parent. All spans are sent to a collector; the tracing UI draws a <b>waterfall</b> (a Gantt chart). A <b>span</b> has: name, service, start, duration, status, attributes (<code>db.statement</code>, <code>http.status_code</code>). <b>OpenTelemetry (OTel)</b> is the vendor-neutral standard for generating all three signals; backends include Prometheus/Grafana, Jaeger/Tempo, Elastic, Datadog, Honeycomb.</p>
      <p><b>Sampling.</b> Tracing every request is too costly at scale. <b>Head sampling</b> decides at the start (keep 1%). <b>Tail sampling</b> decides after the trace finishes, so you can keep <b>100% of errors and slow traces</b> and 1% of the boring ones.</p>
      <p><b>From data to action.</b> Good observability ends in a <b>fast path from alert to cause</b>: the alert (SLO burn) → a dashboard showing which service/region → an exemplar trace link on the latency graph → the trace shows the slow span → click through to logs by trace ID. Design that path on purpose.</p>`,
    clues: [
      '"how do you debug a slow request across 12 microservices?" → distributed tracing (spans, trace ID propagation)',
      '"how do you know the system is healthy?" → RED/USE metrics, SLOs, dashboards and alerts',
      '"find the root cause of an error" → logs with correlation ID, structured',
      '"metrics cost exploded" / "user_id as a label" → cardinality',
      '"p99 latency across servers" → merge histogram buckets, never average percentiles',
      '"how do you design alerts?" → alert on symptoms/SLO burn, link to runbook and dashboard; avoid noisy causes',
      '"what should be on the on-call dashboard?" → golden signals per service, dependencies, recent deploys, saturation'
    ],
    code: [
      { lang: 'python', run: true, title: 'Structured logs with a trace ID + percentiles from histogram buckets (runnable)', code: `import json, time, uuid, bisect

# --- 1. structured, correlated logging ---
def log(level, msg, **fields):
    rec = {"level": level, "msg": msg, **fields}
    print(json.dumps(rec, sort_keys=True))

def handle_request(order_id, latency_ms, fail):
    trace_id = uuid.uuid4().hex[:8]          # in real life: taken from the 'traceparent' header
    log("INFO", "request start", trace_id=trace_id, order_id=order_id)
    if fail:
        log("ERROR", "charge failed", trace_id=trace_id, order_id=order_id,
            upstream="payment-service", latency_ms=latency_ms, error="timeout")
    log("INFO", "request end", trace_id=trace_id, status=500 if fail else 200, latency_ms=latency_ms)

handle_request("o-91", 2503, fail=True)

# --- 2. histogram: count latencies in buckets, then estimate percentiles ---
bounds = [50, 100, 250, 500, 1000, 2500, float("inf")]       # upper bounds in ms
counts = [0] * len(bounds)
samples = [20, 35, 40, 45, 60, 80, 90, 120, 140, 200, 230, 300, 480, 900, 2503]
for s in samples:
    counts[bisect.bisect_left(bounds, s)] += 1               # the bucket whose upper bound >= s

def percentile(p):
    target = p / 100 * sum(counts)
    running = 0
    for ub, c in zip(bounds, counts):
        running += c
        if running >= target:
            return ub                                         # 'p' is at most this value
print("buckets:", dict(zip([str(b) for b in bounds], counts)))
print("p50 <=", percentile(50), "ms   p95 <=", percentile(95), "ms   p99 <=", percentile(99), "ms")
` },
      { lang: 'http', title: 'W3C trace context propagated between services (reference)', code: `GET /inventory/check?sku=A17 HTTP/1.1
Host: inventory.internal
traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
tracestate: vendor1=opaque
X-Request-Deadline: 2026-10-15T10:00:01.500Z

# traceparent = version - trace-id (16 bytes) - parent-span-id (8 bytes) - flags (01 = sampled)
# The callee creates a NEW span id, but keeps the SAME trace-id, and records the parent-span-id.` }
    ],
    codeTitle: ['Structured logs + histogram (Python)', 'traceparent header (HTTP)'],
    viz: [
      {
        title: 'Distributed trace waterfall: find the slow hop',
        input: 'slow=postgres',
        inputLabel: 'Which span is slow? redis | postgres | bank | auth | none',
        gen: function (input) {
          var kv = parseKV(input), slow = (kv.slow || 'postgres').toLowerCase();
          if (['redis', 'postgres', 'bank', 'auth', 'none'].indexOf(slow) < 0) throw new Error('Type slow=redis, slow=postgres, slow=bank, slow=auth or slow=none');
          function d(name, normal, big) { return slow === name ? big : normal; }
          // tree definition: [name, service, leafDuration|null, children, depth]
          var spec = { name: 'POST /checkout', svc: 'gateway', kids: [
            { name: 'validate token', svc: 'auth-service', dur: d('auth', 12, 650), kids: [] },
            { name: 'GET cart', svc: 'cart-service', own: 4, kids: [{ name: 'redis GET', svc: 'redis', dur: d('redis', 2, 300), kids: [] }] },
            { name: 'check stock', svc: 'inventory-service', own: 6, kids: [{ name: 'SELECT stock', svc: 'postgres', dur: d('postgres', 18, 820), kids: [] }] },
            { name: 'POST /charge', svc: 'payment-service', own: 8, kids: [{ name: 'bank API call', svc: 'bank', dur: d('bank', 140, 2300), kids: [] }] }
          ], own: 5 };
          var spans = [];
          function build(n, start, depth) {
            var idx = spans.length, rec = { name: n.name, svc: n.svc, start: start, depth: depth, dur: 0, self: 0 };
            spans.push(rec);
            if (!n.kids.length) { rec.dur = n.dur; rec.self = n.dur; return rec.dur; }
            var t = start + (n.own || 0) / 2, sum = 0;
            n.kids.forEach(function (k) { var kd = build(k, t, depth + 1); t += kd + 1; sum += kd + 1; });
            rec.dur = sum + (n.own || 0); rec.self = rec.dur - sum;
            return rec.dur;
          }
          build(spec, 0, 0);
          var total = spans[0].dur, W = 36;
          function bar(s) { var off = Math.round(s.start / total * W), len = Math.max(1, Math.round(s.dur / total * W)); return new Array(off + 1).join('░') + new Array(len + 1).join('█'); }
          function row(s) { return [new Array(s.depth * 2 + 1).join('·') + s.name, s.svc, Math.round(s.start) + ' ms', Math.round(s.dur) + ' ms', Math.round(s.self) + ' ms', bar(s)]; }
          var order = spans.map(function (s, i) { return i; }).sort(function (a, b) { return (spans[a].start + spans[a].dur) - (spans[b].start + spans[b].dur) || b - a; });
          var cols = ['span (indent = child of)', 'service', 'start', 'duration', 'self time', 'timeline'];
          var fr = [];
          fr.push({ narr: 'One user clicks "Pay". The gateway starts a trace with a trace ID and passes it down in the <code>traceparent</code> header. Each service reports <b>spans</b> (name, start, duration). We will reveal them as they finish. Slow component in this run: <b>' + slow + '</b>.', parts: [{ type: 'text', html: 'Waterfall = Gantt chart of one request. <b>Self time</b> = duration minus time spent in children (where THIS span itself was busy).' }] });
          var shown = [], rows = [];
          order.forEach(function (i, k) {
            shown.push(i);
            var sorted = shown.slice().sort(function (a, b) { return a - b; });
            rows = sorted.map(function (j) { return row(spans[j]); });
            var hl = {}; sorted.forEach(function (j, r) { if (j === i) hl[r] = 'cur'; });
            if (k < order.length - 1)
              fr.push({ narr: 'Span <b>' + spans[i].name + '</b> (' + spans[i].svc + ') finishes after <b>' + Math.round(spans[i].dur) + ' ms</b>. It is attached to its parent through the parent-span-id.', parts: [{ type: 'table', label: 'Trace so far (' + shown.length + ' of ' + spans.length + ' spans)', columns: cols, rows: rows, hl: hl }] });
          });
          // final: all spans, highlight slowest self time among leaves (excluding root)
          var best = 1; spans.forEach(function (s, i) { if (i > 0 && s.self > spans[best].self) best = i; });
          rows = spans.map(row);
          var hlF = {}; hlF[best] = 'bad'; hlF[0] = 'done';
          fr.push({ narr: 'Whole trace: <b>' + Math.round(total) + ' ms</b> end to end. The span with the largest <b>self time</b> is <b>' + spans[best].name + '</b> in <b>' + spans[best].svc + '</b> (' + Math.round(spans[best].self) + ' ms = ' + Math.round(spans[best].self / total * 100) + '% of the request). ' + (slow === 'none' ? 'Everything looks healthy — the biggest piece is simply the payment hop.' : 'That is where to look first: no guessing across 6 services.'), parts: [{ type: 'table', label: 'Complete trace', columns: cols, rows: rows, hl: hlF }] });
          fr.push({ narr: 'Next step: take this <b>trace ID</b> into the log search and filter <code>trace_id=...</code>. You will see only this request\'s log lines from all services — e.g. <i>"statement timeout: seq scan on stock"</i> — the <b>why</b> behind the slow span.', parts: [{ type: 'table', label: 'Logs filtered by trace_id', columns: ['time', 'service', 'level', 'message'], rows: [['+0 ms', 'gateway', 'INFO', 'POST /checkout start'], ['+' + Math.round(spans[best].start) + ' ms', spans[best].svc, slow === 'none' ? 'INFO' : 'WARN', slow === 'none' ? 'ok' : 'slow operation: ' + spans[best].name + ' took ' + Math.round(spans[best].dur) + ' ms'], ['+' + Math.round(total) + ' ms', 'gateway', 'INFO', 'POST /checkout end status=200']], hl: { 1: slow === 'none' ? 'done' : 'bad' } }] });
          return fr;
        }
      },
      {
        title: 'Debugging an incident: metrics → trace → logs',
        gen: function () {
          var fr = [], mins = ['t-9', 't-8', 't-7', 't-6', 't-5', 't-4', 't-3', 't-2', 't-1', 'now'];
          fr.push({ narr: '<b>Step 1 — an alert fires:</b> "Checkout SLO fast burn: error rate 3.2% (burn 32×)". The on-call opens the dashboard linked in the alert. <b>Metrics</b> say <i>that</i> something is wrong.', parts: [{ type: 'bars', label: 'Checkout error rate % (per minute)', values: [0.1, 0.1, 0.1, 0.2, 0.2, 1.5, 3.1, 3.2, 3.2, 3.2], idxLabels: mins, hl: { 5: 'cur', 6: 'bad', 7: 'bad', 8: 'bad', 9: 'bad' }, texts: ['0.1', '0.1', '0.1', '0.2', '0.2', '1.5', '3.1', '3.2', '3.2', '3.2'] }] });
          fr.push({ narr: '<b>Step 2 — narrow down.</b> The dashboard breaks the errors out by service. Only <b>payment-service</b> is red; its p99 latency is 2.6 s. Also a deploy marker at t-5 shows <b>payment-service v412</b> went out. Strong lead.', parts: [{ type: 'table', label: 'RED metrics by service (last 5 min)', columns: ['service', 'req/s', 'error %', 'p99 latency'], rows: [['gateway', 410, '3.2%', '2.7 s'], ['cart-service', 400, '0.0%', '35 ms'], ['inventory-service', 395, '0.1%', '48 ms'], ['payment-service', 390, '3.3%', '2.6 s'], ['notification-service', 120, '0.0%', '90 ms']], hl: { 3: 'bad' } }] });
          fr.push({ narr: '<b>Step 3 — open an example trace</b> (the latency graph has "exemplar" links to real slow requests). <b>Traces</b> show <i>where</i>: the span "bank API call" takes 2.3 s and then fails; every other span is normal.', parts: [{ type: 'table', label: 'Trace 4bf92f35...', columns: ['span', 'service', 'duration', 'status'], rows: [['POST /checkout', 'gateway', '2,700 ms', 'ERROR'], ['validate token', 'auth-service', '12 ms', 'ok'], ['check stock', 'inventory-service', '30 ms', 'ok'], ['POST /charge', 'payment-service', '2,580 ms', 'ERROR'], ['bank API call', 'bank-client', '2,500 ms', 'timeout']], hl: { 4: 'bad', 3: 'cur' } }] });
          fr.push({ narr: '<b>Step 4 — read the logs</b> for that trace ID. <b>Logs</b> say <i>why</i>: the new version v412 sets the bank client timeout to 2,500 ms but the connection pool was left at size 5, so calls queue and time out.', parts: [{ type: 'table', label: 'logs where trace_id = 4bf92f35...', columns: ['time', 'service', 'level', 'message'], rows: [['10:14:02.101', 'payment-service', 'WARN', 'bank-client pool exhausted: 5/5 in use, waiting'], ['10:14:04.601', 'payment-service', 'ERROR', 'charge failed: timeout after 2500ms (attempt 1/1)'], ['10:14:04.602', 'payment-service', 'INFO', 'idempotency_key=ord-1001 saved as PENDING']], hl: { 0: 'sel', 1: 'bad' } }] });
          fr.push({ narr: '<b>Step 5 — act and verify.</b> Roll back v412 (a safe, fast action first; fix the pool config later). Error rate returns to baseline within two minutes. The incident took 9 minutes thanks to alert → dashboard → trace → logs, with no guessing. Afterwards: add a pool-saturation alert and a canary stage to the pipeline.', parts: [{ type: 'bars', label: 'Checkout error rate % after rollback', values: [3.2, 3.2, 1.0, 0.2, 0.1], idxLabels: ['rollback', '+1m', '+2m', '+3m', '+4m'], hl: { 0: 'bad', 1: 'bad', 2: 'cur', 3: 'ok', 4: 'ok' }, texts: ['3.2', '3.2', '1.0', '0.2', '0.1'] }] });
          return fr;
        }
      }
    ],
    examples: [
      { title: 'Golden-signals dashboard for one service', html: `<p>A good first panel set for any service (one row per signal):</p>${H.table(['Signal', 'Query idea', 'Panel'], [['Traffic', 'rate(http_requests_total[1m])', 'requests/s by route'], ['Errors', '5xx rate ÷ total rate', 'error % + SLO line'], ['Latency', 'histogram_quantile(0.99, ...)', 'p50 / p95 / p99 lines'], ['Saturation', 'thread-pool use, queue length, CPU, memory, DB connections', 'gauge vs limit']])}` },
      { title: 'The cardinality trap', html: `<p>A metric <code>http_requests_total{route, status}</code> with 50 routes × 6 status classes = 300 time series. Add <code>user_id</code> as a label with 2M users → 600M series. The metrics store runs out of memory and your bill explodes. Rule: labels must have <b>bounded, small</b> value sets (route templates like <code>/orders/:id</code>, not raw URLs; status class, region, version). Put per-user detail in <b>logs or traces</b>, not metric labels.</p>` },
      { title: 'Tail sampling keeps the interesting traces', html: `<p>Traffic: 10,000 req/s. Keeping every trace = ~1 TB/day. A tail-sampling policy at the collector: keep <b>100% of traces with an error</b>, <b>100% slower than 1 s</b>, and <b>1% of the rest</b>. Result: typically &lt; 5% of the volume, with all of the traces you will actually open. Head sampling at 1% would have thrown away 99% of your errors.</p>` },
      { title: 'Good vs bad log line', html: `<p>Bad: <code>ERROR something went wrong</code>. Good: <code>{"ts":"2026-10-15T10:14:04.601Z","level":"ERROR","service":"payment","trace_id":"4bf9...","order_id":"o-91","dep":"bank","error":"timeout","timeout_ms":2500,"attempt":1}</code>. The good one can be filtered by service, joined to a trace, counted by error type, and contains no card number or email.</p>` }
    ],
    deepDive: `<p><b>Context propagation is the hard part.</b> Traces break if any hop drops the headers — message queues (put the trace context in message headers), thread pools / async code (propagate context explicitly), cron jobs (start a new trace with a <i>link</i> to the originating trace), third-party calls. Use OTel auto-instrumentation + the W3C <code>traceparent</code> standard and watch for "orphan" spans in your tracing backend.</p>
      <p><b>Metrics storage and cost.</b> Prometheus scrapes (pull) every 15 s and stores samples in a time-series DB (~1–2 bytes per sample after compression). Long-term storage via Thanos/Mimir/Cortex/VictoriaMetrics. Histograms: classic buckets (choose bounds near your SLO threshold!) vs native/exponential histograms (OTel, Prometheus native) with automatic resolution. Summaries (client-side quantiles) <b>cannot be aggregated</b> across instances — prefer histograms.</p>
      <p><b>Logs at scale.</b> Pipeline: app → stdout → agent (Fluent Bit / Vector / OTel collector) → buffer (Kafka) → store (Loki, Elasticsearch/OpenSearch, ClickHouse, cloud logging). Loki indexes only labels (cheap) and greps content; Elasticsearch indexes content (fast search, expensive). Guard against log storms: rate-limit repetitive lines, drop DEBUG, and make sure the logging pipeline cannot block the app (use non-blocking appenders — a stalled log shipper has taken down production services).</p>
      <p><b>Wide events / high-cardinality analytics.</b> Honeycomb-style observability stores one rich "wide event" per request (50–200 fields: user, region, build, flag states, timings) and lets you slice by any field after the fact. It answers "unknown unknowns" better than pre-aggregated metrics, at higher storage cost; sampling with weights keeps counts correct.</p>
      <p><b>Alert quality.</b> Each alert must be <b>urgent, actionable, and real</b>. Link to a dashboard and runbook. Track alert precision (fraction that required action); delete or demote noisy ones. Page on SLO burn and symptoms; put causes (disk 80%, one pod restart) in tickets or dashboards. Group related alerts to avoid a storm of 200 pages for one root cause. Prefer few, well-designed alerts to many.</p>
      <p><b>Monitoring the monitors.</b> If your observability stack runs on the same infra it watches, it will die with it. Have a dead-man's-switch (an always-firing alert that pages when it <i>stops</i> arriving), an external synthetic probe from outside your network, and keep a minimal status page on separate infrastructure.</p>
      <p><b>Continuous profiling and eBPF</b> are the 4th/5th signals: profiles (Pyroscope, Parca) show which function burns CPU; eBPF gives zero-code network and syscall visibility. Use them when a trace says "this service is slow" but not why.</p>`,
    aiEra: `<p><b>What AI changes:</b> (1) <b>AI-assisted triage</b>: tools correlate alerts, deploys and traces and suggest probable causes ("latency started 2 min after v412 deployed; bank-client pool exhausted"). LLM agents can query logs/metrics via MCP servers and draft an incident summary. (2) <b>Observing AI systems</b> is new: trace each LLM call (model, prompt version, input/output tokens, latency, cost), the retrieval step in RAG (which chunks), and each tool call in an agent loop — OTel has GenAI semantic conventions for this. Log prompts/responses carefully (privacy, PII redaction, sampling). Track quality metrics (eval scores, thumbs-down rate), not just latency and errors. (3) Anomaly detection replaces static thresholds for seasonal metrics.</p>
      <p><b>Use AI as a partner:</b> <code>Here is a 400-line trace JSON and the matching logs. Summarise the critical path, the slowest span by self time, and three hypotheses with how to test each.</code> Or have it draft PromQL from plain English — then run and sanity-check.</p>
      <p><b>Where AI goes wrong:</b> confident but wrong root causes from partial data, invented metric names, pasting sensitive logs into external tools, and suggesting alerts on every metric.</p>
      <p><b>What you must still own:</b> instrumenting the right things, privacy, deciding what pages a human, and verifying a diagnosis before acting (rollback is cheap; wrong fixes at 3 a.m. are not).</p>`,
    problems: [{
      title: 'Design the On-Call Dashboard and Alerts for a Checkout Service', level: 'Medium', tags: ['observability', 'dashboard', 'alerting', 'golden signals', 'SLO'], companies: ['Google', 'Datadog', 'Uber', 'Netflix'],
      statement: `<p>You own <b>checkout</b>, a service that calls Auth, Cart, Inventory, Payments (external bank), and Kafka for order events. The SLO: 99.9% of checkouts succeed and 95% finish in &lt; 800 ms. The on-call engineer should understand "is it broken, how bad, where, since when, what changed?" in <b>under 2 minutes</b>. Design the dashboard layout and the alerting policy.</p>`,
      constraints: `One screen for the top-level view; drill-down pages allowed. Max ~4 paging alerts for this service. Pages must be actionable with a runbook link.`,
      example: `<p>Top row: ${H.c('g', 'SLO health + error budget remaining (28 d)')}, ${H.c('b', 'current burn rate')}, ${H.c('y', 'deploy and feature-flag markers on every graph')}.</p>`,
      brute: { why: `<p><b>Naive design:</b> 60 panels of every metric the framework exposes (CPU of each pod, GC counts, 40 JVM gauges), and an alert on "CPU &gt; 80%" and "any 5xx". Result: the on-call scrolls, cannot tell user impact from noise, gets 30 pages/week for harmless CPU blips, learns to ignore the pager, and misses the real slow-burn problem. No link between alert, dashboard, traces and logs, so diagnosis is guesswork.</p>` },
      mcq: { q: 'Which alert should PAGE the on-call engineer?', options: ['One pod restarted once', 'CPU at 85% on a single node', 'Checkout error-budget burn rate of 14× over 1 hour and 5 minutes', 'Disk at 70% on a log server'], answer: 2, explain: 'Page on user-visible symptoms measured against the SLO. A single restart, one hot node or a 70% disk are causes/warnings that belong on dashboards or tickets, not at 3 a.m.' },
      hints: [`<p>Hint 1: Organise the dashboard top to bottom: <b>Is it broken?</b> (SLO) → <b>How bad / who?</b> (golden signals, by region and route) → <b>Where?</b> (per-dependency) → <b>What changed?</b> (deploys, flags) → <b>Resources</b> (saturation).</p>`, `<p>Hint 2: Use multi-window burn-rate alerts for the pages: 14.4× (1 h / 5 m) and 6× (6 h / 30 m), plus a ticket-level 1× (3 d).</p>`, `<p>Hint 3: Every alert links to the dashboard, a runbook, the trace search pre-filtered to errors, and the log query. Add a dead-man's-switch for the monitoring system itself.</p>`],
      solution: {
        approach: `<p><b>Dashboard (one screen, top → bottom).</b></p><ol>
<li><b>Row 1 — "Is the user hurting?"</b> SLO availability and latency SLI with the target line, 28-day error-budget remaining (big number, colour-coded), current burn rate (1 h and 6 h).</li>
<li><b>Row 2 — Golden signals for checkout.</b> Traffic (req/s vs same time last week), errors % (by HTTP code class), latency p50/p95/p99 (with the 800 ms line), saturation (worker threads in use / limit, request queue depth). Exemplar links from latency panel to traces.</li>
<li><b>Row 3 — "Where?"</b> RED table per downstream (Auth, Cart, Inventory, Payments, Kafka producer): their error % and p99 as seen by checkout, plus circuit-breaker state and bulkhead use. Break down by region/AZ and by route.</li>
<li><b>Row 4 — "What changed?"</b> Annotations for deploys (version, who), feature-flag flips, config changes, autoscaling events, upstream incidents.</li>
<li><b>Row 5 — Resources (USE).</b> CPU, memory, GC pause, DB connection-pool use, Kafka producer lag, retries and retry-budget use.</li></ol>
<p><b>Alerts (pages).</b> (1) Fast burn: error ratio &gt; 14.4 × 0.1% for both 1 h and 5 min → page. (2) Slow burn: &gt; 6 × for 6 h and 30 min → page. (3) Latency SLI burn (share under 800 ms below target) fast burn → page. (4) Dead-man's switch: monitoring pipeline silent for 5 min → page. <b>Tickets (non-paging):</b> 1× burn over 3 days, circuit breaker OPEN &gt; 10 min, retry-budget exhaustion, thread-pool use &gt; 80% for 30 min, certificate expiry &lt; 14 days, disk &gt; 80%.</p>
<p><b>Alert payload.</b> Title states user impact ("Checkout errors 3.2%, burn 32×"), links to dashboard (pre-set time range), top-5 failing routes, trace search for status=error, log query by trace ID, runbook with first three actions (check recent deploy → roll back; check Payments breaker; check Kafka).</p>
<p><b>Review loop.</b> Weekly: count pages, mark each actionable/not, delete or downgrade the noisy ones; after every incident, add the missing signal that would have shortened diagnosis.</p>`,
        complexity: `<p>Cost is mostly cardinality: ~10 labels with small value sets (route, status class, region, version, dependency) → a few thousand series per service, cheap. Traces sampled by tail policy; logs kept 7 d hot.</p>`,
        followUps: ['How would you add a synthetic probe and why does it help?', 'How do you alert on a metric that is seasonal (day/night)?', 'The dashboard is blank because Prometheus is down — what protects you?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 7 — Chaos Engineering & Game Days
     ===================================================================== */
  topics.push({
    title: 'Chaos Engineering: Break Things on Purpose (Safely)',
    analogy: `<p>A <b>fire drill</b>. Nobody wants a real fire, but if you wait for one to find out the exit door is locked, it is too late. So you set off the alarm on a calm Tuesday morning with the safety team standing by, watch what happens, and fix the locked door.</p>
      <p>Chaos engineering is the fire drill for software: you <b>deliberately cause small, controlled failures</b> (kill a server, slow a network link, cut off a zone) to learn how the system <i>really</i> behaves — before a real outage teaches you at 3 a.m. with customers watching.</p>`,
    explain: `<p>Everything in this module (failover, retries, breakers, bulkheads) is a <b>claim</b> about how the system will behave. Chaos engineering is how you <b>test the claim in the real, messy environment</b>. It is <i>not</i> random destruction; it is the scientific method:</p>
      <ol><li><b>Define steady state.</b> Pick a few business-level metrics that mean "healthy": orders/min, checkout success %, p99 latency. (Use your SLIs.)</li>
      <li><b>Form a hypothesis.</b> "If we kill one of three payment pods, checkout success stays ≥ 99.9% and p99 stays &lt; 800 ms."</li>
      <li><b>Inject a realistic fault</b> with a <b>small blast radius</b> (1 pod, 1% of users, one test tenant), plus a ready <b>abort button</b>.</li>
      <li><b>Observe.</b> Compare to the steady state. Did the hypothesis hold? Were alerts fired? Did the on-call know what to do?</li>
      <li><b>Learn and fix.</b> If it broke — great, you found it cheaply. Fix, then repeat. If it held — grow the blast radius or try a nastier fault.</li>
      <li><b>Automate and repeat</b> so regressions are caught (a fix from last year may be undone by a new deploy).</li></ol>
      <p><b>Kinds of faults to inject</b></p>
      ${H.table(['Layer', 'Fault', 'Question it answers'], [
        ['Compute', 'Kill an instance / pod / process; CPU or memory pressure; full disk', 'Does the load balancer drain it? Do we restart cleanly? Is state lost?'],
        ['Network', 'Add latency (200 ms → 3 s), drop packets, partition two services, break DNS', 'Do timeouts, retries and breakers work? Do we hang?'],
        ['Dependency', 'Return 500s/timeouts from a downstream; slow database; expired token', 'Do fallbacks work? Is the dependency really optional?'],
        ['Zone / region', 'Black-hole an availability zone; fail over a region', 'Is capacity N+1 real? Is RTO what the runbook says?'],
        ['Data', 'Corrupt/duplicate messages; replay events; clock skew; leader election storm', 'Is processing idempotent? Do clocks and leases behave?'],
        ['Human / process', 'On-call drill: page the team with a fake incident; deny access to the main tool', 'Do runbooks, dashboards and escalation work?']
      ])}
      <p><b>Safety rules (what makes it engineering, not recklessness):</b></p>
      <ul><li>Start in <b>staging</b>, then production with tiny blast radius — real traffic patterns are what staging lacks.</li>
      <li>Have <b>automatic abort conditions</b> (if error rate &gt; X% or SLO burn &gt; Y, stop and roll back the fault).</li>
      <li>Announce it, run it in working hours with the owning team present, avoid peak events (sales, holidays).</li>
      <li>Don't run an experiment when you <i>already know</i> it will fail and have no fix — fix first, then verify with chaos.</li></ul>
      <p><b>Formats:</b> <b>Chaos Monkey</b> (Netflix: randomly kills instances during business hours, so every team builds for it), <b>Game days</b> (planned, team-wide exercises for a bigger scenario like "lose a zone"), <b>automated experiments in CI/CD</b> (a fault run as a pipeline stage), and <b>disaster-recovery (DR) drills</b> (actually fail over to the other region and run there for a day). Tools: Gremlin, LitmusChaos, Chaos Mesh, AWS Fault Injection Service, Azure Chaos Studio, Toxiproxy (network faults for tests), Istio fault injection.</p>`,
    clues: [
      '"how do you know your failover actually works?" → chaos experiments / game days / DR drills',
      '"we have retries and breakers, how do you verify them?" → fault injection (latency, errors) against steady-state metrics',
      '"what if an entire AZ goes down?" → zone-failure game day; check capacity and RTO',
      '"Netflix Chaos Monkey", "Simian Army", "resilience testing" → randomised instance termination, culture of designing for failure',
      '"limit the blast radius" → start small, canary users, abort conditions',
      '"post-incident" / "blameless postmortem" → turn the failure into an action list; add a chaos test as regression'
    ],
    code: [
      { lang: 'python', run: true, title: 'Tiny fault injector: latency + errors with probability (runnable)', code: `import random

class ChaosProxy:
    """Wrap any function; inject faults for a given fraction of calls (deterministic seed for tests)."""
    def __init__(self, fn, error_rate=0.0, extra_latency_ms=0, latency_rate=0.0, seed=1):
        self.fn, self.error_rate = fn, error_rate
        self.extra_latency_ms, self.latency_rate = extra_latency_ms, latency_rate
        self.rng = random.Random(seed)
        self.simulated_ms = 0

    def __call__(self, *a, **k):
        if self.rng.random() < self.latency_rate:
            self.simulated_ms += self.extra_latency_ms        # we only SIMULATE the delay here
        if self.rng.random() < self.error_rate:
            raise ConnectionError("chaos: injected failure")
        return self.fn(*a, **k)

def get_recs(user):               # the real dependency
    return ["laptop", "mouse"]

def home_page(recs_fn):           # code under test: should degrade gracefully
    try:
        return {"recs": recs_fn("u1"), "degraded": False}
    except ConnectionError:
        return {"recs": ["popular-items"], "degraded": True}

# Hypothesis: with 30% of recommendation calls failing, 100% of pages still render.
chaotic = ChaosProxy(get_recs, error_rate=0.30)
pages = [home_page(chaotic) for _ in range(1000)]
rendered = len(pages)
degraded = sum(p["degraded"] for p in pages)
print(f"pages rendered: {rendered}/1000  degraded: {degraded}  (~30% expected)")
print("hypothesis holds" if rendered == 1000 else "hypothesis FAILED")
` },
      { lang: 'java', title: 'A servlet-style fault-injection wrapper (feature-flag controlled)', code: `import java.util.Random;
import java.util.concurrent.Callable;
import java.util.function.BooleanSupplier;

/** Wraps a dependency call; when chaos is ON, it randomly adds delay or throws. Controlled by a flag/kill switch. */
class FaultInjector {
    private final Random random = new Random();
    private final BooleanSupplier enabled;     // reads a feature flag / config; the instant ABORT switch
    private final double errorRate;            // e.g. 0.05 -> 5% of calls fail
    private final double delayRate;            // fraction of calls that get extra latency
    private final long delayMs;

    FaultInjector(BooleanSupplier enabled, double errorRate, double delayRate, long delayMs) {
        this.enabled = enabled;
        this.errorRate = errorRate;
        this.delayRate = delayRate;
        this.delayMs = delayMs;
    }

    <T> T call(Callable<T> real) throws Exception {
        if (enabled.getAsBoolean()) {
            if (random.nextDouble() < delayRate) Thread.sleep(delayMs);      // simulate a slow dependency
            if (random.nextDouble() < errorRate) {
                throw new java.io.IOException("chaos: injected failure");    // simulate a failing dependency
            }
        }
        return real.call();                                                   // otherwise behave normally
    }
}` }
    ],
    codeTitle: ['Fault injector (Python)', 'Fault injection wrapper (Java)'],
    viz: [
      {
        title: 'A chaos experiment: hypothesis → inject → observe → verdict',
        input: 'fault=latency',
        inputLabel: 'fault = kill | latency | zone',
        gen: function (input) {
          var kv = parseKV(input), f = (kv.fault || 'latency').toLowerCase();
          if (['kill', 'latency', 'zone'].indexOf(f) < 0) throw new Error('Type fault=kill, fault=latency or fault=zone');
          var cfg = {
            kill: { target: 'P2', title: 'Kill 1 of 3 payment pods', hyp: 'Checkout success stays ≥ 99.9% and p99 stays &lt; 800 ms; the load balancer drains the dead pod.', obs: [99.95, 99.93, 640], pass: true,
              finding: '<span class="c-g">Hypothesis held.</span> The LB removed the pod after 3 failed checks (6 s) and clients retried on the other pods. Small blip, no budget burned. Next: kill 2 of 3.', tag: 'killed' },
            latency: { target: 'R', title: 'Add 3 s latency to the Recommendations service', hyp: 'The home page still loads in &lt; 500 ms; recommendations fall back to a cached list.', obs: [99.9, 93.1, 3100], pass: false,
              finding: '<span class="c-r">Hypothesis FAILED</span> — and we found it safely. The home page waited the full 3 s: there was <b>no timeout</b> on the recs client and threads piled up. Fix: 150 ms timeout + circuit breaker + bulkhead + cached fallback; re-run the same experiment to prove it.', tag: '+3000 ms' },
            zone: { target: 'AZ2', title: 'Black-hole availability zone 2', hyp: 'Traffic shifts to AZ1 + AZ3 in &lt; 60 s; success ≥ 99.5%.', obs: [99.6, 97.4, 1650], pass: false,
              finding: '<span class="c-y">Partially held.</span> Failover worked in 45 s, but the 2 remaining zones ran at 94% CPU (capacity was planned for only 3 zones at 75% load) and latency rose to 1.6 s. Fix: more headroom (N+1 per zone) or load shedding for low-priority traffic; then re-test.', tag: 'zone down' }
          }[f];
          function topo(hl, tags, ehl) {
            return { type: 'graph', directed: true, height: 62, label: 'Topology under test', nodes: [
              { id: 'U', label: 'Users', x: 8, y: 31, shape: 'box' },
              { id: 'GW', label: 'Gateway', x: 28, y: 31, shape: 'box' },
              { id: 'P1', label: 'Pay pod 1', x: 56, y: 8, shape: 'box' },
              { id: 'P2', label: 'Pay pod 2', x: 56, y: 24, shape: 'box' },
              { id: 'P3', label: 'Pay pod 3', x: 56, y: 40, shape: 'box' },
              { id: 'R', label: 'Recs service', x: 56, y: 56, shape: 'box' },
              { id: 'AZ2', label: 'Zone 2', x: 88, y: 31, shape: 'box' }],
              edges: [['U', 'GW'], ['GW', 'P1'], ['GW', 'P2'], ['GW', 'P3'], ['GW', 'R'], ['P2', 'AZ2', 'runs in']], hl: hl, tags: tags || {}, ehl: ehl || {} };
          }
          var fr = [];
          fr.push({ narr: '<b>1. Steady state.</b> Define healthy: checkout success ≈ 99.95%, p99 ≈ 600 ms, orders/min flat. Experiment: <b>' + cfg.title + '</b>.', parts: [topo({}, {}), { type: 'table', label: 'Steady-state baseline', columns: ['metric', 'baseline', 'must stay'], rows: [['checkout success', '99.95%', '≥ 99.5%'], ['p99 latency', '600 ms', '< 800 ms'], ['orders/min', '1,200', '± 10%']] }] });
          fr.push({ narr: '<b>2. Hypothesis:</b> ' + cfg.hyp + ' <b>Blast radius:</b> 1 production cell, 10% of users. <b>Abort rule:</b> stop if success &lt; 99% for 2 minutes. The team is on the call; the abort button is ready.', parts: [topo({}, {}), { type: 'vars', vals: { hypothesis: 'see narration', 'blast radius': '10% of users', 'abort if': 'success < 99% for 2 min' } }] });
          var hl = {}; hl[cfg.target] = 'bad'; var tg = {}; tg[cfg.target] = cfg.tag;
          fr.push({ narr: '<b>3. Inject the fault.</b> ' + cfg.title + '. Watch the dashboards, alerts and the on-call\'s reaction.', parts: [topo(hl, tg, f === 'kill' ? { 'GW-P2': 'bad' } : f === 'latency' ? { 'GW-R': 'bad' } : { 'P2-AZ2': 'bad' }), { type: 'text', html: 'Fault active. <b>Do not touch anything</b> — we want to see what the system and the humans do on their own.' }] });
          fr.push({ narr: '<b>4. Observe.</b> Compare the experiment window with the baseline.', parts: [topo(hl, tg), { type: 'bars', label: 'Checkout success % (baseline vs during experiment)', values: [99.95, cfg.obs[1]], texts: ['99.95', String(cfg.obs[1])], idxLabels: ['baseline', 'during'], hl: { 0: 'ok', 1: cfg.pass ? 'ok' : 'bad' } }, { type: 'bars', label: 'p99 latency ms (baseline vs during experiment)', values: [600, cfg.obs[2]], texts: ['600', String(cfg.obs[2])], idxLabels: ['baseline', 'during'], hl: { 0: 'ok', 1: cfg.obs[2] < 800 ? 'ok' : 'bad' } }] });
          fr.push({ narr: '<b>5. Verdict &amp; learning.</b> ' + cfg.finding, parts: [{ type: 'table', label: 'Experiment record', columns: ['item', 'result'], rows: [['experiment', cfg.title], ['hypothesis held?', cfg.pass ? 'YES' : f === 'zone' ? 'PARTLY' : 'NO'], ['alert fired?', cfg.pass ? 'no (not needed)' : 'yes, after 3 min (too slow? tune)'], ['action items', cfg.pass ? 'increase blast radius; automate in CI' : 'fix, then re-run same experiment']], hl: { 1: cfg.pass ? 'ok' : 'bad' } }] });
          return fr;
        }
      },
      {
        title: 'Growing the blast radius with an abort rule',
        input: 'abort=1.0 impact=0.08',
        inputLabel: 'abort error-rate % and impact (extra error % per 1% of traffic affected)',
        gen: function (input) {
          var kv = parseKV(input), abort = num(kv.abort, 1.0), imp = num(kv.impact, 0.08);
          if (!(abort > 0 && abort <= 50 && imp >= 0 && imp <= 2)) throw new Error('Example: abort=1.0 impact=0.08');
          var steps = [1, 5, 10, 25, 50, 100], fr = [], vals = [], lab = [], tx = [];
          fr.push({ narr: 'We never go straight to 100% of users. We ramp: 1% → 5% → 10% → 25% → 50% → 100%, checking the error rate at each step. <b>Abort rule:</b> stop and remove the fault if error rate exceeds <b>' + abort + '%</b>. This system adds about <b>' + imp + '%</b> error rate per 1% of traffic that sees the fault.', parts: [{ type: 'vars', vals: { 'abort above': abort + '%', 'impact per 1% traffic': imp + '% errors' } }] });
          for (var i = 0; i < steps.length; i++) {
            var err = r2(0.05 + steps[i] * imp), over = err > abort;
            vals.push(err); lab.push(steps[i] + '%'); tx.push(err + '%');
            fr.push({ narr: 'Step ' + (i + 1) + ': fault applied to <b>' + steps[i] + '%</b> of traffic → overall error rate ≈ <b>' + err + '%</b>. ' + (over ? '<span class="c-r">Above the abort line (' + abort + '%) → ABORT. Remove the fault, record that the system breaks at about ' + steps[i] + '% blast radius.</span>' : '<span class="c-g">Within limits</span> → hold for a few minutes, then move to the next step.'),
              parts: [{ type: 'bars', label: 'Error rate % at each blast-radius step', values: vals.slice(), texts: tx.slice(), idxLabels: lab.slice(), hl: (function () { var h = {}; h[i] = over ? 'bad' : 'ok'; return h; })() }, { type: 'vars', vals: { 'blast radius': steps[i] + '%', 'error rate': err + '%', 'abort line': abort + '%' }, hl: { 'error rate': over ? 'bad' : 'ok' } }] });
            if (over) return fr;
          }
          fr.push({ narr: 'The fault was safe even at 100% — the system tolerates this failure. Record it as a passing, <b>automated regression experiment</b>.', parts: [{ type: 'text', html: 'Passing at 100% = a confident <b>yes</b> to "can we survive this?"' }] });
          return fr;
        }
      }
    ],
    examples: [
      { title: 'Chaos Monkey in practice: kill random instances in business hours', html: `<p>Netflix runs Chaos Monkey in production during working hours, when engineers are at their desks. Any instance may vanish at any time, so every service had to become stateless, auto-recovering and behind health-checked load balancers. Because it is routine, a real instance failure is a non-event. The cultural effect (design assuming failure) matters more than any single bug found.</p>${H.table(['Without routine chaos', 'With routine chaos'], [['Instance dies: page at 3 a.m.', 'Instance dies: nobody notices'], ['Failover untested for months', 'Failover tested daily'], ['Hidden state on servers', 'State moved to proper stores']])}` },
      { title: 'A game day: lose the primary database', html: `<p>Scenario for a 2-hour game day: "the Postgres primary in AZ-1 becomes unreachable at 14:00". Roles: <b>Incident commander</b>, <b>ops lead</b>, <b>scribe</b>, <b>observer</b> (writes down surprises), <b>facilitator</b> (controls the fault, holds the abort). Steps: brief → inject → team responds using only runbooks and dashboards → timer records time-to-detect, time-to-decide, time-to-recover → debrief within 24 h. Typical findings: runbook command out of date, alert fired in the wrong channel, app did not reconnect until restarted, replica lag higher than assumed (RPO!).</p>${H.table(['Measure', 'Target', 'Actual'], [['Time to detect', '< 2 min', '4 min (alert threshold too loose)'], ['Time to recover (RTO)', '< 5 min', '11 min (app pool kept dead connections)'], ['Data lost (RPO)', '0', '2 s of writes']])}` },
      { title: 'Toxiproxy in an integration test', html: `<p>In CI, run your service against a database through <b>Toxiproxy</b>, a TCP proxy where you can add a "latency" or "timeout" toxic. Test: "when the DB stalls for 5 s, <code>/orders</code> returns 503 within 1 s, the breaker opens, and <code>/health</code> stays green". It is a cheap way to turn your timeouts and breakers into regression tests so a refactor cannot silently remove them.</p>` },
      { title: 'Blameless postmortem → new chaos test', html: `<p>After a real incident, write a short blameless postmortem: timeline, impact (budget burned), root cause(s) and <i>contributing factors</i>, what went well, action items with owners. Then add a chaos experiment that reproduces the failure and keep it running in CI/staging forever. "We fixed it" becomes "we keep proving it's fixed."</p>` }
    ],
    deepDive: `<p><b>Principles of Chaos Engineering</b> (principlesofchaos.org): build a hypothesis around steady-state behaviour; vary real-world events; run experiments in production; automate experiments to run continuously; minimise blast radius. Production matters because staging differs in traffic shape, data volume, config, and dependency versions — but start in staging to catch obvious breakage and to rehearse the tooling.</p>
      <p><b>Steady state is a business metric, not CPU.</b> Netflix uses "stream starts per second". A fault that makes CPU spike but leaves stream starts flat is not an outage. Choose the metric users would miss.</p>
      <p><b>What chaos finds most often:</b> (1) missing or infinite timeouts; (2) retries without backoff or at several layers; (3) fallbacks that were never exercised and are themselves broken; (4) hard dependencies believed to be optional; (5) config differences between replicas; (6) capacity not really N+1; (7) stale runbooks; (8) alerts that fire late, in the wrong place, or not at all; (9) health checks that are too deep or too shallow; (10) cold-cache stampedes on recovery.</p>
      <p><b>Fault injection mechanisms.</b> Infrastructure level (cloud APIs terminate instances, AWS FIS stops AZ networking); host level (agents with <code>tc netem</code> for latency/loss, <code>stress-ng</code>, <code>iptables</code> drops); application level (injected delay/exception behind a flag; service-mesh fault injection with abort/delay rules at a % of requests, e.g. Istio <code>VirtualService.fault</code>); dependency level (Toxiproxy, WireMock). Prefer the least invasive level that answers the question, always with an off switch.</p>
      <p><b>Safety and governance.</b> Pre-approved experiment catalog; automatic abort tied to SLO burn; exclusion lists (no chaos during incidents, deploys, or Black Friday); customer-impact review; keeping data safe (never run destructive experiments against production data stores without backups verified). Treat the chaos tool's credentials as highly privileged — they can break production.</p>
      <p><b>Related practices.</b> <b>Disaster Recovery drills</b> (restore from backup into a clean environment and measure time — a backup you have not restored is a hope). <b>Load and soak tests</b> (capacity). <b>Canary releases + automatic rollback</b> (limit the blast radius of <i>your own</i> changes — the most common source of outages). <b>Dependency failure budgets</b> (each team's SLO includes their upstreams). <b>Wheel of Misfortune</b> (tabletop incident role-plays for new on-call engineers).</p>
      <p><b>Measuring the programme.</b> Track number of experiments, % passing, findings fixed, time-to-detect and time-to-recover in drills over time, and — the real goal — a drop in customer-visible incidents of the types you test. If findings keep repeating, the problem is the fix process, not the testing.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI makes it cheaper to <b>generate</b> experiments: LLMs read your architecture, service-dependency graph and past postmortems and propose ranked hypotheses ("kill the feature-store: does the ranker fall back?"). AI-driven tools can run exploration in staging and flag weak spots. New failure modes to test in AI systems: model-provider outage or rate-limit (does the router fall back?), slow first-token latency, vector DB down (does RAG degrade to keyword search?), context-length overflow, tool-call errors in agent loops, corrupted or poisoned retrieval data, prompt-injection from external content, and GPU node loss mid-generation. And the on-call itself changes: AI assistants summarise incidents and suggest runbook steps — drill the humans <i>and</i> the assistant.</p>
      <p><b>Use AI as a partner:</b> <code>Here is our service graph and last 6 postmortems. Propose 10 chaos experiments, each with a hypothesis, steady-state metric, fault, blast radius and abort condition. Rank by risk reduction.</code></p>
      <p><b>Where AI goes wrong:</b> it suggests dangerous experiments with no abort condition, ignores data-safety, and proposes tools/flags that do not exist.</p>
      <p><b>What you must still own:</b> approving every experiment, the blast radius and abort rule, being present during the run, and turning the findings into fixes that actually ship.</p>`,
    problems: [{
      title: 'Plan a Game Day for a Zone Failure', level: 'Hard', tags: ['chaos engineering', 'game day', 'DR', 'blast radius', 'failover'], companies: ['Netflix', 'Amazon', 'Google', 'Uber'],
      statement: `<p>Your company runs an e-commerce platform in one region across 3 availability zones: stateless web/API tier (Kubernetes), PostgreSQL (primary + sync standby + async replica), Redis cache cluster, Kafka (3 brokers, one per AZ). Leadership wants proof that "we survive losing an AZ". Plan a <b>game day</b>: hypotheses, steady-state metrics, blast radius and ramp, abort conditions, roles, what to measure, and how you turn results into improvements. Be explicit about safety.</p>`,
      constraints: `Production traffic must continue; error budget remaining 60%; no peak-sale periods; business hours; max planned customer impact: a few seconds of elevated errors for a small share of users.`,
      example: `<p>One hypothesis: ${H.c('b', '"When AZ-2 is isolated, within 60 s checkout success returns to ≥ 99.5% and p99 &lt; 1 s; no data loss; Kafka keeps accepting writes."')}</p>`,
      brute: { why: `<p><b>Naive approach:</b> "Let's shut down AZ-2 in production on Friday afternoon and see what happens." No hypothesis, no steady-state definition, no abort condition, no communication to support, no verified backups, no owners available (it's Friday evening), and the first time anyone learns that the cluster runs at 90% CPU at normal load is when customers see it. If something unexpected breaks (e.g. the DB standby is in AZ-2 and replication was async), it becomes a real outage with data loss — chaos without science.</p>` },
      mcq: { q: 'What is the BEST way to start the zone-failure experiment in production?', options: ['Isolate the whole zone at once to see the true worst case', 'First rehearse in staging, then isolate a single cell/10% of traffic or drain one zone with a manual abort ready, and ramp up', 'Wait for a real outage and observe it', 'Run it at 2 a.m. when nobody is watching'], answer: 1, explain: 'Rehearse, limit blast radius, ramp gradually, have an abort rule and humans present. Observing real outages teaches too late; doing it unattended at 2 a.m. removes the people who can abort and learn.' },
      hints: [`<p>Hint 1: Write the preconditions: capacity check (can 2 zones carry 100%?), replica health, backups verified, runbooks linked, on-call and support informed.</p>`, `<p>Hint 2: Ramp: staging full-AZ → production drain of AZ-2 for web tier only → DB failover of primary → full network isolation of AZ-2. Each stage has a go/no-go.</p>`, `<p>Hint 3: Measure RTO, RPO, time-to-detect, capacity headroom and human actions; assign each finding an owner and a date; re-run the same game day after fixes.</p>`],
      solution: {
        approach: `<p><b>Plan.</b></p><ol>
<li><b>Steady state.</b> Checkout success ≥ 99.9%, p99 ≤ 800 ms, orders/min within ±10% of the same hour last week, Kafka producer error rate ≈ 0, DB replication lag &lt; 1 s.</li>
<li><b>Hypotheses.</b> H1: draining AZ-2's web pods moves traffic with no error spike beyond 30 s. H2: losing the Postgres primary in AZ-2 promotes the sync standby in &lt; 60 s with RPO = 0. H3: Redis loss of a shard primary causes a cache miss spike but the DB survives (stampede protection works). H4: Kafka loses a broker, producers continue with acks=all and min.insync.replicas=2. H5: the remaining two zones stay below 90% CPU.</li>
<li><b>Pre-checks (go/no-go).</b> Capacity: peak CPU ≤ 60% so that 2 of 3 zones handle load (≤ 90%) — if not, fix <i>before</i> the game day. Fresh, restore-tested backups; replicas healthy; runbooks reviewed; error budget &gt; 50%; no deploys frozen or in flight; support and status-page owners informed; abort command rehearsed.</li>
<li><b>Roles.</b> Facilitator (owns the fault + abort), incident commander, ops/DB/app leads, scribe, observer, comms.</li>
<li><b>Ramp.</b> Stage 1 (staging, full AZ isolation). Stage 2 (prod): cordon and drain AZ-2 web pods. Stage 3: fail over the Postgres primary deliberately (graceful then crash). Stage 4: block network to AZ-2 for 15 minutes (the real thing). Between stages, hold 10 minutes and compare against steady state.</li>
<li><b>Abort rules.</b> Checkout success &lt; 99% for 2 minutes, p99 &gt; 3 s for 3 minutes, any sign of data inconsistency, or any team member calls "stop". Abort = restore network / un-cordon, then verify recovery.</li>
<li><b>Measure.</b> Time to detect, to decide, to recover (RTO); data lost (RPO); capacity headroom; number of manual steps; which alerts fired and when; user-facing errors (budget burned).</li>
<li><b>Debrief and follow-up.</b> Blameless review within 24 h. Each finding → ticket with owner and deadline. Fix, then re-run the same stage until it passes. Automate the web-tier drain and single-DB-failover as recurring experiments; run the full zone isolation twice a year and after major architecture changes.</li></ol>
<p><b>Expected findings:</b> connection pools that keep dead connections, DNS TTL longer than assumed, a cron job pinned to one AZ, and capacity headroom smaller than believed. Each is a cheap fix compared with finding it in a real outage.</p>`,
        complexity: `<p>Effort: ~2 weeks of preparation, a 3-hour game day, ~2 weeks of fixes. Expected customer impact: seconds of elevated errors for a small share of traffic at most.</p>`,
        followUps: ['How would you extend this to a full region failure?', 'How do you convince leadership to allow production experiments?', 'Which of these experiments would you automate and run weekly?']
      }
    }]
  });

  /* =====================================================================
     PRACTICE PROBLEMS (Easy -> Medium -> Hard)
     ===================================================================== */
  practice.push({
    title: 'Composite Availability of a Request Path', level: 'Easy', tags: ['availability', 'redundancy', 'series/parallel'], companies: ['Amazon', 'Microsoft', 'Oracle'],
    statement: `<p>A request goes through <b>Load Balancer (99.99%) → App server → Database (99.95%)</b>. The app tier is one server at <b>99.5%</b>. (a) What is the end-to-end availability? (b) You add a second identical app server (independent, either one is enough). What is it now? (c) How many minutes of downtime per 30 days is that?</p>`,
    constraints: `Assume independent failures. Use 43,200 minutes per 30 days.`,
    example: `<p>Series: ${H.c('b', '0.9999 × 0.995 × 0.9995')} ≈ ${H.c('r', '99.44%')}. Two app servers in parallel: ${H.c('b', '1 − 0.005²')} = ${H.c('g', '99.9975%')}.</p>`,
    brute: { why: `<p><b>Naive reasoning:</b> "Average the three numbers" (99.81%) or "the system is as good as the best part (99.99%)". Both are wrong: in a chain every part must work, so you <i>multiply</i>; the weakest part dominates. Adding a database replica would not help here — the app server was the weak link.</p>` },
    mcq: { q: 'Two independent servers, each 99% available, either one is enough. System availability?', options: ['99%', '99.9%', '99.99%', '98%'], answer: 2, explain: 'Down only if both are down: 0.01 × 0.01 = 0.0001, so availability = 99.99%.' },
    hints: [`<p>Hint 1: Components that must <b>all</b> work multiply availabilities.</p>`, `<p>Hint 2: Components where <b>any one</b> is enough: unavailability multiplies (0.005 × 0.005).</p>`, `<p>Hint 3: Recompute the chain with the new app-tier value, then minutes = (1 − A) × 43,200.</p>`],
    solution: {
      approach: `<p><b>(a)</b> Series: 0.9999 × 0.995 × 0.9995 = 0.99440… ≈ <b>99.44%</b> → down about 0.56% of the time ≈ 242 minutes per 30 days. The app server (99.5%) is the weak link.</p><p><b>(b)</b> Two app servers in parallel: 1 − (0.005)² = 1 − 0.000025 = <b>99.9975%</b>. Chain: 0.9999 × 0.999975 × 0.9995 ≈ <b>99.94%</b>.</p><p><b>(c)</b> (1 − 0.99938) × 43,200 ≈ <b>27 minutes</b> per 30 days (from 242). Now the database (99.95%) and load balancer are the limit: next you would add a DB standby and redundant LBs. Remember the independence assumption — put copies in different zones.</p>`,
      complexity: `<p>Arithmetic only. The insight: find and replicate the weakest series element first.</p>`,
      followUps: ['Which component should be made redundant next, and what is the new total?', 'Why can the real result be worse than this calculation?']
    }
  });

  practice.push({
    title: 'Which Failures Should Be Retried?', level: 'Easy', tags: ['retries', 'idempotency', 'HTTP'], companies: ['Stripe', 'Google', 'Atlassian'],
    statement: `<p>Classify each response/error as <b>retry</b>, <b>retry only if idempotent</b>, or <b>never retry</b>: (1) <code>503 Service Unavailable</code>; (2) <code>400 Bad Request</code>; (3) read timeout on <code>POST /orders</code>; (4) <code>429</code> with <code>Retry-After: 5</code>; (5) <code>404 Not Found</code>; (6) connection refused; (7) <code>401 Unauthorized</code> with an expired token. Explain briefly.</p>`,
    constraints: `Assume a client library with a max of 3 attempts and exponential backoff with jitter.`,
    example: `<p>A ${H.c('g', 'connection refused')} means the request never reached the server, so it is safe to retry. A ${H.c('r', '400')} will fail identically every time.</p>`,
    brute: { why: `<p><b>Naive policy:</b> "retry on any exception". It retries 400/404 (pointless load), retries a timed-out <code>POST</code> that may have succeeded (duplicate orders), and ignores <code>Retry-After</code> so a rate-limited client keeps hammering.</p>` },
    mcq: { q: 'A POST /orders call timed out. The order MAY have been created. What makes a retry safe?', options: ['Nothing; never retry POST', 'Sending the same idempotency key so the server de-duplicates', 'Retrying faster', 'Switching to GET'], answer: 1, explain: 'An idempotency key lets the server recognise the repeat and return the original result instead of creating a second order.' },
    hints: [`<p>Hint 1: Ask: "could a second attempt produce a different outcome?" Client errors (4xx) cannot; transient server/network errors can.</p>`, `<p>Hint 2: Ambiguous outcomes (timeouts after sending) are only safe for idempotent operations or with an idempotency key.</p>`, `<p>Hint 3: 429 → wait the time in <code>Retry-After</code>; 401 → refresh the token once, then retry; never loop.</p>`],
    solution: {
      approach: `<p>(1) <b>503</b>: retry with backoff + jitter (server temporarily unavailable). (2) <b>400</b>: never — the request itself is invalid. (3) <b>POST timeout</b>: retry <i>only</i> with the same idempotency key (otherwise you risk a duplicate order); if no key support, query the order status instead of blind-retrying. (4) <b>429 + Retry-After</b>: retry after at least 5 s (plus a little jitter) and count against the retry budget. (5) <b>404</b>: never (the resource is not there; maybe a brief exception for eventual-consistency read-after-create, with one short retry). (6) <b>Connection refused</b>: retry — nothing was processed; consider failing over to another host. (7) <b>401 expired token</b>: not a blind retry — refresh the credentials once, then retry once; if still 401, stop.</p><p>General rule: retry <b>transient</b> errors, respect server hints, protect with idempotency, cap attempts and total time, and add jitter.</p>`,
      complexity: `<p>Policy table, no computation. Cost of a wrong rule: duplicate side effects (too many retries) or avoidable failures (too few).</p>`,
      followUps: ['How does a retry budget change this table?', 'Which of these should also trip a circuit breaker?']
    }
  });

  practice.push({
    title: 'Trace the Circuit Breaker', level: 'Easy', tags: ['circuit breaker', 'state machine'], companies: ['Netflix', 'Uber', 'Atlassian'],
    statement: `<p>A breaker is configured: trip after <b>3 consecutive failures</b>, stay OPEN for <b>3 ticks</b>, need <b>2 successful probes</b> to close. One call per tick; the dependency's real outcome per tick is: <code>s f f f s s s f s s s s</code> (s = would succeed, f = would fail). Write the breaker state and what the caller experienced at every tick.</p>`,
    constraints: `While OPEN, calls are rejected without reaching the dependency. After 3 OPEN ticks the next call is a probe in HALF_OPEN.`,
    example: `<p>Ticks 2-4 fail → ${H.c('r', 'trips at tick 4')}. Then OPEN for ticks 5, 6, 7 (rejected). Tick 8 is the first probe.</p>`,
    brute: { why: `<p><b>Naive approach:</b> no breaker — all 12 calls go to the dependency. The 4 failing calls each wait a full timeout, and the dependency never gets a quiet period. With the breaker, the failures after the trip never occur, so threads are not wasted.</p>` },
    mcq: { q: 'In HALF_OPEN a probe fails. What happens?', options: ['Breaker closes', 'Breaker re-opens and the cool-down timer restarts', 'Breaker stays half-open forever', 'All requests are retried'], answer: 1, explain: 'A failed probe shows the dependency is still unhealthy: go back to OPEN and wait the full cool-down again.' },
    hints: [`<p>Hint 1: The failure counter only counts <b>consecutive</b> failures while CLOSED; a success resets it.</p>`, `<p>Hint 2: OPEN lasts exactly 3 rejected ticks; the call right after is the first probe, evaluated against the real outcome of that tick.</p>`, `<p>Hint 3: Write a table: tick, real outcome, state before, action, state after.</p>`],
    solution: {
      approach: `<p>Walk through: tick 1 <b>s</b> (CLOSED, ok). Tick 2 <b>f</b> (CLOSED, fails=1). Tick 3 <b>f</b> (fails=2). Tick 4 <b>f</b> (fails=3 → <b>TRIP → OPEN</b>). Ticks 5, 6, 7: <b>OPEN, rejected</b> (fallback), real outcomes (s s s) are never seen. Tick 8: real outcome <b>f</b>, breaker is HALF_OPEN (cool-down done) — the probe <b>fails</b> → back to <b>OPEN</b>. Ticks 9, 10, 11: OPEN, rejected. Tick 12: HALF_OPEN probe, real outcome <b>s</b> → probe successes 1/2, still HALF_OPEN.</p><p>The caller saw: 1 success, 3 slow failures (waited for timeouts), 3 instant fallbacks, 1 failed probe, 3 instant fallbacks, 1 probe success. Total dependency calls: 6 instead of 12, and the dependency got two quiet periods. Note that even though ticks 5-7 would have succeeded, the breaker could not know — this "cost" of being OPEN is the price of protection.</p>`,
      complexity: `<p>O(1) per call; state is three counters.</p>`,
      followUps: ['How would a failure-RATE window change when it trips?', 'What happens if probes are allowed concurrently?']
    }
  });

  practice.push({
    title: 'Pick SLIs for Three Different Services', level: 'Easy', tags: ['SLI', 'SLO', 'user journeys'], companies: ['Google', 'Spotify', 'Netflix'],
    statement: `<p>Propose one or two good SLIs (as <b>good events ÷ valid events</b>) and a sensible SLO for each: (a) a public REST API for payments; (b) a nightly data pipeline that builds the "daily sales report"; (c) a video-streaming playback service.</p>`,
    constraints: `Measure close to the user. Avoid averages. Exclude events that are not your fault from the denominator.`,
    example: `<p>(a) Availability SLI: ${H.c('b', 'non-5xx responses ÷ valid requests')} (excluding 4xx and health checks), SLO 99.95% / 30 days.</p>`,
    brute: { why: `<p><b>Naive answer:</b> "uptime 99.99% for everything, measured by CPU and a ping". CPU and ping say nothing about whether users succeed; one number does not fit a pipeline (which can be 'up' while producing yesterday's data) or video (where buffering matters). 99.99% for everything is also unaffordable.</p>` },
    mcq: { q: 'Which is the best SLI for a nightly data pipeline?', options: ['CPU utilisation of the workers', 'Freshness: share of days the report was ready by 06:00 with ≥ 99.9% of rows processed', 'Average job runtime', 'Number of servers'], answer: 1, explain: 'Users of a report care that it is on time and complete: freshness and coverage. CPU and runtime are causes, not user outcomes.' },
    hints: [`<p>Hint 1: Ask what the user notices going wrong for this kind of service (errors? slowness? stale data? buffering?).</p>`, `<p>Hint 2: Write each SLI as a ratio with a clear numerator and denominator.</p>`, `<p>Hint 3: Pick the target from user need and current performance, with two or three SLOs per service at most.</p>`],
    solution: {
      approach: `<p><b>(a) Payments API.</b> SLI 1 (availability): requests not returning 5xx or timing out ÷ valid requests (exclude 4xx, health checks), measured at the load balancer. SLO 99.95% over 30 days. SLI 2 (latency): share of <code>POST /charge</code> completing under 800 ms. SLO: 95% &lt; 800 ms, 99% &lt; 2 s. Also, correctness: zero double charges (alert on duplicates).</p><p><b>(b) Data pipeline.</b> SLI 1 (freshness): share of days the report is published by 06:00. SLO 99% of days over 90 days. SLI 2 (coverage/correctness): processed rows ÷ expected rows ≥ 99.9% and checksum matches the source. Note the pipeline can be "up" and still wrong, so correctness is part of the SLI.</p><p><b>(c) Video playback.</b> SLI 1 (start success): playback starts within 2 s ÷ play attempts. SLO 99.5%. SLI 2 (smoothness): sessions with rebuffering ratio &lt; 0.5% ÷ sessions. SLO 98%. Measured from client telemetry because the CDN may look healthy while viewers buffer.</p>`,
      complexity: `<p>No computation; quality is judged by whether each SLI reflects a user-visible failure and is measurable.</p>`,
      followUps: ['How would you measure SLIs for a service with sparse traffic at night?', 'When is a latency SLO over-tight?']
    }
  });

  practice.push({
    title: 'Fix the Post-Outage Retry Storm', level: 'Medium', tags: ['retries', 'jitter', 'backoff', 'thundering herd', 'metastable'], companies: ['AWS', 'Google', 'Slack'],
    statement: `<p>Your user-profile service (capacity 20,000 req/s) was down for 3 minutes due to a bad deploy. After rollback it came back healthy, yet it keeps falling over: 50,000 mobile clients all retry with a fixed 1-second delay, there are 3 retry layers (app, SDK, gateway), and each retries 3 times. Explain what is happening and design the fix on client, server and infrastructure sides.</p>`,
    constraints: `Cannot force-update mobile apps quickly. Server changes and gateway changes can ship today.`,
    example: `<p>Peak retry wave: ${H.c('r', '50,000 clients × 3 layers × up to 3 tries ≈ 450,000 attempts')} landing every second against 20,000/s capacity.</p>`,
    brute: { why: `<p><b>Naive fix:</b> "scale the profile service 5×". The wave is synchronised (all retry at t+1 s, t+2 s…) and amplified 27× by layered retries; adding servers cold-starts caches and connection pools, which is slow, and the next wave still exceeds capacity. The system is in a metastable failure: the retries sustain the overload even though the original cause is gone.</p>` },
    mcq: { q: 'Which pair of changes best breaks the synchronised retry wave?', options: ['Longer fixed delay and more servers', 'Exponential backoff with full jitter, and a retry budget', 'Remove all retries everywhere', 'Switch to UDP'], answer: 1, explain: 'Jitter de-synchronises clients; backoff reduces the rate over time; a budget caps total retry load. Together they flatten the wave without removing the useful retries.' },
    hints: [`<p>Hint 1: Compute the amplification: layers × attempts. Retrying at several layers multiplies.</p>`, `<p>Hint 2: Server side you can shed load now (return 503 + Retry-After with random values) to stop the herd.</p>`, `<p>Hint 3: Longer-term: retry only at one layer, token-bucket retry budget (≤ 10%), jittered backoff in the SDK, plus gateway admission control.</p>`],
    solution: {
      approach: `<p><b>Diagnosis.</b> Three problems stacked: (1) <b>synchronisation</b> — fixed 1 s retry means all clients return at the same instant; (2) <b>amplification</b> — 3 layers × 3 attempts = up to 27× load per user action; (3) <b>no shedding</b> — the service accepts everything, queues grow, latency exceeds client timeouts, and those timeouts cause more retries (positive feedback = metastable failure).</p><p><b>Immediate mitigation (today).</b> At the gateway: admission control — allow ~85% of capacity, return <code>503</code> + <code>Retry-After: random(2..30)</code> for the rest, so clients spread out. Temporarily disable gateway retries. Bring the service back gradually (ramp traffic 10% → 100% by percentage routing) so caches/pools warm up. Prefer LIFO queue and drop requests older than their deadline.</p><p><b>Permanent fixes.</b> Server: concurrency limit with a bounded queue, per-client rate limits, load-shed lowest priority first. Client/SDK (ship in the next app release; use remote config for existing ones): exponential backoff with <b>full jitter</b> (base 500 ms, cap 30 s), honour <code>Retry-After</code>, max 3 attempts, <b>retry only at the SDK layer</b> (remove retries in app code and gateway for this path), and a client-side retry budget (10% of recent requests) with a circuit breaker. Add metrics: retry rate, % of traffic that is retries, shed count, and an alert when retries &gt; 20% of requests.</p><p><b>Expected result.</b> Amplification drops from 27× to ≤ 1.1×; full jitter smears arrivals over the backoff window; server stays at ≤ capacity and recovers in seconds.</p>`,
      complexity: `<p>Load after the fix: first attempts + ≤ 10% retries ≈ 1.1× normal. Arrival rate per 100 ms bucket after jitter ≈ spread uniformly rather than one spike.</p>`,
      followUps: ['How do you test that retry behaviour in staging before the next outage?', 'What do you tell the product team about 503s during the ramp?']
    }
  });

  practice.push({
    title: 'Timeout Budget Across a 4-Hop Call Chain', level: 'Medium', tags: ['timeouts', 'deadlines', 'latency budget', 'retries'], companies: ['Google', 'Uber', 'LinkedIn'],
    statement: `<p>Mobile app → <b>Gateway</b> → <b>Order service</b> → <b>Inventory service</b> → <b>Database</b>. The user-facing SLO is a response within <b>1,000 ms</b> at the 99th percentile. Observed p99 latencies: DB 40 ms, Inventory (own work) 30 ms, Order (own work) 50 ms, Gateway overhead 20 ms. Set the timeouts and retry counts at each hop, and explain how deadlines should be propagated.</p>`,
    constraints: `Max one retry anywhere on the path. Keep ≥ 100 ms slack at the top for network and mobile jitter.`,
    example: `<p>Healthy sum of p99s ≈ ${H.c('b', '40 + 30 + 50 + 20 = 140 ms')} — plenty of room, so the timeouts exist to cap the <i>bad</i> cases, not the normal ones.</p>`,
    brute: { why: `<p><b>Naive setup:</b> every hop uses the library default 30 s timeout and retries 3 times. When the DB stalls, Inventory waits 30 s, Order waits for Inventory, Gateway waits for Order, so the mobile app (which gave up at 1 s) has been gone for 29 s while four layers still hold threads and keep retrying. A single stall consumes 3 × 3 × 3 × 3 = 81 DB attempts and exhausts all pools.</p>` },
    mcq: { q: 'Which rule must hold for timeouts along a call chain?', options: ['Inner timeouts should be larger than outer ones', 'Outer timeout ≥ inner timeout × attempts + overhead, so the caller does not give up while the callee is still working', 'All timeouts equal', 'Timeouts are unnecessary with retries'], answer: 1, explain: 'If the outer timeout is smaller than the inner work, the outer fails while the inner continues for nobody. Make timeouts shrink down the chain and propagate the remaining deadline.' },
    hints: [`<p>Hint 1: Work backwards from 1,000 ms: subtract 100 ms slack, then allocate.</p>`, `<p>Hint 2: Give each hop a timeout of ~3-5× its p99 but never more than the remaining deadline passed in the request.</p>`, `<p>Hint 3: Put the single retry at the hop closest to the failing component (e.g. Inventory → DB for idempotent reads) and nowhere else.</p>`],
    solution: {
      approach: `<p><b>Budget.</b> Total 1,000 ms − 100 ms slack = 900 ms at the Gateway. Propagate an absolute deadline (<code>deadline = now + 900 ms</code>) in a header/gRPC metadata; every hop computes its remaining time and refuses to start work if too little remains.</p><p><b>Timeouts (outer → inner).</b> Gateway→Order: <b>850 ms</b> (no retry; returns 504/fallback). Order→Inventory: <b>500 ms</b> (no retry). Inventory→DB: <b>150 ms</b> per attempt, <b>1 retry</b> for idempotent reads only, with 20 ms jittered wait → worst case ≈ 150 + 20 + 150 = 320 ms &lt; 500 ms. Connect timeouts: 50-100 ms at each hop. Inner values are ~4× p99 so normal tail cases pass, while a stall is cut quickly.</p><p>Check nesting: DB path worst 320 ms + Inventory own 30 = 350 ms &lt; 500 ms (Order→Inventory) ✓; + Order own 50 = 400 ms &lt; 850 ms ✓; + Gateway 20 = 420 ms ≪ 900 ms ✓.</p><p><b>Rules.</b> Retry at one layer only; non-idempotent writes use an idempotency key if retried; cancellation propagates (when the gateway times out, downstream stops work); add a breaker on Inventory→DB. Amplification at worst = 2× at the DB, not 81×.</p>`,
      complexity: `<p>Worst-case path time bounded by 900 ms by construction (deadline), worst-case DB attempts per user request = 2.</p>`,
      followUps: ['What if Order also needs to call Payments in parallel?', 'How would hedged requests change the DB timeout?']
    }
  });

  practice.push({
    title: 'Health Checks and Automatic Failover for a Redis Primary', level: 'Medium', tags: ['failover', 'health checks', 'split-brain', 'quorum'], companies: ['Redis', 'Twitter/X', 'Pinterest'],
    statement: `<p>A session cache uses a Redis primary with 2 replicas, one per AZ. Today failover is manual and takes 20 minutes. Design automatic failover: detection, election, client behaviour, and protection against false positives and split-brain. State the expected RTO and what data can be lost.</p>`,
    constraints: `Target RTO ≤ 30 s. Sessions may lose the last second of writes. Network partitions between AZs happen occasionally.`,
    example: `<p>Timeline: ${H.c('b', 'primary dies at t=0 → 3 monitors detect after ~5 s → majority agrees at ~6 s → best replica promoted at ~8 s → clients re-resolve by ~15 s')}.</p>`,
    brute: { why: `<p><b>Naive design:</b> one script on replica 1 pings the primary; after one failed ping it promotes itself. A single missed ping (GC pause or a blip) triggers promotion while the old primary is still alive — two primaries accepting writes (split-brain), diverging data, and the old primary's writes are discarded when it rejoins. Also, if the script's own host dies, nobody fails over.</p>` },
    mcq: { q: 'Why run an odd number (≥ 3) of failure-detector/sentinel nodes in different AZs?', options: ['To use more servers', 'So a MAJORITY can agree the primary is down, avoiding promotion from a minority partition', 'Because Redis needs it for sharding', 'To increase write throughput'], answer: 1, explain: 'A decision requires a majority quorum; a node isolated alone cannot form one, so it cannot trigger a promotion, preventing split-brain.' },
    hints: [`<p>Hint 1: Separate the <b>detector</b> (many observers) from the <b>decision</b> (needs a quorum).</p>`, `<p>Hint 2: Subjective-down after N ms without reply → objective-down when a majority agrees → elect one coordinator to pick the best replica (most replicated offset).</p>`, `<p>Hint 3: Fence the old primary (it must go read-only or be killed) and make clients discover the primary through the sentinels/endpoint rather than a hard-coded IP.</p>`],
    solution: {
      approach: `<p><b>Design (Redis Sentinel style or a managed service).</b> Run <b>3 sentinels</b> (one per AZ). Each pings the primary every 1 s; after <code>down-after-milliseconds = 5000</code> a sentinel marks it <i>subjectively down</i>. When <b>2 of 3</b> agree it is <i>objectively down</i>, one sentinel is elected leader (Raft-like), picks the replica with the highest replication offset (and lowest lag), sends <code>REPLICAOF NO ONE</code>, and reconfigures the other replica to follow. A configuration <b>epoch</b> number increases with each failover so stale information is rejected.</p><p><b>Clients</b> ask sentinels for the current primary (or use a proxy / DNS name updated on promotion) and reconnect on connection errors with short jittered retries; timeouts are 100-200 ms so they notice quickly. <b>Fencing:</b> use <code>min-replicas-to-write 1</code> with <code>min-replicas-max-lag 10</code> so a primary cut off from replicas stops accepting writes, and when the old primary returns it is demoted to replica and resyncs from the new one.</p><p><b>Numbers.</b> Detection 5 s + election ≈ 1-2 s + promotion and client refresh ≈ 5-10 s → <b>RTO ≈ 15-20 s</b>. Replication is async: writes in the last ~100-1000 ms may be lost (acceptable for sessions; for other data use <code>WAIT</code> or a different store). False positives are limited by the 5 s threshold and the quorum; add alerts for failover events and a monthly drill.</p>`,
      complexity: `<p>3 sentinels × 1 ping/s is negligible. Memory 3× the dataset (primary + 2 replicas). Failover frequency should be rare; each one burns a bit of error budget.</p>`,
      followUps: ['What if two AZs lose connectivity to each other but both can reach clients?', 'How does Redis Cluster differ from Sentinel here?']
    }
  });

  practice.push({
    title: 'Instrument Checkout Across Microservices (Logs, Metrics, Traces)', level: 'Medium', tags: ['observability', 'tracing', 'cardinality', 'sampling'], companies: ['Datadog', 'Uber', 'Shopify'],
    statement: `<p>Checkout fans out to 8 services (HTTP and Kafka). Debugging takes hours because logs from different services cannot be linked and nobody knows where time goes. Design the instrumentation plan: IDs and propagation (including through Kafka), log format, the key metrics (and cardinality limits), tracing with sampling, and retention/cost.</p>`,
    constraints: `5,000 requests/s at peak; logs budget 500 GB/day; traces must retain all errors; engineers use Java and Node.js.`,
    example: `<p>Goal: from one ${H.c('b', 'trace_id')} you can open the waterfall, jump to all logs of that request, and see which service and version handled it.</p>`,
    brute: { why: `<p><b>Naive design:</b> every service prints free-text logs to its own files; metrics include <code>user_id</code> and full URL as labels; tracing is "turn on 100%". Result: no way to join logs across services, a metrics bill that explodes from 100 million series, a tracing backend that falls over at 5,000 req/s × 8 spans, and PII in log files.</p>` },
    mcq: { q: 'Which label is SAFE to put on a Prometheus metric?', options: ['user_id', 'raw request URL with query string', 'route template like /orders/:id', 'trace_id'], answer: 2, explain: 'Labels need a small bounded set of values. Route templates are bounded; user ids, raw URLs and trace ids are unbounded and would create millions of time series.' },
    hints: [`<p>Hint 1: Adopt OpenTelemetry with W3C <code>traceparent</code>; auto-instrument HTTP and Kafka clients/consumers (context in message headers).</p>`, `<p>Hint 2: JSON logs with <code>trace_id</code>, <code>span_id</code>, service, version, level; RED metrics with bounded labels; histograms with buckets around SLO thresholds.</p>`, `<p>Hint 3: Tail-sample at a collector: keep 100% of errors and slow traces, 1-5% of the rest. Set log levels, retention tiers, and redact PII.</p>`],
    solution: {
      approach: `<p><b>IDs &amp; propagation.</b> Adopt <b>OpenTelemetry</b> SDKs/agents in Java and Node. The gateway creates the trace and sets <code>traceparent</code>; HTTP/gRPC clients forward it automatically; for Kafka the producer injects the context into <b>message headers</b> and the consumer extracts it and starts a span linked to the producer (use span links for batch consumers). Log the <code>trace_id</code> in every line using MDC (Java) / AsyncLocalStorage (Node).</p><p><b>Logs.</b> JSON structured: ts, level, service, version, env, trace_id, span_id, event, order_id (business key), error fields. No PII/secrets (redaction filters). INFO in prod, DEBUG only via short-lived dynamic flag. Pipeline: stdout → Vector/Fluent Bit → Kafka → Loki/OpenSearch; 7 days hot, 30-90 days cold; sample noisy lines. Budget 500 GB/day is only about 1 KB per request even if the 5,000 req/s peak lasted all day (a few KB at a realistic average), so keep each service to one or two short INFO lines per request.</p><p><b>Metrics.</b> For each service: RED (rate, errors, duration histogram) with labels <code>route</code> (template), <code>method</code>, <code>status_class</code>, <code>region</code>, <code>version</code>; USE for pools/queues (saturation); dependency client metrics (calls, errors, latency per downstream); breaker state. Max ~10 labels/few thousand series per service; never user/order/trace ids. Histogram buckets near SLO thresholds (100, 250, 500, 800, 1000 ms). Add <b>exemplars</b> linking latency buckets to trace ids.</p><p><b>Traces.</b> Collector with <b>tail sampling</b>: 100% errors, 100% &gt; 1 s, 2% of the rest. 5,000 req/s × ~40 spans ≈ 200k spans/s before sampling → ~10k spans/s after. Dashboards link trace ↔ logs by trace_id. <b>Validate:</b> a synthetic checkout every minute; alert on orphan-span rate; run a game day where the on-call finds an injected slow span within 10 minutes.</p>`,
      complexity: `<p>Overhead: OTel auto-instrumentation ≈ 1-3% CPU; tail sampling buffers traces for ~30 s in the collector (memory ∝ in-flight traces).</p>`,
      followUps: ['How do you trace through an async workflow that takes 2 days?', 'How would you handle a customer who asks to delete their data from logs?']
    }
  });

  practice.push({
    title: 'Design Burn-Rate Alerts and Compute When They Fire', level: 'Medium', tags: ['SLO', 'alerting', 'burn rate', 'error budget'], companies: ['Google', 'Grafana Labs', 'Atlassian'],
    statement: `<p>Search API, SLO <b>99.9%</b> over 30 days. Design a pager policy using multi-window burn-rate alerts, then answer: (a) if the error rate is suddenly <b>2%</b>, how fast is the budget gone and which alert fires first? (b) if a slow leak of <b>0.15%</b> errors starts, which alert catches it, and after how long?</p>`,
    constraints: `Pages for budget consumption at 2% in 1 h and 5% in 6 h; tickets for 10% in 3 days.`,
    example: `<p>Burn rate = error rate ÷ (1 − SLO). For 2%: ${H.c('b', '2% ÷ 0.1% = 20×')}; the whole budget would be gone in ${H.c('r', '30 ÷ 20 = 1.5 days')}.</p>`,
    brute: { why: `<p><b>Naive alerting:</b> "page if error rate &gt; 1% for 5 minutes". It pages for harmless blips (bad noise), and misses a sustained 0.5% leak that will consume the entire monthly budget in 6 days because it never crosses 1%. It also ties the page to a raw threshold instead of to how much budget is being spent.</p>` },
    mcq: { q: 'Why require BOTH a long window and a short window in a burn-rate alert?', options: ['To double the cost', 'Long = the problem is significant; short = it is still happening (alert resets quickly)', 'Prometheus requires two windows', 'Short windows are more accurate'], answer: 1, explain: 'The long window avoids paging on tiny blips; the short window ensures you only page while it is still ongoing and lets the alert clear soon after recovery.' },
    hints: [`<p>Hint 1: Thresholds: 2% of budget in 1 h ⇒ burn = 0.02 × 720 h = 14.4; 5% in 6 h ⇒ burn = 0.05 × 120 = 6; 10% in 3 d ⇒ burn = 0.10 × 10 = 1.</p>`, `<p>Hint 2: Convert each burn to an error-rate threshold: burn × 0.1%.</p>`, `<p>Hint 3: Compare the 0.15% leak (1.5×) with thresholds; only the 1× ticket rule applies.</p>`],
    solution: {
      approach: `<p><b>Policy.</b> Error-rate thresholds = burn × 0.1%: <b>Page A</b>: burn ≥ 14.4 (error rate ≥ 1.44%) over 1 h <i>and</i> 5 min. <b>Page B</b>: burn ≥ 6 (≥ 0.6%) over 6 h <i>and</i> 30 min. <b>Ticket</b>: burn ≥ 1 (≥ 0.1%) over 3 days <i>and</i> 6 h.</p><p><b>(a) 2% errors.</b> Burn = 20× → budget exhausted in 30/20 = 1.5 days (36 h). Page A (≥ 1.44%) fires once the error rate over the 5-minute window is above the line and the 1-hour average crosses 1.44%: with a sudden step to 2% the 1-hour average reaches 1.44% after 1.44/2 = 72% of an hour ≈ <b>43 minutes</b> (cumulative average rising from 0), so the page arrives at roughly 40-45 min. (Using a faster 5%-in-… rule or lowering windows detects sooner; the trade-off is more false pages.)</p><p><b>(b) 0.15% leak.</b> Burn = 1.5×: below 6× and 14.4×, so no page; it exceeds 1× so the <b>ticket</b> rule fires after the 3-day average crosses 0.1%: ~2 days (0.1/0.15 = 2/3 of 3 days). The budget would last 30/1.5 = 20 days, so a ticket is the correct severity: fix this sprint, no 3 a.m. wake-up.</p><p>This shows the design: <b>fast burn pages in minutes–hour, slow burn pages in hours, trickle becomes a ticket</b>, each tied to the share of budget consumed.</p>`,
      complexity: `<p>Evaluation cost: a few recording rules per SLO (ratios over 5 m, 30 m, 1 h, 6 h, 3 d windows), cheap to compute.</p>`,
      followUps: ['How do low-traffic services change the maths?', 'How would you stop a single noisy endpoint hiding in the aggregate?']
    }
  });

  practice.push({
    title: 'Graceful Degradation Plan for a Flash Sale', level: 'Medium', tags: ['load shedding', 'degradation', 'bulkhead', 'capacity'], companies: ['Flipkart', 'Amazon', 'Alibaba'],
    statement: `<p>A flash sale is expected to produce <b>8× normal traffic</b> within 30 seconds of launch. Capacity is 3× normal; autoscaling takes ~5 minutes. Design the degradation and shedding plan so checkout keeps working for as many customers as possible.</p>`,
    constraints: `Revenue-critical paths: login, cart, checkout, payment. Optional: recommendations, reviews, personalisation, search facets. A waiting room is allowed.`,
    example: `<p>8× demand vs 3× capacity: ${H.c('r', '5× excess')}. Without shedding, goodput collapses; with a plan, ${H.c('g', 'about 3× of well-served traffic')} succeeds while the rest wait or get a degraded page.</p>`,
    brute: { why: `<p><b>Naive plan:</b> "enable autoscaling and hope". The spike arrives in 30 s, scaling takes 5 minutes; for those minutes queues build, latencies exceed client timeouts, retries pile on, DB connections are exhausted and even logged-in customers in checkout fail. Autoscaling also has quotas and cold-start delays.</p>` },
    mcq: { q: 'During the first minutes of the spike, what protects checkout best?', options: ['Autoscaling alone', 'Priority-based load shedding plus turning off optional features and a waiting room for new visitors', 'Raising timeouts to 60 s', 'Adding retries'], answer: 1, explain: 'Scaling is too slow; you must reduce demand on critical paths immediately — shed optional work and low-priority traffic and queue newcomers.' },
    hints: [`<p>Hint 1: Pre-scale before the event (known schedule), pre-warm caches, and load-test to 3×+.</p>`, `<p>Hint 2: Build a degradation ladder controlled by flags that triggers on saturation metrics (CPU, queue depth, DB connections).</p>`, `<p>Hint 3: Reserve capacity for logged-in cart/checkout users via bulkheads; waiting room admits new users at a controlled rate.</p>`],
    solution: {
      approach: `<p><b>Before the sale.</b> Pre-scale to the maximum safe level (not 5 minutes later), warm CDN and application caches, increase DB connection pools carefully, run a load test at 4-5×, freeze deployments, staff the war room, and prepare a status page.</p><p><b>Edge.</b> CDN serves the catalogue and static assets (≥ 95% of page views never reach origin). A <b>virtual waiting room</b> admits anonymous visitors at a rate matching checkout capacity; logged-in users with items in the cart bypass it.</p><p><b>Bulkheads.</b> Separate pools for checkout/payment (reserved 50% of workers), browse (30%), optional features (≤ 10%); per-tenant/IP rate limits to stop bots.</p><p><b>Degradation ladder (flags).</b> L1 (CPU &gt; 65%): drop recommendations and review summaries, cache TTL ×5. L2 (&gt; 75%): disable personalisation, search facets and image zoom, simple search. L3 (&gt; 85%): shed anonymous traffic with <code>503 + Retry-After</code> jitter, stop analytics beacons. L4 (DB saturated): checkout only, async order confirmation via queue. Inventory uses atomic decrement/reservation with a Redis counter to avoid DB hot rows.</p><p><b>Protection.</b> Bounded queues, deadlines, breakers on every dependency, retry budgets. <b>Observe &amp; operate.</b> Dashboard with golden signals, burn rate, shed counts, waiting-room size; runbook to move levels manually; after the event, a review with real numbers.</p>`,
      complexity: `<p>Effective capacity ≈ 3× normal; waiting room + shedding limit admitted demand to that, so success rate for admitted users stays near baseline.</p>`,
      followUps: ['How do you keep the waiting room fair and bot-resistant?', 'What do you do about a hot inventory row (one product)?']
    }
  });

  practice.push({
    title: 'Multi-Region Payments: Failover Without Double Charges', level: 'Hard', tags: ['multi-region', 'failover', 'RTO/RPO', 'idempotency', 'consistency'], companies: ['Stripe', 'PayPal', 'Adyen', 'Google'],
    statement: `<p>Design the reliability architecture for a payments API that must survive a <b>full region outage</b>: RTO ≤ 2 minutes, RPO ≈ 0 for committed payments, availability 99.99%, <b>never charge twice</b>. Choose active-passive vs active-active, data replication, request routing, idempotency and the failover procedure. Explain the trade-offs honestly.</p>`,
    constraints: `Two primary regions (US-East, US-West) plus a witness in a third location. 3,000 payments/s peak. Cross-region RTT ≈ 70 ms.`,
    example: `<p>A payment arrives with <code>Idempotency-Key: k1</code> in region A, region A dies after the bank charge but before replying. The client retries in region B with the same key. ${H.c('g', 'B must find k1 and return the stored result, not charge again.')}</p>`,
    brute: { why: `<p><b>Naive design:</b> two independent regions, each with its own database, DNS failover on health check, async replication of the payments table. When A fails, B does not have the last seconds of payments (RPO &gt; 0), so a retried payment looks new → <b>double charge</b>. If the network partitions (but both regions are alive), both accept payments for the same order → conflicts. DNS TTL makes RTO 5+ minutes.</p>` },
    mcq: { q: 'What is the core requirement to prevent a double charge across a regional failover?', options: ['A short DNS TTL', 'Idempotency records that are durably replicated (synchronously/quorum) before the response and checked on every retry, plus the PSP/bank idempotency key', 'More app servers', 'Bigger databases'], answer: 1, explain: 'Safety comes from durable, replicated idempotency state and passing the key to the external processor. Speed-ups like DNS TTL address RTO, not correctness.' },
    hints: [`<p>Hint 1: Separate <b>safety</b> (no double charge, no lost commit) from <b>liveness</b> (fast failover). Safety must hold even during partitions.</p>`, `<p>Hint 2: Use a strongly consistent store with quorum writes across 3 locations (Spanner/CockroachDB/Aurora Global-style or Raft-based) for payments + idempotency keys; accept ~70+ ms write latency.</p>`, `<p>Hint 3: Single-writer-per-payment (shard ownership by customer) to avoid conflicts; global load balancer / anycast for routing; failover = ownership move, rehearsed by game days.</p>`],
    solution: {
      approach: `<p><b>Architecture.</b> Active-active at the stateless edge/API tier in both regions behind an anycast global load balancer with health-based steering (seconds, no DNS TTL). The payments ledger and the idempotency table live in a <b>strongly consistent, quorum-replicated database</b> spanning 3 failure domains (two regions + witness): a write commits only after 2 of 3 replicas persist it (RPO = 0), at the cost of ≈ 70-100 ms commit latency, acceptable for payments. Partitioned data: each customer/merchant has a <b>leaseholder region</b> (nearest) so most writes are local-region quorum plus one remote ack; if a region dies, the surviving quorum (B + witness) elects new leaseholders in seconds — no data lost, no split-brain, because a minority side cannot commit.</p><p><b>Idempotency.</b> Client sends <code>Idempotency-Key</code>. In one transaction: insert (key → status=IN_PROGRESS, request hash) with a uniqueness constraint; call the PSP/bank passing the same key as its idempotency/reference id; then mark SUCCEEDED/FAILED with the result and return it. Any retry (even to the other region) reads the record: IN_PROGRESS → poll or ask the PSP by reference; SUCCEEDED → return stored response. This also covers "crash after charge, before saving": recovery job reconciles IN_PROGRESS rows older than N seconds against the PSP.</p><p><b>Failover.</b> Health checks 3 × 2 s → LB removes region; DB quorum re-elects leaseholders (≈ 5-10 s); app retries with backoff/jitter and idempotency; total RTO ≈ 30-60 s &lt; 2 min. Protect with timeouts (PSP 3 s), breaker per PSP, bulkheads, load shedding for non-payment endpoints, and a retry budget so surviving region is not overwhelmed (size each region to carry 100% — N+1 at region level).</p><p><b>Trade-offs &amp; safety.</b> CAP: during a partition the minority side rejects writes (consistency over availability) — acceptable for money. Async paths (receipts, analytics) use the outbox pattern. Test: quarterly region-evacuation game day; chaos on network partition; reconciliation with PSP settlement files daily to prove no double or missing charges.</p>`,
      complexity: `<p>Write latency ≈ 1 cross-region RTT (≈ 70-100 ms) per commit; capacity: each region sized for 100% (≈ 2× cost); RTO ≈ 30-60 s; RPO = 0.</p>`,
      followUps: ['What if the external bank/PSP is only reachable from one region?', 'How would you do read-your-writes for the merchant dashboard?', 'What changes if the business accepts RPO of 5 seconds?']
    }
  });

  practice.push({
    title: 'Postmortem: A Cache Failure Caused a Database Meltdown', level: 'Hard', tags: ['postmortem', 'cascading failure', 'metastable', 'stampede', 'load shedding'], companies: ['Meta', 'Slack', 'Cloudflare', 'Netflix'],
    statement: `<p>Timeline: (1) 14:00 one Redis node in the product cache fails; hit rate drops from 98% to 60%. (2) DB load rises 20× on those misses; DB latency goes from 5 ms to 800 ms. (3) App timeouts (500 ms) fire; clients retry 3× with no backoff. (4) The DB is overloaded to 100% and stays so even after Redis is replaced at 14:12 — the incident lasts 55 minutes. Write the analysis: why it persisted, what the design should have been, and the action items.</p>`,
    constraints: `Be specific: which mechanisms (from this module) would have limited the blast radius, and in what order should you fix them?`,
    example: `<p>Retry amplification: ${H.c('r', '3 retries × 3 layers')} turns a 20× miss increase into roughly ${H.c('r', '100×+ DB load')}. The DB can no longer serve even cache refills, so the cache cannot warm: the failure is <b>self-sustaining</b>.</p>`,
    brute: { why: `<p><b>Naive postmortem:</b> "Root cause: a Redis node failed. Fix: replace it. Action: add monitoring on Redis." This misses why a single cache node escalated to a 55-minute outage: no stampede protection, no timeouts that match the DB, aggressive retries without backoff, no shedding, no breaker, no cache-miss budget. Replacing Redis does not fix the next trigger (deploy, cold start, a big key expiring).</p>` },
    mcq: { q: 'The DB remained overloaded after Redis was replaced. What is this called, and what breaks the loop?', options: ['A network partition; reboot the DB', 'A metastable failure sustained by retries and cold-cache misses; break it by shedding load / throttling and warming the cache gradually', 'Disk failure; add disks', 'Clock skew; run NTP'], answer: 1, explain: 'Retries and cache refill traffic keep the DB saturated after the trigger is gone. Reduce incoming load (shed, disable retries), let the DB recover, warm the cache progressively.' },
    hints: [`<p>Hint 1: Trigger vs root cause vs sustaining effect: the trigger (Redis node) is small; the sustaining effect (retries + stampede) is what prolonged it.</p>`, `<p>Hint 2: Map defences: single-flight/request coalescing, jittered TTLs, stale-while-revalidate, circuit breaker with DB-protecting fallback, bulkhead on DB pool, adaptive load shedding.</p>`, `<p>Hint 3: Operational: runbook step "shed 50% and disable retries first", dashboard for cache hit ratio and DB saturation, and a game day to rehearse cache loss.</p>`],
    solution: {
      approach: `<p><b>Summary.</b> A small trigger (one cache node) overloaded the database, and a positive feedback loop kept it overloaded: misses → slow DB → timeouts → retries → even more DB load; and the cache could not refill because refills were queued behind the same overloaded DB (the stampede).</p><p><b>Contributing factors.</b> (1) Cache hit rate of 98% hid a 50× dependency on the cache — the DB was sized only for the 2% misses. (2) No single-flight: thousands of concurrent requests loaded the same key. (3) Timeout (500 ms) shorter than DB latency under load, so work was abandoned but still executed (wasted work). (4) Retries ×3 at several layers, no backoff/jitter, no budget. (5) No circuit breaker or load shedding to protect the DB. (6) No runbook for "cache gone".</p><p><b>What went well/badly.</b> Alerts fired within 2 minutes (good) but pointed at app errors, not at cache hit ratio and DB saturation, so diagnosis took 20 minutes.</p><p><b>Action items (ordered).</b> P0 (this week): per-key <b>single-flight</b> and <b>jittered TTLs</b> with <b>stale-while-revalidate</b>; <b>retry budget + exponential backoff + full jitter</b>, retries at one layer; DB <b>connection bulkhead</b> and <b>admission control</b> (reject when queue &gt; N, drop requests past their deadline); <b>circuit breaker</b> from app to DB serving stale/fallback data. P1: cache cluster with replicas and consistent hashing so a node loss only drops ~1/N of keys; <b>cache warming</b> and gradual traffic ramp on restart; capacity test for "cache hit rate 60%". P2: dashboards (hit ratio, DB saturation, retry rate), runbook ("shed 50% → disable retries → warm cache"), and a quarterly game day "lose a cache node". <b>Verification:</b> repeat the failure in staging and production at small scale and check DB load stays &lt; 2× normal.</p>`,
      complexity: `<p>Expected DB load during a node loss after fixes: ≈ misses for 1/N keys with single-flight ≈ ≤ 2× normal instead of 20-100×.</p>`,
      followUps: ['How do you size the DB when the cache can fail?', 'Which fix has the best risk reduction per engineering week?']
    }
  });

  practice.push({
    title: 'Take a 99.9% System to 99.99%: Hunt the Single Points of Failure', level: 'Hard', tags: ['SPOF', 'availability', 'redundancy', 'deployment safety', 'error budget'], companies: ['Amazon', 'Microsoft', 'Google'],
    statement: `<p>Your company's order platform currently achieves ~99.9% (43 min/month). The CEO wants 99.99% (4.3 min/month). Postmortems from the last year show causes: 35% bad deploys, 20% database failovers, 15% a single dependency (identity service) outage, 15% capacity/overload, 10% expired certificates and config mistakes, 5% hardware/AZ. Build the reliability roadmap, explain what is realistic, and how you will measure progress with error budgets.</p>`,
    constraints: `You cannot rewrite the platform. Budget for ~6 engineers for two quarters. Humans cannot be in the loop for failure handling at 4 minutes a month.`,
    example: `<p>Target downtime ${H.c('b', '4.3 min/month')} = one 4-minute incident. A 30-minute manual failover alone would use ${H.c('r', '7× the monthly budget')}.</p>`,
    brute: { why: `<p><b>Naive plan:</b> "buy bigger servers and add a second region". It ignores that 35% of downtime is self-inflicted (deploys) and 10% is process mistakes, which a second region would simply replicate; ignores identity as a hard dependency; and doubles cost without improving the causes. Redundancy only helps independent hardware/zone failures (5% of the problem here).</p>` },
    mcq: { q: 'Which investment attacks the LARGEST cause (bad deploys) of downtime?', options: ['A second region', 'Progressive delivery: canary + automatic rollback driven by SLO signals', 'More RAM', 'More on-call staff'], answer: 1, explain: 'Bad deploys are 35% of the problem. Canary releases with automatic rollback limit the blast radius of changes, which redundancy cannot do.' },
    hints: [`<p>Hint 1: Rank causes by share of downtime; match each with the cheapest effective control.</p>`, `<p>Hint 2: Make recovery automatic and fast: failure detection in seconds, automatic rollback, automatic failover (RTO &lt; 1 min), because mean time to recover matters more than rare failures.</p>`, `<p>Hint 3: Remove hard dependencies with caching/fallbacks; add certificate and config management; use the error budget policy to enforce the pace of change.</p>`],
    solution: {
      approach: `<p><b>Principle.</b> At 99.99% the budget is ~4 minutes, so only <b>automated</b> detection and recovery counts: expected downtime = (incidents per month) × (time to recover). Reduce both. Attack causes by share:</p><ol><li><b>Bad deploys (35%).</b> Progressive delivery: deploy to 1 cell/1% canary, compare SLIs automatically, auto-rollback in &lt; 2 min; feature flags with kill switches; stagger by zone; deploy freeze when budget is low. Expected: cut 80% of this category's impact.</li><li><b>Database failovers (20%).</b> Managed HA with synchronous standby, tested automatic failover (&lt; 30 s), connection retry with backoff in clients, and quarterly failover drills. Cut manual steps to zero.</li><li><b>Identity dependency (15%).</b> Make it soft: cache validated tokens/JWKS locally (valid for N minutes), local signature verification, breaker + stale fallback, bulkhead; ask the identity team for their SLO and multi-AZ posture.</li><li><b>Capacity/overload (15%).</b> Load shedding + priority, bounded queues, autoscaling with headroom (N+1 per zone), load tests at 2× peak, rate limits per tenant.</li><li><b>Certificates/config (10%).</b> Automated cert renewal and expiry alerts &gt; 14 days, config changes treated like code (review, canary, validation), no manual production edits.</li><li><b>Hardware/AZ (5%).</b> 3-AZ deployment, zone-loss game day, multi-region only if the remaining budget still requires it (second region is expensive and mostly addresses this 5%).</li></ol><p><b>Measure.</b> Define SLOs per user journey; page on burn rate; track MTTD and MTTR as first-class numbers (goal: detect &lt; 1 min, recover &lt; 2 min automatically); monthly error-budget review with a freeze policy; chaos experiments for each fix. <b>Be honest:</b> 99.99% for the whole platform is a stretch; propose 99.95% in two quarters, 99.99% for critical journeys (checkout) first, with cost estimates, rather than promising it for everything.</p>`,
      complexity: `<p>Expected improvement: if incidents drop 50% and recovery time falls from 20 min to 3 min, downtime falls ~90% (43 → ~4-5 min/month), consistent with the target.</p>`,
      followUps: ['Which single measure gives the best return in the first month?', 'How do you argue for this budget with finance?']
    }
  });

  practice.push({
    title: 'Reliability & Observability Platform for 200 Microservices', level: 'Hard', tags: ['platform', 'SLO-as-code', 'observability cost', 'standards', 'multi-team'], companies: ['Uber', 'Netflix', 'Spotify', 'Shopify'],
    statement: `<p>200 services, 60 teams, 5 languages. Reliability is inconsistent: some teams have no timeouts, dashboards look different everywhere, alerts are noisy, and the observability bill is out of control. Design a <b>platform approach</b>: shared libraries/sidecars/mesh for timeouts, retries, breakers and bulkheads; telemetry standards; SLO-as-code with error budget policy; cost controls; and the rollout/adoption plan.</p>`,
    constraints: `Cannot mandate a rewrite. Platform team of 8. Telemetry cost must fall 40% while coverage rises. Teams own their SLOs.`,
    example: `<p>Paved road: a new service created from a template ${H.c('g', 'gets RED metrics, traces, JSON logs, default timeouts/retries/breaker, an SLO file and burn-rate alerts automatically')}.</p>`,
    brute: { why: `<p><b>Naive plan:</b> write a wiki page "best practices" and ask 60 teams to follow it. Compliance is low, five languages implement different semantics, the telemetry stays inconsistent, nobody owns the cost, and the first incident reveals services with infinite timeouts and 3-layer retries. Guidance without defaults, automation and measurement does not change behaviour.</p>` },
    mcq: { q: 'Best way to get consistent timeouts, retries and breakers across 5 languages quickly?', options: ['A wiki page', 'Mesh/sidecar-enforced defaults (Envoy) plus thin language libraries and a service template, with policy-as-code and scorecards', 'Mandatory rewrite in one language', 'Ask each team to choose'], answer: 1, explain: 'A mesh gives uniform baseline protections across languages; libraries add graceful fallbacks; templates and scorecards drive adoption without a rewrite.' },
    hints: [`<p>Hint 1: Make the safe path the default path (golden templates, mesh defaults), not an optional one.</p>`, `<p>Hint 2: OpenTelemetry everywhere with enforced attribute/label conventions, a central collector tier for sampling, redaction, and cardinality limits.</p>`, `<p>Hint 3: SLO files in each repo (Sloth/OpenSLO) generate dashboards and burn alerts; scorecards track adoption; budget policy automated in CI/CD gates.</p>`],
    solution: {
      approach: `<p><b>1. Paved road.</b> A service template (per language) pre-wires: OTel SDK, JSON logging with trace_id, RED metrics with a label allowlist, health endpoints (liveness/readiness), graceful shutdown, standard HTTP/gRPC client with <b>default connect/read timeouts, deadline propagation, retry (1 retry, backoff+full jitter, idempotent only, budget 10%), circuit breaker and bulkhead</b> configured via a shared config file.</p><p><b>2. Mesh baseline.</b> Envoy/Istio/Linkerd sidecars enforce safety nets regardless of language: max connections/pending requests (bulkhead), outlier detection (breaker), global retry budgets, default timeouts, mTLS, and uniform golden-signal metrics even for legacy services.</p><p><b>3. Telemetry pipeline.</b> OTel collectors (agent + gateway tier): attribute redaction, tail sampling (all errors/slow + low-rate baseline), metric label allowlist and cardinality caps with automatic drop + alert, log level policy and dedupe, tiered retention (7 d hot / 30-90 d cold). Cost attribution per team (showback) with budgets — expect a 40-60% reduction from dropping unused metrics, sampling traces, and trimming logs.</p><p><b>4. SLO-as-code.</b> Each service repo has an <code>slo.yaml</code> (SLI definition, target, window, owner, runbook); a generator produces recording rules, multi-window burn-rate alerts, and a standard dashboard (golden signals, dependencies, deploy markers). Alert routing by ownership catalog. An error-budget policy is encoded: low budget → CI gate warns/blocks risky deploys without approval.</p><p><b>5. Adoption.</b> Scorecards ("has timeouts? SLO? tracing? runbook?") visible to leadership; start with top-20 critical-path services; office hours; migration tooling (codemods); measure outcomes: percent of services with SLO, MTTD/MTTR, pages per on-call shift, alert precision, incident count caused by missing timeouts, telemetry cost per request. Review quarterly; resist adding features before adoption of the basics. Run a game day against the platform itself (collector outage must not take apps down).</p>`,
      complexity: `<p>Platform overhead: sidecar ≈ 0.2-0.5 vCPU + 50-100 MB per pod and ≈ 1-2 ms per hop; telemetry gateway sized for tail sampling buffers. Team effort mostly in templates, generators and scorecards.</p>`,
      followUps: ['How do you handle teams that opt out?', 'How do you keep SLO targets honest rather than gamed?']
    }
  });

  /* =====================================================================
     QUIZ
     ===================================================================== */
  quiz.push({ q: 'Two independent servers each have 99.9% availability and either one can serve traffic. What is the combined availability?', options: ['99.9%', '99.99%', '99.9999%', '99.8%'], answer: 2, explain: 'Down only if both are down: 0.001 × 0.001 = 0.000001, so availability = 99.9999%. (Real systems get less because failures are rarely fully independent.)' });
  quiz.push({ q: 'What is the main purpose of <b>jitter</b> in retry backoff?', options: ['To make retries faster', 'To spread retries from many clients apart so they do not all hit the server together', 'To increase the number of retries', 'To avoid using timeouts'], answer: 1, explain: 'Without jitter, clients that failed at the same moment retry at the same moment (thundering herd). Randomness desynchronises them.' });
  quiz.push({ q: 'A call to <code>POST /charge</code> times out. Which statement is correct?', options: ['The charge definitely failed, retry freely', 'The charge may have succeeded; retry only with the same idempotency key', 'Never retry anything', 'Retry with a new random key each time'], answer: 1, explain: 'A timeout is ambiguous. The same idempotency key lets the server return the original result instead of charging twice.' });
  quiz.push({ q: 'Which sequence of circuit breaker states is correct after the failure threshold is reached and the dependency later recovers?', options: ['CLOSED → HALF_OPEN → OPEN → CLOSED', 'CLOSED → OPEN → HALF_OPEN → CLOSED', 'OPEN → CLOSED → HALF_OPEN', 'HALF_OPEN → CLOSED → OPEN'], answer: 1, explain: 'Failures trip CLOSED → OPEN; after the cool-down it moves to HALF_OPEN to test with a few probes; successful probes close it.' });
  quiz.push({ q: 'Where do calls go while a breaker is in the OPEN state?', options: ['To the dependency, but with a longer timeout', 'They are rejected immediately (fallback or error) without calling the dependency', 'They are queued until it closes', 'They are retried 3 times'], answer: 1, explain: 'OPEN means fail fast: no network call, instant fallback. This protects your threads and gives the dependency room to recover.' });
  quiz.push({ q: 'What problem does a <b>bulkhead</b> solve?', options: ['Slow DNS', 'One slow dependency or tenant consuming all shared threads/connections and taking down unrelated features', 'Encrypting traffic', 'Duplicate messages'], answer: 1, explain: 'A bulkhead gives each dependency or tenant its own bounded slice of resources so a failure stays contained.' });
  quiz.push({ q: 'A service gets 200 calls/s to a dependency that normally takes 150 ms. By Little\'s Law, about how many concurrent calls are in flight?', options: ['3', '30', '300', '1,333'], answer: 1, explain: 'L = λ × W = 200 × 0.15 = 30 concurrent calls (add headroom when sizing a pool).' });
  quiz.push({ q: 'SLO = 99.95% over 30 days. How much full-outage time does the error budget allow?', options: ['4.3 minutes', '21.6 minutes', '43.2 minutes', '3.6 hours'], answer: 1, explain: '0.0005 × 43,200 minutes = 21.6 minutes.' });
  quiz.push({ q: 'The current error rate is 1.44% and the SLO is 99.9%. What is the burn rate?', options: ['1.44×', '14.4×', '144×', '0.144×'], answer: 1, explain: 'Burn rate = error rate ÷ (1 − SLO) = 1.44% ÷ 0.1% = 14.4×, the classic fast-burn page threshold.' });
  quiz.push({ q: 'Which is the difference between an SLO and an SLA?', options: ['They are the same', 'SLO is an internal target; SLA is a contract with consequences, usually looser than the SLO', 'SLA is stricter than SLO', 'SLO has financial penalties'], answer: 1, explain: 'Teams aim at an SLO (a fence) that is tighter than the SLA (the cliff with penalties).' });
  quiz.push({ q: 'You want to find WHICH service in a 10-hop request is slow. Which signal is best?', options: ['A CPU gauge', 'Distributed traces (span waterfall)', 'A cumulative request counter', 'Only access logs of the gateway'], answer: 1, explain: 'Traces show the timing of each hop for one request, pointing straight at the slow span. Metrics say that something is slow; logs say why.' });
  quiz.push({ q: 'Which metric label is a cardinality bomb?', options: ['route template /orders/:id', 'HTTP status class (2xx, 5xx)', 'user_id', 'region'], answer: 2, explain: 'user_id has millions of values and creates millions of time series. Keep labels small and bounded; put per-user detail in logs or traces.' });
  quiz.push({ q: 'What is a hypothesis in a chaos experiment?', options: ['A guess about what the tool does', 'A prediction that a steady-state metric will stay within limits when a specific fault is injected', 'A list of servers to turn off', 'A post-incident summary'], answer: 1, explain: 'Chaos engineering uses the scientific method: define steady state, predict it will hold under a fault, inject with a small blast radius, then compare.' });
  quiz.push({ q: 'Four layers each retry 3 times when the bottom dependency fails. How many attempts can the dependency receive for one user request?', options: ['12', '27', '81', '3'], answer: 2, explain: '3 × 3 × 3 × 3 = 81 (retry amplification). Retry at one layer only and use a retry budget.' });
  quiz.push({ q: 'Why do two nodes alone make split-brain hard to avoid?', options: ['They cannot tell "peer died" from "network between us broke", so both may promote', 'Two nodes are always slower', 'They cannot replicate data', 'Load balancers refuse two nodes'], answer: 0, explain: 'You need a third voter (witness/quorum) so that only the side with a majority may act as leader.' });

  /* =====================================================================
     INTERVIEW Q&A
     ===================================================================== */
  interview.push({ q: 'How would you make a service highly available? Walk me through your thinking.', level: 'B', a: `<p>I start by <b>hunting single points of failure</b> along the request path: load balancer, app servers, cache, database, network, DNS, dependencies, even deployment. For each I add redundancy across <b>failure domains</b> (hosts, racks, AZs, maybe regions). Stateless tiers go active-active behind a health-checked load balancer, sized so losing a zone still leaves enough capacity (N+1). Stateful tiers use a leader with synchronous or quorum replicas and automatic failover with fencing to avoid split-brain.</p><p>Then I make failure <b>fast and automatic</b>: health checks, timeouts, retries with backoff and jitter, circuit breakers, bulkheads and load shedding. I define SLOs so "highly available" has a number, and I <b>test</b> it with failover drills and chaos experiments. Finally, I note that most downtime comes from my own changes, so I add canaries and automatic rollback.</p>`, followUps: ['What is your RTO and RPO and how did you choose them?', 'What would you do about correlated failures such as a bad config pushed everywhere?'] });
  interview.push({ q: 'Explain active-passive vs active-active. When would you choose each?', level: 'B', a: `<p><b>Active-passive:</b> one node (or region) serves; a standby is kept in sync and promoted on failure. Simple and avoids write conflicts, so it is the default for relational databases. Cost: idle capacity, failover time (seconds to minutes) and possible data loss with async replication. <b>Active-active:</b> all nodes serve at once behind a load balancer. Failure just removes capacity; there is no promotion. It fits stateless services and systems designed for multi-writer (Dynamo-style, CRDTs, or partitioned leaders).</p><p>Choose active-active for stateless tiers and read-heavy or partitionable data where you can afford capacity N+1 per failure domain; choose active-passive when you need a single writer and strong consistency and can accept a short failover.</p>`, followUps: ['How do you handle write conflicts in active-active?', 'What is the cost of keeping a warm standby?'] });
  interview.push({ q: 'What is exponential backoff with jitter and why do we need both?', level: 'B', a: `<p>Backoff means waiting longer between retries: delay = min(cap, base × 2<sup>attempt</sup>). It gives a struggling dependency time to recover and reduces load over time. But backoff alone keeps clients synchronised: all clients that failed together retry together at 100 ms, 300 ms, 700 ms … creating waves (thundering herd). <b>Jitter</b> adds randomness: full jitter chooses a random wait in [0, ceiling], equal jitter takes half fixed and half random, decorrelated jitter bases it on the previous wait. Together they spread retry load smoothly.</p><p>I also bound attempts and total time with a deadline, retry only transient and idempotent operations, honour Retry-After, and add a retry budget so the fleet cannot add more than ~10% extra load.</p>`, followUps: ['Which jitter variant would you pick and why?', 'How do retries interact with timeouts and circuit breakers?'] });
  interview.push({ q: 'How do you choose timeout values?', level: 'I', a: `<p>I base them on measured latency, not guesses. For a read timeout I take the dependency's p99 (or p99.9 for critical calls) times about 1.5-3, so normal tail latency passes but a hang is cut quickly. I set separate <b>connect</b> (short, 100 ms-1 s) and <b>read</b> timeouts, plus an overall <b>deadline</b> for the user request that is propagated downstream so each hop knows the time left. Timeouts shrink down the call chain: the outer timeout must exceed the inner timeout × attempts, otherwise the caller gives up while work continues.</p><p>I also cancel work when the caller has gone, and revisit timeouts when latency changes. Infinite or very long defaults are a classic cause of cascading failure.</p>`, followUps: ['What happens if you set the timeout below the p99?', 'How do you propagate deadlines in gRPC or HTTP?'] });
  interview.push({ q: 'Explain the circuit breaker pattern, its states, and how you would configure one.', level: 'I', a: `<p>A circuit breaker wraps calls to a dependency with a state machine. <b>CLOSED:</b> calls pass, failures are counted. When failures exceed a threshold (consecutive count, or failure/slow-call rate over a sliding window with a minimum number of calls) it moves to <b>OPEN</b>: calls are rejected immediately and a fallback is returned, so threads are not wasted and the dependency gets quiet time. After a cool-down (say 20-30 s with jitter) it goes <b>HALF_OPEN</b>: a few probe calls are allowed; if they succeed it closes, if one fails it re-opens.</p><p>Configuration: one breaker per dependency (or endpoint), count timeouts, 5xx and slow calls but not 4xx, minimum-call volume, open duration, probe count, and an explicit fallback chosen with product (cache, default, degrade). Emit metrics and alert on state changes.</p>`, followUps: ['How do you stop all instances probing at the same instant?', 'Should the breaker state be shared across instances?'] });
  interview.push({ q: 'What is the difference between a circuit breaker, a bulkhead, a rate limiter and load shedding?', level: 'I', a: `<p><b>Circuit breaker:</b> stops calling a dependency that is failing (protects the caller and the dependency). <b>Bulkhead:</b> caps the share of <i>my</i> resources one dependency/tenant may use, so one failure cannot starve others. <b>Rate limiter:</b> limits how fast callers may send requests to me (fairness and abuse protection, per client). <b>Load shedding:</b> when total demand exceeds capacity, I deliberately reject excess work early (prioritising critical traffic) so accepted requests complete.</p><p>They are complementary layers: timeouts bound a call, retries hide blips, breakers stop hopeless calls, bulkheads limit blast radius, rate limits protect against callers, shedding protects against overall overload.</p>`, followUps: ['Give an example where a breaker alone is not enough.', 'How do these compose in a single client library?'] });
  interview.push({ q: 'Define SLI, SLO, SLA and error budget. How do you use an error budget in practice?', level: 'I', a: `<p>An <b>SLI</b> is a measured indicator of user experience, ideally good events ÷ valid events (e.g. non-5xx requests ÷ requests). An <b>SLO</b> is the target for that SLI over a window (99.9% over 30 days). An <b>SLA</b> is the contractual promise with penalties, looser than the SLO. The <b>error budget</b> is 1 − SLO, e.g. 43.2 minutes of full outage or 0.1% of requests.</p><p>In practice, the budget is the referee between velocity and reliability: if plenty is left we ship and experiment; if it is nearly exhausted we slow down or freeze feature launches until reliability improves — agreed in advance in a written policy. I alert on <b>burn rate</b> (multi-window) rather than raw error counts, and review budget consumption in postmortems and planning.</p>`, followUps: ['How would you pick the SLO number for a new service?', 'What if the SLO is always met by a large margin?'] });
  interview.push({ q: 'Metrics, logs and traces: what is each good for, and how do they work together?', level: 'I', a: `<p><b>Metrics</b> are cheap aggregated numbers over time; they power dashboards, SLOs and alerts and tell me <i>that</i> something is wrong and how big it is. <b>Traces</b> follow one request across services as a tree of spans; they show <i>where</i> time or errors occur. <b>Logs</b> are detailed event records; they tell me <i>why</i>. A good workflow: an SLO burn alert → dashboard narrows to a service/region/version → an exemplar trace shows the slow span → logs filtered by the trace ID give the error message.</p><p>To make this work I need consistent IDs (trace_id in every log), bounded metric cardinality, context propagation through queues, and sampling that keeps all errors and slow traces.</p>`, followUps: ['What is context propagation and where does it commonly break?', 'How would you control observability cost?'] });
  interview.push({ q: 'What are RED and USE, and the four golden signals?', level: 'B', a: `<p><b>RED</b> for request-driven services: <b>R</b>ate (requests/s), <b>E</b>rrors (failed requests/s or %), <b>D</b>uration (latency distribution). <b>USE</b> for resources (CPU, disk, connection pools, queues): <b>U</b>tilisation, <b>S</b>aturation (queued/waiting work), <b>E</b>rrors. Google's <b>four golden signals</b> are latency, traffic, errors and saturation — effectively RED plus saturation.</p><p>I use RED to see user-facing health per service and USE to find which resource is the bottleneck. Together they give a standard dashboard layout for every service, and the RED numbers feed the SLIs.</p>`, followUps: ['Why percentiles instead of averages for latency?', 'How do you measure saturation of a thread pool?'] });
  interview.push({ q: 'Design the alerting strategy for a critical API so on-call is not overwhelmed.', level: 'A', a: `<p>Page only on <b>symptoms users feel</b> and that need a human <i>now</i>. For each SLO use multi-window burn-rate alerts: fast burn (14.4× over 1 h and 5 min) and slow burn (6× over 6 h and 30 min) page; a 1× burn over 3 days creates a ticket. Cause-based signals (CPU, disk, single pod restart, breaker open for a short time) go to dashboards or tickets. Every alert has a runbook, dashboard link, owner, and pre-filtered trace and log queries; related alerts are grouped to avoid storms.</p><p>I add a dead-man's switch for the monitoring system, track alert precision and pages per shift, and review weekly: if an alert did not need action, delete or downgrade it. After incidents I add the missing signal that would have shortened detection or diagnosis.</p>`, followUps: ['How do you alert on low-traffic services?', 'How do you deal with seasonal traffic patterns?'] });
  interview.push({ q: 'What is chaos engineering and how do you run it safely in production?', level: 'A', a: `<p>Chaos engineering is experimenting on a system to build confidence it can withstand turbulent conditions. The method: define a steady state with business-level metrics, form a hypothesis, inject a real-world fault (kill instances, add latency, drop a zone, fail a dependency) with a limited <b>blast radius</b>, observe, then fix or expand. Safety: start in staging, then a small production slice (a cell or 1-10% of traffic), have automatic <b>abort conditions</b> tied to SLO burn, run it during working hours with the owning team present, avoid peak events, verify backups first, and keep an exclusion list.</p><p>The result is usually a fix (missing timeout, untested fallback, wrong capacity) and a regression experiment kept in CI or a game-day schedule.</p>`, followUps: ['Give an example of an experiment that failed and what you fixed.', 'How do you get leadership buy-in?'] });
  interview.push({ q: 'A cache node failed and then your database stayed overloaded for an hour. Why, and how do you prevent it?', level: 'A', a: `<p>This is a <b>cascading / metastable failure</b>. Cache misses spike, the database slows, request timeouts trigger retries, retries add load, and cache refills also queue behind the overloaded database, so the cache cannot recover. The trigger is gone but the loop sustains the overload.</p><p>Prevention: size the DB and test for a degraded hit rate; <b>single-flight / request coalescing</b> per key; jittered TTLs and stale-while-revalidate; <b>retry budgets with backoff + jitter</b> at one layer; timeouts matched to DB latency; a <b>circuit breaker and bulkhead</b> on the DB pool; <b>load shedding</b> / admission control; consistent hashing and replicas so one node loss affects only a fraction of keys; cache warming with gradual traffic ramp. Recovery runbook: shed load and disable retries first, let the DB recover, then warm the cache.</p>`, followUps: ['How would you detect the loop early?', 'How do you size the database when the cache can fail?'] });
  interview.push({ q: 'How do you design failover for a database without risking split-brain or data loss?', level: 'A', a: `<p>I use a primary with at least one <b>synchronous or semi-synchronous replica</b> in another AZ so committed writes exist on two machines (RPO ≈ 0), and a failure-detection/election layer with <b>quorum</b> (three or more voters across AZs, e.g. etcd/Patroni/Raft-based or the managed service). A node may be leader only while it holds a majority lease. On promotion, the old primary is <b>fenced</b> (STONITH, lease expiry, fencing tokens in storage), epoch numbers prevent stale leaders, and when the old node returns it rejoins as a replica after resync — never blindly fail back.</p><p>Clients discover the primary via a stable endpoint, use short timeouts and jittered retries with idempotency keys. I measure real RTO/RPO in game days and prefer quorum-replicated systems (Raft/Paxos-based) when automatic failover without data loss is a hard requirement.</p>`, followUps: ['What are the cost and latency of synchronous replication across regions?', 'How do you test a failover safely?'] });
  interview.push({ q: 'Your 99.99% service depends on three services at 99.9% each. Is that achievable?', level: 'E', a: `<p>If all three are <b>hard synchronous dependencies in series</b>, the best-case availability is 0.999³ ≈ 99.7% before counting my own failures, so 99.99% is mathematically out of reach as designed. To get there I must change the dependency structure: make non-critical dependencies <b>optional</b> with fallbacks (cache, default, degrade), serve stale data behind circuit breakers, call some asynchronously via queues, add redundancy (multi-AZ/multi-provider) for critical ones, and negotiate better SLOs from the owning teams.</p><p>Also separate by journey: the critical path (checkout) may reach 99.99% by reducing hard dependencies, while less important features have lower SLOs. And I would verify with fault injection that fallbacks really work, because untested fallbacks fail exactly when needed.</p>`, followUps: ['How would you quantify the benefit of a fallback?', 'When is it cheaper to improve the dependency than to work around it?'] });
  interview.push({ q: 'How would you roll out reliability practices (timeouts, breakers, SLOs, tracing) across 60 teams?', level: 'E', a: `<p>Make the safe path the easy path. Provide a <b>paved road</b>: service templates and shared client libraries with sane defaults (timeouts, one retry with jitter and budget, breaker, bulkhead, deadline propagation), a service mesh for language-independent baseline protection, and OpenTelemetry auto-instrumentation with enforced conventions and cardinality limits. Add <b>SLO-as-code</b> files that generate dashboards and burn-rate alerts, an ownership catalogue for routing, and <b>scorecards</b> that make adoption visible. Start with the critical user journeys and the top services by traffic and incident history.</p><p>Measure outcomes (MTTD/MTTR, pages per shift, incidents from missing timeouts, SLO coverage, telemetry cost per request), run game days to prove the controls work, and use error-budget policy to give leadership a lever. Avoid mandates without tooling; adoption follows defaults and incentives.</p>`, followUps: ['How do you handle legacy services you cannot change?', 'How do you prevent SLOs becoming a checkbox exercise?'] });

  registerModule({
    id: 'hld12',
    title: 'Reliability & Observability',
    intro: `<p>Everything breaks eventually: disks die, networks hiccup, deploys go wrong, dependencies slow down. A <b>reliable</b> system is not one that never fails; it is one that <b>keeps working, or degrades gracefully, while parts of it fail</b> — and one that tells you quickly <b>what is wrong and where</b>. In this module you will learn the whole toolbox in plain language: <b>redundancy and failover</b>, <b>timeouts</b>, <b>retries with exponential backoff and jitter</b>, <b>circuit breakers</b>, <b>bulkheads and load shedding</b>, <b>SLIs, SLOs and error budgets</b>, the three pillars of <b>observability</b> (logs, metrics, traces), and <b>chaos engineering</b> to prove it all works.</p><p>Every topic has an animated visualizer (failover with health tags, retry delays, the breaker state machine, thread-pool bulkheads, error-budget burn, a trace waterfall, a chaos experiment), worked examples, interview clues and hands-on problems: compute an error budget, design the retry policy for a payment call, add a circuit breaker to a flaky dependency, and design an on-call dashboard. It builds directly on the caching, messaging and distributed-systems modules and is a favourite deep-dive area in senior system design interviews.</p>`,
    goals: [
      'Eliminate single points of failure with redundancy across failure domains, and explain active-passive vs active-active failover, RTO and RPO',
      'Design a timeout and retry policy (backoff, jitter, budgets, idempotency keys, deadlines) that fixes blips without causing retry storms',
      'Use circuit breakers, bulkheads, load shedding and graceful degradation to stop cascading failures, and size them with Little\'s Law',
      'Define SLIs, SLOs and error budgets, compute them by hand, and design burn-rate alerts and an error-budget policy',
      'Choose between logs, metrics and traces, instrument a microservice system, and design an on-call dashboard',
      'Plan chaos experiments and game days with clear hypotheses, blast radius and abort conditions'
    ],
    prereqs: `HLD 1-3 (client-server, scalability, estimation), HLD 6 (Caching, for stampedes), HLD 8 (Messaging), HLD 10 (Distributed Systems Theory) and HLD 11 (Consensus and leader election) are very helpful. Basic probability (multiplying small numbers) is enough for the maths.`,
    hours: 12,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
