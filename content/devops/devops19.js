(function () {
  var topics = [], practice = [], quiz = [], interview = [];
  // C`...` = raw code template (backslashes stay as typed). Bash and HCL use ${...}, which a JS template would evaluate,
  // so inside C`...` we write @{ and it becomes a literal ${ in the published code (same convention as devops09).
  function C(s) { return String.raw.apply(null, arguments).replace(/@\{/g, '$' + '{'); }
  var LAB = '<b>Cost risk:</b> GKE clusters (management fee per cluster hour beyond the free-tier credit), Compute Engine VMs, Cloud NAT gateways, load balancer forwarding rules, Cloud SQL instances, Spanner instances and BigQuery on-demand queries all bill while they exist or run. Use a <b>sandbox project</b> linked to a billing account with a <b>budget alert</b>, the smallest sizes (<code>e2-micro</code>, Cloud SQL <code>db-f1-micro</code>/shared core, Spanner 100 processing units only if you must) and finish each lab within an hour. <b>Cleanup:</b> the simplest full cleanup on GCP is <code>gcloud projects delete PROJECT_ID</code> (30-day soft delete; billing stops once resources are shut down). Project ids, org ids (<code>123456789012</code>), service account emails and AWS account ids are placeholders; no keys appear anywhere (workloads use attached service accounts or Workload Identity Federation).';
  var SKIP = { skip: 'cloud procedure, verified by reading' };
  function SH(code, title) { var s = { lang: 'bash', code: code }; if (title) s.title = title; return s; }        // bash -n checked
  function PY(code, title) { return { lang: 'python', title: title || 'Python (tested)', code: code }; }
  function HCL(code, title) { return { lang: 'hcl', check: false, title: title || 'main.tf', code: code }; }      // HCL has no checker: check false (devops09 convention)
  function YM(code, title) { return { lang: 'yaml', title: title || 'manifest.yaml', code: code }; }              // parsed by the validator
  function JS(code, title) { return { lang: 'json', title: title || 'JSON', code: code }; }
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
    if (o.alt) p.solution.alt = o.alt.map(snip);
    if (o.bc) p.brute.code = snip(o.bc);
    if (o.lang) p.lang = o.lang;
    return p;
  }
  function box(id, label, x, y, w) { return { id: id, label: label, x: x, y: y, shape: 'box', w: w || 18 }; }
  function lines(s, what, cap) {
    var v = String(s || '').split(/\s*;\s*|\n/).map(function (x) { return x.trim(); }).filter(Boolean);
    if (!v.length) throw new Error('Type ' + what);
    if (v.length > (cap || 12)) throw new Error('Use at most ' + (cap || 12) + ' entries');
    return v;
  }

  // ── Small models shared by visualizers (Python answers in the problems are written separately and tested) ──
  // IAM over the hierarchy: allow bindings are inherited (union); deny rules are checked first and also inherited.
  function iamEval(path, binds, member, role) {
    var steps = [], allowAt = null, denyAt = null;
    path.forEach(function (node) {
      binds.forEach(function (b) {
        if (b.node === node && b.member === member && b.role === role) {
          steps.push({ node: node, kind: b.kind });
          if (b.kind === 'deny' && !denyAt) denyAt = node;
          if (b.kind === 'allow' && !allowAt) allowAt = node;
        }
      });
    });
    return { steps: steps, verdict: denyAt ? 'denied' : allowAt ? 'allowed' : 'no-binding', denyAt: denyAt, allowAt: allowAt };
  }
  function ip2n(s) {
    var p = String(s).split('.').map(Number);
    if (p.length !== 4 || p.some(function (x) { return isNaN(x) || x < 0 || x > 255; })) throw new Error('Bad IPv4 address: ' + s);
    return ((p[0] * 256 + p[1]) * 256 + p[2]) * 256 + p[3];
  }
  function n2ip(n) { return [Math.floor(n / 16777216) % 256, Math.floor(n / 65536) % 256, Math.floor(n / 256) % 256, n % 256].join('.'); }
  function cidr(s) {
    var m = String(s).trim().match(/^(\d+\.\d+\.\d+\.\d+)\/(\d{1,2})$/);
    if (!m || +m[2] > 32) throw new Error('Type CIDRs like 10.0.0.0/20');
    var size = Math.pow(2, 32 - +m[2]), start = Math.floor(ip2n(m[1]) / size) * size;
    return { text: n2ip(start) + '/' + m[2], lo: start, hi: start + size - 1, size: size, prefix: +m[2] };
  }

  // ───────────────────────── Topic 1: hierarchy and IAM ─────────────────────────
  topics.push({
    title: 'The Resource Hierarchy and IAM: Organization, Folders, Projects, Inherited Roles, Deny Policies and Service Accounts',
    analogy: `<p>Think of a big <b>company building</b>. The building (the <b>organization</b>) has floors (<b>folders</b>, such as Prod and Dev), each floor has rooms (<b>projects</b>), and each room has cupboards (<b>resources</b>: buckets, VMs, datasets). If security gives you a key to a floor, it opens every room and cupboard on that floor; nobody inside a room can take that key back. The only thing stronger than a key is a <b>"no entry" sign</b> (a deny policy) put up higher or lower in the building: it beats any key. And robots that work in the building (programs) get their own badge, a <b>service account</b>, instead of borrowing a person's key.</p>`,
    explain: `<p>🟢 <b>Everything lives in a project.</b> On AWS the unit of isolation and billing is the <b>account</b>; on Azure it is the <b>subscription</b> (with resource groups inside); on GCP it is the <b>project</b>. A project has a globally unique <b>project id</b> (like <code>shop-prod-7f3a</code>), a display name and a project number. Projects sit under <b>folders</b> (up to 10 levels deep), and folders sit under the <b>organization</b> node, which is tied to your Google Workspace or Cloud Identity domain. Billing is a separate object: a <b>billing account</b> is linked to projects.</p>
      <p>🟢 <b>IAM in GCP is "who can do what on which resource".</b> An <b>allow policy</b> is attached to a resource (org, folder, project, or a single bucket/topic/etc.) and holds <b>bindings</b>: <code>role → list of principals</code>. Principals are <code>user:</code>, <code>group:</code>, <code>serviceAccount:</code>, <code>domain:</code>, <code>principalSet://</code> (federated identities), or the special <code>allUsers</code>/<code>allAuthenticatedUsers</code>. A <b>role</b> is a bundle of <b>permissions</b> such as <code>storage.objects.get</code>. You never grant a single permission directly; you grant a role.</p>
      <p>🔵 <b>Inheritance is a union.</b> The effective allow policy of a bucket is the bucket's own policy <b>plus</b> its project's, its folders' and the organization's. A grant higher up can never be removed lower down. That is the main mental difference from AWS, where you can write an explicit <code>Deny</code> inside any identity or resource policy. In GCP, the "take it away" tools are separate: <b>IAM deny policies</b> (attached to org, folder or project; checked <b>before</b> allow policies; name permissions, with optional exception principals) and <b>Principal Access Boundary</b> policies. <b>Organization policies</b> are a third thing: they restrict <em>what can be configured</em> (for example "no external IPs on VMs", "only these regions", "no service account key creation"), not <em>who</em> can do it. They are closest to AWS <b>SCPs</b> / Azure Policy.</p>
      <p>🔵 <b>Three kinds of roles.</b> <b>Basic</b> roles (Owner, Editor, Viewer) are huge and pre-date IAM; avoid them in production. <b>Predefined</b> roles (<code>roles/storage.objectViewer</code>, <code>roles/run.invoker</code>) are maintained by Google per service. <b>Custom</b> roles let you choose exact permissions at org or project level when no predefined role is tight enough.</p>
      <p>🔵 <b>Service accounts</b> are identities for workloads, emails like <code>api@shop-prod.iam.gserviceaccount.com</code>. A VM, Cloud Run service or GKE workload <b>runs as</b> a service account and gets short-lived tokens from the metadata server, so no key file is needed. Creating <b>keys</b> is a leak risk; newer organizations enforce <code>iam.disableServiceAccountKeyCreation</code> by default. External workloads (GitHub Actions, AWS, Azure, on-prem) should use <b>Workload Identity Federation</b> instead of keys. Being able to "act as" a service account (<code>roles/iam.serviceAccountUser</code>) or mint its tokens (<code>roles/iam.serviceAccountTokenCreator</code>) is effectively having its power, so treat those grants as privileged.</p>`,
    clues: [
      '"We grant Editor at the folder but want one project read-only" → you <b>cannot</b> subtract inherited allow; use an <b>IAM deny policy</b> or move the grant down',
      '"Coming from AWS: what replaces accounts and OUs?" → <b>projects</b> and <b>folders</b> under an <b>organization</b>',
      '"Stop anyone creating public IPs or using regions outside the EU" → <b>organization policy constraints</b>, not IAM',
      '"CI pipeline stores a JSON key" → replace with <b>Workload Identity Federation</b> (OIDC from GitHub/GitLab)',
      '"Which roles should a pod in GKE use?" → <b>Workload Identity Federation for GKE</b>, Kubernetes service account mapped to IAM',
      '"Who can impersonate this service account?" → look for <code>iam.serviceAccountUser</code> / <code>serviceAccountTokenCreator</code> grants'
    ],
    code: [SH(C`# Look at the hierarchy (needs resourcemanager.* viewer rights on the org)
gcloud organizations list
gcloud resource-manager folders list --organization=123456789012
gcloud projects describe shop-prod-7f3a --format="value(parent.type,parent.id)"

# A workload identity: a service account with ONE narrow predefined role on ONE bucket (not on the project)
gcloud iam service-accounts create api-runtime --project=shop-prod-7f3a --display-name="api runtime"
SA="api-runtime@shop-prod-7f3a.iam.gserviceaccount.com"
gcloud storage buckets add-iam-policy-binding gs://shop-prod-uploads \
  --member="serviceAccount:$SA" --role="roles/storage.objectViewer"

# Who has access to this project, including roles inherited from folders and the org?
gcloud asset analyze-iam-policy --organization=123456789012 \
  --full-resource-name="//cloudresourcemanager.googleapis.com/projects/shop-prod-7f3a" \
  --identity="serviceAccount:$SA"

# Org policy: forbid key creation and external IPs on VMs for the whole Prod folder
gcloud resource-manager org-policies enable-enforce iam.disableServiceAccountKeyCreation --folder=345678901234
gcloud resource-manager org-policies deny compute.vmExternalIpAccess --folder=345678901234`, 'gcloud: hierarchy, a narrow grant, analysis, guardrails'),
      JS(`{
  "displayName": "No one may delete prod buckets except the break-glass group",
  "rules": [
    {
      "denyRule": {
        "deniedPrincipals": ["principalSet://goog/public:all"],
        "exceptionPrincipals": ["principalSet://goog/group/breakglass@example.com"],
        "deniedPermissions": ["storage.googleapis.com/buckets.delete"]
      }
    }
  ]
}`, 'deny-policy.json (IAM deny policy, applied with gcloud iam policies create)')],
    codeTitle: ['gcloud', 'IAM deny policy'],
    viz: [{
      title: 'Evaluate access down the hierarchy: deny first, then the union of allows',
      input: 'allow folders/prod group:devs roles/viewer; deny projects/shop-prod group:devs roles/viewer; allow buckets/uploads group:devs roles/viewer',
      inputLabel: 'bindings separated by ; as "allow|deny node member role". Path is organizations/acme > folders/prod > projects/shop-prod > buckets/uploads; we ask: can group:devs use roles/viewer on the bucket?',
      gen: function (input) {
        var path = ['organizations/acme', 'folders/prod', 'projects/shop-prod', 'buckets/uploads'];
        var binds = lines(input, 'bindings like allow folders/prod group:devs roles/viewer', 10).map(function (l) {
          var w = l.split(/\s+/);
          if (w.length !== 4 || (w[0] !== 'allow' && w[0] !== 'deny')) throw new Error('Each binding needs 4 words: allow|deny node member role');
          if (path.indexOf(w[1]) < 0) throw new Error('Node must be one of ' + path.join(', '));
          return { kind: w[0], node: w[1], member: w[2], role: w[3] };
        });
        var member = 'group:devs', role = 'roles/viewer', f = [];
        function tree(hl, tags, narr, extra) {
          var nodes = path.map(function (p, i) { return box(p, p, 50, 4 + i * 14, 34); });
          var edges = [[path[0], path[1]], [path[1], path[2]], [path[2], path[3]]];
          var parts = [{ type: 'graph', label: 'resource hierarchy (parent above child)', directed: true, height: 60, nodes: nodes, edges: edges, hl: hl, tags: tags }];
          if (extra) parts.push(extra);
          return { narr: narr, parts: parts };
        }
        f.push(tree({ 'buckets/uploads': 'cur' }, { 'buckets/uploads': '?' }, 'The question: may <code>' + member + '</code> use <code>' + role + '</code> on <b>buckets/uploads</b>? GCP looks at the resource and every ancestor up to the organization, because policies are inherited downward.', { type: 'table', label: 'bindings you typed', columns: ['kind', 'node', 'member', 'role'], rows: binds.map(function (b) { return [b.kind, b.node, b.member, b.role]; }) }));
        var r = iamEval(path, binds, member, role);
        var denyHl = {}, denyTags = {};
        path.forEach(function (p) { denyHl[p] = 'done'; });
        binds.filter(function (b) { return b.kind === 'deny' && b.member === member && b.role === role; }).forEach(function (b) { denyHl[b.node] = 'bad'; denyTags[b.node] = 'DENY'; });
        f.push(tree(denyHl, denyTags, '<b>Step 1: deny policies first.</b> Deny policies on any ancestor (org, folder or project) are checked before any allow. ' + (r.denyAt ? 'A matching deny exists at <b>' + r.denyAt + '</b>, so the answer is already decided.' : 'No matching deny on the path, so we continue to the allow policies.')));
        var allowHl = {}, allowTags = {};
        path.forEach(function (p) { allowHl[p] = 'done'; });
        binds.filter(function (b) { return b.kind === 'allow' && b.member === member && b.role === role; }).forEach(function (b) { allowHl[b.node] = 'ok'; allowTags[b.node] = 'ALLOW'; });
        f.push(tree(allowHl, allowTags, '<b>Step 2: union of allow policies.</b> Every binding on the path counts; a grant at a folder flows down to every project and bucket under it. ' + (r.allowAt ? 'The first matching allow is at <b>' + r.allowAt + '</b>.' : 'No allow binding grants this role anywhere on the path.')));
        var all = {}; path.forEach(function (p) { all[p] = 'done'; }); all['buckets/uploads'] = r.verdict === 'allowed' ? 'ok' : 'bad';
        f.push(tree(all, { 'buckets/uploads': r.verdict.toUpperCase() }, '<b>Result: ' + r.verdict + '.</b> ' + (r.verdict === 'denied' ? 'A deny beats every allow, even one granted right on the bucket itself. To let one person through, the deny policy needs an <code>exceptionPrincipals</code> entry.' : r.verdict === 'allowed' ? 'Remember: you cannot "remove" this access by editing the bucket policy if it came from a folder; you would remove the folder binding or add a deny.' : 'No grant means no access (implicit deny). Grant the narrowest predefined role at the lowest node that needs it.'), { type: 'vars', label: 'verdict', vals: { member: member, role: role, 'deny found at': r.denyAt || '-', 'allow found at': r.allowAt || '-', verdict: r.verdict }, hl: { verdict: r.verdict === 'allowed' ? 'ok' : 'bad' } }));
        return f;
      }
    }],
    examples: [
      { title: 'Mapping an AWS landing zone onto GCP', html: `<p>An AWS shop has AWS Organizations with OUs <code>Prod</code>, <code>NonProd</code>, <code>Security</code>, one account per app per environment, SCPs on the OUs and IAM Identity Center for people. The GCP shape is: an <b>organization</b> node, <b>folders</b> <code>prod</code>, <code>nonprod</code>, <code>shared</code> (for the Shared VPC host and logging projects), <b>one project per app per environment</b>, <b>organization policies</b> on folders in place of SCPs (allowed locations, no external IPs, uniform bucket access, no SA keys), and Cloud Identity / Google Workspace <b>groups</b> bound to predefined roles at the folder or project. Billing exports go to BigQuery. Google's <b>Cloud Foundation Fabric</b> / setup checklist Terraform builds this for you.</p>` },
      { title: 'Incident: "I removed Editor from the project but she can still delete VMs"', html: `<p>The engineer removed <code>roles/editor</code> from <code>user:ana@</code> on the project, yet <code>gcloud compute instances delete</code> still worked. <code>gcloud asset analyze-iam-policy</code> showed the real source: <code>group:platform@</code> had <code>roles/compute.admin</code> on the <b>prod folder</b>, and Ana is in that group. Allow policies are a <b>union across the hierarchy and group membership</b>. Fix: remove her from the group, or narrow the folder grant, or if the rule is "nobody deletes prod VMs without break-glass", add a <b>deny policy</b> on the folder for <code>compute.googleapis.com/instances.delete</code> with an exception group.</p>` },
      { title: 'Keyless CI with Workload Identity Federation', html: `<p>Old way: a service account JSON key in a GitHub secret, valid until someone rotates it (nobody does). New way: create a <b>workload identity pool</b> and an <b>OIDC provider</b> for <code>https://token.actions.githubusercontent.com</code> with an attribute condition like <code>assertion.repository == 'acme/shop'</code>, then grant <code>roles/iam.workloadIdentityUser</code> on the deploy service account to <code>principalSet://iam.googleapis.com/projects/NUM/locations/global/workloadIdentityPools/github/attribute.repository/acme/shop</code>. The job exchanges its short-lived GitHub token for a Google token that lasts about an hour. Nothing to leak, nothing to rotate. The same pattern lets an AWS role or Azure managed identity call GCP APIs.</p>` },
      { title: 'Org policy vs IAM: two different questions', html: `<p>A developer with <code>roles/compute.instanceAdmin.v1</code> tries to create a VM with an external IP in the prod folder and gets <code>Constraint constraints/compute.vmExternalIpAccess violated</code>. IAM said <b>yes, you may create VMs</b>; the organization policy said <b>no VM in this folder may have a public IP</b>. Both must pass. Debug by reading the error: <code>PERMISSION_DENIED ... permission compute.instances.create</code> is IAM; <code>Constraint ... violated</code> is org policy.</p>` }
    ],
    deepDive: `<p>🟣 <b>Evaluation order in full.</b> For a request, Google checks (1) <b>Principal Access Boundary</b> policies (which resources a principal is even eligible to access), (2) <b>deny policies</b> on the resource's ancestors (org, folders, project), (3) <b>allow policies</b> on the resource and all its ancestors (union), with optional <b>IAM Conditions</b> (CEL expressions on time, resource name prefix, tags) on individual bindings. VPC Service Controls perimeters can additionally block API calls that cross a perimeter even when IAM allows them, which is the main defense against data exfiltration from BigQuery or Cloud Storage with stolen credentials.</p>
      <p>🟣 <b>Tags vs labels.</b> <b>Labels</b> are key/value metadata for billing and filtering. <b>Tags</b> (resource manager tags) are governed objects with their own IAM and are inherited down the hierarchy; IAM Conditions, org policies and network firewall policies can match on them. Use tags for policy, labels for cost reports.</p>
      <p>🟣 <b>Default service accounts.</b> Compute Engine and some older services create a default service account (<code>PROJECT_NUMBER-compute@developer.gserviceaccount.com</code>); historically it was granted <b>Editor</b> automatically. Organizations should enforce <code>iam.automaticIamGrantsForDefaultServiceAccounts</code> and give each workload its own dedicated service account with narrow roles. <b>Limits</b> that bite at scale: an allow policy holds at most 1,500 principals, so bind <b>groups</b>, not hundreds of users. Changes are eventually consistent: a new grant usually works within a minute but can take several minutes to propagate.</p>
      <p>🟣 <b>Recommender</b> (IAM role recommendations) watches 90 days of permission use and suggests smaller roles; the <b>Policy Analyzer</b> and <b>Policy Troubleshooter</b> answer "who can do X" and "why was this denied".</p>`,
    aiEra: `<p>🤖 AI assistants are good at translating "the app needs to read objects in one bucket and publish to one topic" into the exact predefined roles and <code>gcloud</code> bindings, and at reading a 2,000-line <code>get-iam-policy</code> dump to find basic roles and <code>allUsers</code>. They often get the <b>model</b> wrong by copying AWS habits: suggesting an explicit Deny inside an allow policy (not possible), forgetting inheritance from folders, or reaching for a key file. Ask the model to show the resource level of each grant and to justify each role; then confirm with <code>gcloud asset analyze-iam-policy</code> and Policy Troubleshooter instead of trusting the text. Give AI agents that run <code>gcloud</code> their own service account with a narrow role and no permission to change IAM.</p>`,
    problems: [P({
      t: 'Evaluate GCP IAM over the hierarchy', l: 'Medium', tags: ['IAM', 'hierarchy', 'deny policies'], co: ['Google', 'Spotify'], lang: 'python',
      s: `<p>Write <code>can_access(path, bindings, member, role)</code>. <code>path</code> lists the nodes from the organization down to the target resource, e.g. <code>["org", "folders/prod", "projects/shop", "buckets/b1"]</code>. Each binding is a string <code>"allow NODE MEMBER ROLE"</code> or <code>"deny NODE MEMBER ROLE"</code> (a simplified deny that names a role). Only bindings on nodes in <code>path</code> apply. Return <code>"denied"</code> if any matching deny applies, else <code>"allowed"</code> if any matching allow applies, else <code>"no-binding"</code>.</p>`,
      ex: `<p><code>path=["org","folders/prod","projects/shop"]</code>, bindings <code>["allow folders/prod group:devs roles/viewer"]</code>, member <code>group:devs</code>, role <code>roles/viewer</code> &rarr; <span class="c-g">"allowed"</span>: the folder grant is inherited by the project.<br>Add <code>"deny projects/shop group:devs roles/viewer"</code> &rarr; <span class="c-r">"denied"</span>: deny is checked first, wherever it sits.</p>`,
      bw: `<p>Looking only at the target resource's own policy (AWS habit of "the policy on the bucket") misses grants inherited from folders and the org, and checking allows before denies gives the wrong answer when both exist.</p>`,
      q: ['A folder grants roles/storage.admin to a group. Can a project owner below remove it from just their project using the project allow policy?', ['No: allow policies are a union down the hierarchy; use a deny policy or change the folder grant', 'Yes, by removing the binding in the project', 'Yes, by adding the role with an empty member list', 'Only by deleting the folder'], 0, 'Lower allow policies can only add access. Removal needs the folder binding changed or a deny policy.'],
      h: ['Hint 1: filter bindings to nodes that are on the path and to the exact member and role.', 'Hint 2: check all denies before any allow; the position of the deny in the path does not matter.', 'Hint 3: three outcomes, return "no-binding" when nothing matches (implicit deny).'],
      a: `<p>Turn the path into a set, scan the bindings once, and record whether a matching deny and a matching allow exist. Deny wins; then allow; else no binding. This is exactly the order Google documents: deny policies are evaluated before allow policies, and allow policies are the union over the resource and its ancestors.</p>`,
      code: PY(`def can_access(path, bindings, member, role):
    """Return 'denied', 'allowed' or 'no-binding' for member+role on the last node of path."""
    on_path = set(path)                     # inherited: every ancestor counts
    has_allow = has_deny = False
    for b in bindings:
        kind, node, who, r = b.split()
        if node not in on_path or who != member or r != role:
            continue
        if kind == "deny":
            has_deny = True
        elif kind == "allow":
            has_allow = True
    if has_deny:
        return "denied"                     # deny policies are checked first
    return "allowed" if has_allow else "no-binding"`),
      cx: `<p>O(B + P) time for B bindings and P path nodes, O(P) space.</p>`,
      f: ['Add exception principals to deny rules.', 'Add groups: a member matches a binding for any group it belongs to.'],
      tests: { sig: 'string[] string[] string string -> string', fn: 'can_access', cases: [
        [[['org', 'folders/prod', 'projects/shop'], ['allow folders/prod group:devs roles/viewer'], 'group:devs', 'roles/viewer'], 'allowed'],
        [[['org', 'folders/prod', 'projects/shop'], ['allow folders/prod group:devs roles/viewer', 'deny projects/shop group:devs roles/viewer'], 'group:devs', 'roles/viewer'], 'denied'],
        [[['org', 'folders/prod', 'projects/shop'], ['allow folders/dev group:devs roles/viewer'], 'group:devs', 'roles/viewer'], 'no-binding'],
        [[['org', 'projects/shop'], ['deny org user:a roles/owner', 'allow projects/shop user:a roles/owner'], 'user:a', 'roles/owner'], 'denied'],
        [[['org'], [], 'user:a', 'roles/viewer'], 'no-binding'],
        [[['org', 'projects/p'], ['allow org user:a roles/editor'], 'user:a', 'roles/viewer'], 'no-binding'],
        [[['org', 'projects/p', 'buckets/b'], ['allow buckets/b user:a roles/storage.objectViewer', 'deny projects/x user:a roles/storage.objectViewer'], 'user:a', 'roles/storage.objectViewer'], 'allowed']
      ] }
    })]
  });

  // ───────────────────────── Topic 2: global VPC and firewall rules ─────────────────────────
  topics.push({
    title: 'Global VPCs, Regional Subnets and Firewall Rules: Priorities, Tags, Service Accounts and Hierarchical Policies',
    analogy: `<p>An AWS VPC is like a <b>separate office building in each city</b>: if you want London and Tokyo connected, you build a bridge (peering or Transit Gateway). A GCP VPC is like <b>one company campus whose private road network spans the whole planet</b>: buildings (subnets) are in different cities (regions), but they all share the same internal roads without any bridge. The guard at every door (the firewall) follows a <b>numbered rulebook</b>: rule 100 is read before rule 1000, and the first rule that matches decides.</p>`,
    explain: `<p>🟢 <b>The VPC is global, subnets are regional.</b> In GCP a VPC network has no region and no CIDR of its own. You add <b>subnets</b>, each in one region with its own primary IPv4 range (and optional secondary ranges for GKE pods and services). A VM in <code>europe-west1</code> can reach a VM in <code>asia-northeast1</code> over private IPs on Google's backbone, with no peering. On AWS a VPC is regional with subnets per <b>AZ</b>; on Azure a VNet is regional too. GCP subnets span all the <b>zones</b> of their region, so you do not create one subnet per zone.</p>
      <p>🟢 <b>Auto mode vs custom mode.</b> The <code>default</code> network is <b>auto mode</b>: one subnet per region carved out of <code>10.128.0.0/9</code>, plus permissive default rules (SSH, RDP, ICMP from anywhere, all internal). For production create <b>custom mode</b> networks so you choose ranges that do not collide with on-prem or other clouds. Each subnet loses <b>4</b> addresses (network, default gateway, second-to-last reserved, broadcast). You can <b>expand</b> a primary range later but never shrink it.</p>
      <p>🔵 <b>Firewall rules are stateful and attached to the VPC, applied at each VM's NIC.</b> Each rule has a direction (ingress/egress), action (allow/deny), <b>priority 0–65535 (lower number = evaluated first, default 1000)</b>, protocols/ports, a source or destination range, and a <b>target</b>: all instances, instances with a <b>network tag</b>, or instances running as a <b>service account</b> (better: a tag can be set by anyone who can edit the VM, a service account needs IAM). Every VPC has two <b>implied rules</b> at priority 65535: <b>deny all ingress</b> and <b>allow all egress</b>. When rules of the <b>same priority</b> conflict, <b>deny wins</b>. There is no subnet-level NACL; the closest AWS concept is a security group whose rules have numbered priorities and denies.</p>
      <p>🔵 <b>Firewall policies.</b> Above VPC rules sit <b>hierarchical firewall policies</b> (attached to org or folders, actions allow/deny/<code>goto_next</code>) and <b>global/regional network firewall policies</b> (attached to a network, support secure tags, FQDN and geolocation objects, threat intelligence lists). Org policies are evaluated first, then folders, then the network's rules and policies, so a central security team can enforce "deny RDP from the internet" that no project can override.</p>
      <p>🔵 <b>Shared VPC</b> lets a <b>host project</b> own the network while <b>service projects</b> create VMs, GKE clusters and Cloud Run (via Direct VPC egress) in its subnets, with <code>roles/compute.networkUser</code> granted per subnet. Networking teams own routes and firewalls; app teams own their workloads. It is the GCP answer to AWS Transit Gateway + RAM-shared subnets or Azure hub-and-spoke.</p>`,
    clues: [
      '"Two regions need private connectivity, do we need peering?" → not on GCP: one global VPC spans regions',
      '"Rule with priority 100 allow and priority 1000 deny, what happens?" → <b>100 is evaluated first</b>, so allow',
      '"Same priority, one allow and one deny" → <b>deny wins</b>',
      '"Only the API servers may reach the database" → target and source by <b>service account</b>, not IP',
      '"Central security must block RDP everywhere" → <b>hierarchical firewall policy</b> on the org/folder',
      '"Many teams, one network team" → <b>Shared VPC</b> host and service projects'
    ],
    code: [SH(C`# Custom-mode global VPC with two regional subnets (GKE secondary ranges on the EU one)
gcloud compute networks create prod-vpc --subnet-mode=custom --bgp-routing-mode=global
gcloud compute networks subnets create app-ew1 --network=prod-vpc --region=europe-west1 \
  --range=10.10.0.0/20 --secondary-range=pods=10.20.0.0/14,services=10.24.0.0/20 \
  --enable-private-ip-google-access --enable-flow-logs
gcloud compute networks subnets create app-ane1 --network=prod-vpc --region=asia-northeast1 \
  --range=10.11.0.0/20 --enable-private-ip-google-access

# Allow SSH only through Identity-Aware Proxy (35.235.240.0/20), never from 0.0.0.0/0
gcloud compute firewall-rules create allow-iap-ssh --network=prod-vpc --direction=INGRESS \
  --action=ALLOW --rules=tcp:22 --source-ranges=35.235.240.0/20 --priority=1000

# Database tier: only VMs running as the api service account may reach port 5432
gcloud compute firewall-rules create db-from-api --network=prod-vpc --direction=INGRESS \
  --action=ALLOW --rules=tcp:5432 --priority=900 \
  --source-service-accounts=api-runtime@shop-prod-7f3a.iam.gserviceaccount.com \
  --target-service-accounts=db-runtime@shop-prod-7f3a.iam.gserviceaccount.com

# Explicit low-priority deny for everything else to the DB (logs denials, documents intent)
gcloud compute firewall-rules create db-deny-rest --network=prod-vpc --direction=INGRESS \
  --action=DENY --rules=all --priority=2000 --enable-logging \
  --target-service-accounts=db-runtime@shop-prod-7f3a.iam.gserviceaccount.com

# Which rules apply to a VM, in order?
gcloud compute instances network-interfaces get-effective-firewalls api-1 --zone=europe-west1-b`, 'gcloud: custom VPC, subnets and firewall rules')],
    codeTitle: 'gcloud',
    viz: [{
      title: 'Firewall rule priority matcher: which rule decides this packet?',
      input: 'allow-web 1000 allow tcp 443 web; deny-bad 900 deny tcp 443 *; allow-ssh 1000 allow tcp 22 *; allow-all-web 800 allow tcp * web',
      inputLabel: 'ingress rules "name priority allow|deny proto port|* tag|*" separated by ;. Packet: tcp port 443 to a VM tagged web',
      gen: function (input) {
        var rules = lines(input, 'rules like allow-web 1000 allow tcp 443 web', 10).map(function (l) {
          var w = l.split(/\s+/);
          if (w.length !== 6 || isNaN(+w[1]) || (w[2] !== 'allow' && w[2] !== 'deny')) throw new Error('Each rule: name priority allow|deny proto port|* tag|*');
          if (+w[1] < 0 || +w[1] > 65534) throw new Error('Priority must be 0..65534 (65535 is the implied rule)');
          return { name: w[0], pri: +w[1], act: w[2], proto: w[3], port: w[4], tag: w[5] };
        });
        rules.push({ name: 'implied-deny-ingress', pri: 65535, act: 'deny', proto: 'all', port: '*', tag: '*' });
        var sorted = rules.slice().sort(function (a, b) { return a.pri - b.pri || (a.act === 'deny' ? -1 : 0) - (b.act === 'deny' ? -1 : 0); });
        var pkt = { proto: 'tcp', port: '443', tag: 'web' };
        function match(r) { return (r.proto === 'all' || r.proto === pkt.proto) && (r.port === '*' || r.port === pkt.port) && (r.tag === '*' || r.tag === pkt.tag); }
        function tbl(hl) { return { type: 'table', label: 'rules sorted by priority (lower first; at equal priority deny first)', columns: ['name', 'priority', 'action', 'proto', 'port', 'target tag'], rows: sorted.map(function (r) { return [r.name, r.pri, r.act, r.proto, r.port, r.tag]; }), hl: hl }; }
        var f = [{ narr: 'A packet arrives: <b>tcp/443</b> to a VM with network tag <code>web</code>. GCP sorts the applicable ingress rules by priority (<b>lower number first</b>) and adds the implied <b>deny-all ingress</b> at 65535.', parts: [{ type: 'vars', label: 'packet', vals: pkt }, tbl({})] }];
        for (var i = 0; i < sorted.length; i++) {
          var r = sorted[i], ok = match(r), hl = {};
          for (var j = 0; j < i; j++) hl[j] = 'done';
          hl[i] = ok ? (r.act === 'allow' ? 'ok' : 'bad') : 'cur';
          if (ok) {
            f.push({ narr: '<b>' + r.name + '</b> (priority ' + r.pri + ') matches protocol, port and target, so it <b>decides</b>: the packet is <b>' + (r.act === 'allow' ? 'allowed' : 'denied') + '</b>. Rules after it are never consulted. ' + (r.act === 'allow' ? 'Firewalls are <b>stateful</b>, so the reply traffic is allowed automatically.' : 'If two matching rules had the same priority, the deny would win.'), parts: [tbl(hl)] });
            break;
          }
          f.push({ narr: '<b>' + r.name + '</b> (priority ' + r.pri + ') does not match (' + (r.proto !== 'all' && r.proto !== pkt.proto ? 'protocol' : r.port !== '*' && r.port !== pkt.port ? 'port ' + r.port : 'target tag ' + r.tag) + '), so we move to the next rule.', parts: [tbl(hl)] });
        }
        while (f.length < 4) f.push({ narr: 'Tip: change the priorities and see how the decision moves. A rule at 900 beats one at 1000 no matter what order you created them in.', parts: f[f.length - 1].parts });
        return f;
      }
    }],
    examples: [
      { title: 'Why the default network is a liability', html: `<p>A team launched VMs in the <code>default</code> network. Its <code>default-allow-ssh</code> rule allows tcp:22 from <code>0.0.0.0/0</code> at priority 65534, and auto-mode subnets used <code>10.132.0.0/20</code> in <code>europe-west1</code>, which <b>collided with the office VPN range</b>. Fix: a custom-mode VPC with a planned range, SSH only from IAP's range <code>35.235.240.0/20</code> using <code>gcloud compute ssh --tunnel-through-iap</code>, and the org policy <code>compute.skipDefaultNetworkCreation</code> so new projects never get a default network.</p>` },
      { title: 'Priority debugging: "my allow rule does nothing"', html: `<p>A rule <code>allow-health 1000 allow tcp:8080 from 35.191.0.0/16,130.211.0.0/22</code> was added for load balancer health checks, but backends stayed unhealthy. <code>get-effective-firewalls</code> showed a security team rule <code>deny-nonstandard-ports</code> at priority <b>500</b> denying everything except 80/443. Lower number, evaluated first, decided first. Fix: request an exception rule at priority below 500, or use port 80 for health checks. Also note the health-check ranges: Google's probes come from <code>35.191.0.0/16</code> and <code>130.211.0.0/22</code>, so a rule allowing them is mandatory.</p>` },
      { title: 'Service-account targeting instead of IP lists', html: `<p>Instance IPs change with autoscaling. Writing <code>--source-ranges=10.10.0.5/32,...</code> breaks every week. Writing <code>--source-service-accounts=api-runtime@...</code> and <code>--target-service-accounts=db-runtime@...</code> expresses the intent: "things running as API may talk to things running as DB", and only someone with IAM rights over those service accounts can change membership. Note you cannot mix service-account and tag targeting in the same rule.</p>` },
      { title: 'Shared VPC for 30 teams', html: `<p>The network team owns <code>net-host-prod</code> with the VPC, subnets, Cloud NAT, Cloud Interconnect attachments and firewall policies. Each app team's project is attached as a <b>service project</b> and receives <code>roles/compute.networkUser</code> only on its own subnet. Teams deploy freely; IP plans, egress and on-prem routes stay central. The AWS equivalent is RAM-shared subnets from a network account plus Transit Gateway.</p>` }
    ],
    deepDive: `<p>🟣 <b>Routes.</b> Each VPC has system-generated <b>subnet routes</b> (one per subnet range, cannot be overridden by less specific routes) and a <b>default route</b> <code>0.0.0.0/0</code> to the default internet gateway. Custom static routes can point to an instance, an internal passthrough load balancer (for firewall appliances) or a VPN tunnel. With <b>dynamic routing mode global</b>, a Cloud Router in one region advertises and learns routes for all regions, so on-prem reaches every region over one Interconnect. Without an external IP or Cloud NAT, the default route exists but the VM still cannot reach the internet.</p>
      <p>🟣 <b>Peering and transitivity.</b> VPC Network Peering connects two VPCs (also across projects and orgs) with no gateway and no bandwidth bottleneck, but it is <b>not transitive</b> and ranges must not overlap. For hub-and-spoke at scale, <b>Network Connectivity Center</b> provides VPC spokes and hybrid spokes with transitive routing. <b>Private Service Connect</b> exposes a service (yours or Google APIs) as an internal IP in the consumer VPC without peering ranges, which avoids overlap problems entirely.</p>
      <p>🟣 <b>Quotas and logging.</b> Firewall rule logging is off by default and billed by volume; turn it on for deny rules and sensitive allows. VPC Flow Logs sample per subnet. Firewall Insights flags shadowed rules (a rule that can never match because a higher-priority rule always decides first) and rules with zero hits in N days.</p>`,
    aiEra: `<p>🤖 Paste the output of <code>gcloud compute firewall-rules list --format=json</code> into an assistant and ask it to find shadowed rules, any <code>0.0.0.0/0</code> on 22/3389, and rules targeting all instances: it does this well and fast. Where it fails is mixing models: it may assume AWS-style "allow only" security groups (no priorities) or forget the implied 65535 rules and hierarchical policies that you did not paste. Always verify the result with <code>get-effective-firewalls</code> on a real VM and Connectivity Tests (<code>gcloud network-management connectivity-tests create</code>), which simulate a packet through routes, firewalls and policies and tell you which rule blocked it.</p>`,
    problems: [P({
      t: 'Which firewall rule wins?', l: 'Medium', tags: ['VPC', 'firewall', 'priority'], co: ['Google', 'Snap'], lang: 'python',
      s: `<p>Write <code>winning_rule(rules, proto, port, tag)</code> for <b>ingress</b> traffic. Each rule is <code>"NAME PRIORITY ACTION PROTO PORT TARGET"</code> where ACTION is <code>allow</code>/<code>deny</code>, PROTO is a protocol or <code>all</code>, PORT is a number or <code>*</code>, TARGET is a network tag or <code>*</code> (all instances). Return <code>"NAME:ACTION"</code> of the rule that decides: the matching rule with the <b>lowest priority number</b>; at equal priority a <b>deny beats an allow</b>; if still tied, the one listed first. If none match return <code>"implied:deny"</code>.</p>`,
      ex: `<p>Rules <code>["web 1000 allow tcp 443 web", "block 900 deny tcp * *"]</code>, packet tcp/443 tag web &rarr; <span class="c-r">"block:deny"</span>: 900 is evaluated before 1000.<br>Packet udp/53 tag web with only those rules &rarr; <span class="c-y">"implied:deny"</span>.</p>`,
      bw: `<p>Evaluating rules in the order they were created (AWS NACL habit is by rule number, but people often think "latest rule wins") gives wrong answers: GCP sorts by priority, not creation time, and resolves ties with deny first.</p>`,
      q: ['Two matching rules both have priority 1000: one allows tcp:443, one denies all. What happens to tcp:443?', ['Denied: at equal priority deny wins', 'Allowed: the more specific rule wins', 'Allowed: the newer rule wins', 'Random'], 0, 'GCP has no specificity rule; with equal priorities deny takes precedence over allow.'],
      h: ['Hint 1: a rule matches if each field equals the packet or is a wildcard (all or *).', 'Hint 2: sort matches by (priority, deny first, original index).', 'Hint 3: no matches means the implied deny-ingress rule at 65535 decides.'],
      a: `<p>Filter the rules that match the packet, then choose the minimum by the key <code>(priority, 0 if deny else 1, index)</code>. This mirrors GCP's documented behaviour: priority order, deny precedence at equal priority, and the implied rules at the bottom.</p>`,
      code: PY(`def winning_rule(rules, proto, port, tag):
    best = None
    for i, line in enumerate(rules):
        name, pri, action, p, prt, target = line.split()
        if p not in ("all", proto):
            continue
        if prt != "*" and int(prt) != port:
            continue
        if target != "*" and target != tag:
            continue
        key = (int(pri), 0 if action == "deny" else 1, i)   # lower number first, deny wins ties
        if best is None or key < best[0]:
            best = (key, name + ":" + action)
    return best[1] if best else "implied:deny"`),
      cx: `<p>O(n) time, O(1) extra space.</p>`,
      f: ['Add egress rules and the implied allow-egress rule.', 'Add hierarchical policies evaluated before VPC rules with goto_next.'],
      tests: { sig: 'string[] string int string -> string', fn: 'winning_rule', cases: [
        [[['web 1000 allow tcp 443 web', 'block 900 deny tcp * *'], 'tcp', 443, 'web'], 'block:deny'],
        [[['web 1000 allow tcp 443 web', 'block 900 deny tcp * *'], 'udp', 53, 'web'], 'implied:deny'],
        [[['a 1000 allow tcp 443 *', 'd 1000 deny all * *'], 'tcp', 443, 'x'], 'd:deny'],
        [[['a 1000 allow tcp 443 web'], 'tcp', 443, 'db'], 'implied:deny'],
        [[[], 'tcp', 22, 'web'], 'implied:deny'],
        [[['a 500 allow tcp 22 *', 'b 500 allow tcp * *'], 'tcp', 22, 'web'], 'a:allow'],
        [[['x 65534 allow all * *', 'y 2000 deny icmp * *'], 'tcp', 80, 'web'], 'x:allow'],
        [[['lo 0 allow tcp 80 web', 'd 0 deny tcp 80 web'], 'tcp', 80, 'web'], 'd:deny']
      ] }
    })]
  });

  // ───────────────────────── Topic 3: NAT, load balancers, hybrid, IP planning ─────────────────────────
  topics.push({
    title: 'Cloud NAT, Global Load Balancers and Hybrid Connectivity: Anycast IPs, Private Access and Non-Overlapping IP Plans',
    analogy: `<p>A GCP <b>global load balancer</b> is like a <b>single phone number for a pizza chain</b> that works in every country: you dial the same number anywhere, the call is answered by the nearest call centre, and it is passed to the nearest kitchen that still has free ovens. <b>Cloud NAT</b> is the <b>post room</b> that sends letters out for employees who have no street address of their own; it is not a single desk that can jam, it is a rule that every floor follows. And joining your office network to the campus (VPN or Interconnect) only works if no two rooms share the same <b>room number</b> (IP ranges must not overlap).</p>`,
    explain: `<p>🟢 <b>Cloud NAT</b> gives VMs and GKE nodes without external IPs outbound internet access. Unlike an AWS NAT Gateway (a managed box in one AZ, billed per hour, that you route to), Cloud NAT is <b>software-defined and distributed</b>: it is configured on a <b>Cloud Router</b> per region, and the NAT happens in Google's network fabric, so there is no chokepoint VM and no route to add. It is <b>outbound only</b>. You choose auto-allocated or reserved static NAT IPs (for partner allow-lists) and the <b>ports per VM</b> (default minimum 64); running out of ports shows as dropped connections and <code>OUT_OF_RESOURCES</code> in NAT logs. <b>Private Google Access</b> on a subnet lets those VMs reach Google APIs (Cloud Storage, BigQuery) without NAT at all.</p>
      <p>🟢 <b>Load balancer families.</b> The <b>global external Application Load Balancer</b> (HTTP(S), Envoy-based) uses <b>one anycast IP</b> announced from Google's edge worldwide; TLS ends near the user and traffic rides Google's backbone to the closest healthy backend with capacity (in any region), with Cloud CDN and Cloud Armor (WAF/DDoS) attached. The <b>regional external/internal Application LBs</b> keep traffic in one region. The <b>proxy Network LB</b> handles TCP/SSL proxying; the <b>passthrough Network LB</b> (external or internal) is a regional Layer 4 balancer that keeps the client IP and does not proxy. Mapping: global external ALB ≈ AWS CloudFront + ALB + Global Accelerator in one, or Azure Front Door; internal passthrough NLB ≈ AWS internal NLB / Azure internal Load Balancer.</p>
      <p>🔵 <b>Pieces of an HTTP(S) LB.</b> Forwarding rule (IP + port) → target HTTPS proxy (certificates, Certificate Manager) → <b>URL map</b> (host/path rules, header routing, weighted traffic splitting) → <b>backend services</b> (health check, balancing mode, session affinity, Cloud CDN, Cloud Armor policy) → backends: managed instance groups, <b>network endpoint groups</b> (zonal NEGs for GKE pods, serverless NEGs for Cloud Run, internet NEGs for external origins). Backends in many regions in one backend service is what makes "global" real.</p>
      <p>🔵 <b>Hybrid connectivity.</b> <b>HA VPN</b> (two interfaces, two tunnels, 99.99% SLA when configured with BGP via Cloud Router), <b>Dedicated Interconnect</b> (10 or 100 Gbps physical links in a colocation facility), <b>Partner Interconnect</b> (through a provider, 50 Mbps to 50 Gbps) and <b>Cross-Cloud Interconnect</b> (Google-managed physical links to AWS, Azure, Oracle and Alibaba). All use <b>BGP</b>, and all require that your ranges <b>do not overlap</b>: two networks both using <code>10.0.0.0/16</code> cannot route to each other without NAT. IP planning is the first multi-cloud task, not the last.</p>`,
    clues: [
      '"One IP for users in every continent, failover between regions" → <b>global external Application Load Balancer</b> (anycast)',
      '"Private VMs need to download packages" → <b>Cloud NAT</b> on a Cloud Router; "need to call Cloud Storage" → <b>Private Google Access</b>',
      '"Intermittent outbound connection failures under load" → NAT <b>port exhaustion</b>; raise min ports per VM or enable dynamic port allocation',
      '"Connect GCP to AWS privately at 10 Gbps" → HA VPN for small, <b>Cross-Cloud Interconnect</b> for large',
      '"Peering fails: overlapping ranges" → plan non-overlapping CIDRs across clouds and on-prem up front',
      '"Need client IP preserved for TCP" → <b>passthrough Network LB</b>'
    ],
    code: [SH(C`# Cloud NAT: Cloud Router + NAT config for every subnet in europe-west1, with logging of errors
gcloud compute routers create nat-router-ew1 --network=prod-vpc --region=europe-west1
gcloud compute routers nats create nat-ew1 --router=nat-router-ew1 --region=europe-west1 \
  --auto-allocate-nat-external-ips --nat-all-subnet-ip-ranges \
  --enable-dynamic-port-allocation --min-ports-per-vm=128 --enable-logging --log-filter=ERRORS_ONLY

# Global external Application Load Balancer in front of Cloud Run in two regions (serverless NEGs)
gcloud compute network-endpoint-groups create api-neg-ew1 --region=europe-west1 \
  --network-endpoint-type=serverless --cloud-run-service=api
gcloud compute network-endpoint-groups create api-neg-use1 --region=us-east1 \
  --network-endpoint-type=serverless --cloud-run-service=api
gcloud compute backend-services create api-be --global --load-balancing-scheme=EXTERNAL_MANAGED
gcloud compute backend-services add-backend api-be --global --network-endpoint-group=api-neg-ew1 --network-endpoint-group-region=europe-west1
gcloud compute backend-services add-backend api-be --global --network-endpoint-group=api-neg-use1 --network-endpoint-group-region=us-east1
gcloud compute url-maps create api-map --default-service=api-be
gcloud compute target-https-proxies create api-proxy --url-map=api-map --ssl-certificates=api-cert
gcloud compute addresses create api-ip --global
gcloud compute forwarding-rules create api-fr --global --load-balancing-scheme=EXTERNAL_MANAGED \
  --address=api-ip --target-https-proxy=api-proxy --ports=443`, 'gcloud: Cloud NAT and a global HTTPS load balancer'),
      PY(C`import ipaddress

# Planned ranges for the whole estate: GCP subnets, AWS VPCs, Azure VNets and the office
plan = {
    "gcp app-ew1": "10.10.0.0/20",
    "gcp gke-pods": "10.20.0.0/14",
    "aws prod-vpc": "10.16.0.0/16",
    "azure hub-vnet": "10.21.0.0/16",
    "office": "192.168.0.0/16",
}
nets = {k: ipaddress.ip_network(v) for k, v in plan.items()}
names = list(nets)
for i in range(len(names)):
    for j in range(i + 1, len(names)):
        a, b = names[i], names[j]
        if nets[a].overlaps(nets[b]):
            print("OVERLAP:", a, nets[a], "<->", b, nets[b])
print("checked", len(names), "ranges")`, 'Python: find overlaps in a multi-cloud IP plan')],
    codeTitle: ['gcloud', 'Python overlap check'],
    viz: [{
      title: 'CIDR overlap checker for a global VPC plus other clouds',
      input: '10.10.0.0/20; 10.20.0.0/14; 10.16.0.0/16; 10.21.0.0/16; 10.10.8.0/21',
      inputLabel: 'IPv4 CIDRs separated by ; (subnets, peered VPCs, VNets, on-prem)',
      gen: function (input) {
        var cs = lines(input, 'CIDRs like 10.10.0.0/20; 10.16.0.0/16', 8).map(cidr);
        var order = cs.map(function (c, i) { return i; }).sort(function (a, b) { return cs[a].lo - cs[b].lo; });
        function rows() { return order.map(function (i) { var c = cs[i]; return ['#' + (i + 1), c.text, n2ip(c.lo), n2ip(c.hi), c.size]; }); }
        var f = [{ narr: 'Each CIDR is a block of addresses. First normalise each one (a CIDR like <code>10.10.3.0/20</code> really starts at the /20 boundary) and compute its first and last address.', parts: [{ type: 'table', label: 'ranges', columns: ['id', 'cidr', 'first', 'last', 'addresses'], rows: cs.map(function (c, i) { return ['#' + (i + 1), c.text, n2ip(c.lo), n2ip(c.hi), c.size]; }) }] }];
        f.push({ narr: 'Sort by first address. Now any overlap must show up between a range and the ranges that start before the current maximum end, so one pass is enough (like merging intervals).', parts: [{ type: 'table', label: 'sorted by start', columns: ['id', 'cidr', 'first', 'last', 'addresses'], rows: rows() }] });
        var found = [], maxEnd = -1, maxId = -1;
        order.forEach(function (i, k) {
          var c = cs[i], hl = {}, clash = c.lo <= maxEnd;
          for (var t = 0; t < k; t++) hl[t] = 'done';
          hl[k] = clash ? 'bad' : 'ok';
          if (clash) found.push('#' + (maxId + 1) + ' ' + cs[maxId].text + ' and #' + (i + 1) + ' ' + c.text);
          f.push({ narr: clash ? '<b>Overlap!</b> ' + c.text + ' starts at ' + n2ip(c.lo) + ', before the earlier range ' + cs[maxId].text + ' ends at ' + n2ip(maxEnd) + '. These two cannot be peered, routed over VPN or Interconnect, or both exist in one VPC.' : c.text + ' starts after everything seen so far ends (' + (maxEnd < 0 ? 'nothing yet' : n2ip(maxEnd)) + '). No overlap.', parts: [{ type: 'table', label: 'scan', columns: ['id', 'cidr', 'first', 'last', 'addresses'], rows: rows(), hl: hl }, { type: 'vars', label: 'running state', vals: { 'max end so far': maxEnd < 0 ? '-' : n2ip(Math.max(maxEnd, c.hi)), overlaps: found.length } }] });
          if (c.hi > maxEnd) { maxEnd = c.hi; maxId = i; }
        });
        f.push({ narr: found.length ? '<b>' + found.length + ' overlap(s)</b>. Re-plan before connecting anything: give each cloud and region its own aggregate block (for example GCP 10.10.0.0/15, AWS 10.16.0.0/14, Azure 10.21.0.0/16) so routes summarise cleanly.' : '<b>No overlaps.</b> This plan can be connected with HA VPN, Interconnect or peering. Leave gaps for growth: subnets can be expanded later only into free space next to them.', parts: [{ type: 'set', label: 'overlapping pairs', items: found.length ? found : ['none'] }] });
        return f;
      }
    }],
    examples: [
      { title: 'NAT port exhaustion on a GKE scraping service', html: `<p>A crawler on 20 GKE nodes opened thousands of HTTPS connections to the same few hosts and saw random <code>connection timed out</code>. Cloud NAT logs showed <code>OUT_OF_RESOURCES</code>: with 64 ports per VM and one NAT IP, each node could hold only 64 concurrent connections to the same destination IP:port. Fixes: enable <b>dynamic port allocation</b> (grows to <code>--max-ports-per-vm</code>), raise <code>--min-ports-per-vm</code>, add NAT IPs (each gives 64,512 ports), and reuse connections (HTTP keep-alive). One NAT IP shared across VMs: 64,512 / ports-per-VM = VMs supported.</p>` },
      { title: 'One anycast IP for three continents', html: `<p>A game API runs Cloud Run in <code>us-central1</code>, <code>europe-west1</code> and <code>asia-northeast1</code> behind one global external ALB. A player in Paris connects to Google's Paris edge (TLS ends there), and the request goes over Google's network to <code>europe-west1</code>. When the EU backend failed health checks during a bad deploy, traffic shifted to the next closest region automatically, with the same IP and no DNS change. On AWS this takes Route 53 latency records or Global Accelerator in front of regional ALBs; on Azure, Front Door.</p>` },
      { title: 'Overlap discovered during an acquisition', html: `<p>Company A (GCP, <code>10.0.0.0/16</code> everywhere because it was the default in the tutorial) acquired Company B (AWS, also <code>10.0.0.0/16</code>). HA VPN came up, BGP sessions were established, and nothing routed. Short-term fix: <b>Private Service Connect</b> to publish the few services each side needs as an IP in the other's space, or NAT. Long-term fix: renumber one side. Lesson: choose a company-wide IP plan in RFC 1918 space (and consider <code>100.64.0.0/10</code> for GKE pods) before the first project.</p>` }
    ],
    deepDive: `<p>🟣 <b>Network Service Tiers.</b> <b>Premium tier</b> (default) brings traffic onto Google's backbone at the edge closest to the user; <b>Standard tier</b> hands it to the public internet near the region, cheaper egress, but only regional load balancers and no global anycast. <b>Balancing mode</b> on a backend service (RATE, UTILIZATION, CONNECTION) and <b>capacity scaler</b> decide when a region is "full" and traffic spills to the next closest, which is how global load balancing behaves under a regional surge.</p>
      <p>🟣 <b>Cloud NAT details.</b> NAT applies only to VMs without an external IP (a VM with an external IP never uses Cloud NAT). Endpoint-independent mapping, TCP time-wait and idle timeouts are tunable. <b>Public NAT</b> is for the internet; <b>Private NAT</b> translates between overlapping private ranges across Network Connectivity Center spokes, a useful tool in mergers.</p>
      <p>🟣 <b>SLAs to know.</b> HA VPN: 99.99% with two tunnels to a redundant peer; Dedicated Interconnect: 99.9% with two connections in one metro, 99.99% with four across two metros. A single Classic VPN tunnel has 99.9%. These numbers drive the topology in interviews.</p>`,
    aiEra: `<p>🤖 Network diagrams and IP plans are where AI helps most and hurts most. Assistants generate tidy Terraform for an HA VPN between GCP and AWS (including the four tunnels, Cloud Router BGP ASNs and AWS customer gateways) in seconds, but they invent ASNs that collide, reuse <code>169.254.x.x/30</code> link ranges, and pick CIDRs that overlap your real estate. Always feed it your actual IP inventory and run an overlap checker (like the one above) in CI on every network change. For troubleshooting, ask it to read Connectivity Tests output or NAT logs, not to guess.</p>`,
    problems: [P({
      t: 'Find overlapping ranges in a multi-cloud IP plan', l: 'Medium', tags: ['CIDR', 'IP planning', 'hybrid'], co: ['Google', 'Atlassian'], lang: 'python',
      s: `<p>Write <code>overlapping_pairs(cidrs)</code> that returns every pair of indexes <code>"i-j"</code> (i &lt; j, sorted by i then j) whose IPv4 CIDR blocks overlap. Inputs may have host bits set (<code>10.10.3.0/20</code> means the /20 that contains it). Use only the standard library.</p>`,
      ex: `<p><code>["10.10.0.0/20", "10.16.0.0/16", "10.10.8.0/21"]</code> &rarr; <span class="c-r">["0-2"]</span>: 10.10.8.0/21 sits inside 10.10.0.0/20.<br><code>["10.0.0.0/24", "10.0.1.0/24"]</code> &rarr; <span class="c-g">[]</span>: adjacent is not overlapping.</p>`,
      bw: `<p>Comparing the CIDR strings or the first three octets misses overlaps between different prefix lengths (a /14 containing a /20) and flags adjacent blocks wrongly.</p>`,
      q: ['A GCP subnet is 10.20.0.0/14. Which AWS VPC range overlaps it?', ['10.22.0.0/16', '10.24.0.0/16', '10.16.0.0/14', '10.19.255.0/24'], 0, '10.20.0.0/14 covers 10.20.0.0 to 10.23.255.255, so 10.22.0.0/16 is inside it.'],
      h: ['Hint 1: two blocks overlap when each starts before the other ends.', 'Hint 2: <code>ipaddress.ip_network(s, strict=False)</code> normalises host bits and has <code>.overlaps()</code>.', 'Hint 3: the number of ranges is small, so checking all pairs is fine; keep i &lt; j order.'],
      a: `<p>Parse each CIDR with <code>strict=False</code>, then compare every pair with <code>overlaps</code>. For thousands of ranges you would sort by start and sweep, but an IP plan has tens of entries, so the pairwise check is clearer and O(n²) is fine.</p>`,
      code: PY(`import ipaddress

def overlapping_pairs(cidrs):
    nets = [ipaddress.ip_network(c, strict=False) for c in cidrs]   # tolerate host bits
    out = []
    for i in range(len(nets)):
        for j in range(i + 1, len(nets)):
            if nets[i].overlaps(nets[j]):
                out.append(str(i) + "-" + str(j))
    return out`),
      cx: `<p>O(n²) comparisons for n ranges, O(n) space.</p>`,
      f: ['Sort-and-sweep version for 100,000 ranges.', 'Also report ranges that fall inside 10.128.0.0/9 (auto-mode subnets).'],
      tests: { sig: 'string[] -> string[]', fn: 'overlapping_pairs', cases: [
        [[['10.10.0.0/20', '10.16.0.0/16', '10.10.8.0/21']], ['0-2']],
        [[['10.0.0.0/24', '10.0.1.0/24']], []],
        [[['10.20.0.0/14', '10.22.0.0/16', '10.24.0.0/16']], ['0-1']],
        [[['10.0.0.0/8', '10.1.0.0/16', '10.2.0.0/16']], ['0-1', '0-2']],
        [[[]], []],
        [[['10.10.3.0/20', '10.10.15.0/24']], ['0-1']],
        [[['192.168.0.0/16']], []]
      ] }
    })]
  });

  // ───────────────────────── Topic 4: compute choices ─────────────────────────
  topics.push({
    title: 'Compute on GCP: Compute Engine and MIGs, GKE Standard vs Autopilot, Cloud Run and Cloud Run Functions',
    analogy: `<p>Choosing compute is like choosing how to get a <b>delivery van</b>. <b>Compute Engine</b> is buying a van: total control, you service it. A <b>managed instance group</b> is a fleet manager who keeps N identical vans running and replaces broken ones. <b>GKE Standard</b> is a depot where you own the vans but a dispatcher (Kubernetes) loads parcels onto them; <b>GKE Autopilot</b> is the same depot where you only pay per parcel space used and Google owns the vans. <b>Cloud Run</b> is calling a courier: you hand over a parcel (a container), pay per trip, and nothing runs when there is nothing to deliver.</p>`,
    explain: `<p>🟢 <b>Compute Engine</b> = EC2 / Azure VMs. Machine families: <b>E2</b> (cheapest general purpose), <b>N2/N2D/N4</b> and <b>C3/C4</b> (performance), <b>T2A/C4A Axion</b> (Arm), <b>M</b> (memory), <b>A3/A4/G2</b> (GPUs), plus <b>custom machine types</b> with exactly the vCPU and memory you need (no AWS equivalent). Billing is per second after the first minute. Discounts: <b>sustained use discounts</b> apply automatically to some families (N1, N2, N2D, C2...) when a VM runs most of the month; <b>committed use discounts</b> (1 or 3 years, resource-based or spend-based flexible) ≈ AWS Savings Plans / Azure reservations; <b>Spot VMs</b> are much cheaper (up to ~91% off) but can be preempted with a 30-second notice. A <b>managed instance group (MIG)</b> from an <b>instance template</b> ≈ an Auto Scaling Group from a launch template: autoscaling, autohealing with health checks, rolling updates and <b>regional MIGs</b> that spread across zones.</p>
      <p>🟢 <b>GKE</b> = EKS / AKS. <b>Standard</b> mode: you manage node pools (machine types, upgrades windows, autoscaler) and pay for nodes. <b>Autopilot</b> mode: Google manages nodes, security hardening and scaling; you pay for the <b>pod resource requests</b> (CPU, memory, ephemeral storage), and some privileged workloads are restricted. Both bill a cluster management fee per hour, with a free-tier credit that covers one zonal or Autopilot cluster. GKE gives you regional control planes, release channels with automatic upgrades, <b>Workload Identity Federation for GKE</b> (pods get IAM identities without keys), Gateway API and Dataplane V2 (eBPF/Cilium) networking.</p>
      <p>🔵 <b>Cloud Run</b> runs any container that listens on <code>$PORT</code>, scales from zero to many instances and back, and bills per request-time (CPU only during requests by default, or "instance-based" billing to keep CPU always on). Each instance serves up to <b>concurrency</b> requests at once (default 80, max 1000): unlike AWS Lambda's one-request-per-environment, so a Cloud Run instance often replaces dozens of Lambda environments. Requests can run up to 60 minutes; <b>Cloud Run jobs</b> run to completion for batch; <b>worker pools</b> run pull-based workers. <b>Cloud Run functions</b> (the new name of Cloud Functions 2nd gen, built on Cloud Run) take source code plus a trigger (HTTP, Pub/Sub, Eventarc events) ≈ Lambda / Azure Functions.</p>
      <p>🔵 <b>Decision rule.</b> Stateless HTTP or event-driven containers with spiky traffic → <b>Cloud Run</b>. Many services needing Kubernetes features (service mesh, operators, stateful sets, GPUs with custom scheduling, portability) → <b>GKE</b> (Autopilot unless you need node control). Legacy apps, licensed software, special kernels or steady very high utilisation → <b>Compute Engine MIGs</b>. Glue code reacting to events → <b>Cloud Run functions</b>.</p>`,
    clues: [
      '"Scale to zero, containers, HTTP, pay per use" → <b>Cloud Run</b>',
      '"Teams want Kubernetes without managing nodes" → <b>GKE Autopilot</b> (pay per pod request)',
      '"Each instance handles many concurrent requests" → Cloud Run <b>concurrency</b> (default 80), unlike Lambda',
      '"Need exactly 6 vCPU and 20 GB RAM" → <b>custom machine type</b>',
      '"Batch work that tolerates interruption" → <b>Spot VMs</b> or GKE Spot pods',
      '"Pods need to call Cloud Storage without keys" → <b>Workload Identity Federation for GKE</b>'
    ],
    code: [SH(C`# Cloud Run: private service, own service account, concurrency and scaling limits
gcloud run deploy api --image=europe-west1-docker.pkg.dev/shop-prod-7f3a/apps/api:1.4.2 \
  --region=europe-west1 --service-account=api-runtime@shop-prod-7f3a.iam.gserviceaccount.com \
  --no-allow-unauthenticated --concurrency=80 --min-instances=1 --max-instances=40 \
  --cpu=1 --memory=512Mi --timeout=60s --set-secrets=DB_PASSWORD=db-password:latest
# Let the frontend's service account call it (IAM-based auth between services)
gcloud run services add-iam-policy-binding api --region=europe-west1 \
  --member="serviceAccount:web-runtime@shop-prod-7f3a.iam.gserviceaccount.com" --role="roles/run.invoker"

# GKE Autopilot regional cluster in the Shared VPC subnet, private nodes
gcloud container clusters create-auto prod-eu --region=europe-west1 \
  --network=projects/net-host-prod/global/networks/prod-vpc \
  --subnetwork=projects/net-host-prod/regions/europe-west1/subnetworks/app-ew1 \
  --cluster-secondary-range-name=pods --services-secondary-range-name=services \
  --enable-private-nodes --release-channel=regular

# Regional MIG of Spot VMs for a batch fleet, autoscaled on CPU
gcloud compute instance-templates create batch-tpl --machine-type=e2-standard-4 \
  --provisioning-model=SPOT --instance-termination-action=DELETE --no-address \
  --image-family=debian-12 --image-project=debian-cloud --service-account=batch@shop-prod-7f3a.iam.gserviceaccount.com --scopes=cloud-platform
gcloud compute instance-groups managed create batch-mig --region=europe-west1 --template=batch-tpl --size=2
gcloud compute instance-groups managed set-autoscaling batch-mig --region=europe-west1 \
  --min-num-replicas=0 --max-num-replicas=50 --target-cpu-utilization=0.7`, 'gcloud: Cloud Run, GKE Autopilot, Spot MIG'),
      YM(`# Workload Identity Federation for GKE: the Kubernetes service account is the identity.
# Grant IAM roles to the principal
#   principal://iam.googleapis.com/projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/shop-prod-7f3a.svc.id.goog/subject/ns/shop/sa/uploader
apiVersion: v1
kind: ServiceAccount
metadata:
  name: uploader
  namespace: shop
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: uploader
  namespace: shop
spec:
  replicas: 2
  selector:
    matchLabels: { app: uploader }
  template:
    metadata:
      labels: { app: uploader }
    spec:
      serviceAccountName: uploader        # pods get Google tokens for this identity, no key files
      containers:
        - name: uploader
          image: europe-west1-docker.pkg.dev/shop-prod-7f3a/apps/uploader:2.0.1
          resources:
            requests: { cpu: 500m, memory: 512Mi }   # on Autopilot, requests are what you pay for`, 'uploader.yaml (GKE)')],
    codeTitle: ['gcloud', 'GKE manifest'],
    viz: [{
      title: 'Cloud Run autoscaling: instances needed for a traffic curve',
      input: '20, 200, 800, 1600, 400, 0',
      inputLabel: 'requests per second per minute (comma separated); latency 250 ms, concurrency 80, max instances 40',
      gen: function (input) {
        var v = String(input || '').split(/[\s,]+/).filter(Boolean).map(Number);
        if (!v.length || v.some(function (x) { return isNaN(x) || x < 0; })) throw new Error('Type request rates like 20, 200, 800');
        if (v.length > 16) throw new Error('Use at most 16 values');
        var lat = 0.25, conc = 80, max = 40, min = 0, f = [], inst = [], thr = [];
        f.push({ narr: 'Cloud Run keeps enough instances so each serves at most <b>concurrency</b> requests at once. In-flight requests = rate × latency (Little\'s law). Instances ≈ ceil(in-flight / concurrency), between min and max instances. (The real autoscaler aims at about 60% of max concurrency and also watches CPU, so it adds a little headroom.)', parts: [{ type: 'vars', label: 'settings', vals: { latency: '250 ms', concurrency: conc, 'min instances': min, 'max instances': max } }] });
        v.forEach(function (rps, t) {
          var inflight = rps * lat, need = Math.ceil(inflight / conc - 1e-9), got = Math.max(min, Math.min(max, need));
          inst.push(got);
          var over = Math.max(0, inflight - got * conc);
          thr.push(Math.round(over / lat));
          f.push({ narr: 'Minute ' + t + ': ' + rps + ' req/s × 0.25 s = <b>' + inflight + '</b> in flight → need ' + need + ' instance(s)' + (need > max ? ', capped at <b>' + max + '</b>: about ' + Math.round(over / lat) + ' req/s get <code>429</code>/queue. Raise max-instances or concurrency, or make requests faster.' : need === 0 ? ': <b>scaled to zero</b>, you pay nothing for idle (the next request pays a cold start).' : '.'), parts: [{ type: 'bars', label: 'instances per minute', values: inst.slice(), hl: (function () { var h = {}; h[t] = need > max ? 'bad' : 'cur'; return h; })(), idxLabels: inst.map(function (x, i) { return 'm' + i; }) }, { type: 'vars', label: 'this minute', vals: { rps: rps, 'in flight': inflight, instances: got, 'over capacity req/s': Math.round(over / lat) } }] });
        });
        f.push({ narr: 'With Lambda-style concurrency of 1 the same peak would need ' + Math.ceil(Math.max.apply(null, v) * lat) + ' environments; Cloud Run needed ' + Math.max.apply(null, inst) + ' instances because each serves up to 80 requests at once. That is why I/O-bound APIs are cheap on Cloud Run, and why your code must be <b>thread-safe</b>.', parts: [{ type: 'bars', label: 'instances per minute', values: inst, idxLabels: inst.map(function (x, i) { return 'm' + i; }) }] });
        return f;
      }
    }],
    examples: [
      { title: 'Lambda to Cloud Run migration: fewer cold starts, one surprise', html: `<p>An image-metadata API on Lambda ran at 300 concurrent environments at peak. On Cloud Run with concurrency 80 it needed 5 instances, cold starts almost vanished, and cost dropped. The surprise: the code used a global mutable dict as a per-request cache, which was safe on Lambda (one request per environment) and <b>corrupted data</b> under concurrency 80. Fix: request-scoped state, or <code>--concurrency=1</code> for that one service until fixed.</p>` },
      { title: 'Autopilot bill vs Standard bill', html: `<p>A team ran 40 small pods requesting 250m CPU / 512 MiB each = 10 vCPU and 20 GiB total. On Standard they had 4 <code>e2-standard-8</code> nodes (32 vCPU) at 30% utilisation because of bin-packing headroom and DaemonSets. On Autopilot they paid for the 10 vCPU / 20 GiB requested. Autopilot wins when utilisation of nodes is low; Standard wins when you pack nodes densely, need specific machine shapes, privileged DaemonSets or very cheap Spot node pools you control.</p>` },
      { title: 'Spot MIG for nightly rendering', html: `<p>A rendering job uses a regional MIG of Spot <code>c3-standard-8</code> VMs, scaled from 0 to 50 by queue depth. Preemption sends a 30-second ACPI shutdown signal: the worker catches it, stops pulling work, and the unacknowledged Pub/Sub message is redelivered to another VM. Cost fell by about 70% compared with on-demand. The rule: Spot is for <b>idempotent, checkpointed</b> work, never for the only copy of a stateful database.</p>` }
    ],
    deepDive: `<p>🟣 <b>Live migration.</b> Compute Engine moves running VMs to other hosts during maintenance without reboot (except GPU and some specialised VMs), so "host maintenance" events that force reboots on other clouds are mostly invisible. <b>Sole-tenant nodes</b> serve licensing and isolation needs, ≈ AWS Dedicated Hosts.</p>
      <p>🟣 <b>Cloud Run internals.</b> Instances run in a gVisor-based sandbox (first generation) or a microVM (second generation: full Linux compatibility, faster CPU and network). Startup CPU boost speeds cold starts. <b>Direct VPC egress</b> puts instances directly into a subnet (no Serverless VPC Access connector) to reach private IPs; outbound to the internet goes through Cloud NAT if you route all traffic via the VPC. Ingress settings (all, internal, internal-and-cloud-load-balancing) plus IAM <code>run.invoker</code> plus IAP control who reaches it. Revisions and tagged traffic splitting give canary releases out of the box.</p>
      <p>🟣 <b>GKE upgrades.</b> Release channels (Rapid, Regular, Stable, Extended) upgrade control planes and nodes automatically; maintenance windows and exclusions control when; surge or blue-green node pool upgrades control how; PodDisruptionBudgets protect workloads. Version skew rules and deprecated API removal are the classic upgrade blockers.</p>`,
    aiEra: `<p>🤖 Coding assistants now generate the Dockerfile, the <code>gcloud run deploy</code> line and the Terraform in one go, and Gemini Cloud Assist / other agents can suggest rightsizing from metrics. Use them, but check three things they often get wrong: thread safety under concurrency greater than 1, CPU allocation (request-based billing throttles CPU outside requests, which kills background threads), and Autopilot's minimum and ratio rules for requests. For GKE vs Cloud Run decisions, give the model your real traffic shape and team skills; generic advice ("use Kubernetes for flexibility") is how small teams end up running clusters they did not need.</p>`,
    problems: [P({
      t: 'How many Cloud Run instances?', l: 'Easy', tags: ['Cloud Run', 'autoscaling', 'concurrency'], co: ['Google', 'Shopify'], lang: 'python',
      s: `<p>Write <code>run_instances(rps, latency_ms, concurrency, min_inst, max_inst)</code> returning <code>[instances, over_capacity_inflight]</code>. In-flight requests = rps × latency_ms / 1000. Needed instances = ceil(in-flight / concurrency), then clamp to <code>[min_inst, max_inst]</code>. <code>over_capacity_inflight</code> = max(0, ceil(in-flight) − instances × concurrency). Use integer arithmetic.</p>`,
      ex: `<p><code>(800, 250, 80, 0, 40)</code> &rarr; <span class="c-g">[3, 0]</span>: 200 in flight / 80 = 2.5 → 3 instances.<br><code>(20000, 250, 80, 0, 40)</code> &rarr; <span class="c-r">[40, 1800]</span>: 5000 in flight needs 63 instances, capped at 40 (3200 slots).</p>`,
      bw: `<p>Sizing by "requests per second per instance" without latency ignores Little's law: the same 800 req/s needs 1 instance at 50 ms but 10 at 1 s.</p>`,
      q: ['Latency doubles from 200 ms to 400 ms at the same traffic. What happens to Cloud Run instance count?', ['About doubles: in-flight requests double', 'Halves', 'Stays the same: it depends only on rps', 'Drops to min instances'], 0, 'In-flight = rate × latency, so slower requests mean more concurrent requests and more instances.'],
      h: ['Hint 1: in-flight requests = request rate × latency (Little\'s law).', 'Hint 2: ceiling division of integers: <code>(a + b - 1) // b</code>; in-flight in ms units is rps × latency_ms, so divide by 1000 × concurrency.', 'Hint 3: clamp after computing, then compute the overflow from the clamped value.'],
      a: `<p>Compute in-flight work in request-milliseconds per second (rps × latency_ms) to stay in integers; needed = ceil(that / (1000 × concurrency)). Clamp to min and max instances. The overflow is the in-flight requests above the capacity of the clamped fleet.</p>`,
      code: PY(`def run_instances(rps, latency_ms, concurrency, min_inst, max_inst):
    work = rps * latency_ms                          # in-flight requests x 1000
    need = (work + 1000 * concurrency - 1) // (1000 * concurrency)
    inst = max(min_inst, min(max_inst, need))
    inflight = (work + 999) // 1000                  # ceil of in-flight requests
    over = max(0, inflight - inst * concurrency)
    return [inst, over]`),
      cx: `<p>O(1) time and space: a few integer operations.</p>`,
      f: ['Add the 60% target utilisation the real autoscaler aims for.', 'Compare with Lambda (concurrency 1) for the same inputs.'],
      tests: { sig: 'int int int int int -> int[]', fn: 'run_instances', cases: [
        [[800, 250, 80, 0, 40], [3, 0]], [[20000, 250, 80, 0, 40], [40, 1800]], [[0, 250, 80, 0, 40], [0, 0]], [[0, 250, 80, 2, 40], [2, 0]],
        [[100, 1000, 1, 0, 1000], [100, 0]], [[3, 100, 80, 0, 10], [1, 0]], [[1000, 1000, 10, 0, 50], [50, 500]]
      ] }
    })]
  });

  // ───────────────────────── Topic 5: data services ─────────────────────────
  topics.push({
    title: 'Data Services: Cloud Storage, Cloud SQL, Spanner, BigQuery and Pub/Sub (and Their AWS/Azure Twins)',
    analogy: `<p><b>Cloud Storage</b> is a giant warehouse of labelled boxes. <b>Cloud SQL</b> is a well-run local shop with one till (one primary). <b>Spanner</b> is a chain of shops on every continent that somehow keeps one perfectly consistent stock list, because every shop's clock is synchronised by atomic clocks. <b>BigQuery</b> is a library where you pay by how many pages the librarian has to read for you, so you learn to ask for one chapter, not the whole shelf. <b>Pub/Sub</b> is the post office: publishers drop letters, each subscriber has its own mailbox, and letters stay until you sign for them.</p>`,
    explain: `<p>🟢 <b>Cloud Storage</b> ≈ S3 / Azure Blob. Buckets have a <b>location</b> (region, dual-region, multi-region such as <code>EU</code>) and a default <b>storage class</b>: Standard, Nearline (30-day minimum), Coldline (90-day), Archive (365-day); all classes have millisecond access (no restore step like S3 Glacier Deep Archive) but colder classes add retrieval fees. <b>Autoclass</b> moves objects between classes by access. Use <b>uniform bucket-level access</b> (IAM only, no per-object ACLs) and <b>public access prevention</b>. Turbo replication on dual-regions gives a 15-minute RPO target.</p>
      <p>🟢 <b>Cloud SQL</b> ≈ RDS: managed MySQL, PostgreSQL and SQL Server. <b>High availability</b> uses a standby in another zone with synchronous replication of the regional persistent disk ≈ Multi-AZ; read replicas (also cross-region) ≈ RDS read replicas. Editions: Enterprise and Enterprise Plus (faster failover, data cache, longer PITR). Connect privately via Private Service Access or Private Service Connect, and use the <b>Cloud SQL Auth Proxy</b> / language connectors with IAM database authentication. <b>AlloyDB</b> is Google's PostgreSQL-compatible high-performance engine ≈ Aurora.</p>
      <p>🔵 <b>Spanner</b> is a horizontally scalable relational database with <b>external consistency</b> (strongly consistent, globally ordered transactions) using TrueTime. Regional (99.99% SLA) or multi-region (99.999% SLA) configurations; you size it in <b>processing units</b> (1,000 PU = 1 node, minimum 100 PU) with optional managed autoscaling. It supports GoogleSQL and a PostgreSQL dialect. Closest rivals: Aurora DSQL and DynamoDB global tables (different consistency models), Cosmos DB. Use it when you outgrow one primary or need multi-region writes with strong consistency, not for a small app.</p>
      <p>🔵 <b>BigQuery</b> ≈ Redshift Serverless / Athena / Synapse / Fabric: serverless columnar warehouse with storage and compute separated. Pricing: <b>on-demand</b> per TiB scanned (first 1 TiB per month free; columnar, so you pay for the columns you read) or <b>capacity</b> (editions with slots and autoscaling). Partition tables by date and <b>cluster</b> by common filter columns; use <code>--dry_run</code> to see bytes before running; set <code>maximum_bytes_billed</code> and custom quotas to stop runaway queries.</p>
      <p>🔵 <b>Pub/Sub</b> ≈ SNS+SQS combined, or Azure Service Bus/Event Grid: a global topic with many <b>subscriptions</b>, each getting every message. Pull or push delivery, ack deadline (10 s default, up to 600 s), at-least-once by default with optional <b>exactly-once delivery</b> for pull subscriptions, <b>ordering keys</b>, <b>dead-letter topics</b> with max delivery attempts (5–100), filters, retention up to 7 days on subscriptions (31 days on topics), and BigQuery/Cloud Storage subscriptions that write directly. <b>Pub/Sub Lite</b> is deprecated; use Pub/Sub or Managed Service for Apache Kafka.</p>`,
    clues: [
      '"Global relational database, strongly consistent writes in several regions" → <b>Spanner</b>',
      '"Lift-and-shift PostgreSQL" → <b>Cloud SQL</b> (or AlloyDB for heavy OLTP+analytics)',
      '"Analysts\' queries cost a fortune" → BigQuery <b>partitioning, clustering, SELECT only needed columns</b>, dry runs, max bytes billed',
      '"One event, many consumers each at their own pace" → Pub/Sub topic with <b>one subscription per consumer</b>',
      '"Archive for 7 years, rarely read" → Cloud Storage <b>Archive</b> class with retention policy / bucket lock',
      '"Keep the same message order per customer" → Pub/Sub <b>ordering keys</b>'
    ],
    code: [SH(C`# Cloud Storage: EU multi-region bucket, IAM-only, never public, versioned, lifecycle to Coldline after 90 days
gcloud storage buckets create gs://shop-prod-invoices --location=EU --default-storage-class=STANDARD \
  --uniform-bucket-level-access --public-access-prevention
gcloud storage buckets update gs://shop-prod-invoices --versioning
cat > /tmp/lifecycle.json <<'EOF'
{"rule": [{"action": {"type": "SetStorageClass", "storageClass": "COLDLINE"}, "condition": {"age": 90}}]}
EOF
gcloud storage buckets update gs://shop-prod-invoices --lifecycle-file=/tmp/lifecycle.json

# Cloud SQL PostgreSQL with HA (regional), private IP only, PITR on
gcloud sql instances create orders-db --database-version=POSTGRES_16 --edition=ENTERPRISE \
  --tier=db-custom-2-7680 --region=europe-west1 --availability-type=REGIONAL \
  --network=projects/net-host-prod/global/networks/prod-vpc --no-assign-ip \
  --enable-point-in-time-recovery --backup-start-time=02:00

# BigQuery: check the bytes before paying for them
bq query --use_legacy_sql=false --dry_run \
  'SELECT order_id, total FROM shop.orders WHERE order_date BETWEEN "2026-10-01" AND "2026-10-07"'

# Pub/Sub: topic, dead-letter topic, a pull subscription with DLQ after 5 attempts
gcloud pubsub topics create orders
gcloud pubsub topics create orders-dlq
gcloud pubsub subscriptions create orders-billing --topic=orders --ack-deadline=60 \
  --dead-letter-topic=orders-dlq --max-delivery-attempts=5 --enable-message-ordering`, 'gcloud / bq: storage, SQL, BigQuery, Pub/Sub')],
    codeTitle: 'gcloud',
    viz: [{
      title: 'BigQuery on-demand: what partitioning and column choice do to the bill',
      input: '50, 365, 7, 20',
      inputLabel: 'GB per day of data, days stored, days the query filters on, % of columns selected',
      gen: function (input) {
        var v = String(input || '').split(/[\s,]+/).filter(Boolean).map(Number);
        if (v.length !== 4 || v.some(function (x) { return isNaN(x) || x < 0; })) throw new Error('Type 4 numbers: GB/day, days stored, days filtered, % columns');
        var gb = v[0], days = Math.min(v[1], 3650), want = Math.min(v[2], days), pct = Math.min(100, v[3]);
        function cost(g) { return (g / 1024 * 6.25).toFixed(2); }
        var steps = [
          ['SELECT * on unpartitioned table', gb * days],
          ['SELECT needed columns, unpartitioned', gb * days * pct / 100],
          ['SELECT *, partitioned by date', gb * want],
          ['needed columns + partition filter', gb * want * pct / 100]
        ];
        var f = [], vals = [];
        f.push({ narr: 'BigQuery on-demand charges for <b>bytes read</b> (about $6.25 per TiB in US/EU multi-regions, first 1 TiB per month free). A <code>LIMIT 10</code> does not reduce the bytes read. Two levers matter: read fewer <b>columns</b> (storage is columnar) and read fewer <b>partitions</b>.', parts: [{ type: 'vars', label: 'table', vals: { 'GB per day': gb, 'days stored': days, 'table size GB': gb * days, 'days needed': want, '% columns needed': pct } }] });
        steps.forEach(function (s, i) {
          vals.push(Math.round(s[1]));
          var h = {}; h[i] = i === 3 ? 'ok' : i === 0 ? 'bad' : 'cur';
          f.push({ narr: '<b>' + s[0] + '</b>: reads about ' + Math.round(s[1]) + ' GB → about <b>$' + cost(s[1]) + '</b> per run. ' + (i === 0 ? 'Every column of every day. A dashboard refreshing this every 5 minutes costs this 288 times a day.' : i === 1 ? 'Columnar storage: only the selected columns are scanned.' : i === 2 ? 'The <code>WHERE order_date BETWEEN ...</code> on the partition column prunes all other days.' : 'Both levers together. Clustering on a filter column can cut it further.'), parts: [{ type: 'bars', label: 'GB scanned per run', values: vals.slice(), hl: h, idxLabels: ['*', 'cols', 'part', 'both'].slice(0, vals.length) }] });
        });
        return f;
      }
    }],
    examples: [
      { title: 'The $9,000 dashboard', html: `<p>A Looker Studio dashboard ran <code>SELECT *</code> on a 30 TB unpartitioned events table every 15 minutes. 96 runs a day × 30 TiB ≈ 2,880 TiB/day; at $6.25/TiB that is roughly $18,000 a day before anyone noticed. Fixes: partition by <code>DATE(event_ts)</code> with <code>require_partition_filter=true</code>, cluster by <code>customer_id</code>, select only needed columns, a materialised view for the dashboard, custom per-user daily quotas and a budget alert on the BigQuery SKU. Bytes per run dropped from 30 TB to about 4 GB.</p>` },
      { title: 'Cloud SQL or Spanner for a growing marketplace?', html: `<p>At 2,000 writes/s and 800 GB in one region, Cloud SQL Enterprise Plus with HA and two read replicas is simpler and cheaper. The team moved to Spanner only when they launched in the US and Asia with a requirement that a seller's inventory be decremented exactly once worldwide (no oversell) at low write latency per continent: a multi-region Spanner configuration gave strong consistency and 99.999% availability. The cost of Spanner is also design work: choose primary keys that avoid hotspots (no monotonically increasing ids; use UUIDv4 or bit-reversed sequences).</p>` },
      { title: 'Pub/Sub vs SQS habits', html: `<p>An AWS team used one SQS queue per consumer behind SNS. On GCP the topic plays SNS and each <b>subscription</b> plays a queue: create <code>orders-billing</code>, <code>orders-email</code>, <code>orders-analytics</code> subscriptions on one <code>orders</code> topic. Differences to remember: ack deadline instead of visibility timeout (extendable with <code>modifyAckDeadline</code>; client libraries do it for you), dead-letter topic set per subscription, and the default is at-least-once, so consumers must be idempotent unless exactly-once delivery is enabled.</p>` }
    ],
    deepDive: `<p>🟣 <b>Firestore and Bigtable.</b> Firestore is a serverless document database (≈ DynamoDB / Cosmos DB for documents) with real-time listeners and strong consistency; Bigtable is a wide-column store for huge time-series and IoT (≈ Keyspaces/HBase, DynamoDB at scale) with single-digit ms latency and row-key design as the whole game. Memorystore ≈ ElastiCache / Azure Cache for Redis (Valkey and Redis).</p>
      <p>🟣 <b>BigQuery internals.</b> Storage is Capacitor columnar format on Colossus; queries run on Dremel with shuffles; billing for storage is logical or physical (compressed) per dataset, with long-term storage at about half price after 90 days untouched. BigQuery Omni runs queries on data in S3 and Azure Blob without moving it, and BigLake gives fine-grained security over open formats (Iceberg, Parquet) in object stores across clouds, a real multi-cloud analytics option.</p>
      <p>🟣 <b>Spanner TrueTime.</b> Every commit timestamp has a bounded uncertainty (a few ms, from GPS and atomic clocks in each data centre); Spanner waits out the uncertainty before making a commit visible ("commit wait"), which guarantees that if transaction A commits before B starts, A's timestamp is smaller. That gives external consistency without a single global leader for all data; each split has its own Paxos group.</p>`,
    aiEra: `<p>🤖 BigQuery has Gemini built in to write SQL from plain English, and data agents can now explore datasets on their own. That makes the bill an AI problem: an agent that runs exploratory <code>SELECT *</code> queries can burn terabytes in an afternoon. Give agents a service account with <code>maximum_bytes_billed</code> enforced, custom quotas, access only to curated views, and log every query. For schema design (Spanner keys, Bigtable row keys, partition columns), use AI to propose options, then validate with Key Visualizer and query plans on real data shapes.</p>`,
    problems: [P({
      t: 'Bytes scanned and cost of a BigQuery query', l: 'Easy', tags: ['BigQuery', 'cost', 'partitioning'], co: ['Google', 'Spotify'], lang: 'python',
      s: `<p>Write <code>bq_cost(gb_per_day, days_stored, days_filtered, col_pct, partitioned)</code> returning <code>[gb_scanned, cost_cents]</code>. If partitioned, days read = min(days_filtered, days_stored), else all days_stored. GB scanned = ceil(gb_per_day × days_read × col_pct / 100). Cost in cents at $6.25 per TiB (1 TiB = 1024 GB) = ceil(gb_scanned × 625 / 1024). Ignore the free tier.</p>`,
      ex: `<p><code>(50, 365, 7, 20, True)</code> &rarr; <span class="c-g">[70, 43]</span>: 50 × 7 × 20% = 70 GB → 70 × 625 / 1024 = 42.7 → 43 cents.<br><code>(50, 365, 7, 100, False)</code> &rarr; <span class="c-r">[18250, 11139]</span>: the whole table, $111.39 per run.</p>`,
      bw: `<p>Estimating cost from the number of rows returned: <code>LIMIT 10</code> still reads every byte of the selected columns in every scanned partition.</p>`,
      q: ['Which change reduces BigQuery on-demand cost for a query?', ['Selecting fewer columns', 'Adding LIMIT 10', 'Adding ORDER BY', 'Running it at night'], 0, 'On-demand bills bytes read; columnar storage means fewer columns read fewer bytes. LIMIT does not reduce bytes scanned.'],
      h: ['Hint 1: decide days read first: partition pruning only works if the table is partitioned.', 'Hint 2: integer ceiling: <code>-(-a // b)</code> or <code>(a + b - 1) // b</code>.', 'Hint 3: compute gb_scanned first, then cents from it.'],
      a: `<p>Days read depends on partitioning; multiply by daily size and column fraction with integer ceiling, then convert GB to cents at 625 cents per 1024 GB with ceiling. Integer arithmetic avoids float rounding surprises.</p>`,
      code: PY(`def bq_cost(gb_per_day, days_stored, days_filtered, col_pct, partitioned):
    days = min(days_filtered, days_stored) if partitioned else days_stored
    gb = (gb_per_day * days * col_pct + 99) // 100          # ceil(gb_per_day * days * pct / 100)
    cents = (gb * 625 + 1023) // 1024                        # $6.25 per TiB, rounded up
    return [gb, cents]`),
      cx: `<p>O(1) time and space: a few integer operations.</p>`,
      f: ['Subtract the 1 TiB monthly free tier across N runs.', 'Compare with a capacity (slots) reservation priced per slot-hour.'],
      tests: { sig: 'int int int int bool -> int[]', fn: 'bq_cost', cases: [
        [[50, 365, 7, 20, true], [70, 43]], [[50, 365, 7, 100, false], [18250, 11139]], [[50, 365, 7, 100, true], [350, 214]],
        [[10, 5, 30, 100, true], [50, 31]], [[0, 100, 10, 100, true], [0, 0]], [[1, 1, 1, 1, false], [1, 1]], [[1024, 1, 1, 100, true], [1024, 625]]
      ] }
    })]
  });

  // ───────────────────────── Topic 6: service mapping ─────────────────────────
  // [category, AWS, Azure, GCP, the difference that bites]
  var MAP = [
    ['account boundary', 'Account (in AWS Organizations, OUs)', 'Subscription + resource groups (management groups)', 'Project (folders, organization)', 'GCP IAM allow policies inherit downward and cannot be subtracted lower down'],
    ['guardrails', 'Service Control Policies', 'Azure Policy', 'Organization Policy Service (+ IAM deny)', 'Org policies restrict configuration; IAM deny restricts permissions'],
    ['workload identity', 'IAM role (instance profile, IRSA / Pod Identity)', 'Managed identity (Workload ID for AKS)', 'Service account (Workload Identity Federation for GKE)', 'A GCP service account is both an identity and a resource with its own IAM'],
    ['network', 'VPC (regional), subnets per AZ', 'VNet (regional), subnets', 'VPC (global), subnets per region', 'One GCP VPC spans regions with no peering'],
    ['firewall', 'Security groups + NACLs', 'NSGs (priorities) + Azure Firewall', 'VPC firewall rules / firewall policies (priorities, deny)', 'GCP rules are per VPC, targeted by tag or service account'],
    ['nat', 'NAT Gateway (per AZ)', 'NAT Gateway', 'Cloud NAT (on Cloud Router)', 'Cloud NAT is distributed, not a box in the path'],
    ['global l7 lb', 'CloudFront + ALB / Global Accelerator', 'Front Door', 'Global external Application Load Balancer', 'One anycast IP with backends in many regions'],
    ['vms', 'EC2 + Auto Scaling Groups', 'Virtual Machines + VM Scale Sets', 'Compute Engine + managed instance groups', 'Custom machine types, live migration, sustained use discounts'],
    ['kubernetes', 'EKS', 'AKS', 'GKE (Standard / Autopilot)', 'Autopilot bills pod requests'],
    ['containers serverless', 'App Runner / ECS Fargate', 'Container Apps', 'Cloud Run', 'Cloud Run instances serve many concurrent requests'],
    ['functions', 'Lambda', 'Azure Functions', 'Cloud Run functions', 'Built on Cloud Run; concurrency above 1 is possible'],
    ['object storage', 'S3', 'Blob Storage', 'Cloud Storage', 'All GCS classes have ms access; colder classes add retrieval fees'],
    ['relational', 'RDS / Aurora', 'Azure SQL / Database for PostgreSQL', 'Cloud SQL / AlloyDB', 'Cloud SQL HA ≈ Multi-AZ'],
    ['global relational', 'Aurora DSQL / Aurora Global Database', 'Cosmos DB (NoSQL) / SQL Hyperscale', 'Spanner', 'Spanner: strongly consistent multi-region writes'],
    ['warehouse', 'Redshift / Athena', 'Synapse / Fabric', 'BigQuery', 'BigQuery on-demand bills bytes scanned'],
    ['messaging', 'SNS + SQS / EventBridge', 'Service Bus / Event Grid', 'Pub/Sub / Eventarc', 'A Pub/Sub subscription ≈ an SQS queue on an SNS topic'],
    ['secrets', 'Secrets Manager', 'Key Vault', 'Secret Manager', 'Access via IAM role secretmanager.secretAccessor'],
    ['dns', 'Route 53', 'Azure DNS / Traffic Manager', 'Cloud DNS', 'Global LB often replaces DNS-based failover'],
    ['iac', 'CloudFormation / CDK', 'ARM / Bicep', 'Infrastructure Manager (Terraform)', 'Terraform works on all three'],
    ['monitoring', 'CloudWatch / X-Ray', 'Azure Monitor / App Insights', 'Cloud Monitoring / Logging / Trace', 'Logs Explorer queries, metrics scoped by project']
  ];
  var CLOUDS = { aws: 1, azure: 2, gcp: 3 };
  function mapFind(term) {
    var t = term.toLowerCase();
    for (var i = 0; i < MAP.length; i++) {
      for (var c = 0; c < 4; c++) if (MAP[i][c].toLowerCase().indexOf(t) >= 0) return i;
    }
    return -1;
  }
  topics.push({
    title: 'Service Mapping Across AWS, Azure and GCP: Same Job, Different Defaults',
    analogy: `<p>Moving between clouds is like <b>moving between countries that drive cars</b>. Everyone has roads, petrol, licences and traffic lights, so you can translate most things ("motorway" = "autobahn"). But the <b>defaults</b> differ in ways that hurt: which side of the road you drive on, whether you may turn on red. Translating names is the easy 80%; knowing the different defaults (global vs regional networks, inherited IAM, per-request concurrency) is what makes you safe on day one.</p>`,
    explain: `<p>🟢 <b>Learn by mapping, then learn the differences.</b> Interviewers for multi-cloud roles ask "what is the GCP equivalent of X" and then "how is it different". The table below covers the services you meet first. Names are current for 2026 (for example <b>Cloud Run functions</b> replaced the Cloud Functions name, Azure Synapse features are moving into <b>Fabric</b>, Google's Terraform service is <b>Infrastructure Manager</b>).</p>
      ${H.table(['Job', 'AWS', 'Azure', 'GCP'], MAP.slice(0, 12).map(function (r) { return [r[0], r[1], r[2], r[3]]; }))}
      <p>🔵 <b>Differences that cause incidents.</b> (1) <b>Network scope</b>: GCP VPC global, AWS/Azure regional. (2) <b>IAM model</b>: AWS evaluates identity + resource policies with explicit deny anywhere; Azure RBAC assignments inherit down management group → subscription → resource group → resource, with deny assignments rare; GCP allow policies inherit as a union, with separate deny policies. (3) <b>Zones</b>: AWS subnets are per AZ, GCP/Azure subnets span zones. (4) <b>Serverless concurrency</b>: Lambda one request per environment; Cloud Run and Azure Container Apps many. (5) <b>Billing granularity</b>: GCP sustained use discounts are automatic; AWS needs Savings Plans to discount. (6) <b>Storage cold tiers</b>: S3 Glacier Flexible/Deep Archive need a restore; GCS Archive and Azure Cool/Cold are online (Azure Archive tier needs rehydration).</p>
      <p>🔵 <b>Identity federation between clouds</b> is now keyless everywhere: GCP Workload Identity Federation trusts AWS (via signed <code>GetCallerIdentity</code>) and Azure (via OIDC); AWS <code>AssumeRoleWithWebIdentity</code> trusts Google-signed OIDC tokens; Azure workload identity federation trusts external OIDC issuers. A workload in one cloud should never hold a static key for another.</p>`,
    clues: [
      '"What is the GCP equivalent of an AWS account / Lambda / SQS?" → project / Cloud Run functions / Pub/Sub subscription',
      '"We are an AWS shop, the acquisition runs on GCP" → map services, then list behavioural differences and identity federation',
      '"Translate this architecture diagram to Azure" → map each box, then check networking and IAM scope',
      '"Is BigQuery like Redshift?" → same job, different billing (bytes scanned vs cluster/RPU)',
      '"How do workloads in AWS call GCP APIs without keys?" → <b>Workload Identity Federation</b> with an AWS provider'
    ],
    code: [SH(C`# A workload in AWS (EC2 role / ECS task role) calling GCP without a key:
# 1) GCP side: a pool and an AWS provider that trusts one AWS account
gcloud iam workload-identity-pools create aws-pool --location=global --display-name="AWS workloads"
gcloud iam workload-identity-pools providers create-aws aws-prod --location=global \
  --workload-identity-pool=aws-pool --account-id=111122223333 \
  --attribute-condition="assertion.arn.startsWith('arn:aws:sts::111122223333:assumed-role/report-exporter/')"
# 2) Allow that AWS role to impersonate one GCP service account
gcloud iam service-accounts add-iam-policy-binding exporter@analytics-prod.iam.gserviceaccount.com \
  --role=roles/iam.workloadIdentityUser \
  --member="principalSet://iam.googleapis.com/projects/987654321098/locations/global/workloadIdentityPools/aws-pool/attribute.aws_role/arn:aws:sts::111122223333:assumed-role/report-exporter"
# 3) Generate a credential configuration file (contains no secret) for the client libraries
gcloud iam workload-identity-pools create-cred-config \
  projects/987654321098/locations/global/workloadIdentityPools/aws-pool/providers/aws-prod \
  --service-account=exporter@analytics-prod.iam.gserviceaccount.com --aws --output-file=gcp-cred.json
export GOOGLE_APPLICATION_CREDENTIALS=gcp-cred.json   # libraries exchange the AWS identity for a short-lived token`, 'Keyless AWS → GCP access'),
      PY(`# A tiny lookup: translate a service name between clouds (subset of the topic's table)
MAP = [
    ("object storage", "S3", "Blob Storage", "Cloud Storage"),
    ("functions", "Lambda", "Azure Functions", "Cloud Run functions"),
    ("kubernetes", "EKS", "AKS", "GKE"),
    ("warehouse", "Redshift", "Synapse / Fabric", "BigQuery"),
    ("messaging", "SNS + SQS", "Service Bus", "Pub/Sub"),
]
COL = {"aws": 1, "azure": 2, "gcp": 3}

def translate(name, target):
    for row in MAP:
        if any(name.lower() == cell.lower() for cell in row):
            return row[COL[target]]
    return "unknown"

for name, target in [("Lambda", "gcp"), ("BigQuery", "aws"), ("GKE", "azure"), ("Mainframe", "gcp")]:
    print(name, "->", target, ":", translate(name, target))`, 'Python: cross-cloud lookup')],
    codeTitle: ['gcloud', 'Python'],
    viz: [{
      title: 'Cross-cloud service mapping lookup',
      input: 'Lambda; Blob Storage; Spanner; NAT Gateway; Cloud Run',
      inputLabel: 'service names or jobs from any cloud, separated by ;',
      gen: function (input) {
        var terms = lines(input, 'service names like Lambda; Cloud Run', 8), f = [], found = [];
        f.push({ narr: 'We look each name up in a mapping table with one row per <b>job</b> (what the service does) and one column per cloud. Matching the job first is the trick: names lie ("Cloud Functions" was renamed, "Fabric" absorbs Synapse) but jobs do not.', parts: [{ type: 'table', label: 'mapping table (first rows)', columns: ['job', 'AWS', 'Azure', 'GCP'], rows: MAP.slice(0, 8).map(function (r) { return r.slice(0, 4); }) }] });
        terms.forEach(function (t) {
          var i = mapFind(t);
          if (i < 0) { found.push(t + ': not in table'); f.push({ narr: '<b>' + H.esc(t) + '</b> is not in the table. Map it by its <b>job</b> first (store objects? run containers? queue messages?) and then pick the service for that job.', parts: [{ type: 'set', label: 'results so far', items: found.slice() }] }); return; }
          var r = MAP[i];
          found.push(t + ' → ' + r[0]);
          f.push({ narr: '<b>' + H.esc(t) + '</b> is the job <b>' + r[0] + '</b>. AWS: ' + r[1] + '; Azure: ' + r[2] + '; GCP: ' + r[3] + '. <b>Watch out:</b> ' + r[4] + '.', parts: [{ type: 'table', label: 'row for ' + r[0], columns: ['job', 'AWS', 'Azure', 'GCP'], rows: [r.slice(0, 4)], hl: { 0: 'ok' } }, { type: 'set', label: 'results so far', items: found.slice() }] });
        });
        while (f.length < 4) f.push({ narr: 'Try adding more names, e.g. Route 53; Key Vault; BigQuery.', parts: f[f.length - 1].parts });
        return f;
      }
    }],
    examples: [
      { title: 'Translating a reference architecture', html: `<p>AWS design: Route 53 → CloudFront → ALB → ECS Fargate → RDS PostgreSQL Multi-AZ + ElastiCache, SQS for jobs, S3 for uploads, Secrets Manager. GCP: Cloud DNS → <b>global external ALB with Cloud CDN</b> (one component replaces CloudFront+ALB) → <b>Cloud Run</b> → <b>Cloud SQL PostgreSQL HA</b> + Memorystore, <b>Pub/Sub</b> (or Cloud Tasks for HTTP job dispatch with rate limits), Cloud Storage, Secret Manager. Azure: Azure DNS → Front Door → Container Apps → Azure Database for PostgreSQL flexible server (zone-redundant HA) + Azure Cache for Redis, Service Bus, Blob, Key Vault.</p>` },
      { title: 'A difference that broke a migration: subnets and zones', html: `<p>An AWS team ported a Terraform module that created "one subnet per AZ" to GCP and made three subnets in <code>europe-west1</code> (one per zone, they thought). GCP subnets are regional and do not take a zone, so they ended up with three overlapping-purpose subnets and firewall rules tripled. Correct GCP design: one subnet per region per tier (or just per region), zone choice happens at the VM/MIG/GKE level.</p>` },
      { title: 'IAM translation pitfalls', html: `<p>"Give the app read access to one bucket" is an S3 bucket policy or an IAM role policy on AWS, a role assignment of <code>Storage Blob Data Reader</code> on the container/account scope on Azure, and a binding of <code>roles/storage.objectViewer</code> on the bucket on GCP. "Make sure nobody can delete it": an explicit Deny on AWS, a <b>resource lock</b> or deny assignment on Azure, and an <b>IAM deny policy</b> or bucket retention lock / soft delete on GCP.</p>` }
    ],
    deepDive: `<p>🟣 <b>Where the abstractions leak.</b> Consistency models (S3 and GCS are strongly consistent for reads after writes and listings; Azure Blob too), maximum object sizes (5 TiB S3/GCS; Azure block blobs about 190 TiB), queue semantics (SQS FIFO vs Pub/Sub ordering keys vs Service Bus sessions), load balancer timeouts, and quotas all differ. A "cloud-agnostic" library that hides them usually picks the lowest common denominator and hides the failure modes too.</p>
      <p>🟣 <b>Pricing model shapes.</b> Egress to the internet is charged by all three (with free tiers and region-dependent rates); ingress is free. Inter-zone traffic is charged within a region on AWS and GCP (Azure announced it would not charge for inter-AZ transfer). Cross-region traffic inside one GCP VPC is charged even though no peering is needed. Committed discounts: AWS Savings Plans/RIs, Azure reservations and savings plans, GCP CUDs (resource-based and spend-based) plus automatic sustained use discounts.</p>
      <p>🟣 <b>Certifications vs reality.</b> The Professional Cloud Architect exam tests exactly this mapping plus GCP-specific design (Shared VPC, org policies, BigQuery). On the job, the fastest way to learn a cloud is to re-implement a design you already know there end to end, including IAM, networking and teardown.</p>`,
    aiEra: `<p>🤖 Service mapping is the task AI does best in this module: give it a diagram or a Terraform plan and ask for the equivalent on another cloud with a <b>"differences and risks"</b> column. It will still lag on renames and new services (training cut-offs), so check names against current product pages, and test the behaviours that matter for your workload (timeouts, concurrency, consistency) rather than trusting the table. Migration tools (Google's Migration Center, AWS Application Discovery, Azure Migrate) now use AI to produce these mappings and cost estimates from real inventory; treat their output as a first draft.</p>`,
    problems: [P({
      t: 'Translate a service between clouds', l: 'Easy', tags: ['multi-cloud', 'service mapping'], co: ['Accenture', 'Google'], lang: 'python',
      s: `<p>Write <code>translate(rows, name, target)</code>. <code>rows</code> are strings <code>"job|aws|azure|gcp"</code>. Find the first row in which <code>name</code> equals any of the four cells (case-insensitive, ignoring surrounding spaces) and return the cell for <code>target</code> (<code>aws</code>, <code>azure</code> or <code>gcp</code>). If <code>target</code> is <code>job</code>, return the job. If not found return <code>"unknown"</code>.</p>`,
      ex: `<p>rows <code>["functions|Lambda|Azure Functions|Cloud Run functions"]</code>, <code>("lambda", "gcp")</code> &rarr; <span class="c-g">"Cloud Run functions"</span>.<br><code>("Mainframe", "gcp")</code> &rarr; <span class="c-y">"unknown"</span>.</p>`,
      bw: `<p>A hard-coded <code>if</code> chain per pair of clouds grows as n² and goes stale with every rename; one table keyed by job with a column per cloud grows linearly.</p>`,
      q: ['What is the closest GCP equivalent of "SNS topic with one SQS queue per consumer"?', ['A Pub/Sub topic with one subscription per consumer', 'One Pub/Sub subscription shared by all consumers', 'Cloud Tasks queue', 'Eventarc only'], 0, 'Each Pub/Sub subscription gets every message and is consumed independently, like a per-consumer SQS queue.'],
      h: ['Hint 1: split each row on "|" and strip the cells.', 'Hint 2: compare lowercased, stripped strings in every cell.', 'Hint 3: map target names to column indexes: job 0, aws 1, azure 2, gcp 3.'],
      a: `<p>Parse rows into cells once, look for the first row containing the name in any column (case-insensitive), and index the target column. A table keyed by job is the maintainable representation of a multi-cloud mapping.</p>`,
      code: PY(`def translate(rows, name, target):
    col = {"job": 0, "aws": 1, "azure": 2, "gcp": 3}[target]
    want = name.strip().lower()
    for row in rows:
        cells = [c.strip() for c in row.split("|")]
        if any(c.lower() == want for c in cells):
            return cells[col]
    return "unknown"`),
      cx: `<p>O(R) rows scanned, O(1) extra space.</p>`,
      f: ['Return all matches when a name appears in several rows (e.g. a service doing two jobs).', 'Add a "differences" column and return it alongside.'],
      tests: { sig: 'string[] string string -> string', fn: 'translate', cases: [
        [[['functions|Lambda|Azure Functions|Cloud Run functions'], 'lambda', 'gcp'], 'Cloud Run functions'],
        [[['functions|Lambda|Azure Functions|Cloud Run functions'], 'Mainframe', 'gcp'], 'unknown'],
        [[['object storage|S3|Blob Storage|Cloud Storage', 'warehouse|Redshift|Synapse|BigQuery'], 'BigQuery', 'aws'], 'Redshift'],
        [[['kubernetes|EKS|AKS|GKE'], ' gke ', 'azure'], 'AKS'],
        [[['kubernetes|EKS|AKS|GKE'], 'AKS', 'job'], 'kubernetes'],
        [[[], 'S3', 'gcp'], 'unknown'],
        [[['a|X|Y|Z', 'b|X|Q|W'], 'x', 'gcp'], 'Z']
      ] }
    })]
  });

  // ───────────────────────── Topic 7: multi-cloud strategy and portability ─────────────────────────
  topics.push({
    title: 'Multi-Cloud and Hybrid Strategy: When It Is Worth It, Portability with Terraform and Kubernetes, and the Egress Bill',
    analogy: `<p>Going multi-cloud is like a restaurant deciding to <b>buy from two wholesalers</b>. It protects you if one goes bust and lets you buy each item where it is best (fish here, wine there). But you now have two accounts, two delivery schedules, two sets of rules, and your chefs must know both catalogues. And moving a lorry of goods between the two warehouses costs money every time (<b>egress</b>). Most restaurants should pick one main wholesaler and use the second only for what it does uniquely well.</p>`,
    explain: `<p>🟢 <b>Words first.</b> <b>Multi-cloud</b> = using more than one public cloud. <b>Hybrid</b> = public cloud plus your own data centres or edge. Patterns, from most common to rarest: (1) <b>Best-of-breed by workload</b> (apps on AWS, analytics on BigQuery, Office/identity on Azure/Entra); (2) <b>Inherited by acquisition</b>; (3) <b>Regulatory or sovereignty</b> needs (a region or sovereign cloud only one provider offers, exit plans demanded by regulators such as DORA in the EU); (4) <b>DR to a second cloud</b>; (5) <b>Active-active across clouds</b> for one app, rare and expensive.</p>
      <p>🟢 <b>When it is worth it:</b> a capability you cannot get otherwise (BigQuery, TPUs, a specific region, a customer that requires their cloud), a regulator demanding a credible exit, or real negotiating leverage at very large spend. <b>When it is not:</b> "avoid lock-in" as an abstract goal for a small team. Costs: duplicated skills and on-call, lowest-common-denominator designs, two IAM and network models to secure, and <b>data egress</b> on every cross-cloud call. A multi-region single-cloud design (DevOps 17) gives most of the availability for far less complexity: provider-wide outages are rare compared with your own deploy mistakes.</p>
      <p>🔵 <b>Portability tools.</b> <b>Terraform/OpenTofu</b> gives one workflow and language, but <b>not portable resources</b>: <code>google_compute_network</code> and <code>aws_vpc</code> are different resources with different semantics. Portability comes from <b>module interfaces</b> ("network with these tiers", "a Postgres with HA") with one implementation per cloud. <b>Kubernetes</b> gives a portable runtime API: the same Deployments, Services, HPA, Gateway API and Helm charts run on GKE, EKS and AKS; what differs is identity (Workload Identity vs IRSA/Pod Identity vs Entra Workload ID), load balancer annotations, storage classes and the managed services the pods call. Fleet tools (<b>GKE Enterprise</b> fleets and Config Sync, <b>Azure Arc</b>, <b>EKS Anywhere</b>/<b>EKS Hybrid Nodes</b>, Argo CD) manage policy and config across clusters wherever they run.</p>
      <p>🔵 <b>Data gravity is the real lock-in.</b> Compute moves easily; petabytes and the managed databases' features (Spanner, DynamoDB, Cosmos DB) do not. Design the boundary so chatty traffic stays inside one cloud and only coarse, batched or event data crosses, over private interconnect (Cross-Cloud Interconnect, AWS Interconnect partner offerings, Azure ExpressRoute with Cross-Cloud links) where volume justifies it.</p>`,
    clues: [
      '"Avoid vendor lock-in" → ask which lock-in, at what cost; usually <b>portable interfaces + exit plan</b>, not active-active multi-cloud',
      '"Analytics team wants BigQuery but apps are on AWS" → best-of-breed split, move data in batches, watch <b>egress</b>',
      '"Regulator requires an exit strategy" → documented, tested <b>exit plan</b> (backups in portable formats, IaC per cloud, runbooks)',
      '"Same app on GKE and EKS" → Kubernetes manifests + per-cloud overlays (identity, LB, storage class)',
      '"Terraform makes us cloud-agnostic, right?" → one tool, but resources are provider-specific; abstract with modules',
      '"Microservices call each other across clouds" → latency + egress per GB on every call; keep chatty paths in one cloud'
    ],
    code: [HCL(C`# One interface, two implementations: callers choose a cloud, the module hides provider details.
# modules/network/gcp/main.tf  (the AWS twin lives in modules/network/aws with the same variables and outputs)
variable "name"    { type = string }
variable "regions" { type = map(string) }   # region => CIDR, e.g. { "europe-west1" = "10.10.0.0/20" }

resource "google_compute_network" "this" {
  name                    = var.name
  auto_create_subnetworks = false            # custom mode: we own the IP plan
  routing_mode            = "GLOBAL"
}

resource "google_compute_subnetwork" "this" {
  for_each                 = var.regions
  name                     = "@{var.name}-@{each.key}"
  region                   = each.key
  network                  = google_compute_network.this.id
  ip_cidr_range            = each.value
  private_ip_google_access = true
}

resource "google_compute_router" "nat" {
  for_each = var.regions
  name     = "@{var.name}-nat-@{each.key}"
  region   = each.key
  network  = google_compute_network.this.id
}

resource "google_compute_router_nat" "nat" {
  for_each                           = var.regions
  name                               = "@{var.name}-nat"
  router                             = google_compute_router.nat[each.key].name
  region                             = each.key
  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"
}

output "subnet_ids" { value = { for k, s in google_compute_subnetwork.this : k => s.id } }`, 'modules/network/gcp/main.tf'),
      YM(`# kustomize overlay: the base Deployment is identical on GKE and EKS; only cloud glue differs.
# overlays/gke/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
patches:
  - target: { kind: Service, name: uploader }
    patch: |-
      - op: add
        path: /metadata/annotations
        value:
          cloud.google.com/neg: '{"ingress": true}'
# overlays/eks would instead annotate the ServiceAccount with eks.amazonaws.com/role-arn
# (or use EKS Pod Identity) and use AWS Load Balancer Controller annotations.`, 'overlays/gke/kustomization.yaml')],
    codeTitle: ['Terraform (HCL)', 'Kustomize'],
    viz: [{
      title: 'Cost comparison: one cloud vs a cross-cloud split',
      input: '2000, 15, 9, 12, 40000',
      inputLabel: 'VM hours/month, GCP cents/hour, AWS cents/hour, egress cents/GB, GB/month crossing clouds in the split design',
      gen: function (input) {
        var v = String(input || '').split(/[\s,]+/).filter(Boolean).map(Number);
        if (v.length !== 5 || v.some(function (x) { return isNaN(x) || x < 0; })) throw new Error('Type 5 numbers: hours, GCP cents/h, AWS cents/h, egress cents/GB, GB crossing');
        var h = v[0], g = v[1], a = v[2], e = v[3], gb = v[4];
        var allG = h * g, allA = h * a, split = (h / 2) * g + (h / 2) * a + gb * e;
        function d(c) { return '$' + (c / 100).toFixed(0); }
        var f = [];
        f.push({ narr: 'We compare three designs for the same workload of ' + h + ' VM-hours a month. Prices are <b>your inputs</b>, not list prices: always use the pricing calculators for your region, machine type and discounts.', parts: [{ type: 'vars', label: 'inputs', vals: { 'VM hours': h, 'GCP cents/h': g, 'AWS cents/h': a, 'egress cents/GB': e, 'GB crossing (split)': gb } }] });
        f.push({ narr: '<b>All on GCP:</b> ' + h + ' × ' + g + '¢ = ' + d(allG) + '. No cross-cloud traffic.', parts: [{ type: 'bars', label: 'monthly cost (cents)', values: [allG], idxLabels: ['GCP'], hl: { 0: 'cur' } }] });
        f.push({ narr: '<b>All on AWS:</b> ' + h + ' × ' + a + '¢ = ' + d(allA) + '.', parts: [{ type: 'bars', label: 'monthly cost (cents)', values: [allG, allA], idxLabels: ['GCP', 'AWS'], hl: { 1: 'cur' } }] });
        f.push({ narr: '<b>Split half and half:</b> compute ' + d((h / 2) * (g + a)) + ' plus <b>egress</b> ' + gb + ' GB × ' + e + '¢ = ' + d(gb * e) + '. Total ' + d(split) + '. The chatty cross-cloud calls, not the VMs, decide the bill.', parts: [{ type: 'bars', label: 'monthly cost (cents)', values: [allG, allA, split], idxLabels: ['GCP', 'AWS', 'split'], hl: { 2: split > Math.min(allG, allA) ? 'bad' : 'ok' } }] });
        var best = Math.min(allG, allA, split), name = best === allG ? 'all on GCP' : best === allA ? 'all on AWS' : 'the split';
        f.push({ narr: 'Cheapest: <b>' + name + '</b> (' + d(best) + '). Add the costs this ignores: a second on-call skill set, two security baselines, interconnect ports. Multi-cloud must buy something (a capability, compliance, leverage) worth more than its total cost.', parts: [{ type: 'bars', label: 'monthly cost (cents)', values: [allG, allA, split], idxLabels: ['GCP', 'AWS', 'split'], hl: { 0: best === allG ? 'ok' : 'done', 1: best === allA ? 'ok' : 'done', 2: best === split ? 'ok' : 'done' } }] });
        return f;
      }
    }],
    examples: [
      { title: 'Best-of-breed done right: AWS apps, BigQuery analytics', html: `<p>A retailer runs its shop on AWS and wanted BigQuery for analytics. Instead of streaming every click across clouds, they write events to S3 in Parquet, and a <b>Storage Transfer Service</b> job (or BigQuery Omni / BigLake on the S3 data) moves hourly batches. The AWS → GCP egress is about 2 TB/month, a known line item. Identity is keyless: the transfer uses an AWS role trusted by GCP Workload Identity Federation. One cloud runs the product, the other runs analytics, and the boundary carries batches, not chatty calls.</p>` },
      { title: 'Active-active across clouds that was rolled back', html: `<p>A fintech ran the same API on GKE and EKS with CockroachDB spanning both clouds "for resilience". Every write needed a cross-cloud quorum: p99 latency tripled, egress was a top-3 line item, and the two clusters' upgrade and IAM drift caused more incidents than any cloud outage. They moved to <b>multi-region on one cloud</b> with a <b>tested exit plan</b> (nightly portable backups to the other cloud, Terraform modules for both, a yearly restore drill there), which satisfied the regulator's DORA exit requirement at a fraction of the cost.</p>` },
      { title: 'Hybrid with GKE Enterprise / Azure Arc', html: `<p>A manufacturer must keep line-control software in factories (latency, offline operation) but wants one way to deploy. They run GKE on bare metal / Google Distributed Cloud in the plants and GKE in the cloud, registered in one <b>fleet</b>; Config Sync applies the same policies and namespaces from Git everywhere. An Azure-centric company would use AKS on Azure Local with <b>Azure Arc</b> for the same pattern; AWS offers Outposts and EKS Hybrid Nodes.</p>` }
    ],
    deepDive: `<p>🟣 <b>Portability levels.</b> (1) <b>Skills portability</b>: Linux, containers, Terraform, Kubernetes, OpenTelemetry are the same everywhere. (2) <b>Artifact portability</b>: OCI images, Helm charts, SQL dumps, Parquet/Iceberg. (3) <b>Runtime portability</b>: Kubernetes, PostgreSQL-compatible databases. (4) <b>Operational portability</b>: one CI/CD, one observability stack, one policy engine (OPA/Kyverno). Aim for 1–2 cheaply and 3–4 only where the business case exists; full "write once, run on any cloud" costs you the managed services that made the cloud worth it.</p>
      <p>🟣 <b>Terraform multi-cloud specifics.</b> Separate state per cloud and per environment (a GCS backend for GCP stacks, S3 for AWS), so a failure or lock in one cloud does not block the other. Providers authenticate keylessly from CI (OIDC to both). Policy as code (OPA/Conftest, Sentinel) checks plans for both. Tag/label schemas must be unified for FinOps (FOCUS, the FinOps Open Cost and Usage Specification, normalises billing exports across AWS, Azure and GCP).</p>
      <p>🟣 <b>Egress economics.</b> Typical list internet/inter-cloud egress is around $0.05–$0.12 per GB depending on volume and region; private interconnects reduce the per-GB rate but add port fees. Since 2024 all three providers waive egress fees for customers <b>leaving</b> entirely (on request, with conditions), driven partly by the EU Data Act; that does not cover ongoing multi-cloud traffic.</p>`,
    aiEra: `<p>🤖 AI makes multi-cloud cheaper to <b>build</b> (it writes the second Terraform implementation and the Kustomize overlays) but not cheaper to <b>run</b>: on-call, security reviews and egress still double. Use assistants to keep the two implementations in sync (diff the AWS and GCP modules against the shared interface on every PR), to normalise billing exports to FOCUS, and to draft exit plans. AI platforms also create new multi-cloud pressure: models available only on one cloud (Gemini on Vertex AI, Claude on Bedrock, Vertex AI and Azure AI Foundry, OpenAI on Azure) pull teams into a second cloud for one API. Call those APIs across clouds with federated identity and keep the data movement small.</p>`,
    problems: [P({
      t: 'Cheapest placement including egress', l: 'Medium', tags: ['multi-cloud', 'cost', 'FinOps'], co: ['Google', 'Datadog'], lang: 'python',
      s: `<p>Write <code>cheapest(offers, hours, egress_gb)</code>. Each offer is <code>"NAME VM_CENTS_PER_HOUR EGRESS_CENTS_PER_GB FREE_EGRESS_GB"</code>. Monthly cost = hours × vm + max(0, egress_gb − free) × egress. Return <code>"NAME:COST"</code> for the cheapest; on a tie choose the name that is alphabetically first. Return <code>"none"</code> for an empty list.</p>`,
      ex: `<p><code>["gcp 15 12 100", "aws 14 9 100"]</code>, 1000 h, 1100 GB &rarr; <span class="c-g">"aws:23000"</span>: GCP 15000 + 1000×12 = 27000; AWS 14000 + 1000×9 = 23000.</p>`,
      bw: `<p>Comparing only VM hourly prices: the cheaper VM can lose once egress dominates, which is exactly what happens in data-heavy multi-cloud designs.</p>`,
      q: ['A workload moves 50 TB/month to users. What usually dominates the cloud comparison?', ['Egress pricing per GB', 'The VM hourly price only', 'The number of regions', 'Free-tier VMs'], 0, '50,000 GB × several cents per GB is thousands of dollars, often more than the compute.'],
      h: ['Hint 1: parse each offer into a name and three integers.', 'Hint 2: billable egress = max(0, gb − free).', 'Hint 3: choose min by (cost, name) to break ties alphabetically.'],
      a: `<p>Compute each offer's monthly cost in integer cents, then select the minimum by the tuple (cost, name). The point of the exercise: any cloud comparison must include data transfer, not just compute list prices.</p>`,
      code: PY(`def cheapest(offers, hours, egress_gb):
    best = None
    for o in offers:
        name, vm, eg, free = o.split()
        cost = hours * int(vm) + max(0, egress_gb - int(free)) * int(eg)
        if best is None or (cost, name) < best:
            best = (cost, name)
    return "none" if best is None else best[1] + ":" + str(best[0])`),
      cx: `<p>O(n) time for n offers, O(1) extra space.</p>`,
      f: ['Add committed-use discounts as a percentage for hours above a commitment.', 'Add a split design with cross-cloud traffic charged on both sides.'],
      tests: { sig: 'string[] int int -> string', fn: 'cheapest', cases: [
        [[['gcp 15 12 100', 'aws 14 9 100'], 1000, 1100], 'aws:23000'],
        [[['gcp 10 12 100', 'aws 14 9 100'], 1000, 100], 'gcp:10000'],
        [[[], 10, 10], 'none'],
        [[['b 10 0 0', 'a 10 0 0'], 5, 5], 'a:50'],
        [[['azure 12 8 0'], 0, 0], 'azure:0'],
        [[['x 1 100 0', 'y 50 1 0'], 10, 1000], 'y:1500']
      ] }
    })]
  });

  // ───────────────────────── Practice: Easy ─────────────────────────
  practice.push(P({
    t: 'Is this a valid GCP project id?', l: 'Easy', tags: ['projects', 'resource hierarchy'], co: ['Google'], lang: 'python',
    s: `<p>Project ids are global and permanent, so CI should check them before calling the API. Write <code>valid_project_ids(ids)</code> returning a list of booleans. A valid id is <b>6 to 30</b> characters, uses only <b>lowercase letters, digits and hyphens</b>, <b>starts with a letter</b> and <b>does not end with a hyphen</b>.</p>`,
    ex: `<p><code>["shop-prod-7f3a", "Shop-prod", "prod-", "abc"]</code> &rarr; <span class="c-g">[true, false, false, false]</span>: uppercase, trailing hyphen and too short are all rejected.</p>`,
    bw: `<p>Letting the API reject bad ids at apply time wastes a pipeline run, and a typo that <em>is</em> valid becomes permanent: a deleted project id cannot be reused.</p>`,
    q: ['Which statement about GCP project ids is true?', ['They are globally unique and cannot be changed after creation', 'They can be renamed like display names', 'They are unique only inside a folder', 'They are the same as project numbers'], 0, 'The display name can change; the project id is global and permanent, and the project number is a separate numeric id.'],
    h: ['Hint 1: check the length first (6 to 30 characters).', 'Hint 2: a regular expression with a first-letter class and a last-character class does the rest.', 'Hint 3: pattern <code>^[a-z][a-z0-9-]{4,28}[a-z0-9]$</code> gives lengths 6 to 30.'],
    a: `<p>One anchored regular expression encodes all four rules: first char a lowercase letter, 4–28 middle chars from the allowed set, last char a letter or digit. Apply it to each id.</p>`,
    code: PY(`import re

PATTERN = re.compile(r"^[a-z][a-z0-9-]{4,28}[a-z0-9]$")

def valid_project_ids(ids):
    return [bool(PATTERN.match(i)) for i in ids]`),
    cx: `<p>O(total characters).</p>`, f: ['Also reject ids containing the word "google" (reserved).'],
    tests: { sig: 'string[] -> bool[]', fn: 'valid_project_ids', cases: [
      [[['shop-prod-7f3a', 'Shop-prod', 'prod-', 'abc']], [true, false, false, false]],
      [[['abcdef']], [true]], [[['abcde']], [false]], [[['a23456789012345678901234567890']], [true]],
      [[['a234567890123456789012345678901']], [false]], [[['1abcdef', 'ab_cdef', 'ab-cd-9']], [false, false, true]], [[[]], []]
    ] }
  }));
  practice.push(P({
    t: 'Usable addresses in GCP subnets', l: 'Easy', tags: ['VPC', 'subnets', 'CIDR'], co: ['Google', 'Snap'], lang: 'python',
    s: `<p>GCP reserves <b>4</b> addresses in every subnet primary range (network, default gateway, second-to-last, broadcast). Write <code>usable_ips(cidrs)</code> returning, for each IPv4 CIDR, the number of usable addresses, or <code>-1</code> if the prefix is longer than <b>/29</b> (too small for a GCP subnet) or shorter than <b>/8</b> (outside this exercise).</p>`,
    ex: `<p><code>["10.10.0.0/20", "10.0.0.0/29", "10.0.0.0/30"]</code> &rarr; <span class="c-g">[4092, 4, -1]</span>: a /20 has 4096 addresses minus 4.</p>`,
    bw: `<p>Using the AWS rule (5 reserved per subnet) or the classic rule (2 reserved) gives off-by-one capacity plans; a /29 on GCP has only 4 usable addresses.</p>`,
    q: ['How many VMs can a GCP /28 subnet hold at most?', ['12', '14', '16', '11'], 0, '16 addresses minus 4 reserved = 12.'],
    h: ['Hint 1: the prefix is the number after the slash.', 'Hint 2: total addresses = 2 ** (32 - prefix).', 'Hint 3: validate the prefix range before subtracting 4.'],
    a: `<p>Read the prefix, reject sizes GCP does not allow (smaller than /29) and the out-of-range ones, and return 2<sup>32−p</sup> − 4.</p>`,
    code: PY(`def usable_ips(cidrs):
    out = []
    for c in cidrs:
        p = int(c.split("/")[1])
        out.append(-1 if p > 29 or p < 8 else 2 ** (32 - p) - 4)
    return out`),
    cx: `<p>O(n) time for n CIDRs, O(n) output.</p>`, f: ['GKE: how many nodes fit if each node needs one IP plus a /24 of pod range from a secondary /14?'],
    tests: { sig: 'string[] -> int[]', fn: 'usable_ips', cases: [
      [[['10.10.0.0/20', '10.0.0.0/29', '10.0.0.0/30']], [4092, 4, -1]], [[['10.0.0.0/24']], [252]], [[['10.0.0.0/8']], [16777212]],
      [[['10.0.0.0/7']], [-1]], [[['10.0.0.0/28', '10.0.0.0/16']], [12, 65532]], [[[]], []]
    ] }
  }));
  practice.push(P({
    t: 'Build a private, secure-by-default network', l: 'Easy', tags: ['VPC', 'Cloud NAT', 'IAP'], co: ['Google'],
    s: `<p>Write the <code>gcloud</code> commands (bash) for project <code>lab-net-01</code>: a custom-mode VPC <code>lab-vpc</code>; one subnet <code>lab-ew1</code> (<code>10.50.0.0/24</code>, <code>europe-west1</code>, Private Google Access on); SSH allowed only from IAP; a Cloud NAT so a VM without an external IP can install packages; one <code>e2-micro</code> VM with no external IP, running as a dedicated service account with no roles; then the cleanup commands.</p>`,
    ex: `<p>After the lab: <code>gcloud compute ssh lab-vm --zone=europe-west1-b --tunnel-through-iap</code> works, <code>sudo apt-get update</code> works through Cloud NAT, and the VM has no public IP. Cleanup leaves nothing billable.</p>`,
    bw: `<p>Using the <code>default</code> network with its open SSH rule and giving the VM an external IP "to make apt work" exposes port 22 to the internet and uses the default service account with Editor.</p>`,
    q: ['A VM with no external IP cannot reach the internet. Which is the GCP fix?', ['Cloud NAT on a Cloud Router in that region', 'An internet gateway resource', 'A NAT VM is required', 'Give it an alias IP'], 0, 'GCP has a default internet route already; Cloud NAT provides the translation for VMs without external IPs.'],
    h: ['Hint 1: custom-mode network, then a subnet with --enable-private-ip-google-access.', 'Hint 2: IAP TCP forwarding comes from 35.235.240.0/20; the VM needs --no-address and its own --service-account.', 'Hint 3: delete in reverse order: VM, NAT, router, firewall, subnet, network, service account.'],
    a: `<p>Create the network, subnet and firewall first, then the Cloud Router and NAT, then a dedicated service account and the VM with <code>--no-address</code>. Cleanup reverses the order because a network cannot be deleted while subnets, rules or routers reference it.</p>`,
    code: SH(C`#!/usr/bin/env bash
set -euo pipefail
P=lab-net-01; R=europe-west1; Z=europe-west1-b
gcloud config set project "$P"
gcloud services enable compute.googleapis.com iap.googleapis.com

gcloud compute networks create lab-vpc --subnet-mode=custom
gcloud compute networks subnets create lab-ew1 --network=lab-vpc --region="$R" \
  --range=10.50.0.0/24 --enable-private-ip-google-access
gcloud compute firewall-rules create lab-allow-iap-ssh --network=lab-vpc --direction=INGRESS \
  --action=ALLOW --rules=tcp:22 --source-ranges=35.235.240.0/20

gcloud compute routers create lab-router --network=lab-vpc --region="$R"
gcloud compute routers nats create lab-nat --router=lab-router --region="$R" \
  --auto-allocate-nat-external-ips --nat-all-subnet-ip-ranges

gcloud iam service-accounts create lab-vm-sa --display-name="lab vm (no roles)"
gcloud compute instances create lab-vm --zone="$Z" --machine-type=e2-micro --subnet=lab-ew1 \
  --no-address --image-family=debian-12 --image-project=debian-cloud \
  --service-account="lab-vm-sa@$P.iam.gserviceaccount.com" --scopes=cloud-platform --shielded-secure-boot

gcloud compute ssh lab-vm --zone="$Z" --tunnel-through-iap --command="sudo apt-get update -q && echo NAT OK"

# ---- cleanup (reverse order) ----
gcloud compute instances delete lab-vm --zone="$Z" --quiet
gcloud compute routers nats delete lab-nat --router=lab-router --region="$R" --quiet
gcloud compute routers delete lab-router --region="$R" --quiet
gcloud compute firewall-rules delete lab-allow-iap-ssh --quiet
gcloud compute networks subnets delete lab-ew1 --region="$R" --quiet
gcloud compute networks delete lab-vpc --quiet
gcloud iam service-accounts delete "lab-vm-sa@$P.iam.gserviceaccount.com" --quiet`),
    cx: `<p>Minutes of setup; cost is pennies if cleaned up within the hour (VM, NAT gateway hours, NAT data).</p>`,
    f: ['Replace the firewall rule with a network firewall policy.', 'Add an org policy that blocks external IPs for the whole project.']
  }));

  // ───────────────────────── Practice: Medium ─────────────────────────
  practice.push(P({
    t: 'Pick the smallest role that covers the permissions', l: 'Medium', tags: ['IAM', 'least privilege', 'custom roles'], co: ['Google', 'Stripe'], lang: 'python',
    s: `<p>Write <code>least_role(needed, roles)</code>. <code>needed</code> is a list of permissions. Each role is <code>"ROLE perm1,perm2,..."</code>. Return the role whose permission set contains all needed permissions and has the <b>fewest permissions</b>; break ties by role name (alphabetical). If none covers them, return <code>"custom-role-needed"</code>.</p>`,
    ex: `<p>needed <code>["storage.objects.get"]</code>, roles <code>["roles/storage.objectViewer storage.objects.get,storage.objects.list", "roles/storage.admin storage.objects.get,storage.objects.list,storage.objects.delete,storage.buckets.delete"]</code> &rarr; <span class="c-g">"roles/storage.objectViewer"</span>.</p>`,
    bw: `<p>Granting Editor or the service's admin role "because it works" is the classic over-grant; it also gives delete and IAM-adjacent permissions nobody asked for.</p>`,
    q: ['No predefined role is narrow enough and the broader ones include delete. What should you do?', ['Create a custom role with exactly the needed permissions', 'Grant Editor temporarily', 'Grant Owner on the bucket only', 'Use a service account key'], 0, 'Custom roles exist for this; remember they need maintenance when services add permissions.'],
    h: ['Hint 1: turn needed into a set and each role into a set.', 'Hint 2: <code>needed_set &lt;= role_set</code> tests coverage.', 'Hint 3: track the best candidate by (size, name).'],
    a: `<p>Parse each role into a set and keep the covering role with the smallest (size, name). This is what IAM Recommender effectively does from observed usage, and why it sometimes recommends a custom role.</p>`,
    code: PY(`def least_role(needed, roles):
    want = set(needed)
    best = None
    for r in roles:
        name, perms = r.split(" ", 1) if " " in r else (r, "")
        have = set(p for p in perms.split(",") if p)
        if want <= have:
            key = (len(have), name)
            if best is None or key < best:
                best = key
    return best[1] if best else "custom-role-needed"`),
    cx: `<p>O(total permissions).</p>`, f: ['Return the smallest set of roles whose union covers the permissions (set cover, NP-hard in general).'],
    tests: { sig: 'string[] string[] -> string', fn: 'least_role', cases: [
      [[['storage.objects.get'], ['roles/storage.objectViewer storage.objects.get,storage.objects.list', 'roles/storage.admin storage.objects.get,storage.objects.list,storage.objects.delete,storage.buckets.delete']], 'roles/storage.objectViewer'],
      [[['storage.objects.create'], ['roles/storage.objectViewer storage.objects.get,storage.objects.list']], 'custom-role-needed'],
      [[['a', 'b'], ['r2 a,b', 'r1 b,a']], 'r1'],
      [[[], ['big a,b,c', 'small a']], 'small'],
      [[['x'], []], 'custom-role-needed'],
      [[['run.routes.invoke'], ['roles/run.invoker run.routes.invoke', 'roles/run.admin run.routes.invoke,run.services.delete']], 'roles/run.invoker']
    ] }
  }));
  practice.push(P({
    t: 'Cheapest Cloud Storage class for an access pattern', l: 'Medium', tags: ['Cloud Storage', 'storage classes', 'cost'], co: ['Google', 'Dropbox'], lang: 'python',
    s: `<p>Use these <b>illustrative</b> prices (hundredths of a cent): storage per GB-month STANDARD 200, NEARLINE 100, COLDLINE 40, ARCHIVE 12; retrieval per GB STANDARD 0, NEARLINE 100, COLDLINE 200, ARCHIVE 500; minimum storage duration 0, 30, 90, 365 days (you pay storage for at least that long). Write <code>cheapest_class(gb, retrieved_gb_per_month, days_kept)</code>. Cost × 30 = <code>gb × price × max(days, min_days) + retrieved × days × retrieval_price</code>. Return the cheapest class name; on a tie prefer the hotter class (earlier in the list).</p>`,
    ex: `<p><code>(1000, 0, 365)</code> &rarr; <span class="c-g">"ARCHIVE"</span>: never read, kept a year.<br><code>(1000, 1000, 30)</code> &rarr; <span class="c-y">"STANDARD"</span>: Nearline ties with Standard because of retrieval fees, and the tie goes hotter.</p>`,
    bw: `<p>Choosing by storage price alone puts frequently read data into Archive and pays more in retrieval fees and minimum-duration charges than it saves.</p>`,
    q: ['Objects in Coldline are deleted after 10 days. What are you billed for storage?', ['90 days (minimum storage duration)', '10 days', 'Nothing, deletion is free', '30 days'], 0, 'Early deletion is charged as if stored for the minimum duration: 90 days for Coldline.'],
    h: ['Hint 1: put the four classes in a list of tuples (name, storage, retrieval, min_days).', 'Hint 2: multiply everything by 30 so all arithmetic stays in integers.', 'Hint 3: keep the first class with the strictly smallest cost to prefer hotter on ties.'],
    a: `<p>Evaluate each class with the formula, including minimum duration via <code>max(days, min_days)</code>, and keep the first minimum. Autoclass automates this for unpredictable patterns; lifecycle rules suit predictable ageing.</p>`,
    code: PY(`CLASSES = [("STANDARD", 200, 0, 0), ("NEARLINE", 100, 100, 30),
           ("COLDLINE", 40, 200, 90), ("ARCHIVE", 12, 500, 365)]

def cheapest_class(gb, retrieved_gb_per_month, days_kept):
    best_name, best_cost = None, None
    for name, store, retr, min_days in CLASSES:
        cost = gb * store * max(days_kept, min_days) + retrieved_gb_per_month * days_kept * retr
        if best_cost is None or cost < best_cost:     # strict: ties keep the hotter class
            best_name, best_cost = name, cost
    return best_name`),
    cx: `<p>O(1): only four classes are evaluated.</p>`, f: ['When would Autoclass be cheaper than any fixed class?', 'Add per-operation (Class A/B) charges.'],
    tests: { sig: 'int int int -> string', fn: 'cheapest_class', cases: [
      [[1000, 0, 365], 'ARCHIVE'], [[1000, 1000, 30], 'STANDARD'], [[1000, 0, 10], 'STANDARD'], [[1000, 100, 90], 'COLDLINE'],
      [[0, 0, 100], 'STANDARD'], [[1000, 10, 400], 'ARCHIVE'], [[100, 0, 60], 'COLDLINE'], [[1000, 200, 45], 'NEARLINE']
    ] }
  }));
  practice.push(P({
    t: 'Shared VPC with Terraform: host project, service project, subnet-level access', l: 'Medium', tags: ['Shared VPC', 'Terraform', 'IAM'], co: ['Google', 'HSBC'],
    s: `<p>Write Terraform (HCL) that makes <code>net-host-prod</code> a Shared VPC host, attaches <code>shop-prod-7f3a</code> as a service project, and grants <code>roles/compute.networkUser</code> on <b>only</b> the subnet <code>app-ew1</code> to the app team group and to the service project's Google APIs service agent and GKE service agent, so the team can run VMs and a GKE cluster in that subnet. Also grant the GKE agent <code>roles/container.hostServiceAgentUser</code> on the host project.</p>`,
    ex: `<p>After apply, a developer in <code>group:shop-devs@example.com</code> can create a VM in <code>shop-prod-7f3a</code> on subnet <code>app-ew1</code> but gets <code>PERMISSION_DENIED</code> on any other subnet of the host network.</p>`,
    bw: `<p>Granting <code>networkUser</code> at the <b>host project</b> level lets every service project use every subnet, including other teams' and the database subnets.</p>`,
    q: ['Where should roles/compute.networkUser be granted for least privilege in Shared VPC?', ['On specific subnets of the host project', 'On the whole organization', 'On the service project only', 'Nowhere: service projects inherit it'], 0, 'Subnet-level grants limit each team to its own subnets.'],
    h: ['Hint 1: resources google_compute_shared_vpc_host_project and google_compute_shared_vpc_service_project.', 'Hint 2: subnet IAM is google_compute_subnetwork_iam_member with region and subnetwork.', 'Hint 3: service agents are service-NUMBER@container-engine-robot.iam.gserviceaccount.com and NUMBER@cloudservices.gserviceaccount.com; read NUMBER with data google_project.'],
    a: `<p>Enable the host, attach the service project (with a dependency on the host), look up the service project number, and add subnet-scoped IAM members for the human group and the two service agents, plus the host-level GKE agent role that lets GKE manage firewall rules and routes in the host network.</p>`,
    code: HCL(C`data "google_project" "svc" {
  project_id = "shop-prod-7f3a"
}

resource "google_compute_shared_vpc_host_project" "host" {
  project = "net-host-prod"
}

resource "google_compute_shared_vpc_service_project" "shop" {
  host_project    = google_compute_shared_vpc_host_project.host.project
  service_project = data.google_project.svc.project_id
}

locals {
  subnet_users = [
    "group:shop-devs@example.com",
    "serviceAccount:@{data.google_project.svc.number}@cloudservices.gserviceaccount.com",
    "serviceAccount:service-@{data.google_project.svc.number}@container-engine-robot.iam.gserviceaccount.com",
  ]
}

resource "google_compute_subnetwork_iam_member" "app_ew1" {
  for_each   = toset(local.subnet_users)
  project    = "net-host-prod"
  region     = "europe-west1"
  subnetwork = "app-ew1"
  role       = "roles/compute.networkUser"
  member     = each.value
}

resource "google_project_iam_member" "gke_host_agent" {
  project = "net-host-prod"
  role    = "roles/container.hostServiceAgentUser"
  member  = "serviceAccount:service-@{data.google_project.svc.number}@container-engine-robot.iam.gserviceaccount.com"
}`),
    cx: `<p>A handful of resources; no runtime cost by itself (Shared VPC is free; traffic and resources are billed normally).</p>`,
    f: ['How do you let Cloud Run in the service project use Direct VPC egress into this subnet?', 'Which team owns firewall rules in this model and how do app teams request changes?']
  }));
  practice.push(P({
    t: 'Keyless deploys from GitHub Actions to Cloud Run', l: 'Medium', tags: ['Workload Identity Federation', 'CI/CD', 'Cloud Run'], co: ['Google', 'GitHub'],
    s: `<p>Write a GitHub Actions workflow (YAML) that, on push to <code>main</code> of <code>acme/shop</code>, authenticates to GCP with <b>Workload Identity Federation</b> (no JSON key), builds and pushes an image to Artifact Registry, and deploys it to Cloud Run <code>api</code> in <code>europe-west1</code>. Assume the pool <code>github</code>, provider <code>shop-repo</code> (with attribute condition on the repository) and deploy service account <code>deployer@shop-prod-7f3a.iam.gserviceaccount.com</code> already exist.</p>`,
    ex: `<p>A push to main produces image <code>europe-west1-docker.pkg.dev/shop-prod-7f3a/apps/api:&lt;sha&gt;</code> and a new Cloud Run revision. A fork's pull request cannot authenticate because its token's <code>repository</code> or <code>ref</code> claims do not match the provider's condition.</p>`,
    bw: `<p>Storing a service account key in a GitHub secret: it never expires, it is copied into logs and forks by mistake, and anyone who reads it can act as the deployer from anywhere.</p>`,
    q: ['Which GitHub workflow permission is required for Workload Identity Federation?', ['id-token: write', 'contents: write', 'packages: write', 'actions: read'], 0, 'The job needs to request an OIDC token from GitHub, which requires id-token: write.'],
    h: ['Hint 1: the job needs permissions id-token: write and contents: read.', 'Hint 2: google-github-actions/auth takes workload_identity_provider and service_account.', 'Hint 3: then gcloud auth configure-docker for the Artifact Registry host, docker build/push, gcloud run deploy with the sha tag.'],
    a: `<p>The workflow requests a GitHub OIDC token, exchanges it through the provider for a short-lived Google token impersonating the deployer, then uses normal <code>gcloud</code> and <code>docker</code> commands. The deployer needs <code>roles/run.developer</code>, <code>roles/artifactregistry.writer</code> and <code>roles/iam.serviceAccountUser</code> on the runtime service account only.</p>`,
    code: YM(C`name: deploy-api
on:
  push:
    branches: [main]
permissions:
  contents: read
  id-token: write          # lets the job request a GitHub OIDC token
jobs:
  deploy:
    runs-on: ubuntu-latest
    env:
      IMAGE: europe-west1-docker.pkg.dev/shop-prod-7f3a/apps/api:@{{ github.sha }}
    steps:
      - uses: actions/checkout@v4
      - id: auth
        uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: projects/987654321098/locations/global/workloadIdentityPools/github/providers/shop-repo
          service_account: deployer@shop-prod-7f3a.iam.gserviceaccount.com
      - uses: google-github-actions/setup-gcloud@v2
      - name: Build and push
        run: |
          gcloud auth configure-docker europe-west1-docker.pkg.dev --quiet
          docker build -t "$IMAGE" .
          docker push "$IMAGE"
      - name: Deploy
        run: |
          gcloud run deploy api --image="$IMAGE" --region=europe-west1 \
            --service-account=api-runtime@shop-prod-7f3a.iam.gserviceaccount.com --quiet`, '.github/workflows/deploy-api.yml'),
    cx: `<p>One build per push; tokens live about an hour and are never stored.</p>`,
    f: ['Restrict the provider to ref == refs/heads/main as well as the repository.', 'How would the same pattern deploy to AWS (OIDC role) from the same workflow?']
  }));
  practice.push(P({
    t: 'Global load balancer spillover across regions', l: 'Medium', tags: ['load balancing', 'global LB', 'capacity'], co: ['Google', 'Riot Games'], lang: 'python',
    s: `<p>A global external Application Load Balancer sends a client's traffic to the <b>closest healthy backend with capacity</b> and spills the excess to the next closest. Write <code>spill(rps, backends)</code>. <code>backends</code> are ordered from closest to farthest as <code>"REGION MAX_RPS SCALER_PCT HEALTHY"</code> (HEALTHY is 1 or 0). Effective capacity = MAX_RPS × SCALER_PCT // 100. Return <code>["REGION:N", ...]</code> for regions that receive traffic, in order, plus <code>"dropped:N"</code> at the end if traffic remains.</p>`,
    ex: `<p><code>spill(1500, ["europe-west1 1000 100 1", "us-east1 1000 100 1"])</code> &rarr; <span class="c-g">["europe-west1:1000", "us-east1:500"]</span>.<br>With europe-west1 unhealthy &rarr; <span class="c-y">["us-east1:1000", "dropped:500"]</span>.</p>`,
    bw: `<p>Assuming traffic is split evenly across regions (round robin) misses the "closest first, then overflow" behaviour that drives latency and regional sizing.</p>`,
    q: ['You set capacity scaler to 0 on the europe-west1 backend. What happens?', ['That backend gets no new traffic; it drains to the next closest region', 'All traffic is dropped', 'Health checks fail', 'Nothing until DNS TTL expires'], 0, 'Capacity scaler 0 is the standard way to drain a region for maintenance; the IP stays the same.'],
    h: ['Hint 1: walk backends in order with a remaining counter.', 'Hint 2: skip unhealthy ones and those with zero effective capacity.', 'Hint 3: append dropped only if remaining &gt; 0 at the end.'],
    a: `<p>Greedy fill in proximity order: give each healthy backend min(remaining, effective capacity). This mirrors the "waterfall by region" behaviour of Google's global load balancers with balancing mode RATE and capacity scalers.</p>`,
    code: PY(`def spill(rps, backends):
    out, left = [], rps
    for b in backends:
        region, max_rps, scaler, healthy = b.split()
        cap = int(max_rps) * int(scaler) // 100
        if healthy != "1" or cap <= 0 or left <= 0:
            continue
        take = min(left, cap)
        out.append(region + ":" + str(take))
        left -= take
    if left > 0:
        out.append("dropped:" + str(left))
    return out`),
    cx: `<p>O(n) for n backends.</p>`, f: ['Model many client regions, each with its own proximity order, sharing backends.'],
    tests: { sig: 'int string[] -> string[]', fn: 'spill', cases: [
      [[1500, ['europe-west1 1000 100 1', 'us-east1 1000 100 1']], ['europe-west1:1000', 'us-east1:500']],
      [[1500, ['europe-west1 1000 100 0', 'us-east1 1000 100 1']], ['us-east1:1000', 'dropped:500']],
      [[800, ['a 1000 50 1', 'b 1000 100 1']], ['a:500', 'b:300']],
      [[100, ['a 1000 0 1', 'b 50 100 1']], ['b:50', 'dropped:50']],
      [[0, ['a 10 100 1']], []],
      [[10, []], ['dropped:10']],
      [[300, ['a 100 100 1', 'b 100 100 1', 'c 100 100 1']], ['a:100', 'b:100', 'c:100']]
    ] }
  }));

  // ───────────────────────── Practice: Hard ─────────────────────────
  practice.push(P({
    t: 'Find shadowed firewall rules', l: 'Hard', tags: ['firewall', 'audit', 'priority'], co: ['Google', 'Cloudflare'], lang: 'python',
    s: `<p>A rule is <b>shadowed</b> when another rule always decides first for every packet it could match, so it can never take effect. Rules are <code>"NAME PRIORITY ACTION PROTO PORT TARGET"</code> (PROTO may be <code>all</code>, PORT <code>*</code>, TARGET <code>*</code>). Rule S <b>covers</b> rule R if S's proto is <code>all</code> or equals R's, S's port is <code>*</code> or equals R's, and S's target is <code>*</code> or equals R's. R is shadowed if some other S covers it and either S has a <b>lower priority number</b>, or the <b>same priority</b> with S a deny and R an allow. Write <code>shadowed(rules)</code> returning shadowed names in input order.</p>`,
    ex: `<p><code>["deny-all 100 deny all * *", "web 1000 allow tcp 443 web"]</code> &rarr; <span class="c-r">["web"]</span>.<br><code>["a 1000 allow tcp 443 web", "b 1000 deny tcp 443 *"]</code> &rarr; <span class="c-r">["a"]</span>: same priority, deny wins.</p>`,
    bw: `<p>Flagging any rule that overlaps a higher-priority rule reports false positives: a narrow rule that only partly overlaps (different port) still matters.</p>`,
    q: ['Rule A: priority 500 allow tcp:* to tag web. Rule B: priority 1000 deny tcp:22 to tag web. Is B shadowed?', ['Yes: A matches every packet B could and decides first', 'No: deny always wins', 'No: B is more specific', 'Only for UDP'], 0, 'GCP has no specificity rule; A covers B and has the lower number, so B never decides.'],
    h: ['Hint 1: write a covers(S, R) helper with the three wildcard checks.', 'Hint 2: for each R, check every other S for the priority conditions.', 'Hint 3: note that covers is about S being at least as broad; a narrower S never shadows a broader R.'],
    a: `<p>Parse the rules, then for each pair (S, R) with S ≠ R check coverage and precedence. O(n²) is fine for real rule sets (hundreds). Firewall Insights reports exactly this class of finding, plus rules with no hits.</p>`,
    code: PY(`def shadowed(rules):
    parsed = []
    for line in rules:
        n, pri, act, proto, port, tgt = line.split()
        parsed.append((n, int(pri), act, proto, port, tgt))

    def covers(s, r):
        return (s[3] == "all" or s[3] == r[3]) and (s[4] == "*" or s[4] == r[4]) and (s[5] == "*" or s[5] == r[5])

    out = []
    for i, r in enumerate(parsed):
        for j, s in enumerate(parsed):
            if i == j or not covers(s, r):
                continue
            if s[1] < r[1] or (s[1] == r[1] and s[2] == "deny" and r[2] == "allow"):
                out.append(r[0])
                break
    return out`),
    cx: `<p>O(n²) time, O(n) space.</p>`, f: ['Handle port ranges like 8000-8100 and source ranges.', 'A rule can be shadowed by a combination of several rules; how would you detect that?'],
    tests: { sig: 'string[] -> string[]', fn: 'shadowed', cases: [
      [[['deny-all 100 deny all * *', 'web 1000 allow tcp 443 web']], ['web']],
      [[['a 1000 allow tcp 443 web', 'b 1000 deny tcp 443 *']], ['a']],
      [[['a 500 allow tcp 443 web', 'b 1000 deny tcp 22 web']], []],
      [[['a 500 allow tcp * web', 'b 1000 deny tcp 22 web']], ['b']],
      [[['a 1000 allow tcp 443 *', 'b 1000 allow tcp 443 *']], []],
      [[[]], []],
      [[['n 900 allow tcp 80 web', 'w 100 allow tcp 80 *', 'x 50 deny udp * *']], ['n']]
    ] }
  }));
  practice.push(P({
    t: 'IAM with groups, inheritance and deny exceptions', l: 'Hard', tags: ['IAM', 'deny policies', 'groups'], co: ['Google', 'Okta'], lang: 'python',
    s: `<p>Write <code>has_permission(path, roles, groups, policies, member, perm)</code>.</p><ul>
      <li><code>path</code>: nodes from organization down to the resource.</li>
      <li><code>roles</code>: <code>"ROLE perm1,perm2"</code>.</li>
      <li><code>groups</code>: <code>"GROUP MEMBER"</code> pairs (direct membership only).</li>
      <li><code>policies</code>: <code>"allow NODE PRINCIPAL ROLE"</code> or <code>"deny NODE PRINCIPAL PERM EXCEPTIONS"</code> where EXCEPTIONS is a comma list of principals or <code>-</code>.</li></ul>
      <p>A principal matches the member if it equals the member or is a group containing it. Only policies on nodes in <code>path</code> apply. Return <code>false</code> if any applicable deny names <code>perm</code>, matches the member, and the member is not matched by any exception; otherwise <code>true</code> if any applicable allow grants a role containing <code>perm</code> to a matching principal; else <code>false</code>.</p>`,
    ex: `<p>Group <code>group:devs</code> has <code>user:ana</code>; allow on <code>folders/prod</code> gives <code>roles/storage.admin</code> (includes <code>storage.buckets.delete</code>); deny on <code>org</code> for <code>group:devs storage.buckets.delete group:breakglass</code>. Ana &rarr; <span class="c-r">false</span>; if Ana is also in <code>group:breakglass</code> &rarr; <span class="c-g">true</span>.</p>`,
    bw: `<p>Checking only direct user bindings misses group grants (most real access), and ignoring exception principals makes break-glass access impossible to model.</p>`,
    q: ['A deny policy denies storage.buckets.delete to all principals except group:breakglass. Ana is in breakglass but has no allow role with that permission. Can she delete buckets?', ['No: an exception only removes the deny; she still needs an allow', 'Yes: the exception grants it', 'Yes, deny policies imply allow for exceptions', 'Only in the org node'], 0, 'Deny exceptions do not grant anything; normal allow evaluation still applies.'],
    h: ['Hint 1: build the set of principals that represent the member: itself plus its groups.', 'Hint 2: build role → permission sets; process denies first.', 'Hint 3: an exception list of "-" means no exceptions; the member is excepted if any exception principal is in its principal set.'],
    a: `<p>Compute the member's principal set once. Scan deny policies on the path: if the permission matches, a principal matches and no exception matches, return false. Then scan allows on the path for a matching principal whose role contains the permission. Exceptions only exempt from the deny; they never grant.</p>`,
    code: PY(`def has_permission(path, roles, groups, policies, member, perm):
    on_path = set(path)
    who = {member} | {g.split()[0] for g in groups if g.split()[1] == member}
    role_perms = {}
    for r in roles:
        name, _, perms = r.partition(" ")
        role_perms[name] = set(p for p in perms.split(",") if p)
    parsed = [p.split() for p in policies]
    for p in parsed:                                    # deny policies first
        if p[0] == "deny" and p[1] in on_path and p[2] in who and p[3] == perm:
            exceptions = set() if p[4] == "-" else set(p[4].split(","))
            if not (exceptions & who):
                return False
    for p in parsed:                                    # then the union of allows
        if p[0] == "allow" and p[1] in on_path and p[2] in who and perm in role_perms.get(p[3], set()):
            return True
    return False`),
    cx: `<p>O(G + R + P) for groups, role permissions and policies.</p>`, f: ['Support nested groups (transitive membership).', 'Add IAM Conditions such as a resource name prefix on bindings.'],
    tests: { sig: 'string[] string[] string[] string[] string string -> bool', fn: 'has_permission', cases: [
      [[['org', 'folders/prod', 'projects/shop'], ['roles/storage.admin storage.buckets.delete,storage.objects.get'], ['group:devs user:ana'], ['allow folders/prod group:devs roles/storage.admin', 'deny org group:devs storage.buckets.delete group:breakglass'], 'user:ana', 'storage.buckets.delete'], false],
      [[['org', 'folders/prod', 'projects/shop'], ['roles/storage.admin storage.buckets.delete,storage.objects.get'], ['group:devs user:ana', 'group:breakglass user:ana'], ['allow folders/prod group:devs roles/storage.admin', 'deny org group:devs storage.buckets.delete group:breakglass'], 'user:ana', 'storage.buckets.delete'], true],
      [[['org', 'folders/prod', 'projects/shop'], ['roles/storage.admin storage.buckets.delete,storage.objects.get'], ['group:devs user:ana'], ['allow folders/prod group:devs roles/storage.admin', 'deny org group:devs storage.buckets.delete group:breakglass'], 'user:ana', 'storage.objects.get'], true],
      [[['org', 'projects/shop'], ['roles/viewer storage.objects.get'], [], ['allow folders/dev user:bo roles/viewer'], 'user:bo', 'storage.objects.get'], false],
      [[['org'], ['r a'], [], ['deny org user:x a -', 'allow org user:x r'], 'user:x', 'a'], false],
      [[['org'], ['r a'], ['group:g user:x'], ['deny org user:y a -', 'allow org group:g r'], 'user:x', 'a'], true],
      [[['org'], [], [], [], 'user:x', 'a'], false]
    ] }
  }));
  practice.push(P({
    t: 'Allocate non-overlapping regional subnets', l: 'Hard', tags: ['VPC', 'IP planning', 'CIDR'], co: ['Google', 'Netflix'], lang: 'python',
    s: `<p>A global VPC gets a new subnet per region from one aggregate block. Write <code>allocate(base, prefixes, used)</code>: for each prefix length in order, return the <b>lowest aligned</b> CIDR inside <code>base</code> that overlaps nothing in <code>used</code> and nothing allocated earlier, or <code>""</code> if none fits (or the prefix is shorter than the base prefix or longer than 32). Use only the standard library.</p>`,
    ex: `<p><code>allocate("10.10.0.0/16", [20, 24, 20], ["10.10.0.0/24"])</code> &rarr; <span class="c-g">["10.10.16.0/20", "10.10.1.0/24", "10.10.32.0/20"]</span>: the first /20 cannot start at 10.10.0.0 because a used /24 sits there.</p>`,
    bw: `<p>Enumerating every possible subnet of a /8 at /29 is two million candidates per request. Jumping past each blocking range to the next aligned boundary skips whole blocks.</p>`,
    q: ['Where can a /20 start?', ['On a multiple of 4096 addresses (third octet a multiple of 16)', 'Anywhere', 'Only at x.x.0.0', 'On a multiple of 256'], 0, 'A /20 has 4096 addresses, so it must be aligned to 4096: 10.10.0.0, 10.10.16.0, 10.10.32.0 ...'],
    h: ['Hint 1: work with integers: int(network_address) and broadcast_address.', 'Hint 2: candidate starts are multiples of the block size; on a collision, jump to the first aligned start after the blocking range ends.', 'Hint 3: append each allocation to the used list so later requests avoid it.'],
    a: `<p>Keep a list of taken networks. For each prefix, start at the base address and test the candidate block against all taken ranges; on a hit, jump to the next aligned boundary after the hit's end; stop when the block leaves the base. This is first-fit with alignment, exactly how IPAM tools allocate.</p>`,
    code: PY(`import ipaddress

def allocate(base, prefixes, used):
    b = ipaddress.ip_network(base, strict=False)
    lo, hi = int(b.network_address), int(b.broadcast_address)
    taken = [ipaddress.ip_network(u, strict=False) for u in used]
    out = []
    for p in prefixes:
        if p < b.prefixlen or p > 32:
            out.append("")
            continue
        size = 1 << (32 - p)
        cur, found = lo, ""
        while cur + size - 1 <= hi:
            hit = None
            for t in taken:
                if int(t.network_address) <= cur + size - 1 and cur <= int(t.broadcast_address):
                    hit = t
                    break
            if hit is None:
                net = ipaddress.ip_network((cur, p))
                taken.append(net)
                found = str(net)
                break
            nxt = int(hit.broadcast_address) + 1
            cur = (nxt + size - 1) // size * size        # next aligned start after the blocker
        out.append(found)
    return out`),
    cx: `<p>O(k × u) per request in the worst case, where k is the number of jumps and u the taken ranges; far below brute-force enumeration.</p>`, f: ['Return the largest free block remaining.', 'Allocate GKE secondary ranges for pods (/14) and services (/20) per region as well.'],
    tests: { sig: 'string int[] string[] -> string[]', fn: 'allocate', cases: [
      [['10.10.0.0/16', [20, 24, 20], ['10.10.0.0/24']], ['10.10.16.0/20', '10.10.1.0/24', '10.10.32.0/20']],
      [['10.0.0.0/24', [25, 25, 25], []], ['10.0.0.0/25', '10.0.0.128/25', '']],
      [['10.0.0.0/16', [8, 33], []], ['', '']],
      [['10.0.0.0/22', [24, 23], ['10.0.1.0/24']], ['10.0.0.0/24', '10.0.2.0/23']],
      [['10.0.0.0/8', [29], ['10.0.0.0/9']], ['10.128.0.0/29']],
      [['10.0.0.0/24', [24], ['10.0.0.128/32']], ['']],
      [['10.0.0.0/16', [], []], []]
    ] }
  }));
  practice.push(P({
    t: 'Design: a tested exit plan from GCP to AWS without static keys', l: 'Hard', tags: ['multi-cloud', 'DR', 'exit strategy', 'federation'], co: ['Google', 'Revolut'],
    s: `<p>A regulated company runs on GCP (Cloud Run + Cloud SQL PostgreSQL + Cloud Storage). The regulator requires a credible exit plan: a copy of data outside GCP no older than 24 hours, infrastructure code to stand the service up on AWS, and a yearly drill. Design it and write the nightly export job (bash) that runs as a Cloud Run job, exports the database, and copies the dump to S3 <b>without any stored AWS key</b>.</p>`,
    ex: `<p>Nightly at 02:30 the job writes <code>orders-2026-10-28.sql.gz</code> to <code>gs://shop-exports</code> and <code>s3://shop-exit-copies</code>. The yearly drill restores it to RDS PostgreSQL with the AWS Terraform stack in under 4 hours.</p>`,
    bw: `<p>Active-active across both clouds "to satisfy the regulator" doubles cost and complexity; an AWS access key in Secret Manager for the copy job is a long-lived credential that can leak.</p>`,
    q: ['How can a GCP workload write to S3 without an AWS access key?', ['Get a Google-signed ID token and call AssumeRoleWithWebIdentity on an AWS role that trusts accounts.google.com', 'Use an HMAC key', 'Make the bucket public', 'Use the GCP service account key in AWS'], 0, 'AWS trusts Google as an OIDC provider; the role trust policy pins the service account unique id as the audience.'],
    h: ['Hint 1: separate the plan: data copies, infrastructure code, runbooks, drills, and who decides to trigger the exit.', 'Hint 2: the Cloud Run job reads an ID token from the metadata server with audience sts.amazonaws.com.', 'Hint 3: the AWS role trust policy uses Federated accounts.google.com and a condition on accounts.google.com:aud (or :sub) equal to the service account unique id.'],
    a: `<p><b>Plan.</b> (1) Data: nightly logical export (<code>gcloud sql export sql</code>) plus Cloud Storage objects synced, copied to an S3 bucket in a separate AWS account with Object Lock (compliance mode, 35 days). (2) Identity: the Cloud Run job's service account gets a Google ID token; an AWS IAM role trusts <code>accounts.google.com</code> with the audience pinned to that service account's unique id and only <code>s3:PutObject</code> on the bucket. (3) Infrastructure: Terraform modules with the same interface for GCP and AWS (network, Postgres, container service); the AWS stack is planned in CI monthly so it does not rot. (4) Runbook and yearly drill: restore into RDS, run smoke tests, measure RTO, record evidence for the regulator. (5) Cost: one nightly dump's egress and S3 storage, not a second live environment.</p>`,
    code: SH(C`#!/usr/bin/env bash
# Runs as a Cloud Run job with service account exporter@shop-prod-7f3a.iam.gserviceaccount.com
# (roles: cloudsql.viewer to start exports, storage.objectAdmin on gs://shop-exports; the Cloud SQL
#  instance's own service agent needs objectCreator on the bucket to write the export).
set -euo pipefail
DAY=$(date -u +%F)
OBJ="orders-$DAY.sql.gz"
ROLE_ARN="arn:aws:iam::111122223333:role/gcp-exit-copy"

# 1) Export the database to Cloud Storage (gzip because of the .gz suffix)
gcloud sql export sql orders-db "gs://shop-exports/$OBJ" --database=orders --offload

# 2) Get a Google-signed ID token for AWS STS from the metadata server (no key on disk)
TOKEN=$(curl -sf -H "Metadata-Flavor: Google" \
  "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity?audience=sts.amazonaws.com&format=full")

# 3) Exchange it for short-lived AWS credentials (role trusts accounts.google.com, aud pinned)
CREDS=$(aws sts assume-role-with-web-identity --role-arn "$ROLE_ARN" \
  --role-session-name "exit-copy-$DAY" --web-identity-token "$TOKEN" --duration-seconds 3600 \
  --query 'Credentials.[AccessKeyId,SecretAccessKey,SessionToken]' --output text)
read -r AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_SESSION_TOKEN <<< "$CREDS"
export AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_SESSION_TOKEN

# 4) Stream the dump from GCS to S3 (Object Lock retention is set as the bucket default)
gcloud storage cat "gs://shop-exports/$OBJ" | aws s3 cp - "s3://shop-exit-copies/$OBJ" --expected-size 50000000000
echo "copied $OBJ to S3"`),
    alt: [JS(`{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "Federated": "accounts.google.com" },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": { "accounts.google.com:aud": "112233445566778899001" }
      }
    }
  ]
}`, 'AWS role trust policy (aud = the service account unique id)')],
    cx: `<p>Daily: one export (minutes to hours by size), one egress of the dump; storage in S3 under Object Lock. Drill: yearly, a few hours.</p>`,
    f: ['How would you prove to an auditor that the copy is never older than 24 hours? (Alert on object age.)', 'What changes if RPO must be 15 minutes? (Logical replication or CDC to the other cloud.)']
  }));

  // ───────────────────────── Quiz ─────────────────────────
  quiz.push({ q: 'Coming from AWS, what is the closest GCP equivalent of an AWS account?', options: ['A project', 'A folder', 'A billing account', 'A VPC'], answer: 0, explain: 'Projects are the unit that holds resources, APIs, quotas and IAM; folders group them like OUs, and billing accounts are separate objects linked to projects.' });
  quiz.push({ q: 'A group has roles/compute.admin on the prod folder. The project owner removes the group from the project\'s allow policy. Can the group still delete VMs in that project?', options: ['Yes: allow policies are inherited as a union from the folder', 'No: the project policy overrides the folder', 'Only on weekends', 'No: removal at the project creates a deny'], answer: 0, explain: 'Lower levels can add access, not remove inherited access. Use a deny policy or change the folder binding.' });
  quiz.push({ q: 'Which tool stops anyone in a folder from creating VMs with external IPs, regardless of their IAM roles?', options: ['An organization policy constraint', 'A custom IAM role', 'A firewall rule', 'A VPC Service Controls perimeter'], answer: 0, explain: 'Organization policies restrict how resources may be configured (constraints/compute.vmExternalIpAccess); IAM decides who may act.' });
  quiz.push({ q: 'A CI pipeline in GitHub Actions needs to deploy to GCP. What is the recommended credential?', options: ['Workload Identity Federation with GitHub OIDC tokens', 'A service account JSON key in a repository secret', 'A user account password', 'The default compute service account key'], answer: 0, explain: 'Federation exchanges short-lived OIDC tokens for short-lived Google tokens; there is no long-lived secret to leak.' });
  quiz.push({ q: 'Two VMs are in the same custom VPC, one in europe-west1 and one in asia-northeast1. What is needed for them to talk over private IPs?', options: ['Only firewall rules allowing the traffic; the VPC is global', 'VPC peering between the regions', 'A Cloud VPN tunnel', 'A Transit Gateway equivalent'], answer: 0, explain: 'A GCP VPC spans all regions; subnet routes exist automatically. Firewall rules still apply.' });
  quiz.push({ q: 'Ingress rules: priority 1000 allow tcp:443 to all instances, priority 900 deny all from 0.0.0.0/0. A client on the internet sends tcp:443. Result?', options: ['Denied: priority 900 is evaluated first', 'Allowed: the allow is more specific', 'Allowed: allow rules always win', 'Depends on creation order'], answer: 0, explain: 'Lower priority numbers are evaluated first; the first match decides.' });
  quiz.push({ q: 'What are the implied firewall rules in every VPC?', options: ['Deny all ingress and allow all egress, both at priority 65535', 'Allow all ingress and egress', 'Deny all ingress and egress', 'Allow SSH and ICMP from anywhere'], answer: 0, explain: 'The default network adds extra allow rules (SSH, RDP, ICMP, internal), but those are ordinary rules, not implied ones.' });
  quiz.push({ q: 'Why prefer --target-service-accounts over network tags in firewall rules?', options: ['Changing a VM\'s service account needs IAM rights, so the rule cannot be bypassed by editing tags', 'Tags are deprecated', 'Service accounts are faster', 'Tags only work for egress'], answer: 0, explain: 'Anyone who can edit instance metadata can add a tag; service-account targeting ties network access to identity.' });
  quiz.push({ q: 'What makes Cloud NAT different from an AWS NAT Gateway?', options: ['It is a distributed, software-defined service configured on a Cloud Router, with no gateway instance in the data path', 'It supports inbound connections', 'It is global rather than regional', 'It requires a NAT VM'], answer: 0, explain: 'Cloud NAT is regional and outbound-only; translation is done by the network fabric, so it is not a bottleneck box.' });
  quiz.push({ q: 'A Cloud Run service has concurrency 80. At 800 requests per second with 250 ms latency, about how many instances does it need (ignoring headroom)?', options: ['3', '200', '10', '800'], answer: 0, explain: 'In-flight = 800 × 0.25 = 200; 200 / 80 = 2.5 → 3 instances.' });
  quiz.push({ q: 'What do you pay for in GKE Autopilot (besides the cluster fee)?', options: ['The CPU, memory and ephemeral storage your pods request', 'The nodes you choose', 'Only network egress', 'A flat fee per pod'], answer: 0, explain: 'Autopilot manages nodes and bills by pod resource requests; Standard bills the nodes.' });
  quiz.push({ q: 'A dashboard query adds LIMIT 10 to a SELECT * over a 5 TB BigQuery table. How many bytes are billed on-demand?', options: ['About 5 TB: LIMIT does not reduce bytes scanned', '10 rows worth', 'Nothing: results under 1 MB are free', 'Half'], answer: 0, explain: 'On-demand bills bytes read; reduce columns and use partition filters instead.' });
  quiz.push({ q: 'You need a relational database with strongly consistent writes in several regions and 99.999% availability. Which GCP service fits?', options: ['Spanner (multi-region configuration)', 'Cloud SQL with read replicas', 'BigQuery', 'Firestore in Datastore mode'], answer: 0, explain: 'Spanner provides external consistency across regions; Cloud SQL has one primary and asynchronous replicas.' });
  quiz.push({ q: 'An AWS team uses SNS with one SQS queue per consumer. What is the Pub/Sub design?', options: ['One topic with one subscription per consumer', 'One topic per consumer', 'One subscription shared by all consumers', 'Cloud Scheduler'], answer: 0, explain: 'Every subscription receives every message and is consumed independently; consumers sharing one subscription split the messages.' });
  quiz.push({ q: 'Half of a chatty app moves to another cloud. What usually becomes the largest new cost?', options: ['Data transfer (egress) on every cross-cloud call', 'DNS queries', 'IAM API calls', 'Terraform state storage'], answer: 0, explain: 'Each GB crossing clouds is billed as egress; chatty service-to-service traffic can exceed compute savings.' });
  quiz.push({ q: 'Which statement about Terraform and multi-cloud portability is correct?', options: ['Terraform gives one workflow, but resources are provider-specific; portability needs per-cloud modules behind a shared interface', 'The same resource blocks deploy to any cloud', 'Terraform converts AWS resources to GCP automatically', 'Terraform cannot manage GCP'], answer: 0, explain: 'google_compute_network and aws_vpc are different resources with different semantics; modules provide the common interface.' });

  // ───────────────────────── Interview ─────────────────────────
  interview.push({ q: 'Explain the GCP resource hierarchy and how it compares with AWS and Azure.', level: 'B', a: `<p>GCP has an <b>organization</b> node (tied to a Cloud Identity / Workspace domain), <b>folders</b> (nestable, up to 10 levels) and <b>projects</b>, and resources live in projects. Billing accounts are linked to projects. IAM allow policies and organization policies can be attached at each level and are inherited downward. AWS uses Organizations with OUs and <b>accounts</b> (account ≈ project, OU ≈ folder, SCP ≈ org policy). Azure uses management groups, <b>subscriptions</b> and resource groups (subscription ≈ project for billing and limits, resource group is a lifecycle grouping inside it). Practical design: folders per environment or business unit, one project per app per environment, shared projects for networking, logging and security.</p>`, followUps: ['Where do you put the Shared VPC host project?', 'How many projects per team is too many, and how do you automate project creation (project factory)?'] });
  interview.push({ q: 'How does IAM evaluation work in GCP, and how is it different from AWS?', level: 'I', a: `<p>In GCP a principal gets <b>roles</b> via bindings in <b>allow policies</b> on a resource and its ancestors; the effective allow is the <b>union</b> over the hierarchy, and lower levels cannot take inherited access away. Before allows, <b>deny policies</b> on ancestors are checked (they name permissions and can have exception principals), and <b>Principal Access Boundary</b> policies can limit which resources a principal may touch. IAM Conditions add CEL constraints to individual bindings. In AWS, identity policies, resource policies, permission boundaries, session policies and SCPs are combined; an explicit Deny in any of them wins, and there is no inheritance across a resource tree. Debug with Policy Troubleshooter and Policy Analyzer in GCP, IAM policy simulator / Access Analyzer in AWS.</p>`, followUps: ['How would you implement "nobody may delete prod buckets except break-glass" on GCP?', 'What is the 1,500 principal limit and how do groups help?'] });
  interview.push({ q: 'What are service accounts, and how do you avoid service account keys?', level: 'I', a: `<p>A service account is a non-human identity (an email) that workloads run as; it is also a resource with its own IAM (who may impersonate it). Workloads on GCP get tokens from the metadata server for the attached service account, so they never need keys: VMs, Cloud Run, Cloud Run functions, GKE via <b>Workload Identity Federation for GKE</b>. External workloads use <b>Workload Identity Federation</b> pools and providers (OIDC from GitHub/GitLab/Kubernetes, AWS, Azure, SAML) and exchange their own token for a short-lived Google token. I enforce <code>iam.disableServiceAccountKeyCreation</code>, avoid default service accounts with Editor, give one service account per workload with narrow roles, and treat <code>serviceAccountUser</code>/<code>serviceAccountTokenCreator</code> grants as privileged because they allow impersonation.</p>`, followUps: ['How would you find and retire existing keys safely?', 'What attribute conditions would you put on a GitHub provider?'] });
  interview.push({ q: 'Explain GCP VPC networking to someone who knows AWS VPCs.', level: 'B', a: `<p>A GCP VPC is a <b>global</b> resource with no CIDR of its own; <b>subnets</b> are regional, each with its own ranges, and they span all zones of the region. So one VPC can have subnets in Europe, the US and Asia that reach each other privately with no peering or transit gateway. Firewall rules belong to the VPC, are stateful, have <b>priorities</b> (lower number first, deny wins ties), support deny actions and target VMs by tag or service account; there are implied deny-ingress / allow-egress rules. There is no internet gateway object (a default route exists) and outbound for private VMs goes through <b>Cloud NAT</b>. Shared VPC lets one host project share subnets with many service projects. Pitfalls: auto-mode networks, overlapping ranges with other clouds, and cross-region traffic being charged even though it needs no peering.</p>`, followUps: ['When would you still use multiple VPCs?', 'How does VPC peering differ from Network Connectivity Center?'] });
  interview.push({ q: 'A firewall rule you added has no effect. How do you debug it?', level: 'I', a: `<p>I check the effective rules on the target VM: <code>gcloud compute instances network-interfaces get-effective-firewalls</code>, which includes hierarchical and network firewall policies, not just VPC rules. I look for a matching rule with a <b>lower priority number</b> (evaluated first) or an equal-priority <b>deny</b>; a hierarchical policy at org or folder level can deny before VPC rules are consulted. I confirm the target (tag or service account actually on the VM), direction, protocol/port and source ranges (for load balancer health checks: <code>35.191.0.0/16</code> and <code>130.211.0.0/22</code>). Then I run a <b>Connectivity Test</b> to simulate the packet and enable firewall rules logging on the suspected rule. Firewall Insights shows shadowed rules and hit counts.</p>`, followUps: ['What does goto_next do in a hierarchical policy?', 'How would you prevent this class of issue in CI?'] });
  interview.push({ q: 'Describe the GCP load balancer options and when to use each.', level: 'I', a: `<p>For HTTP(S) to users worldwide, the <b>global external Application Load Balancer</b>: one anycast IP, TLS at Google's edge, URL maps for host/path routing and traffic splitting, backends in many regions (MIGs, GKE NEGs, serverless NEGs for Cloud Run), Cloud CDN and Cloud Armor; it routes to the closest healthy backend with capacity and spills over. <b>Regional external/internal Application LBs</b> keep traffic in one region (data residency, internal microservices). <b>Proxy Network LB</b> for TCP/SSL proxying globally or regionally. <b>Passthrough Network LB</b> (external or internal) for Layer 4 with client IP preserved and UDP, and as the next hop for firewall appliances. AWS mapping: CloudFront + ALB / Global Accelerator, ALB, NLB; Azure: Front Door, Application Gateway, Load Balancer.</p>`, followUps: ['How do you drain a region for maintenance? (capacity scaler)', 'Premium vs Standard network tier: what changes?'] });
  interview.push({ q: 'Cloud Run, GKE or Compute Engine: how do you choose?', level: 'I', a: `<p>I start from the workload. Stateless HTTP/gRPC or event-driven containers with variable traffic: <b>Cloud Run</b> (scale to zero, per-request billing, many concurrent requests per instance, revisions and traffic splitting, jobs for batch). Many services that need Kubernetes features (operators, stateful sets, custom networking, GPUs with scheduling control, portability with EKS/AKS): <b>GKE</b>, Autopilot by default (pay per pod request, managed nodes) and Standard when I need node control, DaemonSets or dense bin-packing. Legacy or licensed software, special OS needs, very steady high utilisation: <b>Compute Engine MIGs</b> with CUDs or Spot. Team skills matter: a small team should not run Kubernetes to host three APIs. Cloud Run functions for small event glue.</p>`, followUps: ['What breaks when a Lambda function is moved to Cloud Run with concurrency 80?', 'How does Autopilot billing change how you set resource requests?'] });
  interview.push({ q: 'Compare Cloud SQL, AlloyDB, Spanner, Firestore and BigQuery.', level: 'I', a: `<p><b>Cloud SQL</b>: managed MySQL/PostgreSQL/SQL Server, one primary, regional HA with a synchronous standby, read replicas: the default for typical apps (≈ RDS). <b>AlloyDB</b>: PostgreSQL-compatible, higher throughput, columnar engine for analytics on operational data (≈ Aurora). <b>Spanner</b>: horizontally scalable relational with external consistency and multi-region writes, 99.999% SLA in multi-region configs; you pay in processing units and must design keys to avoid hotspots. <b>Firestore</b>: serverless document database with real-time listeners for mobile/web (≈ DynamoDB/Cosmos DB documents). <b>BigQuery</b>: serverless analytics warehouse billed on bytes scanned or slots; not for OLTP. I choose by consistency, scale, query shape and team skills, and move up to Spanner only when one primary is not enough.</p>`, followUps: ['How would you avoid hotspots in Spanner primary keys?', 'How do you keep BigQuery costs predictable?'] });
  interview.push({ q: 'How does Pub/Sub delivery work and how do you make consumers reliable?', level: 'I', a: `<p>Publishers send to a <b>topic</b>; each <b>subscription</b> gets a copy of every message (filters optional). Pull subscribers receive messages and must <b>ack</b> within the ack deadline (default 10 s, up to 600 s, extended automatically by client libraries); unacked messages are redelivered, so delivery is <b>at-least-once</b> by default. Reliability: idempotent handlers (dedupe by message id or a business key), a <b>dead-letter topic</b> with max delivery attempts (5–100) and an alert on it, retry policy with exponential backoff, ordering keys if per-entity order matters (at a throughput cost), and exactly-once delivery on pull subscriptions when duplicates are expensive. Push subscriptions call an HTTPS endpoint such as Cloud Run with an OIDC token. Retention of unacked messages defaults to 7 days on the subscription.</p>`, followUps: ['How would you replay messages from yesterday? (seek to a timestamp or snapshot)', 'When would you use Cloud Tasks instead of Pub/Sub?'] });
  interview.push({ q: 'Map a typical AWS web architecture to GCP and Azure, and name the differences that matter.', level: 'A', a: `<p>AWS: Route 53 → CloudFront → ALB → ECS/EKS or Lambda → RDS Multi-AZ, ElastiCache, SQS/SNS, S3, Secrets Manager, CloudWatch. GCP: Cloud DNS → global external Application Load Balancer with Cloud CDN and Cloud Armor → Cloud Run or GKE → Cloud SQL HA, Memorystore, Pub/Sub, Cloud Storage, Secret Manager, Cloud Monitoring/Logging. Azure: Azure DNS → Front Door → Container Apps or AKS → Azure Database for PostgreSQL flexible server with zone-redundant HA, Azure Cache for Redis, Service Bus, Blob, Key Vault, Azure Monitor. Differences that matter: GCP's global VPC and global anycast LB (one IP, no DNS failover), IAM inheritance models, per-request concurrency on Cloud Run vs Lambda, storage cold-tier retrieval semantics, and different egress and inter-zone pricing.</p>`, followUps: ['Which of these would you not translate one-to-one?', 'How do you handle identity between the clouds during migration?'] });
  interview.push({ q: 'When is a multi-cloud strategy worth it, and when is it not?', level: 'A', a: `<p>Worth it when it buys something concrete: a capability not available elsewhere (BigQuery, TPUs, a model only on one platform, a sovereign region), a customer or regulator requirement (an exit plan under DORA, data residency), an acquisition that already runs elsewhere, or negotiating leverage at very large spend. Not worth it as an abstract "avoid lock-in" goal for one product: you double skills, on-call, security baselines and IAM models, end up on the lowest common denominator, and pay egress on every cross-cloud call. For availability, multi-region on one cloud usually gives most of the benefit with far less complexity. My default: one primary cloud per workload, best-of-breed for clearly separated workloads, portable artifacts (containers, Terraform modules, open data formats), and a documented, tested exit plan.</p>`, followUps: ['How would you quantify lock-in risk?', 'What does a credible exit plan contain?'] });
  interview.push({ q: 'How do Terraform and Kubernetes help portability, and where do they stop helping?', level: 'A', a: `<p><b>Terraform</b> standardises the workflow (plan, review, apply, state, policy checks) and the language across clouds, but resources are provider-specific, so portability comes from <b>modules with a shared interface</b> (inputs/outputs) and one implementation per cloud, with separate state per cloud. <b>Kubernetes</b> standardises the runtime API: the same Deployments, Services, HPA, Gateway API and Helm charts run on GKE, EKS and AKS. It stops helping at the edges: workload identity (WIF for GKE vs IRSA/Pod Identity vs Entra Workload ID), load balancer and storage class annotations, node images, and above all the <b>managed data services</b> the pods call. Data gravity, not compute, is the real lock-in; I keep data in open formats and make migration of data the first thing I test.</p>`, followUps: ['How would you structure a repo of Kustomize overlays per cloud?', 'What about managed databases: PostgreSQL-compatible everywhere vs Spanner/DynamoDB?'] });
  interview.push({ q: 'Design secure, private connectivity between a GCP environment and an AWS environment.', level: 'E', a: `<p>First an <b>IP plan</b> with non-overlapping aggregates per cloud and region, checked in CI. Connectivity by volume: <b>HA VPN</b> (GCP HA VPN gateway with two interfaces to two AWS VPN connections = four tunnels, BGP via Cloud Router, 99.99% SLA on the GCP side) for up to a few Gbps; <b>Cross-Cloud Interconnect</b> (dedicated 10/100 Gbps links between Google and AWS) when traffic is large and steady. On GCP, global dynamic routing so all regions learn AWS routes; on AWS, a Transit Gateway attachment. Firewall rules / security groups allow only required ports between known service accounts or tags and CIDRs. Prefer <b>Private Service Connect</b> or service-specific endpoints over flat network trust, and use mTLS between services. Identity is keyless both ways (WIF and AssumeRoleWithWebIdentity). Observe with flow logs on both sides and alert on tunnel or BGP state; size and budget for inter-cloud egress.</p>`, followUps: ['How do you fail over if one tunnel or one Interconnect link fails?', 'How would you avoid making the two clouds one big flat network?'] });

  // Rotate the options so the correct answer is not always first (answers are written first for clarity).
  function rot(q, i) { var n = q.options.length, k = (i * 3 + 1) % n; q.options = q.options.slice(k).concat(q.options.slice(0, k)); q.answer = (q.answer - k + n) % n; }
  quiz.forEach(rot);
  practice.forEach(function (p, i) { rot(p.mcq, i + 1); });
  topics.forEach(function (t, i) { (t.problems || []).forEach(function (p) { rot(p.mcq, i + 2); }); });

  registerModule({
    id: 'devops19',
    title: 'Multi-Cloud & Google Cloud (GCP)',
    intro: `<p>Many engineers learn one cloud, usually AWS, and then meet the second one through a new job, an acquisition or an analytics team that insists on BigQuery. This module teaches <b>Google Cloud for AWS and Azure engineers</b>: the resource hierarchy and inherited IAM, service accounts and keyless federation, the <b>global VPC</b> with prioritised firewall rules, Cloud NAT and global anycast load balancers, Compute Engine, GKE, Cloud Run and Cloud Run functions, and the data services (Cloud Storage, Cloud SQL, Spanner, BigQuery, Pub/Sub). Then it steps back to <b>multi-cloud</b>: mapping services across AWS, Azure and GCP, the differences that cause incidents, when a multi-cloud or hybrid strategy pays for itself, and how far Terraform and Kubernetes really take portability. Every topic has a runnable model (IAM evaluator, firewall matcher, CIDR overlap checker, Cloud Run scaling, BigQuery cost, service mapping, cost comparison) you can poke at.</p>`,
    goals: [
      'Design a GCP <b>organization, folder and project</b> layout and explain how <b>allow policies inherit</b>, how <b>deny policies</b> and <b>organization policies</b> differ, and evaluate access by hand',
      'Use <b>service accounts</b> and <b>Workload Identity Federation</b> (GitHub, GKE, AWS) so no workload holds a static key',
      'Build a <b>custom-mode global VPC</b> with regional subnets, prioritised <b>firewall rules</b>, Cloud NAT, IAP SSH and Shared VPC, and plan <b>non-overlapping IP ranges</b> across clouds',
      'Choose between <b>Compute Engine, GKE Standard/Autopilot, Cloud Run and Cloud Run functions</b>, and size Cloud Run with concurrency and Little\'s law',
      'Pick and cost <b>Cloud Storage classes, Cloud SQL, Spanner, BigQuery and Pub/Sub</b>, including BigQuery bytes-scanned pricing',
      'Map services across <b>AWS, Azure and GCP</b>, judge when <b>multi-cloud or hybrid</b> is worth it, and structure <b>Terraform modules and Kubernetes overlays</b> for real portability'
    ],
    prereqs: `<p><b>Required:</b> <b>Identity &amp; Networks</b> (DevOps 6): IAM roles and policies, VPCs, CIDR, route tables, NAT and security groups on AWS, which this module translates to GCP. <b>Managed Cloud Services</b> (DevOps 12): RDS, load balancers, autoscaling, Lambda and queues, so we can focus on how Google's versions differ. Terraform basics (DevOps 9) and Kubernetes (DevOps 13–14) help with the portability topic, and <b>Advanced Cloud Architecture</b> (DevOps 17) covers multi-region and DR on one cloud, which this module builds on rather than repeats.</p>`,
    langExplain: `<p>Commands are <b>bash</b> with the <code>gcloud</code>, <code>bq</code> and <code>aws</code> CLIs (syntax-checked), manifests and workflows are <b>YAML</b> (parsed), and policy documents are <b>JSON</b> (parsed). <b>Terraform</b> is shown as HCL with <code>check: false</code> because the site has no HCL checker (same convention as DevOps 9); run <code>terraform validate</code> on it in your lab. The decision rules (IAM evaluation, firewall priority, CIDR overlap and allocation, Cloud Run sizing, BigQuery cost, storage class choice, service mapping, cost comparison) are small <b>Python</b> standard-library functions with tests. Cloud procedures are verified by reading and by running them in a sandbox project.</p>`,
    hours: 14,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
