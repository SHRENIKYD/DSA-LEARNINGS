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

registerModule({ id: 'hld01', title: 'x', intro: 'x', goals: [], prereqs: 'x', hours: 1, topics: topics, practice: practice, quiz: quiz, interview: interview }); })();
