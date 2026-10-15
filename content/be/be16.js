(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* Shared helpers */
  function cp(o) { return JSON.parse(JSON.stringify(o)); }
  function bx(id, label, x, y, w) { var n = { id: id, label: label, x: x, y: y, shape: 'box' }; if (w) n.w = w; return n; }
  function num(s, def, lo, hi) {
    var v = Number(s);
    if (s === undefined || s === null || String(s).trim() === '' || isNaN(v)) v = def;
    return Math.max(lo, Math.min(hi, v));
  }
  function nums(input, min, max, hint) {
    var a = String(input).trim().split(/[\s,]+/).filter(function (x) { return x !== ''; }).map(Number);
    if (a.length < min || a.length > max || a.some(function (x) { return isNaN(x); })) throw new Error(hint);
    return a;
  }
  // prob(): short builder so every problem has the same shape
  function prob(o) {
    return {
      title: o.title, level: o.level, tags: o.tags, companies: o.companies,
      statement: o.statement, constraints: o.constraints || '<p>Think about a real service with a few hundred requests per second.</p>',
      example: o.example,
      brute: { why: o.brute },
      mcq: o.mcq,
      hints: o.hints.map(function (h) { return h.replace(/<[^>]+>/g, '').length < 45 ? h.replace('</p>', ' Think it through in your own words before reading the next hint.</p>') : h; }),
      solution: { approach: o.approach, code: o.code, complexity: o.complexity || '<p>Cheap to compute; the real cost is in choosing the right signals, not in the arithmetic.</p>', followUps: o.followUps }
    };
  }

  /* ================================================================
     TOPIC 1 - Structured logging with correlation ids
     ================================================================ */
  topics.push({
    title: 'Structured Logging with Correlation IDs',
    analogy: `<p>Imagine a delivery company that writes every parcel event on a sticky note: "Rahul's thing went somewhere, kinda late". Useless. Now imagine every note is a form with boxes: <b>parcel number</b>, <b>time</b>, <b>place</b>, <b>status</b>. A computer can sort and search the forms in a second. And the <b>parcel number</b> is stuck on every form from every depot, so you can pull out the whole journey of one parcel. That parcel number is your <b>correlation id</b>.</p>`,
    explain: `<p>A <b>log</b> is a diary your program writes while it runs. The old way is <code>printf</code>-style text: <code>"user 42 paid order 981 in 230ms"</code>. Humans can read it, but a machine has to guess where the user id is. The better way is <b>structured logging</b>: one JSON object per line with named fields.</p>
      ${H.table(['Style', 'Example line', 'Can I search "all slow payments for user 42"?'], [
        ['printf text', 'user 42 paid order 981 in 230ms', '<span class="c-r">Only with fragile regex</span>'],
        ['structured JSON', '{"level":"info","msg":"payment ok","user_id":42,"order_id":981,"duration_ms":230}', '<span class="c-g">Yes: user_id=42 AND duration_ms&gt;200</span>']
      ])}
      <p>The second big idea is the <b>correlation id</b> (also called request id or trace id). When a request enters your system, you create one random id (or accept the one the caller sent) and then:</p>
      <ul><li>put it on <b>every</b> log line written while handling that request,</li><li>pass it on in a header (<code>X-Request-Id</code> or the W3C <code>traceparent</code>) to every service you call,</li><li>return it to the caller, so a support ticket can say "my request id was abc123".</li></ul>
      <p>With that, one search shows the whole story across 12 services. Also: pick levels with meaning (<b>ERROR</b> = a human or retry should care, <b>WARN</b> = odd but handled, <b>INFO</b> = business events, <b>DEBUG</b> = developer detail, off in production), and <b>never log secrets</b> (passwords, tokens, full card numbers, personal data).</p>`,
    clues: ['"how do you debug one failed request across 10 microservices?" - correlation id / trace id', '"logs are huge and nobody can search them" - structured JSON with consistent field names', '"support gives you a customer complaint with a time" - you need a request id returned to the user', '"we leaked a token in the logs" - redaction at the logger, not by hand', '"log volume cost is exploding" - levels, sampling, and not logging in hot loops', '"async code loses the id" - context propagation (MDC, AsyncLocalStorage, contextvars)'],
    code: [
      {
        lang: 'js', run: true, title: 'Structured logger with correlation id propagation (runnable)', code: `// A tiny structured logger. The "context" holds fields (like request_id)
// that are automatically added to every log line written inside withContext().
var current = {};            // the active context (like MDC / AsyncLocalStorage)
var clock = 0;               // fake clock so the output is stable
var SECRET_KEYS = ['password', 'token', 'authorization', 'card'];

function withContext(fields, fn) {
  var previous = current;
  current = Object.assign({}, previous, fields);   // child context inherits parent fields
  try { return fn(); } finally { current = previous; }  // always restore
}

function redact(obj) {
  var out = {};
  Object.keys(obj).forEach(function (k) {
    var secret = SECRET_KEYS.indexOf(k.toLowerCase()) >= 0;
    out[k] = secret ? '[REDACTED]' : obj[k];
  });
  return out;
}

function log(level, msg, fields) {
  clock += 5;
  var line = Object.assign({ ts: clock, level: level, msg: msg }, current, redact(fields || {}));
  console.log(JSON.stringify(line));
}

// Simulate: gateway -> orders service -> payments service
function payments(headers) {
  // Payments service reads the id from the incoming header, so the trail continues.
  return withContext({ service: 'payments', request_id: headers['x-request-id'] }, function () {
    log('info', 'charging card', { amount_cents: 4999, card: '4111111111111111' });
    log('warn', 'bank slow', { duration_ms: 820 });
    return 'ok';
  });
}

function orders(headers) {
  return withContext({ service: 'orders', request_id: headers['x-request-id'] }, function () {
    log('info', 'order received', { order_id: 981, user_id: 42 });
    var r = payments({ 'x-request-id': current.request_id });   // propagate the id downstream
    log('info', 'order complete', { order_id: 981, result: r });
  });
}

// The gateway creates the id only if the caller did not send one.
var incoming = {};
var id = incoming['x-request-id'] || 'req-7f3a9c';
orders({ 'x-request-id': id });
console.log('--- grep request_id=req-7f3a9c gives the whole story across both services ---');`
      },
      {
        lang: 'java', title: 'Same idea in plain Java: a ThreadLocal context (what MDC does for you)', code: `import java.util.*;

public class StructuredLog {
    // ThreadLocal = one private "sticky note" per thread, like SLF4J's MDC.
    private static final ThreadLocal<Map<String, String>> CTX =
        ThreadLocal.withInitial(HashMap::new);

    static void put(String k, String v) { CTX.get().put(k, v); }
    static void clear() { CTX.remove(); }       // IMPORTANT: thread pools reuse threads

    static void info(String msg, String... kv) {
        Map<String, String> line = new LinkedHashMap<>();
        line.put("level", "info");
        line.put("msg", msg);
        line.putAll(CTX.get());                  // request_id etc. added automatically
        for (int i = 0; i + 1 < kv.length; i += 2) line.put(kv[i], kv[i + 1]);
        StringBuilder sb = new StringBuilder("{");
        for (Map.Entry<String, String> e : line.entrySet()) {
            if (sb.length() > 1) sb.append(',');
            sb.append('"').append(e.getKey()).append("\\":\\"").append(e.getValue()).append('"');
        }
        System.out.println(sb.append('}'));
    }

    public static void main(String[] args) {
        put("request_id", "req-7f3a9c");
        try {
            info("payment ok", "order_id", "981", "duration_ms", "230");
        } finally {
            clear();                             // never leak ids into the next request
        }
    }
}` }
    ],
    viz: [
      {
        title: 'Printf line to structured JSON',
        input: 'user 42 paid order 981 in 230ms',
        inputLabel: 'A printf-style log message',
        gen: function (input) {
          var s = String(input).trim();
          var m = s.match(/user\s+(\d+)\s+paid\s+order\s+(\d+)\s+in\s+(\d+)\s*ms/i);
          if (!m) throw new Error('Use the format: user 42 paid order 981 in 230ms');
          var u = m[1], o = m[2], d = m[3];
          var f = [];
          f.push({ narr: 'We start with an old <b>printf</b> line. A human reads it easily, but the user id, order id and time are hidden inside a sentence.', parts: [
            { type: 'table', label: 'BEFORE: plain text', columns: ['line'], rows: [[s]], hl: { 0: 'bad' } },
            { type: 'text', html: 'To find "all payments slower than 200ms" you would need a regex that breaks every time someone changes the wording.' }] });
          f.push({ narr: 'Step 1: pull the <b>facts</b> out of the sentence. Each fact becomes a named field.', parts: [
            { type: 'table', label: 'Facts found', columns: ['field', 'value'], rows: [['user_id', u], ['order_id', o], ['duration_ms', d]], hl: { 0: 'ok', 1: 'ok', 2: 'ok' } }] });
          f.push({ narr: 'Step 2: the message becomes a <b>stable event name</b> that never has numbers in it. Stable text means you can count and group the same event.', parts: [
            { type: 'table', label: 'Message', columns: ['before', 'after'], rows: [[s, 'payment completed']], hl: { 0: 'sel' } }] });
          f.push({ narr: 'Step 3: add the fields every line needs: time, level, service, and the <b>request_id</b> from the current context. You did not pass it by hand; the logger added it.', parts: [
            { type: 'table', label: 'Standard fields', columns: ['field', 'value', 'who adds it'], rows: [['ts', '2026-10-15T10:00:00Z', 'logger'], ['level', 'info', 'caller'], ['service', 'payments', 'config'], ['request_id', 'req-7f3a9c', 'context (automatic)']], hl: { 3: 'ok' } }] });
          f.push({ narr: 'Final line: one JSON object per line. Now a query like <code>user_id=' + u + ' AND duration_ms&gt;200</code> is easy and fast.', parts: [
            { type: 'table', label: 'AFTER: structured JSON', columns: ['ts', 'level', 'service', 'request_id', 'msg', 'user_id', 'order_id', 'duration_ms'], rows: [['10:00:00', 'info', 'payments', 'req-7f3a9c', 'payment completed', u, o, d]], hl: { 0: 'ok' } },
            { type: 'text', html: Number(d) > 200 ? '<span class="c-y">duration_ms &gt; 200: this line would show up in a slow-payments query.</span>' : '<span class="c-g">Fast payment, below the 200ms line.</span>' }] });
          return f;
        }
      },
      {
        title: 'Correlation id travelling across services',
        input: 'req-7f3a9c',
        inputLabel: 'Request id created at the gateway',
        gen: function (input) {
          var id = String(input).trim().slice(0, 20) || 'req-7f3a9c';
          var nodes = [bx('U', 'User', 8, 30, 14), bx('G', 'Gateway', 30, 30, 16), bx('O', 'Orders', 55, 12, 16), bx('P', 'Payments', 82, 12, 18), bx('I', 'Inventory', 55, 48, 18), bx('L', 'Log store', 82, 48, 18)];
          var edges = [['U', 'G'], ['G', 'O'], ['O', 'P'], ['O', 'I'], ['P', 'L'], ['I', 'L']];
          function g(ehl, tags, hl, lab) { return { type: 'graph', label: lab || 'Request path', directed: true, height: 60, nodes: cp(nodes), edges: cp(edges), ehl: ehl, tags: tags || {}, hl: hl || {} }; }
          return [
            { narr: 'A user calls the gateway. No request id yet.', parts: [g({ 'U-G': 'cur' }, {}, { G: 'cur' })] },
            { narr: 'The gateway makes a new id <b>' + id + '</b> (or keeps the one the caller sent) and logs it. It also returns it in the response header.', parts: [g({ 'U-G': 'ok' }, { G: id }, { G: 'ok' })] },
            { narr: 'Gateway calls Orders and passes the id in the <code>X-Request-Id</code> header. Orders puts it in its logging context.', parts: [g({ 'U-G': 'ok', 'G-O': 'cur' }, { G: id, O: id }, { O: 'cur' })] },
            { narr: 'Orders fans out to Payments and Inventory. <b>Both</b> calls carry the same id.', parts: [g({ 'U-G': 'ok', 'G-O': 'ok', 'O-P': 'cur', 'O-I': 'cur' }, { G: id, O: id, P: id, I: id }, { P: 'cur', I: 'cur' })] },
            { narr: 'Every service ships JSON lines to the log store. All of them contain <code>request_id=' + id + '</code>.', parts: [g({ 'U-G': 'ok', 'G-O': 'ok', 'O-P': 'ok', 'O-I': 'ok', 'P-L': 'cur', 'I-L': 'cur' }, { L: '4 lines' }, { L: 'ok' })] },
            { narr: 'Support searches <code>request_id=' + id + '</code> and sees the whole journey in time order. Inventory was slow here.', parts: [
              { type: 'table', label: 'One search, four services', columns: ['time', 'service', 'msg', 'ms'], rows: [['0', 'gateway', 'request in', '-'], ['5', 'orders', 'order received', '-'], ['12', 'payments', 'charged', '40'], ['12', 'inventory', 'stock check', '900']], hl: { 3: 'bad' } }] }
          ];
        }
      }
    ],
    examples: [
      { title: 'Good field names stay the same everywhere', html: `<p>If service A logs <code>userId</code>, service B logs <code>user</code>, and service C logs <code>uid</code>, a search for one user needs three queries. Pick one naming rule (for example <code>snake_case</code>) and a short list of <b>standard fields</b>: <code>ts, level, service, env, version, request_id, trace_id, user_id, duration_ms, error.type, error.message</code>. Share them in a tiny library so nobody invents new names.</p>` },
      { title: 'Log events, not sentences with data glued in', html: `<p>Bad: <code>log.info("Processed " + n + " items for " + user)</code>. Every line is different text, so you cannot group it. Good: message <code>items processed</code> plus fields <code>count=12</code> and <code>user_id=42</code>. The message is the <b>event type</b>; the fields are the <b>details</b>.</p>` },
      { title: 'Redact secrets inside the logger', html: `<p>Do not rely on every developer remembering. The logger above replaces values of keys like <code>password</code>, <code>token</code>, <code>authorization</code> with <code>[REDACTED]</code>. Also never log whole request bodies by default; they contain things you did not expect. Read secrets from environment variables or a secret manager, never from the source code or from a log.</p>`, code: { lang: 'js', run: true, code: `var SECRET = ['password', 'token', 'authorization'];
function safe(o) {
  var r = {};
  Object.keys(o).forEach(function (k) { r[k] = SECRET.indexOf(k) >= 0 ? '[REDACTED]' : o[k]; });
  return r;
}
console.log(JSON.stringify(safe({ user_id: 42, password: 'hunter2', token: 'abc' })));` } },
      { title: 'Async code loses the context unless you carry it', html: `<p>In Java, <code>MDC</code> lives in a ThreadLocal, so when you hand work to another thread pool the id is gone unless you copy it. In Node use <code>AsyncLocalStorage</code>; in Python use <code>contextvars</code>. A common bug: the first log lines have a request id, the lines after an <code>await</code> or after a queue hop do not. Test this on purpose.</p>` }
    ],
    deepDive: `<p><b>Where the id comes from.</b> Prefer the W3C <code>traceparent</code> header (<code>00-&lt;trace-id&gt;-&lt;span-id&gt;-&lt;flags&gt;</code>) so logs and traces share one id; a plain <code>X-Request-Id</code> is fine if you have no tracing yet. Accept an incoming id only from trusted callers, and cap its length and characters, otherwise a hostile client can inject newlines or giant strings into your logs (log injection). Generate with a random 128-bit value so ids do not collide.</p>
      <p><b>Cost.</b> Logs are the most expensive signal at scale: you pay to write, ship, index and store every byte. Habits that keep the bill sane: no logging inside tight loops, one summary line per request ("canonical log line" with method, route, status, duration, bytes, user, counts of DB calls) instead of ten chatty lines, sample noisy INFO events, short retention for DEBUG, long retention only for audit logs. Log <b>asynchronously</b> through a bounded buffer so a slow log pipeline never blocks the request; decide what to drop when the buffer is full (drop DEBUG first).</p>
      <p><b>Cardinality and PII.</b> Logs can hold high-cardinality values (user ids, order ids) cheaply, unlike metrics labels. But personal data (emails, phone numbers, addresses) has legal rules: hash or omit it, set retention, and make deletion possible. <b>Errors:</b> log the exception once, at the boundary that handles it, with the stack trace as one field; logging at every layer produces the same error five times. <b>Order:</b> clocks differ between machines, so sort by trace and span order when you can, not only by timestamp.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI assistants and log-analysis tools can read a pile of structured lines and summarise "73% of the errors share <code>bank=XYZ</code> and started at 10:02". That only works well when fields are consistent; messy printf text makes the summary a guess. LLM-based apps also need their own logs: prompt id, model name, token counts, latency, tool calls, and a trace id, because one user question can fan out into many model and tool calls.</p>
      <p><b>Use AI as a partner:</b> paste a few printf lines and ask <code>Convert these to JSON events with stable names and a field list, do not invent values</code>; ask for a redaction test list of fake secrets. <b>Where AI goes wrong:</b> it happily logs the whole prompt, full request body or user email "for debugging", leaking personal data; it also invents field names per file. <b>Never paste real production logs with secrets or customer data into a public AI tool.</b> <b>What you must still own:</b> the field naming standard, what is allowed in logs (privacy), retention, and the habit of passing the id across every boundary.</p>`,
    problems: [
      prob({
        title: 'Convert printf logs to structured JSON with request id', level: 'Easy', tags: ['logging', 'structured'], companies: ['Datadog', 'Uber'],
        statement: `<p>Your checkout service writes these lines:</p><pre>Starting checkout for user 42
Card declined for user 42 (code=05) after 310 ms
Checkout finished, total 49.99</pre><p>Rewrite them as structured JSON events that can be searched and joined with other services.</p>`,
        example: `<p>Good output has stable event names and typed fields, for example:</p><pre>{"level":"info","msg":"checkout started","request_id":"req-7f3a9c","user_id":42}
{"level":"warn","msg":"card declined","request_id":"req-7f3a9c","user_id":42,"decline_code":"05","duration_ms":310}</pre><p>${H.c('g', 'Same msg text every time; the numbers live in fields.')}</p>`,
        brute: `<p>Keep the sentences and add a regex in the log search tool. It breaks when a developer changes the wording, cannot compare numbers, and each new message needs a new regex.</p>`,
        mcq: { q: 'Which is the best <code>msg</code> for the declined-card event?', options: ['"Card declined for user 42 (code=05)"', '"card declined"', '"declined"'], answer: 1, explain: 'A stable, number-free message groups all declines. The user and code go in fields.' },
        hints: [`<p>Hint 1: the sentence should never change, only the fields change.</p>`, `<p>Hint 2: add the fields every line shares (ts, level, service, request_id) through a context, not by hand.</p>`, `<p>Hint 3: choose levels: started = info, declined = warn (expected business outcome), unexpected exception = error. Name numbers with units: <code>duration_ms</code>, <code>total_cents</code> (integers avoid float surprises).</p>`],
        approach: `<p>Three steps. (1) Pick stable event names: <code>checkout started</code>, <code>card declined</code>, <code>checkout finished</code>. (2) Move every value into a field with a clear name and a unit: <code>user_id</code>, <code>decline_code</code>, <code>duration_ms</code>, <code>total_cents</code>. (3) Wrap the request in a logging context that holds <code>request_id</code>, <code>service</code> and <code>env</code> so you do not repeat them. Output one JSON object per line. A card decline is expected business behaviour, so warn or info, not error, otherwise your error alerts get noisy. Redact card numbers.</p>`
      }),
      prob({
        title: 'Find why the correlation id disappears after a queue hop', level: 'Medium', tags: ['logging', 'context propagation', 'async'],
        statement: `<p>Logs from the web handler contain <code>request_id</code>, but logs from the email worker that consumes the "order created" message do not. How do you fix it, and what do you keep in the message?</p>`,
        example: `<p>${H.table(['source', 'has request_id?'], [['web handler', '<span class="c-g">yes</span>'], ['email worker', '<span class="c-r">no</span>']])}</p>`,
        brute: `<p>Search by timestamp and user id and hope. Clocks differ, many users overlap, and it is slow and unreliable.</p>`,
        mcq: { q: 'Where must the id travel for a message queue?', options: ['In an HTTP header only', 'In the message headers or metadata, then restored into the worker context', 'Nowhere, workers make a new id'], answer: 1, explain: 'A queue has no HTTP header; put the id in message metadata and set the logging context when the consumer starts.' },
        hints: [`<p>Hint 1: the thread or process that handles the message knows nothing about the web request.</p>`, `<p>Hint 2: the id must be stored in the message itself (metadata/headers).</p>`, `<p>Hint 3: on receive, set context from the message before any log call, and clear it afterwards. A new worker span can still link to the producer.</p>`],
        approach: `<p>The context lives in memory of the web thread, so it cannot cross the queue by itself. Fix: when publishing, copy the current <code>request_id</code> (better, the W3C <code>traceparent</code>) into the message headers. In the consumer, read that header first thing, open a logging context with it, process, then clear the context in a finally block. If the message is retried or sent to a dead-letter queue, keep the same id so the story stays connected. For batch jobs that handle many messages, set a per-message context. Add a test: publish with an id, assert the worker logs contain it.</p>`
      })
    ]
  });

  /* ================================================================
     TOPIC 2 - Metrics: RED and USE
     ================================================================ */
  topics.push({
    title: 'Metrics: RED and USE Methods',
    analogy: `<p>A car dashboard does not show you every piston. It shows <b>speed</b>, <b>fuel</b> and <b>engine temperature</b>. A few good numbers, always on, tell you if the trip is going well. Metrics are your service's dashboard. <b>RED</b> is what the <em>passengers</em> feel (are trips happening, are they failing, are they slow). <b>USE</b> is what the <em>engine</em> feels (how busy, how queued up, any faults).</p>`,
    explain: `<p>A <b>metric</b> is a number measured over time, cheap to store and fast to graph. Logs tell you the story of one request; metrics tell you the health of the whole system. Two simple checklists keep you from drowning in graphs:</p>
      ${H.table(['Method', 'For', 'Questions', 'Signals'], [
        ['<b>RED</b>', 'Services / APIs (things that handle requests)', 'Are users being served well?', '<b>R</b>ate (requests per second), <b>E</b>rrors (failed per second or %), <b>D</b>uration (how long, as percentiles)'],
        ['<b>USE</b>', 'Resources (CPU, memory, disk, network, connection pool, queue)', 'Is the machinery healthy?', '<b>U</b>tilization (% busy), <b>S</b>aturation (work waiting), <b>E</b>rrors (faults)']
      ])}
      <p>Google's SRE book adds the <b>four golden signals</b>: latency, traffic, errors, saturation, which is RED + the S of USE. Metric types you will meet: <b>counter</b> (only goes up, like total requests; you graph its <em>rate</em>), <b>gauge</b> (goes up and down, like queue length), <b>histogram</b> (counts of values in buckets, for latency). Use <b>labels</b> (route, method, status class) to slice, but keep them few and bounded: <code>route="/orders/{id}"</code> is fine, <code>user_id="42"</code> is not, because every new value creates a new time series (the "cardinality" problem).</p>`,
    clues: ['"what would you monitor for an API?" - RED per endpoint, plus saturation of its dependencies', '"how do you know a database is the bottleneck?" - USE: connection pool utilization and queue wait', '"CPU is only 30% but requests are slow" - saturation of something else (threads, pool, locks)', '"dashboard has 80 graphs and nobody looks" - pick RED/USE, link each graph to an action', '"our Prometheus is out of memory" - label cardinality too high', '"count requests" vs "current queue size" - counter vs gauge']
    ,
    code: [
      {
        lang: 'python', run: true, title: 'RED metrics from a list of requests (runnable)', code: `# Compute Rate, Errors, Duration for one API from raw request records.
# Each record: (route, status, duration_ms). Window = 60 seconds.
requests = [
    ("/orders", 200, 80), ("/orders", 200, 95), ("/orders", 500, 40),
    ("/orders", 200, 120), ("/orders", 200, 2300), ("/search", 200, 30),
    ("/search", 200, 35), ("/search", 200, 28), ("/orders", 503, 60),
    ("/orders", 200, 90),
]
WINDOW_S = 60

def percentile(sorted_vals, p):
    # nearest-rank percentile on a sorted list
    k = max(0, int(round(p / 100.0 * len(sorted_vals))) - 1)
    return sorted_vals[k]

by_route = {}
for route, status, ms in requests:
    by_route.setdefault(route, []).append((status, ms))

print("route     rate/s  err%   p50  p95")
for route, rows in sorted(by_route.items()):
    total = len(rows)
    errors = sum(1 for s, _ in rows if s >= 500)      # count server faults as errors
    durs = sorted(ms for _, ms in rows)
    print("%-9s %6.2f %5.1f %5d %4d" % (
        route, total / WINDOW_S, 100.0 * errors / total,
        percentile(durs, 50), percentile(durs, 95)))`
      },
      {
        lang: 'yaml', check: false, title: 'RED and USE queries in PromQL (shape only)', code: `# Prometheus recording rules (PromQL). check:false - needs Prometheus.
groups:
  - name: api-red
    rules:
      # R - rate: requests per second per route
      - record: route:http_requests:rate5m
        expr: sum by (route) (rate(http_requests_total[5m]))
      # E - errors: fraction of 5xx responses
      - record: route:http_errors:ratio5m
        expr: |
          sum by (route) (rate(http_requests_total{status=~"5.."}[5m]))
          / sum by (route) (rate(http_requests_total[5m]))
      # D - duration: p95 from histogram buckets
      - record: route:http_latency_p95:5m
        expr: histogram_quantile(0.95, sum by (le, route) (rate(http_request_duration_seconds_bucket[5m])))
  - name: db-use
    rules:
      # U - utilization of the connection pool
      - record: pool:utilization
        expr: db_pool_active_connections / db_pool_max_connections
      # S - saturation: threads waiting for a connection
      - record: pool:waiting
        expr: db_pool_pending_requests`
      }
    ],
    viz: [
      {
        title: 'RED dashboard for an API',
        input: '120 3 450',
        inputLabel: 'Requests/sec, errors/sec, p95 ms',
        gen: function (input) {
          var a = nums(input, 3, 3, 'Enter three numbers: rate errors p95ms, e.g. 120 3 450');
          var rate = Math.max(1, a[0]), errs = Math.max(0, Math.min(a[1], rate)), p95 = Math.max(1, a[2]);
          var pct = Math.round(errs / rate * 1000) / 10;
          var errCls = pct >= 5 ? 'bad' : pct >= 1 ? 'cur' : 'ok';
          var latCls = p95 > 800 ? 'bad' : p95 > 400 ? 'cur' : 'ok';
          var f = [];
          f.push({ narr: 'We watch one API with the three RED questions. First <b>Rate</b>: how many requests per second? A sudden drop to zero is as scary as a spike.', parts: [{ type: 'bars', label: 'R - Rate (req/s)', values: [rate], texts: [rate + ' req/s'], hl: { 0: 'ok' } }] });
          f.push({ narr: 'Next <b>Errors</b>: ' + errs + ' of ' + rate + ' requests failed, so <b>' + pct + '%</b>. Always show errors as a <em>percentage</em> next to the rate, a raw count means nothing without traffic.', parts: [{ type: 'bars', label: 'E - Error % (' + pct + '%)', values: [pct], texts: [pct + ' %'], hl: { 0: errCls } }] });
          f.push({ narr: 'Then <b>Duration</b>: the p95 is <b>' + p95 + ' ms</b>, meaning 95 of 100 users were faster than that. (Why not the average? Next topic.)', parts: [{ type: 'bars', label: 'D - p95 latency (ms)', values: [p95], texts: [p95 + ' ms'], hl: { 0: latCls } }] });
          var verdict = (errCls === 'bad' || latCls === 'bad') ? '<span class="c-r">Users are hurting: page someone.</span>' : (errCls === 'cur' || latCls === 'cur') ? '<span class="c-y">Watch closely: something is drifting.</span>' : '<span class="c-g">Healthy.</span>';
          f.push({ narr: 'The full RED view on one screen. ' + verdict, parts: [
            { type: 'bars', label: 'RED at a glance', values: [rate, pct, p95], idxLabels: ['Rate req/s', 'Errors %', 'p95 ms'], texts: [rate + '', pct + '%', p95 + 'ms'], hl: { 0: 'ok', 1: errCls, 2: latCls } },
            { type: 'vars', vals: { rate: rate, error_pct: pct, p95_ms: p95 }, hl: { error_pct: errCls, p95_ms: latCls } }] });
          return f;
        }
      },
      {
        title: 'USE check of resources',
        input: '85 7 0',
        inputLabel: 'Pool utilization %, queue waiting, errors',
        gen: function (input) {
          var a = nums(input, 3, 3, 'Enter three numbers: utilization% waiting errors, e.g. 85 7 0');
          var u = Math.max(0, Math.min(100, a[0])), w = Math.max(0, a[1]), e = Math.max(0, a[2]);
          var sat = w > 0;
          return [
            { narr: 'USE looks at a <b>resource</b>, here the database connection pool. <b>U</b>tilization: how much of it is in use?', parts: [{ type: 'bars', label: 'U - utilization %', values: [u], texts: [u + '%'], hl: { 0: u > 90 ? 'bad' : u > 70 ? 'cur' : 'ok' } }] },
            { narr: '<b>S</b>aturation: is work <em>waiting</em> for the resource? ' + (sat ? '<span class="c-r">' + w + ' requests are queued, users are already waiting.</span>' : '<span class="c-g">Nothing waits.</span>') + ' Saturation hurts before utilization reaches 100%.', parts: [{ type: 'bars', label: 'S - waiting requests', values: [w], texts: [w + ''], hl: { 0: sat ? 'bad' : 'ok' } }] },
            { narr: '<b>E</b>rrors: faults of the resource itself (timeouts, refused connections). ' + (e > 0 ? '<span class="c-r">There are errors.</span>' : '<span class="c-g">None.</span>'), parts: [{ type: 'bars', label: 'E - errors', values: [e], texts: [e + ''], hl: { 0: e > 0 ? 'bad' : 'ok' } }] },
            { narr: 'Summary table. Rule of thumb: <b>start at saturation</b>, it is the earliest warning of a bottleneck.', parts: [{ type: 'table', label: 'USE verdict for db pool', columns: ['U', 'S', 'E', 'verdict'], rows: [[u + '%', w, e, (sat || e > 0 || u > 90) ? 'BOTTLENECK likely' : 'fine']], hl: { 0: (sat || e > 0 || u > 90) ? 'bad' : 'ok' } }] }
          ];
        }
      }
    ],
    examples: [
      { title: 'Pick RED metrics for a checkout API', html: `<p>For <code>POST /checkout</code>: <b>Rate</b> = <code>http_requests_total{route="/checkout"}</code> per second. <b>Errors</b> = 5xx divided by all requests (client 4xx like "card declined" are usually <em>not</em> your fault, track them separately). <b>Duration</b> = histogram, alert on p95 or p99. Add one <b>business metric</b> too: orders completed per minute. If the technical dashboard is green but orders drop to zero, the business metric catches it.</p>` },
      { title: 'USE on a worker pool', html: `<p>Resource: 16 worker threads. <b>Utilization</b> = busy threads / 16. <b>Saturation</b> = tasks waiting in the queue. <b>Errors</b> = tasks rejected or crashed. 100% utilization with an empty queue is fine (efficient). 60% utilization with a growing queue means threads are blocked on something else, like a slow database.</p>` },
      { title: 'Counter vs gauge vs histogram', html: `<p>${H.table(['Question', 'Type', 'How to read'], [['How many requests so far?', 'counter', 'graph <code>rate()</code>, never the raw value'], ['How many connections are open now?', 'gauge', 'graph the value directly'], ['How long did requests take?', 'histogram', 'graph percentiles from buckets']])}</p>` },
      { title: 'Cardinality trap', html: `<p>Label <code>http_requests_total{user_id="..."}</code> with 1 million users creates 1 million time series per metric. Your metrics server runs out of memory. Put high-cardinality detail in <b>logs and traces</b>, keep metric labels to bounded sets: route template, method, status class, region.</p>` }
    ],
    deepDive: `<p><b>Why percentages and rates.</b> A counter that resets on restart is handled by <code>rate()</code> (it detects resets). Raw counts cannot be compared across pods or time. Errors should be a <b>ratio</b> so a quiet night with 2 errors out of 4 requests (50%) is not confused with a busy day. For low-traffic services, ratios jump wildly, so alert on <em>count and ratio together</em> or use longer windows.</p>
      <p><b>What counts as an error?</b> Decide in the open: HTTP 5xx, timeouts, and also "success" responses that are wrong (slow beyond the SLO, empty results due to a bug). Client mistakes (400, 404, 401) belong in a separate series. Measure at the <b>edge the user sees</b> (load balancer or client side) as well as inside the service, because a crashed pod emits no metrics.</p>
      <p><b>USE gotchas.</b> Averaged CPU over 64 cores hides one pinned core; look at per-core or per-thread. Memory: watch saturation (swapping, GC pause time, OOM kills), not just percent used. Disk: queue depth and await time. Network: drops and retransmits. Connection pools and thread pools are resources too, they are the saturation points of most web apps. <b>Collection model:</b> Prometheus <em>pulls</em> (scrapes) every 15-60 s, so spikes shorter than the interval hide; push-based systems (StatsD, OpenTelemetry OTLP) send as events happen. Keep metric names consistent with units in the name (<code>_seconds</code>, <code>_bytes</code>, <code>_total</code>).</p>`,
    aiEra: `<p><b>What AI changes:</b> Modern observability platforms use machine learning for anomaly detection ("this metric is unusual for a Tuesday 3pm") and AI assistants write queries from plain English. LLM-serving systems add their own golden signals: <b>time to first token</b>, <b>tokens per second</b>, queue depth, GPU utilization and memory (a USE view of the GPU), cost per request, and quality signals such as refusal rate or thumbs-down rate.</p>
      <p><b>Use AI as a partner:</b> ask <code>Given this endpoint list, propose RED metrics and bounded labels; flag any high-cardinality label</code>, or have it explain a PromQL query step by step. <b>Where AI goes wrong:</b> it writes plausible PromQL that divides mismatched label sets, uses <code>avg</code> of percentiles (mathematically wrong), or adds <code>user_id</code> as a label. Always run the query on real data and compare with a hand calculation. <b>What you must still own:</b> choosing what "error" and "good" mean for your users, keeping cardinality bounded, and tying each graph to a decision.</p>`,
    problems: [
      prob({
        title: 'Pick RED metrics for an API', level: 'Easy', tags: ['metrics', 'RED'], companies: ['Google', 'Netflix'],
        statement: `<p>You own <code>GET /products/{id}</code>, <code>POST /cart</code> and <code>POST /checkout</code>. List the metrics and labels you would create, and say what you would put on the team's main dashboard.</p>`,
        example: `<p>${H.table(['Metric', 'Type', 'Labels'], [['http_requests_total', 'counter', 'route, method, status_class'], ['http_request_duration_seconds', 'histogram', 'route, method'], ['orders_completed_total', 'counter', 'payment_method']])}</p>`,
        brute: `<p>Create one metric per class method and label every metric with user id and full URL. You get thousands of useless series, the server runs out of memory, and the graphs answer no question.</p>`,
        mcq: { q: 'Which label is safe on a metric?', options: ['user_id', 'route template like /products/{id}', 'full URL with query string'], answer: 1, explain: 'Route templates are a small bounded set. Ids and raw URLs create endless series.' },
        hints: [`<p>Hint 1: RED = rate, errors, duration for each route.</p>`, `<p>Hint 2: use a histogram for duration, a counter for requests, labels must be a small fixed set.</p>`, `<p>Hint 3: add one business metric (orders completed) and put the three RED graphs for the top routes on the main dashboard.</p>`],
        approach: `<p>Create a counter <code>http_requests_total</code> with labels <code>route</code> (the template, never the raw path), <code>method</code>, and <code>status_class</code> (2xx, 4xx, 5xx). Rate is <code>rate()</code> of it; errors are 5xx over total. Create a histogram <code>http_request_duration_seconds</code> with buckets around the SLO (for example 0.05, 0.1, 0.25, 0.5, 1, 2.5), labelled by route and method. Add a business counter <code>orders_completed_total</code>. The main dashboard shows, per route, the request rate, error percentage and p95/p99, with the SLO line drawn on the latency graph; checkout is the most important row. USE-type graphs for dependencies (database pool, cache hit rate) go on a second page. Never use user id or raw URL as a label.</p>`
      }),
      prob({
        title: 'CPU is 30% but latency is awful: use USE to find why', level: 'Medium', tags: ['metrics', 'USE', 'saturation'],
        statement: `<p>An order service shows low CPU and low memory, but p99 latency tripled. Walk through a USE investigation.</p>`,
        example: `<p>${H.table(['Resource', 'Util', 'Saturation', 'Errors'], [['CPU', '30%', '0', '0'], ['DB pool', '<span class="c-r">100%</span>', '<span class="c-r">45 waiting</span>', '2 timeouts'], ['Disk', '10%', '0', '0']])}</p>`,
        brute: `<p>Add more pods because "latency is bad". If the shared database pool is the limit, more pods make it worse (more clients fight for the same connections).</p>`,
        mcq: { q: 'Which number gives the earliest warning of a bottleneck?', options: ['Average CPU', 'Saturation (work waiting)', 'Free disk space'], answer: 1, explain: 'Queues build up before a resource shows 100% utilization.' },
        hints: [`<p>Hint 1: list every resource the request touches, not just CPU.</p>`, `<p>Hint 2: for each, check Utilization, Saturation, Errors.</p>`, `<p>Hint 3: the connection pool, thread pool and locks are resources too.</p>`],
        approach: `<p>List the resources a request touches: CPU, memory, network, threads, DB connection pool, downstream HTTP clients, disk. For each read U, S, E. Here CPU, memory and disk are fine, but the DB pool is at 100% utilization with 45 requests waiting and some timeouts: that is the bottleneck. Requests spend most of their time waiting for a connection, not computing, so CPU stays low. Confirm with a trace (a long gap before the SQL span) and with database metrics (are queries slow, or are connections held too long by a transaction that calls a remote service?). Fixes: shorten transactions, add an index or cache, size the pool to what the database can serve, add a timeout and a bulkhead. Do not simply add pods.</p>`
      })
    ]
  });

  /* ================================================================
     TOPIC 3 - Histograms vs averages
     ================================================================ */
  topics.push({
    title: 'Histograms vs Averages: Why Percentiles Matter',
    analogy: `<p>A river is "on average 1 metre deep". A family crosses on foot and the one deep hole of 4 metres drowns the youngest. The average hid the hole. <b>Latency is the same</b>: most requests are fast, a few are terrible, and the few terrible ones are real users having a bad day. A <b>histogram</b> is a map of the river bed: it shows where the holes are.</p>`,
    explain: `<p>The <b>average</b> (mean) adds everything and divides. One 30-second request among 99 requests of 100 ms gives an average of about 400 ms, which describes <em>nobody</em>. Instead we use <b>percentiles</b>: p50 (median) is the typical user, p95 means 95% of requests were faster, p99 is the slow tail.</p>
      ${H.table(['Request', 'Latency'], [['99 requests', '100 ms each'], ['1 request', '30,000 ms'], ['<b>Average</b>', '<span class="c-r">399 ms (nobody saw this)</span>'], ['<b>p50</b>', '<span class="c-g">100 ms</span>'], ['<b>p99.9</b>', '<span class="c-r">30,000 ms</span>']])}
      <p>How do we store percentiles cheaply? We cannot keep every request. A <b>histogram metric</b> counts how many requests fell into each <b>bucket</b>: "&le; 50ms: 800, &le; 100ms: 150, &le; 250ms: 40, ...". Prometheus buckets are <b>cumulative</b> (each bucket includes the smaller ones). To estimate a percentile you find the bucket that contains it and interpolate inside. The answer is an <em>estimate</em>, only as precise as your bucket edges, so put edges around your SLO (for example at 300 ms if the target is "95% under 300 ms").</p>
      <p>Two golden rules: (1) <b>never average percentiles</b> across servers or time; add the bucket counts, then compute the percentile; (2) measure latency per route, because one slow report endpoint should not hide behind a fast health check.</p>`,
    clues: ['"average response time is fine but users complain" - look at p95/p99', '"p99 latency" or "tail latency" in the question', '"how do you aggregate latency across 50 pods?" - sum histogram buckets, never average percentiles', '"SLO: 99% of requests under 300 ms" - a bucket edge at 300 ms', '"one slow dependency" in a fan-out - tail latency amplification', '"why not store every request time?" - histograms are cheap and mergeable']
    ,
    code: [
      {
        lang: 'python', run: true, title: 'Percentile estimator from histogram buckets (runnable)', code: `# Estimate percentiles from cumulative histogram buckets, like PromQL histogram_quantile().
# bounds are upper edges in ms; the last bucket is +Inf (anything slower).
bounds = [50, 100, 250, 500, 1000, 2500]
counts = [800, 150, 40, 6, 3, 1]          # per-bucket counts (NOT cumulative)
overflow = 0                              # requests slower than the last bound

def quantile(q, bounds, counts, overflow):
    total = sum(counts) + overflow
    target = q * total                    # we want the value at this rank
    running = 0
    lower = 0.0
    for upper, c in zip(bounds, counts):
        if running + c >= target:
            # the target falls inside this bucket: interpolate linearly
            frac = (target - running) / c if c else 0
            return lower + (upper - lower) * frac
        running += c
        lower = upper
    return float(bounds[-1])              # in the +Inf bucket: best we can say is "at least last bound"

def mean_estimate(bounds, counts):
    # approximate mean using bucket midpoints
    total, s, lower = 0, 0.0, 0.0
    for upper, c in zip(bounds, counts):
        s += c * (lower + upper) / 2.0
        total += c
        lower = upper
    return s / total

print("requests:", sum(counts) + overflow)
print("mean  ~ %.1f ms" % mean_estimate(bounds, counts))
for q in (0.50, 0.95, 0.99, 0.999):
    print("p%-5s ~ %.1f ms" % (q * 100, quantile(q, bounds, counts, overflow)))

# Merging two servers: ADD the bucket counts, then ask for the percentile.
server_b = [700, 200, 60, 20, 15, 5]
merged = [a + b for a, b in zip(counts, server_b)]
print("merged p99 ~ %.1f ms" % quantile(0.99, bounds, merged, 0))`
      },
      {
        lang: 'yaml', check: false, title: 'Recording a latency histogram (OpenTelemetry-style, shape only)', code: `# check:false - library/collector config shape, not a runnable program.
# Instrument definition: a histogram with explicit buckets near the SLO (seconds).
instrument:
  name: http.server.request.duration
  unit: s
  type: histogram
  explicit_bucket_boundaries: [0.05, 0.1, 0.25, 0.3, 0.5, 1, 2.5, 5]
  attributes: [http.route, http.request.method, http.response.status_code]
# Query: p99 per route over 5 minutes, summed across all pods first
#   histogram_quantile(0.99, sum by (le, http_route) (rate(http_server_request_duration_seconds_bucket[5m])))`
      }
    ],
    viz: [
      {
        title: 'Histogram buckets and percentiles',
        input: '800 150 40 6 3 1',
        inputLabel: 'Counts in buckets ≤50, ≤100, ≤250, ≤500, ≤1000, ≤2500 ms',
        gen: function (input) {
          var c = nums(input, 6, 6, 'Enter 6 non-negative counts, e.g. 800 150 40 6 3 1').map(function (x) { return Math.max(0, Math.round(x)); });
          var bounds = [50, 100, 250, 500, 1000, 2500], labs = ['≤50', '≤100', '≤250', '≤500', '≤1000', '≤2500'];
          var total = c.reduce(function (a, b) { return a + b; }, 0);
          if (total < 1) throw new Error('Need at least one request');
          function q(p) {
            var t = p * total, run = 0, lo = 0;
            for (var i = 0; i < 6; i++) {
              if (c[i] && run + c[i] >= t) return { v: Math.round(lo + (bounds[i] - lo) * (t - run) / c[i]), i: i };
              run += c[i]; lo = bounds[i];
            }
            return { v: 2500, i: 5 };
          }
          var mean = 0, lo2 = 0;
          for (var i = 0; i < 6; i++) { mean += c[i] * (lo2 + bounds[i]) / 2; lo2 = bounds[i]; }
          mean = Math.round(mean / total);
          var p50 = q(0.5), p95 = q(0.95), p99 = q(0.99);
          var f = [];
          f.push({ narr: 'Each bar counts the requests that landed in a latency bucket. Total: <b>' + total + '</b> requests. Most are fast; the right side is the "tail".', parts: [{ type: 'bars', label: 'Requests per bucket (ms)', values: c, idxLabels: labs, hl: { 0: 'ok' } }] });
          var hl50 = {}; hl50[p50.i] = 'sel';
          f.push({ narr: 'Find the bucket that holds the middle request (rank ' + Math.round(total * 0.5) + '). That is the <b>p50</b>, about <b>' + p50.v + ' ms</b>.', parts: [{ type: 'bars', label: 'p50 bucket', values: c, idxLabels: labs, hl: hl50 }, { type: 'vars', vals: { p50_ms: p50.v } }] });
          var hl95 = {}; hl95[p95.i] = 'cur';
          f.push({ narr: 'The request at rank ' + Math.round(total * 0.95) + ' gives the <b>p95</b>, about <b>' + p95.v + ' ms</b>. 5% of users waited longer.', parts: [{ type: 'bars', label: 'p95 bucket', values: c, idxLabels: labs, hl: hl95 }, { type: 'vars', vals: { p50_ms: p50.v, p95_ms: p95.v } }] });
          var hl99 = {}; hl99[p99.i] = 'bad';
          f.push({ narr: 'The <b>p99</b> is about <b>' + p99.v + ' ms</b>. This is the tail: rare but real users. At 1000 requests per minute that is 10 unhappy users every minute.', parts: [{ type: 'bars', label: 'p99 bucket', values: c, idxLabels: labs, hl: hl99 }, { type: 'vars', vals: { p50_ms: p50.v, p95_ms: p95.v, p99_ms: p99.v }, hl: { p99_ms: 'bad' } }] });
          f.push({ narr: 'Compare with the <b>mean</b> of about <b>' + mean + ' ms</b>. It sits between the typical and the tail, so it describes no real user. That is why dashboards show percentiles.', parts: [{ type: 'bars', label: 'mean vs percentiles (ms)', values: [mean, p50.v, p95.v, p99.v], idxLabels: ['mean', 'p50', 'p95', 'p99'], hl: { 0: 'cur', 1: 'ok', 2: 'win', 3: 'bad' } }] });
          return f;
        }
      },
      {
        title: 'Why you cannot average percentiles',
        input: '100 900',
        inputLabel: 'p99 of server A and server B (ms)',
        gen: function (input) {
          var a = nums(input, 2, 2, 'Enter two numbers, e.g. 100 900');
          var avg = (a[0] + a[1]) / 2;
          return [
            { narr: 'Two servers report their own p99. Server A: <b>' + a[0] + ' ms</b>, server B: <b>' + a[1] + ' ms</b>.', parts: [{ type: 'bars', label: 'p99 per server (ms)', values: a, idxLabels: ['A', 'B'], hl: { 0: 'ok', 1: 'bad' } }] },
            { narr: 'A tempting shortcut: average them to <b>' + avg + ' ms</b> and call it the fleet p99. This is wrong.', parts: [{ type: 'bars', label: 'average of p99s (WRONG)', values: [a[0], a[1], avg], idxLabels: ['A', 'B', 'avg'], hl: { 2: 'bad' } }] },
            { narr: 'Why wrong? If B serves only 1% of traffic, the real fleet p99 is close to A. If B serves half, the real p99 is close to B. The average ignores traffic weight and the shape of each distribution.', parts: [{ type: 'table', label: 'Real fleet p99 depends on traffic', columns: ['B share of traffic', 'real p99 is near'], rows: [['1%', 'A (' + a[0] + ' ms)'], ['50%', 'B (' + a[1] + ' ms)'], ['10%', 'in between, only bucket counts can tell']], hl: { 2: 'sel' } }] },
            { narr: 'Correct way: <b>add the bucket counts</b> of all servers, then compute the percentile once. Histograms merge; percentiles do not.', parts: [{ type: 'table', label: 'Merging', columns: ['bucket', 'A', 'B', 'merged'], rows: [['≤100', '900', '300', '1200'], ['≤500', '90', '500', '590'], ['≤1000', '10', '200', '210']], hl: { 0: 'ok', 1: 'ok', 2: 'ok' } }] }
          ];
        }
      }
    ],
    examples: [
      { title: 'Tail latency in fan-out: why p99 matters more than you think', html: `<p>A page calls 20 services in parallel and waits for all. If each service is slow (above its p99) 1% of the time, the chance that <em>at least one</em> is slow is 1 - 0.99<sup>20</sup> &asymp; <b>18%</b>. So the page's typical experience is the services' tail. This is the "tail at scale" effect: with fan-out, optimise the tails.</p>` },
      { title: 'Choose bucket edges around the SLO', html: `<p>SLO: "99% of requests under 300 ms". Buckets <code>0.1, 0.5, 1</code> cannot tell you if you meet it; you only know "&le;0.1" or "&le;0.5". Add <code>0.25, 0.3, 0.4</code>. Rule: <b>put an edge exactly at the threshold you alert on</b>, and a few on each side. Then "good requests" is just the count in the le=0.3 bucket divided by total, exact, no estimate.</p>` },
      { title: 'Coordinated omission: the lie in load tests', html: `<p>A test tool sends one request, waits, sends the next. If the server freezes for 10 seconds, the tool records <em>one</em> slow request, not the hundreds that should have been sent during the freeze. Percentiles look great while the real system was broken. Use tools that send on a fixed schedule and measure from the intended send time (open-loop), for example wrk2 or k6 with arrival-rate executors.</p>` }
    ],
    deepDive: `<p><b>Estimate quality.</b> Inside a bucket we assume requests are evenly spread, so the error is at most the bucket width. Wide buckets at the top (1s to 10s) mean a p99 of "about 5.5 s" when the truth might be 1.1 s. If precision matters, use more buckets or <b>native/exponential histograms</b> (OpenTelemetry exponential histogram, Prometheus native histograms), which pick bucket boundaries on a log scale automatically with a bounded relative error (for example 1-5%), so you do not have to guess edges. Other sketches: HDRHistogram, DDSketch, t-digest; all are mergeable.</p>
      <p><b>Why not the max?</b> The maximum is one unlucky outlier, noisy and not stable for alerting; but do track it for debugging, and exemplars (a trace id attached to a bucket sample) let you jump from a slow bucket straight to a real slow trace. <b>Summary vs histogram:</b> client-side summaries compute percentiles in the process and cannot be aggregated across instances; server-side histograms can. Prefer histograms.</p>
      <p><b>Measure the right clock.</b> Latency seen by the client includes network, queueing in the load balancer, and your code. Server-side timers miss time spent waiting in the accept queue. Measure at the edge too. Latency has a floor (network), a body (normal work) and a tail (GC pauses, cache misses, lock contention, noisy neighbours, retries, cold starts), and each tail source has a different fix. Look at the <b>distribution shape</b>: two humps usually mean two code paths (cache hit and miss).</p>`,
    aiEra: `<p><b>What AI changes:</b> LLM calls make latency distributions wide and heavy-tailed: the same prompt can take 800 ms or 20 s depending on output length and queueing. So for AI features track <b>time to first token</b> and <b>total time</b> separately, per model and per prompt size bucket, and set SLOs on percentiles, not means. Streaming responses change what the user feels: first token matters most.</p>
      <p><b>Use AI as a partner:</b> ask <code>Here are my bucket counts; estimate p50/p95/p99 and say how wrong the estimate could be</code>, or have it review whether your bucket edges bracket the SLO. <b>Where AI goes wrong:</b> it averages p95 values across hosts, or reports "average latency improved 20%" when the tail got worse. Insist on the question: "of which requests, and which percentile?" <b>What you must still own:</b> choosing the percentile that matches user pain, placing bucket edges at SLO thresholds, and refusing averages as a health signal.</p>`,
    problems: [
      prob({
        title: 'Estimate p95 from histogram buckets', level: 'Medium', tags: ['histogram', 'percentile', 'latency'], companies: ['Datadog', 'Cloudflare'],
        statement: `<p>A service reports cumulative buckets over the last 5 minutes: le=100ms: 600, le=250ms: 900, le=500ms: 980, le=1000ms: 1000 (total 1000). Estimate p95 and say whether the SLO "95% under 300 ms" is met.</p>`,
        example: `<p>p95 means rank 950. ${H.table(['bucket', 'cumulative', 'contains rank 950?'], [['&le;100', '600', 'no'], ['&le;250', '900', 'no'], ['&le;500', '980', '<span class="c-g">yes</span>']])}</p><p>Interpolate between 250 and 500: (950-900)/(980-900) = 0.625, so 250 + 0.625 &times; 250 = <b>about 406 ms</b>. SLO <span class="c-r">not met</span> (406 &gt; 300).</p>`,
        brute: `<p>Store every request latency, sort, and read index 950. Exact, but needs memory and shipping for every request, cannot be merged across pods, and does not scale to millions per minute.</p>`,
        mcq: { q: 'Buckets are cumulative. Rank 950 sits between 900 and 980. Which bucket interpolates the answer?', options: ['le=250', 'le=500 (between 250 and 500)', 'le=1000'], answer: 1, explain: 'The first bucket whose cumulative count reaches 950 is le=500; the value lies between the previous edge 250 and 500.' },
        hints: [`<p>Hint 1: target rank = 0.95 &times; total.</p>`, `<p>Hint 2: find the first bucket whose cumulative count is at least the rank.</p>`, `<p>Hint 3: linear interpolate: lower + (upper-lower) &times; (rank - cumBefore) / (cumHere - cumBefore).</p>`],
        approach: `<p>Total is 1000, so p95 is the request at rank 950. Walk the cumulative counts: 600 (&le;100), 900 (&le;250) are below 950; 980 (&le;500) is the first at or above it, so the p95 lies between 250 and 500. Assume requests are spread evenly inside the bucket: (950 - 900) / (980 - 900) = 0.625, so p95 &asymp; 250 + 0.625 &times; 250 = 406 ms. The SLO needs 95% of requests under 300 ms; at 300 ms we are only past the 900 mark (about 90-92%), so the SLO is violated. Note the estimate is rough because the bucket is wide; add an edge at 300 ms to answer exactly. Merge across pods by summing bucket counts first.</p>`
      }),
      prob({
        title: 'Explain why the average hides the problem', level: 'Easy', tags: ['latency', 'average'],
        statement: `<p>Your dashboard shows average latency of 180 ms, "looks fine", but support gets complaints about 10-second page loads. Explain what is going on and what to chart instead.</p>`,
        example: `<p>${H.table(['Share of requests', 'Latency'], [['98%', '100 ms'], ['2%', '4,000 ms'], ['<b>Average</b>', '<b>178 ms</b>']])}</p><p>${H.c('r', '2% of users wait 4 seconds while the average says 178 ms.')}</p>`,
        brute: `<p>Keep staring at the average, or only look at the single slowest request. The average hides the tail and the max is a noisy outlier.</p>`,
        mcq: { q: 'What should you chart for latency?', options: ['The mean only', 'p50, p95, p99 from a histogram', 'The sum of all latencies'], answer: 1, explain: 'Percentiles show typical and tail experience; histograms allow merging across instances.' },
        hints: [`<p>Hint 1: does anyone experience exactly the average?</p>`, `<p>Hint 2: show p50 and p99 next to each other.</p>`, `<p>Hint 3: break down by route and look at the slow requests with traces.</p>`],
        approach: `<p>The mean mixes 98 fast requests with 2 very slow ones into a number that no user actually experiences, so it can look healthy while 2 in 100 users wait seconds. Switch the dashboard to a latency histogram and plot p50 (typical), p95 and p99 (tail) per route, with the SLO line. Then use exemplars or traces to open some of the slow requests and find the cause (a cache miss path, a slow dependency, GC pauses, a heavy query for big customers). Alert on the percentile that matches user pain, for example p99 above 1 s for 10 minutes, not on the mean. Keep counts too: 2% of 1,000 requests per minute is 20 unhappy users every minute.</p>`
      })
    ]
  });

  /* ================================================================
     TOPIC 4 - Distributed tracing with OpenTelemetry
     ================================================================ */
  topics.push({
    title: 'Distributed Tracing with OpenTelemetry',
    analogy: `<p>A relay race: the baton goes from runner to runner. If the team is slow, a stopwatch on the finish line says "too slow" but not <b>who</b>. A <b>trace</b> puts a small stopwatch on every runner, and a shared race number on every baton hand-off. Afterwards you lay the timings in a row and see: runner 3 stood still for 4 seconds. Each runner's timing is a <b>span</b>; the race number is the <b>trace id</b>.</p>`,
    explain: `<p>A <b>trace</b> is the full journey of one request through many services. It is made of <b>spans</b>: one span is one piece of work (an HTTP handler, a SQL query, a cache call) with a name, start time, duration, status and key-value <b>attributes</b>. Spans form a tree through <b>parent span ids</b>.</p>
      ${H.table(['Piece', 'Plain meaning', 'Example'], [
        ['trace id', 'one id for the whole journey (16 bytes, hex)', '4bf92f3577b34da6a3ce929d0e0e4736'],
        ['span id', 'id of one step (8 bytes)', '00f067aa0ba902b7'],
        ['parent span id', 'which step started this step', 'the HTTP handler started the SQL call'],
        ['attributes', 'details on the span', 'http.route=/orders, db.system=postgresql'],
        ['events', 'timestamped notes inside a span', 'cache miss, retry 2'],
        ['status', 'OK / ERROR', 'ERROR on timeout']
      ])}
      <p><b>Context propagation</b> is how the trace id travels: when service A calls service B, A puts a <code>traceparent</code> header (<code>00-traceId-spanId-01</code>) on the request. B reads it, and its new spans become children of A's span. Inside one process, a "context" object carries the current span so child code finds its parent automatically. Without propagation you get broken traces, one tiny trace per service.</p>
      <p><b>OpenTelemetry (OTel)</b> is the open standard (APIs, SDKs, a wire protocol OTLP, and the <b>Collector</b>) for traces, metrics and logs. You instrument your code once and send data to any backend (Jaeger, Tempo, Datadog, ...). Many libraries are auto-instrumented (HTTP, JDBC, Kafka), you add manual spans for business steps. Reading a trace: look at the waterfall, find the <b>longest span that has no slow children</b> (its own "self time" is the problem) or a gap where nothing runs (waiting).</p>`,
    clues: ['"request is slow but I do not know which service" - distributed tracing', '"traces are broken / each service shows separate traces" - context propagation missing', '"traceparent header" or "W3C trace context"', '"too much trace data / cost" - sampling (head vs tail)', '"find the slowest span / critical path"', '"vendor lock-in for observability" - OpenTelemetry + Collector', '"link logs to traces" - put trace_id and span_id in log lines']
    ,
    code: [
      {
        lang: 'js', run: true, title: 'Span tree builder with critical path (runnable)', code: `// Build a tree from a flat list of spans and print the critical path.
// Each span: id, parent, name, start, end (in ms from request start).
var spans = [
  { id: 'a', parent: null, name: 'GET /checkout', start: 0, end: 1000 },
  { id: 'b', parent: 'a', name: 'auth-service', start: 5, end: 45 },
  { id: 'c', parent: 'a', name: 'orders.create', start: 50, end: 960 },
  { id: 'd', parent: 'c', name: 'SELECT inventory', start: 60, end: 100 },
  { id: 'e', parent: 'c', name: 'payments.charge', start: 105, end: 900 },
  { id: 'f', parent: 'e', name: 'bank-api call', start: 120, end: 880 },
  { id: 'g', parent: 'c', name: 'INSERT order', start: 905, end: 950 }
];

function buildTree(list) {
  var byId = {};
  list.forEach(function (s) { byId[s.id] = { span: s, children: [] }; });
  var root = null;
  list.forEach(function (s) {
    if (s.parent === null) root = byId[s.id];
    else byId[s.parent].children.push(byId[s.id]);   // attach to the parent
  });
  return root;
}

// Self time = span duration minus the time covered by its children.
function selfTime(node) {
  var covered = 0;
  node.children.forEach(function (c) { covered += c.span.end - c.span.start; });
  return Math.max(0, (node.span.end - node.span.start) - covered);
}

function print(node, depth) {
  var s = node.span;
  console.log('  '.repeat(depth) + s.name + '  [' + s.start + '-' + s.end + '] dur=' + (s.end - s.start) + ' self=' + selfTime(node));
  node.children.sort(function (x, y) { return x.span.start - y.span.start; });
  node.children.forEach(function (c) { print(c, depth + 1); });
}

// Critical path: walk backwards from the end; the child that finishes last
// blocks the parent, so follow it down.
function criticalPath(node, out) {
  out.push(node);
  var last = null;
  node.children.forEach(function (c) { if (!last || c.span.end > last.span.end) last = c; });
  if (last) criticalPath(last, out);
  return out;
}

var root = buildTree(spans);
print(root, 0);
var path = criticalPath(root, []);
console.log('Critical path: ' + path.map(function (n) { return n.span.name; }).join(' -> '));
var slow = path.slice().sort(function (a, b) { return selfTime(b) - selfTime(a); })[0];
console.log('Biggest self time on the path: ' + slow.span.name + ' (' + selfTime(slow) + ' ms)');`
      },
      {
        lang: 'js', check: false, title: 'OpenTelemetry in Node: manual span + propagation (shape only)', code: `// check:false - needs @opentelemetry/api and an SDK configured at startup.
const { trace, context, propagation, SpanStatusCode } = require('@opentelemetry/api');
const tracer = trace.getTracer('orders-service');

async function createOrder(req) {
  // startActiveSpan makes this span the "current" one for everything inside.
  return tracer.startActiveSpan('orders.create', async (span) => {
    try {
      span.setAttribute('order.items', req.items.length);     // low-risk attribute
      // Propagate: inject traceparent into outgoing headers
      const headers = {};
      propagation.inject(context.active(), headers);
      const res = await fetch(process.env.PAYMENTS_URL + '/charge', { method: 'POST', headers });
      span.addEvent('payment.responded', { status: res.status });
      return res.json();
    } catch (err) {
      span.recordException(err);
      span.setStatus({ code: SpanStatusCode.ERROR });
      throw err;
    } finally {
      span.end();                                              // ALWAYS end the span
    }
  });
}`
      },
      {
        lang: 'yaml', check: false, title: 'OTel Collector config: receive, sample, export (shape only)', code: `# check:false - OpenTelemetry Collector configuration.
receivers:
  otlp:
    protocols: { grpc: {}, http: {} }
processors:
  batch: {}
  tail_sampling:
    decision_wait: 10s
    policies:
      - { name: keep-errors, type: status_code, status_code: { status_codes: [ERROR] } }
      - { name: keep-slow, type: latency, latency: { threshold_ms: 1000 } }
      - { name: sample-rest, type: probabilistic, probabilistic: { sampling_percentage: 5 } }
exporters:
  otlp/tracing-backend:
    endpoint: tempo:4317            # your trace backend; credentials via env, never inline
service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [tail_sampling, batch]
      exporters: [otlp/tracing-backend]`
      }
    ],
    viz: [
      {
        title: 'Trace waterfall: find the slow span',
        input: '760',
        inputLabel: 'Duration of the bank-api call (ms)',
        gen: function (input) {
          var bank = Math.round(num(input, 760, 20, 2000));
          // fixed layout: auth 40, inventory 40, bank variable, insert 45
          var s = [
            { n: 'GET /checkout', d: 0, l: 0 },
          ];
          var auth = [5, 40], inv = [60, 40], bankStart = 120, bankEnd = bankStart + bank, ins = [bankEnd + 25, 45];
          var total = ins[0] + ins[1] + 10;
          var rows = [
            ['GET /checkout (gateway)', 0, total, 0],
            ['  auth-service', auth[0], auth[0] + auth[1], 1],
            ['  SELECT inventory', inv[0], inv[0] + inv[1], 2],
            ['  bank-api call', bankStart, bankEnd, 3],
            ['  INSERT order', ins[0], ins[0] + ins[1], 4]
          ];
          function tbl(hlIdx, label) {
            var hl = {}; if (hlIdx !== null) hl[hlIdx] = 'bad';
            return { type: 'table', label: label, columns: ['span', 'start', 'end', 'duration ms', '% of trace'], rows: rows.map(function (r) { var d = r[2] - r[1]; return [r[0], r[1], r[2], d, Math.round(d / total * 100) + '%']; }), hl: hl };
          }
          var durs = rows.map(function (r) { return r[2] - r[1]; });
          var f = [];
          f.push({ narr: 'A user says checkout is slow. We open its trace. Total time: <b>' + total + ' ms</b>. Each row is a span: one unit of work with a start, an end, and a parent.', parts: [tbl(null, 'Trace ' + 'a3ce92')] });
          f.push({ narr: 'Look at the <b>bar lengths</b> (durations). The root is always longest because it contains everything. We ignore it and compare the children.', parts: [{ type: 'bars', label: 'Span durations (ms)', values: durs, idxLabels: ['root', 'auth', 'inventory', 'bank', 'insert'], hl: { 0: 'done' } }] });
          var bi = 3;
          f.push({ narr: 'The <b>bank-api call</b> takes ' + bank + ' ms, ' + Math.round(bank / total * 100) + '% of the whole trace. It has no slower child, so the time is truly spent <em>there</em> (waiting for the bank). Marked red.', parts: [tbl(bi, 'Slow span found'), { type: 'bars', label: 'Span durations (ms)', values: durs, idxLabels: ['root', 'auth', 'inventory', 'bank', 'insert'], hl: { 0: 'done', 3: 'bad' } }] });
          f.push({ narr: 'Critical path = the chain of spans that decided the total time: <b>checkout &rarr; bank-api call &rarr; insert</b>. Speeding up auth (40 ms) would change almost nothing, because it is not blocking the end.', parts: [{ type: 'text', html: '<b>Critical path:</b> GET /checkout &rarr; bank-api call (' + bank + ' ms) &rarr; INSERT order (45 ms)<br>Not on the path: auth-service and the inventory query.' }, tbl(bi, 'Where to work')] });
          f.push({ narr: 'Action: open the span attributes (bank endpoint, retry count, status), check the bank dashboard, add a timeout and maybe a circuit breaker. The trace told us <b>where</b>; metrics and logs tell us <b>how often</b> and <b>why</b>.', parts: [{ type: 'vars', vals: { slow_span: 'bank-api call', share_of_trace: Math.round(bank / total * 100) + '%', next_step: 'timeout + circuit breaker' }, hl: { slow_span: 'bad' } }] });
          return f;
        }
      },
      {
        title: 'Context propagation across services (traceparent)',
        input: '4bf92f35',
        inputLabel: 'Trace id (short form)',
        gen: function (input) {
          var t = String(input).trim().replace(/[^0-9a-fA-F]/g, '').slice(0, 8) || '4bf92f35';
          var nodes = [bx('C', 'Client', 8, 30, 14), bx('A', 'API Gateway', 32, 30, 20), bx('B', 'Orders', 60, 12, 16), bx('D', 'Payments', 86, 12, 18), bx('E', 'Cache', 60, 48, 14), bx('X', 'Collector', 86, 48, 18)];
          var edges = [['C', 'A'], ['A', 'B'], ['B', 'D'], ['B', 'E'], ['D', 'X']];
          function g(ehl, tags, hl) { return { type: 'graph', directed: true, height: 60, label: 'Services', nodes: cp(nodes), edges: cp(edges), ehl: ehl, tags: tags, hl: hl || {} }; }
          return [
            { narr: 'Client calls the gateway. The gateway starts the <b>root span</b> and creates trace id <code>' + t + '...</code>.', parts: [g({ 'C-A': 'cur' }, { A: 'root span' }, { A: 'ok' })] },
            { narr: 'Gateway calls Orders and injects a header: <code>traceparent: 00-' + t + '...-spanA-01</code>. The span id is the "parent" Orders must remember.', parts: [g({ 'C-A': 'ok', 'A-B': 'cur' }, { A: 'span A', B: 'child of A' }, { B: 'cur' }), { type: 'text', html: '<code>traceparent: 00-' + t + '...-a1-01</code>' }] },
            { narr: 'Orders extracts the header, starts its span as a <b>child</b> of A, then calls Payments and Cache. Both calls get the same trace id with Orders\' span as parent.', parts: [g({ 'C-A': 'ok', 'A-B': 'ok', 'B-D': 'cur', 'B-E': 'cur' }, { B: 'span B', D: 'child of B', E: 'child of B' }, { D: 'cur', E: 'cur' })] },
            { narr: 'Each service finishes its spans and sends them (OTLP) to the Collector, which batches, samples and forwards to the backend.', parts: [g({ 'C-A': 'ok', 'A-B': 'ok', 'B-D': 'ok', 'B-E': 'ok', 'D-X': 'cur' }, { X: 'assembles trace' }, { X: 'sel' })] },
            { narr: 'If any hop <b>forgets to forward</b> the header (for example a queue message or a custom HTTP client), the trace splits in two. That is the most common tracing bug: check propagation first.', parts: [{ type: 'table', label: 'Broken vs healthy', columns: ['hop', 'forwards traceparent?', 'result'], rows: [['Gateway to Orders', 'yes', 'one trace'], ['Orders to Payments', 'yes', 'one trace'], ['Orders to Queue to Worker', '<span class="c-r">no</span>', 'new trace, link lost']], hl: { 2: 'bad' } }] }
          ];
        }
      },
      {
        title: 'Sampling: which traces do we keep?',
        input: '1000',
        inputLabel: 'Requests per minute',
        gen: function (input) {
          var n = Math.round(num(input, 1000, 100, 100000));
          var err = Math.max(1, Math.round(n * 0.01)), slow = Math.max(1, Math.round(n * 0.02));
          var head = Math.round(n * 0.05);
          return [
            { narr: n + ' requests per minute. Storing every trace is expensive, so we <b>sample</b>: keep some, drop most.', parts: [{ type: 'bars', label: 'Requests', values: [n], texts: [n + ''], hl: { 0: 'win' } }] },
            { narr: '<b>Head sampling</b> decides at the start: keep 5% at random. Cheap and simple, but it keeps ' + head + ' traces blind to whether they were interesting. About ' + Math.round(err * 0.05) + ' of the ' + err + ' error traces survive.', parts: [{ type: 'bars', label: 'Head sampling 5%', values: [n, head, Math.round(err * 0.05)], idxLabels: ['all', 'kept', 'error traces kept'], hl: { 1: 'ok', 2: 'bad' } }] },
            { narr: '<b>Tail sampling</b> decides after the trace finished: keep every error, every slow one, and 5% of the rest. You keep the interesting ones. Cost: the Collector must hold spans in memory until the trace completes.', parts: [{ type: 'bars', label: 'Tail sampling', values: [n, err + slow + Math.round(n * 0.05), err, slow], idxLabels: ['all', 'kept', 'errors (100%)', 'slow (100%)'], hl: { 1: 'ok', 2: 'bad', 3: 'cur' } }] },
            { narr: 'Table of trade-offs.', parts: [{ type: 'table', label: 'Head vs tail', columns: ['', 'Head', 'Tail'], rows: [['Decision time', 'request start', 'after trace ends'], ['Keeps all errors?', '<span class="c-r">no</span>', '<span class="c-g">yes</span>'], ['Cost / complexity', 'low', 'higher (memory, routing by trace id)'], ['Consistent across services?', 'yes, via flag in traceparent', 'needs one collector per trace']], hl: { 1: 'sel' } }] }
          ];
        }
      }
    ],
    examples: [
      { title: 'Link logs and traces', html: `<p>Add <code>trace_id</code> and <code>span_id</code> to every log line (OTel log appenders and MDC integrations do this). In your tracing tool click a slow span and jump to the logs of that exact span; from an error log, click the trace id to see the whole request. This is the single most useful integration between signals.</p>` },
      { title: 'What attributes belong on a span', html: `<p>Good: <code>http.route</code> (template), <code>http.response.status_code</code>, <code>db.system</code>, <code>db.operation</code>, <code>messaging.destination</code>, <code>order.item_count</code>, <code>feature_flag.variant</code>. Careful: <code>db.statement</code> may hold personal data, scrub or parameterise it. Never put passwords, tokens or full card numbers in attributes.</p>` },
      { title: 'Spotting common slow-trace shapes', html: `<p>${H.table(['Shape in the waterfall', 'Likely cause'], [['Many short identical DB spans in a row (staircase)', 'N+1 query'], ['One very long leaf span', 'slow dependency or query'], ['Big gap with no child spans', 'waiting: thread pool, lock, queue, or uninstrumented code'], ['Same call repeated 3 times', 'retries'], ['Parallel spans, root waits for the slowest', 'fan-out tail latency']])}</p>` },
      { title: 'Propagate across a message queue', html: `<p>HTTP has headers, a queue has message attributes. Producer injects <code>traceparent</code> into message headers; the consumer extracts and starts a new span that either continues the trace (child) or, for batch consumers, <b>links</b> to many producer spans (a span link). Without this the trace stops at the queue.</p>` }
    ],
    deepDive: `<p><b>Internals.</b> A span has trace id, span id, parent id, name, kind (SERVER, CLIENT, PRODUCER, CONSUMER, INTERNAL), start/end time, attributes, events, links, status. The SDK batches finished spans and exports over OTLP to a Collector (agent per host or gateway pool). <b>Baggage</b> is key-value data that travels with the context to all downstream services (for example <code>tenant=acme</code>); powerful but it is sent on every call and can leak data to third parties, so keep it small and never put secrets in it.</p>
      <p><b>Sampling in depth.</b> The sampled flag is the last byte of traceparent. A parent-based sampler lets every service follow the root's decision so traces are complete. Probabilistic samplers use the trace id so all services decide the same way. Tail sampling needs all spans of one trace to reach the same collector: route by trace id (a load-balancing exporter). Keep 100% of errors and slow traces plus a small baseline; also consider rate-limited sampling per route so a loud endpoint does not use the whole budget. Derive metrics from <b>all</b> spans before sampling (span metrics connector) so RED numbers stay exact.</p>
      <p><b>Overhead and safety.</b> Instrumentation adds a few microseconds per span and memory for buffers; use bounded queues and drop spans rather than block requests. Clock skew between hosts can make a child look like it starts before its parent; read durations, not absolute positions. Always end spans (use try/finally), otherwise memory leaks and traces never complete. Auto-instrumentation gives breadth (HTTP, DB, queues); add manual spans only around business operations worth seeing. Cardinality is not a problem for span attributes the way it is for metric labels, but cost still is.</p>`,
    aiEra: `<p><b>What AI changes:</b> An AI agent run is a trace: the user question is the root span, each model call, tool call, retrieval and sub-agent step is a child span with attributes like model name, token counts, prompt version and cost. OpenTelemetry has semantic conventions for generative AI so you can see "which tool call took 12 seconds" or "which step looped 9 times". Tracing is how you debug non-deterministic systems, by looking at what actually happened.</p>
      <p><b>Use AI as a partner:</b> paste an exported trace (with secrets and personal data removed) and ask <code>Which span is on the critical path and what are three likely causes?</code>; ask it to draft instrumentation for a function, then review. <b>Where AI goes wrong:</b> it forgets to end spans, forgets to propagate context into async work or thread pools, and records prompts or user text as span attributes (privacy risk). It may also confuse a long parent span with the problem when the real cost is a child. <b>What you must still own:</b> the sampling policy and its cost, the privacy rules for attributes, and the habit of reading self time versus total time.</p>`,
    problems: [
      prob({
        title: 'Read a trace to find the slow span', level: 'Medium', tags: ['tracing', 'critical path'], companies: ['Uber', 'Lyft'],
        statement: `<p>A trace has these spans (ms from start): <code>GET /feed 0-1200</code>; <code>auth 5-35</code>; <code>load-posts 40-1150</code>; <code>SELECT posts 45-95</code>; <code>enrich (x30 calls to profile-service) 100-1100</code>. Where is the problem and what is the fix?</p>`,
        example: `<p>${H.table(['span', 'start-end', 'duration'], [['GET /feed', '0-1200', '1200'], ['load-posts', '40-1150', '1110'], ['SELECT posts', '45-95', '50'], ['<span class="c-r">enrich (30 sequential calls)</span>', '100-1100', '<span class="c-r">1000</span>']])}</p><p>The time is in <code>enrich</code>, which makes 30 sequential calls: an N+1 over the network.</p>`,
        brute: `<p>Guess and optimise the database query because "it is probably the database". The SELECT takes only 50 ms of 1200, so a 10x faster query saves almost nothing.</p>`,
        mcq: { q: 'The root span is longest. Is the root the problem?', options: ['Yes, optimise the root', 'No, it contains its children; look at the children and self time', 'Only if it has errors'], answer: 1, explain: 'Parents include child time. Find the span whose own (self) time is large, or the largest leaf on the critical path.' },
        hints: [`<p>Hint 1: parents contain their children, so compare leaves.</p>`, `<p>Hint 2: compute self time = duration minus time covered by children.</p>`, `<p>Hint 3: a staircase of many similar calls means sequential or N+1 work: batch or parallelise.</p>`],
        approach: `<p>Build the tree: feed &rarr; auth, load-posts; load-posts &rarr; SELECT, enrich. The SELECT is 50 ms and auth 30 ms, both small. enrich takes 1000 ms and consists of 30 calls to profile-service made one after another (about 33 ms each): that is an N+1 pattern across the network, and it is on the critical path (it ends at 1100, just before load-posts ends). Fix: use a batch endpoint (<code>GET /profiles?ids=...</code>), or make the calls in parallel with a concurrency limit, or cache profiles. Expected result: one call of 40-60 ms, so the feed drops from 1200 ms to about 250 ms. Verify with a new trace and watch p95 on the dashboard; add a metric or alert for calls-per-request to catch regressions.</p>`
      }),
      prob({
        title: 'Fix a broken trace at a queue boundary', level: 'Medium', tags: ['tracing', 'propagation', 'queue'],
        statement: `<p>Your traces end at the "publish OrderCreated" span; the worker's spans appear as separate traces. Fix it and say how to choose between child and link.</p>`,
        example: `<p>${H.table(['span', 'trace id'], [['POST /orders', 'AAA'], ['publish OrderCreated', 'AAA'], ['<span class="c-r">worker: send-email</span>', '<span class="c-r">BBB (new)</span>']])}</p>`,
        brute: `<p>Match traces by timestamp and order id by hand in two tools. Slow, error prone and impossible to automate.</p>`,
        mcq: { q: 'Where should the producer put the trace context for a message?', options: ['Only in the message body text', 'In message headers/attributes using the propagator', 'Nowhere, the broker does it'], answer: 1, explain: 'Brokers do not add trace context. Inject into headers and extract in the consumer.' },
        hints: [`<p>Hint 1: no HTTP, so no automatic header.</p>`, `<p>Hint 2: inject at publish, extract at consume.</p>`, `<p>Hint 3: one message per span: use a child span; a batch of many messages: use span links.</p>`],
        approach: `<p>The broker does not carry trace context. At the producer, inject the current context into the message headers with the OpenTelemetry propagator (this writes <code>traceparent</code>). At the consumer, extract the headers into a context and start the processing span with that context as parent, so the worker's spans join trace AAA. If the consumer handles a batch of messages, create one processing span and add a <b>span link</b> to each producer span instead of making them all parents. Mark the producer span kind PRODUCER and the consumer span kind CONSUMER, add messaging attributes (system, destination, message id). Many messaging instrumentations do this automatically; verify with a test that checks the worker logs carry the same trace id. For retries and dead-letter queues, keep the original context in the headers.</p>`
      })
    ]
  });

  /* ================================================================
     TOPIC 5 - Alerting on symptoms and SLO burn rates
     ================================================================ */
  topics.push({
    title: 'Alerting: Symptoms, SLOs and Burn Rates',
    analogy: `<p>A smoke alarm rings when there is <b>smoke</b> (a symptom you care about), not when the kitchen temperature rises by 2 degrees (a possible cause). If it rang for every toast, you would take out the battery, and then it would not ring for a real fire. A good alert is a smoke alarm: rare, meaningful, and it tells you to act <em>now</em>. The <b>burn rate</b> is how fast the smoke is filling the room: slow smoke gives you an afternoon, thick smoke gives you five minutes.</p>`,
    explain: `<p>Two rules: <b>alert on symptoms</b> (users are hurting: errors, slowness, no orders) and <b>not on causes</b> (CPU 85%, one pod restarted). Causes are for dashboards and debugging. Every page must be <b>urgent, actionable, and real</b>; if not, it should be a ticket or deleted.</p>
      <p>To define "users are hurting" use <b>SLIs and SLOs</b>. An <b>SLI</b> is a measured ratio of good events (for example requests that succeeded under 300 ms / all requests). An <b>SLO</b> is your target for it, say 99.9% over 30 days. The leftover 0.1% is the <b>error budget</b>: the amount of badness you may spend. For 1,000,000 requests that is 1,000 bad ones.</p>
      <p><b>Burn rate</b> = how fast you are spending the budget compared to the allowed pace. Burn rate 1 means you will use exactly the whole budget at the end of 30 days. Burn rate 14.4 means you would use it all in 30 days / 14.4 = about 2 days; and 14.4 for one hour burns 2% of the monthly budget.</p>
      ${H.table(['Severity', 'Long window', 'Short window', 'Burn rate', 'Budget used', 'Action'], [
        ['Page now', '1 hour', '5 min', '&ge; 14.4', '2% in 1h', '<span class="c-r">wake someone</span>'],
        ['Page', '6 hours', '30 min', '&ge; 6', '5% in 6h', '<span class="c-r">respond soon</span>'],
        ['Ticket', '3 days', '6 hours', '&ge; 1', '10% in 3d', '<span class="c-y">fix in working hours</span>']
      ])}
      <p>Why <b>two windows</b>? The long window proves the problem is big enough to matter; the short window proves it is <em>still happening</em> now, so the alert clears fast after you fix it and does not fire on a spike that ended. Both must be true.</p>`,
    clues: ['"how do you avoid alert fatigue?" - symptom-based, SLO burn rate, remove or downgrade noisy alerts', '"alert on CPU > 80%?" - usually no: cause, not symptom', '"error budget" / "SLO 99.9%" in the question', '"alerts flap / fire and clear all night" - add a "for" duration, a short window, or hysteresis', '"nobody was paged during the outage" - missing symptom alert or dead-man switch on the monitoring itself', '"every alert needs a runbook" - actionable, linked', '"page vs ticket" - urgency decides']
    ,
    code: [
      {
        lang: 'js', run: true, title: 'Multi-window burn-rate calculator (runnable)', code: `// SLO 99.9% over 30 days -> error budget 0.1%.
// Inputs: observed error ratio in several windows. Output: burn rates and the alert decision.
var SLO = 0.999;
var BUDGET = 1 - SLO;               // 0.001 = 0.1% allowed bad events
var PERIOD_HOURS = 30 * 24;         // 720 hours

function burnRate(errorRatio) { return errorRatio / BUDGET; }

// Each rule needs BOTH windows above the threshold (long proves size, short proves "still on").
var rules = [
  { name: 'PAGE-fast', long: '1h', short: '5m', threshold: 14.4 },
  { name: 'PAGE-slow', long: '6h', short: '30m', threshold: 6 },
  { name: 'TICKET', long: '3d', short: '6h', threshold: 1 }
];

function evaluate(ratios) {
  var fired = [];
  rules.forEach(function (r) {
    var bl = burnRate(ratios[r.long]), bs = burnRate(ratios[r.short]);
    var ok = bl >= r.threshold && bs >= r.threshold;
    console.log(r.name + ': long(' + r.long + ')=' + bl.toFixed(1) + 'x short(' + r.short + ')=' + bs.toFixed(1) + 'x need>=' + r.threshold + ' -> ' + (ok ? 'FIRE' : 'quiet'));
    if (ok) fired.push(r.name);
  });
  return fired;
}

function hoursToExhaust(rate) { return rate > 0 ? PERIOD_HOURS / rate : Infinity; }

// Scenario A: a real outage that started 20 minutes ago (1.8% errors now)
console.log('--- Scenario A: sudden outage ---');
var a = evaluate({ '1h': 0.006, '5m': 0.018, '6h': 0.001, '30m': 0.012, '3d': 0.0003, '6h2': 0 });
console.log('fired:', a.join(', ') || 'none');
console.log('At 1.8% errors the budget is gone in ' + hoursToExhaust(burnRate(0.018)).toFixed(0) + ' hours');

// Scenario B: a short blip that is already over (5m window is clean)
console.log('--- Scenario B: blip that ended ---');
var b = evaluate({ '1h': 0.016, '5m': 0.0004, '6h': 0.003, '30m': 0.0005, '3d': 0.0002, '6h2': 0 });
console.log('fired:', b.join(', ') || 'none');`
      },
      {
        lang: 'yaml', check: false, title: 'Prometheus multi-window burn-rate alert (shape only)', code: `# check:false - Prometheus alerting rule using recording rules for error ratio.
groups:
  - name: slo-checkout
    rules:
      - alert: CheckoutErrorBudgetFastBurn
        expr: |
          job:slo_errors_per_request:ratio_rate1h{job="checkout"} > (14.4 * 0.001)
          and
          job:slo_errors_per_request:ratio_rate5m{job="checkout"} > (14.4 * 0.001)
        for: 2m
        labels: { severity: page }
        annotations:
          summary: "Checkout burning error budget 14x too fast"
          runbook_url: "https://runbooks.example.com/checkout-errors"
      - alert: CheckoutErrorBudgetSlowBurn
        expr: |
          job:slo_errors_per_request:ratio_rate6h{job="checkout"} > (6 * 0.001)
          and
          job:slo_errors_per_request:ratio_rate30m{job="checkout"} > (6 * 0.001)
        labels: { severity: page }`
      }
    ],
    viz: [
      {
        title: 'Error budget burn over time',
        input: '1.8',
        inputLabel: 'Current error percentage (SLO 99.9%)',
        gen: function (input) {
          var pct = num(input, 1.8, 0, 50);
          var ratio = pct / 100, budget = 0.001, br = Math.round(ratio / budget * 10) / 10;
          var hoursLeft = br > 0 ? Math.round(720 / br * 10) / 10 : 720;
          var series = [], used = 0;
          for (var h = 0; h <= 6; h++) { series.push(Math.min(100, Math.round(used * 10) / 10)); used += br / 720 * 100; }
          var cls = br >= 14.4 ? 'bad' : br >= 6 ? 'cur' : br >= 1 ? 'win' : 'ok';
          var f = [];
          f.push({ narr: 'SLO is 99.9% good requests, so the <b>error budget</b> is 0.1% of requests for the month. Budget = 100% available at the start.', parts: [{ type: 'bars', label: 'Budget remaining (%)', values: [100], texts: ['100%'], hl: { 0: 'ok' } }, { type: 'vars', vals: { slo: '99.9%', allowed_bad: '0.1%' } }] });
          f.push({ narr: 'Now ' + pct + '% of requests fail. Burn rate = ' + pct + '% / 0.1% = <b>' + br + 'x</b> the allowed pace.', parts: [{ type: 'vars', vals: { error_pct: pct + '%', burn_rate: br + 'x' }, hl: { burn_rate: cls } }] });
          f.push({ narr: 'At this pace the whole monthly budget is gone in about <b>' + hoursLeft + ' hours</b> (720h / ' + br + ').', parts: [{ type: 'vars', vals: { hours_until_budget_gone: hoursLeft }, hl: { hours_until_budget_gone: cls } }] });
          f.push({ narr: 'Budget used during the next 6 hours if nobody acts (each bar = one hour, % of the month budget spent so far).', parts: [{ type: 'bars', label: 'Budget spent over time (%)', values: series, idxLabels: ['0h', '1h', '2h', '3h', '4h', '5h', '6h'], hl: { 6: cls } }] });
          var dec = br >= 14.4 ? '<span class="c-r">PAGE NOW (fast burn)</span>' : br >= 6 ? '<span class="c-r">PAGE (slow burn)</span>' : br >= 1 ? '<span class="c-y">TICKET</span>' : '<span class="c-g">No alert: within budget</span>';
          f.push({ narr: 'Decision from the thresholds (14.4 page, 6 page, 1 ticket): ' + dec + '.', parts: [{ type: 'table', label: 'Alert rules', columns: ['rule', 'threshold', 'this burn', 'fires?'], rows: [['fast: 1h and 5m', '14.4x', br + 'x', br >= 14.4 ? 'YES' : 'no'], ['slow: 6h and 30m', '6x', br + 'x', br >= 6 ? 'YES' : 'no'], ['ticket: 3d and 6h', '1x', br + 'x', br >= 1 ? 'YES' : 'no']], hl: { 0: br >= 14.4 ? 'bad' : 'done', 1: br >= 6 ? 'cur' : 'done', 2: br >= 1 ? 'win' : 'done' } }] });
          return f;
        }
      },
      {
        title: 'Why two windows: a blip that already ended',
        input: '1.6 0.04',
        inputLabel: 'Error % in 1h window, error % in last 5 min',
        gen: function (input) {
          var a = nums(input, 2, 2, 'Enter two percentages, e.g. 1.6 0.04');
          var bl = a[0] / 0.1, bs = a[1] / 0.1;
          var longOk = bl >= 14.4, shortOk = bs >= 14.4;
          return [
            { narr: 'The 1-hour window shows <b>' + a[0] + '%</b> errors: burn <b>' + bl.toFixed(1) + 'x</b>. ' + (longOk ? 'That is above 14.4x.' : 'Below 14.4x.'), parts: [{ type: 'bars', label: 'Burn rate by window', values: [bl], idxLabels: ['1h'], texts: [bl.toFixed(1) + 'x'], hl: { 0: longOk ? 'cur' : 'ok' } }] },
            { narr: 'The last 5 minutes show <b>' + a[1] + '%</b>: burn <b>' + bs.toFixed(1) + 'x</b>. ' + (shortOk ? 'Still happening!' : 'The problem is already over.'), parts: [{ type: 'bars', label: 'Burn rate by window', values: [bl, bs], idxLabels: ['1h', '5m'], texts: [bl.toFixed(1) + 'x', bs.toFixed(1) + 'x'], hl: { 0: longOk ? 'cur' : 'ok', 1: shortOk ? 'bad' : 'ok' } }] },
            { narr: 'Rule: fire only if <b>both</b> windows are above the threshold. Result: ' + ((longOk && shortOk) ? '<span class="c-r">FIRE, a real ongoing incident.</span>' : '<span class="c-g">Do not page. ' + (longOk ? 'The spike is over, do not wake anyone for yesterday\'s fire.' : 'Not big enough to matter.') + '</span>'), parts: [{ type: 'table', label: 'AND of both windows', columns: ['window', 'burn', '&ge; 14.4?'], rows: [['1h (is it big?)', bl.toFixed(1), longOk ? 'yes' : 'no'], ['5m (is it now?)', bs.toFixed(1), shortOk ? 'yes' : 'no']], hl: { 0: longOk ? 'cur' : 'done', 1: shortOk ? 'bad' : 'done' } }] },
            { narr: 'Bonus: when you fix the problem, the 5-minute window clears within minutes, so the alert resolves quickly instead of staying red for an hour.', parts: [{ type: 'text', html: '<b>Short window = fast reset.</b> <b>Long window = proof that it matters.</b>' }] }
          ];
        }
      }
    ],
    examples: [
      { title: 'Cause alert vs symptom alert', html: `<p>${H.table(['Cause alert (avoid paging)', 'Symptom alert (page)'], [['CPU &gt; 85% for 5 min', 'Checkout error ratio burns budget at &ge; 14.4x'], ['Pod restarted', 'p99 latency above SLO for 10 min'], ['Disk 80% full', 'Disk will be full in 4 hours (predictive) and writes will fail'], ['Queue length &gt; 1000', 'Oldest message age above the processing SLO']])}</p><p>Causes still go on dashboards and in the runbook's "check these" list.</p>` },
      { title: 'Reduce alert fatigue: an audit recipe', html: `<p>List last month's pages. For each ask: <b>Did a human have to act?</b> If no: delete or turn into a ticket. <b>Did it fire without user impact?</b> Move to a dashboard. <b>Did it need the same fix every time?</b> Automate the fix (restart, scale). <b>Is it duplicated by another alert?</b> Group them (one page per incident, not 40). Add a runbook link to those that remain. Track "pages per on-call shift" (aim for under 2 per 12 hours) and "percentage actionable" (aim for over 90%).</p>` },
      { title: 'A dead-man switch watches the watcher', html: `<p>If your monitoring breaks, no alert fires and everything looks calm. Keep an alert that is <em>always firing</em> (a heartbeat) sent to an external service; when the heartbeat stops, that service pages you. Also alert on missing data (no requests at all) for critical routes.</p>` }
    ],
    deepDive: `<p><b>The maths.</b> Burn rate B = error ratio / (1 - SLO). A window of length W at burn B spends B &times; W / T of the budget (T = SLO period). 14.4 &times; 1h / 720h = 2%; 6 &times; 6h / 720h = 5%; 1 &times; 72h / 720h = 10%. The thresholds are chosen so each alert corresponds to a fixed percentage of budget consumed. The short window is usually 1/12 of the long one.</p>
      <p><b>Low traffic.</b> With 50 requests per hour, one failure is a 2% error ratio and burn rate 20 on its own. Fixes: use longer windows, alert on absolute counts as well, use synthetic probes to create steady traffic, or aggregate across services of the same user journey. <b>Choosing the SLI:</b> measure what the user feels (at the load balancer or in the client), count slow responses as bad too, keep to a few SLIs per journey (availability, latency, correctness/freshness). <b>Grouping and routing:</b> group related alerts into one notification (by service or incident), inhibit child alerts when a parent fires (the whole region is down, do not also page for each service), route to the owning team, and attach runbook, dashboard and last-deploy links.</p>
      <p><b>Alert design checks:</b> test alerts with replayed data, review each one in postmortems ("did the alert fire early enough? was it noisy?"), use <code>for:</code> durations carefully (they delay detection), and keep thresholds tied to SLOs rather than gut feeling. Different SLO windows (28 or 30 days, rolling vs calendar) change the numbers; pick one and write it down.</p>`,
    aiEra: `<p><b>What AI changes:</b> AIOps tools group related alerts, suggest likely causes from recent deploys and traces, and draft the first incident summary. LLM features also need SLOs: availability of the model call, time to first token, and quality SLIs (for example "answers rated good", "tool calls that succeeded", "hallucination or refusal rate on a test set"). Quality drift can burn budget silently with no HTTP error at all.</p>
      <p><b>Use AI as a partner:</b> ask <code>Here is last month's page list; classify each as actionable, informational, or duplicate, and propose which to delete</code>; ask it to check your burn-rate math. <b>Where AI goes wrong:</b> it suggests thresholds without SLO context (CPU &gt; 80% pages), mixes 1h and 6h windows incorrectly, and an "auto-remediation agent" can restart or scale things on a false alarm and make an incident worse. Keep humans in the loop for risky actions and require rate limits and rollbacks on automation. <b>What you must still own:</b> the SLO (a business decision), what counts as a bad event, and the rule that every page needs a human action.</p>`,
    problems: [
      prob({
        title: 'Compute a multi-window burn-rate alert', level: 'Medium', tags: ['SLO', 'burn rate', 'alerting'], companies: ['Google', 'Stripe'],
        statement: `<p>SLO: 99.9% over 30 days. In the last hour 0.9% of requests failed; in the last 5 minutes 1.5% failed. The page rule is "burn rate &ge; 14.4 in both 1h and 5m". Does it fire? How long until the budget is gone at the current pace?</p>`,
        example: `<p>Budget = 0.1%. 1h burn = 0.9 / 0.1 = <b>9</b>. 5m burn = 1.5 / 0.1 = <b>15</b>.</p><p>${H.table(['window', 'burn', '&ge; 14.4'], [['1h', '9', '<span class="c-r">no</span>'], ['5m', '15', '<span class="c-g">yes</span>']])}</p><p>Does not fire (the 1h window is below 14.4). The slow rule (6x) would: 9 &ge; 6 and 15 &ge; 6, assuming 6h/30m are also high.</p>`,
        brute: `<p>Alert if error ratio &gt; 1% for one minute. Fires on every blip and ignores traffic and the SLO, so people mute it; and a slow 0.5% error rate that eats the monthly budget never alerts.</p>`,
        mcq: { q: 'With an SLO of 99.9%, an error ratio of 0.5% is a burn rate of', options: ['0.5', '5', '50'], answer: 1, explain: 'Burn = 0.5% / 0.1% = 5. Consumed at 5x the allowed pace.' },
        hints: [`<p>Hint 1: budget = 1 - SLO = 0.1%.</p>`, `<p>Hint 2: burn = error ratio / budget, per window.</p>`, `<p>Hint 3: fire only if all windows in the rule are above the threshold. Time to exhaustion = 720 h / burn.</p>`],
        approach: `<p>Budget is 0.1%. Burn for the 1h window is 0.9 / 0.1 = 9; for the 5m window 1.5 / 0.1 = 15. The fast-burn page rule needs both at 14.4 or more, so it does not fire (1h is only 9). The slow-burn rule (6 over 6h and 30m) probably does fire if the 6h and 30m windows are also above 6, and that pages the on-call within minutes to hours, which is appropriate: the problem is real but not an emergency yet. At a burn of 15 the budget is gone in 720 / 15 = 48 hours; at 9 in 80 hours. A ticket-level alert catches slower leaks. Document the three tiers, link the runbook, and tune only after reviewing real incidents.</p>`
      }),
      prob({
        title: 'Reduce alert fatigue on a noisy on-call rotation', level: 'Hard', tags: ['alerting', 'on-call', 'alert fatigue'], companies: ['PagerDuty', 'Atlassian'],
        statement: `<p>On-call gets 60 pages per week; about 50 need no action. Design a plan to cut the noise without missing real outages.</p>`,
        example: `<p>${H.table(['Page type', 'Count/week', 'Action taken'], [['CPU high', '20', '<span class="c-r">none</span>'], ['Pod restarted', '15', '<span class="c-r">none, auto-recovered</span>'], ['Disk 80%', '8', 'ticket would do'], ['Checkout errors', '3', '<span class="c-g">real</span>'], ['Duplicate alerts same incident', '14', 'noise']])}</p>`,
        brute: `<p>Raise every threshold or mute alerts. Real incidents get missed, trust drops, and the next outage is found by customers on social media.</p>`,
        mcq: { q: 'Best first step?', options: ['Add more people to on-call', 'Classify every page as actionable or not, then delete, downgrade or automate', 'Disable all alerts at night'], answer: 1, explain: 'Measure first; remove what does not need a human.' },
        hints: [`<p>Hint 1: measure: which alerts led to human action?</p>`, `<p>Hint 2: move causes to dashboards; page on SLO burn.</p>`, `<p>Hint 3: group and inhibit duplicates, automate repeated fixes, add runbooks, track the metrics weekly.</p>`],
        approach: `<p>Step 1, audit: export 4 weeks of pages and label each as actionable, informational, duplicate or auto-resolved. Step 2, delete cause alerts that never needed action (CPU, single pod restart) and keep them as dashboard panels. Step 3, downgrade slow-moving ones (disk 80%) to tickets or replace with a predictive "full in 4 hours". Step 4, replace many symptom alerts with a few multi-window SLO burn-rate alerts per user journey. Step 5, group alerts by incident and set inhibition so a region outage sends one page. Step 6, automate repetitive fixes (restart hung worker, scale up) with safe limits. Step 7, every remaining page gets a runbook and an owner. Step 8, measure pages per shift, actionable percentage, and time to acknowledge; review in a weekly 30 minute meeting. Guard against missing outages by keeping a heartbeat alert and testing alerts with game days. Expected result: from 60 to under 10 pages per week with all real ones preserved.</p>`
      })
    ]
  });

  /* ================================================================
     TOPIC 6 - Incident response and blameless postmortems
     ================================================================ */
  topics.push({
    title: 'Incident Response and Blameless Postmortems',
    analogy: `<p>A hospital emergency room. When a big accident arrives, nobody argues about whose fault it was. One doctor <b>leads</b> (triage), others do specific jobs, one person talks to the family, one person writes everything down. Only afterwards, in a calm review, the hospital asks "how do we make this safer next time?" and changes the process, rather than firing the nurse. That is incident response followed by a blameless postmortem.</p>`,
    explain: `<p>An <b>incident</b> is an unplanned event that hurts users or the business. The goal is first <b>stop the pain</b> (mitigate), later find the root cause. Good teams use clear roles:</p>
      ${H.table(['Role', 'Job in one line'], [
        ['<b>Incident Commander (IC)</b>', 'Runs the show: decides, assigns, keeps the team calm. Does not debug.'],
        ['<b>Operations / Tech lead</b>', 'Hands on keyboard: investigates and applies the fix.'],
        ['<b>Communications lead</b>', 'Updates status page, support, and leaders on a schedule.'],
        ['<b>Scribe</b>', 'Writes the timeline as it happens: what, when, who.']
      ])}
      <p>Flow: <b>detect</b> (alert/customer) &rarr; <b>triage</b> (how bad? set severity SEV1 to SEV4) &rarr; <b>declare</b> and open a channel &rarr; <b>mitigate</b> (rollback, flag off, failover, scale; the fastest safe action, even before you understand why) &rarr; <b>resolve</b> &rarr; <b>postmortem</b>. Rule: <b>mitigate first, diagnose later</b>. If a deploy happened 10 minutes before the errors began, roll it back first.</p>
      <p>A <b>blameless postmortem</b> is a written review within a few days. It assumes people acted reasonably with the information they had, so it asks "what let this happen?", not "who did it?". It has: summary, impact, timeline, root causes, what went well / badly / lucky, and <b>action items</b> with owners and dates. The <b>5 whys</b> technique keeps asking "why?" until you reach a fixable system cause.</p>`,
    clues: ['"walk me through how you handled an outage"', '"what is the first thing you do when production is down?" - mitigate, communicate, then diagnose', '"who is the incident commander" / roles', '"blameless postmortem" / "5 whys" / "root cause"', '"MTTR / MTTD" in the question', '"how do you communicate during an incident?" - cadence, status page, single channel', '"action items never get done" - owners, dates, tracking']
    ,
    code: [
      {
        lang: 'js', run: true, title: 'Incident timeline and MTTR (runnable)', code: `// Build a timeline from events and compute detection, mitigation and recovery times.
var events = [
  { t: '10:02', who: 'deploy-bot', what: 'deployed orders v2.14' },
  { t: '10:09', who: 'system', what: 'error ratio starts rising (first bad request)' },
  { t: '10:21', who: 'alert', what: 'fast-burn page fired' },
  { t: '10:24', who: 'oncall', what: 'acknowledged, declared SEV2' },
  { t: '10:31', who: 'ic', what: 'decision: roll back v2.14' },
  { t: '10:38', who: 'ops', what: 'rollback complete, errors falling' },
  { t: '10:52', who: 'ic', what: 'resolved, monitoring' }
];
function mins(t) { var p = t.split(':'); return Number(p[0]) * 60 + Number(p[1]); }
var start = mins('10:09');           // when users started to hurt
var detect = mins('10:21');          // when we knew
var mitigate = mins('10:38');        // when users stopped hurting
var resolved = mins('10:52');

events.forEach(function (e) { console.log(e.t + '  ' + e.who.padEnd(10) + e.what); });
console.log('MTTD (time to detect):   ' + (detect - start) + ' min');
console.log('Time to mitigate:        ' + (mitigate - start) + ' min   <- user pain duration');
console.log('Time to resolve:         ' + (resolved - start) + ' min');
console.log('Detection was ' + Math.round((detect - start) / (mitigate - start) * 100) + '% of the pain: improve alerts first.');`
      }
    ],
    viz: [
      {
        title: 'Incident timeline as it happens',
        input: '6',
        inputLabel: 'How many steps to reveal (1-8)',
        gen: function (input) {
          var all = [
            ['10:09', 'errors start rising'], ['10:21', 'ALERT fires: fast burn'], ['10:24', 'on-call acks, declares SEV2'], ['10:26', 'roles assigned (IC, ops, comms, scribe)'],
            ['10:31', 'mitigation chosen: roll back'], ['10:38', 'rollback done, errors falling'], ['10:52', 'resolved, monitor 30 min'], ['next day', 'postmortem scheduled']
          ];
          var n = Math.max(1, Math.min(8, Math.round(num(input, 6, 1, 8))));
          var f = [];
          for (var i = 0; i < n; i++) {
            var items = all.slice(0, i + 1).map(function (e) { return e[0] + ' ' + e[1]; });
            var hl = {}; hl[i] = i >= 4 && i <= 5 ? 'ok' : i === 0 ? 'bad' : 'cur';
            var why = ['Users hurt but nobody knows yet. The gap before detection is called MTTD.', 'Detection. A symptom alert pages the on-call.', 'Acknowledge and declare: a severity sets who must join and how often we update.', 'Roles split the work: the IC decides, ops fixes, comms updates, scribe records.', 'Mitigation before root cause: a deploy happened at 10:02, so roll it back.', 'Users recover. Pain duration ends here.', 'Resolved. We keep watching for relapse.', 'Blameless postmortem in the next days.'][i];
            f.push({ narr: '<b>' + all[i][0] + '</b>: ' + all[i][1] + '. ' + why, parts: [{ type: 'queue', label: 'Incident timeline (oldest first)', items: items, hl: hl, frontLabel: 'start', backLabel: 'now' }] });
          }
          if (f.length < 4) { f.push({ narr: 'Try 4 or more steps to see mitigation. The timeline is the scribe\'s main job.', parts: [{ type: 'text', html: 'Increase the number to see the rest of the incident.' }] }); }
          while (f.length < 4) f.push({ narr: 'Increase the step count to reveal the full incident.', parts: [{ type: 'text', html: 'Roles: IC, ops, comms, scribe.' }] });
          return f;
        }
      },
      {
        title: '5 whys: from symptom to fixable cause',
        input: '5',
        inputLabel: 'Number of whys to show (1-5)',
        gen: function (input) {
          var n = Math.max(1, Math.min(5, Math.round(num(input, 5, 1, 5))));
          var chain = [
            ['Why did checkout fail for 30 minutes?', 'The orders service ran out of database connections.'],
            ['Why did it run out?', 'A new query held connections 10x longer than before.'],
            ['Why was the query slow?', 'It scanned a table with no index on the new column.'],
            ['Why did that ship?', 'Staging has 1,000 rows, production has 80 million, so tests were fast.'],
            ['Why no safety net?', 'No canary stage and no alert on pool saturation, so we learned from users.']
          ];
          var fixes = ['(symptom)', 'Add timeout and bulkhead on the pool', 'Add the index; require EXPLAIN review for new queries', 'Load-test with production-sized data in CI', 'Add canary analysis + saturation alert']
          var f = [{ narr: 'We use the <b>5 whys</b>: keep asking why, but about the <b>system</b>, never about a person. Stop when you reach something you can fix.', parts: [{ type: 'table', label: 'Start', columns: ['#', 'question', 'answer'], rows: [['-', 'Incident', 'Checkout errors for 30 minutes']], hl: { 0: 'bad' } }] }];
          for (var i = 0; i < n; i++) {
            var rows = chain.slice(0, i + 1).map(function (c, k) { return [String(k + 1), c[0], c[1]]; });
            var hl = {}; hl[i] = i === 4 ? 'ok' : 'cur';
            f.push({ narr: 'Why #' + (i + 1) + ': ' + chain[i][1] + (i === 4 ? ' <b>A fixable system gap.</b>' : ' Not fixable yet, ask again.'), parts: [{ type: 'table', label: '5 whys so far', columns: ['#', 'question', 'answer'], rows: rows, hl: hl }] });
          }
          if (n === 5) {
            f.push({ narr: 'Each answer gives an <b>action item</b> with an owner and a date. Notice nobody is blamed: the engineer did what the process allowed.', parts: [{ type: 'table', label: 'Action items', columns: ['why #', 'action', 'type'], rows: chain.map(function (c, k) { return [String(k + 1), fixes[k], k === 0 ? 'impact' : k < 3 ? 'prevent' : 'detect/process']; }).slice(1), hl: { 3: 'ok' } }] });
          } else {
            f.push({ narr: 'Stopping early leaves causes unfixed. Try 5 to reach the process gap.', parts: [{ type: 'text', html: 'More whys usually move from <b>code</b> to <b>process</b> to <b>safety nets</b>.' }] });
          }
          return f;
        }
      }
    ],
    examples: [
      { title: 'Severity levels (example scale)', html: `<p>${H.table(['SEV', 'Meaning', 'Response'], [['1', 'Major outage, core feature down for most users, data loss risk', 'page everyone needed, update every 15-30 min, exec aware'], ['2', 'Major feature degraded for many users', 'page on-call, update every 30-60 min'], ['3', 'Minor impact or workaround exists', 'fix in working hours'], ['4', 'Cosmetic, no user impact', 'ticket']])}</p><p>When unsure, start higher and downgrade later. Cost of over-reacting is small, cost of under-reacting is big.</p>` },
      { title: 'A good status update', html: `<p>Short, regular, honest: <b>What users see</b> (checkout failing for some users). <b>What we know</b> (started after a deploy at 10:02). <b>What we are doing</b> (rolling back). <b>Next update</b> at 10:45. Never promise an ETA you cannot keep; "next update in 30 minutes" is a promise you can keep.</p>` },
      { title: 'Postmortem outline', html: `<p>1. Summary (3 lines). 2. Impact (users, duration, money, error budget burned). 3. Timeline (UTC). 4. Root causes and contributing factors. 5. What went well / badly / where we got lucky. 6. Action items: each with owner, priority, due date, link to ticket. 7. Lessons. Share widely; the value is in the learning.</p>` },
      { title: 'Blame vs blameless wording', html: `<p>${H.table(['Blaming', 'Blameless'], [['Dana forgot the index', 'Nothing in our process checks index coverage for new queries'], ['QA missed it', 'Our test data does not reflect production size'], ['Ops was slow to respond', 'The alert fired 12 min after impact began and the runbook was out of date']])}</p>` }
    ],
    deepDive: `<p><b>Why mitigate first.</b> Users care about the pain, not the explanation. Standard mitigations in order of speed and safety: roll back the last change, turn off the feature flag, shift traffic away from the bad region/instance, scale up or shed load, fail over, restore from backup. Keep each reversible. During an incident freeze unrelated changes. Avoid the "hero" pattern: the IC delegates, rotates after a few hours, and the team hands over cleanly for long incidents.</p>
      <p><b>Communication.</b> One channel, one source of truth, a pinned summary. The comms lead keeps customers and leadership informed so engineers are not interrupted. Use a status page; update even when there is no news. <b>Metrics:</b> MTTD (time to detect), MTTA (acknowledge), MTTR (time to restore; define whether it means mitigate or fully fix), incident count per severity, repeat incidents. Count customer-reported incidents separately: a high share means weak detection.</p>
      <p><b>Postmortem quality.</b> A root cause is rarely one thing: there are triggers (the deploy), latent conditions (no index review, missing canary) and failed defences (no alert). Beware "human error" as a root cause: it is where analysis starts, not ends. 5 whys is simple but linear; for complex failures use a fishbone or timeline-based contributing-factor analysis. Rate action items: prevent, detect, mitigate. Track them to completion in a visible tracker; a postmortem whose items never ship is theatre. Share near-misses too. Run <b>game days</b> and chaos tests so the first time you use the runbook is not the real thing. Legal, security, and data incidents have extra duties (notification deadlines): involve the right people early.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI tools can summarise a noisy incident channel into a timeline, draft status updates, suggest recent changes that correlate with the start time, search past incidents for similar ones and surface runbooks. LLM and agent features create new incident types: a bad prompt or model update changes behaviour with no code deploy, a runaway agent loop burns money, a provider outage degrades answers. Treat prompt/model/config changes like deploys: versioned, flagged, canaried, reversible. Include a "kill switch" to fall back to a simpler path.</p>
      <p><b>Use AI as a partner:</b> have it turn the scribe's raw notes into a postmortem draft, then verify every timestamp; ask it to propose questions for the 5 whys; ask for a checklist of similar past incidents. <b>Where AI goes wrong:</b> it writes confident but invented root causes, smooths over uncertainty, and can assign blame in subtle wording. It must never run risky remediation without approval. Do not paste customer data or secrets into external tools during an incident. <b>What you must still own:</b> the decision to mitigate, human accountability, honest communication, and the follow-through on action items.</p>`,
    problems: [
      prob({
        title: 'Write a postmortem with 5 whys', level: 'Medium', tags: ['postmortem', '5 whys', 'blameless'], companies: ['Google', 'Amazon'],
        statement: `<p>At 14:00 a release made search return empty results for 25 minutes for all users in one region. A config flag defaulted to "off" in that region. Write the key parts of a blameless postmortem: impact, a short timeline, 5 whys, and three action items.</p>`,
        example: `<p>${H.table(['Why', 'Answer'], [['1. Why empty search?', 'The index client read the wrong shard list'], ['2. Why wrong list?', 'New config key missing in region B, default empty'], ['3. Why missing?', 'Config rolled out manually per region'], ['4. Why not caught?', 'No config validation or staging in region B'], ['5. Why no safety net?', 'No canary region and no alert on "search results = 0"']])}</p>`,
        brute: `<p>"Root cause: the engineer forgot to set the flag. Action: be more careful." This blames a person, changes nothing in the system, and will happen again.</p>`,
        mcq: { q: 'Which is a good action item?', options: ['Remind everyone to double check', 'Add schema validation to config rollout so missing keys block the deploy (owner, due date)', 'Fire the person who changed it'], answer: 1, explain: 'Good actions change the system, are specific, and have an owner and date.' },
        hints: [`<p>Hint 1: describe impact in numbers: who, how long, how bad.</p>`, `<p>Hint 2: each "why" must be about the system, not a person.</p>`, `<p>Hint 3: classify actions: prevent, detect, mitigate; owner + date for each.</p>`],
        approach: `<p><b>Summary and impact:</b> from 14:00 to 14:25 UTC (25 minutes), all users in region B got empty search results; about 4% of global traffic; N orders lost; error budget burned 18% for the month. <b>Timeline:</b> 14:00 release starts; 14:03 results drop to zero (no alert); 14:12 support ticket spike; 14:15 incident declared SEV2; 14:20 flag identified; 14:25 flag set and results restored. <b>5 whys:</b> as in the example, ending at "no canary region and no alert on zero results". <b>Contributing factors:</b> detection by customers took 12 minutes. <b>Went well:</b> roles assigned quickly. <b>Lucky:</b> only one region. <b>Action items:</b> (1) validate config schema and required keys in CI and block the rollout (prevent, owner A, 2 weeks); (2) roll out to one canary region first with automatic rollback on error/zero-result ratio (prevent, owner B, 4 weeks); (3) add a symptom alert on search result count and a synthetic search probe per region (detect, owner C, 1 week). Track them in the team tracker and review in 30 days.</p>`
      }),
      prob({
        title: 'Run the first 15 minutes of an incident', level: 'Hard', tags: ['incident response', 'roles', 'communication'], companies: ['Meta', 'Shopify'],
        statement: `<p>You are on-call. At 02:10 you get a page: "checkout error ratio 12%". Describe your first 15 minutes: what you do, in what order, who you pull in, what you say, and when you roll back.</p>`,
        example: `<p>${H.table(['Minute', 'Step'], [['0-2', 'Acknowledge page, open dashboard, confirm users are affected'], ['2-5', 'Declare SEV, open incident channel, name IC'], ['5-8', 'Check recent changes, compare error start to deploy time'], ['8-12', 'Mitigate: roll back / flag off'], ['12-15', 'Verify recovery, first status update']])}</p>`,
        brute: `<p>Dive into logs alone for an hour looking for the root cause, tell nobody, and fix it with a code patch at 3 am. Users suffer for the whole time and nobody knows what happened.</p>`,
        mcq: { q: 'A deploy went out 10 minutes before the errors started. First move?', options: ['Read the code diff to find the bug', 'Roll back the deploy, then investigate', 'Wait to see if it recovers'], answer: 1, explain: 'Rolling back is a quick, reversible mitigation that restores users; diagnosis can happen afterwards.' },
        hints: [`<p>Hint 1: confirm impact, do not trust a single signal.</p>`, `<p>Hint 2: roles early: even two people can be IC and ops.</p>`, `<p>Hint 3: the question to ask is "what changed?" Mitigate before root cause.</p>`],
        approach: `<p>Minutes 0-2: acknowledge the page so others know someone is on it; open the SLO dashboard and confirm that the symptom is real and who is affected (all users or one region or one customer). Minutes 2-5: declare an incident at a provisional severity (SEV2), open a dedicated channel, take the IC role, and call a second engineer; ask for a scribe. State in the channel: impact, start time, what we are doing, next update in 15 minutes. Minutes 5-8: ask "what changed?" by checking deploys, feature flags, config changes, dependency status pages and infra events. If the start lines up with a change, that is the suspect. Minutes 8-12: mitigate with the fastest reversible action: roll back the release or turn the flag off; if it is a dependency, fail over or degrade gracefully. Do not debug on the production box while users are failing. Minutes 12-15: verify that error ratio and latency recover on the dashboard (not just "deploy finished"), post the first status update, keep watching for relapse, and schedule the postmortem. Afterwards, find the real root cause with logs and traces.</p>`
      })
    ]
  });

  /* ================================================================
     TOPIC 7 - SRE practices
     ================================================================ */
  topics.push({
    title: 'SRE Practices: Toil, Error Budgets and On-Call',
    analogy: `<p>Think of a restaurant kitchen. The head chef does not forbid trying new dishes, and does not let the kitchen burn down either. There is a rule: "we may waste up to 2% of ingredients while experimenting; above that, stop experiments and fix the process." The 2% is the <b>error budget</b>. Washing the same pans by hand every night with no end in sight is <b>toil</b>: buy a dishwasher. The night manager who answers when the fridge alarm rings is <b>on-call</b>, and a good kitchen makes sure that person is rested and has a written checklist.</p>`,
    explain: `<p><b>Site Reliability Engineering (SRE)</b> means treating operations as a software problem. Key ideas, in simple words:</p>
      <ul><li><b>SLI</b> (what we measure), <b>SLO</b> (the target), <b>SLA</b> (a promise to customers with penalties, always looser than the SLO).</li>
      <li><b>Error budget</b> = 100% - SLO. It is the amount of unreliability we are allowed. While budget remains, ship features fast. When it is spent, slow down: freeze risky launches and spend time on reliability. This turns the endless argument between "ship!" and "be safe!" into a number both sides agreed on beforehand.</li>
      <li><b>Toil</b> is work that is manual, repetitive, automatable, has no lasting value, and grows with the service (restarting a stuck job by hand, copying logs for a report, manually granting access). SRE aims to keep toil under about <b>50%</b> of a team's time and automate the rest away.</li>
      <li><b>On-call</b> is the rotation of people who respond to pages. Healthy on-call: a primary and a secondary, runbooks, a rotation of one week with fair handover, limits on pages per shift, time off after a rough night, and pay or time compensation.</li></ul>
      ${H.table(['SLO', 'Allowed downtime / 30 days', 'Error budget for 10M requests'], [['99%', '7.2 hours', '100,000 bad'], ['99.9%', '43.2 minutes', '10,000 bad'], ['99.95%', '21.6 minutes', '5,000 bad'], ['99.99%', '4.3 minutes', '1,000 bad']])}
      <p>More nines cost much more (redundancy, testing, people) and every dependency limits you: if you depend on three services of 99.9% each, you cannot promise more than about 99.7%. Pick the SLO users actually need, not the highest number.</p>`,
    clues: ['"what is an error budget?" / "SLO vs SLA"', '"developers want to ship, ops wants stability" - error budget policy', '"engineers spend half their time on manual operational work" - toil', '"on-call is burning people out"', '"99.99% availability" - how many minutes per month, what does it cost', '"how do you decide reliability vs features?"', '"blameless culture, game days, chaos"']
    ,
    code: [
      {
        lang: 'python', run: true, title: 'Error budget tracker and release policy (runnable)', code: `# Track the monthly error budget and decide whether risky releases are allowed.
SLO = 0.999
PERIOD_MIN = 30 * 24 * 60            # minutes in 30 days

def downtime_allowed(slo):
    return (1 - slo) * PERIOD_MIN    # minutes of full outage allowed

def policy(budget_left_pct):
    # a simple, written error budget policy
    if budget_left_pct > 50:
        return "GREEN: ship freely, experiments allowed"
    if budget_left_pct > 20:
        return "YELLOW: ship with canary only, no risky migrations"
    if budget_left_pct > 0:
        return "ORANGE: only reliability fixes and small changes"
    return "RED: feature freeze until the budget recovers"

total = downtime_allowed(SLO)
print("allowed downtime per 30 days: %.1f min" % total)

# incidents so far this month (minutes of equivalent full outage)
incidents = [("bad deploy", 12.0), ("db failover", 6.5), ("dependency", 14.0)]
used = 0.0
for name, mins in incidents:
    used += mins
    left = max(0.0, (total - used) / total * 100)
    print("%-12s -%4.1f min  used %5.1f / %.1f  left %5.1f%%  -> %s" % (name, mins, used, total, left, policy(left)))

# Chained dependencies: availability multiplies
deps = [0.999, 0.999, 0.999]
combined = 1.0
for d in deps:
    combined *= d
print("three 99.9%% dependencies in a row: %.3f%%" % (combined * 100))`
      },
      {
        lang: 'yaml', title: 'Error budget policy (a plain document, written down and agreed)', code: `service: checkout
slo:
  availability: 99.9        # percent of good requests over 30 days
  latency: "95% of requests under 300 ms"
policy:
  budget_remaining_over_50_percent: "normal release cadence"
  budget_remaining_20_to_50_percent: "canary required for every release"
  budget_remaining_0_to_20_percent: "only reliability work and small safe changes"
  budget_exhausted: "feature freeze; engineering time goes to reliability until budget recovers"
exceptions: "security fixes and legal requirements may always ship"
owners: ["product lead", "engineering lead", "SRE lead"]   # all three agree
review: "quarterly, and after any major incident"
toil_target: "less than 50 percent of team time"
oncall:
  rotation: "weekly, primary and secondary"
  max_pages_per_12h_shift: 2
  handover: "written notes + 30 minute call"
  after_rough_night: "next day off or late start"`
      }
    ],
    viz: [
      {
        title: 'Error budget and release policy',
        input: '12 6.5 14',
        inputLabel: 'Minutes of outage from up to 5 incidents this month',
        gen: function (input) {
          var inc = nums(input, 1, 5, 'Enter 1 to 5 numbers (minutes of outage), e.g. 12 6.5 14').map(function (x) { return Math.max(0, x); });
          var total = 43.2, used = 0, vals = [100], labs = ['start'], f = [];
          function pol(left) { return left > 50 ? ['GREEN: ship freely', 'ok'] : left > 20 ? ['YELLOW: canary only', 'cur'] : left > 0 ? ['ORANGE: reliability fixes only', 'bad'] : ['RED: feature freeze', 'bad']; }
          f.push({ narr: 'SLO 99.9% over 30 days allows <b>43.2 minutes</b> of full outage. That is our budget: 100% left at the start of the month.', parts: [{ type: 'bars', label: 'Budget left (%)', values: [100], idxLabels: ['start'], texts: ['100%'], hl: { 0: 'ok' } }, { type: 'vars', vals: { budget_minutes: total, policy: 'GREEN: ship freely' } }] });
          inc.forEach(function (m, i) {
            used += m;
            var left = Math.max(0, Math.round((total - used) / total * 1000) / 10);
            vals.push(left); labs.push('inc ' + (i + 1));
            var p = pol(left), hl = {}; hl[vals.length - 1] = p[1];
            f.push({ narr: 'Incident ' + (i + 1) + ' costs <b>' + m + ' min</b>. Total used ' + Math.round(used * 10) / 10 + ' of 43.2. Budget left <b>' + left + '%</b>. Policy now: <b>' + p[0] + '</b>.', parts: [{ type: 'bars', label: 'Budget left (%) after each incident', values: vals.slice(), idxLabels: labs.slice(), texts: vals.map(function (v) { return v + '%'; }), hl: hl }, { type: 'vars', vals: { used_min: Math.round(used * 10) / 10, left_pct: left, policy: p[0] }, hl: { policy: p[1] } }] });
          });
          while (f.length < 4) f.push({ narr: 'Policy is checked after every incident and when releases are planned. Room left means releases continue.', parts: [{ type: 'text', html: 'Add more incidents above to see the policy change.' }] });
          return f;
        }
      },
      {
        title: 'Toil: what to automate first',
        input: '5',
        inputLabel: 'Hours per week the team loses to manual work',
        gen: function (input) {
          var h = Math.round(num(input, 5, 1, 40) * 10) / 10;
          var tasks = [['Restart stuck job', 2, 5, 1], ['Grant access by hand', 1.5, 4, 4], ['Weekly report copy', 1, 2, 3], ['Rotate certificates', 0.5, 6, 2]];
          var tot = tasks.reduce(function (a, t) { return a + t[1]; }, 0);
          var scale = h / tot;
          var rows = tasks.map(function (t) { var hrs = Math.round(t[1] * scale * 10) / 10; return [t[0], hrs, t[2] + ' h to automate', Math.round(hrs * 52 / t[2])  + 'x payback/yr']; });
          return [
            { narr: 'The team loses <b>' + h + ' hours a week</b> to four manual chores. This is toil: manual, repetitive, automatable, and it grows with the service.', parts: [{ type: 'table', label: 'Toil list', columns: ['chore', 'hours/week', 'cost to automate', 'payback'], rows: rows }] },
            { narr: 'Sort by payback: do the chore with the best return first. Restarting the stuck job is also a hint of a <b>real bug</b>: fix the root cause rather than automate the restart.', parts: [{ type: 'bars', label: 'Hours per week per chore', values: rows.map(function (r) { return r[1]; }), idxLabels: ['restart', 'access', 'report', 'certs'], hl: { 0: 'bad' } }] },
            { narr: 'After automation the hours return to engineering work: more reliability, fewer pages. The goal is to keep toil <b>under 50%</b> of the team\'s time.', parts: [{ type: 'vars', vals: { toil_hours_per_week: h, yearly_hours: Math.round(h * 52), target: '< 50% of time' } }] },
            { narr: 'Measure toil, don\'t guess: ask people to tag tickets and on-call work as toil for a month.', parts: [{ type: 'text', html: '<b>If you cannot measure it, you cannot reduce it.</b>' }] }
          ];
        }
      }
    ],
    examples: [
      { title: 'How to spot toil', html: `<p>Ask five questions: Is it <b>manual</b>? <b>Repetitive</b>? <b>Automatable</b>? Does it leave <b>no lasting value</b>? Does it <b>grow with traffic</b>? If yes to most, it's toil. Examples: resetting passwords by hand, resizing disks, re-running failed batch jobs, copying numbers into slides. Not toil: designing the new alerting system, a postmortem, a one-off migration.</p>` },
      { title: 'Healthy on-call checklist', html: `<ul><li>Primary and secondary, with an escalation path.</li><li>Every page has a runbook link; runbooks are tested.</li><li>Fewer than 2 pages per 12 hours on average; if above, fix the system, not the person.</li><li>Follow-the-sun or fair rotation, time off after bad nights.</li><li>New people shadow first, then lead with a buddy.</li><li>Handover notes at every rotation change.</li></ul>` },
      { title: 'SLO vs SLA', html: `<p>SLA (contract): "99.5% monthly uptime or you get credits". SLO (internal): 99.9%, tighter so you notice trouble before you break the contract. SLI: the measured number. If your SLO equals your SLA you have no warning room.</p>` },
      { title: 'The cost of one more nine', html: `<p>Going from 99.9% to 99.99% shrinks allowed downtime from 43 minutes to 4.3 minutes a month. A single manual failover that takes 10 minutes already breaks it. You would need automatic failover, multi-region, extensive testing, and a bigger team. Ask the business: is the extra nine worth that cost? Often the answer is "no".</p>` }
    ],
    deepDive: `<p><b>Error budget policy details.</b> The policy must be agreed in advance by product, engineering and SRE, written down, and have exceptions (security fixes). Budgets can be tracked per user journey rather than per service. Do not game it: count what users feel, not what is convenient. Budgets also justify risky-but-valuable work: if the budget is healthy, the team may run chaos experiments, migrate databases, or launch faster; if the service is always <em>far</em> above its SLO, the SLO may be too low, and you are over-investing in reliability. A budget that is always empty means the SLO is unrealistic or the system needs real work.</p>
      <p><b>Toil and engineering.</b> Google's guideline: SREs spend at most 50% on ops work (toil + on-call), and the rest on engineering that reduces future work. Automation hierarchy: document it, script it, automate trigger, make it self-healing, remove the need. Beware automation that nobody understands, and automation without safety limits. <b>On-call health:</b> measure pages per shift, night pages, time to acknowledge, and how many pages were actionable. Burnout makes reliability worse: tired people cause incidents. Rotate fairly, keep teams large enough (at least 6-8 people for a sustainable weekly rotation per tier), and make sure the people who write the code carry the pager ("you build it, you run it") or at least share it.</p>
      <p><b>Capacity and launch practices:</b> production readiness reviews before a service goes live (SLOs, dashboards, alerts, runbooks, rollback plan, capacity), load tests, and gradual rollouts. <b>Reliability culture:</b> blameless postmortems, game days, and tracking action items. Reliability is a feature that must be planned with the roadmap.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI agents can take over a chunk of toil (triage a ticket, restart a known-bad job, generate a report), which is exactly what SRE wants, but they are also a new class of toil and risk: prompts to tune, evals to run, model providers whose outages burn your error budget. Include the model API in your dependency math (a provider at 99.5% caps your feature near that unless you add fallbacks, caching or a smaller backup model). New on-call needs appear: cost spikes from runaway loops, quality regressions after a model upgrade.</p>
      <p><b>Use AI as a partner:</b> let it draft runbooks from past incident notes (then test them), summarise the on-call handover, classify last quarter's tickets into toil categories, and propose automation candidates ranked by hours saved. <b>Where AI goes wrong:</b> it writes confident runbook steps that were never run, invents SLO numbers, and automation it generates may lack safety limits (blast radius, rate limits, dry-run mode). <b>What you must still own:</b> the SLO choice with the business, the error-budget policy and its enforcement, protecting people from burnout, and approval for any automated action that can change production.</p>`,
    problems: [
      prob({
        title: 'Decide whether to ship: error budget policy', level: 'Easy', tags: ['SRE', 'error budget'], companies: ['Google', 'LinkedIn'],
        statement: `<p>Your SLO is 99.9% over 30 days (43.2 minutes). So far this month you have used 38 minutes. Product wants to ship a risky database migration on Friday. What do you say?</p>`,
        example: `<p>Used 38 / 43.2 = 88%. Left = 5.2 minutes = <b>12%</b>. ${H.c('r', 'Policy: only reliability fixes and small changes.')}</p>`,
        brute: `<p>"Reliability is my job, so I say no" or "Features come first, ship it". Both are opinions; neither uses the shared number, so the argument repeats every week.</p>`,
        mcq: { q: 'Budget left is 12%. A risky migration is planned. What does the policy suggest?', options: ['Ship normally', 'Delay it or make it much safer (canary, rollback plan), focus on reliability', 'Raise the SLO'], answer: 1, explain: 'Low remaining budget means little room for risk; reduce risk or delay.' },
        hints: [`<p>Hint 1: compute minutes left.</p>`, `<p>Hint 2: compare with the written policy tiers.</p>`, `<p>Hint 3: offer alternatives, not just "no": split the migration, rehearse it, schedule when budget resets.</p>`],
        approach: `<p>Budget is 43.2 minutes; 38 are used, so 5.2 minutes (12%) remain with days of the month still ahead. A risky migration could easily cost more than 5 minutes if it goes wrong, which would exhaust the budget and break the SLO. Under the agreed policy (below 20% left: reliability work and small safe changes only) the answer is: not on Friday as planned. Offer paths forward: break the migration into small reversible steps, rehearse it on production-sized data, add a rollback plan and a canary, use an online migration technique that avoids downtime, or schedule it after the window resets. Escalate nothing: the policy was agreed up front, so the number decides, not a personality. Also review why 38 minutes were used and fix those causes.</p>`
      }),
      prob({
        title: 'Cut toil on a two-person ops team', level: 'Medium', tags: ['SRE', 'toil', 'automation'], companies: ['Dropbox', 'Etsy'],
        statement: `<p>A team spends 25 of 40 hours per person per week on repetitive operational chores: restarting a stuck job (10 times a week), creating user accounts by request (15 per week), and renewing certificates by hand. How do you prioritise and reduce toil?</p>`,
        example: `<p>${H.table(['Chore', 'Hours/week', 'Best fix'], [['Restart stuck job', '4', 'find root cause, then auto-restart with limits'], ['Account requests', '8', 'self-service portal or SSO groups'], ['Cert renewal', '1', 'automated issuance (ACME)']])}</p>`,
        brute: `<p>Hire another person to do the chores. The work grows with traffic, so you will need another hire every year, and chores stay boring and error prone.</p>`,
        mcq: { q: 'A job gets stuck 10 times a week. Best long-term action?', options: ['Write a restart script and stop', 'Fix the root cause and add a safe auto-restart as a backstop', 'Ignore it'], answer: 1, explain: 'Automating a restart hides a bug; fix the cause, keep a limited automation as a safety net.' },
        hints: [`<p>Hint 1: measure hours per chore.</p>`, `<p>Hint 2: payback = hours saved per year / hours to build.</p>`, `<p>Hint 3: some chores should disappear (fix cause), some be automated, some be delegated as self-service.</p>`],
        approach: `<p>Measure first: tag tickets for two weeks to get hours per chore. Then rank by payback and by risk. Account creation is the biggest (about 8 hours a week): build self-service with approval rules, or drive access from SSO and groups, which also improves security. Certificate renewal is small but outages when forgotten are severe: automate with ACME and alert on expiry 30 days ahead. The stuck job: ask why it hangs (a lock, a missing timeout, a bad dependency), fix it, and keep a limited auto-restart (max N per hour, alert if hit) so it never silently loops. Track toil as a percentage each month; goal under 50%, then lower. Reserve a fixed share of each sprint for toil reduction, and make the savings visible so the team keeps getting funding for it.</p>`
      })
    ]
  });

  /* ================================================================
     TOPIC 8 - Feature flags and safe deploys
     ================================================================ */
  topics.push({
    title: 'Feature Flags and Safe Deploys: Canary, Progressive Delivery, Auto Rollback',
    analogy: `<p>A restaurant adds a new dish. It does not replace the whole menu on Saturday night. First the chef serves it to <b>one table</b> (canary), watches whether people enjoy it and nobody gets sick, then offers it to 5 tables, then half the room, then everyone. If the first table sends it back, the waiter removes it from the menu card <b>instantly</b>, without rebuilding the kitchen (a feature flag). That is progressive delivery with a kill switch.</p>`,
    explain: `<p>Two different things, often mixed up: <b>deploy</b> = putting new code on servers; <b>release</b> = letting users see the new behaviour. A <b>feature flag</b> (toggle) separates them: code ships "dark" behind <code>if (flag.isOn(user))</code> and you turn it on later, for 1% of users, then more, and off again in seconds if something is wrong.</p>
      ${H.table(['Technique', 'How it works', 'Rollback speed'], [
        ['Big-bang deploy', 'replace everything at once', '<span class="c-r">slow, everyone affected</span>'],
        ['Rolling update', 'replace a few instances at a time', 'medium'],
        ['Blue-green', 'run old (blue) and new (green) side by side; switch traffic', '<span class="c-g">fast: switch back</span>'],
        ['Canary', 'send 1-5% of traffic to the new version, compare metrics with the old, then grow', '<span class="c-g">fast, small blast radius</span>'],
        ['Feature flag', 'turn behaviour on per user or percentage at runtime', '<span class="c-g">seconds, no deploy</span>']
      ])}
      <p><b>Progressive delivery</b> automates the canary: 1% &rarr; 5% &rarr; 25% &rarr; 100%, and at every step a controller compares the canary against the baseline on SLO metrics (error ratio, latency percentiles, saturation, business metrics). If it is worse than the allowed margin, <b>automatic rollback</b>; if healthy for the bake time, promote. Key safety habits: backward-compatible database changes (expand, migrate, contract), small changes, and flags with an owner and an expiry date (delete them once fully rolled out, otherwise they rot into a pile of dead branches).</p>`,
    clues: ['"how do you deploy without downtime / roll back quickly?"', '"canary" / "blue-green" / "progressive delivery" / "dark launch"', '"how to test in production safely" - flags, canary, shadow traffic', '"a bad release took us down" - blast radius, automatic rollback', '"turn the feature off without redeploying" - kill switch', '"decide promote or rollback from metrics" - canary analysis vs baseline', '"database migration with zero downtime" - expand/contract']
    ,
    code: [
      {
        lang: 'python', run: true, title: 'Canary analysis: promote or rollback (runnable)', code: `# Compare canary vs baseline on a few metrics and decide: promote, hold, or rollback.
# Thresholds are small, agreed margins - not magic numbers.
MIN_REQUESTS = 500                       # do not decide on too little data

def decide(baseline, canary):
    if canary["requests"] < MIN_REQUESTS:
        return "HOLD", ["not enough traffic yet (%d requests)" % canary["requests"]]
    reasons = []
    # 1) error ratio: canary must not be worse by more than 0.5 percentage points
    if canary["error_pct"] - baseline["error_pct"] > 0.5:
        reasons.append("errors %.2f%% vs %.2f%%" % (canary["error_pct"], baseline["error_pct"]))
    # 2) latency: p95 must not be more than 20% slower
    if canary["p95_ms"] > baseline["p95_ms"] * 1.2:
        reasons.append("p95 %dms vs %dms" % (canary["p95_ms"], baseline["p95_ms"]))
    # 3) saturation: no new queueing
    if canary["queue"] > baseline["queue"] + 5:
        reasons.append("queue %d vs %d" % (canary["queue"], baseline["queue"]))
    # 4) business metric: conversion must not drop by more than 2 points
    if baseline["conversion_pct"] - canary["conversion_pct"] > 2.0:
        reasons.append("conversion %.1f%% vs %.1f%%" % (canary["conversion_pct"], baseline["conversion_pct"]))
    return ("ROLLBACK", reasons) if reasons else ("PROMOTE", ["all checks within margin"])

baseline = {"requests": 9500, "error_pct": 0.20, "p95_ms": 310, "queue": 1, "conversion_pct": 4.1}
cases = {
    "good canary":  {"requests": 500, "error_pct": 0.25, "p95_ms": 320, "queue": 2, "conversion_pct": 4.0},
    "slow canary":  {"requests": 520, "error_pct": 0.22, "p95_ms": 480, "queue": 9, "conversion_pct": 3.9},
    "silent break": {"requests": 510, "error_pct": 0.20, "p95_ms": 300, "queue": 1, "conversion_pct": 1.2},
    "too little":   {"requests": 80,  "error_pct": 0.00, "p95_ms": 250, "queue": 0, "conversion_pct": 4.5},
}
for name, c in cases.items():
    verdict, why = decide(baseline, c)
    print("%-13s -> %-8s %s" % (name, verdict, "; ".join(why)))`
      },
      {
        lang: 'js', run: true, title: 'Percentage rollout flag with sticky bucketing (runnable)', code: `// A flag decides per user, deterministically, so a user does not flip-flop between versions.
function hash(str) {                         // small stable string hash (FNV-1a style)
  var h = 2166136261;
  for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}
var flags = {
  'new-checkout': { enabled: true, percent: 10, allow: ['user-vip-1'], killSwitch: false }
};
function isOn(flagName, userId) {
  var f = flags[flagName];
  if (!f || f.killSwitch || !f.enabled) return false;       // kill switch wins
  if (f.allow.indexOf(userId) >= 0) return true;            // allow-list (internal testers)
  var bucket = hash(flagName + ':' + userId) % 100;         // 0..99, stable per user and flag
  return bucket < f.percent;
}
var on = 0, total = 2000;
for (var i = 0; i < total; i++) if (isOn('new-checkout', 'user-' + i)) on++;
console.log('rollout 10% -> actually ' + (on / total * 100).toFixed(1) + '% of users');
console.log('same user twice:', isOn('new-checkout', 'user-7'), isOn('new-checkout', 'user-7'));
console.log('vip allow-list:', isOn('new-checkout', 'user-vip-1'));
flags['new-checkout'].killSwitch = true;                    // incident! one switch, no deploy
console.log('after kill switch:', isOn('new-checkout', 'user-vip-1'));`
      },
      {
        lang: 'yaml', check: false, title: 'Progressive delivery with automatic rollback (Argo Rollouts shape)', code: `# check:false - Kubernetes custom resource for Argo Rollouts.
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata: { name: checkout }
spec:
  replicas: 10
  strategy:
    canary:
      steps:
        - setWeight: 5
        - pause: { duration: 10m }
        - analysis: { templates: [{ templateName: slo-check }] }   # fails -> auto rollback
        - setWeight: 25
        - pause: { duration: 10m }
        - setWeight: 50
        - pause: { duration: 10m }
        - setWeight: 100
---
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata: { name: slo-check }
spec:
  metrics:
    - name: error-ratio
      interval: 1m
      failureLimit: 2
      successCondition: result[0] < 0.01
      provider:
        prometheus:
          address: http://prometheus:9090
          query: sum(rate(http_requests_total{app="checkout",status=~"5..",rollouts_pod_template_hash="{{args.canary-hash}}"}[2m])) / sum(rate(http_requests_total{app="checkout",rollouts_pod_template_hash="{{args.canary-hash}}"}[2m]))`
      }
    ],
    viz: [
      {
        title: 'Canary metrics decide: promote or rollback',
        input: '0.9 520',
        inputLabel: 'Canary error % and canary p95 ms (baseline: 0.2% and 310 ms)',
        gen: function (input) {
          var a = nums(input, 2, 2, 'Enter two numbers: canary error% and p95 ms, e.g. 0.9 520');
          var ce = Math.max(0, a[0]), cp95 = Math.max(1, a[1]);
          var be = 0.2, bp = 310;
          var errBad = ce - be > 0.5, latBad = cp95 > bp * 1.2;
          var verdict = (errBad || latBad) ? 'ROLLBACK' : 'PROMOTE';
          var f = [];
          f.push({ narr: 'We deploy the new version to <b>5%</b> of traffic (the canary). The other 95% still run the old version (the baseline). Both receive the same kind of users.', parts: [{ type: 'table', label: 'Stage 1: 5% canary', columns: ['version', 'traffic', 'status'], rows: [['baseline v2.13', '95%', 'serving'], ['canary v2.14', '5%', 'serving']], hl: { 1: 'cur' } }] });
          f.push({ narr: 'Compare error ratio. Baseline <b>' + be + '%</b>, canary <b>' + ce + '%</b>. Allowed margin: +0.5 points. ' + (errBad ? '<span class="c-r">Too many errors.</span>' : '<span class="c-g">Within margin.</span>'), parts: [{ type: 'table', label: 'Check 1: errors', columns: ['metric', 'baseline', 'canary', 'limit', 'result'], rows: [['error %', be, ce, '+0.5', errBad ? 'FAIL' : 'pass']], hl: { 0: errBad ? 'bad' : 'ok' } }] });
          f.push({ narr: 'Compare p95 latency. Baseline <b>' + bp + ' ms</b>, canary <b>' + cp95 + ' ms</b>. Limit: 20% slower = ' + Math.round(bp * 1.2) + ' ms. ' + (latBad ? '<span class="c-r">Too slow.</span>' : '<span class="c-g">Within margin.</span>'), parts: [{ type: 'table', label: 'Check 2: latency', columns: ['metric', 'baseline', 'canary', 'limit', 'result'], rows: [['p95 ms', bp, cp95, Math.round(bp * 1.2), latBad ? 'FAIL' : 'pass']], hl: { 0: latBad ? 'bad' : 'ok' } }, { type: 'bars', label: 'p95 ms', values: [bp, cp95, Math.round(bp * 1.2)], idxLabels: ['baseline', 'canary', 'limit'], hl: { 0: 'ok', 1: latBad ? 'bad' : 'ok', 2: 'done' } }] });
          f.push({ narr: 'Decision table. Any failed check means <b>' + verdict + '</b>. ' + (verdict === 'ROLLBACK' ? 'The controller sends 100% of traffic back to the baseline in seconds, and only 5% of users saw the problem.' : 'Move to 25%, bake again, and repeat the same checks.'), parts: [{ type: 'table', label: 'Verdict', columns: ['error check', 'latency check', 'decision'], rows: [[errBad ? 'FAIL' : 'pass', latBad ? 'FAIL' : 'pass', verdict]], hl: { 0: verdict === 'ROLLBACK' ? 'bad' : 'ok' } }] });
          f.push({ narr: 'Remember the traps: wait for enough traffic (small samples lie), compare with the baseline <em>at the same time</em> (not with yesterday), and include a business metric such as conversion, because some bugs return HTTP 200 and still break things.', parts: [{ type: 'table', label: 'Checklist', columns: ['rule', 'why'], rows: [['minimum sample size', 'avoid noise decisions'], ['compare with live baseline', 'removes time-of-day effects'], ['include business metric', 'catches silent failures'], ['auto-rollback', 'faster than a human']], hl: { 2: 'sel' } }] });
          return f;
        }
      },
      {
        title: 'Progressive rollout stages',
        input: '25',
        inputLabel: 'Stage where a problem appears (5, 25, 50 or 100)',
        gen: function (input) {
          var stages = [1, 5, 25, 50, 100];
          var bad = Math.round(num(input, 25, 1, 100));
          var f = [], reached = [];
          for (var i = 0; i < stages.length; i++) {
            var s = stages[i];
            reached.push(s);
            var fail = s === bad || (s > bad && false);
            var users = Math.round(s * 10);
            f.push({ narr: 'Stage ' + (i + 1) + ': <b>' + s + '%</b> of traffic on the new version (about ' + users + ' of every 1000 users). ' + (fail ? '<span class="c-r">Metrics fail: auto-rollback!</span>' : 'Metrics pass, bake, continue.'), parts: [{ type: 'bars', label: 'Traffic on new version (%)', values: reached.slice(), idxLabels: reached.map(function (x) { return x + '%'; }), hl: (function () { var h = {}; h[reached.length - 1] = fail ? 'bad' : 'ok'; return h; })() }, { type: 'vars', vals: { stage: s + '%', users_exposed_per_1000: users, status: fail ? 'ROLLBACK' : 'healthy' }, hl: { status: fail ? 'bad' : 'ok' } }] });
            if (fail) { f.push({ narr: 'Rolled back to 0%. Blast radius: only ' + users + ' per 1000 users saw the bug. A big-bang release would have hit all 1000.', parts: [{ type: 'bars', label: 'Exposure: progressive vs big bang (per 1000 users)', values: [users, 1000], idxLabels: ['progressive', 'big bang'], hl: { 0: 'ok', 1: 'bad' } }] }); return f; }
          }
          f.push({ narr: 'All stages passed; the feature is at 100%. Now remove the flag and the old code path.', parts: [{ type: 'text', html: '<b>Clean up:</b> flags have an owner and an expiry date.' }] });
          return f;
        }
      }
    ],
    examples: [
      { title: 'Types of flags and their lifetimes', html: `<p>${H.table(['Type', 'Purpose', 'Lifetime'], [['Release flag', 'hide unfinished or new feature, gradual rollout', 'days to weeks, then delete'], ['Ops / kill switch', 'turn off an expensive or risky path in an incident', 'long-lived, keep'], ['Experiment flag', 'A/B test variants', 'until the result is known'], ['Permission flag', 'features per plan or customer', 'long-lived']])}</p><p>Treat release flags as debt: owner, ticket, and an expiry reminder.</p>` },
      { title: 'Zero-downtime database change: expand, migrate, contract', html: `<p>Renaming a column in one deploy breaks the old version still running. Do it in steps: (1) <b>expand</b>: add the new column, code writes both; (2) <b>migrate</b>: backfill old rows; (3) switch reads to the new column; (4) <b>contract</b>: stop writing the old one, drop it in a later release. Each step is safe to roll back because old and new code both work against the schema.</p>` },
      { title: 'Decide rollback from canary metrics', html: `<p>Baseline error 0.2%, p95 310 ms. Canary after 600 requests: error 0.25%, p95 330 ms, conversion 4.0 vs 4.1. All within margin: <b>promote</b>. Another canary: error 0.2%, p95 300 ms, but conversion 1.2% vs 4.1%: the technical metrics are fine but orders dropped, so <b>rollback</b>. Always include one metric that represents the business outcome.</p>` },
      { title: 'Blue-green vs canary', html: `<p>Blue-green gives an instant, full switch and an instant switch back, but needs double capacity and exposes everyone at once after the switch. Canary exposes few users first and finds problems with real traffic, but takes longer and needs good metrics. Many teams combine them: green environment, then shift traffic gradually.</p>` }
    ],
    deepDive: `<p><b>Canary analysis statistics.</b> Small samples are noisy: 3 errors in 50 requests is 6%, but it means little. Require a minimum request count and compare confidence intervals or use a sequential test (e.g. Kayenta-style Mann-Whitney or sequential probability ratio tests) instead of fixed thresholds only. Compare canary pods against a <em>fresh baseline</em> deployed from the old version at the same time (not the long-running production), to remove warm-up and cache effects. Pick metrics from RED/USE plus a business metric, and add "guardrail" checks that never regress (error budget burn, crash loops, memory growth).</p>
      <p><b>Flag system design.</b> Evaluate flags locally from a cached ruleset streamed from a flag service (so a flag-service outage does not break requests), with safe defaults per flag, and log the evaluation (flag, variant, user bucket) into spans and logs so you can correlate a problem with a variant. Use consistent hashing of (flag, user id) for sticky buckets. Test both branches in CI; remove flags after rollout; avoid nesting flags (combinatorial explosion); limit who can flip production flags, audit every change, and treat flag changes like deploys (they have caused major outages). Never put secrets in flag payloads.</p>
      <p><b>Rollback reality.</b> Rolling back code is easy; rolling back <b>data</b> is not. Make migrations backward compatible, keep the previous version able to read what the new version writes (forward and backward compatible message formats), and be careful with irreversible actions (emails sent, payments captured). Practise the rollback: an untested rollback button is a hope. Other safeguards: deploy windows and change freezes around peak periods, deploy small and often (small diffs are easier to reason about), dark launches / shadow traffic to test with real inputs without user impact, and automatic halt on SLO burn.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI features ship through the same safe-delivery path, and need it more. A new model version, system prompt or retrieval setting can change behaviour for every user with no code change, so gate each with flags and run canaries, comparing quality metrics (eval score on live samples, thumbs-down rate, refusal rate, cost per request, time to first token) between old and new. Shadow mode lets the new model answer silently while the old one serves, so you can compare offline. AI coding assistants also increase the volume of changes, which makes small batches, flags, and automatic rollbacks more valuable.</p>
      <p><b>Use AI as a partner:</b> have it review a rollout plan for missing guardrails, write the analysis queries, or draft the runbook for flipping the kill switch (then rehearse it). <b>Where AI goes wrong:</b> it generates flag code that is never cleaned up, forgets a default for when the flag service is down, and writes DB migrations that drop columns in one step. Beware auto-merge pipelines driven by agents without canary gates. <b>What you must still own:</b> blast-radius thinking, the promote/rollback criteria, who may flip production flags, and removing dead flags.</p>`,
    problems: [
      prob({
        title: 'Decide rollback from canary metrics', level: 'Medium', tags: ['canary', 'rollback', 'progressive delivery'], companies: ['Netflix', 'Spotify'],
        statement: `<p>Baseline: error 0.20%, p95 310 ms, conversion 4.1%. Canary (5% traffic, 800 requests): error 0.28%, p95 340 ms, conversion 3.0%. Margins: errors +0.5 points, p95 +20%, conversion -2 points. Promote or rollback? Explain.</p>`,
        example: `<p>${H.table(['metric', 'baseline', 'canary', 'limit', 'result'], [['error %', '0.20', '0.28', '+0.5', '<span class="c-g">pass</span>'], ['p95 ms', '310', '340', '372', '<span class="c-g">pass</span>'], ['conversion %', '4.1', '3.0', '-2.0 (2.1)', '<span class="c-g">pass, barely</span>']])}</p><p>Conversion fell 1.1 points: within the margin, but a big relative drop (27%). Hold and investigate.</p>`,
        brute: `<p>Look only at HTTP errors and latency, see green, and promote to 100%. The business metric silently dropped by a quarter and nobody notices until revenue reports arrive.</p>`,
        mcq: { q: 'All technical checks pass, but conversion dropped by 27% (relative). Best action?', options: ['Promote, technical metrics are fine', 'Hold or roll back and investigate: a business regression can hide behind HTTP 200', 'Ignore conversion, it is marketing'], answer: 1, explain: 'Silent failures show up in business metrics. 800 requests is also a small sample, so keep the canary at the current stage and gather more data.' },
        hints: [`<p>Hint 1: check each metric against its margin.</p>`, `<p>Hint 2: think about relative size and sample size, not only absolute margin.</p>`, `<p>Hint 3: decisions: promote, hold (collect more data), rollback. Pick the safest reversible one.</p>`],
        approach: `<p>Error: 0.28 vs 0.20 is +0.08 points, within the +0.5 margin. p95: 340 vs 310 is +9.7%, inside +20%. Conversion: 3.0 vs 4.1 is -1.1 points, inside the -2 point margin, but it is a 27% relative drop, which is large for a business metric, and 800 requests give few purchases (about 24 vs 33), so the signal is noisy. A safe decision is <b>hold at 5%</b> and gather more traffic (or extend the bake time), with an automatic rollback if conversion keeps falling; if the confidence interval confirms a real drop, roll back and investigate (a new checkout step, a slow third-party script, a UI bug). Do not promote. Improve the process: use relative margins for business metrics, require a minimum number of conversions, and use a statistical test. Record the decision in the rollout log so the postmortem or review can learn from it.</p>`
      }),
      prob({
        title: 'Design a safe rollout for a risky checkout rewrite', level: 'Hard', tags: ['feature flags', 'canary', 'migration'], companies: ['Amazon', 'Stripe'],
        statement: `<p>You are replacing the payments call in checkout with a new provider integration. Money is involved and a rollback must be possible at any time. Describe the full rollout plan: flags, stages, metrics, rollback triggers, data concerns.</p>`,
        example: `<p>${H.table(['Stage', 'Exposure', 'Gate'], [['0 dark', '0% real, 100% shadow calls', 'results match old provider &gt; 99.9%'], ['1 internal', 'staff accounts', 'no errors'], ['2 canary', '1% then 5%', 'errors, p95, conversion, refunds'], ['3 ramp', '25, 50%', 'same + reconciliation'], ['4 full', '100%, old path kept 2 weeks', 'then remove flag']])}</p>`,
        brute: `<p>Deploy the new integration to all servers on Monday morning with no flag. If it breaks, rollback means redeploying the old build, during which customers cannot pay, and half-processed payments need manual cleanup.</p>`,
        mcq: { q: 'What makes a payment rollout reversible?', options: ['A fast CI pipeline', 'A flag that routes per request, idempotency keys, and reconciliation of in-flight payments', 'Doing it at night'], answer: 1, explain: 'You need to switch routing instantly and make sure no payment is lost or charged twice.' },
        hints: [`<p>Hint 1: separate deploy from release with a per-request flag.</p>`, `<p>Hint 2: shadow mode and tiny stages first; pick gates before starting.</p>`, `<p>Hint 3: money-specific risks: double charge, lost payment, reconciliation, idempotency, refunds.</p>`],
        approach: `<p>Deploy the new code dark, behind a flag <code>payments-new-provider</code> with a kill switch and the default set to the old provider (including when the flag service is unavailable). Stage 0, shadow: send a copy of each request to the new provider in test mode (or a no-money verify call) and compare results offline; never block the user. Stage 1: staff and allow-listed test accounts with real small payments. Stage 2: canary 1% then 5% of users, sticky by user id so a customer does not switch providers mid-order, with automatic analysis comparing payment success rate, error ratio, p95 latency, timeouts, refund and chargeback rate, and conversion against the old path at the same time. Rollback triggers are defined in advance (for example success rate down more than 0.5 points, or any double-charge). Stage 3: 25% and 50% with daily reconciliation of ledger versus provider reports. Stage 4: 100%, keep the old path and the switch for two weeks, then delete the flag. Data concerns: use idempotency keys on every charge so retries and rollbacks cannot double charge, store which provider handled each payment, make refunds go back to the original provider, and keep the database schema backward compatible (expand/contract). Run the rollback in a rehearsal first, have an incident roles plan and a communication template, avoid peak periods, and watch error budget burn during each stage.</p>`
      })
    ]
  });

  /* ================================================================
     PRACTICE (Easy -> Medium -> Hard)
     ================================================================ */
  practice.push(prob({
    title: 'Name the missing fields in a log line', level: 'Easy', tags: ['logging', 'structured'],
    statement: `<p>This line is written when a payment fails: <code>{"msg":"Payment failed for user 42: timeout after 3000 ms"}</code>. List what is wrong and write a better version.</p>`,
    example: `<p>${H.c('g', '{"level":"error","msg":"payment failed","request_id":"req-7f3a9c","user_id":42,"error.type":"timeout","duration_ms":3000}')}</p>`,
    brute: `<p>Leave it as a sentence. Searching for all timeouts needs regex, the user and time are buried, and nothing links it to the request.</p>`,
    mcq: { q: 'What is the biggest problem?', options: ['It is too short', 'Values are glued into the message and there is no request id, level or timestamp', 'It uses JSON'], answer: 1, explain: 'Stable message plus named fields plus request id are the basics.' },
    hints: [`<p>Hint 1: what would you search for at 3 am?</p>`, `<p>Hint 2: move numbers out of the text.</p>`, `<p>Hint 3: add level, ts, request_id, error type; do not log secrets.</p>`],
    approach: `<p>Problems: the message changes with every value so you cannot group failures; user id, error kind and duration are inside text; there is no level, timestamp, service name, or request id to connect it to other services. A better line has a stable message ("payment failed"), a level (error or warn depending on whether it is expected), and fields: ts, service, request_id (and trace_id), user_id, error.type, duration_ms. Also avoid logging card data. Then a single query such as error.type=timeout AND duration_ms&gt;2000 works, and the request id lets you open the full journey.</p>`
  }));
  practice.push(prob({
    title: 'Counter, gauge or histogram?', level: 'Easy', tags: ['metrics', 'types'],
    statement: `<p>Choose the metric type for: (a) total orders placed, (b) current number of open DB connections, (c) time to process each order, (d) memory used right now.</p>`,
    example: `<p>${H.table(['Item', 'Type'], [['a', 'counter'], ['b', 'gauge'], ['c', 'histogram'], ['d', 'gauge']])}</p>`,
    brute: `<p>Use a gauge for everything and compute differences by hand. Restarts reset values and you lose the rate or the distribution.</p>`,
    mcq: { q: 'Time per order should be stored as', options: ['gauge of the last value', 'histogram', 'counter'], answer: 1, explain: 'A histogram keeps the distribution so you can compute percentiles.' },
    hints: [`<p>Hint 1: does it only go up?</p>`, `<p>Hint 2: can it go up and down?</p>`, `<p>Hint 3: do you need percentiles?</p>`],
    approach: `<p>(a) Orders placed only goes up: a counter; graph it as a rate per minute (rate handles restarts). (b) Open connections go up and down: a gauge. (c) Order processing time varies per event and you need the tail: a histogram with buckets near your SLO, giving p50, p95, p99 and the ability to merge across instances. (d) Memory right now goes up and down: a gauge. Rule: counters for events, gauges for current levels, histograms for durations and sizes.</p>`
  }));
  practice.push(prob({
    title: 'Symptom or cause? Classify the alerts', level: 'Easy', tags: ['alerting', 'symptoms'],
    statement: `<p>Classify as page, ticket, or dashboard only: (1) CPU 90% for 10 min, (2) checkout 5xx ratio burning budget 15x, (3) disk will fill in 3 days, (4) one pod restarted, (5) p99 latency over SLO for 15 min.</p>`,
    example: `<p>${H.table(['#', 'Class'], [['1', 'dashboard'], ['2', '<span class="c-r">page</span>'], ['3', 'ticket'], ['4', 'dashboard'], ['5', '<span class="c-r">page</span>']])}</p>`,
    brute: `<p>Page on all five. On-call is woken for harmless events, learns to ignore the pager, and misses the real ones.</p>`,
    mcq: { q: 'Which one should wake someone up?', options: ['CPU 90%', 'Checkout error budget burning 15x too fast', 'One pod restarted'], answer: 1, explain: 'Users are being hurt and the problem needs a human now.' },
    hints: [`<p>Hint 1: are users hurting right now?</p>`, `<p>Hint 2: how soon must a human act?</p>`, `<p>Hint 3: is it a cause or a symptom?</p>`],
    approach: `<p>Page only for urgent user-visible symptoms: (2) the fast burn on checkout and (5) latency over SLO for a sustained period. (3) Disk filling in three days is real but not urgent: a ticket for working hours. (1) High CPU and (4) a single pod restart are causes or self-healing events: keep them on a dashboard for debugging, since they may not hurt users at all. If CPU matters it will show up as latency or errors, which are paged on. This keeps the pager rare and trusted.</p>`
  }));
  practice.push(prob({
    title: 'How much downtime does 99.95% allow?', level: 'Easy', tags: ['SLO', 'error budget'],
    statement: `<p>An SLO is 99.95% over 30 days. How many minutes of full outage are allowed? If a service does 20 million requests a month, how many failed requests?</p>`,
    example: `<p>Budget 0.05%. 30 days = 43,200 min, so 0.0005 &times; 43,200 = <b>21.6 min</b>. 0.0005 &times; 20,000,000 = <b>10,000 failed requests</b>.</p>`,
    brute: `<p>Guess "a bit under an hour". Wrong by a factor of two, and the team plans maintenance and rollbacks against a wrong number.</p>`,
    mcq: { q: 'What is the error budget fraction of 99.95%?', options: ['0.5%', '0.05%', '0.005%'], answer: 1, explain: '100 - 99.95 = 0.05 percent.' },
    hints: [`<p>Hint 1: budget = 1 - SLO.</p>`, `<p>Hint 2: minutes in 30 days = 30 &times; 24 &times; 60.</p>`, `<p>Hint 3: multiply budget by minutes or by request count.</p>`],
    approach: `<p>Budget fraction = 1 - 0.9995 = 0.0005. A 30 day period has 43,200 minutes, so the allowed full outage is 43,200 &times; 0.0005 = 21.6 minutes. For 20 million requests, 0.0005 &times; 20,000,000 = 10,000 failed requests may be spent. Practical meaning: one 15 minute outage uses about 70% of the month, and a single manual failover taking 10 minutes already uses almost half. This is why higher SLOs need automation.</p>`
  }));
  practice.push(prob({
    title: 'Design metric labels without exploding cardinality', level: 'Medium', tags: ['metrics', 'cardinality'],
    statement: `<p>A teammate proposes labels <code>user_id</code>, <code>url</code> (with query string), <code>pod</code>, <code>route</code>, <code>status</code> on <code>http_requests_total</code>. There are 2M users and 800 routes. What goes wrong and what do you keep?</p>`,
    example: `<p>Series count is the product of label values: 2M users &times; 800 routes &times; 5 statuses = 8 billion potential series.</p>`,
    brute: `<p>Keep every label "just in case". The metrics database runs out of memory, queries time out, the bill explodes, and the dashboards go blank during an incident.</p>`,
    mcq: { q: 'Where should per-user detail go?', options: ['Metric labels', 'Logs and traces', 'Nowhere'], answer: 1, explain: 'Logs and traces handle high cardinality; metric labels must be bounded.' },
    hints: [`<p>Hint 1: count possible values per label.</p>`, `<p>Hint 2: ask which labels you actually filter on.</p>`, `<p>Hint 3: use route templates, status classes, and put ids in logs/traces with exemplars.</p>`],
    approach: `<p>Every unique combination of label values becomes a separate time series that is held in memory and indexed, so the cost is the product of the label cardinalities. user_id (2M) and raw url with query strings (unbounded) are the killers. Keep: route as the template (<code>/orders/{id}</code>, about 800), method, status_class (2xx, 4xx, 5xx), and maybe region and version (small sets). Pod can be kept on infrastructure metrics but is usually dropped on request metrics because pods churn. Move user_id and raw url to logs and trace attributes, and use exemplars to link a slow histogram bucket to a specific trace. Add a limit in the metrics pipeline (drop labels or series above a cap) and an alert on series count growth.</p>`
  }));
  practice.push(prob({
    title: 'Choose a trace sampling strategy', level: 'Medium', tags: ['tracing', 'sampling', 'cost'],
    statement: `<p>You serve 5,000 requests per second, each trace has about 30 spans. Storage budget allows about 5% of that. Errors are 0.3% of requests and you must be able to debug every error and every request over 2 seconds. Design the sampling.</p>`,
    example: `<p>5,000/s &times; 86,400 = 432M traces a day. 5% is 21.6M. Errors alone (0.3%) are 1.3M a day, which fits easily.</p>`,
    brute: `<p>Head sample 5% at random. You keep about 5% of the errors and slow traces, so the one failure a customer reports is almost always missing.</p>`,
    mcq: { q: 'Which can keep 100% of error traces?', options: ['Head sampling', 'Tail sampling', 'No sampling at all is the only way'], answer: 1, explain: 'Only after the trace ends do you know it had an error or was slow.' },
    hints: [`<p>Hint 1: when do you know if a trace is interesting?</p>`, `<p>Hint 2: tail sampling needs all spans of a trace in one place.</p>`, `<p>Hint 3: compute metrics from all traffic before sampling so RED stays exact.</p>`],
    approach: `<p>Use tail sampling in the Collector tier. Route spans by trace id to a consistent collector (load-balancing exporter) so each collector sees whole traces. Policies in order: keep 100% of traces with an error status, keep 100% with latency over 2 s, keep 100% of traces for flagged or VIP debugging, and keep a small probabilistic baseline (for example 2%) of the rest to show normal behaviour. Estimated volume: errors 0.3% + slow (say 0.5%) + 2% baseline is under 3%, within the 5% budget; add a rate limiter per route so one noisy endpoint cannot use all the budget. Generate RED metrics from the unsampled span stream (span metrics connector) so dashboards are exact. Watch the collector memory (decision wait window times traffic), and keep a fallback head sampler if the collectors are overloaded. Document that sampled-out requests have logs and metrics only.</p>`
  }));
  practice.push(prob({
    title: 'Fix a zero-downtime rename with flags and expand/contract', level: 'Medium', tags: ['safe deploys', 'migration', 'rollback'],
    statement: `<p>You need to rename the column <code>orders.total</code> to <code>orders.total_cents</code> (and change the type) on a busy service. How do you do it with no downtime and a rollback possible at each step?</p>`,
    example: `<p>${H.table(['Step', 'Schema', 'Code'], [['1 expand', 'add total_cents', 'writes both columns'], ['2 backfill', 'fill old rows', 'reads old'], ['3 switch', '-', 'reads new, behind a flag'], ['4 contract', 'drop total (later release)', 'writes only new']])}</p>`,
    brute: `<p>Run <code>ALTER TABLE ... RENAME COLUMN</code> and deploy new code at the same time. During the rollout old pods break, and rollback cannot restore data written under the new schema.</p>`,
    mcq: { q: 'Why keep writing both columns for a while?', options: ['To waste space', 'So old and new code versions both work and rollback is safe', 'It is required by SQL'], answer: 1, explain: 'During rollout two code versions run together, and both must read valid data.' },
    hints: [`<p>Hint 1: two versions of code run at once during a deploy.</p>`, `<p>Hint 2: every step must be safe for both versions.</p>`, `<p>Hint 3: add, backfill (in small batches), switch reads with a flag, stop writing old, drop later.</p>`],
    approach: `<p>Step 1 (expand): add the nullable <code>total_cents</code> column; this is backward compatible. Step 2: release code that writes both columns on every insert and update, still reading the old one. Step 3 (backfill): fill existing rows in small batches with throttling and monitor replication lag and locks. Step 4: put the read path behind a flag <code>read-total-cents</code>; verify with dual-read comparison logging for mismatches; ramp 1%, 10%, 100%, with a kill switch to go back to old reads. Step 5: stop writing the old column in a new release and wait until the previous version is fully gone. Step 6 (contract): drop the old column in a later migration after a safe delay (and a backup). At every step the previous version of the code still works, so a rollback is a flag flip or a redeploy, never a data repair. Remove the flag afterwards.</p>`
  }));
  practice.push(prob({
    title: 'Read a trace with retries and a gap', level: 'Medium', tags: ['tracing', 'critical path', 'retries'],
    statement: `<p>Trace for <code>GET /report</code> (total 5200 ms): auth 0-30; <code>fetch-data</code> 40-4900 with three child spans <code>HTTP data-svc</code> at 50-1050, 1500-2500, 2950-3950 (each returns 503 except the last); then nothing until 4900; <code>render</code> 4900-5150. List the findings.</p>`,
    example: `<p>${H.table(['Observation', 'Meaning'], [['3 calls to data-svc', 'two retries'], ['gaps of 450 ms between calls', 'backoff sleep'], ['each call ~1000 ms and 503', 'dependency slow and failing, no timeout'], ['950 ms gap at the end', 'uninstrumented work or waiting']])}</p>`,
    brute: `<p>Optimise render (250 ms) because it is the last step. It accounts for under 5% of the time.</p>`,
    mcq: { q: 'The biggest win is', options: ['Making render faster', 'Fixing data-svc and adding a shorter timeout and a circuit breaker', 'Removing auth'], answer: 1, explain: 'The retry chain to a failing dependency uses about 90% of the request.' },
    hints: [`<p>Hint 1: where is most of the time?</p>`, `<p>Hint 2: what do repeated identical spans mean?</p>`, `<p>Hint 3: look at gaps between spans: waits, backoff, uninstrumented code.</p>`],
    approach: `<p>Almost 4.9 s of the 5.2 s sits in fetch-data. Inside it are three attempts to data-svc, the first two failing with 503 after about a second each (so no short timeout: failing slowly is worse than failing fast), separated by roughly 450 ms of backoff sleeps. Together that is the critical path. The tail gap from 3950 to 4900 has no child span: something uninstrumented (deserialising a big payload, a lock, a queue) or waiting; add spans to find out. Fixes: reduce the timeout per attempt (for example 300 ms), limit retries with jitter and a retry budget, add a circuit breaker so a failing dependency fails fast, investigate why data-svc returns 503 (capacity or a bug) using its own traces and metrics, and cache the report data where acceptable. Render is just 250 ms and not worth optimising now.</p>`
  }));
  practice.push(prob({
    title: 'Pick the right deploy strategy', level: 'Medium', tags: ['deploy', 'blue-green', 'canary'],
    statement: `<p>Pick rolling, blue-green, canary or feature flag for each: (a) a stateless internal API with good tests, (b) a payments change affecting money, (c) a new UI feature for marketing to enable on a date, (d) a database major-version upgrade.</p>`,
    example: `<p>${H.table(['Case', 'Pick'], [['a', 'rolling'], ['b', 'canary + flag'], ['c', 'feature flag'], ['d', 'blue-green style cutover with rehearsal']])}</p>`,
    brute: `<p>Use one strategy (big-bang at midnight) for everything. Simple, but the riskiest changes get the least protection.</p>`,
    mcq: { q: 'Marketing wants a feature to go live at 9:00 sharp. Best tool?', options: ['A deploy at 9:00', 'A feature flag flipped at 9:00', 'Blue-green'], answer: 1, explain: 'Ship the code earlier, release by flipping the flag.' },
    hints: [`<p>Hint 1: how bad is a failure?</p>`, `<p>Hint 2: how fast must rollback be?</p>`, `<p>Hint 3: is state (data) involved?</p>`],
    approach: `<p>Match risk to protection. (a) A stateless internal API with good tests: a rolling update with health checks and readiness gates is enough and cheap. (b) Payments: canary with automatic analysis and a flag per request so rollback is instant, plus idempotency and reconciliation. (c) A feature released on a date: deploy the code days before behind a flag, then flip the flag at the chosen time; keep it as a kill switch. (d) A database major upgrade has state: use a rehearsed blue-green style cutover (replicate to the new version, test, switch, keep the old one for rollback with a plan for writes after the switch), and schedule with a communicated window. In all cases define metrics and rollback triggers in advance and keep changes small.</p>`
  }));
  practice.push(prob({
    title: 'Design observability for an e-commerce platform', level: 'Hard', tags: ['observability', 'design', 'SLO'], companies: ['Amazon', 'Shopify'],
    statement: `<p>You run an e-commerce platform with 15 microservices. Design the observability stack: logs, metrics, traces, SLOs, alerts, dashboards, and cost control. Keep it practical.</p>`,
    example: `<p>${H.table(['Signal', 'Tool shape', 'Use'], [['logs', 'JSON + request/trace id', 'details of one event'], ['metrics', 'RED/USE + business', 'health, alerts, SLOs'], ['traces', 'OTel + tail sampling', 'find the slow or failing hop']])}</p>`,
    brute: `<p>Each team picks its own logging format and tool, alerts on CPU and memory, and has no shared ids. In an incident people scroll through 15 dashboards and cannot connect events across services.</p>`,
    mcq: { q: 'What links the three signals together?', options: ['The same vendor', 'A shared trace id (and consistent service and route names) in logs, metrics exemplars and traces', 'Nothing, they are separate'], answer: 1, explain: 'Shared identifiers and naming let you pivot between signals.' },
    hints: [`<p>Hint 1: start from user journeys and SLOs (browse, cart, checkout, search).</p>`, `<p>Hint 2: one instrumentation standard (OpenTelemetry) and one collector pipeline.</p>`, `<p>Hint 3: cost: sampling, retention tiers, cardinality limits; and ownership: who responds.</p>`],
    approach: `<p><b>Standard:</b> OpenTelemetry SDKs/auto-instrumentation in every service, exporting OTLP to a Collector tier. Shared library sets resource attributes (service.name, version, env, region) so all signals use the same names. <b>Logs:</b> structured JSON, standard fields, trace_id and span_id on every line, a canonical per-request line, redaction at the logger, DEBUG off in production, retention tiers (7 days hot, 30 days cold, audit longer). <b>Metrics:</b> RED per route for every service, USE for databases, caches, queues and pools, plus business metrics (orders per minute, payment success rate); route templates only; cardinality limits. <b>Traces:</b> propagate W3C traceparent through HTTP, gRPC and the message bus; tail sampling keeps all errors and slow traces plus 2-5% baseline; span metrics computed before sampling. <b>SLOs:</b> per journey: checkout availability 99.95%, search latency 95% under 300 ms, order confirmation freshness; multi-window burn-rate alerts page, slow burn opens tickets. <b>Dashboards:</b> one overview per journey (RED + dependencies' USE), links from every panel to traces and logs, deploy markers. <b>Operations:</b> on-call per team with runbooks, incident process with roles, blameless postmortems, a monthly alert review, and a heartbeat for the monitoring itself. <b>Cost:</b> sampling, drop noisy logs, retention policy, per-team usage reports.</p>`
  }));
  practice.push(prob({
    title: 'Postmortem for a retry storm', level: 'Hard', tags: ['postmortem', 'resilience', 'incident'], companies: ['Cloudflare', 'Slack'],
    statement: `<p>A dependency (inventory) slowed for 2 minutes. Callers retried 3 times each, load tripled, inventory fell over, and the outage lasted 40 minutes even after the original cause had gone. Write the key analysis: contributing factors, 5 whys, and action items.</p>`,
    example: `<p>${H.table(['Time', 'Event'], [['12:00', 'inventory p99 rises (cause: a slow query, 2 min)'], ['12:02', 'callers time out and retry, traffic x3'], ['12:03', 'inventory saturated (pool 100%)'], ['12:05-12:40', 'retries continue, system stays down (metastable failure)'], ['12:40', 'retries disabled by flag, recovery']])}</p>`,
    brute: `<p>"Root cause: the slow query. Action: fix the query." That misses why a two minute blip became forty: the retry amplification, no circuit breaker, and no way to shed load.</p>`,
    mcq: { q: 'Why did the outage outlast the trigger?', options: ['The query was still slow', 'Retries kept the load above capacity (a metastable failure)', 'Bad luck'], answer: 1, explain: 'Retry storms keep the system overloaded even after the original cause is gone.' },
    hints: [`<p>Hint 1: separate trigger from amplifier from missing defence.</p>`, `<p>Hint 2: what limited the retries? what could shed load?</p>`, `<p>Hint 3: actions: retry budgets, jitter, circuit breaker, load shedding, kill switch, alert on saturation.</p>`],
    approach: `<p><b>Trigger:</b> a slow query on inventory for 2 minutes. <b>Amplifier:</b> every caller retried 3 times without jitter or a budget, which multiplied traffic by about 3 at the moment capacity was lowest. <b>Why it persisted:</b> with the pool saturated, every request timed out, so retries continued and the queue never drained: a metastable failure. <b>5 whys:</b> why 40 minutes? the load stayed above capacity; why? retries from many callers; why so many retries? default client config retries 3 times with no budget; why no breaker? resilience library not required in the service template; why not detected earlier? no saturation alert on the pool, only a CPU alert. <b>Went well:</b> a flag to disable retries existed. <b>Lucky:</b> it was off-peak. <b>Action items (owner/date):</b> retry budget (retries at most 10% of requests) with exponential backoff and jitter in the shared client; circuit breaker and bulkhead by default in the service template; load shedding in inventory (reject early when the queue is long); pool saturation and queue age alerts; recovery runbook step "disable retries, shed load, then ramp"; a game day to reproduce it; fix the slow query. Track to completion and review in 30 days.</p>`
  }));
  practice.push(prob({
    title: 'Alerting for a low-traffic, high-importance service', level: 'Hard', tags: ['alerting', 'SLO', 'low traffic'], companies: ['Stripe', 'PagerDuty'],
    statement: `<p>An internal payroll API gets 40 requests per hour but a failure is costly. A ratio alert fires on a single failure (1 of 40 is 2.5%) and is useless. Design alerting.</p>`,
    example: `<p>With 40 requests per hour, one error is 2.5% = burn rate 25 on a 99.9% SLO: a page for every blip.</p>`,
    brute: `<p>Use the same 5 minute ratio alert as the busy services. It fires randomly, is muted, and a real outage is missed.</p>`,
    mcq: { q: 'Best fix for low-traffic ratio noise?', options: ['Lower the SLO threshold to nothing', 'Use longer windows, add absolute counts and synthetic probes', 'Disable alerts'], answer: 1, explain: 'Longer windows and steady synthetic traffic give stable signals.' },
    hints: [`<p>Hint 1: ratios are unstable with few events.</p>`, `<p>Hint 2: create steady traffic with a probe.</p>`, `<p>Hint 3: alert on consecutive failures, longer windows, and absence of success.</p>`],
    approach: `<p>The problem is statistical: with 40 events an hour one failure swings the ratio too much. Options, combined: (1) synthetic probes every minute from outside, adding steady traffic and checking the whole journey; alert when several consecutive probes fail (for example 3 of the last 5), which is both fast and low-noise. (2) Use longer windows for the real-traffic SLO (6h and 3d) so the denominator is large enough, and require a minimum event count before the ratio alert can fire. (3) Alert on absence: no successful requests for N minutes when traffic is expected (with working-hours schedules). (4) Alert on absolute counts of errors for the critical operations (for example 3 failed payroll runs in 30 minutes). (5) Aggregate similar low-volume endpoints into one SLI. (6) Page for probe failure and absence; ticket for slow ratio burn. Document the logic and test with replayed data.</p>`
  }));
  practice.push(prob({
    title: 'Set up on-call and incident process for a 30-person startup', level: 'Hard', tags: ['on-call', 'incident response', 'SRE'], companies: ['Atlassian', 'Datadog'],
    statement: `<p>A 30-engineer startup has no formal on-call: the CTO gets texted. Design a lightweight but healthy on-call and incident process for the next quarter.</p>`,
    example: `<p>${H.table(['Piece', 'First version'], [['Rotation', 'weekly primary + secondary, 6+ people per rotation'], ['Severity', 'SEV1-SEV3 with response expectations'], ['Tools', 'pager, incident channel template, status page'], ['Learning', 'postmortem for SEV1/2 within 5 days']])}</p>`,
    brute: `<p>Tell everyone to "keep an eye on Slack". Heroes burn out, knowledge sits in one head, nobody knows who is in charge during an outage, and the same incident repeats.</p>`,
    mcq: { q: 'Best first improvement?', options: ['Buy more dashboards', 'Define who is on-call, severity levels, and a symptom-based alert for the core journey', 'Hire a VP'], answer: 1, explain: 'Ownership, severity and a trustworthy alert give the biggest early gain.' },
    hints: [`<p>Hint 1: start small: ownership, severity, one good alert.</p>`, `<p>Hint 2: protect people: rotation size, compensation, rest.</p>`, `<p>Hint 3: learning loop: postmortems with tracked actions.</p>`],
    approach: `<p>Weeks 1-2: define the user journeys that matter (sign-in, checkout) and write one SLO each; add a symptom alert per journey and an external uptime probe. Put a pager tool in place with a weekly primary and secondary rotation, escalation to a team lead, and an agreed compensation or time off for on-call. Teams that own services take their own pager, with a shared rotation at first while the services lack runbooks. Weeks 3-4: severity scale (SEV1-3) with response times and update frequency; incident roles (IC, ops, comms, scribe) with an easy template: a chat channel naming convention, a pinned summary, a status page, and a rule "mitigate first: roll back or flag off". Run a game day to practise. Weeks 5-8: runbooks for the top 5 pages, blameless postmortems for SEV1/2 within 5 days with tracked action items, a monthly alert review to remove noise and a toil list. Metrics: pages per shift, time to acknowledge, time to mitigate, repeat incidents, actionable percentage. Review at the end of the quarter, then add canary releases and error budget policy.</p>`
  }));
  practice.push(prob({
    title: 'Observability and safe rollout for an LLM-powered agent feature', level: 'Hard', tags: ['AI', 'observability', 'feature flags', 'canary'], companies: ['Anthropic', 'OpenAI'],
    statement: `<p>Your team adds an AI support agent that calls a model, retrieves documents and uses tools (refund, order lookup). Design its observability and release strategy.</p>`,
    example: `<p>${H.table(['Signal', 'Examples'], [['Trace', 'root span per conversation turn; children: retrieval, model call, each tool call'], ['Metrics', 'time to first token, tokens per request, cost, tool error rate, thumbs-down rate'], ['Logs', 'prompt version, model id, tool name, redacted inputs']])}</p>`,
    brute: `<p>Ship it to everyone, log nothing but "request ok", and read social media for feedback. A prompt change silently doubles cost or the agent starts refunding wrongly, and nobody sees it.</p>`,
    mcq: { q: 'What should be versioned and flagged like a deploy?', options: ['Only code', 'Prompt, model version, tool set, and retrieval settings', 'Nothing'], answer: 1, explain: 'Behaviour changes without code changes, so treat prompts and models as releases.' },
    hints: [`<p>Hint 1: one conversation turn is one trace.</p>`, `<p>Hint 2: quality and cost are SLIs too.</p>`, `<p>Hint 3: privacy: redact, sample, limit retention; and put a human approval on risky tools.</p>`],
    approach: `<p><b>Tracing:</b> OpenTelemetry root span per user turn with child spans for retrieval, each model call (attributes: model, prompt version, input and output token counts, finish reason), and each tool call (name, status, latency). This shows loops and slow steps. <b>Metrics:</b> RED for the endpoint; time to first token and total latency percentiles; tokens and cost per request; tool error rate; retry and fallback rate; quality proxies: thumbs-down rate, escalation to human rate, refusal rate, and an automated eval score on sampled traffic. <b>SLOs:</b> availability, p95 latency, and a quality SLI such as helpfulness rating above a threshold. <b>Logs:</b> structured, with trace id, redacted user text, no secrets; short retention; access controls. <b>Alerting:</b> burn rate on availability and quality SLOs; cost-per-hour anomaly; agent loop detector (more than N tool calls per turn). <b>Rollout:</b> flag every prompt, model and tool change; shadow mode first; canary 1%, 5%, 25% comparing quality, cost and latency to the baseline; automatic rollback; kill switch to a simple fallback (FAQ search or human handoff). <b>Safety:</b> risky tools like refunds need limits and human approval; budget caps per user; provider outage fallbacks; privacy review. <b>Operations:</b> include model-provider incidents in runbooks and postmortems.</p>`
  }));

  /* ================================================================
     QUIZ
     ================================================================ */
  quiz.push({ q: 'What is a correlation (request) id for?', options: ['To encrypt log lines', 'To tie together all logs and spans of one request across services', 'To count users'], answer: 1, explain: 'The same id on every line lets you find the whole story of one request.' });
  quiz.push({ q: 'Which log line is best for searching?', options: ['"user 42 paid in 230ms"', '{"msg":"payment ok","user_id":42,"duration_ms":230}', '"PAYMENT!!!"'], answer: 1, explain: 'A stable message with named fields is searchable and groupable.' });
  quiz.push({ q: 'RED stands for', options: ['Read, Execute, Delete', 'Rate, Errors, Duration', 'Reliability, Efficiency, Delivery'], answer: 1, explain: 'RED is for request-driven services: rate, errors, duration.' });
  quiz.push({ q: 'USE stands for (for resources)', options: ['Utilization, Saturation, Errors', 'Uptime, Speed, Errors', 'Usage, Stability, Efficiency'], answer: 0, explain: 'USE checks resources like CPU, pools and queues.' });
  quiz.push({ q: 'Why prefer p99 over the average for latency?', options: ['It is cheaper to compute', 'The average hides slow outliers that real users feel', 'p99 is always smaller'], answer: 1, explain: 'The tail shows the worst common experience; the mean describes nobody.' });
  quiz.push({ q: 'How do you get the latency p99 across 20 servers?', options: ['Average the 20 p99 values', 'Take the maximum of p50s', 'Sum the histogram bucket counts, then compute the percentile'], answer: 2, explain: 'Percentiles cannot be averaged; histograms can be merged.' });
  quiz.push({ q: 'What carries the trace across an HTTP call?', options: ['The traceparent header', 'The response body', 'The database'], answer: 0, explain: 'W3C Trace Context uses the traceparent header.' });
  quiz.push({ q: 'Tail sampling is better than head sampling because', options: ['it is cheaper to run', 'it can keep all error and slow traces, since it decides after the trace ends', 'it needs no collector'], answer: 1, explain: 'The decision uses the full trace outcome, at the cost of buffering.' });
  quiz.push({ q: 'SLO 99.9%, error ratio now 1.44%. Burn rate is about', options: ['1.44', '14.4', '144'], answer: 1, explain: '1.44% / 0.1% = 14.4.' });
  quiz.push({ q: 'Why do burn-rate alerts use two windows (long and short)?', options: ['Long proves it matters, short proves it is still happening and lets the alert reset fast', 'To double the cost', 'Because Prometheus requires it'], answer: 0, explain: 'AND of both windows reduces false pages and speeds recovery of the alert.' });
  quiz.push({ q: 'Which should page a human?', options: ['CPU 85% for 5 minutes', 'A pod restarted once', 'Checkout error budget burning 15x too fast'], answer: 2, explain: 'It is a user-facing symptom that needs urgent action.' });
  quiz.push({ q: 'First priority at the start of a major incident with a recent deploy?', options: ['Find the root cause in the code', 'Mitigate: roll back or flag off, and communicate', 'Write the postmortem'], answer: 1, explain: 'Stop user pain first; diagnose later.' });
  quiz.push({ q: 'A blameless postmortem asks', options: ['Who made the mistake?', 'What about our system allowed this and how do we make it safer?', 'Who should be fired?'], answer: 1, explain: 'It focuses on system fixes and learning.' });
  quiz.push({ q: 'What is toil?', options: ['Any hard work', 'Manual, repetitive, automatable work with no lasting value that grows with the service', 'Writing code'], answer: 1, explain: 'Toil should be measured and automated away.' });
  quiz.push({ q: 'When the error budget is exhausted, a typical policy is to', options: ['Ship faster to recover', 'Freeze risky changes and focus on reliability', 'Raise the SLO'], answer: 1, explain: 'The budget balances speed and safety.' });
  quiz.push({ q: 'What does a feature flag separate?', options: ['Frontend from backend', 'Deploy (code on servers) from release (users see it)', 'Test from production data'], answer: 1, explain: 'Ship code dark, turn it on gradually, turn it off instantly.' });
  quiz.push({ q: 'In a canary, which extra metric catches silent failures?', options: ['A business metric such as conversion', 'Disk size', 'Commit count'], answer: 0, explain: 'A bug can return HTTP 200 and still break purchases.' });
  quiz.push({ q: 'Safest way to rename a database column during rolling deploys?', options: ['Rename it in the same deploy as the code', 'Expand, migrate, then contract in separate releases', 'Stop the site'], answer: 1, explain: 'Old and new code must both work at each step.' });

  /* ================================================================
     INTERVIEW
     ================================================================ */
  interview.push({ q: 'How would you debug a slow request that crosses ten microservices?', level: 'I', a: `<p>Start from the user's request id or trace id (returned in a response header or found in the support ticket). Open the distributed trace, a waterfall of spans. Find the critical path: the chain of spans that decided the total time. Ignore long parent spans (they contain children) and look for the leaf or the self time that is large, or for gaps with no span (waiting for a pool, lock or queue). Look at attributes and events for retries, cache misses and errors. Then pivot to logs with the same trace id for that span, and to metrics (USE of the dependency) to see if it is a one-off or systemic. Fix, then verify with a new trace and watch the p95 on the dashboard.</p>`, followUps: ['What if there is no trace for that request (sampled out)?', 'What if spans are missing from one service?', 'How do you tell a slow dependency from a slow self-time?'] });
  interview.push({ q: 'What is structured logging and why does it matter?', level: 'B', a: `<p>Structured logging means writing each event as a machine-readable record (usually one JSON object per line) with named fields, instead of free text. It matters because you can filter, group and aggregate (user_id=42 and duration_ms&gt;200), build alerts and dashboards from logs, and connect events across services with a request or trace id. Keep messages stable (the event name) and put variable data in fields, use consistent field names and levels, redact secrets and personal data, and add a correlation id automatically from the request context.</p>`, followUps: ['How do you stop logs leaking secrets?', 'How do you keep log cost under control?', 'How do you propagate the id through async work?'] });
  interview.push({ q: 'Explain the RED and USE methods. When do you use each?', level: 'B', a: `<p>RED is for request-handling services: Rate (requests per second), Errors (failed requests, as a ratio), Duration (latency percentiles). It tells you whether users are served well. USE is for resources such as CPU, memory, disks, network, connection pools and queues: Utilization (how busy), Saturation (work waiting), Errors (faults). It finds bottlenecks. Use RED on every service dashboard and for alerts and SLOs; use USE when you investigate why RED is bad, or on shared infrastructure. Google's four golden signals (latency, traffic, errors, saturation) combine both ideas.</p>`, followUps: ['Why is saturation a better early warning than utilization?', 'What would you add for a queue consumer?', 'Which metrics would you add for an LLM service?'] });
  interview.push({ q: 'Why are averages misleading for latency, and how do histograms help?', level: 'I', a: `<p>Latency has a long tail: most requests are fast, a few are very slow. The mean mixes them into a number no user experiences and hides the pain of the slow few (who may be many in absolute terms at scale). Percentiles (p50, p95, p99) describe typical and tail behaviour. A histogram stores counts per latency bucket, which is cheap and mergeable across instances; percentiles are estimated by interpolating within the bucket that holds the target rank. Never average percentiles: sum bucket counts across servers first. Place bucket edges around your SLO, and consider exponential histograms for better precision.</p>`, followUps: ['How accurate is the percentile from buckets?', 'What is the tail-at-scale effect?', 'What is coordinated omission?'] });
  interview.push({ q: 'How does context propagation work in distributed tracing?', level: 'I', a: `<p>Every trace has a trace id and each span a span id. When service A calls B, A injects the current context into the outgoing request, normally the W3C <code>traceparent</code> header (version, trace id, parent span id, flags). B extracts it and creates its spans as children of A's span, so the whole call tree shares one trace id. Inside a process, the context is held in thread-local or async-local storage and must be carried across threads and async boundaries. Over message queues the context goes in message headers. Where propagation is missing (custom clients, queues, background jobs), traces break into pieces, which is the first thing to check when a trace looks incomplete.</p>`, followUps: ['What is baggage and what are its risks?', 'How do you link a batch consumer to many producers?', 'How do logs get the trace id?'] });
  interview.push({ q: 'What is the difference between head-based and tail-based sampling?', level: 'A', a: `<p>Head-based sampling decides at the start of a trace (for example keep 5% at random), and the decision is propagated in the flags so all services agree. It is simple and cheap but blind: it drops most errors and slow traces. Tail-based sampling decides after the trace is complete, so it can keep every error, every slow trace and a small baseline. The cost is that a collector must buffer all spans of a trace until a decision, which needs routing by trace id and memory. Practical design: tail sampling in a collector tier, metrics generated before sampling so RED is exact, per-route rate limits, and a fallback if collectors are overloaded.</p>`, followUps: ['How do you route spans by trace id?', 'What do you lose when you sample?', 'How would you decide the baseline percentage?'] });
  interview.push({ q: 'How do you design alerts that do not cause alert fatigue?', level: 'I', a: `<p>Alert on symptoms tied to SLOs (error ratio, latency, freshness), not on causes like CPU. Make every page urgent, actionable and real, with a runbook and an owner. Use multi-window burn-rate alerts to reduce false positives, group related alerts into one incident notification, inhibit child alerts when a parent fires, and route to the owning team. Review pages monthly: delete or downgrade those that needed no action, automate repeated fixes, and track pages per shift and the percent actionable. Keep a heartbeat to detect monitoring failure. Treat alerts as code and test them.</p>`, followUps: ['Page vs ticket: how do you decide?', 'How do you handle a flapping alert?', 'How do you alert on a low-traffic service?'] });
  interview.push({ q: 'Explain SLI, SLO, SLA, error budget and burn rate.', level: 'I', a: `<p>An SLI is a measurement of service quality, usually good events divided by valid events (requests under 300 ms and non-5xx). An SLO is the target for that SLI over a window, for example 99.9% over 30 days. An SLA is an external contract with consequences, looser than the SLO. The error budget is 100% minus the SLO, here 0.1%, the amount of failure you can spend. Burn rate is the observed error ratio divided by the budget fraction; 1 means you use exactly the whole budget by period end, 14.4 means the monthly budget is gone in about two days. Burn-rate alerts with two windows page quickly for fast burns and open tickets for slow ones.</p>`, followUps: ['How would you set the first SLO for a new service?', 'Why not aim for 100%?', 'How do dependencies limit your SLO?'] });
  interview.push({ q: 'Walk me through how you handle a production incident.', level: 'I', a: `<p>Detect (alert or report), acknowledge and triage impact and severity, declare an incident, open a channel, and assign roles: incident commander, operations, communications, scribe. Ask "what changed?" (deploys, flags, config, dependencies). Mitigate first with the fastest safe reversible action: roll back, disable a flag, shift traffic, scale or shed load. Communicate on a schedule to stakeholders and a status page. Verify recovery on user-facing metrics, keep watching for relapse, then resolve. Within days run a blameless postmortem with timeline, contributing factors, 5 whys and tracked action items with owners and dates.</p>`, followUps: ['What does the incident commander do and not do?', 'When do you escalate?', 'How do you decide the severity?'] });
  interview.push({ q: 'What makes a postmortem blameless and effective?', level: 'I', a: `<p>It assumes people acted sensibly with the information and tools they had, so it asks what in the system allowed the failure: missing tests, unsafe defaults, absent alerts, unclear runbooks. It uses facts and a shared timeline, separates trigger from contributing factors and failed defences, records what went well and where we were lucky, and ends with specific action items (prevent, detect, mitigate) with owners, due dates and tracking. It is shared widely. Effectiveness depends on follow-through: completed action items, reviewed in 30 days, and fewer repeat incidents. Avoid "human error" as the root cause and avoid naming individuals as the problem.</p>`, followUps: ['How do you run the meeting?', 'How do you make sure action items get done?', 'What if leadership wants someone blamed?'] });
  interview.push({ q: 'What is an error budget policy and how does it resolve the speed versus stability conflict?', level: 'A', a: `<p>An error budget policy is a written, pre-agreed rule that says what happens at different levels of remaining budget, for example: above 50% ship normally, 20-50% canary required, below 20% only reliability and small changes, at 0% feature freeze. Product, engineering and SRE all sign it. It turns the argument into a shared number: when the service is reliable, the team may take risks and move fast; when budget is spent, reliability work takes priority. It also protects against over-investing: if the service is always far above its SLO, the SLO may be too strict. Exceptions like security fixes are listed in advance.</p>`, followUps: ['What if the budget is always exhausted?', 'How is the budget computed with multiple SLIs?', 'How do you enforce the freeze?'] });
  interview.push({ q: 'How do you deploy a risky change safely? Compare canary, blue-green and feature flags.', level: 'A', a: `<p>Reduce blast radius and make rollback fast. Canary sends a small share of real traffic (1-5%) to the new version and compares error ratio, latency, saturation and a business metric against the baseline, promoting step by step or rolling back automatically. Blue-green keeps the old and new environments side by side and switches traffic, with instant switch back but double capacity and an all-at-once exposure. Feature flags separate deploy from release: code ships dark and is turned on per user or percentage at runtime, with a kill switch. Combine them: deploy to a canary with the feature flagged off, then ramp the flag. Keep database changes backward compatible (expand, migrate, contract), practise rollbacks, keep changes small, and delete flags after rollout.</p>`, followUps: ['How do you avoid flag debt?', 'How do you handle data changes that cannot be rolled back?', 'How do you pick canary promotion thresholds?']});
  interview.push({ q: 'What is toil and how do you decide what to automate?', level: 'I', a: `<p>Toil is operational work that is manual, repetitive, automatable, tactical, without lasting value, and that scales with the size of the service. The SRE guideline is to keep it under about half of the team's time. Measure it (tag tickets and pages), estimate hours per week per chore, estimate the cost to automate, and rank by payback and by risk reduction. Prefer removing the need (fix the root cause) over automating a workaround; automate with safety limits, dry-run modes and alerts when automation triggers repeatedly. Reinvest the time into reliability work, which lowers future toil and pages.</p>`, followUps: ['Give examples of toil you removed', 'When is automation not worth it?', 'How do you sell toil reduction to product?'] });
  interview.push({ q: 'How would you monitor and release an LLM-powered feature safely?', level: 'E', a: `<p>Treat it like any service plus extra signals. Trace each turn: retrieval, model calls with model name, prompt version and token counts, and each tool call. Metrics: RED, time to first token, tokens and cost per request, tool error rate, and quality proxies (user ratings, human escalation rate, refusal rate, automated eval score on sampled live traffic). Set SLOs for availability, latency and a quality SLI, and alert on burn rate and on cost anomalies and runaway loops. Version and flag every prompt, model and tool change; test in shadow mode, canary against the baseline, auto-rollback, and keep a kill switch to a fallback. Protect privacy: redact logs and traces, limit retention, restrict access. Gate risky tools (refunds) with limits and human approval, and include provider outages in incident plans.</p>`, followUps: ['How do you detect quality regressions without errors?', 'How do you control cost spikes?', 'How do you evaluate a model upgrade before rollout?'] });

  registerModule({
    id: 'be16',
    title: 'Observability & Production Excellence',
    lang: 'java',
    intro: `<p>Writing code that works on your laptop is the start. <b>Running it for real users, 24 hours a day</b> is a different skill: seeing what the system is doing, being told when it hurts users, fixing it quickly, learning from every failure, and shipping changes without fear. This module covers structured logs with correlation ids, RED and USE metrics, why percentiles beat averages, distributed tracing with OpenTelemetry, alerting on SLO burn rates, incident response and blameless postmortems, SRE habits (toil, error budgets, on-call), and feature flags with canary releases and automatic rollback. Every topic starts with a simple analogy, a visual, and runnable code.</p>`,
    goals: [
      'Convert printf-style logs into structured JSON with a request id that follows a request across services',
      'Choose RED metrics for an API and USE metrics for its resources, and explain why percentiles from histograms beat averages',
      'Read a trace waterfall, find the critical path and the slow span, and explain context propagation and sampling',
      'Compute multi-window SLO burn-rate alerts and design alerts that page only for urgent user-facing symptoms',
      'Run an incident with clear roles and write a blameless postmortem with 5 whys and tracked action items',
      'Use error budgets, toil limits and healthy on-call practices, and decide promote or rollback from canary metrics with feature flags'
    ],
    prereqs: `<p>Comfort with HTTP APIs and microservices (BE modules on microservices and performance), basic Docker/Kubernetes ideas from the DevOps module, and the reliability ideas (timeouts, retries, circuit breakers) from the HLD reliability topic.</p>`,
    hours: 12,
    topics: topics,
    quiz: quiz,
    interview: interview,
    practice: practice
  });
})();
