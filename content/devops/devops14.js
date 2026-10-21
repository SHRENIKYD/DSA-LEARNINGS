(function () {
  var topics = [], practice = [], quiz = [], interview = [];
  var R = String.raw; // raw template: backslashes and shell code stay exactly as typed
  var LAB = '<p>Everything runs free on your own machine: <b>kind</b> or <b>minikube</b> (Kubernetes 1.29 or newer), <b>kubectl</b>, and <b>Helm 3</b> (<code>helm version</code>). For the HPA labs install <b>metrics-server</b> (on kind add <code>--kubelet-insecure-tls</code>, lab only). For NetworkPolicy labs the cluster needs a CNI that enforces policies: Calico, or Cilium on kind (older kind releases ship <code>kindnet</code> without policy enforcement, newer ones may enforce; always run the negative test). Use a throwaway namespace. Every password, token and key shown is a placeholder.</p>';
  var PYC = '<p>Python 3, standard library only. This is a small model of the real Kubernetes or Helm rule: good enough to reason with, simpler than the real controller.</p>';
  var SKIP = { skip: 'cluster procedure, verified by reading' };
  // Helm templates ({{ }}) are not valid YAML, so they use lang 'text' with check: false (same convention as devops08 Dockerfiles).
  function TPL(code, title) { return { lang: 'text', check: false, title: title || 'templates/deployment.yaml', code: code }; }
  function TXT(code, title) { return { lang: 'text', check: false, title: title || 'output', code: code }; }
  function Y(code, title) { return { lang: 'yaml', title: title || 'manifest.yaml', code: code }; }   // parsed as YAML (multi-document --- is allowed)
  function SH(code, title) { var s = { lang: 'bash', code: code }; if (title) s.title = title; return s; } // bash -n checked
  function PY(code, title) { return { lang: 'python', title: title || 'Python model (tested)', code: code }; }
  function snip(c) { return typeof c === 'string' ? SH(c) : c; }
  // Compact problem builder. Code is bash unless a Y/TPL/PY snippet object is passed.
  function P(o) {
    var p = {
      title: o.t, level: o.l, tags: o.tags, companies: o.co,
      statement: o.s, constraints: o.c || LAB, example: o.ex,
      brute: { why: o.bw },
      mcq: { q: o.q[0], options: o.q[1], answer: o.q[2], explain: o.q[3] },
      hints: o.h,
      solution: { approach: o.a, code: snip(o.code), complexity: o.cx, followUps: o.f },
      tests: o.tests || SKIP
    };
    if (o.dry) p.solution.dry = o.dry;
    if (o.lang) p.lang = o.lang;
    if (o.alt) p.solution.alt = o.alt.map(snip);
    if (o.bc) p.brute.code = o.bcl === 'yaml' ? Y(o.bc, 'Naive version') : o.bcl === 'python' ? PY(o.bc, 'Naive version') : snip(o.bc);
    return p;
  }
  function box(id, label, x, y, w) { return { id: id, label: label, x: x, y: y, shape: 'box', w: w || 18 }; }
  function pad4(f, tip) { while (f.length < 4) f.push({ narr: tip, parts: f[f.length - 1].parts }); return f; }
  function num(s, d) { var n = parseInt(s, 10); return isNaN(n) ? d : n; }
  function kvInput(str) { var o = {}; String(str || '').split(/[\s,;]+/).forEach(function (t) { var m = t.match(/^([\w.-]+)=(.*)$/); if (m) o[m[1]] = m[2]; }); return o; }

  // ── Small models shared by the visualizers (the Python problems are written separately and tested) ──
  // HPA: desired = ceil(current * metric / target), no change inside a 10% tolerance, then clamp to min/max.
  function hpaDesired(cur, metric, target, mn, mx) {
    if (cur === 0) return 0;
    var d = cur;
    if (Math.abs(metric - target) * 10 > target) d = Math.ceil(cur * metric / target);
    return Math.min(mx, Math.max(mn, d));
  }
  // Rolling update: percentages of replicas; maxSurge rounds UP, maxUnavailable rounds DOWN.
  function pctOrInt(v, n, up) {
    v = String(v).trim();
    if (/%$/.test(v)) { var x = parseFloat(v) * n / 100; return up ? Math.ceil(x - 1e-9) : Math.floor(x + 1e-9); }
    return parseInt(v, 10) || 0;
  }
  // RBAC rule: "verbs|resources|resourceNames" (comma lists, * = everything). Additive: no deny rules exist.
  function rbacMatch(rule, verb, res, name) {
    var p = rule.split('|'), vs = (p[0] || '').split(',').filter(Boolean), rs = (p[1] || '').split(',').filter(Boolean), ns = (p[2] || '').split(',').filter(Boolean);
    var vOk = vs.indexOf('*') >= 0 || vs.indexOf(verb) >= 0, rOk = rs.indexOf('*') >= 0 || rs.indexOf(res) >= 0;
    var nOk = ns.length === 0 || (name !== '' && ns.indexOf(name) >= 0);
    return { v: vOk, r: rOk, n: nOk, ok: vOk && rOk && nOk };
  }
  // NetworkPolicy (ingress only): policy "select|from"; select "a=b&c=d" (empty = every pod), from = comma list of selectors, * = anyone.
  function labelsOf(s) { var o = {}; String(s || '').split(',').forEach(function (t) { var m = t.trim().match(/^([^=]+)=(.*)$/); if (m) o[m[1]] = m[2]; }); return o; }
  function selMatch(sel, labels) {
    sel = String(sel).trim();
    if (sel === '') return true;
    return sel.split('&').every(function (t) { var m = t.match(/^([^=]+)=(.*)$/); return !!m && labels[m[1]] === m[2]; });
  }
  function netAllows(policies, dst, src) {
    var d = labelsOf(dst), s = labelsOf(src), selected = false, allowed = false;
    policies.forEach(function (pol) {
      var i = pol.indexOf('|'), sel = pol.slice(0, i), from = pol.slice(i + 1).split(',').filter(Boolean);
      if (!selMatch(sel, d)) return;
      selected = true;
      from.forEach(function (f) { if (f === '*' || selMatch(f, s)) allowed = true; });
    });
    return !selected || allowed;
  }

  // ───────────────────────── Topic 1: Helm charts, values, releases ─────────────────────────
  topics.push({
    title: 'Helm Charts, Values and Releases: the Recipe Kit',
    analogy: `<p>Think of a meal-kit company. The <b>chart</b> is the recipe card with blanks: "__ servings, __ spice level". The <b>values</b> are your order form that fills in the blanks. A <b>release</b> is one actual dinner cooked from that card, with a number in the kitchen logbook. Order the same card twice with different forms and you get two separate dinners (a <i>dev</i> release and a <i>prod</i> release of the same chart). Helm is the kitchen: it fills the blanks, cooks (sends the manifests to Kubernetes) and writes every attempt in the logbook so you can go back to dinner number 3 when dinner number 4 goes wrong.</p>`,
    explain: `<p>🟢 <b>The problem Helm solves.</b> A real app is not one YAML file. It is a Deployment, a Service, an Ingress, a ConfigMap, a ServiceAccount, maybe an HPA. Now you need it in dev, staging and prod with different image tags, replica counts and hostnames. Copy-pasting the files three times drifts apart in a month. <b>Helm</b> is the package manager for Kubernetes: you write the manifests <i>once</i> as templates with blanks, and fill the blanks per environment.</p>
      ${H.table(['Word', 'Plain meaning', 'Where it lives'], [
        ['<b>Chart</b>', 'a folder (or a <code>.tgz</code>) with templates and defaults: the package', '<code>Chart.yaml</code>, <code>values.yaml</code>, <code>templates/</code>'],
        ['<b>Values</b>', 'the blanks: settings you can change without editing templates', '<code>values.yaml</code> inside the chart, your own <code>-f prod.yaml</code>, <code>--set</code>'],
        ['<b>Release</b>', 'one installed copy of a chart in a namespace, with a name and a revision number', 'a Secret named <code>sh.helm.release.v1.NAME.vN</code> in that namespace'],
        ['<b>Repository / OCI registry</b>', 'a place that stores charts so others can <code>helm install</code> them', 'an HTTP index, or any OCI registry (<code>oci://ghcr.io/org/charts</code>)']
      ])}
      <p>🟢 <b>Helm 3 has no server part.</b> There is no Tiller any more. The <code>helm</code> program renders the templates on your machine, sends plain manifests to the API server with your kubeconfig permissions, and stores the release history as Secrets in the cluster. So Helm can do only what <i>you</i> are allowed to do (see the RBAC lesson).</p>
      <p>🔵 <b>The chart folder.</b> <code>helm create web</code> builds a working skeleton:</p>
      ${H.table(['File', 'Job'], [
        ['<code>Chart.yaml</code>', 'name, <code>version</code> (the chart), <code>appVersion</code> (the app inside), <code>dependencies</code>'],
        ['<code>values.yaml</code>', 'the default value for every blank. Document each key; this file is the chart\'s public API'],
        ['<code>templates/*.yaml</code>', 'Kubernetes manifests with <code>{{ ... }}</code> blanks, written in Go template language'],
        ['<code>templates/_helpers.tpl</code>', 'named snippets reused everywhere (names, labels). Files starting with <code>_</code> are never rendered as manifests'],
        ['<code>templates/NOTES.txt</code>', 'message printed after install ("run this to get the URL")'],
        ['<code>values.schema.json</code>', 'optional JSON Schema: Helm rejects wrong types or missing keys before anything is sent'],
        ['<code>charts/</code>, <code>Chart.lock</code>', 'downloaded dependency charts and the pinned versions']
      ])}
      <p>🔵 <b>The template language, just enough.</b> <code>{{ .Values.replicaCount }}</code> reads a value. <code>{{ .Release.Name }}</code> and <code>{{ .Chart.Name }}</code> are built-ins. <code>{{ include "web.fullname" . }}</code> calls a helper. <code>| quote</code>, <code>| default "x"</code>, <code>| toYaml | nindent 8</code> are pipes that change a value. <code>{{- if .Values.ingress.enabled }} ... {{- end }}</code> switches a whole file on or off. <code>{{-</code> trims the blank line before it, which matters because YAML cares about spaces.</p>
      <p>🔵 <b>Where values come from, weakest to strongest.</b> (1) the chart's <code>values.yaml</code>; (2) a parent chart's values for a sub-chart; (3) each <code>-f file.yaml</code> in order, later files win; (4) <code>--set</code> / <code>--set-string</code> / <code>--set-file</code>, which win over every file. Maps are <b>deep-merged</b> (only the keys you give change), but <b>lists are replaced whole</b>, and setting a key to <code>null</code> deletes the chart default. The visualizer and the first problem model exactly this.</p>
      <p>🔵 <b>The everyday commands.</b> <code>helm template</code> renders to your terminal with no cluster. <code>helm lint</code> checks the chart. <code>helm install</code> / <code>helm upgrade --install</code> create or update a release. <code>helm get values|manifest|all NAME</code> shows what a release really used. <code>helm list</code> shows releases. <code>helm uninstall</code> removes it.</p>
      <p>🔵 <b>Dependencies and OCI.</b> A chart can need another (a Redis, a Postgres). List it under <code>dependencies:</code> in <code>Chart.yaml</code> with a version range, run <code>helm dependency update</code>, and Helm downloads it into <code>charts/</code> and writes <code>Chart.lock</code>. Since Helm 3.8 charts can be stored in any OCI registry like images: <code>helm push web-0.1.0.tgz oci://registry.example.com/charts</code> and <code>helm install web oci://registry.example.com/charts/web --version 0.1.0</code>. Always pin the version.</p>
      <p>🔵 <b>Secrets: never in values files.</b> A <code>values.yaml</code> is committed to Git, copied into CI logs and stored (base64, not encrypted) inside the release Secret. So <b>no password, token or key belongs in any values file or in <code>--set</code> text you type</b>. Three safe patterns, in order of preference: (1) the chart takes only the <i>name</i> of an existing Secret (<code>existingSecret: web-db</code>) and <b>External Secrets Operator</b> or your cloud secret store creates that Secret; (2) <b>helm-secrets with SOPS</b> keeps an <i>encrypted</i> values file in Git (intro level below); (3) for a lab, pass it from an environment variable: <code>--set-string db.password="$DB_PASSWORD"</code>. Pattern 3 still lands in the release Secret, so it is for labs, not for production.</p>`,
    clues: [
      '"Same app in dev, staging and prod with small differences" → one chart, one values file per environment',
      '"Install a ready-made Redis / ingress controller / Prometheus" → <code>helm install</code> a published chart (OCI or repo), pinned with <code>--version</code>',
      '"Which image tag is actually running in prod?" → <code>helm get values -a NAME</code> and <code>helm get manifest NAME</code>, not the file in Git',
      '"I changed values.yaml but nothing changed" → wrong order of <code>-f</code>, a <code>--set</code> overriding it, or a list that replaced instead of merged',
      '"Put the DB password in values.yaml" → no. Existing Secret name, External Secrets, or SOPS-encrypted values',
      '"Render the YAML without a cluster, for review or CI" → <code>helm template</code> plus <code>helm lint</code> and a schema/policy check'
    ],
    code: [TXT(`web/
  Chart.yaml            # name, version, appVersion, dependencies
  values.yaml           # defaults = the chart's public settings
  values.schema.json    # optional: reject bad values early
  templates/
    _helpers.tpl        # named snippets (never rendered by itself)
    deployment.yaml
    service.yaml
    serviceaccount.yaml
    hpa.yaml            # wrapped in: if .Values.autoscaling.enabled
    NOTES.txt
  charts/               # dependencies land here after: helm dependency update`, 'chart layout (helm create web)'),
      Y(`# values.yaml - every blank has a safe default and a comment
replicaCount: 2
image:
  repository: nginx
  tag: "1.27"            # quote tags so YAML does not turn 1.20 into 1.2
  pullPolicy: IfNotPresent
service:
  type: ClusterIP
  port: 80
resources:
  requests: { cpu: 100m, memory: 64Mi }   # HPA needs a CPU request to work
  limits: { memory: 128Mi }
autoscaling:
  enabled: false
  minReplicas: 2
  maxReplicas: 6
  targetCPUUtilizationPercentage: 70
existingSecret: ""       # NAME of a Secret created elsewhere; never put the value here`, 'values.yaml'),
      TPL(`apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "web.fullname" . }}
  labels:
    {{- include "web.labels" . | nindent 4 }}
spec:
  {{- if not .Values.autoscaling.enabled }}
  replicas: {{ .Values.replicaCount }}      # with an HPA, leave replicas out so Helm does not fight it
  {{- end }}
  selector:
    matchLabels:
      {{- include "web.selectorLabels" . | nindent 6 }}
  template:
    metadata:
      labels:
        {{- include "web.selectorLabels" . | nindent 8 }}
    spec:
      containers:
        - name: web
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag | default .Chart.AppVersion }}"
          ports:
            - containerPort: 80
          resources:
            {{- toYaml .Values.resources | nindent 12 }}
          {{- if .Values.existingSecret }}
          envFrom:
            - secretRef:
                name: {{ .Values.existingSecret }}
          {{- end }}`, 'templates/deployment.yaml (Helm template: text, not YAML)'),
      TPL(`{{/* templates/_helpers.tpl - named snippets, reused with: include "web.fullname" . */}}
{{- define "web.fullname" -}}
{{- printf "%s-%s" .Release.Name .Chart.Name | trunc 63 | trimSuffix "-" -}}
{{- end }}

{{- define "web.selectorLabels" -}}
app.kubernetes.io/name: {{ .Chart.Name }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{- define "web.labels" -}}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version }}
{{ include "web.selectorLabels" . }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}`, 'templates/_helpers.tpl (text)'),
      Y(`# Chart.yaml
apiVersion: v2
name: web
description: A small web service
type: application
version: 0.1.0          # the CHART version: bump on every chart change
appVersion: "1.27"      # the APP version: informational, default image tag above
dependencies:
  - name: redis
    version: "19.6.4"   # pin an exact version (range "19.x.x" is allowed but moves under you)
    repository: oci://registry-1.docker.io/bitnamicharts
    condition: redis.enabled`, 'Chart.yaml')],
    codeTitle: ['chart layout', 'values.yaml', 'templates/deployment.yaml', 'templates/_helpers.tpl', 'Chart.yaml with a dependency'],
    viz: [{
      title: 'Values merge: which layer wins?',
      input: 'chart: image.tag=1.27 replicaCount=2 log=info ; -f prod.yaml: replicaCount=4 log=warn ; -f team.yaml: log=error ; --set: image.tag=1.28',
      inputLabel: 'layers from weakest to strongest, separated by ;   name: key=value key=value',
      gen: function (input) {
        var layers = String(input || '').split(';').map(function (s) { return s.trim(); }).filter(Boolean).map(function (s) {
          var i = s.indexOf(':'); if (i < 0) throw new Error('Write each layer as name: key=value key=value, separated by ;');
          var kv = {}, order = []; s.slice(i + 1).trim().split(/\s+/).filter(Boolean).forEach(function (t) { var m = t.match(/^([\w.-]+)=(.*)$/); if (!m) throw new Error('Bad setting "' + t + '": use key=value'); kv[m[1]] = m[2]; order.push(m[1]); });
          return { name: s.slice(0, i).trim(), kv: kv, order: order };
        });
        if (layers.length < 1 || layers.length > 6) throw new Error('Use 1 to 6 layers');
        var eff = {}, src = {}, f = [];
        f.push({ narr: 'Helm builds the final values by starting with the chart defaults and laying each source on top, <b>weakest first</b>. A later layer overwrites only the keys it mentions.', parts: [{ type: 'table', label: 'layers in order', columns: ['#', 'source', 'keys it sets'], rows: layers.map(function (l, i) { return [String(i + 1), l.name, l.order.join(', ') || '-']; }) }] });
        layers.forEach(function (l, i) {
          var hl = {}, rows = [];
          l.order.forEach(function (k) { var was = eff[k]; eff[k] = l.kv[k]; src[k] = l.name; hl[k] = 'cur'; });
          var keys = Object.keys(eff).sort();
          keys.forEach(function (k, j) { rows.push([k, eff[k], src[k]]); });
          var hr = {}; keys.forEach(function (k, j) { if (l.order.indexOf(k) >= 0) hr[j] = 'ok'; });
          f.push({ narr: 'Layer ' + (i + 1) + ' (<b>' + H.esc(l.name) + '</b>) sets ' + (l.order.length ? l.order.map(function (k) { return '<code>' + H.esc(k) + '</code>'; }).join(', ') : 'nothing') + '. Those rows now come from this layer; every other key is untouched.', parts: [{ type: 'table', label: 'effective values after layer ' + (i + 1), columns: ['key', 'value', 'comes from'], rows: rows, hl: hr }] });
        });
        var keys2 = Object.keys(eff).sort();
        f.push({ narr: 'Final answer. This is what <code>helm get values -a RELEASE</code> would show. Remember: maps merge key by key, <b>lists are replaced whole</b>, and <code>null</code> deletes a default.', parts: [{ type: 'table', label: 'final values', columns: ['key', 'value', 'winning source'], rows: keys2.map(function (k) { return [k, eff[k], src[k]]; }), hl: keys2.reduce(function (a, k, j) { a[j] = 'sel'; return a; }, {}) }] });
        return pad4(f, 'Done.');
      }
    }],
    examples: [
      { title: 'Create a chart, render it, lint it (no cluster needed)', html: `<p>Start with the skeleton Helm gives you, then look at what it would send. <code>helm template</code> is the safest habit: it prints the final YAML so you review it before anything touches a cluster.</p>`, code: SH(R`helm create web                       # skeleton chart in ./web
helm lint web                         # catches bad indentation and missing keys
helm template demo web --set replicaCount=3 | head -40   # final YAML, no cluster
helm template demo web -f prod.yaml --show-only templates/deployment.yaml`) },
      { title: 'Override order: file, then --set', html: `<p>Two environments, one chart. <code>prod.yaml</code> holds only what differs. The last <code>-f</code> wins over earlier ones, and <code>--set</code> wins over all files, which makes it handy for the one value CI injects (the image tag).</p>`, code: [Y(`# prod.yaml - only the differences from the chart defaults
replicaCount: 4
ingress:
  enabled: true
  host: shop.example.com
autoscaling:
  enabled: true`, 'prod.yaml'), SH(R`helm upgrade --install shop ./web -n prod --create-namespace \
  -f prod.yaml \
  --set-string image.tag="$GIT_SHA" \
  --atomic --timeout 5m
helm get values shop -n prod -a | head      # -a = all values, including chart defaults`)] },
      { title: 'A dependency from an OCI registry, and pushing your own chart', html: `<p>Pin the version, commit <code>Chart.lock</code>, and never commit the downloaded <code>charts/</code> if CI can rebuild it. For your own chart, package it and push it like an image. Log in with a token read from the environment, never typed into the command.</p>`, code: SH(R`helm dependency update ./web            # reads Chart.yaml, writes charts/ and Chart.lock
helm dependency build ./web             # in CI: use exactly what Chart.lock says
helm package ./web                      # creates web-0.1.0.tgz
echo "$REGISTRY_TOKEN" | helm registry login ghcr.io -u "$REGISTRY_USER" --password-stdin
helm push web-0.1.0.tgz oci://ghcr.io/example-org/charts
helm install shop oci://ghcr.io/example-org/charts/web --version 0.1.0`) },
      { title: 'Three safe ways to get a database password into a chart', html: `<p>The chart should only know the Secret's <b>name</b>. Below: the lab shortcut, SOPS (encrypted file in Git, intro level), and External Secrets (the production answer: the value never touches Git or Helm).</p>`, code: [SH(R`# 1) LAB ONLY: read from the environment (it still ends up in the release Secret)
read -rs DB_PASSWORD && export DB_PASSWORD
kubectl create secret generic web-db --from-literal=password="$DB_PASSWORD" -n demo
helm upgrade --install web ./web -n demo --set existingSecret=web-db

# 2) helm-secrets + SOPS: secrets.enc.yaml is encrypted with age; values stay readable
helm plugin install https://github.com/jkroepke/helm-secrets
sops --encrypt --age "$AGE_PUBLIC_KEY" secrets.yaml > secrets.enc.yaml
helm secrets upgrade --install web ./web -n demo -f values.yaml -f secrets.enc.yaml`, 'lab and SOPS'),
        Y(`# 3) External Secrets Operator: the store holds the value, ESO creates the Secret
apiVersion: external-secrets.io/v1
kind: ExternalSecret
metadata:
  name: web-db
  namespace: demo
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: cloud-secrets          # a (Cluster)SecretStore you configured once
    kind: ClusterSecretStore
  target:
    name: web-db                 # the Secret the chart refers to by name
  data:
    - secretKey: password
      remoteRef:
        key: prod/web/db         # path in the secret manager; no value in Git`, 'ExternalSecret')] }
    ],
    problems: [{
      title: 'Compute the final Helm value (deep-merge precedence)',
      level: 'Medium', tags: ['helm', 'values', 'precedence'], companies: ['Thoughtworks', 'Red Hat', 'Cisco'],
      statement: `<p>Write <code>helm_value(layers, path)</code>. <code>layers</code> is a list of JSON strings, <b>weakest first</b> (chart defaults, then <code>-f</code> files, then <code>--set</code>). <code>path</code> is a dotted key such as <code>image.tag</code>. Return the final value as text (strings as they are; numbers, booleans and lists as compact JSON with sorted keys and no spaces), or <code>&lt;none&gt;</code> if the key does not exist. Rules: maps are deep-merged; scalars and lists in a later layer replace the earlier value whole; <code>null</code> in a later layer deletes the key.</p>`,
      constraints: PYC,
      example: `<p>Layers: <code>{"image":{"tag":"1.0","repo":"nginx"},"ports":[80,443]}</code> then <code>{"image":{"tag":"1.1"},"ports":[8080]}</code>. <code>image.tag</code> → ${H.c('g', '1.1')} (override). <code>image.repo</code> → ${H.c('g', 'nginx')} (kept, maps merge). <code>ports</code> → ${H.c('y', '[8080]')} (the list was replaced, not appended).</p>`,
      brute: { why: `<p>Doing a flat <code>dict.update()</code> replaces the whole <code>image</code> map, so <code>image.repo</code> silently disappears. This is the classic "I only wanted to change the tag and the chart broke" mistake. A correct merge must recurse into maps.</p>`, code: PY(`import json

def helm_value(layers, path):
    merged = {}
    for layer in layers:
        merged.update(json.loads(layer))      # shallow: replaces whole maps
    cur = merged
    for key in path.split("."):
        if not isinstance(cur, dict) or key not in cur:
            return "<none>"
        cur = cur[key]
    return cur if isinstance(cur, str) else json.dumps(cur, separators=(",", ":"), sort_keys=True)`, 'Naive: shallow update (wrong)') },
      mcq: { q: 'The chart default is <code>tolerations: [a, b]</code>. Your <code>-f prod.yaml</code> sets <code>tolerations: [c]</code>. What does the release get?', options: ['[c]: lists are replaced, not merged', '[a, b, c]', '[a, b]', 'An error about duplicate keys'], answer: 0, explain: 'Helm deep-merges maps but replaces lists completely. To keep a and b you must repeat them in your file.' },
      hints: ['<p>Hint 1: the weakest layer is first, so apply the layers in order and let each one change the result.</p>', '<p>Hint 2: write a recursive merge. If both the old and the new value are maps, merge them key by key. Otherwise the new value wins.</p>', '<p>Hint 3: a <code>null</code> in the new layer means "remove this key". After merging, walk the dotted path; if any step is missing or is not a map, return <code>&lt;none&gt;</code>. Format the final value: plain text for strings, compact sorted JSON for everything else.</p>'],
      solution: {
        approach: `<p>Think of the layers as transparent sheets stacked on a table. Where an upper sheet has ink, you see it; where it is clear, you see through. Maps are "clear unless written": we recurse. Lists and numbers are "one big stamp": the newest replaces the old. <code>null</code> is an eraser. After stacking, walk down the path.</p>`,
        code: PY(`import json

def _merge(base, over):
    """Apply 'over' on top of 'base' in place, the way Helm coalesces values."""
    for key, val in over.items():
        if val is None:
            base.pop(key, None)                         # null deletes the default
        elif isinstance(val, dict) and isinstance(base.get(key), dict):
            _merge(base[key], val)                      # maps merge key by key
        else:
            base[key] = val                             # scalars and lists replace whole

def helm_value(layers, path):
    merged = {}
    for layer in layers:                                # weakest first
        _merge(merged, json.loads(layer))
    cur = merged
    for key in path.split("."):
        if not isinstance(cur, dict) or key not in cur:
            return "<none>"
        cur = cur[key]
    if isinstance(cur, str):
        return cur
    return json.dumps(cur, separators=(",", ":"), sort_keys=True)`),
        dry: { head: ['step', 'layer applied', 'merged state (image / ports)'], rows: [['1', 'chart defaults', 'image={tag:1.0, repo:nginx}, ports=[80,443]'], ['2', '-f prod.yaml', 'image={tag:1.1, repo:nginx} (map merged), ports=[8080] (list replaced)'], ['3', 'lookup image.repo', 'walk image → repo = nginx']] },
        complexity: `<p>O(total size of all layers) time. The recursion depth equals the nesting depth of the values.</p>`,
        followUps: ['What does <code>--set a.b=1,a.c=2</code> do with a comma? (it is two settings; use <code>\\,</code> for a literal comma, or <code>--set-json</code>)', 'Why is <code>--set-string image.tag=1.20</code> safer than <code>--set image.tag=1.20</code>? (without -string, 1.20 may become the number 1.2)']
      },
      tests: { sig: 'string[] string -> string', fn: 'helmValue', cases: [
        [[['{"image":{"tag":"1.0","repo":"nginx"},"ports":[80,443]}', '{"image":{"tag":"1.1"},"ports":[8080]}'], 'image.tag'], '1.1'],
        [[['{"image":{"tag":"1.0","repo":"nginx"},"ports":[80,443]}', '{"image":{"tag":"1.1"},"ports":[8080]}'], 'image.repo'], 'nginx'],
        [[['{"image":{"tag":"1.0","repo":"nginx"},"ports":[80,443]}', '{"image":{"tag":"1.1"},"ports":[8080]}'], 'ports'], '[8080]'],
        [[['{"replicas":2}', '{"replicas":4}', '{"replicas":6}'], 'replicas'], '6'],
        [[['{"a":{"b":1,"c":2}}', '{"a":{"b":null}}'], 'a.b'], '<none>'],
        [[['{"a":{"b":1,"c":2}}', '{"a":{"b":null}}'], 'a'], '{"c":2}'],
        [[['{"a":{"b":1}}', '{"a":5}'], 'a'], '5'],
        [[['{"a":5}', '{"a":{"b":1}}'], 'a.b'], '1'],
        [[['{"x":1}'], 'y.z'], '<none>'],
        [[['{"on":true}', '{}'], 'on'], 'true'],
        [[[], 'anything'], '<none>'],
        [[['{"a":{"b":{"c":"deep"}}}', '{"a":{"b":{"d":"new"}}}'], 'a.b'], '{"c":"deep","d":"new"}'],
        [[['{"s":"x"}'], 's.t'], '<none>']
      ] }
    }],
    deepDive: `<p>🟣 <b>Release storage.</b> Each revision is a Secret of type <code>helm.sh/release.v1</code> holding a gzip+base64 blob of the chart, the merged values and the rendered manifest. This is why anyone who can <code>get secrets</code> in that namespace can read every value you ever passed, and why values must be secret-free. A big chart with many revisions can approach the 1 MiB object limit: use <code>--history-max 10</code> (the default) to prune.</p>
      <p>🟣 <b>Three-way merge on upgrade.</b> Helm 3 compares the <i>old manifest</i>, the <i>new manifest</i> and the <i>live object</i>. A field someone changed by hand with <code>kubectl edit</code> is kept only if neither manifest mentions it. Fields both manifests mention are overwritten. Helm 4 moves to server-side apply; check the version you run.</p>
      <p>🟣 <b>Hooks and tests.</b> Annotation <code>helm.sh/hook: pre-upgrade</code> runs a Job (database migration) before the rest. <code>post-install</code>, <code>pre-delete</code> and <code>test</code> exist too. Hook resources are not part of the release, so they are not rolled back with it: write migrations that are safe both forwards and backwards. <code>helm test</code> runs Pods annotated <code>helm.sh/hook: test</code>.</p>
      <p>🟣 <b>CRDs.</b> Files in a chart's <code>crds/</code> folder are installed once and <b>never upgraded or deleted</b> by Helm. For operators, install the CRDs as a separate chart or step so you can upgrade them on purpose.</p>
      <p>🟣 <b>Template traps.</b> <code>toYaml</code> without <code>nindent</code> breaks indentation. A value that is a string like <code>"true"</code> versus the boolean <code>true</code> changes behaviour. Names longer than 63 characters break Services: always <code>trunc 63</code>. Labels in <code>selector.matchLabels</code> are <b>immutable</b>: changing them in an upgrade fails, so keep selector labels minimal and stable. A <code>checksum/config</code> annotation (<code>{{ include (print $.Template.BasePath "/configmap.yaml") . | sha256sum }}</code>) restarts Pods when a ConfigMap changes.</p>`,
    aiEra: `<p>🤖 An AI assistant writes a first chart in seconds and is good at the boilerplate (<code>_helpers.tpl</code>, labels, an ingress block). It is weaker at the details that hurt in production: it often invents value names that are not in your <code>values.yaml</code>, forgets <code>nindent</code>, hardcodes a tag, or helpfully puts a sample password in <code>values.yaml</code>. Work with it like this: ask for the template, then <b>always run <code>helm lint</code> and <code>helm template</code> and read the output</b>; add a <code>values.schema.json</code> so a wrong key fails loudly; run a policy check (kubeconform, kube-linter, Conftest) on the rendered YAML in CI. Never paste a real values file into a chat tool: it may hold hostnames and secrets. The skill that does not go away is reading rendered YAML and knowing which layer a value came from.</p>`
  });

  // ───────────────────────── Topic 2: upgrades, rollbacks, safe delivery ─────────────────────────
  topics.push({
    title: 'Helm Upgrades, Rollbacks and History: the Undo Button',
    analogy: `<p>Helm\'s release history is like the <b>version history in a shared document</b>. Every upgrade saves a new numbered version. If someone ruins page 4, you do not retype the whole document; you click "restore version 3". But there is a catch: restoring the <i>text</i> does not un-send the emails the document triggered. In the same way, <code>helm rollback</code> restores the old <i>manifests</i>, not the data a migration already changed in your database.</p>`,
    explain: `<p>🟢 <b>The one command you use for both first install and every update:</b> <code>helm upgrade --install NAME CHART -n NS</code>. If the release does not exist it is installed; if it does, it is upgraded. That makes your CI job idempotent: run it again and nothing breaks.</p>
      <p>🟢 <b>Every change is a numbered revision.</b> <code>helm history NAME</code> lists them with a status: <code>deployed</code> (live), <code>superseded</code> (replaced by a newer one), <code>failed</code>, <code>pending-upgrade</code> (still running or interrupted) and <code>uninstalled</code>. <code>helm rollback NAME 3</code> does <i>not</i> go back in time: it creates a <b>new</b> revision (say 6) whose content is a copy of revision 3. History only grows.</p>
      ${H.table(['Flag', 'What it does', 'When to use it'], [
        ['<code>--wait</code>', 'wait until Pods are Ready and Deployments have finished rolling', 'always in CI, otherwise "success" only means "YAML accepted"'],
        ['<code>--timeout 5m</code>', 'how long <code>--wait</code> waits (default 5 minutes)', 'match your slowest healthy startup'],
        ['<code>--atomic</code>', 'if the upgrade fails or times out, roll back automatically (implies <code>--wait</code>)', 'the safe default for automated deploys'],
        ['<code>--cleanup-on-fail</code>', 'delete resources the failed upgrade created', 'avoid half-created leftovers'],
        ['<code>--history-max 10</code>', 'keep only the last N revisions', 'stops release Secrets piling up'],
        ['<code>--dry-run=server</code>', 'render and let the API server validate, change nothing', 'catch schema errors before applying'],
        ['<code>--reuse-values</code>', 'start from the last release\'s values instead of the chart defaults', 'use rarely: new chart defaults are silently ignored. Prefer explicit <code>-f</code> files']
      ])}
      <p>🔵 <b>Look before you leap.</b> The <b>helm-diff</b> plugin (<code>helm plugin install https://github.com/databus23/helm-diff</code>) shows exactly which lines of which objects an upgrade would change: <code>helm diff upgrade NAME CHART -f prod.yaml</code>. Put it in the pull request so a reviewer sees "image tag 1.27 → 1.28" and also "Service type changed", which nobody meant to ship.</p>
      <p>🔵 <b>Roll forward or roll back?</b> Rollback is fast and good when the new <i>image or config</i> is the problem. It is wrong when the new version already ran a schema migration the old code cannot read, or when the old version no longer exists. Write migrations in two steps (expand, then contract), so the previous release keeps working against the new schema. Often the best fix is a small <b>roll forward</b> with a one-line change.</p>
      <p>🔵 <b>Stuck states.</b> If a CI job is killed mid-upgrade the release can stay <code>pending-upgrade</code>, and the next try says <code>another operation (install/upgrade/rollback) is in progress</code>. Fix: <code>helm rollback NAME</code> to the last good revision (works from pending states). A first install that failed and left <code>failed</code> behind: <code>helm uninstall NAME</code> and install again. Last resort, delete the stuck release Secret, knowing you are editing Helm's logbook by hand.</p>
      <p>🔵 <b>What rollback does not undo:</b> data in PersistentVolumes, hook Jobs that already ran, CRDs, and anything changed by hand (<code>kubectl edit</code>) that the chart does not own.</p>`,
    clues: [
      '"The deploy went out and the site is down, get it back now" → <code>helm history</code> then <code>helm rollback NAME REV --wait</code>',
      '"CI says success but Pods are crashing" → missing <code>--wait</code>/<code>--atomic</code>; success only meant the API accepted YAML',
      '"Error: UPGRADE FAILED: another operation is in progress" → release stuck in a pending state; roll back to the last deployed revision',
      '"What exactly will this upgrade change?" → <code>helm diff upgrade</code> or <code>helm template | kubectl diff -f -</code>',
      '"The old version cannot read the new database schema" → rollback is not enough: expand/contract migrations, or roll forward',
      '"Cannot change spec.selector (field is immutable)" → the upgrade changed selector labels; you must delete and recreate the Deployment'
    ],
    code: [SH(R`# Idempotent deploy used by CI: install or upgrade, wait, auto-rollback on failure
helm upgrade --install shop ./web -n prod --create-namespace \
  -f values.yaml -f prod.yaml \
  --set-string image.tag="$GIT_SHA" \
  --atomic --timeout 5m --history-max 10

helm history shop -n prod              # REVISION UPDATED STATUS CHART APP VERSION DESCRIPTION
helm rollback shop 3 -n prod --wait    # new revision with revision 3's content
helm status shop -n prod               # current state and NOTES
helm get manifest shop -n prod --revision 4 | head   # what revision 4 really applied`, 'the daily commands'),
      TXT(`REVISION  UPDATED                   STATUS      CHART      APP VERSION  DESCRIPTION
1         Mon Oct 19 09:00:11 2026  superseded  web-0.1.0  1.27         Install complete
2         Mon Oct 19 11:30:42 2026  superseded  web-0.1.1  1.27         Upgrade complete
3         Mon Oct 19 14:02:09 2026  superseded  web-0.1.2  1.28         Upgrade complete
4         Mon Oct 19 15:10:31 2026  failed      web-0.1.3  1.29         Upgrade "shop" failed: context deadline exceeded
5         Mon Oct 19 15:12:03 2026  deployed    web-0.1.2  1.28         Rollback to 3`, 'helm history after a bad upgrade')],
    codeTitle: ['upgrade, history, rollback', 'what helm history looks like'],
    viz: [{
      title: 'Release history: install, upgrade, fail, rollback',
      input: 'install, upgrade, upgrade, bad, rollback 3',
      inputLabel: 'commands separated by commas: install · upgrade · bad (fails, no atomic) · bad-atomic (fails, auto rollback) · rollback N',
      gen: function (input) {
        var cmds = String(input || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
        if (cmds.length < 1 || cmds.length > 12) throw new Error('Use 1 to 12 commands');
        var rev = [], f = [];
        function live() { for (var i = rev.length - 1; i >= 0; i--) if (rev[i].st === 'deployed') return rev[i]; return null; }
        function show(txt, hlRow) {
          var hl = {}; if (hlRow !== undefined) hl[hlRow] = 'cur';
          f.push({ narr: txt, parts: [{ type: 'table', label: 'helm history shop', columns: ['REV', 'STATUS', 'DESCRIPTION'], rows: rev.length ? rev.map(function (r) { return [String(r.n), r.st, r.d]; }) : [['-', '-', '(no release yet)']], hl: hl }, { type: 'vars', label: 'what is running', vals: { 'live revision': live() ? String(live().n) : 'none', 'app version': live() ? live().app : '-' } }] });
        }
        show('No release exists yet. Helm keeps the logbook as Secrets in the namespace, one per revision.');
        var appV = 0;
        cmds.forEach(function (c) {
          var m = c.match(/^rollback\s+(\d+)$/), l = live();
          if (c === 'install') {
            if (rev.length) throw new Error('install only works once; use upgrade afterwards');
            appV = 1; rev.push({ n: 1, st: 'deployed', d: 'Install complete', app: 'v1' }); show('<b>helm install</b> creates revision 1 and marks it <b>deployed</b>.', 0);
          } else if (c === 'upgrade') {
            if (!rev.length) throw new Error('Start with install');
            appV++; if (l) l.st = 'superseded'; rev.push({ n: rev.length + 1, st: 'deployed', d: 'Upgrade complete', app: 'v' + appV }); show('<b>helm upgrade</b> adds revision ' + rev.length + '. The previous live revision becomes <b>superseded</b>.', rev.length - 1);
          } else if (c === 'bad') {
            if (!rev.length) throw new Error('Start with install');
            if (l) l.st = 'superseded'; rev.push({ n: rev.length + 1, st: 'failed', d: 'Upgrade failed: timed out waiting for Pods', app: 'v' + (appV + 1) }); show('A bad upgrade (for example a typo in the image tag) without <code>--atomic</code>: revision ' + rev.length + ' is marked <b>failed</b>, and <b>nothing is deployed</b> in Helm\'s eyes while the cluster may be half-updated. You must roll back by hand.', rev.length - 1);
          } else if (c === 'bad-atomic') {
            if (!rev.length) throw new Error('Start with install');
            var good = l; rev.push({ n: rev.length + 1, st: 'failed', d: 'Upgrade failed', app: 'v' + (appV + 1) });
            show('With <code>--atomic</code> the same bad upgrade first records revision ' + rev.length + ' as <b>failed</b>...', rev.length - 1);
            if (good) { rev.push({ n: rev.length + 1, st: 'deployed', d: 'Rollback to ' + good.n, app: good.app }); good.st = 'superseded'; show('...and Helm immediately rolls back by itself: revision ' + rev.length + ' is a copy of ' + good.n + ' and is <b>deployed</b>. Users barely notice.', rev.length - 1); }
          } else if (m) {
            var t = parseInt(m[1], 10), src = rev[t - 1];
            if (!src) throw new Error('rollback target ' + t + ' does not exist');
            rev.forEach(function (r) { if (r.st === 'deployed') r.st = 'superseded'; });
            rev.push({ n: rev.length + 1, st: 'deployed', d: 'Rollback to ' + t, app: src.app }); show('<b>helm rollback ' + t + '</b> does not rewind. It appends revision ' + rev.length + ' with the same manifests as revision ' + t + '. History only grows.', rev.length - 1);
          } else throw new Error('Unknown command "' + c + '"');
        });
        return pad4(f, 'Done.');
      }
    }],
    examples: [
      { title: 'A bad upgrade, caught and rolled back by hand', html: `<p>Real situation: the pipeline shipped <code>image.tag=1.29-rc</code> (a tag that does not exist). The Deployment starts a new Pod, which sits in <code>ImagePullBackOff</code>. Old Pods keep serving because the rolling update waits for the new Pod to become Ready. So users are fine, but the release is <code>failed</code>. Steps: look, find the last good revision, roll back.</p>`, code: SH(R`helm history shop -n prod                           # revision 4 is failed, 3 was the last good one
kubectl get pods -n prod -l app.kubernetes.io/instance=shop    # one Pod in ImagePullBackOff
kubectl describe pod -n prod -l app.kubernetes.io/instance=shop | tail -15   # Events: manifest unknown
helm rollback shop 3 -n prod --wait --timeout 3m
helm history shop -n prod | tail -3               # revision 5: Rollback to 3, deployed
kubectl rollout status deploy/shop-web -n prod`) },
      { title: 'Review an upgrade before applying it (helm diff)', html: `<p>The plugin renders the new release and compares it with the live one. Reviewers see changes in the object, not in the template. <code>--three-way-merge</code> also shows drift from hand edits.</p>`, code: SH(R`helm plugin install https://github.com/databus23/helm-diff
helm diff upgrade shop ./web -n prod -f values.yaml -f prod.yaml \
  --set-string image.tag="$GIT_SHA" --three-way-merge --context 3
# Deployment.apps shop-web
# -   image: "nginx:1.27"
# +   image: "nginx:1.28"`) },
      { title: 'Release stuck in pending-upgrade', html: `<p>A CI runner was cancelled mid-upgrade. The next deploy fails with "another operation is in progress". Find the status, then roll back to the last <code>deployed</code> revision to clear the lock.</p>`, code: SH(R`helm list -n prod --pending                       # shows shop in pending-upgrade
helm history shop -n prod                         # find the last deployed revision, say 7
helm rollback shop 7 -n prod --wait               # works from a pending state and unlocks the release
helm upgrade --install shop ./web -n prod -f prod.yaml --atomic   # now retry`) }
    ],
    problems: [{
      title: 'Ship a Helm upgrade that cannot leave production broken',
      level: 'Medium', tags: ['helm', 'rollback', 'ci'], companies: ['Atlassian', 'Spotify', 'Walmart'],
      tests: SKIP,
      statement: `<p>Your team deploys chart <code>./web</code> as release <code>shop</code> in namespace <code>prod</code> from CI. Last week an upgrade with a mistyped image tag was reported "successful" by the pipeline while Pods were stuck in <code>ImagePullBackOff</code>. Write the deploy and rollback commands so that: (1) the job fails when the new Pods are not Ready within 4 minutes, (2) the cluster returns to the last good revision automatically, (3) reviewers see a diff first, (4) at most 10 revisions are kept, and (5) the image tag comes from the pipeline variable <code>GIT_SHA</code>. Add the manual commands for when automation is not enough.</p>`,
      constraints: LAB,
      example: `<p>Good run: ${H.c('g', 'STATUS: deployed')} revision 6. Bad tag: Helm prints <code>Error: UPGRADE FAILED: release shop failed, and has been rolled back due to atomic being set</code>, the job exits non-zero, <code>helm history</code> shows revision 6 ${H.c('r', 'failed')} and revision 7 ${H.c('g', 'deployed (Rollback to 5)')}.</p>`,
      brute: { why: `<p>A plain <code>helm upgrade</code> without <code>--wait</code> returns as soon as Kubernetes has accepted the YAML. The pipeline is green even when no Pod ever starts. Everything after that is a human noticing an alert and running commands from memory.</p>`, code: SH(R`helm upgrade shop ./web -n prod --set image.tag=$GIT_SHA   # returns immediately, no wait, no rollback`, 'Naive deploy') },
      mcq: { q: 'What does <code>--atomic</code> add on top of <code>--wait</code>?', options: ['It rolls back automatically when the upgrade fails or times out', 'It makes the upgrade faster', 'It encrypts the release values', 'It keeps old Pods running forever'], answer: 0, explain: '--wait only waits and reports failure. --atomic also performs the rollback to the previous revision for you (and implies --wait).' },
      hints: ['<p>Hint 1: success must mean "Pods are Ready", not "YAML accepted". Which flag waits?</p>', '<p>Hint 2: the same command should install on the first run and upgrade after that. Add a flag that undoes a failed upgrade, plus a timeout that matches your slowest startup.</p>', '<p>Hint 3: add a review step with the diff plugin before the deploy, a history limit, and a short runbook (<code>helm history</code>, <code>helm rollback</code>, <code>kubectl describe</code>) for when you must act manually.</p>'],
      solution: {
        approach: `<p>The pipeline has two steps. Step one is a read-only <b>diff</b> that reviewers see. Step two is one idempotent <b>upgrade --install</b> with <code>--atomic --timeout 4m</code>: the command only returns success if the Deployment finished rolling and Pods are Ready, and it undoes itself if not. Use <code>--set-string</code> for the tag so a SHA that looks like a number (for example <code>1234e5</code>) is not turned into a float. The manual runbook covers the rare case where the rollback itself is not enough.</p>`,
        code: SH(R`#!/usr/bin/env bash
set -euo pipefail
: "$GIT_SHA"                                       # fail fast if the pipeline did not set it

# 1) Review step: what would change? (read-only)
helm diff upgrade shop ./web -n prod -f values.yaml -f prod.yaml \
  --set-string image.tag="$GIT_SHA" --three-way-merge || true

# 2) Deploy: install or upgrade, wait for Ready, auto-rollback on failure
helm upgrade --install shop ./web -n prod --create-namespace \
  -f values.yaml -f prod.yaml \
  --set-string image.tag="$GIT_SHA" \
  --atomic --timeout 4m --history-max 10

# 3) Prove it
helm status shop -n prod
kubectl rollout status deploy/shop-web -n prod --timeout=60s`),
        alt: [SH(R`# Manual runbook when automation is not enough
helm history shop -n prod                          # find the last revision with STATUS deployed or superseded and healthy
kubectl get pods -n prod -l app.kubernetes.io/instance=shop
kubectl describe pod -n prod -l app.kubernetes.io/instance=shop | tail -20   # why? Events at the bottom
kubectl logs -n prod deploy/shop-web --previous --tail=50                    # crashed container's last words
helm rollback shop 5 -n prod --wait --timeout 3m   # new revision = copy of 5
helm get values shop -n prod                       # confirm the tag is the good one again`, 'Manual rollback runbook')],
        dry: { head: ['revision', 'command', 'cluster result', 'helm history status'], rows: [['5', 'upgrade --atomic (tag a1b2c3)', 'new Pods Ready, rollout done', 'deployed'], ['6', 'upgrade --atomic (tag a1b2c3x, typo)', 'ImagePullBackOff, no Ready Pod in 4m', 'failed'], ['7', '(automatic) rollback to 5', 'old ReplicaSet scaled up again', 'deployed (Rollback to 5)']] },
        complexity: `<p>Time: bounded by <code>--timeout</code> (4 minutes worst case) plus the rollback wait. Nothing else scales with cluster size.</p>`,
        followUps: ['Why is <code>--reuse-values</code> risky in this pipeline? (new chart defaults are ignored, hidden drift)', 'The migration Job ran before the failure. What does rollback not undo? (the database change; design expand/contract migrations)']
      }
    }],
    deepDive: `<p>🟣 <b>How --wait decides "ready".</b> Helm waits for Deployments (all replicas available and the rollout complete), StatefulSets, DaemonSets, Jobs (with <code>--wait-for-jobs</code>), PVCs (bound), and Services of type LoadBalancer (an address assigned). A readiness probe that always returns 200 makes <code>--wait</code> meaningless, so the probe must check something real. An HPA can confuse waits when <code>replicas</code> in the template fights it: leave <code>replicas</code> out when autoscaling is on.</p>
      <p>🟣 <b>Hooks and rollback.</b> A <code>pre-upgrade</code> migration Job runs again on a rollback if it is also annotated <code>pre-rollback</code>. Add <code>helm.sh/hook-delete-policy: before-hook-creation,hook-succeeded</code> or the Job name collides on the next run.</p>
      <p>🟣 <b>GitOps instead of CI helm.</b> Argo CD and Flux render Helm charts themselves and apply them with drift detection. In that model "rollback" is a Git revert, and <code>helm history</code> is not the source of truth. Flux's HelmRelease and Argo's Helm source both support remediation (retry, rollback). The ideas in this lesson (render, diff, wait, roll back) are the same.</p>
      <p>🟣 <b>Immutable fields.</b> Changing a Deployment selector, a StatefulSet's <code>volumeClaimTemplates</code>, a Job's template or a Service's <code>clusterIP</code> makes the upgrade fail. Plan these as a delete-and-recreate (for StatefulSets use <code>kubectl delete sts NAME --cascade=orphan</code> so Pods and data survive).</p>`,
    aiEra: `<p>🤖 AI can summarise a <code>helm diff</code> into plain words for a pull request, and it is helpful at reading an ugly <code>helm history</code> or a wall of <code>kubectl describe</code> events at 3 a.m. Two cautions. First, a tool that "fixes" a stuck release by deleting Secrets or running <code>--force</code> can make things worse: you want to understand the status before you change it. Second, do not give an autonomous agent cluster-admin for deploys; give the pipeline a ServiceAccount that can only touch the target namespace (see the RBAC lesson), and keep the rollback decision visible to a human or a policy, not hidden in a prompt. Practise <code>helm history</code> and <code>helm rollback</code> in a lab until they are muscle memory; during an incident you will not have time to learn them.</p>`
  });

  // ───────────────────────── Topic 3: rolling updates, HPA, PDB ─────────────────────────
  topics.push({
    title: 'Rolling Updates, Autoscaling (HPA) and Disruption Budgets',
    analogy: `<p>A restaurant is changing its waiters during dinner service. A <b>rolling update</b> is the manager swapping waiters one or two at a time, so some are always on the floor. <b>maxSurge</b> is "how many extra waiters may stand around during the swap"; <b>maxUnavailable</b> is "how many tables may be left without a waiter". The <b>HorizontalPodAutoscaler</b> is the manager counting how busy the waiters are: if they are at 90% of what they can handle and the goal is 50%, call more waiters in; when it calms down, send some home, slowly, so you do not call them back five minutes later. A <b>PodDisruptionBudget</b> is the rule "never send so many waiters on break that fewer than 4 remain".</p>`,
    explain: `<p>🟢 <b>Rolling update.</b> A Deployment replaces Pods gradually. It creates a new ReplicaSet with the new Pod template, scales it up, scales the old one down, and only counts a new Pod as available when its <b>readiness probe</b> passes. Two knobs control the pace (both can be a number or a percent):</p>
      ${H.table(['Setting', 'Meaning', 'Percent rounding', 'Default'], [
        ['<code>maxSurge</code>', 'how many Pods <i>above</i> the desired count may exist during the update', 'rounds <b>up</b>', '25%'],
        ['<code>maxUnavailable</code>', 'how many Pods <i>below</i> the desired count may be not-ready', 'rounds <b>down</b>', '25%']
      ])}
      <p>So with 10 replicas and the defaults, Kubernetes may run up to 13 Pods and must keep at least 8 ready. Only one may be 0: both at 0 would make progress impossible, and the API rejects it. <code>maxUnavailable: 0, maxSurge: 1</code> is the "never lose capacity" setting (needs spare room in the cluster). <code>kubectl rollout status deploy/NAME</code> watches it, <code>kubectl rollout history</code> lists revisions, <code>kubectl rollout undo</code> goes back. If new Pods never become ready, the rollout stalls <i>on purpose</i> (old Pods keep serving) and after <code>progressDeadlineSeconds</code> (600 s) is marked failed.</p>
      <p>🟢 <b>Horizontal Pod Autoscaler (HPA).</b> It changes the <code>replicas</code> of a Deployment (or StatefulSet) based on measured load. The rule is one formula:</p>
      <p style="text-align:center"><b>desired = ceil( current replicas × current metric ÷ target metric )</b></p>
      <p>Then three guards apply: if the ratio is within <b>10%</b> of 1.0 do nothing (tolerance); clamp to <code>minReplicas</code> and <code>maxReplicas</code>; and on scale-down wait for the <b>stabilization window</b> (300 s by default) and use the highest recommendation seen, so a short dip does not remove Pods. Example: 4 Pods at 90% CPU, target 50% → ceil(4 × 90 ÷ 50) = ceil(7.2) = <b>8</b>.</p>
      <p>🔵 <b>What the HPA needs (and why it silently does nothing without it).</b></p>
      ${H.table(['Needed', 'Why', 'Symptom when missing'], [
        ['<b>metrics-server</b> running', 'it provides CPU and memory numbers (the <code>metrics.k8s.io</code> API)', '<code>kubectl top pods</code> says "Metrics API not available"; HPA shows <code>&lt;unknown&gt;/70%</code>'],
        ['<b>resource requests</b> on the containers', 'CPU "utilization" means usage ÷ <i>request</i>. No request, no percentage', 'HPA condition: <code>missing request for cpu</code>'],
        ['<code>scaleTargetRef</code> that exists', 'the HPA must point to a real Deployment', 'condition <code>FailedGetScale</code>'],
        ['room in the cluster', 'new Pods need nodes (cluster autoscaler adds nodes)', 'new Pods stay <code>Pending</code>']
      ])}
      <p>🔵 <b>autoscaling/v2.</b> You can use several metrics (CPU, memory, custom or external metrics such as queue length); the HPA computes the desired count for each and takes the <b>largest</b>. The <code>behavior</code> block tunes speed: for example scale up by at most 100% or 4 Pods per 15 s, scale down at most 10% per minute after a 5-minute window. Do not run an HPA and a VerticalPodAutoscaler on the same CPU metric, and do not hardcode <code>replicas</code> in a Deployment that an HPA owns (every <code>kubectl apply</code> or Helm upgrade would reset it).</p>
      <p>🔵 <b>PodDisruptionBudget (PDB).</b> Voluntary disruptions are things you or the platform choose: <code>kubectl drain</code>, node upgrades, the cluster autoscaler removing a node. A PDB says how many Pods of an app must stay up (<code>minAvailable</code>) or may go down (<code>maxUnavailable</code>). The eviction API refuses to evict a Pod if it would break the budget. It does <b>not</b> protect against crashes or node failure (involuntary). allowedDisruptions = currentHealthy − desiredHealthy, never below 0. A PDB with <code>minAvailable: 100%</code> (or equal to replicas) blocks every drain; that is a classic cause of a stuck upgrade.</p>`,
    clues: [
      '"Scale automatically with load" → HPA <code>autoscaling/v2</code> with a CPU/memory target, plus requests set on the containers',
      '"HPA shows &lt;unknown&gt; targets" → no metrics-server, or no <code>resources.requests</code> on the Pods',
      '"Zero downtime deployment" → readiness probe + <code>maxUnavailable: 0</code> (+ <code>maxSurge</code> &gt; 0) + enough capacity + graceful shutdown (<code>preStop</code>, SIGTERM handling)',
      '"Pods flap up and down every few minutes" → missing stabilization window or a target too close to the usual load',
      '"Node drain hangs forever" → a PodDisruptionBudget with zero allowed disruptions (or a single-replica app)',
      '"Deploy rolled halfway and stopped" → new Pods not Ready; old ones kept serving; check <code>kubectl rollout status</code> and Pod events'
    ],
    code: [Y(`apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
spec:
  # no "replicas:" here when an HPA owns the count
  selector:
    matchLabels: { app: web }
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1            # one extra Pod during the update
      maxUnavailable: 0      # never go below the desired count
  minReadySeconds: 10        # a new Pod must stay Ready 10 s before it counts
  progressDeadlineSeconds: 300
  template:
    metadata:
      labels: { app: web }
    spec:
      terminationGracePeriodSeconds: 30
      containers:
        - name: web
          image: nginx:1.27
          ports: [{ containerPort: 80 }]
          resources:
            requests: { cpu: 100m, memory: 64Mi }   # REQUIRED for CPU-percent autoscaling
            limits: { memory: 128Mi }
          readinessProbe:
            httpGet: { path: /, port: 80 }
            periodSeconds: 5
          lifecycle:
            preStop:
              exec: { command: ["sleep", "5"] }   # let the load balancer drain before SIGTERM`, 'deployment.yaml'),
      Y(`apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: web
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target: { type: Utilization, averageUtilization: 60 }   # % of the CPU request
    - type: Resource
      resource:
        name: memory
        target: { type: AverageValue, averageValue: 100Mi }
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
        - { type: Percent, value: 100, periodSeconds: 15 }     # at most double every 15 s
    scaleDown:
      stabilizationWindowSeconds: 300                           # use the highest value of the last 5 min
      policies:
        - { type: Percent, value: 10, periodSeconds: 60 }      # remove at most 10% per minute`, 'hpa.yaml (autoscaling/v2)'),
      Y(`apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: web
spec:
  maxUnavailable: 1          # or minAvailable: 2 (use one of the two, not both)
  selector:
    matchLabels: { app: web }
  unhealthyPodEvictionPolicy: AlwaysAllow   # let broken Pods be evicted so they cannot block a drain`, 'pdb.yaml'),
      SH(R`# metrics-server on a kind cluster (the --kubelet-insecure-tls patch is for local labs only)
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
kubectl patch -n kube-system deployment metrics-server --type=json \
  -p '[{"op":"add","path":"/spec/template/spec/containers/0/args/-","value":"--kubelet-insecure-tls"}]'
kubectl top nodes && kubectl top pods          # numbers appear after about a minute

kubectl get hpa web -w                         # TARGETS should be 12%/60%, not <unknown>/60%
kubectl describe hpa web | sed -n '/Conditions/,$p'   # AbleToScale, ScalingActive and the reason`, 'metrics-server and HPA checks')],
    codeTitle: ['Deployment with a safe rolling update', 'HPA autoscaling/v2', 'PodDisruptionBudget', 'metrics-server and HPA checks'],
    viz: [{
      title: 'Rolling update: surge and unavailable in action',
      input: 'replicas=6 surge=2 unavailable=1',
      inputLabel: 'replicas, surge and unavailable as numbers or percents (e.g. replicas=10 surge=25% unavailable=25%)',
      gen: function (input) {
        var o = kvInput(input), n = Math.min(12, Math.max(1, num(o.replicas, 6)));
        var s = pctOrInt(o.surge === undefined ? '25%' : o.surge, n, true), u = pctOrInt(o.unavailable === undefined ? '25%' : o.unavailable, n, false);
        if (s === 0 && u === 0) throw new Error('maxSurge and maxUnavailable cannot both be 0 (the update could never move)');
        var maxTotal = n + s, minReady = n - u, old = n, nu = 0, nuReady = 0, f = [];
        function pods(extra) {
          var v = [], hl = {}, i = 0, k;
          for (k = 0; k < old; k++) { v.push('v1'); hl[i++] = 'win'; }
          for (k = 0; k < nuReady; k++) { v.push('v2'); hl[i++] = 'ok'; }
          for (k = 0; k < nu - nuReady; k++) { v.push('v2...'); hl[i++] = 'cur'; }
          if (extra) { for (k = 0; k < extra; k++) { v.push('v1 x'); hl[i++] = 'bad'; } }
          return { type: 'array', label: 'Pods (blue = old, amber = starting, green = ready, red = terminating)', values: v, hl: hl };
        }
        function lim() { return { type: 'vars', label: 'limits', vals: { 'max Pods allowed (N+surge)': maxTotal, 'min Ready needed (N-unavailable)': minReady, 'Pods now': old + nu, 'Ready now': old + nuReady } }; }
        f.push({ narr: n + ' Pods run version 1. <code>maxSurge=' + s + '</code> means up to <b>' + maxTotal + '</b> Pods may exist; <code>maxUnavailable=' + u + '</code> means at least <b>' + minReady + '</b> must stay Ready. These two numbers are the whole safety rule.', parts: [pods(), lim()] });
        var guard = 0;
        while ((old > 0 || nuReady < n) && guard++ < 25) {
          var kill = Math.min(old, Math.max(0, (old + nuReady) - minReady));
          if (kill > 0) { f.push({ narr: 'Ready Pods are ' + (old + nuReady) + ' and the floor is ' + minReady + ', so Kubernetes may stop <b>' + kill + '</b> old Pod(s) right now.', parts: [pods(kill), lim()] }); old -= kill; }
          var add = Math.min(maxTotal - (old + nu), n - nu);
          if (add > 0) { nu += add; f.push({ narr: 'Room under the ceiling of ' + maxTotal + ': start <b>' + add + '</b> new version-2 Pod(s). They are not Ready yet, so they do not count toward availability.', parts: [pods(), lim()] }); }
          if (nu > nuReady) { nuReady = nu; f.push({ narr: 'The readiness probes pass. The new Pods are Ready and now take traffic. This is the moment the next old Pods can be removed.', parts: [pods(), lim()] }); }
        }
        f.push({ narr: 'Rollout complete: ' + n + ' Pods on version 2, none on version 1. If the new Pods had <b>never</b> become Ready, the loop would have stopped here with old Pods still serving: a stalled rollout, not an outage.', parts: [pods(), lim()] });
        return pad4(f, 'Done.');
      }
    }, {
      title: 'HPA: the formula, the tolerance and the scale-down window',
      input: 'current=2 target=50 min=2 max=8 load=180:180:300:300:120:120:120:60:60:60',
      inputLabel: 'start replicas, target CPU %, min, max, and load per tick separated by colons = total CPU demand in "percent of one Pod\'s request"',
      gen: function (input) {
        var o = kvInput(input), cur = Math.max(1, num(o.current, 2)), tg = Math.max(1, num(o.target, 50)), mn = Math.max(1, num(o.min, 1)), mx = Math.max(mn, num(o.max, 8));
        var loads = String(o.load || '180:300:120:60').split(/[:|]/).map(function (x) { return parseFloat(x); }).filter(function (x) { return !isNaN(x); });
        if (loads.length < 2 || loads.length > 14) throw new Error('Give load=... with 2 to 14 numbers separated by colons, e.g. load=180:300:120');
        var f = [], hist = [], reps = [cur], recs = [];
        f.push({ narr: 'Target is <b>' + tg + '%</b> of each Pod\'s CPU request. Every 15 seconds the HPA reads the average utilization and applies <code>ceil(current x metric / target)</code>. Min ' + mn + ', max ' + mx + '.', parts: [{ type: 'bars', label: 'replicas', values: [cur], texts: [String(cur)], idxLabels: ['start'] }] });
        loads.forEach(function (ld, t) {
          var util = Math.round(ld / cur), raw = Math.ceil(cur * util / tg - 1e-9), d = hpaDesired(cur, util, tg, mn, mx), why;
          recs.push(d);
          var win = recs.slice(-3), stable = d < cur ? Math.max.apply(null, win) : d;
          if (Math.abs(util - tg) * 10 <= tg) why = 'inside the 10% tolerance (' + util + '% vs ' + tg + '%): no change';
          else why = 'ceil(' + cur + ' x ' + util + ' / ' + tg + ') = ' + raw + (raw !== d ? ', clamped to ' + d : '');
          var next = d < cur ? Math.min(cur, Math.max(stable, mn)) : d;
          var note = d < cur && next !== d ? ' <b>Scale-down is held back</b>: the window still remembers a higher recommendation (' + stable + '), so we stay at ' + next + '.' : '';
          cur = next; reps.push(cur);
          f.push({ narr: 'Tick ' + (t + 1) + ': demand ' + ld + ' spread over the Pods is <b>' + util + '%</b> each. ' + why + '.' + note + ' Replicas now <b>' + cur + '</b>.', parts: [{ type: 'bars', label: 'replicas over time', values: reps.slice(), texts: reps.map(String), idxLabels: ['start'].concat(loads.slice(0, t + 1).map(function (x, i) { return 't' + (i + 1); })), hl: (function () { var h = {}; h[reps.length - 1] = 'cur'; return h; })() }, { type: 'vars', label: 'this tick', vals: { 'avg utilization': util + '%', 'target': tg + '%', 'recommended': d, 'replicas after': cur } }] });
        });
        return pad4(f, 'Done.');
      }
    }],
    examples: [
      { title: 'Why is the HPA stuck at "&lt;unknown&gt;"?', html: `<p>Real situation: you applied an HPA and a day later it still shows <code>&lt;unknown&gt;/70%</code> and never scales, while the site is slow. There are two usual causes. Check them in this order: is the metrics API there, then do the Pods have requests.</p>`, code: SH(R`kubectl get apiservices v1beta1.metrics.k8s.io           # AVAILABLE must be True
kubectl top pods -n demo                               # "Metrics API not available" => install metrics-server
kubectl describe hpa web -n demo | tail -12
#   ScalingActive  False  FailedGetResourceMetric  missing request for cpu in container web
kubectl set resources deploy/web -n demo --requests=cpu=100m,memory=64Mi   # fix: add requests
kubectl get hpa web -n demo -w                          # TARGETS now shows 8%/70%`) },
      { title: 'Create load and watch it scale', html: `<p>Generate load from inside the cluster, watch the HPA add Pods, then stop the load and notice that scale-down takes minutes on purpose.</p>`, code: SH(R`kubectl expose deploy/web --port 80
kubectl run load --image=busybox:1.36 --restart=Never -- /bin/sh -c "while true; do wget -q -O- http://web >/dev/null; done"
kubectl get hpa web -w                    # TARGETS climbs, REPLICAS follows
kubectl delete pod load                   # stop the load
kubectl get hpa web -w                    # replicas fall slowly: the 5 minute scale-down window`) },
      { title: 'A rolling update that stalls, and the way back', html: `<p>You ship a bad image tag. The new Pod never becomes Ready, so the Deployment stops after creating one Pod and the old Pods keep serving. That is the rolling update protecting you. Read the cause from the Pod, then undo.</p>`, code: SH(R`kubectl set image deploy/web web=nginx:does-not-exist
kubectl rollout status deploy/web --timeout=60s       # "Waiting for rollout to finish: 1 out of 3 new replicas..."
kubectl get pods -l app=web                           # old Pods Running, one new Pod ImagePullBackOff
kubectl rollout history deploy/web                    # revisions
kubectl rollout undo deploy/web                       # back to the previous ReplicaSet
kubectl rollout status deploy/web`) },
      { title: 'Check how many Pods a PDB lets you disrupt', html: `<p>Before a node upgrade, ask the cluster what is allowed. <code>ALLOWED DISRUPTIONS</code> of 0 means the next <code>kubectl drain</code> of a node hosting these Pods will hang.</p>`, code: SH(R`kubectl get pdb -A
# NAMESPACE  NAME  MIN AVAILABLE  MAX UNAVAILABLE  ALLOWED DISRUPTIONS
# prod       web   3              N/A              0        <- 3 replicas, minAvailable 3: nothing can move
kubectl get deploy web -n prod -o jsonpath='{.spec.replicas}{"\n"}'
kubectl patch pdb web -n prod --type=merge -p '{"spec":{"minAvailable":2}}'   # or run 4 replicas`) }
    ],
    problems: [{
      title: 'HPA desired replicas',
      level: 'Medium', tags: ['hpa', 'autoscaling', 'formula'], companies: ['Google', 'Uber', 'Shopify'],
      statement: `<p>Write <code>desired_replicas(current, metric, target, min_r, max_r)</code>, the HPA decision for one metric. All numbers are integers (<code>metric</code> and <code>target</code> are utilization percent). Rules: if <code>current</code> is 0 return 0 (an HPA never scales a Deployment that was set to zero). If the metric is within 10% of the target, that is <code>|metric - target| * 10 &lt;= target</code>, keep <code>current</code>. Otherwise use <code>ceil(current * metric / target)</code>. Finally clamp the answer between <code>min_r</code> and <code>max_r</code>. Ignore the stabilization window.</p>`,
      constraints: PYC,
      example: `<p>4 Pods at 90% with a 50% target: 4 × 90 ÷ 50 = 7.2, ceil → ${H.c('g', '8')}. 4 Pods at 54%: |54−50| × 10 = 40 ≤ 50 → inside tolerance, stay at ${H.c('y', '4')}. 4 Pods at 10%, min 3: ceil(0.8) = 1, clamp up to ${H.c('g', '3')}.</p>`,
      brute: { why: `<p>Using floating point <code>math.ceil(current * metric / target)</code> directly looks fine, but 10% tolerance checks like <code>abs(metric/target - 1) &lt;= 0.1</code> suffer from rounding (1.1 − 1.0 is 0.10000000000000009), and forgetting the tolerance makes the model "flap" on tiny changes. Integer arithmetic avoids both problems.</p>`, code: PY(`import math

def desired_replicas(current, metric, target, min_r, max_r):
    d = math.ceil(current * metric / target)   # no tolerance, float math, no zero case
    return max(min_r, min(max_r, d))`, 'Naive: no tolerance, float math') },
      mcq: { q: 'The CPU request is 200m, a Pod uses 100m, the target is 50%. What does the HPA think of that Pod?', options: ['Utilization 50%: exactly at target', 'Utilization 100% because 100m is half of the limit', 'It cannot tell without a limit', 'Utilization 200%'], answer: 0, explain: 'HPA percent is usage divided by the request, not the limit. 100m / 200m = 50%.' },
      hints: ['<p>Hint 1: the core is one line, <code>ceil(current * metric / target)</code>. Everything else is guard rails.</p>', '<p>Hint 2: use integer maths: <code>-(-a // b)</code> is ceil for positive integers, and the tolerance test <code>abs(metric - target) * 10 &lt;= target</code> needs no decimals.</p>', '<p>Hint 3: order matters: zero check first, tolerance second (it keeps the current number), formula third, clamp last. Clamping also applies when the tolerance keeps <code>current</code> outside min/max.</p>'],
      solution: {
        approach: `<p>The HPA asks: "if each Pod is at <code>metric</code> and I want <code>target</code>, how many Pods would put each at the target?" The total work is <code>current × metric</code>; dividing by <code>target</code> gives the Pod count, rounded <b>up</b> because a fraction of a Pod does not exist. The tolerance avoids tiny, pointless changes. The clamp keeps you inside the limits you promised the finance team.</p>`,
        code: PY(`def desired_replicas(current, metric, target, min_r, max_r):
    """HPA decision for one metric (integers, utilization in percent)."""
    if current == 0:
        return 0                                   # scaled to zero by hand: the HPA is disabled
    desired = current
    if abs(metric - target) * 10 > target:         # outside the 10% tolerance
        desired = -(-current * metric // target)   # integer ceil(current * metric / target)
    return max(min_r, min(max_r, desired))`),
        dry: { head: ['current', 'metric', 'target', 'tolerance?', 'ceil(...)', 'after clamp (2..10)'], rows: [['4', '90', '50', 'no (400 > 50)', '8', '8'], ['4', '54', '50', 'yes (40 <= 50)', '-', '4'], ['4', '10', '50', 'no', '1', '2'], ['8', '200', '50', 'no', '32', '10']] },
        complexity: `<p>O(1) time and space: a few integer operations.</p>`,
        followUps: ['With two metrics, CPU says 6 and memory says 9. What does the HPA choose? (the larger, 9)', 'Why can scale-up be fast but scale-down slow? (cost of a missed spike vs cost of a few idle Pods; see the stabilization windows)']
      },
      tests: { sig: 'int int int int int -> int', fn: 'desiredReplicas', cases: [
        [[4, 90, 50, 2, 10], 8], [[4, 50, 50, 2, 10], 4], [[4, 54, 50, 2, 10], 4], [[4, 56, 50, 2, 10], 5],
        [[4, 20, 50, 2, 10], 2], [[4, 10, 50, 3, 10], 3], [[8, 200, 50, 2, 10], 10], [[1, 0, 50, 1, 5], 1],
        [[0, 100, 50, 1, 5], 0], [[3, 46, 50, 1, 5], 3], [[3, 44, 50, 1, 5], 3], [[10, 30, 50, 2, 20], 6], [[5, 100, 50, 1, 8], 8], [[2, 50, 50, 4, 10], 4]
      ] }
    }],
    deepDive: `<p>🟣 <b>The control loop.</b> The HPA controller runs every 15 s (<code>--horizontal-pod-autoscaler-sync-period</code>). It lists the Pods behind the target, reads their metrics, and ignores Pods that are not ready, are still starting (CPU is spiky at startup: <code>--horizontal-pod-autoscaler-cpu-initialization-period</code>), or have no metric yet. When scaling up it assumes missing Pods use 0%; when scaling down it assumes 100%, which keeps the decision cautious. The tolerance is 0.1 cluster-wide (some versions let you tune it per HPA with <code>behavior.*.tolerance</code>; check your version).</p>
      <p>🟣 <b>Which metric?</b> CPU suits compute-bound web services. Memory rarely scales well (most runtimes do not give memory back, so adding Pods does not reduce usage). For queue workers use an external metric (messages in the queue per Pod) through KEDA or a metrics adapter. Pick a CPU target around 60-70% so there is headroom while new Pods start.</p>
      <p>🟣 <b>Rolling update corner cases.</b> A readiness probe that is too optimistic marks new Pods Ready before the app can serve; one that is too strict stalls the rollout. Without a <code>preStop</code> sleep, a Pod can receive requests after it got SIGTERM because endpoint removal and signal delivery race. <code>minReadySeconds</code> catches Pods that start and crash seconds later. Set <code>terminationGracePeriodSeconds</code> longer than your longest request. Use <code>topologySpreadConstraints</code> so the surge Pods do not land next to the old ones on the same node or zone.</p>
      <p>🟣 <b>PDB details.</b> The PDB controller computes <code>expectedPods</code> from the owning controller, so it works with Deployments, StatefulSets and ReplicaSets. Percent values round <b>up</b> for <code>minAvailable</code> and for <code>maxUnavailable</code>. Evictions go through the eviction subresource, so <code>kubectl delete pod</code> ignores PDBs, but <code>kubectl drain</code> respects them. The setting <code>unhealthyPodEvictionPolicy: AlwaysAllow</code> (stable in 1.31, beta and on by default earlier) lets a crash-looping Pod be evicted instead of blocking a drain forever.</p>`,
    aiEra: `<p>🤖 Autoscaling is full of numbers that an AI tool will happily guess: a CPU target, a window, a max replica count. It will often write a valid HPA that never scales because the Deployment has no requests, or one that scales to 50 Pods because nothing limited <code>maxReplicas</code> and you pay for it. Use AI to draft the YAML and to explain <code>kubectl describe hpa</code> conditions, but get the numbers from <b>measurement</b>: load-test in a staging cluster, look at real CPU per request, and set the target from that. Newer cloud features suggest or auto-tune resource requests from history (VPA recommendations, "right-sizing" tools); treat them as input to a review, not as a replacement for one. Record the reason for each number in the chart\'s <code>values.yaml</code> comments so the next engineer (or the next AI) does not "optimise" it blindly.</p>`
  });

  // ───────────────────────── Topic 4: StatefulSets and persistent volumes ─────────────────────────
  topics.push({
    title: 'StatefulSets and Persistent Volumes: Pods with a Name and a Locker',
    analogy: `<p>A Deployment treats Pods like <b>paper cups</b>: identical, replaceable, thrown away. A StatefulSet treats them like <b>employees with a name tag and a personal locker</b>. Employee "db-0" always gets locker "data-db-0", always starts before "db-1", and if db-0 is sick and replaced, the new db-0 gets the <i>same name and the same locker</i> with all the files inside. The <b>PersistentVolume (PV)</b> is the real locker room; the <b>PersistentVolumeClaim (PVC)</b> is the locker request slip; the <b>StorageClass</b> is the rule for what kind of locker to build when someone asks.</p>`,
    explain: `<p>🟢 <b>Why not a Deployment for a database?</b> Pods of a Deployment have random names, start all at once and share (or lose) their disk. Databases, Kafka brokers, Elasticsearch nodes and ZooKeeper need three things: a <b>stable identity</b> (<code>db-0</code>, <code>db-1</code>), a <b>stable address</b>, and <b>their own disk that follows them</b>. A StatefulSet gives exactly those.</p>
      ${H.table(['Piece', 'What it gives you'], [
        ['<b>Ordered names</b>', 'Pods are <code>NAME-0</code>, <code>NAME-1</code>, ... They start in order (0, then 1, then 2) and stop in reverse. Each must be Ready before the next starts (unless <code>podManagementPolicy: Parallel</code>)'],
        ['<b>Headless Service</b> (<code>clusterIP: None</code>)', 'gives each Pod a DNS name: <code>db-0.db.NAMESPACE.svc.cluster.local</code>. Peers find each other by name, not by a random IP'],
        ['<b>volumeClaimTemplates</b>', 'a PVC <i>template</i>. Kubernetes creates one PVC per Pod: <code>data-db-0</code>, <code>data-db-1</code>. They survive Pod deletion'],
        ['<b>updateStrategy</b>', '<code>RollingUpdate</code> replaces Pods from the highest number down, one at a time. <code>partition: 2</code> updates only Pods 2 and above: a built-in canary']
      ])}
      <p>🟢 <b>The storage chain.</b> Storage in Kubernetes has three layers, and mixing them up is the number one confusion:</p>
      ${H.table(['Object', 'Who creates it', 'Meaning'], [
        ['<b>StorageClass</b>', 'platform team, once', '"how to make disks": which provisioner (CSI driver), disk type, reclaim policy, binding mode'],
        ['<b>PersistentVolumeClaim</b>', 'the app (or a StatefulSet template)', '"I need 10Gi, ReadWriteOnce, of class fast"'],
        ['<b>PersistentVolume</b>', 'the provisioner automatically (dynamic) or an admin by hand (static)', 'the real disk (cloud volume, local path, NFS share)']
      ])}
      <p>The PVC <b>binds</b> to one matching PV. A Pod then mounts the PVC by name. Access modes: <code>ReadWriteOnce</code> (RWO, one <i>node</i> at a time), <code>ReadWriteOncePod</code> (one Pod only), <code>ReadOnlyMany</code>, <code>ReadWriteMany</code> (needs NFS or a file system CSI driver; block disks are RWO).</p>
      <p>🔵 <b>Two settings that decide whether you lose data.</b></p>
      ${H.table(['Setting', 'Values', 'Careful about'], [
        ['<code>reclaimPolicy</code> (class or PV)', '<code>Delete</code> (disk is destroyed when the PVC is deleted) or <code>Retain</code> (disk and data are kept, PV becomes <code>Released</code> and needs manual cleanup)', 'dynamic classes default to <b>Delete</b>. For production databases use <code>Retain</code> or snapshots/backups'],
        ['<code>volumeBindingMode</code>', '<code>Immediate</code> (create the disk as soon as the PVC exists) or <code>WaitForFirstConsumer</code> (wait until a Pod is scheduled, then create the disk in that Pod\'s zone)', 'cloud disks live in one zone. With <code>Immediate</code> the disk may be created in zone a while the Pod can only run in zone b']
      ])}
      <p>🔵 <b>Real situation: the Pod stuck in Pending.</b> <code>db-1</code> stays <code>Pending</code> with the event <code>0/6 nodes are available: 3 node(s) had volume node affinity conflict</code>. The PVC <code>data-db-1</code> is bound to a disk in <code>eu-west-1a</code>, but the nodes with free CPU are in <code>eu-west-1b</code>. A cloud block disk cannot attach across zones. Fixes: add capacity in the right zone, free resources there, or (for a new cluster) use a class with <code>WaitForFirstConsumer</code> so the disk is always created where the Pod lands, and spread replicas across zones with <code>topologySpreadConstraints</code> so each zone has a Pod and a disk.</p>
      <p>🔵 <b>Deleting and scaling.</b> Deleting a StatefulSet or scaling it down does <b>not</b> delete the PVCs by default (safety). That is good for data and bad for cost. Since Kubernetes 1.32 (beta and on by default earlier) <code>persistentVolumeClaimRetentionPolicy</code> with <code>whenScaled</code> and <code>whenDeleted</code> set to <code>Retain</code> or <code>Delete</code> lets you choose. Growing a disk: set <code>allowVolumeExpansion: true</code> on the class, then edit the PVC's <code>resources.requests.storage</code> (grow only, never shrink). The <code>volumeClaimTemplates</code> of an existing StatefulSet cannot be edited: patch each PVC and recreate the StatefulSet with <code>--cascade=orphan</code>.</p>
      <p>🔵 <b>A StatefulSet is not a backup.</b> Replication, backups and restore tests belong to the database (or to a Kubernetes operator that knows the database, such as CloudNativePG). CSI <b>VolumeSnapshots</b> give point-in-time copies of disks.</p>`,
    clues: [
      '"Database / Kafka / Elasticsearch on Kubernetes" → StatefulSet + headless Service + volumeClaimTemplates (or better, an operator)',
      '"Pod needs the same disk after a restart" → PVC; "same hostname after a restart" → StatefulSet',
      '"volume node affinity conflict" or "Pod stuck Pending, PVC Bound" → zonal disk, wrong zone: <code>WaitForFirstConsumer</code> and zone spread',
      '"PVC stuck Pending" → no default StorageClass, wrong class name, no provisioner, or <code>WaitForFirstConsumer</code> waiting for a Pod',
      '"We deleted the PVC and lost production data" → reclaimPolicy Delete; use Retain, snapshots and tested backups',
      '"Need shared files for many Pods" → ReadWriteMany (NFS/EFS-type driver), not a block-disk RWO volume'
    ],
    code: [Y(`apiVersion: v1
kind: Service
metadata:
  name: db                      # headless: gives db-0.db, db-1.db DNS names
spec:
  clusterIP: None
  selector: { app: db }
  ports: [{ port: 5432, name: pg }]
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: db
spec:
  serviceName: db               # must name the headless Service
  replicas: 3
  selector:
    matchLabels: { app: db }
  podManagementPolicy: OrderedReady
  updateStrategy:
    type: RollingUpdate
    rollingUpdate: { partition: 0 }          # raise to hold back lower-numbered Pods (canary)
  persistentVolumeClaimRetentionPolicy:
    whenDeleted: Retain
    whenScaled: Retain
  template:
    metadata:
      labels: { app: db }
    spec:
      terminationGracePeriodSeconds: 60
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: topology.kubernetes.io/zone
          whenUnsatisfiable: DoNotSchedule
          labelSelector:
            matchLabels: { app: db }
      containers:
        - name: postgres
          image: postgres:16
          ports: [{ containerPort: 5432, name: pg }]
          env:
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef: { name: db-credentials, key: password }   # Secret created elsewhere (External Secrets)
            - name: PGDATA
              value: /var/lib/postgresql/data/pgdata
          volumeMounts:
            - { name: data, mountPath: /var/lib/postgresql/data }
          resources:
            requests: { cpu: 250m, memory: 512Mi }
  volumeClaimTemplates:
    - metadata:
        name: data              # PVCs become data-db-0, data-db-1, data-db-2
      spec:
        accessModes: ["ReadWriteOnce"]
        storageClassName: fast-retain
        resources:
          requests: { storage: 10Gi }`, 'statefulset.yaml (headless Service + StatefulSet)'),
      Y(`apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-retain
provisioner: ebs.csi.aws.com            # a CSI driver; on kind use rancher.io/local-path
parameters:
  type: gp3
reclaimPolicy: Retain                    # keep the disk when the PVC is deleted
volumeBindingMode: WaitForFirstConsumer  # create the disk in the zone where the Pod lands
allowVolumeExpansion: true`, 'storageclass.yaml'),
      SH(R`kubectl get storageclass                      # which class is (default)?
kubectl get pvc,pv                              # STATUS Bound? which PV? which zone (see below)
kubectl describe pvc data-db-1 | tail -15       # events: ProvisioningFailed, WaitForFirstConsumer ...
kubectl get pv -o custom-columns=NAME:.metadata.name,CLAIM:.spec.claimRef.name,RECLAIM:.spec.persistentVolumeReclaimPolicy,ZONE:.spec.nodeAffinity.required.nodeSelectorTerms[0].matchExpressions[0].values[0]
kubectl describe pod db-1 | sed -n '/Events/,$p'  # "volume node affinity conflict"
kubectl get nodes -L topology.kubernetes.io/zone  # which zones have nodes (and room)
kubectl patch pvc data-db-0 -p '{"spec":{"resources":{"requests":{"storage":"20Gi"}}}}'   # grow online (class must allow it)
kubectl patch pv PV_NAME -p '{"spec":{"persistentVolumeReclaimPolicy":"Retain"}}'         # protect an existing disk`, 'storage diagnosis commands')],
    codeTitle: ['StatefulSet with volumeClaimTemplates', 'StorageClass with Retain', 'inspecting storage'],
    viz: [{
      title: 'StatefulSet life: ordered start, same name same disk, scale down keeps data',
      input: 'replicas=3 scale-to=1',
      inputLabel: 'replicas at the start, then scale-to = the smaller count (numbers 1 to 5)',
      gen: function (input) {
        var o = kvInput(input), n = Math.min(5, Math.max(2, num(o.replicas, 3))), s = Math.min(n - 1, Math.max(0, num(o['scale-to'], 1))), f = [];
        var pods = [], pvcs = [];
        function tbl(label, hlRow) {
          var rows = [], hl = {};
          for (var i = 0; i < Math.max(pods.length, pvcs.length); i++) rows.push(['db-' + i, pods[i] || '(none)', pvcs[i] ? 'data-db-' + i + ' (' + pvcs[i] + ')' : '(none)']);
          if (hlRow !== undefined) hl[hlRow] = 'cur';
          return { type: 'table', label: label, columns: ['name', 'Pod', 'PVC (data locker)'], rows: rows.length ? rows : [['-', '-', '-']], hl: hl };
        }
        f.push({ narr: 'A StatefulSet with ' + n + ' replicas is applied. Nothing exists yet. Pods will be named db-0, db-1, ... and each gets its own PVC from <code>volumeClaimTemplates</code>.', parts: [tbl('state')] });
        for (var i = 0; i < n; i++) {
          pvcs[i] = 'Bound'; pods[i] = 'Starting';
          f.push({ narr: 'Step ' + (i + 1) + ': create PVC <code>data-db-' + i + '</code> (a PV is provisioned and bound) and start Pod <b>db-' + i + '</b>. ' + (i < n - 1 ? 'db-' + (i + 1) + ' waits: <code>OrderedReady</code> starts the next Pod only when this one is Ready.' : 'This was the last one.'), parts: [tbl('state', i)] });
          pods[i] = 'Ready';
          f.push({ narr: 'db-' + i + ' passes its readiness probe and is Ready.', parts: [tbl('state', i)] });
        }
        pods[1] = 'Terminated'; f.push({ narr: 'The node under <b>db-1</b> dies (or you delete the Pod). The Pod object goes away, but the PVC <code>data-db-1</code> stays <b>Bound</b>: the locker is not thrown out with the employee.', parts: [tbl('state', 1)] });
        pods[1] = 'Ready'; f.push({ narr: 'The controller creates a new Pod with the <b>same name db-1</b> and re-attaches the <b>same PVC</b>. All the data is there. (If the disk sits in another zone than any free node, the new Pod would stay Pending: volume node affinity conflict.)', parts: [tbl('state', 1)] });
        for (var k = n - 1; k >= s; k--) {
          pods[k] = null; delete pods[k]; pods.length = Math.min(pods.length, k);
          f.push({ narr: 'Scale down to ' + s + ': Pod <b>db-' + k + '</b> is removed (highest number first, one at a time). Its PVC <b>data-db-' + k + ' is kept</b> by default (<code>whenScaled: Retain</code>), so scaling back up reuses the data and also keeps costing money.', parts: [tbl('state', k)] });
        }
        f.push({ narr: 'Final state: ' + s + ' Pod(s) running, ' + n + ' PVCs still exist. If you scale back to ' + n + ', each Pod reconnects to its old disk. To delete the data on purpose, delete the PVCs (and the PVs if the reclaim policy is Retain).', parts: [tbl('state')] });
        return pad4(f, 'Done.');
      }
    }],
    examples: [
      { title: 'Pod stuck in Pending because its disk is in another zone', html: `<p>The real-world classic. Read the Pod event first, then the PVC, then the PV's zone, then the nodes. The answer is almost always sitting in those four outputs.</p>`, code: SH(R`kubectl get pod db-1 -o wide                       # Pending, no NODE
kubectl describe pod db-1 | sed -n '/Events/,$p'
#   Warning  FailedScheduling  ... 2 node(s) had volume node affinity conflict, 3 Insufficient cpu
kubectl get pvc data-db-1 -o jsonpath='{.spec.volumeName}{"\n"}'     # the PV name
kubectl get pv PV_NAME -o jsonpath='{.spec.nodeAffinity.required.nodeSelectorTerms[0].matchExpressions[0].values}{"\n"}'   # ["eu-west-1a"]
kubectl get nodes -L topology.kubernetes.io/zone    # zone a nodes are full; add a node (or free CPU) in zone a`) },
      { title: 'See PVC and PV bind on a local kind cluster', html: `<p>kind ships a default class <code>standard</code> (local-path provisioner) with <code>WaitForFirstConsumer</code>. A PVC stays <code>Pending</code> until a Pod uses it. That is normal, not an error.</p>`, code: [Y(`apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: demo-pvc
spec:
  accessModes: ["ReadWriteOnce"]
  resources:
    requests: { storage: 1Gi }
---
apiVersion: v1
kind: Pod
metadata:
  name: writer
spec:
  containers:
    - name: c
      image: busybox:1.36
      command: ["sh", "-c", "date >> /data/log.txt; sleep 3600"]
      volumeMounts: [{ name: d, mountPath: /data }]
  volumes:
    - name: d
      persistentVolumeClaim: { claimName: demo-pvc }`, 'pvc-and-pod.yaml'), SH(R`kubectl apply -f pvc-and-pod.yaml
kubectl get pvc demo-pvc          # Pending until the Pod is scheduled, then Bound
kubectl delete pod writer && kubectl apply -f pvc-and-pod.yaml
kubectl exec writer -- cat /data/log.txt     # two lines: the file survived the Pod`)] },
      { title: 'Change the reclaim policy before you delete a claim', html: `<p>You are about to delete a namespace that holds a database PVC, and you want the disk to survive in case someone needs it. Set <code>Retain</code> on the PV first. After deleting the claim the PV shows <code>Released</code>; to reuse it you clear <code>claimRef</code> deliberately.</p>`, code: SH(R`PV=$(kubectl get pvc data-db-0 -n prod -o jsonpath='{.spec.volumeName}')
kubectl patch pv "$PV" -p '{"spec":{"persistentVolumeReclaimPolicy":"Retain"}}'
kubectl delete pvc data-db-0 -n prod
kubectl get pv "$PV"                         # STATUS Released: data intact, not yet re-bindable
kubectl patch pv "$PV" --type=json -p '[{"op":"remove","path":"/spec/claimRef"}]'   # Available again, on purpose`) },
      { title: 'Canary a StatefulSet upgrade with a partition', html: `<p>With <code>partition: 2</code> on a 3-replica set, only <code>db-2</code> gets the new image. Check it, then lower the partition to 1, then 0. If db-2 misbehaves, set the image back.</p>`, code: SH(R`kubectl patch sts db -p '{"spec":{"updateStrategy":{"rollingUpdate":{"partition":2}}}}'
kubectl set image sts/db postgres=postgres:16.4
kubectl rollout status sts/db --timeout=120s
kubectl get pods -l app=db -o custom-columns=NAME:.metadata.name,IMAGE:.spec.containers[0].image
kubectl patch sts db -p '{"spec":{"updateStrategy":{"rollingUpdate":{"partition":0}}}}'   # continue to the rest`) }
    ],
    problems: [{
      title: 'Why is db-1 Pending, and how do you fix it without losing data?',
      level: 'Hard', tags: ['statefulset', 'pvc', 'storage', 'zones'], companies: ['Amazon', 'Datadog', 'Elastic'],
      tests: SKIP,
      statement: `<p>A 3-replica PostgreSQL StatefulSet runs on a cluster with nodes in three zones. After a node pool upgrade, <code>db-1</code> stays <code>Pending</code> for 20 minutes. Its PVC is <code>Bound</code>. Describe shows <code>FailedScheduling: 2 node(s) had volume node affinity conflict, 4 Insufficient cpu</code>. Diagnose the cause with commands, then give two fixes: an immediate one that keeps the data, and a permanent one in the YAML so it cannot happen again.</p>`,
      constraints: `<p>Free to follow on kind with 3 worker nodes labelled with fake zones (<code>kubectl label node NODE topology.kubernetes.io/zone=a</code>), or read as a cloud runbook. Never delete the PVC or PV of a database during diagnosis.</p>`,
      example: `<p>PV for <code>data-db-1</code> says zone ${H.c('b', 'eu-west-1a')}. Nodes in that zone have no free CPU (the node pool upgrade left only one small node). Nodes in the other zones are free but cannot attach the disk. So the scheduler finds no valid node: ${H.c('r', 'Pending')}.</p>`,
      brute: { why: `<p>The common reaction is <code>kubectl delete pvc data-db-1</code> "to let it recreate". For a Delete-policy class that destroys the only copy of that replica's data, and the replica then has to resync from the primary (or you lose data if it was the only copy). It also does not fix the real cause.</p>`, code: SH(R`kubectl delete pvc data-db-1 && kubectl delete pod db-1   # destroys the disk: do NOT do this`, 'Naive (dangerous)') },
      mcq: { q: 'Which StorageClass setting prevents a new disk from being created in a zone where the Pod cannot run?', options: ['volumeBindingMode: WaitForFirstConsumer', 'reclaimPolicy: Retain', 'allowVolumeExpansion: true', 'accessModes: ReadWriteMany'], answer: 0, explain: 'WaitForFirstConsumer delays creating the disk until the scheduler has picked a node, then provisions it in that node\'s zone.' },
      hints: ['<p>Hint 1: the PVC is Bound, so storage exists. Ask <i>where</i> the disk is, not <i>whether</i>.</p>', '<p>Hint 2: a zonal block disk can only attach to nodes in its zone. Compare the PV\'s nodeAffinity zone with the zones that have free CPU.</p>', '<p>Hint 3: immediate fix = give that zone capacity (add or resize a node, evict a low-priority Pod there) and the Pod schedules by itself. Permanent fix = WaitForFirstConsumer class, topologySpreadConstraints across zones, a node pool per zone sized for its share, and the cluster autoscaler enabled per zone.</p>'],
      solution: {
        approach: `<p>Read four things in order: the Pod event, the PVC, the PV's zone, the nodes in that zone. The disk is pinned to <code>eu-west-1a</code>; capacity there is the problem. Do not touch the PVC. Add capacity in that zone and let the scheduler place the Pod. Then change the design: <code>WaitForFirstConsumer</code> plus zone spread, and one autoscaled node group per zone so each zone can always host its share of replicas.</p>`,
        code: SH(R`# 1) Diagnose (read-only)
kubectl describe pod db-1 | sed -n '/Events/,$p'
PV=$(kubectl get pvc data-db-1 -o jsonpath='{.spec.volumeName}')
kubectl get pv "$PV" -o jsonpath='{.spec.nodeAffinity.required.nodeSelectorTerms[0].matchExpressions[0].values}{"\n"}'
kubectl get nodes -L topology.kubernetes.io/zone
kubectl describe nodes -l topology.kubernetes.io/zone=eu-west-1a | grep -A6 "Allocated resources"

# 2) Immediate fix, data untouched: make room in the disk's zone (cloud example: scale that node group)
#    kind lab: add a node or free CPU there, for instance scale down a low-priority Deployment
kubectl scale deploy/batch-report --replicas=0 -n reports
kubectl get pod db-1 -w                    # Pending -> ContainerCreating -> Running

# 3) Permanent: protect the disk and fix the class (applies to NEW claims only)
kubectl patch pv "$PV" -p '{"spec":{"persistentVolumeReclaimPolicy":"Retain"}}'`),
        alt: [Y(`# Permanent fix in YAML: new class + zone spread (existing PVCs keep their old class)
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: gp3-wait
provisioner: ebs.csi.aws.com
parameters: { type: gp3 }
reclaimPolicy: Retain
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
---
# In the StatefulSet pod template:
#   topologySpreadConstraints:
#     - maxSkew: 1
#       topologyKey: topology.kubernetes.io/zone
#       whenUnsatisfiable: DoNotSchedule
#       labelSelector: { matchLabels: { app: db } }
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: database
value: 100000
description: Databases may preempt batch work when a zone is tight.`, 'Permanent fix')],
        dry: { head: ['check', 'command', 'finding'], rows: [['Pod event', 'describe pod db-1', 'volume node affinity conflict + Insufficient cpu'], ['PVC', 'get pvc data-db-1', 'Bound to PV pvc-7f3...'], ['PV zone', 'get pv ... nodeAffinity', 'eu-west-1a'], ['Nodes', 'get nodes -L zone', 'zone a: 1 small node, full; zones b, c: free but cannot attach the disk']] },
        complexity: `<p>Diagnosis is four read-only commands. The fix time is how long a node takes to join (minutes), not the size of the data.</p>`,
        followUps: ['What if the whole zone is gone? (restore from a CSI snapshot or backup into another zone, or let the replica resync from the primary)', 'Why does an EFS/NFS-style volume avoid this problem? (it is regional, but it is slower and usually not right for databases)']
      }
    }],
    deepDive: `<p>🟣 <b>CSI and the attach flow.</b> A PVC is handled by the external-provisioner (creates the disk), the attacher (attaches it to a node) and the kubelet (formats and mounts it into the Pod). A Pod moving to another node must wait for the old attachment to be released; a node that died uncleanly can make that take minutes (the 6-minute force-detach timeout on some clouds). Stuck <code>Multi-Attach error</code> events mean exactly that.</p>
      <p>🟣 <b>Stable identity is not high availability.</b> A StatefulSet restarts a Pod with the same name; it does not elect a primary, replicate data or fail over. Without an operator you must configure replication in the container (init containers, config) yourself. Operators (CloudNativePG, Strimzi, ECK, Percona) encode the day-2 knowledge: backups, failover, rolling upgrades in the right order. In an interview, "I would use a managed database, or an operator" is a mature answer.</p>
      <p>🟣 <b>Things you cannot change after creation:</b> <code>volumeClaimTemplates</code>, <code>selector</code> and <code>serviceName</code>. The pattern for a change: <code>kubectl delete sts db --cascade=orphan</code> (Pods and PVCs stay), edit the manifest, re-apply. For disk expansion on drivers that need a filesystem resize, the Pod may need a restart.</p>
      <p>🟣 <b>Local volumes and kind.</b> Local PVs are fast and tied to one node: if the node dies, the Pod cannot start elsewhere until you intervene. Good for caches and some databases with replication; wrong for a single replica you cannot lose. Pod Disruption Budgets matter here too: draining a node with a local volume means the Pod cannot move.</p>`,
    aiEra: `<p>🤖 Storage is where "it worked in the demo" meets real data, and where an overconfident answer is expensive. An AI assistant is useful for explaining an event such as <code>volume node affinity conflict</code> and for drafting the diagnosis commands, but it may casually suggest deleting a PVC or <code>--force --grace-period=0</code> on a Pod to "unstick" it. Treat any suggestion that removes a volume, a claim, a StatefulSet (without <code>--cascade=orphan</code>) or changes a reclaim policy as a <b>stop and think</b> moment: check the reclaim policy, check a recent snapshot, then act. Ask the assistant for the rollback of every change it proposes. And practice restoring from a backup: a backup nobody has restored is only a hope.</p>`
  });

  // ───────────────────────── Topic 5: RBAC ─────────────────────────
  topics.push({
    title: 'RBAC: Least Privilege for People and Pods',
    analogy: `<p>Think of an office building with key cards. A <b>Role</b> is a list of doors ("open the supply room, read the printer log"). A <b>RoleBinding</b> hands that list to a person or a robot, but only for <b>one floor</b> (a namespace). A <b>ClusterRole</b> can describe doors in the whole building, and a <b>ClusterRoleBinding</b> gives them out building-wide. There is no "this person is forbidden from door X" card: cards only add access. So the safe way to run a building is to give each person and each robot the smallest list that lets them do their job, and to guard the master key (<code>cluster-admin</code>) like gold.</p>`,
    explain: `<p>🟢 <b>The four objects.</b></p>
      ${H.table(['Object', 'Scope', 'What it is'], [
        ['<b>Role</b>', 'one namespace', 'a list of rules: which <i>verbs</i> on which <i>resources</i>'],
        ['<b>ClusterRole</b>', 'whole cluster', 'same, plus cluster-wide things (nodes, namespaces, CRDs) and non-resource URLs like <code>/healthz</code>. Also reusable as a template'],
        ['<b>RoleBinding</b>', 'one namespace', 'gives a Role <i>or a ClusterRole</i> to subjects, only inside its namespace'],
        ['<b>ClusterRoleBinding</b>', 'whole cluster', 'gives a ClusterRole to subjects everywhere, in all namespaces']
      ])}
      <p>A <b>subject</b> is a <code>User</code> or <code>Group</code> (Kubernetes has no user objects; identity comes from certificates, OIDC or your cloud login) or a <b>ServiceAccount</b> (an identity for a Pod, which is the one you manage with YAML). A rule has <code>apiGroups</code> (<code>""</code> = core, <code>apps</code>, ...), <code>resources</code> (<code>pods</code>, <code>pods/log</code>, <code>secrets</code>), optionally <code>resourceNames</code> (specific objects) and <code>verbs</code>: <code>get list watch create update patch delete deletecollection</code>. Rules are <b>additive</b>: a request is allowed if <i>any</i> rule from <i>any</i> binding allows it. Everything else is denied by default.</p>
      <p>🟢 <b>Least privilege, in practice.</b> An app that only reads its own ConfigMap should get exactly <code>get</code> on that ConfigMap. Rules of thumb:</p>
      <ul><li><b>Never give an application <code>cluster-admin</code></b>, and never bind to the default ServiceAccount; create a ServiceAccount per app.</li>
      <li>Prefer a <b>Role + RoleBinding</b> in the app's namespace over cluster-wide bindings.</li>
      <li>List verbs and resources explicitly. Avoid <code>"*"</code>.</li>
      <li>Apps that never call the API should have <code>automountServiceAccountToken: false</code>.</li>
      <li>Treat <code>secrets</code> (even <code>list</code>, which returns the values), <code>pods/exec</code>, <code>create pods</code>, and the verbs <code>escalate</code>, <code>bind</code>, <code>impersonate</code> as <b>very powerful</b>: each one can be turned into more access.</li></ul>
      <p>🔵 <b>Real situation: the Forbidden error.</b> An app logs: <code>pods is forbidden: User "system:serviceaccount:shop:web" cannot list resource "pods" in API group "" in the namespace "shop"</code>. The message already contains everything you need: the identity (ServiceAccount <code>web</code> in namespace <code>shop</code>), the verb (<code>list</code>), the resource (<code>pods</code>), the group (<code>""</code>) and the namespace. Check with <code>kubectl auth can-i list pods -n shop --as=system:serviceaccount:shop:web</code>. Fix by adding the <i>one</i> missing rule, not by granting admin. And check the Pod really uses that ServiceAccount (<code>kubectl get pod -o jsonpath='{.spec.serviceAccountName}'</code>): "I created a Role but forgot <code>serviceAccountName</code>" is the most common reason.</p>
      <p>🔵 <b>Debugging tools.</b> <code>kubectl auth can-i VERB RESOURCE [-n NS] [--as USER]</code> answers yes/no. <code>kubectl auth can-i --list -n NS --as=...</code> prints everything allowed. <code>kubectl auth whoami</code> shows who the API server thinks you are. Add-ons such as <code>kubectl-who-can</code> and <code>rbac-tool</code> answer "who can read secrets?". The API server audit log shows the denied request.</p>
      <p>🔵 <b>ServiceAccount tokens.</b> Modern clusters (1.24+) issue short-lived, audience-bound tokens projected into the Pod (rotated by the kubelet). Long-lived token Secrets are no longer created automatically; do not create them unless a legacy system forces you to. For cloud APIs (S3, Cloud SQL) use workload identity (IRSA, GKE Workload Identity, Azure Workload Identity) instead of copying keys into Secrets.</p>
      <p>🔵 <b>RBAC and Helm.</b> A good chart creates a ServiceAccount, a Role and a RoleBinding behind values like <code>serviceAccount.create</code> and <code>rbac.create</code>, with rules the chart needs and nothing more. The person or pipeline running <code>helm install</code> needs the permissions to create those objects, so give the CI identity a namespaced Role, not cluster-admin.</p>`,
    clues: [
      '"forbidden: User ... cannot list resource ... in the namespace ..." → a missing RBAC rule; read the message, then <code>kubectl auth can-i --as</code>',
      '"Give the CI/CD pipeline access to deploy to one namespace" → ServiceAccount + Role + RoleBinding in that namespace, no ClusterRole',
      '"Developers read-only across the cluster" → ClusterRole <code>view</code> via a ClusterRoleBinding to a group, with no secrets',
      '"Who can read secrets in prod?" → audit RoleBindings (kubectl-who-can, rbac-tool), look for <code>*</code> and cluster-admin bindings',
      '"The app needs access to S3" → workload identity (IRSA / Workload Identity), not RBAC and not a long-lived key in a Secret',
      '"Role exists but still forbidden" → wrong namespace, wrong subject name, binding missing, or the Pod uses the default ServiceAccount'
    ],
    code: [Y(`apiVersion: v1
kind: ServiceAccount
metadata:
  name: web
  namespace: shop
automountServiceAccountToken: true     # false for Pods that never call the API
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: web-config-reader
  namespace: shop
rules:
  - apiGroups: [""]
    resources: ["configmaps"]
    resourceNames: ["web-settings"]    # one named ConfigMap only
    verbs: ["get"]
  - apiGroups: [""]
    resources: ["pods"]
    verbs: ["get", "list", "watch"]    # read Pods in this namespace only
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: web-config-reader
  namespace: shop
subjects:
  - kind: ServiceAccount
    name: web
    namespace: shop
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: web-config-reader`, 'rbac.yaml (ServiceAccount + Role + RoleBinding)'),
      Y(`# Reuse the built-in "view" ClusterRole for a team, but only in ONE namespace
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: team-a-view
  namespace: shop
subjects:
  - kind: Group
    name: team-a                       # group name comes from OIDC / your identity provider
    apiGroup: rbac.authorization.k8s.io
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole                    # a ClusterRole bound by a RoleBinding is limited to this namespace
  name: view`, 'ClusterRole reused through a RoleBinding'),
      SH(R`SA=system:serviceaccount:shop:web
kubectl auth can-i get configmaps/web-settings -n shop --as=$SA     # yes
kubectl auth can-i list secrets -n shop --as=$SA                     # no
kubectl auth can-i list pods -n other --as=$SA                       # no: Role is namespaced
kubectl auth can-i --list -n shop --as=$SA                           # everything it may do
kubectl auth whoami                                                  # who am I (1.28+; GA in 1.30)
kubectl get rolebindings,clusterrolebindings -A -o wide | grep -E "cluster-admin|system:masters"   # who holds the master key?`, 'checking permissions')],
    codeTitle: ['ServiceAccount, Role and RoleBinding', 'ClusterRole through a RoleBinding', 'kubectl auth can-i'],
    viz: [{
      title: 'RBAC check: does any rule allow this request?',
      input: 'get secrets db-creds',
      inputLabel: 'verb resource [name]  e.g. "get pods/log -", "list secrets -", "get secrets db-creds" (use - for no name)',
      gen: function (input) {
        var t = String(input || '').trim().split(/\s+/);
        if (t.length < 2) throw new Error('Write: verb resource [name]  (for example: get pods/log -)');
        var verb = t[0], res = t[1], name = (t[2] && t[2] !== '-') ? t[2] : '';
        var rules = [['Role pod-reader', 'get,list,watch|pods|'], ['Role pod-reader', 'get|pods/log|'], ['Role secret-one', 'get|secrets|db-creds'], ['Role cm-reader', 'get,list|configmaps|']];
        var f = [], rows = rules.map(function (r) { var p = r[1].split('|'); return [r[0], p[0], p[1], p[2] || 'any']; });
        f.push({ narr: 'ServiceAccount <code>web</code> in namespace <code>shop</code> has these rules through its RoleBindings. Nothing else is allowed: <b>deny is the default</b>. The request: <code>' + H.esc(verb) + ' ' + H.esc(res) + (name ? ' ' + H.esc(name) : '') + '</code>.', parts: [{ type: 'table', label: 'rules granted (verbs | resources | resourceNames)', columns: ['from', 'verbs', 'resources', 'names'], rows: rows }] });
        var allowedBy = -1;
        rules.forEach(function (r, i) {
          var m = rbacMatch(r[1], verb, res, name), hl = {}; hl[i] = m.ok ? 'ok' : 'bad';
          if (m.ok && allowedBy < 0) allowedBy = i;
          var why = m.ok ? 'verb, resource and name all match: <b>this rule allows it</b>.' : 'no match because ' + [!m.v ? 'the verb is not listed' : '', !m.r ? 'the resource is not listed (note: <code>pods</code> does not include <code>pods/log</code>)' : '', !m.n ? 'the rule is limited to named objects and the request has none or a different one' : ''].filter(Boolean).join(', ') + '.';
          f.push({ narr: 'Rule ' + (i + 1) + ' (' + H.esc(r[0]) + '): ' + why, parts: [{ type: 'table', label: 'checking rules in order', columns: ['from', 'verbs', 'resources', 'names'], rows: rows, hl: hl }] });
        });
        f.push({ narr: allowedBy >= 0 ? 'Result: <b>allowed</b> by rule ' + (allowedBy + 1) + '. One matching rule is enough; rules never subtract.' : 'Result: <b>Forbidden</b>. No rule matched, so the API server answers 403. The fix is one new, narrow rule, not cluster-admin.', parts: [{ type: 'vars', label: 'verdict', vals: { request: verb + ' ' + res + (name ? '/' + name : ''), result: allowedBy >= 0 ? 'allowed' : 'Forbidden (403)' }, hl: { result: allowedBy >= 0 ? 'ok' : 'bad' } }] });
        return pad4(f, 'Done.');
      }
    }],
    examples: [
      { title: 'Fix a Forbidden error with the smallest possible rule', html: `<p>The log says the ServiceAccount cannot <code>list pods</code>. Confirm the failure with <code>--as</code>, add a Role with exactly that, confirm success, and confirm that a neighbouring permission is still denied.</p>`, code: SH(R`kubectl auth can-i list pods -n shop --as=system:serviceaccount:shop:web     # no
kubectl create role pod-lister -n shop --verb=get,list,watch --resource=pods
kubectl create rolebinding pod-lister -n shop --role=pod-lister --serviceaccount=shop:web
kubectl auth can-i list pods -n shop --as=system:serviceaccount:shop:web     # yes
kubectl auth can-i delete pods -n shop --as=system:serviceaccount:shop:web   # no: still denied
kubectl get pod -n shop -l app=web -o jsonpath='{.items[0].spec.serviceAccountName}{"\n"}'  # really "web"?`) },
      { title: 'A CI identity that can deploy to one namespace and nothing else', html: `<p>The pipeline runs <code>helm upgrade --install</code> in <code>shop</code>. It needs to manage workload objects in that namespace, but not Secrets in other namespaces, nodes, or RBAC. Start from the list of kinds your chart creates, and add only those.</p>`, code: Y(`apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: ci-deployer
  namespace: shop
rules:
  - apiGroups: ["", "apps", "autoscaling", "policy", "networking.k8s.io"]
    resources: ["deployments", "replicasets", "pods", "services", "configmaps",
                "serviceaccounts", "horizontalpodautoscalers", "poddisruptionbudgets",
                "networkpolicies", "ingresses"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  - apiGroups: [""]
    resources: ["secrets"]             # Helm stores the release here, so it needs this in ITS namespace
    verbs: ["get", "list", "create", "update", "delete"]
  - apiGroups: [""]
    resources: ["pods/log"]
    verbs: ["get"]`, 'ci-deployer Role') },
      { title: 'Audit: who holds the master key?', html: `<p>Once a quarter, list every cluster-admin binding and every subject that can read Secrets. Surprises are common: an old CI ServiceAccount, a "temporary" group.</p>`, code: SH(R`kubectl get clusterrolebindings -o json | jq -r '.items[] | select(.roleRef.name=="cluster-admin") | .metadata.name + " -> " + ([.subjects[]? | .kind + ":" + .name] | join(", "))'
kubectl get rolebindings,clusterrolebindings -A -o json | jq -r '.items[] | select(.subjects[]?.name=="default") | .metadata.namespace + "/" + .metadata.name'   # bindings to the default SA: red flag
kubectl auth can-i --list --as=system:serviceaccount:default:default | head      # what the default SA can do
kubectl who-can get secrets -n prod        # needs the kubectl-who-can plugin (krew)`) }
    ],
    problems: [{
      title: 'Evaluate an RBAC request (can-i model)',
      level: 'Medium', tags: ['rbac', 'can-i', 'least-privilege'], companies: ['Okta', 'HashiCorp', 'Palo Alto Networks'],
      statement: `<p>Write <code>can_i(rules, verb, resource, name)</code>. Each rule is a string <code>"verbs|resources|resourceNames"</code> with comma-separated lists; <code>*</code> in verbs or resources means everything; an empty names part means "any object". A request is allowed if <b>at least one</b> rule matches on all three: the verb is listed, the resource is listed (<code>pods</code> does not include <code>pods/log</code>; <code>*</code> includes sub-resources), and, when the rule has names, the request's <code>name</code> is non-empty and listed. A request without a name (like <code>list</code>) is therefore never allowed by a rule that has names. No rules means denied. Return a boolean.</p>`,
      constraints: PYC,
      example: `<p>Rules <code>["get,list,watch|pods|", "get|pods/log|"]</code>. <code>get pods</code> → ${H.c('g', 'True')}. <code>get pods/log</code> → ${H.c('g', 'True')} (second rule). <code>delete pods</code> → ${H.c('r', 'False')}. <code>get secrets</code> → ${H.c('r', 'False')}. With <code>["get|secrets|db-creds"]</code>: <code>get secrets db-creds</code> → ${H.c('g', 'True')}, <code>get secrets other</code> → ${H.c('r', 'False')}.</p>`,
      brute: { why: `<p>Checking only the first rule, or letting a deny-style rule override, misunderstands RBAC: it is a pure union of allows. Another typical bug is matching <code>pods</code> as a prefix of <code>pods/log</code> and so granting log access by accident.</p>`, code: PY(`def can_i(rules, verb, resource, name):
    first = rules[0].split("|") if rules else ["", "", ""]    # looks at the first rule only
    return verb in first[0].split(",") and resource.startswith(first[1])`, 'Naive: first rule, prefix match') },
      mcq: { q: 'A Role grants <code>get</code> on <code>pods</code>. Can the subject run <code>kubectl logs</code>?', options: ['No: logs is the sub-resource pods/log and needs its own rule', 'Yes: logs is part of pods', 'Yes, but only for its own Pods', 'Only with a ClusterRoleBinding'], answer: 0, explain: 'Sub-resources such as pods/log, pods/exec and deployments/scale are separate resources in RBAC and must be granted explicitly.' },
      hints: ['<p>Hint 1: one rule matches or it does not. The answer is "any rule matches".</p>', '<p>Hint 2: for one rule you need three tests: verb in verbs (or <code>*</code>), resource in resources (or <code>*</code>), and the names test.</p>', '<p>Hint 3: split on <code>|</code>, then on commas, and drop empty strings (an empty list of names means no restriction). The names test is: no names in the rule, or (request has a name and it is in the list).</p>'],
      solution: {
        approach: `<p>RBAC is a union of allow rules, so the code is "does <code>any</code> rule pass?". For one rule: the verb test, the resource test (exact text, <code>*</code> as a wildcard) and the names test. The names test is the subtle one: a rule limited to named objects is useless for requests with no name, because Kubernetes cannot know which objects a list would return.</p>`,
        code: PY(`def _rule_allows(rule, verb, resource, name):
    parts = rule.split("|")
    verbs = [v for v in parts[0].split(",") if v]
    resources = [r for r in (parts[1] if len(parts) > 1 else "").split(",") if r]
    names = [n for n in (parts[2] if len(parts) > 2 else "").split(",") if n]
    verb_ok = "*" in verbs or verb in verbs
    res_ok = "*" in resources or resource in resources
    name_ok = not names or (name != "" and name in names)
    return verb_ok and res_ok and name_ok

def can_i(rules, verb, resource, name):
    """True if at least one rule allows the request (RBAC has allow rules only)."""
    return any(_rule_allows(r, verb, resource, name) for r in rules)`),
        dry: { head: ['rules', 'request', 'verb', 'resource', 'name', 'result'], rows: [['get,list,watch|pods|', 'get pods', 'yes', 'yes', 'no names in rule', 'True'], ['get|pods/log|', 'delete pods', 'no', '-', '-', 'False'], ['get|secrets|db-creds', 'get secrets other', 'yes', 'yes', 'other not in [db-creds]', 'False'], ['get|secrets|db-creds', 'list secrets -', 'no', 'yes', '-', 'False']] },
        complexity: `<p>O(R) for R rules, each rule parsed in O(length).</p>`,
        followUps: ['How would you model a ClusterRole bound by a RoleBinding? (the same rules, but only for requests in the binding\'s namespace)', 'Why is <code>list secrets</code> as dangerous as <code>get secrets</code>? (list returns the full objects, including the data)']
      },
      tests: { sig: 'string[] string string string -> bool', fn: 'canI', cases: [
        [[['get,list,watch|pods|', 'get|pods/log|'], 'get', 'pods', ''], true],
        [[['get,list,watch|pods|', 'get|pods/log|'], 'get', 'pods/log', ''], true],
        [[['get,list,watch|pods|', 'get|pods/log|'], 'delete', 'pods', ''], false],
        [[['get,list,watch|pods|', 'get|pods/log|'], 'get', 'secrets', ''], false],
        [[['get,list,watch|pods|'], 'get', 'pods/log', ''], false],
        [[['get|secrets|db-creds'], 'get', 'secrets', 'db-creds'], true],
        [[['get|secrets|db-creds'], 'get', 'secrets', 'other'], false],
        [[['get|secrets|db-creds'], 'list', 'secrets', ''], false],
        [[['get|secrets|db-creds'], 'get', 'secrets', ''], false],
        [[['*|*|'], 'delete', 'nodes', ''], true],
        [[['*|*|'], 'get', 'pods/exec', ''], true],
        [[['get|pods|a,b'], 'get', 'pods', 'b'], true],
        [[['get|pods|a,b'], 'get', 'pods', 'c'], false],
        [[[], 'get', 'pods', ''], false],
        [[['get|pods|', 'create|pods/exec|'], 'create', 'pods/exec', ''], true]
      ] }
    }],
    deepDive: `<p>🟣 <b>How authorization runs.</b> Every API request goes through authentication (who), authorization (may they) and admission (is the object acceptable). The authorizer chain usually is <code>Node</code>, then <code>RBAC</code>. RBAC rules are cached in memory; a new binding takes effect within seconds. Aggregated ClusterRoles (label <code>rbac.authorization.k8s.io/aggregate-to-view: "true"</code>) let CRDs add permissions to the built-in <code>view</code>, <code>edit</code> and <code>admin</code> roles automatically.</p>
      <p>🟣 <b>Privilege escalation is blocked by design.</b> You cannot create a Role containing permissions you do not have yourself, and you cannot bind a role that exceeds your own, unless you hold the <code>escalate</code> or <code>bind</code> verbs. This stops a namespace admin from making themselves cluster admin. But some ordinary permissions are escalation in disguise: <code>create pods</code> in a namespace lets you mount any Secret or ServiceAccount there; <code>create pods/exec</code> gives a shell inside a Pod that may hold powerful tokens; <code>impersonate</code> lets you act as anyone; write access to <code>nodes/proxy</code> bypasses audit. Pod Security Admission (restricted profile) closes the "create a privileged Pod" route.</p>
      <p>🟣 <b>Common bad patterns.</b> Binding <code>system:serviceaccounts</code> (all service accounts) or <code>system:authenticated</code> to a powerful role. A Helm chart that ships <code>ClusterRole</code> with <code>"*"</code> because the author did not want to find the verbs. Monitoring agents with <code>get secrets</code> cluster-wide. Developers added to <code>system:masters</code> via a certificate (this group cannot be revoked by removing a binding, since it is built into the API server).</p>
      <p>🟣 <b>Cloud identity.</b> On managed clusters, human access is usually a cloud IAM role mapped to a Kubernetes group (EKS access entries, GKE IAM, AKS Entra ID). Keep the mapping in code (Terraform) and review it like RBAC. Short-lived credentials (<code>kubectl</code> with an exec plugin) beat static kubeconfigs with client certificates that never expire.</p>`,
    aiEra: `<p>🤖 AI assistants are very good at generating RBAC, and very bad at saying no to "make the error go away". The fastest "fix" they produce for a Forbidden message is a ClusterRoleBinding to <code>cluster-admin</code>. A good habit: paste the exact error, ask for the <b>narrowest Role</b> that fixes it and for the <code>kubectl auth can-i</code> commands that prove it works and that a neighbouring action is still denied. Agents that operate your cluster (for example through an MCP server) need their own ServiceAccount with a read-only or namespaced Role, short-lived credentials and audit logging; an AI with admin credentials is an admin whose intentions can be changed by one malicious line in a log file or web page it reads (prompt injection). Review RBAC like code: generate it, diff it, test it, and let a human approve widening.</p>`
  });

  // ───────────────────────── Topic 6: NetworkPolicy ─────────────────────────
  topics.push({
    title: 'NetworkPolicies: Closing Doors in an Open Building',
    analogy: `<p>By default a Kubernetes cluster is an <b>open-plan office with no internal doors</b>: any Pod can talk to any other Pod, in any namespace. A NetworkPolicy is a rule that puts a lock on certain doors. The first policy that selects a Pod is like locking its door: from then on <i>nothing</i> gets in (or out) except what a rule explicitly lets through. But there is a catch that bites almost everyone once: the rule book is only enforced if the building has <b>security guards</b> (a network plugin that supports policies). Without guards, the API happily accepts your rule book, and nobody follows it.</p>`,
    explain: `<p>🟢 <b>The model in four sentences.</b> (1) With no policies, all traffic between Pods is allowed. (2) A policy has a <code>podSelector</code> saying <i>which Pods it protects</i> (empty = every Pod in the namespace). (3) Once any policy selects a Pod for a direction (<code>Ingress</code> = traffic coming in, <code>Egress</code> = going out), that direction is <b>denied except what some policy allows</b>. (4) Policies only add allows; there is no deny rule, and several policies on one Pod are combined as a union.</p>
      ${H.table(['Goal', 'Policy'], [
        ['Lock every Pod in a namespace', '<code>podSelector: {}</code> with <code>policyTypes: [Ingress, Egress]</code> and no rules (default deny)'],
        ['Let the API reach the database', 'policy on <code>app=db</code>, <code>ingress.from.podSelector: app=api</code>, <code>ports: 5432/TCP</code>'],
        ['Let Pods resolve names', 'egress to the cluster DNS Pods on port 53 UDP and TCP (forget this and everything "times out")'],
        ['Allow another namespace', '<code>namespaceSelector</code> on the label <code>kubernetes.io/metadata.name</code> (set automatically on every namespace)'],
        ['Allow an external range', '<code>ipBlock: cidr: 10.0.0.0/8</code> (with <code>except</code> for holes)']
      ])}
      <p>🔵 <b>The indentation trap: AND versus OR.</b> Inside <code>from</code>, each dash is a separate <b>OR</b> alternative. Inside one dash, a <code>namespaceSelector</code> and a <code>podSelector</code> together are an <b>AND</b>:</p>
      <pre>from:
  - namespaceSelector: {matchLabels: {team: a}}   # OR: any Pod in namespaces labelled team=a
  - podSelector: {matchLabels: {app: api}}         # OR: Pods app=api in THIS namespace

from:
  - namespaceSelector: {matchLabels: {team: a}}   # AND: app=api Pods that are
    podSelector: {matchLabels: {app: api}}         #      in namespaces labelled team=a</pre>
      <p>One missing space turns "only the API of team A" into "everything of team A, plus every API". Always test.</p>
      <p>🔵 <b>Both ends must agree.</b> If the client namespace has a default-deny <i>egress</i> policy, the client needs an egress rule to the server <i>and</i> the server needs an ingress rule from the client. Traffic must be allowed by both sides.</p>
      <p>🔵 <b>Real situation: the policy that does nothing.</b> You apply a default-deny policy on a kind cluster, test with <code>curl</code>... and it still works. <code>kubectl get networkpolicy</code> shows your policy, no errors. The reason: kind's default network plugin historically did not enforce NetworkPolicy (newer builds may; do not assume). Kubernetes stores the object, but <b>enforcement is done by the CNI plugin</b>. Plugins that enforce: Calico, Cilium, Antrea, Weave (retired), and the cloud versions (EKS with the VPC CNI network policy agent or Calico, GKE Dataplane V2 or Calico, AKS with Azure/Calico/Cilium). Always include a <b>negative test</b> in your pipeline: a Pod that must be blocked has to time out. A policy you never saw block anything is a policy you cannot trust.</p>
      <p>🔵 <b>Local setup.</b> kind: create the cluster with <code>networking: disableDefaultCNI: true</code>, then install Calico or Cilium. minikube: <code>minikube start --cni=calico</code> (or <code>--cni=cilium</code>). Give the plugin a minute to become Ready before testing.</p>
      <p>🔵 <b>Helm and policies.</b> Ship a <code>networkpolicy.yaml</code> template in the chart behind <code>networkPolicy.enabled</code>, defaulting to <b>on</b>, with the allowed client labels as a value. Then "secure by default" is part of the package, not a separate project.</p>`,
    clues: [
      '"Only the API may talk to the database" → NetworkPolicy ingress on the db Pods from <code>podSelector app=api</code>, port 5432',
      '"Zero trust / default deny inside the cluster" → a default-deny policy per namespace, then explicit allows (plus DNS egress)',
      '"I applied a NetworkPolicy and nothing changed" → the CNI does not enforce policies (kindnet, flannel without add-on); use Calico or Cilium',
      '"After default-deny everything times out, even DNS" → missing egress rule for kube-dns on port 53 UDP and TCP',
      '"Allow traffic from the monitoring namespace" → <code>namespaceSelector</code> with <code>kubernetes.io/metadata.name</code>; watch AND versus OR',
      '"Restrict outbound internet" → egress policy with <code>ipBlock</code>, or an egress gateway/proxy for domain-based rules (Cilium FQDN policies)'
    ],
    code: [Y(`# 1) Default deny: every Pod in the namespace, both directions
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: shop
spec:
  podSelector: {}
  policyTypes: ["Ingress", "Egress"]
---
# 2) Everyone may resolve DNS (egress to the kube-dns Pods)
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns
  namespace: shop
spec:
  podSelector: {}
  policyTypes: ["Egress"]
  egress:
    - to:
        - namespaceSelector:
            matchLabels: { kubernetes.io/metadata.name: kube-system }
          podSelector:
            matchLabels: { k8s-app: kube-dns }
      ports:
        - { protocol: UDP, port: 53 }
        - { protocol: TCP, port: 53 }`, 'default-deny.yaml and allow-dns'),
      Y(`# 3) web -> api -> db: each hop needs its own allow, on BOTH sides
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: db-from-api
  namespace: shop
spec:
  podSelector:
    matchLabels: { app: db }
  policyTypes: ["Ingress"]
  ingress:
    - from:
        - podSelector:
            matchLabels: { app: api }
      ports:
        - { protocol: TCP, port: 5432 }
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: api-egress-to-db
  namespace: shop
spec:
  podSelector:
    matchLabels: { app: api }
  policyTypes: ["Egress"]
  egress:
    - to:
        - podSelector:
            matchLabels: { app: db }
      ports:
        - { protocol: TCP, port: 5432 }`, 'allow rules for api and db'),
      Y(`# kind cluster that can enforce policies: no default CNI, install Calico or Cilium afterwards
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
networking:
  disableDefaultCNI: true
  podSubnet: 192.168.0.0/16
nodes:
  - role: control-plane
  - role: worker
  - role: worker`, 'kind-calico.yaml'),
      SH(R`# Prove a policy really enforces: a blocked client MUST time out
kubectl run probe --rm -it --restart=Never -n shop --image=busybox:1.36 --labels=app=other -- \
  wget -qO- -T 3 http://db:5432 ; echo "exit code: $?"      # expect a timeout (nonzero) after default-deny
kubectl run okprobe --rm -it --restart=Never -n shop --image=busybox:1.36 --labels=app=api -- \
  nc -zv -w 3 db 5432                                       # expect: open (allowed by db-from-api)
kubectl get networkpolicy -n shop
kubectl get pods -n kube-system | grep -Ei "calico|cilium|antrea"   # is an enforcing CNI running at all?`, 'negative and positive test')],
    codeTitle: ['default deny and DNS', 'allow api to db', 'kind cluster without the default CNI', 'testing enforcement'],
    viz: [{
      title: 'Who can reach whom? Add policies one by one',
      input: 'pods: web, api, db ; policies: |, db|api, api|web',
      inputLabel: 'pods: names (each has label app=name) ; policies: select|from-list  (empty select = all Pods, no from = default deny)',
      gen: function (input) {
        var m = String(input || '').match(/pods:\s*([^;]*);\s*policies:\s*(.*)$/i);
        if (!m) throw new Error('Format: pods: web, api, db ; policies: |, db|api');
        var pods = m[1].split(',').map(function (s) { return s.trim(); }).filter(Boolean), pols = m[2].split(',').map(function (s) { return s.trim(); });
        if (pods.length < 2 || pods.length > 5) throw new Error('Use 2 to 5 pods');
        if (pols.length > 6) throw new Error('Use at most 6 policies');
        pols = pols.map(function (p) { if (p.indexOf('|') < 0) throw new Error('Each policy needs a | like db|api'); return p; });
        function conv(p) { var i = p.indexOf('|'), s = p.slice(0, i).trim(), fr = p.slice(i + 1).split('&').join(',').split(/\s+/).join(',').split(',').map(function (x) { return x.trim(); }).filter(Boolean); return (s ? 'app=' + s : '') + '|' + fr.map(function (x) { return x === '*' ? '*' : 'app=' + x; }).join(','); }
        function matrix(k) {
          var applied = pols.slice(0, k).map(conv), rows = [], hl = {};
          pods.forEach(function (src, r) { var row = []; pods.forEach(function (dst, c) { if (r === c) { row.push('-'); return; } var ok = netAllows(applied, 'app=' + dst, 'app=' + src); row.push(ok ? 'allow' : 'DENY'); hl[r + ',' + c] = ok ? 'ok' : 'bad'; }); rows.push(row); });
          return { type: 'grid', label: 'rows = who calls, columns = who is called', rows: rows, rowHead: pods, colHead: pods, hl: hl };
        }
        var f = [{ narr: 'No NetworkPolicy exists. <b>Everything is allowed</b>: Kubernetes networking is flat and open by default. (This also holds if you applied policies on a cluster whose network plugin does not enforce them.)', parts: [matrix(0)] }];
        pols.forEach(function (p, i) {
          var j = p.indexOf('|'), s = p.slice(0, j).trim(), fr = p.slice(j + 1).trim();
          var txt = s === '' ? 'selects <b>every Pod</b>' : 'selects Pods <code>app=' + H.esc(s) + '</code>';
          txt += fr === '' ? ' and has <b>no allow rule</b>: a default deny for incoming traffic to those Pods.' : ' and allows incoming traffic only from <b>' + H.esc(fr) + '</b>.';
          f.push({ narr: 'Policy ' + (i + 1) + ' (<code>' + H.esc(p) + '</code>) ' + txt + ' Allows from different policies are <b>added together</b>; a Pod that no policy selects stays open.', parts: [matrix(i + 1)] });
        });
        return pad4(f, 'Done.');
      }
    }],
    examples: [
      { title: 'Lock down a namespace step by step', html: `<p>The safe order for a live namespace: first add the allow rules (traffic still flows because nothing is denied yet), then add the default-deny last, then run your positive and negative tests. Doing it the other way round causes a short outage.</p>`, code: SH(R`kubectl apply -n shop -f allow-dns.yaml -f db-from-api.yaml -f api-egress-to-db.yaml
kubectl apply -n shop -f default-deny.yaml          # last: now the allow list is the only way in
kubectl exec -n shop deploy/api -- nc -zv -w 3 db 5432      # still works
kubectl exec -n shop deploy/web -- nc -zv -w 3 db 5432      # must now time out (web may not reach db)`) },
      { title: 'Allow the ingress controller and monitoring in', html: `<p>After default-deny, the ingress controller in its own namespace and Prometheus in <code>monitoring</code> cannot reach your Pods any more. Allow them with namespace selectors. Note the single dash with two selectors: that is an AND.</p>`, code: Y(`apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: web-from-ingress-and-monitoring
  namespace: shop
spec:
  podSelector:
    matchLabels: { app: web }
  policyTypes: ["Ingress"]
  ingress:
    - from:
        - namespaceSelector:
            matchLabels: { kubernetes.io/metadata.name: ingress-nginx }
      ports:
        - { protocol: TCP, port: 8080 }
    - from:
        - namespaceSelector:                       # AND: Prometheus Pods in the monitoring namespace
            matchLabels: { kubernetes.io/metadata.name: monitoring }
          podSelector:
            matchLabels: { app.kubernetes.io/name: prometheus }
      ports:
        - { protocol: TCP, port: 9102 }`, 'allow-ingress-and-monitoring.yaml') },
      { title: 'Diagnose "the policy did nothing"', html: `<p>Work from the cheapest check to the most expensive: is anything enforcing, does the policy select the Pods, does a blocked client really get through.</p>`, code: SH(R`kubectl get pods -n kube-system -o name | grep -Ei "calico|cilium|antrea|weave"   # nothing? no enforcing CNI
kubectl describe networkpolicy default-deny-all -n shop         # PodSelector shows what it protects
kubectl get pods -n shop --show-labels                          # do the labels match the selectors?
kubectl exec -n shop deploy/web -- wget -qO- -T 3 http://db:5432   # must fail after default-deny
# On a cluster without enforcement, this still connects: fix the CNI, not the YAML.`) }
    ],
    problems: [{
      title: 'Is this traffic allowed? (NetworkPolicy evaluation)',
      level: 'Medium', tags: ['networkpolicy', 'ingress', 'model'], companies: ['Cisco', 'VMware', 'Isovalent'],
      statement: `<p>Write <code>traffic_allowed(policies, dst_labels, src_labels)</code> for <b>ingress</b> traffic inside one namespace. A policy is <code>"select|from"</code>: <code>select</code> picks the protected Pods and <code>from</code> lists the allowed clients, comma separated. A selector is <code>k=v</code> pairs joined with <code>&amp;</code> (all must match); an empty <code>select</code> matches every Pod; the client list item <code>*</code> means anyone; an empty <code>from</code> means no client is allowed. Pod labels are given as <code>"k=v,k2=v2"</code> (may be empty). Rules: if no policy selects the destination Pod, the traffic is allowed (default open). Otherwise it is allowed if <b>any</b> selecting policy has a client selector matching the source.</p>`,
      constraints: PYC,
      example: `<p>Policies <code>["|", "app=db|app=api"]</code>: the first selects every Pod and allows nothing (default deny), the second lets <code>app=api</code> in to <code>app=db</code>. Destination <code>app=db</code>, source <code>app=api</code> → ${H.c('g', 'True')}. Source <code>app=web</code> → ${H.c('r', 'False')}. Destination <code>app=web</code>, source <code>app=api</code> → ${H.c('r', 'False')} (default deny selects it; nothing allows it).</p>`,
      brute: { why: `<p>Treating each policy as a deny list ("block these") reverses the model. In Kubernetes a selecting policy turns the direction into a <b>default deny</b> for the selected Pods, and policies only add allows. Another bug is letting an unrelated policy (that selects other Pods) deny the traffic.</p>`, code: PY(`def traffic_allowed(policies, dst_labels, src_labels):
    for p in policies:
        select, _, frm = p.partition("|")
        if select in dst_labels and select != "":
            return False                  # wrong: treats a matching policy as a deny rule
    return True`, 'Naive: policies as deny rules') },
      mcq: { q: 'Two policies select the same Pod. One allows traffic from <code>app=api</code>, the other from <code>app=batch</code>. What is the result?', options: ['Both api and batch are allowed: allows are added together', 'Only traffic matching both policies is allowed', 'The alphabetically first policy wins', 'The Pod is unreachable'], answer: 0, explain: 'NetworkPolicies are additive. The union of all allow rules from all selecting policies applies.' },
      hints: ['<p>Hint 1: first find which policies select the destination. If none do, the answer is simply true.</p>', '<p>Hint 2: a selector with several <code>k=v</code> pairs joined by <code>&amp;</code> matches only when every pair is in the Pod\'s labels. The empty selector matches everything.</p>', '<p>Hint 3: parse labels into a dict, write a helper <code>matches(selector, labels)</code>, then loop over the policies: remember that some policy selected the destination, and set allowed if any of its <code>from</code> items is <code>*</code> or matches the source.</p>'],
      solution: {
        approach: `<p>Think of three outcomes. A Pod nobody protects: open door. A Pod protected by policies: the door is locked, and each policy may hand out keys (the <code>from</code> list). If any selecting policy gives the source a key, it gets in. One helper (<code>matches</code>) does all selector work: an empty selector matches everyone; otherwise every pair must be present.</p>`,
        code: PY(`def _labels(s):
    out = {}
    for item in s.split(","):
        if "=" in item:
            k, v = item.strip().split("=", 1)
            out[k] = v
    return out

def _matches(selector, labels):
    if selector.strip() == "":
        return True                                  # empty selector = every Pod
    for pair in selector.split("&"):
        k, _, v = pair.partition("=")
        if labels.get(k) != v:
            return False
    return True

def traffic_allowed(policies, dst_labels, src_labels):
    dst, src = _labels(dst_labels), _labels(src_labels)
    selected, allowed = False, False
    for pol in policies:
        select, _, frm = pol.partition("|")
        if not _matches(select, dst):
            continue                                 # this policy does not protect the destination
        selected = True                              # the destination is now default-deny
        for client in [c for c in frm.split(",") if c]:
            if client == "*" or _matches(client, src):
                allowed = True
    return (not selected) or allowed`),
        dry: { head: ['policies', 'dst', 'src', 'selected?', 'allowed by a from?', 'result'], rows: [['|  and  app=db|app=api', 'app=db', 'app=api', 'yes (both)', 'yes: app=api', 'True'], ['same', 'app=db', 'app=web', 'yes', 'no', 'False'], ['same', 'app=web', 'app=api', 'yes (the "|" policy)', 'no', 'False'], ['app=db|app=api only', 'app=web', 'app=api', 'no', '-', 'True']] },
        complexity: `<p>O(P × F) for P policies with F client selectors each.</p>`,
        followUps: ['Where does this model lose detail? (ports, egress, namespaces, ipBlock, and named ports are all ignored)', 'How would you add egress? (the same check from the source side, and the packet needs both to allow)']
      },
      tests: { sig: 'string[] string string -> bool', fn: 'trafficAllowed', cases: [
        [[[], 'app=db', 'app=api'], true],
        [[['|'], 'app=db', 'app=api'], false],
        [[['|', 'app=db|app=api'], 'app=db', 'app=api'], true],
        [[['|', 'app=db|app=api'], 'app=db', 'app=web'], false],
        [[['|', 'app=db|app=api'], 'app=web', 'app=api'], false],
        [[['app=db|app=api'], 'app=web', 'app=api'], true],
        [[['app=db|app=api,app=batch'], 'app=db', 'app=batch'], true],
        [[['app=db|app=api&tier=1'], 'app=db', 'app=api,tier=1'], true],
        [[['app=db|app=api&tier=1'], 'app=db', 'app=api'], false],
        [[['app=db|*'], 'app=db', 'x=y'], true],
        [[['app=db&tier=data|app=api'], 'app=db,tier=data', 'app=api'], true],
        [[['app=db&tier=data|app=api'], 'app=db', 'app=web'], true],
        [[['app=db|'], 'app=db', 'app=api'], false],
        [[['app=db|app=api', 'app=db|app=web'], 'app=db', 'app=web'], true],
        [[['|*'], 'app=any', ''], true]
      ] }
    }],
    deepDive: `<p>🟣 <b>What the CNI does.</b> The policy controller watches NetworkPolicy objects and turns them into data-plane rules: iptables or nftables (Calico, kube-router), eBPF programs (Cilium, Calico eBPF mode), or the cloud's own firewall (VPC CNI network policy agent). Policy is evaluated against Pod <b>identity</b> (labels), not IPs, which is why it survives Pod churn. A new Pod may take a moment to receive its rules; very short-lived Jobs can race the policy.</p>
      <p>🟣 <b>Limits of the built-in API.</b> There is no deny rule, no cluster-wide policy, no domain names, no L7 (HTTP path) rules, and no logging. Calico (<code>GlobalNetworkPolicy</code>, ordered allow/deny) and Cilium (<code>CiliumNetworkPolicy</code> with FQDN and L7, <code>CiliumClusterwideNetworkPolicy</code>) extend it. Kubernetes also has newer admin-level APIs under development (AdminNetworkPolicy) for cluster admins; check their maturity in your version before depending on them.</p>
      <p>🟣 <b>Traffic that policy usually does not block.</b> Host-network Pods bypass Pod policies. Kubelet health probes come from the node and are normally allowed by the CNI. Traffic to the node's own IPs and to the cloud metadata service (169.254.169.254) needs separate controls: block the metadata IP with an egress policy or <code>ipBlock except</code>, since a compromised Pod that reaches it can steal node credentials.</p>
      <p>🟣 <b>Service mesh.</b> A mesh (Istio, Linkerd) adds mTLS and identity-based authorization at L7. It complements NetworkPolicy, it does not replace it: a policy blocks the packet before the sidecar sees it.</p>`,
    aiEra: `<p>🤖 A model can write a convincing set of NetworkPolicies in a minute, and the two most common errors are exactly the quiet ones: it forgets the DNS egress rule (so the app "randomly" times out) and it mis-indents <code>namespaceSelector</code> and <code>podSelector</code> so an AND becomes an OR. Both pass <code>kubectl apply</code>. The defence is tests, not trust: a pipeline step that starts a "should be blocked" client and a "should be allowed" client, and fails if either is wrong. Tools such as <code>cilium connectivity test</code>, <code>netpol</code> analysers and policy-visualisers help to check that what you meant is what you wrote. Also remember that AI-agent workloads often need <i>egress</i> to model APIs and tools: put them in a namespace with a tight egress allowlist, so a prompt-injected agent cannot send your data anywhere it likes.</p>`
  });

  // ───────────────────────── Topic 7: cluster upgrades, drain, deprecated APIs, debugging ─────────────────────────
  topics.push({
    title: 'Cluster Upgrades, Drain and Day-2 Troubleshooting',
    analogy: `<p>Upgrading a cluster is <b>renovating a hotel while guests stay in it</b>. You do the front desk and the building plans first (the control plane), then one floor at a time: put a "do not book" sign on the floor (<b>cordon</b>), politely move the guests to other floors (<b>drain</b>), repaint, and open the floor again (<b>uncordon</b>). A PodDisruptionBudget is the manager who says "never move so many guests that the hotel is under half full". And an old blueprint format (a deprecated API) is a plan the new building inspector no longer reads: it passed last year, now it is rejected.</p>`,
    explain: `<p>🟢 <b>The order of a Kubernetes upgrade.</b> Upgrade <b>one minor version at a time</b> (1.29 to 1.30, never 1.29 to 1.31). Within each step:</p>
      ${H.table(['Step', 'What', 'Why this order'], [
        ['1', 'Read the release notes and scan for <b>deprecated or removed APIs</b>', 'a removed API makes manifests, Helm charts and operators fail after the upgrade, not before'],
        ['2', 'Back up etcd (self-managed) or take the cloud snapshot; check PDBs, capacity, add-on compatibility', 'you need a way back and room to move Pods'],
        ['3', 'Upgrade the <b>control plane</b> (API server first)', 'kubelets may be older than the API server, never newer'],
        ['4', 'Upgrade cluster add-ons (CNI, CoreDNS, kube-proxy, metrics-server, ingress, CSI)', 'each has a supported Kubernetes range'],
        ['5', 'Upgrade <b>nodes</b>, a few at a time: cordon, drain, upgrade or replace, uncordon', 'workloads keep running on the nodes you have not touched'],
        ['6', 'Check, then update kubectl and your charts', 'kubectl may differ by one minor version from the API server']
      ])}
      <p>🟢 <b>Cordon and drain in one breath.</b> <code>kubectl cordon NODE</code> marks the node unschedulable: existing Pods stay, no new ones arrive. <code>kubectl drain NODE</code> does a cordon and then <b>evicts</b> every Pod politely. Eviction respects <code>terminationGracePeriodSeconds</code> and PodDisruptionBudgets. <code>kubectl uncordon NODE</code> opens the node again. DaemonSet Pods cannot be moved, so drain needs <code>--ignore-daemonsets</code>, and Pods with an <code>emptyDir</code> lose that data, so it also needs <code>--delete-emptydir-data</code> (read that as a warning, not a formality).</p>
      <p>🔵 <b>Version skew rules.</b> Since Kubernetes 1.28 a <code>kubelet</code> (version 1.25 or newer) may be up to <b>three minor versions older</b> than the API server (older kubelets: two), but never newer. <code>kubectl</code> may be one minor version older or newer. Control plane components with several replicas (an HA control plane) are upgraded one at a time. Managed services (EKS, GKE, AKS) do the control plane for you: you then upgrade node groups or pools, usually by creating new nodes and draining the old ones (a "surge" upgrade).</p>
      <p>🔵 <b>Real situation: the drain that hangs.</b> You run <code>kubectl drain node-2</code>. It prints <code>Cannot evict pod as it would violate the pod's disruption budget</code> every five seconds and never finishes. The PDB for <code>web</code> says <code>minAvailable: 2</code> and the Deployment has 2 replicas, so <b>allowed disruptions is 0</b> and no Pod may ever be evicted. The fix is not <code>--disable-eviction</code> (that bypasses the safety net). Raise replicas to 3 (now one may be evicted), or relax the PDB, then drain again. A single-replica Deployment with <code>minAvailable: 1</code> has the same problem: it can never be drained.</p>
      <p>🔵 <b>Real situation: a deprecated API breaks the upgrade.</b> A chart still uses <code>policy/v1beta1</code> for its PodDisruptionBudget (removed in 1.25) or <code>autoscaling/v2beta2</code> for the HPA (removed in 1.26). Before the upgrade the cluster accepted it. After, <code>helm upgrade</code> fails with <code>no matches for kind "PodDisruptionBudget" in version "policy/v1beta1"</code>, and even <code>helm rollback</code> may fail, because Helm reads the old release manifest with the removed API. Prevent it: scan before the upgrade with <code>pluto</code> or <code>kubent</code> against live objects and Helm releases, check the API server metric <code>apiserver_requested_deprecated_apis</code>, update templates to the stable version (<code>policy/v1</code>, <code>autoscaling/v2</code>), and for releases already stored with a removed API use the <code>helm mapkubeapis</code> plugin.</p>
      <p>🔵 <b>kubectl debug.</b> Distroless images have no shell, so <code>kubectl exec</code> cannot help. <code>kubectl debug -it POD --image=busybox:1.36 --target=app</code> adds an <b>ephemeral container</b> that shares the process namespace of the target. <code>kubectl debug POD --copy-to=POD-debug --container=app -- sh</code> makes a copy of the Pod with a changed command or image, leaving the original alone. <code>kubectl debug node/NODE -it --image=busybox:1.36</code> starts a Pod on the node with the node filesystem under <code>/host</code>. Ephemeral containers cannot be removed or restarted; delete the Pod when done.</p>
      <p>🔵 <b>A five-question triage.</b> (1) <code>kubectl get events -A --sort-by=.lastTimestamp</code>: what just happened? (2) Is the Pod scheduled, and if not, why (<code>describe pod</code>: taints, requests, volume affinity)? (3) Does the Service have endpoints? (4) Is it RBAC (<code>auth can-i</code>) or NetworkPolicy (is a policy selecting this Pod)? (5) What changed: <code>helm history</code>, <code>kubectl rollout history</code>, the Git log?</p>`,
    clues: [
      '"Upgrade the cluster with no downtime" → control plane first, one minor at a time, then nodes in small batches with cordon + drain + PDBs',
      '"kubectl drain never finishes / 429 Cannot evict" → a PodDisruptionBudget with 0 allowed disruptions; add replicas or relax the budget',
      '"no matches for kind X in version Y" after an upgrade → a removed API version; update the manifest or chart, scan with pluto/kubent',
      '"The image has no shell" / "debug a running Pod without restarting it" → <code>kubectl debug</code> with an ephemeral container',
      '"Pods stuck Terminating on a node" → check finalizers, the kubelet, and the volume detach; use <code>--force</code> only when you know the node is gone'
    ],
    code: [SH(R`# --- Pre-flight, before touching anything ---
kubectl version                                              # client and server versions (skew check)
kubectl get nodes -o wide                                    # kubelet versions per node
kubectl get --raw /metrics | grep apiserver_requested_deprecated_apis   # deprecated APIs still being called
pluto detect-helm -o wide                                    # deprecated or removed APIs inside Helm releases
kubectl get pdb -A                                           # any budget with ALLOWED DISRUPTIONS = 0 will block a drain

# --- One node at a time ---
kubectl cordon node-2
kubectl drain node-2 --ignore-daemonsets --delete-emptydir-data --timeout=300s
# ... upgrade or replace the node (cloud console, kubeadm, node pool) ...
kubectl uncordon node-2
kubectl get nodes                                            # Ready and the new VERSION`, 'cordon, drain, uncordon'),
      SH(R`# Add a debugging shell to a running Pod that has no shell of its own
kubectl debug -it pod/web-6d5f7c9b8-x2k4p -n shop --image=busybox:1.36 --target=app
# inside the ephemeral container: ps, wget -qO- localhost:8080/healthz, cat /proc/1/root/etc/hostname

# Copy the Pod and change its command, leaving the original untouched
kubectl debug pod/web-6d5f7c9b8-x2k4p -n shop --copy-to=web-debug --container=app -it -- sh
kubectl delete pod web-debug -n shop

# A shell on the node itself (node filesystem is under /host)
kubectl debug node/node-2 -it --image=busybox:1.36
chroot /host`, 'kubectl debug'),
      SH(R`# Which Helm releases still use an API that the next version removes?
helm plugin install https://github.com/helm/helm-mapkubeapis       # fixes release metadata that stores removed APIs
helm mapkubeapis web -n shop --dry-run                              # preview first
helm mapkubeapis web -n shop
# Convert a manifest to the current API version, then diff against what is live
kubectl convert -f old-hpa.yaml --output-version autoscaling/v2 > new-hpa.yaml   # needs the kubectl-convert plugin`, 'deprecated APIs')],
    codeTitle: ['cordon, drain, uncordon', 'kubectl debug', 'deprecated APIs'],
    viz: [{
      title: 'Drain a node when a PDB protects the app',
      input: 'replicas=3 onNode=2 minAvailable=2 reschedule=yes',
      inputLabel: 'replicas=N onNode=pods on the draining node, minAvailable=M, reschedule=yes|no (can replacement Pods start elsewhere?)',
      gen: function (input) {
        var o = kvInput(input), R = num(o.replicas, 3), d = num(o.onNode, 2), m = num(o.minAvailable, 2), resched = String(o.reschedule || 'yes').toLowerCase() !== 'no';
        if (R < 1 || R > 8 || d < 0 || d > R || m < 0 || m > R) throw new Error('Use replicas=1..8, onNode<=replicas, minAvailable<=replicas');
        var healthy = R, left = d, f = [], tries = 0;
        function state(label) { return { type: 'vars', label: label, vals: { 'healthy Pods': healthy, 'still on the node': left, 'minAvailable': m, 'allowed disruptions': Math.max(0, healthy - m) }, hl: { 'allowed disruptions': healthy - m > 0 ? 'ok' : 'bad' } }; }
        f.push({ narr: 'The Deployment has <b>' + R + '</b> replicas, <b>' + d + '</b> of them on the node being drained, and a PDB with <code>minAvailable: ' + m + '</code>. Allowed disruptions = healthy − minAvailable = ' + (R - m) + '. <code>kubectl drain</code> will try to evict the ' + d + ' Pods one by one.', parts: [state('before the drain')] });
        while (left > 0 && tries < 8) {
          tries++;
          var allowed = healthy - m;
          if (allowed <= 0) {
            f.push({ narr: 'Eviction request refused with <b>429</b> "would violate the pod\'s disruption budget": allowed disruptions is 0. <code>kubectl drain</code> waits and retries every few seconds. ' + (resched ? 'Nothing will change by itself.' : 'The replacement Pod cannot start elsewhere, so health never recovers: the drain hangs for good.') + ' Fix: add replicas or relax the budget; do not bypass the eviction API.', parts: [state('blocked')] });
            return pad4(f, 'Blocked.');
          }
          healthy--; left--;
          f.push({ narr: 'Eviction accepted (allowed was ' + allowed + '). One Pod terminates: healthy is now <b>' + healthy + '</b>. The Deployment controller creates a replacement ' + (resched ? 'on another node.' : 'but no node can run it (Pending).') + '', parts: [state('after eviction ' + tries)] });
          if (resched) { healthy++; f.push({ narr: 'The replacement becomes <b>Ready</b> on another node. Healthy is back to <b>' + healthy + '</b>, so the next eviction is allowed.', parts: [state('replacement Ready')] }); }
        }
        f.push({ narr: left === 0 ? 'Drain finished: no application Pods are left on the node and the PDB was never violated. Upgrade the node, then <code>kubectl uncordon</code>.' : 'Stopped after 8 attempts.', parts: [state('result')] });
        return pad4(f, 'Done.');
      }
    }],
    examples: [
      { title: 'A safe node-pool upgrade, one node at a time', html: `<p>The loop below is what managed-cluster tools do for you. Doing it by hand once in a lab teaches you what can go wrong. Wait for the node to be Ready and the Pods to be Running before starting the next one.</p>`, code: SH(R`for n in $(kubectl get nodes -l pool=general -o name); do
  kubectl cordon "$n"
  kubectl drain "$n" --ignore-daemonsets --delete-emptydir-data --timeout=300s || { echo "drain blocked on $n"; break; }
  echo "upgrade or replace $n now, then press enter"; read -r _
  kubectl uncordon "$n"
  kubectl wait --for=condition=Ready "$n" --timeout=300s
  kubectl get pods -A --field-selector=status.phase!=Running,status.phase!=Succeeded
done`) },
      { title: 'Unblock a drain without bypassing the budget', html: `<p>Read the PDB, count replicas, then change one number. The first option keeps the protection; the second weakens it on purpose and should be reverted after maintenance.</p>`, code: SH(R`kubectl get pdb -A                                    # ALLOWED DISRUPTIONS 0 is the blocker
kubectl describe pdb web -n prod                      # shows current healthy, desired healthy, expected pods
kubectl scale deploy/web -n prod --replicas=3         # option 1: now one Pod may move at a time
kubectl rollout status deploy/web -n prod
kubectl patch pdb web -n prod --type=merge -p '{"spec":{"minAvailable":1}}'   # option 2: temporary, record it
kubectl drain node-2 --ignore-daemonsets --delete-emptydir-data --timeout=300s`) },
      { title: 'Fix a manifest that uses a removed API', html: `<p>Both objects below existed for years in the old form. The stable versions use the same fields here; always compare with the release notes, as some removals change field names. For the HPA, <code>autoscaling/v2</code> is the version with <code>metrics</code> and <code>behavior</code>.</p>`, code: Y(`# Removed: policy/v1beta1 PodDisruptionBudget (gone in 1.25)  ->  use policy/v1
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: web
spec:
  minAvailable: 2
  selector:
    matchLabels: { app: web }
---
# Removed: autoscaling/v2beta2 HorizontalPodAutoscaler (gone in 1.26)  ->  use autoscaling/v2
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: web
spec:
  scaleTargetRef: { apiVersion: apps/v1, kind: Deployment, name: web }
  minReplicas: 3
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target: { type: Utilization, averageUtilization: 65 }`, 'current API versions') }
    ],
    problems: [{
      title: 'How many Pods can a drain evict right now?',
      level: 'Medium', tags: ['pdb', 'drain', 'upgrade'], companies: ['Red Hat', 'Datadog', 'Intuit'],
      statement: `<p>Write <code>pdb_allowed(replicas, healthy, min_available, max_unavailable)</code>, the number of voluntary disruptions a PodDisruptionBudget allows right now. Exactly one of <code>min_available</code> and <code>max_unavailable</code> is set; the unset one is <code>-1</code>. With <code>min_available</code>: the app needs that many healthy Pods, so allowed = <code>healthy - min_available</code>. With <code>max_unavailable</code>: the app needs <code>replicas - max_unavailable</code> healthy Pods, so allowed = <code>healthy - (replicas - max_unavailable)</code>. The result is never negative. Use integers only.</p>`,
      constraints: PYC,
      example: `<p>3 replicas, all healthy, <code>minAvailable: 2</code> → ${H.c('g', '1')} eviction allowed. After one Pod is evicted and its replacement is not Ready yet: healthy 2 → ${H.c('r', '0')}. 5 replicas, 4 healthy, <code>maxUnavailable: 1</code>: needed healthy = 4, allowed = 4 − 4 = ${H.c('r', '0')}: one Pod is already down, so the budget is spent.</p>`,
      brute: { why: `<p>Using the replica count instead of the healthy count ignores Pods that are already down. The PDB counts a Pod that is Pending or crash-looping as already disrupted, so the budget is smaller than it looks. Forgetting to clamp at zero returns negative numbers when the app is already below its minimum.</p>`, code: PY(`def pdb_allowed(replicas, healthy, min_available, max_unavailable):
    if min_available >= 0:
        return replicas - min_available       # wrong: ignores unhealthy Pods, can be negative`, 'Naive: uses replicas, not healthy') },
      mcq: { q: 'A Deployment has 1 replica and a PDB with <code>minAvailable: 1</code>. What happens on <code>kubectl drain</code> of its node?', options: ['The drain blocks forever: allowed disruptions is 0', 'The Pod is evicted and recreated with a short outage', 'The PDB is ignored for single-replica Deployments', 'Kubernetes adds a second replica automatically'], answer: 0, explain: 'allowed = healthy (1) - minAvailable (1) = 0. Use two replicas, or maxUnavailable: 1 if a short outage is acceptable.' },
      hints: ['<p>Hint 1: a PDB is a promise about how many Pods must stay healthy. Convert both forms to "how many healthy Pods are required".</p>', '<p>Hint 2: with <code>maxUnavailable</code>, required = replicas - maxUnavailable.</p>', '<p>Hint 3: allowed = healthy - required, clamped at 0. Only the healthy count changes while Pods fail, so pass it in rather than computing from replicas.</p>'],
      solution: {
        approach: `<p>Both budgets say the same thing from two sides: "at least this many Pods must be healthy". Work out that floor, subtract it from the number of healthy Pods you have now, and you know how many you can take away. If you are already at or below the floor, the answer is zero, never negative.</p>`,
        code: PY(`def pdb_allowed(replicas, healthy, min_available, max_unavailable):
    """Voluntary disruptions a PodDisruptionBudget allows right now."""
    if min_available >= 0:
        required = min_available                 # floor given directly
    else:
        required = replicas - max_unavailable    # floor derived from how many may be down
    return max(0, healthy - required)            # already below the floor -> 0, never negative`),
        dry: { head: ['replicas', 'healthy', 'minAvail', 'maxUnavail', 'required healthy', 'allowed'], rows: [['3', '3', '2', '-', '2', '1'], ['3', '2', '2', '-', '2', '0'], ['5', '4', '-', '1', '4', '0'], ['5', '5', '-', '2', '3', '2'], ['4', '1', '2', '-', '2', '0 (clamped)']] },
        complexity: `<p>O(1) time and space: a few integer operations.</p>`,
        followUps: ['Two PDBs select the same Pod. What happens? (eviction is refused; a Pod should match one PDB)', 'What does unhealthyPodEvictionPolicy: AlwaysAllow change? (Pods that are not Ready may be evicted even when the budget is spent)']
      },
      tests: { sig: 'int int int int -> int', fn: 'pdbAllowed', cases: [
        [[3, 3, 2, -1], 1], [[3, 2, 2, -1], 0], [[3, 3, 3, -1], 0], [[5, 5, -1, 1], 1], [[5, 4, -1, 1], 0], [[5, 5, -1, 2], 2],
        [[5, 3, -1, 2], 0], [[4, 4, 1, -1], 3], [[4, 1, 2, -1], 0], [[1, 1, 1, -1], 0], [[1, 1, -1, 1], 1], [[10, 10, -1, 0], 0],
        [[10, 8, -1, 3], 1], [[6, 6, 0, -1], 6]
      ] }
    }],
    deepDive: `<p>🟣 <b>What drain really does.</b> Drain cordons, then for every Pod it calls the <b>Eviction API</b> (<code>POST /api/v1/namespaces/NS/pods/NAME/eviction</code>). The API server checks the PDB and answers 201 or 429. Pods without a controller (bare Pods) are not recreated, so drain refuses them unless you pass <code>--force</code>. The field <code>unhealthyPodEvictionPolicy: AlwaysAllow</code> (beta since 1.27, stable in 1.31) lets Pods that are not Ready be evicted even when the budget is spent, so a crash-looping Pod cannot hold a drain hostage. Cluster autoscaler and Karpenter use the same eviction path when they remove nodes, so a PDB that blocks your drain also blocks scale-down and costs money.</p>
      <p>🟣 <b>Rolling the nodes without surprises.</b> Prefer <b>replacing</b> nodes (new image, new version) over upgrading in place: immutable nodes are easier to reason about and to roll back. Upgrade in small batches (for example 10-25% of a pool), and wait for Pods to be Ready, not just for the node. Keep spare capacity of at least the size of one batch, otherwise drained Pods stay Pending. Spread replicas with <code>topologySpreadConstraints</code> so one drained node cannot hold all copies. For StatefulSets with zonal volumes, drain nodes of the same zone only if the other nodes in that zone have room, since a volume cannot follow a Pod to another zone.</p>
      <p>🟣 <b>Deprecation policy.</b> A beta API is announced as deprecated, then kept for at least three releases (or nine months) before removal; a stable (v1) API is not removed within a major version. The cluster converts stored objects, so <b>objects already in etcd survive</b> a removal in the sense that you can still read them in the new version, but any client (a Helm release, an operator, a CI script) that sends the removed version gets an error. Helm 3 stores the whole rendered manifest in a release Secret; if that manifest names a removed API, even <code>helm upgrade</code> and <code>helm rollback</code> may fail until you repair the release metadata.</p>
      <p>🟣 <b>Stuck Terminating.</b> A Pod stays Terminating when a finalizer never completes, the kubelet is not answering (node down), or a volume cannot detach. Look at <code>metadata.finalizers</code> and the node state first. <code>kubectl delete pod --force --grace-period=0</code> only removes the API object; if the node is merely unreachable, the container may still be running and a StatefulSet could start a second copy with the same identity. Use it only when you are sure the node is gone.</p>`,
    aiEra: `<p>🤖 Upgrades are a good place for AI help and a bad place for blind trust. An assistant is good at reading release notes and listing removed APIs, at turning a <code>pluto</code> report into a checklist, and at explaining a wall of <code>describe</code> output. It is not good at knowing <i>your</i> cluster: which PDBs exist, which add-ons you pinned, how much spare capacity you have. It may also suggest <code>--disable-eviction</code> or <code>--force</code> to make a stuck drain finish, which is exactly how outages happen. Use it to prepare the plan and the rollback, run every command yourself in a staging cluster first, and keep the human decision on anything that deletes or bypasses a safety net. Agents that run <code>kubectl debug node/...</code> get root on a node: give them that power only with an audit trail and a short-lived credential.</p>`
  });

  // ───────────────────────── Practice (12 problems) ─────────────────────────
  practice.push(P({
    t: 'Roll back a bad Helm upgrade', l: 'Easy', tags: ['helm', 'rollback', 'incident'], co: ['Atlassian', 'Spotify'],
    s: `<p>At 14:05 a pipeline ran <code>helm upgrade web ./chart -n shop --set image.tag=2.4.0</code>. The Pods now crash with a missing environment variable and the error rate is 40%. Using only Helm and kubectl, find the last good revision, go back to it, confirm the rollout, and show what changed in the release.</p>`,
    ex: `<p><code>helm history web -n shop</code> shows revision 7 (deployed, tag 2.3.1) and revision 8 (deployed, tag 2.4.0). <code>helm rollback web 7 -n shop --wait</code> creates revision ${H.c('g', '9')}, a copy of revision 7. History is not rewound: it grows.</p>`,
    bw: `<p>Re-running the old pipeline takes ten minutes and rebuilds things that were fine. Editing Deployments by hand with <code>kubectl edit</code> leaves the Helm release record out of sync with the cluster, so the next upgrade silently undoes or conflicts with your edit.</p>`,
    q: ['After <code>helm rollback web 7</code>, what is the highest revision number?', ['9: rollback creates a new revision', '7: the history is rewound', '8: revision 8 is overwritten', 'It depends on --cleanup-on-fail'], 0, 'A rollback is recorded as a new revision that copies the old one. Nothing is deleted.'],
    h: ['<p>Hint 1: Helm keeps one record per revision. List them.</p>', '<p>Hint 2: <code>helm rollback RELEASE REVISION</code>, with <code>--wait</code> so the command returns only when Pods are Ready.</p>', '<p>Hint 3: afterwards compare values with <code>helm get values web --revision 8</code> and <code>helm diff revision web 7 8</code> (diff plugin) to write the postmortem.</p>'],
    a: `<p>Look up the history, pick the last revision whose status is <code>superseded</code> or <code>deployed</code> with the good image, roll back and wait. Because rollback re-applies the old manifest, it fixes the image and any config that changed in the same upgrade. It does <b>not</b> undo database migrations or hook side effects, so check them separately.</p>`,
    code: R`helm history web -n shop
helm rollback web 7 -n shop --wait --timeout 5m
kubectl rollout status deploy/web -n shop
helm get values web -n shop --revision 8      # what the bad upgrade set
helm diff revision web 7 8 -n shop            # needs the helm-diff plugin`,
    cx: `<p>Seconds to minutes; cost is the Pods restarting.</p>`, f: ['How would CI roll back by itself? (helm upgrade --atomic, or --rollback-on-failure in newer Helm)', 'Which parts of an upgrade does a rollback not undo? (data migrations, hooks, CRDs, external systems)']
  }));
  practice.push(P({
    t: 'Rolling update limits from percentages', l: 'Easy', tags: ['rolling-update', 'maxSurge', 'maxUnavailable'], co: ['Google', 'Zalando'],
    s: `<p>Write <code>rolling_limits(replicas, surge_pct, unavail_pct)</code> returning <code>[max_total_pods, min_available_pods]</code> during a rolling update. <code>maxSurge</code> as a percentage rounds <b>up</b>; <code>maxUnavailable</code> as a percentage rounds <b>down</b>. Maximum total = replicas + surge; minimum available = replicas - unavailable. If both values come out as 0 the API rejects the strategy: return <code>[-1, -1]</code>. Use integer maths.</p>`,
    c: PYC,
    ex: `<p>10 replicas, 25% and 25%: surge = ceil(2.5) = 3, unavailable = floor(2.5) = 2 → ${H.c('g', '[13, 8]')}. 3 replicas, 25% and 25%: surge 1, unavailable 0 → ${H.c('g', '[4, 3]')}. 10 replicas, 0% and 0% → ${H.c('r', '[-1, -1]')}.</p>`,
    bw: `<p>Using floating point <code>round()</code> rounds half to even in Python and applies the same rule to both numbers. Kubernetes rounds surge up and unavailable down on purpose: the rollout is allowed to be a little faster on extra Pods and a little more careful about missing ones.</p>`,
    bc: R`def rolling_limits(replicas, surge_pct, unavail_pct):
    surge = round(replicas * surge_pct / 100)      # wrong rounding for both
    unav = round(replicas * unavail_pct / 100)
    return [replicas + surge, replicas - unav]`, bcl: 'python',
    q: ['4 replicas, default strategy (25% / 25%). How many Pods may exist at once and how many must be available?', ['5 and 3', '4 and 4', '6 and 2', '5 and 4'], 0, 'surge = ceil(1) = 1, unavailable = floor(1) = 1, so at most 5 Pods and at least 3 available.'],
    h: ['<p>Hint 1: two separate numbers, two rounding rules.</p>', '<p>Hint 2: ceil without floats: <code>-(-a // b)</code>; floor: <code>a // b</code>.</p>', '<p>Hint 3: check the both-zero case before computing the final answer.</p>'],
    a: `<p>Convert each percentage into a Pod count with its own rounding rule, reject the impossible combination (the rollout could never make progress), then add the surge to the replicas and subtract the unavailable from them.</p>`,
    code: PY(R`def rolling_limits(replicas, surge_pct, unavail_pct):
    surge = -(-replicas * surge_pct // 100)       # ceil: extra Pods may be a little more
    unavail = replicas * unavail_pct // 100       # floor: missing Pods a little fewer
    if surge == 0 and unavail == 0:
        return [-1, -1]                            # no room to move: the API rejects this
    return [replicas + surge, replicas - unavail]`),
    cx: `<p>O(1) time and space: a few integer operations.</p>`, f: ['Why is maxUnavailable: 0 with maxSurge: 1 a common production choice? (capacity never drops; it needs room for one extra Pod)', 'What does minReadySeconds add? (a new Pod must stay Ready that long before it counts as available)'],
    tests: { sig: 'int int int -> int[]', fn: 'rollingLimits', cases: [
      [[4, 25, 25], [5, 3]], [[10, 25, 25], [13, 8]], [[3, 25, 25], [4, 3]], [[1, 25, 25], [2, 1]], [[10, 0, 0], [-1, -1]], [[10, 0, 10], [10, 9]],
      [[10, 100, 0], [20, 10]], [[7, 10, 10], [8, 7]], [[20, 50, 50], [30, 10]], [[100, 1, 1], [101, 99]], [[8, 30, 30], [11, 6]]
    ] }
  }));
  practice.push(P({
    t: 'Fix a Forbidden error with the smallest Role', l: 'Easy', tags: ['rbac', 'least-privilege', 'incident'], co: ['Okta', 'Stripe'],
    s: `<p>A Pod in namespace <code>shop</code> runs as ServiceAccount <code>reports</code> and logs <code>pods is forbidden: User "system:serviceaccount:shop:reports" cannot list resource "pods" in API group "" in the namespace "shop"</code>. A colleague suggests binding <code>cluster-admin</code>. Give the least-privilege fix and prove it with <code>kubectl auth can-i</code>, including one thing that must still be denied.</p>`,
    ex: `<p>Create a Role with <code>get,list,watch</code> on <code>pods</code> in <code>shop</code> and a RoleBinding to the ServiceAccount. <code>can-i list pods</code> → ${H.c('g', 'yes')}; <code>can-i delete pods</code> and <code>can-i list secrets</code> → ${H.c('r', 'no')}.</p>`,
    bw: `<p><code>cluster-admin</code> removes the error, and also lets that Pod read every Secret and delete anything in the cluster. If the application is compromised, so is the cluster.</p>`,
    bc: R`kubectl create clusterrolebinding reports-admin --clusterrole=cluster-admin \
  --serviceaccount=shop:reports`,
    q: ['Which verbs does the error message tell you the Pod needs?', ['Only list on pods in shop', 'All verbs on all resources', 'get on nodes', 'It cannot be determined'], 0, 'The message names the verb (list), the resource (pods), the API group and the namespace. Grant exactly that, and add get/watch only if the code needs them.'],
    h: ['<p>Hint 1: read the message: user, verb, resource, namespace.</p>', '<p>Hint 2: Role + RoleBinding in the same namespace; subject kind ServiceAccount with its namespace.</p>', '<p>Hint 3: test with <code>--as=system:serviceaccount:shop:reports</code>, one allowed and one denied action.</p>'],
    a: `<p>The error is a precise request. Create a Role with only that verb and resource in that namespace, bind it to the ServiceAccount, and test both sides: the permission works and the neighbours (delete, secrets, another namespace) are still denied. Running the denied checks is what makes this a least-privilege fix instead of a guess.</p>`,
    code: Y(`apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata: { name: pod-lister, namespace: shop }
rules:
  - apiGroups: [""]
    resources: ["pods"]
    verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata: { name: reports-pod-lister, namespace: shop }
subjects:
  - { kind: ServiceAccount, name: reports, namespace: shop }
roleRef: { apiGroup: rbac.authorization.k8s.io, kind: Role, name: pod-lister }
# Prove it:
#   kubectl auth can-i list pods   -n shop --as=system:serviceaccount:shop:reports   -> yes
#   kubectl auth can-i delete pods -n shop --as=system:serviceaccount:shop:reports   -> no
#   kubectl auth can-i list pods   -n other --as=system:serviceaccount:shop:reports  -> no`, 'role.yaml'),
    cx: `<p>One Role and one binding.</p>`, f: ['Why would a ClusterRole + RoleBinding also work? (the binding limits it to one namespace)', 'How do you stop the Pod from holding a token it does not need? (automountServiceAccountToken: false)']
  }));
  practice.push(P({
    t: 'HPA shows unknown and never scales', l: 'Medium', tags: ['hpa', 'metrics-server', 'incident'], co: ['Uber', 'Shopify'],
    s: `<p>On your kind cluster <code>kubectl get hpa web</code> shows <code>cpu: &lt;unknown&gt;/60%</code>, <code>kubectl top pods</code> says <code>Metrics API not available</code>, and under load the replicas stay at 2. Find all causes in order and fix them. Write the autoscaling/v2 HPA with a slow scale-down.</p>`,
    ex: `<p>Typical findings: ${H.c('r', 'metrics-server not installed')} (or failing TLS to kubelets on kind), then ${H.c('r', 'the Deployment has no CPU request')} so a percentage cannot be computed. After both fixes <code>describe hpa</code> shows <code>ScalingActive True</code> and a real percentage.</p>`,
    bw: `<p>Raising <code>maxReplicas</code> or lowering the target changes nothing while the metric is unknown: the HPA has no number to compare. Guessing at the HPA spec wastes time when the problem is the metrics pipeline.</p>`,
    q: ['The HPA target is 60% CPU utilization. Pods have no CPU request. What happens?', ['The HPA cannot compute utilization and reports an error condition', 'It uses the node CPU instead', 'It uses the limit instead', 'It scales to maxReplicas'], 0, 'Utilization is a percentage of the request. Without a request, the condition FailedGetResourceMetric appears and nothing scales.'],
    h: ['<p>Hint 1: ask the Metrics API directly: <code>kubectl top pods</code>.</p>', '<p>Hint 2: <code>kubectl describe hpa web</code> shows the conditions and events with the reason.</p>', '<p>Hint 3: check requests: <code>kubectl get deploy web -o jsonpath=...</code>; on kind add <code>--kubelet-insecure-tls</code> to metrics-server (lab only).</p>'],
    a: `<p>Work from the bottom of the pipeline up. (1) Is the Metrics API served (<code>kubectl get apiservice v1beta1.metrics.k8s.io</code>)? (2) Does <code>top</code> return numbers? (3) Do the containers have CPU requests? (4) Only then tune the HPA. The v2 spec below scales on CPU and slows scale-down so a traffic dip does not remove Pods.</p>`,
    code: Y(`apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata: { name: web, namespace: shop }
spec:
  scaleTargetRef: { apiVersion: apps/v1, kind: Deployment, name: web }
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target: { type: Utilization, averageUtilization: 60 }
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - { type: Pods, value: 1, periodSeconds: 60 }
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
        - { type: Percent, value: 100, periodSeconds: 30 }
# Diagnosis, in order:
#   kubectl get apiservice v1beta1.metrics.k8s.io       (Available must be True)
#   kubectl top pods -n shop
#   kubectl describe hpa web -n shop                    (read Conditions and Events)
#   Deployment containers need: resources.requests.cpu`, 'hpa.yaml'),
    cx: `<p>Diagnosis is a handful of commands.</p>`, f: ['What if the app is queue-driven? (an external metric via KEDA)', 'Why keep minReplicas at 2 or more in production? (availability during a node drain, and PDB allowed disruptions)']
  }));
  practice.push(P({
    t: 'Passwords and Helm: keep them out of values files', l: 'Medium', tags: ['helm', 'secrets', 'sops'], co: ['HashiCorp', 'GitLab'],
    s: `<p>A chart needs a database password. A teammate commits <code>values-prod.yaml</code> with <code>db.password: hunter2</code>. Show three safer ways at an introductory level: <code>--set</code> from an environment variable, an encrypted values file with helm-secrets and SOPS, and a reference to a secret synced by the External Secrets Operator. State one weakness of the <code>--set</code> approach.</p>`,
    ex: `<p>The chart never contains the value: it contains a <b>name</b> (<code>existingSecret: db-credentials</code>) or an encrypted blob. In CI, ${H.c('g', 'the secret comes from the CI secret store')} and lives only in the pipeline process and in a Kubernetes Secret.</p>`,
    bw: `<p>A password in <code>values.yaml</code> is in Git history forever, in every clone, in the CI logs of <code>--debug</code> runs, and in Helm's release Secret. Deleting the file in a later commit does not remove it: rotate the password.</p>`,
    q: ['Which approach lets the chart contain no secret value at all?', ['The Deployment reads an existing Secret by name (created by ESO or by hand)', 'Base64-encoding the password in values.yaml', 'A private Git repository', 'Putting it in a ConfigMap'], 0, 'Base64 is not encryption and a private repo is still a copy. Referencing a Secret by name keeps the value out of the chart and out of the release record.'],
    h: ['<p>Hint 1: three places a secret can come from: your shell, an encrypted file, a secret manager.</p>', '<p>Hint 2: <code>--set-string db.password="$DB_PASSWORD"</code>; <code>helm secrets upgrade -f secrets.enc.yaml</code>; an ExternalSecret that creates the Secret.</p>', '<p>Hint 3: weaknesses: <code>--set</code> values are stored in the release Secret and may show in process lists; prefer the reference to a Secret.</p>'],
    a: `<p>Best: the chart expects a Secret <i>name</i> and the Secret is produced elsewhere (External Secrets Operator pulling from a cloud secret manager, with rotation). Second: SOPS encrypts the values file with a KMS or age key, so the encrypted file may live in Git; <code>helm secrets</code> decrypts in memory during the command. Quick option: <code>--set-string</code> from a CI environment variable. Its weakness is that Helm stores the computed values (including the secret) in the release Secret, readable by anyone who can read Secrets in that namespace.</p>`,
    code: R`# 1. From an environment variable (value comes from the CI secret store, never from Git)
helm upgrade --install web ./chart -n shop --set-string db.password="$DB_PASSWORD"

# 2. Encrypted values file with helm-secrets and SOPS (the file is safe to commit)
sops --encrypt --age "$AGE_PUBLIC_KEY" secrets.yaml > secrets.enc.yaml
helm secrets upgrade --install web ./chart -n shop -f values.yaml -f secrets.enc.yaml

# 3. No value in the chart: reference a Secret that External Secrets Operator syncs
helm upgrade --install web ./chart -n shop --set db.existingSecret=db-credentials
kubectl get externalsecret,secret db-credentials -n shop`,
    cx: `<p>Setup effort grows with the option; so does safety.</p>`, f: ['How do you rotate the password with each option? (re-run with a new value; update the store and let ESO refresh; re-encrypt)', 'Why also enable encryption at rest for Secrets in etcd? (a Secret is only base64 by default)']
  }));
  practice.push(P({
    t: 'A drain that never finishes', l: 'Medium', tags: ['pdb', 'drain', 'incident'], co: ['Datadog', 'Red Hat'],
    s: `<p>During a node upgrade <code>kubectl drain node-2 --ignore-daemonsets --delete-emptydir-data</code> keeps printing <code>Cannot evict pod as it would violate the pod's disruption budget</code> for <code>web-6d5f7c9b8-x2k4p</code>. <code>kubectl get pdb -n prod</code> shows <code>MIN AVAILABLE 2</code> and <code>ALLOWED DISRUPTIONS 0</code>, and <code>kubectl get deploy web -n prod</code> shows 2/2 ready. Explain why, give two safe fixes, and say what you must not do.</p>`,
    ex: `<p>2 replicas, <code>minAvailable: 2</code> → allowed = 2 − 2 = ${H.c('r', '0')}. With 3 replicas and the same PDB → ${H.c('g', '1')}, and the drain can move one Pod at a time.</p>`,
    bw: `<p><code>--disable-eviction</code> or deleting the Pod directly ignores the budget. For a moment the app has fewer healthy Pods than you promised, which is exactly the outage the PDB exists to prevent.</p>`,
    q: ['Which change unblocks the drain and keeps protection?', ['Scale to 3 replicas so one Pod may be evicted', 'Add --force to the drain', 'Delete the PDB permanently', 'Delete the Pod with kubectl delete'], 0, 'With 3 replicas and minAvailable 2, one eviction is allowed. The replacement becomes Ready on another node, then the next one can move.'],
    h: ['<p>Hint 1: allowed disruptions = healthy Pods − minAvailable.</p>', '<p>Hint 2: two levers: more healthy Pods, or a lower floor for the maintenance window.</p>', '<p>Hint 3: check capacity first: a third replica must fit on another node.</p>'],
    a: `<p>The PDB demands 2 healthy Pods and only 2 exist, so no Pod may be taken. Add a replica (best: it also removes a single point of failure), or temporarily set <code>minAvailable: 1</code> and revert after the maintenance. Then retry the drain. Do not use options that skip the Eviction API.</p>`,
    code: R`kubectl get pdb -n prod
kubectl describe pdb web -n prod
kubectl scale deploy/web -n prod --replicas=3
kubectl rollout status deploy/web -n prod
kubectl drain node-2 --ignore-daemonsets --delete-emptydir-data --timeout=300s
kubectl uncordon node-2`,
    cx: `<p>One scale operation, then the normal drain.</p>`, f: ['What if the Pods are Pending because of no capacity? (add a node first)', 'What does unhealthyPodEvictionPolicy: AlwaysAllow help with? (crash-looping Pods that are not Ready)']
  }));
  practice.push(P({
    t: 'The NetworkPolicy that does nothing', l: 'Medium', tags: ['networkpolicy', 'cni', 'incident'], co: ['Cisco', 'VMware'],
    s: `<p>You apply a default-deny ingress policy to namespace <code>shop</code> on a fresh kind cluster. A test Pod in another namespace can still <code>wget</code> the <code>db</code> Service. <code>kubectl get networkpolicy -n shop</code> shows the policy. Find the cause, fix the cluster, and write the test that proves enforcement.</p>`,
    ex: `<p>The policy is only a stored object. kind's default network plugin (in older releases at least) does not enforce it, so traffic flows. After recreating the cluster with <code>disableDefaultCNI: true</code> and installing Calico or Cilium, the same <code>wget</code> ${H.c('r', 'times out')}.</p>`,
    bw: `<p>Rewriting the policy YAML again and again does not help: the YAML is valid, nothing reads it. The first question for "a policy has no effect" is whether an enforcing CNI is running.</p>`,
    q: ['Which is the most likely cause?', ['The CNI plugin does not implement NetworkPolicy', 'The policy needs a restart of the Pods', 'NetworkPolicies only work in kube-system', 'The Service is ClusterIP'], 0, 'The API accepts the object regardless; enforcement is done by the network plugin.'],
    h: ['<p>Hint 1: is anything enforcing? List the pods in kube-system.</p>', '<p>Hint 2: kind needs <code>networking.disableDefaultCNI: true</code>, then a CNI install.</p>', '<p>Hint 3: write one positive and one negative test with short timeouts.</p>'],
    a: `<p>Check for Calico, Cilium or another enforcing plugin. If there is none, recreate the lab cluster with the default CNI disabled and install one that supports policy. Then verify with a client that must be blocked (times out) and one that must be allowed (connects). Also confirm the policy selects the Pods (<code>describe networkpolicy</code>, labels).</p>`,
    code: Y(`# kind-config.yaml: create the cluster without kindnet, then install Calico or Cilium
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
networking:
  disableDefaultCNI: true
  podSubnet: "192.168.0.0/16"
nodes:
  - role: control-plane
  - role: worker
# kind create cluster --config kind-config.yaml
# kubectl get pods -n kube-system | grep -Ei "calico|cilium"        (wait for Ready)
# kubectl run probe --rm -it --restart=Never --image=busybox:1.36 -- wget -qO- -T 3 http://db.shop:5432
#   expected after default-deny: wget: download timed out`, 'kind-config.yaml'),
    cx: `<p>Cluster recreation takes minutes.</p>`, f: ['How do you test it in CI? (a job that starts allowed and blocked clients and asserts both)', 'What else must you allow after default-deny? (DNS egress, ingress controller, monitoring)']
  }));
  practice.push(P({
    t: 'HPA with several metrics', l: 'Medium', tags: ['hpa', 'autoscaling', 'multi-metric'], co: ['Google', 'Datadog'],
    s: `<p>Write <code>hpa_multi(current, metrics, min_r, max_r)</code>. <code>metrics</code> is a list of strings <code>"value/target"</code> (integers, same unit per string). For each metric compute the desired count as in a single-metric HPA: if <code>|value - target| * 10 &lt;= target</code> the metric votes for <code>current</code>, otherwise <code>ceil(current * value / target)</code>. The HPA takes the <b>largest</b> vote, then clamps to <code>[min_r, max_r]</code>. If <code>current</code> is 0 return 0.</p>`,
    c: PYC,
    ex: `<p>4 Pods, metrics <code>["90/50", "30/50"]</code>: votes 8 and 3 → ${H.c('g', '8')}. 6 Pods, <code>["10/50", "200/400"]</code>: votes 2 and 3 → ${H.c('g', '3')}. 3 Pods <code>["100/50"]</code>, max 5: vote 6, clamped to ${H.c('y', '5')}.</p>`,
    bw: `<p>Averaging the votes lets an idle metric hide an overloaded one. The HPA chooses the maximum so the most demanding signal protects users.</p>`,
    bc: R`def hpa_multi(current, metrics, min_r, max_r):
    votes = []
    for m in metrics:
        v, t = (int(x) for x in m.split("/"))
        votes.append(-(-current * v // t))
    return max(min_r, min(max_r, sum(votes) // len(votes)))   # average: wrong`, bcl: 'python',
    q: ['CPU asks for 6 replicas, a queue metric asks for 12. What does the HPA do?', ['Scales to 12, the larger', 'Scales to 9, the average', 'Scales to 6, the first', 'Alternates'], 0, 'The HPA computes a proposal per metric and uses the highest.'],
    h: ['<p>Hint 1: each metric is its own single-metric decision.</p>', '<p>Hint 2: a metric inside tolerance votes for the current count, not for 0.</p>', '<p>Hint 3: parse with split("/"), take max of the votes, clamp once at the end.</p>'],
    a: `<p>Loop over the metrics and reuse the single-metric rule (tolerance keeps the current count, otherwise ceil of current × value ÷ target). Keep the maximum of all votes, then clamp once. Zero current means a manually scaled-to-zero workload and the HPA leaves it alone.</p>`,
    code: PY(R`def hpa_multi(current, metrics, min_r, max_r):
    if current == 0:
        return 0                                       # scaled to zero by hand: HPA idle
    best = 0
    for m in metrics:
        value, target = (int(x) for x in m.split("/"))
        if abs(value - target) * 10 <= target:
            vote = current                             # inside the 10% tolerance
        else:
            vote = -(-current * value // target)       # integer ceil
        best = max(best, vote)                         # the most demanding metric wins
    return max(min_r, min(max_r, best))`),
    cx: `<p>O(M) time for M metrics, O(1) extra space.</p>`, f: ['How does scale-down differ? (stabilization window picks the highest recommendation of the window)', 'Where does a custom metric come from? (a metrics adapter or KEDA)'],
    tests: { sig: 'int string[] int int -> int', fn: 'hpaMulti', cases: [
      [[4, ['90/50', '30/50'], 2, 10], 8], [[4, ['50/50'], 1, 10], 4], [[4, ['90/50', '54/50'], 1, 10], 8], [[4, ['54/50', '46/50'], 1, 10], 4],
      [[6, ['10/50', '200/400'], 2, 20], 3], [[6, ['10/50'], 2, 20], 2], [[3, ['100/50'], 1, 5], 5], [[0, ['100/50'], 1, 5], 0],
      [[5, ['60/50', '70/70'], 1, 10], 6], [[5, ['55/50'], 1, 10], 5], [[5, ['56/50'], 1, 10], 6], [[2, ['300/100', '150/100'], 1, 5], 5], [[10, ['5/50'], 4, 20], 4]
    ] }
  }));
  practice.push(P({
    t: 'StatefulSet Pod stuck Pending after a zone change', l: 'Hard', tags: ['statefulset', 'pvc', 'storage', 'zones'], co: ['Amazon', 'Elastic'],
    s: `<p>Your 3-replica StatefulSet <code>kafka</code> was created with a StorageClass using <code>volumeBindingMode: Immediate</code> on a three-zone cloud cluster. After a node pool replacement, <code>kafka-2</code> is Pending with <code>1 node(s) had volume node affinity conflict</code>. Its PVC is Bound to a disk in <code>zone-b</code>, but the only free node is in <code>zone-c</code>. Recover without losing data and prevent a repeat.</p>`,
    ex: `<p>The PersistentVolume has node affinity to <code>zone-b</code>. A disk cannot move zones, so the Pod must run in zone-b: ${H.c('g', 'add capacity in zone-b')} (or restore the data from a snapshot into zone-c as a new volume).</p>`,
    bw: `<p>Deleting the PVC to "let it bind again" destroys the only copy of that replica's data (the reclaim policy of many classes is Delete). Using <code>--force</code> on the Pod does nothing: the scheduler still cannot place it.</p>`,
    q: ['Why did the scheduler pick the wrong zone in the first place?', ['Immediate binding creates the disk before the Pod is scheduled', 'The Pod had no resource requests', 'StatefulSets ignore zones', 'The CSI driver is broken'], 0, 'WaitForFirstConsumer delays creating the disk until a node is chosen, so the disk and the Pod land in the same zone.'],
    h: ['<p>Hint 1: read the PV: <code>kubectl get pv NAME -o yaml</code> shows nodeAffinity.</p>', '<p>Hint 2: the data is in zone-b. Get a schedulable node there (scale the pool, uncordon).</p>', '<p>Hint 3: for the future, a StorageClass with <code>volumeBindingMode: WaitForFirstConsumer</code> and topology spread constraints.</p>'],
    a: `<p>Do not touch the claim. First confirm the zone from the PV. Then restore capacity in that zone (scale the zone-b node pool, uncordon, or remove a taint) and let the scheduler place the Pod. If zone-b is lost, create a new volume from a snapshot in zone-c and rebind through a new PVC. Prevent the problem with a <code>WaitForFirstConsumer</code> StorageClass, replicas spread across zones, and a tested snapshot restore.</p>`,
    code: Y(`apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata: { name: fast-zonal }
provisioner: ebs.csi.aws.com            # example CSI driver, use your cloud's
parameters: { type: gp3 }
volumeBindingMode: WaitForFirstConsumer   # create the disk where the Pod lands
reclaimPolicy: Retain                      # a deleted claim keeps the disk
allowVolumeExpansion: true
# Diagnosis:
#   kubectl describe pod kafka-2                         (read the scheduling event)
#   kubectl get pvc data-kafka-2 -o jsonpath='{.spec.volumeName}'
#   kubectl get pv PVNAME -o jsonpath='{.spec.nodeAffinity}'
#   kubectl get nodes -L topology.kubernetes.io/zone`, 'storageclass.yaml'),
    cx: `<p>Recovery time depends on getting a node in the right zone.</p>`, f: ['Why use reclaimPolicy Retain for databases? (a mistaken delete does not destroy the disk)', 'How would you move a replica to another zone? (snapshot, new PVC, or let the application re-replicate)']
  }));
  practice.push(P({
    t: 'Plan an upgrade from 1.29 to 1.31', l: 'Hard', tags: ['upgrade', 'drain', 'deprecated-api'], co: ['Red Hat', 'Intuit', 'Zalando'],
    s: `<p>Your production cluster runs Kubernetes 1.29 with 12 nodes and 40 Helm releases. Write the runbook to reach 1.31 with no planned downtime. Include pre-checks for removed APIs, the order of components, how many nodes to drain at once, the PDB and capacity checks, validation after each step, and the rollback story.</p>`,
    ex: `<p>Skeleton: ${H.c('b', 'scan')} → ${H.c('b', 'back up')} → ${H.c('b', 'control plane to 1.30')} → ${H.c('b', 'add-ons')} → ${H.c('b', 'nodes in batches')} → ${H.c('b', 'verify')}, then the whole sequence again for 1.31. Never skip a minor version.</p>`,
    bw: `<p>Upgrading straight from 1.29 to 1.31 is not supported, draining all nodes at once leaves Pods with nowhere to go, and skipping the API scan finds the removed APIs in production, after the control plane cannot be downgraded.</p>`,
    q: ['After the control plane is on 1.30, are 1.29 kubelets allowed?', ['Yes: kubelets may be older than the API server within the skew policy', 'No: all must match', 'Only with a flag', 'Only for DaemonSets'], 0, 'Kubelets may lag the API server by up to three minor versions, which is what makes a gradual node rollout possible.'],
    h: ['<p>Hint 1: pre-flight scan for removed APIs in live objects and Helm releases.</p>', '<p>Hint 2: the order is control plane, add-ons, nodes; one minor at a time.</p>', '<p>Hint 3: batch size is limited by spare capacity and PDBs; verify after each batch before the next.</p>'],
    a: `<p>Prepare: read the release notes for 1.30 and 1.31, run pluto or kubent, fix chart API versions, snapshot etcd or the cloud control plane, check PDBs with <code>kubectl get pdb -A</code>, and make sure the cluster has spare capacity for one batch. Execute 1.29 → 1.30: control plane, then CNI, CoreDNS, kube-proxy, metrics-server, ingress and CSI versions that support 1.30, then nodes in batches of 2 to 3 with cordon, drain, replace, uncordon. Verify after each batch (Pods Running, no Pending, SLO dashboards). Repeat for 1.31. Rollback: the control plane cannot be downgraded, so the real safety nets are the backup, the staging rehearsal, and keeping old nodes until the new ones are proven.</p>`,
    code: R`# --- Pre-flight (repeat before every minor version) ---
kubectl version && kubectl get nodes -o wide
pluto detect-all-in-cluster -o wide            # removed or deprecated APIs in live objects
pluto detect-helm -o wide                      # ... and inside Helm releases
kubectl get pdb -A                             # any ALLOWED DISRUPTIONS = 0?
kubectl top nodes                              # spare capacity for one batch
# --- Control plane and add-ons (cloud console, kubeadm upgrade, or Terraform) ---
# --- Nodes: three at a time ---
for n in node-1 node-2 node-3; do
  kubectl cordon "$n"
  kubectl drain "$n" --ignore-daemonsets --delete-emptydir-data --timeout=300s
done
# replace or upgrade them, then:
for n in node-1 node-2 node-3; do kubectl uncordon "$n"; done
kubectl get pods -A --field-selector=status.phase!=Running,status.phase!=Succeeded`,
    cx: `<p>Time is dominated by node batches and verification.</p>`, f: ['What is blue/green at cluster level? (build a new cluster at the target version and move traffic; costs double for a while)', 'How do you test the plan? (rehearse in staging with the same add-ons and charts)']
  }));
  practice.push(P({
    t: 'Kubelet version skew checker', l: 'Hard', tags: ['upgrade', 'version-skew', 'model'], co: ['Google', 'Canonical'],
    s: `<p>Write <code>skew_ok(api_minor, kubelet_minors)</code>. Versions are minor numbers (30 means 1.30). A kubelet must not be newer than the API server. It may be older by at most <b>3</b> minors if it is version 25 or newer, and by at most <b>2</b> minors if it is older than 25. Return true only when <b>every</b> kubelet satisfies the rule. An empty list is fine.</p>`,
    c: PYC,
    ex: `<p>API 30, kubelets <code>[30, 29, 28, 27]</code> → ${H.c('g', 'True')}. API 30, <code>[26]</code> → ${H.c('r', 'False')} (4 behind). API 27, <code>[24]</code> → ${H.c('r', 'False')} (kubelet older than 25: max 2 behind, here 3). API 30, <code>[31]</code> → ${H.c('r', 'False')} (newer than the API server).</p>`,
    bw: `<p>Checking only the oldest kubelet, or using one fixed limit for all versions, misses the stricter rule for old kubelets. Comparing strings like "1.9" and "1.10" is another classic bug: parse the minor as a number.</p>`,
    bc: R`def skew_ok(api_minor, kubelet_minors):
    return all(api_minor - k <= 3 for k in kubelet_minors)    # allows kubelets newer than the API server`, bcl: 'python',
    q: ['Why must the API server be upgraded before the nodes?', ['Kubelets must never be newer than the API server', 'The API server is faster', 'Nodes cannot reach an older API server', 'It is only a convention'], 0, 'The skew policy allows older kubelets but not newer ones, so the control plane goes first.'],
    h: ['<p>Hint 1: for each kubelet compute <code>gap = api - kubelet</code>.</p>', '<p>Hint 2: a gap below 0 means the kubelet is newer, which fails immediately.</p>', '<p>Hint 3: the limit depends on the kubelet version, not the API version: 3 if kubelet &gt;= 25, else 2.</p>'],
    a: `<p>Check each kubelet on its own. A negative gap means the kubelet is newer: not allowed. Otherwise pick the limit from the kubelet's own version and compare. <code>all()</code> over an empty list is true, which matches "no nodes, nothing to violate".</p>`,
    code: PY(R`def skew_ok(api_minor, kubelet_minors):
    for k in kubelet_minors:
        gap = api_minor - k
        if gap < 0:
            return False                       # kubelet newer than the API server
        limit = 3 if k >= 25 else 2            # older kubelets have the stricter rule
        if gap > limit:
            return False
    return True`),
    cx: `<p>O(N) time for N nodes, O(1) extra space.</p>`, f: ['What about kubectl? (one minor either way of the API server)', 'Why do managed services still force upgrades? (support windows end, and old versions stop receiving security fixes)'],
    tests: { sig: 'int int[] -> bool', fn: 'skewOk', cases: [
      [[30, [30, 29, 28, 27]], true], [[30, [26]], false], [[30, [31]], false], [[31, [28]], true], [[31, [27]], false], [[29, [29]], true],
      [[29, []], true], [[30, [27, 27, 26]], false], [[28, [25]], true], [[28, [24]], false], [[32, [29, 29, 30]], true], [[27, [25]], true], [[27, [24]], false], [[30, [30, 31]], false]
    ] }
  }));
  practice.push(P({
    t: 'A least-privilege deployer for Helm in CI', l: 'Hard', tags: ['rbac', 'helm', 'ci', 'least-privilege'], co: ['GitLab', 'HashiCorp', 'Palo Alto Networks'],
    s: `<p>CI runs <code>helm upgrade --install web ./chart -n shop</code>. Today its kubeconfig is cluster-admin. Replace it with a ServiceAccount that can deploy only into namespace <code>shop</code>. Hints: Helm 3 stores release state as Secrets in the release namespace, and the chart creates Deployments, Services, ConfigMaps, an HPA and a PDB. Prove that it cannot read Secrets in other namespaces or touch cluster-scoped objects.</p>`,
    ex: `<p>The Role lists exact resources and verbs. <code>can-i create deployments -n shop</code> → ${H.c('g', 'yes')}; <code>can-i get secrets -n kube-system</code> → ${H.c('r', 'no')}; <code>can-i create clusterroles</code> → ${H.c('r', 'no')}.</p>`,
    bw: `<p>A cluster-admin pipeline token leaks through one bad CI job or log line and gives the attacker everything. A ClusterRoleBinding to <code>edit</code> is better, but still covers every namespace.</p>`,
    q: ['Why does the deployer need access to Secrets in its own namespace?', ['Helm stores each release revision as a Secret there', 'Helm reads application passwords', 'Kubernetes requires it for any Role', 'To mount volumes'], 0, 'Helm 3 keeps release history in Secrets named sh.helm.release.v1.NAME.vN. Without them upgrade and rollback fail.'],
    h: ['<p>Hint 1: run the upgrade once with a broad role, then read the Forbidden errors to learn what is needed.</p>', '<p>Hint 2: a RoleBinding (not ClusterRoleBinding) limits it to <code>shop</code>.</p>', '<p>Hint 3: forbid what must not happen with tests: other namespaces, ClusterRoles, nodes.</p>'],
    a: `<p>Create a ServiceAccount <code>deployer</code> and a Role in <code>shop</code> with verbs on the exact kinds the chart renders plus Secrets (for release records). Bind with a RoleBinding. Use short-lived credentials (a token requested at job time) instead of a stored kubeconfig. If the chart creates cluster-scoped objects (CRDs, ClusterRoles), install those with a separate, reviewed process. Finally run the positive and negative <code>can-i</code> checks in the pipeline.</p>`,
    code: Y(`apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata: { name: helm-deployer, namespace: shop }
rules:
  - apiGroups: ["apps"]
    resources: ["deployments", "replicasets"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  - apiGroups: [""]
    resources: ["services", "configmaps", "serviceaccounts", "pods"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  - apiGroups: [""]
    resources: ["secrets"]                    # Helm release records live here
    verbs: ["get", "list", "create", "update", "delete"]
  - apiGroups: ["autoscaling", "policy"]
    resources: ["horizontalpodautoscalers", "poddisruptionbudgets"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata: { name: helm-deployer, namespace: shop }
subjects:
  - { kind: ServiceAccount, name: deployer, namespace: shop }
roleRef: { apiGroup: rbac.authorization.k8s.io, kind: Role, name: helm-deployer }
# Tests the pipeline runs (as the deployer):
#   can-i create deployments -n shop      -> yes
#   can-i get secrets -n kube-system      -> no
#   can-i create clusterroles             -> no
#   can-i delete nodes                    -> no`, 'deployer-rbac.yaml'),
    cx: `<p>One Role per target namespace; the list grows with the chart.</p>`, f: ['What about a chart with CRDs? (install them separately, Helm never upgrades the crds/ folder)', 'How would you remove the long-lived token? (OIDC federation from CI, or a token requested per run with kubectl create token)']
  }));

  // ───────────────────────── Quiz ─────────────────────────
  function Q(q, options, answer, explain) { quiz.push({ q: q, options: options, answer: answer, explain: explain }); }
  Q('You run <code>helm rollback web 3</code> and then <code>helm history web</code>. What do you see?', ['A new, higher revision that copies revision 3', 'The history is cut back to revision 3', 'Revision 3 marked as the only deployed one and all later ones deleted', 'An error: rollback only works with --force'], 0, 'Helm records a rollback as a new revision. History only grows, up to <code>--history-max</code>.');
  Q('A values file sets <code>image.tag: 1.0</code>. The command adds <code>--set image.tag=2.0 -f prod.yaml</code> where prod.yaml sets <code>image.tag: 1.5</code>. Which tag is used?', ['2.0: --set beats -f files, which beat chart defaults', '1.5: the file wins because it comes last', '1.0: chart defaults always win', 'The command fails with a conflict'], 0, 'Precedence from lowest to highest: chart values.yaml, -f files in order (later files win), then --set.');
  Q('Which line belongs in a safe CI deploy?', ['<code>helm upgrade --install web ./chart --atomic --wait --timeout 5m</code>', '<code>helm upgrade web ./chart --force --set db.password=hunter2</code>', '<code>helm template ./chart | kubectl apply -f - --force</code>', '<code>helm uninstall web</code> before every deploy'], 0, '--atomic rolls back automatically on failure and --wait waits for Pods to be Ready. Passwords on the command line are a leak.');
  Q('An HPA targets 50% CPU, current is 4 Pods, the measured average is 90%. Without limits in the way, what is the new replica count?', ['8', '4', '7', '9'], 0, 'ceil(4 × 90 / 50) = ceil(7.2) = 8.');
  Q('The HPA shows <code>cpu: unknown/60%</code>. What is checked first?', ['Whether metrics-server works and the Pods have CPU requests', 'The maxReplicas value', 'The Service type', 'The node taints'], 0, 'Without the Metrics API and a CPU request the percentage cannot be computed, so nothing scales.');
  Q('Which strategy never lowers capacity during a rollout, assuming there is room for one more Pod?', ['maxUnavailable: 0, maxSurge: 1', 'maxUnavailable: 1, maxSurge: 0', 'type: Recreate', 'maxUnavailable: 100%'], 0, 'With maxUnavailable 0 a new Pod must be Ready before an old one is removed.');
  Q('A Deployment has 3 replicas, all healthy, and a PDB with <code>minAvailable: 3</code>. What does <code>kubectl drain</code> do on a node running one replica?', ['It blocks: allowed disruptions is 0', 'It evicts the Pod and recreates it', 'It ignores the PDB for the first Pod', 'It deletes the PDB'], 0, 'allowed = healthy − minAvailable = 0, so the Eviction API returns 429 until the budget changes.');
  Q('Why can a StatefulSet Pod fail to start in a different zone from its old node?', ['Its PersistentVolume has node affinity to the zone where the disk was created', 'StatefulSets cannot be rescheduled', 'The headless Service blocks it', 'The Pod name must match the node name'], 0, 'Block disks are zonal. The scheduler has to place the Pod in the PV\'s zone.');
  Q('Which StorageClass setting avoids creating a disk in a zone where no Pod can run?', ['<code>volumeBindingMode: WaitForFirstConsumer</code>', '<code>reclaimPolicy: Delete</code>', '<code>allowVolumeExpansion: true</code>', '<code>volumeBindingMode: Immediate</code>'], 0, 'The disk is created only after the scheduler has chosen a node, so both are in the same zone.');
  Q('A ServiceAccount has a Role granting <code>get</code> on <code>pods</code>. What does <code>kubectl logs</code> need in addition?', ['A rule for the sub-resource <code>pods/log</code>', 'Nothing: logs is part of pods', 'cluster-admin', 'A RoleBinding in kube-system'], 0, 'Sub-resources such as pods/log and pods/exec are separate resources in RBAC.');
  Q('You apply a default-deny NetworkPolicy on a kind cluster and traffic still flows. Most likely cause?', ['The default CNI does not enforce NetworkPolicy', 'The policy needs a restart of kubelet', 'Policies only work with Ingress', 'Default deny is not supported by Kubernetes'], 0, 'The API stores the object, but only a CNI that implements policy (Calico, Cilium, and others) enforces it.');
  Q('Inside a NetworkPolicy <code>from:</code>, what is the difference between two separate dash items (one <code>namespaceSelector</code>, one <code>podSelector</code>) and one dash item holding both?', ['Separate items are OR, one item with both is AND', 'No difference', 'Separate items are AND, one item is OR', 'Only the first item counts'], 0, 'Each list item is an alternative (OR). Selectors inside one item must all match (AND).');
  Q('In which order is a cluster upgraded?', ['Control plane, add-ons, then nodes in small batches', 'Nodes first, then control plane', 'All nodes and the control plane at once', 'Add-ons, nodes, then control plane'], 0, 'Kubelets may be older than the API server but never newer, so the control plane goes first.');
  Q('After upgrading to 1.26, <code>helm upgrade</code> fails with <code>no matches for kind "HorizontalPodAutoscaler" in version "autoscaling/v2beta2"</code>. What is the fix?', ['Change the template to <code>autoscaling/v2</code> (and repair old release metadata with mapkubeapis if needed)', 'Downgrade the cluster', 'Add --force', 'Delete the HPA by hand and ignore the error'], 0, 'v2beta2 was removed in 1.26. Use the stable API in the chart.');
  Q('Which tool lets you add a shell to a Pod whose image has no shell?', ['<code>kubectl debug -it POD --image=busybox:1.36 --target=app</code>', '<code>kubectl exec POD -- sh</code>', '<code>kubectl attach POD</code>', '<code>kubectl cp</code>'], 0, 'An ephemeral container is added to the running Pod and shares the target container\'s process namespace.');

  // ───────────────────────── Interview ─────────────────────────
  function IQ(level, q, a, followUps) { interview.push({ q: q, a: a, level: level, followUps: followUps }); }
  IQ('B', 'What is Helm, and what are a chart, a release and a values file?', `<p>Helm is the package manager for Kubernetes. A <b>chart</b> is a folder of templates (<code>templates/</code>), default settings (<code>values.yaml</code>) and metadata (<code>Chart.yaml</code>). A <b>release</b> is one installation of a chart in a cluster, with a name and a numbered history; Helm 3 stores each revision as a Secret in the release namespace. <b>Values</b> are the settings you override per environment with <code>-f</code> files or <code>--set</code>. <code>helm template</code> renders the YAML without installing, which is how you review changes.</p>`, ['Where does Helm 3 keep release state? (Secrets in the namespace; Tiller is gone)', 'What is the difference between helm install and helm upgrade --install? (the second is idempotent and fits CI)']);
  IQ('B', 'What happens to history when you run helm rollback?', `<p>Rollback re-applies the manifest of an older revision and records that as a <b>new revision</b>. If the release was at revision 8 and you roll back to 7, the new current state is revision 9, a copy of 7. Nothing is deleted. Rollback restores Kubernetes objects only: database migrations, hook side effects and CRDs are not undone, so migrations must be safe forwards and backwards.</p>`, ['How does --atomic relate to rollback? (it rolls back automatically if the upgrade fails)', 'What if the failed upgrade left the release in pending-upgrade? (inspect helm history, then rollback or fix the lock)']);
  IQ('I', 'How do values precedence and deep merge work in Helm?', `<p>From lowest to highest: the chart\'s <code>values.yaml</code>, values from parent charts, files passed with <code>-f</code> (later files override earlier ones), then <code>--set</code> and <code>--set-string</code> flags. Maps are merged key by key, so an override only needs the keys that change. <b>Lists are replaced as a whole</b>, not merged, a classic source of surprises. A <code>null</code> value deletes a default key. <code>helm get values RELEASE --all</code> shows what was actually applied.</p>`, ['How would you delete a default key for one environment? (set it to null)', 'How do you make a wrong key fail loudly? (values.schema.json)']);
  IQ('I', 'How do you keep secrets out of Helm values and Git?', `<p>Never put a secret in a values file: it ends up in Git history, CI logs and the release Secret. Options: (1) create the Kubernetes Secret outside the chart (or sync it with the <b>External Secrets Operator</b> from a cloud secret manager or Vault) and have the chart reference it by name; (2) encrypt the values file with <b>SOPS</b> and use <b>helm-secrets</b>, so only the ciphertext is committed; (3) pass <code>--set-string</code> from a CI environment variable as a quick option, aware that the computed value still lands in the release Secret. Add encryption at rest and RBAC on Secrets.</p>`, ['Why is base64 not protection? (it is encoding, anyone can decode it)', 'How do you rotate a secret with ESO? (change it in the store and let the operator refresh; restart Pods that read it as env vars)']);
  IQ('I', 'Explain maxSurge and maxUnavailable. How do you do a rollout that never reduces capacity?', `<p><code>maxSurge</code> is how many extra Pods above the desired count may exist during a rollout; <code>maxUnavailable</code> is how many may be missing. Percentages round surge up and unavailable down. For zero capacity loss set <code>maxUnavailable: 0</code> and <code>maxSurge: 1</code> (or a percentage), which needs room for the extra Pod. Pair it with a readiness probe that tells the truth, <code>minReadySeconds</code>, and a <code>preStop</code> delay so connections drain before shutdown.</p>`, ['What does a readiness probe that is too lenient cause? (traffic to Pods that are not ready, errors during a rollout)', 'When would you use Recreate? (the app cannot run two versions at once)']);
  IQ('I', 'How does the HorizontalPodAutoscaler decide the number of replicas, and why might it not scale?', `<p>The formula is <code>desired = ceil(current × currentMetric / targetMetric)</code>, ignored if the ratio is within a 10% tolerance, then clamped to min and max. With several metrics it takes the largest result. Scale-up is quick; scale-down uses a stabilization window (300 s by default) to avoid flapping, and <code>behavior</code> can limit the pace. It will not scale when metrics-server is missing, when Pods lack CPU requests (percentages need a request), when it is already at maxReplicas, when the cluster has no room (Pods Pending), or when the metric is not related to load.</p>`, ['Why is memory a poor autoscaling metric? (usage rarely falls when Pods are added)', 'When would you use KEDA? (event or queue-based metrics, scale to zero)']);
  IQ('I', 'What is a PodDisruptionBudget and how can it block a node drain?', `<p>A PDB limits <b>voluntary</b> disruptions (drains, node upgrades, autoscaler scale-down) for a set of Pods by <code>minAvailable</code> or <code>maxUnavailable</code>. Allowed disruptions = healthy Pods − the required minimum. At 0, the Eviction API answers 429 and <code>kubectl drain</code> waits forever. Typical causes: one replica with <code>minAvailable: 1</code>, replicas equal to minAvailable, or Pods already unhealthy. The fix is more replicas or a looser budget. Involuntary failures such as a node crash ignore the PDB.</p>`, ['Does kubectl delete pod respect a PDB? (no, only the eviction API does)', 'What does unhealthyPodEvictionPolicy do? (lets not-Ready Pods be evicted)']);
  IQ('I', 'When do you use a StatefulSet instead of a Deployment, and what does volumeClaimTemplates do?', `<p>Use a StatefulSet when each replica needs a stable identity and its own storage: databases, brokers, anything with a stable network name. It gives ordered names (<code>db-0</code>, <code>db-1</code>), a headless Service for per-Pod DNS, ordered start and stop, and <code>volumeClaimTemplates</code>, which create one PVC per Pod (<code>data-db-0</code>). The claim outlives the Pod and re-attaches when the Pod comes back, and scaling down does not delete the PVCs. It does not provide replication or failover; that comes from the application or an operator.</p>`, ['What happens to PVCs when you delete the StatefulSet? (they stay, unless persistentVolumeClaimRetentionPolicy says otherwise)', 'Why use an operator for databases? (backups, failover, upgrades in order)']);
  IQ('A', 'A StatefulSet Pod is Pending with "volume node affinity conflict". Diagnose and fix it.', `<p>The PV bound to the Pod\'s PVC is zonal, so the Pod must run in that zone, but no schedulable node there has room (taint, cordon, full, scaled to zero). Check <code>describe pod</code>, the PV\'s <code>nodeAffinity</code>, and node zone labels. Fix by restoring capacity in that zone, not by deleting the PVC, which can destroy the only copy of the data. Prevent it with <code>WaitForFirstConsumer</code>, replicas and topology spread across zones, <code>reclaimPolicy: Retain</code> for important data, and tested snapshots.</p>`, ['How would you recover if the zone is gone? (restore a snapshot into another zone, rebind a new PVC, re-sync from replicas)', 'Can a PV be moved between zones? (no, only copied through a snapshot)']);
  IQ('I', 'Design least-privilege RBAC for a CI pipeline and for a developer. How do you verify it?', `<p>Give each its own identity. The pipeline gets a ServiceAccount with a <b>Role</b> in the target namespace listing exact resources and verbs (and Secrets access for Helm release records), bound with a <b>RoleBinding</b>, with short-lived tokens instead of a stored kubeconfig. Developers get read-only roles for most namespaces and edit rights in their own, through groups mapped from the identity provider. Verify with <code>kubectl auth can-i</code> and <code>--as</code>, including checks that must say <b>no</b>, and review who holds cluster-admin with <code>kubectl get clusterrolebindings</code>. Avoid wildcards, and watch for escalation paths such as <code>create pods</code>, <code>pods/exec</code> and <code>impersonate</code>.</p>`, ['What is the difference between a Role and a ClusterRole used with a RoleBinding? (reuse the rules, scope to one namespace)', 'Can RBAC deny? (no, it is additive only)']);
  IQ('I', 'You applied a default-deny NetworkPolicy and nothing changed. What do you check?', `<p>First, whether the CNI enforces policies: older kindnet (kind\'s default; newer releases may enforce) and plain Flannel do not, Calico, Cilium and others do. Then whether the policy selects the Pods (labels, namespace), the direction (<code>policyTypes</code>), and that your test really crosses Pods (traffic inside the same Pod or via a host network Pod is different). Test with a client that must time out and one that must connect. After the fix remember DNS egress, the ingress controller and monitoring, which default-deny also blocks.</p>`, ['What is the AND vs OR trap in from: lists? (separate dashes are OR, selectors in one item are AND)', 'Can NetworkPolicy block by domain name? (not in the core API; Cilium and Calico offer it)']);
  IQ('A', 'Walk through a zero-downtime upgrade of a production cluster from 1.29 to 1.31.', `<p>One minor version at a time. Before each: read release notes, scan for removed APIs (pluto, kubent, the deprecated-API metric, Helm releases), fix charts, back up etcd or snapshot the managed control plane, check capacity and PDBs. Then upgrade the control plane, then add-ons (CNI, CoreDNS, kube-proxy, CSI, ingress, metrics-server), then nodes in small batches by cordon, drain, replace or upgrade, uncordon, validating Pods and SLOs between batches. Rehearse in staging. The control plane cannot be downgraded, so the safety nets are backups, staging, and keeping old nodes until new ones prove themselves.</p>`, ['What is the kubelet skew allowance? (up to three minors older, never newer)', 'When is a blue/green cluster better? (large jumps, risky add-ons, strict rollback needs)']);
  IQ('A', 'A deprecated API broke an upgrade. How do you find it before, and repair it after?', `<p>Before: read the deprecation guide for the target version, run <code>pluto</code> or <code>kubent</code> against live objects, Helm releases and repositories, and watch <code>apiserver_requested_deprecated_apis</code> on the old cluster. Fix the manifests and charts to the stable API versions in CI. After: if a Helm release stores a removed API in its manifest, <code>helm upgrade</code> and <code>rollback</code> can fail with "no matches for kind"; the <code>helm mapkubeapis</code> plugin rewrites the stored release metadata. Operators and CRDs have their own versions to check too.</p>`, ['How long are beta APIs kept after deprecation? (at least three releases or nine months)', 'Do stable v1 APIs get removed? (not within a major version)']);
  IQ('E', 'Tell me about a production incident that touched Helm or Day-2 Kubernetes work and how you would run it.', `<p>A strong answer is a story with order: detect (alert, SLO burn), stabilise (<code>helm rollback</code> or scale up, before root cause), diagnose with evidence (<code>helm history</code>, <code>helm diff</code>, events, <code>describe</code>, logs, <code>kubectl debug</code>), communicate, then fix properly and write a blameless postmortem with actions: <code>--atomic</code> and diff in CI, a values schema, PDB and HPA tests, a NetworkPolicy test, a pre-upgrade API scan. Mention what you did not do (force deletes, cluster-admin) and why. Show that you measure the result, for example time to rollback and the change failure rate.</p>`, ['What would you automate first? (a rendered-manifest check and a post-deploy smoke test)', 'How do you decide between rolling forward and rolling back? (impact, known fix, data or migration risk)']);

  // The lesson viewer takes one snippet per example. An example written with several snippets becomes consecutive examples.
  topics.forEach(function (t) {
    var out = [];
    t.examples.forEach(function (e) {
      if (!Array.isArray(e.code)) { out.push(e); return; }
      e.code.forEach(function (c, i) {
        out.push({ title: e.title + ' (' + (i + 1) + ' of ' + e.code.length + ')', html: i === 0 ? e.html : '<p>Same example, part ' + (i + 1) + ' of ' + e.code.length + ': ' + (c.lang === 'yaml' ? 'the manifest' : 'the commands') + ' that go with the previous step. Read it together with the first part.</p>', code: c });
      });
    });
    t.examples = out;
  });

  registerModule({
    id: 'devops14',
    title: 'Helm & Day-2 Kubernetes Operations',
    intro: `<p>Getting an app running on Kubernetes is day 1. Day 2 is everything after: packaging it so teams can deploy it the same way every time, upgrading it without an outage, letting it grow and shrink with load, keeping its data safe, giving each person and each Pod only the access it needs, closing network doors, and upgrading the cluster itself. This module covers the tools and habits for that: <b>Helm 3</b>, rolling updates, the <b>HorizontalPodAutoscaler</b>, <b>PodDisruptionBudgets</b>, <b>StatefulSets</b> and persistent volumes, <b>RBAC</b>, <b>NetworkPolicy</b>, cluster upgrades with <b>cordon and drain</b>, and debugging with <code>kubectl debug</code>.</p>
      <p>Each topic starts from a real incident: a bad Helm upgrade that had to be rolled back, an HPA that never scaled, a StatefulSet Pod stuck because its disk was in another zone, an RBAC Forbidden error, a NetworkPolicy that did nothing, a drain blocked by a PDB, and a deprecated API that broke an upgrade. Labs run free on kind or minikube with Helm 3 and metrics-server. Secrets never go in values files; you meet --set from environment variables, helm-secrets with SOPS, and External Secrets at an intro level.</p>`,
    goals: [
      'Build a Helm chart (<code>Chart.yaml</code>, <code>values.yaml</code>, templates, <code>_helpers.tpl</code>), override values with <code>-f</code> and <code>--set</code>, and predict which layer wins',
      'Use <code>helm template</code>, <code>lint</code>, <code>diff</code>, <code>upgrade --install --atomic</code>, <code>history</code> and <code>rollback</code>, and publish or install a chart through an OCI registry',
      'Handle secrets safely with Helm: no secrets in values files, <code>--set-string</code> from environment variables, helm-secrets with SOPS, and External Secrets at an intro level',
      'Tune rolling updates with maxSurge and maxUnavailable, write an <code>autoscaling/v2</code> HPA with <code>behavior</code>, and protect availability with PodDisruptionBudgets',
      'Run stateful workloads with StatefulSets, <code>volumeClaimTemplates</code>, StorageClasses, PVs and PVCs, and explain zone problems and <code>WaitForFirstConsumer</code>',
      'Write least-privilege Roles and RoleBindings, and prove access with <code>kubectl auth can-i</code>',
      'Apply default-deny NetworkPolicies with explicit allows, and know that they need a CNI that enforces policy',
      'Plan a cluster upgrade (control plane, add-ons, nodes with cordon and drain), find deprecated APIs, and debug with <code>kubectl debug</code>'
    ],
    prereqs: `<b>Required:</b> <b>Cloud &amp; DevOps 13</b> (Kubernetes Core) for Pods, Deployments, Services, ConfigMaps, Secrets, probes, requests and limits and basic kubectl, which this module builds on without repeating. You do not need a cloud account: everything runs on your own machine with kind or minikube, Helm 3 and metrics-server.`,
    hours: 16,
    langExplain: `<p>Commands are <b>bash</b> (kubectl and Helm 3), and manifests are <b>YAML</b>, because that is what operators use daily. <b>Helm templates contain <code>{{ }}</code> expressions, which are not valid YAML until rendered</b>, so they are shown with the language <code>text</code> and are not syntax-checked (<code>check: false</code>); render them with <code>helm template</code> to see real YAML. Decision rules that are pure computation (Helm values merge, HPA replica count, PDB allowed disruptions, rolling update limits, RBAC check, NetworkPolicy evaluation, version skew) also come as <b>Python</b> standard-library solutions with tests. Cluster procedures are verified by reading and by running them in your lab.</p>`,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
