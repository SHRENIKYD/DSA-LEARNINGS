(function () {
  var topics = [], practice = [], quiz = [], interview = [];
  // R`...` = raw template: backslashes stay as typed. Docker Compose and shell use ${VAR}, which a JS template would evaluate, so inside R`...` write @{ and it becomes a literal ${.
  var R = function () { return String.raw.apply(null, arguments).replace(/@\{/g, '$' + '{'); };
  var LAB = 'A laptop with Docker and Docker Compose. Everything is free and open source (Prometheus, Grafana, Alertmanager, Loki or Elasticsearch, OpenTelemetry, Jaeger). No cloud account is needed. Datadog and New Relic are only compared on paper. Every password and webhook URL in this module is a placeholder that lives in a gitignored env or secret file.';
  var SKIP = { skip: 'monitoring configuration, verified by reading' };
  var PYC = '<p>Pure computation, Python 3 standard library only. The Python function is tested; the configuration that goes with it is explained in the approach.</p>';
  function Y(code, title) { var s = { lang: 'yaml', code: code }; if (title) s.title = title; return s; }                  // parsed as YAML by the validator
  function SH(code, title) { var s = { lang: 'bash', code: code }; if (title) s.title = title; return s; }                // bash -n checked
  function PY(code, title) { return { lang: 'python', title: title || 'Python (tested)', code: code }; }               // compiled
  function PYR(code, title) { return { lang: 'python', run: true, title: title || 'Python (runs in the browser)', code: code }; }
  function PQ(code, title) { return { lang: 'text', check: false, title: title || 'PromQL', code: code }; }            // PromQL has no checker here
  function LQ(code, title) { return { lang: 'text', check: false, title: title || 'LogQL', code: code }; }             // LogQL / KQL / Alloy: no checker either
  function JS(code, title) { var s = { lang: 'json', code: code }; if (title) s.title = title; return s; }
  function P(o) {
    var sh = shuffled(o.q[1], o.q[2]);
    var p = {
      title: o.t, level: o.l, tags: o.tags, companies: o.co,
      statement: o.s, constraints: o.c || LAB, example: o.ex,
      brute: { why: o.bw },
      mcq: { q: o.q[0], options: sh.options, answer: sh.answer, explain: o.q[3] },
      hints: o.h,
      solution: { approach: o.a, code: o.code, complexity: o.cx, followUps: o.f },
      tests: o.tests || SKIP
    };
    if (o.alt) p.solution.alt = o.alt;
    if (o.bc) p.brute.code = o.bc;
    return p;
  }
  function box(id, label, x, y, w) { return { id: id, label: label, x: x, y: y, shape: 'box', w: w || 18 }; }
  function pad4(f, tip) { while (f.length < 4) f.push({ narr: tip, parts: f[f.length - 1].parts }); return f; }
  function cp(o) { return JSON.parse(JSON.stringify(o)); }
  // Move the correct option to a rotating position so the right answer is not always the first one.
  var rot = 0;
  function shuffled(options, answer) {
    var opts = options.slice(), correct = opts.splice(answer, 1)[0], pos = (rot++) % options.length;
    opts.splice(pos, 0, correct);
    return { options: opts, answer: pos };
  }
  function Q(q, options, answer, explain) { var s = shuffled(options, answer); quiz.push({ q: q, options: s.options, answer: s.answer, explain: explain }); }
  function IQ(q, a, level, followUps) { interview.push({ q: q, a: a, level: level, followUps: followUps }); }
  function num(s, name) { var v = Number(String(s).trim()); if (isNaN(v)) throw new Error(name + ' must be a number, got "' + s + '"'); return v; }
  function kv(input, fmtHint) {
    var o = {};
    String(input || '').split(/[,;]/).forEach(function (p) {
      var m = p.match(/^\s*([A-Za-z0-9_]+)\s*[=:]\s*(.+?)\s*$/);
      if (m) o[m[1]] = m[2];
    });
    if (!Object.keys(o).length) throw new Error(fmtHint);
    return o;
  }
  // Self time of every span: its duration minus the time covered by its children (children may run in parallel, so use their union).
  function selfTimes(spans) {
    var byName = {};
    spans.forEach(function (s) { byName[s.name] = s; s.kids = []; });
    spans.forEach(function (s) { if (s.parent !== '-' && byName[s.parent]) byName[s.parent].kids.push(s); });
    spans.forEach(function (s) {
      var iv = s.kids.map(function (k) { return [Math.max(k.start, s.start), Math.min(k.end, s.end)]; }).filter(function (v) { return v[1] > v[0]; }).sort(function (a, b) { return a[0] - b[0]; });
      var cov = 0, curS = null, curE = null;
      iv.forEach(function (v) {
        if (curS === null) { curS = v[0]; curE = v[1]; }
        else if (v[0] <= curE) { curE = Math.max(curE, v[1]); }
        else { cov += curE - curS; curS = v[0]; curE = v[1]; }
      });
      if (curS !== null) cov += curE - curS;
      s.self = (s.end - s.start) - cov;
    });
    return spans;
  }
  function one(k, v) { var h = {}; h[k] = v; return h; }
  function fmt(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

  // ───────────────────────── Topic 1: the three pillars and the methods ─────────────────────────
  var RED_Q = R`# RED for one service. Metric names follow the lab app in topic 2.
# Rate: requests per second, summed over all pods of the service
sum(rate(http_requests_total{service="checkout"}[5m]))

# Errors: share of requests that were server errors (a ratio, not a count)
sum(rate(http_requests_total{service="checkout", status=~"5.."}[5m]))
  /
sum(rate(http_requests_total{service="checkout"}[5m]))

# Duration: the 99th percentile, from histogram buckets (never from an average)
histogram_quantile(0.99,
  sum by (le) (rate(http_request_duration_seconds_bucket{service="checkout"}[5m])))`;

  topics.push({
    title: 'Metrics, Logs and Traces: Seeing Inside a Running System',
    analogy: `<p>Think of a <b>hospital patient</b>. The bedside monitor shows numbers every second: heart rate, oxygen, temperature. That is <b>metrics</b>: cheap, always on, great for "is something wrong?". The doctor's notes list what happened and when: "09:14 patient coughed, given water". That is <b>logs</b>: detailed, but you must know where to look. A <b>trace</b> is the patient's journey through the hospital: reception, X-ray, lab, ward, with the time spent in each. You use the monitor to notice the problem, the journey to find <i>which department</i> is slow, and the notes to read <i>what exactly</i> went wrong there. Having none of them is "the patient looks tired, let's guess".</p>`,
    explain: `<p>🟢 <b>Monitoring</b> asks questions you wrote in advance ("is CPU over 90%?"). <b>Observability</b> means you can ask questions you did not think of in advance ("why are only checkout requests from Mumbai slow?") by looking at the data the system already emits. You need three kinds of data, often called the three pillars:</p>
      ${H.table(['Signal', 'What it is', 'Best at answering', 'Cost shape'], [
        ['<b>Metrics</b>', 'Numbers sampled over time, like requests per second', '"Is it broken? How bad? Since when?"', 'Cheap and fixed: cost grows with the number of <i>series</i>, not with traffic'],
        ['<b>Logs</b>', 'Timestamped text events, ideally one JSON object per event', '"What exactly happened to request 8f3a?"', 'Grows with traffic and verbosity'],
        ['<b>Traces</b>', 'The path of one request through many services, as timed spans', '"Which downstream call made this request slow?"', 'Grows with traffic; usually sampled']
      ])}
      <p>The workflow is a funnel. An <b>alert</b> built on a metric wakes you. A dashboard narrows it to one service. A <b>trace</b> exposes the slow call. The <b>logs</b> for that trace id show the error message. This only works if the three are <b>linked</b> by shared labels and ids (service name, trace id, request id).</p>
      <p>🔵 <b>Two checklists keep you from staring at 400 graphs.</b></p>
      ${H.table(['Method', 'For what', 'The questions'], [
        ['<b>RED</b> (Tom Wilkie)', 'Anything that serves requests: APIs, queues consumers', '<b>R</b>ate: requests per second. <b>E</b>rrors: failed per second or as a ratio. <b>D</b>uration: how long, as percentiles'],
        ['<b>USE</b> (Brendan Gregg)', 'Resources: CPU, memory, disk, network, connection pools', '<b>U</b>tilisation: how busy. <b>S</b>aturation: how much work is waiting. <b>E</b>rrors: device or pool errors'],
        ['<b>Four golden signals</b> (Google SRE book)', 'User-facing systems', '<b>Latency</b> (split successful and failed requests), <b>Traffic</b>, <b>Errors</b>, <b>Saturation</b>']
      ])}
      <p>RED looks at the service from the <i>outside</i> (what users feel), USE looks at the machine from the <i>inside</i> (what is exhausted). Golden signals are RED plus saturation. Start with RED on every service, add USE on every shared resource.</p>
      <p>🔵 <b>Why averages lie.</b> Latency is not a bell curve. A few very slow requests barely move the average but ruin real users' day. Always look at percentiles (p50, p95, p99) and the <i>count</i> of requests behind them.</p>`,
    clues: [
      '"The site is slow" and nobody can say since when or for whom → no metrics: start with RED on the edge service',
      '"Average latency looks fine but customers complain" → look at p95/p99 and error ratios, never the mean',
      '"Which of our 40 microservices is slow?" → distributed trace, not logs from 40 places',
      '"What happened to this one customer request?" → logs searched by trace id or request id',
      '"Pick the dashboards for a new service" → RED for the service, USE for its database and pools, golden signals as the summary',
      '"Monitoring vs observability" → known questions with alerts vs the ability to ask new questions of rich data'
    ],
    code: [PQ(RED_Q, 'RED in three PromQL queries')],
    codeTitle: ['RED in three PromQL queries'],
    viz: [{
      title: 'Triage a slow site with RED then USE',
      input: 'rate=120, errors=0.4, p99_ms=2400, cpu=35, queue=18, target_ms=500',
      inputLabel: 'rate (req/s), errors (percent), p99_ms, cpu (percent), queue (waiting jobs), target_ms',
      gen: function (input) {
        var o = kv(input, 'Format: rate=120, errors=0.4, p99_ms=2400, cpu=35, queue=18, target_ms=500');
        var rate = num(o.rate === undefined ? 120 : o.rate, 'rate'), err = num(o.errors === undefined ? 0.4 : o.errors, 'errors'),
          p99 = num(o.p99_ms === undefined ? 2400 : o.p99_ms, 'p99_ms'), cpu = num(o.cpu === undefined ? 35 : o.cpu, 'cpu'),
          q = num(o.queue === undefined ? 0 : o.queue, 'queue'), tgt = num(o.target_ms === undefined ? 500 : o.target_ms, 'target_ms');
        if (rate < 0 || err < 0 || p99 < 0 || cpu < 0 || q < 0 || tgt <= 0) throw new Error('Values must be zero or positive; target_ms must be above 0');
        var rows = [], hl = {};
        function fr(n, extra) { return { narr: n, parts: [{ type: 'table', label: 'what the dashboard shows so far', columns: ['signal', 'value', 'verdict'], rows: rows.map(function (r) { return r.slice(); }), hl: cp(hl) }].concat(extra || []) }; }
        var f = [];
        f.push({ narr: 'A user writes: <b>"the site is slow"</b>. Without metrics you would guess. With metrics you read four numbers in order. Start from what users feel (RED), then look at the machine (USE).', parts: [{ type: 'text', label: 'ticket', html: '<p>"Checkout takes forever since this morning."</p>' }] });
        rows.push(['Rate', rate + ' req/s', 'context only: is traffic unusual?']); hl[0] = 'win';
        f.push(fr('<b>Rate</b> is ' + rate + ' requests per second. Rate alone is never "bad", but a sudden jump explains slowness (a load spike) and a sudden drop explains a different outage (nobody can reach us).'));
        var eBad = err >= 1;
        rows.push(['Errors', err + ' %', eBad ? 'HIGH: failures are the story' : 'low: requests succeed']); hl[1] = eBad ? 'bad' : 'ok';
        f.push(fr('<b>Errors</b> are ' + err + ' percent of requests. ' + (eBad ? 'That is high, so users see failures, and failed requests may also be slow (timeouts).' : 'That is low, so the slowness is not hidden failures.')));
        var dBad = p99 > tgt;
        rows.push(['Duration p99', p99 + ' ms (target ' + tgt + ')', dBad ? 'SLOW: ' + (p99 / tgt).toFixed(1) + 'x the target' : 'within target']); hl[2] = dBad ? 'bad' : 'ok';
        f.push(fr('<b>Duration</b>: the 99th percentile is ' + p99 + ' ms against a target of ' + tgt + ' ms. ' + (dBad ? 'One user in a hundred waits that long. This is the symptom.' : 'The tail is fine, so look for a narrower problem (one route, one region).')));
        var cBad = cpu >= 85;
        rows.push(['CPU utilisation', cpu + ' %', cBad ? 'HOT' : 'fine: CPU is not the limit']); hl[3] = cBad ? 'bad' : 'ok';
        f.push(fr('Now USE on the resources. <b>Utilisation</b> of CPU is ' + cpu + ' percent. ' + (cBad ? 'The CPU is nearly full.' : 'Plenty of CPU is free, so a busy CPU is not the cause.')));
        var sBad = q >= 10;
        rows.push(['Saturation (queue)', q + ' waiting', sBad ? 'WORK IS WAITING' : 'no queue']); hl[4] = sBad ? 'bad' : 'ok';
        f.push(fr('<b>Saturation</b> means work is waiting for a resource. ' + q + ' jobs are queued. ' + (sBad ? 'Queues build before CPU looks full, which is why saturation is the early warning.' : 'Nothing is queueing.')));
        var verdict = dBad && !cBad && sBad ? 'Slow tail, idle CPU, queue building: a <b>pool or downstream limit</b> (database connections, worker threads, a slow dependency). Next stop: a trace of a slow request.'
          : dBad && cBad ? 'Slow tail and a hot CPU: the service is <b>compute bound</b>. Scale out or profile the hot code path.'
          : dBad ? 'Slow tail with no obvious resource pressure: open a <b>trace</b> of a slow request to find the slow span.'
          : eBad ? 'Errors without slowness: read the <b>logs</b> for the error message, filtered by the failing route.'
          : 'Everything is inside its target. Check the user report: one customer, one region, or a client-side problem.';
        f.push(fr('<b>Verdict.</b> ' + verdict));
        return f;
      }
    }],
    examples: [
      { title: 'Situation: "the site is slow" and there are no metrics', html: `<p>Monday morning, support says checkout is slow. The team has only server logs. Three engineers grep for an hour, argue about whether it is the database, and finally restart everything. It "fixes" it, nobody knows why, and it returns on Thursday. With RED on the edge service they would have seen at 09:03 that the <b>p99 went from 300 ms to 2.4 s while the error rate stayed flat</b>, a trace would have shown 2.1 s spent waiting for a database connection, and the fix (a bigger connection pool and an alert on pool saturation) would have taken ten minutes. The lesson: instrument <i>before</i> the incident; during an incident you can only read what already exists.</p>` },
      { title: 'Numbers: why the average hid a p99 spike', html: `<p>1000 requests arrive. 980 finish in 100 ms. 20 hang for 5000 ms (a retry storm). The average is (980 x 100 + 20 x 5000) / 1000 = <b>198 ms</b>, which a dashboard would paint green. The 99th percentile is the 990th request when sorted, and requests 981 to 1000 are the slow ones, so p99 = <b>5000 ms</b>. Two percent of users, probably your biggest customers retrying, wait five seconds. Mean says "fine", p99 says "page someone".</p>` },
      { title: 'Which pillar answers which question', html: `<p>${H.table(['Question at 3am', 'Open first', 'Why'], [
        ['Is the error rate up and since when?', 'Metrics', 'A time series answers in one graph'],
        ['Which downstream call is slow for request X?', 'Trace', 'Spans show time per hop'],
        ['What was the exact exception message?', 'Logs', 'Only logs carry free-form detail'],
        ['Did the last deploy change anything?', 'Metrics with a deploy annotation', 'A vertical line on the graph'],
        ['Is the database the bottleneck?', 'USE metrics on the database', 'Pool utilisation and waiting queries']
      ])}</p>` }
    ],
    deepDive: `<p>🟣 <b>Metrics are aggregates, so they are cheap but lossy.</b> A counter cannot tell you <i>which</i> request failed. A metric costs one time series per distinct label combination, so its storage is almost independent of traffic. Logs and traces cost per event, which is why they are sampled, filtered or kept for a shorter time. Production systems pay for metrics by series count, for logs by gigabytes ingested and for traces by spans stored.</p>
      <p>🟣 <b>Correlation is the product.</b> The value of three pillars is the links between them. Use the same <code>service.name</code> everywhere, put the <code>trace_id</code> in every log line, and attach an <b>exemplar</b> (a trace id) to histogram samples so a latency graph links to a real slow trace (topic 7). Without those ids you have three silos.</p>
      <p>🟣 <b>Black-box vs white-box.</b> A black-box probe (a synthetic check that logs in and buys something every minute) shows what a user sees, including DNS, certificates and the load balancer. White-box metrics inside the app show why. Keep at least one of each: a service can be "green" inside and unreachable outside.</p>
      <p>🟣 <b>Pull vs push.</b> Prometheus pulls (scrapes) metrics, which makes "is the target up?" a free signal (<code>up</code>). OpenTelemetry and most tracing systems push. Short-lived batch jobs cannot be scraped reliably, so they push to a Pushgateway or write a textfile, covered in topic 2.</p>`,
    aiEra: `<p>🤖 AI can summarise a flood of alerts, cluster similar log lines, and propose "likely cause" from correlated changes. It works best on <b>clean, linked data</b>: consistent labels, trace ids in logs, deploy markers. Garbage telemetry gives confident garbage answers. Treat an AI root-cause as a hypothesis, then confirm it with a query you can read.</p>
      <p>🤖 Do not paste raw production logs into a public assistant: they hold customer data and secrets. Redact first (topic 6), or use a tool inside your own boundary. Use AI to draft PromQL, but run it against your data and check the unit and the label names, because assistants often invent metric names.</p>`,
    problems: [P({
      t: 'Write the RED dashboard queries for the checkout service', l: 'Easy', tags: ['red', 'promql', 'golden signals'], co: ['Atlassian', 'Zomato', 'Thoughtworks'],
      s: `<p>The checkout service exports <code>http_requests_total{service, route, status}</code> (a counter) and <code>http_request_duration_seconds_bucket{service, route, le}</code> (a histogram). Write PromQL for the three RED panels for <code>service="checkout"</code>: requests per second, the error ratio of 5xx responses, and the p99 latency. Then add one panel per route so you can spot the worst one.</p>`,
      ex: `<p>If checkout gets 120 requests per second and 6 of them fail, the rate panel shows ${H.c('g', '120')}, the error panel ${H.c('r', '0.05')} (5%), and the p99 panel the latency in <b>seconds</b> (for example ${H.c('b', '2.4')}). Percentages and seconds are why a ratio query divides two <code>rate()</code>s with the same filters.</p>`,
      bw: `<p>Graphing <code>http_requests_total</code> directly. A counter only ever goes up, so the graph is a ramp that tells nothing; it resets to zero on every restart. And <code>avg(http_request_duration_seconds_sum)</code> hides the slow tail.</p>`,
      bc: PQ(`http_requests_total{service="checkout"}\navg(http_request_duration_seconds_sum{service="checkout"})`, 'naive: raw counter and an average'),
      q: ['Why divide <code>rate(errors)</code> by <code>rate(total)</code> instead of alerting on the error count?', ['Counts grow with traffic, a ratio stays comparable at 3am and at peak', 'Ratios are cheaper to store', 'rate() cannot be used on counters alone', 'Prometheus forbids alerting on counts'], 0, 'Ten errors a minute is a disaster at 20 requests a minute and noise at 20,000. A ratio expresses "how much of the traffic is failing", which is what users feel.'],
      h: ['<p>Hint 1: counters need <code>rate(...[5m])</code> to become "per second".</p>', '<p>Hint 2: <code>sum(...)</code> across pods first, then divide, so you divide totals and not per-pod numbers.</p>', '<p>Hint 3: percentiles come from <code>histogram_quantile(0.99, sum by (le) (rate(..._bucket[5m])))</code>. Keep <code>le</code> in the <code>by</code> clause or the function breaks. For per-route panels add <code>route</code> to the <code>by</code> list.</p>'],
      a: `<p>Rate and errors use <code>rate()</code> over a 5 minute window on the counter. The error ratio divides two sums with the same label filters. The percentile uses the histogram buckets, summed by <code>le</code>, so it still works with many pods. For per-route, group by <code>route</code> (and keep <code>le</code> for the quantile).</p>`,
      code: PQ(RED_Q + R`

# One line per route: which route is the worst?
histogram_quantile(0.99,
  sum by (route, le) (rate(http_request_duration_seconds_bucket{service="checkout"}[5m])))`, 'RED panels, plus p99 by route'),
      cx: `<p>Each query reads the series for one service over 5 minutes. Cost is proportional to the number of series times samples in the window, which is why labels must stay low-cardinality (topic 2).</p>`,
      f: ['Why is a 5 minute window a good default for a 15 second scrape interval?', 'How would you show only the traffic of the last deploy version?']
    })]
  });

  // ───────────────────────── Topic 2: Prometheus ─────────────────────────
  var APP_PY = R`# app.py - a tiny web app instrumented with prometheus_client (pip install prometheus-client)
import os
import random
import time
from http.server import BaseHTTPRequestHandler, HTTPServer

from prometheus_client import Counter, Gauge, Histogram, start_http_server

SERVICE = "checkout"
FAIL_RATE = float(os.environ.get("FAIL_RATE", "0.03"))   # raise it in the lab to make alerts fire
ROUTES = {"/pay": "/pay", "/cart": "/cart", "/health": "/health"}   # a FIXED set of route names

REQS = Counter("http_requests_total", "HTTP requests handled",
               ["service", "route", "status"])
LATENCY = Histogram("http_request_duration_seconds", "Request duration in seconds",
                    ["service", "route"],
                    buckets=(0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0))   # choose buckets around your SLO
IN_FLIGHT = Gauge("http_requests_in_flight", "Requests being served right now", ["service"])


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        # Unknown paths become "other": the label value set stays small no matter what clients send.
        route = ROUTES.get(self.path, "other")
        IN_FLIGHT.labels(SERVICE).inc()
        start = time.perf_counter()
        status = 200
        try:
            time.sleep(random.uniform(0.01, 0.2))          # pretend to work
            if random.random() < FAIL_RATE:                 # ~3 percent failures by default, so alerts have something to see
                status = 500
            self.send_response(status)
            self.end_headers()
            self.wfile.write(b"ok\n")
        finally:
            LATENCY.labels(SERVICE, route).observe(time.perf_counter() - start)
            REQS.labels(SERVICE, route, str(status)).inc()
            IN_FLIGHT.labels(SERVICE).dec()

    def log_message(self, fmt, *args):                      # silence default access log; topic 6 adds JSON logs
        pass


if __name__ == "__main__":
    start_http_server(8000)                                 # Prometheus scrapes http://app:8000/metrics
    HTTPServer(("0.0.0.0", 8080), Handler).serve_forever()  # the app itself listens on 8080`;

  var EXPO = `# HELP http_requests_total HTTP requests handled
# TYPE http_requests_total counter
http_requests_total{service="checkout",route="/pay",status="200"} 1027
http_requests_total{service="checkout",route="/pay",status="500"} 31
# HELP http_requests_in_flight Requests being served right now
# TYPE http_requests_in_flight gauge
http_requests_in_flight{service="checkout"} 4
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{service="checkout",route="/pay",le="0.1"} 640
http_request_duration_seconds_bucket{service="checkout",route="/pay",le="0.5"} 1010
http_request_duration_seconds_bucket{service="checkout",route="/pay",le="+Inf"} 1058
http_request_duration_seconds_sum{service="checkout",route="/pay"} 142.7
http_request_duration_seconds_count{service="checkout",route="/pay"} 1058`;

  var PROM_YML = R`# prometheus/prometheus.yml
global:
  scrape_interval: 15s            # how often to pull /metrics
  evaluation_interval: 15s        # how often to evaluate recording and alert rules
  external_labels:
    env: lab                      # added to alerts and remote-write data; lets many Prometheus servers share one backend

rule_files:
  - /etc/prometheus/rules/*.yml

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']

scrape_configs:
  - job_name: prometheus          # Prometheus watches itself
    static_configs:
      - targets: ['localhost:9090']

  - job_name: node                # host metrics from node_exporter (USE method)
    static_configs:
      - targets: ['node-exporter:9100']

  - job_name: app                 # our instrumented Python service (RED method)
    scrape_interval: 15s
    static_configs:
      - targets: ['app:8000']
        labels:
          team: payments          # a static label: fine, there is one value per target

  # A guard against cardinality accidents: drop a label before storage, or refuse a whole metric.
  - job_name: app-guarded
    static_configs:
      - targets: ['app:8000']
    metric_relabel_configs:
      - action: labeldrop
        regex: user_id            # remove this label from every scraped sample
      - action: drop
        source_labels: [__name__]
        regex: 'debug_.*'         # never store metrics whose names start with debug_`;

  topics.push({
    title: 'Prometheus: Metric Types, Scraping and the Label Cardinality Trap',
    analogy: `<p>A <b>car dashboard</b> has three kinds of instruments. The <b>odometer</b> only goes up and never goes back (a <b>counter</b>): to know your speed you compare it at two moments. The <b>fuel gauge</b> goes up and down and you read it as it is (a <b>gauge</b>). A <b>tally sheet at a toll booth</b> counts "how many cars took under 10 seconds, under 30 seconds, under a minute" (a <b>histogram</b>). Prometheus is the person who walks past every 15 seconds, writes the readings in a notebook, and later plots the speed. The trap: if you write one notebook <i>per driver name</i>, a million drivers means a million notebooks, and the filing cabinet breaks.</p>`,
    explain: `<p>🟢 <b>Prometheus pulls.</b> Every app exposes plain text at <code>/metrics</code>. Prometheus visits ("scrapes") each target every <code>scrape_interval</code> and stores the numbers with a timestamp. A pull model gives you a free health signal: the metric <code>up</code> is 1 if the scrape worked and 0 if not.</p>
      <p>🟢 <b>A time series</b> is one metric name plus one set of <b>labels</b> (key=value pairs), for example <code>http_requests_total{route="/pay", status="500"}</code>. Change one label value and it is a different series. Labels are how you slice ("only /pay") and sum ("all routes").</p>
      <p>🔵 <b>The four metric types</b></p>
      ${H.table(['Type', 'Behaviour', 'Use it for', 'How you read it'], [
        ['<b>Counter</b>', 'Only goes up; resets to 0 on restart', 'Requests, errors, bytes sent, jobs done. Name ends in <code>_total</code>', '<code>rate()</code> or <code>increase()</code>, never the raw value'],
        ['<b>Gauge</b>', 'Goes up and down', 'Memory in use, queue length, temperature, in-flight requests', 'The value itself, or <code>avg_over_time</code>, <code>max_over_time</code>'],
        ['<b>Histogram</b>', 'Counts observations into cumulative buckets (<code>le</code> = "less than or equal"), plus <code>_sum</code> and <code>_count</code>', 'Latency and sizes, when you need percentiles across many pods', '<code>histogram_quantile()</code> on bucket rates'],
        ['<b>Summary</b>', 'Calculates percentiles inside the app (client side), plus <code>_sum</code> and <code>_count</code>', 'A single instance where exact quantiles matter', 'Read the quantile series directly; you <b>cannot</b> average or add percentiles from different pods']
      ])}
      <p>Prefer histograms for latency: you can add buckets from 50 pods and still compute a correct p99. Name metrics with <b>base units</b> (<code>_seconds</code>, <code>_bytes</code>), not milliseconds.</p>
      <p>🔵 <b>The cardinality trap.</b> Every unique label combination is a new series that Prometheus keeps in memory and on disk. Total series for a metric = the <b>product</b> of the number of values of each label (and a histogram multiplies that again by its buckets). Labels must have a <b>small, bounded set of values</b>: method, route template, status class. Never put unbounded things in labels: user id, email, request id, full URL, session id, timestamp. Those belong in logs and traces.</p>`,
    clues: [
      '"Prometheus ran out of memory after a release" → a new label with unbounded values (user id, request id, raw URL) multiplied the series',
      '"The graph of a counter is a staircase going to the sky" → apply rate() or increase()',
      '"We need the 99th percentile across 50 pods" → histogram, not summary; sum the buckets then histogram_quantile',
      '"A cron job finishes in 10 seconds, how do we monitor it?" → too short to scrape: Pushgateway or textfile collector, plus a last-success timestamp gauge',
      '"Is the service up?" → the built-in up metric per target, plus a black-box probe from outside',
      '"How many series will this label create?" → multiply the distinct values of each label'
    ],
    code: [PY(APP_PY, 'app.py: counter, gauge and histogram with bounded labels'), Y(PROM_YML, 'prometheus.yml: scrape jobs, rules, and cardinality guards'), { lang: 'text', check: false, title: 'What /metrics looks like (text exposition format)', code: EXPO }],
    codeTitle: ['app.py: counter, gauge and histogram with bounded labels', 'prometheus.yml: scrape jobs, rules, and cardinality guards', 'What /metrics looks like (text exposition format)'],
    viz: [{
      title: 'How labels multiply series (and memory)',
      input: 'method=4, status=6, route=30, user_id=50000',
      inputLabel: 'label=number of distinct values, comma separated (add buckets=10 to treat the metric as a histogram)',
      gen: function (input) {
        var o = kv(input, 'Format: method=4, status=6, route=30, user_id=50000');
        var names = Object.keys(o).filter(function (k) { return k !== 'buckets'; });
        if (!names.length || names.length > 6) throw new Error('Give 1 to 6 labels, for example route=30, status=6');
        var counts = names.map(function (n) { var v = num(o[n], n); if (v < 1 || v > 100000000 || Math.floor(v) !== v) throw new Error(n + ' must be a whole number from 1 to 100000000'); return v; });
        var buckets = o.buckets === undefined ? 0 : num(o.buckets, 'buckets');
        if (buckets < 0 || buckets > 200) throw new Error('buckets must be between 0 and 200');
        var frames = [], series = 1, shown = [];
        function mem(n) { var mb = n * 3 / 1024; return mb >= 1024 ? (mb / 1024).toFixed(1) + ' GB' : mb.toFixed(1) + ' MB'; }
        frames.push({ narr: 'A metric with <b>no labels</b> is exactly <b>1 series</b>. Each label you add multiplies the count by the number of values that label can take. Rule of thumb for planning: an active series costs roughly 3 KB of memory in Prometheus, so memory = series x 3 KB.', parts: [{ type: 'vars', label: 'start', vals: { series: 1, memory: mem(1) } }] });
        names.forEach(function (n, i) {
          series *= counts[i]; shown.push(n + ' (' + fmt(counts[i]) + ')');
          var big = counts[i] >= 1000;
          frames.push({ narr: 'Add label <code>' + H.esc(n) + '</code> with <b>' + fmt(counts[i]) + '</b> possible values. Series become the product so far: <b>' + fmt(series) + '</b>, about <b>' + mem(series) + '</b> of memory.' + (big ? ' <b class="c-r">This label is unbounded in real life (ids grow forever). Remove it from the metric and put it in logs or traces.</b>' : ''), parts: [
            { type: 'set', label: 'labels so far', items: shown.slice(), hl: big ? one(shown[shown.length - 1], 'bad') : one(shown[shown.length - 1], 'ok') },
            { type: 'vars', label: 'cost', vals: { series: fmt(series), memory: mem(series) }, hl: big ? { series: 'bad', memory: 'bad' } : {} }
          ] });
        });
        if (buckets > 0) {
          var hs = series * (buckets + 3);
          frames.push({ narr: 'If this is a <b>histogram</b> with ' + buckets + ' finite buckets, every combination also creates one series per bucket (<code>le</code>, including +Inf) plus <code>_sum</code> and <code>_count</code>: x ' + (buckets + 3) + '. New total: <b>' + fmt(hs) + '</b> series, about <b>' + mem(hs) + '</b>.', parts: [{ type: 'vars', label: 'histogram cost', vals: { series: fmt(hs), memory: mem(hs) }, hl: { series: 'bad' } }] });
          series = hs;
        }
        var bad = series > 1000000;
        frames.push({ narr: bad ? '<b class="c-r">Final: ' + fmt(series) + ' series (~' + mem(series) + ').</b> That is the kind of change that gets a Prometheus OOM-killed after a deploy. Fix: drop the unbounded label, aggregate before exposing, or log it instead.' : '<b class="c-g">Final: ' + fmt(series) + ' series (~' + mem(series) + ').</b> That is comfortable. Keep each label bounded and think before adding one.', parts: [{ type: 'vars', label: 'result', vals: { series: fmt(series), memory: mem(series) }, hl: bad ? { series: 'bad', memory: 'bad' } : { series: 'ok', memory: 'ok' } }] });
        return pad4(frames, 'Done.');
      }
    }],
    examples: [
      { title: 'Situation: user_id as a label exploded the TSDB', html: `<p>A developer wanted "latency per customer" and added <code>user_id</code> to the request histogram. The metric had 4 methods x 30 routes x 11 histogram series = 1,320 series. With 200,000 active users in a day it became <b>264 million</b> series. Memory went from 2 GB to out-of-memory within an hour of the deploy, Prometheus crash-looped replaying its write-ahead log, and <b>all</b> alerts went blind, not just that one metric. Fix: revert, add <code>metric_relabel_configs</code> with <code>labeldrop: user_id</code>, and answer "which customer" from traces and logs. Find offenders next time with <code>topk(10, count by (__name__) ({__name__=~".+"}))</code>.</p>` },
      { title: 'Counters reset; histograms add up', html: `<p>A pod restarts and its counter goes 5230 → 0. <code>rate()</code> notices the drop and treats it as a reset, so no negative spike appears. That is why you always use <code>rate()</code> on counters and never subtract raw values. For histograms, bucket counters from every pod can be summed, because <code>le="0.5"</code> means the same thing everywhere. That is exactly what you cannot do with a summary's "0.99" series: the average of ten p99s is not the p99 of all requests.</p>` },
      { title: 'Short jobs: Pushgateway and the textfile collector', html: `<p>A nightly backup runs for 40 seconds. Prometheus will almost never scrape it while it runs. Two patterns: push the final result to a <b>Pushgateway</b> (a cache that Prometheus scrapes) or write a <code>.prom</code> file that node_exporter's textfile collector exposes. Record <code>backup_last_success_timestamp_seconds</code> as a gauge, then alert on <code>time() - backup_last_success_timestamp_seconds &gt; 90000</code>. Use the Pushgateway only for batch results, never as a general way to push from long-running services, because stale pushed values never expire by themselves.</p>`, code: SH(R`# Push one gauge to a Pushgateway running on localhost:9091 (lab only, no auth)
cat <<METRICS | curl --silent --data-binary @- http://localhost:9091/metrics/job/nightly_backup
# TYPE backup_last_success_timestamp_seconds gauge
backup_last_success_timestamp_seconds $(date +%s)
# TYPE backup_duration_seconds gauge
backup_duration_seconds 41
METRICS`, 'Push a batch job result') }
    ],
    deepDive: `<p>🟣 <b>Inside the TSDB.</b> Fresh samples go to an in-memory <b>head block</b> backed by a write-ahead log (WAL) so a crash loses little. Every two hours the head is compacted to an immutable on-disk block; blocks are merged over time and deleted after the retention period (<code>--storage.tsdb.retention.time</code>, default 15 days). Each series has an inverted index entry per label, which is why many series cost memory, and why a restart after a cardinality explosion is slow: the WAL replay must rebuild all those series first.</p>
      <p>🟣 <b>Staleness.</b> When a target disappears or a series stops appearing in a scrape, Prometheus writes a stale marker, so graphs stop the line immediately rather than extending it for five minutes. This is also why changing a label value creates a "new" series and abandons the old one: churn (series that appear and disappear quickly, such as pod names on every deploy) also costs memory and index size.</p>
      <p>🟣 <b>Relabeling.</b> <code>relabel_configs</code> run <i>before</i> the scrape and shape the target (choose which pods to scrape, rename labels). <code>metric_relabel_configs</code> run <i>after</i> the scrape on every sample, which is where you drop expensive labels or metrics. <code>sample_limit</code> and <code>label_limit</code> on a job make Prometheus <b>reject a whole scrape</b> that exceeds the cap, a safety net against a bad release.</p>
      <p>🟣 <b>Histograms and buckets.</b> Classic buckets are fixed at instrumentation time; if the interesting latency (your SLO of 300 ms) falls in a wide bucket (0.25 to 0.5), <code>histogram_quantile</code> interpolates and can be off. Put a bucket boundary at your SLO threshold. Native histograms (stable in recent Prometheus versions, enabled by a flag) use exponential buckets with high resolution in one series, reducing cardinality; check your client library and version support.</p>
      <p>🟣 <b>Prometheus 3.x notes.</b> Range selectors became left-open (a sample exactly at the start of the window is excluded), UTF-8 metric and label names are accepted, and the default scrape protocol negotiation changed. In real systems check the release notes of the version you run before copying old dashboards.</p>`,
    aiEra: `<p>🤖 An assistant happily writes <code>Counter("requests", ["user_id", "path"])</code> because it matches the question "per user". It does not know your series budget. In code review, ask for every label: "what is the maximum number of values and who controls them?" If the answer is "our users" or "the client", reject it.</p>
      <p>🤖 AI is good at reading a <code>/metrics</code> dump and suggesting names that follow conventions (<code>_total</code>, base units, no unit in the label). It is bad at knowing which metrics matter for your SLO. Decide the questions first (RED), then let it generate boilerplate, then run the cardinality query above on a staging Prometheus before shipping.</p>`,
    problems: [P({
      t: 'Instrument a Python service without exploding cardinality', l: 'Medium', tags: ['prometheus_client', 'counter', 'histogram', 'cardinality'], co: ['Razorpay', 'Atlassian', 'Swiggy'],
      s: `<p>A small web service handles <code>/pay</code>, <code>/cart</code> and <code>/health</code>, and clients may request any other path (including bots probing <code>/wp-admin/...</code>). Write the Python code that exposes: a counter of requests by service, route and status, a histogram of request duration by service and route with buckets around a 300 ms SLO, and a gauge of in-flight requests. Serve metrics on port 8000. The label values must stay bounded no matter what clients send.</p>`,
      ex: `<p>A bot requests <code>/wp-admin/x1</code>, <code>/wp-admin/x2</code>, ... 10,000 times. With the raw path as a label you get ${H.c('r', '10,000 new series')}. With a fixed route map they all become <code>route="other"</code>: ${H.c('g', '1 series')}.</p>`,
      bw: `<p>Using the raw request path and the user id as labels: <code>Counter("hits", ["path", "user_id"])</code>. Every unique URL or customer creates new series forever, so memory grows with traffic and attackers can grow it on purpose.</p>`,
      bc: PY(`from prometheus_client import Counter\n\nHITS = Counter("hits_total", "hits", ["path", "user_id"])   # unbounded labels: do not do this\n\ndef handle(path, user_id):\n    HITS.labels(path, user_id).inc()`, 'naive: unbounded labels'),
      q: ['Which label is safe on a request counter?', ['<code>route</code> taken from a fixed set of route templates', '<code>user_id</code>', '<code>request_id</code>', 'the full URL including query string'], 0, 'A route template comes from your code, so you control the number of values. The others are controlled by clients or grow with every request.'],
      h: ['<p>Hint 1: create the metrics once at module level, not inside the request handler.</p>', '<p>Hint 2: map the incoming path through a dict and default to <code>"other"</code>.</p>', '<p>Hint 3: use <code>try/finally</code> so the histogram, counter and gauge are updated even when the handler raises, and put a bucket edge at 0.3 (the SLO).</p>'],
      a: `<p>Create the three metrics once. Normalise the route through a fixed map with a catch-all. Measure with <code>time.perf_counter()</code>, and update everything in <code>finally</code> so failures are counted too. Choose buckets that bracket the 300 ms SLO so the SLO threshold is a real boundary and quantile estimates near it are accurate.</p>`,
      code: PY(R`from http.server import BaseHTTPRequestHandler, HTTPServer
import time
from prometheus_client import Counter, Gauge, Histogram, start_http_server

SERVICE = "checkout"
KNOWN = {"/pay", "/cart", "/health"}

REQS = Counter("http_requests_total", "HTTP requests handled", ["service", "route", "status"])
LAT = Histogram("http_request_duration_seconds", "Request duration in seconds", ["service", "route"],
                buckets=(0.025, 0.05, 0.1, 0.2, 0.3, 0.5, 1.0, 2.5, 5.0))     # 0.3 is the SLO edge
BUSY = Gauge("http_requests_in_flight", "Requests in flight", ["service"])


def route_of(path):
    path = path.split("?", 1)[0]                 # drop the query string first
    return path if path in KNOWN else "other"   # unknown paths share ONE label value


class H(BaseHTTPRequestHandler):
    def do_GET(self):
        route, t0 = route_of(self.path), time.perf_counter()
        status = 404 if route == "other" else 200
        BUSY.labels(SERVICE).inc()
        try:
            self.send_response(status)
            self.end_headers()
        except Exception:
            status = 500                          # count the failure, then let the error propagate
            raise
        finally:
            LAT.labels(SERVICE, route).observe(time.perf_counter() - t0)
            REQS.labels(SERVICE, route, str(status)).inc()
            BUSY.labels(SERVICE).dec()


if __name__ == "__main__":
    start_http_server(8000)
    HTTPServer(("", 8080), H).serve_forever()`, 'bounded-label instrumentation'),
      cx: `<p>Series count is at most routes (4) x statuses (about 5) for the counter, and 4 x (9 buckets + 3) for the histogram: fewer than 100 series however much traffic arrives.</p>`,
      f: ['How would you add the app version as a label safely?', 'What changes if the service has 400 routes?']
    })]
  });

  // ───────────────────────── Topic 3: PromQL ─────────────────────────
  var PROMQL_TOUR = R`# 1. Counters: ALWAYS rate() first, then aggregate. Order matters: sum(rate(x)) is right, rate(sum(x)) is wrong.
sum(rate(http_requests_total[5m]))                       # requests per second, all series
sum by (route) (rate(http_requests_total[5m]))           # keep only the route label
sum without (pod, instance) (rate(http_requests_total[5m]))   # drop these labels, keep the rest

# 2. rate vs irate vs increase
rate(http_requests_total[5m])        # average per-second rate over 5 minutes: smooth, use for alerts and dashboards
irate(http_requests_total[5m])       # rate from the LAST TWO samples only: spiky, for zooming into fast graphs
increase(http_requests_total[1h])    # how many requests in the last hour (= rate x 3600, can be fractional)

# 3. Error ratio (two sums, same filters, divided)
sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))

# 4. Percentiles: sum the buckets BY le first, then take the quantile
histogram_quantile(0.99, sum by (le) (rate(http_request_duration_seconds_bucket[5m])))
# Average latency is sum / count (use it for trends, never as the user experience)
sum(rate(http_request_duration_seconds_sum[5m])) / sum(rate(http_request_duration_seconds_count[5m]))

# 5. Joining two sets of series: match on a label, divide
sum by (service) (rate(http_requests_total{status=~"5.."}[5m]))
  / on (service)
sum by (service) (rate(http_requests_total[5m]))

# 6. Gauges and predictions
max_over_time(http_requests_in_flight[10m])              # worst value in the last 10 minutes
predict_linear(node_filesystem_avail_bytes[6h], 4*3600) < 0   # disk will be full within 4 hours
topk(5, sum by (route) (rate(http_requests_total[5m])))  # the 5 busiest routes

# 7. Health of the monitoring itself
up == 0                                                  # a scrape target is down
absent(up{job="app"})                                    # the whole job vanished (no series at all)`;

  var RECORD_YML = R`# prometheus/rules/recording.yml
groups:
  - name: checkout_recording
    interval: 30s                 # evaluate every 30s (default is global evaluation_interval)
    rules:
      # Naming convention: level:metric:operations  (level = the labels that are kept)
      - record: service:http_requests:rate5m
        expr: sum by (service) (rate(http_requests_total[5m]))

      - record: service:http_errors:ratio_rate5m
        expr: |
          sum by (service) (rate(http_requests_total{status=~"5.."}[5m]))
            /
          sum by (service) (rate(http_requests_total[5m]))

      # Record the summed BUCKET rates (keep le!). Then any quantile is a cheap query on top.
      - record: service:http_request_duration_seconds_bucket:rate5m
        expr: sum by (service, le) (rate(http_request_duration_seconds_bucket[5m]))`;

  var PROMTOOL_TEST = R`# prometheus/tests/recording_test.yml  - run: promtool test rules tests/recording_test.yml
rule_files:
  - ../rules/recording.yml
evaluation_interval: 1m
tests:
  - interval: 1m
    input_series:
      # 600 requests per minute = 10 per second, 5 percent of them failing (30 per minute)
      - series: 'http_requests_total{service="checkout", status="200"}'
        values: '0+570x10'        # starts at 0, adds 570 each minute, 10 samples
      - series: 'http_requests_total{service="checkout", status="500"}'
        values: '0+30x10'
    promql_expr_test:
      - expr: service:http_errors:ratio_rate5m
        eval_time: 10m
        exp_samples:
          - labels: 'service:http_errors:ratio_rate5m{service="checkout"}'
            value: 0.05`;

  topics.push({
    title: 'PromQL: rate, increase, sum by, histogram_quantile and Recording Rules',
    analogy: `<p>Raw metrics are like a <b>bank statement of running balances</b>: 1,200, 1,350, 1,500. A balance by itself says little; you want "how much did I spend <i>per day</i>". <code>rate()</code> is that subtraction, done carefully (and it copes when the bank restarts the account at zero). <code>sum by</code> is "group all my cards by month". <code>histogram_quantile</code> is "what is the amount that 99 percent of my purchases stay under?". A <b>recording rule</b> is writing the answer on a sticky note once a minute, so you do not redo the arithmetic every time someone opens the dashboard.</p>`,
    explain: `<p>🟢 <b>PromQL</b> is the query language of Prometheus. Two kinds of values matter at first:</p>
      <ul><li>An <b>instant vector</b> is one value per series right now, for example <code>up</code>.</li>
      <li>A <b>range vector</b> is a window of past samples per series, written with square brackets: <code>http_requests_total[5m]</code>. You cannot graph a range vector; you feed it to a function (<code>rate</code>, <code>increase</code>, <code>avg_over_time</code>) that turns it back into an instant vector.</li></ul>
      <p>🔵 <b>The counter functions</b></p>
      ${H.table(['Function', 'Returns', 'Use it for', 'Careful'], [
        ['<code>rate(v[5m])</code>', 'Average per-second increase over the window, reset-safe', 'Dashboards and <b>alerts</b>', 'Window should hold at least 2 samples; use 4x the scrape interval or more'],
        ['<code>irate(v[5m])</code>', 'Per-second rate from the last two samples', 'Zooming into very fast, spiky counters', 'Noisy; can miss spikes between samples; avoid in alerts'],
        ['<code>increase(v[1h])</code>', 'Total growth over the window (rate x seconds)', '"How many in the last hour"', 'Result can be fractional because of extrapolation'],
        ['<code>delta(g[5m])</code>, <code>deriv(g[5m])</code>', 'Change or slope of a <b>gauge</b>', 'Gauges like disk usage', 'Never use <code>rate()</code> on a gauge']
      ])}
      <p>🔵 <b>Aggregation.</b> <code>sum by (route) (...)</code> keeps only <code>route</code>. <code>sum without (pod) (...)</code> removes <code>pod</code> and keeps the others. Same for <code>avg</code>, <code>max</code>, <code>count</code>, <code>topk</code>. The golden order is: <b>rate first, then sum</b>, because a restart resets one pod's counter, and summing raw counters first would hide that reset inside the total.</p>
      <p>🔵 <b>Percentiles.</b> A histogram exposes cumulative buckets: <code>le="0.1"</code> counts observations at or below 0.1 s. <code>histogram_quantile(0.99, sum by (le) (rate(x_bucket[5m])))</code> finds the bucket that holds the 99th percent request and <b>interpolates linearly</b> inside it. Keep <code>le</code> in the <code>by</code> list or the function has no buckets to work with. Add other labels (<code>route</code>) to get a percentile per route.</p>
      <p>🔵 <b>Recording rules</b> precompute a heavy expression on a schedule and store the result as a new series. Use them for dashboards that are queried a lot and for alerts that reuse the same ratio. Name them <code>level:metric:operations</code>, for example <code>service:http_requests:rate5m</code>.</p>`,
    clues: [
      '"The graph of requests_total just climbs" → rate() or increase() over a range selector',
      '"p99 per route across many pods" → histogram_quantile over sum by (route, le) of bucket rates',
      '"Dashboard takes 20 seconds to load" → recording rules for the expensive aggregations, shorter ranges',
      '"The rate dips to zero then jumps back after a restart" → counter reset: use rate(), never subtract raw values',
      '"Compare errors to total, per service" → divide two aggregated vectors with the same by-labels, or use on()',
      '"Will the disk fill up tonight?" → predict_linear on a gauge, not rate()',
      '"Alert never fires but the job is gone" → up == 0 cannot see a missing series; add absent()'
    ],
    code: [PQ(PROMQL_TOUR, 'A PromQL tour: the queries you use every day'), Y(RECORD_YML, 'recording.yml: recording rules'), Y(PROMTOOL_TEST, 'promtool unit test for a recording rule')],
    codeTitle: ['A PromQL tour: the queries you use every day', 'recording.yml: recording rules', 'promtool unit test for a recording rule'],
    viz: [{
      title: 'How rate() survives a counter reset',
      input: '0:100, 15:130, 30:160, 45:20, 60:50',
      inputLabel: 'samples as seconds:counter_value, comma separated (the value is a counter, so it should only go up unless the app restarted)',
      gen: function (input) {
        var pts = String(input || '').split(',').map(function (p) {
          var m = p.match(/^\s*(-?\d+(?:\.\d+)?)\s*:\s*(-?\d+(?:\.\d+)?)\s*$/);
          if (!m) throw new Error('Format: 0:100, 15:130, 30:160, 45:20, 60:50 (seconds:value)');
          return [Number(m[1]), Number(m[2])];
        });
        if (pts.length < 2 || pts.length > 14) throw new Error('Give between 2 and 14 samples');
        for (var i = 1; i < pts.length; i++) if (pts[i][0] <= pts[i - 1][0]) throw new Error('Times must increase');
        var rows = [], hl = {}, total = 0, f = [], resets = 0;
        function tbl() { return { type: 'table', label: 'step by step', columns: ['from', 'to', 'raw difference', 'counted as'], rows: rows.map(function (r) { return r.slice(); }), hl: cp(hl) }; }
        f.push({ narr: 'A counter is sampled every few seconds. <code>rate()</code> walks the samples in pairs. Normally the increase is <b>new minus old</b>. If the value goes <b>down</b>, the process restarted and the counter began again from 0, so the increase for that step is just the <b>new value</b>.', parts: [{ type: 'array', label: 'counter values', values: pts.map(function (p) { return p[1]; }), showIdx: true }] });
        for (var j = 1; j < pts.length; j++) {
          var d = pts[j][1] - pts[j - 1][1], counted = d < 0 ? pts[j][1] : d;
          if (d < 0) resets++;
          total += counted;
          rows.push([pts[j - 1][0] + 's: ' + pts[j - 1][1], pts[j][0] + 's: ' + pts[j][1], String(d), d < 0 ? 'RESET: ' + counted : String(counted)]);
          hl[rows.length - 1] = d < 0 ? 'bad' : 'ok';
          f.push({ narr: d < 0 ? 'The value fell from ' + pts[j - 1][1] + ' to ' + pts[j][1] + ': a <b class="c-r">counter reset</b>. A naive subtraction would count ' + d + ' (negative traffic!). rate() counts ' + counted + ', everything the new process has done so far.' : 'Step ' + j + ': ' + pts[j][1] + ' - ' + pts[j - 1][1] + ' = <b>' + d + '</b> more events.', parts: [tbl()] });
        }
        var span = pts[pts.length - 1][0] - pts[0][0], rate = total / span;
        var naive = (pts[pts.length - 1][1] - pts[0][1]) / span;
        f.push({ narr: 'Total counted increase = <b>' + total + '</b> over <b>' + span + '</b> seconds. Rate = ' + total + ' / ' + span + ' = <b>' + rate.toFixed(4) + ' per second</b>' + (resets ? '. Naive (last - first) / time would give ' + naive.toFixed(4) + ', which is wrong because it ignores the ' + resets + ' reset' + (resets > 1 ? 's' : '') + '.' : '. No reset happened, so the naive answer is the same.') + ' (Real Prometheus also extrapolates to the window edges, so its number is slightly different. This model keeps the idea clear.)', parts: [tbl(), { type: 'vars', label: 'result', vals: { increase: total, seconds: span, rate_per_second: Number(rate.toFixed(4)), naive: Number(naive.toFixed(4)) }, hl: { rate_per_second: 'ok', naive: resets ? 'bad' : 'ok' } }] });
        return pad4(f, 'Done.');
      }
    }],
    examples: [
      { title: 'Situation: a p99 spike hidden by averages', html: `<p>The checkout dashboard plots the <b>average</b> latency: 180 ms, flat and green. Customers complain. The on-call engineer changes one panel to <code>histogram_quantile(0.99, sum by (le) (rate(http_request_duration_seconds_bucket[5m])))</code> and sees p99 jump from 400 ms to 4.8 s at 14:10, right after a cache node was replaced. The average barely moved because 98 percent of requests still hit the fast path. Then <code>sum by (route, le)</code> narrows it to <code>/pay</code>. <b>Percentile per route</b> turned "vague complaint" into "this route, this minute".</p>` },
      { title: 'rate() versus irate() on a 15 second scrape', html: `<p>Samples (value at seconds): 0 s = 1000, 15 s = 1030, 30 s = 1060, 45 s = 1420, 60 s = 1450. The traffic burst happened between 30 s and 45 s.</p>
        <p>${H.table(['Query at t = 60 s', 'Calculation', 'Result'], [
          ['<code>rate(x[60s])</code>', '(1450 - 1000) / 60', '7.5 per second'],
          ['<code>irate(x[60s])</code>', 'last two samples: (1450 - 1420) / 15', '2 per second'],
          ['<code>increase(x[60s])</code>', '1450 - 1000', '450 events']
        ])}</p>
        <p>irate shows the quiet last 15 seconds and forgets the burst; rate shows the whole minute. An alert on irate could miss the burst entirely. (Real Prometheus extrapolates to the window edges, so the printed numbers differ slightly.)</p>` },
      { title: 'Reading a percentile from bucket counts, step by step', html: `<p>Bucket counts (cumulative) for 1000 requests: le 0.1 = 600, le 0.5 = 950, le 1 = 990, +Inf = 1000. For p99 the target rank is 0.99 x 1000 = <b>990</b>. The first bucket with a count of at least 990 is <code>le="1"</code>; the one before it holds 950. Interpolate inside (0.5, 1]: 0.5 + (1 - 0.5) x (990 - 950) / (990 - 950) = <b>1.0 s</b>. For p95: rank 950, bucket le 0.5, previous 600: 0.1 + (0.5 - 0.1) x (950 - 600) / (950 - 600) = 0.5 s. The wider the bucket around your SLO, the rougher the estimate, so put a bucket edge exactly at the SLO.</p>` }
    ],
    deepDive: `<p>🟣 <b>Extrapolation.</b> <code>rate()</code> computes the increase between the first and last sample inside the window, then extrapolates toward the window edges (limited to about 110 percent of the average sample gap, and not below zero for counters). Hence <code>increase(x[1m])</code> over a counter that grew by exactly 60 can print 60.4. If you need an exact count, use logs or a purpose-built counter, not <code>increase()</code>.</p>
      <p>🟣 <b>Window size.</b> A range shorter than two scrape intervals returns nothing (no pair of samples), so alerts silently stop. Use at least 4x the scrape interval (1 minute for 15 s scrapes), and in Grafana use the variable <code>$__rate_interval</code>, which picks a safe value from the panel resolution and the data source scrape interval.</p>
      <p>🟣 <b>Quantiles are estimates.</b> <code>histogram_quantile</code> assumes observations are spread evenly inside a bucket. The error can be as big as the bucket width. If the answer lands in the last finite bucket, the real value is above it, and Prometheus returns that bucket's upper bound; if it lands in <code>+Inf</code> you only learn "more than the highest bound". The classic fix is buckets sized to the SLO (topic 2), or native histograms.</p>
      <p>🟣 <b>Vector matching.</b> Binary operators match series on <i>all</i> labels by default. <code>on(l)</code> matches only on label <code>l</code>; <code>ignoring(l)</code> matches on everything but <code>l</code>; <code>group_left</code> allows the left side to have many series per right-side series (a many-to-one join, used to attach metadata labels from an <code>_info</code> metric). A "many-to-many matching not allowed" error means your by-labels do not line up.</p>
      <p>🟣 <b>Recording rules in practice.</b> A rule is evaluated once per interval, so 200 dashboards reading <code>service:http_requests:rate5m</code> cost one evaluation instead of 200. Rules can reference other rules, but evaluation order inside a group is top to bottom while groups run in parallel, so put dependent rules in the same group. Add recording rules for what is <i>queried repeatedly</i>, not for everything, because each rule creates new series. Test rules with <code>promtool test rules</code> (as shown) and check syntax with <code>promtool check rules</code>.</p>
      <p>🟣 <b>Staleness and offsets.</b> <code>offset 1d</code> compares with the same time yesterday (a weekly pattern needs <code>offset 7d</code>). Prometheus 3 made range selectors left-open, so a sample exactly at the start boundary is no longer included; very short windows behave slightly differently from Prometheus 2.</p>`,
    aiEra: `<p>🤖 Natural-language-to-PromQL assistants (built into Grafana and several vendors) are handy for the first draft: "p99 latency per route for checkout". They often get the shape right and the details wrong: a missing <code>le</code>, <code>rate()</code> on a gauge, a metric name that does not exist, milliseconds against a metric in seconds. Always run the query, look at the result for a sanity value you know (current traffic), and read the labels.</p>
      <p>🤖 Use AI to explain a query you inherited: paste it and ask "what does this return and what are the units?". That is a safe, high-value use. Do not let it silently rewrite alert expressions: an alert change deserves a <code>promtool test rules</code> case that proves it still fires when it should and stays quiet when it should not.</p>`,
    problems: [P({
      t: 'Compute rate() from samples, including a counter reset', l: 'Medium', tags: ['promql', 'rate', 'counter reset', 'python'], co: ['Datadog', 'Grafana Labs', 'Atlassian'], c: PYC,
      s: `<p>Write <code>rate_with_reset(times, values)</code>. <code>times</code> are the sample timestamps in seconds (strictly increasing) and <code>values</code> are the counter values at those times. Return the average increase per second between the first and last sample. If a value is lower than the previous one the counter was reset, and the increase for that step is the new value (the counter restarted from 0). With fewer than 2 samples return <code>0.0</code>. Ignore Prometheus' edge extrapolation.</p>`,
      ex: `<p>times <code>[0, 15, 30, 45, 60]</code>, values <code>[100, 130, 160, 20, 50]</code> → increases 30, 30, ${H.c('r', '20 (reset)')}, 30 = 110 over 60 s → ${H.c('g', '1.8333')} per second. The naive (50 - 100) / 60 gives ${H.c('r', '-0.8333')}: negative traffic.</p>`,
      bw: `<p>Taking <code>(last - first) / elapsed</code>. It is right until the first restart and then returns zero or negative numbers, which hides exactly the moments (crashes and deploys) when you care most.</p>`,
      bc: PY(`def rate_with_reset(times, values):\n    if len(times) < 2:\n        return 0.0\n    return (values[-1] - values[0]) / (times[-1] - times[0])   # wrong after a reset`, 'naive: last minus first'),
      q: ['Why does <code>sum(rate(x[5m]))</code> work after a pod restart but <code>rate(sum(x)[5m:])</code> may not?', ['rate() detects a reset only inside a single series; summing first hides one pod resetting inside a total that may still grow', 'sum() cannot be used on counters', 'rate() needs at least 10 series', 'There is no difference'], 0, 'Reset detection looks for a decrease in one series. After summing, a pod that restarts only lowers the total slightly or not at all, so the total looks like a normal increase or an odd dip. Apply rate() per series first, then aggregate.'],
      h: ['<p>Hint 1: walk the values in pairs and add up a "counted increase" per step.</p>', '<p>Hint 2: if <code>values[i] &lt; values[i-1]</code> the step counts as <code>values[i]</code>, else the plain difference.</p>', '<p>Hint 3: divide the total by <code>times[-1] - times[0]</code>; guard fewer than 2 samples first.</p>'],
      a: `<p>Add the per-step increases, treating a decrease as a reset whose increase is the new value, then divide by the elapsed seconds. This is the core of what Prometheus does inside <code>rate()</code>, minus the extrapolation to the window edges.</p>`,
      code: PY(`def rate_with_reset(times, values):
    if len(times) < 2:
        return 0.0                                  # one sample cannot give a rate
    total = 0.0
    for i in range(1, len(values)):
        prev, cur = values[i - 1], values[i]
        if cur < prev:
            total += cur                            # reset: the counter restarted at 0, so cur events happened
        else:
            total += cur - prev                     # normal growth
    return total / (times[-1] - times[0])`, 'rate_with_reset (tested)'),
      cx: `<p>O(n) time and O(1) extra space for n samples.</p>`,
      f: ['What if the counter resets and grows past its old value within one scrape gap?', 'How does Prometheus extrapolate to the window edges?'],
      tests: { sig: 'int[] int[] -> double', fn: 'rateWithReset', cmp: 'float', cases: [
        [[[0, 15, 30, 45, 60], [100, 130, 160, 20, 50]], 1.8333333333],
        [[[0, 15, 30], [5, 5, 5]], 0.0],
        [[[0, 60], [10, 70]], 1.0],
        [[[0], [5]], 0.0],
        [[[0, 10, 20, 30], [50, 0, 10, 20]], 0.6666666667],
        [[[0, 15, 30, 45], [100, 40, 80, 30]], 2.4444444444],
        [[[0, 30, 60, 90], [0, 30, 60, 90]], 1.0],
        [[[10, 20], [7, 3]], 0.3],
        [[[0, 15, 30, 45, 60, 75], [900, 950, 10, 40, 5, 25]], 1.5333333333]
      ] }
    })]
  });

  // ───────────────────────── Topic 4: Grafana ─────────────────────────
  var GF_DS = R`# grafana/provisioning/datasources/datasources.yml  (Grafana reads this folder at startup)
apiVersion: 1
datasources:
  - name: Prometheus
    uid: prometheus
    type: prometheus
    access: proxy                  # Grafana's server calls Prometheus, the browser never does
    url: http://prometheus:9090
    isDefault: true
    jsonData:
      timeInterval: 15s            # must match the scrape interval so $__rate_interval is computed correctly
      exemplarTraceIdDestinations: # a dot on a latency graph links to the trace with this id
        - name: trace_id
          datasourceUid: jaeger

  - name: Loki
    uid: loki
    type: loki
    access: proxy
    url: http://loki:3100
    jsonData:
      derivedFields:               # turn trace_id in a log line into a link to the trace
        - name: trace_id
          matcherRegex: '"trace_id":"(\w+)"'
          url: '$@{__value.raw}'
          datasourceUid: jaeger
          urlDisplayLabel: Open trace

  - name: Jaeger
    uid: jaeger
    type: jaeger
    access: proxy
    url: http://jaeger:16686`;

  var GF_PROV = R`# grafana/provisioning/dashboards/dashboards.yml
apiVersion: 1
providers:
  - name: lab-dashboards
    folder: Lab
    type: file
    disableDeletion: true           # dashboards come from git; the UI cannot delete them
    allowUiUpdates: false           # edit in git, not in the browser, so changes are reviewed
    options:
      path: /var/lib/grafana/dashboards`;

  var GF_DASH = `{
  "title": "Checkout: is it healthy?",
  "uid": "checkout-health",
  "schemaVersion": 39,
  "tags": ["checkout", "red"],
  "templating": { "list": [
    { "name": "service", "type": "query", "datasource": { "type": "prometheus", "uid": "prometheus" },
      "query": "label_values(http_requests_total, service)", "current": { "text": "checkout", "value": "checkout" } }
  ] },
  "annotations": { "list": [
    { "name": "Deploys", "datasource": { "type": "prometheus", "uid": "prometheus" },
      "expr": "changes(app_build_info{service=\\"$service\\"}[1m]) > 0", "titleFormat": "deploy", "iconColor": "blue" }
  ] },
  "panels": [
    { "id": 1, "type": "stat", "title": "Error budget left (30d)", "gridPos": { "x": 0, "y": 0, "w": 6, "h": 4 },
      "targets": [ { "expr": "1 - (service:http_errors:ratio_rate30d{service=\\"$service\\"} / 0.001)" } ],
      "fieldConfig": { "defaults": { "unit": "percentunit", "thresholds": { "mode": "absolute", "steps": [
        { "color": "red", "value": null }, { "color": "orange", "value": 0.25 }, { "color": "green", "value": 0.5 } ] } } } },
    { "id": 2, "type": "timeseries", "title": "Traffic (requests/s)", "gridPos": { "x": 6, "y": 0, "w": 6, "h": 8 },
      "targets": [ { "expr": "sum(rate(http_requests_total{service=\\"$service\\"}[$__rate_interval]))" } ],
      "fieldConfig": { "defaults": { "unit": "reqps" } } },
    { "id": 3, "type": "timeseries", "title": "Errors (share of requests)", "gridPos": { "x": 12, "y": 0, "w": 6, "h": 8 },
      "targets": [ { "expr": "sum(rate(http_requests_total{service=\\"$service\\", status=~\\"5..\\"}[$__rate_interval])) / sum(rate(http_requests_total{service=\\"$service\\"}[$__rate_interval]))" } ],
      "fieldConfig": { "defaults": { "unit": "percentunit" } } },
    { "id": 4, "type": "timeseries", "title": "Latency p50 / p99 with exemplars", "gridPos": { "x": 18, "y": 0, "w": 6, "h": 8 },
      "targets": [
        { "expr": "histogram_quantile(0.50, sum by (le) (rate(http_request_duration_seconds_bucket{service=\\"$service\\"}[$__rate_interval])))", "legendFormat": "p50" },
        { "expr": "histogram_quantile(0.99, sum by (le) (rate(http_request_duration_seconds_bucket{service=\\"$service\\"}[$__rate_interval])))", "legendFormat": "p99", "exemplar": true } ],
      "fieldConfig": { "defaults": { "unit": "s" } } }
  ]
}`;

  topics.push({
    title: 'Grafana: Dashboards That Answer Questions',
    analogy: `<p>A good <b>car dashboard</b> shows speed, fuel and one warning light, not forty gauges. You glance at it and know "am I fine?". A bad dashboard is the cockpit of a jumbo jet shown to someone who only wanted to drive to the shop. Grafana is the screen; the craft is deciding <b>which few questions</b> deserve a big, obvious answer, and which details live one click deeper. The same screen also needs a <b>sticky note on the glass</b> saying "oil changed on Tuesday": a deploy marker, so a bend in the graph can be tied to a cause.</p>`,
    explain: `<p>🟢 <b>Grafana</b> draws graphs from data sources (Prometheus, Loki, Jaeger, SQL and more). It stores no metrics itself. A <b>dashboard</b> is a page of <b>panels</b> (graph, stat, table, heatmap), each with a query. <b>Variables</b> (for example <code>$service</code>) turn one dashboard into many.</p>
      <p>🟢 <b>A dashboard answers a question.</b> Before adding a panel ask "what decision does this help someone make?". If the answer is "none", it is decoration, and decoration hides the signal during an incident.</p>
      <p>🔵 <b>A layout that works for on-call</b> (top to bottom, most important first):</p>
      ${H.table(['Row', 'Question it answers', 'Panels'], [
        ['1. Health', 'Are users OK right now? Are we burning budget?', 'SLO stat, error budget left, burn rate, firing alerts'],
        ['2. RED', 'What is wrong: traffic, errors or slowness?', 'Requests/s, error ratio, p50 and p99 latency (exemplars on)'],
        ['3. Breakdown', 'Where: which route, version, region?', 'p99 and errors by route, by version, by pod'],
        ['4. Dependencies', 'Is a downstream the cause?', 'Latency and errors of calls to DB, cache, other services'],
        ['5. Resources (USE)', 'Is something exhausted?', 'CPU, memory, DB pool saturation, queue depth']
      ])}
      <p>Link rows to the next tool: a panel title that links to the runbook, a log panel filtered by the same <code>$service</code>, and a latency exemplar that opens the trace.</p>
      <p>🔵 <b>Rules of thumb</b> that prevent confusing graphs: set the <b>unit</b> (seconds, percent, requests per second) on every panel; use <code>$__rate_interval</code> instead of hard-coded <code>[5m]</code>; show percentiles, not averages; put the threshold or SLO as a line; keep the same time range and a shared crosshair; add <b>deploy annotations</b>; avoid two y-axes on one panel; limit a dashboard to roughly 6 to 12 panels above the fold.</p>
      <p>🔵 <b>Dashboards as code.</b> Provision data sources and dashboards from files in git (shown below), so the dashboard that worked at 3am is the one that is reviewed and versioned, and a rebuilt Grafana looks identical. Admin passwords and API tokens come from a gitignored env or secret file, never from the repo (topic 10).</p>`,
    clues: [
      '"We have 40 dashboards and still cannot find the problem" → one health dashboard per service in RED order; link to deeper ones',
      '"Every graph looks fine yet users are unhappy" → averages, wrong aggregation, or the wrong question: add p99 and an SLO line',
      '"The dashboard we fixed in the UI disappeared after a restart" → dashboards as code and provisioning with allowUiUpdates: false',
      '"Was it the deploy?" → deploy annotations on the same time axis',
      '"From a slow graph to the cause in one click" → exemplars to traces, derived fields from logs to traces',
      '"Dashboard shows nothing for 5m windows" → $__rate_interval and a data source timeInterval equal to the scrape interval'
    ],
    code: [Y(GF_DS, 'datasources.yml: Prometheus, Loki, Jaeger, with links between them'), Y(GF_PROV, 'dashboards.yml: load dashboards from files'), JS(GF_DASH, 'checkout-health.json: a small dashboard that answers "is it healthy?"')],
    codeTitle: ['datasources.yml: Prometheus, Loki, Jaeger, with links between them', 'dashboards.yml: load dashboards from files', 'checkout-health.json: a small dashboard that answers "is it healthy?"'],
    viz: [{
      title: 'Pivot from a graph to the cause across the three pillars',
      input: 'start=metrics',
      inputLabel: 'start with one of: metrics, logs, traces',
      gen: function (input) {
        var o = kv(input, 'Format: start=metrics (or logs, or traces)');
        var s = String(o.start === undefined ? 'metrics' : o.start).toLowerCase();
        if (['metrics', 'logs', 'traces'].indexOf(s) < 0) throw new Error('start must be metrics, logs or traces');
        var nodes = [box('alert', 'Alert: p99 high', 8, 8, 20), box('dash', 'Grafana dashboard', 38, 8, 22), box('trace', 'Trace (Jaeger)', 70, 8, 22), box('logs', 'Logs (Loki)', 38, 40, 22), box('fix', 'Root cause', 70, 40, 22)];
        var edges = [['alert', 'dash', 'link'], ['dash', 'trace', 'exemplar'], ['trace', 'logs', 'trace_id'], ['logs', 'fix', 'error text'], ['dash', 'logs', 'same labels']];
        function fr(n, hl, ehl) { return { narr: n, parts: [{ type: 'graph', label: 'where you are', directed: true, height: 56, nodes: nodes, edges: edges, hl: hl, ehl: ehl || {} }] }; }
        var f = [];
        if (s === 'metrics') {
          f.push(fr('An <b>alert</b> says the p99 of checkout is above its SLO. It links straight to the right dashboard (the alert annotation carries the dashboard URL).', { alert: 'cur' }));
          f.push(fr('The <b>dashboard</b> shows p99 rising at 14:10 and a deploy marker at 14:09. The latency panel has <b>exemplars</b>: dots, each one a real slow request with its trace id.', { dash: 'cur' }, { 'alert-dash': 'ok' }));
          f.push(fr('Click an exemplar: Grafana opens that request as a <b>trace</b>. The waterfall shows 2.1 s spent in one span: the call to the payment provider.', { trace: 'cur' }, { 'dash-trace': 'ok' }));
          f.push(fr('Click the trace id into <b>logs</b> (derived field). The log lines for that trace show "timeout calling provider, retry 3 of 3".', { logs: 'cur' }, { 'trace-logs': 'ok' }));
        } else if (s === 'logs') {
          f.push(fr('You start from a <b>log line</b>: a customer reported an error and support pasted the request id. You search Loki for it.', { logs: 'cur' }));
          f.push(fr('The line has a <code>trace_id</code> field. A <b>derived field</b> turns it into a link, so you jump to the whole request as a trace.', { trace: 'cur' }, { 'trace-logs': 'ok' }));
          f.push(fr('The trace shows which downstream call failed. To know if others are affected too, go to the <b>dashboard</b> and look at the error ratio for that service and route.', { dash: 'cur' }, { 'dash-logs': 'ok' }));
        } else {
          f.push(fr('You start from a <b>trace</b> someone shared: one slow checkout.', { trace: 'cur' }));
          f.push(fr('The slow span is a call to the payment provider. Is it one request or all of them? Open the <b>dashboard</b>.', { dash: 'cur' }, { 'dash-trace': 'ok' }));
          f.push(fr('The p99 panel confirms the whole route is slow since 14:10. Read the <b>logs</b> of that span for the error text.', { logs: 'cur' }, { 'trace-logs': 'ok' }));
        }
        f.push(fr('<b>Root cause found</b> without grepping 40 hosts: the provider changed its timeout. The pivots only worked because every signal shares the labels <code>service</code> and <code>trace_id</code>.', { fix: 'sel' }, { 'logs-fix': 'ok' }));
        return pad4(f, 'Done.');
      }
    }],
    examples: [
      { title: 'Situation: forty panels and still "the site is slow"', html: `<p>An old dashboard has 38 panels: CPU for every host, JVM heap, thread counts, disk. During an incident the engineer scrolls for ten minutes and sees "everything is a bit high". The rebuilt dashboard has a top row with the error-budget stat (red), then RED panels, then breakdown by route. In 20 seconds the engineer sees: traffic normal, errors normal, p99 3x the SLO, only on <code>/pay</code>. One question per row, most urgent on top.</p>` },
      { title: 'A panel query written well', html: `<p>Bad: <code>rate(http_request_duration_seconds_sum[5m])</code> (a rate of seconds, not a latency; no unit, hard-coded window, no filter). Good, for a <code>$service</code> variable:</p>`, code: PQ(`histogram_quantile(\n  0.99,\n  sum by (le) (rate(http_request_duration_seconds_bucket{service="$service"}[$__rate_interval]))\n)`, 'p99 panel query; unit = seconds; threshold line at the SLO') },
      { title: 'Variables and repeating panels', html: `<p>One variable <code>$service</code> (from <code>label_values(http_requests_total, service)</code>) turns "checkout health" into "any service health". A second variable <code>$env</code> from the <code>env</code> external label switches between staging and production. Keep variables <b>bounded</b>: a variable that lists every pod name in the fleet makes the page slow, and "All" over thousands of series makes panels time out. The same lesson as label cardinality, one layer up.</p>` }
    ],
    deepDive: `<p>🟣 <b>Panels are queries, so they cost.</b> A dashboard opened by 30 people in an incident runs every panel query 30 times at each refresh. Use recording rules for expensive ones (topic 3), refresh every 30 s or more, and set a sensible default time range (last 1 to 3 hours), not 30 days.</p>
      <p>🟣 <b>Exemplars.</b> For a latency panel to show exemplar dots, three things must hold: the app attaches a trace id to the histogram observation, Prometheus scrapes in OpenMetrics format with exemplar storage enabled (<code>--enable-feature=exemplar-storage</code>), and the Grafana data source maps the label to a tracing data source. Missing any one link and the dots never appear (topic 8).</p>
      <p>🟣 <b>Heatmaps beat lines for latency.</b> A line for p99 hides the shape. A heatmap of histogram buckets shows the distribution over time: you see bimodal behaviour (a fast path and a slow path) or a slow band appearing after a deploy. Use <code>sum by (le) (increase(x_bucket[$__rate_interval]))</code> with "heatmap" format.</p>
      <p>🟣 <b>Governance.</b> Give dashboards a clear owner in tags, store them in the same repo as the service when possible, and review them like code. Grafana can alert too (Grafana-managed alerts), but for a Prometheus-centred stack keep alert rules in Prometheus (versioned, testable with promtool) and use Grafana for looking, not paging.</p>
      <p>🟣 <b>Security.</b> Grafana is a web app with data access. Put it behind SSO, give viewers the Viewer role, and never leave anonymous admin on. The admin password in the lab comes from a file (<code>GF_SECURITY_ADMIN_PASSWORD__FILE</code>), and data source credentials go in provisioned secure fields fed from environment variables, never committed.</p>`,
    aiEra: `<p>🤖 AI can draft a dashboard JSON from a metric list, and Grafana's own assistants can suggest panels. The output is usually a long, flat wall of panels: every metric gets one. Your job is the editing: choose the questions, delete the rest, set units and thresholds, and order rows from "are users OK?" to "which machine?".</p>
      <p>🤖 Use AI summaries of a graph ("latency rose at 14:10 after a deploy") as a prompt for investigation, not as a verdict. They can only see the series you showed them and they cannot know that a marketing campaign started at 14:00. Add the context markers (deploys, flags, campaigns) as annotations so humans and tools both see them.</p>`,
    problems: [P({
      t: 'Design the on-call dashboard for the checkout service', l: 'Medium', tags: ['grafana', 'dashboards', 'red', 'provisioning'], co: ['Grafana Labs', 'Atlassian', 'PhonePe'],
      s: `<p>The on-call engineer for checkout gets paged at 3am. Design a Grafana dashboard that tells her in under a minute whether users are hurt, which route is the problem and whether a deploy or a dependency is to blame. Specify the rows and panels in order, the exact queries for the RED panels, and the data source provisioning that lets a latency graph jump to a trace. State what you deliberately leave out.</p>`,
      ex: `<p>Row 1: ${H.c('g', 'error budget left (stat)')} and burn rate. Row 2: requests/s, error ratio, p50 and p99 with exemplars. Row 3: p99 and error ratio <b>by route</b>. Row 4: latency and errors of DB and payment-provider calls. Row 5: DB pool utilisation and queue depth. Left out: ${H.c('r', 'per-host CPU for 30 hosts')} (one panel of the worst 5 is enough).</p>`,
      bw: `<p>A dashboard of every metric the service exports, 60 panels, averages, hard-coded <code>[5m]</code>, no units, no link to traces, edited by hand in the UI. Nobody knows which graph matters, and after a Grafana rebuild it is gone.</p>`,
      bc: JS(`{ "title": "everything", "panels": [ { "type": "timeseries", "title": "cpu host-1", "targets": [ { "expr": "node_cpu_seconds_total" } ] } ] }`, 'naive: raw metric, no unit, one of 60 such panels'),
      q: ['A dashboard needs to show latency from many pods. Which panel query is right?', ['<code>histogram_quantile(0.99, sum by (le) (rate(x_bucket[$__rate_interval])))</code>', '<code>avg(x_sum)</code>', '<code>max(x_count)</code>', '<code>rate(x_sum[5m])</code>'], 0, 'Summing the bucket rates across pods and taking the quantile gives a correct fleet-wide p99. An average of sums or a rate of the sum is not a latency.'],
      h: ['<p>Hint 1: order the rows by the questions an on-call person asks, starting with "are users hurt?".</p>', '<p>Hint 2: every panel has a unit and uses <code>$__rate_interval</code> and the <code>$service</code> variable.</p>', '<p>Hint 3: provision Prometheus, Loki and Jaeger with their cross links, and ship the dashboard JSON from git with <code>allowUiUpdates: false</code>.</p>'],
      a: `<p>Use the five-row layout: health (budget and burn), RED, breakdown by route and version, dependencies, then USE resources. Every panel carries a unit, uses the <code>$service</code> variable and <code>$__rate_interval</code>, and the p99 panel has exemplars on. Provisioning gives three linked data sources (exemplar to Jaeger, derived field from Loki to Jaeger) and loads the dashboard JSON from a folder in git. Deploy annotations come from a query on a build-info metric. Left out on purpose: per-host panels, averages, and anything nobody has acted on in the last quarter.</p>`,
      code: JS(GF_DASH, 'dashboard JSON (trimmed)'),
      alt: [Y(GF_PROV, 'provisioning the dashboards folder')],
      cx: `<p>Cost is the number of panel queries times viewers times refresh rate. Recording rules keep the heavy ones cheap.</p>`,
      f: ['How would you show the same dashboard for staging and production?', 'Which panel would you add after the next incident?']
    })]
  });

  // ───────────────────────── Topic 5: alerting, Alertmanager, on-call ─────────────────────────
  var ALERT_RULES = R`# prometheus/rules/alerts.yml
groups:
  - name: checkout_alerts
    rules:
      # Always-firing alert: if the pager stops receiving it, the alerting pipeline itself is broken (a "dead man's switch").
      - alert: Watchdog
        expr: vector(1)
        labels:
          severity: watchdog
        annotations:
          summary: Alerting pipeline heartbeat. This alert is supposed to fire all the time.

      # A SYMPTOM alert: users are hurt. 'for' makes it wait: a 1 minute blip never pages.
      - alert: CheckoutHighErrorRatio
        expr: service:http_errors:ratio_rate5m{service="checkout"} > 0.05
        for: 10m
        labels:
          severity: page
          team: payments
        annotations:
          summary: 'Checkout is failing {{ $value | humanizePercentage }} of requests'
          description: 'The 5xx ratio has stayed above 5% for 10 minutes.'
          runbook_url: https://runbooks.example.com/checkout/high-error-ratio
          dashboard: https://grafana.example.com/d/checkout-health

      # A CAUSE or capacity alert: needs attention, but not at 3am. Goes to a ticket queue.
      - alert: DiskWillFillIn4Hours
        expr: predict_linear(node_filesystem_avail_bytes{fstype!~"tmpfs|overlay"}[6h], 4 * 3600) < 0
        for: 30m
        labels:
          severity: ticket
          team: platform
        annotations:
          summary: 'Disk {{ $labels.mountpoint }} on {{ $labels.instance }} fills within 4 hours'
          runbook_url: https://runbooks.example.com/node/disk-full

      # Monitoring the monitor: a scrape target stopped answering.
      - alert: TargetDown
        expr: up{job="app"} == 0
        for: 5m
        labels:
          severity: page
          team: payments
        annotations:
          summary: 'Target {{ $labels.instance }} of job {{ $labels.job }} is down'`;

  var ALERT_TEST = R`# prometheus/tests/alerts_test.yml  - run: promtool test rules tests/alerts_test.yml
rule_files:
  - ../rules/alerts.yml
evaluation_interval: 1m
tests:
  - interval: 1m
    input_series:
      - series: 'service:http_errors:ratio_rate5m{service="checkout"}'
        values: '0.10+0x30'              # 10 percent errors, every minute, for 30 minutes
    alert_rule_test:
      - eval_time: 5m                    # only 5 minutes of badness: still pending, nothing is sent
        alertname: CheckoutHighErrorRatio
        exp_alerts: []
      - eval_time: 12m                   # past the 10 minute 'for': firing
        alertname: CheckoutHighErrorRatio
        exp_alerts:
          - exp_labels:
              severity: page
              team: payments
              service: checkout
            exp_annotations:
              summary: 'Checkout is failing 10% of requests'
              description: 'The 5xx ratio has stayed above 5% for 10 minutes.'
              runbook_url: https://runbooks.example.com/checkout/high-error-ratio
              dashboard: https://grafana.example.com/d/checkout-health`;

  var AM_CONF = R`# alertmanager/alertmanager.yml
# No secrets in this file. Webhook URLs live in files that are gitignored and mounted read-only (see topic 10).
global:
  resolve_timeout: 5m

route:
  receiver: ticket-queue             # default: anything not matched below is a ticket, not a page
  group_by: [alertname, service]     # one notification per (alert, service), not one per pod
  group_wait: 30s                    # wait this long for the first group of alerts to fill up
  group_interval: 5m                 # then send updates to a group at most this often
  repeat_interval: 4h                # remind about a still-firing group this often
  routes:
    - matchers: ['alertname="Watchdog"']
      receiver: heartbeat
      repeat_interval: 5m            # a heartbeat the external service expects every few minutes
    - matchers: ['severity="page"']
      receiver: oncall-pager
      group_wait: 10s                # pages should not wait long
      routes:
        - matchers: ['team="payments"']
          receiver: payments-pager
    - matchers: ['severity="ticket"']
      receiver: ticket-queue
      active_time_intervals: [business-hours]   # tickets are only sent during office hours

time_intervals:
  - name: business-hours
    time_intervals:
      - weekdays: ['monday:friday']
        times:
          - start_time: '09:00'
            end_time: '18:00'

inhibit_rules:
  # While a page-level alert is firing for a service, mute its ticket-level alerts: the page already has everyone's attention.
  - source_matchers: ['severity="page"']
    target_matchers: ['severity="ticket"']
    equal: [service]
  # If the whole instance is down, do not also page for every symptom on that instance.
  - source_matchers: ['alertname="InstanceDown"']
    target_matchers: ['severity=~"page|ticket"']
    equal: [instance]

receivers:
  - name: oncall-pager
    webhook_configs:
      - url_file: /etc/alertmanager/secrets/pager_webhook_url      # file contains the URL; the file is not in git
        send_resolved: true
  - name: payments-pager
    webhook_configs:
      - url_file: /etc/alertmanager/secrets/payments_webhook_url
        send_resolved: true
  - name: ticket-queue
    webhook_configs:
      - url_file: /etc/alertmanager/secrets/ticket_webhook_url
  - name: heartbeat
    webhook_configs:
      - url_file: /etc/alertmanager/secrets/heartbeat_webhook_url`;

  var AMTOOL = R`# Validate before you deploy (CI should run these)
promtool check rules prometheus/rules/*.yml
promtool test rules prometheus/tests/*.yml
amtool check-config alertmanager/alertmanager.yml

# Which receiver would this alert go to? (tests your routing tree without sending anything)
amtool config routes test --config.file=alertmanager/alertmanager.yml severity=page team=payments service=checkout

# A silence: mute one alert for 2 hours during planned work. Always give a reason and a short duration.
amtool silence add alertname=DiskWillFillIn4Hours service=checkout \
  --comment="planned disk migration, ticket OPS-123" --duration=2h \
  --author="you@example.com" --alertmanager.url=http://localhost:9093

amtool silence query --alertmanager.url=http://localhost:9093
amtool silence expire <SILENCE_ID> --alertmanager.url=http://localhost:9093`;

  topics.push({
    title: 'Alerting: Rules, Alertmanager Routing and On-Call Hygiene',
    analogy: `<p>A <b>smoke alarm</b> that beeps because you made toast is worse than none: after the third false alarm you take out the battery, and then the real fire is silent. Alerting is the same. A good alert wakes a human only when a human must act <i>now</i>. <b>Prometheus</b> is the sensor that decides "smoke". <b>Alertmanager</b> is the building's front desk: it merges ten identical complaints into one phone call, sends the call to the right floor, stays quiet about the broken lift while the building is on fire (inhibition), and lets you put up a "do not disturb" sign while workers are in (silence).</p>`,
    explain: `<p>🟢 <b>Two programs, two jobs.</b> Prometheus <b>evaluates alert rules</b> every <code>evaluation_interval</code> and sends firing alerts to Alertmanager. Alertmanager <b>groups, deduplicates, routes, inhibits and silences</b>, then notifies a receiver (a pager service, chat, email, webhook). Prometheus decides <i>whether</i>; Alertmanager decides <i>who, when and how often</i>.</p>
      <p>🔵 <b>An alert rule</b> has an <code>expr</code> (any PromQL that returns series when something is wrong), a <code>for:</code> duration, <code>labels</code> (used for routing) and <code>annotations</code> (text for humans: summary, runbook link, dashboard link). The life cycle has three states:</p>
      ${H.table(['State', 'Meaning', 'Sent to Alertmanager?'], [
        ['<b>inactive</b>', 'The expression returns nothing', 'No'],
        ['<b>pending</b>', 'The expression is true, but not yet for the whole <code>for:</code> time', 'No'],
        ['<b>firing</b>', 'True continuously for at least <code>for:</code>', 'Yes, re-sent each evaluation']
      ])}
      <p>If the expression is false for even one evaluation, the pending timer resets. <code>for: 10m</code> is how you stop a 90 second blip from paging someone.</p>
      <p>🔵 <b>Alertmanager vocabulary</b></p>
      ${H.table(['Term', 'What it does', 'Example'], [
        ['<b>Routing tree</b>', 'Matches alert labels top to bottom to choose a receiver; the first matching child wins unless <code>continue: true</code>', '<code>severity="page"</code> → pager'],
        ['<b>Grouping</b> (<code>group_by</code>)', 'Combines alerts with the same listed labels into one notification', '50 pods failing → one message for the service'],
        ['<b>group_wait / group_interval / repeat_interval</b>', 'Wait before the first message / minimum gap between updates / reminder period', '30s / 5m / 4h'],
        ['<b>Inhibition</b>', 'A firing "source" alert mutes "target" alerts that share the <code>equal</code> labels', 'Service page mutes its own ticket alerts'],
        ['<b>Silence</b>', 'A temporary, label-matching mute created by a human, with an expiry and a comment', 'Planned maintenance for 2 hours']
      ])}
      <p>🔵 <b>Page on symptoms, ticket on causes.</b> Page when users are affected (high error ratio, high latency, SLO burn). Everything else (disk filling in 4 hours, a single pod restarting, high CPU) goes to a queue someone reads in working hours. Every page needs: a clear summary, a <b>runbook link</b>, a dashboard link and an owner.</p>
      <p>🔵 <b>On-call hygiene.</b> Count pages per shift and aim for very few (the Google SRE book suggests at most two incidents per 12 hour shift). Review all pages weekly: delete or fix any that were not actionable. Keep a primary and a secondary, clear handoff notes, an escalation path if the primary does not acknowledge, and time off after a rough night. A tired on-call makes the next incident worse.</p>`,
    clues: [
      '"Paged at 3am, looked at it, nothing was wrong" → alert on symptoms with a for: duration; move cause alerts to tickets',
      '"One outage produced 200 notifications" → group_by service/alertname and add inhibition rules',
      '"The alert fired for 20 seconds then resolved" → add for:, or use a longer rate window',
      '"We did not get paged because the alerting itself was down" → Watchdog / dead man\'s switch to an external service',
      '"Planned maintenance will trigger alerts" → a silence with an expiry and a comment, not a deleted rule',
      '"How would you reduce alert fatigue?" → weekly alert review, delete non-actionable, SLO-based paging, runbooks',
      '"Which team gets this page?" → route on a team label that comes from the rule or the target'
    ],
    code: [Y(ALERT_RULES, 'alerts.yml: alert rules with for:, labels and annotations'), Y(AM_CONF, 'alertmanager.yml: routing, grouping, inhibition, time intervals (no secrets)'), Y(ALERT_TEST, 'promtool test for an alert rule'), SH(AMTOOL, 'promtool and amtool: check, route test, silence')],
    codeTitle: ['alerts.yml: alert rules with for:, labels and annotations', 'alertmanager.yml: routing, grouping, inhibition, time intervals (no secrets)', 'promtool test for an alert rule', 'promtool and amtool: check, route test, silence'],
    viz: [{
      title: 'Pending to firing: what the for: duration does',
      input: 'values=0.02 0.08 0.09 0.03 0.07 0.08 0.09 0.10 0.11, threshold=0.05, interval=60, for=180',
      inputLabel: 'values (one per evaluation, space separated), threshold, interval (seconds between evaluations), for (seconds)',
      gen: function (input) {
        var o = kv(input, 'Format: values=0.02 0.08 0.09, threshold=0.05, interval=60, for=180');
        var vals = String(o.values === undefined ? '' : o.values).trim().split(/\s+/).filter(Boolean).map(function (x) { return num(x, 'a value'); });
        if (vals.length < 2 || vals.length > 30) throw new Error('Give 2 to 30 values separated by spaces');
        var thr = num(o.threshold === undefined ? 0.05 : o.threshold, 'threshold'), iv = num(o.interval === undefined ? 60 : o.interval, 'interval'), fr = num(o['for'] === undefined ? 180 : o['for'], 'for');
        if (iv <= 0 || fr < 0) throw new Error('interval must be above 0 and for must be 0 or more');
        var rows = [], hl = {}, f = [], state = 'inactive', t0 = null, firedAt = -1, resets = 0;
        function tbl() { return { type: 'table', label: 'each evaluation', columns: ['time', 'value', 'expr true?', 'state'], rows: rows.map(function (r) { return r.slice(); }), hl: cp(hl) }; }
        f.push({ narr: 'The rule is evaluated every <b>' + iv + ' s</b>. It is "true" when the value is above <b>' + thr + '</b>. It fires only after being true for <b>' + fr + ' s</b> without a break. Watch the state column.', parts: [{ type: 'array', label: 'metric values per evaluation', values: vals, showIdx: true }] });
        vals.forEach(function (v, i) {
          var t = i * iv, truth = v > thr, note;
          if (!truth) { if (state !== 'inactive') resets++; state = 'inactive'; t0 = null; note = 'the condition is false, the timer resets'; }
          else {
            if (t0 === null) t0 = t;
            if (t - t0 >= fr) { state = 'firing'; if (firedAt < 0) firedAt = i; note = 'true for ' + (t - t0) + ' s (needs ' + fr + ' s): FIRING, sent to Alertmanager'; }
            else { state = 'pending'; note = 'true for ' + (t - t0) + ' s of the needed ' + fr + ' s: still PENDING'; }
          }
          rows.push([t + ' s', String(v), truth ? 'yes' : 'no', state]);
          hl[rows.length - 1] = state === 'firing' ? 'bad' : state === 'pending' ? 'cur' : 'ok';
          f.push({ narr: 'Evaluation ' + i + ' at ' + t + ' s: value ' + v + ' is ' + (truth ? 'above' : 'not above') + ' ' + thr + '; ' + note + '.', parts: [tbl()] });
        });
        f.push({ narr: firedAt >= 0 ? 'The alert first fired at evaluation <b>' + firedAt + '</b> (' + (firedAt * iv) + ' s). ' + (resets ? 'The timer was reset ' + resets + ' time(s) by a quiet evaluation, so short blips never paged anyone.' : 'No blip reset the timer.') : 'The alert <b>never fired</b>: the condition never held for ' + fr + ' s in a row. That is the point of <code>for:</code>: short blips do not wake anybody.', parts: [tbl()] });
        return pad4(f, 'Done.');
      }
    }],
    examples: [
      { title: 'Situation: 3am pages that were not issues', html: `<p>The team had <code>node_cpu_usage &gt; 80% for 1m</code> paging the primary. A nightly batch job pushed CPU to 95 percent for four minutes, on most nights across the fleet, and nothing was wrong: requests were fast. After three weeks the on-call muted the channel. Then a real database failover happened and its page sat unread for 40 minutes. The fix: delete the CPU page, add the symptom alert (checkout error ratio and p99 against the SLO, <code>for: 10m</code>), keep CPU as a <b>ticket</b> alert with <code>for: 30m</code>, and run a weekly review that deletes any page nobody acted on.</p>` },
      { title: 'Grouping and inhibition during a database outage', html: `<p>The database dies. Thirty app pods now fail health checks and 6 different alerts fire per pod: 180 alerts. With <code>group_by: [alertname, service]</code> they collapse into about 6 notifications. With the inhibition rule <code>InstanceDown mutes everything on the same instance</code> and <code>page mutes ticket for the same service</code> the on-call receives <b>one</b> page with the real cause on top and a grouped list under it. Without both, the engineer gets 180 phone buzzes and no idea where to start.</p>` },
      { title: 'Silences: use them, then let them expire', html: `<p>Before a planned disk migration, create a silence for <code>alertname=DiskWillFillIn4Hours, service=checkout</code> for 2 hours with the ticket number as the comment. It expires by itself, and it is visible to everyone in the Alertmanager UI. Do <b>not</b> silence by deleting the rule or by setting a 30-day silence "to deal with later": rules removed for a week get forgotten, and a long silence hides the day the alert would have been right.</p>` },
      { title: 'Routing: where does this alert go?', html: `<p>Alert labels: <code>alertname=CheckoutHighErrorRatio, severity=page, team=payments, service=checkout</code>. Route 1 (<code>Watchdog</code>) does not match. Route 2 (<code>severity="page"</code>) matches; inside it the child <code>team="payments"</code> matches, so the receiver is <code>payments-pager</code>. Change the severity to <code>ticket</code> and route 3 matches, but only sends during business hours. Check with <code>amtool config routes test</code> instead of waiting for a real incident.</p>` }
    ],
    deepDive: `<p>🟣 <b>Evaluation versus notification timing.</b> The delay from fault to phone call is the sum of: scrape interval, the rate window's lag, <code>for:</code>, the evaluation interval, <code>group_wait</code>, and the paging provider. A fast outage can take 5 to 15 minutes to page with generous settings. That is exactly why paging directly on error ratio with long windows is replaced by burn-rate alerts (topic 9): they trade windows and thresholds for a known detection time.</p>
      <p>🟣 <b>High availability.</b> Run two Prometheus servers that scrape the same targets and evaluate the same rules (both send alerts), and a cluster of three Alertmanagers that gossip (the <code>--cluster.peer</code> flag) so a notification is sent once. Do not load-balance Prometheus to Alertmanager; list every Alertmanager so each Prometheus talks to all of them. Alertmanager state (silences and notification log) is kept in memory and a local file, so a single instance loses silences if its disk is lost.</p>
      <p>🟣 <b>Common mistakes.</b> Alerting on <code>up == 0</code> without <code>for:</code> pages on every deploy. A missing <code>group_by</code> sends one message per alert. <code>continue: true</code> forgotten, so only the first matching route fires. An alert on a metric that can disappear (<code>rate(errors[5m]) &gt; 0</code> when the series does not exist yet) never fires: pair with <code>absent()</code> or make sure the series is initialised to zero in the app. Labels in <code>equal:</code> that the alerts do not carry make an inhibition rule never match.</p>
      <p>🟣 <b>Secrets and webhooks.</b> A notification URL is a credential (anyone with a Slack incoming-webhook URL can post). Keep it out of git and out of images: use <code>url_file</code> or <code>api_url_file</code> pointing at a file that is created from a secret store or a gitignored local file and mounted read-only. The config you commit shows only the path.</p>
      <p>🟣 <b>On-call is a system, not a person.</b> Healthy teams cap on-call load, pay or compensate for it, protect sleep (a follow-the-sun rotation across time zones if they can), keep runbooks tested, and treat repeated pages as bugs with owners. Track three numbers: pages per shift, percentage of pages that were actionable, and time-to-acknowledge.</p>`,
    aiEra: `<p>🤖 AI can cluster alerts, suggest likely duplicates to inhibit, and summarise "what changed in the last hour" when you get paged. That is genuine help against noise. Use it to <i>propose</i> rule changes from the last month of pages ("these 5 alerts caused 70 percent of non-actionable pages"), then review and test the rule changes yourself.</p>
      <p>🤖 Be careful with AI that auto-remediates or auto-silences. A bot that silences an alert it does not understand turns an incident into a silent one. If you automate, make the action reversible, logged, rate-limited and restricted to a runbook you already trust, and keep a human page for anything the bot touched twice.</p>`,
    problems: [P({
      t: 'When does the alert fire? Simulate pending and firing', l: 'Medium', tags: ['alert rules', 'for', 'pending', 'python'], co: ['PagerDuty', 'Datadog', 'Atlassian'], c: PYC,
      s: `<p>Write <code>alert_fire_index(values, threshold, interval_s, for_s)</code>. A rule is evaluated once per <code>interval_s</code> seconds, one value per evaluation. The condition is true when <code>value &gt; threshold</code> (strictly). The alert goes pending on the first true evaluation and fires on the first evaluation at which it has been true, without a break, for at least <code>for_s</code> seconds (measured from the first true evaluation of the current run). A false evaluation resets it. Return the index of the first evaluation at which the alert is firing, or <code>-1</code> if it never fires. <code>for_s = 0</code> means it fires on the first true evaluation.</p>`,
      ex: `<p>values <code>[0.02, 0.08, 0.09, 0.03, 0.07, 0.08, 0.09, 0.10, 0.11]</code>, threshold 0.05, interval 60, for 180 → the first run (indexes 1 and 2) is too short and the quiet value at index 3 resets the timer. The second run starts at index 4; 180 s is 3 evaluations later → ${H.c('g', 'index 7')}.</p>`,
      bw: `<p>Firing on the first true value (<code>for: 0</code>). Every blip pages someone, which is exactly how the 3am non-issue pages in this module began.</p>`,
      bc: PY(`def alert_fire_index(values, threshold, interval_s, for_s):\n    for i, v in enumerate(values):\n        if v > threshold:\n            return i        # fires on any blip\n    return -1`, 'naive: ignores the for: duration'),
      q: ['An expression is true for 8 minutes, false for one evaluation, then true for 8 minutes again. The rule has <code>for: 10m</code>. What happens?', ['It never fires: the false evaluation resets the pending timer', 'It fires after 10 minutes of total true time', 'It fires immediately after the first 8 minutes', 'It fires once the second run starts'], 0, 'The for: duration needs one unbroken run. A single false evaluation sends the alert back to inactive, which is why for: removes blips but can also delay a flapping real problem.'],
      h: ['<p>Hint 1: remember where the current true run started.</p>', '<p>Hint 2: when the value is not above the threshold, forget the start.</p>', '<p>Hint 3: fire when <code>(i - start) * interval_s &gt;= for_s</code>. Return that <code>i</code>.</p>'],
      a: `<p>Keep the index where the current unbroken true run began. On each evaluation, a false value clears it; a true value sets it if empty, then checks whether the elapsed time since the run started has reached <code>for_s</code>. The first evaluation that satisfies this is returned. This is exactly the state machine the Prometheus rule manager runs for every alert.</p>`,
      code: PY(`def alert_fire_index(values, threshold, interval_s, for_s):
    start = None                                  # index where the current true run began
    for i, v in enumerate(values):
        if v > threshold:                         # strictly above, like the PromQL > operator
            if start is None:
                start = i                         # becomes pending
            if (i - start) * interval_s >= for_s:
                return i                          # pending long enough: firing
        else:
            start = None                          # any quiet evaluation resets the timer
    return -1`, 'alert_fire_index (tested)'),
      cx: `<p>O(n) time, O(1) space for n evaluations.</p>`,
      f: ['What changes if Prometheus restarts while an alert is pending?', 'How does keep_firing_for help flapping alerts?'],
      tests: { sig: 'double[] double int int -> int', fn: 'alertFireIndex', cases: [
        [[[0.02, 0.08, 0.09, 0.03, 0.07, 0.08, 0.09, 0.1, 0.11], 0.05, 60, 180], 7],
        [[[0.1, 0.1, 0.1, 0.1], 0.05, 60, 0], 0],
        [[[0.1, 0.1, 0.1], 0.05, 60, 180], -1],
        [[[0.01, 0.02], 0.05, 60, 60], -1],
        [[[0.06, 0.06, 0.04, 0.06, 0.06, 0.06], 0.05, 30, 60], 5],
        [[[0.05, 0.05, 0.05], 0.05, 60, 60], -1],
        [[[0.2, 0.0, 0.2, 0.0, 0.2], 0.1, 60, 60], -1],
        [[[0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2], 0.1, 15, 135], 9],
        [[[0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2], 0.1, 15, 136], -1],
        [[[], 0.1, 15, 15], -1],
        [[[0.3, 0.3, 0.0, 0.3, 0.3, 0.3], 0.1, 60, 100], 5]
      ] }
    })]
  });

  // ───────────────────────── Topic 6: logs ─────────────────────────
  var LOG_PY = R`# logging_demo.py - structured JSON logs with a request id on every line, and redaction of secrets/PII.
import contextvars
import json
import logging
import re
import sys
import uuid

# A ContextVar follows the request across function calls AND async tasks (a thread-local does not).
request_id_var = contextvars.ContextVar("request_id", default="-")

# Redaction rules, applied in order. Redact BEFORE the line leaves the process.
RULES = [
    (re.compile(r"(?i)(bearer\s+)[A-Za-z0-9._~+/=-]+"), r"\1[REDACTED]"),
    (re.compile(r"(?i)\b(password|passwd|secret|token|api_key|apikey)(\s*[=:]\s*)[^\s,;\"&]+"), r"\1\2[REDACTED]"),
    (re.compile(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+"), "[EMAIL]"),
    (re.compile(r"\b(?:\d[ -]?){12,18}\d\b"), "[CARD]"),
]


def redact(text):
    for pattern, repl in RULES:
        text = pattern.sub(repl, text)
    return text


class JsonFormatter(logging.Formatter):
    def format(self, record):
        entry = {
            "level": record.levelname.lower(),
            "service": "checkout",
            "request_id": request_id_var.get(),          # the same id on every line of one request
            "msg": redact(record.getMessage()),          # free text is the risky part: redact it
        }
        entry.update(getattr(record, "fields", {}))      # structured extras: route, status, duration_ms
        return json.dumps(entry, sort_keys=True)


handler = logging.StreamHandler(sys.stdout)
handler.setFormatter(JsonFormatter())
log = logging.getLogger("checkout")
log.addHandler(handler)
log.setLevel(logging.INFO)


def handle(path, incoming_request_id=None):
    # Reuse the id the caller sent (X-Request-Id) so the whole chain shares it; otherwise make one.
    request_id_var.set(incoming_request_id or uuid.uuid4().hex[:12])
    log.info("request started", extra={"fields": {"route": path}})
    log.warning("payment declined for card 4111 1111 1111 1111 email jo@example.com", extra={"fields": {"route": path, "status": 402}})
    log.info("login with password=hunter2 header Authorization: Bearer abc.def.ghi", extra={"fields": {"route": path}})


handle("/pay", incoming_request_id="req-8f3a9c21d4b7")`;

  var LOGQL = R`# LogQL (Grafana Loki). Labels in {} select streams; everything after the | is filtering on the line text.
{service="checkout"} |= "timeout"                                  # lines containing the word timeout
{service="checkout", env="prod"} | json | level="error"            # parse JSON, then filter on a field
{service="checkout"} | json | trace_id="4bf92f3577b34da6a3ce929d0e0e4736"   # every line of one trace
{service="checkout"} | json | request_id="req-8f3a9c21d4b7" | line_format "{{.level}} {{.msg}}"

# Metrics FROM logs: errors per second per route (use only when no real metric exists)
sum by (route) (rate({service="checkout"} | json | level="error" [5m]))
count_over_time({service="checkout"} |= "payment declined" [1h])`;

  var FLUENTBIT = R`# fluent-bit/fluent-bit.yaml  (EFK: Fluent Bit ships container logs to Elasticsearch; Kibana reads them)
service:
  flush: 1
  log_level: info
pipeline:
  inputs:
    - name: tail
      path: /var/lib/docker/containers/*/*-json.log
      parser: docker                  # unwrap Docker's JSON envelope, leaving the app's own JSON line
      tag: app.*
  filters:
    - name: parser
      match: 'app.*'
      key_name: log
      parser: json                    # parse the app's JSON so fields become searchable
      reserve_data: true
    - name: record_modifier
      match: 'app.*'
      remove_key: authorization       # drop whole fields you never want to store
  outputs:
    - name: es
      match: 'app.*'
      host: elasticsearch
      port: 9200
      index: app-logs
      suppress_type_name: 'on'
      http_user: @{ES_USER}            # read from the container environment (an env file that is gitignored)
      http_passwd: @{ES_PASSWORD}`;

  var ALLOY = R`// alloy/config.alloy  (Grafana Alloy: collect Docker logs, redact, send to Loki) - Alloy syntax, not checked here
discovery.docker "containers" {
  host = "unix:///var/run/docker.sock"      // mounting the Docker socket is powerful: lab only, read-only
}

loki.source.docker "app" {
  host       = "unix:///var/run/docker.sock"
  targets    = discovery.docker.containers.targets
  forward_to = [loki.process.clean.receiver]
}

loki.process "clean" {
  stage.json {
    expressions = { level = "level" }
  }
  stage.labels {
    values = { level = "" }                 // level has 5 values: fine as a label. Do NOT label request_id.
  }
  stage.replace {
    expression = "(?i)(password=)\\S+"
    replace    = "[REDACTED]"
  }
  forward_to = [loki.write.local.receiver]
}

loki.write "local" {
  endpoint {
    url = "http://loki:3100/loki/api/v1/push"
  }
}`;

  topics.push({
    title: 'Logs: Structured Logging, Request IDs, Redaction, Sampling and Loki or EFK',
    analogy: `<p>Logs are the <b>flight recorder</b> of your service. A plane that records "something happened" in free handwriting is useless after a crash; one that records timestamped fields (altitude, speed, switch states) can be replayed. Writing logs as <b>structured JSON</b> is the difference between a diary and a data table. The <b>request id</b> is the flight number: without it, you cannot tell which of a million entries belong to the one flight that went wrong. And before the recorder is handed to anyone, a <b>black marker</b> must cover the passengers' names and passports: redaction.</p>`,
    explain: `<p>🟢 <b>Write logs as events with fields</b>, one JSON object per line: <code>{"level":"error","service":"checkout","request_id":"req-8f3a","route":"/pay","status":502,"msg":"provider timeout"}</code>. A machine can then filter by level, group by route and count by status. Plain strings like <code>"Error in payment!!"</code> force everyone to guess with regular expressions.</p>
      <p>🟢 <b>The request id is the thread through the maze.</b> Create one at the edge (or accept the caller's <code>X-Request-Id</code>), keep it in a context that survives async code, put it on <b>every</b> log line, and pass it to every downstream call. If a trace system is present, log the <code>trace_id</code> as well, so logs and traces link to each other.</p>
      <p>🔵 <b>What to log, and what never to log</b></p>
      ${H.table(['Log it', 'Never log it'], [
        ['Request id, trace id, route, status, duration, user <i>internal</i> id (if needed), error class and message, retry count', 'Passwords, API keys, tokens, session cookies, full card numbers, national ids'],
        ['Decisions ("fallback used", "circuit open")', 'Full request or response bodies (they hold PII)'],
        ['One line per request outcome plus one per error', 'Entire stack dumps on every retry (log once at the boundary)']
      ])}
      <p>🔵 <b>Redact before the line leaves the process</b> (a formatter or filter in the logger), and add a second net in the collector (Alloy, Fluent Bit, OTel Collector). Defence in depth, because one forgotten <code>log.info(request.headers)</code> is enough to leak a bearer token into a system many people can read.</p>
      <p>🔵 <b>Volume control.</b> Log levels are the first dial (production at INFO, DEBUG off). <b>Sampling</b> is the second: keep every ERROR and WARN, keep 1 in 10 of routine INFO, drop health checks. Sample <i>per request</i> (hash the request id) so you never keep half of a request's lines. The third dial is retention: 7 to 14 days hot, longer in cheap storage only if compliance needs it.</p>
      <p>🔵 <b>Two ways to store them.</b></p>
      ${H.table(['', 'Loki (with Grafana)', 'EFK / ELK (Elasticsearch)'], [
        ['Indexing', 'Indexes only a few <b>labels</b> (service, env, level); the text is stored compressed and scanned', 'Indexes <b>every word</b> (inverted index)'],
        ['Cost', 'Cheap storage, small index', 'Faster full-text search, much bigger index and RAM'],
        ['Query', 'LogQL: <code>{service="checkout"} |= "timeout"</code>', 'KQL / Lucene / ES|QL in Kibana'],
        ['Cardinality rule', 'High-cardinality labels (request id, user id) are the same trap as in Prometheus', 'Mapping explosion: too many distinct field names slow the cluster'],
        ['The "F"', 'Collector: Alloy (Promtail reached end of life in March 2026)', 'Fluent Bit or Fluentd, then Elasticsearch, then Kibana']
      ])}`,
    clues: [
      '"A customer says order 4521 failed. Find what happened" → search by request id or trace id across services',
      '"We grep logs on 14 servers" → centralise, structure as JSON, one query language',
      '"Logs filled the disk / the bill doubled" → levels, sampling, drop health checks, retention',
      '"A secret appeared in the log search" → redaction in the logger plus the collector; rotate the secret; audit who could read it',
      '"Logs do not show the request id for background jobs" → ContextVar (or MDC in Java) not propagated across threads/async',
      '"Loki or Elasticsearch?" → label index and cheap storage versus full-text index and speed',
      '"Can we count errors from logs?" → yes in LogQL, but a real counter metric is cheaper and more reliable'
    ],
    code: [PYR(LOG_PY, 'logging_demo.py: JSON logs, request id, redaction (runs in the browser)'), LQ(LOGQL, 'LogQL queries'), Y(FLUENTBIT, 'Fluent Bit config for EFK (secrets from environment)'), LQ(ALLOY, 'Grafana Alloy: Docker logs to Loki with redaction')],
    codeTitle: ['logging_demo.py: JSON logs, request id, redaction (runs in the browser)', 'LogQL queries', 'Fluent Bit config for EFK (secrets from environment)', 'Grafana Alloy: Docker logs to Loki with redaction'],
    viz: [{
      title: 'Redaction pipeline: a log line passes four filters',
      input: 'login failed password=hunter2 Authorization: Bearer abc.def.ghi card 4111 1111 1111 1111 mail jo@example.com',
      inputLabel: 'a log line (try adding secrets, emails or card numbers)',
      gen: function (input) {
        var line = String(input === undefined || input === null ? '' : input);
        if (!line.trim()) throw new Error('Type a log line to redact');
        if (line.length > 300) throw new Error('Keep the line under 300 characters');
        var rules = [
          ['Bearer tokens', /(bearer\s+)[A-Za-z0-9._~+\/=-]+/gi, '$1[REDACTED]'],
          ['Secret key=value pairs', /\b(password|passwd|secret|token|api_key|apikey)(\s*[=:]\s*)[^\s,;"&]+/gi, '$1$2[REDACTED]'],
          ['Email addresses', /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, '[EMAIL]'],
          ['Card numbers (13 to 19 digits)', /\b(?:\d[ -]?){12,18}\d\b/g, '[CARD]']
        ];
        var cur = line, f = [];
        f.push({ narr: 'The raw line as the application wrote it. Anything sensitive here would be copied to the log store, where many people can search it. The formatter runs these four rules <b>in order</b> before the line leaves the process.', parts: [{ type: 'text', label: 'raw line', html: '<code>' + H.esc(cur) + '</code>' }] });
        rules.forEach(function (r) {
          var before = cur, n = (cur.match(r[1]) || []).length;
          cur = cur.replace(r[1], r[2]);
          f.push({ narr: 'Rule <b>' + r[0] + '</b>: ' + (n ? '<b class="c-g">' + n + ' match' + (n > 1 ? 'es' : '') + ' replaced</b>.' : 'no match, the line is unchanged.') + (before !== cur ? ' Order matters: running the key=value rule before the email rule keeps <code>token=a@b.io</code> readable as a redacted token.' : ''), parts: [{ type: 'text', label: 'before', html: '<code>' + H.esc(before) + '</code>' }, { type: 'text', label: 'after', html: '<code>' + H.esc(cur) + '</code>' }] });
        });
        f.push({ narr: 'Final line sent to the log store. Pattern rules catch what they know; they cannot catch a secret with no pattern (a name in a free-text field). The strongest protection is not logging bodies and headers at all.', parts: [{ type: 'text', label: 'sent to Loki / Elasticsearch', html: '<code>' + H.esc(cur) + '</code>' }] });
        return f;
      }
    }],
    examples: [
      { title: 'Situation: logs missing the request id', html: `<p>A customer reports "my order failed at 14:03". Fourteen services each log in their own format. Checkout logs <code>order 4521 failed</code>, the payment service logs <code>provider error</code>, with no shared id. Three engineers grep for two hours and connect lines by guessing timestamps. In the post-incident review they find that the payments worker pool dropped the thread-local request id, so every line from background tasks had <code>request_id: null</code>. The fix has four parts: a ContextVar (or MDC in Java) for async-safe ids, a middleware that accepts <code>X-Request-Id</code> and forwards it on every outbound call, a JSON formatter that always includes it, and a CI test that fails if a log line lacks the field.</p>` },
      { title: 'One request, found in seconds', html: `<p>With the id on every line the search is one query across all services:</p>`, code: LQ(`{env="prod"} | json | request_id="req-8f3a9c21d4b7"\n| line_format "{{.service}} {{.level}} {{.msg}}"`, 'LogQL: the whole story of one request') },
      { title: 'Sampling without breaking requests', html: `<p>Routine INFO lines are 90 percent of the volume. Keep all WARN and ERROR, and keep INFO for a fixed 10 percent of <i>requests</i>: compute <code>hash(request_id) % 100 &lt; 10</code> once per request and apply it to every INFO line of that request. Random per-line sampling would keep a "request started" line and drop its "request finished" line, making the survivors misleading. Also drop <code>/health</code> and <code>/metrics</code> access logs entirely: they are written every few seconds by load balancers and tell you nothing.</p>` },
      { title: 'The bill: why labels matter in Loki', html: `<p>A team adds <code>request_id</code> as a Loki <b>label</b> to make searches faster. Loki now creates one stream per request: millions of tiny streams, a huge index, slow ingestion and rate-limit errors. The right design keeps labels to <code>service, env, level</code> and finds the request with <code>| json | request_id="..."</code> or with Loki's <b>structured metadata</b> for high-cardinality values such as trace ids. Same rule as Prometheus: labels are for grouping, not for identifying one event.</p>` }
    ],
    deepDive: `<p>🟣 <b>Context propagation in code.</b> In Python use <code>contextvars</code> (works for asyncio tasks, not for raw threads unless you copy the context with <code>contextvars.copy_context().run</code>). In Java use SLF4J's MDC and wrap executors so the MDC is copied to worker threads. In Go pass <code>context.Context</code> and a logger derived from it. A request id that disappears at a thread or queue boundary is the most common observability bug; the fix is a test, not a reminder.</p>
      <p>🟣 <b>Message queues and jobs.</b> Put the request id and the <code>traceparent</code> into the message headers when publishing, and restore them in the consumer. For batch jobs generate a run id and log it at start and end.</p>
      <p>🟣 <b>Redaction limits.</b> Regular expressions miss data that has no recognisable shape and can cost CPU on very long lines (avoid catastrophic backtracking patterns, keep the lines bounded). A safer approach layers: do not log sensitive objects (use allow-listed fields), redact in the logger, redact again in the collector, restrict who can read the log store, set a retention, and be ready to <b>purge and rotate</b> when a leak is found: deleting the line is not enough if the secret was valid for a week.</p>
      <p>🟣 <b>Privacy and law.</b> Logs holding personal data fall under privacy rules (for example GDPR and similar laws): minimise what is stored, set retention, and have a way to delete one person's data. Hashing an email is still personal data if it can be reversed by guessing; prefer an internal user id.</p>
      <p>🟣 <b>Cost shapes.</b> Elasticsearch needs heap and fast disks proportional to index size, so teams use hot/warm/cold tiers and index lifecycle management (ILM) to roll over and delete indices. Loki keeps chunks in object storage (S3 or MinIO in the lab) and a small index. Pick based on query pattern: constant full-text hunting wants Elasticsearch; "find by service, time and a known id" fits Loki at a fraction of the cost. Elasticsearch's licence changed over the years; OpenSearch is the Apache-licensed fork, relevant if your company has licence rules.</p>`,
    aiEra: `<p>🤖 AI is very good at reading a failing request's log lines and writing a plain summary ("the retry loop hit the provider timeout three times, then the circuit opened"). It can also draft parsing rules and LogQL. The condition is that the logs are structured and linked; with free text and no ids, it guesses.</p>
      <p>🤖 The privacy risk is new: engineers paste log excerpts into chat assistants to debug faster. Treat that as sending data to a third party. Redact first (the pipeline in this topic), use an approved assistant inside your boundary, and never paste live tokens: assume anything pasted may be stored. Also, logs are untrusted input to an AI tool: an attacker can write instructions into a user-agent string that your assistant later reads. Keep AI log analysis read-only.</p>`,
    problems: [P({
      t: 'Redact secrets and personal data from a log line', l: 'Medium', tags: ['logging', 'redaction', 'regex', 'python'], co: ['Stripe', 'Razorpay', 'Datadog'], c: PYC,
      s: `<p>Write <code>redact(line)</code>. Apply these four rules to the line, in this order, using Python's <code>re</code> module:</p>
        <ol><li>Case-insensitive <code>bearer</code> followed by whitespace and a token of characters <code>A-Za-z0-9._~+/=-</code>: keep the word and replace the token with <code>[REDACTED]</code>.</li>
        <li>Case-insensitive word (with a word boundary before) <code>password</code>, <code>passwd</code>, <code>secret</code>, <code>token</code>, <code>api_key</code> or <code>apikey</code>, then optional spaces, <code>=</code> or <code>:</code>, optional spaces, then a value up to whitespace, a comma, a semicolon, a double quote or an ampersand: keep the key and separator, replace the value with <code>[REDACTED]</code>.</li>
        <li>Email addresses <code>[\\w.+-]+@[\\w-]+(?:\\.[\\w-]+)+</code> become <code>[EMAIL]</code>.</li>
        <li>Card numbers: 13 to 19 digits, optionally separated by single spaces or dashes, with word boundaries at both ends, become <code>[CARD]</code>.</li></ol>`,
      ex: `<p><code>login failed password=hunter2 for bob</code> → <code>login failed password=${H.c('g', '[REDACTED]')} for bob</code>. <code>token: abc123 email me at jo.doe+x@mail.example.org</code> → <code>token: [REDACTED] email me at [EMAIL]</code>. <code>no secrets here</code> is unchanged: "secrets" is not followed by <code>=</code> or <code>:</code>.</p>`,
      bw: `<p>Logging whole objects (<code>log.info(request)</code>) and hoping nobody notices. Or one regex for "anything that looks secret", which also destroys harmless text. Redaction must be a small, tested list of rules with known behaviour.</p>`,
      bc: PY(`def redact(line):\n    return line      # logs the raw line, secrets and all`, 'naive: no redaction'),
      q: ['Where should redaction happen first?', ['In the application logger, before the line leaves the process, with a second net in the collector', 'Only in Kibana or Grafana when displaying', 'Only after 30 days, by a cleanup job', 'It is not needed if the log store has a password'], 0, 'Once a secret has been written to a shared store, anyone with read access and every backup holds it. Remove it at the source, then add a collector rule as a safety net.'],
      h: ['<p>Hint 1: compile the four patterns once, in a list, and loop over them in order.</p>', '<p>Hint 2: use groups so the replacement can keep the key and separator: <code>r"\\1\\2[REDACTED]"</code>.</p>', '<p>Hint 3: rule 2 needs the <code>(?i)</code> flag and <code>\\b</code>; the value class is <code>[^\\s,;\\"&amp;]+</code>.</p>'],
      a: `<p>An ordered list of (pattern, replacement) pairs applied with <code>re.sub</code>. Order matters: the key=value rule runs before the email and card rules so a value such as <code>token=jo@example.com</code> is reported as a redacted token. Groups keep the key and its separator so the line stays readable for debugging.</p>`,
      code: PY(`import re

RULES = [
    (re.compile(r"(?i)(bearer\\s+)[A-Za-z0-9._~+/=-]+"), r"\\1[REDACTED]"),
    (re.compile(r"(?i)\\b(password|passwd|secret|token|api_key|apikey)(\\s*[=:]\\s*)[^\\s,;\\"&]+"), r"\\1\\2[REDACTED]"),
    (re.compile(r"[\\w.+-]+@[\\w-]+(?:\\.[\\w-]+)+"), "[EMAIL]"),
    (re.compile(r"\\b(?:\\d[ -]?){12,18}\\d\\b"), "[CARD]"),
]


def redact(line):
    for pattern, repl in RULES:                   # order matters, see the approach
        line = pattern.sub(repl, line)
    return line`, 'redact (tested)'),
      cx: `<p>O(R x L) for R rules and a line of length L. Bound L (truncate very long lines) to stay safe from slow patterns.</p>`,
      f: ['What would you do to catch a secret that has no recognisable pattern?', 'How do you test that every log line contains request_id?'],
      tests: { sig: 'string -> string', fn: 'redact', cases: [
        [['user=a@b.com logged in'], 'user=[EMAIL] logged in'],
        [['Authorization: Bearer abc.def-123'], 'Authorization: Bearer [REDACTED]'],
        [['login failed password=hunter2 for bob'], 'login failed password=[REDACTED] for bob'],
        [['payment card 4111 1111 1111 1111 ok'], 'payment card [CARD] ok'],
        [['no secrets here'], 'no secrets here'],
        [['token: abc123 email me at jo.doe+x@mail.example.org'], 'token: [REDACTED] email me at [EMAIL]'],
        [['order 12345 total 99'], 'order 12345 total 99'],
        [['api_key=AKIAXXXX,region=eu'], 'api_key=[REDACTED],region=eu'],
        [['card=4111-1111-1111-1111'], 'card=[CARD]'],
        [['PASSWORD=Abc! user=x'], 'PASSWORD=[REDACTED] user=x'],
        [[''], ''],
        [['bearer abcDEF123== done'], 'bearer [REDACTED] done'],
        [['from a@x.io to b@y.io'], 'from [EMAIL] to [EMAIL]']
      ] }
    })]
  });

  // ───────────────────────── Topic 7: distributed tracing ─────────────────────────
  var TRACEPARENT_PY = R`# traceparent.py - build and read the W3C Trace Context header by hand (standard library only)
import secrets

HEX = set("0123456789abcdef")


def new_traceparent(sampled=True):
    trace_id = secrets.token_hex(16)             # 16 random bytes = 32 hex characters, shared by the whole trace
    span_id = secrets.token_hex(8)               # 8 random bytes = 16 hex characters, this span only
    return "00-" + trace_id + "-" + span_id + "-" + ("01" if sampled else "00")


def child_traceparent(parent_header):
    # Keep the trace id, make a NEW span id: the caller's span becomes the parent of the next hop.
    version, trace_id, _parent_span, flags = parent_header.split("-")
    return "-".join([version, trace_id, secrets.token_hex(8), flags])


def is_hex(text, length):
    return len(text) == length and all(ch in HEX for ch in text)


def parse(header):
    parts = header.split("-")
    if len(parts) != 4 or parts[0] != "00":
        return None
    _, trace_id, span_id, flags = parts
    if not (is_hex(trace_id, 32) and is_hex(span_id, 16) and is_hex(flags, 2)):
        return None
    if trace_id == "0" * 32 or span_id == "0" * 16:   # all-zero ids are invalid by the spec
        return None
    return {"trace_id": trace_id, "span_id": span_id, "sampled": bool(int(flags, 16) & 1)}


incoming = "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01"     # example from the W3C spec
print("incoming :", incoming)
print("parsed   :", parse(incoming))
outgoing = child_traceparent(incoming)
print("outgoing : same trace id, new span id ->", outgoing[:36] + "...")
print("same trace:", parse(outgoing)["trace_id"] == parse(incoming)["trace_id"])
print("bad header:", parse("00-00000000000000000000000000000000-00f067aa0ba902b7-01"))`;

  var HTTP_TRACE = `GET /pay HTTP/1.1
Host: checkout.internal
traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
tracestate: vendor1=opaque-value
baggage: tenant=acme,feature_flag=new_checkout`;

  topics.push({
    title: 'Distributed Tracing: Traces, Spans and W3C traceparent',
    analogy: `<p>A <b>courier parcel</b> carries one tracking number from the shop to your door, and every depot scans it: "arrived Pune 09:10, left 09:40, arrived Mumbai 13:00". The tracking number is the <b>trace id</b>. Each scan stop is a <b>span</b> with a start, an end and a "came from" pointer to the previous stop. When a parcel arrives late, you do not interview every driver; you read the scan list and see "stuck 20 hours in one depot". The header that travels with the parcel and tells each depot the tracking number is <code>traceparent</code>.</p>`,
    explain: `<p>🟢 <b>A trace</b> is the story of one request across all the services it touched. It is a tree of <b>spans</b>. A <b>span</b> is one timed operation: "handle GET /pay", "SELECT from orders", "call payment provider". Each span has a name, a start time, a duration, a parent, and <b>attributes</b> (key-value facts such as <code>http.route=/pay</code> and <code>http.response.status_code=502</code>). A span can carry <b>events</b> (a timestamped note, such as an exception) and a <b>status</b> (unset, ok or error).</p>
      <p>🟢 <b>Why traces matter.</b> Metrics tell you checkout is slow. Logs tell you something about one service. Only a trace shows <b>which hop</b> in a chain of ten services made this particular request slow, and whether calls ran one after another (sequential) or at the same time (parallel).</p>
      <p>🔵 <b>How the pieces connect: context propagation.</b> When service A calls service B over HTTP, A puts a header on the request; B reads it and creates its spans as children of A's span. The standard header is the <b>W3C Trace Context</b> <code>traceparent</code>:</p>
      <p><code>00 - 4bf92f3577b34da6a3ce929d0e0e4736 - 00f067aa0ba902b7 - 01</code></p>
      ${H.table(['Part', 'Size', 'Meaning'], [
        ['<code>00</code>', '2 hex', 'Version. <code>ff</code> is invalid'],
        ['<code>4bf92f35...4736</code>', '32 hex (16 bytes)', '<b>Trace id</b>, the same on every hop. All zeros is invalid'],
        ['<code>00f067aa0ba902b7</code>', '16 hex (8 bytes)', '<b>Parent span id</b>: the caller\'s span. All zeros is invalid'],
        ['<code>01</code>', '2 hex', 'Flags. Bit 0 set (<code>01</code>) means "sampled": the caller recorded this trace']
      ])}
      <p>Two companion headers: <code>tracestate</code> (vendor-specific data) and <code>baggage</code> (your own key-values that travel to every downstream service). Be careful with baggage: it is copied onto every outbound request, so never put PII or secrets in it.</p>
      <p>🔵 <b>Reading a trace.</b> The waterfall draws spans as bars on a time axis. Two numbers matter. A span's <b>duration</b> includes its children. Its <b>self time</b> (duration minus the time covered by its children) is the work done in that span alone. The slow part is the span with the largest <b>self time</b> on the critical path, not necessarily the longest bar at the top (the root is always the longest).</p>
      <p>🔵 <b>Span hygiene.</b> Name spans with low-cardinality names (<code>GET /pay</code>, the route template, never <code>GET /pay/8841</code>). Put ids in attributes. Mark errors with status ERROR and record the exception. Use the standard attribute names (OpenTelemetry semantic conventions) so tools understand them.</p>`,
    clues: [
      '"Which of our 12 microservices is making checkout slow?" → a distributed trace waterfall, look at self time',
      '"Traces break in the middle" → context lost at a thread, queue, or HTTP client that does not forward traceparent',
      '"Only some requests have traces" → sampling; check the sampled flag and the sampler configuration',
      '"We need the trace id in the error log" → log the trace_id from the current span context',
      '"Serial calls that could be parallel" → the waterfall shows a staircase instead of stacked bars',
      '"Retries hiding behind a timeout" → one parent span with several identical child spans'
    ],
    code: [PYR(TRACEPARENT_PY, 'traceparent.py: build, parse and forward the W3C header (runs in the browser)'), { lang: 'http', title: 'Trace context headers on a request', code: HTTP_TRACE }],
    codeTitle: ['traceparent.py: build, parse and forward the W3C header (runs in the browser)', 'Trace context headers on a request'],
    viz: [{
      title: 'Find the slow span: duration versus self time',
      input: 'gateway|-|0|1200; checkout|gateway|20|1180; cart-db|checkout|40|90; inventory|checkout|100|160; payment-provider|checkout|170|1150; fraud-check|payment-provider|180|230',
      inputLabel: 'spans as name|parent|start_ms|end_ms separated by semicolons (parent - for the root)',
      gen: function (input) {
        var spans = String(input || '').split(';').map(function (x) { return x.trim(); }).filter(Boolean).map(function (x) {
          var p = x.split('|').map(function (s) { return s.trim(); });
          if (p.length !== 4 || !p[0] || isNaN(Number(p[2])) || isNaN(Number(p[3]))) throw new Error('Format: name|parent|start_ms|end_ms; ... (parent is - for the root)');
          return { name: p[0], parent: p[1], start: Number(p[2]), end: Number(p[3]) };
        });
        if (spans.length < 2 || spans.length > 12) throw new Error('Give between 2 and 12 spans');
        spans.forEach(function (s) { if (s.end < s.start) throw new Error('Span ' + s.name + ' ends before it starts'); });
        selfTimes(spans);
        var f = [], rows = [], hl = {};
        function tbl() { return { type: 'table', label: 'spans', columns: ['span', 'parent', 'start', 'end', 'duration', 'self time'], rows: rows.map(function (r) { return r.slice(); }), hl: cp(hl) }; }
        f.push({ narr: 'A trace is a list of spans. The <b>root</b> span (' + H.esc(spans[0].name) + ') is the whole request, so it always looks longest. That does not make it the culprit. We compute each span\'s <b>self time</b>: its duration minus the time covered by its children.', parts: [{ type: 'bars', label: 'duration of each span (ms)', values: spans.map(function (s) { return s.end - s.start; }), idxLabels: spans.map(function (s) { return s.name; }) }] });
        var best = 0;
        spans.forEach(function (s, i) {
          var kids = spans.filter(function (k) { return k.parent === s.name; });
          rows.push([s.name, s.parent, String(s.start), String(s.end), (s.end - s.start) + ' ms', s.self + ' ms']);
          if (s.self > spans[best].self) best = i;
          hl[i] = 'cur';
          f.push({ narr: '<b>' + H.esc(s.name) + '</b> lasts ' + (s.end - s.start) + ' ms' + (kids.length ? ' and its ' + kids.length + ' child' + (kids.length > 1 ? 'ren' : '') + ' (' + kids.map(function (k) { return H.esc(k.name); }).join(', ') + ') cover part of that time. Children running in parallel are counted once.' : ' and has no children') + ' Self time = <b>' + s.self + ' ms</b>.', parts: [tbl()] });
          hl[i] = 'done';
        });
        hl = {}; hl[best] = 'bad';
        f.push({ narr: 'The span with the largest self time is <b class="c-r">' + H.esc(spans[best].name) + '</b> with <b>' + spans[best].self + ' ms</b>. Fix or investigate there first: its own work (waiting on a network call, a lock, a slow query) is where the time goes, not in the parents above it.', parts: [tbl(), { type: 'bars', label: 'self time of each span (ms)', values: spans.map(function (s) { return s.self; }), idxLabels: spans.map(function (s) { return s.name; }), hl: one(best, 'bad') }] });
        return f;
      }
    }],
    examples: [
      { title: 'Situation: finding a slow downstream call with a trace', html: `<p>Checkout p99 doubled. Logs from four services look normal. One slow exemplar from the p99 graph opens a trace of 1.2 s. The root and the checkout span are long, but their self times are 40 and 70 ms. The span <code>POST payment-provider/charge</code> has a self time of <b>930 ms</b>, and under it the log event "retry 2 of 3". The provider changed its timeout from 3 s to 1 s, causing retries. The trace pointed to the one service to ask in 30 seconds, where logs from all the other services would have shown nothing wrong.</p>` },
      { title: 'A staircase that should be a block', html: `<p>A trace for <code>GET /cart</code> shows three spans (<code>get-prices</code>, <code>get-stock</code>, <code>get-promos</code>) of 120 ms each, one after the other: 360 ms. They do not depend on each other. Calling them in parallel makes the same request 120 ms. A waterfall exposes this at a glance; averages and logs never do. After the change the three bars start at the same time and the parent duration drops.</p>` },
      { title: 'Context lost at a queue', html: `<p>A trace ends at "publish order-created". The consumer starts a <i>new</i> trace, so nobody can follow one order across the queue. The fix is to inject the <code>traceparent</code> into the message headers when publishing and to extract it in the consumer, then start the consumer span as a child (or as a <b>link</b> to the producer span if the work is batched or delayed). The same fix applies to thread pools and async tasks: copy the context explicitly.</p>` },
      { title: 'Reading the traceparent from the W3C example', html: `<p><code>00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01</code> means: version 00, trace id <code>4bf92f35...4736</code>, the calling span <code>00f067aa0ba902b7</code>, and flags <code>01</code> so the caller sampled it. The next service creates its own new span id, keeps the trace id, and sends <code>00-4bf92f35...4736-&lt;new span id&gt;-01</code>. The trace id never changes; the span id changes at each hop.</p>` }
    ],
    deepDive: `<p>🟣 <b>Span relationships.</b> Normal parent-child covers request-response. <b>Span links</b> connect spans that are related but not parent-child, such as a batch consumer processing 100 messages from 100 different traces. Span kinds (SERVER, CLIENT, INTERNAL, PRODUCER, CONSUMER) tell tools how to draw service maps and which side of a network call a span measures. A CLIENT span minus the SERVER span below it is roughly network time plus queueing.</p>
      <p>🟣 <b>Sampling decisions and the flag.</b> The first service decides whether a trace is sampled and the <code>01</code> flag tells everyone else ("parent-based sampling"). If a middle service ignores the flag and makes its own decision, you get broken traces with holes. Keep the whole fleet on parent-based samplers (topic 8).</p>
      <p>🟣 <b>Costs.</b> A trace holds many spans; a busy service produces millions per hour. You rarely store all of them. Common policy: keep 100 percent of errors and slow traces (tail sampling) plus a small random sample of the rest. Without that, either the bill explodes or the one trace you needed was never kept.</p>
      <p>🟣 <b>Trace id formats.</b> W3C is the standard and OpenTelemetry's default. Older systems use B3 (Zipkin) or vendor headers (Datadog, AWS X-Ray). The OTel SDK can read and write several at once while you migrate. Mixed-header fleets are the main cause of traces that "stop at the gateway".</p>
      <p>🟣 <b>Privacy.</b> Attributes are stored with the trace. Do not record SQL parameter values, request bodies or full URLs with tokens in query strings. Use the collector's attributes processor (topic 8) to delete or hash risky keys.</p>`,
    aiEra: `<p>🤖 Trace tools increasingly summarise a trace ("85 percent of the time is the payment provider call, which retried twice"). That is a good starting point since a trace is structured data. AI also helps write the boring instrumentation: wrapping a function in a span, adding attributes in the semantic-convention names.</p>
      <p>🤖 AI systems themselves need traces: an LLM agent's steps (retrieve, call tool, generate) are spans, and OpenTelemetry has conventions for generative-AI spans. The same discipline applies: low-cardinality names, no raw prompts or user data in attributes unless you have decided to store them and protected them, and a trace id linking an agent step to the downstream service it called.</p>`,
    problems: [P({
      t: 'Validate and parse a W3C traceparent header', l: 'Medium', tags: ['tracing', 'w3c', 'traceparent', 'python'], co: ['Datadog', 'New Relic', 'Honeycomb'], c: PYC,
      s: `<p>Write <code>parse_traceparent(header)</code> that returns <code>"invalid"</code> or <code>"ok:&lt;trace_id&gt;:&lt;span_id&gt;:&lt;sampled|unsampled&gt;"</code>. Rules: the header splits on <code>-</code> into version, trace id, parent span id and flags. The version is 2 lowercase hex characters and is not <code>ff</code>. For version <code>00</code> there must be exactly 4 fields; for any other version there must be at least 4 (extra fields are ignored). The trace id is 32 lowercase hex characters and not all zeros. The span id is 16 lowercase hex characters and not all zeros. The flags are 2 lowercase hex characters. The trace is <code>sampled</code> when the lowest bit of the flags is 1, else <code>unsampled</code>.</p>`,
      ex: `<p><code>00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01</code> → ${H.c('g', 'ok:4bf92f3577b34da6a3ce929d0e0e4736:00f067aa0ba902b7:sampled')}. Uppercase hex, a 31-character trace id, an all-zero span id, or the version <code>ff</code> → ${H.c('r', 'invalid')}. Flags <code>03</code> still mean sampled because only bit 0 matters.</p>`,
      bw: `<p>Splitting on <code>-</code> and trusting the pieces. A truncated or hostile header then creates spans with garbage ids, or crashes the middleware on every request. A tracing library must treat the header as untrusted input: if it does not validate, start a new trace.</p>`,
      bc: PY(`def parse_traceparent(header):\n    v, t, s, f = header.split("-")      # crashes on bad input, accepts garbage\n    return "ok:" + t + ":" + s + ":sampled"`, 'naive: no validation'),
      q: ['A service receives an invalid <code>traceparent</code>. What should it do?', ['Ignore it and start a new trace', 'Reject the request with 400', 'Copy it forward unchanged', 'Crash and restart'], 0, 'Observability must never break the request. Tracing libraries restart the trace when the header is invalid rather than failing the call.'],
      h: ['<p>Hint 1: split on <code>-</code> and check the number of fields by version.</p>', '<p>Hint 2: write a small helper <code>is_hex(text, length)</code> that checks the length and that every character is in <code>0123456789abcdef</code>.</p>', '<p>Hint 3: reject <code>ff</code>, all-zero ids; read the flags with <code>int(flags, 16) &amp; 1</code>.</p>'],
      a: `<p>Validate each piece strictly and return <code>invalid</code> on the first failure. The version rule has two cases: version <code>00</code> must have exactly four fields, a future version can append fields that a v00 parser must tolerate. Only the lowest flag bit is defined (sampled), so test it with a bit mask and ignore the others.</p>`,
      code: PY(`HEX = set("0123456789abcdef")            # lowercase only: the spec forbids uppercase


def _is_hex(text, length):
    return len(text) == length and all(ch in HEX for ch in text)


def parse_traceparent(header):
    parts = header.split("-")
    if len(parts) < 4:
        return "invalid"
    version, trace_id, span_id, flags = parts[0], parts[1], parts[2], parts[3]
    if not _is_hex(version, 2) or version == "ff":
        return "invalid"
    if version == "00" and len(parts) != 4:
        return "invalid"                       # version 00 has exactly 4 fields
    if not _is_hex(trace_id, 32) or trace_id == "0" * 32:
        return "invalid"
    if not _is_hex(span_id, 16) or span_id == "0" * 16:
        return "invalid"
    if not _is_hex(flags, 2):
        return "invalid"
    sampled = "sampled" if int(flags, 16) & 1 else "unsampled"
    return "ok:" + trace_id + ":" + span_id + ":" + sampled`, 'parse_traceparent (tested)'),
      cx: `<p>O(L) in the header length, which is bounded at about 55 characters for version 00.</p>`,
      f: ['What should a proxy do with the header when it also starts its own span?', 'Why must the span id change at every hop but the trace id must not?'],
      tests: { sig: 'string -> string', fn: 'parseTraceparent', cases: [
        [['00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01'], 'ok:4bf92f3577b34da6a3ce929d0e0e4736:00f067aa0ba902b7:sampled'],
        [['00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-00'], 'ok:4bf92f3577b34da6a3ce929d0e0e4736:00f067aa0ba902b7:unsampled'],
        [['00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-03'], 'ok:4bf92f3577b34da6a3ce929d0e0e4736:00f067aa0ba902b7:sampled'],
        [['00-00000000000000000000000000000000-00f067aa0ba902b7-01'], 'invalid'],
        [['00-4bf92f3577b34da6a3ce929d0e0e4736-0000000000000000-01'], 'invalid'],
        [['ff-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01'], 'invalid'],
        [['00-4BF92F3577B34DA6A3CE929D0E0E4736-00f067aa0ba902b7-01'], 'invalid'],
        [['00-4bf92f3577b34da6a3ce929d0e0e473-00f067aa0ba902b7-01'], 'invalid'],
        [['00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7'], 'invalid'],
        [['00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01-extra'], 'invalid'],
        [['01-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-02-extra'], 'ok:4bf92f3577b34da6a3ce929d0e0e4736:00f067aa0ba902b7:unsampled'],
        [[''], 'invalid'],
        [['00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-0g'], 'invalid'],
        [['00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-1'], 'invalid']
      ] }
    })]
  });

  // ───────────────────────── Topic 8: OpenTelemetry, Collector, sampling, exemplars ─────────────────────────
  var OTEL_PY = R`# otel_app.py - manual OpenTelemetry tracing, linked to metrics (exemplar) and logs (trace_id)
# pip install opentelemetry-sdk opentelemetry-exporter-otlp-proto-grpc prometheus-client requests
import logging
import os
import time

import requests
from opentelemetry import trace
from opentelemetry.propagate import inject
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.trace import SpanKind, Status, StatusCode
from prometheus_client import Histogram

# 1. Resource = who is sending. These attributes become service.name in every backend.
resource = Resource.create({
    "service.name": "checkout",
    "service.version": os.environ.get("APP_VERSION", "dev"),
    "deployment.environment.name": "lab",
})

# 2. Provider + exporter. The endpoint and the sampler come from standard OTEL_* environment variables (no code, no secrets).
provider = TracerProvider(resource=resource)
provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter()))   # batches spans, never blocks a request
trace.set_tracer_provider(provider)
tracer = trace.get_tracer("checkout.app")

LATENCY = Histogram("http_request_duration_seconds", "Request duration in seconds", ["route"])
log = logging.getLogger("checkout")


def charge(order_id, amount_minor):
    # A CLIENT span around the outbound call; the name is low-cardinality, ids go in attributes.
    with tracer.start_as_current_span("POST payment-provider/charge", kind=SpanKind.CLIENT) as span:
        span.set_attribute("order.id", order_id)
        headers = {}
        inject(headers)                                  # writes the traceparent header into the dict
        try:
            resp = requests.post(os.environ["PROVIDER_URL"], json={"amount": amount_minor}, headers=headers, timeout=2)
            span.set_attribute("http.response.status_code", resp.status_code)
            resp.raise_for_status()
            return resp.json()
        except Exception as exc:
            span.record_exception(exc)                   # adds an exception event to the span
            span.set_status(Status(StatusCode.ERROR, str(exc)))
            raise


def handle_pay(order_id, amount_minor):
    start = time.perf_counter()
    with tracer.start_as_current_span("POST /pay", kind=SpanKind.SERVER) as span:
        ctx = span.get_span_context()
        trace_id = format(ctx.trace_id, "032x")          # the 32-hex trace id, same format as in traceparent
        log.info("charging order", extra={"fields": {"trace_id": trace_id, "order_id": order_id}})   # logs link to the trace
        try:
            return charge(order_id, amount_minor)
        finally:
            # Exemplar: this histogram observation remembers WHICH trace produced it.
            LATENCY.labels("/pay").observe(time.perf_counter() - start, {"trace_id": trace_id})`;

  var OTEL_ENV = R`# The SDK reads these standard variables. Set them in docker-compose; the values below are lab values, not secrets.
export OTEL_SERVICE_NAME=checkout
export OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4317
export OTEL_EXPORTER_OTLP_INSECURE=true            # lab only: plain gRPC inside the compose network
export OTEL_TRACES_SAMPLER=parentbased_traceidratio  # respect the caller's decision; for new traces keep a ratio
export OTEL_TRACES_SAMPLER_ARG=1.0                 # keep everything at the SDK, let the Collector tail-sample
export OTEL_RESOURCE_ATTRIBUTES=deployment.environment.name=lab,service.version=1.4.2

# Zero-code option: auto-instrument Flask/requests/psycopg and friends without touching the source
pip install opentelemetry-distro opentelemetry-exporter-otlp
opentelemetry-bootstrap -a install                 # installs instrumentations for the libraries it finds
opentelemetry-instrument python app.py             # starts the app with tracing on`;

  var COLLECTOR_YML = R`# otel/collector.yaml  (otel/opentelemetry-collector-contrib image: tail_sampling lives in contrib)
receivers:
  otlp:
    protocols:
      grpc: { endpoint: 0.0.0.0:4317 }
      http: { endpoint: 0.0.0.0:4318 }

processors:
  memory_limiter:                  # FIRST in every pipeline: refuse data before the Collector itself runs out of memory
    check_interval: 1s
    limit_mib: 400
    spike_limit_mib: 100
  attributes/scrub:                # remove or hash risky attributes before anything is stored
    actions:
      - key: http.request.header.authorization
        action: delete
      - key: user.email
        action: hash
  tail_sampling:                   # decide AFTER the whole trace has arrived
    decision_wait: 10s             # wait this long for late spans
    num_traces: 50000              # traces held in memory while waiting
    policies:
      - name: keep-errors
        type: status_code
        status_code: { status_codes: [ERROR] }
      - name: keep-slow
        type: latency
        latency: { threshold_ms: 500 }
      - name: baseline
        type: probabilistic
        probabilistic: { sampling_percentage: 10 }
  batch: {}                        # LAST: group spans into bigger requests for the exporter

connectors:
  spanmetrics:                     # turn spans into RED metrics (calls, errors, duration histograms)
    histogram:
      explicit:
        buckets: [50ms, 100ms, 300ms, 500ms, 1s, 2s, 5s]
    exemplars:
      enabled: true

exporters:
  otlp/jaeger:
    endpoint: jaeger:4317
    tls: { insecure: true }        # lab only
  prometheus:
    endpoint: 0.0.0.0:8889         # Prometheus scrapes the Collector here

service:
  pipelines:
    traces/in:                     # everything is counted for metrics BEFORE sampling
      receivers: [otlp]
      processors: [memory_limiter, attributes/scrub]
      exporters: [spanmetrics]       # only feeds the connector; nothing is stored from this pipeline
    traces/sampled:
      receivers: [otlp]
      processors: [memory_limiter, attributes/scrub, tail_sampling, batch]
      exporters: [otlp/jaeger]
    metrics:
      receivers: [spanmetrics]
      processors: [memory_limiter, batch]
      exporters: [prometheus]`;

  topics.push({
    title: 'OpenTelemetry: SDK, Collector Pipeline, Sampling and Exemplars',
    analogy: `<p>OpenTelemetry is the <b>standard electrical plug</b> for telemetry. Without it, every vendor sells its own plug: switch from one monitoring product to another and you must rewire every appliance (re-instrument every service). With a standard plug on the appliance (the <b>SDK</b> in your app), you can change the power company later. The <b>Collector</b> is the fuse box in the hallway: everything plugs into it first, and there you decide to filter out dangerous surges (scrub secrets), split the supply (send traces to Jaeger, metrics to Prometheus), and only keep the readings worth paying for (sampling).</p>`,
    explain: `<p>🟢 <b>OpenTelemetry (OTel)</b> is a vendor-neutral, open standard (a CNCF project) for producing traces, metrics and logs. It is made of:</p>
      ${H.table(['Piece', 'What it is', 'You touch it when'], [
        ['<b>API</b>', 'The small interface your code calls (<code>start_span</code>)', 'Writing instrumentation in libraries'],
        ['<b>SDK</b>', 'The implementation: sampler, processors, exporters', 'Starting your app'],
        ['<b>OTLP</b>', 'The wire protocol (gRPC on 4317, HTTP on 4318)', 'Configuring endpoints'],
        ['<b>Collector</b>', 'A separate process: receivers, processors, exporters', 'Routing and scrubbing in the middle'],
        ['<b>Semantic conventions</b>', 'Standard attribute names (<code>http.route</code>, <code>db.system</code>)', 'Naming attributes']
      ])}
      <p>🔵 <b>The data path:</b> app code → SDK (batches spans) → OTLP → <b>Collector</b> (<code>receivers → processors → exporters</code>, wired by named <i>pipelines</i>) → backends (Jaeger for traces, Prometheus for metrics, Loki for logs). Sending to a Collector instead of straight to the backend lets you change backends, scrub data and sample without redeploying any app.</p>
      <p>🔵 <b>Two ways to instrument.</b> <b>Auto-instrumentation</b> (an agent or <code>opentelemetry-instrument</code>) wraps popular frameworks and clients, giving you server spans, HTTP client spans and DB spans with zero code. <b>Manual</b> spans add business meaning: "charge card", "apply promo". Use auto first, add manual spans where a decision or a slow step needs a name.</p>
      <p>🔵 <b>Sampling: keep the useful traces.</b></p>
      ${H.table(['Kind', 'Decided', 'Pros', 'Cons'], [
        ['<b>Head</b> (probabilistic)', 'At the start of the trace, in the SDK', 'Cheap and simple; consistent via parent-based flag', 'Blind: it may drop the one slow or failing trace'],
        ['<b>Tail</b>', 'After the whole trace arrives, in the Collector', 'Keeps all errors and slow traces plus a baseline', 'Needs memory and all spans of a trace on one Collector']
      ])}
      <p>🔵 <b>Exemplars link metrics to traces.</b> An <b>exemplar</b> is a sample trace id attached to a metric observation. When a histogram bucket for "over 1 second" gets an observation, the app stores the trace id of that request next to it. Grafana then draws dots on the latency graph; clicking one opens that exact slow trace. It closes the loop: <b>alert → graph → trace → logs</b>.</p>`,
    clues: [
      '"We want to switch from Datadog to something else without re-instrumenting" → OpenTelemetry SDK plus the Collector',
      '"Keep every error trace but only 5 percent of the rest" → tail sampling in the Collector',
      '"Traces cost too much" → sampling, attribute scrubbing, shorter retention, drop health-check spans',
      '"Where do we remove PII from spans?" → attributes processor in the Collector (and do not record it at the source)',
      '"The p99 graph is high but which request?" → exemplars with trace ids',
      '"Auto or manual instrumentation?" → auto for frameworks and clients, manual for business steps',
      '"Services are missing from the trace" → propagator mismatch, or one service not exporting to the Collector'
    ],
    code: [PY(OTEL_PY, 'otel_app.py: SDK setup, spans, error recording, exemplar and trace_id in logs'), SH(OTEL_ENV, 'OTEL environment variables and auto-instrumentation'), Y(COLLECTOR_YML, 'collector.yaml: scrub, tail-sample, export to Jaeger and Prometheus')],
    codeTitle: ['otel_app.py: SDK setup, spans, error recording, exemplar and trace_id in logs', 'OTEL environment variables and auto-instrumentation', 'collector.yaml: scrub, tail-sample, export to Jaeger and Prometheus'],
    viz: [{
      title: 'Tail sampling: keep the errors and the slow ones',
      input: 'traces=ok ok slow ok error ok ok ok ok ok ok ok slow ok ok, keep_ok_every=5',
      inputLabel: 'traces: ok, slow or error separated by spaces (in arrival order); keep_ok_every: keep 1 of every N ok traces',
      gen: function (input) {
        var o = kv(input, 'Format: traces=ok ok slow error ok, keep_ok_every=5');
        var tr = String(o.traces === undefined ? '' : o.traces).trim().toLowerCase().split(/\s+/).filter(Boolean);
        if (tr.length < 2 || tr.length > 30) throw new Error('Give 2 to 30 traces');
        tr.forEach(function (t) { if (['ok', 'slow', 'error'].indexOf(t) < 0) throw new Error('Each trace must be ok, slow or error (got "' + t + '")'); });
        var n = num(o.keep_ok_every === undefined ? 5 : o.keep_ok_every, 'keep_ok_every');
        if (n < 1 || Math.floor(n) !== n) throw new Error('keep_ok_every must be a whole number, 1 or more');
        var kept = [], okSeen = 0, f = [], hl = {}, keptBad = 0, totalBad = 0;
        function view(i) { return { type: 'array', label: 'traces in arrival order', values: tr, hl: cp(hl), showIdx: true }; }
        f.push({ narr: 'The Collector holds each trace for <code>decision_wait</code> until all its spans have arrived, then applies the policies: <b>keep errors</b>, <b>keep slow (over 500 ms)</b>, and <b>keep 1 in ' + n + ' of the rest</b> as a baseline.', parts: [view()] });
        tr.forEach(function (t, i) {
          var keep, why;
          if (t === 'error') { keep = true; why = 'policy <b>keep-errors</b> matches'; totalBad++; keptBad++; }
          else if (t === 'slow') { keep = true; why = 'policy <b>keep-slow</b> matches (over 500 ms)'; totalBad++; keptBad++; }
          else { okSeen++; keep = (okSeen % n === 0); why = keep ? 'ok trace number ' + okSeen + ' is the 1-in-' + n + ' <b>baseline</b> sample' : 'ok trace number ' + okSeen + ': not a baseline pick, dropped'; }
          if (keep) kept.push(t);
          hl[i] = keep ? (t === 'ok' ? 'win' : 'ok') : 'bad';
          f.push({ narr: 'Trace ' + i + ' is <b>' + t + '</b>: ' + why + '. ' + (keep ? 'Stored.' : 'Dropped, saving storage cost.'), parts: [view(), { type: 'vars', label: 'so far', vals: { kept: kept.length, total: i + 1 }, hl: one('kept', keep ? 'ok' : 'bad') }] });
        });
        f.push({ narr: 'Kept <b>' + kept.length + ' of ' + tr.length + '</b> traces (' + Math.round(100 * kept.length / tr.length) + '%), including <b>' + keptBad + ' of ' + totalBad + '</b> errors and slow traces. Head sampling at the same rate would have thrown away roughly ' + Math.round(100 - 100 * kept.length / tr.length) + '% of the interesting ones too. The price: the Collector must hold traces in memory and all spans of a trace must reach the same Collector instance.', parts: [view(), { type: 'vars', label: 'result', vals: { kept: kept.length, total: tr.length, interesting_kept: keptBad + ' / ' + totalBad }, hl: { interesting_kept: 'ok' } }] });
        return f;
      }
    }],
    examples: [
      { title: 'Situation: a trace that proves the downstream is slow', html: `<p>Traces from checkout show a 900 ms client span <code>POST payment-provider/charge</code> with status ERROR and an exception event "ReadTimeout after 2s, retry 2". Because the SDK used <code>record_exception</code> and <code>set_status</code>, the tail-sampling policy <code>keep-errors</code> kept this trace even though only 10 percent of ordinary traces survive. Without tail sampling the team would have found this at best one time in ten. Always mark failures as ERROR: it is what the policies and dashboards key on.</p>` },
      { title: 'Metrics from spans, and why they must see all spans', html: `<p>The <code>spanmetrics</code> connector turns spans into <code>calls_total</code> and a duration histogram, giving instant RED metrics for services you have not instrumented with Prometheus. It must sit on a pipeline that sees <b>every</b> span, before sampling. Otherwise a 10 percent sample makes the request rate look ten times lower. That is why the Collector config above has two traces pipelines: one feeds the connector with everything, the other applies tail sampling for storage.</p>` },
      { title: 'Scrub before you store', html: `<p>A new auto-instrumentation release starts recording the full <code>Authorization</code> header as a span attribute. With the <code>attributes/scrub</code> processor the key is deleted in the Collector within minutes of finding it, without redeploying 40 services. The user's email attribute is hashed so you can still count distinct users without storing the address. Fix the source too (configure the instrumentation not to capture it) and rotate any credential that was stored.</p>` },
      { title: 'One diagram, three exporters', html: `<p>The same SDK, unchanged, can feed Jaeger in the lab, Grafana Tempo in a company cluster and Datadog or New Relic in a vendor setup: only the Collector's <code>exporters</code> block changes. That is the practical value of the standard: migrating observability backends becomes a Collector config change instead of a code rewrite.</p>` }
    ],
    deepDive: `<p>🟣 <b>Sampler details.</b> <code>parentbased_traceidratio</code> means: if the parent sent a sampled flag, follow it; otherwise (a new root) sample a fraction decided from the trace id, so every service computing the same decision from the same id agrees. <code>always_on</code> sends everything; <code>always_off</code> nothing. For tail sampling, set the SDK to export everything (<code>1.0</code>), accepting the network and Collector load, then drop in the Collector.</p>
      <p>🟣 <b>Scaling tail sampling.</b> All spans of one trace must land on the same Collector. Run a first tier of Collectors with the <b>load-balancing exporter</b> routing by trace id to a second tier that runs <code>tail_sampling</code>. Size <code>num_traces</code> and <code>decision_wait</code> against your peak: memory is roughly traces held times average trace size. Late spans arriving after the decision are dropped or become orphans.</p>
      <p>🟣 <b>Pipeline order matters.</b> Put <code>memory_limiter</code> first (to protect the Collector) and <code>batch</code> last (to optimise export). Run attribute scrubbing before sampling and export. Monitor the Collector itself: it exposes its own metrics (accepted, refused and dropped spans); an alert on refused spans catches a silent data loss.</p>
      <p>🟣 <b>Exemplar plumbing.</b> The Python client attaches an exemplar on <code>observe(value, {...})</code>; the <code>/metrics</code> endpoint must be scraped in the OpenMetrics format, since the classic text format has no exemplars; Prometheus needs <code>--enable-feature=exemplar-storage</code> (check the flag for your version); Grafana maps the label name (here <code>trace_id</code>) to the tracing data source. Exemplar label sets are limited to 128 characters, enough for a trace id and nothing else.</p>
      <p>🟣 <b>Logs in OTel.</b> The logs signal is the youngest. Many teams keep their existing logger, write JSON to stdout, and just add <code>trace_id</code> and <code>span_id</code> fields; a Collector or Alloy ships them. Use the OTel logs SDK only when its maturity in your language fits your needs.</p>
      <p>🟣 <b>Cardinality again.</b> Span attributes are not indexed like metric labels, but converting attributes into metric dimensions (spanmetrics dimensions) recreates the cardinality trap. Choose dimensions like <code>http.route</code> and <code>http.response.status_code</code>, never <code>user.id</code>.</p>`,
    aiEra: `<p>🤖 Coding assistants generate OpenTelemetry boilerplate well: provider setup, an exporter, a decorator that wraps functions in spans. Check for the common faults: spans named with ids, secrets or whole request bodies stored as attributes, a missing <code>end</code> or context manager so spans never finish, and sampler settings that silently drop everything.</p>
      <p>🤖 Telemetry from AI agents is its own area: each LLM call, retrieval and tool call is a span, with the model name, token counts and latency as attributes. Cost and quality problems (a retrieval loop that burns tokens) show up in traces first. Keep prompts and outputs out of attributes by default, or store them only in a protected, short-retention backend, because they contain user data.</p>`,
    problems: [P({
      t: 'Build the Collector pipeline: scrub, tail-sample, export', l: 'Hard', tags: ['opentelemetry', 'collector', 'tail sampling', 'pii'], co: ['Grafana Labs', 'Datadog', 'Uber'],
      s: `<p>Write the OpenTelemetry Collector config for the lab. Requirements: accept OTLP on 4317 and 4318; delete the <code>http.request.header.authorization</code> attribute and hash <code>user.email</code>; keep 100% of error traces, 100% of traces slower than 500 ms and 10% of the others; protect the Collector from running out of memory; send traces to Jaeger and span-derived RED metrics to Prometheus. Explain why the metrics must see all spans, and what must be true to run tail sampling on more than one Collector.</p>`,
      ex: `<p>1000 traces arrive: 20 errors, 30 slow, 950 ok. Kept: ${H.c('g', '20 + 30 + about 95')} = about 145 (14.5%), instead of 1000. All 50 interesting ones survive. A 10% head sampler would keep only about ${H.c('r', '5')} of them.</p>`,
      bw: `<p>The SDK samples 10% at random and exports straight to the vendor. Errors are dropped nine times out of ten, secrets in attributes are stored as they are, and changing vendor means touching every service.</p>`,
      bc: Y(`# app-side only: head sampling at 10 percent, no scrubbing, direct to backend\nOTEL_TRACES_SAMPLER: traceidratio\nOTEL_TRACES_SAMPLER_ARG: "0.1"\nOTEL_EXPORTER_OTLP_ENDPOINT: https://vendor.example.com`, 'naive: head sampling and no Collector'),
      q: ['Why does the <code>spanmetrics</code> connector sit on a pipeline before tail sampling?', ['So rates and error counts reflect all requests, not only the kept sample', 'Because tail_sampling cannot read spans', 'To make traces smaller', 'It is a Jaeger requirement'], 0, 'Metrics computed after sampling would count only the survivors, understating traffic and distorting error ratios. Count everything first, then sample for storage.'],
      h: ['<p>Hint 1: receivers → processors → exporters, then wire them in <code>service.pipelines</code>.</p>', '<p>Hint 2: <code>memory_limiter</code> is first, <code>batch</code> is last; the attributes processor goes before sampling.</p>', '<p>Hint 3: tail sampling needs every span of a trace on one instance: put a load-balancing exporter keyed by trace id in front of the sampling tier.</p>'],
      a: `<p>Use the contrib Collector. Receivers: OTLP gRPC and HTTP. Processors: <code>memory_limiter</code>, an <code>attributes</code> processor with a delete and a hash action, <code>tail_sampling</code> with three policies (status code ERROR, latency over 500 ms, probabilistic 10%) and <code>batch</code>. Two traces pipelines: one feeds the <code>spanmetrics</code> connector with every span; the other applies sampling and exports to Jaeger. The metrics pipeline exports through the Prometheus exporter that Prometheus scrapes on 8889. For several Collectors, put a first tier using the <code>loadbalancing</code> exporter with <code>routing_key: traceID</code> in front of a second tier doing the sampling, so each trace is decided in one place.</p>`,
      code: Y(COLLECTOR_YML, 'collector.yaml'),
      cx: `<p>Memory is roughly the number of traces held (<code>num_traces</code>) times their average size; <code>decision_wait</code> is the added delay before a trace becomes visible.</p>`,
      f: ['What happens to a span that arrives after decision_wait?', 'How would you alert if the Collector starts refusing spans?']
    })]
  });

  // ───────────────────────── Topic 9: SLI, SLO, error budgets, burn rates ─────────────────────────
  var SLO_RULES = R`# prometheus/rules/slo.yml  - SLO: 99.9% of checkout requests succeed, over 30 days  (error budget = 0.001)
groups:
  - name: checkout_slo_ratios
    rules:
      # One recording rule per window: the share of requests that were errors. Same expression, different range.
      - record: service:http_errors:ratio_rate5m
        expr: sum by (service) (rate(http_requests_total{status=~"5.."}[5m])) / sum by (service) (rate(http_requests_total[5m]))
      - record: service:http_errors:ratio_rate30m
        expr: sum by (service) (rate(http_requests_total{status=~"5.."}[30m])) / sum by (service) (rate(http_requests_total[30m]))
      - record: service:http_errors:ratio_rate1h
        expr: sum by (service) (rate(http_requests_total{status=~"5.."}[1h])) / sum by (service) (rate(http_requests_total[1h]))
      - record: service:http_errors:ratio_rate2h
        expr: sum by (service) (rate(http_requests_total{status=~"5.."}[2h])) / sum by (service) (rate(http_requests_total[2h]))
      - record: service:http_errors:ratio_rate6h
        expr: sum by (service) (rate(http_requests_total{status=~"5.."}[6h])) / sum by (service) (rate(http_requests_total[6h]))
      - record: service:http_errors:ratio_rate1d
        expr: sum by (service) (rate(http_requests_total{status=~"5.."}[1d])) / sum by (service) (rate(http_requests_total[1d]))
      - record: service:http_errors:ratio_rate3d
        expr: sum by (service) (rate(http_requests_total{status=~"5.."}[3d])) / sum by (service) (rate(http_requests_total[3d]))

  - name: checkout_slo_burn_alerts
    rules:
      # Multi-window, multi-burn-rate: BOTH the long and the short window must be over the threshold.
      # Long window = significant budget loss. Short window (1/12 of the long) = it is still happening, so the alert resets fast.
      - alert: CheckoutBudgetBurnFast          # 14.4x burn: 2% of the 30-day budget gone in 1 hour
        expr: |
          service:http_errors:ratio_rate1h{service="checkout"} > (14.4 * 0.001)
          and
          service:http_errors:ratio_rate5m{service="checkout"} > (14.4 * 0.001)
        for: 2m
        labels: { severity: page, team: payments }
        annotations:
          summary: 'Checkout burns its error budget 14.4x too fast (2% of the month in 1 hour)'
          runbook_url: https://runbooks.example.com/checkout/slo-burn

      - alert: CheckoutBudgetBurnSlow          # 6x burn: 5% of the budget gone in 6 hours
        expr: |
          service:http_errors:ratio_rate6h{service="checkout"} > (6 * 0.001)
          and
          service:http_errors:ratio_rate30m{service="checkout"} > (6 * 0.001)
        for: 15m
        labels: { severity: page, team: payments }
        annotations:
          summary: 'Checkout burns its error budget 6x too fast (5% of the month in 6 hours)'
          runbook_url: https://runbooks.example.com/checkout/slo-burn

      - alert: CheckoutBudgetBurnTicket        # 3x burn over a day: 10% of the budget. Not urgent at night.
        expr: |
          service:http_errors:ratio_rate1d{service="checkout"} > (3 * 0.001)
          and
          service:http_errors:ratio_rate2h{service="checkout"} > (3 * 0.001)
        for: 1h
        labels: { severity: ticket, team: payments }
        annotations:
          summary: 'Checkout error budget is draining 3x too fast over a day'

      - alert: CheckoutBudgetBurnTicketSlow    # 1x burn over 3 days: on course to use exactly the whole budget
        expr: |
          service:http_errors:ratio_rate3d{service="checkout"} > (1 * 0.001)
          and
          service:http_errors:ratio_rate6h{service="checkout"} > (1 * 0.001)
        for: 3h
        labels: { severity: ticket, team: payments }
        annotations:
          summary: 'Checkout is on course to spend its whole monthly error budget'`;

  var LATENCY_SLI = PQ(R`# Availability SLI: good events / valid events. Here: non-5xx over all requests, 30 day window.
1 - (
  sum(increase(http_requests_total{service="checkout", status=~"5.."}[30d]))
  /
  sum(increase(http_requests_total{service="checkout"}[30d]))
)

# Latency SLI: share of requests faster than 300 ms. Needs a bucket edge at exactly le="0.3".
sum(rate(http_request_duration_seconds_bucket{service="checkout", le="0.3"}[5m]))
  /
sum(rate(http_request_duration_seconds_count{service="checkout"}[5m]))

# Error budget remaining (fraction of the budget left) for a 99.9% SLO:
1 - (
  (1 - (sum(increase(http_requests_total{service="checkout", status!~"5.."}[30d])) / sum(increase(http_requests_total{service="checkout"}[30d]))))
  / 0.001
)`, 'SLIs and the remaining budget in PromQL');

  topics.push({
    title: 'SLIs, SLOs, Error Budgets and Multi-Window Burn-Rate Alerts',
    analogy: `<p>Think of a <b>monthly phone data plan</b>. The plan is your <b>SLO</b>: 50 GB a month. The <b>SLI</b> is the meter that counts what you used. The <b>error budget</b> is what is still left. If you burned 30 GB in the first week, no one needs the exact figure to know you are in trouble: your <b>burn rate</b> is too high. You do not wait until the plan is empty to react, you react when the rate says you will run out early. And the <b>SLA</b> is the contract with the phone company: it says what money they owe you if they break their promise; the SLO is your own, stricter target so you never reach the point of paying.</p>`,
    explain: `<p>🟢 <b>The four words.</b></p>
      ${H.table(['Term', 'Plain meaning', 'Example'], [
        ['<b>SLI</b> (indicator)', 'A measurement of "good" as a ratio: good events / valid events', 'Share of checkout requests that return non-5xx in under 300 ms'],
        ['<b>SLO</b> (objective)', 'The target for the SLI over a window', '99.9% over 30 days'],
        ['<b>SLA</b> (agreement)', 'A contract with consequences (credits, penalties). Looser than the SLO', '99.5% monthly, otherwise a 10% service credit'],
        ['<b>Error budget</b>', '1 minus the SLO: how much failure you may have', '0.1% of requests, about 43 minutes of full outage per 30 days']
      ])}
      <p>🟢 <b>Why a budget?</b> 100 percent is the wrong target: it is infinitely expensive and users cannot tell 99.99 from 100 because their phone, Wi-Fi and ISP fail more often. A budget turns reliability into a shared, honest number. When the budget is healthy, ship features and take risks. When it is spent, slow down and fix reliability. It ends the argument between "ship faster" and "be safe".</p>
      <p>🔵 <b>The nines (30 day window)</b></p>
      ${H.table(['SLO', 'Allowed bad', 'Full-outage time per 30 days'], [
        ['99%', '1 in 100', '7.2 hours'], ['99.9%', '1 in 1,000', '43.2 minutes'], ['99.95%', '1 in 2,000', '21.6 minutes'], ['99.99%', '1 in 10,000', '4.3 minutes'], ['99.999%', '1 in 100,000', '26 seconds']
      ])}
      <p>🔵 <b>Burn rate</b> is how fast you spend the budget compared with "exactly using it all by the end of the window": <code>burn rate = observed error ratio / allowed error ratio</code>. Burn 1 uses exactly the whole budget in 30 days. Burn 14.4 uses 2 percent of it in one hour. Burn 216 uses 30 percent in one hour (it would last only 3.3 hours).</p>
      <p>🔵 <b>Why not alert on "error ratio above 0.1%"?</b> Because a tiny leak that would last all month and a huge outage that lasts a few minutes both break a naive alert in opposite ways: too slow for the big one, too noisy for the small one. The standard fix from the Google SRE workbook is <b>multi-window, multi-burn-rate</b> alerts: a threshold on a <b>long window</b> (it matters) AND a <b>short window</b> (it is still happening).</p>
      ${H.table(['Severity', 'Burn rate', 'Long window', 'Short window', 'Budget consumed when it fires'], [
        ['Page', '14.4', '1 h', '5 m', '2%'], ['Page', '6', '6 h', '30 m', '5%'], ['Ticket', '3', '1 d', '2 h', '10%'], ['Ticket', '1', '3 d', '6 h', '10%']
      ])}
      <p>The short window is about one twelfth of the long one. It makes the alert <b>clear quickly</b> once the problem is fixed, and it prevents a page about trouble that ended an hour ago.</p>`,
    clues: [
      '"Define reliability for the checkout service" → SLI as good/valid ratio, SLO target and window, error budget',
      '"How do you decide when to stop shipping features?" → error budget policy: freeze risky changes when the budget is spent',
      '"30 percent of the monthly budget burned in an hour" → burn rate 216: page immediately (fast-burn alert)',
      '"A small steady error rate for a week" → slow-burn ticket alert (burn 1 or 3)',
      '"Why two windows in one alert?" → long window for significance, short window for freshness and quick reset',
      '"SLA vs SLO" → SLA is contractual and looser; SLO is internal and tighter',
      '"Latency SLO" → fraction of requests under a threshold, a histogram bucket edge at the threshold'
    ],
    code: [Y(SLO_RULES, 'slo.yml: recording rules and four burn-rate alerts for a 99.9% SLO'), LATENCY_SLI],
    codeTitle: ['slo.yml: recording rules and four burn-rate alerts for a 99.9% SLO', 'SLIs and the remaining budget in PromQL'],
    viz: [{
      title: 'Which burn-rate alert fires?',
      input: 'slo=99.9, 5m=2, 30m=1.8, 1h=1.7, 2h=1, 6h=0.7, 1d=0.2, 3d=0.1',
      inputLabel: 'slo (percent) and the error ratio in PERCENT for each window: 5m, 30m, 1h, 2h, 6h, 1d, 3d',
      gen: function (input) {
        var o = kv(input, 'Format: slo=99.9, 5m=2, 30m=1.8, 1h=1.7, 2h=1, 6h=0.7, 1d=0.2, 3d=0.1');
        var slo = num(o.slo === undefined ? 99.9 : o.slo, 'slo');
        if (slo <= 0 || slo >= 100) throw new Error('slo must be above 0 and below 100');
        var W = ['5m', '30m', '1h', '2h', '6h', '1d', '3d'], er = {};
        W.forEach(function (w) { er[w] = num(o[w] === undefined ? 0 : o[w], w) / 100; if (er[w] < 0 || er[w] > 1) throw new Error(w + ' must be between 0 and 100 percent'); });
        var budget = (100 - slo) / 100, burn = {};
        W.forEach(function (w) { burn[w] = er[w] / budget; });
        var rules = [['Page: fast burn', 14.4, '1h', '5m'], ['Page: slow burn', 6, '6h', '30m'], ['Ticket: 1 day', 3, '1d', '2h'], ['Ticket: 3 days', 1, '3d', '6h']];
        var f = [], rows = [], hl = {};
        f.push({ narr: 'The SLO is <b>' + slo + '%</b>, so the error budget is <b>' + (budget * 100).toFixed(4).replace(/0+$/, '').replace(/\.$/, '') + '%</b> of requests. A <b>burn rate</b> of 1 means the current error ratio equals the budget: the month\'s budget would be used exactly at the end.', parts: [{ type: 'vars', label: 'budget', vals: { slo_percent: slo, error_budget_ratio: Number(budget.toPrecision(6)) } }] });
        W.forEach(function (w, i) {
          rows.push([w, (er[w] * 100).toFixed(3) + ' %', burn[w].toFixed(2) + 'x']);
          hl[i] = burn[w] >= 1 ? 'cur' : 'ok';
        });
        f.push({ narr: 'Burn rate per window = error ratio / budget. For example the 1h window: ' + (er['1h'] * 100).toFixed(3) + '% / ' + (budget * 100).toFixed(3) + '% = <b>' + burn['1h'].toFixed(2) + 'x</b>.', parts: [{ type: 'table', label: 'burn rate by window', columns: ['window', 'error ratio', 'burn rate'], rows: rows, hl: hl }] });
        var fired = null;
        rules.forEach(function (r) {
          var bl = burn[r[2]], bs = burn[r[3]], eps = 1e-9, okL = bl >= r[1] * (1 - eps), okS = bs >= r[1] * (1 - eps), both = okL && okS;
          if (both && !fired) fired = r[0];
          f.push({ narr: '<b>' + r[0] + '</b> needs burn &ge; ' + r[1] + ' on <b>' + r[2] + '</b> (now ' + bl.toFixed(2) + 'x: ' + (okL ? '<span class="c-g">yes</span>' : '<span class="c-r">no</span>') + ') AND on <b>' + r[3] + '</b> (now ' + bs.toFixed(2) + 'x: ' + (okS ? '<span class="c-g">yes</span>' : '<span class="c-r">no</span>') + '). ' + (both ? '<b class="c-r">Both true: this alert fires.</b>' : (okL && !okS ? 'The long window is over, but the short window says the problem is already over: no alert.' : 'Not firing.')), parts: [{ type: 'vars', label: r[0], vals: { long_window: r[2], long_burn: Number(bl.toFixed(2)), short_window: r[3], short_burn: Number(bs.toFixed(2)), threshold: r[1] }, hl: both ? { long_burn: 'bad', short_burn: 'bad' } : {} }] });
        });
        var consumed = Math.min(1, burn['1h']) ;
        f.push({ narr: fired ? 'Verdict: <b class="c-r">' + fired + '</b> fires (first matching rule, highest severity). At the 1 hour burn rate of ' + burn['1h'].toFixed(2) + 'x the 30 day budget would last ' + (burn['1h'] > 0 ? (720 / burn['1h']).toFixed(1) + ' hours' : 'forever') + ', and ' + (burn['1h'] / 720 * 100).toFixed(1) + '% of it is spent per hour at this rate.' : 'Verdict: <b class="c-g">no alert</b>. The budget is being spent at an acceptable pace.', parts: [{ type: 'text', label: 'result', html: '<p>' + (fired ? H.esc(fired) : 'none') + '</p>' }] });
        return f;
      }
    }],
    examples: [
      { title: 'Situation: 30% of the monthly budget burned in an hour', html: `<p>A bad config push at 02:10 makes 21.6 percent of checkout requests fail. The SLO is 99.9 percent, so the budget ratio is 0.001 and the burn rate is 21.6 / 0.1 = <b>216</b>. In one hour that spends 216 / 720 = <b>30 percent</b> of the 30-day budget. The old alert ("error ratio over 5 percent for 15 minutes") fired at 02:27 and was acknowledged at 02:40. The burn-rate alert pair (1h and 5m both over 14.4x) fires within about <b>4 minutes</b>: the 1h window crosses 14.4x when 14.4 / 216 of an hour has passed. Rollback at 02:20 saves most of the budget. The lesson: pick alert thresholds from the budget, so you know in advance what each page costs.</p>` },
      { title: 'Numbers: budget remaining after a bad week', html: `<p>SLO 99.9 percent, 30 days, 12 million requests so far: the budget is 12,000,000 x 0.001 = <b>12,000</b> bad requests. An incident produced 9,000 errors. Remaining = (12,000 - 9,000) / 12,000 = <b>25 percent</b> of the budget, with three weeks to go. Many teams' error-budget policy now says: below 25 percent, freeze risky releases and spend the week on reliability work.</p>` },
      { title: 'Why the short window matters', html: `<p>An outage lasts from 10:00 to 10:20 and burns hard. By 11:00 the 1-hour window still shows a high burn (it remembers the outage), but the problem ended 40 minutes ago. An alert on the long window alone keeps paging for another hour. Requiring the 5-minute window too means the alert resolves about 5 minutes after the fix. The fast-burn pair is a classic way to avoid a page about a fire that is already out.</p>` },
      { title: 'SLA, SLO and the buffer', html: `<p>A vendor promises customers 99.5 percent monthly (SLA, with credits). Internally the team targets 99.9 percent (SLO). The gap (0.4 percent, about 2.9 hours a month) is the warning space: the SLO budget turns red long before any contract money is owed. If SLO and SLA are equal, the first time you see the problem is also the first time you owe a refund.</p>` }
    ],
    deepDive: `<p>🟣 <b>Choosing the SLI.</b> Measure close to the user: at the load balancer or in the client (real user monitoring), not only inside the app. Count what users value: "request succeeded and was faster than 300 ms" is better than "CPU is below 80 percent". Define <b>valid events</b> carefully: exclude health checks and, if you decide so, client errors (4xx) that are the caller's fault. Write the SLI definition down: it is a contract between engineers and product.</p>
      <p>🟣 <b>Windows.</b> A <b>rolling</b> 28 or 30-day window is easy to reason about; a calendar month resets the budget, which can encourage risky releases on the 1st. Prometheus handles a 30-day <code>increase()</code> expensively; recording rules at several windows (as above) and a long-retention store (Thanos, Mimir, VictoriaMetrics) are the usual answer. Note that default retention is 15 days, so a 30-day SLO needs longer retention or remote write.</p>
      <p>🟣 <b>Low traffic.</b> At 3 requests per hour a single error is a 33 percent error ratio and a burn rate of hundreds. Ratio-based burn alerts misbehave for low-traffic services. Remedies: add synthetic traffic (a probe every 30 seconds), use longer windows, combine services, or alert on a minimum request count.</p>
      <p>🟣 <b>Error budget policy.</b> The numbers need a pre-agreed reaction: above 50 percent left, ship normally; below 25 percent, review risky changes; at zero, freeze features until the budget recovers or the owner explains an exception. Without a policy the SLO is a dashboard decoration. Review SLOs every quarter: an SLO that is never at risk is probably too loose, one that is always breached is a wish.</p>
      <p>🟣 <b>Dependencies compose.</b> A request path with a chain of services multiplies availability: three tiers of 99.9 percent give about 99.7 percent. Redundancy helps: two independent replicas of a 99 percent tier give 1 - 0.01 x 0.01 = 99.99 percent, if failures are truly independent (a shared database or deploy breaks that assumption).</p>`,
    aiEra: `<p>🤖 AI can draft SLO candidates from traffic and incident history ("your checkout 5xx ratio has never exceeded 0.4 percent in 90 days, a 99.9 percent SLO fits") and propose burn-rate rules. It can also speed up the review of an SLO: "which incidents last quarter would this alert have caught, and when?" Replaying the alert against historical data is a good use.</p>
      <p>🤖 SLOs for AI features are new: answer quality is not a status code. Teams define SLIs with evaluation sets (share of answers rated good by an evaluator), latency to first token, and cost per request. The same budget thinking applies, but the SLI itself needs careful, human-reviewed definitions, because an LLM judging an LLM can drift silently.</p>`,
    problems: [P({
      t: 'How much of the error budget is left?', l: 'Easy', tags: ['slo', 'error budget', 'python'], co: ['Google', 'Atlassian', 'Zerodha'], c: PYC,
      s: `<p>Write <code>error_budget_remaining(slo_percent, total, bad)</code>. The SLO is a percentage (for example <code>99.9</code>). <code>total</code> is the number of valid requests so far in the window and <code>bad</code> the number of failed ones. The budget is <code>(1 - slo/100) x total</code> bad requests. Return the percentage of the budget still unspent: 100 means untouched, 0 means exactly used up, a negative number means overspent. If the budget is 0 (an SLO of 100 or no requests) return <code>0.0</code>.</p>`,
      ex: `<p>SLO 99.9, 1,000,000 requests, 400 bad → budget 1,000 → ${H.c('g', '60.0')} percent left. With 1,500 bad requests → ${H.c('r', '-50.0')}: the budget is overspent by half.</p>`,
      bw: `<p>Looking at the overall availability ("99.96 percent, looks great") without relating it to the target. 99.96 is good for a 99.9 SLO (60 percent of the budget left) and a failure for a 99.99 SLO (the budget is 4 times overspent).</p>`,
      bc: PY(`def error_budget_remaining(slo_percent, total, bad):\n    return 100.0 * (1 - bad / total)    # availability, not budget: tells you nothing about the SLO`, 'naive: availability'),
      q: ['SLO is 99.9% over 30 days. How long can the service be completely down per window?', ['About 43 minutes', 'About 7 hours', 'About 4 minutes', 'About 26 seconds'], 0, '30 days is 43,200 minutes. 0.1 percent of that is 43.2 minutes.'],
      h: ['<p>Hint 1: the allowed number of bad requests is <code>(100 - slo) / 100 x total</code>.</p>', '<p>Hint 2: remaining percent = <code>(budget - bad) / budget x 100</code>.</p>', '<p>Hint 3: if budget is 0 return 0.0 before dividing.</p>'],
      a: `<p>Compute the budget in requests, then express what is left as a share of it. Overspending gives a negative result, which is useful: it says by how much the SLO is missed.</p>`,
      code: PY(`def error_budget_remaining(slo_percent, total, bad):
    budget = (100.0 - slo_percent) / 100.0 * total      # bad requests we are allowed
    if budget == 0:
        return 0.0                                       # SLO 100 or no traffic: nothing to spend
    return (budget - bad) / budget * 100.0               # percent of the budget left (may be negative)`, 'error_budget_remaining (tested)'),
      cx: `<p>O(1) time and space.</p>`,
      f: ['What would you freeze when the result drops under 25?', 'How does this number change when the window is a calendar month?'],
      tests: { sig: 'double int int -> double', fn: 'errorBudgetRemaining', cmp: 'float', cases: [
        [[99.9, 1000000, 400], 60.0],
        [[99.9, 1000000, 1000], 0.0],
        [[99.9, 1000000, 1500], -50.0],
        [[99.5, 200000, 0], 100.0],
        [[99, 10000, 25], 75.0],
        [[99.99, 5000000, 125], 75.0],
        [[100, 100, 0], 0.0],
        [[99.9, 0, 0], 0.0]
      ] }
    })]
  });

  // ───────────────────────── Topic 10: the lab stack, ELK/EFK, and commercial tools ─────────────────────────
  var COMPOSE = R`# docker-compose.yml  - the whole lab. Run: docker compose up -d --build
# Image tags are examples: pin the current stable version you have tested. Nothing here is a secret.
name: obs-lab

services:
  app:                                   # the instrumented Python service (app.py + otel_app.py from topics 2 and 8)
    build: ./app
    environment:
      OTEL_SERVICE_NAME: checkout
      OTEL_EXPORTER_OTLP_ENDPOINT: http://otel-collector:4317
      OTEL_EXPORTER_OTLP_INSECURE: "true"             # lab only
      OTEL_TRACES_SAMPLER: parentbased_traceidratio
      OTEL_TRACES_SAMPLER_ARG: "1.0"
      APP_VERSION: @{APP_VERSION:-dev}                 # from .env (gitignored) or the default
      FAIL_RATE: @{FAIL_RATE:-0.03}                    # raise to 0.3 to trigger the burn-rate alerts
    ports: ["127.0.0.1:8080:8080"]                    # published to localhost only
    depends_on: [otel-collector]

  node-exporter:                         # host metrics for the USE method
    image: prom/node-exporter:v1.8.2
    command: ["--path.rootfs=/host"]
    volumes: ["/:/host:ro,rslave"]

  prometheus:
    image: prom/prometheus:v3.1.0
    command:
      - --config.file=/etc/prometheus/prometheus.yml
      - --storage.tsdb.retention.time=15d
      - --enable-feature=exemplar-storage
    volumes:
      - ./prometheus:/etc/prometheus:ro
      - prom-data:/prometheus
    ports: ["127.0.0.1:9090:9090"]

  alertmanager:
    image: prom/alertmanager:v0.28.0
    command: ["--config.file=/etc/alertmanager/alertmanager.yml"]
    volumes:
      - ./alertmanager/alertmanager.yml:/etc/alertmanager/alertmanager.yml:ro
      - ./secrets/alertmanager:/etc/alertmanager/secrets:ro      # webhook URL files, gitignored
    ports: ["127.0.0.1:9093:9093"]

  webhook-sink:                          # stands in for the pager: prints every alert it receives
    image: python:3.12-slim
    command: ["python", "/sink.py"]
    volumes: ["./sink.py:/sink.py:ro"]

  grafana:
    image: grafana/grafana:11.4.0
    environment:
      GF_SECURITY_ADMIN_USER: admin
      GF_SECURITY_ADMIN_PASSWORD__FILE: /run/secrets/grafana_admin_password   # the __FILE suffix reads the value from a file
      GF_USERS_ALLOW_SIGN_UP: "false"
    secrets: [grafana_admin_password]
    volumes:
      - ./grafana/provisioning:/etc/grafana/provisioning:ro
      - ./grafana/dashboards:/var/lib/grafana/dashboards:ro
      - grafana-data:/var/lib/grafana
    ports: ["127.0.0.1:3000:3000"]

  loki:
    image: grafana/loki:3.3.2
    command: ["-config.file=/etc/loki/local-config.yaml"]
    volumes: ["loki-data:/loki"]

  alloy:                                 # ships container logs to Loki (topic 6)
    image: grafana/alloy:v1.5.1
    command: ["run", "/etc/alloy/config.alloy"]
    volumes:
      - ./alloy/config.alloy:/etc/alloy/config.alloy:ro
      - /var/run/docker.sock:/var/run/docker.sock:ro            # powerful: lab only

  otel-collector:
    image: otel/opentelemetry-collector-contrib:0.116.1
    command: ["--config=/etc/otelcol/collector.yaml"]
    volumes: ["./otel/collector.yaml:/etc/otelcol/collector.yaml:ro"]

  jaeger:
    image: jaegertracing/jaeger:2.2.0
    ports: ["127.0.0.1:16686:16686"]                           # the trace UI

secrets:
  grafana_admin_password:
    file: ./secrets/grafana_admin_password.txt                 # gitignored; created by the setup script

volumes:
  prom-data: {}
  grafana-data: {}
  loki-data: {}`;

  var LAB_SETUP = R`# 1. Keep secrets out of git BEFORE the first commit
cat >> .gitignore <<'IGNORE'
.env
secrets/
IGNORE

# 2. Create placeholder secrets. Replace them with your own values; never commit them.
mkdir -p secrets/alertmanager
printf '%s' 'CHANGE-ME-grafana-admin-password' > secrets/grafana_admin_password.txt
printf '%s' 'http://webhook-sink:5001/pager'   > secrets/alertmanager/pager_webhook_url
printf '%s' 'http://webhook-sink:5001/payments' > secrets/alertmanager/payments_webhook_url
printf '%s' 'http://webhook-sink:5001/ticket'  > secrets/alertmanager/ticket_webhook_url
printf '%s' 'http://webhook-sink:5001/heartbeat' > secrets/alertmanager/heartbeat_webhook_url
chmod 600 secrets/grafana_admin_password.txt secrets/alertmanager/*

# 3. A committed template tells teammates which variables exist, with no real values
cat > .env.example <<'ENVEX'
APP_VERSION=dev
FAIL_RATE=0.03
ENVEX
cp .env.example .env

# 4. Start, check, and generate traffic
docker compose config --quiet && echo "compose file is valid"
docker compose up -d --build
for i in $(seq 1 300); do curl -s -o /dev/null http://127.0.0.1:8080/pay; done

# 5. Break it on purpose: 30 percent errors should fire the fast-burn alert within minutes
FAIL_RATE=0.3 docker compose up -d app
docker compose logs -f webhook-sink`;

  var SINK_PY = R`# sink.py - a tiny webhook receiver that stands in for a paging service in the lab
from http.server import BaseHTTPRequestHandler, HTTPServer
import json


class Sink(BaseHTTPRequestHandler):
    def do_POST(self):
        body = self.rfile.read(int(self.headers.get("Content-Length", 0)))
        payload = json.loads(body or b"{}")
        for alert in payload.get("alerts", []):
            labels = alert.get("labels", {})
            print(self.path, alert.get("status"), labels.get("alertname"), labels.get("severity"), flush=True)
        self.send_response(200)
        self.end_headers()

    def log_message(self, fmt, *args):
        pass


if __name__ == "__main__":
    HTTPServer(("0.0.0.0", 5001), Sink).serve_forever()`;

  topics.push({
    title: 'The Lab Stack, ELK/EFK and Commercial Tools (Datadog, New Relic)',
    analogy: `<p>Building your own stack is like <b>cooking at home</b>: cheap ingredients, total control, and you do the washing up. A commercial platform like Datadog or New Relic is a <b>restaurant</b>: it arrives ready, the menu is rich and the service is quick, but the bill grows with every course and you can only eat what is on the menu. Neither is "better". A good engineer has cooked at home (so they know what is in the dish) and can read a restaurant bill (so they notice that the "free" side dishes, custom metrics and log ingest, cost more than the main).</p>`,
    explain: `<p>🟢 <b>The lab stack</b> runs on one laptop with Docker Compose and costs nothing. It has every piece from this module:</p>
      ${H.table(['Container', 'Role', 'Signal'], [
        ['<b>app</b>', 'Python service with prometheus_client and OpenTelemetry', 'Produces all three'],
        ['<b>node-exporter</b>', 'Host CPU, memory, disk, network', 'Metrics (USE)'],
        ['<b>prometheus</b>', 'Scrapes, stores, evaluates rules', 'Metrics, alerts'],
        ['<b>alertmanager</b> + <b>webhook-sink</b>', 'Routing, grouping, inhibition; the sink plays the pager', 'Alerts'],
        ['<b>grafana</b>', 'Dashboards, links between signals', 'Looking'],
        ['<b>alloy</b> + <b>loki</b>', 'Collect and store container logs', 'Logs'],
        ['<b>otel-collector</b> + <b>jaeger</b>', 'Receive, scrub, sample, store traces; spanmetrics', 'Traces']
      ])}
      <p>🔵 <b>Secrets in a lab still need discipline.</b> The Grafana admin password comes from a file mounted as a Docker secret (<code>GF_SECURITY_ADMIN_PASSWORD__FILE</code>); Alertmanager reads webhook URLs from files (<code>url_file</code>); Compose variables come from a <code>.env</code> file. All of those are listed in <code>.gitignore</code> <i>before</i> the first commit, and a committed <code>.env.example</code> shows the names with no real values. Published ports are bound to <code>127.0.0.1</code> so the lab is not reachable from the network. Habits formed in a lab are the ones that reach production.</p>
      <p>🔵 <b>EFK / ELK</b> is the other common log stack. <b>E</b>lasticsearch stores and indexes, <b>K</b>ibana looks, and the shipper is <b>F</b>luent Bit / Fluentd (EFK) or Logstash (ELK; Beats ship simple files). Choose it when you need fast full-text search over everything and can pay for the index. Choose Loki when you search mostly by a few known labels and want cheap storage (topic 6).</p>
      <p>🔵 <b>Datadog and New Relic</b> are commercial, all-in-one SaaS platforms: install an agent and you get metrics, logs, traces, dashboards, alerts, synthetic checks and often AI features, with polished UIs and hundreds of integrations.</p>
      ${H.table(['', 'Open-source stack (this lab)', 'Datadog', 'New Relic'], [
        ['Who runs it', 'You (upgrades, scaling, storage)', 'Vendor', 'Vendor'],
        ['Setup time', 'Days to weeks to get right', 'Hours', 'Hours'],
        ['Cost shape', 'Servers and people. Cheap at small scale, grows with data and ops effort', 'Per host plus usage: custom metrics, log ingest and retention, APM hosts, many separate line items', 'Data ingest (GB) plus per-user licences; a free tier exists, check the current limits'],
        ['Surprise bills', 'Disk and RAM growth, on-call load', 'Custom-metric cardinality and log volume', 'Ingest volume and full-platform users'],
        ['Lock-in', 'Low (open formats: PromQL, OTLP)', 'Medium (agent, query language, dashboards); OTLP ingest supported', 'Medium; OTLP ingest supported'],
        ['Best when', 'Learning, strong platform team, cost control, data residency', 'You want speed and breadth, and can govern spend', 'You want unified pricing and a broad free tier to start']
      ])}
      <p>Neither side is free of the cardinality lesson: on Datadog a <code>user_id</code> tag turns into a big custom-metrics bill instead of an out-of-memory crash. <b>OpenTelemetry</b> lowers lock-in on both sides. Compare current prices on the vendors' own pages; they change often.</p>`,
    clues: [
      '"Build or buy observability?" → team size and skills, scale and cost shape, data residency, lock-in; OTel keeps options open',
      '"Our monitoring bill tripled" → custom metrics cardinality, log ingest, retention, duplicate agents',
      '"We run Prometheus and Grafana; what do we lose without a vendor?" → on-call burden for the stack, long-term storage, polished APM and RUM',
      '"ELK or Loki?" → full-text index versus label index; search pattern and budget decide',
      '"How do you keep secrets out of a docker-compose lab?" → .env and secret files in .gitignore, Docker secrets, *_FILE variables, placeholders in the repo',
      '"One laptop, full stack" → Compose with Prometheus, Alertmanager, Grafana, Loki, OTel Collector and Jaeger'
    ],
    code: [Y(COMPOSE, 'docker-compose.yml: the whole lab'), SH(LAB_SETUP, 'Setup script: gitignored secrets, placeholders, start, break it on purpose'), PY(SINK_PY, 'sink.py: a webhook receiver that plays the pager')],
    codeTitle: ['docker-compose.yml: the whole lab', 'Setup script: gitignored secrets, placeholders, start, break it on purpose', 'sink.py: a webhook receiver that plays the pager'],
    viz: [{
      title: 'Follow one signal through the lab stack',
      input: 'signal=traces',
      inputLabel: 'signal: metrics, logs, traces or alerts',
      gen: function (input) {
        var o = kv(input, 'Format: signal=traces (or metrics, logs, alerts)');
        var s = String(o.signal === undefined ? 'traces' : o.signal).toLowerCase();
        if (['metrics', 'logs', 'traces', 'alerts'].indexOf(s) < 0) throw new Error('signal must be metrics, logs, traces or alerts');
        var nodes = [box('app', 'app (Python)', 6, 8, 16), box('node', 'node-exporter', 6, 44, 18), box('otel', 'OTel Collector', 32, 8, 20), box('prom', 'Prometheus', 32, 44, 18), box('jaeger', 'Jaeger', 62, 8, 16), box('alloy', 'Alloy', 32, 26, 14), box('loki', 'Loki', 62, 26, 14), box('am', 'Alertmanager', 62, 44, 18), box('graf', 'Grafana', 88, 26, 16), box('sink', 'webhook-sink', 88, 44, 18)];
        var edges = [['app', 'otel', 'OTLP'], ['otel', 'jaeger', 'traces'], ['prom', 'app', 'scrape'], ['prom', 'node', 'scrape'], ['app', 'alloy', 'stdout logs'], ['alloy', 'loki', 'push'], ['prom', 'am', 'alerts'], ['am', 'sink', 'webhook'], ['graf', 'prom', 'PromQL'], ['graf', 'loki', 'LogQL'], ['graf', 'jaeger', 'traces'], ['otel', 'prom', 'spanmetrics']];
        function fr(n, hl, ehl) { return { narr: n, parts: [{ type: 'graph', label: 'lab stack', directed: true, height: 56, nodes: nodes, edges: edges, hl: hl, ehl: ehl }] }; }
        var f = [];
        if (s === 'traces') {
          f.push(fr('A request reaches the <b>app</b>. The SDK creates spans and batches them.', { app: 'cur' }, {}));
          f.push(fr('The SDK exports the spans over OTLP to the <b>Collector</b>, which deletes the authorization attribute, hashes the email and applies tail sampling.', { otel: 'cur' }, { 'app-otel': 'ok' }));
          f.push(fr('Kept traces go to <b>Jaeger</b>. The Collector also turns every span into RED metrics for Prometheus (before sampling).', { jaeger: 'ok' }, { 'otel-jaeger': 'ok', 'otel-prom': 'ok' }));
          f.push(fr('<b>Grafana</b> reads Jaeger. A latency exemplar or a log line with a trace id links straight to the trace.', { graf: 'sel' }, { 'graf-jaeger': 'ok' }));
        } else if (s === 'metrics') {
          f.push(fr('The <b>app</b> exposes <code>/metrics</code> on port 8000; <b>node-exporter</b> exposes host metrics on 9100.', { app: 'cur', node: 'cur' }, {}));
          f.push(fr('<b>Prometheus</b> scrapes (pulls) both every 15 seconds and stores the samples.', { prom: 'ok' }, { 'prom-app': 'ok', 'prom-node': 'ok' }));
          f.push(fr('Recording rules and alert rules are evaluated on the stored data.', { prom: 'cur' }, {}));
          f.push(fr('<b>Grafana</b> queries Prometheus with PromQL and draws the RED and USE panels.', { graf: 'sel' }, { 'graf-prom': 'ok' }));
        } else if (s === 'logs') {
          f.push(fr('The <b>app</b> writes one JSON log line per event to stdout, with the request id and trace id.', { app: 'cur' }, {}));
          f.push(fr('<b>Alloy</b> reads the container logs, redacts secrets and sets a few low-cardinality labels.', { alloy: 'cur' }, { 'app-alloy': 'ok' }));
          f.push(fr('Alloy pushes the lines to <b>Loki</b>, which stores them compressed in a volume.', { loki: 'ok' }, { 'alloy-loki': 'ok' }));
          f.push(fr('<b>Grafana</b> queries Loki with LogQL. A derived field turns <code>trace_id</code> into a link to Jaeger.', { graf: 'sel' }, { 'graf-loki': 'ok' }));
        } else {
          f.push(fr('<b>Prometheus</b> evaluates the alert rules every 15 seconds. The burn-rate alert goes pending, then firing after its <code>for:</code> time.', { prom: 'cur' }, {}));
          f.push(fr('Firing alerts are sent to <b>Alertmanager</b>, which groups them by alertname and service, applies inhibition and silences.', { am: 'cur' }, { 'prom-am': 'ok' }));
          f.push(fr('Alertmanager POSTs to the webhook. The URL was read from a gitignored secret file. <b>webhook-sink</b> prints the alert, standing in for the pager.', { sink: 'sel' }, { 'am-sink': 'ok' }));
        }
        return pad4(f, 'Done.');
      }
    }],
    examples: [
      { title: 'Exercise: break the lab and watch the signals', html: `<p>Set <code>FAIL_RATE=0.3</code> and restart the app. In about two minutes: the error-ratio panel in Grafana climbs; Prometheus shows <code>CheckoutBudgetBurnFast</code> pending, then firing (the SLO is 99.9 percent, 30 percent errors is a burn rate of 300); Alertmanager groups it; <code>docker compose logs webhook-sink</code> prints the page. Then open the latency graph, click an exemplar, read the trace in Jaeger, and follow the trace id into the Loki logs. Set <code>FAIL_RATE=0.03</code>, watch the alert resolve, and check that the resolve message arrives (<code>send_resolved: true</code>).</p>` },
      { title: 'Situation: the Datadog bill that tripled', html: `<p>A team adds <code>user_id</code> and <code>session_id</code> tags to a request metric to "see per-user latency". On Datadog each distinct tag combination is a billable custom metric. The month-end invoice triples, the finance team asks questions, and the tags are removed. In the open-source lab the same mistake crashed Prometheus (topic 2); in the vendor it is an invoice. The fix is the same in both: bounded labels for metrics, ids in traces and logs.</p>` },
      { title: 'Build or buy: a decision in five questions', html: `<p>1) Who is on call for the monitoring itself? 2) How many hosts, metrics and GB of logs per day, and how fast do they grow? 3) Do rules require data to stay in a region or in your cloud account? 4) How much of the team's time is a fair price for avoiding a licence? 5) Can you switch later? Answer 5 first: instrument with OpenTelemetry, send to a Collector, and the choice becomes reversible. Many companies run a hybrid: open-source for metrics and traces at scale, a vendor for one product such as RUM or synthetic checks.</p>` },
      { title: 'EFK in one picture', html: `<p>Containers write JSON to files; <b>Fluent Bit</b> tails them, parses the JSON, removes fields you never want and sends the batch to <b>Elasticsearch</b>; <b>Kibana</b> queries it. Production needs more: index templates so field types are stable, index lifecycle management (hot, warm, delete), a disk and heap plan, security enabled, and an alert on cluster health. Elasticsearch 8 turns security on by default, so the lab needs a user and password, and these come from environment variables, as in the Fluent Bit config in topic 6.</p>` }
    ],
    deepDive: `<p>🟣 <b>Scaling Prometheus.</b> One server holds roughly one to several million active series comfortably. Beyond that: shard by service (one Prometheus per team or cluster), use <b>remote write</b> to a long-term store (Mimir, Thanos, VictoriaMetrics, Grafana Cloud), and consider the Prometheus Agent mode for lightweight collection. Federation exists but is usually replaced by remote write. High availability is two identical servers plus a deduplicating query layer.</p>
      <p>🟣 <b>Storage and cost levers (all stacks).</b> Reduce metric cardinality; shorten retention for debug data; downsample old metrics; sample traces; filter or sample logs; compress and tier cold data to object storage; set per-team quotas and cost dashboards. These levers apply identically to open-source and vendor setups, only the invoice differs.</p>
      <p>🟣 <b>Compose is a lab, not production.</b> Production runs these on Kubernetes (Helm charts such as kube-prometheus-stack, the OpenTelemetry Operator), with persistent volumes, resource limits, network policies, SSO for Grafana and secrets from a secret manager (Vault or a cloud one) instead of files on a laptop. The concepts in this module carry over unchanged; the deployment mechanics are in modules 13 and 14.</p>
      <p>🟣 <b>Operating the monitoring.</b> Monitor the monitor: Prometheus's own metrics (scrape duration, rule evaluation failures, head series count, WAL size), the Collector's refused-span counters, Loki's ingestion rate-limit errors. Keep the Watchdog alert going to an external service. Back up Grafana's dashboards by keeping them in git. Practise restoring.</p>
      <p>🟣 <b>Security of the stack itself.</b> The Docker socket mount for Alloy gives root-equivalent access to the host: acceptable in a lab, avoid it in production (use the Kubernetes API or a file-based collection). Dashboards can leak data; restrict by team. Never expose Prometheus, Alertmanager or Loki to the internet: they have no authentication by default.</p>`,
    aiEra: `<p>🤖 Vendors now bundle AI assistants: natural-language queries, automated root-cause suggestions, anomaly detection and incident summaries. They are strongest where the vendor has all your data in one place. The risks are cost (the AI features are often priced separately), data leaving your boundary, and over-trust. Ask the same questions of any assistant: what data does it see, where does that data go, can I reproduce its answer with a query I can read?</p>
      <p>🤖 In an open-source stack you can build a small version yourself: an assistant with read-only access to Prometheus, Loki and Jaeger through a controlled tool interface (for example MCP servers) that answers "what changed before this alert?". Keep it read-only, log every query it runs, and restrict it to redacted data. An assistant with write access to silences or deploys is an incident waiting to happen.</p>`,
    problems: [P({
      t: 'Assemble the lab with secrets that never reach git', l: 'Medium', tags: ['docker compose', 'secrets', 'gitignore', 'lab'], co: ['Grafana Labs', 'Thoughtworks', 'Atlassian'],
      s: `<p>Write the Docker Compose file and the setup commands for the observability lab. The Grafana admin password, Alertmanager webhook URLs and any environment-specific values must come from gitignored files; the repository may contain only placeholders and an <code>.env.example</code>. Published ports must be reachable from the laptop only. The stack: the app, node-exporter, Prometheus, Alertmanager, a webhook sink, Grafana, Loki with Alloy, an OTel Collector and Jaeger. Say what you check before the first <code>git commit</code>.</p>`,
      ex: `<p>Allowed in git: ${H.c('g', 'docker-compose.yml, .env.example (APP_VERSION=dev), alertmanager.yml (with url_file paths)')}. Never in git: ${H.c('r', 'secrets/grafana_admin_password.txt, secrets/alertmanager/*, .env')}.</p>`,
      bw: `<p>Writing <code>GF_SECURITY_ADMIN_PASSWORD: admin123</code> and <code>api_url: https://hooks.slack.com/services/T000/B000/XXXX</code> straight into the committed files, publishing every port to <code>0.0.0.0</code>, and using <code>:latest</code> tags. The password and webhook are now in git history for good, and anyone on the network can open Prometheus.</p>`,
      bc: Y(`services:\n  grafana:\n    image: grafana/grafana:latest\n    environment:\n      GF_SECURITY_ADMIN_PASSWORD: admin123\n    ports: ["3000:3000"]`, 'naive: password in the file, open port, latest tag'),
      q: ['Alertmanager\'s Slack or webhook URL is a credential. How should the committed config refer to it?', ['<code>url_file</code> / <code>api_url_file</code> pointing to a gitignored, read-only mounted file', 'Write the URL in the file and rely on a private repo', 'Base64-encode the URL in the config', 'Put the URL in a Docker image label'], 0, 'A private repository is still copied to many laptops and CI logs, and base64 is not encryption. A file reference keeps the value out of git entirely.'],
      h: ['<p>Hint 1: add <code>.env</code> and <code>secrets/</code> to <code>.gitignore</code> as the very first step.</p>', '<p>Hint 2: use <code>GF_SECURITY_ADMIN_PASSWORD__FILE</code> with a Compose secret, and <code>url_file</code> in Alertmanager.</p>', '<p>Hint 3: bind ports as <code>127.0.0.1:HOST:CONTAINER</code>, pin image versions, and run <code>docker compose config --quiet</code> and <code>git status</code> before committing.</p>'],
      a: `<p>Create the ignore rules first, then placeholder secret files with restrictive permissions. The Compose file refers to secrets only by path: a Compose <code>secrets:</code> entry for Grafana (read through the <code>__FILE</code> variable) and a read-only mounted folder for Alertmanager webhook files. Non-secret parameters come from <code>.env</code> with a committed <code>.env.example</code>. Every published port is bound to <code>127.0.0.1</code>, images are pinned, and the Docker socket is mounted read-only only for Alloy, with a comment that it is lab-only. Before the first commit run <code>git status</code> and <code>git check-ignore -v secrets/grafana_admin_password.txt .env</code> to prove they are ignored, and a secret scanner such as gitleaks to be sure.</p>`,
      code: Y(COMPOSE, 'docker-compose.yml'),
      alt: [SH(LAB_SETUP, 'setup script')],
      cx: `<p>The whole stack needs about 2 to 3 GB of RAM on a laptop.</p>`,
      f: ['How would you share the lab with a teammate without sending secrets in chat?', 'What would change to run it on Kubernetes?']
    })]
  });

  // ───────────────────────── Practice problems (Easy, then Medium, then Hard) ─────────────────────────
  practice.push(P({
    t: 'How much downtime does an SLO allow?', l: 'Easy', tags: ['slo', 'nines', 'python'], co: ['Google', 'Zerodha', 'Freshworks'], c: PYC,
    s: `<p>Write <code>allowed_downtime_minutes(slo_percent, days)</code>: the minutes of complete outage a service may have in a window of <code>days</code> days without breaking an SLO of <code>slo_percent</code> percent. An SLO of 100 allows 0.</p>`,
    ex: `<p>99.9 percent over 30 days → ${H.c('g', '43.2')} minutes. 99.99 percent → ${H.c('g', '4.32')}. 99 percent → ${H.c('g', '432')} (7.2 hours).</p>`,
    bw: `<p>Memorising "three nines is about 8 hours". That figure is per <i>year</i> (8.76 hours); the monthly window gives 43 minutes. Always say the window.</p>`,
    bc: PY(`def allowed_downtime_minutes(slo_percent, days):\n    return slo_percent * days * 1440 / 100      # wrong: this is the UP time`, 'naive: up time'),
    q: ['Which is bigger: the budget of 99.9% over 30 days or of 99.99% over 365 days?', ['99.99% over 365 days (52.6 minutes) is bigger than 43.2 minutes', 'They are equal', '99.9% over 30 days', 'Cannot compare'], 0, '0.0001 x 525,600 = 52.56 minutes versus 0.001 x 43,200 = 43.2 minutes. The window length matters as much as the nines.'],
    h: ['<p>Hint 1: a day has 24 x 60 = 1440 minutes.</p>', '<p>Hint 2: the bad share is <code>(100 - slo) / 100</code>.</p>', '<p>Hint 3: multiply the bad share by the minutes in the window.</p>'],
    a: `<p>Total minutes in the window times the allowed failure share. It is the simplest form of an error budget measured in time.</p>`,
    code: PY(`def allowed_downtime_minutes(slo_percent, days):
    bad_share = (100.0 - slo_percent) / 100.0     # fraction of time allowed to be bad
    return bad_share * days * 24 * 60              # minutes in the window times that fraction`, 'allowed_downtime_minutes (tested)'),
    cx: `<p>O(1) time and O(1) space: one subtraction and two multiplications.</p>`,
    f: ['Why does a time-based budget differ from a request-based one for a service with night-time traffic dips?'],
    tests: { sig: 'double int -> double', fn: 'allowedDowntimeMinutes', cmp: 'float', cases: [
      [[99.9, 30], 43.2], [[99.99, 30], 4.32], [[99, 30], 432.0], [[99.95, 30], 21.6], [[99.999, 30], 0.432], [[99.9, 7], 10.08], [[100, 30], 0.0], [[99.5, 365], 2628.0]
    ] }
  }));

  practice.push(P({
    t: 'Estimate the number of time series', l: 'Easy', tags: ['cardinality', 'prometheus', 'python'], co: ['Grafana Labs', 'Datadog', 'Swiggy'], c: PYC,
    s: `<p>Write <code>series_estimate(label_counts, buckets)</code>. <code>label_counts</code> lists how many distinct values each label of a metric can take. The number of series is the product of those counts (an empty list means 1 series). If <code>buckets</code> is above 0 the metric is a histogram with that many finite buckets, and every label combination creates <code>buckets + 3</code> series (one per finite bucket, the <code>+Inf</code> bucket, <code>_sum</code> and <code>_count</code>). Return the total.</p>`,
    ex: `<p>Labels method (4) and route (30) on a histogram with 8 buckets: 4 x 30 x 11 = ${H.c('g', '1,320')}. Add <code>user_id</code> with 200,000 values: ${H.c('r', '264,000,000')}.</p>`,
    bw: `<p>Adding label counts instead of multiplying them: 4 + 30 + 200,000 looks harmless (about 200 thousand) when the real number is about 24 million for a plain counter.</p>`,
    bc: PY(`def series_estimate(label_counts, buckets):\n    return sum(label_counts) + buckets       # wrong: sums instead of multiplying`, 'naive: addition'),
    q: ['Adding a label with 5 values to a metric that has 1,000 series makes it about...', ['5,000 series', '1,005 series', '1,000 series', '200 series'], 0, 'Series multiply by the number of values of each label.'],
    h: ['<p>Hint 1: start with 1 and multiply by every label count.</p>', '<p>Hint 2: keep the running product as an integer, not a float, so it stays exact.</p>', '<p>Hint 3: multiply by <code>buckets + 3</code> only when buckets is above 0.</p>'],
    a: `<p>A running product, then the histogram multiplier. Python integers do not overflow, so a 264 million result is exact. In languages with 32-bit integers you would use 64-bit.</p>`,
    code: PY(`def series_estimate(label_counts, buckets):
    series = 1
    for n in label_counts:
        series *= n                                # every label multiplies the combinations
    if buckets > 0:
        series *= buckets + 3                      # finite buckets + the +Inf bucket + _sum + _count
    return series`, 'series_estimate (tested)'),
    cx: `<p>O(L) time for L labels, O(1) extra space.</p>`,
    f: ['At about 3 KB per series, how much memory is 264 million series?'],
    tests: { sig: 'int[] int -> long', fn: 'seriesEstimate', cases: [
      [[[4, 30], 0], 120], [[[4, 30], 8], 1320], [[[4, 6, 30, 50000], 0], 36000000], [[[], 0], 1], [[[10], 10], 130], [[[2, 2, 2], 0], 8], [[[200000, 4, 30], 8], 264000000]
    ] }
  }));

  practice.push(P({
    t: 'Pick the metric type', l: 'Easy', tags: ['counter', 'gauge', 'histogram', 'summary'], co: ['Grafana Labs', 'Atlassian', 'Zomato'],
    s: `<p>For each measurement choose counter, gauge, histogram or summary, and name the Prometheus metric: (1) orders placed, (2) items in the work queue, (3) request latency across 40 pods, (4) bytes sent, (5) seconds since the last successful backup, (6) temperature of a server room, (7) size of uploaded files.</p>`,
    ex: `<p>(1) ${H.c('g', 'counter')} <code>orders_placed_total</code>. (2) ${H.c('g', 'gauge')} <code>work_queue_length</code>. (3) ${H.c('g', 'histogram')} <code>http_request_duration_seconds</code>, not a summary, because 40 pods must be combined.</p>`,
    bw: `<p>Using a gauge for "orders placed" and incrementing it. A restart sets it to 0 with no way to tell a reset from a real drop, and <code>rate()</code> cannot be used safely.</p>`,
    bc: PY(`orders = 0\n\ndef place_order():\n    global orders\n    orders += 1         # a plain number that loses its meaning on restart`, 'naive: a plain variable as the metric'),
    q: ['Why is a histogram preferred over a summary for latency across many pods?', ['Bucket counters can be added across pods before taking a quantile', 'Histograms are more precise', 'Summaries cannot be scraped', 'Histograms use fewer series'], 0, 'You cannot average or add pre-computed percentiles. Bucket counts add up, so histogram_quantile on the sum is correct for the whole fleet.'],
    h: ['<p>Hint 1: does the value only ever go up (counter) or up and down (gauge)?</p>', '<p>Hint 2: do you need percentiles of a distribution (histogram)?</p>', '<p>Hint 3: name with base units and <code>_total</code> for counters.</p>'],
    a: `<p>(1) counter <code>orders_placed_total</code>; (2) gauge <code>work_queue_length</code>; (3) histogram <code>http_request_duration_seconds</code>; (4) counter <code>network_sent_bytes_total</code>; (5) gauge: store <code>backup_last_success_timestamp_seconds</code> and compute <code>time() - backup_last_success_timestamp_seconds</code> in the query, so the value does not go stale; (6) gauge <code>room_temperature_celsius</code>; (7) histogram <code>upload_size_bytes</code> (distribution of sizes), with a counter if only the total matters. Rule: counters for totals of events, gauges for current state, histograms for distributions.</p>`,
    code: PY(`# Correct instruments for the seven measurements
from prometheus_client import Counter, Gauge, Histogram

ORDERS = Counter("orders_placed_total", "Orders placed")
QUEUE = Gauge("work_queue_length", "Items waiting in the work queue")
LATENCY = Histogram("http_request_duration_seconds", "Request latency in seconds")
SENT = Counter("network_sent_bytes_total", "Bytes sent")
BACKUP_OK = Gauge("backup_last_success_timestamp_seconds", "Unix time of the last good backup")
ROOM = Gauge("room_temperature_celsius", "Server room temperature")
UPLOADS = Histogram("upload_size_bytes", "Uploaded file sizes in bytes", buckets=(1e3, 1e4, 1e5, 1e6, 1e7, 1e8))`, 'the right instruments'),
    cx: `<p>Not applicable; choose by behaviour, not by habit.</p>`,
    f: ['When would you use a summary at all?']
  }));

  practice.push(P({
    t: 'Stop a cardinality explosion from the Prometheus side', l: 'Easy', tags: ['relabeling', 'cardinality', 'prometheus.yml'], co: ['Grafana Labs', 'Razorpay', 'Atlassian'],
    s: `<p>A release exposes <code>http_requests_total{user_id, route, status}</code> and Prometheus memory is climbing. The old version cannot be rolled back right now. Write the scrape-config changes that stop the damage immediately, then list the real fix.</p>`,
    ex: `<p>Before: ${H.c('r', '200,000 users x 30 routes x 5 statuses = 30 million series')}. With <code>sample_limit</code> the oversized scrape fails at once and the target shows as down, so memory stops growing; with <code>labeldrop: user_id</code> the series count falls to ${H.c('g', '150')}, but samples that differ only in <code>user_id</code> now collide and Prometheus keeps one per scrape, so counts are undercounted. Treat both as containment, not a fix.</p>`,
    bw: `<p>Restarting Prometheus with a larger machine. The memory grows with every new user, so a restart buys hours, and the WAL replay of millions of series makes the outage longer.</p>`,
    bc: Y(`# naive: do nothing, scale the server\nresources:\n  limits:\n    memory: 64Gi`, 'naive: more memory'),
    q: ['Which setting makes Prometheus reject a whole scrape that exceeds a series cap?', ['<code>sample_limit</code> on the scrape job', '<code>scrape_timeout</code>', '<code>evaluation_interval</code>', '<code>retention.time</code>'], 0, 'sample_limit (and label_limit) fail the scrape when exceeded, so a bad release shows up as a down target instead of silently exhausting memory.'],
    h: ['<p>Hint 1: <code>metric_relabel_configs</code> runs after the scrape, on each sample.</p>', '<p>Hint 2: action <code>labeldrop</code> with a regex on the label name.</p>', '<p>Hint 3: add <code>sample_limit</code> as a safety net, then fix the code and remove the label from the instrumentation.</p>'],
    a: `<p>Immediate containment in the job: drop the <code>user_id</code> label with <code>labeldrop</code> and cap the scrape with <code>sample_limit</code> so a repeat fails loudly. Be aware that samples whose labels become identical after the drop collide inside one scrape and Prometheus keeps only one, so the counts are wrong; this is a stop-gap to protect the server, not a measurement. The real fix is in the code: remove the label, expose only bounded labels (route template, status class), and move per-user questions to logs and traces. Afterwards add a CI check or a review rule asking "what is the maximum number of values for this label?".</p>`,
    code: Y(`scrape_configs:
  - job_name: app
    sample_limit: 20000               # a scrape with more samples than this FAILS, and the target shows as down
    static_configs:
      - targets: ['app:8000']
    metric_relabel_configs:
      - action: labeldrop
        regex: user_id                # remove the unbounded label from every sample`, 'stop-gap in prometheus.yml'),
    cx: `<p>Relabeling costs a regex match per sample; negligible next to the memory it saves.</p>`,
    f: ['How would you find the offending metric in the first place?']
  }));

  practice.push(P({
    t: 'histogram_quantile by hand', l: 'Medium', tags: ['histogram', 'promql', 'interpolation', 'python'], co: ['Grafana Labs', 'Datadog', 'Uber'], c: PYC,
    s: `<p>Write <code>hist_quantile(bounds, counts, q)</code> the way Prometheus does for classic histograms. <code>bounds</code> are the finite upper bounds in increasing order. <code>counts</code> are the <b>cumulative</b> bucket counts and have one more element than <code>bounds</code>: the last is the <code>+Inf</code> bucket, equal to the total. For <code>0 &lt; q &le; 1</code> compute the rank <code>q x total</code>, find the first bucket whose cumulative count is at least the rank, and interpolate linearly inside it, with a lower edge of 0 for the first bucket. If the rank falls in the <code>+Inf</code> bucket return the highest finite bound. If the total is 0 return <code>-1.0</code>.</p>`,
    ex: `<p>bounds <code>[0.1, 0.5, 1.0]</code>, counts <code>[600, 950, 990, 1000]</code>. p95: rank 950 falls in the bucket (0.1, 0.5] → ${H.c('g', '0.5')}. p50: rank 500 is in the first bucket: 0 + 0.1 x 500/600 = ${H.c('g', '0.0833')}. p99.9: rank 999 is in <code>+Inf</code> → ${H.c('b', '1.0')} (the real value is above 1.0, which is all Prometheus can say).</p>`,
    bw: `<p>Taking the bucket bound that contains the rank ("p95 is 0.5"). It overstates the latency for the first buckets and ignores where inside the bucket the rank lies: 0.1 for p50 would be 20 percent too high.</p>`,
    bc: PY(`def hist_quantile(bounds, counts, q):\n    total = counts[-1]\n    for i, c in enumerate(counts):\n        if c >= q * total:\n            return bounds[min(i, len(bounds) - 1)]     # just the bucket edge: no interpolation\n    return bounds[-1]`, 'naive: bucket edge'),
    q: ['Why can a very wide bucket make the p99 estimate misleading?', ['The estimate assumes values are spread evenly inside the bucket', 'Wide buckets make Prometheus slower', 'Buckets cannot be wider than 1 second', 'The quantile becomes exact'], 0, 'Linear interpolation assumes uniform density inside the bucket. If most values sit at one end, the estimate can be off by up to the bucket width.'],
    h: ['<p>Hint 1: rank = q x total, and bucket i covers (bounds[i-1], bounds[i]].</p>', '<p>Hint 2: inside the bucket, fraction = (rank - previous count) / (bucket count - previous count).</p>', '<p>Hint 3: if the matching bucket is the last one (the +Inf bucket) return the last finite bound; return -1.0 for an empty histogram; compare with a tiny tolerance for float rank.</p>'],
    a: `<p>Walk the cumulative counts until one reaches the rank. The width of the bucket times the fraction of its observations needed to reach the rank gives the offset above the lower bound. The first bucket starts at 0; the infinite bucket cannot be interpolated, so the highest finite bound is returned, which is what Prometheus does.</p>`,
    code: PY(`def hist_quantile(bounds, counts, q):
    total = counts[-1]
    if total == 0:
        return -1.0                                   # no observations
    rank = q * total
    for i, c in enumerate(counts):
        if c >= rank - 1e-9:                          # tolerance for float noise in q * total
            if i == len(bounds):
                return float(bounds[-1])              # +Inf bucket: only the highest finite bound is known
            lower = bounds[i - 1] if i > 0 else 0.0
            prev = counts[i - 1] if i > 0 else 0
            return lower + (bounds[i] - lower) * (rank - prev) / (c - prev)
    return float(bounds[-1])`, 'hist_quantile (tested)'),
    cx: `<p>O(B) time for B buckets, O(1) extra space.</p>`,
    f: ['How do native histograms reduce this interpolation error?'],
    tests: { sig: 'double[] int[] double -> double', fn: 'histQuantile', cmp: 'float', cases: [
        [[[0.1, 0.5, 1.0], [600, 950, 990, 1000], 0.99], 1.0],
        [[[0.1, 0.5, 1.0], [600, 950, 990, 1000], 0.95], 0.5],
        [[[0.1, 0.5, 1.0], [600, 950, 990, 1000], 0.5], 0.0833333333],
        [[[0.1, 0.5, 1.0], [600, 950, 990, 1000], 0.999], 1.0],
        [[[0.1, 0.5, 1.0], [600, 950, 990, 1000], 0.7], 0.2142857143],
        [[[0.1, 0.5, 1.0], [600, 950, 990, 1000], 1.0], 1.0],
        [[[0.05, 0.1, 0.3, 0.5, 1, 2.5], [10, 40, 80, 90, 95, 99, 100], 0.99], 2.5],
        [[[0.05, 0.1, 0.3, 0.5, 1, 2.5], [10, 40, 80, 90, 95, 99, 100], 0.5], 0.15],
        [[[0.05, 0.1, 0.3, 0.5, 1, 2.5], [10, 40, 80, 90, 95, 99, 100], 0.9], 0.5],
        [[[0.05, 0.1, 0.3, 0.5, 1, 2.5], [10, 40, 80, 90, 95, 99, 100], 0.25], 0.075],
        [[[1], [0, 5], 0.5], 1.0],
        [[[1], [0, 0], 0.5], -1.0],
        [[[2.0], [10, 10], 0.5], 1.0]
    ] }
  }));

  practice.push(P({
    t: 'Availability of a request path with replicas', l: 'Medium', tags: ['availability', 'redundancy', 'python'], co: ['Amazon', 'Flipkart', 'Atlassian'], c: PYC,
    s: `<p>A request must pass through several tiers in series (load balancer, app, database). Tier <code>i</code> has availability <code>avails[i]</code> per replica and <code>replicas[i]</code> independent replicas, and the tier works if at least one replica works. Write <code>composite_availability(avails, replicas)</code> returning the availability of the whole path (a number from 0 to 1). An empty path has availability 1.</p>`,
    ex: `<p>Two tiers of 0.99 with one replica each → 0.99 x 0.99 = ${H.c('r', '0.9801')}. Give the first tier two replicas → (1 - 0.01 x 0.01) x 0.99 = ${H.c('g', '0.989901')}. Chains multiply; replicas help only the tier they are in.</p>`,
    bw: `<p>Taking the best or the average tier ("our DB is 99.99 so the service is 99.99"). A chain is as weak as the product of its links: three 99.9 tiers give about 99.7.</p>`,
    bc: PY(`def composite_availability(avails, replicas):\n    return max(avails) if avails else 1.0       # ignores the other tiers`, 'naive: best tier'),
    q: ['Which assumption makes "two replicas square the failure chance" wrong in practice?', ['The replicas share a failure cause (same bad deploy, same database, same zone)', 'Replicas cost money', 'Availability is not multiplicative', 'Load balancers are always perfect'], 0, 'The formula assumes independent failures. A bad release or a shared dependency takes all replicas down at once, so the real gain is smaller.'],
    h: ['<p>Hint 1: tier availability with n replicas = 1 - (1 - a)^n.</p>', '<p>Hint 2: multiply the tier values together.</p>', '<p>Hint 3: start the product at 1.0 so the empty path returns 1.</p>'],
    a: `<p>For each tier compute the chance that all replicas fail, <code>(1 - a)^n</code>, and take its complement. The whole path is up only if every tier is up, so multiply. This is how you decide where a redundancy dollar helps most: the weakest tier.</p>`,
    code: PY(`def composite_availability(avails, replicas):
    total = 1.0
    for a, n in zip(avails, replicas):
        tier = 1.0 - (1.0 - a) ** n                   # at least one of n independent replicas is up
        total *= tier                                  # tiers are in series: all must be up
    return total`, 'composite_availability (tested)'),
    cx: `<p>O(T) time for T tiers, O(1) extra space.</p>`,
    f: ['How does a shared database change the calculation?'],
    tests: { sig: 'double[] int[] -> double', fn: 'compositeAvailability', cmp: 'float', cases: [
      [[[0.999], [1]], 0.999], [[[0.999], [2]], 0.999999], [[[0.99, 0.99], [1, 1]], 0.9801], [[[0.99, 0.99], [2, 1]], 0.989901],
      [[[0.9, 0.9, 0.9], [1, 1, 1]], 0.729], [[[0.99, 0.999, 0.9995], [1, 1, 1]], 0.988515495], [[[], []], 1.0], [[[0.95], [3]], 0.999875]
    ] }
  }));

  practice.push(P({
    t: 'Which Alertmanager receiver gets this alert?', l: 'Medium', tags: ['alertmanager', 'routing', 'python'], co: ['PagerDuty', 'Grafana Labs', 'Atlassian'], c: PYC,
    s: `<p>Model a flat Alertmanager routing list. Write <code>route_receiver(default, routes, labels)</code>. Each route is a string <code>"k=v,k2=v2&gt;receiver"</code>: every <code>k=v</code> pair must equal the alert's label (exact match); an empty matcher part (<code>"&gt;receiver"</code>) matches every alert. Routes are checked in order and the first match wins (like <code>continue: false</code>). <code>labels</code> is a string <code>"k=v,k2=v2"</code> (may be empty). If nothing matches return <code>default</code>.</p>`,
    ex: `<p>routes <code>["severity=page,team=payments&gt;payments-pager", "severity=page&gt;oncall"]</code>. Labels <code>severity=page,team=payments</code> → ${H.c('g', 'payments-pager')}. Labels <code>severity=page,team=search</code> → ${H.c('g', 'oncall')}. If the two routes are in the opposite order, the broader one wins first and payments never gets its own page: order is part of the config.</p>`,
    bw: `<p>Putting the broad route first because it "looks tidier". The specific route below it never matches, and the payments team silently receives nothing. This is the most common routing-tree bug; <code>amtool config routes test</code> finds it.</p>`,
    bc: PY(`def route_receiver(default, routes, labels):\n    for r in routes:\n        return r.split(">")[1]          # always picks the first route`, 'naive: first route always'),
    q: ['How do you make Alertmanager deliver one alert to two receivers?', ['Set <code>continue: true</code> on the first matching route', 'List both receivers in one route', 'Duplicate the alert in Prometheus', 'Use a silence'], 0, 'By default the first matching route stops the search. continue: true makes the search go on to the next sibling.'],
    h: ['<p>Hint 1: parse the labels into a dict once.</p>', '<p>Hint 2: for each route split on the first <code>&gt;</code>; the left part holds comma-separated <code>k=v</code> pairs.</p>', '<p>Hint 3: a route matches when all of its pairs equal the label values; the first match returns its receiver.</p>'],
    a: `<p>Build a dictionary from the labels. For each route in order, parse its matchers; if every key exists with exactly that value (an empty list matches everything), return its receiver. Fall back to the default receiver, which is the root route's receiver in Alertmanager.</p>`,
    code: PY(`def route_receiver(default, routes, labels):
    have = {}
    for pair in labels.split(","):
        if pair:
            k, v = pair.split("=", 1)
            have[k] = v
    for route in routes:
        matchers, receiver = route.split(">", 1)
        need = [m.split("=", 1) for m in matchers.split(",") if m]
        if all(have.get(k) == v for k, v in need):    # an empty list matches every alert
            return receiver
    return default`, 'route_receiver (tested)'),
    cx: `<p>O(R x M) for R routes with at most M matchers.</p>`,
    f: ['How do regex matchers and nested routes change the model?'],
    tests: { sig: 'string string[] string -> string', fn: 'routeReceiver', cases: [
        [['fallback', ['severity=page,team=payments>payments-pager', 'severity=page>oncall', 'severity=ticket>tickets'], 'severity=page,team=payments,service=checkout'], 'payments-pager'],
        [['fallback', ['severity=page,team=payments>payments-pager', 'severity=page>oncall', 'severity=ticket>tickets'], 'severity=page,team=search'], 'oncall'],
        [['fallback', ['severity=page,team=payments>payments-pager', 'severity=page>oncall', 'severity=ticket>tickets'], 'severity=ticket,team=payments'], 'tickets'],
        [['fallback', ['severity=page,team=payments>payments-pager', 'severity=page>oncall', 'severity=ticket>tickets'], 'severity=info'], 'fallback'],
        [['fallback', ['severity=page,team=payments>payments-pager', 'severity=page>oncall', 'severity=ticket>tickets'], ''], 'fallback'],
        [['fallback', ['severity=page>oncall', 'severity=page,team=payments>payments-pager'], 'severity=page,team=payments'], 'oncall'],
        [['fallback', ['team=a>a-team', '>everyone'], 'team=b'], 'everyone'],
        [['fallback', [], 'severity=page'], 'fallback'],
        [['fallback', ['severity=page>oncall'], 'severity=pager'], 'fallback'],
        [['fallback', ['env=prod>prod-pager'], 'service=x'], 'fallback'],
        [['default-q', ['alertname=Watchdog>heartbeat', 'severity=page>pager'], 'alertname=Watchdog,severity=page'], 'heartbeat']
    ] }
  }));

  practice.push(P({
    t: 'Which span is the bottleneck? Self time from a trace', l: 'Medium', tags: ['tracing', 'spans', 'self time', 'python'], co: ['Honeycomb', 'Datadog', 'Uber'], c: PYC,
    s: `<p>Spans are strings <code>"name|parent|start|end"</code> (times in milliseconds, <code>-</code> as the parent of the root, names unique). A span's <b>self time</b> is its duration minus the time covered by the union of its children's intervals, each clipped to the span's own interval (children may overlap because they run in parallel). Write <code>slowest_span(spans)</code> returning the name of the span with the largest self time; on a tie return the one that appears first in the list. Return <code>""</code> for an empty list.</p>`,
    ex: `<p><code>gw|-|0|1000</code>, <code>checkout|gw|50|950</code>, <code>db|checkout|100|700</code>, <code>pay|checkout|720|900</code> → self times gw 100, checkout 120, db 600, pay 180 → ${H.c('g', 'db')}. Parallel children <code>a</code> (10-60) and <code>b</code> (20-70) under a root of 100 cover 60 ms, not 100, so the root keeps 40 ms of its own.</p>`,
    bw: `<p>Choosing the span with the longest duration. That is always the root, which only tells you the request was slow, not where.</p>`,
    bc: PY(`def slowest_span(spans):\n    best, name = -1, ""\n    for s in spans:\n        n, p, a, b = s.split("|")\n        if int(b) - int(a) > best:\n            best, name = int(b) - int(a), n     # longest duration = always the root\n    return name`, 'naive: longest duration'),
    q: ['Two child spans run in parallel for 100 ms each, fully overlapping. How much of the parent is covered?', ['100 ms (the union), not 200', '200 ms', '0 ms', '50 ms'], 0, 'Overlapping children cover the same time. Self time subtracts the union of child intervals.'],
    h: ['<p>Hint 1: parse each span into name, parent, start and end.</p>', '<p>Hint 2: for one span, collect its children\'s intervals, clip each to the span, sort, and merge overlaps.</p>', '<p>Hint 3: self = duration - merged coverage; keep the first span that reaches the maximum.</p>'],
    a: `<p>For every span gather its children, clip them to its own interval, merge overlapping intervals and add up their lengths. Subtract from the duration. The largest self time marks where the time is actually spent. Use a strict greater-than when comparing so ties keep the earlier span.</p>`,
    code: PY(`def slowest_span(spans):
    rows = []
    for s in spans:
        name, parent, start, end = s.split("|")
        rows.append((name, parent, int(start), int(end)))
    best_name, best_self = "", -1
    for name, parent, start, end in rows:
        kids = sorted((max(a, start), min(b, end)) for n, p, a, b in rows if p == name and min(b, end) > max(a, start))
        covered, cur = 0, None
        for lo, hi in kids:                                # merge overlapping child intervals
            if cur is None:
                cur = [lo, hi]
            elif lo <= cur[1]:
                cur[1] = max(cur[1], hi)
            else:
                covered += cur[1] - cur[0]
                cur = [lo, hi]
        if cur is not None:
            covered += cur[1] - cur[0]
        self_time = (end - start) - covered
        if self_time > best_self:                          # strict: the earlier span wins a tie
            best_name, best_self = name, self_time
    return best_name`, 'slowest_span (tested)'),
    cx: `<p>O(n squared) with the simple child lookup; build a children map for O(n log n).</p>`,
    f: ['What would change if the slow work is hidden in an asynchronous child that outlives the parent?'],
    tests: { sig: 'string[] -> string', fn: 'slowestSpan', cases: [
        [[['gw|-|0|1000', 'checkout|gw|50|950', 'db|checkout|100|700', 'pay|checkout|720|900']], 'db'],
        [[['root|-|0|100', 'a|root|10|60', 'b|root|20|70']], 'a'],
        [[['only|-|0|5']], 'only'],
        [[[]], ''],
        [[['r|-|0|100', 'x|r|0|30', 'y|r|30|60', 'z|r|60|90']], 'x'],
        [[['r|-|0|100', 'slow|r|0|100']], 'slow'],
        [[['r|-|10|20', 'c|r|0|30']], 'c'],
        [[['a|-|0|100', 'b|a|10|90', 'c|b|20|80']], 'c'],
        [[['web|-|0|2000', 'api|web|0|100']], 'web'],
        [[['gateway|-|0|1200', 'checkout|gateway|20|1180', 'cart-db|checkout|40|90', 'inventory|checkout|100|160', 'payment-provider|checkout|170|1150', 'fraud-check|payment-provider|180|230']], 'payment-provider']
    ] }
  }));

  practice.push(P({
    t: 'Which burn-rate alert fires?', l: 'Medium', tags: ['slo', 'burn rate', 'multi-window', 'python'], co: ['Google', 'Datadog', 'Grafana Labs'], c: PYC,
    s: `<p>Write <code>burn_alert(slo_percent, ratios)</code>. <code>ratios</code> has 7 error ratios (fractions, not percent) for the windows <code>[5m, 30m, 1h, 2h, 6h, 1d, 3d]</code>. The burn rate of a window is <code>ratio / ((100 - slo_percent) / 100)</code>. Check the rules in this order and return the name of the first that fires, else <code>"none"</code>: <code>page-fast</code> (1h and 5m both at least 14.4), <code>page-slow</code> (6h and 30m at least 6), <code>ticket-1d</code> (1d and 2h at least 3), <code>ticket-3d</code> (3d and 6h at least 1). Treat a burn within one part in a billion below a threshold as meeting it, to absorb float rounding.</p>`,
    ex: `<p>SLO 99.9, 5m/1h ratios 0.02: burn 20 on both → ${H.c('r', 'page-fast')}. If only the 1h window is high and the 5m ratio is 0.0001, the fast rule stays silent (the problem has passed), and the slow rule decides.</p>`,
    bw: `<p>One threshold on one window ("error ratio over 1 percent for 5 minutes"). It misses slow leaks for days and pages on short blips. Burn-rate pairs encode both urgency and significance.</p>`,
    bc: PY(`def burn_alert(slo_percent, ratios):\n    budget = (100 - slo_percent) / 100\n    return "page-fast" if ratios[0] > budget else "none"   # one window, one threshold`, 'naive: one window'),
    q: ['Why must the short window also exceed the threshold?', ['So the alert stops soon after the problem is fixed and does not page for a past incident', 'To save CPU', 'Because the long window is inaccurate', 'It is required by Alertmanager'], 0, 'The long window remembers the outage for up to its whole length. The short window shows whether errors are still happening now.'],
    h: ['<p>Hint 1: compute burn = ratio / budget for the windows you need.</p>', '<p>Hint 2: a rule fires only if BOTH its long and short windows reach the multiplier.</p>', '<p>Hint 3: keep the rules in a list in priority order and compare with <code>mult * (1 - 1e-9)</code>.</p>'],
    a: `<p>A table of (name, multiplier, long window index, short window index) in severity order. For each, compute both burn rates and test both against the multiplier with a tiny tolerance for float rounding. The first rule that passes is the answer. The indexes map to the window list, so the code stays readable.</p>`,
    code: PY(`def burn_alert(slo_percent, ratios):
    budget = (100.0 - slo_percent) / 100.0
    # window indexes: 0=5m 1=30m 2=1h 3=2h 4=6h 5=1d 6=3d
    rules = [("page-fast", 14.4, 2, 0), ("page-slow", 6.0, 4, 1), ("ticket-1d", 3.0, 5, 3), ("ticket-3d", 1.0, 6, 4)]
    for name, mult, long_i, short_i in rules:
        need = mult * (1 - 1e-9)                       # tolerate float rounding at the boundary
        if ratios[long_i] / budget >= need and ratios[short_i] / budget >= need:
            return name
    return "none"`, 'burn_alert (tested)'),
    cx: `<p>O(1): four rules, two divisions each.</p>`,
    f: ['How would the thresholds change for a 7-day SLO window?'],
    tests: { sig: 'double double[] -> string', fn: 'burnAlert', cases: [
      [[99.9, [0, 0, 0, 0, 0, 0, 0]], 'none'],
      [[99.9, [0.02, 0.02, 0.02, 0.01, 0.005, 0.001, 0.001]], 'page-fast'],
      [[99.9, [0.0001, 0.02, 0.02, 0.015, 0.007, 0.002, 0.001]], 'page-slow'],
      [[99.9, [0.001, 0.004, 0.004, 0.004, 0.004, 0.004, 0.0012]], 'ticket-1d'],
      [[99.9, [0.0015, 0.0015, 0.0015, 0.0015, 0.0015, 0.0015, 0.0015]], 'ticket-3d'],
      [[99.9, [0.0144, 0.0144, 0.0144, 0, 0, 0, 0]], 'page-fast'],
      [[99.9, [0.0009, 0.0009, 0.0009, 0.0009, 0.0009, 0.0009, 0.0009]], 'none'],
      [[99.99, [0.002, 0.002, 0.002, 0.002, 0.002, 0.002, 0.002]], 'page-fast'],
      [[99, [0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05]], 'ticket-1d'],
      [[99.9, [0, 0, 0, 0.0001, 0, 0.004, 0.004]], 'none'],
      [[99.9, [0.0143, 0.0143, 0.0143, 0.0143, 0.0143, 0.0143, 0.0143]], 'page-slow']
    ] }
  }));

  practice.push(P({
    t: 'Fix the 3am pages: redesign the alerts', l: 'Medium', tags: ['alerting', 'on-call', 'symptoms', 'alertmanager'], co: ['PagerDuty', 'Atlassian', 'Swiggy'],
    s: `<p>The on-call rotation of the payments team gets 25 pages a week. A review of last month shows: <code>HighCPU</code> (&gt; 80% for 1m) 41 pages, none actionable; <code>PodRestarted</code> 22 pages, 20 were routine deploys; <code>DiskUsage85</code> 9 pages, all fixed next morning; <code>CheckoutErrors</code> (&gt; 5% for 10m) 6 pages, 5 actionable; <code>DBDown</code> 2 pages, both real, each followed by 60 duplicate alerts. Redesign the alerting: which alerts remain pages, which become tickets, which are deleted, and what do you change in Alertmanager?</p>`,
    ex: `<p>Result: ${H.c('g', '2 page alerts')} (checkout error ratio with <code>for: 10m</code> or SLO burn, and DBDown), ${H.c('b', '2 ticket alerts')} (disk predicted full, restarts over a threshold in 1 hour), ${H.c('r', 'HighCPU deleted')}, plus inhibition and grouping so DBDown is one page.</p>`,
    bw: `<p>Raising every threshold a bit ("80% to 90%") and leaving the structure alone. The alerts are still cause-based and still page at night for things nobody needs to fix at night.</p>`,
    bc: Y(`# naive: same alerts, higher thresholds\n- alert: HighCPU\n  expr: node_cpu_usage > 0.9\n  for: 1m\n  labels: { severity: page }`, 'naive: tweak the number'),
    q: ['What is the best test of whether something deserves a page?', ['Does a human need to act right now, and is a user hurt or about to be?', 'Is a metric above its historical average?', 'Did it fire last week?', 'Is the metric easy to measure?'], 0, 'A page costs sleep and trust. Reserve it for urgent, actionable, user-impacting conditions.'],
    h: ['<p>Hint 1: classify each alert as symptom or cause, urgent or not.</p>', '<p>Hint 2: the first filter is "would I act on this at 3am?".</p>', '<p>Hint 3: use <code>for:</code> for blips, severity routing for tickets, and inhibition plus <code>group_by</code> for storms.</p>'],
    a: `<p>Delete <code>HighCPU</code>: CPU is a cause, and users were fine; if saturation matters, graph it and ticket it with a long <code>for</code>. Turn <code>PodRestarted</code> into a ticket alert on repeated restarts (for example more than 3 in an hour) and ignore restarts during deploys with a deploy annotation or a longer window. Turn <code>DiskUsage85</code> into a <code>predict_linear</code> ticket that fires when the disk will fill within 4 hours. Keep <code>CheckoutErrors</code> as a page but replace the fixed threshold by the SLO burn-rate pair from topic 9. Keep <code>DBDown</code> as a page and add an inhibition rule so it mutes dependent alerts for the same environment, and set <code>group_by: [alertname, env]</code>. Add a weekly review of pages with owners and an action for every non-actionable one. Target: under 2 pages per shift.</p>`,
    code: Y(`# New alert set, in short
groups:
  - name: payments
    rules:
      - alert: CheckoutBudgetBurnFast       # from topic 9: user-facing symptom
        expr: service:http_errors:ratio_rate1h{service="checkout"} > (14.4 * 0.001) and service:http_errors:ratio_rate5m{service="checkout"} > (14.4 * 0.001)
        for: 2m
        labels: { severity: page }
      - alert: DBDown
        expr: up{job="postgres"} == 0
        for: 2m
        labels: { severity: page }
      - alert: DiskWillFillIn4Hours         # cause, not urgent at night: ticket
        expr: predict_linear(node_filesystem_avail_bytes[6h], 4 * 3600) < 0
        for: 30m
        labels: { severity: ticket }
      - alert: PodRestartLoop
        expr: increase(kube_pod_container_status_restarts_total[1h]) > 3
        for: 10m
        labels: { severity: ticket }
# HighCPU is deleted. In Alertmanager: inhibit DBDown over dependent alerts (equal: [env]).`, 'the redesigned alert set'),
    cx: `<p>Measure success with pages per shift and the share of actionable pages.</p>`,
    f: ['How would you convince a team to delete an alert that "has always been there"?']
  }));

  practice.push(P({
    t: 'Burn-rate alerts for a latency SLO', l: 'Hard', tags: ['slo', 'latency', 'histogram', 'burn rate', 'promql'], co: ['Google', 'Grafana Labs', 'Uber'],
    s: `<p>The search service has a latency SLO: <b>99% of requests complete in under 300 ms</b>, over 30 days. The histogram <code>http_request_duration_seconds_bucket</code> has a bucket with <code>le="0.3"</code>. Write the recording rules for the "bad" ratio (requests slower than 300 ms) over the 5 minute and 1 hour windows, and the fast-burn page alert. Give the numeric threshold, and explain how the slow-burn rules differ.</p>`,
    ex: `<p>The budget is 1 percent (0.01). A burn rate of 14.4 means a slow-request ratio above <code>14.4 x 0.01 = 0.144</code> (14.4% of requests over 300 ms) on <b>both</b> the 1h and 5m windows. ${H.c('g', '14.4% slow')} pages; ${H.c('r', '5% slow')} (burn 5) does not page but is picked up by the 6x/6h or the ticket rules only if it lasts.</p>`,
    bw: `<p>Alerting on the p99 latency crossing 300 ms. A single percentile does not map to a budget: p99 at 301 ms and p99 at 3 s are very different burn rates, and the alert flaps around the threshold.</p>`,
    bc: PQ(`histogram_quantile(0.99, sum by (le) (rate(http_request_duration_seconds_bucket[5m]))) > 0.3`, 'naive: p99 above the threshold'),
    q: ['Why must the histogram have a bucket edge at exactly 0.3?', ['The good-events count is the cumulative bucket <code>le="0.3"</code>; without an edge it can only be approximated', 'Prometheus requires it', 'To reduce memory', 'So p99 is exact'], 0, 'The latency SLI is "requests at or under 300 ms divided by all requests". The le="0.3" bucket holds exactly that count; between edges you can only estimate.'],
    h: ['<p>Hint 1: good ratio = rate(bucket{le="0.3"}) / rate(count); bad ratio = 1 - good ratio.</p>', '<p>Hint 2: the budget is 0.01, so thresholds are multiplier x 0.01.</p>', '<p>Hint 3: the alert needs a long and a short window; slow-burn rules reuse the same pattern with 6h/30m, 1d/2h, 3d/6h.</p>'],
    a: `<p>Record the slow-request ratio per window as <code>1 - sum(rate(bucket{le="0.3"})) / sum(rate(count))</code> aggregated by service. The fast-burn page alert fires when both the 1h and the 5m ratio exceed 14.4 x 0.01 = 0.144 for 2 minutes. The slow-burn and ticket rules have the same structure with multipliers 6, 3 and 1 and window pairs 6h/30m, 1d/2h and 3d/6h; thresholds are 0.06, 0.03 and 0.01. Because the SLI is a ratio of counters, it is aggregation-safe across pods, unlike a percentile.</p>`,
    code: Y(`groups:
  - name: search_latency_slo
    rules:
      - record: service:slow_requests:ratio_rate5m
        expr: 1 - (sum by (service) (rate(http_request_duration_seconds_bucket{le="0.3"}[5m])) / sum by (service) (rate(http_request_duration_seconds_count[5m])))
      - record: service:slow_requests:ratio_rate1h
        expr: 1 - (sum by (service) (rate(http_request_duration_seconds_bucket{le="0.3"}[1h])) / sum by (service) (rate(http_request_duration_seconds_count[1h])))
      - alert: SearchLatencyBudgetBurnFast        # 14.4 x budget 0.01 = 0.144
        expr: service:slow_requests:ratio_rate1h{service="search"} > 0.144 and service:slow_requests:ratio_rate5m{service="search"} > 0.144
        for: 2m
        labels: { severity: page }
        annotations:
          summary: 'Search is too slow for 14%+ of requests: the latency error budget is burning 14.4x too fast'`, 'latency SLO rules'),
    cx: `<p>Two range queries per window per service; the recording rules keep dashboards cheap.</p>`,
    f: ['What happens to the SLI if the app changes its buckets?', 'How would you combine the availability and latency SLOs into one alert?']
  }));

  practice.push(P({
    t: 'Incident drill: 30% of the monthly budget gone in an hour', l: 'Hard', tags: ['incident', 'runbook', 'slo', 'triage'], co: ['Google', 'Netflix', 'Razorpay'],
    s: `<p>At 02:14 the fast-burn page fires for checkout: the SLO is 99.9 percent and the 1 hour error ratio is 21.6 percent. Write the runbook for the first 15 minutes: how to confirm the page, the exact queries and commands you run, how you decide between rollback and mitigation, what you communicate, and what you record for the postmortem. Include how long the budget would last at this rate.</p>`,
    ex: `<p>Burn rate = 21.6 / 0.1 = ${H.c('r', '216')}. Budget used per hour: 216 / 720 = ${H.c('r', '30%')}. At this rate the whole monthly budget is gone in 720 / 216 = ${H.c('r', '3.3 hours')}.</p>`,
    bw: `<p>Opening the 40-panel infrastructure dashboard and hunting for something red, then restarting services at random "to see". Without a hypothesis you lose 20 minutes and may destroy evidence.</p>`,
    bc: SH(`# naive: restart everything\nfor s in app db cache; do docker compose restart $s; done`, 'naive: restart everything'),
    q: ['The error ratio started right after a deploy 8 minutes ago. What is the usual first mitigation?', ['Roll back (or disable the feature flag) first, investigate afterwards', 'Scale the database', 'Silence the alert', 'Wait for the 5 minute window to confirm'], 0, 'Reduce user harm first. A rollback is quick, safe and reversible; root-cause work continues with the evidence kept.'],
    h: ['<p>Hint 1: confirm with the dashboard and an independent signal (synthetic check or user reports).</p>', '<p>Hint 2: what changed? Deploy annotation, feature flag, dependency status page.</p>', '<p>Hint 3: mitigate, communicate, then diagnose with traces and logs; write the timeline as you go.</p>'],
    a: `<p><b>0 to 2 min.</b> Acknowledge the page. Open the checkout health dashboard: confirm the error ratio, which route (breakdown by route) and since when. Check the deploy annotation and feature flags. <b>2 to 5 min.</b> If a change lines up in time, roll it back or turn the flag off; announce in the incident channel (impact: about 21 percent of checkout requests failing, started 02:09, owner: you). <b>5 to 10 min.</b> If no change lines up, open an exemplar trace from a failing request, find the failing span (self time and error status), and read the logs for its trace id; check dependencies (payment provider, database pool saturation). Apply the matching mitigation: fail over, increase pool, disable the dependency path. <b>10 to 15 min.</b> Watch the 5 minute error ratio return to normal and the page resolve. Post an update with the current burn state and the remaining budget. <b>After.</b> Record the timeline, the budget spent (about 30 percent), the detection delay, the fix, and file follow-ups: a test, an alert or runbook change, a safer rollout. Apply the error-budget policy: with a third of the budget gone, review upcoming risky releases.</p>`,
    code: SH(R`# 1. Confirm the burn and see which route (Prometheus HTTP API; the lab is on localhost)
curl -s 'http://127.0.0.1:9090/api/v1/query' --data-urlencode \
  'query=sum by (route) (rate(http_requests_total{service="checkout",status=~"5.."}[5m])) / sum by (route) (rate(http_requests_total{service="checkout"}[5m]))'

# 2. Budget burn right now (1h window) and time left at this rate (30 day budget = 720 hours)
curl -s 'http://127.0.0.1:9090/api/v1/query' --data-urlencode \
  'query=720 / (service:http_errors:ratio_rate1h{service="checkout"} / 0.001)'

# 3. Did a deploy line up? Build-info changes in the last 30 minutes
curl -s 'http://127.0.0.1:9090/api/v1/query' --data-urlencode \
  'query=changes(app_build_info{service="checkout"}[30m])'

# 4. Roll back the app image to the previous known-good version (lab: Compose)
APP_VERSION=1.4.1 docker compose up -d app

# 5. Keep the alert noise down while you work: silence the TICKET-level alerts only, with a reason and a short expiry
amtool silence add severity=ticket service=checkout --comment="incident INC-001 in progress" --duration=1h \
  --author="you@example.com" --alertmanager.url=http://127.0.0.1:9093`, 'runbook commands'),
    cx: `<p>The aim is to cut detection (the burn-rate pair), triage (dashboard order) and mitigation (rollback first) times.</p>`,
    f: ['What would make you not roll back?', 'What goes into the postmortem timeline?']
  }));

  practice.push(P({
    t: 'Design observability for a new payments platform', l: 'Hard', tags: ['design', 'slo', 'opentelemetry', 'cost', 'privacy'], co: ['Stripe', 'Razorpay', 'PhonePe'],
    s: `<p>A company is launching a payments platform: an API gateway, five services, a Postgres database and a message queue, about 2,000 requests per second at peak, compliance rules on card and personal data, and a team of 12 engineers with a 24x7 on-call rotation. Design the observability: what you instrument, SLOs, alerting, logging with privacy, tracing with sampling, tooling (open-source or vendor) and how you control cost. Name the first three things you build.</p>`,
    ex: `<p>Order: ${H.c('g', '1) request id and trace id on every log line and RED metrics on every service; 2) SLOs and burn-rate pages for checkout; 3) the dashboards and runbooks that page links to.')} Everything else (heatmaps, tail sampling tuning, cost dashboards) comes after.</p>`,
    bw: `<p>"Install a vendor agent everywhere and turn on all the features." It works on day one and fails on day 90: the bill is a surprise, card numbers appear in log search, 400 alerts exist and nobody knows which ones matter.</p>`,
    bc: Y(`# naive plan\nmonitoring:\n  agent: install-everything\n  logs: capture-full-request-bodies\n  alerts: every-metric-over-80-percent`, 'naive plan'),
    q: ['Which comes first in a design review of a new service\'s observability?', ['Define the user-facing SLIs and SLOs, then instrument what they need', 'Choose a vendor', 'Build 30 dashboards', 'Turn on debug logging'], 0, 'SLOs say what must be observable and what to page on. Tools and dashboards follow from them.'],
    h: ['<p>Hint 1: one SLI per user journey (pay, refund), measured at the edge.</p>', '<p>Hint 2: decide the data policy first: what may never be logged, retention, who may read.</p>', '<p>Hint 3: use OpenTelemetry with a Collector so tooling can change; control cost with cardinality rules, sampling and retention tiers.</p>'],
    a: `<p><b>SLIs and SLOs.</b> Pay API: availability (non-5xx) 99.95% and latency (under 500 ms) 99% over 30 days; refund API 99.9%. Page on multi-window burn rates; ticket on slow burns and saturation. <b>Metrics.</b> RED on every service with bounded labels (service, route template, status class), USE on the database, queue and pools; recording rules for the SLO ratios; Prometheus per environment with remote write to a long-term store for the 30-day SLO windows. <b>Logs.</b> Structured JSON with request id and trace id, no bodies or headers, an allow-list of fields, redaction in the logger and the Collector, 14 days hot retention, access limited by role, card data never logged. <b>Traces.</b> OpenTelemetry in all services, W3C propagation across HTTP and queue messages, tail sampling keeping errors and slow traces plus 5% baseline, attribute scrubbing in the Collector, exemplars on latency histograms. <b>Tooling.</b> Start open-source (Prometheus, Grafana, Loki, Tempo or Jaeger, Collector) with a platform owner, or a vendor if the team lacks capacity for operating it; the Collector keeps either reversible. <b>On-call.</b> Primary and secondary, runbook link in every page, weekly alert review, a target under 2 pages per shift. <b>Cost control.</b> Cardinality review on new labels, per-service quotas, dashboards for series count and ingest volume. <b>First three builds.</b> Request and trace ids with RED metrics; SLOs with burn-rate alerts for pay; the health dashboard and runbooks the page points to.</p>`,
    code: Y(`# observability-plan.yml - the design as a reviewable file
slos:
  - name: pay-availability
    sli: non-5xx responses / all responses (edge)
    target: 99.95
    window: 30d
  - name: pay-latency
    sli: responses under 500ms / all responses
    target: 99.0
    window: 30d
alerting:
  page: [pay-availability fast burn 14.4x (1h+5m), pay-latency fast burn, database down]
  ticket: [slow burns, disk filling, queue lag growing]
logging:
  format: json
  required_fields: [request_id, trace_id, service, route, status]
  forbidden: [request_body, authorization, card_number]
  retention_days: 14
tracing:
  propagation: w3c
  sampling: {errors: 1.0, slow_over_ms: 500, baseline: 0.05}
cost:
  label_review: required
  series_budget_per_service: 50000`, 'observability plan'),
    cx: `<p>Cost grows with series, ingested GB and stored spans; the plan caps each.</p>`,
    f: ['How would the plan change at 100x the traffic?', 'Who owns the SLOs and the error-budget policy?']
  }));

  // ───────────────────────── Quiz ─────────────────────────
  Q('A counter <code>http_requests_total</code> is plotted as a raw line and keeps climbing. Which query shows the traffic you actually care about?', ['<code>sum(rate(http_requests_total[5m]))</code>', '<code>sum(http_requests_total)</code>', '<code>max(http_requests_total)</code>', '<code>avg_over_time(http_requests_total[5m])</code>'], 0, 'A counter only grows. rate() converts it to a per-second speed and copes with restarts; sum aggregates after the rate.');
  Q('The average latency is 180 ms but customers complain. What is the most likely explanation and the first check?', ['A slow tail: look at p95/p99 from histogram buckets', 'The monitoring is broken', 'CPU is too low', 'The scrape interval is too short'], 0, 'Averages hide the slowest few percent. Percentiles from histograms show what the unlucky users feel.');
  Q('Which label is safe on a request counter?', ['A route template from a fixed set', 'user_id', 'request_id', 'The full URL with query string'], 0, 'Label values must be bounded and controlled by you. Ids and URLs grow with traffic and explode the series count.');
  Q('A metric has labels with 4, 30 and 6 values. How many series can it create (not a histogram)?', ['720', '40', '180', '24'], 0, '4 x 30 x 6 = 720. Series multiply across labels.');
  Q('Why is <code>histogram_quantile(0.99, sum by (le) (rate(x_bucket[5m])))</code> correct across 50 pods but averaging 50 pod-level p99 values is not?', ['Bucket counts add up across pods; percentiles do not', 'Histograms are faster', 'Averages are illegal in PromQL', 'Pods report in different units'], 0, 'The 99th percentile of all requests is not the average of each pod\'s 99th percentile. Summing buckets first keeps the full distribution.');
  Q('An alert has <code>for: 10m</code>. The condition is true for 9 minutes, false for one evaluation, then true again. What happens?', ['The pending timer resets; it must be true for 10 unbroken minutes', 'It fires after 10 minutes of total true time', 'It fires immediately', 'It is silenced'], 0, 'for: needs an uninterrupted run. A false evaluation sends the alert back to inactive.');
  Q('In Alertmanager, what does an inhibition rule do?', ['Mutes target alerts while a source alert with matching equal labels is firing', 'Delays all alerts by 5 minutes', 'Deletes the alert rule', 'Sends each alert twice'], 0, 'Inhibition suppresses dependent notifications (for example tickets for a service that already has a page) while the more important alert fires.');
  Q('What is the right use of an Alertmanager silence?', ['A temporary mute with an expiry and a comment, for planned work', 'A permanent way to remove noisy alerts', 'A way to edit alert labels', 'A replacement for fixing the rule'], 0, 'Silences are short, visible and expire. Noisy rules should be fixed or deleted, not silenced forever.');
  Q('Which header carries trace context between services in the W3C standard?', ['<code>traceparent</code>', '<code>X-Request-Time</code>', '<code>Trace-Level</code>', '<code>Content-Trace</code>'], 0, 'traceparent holds version, trace id, parent span id and flags; tracestate and baggage are companions.');
  Q('In a trace the root span lasts 1.2 s and one child call has a self time of 930 ms. Where do you look first?', ['The child span with the large self time', 'The root span', 'The Prometheus config', 'The Alertmanager routes'], 0, 'Self time shows where the time is spent in a span itself. The root is always the longest, which says nothing about the cause.');
  Q('Why is tail sampling in the OpenTelemetry Collector preferred over a 10% head sampler for debugging?', ['It can keep every error and slow trace after seeing the whole trace', 'It uses no memory', 'It does not need a Collector', 'It removes the need for traces'], 0, 'Head sampling decides blindly at the start and drops most error traces. Tail sampling decides after the trace is complete.');
  Q('An SLO is 99.9% over 30 days and the 1 hour error ratio is 1.44%. What is the burn rate?', ['14.4', '1.44', '0.144', '144'], 0, 'Burn rate = error ratio / budget = 1.44% / 0.1% = 14.4. At that rate 2% of the monthly budget goes in an hour.');
  Q('Why do multi-window burn-rate alerts require a short window as well as a long one?', ['So the alert clears quickly once the problem is fixed and does not page for a past incident', 'To reduce Prometheus memory', 'Because Alertmanager needs two windows', 'To measure latency'], 0, 'The long window proves the loss is significant; the short window proves it is still happening.');
  Q('Where should secrets such as a Grafana admin password or an Alertmanager webhook URL live in the lab repository?', ['In gitignored files or env files, referenced by path or variable name; only placeholders are committed', 'In docker-compose.yml, since the repo is private', 'In a base64 string in the config', 'In a Dockerfile ENV line'], 0, 'Anything committed lives in git history forever and on every clone. Reference secrets by file path or variable and keep the values out of the repo.');
  Q('What does a log redaction filter protect against, and where should it run first?', ['Leaking secrets and PII into a shared log store; in the application logger, before the line leaves the process', 'Slow queries; in Grafana', 'Disk usage; in Prometheus', 'Network latency; in the load balancer'], 0, 'Redaction removes sensitive values at the source. A second net in the collector catches what the app missed.');

  // ───────────────────────── Interview ─────────────────────────
  IQ('Explain the difference between monitoring and observability, and the role of metrics, logs and traces.', '<p><b>Monitoring</b> checks known failure modes with prepared dashboards and alerts ("is CPU above 90%?"). <b>Observability</b> means the system emits enough rich, correlated data that you can answer questions you did not plan for ("why are only checkout requests from one region slow?"). Metrics are cheap numbers over time that tell you something is wrong and how bad. Traces follow one request across services and show which hop is slow. Logs carry the detailed events and error messages. They are most useful when linked by service name, trace id and request id so you can pivot from an alert to a graph to a trace to the log lines of that trace.</p>', 'B', ['Which would you build first for a new service?', 'What breaks the link between the three?']);
  IQ('What are the Prometheus metric types, and when do you use each?', '<p><b>Counter</b>: only goes up (requests, errors, bytes); read it with rate() or increase(). <b>Gauge</b>: goes up and down (queue length, memory, in-flight requests); read it directly. <b>Histogram</b>: counts observations into cumulative buckets plus sum and count; use it for latency and sizes, because buckets can be added across pods and turned into percentiles with histogram_quantile. <b>Summary</b>: computes quantiles in the client; accurate for one instance but the quantiles cannot be aggregated. I default to counters, gauges and histograms and use base units in the names.</p>', 'B', ['Why can\'t you average p99s?', 'How would you choose histogram buckets?']);
  IQ('A developer wants to add user_id as a label to see per-customer latency. How do you respond?', '<p>I explain that each label value creates a new time series, so total series is the product of label cardinalities, and a histogram multiplies it again by the bucket count. 200,000 users on a 1,320-series metric becomes about 264 million series, which exhausts Prometheus memory, slows queries and can make the server crash-loop while replaying its WAL, taking all alerting down. I would offer alternatives: put user_id in logs and trace attributes, use exemplars to find a slow request, keep a metric per customer tier or plan rather than per user, and add a sample_limit and a labeldrop in relabeling as guards. On a vendor platform the same tag becomes a custom-metrics bill.</p>', 'I', ['How do you find which metric is exploding?', 'What is a safe number of values for a label?']);
  IQ('Walk me through rate(), irate() and increase(), and what happens at a counter reset.', '<p>rate(x[5m]) is the average per-second increase over the window, computed from the first and last samples and extrapolated to the window edges. irate() uses only the last two samples, so it is spiky; I use it for zoomed-in graphs but never for alerts. increase(x[1h]) is rate multiplied by the window, so it can be fractional. When a counter drops, the process restarted from zero, and Prometheus treats the new value as the increase for that step, so there are no negative spikes. That is why you apply rate() to each series first and then sum: summing raw counters would hide a single pod\'s reset inside the total.</p>', 'I', ['Why must the range be at least 2 scrape intervals?', 'What does $__rate_interval do in Grafana?']);
  IQ('How do you compute a p99 latency in PromQL across many pods, and what are the accuracy limits?', '<p><code>histogram_quantile(0.99, sum by (le) (rate(http_request_duration_seconds_bucket[5m])))</code>. You sum the bucket rates across pods keeping le, then Prometheus finds the bucket that contains rank 0.99 x total and interpolates linearly inside it. The estimate assumes values are spread evenly in the bucket, so the error can be as large as the bucket width. If the rank falls in the +Inf bucket, only the highest finite bound is returned. Put a bucket edge at the SLO threshold, check the bucket layout, or use native histograms with exponential buckets for finer resolution. Add route to the by clause for a per-route percentile.</p>', 'A', ['Why keep le in the by clause?', 'What would you record as a recording rule here?']);
  IQ('How do you design alerts so that on-call engineers are not woken up for non-issues?', '<p>Page only on symptoms that need a human now: users are hurt or about to be, ideally through SLO burn-rate alerts. Use a for: duration so blips do not page. Move cause and capacity alerts (high CPU, disk predicted full) to tickets with working-hours routing. In Alertmanager group by alertname and service, inhibit dependent alerts when a bigger one fires, and give every page a summary, runbook link and dashboard. Run a weekly review of all pages: delete or fix any that were not actionable, and track pages per shift (aim for under two) and the share that were actionable. Add a Watchdog heartbeat so a broken alerting pipeline is noticed.</p>', 'I', ['What is your policy for silences?', 'How do you handle alerts for a flapping condition?']);
  IQ('Explain Alertmanager grouping, inhibition, silences and the three timing settings.', '<p>Grouping combines alerts that share the group_by labels into a single notification, so fifty failing pods become one message. Inhibition mutes target alerts while a source alert with equal labels is firing, for example mute service tickets while the service is paged. A silence is a human-made, expiring mute matching labels. group_wait is how long to wait for more alerts before sending the first notification of a new group; group_interval is the minimum gap before sending updates for a group; repeat_interval is how often to remind about an alert that is still firing. Short group_wait for pages, longer for tickets; routing is a tree where the first matching child wins unless continue: true is set.</p>', 'I', ['How do you test the routing tree before an incident?', 'What does send_resolved do?']);
  IQ('What is the RED method, the USE method and the four golden signals, and how do they relate?', '<p>RED (Rate, Errors, Duration) describes a request-serving service from the user\'s side. USE (Utilisation, Saturation, Errors) describes a resource such as CPU, disk or a connection pool from the inside. The four golden signals from the Google SRE book (latency, traffic, errors, saturation) are RED plus saturation, with the note that latency should be split for successful and failed requests. In practice I put RED on every service and USE on every shared resource, and read them in that order when something is slow: first what users feel, then what is exhausted. Saturation (queues filling) tends to warn before utilisation looks bad.</p>', 'B', ['Which would you use for a database connection pool?', 'Why separate failed-request latency?']);
  IQ('What is distributed tracing, and how does context propagate between services?', '<p>A trace is the path of one request through many services, made of spans: timed operations with a parent, attributes, events and a status. Context propagation carries the trace id and the caller\'s span id to the next service so its spans become children. The standard is the W3C traceparent header: version, 32-hex trace id, 16-hex parent span id and flags (the sampled bit). Each hop keeps the trace id and creates a new span id. For queues the context is injected into message headers and extracted by the consumer. Broken traces usually come from a library or thread boundary that does not forward the context, or from services using different propagation formats.</p>', 'I', ['What is baggage and what must not go in it?', 'How do span links differ from parent-child?']);
  IQ('How do you find the slow downstream call for a slow request using a trace?', '<p>Open a trace of a slow request, ideally reached from an exemplar on the latency graph. The waterfall shows spans on a time axis. The longest bar is the root, so compare self times: duration minus the union of the child spans. Look for a client span with a large self time or a sequence of sibling spans that run one after another although they could run in parallel. Check span status and events for errors and retries, then use the trace id to read the logs for that request. Confirm it is systemic by looking at the same span\'s latency across many traces or the downstream\'s own RED metrics before blaming it.</p>', 'I', ['What if the trace is missing spans from a service?', 'How would you spot a serial call that should be parallel?']);
  IQ('Describe the OpenTelemetry architecture and why you would put a Collector in the middle.', '<p>The API is what instrumentation calls; the SDK implements sampling, batching and export; OTLP is the wire protocol; the Collector is a separate process with receivers, processors and exporters wired into pipelines. A Collector decouples apps from backends: I can change from Jaeger to a vendor by changing exporters, scrub or hash sensitive attributes centrally, apply tail sampling, generate span metrics, batch and retry, and protect the pipeline with a memory limiter, all without redeploying services. The cost is one more component to run and monitor, and the tail-sampling tier needs all spans of a trace on one instance, usually via a load-balancing exporter by trace id.</p>', 'A', ['What order do processors go in?', 'What is the difference between head and tail sampling?']);
  IQ('What are exemplars and how do they connect metrics to traces?', '<p>An exemplar is a sample identifier, usually a trace id, attached to a metric observation. When the app records a request into a latency histogram it also stores the trace id of that request. Prometheus (with exemplar storage enabled and scraping in OpenMetrics format) keeps them, and Grafana draws them as dots on the latency graph. Clicking a dot on a slow bucket opens that exact trace. It closes the loop between an alert, a graph and a trace without searching. The plumbing needs the client library to attach exemplars, the OpenMetrics exposition, the Prometheus feature flag and a Grafana data source mapping the label to the tracing system.</p>', 'A', ['What size limit applies to an exemplar label set?', 'How do logs link to the same trace?']);
  IQ('Define SLI, SLO, SLA and error budget, and explain how you would use an error budget in practice.', '<p>An SLI is a measured ratio of good events to valid events, for example requests that succeed in under 300 ms. An SLO is the target for it over a window, 99.9 percent over 30 days. An SLA is a contract with consequences such as credits, usually looser than the SLO. The error budget is 1 minus the SLO, here 0.1 percent of requests or about 43 minutes of full outage per window. I use it as a shared decision rule: when plenty is left, ship features and take risks; when it is nearly spent, freeze risky changes and invest in reliability, according to a written error-budget policy agreed with product. Alerts are derived from budget burn, not from raw thresholds.</p>', 'I', ['Who owns the SLO?', 'Why not aim for 100 percent?']);
  IQ('Explain multi-window, multi-burn-rate alerting with numbers.', '<p>Burn rate is the observed error ratio divided by the allowed ratio (1 - SLO). A burn of 1 uses the whole 30-day budget in exactly 30 days. The workbook pairs are: 14.4x over 1 hour and 5 minutes (about 2 percent of the budget) as a page; 6x over 6 hours and 30 minutes (5 percent) as a page; 3x over 1 day and 2 hours (10 percent) as a ticket; 1x over 3 days and 6 hours (10 percent) as a ticket. Both windows must exceed the threshold: the long one shows the loss is significant, the short one (about a twelfth of the long) shows it is still happening and makes the alert reset quickly. A 30 percent budget burn in an hour is a burn rate of 216, and fires the fast pair within minutes.</p>', 'A', ['How do you handle a low-traffic service?', 'What recording rules do you need?']);
  IQ('How do you handle secrets and personal data in logs, traces and monitoring configs?', '<p>Do not log what you do not need: no bodies, no authorization headers, an allow-list of fields. Redact in the logger before the line leaves the process (patterns for tokens, key=value secrets, emails and card numbers) and again in the collector, and scrub or hash risky span attributes in the OTel Collector. Restrict who can read the log store and set short retention. For configs, never commit passwords or webhook URLs: use gitignored env or secret files, Docker or Kubernetes secrets, the _FILE variants such as GF_SECURITY_ADMIN_PASSWORD__FILE and url_file in Alertmanager, with placeholders and an .env.example in the repo. If a leak happens, rotate the secret, purge the data and review access. Never paste raw production logs into an external assistant.</p>', 'A', ['What can regex redaction not catch?', 'How would you test that no secrets reach the log store?']);
  IQ('Open-source observability stack versus Datadog or New Relic: how do you decide?', '<p>I compare who operates it, cost shape, speed to value, lock-in and data rules. A self-run stack (Prometheus, Grafana, Loki or Elasticsearch, OTel, Jaeger) has low licence cost and full control but needs people for upgrades, scaling, storage and on-call of the monitoring itself. A SaaS like Datadog or New Relic is fast to adopt with polished APM and integrations, but bills by hosts, custom metrics, log ingest and users, so cardinality and log volume become invoices. Instrumenting with OpenTelemetry and sending through a Collector keeps the decision reversible, and many companies run a hybrid. I would check current prices on the vendor pages and ask who is on call for the monitoring.</p>', 'A', ['What surprise costs do you look for?', 'What would make you choose Elasticsearch over Loki?']);

  registerModule({
    id: 'devops15',
    title: 'Observability & Monitoring',
    intro: `<p>When something breaks at 3am, the only question that matters is "what is wrong and where?". Observability is how your running system answers that without guessing: <b>metrics</b> tell you something is wrong, <b>traces</b> show which hop is slow, and <b>logs</b> give the exact error. This module teaches the full path with free tools on your own laptop: Prometheus and PromQL, Grafana dashboards, alert rules with Alertmanager, structured and redacted logs in Loki or EFK, OpenTelemetry traces with a Collector, and SLOs with burn-rate alerts.</p>
      <p>Every topic starts from a real incident: a "site is slow" ticket with no metrics, a p99 spike hidden by averages, a <code>user_id</code> label that exploded the time-series database, 3am pages that were not issues, a slow downstream found with a trace, logs missing the request id, and 30 percent of a monthly error budget burned in one hour. The lab is a Docker Compose stack with a small Python app instrumented with prometheus_client and OpenTelemetry. Datadog and New Relic are compared on paper only. All passwords and webhook URLs are placeholders that live in gitignored files.</p>`,
    goals: [
      'Explain metrics, logs and traces, choose between RED, USE and the four golden signals, and follow an alert to its cause across the three signals',
      'Pick the right Prometheus metric type, instrument a Python service with bounded labels, and estimate and prevent label cardinality explosions',
      'Write PromQL with <code>rate</code>, <code>irate</code>, <code>increase</code>, <code>sum by</code> and <code>histogram_quantile</code>, handle counter resets, and use and test recording rules',
      'Build Grafana dashboards that answer questions, provisioned from files, with deploy annotations and links from metrics to traces and logs',
      'Write alert rules with <code>for:</code>, configure Alertmanager routing, grouping, inhibition and silences, and run an on-call rotation with low noise',
      'Produce structured JSON logs with a request id and trace id, redact secrets and personal data, sample safely, and compare Loki with EFK',
      'Trace requests with spans and the W3C <code>traceparent</code> header, find the slow span by self time, and run an OpenTelemetry Collector pipeline with scrubbing and tail sampling, plus exemplars',
      'Define SLIs and SLOs, compute error budgets, and write multi-window multi-burn-rate alerts; compare the open-source stack with Datadog and New Relic'
    ],
    prereqs: `<p><b>Required:</b> <b>Kubernetes Core</b> (DevOps 13): Pods, Services and Deployments, because production Prometheus, Grafana and the OTel Collector run on a cluster and you will recognise what they scrape. <b>Helpful:</b> <b>HLD 12</b> (Reliability &amp; Observability) gave the design ideas of SLIs, SLOs and the three pillars, and <b>Backend 16</b> (Observability &amp; Production Excellence) covered application-level logging, metrics and tracing; this module builds on both with the tools, queries and alert configuration, and does not repeat the theory. You need Docker and Docker Compose on your own machine; no cloud account and no cost.</p>`,
    hours: 20,
    langExplain: `<p>Code in this module is mostly <b>YAML</b> (Prometheus, Alertmanager, Grafana provisioning, the OTel Collector, Docker Compose), <b>Python</b> (the instrumented lab app, structured logging, and the pure calculations that have tests) and <b>bash</b> (setup and runbook commands). <b>PromQL and LogQL</b> have no checker in this site, so those snippets are shown as plain <code>text</code> with checking turned off: run them in your own Prometheus or Loki to verify them. Grafana Alloy configuration is also shown as plain text. Problems that are pure calculations (rate with a counter reset, histogram quantile, error budget, burn rate, availability, cardinality, redaction, traceparent parsing, span self time, alert timing, routing) include a Python solution with tests; configuration problems are verified by reading. Every password and webhook is a placeholder.</p>`,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
