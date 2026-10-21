(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ---------------- tiny helpers shared by all visualizers ---------------- */
  // an architecture box (service, broker, topic, database)
  function B(id, label, x, y, w) { var n = { id: id, label: label, x: x, y: y, shape: 'box' }; if (w) n.w = w; return n; }
  function G(label, nodes, edges, o) {
    o = o || {};
    return { type: 'graph', label: label, directed: true, height: o.h || 60, nodes: nodes.map(function (n) { var c = {}; for (var k in n) c[k] = n[k]; return c; }), edges: edges.map(function (e) { return e.slice(); }), hl: o.hl || {}, ehl: o.ehl || {}, tags: o.tags || {} };
  }
  function F(narr, parts) { return { narr: narr, parts: parts }; }
  function TXT(html, label) { var p = { type: 'text', html: html }; if (label) p.label = label; return p; }
  function TABLE(label, columns, rows, hl) { return { type: 'table', label: label, columns: columns.slice(), rows: rows.map(function (r) { return r.slice(); }), hl: hl || {} }; }
  function QUEUE(label, items, hl, front, back) { var q = { type: 'queue', label: label, items: items.slice(), hl: hl || {} }; if (front) q.frontLabel = front; if (back) q.backLabel = back; return q; }
  function VARS(label, vals, hl) { var v = {}; for (var k in vals) v[k] = vals[k]; return { type: 'vars', label: label, vals: v, hl: hl || {} }; }
  function GRID(label, rows, rowHead, colHead, hl) { return { type: 'grid', label: label, rows: rows.map(function (r) { return r.slice(); }), rowHead: rowHead.slice(), colHead: colHead.slice(), hl: hl || {} }; }
  function SET(label, items, hl) { return { type: 'set', label: label, items: items.slice(), hl: hl || {} }; }
  function CODE(label, lang, code, hl) { return { type: 'code', label: label, lang: lang, code: code, hl: hl || {} }; }
  function copyObj(o) { var c = {}; for (var k in o) c[k] = o[k]; return c; }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  // toy deterministic hash (real Kafka uses murmur2 on the key bytes) — same key always gives the same partition
  function toyHash(key) { var h = 7; key = String(key); for (var i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) % 1000003; return h; }
  function range(n, f) { var a = []; for (var i = 0; i < n; i++) a.push(f(i)); return a; }

  /* =====================================================================
     TOPIC 1 — Why messaging? Queues vs Pub/Sub
     ===================================================================== */
  topics.push({
    title: 'Why Messaging? Queues (Point-to-Point) vs Pub/Sub (Fan-out)',
    analogy: `<p>Think of a busy <b>restaurant kitchen</b>. Waiters do not stand next to the chef waiting for each dish. They pin an order ticket on the <b>ticket rail</b> and go back to their tables. Any free cook grabs the next ticket. That rail is a <b>queue</b>: each ticket is cooked by exactly <b>one</b> cook.</p>
<p>Now think of a <b>radio station</b>. The DJ speaks once, and every radio tuned to that channel hears it. The DJ does not know or care how many listeners there are. That is <b>publish/subscribe</b>: one message, <b>many</b> independent receivers, each with its own copy.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> Without messaging, Service A calls Service B directly and <b>waits</b>. If B is slow, A is slow. If B is down, A fails. A message broker sits in the middle like a post office: A drops a message and moves on; B picks it up when it is ready. This is called <b>asynchronous</b> communication, and it buys three things:</p>
<ul>
<li><b>Decoupling</b> — A does not need B's address, B's uptime, or even to know B exists.</li>
<li><b>Buffering (load levelling)</b> — a spike of 10,000 orders per second can be absorbed by the broker and drained by workers at 2,000/s.</li>
<li><b>Independent scaling</b> — add more workers for B without touching A.</li>
</ul>
<p>There are two delivery <b>shapes</b>:</p>
${H.table(['', 'Queue (point-to-point)', 'Pub/Sub (fan-out)'], [
  ['Who gets a message?', '<b>One</b> consumer out of many (competing consumers)', '<b>Every</b> subscriber gets its own copy'],
  ['Mental model', 'To-do list shared by workers', 'Newsletter / radio broadcast'],
  ['Used for', 'Background jobs: resize image, send one email, charge card', 'Events: "OrderPlaced" seen by billing, email, analytics, search'],
  ['After processing', 'Message is deleted (acked)', 'Each subscriber tracks its own progress'],
  ['Examples', 'AWS SQS, RabbitMQ queue, Celery, Sidekiq', 'AWS SNS, Google Pub/Sub, RabbitMQ fanout exchange, Kafka topics']
])}
<p>🔵 <b>How it really works.</b> In a classic queue (RabbitMQ, SQS) the broker <b>hands</b> a message to one consumer and hides it from others. The consumer must <b>ack</b> (acknowledge) it when done. No ack before a timeout (SQS calls it the <i>visibility timeout</i>, default 30 s) → the message becomes visible again and another worker gets it. That is why queues are naturally <b>at-least-once</b>.</p>
<p>In pub/sub, the broker keeps a separate <b>subscription</b> per subscriber. A slow analytics service does not slow down the email service — each has its own backlog.</p>
<p><b>Kafka blends both.</b> A Kafka topic is a log that every <b>consumer group</b> reads independently (pub/sub between groups), while consumers <b>inside</b> one group split the partitions between them (queue-like work sharing inside a group). You get fan-out and load-balancing with one tool:</p>
${H.table(['You want…', 'In Kafka you do…'], [
  ['Queue: each message processed once by a pool of workers', 'All workers join the <b>same</b> consumer group'],
  ['Pub/Sub: each service sees every message', 'Each service uses its <b>own</b> consumer group'],
  ['Both', 'Many groups, many members each']
])}
<p>Another big difference: a classic queue <b>deletes</b> messages after ack, while Kafka <b>keeps</b> them for a retention period (default 7 days) so new consumers can <b>replay</b> history. A queue is a to-do list; a log is a diary.</p>`,
    clues: [
      '"send a welcome email after signup without slowing the signup API" → background job queue',
      '"multiple teams need to react to the same event" (billing, analytics, search) → pub/sub / topic with one consumer group per team',
      '"traffic spikes 10× during sales but workers can only handle X/s" → queue as a buffer (load levelling)',
      '"the downstream service is flaky / sometimes down" → put a durable queue in between instead of a sync call',
      '"replay last week\'s events into a new service" → a retained log (Kafka / Kinesis / Pulsar), not a delete-on-ack queue',
      '"each task must be done by exactly one worker" → competing consumers on a queue'
    ],
    viz: [{
      title: 'Work queue: competing consumers, ack and redelivery',
      input: '6 2',
      inputLabel: 'messages workers (e.g. 6 2; max 10 messages, 4 workers)',
      gen: function (input) {
        var t = String(input || '').trim().split(/[\s,]+/).map(Number);
        var n = t[0], w = t[1];
        if (!(n >= 1 && n <= 10) || !(w >= 1 && w <= 4)) throw new Error('Enter: messages workers, e.g. "6 2" (1-10 messages, 1-4 workers)');
        var frames = [], q = [], done = [];
        var nodes = [B('P', 'Producer (API)', 12, 30), B('Q', 'Queue', 45, 30)];
        var edges = [['P', 'Q', 'send']];
        for (var i = 0; i < w; i++) { nodes.push(B('W' + (i + 1), 'Worker ' + (i + 1), 85, w === 1 ? 30 : 8 + i * (44 / (w - 1)))); edges.push(['Q', 'W' + (i + 1), 'take']); }
        frames.push(F('A <b>producer</b> (say, the signup API) and a <b>queue</b>. ' + w + ' worker(s) are waiting. The producer never talks to workers directly — that is the decoupling.', [G('Architecture', nodes, edges), QUEUE('Queue', [], {}, 'front', 'back')]));
        for (i = 1; i <= n; i++) q.push('job' + i);
        frames.push(F('The producer drops <b>' + n + ' jobs</b> into the queue and returns "202 Accepted" to the user immediately. It does not wait for any work to finish.', [G('Architecture', nodes, edges, { ehl: { 'P-Q': 'ok' }, hl: { Q: 'cur' } }), QUEUE('Queue', q, range(q.length, function () { return 'ok'; }).reduce(function (a, v, k) { a[k] = v; return a; }, {}), 'front', 'back')]));
        var turn = 0, crashed = false, log = [];
        while (q.length) {
          var worker = 'W' + (turn % w + 1); turn++;
          var job = q.shift();
          var hl = {}; hl[worker] = 'cur';
          var ehl = {}; ehl['Q-' + worker] = 'cur';
          if (!crashed && w >= 2 && job === 'job3') {
            crashed = true;
            hl[worker] = 'bad';
            frames.push(F('<b>' + worker + '</b> takes <b>' + job + '</b> — the broker hides it from everyone else (in flight)… but ' + worker + ' <span class="c-r">crashes before sending ack</span>.', [G('Architecture', nodes, edges, { hl: hl, ehl: ehl, tags: (function () { var tg = {}; tg[worker] = 'crashed'; return tg; })() }), QUEUE('Queue', q, {}, 'front', 'back'), TABLE('Who did what', ['job', 'worker', 'result'], log.concat([[job, worker, 'in flight, no ack']]), { [log.length]: 'bad' })]));
            q.unshift(job);
            frames.push(F('The <b>visibility timeout</b> expires (SQS default 30 s). Nobody acked <b>' + job + '</b>, so the broker makes it visible again at the front. Nothing is lost — but it may now run <b>twice</b> if the crash happened after the work was done. That is <b>at-least-once</b> delivery.', [G('Architecture', nodes, edges, { hl: { Q: 'cur' } }), QUEUE('Queue', q, { 0: 'bad' }, 'front', 'back')]));
            continue;
          }
          log.push([job, worker, 'done + ack']);
          done.push(job);
          var thl = {}; thl[log.length - 1] = 'ok';
          frames.push(F('<b>' + worker + '</b> takes <b>' + job + '</b>. Only this worker sees it (competing consumers). It finishes and sends <b>ack</b> → the broker deletes it for good.', [G('Architecture', nodes, edges, { hl: hl, ehl: ehl }), QUEUE('Queue', q, { 0: 'cur' }, 'front', 'back'), TABLE('Who did what', ['job', 'worker', 'result'], log, thl)]));
        }
        frames.push(F('Queue empty. Every job was handled by <b>exactly one</b> worker at a time; ' + (crashed ? 'the crashed one was redelivered. ' : '') + 'To go faster, just add workers — the producer does not change.', [G('Architecture', nodes, edges, { hl: { Q: 'ok' } }), QUEUE('Queue', [], {}, 'front', 'back'), SET('Completed', done, {})]));
        return frames;
      }
    }, {
      title: 'Pub/Sub fan-out: one event, many independent subscribers',
      input: 'Email,Inventory,Analytics',
      inputLabel: 'Subscriber names, comma separated (1-5)',
      gen: function (input) {
        var subs = String(input || '').split(',').map(function (s) { return s.trim().replace(/[^A-Za-z0-9]/g, ''); }).filter(Boolean);
        if (subs.length < 1 || subs.length > 5) throw new Error('Enter 1-5 subscriber names, e.g. "Email,Inventory,Analytics"');
        var frames = [];
        var nodes = [B('PUB', 'Order Service', 10, 30), B('T', 'Topic: orders', 42, 30)];
        var edges = [['PUB', 'T', 'publish']];
        subs.forEach(function (s, i) { nodes.push(B('S' + i, s + ' svc', 85, subs.length === 1 ? 30 : 5 + i * (50 / (subs.length - 1)))); edges.push(['T', 'S' + i]); });
        var backlog = subs.map(function () { return []; });
        function tbl(hlRow) { return TABLE('Per-subscriber backlog (each has its OWN copy)', ['subscriber', 'pending messages'], subs.map(function (s, i) { return [s, backlog[i].join(', ') || '—']; }), hlRow || {}); }
        frames.push(F('The <b>Order Service</b> publishes to a <b>topic</b>, not to a service. ' + subs.length + ' service(s) subscribed. The publisher does not even know their names.', [G('Pub/Sub', nodes, edges), tbl()]));
        subs.forEach(function (s, i) { backlog[i].push('OrderPlaced#1'); });
        var ehl = { 'PUB-T': 'ok' }; subs.forEach(function (s, i) { ehl['T-S' + i] = 'ok'; });
        frames.push(F('One publish of <b>OrderPlaced#1</b> → the broker puts a <b>copy</b> in every subscription. ' + subs.length + ' subscribers = ' + subs.length + ' deliveries. That is <b>fan-out</b>.', [G('Pub/Sub', nodes, edges, { ehl: ehl, hl: { T: 'cur' } }), tbl(range(subs.length, function () { return 'ok'; }).reduce(function (a, v, k) { a[k] = v; return a; }, {}))]));
        subs.forEach(function (s, i) {
          backlog[i].shift();
          var h = {}; h['S' + i] = 'ok'; var e = {}; e['T-S' + i] = 'cur'; var r = {}; r[i] = 'ok';
          frames.push(F('<b>' + s + '</b> processes its copy at its own speed and acknowledges it. The other subscribers are not affected at all.', [G('Pub/Sub', nodes, edges, { hl: h, ehl: e }), tbl(r)]));
        });
        var slow = subs.length - 1;
        subs.forEach(function (s, i) { backlog[i].push('OrderPlaced#2'); backlog[i].push('OrderPlaced#3'); });
        subs.forEach(function (s, i) { if (i !== slow) backlog[i] = []; });
        var hs = {}; hs['S' + slow] = 'bad'; var rs = {}; rs[slow] = 'bad';
        frames.push(F('Two more events. <b>' + subs[slow] + '</b> is down for a deploy — its copies <span class="c-r">pile up in its own backlog</span>, while the others keep flowing. One slow subscriber never blocks the rest.', [G('Pub/Sub', nodes, edges, { hl: hs, tags: (function () { var t = {}; t['S' + slow] = 'down'; return t; })() }), tbl(rs)]));
        backlog[slow] = [];
        var hs2 = {}; hs2['S' + slow] = 'ok';
        frames.push(F('<b>' + subs[slow] + '</b> comes back and drains its backlog. Durable subscriptions mean no events were missed.', [G('Pub/Sub', nodes, edges, { hl: hs2 }), tbl()]));
        var n2 = nodes.concat([B('NEW', 'Fraud svc (new)', 60, 56)]), e2 = edges.concat([['T', 'NEW', 'subscribe']]);
        frames.push(F('Next quarter a <b>Fraud</b> team subscribes. <b>Zero changes</b> to the Order Service. With a log-based broker (Kafka) Fraud can even replay old orders from the beginning; with SNS-style pub/sub it only sees new ones.', [G('Pub/Sub', n2, e2, { hl: { NEW: 'ok' }, ehl: { 'T-NEW': 'ok' }, h: 64 })]));
        return frames;
      }
    }],
    examples: [
      { title: 'Signup email: a queue', html: `<p>The signup API must answer in 200 ms but sending an email takes 1–3 s and the email provider is sometimes down. The API writes <code>{userId: 42, template: "welcome"}</code> into a queue and returns. Three email workers compete for jobs. If the provider is down, jobs wait in the queue and are retried — the user never sees an error. Each email should go out <b>once</b>, so this is point-to-point.</p>` },
      { title: 'OrderPlaced: pub/sub', html: `<p>When an order is placed, five things must happen: charge payment, reserve stock, send confirmation, update the analytics dashboard, update the recommendation model. If the Order Service called all five synchronously, its latency would be the <b>sum</b> and its availability the <b>product</b> (0.999<sup>5</sup> ≈ 99.5%). Instead it publishes one <code>OrderPlaced</code> event; each team subscribes. Order Service latency stays flat, and a sixth team can join tomorrow without a code change.</p>` },
      { title: 'SNS + SQS fan-out (AWS classic)', html: `<p>On AWS the standard recipe is <b>SNS topic → one SQS queue per subscriber</b>. SNS does the fan-out; each SQS queue gives that subscriber durable buffering, retries and its own dead-letter queue. It is pub/sub between teams and a work queue inside each team — the same shape Kafka gives you with consumer groups.</p>
${H.table(['Layer', 'Role'], [['SNS topic "orders"', 'fan-out copy to every subscription'], ['SQS "billing-q"', 'billing workers compete'], ['SQS "email-q"', 'email workers compete'], ['DLQ per queue', 'poison messages parked']])}` },
      { title: 'Sync vs async latency math', html: `<p>Checkout calls Payment (120 ms), Inventory (80 ms), Email (900 ms) one after another: <b>1,100 ms</b>. Make Email async via a queue: <b>200 ms + ~5 ms</b> to enqueue. Payment usually stays synchronous because the user must know if the card was declined — not everything should be async. Rule: <b>async whatever the user does not need to wait for</b>.</p>` }
    ],
    deepDive: `<p>🟣 <b>Push vs pull.</b> RabbitMQ <b>pushes</b> messages to consumers (limited by a <i>prefetch</i> count so a consumer is not flooded). Kafka, SQS and Pulsar consumers <b>pull</b>. Pull gives natural backpressure — a consumer only asks for what it can handle — and lets it batch. Push gives lower latency for small volumes.</p>
<p><b>Smart broker vs dumb broker.</b> RabbitMQ is a "smart broker, dumb consumer": routing rules (direct, topic, fanout, headers exchanges), per-message acks, priorities, TTLs and per-message redelivery live in the broker. Kafka is a "dumb broker, smart consumer": the broker just appends to and serves a log; consumers decide where to read from (offsets). This is why Kafka scales to millions of messages per second on commodity disks (sequential I/O, zero-copy <code>sendfile</code>, batching, compression) but has no per-message ack or selective redelivery (until share groups, below).</p>
<p><b>Choosing a broker in 2026:</b></p>
${H.table(['Need', 'Good fit'], [
  ['Simple job queue, managed, no ops', 'SQS (Standard: at-least-once, best-effort order; FIFO: per-group order + 5-min dedup window)'],
  ['Complex routing, per-message acks, priorities, RPC-style', 'RabbitMQ (quorum queues; also has Streams for log-style)'],
  ['High-throughput event streaming, replay, many consumers', 'Kafka (or Kafka-API compatible: Redpanda, WarpStream, Confluent, MSK, Azure Event Hubs)'],
  ['Multi-tenant, geo-replication, separate compute/storage', 'Apache Pulsar'],
  ['Lightweight, edge/IoT, request-reply', 'NATS / NATS JetStream, MQTT brokers'],
  ['Serverless GCP fan-out', 'Google Pub/Sub']
])}
<p><b>Queues inside Kafka.</b> Kafka 4.x introduced <b>share groups</b> (KIP-932, "Queues for Kafka"): many consumers can read the <i>same</i> partition with per-message acknowledgement and redelivery counts, like a classic queue. It started as early access in 4.0 and matured through later 4.x releases. Classic consumer groups remain the default for ordered stream processing.</p>
<p><b>Costs of going async:</b> eventual consistency (the email arrives a few seconds later), harder debugging (you need trace IDs carried in message headers), duplicates (at-least-once), and a new piece of infrastructure to run. Do not add a broker for a call the user is waiting on.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> AI agents are now heavy producers and consumers of queues — LLM calls are slow (seconds) and rate-limited, so "put the prompt on a queue, let a worker pool call the model, publish the result as an event" is the default shape for summarisation, embeddings and agent tool runs. Pub/sub lets one <code>DocumentUploaded</code> event fan out to an embedding worker, a moderation model and a search indexer.</p>
<p><b>Use AI as a partner:</b> ask <code>List every consumer of the OrderPlaced event in this repo and what each one does</code> — assistants are good at mapping who subscribes to what. Ask it to draft SNS/SQS or Kafka topic configs, then review them.</p>
<p><b>Where AI goes wrong:</b> it often suggests Kafka for a 50-messages-per-minute job queue (SQS or a Postgres <code>SKIP LOCKED</code> table is simpler), forgets visibility timeouts longer than the job's run time (causing double processing of long LLM calls), and confuses "one consumer group per service" with "one consumer per partition".</p>
<p><b>What you must still own:</b> deciding what is sync vs async from the user's point of view, picking queue vs pub/sub from the wording, and explaining the consistency trade-off to your interviewer.</p>`,
    problems: [{
      title: 'Queue or Pub/Sub? Signup side-effects',
      level: 'Easy',
      tags: ['queue', 'pub/sub', 'async'],
      companies: ['Amazon', 'Shopify', 'Atlassian'],
      statement: `<p>When a user signs up, the system must: (1) send a welcome email, (2) create a free-trial subscription in billing, (3) add the user to the analytics warehouse, (4) post to the sales team's CRM. Today the signup API calls all four synchronously and p99 latency is 4 s; when the CRM is down, signups fail. Redesign it.</p>`,
      constraints: `<p>5,000 signups/hour peak. Each side-effect owned by a different team. Signup API p99 target: 300 ms. No side-effect may be lost.</p>`,
      example: `<p>Input: user <code>u42</code> signs up while the CRM is down.<br>Expected: signup returns <span class="c-g">201 in ~150 ms</span>; email, billing and analytics happen within seconds; CRM catches up <span class="c-y">when it recovers</span>; nothing is lost.</p>`,
      brute: { why: `<p><b>Naive:</b> keep synchronous calls but add retries. Latency becomes the <b>sum</b> of four calls plus retry delays, and availability the <b>product</b> of four services. The signup flow now fails because of a CRM that the user does not care about. Another naive fix — one shared queue that all four teams' workers read from — breaks too: each message is consumed by <b>one</b> worker, so only one of the four side-effects would happen per signup.</p>` },
      mcq: { q: 'Four different teams must each react to every signup. Which shape fits?', options: ['One queue shared by all teams', 'Pub/sub: one event, a separate subscription (or consumer group) per team', 'Synchronous REST calls with retries', 'A cron job that scans the users table'], answer: 1, explain: 'Each team needs its own copy and its own progress. A shared queue would give each signup to only one team.' },
      hints: [`<p>Hint 1: Does the user need to wait for any of these four things? If not, none of them belong in the request path.</p>`, `<p>Hint 2: Four independent reactions to one fact = an event published once with four subscribers. Inside each team, workers compete for messages.</p>`, `<p>Hint 3: Make the publish itself reliable: write the user row and an outbox row in one DB transaction; a relay publishes <code>UserSignedUp</code>. Each consumer must be idempotent (key on userId) because delivery is at-least-once.</p>`],
      solution: {
        approach: `<p><b>Design.</b> The signup API writes the <code>users</code> row and an <code>outbox</code> row (<code>UserSignedUp{userId, email, plan, ts}</code>) in <b>one transaction</b> and returns 201. A relay (Debezium CDC or a poller) publishes the event to a <code>user-signups</code> topic (Kafka) or an SNS topic. Four subscriptions: Kafka consumer groups <code>email-svc</code>, <code>billing-svc</code>, <code>analytics-loader</code>, <code>crm-sync</code> — or four SQS queues behind SNS. Inside each, workers compete. Each consumer is <b>idempotent</b>: billing uses <code>INSERT … ON CONFLICT (user_id) DO NOTHING</code>; email stores <code>(userId, template)</code> sent. Each subscription has retries with backoff and a <b>DLQ</b>. When the CRM is down, only <code>crm-sync</code> lag grows; it drains on recovery. Partition key = <code>userId</code> so a later <code>UserDeleted</code> is processed after <code>UserSignedUp</code> for the same user. Alert on consumer lag per group.</p>`,
        complexity: `<p>Signup latency = one local DB transaction (~10–30 ms). Throughput: 5,000/h ≈ 1.4 msg/s — any broker handles this; a single partition would do, but 3–6 partitions give headroom and parallelism. Storage negligible.</p>`,
        followUps: ['What if marketing wants to send the email only after billing succeeds?', 'How do you replay signups into a newly built recommendation service?', 'How would you trace one signup across all four consumers?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 2 — Kafka architecture: brokers, topics, partitions, replication
     ===================================================================== */
  topics.push({
    title: 'Kafka Architecture: Brokers, Topics, Partitions, Logs & Replication',
    analogy: `<p>Picture a <b>library of diaries</b>. A <b>topic</b> is a subject shelf ("orders"). Because one diary would fill up and only one person can write in it at a time, the shelf holds several <b>diaries</b> side by side — those are <b>partitions</b>. You only ever write on the <b>next empty line</b> (append-only), and every line has a <b>line number</b> — the <b>offset</b>. Readers keep a bookmark. Each diary is photocopied onto other shelves in other rooms (<b>replicas</b>) so a fire in one room loses nothing.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> Kafka is a <b>distributed, replicated, append-only log</b>. Producers append messages to the end; consumers read from any position they like; messages stay for a configured time (default <b>7 days</b>) whether read or not.</p>
<p><b>The vocabulary, one sentence each:</b></p>
${H.table(['Term', 'Plain meaning'], [
  ['<b>Record / message</b>', 'Key (optional) + value (bytes) + headers + timestamp.'],
  ['<b>Topic</b>', 'A named stream of records, e.g. <code>orders</code>.'],
  ['<b>Partition</b>', 'One ordered, append-only log file-set; a topic is split into N partitions for parallelism.'],
  ['<b>Offset</b>', 'The position of a record inside one partition: 0, 1, 2… Unique only <i>within</i> that partition.'],
  ['<b>Broker</b>', 'One Kafka server. A cluster has many; each stores some partitions.'],
  ['<b>Replica / leader / follower</b>', 'Each partition is copied to RF brokers; one leader takes reads and writes, followers copy it.'],
  ['<b>ISR</b>', 'In-Sync Replicas — the replicas that are fully caught up with the leader.'],
  ['<b>Controller (KRaft)</b>', 'The brain that tracks which broker leads which partition. Since Kafka 4.0, metadata lives in Kafka\'s own Raft quorum — ZooKeeper is gone.']
])}
<p>🔵 <b>How a write finds its partition.</b> The producer picks the partition, not the broker:</p>
<ul>
<li><b>Key present</b> → <code>partition = murmur2(keyBytes) mod numPartitions</code>. Same key → same partition → <b>ordered</b> for that key.</li>
<li><b>Key null</b> → the <i>sticky</i> partitioner fills a batch for one partition, then switches. Good batching, no ordering.</li>
<li>Or a custom partitioner.</li>
</ul>
${H.table(['Record', 'key', 'hash mod 3', 'partition', 'offset'], [
  ['login', 'u1', '2', 'P2', '0'],
  ['view', 'u2', '0', 'P0', '0'],
  ['cart', 'u1', '2', 'P2', '<span class="c-g">1</span>'],
  ['pay', 'u1', '2', 'P2', '<span class="c-g">2</span>']
])}
<p>All of u1's events sit in P2 at offsets 0, 1, 2 — in the order they were sent. There is <b>no ordering across partitions</b>.</p>
<p><b>Durability knobs (producer <code>acks</code>):</b></p>
${H.table(['acks', 'Producer waits for…', 'Risk'], [
  ['0', 'nothing (fire and forget)', 'lose data silently'],
  ['1', 'leader wrote it to its log', 'leader dies before followers copy → lost'],
  ['all (-1)', 'all <b>in-sync</b> replicas have it', 'safest; combine with <code>min.insync.replicas=2</code>, RF=3']
])}
<p>Since Kafka 3.0 the producer defaults are <code>acks=all</code> and <code>enable.idempotence=true</code>, so retries do not create duplicates inside the log.</p>`,
    clues: [
      '"millions of events per second" + "multiple consumers" + "replay" → Kafka / log-based streaming',
      '"keep events for 7 days so a new service can catch up" → retention on a log, not a delete-on-ack queue',
      '"must not lose acknowledged writes even if a broker dies" → RF=3, acks=all, min.insync.replicas=2',
      '"keep only the latest value per key (e.g. user profile)" → log-compacted topic',
      '"how many partitions?" → throughput ÷ per-partition throughput, and ≥ max consumers you will ever want',
      '"ordering per user / per account" → key = userId / accountId'
    ],
    viz: [{
      title: 'Producers append to partition logs (key → partition → offset)',
      input: '3 u1:login u2:view u1:cart u3:view u2:buy u1:pay u3:click',
      inputLabel: 'partitions followed by key:event records (max 6 partitions, 14 records)',
      gen: function (input) {
        var t = String(input || '').trim().split(/\s+/);
        var P = Number(t[0]);
        var recs = t.slice(1).map(function (s) { var a = s.split(':'); return { k: a[0], v: a[1] || 'evt' }; });
        if (!(P >= 1 && P <= 6) || !recs.length || recs.length > 14 || recs.some(function (r) { return !r.k; })) throw new Error('Format: "3 u1:login u2:view …" — first a partition count 1-6, then up to 14 key:event records');
        var logs = range(P, function () { return []; });
        var maxCols = Math.max(4, recs.length);
        function grid(hl) {
          var w = Math.max(4, Math.max.apply(null, logs.map(function (l) { return l.length; })) + 1);
          w = Math.min(w, maxCols);
          return GRID('Topic "events" — one row per partition, one column per offset', logs.map(function (l) { return range(w, function (c) { return l[c] ? l[c] : ''; }); }), range(P, function (p) { return 'P' + p; }), range(w, function (c) { return 'off ' + c; }), hl || {});
        }
        var frames = [F('Empty topic with <b>' + P + ' partitions</b>. Each row is an independent append-only log. Offsets start at 0 in <b>every</b> partition.', [grid(), VARS('Producer', { partitions: P, records: recs.length })])];
        recs.forEach(function (r) {
          var h = toyHash(r.k), p = h % P, off = logs[p].length;
          logs[p].push(r.k + ':' + r.v);
          var hl = {}; hl[p + ',' + off] = 'ok';
          for (var c = 0; c < off; c++) if (logs[p][c].split(':')[0] === r.k) hl[p + ',' + c] = 'sel';
          frames.push(F('Record <b>' + esc(r.k) + ':' + esc(r.v) + '</b>: hash("' + esc(r.k) + '") = ' + h + ', ' + h + ' mod ' + P + ' = <b>P' + p + '</b>. Appended at the end → <b>offset ' + off + '</b>.' + (off > 0 && Object.keys(hl).length > 1 ? ' Earlier records with the same key (purple) are in the same partition, so order for <b>' + esc(r.k) + '</b> is kept.' : ''), [grid(hl), VARS('Partitioner', { key: r.k, hash: h, 'hash mod P': p, offset: off }, { 'hash mod P': 'ok' })]));
        });
        var keys = {}; recs.forEach(function (r) { keys[r.k] = toyHash(r.k) % P; });
        var rows = Object.keys(keys).map(function (k) { return [k, 'P' + keys[k], recs.filter(function (r) { return r.k === k; }).map(function (r) { return r.v; }).join(' → ')]; });
        frames.push(F('Done. Every key lives in exactly one partition, so its events are in send order. But there is <b>no global order</b>: P0 offset 1 and P1 offset 1 have no time relation. (Real Kafka uses murmur2, not this toy hash.)', [grid(), TABLE('Per-key order', ['key', 'partition', 'events in order'], rows)]));
        var counts = logs.map(function (l) { return l.length; });
        frames.push(F('Partition sizes. If one key is very busy (a celebrity user, a giant tenant), its partition gets all its traffic — a <b>hot partition</b>. Watch for skew like this in production.', [{ type: 'bars', label: 'records per partition', values: counts, idxLabels: range(P, function (p) { return 'P' + p; }) }]));
        return frames;
      }
    }, {
      title: 'Replication, ISR, high watermark and leader failover',
      gen: function () {
        var frames = [];
        var nodes = [B('PR', 'Producer', 10, 30), B('B1', 'Broker 1', 45, 8), B('B2', 'Broker 2', 45, 30), B('B3', 'Broker 3', 45, 52), B('CT', 'KRaft controller', 85, 30)];
        var edges = [['PR', 'B1', 'acks=all'], ['B2', 'B1', 'fetch'], ['B3', 'B1', 'fetch'], ['CT', 'B1']];
        function st(b1, b2, b3, hw, hlRow) { return TABLE('Partition orders-0 (RF=3, min.insync.replicas=2)', ['broker', 'role', 'log end offset'], [['Broker 1', b1[0], b1[1]], ['Broker 2', b2[0], b2[1]], ['Broker 3', b3[0], b3[1]]], hlRow || {}); }
        frames.push(F('Partition <b>orders-0</b> has 3 replicas. <b>Broker 1 is leader</b>; brokers 2 and 3 are followers that keep <b>fetching</b> from it. All three are in the ISR.', [G('Cluster', nodes, edges, { hl: { B1: 'sel' }, tags: { B1: 'leader' } }), st(['leader', 5], ['follower', 5], ['follower', 5], 5), VARS('State', { ISR: '{1,2,3}', 'high watermark': 5 })]));
        frames.push(F('Producer sends record #5 with <b>acks=all</b>. Leader appends it (log end offset 6). The producer is <b>not</b> acked yet.', [G('Cluster', nodes, edges, { hl: { B1: 'cur' }, ehl: { 'PR-B1': 'cur' } }), st(['leader', 6], ['follower', 5], ['follower', 5], 5, { 0: 'ok' }), VARS('State', { ISR: '{1,2,3}', 'high watermark': 5 })]));
        frames.push(F('Brokers 2 and 3 fetch and append #5. Now every ISR member has it, so the leader moves the <b>high watermark</b> to 6 and acks the producer. Consumers can only read up to the high watermark — they never see data that could be lost.', [G('Cluster', nodes, edges, { hl: { B1: 'ok', B2: 'ok', B3: 'ok' }, ehl: { 'B2-B1': 'ok', 'B3-B1': 'ok' } }), st(['leader', 6], ['follower', 6], ['follower', 6], 6, { 1: 'ok', 2: 'ok' }), VARS('State', { ISR: '{1,2,3}', 'high watermark': 6, 'producer acked': 'yes' }, { 'high watermark': 'ok' })]));
        frames.push(F('Broker 3 has a slow disk and stops keeping up for longer than <code>replica.lag.time.max.ms</code> (30 s). The leader <b>shrinks the ISR</b> to {1,2}. Writes continue because ISR size 2 ≥ min.insync.replicas 2.', [G('Cluster', nodes, edges, { hl: { B3: 'bad' }, tags: { B3: 'lagging' } }), st(['leader', 9], ['follower', 9], ['out of ISR', 7], 9, { 2: 'bad' }), VARS('State', { ISR: '{1,2}', 'high watermark': 9 }, { ISR: 'cur' })]));
        frames.push(F('<span class="c-r">Broker 1 (the leader) crashes.</span> Producers and consumers get errors for orders-0 for a moment.', [G('Cluster', nodes, edges, { hl: { B1: 'bad' }, tags: { B1: 'DEAD' } }), st(['dead', 9], ['follower', 9], ['out of ISR', 7], 9, { 0: 'bad' }), VARS('State', { ISR: '{1,2}', 'high watermark': 9 })]));
        var edges2 = [['PR', 'B2', 'acks=all'], ['B3', 'B2', 'fetch'], ['CT', 'B2', 'new leader']];
        frames.push(F('The KRaft controller notices (missed heartbeats) and elects a new leader <b>from the ISR</b>: Broker 2. It has every acknowledged record, so <b>nothing acked is lost</b>. Clients refresh metadata and retry to Broker 2. Broker 3 was not chosen because it was missing offsets 7–8 (that would be an <i>unclean</i> election).', [G('Cluster', nodes, edges2, { hl: { B2: 'sel', CT: 'cur' }, tags: { B2: 'leader', B1: 'DEAD' }, ehl: { 'CT-B2': 'ok' } }), st(['dead', 9], ['leader', 9], ['follower (catching up)', 7], 9, { 1: 'ok' }), VARS('State', { ISR: '{2}', 'high watermark': 9, 'min.insync.replicas': 2 })]));
        frames.push(F('ISR is now just {2}, smaller than min.insync.replicas=2. Writes with acks=all are <span class="c-r">rejected (NotEnoughReplicas)</span> until Broker 3 catches up. Kafka chooses <b>consistency over availability</b> here — the producer retries rather than accepting data that only one disk holds.', [G('Cluster', nodes, edges2, { hl: { B2: 'cur', B3: 'cur' } }), st(['dead', 9], ['leader', 9], ['follower', 8], 9, { 2: 'cur' }), VARS('State', { ISR: '{2}', writes: 'rejected' }, { writes: 'bad' })]));
        frames.push(F('Broker 3 catches up to offset 9 and rejoins the ISR {2,3}. Writes resume. When Broker 1 restarts, it rejoins as a follower, truncates anything above the high watermark it had, and copies from the new leader.', [G('Cluster', nodes, edges2.concat([['B1', 'B2', 'fetch']]), { hl: { B2: 'sel', B3: 'ok', B1: 'ok' }, tags: { B2: 'leader' } }), st(['follower', 9], ['leader', 9], ['follower', 9], 9, { 0: 'ok', 2: 'ok' }), VARS('State', { ISR: '{1,2,3}', writes: 'ok' }, { writes: 'ok' })]));
        return frames;
      }
    }],
    code: [{ lang: 'bash', check: false, title: 'Create a topic (Kafka 4.x CLI)', code: `# 12 partitions for parallelism, 3 copies of every partition for durability
kafka-topics.sh --bootstrap-server localhost:9092 --create \\
  --topic orders --partitions 12 --replication-factor 3 \\
  --config min.insync.replicas=2 \\
  --config retention.ms=604800000   # 7 days

# A compacted topic keeps only the latest record per key (e.g. customer profiles)
kafka-topics.sh --bootstrap-server localhost:9092 --create \\
  --topic customer-profiles --partitions 6 --replication-factor 3 \\
  --config cleanup.policy=compact

kafka-topics.sh --bootstrap-server localhost:9092 --describe --topic orders
# Topic: orders Partition: 0 Leader: 1 Replicas: 1,2,3 Isr: 1,2,3 ...` }, { lang: 'python', run: true, title: 'How the key picks the partition (runnable simulation)', code: `# Simulates the producer-side partitioner. Real Kafka uses murmur2(key bytes) % partitions;
# we use zlib.crc32 here only because it is in the standard library. The idea is identical:
# the SAME key always maps to the SAME partition, so per-key order is preserved.
import zlib
from collections import defaultdict

NUM_PARTITIONS = 3
records = [("u1", "login"), ("u2", "view"), ("u1", "cart"),
           ("u3", "view"), ("u2", "buy"), ("u1", "pay")]

logs = defaultdict(list)          # partition -> list of (offset, key, value)
for key, value in records:
    p = zlib.crc32(key.encode()) % NUM_PARTITIONS
    offset = len(logs[p])         # next free slot = offset (append-only)
    logs[p].append((offset, key, value))
    print(f"{key}:{value:<5} -> partition {p}, offset {offset}")

print()
for p in range(NUM_PARTITIONS):
    print(f"P{p}:", [f"{k}:{v}@{o}" for o, k, v in logs[p]])

# Adding partitions changes key -> partition mapping (mod N changes!)
print("\\nIf we grow to 4 partitions, u1 moves from",
      zlib.crc32(b"u1") % 3, "to", zlib.crc32(b"u1") % 4)` }],
    codeTitle: ['Topic CLI', 'Partitioner simulation (Python)'],
    examples: [
      { title: 'Sizing partitions with numbers', html: `<p>Target: 300 MB/s into <code>clicks</code>. Measured: one partition handles ~10 MB/s on the producer side, and one consumer can process ~5 MB/s. Producer bound: 300/10 = 30. Consumer bound: 300/5 = <b>60</b>. Take the larger, add headroom for 2× growth → <b>~120 partitions</b>. Do not go to 10,000 "just in case": every partition costs file handles, memory, replication traffic and longer failovers. (KRaft lifted cluster-wide limits into the millions, but per-broker a few thousand partitions is still a sane ceiling.)</p>` },
      { title: 'Storage math with replication', html: `<p>1 KB events × 50,000/s = 50 MB/s = 4.3 TB/day. Retention 7 days = 30 TB. RF=3 → <b>90 TB</b> of disk, before compression (lz4/zstd usually 3–5× on JSON). With <b>tiered storage</b> (GA in Kafka 3.9) old segments move to S3, so brokers keep only hot data locally.</p>${H.table(['Item', 'Value'], [['ingest', '50 MB/s'], ['per day', '4.3 TB'], ['7 days', '30 TB'], ['× RF 3', '<b>90 TB</b>'], ['÷ zstd ~4', '~23 TB']])}` },
      { title: 'Compacted topic for latest state', html: `<p>Topic <code>customer-profiles</code> with <code>cleanup.policy=compact</code>. Records: <code>c7:{city:Pune}</code>, <code>c9:{…}</code>, <code>c7:{city:Delhi}</code>. After compaction only the <b>latest</b> <code>c7:{city:Delhi}</code> remains (offsets keep their numbers; old ones just disappear). A record with a <b>null value</b> is a <i>tombstone</i> meaning "delete c7". New services bootstrap a full local cache by reading the compacted topic from offset 0. Kafka itself stores consumer offsets in the compacted internal topic <code>__consumer_offsets</code>.</p>` },
      { title: 'Adding partitions breaks key mapping', html: `<p>You grow <code>orders</code> from 6 to 8 partitions. <code>hash(order-17) mod 6 = 5</code> but <code>mod 8 = 3</code>. New events for order-17 land in P3 while old ones are in P5 — a consumer can see "OrderShipped" before it finishes "OrderPaid" from the other partition. Kafka never re-shuffles existing data. Fix: <b>over-provision partitions up front</b>, or create a new topic and migrate with a cut-over.</p>` }
    ],
    deepDive: `<p>🟣 <b>On disk.</b> A partition is a directory of <b>segments</b> (default 1 GB each): a <code>.log</code> file of record batches plus sparse <code>.index</code> (offset → byte position) and <code>.timeindex</code> files. Only the newest (active) segment is written; retention deletes or compacts whole old segments. Reads at offset N do a binary search in the sparse index, then a short scan.</p>
<p><b>Why it is so fast:</b> sequential appends (disks and SSDs love them), heavy use of the OS page cache instead of a JVM cache, <b>batching</b> (<code>linger.ms</code>, <code>batch.size</code>) and compression per batch, and zero-copy <code>sendfile()</code> from page cache to socket for plaintext consumers. A single broker can push hundreds of MB/s.</p>
<p><b>High watermark vs log end offset.</b> LEO = next offset the leader will write. HW = highest offset copied to all ISR members. Consumers read only below the HW, so a leader change can never "un-show" a record they already saw. Leader epochs (KIP-101) fix older edge cases where followers truncated incorrectly.</p>
<p><b>Unclean leader election</b> (<code>unclean.leader.election.enable=false</code> by default) — if every ISR member is dead, Kafka waits rather than electing an out-of-sync replica that would lose data. Turning it on trades durability for availability.</p>
<p><b>KRaft.</b> Kafka 4.0 (2025) removed ZooKeeper. A small quorum of controller nodes runs Raft over a metadata log (<code>__cluster_metadata</code>); brokers replay that log. Benefits: faster controller failover, far more partitions per cluster, one system to operate.</p>
<p><b>Rack awareness &amp; multi-region.</b> <code>broker.rack</code> spreads replicas across availability zones. Followers can serve reads to nearby consumers (KIP-392, follower fetching) to cut cross-AZ cost. Cross-region usually uses <b>MirrorMaker 2</b> or vendor cluster-linking (async), because stretching one cluster across regions adds latency to every acks=all write.</p>
<p><b>Ecosystem in 2026:</b> Kafka API is the de-facto streaming protocol; Redpanda (C++, no JVM), WarpStream / "diskless" designs writing straight to object storage, Confluent, AWS MSK and Azure Event Hubs all speak it.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> Kafka is the backbone that feeds real-time features to ML models and streams AI outputs back out. Patterns you will meet: <code>events → stream processor → feature store</code> for online inference; CDC topics → embedding workers → vector database to keep RAG indexes fresh; model predictions published as events for audit and evaluation. Managed vendors now offer "Kafka-to-Iceberg" tables so the same topic is queryable by analytics and AI tools.</p>
<p><b>Use AI as a partner:</b> paste <code>kafka-topics --describe</code> output and ask <code>which partitions are under-replicated and which brokers lead too many partitions?</code> — LLMs read these tables well. Ask for back-of-envelope partition and storage sizing, then check the arithmetic yourself.</p>
<p><b>Where AI goes wrong:</b> it still writes ZooKeeper-based setup steps (removed in 4.0), claims ordering "across a topic", recommends <code>acks=1</code> for payments, or suggests increasing partitions on a keyed topic without warning about re-mapping.</p>
<p><b>What you must still own:</b> the durability math (RF, acks, min.insync.replicas), partition counts tied to throughput and consumer parallelism, and explaining what happens step by step when a leader dies.</p>`,
    problems: [{
      title: 'Size a clickstream topic',
      level: 'Medium',
      tags: ['kafka', 'partitions', 'estimation', 'replication'],
      companies: ['LinkedIn', 'Uber', 'Netflix'],
      statement: `<p>A website emits click events: 200,000 events/s at peak, ~800 bytes each. Events must survive one broker failure without loss, be kept 3 days, and be read by three consumer groups (real-time dashboard, fraud model, data-lake loader). One consumer instance can process 4,000 events/s. Choose partition count, replication settings, broker count and disk.</p>`,
      constraints: `<p>Per-partition safe write throughput ≈ 10 MB/s. Brokers have 4 × 4 TB disks and 1 GB/s NIC. Growth: 2× within a year.</p>`,
      example: `<p>Ingest = 200k × 800 B = <b>160 MB/s</b>. Consumer parallelism needed = 200k / 4k = <b>50</b> consumers per group → ≥ 50 partitions. Producer bound = 160 / 10 = 16. With 2× growth → <span class="c-g">~100–120 partitions</span>.</p>`,
      brute: { why: `<p><b>Naive:</b> "1 partition per consumer group" or "just use 1,000 partitions". One partition caps a group at <b>one</b> consumer (4k/s), 50× too slow — lag grows forever. 1,000+ partitions inflates metadata, open files, replication threads and failover time, and makes small batches (worse compression). Also naive: RF=1 or acks=1, which loses data when a broker dies.</p>` },
      mcq: { q: 'Which number usually decides the minimum partition count?', options: ['Number of brokers', 'Max consumer parallelism needed by the slowest consumer group (and producer throughput)', 'Number of topics', 'Retention days'], answer: 1, explain: 'Within a group, one partition is read by at most one consumer, so partitions cap parallelism.' },
      hints: [`<p>Hint 1: Compute bytes/s in and the number of consumers the slowest group needs. Partitions must be ≥ that consumer count.</p>`, `<p>Hint 2: Durability against one broker loss → RF=3, acks=all, min.insync.replicas=2 (so you can lose one broker and still accept writes).</p>`, `<p>Hint 3: Disk = ingest × retention × RF ÷ compression. Network out = ingest × (RF−1 for replication + number of consumer groups). Then divide by per-broker capacity with ~50% headroom.</p>`],
      solution: {
        approach: `<p><b>Partitions:</b> slowest group needs 50 consumers now, 100 after growth → <b>120 partitions</b> (divisible by many consumer counts: 10, 12, 20, 24, 30, 40, 60). Key = <code>sessionId</code> if per-session order matters for the fraud model; otherwise null key with sticky partitioning for best batching.</p>
<p><b>Durability:</b> RF=3 across 3 AZs (<code>broker.rack</code>), <code>acks=all</code>, <code>min.insync.replicas=2</code>, idempotent producer, unclean election off.</p>
<p><b>Disk:</b> 160 MB/s × 86,400 × 3 days ≈ 41 TB raw × 3 replicas = 124 TB, ÷ ~4 with zstd ≈ <b>31 TB</b>; with 50% headroom and 2× growth ≈ 90 TB → 6 brokers × 16 TB. Or use tiered storage: keep ~12 h locally, the rest in S3.</p>
<p><b>Network:</b> in 160 MB/s; replication out 320 MB/s; 3 consumer groups out 480 MB/s → ~1 GB/s cluster-wide (compressed ≈ 250 MB/s), so 6 brokers at 1 GB/s NIC each have plenty of headroom. Monitor under-replicated partitions, consumer lag per group, and request latency p99.</p>`,
        complexity: `<p>Ingest 160 MB/s, ~31 TB compressed storage (3 days, RF=3), 120 partitions, 6 brokers to start; scales linearly by adding brokers and reassigning partitions.</p>`,
        followUps: ['What breaks if you later need 200 partitions?', 'When would you choose RF=2?', 'How does tiered storage change the broker count?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 3 — Consumer groups, offsets, rebalancing
     ===================================================================== */
  topics.push({
    title: 'Consumer Groups, Offsets, Lag & Rebalancing',
    analogy: `<p>A team of <b>librarians</b> is reading a set of diaries (partitions) to type them up. The rule: <b>one diary is read by only one librarian at a time</b>, so lines are never mixed up. Each librarian puts a <b>bookmark</b> (committed offset) in the diary after typing a few pages. If a librarian goes home sick, the head librarian <b>re-deals the diaries</b> (rebalance). The new reader opens at the bookmark — and may re-type a page or two that the sick one typed but had not bookmarked yet.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> A <b>consumer group</b> is a set of consumer processes that share the work of reading a topic. Kafka gives each partition to <b>exactly one</b> member of the group. Different groups are completely independent — each has its own bookmarks.</p>
${H.table(['Partitions', 'Consumers in group', 'Result'], [
  ['6', '1', 'one consumer reads all 6'],
  ['6', '3', 'each reads 2'],
  ['6', '6', 'each reads 1 — maximum parallelism'],
  ['6', '8', '<span class="c-r">2 consumers sit idle</span> — partitions cap parallelism']
])}
<p><b>Offsets.</b> Each record has an offset in its partition. A consumer <b>commits</b> "I have processed up to here" — technically it commits the <b>next</b> offset to read. Commits are stored in the internal compacted topic <code>__consumer_offsets</code>, keyed by (group, topic, partition).</p>
<p><b>Lag</b> = log end offset − committed offset. It is the single most important health metric: lag growing = consumers are falling behind.</p>
${H.table(['Partition', 'log end', 'committed', 'lag'], [['P0', '1,050', '1,040', '10'], ['P1', '980', '980', '0'], ['P2', '2,300', '1,100', '<span class="c-r">1,200</span>']])}
<p>🔵 <b>How it really works.</b> One broker acts as the <b>group coordinator</b>. Members send <b>heartbeats</b>. If a member stops heartbeating for <code>session.timeout.ms</code> (default 45 s), or does not call <code>poll()</code> within <code>max.poll.interval.ms</code> (default 5 min), the coordinator removes it and triggers a <b>rebalance</b>: partitions are re-assigned among the survivors. The new owner resumes from the last <b>committed</b> offset, so anything processed but not committed is <b>processed again</b>.</p>
<p><b>Where to start when there is no commit yet?</b> <code>auto.offset.reset=earliest</code> (read history) or <code>latest</code> (only new data, the default).</p>
<p><b>Commit styles:</b></p>
<ul>
<li><b>Auto commit</b> (<code>enable.auto.commit=true</code>, every 5 s by default) — easy, but can commit offsets for records you have not finished (loss on crash) or re-deliver ones you did finish.</li>
<li><b>Manual commit after processing</b> (<code>commitSync</code>/<code>commitAsync</code>) — the standard for at-least-once.</li>
<li><b>Commit with the result</b> — store the offset in the same DB transaction as your output (or use Kafka transactions) for effectively-once.</li>
</ul>`,
    clues: [
      '"scale consumers horizontally" → add members to the group, up to the partition count',
      '"consumer is falling behind" / "messages delayed by minutes" → consumer lag metric',
      '"after a deploy we saw duplicates" → rebalance + uncommitted offsets → reprocessing',
      '"two services both need every event" → two different consumer groups',
      '"reprocess yesterday\'s data after a bug fix" → reset the group\'s offsets (by timestamp) and replay',
      '"long-running processing per message (minutes)" → watch max.poll.interval.ms or hand off work'
    ],
    viz: [{
      title: 'Consumer group: offsets advance, a consumer dies, the group rebalances',
      input: '4 3 C2',
      inputLabel: 'partitions consumers failingConsumer (e.g. 4 3 C2; partitions 2-6, consumers 2-4)',
      gen: function (input) {
        var t = String(input || '').trim().split(/\s+/);
        var P = Number(t[0]), C = Number(t[1]), fail = String(t[2] || 'C2').toUpperCase();
        if (!(P >= 2 && P <= 6) || !(C >= 2 && C <= 4)) throw new Error('Format: "4 3 C2" — 2-6 partitions, 2-4 consumers, and the consumer that fails');
        var fIdx = Number(fail.replace('C', '')) - 1;
        if (!(fIdx >= 0 && fIdx < C)) throw new Error('Failing consumer must be one of C1..C' + C);
        var W = 8, frames = [];
        var members = range(C, function (i) { return 'C' + (i + 1); });
        function assign(mem) { var a = []; for (var p = 0; p < P; p++) a.push(mem[p % mem.length]); return a; }
        var owner = assign(members);
        var committed = range(P, function () { return 0; }), read = range(P, function () { return 0; });
        function grid(extra) {
          var rows = range(P, function (p) { return range(W, function (o) { return 'm' + o; }); });
          var hl = {};
          for (var p = 0; p < P; p++) for (var o = 0; o < W; o++) {
            if (o < committed[p]) hl[p + ',' + o] = 'done';
            else if (o < read[p]) hl[p + ',' + o] = 'cur';
          }
          if (extra) for (var k in extra) hl[k] = extra[k];
          return GRID('Partitions (faded = committed, amber = read but NOT committed yet)', rows, range(P, function (p) { return 'P' + p + ' → ' + (owner[p] || 'none'); }), range(W, function (o) { return 'off ' + o; }), hl);
        }
        function tbl(hlRows) { return TABLE('Group "billing" state', ['partition', 'owner', 'committed offset', 'lag'], range(P, function (p) { return ['P' + p, owner[p] || '—', committed[p], W - committed[p]]; }), hlRows || {}); }
        var idle = C > P ? members.slice(P) : [];
        frames.push(F('Group <b>billing</b> has ' + C + ' consumers and the topic has ' + P + ' partitions. The coordinator deals partitions out; each partition goes to exactly <b>one</b> member.' + (idle.length ? ' ' + idle.join(', ') + ' get nothing and sit idle.' : ''), [grid(), tbl()]));
        for (var p = 0; p < P; p++) read[p] = 2;
        frames.push(F('Every consumer polls a batch of 2 records from each of its partitions and processes them (amber). Not committed yet — if a consumer died right now, these would be re-read.', [grid(), tbl()]));
        for (p = 0; p < P; p++) committed[p] = 2;
        frames.push(F('Processing done → each consumer <b>commits offset 2</b> ("next record I need is offset 2"). Commits go to <code>__consumer_offsets</code>. Lag drops by 2 everywhere.', [grid(), tbl(range(P, function () { return 'ok'; }).reduce(function (a, v, k) { a[k] = v; return a; }, {}))]));
        for (p = 0; p < P; p++) read[p] = 4;
        for (p = 0; p < P; p++) if (owner[p] !== fail) committed[p] = 4;
        var mine = []; for (p = 0; p < P; p++) if (owner[p] === fail) mine.push(p);
        var ex = {}; mine.forEach(function (q) { ex[q + ',2'] = 'bad'; ex[q + ',3'] = 'bad'; });
        var rowHl = {}; mine.forEach(function (q) { rowHl[q] = 'bad'; });
        frames.push(F('Next batch: offsets 2–3. Healthy consumers process and commit 4. <b>' + fail + '</b> processes offsets 2–3 of ' + (mine.length ? mine.map(function (q) { return 'P' + q; }).join(', ') : 'nothing') + ' (e.g. it already charged those customers) and then <span class="c-r">crashes before committing</span>.', [grid(ex), tbl(rowHl)]));
        frames.push(F('The coordinator stops getting heartbeats from <b>' + fail + '</b>. After <code>session.timeout.ms</code> (45 s default) it declares it dead and starts a <b>rebalance</b>.', [grid(ex), tbl(rowHl), VARS('Coordinator', { member: fail, heartbeat: 'missed', action: 'rebalance' }, { action: 'bad' })]));
        var survivors = members.filter(function (m) { return m !== fail; });
        var oldOwner = owner.slice();
        owner = assign(survivors);
        var moved = {}; for (p = 0; p < P; p++) if (owner[p] !== oldOwner[p]) moved[p] = 'cur';
        for (p = 0; p < P; p++) read[p] = committed[p];
        frames.push(F('Rebalance: partitions are re-dealt among ' + survivors.join(', ') + '. Moved partitions are highlighted. With the cooperative-sticky assignor only the orphaned partitions move; the eager (old) protocol made <b>everyone</b> stop and give back all partitions.', [grid(), tbl(moved)]));
        if (mine.length) {
          var ex2 = {}; mine.forEach(function (q) { ex2[q + ',2'] = 'bad'; ex2[q + ',3'] = 'bad'; read[q] = 4; });
          frames.push(F('The new owner of ' + mine.map(function (q) { return 'P' + q; }).join(', ') + ' starts at the <b>committed</b> offset 2, so offsets 2–3 are processed <span class="c-r">a second time</span>. This is why Kafka consumers are <b>at-least-once</b> by default and must be <b>idempotent</b>.', [grid(ex2), tbl((function () { var h = {}; mine.forEach(function (q) { h[q] = 'bad'; }); return h; })())]));
        }
        for (p = 0; p < P; p++) { read[p] = W; committed[p] = W; }
        frames.push(F('The survivors drain the rest and commit offset ' + W + '. Lag is 0 everywhere. When ' + fail + ' (or a replacement pod) rejoins, another rebalance gives it partitions again.', [grid(), tbl(range(P, function () { return 'ok'; }).reduce(function (a, v, k) { a[k] = v; return a; }, {}))]));
        return frames;
      }
    }, {
      title: 'Two consumer groups read the same topic independently',
      gen: function () {
        var frames = [], le = 10;
        var nodes = [B('T', 'Topic orders (P0)', 15, 30), B('GA', 'Group: billing', 60, 12), B('GB', 'Group: analytics', 60, 48), B('DB', 'Payments DB', 92, 12), B('DW', 'Warehouse', 92, 48)];
        var edges = [['T', 'GA', 'poll'], ['T', 'GB', 'poll'], ['GA', 'DB'], ['GB', 'DW']];
        function arr(a, b) { return { type: 'array', label: 'P0 log (A = billing offset, B = analytics offset)', values: range(le, function (i) { return 'm' + i; }), ptr: (function () { var o = {}; if (a === b) o[a] = ['A', 'B']; else { o[a] = 'A'; o[b] = 'B'; } return o; })(), hl: (function () { var h = {}; for (var i = 0; i < Math.min(a, b); i++) h[i] = 'done'; return h; })() }; }
        frames.push(F('One topic, two groups. Each group has its <b>own</b> committed offset for P0. Both start at 0.', [G('Groups', nodes, edges), arr(0, 0)]));
        frames.push(F('Billing is fast: it reads and commits up to offset 7. Analytics loads in big hourly batches and is still at 2. Neither affects the other — the log is not deleted when someone reads it.', [G('Groups', nodes, edges, { hl: { GA: 'ok' }, ehl: { 'T-GA': 'ok' } }), arr(7, 2), TABLE('Lag', ['group', 'committed', 'lag'], [['billing', 7, 3], ['analytics', 2, 8]], { 1: 'cur' })]));
        frames.push(F('Analytics catches up in one big batch to offset 9. Billing reaches 9 too. The data stays on disk until retention (7 days) expires, regardless of who read it.', [G('Groups', nodes, edges, { hl: { GA: 'ok', GB: 'ok' } }), arr(9, 9), TABLE('Lag', ['group', 'committed', 'lag'], [['billing', 9, 1], ['analytics', 9, 1]])]));
        frames.push(F('A bug in analytics corrupted yesterday\'s numbers. Ops runs <code>kafka-consumer-groups --reset-offsets --to-datetime …</code> for <b>analytics only</b> → back to offset 3. It replays m3…m9 while billing is untouched. Replay is a superpower of a log.', [G('Groups', nodes, edges, { hl: { GB: 'cur' }, tags: { GB: 'replaying' } }), arr(9, 3), TABLE('Lag', ['group', 'committed', 'lag'], [['billing', 9, 1], ['analytics', 3, 7]], { 1: 'cur' })]));
        return frames;
      }
    }],
    code: [{ lang: 'java', check: false, title: 'Kafka consumer: manual commit after processing (at-least-once)', code: `Properties props = new Properties();
props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, "kafka:9092");
props.put(ConsumerConfig.GROUP_ID_CONFIG, "billing");                  // same group = share the work
props.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, "false");          // we decide when to commit
props.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");        // no commit yet? start at the beginning
props.put(ConsumerConfig.MAX_POLL_RECORDS_CONFIG, "200");              // small batches = finish within max.poll.interval.ms
props.put(ConsumerConfig.GROUP_PROTOCOL_CONFIG, "consumer");           // KIP-848 next-gen rebalance protocol (Kafka 4.x)
props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class.getName());
props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class.getName());

try (KafkaConsumer<String, String> consumer = new KafkaConsumer<>(props)) {
    consumer.subscribe(List.of("orders"), new ConsumerRebalanceListener() {
        public void onPartitionsRevoked(Collection<TopicPartition> parts) {
            consumer.commitSync();           // flush progress before losing the partitions
        }
        public void onPartitionsAssigned(Collection<TopicPartition> parts) { }
    });
    while (running) {
        ConsumerRecords<String, String> batch = consumer.poll(Duration.ofMillis(500));
        for (ConsumerRecord<String, String> r : batch) {
            billing.handle(r.key(), r.value());   // must be idempotent: may run twice after a crash
        }
        if (!batch.isEmpty()) consumer.commitSync();   // commit AFTER the work is done
    }
}` }],
    codeTitle: ['Java consumer loop (Kafka client, not compiled here)'],
    examples: [
      { title: 'Computing lag by hand', html: `<p>Partition P2: log end offset 5,400, committed 4,100 → lag <b>1,300</b>. Consumers process 200/s and producers add 150/s to P2, so net drain is 50/s → <b>26 s</b> to catch up. If producers add 250/s, lag grows by 50/s forever — you need more consumers (up to the partition count) or faster processing.</p>${H.table(['', 'value'], [['lag', '1,300'], ['drain rate', '200 − 150 = 50/s'], ['time to zero', '1,300 / 50 = 26 s']])}` },
      { title: 'More consumers than partitions', html: `<p>Topic with 4 partitions, Kubernetes HPA scales the consumer deployment to 10 pods. Only 4 pods get partitions; 6 are idle but still cost money and still trigger rebalances on every scale event. Fix: cap replicas at the partition count, or plan more partitions up front. (Share groups in Kafka 4.x relax this for queue-style workloads, at the cost of per-key ordering.)</p>` },
      { title: 'Rebalance storm during deploys', html: `<p>A rolling deploy of 30 consumer pods with the old eager protocol caused 30 stop-the-world rebalances — every member paused each time, and lag spiked for minutes. Fixes: <b>cooperative-sticky</b> assignment (only moved partitions pause), <b>static membership</b> (<code>group.instance.id</code> so a quick restart within session timeout keeps its partitions), and the KIP-848 consumer protocol (GA in Kafka 4.0) where the broker computes assignments incrementally.</p>` },
      { title: 'Slow processing kicks a consumer out', html: `<p>A consumer polls 500 records and each needs a 1 s call to an LLM API → 500 s, over the 300 s <code>max.poll.interval.ms</code>. The coordinator assumes it is stuck, rebalances, and another consumer re-processes the same 500 — forever. Fixes: lower <code>max.poll.records</code>, process in parallel inside the consumer (keyed thread pool), or hand off to a work queue / share group.</p>` }
    ],
    deepDive: `<p>🟣 <b>Assignment strategies.</b> <i>Range</i> (per topic, contiguous ranges — can be uneven), <i>RoundRobin</i>, <i>Sticky</i> (keep previous owners), <i>CooperativeSticky</i> (incremental: revoke only what moves). With the KIP-848 protocol (<code>group.protocol=consumer</code>, GA since Kafka 4.0 and opt-in for the classic Java consumer) the <b>broker-side</b> coordinator computes target assignments and members reconcile one partition at a time — no global sync barrier.</p>
<p><b>Commit semantics in detail.</b> Committing offset N means "all records &lt; N are done". Commits are per partition, so the consumer must commit the max contiguous processed offset. If you process records in parallel threads, you must track completion and only commit the lowest unfinished offset (libraries like Confluent's Parallel Consumer do this, with per-key ordering).</p>
<p><b>Static membership</b> (<code>group.instance.id</code>): the member keeps its identity across restarts, so a pod bouncing within <code>session.timeout.ms</code> does not cause a rebalance at all.</p>
<p><b>Offset retention.</b> Committed offsets for an empty group expire after <code>offsets.retention.minutes</code> (7 days). A consumer that was off for two weeks will fall back to <code>auto.offset.reset</code> — possibly skipping everything (<code>latest</code>) or replaying everything (<code>earliest</code>). Know which one your service needs.</p>
<p><b>Lag monitoring.</b> Lag in <b>records</b> is misleading across topics; lag in <b>time</b> ("the oldest unprocessed record is 4 minutes old") maps directly to user impact and SLOs. Tools: Burrow, kafka-lag-exporter, Confluent/MSK metrics; autoscalers like KEDA scale consumers on lag.</p>
<p><b>Consumer-side ordering trap.</b> Kafka keeps order within a partition, but if your consumer hands records to an unordered thread pool, you lose it. Parallelise <b>by key</b> (hash key → thread) to keep per-key order.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> consumers that call LLMs are slow and bursty, which breaks classic assumptions (a "fast" consumer handling 10k msgs/s vs an LLM consumer doing 5/s per instance). Teams now autoscale consumers on lag with KEDA, tune <code>max.poll.records</code> small, and use share groups or work queues for embarrassingly parallel AI jobs. AIOps tools watch lag and rebalance rates and open incidents automatically.</p>
<p><b>Use AI as a partner:</b> paste <code>kafka-consumer-groups --describe</code> output and ask <code>which partitions are lagging, which consumer owns them, and is the lag growing?</code> Ask it to write a lag-based KEDA ScaledObject — then cap maxReplicas at the partition count yourself.</p>
<p><b>Where AI goes wrong:</b> it often suggests <code>enable.auto.commit=true</code> together with "exactly once", forgets that commits mean "next offset", sets <code>max.poll.interval.ms</code> to hours to hide slow processing (which delays failure detection), and scales consumers beyond partitions.</p>
<p><b>What you must still own:</b> the reasoning "crash after processing, before commit → duplicate", choosing when to commit, sizing the group to the partitions, and reading lag as a user-facing delay.</p>`,
    problems: [{
      title: 'Duplicates after every deploy',
      level: 'Medium',
      tags: ['consumer groups', 'rebalance', 'offsets'],
      companies: ['Stripe', 'Uber', 'DoorDash'],
      statement: `<p>A <code>loyalty-points</code> consumer group (20 pods, topic with 40 partitions) awards points for each purchase event. After every rolling deploy, some customers get points twice, and lag spikes for ~10 minutes. Consumers use auto-commit every 5 s and process 500-record batches. Explain why and fix it.</p>`,
      constraints: `<p>Deploys happen 10×/day. Points must never be double-awarded. Lag SLO: oldest unprocessed event under 30 s.</p>`,
      example: `<p>Pod C7 processes offsets 1,000–1,499 of P13 (points awarded) at t=3 s; auto-commit last ran at t=0 (committed 1,000). Pod is killed at t=4 s. New owner starts at <span class="c-r">1,000</span> → 500 purchases awarded <span class="c-r">again</span>.</p>`,
      brute: { why: `<p><b>Naive fixes that fail:</b> "commit before processing" turns duplicates into <b>lost</b> points on a crash. "Commit after every record" multiplies commit traffic by 500× and still leaves a window between the DB write and the commit. "Lower auto-commit interval" shrinks the window but never closes it. Only idempotent processing removes duplicates.</p>` },
      mcq: { q: 'What really closes the duplicate window?', options: ['Shorter auto.commit.interval.ms', 'Committing before processing', 'Making the side effect idempotent (dedupe by event id) or storing the offset in the same transaction as the side effect', 'Adding more partitions'], answer: 2, explain: 'Any gap between "side effect done" and "offset committed" can be hit by a crash; idempotency or atomic commit closes it.' },
      hints: [`<p>Hint 1: Draw the timeline: process → (crash here?) → commit. Which crash points lead to duplicates and which to loss?</p>`, `<p>Hint 2: Make awarding points idempotent: a unique <code>purchase_id</code> in a <code>points_ledger</code> table; insert-if-absent.</p>`, `<p>Hint 3: For the lag spikes: cooperative-sticky / KIP-848 protocol, static membership (<code>group.instance.id</code>), commit in <code>onPartitionsRevoked</code>, graceful shutdown (stop polling, finish batch, commit, close).</p>`],
      solution: {
        approach: `<p><b>Root cause:</b> at-least-once delivery + auto-commit window + rebalances on each pod restart. Any records processed after the last commit are redelivered to the new owner.</p>
<p><b>Fix correctness:</b> (1) Disable auto-commit; commit after the batch is processed. (2) Make the effect idempotent: <code>INSERT INTO points_ledger(purchase_id, customer_id, points) … ON CONFLICT (purchase_id) DO NOTHING</code>, and compute balances from the ledger (or update balance only when the insert succeeded, in the same transaction). Optionally store the Kafka offset in the same transaction (<code>consumer_offsets(group, partition, offset)</code>) and seek to it on assignment — then the DB is the source of truth.</p>
<p><b>Fix lag spikes:</b> use the KIP-848 consumer protocol or CooperativeStickyAssignor; set <code>group.instance.id</code> to the pod name (StatefulSet) so restarts within the session timeout do not rebalance; on SIGTERM stop polling, finish the in-flight batch, <code>commitSync</code>, then <code>close()</code> (which leaves the group cleanly); reduce <code>max.poll.records</code> so a batch finishes quickly. Alert on time-based lag &gt; 30 s.</p>`,
        complexity: `<p>One extra unique-index lookup per event (≈ sub-ms on an indexed table). Rebalances drop from 20 full stop-the-world pauses per deploy to a few incremental partition moves.</p>`,
        followUps: ['What if the side effect is an external API (send SMS) that has no dedupe key?', 'How would you parallelise within a pod without breaking per-customer order?', 'How do you replay a day of purchases after fixing a points bug?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 4 — Delivery guarantees & idempotent consumers
     ===================================================================== */
  topics.push({
    title: 'Delivery Guarantees: At-Most-Once, At-Least-Once, Exactly-Once & Idempotent Consumers',
    analogy: `<p>You ask a courier to deliver a cheque. <b>At-most-once</b>: he tries once; if the door is shut, he throws it away — never two cheques, but maybe none. <b>At-least-once</b>: he keeps trying until someone signs; if the signature slip blows away, he comes back with <b>another</b> copy — the cheque always arrives, maybe twice. <b>Exactly-once</b>: the bank writes the cheque number in a ledger and refuses to cash the same number twice — the courier can come back ten times, the money moves once. Real systems get "exactly-once" by being <b>at-least-once + a ledger that ignores repeats</b>.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> Networks lose acknowledgements and processes crash at awkward moments. A consumer always does two things — <b>do the work</b> and <b>record progress</b> (commit/ack) — and a crash can land between them. The <b>order</b> you do them in decides the guarantee:</p>
${H.table(['Guarantee', 'Order of steps', 'Crash in the middle causes', 'Use for'], [
  ['<b>At-most-once</b>', 'commit → process', '<span class="c-r">message lost</span>', 'metrics, logs, sensor pings where a gap is OK'],
  ['<b>At-least-once</b>', 'process → commit', '<span class="c-y">message processed twice</span>', 'the default for almost everything'],
  ['<b>Exactly-once (effectively-once)</b>', 'process + record progress <b>atomically</b>, or dedupe', 'nothing visible', 'payments, balances, inventory, counters']
])}
<p>🔵 <b>The practical recipe = at-least-once delivery + idempotent processing.</b> <i>Idempotent</i> means "doing it twice has the same effect as doing it once". Ways to get it:</p>
<ul>
<li><b>Natural idempotency</b>: <code>SET status = 'SHIPPED'</code> is safe to repeat; <code>balance = balance + 100</code> is not.</li>
<li><b>Dedupe table</b>: every message carries a unique <code>eventId</code>. In <b>the same DB transaction</b> as the side effect, insert the id into <code>processed_events</code> with a UNIQUE constraint. Duplicate → insert fails → skip.</li>
<li><b>Upsert with version</b>: <code>UPDATE … WHERE version &lt; :incomingVersion</code> — old or repeated events change nothing.</li>
<li><b>Idempotency key to external APIs</b>: Stripe, Adyen and most payment APIs accept an <code>Idempotency-Key</code> header; reuse the eventId.</li>
<li><b>Store the offset with the result</b>: write output + <code>(partition, offset)</code> in one transaction; on restart, seek to the stored offset.</li>
</ul>
<p><b>Inside Kafka</b> there are two real exactly-once tools:</p>
${H.table(['Feature', 'What it guarantees'], [
  ['<b>Idempotent producer</b> (default since 3.0)', 'A retried batch is not written twice: the broker tracks (producerId, partition, sequence number) and drops repeats.'],
  ['<b>Transactions</b> (<code>transactional.id</code>)', 'Consume → process → produce to other topics + commit input offsets as <b>one atomic unit</b>. Readers with <code>isolation.level=read_committed</code> never see aborted output. Kafka Streams turns this on with <code>processing.guarantee=exactly_once_v2</code>.']
])}
<p>But Kafka transactions only cover <b>Kafka-to-Kafka</b>. The moment you call an external system (DB, email, payment API), you are back to at-least-once and need idempotency there. "Exactly-once delivery" over a network is impossible in general (Two Generals problem); <b>exactly-once processing effects</b> is what we build.</p>`,
    clues: [
      '"never charge a customer twice" / "no double-counting" → idempotent consumer + dedupe key, not "exactly-once delivery"',
      '"it\'s OK to lose a few" (metrics, telemetry) → at-most-once, cheapest',
      '"no message may be lost" → at-least-once: process then commit, acks=all',
      '"read from Kafka, transform, write back to Kafka atomically" → Kafka transactions / Kafka Streams exactly_once_v2',
      '"retries cause duplicates" → idempotent producer + idempotency keys end to end',
      '"the same webhook arrives multiple times" → dedupe on the provider\'s event id'
    ],
    viz: [{
      title: 'Crash between "work" and "commit": lost, duplicated, or deduped',
      input: 'at-least-once',
      inputLabel: 'mode: at-most-once | at-least-once | effectively-once',
      gen: function (input) {
        var mode = String(input || '').trim().toLowerCase();
        if (['at-most-once', 'at-least-once', 'effectively-once'].indexOf(mode) < 0) throw new Error('Type one of: at-most-once, at-least-once, effectively-once');
        var frames = [];
        var codes = {
          'at-most-once': 'records = consumer.poll()\nconsumer.commit(offset + 1)   // progress first\ncharge(record)                // then the work',
          'at-least-once': 'records = consumer.poll()\ncharge(record)                // work first\nconsumer.commit(offset + 1)   // then progress',
          'effectively-once': 'records = consumer.poll()\nBEGIN TRANSACTION\nif insert processed(event_id) succeeds: charge(record)\nCOMMIT                        // effect + dedupe row together\nconsumer.commit(offset + 1)'
        };
        var code = codes[mode];
        var charges = [], processed = [], committed = 5;
        function parts(hlLine, extra) {
          var p = [CODE('Consumer loop (' + mode + ')', 'text', code, hlLine), { type: 'array', label: 'Partition P0', values: ['m3', 'm4', 'm5', 'm6'], start: 3, idx: true, showIdx: true, idxLabels: ['3', '4', '5', '6'], ptr: (function () { var o = {}; o[committed - 3] = 'committed'; return o; })(), hl: { 2: 'cur' } }, TABLE('Card charges for order A (₹500)', ['#', 'charge'], charges.map(function (c, i) { return [i + 1, c]; }), charges.length > 1 ? { 1: 'bad' } : {}), VARS('State', { 'committed offset': committed, mode: mode })];
          if (mode === 'effectively-once') p.push(SET('processed_events (UNIQUE)', processed, extra || {}));
          return p;
        }
        frames.push(F('Message <b>m5</b> at offset 5 says "charge order A ₹500". Committed offset is 5, so m5 is next. Watch where the crash lands in <b>' + mode + '</b> mode.', parts({ 1: 'cur' })));
        if (mode === 'at-most-once') {
          committed = 6;
          frames.push(F('Line 2: commit offset 6 <b>before</b> doing the work. Kafka now believes m5 is finished.', parts({ 2: 'ok' })));
          frames.push(F('<span class="c-r">Crash!</span> The pod is OOM-killed before line 3 runs. No charge happened.', parts({ 3: 'bad' })));
          frames.push(F('Restart → the consumer resumes at committed offset <b>6</b>. m5 is skipped forever.', parts({ 1: 'cur' })));
          frames.push(F('Result: <span class="c-r">order A was never charged — message LOST</span>. At-most-once never duplicates but can drop. Fine for click metrics, terrible for money.', parts({}).concat([TXT('<b>Outcome:</b> 0 charges (should be 1)')])));
        } else if (mode === 'at-least-once') {
          charges.push('₹500 ✔');
          frames.push(F('Line 2: charge the card first. The payment provider says OK.', parts({ 2: 'ok' })));
          frames.push(F('<span class="c-r">Crash!</span> The pod dies before line 3, so offset 6 is <b>not</b> committed. Kafka still thinks m5 is unprocessed.', parts({ 3: 'bad' })));
          frames.push(F('Restart (or rebalance to another consumer) → resume at committed offset <b>5</b> → m5 is delivered <b>again</b>.', parts({ 1: 'cur' })));
          charges.push('₹500 ✔ (again!)');
          committed = 6;
          frames.push(F('Line 2 runs again: <span class="c-r">second charge</span>. Then commit 6. Nothing was lost — but the customer paid twice. At-least-once is safe only if the work is <b>idempotent</b>.', parts({ 2: 'bad', 3: 'ok' })));
          frames.push(F('Result: <span class="c-y">duplicate</span>. Fix: switch to effectively-once (try typing <b>effectively-once</b> in the input box).', parts({}).concat([TXT('<b>Outcome:</b> 2 charges (should be 1)')])));
        } else {
          frames.push(F('Line 2: open a database transaction.', parts({ 2: 'cur' })));
          processed.push('evt-A-500');
          charges.push('₹500 ✔');
          frames.push(F('Line 3: insert <b>evt-A-500</b> into <code>processed_events</code> (UNIQUE). It is new, so the insert succeeds and we charge (using the event id as the payment API\'s Idempotency-Key).', parts({ 3: 'ok' }, { 'evt-A-500': 'ok' })));
          frames.push(F('Line 4: COMMIT. The dedupe row and the charge record are now durable <b>together</b> — either both exist or neither.', parts({ 4: 'ok' }, { 'evt-A-500': 'ok' })));
          frames.push(F('<span class="c-r">Crash!</span> before line 5. Kafka offset is still 5.', parts({ 5: 'bad' })));
          frames.push(F('Restart → m5 is delivered again (at-least-once delivery has not changed).', parts({ 1: 'cur' })));
          committed = 6;
          frames.push(F('Line 3: insert evt-A-500 <span class="c-r">fails — duplicate key</span>. We skip the charge, then commit offset 6. The duplicate delivery had <b>no effect</b>.', parts({ 3: 'bad', 5: 'ok' }, { 'evt-A-500': 'bad' })));
          frames.push(F('Result: <span class="c-g">exactly one charge</span>. This is "exactly-once" in practice: at-least-once delivery + idempotent processing.', parts({}).concat([TXT('<b>Outcome:</b> 1 charge (correct)')])));
        }
        return frames;
      }
    }, {
      title: 'Idempotent producer: a retried batch is not written twice',
      gen: function () {
        var frames = [];
        var nodes = [B('PR', 'Producer pid=42', 12, 30), B('BR', 'Leader broker', 60, 30), B('LOG', 'Partition log', 92, 30)];
        var edges = [['PR', 'BR', 'batch'], ['BR', 'LOG', 'append'], ['BR', 'PR', 'ack']];
        function log(v, hl) { return { type: 'array', label: 'orders-0', values: v, hl: hl || {} }; }
        frames.push(F('With <code>enable.idempotence=true</code> (default since Kafka 3.0) the broker gives the producer an id (pid=42) and the producer numbers every batch per partition: seq 0, 1, 2…', [G('Producer → broker', nodes, edges), log(['a', 'b']), VARS('Broker remembers', { 'pid 42 last seq': -1 })]));
        frames.push(F('Producer sends batch <b>seq=0</b> (record c). Broker appends it and records "pid 42, last seq 0".', [G('Producer → broker', nodes, edges, { ehl: { 'PR-BR': 'cur', 'BR-LOG': 'ok' } }), log(['a', 'b', 'c'], { 2: 'ok' }), VARS('Broker remembers', { 'pid 42 last seq': 0 }, { 'pid 42 last seq': 'ok' })]));
        frames.push(F('The <span class="c-r">ack is lost</span> on the network. The producer times out and does what it must: <b>retry</b> the same batch seq=0.', [G('Producer → broker', nodes, edges, { ehl: { 'BR-PR': 'bad' }, tags: { PR: 'timeout' } }), log(['a', 'b', 'c']), VARS('Broker remembers', { 'pid 42 last seq': 0 })]));
        frames.push(F('Broker sees seq=0 again ≤ last seq 0 → <b>duplicate</b>. It does <b>not</b> append, but replies "success" so the producer moves on. Without idempotence the log would now hold c twice.', [G('Producer → broker', nodes, edges, { ehl: { 'PR-BR': 'cur', 'BR-PR': 'ok' }, hl: { BR: 'sel' } }), log(['a', 'b', 'c']), VARS('Broker remembers', { 'pid 42 last seq': 0, 'retry seq 0': 'dropped' }, { 'retry seq 0': 'bad' })]));
        frames.push(F('Next batch <b>seq=1</b> (record d) appends normally. Note: this only protects one producer session writing into Kafka. A <b>restarted app</b> that re-sends the same business event gets a new pid — that still needs an event id and consumer-side dedupe.', [G('Producer → broker', nodes, edges, { ehl: { 'BR-LOG': 'ok' } }), log(['a', 'b', 'c', 'd'], { 3: 'ok' }), VARS('Broker remembers', { 'pid 42 last seq': 1 })]));
        return frames;
      }
    }],
    code: [{ lang: 'java', title: 'Idempotent consumer core (plain Java, compiles and runs)', code: `import java.util.*;

/** A message as delivered by Kafka/SQS. eventId is set by the PRODUCER and never changes on retry. */
record Message(String eventId, String orderId, long amountCents, int partition, long offset) {}

/**
 * Stand-in for a relational DB. In production, applyOnce() is ONE SQL transaction:
 *   INSERT INTO processed_events(event_id) VALUES (?) ON CONFLICT DO NOTHING;   -- 0 rows => duplicate
 *   INSERT INTO charges(order_id, amount) VALUES (?, ?);
 *   UPDATE consumer_offsets SET next_offset = ? WHERE grp = ? AND part = ?;
 *   COMMIT;
 */
class PaymentsDb {
    private final Set<String> processedEventIds = new HashSet<>();    // UNIQUE constraint
    private final Map<String, Long> chargedByOrder = new HashMap<>();
    private final Map<Integer, Long> nextOffsetByPartition = new HashMap<>();

    /** Returns true if the effect was applied now, false if this event was already applied. */
    synchronized boolean applyOnce(Message m) {
        if (!processedEventIds.add(m.eventId())) {
            return false;                                              // duplicate delivery -> no effect
        }
        chargedByOrder.merge(m.orderId(), m.amountCents(), Long::sum); // the real side effect
        nextOffsetByPartition.put(m.partition(), m.offset() + 1);     // progress stored WITH the effect
        return true;
    }

    synchronized long charged(String orderId) { return chargedByOrder.getOrDefault(orderId, 0L); }
    synchronized long resumeOffset(int partition) { return nextOffsetByPartition.getOrDefault(partition, 0L); }
}

public class IdempotentConsumerDemo {
    public static void main(String[] args) {
        PaymentsDb db = new PaymentsDb();
        List<Message> partition0 = List.of(
            new Message("evt-1", "A", 50_000, 0, 0),
            new Message("evt-2", "B", 12_000, 0, 1),
            new Message("evt-3", "A", 7_500, 0, 2));

        // First run: process offsets 0..1, then "crash" before the broker-side commit.
        for (int i = 0; i < 2; i++) handle(db, partition0.get(i));
        System.out.println("-- crash! broker still thinks committed offset = 0 --");

        // Redelivery from the broker's committed offset 0: evt-1 and evt-2 come again.
        for (Message m : partition0) handle(db, m);

        System.out.println("Order A charged (cents): " + db.charged("A"));   // 57500, not 107500
        System.out.println("Order B charged (cents): " + db.charged("B"));   // 12000, not 24000
        System.out.println("Resume P0 at offset: " + db.resumeOffset(0));    // 3
    }

    static void handle(PaymentsDb db, Message m) {
        boolean applied = db.applyOnce(m);
        System.out.println((applied ? "APPLIED   " : "DUPLICATE ") + m.eventId() + " @offset " + m.offset());
    }
}` }, { lang: 'python', run: true, title: 'Same idea in Python (runnable)', code: `# At-least-once delivery + idempotent consumer = effectively-once effects.
from dataclasses import dataclass

@dataclass(frozen=True)
class Message:
    event_id: str      # assigned once by the producer; identical on every redelivery
    order_id: str
    amount: int
    offset: int

class Db:
    """In real life: one SQL transaction with a UNIQUE(event_id) constraint."""
    def __init__(self):
        self.processed = set()
        self.charges = {}

    def apply_once(self, m: Message) -> bool:
        if m.event_id in self.processed:     # unique-constraint violation -> duplicate
            return False
        self.processed.add(m.event_id)       # dedupe row ...
        self.charges[m.order_id] = self.charges.get(m.order_id, 0) + m.amount  # ... and effect, together
        return True

log = [Message("evt-1", "A", 500, 0), Message("evt-2", "B", 120, 1), Message("evt-3", "A", 75, 2)]
db = Db()

# First attempt processes offsets 0 and 1, then crashes before committing.
for m in log[:2]:
    print("APPLIED " if db.apply_once(m) else "DUP     ", m.event_id)
print("-- crash before commit; broker redelivers from offset 0 --")
for m in log:
    print("APPLIED " if db.apply_once(m) else "DUP     ", m.event_id)

print("charges:", db.charges)    # {'A': 575, 'B': 120} -- each event counted exactly once
assert db.charges == {"A": 575, "B": 120}` }, { lang: 'java', check: false, title: 'Kafka transactions: consume → produce → commit offsets atomically', code: `// Exactly-once INSIDE Kafka (read-process-write). Output and input offsets commit together.
producerProps.put(ProducerConfig.TRANSACTIONAL_ID_CONFIG, "order-enricher-1"); // stable per instance
producerProps.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, "true");
consumerProps.put(ConsumerConfig.ISOLATION_LEVEL_CONFIG, "read_committed");   // skip aborted data
consumerProps.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, "false");

KafkaProducer<String, String> producer = new KafkaProducer<>(producerProps);
producer.initTransactions();                          // fences older "zombie" instances with the same id

while (running) {
    ConsumerRecords<String, String> recs = consumer.poll(Duration.ofMillis(200));
    if (recs.isEmpty()) continue;
    producer.beginTransaction();
    try {
        for (ConsumerRecord<String, String> r : recs) {
            producer.send(new ProducerRecord<>("orders-enriched", r.key(), enrich(r.value())));
        }
        Map<TopicPartition, OffsetAndMetadata> offsets = nextOffsets(recs);
        producer.sendOffsetsToTransaction(offsets, consumer.groupMetadata());  // input progress in the SAME txn
        producer.commitTransaction();                 // all-or-nothing
    } catch (ProducerFencedException e) {
        producer.close();                             // a newer instance took over; stop
        throw e;
    } catch (KafkaException e) {
        producer.abortTransaction();                  // outputs discarded; records will be re-polled
        rewindToLastCommitted(consumer);
    }
}` }],
    codeTitle: ['Idempotent consumer (Java)', 'Idempotent consumer (Python, runnable)', 'Kafka transactions (Java client)'],
    examples: [
      { title: 'Non-idempotent vs idempotent SQL', html: `${H.table(['Handler SQL', 'Run twice →', 'Idempotent?'], [
  ['<code>UPDATE acct SET bal = bal + 100 WHERE id = 7</code>', '+200', '<span class="c-r">no</span>'],
  ['<code>UPDATE orders SET status = \'PAID\' WHERE id = 9</code>', 'PAID', '<span class="c-g">yes</span>'],
  ['<code>INSERT INTO ledger(event_id, acct, amt) … ON CONFLICT (event_id) DO NOTHING</code>', 'one row', '<span class="c-g">yes</span>'],
  ['<code>UPDATE acct SET bal = :b, ver = :v WHERE id = 7 AND ver &lt; :v</code>', 'no change 2nd time', '<span class="c-g">yes</span>']
])}<p>Turn increments into <b>ledger inserts keyed by event id</b>, then derive balances. That is how banks do it.</p>` },
      { title: 'Webhook receiver dedupe', html: `<p>Stripe/GitHub/Shopify webhooks are at-least-once and can arrive twice or out of order. Store <code>event.id</code> in a <code>webhook_events</code> table with a UNIQUE index, return 200 quickly, push the event to an internal queue, and process idempotently. Use the event's own timestamp or object version to ignore stale updates.</p>` },
      { title: 'Dedupe window trade-off', html: `<p>Keeping every event id forever costs storage: 50M events/day × 40 bytes ≈ 2 GB/day. Options: keep ids for the maximum redelivery window (Kafka retention, e.g. 7 days → 14 GB, with a TTL), use a Bloom filter in front of the table for cheap "definitely new" checks, or use a natural key with version so no extra table is needed. SQS FIFO does broker-side dedupe but only within a <b>5-minute</b> window.</p>` },
      { title: 'Where exactly-once quietly breaks', html: `<p>A Kafka Streams app with <code>exactly_once_v2</code> counts page views into an output topic — exactly once. Then someone adds a step that <b>sends an email</b> from inside the processor. On a transaction abort and retry, the email is sent again: the email server is outside Kafka's transaction. Rule: side effects outside Kafka need their own idempotency key (or move them to a separate consumer of the output topic).</p>` }
    ],
    deepDive: `<p>🟣 <b>Why exactly-once delivery is impossible in general.</b> The sender cannot distinguish "message lost" from "ack lost" (Two Generals). So it must either retry (risking duplicates) or not (risking loss). Every "exactly-once" system narrows the problem: it makes the receiver <b>remember</b> what it has seen (dedupe) and makes "effect + remember" <b>atomic</b>.</p>
<p><b>Kafka EOS internals.</b> A <i>transaction coordinator</i> (a broker, by hash of <code>transactional.id</code>) writes transaction state to <code>__transaction_state</code>. Producer writes go to partitions marked as part of an open transaction; commit writes <b>control records</b> (commit/abort markers) into each partition. <code>read_committed</code> consumers buffer up to the <i>last stable offset</i> and skip aborted batches. The <b>epoch</b> on <code>transactional.id</code> fences zombies — an old instance that wakes up after a GC pause cannot commit. KIP-890 (Kafka 4.x) hardened this against "hanging transactions" with a server-side check on every transactional write.</p>
<p><b>Cost.</b> Transactions add latency (commit markers, coordinator round trips) and consumers in read_committed wait for the slowest open transaction. Batch many records per transaction (commit every 100 ms – 1 s).</p>
<p><b>Producer retries without idempotence</b> can also <b>reorder</b>: batch 1 fails, batch 2 succeeds, batch 1 retries → 2 before 1. Idempotence (with <code>max.in.flight.requests.per.connection ≤ 5</code>) keeps order because the broker rejects out-of-sequence batches.</p>
<p><b>Dedupe key design.</b> The id must be generated <b>once at the source</b> (UUIDv7, or a natural key like <code>orderId + eventType + version</code>). Generating it in the consumer (e.g. hash of payload + receive time) defeats the point. For CDC events, <code>(table, primary key, LSN)</code> is a natural unique id.</p>
<p><b>Ordering + idempotency together.</b> Dedupe alone does not stop an <b>old</b> event overwriting a newer state if they arrive out of order (e.g. after a retry topic). Use version numbers: apply only if <code>incoming.version &gt; stored.version</code>.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> agentic systems make idempotency more urgent. An agent that retries a failed tool call ("send invoice", "create Jira ticket", "transfer funds") is a producer with at-least-once semantics — and LLMs also retry on their own when a response looks wrong. Production agent frameworks now attach an <b>idempotency key per tool invocation</b>, and MCP servers that perform side effects are expected to honour it.</p>
<p><b>Use AI as a partner:</b> ask <code>For each consumer in this service, is the handler idempotent? Show me the line that would double-apply on redelivery.</code> Assistants are good at spotting <code>+=</code> updates and missing unique constraints. Ask it to generate a chaos test that kills the consumer between processing and commit.</p>
<p><b>Where AI goes wrong:</b> it confidently says "enable Kafka exactly-once and you are safe" for a consumer that writes to Postgres or calls an API; it generates dedupe keys from <code>uuid4()</code> inside the consumer (new id per delivery — dedupes nothing); it forgets the dedupe insert must be in the same transaction as the effect.</p>
<p><b>What you must still own:</b> drawing the crash timeline, choosing the dedupe key, putting effect + dedupe in one transaction, and explaining to an interviewer why "exactly-once delivery" is a myth but exactly-once <b>effects</b> are achievable.</p>`,
    problems: [{
      title: 'At-least-once payments consumer that never double-charges',
      level: 'Hard',
      tags: ['idempotency', 'at-least-once', 'payments', 'kafka'],
      companies: ['Stripe', 'PayPal', 'Razorpay', 'Amazon'],
      statement: `<p>A <code>payment-requests</code> topic carries <code>{paymentId, orderId, amount, currency}</code>. A consumer group must call an external payment provider (PSP) and record the result in Postgres. Requirements: no request lost, no customer charged twice, even with consumer crashes, rebalances, producer retries and PSP timeouts.</p>`,
      constraints: `<p>2,000 payments/s peak. PSP supports an <code>Idempotency-Key</code> header (24 h). PSP p99 latency 2 s; sometimes times out with the charge actually done.</p>`,
      example: `<p>Consumer calls PSP for <code>pay-77</code>, PSP charges the card but the HTTP response <span class="c-r">times out</span>; consumer crashes. On redelivery it calls PSP again with Idempotency-Key <code>pay-77</code> → PSP returns the <span class="c-g">original result</span>, no second charge. DB upsert on <code>payment_id</code> records it once.</p>`,
      brute: { why: `<p><b>Naive:</b> auto-commit + "call PSP, then insert result". A crash after the PSP call but before commit redelivers the message and charges again. Committing first loses payments on crash. Using a random UUID as the PSP idempotency key per attempt gives each retry a fresh key — the PSP happily charges twice. A timeout treated as "failed" and retried with a new key is the classic double-charge bug.</p>` },
      mcq: { q: 'The PSP call timed out. What should the consumer do?', options: ['Assume failure and charge again with a new request id', 'Retry with the SAME idempotency key (paymentId); the PSP returns the original outcome if it already charged', 'Mark the payment failed and refund', 'Commit the offset and move on'], answer: 1, explain: 'A timeout is "unknown", not "failed". Retrying with the same key is safe and resolves the unknown.' },
      hints: [`<p>Hint 1: The idempotency key must come from the business event (<code>paymentId</code>), created once by the producer — not generated per attempt.</p>`, `<p>Hint 2: Keep a <code>payments</code> state machine row: PENDING → SUBMITTED → SUCCEEDED/FAILED, unique on payment_id. Transitions are conditional updates.</p>`, `<p>Hint 3: Recipe: on message → upsert row PENDING if absent → if terminal state, skip → call PSP with Idempotency-Key = paymentId → conditional update to terminal state → commit offset. Timeouts → retry with backoff (same key); exhausted → retry topic / DLQ; a reconciliation job queries PSP for stuck SUBMITTED rows.</p>`],
      solution: {
        approach: `<p><b>Producer side:</b> the Checkout service writes <code>payments(payment_id PK, status='PENDING', …)</code> and an outbox row in one transaction; a relay publishes <code>PaymentRequested</code> with key = <code>orderId</code> (per-order ordering), idempotent producer, acks=all.</p>
<p><b>Consumer:</b> group <code>payment-executor</code>, manual commits after processing, small batches, processing parallelised by key. For each event: (1) <code>SELECT status FROM payments WHERE payment_id = ?</code>; if SUCCEEDED/FAILED → skip (duplicate). (2) <code>UPDATE … SET status='SUBMITTED', attempts=attempts+1 WHERE payment_id=? AND status IN ('PENDING','SUBMITTED')</code>. (3) Call PSP with <code>Idempotency-Key: paymentId</code>. (4) On a definitive answer: <code>UPDATE … SET status='SUCCEEDED', psp_ref=? WHERE payment_id=? AND status='SUBMITTED'</code> and write a <code>PaymentSucceeded</code> outbox row in the same transaction. (5) Commit the Kafka offset.</p>
<p><b>Failures:</b> PSP timeout/5xx → in-process retry with exponential backoff + jitter (same key); still failing → publish to <code>payment-requests.retry-1m</code> / <code>-10m</code> topics; after N attempts → <code>payment-requests.dlq</code> + page on-call. Validation errors (bad currency) → DLQ immediately. A <b>reconciliation job</b> every 5 min queries the PSP for rows stuck in SUBMITTED longer than 10 min and finalises them, and a daily settlement-file reconciliation catches anything else. Duplicates at any stage are harmless because every step is keyed on <code>payment_id</code>.</p>`,
        code: { lang: 'python', run: true, code: `# Idempotent payment executor: same paymentId -> at most one charge, even with redeliveries and timeouts.
class FakePsp:
    """Payment provider that honours Idempotency-Key and sometimes times out AFTER charging."""
    def __init__(self):
        self.results, self.cards_charged = {}, 0
        self.timeout_once = {"pay-77"}

    def charge(self, key, amount):
        if key not in self.results:          # first time this key is seen -> really charge
            self.cards_charged += 1
            self.results[key] = f"psp_{key}_ok"
        if key in self.timeout_once:         # simulate: charge done, response lost
            self.timeout_once.discard(key)
            raise TimeoutError("PSP response timed out")
        return self.results[key]             # replay of the stored result for the same key

payments = {}   # payment_id -> status   (Postgres table with PK payment_id)
psp = FakePsp()

def handle(event):
    pid = event["paymentId"]
    status = payments.setdefault(pid, "PENDING")          # upsert-if-absent
    if status in ("SUCCEEDED", "FAILED"):
        print("skip duplicate", pid); return True
    payments[pid] = "SUBMITTED"
    try:
        ref = psp.charge(key=pid, amount=event["amount"])  # SAME key on every attempt
    except TimeoutError:
        print("timeout for", pid, "-> leave SUBMITTED, do not commit offset"); return False
    payments[pid] = "SUCCEEDED"
    print("charged", pid, ref); return True

stream = [{"paymentId": "pay-77", "amount": 500}, {"paymentId": "pay-78", "amount": 90}]
for ev in stream:
    while not handle(ev):        # redelivery / retry of the same event
        pass
handle(stream[0])                # a late duplicate from a rebalance
print("cards charged:", psp.cards_charged, "statuses:", payments)
assert psp.cards_charged == 2` },
        complexity: `<p>Per payment: 2–3 indexed row updates + 1 PSP call. Throughput limited by PSP latency: 2,000/s × 2 s ≈ 4,000 concurrent calls → e.g. 48 partitions × keyed worker pools of ~100 in-flight each. Dedupe state = one row per payment (already needed).</p>`,
        followUps: ['How do you handle a refund event arriving before the payment succeeded?', 'What if the PSP idempotency window (24 h) is shorter than your DLQ redrive time?', 'How would you prove "no double charge" in production? (reconciliation, invariants, alerts)']
      }
    }]
  });

  /* =====================================================================
     TOPIC 5 — Ordering & partition keys
     ===================================================================== */
  topics.push({
    title: 'Ordering Guarantees & Choosing the Partition Key',
    analogy: `<p>A bank has several <b>tellers</b>. If you split one customer's slips across two tellers — "deposit ₹1,000" to the fast one and "withdraw ₹800" to the slow one — the withdrawal might be processed first and bounce. Smart banks give each customer <b>one teller</b> for the day (by the first letter of their name). Different customers still go in parallel, but <b>your</b> slips stay in order. The "first letter of the name" rule is the <b>partition key</b>.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> Kafka promises order only <b>inside one partition</b>. Partitions are read in parallel by different consumers at different speeds, so two records in different partitions can be processed in any order. If certain events must be processed in order, they must land in the <b>same partition</b> — and the way to do that is giving them the <b>same key</b>.</p>
${H.table(['Ordering you need', 'Key to use', 'Parallelism'], [
  ['Global order of everything', '(single partition)', '<span class="c-r">1 consumer — rarely acceptable</span>'],
  ['Per order (created → paid → shipped)', '<code>orderId</code>', 'high'],
  ['Per customer account (deposits, withdrawals)', '<code>accountId</code>', 'high'],
  ['Per driver location updates', '<code>driverId</code>', 'high'],
  ['Per chat conversation', '<code>conversationId</code>', 'high'],
  ['No ordering needed (clicks, logs)', 'null (sticky partitioner)', 'maximum, best batching']
])}
<p><b>How to choose the key — three questions:</b></p>
<ol>
<li><b>What is the unit of consistency?</b> Which events must never be reordered relative to each other? That entity's id is the key.</li>
<li><b>Is it spread out?</b> Many distinct values with similar volume → even partitions. One giant value (a celebrity, a mega-tenant) → a <b>hot partition</b>.</li>
<li><b>Will it ever need to change?</b> Changing the key or partition count later re-maps keys and breaks order during the switch.</li>
</ol>
<p>🔵 <b>Ways ordering silently breaks</b> even with a good key:</p>
<ul>
<li><b>Producer retries without idempotence</b>: batch 2 lands before retried batch 1 (fixed by the idempotent producer, default on).</li>
<li><b>Consumer threads</b>: one consumer hands records to an unordered thread pool. Parallelise <b>by key</b> instead.</li>
<li><b>Retry topics / DLQ</b>: a failed event moves aside while later events for the same key carry on.</li>
<li><b>Adding partitions</b>: <code>hash(key) mod N</code> changes when N changes.</li>
<li><b>Multiple producers</b> for the same entity (two services both emit events about order 7): there is no shared clock; use versions/sequence numbers in the payload.</li>
</ul>
<p>When perfect ordering is too expensive, design consumers to <b>tolerate disorder</b>: carry a <code>version</code> or sequence number in each event and ignore anything older than what you have.</p>`,
    clues: [
      '"events for the same order/user must be processed in order" → partition key = that id',
      '"global ordering of all events" → push back: one partition = one consumer; ask what really needs order',
      '"one customer generates 30% of traffic" → hot key → key salting / dedicated topic / split by sub-key',
      '"location updates may arrive out of order" → per-driver key + sequence number, keep latest',
      '"we increased partitions and saw out-of-order processing" → key re-mapping on partition change',
      '"SQS FIFO" → MessageGroupId is SQS\'s partition key'
    ],
    viz: [{
      title: 'Round-robin vs key-based partitioning: who stays in order?',
      input: 'o1:created o2:created o1:paid o1:shipped o2:paid o2:shipped',
      inputLabel: 'key:event list (2-10 events); consumer of P0 is fast (1 tick), P1 is slow (4 ticks)',
      gen: function (input) {
        var ev = String(input || '').trim().split(/\s+/).map(function (s) { var a = s.split(':'); return { k: a[0], v: a[1] || 'evt' }; });
        if (ev.length < 2 || ev.length > 10 || ev.some(function (e) { return !e.k; })) throw new Error('Enter 2-10 key:event items, e.g. "o1:created o2:created o1:paid"');
        var P = 2, speed = [1, 4], frames = [];
        function simulate(assignFn) {
          var parts = [[], []], done = [];
          ev.forEach(function (e, i) { parts[assignFn(e, i)].push(i); });
          parts.forEach(function (lst, p) { lst.forEach(function (i, j) { done.push({ i: i, p: p, t: (j + 1) * speed[p] }); }); });
          done.sort(function (a, b) { return a.t - b.t || a.p - b.p; });
          var lastIdx = {}, bad = {};
          done.forEach(function (d, pos) { var k = ev[d.i].k; if (lastIdx[k] !== undefined && lastIdx[k] > d.i) bad[pos] = true; if (lastIdx[k] === undefined || d.i > lastIdx[k]) lastIdx[k] = d.i; });
          return { parts: parts, done: done, bad: bad };
        }
        function grid(parts, hl) {
          var w = Math.max(3, parts[0].length, parts[1].length);
          return GRID('Partitions (C0 on P0 is fast, C1 on P1 is slow)', parts.map(function (l) { return range(w, function (c) { return l[c] !== undefined ? ev[l[c]].k + ':' + ev[l[c]].v : ''; }); }), ['P0 → C0 (1 tick)', 'P1 → C1 (4 ticks)'], range(w, function (c) { return 'off ' + c; }), hl || {});
        }
        function timeline(sim) {
          var hl = {}; Object.keys(sim.bad).forEach(function (k) { hl[k] = 'bad'; });
          return TABLE('Order in which events are actually PROCESSED', ['finish time', 'event', 'partition', 'ok?'], sim.done.map(function (d, pos) { return ['t=' + d.t, ev[d.i].k + ':' + ev[d.i].v, 'P' + d.p, sim.bad[pos] ? 'OUT OF ORDER' : 'ok']; }), hl);
        }
        frames.push(F('The producer sends these ' + ev.length + ' events in this order. Two partitions, two consumers: C0 is quick, C1 is slow (busy GC, slower DB). First try <b>no key</b> (round-robin).', [{ type: 'array', label: 'send order', values: ev.map(function (e) { return e.k + ':' + e.v; }) }]));
        var rr = simulate(function (e, i) { return i % P; });
        var partial = [[], []];
        ev.forEach(function (e, i) {
          var p = i % P; partial[p].push(i);
          if (i < 4 || i === ev.length - 1) {
            var h = {}; h[p + ',' + (partial[p].length - 1)] = 'cur';
            frames.push(F('No key → event ' + (i + 1) + ' <b>' + esc(e.k + ':' + e.v) + '</b> goes to <b>P' + p + '</b> (just alternating). Events of the same order are being split across partitions.', [grid(partial, h)]));
          }
        });
        var nb = Object.keys(rr.bad).length;
        frames.push(F(nb ? 'Process in parallel: the slow consumer finishes later, so ' + nb + ' event(s) are handled <span class="c-r">before an earlier event of the same key</span> (red). E.g. "paid" before "created" → the handler cannot find the order.' : 'In this input no key got reordered — but only by luck of timing. Try adding more events for one key.', [grid(rr.parts), timeline(rr)]));
        var kb = simulate(function (e) { return toyHash(e.k) % P; });
        var keys = {}; ev.forEach(function (e) { keys[e.k] = toyHash(e.k) % P; });
        frames.push(F('Now use <b>key = order id</b>. hash(key) mod 2 decides the partition: ' + Object.keys(keys).map(function (k) { return esc(k) + ' → P' + keys[k]; }).join(', ') + '. All events of one key are in one partition, in send order.', [grid(kb.parts), TABLE('Key → partition', ['key', 'partition'], Object.keys(keys).map(function (k) { return [k, 'P' + keys[k]]; }))]));
        frames.push(F('Process in parallel again. Different keys still interleave (fine — they are independent), but within each key the order is <span class="c-g">always preserved</span>, because one partition is read by one consumer in offset order.', [grid(kb.parts), timeline(kb)]));
        var counts = [0, 0]; ev.forEach(function (e) { counts[keys[e.k]]++; });
        frames.push(F('The price: load follows the keys. If one key is huge, its partition is hot while others idle. With few keys (here ' + Object.keys(keys).length + ') the split can be uneven: ' + counts.join(' vs ') + ' events.', [{ type: 'bars', label: 'events per partition (key-based)', values: counts, idxLabels: ['P0', 'P1'], hl: counts[0] === counts[1] ? {} : (counts[0] > counts[1] ? { 0: 'bad' } : { 1: 'bad' }) }]));
        return frames;
      }
    }, {
      title: 'Hot key: one celebrity floods one partition (and the salting fix)',
      gen: function () {
        var frames = [];
        var base = [120, 130, 110, 125];
        var hot = [120, 130, 110 + 900, 125];
        frames.push(F('Topic <code>likes</code> keyed by <code>postId</code>, 4 partitions, each consumer handles ~300 likes/s. Normal day: load is even.', [{ type: 'bars', label: 'likes/s per partition', values: base, idxLabels: ['P0', 'P1', 'P2', 'P3'] }, VARS('Consumer capacity', { 'per partition': '300/s' })]));
        frames.push(F('A celebrity post goes viral: +900 likes/s, all with the same key → all in <b>P2</b>. P2 needs 1,010/s but its consumer does 300/s. <span class="c-r">Lag on P2 explodes</span>; other partitions are idle. More consumers do not help — one partition, one consumer.', [{ type: 'bars', label: 'likes/s per partition', values: hot, idxLabels: ['P0', 'P1', 'P2', 'P3'], hl: { 2: 'bad' } }, VARS('P2', { incoming: 1010, capacity: 300, 'lag growth': '+710/s' }, { 'lag growth': 'bad' })]));
        frames.push(F('Fix 1 — <b>salting</b>: for keys known to be hot, use key = <code>postId + "#" + (n mod 4)</code>. The hot post\'s likes spread over 4 partitions. Cost: no ordering across the salts (fine for counting likes) and a second step must <b>merge</b> the 4 partial counts.', [{ type: 'bars', label: 'likes/s per partition (salted)', values: [345, 355, 335, 350], idxLabels: ['P0', 'P1', 'P2', 'P3'], hl: { 0: 'ok', 1: 'ok', 2: 'ok', 3: 'ok' } }, TABLE('Hot key after salting', ['key', 'partition'], [['post9#0', 'P0'], ['post9#1', 'P1'], ['post9#2', 'P2'], ['post9#3', 'P3']])]));
        frames.push(F('Fix 2 — <b>pre-aggregate</b> at the producer (count likes for 1 s, send one "post9 +900" event). Fix 3 — route known giant tenants to a <b>dedicated topic</b>. Choose based on whether per-key order matters.', [TABLE('Hot-key options', ['option', 'keeps per-key order?', 'extra work'], [['salting', 'no (only within each salt)', 'merge step'], ['producer-side aggregation', 'yes', 'small delay'], ['dedicated topic / cluster', 'yes', 'routing logic'], ['bigger consumer for that partition', 'yes', 'limited by one machine']], { 0: 'sel' })]));
        return frames;
      }
    }],
    code: [{ lang: 'java', title: 'Per-key ordered parallelism inside one consumer (compiles)', code: `import java.util.*;
import java.util.concurrent.*;

/**
 * One Kafka partition gives you ordered records, but processing them one by one may be too slow.
 * Trick: N single-threaded lanes; a record goes to lane hash(key) % N.
 * Same key -> same lane -> still in order. Different keys -> run in parallel.
 */
public class KeyedLanes implements AutoCloseable {
    private final ExecutorService[] lanes;

    public KeyedLanes(int n) {
        lanes = new ExecutorService[n];
        for (int i = 0; i < n; i++) lanes[i] = Executors.newSingleThreadExecutor();
    }

    public Future<?> submit(String key, Runnable work) {
        int lane = Math.floorMod(key.hashCode(), lanes.length);   // floorMod: never negative
        return lanes[lane].submit(work);
    }

    @Override public void close() throws InterruptedException {
        for (ExecutorService e : lanes) e.shutdown();
        for (ExecutorService e : lanes) e.awaitTermination(5, TimeUnit.SECONDS);
    }

    public static void main(String[] args) throws Exception {
        List<String> processed = Collections.synchronizedList(new ArrayList<>());
        String[][] events = { {"o1", "created"}, {"o2", "created"}, {"o1", "paid"}, {"o2", "paid"}, {"o1", "shipped"} };
        try (KeyedLanes lanes = new KeyedLanes(4)) {
            List<Future<?>> pending = new ArrayList<>();
            for (String[] e : events) pending.add(lanes.submit(e[0], () -> processed.add(e[0] + ":" + e[1])));
            for (Future<?> f : pending) f.get();   // only now is it safe to commit the batch's offsets
        }
        // o1 events always appear as created -> paid -> shipped, whatever the interleaving with o2
        System.out.println(processed);
    }
}` }],
    codeTitle: ['Keyed lanes (Java)'],
    examples: [
      { title: 'Bank account events', html: `<p>Events: <code>Deposit(acct=7, 1000)</code>, <code>Withdraw(acct=7, 800)</code>. Key = <code>accountId</code> → same partition → the withdrawal is always applied after the deposit, so it never wrongly bounces. A <b>transfer</b> touches two accounts (7 → 9). Key it by the source account; the credit to account 9 is a separate event keyed by 9, emitted after the debit succeeds (saga). Never try to get two accounts into "one order" with one key.</p>` },
      { title: 'Driver location updates', html: `<p>Each driver sends a GPS ping every 4 s. Key = <code>driverId</code>; 500k drivers spread evenly. The consumer keeps only the newest point per driver, so it also checks <code>seq</code> in the payload: a ping with seq 41 arriving after seq 42 (phone reconnected late) is dropped. Ordering by key + version check = robust.</p>${H.table(['arrives', 'seq', 'stored seq', 'action'], [['p1', '40', '—', 'store'], ['p2', '42', '40', 'store'], ['p3', '<span class="c-r">41</span>', '42', '<span class="c-r">ignore (stale)</span>']])}` },
      { title: 'SQS FIFO message groups', html: `<p>SQS FIFO keeps order per <code>MessageGroupId</code> — the same idea as a Kafka key. While a message of group <code>order-7</code> is in flight, no other message of that group is delivered, so a slow or failing message blocks only its own group. Throughput limits apply per queue (higher in high-throughput mode), so pick a group id with many values, just like a partition key.</p>` },
      { title: 'Choosing between userId and sessionId', html: `<p>Clickstream for a fraud model that looks at a session's sequence of clicks. Key = <code>userId</code> keeps all sessions of a user together (good if the model needs cross-session history) but bots with millions of clicks create hot partitions. Key = <code>sessionId</code> spreads load and still orders each session. Pick the <b>smallest unit that needs ordering</b>.</p>` }
    ],
    deepDive: `<p>🟣 <b>The default partitioner precisely.</b> Java client: <code>Utils.toPositive(Utils.murmur2(keyBytes)) % numPartitions</code>. Other clients (librdkafka) default to a different hash (CRC32-based "consistent_random") unless configured with <code>partitioner=murmur2_random</code> — mixing clients can send the <b>same key to different partitions</b>. Pin the partitioner when producers are written in different languages.</p>
<p><b>Why not "a partition per entity"?</b> Partitions are heavyweight (files, replication, metadata). Millions of keys share tens or hundreds of partitions; ordering is per partition, which is <b>stronger</b> than per key (it also orders unrelated keys that happen to share the partition — a source of head-of-line blocking when one key's message is stuck).</p>
<p><b>Head-of-line blocking.</b> If record at offset 100 (key A) keeps failing and you retry in place, records 101+ (keys B, C…) wait too. Options: retry in place for a short time, then move <b>only that key</b> aside — and to keep A's order, also divert later A records until A is fixed (a "parked keys" table). Confluent Parallel Consumer and share groups offer per-key or per-record concurrency.</p>
<p><b>Changing partition count safely.</b> (1) Create a new topic with more partitions; (2) dual-write or mirror; (3) drain consumers of the old topic to zero lag; (4) switch consumers. Or design with consistent hashing over a fixed number of "virtual" slots and map slots to partitions.</p>
<p><b>Ordering across topics</b> does not exist. If <code>OrderCreated</code> and <code>PaymentCaptured</code> are on different topics, a consumer reading both can see the payment first. Either put all events of an entity's lifecycle on one topic (with an event-type field) or make consumers handle "arrived early" by buffering or upserting placeholder rows.</p>
<p><b>Total order when truly needed</b> (e.g. a matching engine, a replicated state machine): use a single partition and make it as fast as possible (LMAX-style single-threaded processing does millions/s), or a consensus log. This is exactly what Kafka's own KRaft metadata log is.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> agent conversations and tool-call streams are ordered per session — key by <code>conversationId</code> so turns, tool results and memory updates stay in order. Streaming LLM tokens to clients and event logs of agent steps (for replay/evaluation) are per-session ordered streams too.</p>
<p><b>Use AI as a partner:</b> describe your events and ask <code>Which entity is the unit of consistency here, and what key would you choose? What is the hot-key risk?</code> Then ask it to estimate key cardinality from a sample of production keys you paste in.</p>
<p><b>Where AI goes wrong:</b> it happily promises "Kafka guarantees order" without "per partition", proposes <code>timestamp</code> or random UUIDs as keys (no ordering at all), suggests increasing partitions to fix lag on a keyed topic without mentioning re-mapping, and processes records with <code>parallelStream()</code> inside the consumer.</p>
<p><b>What you must still own:</b> identifying the unit of consistency, weighing ordering against parallelism and hot keys, and designing consumers that survive the rare out-of-order event with versions.</p>`,
    problems: [{
      title: 'Choose the partition key for an order-lifecycle topic',
      level: 'Medium',
      tags: ['ordering', 'partition key', 'kafka'],
      companies: ['Amazon', 'Flipkart', 'Zomato', 'Instacart'],
      statement: `<p>An e-commerce platform publishes <code>OrderCreated</code>, <code>OrderPaid</code>, <code>OrderCancelled</code>, <code>OrderShipped</code> events to one topic. Consumers: a fulfilment service (must never ship a cancelled order), a customer-notification service, and an analytics loader. Choose the key, partition count and consumer design. A few marketplace sellers produce 15% of all orders.</p>`,
      constraints: `<p>20,000 events/s peak. 50M customers, 200k sellers. Fulfilment consumer handles 400 events/s per instance.</p>`,
      example: `<p>Events for order <code>o-55</code>: Created → Paid → Cancelled. If Cancelled is processed before Paid (different partitions), fulfilment may <span class="c-r">ship a cancelled order</span>. With key = <code>orderId</code> all three are in one partition and fulfilment sees <span class="c-g">Created, Paid, Cancelled</span> in order.</p>`,
      brute: { why: `<p><b>Naive keys:</b> no key (round-robin) → lifecycle events reorder. Key = <code>sellerId</code> → orders of one seller stay ordered, but the top sellers (15% of traffic) create hot partitions and lag. A single partition → total order but 400 events/s max, 50× too slow. Key = <code>eventType</code> → all "Paid" in one partition, all "Cancelled" in another: exactly the reordering you wanted to avoid.</p>` },
      mcq: { q: 'What is the unit of consistency for order lifecycle events?', options: ['The seller', 'The order (orderId)', 'The event type', 'The timestamp'], answer: 1, explain: 'Only events about the same order must stay in order; different orders are independent.' },
      hints: [`<p>Hint 1: Which events must never be reordered? Only those about the same order.</p>`, `<p>Hint 2: orderId has huge cardinality and roughly equal volume per key → even spread, no hot keys.</p>`, `<p>Hint 3: Partitions ≥ 20,000 / 400 = 50 consumers → pick ~96–120 for growth. Inside each consumer, parallelise by orderId lanes. Add a version number per order event so consumers can reject stale events.</p>`],
      solution: {
        approach: `<p><b>Key = <code>orderId</code></b>: the lifecycle of one order is the only sequence that must be ordered; 50M+ distinct orders spread evenly, so hot sellers do not create hot partitions. <b>Partitions = 120</b> (20k/400 = 50 consumers now, room for 2×). Producers: idempotent, acks=all, one consistent partitioner (murmur2) across languages, events published via the outbox from the Order service which owns the order state machine, each event carrying <code>orderVersion</code> (1, 2, 3…).</p>
<p><b>Fulfilment consumer:</b> keyed lanes inside each instance; keeps <code>order_state(order_id, version, status)</code>; applies an event only if <code>version = stored + 1</code> (or &gt; stored, depending on whether gaps are allowed); before shipping re-checks the status is PAID and not CANCELLED in the same transaction that creates the shipment. Notification and analytics are separate consumer groups on the same topic. Seller-level analytics (per-seller totals) is computed downstream by re-keying into a <code>orders-by-seller</code> aggregate with pre-aggregation, so heavy sellers are summed, not serialised.</p>`,
        complexity: `<p>120 partitions × ~170 events/s each at peak; 50–120 fulfilment instances. Per event: one indexed state lookup + conditional update.</p>`,
        followUps: ['A new "OrderRefunded" event is produced by the Payments service, not the Order service. How do you keep it ordered with the rest?', 'You must grow to 300 partitions next year. Migration plan?', 'How does the analytics loader handle out-of-order events from different partitions?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 6 — Retries, poison messages, dead-letter queues
     ===================================================================== */
  topics.push({
    title: 'Failure Handling: Retries, Poison Messages & Dead-Letter Queues',
    analogy: `<p>A post office sorting belt. Most letters go straight through. A letter with a <b>smudged address</b> jams the machine. If the worker keeps pushing the same letter back in, the <b>whole belt stops</b> and thousands of good letters wait. Smart workers try a couple of times, then drop the bad letter in a <b>"problem letters" tray</b> (the dead-letter queue) with a note saying what went wrong, and restart the belt. A supervisor checks the tray later, fixes the address, and puts it back on the belt.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> Some messages fail. Two very different kinds:</p>
${H.table(['Kind', 'Examples', 'Will retrying help?', 'What to do'], [
  ['<b>Transient</b>', 'DB timeout, 503 from an API, rate limit, network blip, leader election', '<span class="c-g">yes</span>', 'retry with exponential backoff + jitter'],
  ['<b>Permanent (poison)</b>', 'invalid JSON, unknown schema version, missing required field, business rule violation, bug (NullPointerException)', '<span class="c-r">no — fails forever</span>', 'park it in a DLQ quickly, alert, fix, redrive']
])}
<p>A <b>poison message</b> is one that can never be processed successfully. If you retry it in place forever, it blocks everything behind it in that partition — the consumer is "stuck" and lag climbs while healthy messages wait.</p>
<p>🔵 <b>The standard pattern (retry topics + DLQ):</b></p>
<ol>
<li><b>Try</b> the message. Success → commit.</li>
<li><b>Transient failure</b> → a few quick in-process retries (e.g. 3 tries, 100 ms → 400 ms).</li>
<li>Still failing → publish a copy to a <b>retry topic</b> with a delay (<code>orders.retry.1m</code>, <code>orders.retry.10m</code>) and headers (<code>attempt</code>, <code>error</code>, <code>original-partition</code>, <code>original-offset</code>), then <b>commit</b> the original so the main partition keeps moving.</li>
<li>A retry consumer waits until the message's due time, then tries again.</li>
<li>After <b>N attempts</b>, or immediately for a non-retryable error → publish to the <b>DLQ</b> (<code>orders.dlq</code>) with full error context.</li>
<li><b>Alert</b> on DLQ growth; humans or tools inspect, fix the bug or the data, and <b>redrive</b> (replay) the DLQ messages to the main topic.</li>
</ol>
<p>Managed queues build this in: SQS has a <b>redrive policy</b> (<code>maxReceiveCount</code> → DLQ) and a "start DLQ redrive" button; RabbitMQ has dead-letter exchanges; Google Pub/Sub has dead-letter topics with max delivery attempts. In Kafka you build it yourself (or use Spring Kafka's <code>@RetryableTopic</code>, Kafka Connect's <code>errors.deadletterqueue.topic.name</code>, or share groups' delivery counts).</p>
<p><b>Backoff with jitter</b>: wait <code>base × 2<sup>attempt</sup></code> plus a random part, capped. Without jitter, 10,000 failed messages all retry at the same second and knock the recovering service over again (a "retry storm").</p>
${H.table(['attempt', 'base × 2^n', 'with full jitter (random 0..x)'], [['1', '1 s', '0–1 s'], ['2', '2 s', '0–2 s'], ['3', '4 s', '0–4 s'], ['4', '8 s', '0–8 s'], ['5', '16 s → DLQ after', '0–16 s']])}`,
    clues: [
      '"one bad message stopped the whole pipeline" → poison message; need DLQ + non-blocking retries',
      '"downstream API is flaky / rate-limited" → retries with exponential backoff + jitter, circuit breaker',
      '"don\'t lose messages that fail" → DLQ with error metadata + redrive tooling',
      '"retries must not reorder events for the same key" → blocking retry for that key or park the key',
      '"after a deploy with a bug, 50k messages failed" → DLQ, fix, bulk redrive',
      '"SQS maxReceiveCount" / "dead-letter exchange" → broker-native DLQ'
    ],
    viz: [{
      title: 'Message retried with backoff, then sent to the DLQ',
      input: 'ok ok poison ok flaky ok',
      inputLabel: 'messages: ok | flaky (fails once) | poison (always fails); max 8',
      gen: function (input) {
        var toks = String(input || '').trim().toLowerCase().split(/\s+/);
        if (!toks.length || toks.length > 8 || toks.some(function (t) { return ['ok', 'flaky', 'poison'].indexOf(t) < 0; })) throw new Error('Use up to 8 words from: ok, flaky, poison');
        var MAX = 3, frames = [];
        var main = toks.map(function (t, i) { return { id: 'm' + i + (t === 'ok' ? '' : '-' + t), kind: t, attempts: 0 }; });
        var retry = [], dlq = [], log = [];
        var nodes = [B('M', 'orders (main)', 15, 30), B('C', 'Consumer', 45, 30), B('R', 'orders.retry', 45, 6), B('D', 'orders.dlq', 80, 52), B('OK', 'DB / side effect', 80, 10)];
        var edges = [['M', 'C', 'poll'], ['C', 'OK', 'success'], ['C', 'R', 'fail → retry'], ['R', 'C', 'after backoff'], ['C', 'D', 'give up']];
        function snap(narr, hl, ehl, rowHl) {
          frames.push(F(narr, [G('Retry + DLQ pipeline', nodes, edges, { hl: hl || {}, ehl: ehl || {} }), QUEUE('orders (main partition)', main.map(function (m) { return m.id; }), {}, 'next', 'end'), QUEUE('orders.retry', retry.map(function (m) { return m.id + ' (try ' + (m.attempts + 1) + ')'; }), {}, 'due first', ''), QUEUE('orders.dlq', dlq.map(function (m) { return m.id; }), range(dlq.length, function () { return 'bad'; }).reduce(function (a, v, k) { a[k] = v; return a; }, {}), '', ''), TABLE('Attempt log', ['message', 'attempt', 'result'], log.slice(-6), rowHl || {})]));
        }
        snap('Naive first: a consumer that retries a failing message <b>in place, forever</b> would never move past it — every message behind it waits, and lag grows without bound. Instead we use a <b>retry topic</b> and a <b>DLQ</b> so the main partition always keeps moving. Max attempts = ' + MAX + '.', { M: 'cur' });
        function attempt(m, fromRetry) {
          m.attempts++;
          var fail = m.kind === 'poison' || (m.kind === 'flaky' && m.attempts === 1);
          if (!fail) {
            log.push([m.id, m.attempts, 'success']);
            snap('<b>' + m.id + '</b> attempt ' + m.attempts + (fromRetry ? ' (from retry topic)' : '') + ' → <span class="c-g">success</span>. Side effect done, offset committed.', { C: 'ok', OK: 'ok' }, { 'C-OK': 'ok' }, (function () { var h = {}; h[Math.min(log.length, 6) - 1] = 'ok'; return h; })());
            return;
          }
          var err = m.kind === 'poison' ? 'JSON schema error: field "amount" missing' : 'DB timeout (transient)';
          if (m.attempts >= MAX) {
            dlq.push(m);
            log.push([m.id, m.attempts, 'failed → DLQ']);
            snap('<b>' + m.id + '</b> failed attempt ' + m.attempts + ' of ' + MAX + ' (' + err + '). Retries exhausted → published to <b>orders.dlq</b> <span class="c-r">with headers: error, stack trace, attempts, original partition/offset</span>. The original is committed; the pipeline is healthy. An alert fires: "DLQ size &gt; 0".', { C: 'bad', D: 'bad' }, { 'C-D': 'bad' }, (function () { var h = {}; h[Math.min(log.length, 6) - 1] = 'bad'; return h; })());
          } else {
            retry.push(m);
            var wait = Math.pow(2, m.attempts - 1);
            log.push([m.id, m.attempts, 'failed → retry in ~' + wait + ' s']);
            snap('<b>' + m.id + '</b> attempt ' + m.attempts + ' failed (' + err + '). Instead of blocking, copy it to <b>orders.retry</b> with <code>attempt=' + m.attempts + '</code> and a due time ~' + wait + ' s from now (exponential backoff + jitter), then commit the original. ' + (main.length ? 'The next main message can proceed.' : ''), { C: 'cur', R: 'cur' }, { 'C-R': 'cur' }, (function () { var h = {}; h[Math.min(log.length, 6) - 1] = 'cur'; return h; })());
          }
        }
        while (main.length) { var m = main.shift(); attempt(m, false); }
        var guard = 0;
        while (retry.length && guard++ < 30) {
          var r = retry.shift();
          snap('Main partition is drained. <b>' + r.id + '</b> is now due in the retry topic, so the retry consumer picks it up for attempt ' + (r.attempts + 1) + '.', { R: 'cur' }, { 'R-C': 'cur' });
          attempt(r, true);
        }
        snap(dlq.length ? 'Final state: every good and flaky message succeeded; ' + dlq.length + ' poison message(s) parked in the DLQ. Next: an engineer inspects the error header, fixes the producer or the consumer bug, then <b>redrives</b> the DLQ back into the main topic.' : 'Final state: everything eventually succeeded — transient failures healed with retries, and the DLQ stayed empty.', { D: dlq.length ? 'bad' : 'ok', M: 'ok' });
        return frames;
      }
    }],
    code: [{ lang: 'python', run: true, title: 'Retry classification + backoff with jitter + DLQ (runnable)', code: `import json, random

random.seed(7)                     # deterministic demo
MAX_ATTEMPTS = 3

class Transient(Exception): pass   # retry may help (timeouts, 503, throttling)
class Permanent(Exception): pass   # retry never helps (bad schema, validation, poison)

def backoff(attempt, base=0.5, cap=30.0):
    """Full jitter: random between 0 and min(cap, base * 2^attempt)."""
    return random.uniform(0, min(cap, base * 2 ** attempt))

flaky_failures = {"m4": 1}        # m4 fails once, then works

def process(msg):
    try:
        body = json.loads(msg["value"])
    except json.JSONDecodeError as e:
        raise Permanent(f"invalid JSON: {e.msg}")
    if "amount" not in body:
        raise Permanent("missing field amount")
    if flaky_failures.get(msg["id"], 0) > 0:
        flaky_failures[msg["id"]] -= 1
        raise Transient("db timeout")
    return f"charged {body['amount']}"

main = [{"id": "m1", "value": '{"amount": 10}'},
        {"id": "m2", "value": '{"amt": 5}'},        # poison: wrong field name
        {"id": "m3", "value": "not json"},          # poison: not JSON
        {"id": "m4", "value": '{"amount": 7}'}]     # flaky
retry_topic, dlq = [], []

def handle(msg, attempt):
    try:
        print(f"{msg['id']} try {attempt}: {process(msg)}")
    except Permanent as e:                          # no point retrying -> DLQ right away
        dlq.append({**msg, "error": str(e), "attempts": attempt})
        print(f"{msg['id']} try {attempt}: PERMANENT ({e}) -> DLQ")
    except Transient as e:
        if attempt >= MAX_ATTEMPTS:
            dlq.append({**msg, "error": str(e), "attempts": attempt})
            print(f"{msg['id']} try {attempt}: gave up -> DLQ")
        else:
            delay = backoff(attempt)
            retry_topic.append((msg, attempt + 1, delay))
            print(f"{msg['id']} try {attempt}: transient ({e}) -> retry topic in {delay:.2f}s")

for m in main:                      # main partition never blocks
    handle(m, 1)
while retry_topic:                  # retry consumer (would sleep until due time)
    msg, attempt, _ = retry_topic.pop(0)
    handle(msg, attempt)

print("DLQ:", [(d["id"], d["error"]) for d in dlq])` }, { lang: 'java', check: false, title: 'Spring Kafka: non-blocking retry topics + DLT', code: `@Component
public class OrderListener {

    // Creates orders-retry-1000, orders-retry-2000, orders-retry-4000 and orders-dlt automatically.
    @RetryableTopic(
        attempts = "4",                                            // 1 try + 3 retries
        backoff = @Backoff(delay = 1000, multiplier = 2.0, maxDelay = 10000),
        exclude = { DeserializationException.class, ValidationException.class }, // poison: straight to DLT
        dltStrategy = DltStrategy.FAIL_ON_ERROR)
    @KafkaListener(topics = "orders", groupId = "fulfilment")
    public void onOrder(OrderEvent event) {
        fulfilment.handle(event);           // idempotent on event.eventId()
    }

    @DltHandler
    public void onDeadLetter(OrderEvent event,
                             @Header(KafkaHeaders.EXCEPTION_MESSAGE) String error,
                             @Header(KafkaHeaders.ORIGINAL_OFFSET) long offset) {
        deadLetters.save(event, error, offset);   // queryable store + alert; redrive tool reads from here
    }
}` }],
    codeTitle: ['Retry + DLQ logic (Python, runnable)', 'Spring Kafka @RetryableTopic'],
    examples: [
      { title: 'SQS redrive policy', html: `<p>Queue <code>orders-q</code> with <code>RedrivePolicy = {deadLetterTargetArn: orders-dlq, maxReceiveCount: 5}</code> and visibility timeout 60 s. A poison message is received 5 times (each time the worker throws and does not delete it); on the 6th receive SQS moves it to <code>orders-dlq</code>. Set the DLQ's retention longer than the source (up to 14 days) so you do not lose evidence. After fixing, use "Start DLQ redrive" to move messages back.</p>` },
      { title: 'Deserialization poison pill in Kafka', html: `<p>A producer deploys a bug and writes Avro with an unregistered schema id. Every consumer instance throws inside <code>poll()</code> on that record and restarts at the same offset → a <b>crash loop</b> and a frozen partition. Fix: use an <code>ErrorHandlingDeserializer</code> (Spring) or catch <code>RecordDeserializationException</code>, which tells you the partition and offset; publish the raw bytes to the DLQ and <code>seek(offset + 1)</code>. Prevent it with a schema registry and compatibility checks at produce time.</p>` },
      { title: 'Retries that preserve per-key order', html: `<p>Account events must stay in order. <code>Withdraw(acct 7)</code> fails transiently and goes to the retry topic; then <code>Deposit(acct 7)</code> succeeds in main — order broken. Fix: keep a small <b>parked keys</b> table. When a key's event goes to retry, mark acct 7 as parked; later main events for acct 7 are also sent to the retry topic (behind it) until the parked one succeeds. Other accounts are not affected.</p>${H.table(['event', 'key', 'action'], [['Withdraw#1', '7', 'fails → retry, park 7'], ['Deposit#2', '9', 'process'], ['Deposit#3', '7', '<span class="c-y">7 parked → send to retry behind #1</span>'], ['retry: Withdraw#1', '7', 'success'], ['retry: Deposit#3', '7', 'success, unpark 7']])}` },
      { title: 'DLQ is not a trash can', html: `<p>A team had 2.3M messages in a DLQ nobody watched — six months of failed refunds. Treat the DLQ as an <b>incident queue</b>: alert on count &gt; 0 or growth rate, dashboards by error type, an owner on call, a runbook, a redrive tool with dry-run and rate limit, and retention long enough to fix the bug (e.g. 14–30 days).</p>` }
    ],
    deepDive: `<p>🟣 <b>Blocking vs non-blocking retries.</b> Blocking (retry in place, pause the partition) preserves order but stalls every key in that partition; use it only for short transient errors (seconds) or when strict order is essential. Non-blocking (retry topics) keeps throughput but breaks per-key order unless you park keys. Many teams combine: a few blocking retries, then non-blocking.</p>
<p><b>Implementing delays in Kafka.</b> Kafka has no per-message delay. A retry consumer reads <code>orders.retry.10m</code>, looks at the due-time header, and if it is not due yet calls <code>pause()</code> on that partition and resumes later (never <code>sleep()</code> past <code>max.poll.interval.ms</code>). Because a retry topic holds messages with the same delay, they are already in due-time order. SQS (DelaySeconds, visibility timeout changes), RabbitMQ (TTL + DLX or delayed-message plugin) and Pulsar (delayed delivery) support delays natively.</p>
<p><b>Retry budgets and circuit breakers.</b> If the downstream is fully down, every message fails and retries multiply load. A circuit breaker opens after X% failures and makes the consumer <b>pause consumption</b> (backpressure) instead of flooding retry topics; lag grows harmlessly in Kafka and drains after recovery.</p>
<p><b>Redrive safely:</b> fix first, then redrive at a limited rate, ideally in a dry-run mode, with idempotent consumers (DLQ messages may already have partly succeeded). Keep original headers (trace id, event id) so dedupe works. Do not redrive into the same bug.</p>
<p><b>DLQ message contents:</b> original key, value (raw bytes if deserialization failed), headers, original topic/partition/offset, consumer group, exception class + message + stack hash, attempt count, first/last failure time, app version. Without this context, a DLQ is useless.</p>
<p><b>Producer-side DLQ:</b> when a producer cannot publish (broker down too long), write to a local durable spill file or an outbox table and replay — the outbox pattern gives this for free.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> LLM-powered consumers add new failure types — rate limits (429), content-filter refusals, malformed JSON output, context-length errors. Classify them: 429 and 5xx are transient (backoff, honour Retry-After); refusals and "context too long" are permanent for that input (DLQ or a fallback path like truncation or a different model). AI triage bots now read DLQs, cluster errors by root cause and propose fixes or redrive plans.</p>
<p><b>Use AI as a partner:</b> paste 50 DLQ error headers and ask <code>group these by root cause and tell me which are safe to redrive after a fix</code>. Ask it to write the retry classifier (which exceptions are transient) — then review it carefully.</p>
<p><b>Where AI goes wrong:</b> it writes <code>while (true) { try … catch { sleep(1000) } }</code> (blocks the partition, gets kicked from the group), retries non-idempotent calls without keys, omits jitter, and treats every exception as retryable — so poison messages loop for hours.</p>
<p><b>What you must still own:</b> the transient vs permanent classification, the ordering trade-off of non-blocking retries, DLQ ownership and alerting, and the redrive runbook.</p>`,
    problems: [{
      title: 'Handle poison messages without stopping the pipeline',
      level: 'Medium',
      tags: ['dlq', 'retries', 'poison message', 'kafka'],
      companies: ['Netflix', 'Uber', 'Confluent', 'Walmart'],
      statement: `<p>An <code>inventory-updates</code> consumer group processes stock changes from 3,000 stores. Last week a store POS sent a malformed message; the consumer threw an exception, restarted at the same offset, threw again — the partition was stuck for 4 hours and 40 stores showed stale stock. Also, the warehouse DB occasionally times out for ~30 s during failover. Design the error handling.</p>`,
      constraints: `<p>Per-SKU-per-store ordering matters (key = storeId:sku). Stale stock must be under 1 minute for healthy messages. No update may be silently dropped.</p>`,
      example: `<p>Partition P4: <code>[u1 ok][u2 POISON][u3 ok][u4 ok]</code>. Naive: stuck at u2 forever. Target: u2 → <span class="c-r">DLQ</span> within seconds with error context; u3, u4 <span class="c-g">processed immediately</span>; on DB failover, messages retry with backoff and succeed after recovery.</p>`,
      brute: { why: `<p><b>Naive 1:</b> catch-all retry forever in place → one bad message freezes the partition (what happened). <b>Naive 2:</b> catch and skip (log and commit) → bad messages silently vanish, stock becomes wrong forever. <b>Naive 3:</b> send everything that fails to a DLQ immediately → a 30 s DB failover dumps thousands of good messages into the DLQ and creates a manual-redrive mess.</p>` },
      mcq: { q: 'A message fails JSON schema validation. Best action?', options: ['Retry it 10 times with backoff', 'Send it to the DLQ immediately with the error, commit, continue', 'Skip it silently', 'Stop the consumer until someone fixes it'], answer: 1, explain: 'Validation failures are permanent; retrying wastes time and blocks the partition. Park it with context and keep going.' },
      hints: [`<p>Hint 1: Split errors into transient and permanent. Each gets a different path.</p>`, `<p>Hint 2: Transient: short blocking retries (it is only 30 s), plus a circuit breaker that pauses the consumer instead of flooding retries. Permanent: DLQ immediately.</p>`, `<p>Hint 3: Because ordering per storeId:sku matters, when one key's message is in the DLQ/retry path, later updates for the same key must not overwrite it out of order — use per-key versions (store sequence numbers) or park the key.</p>`],
      solution: {
        approach: `<p><b>1. Deserialization guard:</b> ErrorHandlingDeserializer; undecodable bytes → DLQ with raw payload, partition, offset; seek past.</p>
<p><b>2. Classification:</b> validation/schema/business-rule errors = <b>permanent</b> → <code>inventory-updates.dlq</code> immediately. DB timeouts, 5xx, connection errors = <b>transient</b>.</p>
<p><b>3. Transient path:</b> in-process retries with exponential backoff + jitter for up to ~60 s (covers DB failover), keeping order. A <b>circuit breaker</b> on the DB: when open, the consumer <code>pause()</code>s its partitions (still calling poll for heartbeats) — lag grows in Kafka, nothing is lost, nothing hammers the DB. Beyond 60 s → non-blocking retry topics (1 m, 10 m), then DLQ after 5 attempts.</p>
<p><b>4. Ordering:</b> every POS message carries a per-store monotonically increasing <code>seq</code>. The stock table applies an update only if <code>seq &gt; last_seq</code> for that store:sku, so a redriven old message cannot overwrite a newer count; when a key has a message in retry, later messages for it are parked behind it.</p>
<p><b>5. Operations:</b> DLQ alert (count &gt; 0, page if &gt; 100/min), dashboard by error type and store, DLQ retention 30 days, redrive tool (filter by error type/time, dry run, rate-limited), and a contract test + schema registry compatibility check in the POS release pipeline so poison messages are rejected at produce time.</p>`,
        complexity: `<p>Healthy path unchanged. Poison costs one extra produce to the DLQ. During a 30 s DB failover, lag grows by ~30 s × rate and drains after recovery — within the 1-minute staleness target.</p>`,
        followUps: ['How do you redrive 50,000 DLQ messages without overwhelming the DB?', 'What if the poison message is caused by a consumer bug, not bad data?', 'How would share groups (Kafka 4.x) change this design?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 7 — Backpressure, flow control & consumer lag
     ===================================================================== */
  topics.push({
    title: 'Backpressure, Flow Control & Consumer Lag',
    analogy: `<p>A <b>kitchen sink</b>: the tap (producers) pours water, the drain (consumers) takes it away, and the basin (the broker's buffer) holds the difference. If the tap runs faster than the drain for long enough, the sink overflows. You have only a few choices: <b>widen the drain</b> (more consumers), <b>turn down the tap</b> (backpressure — tell producers to slow down), <b>use a bigger basin</b> (more retention/buffer), or <b>let some water go</b> (load shedding — drop low-priority work on purpose).</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> Producers and consumers rarely run at the same speed. <b>Backpressure</b> is any mechanism by which a slow part of the system makes the fast part slow down, instead of silently piling up work until something crashes (out of memory, full disk, timeouts everywhere).</p>
<p><b>The basic rate math</b> (per second):</p>
${H.table(['', 'value'], [['incoming rate λ', '1,200 msg/s'], ['one consumer', '200 msg/s'], ['consumers', '4 → capacity 800 msg/s'], ['lag growth', '1,200 − 800 = <span class="c-r">+400/s</span>'], ['after 10 minutes', '<span class="c-r">240,000 messages behind</span>']])}
<p>A queue only <b>buffers</b>; it does not create capacity. If average incoming rate is higher than average processing rate, lag grows forever. Queues are great for <b>bursts</b> (spiky traffic with a lower average), not for permanent overload.</p>
<p>🔵 <b>Backpressure tools, from producer to consumer:</b></p>
<ul>
<li><b>Pull-based consumption</b> (Kafka, SQS): a consumer only fetches what it can handle — the broker's log is the buffer. This is natural backpressure: lag grows on disk, not in RAM.</li>
<li><b>Bounded in-memory queues</b>: inside services, never use unbounded queues. When full, <b>block</b> the producer, or <b>reject</b> (HTTP 429 / 503 with Retry-After).</li>
<li><b>Prefetch / credit limits</b>: RabbitMQ <code>basic.qos</code> prefetch, gRPC/HTTP2 flow-control windows, Reactive Streams <code>request(n)</code> — the consumer grants "credits".</li>
<li><b>Pause/resume</b>: a Kafka consumer can <code>pause()</code> partitions while its downstream (DB) is struggling and keep heartbeating.</li>
<li><b>Producer throttling</b>: Kafka client and user quotas (bytes/s per client id) slow down greedy producers; <code>buffer.memory</code> + <code>max.block.ms</code> make <code>send()</code> block when the local buffer is full.</li>
<li><b>Autoscaling on lag</b>: add consumers when lag (in time) rises — up to the partition count.</li>
<li><b>Load shedding &amp; prioritisation</b>: drop or defer low-value work (analytics) to protect high-value work (payments); separate topics per priority.</li>
</ul>
<p><b>Little's Law</b> links it all: <code>items in system = arrival rate × time in system</code>. With 800/s arrivals and a 5-minute lag target, the system may hold at most 240,000 messages — that is your alert threshold.</p>`,
    clues: [
      '"traffic spikes 10× for a few minutes (flash sale, push notification)" → queue as a shock absorber + autoscale consumers',
      '"downstream DB can only take 2,000 writes/s" → limit consumer concurrency / batch writes, let lag absorb the rest',
      '"service runs out of memory under load" → unbounded in-memory queue; add bounds + backpressure',
      '"lag keeps growing even with max consumers" → capacity problem: more partitions, faster processing, or shed load',
      '"return 429 / Retry-After" → explicit backpressure to clients',
      '"prioritise paid users / critical events" → separate topics or priority queues + load shedding'
    ],
    viz: [{
      title: 'Lag grows, autoscaler adds consumers, partitions cap the fix',
      input: '300 80 3',
      inputLabel: 'incoming/s, per-consumer capacity/s, partitions (e.g. 300 80 3)',
      gen: function (input) {
        var t = String(input || '').trim().split(/[\s,]+/).map(Number);
        var lam = t[0], cap = t[1], P = t[2];
        if (!(lam > 0 && lam <= 100000) || !(cap > 0 && cap <= 100000) || !(P >= 1 && P <= 12)) throw new Error('Format: "300 80 3" — incoming rate, per-consumer rate, partitions (1-12)');
        var frames = [], lag = 0, consumers = 1, hist = [], labels = [];
        var maxCap = P * cap;
        frames.push(F('Producers send <b>' + lam + '/s</b>. Each consumer handles <b>' + cap + '/s</b>. The topic has <b>' + P + '</b> partitions, so at most ' + P + ' consumers can work (max capacity ' + maxCap + '/s). We start with 1 consumer. Autoscaler rule: if lag &gt; 2 × incoming rate, add one consumer.', [VARS('Setup', { 'incoming/s': lam, 'per consumer/s': cap, partitions: P, 'max capacity/s': maxCap }, { 'max capacity/s': maxCap >= lam ? 'ok' : 'bad' })]));
        for (var s = 1; s <= 10; s++) {
          var capNow = consumers * cap;
          lag = Math.max(0, lag + lam - capNow);
          hist.push(lag); labels.push('t' + s);
          var note = '';
          var scaled = false;
          if (lag > 2 * lam && consumers < P) { consumers++; scaled = true; note = ' Lag is above ' + (2 * lam) + ' → the autoscaler (e.g. KEDA on lag) <b>adds consumer #' + consumers + '</b>; a rebalance hands it a partition.'; }
          else if (lag > 2 * lam && consumers >= P) note = ' <span class="c-r">Already ' + consumers + ' consumers = partitions. Extra pods would sit idle.</span>';
          else if (lag === 0) note = ' <span class="c-g">Caught up — lag is zero.</span>';
          var hl = {}; hl[hist.length - 1] = lag === 0 ? 'ok' : (lam > capNow ? 'bad' : 'cur');
          frames.push(F('Second ' + s + ': in ' + lam + ', out ' + Math.min(capNow, lam + (hist.length > 1 ? hist[hist.length - 2] : 0)) + ' (capacity ' + capNow + '). Lag = <b>' + lag + '</b>.' + note, [{ type: 'bars', label: 'consumer lag (messages) over time', values: hist.slice(), idxLabels: labels.slice(), hl: hl }, VARS('Now', { consumers: consumers + (scaled ? ' (+1)' : ''), 'capacity/s': consumers * cap, 'lag': lag, 'lag in seconds': (lag / Math.max(1, cap * consumers)).toFixed(1) }, scaled ? { consumers: 'ok' } : {})]));
        }
        if (maxCap < lam) {
          frames.push(F('<span class="c-r">Even at full scale (' + P + ' × ' + cap + ' = ' + maxCap + '/s) capacity is below ' + lam + '/s — lag grows by ' + (lam - maxCap) + '/s forever.</span> Options: more partitions (then more consumers), faster processing (batch DB writes, cache lookups), apply backpressure to producers (quotas, 429), or shed low-priority traffic.', [TABLE('Fixes for permanent overload', ['fix', 'effect'], [['more partitions + consumers', 'raises the ceiling'], ['batch / optimise processing', 'raises per-consumer rate'], ['producer quotas / 429', 'lowers incoming rate'], ['load shedding / sampling', 'drops low-value work']], { 0: 'sel' })]));
        } else {
          frames.push(F('Capacity can exceed the incoming rate, so the queue absorbed the burst and scaling drained it. This is the healthy pattern: <b>buffer bursts in the log, scale consumers on lag, cap at the partition count</b>. Remember to scale back down slowly to avoid rebalance flapping.', [{ type: 'bars', label: 'consumer lag over time', values: hist.slice(), idxLabels: labels.slice() }]));
        }
        return frames;
      }
    }, {
      title: 'Bounded buffer: block or reject instead of running out of memory',
      gen: function () {
        var frames = [], buf = [], CAP = 4, rejected = 0, served = 0;
        var nodes = [B('CL', 'Clients', 10, 30), B('API', 'API (bounded queue = 4)', 45, 30), B('W', 'Worker (1 job / 2 ticks)', 85, 30)];
        var edges = [['CL', 'API', 'requests'], ['API', 'W', 'jobs']];
        var arrivals = [2, 2, 2, 2, 1, 0, 0, 0];
        for (var tick = 0; tick < arrivals.length; tick++) {
          var rej = 0, acc = 0;
          for (var a = 0; a < arrivals[tick]; a++) {
            if (buf.length < CAP) { buf.push('r' + (served + rejected + buf.length + 1)); acc++; } else { rej++; rejected++; }
          }
          var did = '';
          if (tick % 2 === 1 && buf.length) { buf.shift(); served++; did = ' The worker finishes one job.'; }
          var hl = {}; for (var i = 0; i < buf.length; i++) hl[i] = buf.length === CAP ? 'bad' : 'cur';
          frames.push(F('Tick ' + (tick + 1) + ': ' + arrivals[tick] + ' request(s) arrive, ' + acc + ' accepted' + (rej ? ', <span class="c-r">' + rej + ' rejected with 429 + Retry-After</span> because the queue is full' : '') + '.' + did + (buf.length === CAP ? ' The buffer is at its limit — this is backpressure: clients are told to slow down instead of the server swelling until it crashes.' : ''), [G('Flow', nodes, edges, { hl: rej ? { API: 'bad' } : { API: 'cur' }, ehl: rej ? { 'CL-API': 'bad' } : {} }), QUEUE('in-memory queue (capacity ' + CAP + ')', buf, hl, 'next', 'newest'), VARS('Totals', { served: served, rejected: rejected, queued: buf.length }, rej ? { rejected: 'bad' } : {})]));
        }
        frames.push(F('With an <b>unbounded</b> queue the same burst would have been "accepted" but each request would wait longer and longer, time out on the client anyway, and the server would eventually OOM. Rejecting early is kinder: clients retry with jitter, and latency for accepted requests stays predictable.', [TABLE('Bounded vs unbounded', ['', 'bounded + reject', 'unbounded'], [['memory', 'fixed', 'grows until OOM'], ['latency of accepted work', 'predictable', 'grows without limit'], ['client signal', '429 now', 'timeout later']], { 0: 'ok' })]));
        return frames;
      }
    }],
    code: [{ lang: 'java', title: 'Bounded queue that pushes back (compiles)', code: `import java.util.concurrent.*;

/** Producer threads block (or get rejected) when the worker falls behind: backpressure in one class. */
public class BoundedPipeline {
    public static void main(String[] args) throws Exception {
        BlockingQueue<Integer> queue = new ArrayBlockingQueue<>(4);   // NEVER unbounded in a hot path

        Thread worker = new Thread(() -> {
            try {
                while (true) {
                    Integer job = queue.take();          // waits if empty
                    if (job < 0) break;                  // poison pill = stop signal
                    Thread.sleep(20);                    // slow downstream (DB write, API call)
                    System.out.println("processed " + job);
                }
            } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
        });
        worker.start();

        int rejected = 0;
        for (int i = 1; i <= 12; i++) {
            // offer with timeout: wait a little, then give up -> caller returns 429 / retries later
            boolean accepted = queue.offer(i, 5, TimeUnit.MILLISECONDS);
            if (!accepted) { rejected++; System.out.println("rejected " + i + " (queue full -> 429)"); }
        }
        queue.put(-1);                                   // put() blocks until there is room
        worker.join();
        System.out.println("rejected total = " + rejected);
    }
}` }, { lang: 'java', check: false, title: 'Kafka consumer pause/resume when the DB is overloaded', code: `while (running) {
    ConsumerRecords<String, String> recs = consumer.poll(Duration.ofMillis(200)); // keeps heartbeating
    for (ConsumerRecord<String, String> r : recs) buffer.add(r);

    if (dbCircuitBreaker.isOpen() || buffer.size() > 5_000) {
        consumer.pause(consumer.assignment());     // stop fetching; lag grows on Kafka's disk, not in our RAM
    } else if (consumer.paused().size() > 0 && buffer.size() < 1_000) {
        consumer.resume(consumer.paused());        // downstream healthy again
    }
    int written = db.batchUpsert(buffer.drain(500));    // batch writes = more throughput per round trip
    commitProcessedOffsets();
}` }],
    codeTitle: ['Bounded queue (Java)', 'Pause/resume consumer (Kafka client)'],
    examples: [
      { title: 'Flash sale burst', html: `<p>Normal: 500 orders/s. Flash sale: 6,000/s for 5 minutes, then back to 500. Consumers handle 3,000/s at full scale. Lag after 5 min: (6,000 − 3,000) × 300 = <b>900,000</b>. Drain after the sale: 900,000 / (3,000 − 500) = <b>6 minutes</b>. Total delay ≤ ~11 min for the last order's confirmation email — acceptable for email, not for payment authorisation, which stays synchronous and is rate-limited at the edge instead.</p>${H.table(['phase', 'net rate', 'lag'], [['sale (5 min)', '+3,000/s', '0 → 900k'], ['after', '−2,500/s', '900k → 0 in 6 min']])}` },
      { title: 'Protecting the database with consumer concurrency', html: `<p>The DB handles 4,000 writes/s. 60 consumers × 200 writes/s = 12,000/s would melt it. Cap total write concurrency (consumer count × in-flight per consumer) and use batching (one multi-row INSERT of 500 instead of 500 INSERTs). Kafka lag absorbs the difference safely on disk. "Scale consumers" is only right if the <b>downstream</b> can take it.</p>` },
      { title: 'Lag in time, not messages', html: `<p>Two topics each have 50,000 messages of lag. Topic A receives 100,000/s → only 0.5 s behind. Topic B receives 10/s → 83 minutes behind! Alert on <b>time lag</b> (age of oldest unconsumed record, or lag ÷ consume rate) against an SLO like "notifications sent within 60 s".</p>` },
      { title: 'Priority lanes', html: `<p>A notification system sends OTP codes and marketing pushes through one topic. During a marketing blast, OTPs wait behind 20M marketing messages — users cannot log in. Fix: separate topics <code>notif.critical</code> and <code>notif.bulk</code> with separate consumer groups and capacity; bulk consumers are paused or rate-limited when critical lag rises. Kafka has no per-message priority; priorities are modelled as separate topics.</p>` }
    ],
    deepDive: `<p>🟣 <b>Where backpressure lives in Kafka.</b> Producer: <code>buffer.memory</code> (default 32 MB) holds unsent batches; when full, <code>send()</code> blocks up to <code>max.block.ms</code> (60 s) then throws — that is backpressure to the application. Broker: quotas (<code>producer_byte_rate</code>, <code>consumer_byte_rate</code>, request-time percentage) <b>delay responses</b> to throttle clients (throttle_time_ms). Consumer: <code>fetch.max.bytes</code>, <code>max.poll.records</code>, <code>pause()</code>.</p>
<p><b>Reactive Streams</b> (Java Flow, Project Reactor, Akka/Pekko Streams, RxJava) formalise backpressure: the subscriber calls <code>request(n)</code> and the publisher may emit at most n items. TCP does the same with its receive window; HTTP/2 and gRPC have per-stream flow-control windows.</p>
<p><b>Queueing theory intuition.</b> With utilisation ρ = λ/μ, average queue length for an M/M/1 queue is ρ/(1−ρ). At 50% utilisation ≈ 1 item; at 90% ≈ 9; at 99% ≈ 99. Latency explodes as you approach 100% — keep consumers below ~70–80% average utilisation so bursts can be absorbed.</p>
<p><b>Autoscaling pitfalls.</b> Each scale event triggers a rebalance (brief pause), so scaling too eagerly causes flapping. Use cool-down windows, scale on time-lag, cap at partitions, and pre-scale for known events (sales, sports finals). Serverless consumers (Lambda with Kafka/SQS triggers) scale automatically but can overwhelm downstream databases — set reserved/maximum concurrency.</p>
<p><b>Load shedding strategies:</b> drop oldest (fresh data matters more — live location), drop newest (preserve FIFO fairness), sample (keep 10% of debug logs), degrade (skip enrichment), or spill to cheap storage for later batch processing. Make it a <b>deliberate, observable</b> policy, never an accident.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> LLM APIs are the most common slow, rate-limited downstream today. Token-per-minute quotas mean the consumer must throttle by <b>tokens</b>, not just requests — teams use token-bucket rate limiters in front of model calls, priority queues (interactive users before batch jobs), and batch APIs (50% cheaper, results within hours) for low-priority work. Inference servers themselves (vLLM, TGI) use continuous batching and admission control: classic backpressure.</p>
<p><b>Use AI as a partner:</b> give it your rates and ask <code>compute lag after a 10-minute 5× burst and the drain time with N consumers</code>; ask it to write a KEDA ScaledObject or an SQS-based autoscaling policy — then check max replicas, cool-downs and DB limits yourself.</p>
<p><b>Where AI goes wrong:</b> it suggests "just add more consumers" ignoring the partition cap and DB limits; uses unbounded <code>LinkedBlockingQueue</code> or <code>asyncio.Queue()</code> with no maxsize; retries 429s instantly without honouring Retry-After.</p>
<p><b>What you must still own:</b> the rate math (arrivals vs capacity, drain time, Little's Law), where to buffer (disk, not RAM), which work to shed first, and the SLO-based lag alert.</p>`,
    problems: [{
      title: 'Black Friday: absorb a 12× spike without losing orders',
      level: 'Hard',
      tags: ['backpressure', 'autoscaling', 'lag', 'load shedding'],
      companies: ['Amazon', 'Shopify', 'Walmart', 'Flipkart'],
      statement: `<p>On Black Friday, checkout traffic jumps from 1,000 to 12,000 orders/s for ~20 minutes. Downstream consumers: fulfilment (DB-bound, max 5,000 writes/s on the warehouse DB), email (third-party API, 2,000/s quota), recommendations retraining feed (can lag hours). Design the messaging layer so checkout stays fast, nothing is lost, and downstream systems are not overwhelmed.</p>`,
      constraints: `<p>Checkout p99 under 500 ms. Order confirmation email within 30 min. Fulfilment within 15 min. Kafka topic <code>orders</code> currently 24 partitions.</p>`,
      example: `<p>Fulfilment capacity 5,000/s vs 12,000/s incoming → lag grows 7,000/s × 1,200 s = <span class="c-r">8.4M</span>. After the spike: drain at 5,000 − 1,000 = 4,000/s → 35 min. <span class="c-r">Misses the 15-min target</span> unless capacity rises or work per order shrinks.</p>`,
      brute: { why: `<p><b>Naive:</b> synchronous calls from checkout to fulfilment and email → checkout latency and errors follow the slowest dependency; the email quota causes checkout failures. <b>Naive 2:</b> autoscale consumers to 200 pods → only 24 get partitions, and those that do overwhelm the warehouse DB (5,000/s limit), causing timeouts and retry storms. <b>Naive 3:</b> unbounded in-memory buffering in consumers → OOM and redelivery of everything in flight.</p>` },
      mcq: { q: 'Fulfilment lag will exceed target because the DB tops out at 5,000 writes/s. Most effective fix?', options: ['Add 100 more consumer pods', 'Reduce writes per order (batching, multi-row upserts) and pre-scale partitions/consumers up to the DB limit', 'Increase Kafka retention', 'Switch to at-most-once'], answer: 1, explain: 'The bottleneck is DB writes; more pods do not help. Batching cuts round trips and raises effective throughput within the DB limit.' },
      hints: [`<p>Hint 1: Checkout's only job is to durably record the order (DB + outbox → Kafka). Everything else consumes asynchronously from the log, which buffers on disk.</p>`, `<p>Hint 2: For each consumer group compute: incoming vs capacity, peak lag, drain time. Compare to its SLO. Each group needs its own fix.</p>`, `<p>Hint 3: Fulfilment: batch writes to cut DB load per order; pre-scale partitions (e.g. 96) a week before; cap concurrency at DB limit. Email: token-bucket at 2,000/s, lag absorbs the rest (12k−2k) × 1,200 s = 12M → drain ~1.7 h — miss! → negotiate burst quota or a second provider. Recommendations: lowest priority, pause during the spike.</p>`],
      solution: {
        approach: `<p><b>Front door:</b> checkout writes order + outbox in one transaction (sharded DB sized for 12k writes/s) and returns. Edge rate-limiting with a queue-based "waiting room" protects checkout itself if traffic exceeds even that.</p>
<p><b>Kafka:</b> pre-create <code>orders</code> with 96 partitions (new topic and cut-over a week before, since adding partitions re-maps keys), RF=3, key=orderId. Producers: idempotent, <code>linger.ms=10</code>, zstd for batching.</p>
<p><b>Fulfilment group:</b> processes batches of 500 with multi-row upserts → 1 DB round trip per batch, effectively ~3× more orders per unit of DB capacity (~15,000 orders/s worth of logical writes within the 5,000 statements/s limit). Concurrency capped so total DB statements stay under 80% of the limit. Lag alert in time: page if &gt; 10 min.</p>
<p><b>Email group:</b> token-bucket limiter at the provider quota; the consumer pauses partitions when the bucket is empty (no busy retries). Lag: (12k − 2k) × 1,200 s = 12M messages → 1.7 h drain at 2k/s, which misses 30 min — so pre-negotiate a 10k/s burst quota or add a secondary provider for overflow, and send transactional confirmations on a <code>notif.critical</code> topic ahead of marketing.</p>
<p><b>Recommendations feed:</b> separate consumer group, paused automatically when <code>orders</code> broker load or critical lag is high; catches up overnight from the retained log (retention 7 days ensures nothing is lost).</p>
<p><b>Safety:</b> every consumer idempotent (redeliveries during rebalances), DLQs per group, circuit breakers pause consumption when downstream errors spike, KEDA scaling on time-lag with min replicas pre-raised before the event, load test at 15k/s a week before.</p>`,
        complexity: `<p>Disk buffer at peak: 12k/s × 1 KB × 1,200 s ≈ 14 GB per replica — trivial for Kafka. Fulfilment drain within ~10 min with batching. Email drain depends on the provider quota — the true bottleneck, identified by the rate math.</p>`,
        followUps: ['How would you implement the checkout "waiting room"?', 'What metric triggers pausing the recommendations group?', 'What changes if fulfilment must reserve inventory synchronously during checkout?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 8 — Event-driven design
     ===================================================================== */
  topics.push({
    title: 'Event-Driven Design: Events, Outbox, Choreography vs Orchestration, Event Sourcing & CQRS',
    analogy: `<p>In an old office, the manager walks to each desk: "Accounts, bill this. Warehouse, pack this. Mailroom, post this." That is <b>orchestration</b> — one boss directs everyone. In a modern office, someone rings a bell and shouts "<b>Order 55 was placed!</b>" Accounts, the warehouse and the mailroom each hear it and do their own job, then ring their own bells ("Order 55 paid!"). That is <b>choreography</b> — like dancers who each know their steps from the music. The shouted sentences are <b>events</b>: facts about something that already happened.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> In event-driven architecture (EDA), services communicate by publishing <b>events</b> — immutable facts in the past tense (<code>OrderPlaced</code>, <code>PaymentCaptured</code>) — rather than calling each other with commands. Producers do not know who listens; consumers react on their own.</p>
${H.table(['Message type', 'Meaning', 'Example', 'Receivers'], [
  ['<b>Command</b>', '"Please do X" (may be refused)', '<code>ChargeCard</code>', 'exactly one handler'],
  ['<b>Event</b>', '"X happened" (cannot be refused)', '<code>CardCharged</code>', 'zero or many subscribers'],
  ['<b>Query</b>', '"Tell me X"', '<code>GetOrder</code>', 'one, needs a reply (usually sync)']
])}
<p><b>Three styles of event payload:</b></p>
<ul>
<li><b>Event notification</b> — thin: <code>{orderId: 55}</code>. Consumers call back for details (extra load, may see a newer state).</li>
<li><b>Event-carried state transfer</b> — fat: the full order in the event. Consumers keep their own local copy, no callbacks. Bigger messages, schema discipline needed.</li>
<li><b>Event sourcing</b> — the events <b>are</b> the database: an account's state = replay of all its events. Full audit trail and time travel; harder queries, needs snapshots.</li>
</ul>
<p>🔵 <b>The patterns you need in every event-driven design:</b></p>
${H.table(['Pattern', 'Solves'], [
  ['<b>Transactional outbox</b>', '"Dual write": updating the DB and publishing to Kafka are two systems — a crash between them loses or invents events. Write the event into an <code>outbox</code> table in the <b>same DB transaction</b>; a relay (polling or CDC like Debezium) publishes it.'],
  ['<b>Idempotent consumer / inbox</b>', 'at-least-once duplicates (previous topics)'],
  ['<b>Saga</b>', 'a business transaction across services without 2PC: a sequence of local transactions with <b>compensating</b> actions on failure (release stock, refund)'],
  ['<b>Choreography</b>', 'services react to each other\'s events — loose coupling, but the flow is implicit and hard to see'],
  ['<b>Orchestration</b>', 'a workflow engine / orchestrator service (Temporal, AWS Step Functions, Camunda) sends commands and tracks state — explicit, easier to debug, more central'],
  ['<b>CQRS</b>', 'separate write model and read models; read models are built by consuming events (e.g. a search index, a dashboard table)'],
  ['<b>Schema registry</b>', 'producers and consumers evolve independently with compatibility rules (Avro/Protobuf/JSON Schema)']
])}
<p><b>Rule of thumb:</b> choreography for simple flows with few steps and independent reactions (notifications, analytics); orchestration once there are more than ~4 steps, branching, timeouts and compensations (order fulfilment, loan approval).</p>`,
    clues: [
      '"update the DB and publish an event reliably" → transactional outbox (+ CDC)',
      '"transaction across order, payment and inventory services" → saga with compensations, not 2PC',
      '"we need a full audit history / rebuild state at any point in time" → event sourcing',
      '"reads and writes have very different shapes / scale" → CQRS with event-built read models',
      '"nobody knows what happens after OrderPlaced" → choreography got too complex → orchestration / workflow engine',
      '"a new team needs to react without changing the producer" → publish domain events'
    ],
    viz: [{
      title: 'Order pipeline with Kafka: outbox → events → choreographed services',
      gen: function () {
        var frames = [];
        var nodes = [
          B('CL', 'Client', 6, 8), B('OS', 'Order Service', 26, 8), B('DB', 'Orders DB + outbox', 26, 34), B('CDC', 'CDC relay (Debezium)', 26, 60),
          B('TO', 'topic: orders', 55, 60), B('PAY', 'Payment Service', 55, 34), B('TP', 'topic: payments', 82, 34),
          B('INV', 'Inventory Service', 82, 60), B('SHIP', 'Shipping Service', 82, 8), B('NOTI', 'Notification Service', 55, 8)
        ];
        var edges = [['CL', 'OS', 'POST /orders'], ['OS', 'DB', '1 txn'], ['DB', 'CDC', 'WAL'], ['CDC', 'TO', 'publish'], ['TO', 'PAY'], ['TO', 'INV'], ['PAY', 'TP', 'PaymentCaptured'], ['TP', 'SHIP'], ['TP', 'NOTI'], ['INV', 'TO', 'StockReserved']];
        function g(hl, ehl, tags) { return G('Order pipeline', nodes, edges, { hl: hl, ehl: ehl, tags: tags || {}, h: 68 }); }
        frames.push(F('The big picture. Every arrow out of a service goes into a <b>topic</b>, not into another service. Let\'s follow order <b>o-55</b>.', [g({}, {})]));
        frames.push(F('1. The client calls <code>POST /orders</code> with an <b>Idempotency-Key</b> header (so a double-click does not create two orders).', [g({ CL: 'cur', OS: 'cur' }, { 'CL-OS': 'cur' })]));
        frames.push(F('2. In <b>one DB transaction</b> the Order Service inserts <code>orders(o-55, PENDING)</code> <b>and</b> <code>outbox(OrderPlaced o-55)</code>. Both commit or neither does — no dual-write problem. It returns <b>202 Accepted</b> with status PENDING.', [g({ OS: 'ok', DB: 'ok' }, { 'OS-DB': 'ok' }), TABLE('Same transaction', ['table', 'row'], [['orders', 'o-55, PENDING, ₹1,499'], ['outbox', 'OrderPlaced{o-55, items, total, version 1}']], { 0: 'ok', 1: 'ok' })]));
        frames.push(F('3. The CDC relay tails the DB\'s write-ahead log, sees the outbox row and publishes <b>OrderPlaced</b> to topic <code>orders</code>, key = <code>o-55</code>. If the relay crashes it re-publishes (at-least-once), so consumers dedupe on eventId.', [g({ CDC: 'cur', TO: 'ok' }, { 'DB-CDC': 'cur', 'CDC-TO': 'ok' })]));
        frames.push(F('4. Fan-out: the <b>Payment</b> and <b>Inventory</b> consumer groups both receive OrderPlaced. They work in parallel and independently.', [g({ TO: 'cur', PAY: 'cur', INV: 'cur' }, { 'TO-PAY': 'ok', 'TO-INV': 'ok' })]));
        frames.push(F('5. Inventory reserves stock (idempotent on orderId) and publishes <b>StockReserved</b> back onto <code>orders</code> with the same key, so it stays ordered with the order\'s other events.', [g({ INV: 'ok' }, { 'INV-TO': 'ok' })]));
        frames.push(F('6. Payment charges the card with Idempotency-Key = orderId and publishes <b>PaymentCaptured</b> to <code>payments</code>.', [g({ PAY: 'ok', TP: 'ok' }, { 'PAY-TP': 'ok' })]));
        frames.push(F('7. Shipping waits until it has seen <b>both</b> StockReserved and PaymentCaptured for o-55 (it keeps a small per-order state table), then creates the shipment. Notification sends "Your order is confirmed".', [g({ SHIP: 'ok', NOTI: 'ok' }, { 'TP-SHIP': 'ok', 'TP-NOTI': 'ok' }, { SHIP: 'ships o-55' })]));
        frames.push(F('Notice: no service called another directly. Adding a Fraud or Loyalty service = one new consumer group, no code change elsewhere. The cost: the flow is spread across services — you need tracing (trace id in headers) and a diagram like this one to understand it.', [g({ TO: 'sel', TP: 'sel' }, {}), TABLE('Topics and their consumer groups', ['topic', 'consumer groups'], [['orders', 'payment-svc, inventory-svc, (fraud-svc tomorrow)'], ['payments', 'shipping-svc, notification-svc']])]));
        return frames;
      }
    }, {
      title: 'Saga with compensation: payment fails, stock is released',
      input: 'fail',
      inputLabel: 'payment outcome: ok | fail',
      gen: function (input) {
        var outcome = String(input || '').trim().toLowerCase();
        if (['ok', 'fail'].indexOf(outcome) < 0) throw new Error('Type "ok" or "fail"');
        var frames = [], log = [];
        var nodes = [B('ORC', 'Order Saga (orchestrator)', 50, 6, 30), B('INV', 'Inventory', 15, 40), B('PAY', 'Payment', 50, 40), B('SHP', 'Shipping', 85, 40)];
        var edges = [['ORC', 'INV', 'ReserveStock'], ['ORC', 'PAY', 'ChargeCard'], ['ORC', 'SHP', 'CreateShipment']];
        function st(hl) { return TABLE('Saga log for o-55 (durable)', ['step', 'command / event', 'state'], log, hl || {}); }
        frames.push(F('Same order, now with an <b>orchestrated saga</b>: one component holds the steps and sends <b>commands</b> over Kafka topics, waiting for reply events. Each step is a <b>local</b> transaction in one service — no distributed lock, no 2PC.', [G('Saga', nodes, edges), st()]));
        log.push(['1', 'ReserveStock → StockReserved', 'done']);
        frames.push(F('Step 1: Inventory reserves 1 unit of SKU-9 in its own DB and replies <b>StockReserved</b>.', [G('Saga', nodes, edges, { hl: { INV: 'ok' }, ehl: { 'ORC-INV': 'ok' } }), st({ 0: 'ok' })]));
        if (outcome === 'ok') {
          log.push(['2', 'ChargeCard → PaymentCaptured', 'done']);
          frames.push(F('Step 2: Payment charges the card and replies <b>PaymentCaptured</b>.', [G('Saga', nodes, edges, { hl: { PAY: 'ok' }, ehl: { 'ORC-PAY': 'ok' } }), st({ 1: 'ok' })]));
          log.push(['3', 'CreateShipment → ShipmentCreated', 'done']);
          frames.push(F('Step 3: Shipping creates the shipment. The saga marks the order <b>CONFIRMED</b> and emits <b>OrderConfirmed</b>.', [G('Saga', nodes, edges, { hl: { SHP: 'ok', ORC: 'ok' }, ehl: { 'ORC-SHP': 'ok' } }), st({ 2: 'ok' })]));
          frames.push(F('Happy path complete. Try typing <b>fail</b> to see compensation.', [G('Saga', nodes, edges, { hl: { ORC: 'sel' } }), st()]));
        } else {
          log.push(['2', 'ChargeCard → PaymentDeclined', 'FAILED']);
          frames.push(F('Step 2: the card is <span class="c-r">declined</span>. We cannot "roll back" Inventory\'s already-committed transaction — it lives in another service\'s database.', [G('Saga', nodes, edges, { hl: { PAY: 'bad' }, ehl: { 'ORC-PAY': 'bad' } }), st({ 1: 'bad' })]));
          var e2 = edges.map(function (e) { return e[0] === 'ORC' && e[1] === 'INV' ? ['ORC', 'INV', 'ReleaseStock'] : e; });
          log.push(['C1', 'ReleaseStock → StockReleased', 'compensated']);
          frames.push(F('Instead the saga runs the <b>compensating action</b> for every completed step, in reverse: <b>ReleaseStock</b>. Compensations must be idempotent too (they may be retried).', [G('Saga', nodes, e2, { hl: { INV: 'cur', ORC: 'cur' }, ehl: { 'ORC-INV': 'cur' } }), st({ 2: 'cur' })]));
          log.push(['end', 'OrderCancelled (reason: payment declined)', 'CANCELLED']);
          frames.push(F('The saga marks the order <b>CANCELLED</b> and emits <b>OrderCancelled</b>; Notification tells the customer. The system is consistent again — <b>eventually</b>. For a few hundred ms the stock was reserved for an order that did not complete; that is the saga trade-off (no isolation between steps).', [G('Saga', nodes, e2, { hl: { ORC: 'sel', SHP: 'done' } }), st({ 3: 'sel' })]));
        }
        return frames;
      }
    }],
    code: [{ lang: 'sql', title: 'Transactional outbox (runs in SQLite)', code: `CREATE TABLE orders (id TEXT PRIMARY KEY, status TEXT NOT NULL, total INTEGER NOT NULL);
CREATE TABLE outbox (
  event_id   TEXT PRIMARY KEY,          -- consumers dedupe on this
  aggregate  TEXT NOT NULL,             -- becomes the Kafka key (orderId) -> per-order ordering
  type       TEXT NOT NULL,
  payload    TEXT NOT NULL,
  published  INTEGER NOT NULL DEFAULT 0
);

-- ONE transaction: the state change and the event are stored together (no dual write)
BEGIN;
INSERT INTO orders VALUES ('o-55', 'PENDING', 1499);
INSERT INTO outbox(event_id, aggregate, type, payload)
VALUES ('evt-001', 'o-55', 'OrderPlaced', '{"orderId":"o-55","total":1499,"version":1}');
COMMIT;

-- The relay (poller) reads unpublished rows in order, sends them to Kafka, then marks them.
SELECT event_id, aggregate AS kafka_key, type, payload FROM outbox WHERE published = 0 ORDER BY rowid LIMIT 100;
UPDATE outbox SET published = 1 WHERE event_id = 'evt-001';   -- crash before this? row is re-sent -> duplicates, never loss
SELECT * FROM outbox;` }, { lang: 'json', title: 'A well-formed event (CloudEvents-style envelope)', code: `{
  "specversion": "1.0",
  "id": "0192f5c4-7e1b-7a3c-9d2e-55aa01b2c3d4",
  "source": "order-service",
  "type": "com.shop.order.OrderPlaced.v1",
  "time": "2026-10-14T10:15:30.120Z",
  "subject": "o-55",
  "traceparent": "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
  "datacontenttype": "application/json",
  "data": {
    "orderId": "o-55",
    "customerId": "c-901",
    "items": [{ "sku": "SKU-9", "qty": 1, "price": 1499 }],
    "total": 1499,
    "currency": "INR",
    "orderVersion": 1
  }
}` }],
    codeTitle: ['Outbox table (SQL)', 'Event envelope (JSON)'],
    examples: [
      { title: 'The dual-write bug', html: `<p>Code: <code>db.save(order); kafka.send(OrderPlaced)</code>. Crash after save → order exists, nobody is told (stock never reserved). Reverse order: <code>kafka.send; db.save</code> → crash after send → payment charges an order that does not exist. Transactions cannot span Postgres and Kafka. The <b>outbox</b> fixes it: one local transaction, then publish asynchronously with at-least-once semantics.</p>${H.table(['Approach', 'crash between steps'], [['save then send', '<span class="c-r">lost event</span>'], ['send then save', '<span class="c-r">phantom event</span>'], ['outbox + relay', '<span class="c-g">duplicate at worst → deduped</span>']])}` },
      { title: 'CQRS read model', html: `<p>The Order Service's normalised Postgres tables are great for writes but slow for "show customer c-901's last 50 orders with item images and tracking status". A <b>read-model builder</b> consumes <code>orders</code>, <code>payments</code> and <code>shipments</code> events and maintains a denormalised document per customer in Elasticsearch/DynamoDB. Reads are fast; the price is <b>eventual consistency</b> (a new order appears after ~1 s), so the UI shows the just-created order from the API response rather than re-querying immediately.</p>` },
      { title: 'Event sourcing a bank account', html: `<p>Events for account 7: <code>Opened(0)</code>, <code>Deposited(1000)</code>, <code>Withdrew(300)</code>, <code>Deposited(50)</code>. Current balance = replay = <b>750</b>. "What was the balance last Tuesday?" — replay up to that time. Every 1,000 events, store a <b>snapshot</b> so loading does not replay millions. Kafka can store the event stream, but a database with optimistic concurrency per aggregate (EventStoreDB, Postgres with <code>UNIQUE(aggregate_id, version)</code>) is usually the source of truth because Kafka cannot do "append only if version = 41".</p>` },
      { title: 'Schema evolution without breaking consumers', html: `<p>OrderPlaced v1 has <code>total</code>. The team wants <code>totalMinor</code> (paise) + <code>currency</code>. With a schema registry in BACKWARD compatibility mode: <b>add</b> new optional fields with defaults (allowed), never rename or delete a required field (rejected at produce time). For a truly breaking change, publish <code>OrderPlaced.v2</code> to a new topic and run both until all consumers migrate.</p>` }
    ],
    deepDive: `<p>🟣 <b>Outbox relay options.</b> <i>Polling publisher</i>: <code>SELECT … WHERE published = false ORDER BY id FOR UPDATE SKIP LOCKED</code>, simple but adds DB load and latency. <i>CDC (log tailing)</i>: Debezium reads the Postgres WAL / MySQL binlog and publishes outbox rows (the Outbox Event Router SMT routes by aggregate type and uses aggregate id as key) — low latency, no polling load, but one more system. Either way, delete or archive outbox rows after publishing.</p>
<p><b>Inbox pattern</b> is the mirror image: consumers record received event ids in an <code>inbox</code> table in the same transaction as their state change — the idempotent consumer from Topic 4.</p>
<p><b>Choreography failure modes:</b> cyclic event chains (A reacts to B reacts to A), "event spaghetti" with no owner of the end-to-end flow, and hidden coupling through event schemas. Mitigations: an event catalogue (AsyncAPI specs), domain ownership of each topic, distributed tracing, and switching to orchestration for complex flows. <b>Durable execution engines</b> (Temporal, Restate, AWS Step Functions) make orchestration code look like normal sequential code while persisting every step — widely adopted by 2026 for sagas.</p>
<p><b>Saga isolation anomalies.</b> Sagas are ACD without I: other transactions can see intermediate states (stock reserved but later released). Countermeasures: semantic locks (status = PENDING), commutative updates, re-reading values before acting, and ordering steps so the most likely-to-fail or non-compensatable step (e.g. charging a card, sending an email) goes <b>last</b> ("pivot transaction").</p>
<p><b>Event design tips:</b> past-tense names; include the entity id, a unique event id, the occurred-at time, a version/sequence per entity, and a trace id; keep events about <b>business facts</b>, not table rows (CDC of raw tables leaks your schema to everyone). Topic per aggregate type (<code>orders</code>, <code>payments</code>) keeps per-entity order; topic per event type breaks it.</p>
<p><b>Stream processing</b> (Kafka Streams, Flink) turns events into continuously-updated results — joins, windowed aggregates, materialised views — and is the natural engine for CQRS read models at scale. Covered in depth in the Storage &amp; Data Processing module.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> AI agents fit naturally into event-driven systems: an agent subscribes to <code>TicketCreated</code>, drafts a reply, and publishes <code>ReplyDrafted</code> for a human to approve. Agent workflows themselves are long-running sagas (call tool, wait, call model, retry), so durable-execution engines and event logs give them crash recovery, audit trails and replay for evaluation. CDC → embedding → vector DB pipelines keep RAG knowledge fresh within seconds of a database change.</p>
<p><b>Use AI as a partner:</b> ask it to draw the event flow (who publishes, who subscribes) from your codebase, to write AsyncAPI specs for each topic, or to find dual writes (<code>repository.save</code> followed by <code>kafkaTemplate.send</code>) — it is very good at spotting that pattern.</p>
<p><b>Where AI goes wrong:</b> it designs everything as choreography with 12 services reacting to each other (unmaintainable), proposes 2PC across microservices, wraps <code>save + send</code> in <code>@Transactional</code> believing it makes Kafka atomic with the DB, and forgets compensations for steps that cannot be undone (an email already sent).</p>
<p><b>What you must still own:</b> drawing the event flow, choosing choreography vs orchestration, placing the outbox, defining compensations, and explaining eventual consistency to product owners in user terms.</p>`,
    problems: [{
      title: 'Design an order processing pipeline with Kafka',
      level: 'Hard',
      tags: ['event-driven', 'kafka', 'outbox', 'saga', 'idempotency'],
      companies: ['Amazon', 'Uber Eats', 'Swiggy', 'Shopify', 'DoorDash'],
      statement: `<p>Design the backend pipeline for a food-delivery platform: a customer places an order → payment is authorised → the restaurant accepts → a courier is assigned → the order is delivered → the customer is notified at each step and analytics records everything. Services: Order, Payment, Restaurant, Dispatch, Notification, Analytics. Use Kafka. Explain topics, keys, partitions, consumer groups, delivery guarantees, failure handling and how a new service could be added.</p>`,
      constraints: `<p>Peak 15,000 orders/min (250/s), ~12 events per order lifecycle → ~3,000 events/s. No order lost or charged twice. Customer sees status updates within 2 s. Restaurant rejects ~3% of orders (must refund/void). Retain events 7 days; analytics must be able to replay.</p>`,
      example: `<p>Order <code>o-9</code>: <span class="c-g">OrderPlaced</span> → <span class="c-g">PaymentAuthorized</span> → <span class="c-r">RestaurantRejected</span> → saga compensation <span class="c-y">VoidAuthorization</span> → <span class="c-g">OrderCancelled</span> → customer notified "restaurant could not accept, you were not charged".</p>`,
      brute: { why: `<p><b>Naive:</b> the Order service calls Payment, Restaurant, Dispatch and Notification synchronously in one HTTP request. Restaurant acceptance takes minutes (a human taps a tablet), so requests hang; any failure leaves a half-done order (charged, not accepted); retries double-charge; adding analytics means editing the Order service. A naive Kafka version that does <code>db.save(); producer.send()</code> loses events on crashes and uses no key, so <code>OrderCancelled</code> can be processed before <code>OrderPlaced</code>.</p>` },
      mcq: { q: 'Restaurant acceptance takes up to 5 minutes and may be rejected. Best way to coordinate payment + restaurant + dispatch?', options: ['A distributed 2PC transaction across the three services', 'A saga (orchestrated by an Order workflow) with compensations such as voiding the payment authorisation', 'One synchronous HTTP call chain with a 5-minute timeout', 'Let each service poll the Order DB'], answer: 1, explain: 'Long-running, multi-service, may fail midway → saga with compensating actions; 2PC would hold locks for minutes.' },
      hints: [`<p>Hint 1: List the domain events and which service owns each. Topic per aggregate: <code>orders</code>, <code>payments</code>, <code>dispatch</code>; key = orderId everywhere so one order's events are ordered within a topic.</p>`, `<p>Hint 2: Order service writes state + outbox in one transaction; an orchestrated saga (Temporal or an Order state machine consuming reply events) drives authorise → restaurant accept → dispatch, with compensations (void authorisation; capture only at delivery).</p>`, `<p>Hint 3: Every consumer idempotent (eventId / orderId+version), retries with backoff, DLQ per group, lag alerts in time. Notification and Analytics are pure subscribers (own consumer groups). Size partitions: 3,000 events/s is small — 24–48 partitions for consumer parallelism and growth.</p>`],
      solution: {
        approach: `<p><b>Topics</b> (RF=3, min.insync=2, 7-day retention, key = <code>orderId</code>, 48 partitions): <code>orders</code> (OrderPlaced, OrderAccepted, OrderCancelled, OrderDelivered — owned by Order), <code>payments</code> (PaymentAuthorized/Declined/Voided/Captured — owned by Payment), <code>restaurant-decisions</code> (Accepted/Rejected), <code>dispatch</code> (CourierAssigned, PickedUp, Delivered), plus command topics for the saga (<code>payment-commands</code>, <code>restaurant-commands</code>, <code>dispatch-commands</code>).</p>
<p><b>Write path:</b> <code>POST /orders</code> with Idempotency-Key → Order DB insert (status PLACED) + outbox OrderPlaced in one transaction → 202. Debezium publishes outbox rows to Kafka (idempotent producer, acks=all).</p>
<p><b>Saga (orchestration)</b> in the Order service (or Temporal workflow): on OrderPlaced send <code>AuthorizePayment</code> (authorise, not capture) → on PaymentAuthorized send <code>RequestAcceptance</code> to the restaurant tablet (timeout 5 min) → on Accepted send <code>AssignCourier</code> → on Delivered send <code>CapturePayment</code> and emit OrderDelivered. <b>Compensations:</b> restaurant rejects or times out → <code>VoidAuthorization</code> → OrderCancelled; no courier in 15 min → notify restaurant + void + cancel. Saga state is persisted per order (status, step, version) so it resumes after crashes.</p>
<p><b>Consumers:</b> each service is its own consumer group, manual commits after processing, idempotent on eventId with an inbox table; payment calls use Idempotency-Key = orderId+step. Notification group subscribes to <code>orders</code>, <code>dispatch</code> and <code>payments</code> and pushes WebSocket/push updates (&lt; 2 s end-to-end, lag alert at 1 s). Analytics group loads everything to the lake (and can replay from retention). <b>Failures:</b> transient → backoff with jitter + retry topics; permanent → DLQ per group with alerting and redrive tooling; circuit breakers pause consumption when downstreams fail. <b>Ordering:</b> key = orderId everywhere plus <code>orderVersion</code> in events so consumers reading multiple topics can discard stale updates. <b>Evolution:</b> schema registry (Protobuf, BACKWARD compatible); a new Loyalty service just adds a consumer group on <code>orders</code> and replays history if needed.</p>`,
        complexity: `<p>~3,000 events/s × ~1 KB = 3 MB/s — light for Kafka (3 brokers suffice; 48 partitions give consumer headroom). Storage: 3 MB/s × 7 days × RF 3 ≈ 5.4 TB before compression. End-to-end status latency ≈ outbox CDC (~100 ms) + consumer processing (~50 ms) + push (~200 ms).</p>`,
        followUps: ['Choreography instead of orchestration — what changes and what gets harder?', 'How do you show the customer a consistent status if Notification consumes three topics?', 'How would you migrate from the synchronous design without downtime (strangler + dual publish)?']
      }
    }]
  });

  /* =====================================================================
     PRACTICE — Easy → Medium → Hard
     ===================================================================== */
  practice.push({
    title: 'Queue, pub/sub, or neither? Four scenarios',
    level: 'Easy',
    tags: ['queue', 'pub/sub', 'fundamentals'],
    companies: ['Amazon', 'Microsoft', 'Atlassian'],
    statement: `<p>For each scenario pick <b>work queue</b>, <b>pub/sub</b>, or <b>synchronous call</b>, and say why: (a) generate PDF invoices after checkout; (b) when a product price changes, update search, the cache and the recommendation feature store; (c) check if a username is available while the user types; (d) process uploaded videos into 5 resolutions.</p>`,
    constraints: `<p>Explain each choice in one or two sentences, naming what the user waits for.</p>`,
    example: `<p>(a) <span class="c-g">queue</span> — one worker per invoice, user does not wait. (b) <span class="c-g">pub/sub</span> — three independent reactions to one fact. (c) <span class="c-y">sync</span> — user needs the answer now. (d) <span class="c-g">queue</span> (or fan-out to 5 jobs) — slow background work.</p>`,
    brute: { why: `<p><b>Naive:</b> "make everything async with Kafka". The username check becomes a request → event → response-event round trip with correlation ids, adding latency and complexity for a 5 ms DB lookup. The opposite naive answer — everything synchronous — makes checkout wait seconds for PDF generation and couples price updates to three downstream systems' uptime.</p>` },
    mcq: { q: 'A user is waiting for the result and it takes 5 ms. Best choice?', options: ['Kafka topic + reply topic', 'Synchronous call', 'SQS queue', 'Pub/sub'], answer: 1, explain: 'Messaging helps when the caller does not need the result now or the work is slow/unreliable. A fast lookup the user waits for is a plain sync call.' },
    hints: [`<p>Hint 1: Ask "does the user wait for this result right now?" If yes, it is usually a synchronous call.</p>`, `<p>Hint 2: Ask "how many different services must react?" One → queue. Many independent ones → pub/sub.</p>`, `<p>Hint 3: Slow, retryable background work (PDFs, video) → queue with workers, retries and a DLQ. Video: one job per resolution lets 5 workers run in parallel.</p>`],
    solution: {
      approach: `<p>(a) <b>Queue</b>: checkout enqueues <code>GenerateInvoice{orderId}</code>; a worker pool renders and stores the PDF, then emails a link. Idempotent on orderId. (b) <b>Pub/sub</b>: the catalog service publishes <code>PriceChanged{sku, price, version}</code> keyed by sku; search indexer, cache invalidator and feature-store updater are separate subscriptions/consumer groups; each ignores older versions. (c) <b>Synchronous</b> GET against a read replica or a Bloom-filter-backed endpoint with a debounce on the client — fast, user-facing. (d) <b>Queue</b>: upload completes → one <code>TranscodeRequested</code> event fans out to 5 transcode jobs (one per resolution) on a work queue; a job tracker marks the video ready when all 5 finish; failures retry, then DLQ.</p>`,
      complexity: `<p>All choices are O(1) work per event; the trade-off is latency (sync) vs decoupling and buffering (async).</p>`,
      followUps: ['What if marketing wants (a) to happen only after payment settles?', 'How would you show video processing progress to the user?']
    }
  });

  practice.push({
    title: 'How many partitions do we need?',
    level: 'Easy',
    tags: ['kafka', 'partitions', 'estimation'],
    companies: ['LinkedIn', 'Confluent', 'Uber'],
    statement: `<p>An IoT platform ingests 80,000 sensor readings/s (500 bytes each). The processing consumer handles 2,500 readings/s per instance. A partition can safely take ~10 MB/s of writes. Ordering is needed per device. How many partitions, and why not just 2?</p>`,
    constraints: `<p>Plan for 3× growth over two years. Partition count cannot be changed later without re-mapping keys.</p>`,
    example: `<p>Bytes: 80,000 × 500 B = 40 MB/s → write bound 4 partitions. Consumer bound: 80,000 / 2,500 = <span class="c-g">32</span>. With 3× growth: 96 → choose <span class="c-g">96 or 120</span>.</p>`,
    brute: { why: `<p><b>Naive:</b> size by bytes only (4 partitions) → at most 4 consumers × 2,500 = 10,000/s, 8× too slow; lag grows by 70,000/s. Or "one partition per device" (millions) → impossible metadata overhead. Partitions must satisfy the <b>consumer parallelism</b> bound, which is usually the binding one.</p>` },
    mcq: { q: 'Within one consumer group, the max number of active consumers equals…', options: ['Number of brokers', 'Number of partitions', 'Replication factor', 'Unlimited'], answer: 1, explain: 'Each partition is assigned to at most one consumer in a group.' },
    hints: [`<p>Hint 1: Compute two bounds: write throughput ÷ per-partition write rate, and event rate ÷ per-consumer rate.</p>`, `<p>Hint 2: Take the larger, multiply by growth, round to a number with many divisors (e.g. 96, 120) so consumer counts divide evenly.</p>`, `<p>Hint 3: Key = deviceId keeps per-device order; with millions of devices the spread is even. Check for "chatty" devices that could make hot partitions.</p>`],
    solution: {
      approach: `<p>Write bound: 40 MB/s ÷ 10 MB/s = 4. Consumer bound: 80,000 ÷ 2,500 = 32 instances → 32 partitions minimum. Growth 3× → 96. Choose <b>96 partitions</b> (divisible by 1, 2, 3, 4, 6, 8, 12, 16, 24, 32, 48) so 32, 48 or 96 consumers each get an equal share. Key = deviceId (per-device order, millions of keys → even distribution). RF=3, acks=all if readings matter, or acks=1 if occasional loss is acceptable for telemetry. Two partitions would cap the group at 2 consumers = 5,000/s, 16× below need.</p>`,
      complexity: `<p>96 partitions × ~830 readings/s each at today's load; each consumer at ~33% utilisation now, ~100% at 3× — re-evaluate before that.</p>`,
      followUps: ['What if one device type sends 100× more than others?', 'How does batching in the consumer change the per-instance rate?']
    }
  });

  practice.push({
    title: 'Read the lag dashboard',
    level: 'Easy',
    tags: ['consumer lag', 'monitoring', 'offsets'],
    companies: ['Datadog', 'Netflix', 'Stripe'],
    statement: `<p>Group <code>email-sender</code> on topic <code>notifications</code> (4 partitions) shows: P0 end 10,400 / committed 10,390; P1 end 9,900 / committed 9,900; P2 end 15,200 / committed 3,100; P3 end 10,050 / committed 10,020. The group has 4 consumers. Each consumer sends 150 emails/s; each partition receives ~100/s. What is wrong, and what do you check first?</p>`,
    constraints: `<p>SLO: emails sent within 60 s of the event.</p>`,
    example: `${H.table(['partition', 'lag', 'lag in time'], [['P0', '10', '~0.1 s'], ['P1', '0', '0'], ['P2', '<span class="c-r">12,100</span>', '<span class="c-r">~2 min+, growing?</span>'], ['P3', '30', '~0.3 s']])}<p>Only P2 is behind → not a capacity problem of the whole group.</p>`,
    brute: { why: `<p><b>Naive reaction:</b> "scale the group to 8 consumers". With 4 partitions the extra 4 sit idle, and the problem is isolated to P2 anyway. Another naive move: reset P2 to latest to "clear the lag" — that silently skips 12,100 emails.</p>` },
    mcq: { q: 'Lag is high on one partition only. Most likely causes?', options: ['Too few brokers', 'A hot key in P2, or the consumer owning P2 is stuck (poison message / slow downstream / crash loop)', 'Retention too short', 'Replication factor too low'], answer: 1, explain: 'Single-partition lag points to that partition\'s data (hot key, poison message) or its specific consumer.' },
    hints: [`<p>Hint 1: Lag = end − committed. Compute it per partition and see if it is uniform or isolated.</p>`, `<p>Hint 2: If isolated: is the committed offset moving at all? Not moving → stuck consumer or poison message. Moving slowly → hot key or slow consumer host.</p>`, `<p>Hint 3: Check the owning consumer's logs/errors, the incoming rate per partition (key skew), and whether a rebalance is looping. Fix the cause; never skip offsets without a plan.</p>`],
    solution: {
      approach: `<p>Lags: P0 10, P1 0, P2 <b>12,100</b>, P3 30. P2 alone is behind, at ~100/s incoming it is ≥ 2 minutes late → SLO breached. Check in order: (1) is P2's committed offset advancing? If frozen at 3,100, the consumer is stuck on a <b>poison message</b> at offset 3,100 (look for repeated exceptions with that offset) → route it to the DLQ and move on. (2) If advancing slowly, check incoming rate per partition — a <b>hot key</b> (e.g. a bulk sender using one key) may send 1,000/s into P2 → salt the key or move bulk mail to its own topic. (3) Check the owning pod (CPU throttling, GC, a slow SMTP connection) and rebalance count (crash loop). After the fix, P2 drains at 150 − 100 = 50/s → 12,100 / 50 ≈ 4 min; temporarily boost per-consumer concurrency (keyed lanes) to drain faster. Alert on time-lag per partition &gt; 60 s.</p>`,
      complexity: `<p>Diagnosis is O(partitions) — read four numbers; the key skill is separating group-wide capacity problems from single-partition problems.</p>`,
      followUps: ['How would you alert on "committed offset not moving" separately from "lag high"?', 'What does lag look like during a rebalance storm?']
    }
  });

  practice.push({
    title: 'Pick durability settings for two topics',
    level: 'Easy',
    tags: ['kafka', 'acks', 'replication', 'durability'],
    companies: ['Goldman Sachs', 'Confluent', 'Cloudflare'],
    statement: `<p>Choose replication factor, <code>acks</code>, <code>min.insync.replicas</code> and retention for: (1) <code>debug-logs</code> — 500 MB/s, losing a few seconds of logs during a broker crash is fine, cost matters; (2) <code>ledger-entries</code> — 2 MB/s, every acknowledged entry must survive any single broker failure, and must be replayable for 30 days.</p>`,
    constraints: `<p>3 availability zones. Brokers fail a few times per year.</p>`,
    example: `<p>(1) RF 2, acks=1, min.insync 1, retention 1 day → <span class="c-y">cheap, may lose a little</span>. (2) RF 3 across AZs, acks=all, min.insync 2, retention 30 days → <span class="c-g">no acked loss with one broker down, still writable</span>.</p>`,
    brute: { why: `<p><b>Naive:</b> the same "safe" settings everywhere — RF 3 + acks=all for 500 MB/s of debug logs triples disk and cross-AZ network costs for data nobody needs. Or the same "fast" settings everywhere — acks=1 on the ledger loses acknowledged entries if the leader dies before followers copy them. Also naive: RF 3 with min.insync 3 → a single broker outage blocks all ledger writes.</p>` },
    mcq: { q: 'RF=3, acks=all, min.insync.replicas=2. One broker dies. What happens to writes?', options: ['They fail', 'They continue (2 in-sync replicas remain) with no acknowledged data lost', 'They continue but may lose data', 'The topic becomes read-only forever'], answer: 1, explain: 'Two ISR members ≥ min.insync 2, so acks=all writes succeed and every ack means two copies exist.' },
    hints: [`<p>Hint 1: acks decides how many copies exist when the producer is told "OK". min.insync.replicas decides how many must be alive to accept writes.</p>`, `<p>Hint 2: The classic durable combo is RF=3, min.insync=2, acks=all — survives one failure without losing acked data or availability.</p>`, `<p>Hint 3: For cheap, loss-tolerant data, lower RF and use acks=1 (or even 0), short retention, compression.</p>`],
    solution: {
      approach: `<p><b>debug-logs:</b> RF=2 (one spare copy for broker restarts), <code>acks=1</code>, <code>min.insync.replicas=1</code>, null key with sticky partitioner, <code>compression.type=zstd</code>, <code>linger.ms=50</code> for big batches, retention 24 h (or ship to object storage via tiered storage / a sink connector). Accepts small loss on leader crash, halves disk vs RF 3.</p>
<p><b>ledger-entries:</b> RF=3 with <code>broker.rack</code> spreading replicas across the 3 AZs, <code>acks=all</code>, <code>min.insync.replicas=2</code>, idempotent producer (default), <code>unclean.leader.election.enable=false</code>, retention 30 days (or tiered storage), key = accountId. Any single broker or AZ failure loses no acknowledged entry and keeps the topic writable. Monitor under-replicated partitions and ISR shrink events.</p>`,
      complexity: `<p>Logs: 500 MB/s × 86,400 × 2 ≈ 86 TB/day raw (≈ 20 TB compressed). Ledger: 2 MB/s × 30 d × 3 ≈ 15.5 TB raw — small despite the stronger settings.</p>`,
      followUps: ['Why is min.insync.replicas=3 with RF=3 usually a bad idea?', 'What does acks=all cost in latency?']
    }
  });

  practice.push({
    title: 'Notification fan-out: email, SMS and push',
    level: 'Medium',
    tags: ['pub/sub', 'fan-out', 'rate limiting', 'priority'],
    companies: ['Meta', 'Uber', 'Airbnb'],
    statement: `<p>Many services want to notify users ("ride arriving", "OTP", "weekly digest"). Each notification may go to email, SMS and/or push depending on user preferences. Providers have rate limits (SMS 500/s, email 3,000/s). OTPs must arrive within 10 s even during a 30M-user marketing blast. Design the messaging layer.</p>`,
    constraints: `<p>50k notifications/s at blast peak; OTP volume ~200/s. No duplicate OTP SMS (costs money and confuses users).</p>`,
    example: `<p><code>NotificationRequested{userId:9, template:OTP, priority:critical}</code> → preference lookup → <span class="c-g">sms.critical</span> topic → SMS sender → delivered in 2 s while <span class="c-y">push.bulk</span> holds 12M marketing messages being drained at the provider limit.</p>`,
    brute: { why: `<p><b>Naive:</b> one <code>notifications</code> topic and one consumer group that calls all providers inline. The marketing blast fills the topic; OTPs queue behind millions of digests (no priorities in a Kafka partition); a slow SMS provider stalls email too; retries resend SMS duplicates.</p>` },
    mcq: { q: 'How do you give OTPs priority over marketing in Kafka?', options: ['Set a priority header', 'Separate topics (critical vs bulk) with separate consumer groups and capacity', 'Use more partitions', 'Lower retention for marketing'], answer: 1, explain: 'Kafka has no per-message priority; separate topics and capacity are the standard way.' },
    hints: [`<p>Hint 1: Two stages: a router that expands one request into per-channel messages, then per-channel senders.</p>`, `<p>Hint 2: Separate topics by channel AND priority: <code>sms.critical</code>, <code>sms.bulk</code>, … Each sender group has its own rate limiter and DLQ.</p>`, `<p>Hint 3: Dedupe with notificationId + channel in a fast store (Redis SET NX with TTL) before calling the provider; pass it as the provider's idempotency key where supported.</p>`],
    solution: {
      approach: `<p><b>Ingress:</b> producers publish <code>NotificationRequested{notificationId, userId, template, priority, data}</code> to <code>notif.requests.critical</code> or <code>notif.requests.bulk</code> (key = userId). <b>Router</b> consumer groups (one per priority) look up user preferences/quiet hours and fan out to channel topics: <code>email.critical/bulk</code>, <code>sms.critical/bulk</code>, <code>push.critical/bulk</code>. <b>Senders:</b> one consumer group per channel+priority, each with a token-bucket limiter at the provider quota; the critical group gets a reserved share (e.g. SMS 150/s of 500/s reserved) and bulk senders pause when critical lag &gt; 2 s. <b>Idempotency:</b> <code>SET dedupe:{notificationId}:{channel} NX EX 86400</code> before sending; provider idempotency keys when available. <b>Failures:</b> 429/5xx → backoff + retry topics; invalid phone/email → DLQ + mark contact invalid; provider outage → circuit breaker and failover to a secondary provider. <b>Observability:</b> time-lag per topic, delivery receipts consumed back as events (<code>NotificationDelivered</code>).</p>`,
      complexity: `<p>Blast: 30M × ~1.5 channels ≈ 45M sends, drained at provider limits (email 3,000/s → ~2.8 h); OTP path stays under seconds because it never shares a partition with bulk.</p>`,
      followUps: ['How do you respect user quiet hours across time zones?', 'How do you avoid sending a digest to a user who unsubscribed 1 minute ago?']
    }
  });

  practice.push({
    title: 'Driver location stream: ordering and "latest wins"',
    level: 'Medium',
    tags: ['ordering', 'partition key', 'streaming'],
    companies: ['Uber', 'Lyft', 'Grab', 'Ola'],
    statement: `<p>500k online drivers send GPS every 4 s. Consumers: (1) a live map / matching service that needs each driver's latest position within 1 s; (2) a trip-distance calculator that needs every point of a trip in order; (3) analytics. Design topics, keys and consumer logic, including what to do with late or duplicate pings.</p>`,
    constraints: `<p>~125k pings/s, ~200 bytes each. Mobile networks deliver pings late, out of order, or twice.</p>`,
    example: `<p>Driver d7 pings seq 100 (t=0), 101 (t=4), arriving 101 then 100. Live map: keep <span class="c-g">101</span>, drop 100 as stale. Trip calculator: buffer briefly and order by seq → 100, 101 for distance.</p>`,
    brute: { why: `<p><b>Naive:</b> no key → pings for one driver spread across partitions and consumers, so the live map flickers backwards. Writing every ping to a database row with <code>UPDATE … SET lat, lng</code> regardless of seq lets a late ping overwrite a newer one. Using one partition for "global order" caps throughput at one consumer.</p>` },
    mcq: { q: 'A late ping (seq 100) arrives after seq 101 for the live map. Do what?', options: ['Overwrite — it arrived last', 'Ignore it because its seq is older than the stored one', 'Crash', 'Send to DLQ'], answer: 1, explain: 'Latest-wins state uses the event\'s own sequence/version, not arrival order.' },
    hints: [`<p>Hint 1: Key = driverId keeps each driver's pings in one partition and one consumer.</p>`, `<p>Hint 2: Ordering in Kafka is by arrival at the broker, not by device time — include a per-driver seq and the device timestamp.</p>`, `<p>Hint 3: Live map: conditional upsert "only if seq &gt; stored seq" into an in-memory/Redis geo index. Trip distance: stream processor with a small reorder buffer (event-time windows + allowed lateness).</p>`],
    solution: {
      approach: `<p><b>Topic</b> <code>driver-locations</code>, key = driverId, ~64 partitions (125k/s ÷ ~5k/s per consumer = 25, ×2–3 headroom), RF=3, acks=1 or all (a lost ping is tolerable; the next one arrives in 4 s), retention 24 h; plus a <b>compacted</b> topic <code>driver-latest</code> holding the last position per driver for fast bootstrap. <b>Live map consumer:</b> keeps driverId → (seq, lat, lng, ts) in memory/Redis GEO; applies a ping only if seq &gt; stored seq (drops duplicates and stale ones); publishes to <code>driver-latest</code>. <b>Trip calculator:</b> Flink/Kafka Streams keyed by tripId (re-keyed from driver pings via a join with trip assignments), event-time processing with watermarks and allowed lateness of ~30 s, orders points by seq and computes distance; very late points trigger a correction event. <b>Analytics:</b> its own group writing to the lake in batches. Duplicates are harmless everywhere because of seq checks.</p>`,
      complexity: `<p>125k × 200 B = 25 MB/s ingest; live map state 500k × ~50 B = 25 MB — fits in memory on each node; O(1) per ping.</p>`,
      followUps: ['How do you shard the live map by geography instead of driver for nearby-driver queries?', 'What happens to the trip calculator during a rebalance?']
    }
  });

  practice.push({
    title: 'Rebuild a search index by replaying events',
    level: 'Medium',
    tags: ['replay', 'consumer groups', 'compaction', 'CQRS'],
    companies: ['Elastic', 'Shopify', 'Etsy'],
    statement: `<p>The product search index (Elasticsearch) is built by a consumer of <code>product-events</code>. A mapping bug corrupted the index, and a new analyzer requires a full rebuild of 80M products — without taking search offline and without missing updates that happen during the rebuild. <code>product-events</code> has 7-day retention.</p>`,
    constraints: `<p>Products change ~2,000/s. Most products have not changed in months (older than retention).</p>`,
    example: `<p>Problem: products last updated 3 months ago are <span class="c-r">not in the 7-day topic</span> anymore. Replaying it alone rebuilds only recently changed products.</p>`,
    brute: { why: `<p><b>Naive 1:</b> reset the existing consumer group to earliest → only 7 days of history, so most products are missing; and you overwrite the live index while users search it. <b>Naive 2:</b> dump the DB into the new index, then switch → updates during the multi-hour dump are lost (dual-write gap).</p>` },
    mcq: { q: 'Which Kafka feature lets you rebuild full current state when events are older than delete-retention?', options: ['A compacted topic keyed by productId (latest value per key forever)', 'More partitions', 'acks=all', 'Consumer lag'], answer: 0, explain: 'Compaction keeps the latest record per key indefinitely, so reading it from offset 0 yields the full current state.' },
    hints: [`<p>Hint 1: You need the full current state, not the full history → a compacted topic (or a DB snapshot) as the bootstrap source.</p>`, `<p>Hint 2: Build into a NEW index with a NEW consumer group while the old index keeps serving traffic.</p>`, `<p>Hint 3: Use versions so snapshot rows and live events can be applied in any order (latest version wins); switch an index alias when lag is ~0.</p>`],
    solution: {
      approach: `<p>Maintain a <b>compacted</b> topic <code>products-latest</code> (key = productId, value = full product doc with version) — fed by CDC from the product DB (Debezium snapshot + streaming). It always holds every product's latest state. To rebuild: (1) create <code>products_v2</code> index with the new analyzer; (2) start a new consumer group <code>search-indexer-v2</code> reading <code>products-latest</code> from offset 0 with high parallelism (bulk indexing, refresh disabled); (3) it keeps consuming new updates, which land in the same compacted topic, so nothing is missed; (4) writes are version-guarded (<code>version_type=external</code> in Elasticsearch) so out-of-order application is safe; (5) when lag ≈ 0, flip the alias <code>products → products_v2</code> atomically; (6) stop the old group and delete the old index after a soak period. If no compacted topic exists, use Debezium's incremental snapshot to re-emit all rows into the stream while live changes keep flowing.</p>`,
      complexity: `<p>80M docs at ~20k docs/s bulk indexing ≈ 67 min; live updates (2,000/s) continue in parallel. Extra cost: one more index during migration (~2× storage temporarily).</p>`,
      followUps: ['How do you handle deletes in a compacted topic (tombstones) and in the index?', 'How do you verify the new index before flipping the alias?']
    }
  });

  practice.push({
    title: 'Deduplicate webhook deliveries',
    level: 'Medium',
    tags: ['idempotency', 'webhooks', 'at-least-once'],
    companies: ['Stripe', 'Shopify', 'GitHub', 'Twilio'],
    statement: `<p>Your platform receives payment webhooks from a provider: at-least-once delivery, retries for up to 3 days, occasional out-of-order delivery (<code>payment.succeeded</code> before <code>payment.created</code>). Your handler must update orders and trigger fulfilment exactly once per payment. Design the receiver and downstream processing.</p>`,
    constraints: `<p>Up to 1,000 webhooks/s at peak. Provider expects a 2xx within 10 s or it retries.</p>`,
    example: `<p>Provider sends <code>evt_123 payment.succeeded</code> twice (first ack lost). First: <span class="c-g">fulfilment triggered</span>. Second: <span class="c-y">already seen → 200 OK, no action</span>.</p>`,
    brute: { why: `<p><b>Naive:</b> do all processing inside the webhook HTTP handler and dedupe with an in-memory set. Slow processing exceeds 10 s → provider retries → duplicates; restarts forget the in-memory set; multiple pods do not share it; out-of-order events trigger fulfilment for an unknown payment.</p>` },
    mcq: { q: 'What should the webhook endpoint do before returning 200?', options: ['Fully process the event including fulfilment', 'Verify the signature, durably store the event (deduped by event id), enqueue it, then return 200', 'Return 200 immediately without storing', 'Return 500 so the provider retries later'], answer: 1, explain: 'Fast, durable acceptance; heavy work happens asynchronously and idempotently.' },
    hints: [`<p>Hint 1: Separate "accept" (fast, durable, deduped) from "process" (async, idempotent).</p>`, `<p>Hint 2: UNIQUE(provider_event_id) on an inbox table makes the accept step idempotent across pods and restarts.</p>`, `<p>Hint 3: For out-of-order events, act on the object's current state (fetch from the provider or use the version/created timestamp) rather than trusting arrival order.</p>`],
    solution: {
      approach: `<p><b>Receiver:</b> verify the HMAC signature and timestamp (reject replays older than 5 min); <code>INSERT INTO webhook_inbox(event_id, type, payload, received_at) ON CONFLICT (event_id) DO NOTHING</code> plus an outbox row in the same transaction; return 200 (fast, &lt; 100 ms). Duplicates simply hit the conflict and return 200. <b>Relay</b> publishes inbox events to <code>payment-webhooks</code> keyed by payment id (per-payment ordering). <b>Processor</b> consumer group: loads the payment's state row; applies transitions only if valid and newer (state machine created → succeeded → refunded; for events arriving early, either fetch the payment object from the provider API — the source of truth — or park until the predecessor arrives). Fulfilment trigger is itself an idempotent event keyed by orderId (<code>OrderPaid</code> emitted once via a conditional update <code>WHERE status = 'PENDING_PAYMENT'</code>). Retention of inbox ids ≥ provider retry window (3 days, keep 7). DLQ for signature-valid but unprocessable events.</p>`,
      complexity: `<p>One indexed insert per webhook at the edge; processing O(1) per event. Inbox storage: 1,000/s × 7 days ≈ 600M small rows → partition the table by day and drop old partitions.</p>`,
      followUps: ['How do you replay webhooks you missed during a 2-hour outage of your endpoint?', 'Why not trust the provider\'s event ordering?']
    }
  });

  practice.push({
    title: 'Delayed and scheduled messages on Kafka',
    level: 'Medium',
    tags: ['retries', 'delay', 'scheduling', 'kafka'],
    companies: ['Uber', 'DoorDash', 'Booking.com'],
    statement: `<p>Product wants: (a) "send a reminder if the cart is abandoned for 30 minutes", (b) "retry a failed payout after 1 h, 6 h, 24 h", (c) "cancel unpaid orders after 15 minutes". The team only has Kafka. Kafka has no per-message delay. Design delayed delivery.</p>`,
    constraints: `<p>~20k delayed messages/s at peak; delays from 1 s to 7 days; ±1 s precision is fine for short delays, ±1 min for long ones.</p>`,
    example: `<p>Cart c-4 abandoned at 10:00 → schedule <code>CheckCart{c-4}</code> for 10:30. At 10:12 the user checks out → the reminder must <span class="c-y">not</span> be sent at 10:30 (check state when firing).</p>`,
    brute: { why: `<p><b>Naive:</b> consumer reads the message and calls <code>Thread.sleep(30 min)</code> → exceeds max.poll.interval.ms, gets kicked out, rebalance loop, and blocks every message behind it. Or one topic for all delays — a 7-day message at the head blocks a 1-second one behind it (head-of-line blocking).</p>` },
    mcq: { q: 'Why use one topic per delay bucket (1m, 10m, 1h…)?', options: ['Kafka requires it', 'All messages in a bucket share the same delay, so they are already in due-time order — the consumer only needs to wait for the head', 'It increases replication', 'It avoids consumer groups'], answer: 1, explain: 'Same-delay messages are sorted by due time automatically, so no head-of-line blocking within a bucket.' },
    hints: [`<p>Hint 1: Group messages by delay into fixed buckets; each bucket is its own topic whose order equals due-time order.</p>`, `<p>Hint 2: The bucket consumer pauses the partition until the head message is due (never sleeps past the poll interval), then forwards it to the target topic.</p>`, `<p>Hint 3: For arbitrary long delays use a timer store (DB table indexed by due_at, or a timing wheel) and a poller; always re-check business state when the timer fires.</p>`],
    solution: {
      approach: `<p><b>Short, fixed delays (retries):</b> delay topics <code>delay-1m</code>, <code>delay-10m</code>, <code>delay-1h</code>, <code>delay-6h</code>, <code>delay-24h</code>; each message carries headers <code>due-at</code> and <code>target-topic</code>. A delay forwarder consumer reads each partition; if head.due-at &gt; now, it <code>pause()</code>s that partition and schedules <code>resume()</code> at due time (still polling for heartbeats); when due, it produces to the target topic and commits. Since a bucket's messages all have the same delay, they are in due order. <b>Arbitrary delays (cart reminder, order timeout):</b> a scheduler service consumes <code>schedule-requests</code> and writes <code>timers(id PK, due_at, payload, status)</code> (sharded DB, index on due_at); pollers claim due rows with <code>FOR UPDATE SKIP LOCKED</code>, publish the event, mark fired — idempotent by timer id. Cancellation = delete/mark the timer, but handlers <b>must re-check state</b> on fire (cart already purchased → do nothing). Alternatives: SQS DelaySeconds (≤ 15 min), Temporal timers, Redis sorted sets keyed by due time.</p>`,
      complexity: `<p>Delay topics: O(1) per message, precision ≈ poll interval. Timer table: 20k inserts/s + an index range scan per poll; 7-day max delay ≈ 12B rows worst case → shard by timer id hash and partition by day.</p>`,
      followUps: ['How do you avoid a thundering herd of timers all due at midnight?', 'How do you make "cancel unpaid order" race-free with a payment arriving at 14:59?']
    }
  });

  practice.push({
    title: 'Break a synchronous monolith flow into events',
    level: 'Medium',
    tags: ['event-driven', 'outbox', 'migration', 'strangler'],
    companies: ['Atlassian', 'Zalando', 'Booking.com'],
    statement: `<p>A monolith's <code>placeOrder()</code> does, in one DB transaction: insert order, decrement stock, write loyalty points, and then (outside the transaction) sends an email and calls the ERP. The company is extracting Loyalty and ERP-sync into services. Design the migration to events without downtime or lost side effects.</p>`,
    constraints: `<p>Monolith stays the system of record for orders and stock this year. 300 orders/s peak.</p>`,
    example: `<p>Step 1 output: monolith writes <span class="c-g">OrderPlaced</span> to an outbox in the same transaction. Loyalty service consumes it in <span class="c-y">shadow mode</span> and its results are compared with the monolith's for 2 weeks before taking over.</p>`,
    brute: { why: `<p><b>Naive:</b> replace the loyalty write with <code>kafka.send()</code> inside <code>placeOrder()</code> → dual write (Kafka send can succeed and the DB roll back, or the reverse). Big-bang cut-over of both services at once → no way to compare results or roll back safely.</p>` },
    mcq: { q: 'First safe step when extracting a side effect out of a monolith transaction?', options: ['Delete the old code immediately', 'Publish domain events via a transactional outbox from the monolith, consume them in shadow mode', 'Use 2PC between monolith and Kafka', 'Have the new service poll the monolith DB every second'], answer: 1, explain: 'Outbox gives reliable events without changing behaviour; shadow mode allows comparison before cut-over.' },
    hints: [`<p>Hint 1: Strangler fig: add the event stream first, keep behaviour unchanged.</p>`, `<p>Hint 2: New services consume in shadow mode (write to their own store, compare) before they own the effect.</p>`, `<p>Hint 3: Flip ownership with a feature flag per side effect; remove monolith code last. Idempotency keys make the flip safe if both run briefly.</p>`],
    solution: {
      approach: `<p><b>Phase 1 — events out:</b> add an <code>outbox</code> table to the monolith; <code>placeOrder()</code> inserts <code>OrderPlaced{orderId, customerId, items, total, version}</code> in the same transaction. Debezium publishes to <code>orders</code> (key orderId). No behaviour change. <b>Phase 2 — shadow:</b> Loyalty service consumes <code>orders</code>, computes points into its own DB; a comparison job diffs against the monolith's loyalty table daily. ERP-sync service consumes and calls the ERP sandbox. <b>Phase 3 — flip:</b> feature flag disables the monolith's loyalty write; Loyalty service becomes owner (idempotent by orderId, so a brief overlap cannot double-award). Email and ERP calls move out of <code>placeOrder()</code> to consumers with retries and DLQ — fixing the old bug where a crash after commit skipped the email. <b>Phase 4 — clean up:</b> delete monolith code, backfill historic loyalty data via a replay or one-time migration, and publish <code>PointsAwarded</code> events for others. Stock remains in the monolith transaction (must be strongly consistent with the order) until a later saga-based extraction.</p>`,
      complexity: `<p>300 events/s — trivial throughput; the effort is in correctness (outbox, idempotency, comparison) and rollout safety.</p>`,
      followUps: ['How would you later extract inventory, which needs to reject orders when out of stock?', 'How do you version OrderPlaced as the monolith schema changes?']
    }
  });

  practice.push({
    title: 'Exactly-once account balance aggregation',
    level: 'Hard',
    tags: ['exactly-once', 'kafka streams', 'transactions', 'state'],
    companies: ['Revolut', 'Coinbase', 'Robinhood', 'Stripe'],
    statement: `<p>A <code>transactions</code> topic carries card transactions (key = accountId). Build a service that maintains each account's running balance and daily spend, publishes <code>BalanceUpdated</code> events to another topic, and serves balance lookups. Duplicates or skipped transactions are unacceptable even across crashes and rebalances.</p>`,
    constraints: `<p>50k transactions/s, 20M accounts. Balance lookups p99 &lt; 20 ms. Producers may retry (duplicates possible upstream).</p>`,
    example: `<p>Account a1: +100, −30, (dup of −30 from an upstream retry), +5 → balance must be <span class="c-g">75</span>, not <span class="c-r">45</span>. A crash mid-batch must not apply any transaction twice.</p>`,
    brute: { why: `<p><b>Naive:</b> consumer keeps balances in a HashMap, writes <code>BalanceUpdated</code> with a normal producer and commits offsets separately. Crash after producing but before committing → replay → balances double-applied and duplicate output events. Upstream duplicates (same txnId twice) are applied twice regardless.</p>` },
    mcq: { q: 'What does Kafka Streams exactly_once_v2 make atomic?', options: ['Writes to an external Postgres', 'State store changelog writes, output records and input offset commits — all inside Kafka', 'Email sending', 'Producer retries from a different application'], answer: 1, explain: 'EOS covers Kafka-to-Kafka: changelog, outputs and offsets commit in one transaction. Upstream duplicates still need dedupe by business id.' },
    hints: [`<p>Hint 1: Kafka Streams with <code>processing.guarantee=exactly_once_v2</code> makes read-process-write atomic within Kafka, including state stores (backed by changelog topics).</p>`, `<p>Hint 2: Upstream duplicates are different messages with the same txnId — EOS does not dedupe them. Keep a per-account set/window of recent txnIds in the state store.</p>`, `<p>Hint 3: Serve lookups from the local state stores via interactive queries (or materialise into a DB via an idempotent sink keyed by accountId with version).</p>`],
    solution: {
      approach: `<p><b>Processor:</b> Kafka Streams app, <code>exactly_once_v2</code>, input <code>transactions</code> keyed by accountId (all of an account's transactions in one partition → one task → serial updates). State stores (RocksDB + changelog topics): <code>balances(accountId → {balance, version})</code>, <code>daily_spend(accountId+date → amount)</code> (windowed store, 2-day retention), and <code>seen_txn(accountId+txnId → ts)</code> with a TTL longer than the upstream retry window (e.g. 7 days) for business-level dedupe. For each record: if txnId seen → skip; else update stores, emit <code>BalanceUpdated{accountId, balance, version, txnId}</code>. Kafka commits state changelog writes, output and input offsets in one transaction every <code>commit.interval.ms</code> (100 ms). On crash, the transaction aborts, state is restored from changelogs to the last commit, and input is re-read — no double application. <b>Lookups:</b> interactive queries routed to the instance owning the key (metadata API) or a read model: an idempotent sink upserting <code>accounts(account_id, balance, version)</code> <code>WHERE version &lt; :v</code> into a low-latency DB. <b>Ops:</b> standby replicas (<code>num.standby.replicas=1</code>) for fast failover; RF=3 on all internal topics; reconciliation job comparing balances against the ledger of record nightly.</p>`,
      complexity: `<p>O(1) state ops per transaction; 50k/s across e.g. 64 partitions ≈ 800/s per task. State: 20M × ~100 B ≈ 2 GB balances + dedupe window (50k/s × 7 d ≈ 30B entries is too much → keep 24 h if upstream retries within hours, or dedupe upstream at the producer via idempotent outbox).</p>`,
      followUps: ['How would you reject a transaction that would make the balance negative (authorisation) instead of only aggregating?', 'What happens to read-your-writes for a user who just made a purchase?']
    }
  });

  practice.push({
    title: 'Multi-region Kafka for a global app',
    level: 'Hard',
    tags: ['multi-region', 'replication', 'disaster recovery', 'kafka'],
    companies: ['Netflix', 'Uber', 'Salesforce', 'Microsoft'],
    statement: `<p>Your event platform runs in us-east. You must add eu-west for (a) EU data residency for EU users' events, (b) disaster recovery if a whole region fails, (c) a global analytics view. Producers and consumers exist in both regions. Design the Kafka topology, replication and failover, including consumer offsets and ordering concerns.</p>`,
    constraints: `<p>Cross-region RTT ~80 ms. RPO ≤ 1 min for business events; RTO ≤ 15 min. EU personal data must not be stored outside the EU (aggregates are fine).</p>`,
    example: `<p>EU user event → <span class="c-g">eu-west cluster</span> (local, low latency). Aggregated, anonymised stats → replicated to <span class="c-y">us-east</span> analytics. us-east fails → US producers fail over to the DR replica in us-west, consumers resume from <b>translated offsets</b>.</p>`,
    brute: { why: `<p><b>Naive:</b> one stretched cluster across us-east and eu-west → every acks=all write pays 80+ ms cross-region; a network partition can make the cluster unavailable; EU data stored in the US violates residency. Naive DR: mirror topics but not consumer offsets → after failover consumers restart at earliest (huge replay) or latest (data loss).</p>` },
    mcq: { q: 'Why not one Kafka cluster stretched across two distant regions?', options: ['Kafka forbids it', 'acks=all writes wait for cross-region replicas (high latency) and partitions between regions hurt availability', 'Consumers cannot read across regions', 'It needs ZooKeeper'], answer: 1, explain: 'Synchronous replication across ~80 ms RTT makes every durable write slow; async mirroring between regional clusters is the usual answer.' },
    hints: [`<p>Hint 1: One cluster per region; producers write locally. Replicate asynchronously between clusters (MirrorMaker 2 or vendor cluster linking).</p>`, `<p>Hint 2: Decide per topic: region-local only (residency), replicated for DR (active-passive), or aggregated to a global cluster. Avoid replication loops with prefixed topic names (<code>us-east.orders</code>).</p>`, `<p>Hint 3: Replicate consumer offsets too (MM2 checkpoints / offset sync) so DR consumers can resume near where they left off; consumers must be idempotent because of the async gap.</p>`],
    solution: {
      approach: `<p><b>Topology:</b> regional clusters <code>us-east</code>, <code>eu-west</code>, plus DR clusters <code>us-west</code> (for us-east) and <code>eu-central</code> (for eu-west, stays in the EU) and an aggregate cluster for analytics. Producers always write to their home region (data residency enforced by routing EU users' traffic to EU services). <b>Replication:</b> MirrorMaker 2 (or Confluent Cluster Linking / MSK Replicator) asynchronously mirrors business topics to the in-jurisdiction DR cluster with offset translation (checkpoint topics), giving RPO ≈ replication lag (alert at &gt; 30 s). Only anonymised/aggregated topics (produced by an EU stream processor) are mirrored to the global analytics cluster. Remote topics are prefixed (<code>eu-west.orders</code>) so active-active setups do not loop. <b>Failover:</b> DNS/service-discovery flips producers to the DR cluster; consumer groups start there using translated offsets (<code>RemoteClusterUtils.translateOffsets</code>), accepting a small replay — safe because consumers are idempotent. Ordering per key is preserved within the mirrored partition (MM2 keeps partition mapping when partition counts match). <b>Failback:</b> mirror back, drain, switch at a quiet time. Practice with game days.</p>`,
      complexity: `<p>Cross-region bandwidth = mirrored topic throughput × number of target clusters; RPO = mirror lag (seconds); RTO dominated by client failover automation (minutes).</p>`,
      followUps: ['How would you run active-active for a topic both regions write to (e.g. global inventory)?', 'How do you prove residency compliance to an auditor?']
    }
  });

  practice.push({
    title: 'Multi-tenant job queue with fairness',
    level: 'Hard',
    tags: ['queue', 'fairness', 'multi-tenant', 'kafka', 'share groups'],
    companies: ['Salesforce', 'Atlassian', 'Snowflake', 'OpenAI'],
    statement: `<p>A SaaS platform runs background jobs (report exports, AI document summarisation) for 10,000 tenants. One tenant sometimes submits 2 million jobs at once and starves everyone else. Jobs take 1 s – 5 min. Design a queueing system that is fair across tenants, supports per-tenant limits, retries, and priorities for paid plans.</p>`,
    constraints: `<p>Average 3,000 jobs/s submitted, worker fleet 2,000 concurrent slots. Free tier: max 5 concurrent jobs per tenant; enterprise: 200.</p>`,
    example: `<p>Tenant BigCo enqueues 2M exports; tenant SmallCo enqueues 3. FIFO queue → SmallCo waits <span class="c-r">hours</span>. Fair scheduler → SmallCo's 3 jobs start <span class="c-g">within seconds</span>, BigCo proceeds at its 200-slot cap.</p>`,
    brute: { why: `<p><b>Naive:</b> one FIFO queue/topic for all tenants → head-of-line starvation by the biggest tenant. Kafka partition per tenant → 10,000+ partitions, mostly idle, and one consumer per partition cannot run a tenant's jobs in parallel. Long jobs on classic Kafka consumers also hit max.poll.interval.ms and trigger rebalances.</p>` },
    mcq: { q: 'Core idea for tenant fairness?', options: ['Bigger workers', 'Per-tenant queues (logical) + a scheduler that round-robins / weights across tenants with per-tenant concurrency caps', 'More Kafka partitions', 'Shorter retention'], answer: 1, explain: 'Fairness needs a scheduling decision across tenants, not a single FIFO.' },
    hints: [`<p>Hint 1: Separate ingestion (durable log of all job submissions) from scheduling (who runs next).</p>`, `<p>Hint 2: Keep per-tenant pending lists (DB/Redis) and a scheduler doing weighted round-robin / deficit round-robin over tenants with available concurrency tokens.</p>`, `<p>Hint 3: Workers lease jobs with a visibility timeout and heartbeat; failures retry with backoff, then DLQ per tenant. Kafka share groups or SQS fit the dispatch step for per-job acks.</p>`],
    solution: {
      approach: `<p><b>Ingest:</b> API writes job rows to <code>jobs(job_id, tenant_id, priority, status, attempts, payload_ref)</code> (sharded by tenant) via an outbox, emitting <code>JobSubmitted</code> to Kafka for audit/analytics. Large batch submissions are accepted as one "batch job" and expanded lazily. <b>Scheduler:</b> maintains per-tenant ready lists (Redis sorted sets or DB indexes) and a set of tenants with pending work. Every tick it picks tenants by <b>weighted deficit round-robin</b> (enterprise weight 10, free 1), checks the tenant's concurrency token bucket (free 5, enterprise 200 running jobs), and dispatches jobs to a <b>dispatch queue</b> (SQS, RabbitMQ quorum queue, or Kafka share group — per-message acks and redelivery are needed because jobs vary from 1 s to 5 min). <b>Workers:</b> lease a job (visibility timeout 2× expected duration, extended by heartbeats), run it, update status idempotently by job_id, release the tenant token. Failures: transient → retry with backoff (re-enter the tenant's ready list with a delay); permanent → tenant-scoped DLQ visible in the tenant's UI. Priorities: separate dispatch queues per class with reserved worker capacity. Backpressure: API returns 429 when a tenant's pending count exceeds its plan quota. Metrics: per-tenant queue wait time p99 (the fairness SLO).</p>`,
      complexity: `<p>Scheduler decision O(1) amortised per job (round-robin over active tenants). State: pending jobs in DB/Redis (2M rows for one tenant is fine). Dispatch queue depth bounded to ~2× worker slots so scheduling stays responsive.</p>`,
      followUps: ['How do you prevent a tenant from gaming fairness by creating many sub-tenants?', 'How would AI jobs with GPU constraints change the scheduler?']
    }
  });

  practice.push({
    title: 'Log ingestion pipeline at 1M events per second',
    level: 'Hard',
    tags: ['kafka', 'throughput', 'batching', 'streaming', 'cost'],
    companies: ['Datadog', 'Cloudflare', 'Splunk', 'Netflix'],
    statement: `<p>Design the ingestion path for an observability product: agents on 200k hosts send logs (avg 1M events/s, peaks 3M/s, ~600 bytes each). Logs must be searchable within 10 s, stored 30 days, and some customers want real-time alert rules evaluated on the stream. Focus on the messaging/streaming tier: buffering, partitioning, backpressure, cost and failure handling.</p>`,
    constraints: `<p>Losing logs is bad but a tiny loss during a regional failure is tolerated (contractual "best effort, &gt; 99.99%"). Customers vary from 10 events/s to 200k events/s.</p>`,
    example: `<p>Peak ingest 3M × 600 B = <span class="c-y">1.8 GB/s</span> raw; with zstd ~5× → ~360 MB/s on the wire. A customer's 200k/s burst must not delay others' searchability beyond 10 s.</p>`,
    brute: { why: `<p><b>Naive:</b> agents write directly to the search cluster (Elasticsearch/ClickHouse) → indexing hiccups or merges cause agent back-ups and data loss; no buffer for peaks. Naive Kafka: key = customerId → the 200k/s customer creates a hot partition; RF=3 with 30-day retention on brokers' local disks costs a fortune; single huge topic means one noisy customer's backlog delays everyone.</p>` },
    mcq: { q: 'Best partitioning for very uneven tenants when per-tenant ordering is not required?', options: ['key = customerId', 'Null key / sticky partitioning (or customerId + random salt) for even spread, with tenant id in headers', 'One partition per customer', 'key = timestamp'], answer: 1, explain: 'Logs need no strict ordering; spreading evenly avoids hot partitions. Tenancy travels in headers/payload.' },
    hints: [`<p>Hint 1: Put a regional edge collector tier (stateless, autoscaled) in front of Kafka: it authenticates, applies per-tenant rate limits, batches and compresses.</p>`, `<p>Hint 2: Kafka is a short-term buffer (hours) with tiered storage; long-term storage is object storage + the search engine. Consumers (indexers, alert evaluators, archivers) are separate groups.</p>`, `<p>Hint 3: Isolate noisy tenants: tiered topics (shared vs dedicated for the biggest tenants), per-tenant quotas, and lag-based autoscaling of indexers. Agents keep a local disk buffer for when the edge is unreachable.</p>`],
    solution: {
      approach: `<p><b>Agents</b> batch (1 s or 1 MB), compress, retry with backoff, and keep a bounded local disk buffer (e.g. 1 GB) — the first backpressure layer. <b>Edge collectors</b> (stateless, behind L4 load balancers, per region): authenticate API keys, enforce per-tenant token buckets (429 + Retry-After when exceeded — explicit backpressure), add tenant headers, and produce to Kafka with <code>linger.ms=20</code>, <code>batch.size=1MB</code>, zstd, <code>acks=all</code> (RF=3, min.insync=2) or acks=1 for the cheapest tier. <b>Kafka:</b> topic <code>logs-shared</code> with ~512 partitions (3M/s ÷ ~10k/s per indexer consumer ≈ 300, plus headroom), null key → sticky partitioning; the top ~20 tenants get dedicated topics so their bursts do not delay others. Local retention 6–12 h, tiered storage to S3 for 3 days of replay. <b>Consumer groups:</b> <code>indexer</code> (bulk writes to the search store, autoscaled on time-lag, target &lt; 5 s), <code>alert-evaluator</code> (Flink keyed by tenant+rule, windowed aggregations), <code>archiver</code> (writes compressed Parquet to object storage every minute for 30-day retention and cheap rehydration). <b>Failures:</b> malformed records → per-tenant DLQ with sampling; indexer outage → lag grows on Kafka for hours with no loss; region failure → agents fail over to another region's edge (small loss of in-flight batches tolerated by contract). <b>Cost levers:</b> compression, tiered storage, follower fetching within AZ, sampling/dropping debug logs per tenant policy.</p>`,
      complexity: `<p>Kafka ingress ~360 MB/s compressed at peak; ×3 replication + 3 consumer groups ≈ 2.2 GB/s cluster I/O → ~15–20 brokers. Local disk: 360 MB/s × 12 h × 3 ≈ 47 TB. Object storage for 30 days ≈ 1M/s avg × 600 B × 2.6M s ÷ 5 ≈ 310 TB.</p>`,
      followUps: ['How would you let a customer "replay" the last 2 hours into a new alert rule?', 'How do you bill customers fairly per GB ingested?']
    }
  });

  /* =====================================================================
     QUIZ
     ===================================================================== */
  quiz.push({ q: 'Three services must each process every <code>OrderPlaced</code> event. In Kafka you should…', options: ['Put all three services in the same consumer group', 'Give each service its own consumer group', 'Create three partitions, one per service', 'Use acks=all'], answer: 1, explain: 'Each consumer group gets every record. Inside one group, records are split among members, so a shared group would give each event to only one service.' });
  quiz.push({ q: 'Kafka guarantees ordering…', options: ['Across the whole topic', 'Within a single partition', 'Across all topics in a cluster', 'Only with acks=0'], answer: 1, explain: 'Records are ordered by offset inside one partition. Use the same key to put related records in the same partition.' });
  quiz.push({ q: 'A topic has 6 partitions and the consumer group has 9 members. How many members receive data?', options: ['9', '6', '3', '1'], answer: 1, explain: 'Each partition is assigned to one member of the group; the 3 extra members sit idle.' });
  quiz.push({ q: 'A consumer processes a record, then crashes before committing its offset. With "process then commit" this leads to…', options: ['Message loss', 'The record being processed again after restart (duplicate)', 'The partition being deleted', 'Nothing — Kafka detects it'], answer: 1, explain: 'The new owner resumes at the last committed offset, re-reading the record: at-least-once.' });
  quiz.push({ q: 'Which setting combination survives one broker failure with no acknowledged data loss AND keeps accepting writes?', options: ['RF=1, acks=1', 'RF=3, acks=all, min.insync.replicas=2', 'RF=3, acks=0', 'RF=3, acks=all, min.insync.replicas=3'], answer: 1, explain: 'With 2 of 3 replicas alive, ISR=2 ≥ min.insync 2, writes continue and every ack means two copies. min.insync=3 would block writes.' });
  quiz.push({ q: 'Consumer lag is…', options: ['Network latency between producer and broker', 'Log end offset minus the group\'s committed offset', 'Replication delay between leader and follower', 'Time to elect a new leader'], answer: 1, explain: 'Lag measures how far a group is behind the newest data in each partition.' });
  quiz.push({ q: 'A message has invalid JSON and fails on every attempt. Best handling?', options: ['Retry forever with backoff', 'Send it to a dead-letter queue with error details and move on', 'Skip it without logging', 'Restart the consumer'], answer: 1, explain: 'It is a permanent (poison) failure; retries only block the partition. Park it with context, alert, fix and redrive.' });
  quiz.push({ q: 'Why add jitter to exponential backoff?', options: ['To make retries faster', 'To spread retries so many failed clients do not hit the recovering service at the same instant', 'To guarantee ordering', 'Kafka requires it'], answer: 1, explain: 'Synchronised retries create retry storms; randomness spreads the load.' });
  quiz.push({ q: 'The transactional outbox pattern solves…', options: ['Slow consumers', 'The dual-write problem of updating a DB and publishing an event atomically', 'Hot partitions', 'Schema evolution'], answer: 1, explain: 'The event is written in the same local DB transaction as the state change; a relay publishes it later.' });
  quiz.push({ q: 'You increase a keyed topic from 8 to 12 partitions. What risk appears?', options: ['Data is deleted', 'Keys may map to different partitions, so new events for a key can be processed before older ones in the old partition', 'Consumers stop working', 'Replication factor drops'], answer: 1, explain: 'hash(key) mod N changes with N; existing data is not moved, so per-key ordering can break during the transition.' });
  quiz.push({ q: 'Kafka transactions (exactly_once_v2) protect against duplicates in…', options: ['Emails sent from the processor', 'Writes to an external database', 'Kafka-to-Kafka read-process-write pipelines (outputs + offsets committed atomically)', 'HTTP calls to payment providers'], answer: 2, explain: 'EOS covers Kafka topics and offsets. External side effects need idempotency keys.' });
  quiz.push({ q: 'Producers send 1,000 msg/s; 3 consumers each handle 300 msg/s; the topic has 3 partitions. What happens over time?', options: ['Lag stays at zero', 'Lag grows ~100 msg/s; adding a 4th consumer will not help without more partitions or faster processing', 'Kafka drops 100 msg/s', 'Producers are automatically slowed to 900/s'], answer: 1, explain: 'Capacity 900 &lt; 1,000. The group is already at one consumer per partition, so you need more partitions, faster consumers, or producer backpressure.' });
  quiz.push({ q: 'Choreography vs orchestration: which is true?', options: ['Choreography uses a central coordinator', 'Orchestration makes the end-to-end flow explicit in one place; choreography spreads it across services reacting to events', 'Orchestration cannot use Kafka', 'Choreography always needs 2PC'], answer: 1, explain: 'Orchestrators (Temporal, Step Functions, saga managers) hold the flow; choreography emerges from independent subscribers.' });

  /* =====================================================================
     INTERVIEW Q&A
     ===================================================================== */
  interview.push({ q: 'When would you introduce a message queue between two services?', level: 'B', a: `<p>When the caller does <b>not need the result right away</b> and you want to (1) <b>decouple</b> availability — the producer keeps working while the consumer is down; (2) <b>absorb bursts</b> — the queue buffers spikes and consumers drain at their own pace; (3) <b>scale independently</b> — add workers without touching the producer; (4) <b>retry safely</b> slow or flaky work (emails, video processing, third-party APIs). I would not add one for a fast call the user waits for (e.g. "is this username free?"), because it adds latency, eventual consistency, duplicates and another system to operate.</p>`, followUps: ['How do you return a result to the user later? (polling, webhooks, WebSocket push)', 'What new failure modes does the queue introduce?'] });
  interview.push({ q: 'Explain the difference between a queue and pub/sub, and how Kafka supports both.', level: 'B', a: `<p>A <b>queue</b> (point-to-point) delivers each message to <b>one</b> of many competing consumers — ideal for distributing work. <b>Pub/sub</b> delivers a copy to <b>every</b> subscriber — ideal for broadcasting facts (events) to independent services. Kafka models both with <b>consumer groups</b>: every group receives all records (pub/sub across groups), and within a group the partitions are split among members (queue-like load balancing). Unlike classic queues, Kafka retains records after they are read, so groups can replay history. Kafka 4.x also adds <b>share groups</b> for true queue semantics with per-message acks.</p>`, followUps: ['When would you still pick SQS or RabbitMQ over Kafka?', 'What does SNS + SQS fan-out look like?'] });
  interview.push({ q: 'Walk me through Kafka\'s architecture: topics, partitions, brokers, replication.', level: 'I', a: `<p>A <b>topic</b> is a named stream split into <b>partitions</b>; each partition is an ordered, append-only log where every record gets an increasing <b>offset</b>. Partitions are spread across <b>brokers</b> and replicated (typically RF=3): one replica is the <b>leader</b> handling reads/writes, followers fetch from it. The <b>ISR</b> is the set of replicas fully caught up. With <code>acks=all</code> a write is acknowledged when all ISR members have it, and the <b>high watermark</b> marks what consumers may read. If the leader dies, the controller (KRaft quorum since 4.0 — no ZooKeeper) elects a new leader from the ISR, so acknowledged data survives. Producers choose partitions by key hash (murmur2) to keep per-key ordering; consumers in groups pull and commit offsets to <code>__consumer_offsets</code>.</p>`, followUps: ['What is unclean leader election?', 'Why is Kafka fast? (sequential I/O, page cache, batching, zero-copy)'] });
  interview.push({ q: 'How do you choose the number of partitions for a topic?', level: 'I', a: `<p>Compute two bounds and take the larger: <b>throughput</b> (target MB/s ÷ safe per-partition MB/s) and <b>consumer parallelism</b> (events/s ÷ events/s one consumer can process — the group can never have more active consumers than partitions). Multiply by expected growth (2–3×) because increasing partitions later re-maps keys and breaks per-key ordering. Prefer numbers with many divisors (12, 24, 48, 96, 120). Do not over-provision wildly: each partition costs file handles, memory, replication traffic and failover time, and tiny partitions batch poorly. Also check key skew — partition count does not fix a single hot key.</p>`, followUps: ['How would you migrate a keyed topic to more partitions?', 'How does tiered storage change sizing?'] });
  interview.push({ q: 'What are at-most-once, at-least-once and exactly-once? Which would you use for payments?', level: 'I', a: `<p>They describe what happens when a crash lands between "do the work" and "record progress". <b>At-most-once</b>: commit first, then process → crash loses the message. <b>At-least-once</b>: process, then commit → crash causes a duplicate. <b>Exactly-once</b> effects require making the effect and the progress record atomic or deduplicating. For payments I use <b>at-least-once delivery + idempotent processing</b>: a unique payment/event id from the producer, a dedupe/state row in the same DB transaction as the effect, and the PSP's Idempotency-Key set to the payment id so even timeouts are safe to retry. Kafka transactions help only for Kafka-to-Kafka steps; external calls still need idempotency.</p>`, followUps: ['Why is exactly-once delivery impossible in general?', 'Where should the idempotency key be generated?'] });
  interview.push({ q: 'How do consumer group rebalances work, and why do they cause trouble?', level: 'I', a: `<p>A group coordinator broker tracks members via heartbeats. When a member joins, leaves, misses <code>session.timeout.ms</code> or exceeds <code>max.poll.interval.ms</code>, partitions are reassigned. Problems: (1) with the old <b>eager</b> protocol all members stop and give up all partitions — a pause on every deploy; (2) records processed but not committed are <b>reprocessed</b> by the new owner; (3) slow processing can cause rebalance loops. Mitigations: cooperative-sticky assignment or the KIP-848 consumer protocol (incremental, broker-driven), <b>static membership</b> (<code>group.instance.id</code>) so restarts do not rebalance, committing in <code>onPartitionsRevoked</code>, graceful shutdown, smaller <code>max.poll.records</code>, and idempotent handlers.</p>`, followUps: ['What happens if processing one batch takes 10 minutes?', 'How does autoscaling interact with rebalances?'] });
  interview.push({ q: 'How do you guarantee events for the same order are processed in order, while still scaling?', level: 'I', a: `<p>Use <code>orderId</code> as the record key so all of an order's events land in the same partition (Kafka orders by offset within a partition) and are consumed by one group member. Scale across orders by having many partitions. Keep the idempotent producer on (default) so retries cannot reorder batches. Inside the consumer, parallelise by key (keyed lanes / Parallel Consumer) rather than an unordered thread pool. Carry a per-order <code>version</code> so consumers can reject stale or duplicate events (important after retries, replays or when events come from multiple topics). Avoid changing the partition count of the topic, or migrate via a new topic.</p>`, followUps: ['What if two different services emit events about the same order?', 'How do retry topics affect ordering?'] });
  interview.push({ q: 'Design the error handling for a Kafka consumer: retries, poison messages and DLQs.', level: 'I', a: `<p>Classify errors. <b>Transient</b> (timeouts, 5xx, throttling): a few in-process retries with exponential backoff + jitter; if still failing, publish to delay/retry topics (1 m, 10 m, 1 h) with attempt headers and commit the original so the partition keeps moving; a circuit breaker pauses consumption when the downstream is down. <b>Permanent</b> (deserialization, validation, business rule, bugs): send to the <b>DLQ</b> immediately with the original bytes, headers, topic/partition/offset, error and stack trace. Alert on DLQ growth, give it an owner and a runbook, and build a redrive tool (filter, dry run, rate limit). Consumers must be idempotent because retries and redrives cause duplicates. If per-key ordering matters, park the key while one of its events is in the retry path.</p>`, followUps: ['How do you implement delays in Kafka without sleeping?', 'How would you handle a poison message that crashes deserialization inside poll()?'] });
  interview.push({ q: 'What is backpressure and how do you implement it in a messaging system?', level: 'I', a: `<p>Backpressure lets a slow component make faster ones slow down instead of piling up unbounded work. Mechanisms: <b>pull-based consumers</b> (Kafka/SQS — lag accumulates on the broker's disk, not in RAM); <b>bounded in-memory queues</b> that block or reject (HTTP 429 + Retry-After); <b>credit/prefetch</b> limits (RabbitMQ prefetch, Reactive Streams <code>request(n)</code>, HTTP/2 windows); <code>pause()</code>/<code>resume()</code> of Kafka partitions when a downstream is unhealthy; producer-side blocking (<code>buffer.memory</code>, <code>max.block.ms</code>) and broker quotas; lag-based autoscaling capped at partitions; and deliberate <b>load shedding</b> or priority lanes for low-value traffic. A queue absorbs bursts, but if average input exceeds capacity, lag grows forever — you must add capacity or reduce input.</p>`, followUps: ['Compute drain time for a 10-minute 5× burst.', 'Why keep consumers below ~75% utilisation?'] });
  interview.push({ q: 'Explain the transactional outbox pattern and its alternatives.', level: 'A', a: `<p>Problem: a service must update its database and publish an event; doing both separately (dual write) loses or invents events on crashes. <b>Outbox</b>: in the same local transaction as the state change, insert the event into an <code>outbox</code> table. A relay publishes outbox rows to Kafka — either a <b>poller</b> (<code>SELECT … FOR UPDATE SKIP LOCKED</code>, then mark published) or <b>CDC</b> (Debezium tails the WAL/binlog, low latency, no polling load). Delivery is at-least-once, so events carry ids for consumer dedupe. Alternatives: <b>event sourcing</b> (the event store is the database, so publishing is reading the store), <b>listen-to-yourself</b> (publish first, the service consumes its own event to update its DB — eventual consistency even for its own reads), or durable-execution engines that persist steps. 2PC between DB and Kafka is not available and would be fragile anyway.</p>`, followUps: ['How do you keep per-aggregate ordering with an outbox?', 'How do you clean up the outbox table?'] });
  interview.push({ q: 'Choreography or orchestration for a multi-step business process? How do sagas handle failure?', level: 'A', a: `<p><b>Choreography</b>: services react to each other's events; loosely coupled and easy to extend, but the end-to-end flow is implicit, hard to monitor, and cycles can appear. <b>Orchestration</b>: a coordinator (Temporal workflow, Step Functions, a saga state machine) sends commands and waits for replies; the flow is explicit, timeouts and branches are easy, but the orchestrator is a central dependency. I use choreography for simple fan-out (notifications, analytics) and orchestration for flows with more than a few steps, timeouts and compensations. A <b>saga</b> is a sequence of local transactions; on failure it runs <b>compensating actions</b> for completed steps in reverse (release stock, void authorisation). Compensations must be idempotent; sagas lack isolation, so use semantic locks (PENDING states) and put the irreversible step last.</p>`, followUps: ['How do you compensate an email that was already sent?', 'Where does the saga state live and how does it survive crashes?'] });
  interview.push({ q: 'Kafka vs RabbitMQ vs SQS vs Pulsar — how do you choose?', level: 'A', a: `<p><b>SQS</b>: fully managed, effortless at-least-once job queues, visibility timeouts, built-in DLQ; FIFO for per-group ordering with limits; no replay. <b>RabbitMQ</b>: smart broker with rich routing (exchanges), per-message acks, priorities, delays, request/reply; quorum queues for durability; great for task distribution at moderate scale. <b>Kafka</b>: partitioned replicated log; very high throughput, retention and replay, many independent consumer groups, stream processing ecosystem (Streams, Connect, Flink), exactly-once within Kafka; operationally heavier (managed options help), ordering per partition, consumers capped by partitions. <b>Pulsar</b>: separates serving (brokers) from storage (BookKeeper), native multi-tenancy and geo-replication, both queue and stream subscriptions. Choose by: replay needed? throughput? routing complexity? ops budget? cloud-native managed preference?</p>`, followUps: ['When is a Postgres table with SKIP LOCKED enough?', 'What do Kafka share groups change in this comparison?'] });
  interview.push({ q: 'How does Kafka achieve exactly-once semantics internally, and what are its limits?', level: 'E', a: `<p>Two layers. (1) <b>Idempotent producer</b>: the broker assigns a producer id; the producer numbers batches per partition; the broker rejects duplicates and out-of-sequence batches, so retries neither duplicate nor reorder. (2) <b>Transactions</b>: a producer with a <code>transactional.id</code> registers with a transaction coordinator (state in <code>__transaction_state</code>); it writes output records to many partitions and adds consumer offsets via <code>sendOffsetsToTransaction</code>; commit writes control markers into every involved partition. <code>read_committed</code> consumers read only up to the last stable offset and skip aborted data. Epochs fence zombie instances. Limits: it covers only Kafka topics and offsets — external DBs, APIs and emails need idempotency; it adds latency (consumers wait on open transactions); upstream duplicates with the same business id are separate records and need business-level dedupe.</p>`, followUps: ['What is a zombie producer and how is it fenced?', 'How does Kafka Streams restore state after a crash under EOS?'] });
  interview.push({ q: 'Design a pipeline where uploads trigger AI processing (embeddings, moderation, summaries) at scale.', level: 'E', a: `<p>Upload service stores the file in object storage and writes <code>DocumentUploaded{docId, tenantId, uri, version}</code> via an outbox to a Kafka topic keyed by docId. Separate consumer groups: <b>moderation</b>, <b>embedding</b> (chunks → embedding API → vector DB upsert keyed by docId+chunk+version), and <b>summariser</b>. LLM calls are slow and rate-limited, so each group uses a token-bucket limiter per provider/model, small <code>max.poll.records</code> or a share group / work queue for per-job acks, lag-based autoscaling, and pauses consumption on 429 storms (honouring Retry-After). Failures: transient → backoff + retry topics; permanent (file corrupt, context too long) → DLQ or a fallback (truncate, smaller model). Idempotent writes by docId+version so re-processing after model upgrades is a <b>replay</b> into a new index version. Per-tenant fairness via separate topics or a scheduler; costs tracked per tenant from events.</p>`, followUps: ['How do you re-embed 100M documents when the embedding model changes?', 'How do you keep the vector index consistent with deletes?'] });
  interview.push({ q: 'An interviewer says "we need global ordering of all events". How do you respond?', level: 'A', a: `<p>I would first ask <b>what actually needs ordering</b>. Global order means one partition and therefore one consumer — throughput is capped at what a single machine can do (sometimes fine: a matching engine processing millions/s single-threaded, or a low-volume audit log). Usually the real requirement is per-entity order (per account, per order, per conversation), which keys provide while scaling horizontally. If a cross-entity order is needed only for display or audit, attach timestamps/sequence numbers (hybrid logical clocks) and sort downstream. If true total order is needed for correctness (replicated state machine), use a single-partition log or a consensus log and design for vertical speed, batching and fast failover.</p>`, followUps: ['How would you build a total-order log that handles 1M events/s?', 'What are hybrid logical clocks?'] });

  registerModule({
    id: 'hld08',
    title: 'Messaging & Streaming',
    lang: 'text',
    intro: `<p>Modern systems rarely call every service in a straight line. They <b>drop messages into queues</b> and <b>publish events to topics</b> so services can work at their own speed, survive each other's outages and scale independently. This module teaches messaging from the ground up: why queues exist, how <b>queues differ from pub/sub</b>, how <b>Kafka</b> really works (topics, partitions, offsets, replication, consumer groups, rebalances), what <b>at-most-once / at-least-once / exactly-once</b> really mean, how to keep <b>ordering</b> with partition keys, how to survive <b>poison messages</b> with retries and <b>dead-letter queues</b>, how <b>backpressure</b> keeps a fast producer from drowning a slow consumer, and how to design <b>event-driven systems</b> with the outbox pattern, sagas and CQRS.</p>
<p>Every topic has an animated visualizer: producers appending to partition logs, consumer offsets advancing, a consumer dying and the group rebalancing, a message retried and parked in the DLQ, and events fanning out through an order pipeline. You will finish by designing an order pipeline on Kafka, choosing partition keys, building an idempotent consumer, and sizing clusters with back-of-envelope math — exactly what interviewers ask.</p>`,
    goals: [
      'Choose between a work queue, pub/sub and a synchronous call from the wording of a requirement, and explain the trade-offs',
      'Explain Kafka topics, partitions, offsets, replication (ISR, acks, min.insync.replicas), consumer groups, lag and rebalancing step by step',
      'Size a Kafka topic: partitions from throughput and consumer parallelism, disk from retention × replication',
      'Build an at-least-once consumer that is idempotent, and explain why "exactly-once delivery" is a myth while exactly-once effects are achievable',
      'Pick a partition key that preserves the ordering you need, and handle hot keys',
      'Design retries with backoff + jitter, poison-message handling, DLQs and redrive',
      'Apply backpressure and lag-based scaling, and compute burst drain times',
      'Design an event-driven order pipeline with the transactional outbox, sagas (choreography vs orchestration) and CQRS read models'
    ],
    prereqs: `<p>HLD 1–3 (client-server, scalability basics, estimation framework), HLD 5 (Databases at Scale: replication and sharding — partitions behave like shards), and HLD 7 (Consistent Hashing) for key-to-partition intuition. Basic Java or Python reading is enough for the optional code.</p>`,
    hours: 14,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
