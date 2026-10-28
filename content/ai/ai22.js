(function () { var topics = [], practice = [], quiz = [], interview = [];
var PY = {"pit":"# Point-in-time correct join: for each training label, use the feature value\n# that was KNOWN at the label's timestamp - never a later one (that is leakage).\nimport bisect\n\n# feature history: user -> sorted list of (timestamp, value). Value = \"orders in last 7 days\"\nhistory = {\n    \"u1\": [(1, 0), (5, 2), (9, 6)],\n    \"u2\": [(2, 1), (8, 4)],\n}\n# labels: (user, event_time, label) e.g. \"did the user churn after this moment?\"\nlabels = [(\"u1\", 4, 0), (\"u1\", 9, 1), (\"u2\", 7, 0), (\"u2\", 1, 1)]\n\ndef as_of(user, t):\n    \"\"\"Latest feature value with timestamp <= t (None if nothing known yet).\"\"\"\n    rows = history.get(user, [])\n    times = [ts for ts, _ in rows]\n    i = bisect.bisect_right(times, t) - 1        # last index with ts <= t\n    return rows[i][1] if i >= 0 else None\n\ndef latest(user):\n    \"\"\"The WRONG way: always take today's value (leaks the future into training).\"\"\"\n    return history[user][-1][1]\n\nprint(\"user  t  label | point-in-time  latest(leaky)\")\nleaks = 0\nfor user, t, y in labels:\n    good, bad = as_of(user, t), latest(user)\n    leaks += good != bad\n    print(f\"{user:4s} {t:2d}  {y:5d} | {str(good):13s}  {bad}\")\nprint(\"rows where the naive join used future data:\", leaks, \"of\", len(labels))\n","fresh":"# Feature-freshness check: is every online feature recent enough to serve?\n# Each feature view has a max allowed age (its SLA). Stale features -> fall back or alert.\nNOW = 1_000_000  # pretend \"now\" in epoch seconds (fixed so the demo is deterministic)\n\nfeature_views = {   # name: (last successful write time, max allowed age in seconds, has default?)\n    \"user_txn_count_1h\":   (NOW - 120,    600,   True),   # streaming, written 2 min ago\n    \"user_avg_basket_30d\": (NOW - 50_000, 86_400 * 2, True),  # daily batch, 14 h old\n    \"merchant_risk_score\": (NOW - 7_200,  3_600, False),  # hourly job is 2 h late!\n    \"device_fingerprint\":  (NOW - 30,     300,   True),\n}\n\ndef check(views, now):\n    report = []\n    for name, (written, max_age, has_default) in views.items():\n        age = now - written\n        if age <= max_age:\n            status = \"FRESH\"\n        elif has_default:\n            status = \"STALE -> serve default + alert\"\n        else:\n            status = \"STALE -> block / page on-call\"\n        report.append((name, age, max_age, status))\n    return report\n\nfor name, age, max_age, status in check(feature_views, NOW):\n    print(f\"{name:22s} age={age:>6}s  limit={max_age:>6}s  {status}\")\n\nstale = [r for r in check(feature_views, NOW) if r[3] != \"FRESH\"]\nprint(\"freshness SLO met:\", len(feature_views) - len(stale), \"/\", len(feature_views))\n","registry":"# A tiny model registry state machine (the idea behind MLflow Model Registry stages/aliases).\n# Rules: None -> Staging -> Production -> Archived. Only ONE Production version at a time.\nALLOWED = {\n    \"None\": {\"Staging\", \"Archived\"},\n    \"Staging\": {\"Production\", \"Archived\", \"None\"},\n    \"Production\": {\"Archived\"},\n    \"Archived\": {\"Staging\"},          # you may bring an old version back for a rollback test\n}\n\nclass Registry:\n    def __init__(self, name):\n        self.name, self.versions, self.log = name, {}, []\n\n    def register(self, run_id, metrics):\n        v = len(self.versions) + 1\n        self.versions[v] = {\"stage\": \"None\", \"run_id\": run_id, \"metrics\": metrics}\n        self.log.append(f\"v{v} registered from run {run_id} {metrics}\")\n        return v\n\n    def transition(self, v, to, gate=None):\n        cur = self.versions[v][\"stage\"]\n        if to not in ALLOWED[cur]:\n            raise ValueError(f\"v{v}: {cur} -> {to} is not allowed\")\n        if gate is not None and not gate(self.versions[v][\"metrics\"]):\n            raise ValueError(f\"v{v}: quality gate failed, stays {cur}\")\n        if to == \"Production\":                       # archive the old champion atomically\n            for ov, info in self.versions.items():\n                if info[\"stage\"] == \"Production\":\n                    info[\"stage\"] = \"Archived\"\n                    self.log.append(f\"v{ov} Production -> Archived (replaced by v{v})\")\n        self.versions[v][\"stage\"] = to\n        self.log.append(f\"v{v} {cur} -> {to}\")\n\n    def production(self):\n        return [v for v, i in self.versions.items() if i[\"stage\"] == \"Production\"]\n\nreg = Registry(\"fraud-model\")\ngate = lambda m: m[\"auc\"] >= 0.80 and m[\"p99_ms\"] <= 50\nv1 = reg.register(\"run_a1\", {\"auc\": 0.82, \"p99_ms\": 30})\nreg.transition(v1, \"Staging\"); reg.transition(v1, \"Production\", gate)\nv2 = reg.register(\"run_b7\", {\"auc\": 0.79, \"p99_ms\": 25})\nreg.transition(v2, \"Staging\")\ntry:\n    reg.transition(v2, \"Production\", gate)\nexcept ValueError as e:\n    reg.log.append(f\"BLOCKED: {e}\")\nv3 = reg.register(\"run_c2\", {\"auc\": 0.85, \"p99_ms\": 40})\nreg.transition(v3, \"Staging\"); reg.transition(v3, \"Production\", gate)\ntry:\n    reg.transition(v1, \"Production\")       # Archived -> Production directly is illegal\nexcept ValueError as e:\n    reg.log.append(f\"BLOCKED: {e}\")\nprint(*reg.log, sep=\"\\n\")\nprint(\"Production now:\", reg.production(), \"| stages:\", {v: i[\"stage\"] for v, i in reg.versions.items()})\n","batching":"# Dynamic (micro-)batching in an online model server: trade a few ms of waiting for throughput.\n# Policy: flush when the batch has MAX_BATCH requests OR the oldest has waited MAX_WAIT ms.\nMAX_BATCH, MAX_WAIT = 4, 5\nCOST_FIXED, COST_PER_ITEM = 8, 1   # ms per forward pass: fixed overhead + per item\n\narrivals = [0, 1, 2, 3, 10, 11, 30, 31, 32, 33, 34, 35, 60]   # request arrival times (ms)\n\ndef simulate(max_batch, max_wait):\n    batches, queue, i = [], [], 0\n    t = 0\n    while i < len(arrivals) or queue:\n        if not queue:\n            t = max(t, arrivals[i])\n        while i < len(arrivals) and arrivals[i] <= t:\n            queue.append(arrivals[i]); i += 1\n        deadline = queue[0] + max_wait\n        if len(queue) >= max_batch or (i == len(arrivals) or arrivals[i] > deadline) and t >= deadline:\n            batch, queue = queue[:max_batch], queue[max_batch:]\n            run = COST_FIXED + COST_PER_ITEM * len(batch)\n            batches.append((t, batch, [t + run - a for a in batch]))\n            t += run\n        else:\n            t = min(deadline, arrivals[i]) if i < len(arrivals) else deadline\n    return batches\n\nfor mb, mw in ((1, 0), (MAX_BATCH, MAX_WAIT)):\n    b = simulate(mb, mw)\n    lat = sorted(x for _, _, ls in b for x in ls)\n    gpu = sum(COST_FIXED + COST_PER_ITEM * len(r) for _, r, _ in b)\n    print(f\"max_batch={mb} max_wait={mw}ms: {len(b)} forward passes, busy {gpu} ms, \"\n          f\"p50 latency {lat[len(lat) // 2]} ms, max latency {lat[-1]} ms\")\n    if mb > 1:\n        for start, reqs, ls in b:\n            print(f\"  t={start:>3}ms run batch {reqs} latencies {ls}\")\n","canary":"# Canary traffic splitter: sticky hashing per user + staged rollout + automatic rollback.\nimport hashlib\n\ndef bucket(user_id, salt=\"fraud-v3\"):\n    \"\"\"Stable 0..9999 bucket. Same user -> same bucket every request (sticky).\"\"\"\n    h = hashlib.sha256(f\"{salt}:{user_id}\".encode()).hexdigest()\n    return int(h[:8], 16) % 10_000\n\ndef route(user_id, canary_pct):\n    return \"canary\" if bucket(user_id) < canary_pct * 100 else \"stable\"\n\nusers = [f\"user{i}\" for i in range(20_000)]\nfor pct in (1, 5, 25):\n    n = sum(route(u, pct) == \"canary\" for u in users)\n    print(f\"canary at {pct:>2}% -> {n} of {len(users)} users ({100 * n / len(users):.2f}%)\")\nprint(\"sticky check:\", all(route(\"user42\", 5) == route(\"user42\", 5) for _ in range(100)))\n\n# staged rollout driven by observed error rates (stable baseline 0.50%)\nSTAGES = [1, 5, 25, 50, 100]\nBASELINE, MAX_RATIO = 0.50, 1.5           # rollback if canary error rate > 1.5x baseline\nobserved = {1: 0.48, 5: 0.55, 25: 0.91}   # error % measured at each stage (25% stage regresses)\nfor pct in STAGES:\n    err = observed.get(pct, 0.5)\n    ok = err <= BASELINE * MAX_RATIO\n    print(f\"stage {pct:>3}%: canary error {err:.2f}% vs limit {BASELINE * MAX_RATIO:.2f}% -> \"\n          f\"{'promote' if ok else 'ROLLBACK to 0%'}\")\n    if not ok:\n        break\n","drift":"# Drift calculators: PSI (Population Stability Index) and KL divergence on binned data.\nimport math\n\ndef proportions(counts, eps=1e-4):\n    total = sum(counts)\n    return [max(c / total, eps) for c in counts]     # eps avoids log(0) for empty bins\n\ndef psi(expected_counts, actual_counts):\n    e, a = proportions(expected_counts), proportions(actual_counts)\n    parts = [(ai - ei) * math.log(ai / ei) for ei, ai in zip(e, a)]\n    return sum(parts), parts\n\ndef kl(p_counts, q_counts):\n    \"\"\"KL(P || Q) = sum p * ln(p / q). Not symmetric! PSI = KL(P||Q) + KL(Q||P).\"\"\"\n    p, q = proportions(p_counts), proportions(q_counts)\n    return sum(pi * math.log(pi / qi) for pi, qi in zip(p, q))\n\ndef verdict(v):\n    return \"stable\" if v < 0.1 else (\"moderate shift - investigate\" if v < 0.25 else \"MAJOR shift - act\")\n\n# Same 5 bins (decided on the TRAINING data, e.g. quantiles), counts per bin\ntrain = [200, 200, 200, 200, 200]\ncases = {\n    \"last week\":       [195, 205, 210, 190, 200],\n    \"new campaign\":    [100, 140, 200, 260, 300],\n    \"bug: zeros sent\": [600, 100, 100, 100, 100],\n}\nfor name, live in cases.items():\n    total, parts = psi(train, live)\n    print(f\"{name:16s} PSI={total:.3f} ({verdict(total)})  KL(live||train)={kl(live, train):.3f}\"\n          f\"  KL(train||live)={kl(train, live):.3f}\")\n    print(\"   per-bin PSI:\", [round(x, 3) for x in parts])\n","retrain":"# Retraining policy + CI/CD quality gate for a classical model.\n# Trigger retrain on: schedule, drift, or performance drop (when labels arrive).\ndef should_retrain(days_since_train, max_psi, live_auc, train_auc, labels_ready):\n    reasons = []\n    if days_since_train >= 30:\n        reasons.append(\"schedule (30 days)\")\n    if max_psi >= 0.25:\n        reasons.append(f\"input drift (PSI {max_psi:.2f})\")\n    if labels_ready and train_auc - live_auc >= 0.03:\n        reasons.append(f\"performance drop (AUC {train_auc:.2f} -> {live_auc:.2f})\")\n    return reasons\n\ndef ci_gate(candidate, champion, max_latency_ms=50, min_slice=0.70):\n    \"\"\"Candidate must beat (or tie) the champion overall, not hurt any slice, and fit latency.\"\"\"\n    checks = {\n        \"schema/data tests pass\": candidate[\"data_tests\"],\n        \"AUC >= champion - 0.005\": candidate[\"auc\"] >= champion[\"auc\"] - 0.005,\n        \"every slice AUC >= 0.70\": min(candidate[\"slices\"].values()) >= min_slice,\n        \"p99 latency <= 50 ms\": candidate[\"p99_ms\"] <= max_latency_ms,\n        \"model size <= 200 MB\": candidate[\"mb\"] <= 200,\n    }\n    return all(checks.values()), checks\n\nprint(\"retrain?\", should_retrain(12, 0.31, 0.84, 0.85, True) or \"no\")\nprint(\"retrain?\", should_retrain(12, 0.05, 0.80, 0.85, True) or \"no\")\nprint(\"retrain?\", should_retrain(5, 0.04, 0.85, 0.85, False) or \"no\")\n\nchampion = {\"auc\": 0.851}\ncandidates = {\n    \"cand-A\": {\"data_tests\": True, \"auc\": 0.858, \"slices\": {\"new_users\": 0.74, \"mobile\": 0.81}, \"p99_ms\": 38, \"mb\": 120},\n    \"cand-B\": {\"data_tests\": True, \"auc\": 0.866, \"slices\": {\"new_users\": 0.66, \"mobile\": 0.83}, \"p99_ms\": 41, \"mb\": 140},\n    \"cand-C\": {\"data_tests\": True, \"auc\": 0.872, \"slices\": {\"new_users\": 0.78, \"mobile\": 0.85}, \"p99_ms\": 95, \"mb\": 900},\n}\nfor name, c in candidates.items():\n    ok, checks = ci_gate(c, champion)\n    failed = [k for k, v in checks.items() if not v]\n    print(f\"{name}: {'PROMOTE to staging' if ok else 'REJECT'}  failed={failed}\")\n"};
function box(id, label, x, y, w) { return { id: id, label: label, x: x, y: y, shape: 'box', w: w || 16 }; }
function edgeKey(e) { return e[0] + '-' + e[1]; }

/* ---------------- Topic 1: lifecycle + data/feature pipelines ---------------- */
topics.push({
  title: 'The ML Lifecycle in Production and Data/Feature Pipelines',
  analogy: `<p>Think of a bakery chain. Writing a great recipe in the test kitchen (a notebook model) is maybe 10% of the job. The rest is the supply chain: flour must arrive fresh and measured the same way in every shop (data and feature pipelines), every batch is logged (tracking), the approved recipe is filed in a binder (registry), new recipes are tried in one shop first (canary), and someone tastes the bread every morning because flour suppliers change (monitoring and drift). MLOps is running the whole bakery chain, not just inventing recipes.</p>`,
  explain: `<p>🟢 <b>The big idea.</b> A model in production is a <b>software system plus a data system</b>. Code can break, but so can data - quietly. MLOps is the set of practices that keep the whole loop healthy:</p>
  <ol><li><b>Data</b> - collect, validate, version.</li><li><b>Features</b> - turn raw data into model inputs, the same way in training and serving.</li><li><b>Train + track</b> - every run logs code version, data version, params and metrics.</li><li><b>Register</b> - the chosen model gets a version in a registry with lineage.</li><li><b>Package + serve</b> - batch job or online API.</li><li><b>Release safely</b> - shadow, canary, A/B.</li><li><b>Monitor</b> - system health, data drift, model quality.</li><li><b>Retrain</b> - and go round again, automated by CI/CD.</li></ol>
  <p><b>Training-serving skew</b> is the number one silent killer: the feature is computed one way in a Python training notebook and another way in the Java serving path (different time zone, different null handling, different window). The model sees inputs it never trained on and quality drops with zero errors in the logs. The cure: <b>one feature definition</b> used by both paths (a feature store or shared library), plus logging the exact features served so you can compare.</p>
  <p><b>Point-in-time correctness.</b> When you build a training set, every label row must be joined with feature values <i>as they were known at that moment</i>, never later. If you join "today's" order count onto a label from last month, the model learns from the future (<b>label leakage</b>): great offline AUC, poor production results.</p>
  ${H.table(['Pipeline', 'Runs', 'Example'], [['Batch feature pipeline', 'Hourly/daily (Spark, SQL, dbt, Airflow)', 'avg basket size over 30 days'], ['Streaming feature pipeline', 'Seconds (Kafka + Flink/Spark Streaming)', 'transactions in last 10 minutes'], ['On-demand feature', 'At request time', 'distance between card country and IP country']])}`,
  clues: ['"Offline metrics were great but production is worse" -> training-serving skew or leakage', '"Build a training set from event logs" -> point-in-time (as-of) join', '"Same feature in training and serving" -> single feature definition / feature store', '"Data silently changed upstream" -> data validation (schema, ranges, null rates) in the pipeline', '"Walk me through the ML lifecycle" -> data, features, train/track, registry, serve, release, monitor, retrain'],
  code: [{ lang: 'python', code: PY.pit, run: true, title: 'Point-in-time join vs a leaky "latest value" join (runnable)' }],
  codeTitle: ['Point-in-time correct training data'],
  viz: {
    title: 'The ML lifecycle loop',
    gen: function () {
      var nodes = [box('D', 'Data', 8, 10), box('F', 'Features', 30, 10), box('T', 'Train+Track', 54, 10, 18), box('R', 'Registry', 80, 10), box('S', 'Serve', 80, 45), box('L', 'Release', 54, 45), box('M', 'Monitor', 30, 45), box('RT', 'Retrain', 8, 45)];
      var edges = [['D', 'F'], ['F', 'T'], ['T', 'R'], ['R', 'S'], ['S', 'L'], ['L', 'M'], ['M', 'RT'], ['RT', 'D']];
      var steps = [['D', 'Raw events land in the lake/warehouse. Validate schema, ranges and null rates FIRST - bad data is cheaper to stop here than to debug later.'],
        ['F', 'Feature pipelines turn raw data into inputs (counts, averages, embeddings). One definition must feed both training and serving, or you get training-serving skew.'],
        ['T', 'Training runs log code commit, data snapshot, hyperparameters and metrics to an experiment tracker, so any model can be reproduced.'],
        ['R', 'The winning run is registered as a model version with lineage (which data, which code). Promotion to production is a gated, auditable step.'],
        ['S', 'Package the model (container / model server) and serve it: batch scoring job or online REST/gRPC API.'],
        ['L', 'Release safely: shadow first, then canary 1% -> 5% -> 25% -> 100%, or an A/B test when you need to measure business impact.'],
        ['M', 'Monitor system metrics (latency, errors), data drift (PSI on inputs), prediction drift and, when labels arrive, real quality.'],
        ['RT', 'Retrain on a schedule or when drift/quality alerts fire - through the same CI/CD pipeline, then back to the start of the loop.']];
      var f = [{ narr: 'The ML lifecycle is a <b>loop</b>, not a line. A notebook model covers maybe one box. Let us walk around the loop.', parts: [{ type: 'graph', label: 'ML lifecycle', directed: true, height: 60, nodes: nodes, edges: edges }] }];
      steps.forEach(function (s, i) {
        var hl = {}, ehl = {};
        for (var j = 0; j < i; j++) hl[steps[j][0]] = 'done';
        hl[s[0]] = 'cur';
        if (i > 0) ehl[edgeKey(edges[i - 1])] = 'ok';
        f.push({ narr: '<b>' + (i + 1) + '.</b> ' + s[1], parts: [{ type: 'graph', label: 'ML lifecycle', directed: true, height: 60, nodes: nodes, edges: edges, hl: hl, ehl: ehl }] });
      });
      f.push({ narr: 'And the loop closes: retraining produces a new version that must pass the same gates. <b>Automating this loop</b> is what people mean by "MLOps maturity".', parts: [{ type: 'graph', label: 'ML lifecycle', directed: true, height: 60, nodes: nodes, edges: edges, hl: { D: 'sel' }, ehl: { 'RT-D': 'ok' } }] });
      return f;
    }
  },
  examples: [
    { title: 'Training-serving skew in the wild', html: `<p>Training computed <code>days_since_signup</code> in UTC from a nightly snapshot; serving computed it in local time from a cache refreshed weekly. For 1 in 7 users the value was off by one, and for new users the cache had <code>null</code> which serving filled with 0 while training dropped those rows. No errors, AUC dropped 4 points in production. Fix: one feature definition, logged served features, and a daily skew check comparing served vs recomputed values.</p>` },
    { title: 'Leakage via a naive join', html: `<p>Run the code above. The "latest value" join gives user <code>u2</code> an order count of 4 for a label at t=1, when nothing was known yet. ${H.kv([['Point-in-time rows correct', '4 / 4'], ['Naive join rows using the future', '3 / 4']], { label: 'Result' })}</p>` },
    { title: 'Data validation checks to put in the pipeline', html: `${H.table(['Check', 'Catches'], [['Schema (columns, types)', 'Upstream renamed a column'], ['Null rate per column', 'A join broke and 40% is now null'], ['Value ranges / allowed categories', 'Prices suddenly in cents instead of dollars'], ['Row count vs yesterday', 'Half the data did not arrive'], ['Distribution vs training (PSI)', 'Gradual shift in users']])}<p>Tools: Great Expectations, TFX Data Validation, Deequ, or plain SQL assertions in the orchestrator.</p>` },
    { title: 'Batch, streaming or on-demand?', html: `<p>Ask "how fresh must it be?" Avg spend over 90 days: batch daily is fine. Number of card swipes in the last 5 minutes (fraud): streaming. Distance between this request's IP and shipping address: on-demand at request time, because it only exists now.</p>` }
  ],
  deepDive: `<p><b>Hidden technical debt.</b> The well-known Google paper "Hidden Technical Debt in ML Systems" showed the model code is a tiny box surrounded by data collection, feature extraction, configuration, serving and monitoring. Most outages come from the surrounding boxes: entangled features ("changing anything changes everything"), undeclared consumers of model outputs, and feedback loops where the model's own predictions shape tomorrow's training data (a recommender only learns about items it showed).</p>
  <p><b>Reproducibility needs four things pinned:</b> code commit, data snapshot (a versioned table, DVC, Delta/Iceberg time travel, or an immutable path), environment (lock file / container digest) and random seeds. Without the data version, "retrain the same model" is impossible.</p>
  <p><b>Orchestration.</b> Pipelines are DAGs run by Airflow, Dagster, Prefect, Kubeflow Pipelines or cloud services (SageMaker Pipelines, Vertex AI Pipelines). Each step should be idempotent and write to a versioned output so reruns and backfills are safe.</p>
  <p><b>Lambda vs Kappa.</b> Keeping separate batch and streaming code for the same feature invites skew; many teams compute features once in a streaming engine and backfill history by replaying the log (Kappa style), or use a feature platform that compiles one definition to both.</p>`,
  aiEra: `<p><b>What AI changes:</b> LLM assistants now write most pipeline boilerplate - SQL for features, Airflow DAGs, validation suites - and can propose data checks from a sample of a table. LLMOps (see the LLM System Design module) added prompts and eval sets as new artifacts, but classical models still run fraud, ranking, pricing and forecasting at most companies, and they need exactly this lifecycle.</p>
  <p><b>Use AI as a partner:</b> ask <code>Given this feature SQL, where could it leak future information?</code> or <code>Generate Great Expectations checks for this schema</code>.</p>
  <p><b>Where AI goes wrong:</b> generated joins are usually plain joins on user id - not as-of joins - so they leak. It also happily computes features differently in the training script and in the serving code it writes separately.</p>
  <p><b>What you must still own:</b> the timeline of when each fact becomes known, the single feature definition, and the data contracts with upstream teams.</p>`,
  problems: [{
    title: 'Why is production worse than offline?',
    level: 'Medium', tags: ['skew', 'leakage'], companies: ['Any'],
    statement: `<p>A churn model scored AUC 0.91 offline. After launch, measured AUC on labelled production traffic is 0.74. Nothing errors. List the likely causes in order of likelihood and how you would confirm each.</p>`,
    constraints: `You have access to training data, served-feature logs and the feature code for both paths.`,
    example: `<p>A feature "support tickets in next 30 days" was accidentally computed over a window that included the label period - perfect offline signal, unavailable at serving time.</p>`,
    brute: { why: `<p>Naive reaction: retrain with more data or a bigger model. If the cause is leakage or skew, retraining reproduces the same gap and wastes weeks.</p>` },
    mcq: { q: 'Which check best detects training-serving skew?', options: ['Compare logged served features to the offline-recomputed features for the same entities and time', 'Retrain with a different seed', 'Increase the model size', 'Check GPU utilisation'], answer: 0, explain: 'Skew means the same entity at the same moment got different feature values in the two paths; compare them directly.' },
    hints: [`<p>Hint 1: a gap with no errors usually means the inputs differ, not the model.</p>`, `<p>Hint 2: think leakage (future info in training) and skew (different computation at serving).</p>`, `<p>Hint 3: also consider real drift and a different population, then confirm each with a concrete comparison.</p>`],
    solution: {
      approach: `<p><b>1. Label leakage</b> - a feature uses information from after the prediction time. Confirm: check feature importance (one feature dominating is suspicious), audit each feature's time window against the label time, rebuild the training set with a point-in-time join and re-evaluate. <b>2. Training-serving skew</b> - confirm by joining served-feature logs with offline-recomputed values for the same entity and timestamp and measuring mismatch rate per feature. <b>3. Population or data drift</b> - production users differ (new market, new app version); confirm with PSI per feature and per slice. <b>4. Evaluation mismatch</b> - offline split was random while production is future data; re-evaluate with a time-based split. <b>5. Label definition differences</b> between offline and production measurement. Fix the root cause, add a skew monitor and a time-based validation split to CI so it cannot recur.</p>`,
      complexity: `<p>Skew check is a join over logged requests: O(n) with sampling; PSI is O(bins) per feature.</p>`,
      followUps: ['How do you design a time-based validation split?', 'How do you catch leakage automatically?']
    }
  }]
});

/* ---------------- Topic 2: feature stores ---------------- */
topics.push({
  title: 'Feature Stores: Offline/Online Stores and Freshness',
  analogy: `<p>A feature store is like a restaurant's prep kitchen. The <b>walk-in freezer</b> (offline store) holds months of ingredients, cheap and large, used when planning menus and testing recipes. The <b>prep line</b> next to the stove (online store) holds just today's chopped ingredients, ready in seconds for each order. One recipe card defines how onions are chopped, so the freezer stock and the prep line match. And every container has a date label, so stale food is never served.</p>`,
  explain: `<p>🟢 <b>What it is.</b> A feature store is a system that <b>defines, computes, stores and serves features</b> so training and serving use the same values. Examples: Feast (open source), Tecton, Databricks Feature Store, SageMaker Feature Store, Vertex AI Feature Store, Hopsworks.</p>
  ${H.table(['Part', 'What it holds', 'Storage', 'Used by'], [['Feature definitions / registry', 'Name, entity key, source, transformation, owner, TTL', 'Metadata DB / code repo', 'Everyone (discovery, reuse)'], ['Offline store', 'Full history with timestamps', 'Warehouse / lake (BigQuery, Snowflake, Parquet, Delta)', 'Training sets, batch scoring'], ['Online store', 'Latest value per entity key', 'Low-latency KV (Redis, DynamoDB, Bigtable, Cassandra)', 'Online model serving (ms)'], ['Materialization jobs', 'Copy latest values offline -> online', 'Batch / streaming jobs', 'Keeps online fresh']])}
  <p><b>Two key operations:</b></p>
  <ul><li><code>get_historical_features(entity_df)</code> - a <b>point-in-time join</b>: for each (entity, timestamp) row, return values as of that time. Used to build training data without leakage.</li><li><code>get_online_features(entity_keys)</code> - fetch the latest values for a live request in a few milliseconds.</li></ul>
  <p><b>Freshness</b> = now minus the time the value was last updated. Each feature view has a freshness SLA (e.g. "transaction count must be under 10 minutes old"). If a job is late, serving reads stale values - the model still answers, just worse. So you <b>monitor freshness</b> and decide per feature: serve a default, block, or alert.</p>
  <p><b>Do you need one?</b> Not for a single batch model. It pays off when many models share features, when you need online serving with the same values as training, or when point-in-time joins keep going wrong.</p>`,
  clues: ['"Same features for training and real-time serving" -> feature store with offline + online stores', '"Features must be under N minutes old" -> streaming materialization + freshness monitoring', '"Many teams recompute the same features" -> shared feature registry, reuse', '"p99 under 20 ms including feature lookup" -> online KV store, batch the key lookups', '"Build training data from history" -> get_historical_features / point-in-time join'],
  code: [{ lang: 'python', code: PY.fresh, run: true, title: 'Feature-freshness check with per-feature SLAs (runnable)' },
    { lang: 'python', check: false, title: 'Feast feature definition and retrieval (needs feast, not run here)', code: `from datetime import timedelta
from feast import Entity, FeatureView, Field, FileSource, FeatureStore
from feast.types import Float32, Int64

user = Entity(name="user", join_keys=["user_id"])

txn_source = FileSource(path="data/user_txn_stats.parquet",
                        timestamp_field="event_timestamp")

user_txn_stats = FeatureView(
    name="user_txn_stats",
    entities=[user],
    ttl=timedelta(days=2),            # older values are treated as missing
    schema=[Field(name="txn_count_7d", dtype=Int64),
            Field(name="avg_amount_30d", dtype=Float32)],
    source=txn_source,
)

store = FeatureStore(repo_path=".")
# Training: point-in-time join against an entity dataframe (user_id, event_timestamp, label)
training_df = store.get_historical_features(
    entity_df=labels_df,
    features=["user_txn_stats:txn_count_7d", "user_txn_stats:avg_amount_30d"],
).to_df()

# Serving: latest values from the online store in milliseconds
online = store.get_online_features(
    features=["user_txn_stats:txn_count_7d", "user_txn_stats:avg_amount_30d"],
    entity_rows=[{"user_id": 1001}],
).to_dict()` }],
  codeTitle: ['Freshness check', 'Feast definition + retrieval'],
  viz: {
    title: 'Offline vs online path through a feature store',
    input: '700 600',
    inputLabel: 'Online feature age in seconds, freshness limit in seconds',
    gen: function (input) {
      var p = String(input).trim().split(/[\s,]+/).map(Number);
      if (p.length !== 2 || p.some(function (x) { return isNaN(x) || x < 0; })) throw new Error('Enter two numbers: age_seconds limit_seconds, e.g. 700 600');
      var age = p[0], lim = p[1], fresh = age <= lim;
      var nodes = [box('SRC', 'Events', 8, 30), box('PIPE', 'Feature jobs', 30, 30, 18), box('OFF', 'Offline store', 55, 10, 18), box('ON', 'Online KV', 55, 50), box('TR', 'Training', 84, 10), box('API', 'Model API', 84, 50)];
      var edges = [['SRC', 'PIPE'], ['PIPE', 'OFF', 'history'], ['PIPE', 'ON', 'latest'], ['OFF', 'TR', 'PIT join'], ['ON', 'API', 'get']];
      function g(hl, ehl, tags) { return { type: 'graph', label: 'Feature store', directed: true, height: 60, nodes: nodes, edges: edges, hl: hl || {}, ehl: ehl || {}, tags: tags || {} }; }
      var f = [];
      f.push({ narr: 'Raw events (payments, clicks) feed feature jobs. One definition per feature lives in the registry.', parts: [g({ SRC: 'cur' }, { 'SRC-PIPE': 'ok' })] });
      f.push({ narr: 'Jobs write the <b>full timestamped history</b> to the offline store (cheap, huge, slow).', parts: [g({ PIPE: 'cur', OFF: 'ok' }, { 'PIPE-OFF': 'ok' })] });
      f.push({ narr: 'Training asks for a <b>point-in-time join</b>: values as they were at each label time. No leakage.', parts: [g({ OFF: 'done', TR: 'cur' }, { 'OFF-TR': 'ok' }, { TR: 'train set' })] });
      f.push({ narr: '<b>Materialization</b> copies only the latest value per key into the online KV store (Redis/DynamoDB) - the same numbers, so no skew.', parts: [g({ PIPE: 'cur', ON: 'ok' }, { 'PIPE-ON': 'ok' })] });
      f.push({ narr: 'A live request arrives. The model API fetches features by user id in ~1-5 ms.', parts: [g({ ON: 'win', API: 'cur' }, { 'ON-API': 'ok' })] });
      f.push({ narr: 'Freshness check: value age = <b>' + age + ' s</b>, limit = <b>' + lim + ' s</b>.', parts: [g({ ON: fresh ? 'ok' : 'bad' }, {}, { ON: age + 's old' }), { type: 'vars', vals: { age_s: age, limit_s: lim, fresh: fresh }, hl: { fresh: fresh ? 'ok' : 'bad' } }] });
      f.push({ narr: fresh ? '<span class="c-g">Fresh.</span> Serve normally and record the age as a metric.' : '<span class="c-r">Stale!</span> The materialization job is late. Options: serve a safe default value, fall back to a simpler model that does not need this feature, and page the owner if the SLA keeps failing. Never silently serve very old values.', parts: [g({ API: fresh ? 'ok' : 'bad' }, { 'ON-API': fresh ? 'ok' : 'bad' }, { API: fresh ? 'serve' : 'fallback' })] });
      return f;
    }
  },
  examples: [
    { title: 'Fraud features and their freshness', html: `${H.table(['Feature', 'Computed by', 'Freshness SLA'], [['card_txn_count_10m', 'Streaming (Flink)', '< 1 min'], ['user_avg_amount_30d', 'Daily batch', '< 48 h'], ['merchant_chargeback_rate_90d', 'Daily batch', '< 48 h'], ['ip_to_billing_distance_km', 'On-demand at request', 'n/a (computed now)']])}` },
    { title: 'Run the freshness checker', html: `<p>Press ▶. The hourly merchant job is 2 hours late and has no safe default, so the checker says block/page. Changing the SLA is not the fix - find out why the job is late.</p>` },
    { title: 'Online lookup latency budget', html: `<p>Model API p99 target 30 ms. Budget: network 3 ms + feature fetch 5 ms (one batched multi-get, not 40 single gets) + model 10 ms + overhead 5 ms. Feature lookups that are done one by one are a classic latency bug.</p>` }
  ],
  deepDive: `<p><b>TTL vs freshness.</b> TTL decides how old a value can be before the store treats it as missing (Feast <code>ttl</code>). Freshness monitoring measures pipeline lateness. Both are needed: TTL protects predictions, freshness alerts protect the pipeline.</p>
  <p><b>Backfills.</b> A new feature has no history. You backfill it by running the transformation over past data so training sets can use it - and the backfill must use the same code as the live job, or you build in skew from day one.</p>
  <p><b>Online store sizing.</b> Keys x features x bytes: 100M users x 50 features x 8 bytes ≈ 40 GB plus overhead - fits a Redis cluster or DynamoDB easily. Hot keys (one huge merchant) need care.</p>
  <p><b>Streaming features</b> are windowed aggregations (sliding/tumbling windows) with watermarks for late events; exact-once semantics and state size are the hard parts. On-demand features (computed from request payload) are written as functions in the feature platform so training replays the same function.</p>
  <p><b>Consistency.</b> Online and offline are written by the same job, but at different moments; log served features ("feature logging") and train on those logged values to remove skew entirely - many large companies do this.</p>`,
  aiEra: `<p><b>What AI changes:</b> embedding features (user and item vectors) are now common inputs; feature stores add vector types and some integrate with vector databases. LLM-generated features (a category or sentiment computed by a small LLM in a batch job) are just batch features with a cost - cache them.</p>
  <p><b>Use AI as a partner:</b> ask an assistant to write the Feast definitions or streaming window code from a plain description, and to list freshness SLAs per feature for review.</p>
  <p><b>Where AI goes wrong:</b> it suggests a feature store for a single nightly batch model (over-engineering), forgets TTLs, and writes one-key-at-a-time online lookups.</p>
  <p><b>What you must still own:</b> whether a feature store is worth the operational cost, the freshness SLAs and what happens when they fail.</p>`,
  problems: [{
    title: 'Design features for real-time fraud scoring',
    level: 'Hard', tags: ['feature store', 'streaming'], companies: ['Stripe', 'PayPal'],
    statement: `<p>Score every card payment for fraud within 50 ms p99 at 5,000 payments/second. Features include counts over the last 10 minutes, 30-day averages and request-time signals. Design the feature pipeline and store.</p>`,
    constraints: `Training must use exactly the feature values serving would have seen.`,
    example: `<p>card_txn_count_10m from a stream; avg_amount_30d from a daily batch; ip_distance on demand.</p>`,
    brute: { why: `<p>Naive: compute every feature with SQL against the transactions database during the request. 30-day aggregations per payment take seconds and hammer the OLTP database; training uses a different SQL, so skew appears.</p>` },
    mcq: { q: 'Where should the 10-minute count come from?', options: ['A streaming job writing to the online store', 'A nightly batch job', 'A SQL query per request on the warehouse', 'The model computes it'], answer: 0, explain: 'Freshness of seconds needs streaming aggregation into a low-latency store.' },
    hints: [`<p>Hint 1: group features by how fresh they must be.</p>`, `<p>Hint 2: offline store for training history, online KV for serving, same definitions.</p>`, `<p>Hint 3: add feature logging, freshness SLAs and a fallback when a feature is stale.</p>`],
    solution: {
      approach: `<p>Split features by freshness. <b>Streaming</b>: card/device/IP counts over 1, 10 and 60 minutes via Kafka + Flink with sliding windows, written to the online store (Redis/DynamoDB) and to the offline store as timestamped history. <b>Batch</b>: 30/90-day averages and merchant risk computed daily in Spark, materialized to the online store. <b>On-demand</b>: IP-to-billing distance, amount vs user average - defined as functions in the feature platform so training replays the same code. Serving does one batched multi-get (~3-5 ms), computes on-demand features, scores the model (~10 ms) and logs the exact feature vector. Training builds data with point-in-time joins or, better, from the logged vectors. Each feature view has a TTL and a freshness SLA; stale streaming features trigger defaults plus an alert, and the rules engine remains as a fallback. Capacity: 5k QPS x 1 multi-get is easy for a Redis cluster.</p>`,
      complexity: `<p>Online lookup O(features) per request in one round trip; streaming state O(active keys x windows).</p>`,
      followUps: ['How do you handle late-arriving events in the window?', 'How do you backfill a new streaming feature?']
    }
  }]
});

/* ---------------- Topic 3: experiment tracking + registry ---------------- */
topics.push({
  title: 'Experiment Tracking and the Model Registry (MLflow)',
  analogy: `<p>A science lab notebook plus a pharmacy shelf. The <b>lab notebook</b> (experiment tracker) records every attempt: ingredients, temperature, result - even the failures - so anyone can repeat it. The <b>pharmacy shelf</b> (model registry) holds only approved, labelled medicine bottles with batch numbers; the pharmacist checks the label before handing one out, and an old batch can be pulled back if the new one causes problems.</p>`,
  explain: `<p>🟢 <b>Experiment tracking</b> logs, for every training run: parameters, metrics (per epoch too), the code commit, the data version, the environment, and artifacts (model file, plots, confusion matrix). Then you can compare runs in a UI, reproduce a result, and answer "which data trained the model in production?". Tools: MLflow Tracking, Weights &amp; Biases, Neptune, Comet, SageMaker/Vertex experiments.</p>
  <p><b>The model registry</b> is a catalogue of <b>model versions</b> with lineage back to the run that produced them, plus lifecycle state:</p>
  ${H.table(['Concept', 'Meaning'], [['Registered model', 'A named model, e.g. fraud-model'], ['Version', 'An immutable artifact: v1, v2, v3... linked to a run id'], ['Stage / alias', 'Classic MLflow stages: None, Staging, Production, Archived. Newer MLflow recommends aliases like <code>@champion</code> and <code>@challenger</code> plus tags'], ['Approval', 'Who promoted it, when, with what evidence'], ['Signature', 'Expected input/output schema, checked at serving time']])}
  <p><b>The key decoupling:</b> serving loads <code>models:/fraud-model@champion</code>, not a file path. Promoting or rolling back is just moving the alias - no code deploy. Because versions are immutable, rollback is instant and safe.</p>
  <p><b>Gates.</b> Promotion should require evidence: offline metrics above threshold and not worse than the current champion, no slice regressions, latency and size budgets, and a human or automated approval. The registry records it all for audit (important in regulated domains like credit and health).</p>`,
  clues: ['"Which data/code produced the model in production?" -> experiment tracking + registry lineage', '"Roll back the model in one minute" -> immutable versions + alias/stage move', '"Reproduce last month\'s model" -> pinned code commit, data version, env, seed', '"Approval / audit for regulators" -> registry with transitions, approvers and evidence', '"Compare 200 hyperparameter runs" -> tracking server UI, logged params and metrics'],
  code: [{ lang: 'python', code: PY.registry, run: true, title: 'Model registry state machine with a quality gate (runnable)' },
    { lang: 'python', check: false, title: 'MLflow tracking + registry with aliases (needs mlflow, not run here)', code: `import mlflow
from mlflow import MlflowClient
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.metrics import roc_auc_score

mlflow.set_experiment("fraud-model")
with mlflow.start_run() as run:
    params = {"n_estimators": 300, "max_depth": 3, "learning_rate": 0.05}
    mlflow.log_params(params)
    mlflow.set_tags({"git_commit": GIT_SHA, "data_version": "txn_2026_10_01"})
    model = GradientBoostingClassifier(**params).fit(X_train, y_train)
    auc = roc_auc_score(y_val, model.predict_proba(X_val)[:, 1])
    mlflow.log_metric("val_auc", auc)
    mlflow.sklearn.log_model(model, "model",
                             input_example=X_val[:5],          # infers the signature
                             registered_model_name="fraud-model")

client = MlflowClient()
latest = client.search_model_versions("name='fraud-model'")[0]
if auc >= 0.80:
    client.set_registered_model_alias("fraud-model", "challenger", latest.version)

# Serving code never changes: it always loads whatever "champion" points at
champion = mlflow.pyfunc.load_model("models:/fraud-model@champion")` }],
  codeTitle: ['Registry state machine', 'MLflow tracking + aliases'],
  viz: {
    title: 'Registry transitions with a gate',
    input: 'reg 0.82, stage 1, prod 1, reg 0.79, stage 2, prod 2, reg 0.85, stage 3, prod 3',
    inputLabel: 'Actions: reg AUC | stage N | prod N | archive N (comma separated)',
    gen: function (input) {
      var acts = String(input).split(',').map(function (s) { return s.trim(); }).filter(Boolean);
      if (!acts.length || acts.length > 15) throw new Error('Give 1-15 actions like: reg 0.82, stage 1, prod 1');
      var vers = [], f = [];
      function tbl(hlRow) { var hl = {}; if (hlRow != null) hl[hlRow] = 'cur'; return { type: 'table', label: 'fraud-model versions', columns: ['version', 'val AUC', 'stage'], rows: vers.map(function (v, i) { return ['v' + (i + 1), v.auc.toFixed(2), v.stage]; }), hl: hl }; }
      f.push({ narr: 'Empty registry. Gate for Production: <b>AUC ≥ 0.80</b> and must be in Staging first. Only one Production version at a time.', parts: [tbl()] });
      acts.forEach(function (a) {
        var m = a.split(/\s+/), cmd = m[0], arg = Number(m[1]);
        if (cmd === 'reg') {
          if (isNaN(arg)) throw new Error('reg needs an AUC, e.g. reg 0.83');
          vers.push({ auc: arg, stage: 'None' });
          f.push({ narr: 'Register <b>v' + vers.length + '</b> (AUC ' + arg.toFixed(2) + ') from a tracked run. It starts in stage None: stored, but nothing serves it.', parts: [tbl(vers.length - 1)] });
          return;
        }
        var v = vers[arg - 1];
        if (!v) throw new Error('Unknown version in: ' + a);
        if (cmd === 'stage') {
          if (v.stage !== 'None' && v.stage !== 'Archived') { f.push({ narr: '<span class="c-r">Blocked:</span> v' + arg + ' is ' + v.stage + ' and cannot move to Staging.', parts: [tbl(arg - 1)] }); return; }
          v.stage = 'Staging';
          f.push({ narr: 'v' + arg + ' -> <b>Staging</b>: integration tests and shadow traffic run against it.', parts: [tbl(arg - 1)] });
        } else if (cmd === 'prod') {
          if (v.stage !== 'Staging') { f.push({ narr: '<span class="c-r">Blocked:</span> v' + arg + ' must be in Staging first (it is ' + v.stage + ').', parts: [tbl(arg - 1)] }); return; }
          if (v.auc < 0.80) { f.push({ narr: '<span class="c-r">Gate failed:</span> v' + arg + ' AUC ' + v.auc.toFixed(2) + ' &lt; 0.80. It stays in Staging. The registry records the rejected attempt.', parts: [tbl(arg - 1)] }); return; }
          vers.forEach(function (o) { if (o.stage === 'Production') o.stage = 'Archived'; });
          v.stage = 'Production';
          f.push({ narr: '<span class="c-g">Promoted</span> v' + arg + ' to Production. The previous champion is archived in the same step - rollback = point back to it.', parts: [tbl(arg - 1)] });
        } else if (cmd === 'archive') {
          v.stage = 'Archived';
          f.push({ narr: 'v' + arg + ' archived. Artifacts are kept for audit and possible rollback.', parts: [tbl(arg - 1)] });
        } else throw new Error('Unknown action "' + cmd + '". Use reg, stage, prod or archive.');
      });
      while (f.length < 4) f.push({ narr: 'Add more actions to see more transitions.', parts: [tbl()] });
      return f;
    }
  },
  examples: [
    { title: 'What a good run record contains', html: `${H.kv([['run_id', 'a1f3...'], ['git_commit', '9c2e71b'], ['data_version', 'txn_2026_10_01 (Delta v412)'], ['params', 'depth=3, lr=0.05, trees=300'], ['metrics', 'val_auc=0.852, logloss=0.21'], ['artifacts', 'model.pkl, signature, plots'], ['env', 'requirements.lock / image digest']], { label: 'Tracked run' })}` },
    { title: 'Rollback in one command', html: `<p>v7 went live and complaints spike. Move the alias: <code>set_registered_model_alias("fraud-model", "champion", 6)</code>. Servers that reload aliases (or are restarted by the deploy tool) pick up v6. No rebuild, no retrain.</p>` },
    { title: 'Stages vs aliases', html: `<p>Classic MLflow stages (Staging/Production) allow only fixed names. Aliases are free-form pointers (<code>champion</code>, <code>challenger</code>, <code>shadow</code>) and environments are often modelled as separate registries or workspaces (dev, staging, prod) with models copied between them after approval.</p>` }
  ],
  deepDive: `<p><b>Lineage end to end:</b> production prediction -> model version -> run id -> code commit + data snapshot + feature definitions. When an auditor asks why a loan was denied, you need this chain plus the logged features for that request.</p>
  <p><b>Model signature and input validation.</b> Save the schema with the model; the server rejects requests with missing columns or wrong types instead of producing garbage.</p>
  <p><b>Artifact storage.</b> The tracking server stores metadata in a DB (Postgres) and artifacts in object storage (S3/GCS). Control access - model files can contain training data memorised by the model.</p>
  <p><b>Hyperparameter search at scale</b> (Optuna, Ray Tune) produces hundreds of runs - log them as child runs under one parent so the UI stays usable.</p>
  <p><b>Model cards</b> document intended use, training data, metrics per slice, limitations and owners; attach them to the version.</p>`,
  aiEra: `<p><b>What AI changes:</b> the same registry now holds fine-tuned LLM adapters, embedding models and even prompt versions; MLflow and W&amp;B added LLM tracing and evaluation features. Agents can launch sweeps and summarise run comparisons.</p>
  <p><b>Use AI as a partner:</b> <code>Compare these 40 runs and tell me which hyperparameters matter</code>, or ask it to draft a model card from the run metadata.</p>
  <p><b>Where AI goes wrong:</b> it picks the run with the best single metric even when it was evaluated on a different data version, and it invents API names from old MLflow versions (stages vs aliases).</p>
  <p><b>What you must still own:</b> the promotion criteria, approvals, and making sure lineage is complete before anything reaches production.</p>`,
  problems: [{
    title: 'Design the promotion process for a credit model',
    level: 'Medium', tags: ['registry', 'governance'], companies: ['Capital One', 'Any bank'],
    statement: `<p>A bank retrains its credit-risk model monthly. Regulators require that every production model can be reproduced and every promotion justified. Design tracking, registry and promotion.</p>`,
    constraints: `Rollback must take under 5 minutes; two approvers required.`,
    example: `<p>v14 registered -> automated checks -> challenger alias -> shadow for 2 weeks -> two approvals -> champion.</p>`,
    brute: { why: `<p>Naive: data scientist emails a pickle file to engineering, who copy it onto the server. No lineage, no approvals, rollback means finding the old file on someone's laptop.</p>` },
    mcq: { q: 'What makes a 5-minute rollback possible?', options: ['Immutable registered versions plus an alias that serving resolves', 'Retraining the old model quickly', 'Keeping the training notebook', 'A bigger server'], answer: 0, explain: 'Old versions are kept intact; you only move a pointer.' },
    hints: [`<p>Hint 1: what must be pinned to reproduce a run?</p>`, `<p>Hint 2: serving should resolve a name/alias, not a file path.</p>`, `<p>Hint 3: list automatic gates, then human approvals, then the audit trail.</p>`],
    solution: {
      approach: `<p><b>Tracking:</b> every training run logs git commit, data snapshot id (time-travel table version), feature definitions version, container digest, seed, params, metrics overall and per protected slice, and fairness metrics. <b>Registry:</b> the pipeline registers the model with its signature and model card; versions are immutable. <b>Automated gates:</b> data tests pass, AUC/KS not worse than champion beyond a tolerance, no slice regression, stability (PSI of scores vs last month), latency budget. Passing sets alias <code>challenger</code>. <b>Shadow</b> on live applications for two weeks comparing approval rates and score distributions. <b>Approvals:</b> model risk management and business owner approve in the registry (recorded with comments and evidence links). Promotion moves <code>champion</code>; previous version stays for rollback by moving the alias back. All transitions and predictions with logged features are retained for audit.</p>`,
      complexity: `<p>Operational: rollback is O(1) pointer change plus cache reload.</p>`,
      followUps: ['How do you reproduce a model if the source table was deleted?', 'What goes in a model card?']
    }
  }]
});

/* ---------------- Topic 4: packaging and serving ---------------- */
topics.push({
  title: 'Packaging and Serving Models: Batch vs Online, REST vs gRPC',
  analogy: `<p>A bakery can bake <b>overnight</b> and stack bread on shelves for the morning rush (batch prediction: compute everything ahead of time), or bake <b>to order</b> when a customer walks in (online prediction: compute when asked). Overnight is cheap and simple but bread may be stale; to-order is fresh but you need ovens hot and staff ready at all times. Many shops do both. And a busy oven fits several loaves at once - waiting two seconds to fill a tray (batching) bakes far more per hour.</p>`,
  explain: `<p>🟢 <b>Packaging</b> means bundling the model file, the preprocessing code, the exact library versions and a server into something deployable - almost always a <b>container image</b>. Formats: pickle/joblib (sklearn, fragile across versions), ONNX (portable, fast runtimes), TorchScript / <code>torch.export</code>, TensorFlow SavedModel, XGBoost/LightGBM native files, MLflow pyfunc (wraps any of these with a standard interface).</p>
  ${H.table(['', 'Batch prediction', 'Online (real-time) prediction'], [['When', 'Scheduled (nightly/hourly)', 'Per request'], ['Latency', 'Minutes-hours, nobody waits', 'Milliseconds'], ['Input', 'All entities, from the warehouse', 'One request + online features'], ['Output', 'Table of scores, looked up later', 'Response to the caller'], ['Cost', 'Cheap, spot instances, full utilisation', 'Always-on capacity for peak'], ['Examples', 'Churn scores, email recommendations, forecasts', 'Fraud, search ranking, pricing'], ['Weakness', 'Stale for new users / new context', 'Latency, scaling, harder ops']])}
  <p>A middle ground: <b>streaming prediction</b> (score events from Kafka as they arrive) and <b>precompute + online re-rank</b> (batch candidates, cheap online model for the final order).</p>
  <p><b>REST vs gRPC.</b> REST/JSON over HTTP is simple, debuggable, browser friendly. gRPC uses HTTP/2 and Protocol Buffers: binary (smaller, faster to parse), typed contracts, streaming, multiplexed connections - preferred for internal service-to-service calls with tight latency or large tensors. Model servers (NVIDIA Triton, TorchServe, TF Serving, KServe, BentoML, Seldon, Ray Serve) usually offer both.</p>
  <p><b>Dynamic batching:</b> the server waits a few milliseconds to group requests into one forward pass. Hardware (especially GPUs) is much more efficient per item in batches, so throughput rises and even tail latency can fall under load.</p>`,
  clues: ['"Scores needed once a day for all users" -> batch prediction to a table', '"Respond within 50 ms per request" -> online serving, small model, cached features', '"Internal service, high QPS, large payloads" -> gRPC + protobuf', '"GPU underutilised / throughput too low" -> dynamic batching, model optimisation', '"Works on my laptop, fails in prod" -> container with pinned versions, model signature'],
  code: [{ lang: 'python', code: PY.batching, run: true, title: 'Dynamic batching simulator: throughput vs latency (runnable)' },
    { lang: 'python', check: false, title: 'Minimal online model service with FastAPI (not run here)', code: `# app.py - container entrypoint: uvicorn app:app --workers 2
import joblib, time
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

MODEL_VERSION = "fraud-model:14"
model = joblib.load("/models/fraud-model-14.joblib")   # load ONCE at startup, not per request
app = FastAPI()

class Txn(BaseModel):                 # request schema = model signature
    amount: float = Field(ge=0)
    txn_count_10m: int = Field(ge=0)
    avg_amount_30d: float
    ip_distance_km: float

@app.get("/healthz")                  # liveness/readiness for Kubernetes
def health():
    return {"ok": True, "model": MODEL_VERSION}

@app.post("/predict")
def predict(t: Txn):
    start = time.perf_counter()
    x = [[t.amount, t.txn_count_10m, t.avg_amount_30d, t.ip_distance_km]]
    try:
        p = float(model.predict_proba(x)[0, 1])
    except Exception as e:
        raise HTTPException(500, f"inference failed: {e}")
    # log features + prediction + version for monitoring and future training
    return {"fraud_probability": p, "model_version": MODEL_VERSION,
            "latency_ms": round((time.perf_counter() - start) * 1000, 2)}` },
    { lang: 'text', check: false, title: 'gRPC contract (predict.proto)', code: `syntax = "proto3";
service FraudModel {
  rpc Predict (TxnRequest) returns (Score);
}
message TxnRequest {
  double amount = 1;
  int32 txn_count_10m = 2;
  double avg_amount_30d = 3;
  double ip_distance_km = 4;
}
message Score {
  double fraud_probability = 1;
  string model_version = 2;
}` }],
  codeTitle: ['Dynamic batching', 'FastAPI online service', 'gRPC contract'],
  viz: {
    title: 'Dynamic batching queue',
    input: '0 1 2 3 10 11 30 31 32 33 34 35',
    inputLabel: 'Request arrival times in ms (max batch 4, max wait 5 ms)',
    gen: function (input) {
      var arr = String(input).trim().split(/[\s,]+/).map(Number);
      if (!arr.length || arr.length > 20 || arr.some(function (x) { return isNaN(x) || x < 0; })) throw new Error('Enter up to 20 non-negative arrival times, e.g. 0 1 2 10');
      arr.sort(function (a, b) { return a - b; });
      var MB = 4, MW = 5, FIX = 8, PER = 1, f = [], q = [], i = 0, t = 0, n = 0;
      f.push({ narr: 'Policy: run the model when <b>4 requests</b> are waiting OR the oldest has waited <b>5 ms</b>. Each forward pass costs 8 ms fixed + 1 ms per item, so bigger batches are cheaper per request.', parts: [{ type: 'queue', label: 'waiting requests (arrival ms)', items: [] }, { type: 'vars', vals: { clock_ms: 0, passes: 0 } }] });
      var guard = 0;
      while ((i < arr.length || q.length) && guard++ < 200) {
        if (!q.length) t = Math.max(t, arr[i]);
        while (i < arr.length && arr[i] <= t) q.push(arr[i++]);
        var dl = q[0] + MW;
        if (q.length >= MB || ((i === arr.length || arr[i] > dl) && t >= dl)) {
          var b = q.slice(0, MB); q = q.slice(MB); n++;
          var run = FIX + PER * b.length;
          f.push({ narr: 't=' + t + ' ms: flush because ' + (b.length >= MB ? 'the batch is full' : 'the oldest request waited ' + MW + ' ms') + '. Run ' + b.length + ' request(s) in one pass taking ' + run + ' ms (' + (run / b.length).toFixed(1) + ' ms per request).', parts: [{ type: 'queue', label: 'batch being scored', items: b.map(String), hl: b.reduce(function (o, _, k) { o[k] = 'ok'; return o; }, {}) }, { type: 'vars', vals: { clock_ms: t, passes: n, still_waiting: q.length } }] });
          t += run;
        } else {
          t = i < arr.length ? Math.min(dl, arr[i]) : dl;
          f.push({ narr: 'Waiting: ' + q.length + ' request(s) queued, not full yet. Clock moves to ' + t + ' ms (next arrival or the wait deadline).', parts: [{ type: 'queue', label: 'waiting requests (arrival ms)', items: q.map(String), hl: { 0: 'cur' } }, { type: 'vars', vals: { clock_ms: t, passes: n } }] });
        }
      }
      f.push({ narr: 'Done: <b>' + arr.length + '</b> requests in <b>' + n + '</b> forward passes. Without batching it would be ' + arr.length + ' passes of 9 ms each. Tune max batch and max wait against your p99 latency budget.', parts: [{ type: 'bars', label: 'forward passes', values: [arr.length, n], idxLabels: ['no batching', 'dynamic batching'], hl: { 1: 'ok' } }] });
      return f;
    }
  },
  examples: [
    { title: 'Choosing batch vs online', html: `${H.table(['Use case', 'Choice', 'Why'], [['Weekly churn email list', 'Batch', 'Nobody waits; score all users once'], ['Card fraud at checkout', 'Online', 'Decision needed in ms with fresh context'], ['Home feed for 50M users', 'Batch candidates + online re-rank', 'Heavy part offline, fresh context online'], ['Delivery ETA', 'Online', 'Depends on live traffic and courier location']])}` },
    { title: 'Run the batching simulator', html: `<p>Press ▶: 13 requests take 13 passes (117 ms busy) without batching but only 5 passes (53 ms) with batching, and median latency drops because the queue no longer backs up.</p>` },
    { title: 'Scaling an online model', html: `<p>Each replica handles 200 QPS at p99 25 ms. Peak 3,000 QPS -> 15 replicas, plus 30-50% headroom -> ~20, autoscaled on CPU/GPU or request concurrency. Load the model at startup and use readiness probes so new pods get traffic only after warm-up.</p>` }
  ],
  deepDive: `<p><b>Latency anatomy</b> of an online prediction: network + deserialisation + feature fetch + preprocessing + inference + postprocessing. Inference is often not the biggest part; JSON parsing of large payloads and one-by-one feature lookups often are.</p>
  <p><b>Model optimisation:</b> convert to ONNX Runtime or TensorRT, quantise (INT8) when accuracy allows, prune features, distil a big model into a smaller one, and pin thread counts (oversubscribed CPU threads destroy tail latency).</p>
  <p><b>Serving patterns:</b> model embedded in the app (fast, but model updates need app deploys), separate model service (independent scaling and releases), or serverless endpoints (scale to zero, cold starts). Multi-model servers (Triton, KServe ModelMesh) pack many small models per node to save cost.</p>
  <p><b>Batch at scale:</b> Spark with a pandas UDF that loads the model once per executor; write results partitioned by date with the model version column; make the job idempotent so reruns overwrite one partition.</p>
  <p><b>Pickle danger:</b> unpickling runs arbitrary code - only load artifacts from your own registry; prefer safer formats (ONNX, safetensors) across trust boundaries.</p>`,
  aiEra: `<p><b>What AI changes:</b> LLM serving (vLLM, TGI, continuous batching, KV cache) took the batching idea to its extreme - covered in the LLM modules. Classical model serving is now often on the same Kubernetes platforms (KServe, Ray Serve) as LLMs.</p>
  <p><b>Use AI as a partner:</b> generate the FastAPI/BentoML wrapper, Dockerfile and load-test script, then ask it to review for loading the model per request or missing health checks.</p>
  <p><b>Where AI goes wrong:</b> it loads the model inside the request handler, ignores input validation, and recommends GPUs for a gradient-boosted tree that runs in 1 ms on CPU.</p>
  <p><b>What you must still own:</b> batch-vs-online choice, the latency budget, capacity math and the API contract.</p>`,
  problems: [{
    title: 'Serve a recommendation model for 50M users',
    level: 'Hard', tags: ['serving', 'batch vs online'], companies: ['Netflix', 'Spotify'],
    statement: `<p>Design serving for a home-page recommender: 50M daily users, page load budget 100 ms for recommendations, catalogue of 2M items, model is a two-tower retrieval model plus a ranking model.</p>`,
    constraints: `Recommendations should reflect what the user clicked in this session.`,
    example: `<p>Nightly batch: top 500 candidates per user. Online: re-rank with session features.</p>`,
    brute: { why: `<p>Naive: score all 2M items with the ranking model on every page load: 2M inferences per request is impossible in 100 ms. Pure batch: fast but ignores this session's clicks.</p>` },
    mcq: { q: 'What makes per-request retrieval over 2M items fast?', options: ['Approximate nearest neighbour search over item embeddings', 'A bigger ranking model', 'REST instead of gRPC', 'Daily retraining'], answer: 0, explain: 'Two-tower models put items in an ANN index; retrieval becomes a vector search.' },
    hints: [`<p>Hint 1: split the work into retrieval (many items, cheap) and ranking (few items, expensive).</p>`, `<p>Hint 2: decide which part can be precomputed in batch.</p>`, `<p>Hint 3: add caching, fallbacks and the latency budget per step.</p>`],
    solution: {
      approach: `<p><b>Offline/batch:</b> train daily; compute item embeddings for 2M items and build an ANN index (HNSW/ScaNN); optionally precompute top-500 candidates per user and store them in a KV store. <b>Online (≤100 ms):</b> fetch user embedding/session features from the online feature store (5 ms); retrieve ~500 candidates via ANN from the session-aware user tower (10 ms) merged with precomputed candidates; rank them with the ranking model on CPU/GPU with dynamic batching via gRPC (30 ms); apply business rules and diversity (5 ms). <b>Fallbacks:</b> if ranking times out, serve precomputed candidates; if those are missing (new user), serve popular items. <b>Release:</b> new models via shadow then A/B on engagement. <b>Cost:</b> batch work on spot instances; online replicas autoscaled by QPS.</p>`,
      complexity: `<p>Retrieval O(log N) ANN; ranking O(candidates) per request.</p>`,
      followUps: ['How do you handle a brand-new item?', 'How do you keep the ANN index updated?']
    }
  }]
});

/* ---------------- Topic 5: shadow, canary, A/B ---------------- */
topics.push({
  title: 'Safe Releases: Shadow Deployments, Canaries and A/B Tests',
  analogy: `<p>A new pilot first sits in the <b>simulator next to a real flight</b>, making every decision but touching nothing (shadow). Then they fly <b>one short route with a senior pilot</b> watching, ready to take over (canary). Only then does the airline compare them fairly with other pilots on <b>passenger satisfaction across many flights</b> (A/B test). Each step answers a different question: is it safe, is it healthy, is it better?</p>`,
  explain: `<p>🟢 <b>Three tools, three questions.</b></p>
  ${H.table(['Strategy', 'Users see new model?', 'Answers', 'Watch'], [['Shadow (dark launch)', 'No - it gets a copy of traffic, output is logged and discarded', 'Does it run correctly at real load? How different are its predictions?', 'Errors, latency, prediction agreement/distribution'], ['Canary', 'Yes, a small % (1 -> 5 -> 25 -> 100)', 'Is it healthy? Can we roll forward safely?', 'Error rate, latency, prediction distribution, guardrails'], ['A/B test', 'Yes, random split (often 50/50) for weeks', 'Does it improve the business metric?', 'Primary metric + guardrails with statistical significance'], ['Blue/green', 'All at once, with instant switch back', 'Fast cutover with easy rollback', 'Same as canary, compressed'], ['Interleaving / bandits', 'Mixed results lists / adaptive split', 'Faster ranking comparisons / less regret', 'Click preference, reward']])}
  <p><b>Sticky assignment:</b> hash a stable id (user id + experiment salt) into buckets 0-9999, so a user always sees the same variant. Random per request mixes experiences and breaks the measurement.</p>
  <p><b>Automatic rollback:</b> define rollback criteria before starting (e.g. canary error rate &gt; 1.5x baseline, p99 latency &gt; 60 ms, prediction mean shifted &gt; 20%) and let the deploy tool (Argo Rollouts, Flagger, SageMaker deployment guardrails, Istio weights) act without waiting for a human.</p>
  <p><b>Why models need A/B tests, not only offline metrics:</b> offline AUC is measured on historical data shaped by the <i>old</i> model. Feedback loops, user behaviour changes and business constraints mean only an online experiment shows real impact (revenue, conversion, fraud losses).</p>`,
  clues: ['"Test the new model without risk to users" -> shadow deployment', '"Roll out gradually and stop if it breaks" -> canary with automatic rollback', '"Does the new ranker increase revenue?" -> A/B test, primary + guardrail metrics, significance', '"Same user must see the same model" -> sticky hash-based assignment', '"Instant switch with old version on standby" -> blue/green'],
  code: [{ lang: 'python', code: PY.canary, run: true, title: 'Sticky canary splitter with staged rollout and auto-rollback (runnable)' },
    { lang: 'yaml', check: false, title: 'Argo Rollouts canary with an analysis gate (not run here)', code: `apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: fraud-model
spec:
  strategy:
    canary:
      steps:
        - setWeight: 5
        - pause: {duration: 30m}
        - analysis:
            templates: [{templateName: model-health}]   # error rate, p99, score mean
        - setWeight: 25
        - pause: {duration: 2h}
        - setWeight: 100
  template:
    spec:
      containers:
        - name: server
          image: registry.example.com/fraud-model:15` }],
  codeTitle: ['Canary splitter', 'Argo Rollouts canary'],
  viz: {
    title: 'Staged canary rollout with automatic rollback',
    input: '0.48 0.55 0.91 0.50 0.50',
    inputLabel: 'Canary error % at stages 1,5,25,50,100 (baseline 0.50%, limit 1.5x)',
    gen: function (input) {
      var errs = String(input).trim().split(/[\s,]+/).map(Number);
      if (errs.length !== 5 || errs.some(function (x) { return isNaN(x) || x < 0 || x > 100; })) throw new Error('Enter 5 error percentages, e.g. 0.48 0.55 0.91 0.5 0.5');
      var stages = [1, 5, 25, 50, 100], lim = 0.75, f = [];
      var nodes = [box('U', 'Users', 8, 30), box('LB', 'Router', 34, 30), box('S', 'Stable v14', 70, 12, 18), box('C', 'Canary v15', 70, 48, 18), box('MON', 'Analysis', 94, 30)];
      var edges = [['U', 'LB'], ['LB', 'S', 'stable'], ['LB', 'C', 'canary'], ['S', 'MON'], ['C', 'MON']];
      f.push({ narr: 'Plan: 1% -> 5% -> 25% -> 50% -> 100%. Rollback rule set <b>before</b> starting: canary error rate must stay ≤ <b>' + lim + '%</b> (1.5x the 0.50% baseline).', parts: [{ type: 'graph', label: 'Traffic split', directed: true, height: 60, nodes: nodes, edges: edges, tags: { C: '0%' } }] });
      for (var i = 0; i < 5; i++) {
        var ok = errs[i] <= lim, e = {}; e['LB-C'] = ok ? 'ok' : 'bad'; e['C-MON'] = 'cur';
        f.push({ narr: 'Stage <b>' + stages[i] + '%</b>: users hashed into the canary buckets hit v15. Measured error rate <b>' + errs[i] + '%</b> ' + (ok ? '≤ ' + lim + '% <span class="c-g">-> healthy, promote to next stage</span>.' : '&gt; ' + lim + '% <span class="c-r">-> automatic ROLLBACK</span>.'), parts: [{ type: 'graph', label: 'Traffic split', directed: true, height: 60, nodes: nodes, edges: edges, hl: { C: ok ? 'ok' : 'bad', MON: 'cur' }, ehl: e, tags: { C: stages[i] + '%', S: (100 - stages[i]) + '%' } }, { type: 'bars', label: 'error % vs limit', values: [errs[i], lim], idxLabels: ['canary', 'limit'], hl: { 0: ok ? 'ok' : 'bad' } }] });
        if (!ok) {
          f.push({ narr: 'All traffic goes back to v14 within seconds. Only ' + stages[i] + '% of users were exposed, and only for this stage. Now debug v15 using the logged requests from the canary.', parts: [{ type: 'graph', label: 'Traffic split', directed: true, height: 60, nodes: nodes, edges: edges, hl: { S: 'ok', C: 'done' }, ehl: { 'LB-S': 'ok' }, tags: { S: '100%', C: '0%' } }] });
          return f;
        }
      }
      f.push({ narr: '<span class="c-g">Fully rolled out.</span> v15 serves 100%; keep v14 deployable for a while for fast rollback. Health is proven - but whether v15 is <i>better</i> for the business still needs an A/B test.', parts: [{ type: 'graph', label: 'Traffic split', directed: true, height: 60, nodes: nodes, edges: edges, hl: { C: 'sel' }, tags: { C: '100%', S: 'standby' } }] });
      return f;
    }
  },
  examples: [
    { title: 'Shadow mode for a pricing model', html: `<p>The new pricing model receives a copy of every quote request asynchronously (so it cannot slow the response). After a week: 0 errors, p99 18 ms, and prices differ by more than 10% for 3% of quotes - those cases are reviewed before any customer sees a new price.</p>` },
    { title: 'A/B test metrics for a new ranker', html: `${H.table(['Type', 'Metric'], [['Primary (decided in advance)', 'Purchases per session'], ['Guardrails', 'p99 latency, return rate, revenue per user, complaint rate'], ['Diagnostic', 'CTR at positions 1-3, coverage of catalogue']])}<p>Sample size computed before launch; run full weeks to cover weekday effects; do not stop early when the p-value dips below 0.05.</p>` },
    { title: 'Run the splitter', html: `<p>Press ▶: hashing gives ~1%, ~5% and ~25% of 20,000 users, the same user always lands in the same group, and the 25% stage trips the rollback rule.</p>` }
  ],
  deepDive: `<p><b>Shadow pitfalls:</b> side effects (a shadow model must never send emails or block cards), double load on feature stores, and you cannot measure user reactions - shadow only shows what the model <i>would</i> do.</p>
  <p><b>Canary pitfalls:</b> at 1% you may not have enough traffic for statistical confidence on rare errors - wait longer or use larger steps; compare canary with a same-size slice of baseline, not with total traffic; segment by region/device because a new model can break one slice only.</p>
  <p><b>A/B pitfalls:</b> peeking (stopping when it looks good inflates false positives - use fixed horizon or sequential tests), novelty effects, network effects in marketplaces (use switchback or cluster randomisation), and sample ratio mismatch (if the split is 50/50 but you see 52/48, the assignment is broken - investigate before trusting results).</p>
  <p><b>Model-specific delays:</b> fraud and credit labels arrive weeks later. Use proxy metrics (decline rate, score distribution) for the canary and keep a long-running holdout to measure true outcomes.</p>
  <p><b>Bandits</b> (Thompson sampling) shift traffic toward the winner during the test - less regret, but harder to get clean effect sizes.</p>`,
  aiEra: `<p><b>What AI changes:</b> the same shadow/canary/A-B ladder now governs prompt and LLM version changes (see the LLM System Design module). Experimentation platforms add automated analysis and LLM-written experiment summaries.</p>
  <p><b>Use AI as a partner:</b> ask it to design guardrail metrics and rollback rules for a release, or to check an experiment for sample ratio mismatch.</p>
  <p><b>Where AI goes wrong:</b> it declares winners from tiny samples, forgets guardrails, and suggests per-request randomisation.</p>
  <p><b>What you must still own:</b> the metric choice, the stopping rule and the decision to ship.</p>`,
  problems: [{
    title: 'Roll out a new fraud model safely',
    level: 'Medium', tags: ['canary', 'shadow', 'A/B'], companies: ['Stripe', 'Any'],
    statement: `<p>A new fraud model v15 looks better offline. Fraud labels (chargebacks) arrive 30-60 days later. Plan the rollout from today to 100% traffic.</p>`,
    constraints: `A bad model can block thousands of good customers per hour.`,
    example: `<p>Shadow 1 week -> canary 1/5/25% with proxy metrics -> 50/50 with a long holdout to measure chargebacks.</p>`,
    brute: { why: `<p>Naive: switch everyone to v15 because offline AUC is higher. If it is miscalibrated, the decline rate jumps and good customers are blocked before anyone notices.</p>` },
    mcq: { q: 'Which metric can you watch on day 1 of the canary?', options: ['Decline rate and score distribution vs stable', 'Chargeback rate', 'Annual fraud loss', 'Customer lifetime value'], answer: 0, explain: 'Chargebacks are delayed; proxies like decline rate are visible immediately.' },
    hints: [`<p>Hint 1: start with a stage where zero users are exposed to v15.</p>`, `<p>Hint 2: real labels are delayed - what can you measure today?</p>`, `<p>Hint 3: write rollback rules before starting and keep a holdout for the delayed truth.</p>`],
    solution: {
      approach: `<p><b>1. Shadow (1-2 weeks):</b> v15 scores a copy of live traffic asynchronously; compare score distributions, decline rate it would cause at the current threshold, latency and errors; recalibrate the threshold so the decline rate matches the business target. <b>2. Canary:</b> sticky by card/customer hash, 1% -> 5% -> 25%, each step held long enough for statistical confidence on the decline rate; automatic rollback if decline rate, manual review queue size, p99 latency or error rate exceeds pre-set limits. <b>3. Experiment:</b> 50/50 (or 90/10) with chargeback rate and false-positive rate (from customer complaints and review outcomes) measured after labels mature, plus a small long-term holdout on the old model. <b>4. Full rollout</b> with v14 kept deployable; monitor drift afterwards.</p>`,
      complexity: `<p>Timeline is dominated by label delay (30-60 days) for the final verdict.</p>`,
      followUps: ['How do you pick the decision threshold for v15?', 'What if the model is better overall but worse for one country?']
    }
  }]
});

/* ---------------- Topic 6: drift monitoring ---------------- */
topics.push({
  title: 'Monitoring Data Drift and Concept Drift',
  analogy: `<p>A weather forecaster trained on ten years of a city's weather moves to a new city. The <b>inputs changed</b> - more humidity, different winds (data drift). Or she stays home, but the climate itself shifts so the same clouds now mean a different outcome (concept drift). In both cases her forecasts get worse, even though she did nothing wrong. A good forecaster keeps checking her forecasts against what really happened.</p>`,
  explain: `<p>🟢 <b>Kinds of drift</b> (X = inputs, y = target):</p>
  ${H.table(['Name', 'What changes', 'Example', 'Detect with'], [['Data / covariate drift', 'P(X) - input distribution', 'New marketing campaign brings younger users', 'PSI, KL/JS divergence, KS test on features'], ['Prediction drift', 'P(ŷ) - output distribution', 'Average fraud score jumps from 2% to 6%', 'Same tests on predictions'], ['Label / prior drift', 'P(y) - base rate', 'Fraud rate doubles during holidays', 'Label rate over time'], ['Concept drift', 'P(y | X) - the relationship', 'Fraudsters change tactics; same features now mean different risk', 'Performance on fresh labels'], ['Upstream data bugs', 'Not real drift - broken pipeline', 'A field suddenly all zeros or nulls', 'Data validation, null rates']])}
  <p><b>PSI (Population Stability Index)</b> compares the share of data in each bin now vs at training time:</p>
  <p><code>PSI = ∑ (actual% - expected%) × ln(actual% / expected%)</code></p>
  ${H.table(['Bin', 'Train %', 'Live %', 'Contribution'], [['1', '20%', '10%', '(0.10-0.20) × ln(0.5) = 0.069'], ['2', '20%', '14%', '0.021'], ['3', '20%', '20%', '0'], ['4', '20%', '26%', '0.016'], ['5', '20%', '30%', '0.041'], ['Total', '', '', H.c('y', '0.147 -> moderate')]])}
  <p>Rule of thumb: PSI &lt; 0.1 stable, 0.1-0.25 moderate (investigate), &gt; 0.25 major (act). <b>KL divergence</b> <code>KL(P‖Q) = ∑ p ln(p/q)</code> is asymmetric; PSI is exactly KL(P‖Q) + KL(Q‖P) on the bins. <b>Jensen-Shannon</b> is a symmetric, bounded alternative; the <b>KS test</b> works on raw continuous values.</p>
  <p><b>Drift is a signal, not a verdict.</b> Inputs can drift without hurting accuracy (unimportant feature), and concept drift can hurt accuracy with no input drift at all. When labels arrive, <b>performance monitoring</b> is the ground truth; drift metrics are the early warning while you wait.</p>`,
  clues: ['"Model accuracy degraded over time" -> data drift vs concept drift, check inputs and fresh labels', '"Labels arrive weeks later" -> monitor input/prediction drift as proxy', '"Which features changed?" -> per-feature PSI / KS, ranked by importance', '"Sudden jump overnight" -> likely pipeline bug, not real-world drift', '"Seasonal business" -> compare against the same season, not a fixed training window'],
  code: [{ lang: 'python', code: PY.drift, run: true, title: 'PSI and KL divergence drift calculator (runnable)' }],
  codeTitle: ['PSI + KL drift calculator'],
  viz: {
    title: 'PSI bin by bin',
    input: '200 200 200 200 200 | 100 140 200 260 300',
    inputLabel: 'Training counts per bin | live counts per bin',
    gen: function (input) {
      var halves = String(input).split('|');
      if (halves.length !== 2) throw new Error('Use: train counts | live counts, e.g. 50 50 | 30 70');
      var e = halves[0].trim().split(/[\s,]+/).map(Number), a = halves[1].trim().split(/[\s,]+/).map(Number);
      if (e.length !== a.length || e.length < 2 || e.length > 12 || e.concat(a).some(function (x) { return isNaN(x) || x < 0; })) throw new Error('Both sides need the same number (2-12) of non-negative counts');
      var se = e.reduce(function (s, x) { return s + x; }, 0), sa = a.reduce(function (s, x) { return s + x; }, 0);
      if (!se || !sa) throw new Error('Counts must not all be zero');
      var pe = e.map(function (x) { return Math.max(x / se, 1e-4); }), pa = a.map(function (x) { return Math.max(x / sa, 1e-4); });
      var lbl = e.map(function (_, i) { return 'bin' + (i + 1); }), f = [], total = 0, rows = [];
      f.push({ narr: 'Training distribution: the bins were cut on training data (often deciles). These are the <b>expected</b> shares.', parts: [{ type: 'bars', label: 'train %', values: pe.map(function (x) { return +(100 * x).toFixed(1); }), idxLabels: lbl }] });
      f.push({ narr: 'Live traffic this week, same bins: the <b>actual</b> shares. Eyeballing says something moved - PSI puts a number on it.', parts: [{ type: 'bars', label: 'live %', values: pa.map(function (x) { return +(100 * x).toFixed(1); }), idxLabels: lbl, hl: pa.reduce(function (o, x, i) { if (Math.abs(x - pe[i]) > 0.05) o[i] = 'cur'; return o; }, {}) }] });
      for (var i = 0; i < pe.length; i++) {
        var c = (pa[i] - pe[i]) * Math.log(pa[i] / pe[i]); total += c;
        rows.push([lbl[i], (100 * pe[i]).toFixed(1) + '%', (100 * pa[i]).toFixed(1) + '%', c.toFixed(4)]);
        if (i < 6 || i === pe.length - 1) f.push({ narr: lbl[i] + ': (' + (100 * pa[i]).toFixed(1) + '% - ' + (100 * pe[i]).toFixed(1) + '%) × ln(' + (pa[i] / pe[i]).toFixed(2) + ') = <b>' + c.toFixed(4) + '</b>. Each term is ≥ 0 because the difference and the log always share a sign.', parts: [{ type: 'table', label: 'PSI terms', columns: ['bin', 'train', 'live', 'term'], rows: rows.slice(), hl: (function () { var h = {}; h[rows.length - 1] = 'cur'; return h; })() }, { type: 'vars', vals: { running_PSI: total.toFixed(4) } }] });
      }
      var v = total < 0.1 ? 'stable' : (total < 0.25 ? 'moderate - investigate' : 'MAJOR - act');
      f.push({ narr: 'Total PSI = <b>' + total.toFixed(3) + '</b> -> <b>' + v + '</b>. Next: is this feature important to the model, and do fresh labels show a performance drop?', parts: [{ type: 'vars', vals: { PSI: total.toFixed(3), verdict: v }, hl: { verdict: total < 0.1 ? 'ok' : (total < 0.25 ? 'cur' : 'bad') } }] });
      return f;
    }
  },
  examples: [
    { title: 'Three drift stories', html: `<p>Run the code. "last week" PSI 0.001 (noise). "new campaign" 0.147 (moderate - real population shift, check performance by segment). "bug: zeros sent" 0.717 with most of it in bin 1 - a sudden spike concentrated in one bin is the fingerprint of a pipeline bug, not the world changing.</p>` },
    { title: 'A monitoring dashboard for a deployed model', html: `${H.table(['Layer', 'Metrics', 'Alert example'], [['Service', 'QPS, p50/p99 latency, errors', 'p99 &gt; 50 ms for 10 min'], ['Data quality', 'Null rate, schema, ranges per feature', 'null rate &gt; 5%'], ['Data drift', 'PSI per top-20 feature, daily', 'PSI &gt; 0.25'], ['Prediction drift', 'Score histogram, positive rate', 'positive rate 2x baseline'], ['Performance', 'AUC/precision/recall when labels arrive, per slice', 'AUC drop &gt; 0.03'], ['Business', 'Fraud losses, conversion', 'weekly review']])}` },
    { title: 'Concept drift without data drift', html: `<p>During a pandemic, the same browsing features (same distribution!) suddenly predicted very different purchase behaviour. Input PSI was low, but precision on fresh labels collapsed. Only performance monitoring caught it.</p>` }
  ],
  deepDive: `<p><b>Choosing the reference window:</b> the training set, a recent stable window, or the same period last year for seasonal businesses. A fixed training reference will flag every seasonal change as drift.</p>
  <p><b>Binning matters:</b> PSI depends on bins; use quantile bins from the reference data, handle empty bins with a small epsilon, and add a separate "missing" bin so null spikes are visible. Categorical features use one bin per category plus "other".</p>
  <p><b>Too many alerts:</b> with 300 features some will always drift. Weight by feature importance, require persistence (3 days in a row), and alert on prediction drift and performance first. Statistical tests (KS, chi-square) on millions of rows flag tiny meaningless shifts - prefer effect sizes like PSI/JS.</p>
  <p><b>Delayed labels:</b> estimate performance before labels arrive with confidence-based methods (e.g. CBPE in NannyML) for calibrated classifiers, and join labels back to logged predictions by request id when they arrive.</p>
  <p><b>Tools:</b> Evidently, NannyML, WhyLabs, Arize, Fiddler, SageMaker Model Monitor, Vertex AI Model Monitoring - or scheduled SQL that computes PSI into a metrics store with Grafana alerts.</p>`,
  aiEra: `<p><b>What AI changes:</b> for text and image inputs, drift is measured on embeddings (distance between embedding distributions, cluster shares). The same idea monitors LLM inputs - topic drift in user questions - and outputs.</p>
  <p><b>Use AI as a partner:</b> feed the drift report to an assistant and ask for likely root causes per feature and which upstream tables to check first.</p>
  <p><b>Where AI goes wrong:</b> it treats every statistically significant shift as a problem and recommends retraining immediately, missing that a sudden one-bin spike is a data bug that retraining would bake into the model.</p>
  <p><b>What you must still own:</b> thresholds, the reference window, and the triage decision: fix pipeline, retrain, recalibrate, or ignore.</p>`,
  problems: [{
    title: 'Debug a sudden drop in a demand-forecast model',
    level: 'Medium', tags: ['drift', 'monitoring'], companies: ['Uber', 'Instacart'],
    statement: `<p>Forecast error (MAPE) jumped from 8% to 19% overnight for one region. PSI on <code>temperature</code> is 0.9; other features are stable. What do you do?</p>`,
    constraints: `Retraining takes 6 hours; stores rely on forecasts every morning.`,
    example: `<p>The weather provider switched that region to Fahrenheit: values look like a huge heat wave.</p>`,
    brute: { why: `<p>Naive: retrain immediately on the new data. If it is a unit bug, the model learns nonsense and the bug is now baked in.</p>` },
    mcq: { q: 'A sudden, single-feature, single-region PSI spike most likely indicates', options: ['An upstream data pipeline or source change', 'Gradual concept drift', 'Too few trees in the model', 'Normal seasonality'], answer: 0, explain: 'Real-world drift is usually gradual and broad; sudden isolated jumps are usually bugs or source changes.' },
    hints: [`<p>Hint 1: sudden + one feature + one region - real world or pipeline?</p>`, `<p>Hint 2: look at raw values and recent upstream changes.</p>`, `<p>Hint 3: mitigate first (fallback), then fix the data, then add a validation check.</p>`],
    solution: {
      approach: `<p>Triage: sudden and isolated points to a data change, not real drift. Inspect raw temperature values for that region: a distribution shifted by roughly x1.8+32 means a unit change. <b>Mitigate now:</b> serve yesterday's forecasts or a fallback model without temperature for that region, and tell the stores. <b>Fix:</b> convert units in the ingestion step (or ask the provider), backfill the affected days, rerun forecasts. <b>Prevent:</b> add data validation (allowed range per region, unit metadata, alert on PSI &gt; 0.25 for top features before scoring), a data contract with the provider, and a canary check that blocks the forecast publish if inputs fail validation. Do not retrain on corrupted data.</p>`,
      complexity: `<p>PSI per feature is O(rows) to bin + O(bins) to score.</p>`,
      followUps: ['How would you tell real drift from seasonality?', 'Which features would you monitor first?']
    }
  }]
});

/* ---------------- Topic 7: retraining, CI/CD for models, cost ---------------- */
topics.push({
  title: 'Retraining, CI/CD for Models (CT) and Cost',
  analogy: `<p>A car factory has an assembly line with inspection stations: every car is tested for brakes, emissions and paint before it leaves. Nobody drives cars straight out of the design studio. CI/CD for models is that line: every new model (from new code <i>or</i> new data) passes automatic inspections and only the good ones ship - and the factory also watches its electricity bill, because running the line 24/7 when nobody buys cars is waste.</p>`,
  explain: `<p>🟢 <b>Three things can change</b> in an ML system: code, data and the model. So ML needs more than classic CI/CD:</p>
  ${H.table(['Practice', 'Triggered by', 'Does'], [['CI', 'Code PR', 'Unit tests for feature code, data validation tests, a small training run on sample data, lint, build image'], ['CT (continuous training)', 'Schedule, drift alert, performance drop, new labelled data', 'Run the training pipeline, evaluate, register candidate'], ['CD', 'Candidate passes gates', 'Deploy to staging, shadow/canary, promote, with rollback']])}
  <p><b>Retraining triggers:</b> (1) <b>schedule</b> - simple and predictable (daily/weekly/monthly); (2) <b>drift</b> - PSI above threshold on important features; (3) <b>performance</b> - metric on fresh labels drops; (4) <b>new data volume</b>. Many teams combine a schedule with alert-driven retrains.</p>
  <p><b>The quality gate</b> (what CI checks before promotion):</p>
  <ul><li>Data tests pass (schema, nulls, ranges, no leakage features).</li><li>Candidate ≥ champion on the same held-out, time-based test set (within a tolerance).</li><li>No regression on important <b>slices</b> (new users, a country, a device) and fairness checks.</li><li>Latency, memory and model size within budget; signature compatible with the serving API.</li><li>Behavioural tests: invariance (changing the name does not change the credit score), directional (more late payments must not lower risk).</li></ul>
  <p><b>Cost</b> is part of the design: training compute (spot/preemptible instances, smaller retrain frequency, warm starts), serving (right-size instances, autoscale, CPU instead of GPU for trees, batch instead of online when allowed, multi-model servers), storage (feature history retention), and monitoring (sample logs). Measure <b>cost per 1,000 predictions</b> and the value of each retrain.</p>
  <p><b>MLOps maturity</b> (Google's levels): 0 = manual notebooks and hand-offs; 1 = automated training pipeline (CT); 2 = automated CI/CD of the pipeline itself.</p>`,
  clues: ['"How often should we retrain?" -> schedule vs drift/performance triggers, cost vs staleness', '"Automate the path from training to production" -> CI + CT + CD with gates', '"New model is better overall but worse for a group" -> slice-based gates', '"ML infrastructure bill is too high" -> spot training, right-sizing, batch vs online, autoscaling', '"Prevent a bad model from shipping automatically" -> champion/challenger gate + canary + rollback'],
  code: [{ lang: 'python', code: PY.retrain, run: true, title: 'Retrain triggers and a champion/challenger CI gate (runnable)' },
    { lang: 'yaml', check: false, title: 'CI/CD pipeline for a model (GitHub Actions sketch, not run here)', code: `name: model-ci
on:
  pull_request:            # code change -> CI
  schedule: [{cron: "0 3 * * 1"}]   # weekly continuous training
  workflow_dispatch: {}    # manual or drift-alert trigger
jobs:
  train-and-gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pip install -r requirements.lock
      - run: pytest tests/                       # feature code unit tests
      - run: python pipeline/validate_data.py    # schema, nulls, ranges
      - run: python pipeline/train.py --data-version latest
      - run: python pipeline/evaluate.py --compare champion --slices config/slices.yaml
      - run: python pipeline/register.py --alias challenger   # only if gate passed
  deploy:
    needs: train-and-gate
    runs-on: ubuntu-latest
    environment: production        # requires human approval
    steps:
      - run: ./deploy/canary.sh fraud-model challenger` }],
  codeTitle: ['Retrain triggers + CI gate', 'CI/CD workflow'],
  viz: {
    title: 'A candidate model through the CI/CD gates',
    input: '0.858 0.851 0.74 38',
    inputLabel: 'Candidate AUC, champion AUC, worst-slice AUC, p99 latency ms',
    gen: function (input) {
      var p = String(input).trim().split(/[\s,]+/).map(Number);
      if (p.length !== 4 || p.some(function (x) { return isNaN(x) || x < 0; })) throw new Error('Enter: candidate_auc champion_auc worst_slice_auc p99_ms');
      var nodes = [box('TR', 'Trigger', 6, 30), box('DV', 'Data tests', 24, 30, 15), box('T', 'Train', 41, 30), box('EV', 'Gate', 58, 30), box('REG', 'Registry', 75, 30), box('CAN', 'Canary', 93, 30)];
      var edges = [['TR', 'DV'], ['DV', 'T'], ['T', 'EV'], ['EV', 'REG'], ['REG', 'CAN']];
      function g(hl, ehl) { return { type: 'graph', label: 'Model CI/CD', directed: true, height: 60, nodes: nodes, edges: edges, hl: hl, ehl: ehl || {} }; }
      var checks = [['AUC ≥ champion - 0.005', p[0] >= p[1] - 0.005, p[0].toFixed(3) + ' vs ' + p[1].toFixed(3)], ['worst slice AUC ≥ 0.70', p[2] >= 0.70, p[2].toFixed(2)], ['p99 latency ≤ 50 ms', p[3] <= 50, p[3] + ' ms']];
      var f = [];
      f.push({ narr: 'A trigger fires: weekly schedule, a drift alert, or a code change merged.', parts: [g({ TR: 'cur' })] });
      f.push({ narr: 'Data validation on the new training snapshot: schema, nulls, ranges, label rate. Bad data stops here - never train on it.', parts: [g({ TR: 'done', DV: 'ok' }, { 'TR-DV': 'ok' })] });
      f.push({ narr: 'Training runs on cheap spot instances, logging everything to the tracker.', parts: [g({ DV: 'done', T: 'ok' }, { 'DV-T': 'ok' })] });
      var rows = [], pass = true;
      checks.forEach(function (c, i) {
        pass = pass && c[1]; rows.push([c[0], c[2], c[1] ? 'PASS' : 'FAIL']);
        f.push({ narr: 'Gate check ' + (i + 1) + ': ' + c[0] + ' -> ' + (c[1] ? '<span class="c-g">pass</span>' : '<span class="c-r">fail</span>') + '.', parts: [g({ T: 'done', EV: c[1] ? 'cur' : 'bad' }, { 'T-EV': 'ok' }), { type: 'table', label: 'Champion / challenger gate', columns: ['check', 'value', 'result'], rows: rows.slice(), hl: (function () { var h = {}; h[i] = c[1] ? 'ok' : 'bad'; return h; })() }] });
      });
      if (pass) f.push({ narr: '<span class="c-g">All gates pass.</span> Register as <code>challenger</code>, then the CD stage runs a canary with automatic rollback. A human approval can sit before production.', parts: [g({ EV: 'ok', REG: 'ok', CAN: 'cur' }, { 'EV-REG': 'ok', 'REG-CAN': 'ok' })] });
      else f.push({ narr: '<span class="c-r">Rejected.</span> The champion keeps serving. The run is still tracked so the team can see why it failed - a "better overall, worse for one slice" model is a classic catch.', parts: [g({ EV: 'bad', REG: 'done', CAN: 'done' }, { 'EV-REG': 'bad' })] });
      return f;
    }
  },
  examples: [
    { title: 'Run the gate', html: `<p>Press ▶. cand-B has the higher overall AUC than cand-A but fails the new-users slice; cand-C is best on accuracy but too slow and too big. Only cand-A ships. "Highest AUC wins" is not a release policy.</p>` },
    { title: 'Choosing a retraining cadence', html: `${H.table(['Domain', 'Typical cadence', 'Why'], [['Ads CTR / recommendations', 'Daily or continuous', 'Fast-changing items and users'], ['Fraud', 'Weekly + drift-triggered', 'Adversaries adapt'], ['Credit risk', 'Quarterly/yearly + monitoring', 'Slow labels, heavy validation and regulation'], ['Demand forecast', 'Daily refit of a light model', 'Cheap and seasonal']])}<p>Test it: backtest "retrain every N days" on history and plot metric vs N against compute cost.</p>` },
    { title: 'Cost per 1,000 predictions', html: `<p>Online service: 6 CPU replicas x $0.20/h = $1.20/h serving 400 QPS average = 1.44M predictions/h -> <b>$0.0008 per 1k</b>. Same model on 2 GPU instances at $2.50/h = <b>$0.0035 per 1k</b> - 4x more for a tree model that does not need a GPU.</p>` }
  ],
  deepDive: `<p><b>Testing ML code:</b> unit-test feature transformations with tiny fixtures (time zones, nulls, empty windows); integration-test the pipeline end-to-end on a small sample; test the serving container with recorded requests (golden outputs within tolerance).</p>
  <p><b>Train the pipeline, not the model:</b> in mature setups CI deploys the <i>training pipeline</i>, and the pipeline produces models. Then the code that created any model is versioned and reviewed.</p>
  <p><b>Feedback loops and retraining:</b> retraining on data the model influenced (only approved loans have labels) biases future models; keep exploration traffic or a holdout and use reject-inference/counterfactual techniques.</p>
  <p><b>Retrain safely:</b> warm-start vs from-scratch, fixed evaluation sets so versions are comparable, and alerts when retrains silently stop (no new version for 2 cycles).</p>
  <p><b>Cost levers:</b> spot instances with checkpointing for training, incremental training, feature pruning (fewer features = cheaper pipelines and serving), scale-to-zero for rarely used models, batch scoring instead of online when latency allows, quantisation/ONNX, and cutting log volume with sampling. Tag every resource by model and team to see cost per model.</p>`,
  aiEra: `<p><b>What AI changes:</b> coding agents now open pull requests for pipeline changes, and CI must treat their changes like any other: the same data tests and gates. LLM-based components (an LLM labelling data, an LLM feature) bring per-token cost into the training budget.</p>
  <p><b>Use AI as a partner:</b> ask it to generate behavioural tests (invariance, directional) for your model, or to read a failed CI gate report and suggest causes.</p>
  <p><b>Where AI goes wrong:</b> it writes pipelines that retrain and auto-deploy with no gate, compares models on different test sets, and ignores cost.</p>
  <p><b>What you must still own:</b> gate thresholds, approvals for high-risk models, retraining cadence and the cost/benefit decision.</p>`,
  problems: [{
    title: 'Design continuous training for an ads CTR model',
    level: 'Hard', tags: ['CI/CD', 'continuous training', 'cost'], companies: ['Meta', 'Google'],
    statement: `<p>An ads click-through-rate model goes stale within days. Design an automated retraining and deployment system that ships a new model daily without human hand-offs, safely and within a compute budget.</p>`,
    constraints: `Billions of impressions/day, labels (clicks) arrive within an hour, a bad model costs revenue immediately.`,
    example: `<p>Daily warm-start training on the last 30 days, gate vs champion on the most recent day, canary 5% for 2 hours, auto-promote.</p>`,
    brute: { why: `<p>Naive: a cron job that retrains and overwrites the production model file. One corrupted day of logs produces a broken model that goes straight to 100% traffic with no comparison and no rollback.</p>` },
    mcq: { q: 'Which evaluation set should the daily gate use?', options: ['The most recent held-out time window, same for champion and challenger', 'A random split of the 30-day training data', 'The training data itself', 'Last year\'s data'], answer: 0, explain: 'A time-based, shared holdout mimics production and makes the comparison fair.' },
    hints: [`<p>Hint 1: list what can go wrong automatically - data, training, model, serving.</p>`, `<p>Hint 2: put a gate after each risky step and keep the champion as fallback.</p>`, `<p>Hint 3: control cost with warm starts, spot capacity and sampling.</p>`],
    solution: {
      approach: `<p><b>Data:</b> click logs joined to impressions (with an attribution window) land hourly; validation checks volume, CTR base rate, schema and feature null rates; failing days are excluded and alert. <b>Training:</b> daily warm-start from the champion on the newest data (cheap), weekly full retrain; spot instances with checkpointing; all runs tracked. <b>Gate:</b> challenger vs champion on the latest held-out hour/day: log loss and calibration (predicted vs actual CTR) must not regress, slice checks (new advertisers, regions), size and latency budget. <b>Deploy:</b> register as challenger, shadow 1 hour for errors and prediction distribution, canary 5% for 2 hours with automatic rollback on revenue-per-mille, CTR calibration or latency guardrails, then promote by moving the alias. <b>Monitoring:</b> prediction drift and calibration hourly; alert if no successful promotion for 2 days. <b>Cost:</b> sample negatives during training with weight correction, warm starts, prune unused features, and track cost per training run against measured lift.</p>`,
      complexity: `<p>Daily warm-start trains on one day of data instead of 30 - roughly 30x less compute per run.</p>`,
      followUps: ['How do you correct for negative sampling in calibrated CTR?', 'What if labels were delayed by a week?']
    }
  }]
});

function prob(o) {
  return { title: o.t, level: o.l, tags: o.tags, companies: o.co || ['Any'], statement: o.s, constraints: o.c, example: o.ex,
    brute: { why: o.bw }, mcq: o.mcq, hints: o.h,
    solution: { approach: o.a, complexity: o.cx, followUps: o.fu } };
}
practice.push(prob({ t: 'Batch or online?', l: 'Easy', tags: ['serving'],
  s: `<p>Choose batch or online prediction for: (a) next-month churn risk for a retention email, (b) card fraud at checkout, (c) daily store demand forecast, (d) search result ranking.</p>`,
  c: `Justify each with latency and freshness needs.`, ex: `<p>(a) batch, (b) online, (c) batch, (d) online (often with batch candidates).</p>`,
  bw: `<p>Making everything online "to be modern" pays for always-on capacity and adds failure modes for predictions nobody waits for.</p>`,
  mcq: { q: 'The main question that decides batch vs online is', options: ['Does someone wait for the prediction, and does it need request-time context?', 'Which framework trained the model?', 'How many features there are', 'Whether it is a neural network'], answer: 0, explain: 'Latency need and request-time context decide.' },
  h: [`<p>Hint 1: does a user wait for the answer?</p>`, `<p>Hint 2: does the prediction need information that only exists at request time?</p>`, `<p>Hint 3: if neither, precompute in batch and look it up.</p>`],
  a: `<p>(a) <b>Batch</b>: weekly or daily scoring of all customers into a table that the email system reads; nobody waits and churn changes slowly. (b) <b>Online</b>: the decision must happen in the payment flow within tens of milliseconds and depends on this transaction (amount, merchant, IP). (c) <b>Batch</b>: one forecast per store per day, run every night before ordering. (d) <b>Online</b>: depends on the query typed now; commonly batch-precomputed document features plus an online ranking model. Rule: online only when someone waits AND the input exists only at request time.</p>`,
  cx: `<p>Decision is O(1); batch cost scales with entities, online with QPS.</p>`, fu: ['When would you use streaming prediction instead?'] }));
practice.push(prob({ t: 'Compute PSI by hand', l: 'Easy', tags: ['drift', 'PSI'],
  s: `<p>Training shares for 2 bins: 50% / 50%. Live shares: 30% / 70%. Compute PSI and say whether it is stable.</p>`,
  c: `Use natural log.`, ex: `<p>(0.3-0.5) ln(0.6) + (0.7-0.5) ln(1.4) = 0.102 + 0.067 = <b>0.169</b> -> moderate.</p>`,
  bw: `<p>Just comparing means misses shape changes and gives no standard threshold.</p>`,
  mcq: { q: 'Why is each PSI term non-negative?', options: ['(a-e) and ln(a/e) always have the same sign', 'Logs are always positive', 'Shares are positive', 'It is squared'], answer: 0, explain: 'If a &gt; e both are positive; if a &lt; e both are negative.' },
  h: [`<p>Hint 1: PSI = sum over bins of (actual - expected) × ln(actual / expected).</p>`, `<p>Hint 2: ln(0.6) ≈ -0.511 and ln(1.4) ≈ 0.336.</p>`, `<p>Hint 3: compare the total to 0.1 and 0.25.</p>`],
  a: `<p>Bin 1: (0.30 - 0.50) × ln(0.30/0.50) = (-0.20) × (-0.511) = 0.102. Bin 2: (0.70 - 0.50) × ln(0.70/0.50) = 0.20 × 0.336 = 0.067. PSI = 0.169, which is between 0.1 and 0.25: a <b>moderate</b> shift - investigate which population moved and check model performance on that segment before deciding to retrain.</p>`,
  cx: `<p>O(bins) arithmetic: one term per bin.</p>`, fu: ['What happens if a live bin is 0%?'] }));
practice.push(prob({ t: 'Which deployment strategy?', l: 'Easy', tags: ['shadow', 'canary', 'A/B'],
  s: `<p>Pick shadow, canary or A/B for: (a) a rewritten serving stack with the same model, (b) a new ranking model expected to raise revenue, (c) a first model that replaces hand-written rules for loan approvals.</p>`,
  c: `One strategy each (may be combined), with a reason.`, ex: `<p>(a) canary, (b) A/B, (c) shadow first.</p>`,
  bw: `<p>Flipping 100% traffic for all three: any bug or regression hits every user at once with no comparison.</p>`,
  mcq: { q: 'Which strategy exposes zero users to the new model?', options: ['Shadow', 'Canary', 'A/B test', 'Blue/green'], answer: 0, explain: 'Shadow outputs are logged, not returned.' },
  h: [`<p>Hint 1: what question does each strategy answer?</p>`, `<p>Hint 2: health -> canary, business impact -> A/B, risk-free comparison -> shadow.</p>`, `<p>Hint 3: high-risk decisions deserve shadow before anything else.</p>`],
  a: `<p>(a) <b>Canary</b>: same model, new infrastructure - the question is health (errors, latency, identical predictions), so ramp 1% -> 100% with automatic rollback; shadow comparison of outputs is a good extra. (b) <b>A/B test</b>: the question is business impact, so randomise users sticky by id, pick revenue per user as the primary metric with guardrails, and run to the planned sample size. (c) <b>Shadow</b> first: compare model decisions to the rules on live applications with zero customer risk, review disagreements and fairness, then a canary, and only then an experiment.</p>`,
  cx: `<p>Shadow doubles inference cost during the test.</p>`, fu: ['What can shadow mode never tell you?'] }));
practice.push(prob({ t: 'Build a leak-free training set', l: 'Medium', tags: ['point-in-time', 'leakage'],
  s: `<p>You predict at checkout whether an order will be returned. Features: customer return rate, items in cart, customer lifetime orders. Labels: returned within 30 days. Describe how to build the training set from event tables.</p>`,
  c: `Tables: orders(order_id, customer_id, ts), returns(order_id, ts), customer_daily_stats(customer_id, day, return_rate, lifetime_orders).`,
  ex: `<p>For order at 2026-03-10 14:00, use stats from 2026-03-09 (the last complete day), not from today's table.</p>`,
  bw: `<p>Joining current customer stats onto old orders: the return rate already includes the label of the order being predicted - classic leakage.</p>`,
  mcq: { q: 'Which stats row is correct for an order at 2026-03-10 14:00 if stats are computed at end of day?', options: ['day = 2026-03-09', 'day = 2026-03-10', 'The latest row', 'Any row'], answer: 0, explain: 'The 03-10 row is only complete after the order happened.' },
  h: [`<p>Hint 1: for each order, what did we know at checkout time?</p>`, `<p>Hint 2: an as-of join picks the latest feature row strictly available before the order time.</p>`, `<p>Hint 3: labels need a full 30-day window - drop orders too recent to have a final label.</p>`],
  a: `<p>For each order (customer, ts) do an <b>as-of join</b> to <code>customer_daily_stats</code> picking the latest row whose availability time is before ts (day ≤ order date - 1, given end-of-day computation and any pipeline delay). Items in cart comes from the order itself. The label = exists a return within 30 days of ts; exclude orders newer than 30 days (label not mature) to avoid fake negatives. Split train/validation by time (train on older months, validate on the newest) to mimic production. Verify: the return-rate feature must not include the current order's return; recompute a sample by hand; compare feature distributions against served-feature logs.</p>`,
  cx: `<p>As-of join O(n log m) with sorting, or a window join in SQL.</p>`, fu: ['How do pipeline delays change the as-of cutoff?'] }));
practice.push(prob({ t: 'Sticky traffic splitting', l: 'Medium', tags: ['canary', 'hashing'],
  s: `<p>Implement (in words or pseudocode) a router that sends p% of users to a canary, keeps each user on the same side, and lets you raise p without moving users who were already in the canary.</p>`,
  c: `No database lookup per request.`, ex: `<p>bucket = hash(salt + user_id) mod 10000; canary if bucket &lt; p × 100.</p>`,
  bw: `<p><code>random() &lt; p</code> per request: a user flips between models on every page and the experiment measures noise.</p>`,
  mcq: { q: 'Why include an experiment-specific salt in the hash?', options: ['So different experiments get independent assignments', 'To make it slower', 'For encryption', 'It is not needed'], answer: 0, explain: 'Without a salt the same users land in the treatment of every experiment.' },
  h: [`<p>Hint 1: a hash of a stable id gives a stable number.</p>`, `<p>Hint 2: map it into a fixed range of buckets.</p>`, `<p>Hint 3: a threshold on buckets grows monotonically as p rises.</p>`],
  a: `<p>Compute <code>bucket = int(sha256(salt + ":" + user_id)[:8], 16) mod 10000</code>. Route to canary if <code>bucket &lt; p × 100</code>. It is deterministic (same user, same bucket, no storage), uniform (good hash), and monotone: raising p from 5 to 25 only adds buckets 500-2499, so users already in the canary stay there. Use a new salt per experiment so assignments are independent. Logged-out users need a stable cookie/device id. Verify the realised split (sample ratio mismatch check) on each dashboard.</p>`,
  cx: `<p>O(1) per request: one hash and one compare.</p>`, fu: ['How would you exclude employees or a country from the experiment?'] }));
practice.push(prob({ t: 'Freshness SLA breach', l: 'Medium', tags: ['feature store', 'reliability'],
  s: `<p>The hourly job that writes <code>merchant_risk_score</code> to the online store has failed for 3 hours. The fraud model still serves. What should happen automatically, and what should the on-call engineer do?</p>`,
  c: `Fraud losses rise if the score is wrong; blocking all payments is unacceptable.`,
  ex: `<p>Freshness monitor alerts after 1 h over SLA; serving switches that feature to a default and flags predictions as degraded.</p>`,
  bw: `<p>Silently serving 3-hour-old values (or nulls filled with 0) - the model keeps answering confidently with wrong inputs.</p>`,
  mcq: { q: 'What signal should alert first?', options: ['Feature age exceeding its freshness SLA', 'A drop in AUC next month', 'Customer complaints', 'CPU usage'], answer: 0, explain: 'Freshness monitoring catches the pipeline failure within minutes.' },
  h: [`<p>Hint 1: detect it from data age, not from model quality.</p>`, `<p>Hint 2: decide a degraded mode in advance.</p>`, `<p>Hint 3: fix the job, backfill, and review why the alert was the first signal (or not).</p>`],
  a: `<p><b>Automatic:</b> the freshness monitor (now - last write time per feature view) breaches the 1-hour SLA and pages the owner. Serving applies the pre-agreed degraded mode: use a fallback model trained without that feature, or a safe default plus a tighter rules layer; tag predictions as degraded in logs. TTL ensures very old values become missing instead of silently used. <b>On-call:</b> check the job logs and upstream sources, rerun or fix, backfill the missing hours to both offline and online stores, confirm freshness returns, and remove degraded mode. Afterwards: postmortem, add alerting on job failure (not only freshness), and check whether training data for those hours needs correction.</p>`,
  cx: `<p>Freshness checks are O(feature views) per minute.</p>`, fu: ['How do you train a fallback model?'] }));
practice.push(prob({ t: 'Pick a retraining cadence', l: 'Medium', tags: ['retraining', 'cost'],
  s: `<p>A demand model costs $400 per full retrain. Backtests show MAPE: retrain daily 7.8%, weekly 8.1%, monthly 9.6%, quarterly 12%. Each 1 point of MAPE costs about $20k/month in waste. Choose a cadence.</p>`,
  c: `Assume 30-day months.`, ex: `<p>Weekly costs ~$1.7k/month in compute and loses only 0.3 points vs daily.</p>`,
  bw: `<p>"Retrain daily because fresher is better" ignores cost; "retrain quarterly because it is cheap" ignores lost accuracy.</p>`,
  mcq: { q: 'What is the right way to choose a cadence?', options: ['Backtest cadences and compare metric gain with compute and ops cost', 'Always daily', 'Only when someone complains', 'Match the data team\'s sprint'], answer: 0, explain: 'It is a cost/benefit decision you can measure on history.' },
  h: [`<p>Hint 1: compute monthly compute cost for each cadence.</p>`, `<p>Hint 2: convert MAPE differences into dollars.</p>`, `<p>Hint 3: add drift-triggered retrains as a safety net.</p>`],
  a: `<p>Monthly compute: daily 30 × $400 = $12,000; weekly ≈ 4.3 × $400 = $1,700; monthly $400; quarterly ≈ $133. Error cost relative to daily (7.8%): weekly +0.3 pts = $6,000; monthly +1.8 = $36,000; quarterly +4.2 = $84,000. Totals (compute + extra error): daily $12,000, weekly $7,700, monthly $36,400, quarterly $84,133. <b>Weekly wins.</b> Add a drift/performance trigger for unexpected shifts (holidays, promotions) and consider cheap daily warm-start refits if they cost far less than a full retrain.</p>`,
  cx: `<p>Backtesting cost: one training per cadence step over the history window.</p>`, fu: ['How would you include engineer time in the decision?'] }));
practice.push(prob({ t: 'Model latency budget', l: 'Medium', tags: ['serving', 'latency'],
  s: `<p>A pricing API must answer in 80 ms p99. Measured: network 10 ms, JSON parsing of a 200 KB payload 15 ms, 30 sequential feature lookups at 2 ms each, model 12 ms. Where do you cut?</p>`,
  c: `p99 is currently ~100 ms.`, ex: `<p>Batch the 30 lookups into one multi-get (~3 ms) and shrink the payload / use protobuf.</p>`,
  bw: `<p>Buying a faster GPU for the model: the model is only 12 ms of ~100 ms.</p>`,
  mcq: { q: 'The biggest single win here is', options: ['Batching the 30 feature lookups into one call', 'A bigger model server', 'Retraining', 'Logging less'], answer: 0, explain: '60 ms is spent in sequential lookups.' },
  h: [`<p>Hint 1: add up each component of the 100 ms request.</p>`, `<p>Hint 2: attack the biggest sequential cost first.</p>`, `<p>Hint 3: then look at serialisation and the model.</p>`],
  a: `<p>Total ≈ 10 + 15 + 60 + 12 = 97 ms. The 30 sequential lookups (60 ms) dominate: use one batched multi-get or pipeline, which brings it to ~3-5 ms. Then reduce parsing: send only needed fields, or switch the internal call to gRPC/protobuf (~2-3 ms). New total ≈ 10 + 3 + 5 + 12 = 30 ms, well under 80 ms p99. Only then consider model optimisation (ONNX, fewer trees). Always profile p99, not averages, and add a timeout with a fallback price.</p>`,
  cx: `<p>Latency is the sum of sequential steps; parallel steps cost the max.</p>`, fu: ['How would you add a cache in front of the model?'] }));
practice.push(prob({ t: 'Better overall, worse for a slice', l: 'Hard', tags: ['CI/CD', 'fairness', 'evaluation'],
  s: `<p>The challenger beats the champion on overall AUC (0.866 vs 0.851) but drops new-user AUC from 0.72 to 0.66. New users are 8% of traffic but most of future growth. Should the pipeline promote it? Design the gate policy.</p>`,
  c: `The pipeline runs automatically every week.`, ex: `<p>Reject automatically; open a ticket; investigate new-user features.</p>`,
  bw: `<p>"Highest overall metric wins": averages hide regressions on important groups, which compounds over time.</p>`,
  mcq: { q: 'What should a mature gate do here?', options: ['Block promotion because a critical slice regressed beyond tolerance', 'Promote because AUC is higher', 'Promote to 100% and monitor', 'Average the two models'], answer: 0, explain: 'Slice gates exist exactly for this case.' },
  h: [`<p>Hint 1: which slices matter to the business or to fairness?</p>`, `<p>Hint 2: define per-slice tolerances, not only an overall threshold.</p>`, `<p>Hint 3: then debug why the slice regressed.</p>`],
  a: `<p>Do not promote. Gate policy: overall metric ≥ champion - tolerance AND for each declared critical slice (new users, each country, device type, protected groups) metric ≥ champion slice metric - slice tolerance (e.g. 0.01) AND minimum absolute floor (e.g. 0.70), with minimum sample sizes per slice for stable estimates. Failures block auto-promotion, notify owners and attach the slice report. Debug: new-user rows may be under-represented after a data change, a feature may now be missing for new users, or the model overfits heavy users; try reweighting, a dedicated new-user feature set or a separate model. Keep the champion until a challenger passes.</p>`,
  cx: `<p>Evaluation cost O(slices × test rows).</p>`, fu: ['How do you avoid testing so many slices that some fail by chance?'] }));
practice.push(prob({ t: 'Design an MLOps platform for 50 models', l: 'Hard', tags: ['platform', 'system design'], co: ['Uber', 'Airbnb'],
  s: `<p>A company has 50 models built by 8 teams, deployed by hand. Design a platform covering features, training, registry, serving, monitoring and CI/CD.</p>`,
  c: `Mix of batch and online models; small platform team of 5.`, ex: `<p>Uber's Michelangelo and Airbnb's Bighead are well-known examples of this kind of platform.</p>`,
  bw: `<p>Each team builds its own stack: 8 ways to deploy, no shared monitoring, no lineage, and every incident is novel.</p>`,
  mcq: { q: 'What should a small platform team standardise first?', options: ['Tracking/registry and a standard deployment path with monitoring', 'A custom deep learning framework', 'A new feature store from scratch', 'GPU clusters for every model'], answer: 0, explain: 'Paved paths for register/deploy/monitor give the most leverage.' },
  h: [`<p>Hint 1: list the lifecycle boxes and pick buy vs build for each.</p>`, `<p>Hint 2: a "paved road" template beats a perfect custom system.</p>`, `<p>Hint 3: include ownership, cost tags and migration order.</p>`],
  a: `<p><b>Paved road:</b> a project template (repo + pipeline + Dockerfile + tests). <b>Data/features:</b> warehouse + orchestration (Airflow/Dagster) with data validation; add a feature store (Feast or managed) only for the online models that need it. <b>Training:</b> pipelines on Kubernetes/managed training with spot instances; MLflow tracking for all runs. <b>Registry:</b> MLflow registry with aliases, model cards, required approvals for high-risk models. <b>Serving:</b> batch scoring jobs writing to tables with model version columns; online via KServe/BentoML containers behind a gateway with standard metrics, shadow/canary via Argo Rollouts. <b>Monitoring:</b> standard dashboards (latency, errors, PSI, prediction drift, performance when labels arrive) generated per model. <b>CI/CD/CT:</b> shared workflow with gates. <b>Governance/cost:</b> owners and tags per model, cost per model report. Migrate the highest-risk models first; measure time-to-deploy and incidents.</p>`,
  cx: `<p>Organisational: platform team supports N models with O(1) templates.</p>`, fu: ['Which parts would you buy as managed services?'] }));
practice.push(prob({ t: 'Delayed labels in credit monitoring', l: 'Hard', tags: ['monitoring', 'drift', 'labels'],
  s: `<p>A loan default model: defaults are known only after 6-12 months. How do you monitor it so problems are caught in weeks, not a year?</p>`,
  c: `Only approved loans get labels.`, ex: `<p>Monitor inputs, score distribution, approval rate and early-delinquency proxies.</p>`,
  bw: `<p>Waiting for defaults to compute AUC: by then a year of bad loans has been issued.</p>`,
  mcq: { q: 'Which is a useful early proxy label?', options: ['30-day delinquency on early payments', 'Default after 12 months', 'Number of features', 'Training loss'], answer: 0, explain: 'Early missed payments correlate with default and arrive in weeks.' },
  h: [`<p>Hint 1: what can you see on day 1, month 1, month 12?</p>`, `<p>Hint 2: think about selection bias from approvals.</p>`, `<p>Hint 3: combine drift monitors, proxies and a small exploration/holdout.</p>`],
  a: `<p>Layered monitoring: <b>day 1</b> - data quality and PSI on top features vs the development sample, score distribution and approval rate per segment, applicant mix; <b>weeks</b> - early proxies like first-payment default and 30-day delinquency by score band, checking that higher-risk bands really go delinquent more (rank ordering); <b>months</b> - vintage analysis (cohorts by month of approval) and finally true default-based AUC/KS. Selection bias: only approved loans have labels, so keep a small randomised approval band or use reject inference for unbiased estimates. Alerts on PSI &gt; 0.25 for important features or band-level delinquency outside expected ranges trigger review, recalibration or a model challenge.</p>`,
  cx: `<p>Vintage tables grow by one cohort per month.</p>`, fu: ['How do you recalibrate without retraining?'] }));
practice.push(prob({ t: 'Cut the ML infrastructure bill by 40%', l: 'Hard', tags: ['cost'],
  s: `<p>Monthly ML bill: online serving $60k (GPU instances, 20% average utilisation), training $30k (on-demand, daily full retrains of 12 models), feature store $15k, logs $10k. Plan a 40% cut without hurting quality.</p>`,
  c: `Total $115k; target ≤ $69k.`, ex: `<p>Right-size serving, spot training, retrain only when it helps, sample logs.</p>`,
  bw: `<p>Cutting monitoring entirely or downsizing everything by 40% blindly - you save money and lose the ability to detect failures.</p>`,
  mcq: { q: 'The 20% GPU utilisation suggests', options: ['Over-provisioning: autoscale, batch, multi-model packing or CPU', 'Buying more GPUs', 'Nothing can be done', 'Retraining more often'], answer: 0, explain: 'Low utilisation means paying for idle hardware.' },
  h: [`<p>Hint 1: start with the biggest line item and its utilisation.</p>`, `<p>Hint 2: ask which work must be online and which models need GPUs.</p>`, `<p>Hint 3: measure quality before and after each change.</p>`],
  a: `<p><b>Serving ($60k -> ~$25k):</b> move tree models to CPU, convert neural models to ONNX/INT8, enable dynamic batching, autoscale on load, pack small models onto multi-model servers, move models whose consumers tolerate delay to batch scoring. <b>Training ($30k -> ~$12k):</b> spot instances with checkpointing, warm-start incremental training, backtest cadence per model (weekly is often as good as daily), drift-triggered retrains. <b>Feature store ($15k -> ~$10k):</b> drop unused features (usage logs), shorter online TTLs, cheaper storage tiers for old history. <b>Logs ($10k -> ~$5k):</b> sample request logs, keep full logs only for errors and a monitoring sample, retention limits. New total ≈ $52k (-55%), validated by comparing latency and quality metrics before/after each step; tag resources per model to keep cost visible.</p>`,
  cx: `<p>Savings estimates scale with utilisation gains.</p>`, fu: ['Which change carries the highest quality risk?'] }));

/* ---------------- Quiz ---------------- */
quiz.push({ q: 'Training-serving skew means', options: ['Features are computed differently at training time and serving time', 'The model trains too slowly', 'Labels arrive late', 'Serving uses a GPU'], answer: 0, explain: 'Same entity, same moment, different feature values in the two paths.' });
quiz.push({ q: 'A point-in-time join ensures that', options: ['Each label row only sees feature values known at that time', 'All features use the latest values', 'Joins run faster', 'Data is deduplicated'], answer: 0, explain: 'It prevents leaking future information into training.' });
quiz.push({ q: 'The online store of a feature store is typically', options: ['A low-latency key-value store holding the latest values per entity', 'A data warehouse with full history', 'A message queue', 'A model registry'], answer: 0, explain: 'Redis, DynamoDB, Bigtable and similar serve features in milliseconds.' });
quiz.push({ q: 'In a model registry, rolling back is fast because', options: ['Versions are immutable and serving resolves an alias or stage that can point back', 'Models retrain in seconds', 'Containers are small', 'Logs are kept'], answer: 0, explain: 'Rollback is a pointer move to a version that still exists.' });
quiz.push({ q: 'Which deployment lets you compare a new model on live traffic with zero user impact?', options: ['Shadow deployment', 'Canary', 'A/B test', 'Blue/green'], answer: 0, explain: 'Shadow predictions are logged and discarded.' });
quiz.push({ q: 'PSI of 0.32 on an important feature usually means', options: ['A major distribution shift that needs action', 'No change', 'The model is overfitting', 'Latency increased'], answer: 0, explain: 'Rule of thumb: above 0.25 is a major shift.' });
quiz.push({ q: 'Concept drift is a change in', options: ['P(y | X), the relationship between inputs and target', 'P(X) only', 'The model file size', 'The serving hardware'], answer: 0, explain: 'Same inputs now map to different outcomes.' });
quiz.push({ q: 'KL divergence differs from PSI because KL is', options: ['Asymmetric: KL(P‖Q) ≠ KL(Q‖P) in general', 'Always zero', 'Only for categorical data', 'A latency metric'], answer: 0, explain: 'PSI equals the sum of both directions of KL on the bins.' });
quiz.push({ q: 'Why use gRPC instead of REST/JSON for an internal model service?', options: ['Binary protobuf payloads, typed contracts and HTTP/2 multiplexing reduce latency', 'Browsers prefer it', 'It needs no schema', 'It retrains models'], answer: 0, explain: 'gRPC is efficient for service-to-service calls with tight latency.' });
quiz.push({ q: 'Dynamic batching in a model server', options: ['Groups requests arriving within a short window into one forward pass', 'Retrains the model in batches', 'Sends predictions by email', 'Splits traffic between models'], answer: 0, explain: 'It trades a few ms of wait for much higher throughput.' });
quiz.push({ q: 'Assigning users to a canary should be', options: ['Sticky, by hashing a stable id with an experiment salt', 'Random on every request', 'Alphabetical by name', 'Based on request time'], answer: 0, explain: 'Users must see a consistent version for valid measurement.' });
quiz.push({ q: 'Continuous training (CT) means', options: ['Pipelines retrain and evaluate models automatically on schedule or triggers', 'Training never stops on one GPU', 'Running CI on every keystroke', 'Using online learning only'], answer: 0, explain: 'CT automates retraining; gates decide promotion.' });
quiz.push({ q: 'A candidate model has higher overall AUC but worse AUC for new users. A good CI gate should', options: ['Block it if the slice regression exceeds the tolerance', 'Promote it immediately', 'Ignore slices', 'Average the scores'], answer: 0, explain: 'Slice gates catch regressions hidden by averages.' });
quiz.push({ q: 'Which is usually the cheapest way to serve a gradient-boosted tree model scoring all customers nightly?', options: ['A batch job on CPU (possibly spot) writing scores to a table', 'An always-on GPU endpoint', 'A streaming job with GPUs', 'Calling an LLM'], answer: 0, explain: 'Batch on CPU fits trees and nightly needs.' });

/* ---------------- Interview ---------------- */
interview.push({ level: 'B', q: 'Walk me through the lifecycle of an ML model in production.', a: `<p>Data is collected and validated; feature pipelines compute inputs with one definition shared by training and serving; training runs are tracked (code, data version, params, metrics); the chosen model is registered with lineage and a signature; it is packaged in a container and served in batch or online; it is released safely via shadow, canary or A/B; it is monitored for service health, data and prediction drift and real performance when labels arrive; and retraining is triggered by schedule or alerts through a CI/CD pipeline with gates. It is a loop, not a line.</p>`, followUps: ['Which step fails most often in practice?', 'What does MLOps maturity level 1 add over level 0?'] });
interview.push({ level: 'I', q: 'What is training-serving skew and how do you prevent it?', a: `<p>Skew is when the model sees feature values in production that were computed differently than in training - different code, time zones, null handling, windows or data freshness. Prevention: one feature definition used by both paths (feature store or shared library), point-in-time correct training data, logging the exact features served and ideally training on those logs, and a monitor that compares served vs recomputed features for a sample. It is dangerous because nothing errors - quality just drops.</p>`, followUps: ['How would you detect skew that already exists?', 'Is logging served features always affordable?'] });
interview.push({ level: 'I', q: 'Why and when would you introduce a feature store?', a: `<p>A feature store gives one place to define features, an offline store with history for point-in-time training sets, an online store for millisecond serving of the same values, materialization jobs, freshness/TTL handling and discovery for reuse across teams. Introduce it when you have online models needing the same features as training, many models sharing features, or repeated leakage and skew bugs. For one batch model, a well-tested SQL pipeline is enough; the store adds operational cost.</p>`, followUps: ['What are offline and online stores built on?', 'How do you handle freshness failures?'] });
interview.push({ level: 'I', q: 'What do experiment tracking and a model registry give you?', a: `<p>Tracking records every run's params, metrics, artifacts, code commit, data version and environment so results are comparable and reproducible. The registry turns chosen runs into immutable, named model versions with lineage, signatures, model cards, lifecycle state (stages or aliases like champion/challenger) and an audit trail of approvals. Serving resolves the alias, so promotion and rollback are pointer moves without redeploying code. Together they answer: what is in production, how was it made, who approved it.</p>`, followUps: ['Stages vs aliases in MLflow?', 'What do you need to reproduce a model exactly?'] });
interview.push({ level: 'B', q: 'Batch vs online prediction: how do you choose?', a: `<p>Ask whether someone waits for the prediction and whether it depends on information available only at request time. If not, batch: score all entities on a schedule, store results, look them up - cheap, simple, uses spot capacity, but can be stale and cannot score new entities until the next run. If yes, online: an API with a latency budget, online features, autoscaling and higher ops cost. Hybrids are common: batch candidates plus online re-ranking, or streaming scoring of events.</p>`, followUps: ['How does a new user get a prediction in a batch system?', 'Where does streaming prediction fit?'] });
interview.push({ level: 'I', q: 'Explain shadow, canary and A/B deployments for models.', a: `<p>Shadow sends a copy of live traffic to the new model and logs its outputs without using them - zero user risk, tests correctness, latency and prediction differences. Canary sends a small sticky percentage of real users to the new model and ramps up while watching health metrics, with automatic rollback rules decided in advance. An A/B test randomly splits users for long enough to measure business impact with statistical significance on a primary metric and guardrails. Typical order: shadow, canary, A/B, full rollout.</p>`, followUps: ['What can shadow mode not tell you?', 'How do you size an A/B test?'] });
interview.push({ level: 'I', q: 'What is the difference between data drift and concept drift, and how do you detect each?', a: `<p>Data drift is a change in the input distribution P(X), e.g. a new user population; detect with PSI, KS or JS divergence per feature against a reference window, and watch prediction drift too. Concept drift is a change in P(y|X): the same inputs now mean different outcomes, e.g. fraudsters change tactics; detect it with performance metrics on fresh labels (or proxies when labels are delayed). Data drift may not hurt performance and concept drift may happen with no input drift, so you need both kinds of monitoring.</p>`, followUps: ['What is label/prior drift?', 'How do you monitor with delayed labels?'] });
interview.push({ level: 'A', q: 'How is PSI computed and what are its pitfalls?', a: `<p>Bin the feature using the reference data (quantiles), compute expected and actual shares per bin, then PSI = sum of (actual - expected) × ln(actual / expected). Below 0.1 stable, 0.1-0.25 moderate, above 0.25 major. Pitfalls: results depend on binning; empty bins need an epsilon; nulls need their own bin; it ignores feature importance; seasonal businesses need a seasonal reference; with hundreds of features some will always alert, so weight by importance and require persistence. PSI equals symmetric KL on the bins.</p>`, followUps: ['How would you handle categorical features?', 'Why not use a KS test p-value on millions of rows?'] });
interview.push({ level: 'A', q: 'When should a model be retrained, and how do you automate it safely?', a: `<p>Triggers: a schedule chosen by backtesting cadence vs metric and cost; drift on important features; performance drop on fresh labels; or new data volume. Automate with a training pipeline (CT): validate data, train, evaluate challenger vs champion on the same time-based holdout, check slices, fairness, latency and size, register as challenger, then shadow/canary with automatic rollback before promotion. Never retrain blindly on corrupted data; check whether drift is a pipeline bug first. Alert if retrains silently stop.</p>`, followUps: ['How do you pick the evaluation set?', 'What about feedback loops in retraining data?'] });
interview.push({ level: 'A', q: 'What does CI/CD look like for ML compared to normal software?', a: `<p>Normal CI/CD versions and tests code. ML adds data and models as changing inputs. CI tests feature code with fixtures, validates data, runs a small training smoke test and builds the serving image. CT retrains on new data. CD deploys only models that pass gates: metric vs champion, slices, behavioural tests (invariance, directional), latency, size and signature checks, then progressive rollout with monitoring and rollback. Mature teams deploy the training pipeline itself through CI so every model is produced by reviewed code.</p>`, followUps: ['What is a behavioural test for a model?', 'Where do human approvals belong?'] });
interview.push({ level: 'E', q: 'Design a real-time fraud detection ML system end to end.', a: `<p>Requirements: score each payment in &lt;50 ms p99 at peak QPS, explainable decisions, delayed labels. Features: streaming windowed counts (Kafka + Flink) and daily batch aggregates in a feature store with offline history and online KV; on-demand request features. Model: gradient-boosted trees, trained with point-in-time joins or logged features, tracked and registered. Serving: containerised CPU service via gRPC with one batched feature fetch, rules engine fallback, threshold tuned to business cost. Release: shadow, canary on decline rate, long holdout for chargebacks. Monitoring: freshness, PSI, score distribution, decline rate, proxy labels then chargebacks. Retrain weekly plus drift triggers with slice gates. Cost: CPU serving, spot training.</p>`, followUps: ['How do you choose the decision threshold?', 'How do fraudsters adapting change your design?'] });
interview.push({ level: 'A', q: 'How do you control the cost of an ML system?', a: `<p>Measure first: tag resources per model and compute cost per 1,000 predictions and per training run. Serving: right-size and autoscale, CPU for tree models, dynamic batching, ONNX/quantisation, multi-model servers, scale-to-zero, and batch scoring where latency allows. Training: spot instances with checkpoints, warm starts, backtested retraining cadence, sampling. Data: prune unused features, TTLs, cheaper storage tiers, log sampling. Always check quality metrics before and after each saving.</p>`, followUps: ['When is a GPU worth it for serving?', 'How do you show the business value of a retrain?'] });
interview.push({ level: 'I', q: 'How do you package a model so it behaves the same everywhere?', a: `<p>Bundle the model artifact with its preprocessing code, pinned dependencies and a server in a container image built by CI; store the image digest with the registered version. Prefer portable formats (ONNX, native XGBoost/LightGBM, TorchScript/torch.export) over pickle across versions, include a signature to validate inputs, load the model once at startup, expose health/readiness endpoints and metrics, and test the container with recorded golden requests before deployment.</p>`, followUps: ['Why is pickle risky?', 'How do you handle preprocessing that differs between training and serving?'] });

registerModule({
  id: 'ai22',
  title: 'MLOps & Model Deployment',
  intro: `<p>Most models never reach production, and many that do quietly decay. This module is about the engineering that keeps <b>classical ML models</b> (fraud, ranking, forecasting, credit, churn) useful after the notebook: data and feature pipelines without leakage or training-serving skew, feature stores with offline/online stores and freshness, experiment tracking and the model registry (MLflow), packaging and serving (batch vs online, REST vs gRPC, dynamic batching), safe releases with shadow, canary and A/B tests, monitoring data and concept drift with PSI and KL, retraining and CI/CD for models, and cost. LLM-specific operations (prompt versioning, semantic caches, token costs) live in the LLM System Design &amp; LLMOps module; here we cover the foundations they build on.</p>`,
  goals: ['Explain the ML lifecycle and prevent training-serving skew and label leakage with point-in-time joins', 'Design a feature store setup with offline/online stores, TTLs and freshness monitoring', 'Use experiment tracking and a model registry for reproducibility, promotion gates and instant rollback', 'Choose batch vs online serving, REST vs gRPC, and size an online model service', 'Plan shadow, canary and A/B releases with sticky assignment and automatic rollback', 'Compute PSI/KL drift, tell data drift from concept drift, and design retraining triggers, CI/CD gates and cost controls'],
  prereqs: `<p>Comfort with training and evaluating classical ML models (metrics like AUC, train/validation splits) from earlier modules in this track, and basic DevOps ideas: containers, Kubernetes deployments and CI pipelines. The LLM System Design &amp; LLMOps module is a useful companion but not required.</p>`,
  hours: 12,
  langExplain: `<p>All code in this module is Python because the AI track uses Python. The runnable demos use <b>only the standard library</b> (a point-in-time join, a feature-freshness check, a registry state machine, a batching simulator, a canary splitter, a PSI/KL calculator and a CI gate) so they run in your browser. Snippets that need MLflow, Feast, FastAPI or Argo are marked as not run here and show what you would write at work.</p>`,
  topics: topics, practice: practice, quiz: quiz, interview: interview
});
})();
