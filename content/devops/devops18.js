(function () {
  var topics = [], practice = [], quiz = [], interview = [];
  var R = String.raw; // raw template: backslashes in shell code stay exactly as typed
  var LAB_LOCAL = '<b>Lab (free, local):</b> needs Docker plus <code>kind</code>, <code>kubectl</code> and <code>helm</code>; about 4 CPUs and 8 GB RAM free. No cloud account and no credentials. Clean up with <code>kind delete cluster --name capstone</code>.';
  var LAB_AWS = '<b>Cost risk (optional AWS variant):</b> EKS control plane (about 0.10 USD/hour), NAT gateway (about 0.045 USD/hour plus data), an ALB (about 0.025 USD/hour plus LCUs) and RDS (instance hours plus storage) all bill while they exist. A forgotten stack costs roughly 150 to 250 USD a month. Create the <b>budget alarm first</b>, tag everything, and run the teardown checklist the same day. All account ids and ARNs are placeholders.';
  var DESIGN = '<b>Design exercise:</b> no cloud account is needed. Any optional cloud step is marked with its cost; account id <code>123456789012</code>, ARNs and emails are placeholders.';
  var SKIP = { skip: 'SRE practice, verified by reading' };
  function fx(s) { return typeof s === 'string' ? s.replace(/~\{/g, '$' + '{') : s; } // write ~{ in code where ${ is needed
  function SH(code, title) { var s = { lang: 'bash', code: fx(code) }; if (title) s.title = title; return s; }
  function YM(code, title) { var s = { lang: 'yaml', code: fx(code) }; if (title) s.title = title; return s; }
  function PY(code, title) { return { lang: 'python', title: title || 'Python (tested)', code: code }; }
  function JS(code, title) { return { lang: 'json', title: title || 'JSON', code: code }; }
  function HC(code, title) { return { lang: 'hcl', check: false, title: title || 'Terraform (HCL)', code: fx(code) }; }
  function TX(code, title) { return { lang: 'text', title: title || 'Text', code: code }; }
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
  function r2(x) { return Math.round(x * 100) / 100; }

  // Small models used by the visualizers (the Python problem answers are written separately and tested).
  function budgetMin(slo, days) { return r2(days * 1440 * (100 - slo) / 100); }

  function policyState(usedPct) { return usedPct >= 100 ? 'FREEZE' : usedPct >= 50 ? 'CAUTION' : 'OK'; }

  // ───────────────────────── Topic 1: SLOs, error budgets, burn rates ─────────────────────────
  topics.push({
    title: 'SLOs, Error Budgets, Burn-Rate Alerts and Budget Policies',
    analogy: `<p>Think of a <b>monthly phone data plan</b>. You are allowed 10 GB. Nobody panics at 3 GB used on day 10. But if you burn 8 GB in the first three days, you slow down, or you will be cut off. An <b>error budget</b> is the same idea for reliability: the SLO says how much failure is allowed, and the budget is the allowance you can spend on risky launches, migrations and experiments. Spend it wisely, and when it is gone, you stop shipping features and fix reliability.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> No service is perfect, and chasing 100% is wasteful: users cannot tell 99.99% from 100% because their own Wi-Fi is worse. So the team agrees a target, the <b>SLO</b>, and the gap between the target and 100% is the <b>error budget</b>.</p>
      ${H.table(['Term', 'Meaning', 'Example'], [
        ['<b>SLI</b> (indicator)', 'a measured ratio: good events / valid events', '% of checkout requests that return non-5xx in under 500 ms'],
        ['<b>SLO</b> (objective)', 'the target for the SLI over a window', '99.9% over 30 days'],
        ['<b>SLA</b> (agreement)', 'a contract with money or credits if missed; looser than the SLO', '99.5% or the customer gets a credit'],
        ['<b>Error budget</b>', '100% - SLO, in time or in events', '0.1% of 30 days = 43.2 minutes, or 1 bad request in 1,000']
      ])}
      <p>🟢 <b>Budget in minutes.</b> A 30-day window has 30 x 24 x 60 = 43,200 minutes. Allowed bad share is 100 - SLO.</p>
      ${H.table(['SLO', 'Budget per 30 days', 'Budget per year'], [['99%', '7 h 12 min (432 min)', '3.65 days'], ['99.5%', '3 h 36 min (216 min)', '1.83 days'], ['99.9%', '43.2 min', '8.76 h'], ['99.95%', '21.6 min', '4.38 h'], ['99.99%', '4.32 min', '52.6 min']])}
      <p>🟢 <b>What the budget is for.</b> It turns an argument ("is this release too risky?") into a number ("we have 30 minutes of budget left, and this migration might cost 10"). Product wants speed, SRE wants stability. The budget is the shared referee.</p>
      <p>🔵 <b>Budget policy</b> is the written rule agreed <em>before</em> the bad day, signed by product and engineering leaders. A typical one:</p>
      ${H.table(['Budget used', 'What happens'], [['under 50%', 'ship normally; experiments and chaos game days welcome'], ['50% to 99%', 'caution: extra review for risky changes, no big-bang releases, postmortem for every budget-eating incident'], ['100% or more', '<b>feature freeze</b>: only reliability work, security fixes and rollbacks ship, until the window recovers or leadership signs an exception'], ['one incident ate over 20% alone', 'a mandatory postmortem with action items that must land']])}
      <p>🔵 <b>Burn rate.</b> Burn rate = (observed error rate) / (allowed error rate). Burn rate 1 means you spend the budget exactly at the end of the window. Burn rate 14.4 means you spend a 30-day budget in 30 / 14.4 = about 2.1 days; it eats 2% of the budget per hour. Alert on burn rate, not on raw error counts:</p>
      ${H.table(['Alert', 'Long window', 'Short window', 'Burn rate', 'Budget spent when it fires', 'Action'], [['fast burn', '1 h', '5 min', '14.4', '2% in 1 h', 'page now'], ['medium burn', '6 h', '30 min', '6', '5% in 6 h', 'page'], ['slow burn', '3 days', '6 h', '1', '10% in 3 days', 'ticket']])}
      <p>The <b>two windows</b> are the trick: the long one shows it matters, the short one shows it is still happening, so the alert stops soon after the fix (no pages for something already solved).</p>
      <p>🔵 <b>Choosing a good SLI.</b> Measure what the user feels: availability (success ratio), latency (share of requests faster than a threshold, never the average), freshness for pipelines, durability for storage. Measure at the edge (load balancer or client), not on the server that may be down. Start with two or three SLIs per service. Set the SLO from user pain and history, then tighten slowly. An SLO nobody has ever missed is probably too loose.</p>`,
    clues: ['"how reliable should it be?" or "how do we decide if we can ship?" &rarr; <b>SLO and error budget</b>', '"99.9% over 30 days" &rarr; budget = 0.1% = <b>43.2 minutes</b> (30 x 1440 x 0.001)', '"alert on a slow leak without paging for blips" &rarr; <b>multi-window burn-rate</b> alerts (14.4 / 6 / 1)', '"the budget is spent, product still wants the launch" &rarr; the <b>budget policy</b> and feature freeze, with an exception route', '"SLA vs SLO" &rarr; SLA is the contract and looser; the SLO is the internal, tighter target', '"average latency is fine but users complain" &rarr; use <b>percentile or threshold SLIs</b>, not the mean'],
    code: [PY(R`# Error budget maths and a burn-rate decision. Standard library only; stable output.
def budget_minutes(slo_pct, window_days):
    """Allowed bad minutes in the window."""
    return window_days * 1440 * (100 - slo_pct) / 100

def burn_rate(bad, total, slo_pct):
    """Observed error rate divided by the allowed error rate."""
    allowed = (100 - slo_pct) / 100
    return (bad / total) / allowed

def decide(r_long, r_short, long_threshold, ticket_threshold=1.0):
    """Both windows must agree before we page; a slower burn only opens a ticket."""
    if r_long >= long_threshold and r_short >= long_threshold:
        return "page"
    if r_long >= ticket_threshold:
        return "ticket"
    return "ok"

print("30-day budget at 99.9%  :", round(budget_minutes(99.9, 30), 2), "min")
print("30-day budget at 99.99% :", round(budget_minutes(99.99, 30), 2), "min")
r1 = burn_rate(150, 10000, 99.9)      # 1.5% errors in the last hour
r5 = burn_rate(60, 3000, 99.9)        # 2.0% errors in the last 5 minutes
print("1h burn:", round(r1, 1), " 5m burn:", round(r5, 1))
print("decision:", decide(r1, r5, 14.4))
print("time to empty a 30-day budget at 14.4x:", round(30 / 14.4, 2), "days")
`, 'Python (runs): budget and burn rate'), YM(R`# Prometheus rules: fast and slow burn alerts for a 99.9% checkout SLO (budget 0.001).
groups:
  - name: checkout-slo
    rules:
      - record: checkout:error_ratio:rate5m
        expr: sum(rate(http_requests_total{job="checkout",code=~"5.."}[5m])) / sum(rate(http_requests_total{job="checkout"}[5m]))
      - record: checkout:error_ratio:rate1h
        expr: sum(rate(http_requests_total{job="checkout",code=~"5.."}[1h])) / sum(rate(http_requests_total{job="checkout"}[1h]))
      - record: checkout:error_ratio:rate6h
        expr: sum(rate(http_requests_total{job="checkout",code=~"5.."}[6h])) / sum(rate(http_requests_total{job="checkout"}[6h]))
      - alert: CheckoutFastBurn
        expr: checkout:error_ratio:rate1h > (14.4 * 0.001) and checkout:error_ratio:rate5m > (14.4 * 0.001)
        for: 2m
        labels: { severity: page }
        annotations:
          summary: "Checkout burns 2% of the monthly error budget per hour"
          runbook_url: https://runbooks.example.com/checkout/fast-burn
      - alert: CheckoutSlowBurn
        expr: checkout:error_ratio:rate6h > (6 * 0.001) and checkout:error_ratio:rate5m > (6 * 0.001)
        for: 15m
        labels: { severity: ticket }
        annotations:
          summary: "Checkout is burning budget about 6x faster than allowed"
`, 'YAML: multi-window burn-rate alerts'), TX(R`ERROR BUDGET POLICY - checkout service (v3, signed by VP Eng and VP Product)
SLO: 99.9% of checkout requests succeed in under 500 ms, rolling 30 days. Budget: 43.2 minutes.

1. Under 50% used  : normal release cadence. Game days and chaos tests allowed.
2. 50% to 99% used : risky changes need a second reviewer and a rollback plan.
                     No big-bang migrations. Every incident over 5 minutes gets a postmortem.
3. 100% or more    : FEATURE FREEZE for checkout. Only rollbacks, security fixes and
                     reliability work ship. Freeze ends when the 30-day rolling budget is positive.
4. One incident over 20% of the budget: postmortem within 5 working days; actions tracked to done.
5. Exceptions      : only by the VP of Product AND VP of Eng together, in writing, with an expiry date.
6. Dependencies    : a dependency outside our control that breaks the SLO is reported to its owner; we still count it.
`, 'Error budget policy (plain text)')],
    codeTitle: ['Python (runs): budget and burn rate', 'YAML: multi-window burn-rate alerts', 'A real budget policy'],
    viz: [{
      title: 'Spend the error budget, outage by outage',
      input: '99.9,30,12,20,15',
      inputLabel: 'SLO %, window days, then outage minutes (up to 6)',
      gen: function (input) {
        var v = nums(input, 'numbers like 99.9,30,12,20,15 (SLO %, window days, outage minutes)', 8);
        if (v.length < 3) throw new Error('Type at least SLO, days and one outage, e.g. 99.9,30,12');
        var slo = v[0], days = v[1], outs = v.slice(2);
        if (slo < 90 || slo >= 100 || days < 1 || days > 90) throw new Error('SLO must be 90 to 99.999 and days 1 to 90');
        var budget = budgetMin(slo, days), f = [], used = 0, i;
        f.push({ narr: 'The window is <b>' + days + ' days = ' + (days * 1440) + ' minutes</b>. The SLO of <b>' + slo + '%</b> allows <b>' + r2(100 - slo) + '%</b> of that to be bad: the error budget.', parts: [{ type: 'vars', label: 'Inputs', vals: { SLO: slo + '%', window: days + ' days', 'allowed bad share': r2(100 - slo) + '%' } }] });
        f.push({ narr: 'Budget in minutes = ' + days + ' x 1440 x ' + r2(100 - slo) + '/100 = <b>' + budget + ' minutes</b>. This is the "data allowance" we can spend on incidents, releases and experiments.', parts: [{ type: 'bars', label: 'Budget left (minutes)', values: [budget], texts: [budget + ' min'], hl: { 0: 'ok' } }] });
        for (i = 0; i < Math.min(outs.length, 6); i++) {
          used += outs[i];
          var pct = r2(used * 100 / budget), st = policyState(pct), left = r2(Math.max(0, budget - used));
          var hl = {}; hl[0] = st === 'FREEZE' ? 'bad' : st === 'CAUTION' ? 'cur' : 'ok';
          f.push({ narr: 'Outage ' + (i + 1) + ': <b>' + outs[i] + ' min</b> of bad service. Total spent <b>' + r2(used) + ' of ' + budget + ' min (' + pct + '%)</b>. Policy state: <b>' + st + '</b>' + (st === 'FREEZE' ? ' &mdash; the budget is gone, so features stop and reliability work starts.' : st === 'CAUTION' ? ' &mdash; more than half is gone, so extra review for risky changes.' : ' &mdash; plenty left, ship normally.'),
            parts: [{ type: 'bars', label: 'Budget left (minutes)', values: [left], texts: [left + ' min left'], hl: hl }, { type: 'table', label: 'Outage log', columns: ['#', 'Minutes', 'Spent so far', '% of budget'], rows: outs.slice(0, i + 1).map(function (o, k) { var s = 0, j; for (j = 0; j <= k; j++) s += outs[j]; return [k + 1, o, r2(s), r2(s * 100 / budget) + '%']; }) }] });
        }
        f.push({ narr: used >= budget ? 'Final: the budget is <b>exhausted</b>. Under the policy, <b>feature freeze</b> starts: only rollbacks, security and reliability work ship until the rolling window recovers. This is the budget doing its job, not a punishment.' : 'Final: <b>' + r2(budget - used) + ' minutes</b> remain. The team may still take risks, but a single big incident could now empty the budget, so plan rollbacks.', parts: [{ type: 'text', label: 'Result', html: '<b>' + policyState(used * 100 / budget) + '</b>: ' + r2(used) + ' / ' + budget + ' minutes spent.' }] });
        return pad4(f, 'Done.');
      }
    }],
    examples: [
      { title: 'Incident: budget exhausted in week 2 of a 4-week quarter', html: `<p>Checkout has a 99.9% SLO (43.2 min per 30 days). A bad database migration caused 31 minutes of errors on day 6, and a CDN misconfiguration caused 18 more on day 12. Total <b>49 minutes</b>, which is 113% of the budget with 18 days still to run.</p><p>The policy applies: <b>feature freeze</b>. The product manager objects, because a launch is due on day 20. The freeze is not about blame. The team lists what would burn budget (the launch includes a schema change) and proposes: ship the launch behind a flag, canary at 1%, and fix the two root causes first. Leadership decides, with the numbers in front of them. Without a budget, this would be a shouting match.</p>` },
      { title: 'Choosing the SLI: why the average hid the pain', html: `<p>A search API reported "average latency 180 ms, all green". Support was flooded with "search is slow". The SLI was wrong: the average mixed fast cached queries with a slow tail. Fixed SLI: <b>share of requests under 400 ms</b>, measured at the load balancer. Result: 96.2% against a 99% target, so the budget was already burning. The team found a slow shard, fixed it, and the SLI went to 99.4%.</p><p>Rule: for latency, use "fraction faster than X" or a high percentile (p95, p99) per user journey, never the mean.</p>` },
      { title: 'Reading a burn-rate page', html: `<p>At 02:10 the pager says <b>CheckoutFastBurn</b>. The 1-hour error ratio is 1.8% and the 5-minute ratio is 2.4%. Budget (0.1%) gives burn rates of 18 and 24, above 14.4. At 18x, a 30-day budget would be gone in 30/18 = 1.7 days, and 2.5% of it is already spent in this one hour. That is a real page, not a blip.</p><p>Compare a 90-second spike: the 5-minute window would be high but the 1-hour window would stay low (for example 0.15%, burn 1.5), so nothing pages. This is the point of two windows.</p>` }
    ],
    deepDive: `<p>🟣 <b>Time-based or event-based?</b> "43.2 minutes" is simple but treats a 3 a.m. minute like a peak minute. Event-based budgets (bad requests / all requests) weight by traffic and are fairer. With 1,000,000 requests a month at 99.9%, the budget is 1,000 bad requests. Use events for services with uneven traffic, and minutes for communication with business people.</p>
      <p>🟣 <b>Rolling vs calendar windows.</b> A calendar month resets the budget on the 1st, which encourages "we are fine, it is a new month" thinking. A <b>rolling 28 or 30 days</b> window recovers gradually and matches how users remember outages. Pick 28 days if you want exactly four weekends in each window.</p>
      <p>🟣 <b>Alert maths.</b> Burn rate B over a window of length w spends B x w / T of the budget (T is the SLO window). So 14.4 x 1 h / 720 h = 2%, and 6 x 6 h / 720 h = 5%, and 1 x 72 h / 720 h = 10%. The thresholds 14.4, 6 and 1 are chosen from these budget-spent targets, not from magic. The short window is usually 1/12 of the long one (5 min for 1 h, 30 min for 6 h).</p>
      <p>🟣 <b>Composite and dependency SLOs.</b> If a service needs three dependencies at 99.9% each in series, the best it can offer is about 99.7%. Your SLO cannot be higher than the product of the critical dependencies, unless you add fallbacks. Say so in the design review, before the launch.</p>
      <p>🟣 <b>Failure modes of the practice.</b> (1) SLO set to 99.999% "because we are important", which makes every alert a page and every release a fight. (2) A budget that is never spent: the team is too cautious, and the SLO should be tightened or velocity should go up. (3) A policy nobody signed: the freeze is ignored the first time it matters. (4) Counting only server-side errors and missing timeouts that never reached the server. (5) Excluding "planned maintenance" so the number looks perfect, while users still saw the site down.</p>`,
    aiEra: `<p>🤖 An assistant can draft Prometheus recording rules and burn-rate alerts in seconds, but check the arithmetic: wrong denominators (all requests vs valid requests), the wrong label for the error code, and thresholds copied for a different SLO are common. Ask it to show the budget maths, then compute 14.4 x (1 - SLO) yourself. AI is also useful for reading a month of incidents and proposing which SLI would have caught them. It cannot decide the SLO for you: that is a business conversation about user pain and cost, so bring the numbers and let the humans sign the policy.</p>`,
    problems: [P({
      t: 'Error budget in minutes from an SLO and a window',
      l: 'Easy', tags: ['SLO', 'error budget'], co: ['Google', 'Datadog'],
      lang: 'python',
      s: `<p>Write <code>error_budget_minutes(slo_pct, window_days)</code> that returns how many minutes of bad service the SLO allows in the window. A day has 1,440 minutes. Return a float.</p>`,
      c: `<ul><li>90 ≤ slo_pct ≤ 100, 1 ≤ window_days ≤ 365.</li><li>${DESIGN}</li></ul>`,
      ex: `<p><code>(99.9, 30)</code> &rarr; <span class="c-g">43.2</span>: 30 x 1440 = 43,200 minutes, and 0.1% of that is 43.2.<br><code>(100, 30)</code> &rarr; <span class="c-r">0</span>: no failure allowed, so no budget.</p>`,
      bw: `<p>"The SLO is 99.9%, so we have about an hour." Guessing is how a team decides a 45-minute outage is fine and learns later it was the whole month. Compute it.</p>`,
      q: ['Which SLO gives the smallest monthly error budget?', ['99.99%', '99.9%', '99.5%', '99%'], 0, '99.99% allows only 4.32 minutes in 30 days. Each extra nine divides the budget by 10.'],
      h: ['Hint 1: first find the total minutes in the window: days x 1440 (a day has 1,440 minutes).', 'Hint 2: allowed bad share = (100 - slo) / 100.', 'Hint 3: multiply them. Return a float; tests compare with a small tolerance.'],
      a: `<p>The window is <code>window_days * 1440</code> minutes, and the allowed bad share is <code>(100 - slo_pct) / 100</code>. Their product is the budget. For 99.99% over 30 days it is 4.32 minutes. Knowing this by heart (43.2 and 4.32) is a good interview habit, since every other number is a multiple.</p>`,
      code: PY(R`def error_budget_minutes(slo_pct, window_days):
    """Minutes of bad service allowed by the SLO in the window."""
    return window_days * 1440 * (100 - slo_pct) / 100`),
      cx: `<p>One multiplication chain, so constant time. The effort is in remembering the anchors: 43.2 min for 99.9% and 4.32 min for 99.99% over 30 days.</p>`,
      f: ['How would you express the same budget in requests for 1,000,000 requests?', 'Why might you choose a rolling window over a calendar month?'],
      tests: { sig: 'double int -> double', fn: 'error_budget_minutes', names: { python: 'error_budget_minutes' }, cmp: 'float', cases: [
        [[99.9, 30], 43.2], [[99.99, 30], 4.32], [[99.0, 30], 432], [[99.5, 7], 50.4], [[100, 30], 0], [[99.95, 28], 20.16], [[99.9, 365], 525.6], [[99.0, 1], 14.4]
      ] }
    })]
  });

  // ───────────────────────── Topic 2: incident response and postmortems ─────────────────────────
  topics.push({
    title: 'Incident Response: Roles, Severity, Timelines and Blameless Postmortems',
    analogy: `<p>A hospital emergency room does not let every doctor shout at the patient at once. One person leads (the <b>trauma lead</b>), one does the hands-on work, one talks to the family, and one writes everything down. Afterwards the team reviews the case to improve the <em>process</em>, not to fire the nurse who was on shift. An incident team works the same way: clear roles during the fire, and a blameless review afterwards.</p>`,
    explain: `<p>🟢 <b>The 2 a.m. problem.</b> It is 02:07. The pager fires: checkout is returning 500s. Five engineers join the call. Three start debugging the same dashboard. Nobody tells the customer support team. The CEO asks in chat "is it fixed?" every minute. Forty minutes later, someone discovers two people already rolled back the same release, and a third rolled forward. This is a <b>role problem</b>, not a skills problem.</p>
      <p>🟢 <b>The three core roles.</b> Small incidents can have one person wearing two hats; a SEV1 should not.</p>
      ${H.table(['Role', 'Job', 'Does not do'], [['<b>Incident Commander (IC)</b>', 'owns the incident: sets the goal, assigns tasks, decides, keeps the call calm, hands off at shift change', 'does not type fixes; stepping into the weeds loses the big picture'], ['<b>Ops lead</b> (a.k.a. tech lead)', 'does the investigation and the changes: rollback, scale up, failover. Asks for extra hands from the IC', 'does not write status updates'], ['<b>Comms lead</b>', 'updates status page, support, execs and customers on a fixed rhythm (every 15 to 30 min); shields the responders from questions', 'does not guess root causes in public'], ['<b>Scribe</b>', 'keeps the timeline: every action with a UTC time and who did it', 'does not debug']])}
      <p>🟢 <b>Severity levels</b> decide how loud the response is. Teams define their own, but a common scale:</p>
      ${H.table(['Level', 'Meaning', 'Response'], [['<b>SEV1</b>', 'major user-facing outage, data loss or security breach; revenue stops', 'page now, 24/7, IC + comms + ops, exec updates every 15-30 min'], ['<b>SEV2</b>', 'big feature broken or many users slow; a workaround may exist', 'page in business and on-call hours, IC named, updates hourly'], ['<b>SEV3</b>', 'minor degradation, few users', 'ticket, fix in working hours'], ['<b>SEV4</b>', 'cosmetic or no user impact', 'backlog']])}
      <p>If you are not sure, <b>declare the higher level</b>; downgrade later. Over-reacting costs an hour. Under-reacting costs the weekend.</p>
      <p>🔵 <b>The loop during an incident.</b> (1) <b>Detect</b>: alert or customer report. (2) <b>Acknowledge</b>: a human says "I have it". (3) <b>Declare</b>: severity, channel, roles. (4) <b>Mitigate first</b>: stop the bleeding with a rollback, a feature flag, a failover or traffic shift. Do not hunt for the root cause while users are down. (5) <b>Resolve</b>: confirm with metrics, not feelings. (6) <b>Review</b>: the postmortem.</p>
      <p>🔵 <b>Time words.</b> TTD (time to detect), TTA (time to acknowledge), TTM (time to mitigate), TTR (time to resolve). <b>MTTR</b> is the mean of resolve times over many incidents; <b>MTBF</b> is the mean time between failures. They are rough health signals, not goals: one huge outlier ruins a mean, so also track medians and the count of SEV1s.</p>
      <p>🔵 <b>A blameless postmortem</b> asks "how did our system let this happen?" and never "who did it?". People make mistakes because the system allowed it: no guardrail, no review, a confusing tool, a missing alert. Blame makes people hide facts, and then the next incident is worse.</p>
      ${H.table(['Section', 'Contains'], [['Summary & impact', 'what users saw, how long, how many, money or SLO budget burned'], ['Timeline', 'UTC times: start, detect, ack, mitigate, resolve; key decisions and why they made sense at the time'], ['Root cause & contributing factors', 'the trigger plus every condition that let it spread; use <b>5 whys</b>, but stop when you reach a fixable system gap'], ['What went well / badly / lucky', 'the lucky list is the most valuable'], ['Action items', 'each one has an <b>owner</b>, a <b>due date</b>, a ticket and a type (prevent, detect, mitigate); no owner means no action']])}
      <p>🔵 <b>5 whys, done well.</b> Problem: checkout down 38 minutes. Why? A config push set the DB pool to 0. Why was it pushed? The template default was wrong for prod. Why not caught? The staging config differs from prod. Why? Configs are copied by hand. Why? No single source of truth. Fix the last one, not "tell Sam to be careful". Real incidents have <b>several</b> branches (contributing factors), so write a tree, not a line.</p>`,
    clues: ['"SEV1 at 2am and everyone is talking at once" &rarr; <b>Incident Commander</b>, comms lead, ops lead, scribe', '"mitigate first, root cause later" &rarr; rollback, flag off, failover, shed load', '"the postmortem blamed Alex" &rarr; rewrite as <b>blameless</b>: system causes, contributing factors, owned actions', '"how do we know incidents are getting better?" &rarr; TTD/TTA/TTM, SEV1 count, repeat-incident rate, not just MTTR', '"same outage again next quarter" &rarr; actions with owners and dates, tracked to done, reviewed in a weekly meeting', '"when to declare an incident?" &rarr; user impact or SLO burn above the threshold; if unsure, declare'],
    code: [PY(R`# Incident timeline maths: what each phase cost. Standard library only.
from datetime import datetime

# minutes since the first bad request, taken from the scribe's log (UTC)
LOG = {
    "started": "02:01", "detected": "02:07", "acknowledged": "02:10",
    "mitigated": "02:41", "resolved": "03:36",
}

def minutes(hhmm):
    t = datetime.strptime(hhmm, "%H:%M")
    return t.hour * 60 + t.minute

t = {k: minutes(v) for k, v in LOG.items()}
print("time to detect      :", t["detected"] - t["started"], "min")
print("time to acknowledge :", t["acknowledged"] - t["detected"], "min")
print("time to mitigate    :", t["mitigated"] - t["detected"], "min (user pain ends here)")
print("user impact         :", t["mitigated"] - t["started"], "min")
print("time to resolve     :", t["resolved"] - t["started"], "min (full recovery)")

# MTTR and MTBF over a quarter of incidents: (start_minute, end_minute) in a 90-day window
incidents = [(1000, 1038), (22000, 22012), (90000, 90100)]
window = 90 * 1440
down = sum(e - s for s, e in incidents)
print("MTTR:", down // len(incidents), "min   MTBF:", (window - down) // len(incidents), "min")
`, 'Python (runs): timeline durations, MTTR and MTBF'), TX(R`INCIDENT KICKOFF (paste into the incident channel)
[SEV1] Checkout returns 500 for ~40% of requests. Declared 02:10 UTC by <name>.
IC: <name>      Ops lead: <name>      Comms: <name>      Scribe: <name>
Goal: restore checkout success rate above 99% (mitigate first, root cause later).
Bridge: <video link>    Doc: <timeline doc link>    Status page: investigating (posted 02:12)
Next update: 02:30 UTC and every 20 min after.

IC CHECK-IN QUESTIONS (every 10 minutes)
1. What do we know for sure? (graphs, not guesses)
2. What changed in the last hour? (deploys, flags, config, traffic, cloud events)
3. What is our fastest safe mitigation? Who owns it? ETA?
4. Do we need more people, or fewer? Is anyone about to burn out?
5. What do we tell customers and support in the next update?
`, 'Kickoff message and IC check-ins'), TX(R`POSTMORTEM: Checkout 500s, 2026-03-14 (SEV1)         Status: reviewed        Owner: <name>
Impact: 40% of checkout requests failed for 40 min (02:01-02:41). ~3,100 orders delayed. 93% of the 30-day error budget used.
Timeline (UTC): 02:01 config push -> 02:07 alert -> 02:10 ack -> 02:25 suspected DB -> 02:41 rollback done -> 03:36 backlog drained.
Root cause: a config template set pool_size=0 for prod; no validation rejected it.
Contributing factors:
  - staging and prod configs are copied by hand (no single source of truth)
  - the canary stage did not run on config-only changes
  - the dashboard showed app errors but not DB pool saturation, so triage took 15 min
  - IC role unclear for the first 10 min; two people rolled back
What went well: alert fired in 6 min; rollback tool worked; comms were on a clear rhythm.
Where we got lucky: the push happened at night, with low traffic.
Action items (owner, due):  A1 schema-validate configs in CI (Priya, 04-04)  A2 canary config changes (Omar, 04-18)
  A3 add pool-saturation panel + alert (Lena, 03-28)  A4 IC training + role cards in runbook (Sam, 04-11)
`, 'Blameless postmortem (condensed example)')],
    codeTitle: ['Python (runs): timeline durations, MTTR and MTBF', 'Incident kickoff message and IC check-ins', 'A blameless postmortem'],
    viz: [{
      title: 'One incident, phase by phase',
      input: '0,6,9,41,95',
      inputLabel: 'minutes: started, detected, acknowledged, mitigated, resolved',
      gen: function (input) {
        var t = nums(input, 'five increasing numbers like 0,6,9,41,95', 5);
        if (t.length !== 5) throw new Error('Type five numbers: started, detected, acknowledged, mitigated, resolved');
        for (var i = 1; i < 5; i++) if (t[i] < t[i - 1]) throw new Error('Numbers must not decrease');
        var names = ['Started', 'Detected', 'Acknowledged', 'Mitigated', 'Resolved'];
        var d = [t[1] - t[0], t[2] - t[1], t[3] - t[1], t[4] - t[0]];
        function tl(n) { var rows = []; for (var k = 0; k < n; k++) rows.push([names[k], 'T+' + t[k] + ' min']); return { type: 'table', label: 'Scribe timeline', columns: ['Event', 'Time'], rows: rows }; }
        var f = [];
        f.push({ narr: 'The bad requests start at <b>T+' + t[0] + '</b>. Nobody knows yet. Users already feel it. The scribe will rebuild this timeline later from logs and chat.', parts: [tl(1)] });
        f.push({ narr: 'An alert fires at <b>T+' + t[1] + '</b>. <b>Time to detect = ' + d[0] + ' min.</b> This phase is about your monitoring: a better SLO burn alert shortens it.', parts: [tl(2), { type: 'vars', label: 'So far', vals: { TTD: d[0] + ' min' }, hl: { TTD: 'cur' } }] });
        f.push({ narr: 'A human acknowledges at <b>T+' + t[2] + '</b>. <b>Time to acknowledge = ' + d[1] + ' min.</b> This is on-call health: routing, escalation and fatigue. The IC is named and roles are assigned now.', parts: [tl(3), { type: 'vars', label: 'So far', vals: { TTD: d[0] + ' min', TTA: d[1] + ' min' }, hl: { TTA: 'cur' } }] });
        f.push({ narr: 'Rollback or failover completes at <b>T+' + t[3] + '</b>. <b>Time to mitigate = ' + d[2] + ' min</b> after detection. User impact lasted <b>' + (t[3] - t[0]) + ' min</b> in total. This phase depends on runbooks, rollback speed and the IC keeping people on mitigation.', parts: [tl(4), { type: 'vars', label: 'So far', vals: { TTD: d[0] + ' min', TTA: d[1] + ' min', TTM: d[2] + ' min', 'user impact': (t[3] - t[0]) + ' min' }, hl: { TTM: 'ok' } }] });
        f.push({ narr: 'Fully resolved (backlog drained, cause fixed, all-clear) at <b>T+' + t[4] + '</b>. <b>Time to resolve = ' + d[3] + ' min.</b> The incident ends here; the <b>postmortem</b> begins, with owners and dates for each action.', parts: [tl(5), { type: 'table', label: 'Phases', columns: ['Phase', 'Minutes', 'What improves it'], rows: [['Detect', d[0], 'SLO burn alerts, synthetic checks'], ['Acknowledge', d[1], 'paging, escalation, rested on-call'], ['Mitigate', d[2], 'runbooks, safe rollback, IC discipline'], ['Resolve', d[3], 'root-cause fix, backlog tooling']] }] });
        return f;
      }
    }],
    examples: [
      { title: 'SEV1 at 02:07: the call with five voices', html: `<p>Alerts fire for checkout. Six people join. The first on call starts rolling back; another starts scaling the database; a third pings the CEO in a DM. After 12 minutes, the checkout error rate is <em>worse</em>, because the rollback and the scale-up fight each other.</p><p><b>What a good IC does in the first two minutes:</b> (1) says "I am IC" in the channel; (2) names the ops lead and the comms lead; (3) freezes changes: "no one changes anything without telling me"; (4) asks "what changed in the last hour?". Within 5 minutes the team sees a config push at 02:01, rolls back once, and the error rate drops. The IC never touched a keyboard.</p>` },
      { title: 'The postmortem that blamed a person', html: `<p><b>Draft:</b> "Root cause: Jordan pushed a bad config without testing." Action item: "Jordan to be more careful." Every engineer who read it learned one thing: do not be the one to push.</p><p><b>Rewrite (blameless):</b> "A config change with pool_size=0 passed review because reviewers only see a diff of the template, and was applied to prod because no validation or canary applies to config-only changes. Staging differs from prod, so testing there would not have caught it." <b>Actions:</b> schema-validate configs (Priya, 04-04); canary config changes (Omar, 04-18); render the full effective config in the PR (Lena, 04-11). Jordan is invited to present, because they know the most.</p>` },
      { title: 'Two incidents, one number: why MTTR misleads', html: `<p>Last quarter: 9 incidents of 10 to 20 minutes and one of 6 hours. Mean time to resolve = (9 x 15 + 360) / 10 = <b>49.5 minutes</b>, which says "bad", though 9 of 10 were fine. The median is 15 minutes, which says "good", though the 6-hour one was a disaster. Report <b>both</b>, plus the SEV1 count and the repeat rate. Then read the long incident: it is where the learning is.</p>` }
    ],
    deepDive: `<p>🟣 <b>Incident command is a learned skill.</b> It comes from fire services (ICS) and was adopted by Google, PagerDuty and others. Key rules: one voice of command; hand off explicitly ("I hand IC to Mia, Mia confirm"); rotate responders after 2 to 4 hours to avoid fatigue; separate communication from debugging. Practise with <b>Wheel of Misfortune</b> exercises, where the IC walks through a past outage with a "game master" feeding facts.</p>
      <p>🟣 <b>Mitigate before you understand.</b> Good mitigations are cheap and reversible: rollback, disable a flag, shift traffic away from a bad region or zone, scale up, shed load, restart as a last resort. Keep a "known good" button for each. A trap is to keep the broken state "for debugging" while users wait; take logs, heap dumps and a snapshot, then restore service.</p>
      <p>🟣 <b>Postmortem quality.</b> Good ones separate <b>trigger</b> (the push) from <b>latent conditions</b> (no validation, no canary, missing alert). They record decisions with the information available then (hindsight bias makes everything look obvious). They end with a small number of high-value actions (3 to 6) of three types: <b>prevent</b>, <b>detect</b> faster, <b>mitigate</b> faster. A postmortem with 25 actions will not be finished. Track completion publicly and review overdue items weekly.</p>
      <p>🟣 <b>Customer communication.</b> The status page post is short and factual: what is affected, since when, what we are doing, when the next update comes. No blame, no guessing the cause until confirmed, no "all clear" until metrics agree. Internal updates add the technical detail. Regulated incidents (data breach) add legal and security roles and strict notification clocks (for example 72 hours under GDPR); those go through the security incident process.</p>
      <p>🟣 <b>Metrics traps.</b> MTTR hides the distribution; MTBF assumes failures are comparable. Do not set MTTR as a target (people will close tickets early). Track <b>incident count by cause class</b> (change, capacity, dependency, config, unknown) to see what to invest in. Roughly two thirds of outages follow a change, which is why rollback speed and canaries pay back first.</p>`,
    aiEra: `<p>🤖 AI helps most <b>after</b> the fire: summarising a 3,000-line incident channel into a timeline, drafting the postmortem skeleton, finding similar past incidents, and turning chat into action items. During the fire, use it as a second pair of eyes (ask it to explain an unfamiliar stack trace), never as the commander. Two cautions: timelines built from chat summaries can invent a plausible but wrong order, so verify against logs and metrics; and AI-written postmortems tend to land on a neat single "root cause" and a person-shaped lesson. Insist on contributing factors and system fixes, with real owners.</p>`,
    problems: [P({
      t: 'Incident timeline: detect, acknowledge, mitigate, resolve',
      l: 'Easy', tags: ['incident', 'timeline', 'MTTR'], co: ['PagerDuty', 'Atlassian'],
      lang: 'python',
      s: `<p>The scribe records five times in minutes from the first bad request: <code>[started, detected, acknowledged, mitigated, resolved]</code>. Write <code>incident_durations(t)</code> returning four integers <code>[detect, ack, mitigate, resolve]</code> where <b>detect</b> = detected - started, <b>ack</b> = acknowledged - detected, <b>mitigate</b> = mitigated - detected, and <b>resolve</b> = resolved - started.</p>`,
      c: `<ul><li>t has exactly 5 non-decreasing integers.</li><li>${DESIGN}</li></ul>`,
      ex: `<p><code>[0, 6, 9, 40, 95]</code> &rarr; <span class="c-g">[6, 3, 34, 95]</span>: detected after 6 min, acknowledged 3 min later, mitigated 34 min after detection, fully resolved at 95.</p>`,
      bw: `<p>Reporting only "the incident lasted 95 minutes". It hides that detection took 6 minutes (monitoring) and mitigation 34 (runbooks), which need different fixes.</p>`,
      q: ['A long gap between "started" and "detected" points mostly to what?', ['Monitoring and alerting', 'On-call fatigue', 'Slow rollbacks', 'Weak postmortems'], 0, 'Detection is about what the alerts can see. Acknowledge is on-call health; mitigate is runbooks and rollback tooling.'],
      h: ['Hint 1: each answer is a difference of two list items.', 'Hint 2: mitigate is measured from detection, not from the start.', 'Hint 3: return a list of four ints in the stated order.'],
      a: `<p>Index the list as started=t[0], detected=t[1], acknowledged=t[2], mitigated=t[3], resolved=t[4] and return the four differences. Splitting the timeline makes each phase a separate improvement project: alerts, paging, runbooks, root-cause fixes.</p>`,
      code: PY(R`def incident_durations(t):
    """[detect, ack, mitigate, resolve] in minutes from [started, detected, acked, mitigated, resolved]."""
    started, detected, acked, mitigated, resolved = t
    return [detected - started, acked - detected, mitigated - detected, resolved - started]`),
      cx: `<p>Four subtractions, constant time. The real effort is collecting accurate timestamps; the scribe's log is the input that matters.</p>`,
      f: ['Why might "time to mitigate" matter more to users than "time to resolve"?', 'What would you add to catch a 30-minute detection gap?'],
      tests: { sig: 'int[] -> int[]', fn: 'incident_durations', names: { python: 'incident_durations' }, cases: [
        [[[0, 6, 9, 40, 95]], [6, 3, 34, 95]], [[[10, 10, 11, 12, 30]], [0, 1, 2, 20]], [[[100, 130, 135, 200, 260]], [30, 5, 70, 160]],
        [[[0, 1, 2, 3, 4]], [1, 1, 2, 4]], [[[5, 5, 5, 5, 5]], [0, 0, 0, 0]], [[[0, 120, 125, 180, 1440]], [120, 5, 60, 1440]], [[[7, 9, 9, 15, 15]], [2, 0, 6, 8]]
      ] }
    })]
  });

  // ───────────────────────── Topic 3: capacity planning ─────────────────────────
  topics.push({
    title: 'Capacity Planning: Headroom, Load Testing, Little\'s Law and Queueing Intuition',
    analogy: `<p>A supermarket with 10 checkout lanes is fine at 5 customers a minute. At 9.5 customers a minute it is still "working", yet queues snake to the frozen aisle. Nobody was slow; the lanes were just almost full. Capacity planning is deciding <b>how many lanes to open before Black Friday</b>, by measuring how fast a lane works, how many customers will come, and how much empty space you want left over for surprises.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> Capacity planning answers: "Will we have enough compute, database and network for the load we expect, plus a safety margin, and what will it cost?" You do it before the peak, not during it.</p>
      <p>🟢 <b>Five steps.</b></p>
      <ol><li><b>Forecast demand</b>: last year's peak x growth x event multiplier (Black Friday may be 5 to 10 times a normal day). Ask marketing for campaign dates.</li><li><b>Measure one unit</b>: how many requests per second one instance handles at an acceptable latency. Use a load test, not a guess.</li><li><b>Add headroom</b>: never plan to run at 100%. Typical targets are 50 to 70% CPU at peak, so there is room for spikes, deploys and failures.</li><li><b>Survive failure</b>: size for N+1 (one instance can die) or for the loss of a whole zone (N+1 zone).</li><li><b>Check every layer</b>: app, database connections, cache, queues, third-party rate limits, NAT and load-balancer limits, cloud quotas. The tightest layer sets the real capacity.</li></ol>
      <p>🟢 <b>A worked example.</b> Peak forecast 1,000 requests per second (rps). One instance handles 100 rps at good latency. With 30% headroom: 1,000 x 1.3 / 100 = 13 instances. Spread over 3 zones and survive losing a zone: each zone needs enough that the other two carry the load, so 7 per zone = 21 total. The "survive a zone" rule is why a 13-instance plan became 21. Say that number out loud in the interview.</p>
      <p>🔵 <b>Little's law</b> links three things you can measure: <b>L = λ x W</b>. L is the average number of requests in the system at once (concurrency), λ is the arrival rate, W is the average time each request spends in the system. If 200 requests arrive every second and each takes 250 ms (0.25 s), there are 200 x 0.25 = <b>50 requests in flight</b> on average. If each worker handles 10 at a time you need at least 5 workers, before headroom. It works for any stable system: threads, DB connections, queues, even people in a café.</p>
      <p>🔵 <b>Queueing intuition: latency explodes near full.</b> For a simple single queue, average waiting time grows like 1 / (1 - utilisation). At 50% busy, a request takes 2x its bare service time. At 80%, 5x. At 90%, 10x. At 95%, 20x. At 99%, 100x. That is why headroom is not waste: running hot makes every request slow before you actually run out. It also explains why a tiny extra load tips a system over a cliff.</p>
      <p>🔵 <b>Load testing.</b> Four kinds: <b>smoke</b> (does the test even work), <b>load</b> (expected peak), <b>stress</b> (push past peak to find the breaking point and see how it fails), <b>soak</b> (hours at steady load to find leaks). Tools: <b>k6</b> (scripts in JavaScript, good in CI), <b>Locust</b> (scripts in Python), JMeter, Gatling. Rules: test a production-like environment with production-like data size; ramp up in stages; watch p95/p99 latency, error rate, CPU, memory, DB connections and queue depth; find the knee where latency bends up; and never point a test at production without a plan and a stop button.</p>
      <p>🔵 <b>Scaling choices.</b> Vertical (bigger machine), horizontal (more machines, behind a load balancer), autoscaling (Kubernetes HPA, ASG target tracking), and scheduled scaling for known events. Autoscaling reacts in minutes, but a spike can arrive in seconds, so <b>pre-warm</b> before a known peak. Also check cloud <b>service quotas</b>, which are a classic hidden limit.</p>`,
    clues: ['"Black Friday is in 6 weeks, are we ready?" &rarr; forecast, load test, headroom, pre-scale, quota check', '"how many instances do we need?" &rarr; peak rps x (1 + headroom) / rps per instance, then N+1 or zone loss', '"how many connections or threads?" &rarr; <b>Little\'s law</b>: concurrency = rate x latency', '"it was fine at 70% CPU, dead at 95%" &rarr; <b>queueing</b>: latency grows like 1/(1-utilisation)', '"autoscaling was too slow for the flash sale" &rarr; pre-warm, scheduled scaling, over-provision a buffer', '"which tool for load testing in CI?" &rarr; <b>k6</b> (JS) or <b>Locust</b> (Python) with thresholds that fail the build'],
    code: [PY(R`# Capacity maths: Little's law and instances needed with headroom and zone-loss safety.
import math

def concurrency(rate_per_s, latency_ms):
    """Little's law: L = lambda x W (average requests in flight)."""
    return rate_per_s * latency_ms / 1000

def instances_needed(peak_rps, per_instance_rps, headroom_pct, zones):
    """Smallest total so that losing one zone still carries peak + headroom."""
    base = max(1, math.ceil(peak_rps * (100 + headroom_pct) / (100 * per_instance_rps)))
    if zones < 2:
        return base
    per_zone = math.ceil(base / (zones - 1))      # the surviving zones must carry the whole load
    return per_zone * zones

def wait_multiplier(utilisation):
    """Single-queue intuition: time in system grows like 1 / (1 - rho)."""
    return 1 / (1 - utilisation)

print("in flight at 200 rps, 250 ms:", concurrency(200, 250))
print("instances for 1000 rps, 100 rps each, 30% headroom, 3 zones:", instances_needed(1000, 100, 30, 3))
for rho in (0.5, 0.8, 0.9, 0.95):
    print("utilisation", rho, "-> latency x", round(wait_multiplier(rho), 1))
`, 'Python (runs): Little\'s law, headroom and queueing'), { lang: 'js', check: false, title: 'k6: staged load test with pass/fail thresholds', code: R`import http from 'k6/http';
import { check, sleep } from 'k6';

// Ramp to the forecast peak, hold, ramp down. The test FAILS the CI job if a threshold is broken.
export const options = {
  stages: [
    { duration: '2m', target: 100 },   // warm up
    { duration: '5m', target: 500 },   // approach expected peak (virtual users)
    { duration: '10m', target: 500 },  // hold the peak
    { duration: '2m', target: 0 },     // ramp down
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],     // under 1% errors
    http_req_duration: ['p(95)<400'],   // 95% of requests faster than 400 ms
  },
};

export default function () {
  const res = http.get(__ENV.BASE_URL + '/api/products');   // BASE_URL is passed in, never hardcoded
  check(res, { 'status is 200': (r) => r.status === 200 });
  sleep(1);                                                  // think time between user actions
}
` }, { lang: 'python', check: true, title: 'Locust: the same idea in Python', code: R`from locust import HttpUser, task, between


class Shopper(HttpUser):
    wait_time = between(1, 3)          # think time in seconds

    @task(5)
    def browse(self):
        self.client.get("/api/products")

    @task(1)
    def checkout(self):
        self.client.post("/api/checkout", json={"cart_id": "test-cart", "payment": "test-token"})

# run: locust -f locustfile.py --host https://staging.example.com --users 500 --spawn-rate 10 --headless -t 10m
` }, SH(R`# Run k6 in CI (needs the k6 binary or the grafana/k6 image). No secrets in the script.
set -euo pipefail
BASE_URL="https://staging.example.com" k6 run --summary-export=summary.json load-test.js
# Fail the build if p95 is over budget even when k6 itself passed (belt and braces).
p95=$(python3 -c "import json;print(json.load(open('summary.json'))['metrics']['http_req_duration']['p(95)'])")
echo "p95 = $p95 ms"
awk -v v="$p95" 'BEGIN { exit (v < 400) ? 0 : 1 }'
`, 'Bash: k6 in a pipeline')],
    codeTitle: ['Python (runs): Little\'s law, headroom and queueing', 'k6: staged load test with pass/fail thresholds', 'Locust: the same idea in Python', 'Bash: k6 in a pipeline'],
    viz: [{
      title: 'Why headroom matters: latency vs utilisation',
      input: '90',
      inputLabel: 'utilisation percent to highlight (1 to 99)',
      gen: function (input) {
        var v = nums(input, 'one number from 1 to 99', 1)[0];
        if (v < 1 || v > 99) throw new Error('Use a number from 1 to 99');
        var pts = [10, 30, 50, 70, 80, 90, 95, 99], f = [], i;
        function mult(u) { return r2(1 / (1 - u / 100)); }
        f.push({ narr: 'A service has a bare time of <b>100 ms</b> per request. When it is idle you see 100 ms. As the machine fills up, requests wait for each other. Rule of thumb for one queue: time in system = bare time x <code>1 / (1 - utilisation)</code>.', parts: [{ type: 'vars', label: 'Model', vals: { 'bare time': '100 ms', formula: '1 / (1 - u)' } }] });
        for (i = 0; i < pts.length; i++) if (pts[i] === 10 || pts[i] === 50 || pts[i] === 80 || pts[i] === 95) {
          var sub = pts.filter(function (p) { return p <= pts[i]; });
          f.push({ narr: 'At <b>' + pts[i] + '%</b> busy a request takes about <b>' + mult(pts[i]) + 'x</b> its bare time = <b>' + Math.round(100 * mult(pts[i])) + ' ms</b>.' + (pts[i] >= 80 ? ' The curve is bending up: small extra load now means big extra latency.' : ''), parts: [{ type: 'bars', label: 'Latency multiplier (x bare time)', values: sub.map(mult), texts: sub.map(function (p) { return p + '%: ' + mult(p) + 'x'; }), hl: one1(sub.length - 1, pts[i] >= 80 ? 'bad' : 'ok') }] });
        }
        f.push({ narr: 'Your chosen <b>' + v + '%</b> gives <b>' + mult(v) + 'x</b> = <b>' + Math.round(100 * mult(v)) + ' ms</b> average. A p99 is usually much worse than the average. This is why plans target 50 to 70% at peak: the empty space is what keeps latency flat.', parts: [{ type: 'table', label: 'Latency by utilisation', columns: ['Utilisation', 'Multiplier', 'Time for a 100 ms request'], rows: pts.concat([v]).sort(function (a, b) { return a - b; }).filter(function (x, k, arr) { return arr.indexOf(x) === k; }).map(function (p) { return [p + '%', mult(p) + 'x', Math.round(100 * mult(p)) + ' ms']; }), hl: one1(0, 'sel') }] });
        return f;
      }
    }, {
      title: 'Size a fleet: Little\'s law, headroom, zone loss',
      input: '1000,100,30,3',
      inputLabel: 'peak rps, rps per instance, headroom %, zones',
      gen: function (input) {
        var v = nums(input, 'four numbers like 1000,100,30,3', 4);
        if (v.length !== 4 || v[0] < 1 || v[1] < 1 || v[2] < 0 || v[3] < 1 || v[3] > 6) throw new Error('Type peak rps, rps per instance, headroom %, zones (1 to 6)');
        var peak = v[0], per = v[1], h = v[2], z = Math.round(v[3]), f = [];
        var need = peak * (100 + h) / 100, base = Math.max(1, Math.ceil(need / per)), pz = z < 2 ? base : Math.ceil(base / (z - 1)), tot = z < 2 ? base : pz * z;
        f.push({ narr: 'Forecast peak: <b>' + peak + ' rps</b>. One instance serves <b>' + per + ' rps</b> at good latency (from a load test). Headroom wanted: <b>' + h + '%</b>.', parts: [{ type: 'vars', label: 'Inputs', vals: { peak: peak + ' rps', 'per instance': per + ' rps', headroom: h + '%', zones: z } }] });
        f.push({ narr: 'Plan for peak plus headroom: ' + peak + ' x ' + (100 + h) + '/100 = <b>' + r2(need) + ' rps</b>.', parts: [{ type: 'vars', label: 'Target', vals: { 'plan for': r2(need) + ' rps' }, hl: { 'plan for': 'cur' } }] });
        f.push({ narr: 'Instances = ceil(' + r2(need) + ' / ' + per + ') = <b>' + base + '</b> to carry the load when everything is healthy.', parts: [{ type: 'array', label: 'Instances (healthy)', values: new Array(Math.min(base, 24)).fill('i'), hl: {} }] });
        f.push({ narr: z < 2 ? 'One zone only, so there is no zone-loss rule. Total <b>' + base + '</b>. Note the risk: a zone outage takes the whole service.' : 'Now survive losing one of ' + z + ' zones. The remaining ' + (z - 1) + ' zones must carry all ' + base + ' instances\' worth of work, so each zone needs ceil(' + base + ' / ' + (z - 1) + ') = <b>' + pz + '</b>. Total = ' + pz + ' x ' + z + ' = <b>' + tot + '</b>.', parts: [{ type: 'table', label: 'Plan', columns: ['Zones', 'Per zone', 'Total', 'After losing a zone'], rows: [[z, pz, tot, z < 2 ? 'outage' : (pz * (z - 1)) + ' instances (needs ' + base + ')']] }] });
        var conc = r2(peak * 0.25);
        f.push({ narr: 'Cross-check with Little\'s law: at ' + peak + ' rps and 250 ms per request, about <b>' + conc + '</b> requests are in flight. If your pool allows 25 connections per instance, you need at least ' + Math.ceil(conc / 25) + ' instances for connections alone. The tighter of CPU and connections wins.', parts: [{ type: 'vars', label: 'Little: L = rate x time', vals: { L: conc, 'min by connections': Math.ceil(conc / 25), 'plan': tot } }] });
        return f;
      }
    }],
    examples: [
      { title: 'Black Friday: the quotas nobody checked', html: `<p>A shop forecast 8x normal traffic. The app tier was load-tested and pre-scaled from 12 to 96 instances. At 09:03 on the day, scaling stopped at 64: the account's <b>EC2 vCPU quota</b> was reached. Orders slowed. A support case raised the quota in 40 minutes, but the peak had passed.</p><p><b>Lesson:</b> the capacity checklist must include quotas (vCPU, ENIs, Elastic IPs, ALB targets, RDS connections), third-party limits (payment API rate limit), and a "request increases two weeks early" step. Test the full path, not only the app.</p>` },
      { title: 'Little\'s law finds the connection-pool bug', html: `<p>A service handles 400 rps; the database call takes 120 ms. In flight: 400 x 0.12 = <b>48</b> DB calls. The pool had 20 connections per pod with 2 pods = 40. Requests queued for a connection, so latency rose even though the CPU was only 35%. Raising the pool to 40 per pod (checking the database <code>max_connections</code> first) removed the queue. The CPU graph looked healthy because the bottleneck was a pool, not compute.</p>` },
      { title: 'Stress test shows how it fails', html: `<p>A load test ramps users until errors appear. At 700 rps latency bends, at 820 rps the error rate hits 5%, and past 900 rps the pods restart (out of memory), which makes things worse. Findings: (1) the safe peak is about 600 rps (70% of the knee); (2) add a memory limit that matches the heap; (3) add <b>load shedding</b> (return 429 early) so overload fails fast instead of cascading. Record the numbers in the capacity doc and re-run the test after big releases.</p>` }
    ],
    deepDive: `<p>🟣 <b>Percentiles and averages.</b> Little's law uses averages; queueing waits have long tails, so size for p95/p99 by testing, not by formula alone. The 1 / (1 - ρ) rule is exact only for the simplest M/M/1 queue (random arrivals, exponential service). Real systems with variable job sizes are worse; with many servers sharing one queue (M/M/c) they are better at the same utilisation, which is why one big pool beats many small ones.</p>
      <p>🟣 <b>Open vs closed load models.</b> A closed test (fixed number of virtual users who wait for each response) slows its own arrival rate when the server slows down, hiding collapse ("coordinated omission"). An open model (fixed arrival rate, as k6's <code>constant-arrival-rate</code> executor) keeps hammering at the planned rate, like real users. Use arrival-rate executors to find true capacity.</p>
      <p>🟣 <b>Where the real limits hide.</b> Databases (connections, IOPS, lock contention), single-threaded hot spots, NAT gateway bandwidth and port exhaustion, load balancer pre-warming for sudden jumps, DNS and TLS handshake cost, Kubernetes node pod-IP limits, Kafka partitions, disk fill from logs, and third-party APIs. Find them with a stress test that watches all layers, not only the app.</p>
      <p>🟣 <b>Forecasting.</b> Use at least 12 months of peak data, and plan for seasonality and launches. Add organic growth (say 5% a month) and event multipliers. Revisit quarterly. Keep a "headroom ledger": current peak, capacity, utilisation, date you run out at current growth. If you will run out inside the lead time for procurement or quota requests, act now.</p>
      <p>🟣 <b>Cost balance.</b> Headroom costs money. Use autoscaling for the variable part, Savings Plans or reserved capacity for the steady base, and scheduled pre-scaling before known events. Buying 30% headroom for a 99.9% SLO is usually cheaper than one hour of outage. Compare to the revenue per minute, not the instance price.</p>`,
    aiEra: `<p>🤖 AI is useful for writing k6 or Locust scripts from an OpenAPI spec, fitting a growth curve to your traffic history, and turning a load-test report into a summary. Be careful: generated scripts often use a closed model, hard-code a URL, or forget think time, which gives numbers that look great and mean nothing. Ask it to use an arrival-rate executor, set thresholds, and parameterise the host. Forecast numbers from a model are a starting point; confirm them with marketing's real calendar and with a test on production-sized data.</p>`,
    problems: [P({
      t: 'Concurrency from request rate and latency (Little\'s law)',
      l: 'Easy', tags: ['Little\'s law', 'capacity'], co: ['Netflix', 'Cloudflare'],
      lang: 'python',
      s: `<p>Write <code>concurrency(rate_per_s, latency_ms)</code> that returns the average number of requests in flight, as a float, using Little's law (L = λ x W). Latency is given in milliseconds.</p>`,
      c: `<ul><li>0 ≤ rate_per_s ≤ 100,000; 0 ≤ latency_ms ≤ 60,000.</li><li>${DESIGN}</li></ul>`,
      ex: `<p><code>(200, 250)</code> &rarr; <span class="c-g">50.0</span>: 200 per second x 0.25 s each = 50 in flight. With 10 slots per worker you need at least 5 workers.</p>`,
      bw: `<p>Sizing a connection pool by "it feels like 10 is enough". When the database slows to 500 ms, the in-flight count rises five times with no change in traffic, and the pool starves.</p>`,
      q: ['Traffic is steady at 100 rps. A dependency slows from 50 ms to 500 ms. What happens to in-flight requests?', ['They grow about 10x (5 to 50)', 'They stay the same', 'They fall to 1/10', 'They double'], 0, 'L = λ x W. Same λ, ten times W gives ten times L. Slow dependencies exhaust pools.'],
      h: ['Hint 1: convert milliseconds to seconds first.', 'Hint 2: multiply rate by latency in seconds.', 'Hint 3: return a float; zero rate or zero latency gives 0.'],
      a: `<p>L = λ x W. Convert W to seconds (<code>latency_ms / 1000</code>) and multiply by the rate. The result is the average number of requests being served at the same moment, which tells you how many threads, connections or workers you need before headroom.</p>`,
      code: PY(R`def concurrency(rate_per_s, latency_ms):
    """Little's law: average requests in flight."""
    return rate_per_s * latency_ms / 1000`),
      cx: `<p>One multiplication and one division, constant time. Measuring the true average latency is the hard part, not computing the answer.</p>`,
      f: ['How does the answer change if the latency distribution has a long tail?', 'How would you use it to size a database connection pool?'],
      tests: { sig: 'double int -> double', fn: 'concurrency', names: { python: 'concurrency' }, cmp: 'float', cases: [
        [[200, 250], 50], [[1000, 100], 100], [[0.5, 2000], 1], [[50, 0], 0], [[1200, 45], 54], [[10, 1500], 15], [[333, 300], 99.9], [[0, 500], 0]
      ] }
    })]
  });

  // ───────────────────────── Topic 4: toil ─────────────────────────
  topics.push({
    title: 'Toil: Defining, Measuring and Automating It Away (Automation ROI)',
    analogy: `<p>Imagine a restaurant where every evening a cook walks to the well, carries water in buckets, and returns. It is real work, and it must be done, but it never gets better and it grows with the number of customers. <b>Toil</b> is the bucket-carrying of operations. The fix is not to hire more carriers; it is to lay a pipe. Laying the pipe costs a few days, then it pays you back every day.</p>`,
    explain: `<p>🟢 <b>What counts as toil.</b> The Google SRE definition: work that is <b>manual</b>, <b>repetitive</b>, <b>automatable</b>, <b>tactical</b> (interrupt-driven, reactive), has <b>no enduring value</b>, and <b>scales linearly</b> with service growth. If a robot could do it and doing it leaves the system no better, it is toil.</p>
      ${H.table(['Task', 'Toil?', 'Why'], [['Manually resetting a stuck queue every morning', 'Yes', 'repetitive, manual, tactical, nothing improves'], ['Hand-approving 40 access requests a week by editing a file', 'Yes', 'automatable (self-service + policy)'], ['Writing a postmortem', 'No', 'creative, produces learning (enduring value)'], ['Designing the capacity plan for Black Friday', 'No', 'engineering judgment, done once per event'], ['Restarting a pod after a leak (until fixed)', 'Yes, plus a bug', 'toil that hides a defect: fix the leak'], ['On-call: investigating a novel outage', 'No', 'new, thoughtful work (though painful)'], ['Overhead: meetings, HR, planning', 'No (overhead)', 'not toil, not engineering either']])}
      <p>🟢 <b>How much is OK?</b> Google's rule: keep toil under <b>50%</b> of an SRE's time, so at least half goes to engineering that reduces future work. Above that, the team is a ticket-handling team that cannot improve anything. At <b>70%</b> (a very common real number) there is no time left to automate, so toil grows, and people quit.</p>
      <p>🟢 <b>Measure before you fix.</b> For two to four weeks, record each interrupt: what, how long, how often, who. A simple spreadsheet or a ticket label <code>toil</code> is enough. Add up hours by category. The top three categories are your targets. If you do not measure, you will automate what is annoying instead of what is expensive.</p>
      <p>🔵 <b>Automation ROI.</b> Weekly hours saved = (minutes per task x times per week x share removed) / 60. Payback = build hours / weekly hours saved. Example: a 15-minute task done 20 times a week is 5 hours a week. Automate it fully in 40 hours: payback = 40 / 5 = <b>8 weeks</b>. After that it is a free 5 hours every week, about 260 hours a year. Add maintenance cost (say 2 hours a month) for honesty.</p>
      ${H.table(['Question', 'If yes'], [['Does it run weekly or more?', 'good candidate'], ['Is the payback under ~3 months?', 'do it soon'], ['Is it error-prone or risky when done by hand?', 'automate even with long payback (risk counts as value)'], ['Does the work disappear if you fix the root cause?', 'fix the cause, do not automate the symptom'], ['Will the automation be harder to maintain than the task?', 'think again, or simplify the task']])}
      <p>🔵 <b>Ways to remove toil, from best to least good.</b> (1) <b>Eliminate</b> it (fix the bug, remove the feature, delete the report nobody reads). (2) <b>Self-service</b> (a portal or a pull request replaces the ticket). (3) <b>Automate</b> (cron, pipeline, operator, runbook script). (4) <b>Simplify and document</b> (a clear runbook with a copy-paste command). Prefer the top of the list.</p>
      <p>🔵 <b>Safe automation habits.</b> Scripts must be <b>idempotent</b> (running twice is safe), have a <b>dry-run</b> mode, log what they change, take locks, and be run from CI or a scheduler with the least privilege. Automation that deletes things needs a human-visible list first. See Bash (DevOps 2) and Ansible (DevOps 10).</p>`,
    clues: ['"the team is drowning in tickets and cannot ship improvements" &rarr; <b>toil</b> above 50%: measure, rank, automate or eliminate', '"is this task worth automating?" &rarr; <b>payback = build hours / weekly hours saved</b>', '"we restart it every night" &rarr; toil hiding a bug; fix root cause', '"manual, repetitive, no enduring value" &rarr; the textbook toil definition', '"developers wait days for access / environments" &rarr; self-service (portal, PR-based approvals, templates)', '"automation broke production" &rarr; dry-run, idempotency, blast-radius limits, review'],
    code: [PY(R`# Toil ledger: where does the week go, and what is worth automating first? Standard library only.
# (task, minutes per occurrence, occurrences per week, hours to automate, share removed by automation)
TASKS = [
    ("restart stuck queue worker", 10, 25, 16, 1.0),
    ("manual access approvals", 15, 20, 40, 0.9),
    ("rotate certificates by hand", 45, 4, 12, 1.0),
    ("hand-built weekly capacity report", 90, 1, 20, 0.8),
]
TEAM_HOURS_PER_WEEK = 4 * 40      # four engineers

total_toil = 0.0
rows = []
for name, minutes, per_week, build_h, share in TASKS:
    weekly_h = minutes * per_week / 60
    saved_h = weekly_h * share
    payback_weeks = build_h / saved_h
    total_toil += weekly_h
    rows.append((payback_weeks, name, round(weekly_h, 1), round(saved_h, 1), round(payback_weeks, 1)))

print("toil hours per week:", round(total_toil, 1), "of", TEAM_HOURS_PER_WEEK,
      "=", round(100 * total_toil / TEAM_HOURS_PER_WEEK, 1), "% of the team's week")
print("task                              h/week  saved  payback(weeks)")
for _, name, w, s, p in sorted(rows):
    print(f"{name:32s} {w:6}  {s:5}  {p}")
`, 'Python (runs): toil ledger and payback'), SH(R`#!/usr/bin/env bash
# Toil killer: remove old, unattached EBS-like scratch dirs safely. Idempotent, dry-run by default.
# Usage: ./clean_scratch.sh [--apply]
set -euo pipefail

ROOT="/var/scratch"
MAX_AGE_DAYS=14
APPLY=0
[ "~{1:-}" = "--apply" ] && APPLY=1

[ -d "$ROOT" ] || { echo "nothing to do: $ROOT missing"; exit 0; }

# Only look one level deep, only directories, only old ones, never follow symlinks.
mapfile -t OLD < <(find "$ROOT" -mindepth 1 -maxdepth 1 -type d -mtime +"$MAX_AGE_DAYS" -print)

echo "found ~{#OLD[@]} old directories under $ROOT"
for d in "~{OLD[@]}"; do
  if [ "$APPLY" -eq 1 ]; then
    echo "removing $d"; rm -rf -- "$d"
    logger -t clean_scratch "removed $d"      # leave an audit trail
  else
    echo "[dry-run] would remove $d"
  fi
done
`, 'Bash: a safe, idempotent cleanup with dry-run'), YM(R`# Toil log: one ticket label and a template make measuring cheap (GitHub issue form).
name: Toil report
description: Record manual, repetitive work so we can rank it
labels: [toil]
body:
  - type: input
    id: task
    attributes: { label: "What did you do by hand?" }
    validations: { required: true }
  - type: input
    id: minutes
    attributes: { label: "Minutes it took" }
    validations: { required: true }
  - type: dropdown
    id: freq
    attributes:
      label: "How often does this happen?"
      options: [daily, weekly, monthly, rare]
  - type: textarea
    id: idea
    attributes: { label: "Could it be removed, self-served or automated? How?" }
`, 'YAML: a toil report form')],
    codeTitle: ['Python (runs): toil ledger and payback', 'Bash: a safe, idempotent cleanup with dry-run', 'YAML: a toil report form'],
    viz: [{
      title: 'Automation payback, week by week',
      input: '15,20,40,0',
      inputLabel: 'minutes per task, times per week, build hours, % of task left (0 to 99)',
      gen: function (input) {
        var v = nums(input, 'four numbers like 15,20,40,0', 4);
        if (v.length !== 4 || v[0] <= 0 || v[1] <= 0 || v[2] < 0 || v[3] < 0 || v[3] > 99) throw new Error('Type minutes, times per week, build hours, percent left (0 to 99)');
        var min = v[0], per = v[1], build = v[2], left = v[3];
        var weekly = r2(min * per / 60), saved = r2(weekly * (100 - left) / 100), f = [];
        f.push({ narr: 'The task takes <b>' + min + ' min</b>, happens <b>' + per + ' times a week</b>: <b>' + weekly + ' hours a week</b> of toil. It scales with usage, so it only grows.', parts: [{ type: 'vars', label: 'Today', vals: { 'toil per week': weekly + ' h', 'per year': r2(weekly * 52) + ' h' } }] });
        f.push({ narr: 'Automation removes <b>' + (100 - left) + '%</b> of it, saving <b>' + saved + ' h a week</b>. Building it costs <b>' + build + ' h</b> once.', parts: [{ type: 'vars', label: 'Trade', vals: { 'build cost': build + ' h', 'saved per week': saved + ' h' }, hl: { 'saved per week': 'ok' } }] });
        var pay = saved > 0 ? Math.ceil(build / saved) : -1;
        if (pay < 0) throw new Error('Automation must remove some of the task');
        var cp = Math.min(pay, 12), rows = [], w;
        var marks = [0, 1, Math.max(1, Math.floor(pay / 2)), pay, pay + 4];
        marks = marks.filter(function (x, i) { return marks.indexOf(x) === i; }).sort(function (a, b) { return a - b; });
        for (w = 0; w < marks.length; w++) { rows.push([marks[w], r2(marks[w] * saved), r2(marks[w] * saved - build)]); }
        f.push({ narr: 'Week by week, the net position is (hours saved so far) - (build hours). It starts negative: you paid first.', parts: [{ type: 'table', label: 'Cumulative', columns: ['Week', 'Saved so far (h)', 'Net (h)'], rows: rows.slice(0, 2) }] });
        f.push({ narr: 'Break-even: build / saved = ' + build + ' / ' + saved + ' = ' + r2(build / saved) + ' &rarr; <b>week ' + pay + '</b>.', parts: [{ type: 'table', label: 'Cumulative', columns: ['Week', 'Saved so far (h)', 'Net (h)'], rows: rows, hl: one1(rows.length - 2, 'sel') }] });
        f.push({ narr: 'After payback it is free time: over a year, net gain = ' + r2(52 * saved - build) + ' hours (about ' + r2((52 * saved - build) / 40) + ' working weeks). Reinvest it in the next toil item. Remember to subtract maintenance, and stop if the task disappears when you fix the root cause.', parts: [{ type: 'vars', label: 'First year', vals: { saved: r2(52 * saved) + ' h', 'minus build': build + ' h', net: r2(52 * saved - build) + ' h' }, hl: { net: 'ok' } }] });
        return f;
      }
    }],
    examples: [
      { title: 'Toil at 70% of the week', html: `<p>A four-person platform team ticks through a survey: 112 of 160 hours a week go on access requests, restarting workers, hand-built reports and certificate renewals. That is <b>70%</b>. The roadmap is a year behind.</p><p>They rank by payback: worker restarts (16 h to fix the leak, saves 4 h/week: payback 4 weeks), access requests (40 h, saves 4.5 h/week: 9 weeks), certificates (12 h, saves 3 h/week: 4 weeks). They do the two cheapest first and negotiate a "toil freeze" on new request types until the share is under 50%. Six months later toil is 38% and the first roadmap item ships.</p>` },
      { title: 'Automating the symptom instead of the cause', html: `<p>An API leaks memory, and the on-call restarts it nightly. Someone writes a cron job to do it. Toil gone? No: the leak is still there, the restart now hides it, and a traffic spike OOMs the pods at noon. The right order is <b>eliminate</b>: find the leak (heap profile), fix it, then delete the cron job. A restart script is a bandage. Use it for a week, with a ticket to remove it.</p>` },
      { title: 'Self-service replaces a ticket queue', html: `<p>Developers asked the platform team for a new database each time: 3 days wait, 30 minutes of work. After building a Terraform module plus a PR template ("add your service name, size and owner"), CI runs the plan and a bot applies it after approval. Wait: 20 minutes. Platform work: reviewing only the unusual requests. Toil dropped by 12 hours a week, and developers stopped waiting. The 60-hour build paid back in 5 weeks.</p>` }
    ],
    deepDive: `<p>🟣 <b>Toil is not "work I dislike".</b> A hard but novel debug is not toil. A boring but one-off migration is not toil. A task is toil if it repeats with no learning. Overhead (meetings, training) is a third category. Separating them stops the word turning into a complaint.</p>
      <p>🟣 <b>Automation ROI beyond hours.</b> Count error reduction (a manual step that fails 2% of the time and causes incidents), wait time for others (a developer blocked for 3 days), risk (a human with production access at 3 a.m.), and morale. Count costs too: build, review, testing, maintenance, and the skill decay when no one remembers the manual steps. Keep a manual fallback documented.</p>
      <p>🟣 <b>The automation ladder.</b> Document the steps; script the steps; turn the script into a tool with arguments and checks; wire it to a trigger; let the system self-heal (operators and controllers such as the Kubernetes reconcile loop). Do not jump to step five. Each rung tells you what the failure modes are.</p>
      <p>🟣 <b>Org-level levers.</b> Cap the toil share in the team charter (under 50%), and use a "toil budget" like an error budget: if the share goes over, new work is paused. Give engineers a dedicated "project time" quarter to build automation. Reward deleting work, and not only shipping features. Rotate on-call so toil is shared and visible, because the person doing it every day stops noticing.</p>
      <p>🟣 <b>Risks of automation.</b> Automation amplifies mistakes at machine speed: a script that deletes "unused" volumes has caused outages. Always limit the blast radius (one account, one tag, a max count), prefer reversible actions, require a dry-run output to be reviewed, and rate-limit destructive loops. Treat automation code as production code: review, tests, versions.</p>`,
    aiEra: `<p>🤖 AI makes writing the script cheap, so the build-hours side of the ROI shrinks and more toil clears the bar. It also makes it tempting to generate scripts nobody understands. Rules: ask for a dry-run mode and idempotency; read every line that deletes, restarts or modifies; test on a non-production copy; commit it to the repo with an owner. Use AI to cluster your toil log (200 tickets into 8 categories) and to draft self-service forms. Keep humans on the question "should this exist at all?".</p>`,
    problems: [P({
      t: 'Automation payback: how many weeks until it is worth it?',
      l: 'Medium', tags: ['toil', 'ROI'], co: ['Google', 'Spotify'],
      lang: 'python',
      s: `<p>A task takes <code>task_min</code> minutes and happens <code>per_week</code> times a week. Automating it costs <code>build_hours</code> and leaves <code>residual_pct</code> percent of the work (for example a human still approves). Write <code>payback_weeks(task_min, per_week, build_hours, residual_pct)</code> returning the <b>smallest whole number of weeks</b> after which the hours saved cover the build cost. Return <code>0</code> if the build cost is 0, and <code>-1</code> if the automation saves nothing (residual 100).</p>`,
      c: `<ul><li>1 ≤ task_min ≤ 600; 1 ≤ per_week ≤ 1000; 0 ≤ build_hours ≤ 5000; 0 ≤ residual_pct ≤ 100.</li><li>Use integer arithmetic only (no floats) so there are no rounding surprises.</li><li>${DESIGN}</li></ul>`,
      ex: `<p><code>(15, 20, 40, 0)</code> &rarr; <span class="c-g">8</span>: saves 300 min = 5 h a week; 40 / 5 = 8.<br><code>(30, 10, 8, 50)</code> &rarr; <span class="c-g">4</span>: saves 2.5 h a week; 8 / 2.5 = 3.2, rounded up to 4 weeks.<br><code>(5, 1, 40, 100)</code> &rarr; <span class="c-r">-1</span>.</p>`,
      bw: `<p>"It will pay back eventually" with no numbers. Or automating a 5-minute monthly task for 40 hours: payback is 480 months. Ten minutes with a calculator avoids a lot of regret.</p>`,
      q: ['A job takes 20 min, runs 6 times a week, and automation takes 30 hours and removes it fully. Payback?', ['15 weeks', '30 weeks', '6 weeks', '3 weeks'], 0, 'Saved: 120 min = 2 h a week. 30 / 2 = 15 weeks.'],
      h: ['Hint 1: weekly saved minutes = task_min x per_week x (100 - residual) / 100.', 'Hint 2: build_hours x 60 is the build cost in minutes.', 'Hint 3: use ceil division on integers: (a + b - 1) // b. Handle build 0 and saved 0 first.'],
      a: `<p>Work in minutes with integers. Saved per week, scaled by 100: <code>task_min * per_week * (100 - residual)</code>. Build cost scaled the same way: <code>build_hours * 60 * 100</code>. Payback is the ceiling of cost / saved. If saved is 0 return -1; if build is 0 return 0. Integer ceiling division avoids float errors at exact boundaries such as 8.0 vs 8.0000001.</p>`,
      code: PY(R`def payback_weeks(task_min, per_week, build_hours, residual_pct):
    """Whole weeks until hours saved cover the build cost. -1 if nothing is saved, 0 if free."""
    saved = task_min * per_week * (100 - residual_pct)      # minutes per week, x100
    if build_hours == 0:
        return 0
    if saved <= 0:
        return -1
    cost = build_hours * 60 * 100                            # minutes, x100
    return (cost + saved - 1) // saved`),
      cx: `<p>Constant time with integer arithmetic. The decision cost is the build effort versus the hours saved, which is exactly what the answer measures.</p>`,
      f: ['How would you add a monthly maintenance cost into the payback?', 'When is a long payback still the right call?'],
      tests: { sig: 'int int int int -> int', fn: 'payback_weeks', names: { python: 'payback_weeks' }, cases: [
        [[15, 20, 40, 0], 8], [[10, 5, 100, 20], 150], [[30, 10, 8, 50], 4], [[60, 3, 2, 0], 1], [[5, 1, 40, 100], -1], [[20, 35, 0, 10], 0], [[45, 10, 120, 10], 18], [[5, 200, 400, 95], 480]
      ] }
    })]
  });

  // ───────────────────────── Topic 5: chaos engineering ─────────────────────────
  topics.push({
    title: 'Chaos Engineering: Steady State, Blast Radius, Game Days, Chaos Mesh and AWS FIS',
    analogy: `<p>A fire drill. You do not wait for a real fire to find that the exit door is locked. You pick a calm Tuesday, tell people, set off the alarm in one building, and watch what happens. Chaos engineering is a fire drill for systems: you break something small <b>on purpose</b>, <b>under control</b>, to find the weakness while you are awake and ready, not at 2 a.m.</p>`,
    explain: `<p>🟢 <b>The idea.</b> Systems fail in ways nobody predicted: a hidden dependency, a missing timeout, a single instance that everything quietly needs. Chaos engineering is the discipline of running small <b>experiments</b> that prove, or disprove, that your system tolerates real failures. It is science, not vandalism.</p>
      <p>🟢 <b>The experiment loop.</b></p>
      <ol><li><b>Define steady state</b>: a measurable sign that the system is healthy, such as "checkout success rate above 99.9%, p95 latency under 400 ms". Use your SLIs.</li><li><b>Write a hypothesis</b>: "If we kill one API pod, steady state holds." Written down <em>before</em> the test.</li><li><b>Limit the blast radius</b>: start with one pod, one zone, 1% of traffic, one test account, a short time box.</li><li><b>Add a stop condition</b>: an alarm or a person who aborts the experiment when the SLO burns too fast.</li><li><b>Inject the fault</b>: kill a pod, add network delay, stop an instance, fail a dependency.</li><li><b>Observe</b> and compare to steady state. Hypothesis held or not?</li><li><b>Learn and fix</b>: file actions with owners; re-run to prove the fix.</li></ol>
      <p>🟢 <b>Faults worth trying</b> (in rough order of how much they teach):</p>
      ${H.table(['Fault', 'Question it answers'], [['Kill one pod/instance', 'do replicas and the load balancer hide a single failure?'], ['Kill all pods of a non-critical service', 'does the caller have a fallback, timeout and circuit breaker?'], ['Add 300 ms latency to a dependency', 'do timeouts, retries and thread pools protect us?'], ['Drop a zone (stop instances in one AZ)', 'can we really lose a zone? (ties to multi-AZ design)'], ['Fail over the database', 'how long is the blip, and do apps reconnect?'], ['Expire a certificate / revoke a credential', 'do we notice before users do?'], ['Fill the disk, hog CPU, exhaust memory', 'do limits, alerts and autoscaling react?'], ['Block DNS or a third-party API', 'what is the graceful degradation?']])}
      <p>🔵 <b>Blast radius and safety rules.</b> Start in staging, then production with the smallest scope. Run in business hours with the team watching, never on a Friday evening. Have an <b>abort button</b> and automatic stop conditions. Tell support and the incident channel first. Do not chaos-test something you cannot already monitor, and do not run chaos in a system that is currently failing its SLO budget policy (see the error budget topic).</p>
      <p>🔵 <b>Game days.</b> A planned half-day where the team rehearses a failure together: pick a scenario, assign roles (like a real incident: IC, scribe, observers), run the fault, practise the runbook, and review. Game days test <b>people and process</b> as much as software: Did the alert fire? Did the runbook work? Who decided to fail over?</p>
      <p>🔵 <b>Tools (intro).</b></p>
      ${H.table(['Tool', 'Where', 'Typical use'], [['<b>Chaos Mesh</b>', 'Kubernetes (CNCF project)', 'PodChaos (kill), NetworkChaos (delay/loss), StressChaos (CPU/mem), schedules and a dashboard'], ['<b>LitmusChaos</b>', 'Kubernetes (CNCF project)', 'ChaosEngine and ready-made experiments, GitOps friendly'], ['<b>AWS Fault Injection Service (FIS)</b>', 'AWS', 'managed experiments: stop EC2, throttle API, failover RDS, network disruption, with IAM role and CloudWatch stop conditions'], ['<b>Gremlin</b> (commercial), Azure Chaos Studio, GCP-side tools', 'any', 'managed platforms with guard rails']])}
      <p>🔵 <b>What you usually find.</b> A single instance hiding behind a load-balanced front (a config server, a license server, one NAT gateway, one cron host); missing timeouts; retries that make things worse; alerts that fire late or not at all; runbooks with stale commands; backups never restored. Each finding is cheaper discovered now.</p>`,
    clues: ['"how do we know the failover really works?" &rarr; a <b>chaos experiment or game day</b>, not a diagram', '"steady-state hypothesis" &rarr; measurable healthy behaviour (SLI) and a prediction written beforehand', '"limit the blast radius" &rarr; one pod, one zone, 1% of traffic, time box, stop condition', '"Chaos Mesh" or "Litmus" &rarr; Kubernetes fault injection; <b>AWS FIS</b> &rarr; managed AWS experiments', '"we found a hidden single point of failure" &rarr; killing one replica of something thought redundant', '"is chaos safe in production?" &rarr; only with monitoring, abort conditions, small scope, and a healthy error budget'],
    code: [YM(R`# Chaos Mesh: kill ONE api pod in the shop namespace (small blast radius). Hypothesis:
# checkout success stays above 99.9% and p95 stays under 400 ms.
apiVersion: chaos-mesh.org/v1alpha1
kind: PodChaos
metadata:
  name: kill-one-api-pod
  namespace: chaos-testing
spec:
  action: pod-kill
  mode: one                    # exactly one pod matching the selector
  selector:
    namespaces: [shop]
    labelSelectors:
      app: api
`, 'Chaos Mesh: PodChaos'), YM(R`# Chaos Mesh: add 200 ms latency to traffic from the api to the database for 5 minutes.
# Question: do our timeouts and the circuit breaker protect checkout?
apiVersion: chaos-mesh.org/v1alpha1
kind: NetworkChaos
metadata:
  name: db-latency-200ms
  namespace: chaos-testing
spec:
  action: delay
  mode: all
  selector:
    namespaces: [shop]
    labelSelectors:
      app: api
  delay:
    latency: 200ms
    jitter: 20ms
  direction: to
  target:
    mode: all
    selector:
      namespaces: [shop]
      labelSelectors:
        app: postgres
  duration: 5m
`, 'Chaos Mesh: NetworkChaos'), JS(R`{
  "description": "Stop ONE tagged app instance in one AZ for 10 minutes; abort if the fast-burn alarm fires",
  "targets": {
    "appInstances": {
      "resourceType": "aws:ec2:instance",
      "resourceTags": { "chaos-ready": "true" },
      "filters": [{ "path": "Placement.AvailabilityZone", "values": ["eu-west-1a"] }],
      "selectionMode": "COUNT(1)"
    }
  },
  "actions": {
    "stopOne": {
      "actionId": "aws:ec2:stop-instances",
      "parameters": { "startInstancesAfterDuration": "PT10M" },
      "targets": { "Instances": "appInstances" }
    }
  },
  "stopConditions": [
    { "source": "aws:cloudwatch:alarm", "value": "arn:aws:cloudwatch:eu-west-1:123456789012:alarm:checkout-fast-burn" }
  ],
  "roleArn": "arn:aws:iam::123456789012:role/fis-experiment-role",
  "tags": { "Name": "stop-one-app-instance", "owner": "sre-team" }
}
`, 'AWS FIS experiment template (JSON, placeholder ARNs)'), SH(R`#!/usr/bin/env bash
# Poor man's steady-state probe: sample the site every second during an experiment and abort if it degrades.
# Usage: URL=https://staging.example.com/health ./probe.sh 120
set -uo pipefail
DURATION="~{1:-60}"
URL="~{URL:?set URL to the endpoint to probe}"
ok=0; bad=0
for _ in $(seq 1 "$DURATION"); do
  code=$(curl -s -o /dev/null -m 2 -w '%{http_code}' "$URL" || echo 000)
  if [ "$code" = "200" ]; then ok=$((ok + 1)); else bad=$((bad + 1)); fi
  total=$((ok + bad))
  # stop condition: more than 5% failures after at least 20 samples
  if [ "$total" -ge 20 ] && [ $((bad * 100)) -gt $((total * 5)) ]; then
    echo "ABORT: $bad of $total probes failed. Roll back the fault now."; exit 2
  fi
  sleep 1
done
echo "steady state held: $ok ok, $bad failed of $((ok + bad))"
`, 'Bash: a steady-state probe with an abort rule')],
    codeTitle: ['Chaos Mesh: PodChaos', 'Chaos Mesh: NetworkChaos', 'AWS FIS experiment template (JSON, placeholder ARNs)', 'Bash: a steady-state probe with an abort rule'],
    viz: [{
      title: 'A chaos experiment finds the hidden single point of failure',
      input: 'cfg',
      inputLabel: 'component to kill: api1, db or cfg',
      gen: function (input) {
        var k = String(input || '').trim().toLowerCase();
        if (['api1', 'db', 'cfg'].indexOf(k) < 0) throw new Error('Type one of: api1, db, cfg');
        var nodes = [box('user', 'Users', 4, 12, 14), box('alb', 'Load balancer', 24, 12, 18), box('api1', 'API pod 1', 50, 4, 16), box('api2', 'API pod 2', 50, 20, 16), box('cfg', 'Config service (1 replica)', 78, 4, 20), box('db', 'Postgres Multi-AZ', 78, 20, 20)];
        var edges = [['user', 'alb'], ['alb', 'api1'], ['alb', 'api2'], ['api1', 'cfg'], ['api2', 'cfg'], ['api1', 'db'], ['api2', 'db']];
        function g(narr, hl, tags) { return { narr: narr, parts: [{ type: 'graph', label: 'Shop architecture', directed: true, height: 28, nodes: nodes, edges: edges, hl: hl || {}, tags: tags || {} }] }; }
        var f = [];
        f.push(g('<b>Steady state:</b> checkout success above 99.9% and p95 under 400 ms. <b>Hypothesis:</b> "if we kill ' + (k === 'api1' ? 'one API pod' : k === 'db' ? 'the database primary' : 'the config service') + ', steady state holds." <b>Blast radius:</b> staging, one component, 5-minute limit, abort if success falls below 95%.', {}, one1(k, 'target')));
        f.push(g('Baseline looks healthy: success 99.97%, p95 210 ms. The abort alarm is armed and the team is watching the dashboard.', { user: 'ok', alb: 'ok', api1: 'ok', api2: 'ok', cfg: 'ok', db: 'ok' }, {}));
        var h = {}; h[k] = 'bad';
        f.push(g('<b>Inject:</b> ' + (k === 'api1' ? 'kill API pod 1' : k === 'db' ? 'fail over the database' : 'kill the config service pod') + '.', h, one1(k, 'KILLED')));
        if (k === 'api1') {
          f.push(g('The load balancer notices in a few seconds (failed health checks) and sends everything to pod 2. Success 99.95%, p95 240 ms. A short blip of 3 failed requests.', { api2: 'ok', alb: 'ok', api1: 'bad' }, one1('api2', 'takes all')));
          f.push(g('<b>Hypothesis held.</b> Redundant pods hide a single failure. Action: none for this fault; schedule the next experiment (a whole zone).', { api2: 'ok', alb: 'ok', api1: 'done' }, {}));
        } else if (k === 'db') {
          f.push(g('Multi-AZ promotes the standby in about 60 to 90 seconds. Apps with retry and a connection pool reconnect; checkout success dips to 97% for 70 seconds, then recovers to 99.9%.', { db: 'cur', api1: 'ok', api2: 'ok' }, one1('db', 'failover 70s')));
          f.push(g('<b>Hypothesis held, barely:</b> the dip stayed above the abort line but burned about 8% of the monthly budget. Action items: lower DNS TTL and tune pool reconnect settings, add the failover time to the runbook and the SLO maths.', { db: 'ok' }, {}));
        } else {
          f.push(g('Both API pods call the config service on every request. With it gone, both start returning 500. Success falls to 0% in 20 seconds. <b>The abort alarm fires and the experiment is stopped</b> after 40 seconds.', { api1: 'bad', api2: 'bad', cfg: 'bad', alb: 'cur' }, { api1: '500', api2: '500' }));
          f.push(g('<b>Hypothesis disproved.</b> The "redundant" design had a hidden single point of failure. Fixes: run 3 config replicas across zones, cache the last good config in each API with a timeout, add a circuit breaker and a degraded mode. Re-run the experiment to prove it. Found in a drill, not at 2 a.m.', { cfg: 'sel', api1: 'ok', api2: 'ok' }, one1('cfg', 'fix: 3 replicas + cache')));
        }
        return f;
      }
    }],
    examples: [
      { title: 'The NAT gateway nobody counted', html: `<p>A team ran its first AZ-failure drill in staging: stop all instances in zone a. The app tier moved to zones b and c as designed. But outbound calls to the payment provider started failing: the VPC had <b>one NAT gateway, in zone a</b>. Private subnets in b and c routed through a dead zone.</p><p>The diagram showed three zones. Reality had one hidden single point of failure. The fix (a NAT gateway per zone and per-zone route tables, cost 2 x about 33 USD a month) went in before the first production drill. This is the classic finding: a design that looks redundant is never proven until something is switched off.</p>` },
      { title: 'A game day for a database failover', html: `<p><b>Plan (3 hours):</b> 10:00 briefing, roles (IC, scribe, ops, observer). 10:15 steady-state check. 10:20 trigger an RDS failover in staging (<code>aws rds reboot-db-instance --force-failover</code>). Watch for: alert time, app reconnects, error budget used. 10:45 second drill: the runbook is read out by someone who did not write it.</p><p><b>Findings:</b> the alert fired after 4 minutes (too slow), two services cached DNS forever, the runbook had a wrong cluster name. Three actions, each with an owner. The next game day repeats the drill to verify. Total cost: three hours of a team, versus finding this in production.</p>` },
      { title: 'When not to run it', html: `<p>On a Thursday at 16:30 an engineer wants to "just test" killing pods in production while a release is mid-rollout and the error budget is at 98% used. Every chaos safety rule is broken: no hypothesis, unclear scope, limited headroom, and people about to go home. The right answer is "not now": run it in staging, or wait for a healthy budget and a calm morning with the whole team in the room. Chaos engineering is careful, boring and scheduled.</p>` }
    ],
    deepDive: `<p>🟣 <b>Principles of Chaos Engineering</b> (from Netflix, who built Chaos Monkey and the Simian Army): build a hypothesis around steady-state behaviour; vary real-world events (instance loss, latency, bad responses); run experiments in production when you can (because only production is production); automate experiments to run continuously; minimise blast radius. The ordering matters: staging first, then production with tiny scope, then continuous.</p>
      <p>🟣 <b>Steady state must be a business metric.</b> CPU or pod count is a weak signal; orders per minute, successful logins, stream starts and p99 latency are strong. This links chaos to SLOs: the stop condition is "burn rate above N". Without good observability (previous modules) you cannot learn from an experiment.</p>
      <p>🟣 <b>Safety design.</b> Experiments get least-privilege IAM roles (FIS needs a role that can only act on tagged resources), tag-based targeting (<code>chaos-ready=true</code>), stop conditions tied to CloudWatch or Prometheus alarms, approvals for production, an audit log, and a kill switch. Chaos Mesh needs RBAC and a namespace allow-list so nobody can point it at <code>kube-system</code>.</p>
      <p>🟣 <b>What chaos does not replace.</b> Unit and integration tests, load tests, security reviews, and backup restores. It checks the <em>integration of reality</em>: timeouts, retries, failover, human response. Also, the outcome is not a pass/fail score but a list of things learned. If an experiment finds nothing three times in a row, make the faults bigger or move on to the next component.</p>
      <p>🟣 <b>Cultural prerequisites.</b> Leadership must accept that a controlled failure is cheaper than a surprise one. Teams need blameless review habits (see the incident topic). Start with a "volunteer service" whose owners are keen. Publish results, including the embarrassing ones; the first honest finding builds the trust to run the second.</p>`,
    aiEra: `<p>🤖 AI can propose failure scenarios by reading your architecture diagram and incident history ("what if the config service is slow?"), generate Chaos Mesh YAML and FIS templates, and draft the game day script. Treat generated experiments like production changes: check selectors (a loose label selector can hit every pod in the cluster), set a duration, add a stop condition, and test in staging first. Never let an AI agent run fault injection autonomously against production. A human owns the hypothesis, the blast radius and the abort button.</p>`,
    problems: [P({
      t: 'Design a chaos experiment for a shop checkout',
      l: 'Medium', tags: ['chaos', 'game day', 'hypothesis'], co: ['Netflix', 'Amazon'],
      s: `<p>Your three-tier shop (load balancer, 4 API pods in 2 zones, one Redis cache with a single replica, Postgres Multi-AZ) has a 99.9% checkout SLO. Write a one-page experiment plan for <b>killing the Redis cache</b>: steady state, hypothesis, blast radius, stop condition, method, what you will measure, and what you will do with each possible outcome.</p>`,
      ex: `<p>Expected shape: a measurable hypothesis ("checkout success stays above 99.5%, p95 under 800 ms, DB CPU under 70%"), a small scope (staging first, then 1% of production), an abort rule, and an action list.</p>`,
      bw: `<p>"We will kill Redis on Friday and see what happens." No hypothesis, no scope, no abort, no observers, and nothing to learn except that it broke.</p>`,
      q: ['Which is the BEST stop condition?', ['Success rate below 95% for 30 seconds or fast-burn alarm fires, with a person ready to abort', 'When someone notices it is bad', 'After 24 hours', 'There is no need for one in staging'], 0, 'A stop condition is automatic and measurable. It is what makes the experiment safe to run.'],
      h: ['Hint 1: state what "healthy" means in numbers before you break anything.', 'Hint 2: think about what Redis does for checkout: sessions, cart cache, rate limits. What happens to the DB when the cache is cold?', 'Hint 3: plan both outcomes: if it holds, widen the scope; if it breaks, fix and re-run.'],
      a: `<p><b>Steady state:</b> checkout success at least 99.9%, p95 under 400 ms, DB CPU under 50%. <b>Hypothesis:</b> "If the cache is unavailable for 5 minutes, checkout success stays above 99.5% and p95 under 800 ms because the API falls back to the database, and the DB can carry the extra read load." <b>Blast radius:</b> staging first with replayed traffic; then production on one canary pod set (about 5% of traffic) for 5 minutes during a quiet weekday morning. <b>Stop conditions:</b> success under 98% for 30 s, DB CPU over 85%, or the fast-burn alert fires; the IC can abort at any time. <b>Method:</b> Chaos Mesh PodChaos (kill the single Redis pod) or block its port with NetworkChaos; scribe records times. <b>Measure:</b> success rate, latency percentiles, DB connections and CPU, cache-miss rate, alert delay, recovery time after Redis returns (including a cache stampede). <b>Outcomes:</b> if it holds, record the result and widen to 25% or a longer duration. If the DB falls over (cache stampede), add a timeout and circuit breaker around Redis, request coalescing, a replica or Redis in HA mode, and a degraded mode; re-run to prove the fix. Notify support and the incident channel first. Review in a blameless meeting with owners and dates.</p>`,
      cx: `<p>One page, a few hours of preparation and 30 minutes of execution.</p>`,
      f: ['How would you test a whole-zone failure next?', 'What changes if the error budget is already 90% spent?']
    })]
  });

  // ───────────────────────── Topic 6: roles, on-call health, runbooks ─────────────────────────
  topics.push({
    title: 'SRE vs DevOps vs Platform Engineering, Healthy On-Call and Runbooks',
    analogy: `<p>Think of a city. <b>DevOps</b> is the culture that says builders and operators share one job: nobody throws plans over a wall. <b>SRE</b> is the fire and rescue service with a rulebook: measurable targets (response times), a budget for risk, and a rule that firefighters cannot spend all day fighting fires or they cannot do prevention. <b>Platform engineering</b> is the city's roads and utilities department: it builds good roads (paved paths) so every business can move faster without laying its own asphalt. <b>On-call</b> is the night shift, and it must be fair, rested and well-equipped, with a clear map in the glove box: the runbook.</p>`,
    explain: `<p>🟢 <b>Three terms, three jobs.</b> Job titles overlap in real companies, so judge by what the work is.</p>
      ${H.table(['', 'DevOps', 'SRE', 'Platform engineering'], [['<b>What it is</b>', 'a culture and set of practices: shared ownership, CI/CD, automation, fast feedback', 'a discipline: apply software engineering to operations, with SLOs and error budgets', 'a team that builds an internal developer platform (IDP) as a product'], ['<b>Main question</b>', 'how do we ship safely and often?', 'how reliable must it be, and how do we get and keep it there?', 'how do we make the right way the easy way for developers?'], ['<b>Typical output</b>', 'pipelines, IaC, deployment automation', 'SLOs, alerting, incident process, capacity, toil removal, reliability reviews', 'self-service templates, golden paths, portals (e.g. Backstage), shared clusters and tooling'], ['<b>Success measure</b>', 'DORA metrics: deploy frequency, lead time, change failure rate, time to restore', 'SLO attainment, error budget, toil %, incident metrics', 'developer adoption, time to first deploy, platform satisfaction'], ['<b>Customer</b>', 'the whole delivery team', 'users of the service (via the product team)', 'internal developers']])}
      <p>🟢 <b>How they fit.</b> DevOps is the "how we work together" idea. SRE is one way to do the operations half with rigour. Platform engineering is the product that makes both easier at scale. A small startup may have one person doing all three. Say "it depends on the company" and then explain the work, not the title.</p>
      <p>🟢 <b>SRE engagement models.</b> A shared-responsibility model: developers run their services, and SRE offers the platform, tools, reviews and consulting. SREs can take on-call for a service only if it meets a readiness bar (SLOs defined, alerts actionable, runbooks present, rollback safe). If a service is too noisy, SRE hands pager duty back to the developers until it improves. This keeps ownership honest.</p>
      <p>🔵 <b>Healthy on-call.</b> On-call is where reliability meets people. Common guidelines: </p>
      <ul><li><b>Page only on symptoms that need a human now</b> (SLO burn, user pain). Everything else is a ticket. Every page must be <b>actionable</b> and <b>urgent</b>.</li><li>Keep to at most about <b>2 incidents per 12-hour shift</b>, so there is time to fix root causes and rest.</li><li>Spend no more than about <b>25%</b> of time on on-call duties (the rest is project work).</li><li>A single-site rotation needs roughly <b>6 to 8 engineers</b>; fewer means constant duty. Follow-the-sun across sites reduces night pages.</li><li>A <b>primary</b> and a <b>secondary</b> responder, with an escalation path and a manager as the last tier.</li><li>Fair handoff, with notes. Compensation or time off in lieu for night and weekend pages.</li><li>A weekly <b>on-call review</b>: which alerts fired, which were noise, what to delete or automate.</li></ul>
      <p>🔵 <b>Alert quality.</b> For each alert ask: Did it need a human? Did the human know what to do? Was it a real user symptom? Alerts that fail get fixed, merged or deleted. A target is that more than 80% of pages are actionable. Noisy alerts are toil with a siren.</p>
      <p>🔵 <b>Runbooks.</b> A runbook is a short, tested document attached to an alert. It must be usable by a tired person at 3 a.m. who did not write it. Required parts: what this alert means (user impact), how to confirm, the quick mitigations in order (with exact copy-paste commands), how to escalate and to whom, and when to declare an incident. Link the runbook URL in the alert. Test it in game days; mark each runbook with an owner and "last verified" date.</p>`,
    clues: ['"what is the difference between SRE and DevOps?" &rarr; DevOps = culture/practices; SRE = engineering discipline with SLOs and budgets; platform = internal product', '"the on-call burns people out" &rarr; alert quality, rotation size, max pages per shift, weekly review, compensation', '"alerts that nobody acts on" &rarr; delete, merge, or turn into tickets; page only on symptoms', '"a new engineer cannot handle 3am pages" &rarr; runbooks, shadowing, wheel of misfortune drills', '"how do developers get a database / cluster quickly?" &rarr; platform engineering, golden paths, self-service', '"when should SRE take over a service?" &rarr; a production readiness review with explicit criteria'],
    code: [PY(R`# On-call health check: is this rotation sustainable? Standard library only.
def oncall_report(team_size, pages_per_week, night_pct):
    """Return a few simple numbers and warnings for a weekly primary rotation."""
    shifts_per_week = 14                                   # 7 days x two 12-hour shifts
    pages_per_shift = pages_per_week / shifts_per_week
    night_pages = pages_per_week * night_pct / 100
    one_in = team_size                                     # you are primary once every N weeks
    warnings = []
    if team_size < 6:
        warnings.append("team too small for a sustainable rotation (aim for 6 to 8)")
    if pages_per_shift > 2:
        warnings.append("more than 2 pages per 12-hour shift: too noisy to fix root causes")
    if night_pages >= 3:
        warnings.append("3 or more night pages a week: sleep debt, fix or follow-the-sun")
    return {"one_in_weeks": one_in, "pages_per_shift": round(pages_per_shift, 2),
            "night_pages": round(night_pages, 1), "warnings": warnings}

for team, pages, night in ((8, 6, 20), (4, 40, 50), (7, 25, 30)):
    r = oncall_report(team, pages, night)
    print(team, "engineers,", pages, "pages/week ->", r["one_in_weeks"], "weeks apart,",
          r["pages_per_shift"], "pages/shift,", r["night_pages"], "night pages")
    for w in r["warnings"]:
        print("   WARNING:", w)
`, 'Python (runs): on-call load check'), YM(R`# Alertmanager routing: page only for critical symptoms, ticket the rest, with a runbook on every page.
route:
  receiver: ticket-queue
  group_by: [alertname, service]
  routes:
    - matchers: ['severity="page"']
      receiver: pager-primary
      group_wait: 30s
      repeat_interval: 30m
    - matchers: ['severity="ticket"']
      receiver: ticket-queue
      repeat_interval: 24h
receivers:
  - name: pager-primary
    pagerduty_configs:
      - routing_key_file: /etc/alertmanager/secrets/pagerduty_key     # mounted secret, never in git
        description: '{{ .CommonAnnotations.summary }}'
        details:
          runbook: '{{ .CommonAnnotations.runbook_url }}'
  - name: ticket-queue
    webhook_configs:
      - url: http://ticket-bridge.ops.svc:8080/alerts
inhibit_rules:
  - source_matchers: ['alertname="NodeDown"']
    target_matchers: ['severity="page"']
    equal: [instance]          # a dead node should not also page for each service on it
`, 'YAML: Alertmanager routing (page vs ticket)'), TX(R`RUNBOOK: CheckoutFastBurn                      Owner: payments team     Last verified: 2026-09-30
1. WHAT THIS MEANS   Checkout is failing fast enough to use 2% of the monthly error budget in an hour.
2. CONFIRM           Dashboard: checkout-overview. Is error ratio above 1.4% for 5 min? Check the load balancer 5xx panel.
3. QUICK CHECKS      a) Recent deploys/flags/config in the last hour:   kubectl -n shop rollout history deploy/api
                     b) Dependencies: DB connections panel, payment provider status page.
4. MITIGATE (try in order, stop when the error ratio falls)
                     a) Roll back the last release:                    kubectl -n shop rollout undo deploy/api
                     b) Turn off the newest feature flag in the flag console.
                     c) DB connection exhaustion: scale pool down on the worker deployment, then restart the API.
                     d) Provider outage: enable "queue payments" mode (flag payments.deferred = true).
5. ESCALATE          15 minutes without improvement -> page secondary; payment provider issue -> payments lead.
6. DECLARE INCIDENT  SEV1 if checkout success under 90%, or any data-loss risk. Use /incident in chat. Roles: IC, comms, ops.
7. AFTER             Note the times in the incident doc; file a ticket for any manual step that should be automated.
`, 'A runbook people can use at 3 a.m.')],
    codeTitle: ['Python (runs): on-call load check', 'YAML: Alertmanager routing (page vs ticket)', 'A runbook people can use at 3 a.m.'],
    viz: [{
      title: 'Is this on-call rotation healthy?',
      input: '8,6,20',
      inputLabel: 'team size, pages per week, % of pages at night',
      gen: function (input) {
        var v = nums(input, 'three numbers like 8,6,20', 3);
        if (v.length !== 3 || v[0] < 1 || v[1] < 0 || v[2] < 0 || v[2] > 100) throw new Error('Type team size, pages per week, night percent (0 to 100)');
        var team = Math.round(v[0]), pages = v[1], night = v[2];
        var perShift = r2(pages / 14), nightP = r2(pages * night / 100), f = [];
        f.push({ narr: 'A team of <b>' + team + '</b> engineers takes a weekly primary rotation. The service produces <b>' + pages + ' pages a week</b>, <b>' + night + '%</b> of them at night.', parts: [{ type: 'vars', label: 'Inputs', vals: { team: team, 'pages/week': pages, 'night %': night } }] });
        f.push({ narr: 'You are primary once every <b>' + team + ' weeks</b>. A week has 14 twelve-hour shifts, so the load is <b>' + perShift + ' pages per shift</b>. The guideline is at most about 2 incidents per shift, so you keep time to fix root causes.', parts: [{ type: 'bars', label: 'Pages per shift (limit 2)', values: [perShift, 2], texts: [perShift + ' now', '2 limit'], hl: one1(0, perShift > 2 ? 'bad' : 'ok') }] });
        f.push({ narr: 'Night pages per on-call week: <b>' + nightP + '</b>. Three or more a week means broken sleep on top of a working week.', parts: [{ type: 'bars', label: 'Night pages (warn at 3)', values: [nightP, 3], texts: [nightP + ' now', '3 warn'], hl: one1(0, nightP >= 3 ? 'bad' : 'ok') }] });
        var warn = [];
        if (team < 6) warn.push('team of ' + team + ' is too small: you are on call too often (aim for 6 to 8)');
        if (perShift > 2) warn.push('over 2 pages per shift: stop and fix alert quality before anything else');
        if (nightP >= 3) warn.push('night load is high: fix the top noisy alerts or move to follow-the-sun');
        f.push({ narr: warn.length ? 'Verdict: <b>unhealthy</b>. ' + warn.join('; ') + '.' : 'Verdict: <b>sustainable</b>. Keep the weekly alert review so it stays that way.', parts: [{ type: 'table', label: 'Findings', columns: ['Check', 'Result'], rows: [['Rotation size', team < 6 ? 'too small' : 'ok'], ['Pages per shift', perShift > 2 ? 'too many' : 'ok'], ['Night pages', nightP >= 3 ? 'too many' : 'ok']], hl: one1(0, warn.length ? 'bad' : 'ok') }] });
        f.push({ narr: 'What to do about it: (1) list last month\'s pages and mark each <b>actionable or not</b>; (2) delete or ticket the non-actionable ones; (3) automate the repeated fixes (toil); (4) write the runbook for the top three; (5) grow the rotation or share it across time zones.', parts: [{ type: 'text', label: 'Plan', html: 'Fix alerts first, then people count.' }] });
        return f;
      }
    }],
    examples: [
      { title: 'Four engineers, 40 pages a week', html: `<p>A team of four holds the pager for 12 services. Each person is primary one week in four and gets about 40 pages, half at night, most from a disk alert and a flapping health check. Two people leave in six months.</p><p>The fix is not "hire more" first. They review a month of pages: 70% were non-actionable. They delete the disk alert (replace it with a predictive "full in 4 hours" ticket), fix the health check, and add a runbook and auto-restart for the top two. Pages fall to 9 a week. Then the rotation can be shared with a neighbouring team to reach 8 people.</p>` },
      { title: 'A platform team that built the wrong thing', html: `<p>A platform team spent a year on a custom deployment portal. Developers kept using their own scripts. A short survey showed the real pain: waiting 2 days for a database. The team switched to a Terraform module with a PR template (a "golden path") and measured <b>time to first deploy</b>: from 3 days to 40 minutes. Platform engineering is product work: find the customer's pain, ship small paved roads, measure adoption.</p>` },
      { title: 'SRE hands the pager back', html: `<p>Service X asks SRE to take its pager. SRE runs a production readiness review: no SLO, 14 alerts with no runbook, deploys that need 3 manual steps, no rollback. SRE says: "Fix these five items and we will take it." Six weeks later the service qualifies, and pages drop 60%. The reverse also happens: if a supported service blows its error budget repeatedly, the pager returns to the dev team until it recovers. This keeps incentives aligned: whoever can fix the reliability feels the pain.</p>` }
    ],
    deepDive: `<p>🟣 <b>DORA metrics</b> (from the DevOps Research and Assessment studies): deployment frequency, lead time for changes, change failure rate, and time to restore service (recently with a fifth measure on reliability). They balance speed and stability and show that fast teams are also more stable. SLOs and error budgets are the SRE side of the same balance: they make the speed/stability trade-off explicit and negotiable.</p>
      <p>🟣 <b>Production readiness review (PRR).</b> A checklist before a service gets SRE support or a launch: SLOs and dashboards, alerts with runbooks, capacity plan and load test, rollback and canary, backups and restore test, security review, dependency map and failure modes, on-call training. A PRR is a conversation to find gaps, not a gate to say no.</p>
      <p>🟣 <b>Platform as a product.</b> The platform has users (developers), a roadmap, support and metrics. "Golden paths" are the recommended, supported, easy ways; teams can leave them but then own the extra work. Tools like Backstage (a developer portal), Crossplane or Terraform modules, and GitOps (Argo CD) are building blocks. The failure mode is a mandatory platform nobody likes; the success mode is one people choose.</p>
      <p>🟣 <b>Human factors.</b> Fatigue makes mistakes more likely, so cap consecutive on-call time, guarantee rest after a bad night, and watch the "hero" pattern where one person solves everything and gets all the pages. Keep a no-blame culture, record knowledge in runbooks instead of heads, and run shadow shifts for new joiners. Compensate fairly. A pager is a 24-hour tax on someone's life.</p>
      <p>🟣 <b>Alert design.</b> Page on <em>symptoms</em> (users can't check out) not <em>causes</em> (CPU 90%). Cause-based alerts belong on dashboards or as tickets. Use burn-rate alerts (see the first topic), group related alerts, and use inhibition so a dead node does not produce 40 pages. Review alert precision (share of pages that needed action) monthly.</p>`,
    aiEra: `<p>🤖 AI can summarise last night's pages for the morning handoff, suggest which alerts to merge, and draft runbook steps from past incident notes. It can also tempt teams to auto-remediate everything. Be careful: an AI agent with production access acts quickly and sometimes wrongly, so start with read-only diagnosis and suggested commands that a human approves. Keep runbooks as the source of truth; test them in game days. The platform-engineering angle: expose AI helpers through the golden path, with the same access controls and audit trails as any other automation.</p>`,
    problems: [P({
      t: 'Fix a noisy on-call: write the alert review and the plan',
      l: 'Medium', tags: ['on-call', 'alerting', 'runbook'], co: ['PagerDuty', 'Stripe'],
      s: `<p>Your team of five has 35 pages a week, 55% at night. A month of pages shows: 14 "disk 80% full" pages that self-healed after log rotation, 9 "pod restarted" pages with no user impact, 6 "payment error ratio high" pages that were real, and 6 unknown. Write the plan: what you delete, what you change into tickets, what you keep as pages, what you automate, how you protect the on-call people meanwhile, and the metrics that show it worked.</p>`,
      ex: `<p>Expected: a split into actionable and non-actionable pages, a symptom-based replacement for the disk alert, a runbook for the real one, and a target (for example under 10 pages a week, under 1 night page).</p>`,
      bw: `<p>"Add two more people to the rotation and tell everyone to be tougher." The noise stays, new people burn out too, and the real payment pages are buried.</p>`,
      q: ['Which change gives the biggest on-call improvement first?', ['Remove or convert the non-actionable alerts to tickets', 'Hire a sixth engineer', 'Make the pager louder', 'Page more people at once'], 0, 'Alert quality is the root cause. More people spread the pain; they do not remove it.'],
      h: ['Hint 1: ask of each page: did it need a human, now?', 'Hint 2: a disk alert can become a predictive ticket ("full in 4 hours").', 'Hint 3: pick measurable targets and a review date.'],
      a: `<p><b>Classify.</b> Of 35 pages, 14 disk + 9 restarts = 23 non-actionable (66%); 6 real; 6 unknown. <b>Delete/convert:</b> replace the disk-80% page with a ticket-level predictive alert (<code>predict_linear</code> says full within 4 hours = page; else ticket) and fix log rotation to remove the cause. Turn pod restarts into a dashboard and a ticket if restarts exceed a threshold, because a restart with no user impact is not a page. <b>Keep:</b> payment error-ratio as a burn-rate page with a runbook (rollback, flag, provider status). <b>Investigate:</b> the 6 unknown pages: add a note field for the next month and assign someone to classify each within a day. <b>Automate:</b> log rotation and restart handling (toil). <b>Protect people now:</b> add a secondary, give time off after a night with 2 or more pages, and hold a 20-minute weekly alert review. <b>Targets:</b> under 10 pages a week, at least 80% actionable, under 1 night page on average, runbook linked from 100% of pages; recheck in 6 weeks. Report the result to the team and leadership with the before and after numbers.</p>`,
      cx: `<p>One month of data and a few days of changes; weekly reviews keep it healthy.</p>`,
      f: ['How would you decide a page versus a ticket for a new alert?', 'What would make you hand the pager back to the developers?']
    })]
  });

  // ───────────────────────── Topic 7: the capstone ─────────────────────────
  topics.push({
    title: 'Capstone: Provision, Ship and Operate a Three-Tier App End to End',
    analogy: `<p>A driving test is not a quiz about road signs. You get in a real car, pull out of the car park, handle traffic and park. The capstone is your driving test for this track: you build a small shop (web, API, database), put it on infrastructure you wrote as code, deliver it through a pipeline, watch it with dashboards and alerts, break it on purpose, fix it, and then <b>explain it in an interview</b>. Everything from Linux to disaster recovery shows up once, in one working system.</p>`,
    explain: `<p>🟢 <b>The system.</b> A tiny shop with three tiers: a <b>web</b> tier (static pages served by nginx), an <b>API</b> tier (a small HTTP service with <code>/healthz</code>, <code>/orders</code> and <code>/metrics</code>), and a <b>database</b> tier (PostgreSQL). The point is the platform around it, not the app.</p>
      ${H.table(['Layer', 'Skill from the track', 'Capstone deliverable'], [
        ['Linux, Bash (DevOps 1-2)', 'shell, services, scripts', 'bring-up and teardown scripts with <code>set -euo pipefail</code>'],
        ['Networking (3)', 'DNS, ports, CIDR, TLS', 'Ingress host, service ports, a documented CIDR plan, a curl-based smoke test'],
        ['Git (4)', 'branches, PRs, secrets hygiene', 'trunk-based repo, PR checks, a <code>.gitignore</code> that blocks state and secrets'],
        ['Cloud + IAM/VPC (5-6)', 'regions, roles, subnets', 'AWS variant: VPC with public/private subnets, least-privilege roles'],
        ['Python (7)', 'automation, testing', 'the API, its tests and a smoke-test script'],
        ['Docker (8)', 'images, compose', 'multi-stage image, non-root user, compose file for the database'],
        ['Terraform (9) and Ansible (10)', 'IaC and config', 'VPC/RDS/EKS as code; optional Ansible role for a bastion or VM'],
        ['CI/CD (11)', 'pipelines', 'GitHub Actions: test, build, scan, push, deploy'],
        ['Managed services (12)', 'RDS, ALB', 'RDS PostgreSQL and an ALB in the AWS variant'],
        ['Kubernetes + Helm (13-14)', 'workloads and releases', 'Deployments, Services, probes, HPA, a Helm chart, a Postgres StatefulSet locally'],
        ['Observability (15)', 'metrics, SLOs, alerts', 'Prometheus + Grafana, an SLO and burn-rate alerts'],
        ['DevSecOps (16)', 'secrets, scanning', 'Trivy image scan, no hardcoded secrets, network policies'],
        ['Multi-region / DR (17)', 'RTO, RPO, backups', 'a backup and a restore drill with measured RTO and RPO'],
        ['This module', 'SLOs, incidents, chaos, capacity', 'error budget policy, a game day, a postmortem, a load test, a runbook']])}
      <p>🟢 <b>Two variants.</b> Do (a), which is free. Do (b) only if you want the cloud experience and accept the cost.</p>
      ${H.table(['', '(a) Free local', '(b) Optional AWS'], [['Cluster', '<code>kind</code> (Kubernetes in Docker)', 'EKS (or ECS/Fargate for a cheaper path)'], ['Database', 'Postgres StatefulSet (or docker-compose for a simpler start)', 'RDS PostgreSQL in private subnets'], ['Entry point', 'Ingress NGINX + port-forward', 'ALB (AWS Load Balancer Controller) or ALB + ECS'], ['Observability', 'kube-prometheus-stack (Prometheus, Alertmanager, Grafana)', 'same chart on EKS, plus CloudWatch for AWS metrics'], ['CI/CD', 'GitHub Actions on a free repo, or <code>act</code> to run workflows on your laptop', 'Actions with OIDC to an AWS role, no stored keys'], ['Cost', '0 USD', 'about 0.27 USD/hour with EKS; teardown the same day']])}
      <p>🔵 <b>Milestones</b> (about 12 to 14 hours in total across the track, spread over a few weekends):</p>
      ${H.table(['#', 'Milestone', 'Acceptance criteria (all must be true)'], [
        ['M1', 'Repo, app and image', 'repo has README, <code>.gitignore</code>, PR template; API passes tests; image builds multi-stage, runs as non-root, under 150 MB; <code>docker compose up</code> gives a working local DB'],
        ['M2', 'Platform as code', '(a) a <code>kind</code> cluster comes up with one script; (b) <code>terraform plan</code> shows VPC, RDS, EKS with tags; <b>budget alarm created first</b>; no secrets in code or state outputs'],
        ['M3', 'Deploy on Kubernetes', 'web, api and Postgres run; probes, resource requests and limits set; Postgres uses a PVC; <code>helm upgrade --install</code> works and <code>helm rollback</code> is tested'],
        ['M4', 'CI/CD', 'every PR runs tests, lint and an image scan; merge to main builds, pushes and deploys; a failed scan blocks the pipeline; AWS uses OIDC, not keys'],
        ['M5', 'Observability and SLO', 'dashboard shows rate, errors, latency; SLO 99.5% availability with a 30-day budget; fast-burn and slow-burn alerts fire in a test; an error budget policy is committed'],
        ['M6', 'Reliability work', 'k6 load test with thresholds and a recorded knee; HPA scales under load; one chaos experiment with a written hypothesis; one backup and restore drill with measured RTO and RPO'],
        ['M7', 'Operate it', 'runbook for each page alert; one staged incident handled with roles and a blameless postmortem; at least one toil item automated with a payback estimate'],
        ['M8', 'Present it', 'architecture diagram, 3 trade-off decisions (ADR style), a 5-minute demo script, and 3 STAR stories ready']])}
      <p>🔵 <b>Grading rubric</b> (100 points; 70 passes, 85 is interview-ready):</p>
      ${H.table(['Area', 'Points', 'Full marks look like'], [['Infrastructure as code', '15', 'everything reproducible from a clean machine; remote state or documented local state; tagged; destroy works'], ['Delivery pipeline', '15', 'tests, scan, image, deploy; rollback is one command; no secrets in logs'], ['Reliability design', '15', 'probes, limits, HPA, PDB, spread, DB backup; failure modes written down'], ['Observability and SLO', '15', 'SLI defined from user behaviour; burn-rate alerts proved by a test; runbook linked'], ['Security', '10', 'non-root, scanned images, least-privilege roles, network policy, secrets from a store'], ['Operations practice', '15', 'chaos hypothesis and result, incident roles, postmortem with owned actions, one automated toil item'], ['Cost awareness', '5', 'estimate before, budget alarm first, teardown done and verified'], ['Communication', '10', 'README, diagram, ADRs, and a clear 5-minute walkthrough']])}
      <p>🔵 <b>"Show this in an interview" checklist.</b> Keep a public repo (no secrets) and a 2-minute screen recording. Be ready to show: (1) the architecture diagram and why each choice; (2) a pipeline run, green and one red that blocked a bad image; (3) the Grafana dashboard and the SLO; (4) the burn-rate alert firing during your failure test; (5) the postmortem; (6) the cost estimate and teardown proof; (7) one thing you would do differently. Prepare three STAR stories (next topic): the incident, the chaos finding, the toil automation.</p>
      <p>🔵 <b>Cost and safety rules for variant (b).</b> Read the estimate first (table below). Create the <b>budget alarm before any resource</b>. Use a separate sandbox AWS account, an IAM role (not root, no long-lived keys), a <code>project=capstone</code> and <code>ttl</code> tag on everything, and finish the teardown checklist the same day. Never commit state files, <code>.tfvars</code> with real values or kubeconfig files.</p>
      ${H.table(['AWS item (approx., us-east-1/eu-west-1 on-demand)', 'Per hour', 'If left 30 days'], [['EKS control plane', '0.10', 'about 73'], ['2 x t3.medium worker nodes', '0.083', 'about 61'], ['1 NAT gateway (plus data)', '0.045', 'about 33'], ['ALB (plus LCU)', '0.0225', 'about 16'], ['RDS db.t4g.micro + 20 GB', '0.016 + storage', 'about 14'], ['<b>Total</b>', '<b>about 0.27</b>', '<b>about 195-200</b>']])}
      <p>A 4-hour session costs about 1 USD; a forgotten weekend about 13 USD; a forgotten month about 200 USD. ECS Fargate instead of EKS removes the 0.10/hour control plane and brings the total near 0.11/hour. Prices change; confirm in the AWS Pricing Calculator.</p>`,
    clues: ['"walk me through a project you built end to end" &rarr; the capstone: repo, IaC, pipeline, cluster, SLO, incident, cost', '"how do you deploy without storing AWS keys in CI?" &rarr; <b>GitHub OIDC</b> to an IAM role with a trust policy', '"how did you control cost?" &rarr; estimate, budget alarm first, tags, teardown checklist', '"how do you know it works?" &rarr; smoke tests, SLO dashboard, burn-rate alert tested, load test, chaos experiment', '"what would you do with more time?" &rarr; multi-region DR, canary with Argo Rollouts, policy as code, cost per request', '"how do you run a stateful database in Kubernetes?" &rarr; StatefulSet + PVC + backups, or better a managed DB (RDS) in production'],
    code: [SH(R`#!/usr/bin/env bash
# capstone-up.sh - free local variant. Needs docker, kind, kubectl, helm. No cloud account, no secrets in git.
set -euo pipefail
CLUSTER=capstone
NS=shop

kind get clusters | grep -qx "$CLUSTER" || kind create cluster --name "$CLUSTER" --config kind-config.yaml

kubectl create namespace "$NS" --dry-run=client -o yaml | kubectl apply -f -

# The DB password is generated per run and stored only in the cluster (a Secret), never in git.
if ! kubectl -n "$NS" get secret pg-credentials >/dev/null 2>&1; then
  kubectl -n "$NS" create secret generic pg-credentials \
    --from-literal=POSTGRES_USER=shop \
    --from-literal=POSTGRES_PASSWORD="$(openssl rand -base64 18)" \
    --from-literal=POSTGRES_DB=shop
fi

kubectl -n "$NS" apply -f k8s/postgres.yaml
kubectl -n "$NS" rollout status statefulset/postgres --timeout=180s

# Observability: Prometheus, Alertmanager and Grafana in one chart.
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts >/dev/null
helm repo update >/dev/null
helm upgrade --install monitoring prometheus-community/kube-prometheus-stack \
  --namespace monitoring --create-namespace --wait --timeout 10m

# The app: build the image, load it into kind, install the chart.
docker build -t shop-api:dev api/
kind load docker-image shop-api:dev --name "$CLUSTER"
helm upgrade --install shop charts/shop --namespace "$NS" -f charts/shop/values.yaml --wait --timeout 5m

kubectl -n "$NS" port-forward svc/shop-web 8080:80 >/dev/null 2>&1 &
sleep 2
curl -fsS http://localhost:8080/healthz && echo " smoke test passed"
`, 'Bash: bring up the free local capstone'), YM(R`# kind-config.yaml: one control plane, one worker, ports for the ingress controller
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
  - role: control-plane
    kubeadmConfigPatches:
      - |
        kind: InitConfiguration
        nodeRegistration:
          kubeletExtraArgs:
            node-labels: "ingress-ready=true"
    extraPortMappings:
      - { containerPort: 80, hostPort: 8081, protocol: TCP }
      - { containerPort: 443, hostPort: 8443, protocol: TCP }
  - role: worker
`, 'YAML: kind cluster config'), YM(R`# k8s/postgres.yaml - a single-replica Postgres for the LAB. In production use RDS or an operator
# (CloudNativePG, Zalando) with backups; a hand-made StatefulSet does not give you failover.
apiVersion: v1
kind: Service
metadata:
  name: postgres
spec:
  clusterIP: None            # headless: stable DNS name postgres-0.postgres
  selector: { app: postgres }
  ports: [{ port: 5432, name: pg }]
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
spec:
  serviceName: postgres
  replicas: 1
  selector:
    matchLabels: { app: postgres }
  template:
    metadata:
      labels: { app: postgres }
    spec:
      securityContext: { fsGroup: 999 }
      containers:
        - name: postgres
          image: postgres:16.4
          ports: [{ containerPort: 5432, name: pg }]
          envFrom:
            - secretRef: { name: pg-credentials }       # created by the script, not stored in git
          env:
            - { name: PGDATA, value: /var/lib/postgresql/data/pgdata }
          readinessProbe:
            exec: { command: ["sh", "-c", "pg_isready -U $POSTGRES_USER -d $POSTGRES_DB"] }
            initialDelaySeconds: 5
            periodSeconds: 5
          resources:
            requests: { cpu: 100m, memory: 256Mi }
            limits: { memory: 512Mi }
          volumeMounts:
            - { name: data, mountPath: /var/lib/postgresql/data }
  volumeClaimTemplates:
    - metadata: { name: data }
      spec:
        accessModes: [ReadWriteOnce]
        resources: { requests: { storage: 1Gi } }
`, 'YAML: Postgres StatefulSet (lab)'), YM(R`# charts/shop/values.yaml - the API tier: probes, limits, autoscaling, spread. Image tag set by CI.
replicaCount: 2
image:
  repository: shop-api
  tag: dev
  pullPolicy: IfNotPresent
service: { port: 80, targetPort: 8000 }
env:
  DB_HOST: postgres
  DB_PORT: "5432"
existingSecret: pg-credentials       # DB user and password come from the Secret
probes:
  readiness: { path: /healthz, initialDelaySeconds: 3, periodSeconds: 5 }
  liveness:  { path: /livez,   initialDelaySeconds: 10, periodSeconds: 10 }
resources:
  requests: { cpu: 100m, memory: 128Mi }
  limits: { memory: 256Mi }
autoscaling: { enabled: true, minReplicas: 2, maxReplicas: 6, targetCPUUtilizationPercentage: 60 }
podDisruptionBudget: { minAvailable: 1 }
topologySpread: { enabled: true, maxSkew: 1, topologyKey: kubernetes.io/hostname }
securityContext: { runAsNonRoot: true, runAsUser: 10001, readOnlyRootFilesystem: true }
metrics: { enabled: true, path: /metrics, port: 8000 }
`, 'YAML: Helm values for the API'), YM(R`# monitoring/shop-slo.yaml - PrometheusRule: SLO 99.5% availability (budget 0.005) for the API.
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: shop-slo
  namespace: monitoring
  labels: { release: monitoring }          # matches the kube-prometheus-stack selector
spec:
  groups:
    - name: shop-slo
      rules:
        - record: shop:error_ratio:rate5m
          expr: sum(rate(http_requests_total{app="shop-api",code=~"5.."}[5m])) / sum(rate(http_requests_total{app="shop-api"}[5m]))
        - record: shop:error_ratio:rate1h
          expr: sum(rate(http_requests_total{app="shop-api",code=~"5.."}[1h])) / sum(rate(http_requests_total{app="shop-api"}[1h]))
        - alert: ShopFastBurn
          expr: shop:error_ratio:rate1h > (14.4 * 0.005) and shop:error_ratio:rate5m > (14.4 * 0.005)
          for: 2m
          labels: { severity: page }
          annotations:
            summary: "Shop API burns the 30-day error budget 14.4x too fast"
            runbook_url: https://github.com/example/capstone/blob/main/runbooks/fast-burn.md
        - alert: ShopSlowBurn
          expr: shop:error_ratio:rate1h > (3 * 0.005) and shop:error_ratio:rate5m > (3 * 0.005)
          for: 30m
          labels: { severity: ticket }
          annotations:
            summary: "Shop API budget burn is 3x normal for 30 minutes"
`, 'YAML: SLO alerts for the capstone'), YM(R`# .github/workflows/ci.yml - test, build, scan, push; deploy to AWS only when enabled, using OIDC (no stored keys).
# Run the test job locally with:  act pull_request -j test
name: ci
on:
  pull_request:
  push:
    branches: [main]
permissions:
  contents: read
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.12" }
      - run: pip install -r api/requirements.txt && python -m unittest discover -s api -v
  image:
    needs: test
    runs-on: ubuntu-latest
    permissions: { contents: read, packages: write }
    steps:
      - uses: actions/checkout@v4
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ~{{ github.actor }}
          password: ~{{ secrets.GITHUB_TOKEN }}      # short-lived token provided by Actions
      - uses: docker/build-push-action@v6
        with:
          context: api
          push: ~{{ github.ref == 'refs/heads/main' }}
          tags: ghcr.io/~{{ github.repository }}/api:~{{ github.sha }}
          load: ~{{ github.ref != 'refs/heads/main' }}
      - uses: aquasecurity/trivy-action@0.28.0
        with:
          image-ref: ghcr.io/~{{ github.repository }}/api:~{{ github.sha }}
          severity: HIGH,CRITICAL
          exit-code: "1"                              # a vulnerable image fails the build
  deploy-aws:
    if: github.ref == 'refs/heads/main' && vars.AWS_ENABLED == 'true'
    needs: image
    runs-on: ubuntu-latest
    permissions: { id-token: write, contents: read }   # id-token lets the job request an OIDC token
    steps:
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/capstone-github-deploy    # placeholder
          aws-region: eu-west-1
      - run: |
          aws eks update-kubeconfig --name capstone --region eu-west-1
          helm upgrade --install shop charts/shop --namespace shop --set image.tag=~{{ github.sha }} --wait
`, 'YAML: GitHub Actions pipeline (OIDC for AWS)'), HC(R`# AWS variant (optional, costs money). FIRST apply only the budget, THEN the rest.
terraform {
  required_version = ">= 1.6"
  required_providers { aws = { source = "hashicorp/aws", version = "~> 5.0" } }
  backend "s3" {}                      # bucket/key/region passed with -backend-config; never hardcode
}

variable "region"      { default = "eu-west-1" }
variable "alert_email" { type = string }              # your address, set via TF_VAR_alert_email
variable "owner"       { type = string }

provider "aws" {
  region = var.region
  default_tags { tags = { project = "capstone", owner = var.owner, ttl = "2026-12-31" } }
}

# 1) Budget alarm: alerts at 50% actual and at 100% forecast of a 20 USD monthly limit.
resource "aws_budgets_budget" "capstone" {
  name         = "capstone-monthly"
  budget_type  = "COST"
  limit_amount = "20"
  limit_unit   = "USD"
  time_unit    = "MONTHLY"
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 50
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = [var.alert_email]
  }
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = [var.alert_email]
  }
}

# 2) Network: VPC with public + private subnets across 2 AZs, ONE NAT gateway to save money (a known SPOF).
module "vpc" {
  source               = "terraform-aws-modules/vpc/aws"
  version              = "~> 5.0"
  name                 = "capstone"
  cidr                 = "10.20.0.0/16"
  azs                  = ["eu-west-1a", "eu-west-1b"]
  public_subnets       = ["10.20.0.0/24", "10.20.1.0/24"]
  private_subnets      = ["10.20.10.0/24", "10.20.11.0/24"]
  database_subnets     = ["10.20.20.0/24", "10.20.21.0/24"]
  enable_nat_gateway   = true
  single_nat_gateway   = true
}

# 3) Cluster (EKS module trimmed): managed node group of 2 small nodes.
module "eks" {
  source          = "terraform-aws-modules/eks/aws"
  version         = "~> 20.0"
  cluster_name    = "capstone"
  cluster_version = "1.31"
  vpc_id          = module.vpc.vpc_id
  subnet_ids      = module.vpc.private_subnets
  eks_managed_node_groups = {
    default = { instance_types = ["t3.medium"], min_size = 2, max_size = 3, desired_size = 2 }
  }
}

# 4) Database: RDS PostgreSQL. The master password is created and stored in Secrets Manager by AWS.
resource "aws_db_subnet_group" "db" {
  name       = "capstone-db"
  subnet_ids = module.vpc.database_subnets
}

resource "aws_security_group" "db" {
  name   = "capstone-db"
  vpc_id = module.vpc.vpc_id
  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [module.eks.node_security_group_id]     # only the cluster nodes may connect
  }
}

resource "aws_db_instance" "shop" {
  identifier                  = "capstone-shop"
  engine                      = "postgres"
  engine_version              = "16"
  instance_class              = "db.t4g.micro"
  allocated_storage           = 20
  db_name                     = "shop"
  username                    = "shopadmin"
  manage_master_user_password = true           # no password in code or state outputs
  db_subnet_group_name        = aws_db_subnet_group.db.name
  vpc_security_group_ids      = [aws_security_group.db.id]
  multi_az                    = false          # lab only; production would be true
  backup_retention_period     = 1
  storage_encrypted           = true
  skip_final_snapshot         = true           # lab only, so destroy leaves nothing billable behind
  deletion_protection         = false
}
`, 'Terraform (HCL): budget first, then VPC, EKS, RDS'), SH(R`#!/usr/bin/env bash
# capstone-teardown.sh - AWS variant. Run the same day. Order matters: remove what creates cloud resources first.
set -uo pipefail
REGION="~{AWS_REGION:-eu-west-1}"

echo "1/5 Kubernetes: delete anything that makes a load balancer or EBS volume (so AWS removes them)"
helm uninstall shop -n shop 2>/dev/null
kubectl delete ingress,svc --all -n shop --ignore-not-found
kubectl delete pvc --all -n shop --ignore-not-found
helm uninstall monitoring -n monitoring 2>/dev/null

echo "2/5 Terraform destroy (state must be reachable)"
terraform destroy -auto-approve

echo "3/5 Verify nothing billable is left, using the project=capstone tag"
aws ec2 describe-nat-gateways --region "$REGION" --filter Name=state,Values=available \
  --query 'NatGateways[].NatGatewayId' --output text
aws elbv2 describe-load-balancers --region "$REGION" --query 'LoadBalancers[].LoadBalancerArn' --output text
aws ec2 describe-volumes --region "$REGION" --filters Name=tag:project,Values=capstone \
  --query 'Volumes[].VolumeId' --output text
aws ec2 describe-addresses --region "$REGION" --query 'Addresses[?AssociationId==null].PublicIp' --output text
aws rds describe-db-instances --region "$REGION" --query 'DBInstances[].DBInstanceIdentifier' --output text
aws rds describe-db-snapshots --region "$REGION" --snapshot-type manual --query 'DBSnapshots[].DBSnapshotIdentifier' --output text
aws logs describe-log-groups --region "$REGION" --log-group-name-prefix /aws/eks/capstone --query 'logGroups[].logGroupName' --output text

echo "4/5 Local: remove the kind cluster too if you are done"
kind delete cluster --name capstone

echo "5/5 Tomorrow: open Billing > Cost Explorer filtered by tag project=capstone; the daily cost must be about zero."
`, 'Bash: teardown checklist script (AWS)'), YM(R`# docker-compose.yml - the simplest local start (milestone M1): web, api and database on one laptop.
services:
  db:
    image: postgres:16.4
    environment:
      POSTGRES_USER: shop
      POSTGRES_DB: shop
      POSTGRES_PASSWORD_FILE: /run/secrets/pg_password       # secret file, not an inline value
    secrets: [pg_password]
    volumes: [pgdata:/var/lib/postgresql/data]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U shop -d shop"]
      interval: 5s
      retries: 10
  api:
    build: ./api
    environment: { DB_HOST: db, DB_PORT: "5432", DB_NAME: shop, DB_USER: shop, DB_PASSWORD_FILE: /run/secrets/pg_password }
    secrets: [pg_password]
    depends_on: { db: { condition: service_healthy } }
    ports: ["8000:8000"]
  web:
    image: nginx:1.27-alpine
    volumes: ["./web:/usr/share/nginx/html:ro"]
    ports: ["8080:80"]
    depends_on: [api]
volumes: { pgdata: {} }
secrets:
  pg_password: { file: ./.secrets/pg_password.txt }          # generated locally, listed in .gitignore
`, 'YAML: docker-compose for the first milestone'), PY(R`# Cost estimator for the optional AWS variant. Prices are approximate placeholders: check the pricing page.
PER_HOUR = {
    "EKS control plane": 0.10,
    "2 x t3.medium nodes": 2 * 0.0416,
    "NAT gateway": 0.045,
    "Application Load Balancer": 0.0225,
    "RDS db.t4g.micro": 0.016,
}
FIXED_PER_MONTH = {"RDS storage 20 GB": 20 * 0.115}      # about 2.3 USD

hourly = sum(PER_HOUR.values())
print(f"hourly: {hourly:.3f} USD")
for hours, label in ((4, "a 4-hour session"), (48, "a forgotten weekend"), (24 * 30, "a forgotten month")):
    storage = sum(FIXED_PER_MONTH.values()) * hours / (24 * 30)
    print(f"{label:22s}: {hourly * hours + storage:7.2f} USD")
print("budget alarm limit suggested: 20 USD monthly, alert at 50% actual and 100% forecast")
`, 'Python (runs): cost estimate'), PY(R`# api/app.py - a deliberately tiny API tier: /healthz, /livez, /orders and Prometheus /metrics.
# The password comes from a file or the environment, never from source code.
import os
import json
import time
from http.server import BaseHTTPRequestHandler, HTTPServer

REQUESTS = {}            # (path, code) -> count; a real service would use prometheus_client


def read_password():
    path = os.environ.get("DB_PASSWORD_FILE")
    if path and os.path.exists(path):
        with open(path) as fh:
            return fh.read().strip()
    return os.environ.get("POSTGRES_PASSWORD", "")


def db_ok():
    """Readiness: can we reach the database? Imported lazily so unit tests do not need psycopg."""
    try:
        import psycopg
        with psycopg.connect(host=os.environ.get("DB_HOST", "postgres"), dbname=os.environ.get("POSTGRES_DB", "shop"),
                             user=os.environ.get("POSTGRES_USER", "shop"), password=read_password(), connect_timeout=2) as c:
            c.execute("select 1")
        return True
    except Exception:
        return False


class Handler(BaseHTTPRequestHandler):
    def _send(self, code, body, ctype="application/json"):
        data = body.encode()
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)
        REQUESTS[(self.path, code)] = REQUESTS.get((self.path, code), 0) + 1

    def do_GET(self):
        if self.path == "/livez":
            self._send(200, '{"status":"alive"}')
        elif self.path == "/healthz":
            ok = db_ok()
            self._send(200 if ok else 503, json.dumps({"db": ok}))
        elif self.path == "/orders":
            self._send(200, json.dumps({"orders": [], "ts": int(time.time())}))
        elif self.path == "/metrics":
            lines = ['http_requests_total{app="shop-api",path="%s",code="%d"} %d' % (p, c, n) for (p, c), n in REQUESTS.items()]
            self._send(200, "\n".join(lines) + "\n", "text/plain")
        else:
            self._send(404, '{"error":"not found"}')


if __name__ == "__main__":
    HTTPServer(("0.0.0.0", 8000), Handler).serve_forever()
`, 'Python: the tiny API tier (compile-checked)')],
    codeTitle: ['Bash: bring up the free local capstone', 'YAML: kind cluster config', 'YAML: Postgres StatefulSet (lab)', 'YAML: Helm values for the API', 'YAML: SLO alerts for the capstone', 'YAML: GitHub Actions pipeline (OIDC for AWS)', 'Terraform (HCL): budget first, then VPC, EKS, RDS', 'Bash: teardown checklist script (AWS)', 'YAML: docker-compose for the first milestone', 'Python (runs): cost estimate', 'Python: the tiny API tier (compile-checked)'],
    viz: [{
      title: 'Follow one order through the three tiers and the pipeline',
      input: 'local',
      inputLabel: 'variant: local or aws',
      gen: function (input) {
        var k = String(input || '').trim().toLowerCase();
        if (k !== 'local' && k !== 'aws') throw new Error('Type local or aws');
        var aws = k === 'aws';
        var nodes = [box('user', 'Browser', 4, 12, 14), box('ing', aws ? 'ALB' : 'Ingress NGINX', 24, 12, 16), box('web', 'Web (nginx)', 44, 4, 16), box('api', 'API pods + HPA', 44, 20, 18), box('db', aws ? 'RDS Postgres' : 'Postgres StatefulSet', 72, 12, 22), box('mon', 'Prometheus + Grafana', 72, 28, 24), box('ci', 'GitHub Actions', 4, 28, 20)];
        var edges = [['user', 'ing'], ['ing', 'web'], ['ing', 'api'], ['api', 'db'], ['mon', 'api'], ['ci', 'api']];
        function g(narr, hl, tags, ehl) { return { narr: narr, parts: [{ type: 'graph', label: aws ? 'AWS variant (EKS + RDS + ALB)' : 'Local variant (kind + Helm)', directed: true, height: 36, nodes: nodes, edges: edges, hl: hl || {}, ehl: ehl || {}, tags: tags || {} }] }; }
        var f = [];
        f.push(g('The shop has <b>three tiers</b> and a platform around them. ' + (aws ? 'Variant (b): VPC, EKS, RDS, ALB, OIDC from GitHub. Costs about 0.27 USD an hour: budget alarm first, teardown the same day.' : 'Variant (a): everything runs on your laptop in <code>kind</code>. Cost: 0 USD.'), {}, {}));
        f.push(g('A pull request runs <b>tests, lint and an image scan</b>. A merge builds the image and ' + (aws ? 'the deploy job gets short-lived AWS credentials through <b>OIDC</b> (no stored keys) and runs <code>helm upgrade</code>.' : 'you load it into kind and run <code>helm upgrade --install</code> (or use <code>act</code> to run the workflow locally).'), { ci: 'cur', api: 'win' }, one1('api', 'new version'), one1('ci-api', 'cur')));
        f.push(g('A user opens the site. The ' + (aws ? 'ALB (in public subnets) terminates TLS' : 'ingress controller routes the host name') + ' and serves static pages from the <b>web</b> tier.', { user: 'cur', ing: 'cur', web: 'ok' }, {}, { 'user-ing': 'cur', 'ing-web': 'cur' }));
        f.push(g('The page calls <code>/orders</code>. The request goes to one of several <b>API pods</b>. Readiness probes mean only healthy pods get traffic; the HPA adds pods under load.', { ing: 'ok', api: 'cur' }, one1('api', '2 to 6 pods'), { 'ing-api': 'cur' }));
        f.push(g('The API reads and writes the <b>database</b>' + (aws ? ' in private subnets, reachable only from the cluster security group, password in Secrets Manager.' : ' through a Service and a PVC; the password is a Kubernetes Secret created at install time.') + ' This tier is the hardest to make reliable: backups and a restore drill are mandatory.', { api: 'ok', db: 'cur' }, one1('db', 'backup + restore drill'), { 'api-db': 'cur' }));
        f.push(g('Prometheus scrapes <code>/metrics</code>. The recording rules turn requests into an <b>error ratio</b>; burn-rate alerts compare it with the 99.5% SLO. Grafana shows rate, errors and latency. A test failure (kill the DB) must page within minutes.', { mon: 'sel', api: 'ok', db: 'bad' }, one1('mon', 'SLO + alerts'), { 'mon-api': 'cur' }));
        f.push(g('Then the operations work: a <b>load test</b> to find the knee, a <b>chaos experiment</b> with a hypothesis, a <b>postmortem</b> for the staged incident, and a <b>teardown</b>' + (aws ? ' with a checklist that proves no NAT gateway, load balancer or volume is left billing' : ' (<code>kind delete cluster</code>)') + '. Then you present it in five minutes.', { user: 'done', ing: 'done', web: 'done', api: 'sel', db: 'sel', mon: 'sel', ci: 'sel' }, {}));
        return f;
      }
    }],
    examples: [
      { title: 'Milestone M5: prove the alert works, not just that it exists', html: `<p>A learner writes the burn-rate alert, sees no errors, and assumes it works. Two weeks later a typo in the label (<code>app="shop"</code> instead of <code>app="shop-api"</code>) is found: the expression never matched anything. Acceptance criterion M5 therefore says the alert must <b>fire in a test</b>: scale the DB StatefulSet to 0, send traffic with a loop, and watch <code>ShopFastBurn</code> go pending, then firing, within about 5 minutes. Then scale back and watch it resolve. Alerts that were never fired are untested code.</p>` },
      { title: 'Variant (b): the budget alarm saved 180 USD', html: `<p>Student A skips the budget step, runs <code>terraform apply</code> on Friday evening, and forgets. On Monday the bill shows 13 USD, and by the month end it would have been about 200 USD. Student B created the budget first: the 50% actual alert (10 USD) arrived on Sunday by email. B ran the teardown script, checked the NAT gateway list was empty, and the bill stopped at 12 USD. Order matters: <b>budget, then resources, then teardown the same day</b>.</p>` },
      { title: 'The STAR story you get from the capstone', html: `<p><b>Situation:</b> in my capstone, the checkout path depended on a database with no tested restore. <b>Task:</b> prove we can recover within 30 minutes with at most 5 minutes of data loss. <b>Action:</b> I took a backup, dropped a table on purpose, restored to a new instance, and timed each step in a runbook; I found the restore took 41 minutes because the restore step recreated indexes. I changed the process (restore from a physical snapshot) and wrote the steps down. <b>Result:</b> RTO measured at 22 minutes, RPO 3 minutes; the drill is now monthly and the runbook is linked from the alert. This is a better answer than a theoretical one because it has numbers and a lesson.</p>` }
    ],
    deepDive: `<p>🟣 <b>Scoping rules.</b> The capstone is a platform exercise. Do not spend a week making the app pretty. Keep the API under 100 lines. If time is short, drop in this order: AWS variant, chaos experiment, then Ansible; never drop the SLO, the pipeline or the postmortem, because those are what interviewers ask about.</p>
      <p>🟣 <b>Production gaps to name honestly.</b> A hand-rolled Postgres StatefulSet has no automatic failover or point-in-time recovery; in production use RDS/Aurora or an operator such as CloudNativePG. A single NAT gateway is a zone-level single point of failure (cheap, acceptable for a lab, and a great chaos finding). One cluster is not multi-region. The lab skips WAF, private cluster endpoints, KMS-encrypted secrets and policy-as-code (OPA/Kyverno). Listing what you left out, and why, shows judgment.</p>
      <p>🟣 <b>OIDC from GitHub to AWS.</b> Create an IAM OIDC identity provider for <code>token.actions.githubusercontent.com</code> and a role whose trust policy allows <code>sts:AssumeRoleWithWebIdentity</code> only when the token's <code>sub</code> claim matches your repo and branch (for example <code>repo:your-org/capstone:ref:refs/heads/main</code>) and <code>aud</code> is <code>sts.amazonaws.com</code>. Give the role only what the deploy needs. There is no secret to leak or rotate.</p>
      <p>🟣 <b>Reproducibility.</b> A good capstone can be rebuilt from a clean laptop by a stranger in under 30 minutes: a README with prerequisites and versions, pinned image tags and chart versions, a Makefile (<code>make up</code>, <code>make test</code>, <code>make down</code>), and a CI job that runs the lint and the plan. If it only works on your machine, it is a demo, not a project.</p>
      <p>🟣 <b>Extension ideas.</b> Add Argo CD for GitOps, Argo Rollouts for canary with automatic analysis against your SLO, Kyverno policies, Velero backups, Karpenter autoscaling, cost per request with OpenCost, and a second cluster to practise a failover. Each is a good interview talking point after the basics are solid.</p>`,
    aiEra: `<p>🤖 An assistant can scaffold the repo, write the Dockerfile, the Helm chart and the Terraform in an afternoon. That is the trap: a project you cannot explain is worse than none. Use AI to generate, then <b>read every line</b>, run <code>terraform plan</code> and <code>helm template</code>, and be ready to answer "why this setting?" for each block. Watch for hardcoded passwords, wide IAM policies (<code>"Resource": "*"</code>), unpinned image tags, and missing teardown. Ask it to review your design for single points of failure and cost, then verify the claims against the documentation. In the interview, say what you wrote, what AI wrote and how you checked it.</p>`,
    problems: [P({
      t: 'Plan the capstone: milestones, risks and a go/no-go for the AWS variant',
      l: 'Medium', tags: ['capstone', 'planning', 'cost'], co: ['Any DevOps role'],
      s: `<p>You have two weekends (about 14 hours) and a 20 USD personal budget. Write a plan for the capstone: which variant first, the order of milestones, what you cut if you run late, the three biggest risks (technical and cost), and the go/no-go checks before you run <code>terraform apply</code> in an AWS account.</p>`,
      ex: `<p>Expected: variant (a) first, AWS only after a green local run; budget alarm and sandbox account before apply; teardown time reserved in the plan.</p>`,
      bw: `<p>"Start with Terraform on AWS because it is more impressive." Without a working app and pipeline, the cloud variant just adds cost and a long debug loop on an unfinished system.</p>`,
      q: ['What must exist BEFORE the first terraform apply on AWS?', ['A budget alarm, a sandbox account, tags and a written teardown plan', 'A load balancer', 'A production database', 'A domain name'], 0, 'Cost controls come first. A forgotten stack costs about 200 USD a month.'],
      h: ['Hint 1: finish the free variant before spending a cent.', 'Hint 2: reserve time for teardown and verification, as a milestone.', 'Hint 3: list what you will cut first if you are late (chaos, Ansible, AWS).'],
      a: `<p><b>Order.</b> Weekend 1 (7 h): M1 app, image and compose (2 h); M2 kind and Helm (2 h); M3 deploy with probes and Postgres (1.5 h); M4 CI with tests, build and scan (1.5 h). Weekend 2 (7 h): M5 Prometheus, SLO, burn-rate alerts and proof they fire (2 h); M6 k6 load test, one chaos experiment, one restore drill (2 h); M7 runbook, staged incident and postmortem, one toil script (1.5 h); M8 README, diagram, ADRs, 5-minute demo and STAR stories (1.5 h). <b>AWS variant:</b> only if M1 to M7 are green and you still have a spare half-day; it adds about 4 hours (Terraform, OIDC, deploy) and about 1 to 3 USD. <b>Cut order if late:</b> AWS variant, then Ansible, then the chaos experiment; never cut SLO, pipeline, postmortem. <b>Risks:</b> (1) laptop resources: kind plus the monitoring chart needs about 8 GB RAM, so use a smaller values file or skip Grafana; (2) cost: a forgotten NAT gateway, load balancer or EKS cluster, mitigated by the budget alarm, tags, a calendar reminder and the teardown checklist; (3) scope creep, mitigated by a fixed milestone list and keeping the app trivial; (4) secrets leaking into git, mitigated by <code>.gitignore</code>, secret scanning and OIDC. <b>Go/no-go before apply:</b> local variant passes all acceptance criteria; <code>terraform plan</code> reviewed line by line; budget alarm confirmed by email; sandbox account with no other workloads; remote or local state location chosen and ignored by git; I know the teardown commands and have 30 minutes right after the session to run them. If any item is no, do not apply.</p>`,
      cx: `<p>The plan is one page; the discipline is in following the order.</p>`,
      f: ['What would you automate first to make teardown safe?', 'How would you cut the AWS cost in half without changing the learning value?']
    })]
  });

  // ───────────────────────── Topic 8: interview prep ─────────────────────────
  topics.push({
    title: 'DevOps and SRE Interview Preparation: Scenarios, System Design for SRE and STAR Stories',
    analogy: `<p>A pilot is not tested on whether they can recite the manual; the simulator throws an engine fire at them and the examiner watches <em>how they think</em>: checklist first, calm voice, clear callouts, safe landing. A DevOps or SRE interview is a simulator. The interviewer wants to see a method (scope, hypothesis, mitigate, verify), good judgment about risk, and honest stories from real work. Your capstone is the flight log that proves you have flown.</p>`,
    explain: `<p>🟢 <b>What interviews usually contain.</b> Most loops have five parts. Know which one you are in.</p>
      ${H.table(['Round', 'What they test', 'How to prepare'], [['<b>Troubleshooting scenario</b> ("the site is down, walk me through it")', 'method, calm, layered thinking (DNS to DB), mitigation vs root cause', 'practise the walkthrough below out loud; use the capstone failures as examples'], ['<b>Systems fundamentals</b>', 'Linux, networking, TCP/DNS/TLS, containers, Kubernetes', 'revisit DevOps 1-3 and 13; be ready to go one level deeper than you think'], ['<b>System design for SRE</b>', 'reliability, scaling, failure modes, observability, SLOs, cost', 'use the framework below'], ['<b>Coding / scripting</b>', 'Bash and Python for parsing logs, calling APIs, small automation', 'write clean, safe scripts; mention idempotency and error handling'], ['<b>Behavioural</b>', 'ownership, incidents, conflict, learning, mentoring', 'prepare 5 STAR stories (see Behavioural 1)']])}
      <p>🟢 <b>"The site is down. Walk me through it."</b> A good answer is a loop, not a list of random commands:</p>
      <ol><li><b>Clarify and scope.</b> What is down (all users or some)? Since when? What changed? How do we know (alert, customer report)? Is it an incident, and what severity? "I would declare an incident and name an IC if user impact is large."</li><li><b>Check recent changes first.</b> Deploys, config, flags, infrastructure, certificate expiry, traffic spikes, a cloud provider status event. Most outages follow a change, and a rollback is the fastest mitigation.</li><li><b>Walk the request path from the user.</b> DNS resolves? TLS valid? Load balancer healthy targets? App pods ready, errors in logs? Dependencies: database, cache, queue, third-party? Saturation: CPU, memory, connections, disk?</li><li><b>Use the signals.</b> Golden signals (latency, traffic, errors, saturation), dashboards, traces, logs for a failing request id.</li><li><b>Mitigate before you root-cause.</b> Rollback, flag off, scale up, fail over, shed load. Say "stop the bleeding first".</li><li><b>Communicate.</b> Status page, stakeholders, a regular update rhythm.</li><li><b>Verify and follow up.</b> Metrics recovered, then a blameless postmortem with owned action items.</li></ol>
      <p>🟢 <b>Answer shape.</b> Say your plan in 20 seconds ("scope, recent changes, request path, mitigate, communicate, verify"), then dive in as the interviewer pulls. Think aloud. Ask good questions. If you do not know a command, describe what you want to learn and how you would find it.</p>
      <p>🔵 <b>System design for SRE: a framework.</b> Where a software engineer designs for features, an SRE designs for <b>failure</b>:</p>
      ${H.table(['Step', 'Say / draw'], [['1. Requirements and SLOs', 'users, traffic (peak rps), data size, latency and availability targets; derive the error budget'], ['2. Architecture', 'tiers, stateless services, data stores, queues, caches, CDN; draw the request path'], ['3. Failure modes', 'for each box: what if it dies, slows, is partitioned, corrupts? Remove single points of failure; decide multi-AZ or multi-region'], ['4. Capacity and scaling', 'Little\'s law, headroom, autoscaling, quotas, load tests, N+1 and zone loss'], ['5. Deploy and change safety', 'CI/CD, canary, feature flags, rollbacks, schema migrations, config as code'], ['6. Observability and alerting', 'SLIs, dashboards, burn-rate alerts, tracing, runbooks, on-call'], ['7. Data safety and DR', 'backups, restore drills, RTO and RPO, replication'], ['8. Security and cost', 'least privilege, secrets, network segmentation, cost levers and trade-offs'], ['9. Operate and improve', 'incident process, postmortems, chaos tests, toil budget']])}
      <p>🔵 <b>STAR stories.</b> <b>S</b>ituation (1 sentence), <b>T</b>ask (what you owned), <b>A</b>ction (what <em>you</em> did, in steps, with trade-offs), <b>R</b>esult (numbers, then what you learned). Prepare stories for: an incident you led or joined, a time you reduced toil, a disagreement about risk or priorities, a mistake you made and fixed, a project you owned end to end, and a time you improved reliability with data. The capstone gives you honest material for the first three. Keep each to 2 minutes. See also the behavioural track (<b>Behavioural 1</b>) for structure and delivery.</p>
      <p>🔵 <b>Hot topics to refresh.</b> Linux: processes, memory, load average, <code>ss</code>, <code>strace</code>, disk and inodes. Networking: DNS, TCP handshake, TLS, load balancer types, MTU, NAT. Kubernetes: Pod lifecycle, probes, <code>CrashLoopBackOff</code>, <code>Pending</code>, requests vs limits, DNS, networking. Terraform: state, drift, locking, modules. CI/CD: rollbacks, blue-green, canary, secrets. Observability: golden signals, cardinality, tracing. SRE: SLOs, burn rate, toil, postmortems, capacity. Security: IAM, secrets, supply chain.</p>
      <p>🔵 <b>Questions to ask them.</b> What is the on-call load and rotation size? How do you handle error budgets? What was your last big incident and what changed? What is the toil share? How do you decide SLOs? Good questions show you will work the practices in this module, and they tell you if the job is healthy.</p>`,
    clues: ['"the site is down, walk me through it" &rarr; scope, changes, request path, mitigate, communicate, verify', '"design X to be highly available" &rarr; SLO, failure modes per component, multi-AZ, capacity with N+1, observability', '"tell me about a time you handled an outage" &rarr; STAR with roles, timeline, numbers, postmortem actions', '"how would you reduce on-call pain?" &rarr; alert quality, runbooks, toil automation, rotation size', '"SRE vs DevOps" &rarr; practices vs discipline vs internal platform; be concrete about the work', '"what did you learn from your project?" &rarr; trade-offs, a failure you found, cost control, what you would change'],
    code: [SH(R`#!/usr/bin/env bash
# First-five-minutes triage helper: prints where the request path breaks. Read-only; safe to run on a laptop.
# Usage: ./triage.sh https://shop.example.com
set -uo pipefail
URL="~{1:?usage: triage.sh <url>}"
HOST=$(printf '%s' "$URL" | sed -E 's#^[a-z]+://##; s#[/:].*$##')

echo "== 1. DNS: does the name resolve? =="
dig +short "$HOST" || echo "dig failed"

echo "== 2. TCP and TLS: can we connect and is the certificate valid? =="
curl -sS -o /dev/null -m 5 -w 'connect=%{time_connect}s tls=%{time_appconnect}s http=%{http_code}\n' "$URL" || echo "curl failed"
echo | openssl s_client -connect "$HOST:443" -servername "$HOST" 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null || true

echo "== 3. Health endpoint and latency (5 samples) =="
for i in 1 2 3 4 5; do
  curl -sS -o /dev/null -m 5 -w '%{http_code} %{time_total}s\n' "$URL/healthz" || echo "failed"
done

echo "== 4. Kubernetes (if you have access): what changed and what is unhealthy? =="
if command -v kubectl >/dev/null 2>&1; then
  kubectl get pods -A --field-selector=status.phase!=Running 2>/dev/null | head -20
  kubectl -n shop rollout history deploy/api 2>/dev/null | tail -5
  kubectl get events -A --sort-by=.lastTimestamp 2>/dev/null | tail -10
fi
echo "Next: check dashboards (rate, errors, latency, saturation), recent deploys/flags, then mitigate (rollback first)."
`, 'Bash: a read-only triage script'), TX(R`THE 20-SECOND OPENER (say this first)
"I would first scope the impact and check what changed recently. Then I would follow the request path from the user:
DNS, load balancer, application, dependencies, and saturation. If a change is the likely cause I would roll back to
stop the bleeding, communicate on a fixed rhythm, verify with metrics, and write a blameless postmortem."

SYSTEM DESIGN FOR SRE: 5-MINUTE SKELETON
1. SLO: 99.9% over 30 days -> 43 min budget. Peak 5,000 rps, p95 < 300 ms.
2. Path: CDN -> ALB -> stateless API (3 AZs, N+1) -> cache -> Postgres primary + 2 replicas (Multi-AZ) ; queue for async work.
3. Failure table: ALB dies (managed, multi-AZ) | API pod (replicas, probes) | AZ (capacity for 2 of 3) | DB primary (auto-failover 60-120 s) |
   cache (cold start, protect DB with rate limits) | dependency slow (timeout, retry budget, breaker).
4. Capacity: Little's law for pools; 30% headroom; load test to the knee; quotas checked.
5. Changes: canary 1% -> 10% -> 100% with SLO gate; migrations backward compatible; one-click rollback.
6. Observability: golden signals, burn-rate alerts, traces, runbooks. 7. DR: PITR + cross-region snapshot copy, RTO 1 h / RPO 5 min, drill quarterly.
8. Security/cost: least-privilege roles, secrets manager, VPC endpoints for S3/ECR to cut NAT cost.
9. Operations: on-call of 8, postmortems, toil under 50%, a game day each quarter.
`, 'Scripts to practise out loud'), TX(R`STAR STORY (capstone chaos finding, 2 minutes)
S: In my capstone shop on Kubernetes, I claimed the API tier was highly available because it had 3 replicas across 2 zones.
T: I wanted evidence, with an SLO of 99.5% and a rule that experiments must stay inside the error budget.
A: I wrote a hypothesis ("killing one API pod keeps success above 99.5%"), limited the blast radius to one pod in my cluster,
   and set an abort condition on the fast-burn alert. The pod kill held. Then I killed the config service pod: success fell to 0%
   in 20 seconds and the abort fired. I had a hidden single point of failure. I ran 3 replicas, cached the last good config in
   each API pod, and added a circuit breaker. I re-ran the test and wrote a runbook and a ticket for the next drill.
R: Success stayed at 99.9% with the config service down; mean time to detect the failure dropped from never (no alert) to 90 s.
   Lesson: diagrams are hypotheses; drills turn them into facts. I now add a chaos check to every design review.
`, 'A STAR story built from the capstone'), PY(R`# Composite availability: why "redundant" designs still need numbers. Standard library only.
def serial(*avail):
    """All components are required: availabilities multiply."""
    out = 1.0
    for a in avail:
        out *= a
    return out

def parallel(*avail):
    """Any one is enough (independent failures): unavailability multiplies."""
    miss = 1.0
    for a in avail:
        miss *= (1 - a)
    return 1 - miss

alb = 0.9999
api = parallel(0.99, 0.99, 0.99)        # three pods; any one can serve
db = 0.9995                              # Multi-AZ primary
cache = 0.999
chain = serial(alb, api, db, cache)
month = 30 * 1440
print("API tier alone      :", round(api * 100, 4), "%")
print("whole request path  :", round(chain * 100, 3), "%")
print("downtime per month  :", round((1 - chain) * month, 1), "minutes")
print("with a cache fallback (cache not required):", round(serial(alb, api, db) * 100, 3), "%")
`, 'Python (runs): composite availability')],
    codeTitle: ['Bash: a read-only triage script', 'Scripts to practise out loud', 'A STAR story built from the capstone', 'Python (runs): composite availability'],
    viz: [{
      title: '"The site is down": a calm walkthrough',
      input: 'down',
      inputLabel: 'symptom: down, slow or errors',
      gen: function (input) {
        var k = String(input || '').trim().toLowerCase();
        if (['down', 'slow', 'errors'].indexOf(k) < 0) throw new Error('Type one of: down, slow, errors');
        var steps = [
          ['1. Scope', 'Who is affected, since when, how do we know? Declare the incident and severity; name an IC.', 'Is it everyone or a segment (region, device, customer)?'],
          ['2. Changes', 'Deploys, flags, config, infra, cert expiry, cloud status in the last hour.', 'A recent change is the cause in most outages: roll back first.'],
          ['3. Path', k === 'down' ? 'DNS, TLS and load balancer: do names resolve, is the certificate valid, are targets healthy?' : k === 'slow' ? 'Where does time go? Check latency by hop (LB, app, DB), traces, and saturation (CPU, connections, queues).' : 'Which endpoint and which error code? Group errors by version, pod and dependency in logs.', k === 'down' ? 'No healthy targets usually means failing health checks or a dead tier.' : k === 'slow' ? 'Little\'s law: slow dependencies pile up in-flight requests and exhaust pools.' : '5xx from one version points at the release; from all pods at a dependency.'],
          ['4. Mitigate', 'Rollback, flag off, scale up, fail over, shed load. Do not wait for root cause.', 'Pick the fastest safe and reversible action; tell the IC before acting.'],
          ['5. Communicate', 'Status page and stakeholders on a fixed rhythm (every 15 to 30 minutes).', 'Facts only; no guessed causes in public.'],
          ['6. Verify', 'Success rate and latency back to steady state for 15 minutes, burn rate falling.', 'Metrics, not feelings, close the incident.'],
          ['7. Learn', 'Blameless postmortem within days: timeline, contributing factors, owned actions.', 'Add the missing alert or runbook; repeat the drill later.']
        ];
        var f = [], i;
        f.push({ narr: 'Symptom: <b>' + k + '</b>. The interviewer wants a <b>method</b>: say the plan in one breath, then dive in. Start with scope, not with a random command.', parts: [{ type: 'queue', label: 'Plan (say it first)', items: steps.map(function (s) { return s[0]; }), frontLabel: 'first', backLabel: 'last' }] });
        for (i = 0; i < steps.length; i++) {
          (function (n) {
            var hl = {}; hl[n] = 'cur';
            f.push({ narr: '<b>' + steps[n][0] + '.</b> ' + steps[n][1] + ' <br><i>Why: ' + steps[n][2] + '</i>', parts: [{ type: 'queue', label: 'Plan', items: steps.map(function (s) { return s[0]; }), hl: hl, frontLabel: 'first', backLabel: 'last' }, { type: 'table', label: 'So far', columns: ['Step', 'What I do'], rows: steps.slice(0, n + 1).map(function (s) { return [s[0], s[1]]; }), hl: one1(n, 'cur') }] });
          })(i);
        }
        return f;
      }
    }],
    examples: [
      { title: 'A weak vs a strong answer to "the site is down"', html: `<p><b>Weak:</b> "I would SSH into the server and look at the logs, then restart Nginx." It assumes one server, no scope question, no change check, no communication, and restarts without evidence.</p><p><b>Strong:</b> "First I would confirm and scope: is it everyone, and since when? I would declare an incident and get an IC. Then I check what changed in the last hour, since a rollback is the fastest fix. If nothing changed I walk the path: DNS, TLS, load balancer targets, app errors, database and cache, saturation. While we investigate someone updates the status page every 20 minutes. Once the error rate is back I confirm with the SLO dashboard and schedule a blameless postmortem." Same facts, but a method and a team.</p>` },
      { title: 'System design answer that earns the offer: "design a payments API for 99.95%"', html: `<p>The candidate starts with the number: 99.95% is 21.6 minutes a month, so single-zone is not enough (a zone event alone can exceed that). They choose three zones with capacity for the loss of one, a Multi-AZ database with synchronous replication and a runbook for failover time (60 to 120 s), idempotency keys for retries, a queue for the non-critical work, canary releases with SLO gating, and burn-rate alerts. They say aloud what the design does <em>not</em> handle (a full Region outage, a bug in the provider), give an RTO and RPO, and note the cost trade-offs. Interviewers remember "I would not promise more than the dependencies allow".</p>` },
      { title: 'Turning the capstone into three stories', html: `<p><b>Incident story:</b> the staged database outage, roles, timeline, postmortem with 4 owned actions. <b>Toil story:</b> the cleanup script and the payback calculation (40 hours saved a quarter, 6-week payback). <b>Reliability story:</b> the chaos finding and the fix proven by re-running the test. Each has numbers, a mistake or surprise, and what you changed afterwards. Practise telling each in under two minutes; record yourself once. If asked about a gap ("have you run production at scale?"), say honestly what you have done in a lab, what the differences are, and how you would learn them on the job.</p>` }
    ],
    deepDive: `<p>🟣 <b>What distinguishes senior answers.</b> They state assumptions, quantify (minutes of budget, rps, cost per hour), name trade-offs ("I choose a single NAT to save money and accept a zone-level risk in the lab"), distinguish mitigation from root cause, and show humility (the thing I was wrong about). They also talk about people: communication, handoffs, blamelessness.</p>
      <p>🟣 <b>Common traps.</b> Jumping to a tool name before the problem; restart-as-fix; guessing a cause aloud as fact; ignoring communication; designing multi-region when the dependencies cap availability anyway; hiding behind buzzwords; claiming credit for team work without saying your part; having no failure stories (interviewers distrust it).</p>
      <p>🟣 <b>Questions you should be able to answer quickly.</b> What happens when you type a URL? What is load average? How does a pod get an IP? Why is DNS cached and what is a TTL? What is the difference between liveness and readiness? How do you roll back a Terraform change? What is state drift? How does blue-green differ from canary? What is a burn rate? What is cardinality and why can labels be expensive in Prometheus? How do you rotate a leaked secret? Brush up with the other modules in this track and test each answer aloud.</p>
      <p>🟣 <b>Take-home and live exercises.</b> Expect "fix this broken pipeline", "write a script to parse this log and print top error codes", "review this Terraform for risks" (open security groups, no tags, public RDS, state in git), or "here is a Grafana dashboard and an alert, what is wrong?". Practise reading unfamiliar configs and saying what you see in priority order: security, availability, cost, clarity.</p>
      <p>🟣 <b>Salary and level signals.</b> Titles differ: Cloud Support, DevOps Engineer, SRE, Platform Engineer, Cloud Engineer. Look at the job description for the work: on-call, incident ownership, SLO language, Terraform, Kubernetes, and a team size. Ask about the on-call load and toil share; these predict whether the job is sustainable.</p>`,
    aiEra: `<p>🤖 Use AI as a sparring partner: ask it to act as an interviewer, throw a random failure at you ("DNS is fine, pods are Ready, but 20% of requests time out"), then critique your answer for missing steps. Have it grade your STAR stories for specificity and numbers. Do not use it to invent experience: interviewers probe details quickly. In the job itself, interviewers increasingly ask "how do you use AI in operations?" A strong answer: it drafts and summarises, humans approve production changes, outputs are verified, access is least-privilege and audited.</p>`,
    problems: [P({
      t: 'Answer "the site is down" in two minutes',
      l: 'Medium', tags: ['interview', 'troubleshooting', 'incident'], co: ['Amazon', 'Google', 'Datadog'],
      s: `<p>Write the spoken answer you would give to "It is 2 a.m. and checkout is returning 500s for many users. Walk me through what you do." Cover scope and severity, roles, the first checks (including what changed), mitigation, communication and follow-up. Keep it to about 300 words and include two concrete commands.</p>`,
      ex: `<p>A strong answer opens with a plan, names the IC and comms roles, checks changes before deep debugging, mitigates by rollback, and finishes with a blameless postmortem.</p>`,
      bw: `<p>"I would check the logs and restart the servers." No scope, no severity, no roles, no change check, and a restart that may destroy evidence while users still suffer.</p>`,
      q: ['After confirming a bad deploy 20 minutes ago, what is the best next move?', ['Roll back, then investigate while monitoring recovery', 'Spend an hour reading the diff first', 'Restart all pods', 'Wait for more data'], 0, 'Rollback is the fastest safe mitigation. Understand the cause after users are served.'],
      h: ['Hint 1: start with scope and severity, then name who does what.', 'Hint 2: "what changed?" before deep debugging.', 'Hint 3: end with verification by metrics and a postmortem with owners.'],
      a: `<p>"I would first confirm the impact and scope: is it all checkouts or some, and since when? At this scale it is a SEV1, so I would declare an incident, take IC or hand it to the on-call lead, and name an ops lead, a comms lead and a scribe. I would say in the channel: goal is to restore checkout, mitigate first. Next I check what changed in the last hour: <code>kubectl -n shop rollout history deploy/api</code> and the deploy and feature-flag log, plus the cloud status page. If there was a release, I roll back with <code>kubectl -n shop rollout undo deploy/api</code> and watch the error ratio on the dashboard. If nothing changed, I follow the request path: DNS and TLS, load balancer healthy targets, pod readiness and logs for one failing request id, then the database (connections, CPU, replication) and any third party. Meanwhile comms posts a status update within ten minutes and then every twenty. I use the golden signals to see whether traffic, latency or saturation moved first. Once success is back above the SLO threshold for 15 minutes I declare it mitigated, keep watching, and the scribe's timeline goes into a blameless postmortem within a few days with contributing factors and owned action items, such as a missing alert or a slow rollback. I would also check how much error budget we burned and whether the policy triggers a freeze."</p>`,
      cx: `<p>About two minutes spoken. Practise it until the structure is automatic.</p>`,
      f: ['What if the rollback does not help?', 'What would you do if the database is the problem and failover is risky?']
    })]
  });

  // ───────────────────────── Practice problems ─────────────────────────
  practice.push(P({
    t: 'Severity level from impact',
    l: 'Easy', tags: ['incident', 'severity'], co: ['PagerDuty', 'Atlassian'], lang: 'python',
    s: `<p>Write <code>severity(pct_users, data_loss, workaround)</code> returning <code>"SEV1"</code>, <code>"SEV2"</code>, <code>"SEV3"</code> or <code>"SEV4"</code>. Rules, in order: data loss (1) or at least 50% of users affected is SEV1; at least 25% affected, or at least 10% affected with no workaround (workaround = 0), is SEV2; at least 1% is SEV3; otherwise SEV4.</p>`,
    c: `<ul><li>0 ≤ pct_users ≤ 100; data_loss and workaround are 0 or 1.</li><li>${DESIGN}</li></ul>`,
    ex: `<p><code>(60, 0, 0)</code> &rarr; SEV1. <code>(24, 0, 1)</code> &rarr; SEV3: under 25% and a workaround exists. <code>(24, 0, 0)</code> &rarr; SEV2: no workaround.</p>`,
    bw: `<p>Deciding severity by who shouts loudest. The CEO's complaint is not a severity level; user impact and data risk are.</p>`,
    q: ['Which is always SEV1 under this scheme?', ['Any data loss', 'A cosmetic bug', '5% of users with a workaround', 'A slow internal report'], 0, 'Data loss or security breach escalates immediately, whatever the percentage.'],
    h: ['Hint 1: test the strongest rule first, or a 60% outage will match a weaker rule by mistake.', 'Hint 2: SEV2 has two separate ways to qualify; combine them with or, and use not workaround for the second.', 'Hint 3: after SEV1 and SEV2 fail, one percentage check separates SEV3 from SEV4.'],
    a: `<p>Order of checks matters. SEV1 first (data loss or at least 50%). Then SEV2 if the percentage is at least 25, or at least 10 with no workaround. Then SEV3 for at least 1%. Everything else is SEV4. Clear, written severity criteria keep the 2 a.m. discussion short.</p>`,
    code: PY(R`def severity(pct_users, data_loss, workaround):
    """Map impact to a severity level."""
    if data_loss or pct_users >= 50:
        return "SEV1"
    if pct_users >= 25 or (pct_users >= 10 and not workaround):
        return "SEV2"
    if pct_users >= 1:
        return "SEV3"
    return "SEV4"`),
    cx: `<p>A few comparisons, constant time. The cost that matters is human: agreeing the thresholds before the incident so nobody debates them at 2 a.m.</p>`, f: ['Which signals besides percentage should raise severity?', 'Who may downgrade an incident?'],
    tests: { sig: 'int int int -> string', fn: 'severity', names: { python: 'severity' }, cases: [
      [[60, 0, 0], 'SEV1'], [[0, 1, 1], 'SEV1'], [[50, 0, 1], 'SEV1'], [[49, 0, 1], 'SEV2'], [[25, 0, 1], 'SEV2'], [[24, 0, 1], 'SEV3'], [[24, 0, 0], 'SEV2'], [[10, 0, 0], 'SEV2'], [[9, 0, 0], 'SEV3'], [[1, 0, 1], 'SEV3'], [[0, 0, 0], 'SEV4']
    ] }
  }));
  practice.push(P({
    t: 'Write a steady-state hypothesis',
    l: 'Easy', tags: ['chaos', 'hypothesis'], co: ['Netflix'],
    s: `<p>Your API runs 6 pods across 3 zones behind an ALB, with an SLO of 99.9% success and p95 under 300 ms. Write the steady state and a hypothesis for the experiment "terminate one whole zone's pods". Include the stop condition.</p>`,
    ex: `<p>A hypothesis is measurable and written before the test, such as "success stays at or above 99.5%".</p>`,
    bw: `<p>"The system should be fine." Not measurable, not falsifiable, no abort rule.</p>`,
    q: ['A good hypothesis is', ['Measurable and written before the experiment', 'Written after you see the result', 'Only about CPU', 'Optional'], 0, 'If you cannot be wrong, you cannot learn.'],
    h: ['Hint 1: state healthy in SLIs (success rate, p95) rather than CPU or pod counts.', 'Hint 2: capacity: do 4 pods carry the peak?', 'Hint 3: add an abort threshold and a time box.'],
    a: `<p><b>Steady state:</b> success rate at least 99.9% and p95 under 300 ms at the current load, measured at the ALB. <b>Hypothesis:</b> "If all pods in zone b are terminated for 10 minutes, the ALB removes them within 30 seconds and the remaining 4 pods in zones a and c keep success at or above 99.5% and p95 under 450 ms, with CPU under 80%." This only holds if 4 pods can carry peak load, so check the capacity (N+1 for a zone) first. <b>Blast radius:</b> staging first, then production off-peak, 10 minutes. <b>Stop condition:</b> success under 98% for 30 seconds or the fast-burn alert; the IC or experiment owner can abort and restore pods. <b>Observe:</b> time to remove targets, errors during the transition, autoscaling response, recovery after pods return.</p>`,
    cx: `<p>One paragraph to write, but the prerequisite check (can the other zones carry peak load?) can take a day of capacity analysis.</p>`, f: ['What if p95 doubles but success stays high?', 'How do you decide the abort threshold?']
  }));
  practice.push(P({
    t: 'Is it toil? Classify seven tasks',
    l: 'Easy', tags: ['toil'], co: ['Google'],
    s: `<p>Classify each as <b>toil</b>, <b>engineering</b> or <b>overhead</b> and say why: (1) hand-restarting a stuck worker 10 times a week; (2) writing the capacity plan for a launch; (3) the weekly team meeting; (4) approving access requests by editing a file; (5) building a self-service portal for those requests; (6) answering the same "how do I get a log" question; (7) investigating a new kind of outage.</p>`,
    ex: `<p>Toil is manual, repetitive, automatable, tactical and without lasting value.</p>`,
    bw: `<p>"Anything boring is toil." Boring one-off work (a migration) is project work, and hard repetitive work can still be toil.</p>`,
    q: ['Which is NOT toil?', ['Designing a capacity plan for a launch', 'Restarting a stuck worker nightly', 'Editing a file to approve access', 'Copying numbers into a weekly report by hand'], 0, 'Planning uses judgment and leaves lasting value.'],
    h: ['Hint 1: ask whether a script could do it.', 'Hint 2: ask whether doing it leaves the system better.', 'Hint 3: meetings and planning are overhead, a third category that is neither toil nor engineering.'],
    a: `<p>(1) <b>Toil</b>: manual, repetitive, and hides a bug; fix the cause. (2) <b>Engineering</b>: judgment, lasting value. (3) <b>Overhead</b>: needed, but not toil or engineering. (4) <b>Toil</b>: manual and automatable by policy and self-service. (5) <b>Engineering</b>: it removes toil (4). (6) <b>Toil</b> (interrupt-driven, repeated): answer with docs or a bot, or fix the discoverability. (7) <b>Engineering</b>: a novel problem with learning value, even though it is painful. Rank the toil items by hours per week and payback before choosing what to automate.</p>`,
    cx: `<p>Five minutes for seven items. Measuring real hours on a team takes two to four weeks of logging.</p>`, f: ['How do you measure toil on a team?', 'What target share would you set?']
  }));
  practice.push(P({
    t: 'Compute the availability SLI from an access log',
    l: 'Easy', tags: ['SLI', 'bash', 'logs'], co: ['Datadog'], lang: 'bash',
    s: `<p>An nginx access log in the combined format has the HTTP status in field 9. Write a Bash script that prints total requests, the number of 5xx responses, and the availability percentage (non-5xx / total) with 3 decimals. Treat an empty log as 100.000.</p>`,
    c: `<ul><li>Use only standard tools (awk). The script must handle a missing file.</li><li>${DESIGN}</li></ul>`,
    ex: `<p>10,000 lines with 12 responses of 500 or more gives 99.880%.</p>`,
    bw: `<p>Counting lines containing the text "500" with grep. It also matches ports, byte counts and URLs, so the SLI is wrong.</p>`,
    q: ['Why not use grep 500?', ['It matches other fields such as sizes and paths', 'It is slower than awk', 'It cannot read files', 'It is not installed'], 0, 'Use the status field, not a substring.'],
    h: ['Hint 1: in the combined log format the status code is awk field 9, not a substring of the line.', 'Hint 2: 5xx means field 9 matches ^5[0-9][0-9]$; first check it looks like a number.', 'Hint 3: an empty or missing log would divide by zero, so decide what to print in the END block.'],
    a: `<p>Read the status field and count totals and errors in one awk pass. The pattern <code>$9 ~ /^5[0-9][0-9]$/</code> matches only a status field. Guard against an empty log.</p>`,
    code: SH(R`#!/usr/bin/env bash
# sli.sh - availability SLI from an nginx combined log. Usage: ./sli.sh access.log
set -euo pipefail
LOG="~{1:?usage: sli.sh <access.log>}"
[ -r "$LOG" ] || { echo "cannot read $LOG" >&2; exit 1; }
awk '
  $9 ~ /^[0-9][0-9][0-9]$/ { total++; if ($9 ~ /^5[0-9][0-9]$/) bad++ }
  END {
    if (total == 0) { printf "requests=0 5xx=0 availability=100.000%%\n"; exit }
    printf "requests=%d 5xx=%d availability=%.3f%%\n", total, bad, 100 * (total - bad) / total
  }' "$LOG"
`),
    cx: `<p>O(n) lines, one pass.</p>`, f: ['Should 499 (client closed) count as bad?', 'How would you compute it per minute for burn-rate alerting?']
  }));
  practice.push(P({
    t: 'Burn-rate decision: page, ticket or ok',
    l: 'Medium', tags: ['SLO', 'burn rate', 'alerting'], co: ['Google', 'Grafana'], lang: 'python',
    s: `<p>Write <code>burn_action(bad_1h, total_1h, bad_6h, total_6h, budget_ppm)</code>. The error budget is <code>budget_ppm</code> parts per million (99.9% SLO = 1000). Burn rate is (bad / total) divided by the budget. Return <code>"page"</code> if the 1-hour burn is at least 14.4 <b>and</b> the 6-hour burn is at least 6; else <code>"ticket"</code> if the 6-hour burn is at least 1; else <code>"ok"</code>. Use integer arithmetic only.</p>`,
    c: `<ul><li>total counts are positive; bad ≤ total; 1 ≤ budget_ppm ≤ 100000.</li><li>Compare with cross-multiplication, not division, so exact boundaries are exact.</li><li>${DESIGN}</li></ul>`,
    ex: `<p><code>(144, 10000, 600, 60000, 1000)</code> &rarr; page: 1h burn 14.4, 6h burn 10. <code>(143, 10000, ...)</code> &rarr; ticket: 14.3 is just under.</p>`,
    bw: `<p>Alerting on "more than 10 errors". It pages for blips at high traffic and misses slow leaks at low traffic. Burn rate scales with the SLO and the traffic.</p>`,
    q: ['Why require both windows to page?', ['The long one shows it matters, the short one shows it is still happening', 'To save CPU', 'Because Prometheus needs two', 'To double the alerts'], 0, 'Two windows avoid pages for blips and stop alerts soon after recovery.'],
    h: ['Hint 1: burn rate = (bad/total) divided by (ppm/1,000,000).', 'Hint 2: bad/total/(ppm/1e6) &ge; 14.4 &hArr; bad x 1e6 x 10 &ge; 144 x total x ppm.', 'Hint 3: test page first, since a page also satisfies the ticket rule, then ticket, then ok.'],
    a: `<p>Rewrite each threshold as an integer inequality. For burn at least 14.4: <code>bad * 10_000_000 &gt;= 144 * total * ppm</code>. For at least 6: <code>bad * 1_000_000 &gt;= 6 * total * ppm</code>. For at least 1: <code>bad * 1_000_000 &gt;= total * ppm</code>. Page needs the 1h test and the 6h test; ticket needs only the 6h test at 1; otherwise ok. Using multiplication means a burn rate of exactly 14.4 is judged exactly.</p>`,
    code: PY(R`def burn_action(bad_1h, total_1h, bad_6h, total_6h, budget_ppm):
    """Decide page / ticket / ok from burn rates over 1h and 6h (integer maths)."""
    fast_1h = bad_1h * 10_000_000 >= 144 * total_1h * budget_ppm      # burn >= 14.4
    fast_6h = bad_6h * 1_000_000 >= 6 * total_6h * budget_ppm         # burn >= 6
    slow_6h = bad_6h * 1_000_000 >= total_6h * budget_ppm             # burn >= 1
    if fast_1h and fast_6h:
        return "page"
    if slow_6h:
        return "ticket"
    return "ok"`),
    cx: `<p>Three integer comparisons, constant time. Big integers are fine in Python; in Java use long, since bad x 10,000,000 can overflow int.</p>`, f: ['Why is 14.4 the fast threshold for a 30-day window?', 'Add the 5-minute short window to the page rule.'],
    tests: { sig: 'int int int int int -> string', fn: 'burn_action', names: { python: 'burn_action' }, cases: [
      [[144, 10000, 600, 60000, 1000], 'page'], [[143, 10000, 600, 60000, 1000], 'ticket'], [[200, 10000, 300, 60000, 1000], 'ticket'], [[5, 10000, 30, 60000, 1000], 'ok'],
      [[10, 10000, 60, 60000, 1000], 'ticket'], [[0, 10000, 59, 60000, 1000], 'ok'], [[1440, 1000000, 6000, 6000000, 100], 'page'], [[0, 1, 0, 1, 1000], 'ok'], [[500, 10000, 3000, 60000, 1000], 'page']
    ] }
  }));
  practice.push(P({
    t: 'Error budget policy state',
    l: 'Medium', tags: ['error budget', 'policy'], co: ['Google', 'Shopify'], lang: 'python',
    s: `<p>Write <code>budget_state(budget_ppm, window_minutes, bad_minutes)</code>. The budget is <code>window_minutes x budget_ppm / 1,000,000</code> minutes. Return <code>"ok"</code> if less than 50% is used, <code>"caution"</code> if at least 50% but under 100%, and <code>"freeze"</code> if 100% or more. Use integers only.</p>`,
    c: `<ul><li>1 ≤ budget_ppm ≤ 100000; window_minutes ≥ 1; bad_minutes ≥ 0.</li><li>${DESIGN}</li></ul>`,
    ex: `<p>99.9% over 30 days (ppm 1000, 43200 minutes): budget 43.2 min. 21 &rarr; ok (48.6%). 22 &rarr; caution. 44 &rarr; freeze.</p>`,
    bw: `<p>Rounding the budget to 43 minutes. With 43 minutes of downtime you would call it a freeze, though 0.5% of the budget is left. Exact arithmetic avoids pointless arguments.</p>`,
    q: ['With a 99.99% SLO over 30 days, what is the first bad-minute count that causes a freeze?', ['5', '4', '43', '44'], 0, 'Budget is 4.32 minutes; 4 minutes is 92.6%, 5 minutes is over 100%.'],
    h: ['Hint 1: used >= budget &hArr; bad x 1e6 >= window x ppm.', 'Hint 2: half the budget: bad x 1e6 x 2 >= window x ppm.', 'Hint 3: test freeze first, because a frozen state also passes the half-budget test.'],
    a: `<p>Compare scaled integers: budget = <code>window * ppm</code> (in millionths of a minute) and used = <code>bad * 1_000_000</code>. If used is at least the budget, return freeze. If twice the used amount is at least the budget (so used is at least half), return caution. Otherwise ok.</p>`,
    code: PY(R`def budget_state(budget_ppm, window_minutes, bad_minutes):
    """ok below 50% of the error budget, caution to 100%, freeze at or beyond 100%."""
    budget = window_minutes * budget_ppm      # budget in millionths of a minute
    used = bad_minutes * 1_000_000
    if used >= budget:
        return "freeze"
    if used * 2 >= budget:
        return "caution"
    return "ok"`),
    cx: `<p>Two integer comparisons, constant time. Scaling both sides by one million keeps the 50% and 100% boundaries exact with no rounding.</p>`, f: ['What exceptions should a policy allow, and who signs them?', 'How does a rolling window change when a freeze ends?'],
    tests: { sig: 'int int int -> string', fn: 'budget_state', names: { python: 'budget_state' }, cases: [
      [[1000, 43200, 0], 'ok'], [[1000, 43200, 21], 'ok'], [[1000, 43200, 22], 'caution'], [[1000, 43200, 43], 'caution'], [[1000, 43200, 44], 'freeze'],
      [[100, 43200, 2], 'ok'], [[100, 43200, 3], 'caution'], [[100, 43200, 4], 'caution'], [[100, 43200, 5], 'freeze'],
      [[5000, 10080, 25], 'ok'], [[5000, 10080, 26], 'caution'], [[5000, 10080, 50], 'caution'], [[5000, 10080, 51], 'freeze']
    ] }
  }));
  practice.push(P({
    t: 'MTTR and MTBF from an incident log',
    l: 'Medium', tags: ['MTTR', 'MTBF', 'incident'], co: ['Atlassian', 'Cloudflare'], lang: 'python',
    s: `<p>Incidents are <code>[start, end]</code> minutes inside an observation window of <code>window</code> minutes. They do not overlap. Write <code>mttr_mtbf(incidents, window)</code> returning <code>[MTTR, MTBF]</code> as integers (floor division). MTTR is the mean incident duration. MTBF is the mean up time between failures: (window - total downtime) divided by the number of incidents. With no incidents return <code>[0, window]</code>.</p>`,
    c: `<ul><li>0 ≤ incidents ≤ 1000; 0 ≤ start ≤ end ≤ window ≤ 10<sup>7</sup>.</li><li>${DESIGN}</li></ul>`,
    ex: `<p><code>([[0,30],[100,160]], 1000)</code> &rarr; durations 30 and 60, total 90: MTTR 45; up time 910 over 2 = <span class="c-g">[45, 455]</span>.</p>`,
    bw: `<p>Quoting MTTR alone. Nine 15-minute incidents and one 6-hour incident average 49.5 minutes, which describes neither the typical case nor the disaster. Report the median and the worst too.</p>`,
    q: ['What does one very long incident do to MTTR?', ['It pulls the mean up a lot', 'Nothing', 'It lowers it', 'It sets MTTR equal to the median'], 0, 'The mean is sensitive to outliers; show the median and the maximum as well.'],
    h: ['Hint 1: total downtime is the sum of (end - start).', 'Hint 2: MTTR is the total downtime divided by the number of incidents.', 'Hint 3: MTBF = (window - total) // count; handle zero incidents.'],
    a: `<p>Sum the durations. If the list is empty, return <code>[0, window]</code>. Otherwise MTTR is total // n and MTBF is (window - total) // n. These are one-line formulas, but the interview insight is the limitation: means hide distributions, so pair them with the median, the maximum and the count of high-severity incidents.</p>`,
    code: PY(R`def mttr_mtbf(incidents, window):
    """Return [MTTR, MTBF] in minutes (floor division)."""
    n = len(incidents)
    if n == 0:
        return [0, window]
    down = sum(end - start for start, end in incidents)
    return [down // n, (window - down) // n]`),
    cx: `<p>O(n) for the sum over n incidents and O(1) extra space. Parsing and cleaning a real incident log is far more work than this arithmetic.</p>`, f: ['Why can MTTR be a bad target to optimise?', 'What metric would you add to see repeat incidents?'],
    tests: { sig: 'int[][] int -> int[]', fn: 'mttr_mtbf', names: { python: 'mttr_mtbf' }, cases: [
      [[[[0, 30], [100, 160]], 1000], [45, 455]], [[[], 500], [0, 500]], [[[[10, 25]], 100], [15, 85]], [[[[0, 10], [20, 31], [50, 62]], 200], [11, 55]],
      [[[[5, 6]], 10], [1, 9]], [[[[0, 7], [10, 12]], 100], [4, 45]], [[[[0, 1440]], 1440], [1440, 0]]
    ] }
  }));
  practice.push(P({
    t: 'Instances needed with headroom and zone-loss safety',
    l: 'Medium', tags: ['capacity', 'headroom', 'availability zones'], co: ['Amazon', 'Shopify'], lang: 'python',
    s: `<p>Write <code>instances_needed(peak_rps, per_instance_rps, headroom_pct, zones)</code>. First compute the base fleet: the smallest integer number of instances (at least 1) that serves <code>peak_rps x (100 + headroom_pct) / 100</code>. If <code>zones</code> is 1, return the base. Otherwise the fleet must still carry that load after losing any one zone: each zone gets <code>ceil(base / (zones - 1))</code> instances; return that times <code>zones</code>.</p>`,
    c: `<ul><li>0 ≤ peak_rps ≤ 10<sup>6</sup>; 1 ≤ per_instance_rps ≤ 10<sup>5</sup>; 0 ≤ headroom_pct ≤ 300; 1 ≤ zones ≤ 6.</li><li>Use integer arithmetic.</li><li>${DESIGN}</li></ul>`,
    ex: `<p><code>(1000, 100, 30, 3)</code>: need 1300 rps &rarr; base 13; per zone ceil(13/2) = 7; total <span class="c-g">21</span>.</p>`,
    bw: `<p>Dividing peak by capacity and stopping: 10 instances at 100% utilisation, no headroom, and one zone failure takes you down. The answer needs both layers of safety.</p>`,
    q: ['Why is 3 zones with 7 per zone (21) needed instead of just 13?', ['After losing a zone, the 14 left must still cover the 13 needed', 'Zones double the load', 'It is cheaper', 'Because 21 is odd'], 0, 'N+1 at zone level: the surviving zones must carry the whole load.'],
    h: ['Hint 1: ceil(a/b) with integers is (a + b - 1) // b.', 'Hint 2: base load in rps x 100 avoids fractions.', 'Hint 3: always at least 1 base instance, even for zero traffic.'],
    a: `<p>Base = ceil(peak x (100 + h) / (100 x per)), at least 1. For one zone, that is the answer. For more, size one zone so that the other (zones - 1) zones together hold the base: per_zone = ceil(base / (zones - 1)); total = per_zone x zones. The cost of zone safety is total/base, which is 1.5x for 3 zones and 1.33x for 4 zones, so more zones lower the overhead of surviving one zone loss.</p>`,
    code: PY(R`def instances_needed(peak_rps, per_instance_rps, headroom_pct, zones):
    """Total instances so the fleet carries peak + headroom even after losing one zone."""
    denom = 100 * per_instance_rps
    base = max(1, (peak_rps * (100 + headroom_pct) + denom - 1) // denom)
    if zones < 2:
        return base
    per_zone = (base + zones - 2) // (zones - 1)       # ceil(base / (zones - 1))
    return per_zone * zones`),
    cx: `<p>A handful of integer operations, constant time. The expensive part is the load test that gives the per-instance rps figure.</p>`, f: ['Why does the overhead shrink with more zones?', 'What other limits (quotas, DB connections) could cap this?'],
    tests: { sig: 'int int int int -> int', fn: 'instances_needed', names: { python: 'instances_needed' }, cases: [
      [[1000, 100, 30, 3], 21], [[1000, 100, 30, 1], 13], [[900, 100, 0, 3], 15], [[50, 100, 20, 2], 2], [[5000, 250, 25, 3], 39], [[0, 100, 30, 3], 3], [[12000, 400, 40, 4], 56], [[101, 100, 0, 1], 2]
    ] }
  }));
  practice.push(P({
    t: 'Write the runbook for a HighLatency alert',
    l: 'Medium', tags: ['runbook', 'on-call'], co: ['Stripe', 'Datadog'],
    s: `<p>The alert <code>ApiHighLatencyP95</code> fires when p95 latency is over 800 ms for 10 minutes (SLO: p95 under 400 ms). Write the runbook a new on-call engineer could follow at 3 a.m.: meaning, confirmation, ordered checks, mitigations, escalation, and when to declare an incident.</p>`,
    ex: `<p>Good runbooks have copy-paste commands, an order, and a stopping rule.</p>`,
    bw: `<p>"Check the logs and see what is wrong." It assumes the knowledge the runbook should provide.</p>`,
    q: ['The best FIRST mitigation for latency right after a deploy is', ['Roll back the deploy', 'Add more CPUs for a week', 'Raise the alert threshold', 'Disable monitoring'], 0, 'Rollback is fast, reversible and tests the change theory.'],
    h: ['Hint 1: open with what users feel, so the reader knows how urgent it really is.', 'Hint 2: check changes, then saturation, then dependencies.', 'Hint 3: give a time limit before escalating.'],
    a: `<p><b>Meaning:</b> half of users with a slow tail may see pages taking over 800 ms; checkout may time out. <b>Confirm:</b> open the latency panel by endpoint, compare p50 and p95: only p95 high suggests a tail issue; both high suggests overall saturation. <b>Checks, in order:</b> (1) changes: <code>kubectl -n shop rollout history deploy/api</code> and the flag log in the last hour; (2) saturation: CPU throttling, memory, pod count vs HPA max, connection pool usage; (3) dependencies: DB latency and slow queries, cache hit rate, third-party status; (4) traffic: is rps unusually high, or a single client? <b>Mitigate:</b> roll back a recent release; raise HPA max or scale replicas (<code>kubectl scale</code>) if saturated; disable the newest flag; enable load shedding or rate-limit a noisy client; if DB is slow, kill long-running queries only if you know which. <b>Escalate:</b> if not improving in 15 minutes, page the secondary; if DB or provider issue, page that owner. <b>Declare an incident</b> (SEV2) if the SLO fast-burn alert also fires or users report checkout failures; SEV1 if checkout success under 90%. <b>After:</b> note times, open tickets for any manual step.</p>`,
    cx: `<p>One page to write, but a day to verify: every command must be run once in staging, and it needs rechecking after each big change.</p>`, f: ['How would you test the runbook?', 'Which steps should be automated first?']
  }));
  practice.push(P({
    t: 'Rewrite a postmortem that blamed a person',
    l: 'Hard', tags: ['postmortem', 'blameless'], co: ['Google', 'Etsy'],
    s: `<p>Draft: "On March 3 Dana ran a cleanup script against production instead of staging and deleted the orders cache, causing a 52-minute outage. Dana should be more careful and double-check the environment. Action: Dana will attend a training." Rewrite it as a blameless postmortem with a summary, a short timeline, contributing factors (use 5 whys) and 4 actions with owners and dates. Placeholders for names and dates are fine.</p>`,
    ex: `<p>The aim is system causes: how could a normal, careful person end up running that script on production, and why was the impact so long?</p>`,
    bw: `<p>Keeping the sentence "Dana should be more careful". The next engineer will hide mistakes, and the system is still unsafe.</p>`,
    q: ['Which action is most useful?', ['Require the script to refuse production unless a confirmation flag and a change ticket are given', 'Tell people to be careful', 'Ban cleanup scripts', 'Add a meeting'], 0, 'A guardrail removes the whole class of mistake; reminders do not.'],
    h: ['Hint 1: what in the system made the wrong target easy?', 'Hint 2: why was recovery slow (52 minutes)?', 'Hint 3: owners and dates on every action; type each as prevent, detect or mitigate.'],
    a: `<p><b>Summary.</b> On 03-03 at 14:10 UTC a maintenance script deleted the orders cache in production. Checkout was degraded for 52 minutes; about 18% of orders failed or were delayed; 41% of the monthly error budget was used. <b>Timeline (UTC).</b> 14:10 script run; 14:13 latency alert; 14:17 acknowledged; 14:25 cause identified from shell history; 14:31 decision to warm cache by replay; 15:02 hit rate normal. <b>5 whys.</b> Why the outage? The cache was empty and the DB was overloaded by the cold cache. Why empty? A script flushed it. Why did it run on production? The terminal profile looked the same for staging and prod and the script used the current kube context silently. Why no stop? No confirmation, no environment guard, no dry-run. Why slow recovery? No cache-warming procedure; the runbook assumed the cache never empties. <b>Contributing factors.</b> same-looking contexts; no guard in the script; no protection for the DB under a cold cache (no rate limit, no request coalescing); alert only on latency, not on cache hit rate; runbook gap. <b>What went well.</b> alert in 3 minutes; shell history helped; clear communications. <b>Lucky.</b> it was off-peak. <b>Actions.</b> A1 (prevent) scripts print the target cluster and require <code>--env</code> plus a typed confirmation for production, Priya, 03-17; A2 (prevent) separate prod access with a distinct role and a coloured prompt, Sam, 03-24; A3 (mitigate) add request coalescing and a rate limit to protect the DB on a cold cache, Omar, 04-07; A4 (detect) alert on cache hit rate below 60% for 5 minutes and add the warm-up steps to the runbook, Lena, 03-20. Dana is thanked for the clear account of what happened and presents the lessons.</p>`,
    cx: `<p>A one to two page document; the review meeting takes 45 minutes.</p>`, f: ['How do you handle a postmortem where someone really was negligent?', 'How do you follow up on actions after six weeks?']
  }));
  practice.push(P({
    t: 'Black Friday capacity plan',
    l: 'Hard', tags: ['capacity', 'planning', 'load testing'], co: ['Shopify', 'Amazon'],
    s: `<p>Normal peak is 800 rps on 12 API instances (each handles about 100 rps at good latency), with a Postgres db.r6g.xlarge (about 60% CPU at normal peak) and a payment provider limited to 300 requests per second. Marketing expects 6x traffic on Black Friday for a 4-hour peak. Write the capacity plan: the numbers, the bottlenecks, the load test, the scaling plan, the risks and a day-of runbook.</p>`,
    ex: `<p>The key is to find the layer that breaks first: the database and the provider limit come before the API tier.</p>`,
    bw: `<p>"Multiply the instances by 6 and turn on autoscaling." The database at 60% CPU cannot carry 6x, the payment provider caps out at 300 rps, and autoscaling takes minutes while a flash sale takes seconds.</p>`,
    q: ['What is the first thing to check in this plan?', ['The slowest-scaling layers: the database and third-party limits', 'The color of the dashboard', 'The number of Slack channels', 'Whether to use Kubernetes'], 0, 'The tightest layer sets real capacity; app servers are the easy part.'],
    h: ['Hint 1: the forecast is 800 x 6 = 4,800 rps before any headroom is added.', 'Hint 2: compute each layer against that number with headroom.', 'Hint 3: list what you pre-scale, what you cache, and what you shed.'],
    a: `<p><b>Numbers.</b> Peak forecast 4,800 rps; add 30% headroom = 6,240 rps. API tier: 6,240 / 100 = 63 instances; with 3 zones and zone-loss safety each zone needs ceil(63/2) = 32 so 96 total (check the vCPU quota first). <b>Database:</b> at 60% CPU for 800 rps, a straight 6x is 360%: impossible on one primary. Plan: cache reads (product pages, price lookups; hit rate 90% turns 4,800 into about 480 uncached reads), add 2 read replicas, move reporting off the primary, use RDS Proxy or pooling, scale the instance class up the week before, and queue non-critical writes. <b>Payment provider:</b> only 300 rps. Expect about 5-10% of requests to be orders: roughly 240-480 rps, so we sit at or over the cap. Ask the provider for a higher limit in writing four weeks ahead; add a queue with backpressure ("order accepted, payment processing"), retry budgets and a second provider fallback. <b>Load test:</b> k6 open-model arrival-rate test in a production-like environment, ramp to 1x, 2x, 4x, 6x and 7x; hold the peak 30 minutes; record the knee; also a soak at 3x for 2 hours; chaos: kill one zone at 4x. <b>Scaling:</b> pre-scale API to 96 instances and the DB class two hours before the sale, keep HPA for surprises, check quotas (vCPU, ENIs, ALB targets), warm the cache, and pre-warm the load balancer by contacting AWS or ramping traffic. <b>Risks:</b> cache stampede, connection exhaustion, quota limits, provider caps, a bad deploy on the day (code freeze from 3 days before). <b>Day-of runbook:</b> war room with an IC, dashboards on rps, p95, errors, DB CPU and connections, queue depth, provider errors; shed load in order (recommendations, then search suggestions, then non-critical writes); thresholds for each action; a rollback and a communications plan; a review the week after with the numbers.</p>`,
    cx: `<p>Plan takes a week; the load tests take two days.</p>`, f: ['How would you size the cache?', 'What do you do if the provider refuses to raise the limit?']
  }));
  practice.push(P({
    t: 'Plan a zone-failure game day',
    l: 'Hard', tags: ['chaos', 'game day', 'DR'], co: ['Netflix', 'Atlassian'],
    s: `<p>Plan a half-day game day to prove your shop (ALB, EKS in 3 zones, RDS Multi-AZ, one NAT gateway) survives losing one availability zone. Include the goals, roles, preconditions, the schedule, the faults in order, the success criteria, the abort rules, what you will record and how you will follow up.</p>`,
    ex: `<p>Expect the NAT gateway to be a finding. The plan should make findings welcome.</p>`,
    bw: `<p>"We will turn off a zone on Friday afternoon and see." No roles, no abort, no scope, no follow-up, and a weekend to repair.</p>`,
    q: ['Which precondition matters most?', ['Error budget available, capacity for N-1 zone, alerts working, and everyone informed', 'A new dashboard theme', 'A free lunch', 'None'], 0, 'Chaos spends budget and risks users; safeguards come first.'],
    h: ['Hint 1: make the drill look like a real incident: IC, comms, scribe.', 'Hint 2: order the faults from small (one pod) to big (a zone, then a failover).', 'Hint 3: define pass criteria numerically and plan the follow-up.'],
    a: `<p><b>Goal:</b> prove users keep checking out when zone a disappears, and rehearse the response. <b>Preconditions:</b> error budget below 50% used; capacity for the loss of a zone confirmed (instances_needed result); burn-rate alerts and dashboards verified; rollback tested; support and execs informed; staging rehearsal done; Tuesday 10:00, no deploys that day. <b>Roles:</b> game master (injects faults), IC, ops lead, comms, scribe, observers. <b>Schedule:</b> 10:00 briefing and hypotheses; 10:20 steady-state check; 10:30 fault 1: terminate pods in zone a nodes (expect no user impact); 10:50 fault 2: block the zone a subnets or stop the zone a node group (FIS network disruption or stop instances), expect ALB to drain and EKS to reschedule; 11:20 fault 3: force an RDS failover (expect 60 to 120 s blip); 11:50 recover, 12:00 hot wash-up. <b>Success criteria:</b> success rate at least 99.5%, p95 under 600 ms, no data loss, alert within 3 minutes, failover time recorded, no manual heroics beyond the runbook. <b>Abort:</b> success under 97% for 60 s, fast-burn page, DB errors beyond 3 minutes, or any participant calls abort; the game master restores everything with a prepared command. <b>Expected findings:</b> a single NAT gateway in zone a breaks outbound calls from zones b and c (fix with a NAT per zone), pods that cannot reschedule because of zone-pinned PVCs, DNS caching on DB failover. <b>Record:</b> a timeline, graphs, decisions, and gaps. <b>Follow-up:</b> a blameless review within three days, actions with owners and dates, and a repeat drill in a quarter to prove the fixes.</p>`,
    cx: `<p>Three hours of drill plus a day of preparation.</p>`, f: ['How would you test a Region loss?', 'How do you run this without touching production?']
  }));
  practice.push(P({
    t: 'Review this AWS capstone Terraform for risks',
    l: 'Hard', tags: ['terraform', 'security', 'cost', 'review'], co: ['HashiCorp', 'AWS'], lang: 'hcl',
    s: `<p>A candidate shares this Terraform for their capstone. List every risk (security, cost, reliability, hygiene) and say how to fix each.</p>
      <pre>provider "aws" { region = "eu-west-1"
  access_key = "AKIAEXAMPLEEXAMPLE1"
  secret_key = "wJalrEXAMPLEEXAMPLEKEY" }
resource "aws_db_instance" "db" {
  engine = "postgres"  instance_class = "db.m5.2xlarge"
  username = "admin"  password = "admin123"
  publicly_accessible = true  skip_final_snapshot = true }
resource "aws_security_group" "all" {
  ingress { from_port = 0 to_port = 65535 protocol = "tcp" cidr_blocks = ["0.0.0.0/0"] } }
module "eks" { source = "terraform-aws-modules/eks/aws" cluster_name = "cap" }
# state kept in ./terraform.tfstate, committed to git. No budget, no tags.</pre>`,
    c: `<ul><li>The credentials above are fake examples; treat them as real for the review.</li></ul>`,
    ex: `<p>A complete answer groups findings by severity and gives the replacement pattern for each.</p>`,
    bw: `<p>"Looks fine, it runs." It would leak credentials in git, expose a database to the internet, and cost a lot a month.</p>`,
    q: ['The most urgent finding is', ['Credentials in code, committed to git (rotate them now)', 'Missing tags', 'The region name', 'The module has no version'], 0, 'Leaked keys are exploited within minutes. Revoke and rotate first, then clean history.'],
    h: ['Hint 1: scan for secrets first, because leaked keys are the one finding that cannot wait.', 'Hint 2: network exposure: DB public, SG open to the world.', 'Hint 3: then cost, state, versions and tags.'],
    a: `<p><b>Critical.</b> (1) Hardcoded AWS keys: assume compromised; deactivate and rotate, remove from git history, and authenticate by environment variables, an SSO profile or OIDC role. (2) DB password <code>admin123</code> in code and state: use <code>manage_master_user_password = true</code> (Secrets Manager) and never print it. (3) <code>publicly_accessible = true</code>: put RDS in private database subnets, set to false. (4) Security group open on all ports to the world: allow only 5432 from the cluster node security group. (5) State file in git contains secrets: use an S3 backend with encryption and locking (DynamoDB or S3 lockfile), add <code>*.tfstate</code> to <code>.gitignore</code>, and remove it from history. <b>Cost.</b> (6) <code>db.m5.2xlarge</code> is far larger than needed: use <code>db.t4g.micro</code>. (7) No budget alarm: add <code>aws_budgets_budget</code> first. (8) EKS with defaults and no node limits: set the node group size and instance type. (9) <code>skip_final_snapshot = true</code> is acceptable only in a lab; note it. <b>Hygiene and reliability.</b> (10) Pin provider and module versions. (11) Add <code>default_tags</code> (project, owner, ttl). (12) No backup retention: set a retention period and enable storage encryption. (13) Add <code>terraform fmt</code>, <code>validate</code>, tfsec/Checkov and a plan review in CI. (14) Document teardown.</p>`,
    cx: `<p>A 20-minute review; fixes take an afternoon.</p>`, f: ['How would you find secrets already committed in git history?', 'Which of these would a policy-as-code check catch automatically?']
  }));
  practice.push(P({
    t: 'SRE system design: a 99.95% checkout API',
    l: 'Hard', tags: ['system design', 'SLO', 'reliability'], co: ['Amazon', 'Stripe', 'Google'],
    s: `<p>Design the checkout API for an online shop with an SLO of 99.95% over 30 days, 3,000 rps at peak, p95 under 300 ms, a payment provider you do not control (99.9% availability), and a team of eight engineers. Present it as an SRE: SLO and budget, architecture, failure modes, capacity, deploys, observability, data safety and the trade-offs you accept.</p>`,
    ex: `<p>Start from the number: 99.95% is 21.6 minutes of budget. The provider alone (99.9%) cannot support that on the critical path.</p>`,
    bw: `<p>Drawing boxes (load balancer, service, database) and saying "it scales". No SLO maths, no failure analysis, no mention that the provider caps availability.</p>`,
    q: ['The payment provider has 99.9% availability and sits on the critical path. The best design response is', ['Queue payments asynchronously with retries and idempotency so the user path no longer depends on it, plus a fallback provider', 'Promise 99.99% anyway', 'Ignore it', 'Run more API pods'], 0, 'You cannot exceed a hard dependency unless you remove it from the critical path or add a fallback.'],
    h: ['Hint 1: error budget = 21.6 minutes per 30 days.', 'Hint 2: serial dependencies multiply: 99.9% provider alone is 43 minutes of budget.', 'Hint 3: decouple with a queue and idempotency.'],
    a: `<p><b>SLO and budget.</b> 99.95% = 21.6 minutes/month. SLI: share of checkout requests that return success in under 300 ms (measured at the ALB) and share of accepted orders that reach "paid" within 5 minutes. Budget policy with freeze signed by product and engineering. <b>Architecture.</b> CDN and ALB across 3 zones; stateless checkout API on Kubernetes; Postgres Multi-AZ primary with read replicas for reads; Redis for sessions and cart (replicated); order accepted into the database and an outbox, then a queue (SQS) feeds a payment worker; the user sees "order received, confirming payment" instead of waiting. The payment worker calls provider A with idempotency keys, a retry budget and a circuit breaker; on failure it falls back to provider B. <b>Failure modes.</b> pod, node, zone (capacity for N-1 zone: instances_needed), DB failover (60-120 s: apps retry with backoff, writes buffered in the queue), cache loss (rate limit and coalescing protect the DB), provider outage (queue absorbs, user path unaffected), bad deploy (canary 1/10/100% with SLO gating, one-click rollback), poison messages (DLQ and alert). <b>Capacity.</b> peak 3,000 rps; 30% headroom; per-instance load test result; zone loss; Little's law for pools; quotas; autoscaling plus scheduled pre-scale for sales. <b>Observability.</b> golden signals, burn-rate alerts (14.4/6/1), tracing, queue depth and age, runbooks per page; on-call of eight with a 12-hour shift limit of two pages. <b>Data safety.</b> PITR, cross-region snapshot copy, quarterly restore drill, RPO 5 minutes and RTO 1 hour; no multi-region active-active at this size, which I would revisit if the SLO moved to 99.99%. <b>Trade-offs.</b> eventual confirmation of payment for availability; extra cost of 3 zones and a second provider; complexity of async flows (needs idempotency and reconciliation). <b>Not covered / risks.</b> Region loss, provider bugs, shared control-plane failures. <b>Operate.</b> game day each quarter, postmortems, toil under 50%.</p>`,
    cx: `<p>Whiteboard version: 35 minutes; written version: 2 pages.</p>`, f: ['What changes if the SLO becomes 99.99%?', 'How would you test the queue-based fallback?']
  }));

  // ───────────────────────── Quiz ─────────────────────────
  function Q(q, options, answer, explain) { quiz.push({ q: q, options: options, answer: answer, explain: explain }); }
  Q('A service has a 99.9% SLO over 30 days. How large is the error budget?', ['4.32 minutes', '43.2 minutes', '432 minutes', '7.2 hours'], 1, '30 days = 43,200 minutes; 0.1% of that is 43.2 minutes. 99.99% would be 4.32 and 99% would be 432.');
  Q('Which statement about SLO, SLI and SLA is correct?', ['The SLA is the internal target and the SLO is the contract', 'The SLI is the measurement, the SLO the target for it, and the SLA a contract with consequences', 'All three mean the same thing', 'The SLO is always looser than the SLA'], 1, 'SLI = measurement (good events / valid events). SLO = target. SLA = contract, usually looser than the SLO so you notice trouble before you owe money.');
  Q('An error budget is fully spent mid-quarter. What does a well-written budget policy say?', ['Keep shipping features but add more alerts', 'Feature freeze: only reliability work, rollbacks and security fixes until the budget recovers or leaders sign an exception', 'Lower the SLO immediately', 'Fire the on-call engineer'], 1, 'The policy is agreed in advance. It turns the argument into a rule. Changing the SLO afterwards defeats the purpose.');
  Q('A 1-hour burn rate of 14.4 on a 30-day SLO means', ['The service is 14.4% down', 'About 2% of the monthly budget is being spent each hour', 'The budget will last 14.4 days', 'There are 14.4 errors per minute'], 1, '14.4 x 1 h / 720 h = 2% of the budget per hour. At that rate the 30-day budget is gone in about 2.1 days.');
  Q('In an incident, what is the main job of the Incident Commander?', ['Typing the fix on the production server', 'Owning the response: setting goals, assigning roles and tasks, making decisions, keeping the call calm', 'Writing the postmortem alone', 'Talking to the press'], 1, 'The IC coordinates. If the IC dives into debugging, nobody has the big picture. Ops lead fixes; comms lead updates; scribe records.');
  Q('A postmortem says "Root cause: Alex pushed a bad config". What is the best response?', ['Accept it; it is clear and short', 'Rewrite it blamelessly: how did the system let a bad config reach production (no validation, no canary), with owned actions', 'Delete the postmortem', 'Add a training session for Alex only'], 1, 'Blame hides facts and teaches people to conceal mistakes. Fix the guardrails that made the mistake easy and the impact large.');
  Q('Requests arrive at 400 per second and each takes 150 ms on average. By Little\'s law, how many are in flight on average?', ['6', '60', '600', '2,667'], 1, 'L = lambda x W = 400 x 0.15 = 60 requests in flight.');
  Q('Why does latency rise sharply as a server approaches 95% utilisation?', ['Networks get slower at night', 'Queueing: waiting time grows roughly like 1/(1 - utilisation), so small extra load causes large delay', 'CPUs run slower when hot', 'The load balancer adds delay'], 1, 'At 50% busy the multiplier is 2x; at 90% it is 10x; at 95% it is 20x. Headroom keeps you on the flat part of the curve.');
  Q('Which of these is toil?', ['Designing the capacity plan for a launch', 'Manually rotating a certificate every month', 'Writing a postmortem', 'Building a self-service portal'], 1, 'Manual, repetitive, automatable, with no lasting value: toil. The other three are engineering work.');
  Q('A task takes 30 minutes, happens 10 times a week, and automation (40 hours to build) removes all of it. What is the payback?', ['4 weeks', '8 weeks', '14 weeks', '40 weeks'], 1, 'Saved: 30 x 10 = 300 minutes = 5 hours per week. Payback = 40 / 5 = 8 weeks.');
  Q('Which is a proper chaos experiment?', ['Deleting a random production database on Friday evening', 'Writing a steady-state hypothesis, limiting the blast radius, adding an abort condition, then killing one pod', 'Running a load test with no monitoring', 'Rebooting servers to see what happens'], 1, 'Hypothesis, small blast radius, stop condition and observation define the experiment. Anything else is just breaking things.');
  Q('Which tool is a managed fault-injection service on AWS?', ['Chaos Mesh', 'AWS Fault Injection Service (FIS)', 'Locust', 'Prometheus'], 1, 'FIS runs experiments with an IAM role and CloudWatch stop conditions. Chaos Mesh is for Kubernetes; Locust is a load tool; Prometheus is monitoring.');
  Q('For the optional AWS variant of the capstone, what comes FIRST?', ['terraform apply for the EKS cluster', 'A budget alarm in a sandbox account, with tags and a teardown plan', 'A production-sized database', 'Buying a domain'], 1, 'Cost controls before resources. A forgotten EKS + NAT + ALB + RDS stack costs roughly 200 USD a month.');
  Q('How should a GitHub Actions job deploy to AWS without long-lived keys?', ['Store an access key in a repository secret forever', 'Use OIDC: the job gets a short-lived token and assumes an IAM role whose trust policy matches the repo and branch', 'Commit the keys in a private repo', 'Email the keys to the runner'], 1, 'OIDC federation gives temporary credentials with no secret to leak or rotate.');

  // ───────────────────────── Interview ─────────────────────────
  function I(q, level, a, f) { interview.push({ q: q, level: level, a: a, followUps: f }); }
  I('What is an error budget and how do you use it in practice?', 'I', `<p>An error budget is the amount of unreliability the SLO allows: 100% minus the SLO. For 99.9% over 30 days that is 43.2 minutes, or one bad request in a thousand. I use it as a shared referee between product and engineering. While budget remains, we ship and experiment. As it runs down we slow risky changes. When it is exhausted a pre-agreed policy applies: a feature freeze on that service, with only reliability work, rollbacks and security fixes shipping until the window recovers or leaders sign an exception. I alert on burn rate with two windows so slow leaks and fast outages are both caught. The policy is signed before the bad day; that is what makes it work.</p>`, ['How would you set the SLO for a brand-new service?', 'What if the budget is never spent?']);
  I('Walk me through a SEV1: "checkout is down at 2 a.m."', 'I', `<p>I first acknowledge and scope: who is affected, since when, how I know. If user impact is large I declare a SEV1, take or hand over the Incident Commander role, and name an ops lead, a comms lead and a scribe. Goal: restore service, mitigate first. I check what changed in the last hour (deploys, flags, config, cloud events) because a rollback is the fastest safe mitigation. If nothing changed, I follow the request path: DNS and TLS, load balancer targets, app errors, database, cache, third parties, saturation. Comms posts a status update within about 10 minutes and then every 20. I verify recovery with SLO metrics, not feelings, and schedule a blameless postmortem with owned actions.</p>`, ['What if the rollback does not fix it?', 'How do you hand over the IC role after four hours?']);
  I('How do you write a blameless postmortem, and what makes one good?', 'I', `<p>It has a summary and impact (users, duration, budget burned), a UTC timeline (start, detect, ack, mitigate, resolve, key decisions with the information available then), a root cause plus contributing factors using 5 whys until a fixable system gap appears, what went well, what went badly, where we got lucky, and 3 to 6 action items. Each action has an owner, a due date, a ticket and a type: prevent, detect or mitigate. It never names a person as the cause; it asks how the system allowed a normal person to make that mistake. I track actions publicly and review overdue ones weekly, because a postmortem without finished actions is just a story.</p>`, ['How would you handle a postmortem where someone broke a clear rule?', 'How do you decide which actions are worth doing?']);
  I('Explain Little\'s law and a practical use of it.', 'I', `<p>Little's law says the average number of items in a stable system equals the arrival rate times the average time each item spends there: L = lambda x W. If 200 requests per second each take 250 ms, about 50 are in flight. I use it to size thread and connection pools, to check queue depth, and to see why a slow dependency exhausts a pool: the same traffic with ten times the latency means ten times the in-flight requests. It works for averages in a steady state, so I still verify with a load test, watch percentiles, and leave headroom because queueing delay grows quickly as utilisation approaches 100%.</p>`, ['How does it relate to the 1/(1-rho) queueing curve?', 'How would you size a database pool with it?']);
  I('How do you plan capacity for a big event like Black Friday?', 'A', `<p>I start from a forecast (last year's peak, growth, campaign multipliers) and measure per-instance capacity with a load test. I add headroom (often 30%), plan for losing a zone, and check every layer for the real bottleneck: database, cache, queues, third-party rate limits, NAT and load balancer limits, and cloud quotas. I run staged load tests to 1x, 2x, 4x and beyond, record the knee, and test failure (kill a zone at load). I pre-scale before the event because autoscaling takes minutes, set a code freeze, prepare a war room and a runbook with load-shedding steps in priority order, and review the numbers afterwards.</p>`, ['Which layer usually breaks first and why?', 'How do you pre-warm a load balancer?']);
  I('What is toil, and how do you decide what to automate?', 'I', `<p>Toil is manual, repetitive, automatable, tactical work with no lasting value that grows with the service. Google suggests keeping it under 50% of an SRE's time. I measure it first with a ticket label or a two-week time log, rank categories by hours per week, and compute payback: build hours divided by weekly hours saved. I prefer to eliminate (fix the cause), then self-service, then automate, then document. I do the short-payback and risky items first, and make scripts idempotent with a dry-run mode, logging and least privilege. I also keep a manual fallback and count maintenance cost.</p>`, ['Give an example where automation was the wrong answer.', 'How would you reduce toil on a team at 70%?']);
  I('What is chaos engineering and how do you run an experiment safely?', 'A', `<p>It is the practice of running controlled experiments to build confidence that a system tolerates real failures. I define steady state with an SLI, write a hypothesis before the test, limit the blast radius (one pod, one zone, 1% of traffic, short time box), add automatic stop conditions tied to alerts, inject the fault (Chaos Mesh, Litmus or AWS FIS), observe, and then fix and re-run. I start in staging, run during working hours with the team watching, never when the error budget is nearly spent, and treat game days as practice for people and runbooks, not only software.</p>`, ['What is the best finding a chaos test gave you?', 'How would you convince a nervous manager?']);
  I('How do SRE, DevOps and platform engineering differ?', 'B', `<p>DevOps is a culture and set of practices: shared ownership between development and operations, automation and fast feedback. SRE is a specific discipline that applies software engineering to operations, with SLOs, error budgets, toil limits, incident management and capacity planning. Platform engineering builds an internal developer platform as a product, with golden paths and self-service, so teams can ship safely without reinventing infrastructure. Titles overlap between companies, so I look at the work: who is on call, who owns the SLOs, and who builds the shared tooling. They are complementary, not competing.</p>`, ['Where does your own experience fit?', 'How do DORA metrics relate to SLOs?']);
  I('How do you keep on-call healthy?', 'I', `<p>I page only on symptoms that need a human now, and every page links a runbook. I keep to roughly two incidents per 12-hour shift, a rotation of 6 to 8 people, a primary and secondary, a clear escalation path, and fair compensation for nights and weekends. A weekly alert review marks each page actionable or not, and noisy alerts are deleted, merged or turned into tickets. I automate the top repeating fixes, run game days and shadow shifts for new joiners, and hand the pager back to developers if a service cannot meet a readiness bar. Fatigue causes mistakes, so I treat rest as a reliability feature.</p>`, ['How do you measure alert quality?', 'What would you do if only four people can be on call?']);
  I('Tell me about your capstone project and what you would change.', 'I', `<p>I built a three-tier shop (web, API, Postgres) first locally on kind with Helm, Prometheus and Grafana, then optionally on AWS with Terraform (VPC, EKS, RDS, ALB). GitHub Actions runs tests, builds and scans the image and deploys; on AWS it uses OIDC, so there are no stored keys. I defined a 99.5% SLO with burn-rate alerts and a budget policy, load tested with k6, ran a chaos experiment that found a hidden single point of failure, did a backup and restore drill with measured RTO and RPO, and wrote a postmortem for a staged incident. The cost estimate was about 0.27 USD an hour, with a budget alarm first and a teardown checklist. I would add canary releases, policy as code and multi-region DR next.</p>`, ['What was the hardest bug?', 'Which decision would you reverse?']);
  I('How would you design a highly available checkout API (system design for SRE)?', 'A', `<p>I start with requirements and an SLO: say 99.95%, which is about 21.6 minutes a month. Then I draw the request path (CDN, load balancer in three zones, stateless API, cache, Postgres Multi-AZ, a queue for async work) and walk each box asking what happens if it dies or slows. I remove single points of failure, add timeouts, retry budgets, circuit breakers and idempotency, size capacity with headroom and zone-loss safety, plan canary deploys and rollbacks, define SLIs, burn-rate alerts and runbooks, and cover backups and RTO/RPO. I name what I am not covering, such as a Region loss, and the trade-offs and cost I accept.</p>`, ['What if a dependency has lower availability than your SLO?', 'When would you go multi-region?']);
  I('A pod is in CrashLoopBackOff. How do you troubleshoot it?', 'I', `<p>I run <code>kubectl describe pod</code> to see the last state, exit code and events, and <code>kubectl logs --previous</code> for the crashed container's output. Exit code 137 suggests an OOM kill or a failed liveness probe; 1 suggests an application error such as a missing environment variable or failed database connection. I check recent changes (image tag, config map, secret), resource limits, probe settings (a liveness probe that is too strict can cause the loop), and dependencies. If a release caused it I roll back with <code>kubectl rollout undo</code>, then reproduce in staging. Afterwards I add an alert and a runbook so the next person does not start from zero.</p>`, ['How does CrashLoopBackOff timing work?', 'How do you debug a distroless image?']);
  I('How do you deploy to the cloud from CI without storing long-lived credentials?', 'A', `<p>I use OIDC federation. The CI platform issues a short-lived signed token for each job. In AWS I create an IAM OIDC identity provider and a role whose trust policy allows <code>sts:AssumeRoleWithWebIdentity</code> only when the token's audience and subject match my repository and branch. The job exchanges the token for temporary credentials and the role has least-privilege permissions for just that deploy. There is nothing to rotate or leak, and logs show exactly which workflow assumed the role. I also protect the production environment with required reviewers and restrict which branches can deploy.</p>`, ['What claims would you pin in the trust policy?', 'How do you handle deploys to multiple accounts?']);

  registerModule({
    id: 'devops18',
    title: 'SRE Practice & Capstone',
    lang: 'bash',
    langExplain: `<p>This module mixes languages because SRE work does. <b>YAML</b> carries the Kubernetes, Helm, Prometheus, Alertmanager, GitHub Actions and docker-compose files. <b>Bash</b> shows runbook helpers, bring-up and teardown scripts. <b>Python</b> is used for the small calculations (error budget, burn rate, Little's law, capacity, payback, MTTR) because the standard library runs them anywhere and they are easy to test; the same maths is shown as numbers in the text. <b>HCL</b> (Terraform) and <b>JSON</b> (AWS FIS) show infrastructure and experiments as code, and <b>JavaScript</b> appears only in a k6 load test. You can follow the ideas in any language: it is the practice that matters.</p>`,
    intro: `<p>You can now build the system. This last module is about <b>running it well</b> and <b>proving you can</b>. You will set SLOs and spend <b>error budgets</b> on purpose, run an <b>incident</b> with clear roles and learn from it in a <b>blameless postmortem</b>, plan <b>capacity</b> with headroom and Little's law, find and remove <b>toil</b>, break things safely with <b>chaos engineering</b>, and keep <b>on-call</b> healthy with runbooks. Then the <b>capstone</b> ties the whole track together: a three-tier app provisioned as code, shipped by a pipeline, watched by dashboards and alerts, stress-tested and torn down, with a free local version and an optional AWS version with a cost estimate. The module ends with <b>interview preparation</b>: scenario questions, system design for SRE and STAR stories from your own project.</p>
      <p>Every topic starts from a situation you may meet: a SEV1 at 2 a.m., a postmortem that blamed a person, Black Friday traffic, a hidden single point of failure, a team drowning in toil, an error budget gone mid-quarter.</p>`,
    goals: [
      'Define <b>SLIs and SLOs</b>, compute <b>error budgets</b>, alert on <b>multi-window burn rates</b>, and write a <b>budget policy</b> with a feature freeze',
      'Run an incident with an <b>Incident Commander, comms and ops</b> roles, classify <b>severity</b>, measure detect/ack/mitigate/resolve times, and write a <b>blameless postmortem</b> with 5 whys, contributing factors and owned actions',
      'Plan <b>capacity</b> with headroom and zone-loss safety, apply <b>Little\'s law</b> and queueing intuition, and design <b>k6 or Locust</b> load tests that fail the build on thresholds',
      'Measure <b>toil</b>, rank it, and justify automation with a <b>payback calculation</b>',
      'Design <b>chaos experiments</b> (steady-state hypothesis, blast radius, stop conditions, game days) with Chaos Mesh and AWS FIS, and tell <b>SRE, DevOps and platform engineering</b> apart; keep on-call healthy with runbooks',
      'Build and present the <b>capstone</b> (free local kind/Helm variant and optional AWS Terraform variant with a cost estimate, budget alarm and teardown), and answer <b>DevOps and SRE interview</b> scenarios with STAR stories'
    ],
    prereqs: `<p><b>Required:</b> <b>Observability &amp; Monitoring</b> (DevOps 15: metrics, Prometheus, alerting, SLIs and SLOs), <b>DevSecOps &amp; Cloud Security</b> (DevOps 16: secrets, scanning, least privilege) and <b>Multi-Region Architecture &amp; Resilience</b> (DevOps 17: DR, RTO and RPO, failure design). The capstone also reuses Linux, networking, Git, IAM/VPC, Docker, Terraform, Ansible, CI/CD, managed services and Kubernetes/Helm from DevOps 1 to 14. <b>Helpful:</b> <b>Behavioural 1</b>, for structuring STAR stories and delivering them well in the interview part.</p>`,
    hours: 16,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
