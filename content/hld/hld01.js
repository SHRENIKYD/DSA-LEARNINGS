(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ------------------------------------------------------------------
     Shared visualizer helpers (architecture boxes + animated flows)
     ------------------------------------------------------------------ */
  function cp(o) { return JSON.parse(JSON.stringify(o)); }
  function bx(id, label, x, y, w) {
    var n = { id: id, label: label === undefined ? id : label, x: x, y: y, shape: 'box' };
    if (w) n.w = w;
    return n;
  }
  function hesc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function own(o) { var r = {}; if (o) Object.keys(o).forEach(function (k) { r[k] = o[k]; }); return r; }

  // Animated request flow. Each step lights its edges ('cur' amber by default)
  // and leaves a green trail behind so you can see the path taken so far.
  // cfg = { label, height, nodes, edges, steps:[{ narr, on:['A-B'], cls, keep, reset, hl, ehl, tags, labels, nodes, edges, extra }] }
  function story(cfg) {
    var trail = {};
    return cfg.steps.map(function (s) {
      if (s.reset) trail = {};
      var ehl = own(trail);
      (s.on || []).forEach(function (k) { ehl[k] = s.cls || 'cur'; });
      Object.keys(s.ehl || {}).forEach(function (k) { ehl[k] = s.ehl[k]; });
      var edges = cp(s.edges || cfg.edges).map(function (e) {
        var k = e[0] + '-' + e[1];
        if (s.labels && s.labels[k] !== undefined) e[2] = s.labels[k];
        return e;
      });
      var g = { type: 'graph', label: s.label || cfg.label, directed: true, height: s.height || cfg.height || 60,
        nodes: cp(s.nodes || cfg.nodes), edges: edges, hl: own(s.hl), ehl: ehl, tags: own(s.tags) };
      (s.on || []).forEach(function (k) { if (s.keep !== false) trail[k] = s.keep || 'ok'; });
      return { narr: s.narr, parts: [g].concat(s.extra || []) };
    });
  }

  // Parse "a=1, b=two" into { a: '1', b: 'two' } (keys lower-cased).
  function kvParse(input) {
    var out = {};
    String(input || '').split(/[,;\n]+/).forEach(function (p) {
      var m = p.trim().match(/^([A-Za-z0-9_.]+)\s*[=:]\s*(.+)$/);
      if (m) out[m[1].toLowerCase()] = m[2].trim();
    });
    return out;
  }
  function numIn(v, def, lo, hi, name) {
    if (v === undefined || v === '') return def;
    var n = Number(v);
    if (isNaN(n)) throw new Error(name + ' must be a number');
    if (n < lo || n > hi) throw new Error(name + ' must be between ' + lo + ' and ' + hi);
    return n;
  }
  function fmtMs(ms) { return ms >= 1000 ? (ms / 1000).toFixed(2) + ' s' : (Math.round(ms * 10) / 10) + ' ms'; }
  function downtime(availPct) {
    var mins = (1 - availPct / 100) * 365 * 24 * 60;
    if (mins >= 1440) return (mins / 1440).toFixed(1) + ' days/yr';
    if (mins >= 60) return (mins / 60).toFixed(1) + ' h/yr';
    if (mins >= 1) return mins.toFixed(1) + ' min/yr';
    return (mins * 60).toFixed(0) + ' s/yr';
  }

  /* ================================================================
     TOPIC 1 — What is System Design?
     ================================================================ */
  topics.push({
    title: 'What Is System Design? The Big Picture & Asking the Right Questions',
    analogy: `<p>Think of opening a <b>restaurant</b>. Cooking one great dish at home is like writing one function. Opening a restaurant that serves <b>500 people every evening</b> is a different problem: where does the kitchen go, how many cooks, where do you store ingredients, what happens when the fridge breaks, how do orders reach the kitchen, how fast must food arrive? Nobody asks the architect "which knife do you use?". They ask "how does the whole place <i>work</i>, and will it keep working on a busy Saturday?"</p>
<p><b>System design is the restaurant blueprint for software.</b> You decide the big boxes (kitchen, storeroom, counter) and the arrows between them (how orders and food move), long before anyone picks a knife.</p>`,
    explain: `<p>🟢 <b>System design</b> means deciding <b>which big pieces</b> a software system has, <b>how they talk</b> to each other, <b>where the data lives</b>, and <b>how it all keeps working</b> when lots of people use it or when parts break.</p>
<p>There are two zoom levels:</p>
${H.table(['', 'High-Level Design (HLD)', 'Low-Level Design (LLD)'], [
  ['Zoom level', 'The whole city map: boxes and arrows', 'One building\'s floor plan: classes and methods'],
  ['Typical pieces', 'clients, DNS, load balancers, servers, databases, caches, queues, CDNs', 'classes, interfaces, design patterns, method signatures'],
  ['Typical question', '"Design YouTube for 100 million users"', '"Design the classes for a parking lot"'],
  ['Main worry', 'scale, speed, failure, cost, data flow', 'clean code, extensibility, correctness'],
  ['Output', 'architecture diagram + trade-offs', 'class diagram + code']
])}
<p>Every design answers <b>three questions</b>:</p>
<ol>
<li><b>What must it do?</b> — the <span class="c-g">functional requirements</span> ("users can upload a photo").</li>
<li><b>How well must it do it?</b> — the <span class="c-b">non-functional requirements</span> ("upload finishes in under 2 seconds, 99.9% of the time, for 10 million users").</li>
<li><b>Under what limits?</b> — the <span class="c-y">constraints</span> (budget, team size, deadline, laws like GDPR, existing tech).</li>
</ol>
<p>The most important habit: <b>there is no single correct design</b>. Every choice is a <b>trade-off</b> — faster but more expensive, simpler but less scalable, always-on but sometimes slightly stale. A good designer says <i>what</i> they chose and <i>why</i>, and what they gave up.</p>
<p>That is why the first five minutes of any system design conversation are <b>questions, not boxes</b>. You gather requirements: Who are the users? How many? What are the 2–3 core features? Is it read-heavy or write-heavy? Can data be a little stale? What happens if it is down for a minute? The answers decide the architecture. A chat app for 50 employees and WhatsApp share the same features but need completely different systems.</p>
<p>Finally, systems <b>grow in stages</b>. You do not start with 40 microservices. You start with one server, and add each new box only when a real pain (too slow, too many users, too risky) demands it. The visualizer below shows that growth.</p>`,
    clues: [
      '"Design X" with no numbers given → your first job is to <b>ask</b> for users, scale, core features and quality targets.',
      '"How would you build…" / "walk me through the architecture" → they want boxes and arrows (HLD), not classes.',
      '"for 100 million users" / "globally" → scale and latency are the real topic; mention load balancing, caching, replication.',
      '"What would you ask the product manager first?" → requirement gathering: functional, non-functional, constraints, out-of-scope.',
      '"What are the trade-offs?" → name what you gave up (cost, consistency, simplicity) for what you gained.',
      '"Start simple, then scale it" → show the evolution: single server → separate DB → load balancer → cache → CDN.'
    ],
    code: [
      { lang: 'text', title: 'A requirement-gathering checklist you can say out loud', code: `REQUIREMENT GATHERING (first ~5 minutes)

1. Users & clients   : who uses it? web, mobile, other services, AI agents?
2. Core features     : the 2-3 things it MUST do (functional)
3. Out of scope      : what we will NOT design today
4. Scale             : daily active users, requests/second, data size, growth
5. Read vs write     : e.g. 100 reads for every 1 write?
6. Latency target    : e.g. p99 under 200 ms for the main page
7. Availability      : e.g. 99.9% (8.8 h downtime/year) or 99.99%?
8. Consistency       : may users see slightly stale data for a few seconds?
9. Durability        : can we EVER lose data? (payments: never; view counts: ok)
10. Constraints      : budget, team size, deadline, regions, laws (GDPR)` }
    ],
    codeTitle: ['Interview opener checklist'],
    viz: {
      title: 'How a system grows: add a box only when a real pain appears',
      input: 'users=1000000',
      inputLabel: 'Expected users (users=N, from 1 to 100000000)',
      gen: function (input) {
        var o = kvParse(input);
        var raw = o.users !== undefined ? o.users : String(input || '').replace(/[^0-9]/g, '');
        var users = numIn(raw, 1000000, 1, 100000000, 'users');
        var stages = [
          { max: 10, name: 'Stage 1 — one laptop',
            nodes: [bx('U', 'You (browser)', 12, 30), bx('L', 'Laptop: app + DB', 60, 30)], edges: [['U', 'L', 'localhost']],
            why: 'One developer, a handful of testers. The app and its database run on one laptop. Perfectly fine — nobody else depends on it yet.' },
          { max: 1000, name: 'Stage 2 — one server on the internet',
            nodes: [bx('U', 'Users', 10, 35), bx('DNS', 'DNS', 40, 10), bx('S', 'Server: app + DB', 70, 35)], edges: [['U', 'DNS', 'name → IP'], ['U', 'S', 'HTTPS']],
            why: 'Real users need a public address, so we rent one server and register a domain name. DNS turns the name into the server\'s IP address.' },
          { max: 10000, name: 'Stage 3 — separate the database',
            nodes: [bx('U', 'Users', 10, 35), bx('DNS', 'DNS', 38, 10), bx('S', 'App Server', 55, 35), bx('DB', 'Database', 88, 35)], edges: [['U', 'DNS', 'name → IP'], ['U', 'S', 'HTTPS'], ['S', 'DB', 'SQL']],
            why: 'App and DB were fighting for the same CPU and memory. Splitting them lets each machine be sized for its job, and the DB can be backed up on its own.' },
          { max: 100000, name: 'Stage 4 — load balancer + several app servers',
            nodes: [bx('U', 'Users', 8, 35), bx('DNS', 'DNS', 30, 8), bx('LB', 'Load Balancer', 33, 35), bx('A1', 'App 1', 60, 20), bx('A2', 'App 2', 60, 50), bx('DB', 'Database', 88, 35)],
            edges: [['U', 'DNS', 'name → IP'], ['U', 'LB', 'HTTPS'], ['LB', 'A1'], ['LB', 'A2'], ['A1', 'DB'], ['A2', 'DB']],
            why: 'One app server is now a <b>single point of failure</b> and is too busy. A load balancer spreads requests over identical, stateless app servers. One can die and the site stays up.' },
          { max: 1000000, name: 'Stage 5 — cache + read replica',
            nodes: [bx('U', 'Users', 8, 35), bx('LB', 'Load Balancer', 30, 35), bx('A1', 'App 1', 52, 20), bx('A2', 'App 2', 52, 50), bx('C', 'Cache', 78, 8), bx('DB', 'Primary DB', 82, 32), bx('R', 'Read Replica', 82, 55)],
            edges: [['U', 'LB', 'HTTPS'], ['LB', 'A1'], ['LB', 'A2'], ['A1', 'C', 'hot reads'], ['A2', 'C'], ['A1', 'DB', 'writes'], ['A2', 'R', 'reads'], ['DB', 'R', 'copy']],
            why: 'The database is now the bottleneck because most traffic is <b>reads</b>. A cache answers popular reads from memory in about a millisecond, and a read replica takes the rest of the read load.' },
          { max: Infinity, name: 'Stage 6 — CDN + more regions',
            nodes: [bx('U', 'Users worldwide', 12, 35), bx('CDN', 'CDN edge', 40, 10), bx('LB', 'LB (region A)', 42, 35), bx('LB2', 'LB (region B)', 42, 55), bx('APP', 'App fleet', 70, 35), bx('DATA', 'Cache + DB cluster', 82, 10)],
            edges: [['U', 'CDN', 'images, JS'], ['U', 'LB', 'API'], ['U', 'LB2', 'API'], ['LB', 'APP'], ['LB2', 'APP'], ['APP', 'DATA']],
            why: 'Users are far away and static files dominate bandwidth. A CDN serves images and scripts from a city near the user, and a second region keeps the site alive if a whole data center fails.' }
        ];
        var need = 0;
        while (need < stages.length - 1 && users > stages[need].max) need++;
        var frames = [{
          narr: 'You said <b>' + users.toLocaleString('en-US') + '</b> users. Let us grow the system step by step and stop at the first stage that comfortably handles that. (Numbers are rough rules of thumb — real limits depend on how heavy each request is.)',
          parts: [{ type: 'vars', label: 'Input', vals: { users: users.toLocaleString('en-US'), stageNeeded: need + 1 }, hl: { stageNeeded: 'sel' } },
            { type: 'bars', label: 'Rough user capacity per stage (log₁₀ of users)', values: [1, 3, 4, 5, 6, 8], idxLabels: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'], hl: (function () { var h = {}; h[need] = 'sel'; return h; })() }]
        }];
        stages.forEach(function (st, i) {
          var hl = {}, ehl = {};
          st.nodes.forEach(function (n) { hl[n.id] = i < need ? 'done' : i === need ? 'ok' : 'done'; });
          st.edges.forEach(function (e) { ehl[e[0] + '-' + e[1]] = i === need ? 'ok' : i < need ? 'cur' : 'done'; });
          var status = i < need ? '<span class="c-y">Not enough for ' + users.toLocaleString('en-US') + ' users — keep growing.</span>'
            : i === need ? '<span class="c-g">✔ This stage fits your scale. Stop here: every extra box costs money and adds things that can break.</span>'
            : '<span class="c-m">Not needed yet (YAGNI — "you aren\'t gonna need it"). Know it exists; build it when the pain arrives.</span>';
          frames.push({ narr: '<b>' + st.name + '</b> (good up to ~' + (st.max === Infinity ? '100M+' : st.max.toLocaleString('en-US')) + ' users). ' + st.why + ' ' + status,
            parts: [{ type: 'graph', label: st.name, directed: true, height: 62, nodes: cp(st.nodes), edges: cp(st.edges), hl: hl, ehl: ehl }] });
        });
        frames.push({ narr: '<b>Lesson:</b> design is a <b>sequence of reactions to real bottlenecks</b>. In an interview, say "I will start simple and evolve it", then show which pain each new box removes.',
          parts: [{ type: 'table', label: 'Pain → box that removes it', columns: ['Pain', 'Box added'], rows: [['Strangers cannot reach my laptop', 'Public server + DNS'], ['App and DB fight for RAM', 'Separate DB machine'], ['One server = one failure kills site', 'Load balancer + 2+ app servers'], ['DB drowning in reads', 'Cache + read replicas'], ['Far-away users, heavy images', 'CDN + extra region']], hl: (function () { var h = {}; h[need] = 'sel'; return h; })() }] });
        return frames;
      }
    },
    examples: [
      { title: 'Turning "Design Instagram" into a solvable problem', html: `<p>Bad start: drawing Kafka and 12 microservices in minute one. Good start — ask, then write down:</p>
${H.table(['Question you ask', 'Answer you assume (say it out loud)'], [
  ['Core features?', 'Upload photo, follow users, see a home feed. Out of scope: stories, DMs, ads.'],
  ['How many users?', '500M monthly, 100M daily active users (DAU).'],
  ['Read/write ratio?', 'Heavy reads: people scroll far more than they post (say 100 : 1).'],
  ['Latency?', 'Feed loads in &lt; 300 ms at p99.'],
  ['Consistency?', 'A new post may take a few seconds to show in followers\' feeds — fine.'],
  ['Durability?', 'Never lose an uploaded photo.']
])}
<p>Now the design writes itself: object storage for photos, a CDN (read-heavy, global), a feed service with a cache, and relaxed consistency for feeds.</p>` },
      { title: 'Same feature, opposite designs — why questions matter', html: `<p>Feature: "show a number on screen".</p>
<ul><li><b>Bank balance:</b> must be exactly right after every transfer (<span class="c-r">strong consistency</span>), small traffic per user, money must never vanish → single source of truth, transactions, maybe slower.</li>
<li><b>YouTube view count:</b> billions of increments, nobody cares if it is off by 50 for a minute (<span class="c-g">eventual consistency</span>) → count in memory, batch writes, show an approximate number.</li></ul>
<p>Same "functional" feature, completely different architecture — because the <b>non-functional</b> needs differ.</p>` },
      { title: 'HLD vs LLD on one product (a URL shortener)', html: `<p><b>HLD view:</b> client → load balancer → stateless app servers → key-value store + cache; 100:1 reads; redirects must be fast; IDs generated without collisions across servers.</p>
<p><b>LLD view:</b> a <code>ShortCodeGenerator</code> interface with a <code>Base62Encoder</code>, a <code>UrlRepository</code>, validation of the long URL, error classes.</p>
<p>Both are "design" — interviewers will tell you which zoom level they want. If unsure, ask: "Do you want the overall architecture or the class structure?"</p>` },
      { title: 'A 45-minute interview time plan', html: `${H.table(['Minutes', 'What you do'], [
  ['0–5', 'Requirements: functional, non-functional, out of scope'],
  ['5–10', 'Quick estimates: users → requests/second, storage'],
  ['10–15', 'API sketch + data model'],
  ['15–30', 'High-level diagram, walk one request through it'],
  ['30–40', 'Deep dive on 1–2 hard parts (bottleneck, failure)'],
  ['40–45', 'Trade-offs, what you would improve next']
])}<p>This module gives you the vocabulary for minutes 0–15. Module 3 drills the full framework.</p>` }
    ],
    deepDive: `<p><b>Why open-ended questions?</b> Real engineering problems arrive vague ("checkout is slow", "we're launching in Brazil"). Interviewers watch whether you <b>reduce ambiguity</b> before building. Jumping straight to a diagram signals you'd build the wrong thing quickly.</p>
<p><b>Every box has a running cost.</b> A cache must be kept in sync with the DB (stale data bugs); a queue adds retries, duplicates and ordering problems; a second region doubles infrastructure and adds data replication lag. Senior engineers are measured by the boxes they <i>don't</i> add. The famous phrase is "<b>boring technology</b>": pick well-understood tools unless a requirement truly needs something special.</p>
<p><b>Conway's law:</b> systems tend to mirror the communication structure of the teams that build them. Three teams usually ship three services. That is why "monolith vs microservices" is partly an <i>organisational</i> question (see the monolith topic).</p>
<p><b>The "-ilities":</b> scalability, availability, reliability, durability, maintainability, observability, security, cost-efficiency. You cannot max all of them; you rank them for this product. A payments system ranks durability and consistency first; a social feed ranks availability and latency first.</p>
<p><b>Numbers beat adjectives.</b> "Fast" and "scalable" mean nothing until you attach numbers: requests per second, p99 latency, gigabytes per day. Module 3 (Estimation) teaches you to produce those numbers in 2 minutes.</p>
<p><b>Production reality:</b> most real systems are boring three-tier apps (client → app servers → database) with a cache and a queue. Mastering that shape deeply is worth more than memorising 20 exotic patterns.</p>`,
    aiEra: `<p><b>What AI changes:</b> an AI assistant can draw a plausible architecture for "design Uber" in 10 seconds. That makes the <i>generic</i> diagram worthless as a signal. What still matters — in interviews and on the job — is <b>choosing</b> between options for <i>these</i> requirements and defending the trade-off.</p>
<p><b>Use AI as a partner:</b> <code>List 15 clarifying questions a senior engineer would ask before designing a food-delivery app. Don't propose a design.</code> Or: <code>Here is my design and my requirements. Which requirement does it fail and why?</code> AI is good at brainstorming missing questions and failure modes.</p>
<p><b>Where AI goes wrong:</b> it over-engineers (Kafka, Kubernetes and microservices for 500 users), invents numbers without saying they are assumptions, and ignores cost and team size. It also tends to describe <i>ideal</i> systems rather than what a 5-person team can operate.</p>
<p><b>AI is now a box in the diagram too:</b> many products call an LLM API. That box is slow (hundreds of ms to seconds), costs money per call, and can fail or rate-limit you. Treat it like any external dependency: timeouts, retries, fallbacks, caching.</p>
<p><b>What you must still own:</b> the requirement questions, the numbers, the trade-off reasoning and the accountability when the design meets real traffic.</p>`,
    problems: [{
      title: 'Requirement-gather "Design Pastebin"',
      level: 'Easy', tags: ['requirements', 'interview framework'], companies: ['Amazon', 'Microsoft', 'Atlassian'],
      statement: `<p>The interviewer says only: <b>"Design Pastebin"</b> (a site where you paste text and get a short link to share it). Before drawing anything, write (a) the clarifying questions you would ask, (b) the functional requirements, (c) the non-functional requirements with numbers, and (d) what is out of scope.</p>`,
      constraints: `<p>Assume the interviewer answers "you decide, but state your assumptions". You have about 5 minutes.</p>`,
      example: `<p>Input: <code>"Design Pastebin"</code>. A strong output starts like: ${H.c('g', 'FR1: user pastes text (≤ 1 MB) and gets a unique short URL')}, ${H.c('b', 'NFR1: reading a paste p99 &lt; 100 ms')}, ${H.c('m', 'Out of scope: user accounts, syntax highlighting')}. Why: each line is specific and testable, and the NFRs carry numbers the design can be checked against.</p>`,
      brute: { why: `<p><b>Naive approach:</b> start drawing immediately — "users hit a load balancer, then a microservice cluster on Kubernetes writing to Cassandra through Kafka". It breaks because nobody knows yet whether there are 100 users or 100 million, whether pastes expire, or how big they are. You may design for the wrong scale (too expensive or too weak), miss a core feature (expiry), and the interviewer cannot judge your reasoning because there is none to judge.</p>` },
      mcq: { q: 'What is the single most useful first question for "Design Pastebin"?', options: ['Which database should we use?', 'Roughly how many pastes are created and read per day, and how big can a paste be?', 'Should we use Java or Go?', 'Should we deploy on Kubernetes?'], answer: 1, explain: 'Scale and size drive every later choice (storage, caching, sharding). Tech choices come after requirements.' },
      hints: [
        `<p>Hint 1: Split your questions into three buckets — <b>what it does</b> (features), <b>how well</b> (speed, uptime, durability) and <b>limits</b> (size, expiry, budget).</p>`,
        `<p>Hint 2: Pastebin is <b>read-heavy</b> (one paste is read many times). Ask for the read/write ratio and whether links must be unguessable (privacy).</p>`,
        `<p>Hint 3: Recipe — 3 to 4 functional lines, 4 to 5 NFRs each with a number (latency, availability, durability, scale), 2 to 3 out-of-scope items, then say your assumptions out loud.</p>`
      ],
      solution: {
        approach: `<p><b>Clarifying questions:</b> Who creates pastes — anonymous or logged-in users? How large can a paste be? Do pastes expire? Can people edit them? Should links be unguessable (private)? How many new pastes per day, how many reads? Any analytics (view counts)?</p>
<p><b>Functional requirements (assumed):</b></p>
<ol><li>User submits text up to <b>1 MB</b> and receives a <b>short unique URL</b>.</li><li>Anyone with the URL can <b>read</b> the paste.</li><li>User can set an <b>expiry</b> (10 min, 1 day, 1 month, never); expired pastes return 404.</li><li>(Optional) user can delete their paste with a secret delete token.</li></ol>
<p><b>Non-functional requirements (with numbers):</b></p>
<ol><li><b>Scale:</b> 1M new pastes/day (~12 writes/s average), 10M reads/day (~115 reads/s), 10:1 read/write.</li><li><b>Latency:</b> read p99 &lt; 100 ms, create p99 &lt; 300 ms.</li><li><b>Availability:</b> 99.9% for reads (people share links; broken links hurt).</li><li><b>Durability:</b> a created, unexpired paste is never lost.</li><li><b>Privacy:</b> URLs not guessable (random 8-character codes, not sequential).</li></ol>
<p><b>Out of scope:</b> user accounts, syntax highlighting, search, comments.</p>
<p><b>Why this is strong:</b> every later decision can be traced to a line here: 1 MB pastes → store text in object storage with metadata in a DB; read-heavy → cache popular pastes; unguessable URLs → random IDs; expiry → TTL index or cleanup job.</p>`,
        complexity: `<p>Time spent: ~5 minutes. Payoff: removes ambiguity so the remaining 40 minutes design the <i>right</i> system. Storage estimate follows directly: 1M/day × ~10 KB average ≈ 10 GB/day ≈ 3.6 TB/year.</p>`,
        followUps: ['How would the design change if pastes could be 100 MB?', 'What changes if the read/write ratio becomes 1000:1 because some pastes go viral?', 'Which requirement would you drop first if the deadline were one week?']
      }
    }]
  });

  /* ================================================================
     TOPIC 2 — Clients and Servers
     ================================================================ */
  topics.push({
    title: 'Clients & Servers: Who Asks, Who Answers',
    analogy: `<p>In a restaurant, <b>you</b> are the <b>client</b>: you look at the <b>menu</b> (the list of things you are allowed to ask for), tell the waiter your order (a <b>request</b>), and wait. The <b>kitchen</b> is the <b>server</b>: it never walks up to your table on its own; it waits for orders, cooks, and sends food back (a <b>response</b>). One kitchen serves many tables at once. And the kitchen itself is a <i>customer</i> of the vegetable supplier — so a server can also be a client of someone else.</p>`,
    explain: `<p>🟢 A <b>client</b> is any program that <b>starts</b> a conversation by sending a request. A <b>server</b> is a program that <b>waits</b> for requests and answers them. That's it — the roles are about <i>who speaks first</i>, not about how big the computer is.</p>
<ul>
<li><b>Clients:</b> a web browser, a mobile app, a smart TV, a command-line tool like <code>curl</code>, another backend service, or an AI agent calling your API.</li>
<li><b>Servers:</b> a web server sending HTML, an API server returning JSON, a database server answering queries, a cache server like Redis.</li>
</ul>
<p>"Server" means two things in everyday speech: the <b>program</b> (a process listening on a port) and the <b>machine</b> it runs on. One machine can run many server programs, each on its own <b>port</b> (door number): 443 for HTTPS, 5432 for PostgreSQL, 6379 for Redis.</p>
<p><b>How they talk — HTTP request/response.</b> On the web, clients and servers usually speak <b>HTTP</b>. A request has:</p>
${H.table(['Part', 'Example', 'Meaning'], [
  ['Method', '<code>GET</code>, <code>POST</code>, <code>PUT</code>, <code>DELETE</code>', 'what you want to do (read, create, replace, remove)'],
  ['Path', '<code>/orders/42</code>', 'which thing (resource) you mean'],
  ['Headers', '<code>Host</code>, <code>Authorization</code>, <code>Content-Type</code>', 'extra information about the request'],
  ['Body', '<code>{"item":"dosa","qty":2}</code>', 'data you send (mostly with POST/PUT)']
])}
<p>The response carries a <b>status code</b> plus headers and a body:</p>
${H.table(['Family', 'Meaning', 'Common ones'], [
  ['<span class="c-g">2xx</span>', 'success', '200 OK, 201 Created, 204 No Content'],
  ['<span class="c-b">3xx</span>', 'go somewhere else', '301 Moved Permanently, 304 Not Modified'],
  ['<span class="c-y">4xx</span>', 'client made a mistake', '400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 429 Too Many Requests'],
  ['<span class="c-r">5xx</span>', 'server failed', '500 Internal Server Error, 502 Bad Gateway, 503 Service Unavailable, 504 Gateway Timeout']
])}
<p><b>Servers are clients too.</b> When your app server asks the database for rows, the app server is the <i>client</i> and the database is the <i>server</i>. Real systems are chains of these client→server hops.</p>
<p><b>Stateless vs stateful (first look).</b> If the server remembers nothing between requests (every request carries everything needed, e.g. a login token), it is <b>stateless</b>. Stateless servers are easy to copy: any copy can answer any request, which is the secret to scaling (Module 2). If the server keeps your shopping cart in its own memory, it is <b>stateful</b> — and you are stuck talking to that one machine.</p>
<p><b>Other models.</b> In <b>peer-to-peer</b> (BitTorrent, some video calls) every computer is both client and server. In <b>push</b> setups (WebSockets, Server-Sent Events) the client opens a long-lived connection so the server can send updates without being asked each time — but even there, the client started the connection.</p>`,
    clues: [
      '"Who initiates the connection?" → that side is the client; the listener is the server.',
      '"The service calls the payment provider" → your service is a <b>client</b> in that hop; think timeouts and retries.',
      '"Any server should be able to handle any request" → the server must be <b>stateless</b>; keep sessions elsewhere.',
      '"Return 201 / 404 / 429 / 503" → the interviewer is checking you know HTTP status families and who is at fault.',
      '"Real-time updates to the browser" → plain request/response is not enough; mention WebSockets or SSE (client still opens the connection).',
      '"Thin client" / "logic runs on the device" → where the work happens (server vs client) is a design choice with latency and security trade-offs.'
    ],
    code: [
      { lang: 'http', title: 'A real HTTP request and response', code: `POST /orders HTTP/1.1
Host: api.dosa-house.example
Content-Type: application/json
Authorization: Bearer eyJhbGciOi...token
Content-Length: 31

{"item": "masala dosa", "qty": 2}

HTTP/1.1 201 Created
Content-Type: application/json
Location: /orders/43

{"id": 43, "status": "received", "etaMinutes": 15}` },
      { lang: 'python', title: 'Tiny server sketch with Python standard library (http.server)', code: `from http.server import BaseHTTPRequestHandler, HTTPServer
import json

# The "menu": what clients are allowed to ask for.
MENU = [
    {"id": 1, "name": "Masala Dosa", "price": 120},
    {"id": 2, "name": "Filter Coffee", "price": 40},
]


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        # The server waits; this method runs only when a client sends GET.
        if self.path == "/menu":
            body = json.dumps(MENU).encode("utf-8")
            self.send_response(200)                     # status line
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()                          # blank line ends headers
            self.wfile.write(body)                      # the body
        else:
            self.send_error(404, "Not Found")          # client asked for something unknown


if __name__ == "__main__":
    # Listen on port 8080 on every network interface of this machine.
    HTTPServer(("0.0.0.0", 8080), Handler).serve_forever()` },
      { lang: 'java', title: 'Same server in Java (JDK built-in HttpServer)', code: `import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;

public class MenuServer {
    public static void main(String[] args) throws IOException {
        // Bind to port 8080; 0 = default backlog of waiting connections.
        HttpServer server = HttpServer.create(new InetSocketAddress(8080), 0);
        server.createContext("/menu", exchange -> {
            byte[] body = "[{\\"id\\":1,\\"name\\":\\"Masala Dosa\\",\\"price\\":120}]"
                    .getBytes(StandardCharsets.UTF_8);
            if (!exchange.getRequestMethod().equals("GET")) {
                exchange.sendResponseHeaders(405, -1);   // Method Not Allowed, no body
                exchange.close();
                return;
            }
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, body.length);
            try (OutputStream os = exchange.getResponseBody()) {
                os.write(body);
            }
        });
        server.start();   // now it waits for clients
        System.out.println("Listening on http://localhost:8080/menu");
    }
}` },
      { lang: 'python', run: true, title: 'Runnable: parse a raw HTTP request the way a server does', code: `raw = (
    "POST /orders HTTP/1.1\\r\\n"
    "Host: api.dosa-house.example\\r\\n"
    "Content-Type: application/json\\r\\n"
    "\\r\\n"
    '{"item": "masala dosa", "qty": 2}'
)

head, body = raw.split("\\r\\n\\r\\n", 1)      # blank line separates headers from body
lines = head.split("\\r\\n")
method, path, version = lines[0].split(" ")  # request line
headers = dict(line.split(": ", 1) for line in lines[1:])

print("method :", method)
print("path   :", path)
print("host   :", headers["Host"])
print("body   :", body)

# A server's routing decision in miniature
if method == "POST" and path == "/orders":
    print("-> 201 Created, Location: /orders/43")
elif method == "GET":
    print("-> 200 OK")
else:
    print("-> 405 Method Not Allowed")` }
    ],
    codeTitle: ['HTTP on the wire', 'Python server sketch', 'Java server sketch', 'Request parsing (runnable)'],
    viz: {
      title: 'Many clients, one server (and the server is a client of the DB)',
      input: 'GET /menu, POST /orders, GET /orders/42, GET /orders/7, DELETE /menu',
      inputLabel: 'Requests: METHOD /path, comma separated (paths: /menu, /orders, /orders/ID)',
      gen: function (input) {
        var reqs = String(input || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
        if (!reqs.length) throw new Error('Enter requests like: GET /menu, POST /orders');
        if (reqs.length > 8) throw new Error('Use at most 8 requests');
        var nodes = [bx('BR', 'Browser', 10, 10), bx('MO', 'Mobile App', 10, 32), bx('PA', 'Partner Svc', 10, 54), bx('S', 'API Server :443', 50, 32), bx('DB', 'Database :5432', 87, 32)];
        var edges = [['BR', 'S'], ['MO', 'S'], ['PA', 'S'], ['S', 'DB']];
        var clients = ['BR', 'MO', 'PA'], names = { BR: 'Browser', MO: 'Mobile App', PA: 'Partner Svc' };
        var orders = { 42: 'dosa x2' }, nextId = 43, log = [], frames = [];
        frames.push({ narr: 'Three different <b>clients</b> share one <b>API server</b>. The server listens on port 443 and never speaks first. It is itself a <b>client</b> of the database on port 5432. Existing order: #42.',
          parts: [{ type: 'graph', label: 'Who talks to whom', directed: true, height: 64, nodes: cp(nodes), edges: cp(edges), tags: { S: 'waits for requests', DB: 'waits for queries' } },
            { type: 'map', label: 'orders table', entries: Object.keys(orders).map(function (k) { return [k, orders[k]]; }) }] });
        reqs.forEach(function (r, i) {
          var m = r.match(/^([A-Za-z]+)\s+(\/\S*)$/);
          if (!m) throw new Error('Bad request "' + r + '". Format: METHOD /path');
          var method = m[1].toUpperCase(), path = m[2], c = clients[i % 3];
          var status, note, usesDb = false, sql = '';
          var om = path.match(/^\/orders\/(\d+)$/);
          if (path === '/menu' && method === 'GET') { status = '200 OK'; note = 'menu is static, served from memory'; }
          else if (path === '/orders' && method === 'POST') { usesDb = true; sql = 'INSERT order ' + nextId; orders[nextId] = 'new order'; status = '201 Created (/orders/' + nextId + ')'; note = 'a new row was written'; nextId++; }
          else if (om && method === 'GET') { usesDb = true; sql = 'SELECT order ' + om[1]; status = orders[om[1]] ? '200 OK' : '404 Not Found'; note = orders[om[1]] ? 'row found' : 'no such order — the client asked for something that does not exist'; }
          else if (path === '/menu' || path === '/orders' || om) { status = '405 Method Not Allowed'; note = 'path exists but this method is not supported there'; }
          else { status = '404 Not Found'; note = 'no route matches this path'; }
          var ek = c + '-S', good = /^2/.test(status);
          var reqText = '<pre>' + hesc(method + ' ' + path + ' HTTP/1.1\nHost: api.dosa-house.example' + (method === 'POST' ? '\nContent-Type: application/json\n\n{"item":"dosa","qty":2}' : '')) + '</pre>';
          var hl1 = {}; hl1[c] = 'cur'; hl1.S = 'cur';
          var e1 = {}; e1[ek] = 'cur';
          frames.push({ narr: 'Request ' + (i + 1) + ': the <b>' + names[c] + '</b> (client) sends <code>' + hesc(method + ' ' + path) + '</code>. The server wakes up only because a request arrived.',
            parts: [{ type: 'graph', label: 'Request travels client → server', directed: true, height: 64, nodes: cp(nodes), edges: cp(edges).map(function (e) { if (e[0] === c) e[2] = method + ' ' + path; return e; }), hl: hl1, ehl: e1 },
              { type: 'text', label: 'What is on the wire', html: reqText }] });
          if (usesDb) {
            var hl2 = { S: 'cur', DB: 'cur' }, e2 = {}; e2[ek] = 'ok'; e2['S-DB'] = 'cur';
            frames.push({ narr: 'To answer, the API server becomes a <b>client</b> of the database and sends a query (<code>' + hesc(sql) + '</code>). Same pattern, one hop deeper.',
              parts: [{ type: 'graph', label: 'Server acting as a client', directed: true, height: 64, nodes: cp(nodes), edges: cp(edges).map(function (e) { if (e[0] === 'S') e[2] = sql; return e; }), hl: hl2, ehl: e2 },
                { type: 'map', label: 'orders table', entries: Object.keys(orders).map(function (k) { return [k, orders[k]]; }), hl: (function () { var h = {}; if (/INSERT/.test(sql)) h[String(nextId - 1)] = 'ok'; else if (om) h[om[1]] = orders[om[1]] ? 'ok' : 'bad'; return h; })() }] });
          }
          log.push([String(i + 1), names[c], method + ' ' + path, status]);
          var hl3 = {}; hl3[c] = good ? 'ok' : 'bad'; hl3.S = good ? 'ok' : 'bad';
          var e3 = {}; e3[ek] = good ? 'sel' : 'bad';
          frames.push({ narr: 'Response: <b>' + status + '</b> — ' + note + '. ' + (good ? '2xx means success.' : (/^4/.test(status) ? '4xx means the <i>client</i> asked for something wrong; retrying the same request will not help.' : '')),
            parts: [{ type: 'graph', label: 'Response travels back on the same connection', directed: true, height: 64, nodes: cp(nodes), edges: cp(edges).map(function (e) { if (e[0] === c) e[2] = '↩ ' + status.split(' (')[0]; return e; }), hl: hl3, ehl: e3 },
              { type: 'table', label: 'Server access log', columns: ['#', 'client', 'request', 'status'], rows: cp(log), hl: (function () { var h = {}; h[log.length - 1] = good ? 'ok' : 'bad'; return h; })() }] });
        });
        frames.push({ narr: 'Done. Notice: the server never contacted a client first, any client type can call the same API, and the server answered every request using only what was in the request + the database. That is a <b>stateless</b> server — easy to copy later.',
          parts: [{ type: 'table', label: 'Final access log', columns: ['#', 'client', 'request', 'status'], rows: cp(log) }] });
        return frames;
      }
    },
    examples: [
      { title: 'Reading a request/response line by line', html: `<p><code>GET /orders/42 HTTP/1.1</code> → read (GET) order 42 using HTTP version 1.1. <code>Host: api.shop.example</code> → which website (one server can host many). <code>Authorization: Bearer …</code> → who is asking. Response <code>HTTP/1.1 200 OK</code> + <code>Content-Type: application/json</code> + body <code>{"id":42,"status":"shipped"}</code>.</p>
<p>If the order belonged to someone else, a well-designed server returns <span class="c-y">403 Forbidden</span> (or 404 to avoid revealing it exists). If the database was down, <span class="c-r">503 Service Unavailable</span>.</p>`, code: { lang: 'http', code: `GET /orders/42 HTTP/1.1
Host: api.shop.example
Authorization: Bearer eyJhbGciOi...token

HTTP/1.1 200 OK
Content-Type: application/json

{"id": 42, "status": "shipped"}` } },
      { title: 'One checkout, four client→server hops', html: `${H.table(['Hop', 'Client', 'Server'], [
  ['1', 'Mobile app', 'API gateway'],
  ['2', 'API gateway', 'Order service'],
  ['3', 'Order service', 'Payment provider (e.g. a card processor)'],
  ['4', 'Order service', 'Database']
])}<p>The order service is a server in hop 2 and a client in hops 3 and 4. Each client side needs a <b>timeout</b> — otherwise one slow payment provider freezes your whole checkout.</p>` },
      { title: 'Client-server vs peer-to-peer', html: `<p><b>Netflix</b>: millions of clients, servers (and CDN boxes) owned by Netflix — easy to control quality, secure, update.</p>
<p><b>BitTorrent</b>: every peer downloads pieces from other peers and uploads to them — no central bill for bandwidth, but no control, uneven speed and harder security.</p>
<p>Interview takeaway: almost every product you will be asked to design is client-server; P2P appears in niche spots (video call media paths via WebRTC, file sharing).</p>` },
      { title: 'Stateful trap: the shopping cart in RAM', html: `<p>Version 1 stores each user\'s cart in a dictionary inside the server process. Works with one server. Add a second server behind a load balancer: Asha adds an item (lands on server A), refreshes (lands on server B) — <span class="c-r">cart empty!</span></p>
<p>Fix: keep the server stateless; store the cart in a shared store (Redis or the DB) keyed by user ID, or in the client (cookie/local storage) if it is small and not sensitive.</p>` }
    ],
    deepDive: `<p><b>What "listening" really means.</b> A server process asks the operating system for a <b>socket</b> bound to an IP and port, then calls <code>listen()</code>. The OS completes TCP handshakes and queues new connections in a <b>backlog</b>; the server <code>accept()</code>s them. If the backlog fills (server too slow), new clients see connection timeouts or resets before your code even runs.</p>
<p><b>Concurrency models.</b> <i>Thread-per-request</i> (classic Java servlet containers): simple code, each blocked request holds a thread (memory). <i>Event loop</i> (Node.js, Nginx, Netty): one thread juggles thousands of connections, but CPU-heavy work blocks everyone. <i>Virtual threads</i> (Java 21+) and goroutines (Go) give thread-style code with event-loop-like efficiency. All three are still "a server waiting for clients".</p>
<p><b>Connections are expensive; reuse them.</b> Opening TCP + TLS costs 1–3 network round trips. HTTP/1.1 keep-alive and HTTP/2 multiplexing let one connection carry many requests; servers keep <b>connection pools</b> to databases for the same reason.</p>
<p><b>Safe and idempotent methods.</b> GET/HEAD are <i>safe</i> (should not change data). GET, PUT, DELETE are <i>idempotent</i> (doing them twice = doing them once). POST is neither — retrying a POST after a timeout can create two orders. That is why payment APIs accept an <b>idempotency key</b> header (Module 9).</p>
<p><b>Who is at fault decides retries.</b> 4xx = client error → fix the request, do not blindly retry (except 429 after waiting). 5xx = server error → retry with backoff may help. 502/504 often mean a proxy could not reach the real server in time.</p>`,
    aiEra: `<p><b>Your service is now often a client of an AI provider.</b> Calling an LLM API is a normal client→server hop with unusual numbers: responses take 0.5–30 s, cost money per token, and may return 429 (rate limited) or 529/503 (overloaded). Treat it like any flaky dependency: timeouts, retries with backoff, fallbacks to a smaller model or cached answer.</p>
<p><b>Streaming responses.</b> Chat UIs show words as they are generated. Under the hood the server keeps the HTTP response open and sends chunks (Server-Sent Events). It is still client-initiated request/response — just a long one.</p>
<p><b>AI agents are clients of your API.</b> Agents now call APIs automatically (often through the Model Context Protocol, where an AI app is the MCP <i>client</i> and your tool is the MCP <i>server</i>). Clear method semantics, good error messages, idempotency and rate limits matter even more when the caller is a loop that may retry 50 times.</p>
<p><b>Use AI as a partner:</b> <code>Here is a curl request and the 4xx response. Explain who is at fault and what to change.</code> <b>Where it goes wrong:</b> it may suggest retrying non-idempotent POSTs blindly. <b>You own:</b> the contract (methods, status codes) and failure handling.</p>`,
    problems: [{
      title: 'Spot the clients and servers in a food-delivery order',
      level: 'Easy', tags: ['client-server', 'request flow'], companies: ['Swiggy', 'DoorDash', 'Uber'],
      statement: `<p>A customer taps "Place order" in a food-delivery app. The app calls the company\'s API; the API saves the order in its database, charges the card through an external payment provider, and pushes a notification to the restaurant\'s tablet app, which is kept connected with a WebSocket. List every hop, and for each say which side is the <b>client</b> and which is the <b>server</b>. Then say which hop needs the most careful timeout and why.</p>`,
      constraints: `<p>Count only network hops (not function calls inside one program).</p>`,
      example: `<p>Hop 1: ${H.c('b', 'Customer app (client)')} → ${H.c('g', 'Company API (server)')}. Why: the app starts the conversation by sending <code>POST /orders</code>.</p>`,
      brute: { why: `<p><b>Naive answer:</b> "The phone is the client, the backend is the server, done." It breaks because it hides the internal hops where real failures happen — the API is a <i>client</i> of the database and the payment provider, and missing that means no timeouts, no retries and no thought about what happens when the payment provider is slow.</p>` },
      mcq: { q: 'In the hop "Company API → payment provider", the company API is…', options: ['the server', 'the client', 'neither — it is peer-to-peer', 'both at the same time on that hop'], answer: 1, explain: 'It initiates the request, so it is the client on that hop, even though it is a server for the mobile app.' },
      hints: [
        `<p>Hint 1: For each arrow, ask "who spoke first?" — that side is the client on that arrow. A box can be a server on one arrow and a client on another.</p>`,
        `<p>Hint 2: The WebSocket to the restaurant tablet was <i>opened by the tablet</i>, even though the server later pushes messages down it.</p>`,
        `<p>Hint 3: The hop you do not control (external provider) and that touches money needs a timeout plus an idempotency key so a retry never charges twice.</p>`
      ],
      solution: {
        approach: `<p><b>Hops:</b></p>
<ol><li><b>Customer app → Company API</b> (<code>POST /orders</code>): app = client, API = server.</li>
<li><b>Company API → Database</b> (INSERT order): API = client, DB = server.</li>
<li><b>Company API → Payment provider</b> (charge card): API = client, provider = server.</li>
<li><b>Restaurant tablet → Company push service</b> (WebSocket opened at login): tablet = client, push service = server. When the order arrives the server <i>pushes</i> a message down this already-open connection — the server speaks, but the client created the connection.</li>
<li>(Often) <b>Company API → Push service</b> (internal call to fan out the notification): API = client.</li></ol>
<p><b>Most careful timeout: hop 3 (payment provider).</b> It is outside your control, can be slow, and involves money. Use a timeout (e.g. 3–5 s), send an <b>idempotency key</b> so retries cannot double-charge, and design for "unknown" outcomes (payment may have succeeded even if you timed out — reconcile later by querying the provider with the same key).</p>
<p><b>Why it matters:</b> drawing every client→server hop is how you find where latency adds up and where failures enter.</p>`,
        complexity: `<p>5 network hops for one tap; the user-visible latency is roughly the sum of the sequential hops (1 → 2 → 3) while hop 4/5 can be done asynchronously after replying.</p>`,
        followUps: ['Which hops could happen after you already replied "Order placed" to the customer?', 'What should the API return if the payment provider times out?']
      }
    }]
  });

  /* ================================================================
     TOPIC 3 — IP, ports, DNS at a glance
     ================================================================ */
  topics.push({
    title: 'IP Addresses, Ports & DNS at a Glance',
    analogy: `<p>An <b>IP address</b> is the <b>street address of a building</b> — the post office needs it to deliver anything. A <b>port</b> is the <b>flat (apartment) number</b> inside that building: the same building has a restaurant at door 443 and a storeroom at door 5432. <b>DNS</b> is your phone\'s <b>contacts app</b>: you tap "Mom" and the phone looks up the number for you. Nobody memorises 142.250.183.14; you type <code>google.com</code> and DNS finds the number.</p>`,
    explain: `<p>🟢 <b>IP address</b> = a number that identifies a machine (or network interface) on a network so packets can reach it.</p>
<ul>
<li><b>IPv4</b>: 32 bits written as four numbers 0–255, e.g. <code>203.0.113.10</code>. Only about 4.3 billion exist — not enough for every device.</li>
<li><b>IPv6</b>: 128 bits written in hex, e.g. <code>2001:db8::10</code>. Practically unlimited; widely deployed alongside IPv4.</li>
<li><b>Public vs private</b>: private ranges (<code>10.0.0.0/8</code>, <code>172.16.0.0/12</code>, <code>192.168.0.0/16</code>) are used inside homes, offices and cloud networks (VPCs). They are not reachable from the internet directly; a router doing <b>NAT</b> (Network Address Translation) shares one public IP among many private ones.</li>
</ul>
<p>🟢 <b>Port</b> = a number 0–65535 that picks <i>which program</i> on that machine gets the data. <code>IP:port</code> together identify one server program.</p>
${H.table(['Port', 'Usually used by'], [['80', 'HTTP (plain web)'], ['443', 'HTTPS (encrypted web) — also HTTP/3 over UDP'], ['22', 'SSH (remote login)'], ['53', 'DNS'], ['5432 / 3306', 'PostgreSQL / MySQL'], ['6379', 'Redis'], ['9092', 'Kafka']])}
<p>🟢 <b>DNS (Domain Name System)</b> = the internet\'s phone book. It turns names like <code>www.shop.example.com</code> into IP addresses. It is a <b>giant distributed, cached database</b>:</p>
<ol>
<li><b>Browser cache</b> → <b>operating system cache</b> (and the <code>hosts</code> file). Found? Done in ~0 ms.</li>
<li>Otherwise ask a <b>recursive resolver</b> (your ISP\'s, or public ones like 1.1.1.1 / 8.8.8.8). It does the legwork for you and caches answers.</li>
<li>On a cache miss the resolver asks a <b>root server</b> ("who handles <code>.com</code>?") → a <b>TLD server</b> ("who handles <code>example.com</code>?") → the domain\'s <b>authoritative name server</b> ("what is the IP of <code>www.shop.example.com</code>?").</li>
<li>The answer comes back with a <b>TTL</b> (time-to-live, e.g. 300 seconds): everyone may cache it that long.</li>
</ol>
<p>Common <b>record types</b>:</p>
${H.table(['Record', 'Maps', 'Example'], [['A', 'name → IPv4', 'shop.example.com → 203.0.113.10'], ['AAAA', 'name → IPv6', 'shop.example.com → 2001:db8::10'], ['CNAME', 'name → another name (alias)', 'www.shop.example.com → shop.example.com'], ['MX', 'domain → mail server', 'example.com → mail.example.com'], ['NS', 'domain → its name servers', 'example.com → ns1.dnsprovider.example'], ['TXT', 'name → free text', 'domain ownership proofs, email security (SPF)']])}
<p><b>Why system designers care:</b> DNS is step one of almost every request; a cold lookup can add tens of milliseconds; TTL controls how fast you can move traffic to new servers; and DNS can do coarse load balancing (several IPs per name, or different answers per country — "GeoDNS").</p>`,
    clues: [
      '"How does the browser find the server?" → DNS resolution chain: browser cache → OS → resolver → root → TLD → authoritative.',
      '"We changed servers but some users still hit the old one" → DNS caching and <b>TTL</b>.',
      '"Route users to the nearest data center" → GeoDNS / latency-based DNS (or anycast).',
      '"Many sites on one IP" → the server uses the HTTP <code>Host</code> header / TLS SNI to pick the site.',
      '"Private subnet", "VPC", "not exposed to the internet" → private IP ranges + NAT; only the load balancer gets a public address.',
      '"Run Postgres and the API on the same box" → same IP, different ports.'
    ],
    code: [
      { lang: 'bash', title: 'Looking up DNS yourself with dig (output shown as comments)', code: `# Ask for the A record of a name
dig +noall +answer www.shop.example.com A
# www.shop.example.com.  300  IN  CNAME  shop.example.com.
# shop.example.com.      300  IN  A      203.0.113.10
#   name                 TTL  class type  value

# Watch the full chain: root -> TLD -> authoritative
dig +trace www.shop.example.com

# See which program is listening on which port on a Linux server
ss -ltnp   # l=listening t=tcp n=numeric p=process` },
      { lang: 'python', run: true, title: 'Runnable: classify IPv4 addresses (Python ipaddress module)', code: `import ipaddress

for text in ["203.0.113.10", "10.1.2.3", "192.168.1.10", "172.20.0.5", "127.0.0.1", "8.8.8.8"]:
    ip = ipaddress.ip_address(text)
    kind = ("loopback (this machine)" if ip.is_loopback
            else "private (inside a network, needs NAT)" if ip.is_private
            else "public (reachable on the internet)")
    print(f"{text:<15} 32-bit int = {int(ip):>10}  -> {kind}")

print()
print("IPv6 example:", ipaddress.ip_address("2001:db8::10").exploded)` }
    ],
    codeTitle: ['dig and ss', 'IP classification (runnable)'],
    viz: [{
      title: 'DNS resolution step by step (cold cache, then warm)',
      input: 'www.shop.example.com cold',
      inputLabel: 'domain + cold|warm (e.g. api.example.org cold)',
      gen: function (input) {
        var t = String(input || '').trim().toLowerCase().split(/\s+/);
        var name = t[0] || 'www.shop.example.com', mode = t[1] || 'cold';
        if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(name)) throw new Error('Enter a domain like www.shop.example.com followed by cold or warm');
        if (name.length > 40) throw new Error('Keep the domain under 40 characters');
        if (mode !== 'cold' && mode !== 'warm') throw new Error('Second word must be cold or warm');
        var labels = name.split('.'), tld = labels[labels.length - 1], zone = labels.slice(-2).join('.');
        var ip = '203.0.113.' + (10 + (name.length * 7) % 200);
        var nodes = [bx('B', 'Browser', 10, 12), bx('OS', 'OS cache', 10, 50), bx('R', 'Recursive resolver', 44, 31), bx('ROOT', 'Root server', 85, 8), bx('TLD', '.' + tld + ' TLD', 85, 31), bx('AUTH', 'Authoritative', 85, 54)];
        var edges = [['B', 'OS', 'cache?'], ['OS', 'R', 'query :53'], ['R', 'ROOT'], ['R', 'TLD'], ['R', 'AUTH']];
        var rows = [], total = 0;
        function step(narr, on, cls, hl, ms, row, labels, tags) {
          total += ms;
          if (row) rows.push(row.concat([ms + ' ms', total + ' ms']));
          return { narr: narr + ' <span class="c-m">(running total ≈ ' + total + ' ms)</span>', on: on, cls: cls, hl: hl, labels: labels, tags: tags,
            extra: [{ type: 'table', label: 'Lookup log', columns: ['who asks', 'question', 'answer', 'cost', 'total'], rows: cp(rows), hl: (function () { var h = {}; if (row) h[rows.length - 1] = cls === 'bad' ? 'bad' : 'cur'; return h; })() }] };
        }
        var steps = [];
        steps.push(step('You type <b>' + hesc(name) + '</b>. The browser needs an IP address before it can open any connection. First it checks its <b>own cache</b>.' + (mode === 'warm' ? ' <span class="c-g">Hit!</span> Someone visited recently and the TTL has not expired.' : ' <span class="c-r">Miss</span> — never seen (or TTL expired).'),
          [], 'cur', { B: mode === 'warm' ? 'ok' : 'cur' }, 0, ['Browser', 'IP of ' + name + '?', mode === 'warm' ? ip + ' (cached)' : 'not cached']));
        if (mode === 'warm') {
          steps.push(step('<span class="c-g">Warm path:</span> no network trip at all. The browser can immediately open a connection to <b>' + ip + '</b>. This is why the second visit to a site feels faster.', [], 'ok', { B: 'ok' }, 0, null, null, { B: ip }));
          steps.push(step('What if only the <b>resolver</b> had it cached (another user of the same ISP looked it up)? Then it costs one short trip to the resolver, typically 5–20 ms.', ['B-OS', 'OS-R'], 'ok', { R: 'ok' }, 10, ['OS', 'IP of ' + name + '?', ip + ' (resolver cache)']));
          steps.push(step('Caches at three levels (browser, OS, resolver) mean the slow root → TLD → authoritative walk happens only rarely. Low TTLs make it happen more often (fresher but slower and more load); high TTLs make changes propagate slowly.', [], 'ok', { B: 'ok', OS: 'ok', R: 'ok', ROOT: 'done', TLD: 'done', AUTH: 'done' }, 0, null));
          return story({ label: 'DNS lookup (warm)', height: 62, nodes: nodes, edges: edges, steps: steps });
        }
        steps.push(step('The browser asks the <b>operating system</b>, which checks its cache and the hosts file. <span class="c-r">Miss.</span>', ['B-OS'], 'cur', { OS: 'cur' }, 1, ['Browser', 'IP of ' + name + '?', 'not in OS cache']));
        steps.push(step('The OS sends a UDP packet to port 53 of the <b>recursive resolver</b> (your ISP\'s, or 1.1.1.1 / 8.8.8.8). The resolver will do all the remaining work. Its cache also misses.', ['OS-R'], 'cur', { R: 'cur' }, 10, ['OS', 'IP of ' + name + '?', 'resolver cache miss']));
        steps.push(step('Resolver → <b>root server</b>: "who is responsible for <code>.' + tld + '</code>?" The root does not know the final IP; it only refers you to the <b>.' + tld + ' TLD</b> servers. (Resolvers usually have this cached, so this hop is often skipped.)', ['R-ROOT'], 'cur', { ROOT: 'cur' }, 15, ['Resolver', 'who handles .' + tld + '?', 'ask the .' + tld + ' TLD servers'], { 'R-ROOT': 'who has .' + tld + '?' }));
        steps.push(step('Resolver → <b>.' + tld + ' TLD server</b>: "who is responsible for <code>' + hesc(zone) + '</code>?" Answer: the domain\'s own <b>authoritative name servers</b> (NS records).', ['R-TLD'], 'cur', { TLD: 'cur' }, 15, ['Resolver', 'who handles ' + zone + '?', 'NS: ns1.' + zone], { 'R-TLD': 'who has ' + zone + '?' }));
        steps.push(step('Resolver → <b>authoritative server</b>: "what is the A record for <code>' + hesc(name) + '</code>?" This server owns the truth. Answer: <b>' + ip + '</b>, TTL 300 s.', ['R-AUTH'], 'cur', { AUTH: 'ok' }, 20, ['Resolver', 'A record of ' + name + '?', ip + ' (TTL 300)'], { 'R-AUTH': 'A ' + name.split('.')[0] + '…?' }, { AUTH: 'source of truth' }));
        steps.push(step('The answer flows back: resolver caches it for 300 s, the OS caches it, the browser caches it. Now the browser can finally open a TCP connection to <b>' + ip + ':443</b>.', ['OS-R', 'B-OS'], 'sel', { B: 'ok', OS: 'ok', R: 'ok' }, 2, ['Resolver → OS → Browser', 'answer', ip], { 'OS-R': '↩ ' + ip, 'B-OS': '↩ ' + ip }, { B: ip, R: 'cached 300 s' }));
        steps.push(step('Total for a <b>cold</b> lookup here ≈ ' + (total) + ' ms — before a single byte of the website was requested. A minute later another lookup would hit a cache and cost ~0 ms. That gap is why DNS is cached everywhere.', [], 'ok', { B: 'ok', OS: 'ok', R: 'ok', ROOT: 'done', TLD: 'done', AUTH: 'done' }, 0, null));
        return story({ label: 'DNS lookup (cold)', height: 62, nodes: nodes, edges: edges, steps: steps });
      }
    }, {
      title: 'An IPv4 address is just 32 bits',
      input: '192.168.1.10',
      inputLabel: 'IPv4 address (a.b.c.d)',
      gen: function (input) {
        var s = String(input || '').trim();
        var p = s.split('.');
        if (p.length !== 4 || p.some(function (x) { return !/^\d{1,3}$/.test(x) || Number(x) > 255; })) throw new Error('Enter an IPv4 address like 192.168.1.10 (four numbers 0-255)');
        var o = p.map(Number), frames = [], acc = 0;
        frames.push({ narr: 'The address <b>' + s + '</b> is four <b>octets</b> (8-bit numbers). Together they form one 32-bit number — that is all a computer sees.', parts: [{ type: 'array', label: 'octets', values: o.slice(), showIdx: true }] });
        o.forEach(function (v, i) {
          acc = acc * 256 + v;
          var hl = {}; hl[i] = 'cur';
          frames.push({ narr: 'Octet ' + (i + 1) + ' = <b>' + v + '</b> in binary. Running 32-bit value so far = ' + acc.toLocaleString('en-US') + '.', parts: [{ type: 'array', label: 'octets', values: o.slice(), hl: hl }, { type: 'bits', label: 'octet ' + (i + 1), value: v, width: 8, showDec: true }] });
        });
        var kind, cls;
        if (o[0] === 10 || (o[0] === 172 && o[1] >= 16 && o[1] <= 31) || (o[0] === 192 && o[1] === 168)) { kind = 'PRIVATE — used inside homes, offices and cloud VPCs; not reachable from the internet without NAT or a load balancer.'; cls = 'win'; }
        else if (o[0] === 127) { kind = 'LOOPBACK — always means "this same machine" (localhost).'; cls = 'sel'; }
        else if (o[0] === 0 || o[0] >= 224) { kind = 'SPECIAL (multicast/reserved) — not a normal server address.'; cls = 'bad'; }
        else { kind = 'PUBLIC — routable on the internet (in real life you would also check documentation/reserved ranges).'; cls = 'ok'; }
        frames.push({ narr: 'Classification: <b>' + kind + '</b>', parts: [{ type: 'vars', label: 'Result', vals: { address: s, as32bitNumber: acc, kind: kind.split(' ')[0] }, hl: { kind: cls } }] });
        frames.push({ narr: 'Add a <b>port</b> and you name one program on that machine: <code>' + s + ':443</code> is the HTTPS server, <code>' + s + ':5432</code> would be PostgreSQL. Same building, different doors.', parts: [{ type: 'map', label: 'one IP, many server programs', entries: [[s + ':443', 'web server (HTTPS)'], [s + ':5432', 'PostgreSQL'], [s + ':6379', 'Redis']], hl: (function () { var h = {}; h[s + ':443'] = 'ok'; return h; })() }] });
        return frames;
      }
    }],
    examples: [
      { title: 'Lower the TTL before you move servers', html: `<p>Your A record has TTL = 86,400 s (1 day). You migrate to a new server and change the record. Resolvers that cached the old answer keep sending users to the <span class="c-r">old IP for up to 24 hours</span>.</p>
<p><b>Playbook:</b> 2 days before, drop TTL to 60 s → wait for the old 1-day caches to expire → switch the record → within ~1 minute most traffic moves → keep the old server running a while (some clients ignore TTLs) → raise TTL again.</p>` },
      { title: 'One IP, many websites', html: `<p><code>shop.example.com</code> and <code>blog.example.com</code> both resolve to <code>203.0.113.10</code>. How does the server know which site you want? The HTTP <code>Host</code> header (and, for HTTPS, the <b>SNI</b> field in the TLS handshake) carries the name. This is "virtual hosting" — and it is how load balancers route many domains through one address.</p>` },
      { title: 'DNS as a (blunt) load balancer', html: `<p>Return 3 A records for <code>api.example.com</code>: clients pick one, spreading load roughly evenly ("round-robin DNS"). <b>Weaknesses:</b> clients cache answers (cannot shift load quickly), DNS does not know if a server is dead, and uneven caching causes hot spots. That is why DNS usually points to a <b>load balancer</b>, which does health checks (Module 4).</p>
<p><b>GeoDNS:</b> users in India get the Mumbai load balancer\'s IP, users in Germany get Frankfurt\'s — a big latency win for global apps.</p>` },
      { title: 'Cloud network layout with private IPs', html: `${H.table(['Box', 'IP', 'Reachable from internet?'], [['Load balancer', 'public 203.0.113.10', H.c('g', 'yes (ports 80/443 only)')], ['App servers', 'private 10.0.1.11–14', H.c('r', 'no')], ['Database', 'private 10.0.2.5', H.c('r', 'no')]])}<p>Only the front door is public. This shrinks the attack surface: attackers cannot even try to log in to your database.</p>` }
    ],
    deepDive: `<p><b>Transport details.</b> DNS queries normally use <b>UDP port 53</b> (one small packet each way, no handshake), falling back to TCP for large answers. Modern privacy options encrypt DNS: <b>DoH</b> (DNS over HTTPS) and <b>DoT</b> (DNS over TLS).</p>
<p><b>Anycast.</b> Root servers and big public resolvers (1.1.1.1, 8.8.8.8) are <b>anycast</b>: the same IP is announced from hundreds of locations, and internet routing delivers your packet to the nearest one. CDNs use the same trick.</p>
<p><b>Caching subtleties.</b> Failed lookups (NXDOMAIN) are cached too ("negative caching", governed by the zone\'s SOA record), so a typo\'d or not-yet-created record can stay "missing" for a while. Some clients and JVMs historically cached DNS longer than TTL — long-lived services should configure DNS cache TTLs explicitly so they notice IP changes.</p>
<p><b>CNAME at the apex.</b> You cannot put a CNAME on the bare domain (<code>example.com</code>) because it must coexist with NS/SOA records; DNS providers offer ALIAS/ANAME or "CNAME flattening" to point the apex at a load balancer hostname.</p>
<p><b>DNS is a real dependency.</b> Large outages have come from DNS: a misconfiguration at a DNS provider or inside a cloud\'s internal DNS can make healthy servers unreachable. Mitigations: multiple DNS providers, sensible TTLs, and caching resolvers inside your network.</p>
<p><b>IPv4 exhaustion.</b> Carrier-grade NAT puts many customers behind one public IP — so "one IP = one user" is false (matters for rate limiting and fraud detection). IPv6 removes the shortage but you must support both ("dual stack").</p>`,
    aiEra: `<p><b>AI is great at reading DNS and network output.</b> Paste <code>dig +trace</code> or a <code>curl -v</code> log and ask "where does this fail?" — models are usually good at spotting a missing record, an expired certificate or a wrong CNAME chain.</p>
<p><b>Where AI goes wrong:</b> it invents provider-specific syntax and confidently says "DNS propagation takes 48 hours" as a law of nature (it is really just caching governed by TTLs). It can also suggest changes that are dangerous in production, like deleting NS records. Always verify against the real zone and do changes with low TTLs and a rollback plan.</p>
<p><b>Agents need names too.</b> AI agents calling tools and APIs resolve hostnames like any client; DNS failures surface as confusing "tool unavailable" errors. Good agent platforms log the resolved IP and latency of each tool call so humans can debug.</p>
<p><b>What you must still own:</b> understanding the resolution chain and TTL trade-offs well enough to plan a zero-downtime migration — AI can draft the checklist, but you decide the timings.</p>`,
    problems: [{
      title: 'Half the users still see the old server',
      level: 'Medium', tags: ['dns', 'ttl', 'migration'], companies: ['Cloudflare', 'Amazon', 'Shopify'],
      statement: `<p>At 10:00 you changed the A record of <code>shop.example.com</code> from the old server (198.51.100.7) to a new one (203.0.113.10). At 12:00 many users still land on the old server and see stale prices. The record\'s TTL was 86,400 seconds. Explain why, what you can do right now, and how you would run the next migration so this does not happen.</p>`,
      constraints: `<p>You cannot force ISPs or browsers to clear their caches. The old server is still running.</p>`,
      example: `<p>A resolver that looked up the name at ${H.c('y', '09:59')} cached ${H.c('r', '198.51.100.7')} for ${H.c('y', '24 h')} → its users hit the old server until ${H.c('y', '09:59 the next day')}. Why: caches obey the TTL that was valid <i>when they cached</i>, not the new record.</p>`,
      brute: { why: `<p><b>Naive fix:</b> "Shut down the old server so everyone is forced over." It breaks because cached clients don\'t magically get the new IP — they just get <span class="c-r">connection errors</span> for up to 24 hours. You turn "stale prices" into "site down" for a large slice of users.</p>` },
      mcq: { q: 'Which change BEFORE a future migration helps most?', options: ['Add more RAM to the new server', 'Lower the TTL to ~60 s a day or two before the switch', 'Use a CNAME instead of an A record', 'Turn off DNS caching in browsers'], answer: 1, explain: 'With a short TTL, caches expire quickly after you switch, so traffic moves in about a minute.' },
      hints: [
        `<p>Hint 1: Who holds the old answer? Browser, OS and resolver caches — each will keep it until the TTL that was attached <i>when they cached it</i> runs out.</p>`,
        `<p>Hint 2: Right now, make the old server harmless: point it at the new data (proxy requests to the new server, or redirect) instead of turning it off.</p>`,
        `<p>Hint 3: Next time: lower TTL early → wait one old TTL → switch → monitor both → keep old one alive as a proxy → raise TTL later. Even better, put a load balancer with a stable IP in front so server swaps never touch DNS.</p>`
      ],
      solution: {
        approach: `<p><b>Why it happens:</b> DNS answers are cached for their TTL. Any resolver that cached the old IP between 10:00 the previous day and 10:00 today keeps serving it for up to 24 h. There is no global "propagation" — just thousands of independent caches expiring at different times.</p>
<p><b>Right now:</b></p>
<ol><li><b>Keep the old server up</b> and make it forward requests to the new server (reverse-proxy) or serve from the same database, so stale clients still see correct prices.</li>
<li>If both servers must share data, make sure the old one is not writing to an old database (split-brain risk).</li>
<li>Monitor traffic on the old server; when it drops near zero (after ~24 h plus a margin for misbehaving caches), retire it.</li></ol>
<p><b>Next migration (runbook):</b></p>
<ol><li>T−48 h: lower TTL from 86,400 to 60 s.</li><li>Wait at least the old TTL (24 h) so every cache now holds the short TTL.</li><li>Switch the record; most traffic moves within minutes.</li><li>Keep the old server proxying for a day; then raise TTL back to an hour or more.</li></ol>
<p><b>Better architecture:</b> point DNS at a <b>load balancer</b> (stable IP / hostname) and swap servers behind it — no DNS change, instant cutover, health checks included.</p>`,
        complexity: `<p>Worst-case staleness = the TTL that was cached (here 24 h). With TTL 60 s the switch window shrinks to about a minute, at the cost of more DNS queries (more resolver traffic, slightly slower first lookups).</p>`,
        followUps: ['Why not keep TTL at 60 s forever?', 'How does a load balancer make server migrations independent of DNS?', 'What if some old clients ignore TTL entirely?']
      }
    }]
  });

  /* ================================================================
     TOPIC 4 — Request / response lifecycle
     ================================================================ */
  topics.push({
    title: 'What Happens When You Type a URL and Press Enter? (The Request Lifecycle)',
    analogy: `<p>Ordering dinner at a restaurant you have never visited:</p>
<ol><li><b>Find the address</b> in your contacts or a map (DNS).</li>
<li><b>Walk in and get seated</b> — the host says "welcome", you say "table for one", they say "follow me" (TCP handshake).</li>
<li><b>Agree on a secret code</b> so nobody at the next table can read your order (TLS encryption).</li>
<li><b>Give your order</b> to the waiter (HTTP request).</li>
<li>The <b>kitchen cooks</b>, maybe fetching ingredients from the <b>storeroom</b> (app server + database), or grabbing a ready dessert from the <b>counter fridge</b> (cache).</li>
<li>The waiter <b>brings the food</b> (HTTP response) and you <b>eat</b> (the browser renders the page).</li></ol>
<p>Each step takes time, and the slow parts are usually the walks back and forth, not the cooking.</p>`,
    explain: `<p>🟢 This is the most famous system design warm-up question. Here is the full journey, with typical times for a user about 40 ms away (round-trip time, <b>RTT</b>) from the server:</p>
${H.table(['#', 'Step', 'What happens', 'Typical cost'], [
  ['1', 'URL parsing', 'Browser splits <code>https://shop.example.com/cart</code> into scheme (https), host, path. Checks HSTS list (force HTTPS).', '~0 ms'],
  ['2', 'DNS lookup', 'Name → IP via browser/OS/resolver caches, or the full root → TLD → authoritative walk.', '0 ms (cached) to 20–100 ms (cold)'],
  ['3', 'TCP handshake', 'SYN → SYN-ACK → ACK: both sides agree to talk and pick sequence numbers.', '1 RTT (40 ms)'],
  ['4', 'TLS handshake', 'Agree on encryption keys and check the server\'s certificate. TLS 1.3 needs 1 RTT; TLS 1.2 needed 2.', '1 RTT (40 ms)'],
  ['5', 'HTTP request', 'Browser sends <code>GET /cart</code> with headers and cookies.', '½ RTT'],
  ['6', 'Server side', 'Load balancer → app server → cache and/or database → build response.', '5–100 ms'],
  ['7', 'HTTP response', 'Status, headers, HTML body travel back.', '½ RTT + transfer time'],
  ['8', 'Rendering', 'Parse HTML, then fetch CSS/JS/images (more requests, often from a CDN), build layout, paint pixels.', '50–1000+ ms']
])}
<p><b>Key insight:</b> before the server does any work, a cold HTTPS request has already spent <b>~3 round trips</b> (DNS + TCP + TLS). For a user 200 ms away (India ↔ US East), that is 600 ms of pure waiting. That is why designers care about:</p>
<ul>
<li><b>Reusing connections</b> (keep-alive, HTTP/2) so steps 2–4 happen once, not per request.</li>
<li><b>Moving servers closer</b> (CDNs, multiple regions) to shrink RTT itself.</li>
<li><b>Caching</b> on the server (skip the database) and in the browser (skip the request entirely).</li>
</ul>
<p>On the server side, the request usually passes: <b>load balancer</b> (picks a healthy server) → <b>web/app server</b> (routing, auth, business logic) → <b>cache</b> (fast, in memory) → <b>database</b> (source of truth, on disk) → back up the chain. The response is the same path in reverse.</p>`,
    clues: [
      '"What happens when you type google.com and press Enter?" → walk DNS → TCP → TLS → HTTP → LB → app → cache/DB → response → render, with costs.',
      '"Users in another continent complain the site is slow" → RTT × number of round trips; fix with CDN / regional servers / connection reuse.',
      '"First visit is slow, later visits fast" → cold DNS, new TCP/TLS connections, empty browser cache.',
      '"Time to first byte (TTFB) is high" → network handshakes or slow server work (DB query, cache miss).',
      '"Where would you add a cache?" → anywhere along the path: browser, CDN, reverse proxy, app memory, Redis, DB buffer pool.',
      '"502 / 504 from the load balancer" → the hop from LB to app server failed or timed out.'
    ],
    code: [
      { lang: 'bash', title: 'Measure each phase yourself with curl', code: `curl -o /dev/null -s -w '
dns lookup      : %{time_namelookup}s
tcp connected   : %{time_connect}s
tls done        : %{time_appconnect}s
first byte      : %{time_starttransfer}s
total           : %{time_total}s
' https://www.example.com/

# Example output for a far-away server (values are cumulative):
# dns lookup      : 0.031s
# tcp connected   : 0.243s   <- 1 RTT after DNS  (~212 ms RTT)
# tls done        : 0.457s   <- +1 RTT for TLS 1.3
# first byte      : 0.690s   <- +1 RTT + server think time
# total           : 0.702s` },
      { lang: 'http', title: 'The request and the response, with caching headers', code: `GET /cart HTTP/2
Host: shop.example.com
Accept: text/html
Cookie: session=7f3a9c

HTTP/2 200
Content-Type: text/html; charset=utf-8
Content-Encoding: gzip
Cache-Control: private, no-store
Server-Timing: db;dur=12, cache;dur=1, app;dur=6

<!doctype html> ...page...` }
    ],
    codeTitle: ['curl timing breakdown', 'Request + response'],
    viz: {
      title: 'A full HTTPS request, edge by edge, with a latency timeline',
      input: 'rtt=40, dns=cold, tls=1.3, cache=miss',
      inputLabel: 'rtt=ms (1-400), dns=cold|warm, tls=1.3|1.2|none, cache=hit|miss',
      gen: function (input) {
        var o = kvParse(input);
        var rtt = numIn(o.rtt, 40, 1, 400, 'rtt');
        var dns = (o.dns || 'cold').toLowerCase(), tls = (o.tls || '1.3').toLowerCase(), cache = (o.cache || 'miss').toLowerCase();
        if (['cold', 'warm'].indexOf(dns) < 0) throw new Error('dns must be cold or warm');
        if (['1.3', '1.2', 'none'].indexOf(tls) < 0) throw new Error('tls must be 1.3, 1.2 or none');
        if (['hit', 'miss'].indexOf(cache) < 0) throw new Error('cache must be hit or miss');
        var nodes = [bx('B', 'Browser', 9, 34), bx('DNS', 'DNS resolver', 30, 8), bx('LB', 'Load Balancer', 36, 34), bx('APP', 'App Server', 62, 34), bx('C', 'Cache', 88, 12), bx('DB', 'Database', 88, 56)];
        var edges = [['B', 'DNS', ''], ['B', 'LB', ''], ['LB', 'APP', ''], ['APP', 'C', ''], ['APP', 'DB', '']];
        var stages = [], vals = [];
        var dnsMs = dns === 'cold' ? Math.round(10 + rtt * 0.75) : 0;
        var tlsRtts = tls === '1.3' ? 1 : tls === '1.2' ? 2 : 0;
        var steps = [];
        function bars(hlLast) {
          var h = {}; if (hlLast) h[vals.length - 1] = 'cur';
          return { type: 'bars', label: 'Time spent per phase (ms)', values: vals.slice(), idxLabels: stages.slice(), hl: h };
        }
        function add(name, ms) { stages.push(name); vals.push(Math.round(ms)); }
        function tot() { return vals.reduce(function (a, b) { return a + b; }, 0); }
        steps.push({ narr: 'You press Enter on <code>https://shop.example.com/cart</code>. Settings: RTT = <b>' + rtt + ' ms</b>, DNS <b>' + dns + '</b>, TLS <b>' + tls + '</b>, cache <b>' + cache + '</b>. The browser parses the URL and decides it needs an IP and an encrypted connection.', hl: { B: 'cur' }, extra: [{ type: 'vars', label: 'Settings', vals: { rtt: rtt + ' ms', dns: dns, tls: tls, cache: cache } }] });
        add('DNS', dnsMs);
        steps.push({ narr: dns === 'cold' ? '<b>DNS:</b> cache miss, so the resolver walks root → TLD → authoritative. Cost ≈ <b>' + dnsMs + ' ms</b>. Nothing else can start until we have the IP.' : '<b>DNS:</b> the IP is already cached in the browser — <b>0 ms</b>. Free speed from caching.', on: ['B-DNS'], cls: dns === 'cold' ? 'cur' : 'ok', hl: { DNS: dns === 'cold' ? 'cur' : 'ok' }, labels: { 'B-DNS': dns === 'cold' ? 'lookup' : 'cached' }, extra: [bars(true)] });
        add('TCP', rtt);
        steps.push({ narr: '<b>TCP handshake:</b> SYN → SYN-ACK → ACK. The browser can send data right after the ACK, so it costs <b>1 RTT = ' + rtt + ' ms</b>. The load balancer is the server end of this connection.', on: ['B-LB'], hl: { B: 'cur', LB: 'cur' }, labels: { 'B-LB': 'SYN / SYN-ACK / ACK' }, extra: [bars(true)] });
        add('TLS', tlsRtts * rtt);
        steps.push({ narr: tls === 'none' ? '<b>No TLS</b> (plain HTTP): 0 ms — but anyone on the path can read or change the traffic. Browsers flag such sites as "Not secure".' : '<b>TLS ' + tls + ' handshake:</b> exchange keys, verify the certificate for shop.example.com. ' + tlsRtts + ' RTT = <b>' + (tlsRtts * rtt) + ' ms</b>. ' + (tls === '1.2' ? 'TLS 1.3 would save a whole round trip.' : 'TLS 1.3 cut this from 2 RTTs to 1.'), on: ['B-LB'], cls: tls === 'none' ? 'bad' : 'cur', hl: { B: 'cur', LB: 'cur' }, labels: { 'B-LB': tls === 'none' ? 'no encryption!' : 'TLS ' + tls + ' keys' }, extra: [bars(true)] });
        add('Request', rtt / 2);
        steps.push({ narr: '<b>HTTP request:</b> <code>GET /cart</code> + cookies travels to the load balancer (½ RTT ≈ ' + Math.round(rtt / 2) + ' ms). The LB picks a healthy app server and forwards it over the fast data-center network (&lt; 1 ms).', on: ['B-LB', 'LB-APP'], hl: { LB: 'cur', APP: 'cur' }, labels: { 'B-LB': 'GET /cart', 'LB-APP': 'forward' }, extra: [bars(true)] });
        var serverMs = cache === 'hit' ? 1 + 4 : 1 + 12 + 4;
        add('Server', serverMs);
        if (cache === 'hit') {
          steps.push({ narr: '<b>App server:</b> checks the session, then asks the <b>cache</b> for this user\'s cart: <span class="c-g">HIT</span> in ~1 ms (memory). Builds HTML in ~4 ms. The database is not touched at all.', on: ['APP-C'], cls: 'ok', hl: { APP: 'cur', C: 'ok', DB: 'done' }, labels: { 'APP-C': 'GET cart:42 → hit' }, extra: [bars(true)] });
        } else {
          steps.push({ narr: '<b>App server:</b> asks the <b>cache</b> for the cart: <span class="c-r">MISS</span> (~1 ms wasted).', on: ['APP-C'], cls: 'bad', keep: 'bad', hl: { APP: 'cur', C: 'bad' }, labels: { 'APP-C': 'GET cart:42 → miss' }, extra: [bars(false)] });
          steps.push({ narr: 'So it queries the <b>database</b> (~12 ms: network hop + index lookup + maybe disk), then <b>writes the result into the cache</b> so the next request hits. Builds HTML (~4 ms). Server total ≈ <b>' + serverMs + ' ms</b>.', on: ['APP-DB'], hl: { APP: 'cur', DB: 'cur', C: 'ok' }, labels: { 'APP-DB': 'SELECT … cart', 'APP-C': 'SET cart:42' }, ehl: { 'APP-C': 'ok' }, extra: [bars(true)] });
        }
        add('Response', rtt / 2 + 5);
        steps.push({ narr: '<b>HTTP response:</b> 200 OK + gzip-compressed HTML flows back app → LB → browser: ½ RTT + ~5 ms to transfer the bytes. This moment is "time to first byte" plus download.', on: ['LB-APP', 'B-LB'], cls: 'sel', hl: { B: 'sel', LB: 'sel', APP: 'sel' }, labels: { 'LB-APP': '↩ 200 OK', 'B-LB': '↩ 200 OK (HTML)' }, extra: [bars(true)] });
        add('Render', 60);
        steps.push({ narr: '<b>Rendering:</b> the browser parses HTML, discovers CSS/JS/images (more requests — but on the <i>same</i> connection, and many from a CDN), lays out and paints. ~60 ms here for a light page.', hl: { B: 'ok' }, extra: [bars(true)] });
        var total = tot(), network = dnsMs + rtt + tlsRtts * rtt + rtt + 5;
        steps.push({ narr: '<b>Total ≈ ' + total + ' ms.</b> Network waiting (DNS + handshakes + travel) ≈ <b>' + Math.round(network) + ' ms</b> vs server work ≈ <b>' + serverMs + ' ms</b>. ' + (network > serverMs * 3 ? 'The network dominates — move closer to users (CDN/regions) and reuse connections before optimising code.' : 'Server work is a big share here — caching and faster queries pay off.') + ' Try rtt=200 or tls=1.2 or cache=hit and compare.',
          hl: { B: 'ok', DNS: 'ok', LB: 'ok', APP: 'ok', C: cache === 'hit' ? 'ok' : 'done', DB: cache === 'hit' ? 'done' : 'ok' },
          extra: [bars(false), { type: 'table', label: 'Summary', columns: ['phase', 'ms', 'share'], rows: stages.map(function (s, i) { return [s, String(vals[i]), Math.round(100 * vals[i] / Math.max(1, total)) + '%']; }) }] });
        return story({ label: 'HTTPS request lifecycle', height: 66, nodes: nodes, edges: edges, steps: steps });
      }
    },
    examples: [
      { title: 'Worked numbers: user in Mumbai, server in Virginia', html: `<p>RTT ≈ 200 ms. Cold visit: DNS ~100 ms + TCP 200 + TLS 1.3 200 + request/response 200 + server 30 + render 100 ≈ <b>830 ms</b>.</p>
<p>Same user, server region in Mumbai (RTT 10 ms): DNS ~20 + 10 + 10 + 10 + 30 + 100 ≈ <b>180 ms</b>. Moving closer saved ~650 ms — no code change could do that. This is the business case for CDNs and multi-region.</p>` },
      { title: 'Second visit is much faster — why?', html: `<ul><li>DNS answer cached → 0 ms.</li><li>Connection still open (keep-alive / HTTP/2) → no TCP or TLS handshake.</li><li>Static files (CSS/JS/logo) cached by the browser via <code>Cache-Control: max-age</code> → not even requested.</li><li>Server cache warm → database skipped.</li></ul><p>A repeat visit can drop from ~800 ms to ~250 ms. Designers deliberately engineer for these caches.</p>` },
      { title: 'Where a 3-second page load really goes', html: `${H.table(['Phase', 'Time', 'Fix'], [['DNS + TCP + TLS', '0.6 s', 'CDN, connection reuse, TLS 1.3'], ['Server (TTFB)', '0.4 s', 'cache, fix slow SQL'], ['Download 4 MB JS + images', '1.2 s', 'compress, smaller images, lazy loading'], ['Run JS + render', '0.8 s', 'less JS, server-side rendering']])}<p>Lesson: measure before you optimise. Often the backend is not the main problem.</p>` },
      { title: 'Reading a 504 Gateway Timeout', html: `<p>Browser → LB is fine; LB → app server took longer than the LB\'s timeout (say 30 s) because the app was waiting on a slow DB query. The LB gives up and returns <span class="c-r">504</span>. A <span class="c-r">502</span> would mean the LB got a broken/no response (app crashed). Knowing the path tells you which hop to investigate.</p>` }
    ],
    deepDive: `<p><b>TCP details.</b> After the handshake, TCP <b>slow start</b> sends only ~10 packets (~14 KB) in the first round trip, then doubles each RTT. So a 100 KB page needs several extra round trips on a fresh connection — another reason to keep pages small and reuse warm connections.</p>
<p><b>TLS 1.3 and 0-RTT.</b> TLS 1.3 needs one round trip; resumed sessions can send data in the first flight ("0-RTT") — but 0-RTT data can be <b>replayed</b> by an attacker, so it is only safe for idempotent requests like GET.</p>
<p><b>HTTP/2 and HTTP/3.</b> HTTP/2 multiplexes many requests on one TCP connection (no more 6-connections-per-host hacks), but one lost packet stalls all streams (TCP head-of-line blocking). HTTP/3 runs over <b>QUIC</b> on UDP: transport + TLS handshake merged into 1 RTT, independent streams, and connections survive switching from Wi-Fi to mobile data.</p>
<p><b>Server side in more detail.</b> The LB often terminates TLS, then forwards plain HTTP (or re-encrypted) to app servers over private IPs. App servers keep <b>connection pools</b> to the DB and cache so they never pay handshake costs per request. Reverse proxies add compression, request IDs and timeouts.</p>
<p><b>Observability.</b> Production systems attach a <b>trace ID</b> to each request and record a span per hop (OpenTelemetry). A trace waterfall shows exactly the table above for one real request — the fastest way to find which hop is slow.</p>
<p><b>Browser caching rules.</b> <code>Cache-Control: max-age=31536000, immutable</code> for fingerprinted static files (<code>app.3f9a.js</code>); <code>no-store</code> for private pages; <code>ETag</code> + <code>304 Not Modified</code> to revalidate cheaply.</p>`,
    aiEra: `<p><b>An LLM request has its own lifecycle.</b> When your app calls a model: network + TLS (same as above, usually tiny), then <b>queueing</b> at the provider, then <b>prefill</b> (reading your prompt — longer prompts = longer wait), then <b>decoding</b> one token at a time. Key metrics: <b>TTFT</b> (time to first token) and <b>tokens per second</b>. A 2,000-token answer at 80 tokens/s takes 25 s — so you <b>stream</b> it to keep the user engaged.</p>
<p><b>Prompt caching</b> is the AI version of a server cache: providers can reuse the processed prefix of repeated prompts (long system prompts, documents), cutting cost and TTFT.</p>
<p><b>Use AI as a partner:</b> paste a trace waterfall or <code>curl -w</code> output and ask "which phase dominates and what are three fixes?". <b>Where AI goes wrong:</b> it often recommends backend optimisations when the real cost is network round trips or front-end JavaScript. <b>You own:</b> measuring first, then choosing the fix.</p>`,
    problems: [{
      title: 'Fast in Virginia, slow in Sydney',
      level: 'Medium', tags: ['latency', 'request lifecycle', 'cdn'], companies: ['Google', 'Netflix', 'Atlassian'],
      statement: `<p>Your API (single region: US-East/Virginia) answers in 150 ms for US users but ~1.2 s for users in Sydney. Server processing time is the same (~30 ms) for both. Each page makes a fresh HTTPS connection and then 2 sequential API calls. Explain the gap with numbers and propose fixes in order of effort.</p>`,
      constraints: `<p>RTT Virginia user ↔ server ≈ 20 ms; Sydney user ↔ server ≈ 200 ms. TLS 1.3. DNS is cached.</p>`,
      example: `<p>Sydney: TCP ${H.c('y', '200')} + TLS ${H.c('y', '200')} + 2 calls × (${H.c('y', '200')} + ${H.c('g', '30')}) = ${H.c('r', '860 ms')} before rendering. Why: every round trip costs 200 ms, and there are 4 of them in sequence; the 30 ms of server work barely matters.</p>`,
      brute: { why: `<p><b>Naive fix:</b> "Profile and optimise the server code." Server time is only 30 ms per call — making it 0 ms saves 60 ms out of ~1,000. The real cost is <b>round trips × distance</b>, which code optimisation cannot touch.</p>` },
      mcq: { q: 'Which single change removes the most latency for Sydney users?', options: ['Rewrite the API in a faster language', 'Serve them from a region (or edge) close to Sydney', 'Add an index to the database', 'Double the server\'s CPU'], answer: 1, explain: 'RTT drops from ~200 ms to ~10 ms, shrinking every one of the four sequential round trips.' },
      hints: [
        `<p>Hint 1: Count the sequential round trips: TCP (1) + TLS 1.3 (1) + each API call (1 each).</p>`,
        `<p>Hint 2: Total ≈ round trips × RTT + server time. Which term is big for Sydney?</p>`,
        `<p>Hint 3: Fix order — reuse connections (cheap), merge the two calls into one or run them in parallel (cheap), terminate TLS at a nearby edge/CDN (medium), deploy a Sydney region with replicated data (expensive).</p>`
      ],
      solution: {
        approach: `<p><b>Diagnosis.</b> US: 20 + 20 + 2 × (20 + 30) = 140 ms ✔ matches 150 ms. Sydney: 200 + 200 + 2 × (200 + 30) = 860 ms, plus rendering and extra assets ≈ 1.2 s ✔. The difference is entirely <b>RTT × number of sequential round trips</b>.</p>
<p><b>Fixes, cheapest first:</b></p>
<ol><li><b>Reuse connections</b> (HTTP keep-alive / HTTP/2): after the first page, the 400 ms of handshakes disappears.</li>
<li><b>Cut sequential calls:</b> run the two API calls in parallel (saves one RTT, ~230 ms) or merge them into one endpoint (a "backend for frontend").</li>
<li><b>Edge termination:</b> put a CDN / edge proxy in Sydney. TCP+TLS handshakes now happen with a server ~10 ms away; the edge keeps a warm, long-lived connection to Virginia. Saves ~380 ms on cold connections.</li>
<li><b>Cache at the edge</b> any responses that are the same for everyone (product catalog), so many calls never cross the Pacific.</li>
<li><b>Deploy in an Asia-Pacific region</b> with a read replica (or a multi-region database) → total near ~120 ms. Most expensive: data replication, consistency questions, double operations.</li></ol>
<p><b>Verify</b> with real-user monitoring split by country before and after each step.</p>`,
        complexity: `<p>Latency ≈ (#sequential round trips) × RTT + server time. Sydney: 4 × 200 + 60 = 860 ms → with reuse + parallel calls + edge: ~1 × 200 + 30 ≈ 230 ms → with a local region: ~1 × 10 + 30 ≈ 40 ms server-side path.</p>`,
        followUps: ['Which data could be safely cached at the Sydney edge, and which could not?', 'What new problems appear when you add a second region with its own database replica?']
      }
    }]
  });

  /* ================================================================
     TOPIC 5 — Monolith basics
     ================================================================ */
  topics.push({
    title: 'Monolith Basics: One Big Kitchen',
    analogy: `<p>A <b>monolith</b> is a restaurant with <b>one big kitchen</b>: the starters chef, the curry chef and the dessert chef all work in the same room, share the same fridge and pass plates by hand. Fast and simple — until the dessert oven catches fire and the <b>whole kitchen</b> has to be evacuated, or you want to renovate the dessert corner and must close the entire restaurant for the day.</p>
<p>The alternative, <b>microservices</b>, is a <b>food court</b>: separate stalls, each with its own staff and fridge, talking through order slips. One stall can close without affecting the others — but now every order needs paperwork, runners and coordination.</p>`,
    explain: `<p>🟢 A <b>monolith</b> is an application built and deployed as <b>one unit</b>: one codebase, one build, one running program (which you can copy onto many servers), usually one main database. All features — users, products, orders, payments, reports — live inside it and call each other as <b>ordinary function calls</b>.</p>
<p>Inside, a healthy monolith is organised in <b>layers</b> and <b>modules</b>:</p>
${H.table(['Layer', 'Job', 'Example'], [
  ['Presentation / API', 'Receive HTTP, validate input, return JSON/HTML', '<code>OrderController</code>'],
  ['Business logic (domain)', 'The rules: prices, stock, discounts', '<code>OrderService</code>, <code>PaymentService</code>'],
  ['Data access', 'Talk to the database', '<code>OrderRepository</code> (SQL)'],
  ['Database', 'Store everything durably', 'one PostgreSQL with orders, users, payments tables']
])}
<p><b>Why monoliths are great (especially early):</b></p>
<ul>
<li><span class="c-g">Simple to build, test, debug</span>: one repo, one process, a stack trace shows the whole story.</li>
<li><span class="c-g">Fast internal calls</span>: a function call takes nanoseconds; a network call to another service takes about a millisecond and can fail.</li>
<li><span class="c-g">Easy consistency</span>: one database transaction can update orders and payments together (all or nothing).</li>
<li><span class="c-g">Cheap to operate</span>: one thing to deploy, monitor and secure.</li>
</ul>
<p><b>Where it hurts as it grows:</b></p>
<ul>
<li><span class="c-r">Deploy coupling</span>: a one-line change to reports means redeploying everything; 80 engineers queue for the same release.</li>
<li><span class="c-r">Blast radius</span>: a memory leak in one module crashes the process that serves every feature.</li>
<li><span class="c-r">Scaling all-or-nothing</span>: if only search is busy, you still copy the whole app (with its memory footprint) to add capacity.</li>
<li><span class="c-r">Tangling</span>: without discipline, modules reach into each other\'s tables and it becomes a "big ball of mud".</li>
</ul>
<p><b>How a monolith scales:</b> make it <b>stateless</b> and run <b>N identical copies</b> behind a load balancer (Module 2). This carries many companies very far. Shopify runs one of the world\'s largest Ruby on Rails monoliths, organised as a <b>modular monolith</b> — strict module boundaries inside one deployable.</p>
<p><b>Rule of thumb:</b> start with a well-structured (modular) monolith; split out a service only when a specific pain — independent scaling, independent deploys for a separate team, isolation of a risky component — is real and measured.</p>`,
    clues: [
      '"Small team / startup / MVP / launch in 3 months" → a modular monolith is usually the right first answer.',
      '"Need a transaction across orders and payments" → in-process + one DB is simplest; across services you need sagas.',
      '"One feature (reports, video processing) keeps crashing or slowing everything" → isolate it: background worker or separate service.',
      '"Deploys take hours and teams block each other" → deploy coupling; consider splitting along team boundaries.',
      '"Only the search part gets heavy traffic" → independent scaling is a valid reason to extract one service.',
      '"Microservices for 3 developers?" → challenge it: operational cost often outweighs benefits.'
    ],
    code: [
      { lang: 'java', title: 'Modular monolith in miniature: modules talk through interfaces, in-process', code: `// --- payments module: exposes ONLY this interface to others ---
interface PaymentApi {
    boolean charge(String userId, long amountPaise);
}

class PaymentService implements PaymentApi {
    private final Map<String, Long> wallet = new HashMap<>();

    PaymentService() { wallet.put("asha", 50_000L); }

    @Override
    public boolean charge(String userId, long amountPaise) {
        long balance = wallet.getOrDefault(userId, 0L);
        if (balance < amountPaise) return false;
        wallet.put(userId, balance - amountPaise);
        return true;
    }
}

// --- orders module: depends on the payments INTERFACE, not its internals ---
class OrderService {
    private final PaymentApi payments;
    private final List<String> orders = new ArrayList<>();

    OrderService(PaymentApi payments) { this.payments = payments; }

    String placeOrder(String userId, String item, long pricePaise) {
        // A plain method call: nanoseconds, cannot "time out", no network.
        if (!payments.charge(userId, pricePaise)) return "402 Payment Required";
        orders.add(userId + ":" + item);
        return "201 Created (order #" + orders.size() + ")";
    }
}

// --- one process wires every module together ---
public class ShopMonolith {
    public static void main(String[] args) {
        OrderService orders = new OrderService(new PaymentService());
        System.out.println(orders.placeOrder("asha", "dosa", 12_000));
        System.out.println(orders.placeOrder("ben", "coffee", 4_000));
    }
}` }
    ],
    codeTitle: ['Modular monolith (Java)'],
    viz: {
      title: 'Inside a monolith: a request, a deploy, a crash, and scaling',
      input: 'crash=reports',
      inputLabel: 'crash=users|orders|payments|reports|none',
      gen: function (input) {
        var o = kvParse(input);
        var crash = (o.crash || String(input || '').trim() || 'reports').toLowerCase().replace(/^crash=/, '');
        var mods = { users: 'Users', orders: 'Orders', payments: 'Payments', reports: 'Reports' };
        if (crash !== 'none' && !mods[crash]) throw new Error('crash must be users, orders, payments, reports or none');
        var nodes = [bx('U', 'Customer', 8, 32), bx('API', 'API layer', 30, 32), bx('users', 'Users', 56, 6), bx('orders', 'Orders', 56, 24), bx('payments', 'Payments', 56, 42), bx('reports', 'Reports', 56, 60), bx('DB', 'One database', 88, 32)];
        var edges = [['U', 'API'], ['API', 'users'], ['API', 'orders'], ['API', 'reports'], ['orders', 'payments', 'fn call'], ['users', 'DB'], ['orders', 'DB'], ['payments', 'DB'], ['reports', 'DB']];
        var all = ['API', 'users', 'orders', 'payments', 'reports'];
        function allTag(t) { var r = {}; all.forEach(function (k) { r[k] = t; }); return r; }
        var steps = [];
        steps.push({ narr: 'One <b>process</b>, one deploy, one database. The middle boxes are <b>modules inside the same program</b> — they share memory and call each other with plain function calls.', hl: allTag('win'), tags: { API: 'same process', reports: 'same process' } });
        steps.push({ narr: 'A customer places an order: <code>POST /orders</code> hits the API layer, which calls the Orders module.', on: ['U-API', 'API-orders'], hl: { U: 'cur', API: 'cur', orders: 'cur' }, labels: { 'U-API': 'POST /orders' } });
        steps.push({ narr: 'Orders calls Payments with a <b>normal method call</b>: ~nanoseconds, no network, no serialization, no timeout to configure. This is the monolith\'s superpower.', on: ['orders-payments'], hl: { orders: 'cur', payments: 'cur' }, labels: { 'orders-payments': 'charge() ~50 ns' } });
        steps.push({ narr: 'Both modules write in <b>one database transaction</b>: order row + payment row commit together or not at all (ACID). No distributed-transaction headaches.', on: ['orders-DB', 'payments-DB'], hl: { DB: 'ok', orders: 'ok', payments: 'ok' }, labels: { 'orders-DB': 'BEGIN … INSERT', 'payments-DB': '… COMMIT' } });
        steps.push({ narr: 'Response <b>201 Created</b> goes back. Total server time maybe 10 ms, almost all of it the database.', on: ['U-API'], cls: 'sel', hl: { U: 'ok' }, labels: { 'U-API': '↩ 201 Created' } });
        steps.push({ reset: true, narr: '<span class="c-y">Pain #1 — deploy coupling.</span> A developer fixes a typo in Reports. The <b>entire</b> application must be rebuilt, retested and redeployed, including Payments, which nobody touched.', hl: allTag('cur'), tags: { reports: 'changed 1 line', payments: 'redeployed anyway' } });
        if (crash !== 'none') {
          var hlc = allTag('bad'); hlc[crash] = 'bad'; hlc.U = 'bad';
          var t = {}; t[crash] = 'memory leak → OOM';
          steps.push({ narr: '<span class="c-r">Pain #2 — blast radius.</span> The <b>' + mods[crash] + '</b> module leaks memory. The process runs out of memory and dies — and it takes <b>every</b> feature with it, even ones that had nothing to do with ' + mods[crash] + '. Customers cannot even log in.', on: ['U-API'], cls: 'bad', keep: 'bad', hl: hlc, tags: t, labels: { 'U-API': '502 Bad Gateway' } });
        } else {
          steps.push({ narr: '<span class="c-g">No crash this time.</span> But remember the risk: if any module leaked memory or hogged CPU, it would take every feature down with it, because they share one process.', hl: allTag('ok') });
        }
        var scaleNodes = [bx('LB', 'Load Balancer', 12, 32), bx('M1', 'Monolith copy 1', 50, 8), bx('M2', 'Monolith copy 2', 50, 32), bx('M3', 'Monolith copy 3', 50, 56), bx('DB', 'One database', 88, 32)];
        var scaleEdges = [['LB', 'M1'], ['LB', 'M2'], ['LB', 'M3'], ['M1', 'DB'], ['M2', 'DB'], ['M3', 'DB']];
        steps.push({ reset: true, nodes: scaleNodes, edges: scaleEdges, label: 'Scaling a monolith', narr: '<span class="c-g">Scaling a monolith is easy if it is stateless:</span> run identical copies behind a load balancer. The catch: every copy carries <i>all</i> modules, even if only one feature is busy, and they all share one database.', on: ['LB-M1', 'LB-M2', 'LB-M3'], hl: { LB: 'cur', M1: 'ok', M2: 'ok', M3: 'ok' }, tags: { DB: 'next bottleneck' } });
        var fixNodes = [bx('U', 'Customer', 8, 32), bx('APP', 'Monolith (core)', 38, 32), bx('Q', 'Job queue', 62, 56), bx('W', 'Report worker', 88, 56), bx('DB', 'Database', 88, 14)];
        var fixEdges = [['U', 'APP'], ['APP', 'DB'], ['APP', 'Q', 'enqueue job'], ['Q', 'W'], ['W', 'DB', 'read replica']];
        steps.push({ reset: true, nodes: fixNodes, edges: fixEdges, label: 'Fix: isolate the risky part', narr: '<b>Typical first fix:</b> move the heavy/risky part (here: reports) into a <b>background worker</b> fed by a queue. A crash there no longer kills checkout. This is how monoliths evolve — one painful piece at a time, not a big-bang rewrite.', on: ['APP-Q', 'Q-W'], hl: { APP: 'ok', W: 'cur', Q: 'cur' }, tags: { W: 'separate process' } });
        return story({ label: 'Monolith = one deployable', height: 66, nodes: nodes, edges: edges, steps: steps });
      }
    },
    examples: [
      { title: 'In-process call vs network call', html: `${H.table(['', 'Function call (monolith)', 'Network call (separate service)'], [['Time', '~nanoseconds', '~0.5–2 ms inside a data center'], ['Can fail?', 'only with your bug', 'timeouts, DNS, network drops, the other service is down'], ['Needs', 'nothing', 'serialization, retries, timeouts, auth, versioning'], ['Transaction', 'one DB transaction', 'saga / outbox / compensations']])}<p>A page that makes 30 internal calls costs ~0 ms of overhead in a monolith and 15–60 ms if each call becomes a network hop.</p>` },
      { title: 'A real swing back to monolith', html: `<p>In 2023 the Amazon Prime Video team published that one of their monitoring tools, originally built from serverless functions and step-by-step orchestration, was rebuilt as a single process and cut its infrastructure cost by about 90%. The data was being passed between components over the network and through storage at every step; putting the pieces in one process removed that overhead. <b>Lesson:</b> distribution has a price; pay it only for real benefits.</p>` },
      { title: 'When a split is justified', html: `<ul><li><b>Search</b> needs 20 machines with lots of RAM while the rest needs 3 → extract search to scale it alone.</li><li><b>Payments</b> must pass strict compliance audits (PCI DSS) → isolating it shrinks what auditors must review.</li><li><b>Video transcoding</b> is CPU-hungry and crashy → move to workers so it cannot hurt checkout.</li><li>A <b>separate team</b> in another time zone owns notifications and wants its own release schedule.</li></ul><p>Each split names a concrete pain. "Microservices are modern" is not a reason.</p>` },
      { title: 'Big ball of mud vs modular monolith', html: `<p><b>Mud:</b> <code>ReportService</code> runs raw SQL on the <code>payments</code> table directly; <code>OrderController</code> imports internal helper classes of the users module. Every change breaks something far away.</p>
<p><b>Modular:</b> each module owns its tables and exposes an interface (<code>PaymentApi</code>); build tools or architecture tests forbid other imports. Later, extracting a module into a service is mostly replacing the interface implementation with an HTTP/gRPC client.</p>` }
    ],
    deepDive: `<p><b>"Monolith" is about deployment, not code quality.</b> A monolith can be beautifully modular; microservices can be a mess. The anti-pattern to fear most is the <b>distributed monolith</b>: many services that must be deployed together and call each other synchronously in long chains — all the costs of distribution, none of the independence.</p>
<p><b>The database is the real coupling.</b> If five modules read each other\'s tables, they are coupled no matter how many repositories you split them into. Ownership rule: one module owns each table; others go through its interface.</p>
<p><b>Strangler fig migration.</b> To leave a monolith safely, put a proxy/gateway in front, route one endpoint at a time to a new service, and delete the old code path once traffic has moved. No big-bang rewrites (they famously fail).</p>
<p><b>Operational realities.</b> Large monoliths suffer slow builds and long test suites; fixes include build caching, modular builds (Gradle/Maven modules, Bazel), and running tests only for changed modules. Startup time and memory footprint grow too, which slows autoscaling.</p>
<p><b>Bulkheads inside a monolith.</b> You can isolate risk without splitting: separate thread pools per feature, separate deployments of the <i>same</i> artifact with different roles (web vs worker), and routing heavy endpoints to a dedicated pool of instances.</p>
<p><b>Microservices cost list:</b> service discovery, network failures, distributed tracing, versioned APIs, eventual consistency, per-service CI/CD and on-call. Worth it at scale with many teams; a tax for a small team.</p>`,
    aiEra: `<p><b>AI coding tools love clear boundaries.</b> Assistants work best when a module fits in their context and has an obvious interface. A modular monolith with clean module APIs is easier for AI (and humans) to change safely than a big ball of mud — or than 40 tiny services whose behaviour is spread across repos.</p>
<p><b>Where AI goes wrong:</b> asked to "design a scalable app", models often jump to microservices + Kafka + Kubernetes for a team of three. Push back with your real constraints: team size, traffic, deadline.</p>
<p><b>Adding AI features to a monolith:</b> an "AI summary" feature is usually just another module calling an external LLM API. Because those calls are slow and flaky, run them asynchronously (queue + worker) with timeouts, so a slow model never blocks checkout threads — the same isolation lesson as the reports example.</p>
<p><b>Use AI as a partner:</b> <code>Here is my package structure. Find modules that reach into other modules' internals or tables.</code> Good at spotting coupling. <b>You own</b> the decision of when a split is worth its cost.</p>`,
    problems: [{
      title: 'Five engineers, one product: monolith or microservices?',
      level: 'Medium', tags: ['monolith', 'architecture decision', 'trade-offs'], companies: ['Shopify', 'Stripe', 'startups'],
      statement: `<p>A 5-engineer startup is building a marketplace: users, listings, search, orders, payments (via an external provider) and an admin reports page. Expected: 50k users in year one. The CTO asks: "Should we start with microservices so we can scale later?" Give a recommendation with an architecture sketch and the conditions under which you would split something out.</p>`,
      constraints: `<p>Launch in 4 months. One on-call rotation. Budget-conscious.</p>`,
      example: `<p>Recommendation: ${H.c('g', 'modular monolith + one Postgres + background worker')}. Why: 50k users is small (a few requests/second), 5 engineers cannot operate 7 services, and orders + payments need simple transactions.</p>`,
      brute: { why: `<p><b>Naive design:</b> 7 microservices (users, listings, search, orders, payments, reports, notifications), each with its own database, Kafka between them, Kubernetes, a service mesh. It breaks because: the team spends months on infrastructure instead of product; every feature crosses 3 services (slow, fragile development); simple order+payment consistency needs sagas; and 50k users never needed it.</p>` },
      mcq: { q: 'Which is the strongest reason to extract one service from this monolith later?', options: ['Microservices are the industry standard', 'Search needs very different hardware and scales 10× faster than the rest', 'The codebase passed 10,000 lines', 'A new engineer joined'], answer: 1, explain: 'Independent scaling with different resource needs is a concrete, measurable pain that a split solves.' },
      hints: [
        `<p>Hint 1: Estimate traffic: 50k users, maybe 10% daily active, ~20 requests each → ~100k requests/day ≈ 1–2 requests/second on average. Tiny.</p>`,
        `<p>Hint 2: The real constraints are <b>team size</b> and <b>time</b>, not scale. What can 5 people build and operate?</p>`,
        `<p>Hint 3: Recipe — modular monolith with strict module boundaries, stateless app servers (2 copies for availability), one managed Postgres, a queue + worker for slow jobs (emails, reports), a CDN for images; list concrete "split triggers".</p>`
      ],
      solution: {
        approach: `<p><b>Recommendation: a modular monolith.</b></p>
<ul><li><b>App:</b> one codebase with modules <code>users</code>, <code>listings</code>, <code>search</code>, <code>orders</code>, <code>payments</code>, <code>admin</code>. Each module owns its tables and exposes an interface; architecture tests forbid cross-module internals.</li>
<li><b>Runtime:</b> 2+ identical stateless app instances behind a managed load balancer (one can die), sessions in signed cookies or Redis.</li>
<li><b>Data:</b> one managed PostgreSQL (automated backups, a standby replica). Postgres full-text search is enough for 50k listings at first.</li>
<li><b>Async:</b> a job queue + worker process (same codebase, different entry point) for emails, payment webhooks and admin reports, so slow work never blocks web requests.</li>
<li><b>Edge:</b> object storage + CDN for listing photos.</li>
<li><b>Payments:</b> external provider called from the payments module with timeouts and idempotency keys.</li></ul>
<p><b>Split triggers (measure, then act):</b> search needs a dedicated engine or different scaling → extract a search service fed by change events; payments need PCI isolation; a second team needs independent deploys; the worker\'s load needs its own autoscaling. Because module boundaries are clean, each extraction is a contained project (strangler pattern).</p>
<p><b>Trade-off stated:</b> we accept deploy coupling and shared blast radius now, in exchange for speed of development, simple transactions and low operating cost.</p>`,
        complexity: `<p>Operational load: 1 app artifact, 1 database, 1 queue — manageable for one on-call rotation. Capacity: a couple of modest instances serve hundreds of requests/second, far above the ~2 req/s average expected.</p>`,
        followUps: ['How would you extract search later without downtime?', 'What would make you choose microservices from day one?', 'How do you stop the monolith from becoming a big ball of mud?']
      }
    }]
  });

registerModule({ id: 'hld01', title: 'x', intro: 'x', goals: [], prereqs: 'x', hours: 1, topics: topics, practice: practice, quiz: quiz, interview: interview }); })();
