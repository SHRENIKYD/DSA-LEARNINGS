(function () {
  var topics = [], practice = [], quiz = [], interview = [];
  var R = String.raw; // raw template: backslashes and shell code stay exactly as typed
  var LAB = '<p>Everything runs free on your own machine: <b>kind</b> (Kubernetes 1.29 or newer), <b>kubectl</b>, the <b>argocd</b> CLI (Argo CD 2.x or 3.x), the <b>flux</b> CLI (Flux v2), <b>kustomize</b> (or <code>kubectl kustomize</code>), and the <b>kubectl argo rollouts</b> plugin. Use a throwaway Git repository you own. Every password, token and key shown is a placeholder.</p>';
  var PYC = '<p>Python 3, standard library only. This is a small model of the real Argo CD / Flux / Rollouts rule: good enough to reason with, simpler than the real controller.</p>';
  var SKIP = { skip: 'cluster or Git procedure, verified by reading and in your lab' };
  // Templated text that is not valid YAML or bash uses lang 'text' with check: false (same convention as devops14).
  function TXT(code, title) { return { lang: 'text', check: false, title: title || 'output', code: code }; }
  function Y(code, title) { return { lang: 'yaml', title: title || 'manifest.yaml', code: code }; }   // parsed as YAML
  function SH(code, title) { var s = { lang: 'bash', code: code }; if (title) s.title = title; return s; } // bash -n checked
  function PY(code, title) { return { lang: 'python', title: title || 'Python model (tested)', code: code }; }
  function snip(c) { return typeof c === 'string' ? SH(c) : c; }
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
    if (o.bc) p.brute.code = o.bcl === 'yaml' ? Y(o.bc, 'Naive version') : o.bcl === 'python' ? PY(o.bc, 'Naive version') : snip(o.bc);
    return p;
  }
  function box(id, label, x, y, w) { return { id: id, label: label, x: x, y: y, shape: 'box', w: w || 18 }; }
  function pad4(f, tip) { while (f.length < 4) f.push({ narr: tip, parts: f[f.length - 1].parts }); return f; }

  // ── small JS models used only by the visualizers (the tested Python versions live in the problems) ──
  var KIND_ORDER = ['Namespace', 'ServiceAccount', 'Secret', 'ConfigMap', 'PersistentVolumeClaim', 'CustomResourceDefinition', 'Role', 'RoleBinding', 'Service', 'Deployment', 'StatefulSet', 'Job', 'Ingress'];
  var PHASES = ['PreSync', 'Sync', 'PostSync'];
  function verCmp(a, b) { var x = a.split('.').map(Number), y = b.split('.').map(Number); for (var i = 0; i < 3; i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) - (y[i] || 0); } return 0; }

  // ───────────────────────── Topic 1: GitOps principles and the reconcile loop ─────────────────────────
  topics.push({
    title: 'GitOps Principles: Git as the Truth, a Controller as the Hands',
    analogy: `<p>Think of a thermostat. You do not walk to the boiler and turn it on; you write the wish ("21 °C") on the dial. The thermostat checks the room again and again, and whenever the room is not 21 °C it acts. If someone opens a window, it notices and heats more. GitOps is a thermostat for clusters: the <b>dial is a Git repository</b>, the <b>room is the cluster</b>, and the <b>thermostat is a controller</b> (Argo CD or Flux) running inside the cluster, comparing and correcting forever.</p>`,
    explain: `<p>🟢 <b>What changes compared to the CI/CD module.</b> In Cloud &amp; DevOps 11 the pipeline <i>pushed</i> to the cluster: a CI job held a kubeconfig and ran <code>helm upgrade</code> or <code>kubectl apply</code>. Once the job ended, nobody watched. GitOps flips the direction: CI only builds, tests and publishes an image, then changes a line in a <b>config repository</b>. An agent <i>inside</i> the cluster <b>pulls</b> that repository and makes the cluster match it, all the time.</p>
      <p>🟢 <b>The four OpenGitOps principles</b> (the CNCF working group wrote them down in v1.0.0):</p>
      ${H.table(['Principle', 'Plain meaning', 'What breaks without it'], [
        ['<b>Declarative</b>', 'you describe the end state (YAML), not the steps to get there', 'scripts that work once and fail on the second run'],
        ['<b>Versioned and immutable</b>', 'the desired state lives in Git: every change is a commit with an author, a review and a way back (<code>git revert</code>)', 'nobody knows who changed prod or how to undo it'],
        ['<b>Pulled automatically</b>', 'an agent fetches the desired state; nothing outside needs cluster credentials', 'CI holds a cluster-admin kubeconfig, a big target for attackers'],
        ['<b>Continuously reconciled</b>', 'the agent compares desired and live state in a loop and fixes differences', 'a hand edit (<code>kubectl edit</code>) silently stays forever']
      ])}
      <p>🔵 <b>The reconcile loop.</b> Every few minutes (Argo CD: <code>timeout.reconciliation</code>, 180 s by default, plus a Git webhook for speed; Flux: the <code>interval</code> on each object) the controller does the same four steps:</p>
      ${H.table(['Step', 'What happens'], [
        ['1. Fetch', 'read the Git commit (or OCI artifact, or Helm chart) and render it: plain YAML, Kustomize or Helm'],
        ['2. Observe', 'read the live objects from the Kubernetes API (from a watch cache, not by polling every object)'],
        ['3. Diff', 'compare field by field; fields Kubernetes fills in by itself (defaults, <code>status</code>) are ignored'],
        ['4. Act', 'apply what differs (if auto-sync is on), optionally delete what is no longer in Git (<b>prune</b>), report status']
      ])}
      <p>🔵 <b>Drift</b> is any difference between Git and the cluster. Three kinds: <b>missing</b> (in Git, not in the cluster), <b>extra</b> (in the cluster with the app's tracking label/annotation, not in Git any more: a prune candidate), and <b>changed</b> (same object, different field: someone scaled by hand). Argo CD shows this as <code>OutOfSync</code>; Flux re-applies on every interval and, for Helm, can detect drift with <code>driftDetection</code>.</p>
      <p>🔵 <b>Who acts on drift?</b> Detection and correction are separate switches. Argo CD with <code>automated</code> sync applies new commits; <code>selfHeal: true</code> also reverts hand edits; <code>prune: true</code> deletes removed objects. Without these, Argo CD only reports. Flux always applies on its interval, and <code>prune: true</code> on a Kustomization deletes removed objects.</p>
      <p>🔵 <b>Two repositories, usually.</b> The <b>app repo</b> holds source code and its CI. The <b>config repo</b> (or "environment repo") holds manifests per environment. CI's last step is a commit or PR to the config repo that bumps the image tag. Keeping them apart means a config change does not rebuild the app, and the deploy history is a clean list of config commits.</p>`,
    clues: [
      '"Who changed production at 3 a.m.?" → with GitOps the answer is <code>git log</code> on the config repo; a hand edit shows up as drift',
      '"CI must not hold cluster credentials" → pull-based delivery: the agent in the cluster pulls, CI only writes to Git',
      '"Someone ran kubectl edit and it keeps coming back" → self-heal is on: change Git, not the cluster',
      '"Rebuild the cluster after a disaster" → point a fresh Argo CD or Flux at the same repo and let it reconcile',
      '"Audit trail and approvals for every deploy" → pull requests on the config repo, branch protection, CODEOWNERS',
      '"OutOfSync but nothing changed in Git" → drift, or a field the controller fills in that you must ignore'
    ],
    code: [TXT(`push-based CD (devops11)                 pull-based GitOps (this module)
-----------------------                  -------------------------------
dev -> PR -> CI builds image             dev -> PR -> CI builds image
CI holds kubeconfig                      CI commits new tag to config repo
CI runs helm upgrade / kubectl apply     agent IN the cluster pulls the repo
nobody watches afterwards                agent diffs + applies every few minutes
hand edits stay forever                  hand edits are reported or reverted`, 'push vs pull'),
      PY(`# A toy reconcile loop: desired comes from Git, live from the cluster API.
desired = {"Deployment/web": {"replicas": "3", "image": "web:1.4"},
           "Service/web": {"port": "80"}}
live = {"Deployment/web": {"replicas": "5", "image": "web:1.4", "uid": "abc"},
        "Job/debug": {"image": "busybox"}}

def reconcile(desired, live, self_heal=True, prune=True):
    actions = []
    for name, want in desired.items():
        have = live.get(name)
        if have is None:
            actions.append("create " + name)
            continue
        for key, value in want.items():          # only fields Git cares about
            if have.get(key) != value:
                actions.append("%s %s.%s %s -> %s" % ("patch" if self_heal else "report", name, key, have.get(key), value))
    for name in live:
        if name not in desired:
            actions.append(("delete " if prune else "report extra ") + name)
    return actions

for line in reconcile(desired, live):
    print(line)
print("--- without selfHeal/prune ---")
for line in reconcile(desired, live, self_heal=False, prune=False):
    print(line)`, 'reconcile loop in 20 lines')],
    codeTitle: ['Push vs pull', 'A toy reconcile loop'],
    viz: [{
      title: 'Reconcile: diff desired (Git) against live (cluster)',
      input: 'desired: web.replicas=3 web.image=1.4 cfg.mode=prod ; live: web.replicas=5 web.image=1.4 job.image=busybox',
      inputLabel: 'desired: obj.field=value ... ; live: obj.field=value ...',
      gen: function (input) {
        var parts = String(input || '').split(';');
        if (parts.length !== 2) throw new Error('Write: desired: obj.field=value ... ; live: obj.field=value ...');
        function parse(s) {
          var i = s.indexOf(':'); if (i < 0) throw new Error('Each side starts with a name and a colon, e.g. desired:');
          var o = {}, n = 0;
          s.slice(i + 1).trim().split(/\s+/).filter(Boolean).forEach(function (t) {
            var m = t.match(/^([\w-]+)\.([\w-]+)=(.*)$/); if (!m) throw new Error('Bad token "' + t + '": use obj.field=value');
            if (++n > 20) throw new Error('At most 20 fields per side');
            (o[m[1]] = o[m[1]] || {})[m[2]] = m[3];
          });
          return o;
        }
        var want = parse(parts[0]), have = parse(parts[1]), f = [], findings = [];
        function rowsOf(o) { var r = []; Object.keys(o).sort().forEach(function (k) { Object.keys(o[k]).sort().forEach(function (fl) { r.push([k, fl, o[k][fl]]); }); }); return r; }
        f.push({ narr: '<b>Step 1, fetch.</b> The controller renders the Git commit into the desired objects. This is what the team <i>reviewed and merged</i>.', parts: [{ type: 'table', label: 'desired (Git)', columns: ['object', 'field', 'value'], rows: rowsOf(want) }] });
        f.push({ narr: '<b>Step 2, observe.</b> It reads the live objects from the API server (its watch cache). Someone may have changed things by hand.', parts: [{ type: 'table', label: 'desired (Git)', columns: ['object', 'field', 'value'], rows: rowsOf(want) }, { type: 'table', label: 'live (cluster)', columns: ['object', 'field', 'value'], rows: rowsOf(have) }] });
        Object.keys(want).sort().forEach(function (o) {
          if (!have[o]) { findings.push(['MISSING', o, 'create it']); f.push({ narr: '<b>' + o + '</b> is in Git but not in the cluster: <b>missing</b>. Sync will create it.', parts: [{ type: 'table', label: 'findings so far', columns: ['kind', 'object', 'action'], rows: findings.slice(), hl: { [findings.length - 1]: 'bad' } }] }); return; }
          Object.keys(want[o]).sort().forEach(function (fl) {
            var lv = have[o][fl] === undefined ? '(none)' : have[o][fl];
            if (lv !== want[o][fl]) { findings.push(['DRIFT', o + '.' + fl, lv + ' → ' + want[o][fl]]); f.push({ narr: '<b>' + o + '.' + fl + '</b> is <code>' + lv + '</code> live but <code>' + want[o][fl] + '</code> in Git: <b>drift</b>. With <code>selfHeal</code> the controller patches it back; without, it only shows OutOfSync.', parts: [{ type: 'table', label: 'findings so far', columns: ['kind', 'object', 'action'], rows: findings.slice(), hl: { [findings.length - 1]: 'cur' } }] }); }
            else f.push({ narr: '<b>' + o + '.' + fl + '</b> matches (' + lv + '). Fields that only exist live (status, defaults, uid) are not compared.', parts: [{ type: 'table', label: 'findings so far', columns: ['kind', 'object', 'action'], rows: findings.length ? findings.slice() : [['-', 'all good so far', '-']] }] });
          });
        });
        Object.keys(have).sort().forEach(function (o) { if (!want[o]) { findings.push(['EXTRA', o, 'prune if prune=true']); f.push({ narr: '<b>' + o + '</b> carries this app\'s tracking label but is no longer in Git: <b>extra</b>. Only deleted when pruning is enabled, because deleting is the risky action.', parts: [{ type: 'table', label: 'findings so far', columns: ['kind', 'object', 'action'], rows: findings.slice(), hl: { [findings.length - 1]: 'bad' } }] }); } });
        f.push({ narr: findings.length ? '<b>Result: OutOfSync</b> with ' + findings.length + ' finding(s). The fix for every one of them is in Git or in sync settings, never a second hand edit.' : '<b>Result: Synced.</b> Live matches Git; nothing to do until the next commit or the next interval.', parts: [{ type: 'table', label: 'sync status', columns: ['kind', 'object', 'action'], rows: findings.length ? findings : [['InSync', '-', '-']] }] });
        return pad4(f, 'Done.');
      }
    }],
    examples: [
      { title: 'Situation: a hand-scaled Deployment comes back', html: `<p>During an incident an engineer ran <code>kubectl scale deploy/web --replicas=10</code>. Three minutes later it was back to 3. That is <code>selfHeal</code> working as designed. The right move during an incident is either a quick commit (<code>replicas: 10</code>, reviewed later) or pausing auto-sync for that one app on purpose and writing it down.</p>`, code: SH(R`kubectl scale deploy/web -n shop --replicas=10   # reverted by selfHeal within minutes
argocd app get shop --show-operation              # shows OutOfSync, then a self-heal sync
argocd app set shop --sync-policy none            # emergency: stop auto-sync for THIS app (record it!)
# better: commit the change so Git stays the truth
git -C config-repo commit -am "shop: scale web to 10 during INC-142" && git -C config-repo push`) },
      { title: 'Where does CI stop? It commits, it does not deploy', html: `<p>The last CI step writes the new tag into the config repo. No kubeconfig, no cluster network access. A token that can push to one repository is far less dangerous than cluster-admin.</p>`, code: SH(R`# last CI step (GitHub Actions run: block). IMAGE_TAG comes from the build step.
git clone "https://x-access-token:$CONFIG_REPO_TOKEN@github.com/example-org/config.git" cfg
cd cfg/envs/dev
kustomize edit set image ghcr.io/example-org/web="ghcr.io/example-org/web:$IMAGE_TAG"
git commit -am "dev: web $IMAGE_TAG" && git push origin main`) },
      { title: 'Seeing drift from the command line', html: `<p>Both tools can show you the diff before they act. <code>argocd app diff</code> compares Git with live; <code>flux diff kustomization</code> renders the local folder and runs a server-side dry run against the cluster.</p>`, code: SH(R`argocd app diff shop                                # exit code 1 when there is a diff
argocd app get shop -o json | jq '.status.sync.status, .status.health.status'
flux diff kustomization apps --path ./clusters/prod/apps
flux get kustomizations -A                          # READY, last applied revision, message`) }
    ],
    problems: [P({
      t: 'Drift report: compare desired and live', l: 'Medium', tags: ['gitops', 'reconcile', 'drift'], co: ['Intuit', 'Weaveworks', 'Akuity'],
      s: `<p>Write <code>drift_report(desired, live)</code>. Each list holds objects as text: <code>"Kind/name key=value key=value"</code>. Return a <b>sorted</b> list of findings:</p><ul><li><code>MISSING Kind/name</code>: in desired, not live;</li><li><code>EXTRA Kind/name</code>: live, not desired (a prune candidate);</li><li><code>DRIFT Kind/name key: liveValue-&gt;desiredValue</code> for every key in <i>desired</i> whose live value differs (use <code>&lt;none&gt;</code> if the key is absent live).</li></ul><p>Keys that exist only live (defaults, status) are ignored. If there are no findings return <code>["InSync"]</code>.</p>`,
      c: PYC,
      ex: `<p>Desired <code>Deployment/web replicas=3 image=web:1.4</code>, live <code>Deployment/web replicas=5 image=web:1.4</code> → ${H.c('y', '["DRIFT Deployment/web replicas: 5-&gt;3"]')}. A live-only key like <code>paused=false</code> is not drift.</p>`,
      bw: `<p>Comparing the two text lines as whole strings reports drift for every object that has any extra live field, and Kubernetes adds many (defaults, annotations). That is exactly the "always OutOfSync" problem: compare only what Git declares.</p>`,
      bc: R`def drift_report(desired, live):
    out = []
    for line in desired:
        if line not in live:          # whole-line compare: extra live fields = false drift
            out.append("DRIFT " + line.split()[0])
    return out or ["InSync"]`, bcl: 'python',
      q: ['Live has <code>Deployment/web replicas=3 paused=false</code>, Git has <code>Deployment/web replicas=3</code>. What should the report say?', ['InSync: paused is not declared in Git', 'DRIFT paused', 'EXTRA Deployment/web', 'MISSING Deployment/web'], 0, 'The controller compares only the fields the desired state declares; defaults and status are ignored.'],
      h: ['<p>Hint 1: turn each list into a map from object name to its own key/value map first.</p>', '<p>Hint 2: three loops: desired objects missing live, desired keys with a different live value, live objects not in desired.</p>', '<p>Hint 3: use <code>&lt;none&gt;</code> for an absent live key, sort the final list, and return <code>["InSync"]</code> when it is empty.</p>'],
      a: `<p>Parse both sides into <code>{name: {key: value}}</code>. Walk the desired side: a missing name is MISSING; otherwise compare only the declared keys (that is the "ignore defaults" rule). Then walk the live side for names Git no longer has: EXTRA. Sort for a stable report, the same way the UI lists resources in a stable order.</p>`,
      code: PY(R`def _parse(lines):
    out = {}
    for line in lines:
        parts = line.split()
        if not parts:
            continue
        kv = {}
        for tok in parts[1:]:
            k, _, v = tok.partition("=")
            kv[k] = v
        out[parts[0]] = kv
    return out

def drift_report(desired, live):
    want, have, out = _parse(desired), _parse(live), []
    for name, fields in want.items():
        if name not in have:
            out.append("MISSING " + name)
            continue
        for key in sorted(fields):
            now = have[name].get(key, "<none>")
            if now != fields[key]:
                out.append("DRIFT %s %s: %s->%s" % (name, key, now, fields[key]))
    for name in have:
        if name not in want:
            out.append("EXTRA " + name)
    return sorted(out) or ["InSync"]`),
      cx: `<p>O(total fields + F log F) for F findings: one pass over each side plus the final sort.</p>`,
      f: ['Real controllers compare after normalising (quantities like <code>1000m</code> vs <code>1</code>, defaulted fields). Why does server-side diff help? (the API server computes the result of the apply, so defaults match)', 'Should EXTRA objects be deleted automatically? (only with prune, ideally with PruneLast and a finalizer you understand)'],
      tests: { sig: 'string[] string[] -> string[]', fn: 'driftReport', cases: [[[["Deployment/web replicas=3 image=web:1.4", "Service/web port=80"], ["Deployment/web replicas=5 image=web:1.4", "Service/web port=80"]], ["DRIFT Deployment/web replicas: 5->3"]], [[["Deployment/web replicas=3"], ["Deployment/web replicas=3"]], ["InSync"]], [[["Deployment/web replicas=3", "ConfigMap/cfg mode=prod"], ["Deployment/web replicas=3"]], ["MISSING ConfigMap/cfg"]], [[["Deployment/web replicas=3"], ["Deployment/web replicas=3", "Job/debug image=busybox"]], ["EXTRA Job/debug"]], [[["Deployment/web replicas=3 image=web:1.4"], ["Deployment/web replicas=3 image=web:1.3 paused=false"]], ["DRIFT Deployment/web image: web:1.3->web:1.4"]], [[["Deployment/web replicas=2 tier=front"], ["Deployment/web replicas=2"]], ["DRIFT Deployment/web tier: <none>->front"]], [[[], []], ["InSync"]], [[[], ["Secret/old"]], ["EXTRA Secret/old"]], [[["Service/a port=80", "Service/b port=81"], ["Service/b port=8080", "Service/c port=1"]], ["DRIFT Service/b port: 8080->81", "EXTRA Service/c", "MISSING Service/a"]]] }
    })],
    deepDive: `<p>🟣 <b>How the diff really works.</b> Argo CD keeps a cache of every live object in the destination cluster through watches (the <i>gitops-engine</i> library). It renders Git, then normalises both sides: it strips fields the API server fills in, applies <code>ignoreDifferences</code> rules (JSON pointers, jq paths, or whole <code>managedFieldsManagers</code> such as the HPA controller), and compares. With the <code>ServerSideDiff=true</code> option it asks the API server for a dry-run apply instead, which removes most false OutOfSync caused by defaults and mutating webhooks.</p>
      <p>🟣 <b>Tracking: how does the agent know an object is "its own"?</b> Argo CD 3.x tracks by the annotation <code>argocd.argoproj.io/tracking-id</code> by default (2.x defaulted to the label <code>app.kubernetes.io/instance</code>, which clashed with Helm charts that set the same label). Flux sets <code>kustomize.toolkit.fluxcd.io/name</code> and <code>namespace</code> labels and keeps an inventory in the Kustomization status, and prunes from that inventory.</p>
      <p>🟣 <b>Pull, but how fast?</b> Polling every 3 minutes means a merged change can take minutes. Add a webhook from the Git host to Argo CD (<code>/api/webhook</code>) or a Flux <code>Receiver</code>, and changes apply in seconds. At scale, the repo-server render step (Helm, Kustomize) and the number of watched objects dominate; sharding the application controller and caching manifests matter.</p>
      <p>🟣 <b>Limits of "Git is the truth".</b> Some state is not declarative: database contents, PVC data, certificates issued at runtime, autoscaled replica counts. Leave those out of Git or ignore those fields; GitOps manages the <i>shape</i> of the system, backups manage its data.</p>`,
    aiEra: `<p>🤖 GitOps and AI fit well together because every change is a reviewed text diff. An assistant can draft the config-repo PR (bump a tag, add an overlay), explain an OutOfSync diff in plain words, or propose an <code>ignoreDifferences</code> rule. Keep the human gate: an AI agent should open pull requests, never hold cluster write credentials, and never be the one turning off <code>selfHeal</code>. Ask it to show the rendered diff (<code>argocd app diff</code>, <code>flux diff</code>) with every PR, and treat "always OutOfSync" suggestions with care: ignoring a field forever can hide real drift.</p>`
  });

  // ───────────────────────── Topic 2: Argo CD Application, sync, health, waves, hooks ─────────────────────────
  topics.push({
    title: 'Argo CD Applications: Sync Policies, Health, Waves and Hooks',
    analogy: `<p>An Argo CD <b>Application</b> is a work order on a building site: "build what is on drawing set X (repo, folder, revision) on plot Y (cluster, namespace)". The <b>sync policy</b> says whether the foreman starts on his own or waits for a signature. <b>Sync waves</b> are the order of trades: foundations before walls, walls before roof. <b>Hooks</b> are the inspections: one before work starts (database migration), one after (smoke test). <b>Health</b> is the inspector's report: is the wall merely <i>built</i>, or actually <i>standing</i>?</p>`,
    explain: `<p>🟢 <b>The Application object</b> (<code>argoproj.io/v1alpha1</code>, kind <code>Application</code>, usually in the <code>argocd</code> namespace) joins three things: a <b>source</b> (Git repo URL, <code>targetRevision</code> such as <code>main</code> or a tag, and a <code>path</code>; or a Helm chart), a <b>destination</b> (cluster <code>server</code> or <code>name</code> plus <code>namespace</code>), and a <b>project</b> (the guard rails, next topic).</p>
      <p>🟢 <b>Two independent statuses.</b> <b>Sync status</b> answers "does live match Git?" (<code>Synced</code>, <code>OutOfSync</code>). <b>Health status</b> answers "is it working?" (<code>Healthy</code>, <code>Progressing</code>, <code>Degraded</code>, <code>Suspended</code>, <code>Missing</code>, <code>Unknown</code>). An app can be Synced and Degraded (you deployed a broken image exactly as Git said) or OutOfSync and Healthy (someone scaled up by hand).</p>
      <p>🔵 <b>Sync policy switches.</b></p>
      ${H.table(['Setting', 'Effect', 'Use it when'], [
        ['no <code>automated</code>', 'Argo CD only reports; a human clicks Sync or runs <code>argocd app sync</code>', 'prod with change windows, or while learning'],
        ['<code>automated: {}</code>', 'new commits are applied automatically', 'dev and staging, most prod with good tests'],
        ['<code>prune: true</code>', 'objects removed from Git are deleted', 'almost always, together with review'],
        ['<code>selfHeal: true</code>', 'hand edits are reverted (sync again when live drifts)', 'when Git must be the only way in'],
        ['<code>syncOptions</code>', '<code>CreateNamespace=true</code>, <code>ServerSideApply=true</code>, <code>PruneLast=true</code>, <code>ApplyOutOfSyncOnly=true</code>, <code>RespectIgnoreDifferences=true</code>', 'per-app tuning'],
        ['<code>retry</code>', '<code>limit</code> and exponential <code>backoff</code> for failed syncs', 'CRDs that arrive a few seconds late, webhooks starting up']
      ])}
      <p>🔵 <b>Health checks.</b> Argo CD knows built-in kinds: a Deployment is Healthy when the new ReplicaSet is fully rolled out and available, a Service of type LoadBalancer when it has an address, a PVC when Bound, an Ingress when it has an address. Unknown CRDs are Healthy unless you add a <b>custom health check</b> written in Lua in <code>argocd-cm</code> (<code>resource.customizations.health.&lt;group&gt;_&lt;Kind&gt;</code>). The app's health is the worst health of its resources.</p>
      <p>🔵 <b>Sync phases, waves and hooks.</b> A sync runs in phases: <code>PreSync</code> → <code>Sync</code> → <code>PostSync</code> (and <code>SyncFail</code> if it fails). Inside each phase, resources are grouped by the annotation <code>argocd.argoproj.io/sync-wave</code> (an integer, default 0, negatives allowed), lowest first. Inside a wave, Argo CD applies by kind (Namespaces, then ServiceAccounts, Secrets, ConfigMaps, ... Services, Deployments, ... Ingresses), then by name. <b>Between waves it waits until the previous wave is Healthy.</b> Hooks are resources annotated <code>argocd.argoproj.io/hook: PreSync</code> (etc.), typically Jobs, cleaned up by <code>argocd.argoproj.io/hook-delete-policy: HookSucceeded | HookFailed | BeforeHookCreation</code>.</p>
      <p>🔵 <b>Helm hooks map across.</b> Argo CD renders Helm charts with <code>helm template</code>, so there is no Helm release; it translates <code>helm.sh/hook: pre-install/pre-upgrade</code> to <code>PreSync</code> and <code>post-install/post-upgrade</code> to <code>PostSync</code>. <code>helm list</code> shows nothing for Argo-managed charts, which surprises people coming from devops14.</p>`,
    clues: [
      '"Run the DB migration before the new pods start" → a <code>PreSync</code> hook Job (or an earlier sync wave), with <code>BeforeHookCreation</code> delete policy',
      '"Create the namespace and the CRD before the app" → negative sync waves, or <code>CreateNamespace=true</code>',
      '"Synced but Degraded" → the manifest was applied, the workload is not healthy: read events, not Git',
      '"My CRD always shows Healthy even when it is broken" → write a Lua custom health check',
      '"Prod deploys only after a human approves" → no <code>automated</code> on the prod Application (or a sync window)',
      '"Something removed from Git is still running" → <code>prune</code> is off'
    ],
    code: [Y(`apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: shop-dev
  namespace: argocd
  finalizers:
    - resources-finalizer.argocd.argoproj.io   # delete the app = delete its resources
spec:
  project: shop
  source:
    repoURL: https://github.com/example-org/config.git
    targetRevision: main
    path: envs/dev/shop
  destination:
    server: https://kubernetes.default.svc     # the cluster Argo CD runs in
    namespace: shop-dev
  syncPolicy:
    automated:
      prune: true          # delete what was removed from Git
      selfHeal: true       # revert hand edits
    syncOptions:
      - CreateNamespace=true
      - ServerSideApply=true
      - PruneLast=true     # delete leftovers only after everything else is healthy
    retry:
      limit: 5
      backoff: { duration: 10s, factor: 2, maxDuration: 3m }
  ignoreDifferences:
    - group: apps
      kind: Deployment
      jsonPointers: [/spec/replicas]           # an HPA owns replicas`, 'application-shop-dev.yaml'),
      Y(`apiVersion: batch/v1
kind: Job
metadata:
  name: db-migrate
  annotations:
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/hook-delete-policy: BeforeHookCreation
    argocd.argoproj.io/sync-wave: "-1"
spec:
  backoffLimit: 1
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: migrate
          image: ghcr.io/example-org/shop-migrations:1.8.0
          args: ["migrate", "up"]
          envFrom:
            - secretRef: { name: shop-db }     # Secret created elsewhere (topic 7)`, 'presync-migration.yaml')],
    codeTitle: ['An Application with auto-sync, prune and self-heal', 'A PreSync migration hook'],
    viz: [{
      title: 'Sync phases and waves: in which order is everything applied?',
      input: 'Deployment/web Sync 0, Service/web Sync 0, Job/migrate PreSync 0, Namespace/shop Sync -1, ConfigMap/cfg Sync 0, Job/smoke PostSync 0, Ingress/web Sync 1',
      inputLabel: 'comma-separated: Kind/name Phase wave   (Phase = PreSync | Sync | PostSync)',
      gen: function (input) {
        var items = String(input || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean).map(function (s) {
          var m = s.match(/^(\w+)\/([\w.-]+)\s+(PreSync|Sync|PostSync)\s+(-?\d+)$/);
          if (!m) throw new Error('Bad item "' + s + '": write Kind/name Phase wave, e.g. Job/migrate PreSync 0');
          var k = KIND_ORDER.indexOf(m[1]);
          return { kind: m[1], name: m[2], phase: m[3], wave: parseInt(m[4], 10), ko: k < 0 ? KIND_ORDER.length : k };
        });
        if (!items.length || items.length > 14) throw new Error('Use 1 to 14 resources');
        items.sort(function (a, b) { return PHASES.indexOf(a.phase) - PHASES.indexOf(b.phase) || a.wave - b.wave || a.ko - b.ko || (a.kind < b.kind ? -1 : a.kind > b.kind ? 1 : 0) || (a.name < b.name ? -1 : 1); });
        var rows = items.map(function (it) { return [it.phase, String(it.wave), it.kind + '/' + it.name, 'waiting']; }), f = [];
        f.push({ narr: 'Argo CD sorts by <b>phase</b> (PreSync, Sync, PostSync), then <b>wave</b> (lowest first), then <b>kind</b> (Namespace, ServiceAccount, Secret, ConfigMap, ... Service, Deployment, ... Ingress), then name. Unknown kinds (your CRDs\' objects) go last in a wave.', parts: [{ type: 'table', label: 'sync plan', columns: ['phase', 'wave', 'resource', 'state'], rows: rows.map(function (r) { return r.slice(); }) }] });
        var i = 0;
        while (i < items.length) {
          var j = i; while (j < items.length && items[j].phase === items[i].phase && items[j].wave === items[i].wave) j++;
          var hl = {};
          for (var k = i; k < j; k++) { rows[k][3] = 'applying'; hl[k] = 'cur'; }
          for (k = 0; k < i; k++) hl[k] = 'done';
          f.push({ narr: '<b>' + items[i].phase + ', wave ' + items[i].wave + '</b>: apply ' + (j - i) + ' resource(s) together. ' + (items[i].phase !== 'Sync' ? 'These are hooks: Argo CD waits for the Job to complete successfully.' : 'Argo CD then waits until they are <b>Healthy</b> before moving on.'), parts: [{ type: 'table', label: 'sync plan', columns: ['phase', 'wave', 'resource', 'state'], rows: rows.map(function (r) { return r.slice(); }), hl: hl }] });
          for (k = i; k < j; k++) rows[k][3] = 'healthy ✓';
          i = j;
        }
        var all = {}; rows.forEach(function (r, x) { all[x] = 'ok'; });
        f.push({ narr: 'Every wave became healthy, so the sync <b>succeeded</b>. If any hook or wave had failed, the remaining waves would not run and <code>SyncFail</code> hooks (if any) would run instead.', parts: [{ type: 'table', label: 'sync plan', columns: ['phase', 'wave', 'resource', 'state'], rows: rows, hl: all }] });
        return pad4(f, 'Done.');
      }
    }],
    examples: [
      { title: 'Install Argo CD on kind and log in (lab)', html: `<p>The initial admin password is generated into a Secret; read it, log in, change it, then delete that Secret. Port-forward keeps the lab off the internet.</p>`, code: SH(R`kind create cluster --name gitops
kubectl create namespace argocd
kubectl apply -n argocd --server-side --force-conflicts -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
kubectl -n argocd rollout status deploy/argocd-server
kubectl -n argocd port-forward svc/argocd-server 8080:443 &
argocd admin initial-password -n argocd          # prints the generated password
argocd login localhost:8080 --username admin --insecure
argocd account update-password                   # then: kubectl -n argocd delete secret argocd-initial-admin-secret`) },
      { title: 'Create, sync and inspect an app from the CLI', html: `<p>The CLI and the YAML create the same object. In a real team the YAML lives in Git (that is what app-of-apps is for); the CLI is for labs and debugging.</p>`, code: SH(R`argocd app create guestbook \
  --repo https://github.com/argoproj/argocd-example-apps.git --path guestbook \
  --dest-server https://kubernetes.default.svc --dest-namespace guestbook \
  --sync-option CreateNamespace=true
argocd app sync guestbook --prune
argocd app wait guestbook --health --timeout 300
argocd app history guestbook
argocd app rollback guestbook 1      # only works while auto-sync is off; otherwise revert in Git`) },
      { title: 'A custom health check for a CRD', html: `<p>Without it, a <code>Certificate</code> that never gets issued shows Healthy. The Lua script reads <code>status.conditions</code> and returns a status and message. cert-manager already ships a built-in check; this is the pattern for your own CRDs.</p>`, code: Y(R`apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  resource.customizations.health.example.com_Database: |
    hs = { status = "Progressing", message = "waiting for status" }
    if obj.status ~= nil and obj.status.conditions ~= nil then
      for _, c in ipairs(obj.status.conditions) do
        if c.type == "Ready" and c.status == "True" then
          hs.status = "Healthy"; hs.message = c.message
        elseif c.type == "Ready" and c.status == "False" then
          hs.status = "Degraded"; hs.message = c.message
        end
      end
    end
    return hs`, 'argocd-cm health check') }
    ],
    problems: [P({
      t: 'Plan a sync: phases, waves and kind order', l: 'Medium', tags: ['argocd', 'sync-waves', 'hooks'], co: ['Intuit', 'Red Hat', 'Adobe'],
      s: `<p>Write <code>sync_plan(resources)</code>. Each item is <code>"Kind/name Phase wave"</code> with Phase in <code>PreSync</code>, <code>Sync</code>, <code>PostSync</code> and an integer wave. Return the apply order as <code>"Phase wave: Kind/name"</code>, sorted by phase, then wave, then kind using this (simplified) Argo CD order: <code>Namespace, ServiceAccount, Secret, ConfigMap, PersistentVolumeClaim, CustomResourceDefinition, Role, RoleBinding, Service, Deployment, StatefulSet, Job, Ingress</code> (any other kind after these, by kind name), then name.</p>`,
      c: PYC,
      ex: `<p><code>["Deployment/web Sync 0", "Job/migrate PreSync 0", "Service/web Sync 0"]</code> → ${H.c('g', '["PreSync 0: Job/migrate", "Sync 0: Service/web", "Sync 0: Deployment/web"]')}. The hook runs first; inside wave 0 the Service goes before the Deployment because of kind order.</p>`,
      bw: `<p>Sorting by wave alone mixes hooks with normal resources and lets a PostSync smoke test run before the Deployment. Phase is the first key, wave the second.</p>`,
      bc: R`def sync_plan(resources):
    items = [r.split() for r in resources]
    items.sort(key=lambda t: int(t[2]))         # wave only: phases get mixed
    return ["%s %s: %s" % (t[1], t[2], t[0]) for t in items]`, bcl: 'python',
      q: ['A Job has <code>hook: PostSync</code> and <code>sync-wave: "-10"</code>. A Deployment has no annotations. Which runs first?', ['The Deployment: phase comes before wave', 'The Job: -10 is the lowest wave', 'They run together', 'Argo CD rejects negative waves'], 0, 'Waves order resources inside a phase. PostSync only starts after the Sync phase is healthy.'],
      h: ['<p>Hint 1: this is a sort with a compound key.</p>', '<p>Hint 2: key = (phase index, wave as int, kind index or len(order) for unknown, kind, name).</p>', '<p>Hint 3: parse the wave with <code>int()</code> so <code>-1</code> sorts before <code>0</code> and <code>10</code> after <code>9</code>.</p>'],
      a: `<p>Map each phase and kind to an index, parse waves as integers, and sort by the tuple (phase, wave, kind index, kind, name). Unknown kinds get the index after the list, and the kind name breaks ties among them, which is how custom resources land at the end of a wave.</p>`,
      code: PY(R`KIND_ORDER = ["Namespace",
              "ServiceAccount",
              "Secret",
              "ConfigMap",
              "PersistentVolumeClaim",
              "CustomResourceDefinition",
              "Role",
              "RoleBinding",
              "Service",
              "Deployment",
              "StatefulSet",
              "Job",
              "Ingress"]

PHASES = ["PreSync", "Sync", "PostSync"]

def sync_plan(resources):
    items = []
    for r in resources:
        ref, phase, wave = r.split()
        kind, name = ref.split("/", 1)
        k = KIND_ORDER.index(kind) if kind in KIND_ORDER else len(KIND_ORDER)
        items.append((PHASES.index(phase), int(wave), k, kind, name, phase))
    items.sort(key=lambda t: (t[0], t[1], t[2], t[3], t[4]))
    return ["%s %d: %s/%s" % (t[5], t[1], t[3], t[4]) for t in items]`),
      cx: `<p>O(n log n) for the sort.</p>`,
      f: ['Why does Argo CD wait for health between waves? (so a Deployment does not start before its ConfigMap or CRD is ready)', 'What does <code>BeforeHookCreation</code> solve? (re-running a hook Job with the same name fails while the old Job still exists)'],
      tests: { sig: 'string[] -> string[]', fn: 'syncPlan', cases: [[[["Deployment/web Sync 0", "Job/migrate PreSync 0", "Service/web Sync 0", "Job/smoke PostSync 0"]], ["PreSync 0: Job/migrate", "Sync 0: Service/web", "Sync 0: Deployment/web", "PostSync 0: Job/smoke"]], [[["Deployment/api Sync 1", "ConfigMap/cfg Sync 0", "Namespace/shop Sync -1"]], ["Sync -1: Namespace/shop", "Sync 0: ConfigMap/cfg", "Sync 1: Deployment/api"]], [[["Deployment/b Sync 0", "Deployment/a Sync 0"]], ["Sync 0: Deployment/a", "Sync 0: Deployment/b"]], [[["Widget/x Sync 0", "Ingress/web Sync 0", "Secret/s Sync 0"]], ["Sync 0: Secret/s", "Sync 0: Ingress/web", "Sync 0: Widget/x"]], [[["Job/a PostSync 5", "Job/b PreSync -5", "Service/x Sync 3"]], ["PreSync -5: Job/b", "Sync 3: Service/x", "PostSync 5: Job/a"]], [[["Deployment/db Sync 2", "StatefulSet/db Sync 1", "CustomResourceDefinition/crd Sync 0", "Role/r Sync 0"]], ["Sync 0: CustomResourceDefinition/crd", "Sync 0: Role/r", "Sync 1: StatefulSet/db", "Sync 2: Deployment/db"]], [[[]], []]] }
    })],
    deepDive: `<p>🟣 <b>Sync is an operation, not a state.</b> Each sync creates an <code>operation</code> on the Application with a revision and result; <code>argocd app history</code> lists them. A running operation can be terminated (<code>argocd app terminate-op</code>). With auto-sync, Argo CD will not retry the <i>same</i> revision automatically after a failure unless <code>retry</code> is set; a new commit triggers a new attempt.</p>
      <p>🟣 <b>Rollback.</b> <code>argocd app rollback</code> re-applies an older revision but is refused while auto-sync is on, because auto-sync would immediately go back to Git HEAD. The GitOps way is <code>git revert</code>: the fix is reviewed, recorded and applied by the same loop.</p>
      <p>🟣 <b>Server-side apply and big CRDs.</b> Client-side apply stores the whole object in the <code>last-applied-configuration</code> annotation, which fails for objects over 256 KB (large CRDs). <code>ServerSideApply=true</code> avoids this and gives field ownership. <code>Replace=true</code> and <code>Force=true</code> exist for immutable-field changes but delete and recreate, which can cause downtime.</p>
      <p>🟣 <b>Argo CD 3.x notes.</b> 3.0 made annotation-based tracking the default, stopped fine-grained <code>update</code>/<code>delete</code> RBAC from silently covering sub-resources, enforced the <code>logs</code> RBAC permission, and removed long-deprecated settings. Read the upgrade notes before moving a 2.x install, and test sync behaviour on a staging Argo CD first.</p>`,
    aiEra: `<p>🤖 Assistants write Application YAML quickly and are useful for translating a Helm chart's hooks into sync waves or drafting a Lua health check. Typical mistakes to check: inventing sync options that do not exist, putting <code>sync-wave</code> values as numbers instead of quoted strings, forgetting that waves only order within a phase, and suggesting <code>argocd app rollback</code> while auto-sync is on. Give it your real Application and the output of <code>argocd app get</code>, and ask it to explain <i>why</i> an app is OutOfSync or Degraded before it proposes a fix.</p>`
  });

  // ───────────────────────── Topic 3: App-of-apps, ApplicationSets, AppProjects ─────────────────────────
  topics.push({
    title: 'App-of-Apps, ApplicationSets and Projects: GitOps at Fleet Scale',
    analogy: `<p>One work order per building is fine for a single street. For a whole city you write a <b>master work order</b> that says "build every work order in this folder" (app-of-apps), or you use a <b>stamp</b>: "for every plot on this list, and every building type in that catalogue, issue a work order named <i>type-plot</i>" (ApplicationSet). The <b>city zoning rules</b> (AppProject) say which drawing archives builders may use and which plots they may build on, whatever the work order says.</p>`,
    explain: `<p>🟢 <b>The bootstrap problem.</b> Applications are Kubernetes objects too. If you create them with <code>argocd app create</code>, they are not in Git and GitOps stops at the first step. The fix: keep Application manifests in Git and let one <b>root Application</b> sync that folder. That is the <b>app-of-apps</b> pattern: root app → folder of Application YAMLs → each one deploys a real workload.</p>
      <p>🟢 <b>ApplicationSet</b> (<code>argoproj.io/v1alpha1</code>, controller built into Argo CD since 2.3) generates Applications from a <b>template</b> plus <b>generators</b>:</p>
      ${H.table(['Generator', 'Produces one Application per ...', 'Typical use'], [
        ['<code>list</code>', 'element of a literal list', 'a handful of fixed environments'],
        ['<code>clusters</code>', 'cluster registered in Argo CD (filter by labels)', 'install the same add-ons on every prod cluster'],
        ['<code>git</code> directories / files', 'folder (or JSON/YAML file) in a repo', '"every folder under apps/ is an app": teams add a folder, get an app'],
        ['<code>matrix</code>', 'combination of two generators', 'every app × every cluster'],
        ['<code>merge</code>', 'item of a base generator, overridden by others', 'defaults per cluster plus a few exceptions'],
        ['<code>scmProvider</code>, <code>pullRequest</code>', 'repository in an org, open pull request', 'preview environments per PR']
      ])}
      <p>🔵 <b>Templating.</b> With <code>goTemplate: true</code> the template uses Go templates: <code>{{.name}}</code> (cluster name), <code>{{.path.basename}}</code> (last folder name), <code>{{.path.path}}</code>. The older default syntax is <code>{{name}}</code> and <code>{{path.basename}}</code>. Generated names must be unique; two combinations that render the same name make the ApplicationSet report an error instead of silently overwriting.</p>
      <p>🔵 <b>Deletion behaviour matters.</b> By default an ApplicationSet owns its Applications: delete a folder (git generator) or unlabel a cluster, and the Application is deleted, and with the resources finalizer, so are its workloads. Guard rails: <code>syncPolicy.preserveResourcesOnDeletion: true</code>, or the <code>applicationsSync: create-only | create-update</code> policy, and review PRs that delete folders like you review <code>DROP TABLE</code>.</p>
      <p>🔵 <b>AppProject: the security boundary.</b> Every Application belongs to a project. The project limits <code>sourceRepos</code> (which repos), <code>destinations</code> (which cluster + namespace pairs), <code>clusterResourceWhitelist</code> (which cluster-scoped kinds; empty means none), <code>namespaceResourceBlacklist</code>, <code>roles</code> with their own RBAC and tokens, and <code>syncWindows</code> (allow/deny syncs by cron schedule, e.g. no prod syncs on Friday evening). The <code>default</code> project allows everything: do not leave teams on it.</p>
      <p>🔵 <b>Multi-cluster.</b> One Argo CD can manage many clusters (<code>argocd cluster add CONTEXT</code> stores a Secret with credentials) — the "hub and spoke" model. The alternative is one Argo CD per cluster (simpler blast radius, more to operate). Many teams use a hub for small fleets and per-cluster or per-region instances at scale.</p>`,
    clues: [
      '"How do we put the Argo CD Applications themselves in Git?" → app-of-apps root Application',
      '"Every team folder should become an app automatically" → ApplicationSet with a git directory generator',
      '"Install cert-manager on all 40 prod clusters" → ApplicationSet with a clusters generator and a label selector',
      '"Team A must not deploy to team B\'s namespace" → AppProject destinations and sourceRepos, plus project roles',
      '"No production deploys during the freeze" → AppProject syncWindows (deny)',
      '"Preview environment per pull request" → pullRequest generator'
    ],
    code: [Y(`apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: apps-per-cluster
  namespace: argocd
spec:
  goTemplate: true
  goTemplateOptions: ["missingkey=error"]
  generators:
    - matrix:
        generators:
          - clusters:
              selector:
                matchLabels: { env: prod }
          - git:
              repoURL: https://github.com/example-org/config.git
              revision: main
              directories:
                - path: apps/*
  syncPolicy:
    preserveResourcesOnDeletion: true      # removing a generator item keeps workloads running
  template:
    metadata:
      name: "{{.path.basename}}-{{.name}}"
    spec:
      project: platform
      source:
        repoURL: https://github.com/example-org/config.git
        targetRevision: main
        path: "{{.path.path}}/overlays/prod"
      destination:
        server: "{{.server}}"
        namespace: "{{.path.basename}}"
      syncPolicy:
        automated: { prune: true, selfHeal: true }
        syncOptions: [CreateNamespace=true]`, 'applicationset.yaml'),
      Y(`apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: team-payments
  namespace: argocd
spec:
  description: Payments team, prod and staging
  sourceRepos:
    - https://github.com/example-org/payments-config.git
  destinations:
    - server: https://kubernetes.default.svc
      namespace: "payments-*"
  clusterResourceWhitelist: []          # no cluster-scoped objects (no ClusterRoles, no CRDs)
  namespaceResourceBlacklist:
    - group: ""
      kind: ResourceQuota               # quotas are owned by the platform team
  roles:
    - name: deployer
      policies:
        - p, proj:team-payments:deployer, applications, sync, team-payments/*, allow
      groups: [payments-oncall]
  syncWindows:
    - kind: deny
      schedule: "0 17 * * 5"            # Friday 17:00
      duration: 64h                     # until Monday 09:00
      applications: ["*"]
      manualSync: false`, 'appproject.yaml')],
    codeTitle: ['ApplicationSet: every app folder × every prod cluster', 'AppProject guard rails'],
    viz: [{
      title: 'ApplicationSet matrix: clusters × folders → Applications',
      input: 'clusters: dev prod ; dirs: apps/web apps/api ; template: {{path.basename}}-{{name}}',
      inputLabel: 'clusters: a b ; dirs: path path ; template: uses {{name}}, {{path}}, {{path.basename}}',
      gen: function (input) {
        var o = {};
        String(input || '').split(';').forEach(function (s) { var i = s.indexOf(':'); if (i > 0) o[s.slice(0, i).trim()] = s.slice(i + 1).trim(); });
        if (!o.clusters || !o.dirs || !o.template) throw new Error('Write: clusters: a b ; dirs: x/y ; template: {{path.basename}}-{{name}}');
        var cl = o.clusters.split(/\s+/).filter(Boolean), ds = o.dirs.split(/\s+/).filter(Boolean);
        if (cl.length * ds.length > 16) throw new Error('Keep clusters × dirs at 16 or fewer');
        var rows = [], seen = {}, f = [];
        f.push({ narr: 'Two generators feed a <b>matrix</b>: every cluster is paired with every folder (' + cl.length + ' × ' + ds.length + ' = ' + (cl.length * ds.length) + ' combinations). Each pair fills the template once.', parts: [{ type: 'set', label: 'clusters generator', items: cl }, { type: 'set', label: 'git directories generator', items: ds }] });
        cl.forEach(function (c) {
          ds.forEach(function (d) {
            var base = d.replace(/\/+$/, '').split('/').pop();
            var name = o.template.split('{{path.basename}}').join(base).split('{{path}}').join(d).split('{{name}}').join(c);
            var dup = !!seen[name]; seen[name] = true;
            rows.push([c, d, name, dup ? 'DUPLICATE' : 'ok']);
            var hl = {}; hl[rows.length - 1] = dup ? 'bad' : 'ok';
            f.push({ narr: 'Pair (<b>' + c + '</b>, <b>' + d + '</b>): <code>{{name}}</code> = ' + c + ', <code>{{path.basename}}</code> = ' + base + ' → Application <b>' + name + '</b>.' + (dup ? ' This name was already generated: the ApplicationSet reports an error, so make the template include both parts.' : ''), parts: [{ type: 'table', label: 'generated Applications', columns: ['cluster', 'folder', 'name', 'status'], rows: rows.map(function (r) { return r.slice(); }), hl: hl }] });
          });
        });
        f.push({ narr: 'The controller now owns these Applications. Add a folder or label a new cluster and a new Application appears; remove one and it is deleted (unless you preserve resources on deletion).', parts: [{ type: 'table', label: 'generated Applications', columns: ['cluster', 'folder', 'name', 'status'], rows: rows }] });
        return pad4(f, 'Done.');
      }
    }],
    examples: [
      { title: 'App-of-apps: one root Application', html: `<p>Apply this one object by hand (or with your bootstrap script). From then on, every Application is added by a pull request to <code>argocd/apps/</code>.</p>`, code: Y(`apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: root
  namespace: argocd
spec:
  project: platform
  source:
    repoURL: https://github.com/example-org/config.git
    targetRevision: main
    path: argocd/apps            # a folder full of Application and AppProject YAMLs
  destination:
    server: https://kubernetes.default.svc
    namespace: argocd
  syncPolicy:
    automated: { prune: true, selfHeal: true }`, 'root-app.yaml') },
      { title: 'Situation: a deleted folder took down a service', html: `<p>A cleanup PR removed <code>apps/legacy-api</code>. The git generator stopped producing that Application, Argo CD deleted it, and the resources finalizer deleted its Deployment, which another team still used. Fixes: <code>preserveResourcesOnDeletion: true</code> on the ApplicationSet, CODEOWNERS on <code>apps/</code>, and a CI check that lists Applications a PR would remove.</p>`, code: SH(R`# what Applications does the ApplicationSet produce right now?
argocd appset get apps-per-cluster
kubectl get applications -n argocd -l argocd.argoproj.io/application-set-name=apps-per-cluster
# CI guard: folders removed by this PR
git diff --name-status origin/main...HEAD -- apps/ | awk '$1=="D"' | cut -f2 | cut -d/ -f2 | sort -u`) },
      { title: 'Registering a second cluster (hub and spoke)', html: `<p><code>argocd cluster add</code> creates a ServiceAccount in the target cluster and stores its credentials as a Secret in the <code>argocd</code> namespace. Labels on that Secret drive the clusters generator.</p>`, code: SH(R`kind create cluster --name prod-eu
argocd cluster add kind-prod-eu --name prod-eu --label env=prod --label region=eu
argocd cluster list
kubectl -n argocd get secrets -l argocd.argoproj.io/secret-type=cluster --show-labels`) }
    ],
    problems: [P({
      t: 'ApplicationSet names: generate and catch duplicates', l: 'Easy', tags: ['argocd', 'applicationset', 'templating'], co: ['Spotify', 'Intuit'],
      s: `<p>Write <code>appset_names(clusters, dirs, template)</code>. For every cluster (outer loop) and every directory (inner loop), replace <code>{{path.basename}}</code> (last path segment, ignoring a trailing <code>/</code>), <code>{{path}}</code> (the directory) and <code>{{name}}</code> (the cluster) in the template. Return the names sorted. If any name is generated twice, return only <code>["DUPLICATE x"]</code> where x is the alphabetically smallest duplicated name.</p>`,
      c: PYC,
      ex: `<p>Clusters <code>dev, prod</code>, dirs <code>team-a/web, team-b/web</code>, template <code>{{path.basename}}-{{name}}</code> → both teams produce <code>web-dev</code> → ${H.c('r', '["DUPLICATE web-dev"]')}. Using <code>{{path}}</code> instead makes them unique.</p>`,
      bw: `<p>Storing names in a dict as you go silently keeps the last one: two teams' apps collapse into one Application and one team's workload disappears. The real controller refuses duplicates; so should the model.</p>`,
      q: ['Two folders <code>a/web</code> and <code>b/web</code>, template <code>{{path.basename}}</code>, one cluster. What happens?', ['The ApplicationSet reports a duplicate name error', 'Two Applications named web are created', 'The second folder wins', 'Argo CD appends -1 and -2'], 0, 'Application names must be unique in the namespace, so the controller reports the conflict.'],
      h: ['<p>Hint 1: two nested loops; the order does not matter for the final sorted answer.</p>', '<p>Hint 2: basename = <code>d.rstrip("/").split("/")[-1]</code>.</p>', '<p>Hint 3: count with a set of seen names and a set of duplicates; an empty cluster list gives an empty result.</p>'],
      a: `<p>Generate every combination with string replacement, track names already seen, and collect duplicates. If any duplicate exists, the whole set is invalid (the controller refuses to reconcile it), so return the smallest duplicate for a stable answer; otherwise return all names sorted.</p>`,
      code: PY(R`def appset_names(clusters, dirs, template):
    names = []
    for c in clusters:
        for d in dirs:
            n = (template.replace("{{path.basename}}", d.rstrip("/").split("/")[-1])
                         .replace("{{path}}", d).replace("{{name}}", c))
            names.append(n)
    seen, dups = set(), set()
    for n in names:
        if n in seen:
            dups.add(n)
        seen.add(n)
    if dups:
        return ["DUPLICATE " + sorted(dups)[0]]
    return sorted(names)`),
      cx: `<p>O(C × D × T) for C clusters, D dirs and template length T, plus sorting.</p>`,
      f: ['Why prefer <code>goTemplateOptions: ["missingkey=error"]</code>? (a typo in a key fails loudly instead of rendering an empty string)', 'How would you exclude one folder? (an <code>exclude: true</code> directory entry in the git generator)'],
      tests: { sig: 'string[] string[] string -> string[]', fn: 'appsetNames', cases: [[[["dev", "prod"], ["apps/web", "apps/api"], "{{path.basename}}-{{name}}"], ["api-dev", "api-prod", "web-dev", "web-prod"]], [[["eu"], ["apps/web/"], "{{name}}-{{path.basename}}"], ["eu-web"]], [[["dev", "prod"], ["team-a/web", "team-b/web"], "{{path.basename}}-{{name}}"], ["DUPLICATE web-dev"]], [[["dev", "prod"], ["team-a/web", "team-b/web"], "{{path}}-{{name}}"], ["team-a/web-dev", "team-a/web-prod", "team-b/web-dev", "team-b/web-prod"]], [[["a", "b"], ["x"], "static"], ["DUPLICATE static"]], [[[], ["apps/web"], "{{name}}"], []], [[["c1"], ["apps/web", "apps/api", "infra/ingress"], "{{name}}-{{path.basename}}"], ["c1-api", "c1-ingress", "c1-web"]]] }
    })],
    deepDive: `<p>🟣 <b>Apps in any namespace.</b> By default Applications must live in the <code>argocd</code> namespace, which makes the AppProject the only boundary. Argo CD supports Applications in other namespaces (<code>application.namespaces</code> setting plus the project's <code>sourceNamespaces</code>), so teams can own their Application objects with normal Kubernetes RBAC.</p>
      <p>🟣 <b>ApplicationSet security.</b> Whoever can edit the generator input can create Applications. A git files generator that reads JSON from a team repo lets that team choose the <code>project</code> field if the template uses it, so never template the project from untrusted input. The SCM and pull request generators need tokens: scope them read-only.</p>
      <p>🟣 <b>Progressive syncs.</b> ApplicationSet has an alpha <code>strategy: RollingSync</code> that syncs generated Applications in steps by label (e.g. env=dev first, then staging, then prod), and waits for health between steps. It is useful but still alpha: many teams prefer promotion through Git (topic 6).</p>
      <p>🟣 <b>Scale numbers.</b> Thousands of Applications per Argo CD instance are normal when you shard the application controller (by cluster), run several repo-server replicas, and use webhooks instead of short polling. Watch <code>argocd_app_reconcile</code> and repo-server queue metrics.</p>`,
    aiEra: `<p>🤖 Generators are a small language; assistants are good at drafting matrix and merge generators from a description ("every app folder on every prod cluster except the EU sandbox"). They often mix the two template syntaxes (<code>{{name}}</code> versus <code>{{.name}}</code>), forget to quote templates in YAML, or template the <code>project</code> from input. Verify with <code>argocd appset create --dry-run</code> (Argo CD 2.9+), read the generated names, and review deletion behaviour before merging. An agent that proposes deleting a folder should also list which Applications and workloads go away.</p>`
  });

  // ───────────────────────── Topic 4: Flux v2 controllers ─────────────────────────
  topics.push({
    title: 'Flux v2: a Toolkit of Small Controllers',
    analogy: `<p>Argo CD is one big kitchen with a head chef and a dining room (the UI). Flux is a row of food-truck specialists: one only <b>fetches groceries</b> (source-controller), one only <b>assembles plates</b> from recipes (kustomize-controller), one only <b>cooks Helm dishes</b> (helm-controller), one <b>rings the bell</b> when something is ready or burnt (notification-controller), and two <b>watch the market</b> for new image versions (image automation). Each truck is small and does one job; you connect them with order slips (custom resources).</p>`,
    explain: `<p>🟢 <b>Flux v2 is a set of controllers and CRDs</b> (the GitOps Toolkit). There is no central "app" object: you compose sources and appliers.</p>
      ${H.table(['Controller', 'Custom resources', 'Job'], [
        ['<b>source-controller</b>', '<code>GitRepository</code>, <code>OCIRepository</code>, <code>HelmRepository</code>, <code>HelmChart</code>, <code>Bucket</code>', 'fetch, verify and package sources as artifacts with a revision'],
        ['<b>kustomize-controller</b>', '<code>Kustomization</code> (<code>kustomize.toolkit.fluxcd.io/v1</code>)', 'build a folder with Kustomize, decrypt SOPS, apply server-side, prune, health-check'],
        ['<b>helm-controller</b>', '<code>HelmRelease</code> (<code>helm.toolkit.fluxcd.io/v2</code>)', 'install/upgrade real Helm releases with the Helm SDK, test, remediate, detect drift'],
        ['<b>notification-controller</b>', '<code>Provider</code>, <code>Alert</code>, <code>Receiver</code>', 'send events to Slack/Teams/GitHub status; receive webhooks to reconcile now'],
        ['<b>image-reflector</b> + <b>image-automation</b>', '<code>ImageRepository</code>, <code>ImagePolicy</code>, <code>ImageUpdateAutomation</code>', 'scan a registry, pick the newest allowed tag, commit it back to Git']
      ])}
      <p>🟢 <b>Do not confuse the two "Kustomizations".</b> <code>kustomization.yaml</code> (config.k8s.io) is Kustomize's own file in a folder. A Flux <code>Kustomization</code> object says "apply that folder from that source every 10 minutes, prune, wait for health".</p>
      <p>🔵 <b>Bootstrap.</b> <code>flux bootstrap github --owner=ORG --repository=fleet --path=clusters/prod</code> installs the controllers, commits their manifests to <code>clusters/prod/flux-system</code>, and creates a GitRepository + Kustomization pointing at that path. Flux now manages itself from Git: upgrading Flux is a commit.</p>
      <p>🔵 <b>Ordering with dependsOn.</b> A Kustomization or HelmRelease can list <code>dependsOn</code>. Flux will not apply <code>apps</code> until <code>infra</code> is Ready (applied and, with <code>wait: true</code> or <code>healthChecks</code>, healthy). Typical chain: <code>crds</code> → <code>infra</code> (ingress, cert-manager) → <code>apps</code>. A dependency that does not exist, or a cycle, leaves the dependent waiting with a "dependency not ready" message.</p>
      <p>🔵 <b>Helm the Flux way.</b> A <code>HelmRelease</code> creates a real Helm release (unlike Argo CD), so <code>helm list</code> and <code>helm history</code> work. It has <code>install.remediation.retries</code>, <code>upgrade.remediation</code> (rollback or uninstall on failure), <code>valuesFrom</code> (ConfigMaps/Secrets), <code>test.enable</code>, and <code>driftDetection.mode: enabled</code> to correct hand edits to the release's objects.</p>
      <p>🔵 <b>Everyday commands.</b> <code>flux get all -A</code>, <code>flux reconcile kustomization apps --with-source</code> (do it now), <code>flux suspend</code>/<code>resume</code> (pause one object during an incident), <code>flux events</code>, <code>flux logs</code>, <code>flux tree kustomization apps</code> (what it manages), <code>flux diff kustomization</code>.</p>`,
    clues: [
      '"No UI needed, everything as CRDs, Git-managed controllers" → Flux',
      '"Install CRDs before the operators that use them" → Flux <code>dependsOn</code> chain crds → infra → apps',
      '"I want helm list / helm history to keep working" → Flux HelmRelease (real Helm releases)',
      '"Bump the image tag in Git automatically when CI pushes a new semver tag" → Flux image automation',
      '"Reconcile now, do not wait 10 minutes" → <code>flux reconcile ... --with-source</code> or a Receiver webhook',
      '"Pause GitOps for one app during an incident" → <code>flux suspend kustomization NAME</code>'
    ],
    code: [Y(`apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: fleet
  namespace: flux-system
spec:
  interval: 1m
  url: https://github.com/example-org/fleet.git
  ref:
    branch: main
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infra
  namespace: flux-system
spec:
  interval: 10m
  sourceRef: { kind: GitRepository, name: fleet }
  path: ./infrastructure/prod
  prune: true
  wait: true                  # Ready only when everything it applied is healthy
  timeout: 5m
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  dependsOn:
    - name: infra             # never apply apps before ingress/cert-manager are ready
  interval: 10m
  retryInterval: 1m
  sourceRef: { kind: GitRepository, name: fleet }
  path: ./apps/prod
  prune: true
  targetNamespace: shop`, 'flux-sources-and-kustomizations.yaml'),
      Y(`apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: podinfo
  namespace: flux-system
spec:
  interval: 1h
  type: oci
  url: oci://ghcr.io/stefanprodan/charts
---
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: podinfo
  namespace: shop
spec:
  interval: 10m
  chart:
    spec:
      chart: podinfo
      version: "6.x"            # semver range: newest 6.y.z
      sourceRef: { kind: HelmRepository, name: podinfo, namespace: flux-system }
  install:
    remediation: { retries: 3 }
  upgrade:
    remediation: { retries: 3, strategy: rollback }
  driftDetection:
    mode: enabled               # revert hand edits to the release's objects
  values:
    replicaCount: 2
  valuesFrom:
    - kind: ConfigMap
      name: podinfo-prod-values`, 'helmrelease.yaml')],
    codeTitle: ['GitRepository + two Kustomizations with dependsOn', 'HelmRelease from an OCI Helm repository'],
    viz: [{
      title: 'Flux dependsOn: who can reconcile, and when?',
      input: 'apps:infra,monitoring monitoring:infra infra:crds crds: tenants:apps',
      inputLabel: 'name:dep1,dep2 ... (empty after the colon = no dependencies)',
      gen: function (input) {
        var deps = {}, names = [];
        String(input || '').trim().split(/\s+/).filter(Boolean).forEach(function (t) {
          var m = t.match(/^([\w-]+):([\w,-]*)$/); if (!m) throw new Error('Bad item "' + t + '": write name:dep1,dep2');
          deps[m[1]] = m[2].split(',').filter(Boolean); names.push(m[1]);
        });
        if (!names.length || names.length > 8) throw new Error('Use 1 to 8 Kustomizations');
        var nodes = names.map(function (n, i) { return box(n, n, 8 + (i % 4) * 28, 10 + Math.floor(i / 4) * 30, 18); });
        var edges = []; names.forEach(function (n) { deps[n].forEach(function (d) { if (deps[d]) edges.push([d, n]); }); });
        var ready = {}, f = [], round = 0;
        function g(hl, label) { return { type: 'graph', label: label, directed: true, height: 60, nodes: nodes, edges: edges, hl: hl }; }
        f.push({ narr: 'Arrows point from a dependency to the Kustomization that waits for it. Flux checks each object on its interval: "are all my <code>dependsOn</code> Ready?" If not, it waits and retries after <code>retryInterval</code>.', parts: [g({}, 'dependency graph')] });
        while (round < 10) {
          round++;
          var now = names.filter(function (n) { return !ready[n] && deps[n].every(function (d) { return ready[d]; }); });
          if (!now.length) break;
          var hl = {}; names.forEach(function (n) { if (ready[n]) hl[n] = 'done'; }); now.forEach(function (n) { hl[n] = 'cur'; });
          f.push({ narr: 'Round ' + round + ': <b>' + now.join(', ') + '</b> ' + (now.length > 1 ? 'have' : 'has') + ' every dependency Ready, so ' + (now.length > 1 ? 'they apply' : 'it applies') + ' (in parallel), waits for health, and becomes Ready.', parts: [g(hl, 'round ' + round)] });
          now.forEach(function (n) { ready[n] = true; });
        }
        var stuck = names.filter(function (n) { return !ready[n]; }), hl2 = {};
        names.forEach(function (n) { hl2[n] = ready[n] ? 'ok' : 'bad'; });
        f.push({ narr: stuck.length ? '<b>' + stuck.join(', ') + '</b> never become Ready: a dependency is missing (' + stuck.map(function (n) { return deps[n].filter(function (d) { return !deps[d]; }).join(',') || 'cycle'; }).join('; ') + ') or they wait on each other. Flux shows "dependency not ready" and keeps retrying; nothing is applied out of order.' : 'All Kustomizations are Ready. On the next commit the same order applies again, so CRDs always land before the objects that use them.', parts: [g(hl2, 'result')] });
        return pad4(f, 'Done.');
      }
    }],
    examples: [
      { title: 'Bootstrap Flux into a kind cluster', html: `<p>Bootstrap needs a GitHub token with repo rights; export it, never type it into the command line. After bootstrap, look at the commit Flux made to your repo.</p>`, code: SH(R`kind create cluster --name flux-lab
flux check --pre
export GITHUB_TOKEN="$(cat ~/.secrets/gh-flux-token)"   # placeholder path; fine-grained token, one repo
flux bootstrap github --owner=example-org --repository=fleet --branch=main \
  --path=clusters/lab --personal
flux get all -A
git -C fleet pull && ls fleet/clusters/lab/flux-system   # gotk-components.yaml, gotk-sync.yaml`) },
      { title: 'Incident: pause, fix, resume', html: `<p><code>flux suspend</code> stops reconciliation for one object so a hand fix survives while you investigate. Write the fix to Git, then resume. Suspended objects are easy to forget: alert on them.</p>`, code: SH(R`flux suspend kustomization apps -n flux-system
kubectl -n shop rollout undo deploy/web           # temporary hand fix
git -C fleet revert --no-edit HEAD && git -C fleet push
flux resume kustomization apps -n flux-system      # resume also triggers a reconcile
flux get kustomizations -A --status-selector ready=false`) },
      { title: 'Alerts to Slack and a GitHub webhook receiver', html: `<p>Notification-controller sends error events to Slack, and a Receiver turns a push webhook into an immediate reconcile. The Slack webhook URL lives in a Secret, created out of band.</p>`, code: Y(`apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata: { name: slack, namespace: flux-system }
spec:
  type: slack
  channel: deploys
  secretRef: { name: slack-webhook }      # key "address", created out of band
---
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata: { name: errors, namespace: flux-system }
spec:
  providerRef: { name: slack }
  eventSeverity: error
  eventSources:
    - { kind: Kustomization, name: "*" }
    - { kind: HelmRelease, name: "*" }
---
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata: { name: github, namespace: flux-system }
spec:
  type: github
  events: ["push"]
  secretRef: { name: receiver-token }
  resources:
    - { kind: GitRepository, name: fleet }`, 'notifications.yaml') }
    ],
    problems: [P({
      t: 'Flux dependsOn order with blocked items', l: 'Medium', tags: ['flux', 'dependsOn', 'topological-sort'], co: ['Weaveworks', 'Deutsche Telekom', 'SAP'],
      s: `<p>Write <code>flux_order(kustomizations)</code>. Each item is <code>"name:dep1,dep2"</code> (nothing after the colon = no dependencies). Return the order in which they become Ready, choosing the <b>alphabetically smallest</b> ready name each time. Items that can never become Ready (a missing dependency, a cycle, or depending on such an item) are appended as <code>"BLOCKED name"</code>, sorted by name.</p>`,
      c: PYC,
      ex: `<p><code>["apps:infra", "infra:crds", "crds:"]</code> → ${H.c('g', '["crds", "infra", "apps"]')}. <code>["a:b", "b:a", "c:"]</code> → ${H.c('y', '["c", "BLOCKED a", "BLOCKED b"]')}.</p>`,
      bw: `<p>Repeatedly scanning the list for an item whose dependencies are done is O(n²) and, written carelessly, loops forever on a cycle. Kahn's algorithm with a min-heap handles both in O((n + e) log n).</p>`,
      q: ['<code>apps</code> depends on <code>infra</code>, which depends on <code>infra-crds</code>, which does not exist. What happens in the cluster?', ['infra and apps wait forever with "dependency not ready"; nothing is applied out of order', 'Flux applies both anyway after a timeout', 'Flux deletes infra', 'apps applies, infra waits'], 0, 'dependsOn is strict: a missing or failing dependency blocks everything downstream.'],
      h: ['<p>Hint 1: this is a topological sort; a node is ready when all its dependencies are done.</p>', '<p>Hint 2: Kahn: in-degree per node, a min-heap of ready nodes, pop the smallest, decrement its users.</p>', '<p>Hint 3: mark a node with an unknown dependency as blocked from the start; whatever is never popped is blocked.</p>'],
      a: `<p>Build in-degrees only from known dependencies; a node with an unknown dependency is blocked forever. Push every unblocked zero in-degree node into a min-heap, pop the smallest, append it, and release its dependents. Nodes in a cycle (or downstream of a blocked node) never reach in-degree 0, so they are exactly the ones never popped.</p>`,
      code: PY(R`import heapq

def flux_order(kustomizations):
    deps = {}
    for item in kustomizations:
        name, _, rest = item.partition(":")
        deps[name] = [d for d in rest.split(",") if d]
    indeg = {n: 0 for n in deps}
    users = {n: [] for n in deps}
    blocked = set()
    for n, ds in deps.items():
        for d in ds:
            if d not in deps:
                blocked.add(n)
            else:
                indeg[n] += 1
                users[d].append(n)
    ready = [n for n in deps if indeg[n] == 0 and n not in blocked]
    heapq.heapify(ready)
    order = []
    while ready:
        n = heapq.heappop(ready)
        order.append(n)
        for u in users[n]:
            indeg[u] -= 1
            if indeg[u] == 0 and u not in blocked:
                heapq.heappush(ready, u)
    done = set(order)
    return order + ["BLOCKED " + n for n in sorted(deps) if n not in done]`),
      cx: `<p>O((n + e) log n) with a heap for n Kustomizations and e dependency edges.</p>`,
      f: ['Flux applies independent Kustomizations in parallel. Why does the model pick one at a time? (to give a single deterministic answer)', 'How would you show the user WHY an item is blocked? (keep the first missing or not-ready dependency per node)'],
      tests: { sig: 'string[] -> string[]', fn: 'fluxOrder', cases: [[[["apps:infra", "infra:crds", "crds:"]], ["crds", "infra", "apps"]], [[["b:", "a:", "c:a,b"]], ["a", "b", "c"]], [[["a:b", "b:a", "c:"]], ["c", "BLOCKED a", "BLOCKED b"]], [[["apps:infra", "infra:missing"]], ["BLOCKED apps", "BLOCKED infra"]], [[["x:"]], ["x"]], [[[]], []], [[["monitoring:infra", "apps:infra,monitoring", "infra:", "tenants:apps"]], ["infra", "monitoring", "apps", "tenants"]]] }
    })],
    deepDive: `<p>🟣 <b>Artifacts, not clones.</b> source-controller clones the repo, packages the requested path as a tarball artifact with a revision (<code>main@sha1:abc...</code>), and serves it over HTTP inside the cluster. Other controllers download the artifact. This decouples Git outages from applies and lets Flux verify commits (<code>spec.verify</code> with GPG or Sigstore cosign for OCI artifacts).</p>
      <p>🟣 <b>OCI as the transport.</b> <code>flux push artifact oci://registry/fleet:$(git rev-parse --short HEAD)</code> publishes manifests to a registry and an <code>OCIRepository</code> pulls them. Clusters then never need Git credentials, and signed artifacts give supply-chain guarantees. The same scanning, mirroring and retention you use for images now applies to config.</p>
      <p>🟣 <b>Multi-tenancy.</b> Flux impersonates a ServiceAccount per Kustomization (<code>spec.serviceAccountName</code>) and can be locked down with <code>--no-cross-namespace-refs</code> and a default service account, so a tenant's Kustomization can only do what its RBAC allows. This is the Flux counterpart to an Argo CD AppProject.</p>
      <p>🟣 <b>Health and wait.</b> With <code>wait: true</code> Flux uses kstatus to check every applied object (Deployments rolled out, Jobs complete, custom resources with a Ready condition). Without it, Ready means only "applied". Choose wait for anything that others depend on.</p>`,
    aiEra: `<p>🤖 Flux is all CRDs, so an assistant can generate a whole fleet layout (sources, Kustomizations, HelmReleases) from a description. Check API versions carefully: Flux promoted APIs to v1/v2 over several releases, and models often produce old <code>v1beta1</code> or <code>v2beta1</code> objects that newer controllers no longer serve. Run <code>flux check</code> and <code>flux build kustomization</code> (or <code>kustomize build</code>) in CI on every PR, and let the assistant explain <code>flux events</code> output when a Kustomization is stuck, rather than guessing.</p>`
  });

  // ───────────────────────── Topic 5: Kustomize overlays and Helm in GitOps ─────────────────────────
  topics.push({
    title: 'Kustomize Overlays and Helm in GitOps',
    analogy: `<p>Kustomize works like tracing paper. The <b>base</b> is the master drawing of the app. Each environment lays a sheet of tracing paper on top (an <b>overlay</b>) and draws only what is different: "4 replicas here", "this image tag", "this hostname". Nobody edits the master to make prod; you look through the stack. Helm is a form with blanks instead. In GitOps you often use both: Helm for third-party software, Kustomize for your own apps, and sometimes a Kustomize sheet on top of a rendered Helm chart.</p>`,
    explain: `<p>🟢 <b>Kustomize in one minute.</b> A folder with a <code>kustomization.yaml</code> lists <code>resources</code> (files or other folders). An overlay lists the base as a resource and adds changes. <code>kubectl kustomize DIR</code> (or <code>kustomize build</code>) prints the result. No templates, no blanks: every file is valid YAML on its own.</p>
      ${H.table(['Field', 'What it does', 'Example'], [
        ['<code>resources</code>', 'include files or folders (bases)', '<code>- ../../base</code>'],
        ['<code>patches</code>', 'strategic merge or JSON 6902 patches, optional <code>target</code> selector', 'replicas: 4 for the web Deployment'],
        ['<code>images</code>', 'change image name/tag/digest everywhere it appears', '<code>newTag: 1.8.2</code>'],
        ['<code>namespace</code>, <code>namePrefix</code>, <code>nameSuffix</code>', 'set on every object (and fix references)', '<code>namespace: shop-prod</code>'],
        ['<code>labels</code>', 'add labels (optionally to selectors); replaces deprecated <code>commonLabels</code>', 'team: payments'],
        ['<code>configMapGenerator</code>, <code>secretGenerator</code>', 'build ConfigMaps from files with a <b>hash suffix</b>, so changing config rolls Pods', '<code>app.properties</code>'],
        ['<code>components</code>', 'reusable optional pieces mixed into several overlays', 'monitoring sidecar, HA settings']
      ])}
      <p>🔵 <b>Strategic merge, the rule to remember.</b> Maps merge key by key. Lists of objects with a merge key (containers, env vars, ports, volumes: key <code>name</code> or <code>containerPort</code>) merge item by item: a patch for container <code>app</code> changes only that container. Other lists (args, command) are <b>replaced whole</b>. <code>null</code> deletes a key; <code>$patch: delete</code> deletes a list item. This is what the tested problem models.</p>
      <p>🔵 <b>Helm inside GitOps: two styles.</b></p>
      ${H.table(['', 'Argo CD', 'Flux'], [
        ['How Helm runs', '<code>helm template</code> in the repo-server, then normal apply', 'Helm SDK install/upgrade (real release)'],
        ['<code>helm list</code> shows it?', 'no', 'yes'],
        ['Values', '<code>source.helm.valueFiles</code>, <code>values</code>/<code>valuesObject</code>, or a second source with <code>ref: values</code> and <code>$values/envs/prod/values.yaml</code>', '<code>values</code>, <code>valuesFrom</code> ConfigMap/Secret'],
        ['Hooks', 'mapped to sync hooks/phases', 'real Helm hooks'],
        ['Rollback', 'revert in Git', 'revert in Git; automatic remediation on failed upgrade']
      ])}
      <p>🔵 <b>Charts plus patches.</b> When a public chart lacks a setting, do not fork it. Kustomize can inflate a chart (<code>helmCharts:</code> with <code>--enable-helm</code>) and patch the output; Flux HelmRelease has <code>postRenderers</code> with Kustomize patches; Argo CD can use a config management plugin. Fork only as a last resort, because you then own every upstream upgrade.</p>
      <p>🔵 <b>Pin everything.</b> In GitOps the repo must fully decide what runs: chart <code>version</code> pinned (or a deliberate semver range), image tags immutable (better: digests), and Kustomize remote bases pinned to a tag or commit (<code>?ref=v1.2.0</code>).</p>`,
    clues: [
      '"Same app, three environments, small differences, no templating language" → Kustomize base + overlays',
      '"Change only the image tag per environment" → <code>images:</code> in the overlay (CI runs <code>kustomize edit set image</code>)',
      '"ConfigMap changed but Pods did not restart" → configMapGenerator with hash suffix',
      '"The vendor chart has no option for tolerations on the job" → post-render Kustomize patch, not a fork',
      '"helm list shows nothing, but the app runs" → Argo CD renders with helm template',
      '"My patch removed the sidecar container" → you replaced a list instead of merging by name, or used JSON patch on the whole array'
    ],
    code: [TXT(`config/
  apps/web/
    base/
      kustomization.yaml     # resources: deployment.yaml, service.yaml
      deployment.yaml
      service.yaml
    overlays/
      dev/kustomization.yaml       # replicas 1, tag from CI, namespace web-dev
      staging/kustomization.yaml
      prod/
        kustomization.yaml         # replicas 4, PDB, HPA, pinned tag
        hpa.yaml
        pdb.yaml`, 'base and overlays'),
      Y(`apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: web-prod
resources:
  - ../../base
  - hpa.yaml
  - pdb.yaml
labels:
  - pairs: { env: prod }
images:
  - name: ghcr.io/example-org/web
    newTag: "1.8.2"              # CI updates this line through a PR
patches:
  - target: { kind: Deployment, name: web }
    patch: |-
      apiVersion: apps/v1
      kind: Deployment
      metadata: { name: web }
      spec:
        replicas: 4
        template:
          spec:
            containers:
              - name: web          # merge key: only this container changes
                resources:
                  requests: { cpu: 250m, memory: 256Mi }
configMapGenerator:
  - name: web-config
    literals: [LOG_LEVEL=warn]   # name gets a hash suffix; a change rolls the Pods`, 'overlays/prod/kustomization.yaml')],
    codeTitle: ['Repository shape', 'A prod overlay'],
    viz: [{
      title: 'Overlay merge: base, then each patch, key by key',
      input: 'base: replicas=1 image=web:1 container.app.cpu=100m container.side.image=log:1 args=--a,--b ; prod: replicas=4 container.app.cpu=250m args=--c ; images: image=web:1.8.2',
      inputLabel: 'layer: key=value ... ; (keys with dots are nested; container.NAME.x merges by name; other lists replace)',
      gen: function (input) {
        var layers = String(input || '').split(';').map(function (s) { return s.trim(); }).filter(Boolean).map(function (s) {
          var i = s.indexOf(':'); if (i < 0) throw new Error('Write layers as name: key=value ..., separated by ;');
          var kv = []; s.slice(i + 1).trim().split(/\s+/).filter(Boolean).forEach(function (t) { var m = t.match(/^([\w.-]+)=(.*)$/); if (!m) throw new Error('Bad setting "' + t + '"'); kv.push([m[1], m[2]]); });
          return { name: s.slice(0, i).trim(), kv: kv };
        });
        if (layers.length < 1 || layers.length > 5) throw new Error('Use 1 to 5 layers');
        var eff = {}, src = {}, f = [];
        function rows() { return Object.keys(eff).sort().map(function (k) { return [k, eff[k], src[k]]; }); }
        layers.forEach(function (l, li) {
          var changed = [];
          l.kv.forEach(function (p) {
            var k = p[0], old = eff[k];
            eff[k] = p[1]; src[k] = l.name; changed.push(k);
            var kind = /^container\./.test(k) ? 'list item merged by its name key, other containers untouched' : (p[1].indexOf(',') >= 0 ? 'plain list: replaced whole' : 'map key: overwritten');
            if (li > 0) f.push({ narr: '<b>' + l.name + '</b> sets <code>' + k + '</code> = ' + p[1] + (old !== undefined ? ' (was ' + old + ')' : ' (new key)') + ': ' + kind + '.', parts: [{ type: 'table', label: 'rendered result', columns: ['key', 'value', 'from'], rows: rows(), hl: (function () { var h = {}; rows().forEach(function (r, j) { if (r[0] === k) h[j] = 'cur'; }); return h; })() }] });
          });
          if (li === 0) f.push({ narr: 'Start from the <b>' + l.name + '</b>: ' + l.kv.length + ' settings. Every later layer is a sheet of tracing paper that changes only what it mentions.', parts: [{ type: 'table', label: 'rendered result', columns: ['key', 'value', 'from'], rows: rows() }] });
        });
        f.push({ narr: 'Final output of <code>kustomize build</code>. Note the untouched keys still come from the base: overlays stay small, and a reviewer sees exactly what makes prod different.', parts: [{ type: 'table', label: 'rendered result', columns: ['key', 'value', 'from'], rows: rows() }] });
        return pad4(f, 'Done.');
      }
    }],
    examples: [
      { title: 'Render and diff overlays before merging', html: `<p>Render both environments in CI and diff them: the reviewer sees the real YAML change, not just the overlay change. <code>kubeconform</code> validates the output against Kubernetes schemas.</p>`, code: SH(R`kubectl kustomize apps/web/overlays/prod > /tmp/prod.yaml
kubectl kustomize apps/web/overlays/staging > /tmp/staging.yaml
diff -u /tmp/staging.yaml /tmp/prod.yaml | head -60
kubeconform -strict -summary /tmp/prod.yaml
cd apps/web/overlays/dev && kustomize edit set image ghcr.io/example-org/web=ghcr.io/example-org/web:1.9.0-rc1`) },
      { title: 'Argo CD: a public chart with values from your own repo (multiple sources)', html: `<p>The chart comes from its Helm repository; the values file lives in your config repo. <code>ref: values</code> names the second source and <code>$values/...</code> points into it.</p>`, code: Y(`apiVersion: argoproj.io/v1alpha1
kind: Application
metadata: { name: ingress-nginx-prod, namespace: argocd }
spec:
  project: platform
  sources:
    - repoURL: https://kubernetes.github.io/ingress-nginx
      chart: ingress-nginx
      targetRevision: 4.11.3
      helm:
        releaseName: ingress-nginx
        valueFiles:
          - $values/platform/ingress-nginx/values-prod.yaml
    - repoURL: https://github.com/example-org/config.git
      targetRevision: main
      ref: values
  destination: { server: https://kubernetes.default.svc, namespace: ingress-nginx }
  syncPolicy:
    automated: { prune: true, selfHeal: true }
    syncOptions: [CreateNamespace=true]`, 'multi-source-app.yaml') },
      { title: 'Flux: patch a chart\'s output without forking it', html: `<p><code>postRenderers</code> run Kustomize patches on the rendered chart before Helm applies it. Here a vendor Job gets a toleration the chart does not expose.</p>`, code: Y(`apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata: { name: vendor-app, namespace: vendor }
spec:
  interval: 30m
  chart:
    spec:
      chart: vendor-app
      version: "2.4.1"
      sourceRef: { kind: HelmRepository, name: vendor, namespace: flux-system }
  postRenderers:
    - kustomize:
        patches:
          - target: { kind: Job, name: vendor-app-setup }
            patch: |
              - op: add
                path: /spec/template/spec/tolerations
                value: [{ key: dedicated, operator: Equal, value: batch, effect: NoSchedule }]`, 'helmrelease-postrender.yaml') }
    ],
    problems: [P({
      t: 'Strategic merge: overlay a patch on a base', l: 'Hard', tags: ['kustomize', 'strategic-merge', 'overlays'], co: ['Google', 'Shopify', 'Datadog'],
      s: `<p>Write <code>kustomize_merge(base, patch)</code>. Both are JSON strings. Rules: maps merge key by key (recursively); a <code>null</code> in the patch deletes the key; a list where <b>every</b> item in base and patch is a map with a <code>"name"</code> key merges item by item (matching names merge recursively, new names are appended in patch order); any other list, and any type mismatch, is <b>replaced</b> by the patch. Return compact JSON with sorted keys.</p>`,
      c: PYC,
      ex: `<p>Base containers <code>[app web:1, side log:1]</code>, patch <code>[app web:2]</code> → ${H.c('g', 'app web:2, side log:1')} (merged by name). Base <code>args: ["--a","--b"]</code>, patch <code>["--c"]</code> → ${H.c('y', '["--c"]')} (replaced).</p>`,
      bw: `<p>A JSON merge patch (RFC 7386) replaces every list, so patching one container's image deletes the sidecar. That is the classic overlay bug; strategic merge exists to fix it.</p>`,
      bc: R`import json

def kustomize_merge(base, patch):
    def merge(b, p):
        if isinstance(b, dict) and isinstance(p, dict):
            out = dict(b)
            for k, v in p.items():
                out[k] = merge(out.get(k), v)
            return out
        return p                          # lists always replaced: sidecars vanish
    return json.dumps(merge(json.loads(base), json.loads(patch)), separators=(",", ":"), sort_keys=True)`, bcl: 'python',
      q: ['The base Deployment has containers <code>app</code> and <code>istio-proxy</code>. Your strategic-merge patch lists only <code>app</code> with a new image. Result?', ['Both containers, app with the new image', 'Only app', 'Only istio-proxy', 'An error'], 0, 'containers merge by the name key, so untouched containers stay.'],
      h: ['<p>Hint 1: write one recursive function <code>merge(base, patch)</code> with three cases: two maps, two mergeable lists, everything else.</p>', '<p>Hint 2: for maps, copy the base, then for each patch key: null deletes, existing key recurses, new key is added.</p>', '<p>Hint 3: for named lists, copy base items, find each patch item by name to merge, otherwise append. Check that all items are dicts with "name" before using this rule.</p>'],
      a: `<p>Recursion mirrors the document shape. Maps: copy and apply each patch key (delete on null, recurse when the key exists, add otherwise). Lists: only when every element on both sides is an object with a <code>name</code> can we match items, as Kubernetes does for containers and env vars; then merge matches and append new ones. Everything else is a leaf, and the patch wins. Never mutate the inputs: copy first.</p>`,
      code: PY(R`import json

def _smerge(base, patch):
    if isinstance(base, dict) and isinstance(patch, dict):
        out = dict(base)
        for k, v in patch.items():
            if v is None:
                out.pop(k, None)
            elif k in out:
                out[k] = _smerge(out[k], v)
            else:
                out[k] = v
        return out
    if (isinstance(base, list) and isinstance(patch, list) and base and patch
            and all(isinstance(x, dict) and "name" in x for x in base + patch)):
        out = [dict(x) for x in base]
        for p in patch:
            for i, b in enumerate(out):
                if b["name"] == p["name"]:
                    out[i] = _smerge(b, p)
                    break
            else:
                out.append(p)
        return out
    return patch

def kustomize_merge(base, patch):
    return json.dumps(_smerge(json.loads(base), json.loads(patch)), separators=(",", ":"), sort_keys=True)`),
      cx: `<p>O(n + m·k) where named lists of size k are searched linearly for each of m patch items; fine for manifests. Use a dict by name for very long lists.</p>`,
      f: ['How do you delete one container with a strategic merge patch? (<code>$patch: delete</code> on that item)', 'Why do CRDs not get list merging by name? (they have no merge-key metadata, so lists are replaced unless you use JSON 6902 patches)'],
      tests: { sig: 'string string -> string', fn: 'kustomizeMerge', cases: [[["{\"spec\":{\"replicas\":1,\"template\":{\"spec\":{\"containers\":[{\"name\":\"app\",\"image\":\"web:1\"}]}}}}", "{\"spec\":{\"replicas\":3}}"], "{\"spec\":{\"replicas\":3,\"template\":{\"spec\":{\"containers\":[{\"image\":\"web:1\",\"name\":\"app\"}]}}}}"], [["{\"spec\":{\"containers\":[{\"name\":\"app\",\"image\":\"web:1\"},{\"name\":\"side\",\"image\":\"log:1\"}]}}", "{\"spec\":{\"containers\":[{\"name\":\"app\",\"image\":\"web:2\"}]}}"], "{\"spec\":{\"containers\":[{\"image\":\"web:2\",\"name\":\"app\"},{\"image\":\"log:1\",\"name\":\"side\"}]}}"], [["{\"spec\":{\"containers\":[{\"name\":\"app\",\"image\":\"web:1\"}]}}", "{\"spec\":{\"containers\":[{\"name\":\"proxy\",\"image\":\"envoy:1\"}]}}"], "{\"spec\":{\"containers\":[{\"image\":\"web:1\",\"name\":\"app\"},{\"image\":\"envoy:1\",\"name\":\"proxy\"}]}}"], [["{\"args\":[\"--a\",\"--b\"]}", "{\"args\":[\"--c\"]}"], "{\"args\":[\"--c\"]}"], [["{\"metadata\":{\"labels\":{\"app\":\"web\",\"tier\":\"x\"}}}", "{\"metadata\":{\"labels\":{\"tier\":null}}}"], "{\"metadata\":{\"labels\":{\"app\":\"web\"}}}"], [["{\"a\":1}", "{}"], "{\"a\":1}"], [["{\"a\":{\"b\":1}}", "{\"a\":\"flat\"}"], "{\"a\":\"flat\"}"], [["{\"env\":[{\"name\":\"LOG\",\"value\":\"info\"}]}", "{\"env\":[{\"name\":\"LOG\",\"value\":\"debug\"},{\"name\":\"NEW\",\"value\":\"1\"}]}"], "{\"env\":[{\"name\":\"LOG\",\"value\":\"debug\"},{\"name\":\"NEW\",\"value\":\"1\"}]}"]] }
    })],
    deepDive: `<p>🟣 <b>Where merge keys come from.</b> Strategic merge uses the OpenAPI schema extensions <code>x-kubernetes-patch-merge-key</code> and <code>x-kubernetes-patch-strategy</code> of built-in types. Custom resources have no such metadata in Kustomize by default, so their lists are replaced; use a JSON 6902 patch (<code>op: replace, path: /spec/items/1/value</code>) or add an <code>openapi</code> schema to the kustomization.</p>
      <p>🟣 <b>Overlay explosion.</b> Ten apps × five environments × three regions as plain overlays is 150 folders of near-copies. Use <code>components</code> for cross-cutting features, keep per-environment data small (often just image tag, replicas, hostnames), and consider generating per-cluster values with ApplicationSet merge generators instead of more folders.</p>
      <p>🟣 <b>Rendering cost.</b> Argo CD's repo-server runs <code>kustomize build</code> and <code>helm template</code> for every app on every refresh of a changed commit. Big monorepos with many Helm dependencies make the repo-server the bottleneck: cache, scale replicas, and avoid fetching remote bases at render time.</p>
      <p>🟣 <b>Rendered manifests pattern.</b> Some teams commit the <i>rendered</i> YAML (CI runs Kustomize/Helm and pushes plain manifests to an environment branch). Reviews show the exact objects, and the controller does no rendering. The cost is a second pipeline and large diffs.</p>`,
    aiEra: `<p>🤖 Kustomize patches are where assistants make subtle mistakes: a JSON 6902 path with the wrong index, a strategic patch that replaces <code>args</code>, or the deprecated <code>patchesStrategicMerge</code>/<code>commonLabels</code> fields. The safe loop: let the assistant write the overlay, render it with <code>kubectl kustomize</code>, and ask it to explain the <i>rendered</i> diff against the base. Never accept a patch you have not seen rendered. AI is also good at converting a sprawling set of overlays into a base plus components, as long as CI proves the rendered output is identical.</p>`
  });

  // ───────────────────────── Topic 6: Repository layouts and promotion ─────────────────────────
  topics.push({
    title: 'Repository Layouts and Promotion Between Environments',
    analogy: `<p>Promotion is like a relay race with a baton: the baton (a specific, already-built image version) goes from <b>dev</b> to <b>staging</b> to <b>prod</b>. You never make a new baton halfway through the race, and a runner only takes the baton when the previous runner arrived <i>healthy</i>. The repository layout is the track: lanes (folders) or separate tracks (repos or branches). The rule that matters: the baton moves by an <b>explicit, reviewable hand-over</b>, which in GitOps is a commit.</p>`,
    explain: `<p>🟢 <b>Two questions decide the layout.</b> Where do environment differences live, and who may change which environment?</p>
      ${H.table(['Layout', 'Shape', 'Good', 'Watch out'], [
        ['<b>Monorepo, folder per env</b>', '<code>apps/web/overlays/{dev,staging,prod}</code>, <code>clusters/{dev,prod}</code>', 'one PR shows every env; easy diffs between envs; most common', 'CODEOWNERS and branch protection must guard <code>prod/</code> folders'],
        ['<b>Repo per environment</b>', '<code>config-dev</code>, <code>config-prod</code>', 'hard access boundary (different teams/approvers)', 'drift between repos; promotion = PR across repos'],
        ['<b>Repo per team / app</b>', 'each team owns its config repo; platform repo holds infra', 'team autonomy, scales to many teams', 'need ApplicationSets/AppProjects to wire them in'],
        ['<b>Branch per environment</b>', '<code>dev</code>, <code>staging</code>, <code>prod</code> branches of one repo', 'looks simple', '<b>anti-pattern</b>: merges carry unrelated changes, branches drift, cherry-picks pile up']
      ])}
      <p>🟢 <b>Build once, promote the artifact.</b> The image built from commit <code>abc123</code> is the one that runs in dev, staging and prod (same digest). Promotion changes <i>which version each environment points to</i>, nothing else. Rebuilding for prod breaks the evidence chain from devops11.</p>
      <p>🔵 <b>How promotion happens in GitOps.</b></p>
      ${H.table(['Mechanism', 'How', 'When'], [
        ['CI commits directly', 'pipeline runs <code>kustomize edit set image</code> in <code>envs/dev</code> and pushes', 'dev: every merge to main'],
        ['Promotion PR', 'a job (or a person) opens a PR copying the staging version into prod; reviewers approve', 'prod: with approvals, change records, freeze windows'],
        ['Image updater bots', 'Argo CD Image Updater or Flux image automation watches the registry and commits new tags matching a policy (semver range, regex)', 'dev or preview envs; rarely straight to prod'],
        ['Promotion tools', 'Kargo (from Akuity) models "stages" and "freight", promotes with verification between stages', 'many environments, many apps']
      ])}
      <p>🔵 <b>Gates.</b> Promote to the next environment only if the version is running there <b>and healthy</b> (Argo CD health, Rollouts analysis, smoke tests, error budget). No skipping: a version that never ran in staging does not reach prod. Rollback is just promotion of an older version, and it is allowed to skip gates (you are going back to something that already ran).</p>
      <p>🔵 <b>Keep env differences boring.</b> Per-environment config should be small and obvious: image tag, replica count, resources, hostnames, feature flags. If prod's overlay is 400 lines different from staging, staging does not test prod.</p>`,
    clues: [
      '"Should we have a branch per environment?" → no; folders (or repos) per environment on one main branch',
      '"Prod must require two approvals, dev must not" → folder per env + CODEOWNERS + branch protection, or a separate prod repo',
      '"The image in prod is not the one we tested" → build once; promote the digest',
      '"Auto-deploy new semver tags to dev" → Argo CD Image Updater or Flux ImagePolicy + ImageUpdateAutomation',
      '"Deploy to prod only if staging is healthy for 1 hour" → promotion gate reading health/analysis, as a PR check or a promotion tool',
      '"Roll back prod fast" → revert the promotion commit (or promote the previous version)'
    ],
    code: [TXT(`fleet/                              # monorepo, folder per environment
  clusters/
    dev/   flux-system/  infra.yaml  apps.yaml
    prod/  flux-system/  infra.yaml  apps.yaml
  infrastructure/
    base/  ingress-nginx/  cert-manager/
    dev/   kustomization.yaml
    prod/  kustomization.yaml
  apps/
    web/
      base/
      overlays/ dev/  staging/  prod/       # promotion = change newTag here
  .github/CODEOWNERS                       # apps/*/overlays/prod/ @example-org/sre`, 'monorepo layout'),
      SH(R`#!/usr/bin/env bash
# promote.sh APP FROM TO  - copy the image tag from one overlay to the next and open a PR
set -euo pipefail
app="$1"; from="$2"; to="$3"
tag=$(yq '.images[0].newTag' "apps/$app/overlays/$from/kustomization.yaml")
health=$(argocd app get "$app-$from" -o json | jq -r '.status.health.status')
[ "$health" = "Healthy" ] || { echo "refuse: $app-$from is $health"; exit 1; }
git switch -c "promote-$app-$to-$tag"
yq -i ".images[0].newTag = \"$tag\"" "apps/$app/overlays/$to/kustomization.yaml"
git commit -am "promote $app $tag: $from -> $to"
git push -u origin HEAD
gh pr create --title "Promote $app $tag to $to" --body "Healthy in $from. Rendered diff in CI."`, 'promote.sh')],
    codeTitle: ['A monorepo layout', 'A promotion script with a health gate'],
    viz: [{
      title: 'Promotion: move one version along dev → staging → prod',
      input: 'dev=1.5.0=Healthy staging=1.4.0=Healthy prod=1.4.0=Healthy ; promote 1.5.0',
      inputLabel: 'env=version=health ... ; promote VERSION',
      gen: function (input) {
        var p = String(input || '').split(';'); if (p.length !== 2) throw new Error('Write: env=version=health ... ; promote VERSION');
        var envs = p[0].trim().split(/\s+/).filter(Boolean).map(function (t) { var m = t.split('='); if (m.length !== 3 || !/^\d+\.\d+\.\d+$/.test(m[1])) throw new Error('Bad env "' + t + '": use name=1.2.3=Healthy'); return { n: m[0], v: m[1], h: m[2] }; });
        var vm = p[1].trim().match(/^promote\s+(\d+\.\d+\.\d+)$/); if (!vm) throw new Error('Second part: promote 1.2.3');
        if (envs.length < 2 || envs.length > 6) throw new Error('Use 2 to 6 environments');
        var v = vm[1], f = [];
        function tbl(hl) { return { type: 'table', label: 'environments', columns: ['env', 'version', 'health'], rows: envs.map(function (e) { return [e.n, e.v, e.h]; }), hl: hl || {} }; }
        f.push({ narr: 'Version <b>' + v + '</b> was built once. Promotion walks it down the chain; each step is a commit to that environment\'s overlay, allowed only if the previous environment runs it and is Healthy.', parts: [tbl()] });
        for (var i = 0; i < envs.length; i++) {
          var e = envs[i], h = {}; h[i] = 'cur';
          if (i > 0) {
            var prev = envs[i - 1];
            if (prev.v !== v) { h[i - 1] = 'bad'; f.push({ narr: '<b>Blocked at ' + e.n + '</b>: ' + prev.n + ' runs ' + prev.v + ', not ' + v + '. No skipping environments.', parts: [tbl(h)] }); return pad4(f, 'Blocked.'); }
            if (prev.h !== 'Healthy') { h[i - 1] = 'bad'; f.push({ narr: '<b>Blocked at ' + e.n + '</b>: ' + prev.n + ' is ' + prev.h + '. The gate waits for Healthy (and in real life, for analysis or soak time).', parts: [tbl(h)] }); return pad4(f, 'Blocked.'); }
          }
          if (e.v === v) { f.push({ narr: e.n + ' already runs ' + v + ': nothing to commit (NOOP).', parts: [tbl(h)] }); continue; }
          var down = verCmp(v, e.v) < 0;
          e.v = v; e.h = 'Progressing';
          f.push({ narr: (down ? '<b>Rollback</b> ' : '') + 'Commit "promote ' + v + ' to ' + e.n + '". The controller syncs; the new Pods start: <b>Progressing</b>.', parts: [tbl(h)] });
          e.h = 'Healthy'; var h2 = {}; h2[i] = 'ok';
          f.push({ narr: e.n + ' reports <b>Healthy</b>. The baton can move on.', parts: [tbl(h2)] });
        }
        f.push({ narr: 'Every environment now runs the <b>same artifact</b>, and the Git log shows who promoted it, when, and with which approval.', parts: [tbl()] });
        return pad4(f, 'Done.');
      }
    }],
    examples: [
      { title: 'CODEOWNERS: who may approve which environment', html: `<p>With branch protection requiring code-owner review, a dev overlay change needs the app team, and a prod change also needs SRE. Same repo, different approvers.</p>`, code: TXT(`# .github/CODEOWNERS
/apps/*/overlays/dev/       @example-org/app-teams
/apps/*/overlays/staging/   @example-org/app-teams
/apps/*/overlays/prod/      @example-org/sre @example-org/app-teams
/clusters/                  @example-org/platform
/infrastructure/            @example-org/platform`, 'CODEOWNERS') },
      { title: 'Flux image automation for the dev environment', html: `<p>Flux scans the registry, picks the newest tag in a semver range, and commits it where a marker comment says. Only dev follows tags automatically; staging and prod move by PR.</p>`, code: SH(R`flux create image repository web --image=ghcr.io/example-org/web --interval=5m
flux create image policy web --image-ref=web --select-semver=">=1.0.0 <2.0.0"
flux create image update dev-web --git-repo-ref=fleet --git-repo-path=./apps/web/overlays/dev \
  --checkout-branch=main --push-branch=main --author-name=fluxbot --author-email=fluxbot@example.org \
  --commit-template="dev: update web image"
# in apps/web/overlays/dev/kustomization.yaml the line carries a marker:
#   newTag: 1.4.0 # {"$imagepolicy": "flux-system:web:tag"}
flux get images all -A`) },
      { title: 'Situation: the branch-per-environment trap', html: `<p>A team used <code>dev</code>, <code>staging</code> and <code>prod</code> branches. A hotfix went straight to <code>prod</code>; the next "merge staging into prod" reverted it, because staging never had it. After moving to folders on one branch, every environment's state is visible in one tree, and a hotfix is one PR that touches the prod folder (and dev/staging too).</p>`, code: SH(R`# migration sketch: copy each env branch into a folder on main
for env in dev staging prod; do
  git worktree add "/tmp/wt-$env" "$env"
  mkdir -p "envs/$env" && cp -r "/tmp/wt-$env/manifests/." "envs/$env/"
done
git add envs && git commit -m "move env branches into folders on main"
diff -r envs/staging envs/prod | head -40     # the real differences, finally visible`) }
    ],
    problems: [P({
      t: 'Promotion gate: may this version move to that environment?', l: 'Medium', tags: ['promotion', 'gates', 'gitops'], co: ['Akuity', 'Booking.com', 'Monzo'],
      s: `<p>Write <code>promote(chain, target, version)</code>. <code>chain</code> lists environments in order as <code>"env=version=health"</code>. Return:</p><ul><li><code>UNKNOWN env</code> if target is not in the chain;</li><li>for a target that is not the first env: <code>BLOCKED prev runs X</code> if the previous env does not run <code>version</code>, else <code>BLOCKED prev is H</code> if its health is not <code>Healthy</code>;</li><li><code>NOOP</code> if the target already runs it; <code>ROLLBACK</code> if the version is lower (compare as numbers <code>major.minor.patch</code>); otherwise <code>OK</code>.</li></ul>`,
      c: PYC,
      ex: `<p>dev 1.5.0 Healthy, staging 1.4.0: promote 1.5.0 to prod → ${H.c('r', 'BLOCKED staging runs 1.4.0')} (no skipping). To staging → ${H.c('g', 'OK')}. Versions compare numerically: 1.10.0 is newer than 1.9.0.</p>`,
      bw: `<p>Comparing version strings as text says "1.10.0" &lt; "1.9.0", so a real upgrade looks like a rollback. Split into integers. Also, checking only the target environment lets a version jump from dev to prod.</p>`,
      bc: R`def promote(chain, target, version):
    for c in chain:
        env, cur, _ = c.split("=")
        if env == target:
            return "ROLLBACK" if version < cur else "OK"   # string compare + no gate
    return "UNKNOWN " + target`, bcl: 'python',
      q: ['Staging runs 1.5.0 but is <code>Progressing</code> (rollout in flight). Should 1.5.0 go to prod now?', ['No: wait until staging is Healthy', 'Yes: the version matches', 'Yes, but only with --force', 'Only if dev is Healthy'], 0, 'Progressing means the evidence is not in yet. Gates need Healthy (and often a soak time).'],
      h: ['<p>Hint 1: find the target\'s index; the gate only looks at the environment right before it.</p>', '<p>Hint 2: check order matters: unknown, previous version, previous health, then NOOP / ROLLBACK / OK.</p>', '<p>Hint 3: compare versions as tuples of ints, e.g. <code>tuple(map(int, v.split(".")))</code>.</p>'],
      a: `<p>Parse the chain, locate the target, and apply the gates in order. The first environment has no gate (CI feeds it). After the gates, compare the requested version with the target's current one as integer tuples to tell a no-op, a rollback and a normal promotion apart.</p>`,
      code: PY(R`def _ver(v):
    return tuple(int(x) for x in v.split("."))

def promote(chain, target, version):
    envs = [c.split("=") for c in chain]
    names = [e[0] for e in envs]
    if target not in names:
        return "UNKNOWN " + target
    i = names.index(target)
    if i > 0:
        prev, pv, ps = envs[i - 1]
        if pv != version:
            return "BLOCKED %s runs %s" % (prev, pv)
        if ps != "Healthy":
            return "BLOCKED %s is %s" % (prev, ps)
    cur = envs[i][1]
    if cur == version:
        return "NOOP"
    if _ver(version) < _ver(cur):
        return "ROLLBACK"
    return "OK"`),
      cx: `<p>O(n) for n environments.</p>`,
      f: ['Should ROLLBACK skip the gate? (in this model the gate still applies; many teams allow rollback to any version that already ran in prod)', 'How would you add soak time? (store when each env became Healthy and require now - since ≥ N minutes)'],
      tests: { sig: 'string[] string string -> string', fn: 'promote', cases: [[[["dev=1.5.0=Healthy", "staging=1.4.0=Healthy", "prod=1.4.0=Healthy"], "staging", "1.5.0"], "OK"], [[["dev=1.5.0=Healthy", "staging=1.4.0=Healthy", "prod=1.4.0=Healthy"], "prod", "1.5.0"], "BLOCKED staging runs 1.4.0"], [[["dev=1.5.0=Degraded", "staging=1.4.0=Healthy"], "staging", "1.5.0"], "BLOCKED dev is Degraded"], [[["dev=1.5.0=Healthy"], "dev", "1.6.0"], "OK"], [[["dev=1.5.0=Healthy", "staging=1.5.0=Healthy"], "staging", "1.5.0"], "NOOP"], [[["dev=1.3.0=Healthy", "staging=1.4.0=Healthy"], "staging", "1.3.0"], "ROLLBACK"], [[["dev=1.5.0=Healthy"], "qa", "1.5.0"], "UNKNOWN qa"], [[["dev=1.10.0=Healthy", "staging=1.9.0=Healthy"], "staging", "1.10.0"], "OK"], [[["dev=1.5.0=Healthy", "staging=1.5.0=Progressing", "prod=1.4.0=Healthy"], "prod", "1.5.0"], "BLOCKED staging is Progressing"]] }
    })],
    deepDive: `<p>🟣 <b>Why env branches fail.</b> Git merges are about <i>history</i>, but environments are about <i>state</i>. Merging staging into prod brings every commit staging ever had, including experiments and half-reverted changes, and conflicts appear in files nobody meant to touch. Folders make the state of each environment a plain directory you can diff.</p>
      <p>🟣 <b>Monorepo scale limits.</b> Every commit triggers re-rendering for apps whose paths might be affected. Argo CD supports the <code>argocd.argoproj.io/manifest-generate-paths</code> annotation so a webhook only refreshes apps whose paths changed. Flux reconciles per Kustomization path but still fetches the whole repo artifact; split very large fleets or use OCI artifacts per area.</p>
      <p>🟣 <b>Write-back loops.</b> Image updaters and CI both pushing to the same branch race each other. Give bots their own paths (or a separate branch that a PR merges), require linear history, and make commits idempotent (no commit when the tag is already set). Argo CD Image Updater can also write parameter overrides to the Application instead of Git, which breaks the "Git is the truth" rule; prefer the git write-back method.</p>
      <p>🟣 <b>Kargo and promotion as a first-class object.</b> Newer tools model the version bundle ("freight": image digest + chart version + config commit) and verify each stage before allowing the next. The underlying idea is this module's: a promotion is a gated, auditable change of what an environment points to.</p>`,
    aiEra: `<p>🤖 Promotion PRs are a good job for automation and AI: a bot opens the PR, an assistant writes the summary ("changes since the last prod version: 7 commits, 1 migration, 2 config keys") from the commit log and the rendered diff. Keep humans (or strict policy) as the approver for prod, and keep the gate machine-checked: health, analysis results, error budget. Do not let an agent pick versions by "it looks fine"; the gate must be a rule you could also run without AI.</p>`
  });

  // ───────────────────────── Topic 7: Secrets in Git ─────────────────────────
  topics.push({
    title: 'Secrets in a GitOps World: Sealed Secrets, SOPS and External Secrets',
    analogy: `<p>GitOps says "everything in Git", but you would not pin your house key to a public notice board. Three answers: put the key in a <b>locked box that only the house can open</b> and pin the box (Sealed Secrets); put it in a box that <b>people with the right key-card</b> (a KMS or age key) can open, including the house (SOPS); or pin only a <b>note saying "the key is in the bank vault, box 42"</b>, and have a courier fetch it (External Secrets). The board stays public-safe in all three.</p>`,
    explain: `<p>🟢 <b>The rule.</b> A plain Kubernetes <code>Secret</code> is only base64, which is encoding, not encryption. Committing one to Git leaks it forever (history, forks, CI caches). So the repo holds either <b>ciphertext</b> or a <b>reference</b>, never the value.</p>
      ${H.table(['Approach', 'What is in Git', 'Who decrypts / fetches', 'Good for'], [
        ['<b>Sealed Secrets</b> (Bitnami)', 'a <code>SealedSecret</code> encrypted with the controller\'s public key (<code>kubeseal</code>)', 'the sealed-secrets controller in that cluster (private key never leaves it)', 'simple, one cluster, no cloud KMS'],
        ['<b>SOPS</b> (+ age, or cloud KMS)', 'YAML with values encrypted, keys readable', 'Flux kustomize-controller natively (<code>decryption.provider: sops</code>); Argo CD via a plugin (KSOPS / helm-secrets)', 'teams that want diffs of which keys changed, multi-cluster with KMS'],
        ['<b>External Secrets Operator</b>', 'an <code>ExternalSecret</code>: a reference to a path in Vault / AWS / GCP / Azure secret managers', 'ESO in the cluster, with an identity (IRSA, Workload Identity)', 'production; rotation; the value never touches Git'],
        ['Secrets Store CSI driver', 'a <code>SecretProviderClass</code> reference', 'mounted as files into the Pod at start', 'when the app should read files, not env vars']
      ])}
      <p>🔵 <b>Sealed Secrets details.</b> <code>kubeseal --format yaml &lt; secret.yaml &gt; sealed.yaml</code> encrypts with the cluster's certificate. Scope matters: <b>strict</b> (default) binds the ciphertext to the name and namespace, so it cannot be copied to another namespace; <code>namespace-wide</code> and <code>cluster-wide</code> relax that. The controller renews its sealing key every 30 days and keeps old keys to decrypt existing secrets; back up the key Secrets, or a rebuilt cluster cannot open anything in Git.</p>
      <p>🔵 <b>SOPS details.</b> SOPS encrypts only the values (<code>encrypted_regex: ^(data|stringData)$</code>), so a diff shows which key changed. Recipients come from <code>.sops.yaml</code> creation rules per path (age public keys, AWS KMS, GCP KMS, Azure Key Vault, PGP). Flux decrypts at apply time with a key in a cluster Secret (<code>sops-age</code>). Rotating a team member out means re-encrypting (<code>sops updatekeys</code>) and rotating the actual secret.</p>
      <p>🔵 <b>External Secrets details.</b> A <code>SecretStore</code> / <code>ClusterSecretStore</code> says how to reach the provider; an <code>ExternalSecret</code> says which remote keys become which Secret keys, and <code>refreshInterval</code> keeps them in sync, so rotation in the vault flows into the cluster. Workloads still need a restart or reload to read new values (Reloader, or apps that watch files).</p>
      <p>🔵 <b>What Argo CD recommends.</b> Avoid tools that inject secret values into manifests during rendering (they end up in the repo-server cache and in the rendered manifests visible in the UI). Prefer operators that create the Secret <i>inside the cluster</i> (ESO, Sealed Secrets, CSI) so Argo CD only ever sees the reference.</p>`,
    clues: [
      '"Can we commit the Kubernetes Secret YAML?" → no: base64 is not encryption',
      '"Small team, one cluster, no cloud KMS" → Sealed Secrets',
      '"We want to see in the PR which secret key changed" → SOPS (values encrypted, keys plain)',
      '"Secrets already live in Vault / AWS Secrets Manager; rotate without commits" → External Secrets Operator',
      '"We rebuilt the cluster and nothing decrypts" → the Sealed Secrets private keys were not backed up',
      '"Argo CD UI shows secret values" → you inject values at render time; move to an in-cluster operator'
    ],
    code: [SH(R`# Sealed Secrets: encrypt locally with the cluster's public certificate
kubeseal --fetch-cert --controller-namespace kube-system > pub-cert.pem   # public: safe to share
read -rs DB_PASSWORD
kubectl create secret generic shop-db -n shop --from-literal=password="$DB_PASSWORD" \
  --dry-run=client -o yaml \
  | kubeseal --cert pub-cert.pem --format yaml > apps/shop/overlays/prod/sealed-db.yaml
unset DB_PASSWORD
git add apps/shop/overlays/prod/sealed-db.yaml && git commit -m "shop: sealed db password"`, 'kubeseal'),
      Y(`# .sops.yaml at the repo root: which keys encrypt which paths
creation_rules:
  - path_regex: clusters/prod/.*\\.enc\\.yaml$
    encrypted_regex: ^(data|stringData)$
    age: age1qzexampleprodpublickeyxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  - path_regex: clusters/dev/.*\\.enc\\.yaml$
    encrypted_regex: ^(data|stringData)$
    age: age1qzexampledevpublickeyxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`, '.sops.yaml')],
    codeTitle: ['Seal a secret with kubeseal', 'SOPS creation rules'],
    viz: [{
      title: 'Follow a database password from a person to a Pod',
      input: 'sealed',
      inputLabel: 'pattern: sealed | sops | eso',
      gen: function (input) {
        var mode = String(input || 'sealed').trim().toLowerCase();
        var flows = {
          sealed: { nodes: [box('dev', 'engineer', 6, 10, 14), box('ks', 'kubeseal (public cert)', 30, 10, 20), box('git', 'Git: SealedSecret', 56, 10, 18), box('gc', 'Argo CD / Flux', 82, 10, 16), box('ctl', 'sealed-secrets ctrl (private key)', 70, 45, 26), box('sec', 'Secret', 40, 45, 12), box('pod', 'Pod', 14, 45, 10)],
            steps: [['dev', 'ks', 'The engineer types the value once and pipes a dry-run Secret into kubeseal. Only the <b>public</b> certificate is needed: anyone can seal, only the cluster can open.'], ['ks', 'git', 'The <b>SealedSecret</b> (ciphertext, bound to name + namespace) is committed. Safe in a public repo.'], ['git', 'gc', 'The GitOps controller applies the SealedSecret like any other object. It never sees the plain value.'], ['gc', 'ctl', 'The sealed-secrets controller notices the new SealedSecret and decrypts it with its <b>private key</b>, which never leaves the cluster.'], ['ctl', 'sec', 'It creates a normal <b>Secret</b> owned by the SealedSecret.'], ['sec', 'pod', 'The Pod reads it as env or a file. Back up the controller keys, or a rebuilt cluster cannot open Git.']] },
          sops: { nodes: [box('dev', 'engineer', 6, 10, 14), box('sops', 'sops + age/KMS', 30, 10, 18), box('git', 'Git: *.enc.yaml', 56, 10, 18), box('kc', 'kustomize-controller', 82, 10, 20), box('key', 'sops-age key Secret', 80, 45, 20), box('sec', 'Secret', 44, 45, 12), box('pod', 'Pod', 14, 45, 10)],
            steps: [['dev', 'sops', 'The engineer edits <code>sops secret.enc.yaml</code>; SOPS encrypts each value for the recipients in <code>.sops.yaml</code>.'], ['sops', 'git', 'Committed: keys readable, values encrypted. The PR shows <i>which</i> key changed.'], ['git', 'kc', 'Flux fetches the commit. The Kustomization has <code>decryption: {provider: sops}</code>.'], ['key', 'kc', 'It loads the age private key (or uses KMS through its cloud identity) from the referenced Secret.'], ['kc', 'sec', 'It decrypts in memory and applies a normal Secret.'], ['sec', 'pod', 'The Pod uses it. Removing a person means re-encrypting <b>and</b> rotating the value.']] },
          eso: { nodes: [box('vault', 'Vault / cloud secret manager', 8, 45, 24), box('git', 'Git: ExternalSecret', 30, 10, 20), box('gc', 'Argo CD / Flux', 58, 10, 16), box('eso', 'External Secrets Operator', 52, 45, 22), box('sec', 'Secret', 80, 45, 12), box('pod', 'Pod', 88, 10, 10)],
            steps: [['git', 'gc', 'Git holds only an <b>ExternalSecret</b>: "make Secret shop-db from key prod/shop/db". No value, no ciphertext.'], ['gc', 'eso', 'The GitOps controller applies it; ESO picks it up.'], ['eso', 'vault', 'ESO authenticates with a workload identity (IRSA, Workload Identity, Vault Kubernetes auth) and reads the value.'], ['eso', 'sec', 'It writes a Secret and refreshes it every <code>refreshInterval</code>, so rotation in the vault needs no commit.'], ['sec', 'pod', 'The Pod reads the Secret. Use a reloader or file mounts so a rotated value is picked up.']] }
        };
        var fl = flows[mode]; if (!fl) throw new Error('Type sealed, sops or eso');
        var edges = fl.steps.map(function (s) { return [s[0], s[1]]; }), f = [];
        f.push({ narr: 'Pattern <b>' + mode + '</b>. Watch where the plain value exists: only at the start and inside the cluster, never in Git.', parts: [{ type: 'graph', label: mode, directed: true, height: 60, nodes: fl.nodes, edges: [] }] });
        fl.steps.forEach(function (s, i) {
          var ehl = {}; ehl[s[0] + '-' + s[1]] = 'cur'; var hl = {}; hl[s[1]] = 'cur';
          f.push({ narr: s[2], parts: [{ type: 'graph', label: mode + ' step ' + (i + 1), directed: true, height: 60, nodes: fl.nodes, edges: edges.slice(0, i + 1), hl: hl, ehl: ehl }] });
        });
        return pad4(f, 'Done.');
      }
    }],
    examples: [
      { title: 'Flux decrypts SOPS natively', html: `<p>Generate an age key pair, give the private key to the cluster as a Secret (once, out of band), keep the public key in <code>.sops.yaml</code>, and point the Kustomization at the key.</p>`, code: SH(R`age-keygen -o age.agekey                          # private key: never commit it
kubectl -n flux-system create secret generic sops-age --from-file=age.agekey=./age.agekey
grep 'public key' age.agekey                       # goes into .sops.yaml
sops --encrypt --in-place clusters/prod/shop-db.enc.yaml
# Kustomization spec: decryption: { provider: sops, secretRef: { name: sops-age } }
shred -u age.agekey                                # after storing it in your password manager`) },
      { title: 'External Secrets: the production default', html: `<p>The store is configured once by the platform team; app teams write only ExternalSecrets. Authentication uses the cluster's workload identity, so no static cloud key exists anywhere.</p>`, code: Y(`apiVersion: external-secrets.io/v1
kind: ClusterSecretStore
metadata: { name: aws-sm }
spec:
  provider:
    aws:
      service: SecretsManager
      region: eu-west-1
      auth:
        jwt:
          serviceAccountRef: { name: external-secrets, namespace: external-secrets }
---
apiVersion: external-secrets.io/v1
kind: ExternalSecret
metadata: { name: shop-db, namespace: shop }
spec:
  refreshInterval: 1h
  secretStoreRef: { name: aws-sm, kind: ClusterSecretStore }
  target: { name: shop-db, creationPolicy: Owner }
  data:
    - secretKey: password
      remoteRef: { key: prod/shop/db, property: password }`, 'external-secret.yaml') },
      { title: 'Situation: a Secret was committed in plain text', html: `<p>Deleting the file is not enough; it is in history, forks and clones. Order: <b>rotate the credential first</b> (the leak is real), then remove it from history if policy requires, then add a pre-commit scanner so it cannot happen again.</p>`, code: SH(R`# 1) rotate at the source (database / provider) - the old value is burned
# 2) replace the file with a sealed or external reference, commit
git rm apps/shop/overlays/prod/db-secret.yaml && git commit -m "remove plain secret"
# 3) prevent: scan every commit
gitleaks detect --source . --redact
# optional history rewrite (coordinate with everyone who cloned):
# git filter-repo --path apps/shop/overlays/prod/db-secret.yaml --invert-paths`) }
    ],
    problems: [P({
      t: 'Choose and implement a secret strategy for three clusters', l: 'Hard', tags: ['secrets', 'sops', 'external-secrets', 'sealed-secrets'], co: ['HashiCorp', 'Revolut', 'GitLab'],
      s: `<p>You run dev (kind, laptop), staging and prod (managed cloud clusters) from one fleet repo with Argo CD. The database password must be rotatable without a commit in prod, developers must be able to add dev secrets themselves, and a rebuilt cluster must come back without manual steps beyond bootstrap. Pick an approach per environment, show the objects, and explain rotation and disaster recovery.</p>`,
      ex: `<p>A good answer mixes tools on purpose: ESO in staging/prod (rotation without commits, workload identity), Sealed Secrets or SOPS in dev (no cloud needed), and documents where every private key lives.</p>`,
      bw: `<p>"Base64 Secrets in a private repo" fails the first rule. "Sealed Secrets everywhere" works until a prod cluster is rebuilt without the key backup, and rotation needs a commit for every change. "Vault plugin that injects values at render time" leaks values into the Argo CD repo-server cache and UI.</p>`,
      q: ['Why is a <b>strict</b>-scope SealedSecret safe to commit even if someone copies it to their own namespace?', ['The ciphertext is bound to the original name and namespace, so the controller refuses to decrypt it elsewhere', 'It is not safe', 'Because base64 hides it', 'Because Git encrypts the repo'], 0, 'Strict scope includes namespace and name in the encryption, so a copy cannot be opened in another namespace.'],
      h: ['<p>Hint 1: split the requirements: who creates secrets, where values are stored, how rotation reaches the Pod.</p>', '<p>Hint 2: rotation without commits points to a reference (ESO) rather than ciphertext in Git.</p>', '<p>Hint 3: for every approach, name where the private key or identity lives and how bootstrap restores it.</p>'],
      a: `<p><b>Prod and staging:</b> External Secrets Operator with a <code>ClusterSecretStore</code> per cloud account, authenticated by workload identity (no static keys). Git contains only <code>ExternalSecret</code> objects; rotation happens in the secret manager and propagates within <code>refreshInterval</code>; Reloader restarts Deployments when the Secret changes. <b>Dev:</b> SOPS with age, one dev age key shared through the team password manager; developers encrypt with the public key in <code>.sops.yaml</code> and Argo CD decrypts through KSOPS (or switch dev to Flux, which decrypts natively). <b>Disaster recovery:</b> bootstrap installs Argo CD, ESO and the store config from Git; prod needs nothing else because values are fetched again; dev needs the age key restored from the password manager. <b>Guard rails:</b> gitleaks in CI, AppProject blacklist on plain <code>Secret</code> objects in app folders, and an alert on ExternalSecrets whose status is not <code>SecretSynced</code>.</p>`,
      code: Y(`# prod: what an app team commits
apiVersion: external-secrets.io/v1
kind: ExternalSecret
metadata: { name: shop-db, namespace: shop }
spec:
  refreshInterval: 15m
  secretStoreRef: { name: aws-sm, kind: ClusterSecretStore }
  target:
    name: shop-db
    template:
      metadata:
        annotations: { reloader.stakater.com/match: "true" }
  data:
    - secretKey: password
      remoteRef: { key: prod/shop/db, property: password }`, 'prod ExternalSecret'),
      cx: `<p>One ExternalSecret per app Secret; one store per account; one age key for dev. Rotation cost in prod: zero commits.</p>`,
      f: ['How do you detect an ExternalSecret that stopped syncing? (status condition and the ESO metrics, alert on SecretSyncedError)', 'What would change if compliance forbids secrets in etcd at all? (Secrets Store CSI driver mounting directly into the Pod, plus etcd encryption at rest anyway)']
    })],
    deepDive: `<p>🟣 <b>etcd is the next leak.</b> Every approach ends as a Kubernetes Secret in etcd (except CSI-only mounts). Turn on encryption at rest (managed clusters often do it with a KMS key), restrict <code>get/list secrets</code> in RBAC, and remember that anyone who can create a Pod in a namespace can mount its Secrets.</p>
      <p>🟣 <b>Argo CD and Secret diffs.</b> Argo CD masks Secret values in the UI and diff, but it still needs read access to compare. For ESO-managed Secrets, the Secret itself is not in Git, so it is not part of the Application at all; only the ExternalSecret is. That is the cleanest boundary.</p>
      <p>🟣 <b>Key rotation for Sealed Secrets.</b> Renewal adds a new key; it does not re-encrypt old SealedSecrets. To truly retire an old key, re-seal everything (<code>kubeseal --re-encrypt</code>) and rotate the underlying secret values, because anyone who had the old private key can read old ciphertext from Git history.</p>
      <p>🟣 <b>Bootstrapping trust.</b> Something must be placed by hand or by the cloud: the Sealed Secrets key backup, the SOPS age key, or the cloud identity binding for ESO. Make that one step explicit in the runbook and test a full cluster rebuild at least once a quarter.</p>`,
    aiEra: `<p>🤖 Never paste real secret values into an AI chat or let an agent read <code>kubectl get secret -o yaml</code> output from prod. Assistants are useful for writing ExternalSecret mappings, <code>.sops.yaml</code> rules and gitleaks configs, all of which contain no values. Watch for a classic AI slip: generating a sample <code>Secret</code> with a realistic-looking password "for testing" in a committed file. CI secret scanning catches what review misses, including what an agent commits.</p>`
  });

  // ───────────────────────── Topic 8: Argo Rollouts ─────────────────────────
  topics.push({
    title: 'Progressive Delivery with Argo Rollouts: Canary, Blue-Green and Analysis',
    analogy: `<p>A new recipe in a restaurant. <b>Blue-green</b>: cook the full new menu in a second kitchen, let the staff taste it (preview), then switch every waiter to the new kitchen at once, keeping the old one warm for half an hour in case. <b>Canary</b>: serve the new dish to 1 table in 10, then 3 in 10, checking the plates that come back (analysis) at every step; if too many come back half-eaten, stop serving it immediately. Argo Rollouts is the head waiter who follows that plan and reads the plates.</p>`,
    explain: `<p>🟢 <b>Why a new object?</b> A Deployment only knows rolling updates: it cannot pause at 20% of traffic, query Prometheus, or abort by itself. <b>Argo Rollouts</b> adds a <code>Rollout</code> CRD (<code>argoproj.io/v1alpha1</code>) with the same Pod template as a Deployment plus a <code>strategy</code> of <code>canary</code> or <code>blueGreen</code>, and a controller that manages two ReplicaSets (stable and canary/preview). It works with any GitOps tool: Argo CD has a built-in health check for Rollouts (Paused shows as Suspended, aborted as Degraded).</p>
      ${H.table(['Strategy', 'How traffic moves', 'Cost', 'Best for'], [
        ['<b>Canary</b>', 'in steps: <code>setWeight</code> 5 → 20 → 50 → 100, with <code>pause</code> and <code>analysis</code> between', 'small extra capacity', 'stateless web/API with good metrics'],
        ['<b>Blue-green</b>', 'all at once: the <code>activeService</code> selector flips from old to new after preview checks', 'double capacity during the switch', 'apps that cannot mix versions; fast full rollback']
      ])}
      <p>🔵 <b>Canary without and with a traffic router.</b> Without one, weight is approximated by Pod counts (20% = about 1 Pod in 5 behind the same Service). With <code>trafficRouting</code> (NGINX Ingress, Istio, AWS ALB, SMI, Gateway API and others via plugins), Rollouts sets exact percentages on the router and can also route by header (<code>setHeaderRoute</code>) for internal testers, independent of Pod counts.</p>
      <p>🔵 <b>Analysis: the automated judge.</b> An <code>AnalysisTemplate</code> defines metrics: a provider query (Prometheus, Datadog, New Relic, CloudWatch, a Kubernetes Job, a web call), a <code>successCondition</code> such as <code>result[0] &gt;= 0.95</code>, an <code>interval</code>, a <code>count</code>, and a <code>failureLimit</code>. Each run creates an <code>AnalysisRun</code>. Measurements are Successful, Failed, Inconclusive or Error. More failures than <code>failureLimit</code> → the run is <b>Failed</b> → the Rollout <b>aborts</b>: traffic goes back to stable and the canary scales down. An Inconclusive run pauses the rollout for a human decision.</p>
      <p>🔵 <b>Where analysis runs.</b> As a <b>step</b> (<code>- analysis: {templates: [...]}</code>, blocks progress until done), in the <b>background</b> (<code>strategy.canary.analysis</code>, runs during all steps and aborts at any point), or for blue-green as <code>prePromotionAnalysis</code> (on the preview before switching) and <code>postPromotionAnalysis</code> (after switching; failure switches back).</p>
      <p>🔵 <b>Operating it.</b> <code>kubectl argo rollouts get rollout web --watch</code> shows steps, weights and analysis. <code>promote</code> skips a pause (or with <code>--full</code> all steps), <code>abort</code> goes back to stable, <code>retry</code> restarts after an abort, <code>undo</code> rolls back to an earlier revision. In GitOps the lasting fix is still a Git change; after an abort, Git still holds the bad version until you revert it.</p>`,
    clues: [
      '"Send 5% of traffic to the new version and stop automatically if errors rise" → Rollout canary + AnalysisTemplate on error rate',
      '"Exact 1% traffic split, not 1 Pod in 100" → canary with <code>trafficRouting</code> (Istio, NGINX, ALB, Gateway API)',
      '"Test the new version with internal users first" → <code>setHeaderRoute</code> or blue-green preview Service',
      '"Cannot run two versions at the same time" → blue-green (still check DB schema compatibility)',
      '"Rollback must be instant" → blue-green keeps the old ReplicaSet for <code>scaleDownDelaySeconds</code>; canary abort returns all traffic to stable',
      '"Argo CD shows the app Suspended" → a Rollout is paused at a step waiting for promotion'
    ],
    code: [Y(`apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata: { name: web, namespace: shop }
spec:
  replicas: 10
  revisionHistoryLimit: 3
  selector:
    matchLabels: { app: web }
  template:
    metadata:
      labels: { app: web }
    spec:
      containers:
        - name: web
          image: ghcr.io/example-org/web:1.8.2
          ports: [{ containerPort: 8080 }]
          readinessProbe: { httpGet: { path: /healthz, port: 8080 } }
  strategy:
    canary:
      canaryService: web-canary
      stableService: web-stable
      trafficRouting:
        nginx:
          stableIngress: web
      analysis:                      # background: watches during every step
        templates: [{ templateName: error-rate }]
        startingStep: 1
        args: [{ name: service, value: web-canary }]
      steps:
        - setWeight: 5
        - pause: { duration: 5m }
        - setWeight: 25
        - analysis:                  # step analysis: must pass to continue
            templates: [{ templateName: error-rate }]
            args: [{ name: service, value: web-canary }]
        - setWeight: 50
        - pause: {}                  # wait for a human: kubectl argo rollouts promote web
        - setWeight: 100`, 'rollout-canary.yaml'),
      Y(`apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata: { name: error-rate, namespace: shop }
spec:
  args:
    - name: service
  metrics:
    - name: success-rate
      interval: 1m
      count: 5
      failureLimit: 1                # 2 failed measurements = abort
      successCondition: result[0] >= 0.99
      provider:
        prometheus:
          address: http://prometheus.monitoring:9090
          query: |
            sum(rate(http_requests_total{service="{{args.service}}",code!~"5.."}[2m]))
            /
            sum(rate(http_requests_total{service="{{args.service}}"}[2m]))`, 'analysistemplate.yaml')],
    codeTitle: ['Canary Rollout with NGINX traffic routing', 'AnalysisTemplate on Prometheus success rate'],
    viz: [{
      title: 'Canary steps with analysis: promote or abort?',
      input: 'steps: w20 p a w50 a w100 ; results: 99,98 | 97,90 ; threshold=95 failureLimit=0',
      inputLabel: 'steps: wN (setWeight) p (pause) a (analysis) ; results: one comma list per a, separated by | ; threshold=N failureLimit=N',
      gen: function (input) {
        var parts = String(input || '').split(';').map(function (s) { return s.trim(); });
        if (parts.length !== 3) throw new Error('Write: steps: w20 p a ... ; results: 99,98 | 97 ; threshold=95 failureLimit=0');
        var steps = parts[0].replace(/^steps:\s*/, '').split(/\s+/).filter(Boolean);
        var res = parts[1].replace(/^results:\s*/, '').split('|').map(function (s) { return s.trim().split(',').filter(Boolean).map(Number); });
        var th = (parts[2].match(/threshold=(\d+)/) || [])[1], fl = (parts[2].match(/failureLimit=(\d+)/) || [])[1];
        if (th === undefined || fl === undefined) throw new Error('Third part: threshold=95 failureLimit=0');
        th = +th; fl = +fl;
        if (steps.length > 12) throw new Error('At most 12 steps');
        steps.forEach(function (s) { if (!/^(w\d{1,3}|p|a)$/.test(s)) throw new Error('Bad step "' + s + '": use wN, p or a'); });
        var weight = 0, ai = 0, f = [];
        function bars(label) { return { type: 'bars', label: label, values: [100 - weight, weight], idxLabels: ['stable', 'canary'], texts: [(100 - weight) + '%', weight + '%'], hl: { 1: 'cur' } }; }
        function plan(cur) { var hl = {}; for (var k = 0; k < cur; k++) hl[k] = 'done'; if (cur < steps.length) hl[cur] = 'cur'; return { type: 'array', label: 'steps', values: steps, hl: hl }; }
        f.push({ narr: 'The Rollout starts with 100% on <b>stable</b>. It will walk the steps in order; analysis measurements below ' + th + '% count as failures, and more than ' + fl + ' failure(s) abort.', parts: [plan(0), bars('traffic')] });
        for (var i = 0; i < steps.length; i++) {
          var s = steps[i];
          if (s[0] === 'w') { weight = Math.min(100, +s.slice(1)); f.push({ narr: '<b>setWeight ' + weight + '</b>: the router (or Pod ratio) now sends ' + weight + '% to the canary.', parts: [plan(i), bars('traffic')] }); }
          else if (s === 'p') f.push({ narr: '<b>pause</b>: the Rollout waits (a duration, or a human running <code>kubectl argo rollouts promote</code>). Argo CD shows it as Suspended.', parts: [plan(i), bars('traffic')] });
          else {
            var vals = res[ai++] || [], bad = vals.filter(function (v) { return v < th; }).length;
            var vhl = {}; vals.forEach(function (v, j) { vhl[j] = v < th ? 'bad' : 'ok'; });
            var meas = { type: 'array', label: 'AnalysisRun measurements (success %)', values: vals.length ? vals : ['none'], hl: vhl };
            if (bad > fl) { f.push({ narr: '<b>Analysis failed</b>: ' + bad + ' measurement(s) below ' + th + '% (limit ' + fl + '). The Rollout <b>aborts</b>.', parts: [plan(i), meas, bars('traffic')] }); weight = 0; f.push({ narr: '<b>Aborted</b>: all traffic back to stable, canary scaled down, Rollout Degraded. Git still has the bad version: revert it, then <code>retry</code> or push a fix.', parts: [plan(i), bars('traffic after abort')] }); return pad4(f, 'Aborted.'); }
            f.push({ narr: '<b>Analysis passed</b>: ' + bad + ' failure(s), within the limit of ' + fl + '. Continue.', parts: [plan(i), meas, bars('traffic')] });
          }
        }
        weight = 100;
        f.push({ narr: '<b>Promoted</b>: the canary ReplicaSet becomes the new stable; the old one scales down. Total exposure to a bad version was limited by the step weights.', parts: [plan(steps.length), bars('final')] });
        return pad4(f, 'Done.');
      }
    }],
    examples: [
      { title: 'Install Rollouts and watch a canary (lab)', html: `<p>The kubectl plugin gives a live view of steps, weights, ReplicaSets and AnalysisRuns. Change the image to start a rollout; promote or abort by hand to feel the controls.</p>`, code: SH(R`kubectl create namespace argo-rollouts
kubectl apply -n argo-rollouts -f https://github.com/argoproj/argo-rollouts/releases/latest/download/install.yaml
kubectl apply -n shop -f rollout-canary.yaml -f analysistemplate.yaml
kubectl argo rollouts set image web web=ghcr.io/example-org/web:1.8.3 -n shop   # lab only; in GitOps change Git
kubectl argo rollouts get rollout web -n shop --watch
kubectl argo rollouts promote web -n shop        # skip the current pause
kubectl argo rollouts abort web -n shop          # back to stable
kubectl argo rollouts retry rollout web -n shop  # try again after an abort`) },
      { title: 'Blue-green with pre- and post-promotion analysis', html: `<p>The preview Service points at the new ReplicaSet for testers and analysis. Only after <code>prePromotionAnalysis</code> passes does the active Service switch. The old ReplicaSet stays for <code>scaleDownDelaySeconds</code> so a switch back is instant.</p>`, code: Y(`apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata: { name: billing, namespace: shop }
spec:
  replicas: 4
  selector: { matchLabels: { app: billing } }
  template:
    metadata: { labels: { app: billing } }
    spec:
      containers:
        - name: billing
          image: ghcr.io/example-org/billing:3.2.0
  strategy:
    blueGreen:
      activeService: billing
      previewService: billing-preview
      autoPromotionEnabled: false          # a human (or pipeline) promotes
      prePromotionAnalysis:
        templates: [{ templateName: smoke-tests }]
      postPromotionAnalysis:
        templates: [{ templateName: error-rate }]
        args: [{ name: service, value: billing }]
      scaleDownDelaySeconds: 600           # keep blue for 10 minutes`, 'rollout-bluegreen.yaml') },
      { title: 'Situation: canary aborted, but Argo CD keeps trying', html: `<p>After an abort, the Rollout runs stable but its spec (from Git) still names the bad image, so Argo CD shows it Degraded and any retry repeats the failure. The GitOps fix is a revert commit; the Rollout then sees the stable image in its spec and becomes Healthy without a new rollout.</p>`, code: SH(R`kubectl argo rollouts get rollout web -n shop       # Status: Degraded (RolloutAborted)
kubectl get analysisrun -n shop --sort-by=.metadata.creationTimestamp | tail -3
kubectl describe analysisrun -n shop "$(kubectl get analysisrun -n shop -o name | tail -1 | cut -d/ -f2)"
git -C config revert --no-edit HEAD && git -C config push    # Git back to the stable tag
argocd app wait shop-prod --health --timeout 300`) }
    ],
    problems: [P({
      t: 'Canary step evaluator with analysis results', l: 'Medium', tags: ['argo-rollouts', 'canary', 'analysis'], co: ['Netflix', 'Intuit', 'Zalando'],
      s: `<p>Write <code>canary_run(steps, measurements, threshold, failure_limit)</code>. Steps: <code>"wN"</code> (set weight N, add <code>"weight N"</code>), <code>"p"</code> (pause, add <code>"pause at W"</code> with the current weight, then continue as if promoted), <code>"a"</code> (analysis). The k-th analysis step uses <code>measurements[k]</code>, a comma-separated list of integers. A measurement below <code>threshold</code> is a failure. If failures &gt; <code>failure_limit</code>: add <code>"analysis failed (F bad) at step i"</code> (i = step index from 0) and <code>"ABORTED: canary 0, stable 100"</code> and stop. Otherwise add <code>"analysis passed (F bad)"</code>. If all steps finish, add <code>"PROMOTED: canary is the new stable"</code>.</p>`,
      c: PYC,
      ex: `<p>Steps <code>w20 a w50 a</code>, measurements <code>["99,90"]</code>, threshold 95, limit 0 → ${H.c('r', '["weight 20", "analysis failed (1 bad) at step 1", "ABORTED: canary 0, stable 100"]')}. With limit 1 the same data passes.</p>`,
      bw: `<p>Averaging the measurements (94.5 vs 95) hides the shape: one terrible minute among good ones is exactly what <code>failureLimit</code> is designed to count. Argo Rollouts counts failed measurements, it does not average them.</p>`,
      q: ['<code>failureLimit: 1</code>, <code>count: 5</code>. Measurements so far: pass, fail, pass, fail. What is the AnalysisRun?', ['Failed: 2 failures > limit 1', 'Running: count not reached', 'Successful: majority passed', 'Inconclusive'], 0, 'As soon as failures exceed failureLimit the run is Failed, even before count is reached.'],
      h: ['<p>Hint 1: one pass over the steps with a current weight and an index into the measurements.</p>', '<p>Hint 2: for an analysis step, parse its measurements and count values below the threshold.</p>', '<p>Hint 3: return immediately on abort; append PROMOTED only if the loop finishes.</p>'],
      a: `<p>Simulate the controller: keep the current weight, and for each step append the trace line. An analysis step consumes the next measurement list, counts failures and either aborts (traffic back to stable, stop) or continues. Reaching the end means every gate passed, so the canary becomes the stable version.</p>`,
      code: PY(R`def canary_run(steps, measurements, threshold, failure_limit):
    trace, weight, a = [], 0, 0
    for i, s in enumerate(steps):
        if s.startswith("w"):
            weight = int(s[1:])
            trace.append("weight %d" % weight)
        elif s == "p":
            trace.append("pause at %d" % weight)
        elif s == "a":
            vals = [int(x) for x in measurements[a].split(",") if x]
            a += 1
            bad = sum(1 for v in vals if v < threshold)
            if bad > failure_limit:
                trace.append("analysis failed (%d bad) at step %d" % (bad, i))
                trace.append("ABORTED: canary 0, stable 100")
                return trace
            trace.append("analysis passed (%d bad)" % bad)
    trace.append("PROMOTED: canary is the new stable")
    return trace`),
      cx: `<p>O(S + M) for S steps and M measurements.</p>`,
      f: ['How does background analysis change this model? (it can abort between any two steps, not just at an analysis step)', 'What should an Inconclusive measurement do? (pause for a human, the default inconclusiveLimit is 0)'],
      tests: { sig: 'string[] string[] int int -> string[]', fn: 'canaryRun', cases: [[[["w20", "p", "a", "w50", "a", "w100"], ["99,98", "97,99"], 95, 0], ["weight 20", "pause at 20", "analysis passed (0 bad)", "weight 50", "analysis passed (0 bad)", "weight 100", "PROMOTED: canary is the new stable"]], [[["w20", "a", "w50", "a"], ["99,90"], 95, 0], ["weight 20", "analysis failed (1 bad) at step 1", "ABORTED: canary 0, stable 100"]], [[["w20", "a", "w50", "a"], ["99,90", "99,99"], 95, 1], ["weight 20", "analysis passed (1 bad)", "weight 50", "analysis passed (0 bad)", "PROMOTED: canary is the new stable"]], [[["w10", "a"], ["80,80,99"], 95, 1], ["weight 10", "analysis failed (2 bad) at step 1", "ABORTED: canary 0, stable 100"]], [[["w100"], [], 95, 0], ["weight 100", "PROMOTED: canary is the new stable"]], [[["a", "w30"], ["100"], 99, 0], ["analysis passed (0 bad)", "weight 30", "PROMOTED: canary is the new stable"]], [[["w25", "p", "w50", "p"], [], 95, 0], ["weight 25", "pause at 25", "weight 50", "pause at 50", "PROMOTED: canary is the new stable"]]] }
    })],
    deepDive: `<p>🟣 <b>Statistics still apply.</b> At 5% of low traffic, a single error swings the success rate. Use enough requests per measurement (window and interval), compare canary against stable rather than a fixed number when traffic patterns vary, and add <code>inconclusiveLimit</code> logic for "not enough data". The devops11 canary statistics notes apply here unchanged.</p>
      <p>🟣 <b>Weights without a router.</b> With 10 replicas and <code>setWeight: 25</code> the controller runs ceil(2.5) = 3 canary Pods; the actual traffic share depends on load balancing and connection reuse (long-lived gRPC/HTTP2 connections stick to Pods). Exact percentages and header routing need a traffic router.</p>
      <p>🟣 <b>Data and schema.</b> Progressive delivery protects stateless code. A canary that runs a destructive migration can break stable Pods too. Use expand/contract migrations: add columns in one release, switch reads/writes, remove old columns later, so both versions can run side by side during the canary or the blue-green overlap.</p>
      <p>🟣 <b>Rollouts and GitOps together.</b> Argo CD syncs the Rollout spec; Rollouts performs the gradual change. Do not let Argo CD self-heal fight the Rollouts controller over fields it manages (traffic weights on Ingress/VirtualService objects): Rollouts creates its own canary Ingress, and for Istio use <code>ignoreDifferences</code> on the managed route weights. Flagger is the Flux-ecosystem alternative with a similar canary/analysis model.</p>`,
    aiEra: `<p>🤖 Progressive delivery is a natural place for automated judgement, and some teams experiment with AI-assisted analysis that reads logs and traces during a canary. Keep the abort decision on a clear metric rule (success rate, latency SLO, error budget) that an engineer can read in the AnalysisTemplate; let AI summarise <i>why</i> a run failed (which endpoint, which error) and draft the revert PR. An assistant is also handy for writing PromQL for success rate, but test the query in Prometheus first: a query that returns no data makes every measurement Error or Inconclusive.</p>`
  });

  // ───────────────────────── Practice arena ─────────────────────────
  practice.push(P({
    t: 'Which GitOps principle is broken?', l: 'Easy', tags: ['gitops', 'principles'], co: ['Thoughtworks', 'Red Hat'],
    s: `<p>A team says "we do GitOps". Their setup: manifests in Git; a nightly CI job runs <code>kubectl apply -f manifests/</code> with a cluster-admin kubeconfig stored in CI; engineers sometimes <code>kubectl edit</code> production during incidents and "fix Git later". Name every OpenGitOps principle that is broken and give the smallest change that fixes each.</p>`,
    ex: `<p>Declarative and versioned: fine (YAML in Git). Pulled: broken (CI pushes). Continuously reconciled: broken (once a night, hand edits survive for up to a day).</p>`,
    bw: `<p>"Run the CI job every 5 minutes" makes reconciliation more frequent but keeps the push model and the admin credential in CI, and it still does not report drift.</p>`,
    q: ['Which change fixes BOTH broken principles at once?', ['Install Argo CD or Flux in the cluster with auto-sync and self-heal, and remove the kubeconfig from CI', 'Run the CI job hourly', 'Require PR reviews', 'Use Helm instead of kubectl'], 0, 'An in-cluster agent pulls and reconciles continuously; CI no longer needs cluster access.'],
    h: ['<p>Hint 1: list the four principles and check each one against the setup.</p>', '<p>Hint 2: who initiates the apply, and how often does anyone compare live with Git?</p>', '<p>Hint 3: the fix moves the actor into the cluster and makes hand edits visible or reverted.</p>'],
    a: `<p><b>Pulled automatically</b> is broken: CI pushes with a cluster-admin credential. <b>Continuously reconciled</b> is broken: one apply per night, no drift detection, hand edits live until the next run. Fix: install Argo CD (or Flux) in the cluster pointed at the repo with automated sync, <code>prune</code> and <code>selfHeal</code>; delete the kubeconfig from CI; CI now only builds and opens config PRs. For incidents, document the emergency path (commit first, or pause auto-sync for one app with a ticket).</p>`,
    code: SH(R`# remove the push path
gh secret delete KUBECONFIG_PROD --repo example-org/config
# add the pull path
kubectl create namespace argocd
kubectl apply -n argocd --server-side --force-conflicts -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
kubectl apply -f argocd/apps/root-app.yaml        # automated: prune + selfHeal`),
    cx: `<p>One install plus a root Application; CI gets simpler.</p>`, f: ['How do you keep an emergency path without breaking GitOps? (a documented break-glass role and a required follow-up commit)', 'What metric shows drift over time? (count of OutOfSync apps, argocd_app_info sync_status)']
  }));
  practice.push(P({
    t: 'Write an Argo CD Application for a Kustomize overlay', l: 'Easy', tags: ['argocd', 'application', 'kustomize'], co: ['Adobe', 'Intuit'],
    s: `<p>Create an Application <code>web-staging</code> in project <code>web</code> that deploys <code>apps/web/overlays/staging</code> from <code>https://github.com/example-org/config.git</code> (branch <code>main</code>) to namespace <code>web-staging</code> in the local cluster. It must create the namespace, auto-sync, prune, self-heal, and retry 3 times with backoff. Deleting the Application must delete its resources.</p>`,
    ex: `<p>Expected: <code>argocd app get web-staging</code> shows Synced/Healthy; deleting a Deployment by hand brings it back within seconds; removing a file from the overlay removes the object.</p>`,
    bw: `<p>An Application without the resources finalizer leaves orphaned workloads when it is deleted; without <code>CreateNamespace=true</code> the first sync fails because the namespace does not exist.</p>`,
    bc: `apiVersion: argoproj.io/v1alpha1
kind: Application
metadata: { name: web-staging, namespace: argocd }
spec:
  project: default                  # no guard rails
  source: { repoURL: https://github.com/example-org/config.git, path: apps/web/overlays/staging }
  destination: { server: https://kubernetes.default.svc, namespace: web-staging }`, bcl: 'yaml',
    q: ['Which field makes deleting the Application also delete the Deployment it created?', ['The finalizer resources-finalizer.argocd.argoproj.io', 'syncPolicy.automated.prune', 'selfHeal', 'CreateNamespace=true'], 0, 'prune deletes objects removed from Git; the finalizer controls what happens when the Application itself is deleted.'],
    h: ['<p>Hint 1: source, destination, project, syncPolicy: four blocks.</p>', '<p>Hint 2: automated has prune and selfHeal; namespace creation is a sync option.</p>', '<p>Hint 3: retry has limit and backoff; cascade delete is a finalizer in metadata.</p>'],
    a: `<p>Set metadata with the resources finalizer, point the source at the overlay with <code>targetRevision: main</code>, the destination at the in-cluster API server, and turn on automated sync with prune and selfHeal, <code>CreateNamespace=true</code>, and a bounded retry.</p>`,
    code: Y(`apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: web-staging
  namespace: argocd
  finalizers: [resources-finalizer.argocd.argoproj.io]
spec:
  project: web
  source:
    repoURL: https://github.com/example-org/config.git
    targetRevision: main
    path: apps/web/overlays/staging
  destination:
    server: https://kubernetes.default.svc
    namespace: web-staging
  syncPolicy:
    automated: { prune: true, selfHeal: true }
    syncOptions: [CreateNamespace=true]
    retry:
      limit: 3
      backoff: { duration: 5s, factor: 2, maxDuration: 1m }`, 'web-staging.yaml'),
    cx: `<p>One object; Argo CD does the rest.</p>`, f: ['Why pin targetRevision to a tag for prod? (prod changes only when someone moves the tag or bumps it by PR)', 'What does the default project allow? (everything; create a project per team)']
  }));
  practice.push(P({
    t: 'Is it in sync, given ignoreDifferences?', l: 'Easy', tags: ['argocd', 'ignoreDifferences', 'drift'], co: ['Intuit', 'Salesforce'],
    s: `<p>Write <code>in_sync(desired, live, ignored)</code>. <code>desired</code> and <code>live</code> are one object each, <code>"Kind/name key=value ..."</code>. <code>ignored</code> lists field names to skip (like an <code>ignoreDifferences</code> rule). Return <code>True</code> when the names match and every desired field not in <code>ignored</code> has the same live value (fields only present live do not matter). A missing live field counts as different unless ignored.</p>`,
    c: PYC,
    ex: `<p>Desired <code>replicas=3</code>, live <code>replicas=7</code> (an HPA scaled it), ignored <code>["replicas"]</code> → ${H.c('g', 'True')}. Without the rule → ${H.c('r', 'False')}: Argo CD would show OutOfSync forever, and selfHeal would fight the HPA.</p>`,
    bw: `<p>Removing <code>replicas</code> from Git is the other common fix and often better, but if you keep it, an ignore rule is needed; comparing everything makes the app flap between Synced and OutOfSync.</p>`,
    q: ['An HPA manages replicas and Git also sets <code>replicas: 3</code> with selfHeal on. What happens without an ignore rule?', ['Argo CD keeps resetting replicas to 3 and the HPA keeps scaling up: a tug of war', 'Nothing: Argo CD ignores HPAs', 'The HPA is deleted', 'Argo CD scales to the HPA max'], 0, 'Two controllers own one field. Remove replicas from Git or ignore it.'],
    h: ['<p>Hint 1: parse each line into a name and a dict.</p>', '<p>Hint 2: different names mean not in sync.</p>', '<p>Hint 3: loop over desired keys, skip ignored ones, compare with <code>live.get(key)</code>.</p>'],
    a: `<p>Parse both lines. If the object names differ, the desired object does not exist live. Otherwise compare only declared, non-ignored keys; an absent live key returns None, which never equals a declared value.</p>`,
    code: PY(R`def _parse(lines):
    out = {}
    for line in lines:
        parts = line.split()
        if not parts:
            continue
        kv = {}
        for tok in parts[1:]:
            k, _, v = tok.partition("=")
            kv[k] = v
        out[parts[0]] = kv
    return out

def in_sync(desired, live, ignored):
    want, have = _parse([desired]), _parse([live])
    (name, w), = want.items()
    h = have.get(name)
    if h is None:
        return False
    for k, v in w.items():
        if k in ignored:
            continue
        if h.get(k) != v:
            return False
    return True`),
    cx: `<p>O(k) for k declared fields.</p>`, f: ['What does RespectIgnoreDifferences=true add? (sync also leaves ignored fields alone instead of overwriting them)', 'When is managedFieldsManagers better than a jsonPointer? (ignore every field owned by a given controller, e.g. kube-controller-manager)'],
    tests: { sig: 'string string string[] -> bool', fn: 'inSync', cases: [[["Deployment/web replicas=3 image=a:1", "Deployment/web replicas=7 image=a:1", ["replicas"]], true], [["Deployment/web replicas=3 image=a:1", "Deployment/web replicas=7 image=a:1", []], false], [["Deployment/web image=a:2", "Deployment/web image=a:1", ["replicas"]], false], [["Deployment/web image=a:1", "Deployment/web image=a:1 extra=1", []], true], [["Deployment/web image=a:1", "Deployment/api image=a:1", []], false], [["ConfigMap/c k=v", "ConfigMap/c", []], false], [["ConfigMap/c k=v", "ConfigMap/c", ["k"]], true]] }
  }));
  practice.push(P({
    t: 'How long will this sync take?', l: 'Medium', tags: ['argocd', 'sync-waves', 'estimation'], co: ['Intuit', 'Spotify'],
    s: `<p>Write <code>sync_time(resources)</code>. Each item is <code>"name Phase wave seconds"</code> (seconds until that resource is healthy). Resources in the same (phase, wave) group run in parallel, so a group takes its slowest member; groups run one after another. Return the total seconds.</p>`,
    c: PYC,
    ex: `<p>PreSync migrate 40 s; Sync wave 0: web 60 s and api 90 s; PostSync smoke 20 s → 40 + 90 + 20 = ${H.c('g', '150')}.</p>`,
    bw: `<p>Summing every resource (40 + 60 + 90 + 20 = 210) treats parallel work as sequential. Taking only the overall maximum (90) ignores that waves wait for each other.</p>`,
    q: ['You move a slow Job from wave 0 to its own wave 1. What happens to total sync time?', ['It can grow: the Job no longer overlaps with wave 0', 'It always shrinks', 'Nothing changes', 'The sync fails'], 0, 'Waves are sequential. Splitting work into more waves adds their maxima together.'],
    h: ['<p>Hint 1: group the resources by the pair (phase, wave); each pair is one step.</p>', '<p>Hint 2: members of a group run in parallel, so a group costs its slowest member.</p>', '<p>Hint 3: sum the group maxima; an empty list costs 0.</p>'],
    a: `<p>Build a dict from (phase index, wave) to the largest seconds seen, then sum the values. Order does not change the sum, but the model reflects that each group must finish before the next one starts.</p>`,
    code: PY(R`PHASES = ["PreSync", "Sync", "PostSync"]

def sync_time(resources):
    groups = {}
    for r in resources:
        name, phase, wave, secs = r.split()
        key = (PHASES.index(phase), int(wave))
        groups[key] = max(groups.get(key, 0), int(secs))
    return sum(groups.values())`),
    cx: `<p>O(n) time with one dict of group maxima.</p>`, f: ['Why can too many waves make syncs slow? (every wave waits for health, including readiness probe delays)', 'How do sync timeouts interact? (a stuck wave blocks everything after it until the operation fails)'],
    tests: { sig: 'string[] -> int', fn: 'syncTime', cases: [[[["migrate PreSync 0 40", "web Sync 0 60", "api Sync 0 90", "smoke PostSync 0 20"]], 150], [[["a Sync 0 10", "b Sync 1 10", "c Sync 2 10"]], 30], [[["a Sync 0 10"]], 10], [[[]], 0], [[["a Sync 0 5", "b Sync 0 5", "c Sync 0 5"]], 5], [[["n Sync -1 3", "d Sync 0 30", "j PostSync 0 12", "k PostSync 1 4"]], 49]] }
  }));
  practice.push(P({
    t: 'Kustomize images: rewrite tags and registries', l: 'Medium', tags: ['kustomize', 'images', 'promotion'], co: ['Shopify', 'GitLab'],
    s: `<p>Write <code>apply_images(containers, overrides)</code>. Containers are <code>"name=repository:tag"</code> (the tag is after the <b>last</b> colon, so a registry port like <code>localhost:5000</code> stays in the repository). Overrides are <code>"repository=newTag"</code> or <code>"repository=newRepository:newTag"</code>. Apply the matching override (exact repository match) to every container, keep order, and return the updated list.</p>`,
    c: PYC,
    ex: `<p><code>app=nginx:1.25</code> with <code>nginx=mirror.local/nginx:1.27</code> → ${H.c('g', 'app=mirror.local/nginx:1.27')}. <code>app=localhost:5000/web:1</code> with <code>localhost:5000/web=2</code> → ${H.c('g', 'app=localhost:5000/web:2')}.</p>`,
    bw: `<p>Splitting on the first colon breaks images from registries with ports. Replacing by substring (<code>str.replace</code>) rewrites <code>web</code> inside <code>web-worker</code> too.</p>`,
    q: ['In a kustomization <code>images:</code> entry, what does <code>name</code> match?', ['The image name in the manifests (without tag)', 'The container name', 'The Deployment name', 'The registry hostname only'], 0, 'Kustomize matches image references by name, ignoring the tag, and replaces name/tag/digest.'],
    h: ['<p>Hint 1: <code>rpartition(":")</code> splits at the last colon.</p>', '<p>Hint 2: put overrides in a dict by repository.</p>', '<p>Hint 3: an override value with a colon changes repository and tag; without, only the tag.</p>'],
    a: `<p>Index overrides by repository. For each container, split the image at the last colon, look up the repository, apply either a tag-only or a repository+tag change, and rebuild the string. This is what <code>kustomize edit set image</code> writes into the overlay and what <code>kustomize build</code> applies.</p>`,
    code: PY(R`def apply_images(containers, overrides):
    rules = {}
    for o in overrides:
        old, _, new = o.partition("=")
        rules[old] = new
    out = []
    for c in containers:
        name, _, image = c.partition("=")
        repo, _, tag = image.rpartition(":")
        if repo in rules:
            new = rules[repo]
            if ":" in new:
                repo, tag = new.split(":", 1)
            else:
                tag = new
        out.append("%s=%s:%s" % (name, repo, tag))
    return out`),
    cx: `<p>O(c + o) for c containers and o overrides.</p>`, f: ['Why pin digests (<code>digest: sha256:...</code>) in prod overlays? (tags can move; digests cannot)', 'How does Argo CD Image Updater write this? (git write-back of a .argocd-source or kustomization file)'],
    tests: { sig: 'string[] string[] -> string[]', fn: 'applyImages', cases: [[[["app=ghcr.io/acme/web:1.0"], ["ghcr.io/acme/web=1.1"]], ["app=ghcr.io/acme/web:1.1"]], [[["app=ghcr.io/acme/web:1.0", "side=fluent/fluent-bit:3.0"], ["ghcr.io/acme/web=1.2"]], ["app=ghcr.io/acme/web:1.2", "side=fluent/fluent-bit:3.0"]], [[["app=nginx:1.25"], ["nginx=mirror.local/nginx:1.27"]], ["app=mirror.local/nginx:1.27"]], [[["app=localhost:5000/web:1"], ["localhost:5000/web=2"]], ["app=localhost:5000/web:2"]], [[["a=x:1"], []], ["a=x:1"]], [[[], ["x=2"]], []], [[["a=redis:7", "b=redis:7"], ["redis=7.2"]], ["a=redis:7.2", "b=redis:7.2"]]] }
  }));
  practice.push(P({
    t: 'Pick the image tag a semver policy allows', l: 'Medium', tags: ['flux', 'image-automation', 'semver'], co: ['Weaveworks', 'Grafana Labs'],
    s: `<p>Write <code>pick_tag(tags, low, high)</code> modelling a Flux <code>ImagePolicy</code> with range <code>&gt;=low &lt;high</code>. Consider only tags of the form <code>X.Y.Z</code> or <code>vX.Y.Z</code> (digits only). Return the highest allowed tag exactly as written, or <code>&lt;none&gt;</code>.</p>`,
    c: PYC,
    ex: `<p><code>["1.2.0", "1.3.1", "1.10.0", "2.0.0"]</code>, range <code>&gt;=1.0.0 &lt;2.0.0</code> → ${H.c('g', '1.10.0')} (numeric compare; 2.0.0 is excluded by the upper bound).</p>`,
    bw: `<p><code>max(tags)</code> on strings picks <code>"1.3.1"</code> over <code>"1.10.0"</code> and happily picks <code>latest</code>. Semver must be compared as numbers, and non-semver tags ignored.</p>`,
    q: ['Why is <code>latest</code> never a good tag for GitOps image automation?', ['It moves: Git would not record which build runs', 'It is too long', 'Flux cannot read it', 'It is always older'], 0, 'GitOps needs Git to identify the exact artifact; mutable tags break that.'],
    h: ['<p>Hint 1: strip a leading v, split on dots, require exactly three numeric parts.</p>', '<p>Hint 2: compare tuples of ints; low is inclusive, high exclusive.</p>', '<p>Hint 3: keep the best (tuple, original string) pair.</p>'],
    a: `<p>Filter to valid semver, convert to integer tuples, keep those inside the half-open range, and return the original spelling of the maximum. This is the decision the image-reflector-controller makes before image-automation commits the tag.</p>`,
    code: PY(R`def _ver(v):
    return tuple(int(x) for x in v.split("."))

def pick_tag(tags, low, high):
    best = None
    for t in tags:
        s = t[1:] if t.startswith("v") else t
        p = s.split(".")
        if len(p) != 3 or not all(x.isdigit() for x in p):
            continue
        v = tuple(int(x) for x in p)
        if _ver(low) <= v < _ver(high) and (best is None or v > best[0]):
            best = (v, t)
    return best[1] if best else "<none>"`),
    cx: `<p>O(n) time for n tags, O(1) extra space.</p>`, f: ['How are pre-releases like 1.2.0-rc.1 handled by real semver ranges? (excluded unless the range includes a pre-release)', 'Why might you use a timestamp-sortable tag with a numerical policy instead? (main-branch builds without semver)'],
    tests: { sig: 'string[] string string -> string', fn: 'pickTag', cases: [[[["1.2.0", "1.3.1", "1.10.0", "2.0.0"], "1.0.0", "2.0.0"], "1.10.0"], [[["v1.2.0", "v1.4.0", "latest"], "1.0.0", "2.0.0"], "v1.4.0"], [[["latest", "main-abc123"], "1.0.0", "2.0.0"], "<none>"], [[["2.0.0", "2.1.0"], "1.0.0", "2.0.0"], "<none>"], [[["1.0.0"], "1.0.0", "1.0.1"], "1.0.0"], [[["1.2", "1.2.3.4", "1.2.3"], "1.0.0", "9.0.0"], "1.2.3"], [[[], "0.0.0", "1.0.0"], "<none>"]] }
  }));
  practice.push(P({
    t: 'AnalysisRun verdict', l: 'Medium', tags: ['argo-rollouts', 'analysis', 'metrics'], co: ['Netflix', 'Lyft'],
    s: `<p>Write <code>analysis_verdict(values, success_min, failure_limit, count)</code> for one metric. <code>values</code> are measurements in order: an integer percentage, or <code>"x"</code> for an inconclusive measurement (no data). Process in order: a value below <code>success_min</code> is a failure; as soon as failures &gt; <code>failure_limit</code> return <code>Failed</code>; as soon as there is one inconclusive measurement return <code>Inconclusive</code> (inconclusiveLimit 0). After all values: <code>Successful</code> if at least <code>count</code> measurements were taken, else <code>Running</code>.</p>`,
    c: PYC,
    ex: `<p><code>["99","90","99"]</code>, min 95, limit 1, count 3 → ${H.c('g', 'Successful')} (one failure is allowed). <code>["99","x"]</code> → ${H.c('y', 'Inconclusive')}: a human must decide.</p>`,
    bw: `<p>Waiting for all <code>count</code> measurements before judging wastes minutes of bad traffic: the controller fails the run as soon as the limit is exceeded.</p>`,
    q: ['A Prometheus query returns an empty result during a canary. What is the risk?', ['Measurements error or are inconclusive, so the rollout pauses or aborts without a real signal', 'Nothing: empty means zero errors', 'The rollout promotes faster', 'Prometheus restarts'], 0, 'Test queries with real labels; empty results are a classic analysis misconfiguration.'],
    h: ['<p>Hint 1: process measurements one by one, the controller judges as data arrives.</p>', '<p>Hint 2: check the failure limit right after each failure, and inconclusive right after each x.</p>', '<p>Hint 3: at the end compare the number of measurements with count.</p>'],
    a: `<p>Walk the measurements in arrival order with two counters. Fail fast when failures exceed the limit; stop on the first inconclusive one because the limit is 0. If neither happened, the run is complete only when <code>count</code> measurements exist; otherwise it is still running.</p>`,
    code: PY(R`def analysis_verdict(values, success_min, failure_limit, count):
    failed = inconclusive = 0
    for v in values:
        if v == "x":
            inconclusive += 1
        elif int(v) < success_min:
            failed += 1
        if failed > failure_limit:
            return "Failed"
        if inconclusive > 0:
            return "Inconclusive"
    return "Successful" if len(values) >= count else "Running"`),
    cx: `<p>O(n) for n measurements.</p>`, f: ['What does consecutiveErrorLimit cover? (provider errors such as Prometheus down, separate from failed measurements)', 'Why set count with interval for step analysis? (otherwise the run would go on forever)'],
    tests: { sig: 'string[] int int int -> string', fn: 'analysisVerdict', cases: [[[["99", "98", "97"], 95, 0, 3], "Successful"], [[["99", "90"], 95, 0, 3], "Failed"], [[["99", "90", "99"], 95, 1, 3], "Successful"], [[["99", "90", "90"], 95, 1, 5], "Failed"], [[["99", "x"], 95, 0, 3], "Inconclusive"], [[["99"], 95, 0, 3], "Running"], [[[], 95, 0, 1], "Running"], [[["95", "95"], 95, 0, 2], "Successful"]] }
  }));
  practice.push(P({
    t: 'Flux HelmRelease with values per environment', l: 'Medium', tags: ['flux', 'helm', 'valuesFrom'], co: ['SAP', 'Deutsche Telekom'],
    s: `<p>Deploy the <code>podinfo</code> chart (OCI repository <code>oci://ghcr.io/stefanprodan/charts</code>, version 6.x) with Flux in <code>dev</code> and <code>prod</code>. Common values live in the HelmRelease; prod-only values come from a ConfigMap generated by Kustomize; a failed upgrade must roll back automatically; hand edits must be reverted.</p>`,
    ex: `<p>Expected: <code>helm history podinfo -n prod</code> shows real revisions; changing the ConfigMap triggers an upgrade; <code>kubectl scale</code> on the Deployment is reverted by drift detection.</p>`,
    bw: `<p>Copying the whole HelmRelease per environment duplicates 90% of the YAML. Putting prod values in <code>--set</code> style annotations is not possible; Flux reads values only from the spec and <code>valuesFrom</code>.</p>`,
    q: ['Where do Flux HelmRelease values come from, and which wins?', ['valuesFrom entries in order, then spec.values merged on top', 'Only the chart defaults', 'Only spec.values', 'The last applied ConfigMap in the namespace'], 0, 'valuesFrom are merged in order, and inline values have the final say.'],
    h: ['<p>Hint 1: a base HelmRelease plus an overlay per environment.</p>', '<p>Hint 2: configMapGenerator with <code>disableNameSuffixHash</code> or a stable name keeps valuesFrom simple.</p>', '<p>Hint 3: remediation strategy rollback and driftDetection enabled.</p>'],
    a: `<p>Put a HelmRepository (type oci) and a base HelmRelease in <code>apps/podinfo/base</code>. The prod overlay generates <code>podinfo-values</code> from <code>values-prod.yaml</code> (stable name) and patches the HelmRelease to add <code>valuesFrom</code>. Set <code>upgrade.remediation.strategy: rollback</code> with retries and <code>driftDetection.mode: enabled</code>. A Flux Kustomization per environment applies the matching overlay.</p>`,
    code: Y(`# apps/podinfo/overlays/prod/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: prod
resources: [../../base]
configMapGenerator:
  - name: podinfo-values
    files: [values.yaml=values-prod.yaml]
    options: { disableNameSuffixHash: true }
patches:
  - target: { kind: HelmRelease, name: podinfo }
    patch: |
      - op: add
        path: /spec/valuesFrom
        value:
          - kind: ConfigMap
            name: podinfo-values
            valuesKey: values.yaml`, 'overlays/prod/kustomization.yaml'),
    cx: `<p>One base, one small overlay per environment.</p>`, f: ['Why does a hash-suffixed ConfigMap complicate valuesFrom? (the name changes; Flux would need the new name, so disable the suffix or use Kustomize name references)', 'How do you test the chart upgrade before prod? (dev follows 6.x automatically; prod pins an exact version via PR)']
  }));
  practice.push(P({
    t: 'Self-heal fights an HPA: diagnose and fix', l: 'Hard', tags: ['argocd', 'hpa', 'drift', 'incident'], co: ['Uber', 'Booking.com'],
    s: `<p>After enabling <code>selfHeal</code>, the <code>web</code> Deployment's replica count jumps between 3 and 12 every few minutes, latency spikes each time, and Argo CD history shows dozens of auto-syncs per hour. The HPA targets 60% CPU, min 3, max 15. Git sets <code>replicas: 3</code>. Explain the loop and fix it the GitOps way, including how you prove it is fixed.</p>`,
    ex: `<p>Root cause: two controllers own <code>spec.replicas</code>. The HPA scales to 12; Argo CD sees drift and resets to 3; load returns; repeat.</p>`,
    bw: `<p>Turning off selfHeal "fixes" the symptom and leaves every other hand edit unreported. Raising HPA min to 12 wastes money and hides the bug.</p>`,
    bc: `syncPolicy:
  automated: { prune: true, selfHeal: false }   # hides the loop, loses self-heal everywhere`, bcl: 'yaml',
    q: ['Which fix removes the conflict at its source?', ['Remove replicas from the Deployment in Git (and/or ignore /spec/replicas with RespectIgnoreDifferences)', 'Set HPA maxReplicas to 3', 'Disable auto-sync', 'Delete the HPA'], 0, 'Only one owner per field: let the HPA own replicas.'],
    h: ['<p>Hint 1: look for two controllers writing the same field.</p>', '<p>Hint 2: <code>kubectl get deploy web -o yaml --show-managed-fields</code> shows the managers.</p>', '<p>Hint 3: remove the field from Git, add an ignore rule for safety, and watch sync history go quiet.</p>'],
    a: `<p>The HPA writes <code>spec.replicas</code> (manager <code>kube-controller-manager</code>), and Argo CD's self-heal writes it back to the Git value. Fix: delete <code>replicas</code> from the Deployment manifest (the HPA's <code>minReplicas</code> sets the floor), and add <code>ignoreDifferences</code> for <code>/spec/replicas</code> on Deployments with <code>RespectIgnoreDifferences=true</code> so an old manifest cannot reintroduce the fight. Prove it: <code>argocd app history</code> stops growing, the Deployment's replicas follow the HPA, and an alert on "auto-syncs per hour &gt; N" stays quiet.</p>`,
    code: SH(R`kubectl get deploy web -n shop -o yaml --show-managed-fields | grep -B2 -A6 'f:replicas'
argocd app history web-prod | tail -20                 # many syncs = the loop
yq -i 'del(.spec.replicas)' apps/web/base/deployment.yaml
git commit -am "web: let the HPA own replicas" && git push
argocd app patch web-prod --type merge --patch '{"spec":{"ignoreDifferences":[{"group":"apps","kind":"Deployment","jsonPointers":["/spec/replicas"]}],"syncPolicy":{"syncOptions":["RespectIgnoreDifferences=true"]}}}'
kubectl get hpa web -n shop -w`),
    cx: `<p>One commit and one ignore rule (better: put the ignore rule in the Application YAML in Git, not via patch).</p>`, f: ['Where should the ignore rule live? (in the Application manifest in Git; the patch above is for the lab)', 'What other fields commonly need this? (caBundle injected by webhooks, Istio-managed fields, defaulted fields)']
  }));
  practice.push(P({
    t: 'App-of-apps prune plan', l: 'Hard', tags: ['argocd', 'app-of-apps', 'finalizers'], co: ['Spotify', 'Adobe'],
    s: `<p>Write <code>prune_plan(desired, live, finalizers)</code>. <code>desired</code>: child Applications in the root folder in Git; <code>live</code>: child Applications in the cluster; <code>finalizers</code>: live Applications carrying the resources finalizer. For each live app not desired (sorted): <code>DELETE app cascade</code> if it has the finalizer (its workloads are deleted too), else <code>DELETE app orphan</code> (workloads keep running, unmanaged). Then, sorted, <code>CREATE app</code> for each desired app not live. Return <code>["NOTHING"]</code> if there are no actions.</p>`,
    c: PYC,
    ex: `<p>Desired <code>web, api</code>; live <code>web, api, old</code>; finalizer on <code>old</code> → ${H.c('r', '["DELETE old cascade"]')}: pruning the root app will delete old's Deployment, Service, everything.</p>`,
    bw: `<p>Treating every deletion the same hides the most important fact for a reviewer: whether real workloads disappear. A plan that does not say "cascade" is how a cleanup PR takes down a service.</p>`,
    q: ['A child Application without the resources finalizer is pruned by the root app. What happens to its Deployment?', ['It keeps running, but nothing manages it any more', 'It is deleted', 'It is moved to the root app', 'Argo CD refuses to prune'], 0, 'Without the finalizer, deleting an Application is non-cascading: resources are orphaned.'],
    h: ['<p>Hint 1: two set differences: live minus desired, desired minus live.</p>', '<p>Hint 2: the finalizer set decides cascade vs orphan.</p>', '<p>Hint 3: deletions first (sorted), then creations (sorted), NOTHING when empty.</p>'],
    a: `<p>Compute the apps that will be pruned and the apps that will be created. For each pruned app the finalizer decides whether Argo CD deletes its managed resources (cascade) or leaves them orphaned. Emitting this plan in CI for every PR that touches the root folder gives reviewers the real impact.</p>`,
    code: PY(R`def prune_plan(desired, live, finalizers):
    want, fin, out = set(desired), set(finalizers), []
    for app in sorted(live):
        if app in want:
            continue
        out.append("DELETE %s %s" % (app, "cascade" if app in fin else "orphan"))
    for app in sorted(want - set(live)):
        out.append("CREATE " + app)
    return out or ["NOTHING"]`),
    cx: `<p>O(n log n) for sorting n apps.</p>`, f: ['Which is safer by default for platform add-ons, cascade or orphan? (orphan for stateful or shared things; cascade for app workloads you really want gone)', 'How can a PR check compute this? (render the root folder and diff with argocd app list output)'],
    tests: { sig: 'string[] string[] string[] -> string[]', fn: 'prunePlan', cases: [[[["web", "api"], ["web", "api", "old"], ["old"]], ["DELETE old cascade"]], [[["web"], ["web", "legacy"], []], ["DELETE legacy orphan"]], [[["web", "api"], ["web"], []], ["CREATE api"]], [[["a"], ["a"], ["a"]], ["NOTHING"]], [[[], ["b", "a"], ["a"]], ["DELETE a cascade", "DELETE b orphan"]], [[["x"], [], []], ["CREATE x"]]] }
  }));
  practice.push(P({
    t: 'Design GitOps for 40 clusters in three regions', l: 'Hard', tags: ['gitops', 'architecture', 'applicationset', 'multi-cluster'], co: ['Google', 'Datadog', 'Cloudflare'],
    s: `<p>Your company runs 40 Kubernetes clusters (dev, staging, prod in three regions, plus edge clusters with flaky links). 25 teams deploy about 150 services. Design the GitOps setup: tool choice and topology, repository layout, how teams onboard, promotion, secrets, progressive delivery, and how you limit blast radius.</p>`,
    ex: `<p>A strong design names the trade-offs: hub-and-spoke Argo CD versus per-cluster agents, monorepo versus repo-per-team, and shows how one bad commit cannot reach all 40 clusters at once.</p>`,
    bw: `<p>One Argo CD with all 40 clusters, one repo, one ApplicationSet with auto-sync to every cluster: a single merged mistake (or a compromised Argo CD) hits everything at the same time, and edge clusters with flaky links time out constantly.</p>`,
    q: ['Which choice most limits blast radius for a bad config commit?', ['Promote per wave of clusters (dev → staging → one prod region → others) with health gates between', 'One ApplicationSet syncing all clusters at once', 'Faster polling', 'More replicas of argocd-server'], 0, 'Staged promotion across environments and regions turns one mistake into one region\'s problem.'],
    h: ['<p>Hint 1: start with failure domains: what must not fail together?</p>', '<p>Hint 2: decide the control plane topology (hub, per-region, per-cluster agents) and the repo boundaries.</p>', '<p>Hint 3: promotion waves, secrets via ESO, Rollouts for prod services, AppProjects or Flux tenancy for teams.</p>'],
    a: `<p><b>Topology:</b> one Argo CD per region (hub for that region's clusters) plus a management instance for platform add-ons; edge clusters run Flux locally pulling signed OCI artifacts, because pull works over flaky links and needs no inbound access. <b>Repos:</b> a platform repo (clusters, add-ons, ApplicationSets, AppProjects) and a config repo per team with <code>overlays/{dev,staging,prod-eu,prod-us,prod-ap}</code>. <b>Onboarding:</b> a team adds itself to a JSON file in the platform repo; an ApplicationSet (git files × clusters generator, matrix) creates its Applications in its own AppProject restricted to its repo and namespaces. <b>Promotion:</b> CI builds once and commits to dev; promotion PRs move the digest to staging, then prod in waves (one region first, soak 1 h, then the rest), each gated on Argo CD health and Rollouts analysis; sync windows block Friday evenings. <b>Secrets:</b> External Secrets with workload identity per cluster; no secret values in Git. <b>Progressive delivery:</b> Rollouts canary with success-rate analysis for prod services. <b>Blast radius:</b> per-region control planes, AppProjects with no cluster-scoped resources for teams, branch protection and CODEOWNERS, signed commits/artifacts, and a break-glass runbook. <b>Ops:</b> alert on OutOfSync/Degraded counts, sync failures, and suspended objects.</p>`,
    code: Y(`# platform repo: teams/payments.json drives this ApplicationSet (git files x clusters)
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata: { name: team-apps, namespace: argocd }
spec:
  goTemplate: true
  goTemplateOptions: ["missingkey=error"]
  generators:
    - matrix:
        generators:
          - git:
              repoURL: https://github.com/example-org/platform.git
              revision: main
              files: [{ path: "teams/*.json" }]
          - clusters:
              selector:
                matchLabels: { region: eu, env: prod }
  template:
    metadata:
      name: "{{.team}}-{{.name}}"
    spec:
      project: "team-{{.team}}"           # project comes from the platform-owned file, not from team input
      source:
        repoURL: "{{.repo}}"
        targetRevision: main
        path: overlays/prod-eu
      destination:
        server: "{{.server}}"
        namespace: "{{.team}}"
      syncPolicy:
        automated: { prune: true, selfHeal: true }`, 'team-apps applicationset (EU prod wave)'),
    cx: `<p>Control planes: 3 regional Argo CD + edge Flux agents. Per new team: one JSON file and one config repo.</p>`, f: ['How do you upgrade Argo CD itself safely? (staging instance first, then one region at a time, all via Git)', 'What if the Git host is down? (running workloads are unaffected; deploys pause; OCI artifacts in a registry mirror add resilience)']
  }));
  practice.push(P({
    t: 'Blue-green with a database migration', l: 'Hard', tags: ['argo-rollouts', 'blue-green', 'migrations'], co: ['Stripe', 'Monzo'],
    s: `<p>The <code>billing</code> service moves from v3.1 to v3.2 with blue-green. v3.2 renames column <code>amount</code> to <code>amount_cents</code>. Design the release so that blue (v3.1) keeps working during preview and for the 10-minute rollback window, and a failed post-promotion analysis can switch back without data loss.</p>`,
    ex: `<p>The trap: a PreSync migration that renames the column breaks blue immediately, so the "instant rollback" of blue-green rolls back to a broken version.</p>`,
    bw: `<p>Rename in a PreSync hook, then switch: blue fails the moment the migration runs, preview analysis may pass (green is fine), and rollback lands on errors.</p>`,
    q: ['What makes blue-green rollback safe when the schema changes?', ['Expand/contract: only additive changes during the overlap, destructive ones in a later release', 'A faster scaleDownDelaySeconds', 'Running the migration in PostSync', 'Turning off analysis'], 0, 'Both versions must work against the same schema while both can serve traffic.'],
    h: ['<p>Hint 1: during preview and the rollback window, both versions run against one database.</p>', '<p>Hint 2: split the change into expand (add column, dual write) and contract (drop old) releases.</p>', '<p>Hint 3: wire the expand migration as a PreSync hook, and keep the contract step for a later version after v3.1 is gone.</p>'],
    a: `<p><b>Release 3.2 (expand):</b> PreSync hook Job adds <code>amount_cents</code> and backfills it; v3.2 writes both columns and reads <code>amount_cents</code>; v3.1 keeps using <code>amount</code>. Blue-green with <code>prePromotionAnalysis</code> (smoke tests on the preview Service) and <code>postPromotionAnalysis</code> (error rate); <code>scaleDownDelaySeconds: 600</code>. A failed post-promotion analysis switches the active Service back to blue, which still works because <code>amount</code> is intact and current. <b>Release 3.3 (contract):</b> stop writing <code>amount</code>; <b>3.4:</b> drop it. Each release is a separate Git change and a separate promotion.</p>`,
    code: Y(`apiVersion: batch/v1
kind: Job
metadata:
  name: billing-expand-3-2
  annotations:
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/hook-delete-policy: BeforeHookCreation
spec:
  backoffLimit: 0
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: migrate
          image: ghcr.io/example-org/billing-migrations:3.2.0
          args: ["up", "--only", "0042_add_amount_cents_and_backfill"]   # additive only
          envFrom: [{ secretRef: { name: billing-db } }]`, 'expand migration hook'),
    cx: `<p>Three releases instead of one; zero moments where a live version is incompatible with the schema.</p>`, f: ['What about long backfills? (run them as a separate Job outside the sync, in batches, before the release)', 'How do you test the rollback path? (in staging, promote then force postPromotionAnalysis to fail and check blue still serves)']
  }));

  // ───────────────────────── Quiz ─────────────────────────
  function Q(q, options, answer, explain) { quiz.push({ q: q, options: options, answer: answer, explain: explain }); }
  Q('Which statement is one of the four OpenGitOps principles?', ['Desired state is pulled automatically by software agents', 'Every deploy is triggered by a CI job with cluster credentials', 'Clusters are rebuilt from scratch on every change', 'Only Helm charts may be used'], 0, 'Declarative, versioned and immutable, pulled automatically, continuously reconciled.');
  Q('An Argo CD app is <b>Synced</b> but <b>Degraded</b>. What does that tell you?', ['Live matches Git, but the workload is not healthy (for example a crashing image)', 'Someone edited the cluster by hand', 'Git is unreachable', 'The app has never been synced'], 0, 'Sync status and health status are independent.');
  Q('With <code>automated</code> sync on, what does <code>selfHeal: true</code> add?', ['Reverting changes made directly in the cluster', 'Deleting objects removed from Git', 'Retrying failed syncs', 'Creating the namespace'], 0, 'prune deletes removed objects; selfHeal re-syncs when live drifts from Git.');
  Q('A Job has <code>argocd.argoproj.io/hook: PreSync</code>. When does it run?', ['Before the Sync phase applies the normal resources', 'After all resources are healthy', 'Only when the sync fails', 'Only on the first install'], 0, 'PreSync hooks run first; the Sync phase waits for them to complete.');
  Q('Two resources in the Sync phase have sync-wave "-1" and "2". What happens between them?', ['Argo CD applies wave -1, waits for it to be healthy, then applies wave 2', 'They are applied together', 'Wave 2 runs first', 'Negative waves are ignored'], 0, 'Lower waves go first and each wave must become healthy before the next.');
  Q('What does an Argo CD <b>AppProject</b> control?', ['Which repos, destinations and resource kinds its Applications may use', 'The Docker image build', 'Pod autoscaling', 'Git branch protection'], 0, 'Projects are the guard rails (sourceRepos, destinations, resource allow/deny lists, roles, sync windows).');
  Q('Which ApplicationSet generator creates one Application per folder in a repo?', ['The git directory generator', 'The list generator', 'The clusters generator', 'The pullRequest generator'], 0, 'git directories: each matching path becomes an item with path and path.basename.');
  Q('In Flux, which controller fetches Git repositories and Helm charts?', ['source-controller', 'kustomize-controller', 'helm-controller', 'notification-controller'], 0, 'source-controller produces artifacts that the other controllers consume.');
  Q('A Flux Kustomization <code>apps</code> has <code>dependsOn: [infra]</code>, and <code>infra</code> is failing. What does <code>apps</code> do?', ['Waits and retries; it is not applied until infra is Ready', 'Applies anyway after a timeout', 'Deletes infra', 'Applies infra itself'], 0, 'dependsOn blocks reconciliation until every dependency is Ready.');
  Q('Why does <code>helm list</code> show nothing for a chart deployed by Argo CD?', ['Argo CD renders the chart with helm template and applies plain manifests', 'Argo CD deletes Helm release Secrets', 'Helm 3 does not support list', 'The chart is in another namespace'], 0, 'Flux, by contrast, creates real Helm releases.');
  Q('A Kustomize overlay strategic-merge patch lists only container <code>app</code>. The base has <code>app</code> and <code>sidecar</code>. Result?', ['Both containers remain; only app changes', 'Only app remains', 'The patch fails', 'sidecar is renamed'], 0, 'containers merge by the name key.');
  Q('Why is a branch per environment (dev/staging/prod branches) usually discouraged?', ['Merges carry unrelated history, branches drift and hotfixes get reverted by later merges', 'Git cannot have three branches', 'Argo CD cannot watch branches', 'It is slower to clone'], 0, 'Folders per environment on one branch make state visible and diffs simple.');
  Q('Which approach keeps no secret value or ciphertext in Git at all?', ['External Secrets Operator', 'Sealed Secrets', 'SOPS', 'base64 Secret manifests'], 0, 'Git holds only a reference; ESO fetches the value from the secret manager.');
  Q('An Argo Rollouts canary analysis has <code>failureLimit: 0</code> and one measurement fails. What happens?', ['The AnalysisRun fails and the Rollout aborts back to stable', 'The rollout pauses for a human', 'The measurement is retried forever', 'Nothing until count is reached'], 0, 'Failures greater than failureLimit fail the run, and a failed run aborts the rollout.');
  Q('In a blue-green Rollout, what is the <code>previewService</code> for?', ['Sending test traffic to the new version before it becomes active', 'Load-balancing between blue and green 50/50', 'Storing the old ReplicaSet', 'Exposing metrics'], 0, 'The active Service switches only at promotion; preview reaches the new ReplicaSet early.');

  // ───────────────────────── Interview ─────────────────────────
  function IQ(level, q, a, followUps) { interview.push({ q: q, a: a, level: level, followUps: followUps }); }
  IQ('B', 'What is GitOps, and how is it different from a CI pipeline that runs kubectl apply?', `<p>GitOps keeps the desired state of the system in Git (declarative, versioned) and uses an agent inside the cluster (Argo CD, Flux) that <b>pulls</b> that state and <b>continuously reconciles</b> the cluster to it. A CI pipeline that runs <code>kubectl apply</code> is push-based: CI needs cluster credentials, applies once, and nobody notices later drift. With GitOps, CI only builds and commits; every change is a reviewed commit, rollback is <code>git revert</code>, and hand edits are reported or reverted.</p>`, ['What credentials does CI still need? (write access to the config repo, registry push)', 'What cannot be managed declaratively? (data, runtime-issued certs, autoscaled replica counts)']);
  IQ('B', 'Explain sync status versus health status in Argo CD.', `<p><b>Sync status</b> compares live objects with Git: <code>Synced</code> or <code>OutOfSync</code>. <b>Health status</b> says whether the resources work: <code>Healthy</code>, <code>Progressing</code>, <code>Degraded</code>, <code>Suspended</code>, <code>Missing</code>, <code>Unknown</code>, using built-in checks for core kinds and Lua checks for CRDs. They are independent: Synced + Degraded means you deployed exactly what Git says and it is broken; OutOfSync + Healthy means drift that still works, such as a hand-scaled Deployment.</p>`, ['How does Argo CD know a CRD is healthy? (custom Lua health check, or the CRD\'s built-in check)', 'Why does a paused Rollout show Suspended? (its health check maps paused to Suspended)']);
  IQ('I', 'Walk through Argo CD sync options: automated, prune, selfHeal, and when you would not use them.', `<p><code>automated</code> applies new commits without a click. <code>prune</code> deletes objects removed from Git; <code>selfHeal</code> re-syncs when the live state drifts. In dev and staging all three are usual. In prod, some teams keep manual sync or sync windows for change control, and some disable prune for stateful or shared resources (or use <code>Prune=false</code> per resource, <code>PruneLast=true</code>). Self-heal must not fight other controllers: remove fields like replicas from Git when an HPA owns them, or use <code>ignoreDifferences</code> with <code>RespectIgnoreDifferences</code>.</p>`, ['Why is argocd app rollback refused with auto-sync? (auto-sync would return to Git HEAD; revert in Git instead)', 'What does ApplyOutOfSyncOnly help with? (large apps: only changed objects are applied)']);
  IQ('I', 'How do sync waves and hooks work? Give a migration example.', `<p>A sync runs PreSync, Sync and PostSync phases (SyncFail on failure). Within a phase, resources are ordered by the <code>argocd.argoproj.io/sync-wave</code> annotation (lowest first, default 0), then by kind and name, and Argo CD waits for each wave to be healthy. Hooks are resources annotated <code>argocd.argoproj.io/hook</code>. A database migration is a PreSync Job with <code>hook-delete-policy: BeforeHookCreation</code>; if it fails, the Sync phase never runs, so new Pods never start on an unmigrated schema. A PostSync Job can run smoke tests, and a SyncFail hook can notify.</p>`, ['What about Helm hooks? (Argo CD maps pre-/post-install and upgrade hooks to PreSync/PostSync)', 'Why must migrations be backward compatible? (old Pods still run during the rollout)']);
  IQ('I', 'What is the app-of-apps pattern and what does ApplicationSet add?', `<p>App-of-apps is a root Application that syncs a folder of Application manifests, so the Applications themselves live in Git and the whole platform bootstraps from one object. ApplicationSet generates Applications from a template and generators (list, clusters, git directories/files, matrix, merge, SCM provider, pull request), which removes copy-paste across many clusters or folders and lets teams onboard by adding a folder or file. Watch deletion behaviour: removing a generator item deletes the Application (and, with the finalizer, its resources) unless you preserve resources on deletion.</p>`, ['How do you stop teams from choosing another project in a generated app? (do not template project from team input)', 'What is RollingSync? (alpha progressive sync of generated apps by label)']);
  IQ('I', 'Compare Argo CD and Flux. When would you choose each?', `<p>Both are CNCF-graduated, pull-based GitOps tools. <b>Argo CD</b> is one product with a strong UI, SSO, RBAC, AppProjects, ApplicationSets and a multi-cluster hub model; it renders Helm with <code>helm template</code>. <b>Flux</b> is a toolkit of controllers (source, kustomize, helm, notification, image automation) configured entirely with CRDs, uses real Helm releases, decrypts SOPS natively, and suits per-cluster agents and edge sites. Choose Argo CD when many teams want a UI and central visibility; Flux when you want everything as Kubernetes objects, Helm release semantics, or many independent clusters. Many companies run both for different layers.</p>`, ['Can Argo CD show Flux-managed apps? (not natively; Flux has a separate UI ecosystem such as Weave GitOps/Capacitor)', 'Which handles image automation natively? (Flux; Argo CD uses the separate Image Updater)']);
  IQ('I', 'How do you structure a GitOps repository for multiple environments?', `<p>Prefer one main branch with a folder per environment (Kustomize base + overlays, or Helm values per env), and separate the app source repo from the config repo. Protect production folders with CODEOWNERS and branch protection, or use a separate prod repo when a hard boundary is needed. Avoid branch-per-environment: merges carry unrelated changes and branches drift. Keep per-environment differences small (tag, replicas, resources, hostnames). At scale, a platform repo holds clusters, add-ons and ApplicationSets, and each team has its own config repo.</p>`, ['How do you see the real effect of an overlay change in a PR? (render both envs in CI and post the diff)', 'Monorepo performance tricks? (manifest-generate-paths annotation, webhooks)']);
  IQ('I', 'How does promotion between environments work in GitOps?', `<p>Build the image once; promotion changes which digest each environment points to, by a commit. Dev usually updates automatically (CI commit or Flux image automation / Argo CD Image Updater). Staging and prod move by promotion pull requests, gated on the previous environment running that version and being healthy, plus analysis results or soak time. Rollback is promoting an older version or reverting the commit. Tools like Kargo model stages and verification explicitly. The Git log becomes the deployment record.</p>`, ['Why not let the image updater write directly to prod? (no review, no gate)', 'How do you prevent CI and bots from racing on the same branch? (separate paths, PR-based write-back, idempotent commits)']);
  IQ('I', 'How do you handle secrets in GitOps?', `<p>Never commit plain Secrets (base64 is not encryption). Options: <b>Sealed Secrets</b> (encrypt with the cluster's public key; only that controller can decrypt; back up its keys), <b>SOPS</b> with age or cloud KMS (values encrypted, keys readable; Flux decrypts natively, Argo CD via KSOPS/plugins), or <b>External Secrets Operator</b> (Git holds only a reference; values come from Vault or a cloud secret manager with workload identity, and rotate without commits). For production I prefer ESO; Argo CD documentation also discourages injecting secrets during manifest rendering. Add secret scanning in CI and encryption at rest for etcd.</p>`, ['What happens when a plain secret was committed? (rotate first, then clean history, then add scanning)', 'How do Pods pick up a rotated Secret? (Reloader or reading mounted files)']);
  IQ('A', 'Design a canary release with Argo Rollouts. What can go wrong?', `<p>Replace the Deployment with a Rollout using <code>strategy.canary</code> with steps like 5% → pause 5m → 25% → analysis → 50% → manual pause → 100%, a traffic router (NGINX, Istio, ALB, Gateway API) for exact weights, and an AnalysisTemplate on success rate and latency from Prometheus (<code>successCondition</code>, <code>interval</code>, <code>count</code>, <code>failureLimit</code>), also as background analysis. Pitfalls: too little traffic for meaningful statistics, queries that return no data (Inconclusive/Error), schema changes that break the stable version, sticky long-lived connections skewing weights, Argo CD self-heal fighting Rollouts-managed routing fields, and forgetting that after an abort Git still holds the bad version.</p>`, ['Canary or blue-green for a service that cannot run two versions at once? (blue-green, still with expand/contract schema)', 'How would you compare canary against stable rather than a fixed threshold? (query both and use a ratio in the condition)']);
  IQ('A', 'Argo CD shows an app OutOfSync immediately after every sync. How do you debug it?', `<p>Run <code>argocd app diff</code> to see which fields differ. Common causes: fields filled by the API server or webhooks (defaults, <code>caBundle</code>, sidecar injection), another controller owning a field (HPA replicas, cert-manager), different representations (<code>1000m</code> vs <code>1</code>, ordering), or a mutating admission policy. Fixes: enable server-side diff, remove the field from Git, add <code>ignoreDifferences</code> (jsonPointers, jqPathExpressions, managedFieldsManagers) with <code>RespectIgnoreDifferences</code>, or normalise via resource customizations. Check managed fields to find which manager wrote the value.</p>`, ['Why is a broad ignore rule dangerous? (it hides real drift)', 'What does ServerSideDiff change? (the API server computes the result of the apply, including defaults)']);
  IQ('A', 'How do you limit blast radius when one GitOps setup manages many clusters?', `<p>Split control planes by failure domain (per region or per environment), so a bad Argo CD upgrade or compromise does not reach every cluster. Use AppProjects or Flux tenancy (impersonated service accounts) so teams cannot touch cluster-scoped resources or other namespaces. Promote changes in waves (dev, staging, one prod region, the rest) with health gates and sync windows. Protect the repo with branch protection, CODEOWNERS and signed commits or signed OCI artifacts. Alert on mass OutOfSync/Degraded, and keep a break-glass path documented.</p>`, ['How do you upgrade the GitOps tool itself? (via Git, staging instance first, one region at a time)', 'What happens to running apps if Argo CD is down? (nothing; only deploys and self-heal pause)']);
  IQ('E', 'Tell me about a deployment incident in a GitOps setup and how you handled or would handle it.', `<p>A strong answer is a story with order: detect (alert on error rate or Degraded app), stabilise first (Rollouts abort, or <code>git revert</code> of the promotion commit, or suspend one Flux object / disable auto-sync on one Application if Git itself is the problem, with a ticket), then diagnose with evidence (<code>argocd app history</code> and <code>diff</code>, <code>flux events</code>, AnalysisRuns, Kubernetes events, logs). Communicate status; finally fix properly and run a blameless postmortem with actions: an AnalysisTemplate that would have caught it, a CI render-and-diff check, a missing <code>ignoreDifferences</code>, or a CODEOWNERS rule. Say what you changed so it cannot happen the same way again.</p>`, ['Why revert in Git instead of rolling back in the UI? (Git stays the truth; auto-sync would undo a UI rollback)', 'How did you make sure a suspended object was resumed? (alerts on suspended Kustomizations/apps with sync disabled)']);

  // One snippet per example in the lesson viewer: split multi-snippet examples.
  topics.forEach(function (t) {
    var out = [];
    t.examples.forEach(function (e) {
      if (!Array.isArray(e.code)) { out.push(e); return; }
      e.code.forEach(function (c, i) { out.push({ title: e.title + ' (' + (i + 1) + ' of ' + e.code.length + ')', html: i === 0 ? e.html : '<p>Same example, part ' + (i + 1) + '.</p>', code: c }); });
    });
    t.examples = out;
  });

  registerModule({
    id: 'devops20',
    title: 'GitOps with Argo CD & Flux',
    intro: `<p>In the CI/CD module a pipeline pushed changes to the cluster, and in the Helm module you upgraded releases by hand or from CI. GitOps changes who acts: the desired state lives in Git, and an agent inside the cluster pulls it and keeps the cluster matching it, forever. This module goes deep on the two main tools, <b>Argo CD</b> (2.x and 3.x) and <b>Flux v2</b>, and on the habits around them: Kustomize overlays and Helm in GitOps, repository layouts, promotion between environments, secrets that never sit in Git as plain text, and progressive delivery with <b>Argo Rollouts</b>.</p>
      <p>Every topic starts from a real situation: a hand edit that keeps coming back, a migration that must run before new Pods, a deleted folder that took a service down, a branch-per-environment hotfix that got reverted, a self-heal loop fighting an HPA, and a canary that aborted while Git still held the bad version. Labs run free on kind with the argocd, flux and kubectl-argo-rollouts CLIs.</p>`,
    goals: [
      'Explain the four OpenGitOps principles and the reconcile loop, and tell missing, extra and changed drift apart',
      'Write Argo CD Applications with automated sync, prune, self-heal, sync options, retries, ignoreDifferences, custom health checks, sync waves and hooks',
      'Scale Argo CD with app-of-apps, ApplicationSets (list, clusters, git, matrix generators) and AppProjects with sync windows',
      'Run Flux v2: sources, Kustomizations with dependsOn, HelmReleases with remediation and drift detection, notifications and image automation',
      'Use Kustomize bases, overlays, strategic merge patches and images, and combine Helm with GitOps in both tools',
      'Choose a repository layout and design gated promotion between environments that promotes one built artifact',
      'Keep secrets out of Git with Sealed Secrets, SOPS or External Secrets, and plan key backup and rotation',
      'Ship with Argo Rollouts canary and blue-green strategies driven by AnalysisTemplates, and handle aborts the GitOps way'
    ],
    prereqs: `<b>Required:</b> <b>Cloud &amp; DevOps 11</b> (CI/CD Pipelines) for build-once artifacts, environments and basic canary ideas, and <b>Cloud &amp; DevOps 14</b> (Helm &amp; Day-2 Kubernetes Operations) for Helm charts, values, rolling updates, HPA and RBAC. This module builds on both without repeating them. Everything runs on your own machine with kind.`,
    hours: 16,
    langExplain: `<p>Commands are <b>bash</b> (kubectl, argocd, flux, kustomize, kubectl argo rollouts) and manifests are <b>YAML</b> (Argo CD, Flux, Kustomize and Rollouts objects), because that is what platform engineers write daily; they are syntax-checked. Directory trees and CODEOWNERS files are shown as plain text. Decision rules that are pure computation (drift report, sync-wave ordering, ApplicationSet naming, Flux dependsOn ordering, strategic merge, promotion gates, canary and analysis verdicts, semver tag policy, prune plans) come as tested <b>Python</b> standard-library models. Cluster procedures are verified by reading and in your lab.</p>`,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
