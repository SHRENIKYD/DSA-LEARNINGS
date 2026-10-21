(function () {
  var topics = [], practice = [], quiz = [], interview = [];
  var R = String.raw; // raw template: backslashes in shell code stay exactly as typed
  // Lab conditions shown on every problem unless a problem gives its own.
  var LAB = '<p>Use a <b>sandbox AWS account</b> (never production) with an admin role reached through IAM Identity Center (<code>aws sso login --profile lab</code>). Account id <code>123456789012</code>, region <code>us-east-1</code> and every ARN shown are examples. IAM itself is free; VPCs, subnets, route tables, security groups and NACLs are free. <b>NAT gateways and public IPv4 addresses are billed per hour</b>, so delete them when you finish.</p>';
  var LABIAM = '<p>Sandbox account <code>123456789012</code> (example id). IAM users, groups, roles and policies cost nothing. Never paste real access keys into a ticket, chat, script or AI tool.</p>';
  var PYC = '<p>Python 3 standard library only. Inputs are valid strings in the format shown. This models the real AWS rule closely enough to reason with; real IAM has more condition operators and policy types.</p>';
  var SKIP = { skip: 'cloud procedure, verified by reading' };
  // Compact problem builder. Code is bash unless o.lang says otherwise (json for policies, python for evaluators).
  function P(o) {
    var lang = o.lang || 'bash';
    var p = {
      title: o.t, level: o.l, tags: o.tags, companies: o.co,
      statement: o.s, constraints: o.c || LAB, example: o.ex,
      brute: { why: o.bw },
      mcq: { q: o.q[0], options: o.q[1], answer: o.q[2], explain: o.q[3] },
      hints: o.h,
      solution: { approach: o.a, code: { lang: lang, code: o.code }, complexity: o.cx, followUps: o.f },
      tests: o.tests || SKIP
    };
    if (o.alt) p.solution.alt = o.alt;
    if (o.bc) p.brute.code = { lang: o.blang || lang, code: o.bc };
    return p;
  }
  function box(id, label, x, y, w) { return { id: id, label: label, x: x, y: y, shape: 'box', w: w || 18 }; }
  function one(k, v) { var h = {}; h[k] = v; return h; }
  // Tiny IPv4 helpers for the visualizers (unsigned 32-bit maths with >>> 0).
  function ip2n(s) {
    var m = String(s).trim().match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (!m) throw new Error('Not an IPv4 address: "' + s + '" (use dotted form like 10.0.1.25)');
    var o = m.slice(1).map(Number);
    if (o.some(function (x) { return x > 255; })) throw new Error('Each octet must be 0-255: "' + s + '"');
    return (((o[0] << 24) >>> 0) + (o[1] << 16) + (o[2] << 8) + o[3]) >>> 0;
  }
  function n2ip(n) { n = n >>> 0; return [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.'); }
  function maskOf(p) { return p === 0 ? 0 : (0xFFFFFFFF << (32 - p)) >>> 0; }
  function cidr(s) {
    var m = String(s).trim().match(/^([\d.]+)\/(\d{1,2})$/);
    if (!m || Number(m[2]) > 32) throw new Error('Use CIDR like 10.0.0.0/16 (got "' + s + '")');
    var p = Number(m[2]), ip = ip2n(m[1]), mk = maskOf(p);
    var net = (ip & mk) >>> 0, size = Math.pow(2, 32 - p);
    return { ip: ip, p: p, mask: mk, net: net, bc: (net + size - 1) >>> 0, size: size, text: n2ip(net) + '/' + p };
  }
  function inNet(ipn, c) { return ((ipn & c.mask) >>> 0) === c.net; }
  // IAM-style wildcard: * = any run of characters, ? = exactly one. ci = case-insensitive (actions are, ARNs are not).
  function wild(pattern, value, ci) {
    var re = '^' + String(pattern).split('').map(function (ch) {
      if (ch === '*') return '.*';
      if (ch === '?') return '.';
      return ch.replace(/[.*+?^$()|[\]\\{}\/-]/g, '\\$&');
    }).join('') + '$';
    return new RegExp(re, ci ? 'i' : '').test(String(value));
  }

  // ───────────────────────── Topic 1: IAM identities ─────────────────────────
  topics.push({
    title: 'IAM Identities: Root, Users, Groups, Roles and IAM Identity Center',
    analogy: `<p>Think of an AWS account as an <b>office building</b>. The <b>root user</b> is the building's master key: it opens every door, including the one that sells the building. You lock it in a safe and almost never touch it. <b>Staff badges</b> are what people use every day. A badge does not open doors by itself: the door list attached to your <b>team</b> (a group) decides which rooms you may enter. <b>Visitor passes</b> are roles: you borrow one at the front desk, it works for a few hours, then it expires on its own. A delivery robot (a server or a pipeline) gets a visitor pass too, never a staff badge with a password.</p>`,
    explain: `<p>🟢 <b>IAM = Identity and Access Management.</b> It answers two questions for every single API call in AWS: <b>who are you?</b> (authentication) and <b>are you allowed to do this?</b> (authorisation). The "who" is called a <b>principal</b>. There are only a few kinds:</p>
      ${H.table(['Identity', 'What it is', 'Credentials', 'Use it for'], [
        ['<b>Root user</b>', 'the email address that created the account; can do everything, and some things only it can do', 'password + MFA', 'almost nothing: billing setup, closing the account, a few account settings. Lock it with MFA and no access keys'],
        ['<b>IAM user</b>', 'a long-lived identity inside one account', 'password and/or <b>access keys</b> that never expire on their own', 'legacy tools that cannot use roles; break-glass. Avoid for people'],
        ['<b>IAM group</b>', 'a bag of IAM users; policies attached to the group apply to every member', 'none (a group cannot log in)', 'giving the same permissions to many users'],
        ['<b>IAM role</b>', 'an identity with permissions but <b>no</b> password or keys of its own; someone "assumes" it', '<b>temporary</b> credentials from STS, valid 15 min to 12 h', 'servers, Lambda, pipelines, other accounts, and people via SSO'],
        ['<b>IAM Identity Center</b> user (SSO)', 'a person in a central directory (or your company IdP: Entra ID, Okta, Google)', 'SSO login + MFA, then temporary role credentials', '<b>every human</b>, across all accounts']
      ])}
      <p>🟢 <b>The modern rule of thumb (2026):</b> humans log in through <b>IAM Identity Center</b> (formerly AWS SSO) and get short-lived credentials; machines use <b>roles</b>; IAM users with access keys are the exception you must justify. Long-lived keys leak (laptops, Git repos, CI logs), short-lived credentials expire before most attackers can use them.</p>
      <p>🔵 <b>Who am I right now?</b> The first command in any IAM ticket is <code>aws sts get-caller-identity</code>. It cannot be denied and prints the account, the principal ARN and a user id. An ARN (Amazon Resource Name) is the full address of any AWS thing: <code>arn:aws:iam::123456789012:user/alice</code>, <code>arn:aws:iam::123456789012:role/app-role</code>, or for an assumed role session <code>arn:aws:sts::123456789012:assumed-role/app-role/i-0abc123</code>. Half of all "AccessDenied" tickets end here: the caller is not who they think (wrong profile, wrong account, an old environment variable).</p>
      <p>🔵 <b>MFA</b> (multi-factor authentication) adds "something you have" (a passkey, security key or authenticator app) to "something you know". AWS now <b>requires MFA for root users</b> in most account types, and you should require it for every human. Phishing-resistant options (FIDO2 passkeys and security keys) beat one-time codes.</p>
      <h4>Same idea on other clouds</h4>
      ${H.table(['AWS', 'Azure', 'Google Cloud'], [
        ['Root user', 'the tenant Global Administrator (Entra ID)', 'Super Admin of the Cloud Identity / Workspace org'],
        ['IAM user', 'Entra ID user (cloud-only account)', 'Google account / Cloud Identity user'],
        ['IAM group', 'Entra ID group', 'Google group'],
        ['IAM role for a service', '<b>Managed identity</b> (system- or user-assigned)', '<b>Service account</b> attached to the VM / function'],
        ['IAM Identity Center + permission sets', 'Entra ID sign-in + Azure RBAC role assignments (and PIM for just-in-time admin)', 'Cloud Identity / Workforce Identity Federation + IAM role bindings'],
        ['Access keys', 'client secrets on an app registration (avoid)', 'service account keys (avoid; org policy can block them)']
      ])}`,
    clues: [
      '"which user / which account am I?" or a surprising AccessDenied → run <code>aws sts get-caller-identity</code> first',
      '"the team shares the root login" → stop: MFA on root, no root access keys, Identity Center users for people',
      '"give 20 developers the same access" → a group (or an Identity Center group with a permission set), never 20 copies of a policy',
      '"the EC2 instance / Lambda / pipeline needs AWS access" → a role, not an IAM user with keys',
      '"contractor from another company needs access" → a cross-account role or an Identity Center user, time-boxed, with MFA',
      '"Entra ID / managed identity / service account" in an Azure or GCP question → map them straight to users, roles and machine identities'
    ],
    code: [R`# Lab: sandbox account, profile 'lab' set up with: aws configure sso
# 1. Log in through IAM Identity Center: opens the browser, MFA, then short-lived credentials
aws sso login --profile lab

# 2. Who am I? (never denied; the first command in every IAM ticket)
aws sts get-caller-identity --profile lab
# {
#   "UserId": "AROAEXAMPLEID:alice@example.com",
#   "Account": "123456789012",
#   "Arn": "arn:aws:sts::123456789012:assumed-role/AWSReservedSSO_AdministratorAccess_abc123/alice@example.com"
# }

# 3. Account hygiene: is MFA on for root, and does root have access keys? (want 1 and 0)
aws iam get-account-summary --profile lab \
  --query 'SummaryMap.[AccountMFAEnabled, AccountAccessKeysPresent]' --output text

# 4. Groups for IAM users (only where you really need IAM users)
aws iam create-group --group-name ReadOnlyAuditors --profile lab
aws iam attach-group-policy --group-name ReadOnlyAuditors \
  --policy-arn arn:aws:iam::aws:policy/ReadOnlyAccess --profile lab

# 5. Credential report: every IAM user, password age, MFA, key age and last use (CSV)
aws iam generate-credential-report --profile lab
aws iam get-credential-report --profile lab --query Content --output text | base64 -d | cut -d, -f1,4,8,9,10,11 | column -t -s,`],
    codeTitle: ['Log in with SSO, check who you are, and audit the account'],
    viz: [{
      title: 'Pick the right identity for each person and machine',
      input: 'alice:human, bob:admin, web-server:ec2, nightly-report:lambda, deploy-pipeline:ci, audit-vendor:vendor',
      inputLabel: 'comma list of name:kind (kind = human, admin, ec2, lambda, ci, vendor)',
      gen: function (input) {
        var MAP = {
          human: ['Identity Center user in group <b>Developers</b>', 'permission set <code>DeveloperAccess</code> (8 h sessions)', 'SSO login + MFA, temporary credentials', 'ok'],
          admin: ['Identity Center user in group <b>Admins</b>', 'permission set <code>AdministratorAccess</code>, short sessions (1-2 h)', 'phishing-resistant MFA (passkey / security key)', 'cur'],
          ec2: ['IAM <b>role</b> in an instance profile', 'only the S3 / SSM / logs actions the app needs', 'temporary keys from instance metadata (IMDSv2), rotated automatically', 'ok'],
          lambda: ['Lambda <b>execution role</b>', 'logs:* on its own log group + the one table or bucket it touches', 'temporary keys injected by Lambda', 'ok'],
          ci: ['IAM <b>role</b> trusted via OIDC federation (e.g. GitHub Actions)', 'deploy actions only, limited to one repo and branch', 'no stored secret at all: a signed token is exchanged for 1 h credentials', 'ok'],
          vendor: ['<b>cross-account role</b> with an ExternalId', 'read-only on what they audit', 'their own account assumes it; you can revoke by editing the trust policy', 'win']
        };
        var items = String(input || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
        if (!items.length) throw new Error('Give a list like alice:human, web-server:ec2');
        if (items.length > 10) throw new Error('Up to 10 entries, please');
        var parsed = items.map(function (it) {
          var m = it.match(/^([A-Za-z0-9._-]{1,30}):(\w+)$/);
          if (!m || !MAP[m[2].toLowerCase()]) throw new Error('Each entry is name:kind with kind = human, admin, ec2, lambda, ci or vendor (got "' + it + '")');
          return { name: m[1], kind: m[2].toLowerCase() };
        });
        var rows = [], f = [];
        f.push({ narr: 'Start with the account itself. The <b>root user</b> gets MFA and <b>no access keys</b>, and goes in the safe. Nobody on this list will use it. Now we decide, one by one, how each person or machine proves who it is.', parts: [
          { type: 'table', label: 'account baseline', columns: ['identity', 'setting'], rows: [['root user', 'MFA on, no access keys, used only for root-only tasks'], ['IAM Identity Center', 'enabled; MFA required for every sign-in'], ['CloudTrail', 'on in every region, so every API call is recorded']], hl: { 0: 'sel' } }
        ] });
        parsed.forEach(function (p, k) {
          var d = MAP[p.kind];
          rows.push([H.esc(p.name), p.kind, d[0], d[2]]);
          var hl = {}; hl[k] = d[3];
          var why = {
            human: 'A person: give them a single sign-on login in IAM Identity Center and put them in a group. The group is assigned a permission set (a template that becomes a role in each account). No IAM user, no keys on the laptop.',
            admin: 'An admin is still a person, so the same SSO path, but a more powerful permission set with shorter sessions and the strongest MFA. Admin rights are borrowed for an hour, not carried around.',
            ec2: 'A server is not a person and cannot type an MFA code. It gets a <b>role</b> through an instance profile. The SDK on the box fetches temporary credentials from the instance metadata service and refreshes them before they expire.',
            lambda: 'A function gets an <b>execution role</b>. Lambda assumes it for you on every cold start; your code never sees a long-lived secret.',
            ci: 'A pipeline used to store an IAM user\'s access keys as a CI secret: the most common leak. Today the CI system presents a signed OIDC token, and a role whose trust policy names that repo exchanges it for short-lived credentials.',
            vendor: 'Another company should never get a user in your account. They assume a <b>cross-account role</b>; the ExternalId stops a "confused deputy" (someone else tricking the vendor into using your role).'
          }[p.kind];
          f.push({ narr: '<b>' + H.esc(p.name) + '</b> (' + p.kind + '): ' + why, parts: [
            { type: 'table', label: 'identity plan so far', columns: ['who', 'kind', 'identity', 'credentials'], rows: rows.slice(), hl: hl },
            { type: 'vars', label: 'permissions for ' + H.esc(p.name), vals: { 'what they get': d[1].replace(/<[^>]+>/g, '') } }
          ] });
        });
        f.push({ narr: 'How these identities look in <b>CloudTrail</b>, the audit log of every API call. Each one is a role session with a readable name, so "who did this?" has an answer.', parts: [
          { type: 'table', label: 'userIdentity.arn in CloudTrail', columns: ['who', 'appears as'], rows: parsed.map(function (p) { return [H.esc(p.name), p.kind === 'human' || p.kind === 'admin' ? 'arn:aws:sts::123456789012:assumed-role/AWSReservedSSO_.../' + H.esc(p.name) + '@example.com' : 'arn:aws:sts::123456789012:assumed-role/' + H.esc(p.name) + '-role/SESSION']; }) }
        ] });
        var keys = 0;
        f.push({ narr: 'Count the long-lived access keys in this plan: <b>' + keys + '</b>. Every identity either logs in with SSO + MFA or receives credentials that expire within hours. That is the target state an auditor (and a security interviewer) wants to hear.', parts: [
          { type: 'table', label: 'final plan', columns: ['who', 'kind', 'identity', 'credentials'], rows: rows.slice() },
          { type: 'vars', label: 'scorecard', vals: { 'root used daily': 'no', 'IAM users with keys': keys, 'humans without MFA': 0, 'identities with temporary credentials': rows.length } }
        ] });
        return f;
      }
    }],
    examples: [
      { title: 'Ticket: "I am admin but I get AccessDenied"', html: `<p>A developer swears they have admin rights. <code>aws sts get-caller-identity</code> shows <code>arn:aws:iam::123456789012:user/old-ci-user</code>: an old <code>AWS_ACCESS_KEY_ID</code> environment variable in their shell overrides the SSO profile. The CLI looks for credentials in a fixed order: command-line options, <b>environment variables</b>, then the config and credentials files (profiles, including SSO), then container or instance roles. Unset the variables, use <code>--profile</code>, and the "missing permission" disappears. Also deactivate that old key.</p>`, code: R`aws sts get-caller-identity                 # who does the CLI think I am?
env | grep -E '^AWS_' | cut -d= -f1         # print variable NAMES only, never their values
unset AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_SESSION_TOKEN
aws sts get-caller-identity --profile dev   # now the SSO role` },
      { title: 'The shared root password', html: `<p>A startup shares the root email and password in a chat channel. Risks: anyone who leaves still has full control, nothing is attributable in CloudTrail (every action is "root"), and there may be no MFA. Fix in this order: reset the root password, enable MFA (a hardware key kept in a safe, plus a second registered device), delete any root access keys, enable IAM Identity Center with one user per person, and set up an alternate security contact. Then watch CloudTrail for <code>"userIdentity.type": "Root"</code> events and alert on them.</p>`, code: R`# alert-worthy: any API call made by root in the last day
aws cloudtrail lookup-events --max-results 50 \
  --lookup-attributes AttributeKey=Username,AttributeValue=root \
  --query 'Events[].[EventTime,EventName,EventSource]' --output table` },
      { title: 'Users and groups vs Identity Center', html: `<p>A company has 3 AWS accounts (dev, staging, prod) and 40 engineers. With IAM users that is up to 120 users, 120 passwords and maybe 120 sets of access keys to rotate. With IAM Identity Center it is 40 people in a directory (often synced from Entra ID or Okta), 3 groups, a few permission sets, and assignments like "Developers → DeveloperAccess in dev and staging, ReadOnly in prod". When someone leaves, disabling one directory account removes access everywhere.</p>`, code: { lang: 'text', code: `~/.aws/config (no secrets in this file, only pointers)

[profile dev]
sso_session = corp
sso_account_id = 123456789012
sso_role_name = DeveloperAccess
region = us-east-1

[sso-session corp]
sso_start_url = https://example.awsapps.com/start
sso_region = us-east-1
sso_registration_scopes = sso:account:access` } },
      { title: 'Reading an ARN', html: `<p>ARNs follow <code>arn:partition:service:region:account-id:resource</code>. IAM is global, so the region part is empty: <code>arn:aws:iam::123456789012:role/app-role</code>. S3 bucket ARNs have no region or account: <code>arn:aws:s3:::reports-bucket</code> (the bucket) and <code>arn:aws:s3:::reports-bucket/*</code> (the objects inside it). An assumed-role session shows up as <code>arn:aws:sts::123456789012:assumed-role/app-role/SESSION-NAME</code>, and the session name is your best clue to who or what is behind it.</p>` }
    ],
    deepDive: `<p>🟣 <b>Authentication under the hood.</b> Every AWS API request is signed with <b>Signature Version 4</b>: the SDK hashes the request and signs it with the secret key (it never sends the secret). AWS recomputes the signature with its copy. Temporary credentials add a third part, the <b>session token</b>, and carry an expiry. That is why a leaked secret key alone is dangerous for years, while a leaked session expires in hours.</p>
      <p><b>Root-only tasks</b> include changing the account's root email or support plan, closing the account, restoring IAM admin access if every admin is locked out, and some billing settings. In an <b>AWS Organization</b> you can now centrally manage member accounts' root access: delete their root credentials entirely and perform the few privileged root tasks from the management account for a short session.</p>
      <p><b>Quotas worth knowing:</b> a user can be in up to 10 groups; groups cannot contain groups; an IAM user or role can have up to 10 managed policies attached by default (raisable). Group membership is not a principal: you cannot name a group in a resource-based policy or trust policy.</p>
      <p><b>Permission sets</b> in Identity Center are templates. When you assign one to a group in an account, Identity Center creates a role named <code>AWSReservedSSO_SetName_hash</code> in that account, with a trust policy for the Identity Center SAML provider. Do not edit those roles by hand; edit the permission set and re-provision.</p>
      <p><b>Machine identities outside AWS</b> (an on-prem server, another cloud) should use <b>IAM Roles Anywhere</b> (X.509 certificates exchanged for temporary credentials) or OIDC federation, not stored keys.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> assistants and coding agents now call cloud APIs themselves. That makes identity even more important: an AI agent should get its <b>own role</b> with narrow permissions and short sessions, so its actions show up in CloudTrail under a clear session name (for example <code>assumed-role/agent-readonly/ticket-4711</code>) and a mistake cannot delete production.</p>
      <p><b>Use AI well:</b> ask it to explain a confusing ARN, write the <code>~/.aws/config</code> for SSO profiles, or summarise a credential report ("which users have keys older than 90 days?"). <b>Never</b> paste real access keys, session tokens or a full credential report with real user names into a chat. AI tools also love to suggest "create an IAM user with AdministratorAccess and put the keys in .env": recognise that as a 2015 answer and ask for the role-based version.</p>`,
    problems: [P({
      t: 'Onboard a five-person team without root or access keys', l: 'Easy', tags: ['iam', 'identity center', 'sso', 'mfa'], co: ['AWS', 'Accenture', 'Deloitte'], c: LABIAM,
      s: `<p>A new data team (5 people) joins. Today everyone logs in with the <b>shared root password</b>. Your manager asks you to fix it: each person gets their own login with MFA, they can use most services in the dev account <code>123456789012</code> but cannot manage IAM, and nobody needs access keys on their laptop. Describe the setup and give the commands.</p>`,
      ex: `<p>After the change, Alice runs <code>aws sso login --profile data-dev</code>, approves MFA in the browser, and <code>aws sts get-caller-identity</code> shows ${H.c('g', 'assumed-role/AWSReservedSSO_DataPowerUser_.../alice@example.com')}, not ${H.c('r', 'root')}.</p>`,
      bw: `<p>Creating five IAM users with <code>AdministratorAccess</code> and emailing each person an access key. It "works", but you now have five long-lived secrets on five laptops, full IAM rights (anyone can make themselves a new admin), and five passwords to rotate in every account the team will ever need.</p>`,
      q: ['What should the team use to log in day to day?', ['IAM Identity Center users in a group, with a permission set assigned to the account', 'One shared IAM user with MFA', 'The root user with a stronger password', 'IAM users with access keys stored in a password manager'], 0, 'Identity Center gives each person their own identity and MFA, and hands out temporary credentials through a permission set. No keys live on laptops, and offboarding is one click.'],
      h: ['<p>Hint 1: there are two jobs: lock down root, then give people their own identities.</p>', '<p>Hint 2: in Identity Center you create users and a group, a permission set (for example <code>PowerUserAccess</code>, which excludes IAM), and an account assignment linking group + permission set + account.</p>', '<p>Hint 3: recipe: root MFA + delete root keys → enable Identity Center with MFA → group <code>DataTeam</code> → permission set → assignment → each person runs <code>aws configure sso</code> once.</p>'],
      a: `<p><b>1. Lock the root user.</b> Change the shared password, register MFA (a security key kept safely, plus a backup), confirm <code>AccountAccessKeysPresent</code> is 0, and stop using it. <b>2. Enable IAM Identity Center</b> (organisation instance) and require MFA at sign-in. <b>3. Create a group</b> <code>DataTeam</code> and the five users, and add them to it (or sync them from the company IdP so HR-driven offboarding works). <b>4. Create a permission set</b> <code>DataPowerUser</code> with the AWS managed policy <code>PowerUserAccess</code>: it allows almost everything except IAM and Organizations management, so nobody can grant themselves more. Session duration 8 hours. <b>5. Assign</b> group + permission set to account <code>123456789012</code>. Identity Center creates the matching role in the account. <b>6. Each person</b> runs <code>aws configure sso</code> once and <code>aws sso login</code> daily; credentials are temporary and live in the CLI's cache. <b>7. Verify</b> with <code>get-caller-identity</code> and later tighten <code>PowerUserAccess</code> into a custom least-privilege set based on what they really use (next topic).</p>`,
      code: R`# Run as an admin in the management (or delegated admin) account
INST=$(aws sso-admin list-instances --query 'Instances[0].InstanceArn' --output text)
IDS=$(aws sso-admin list-instances --query 'Instances[0].IdentityStoreId' --output text)

# Group + one user (repeat create-user / create-group-membership for each person)
GID=$(aws identitystore create-group --identity-store-id "$IDS" \
  --display-name DataTeam --query GroupId --output text)
USR=$(aws identitystore create-user --identity-store-id "$IDS" --user-name alice \
  --display-name "Alice Example" --name GivenName=Alice,FamilyName=Example \
  --emails Value=alice@example.com,Type=work,Primary=true --query UserId --output text)
aws identitystore create-group-membership --identity-store-id "$IDS" \
  --group-id "$GID" --member-id UserId="$USR"

# Permission set: PowerUserAccess (no IAM / Organizations), 8-hour sessions
PS=$(aws sso-admin create-permission-set --instance-arn "$INST" --name DataPowerUser \
  --session-duration PT8H --query PermissionSet.PermissionSetArn --output text)
aws sso-admin attach-managed-policy-to-permission-set --instance-arn "$INST" \
  --permission-set-arn "$PS" --managed-policy-arn arn:aws:iam::aws:policy/PowerUserAccess

# Assign group + permission set to the dev account (example id)
aws sso-admin create-account-assignment --instance-arn "$INST" \
  --target-id 123456789012 --target-type AWS_ACCOUNT \
  --permission-set-arn "$PS" --principal-type GROUP --principal-id "$GID"

# Each team member, once:  aws configure sso   then daily:  aws sso login --profile data-dev`,
      cx: `<p>About 30 minutes of setup. Offboarding drops from "find every IAM user in every account" to "disable one directory user".</p>`,
      f: ['How would you give the team read-only access to prod as well?', 'What would you do if one person cannot use a phone or security key for MFA?']
    })]
  });

  // ───────────────────────── Topic 2: policies and evaluation logic ─────────────────────────
  topics.push({
    title: 'IAM Policies: Effect, Action, Resource, Condition and Who Wins',
    analogy: `<p>A policy is a <b>guest list at a club door</b>. Each line says: <i>"Let in (Effect) people who want to go to the bar or the dance floor (Action) of this club (Resource), but only before midnight (Condition)."</i> The bouncer starts from <b>no</b>: if your name is on no list, you stay out (implicit deny). If any list says "let in", you can go in. But if <b>any</b> list says "never let this person in", that line beats every invitation (explicit deny wins). The club owner can also put up a notice on the door itself ("staff from the partner club may enter"): that is a resource-based policy.</p>`,
    explain: `<p>🟢 <b>A policy is a JSON document</b> with a <code>Version</code> (always <code>"2012-10-17"</code>, the language version, not a date you change) and one or more <b>statements</b>. Each statement has four main parts:</p>
      ${H.table(['Element', 'Question', 'Example', 'Watch out for'], [
        ['<code>Effect</code>', 'allow or deny?', '<code>"Allow"</code> / <code>"Deny"</code>', 'there is no "neutral": anything not allowed is denied'],
        ['<code>Action</code>', 'which API calls?', '<code>"s3:GetObject"</code>, <code>"ec2:Describe*"</code>', 'service prefix + API name; <code>*</code> wildcards; case-insensitive'],
        ['<code>Resource</code>', 'on which things?', '<code>"arn:aws:s3:::reports-bucket/*"</code>', 'bucket ARN and object ARN are <b>different</b> resources'],
        ['<code>Condition</code>', 'only when?', '<code>{"Bool": {"aws:MultiFactorAuthPresent": "true"}}</code>', 'operator + key + value; all conditions in a statement must be true'],
        ['<code>Principal</code>', 'who? (only in resource-based and trust policies)', '<code>{"AWS": "arn:aws:iam::123456789012:role/app-role"}</code>', 'identity policies have no Principal: the principal is whoever the policy is attached to']
      ])}
      <p>🟢 <b>The evaluation logic in three lines</b> (for one account):</p>
      <ol><li>Start at <b>implicit deny</b>: everything is denied by default.</li><li>If <b>any</b> applicable statement says <b>Deny</b> and matches the request, the answer is <b>Deny</b>. Full stop. <b>Explicit deny always wins.</b></li><li>Otherwise, if at least one statement says <b>Allow</b> and matches, the answer is <b>Allow</b> (as long as every guard-rail layer, such as an SCP or a permission boundary, also allows it).</li></ol>
      <p>🔵 <b>Identity-based vs resource-based policies.</b> <b>Identity-based</b> policies attach to a user, group or role and say what <i>that identity</i> may do. <b>Resource-based</b> policies attach to a resource (an S3 bucket policy, an SQS queue policy, a KMS key policy, a role's <b>trust policy</b>) and say <i>who</i> may touch that resource, so they contain a <code>Principal</code>. Inside one account, an allow in <i>either</i> is usually enough. <b>Across accounts, both sides must allow</b>: the caller's identity policy and the resource's policy.</p>
      <p>🔵 <b>Guard rails that can only take away:</b> a <b>permission boundary</b> (a managed policy set as the maximum a user or role can ever have), <b>service control policies</b> (SCPs, set by an AWS Organization on whole accounts), resource control policies (RCPs) and <b>session policies</b> (passed when assuming a role). None of these grant anything. The effective permission is the <b>overlap</b>: identity policy ∩ boundary ∩ SCP.</p>
      <p>🔵 <b>Least privilege</b> means "only the actions, on only the resources, under only the conditions this job needs". Start from what is actually used (CloudTrail, last-accessed data, Access Analyzer policy generation), not from <code>"Action": "*"</code>.</p>
      <h4>Same idea on other clouds</h4>
      ${H.table(['AWS', 'Azure', 'Google Cloud'], [
        ['Policy JSON with Effect / Action / Resource', 'Role definition (Actions, NotActions, DataActions) + role <b>assignment</b> at a scope', 'Role (a list of permissions) + <b>binding</b> in an allow policy on a resource'],
        ['Explicit Deny statement', 'Deny assignments (limited) and Azure Policy "deny" effects', 'IAM deny policies (evaluated before allow policies)'],
        ['Condition keys', 'ABAC conditions on role assignments', 'IAM Conditions (CEL expressions)'],
        ['Permission boundary / SCP', 'Management group scope + Azure Policy', 'Organization policies, deny policies at org / folder'],
        ['Policy simulator', '"Check access" in Access control (IAM)', 'Policy Troubleshooter'],
        ['IAM Access Analyzer', 'Microsoft Entra access reviews / Defender for Cloud recommendations', 'Policy Analyzer and IAM recommender']
      ])}`,
    clues: [
      '"AccessDenied ... because no identity-based policy allows the X action" → nothing allows it: add a matching Allow (check the Resource ARN carefully)',
      '"... with an explicit deny in a service control policy / permissions boundary / identity-based policy" → a Deny wins; find and change that layer, adding Allows will not help',
      '"<code>\"Action\": \"*\"</code>, <code>\"Resource\": \"*\"</code>" in a review → over-broad: replace with the actions from CloudTrail / Access Analyzer policy generation',
      '"works for ListBucket but GetObject is denied" (or the reverse) → bucket ARN vs <code>bucket/*</code> object ARN',
      '"cross-account access to a bucket / KMS key" → both the identity policy and the resource policy must allow',
      '"developers may create roles but must not escalate" → permission boundary required on every role they create',
      '"test a policy before deploying it" → IAM policy simulator, <code>aws accessanalyzer validate-policy</code>, custom policy checks'
    ],
    code: [{ lang: 'json', code: `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ReadReportObjects",
      "Effect": "Allow",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::reports-bucket/*"
    },
    {
      "Sid": "ListOnly2026Prefix",
      "Effect": "Allow",
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::reports-bucket",
      "Condition": { "StringLike": { "s3:prefix": ["2026/*"] } }
    },
    {
      "Sid": "UploadOnlyIntoUploads",
      "Effect": "Allow",
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::reports-bucket/uploads/*"
    },
    {
      "Sid": "NeverDeleteReports",
      "Effect": "Deny",
      "Action": "s3:DeleteObject*",
      "Resource": "arn:aws:s3:::reports-bucket/*"
    },
    {
      "Sid": "NoSensitiveChangesWithoutMFA",
      "Effect": "Deny",
      "Action": ["iam:*", "s3:PutBucketPolicy"],
      "Resource": "*",
      "Condition": { "BoolIfExists": { "aws:MultiFactorAuthPresent": "false" } }
    }
  ]
}` }, R`# Lab: save the policy above as reports-policy.json (IAM is free)
# 1. Lint it: Access Analyzer reports errors, security warnings and suggestions
aws accessanalyzer validate-policy --policy-type IDENTITY_POLICY \
  --policy-document file://reports-policy.json \
  --query 'findings[].[findingType,issueCode]' --output table

# 2. Simulate requests against it BEFORE attaching it to anyone
aws iam simulate-custom-policy --policy-input-list file://reports-policy.json \
  --action-names s3:GetObject s3:DeleteObject s3:PutObject \
  --resource-arns arn:aws:s3:::reports-bucket/uploads/a.csv \
  --query 'EvaluationResults[].[EvalActionName,EvalDecision]' --output table
# s3:GetObject    allowed
# s3:DeleteObject explicitDeny
# s3:PutObject    allowed

# 3. Simulate a REAL role with all its attached policies (and boundary)
aws iam simulate-principal-policy \
  --policy-source-arn arn:aws:iam::123456789012:role/report-app-role \
  --action-names s3:GetObject \
  --resource-arns arn:aws:s3:::reports-bucket/2026/q1.csv \
  --query 'EvaluationResults[].[EvalActionName,EvalDecision,MatchedStatements[0].SourcePolicyId]' --output table

# 4. Create it as a customer managed policy and attach it to the role
aws iam create-policy --policy-name ReportsReadUpload --policy-document file://reports-policy.json
aws iam attach-role-policy --role-name report-app-role \
  --policy-arn arn:aws:iam::123456789012:policy/ReportsReadUpload`],
    codeTitle: ['A least-privilege S3 policy with an explicit deny and a condition', 'Validate and simulate before you attach'],
    viz: [{
      title: 'Policy evaluation: watch the decision for one request',
      input: 'action=s3:DeleteObject resource=arn:aws:s3:::reports-bucket/2026/q1.csv mfa=true',
      inputLabel: 'action=SERVICE:Action resource=ARN mfa=true|false',
      gen: function (input) {
        var o = { action: 's3:GetObject', resource: 'arn:aws:s3:::reports-bucket/2026/q1.csv', mfa: 'true' };
        String(input || '').trim().split(/\s+/).filter(Boolean).forEach(function (kv) {
          var m = kv.match(/^(action|resource|mfa)=(\S+)$/);
          if (!m) throw new Error('Use action=s3:GetObject resource=arn:aws:s3:::bucket/key mfa=true');
          o[m[1]] = m[2];
        });
        if (!/^[a-z0-9-]+:[A-Za-z0-9*]+$/.test(o.action)) throw new Error('action looks like s3:GetObject');
        if (!(o.resource === '*' || /^arn:aws:[a-z0-9-]+:/.test(o.resource)) || o.resource.length > 120) throw new Error('resource must be * or an ARN such as arn:aws:s3:::reports-bucket/2026/q1.csv');
        if (['true', 'false'].indexOf(o.mfa) < 0) throw new Error('mfa must be true or false');
        var mfa = o.mfa === 'true';
        var S = [
          { sid: 'ReadReports', eff: 'Allow', act: ['s3:GetObject', 's3:ListBucket'], res: ['arn:aws:s3:::reports-bucket', 'arn:aws:s3:::reports-bucket/*'], cond: null },
          { sid: 'UploadOnlyIntoUploads', eff: 'Allow', act: ['s3:PutObject'], res: ['arn:aws:s3:::reports-bucket/uploads/*'], cond: null },
          { sid: 'NeverDeleteReports', eff: 'Deny', act: ['s3:DeleteObject*'], res: ['arn:aws:s3:::reports-bucket/*'], cond: null },
          { sid: 'NoSensitiveChangesWithoutMFA', eff: 'Deny', act: ['iam:*', 's3:PutBucketPolicy'], res: ['*'], cond: 'no MFA' }
        ];
        var rows = S.map(function (s) { return [s.sid, s.eff, s.act.join(', '), s.res.join(', '), s.cond || '-', '?']; });
        var cols = ['Sid', 'Effect', 'Action', 'Resource', 'Condition', 'matches?'];
        var f = [];
        f.push({ narr: 'The request: principal <code>report-app-role</code> calls <b>' + H.esc(o.action) + '</b> on <code>' + H.esc(o.resource) + '</code> (MFA present: ' + o.mfa + '). Evaluation starts at <b>implicit deny</b>: unless something allows it, the answer is no.', parts: [
          { type: 'vars', label: 'request context', vals: { action: o.action, resource: o.resource, 'aws:MultiFactorAuthPresent': o.mfa, decision: 'implicit deny (default)' }, hl: { decision: 'bad' } },
          { type: 'table', label: 'policies attached to the role', columns: cols, rows: rows.map(function (r) { return r.slice(); }) }
        ] });
        var allows = [], denies = [];
        S.forEach(function (s, k) {
          var am = s.act.some(function (a) { return wild(a, o.action, true); });
          var rm = s.res.some(function (r) { return wild(r, o.resource, false); });
          var cm = s.cond ? !mfa : true;
          var hit = am && rm && cm;
          rows[k][5] = hit ? 'YES' : (!am ? 'no (action)' : !rm ? 'no (resource)' : 'no (condition)');
          if (hit) (s.eff === 'Deny' ? denies : allows).push(s.sid);
          var why = !am ? 'The action <code>' + H.esc(o.action) + '</code> does not match ' + s.act.map(function (a) { return '<code>' + H.esc(a) + '</code>'; }).join(' or ') + ', so this statement is ignored.'
            : !rm ? 'The action matches, but the resource does not match ' + s.res.map(function (a) { return '<code>' + H.esc(a) + '</code>'; }).join(' or ') + '. Remember: <code>bucket</code> and <code>bucket/*</code> are different ARNs.'
            : !cm ? 'Action and resource match, but the condition (applies only when there is no MFA) is false because MFA is present. The statement does not apply.'
            : 'Action, resource' + (s.cond ? ' and condition' : '') + ' all match: this <b>' + s.eff + '</b> statement applies.';
          var hl = {}; hl[k] = hit ? (s.eff === 'Deny' ? 'bad' : 'ok') : 'done';
          f.push({ narr: 'Statement <b>' + s.sid + '</b> (' + s.eff + '): ' + why, parts: [
            { type: 'table', label: 'checking every statement (order does not matter)', columns: cols, rows: rows.map(function (r) { return r.slice(); }), hl: hl },
            { type: 'set', label: 'matching statements', items: allows.map(function (a) { return 'Allow: ' + a; }).concat(denies.map(function (d) { return 'Deny: ' + d; })) }
          ] });
        });
        var dec, cls, why2;
        if (denies.length) { dec = 'DENIED (explicit deny)'; cls = 'bad'; why2 = 'At least one <b>Deny</b> matched (' + denies.join(', ') + '). An explicit deny beats every allow, in every policy type. Adding more Allow statements can never fix this; you must change or remove the Deny.'; }
        else if (allows.length) { dec = 'ALLOWED'; cls = 'ok'; why2 = 'No Deny matched and ' + allows.join(', ') + ' allows it. (In a real account the SCPs and any permission boundary must also allow it.)'; }
        else { dec = 'DENIED (implicit deny)'; cls = 'bad'; why2 = 'Nothing matched at all, so the default implicit deny stands. The error message says "<i>because no identity-based policy allows the ' + H.esc(o.action) + ' action</i>". Fix: add an Allow for exactly this action and resource.'; }
        f.push({ narr: 'Decision: <b>' + dec + '</b>. ' + why2, parts: [
          { type: 'vars', label: 'result', vals: { 'explicit denies': denies.length, 'allows': allows.length, decision: dec }, hl: { decision: cls } },
          { type: 'text', label: 'the rule', html: '<p>1. Any matching Deny → <b>Deny</b>. 2. Else any matching Allow (and every guard rail allows) → <b>Allow</b>. 3. Else → <b>implicit Deny</b>.</p>' }
        ] });
        f.push({ narr: 'Try other inputs: <code>action=s3:GetObject</code> (allowed), <code>action=s3:PutObject resource=arn:aws:s3:::reports-bucket/2026/x</code> (implicit deny: wrong prefix), <code>action=iam:CreateUser resource=* mfa=false</code> (explicit deny).', parts: [
          { type: 'table', label: 'what each outcome looks like in an error', columns: ['outcome', 'AccessDenied message ends with'], rows: [['implicit deny', '... because no identity-based policy allows the ACTION action'], ['explicit deny', '... with an explicit deny in an identity-based policy'], ['SCP deny', '... with an explicit deny in a service control policy'], ['boundary', '... because no permissions boundary allows the ACTION action']] }
        ] });
        return f;
      }
    }],
    examples: [
      { title: 'Situation: the over-broad <code>"Action": "*"</code> policy', html: `<p>A security review finds a role <code>report-app-role</code> with a policy <code>{"Effect": "Allow", "Action": "*", "Resource": "*"}</code>, added "temporarily" two years ago. Anyone who compromises that app can delete every database and create admin users. Fix without breaking the app: (1) look at <b>last accessed</b> data to see which services it really used; (2) run <b>Access Analyzer policy generation</b>, which reads up to 90 days of CloudTrail and drafts a policy with the actions used; (3) narrow the resources by hand; (4) attach the new policy, keep the old one for a day while watching for AccessDenied in CloudTrail, then delete it.</p>`, code: R`ROLE=arn:aws:iam::123456789012:role/report-app-role
# Which services has this role actually touched, and when?
JOB=$(aws iam generate-service-last-accessed-details --arn "$ROLE" --query JobId --output text)
sleep 5
aws iam get-service-last-accessed-details --job-id "$JOB" \
  --query 'ServicesLastAccessed[?TotalAuthenticatedEntities>` + "`0`" + R`].[ServiceNamespace,LastAuthenticated]' --output table` },
      { title: 'Situation: "AccessDenied" debugging, step by step', html: `<p>The app logs: <code>User: arn:aws:sts::123456789012:assumed-role/report-app-role/i-0abc123 is not authorized to perform: s3:GetObject on resource: "arn:aws:s3:::reports-bucket/2026/q1.csv" because no identity-based policy allows the s3:GetObject action</code>. Read it as four facts: <b>who</b> (the role session), <b>what</b> (s3:GetObject), <b>on what</b> (the object ARN), <b>why</b> (implicit deny: nothing allows it). Then simulate the exact call against the role. If the simulator says allowed but the call still fails, look at the other layers: bucket policy, KMS key policy for encrypted objects, SCPs, VPC endpoint policies. For services that return an encoded message, decode it.</p>`, code: R`aws iam simulate-principal-policy \
  --policy-source-arn arn:aws:iam::123456789012:role/report-app-role \
  --action-names s3:GetObject --resource-arns arn:aws:s3:::reports-bucket/2026/q1.csv \
  --query 'EvaluationResults[0].EvalDecision' --output text     # implicitDeny

# EC2 and some services give "Encoded authorization failure message: ..."
aws sts decode-authorization-message --encoded-message "$ENCODED" \
  --query DecodedMessage --output text | python3 -m json.tool` },
      { title: 'A resource-based bucket policy for another account', html: `<p>Account <code>111122223333</code> (an AWS documentation example id) runs analytics and must read <code>reports-bucket</code> in account <code>123456789012</code>. The bucket owner adds a <b>bucket policy</b> naming the other account's role as <code>Principal</code>. That alone is not enough: the analytics role also needs an identity policy allowing <code>s3:GetObject</code> on that bucket. Cross-account = both sides must say yes.</p>`, code: { lang: 'json', code: `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AnalyticsAccountRead",
      "Effect": "Allow",
      "Principal": { "AWS": "arn:aws:iam::111122223333:role/analytics-reader" },
      "Action": ["s3:GetObject", "s3:ListBucket"],
      "Resource": ["arn:aws:s3:::reports-bucket", "arn:aws:s3:::reports-bucket/*"]
    },
    {
      "Sid": "DenyPlainHttp",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": ["arn:aws:s3:::reports-bucket", "arn:aws:s3:::reports-bucket/*"],
      "Condition": { "Bool": { "aws:SecureTransport": "false" } }
    }
  ]
}` } },
      { title: 'Permission boundaries at an intro level', html: `<p>Developers want to create roles for their own Lambda functions. If they can create a role with <code>AdministratorAccess</code> and pass it to a function, they have escalated to admin. A <b>permission boundary</b> stops that: you let them call <code>iam:CreateRole</code> only if the new role has the boundary <code>DevBoundary</code> attached (condition key <code>iam:PermissionsBoundary</code>). Whatever policy they attach later, the role can never exceed the boundary. Boundaries do not grant anything: effective = identity policy ∩ boundary.</p>`, code: R`aws iam create-role --role-name orders-fn-role \
  --assume-role-policy-document file://lambda-trust.json \
  --permissions-boundary arn:aws:iam::123456789012:policy/DevBoundary` }
    ],
    deepDive: `<p>🟣 <b>The full evaluation order</b> (AWS documents it as a flow chart): (1) gather every applicable policy: identity-based, resource-based, permission boundary, SCPs and RCPs of the Organization, session policies; (2) any explicit <b>Deny</b> anywhere → Deny; (3) SCPs and RCPs must allow the action (an SCP with no matching Allow is an implicit deny for the whole account); (4) a resource-based policy Allow can grant access in the same account even without an identity Allow (with nuances when the principal is a role session or has a boundary); (5) the identity policy must allow; (6) the permission boundary must allow; (7) the session policy must allow. Cross-account requests need an Allow on both sides. KMS keys are stricter: the key policy must allow the account before any IAM policy counts.</p>
      <p><b>NotAction and NotResource</b> invert the match: <code>"Effect": "Deny", "NotAction": ["iam:*", "sts:*"], "Condition": {...}</code> denies everything except those. Powerful, easy to get wrong: <code>Allow + NotAction</code> grants every action you did not list, including future services.</p>
      <p><b>Condition operators</b>: <code>StringEquals</code>, <code>StringLike</code> (wildcards), <code>ArnLike</code>, <code>IpAddress</code>, <code>Bool</code>, <code>NumericLessThan</code>, <code>DateGreaterThan</code>, and the <code>...IfExists</code> variants that pass when the key is absent. Multiple keys in one Condition are ANDed; multiple values for one key are ORed. Global keys you will use often: <code>aws:PrincipalOrgID</code>, <code>aws:SourceIp</code>, <code>aws:SourceVpce</code>, <code>aws:RequestedRegion</code>, <code>aws:PrincipalTag/...</code> and <code>aws:ResourceTag/...</code> (tag-based access control, ABAC).</p>
      <p><b>Policy size limits</b>: managed policies up to 6,144 characters, inline policies for roles 10,240 in total. When you hit them, group actions with wildcards that stay tight (<code>s3:Get*</code> on one bucket) rather than going back to <code>*</code>.</p>
      <p><b>Access Analyzer</b> does four jobs: <b>validate</b> policies (syntax and security warnings), <b>external access</b> findings (which resources are shared outside your account or organisation), <b>unused access</b> findings (unused roles, keys, permissions), and <b>custom policy checks</b> such as <code>check-no-new-access</code> in a pipeline to block a pull request that widens a policy.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> writing policy JSON by hand used to be slow and error-prone. An assistant can draft a least-privilege policy from a description ("read objects under 2026/ in reports-bucket, write only to uploads/") in seconds, and explain a long AccessDenied message line by line.</p>
      <p><b>Where it goes wrong:</b> models often invent action names (<code>s3:ReadObject</code> does not exist), forget that <code>s3:ListBucket</code> needs the bucket ARN while <code>s3:GetObject</code> needs <code>bucket/*</code>, and fall back to <code>"Resource": "*"</code> when unsure. <b>Workflow that works:</b> let AI draft, then run <code>aws accessanalyzer validate-policy</code> (it flags unknown actions) and <code>simulate-custom-policy</code> for allowed and must-be-denied requests, and use <code>check-no-new-access</code> in CI. Treat the AI output as a pull request from a fast junior colleague: helpful, never merged unreviewed.</p>`,
    problems: [P({
      t: 'Find why this request is denied', l: 'Medium', tags: ['iam', 'accessdenied', 'policy evaluation', 's3'], co: ['AWS Support', 'Amazon', 'Capgemini'], lang: 'json', c: LABIAM,
      s: `<p>The report app on EC2 fails with:</p><pre>An error occurred (AccessDenied) when calling the GetObject operation: User: arn:aws:sts::123456789012:assumed-role/report-app-role/i-0abc123 is not authorized to perform: s3:GetObject on resource: "arn:aws:s3:::reports-bucket/2026/q1.csv" because no identity-based policy allows the s3:GetObject action</pre><p>The only policy on <code>report-app-role</code> is:</p><pre>{ "Version": "2012-10-17", "Statement": [ { "Effect": "Allow", "Action": ["s3:ListBucket", "s3:GetObject"], "Resource": "arn:aws:s3:::reports-bucket" } ] }</pre><p><code>aws s3 ls s3://reports-bucket/2026/</code> works. Explain the denial and write the fixed policy.</p>`,
      ex: `<p>${H.c('g', 'ListBucket')} works because it acts on the <b>bucket</b> ARN, which the policy names. ${H.c('r', 'GetObject')} acts on an <b>object</b> ARN (<code>reports-bucket/2026/q1.csv</code>), which <code>arn:aws:s3:::reports-bucket</code> does not match, so it is an implicit deny.</p>`,
      bw: `<p>Changing the policy to <code>"Action": "s3:*", "Resource": "*"</code> "to make it work". The error disappears, and the app can now delete every bucket in the account. The message said <i>no policy allows</i>, which means one precise Allow is missing, not that everything should be allowed.</p>`,
      q: ['"because no identity-based policy allows the action" tells you that...', ['Nothing matched: it is an implicit deny, so a precise Allow is missing', 'A Deny statement matched somewhere', 'An SCP blocks the action', 'The bucket policy denies the role'], 0, 'Explicit denies are reported as "with an explicit deny in ...". "No ... policy allows" means implicit deny: add an Allow that matches the exact action and resource.'],
      h: ['<p>Hint 1: read the error as who / action / resource / reason. Compare the resource ARN in the error with the one in the policy, character by character.</p>', '<p>Hint 2: in S3, <code>ListBucket</code> is a bucket-level action (<code>arn:aws:s3:::reports-bucket</code>), <code>GetObject</code> is an object-level action (<code>arn:aws:s3:::reports-bucket/*</code>).</p>', '<p>Hint 3: write two statements, one per resource type, then prove it with <code>simulate-principal-policy</code> for both actions and for a delete that must stay denied.</p>'],
      a: `<p><b>Why:</b> IAM matches the request's resource ARN against the statement's <code>Resource</code>. The request is for the object <code>arn:aws:s3:::reports-bucket/2026/q1.csv</code>; the policy only lists the bucket <code>arn:aws:s3:::reports-bucket</code>. No statement matches, so the result is the default <b>implicit deny</b>. Listing works because <code>ListBucket</code> is evaluated against the bucket ARN. <b>Fix:</b> split the statement: <code>ListBucket</code> on the bucket (optionally limited to the <code>2026/</code> prefix with an <code>s3:prefix</code> condition), <code>GetObject</code> on <code>reports-bucket/*</code> (or tighter, <code>reports-bucket/2026/*</code>). <b>Verify</b> with <code>aws iam simulate-principal-policy</code>: GetObject allowed, DeleteObject still implicitDeny. If the simulator says allowed and the call still fails, check the next layers: a bucket policy Deny, the KMS key policy if the object is SSE-KMS encrypted (you would also need <code>kms:Decrypt</code>), an SCP or a VPC endpoint policy.</p>`,
      code: `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ListReports2026",
      "Effect": "Allow",
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::reports-bucket",
      "Condition": { "StringLike": { "s3:prefix": ["2026/", "2026/*"] } }
    },
    {
      "Sid": "ReadReports2026",
      "Effect": "Allow",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::reports-bucket/2026/*"
    }
  ]
}`,
      cx: `<p>Two statements, two simulator checks. The habit that matters: every Allow names the narrowest ARN that works.</p>`,
      f: ['The object is encrypted with a customer managed KMS key. What else does the role need, and where?', 'How would the error text differ if an SCP blocked s3:GetObject?']
    })]
  });

  // ───────────────────────── Topic 3: roles, trust policies, MFA and access keys ─────────────────────────
  topics.push({
    title: 'Roles, Trust Policies and Credentials: MFA, Short-Lived Keys and a Leaked Key Drill',
    analogy: `<p>A role is a <b>hotel key card</b>. The front desk (STS, the Security Token Service) only makes a card for guests on the <b>booking list</b> (the trust policy). The card opens only the rooms printed on it (the permission policies), and it <b>stops working at checkout time</b> on its own. An access key, by contrast, is a <b>metal house key</b>: it works until someone changes the lock, and if you drop it in the street (a public Git repo), anyone who picks it up walks in. That is why we hand out key cards wherever we can and change the locks immediately when a metal key goes missing.</p>`,
    explain: `<p>🟢 <b>A role has two policies, and both matter.</b></p>
      ${H.table(['Policy', 'Question it answers', 'Example'], [
        ['<b>Trust policy</b> (a resource-based policy on the role)', '<b>who</b> may assume this role?', '<code>"Principal": {"Service": "ec2.amazonaws.com"}</code>, <code>"Action": "sts:AssumeRole"</code>'],
        ['<b>Permission policies</b> (identity-based, attached to the role)', '<b>what</b> can the role do once assumed?', 'the S3 read policy from the previous topic']
      ])}
      <p>🟢 <b>Assuming a role</b> means asking STS for <b>temporary credentials</b>: an access key id starting with <code>ASIA</code>, a secret, a <b>session token</b> and an expiry (15 minutes to 12 hours, 1 hour by default). Long-lived IAM user keys start with <code>AKIA</code>. Seeing the prefix in a log tells you instantly which kind leaked.</p>
      <p>🔵 <b>Who assumes roles, and how:</b></p>
      ${H.table(['Caller', 'How it gets credentials', 'Trust policy principal'], [
        ['EC2 instance', '<b>instance profile</b> → the SDK reads them from instance metadata (IMDSv2)', '<code>{"Service": "ec2.amazonaws.com"}</code>'],
        ['Lambda, ECS task', 'the service assumes the execution / task role for you', '<code>lambda.amazonaws.com</code>, <code>ecs-tasks.amazonaws.com</code>'],
        ['A person via SSO', 'Identity Center assumes the permission-set role after MFA', 'the SAML provider (managed for you)'],
        ['CI/CD (GitHub Actions, GitLab)', '<code>AssumeRoleWithWebIdentity</code> with a signed OIDC token: <b>no stored secret</b>', '<code>{"Federated": "arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com"}</code> + conditions on the repo'],
        ['Another AWS account', '<code>sts:AssumeRole</code> from a principal there; both sides must allow', '<code>{"AWS": "arn:aws:iam::111122223333:role/x"}</code> + <code>sts:ExternalId</code> for vendors']
      ])}
      <p>🔵 <b>MFA and access keys, the rules.</b> Require MFA for every human sign-in (Identity Center setting, or a Deny-without-MFA condition for legacy IAM users). If an IAM user's access key is truly unavoidable: one active key, never in code, config files in Git, container images or tickets; rotate at least every 90 days with the two-slot method (create key 2 → deploy → confirm key 1 unused with <code>get-access-key-last-used</code> → deactivate → delete); and alert on key age. Better: replace it with a role, Roles Anywhere or OIDC.</p>
      <p>🔵 <b>When a key leaks</b>, the order is: <b>deactivate</b> (seconds matter: bots scan public GitHub for <code>AKIA</code> strings within minutes) → <b>revoke sessions</b> the attacker may already have created → <b>rotate</b> (new credentials, or better a role) → <b>investigate in CloudTrail</b> what the key did, in <b>every region</b> → clean up what the attacker created → fix the root cause (secret scanning, push protection, no more static keys).</p>
      <h4>Same idea on other clouds</h4>
      ${H.table(['AWS', 'Azure', 'Google Cloud'], [
        ['Role + trust policy', 'Managed identity; federated identity credentials on an app registration', 'Service account + who may impersonate it (<code>roles/iam.serviceAccountTokenCreator</code>)'],
        ['STS temporary credentials', 'Entra ID access tokens (about 1 h)', 'Short-lived OAuth tokens via impersonation'],
        ['OIDC federation for CI', 'Workload identity federation (GitHub → Entra app)', 'Workload Identity Federation pools'],
        ['Access keys (avoid)', 'Client secrets / certificates on app registrations', 'Service account keys; block with org policy <code>iam.disableServiceAccountKeyCreation</code>'],
        ['Leaked key: deactivate + CloudTrail', 'Remove the secret + Entra sign-in and Activity logs', 'Disable / delete the key + Cloud Audit Logs']
      ])}`,
    clues: [
      '"the app on EC2 needs to read S3" → role + instance profile; never keys in the AMI or user data',
      '"is not authorized to perform: sts:AssumeRole on resource: ...role/X" → the trust policy does not name the caller, or the caller\'s own policy lacks sts:AssumeRole',
      '"store AWS keys as a GitHub secret" → OIDC federation with a trust policy limited to the repo and branch',
      '"AKIA... found in a public repository" → deactivate now, revoke sessions, rotate, CloudTrail in all regions',
      '"third-party SaaS needs access to our account" → cross-account role with <code>sts:ExternalId</code>, read-only',
      '"credentials expired" / "ExpiredToken" → temporary credentials ran out; refresh via SSO login or the SDK provider, do not switch to static keys',
      '"rotate access keys without downtime" → two-slot rotation and <code>get-access-key-last-used</code>'
    ],
    code: [R`# Lab: an EC2 role, created with a trust policy and an instance profile (IAM is free)
cat > ec2-trust.json <<'JSON'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Service": "ec2.amazonaws.com" },
    "Action": "sts:AssumeRole"
  }]
}
JSON
aws iam create-role --role-name report-app-role \
  --assume-role-policy-document file://ec2-trust.json
aws iam attach-role-policy --role-name report-app-role \
  --policy-arn arn:aws:iam::123456789012:policy/ReportsReadUpload
aws iam attach-role-policy --role-name report-app-role \
  --policy-arn arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore

# EC2 cannot use a role directly: wrap it in an instance profile
aws iam create-instance-profile --instance-profile-name report-app-profile
aws iam add-role-to-instance-profile --instance-profile-name report-app-profile \
  --role-name report-app-role

# On the instance: IMDSv2 needs a session token first (blocks SSRF-style theft)
TOKEN=$(curl -sX PUT http://169.254.169.254/latest/api/token \
  -H 'X-aws-ec2-metadata-token-ttl-seconds: 300')
curl -s -H "X-aws-ec2-metadata-token: $TOKEN" \
  http://169.254.169.254/latest/meta-data/iam/security-credentials/
aws sts get-caller-identity    # ...:assumed-role/report-app-role/i-0abc123`, R`# A person assuming a role by hand (cross-account or break-glass); expires in 1 hour
aws sts assume-role --profile lab \
  --role-arn arn:aws:iam::123456789012:role/ReadOnlyAuditor \
  --role-session-name alice-ticket-4711 --duration-seconds 3600 \
  --query 'Credentials.Expiration' --output text
# Better: let the CLI do it from ~/.aws/config, no copy-pasting of credentials
#   [profile auditor]
#   source_profile = lab
#   role_arn = arn:aws:iam::123456789012:role/ReadOnlyAuditor
#   role_session_name = alice
aws s3 ls --profile auditor`],
    codeTitle: ['Create an EC2 role with its trust policy and instance profile', 'Assume a role for a short session'],
    viz: [{
      title: 'AssumeRole: will STS hand out a key card?',
      input: 'caller=ec2 trust=ec2 externalid=none duration=3600',
      inputLabel: 'caller=ec2|lambda|alice|vendor trust=comma list of ec2,lambda,alice,vendor externalid=none|right|wrong duration=900-43200',
      gen: function (input) {
        var o = { caller: 'ec2', trust: 'ec2', externalid: 'none', duration: '3600' };
        String(input || '').trim().split(/\s+/).filter(Boolean).forEach(function (kv) {
          var m = kv.match(/^(caller|trust|externalid|duration)=(\S+)$/);
          if (!m) throw new Error('Use caller=ec2 trust=ec2,lambda externalid=none duration=3600');
          o[m[1]] = m[2].toLowerCase();
        });
        var P = { ec2: 'Service: ec2.amazonaws.com', lambda: 'Service: lambda.amazonaws.com', alice: 'AWS: arn:aws:iam::123456789012:user/alice', vendor: 'AWS: arn:aws:iam::111122223333:role/vendor-scanner' };
        if (!P[o.caller]) throw new Error('caller must be ec2, lambda, alice or vendor');
        var trust = o.trust.split(',').filter(Boolean);
        if (!trust.length || trust.some(function (t) { return !P[t]; })) throw new Error('trust is a comma list of ec2, lambda, alice, vendor');
        if (['none', 'right', 'wrong'].indexOf(o.externalid) < 0) throw new Error('externalid must be none, right or wrong');
        var dur = Number(o.duration);
        if (!(dur >= 900 && dur <= 43200)) throw new Error('duration must be 900 to 43200 seconds');
        var nodes = [box('C', o.caller === 'ec2' ? 'EC2 instance' : o.caller === 'lambda' ? 'Lambda' : o.caller === 'alice' ? 'alice (IAM user)' : 'vendor account', 10, 25, 18), box('STS', 'STS', 40, 10, 12), box('T', 'trust policy', 40, 42, 16), box('R', 'report-app-role', 70, 25, 20), box('S3', 'S3 bucket', 92, 25, 14)];
        var edges = [['C', 'STS'], ['STS', 'T'], ['STS', 'C'], ['C', 'S3']];
        function g(hl, ehl) { return { type: 'graph', directed: true, height: 55, nodes: nodes, edges: edges, hl: hl || {}, ehl: ehl || {} }; }
        var f = [];
        f.push({ narr: 'The ' + o.caller + ' wants to act as <code>report-app-role</code>. It does not log in; it asks <b>STS</b> for temporary credentials by calling <code>sts:AssumeRole</code> with the role ARN' + (o.caller === 'vendor' ? ' and an ExternalId' : '') + '.', parts: [g({ C: 'cur' }, { 'C-STS': 'cur' }), { type: 'vars', label: 'request', vals: { caller: P[o.caller], action: 'sts:AssumeRole', role: 'arn:aws:iam::123456789012:role/report-app-role', DurationSeconds: dur } }] });
        var trusted = trust.indexOf(o.caller) >= 0;
        f.push({ narr: 'STS reads the role\'s <b>trust policy</b>. Is the caller listed as a Principal? ' + (trusted ? '<b>Yes</b>.' : '<b>No</b>: the caller is not on the booking list.'), parts: [g({ T: trusted ? 'ok' : 'bad' }, { 'STS-T': trusted ? 'ok' : 'bad' }), { type: 'set', label: 'principals in the trust policy', items: trust.map(function (t) { return P[t]; }), hl: trusted ? one(P[o.caller], 'ok') : {} }] });
        if (!trusted) {
          f.push({ narr: 'Result: <b>AccessDenied</b>: <i>"... is not authorized to perform: sts:AssumeRole on resource: arn:aws:iam::123456789012:role/report-app-role"</i>. Fix the <b>trust policy</b> (add the right principal); attaching more permission policies to the role would change nothing.', parts: [g({ C: 'bad', STS: 'bad' }), { type: 'vars', label: 'outcome', vals: { credentials: 'none', error: 'AccessDenied on sts:AssumeRole' }, hl: { error: 'bad' } }] });
          f.push({ narr: 'Remember the split: the <b>trust policy</b> decides who may become the role, the <b>permission policies</b> decide what the role may do. Debug them separately.', parts: [{ type: 'table', label: 'two policies, two questions', columns: ['policy', 'question', 'failed here?'], rows: [['trust policy', 'who may assume?', 'YES'], ['permission policies', 'what may the role do?', 'not reached']], hl: { 0: 'bad' } }] });
          return f;
        }
        if (o.caller === 'alice' || o.caller === 'vendor') {
          f.push({ narr: 'The caller is an AWS principal, not a service, so <b>its own identity policy</b> must also allow <code>sts:AssumeRole</code> on this role ARN. ' + (o.caller === 'vendor' ? 'The vendor is in another account, so this check happens in <i>their</i> account: cross-account means both sides say yes.' : 'Alice\'s group policy allows it.'), parts: [g({ C: 'ok', T: 'ok' }), { type: 'table', label: 'both sides', columns: ['side', 'policy', 'allows?'], rows: [['role (resource side)', 'trust policy', 'yes'], ['caller (identity side)', 'sts:AssumeRole on role ARN', 'yes']], hl: { 0: 'ok', 1: 'ok' } }] });
        }
        if (o.caller === 'vendor') {
          if (o.externalid !== 'right') {
            f.push({ narr: 'The trust policy has <code>"Condition": {"StringEquals": {"sts:ExternalId": "ext-7Q2v..."}}</code>, and the request\'s ExternalId is ' + (o.externalid === 'none' ? 'missing' : 'wrong') + '. Denied. The ExternalId protects you from the <b>confused deputy</b> problem: another customer of the same vendor cannot trick the vendor into opening your account.', parts: [g({ C: 'bad', T: 'bad' }), { type: 'vars', label: 'condition check', vals: { 'sts:ExternalId expected': 'ext-7Q2v...', received: o.externalid === 'none' ? '(none)' : 'ext-WRONG' }, hl: { received: 'bad' } }] });
            f.push({ narr: 'Result: <b>AccessDenied</b>. No credentials are issued. The vendor must send the ExternalId you gave them.', parts: [g({ STS: 'bad' }), { type: 'vars', label: 'outcome', vals: { credentials: 'none' } }] });
            f.push({ narr: 'Lesson: conditions in trust policies (ExternalId, MFA, source org, OIDC repo name) are how you narrow <i>who</i> can become a role.', parts: [{ type: 'table', label: 'useful trust-policy conditions', columns: ['condition key', 'use'], rows: [['sts:ExternalId', 'third-party vendors'], ['aws:MultiFactorAuthPresent', 'humans assuming admin roles'], ['aws:PrincipalOrgID', 'any role in my organisation'], ['token.actions.githubusercontent.com:sub', 'one GitHub repo and branch']] }] });
            return f;
          }
          f.push({ narr: 'The ExternalId matches the condition in the trust policy. All checks pass.', parts: [g({ T: 'ok' }), { type: 'vars', label: 'condition check', vals: { 'sts:ExternalId': 'matches' }, hl: { 'sts:ExternalId': 'ok' } }] });
        }
        var exp = Math.round(dur / 60);
        f.push({ narr: 'STS returns <b>temporary credentials</b>: an access key id starting with <b>ASIA</b>, a secret, a session token and an expiry ' + exp + ' minutes from now. Nothing long-lived was created.', parts: [g({ STS: 'ok', C: 'ok' }, { 'STS-C': 'ok' }), { type: 'vars', label: 'credentials (masked, never log them)', vals: { AccessKeyId: 'ASIA****EXAMPLE', SecretAccessKey: '********', SessionToken: '******** (long)', Expiration: '+' + exp + ' min' }, hl: { Expiration: 'ok' } }] });
        f.push({ narr: 'The caller signs S3 requests with these credentials. Now the role\'s <b>permission policies</b> decide (the previous topic\'s evaluation logic). CloudTrail records the caller as <code>assumed-role/report-app-role/SESSION</code>.', parts: [g({ C: 'ok', S3: 'ok', R: 'win' }, { 'C-S3': 'ok' }), { type: 'vars', label: 'in CloudTrail', vals: { userIdentity: 'arn:aws:sts::123456789012:assumed-role/report-app-role/' + (o.caller === 'ec2' ? 'i-0abc123' : o.caller) } }] });
        f.push({ narr: 'After ' + exp + ' minutes the credentials die on their own: a leak is a short problem. The SDK (or the instance metadata service, or the SSO cache) fetches fresh ones before expiry, so the application never notices.', parts: [{ type: 'table', label: 'key card vs house key', columns: ['', 'role session (ASIA)', 'IAM user key (AKIA)'], rows: [['lifetime', exp + ' min', 'until someone deletes it'], ['stored where', 'memory / CLI cache', 'files, env vars, CI secrets, Git (!)'], ['rotation', 'automatic', 'manual, often forgotten']], hl: { 0: 'ok' } }] });
        return f;
      }
    }],
    examples: [
      { title: 'GitHub Actions deploys without any stored AWS key', html: `<p>Instead of an IAM user's keys saved as repository secrets, the workflow asks GitHub for a signed OIDC token and exchanges it with <code>AssumeRoleWithWebIdentity</code>. The trust policy accepts only tokens for <b>one repo and the main branch</b>. A fork or another repo gets AccessDenied. There is nothing to leak and nothing to rotate. (Set up the OIDC identity provider for <code>token.actions.githubusercontent.com</code> once per account.)</p>`, code: { lang: 'json', code: `{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Federated": "arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com" },
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {
      "StringEquals": {
        "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
        "token.actions.githubusercontent.com:sub": "repo:example-org/report-app:ref:refs/heads/main"
      }
    }
  }]
}` } },
      { title: 'Require MFA before using an admin role', html: `<p>A legacy setup still has IAM users who switch into an <code>Admin</code> role. Add a condition to the role's trust policy so that the switch only works when the user signed in with MFA. Without MFA, the user can still log in and change their own password, but cannot become admin. (With Identity Center you set "MFA required" once instead.)</p>`, code: { lang: 'json', code: `{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "AWS": "arn:aws:iam::123456789012:root" },
    "Action": "sts:AssumeRole",
    "Condition": {
      "Bool": { "aws:MultiFactorAuthPresent": "true" },
      "NumericLessThan": { "aws:MultiFactorAuthAge": "3600" }
    }
  }]
}` } },
      { title: 'Zero-downtime access key rotation (when a key is unavoidable)', html: `<p>An old on-prem backup tool can only use an access key. Rotation uses the fact that a user can have <b>two</b> keys: create the new one, deploy it to the tool (through a secrets manager, not a text file), confirm the old key's <b>last used</b> date stops moving, deactivate the old key, wait a day, delete it. The <code>"Principal": ... :root</code> in trust policies means "the account", not the root user: any principal in that account whose own policy allows it.</p>`, code: R`U=backup-tool
aws iam list-access-keys --user-name "$U" --query 'AccessKeyMetadata[].[AccessKeyId,Status,CreateDate]' --output table
# Create key 2 straight into Secrets Manager, so the secret never appears on screen or in a file
aws iam create-access-key --user-name "$U" --query AccessKey --output json \
  | aws secretsmanager put-secret-value --secret-id backup-tool/aws-key --secret-string file:///dev/stdin
OLD="$1"   # old key id passed as an argument (ids are not secret, but keep them out of scripts)
aws iam get-access-key-last-used --access-key-id "$OLD" --query 'AccessKeyLastUsed.LastUsedDate'
aws iam update-access-key --user-name "$U" --access-key-id "$OLD" --status Inactive
# after 24 h with no breakage:
aws iam delete-access-key --user-name "$U" --access-key-id "$OLD"` }
    ],
    deepDive: `<p>🟣 <b>Role chaining and session limits.</b> Assuming a role from a role session is "role chaining" and is capped at <b>1 hour</b>, whatever the role's maximum session duration (up to 12 h) says. Session tags and <code>sts:SourceIdentity</code> carry the original human's identity across chains so CloudTrail still shows who started it.</p>
      <p><b>The confused deputy.</b> A vendor that serves many customers assumes roles in each customer's account. If customer A could tell the vendor "scan account B's role", the vendor would happily use its trust in B. The ExternalId, unique per customer and chosen by the vendor, makes that impossible. For AWS services acting on your behalf, use <code>aws:SourceArn</code> / <code>aws:SourceAccount</code> conditions in resource policies for the same reason.</p>
      <p><b>Revoking sessions.</b> Deactivating an IAM user's access key does <b>not</b> kill temporary credentials already minted from it with <code>GetSessionToken</code> or <code>AssumeRole</code>. For roles, the console's "Revoke active sessions" attaches a Deny with <code>"DateLessThan": {"aws:TokenIssueTime": "NOW"}</code>; for users, attach the same inline deny yourself. AWS may also attach the managed policy <code>AWSCompromisedKeyQuarantineV3</code> automatically when it detects a public leak, and open a support case: treat that as an incident, not a nuisance.</p>
      <p><b>IMDSv2</b> requires a PUT for a session token with a hop limit, which stops most server-side request forgery attacks from reading instance credentials (the 2019 Capital One breach used IMDSv1). Enforce it account-wide with the EC2 default <code>HttpTokens=required</code> setting.</p>
      <p><b>What a leaked key usually does first</b>: <code>GetCallerIdentity</code>, <code>ListBuckets</code>, <code>DescribeRegions</code>, then <code>RunInstances</code> of large GPU types in regions you never use (crypto-mining), or <code>CreateUser</code> + <code>CreateAccessKey</code> for persistence. That is why the CloudTrail search must cover all regions and IAM changes.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> coding assistants read your repository and terminal. That is a new place for keys to leak: a <code>.env</code> file pasted into a prompt, or an agent that prints <code>env</code> into a log. Give agents their own short-lived role, keep secrets out of the files they can read, and turn on secret scanning with <b>push protection</b> so a committed <code>AKIA</code> string is blocked before it reaches GitHub.</p>
      <p><b>Use AI well:</b> it is excellent at writing trust policies (OIDC <code>sub</code> conditions are fiddly), converting a script from static keys to <code>AssumeRole</code>, and summarising a CloudTrail export during a leak investigation ("list every event by this key id, grouped by region and event name"). Check two things it gets wrong often: <code>StringLike</code> with <code>repo:org/*</code> trusts <b>every</b> repo in the org, and an OIDC trust policy without an <code>aud</code>/<code>sub</code> condition trusts every GitHub user on the planet.</p>`,
    problems: [P({
      t: 'A leaked access key in a public repo: the first hour', l: 'Medium', tags: ['iam', 'incident response', 'access keys', 'cloudtrail'], co: ['AWS', 'GitHub', 'Infosys'], c: LABIAM,
      s: `<p>At 09:12 GitHub secret scanning emails you: an access key id starting with <code>AKIA</code> belonging to IAM user <code>ci-deployer</code> in account <code>123456789012</code> was pushed to a <b>public</b> repository at 08:55. The CI pipeline uses this key to deploy. Write the response: what you do, in which order, the commands, and how you stop it happening again.</p>`,
      ex: `<p>Good outcome: key ${H.c('r', 'Inactive')} by 09:15, attacker sessions revoked, CloudTrail shows ${H.c('y', '3 calls from an unknown IP: GetCallerIdentity, ListBuckets, RunInstances in ap-south-1')}, the instance is terminated, and the pipeline now uses ${H.c('g', 'OIDC + a role')} with no stored key.</p>`,
      bw: `<p>Deleting the commit and force-pushing, then carrying on. Bots copy public keys within minutes, so removing it from Git does not un-leak it. Equally bad: deleting the key before looking at CloudTrail and never checking other regions, so the crypto-miner the attacker started in ap-south-1 runs for a month.</p>`,
      q: ['What is the very first action?', ['Deactivate the key with update-access-key --status Inactive', 'Rewrite Git history to remove the key', 'Email the developer who pushed it', 'Open a support case and wait'], 0, 'Containment first: an inactive key stops new API calls within seconds and, unlike deletion, can be re-enabled if you find something critical still depends on it. Then revoke sessions, investigate and rotate.'],
      h: ['<p>Hint 1: think contain → investigate → eradicate → recover → learn. Containment is measured in minutes.</p>', '<p>Hint 2: deactivating the key does not kill temporary credentials the attacker may have minted. Add a deny for tokens issued before now.</p>', '<p>Hint 3: in CloudTrail, look up events by <code>AccessKeyId</code> in every enabled region, and look for IAM persistence (CreateUser, CreateAccessKey, AttachUserPolicy) and compute (RunInstances).</p>'],
      a: `<p><b>1. Contain (minutes).</b> Deactivate the key: <code>aws iam update-access-key --status Inactive</code>. Do not delete it yet: you need its id for the investigation and may have to reactivate briefly if production deploys break. Attach an inline Deny-all to <code>ci-deployer</code> with <code>aws:TokenIssueTime</code> earlier than now, so any session tokens the attacker created also die. Pause the pipeline. <b>2. Investigate.</b> <code>get-access-key-last-used</code> shows the last service and region. Then <code>cloudtrail lookup-events</code> by AccessKeyId <b>in every region</b>: what was called, from which source IP, and what was created (users, keys, roles, policies, instances, Lambda functions, snapshots shared out). Check billing and Trusted Advisor/GuardDuty findings. <b>3. Eradicate.</b> Delete anything the attacker created (users and their keys, instances, roles), and undo policy changes. <b>4. Recover.</b> Do not just create a new key: move the pipeline to an OIDC role (no secret), then delete the old key and, if nothing else needs it, the IAM user. <b>5. Learn.</b> Remove the key from the repo history anyway (it is still compromised), enable secret scanning push protection on the org, add an SCP or Config rule alerting on new access keys, and write a short blameless postmortem.</p>`,
      code: R`#!/usr/bin/env bash
# usage: ./leaked-key.sh AKIA_KEY_ID   (pass the key id as an argument; never paste a secret)
set -euo pipefail
KEY_ID="$1"; U=ci-deployer
NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)

# 1. Contain: deactivate the key (reversible), then revoke any sessions minted before now
aws iam update-access-key --user-name "$U" --access-key-id "$KEY_ID" --status Inactive
cat > revoke.json <<JSON
{"Version": "2012-10-17", "Statement": [{"Effect": "Deny", "Action": "*", "Resource": "*",
  "Condition": {"DateLessThan": {"aws:TokenIssueTime": "$NOW"}}}]}
JSON
aws iam put-user-policy --user-name "$U" --policy-name RevokeOldSessions --policy-document file://revoke.json

# 2. Investigate: last use, then every event by this key in every enabled region
aws iam get-access-key-last-used --access-key-id "$KEY_ID"
for R in $(aws ec2 describe-regions --query 'Regions[].RegionName' --output text); do
  echo "== $R"
  aws cloudtrail lookup-events --region "$R" --max-results 50 \
    --lookup-attributes AttributeKey=AccessKeyId,AttributeValue="$KEY_ID" \
    --query 'Events[].[EventTime,EventName,EventSource]' --output text
done
# Persistence checks: new users or keys created recently
aws iam list-users --query 'Users[].[UserName,CreateDate]' --output table

# 3/4. After clean-up and moving CI to an OIDC role: delete the key and the user's policies
aws iam delete-access-key --user-name "$U" --access-key-id "$KEY_ID"`,
      cx: `<p>Containment in under 5 minutes; a full regional CloudTrail sweep in 10-20 minutes. The lasting fix (OIDC) removes the class of problem, not just this key.</p>`,
      f: ['CloudTrail shows RunInstances in a region you never use. What do you check next and how do you prevent it account-wide?', 'Why is "lookup-events" limited, and when would you query CloudTrail Lake or Athena instead?']
    })]
  });

  // ───────────────────────── Topic 4: VPC / VNet design and subnets ─────────────────────────
  topics.push({
    title: 'VPC and VNet Design: CIDR Choice, Availability Zones and Subnet Tiers',
    analogy: `<p>A VPC is a <b>fenced plot of land</b> you rent inside a huge city (the AWS region). You choose the plot's address range once, so choose big enough: you cannot easily move the fence later. Inside, you draw <b>streets</b> (subnets). Each street sits in exactly one <b>neighbourhood</b> (an Availability Zone, a separate data centre group with its own power). You build the same streets in two neighbourhoods, so a flood in one does not close your shop. Some streets face the main road (public subnets); others are behind the building with no front door (private subnets).</p>`,
    explain: `<p>🟢 <b>A VPC (Virtual Private Cloud)</b> is your own private network in one AWS <b>region</b>, defined by a CIDR block such as <code>10.20.0.0/16</code> (65,536 addresses; the maths is in <b>Cloud &amp; DevOps 3</b>). A <b>subnet</b> is a slice of that range that lives in <b>one Availability Zone</b>. Instances, databases and load balancers get their private IPs from a subnet.</p>
      <p>🟢 <b>Four design decisions, made once:</b></p>
      ${H.table(['Decision', 'Good default', 'Why'], [
        ['VPC CIDR', 'a <b>/16</b> from 10.0.0.0/8 that no other VPC, office or partner uses', 'overlapping ranges cannot be peered or routed together later'],
        ['How many AZs', '<b>2</b> for most apps, 3 for critical ones', 'one AZ failure must not take the app down; load balancers need 2'],
        ['Tiers', '<b>public</b> (load balancers, NAT), <b>app</b> (private), <b>data</b> (private, isolated)', 'each tier gets its own route table and security rules'],
        ['Subnet size', '/24 (251 usable in AWS) or larger for app tiers', 'auto-scaling, rolling deploys, Lambda ENIs and Kubernetes pods eat IPs']
      ])}
      <p>🔵 <b>Public vs private is decided by routing, not by the subnet's name</b> (you saw the theory in Cloud &amp; DevOps 3; the next topic builds it). A subnet whose route table sends <code>0.0.0.0/0</code> to an internet gateway is public. Everything else is private.</p>
      <p>🔵 <b>A tidy layout</b> for <code>10.20.0.0/16</code> across two AZs, with gaps left for a third AZ and future tiers:</p>
      ${H.table(['Subnet', 'AZ', 'CIDR', 'Usable (AWS)', 'Holds'], [
        ['public-a', 'us-east-1a', '10.20.0.0/24', '251', 'ALB nodes, NAT gateway A'],
        ['public-b', 'us-east-1b', '10.20.1.0/24', '251', 'ALB nodes, NAT gateway B'],
        ['app-a', 'us-east-1a', '10.20.10.0/23', '507', 'web/app instances, containers'],
        ['app-b', 'us-east-1b', '10.20.12.0/23', '507', 'web/app instances, containers'],
        ['db-a', 'us-east-1a', '10.20.20.0/24', '251', 'RDS primary / replicas'],
        ['db-b', 'us-east-1b', '10.20.21.0/24', '251', 'RDS standby']
      ])}
      <p>🔵 <b>AZ names are per account.</b> <code>us-east-1a</code> in your account may be a different physical zone from <code>us-east-1a</code> in another account. When two accounts must line up (shared services, latency), use <b>AZ IDs</b> such as <code>use1-az1</code>.</p>
      <h4>Same idea on other clouds</h4>
      ${H.table(['AWS', 'Azure', 'Google Cloud'], [
        ['VPC: one region', '<b>VNet</b>: one region', '<b>VPC network: global</b> (one network spans every region)'],
        ['Subnet: one AZ', 'Subnet: <b>spans all zones</b> of the region; you pick the zone per VM', 'Subnet: <b>one region</b>, spans its zones'],
        ['5 reserved IPs per subnet', '5 reserved IPs per subnet', '4 reserved IPs per subnet'],
        ['Default VPC in every region', 'no default VNet', '"default" auto-mode network (delete it in production)'],
        ['VPC peering / Transit Gateway', 'VNet peering / Virtual WAN', 'VPC peering / Network Connectivity Center, Shared VPC']
      ])}`,
    clues: [
      '"we will connect to the office / another VPC later" → pick a CIDR that overlaps nothing, ideally from a central IPAM plan',
      '"highly available" / "survive an AZ outage" → the same subnets in at least two AZs, plus a load balancer across them',
      '"InsufficientFreeAddressesInSubnet" / "pods stuck: no IPs" → subnets too small; add a secondary CIDR or bigger subnets',
      '"which subnet is public?" → read its route table, not its name',
      '"Azure VNet subnet in a zone?" → Azure subnets are regional and span zones; AWS subnets are zonal',
      '"GCP VPC per region?" → no: a GCP VPC is global; subnets are regional'
    ],
    code: [R`# Lab: create the VPC and six subnets (all free). Region us-east-1, profile lab.
export AWS_PROFILE=lab AWS_REGION=us-east-1

# Physical zone ids help line up accounts; names are shuffled per account
aws ec2 describe-availability-zones --query 'AvailabilityZones[].[ZoneName,ZoneId]' --output text

VPC=$(aws ec2 create-vpc --cidr-block 10.20.0.0/16 \
  --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=lab-vpc}]' \
  --query Vpc.VpcId --output text)
# DNS names for instances (needed by many services and private endpoints)
aws ec2 modify-vpc-attribute --vpc-id "$VPC" --enable-dns-support '{"Value":true}'
aws ec2 modify-vpc-attribute --vpc-id "$VPC" --enable-dns-hostnames '{"Value":true}'

mk() {  # mk NAME CIDR AZ  -> prints the subnet id
  aws ec2 create-subnet --vpc-id "$VPC" --cidr-block "$2" --availability-zone "$3" \
    --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=$1}]" \
    --query Subnet.SubnetId --output text
}
PUB_A=$(mk public-a 10.20.0.0/24 us-east-1a);  PUB_B=$(mk public-b 10.20.1.0/24 us-east-1b)
APP_A=$(mk app-a 10.20.10.0/23 us-east-1a);    APP_B=$(mk app-b 10.20.12.0/23 us-east-1b)
DB_A=$(mk db-a 10.20.20.0/24 us-east-1a);      DB_B=$(mk db-b 10.20.21.0/24 us-east-1b)

aws ec2 describe-subnets --filters Name=vpc-id,Values="$VPC" \
  --query 'Subnets[].[Tags[?Key==` + "`Name`" + R`]|[0].Value,CidrBlock,AvailabilityZone,AvailableIpAddressCount]' --output table`],
    codeTitle: ['Create a VPC with three tiers in two AZs'],
    viz: [{
      title: 'Carve a VPC into tiers across Availability Zones',
      input: '10.20.0.0/16 azs=2 tiers=public,app,db subnet=24',
      inputLabel: 'VPC_CIDR azs=1-4 tiers=comma list subnet=PREFIX (16-28)',
      gen: function (input) {
        var parts = String(input || '').trim().split(/\s+/);
        var v = cidr(parts[0] || '');
        var o = { azs: '2', tiers: 'public,app,db', subnet: '24' };
        parts.slice(1).forEach(function (kv) {
          var m = kv.match(/^(azs|tiers|subnet)=(\S+)$/);
          if (!m) throw new Error('Use: 10.20.0.0/16 azs=2 tiers=public,app,db subnet=24');
          o[m[1]] = m[2];
        });
        var azs = Number(o.azs), sp = Number(o.subnet), tiers = o.tiers.split(',').filter(Boolean);
        if (!(azs >= 1 && azs <= 4)) throw new Error('azs must be 1 to 4');
        if (!tiers.length || tiers.length > 5) throw new Error('give 1 to 5 tiers');
        if (v.p < 16 || v.p > 28) throw new Error('AWS VPC blocks must be /16 to /28');
        if (!(sp >= v.p && sp <= 28)) throw new Error('subnet prefix must be between the VPC prefix and /28');
        var stride = 1; while (stride < Math.max(azs, 4)) stride *= 2;   // leave room for more AZs
        var total = Math.pow(2, sp - v.p);
        if (tiers.length * stride > total) throw new Error('Not enough room: ' + tiers.length + ' tiers x ' + stride + ' slots needs ' + (tiers.length * stride) + ' /' + sp + ' blocks but the VPC holds ' + total + '. Use smaller subnets (a bigger prefix such as /26), a bigger VPC, or fewer tiers');
        var size = Math.pow(2, 32 - sp), AZ = ['a', 'b', 'c', 'd'];
        var grid = tiers.map(function () { return AZ.slice(0, azs).map(function () { return '-'; }); });
        var f = [];
        f.push({ narr: 'The VPC <b>' + v.text + '</b> holds ' + v.size.toLocaleString('en-US') + ' addresses, room for ' + total + ' subnets of /' + sp + ' (' + size + ' addresses each, ' + (size - 5) + ' usable in AWS). We give each tier a block of ' + stride + ' slots so a future AZ fits next to its siblings.', parts: [
          { type: 'vars', label: 'plan', vals: { VPC: v.text, 'subnet size': '/' + sp + ' = ' + size + ' IPs', 'usable per subnet': size - 5, 'slots per tier': stride, AZs: azs } },
          { type: 'grid', label: 'tier x AZ', rows: grid.map(function (r) { return r.slice(); }), rowHead: tiers, colHead: AZ.slice(0, azs).map(function (a) { return 'AZ ' + a; }) }
        ] });
        var used = [];
        tiers.forEach(function (t, ti) {
          for (var a = 0; a < azs; a++) {
            var idx = ti * stride + a;
            var net = (v.net + idx * size) >>> 0;
            var c = n2ip(net) + '/' + sp;
            grid[ti][a] = c;
            used.push(t + '-' + AZ[a] + ' = ' + c);
            var hl = {}; hl[ti + ',' + a] = 'ok';
            var role = /pub/i.test(t) ? 'public: its route table will send 0.0.0.0/0 to the internet gateway' : /db|data/i.test(t) ? 'private and isolated: no internet route at all' : 'private: outbound internet only through a NAT gateway';
            f.push({ narr: '<b>' + H.esc(t) + '-' + AZ[a] + '</b> gets slot ' + idx + ': <code>' + c + '</code> (' + n2ip(net) + ' to ' + n2ip((net + size - 1) >>> 0) + '). It lives only in AZ ' + AZ[a] + '. Role: ' + role + '.', parts: [
              { type: 'grid', label: 'tier x AZ', rows: grid.map(function (r) { return r.slice(); }), rowHead: tiers, colHead: AZ.slice(0, azs).map(function (x) { return 'AZ ' + x; }), hl: hl },
              { type: 'vars', label: 'AWS reserves 5 in this subnet', vals: { network: n2ip(net), 'VPC router': n2ip(net + 1), DNS: n2ip(net + 2), 'future use': n2ip(net + 3), last: n2ip((net + size - 1) >>> 0) } }
            ] });
          }
        });
        var free = total - tiers.length * azs;
        f.push({ narr: 'Done: ' + (tiers.length * azs) + ' subnets, ' + free + ' /' + sp + ' slots still free for new tiers, a third AZ or secondary uses. Every tier exists in every AZ, so losing one AZ loses only half the capacity, never a whole tier.', parts: [
          { type: 'grid', label: 'final layout', rows: grid.map(function (r) { return r.slice(); }), rowHead: tiers, colHead: AZ.slice(0, azs).map(function (x) { return 'AZ ' + x; }) },
          { type: 'set', label: 'create-subnet calls to run', items: used }
        ] });
        f.push({ narr: 'Next step: subnets alone route nothing to the internet. Each tier needs a <b>route table</b>: public → internet gateway, app → NAT gateway in the same AZ, db → local only. That is the next topic.', parts: [
          { type: 'table', label: 'route tables to create', columns: ['route table', 'associated subnets', 'default route'], rows: tiers.map(function (t) { return [t + '-rt' + (/pub/i.test(t) ? '' : ' (one per AZ if NAT)'), AZ.slice(0, azs).map(function (a) { return t + '-' + a; }).join(', '), /pub/i.test(t) ? '0.0.0.0/0 → igw' : /db|data/i.test(t) ? '(none)' : '0.0.0.0/0 → nat in same AZ']; }) }
        ] });
        return f;
      }
    }],
    examples: [
      { title: 'The overlap you only discover at peering time', html: `<p>Two teams both created VPCs with the console default <code>10.0.0.0/16</code>. A year later they need to talk. Peering and Transit Gateway refuse overlapping ranges, and NAT tricks between them are painful. The fix is a re-IP (new VPC, migrate) or a private NAT gateway. Prevent it with a central plan: give each account/region a non-overlapping block (for example <code>10.20.0.0/16</code> dev, <code>10.30.0.0/16</code> prod, <code>10.100.0.0/16</code> offices) and track it in <b>Amazon VPC IPAM</b> or a simple spreadsheet. Check overlaps with the Python <code>ipaddress</code> code from Cloud &amp; DevOps 3.</p>` },
      { title: 'Subnets too small for containers', html: `<p>An EKS cluster in two /26 app subnets (59 usable each) stops scheduling pods: with the AWS VPC CNI each pod takes a real VPC IP. 20 nodes × 30 pods = 600 IPs needed, 118 available. Fixes: add a <b>secondary CIDR</b> (for example <code>100.64.0.0/16</code>, a range often used for pods) with new subnets, enable prefix delegation, or rebuild with /20 app subnets. Lesson: size app subnets for the peak during a rolling deploy, not for today's instance count.</p>`, code: R`aws ec2 associate-vpc-cidr-block --vpc-id "$VPC" --cidr-block 100.64.0.0/16
aws ec2 describe-subnets --filters Name=vpc-id,Values="$VPC" \
  --query 'Subnets[].[SubnetId,CidrBlock,AvailableIpAddressCount]' --output table` },
      { title: 'The default VPC is not your production network', html: `<p>Every AWS region has a <b>default VPC</b> (<code>172.31.0.0/16</code>) whose subnets are all <b>public</b> and auto-assign public IPs. That is convenient for a first test and dangerous for a database: anything launched there without thinking gets a public address. In production, build your own VPC with private tiers, and many companies delete default VPCs in every region (or block their use with an SCP).</p>`, code: R`aws ec2 describe-vpcs --filters Name=is-default,Values=true \
  --query 'Vpcs[].[VpcId,CidrBlock]' --output text
aws ec2 describe-subnets --filters Name=default-for-az,Values=true \
  --query 'Subnets[].[SubnetId,MapPublicIpOnLaunch]' --output text   # True = public IP on launch` }
    ],
    deepDive: `<p>🟣 <b>Limits and knobs.</b> A VPC's primary CIDR is /16 to /28 and cannot be changed, but you can add up to 4 secondary IPv4 CIDRs by default (raisable). Default quota: 5 VPCs per region and 200 subnets per VPC. Subnets cannot span AZs and cannot be resized: plan, or add new ones.</p>
      <p><b>IPv6 dual stack.</b> AWS can give a VPC a /56 of globally unique IPv6 and each subnet a /64. IPv6 has no NAT: a subnet is public for IPv6 if its route table sends <code>::/0</code> to the internet gateway; for outbound-only IPv6 use an <b>egress-only internet gateway</b>. With public IPv4 addresses billed per hour since 2024, dual stack and IPv6-only subnets are increasingly common.</p>
      <p><b>DNS inside the VPC.</b> The resolver lives at the VPC base + 2 (for 10.20.0.0/16 that is 10.20.0.2) and at 169.254.169.253. <code>enableDnsSupport</code> turns it on, <code>enableDnsHostnames</code> gives instances names; private hosted zones and interface endpoints need both.</p>
      <p><b>Multi-account shape.</b> Larger companies use one VPC per account per region, a <b>Transit Gateway</b> hub, central egress (shared NAT and firewall) and <b>shared VPCs</b> through AWS RAM, where a networking team owns the subnets and app accounts launch into them. The CIDR plan is then an organisation-wide document.</p>
      <p><b>Azure and GCP differences that bite.</b> Azure reserves the first four and the last address, requires a dedicated <code>GatewaySubnet</code> for VPN gateways and <code>AzureFirewallSubnet</code> for the firewall. GCP custom-mode VPCs let you add subnets per region as you expand; auto-mode creates one in every region with fixed ranges that often overlap with other auto-mode networks.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> generating a subnet plan is a perfect AI task: give it the VPC CIDR, AZ count, tiers and expected peak IP use, and it produces a table plus the CLI or Terraform in seconds. It is also good at spotting overlaps in a long list of existing ranges.</p>
      <p><b>Check its work:</b> models regularly produce subnets that overlap each other, forget the 5 reserved addresses, or put a subnet "in two AZs" (impossible in AWS). Verify every plan with a few lines of Python <code>ipaddress</code> (Cloud &amp; DevOps 3) before creating anything. And give the assistant the organisation's IPAM allocations as input; it cannot know which 10.x ranges your offices already use.</p>`,
    problems: [P({
      t: 'Design subnets and route tables for a two-tier app across 2 AZs', l: 'Medium', tags: ['vpc', 'subnets', 'route tables', 'high availability'], co: ['AWS', 'Accenture', 'Thoughtworks'],
      s: `<p>Design the network for a web app: an internet-facing <b>Application Load Balancer</b>, up to 120 app instances at peak during deploys, and a PostgreSQL database with a standby. Requirements: survive the loss of one AZ in <code>us-east-1</code>; nothing except the load balancer is reachable from the internet; app instances must download OS updates; the database must have <b>no</b> internet path at all; the VPC must not overlap the office range <code>10.0.0.0/16</code>. Give the VPC CIDR, every subnet (name, AZ, CIDR), every route table with its routes and associations, and the gateways.</p>`,
      ex: `<p>A failure test: shut AZ b. ${H.c('g', 'public-a, app-a, db-a and NAT-a still work')}, the ALB sends traffic to app-a, and RDS fails over to db-a. If both app route tables pointed at a single NAT in AZ b, app-a would ${H.c('r', 'lose updates')} too.</p>`,
      bw: `<p>One public /24 subnet holding the ALB, the instances and the database, with public IPs on everything. It is the simplest thing that runs, but one AZ outage kills it, the database is one security-group mistake away from the internet, and 120 instances plus ALB nodes do not fit.</p>`,
      q: ['How many NAT gateways for this design?', ['Two: one per AZ, each app subnet routing to the NAT in its own AZ', 'One for the whole VPC', 'One per subnet (six)', 'None: use the internet gateway for app subnets'], 0, 'A NAT gateway lives in one AZ. One per AZ keeps egress working when an AZ fails and avoids cross-AZ data charges. One NAT is cheaper and acceptable for dev, but it is a single point of failure.'],
      h: ['<p>Hint 1: three tiers × two AZs = six subnets. Size app subnets for the peak (120 + headroom): /24 has 251 usable, /23 has 507.</p>', '<p>Hint 2: route tables: one public table shared by both public subnets; one app table <b>per AZ</b> (because the NAT target differs); one db table with only the local route.</p>', '<p>Hint 3: write it as a table, then check: no overlap with 10.0.0.0/16, every subnet inside the VPC, each app route table targets the NAT in its own AZ.</p>'],
      a: `<p><b>VPC</b> <code>10.20.0.0/16</code> (does not overlap the office's 10.0.0.0/16). <b>Subnets:</b> public-a <code>10.20.0.0/24</code> (us-east-1a), public-b <code>10.20.1.0/24</code> (1b): ALB nodes and NAT gateways. app-a <code>10.20.10.0/23</code> (1a), app-b <code>10.20.12.0/23</code> (1b): 507 usable each, so one AZ alone can hold the whole peak. db-a <code>10.20.20.0/24</code>, db-b <code>10.20.21.0/24</code>: an RDS DB subnet group across both. <b>Gateways:</b> one internet gateway attached to the VPC; NAT-a in public-a and NAT-b in public-b, each with an Elastic IP. <b>Route tables:</b> <code>public-rt</code>: 10.20.0.0/16 → local, 0.0.0.0/0 → igw; associated with public-a and public-b. <code>app-rt-a</code>: local + 0.0.0.0/0 → NAT-a; associated with app-a. <code>app-rt-b</code>: local + 0.0.0.0/0 → NAT-b; associated with app-b. <code>db-rt</code>: local only; associated with db-a and db-b (no internet path: a DB with a public IP still could not reach out). Leave the main route table with only the local route so a forgotten subnet is private by default. <b>Add-ons:</b> an S3 gateway endpoint on both app tables (free, takes S3 traffic off the NAT) and security groups alb → app → db (topic 6). <b>Cost note:</b> two NAT gateways cost about USD 65/month before data; dev environments often use one.</p>`,
      code: R`# Route tables for the design (subnet, IGW and NAT ids come from the earlier steps)
rt() { aws ec2 create-route-table --vpc-id "$VPC" \
  --tag-specifications "ResourceType=route-table,Tags=[{Key=Name,Value=$1}]" \
  --query RouteTable.RouteTableId --output text; }
PUB_RT=$(rt public-rt); APP_RT_A=$(rt app-rt-a); APP_RT_B=$(rt app-rt-b); DB_RT=$(rt db-rt)

aws ec2 create-route --route-table-id "$PUB_RT"   --destination-cidr-block 0.0.0.0/0 --gateway-id "$IGW"
aws ec2 create-route --route-table-id "$APP_RT_A" --destination-cidr-block 0.0.0.0/0 --nat-gateway-id "$NAT_A"
aws ec2 create-route --route-table-id "$APP_RT_B" --destination-cidr-block 0.0.0.0/0 --nat-gateway-id "$NAT_B"
# db-rt: no extra routes. The 10.20.0.0/16 -> local route exists in every table automatically.

for S in "$PUB_A" "$PUB_B"; do aws ec2 associate-route-table --route-table-id "$PUB_RT" --subnet-id "$S"; done
aws ec2 associate-route-table --route-table-id "$APP_RT_A" --subnet-id "$APP_A"
aws ec2 associate-route-table --route-table-id "$APP_RT_B" --subnet-id "$APP_B"
for S in "$DB_A" "$DB_B"; do aws ec2 associate-route-table --route-table-id "$DB_RT" --subnet-id "$S"; done`,
      cx: `<p>6 subnets, 4 route tables, 1 IGW, 2 NAT gateways. All free except the NAT gateways and their Elastic IPs (hourly).</p>`,
      f: ['How does the plan change for three AZs?', 'The database team wants to download extensions from the internet. What do you offer instead of a NAT route?']
    })]
  });

  // ───────────────────────── Topic 5: route tables, internet gateways, NAT gateways ─────────────────────────
  topics.push({
    title: 'Route Tables, Internet Gateways and NAT Gateways: Why the Private Instance Cannot Download Updates',
    analogy: `<p>Every subnet has a <b>signpost at its exit</b> (the route table). The VPC router reads the signpost for every packet: "anything for 10.20.x.x stays on the estate (local); everything else goes to <b>the main gate</b>". The <b>internet gateway</b> is the main gate: it lets people in and out, but only if they carry a public name badge (a public IP). The <b>NAT gateway</b> is a <b>courier desk</b> in the front building: people in the back offices hand their outgoing letters to the courier, who sends them with the company's return address and passes the replies back. Strangers can never use the courier desk to walk into the back offices.</p>`,
    explain: `<p>🟢 <b>A route table</b> is a list of <i>destination → target</i> rules. Every VPC route table automatically contains <code>VPC_CIDR → local</code> (you cannot delete it), so all subnets in a VPC can reach each other unless a security group or NACL stops them. The most specific matching route wins (longest prefix match, from Cloud &amp; DevOps 3).</p>
      <p>🟢 <b>Each subnet uses exactly one route table.</b> You <b>associate</b> it explicitly; a subnet with no association silently uses the VPC's <b>main route table</b>. A route table can serve many subnets.</p>
      ${H.table(['Target', 'What it does', 'Needs', 'Cost'], [
        ['<code>local</code>', 'delivers inside the VPC', 'nothing', 'free (cross-AZ traffic is billed per GB)'],
        ['<b>Internet gateway</b> <code>igw-</code>', 'two-way internet; 1:1 NAT between an instance\'s private IP and its <b>public IP</b>', 'attached to the VPC + a route + the instance must have a public IPv4 (or IPv6)', 'gateway free; each public IPv4 about USD 0.005/hour'],
        ['<b>NAT gateway</b> <code>nat-</code>', '<b>outbound-only</b> internet for private subnets; many instances share its Elastic IP', 'lives in a <b>public</b> subnet, has an Elastic IP; private route <code>0.0.0.0/0 → nat</code>', '<b>about USD 0.045/hour (~USD 32/month) + USD 0.045 per GB processed</b> in us-east-1'],
        ['<b>Gateway endpoint</b> (S3, DynamoDB)', 'private path to S3/DynamoDB via a prefix-list route', 'endpoint + route table association', 'free'],
        ['Peering / Transit Gateway / VPN', 'other networks', 'non-overlapping CIDRs', 'per hour and / or per GB']
      ])}
      <p>🔵 <b>Public subnet</b> = route <code>0.0.0.0/0 → igw</code>. <b>Private subnet with egress</b> = <code>0.0.0.0/0 → nat</code>. <b>Isolated subnet</b> = local only. The NAT gateway itself must sit in a public subnet, because its own outbound traffic leaves through the internet gateway.</p>
      <p>🔵 <b>The classic ticket: "the instance in the private subnet cannot run <code>dnf update</code> / <code>apt-get update</code>"</b>. Symptoms: the command hangs and times out. Walk the path in order:</p>
      <ol><li>Which route table is the instance's subnet <b>actually</b> associated with? (main by accident?)</li><li>Does it have <code>0.0.0.0/0 → nat-...</code>? Is that route <b>active</b> or <b>blackhole</b> (NAT deleted)?</li><li>Is the NAT gateway <code>available</code>, and is it in a <b>public</b> subnet whose route table has <code>0.0.0.0/0 → igw</code>?</li><li>Does the instance's <b>security group</b> allow outbound 80/443 (default: all outbound allowed)?</li><li>Does a <b>NACL</b> on either subnet block outbound 80/443 or the inbound replies on ephemeral ports 1024-65535 (next topic)?</li><li>DNS: can it resolve the mirror name? (VPC DNS settings, custom DHCP options)</li></ol>
      <h4>Same idea on other clouds</h4>
      ${H.table(['AWS', 'Azure', 'Google Cloud'], [
        ['Route table + association', 'Route table with <b>user-defined routes</b> (UDR), associated to subnets; system routes always exist', 'Routes belong to the VPC network, scoped with tags or applied to all instances'],
        ['Internet gateway', 'implicit: system route <code>0.0.0.0/0 → Internet</code> plus a public IP', 'default route <code>0.0.0.0/0 → default-internet-gateway</code> plus an external IP'],
        ['NAT gateway (per AZ, in a public subnet)', '<b>Azure NAT Gateway</b> attached to subnets (implicit default outbound access is being retired: plan for explicit NAT)', '<b>Cloud NAT</b> on a Cloud Router: regional, software-defined, no NAT VM'],
        ['Gateway endpoint for S3', 'Service endpoints / Private Endpoint for Storage', 'Private Google Access on the subnet'],
        ['Blackhole route', 'route next hop <code>None</code>', 'deleted next-hop instance makes the route inactive']
      ])}`,
    clues: [
      '"private instance cannot download updates / reach an API" → route table association → <code>0.0.0.0/0 → nat</code> active? → NAT in a public subnet → SG/NACL egress',
      '"route state: blackhole" → the target (NAT, instance, ENI) was deleted; point the route at a live target',
      '"instance in a public subnet has no internet" → missing public IP, or the subnet is really using the main route table',
      '"big NAT gateway bill" → S3/DynamoDB gateway endpoints, interface endpoints for ECR, one NAT per AZ, check per-GB charges',
      '"NAT gateway in the private subnet" → its own traffic has no route to the igw: move it to a public subnet',
      '"survive AZ failure for egress" → one NAT gateway per AZ, and each private route table points at the NAT in its own AZ'
    ],
    code: [R`# Lab (COSTS MONEY: the NAT gateway and Elastic IP bill per hour, about USD 0.05/hour together).
# Continues from the VPC/subnet lab: VPC, PUB_A, APP_A are set. Clean up at the end.
export AWS_PROFILE=lab AWS_REGION=us-east-1

# 1. Internet gateway: create and attach to the VPC
IGW=$(aws ec2 create-internet-gateway --query InternetGateway.InternetGatewayId --output text)
aws ec2 attach-internet-gateway --internet-gateway-id "$IGW" --vpc-id "$VPC"

# 2. Public route table: 0.0.0.0/0 -> igw, associated with the public subnet
PUB_RT=$(aws ec2 create-route-table --vpc-id "$VPC" --query RouteTable.RouteTableId --output text)
aws ec2 create-route --route-table-id "$PUB_RT" --destination-cidr-block 0.0.0.0/0 --gateway-id "$IGW"
aws ec2 associate-route-table --route-table-id "$PUB_RT" --subnet-id "$PUB_A"

# 3. NAT gateway with an Elastic IP, in the PUBLIC subnet; wait until it is available (1-3 min)
EIP=$(aws ec2 allocate-address --domain vpc --query AllocationId --output text)
NAT=$(aws ec2 create-nat-gateway --subnet-id "$PUB_A" --allocation-id "$EIP" \
  --query NatGateway.NatGatewayId --output text)
aws ec2 wait nat-gateway-available --nat-gateway-ids "$NAT"

# 4. Private route table: 0.0.0.0/0 -> nat, associated with the app subnet
APP_RT=$(aws ec2 create-route-table --vpc-id "$VPC" --query RouteTable.RouteTableId --output text)
aws ec2 create-route --route-table-id "$APP_RT" --destination-cidr-block 0.0.0.0/0 --nat-gateway-id "$NAT"
aws ec2 associate-route-table --route-table-id "$APP_RT" --subnet-id "$APP_A"

# 5. Free win: S3 gateway endpoint, so S3 traffic skips the NAT's per-GB charge
aws ec2 create-vpc-endpoint --vpc-id "$VPC" --service-name com.amazonaws.us-east-1.s3 \
  --route-table-ids "$APP_RT"

# 6. Inspect: routes and their state (active / blackhole)
aws ec2 describe-route-tables --route-table-ids "$APP_RT" \
  --query 'RouteTables[0].Routes[].[DestinationCidrBlock||DestinationPrefixListId,GatewayId||NatGatewayId,State]' --output table`, R`# CLEANUP for this lab, in dependency order (stops the hourly NAT + EIP charges)
aws ec2 delete-nat-gateway --nat-gateway-id "$NAT"
aws ec2 wait nat-gateway-deleted --nat-gateway-ids "$NAT"     # must finish before the EIP can go
aws ec2 release-address --allocation-id "$EIP"
# The app route is now a 'blackhole'; delete it (or the whole table)
aws ec2 delete-route --route-table-id "$APP_RT" --destination-cidr-block 0.0.0.0/0
# Confirm nothing billable is left
aws ec2 describe-nat-gateways --filter Name=vpc-id,Values="$VPC" --query 'NatGateways[].[NatGatewayId,State]' --output text
aws ec2 describe-addresses --query 'Addresses[].[AllocationId,PublicIp,AssociationId]' --output text`],
    codeTitle: ['Internet gateway, NAT gateway with an Elastic IP, and route tables', 'Delete the NAT gateway and release the Elastic IP'],
    viz: [{
      title: 'Follow a packet out of a subnet: route table, NAT and internet gateway',
      input: 'from=app-a dest=203.0.113.10 nat=ok',
      inputLabel: 'from=public-a|app-a|db-a dest=IPv4 nat=ok|none|blackhole|in-private publicip=yes|no',
      gen: function (input) {
        var o = { from: 'app-a', dest: '203.0.113.10', nat: 'ok', publicip: 'yes' };
        String(input || '').trim().split(/\s+/).filter(Boolean).forEach(function (kv) {
          var m = kv.match(/^(from|dest|nat|publicip)=(\S+)$/);
          if (!m) throw new Error('Use from=app-a dest=203.0.113.10 nat=ok publicip=yes');
          o[m[1]] = m[2].toLowerCase();
        });
        if (['public-a', 'app-a', 'db-a'].indexOf(o.from) < 0) throw new Error('from must be public-a, app-a or db-a');
        if (['ok', 'none', 'blackhole', 'in-private'].indexOf(o.nat) < 0) throw new Error('nat must be ok, none, blackhole or in-private');
        if (['yes', 'no'].indexOf(o.publicip) < 0) throw new Error('publicip must be yes or no');
        var d = ip2n(o.dest), vpc = cidr('10.20.0.0/16');
        var srcIp = { 'public-a': '10.20.0.25', 'app-a': '10.20.10.25', 'db-a': '10.20.20.25' }[o.from];
        var tables = {
          'public-a': [['10.20.0.0/16', 'local', 'active'], ['0.0.0.0/0', 'igw-0lab', 'active']],
          'app-a': [['10.20.0.0/16', 'local', 'active']].concat(o.nat === 'none' ? [] : [['0.0.0.0/0', 'nat-0lab', o.nat === 'blackhole' ? 'blackhole' : 'active']]),
          'db-a': [['10.20.0.0/16', 'local', 'active']]
        };
        var rtName = { 'public-a': 'public-rt', 'app-a': 'app-rt-a', 'db-a': 'db-rt' }[o.from];
        var nodes = [box('I', o.from + ' instance', 8, 30, 18), box('VR', 'VPC router', 32, 30, 14), box('NAT', 'NAT gw (public-a)', 56, 12, 18), box('IGW', 'internet gw', 76, 30, 14), box('NET', 'internet ' + o.dest, 94, 30, 16), box('LOC', 'other subnet', 56, 50, 16)];
        var edges = [['I', 'VR'], ['VR', 'NAT'], ['VR', 'IGW'], ['NAT', 'IGW'], ['IGW', 'NET'], ['VR', 'LOC']];
        function g(hl, ehl) { return { type: 'graph', directed: true, height: 60, nodes: nodes, edges: edges, hl: hl || {}, ehl: ehl || {} }; }
        var f = [];
        f.push({ narr: 'The instance <b>' + srcIp + '</b> in <b>' + o.from + '</b> sends a packet to <b>' + n2ip(d) + '</b> (for example <code>dnf update</code> reaching a package mirror). First stop: the VPC router at the subnet\'s base + 1.', parts: [g({ I: 'cur' }, { 'I-VR': 'cur' }), { type: 'vars', label: 'packet', vals: { src: srcIp, dst: n2ip(d), 'src subnet': o.from } }] });
        f.push({ narr: 'The router looks up which route table is <b>associated</b> with ' + o.from + ': <code>' + rtName + '</code>. (A subnet with no explicit association would use the <b>main</b> route table, a classic surprise.)', parts: [g({ VR: 'cur' }), { type: 'table', label: rtName, columns: ['destination', 'target', 'state'], rows: tables[o.from] }] });
        var best = -1, bestLen = -1;
        tables[o.from].forEach(function (r, k) { var c = cidr(r[0]); if (inNet(d, c) && c.p > bestLen) { best = k; bestLen = c.p; } });
        if (best < 0) {
          f.push({ narr: 'No route matches ' + n2ip(d) + ': there is no <code>0.0.0.0/0</code> entry. The router <b>drops</b> the packet silently. The client sees a <b>timeout</b>, not an error. ' + (o.from === 'db-a' ? 'For a database tier this is exactly what we want: isolated.' : 'This is the "private instance cannot download updates" ticket: add <code>0.0.0.0/0 → nat-...</code> to this table.'), parts: [g({ VR: 'bad' }, { 'I-VR': 'bad' }), { type: 'table', label: rtName + ' (no match)', columns: ['destination', 'target', 'state'], rows: tables[o.from], hl: {} }] });
          f.push({ narr: 'Fix options: a NAT route for outbound internet, or a <b>VPC endpoint</b> if the instance only needs AWS services such as S3, SSM or ECR, which keeps the tier off the internet entirely.', parts: [{ type: 'table', label: 'what to add', columns: ['need', 'add to ' + rtName], rows: [['general internet egress', '0.0.0.0/0 → nat-... (NAT in a public subnet)'], ['S3 / DynamoDB only', 'gateway endpoint (prefix-list route), free'], ['SSM, ECR, CloudWatch', 'interface endpoints (hourly + per GB)']] }] });
          return f;
        }
        var route = tables[o.from][best];
        f.push({ narr: 'Longest prefix match: <code>' + route[0] + ' → ' + route[1] + '</code> wins (prefix /' + bestLen + ').', parts: [g({ VR: 'ok' }), { type: 'table', label: rtName, columns: ['destination', 'target', 'state'], rows: tables[o.from], hl: one(best, route[2] === 'blackhole' ? 'bad' : 'ok') }] });
        if (route[1] === 'local') {
          f.push({ narr: 'The destination is inside the VPC, so the router delivers it directly to the other subnet. No gateway involved. Whether it is accepted now depends on the <b>NACLs</b> of both subnets and the destination\'s <b>security group</b> (next topic).', parts: [g({ LOC: 'ok' }, { 'VR-LOC': 'ok' })] });
          f.push({ narr: 'Remember: <code>local</code> cannot be removed or overridden by a broader route. Every subnet can route to every other subnet; filtering is the job of SGs and NACLs.', parts: [{ type: 'vars', label: 'result', vals: { delivered: 'yes (routing)', next: 'NACL + SG checks' }, hl: { delivered: 'ok' } }] });
          return f;
        }
        if (route[2] === 'blackhole') {
          f.push({ narr: 'The matching route is in state <b>blackhole</b>: its target <code>nat-0lab</code> was deleted. AWS does <b>not</b> fall back to another route; the packet is dropped. Typical cause: someone deleted the NAT gateway to save money, or a Terraform destroy/recreate gave it a new id.', parts: [g({ VR: 'bad', NAT: 'bad' }, { 'VR-NAT': 'bad' }), { type: 'vars', label: 'result', vals: { delivered: 'no (blackhole)', fix: 'replace-route to a live NAT id' }, hl: { delivered: 'bad' } }] });
          f.push({ narr: 'Fix: <code>aws ec2 replace-route --route-table-id ... --destination-cidr-block 0.0.0.0/0 --nat-gateway-id nat-NEW</code>. Prevent: alarm on <code>describe-route-tables</code> showing blackhole routes.', parts: [{ type: 'table', label: 'route states', columns: ['state', 'meaning'], rows: [['active', 'target exists, traffic flows'], ['blackhole', 'target gone, traffic dropped']], hl: { 1: 'bad' } }] });
          return f;
        }
        if (route[1].indexOf('nat') === 0) {
          f.push({ narr: 'Target is the NAT gateway in <b>public-a</b>. The NAT rewrites the source from ' + srcIp + ' to its <b>Elastic IP</b> (say 198.51.100.40) and a port of its own, and remembers the mapping so the reply can find its way back.', parts: [g({ NAT: 'ok' }, { 'VR-NAT': 'ok' }), { type: 'table', label: 'NAT translation table', columns: ['inside', 'outside'], rows: [[srcIp + ':43122', '198.51.100.40:1027']], hl: { 0: 'ok' } }] });
          if (o.nat === 'in-private') {
            f.push({ narr: 'But this NAT gateway was created in a <b>private</b> subnet. Its own packets use that subnet\'s route table, which has no <code>0.0.0.0/0 → igw</code>. The traffic dies at the NAT: timeout. Fix: create the NAT in a public subnet and repoint the route.', parts: [g({ NAT: 'bad', IGW: 'done' }, { 'NAT-IGW': 'bad' }), { type: 'vars', label: 'result', vals: { delivered: 'no', reason: 'NAT subnet has no route to the IGW' }, hl: { delivered: 'bad' } }] });
            f.push({ narr: 'Rule to remember: <b>a NAT gateway is a public-subnet resource</b> that serves private subnets.', parts: [{ type: 'table', label: 'where things live', columns: ['resource', 'subnet type'], rows: [['ALB (internet-facing)', 'public'], ['NAT gateway', 'public'], ['app instances', 'private'], ['database', 'private / isolated']], hl: { 1: 'sel' } }] });
            return f;
          }
          f.push({ narr: 'The NAT\'s own subnet (public-a) routes <code>0.0.0.0/0 → igw</code>, so the translated packet leaves through the internet gateway to ' + n2ip(d) + '.', parts: [g({ IGW: 'ok', NET: 'ok' }, { 'NAT-IGW': 'ok', 'IGW-NET': 'ok' })] });
          f.push({ narr: 'The reply comes back to 198.51.100.40:1027; the NAT finds the mapping and forwards it to ' + srcIp + ':43122. A stranger sending a <b>new</b> connection to the Elastic IP finds no mapping and is dropped: outbound only. Updates download. 💸 Every GB through the NAT costs about USD 0.045, which is why S3 traffic should use the free gateway endpoint.', parts: [g({ I: 'ok', NAT: 'ok' }), { type: 'vars', label: 'result', vals: { delivered: 'yes', 'inbound from internet': 'impossible (no mapping)', cost: 'NAT hours + per GB' }, hl: { delivered: 'ok' } }] });
          return f;
        }
        // public subnet → igw
        if (o.publicip === 'no') {
          f.push({ narr: 'Target is the internet gateway, but this instance has <b>no public IPv4</b>. The IGW only does 1:1 translation for instances that have one, so the packet cannot leave with a private source address. Timeout. Fix: an Elastic IP / auto-assign public IP, or move the instance to a private subnet behind a NAT.', parts: [g({ IGW: 'bad' }, { 'VR-IGW': 'bad' }), { type: 'vars', label: 'result', vals: { delivered: 'no', reason: 'public subnet but no public IP' }, hl: { delivered: 'bad' } }] });
          f.push({ narr: 'This is why the subnet setting <code>MapPublicIpOnLaunch</code> matters for public subnets, and why it must be <b>off</b> for private ones.', parts: [{ type: 'table', label: 'public subnet checklist', columns: ['item', 'needed?'], rows: [['route 0.0.0.0/0 → igw', 'yes'], ['IGW attached to the VPC', 'yes'], ['public IP on the instance', 'yes'], ['SG / NACL allow it', 'yes']], hl: { 2: 'bad' } }] });
          return f;
        }
        f.push({ narr: 'The internet gateway swaps the private source ' + srcIp + ' for the instance\'s <b>public IP</b> (1:1) and sends it out. Replies come back the same way, and <b>new inbound</b> connections to that public IP are possible too, limited only by the security group and NACL.', parts: [g({ IGW: 'ok', NET: 'ok' }, { 'VR-IGW': 'ok', 'IGW-NET': 'ok' }), { type: 'vars', label: 'result', vals: { delivered: 'yes', 'reachable from internet': 'yes, if the SG allows', cost: 'public IPv4 hourly charge' }, hl: { delivered: 'ok' } }] });
        f.push({ narr: 'Compare the three tiers: public (two-way through the IGW), app (outbound through NAT), db (local only).', parts: [{ type: 'table', label: 'tier summary', columns: ['subnet', 'default route', 'internet'], rows: [['public-a', '0.0.0.0/0 → igw', 'two-way (needs public IP)'], ['app-a', '0.0.0.0/0 → nat', 'outbound only'], ['db-a', '(none)', 'none']], hl: { 0: 'ok' } }] });
        return f;
      }
    }],
    examples: [
      { title: 'The main route table trap', html: `<p>Someone added <code>0.0.0.0/0 → igw</code> to the VPC's <b>main</b> route table "to make the public subnet work". Every subnet without an explicit association, including the new database subnet created last week, quietly became public. Keep the main route table <b>local-only</b>, give every subnet an explicit association, and check for orphans.</p>`, code: R`# Subnets that are NOT explicitly associated (they fall back to the main route table)
aws ec2 describe-route-tables --filters Name=vpc-id,Values="$VPC" \
  --query 'RouteTables[].Associations[].SubnetId' --output text | tr '\t' '\n' | sort > associated.txt
aws ec2 describe-subnets --filters Name=vpc-id,Values="$VPC" \
  --query 'Subnets[].SubnetId' --output text | tr '\t' '\n' | sort > all.txt
comm -23 all.txt associated.txt     # these use the main table` },
      { title: 'A USD 3,000 NAT bill from S3 backups', html: `<p>Nightly backups copy 2 TB a day from private instances to S3 through the NAT gateway: 60 TB × USD 0.045/GB ≈ USD 2,700 a month in NAT processing alone. Adding an <b>S3 gateway endpoint</b> to the private route tables puts a more specific prefix-list route (<code>pl-xxxx → vpce-...</code>) in front of the <code>0.0.0.0/0 → nat</code> route. Same commands, same bucket, zero NAT charge. Interface endpoints for ECR, SSM and CloudWatch do the same for those services (they have their own smaller hourly cost).</p>`, code: R`aws ec2 create-vpc-endpoint --vpc-id "$VPC" --vpc-endpoint-type Gateway \
  --service-name com.amazonaws.us-east-1.s3 --route-table-ids "$APP_RT_A" "$APP_RT_B"` },
      { title: 'Blackhole after a "cost clean-up"', html: `<p>A FinOps script deleted "unused" NAT gateways on Friday. On Monday, every private instance's package update and external API call times out. <code>describe-route-tables</code> shows <code>0.0.0.0/0 → nat-0abc... State: blackhole</code>. Create a new NAT gateway and <code>replace-route</code>; then fix the script to check route tables before deleting anything a route points to.</p>`, code: R`aws ec2 describe-route-tables --filters Name=route.state,Values=blackhole \
  --query 'RouteTables[].[RouteTableId,Routes[?State==` + "`blackhole`" + R`].DestinationCidrBlock|[0]]' --output text
aws ec2 replace-route --route-table-id "$APP_RT" --destination-cidr-block 0.0.0.0/0 --nat-gateway-id "$NEW_NAT"` }
    ],
    deepDive: `<p>🟣 <b>NAT gateway facts that matter in production.</b> It is a managed, zonal service that scales to 100 Gbps and supports up to 55,000 simultaneous connections <b>to each unique destination</b> (IP, port, protocol) per Elastic IP; you can attach more EIPs if you hit <code>ErrorPortAllocation</code>. Idle TCP connections are closed after 350 seconds: long-lived idle connections need keepalives. It does not do inbound port forwarding and has no security group (control traffic with the instances' SGs and the subnets' NACLs).</p>
      <p><b>Private NAT gateways</b> (no EIP) translate between overlapping or non-routable private ranges via a Transit Gateway: the escape hatch for the "both VPCs are 10.0.0.0/16" problem.</p>
      <p><b>NAT instances</b> (an EC2 box with source/destination check disabled) are cheaper for tiny labs but you own patching, scaling and failover. Managed NAT is the default answer in interviews unless cost for a toy environment is the point.</p>
      <p><b>Route priority beyond prefix length.</b> When a static route and a propagated route (from a VPN or Direct Connect) have the same prefix, static routes win. Prefix-list routes (gateway endpoints) compete by the length of the matching prefix inside the list. <b>Edge associations</b> let you attach a route table to the internet gateway itself, so inbound traffic is forced through a firewall appliance first (ingress routing).</p>
      <p><b>Cost hygiene.</b> Since February 2024 every public IPv4 address (including the NAT gateway's EIP and any idle EIP) is billed hourly. A forgotten lab with one NAT gateway costs about USD 35-40 a month before any traffic. Tag lab resources, set an AWS Budgets alert, and always run the cleanup.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> paste the output of <code>describe-route-tables</code>, <code>describe-subnets</code> and <code>describe-nat-gateways</code> (ids are fine, remove account ids if you share outside the company) and an assistant can trace a packet's path faster than you can scroll, spotting the blackhole route or the NAT in the wrong subnet. <b>VPC Reachability Analyzer</b> does the same thing deterministically, and AI-assisted network troubleshooting features in cloud consoles combine both.</p>
      <p><b>The trap:</b> the quickest AI fix for "no internet" is often "add <code>0.0.0.0/0 → igw</code> and a public IP", which makes your app tier public. Always ask: does this tier need <b>inbound</b> internet? If not, the answer is NAT or a VPC endpoint, never the IGW. AI also forgets cost: ask it to estimate the monthly NAT charge for your traffic before choosing.</p>`,
    problems: [P({
      t: 'The private instance cannot download updates', l: 'Easy', tags: ['route tables', 'nat gateway', 'troubleshooting'], co: ['AWS Support', 'Rackspace', 'TCS'],
      s: `<p>An instance <code>i-0app123</code> (10.20.10.25) in subnet <code>app-a</code> hangs on <code>sudo dnf -y update</code> and finally times out. The team says "the NAT gateway is there". You find:</p><pre>subnet app-a (subnet-0appa): no explicit route table association
main route table rtb-0main:   10.20.0.0/16 local
route table app-rt-a:         10.20.0.0/16 local | 0.0.0.0/0 nat-0abc (active)   associations: none
nat-0abc: state available, subnet public-a</pre><p>Find the cause, fix it, and prove it.</p>`,
      ex: `<p>The NAT and its route are fine, but ${H.c('r', 'app-a is not associated with app-rt-a')}, so it falls back to the ${H.c('y', 'main table')}, which has no default route. Packets to the mirror match nothing and are dropped: timeout.</p>`,
      bw: `<p>Adding <code>0.0.0.0/0 → igw</code> to the main route table and a public IP to the instance. Updates would work, but the app tier and every other unassociated subnet become public, the opposite of the design.</p>`,
      q: ['A subnet has no explicit route table association. Which table does it use?', ['The VPC\'s main route table', 'None: it cannot route at all', 'The route table of the public subnet', 'The most recently created route table'], 0, 'Every subnet uses exactly one table; without an explicit association it is the main route table. That is why the main table should stay local-only.'],
      h: ['<p>Hint 1: a route that exists in some table only matters if that table is <b>associated</b> with the instance\'s subnet.</p>', '<p>Hint 2: <code>aws ec2 describe-route-tables --filters Name=association.subnet-id,Values=SUBNET</code> returns nothing when the subnet uses the main table.</p>', '<p>Hint 3: associate <code>app-rt-a</code> with <code>app-a</code>, then test from the instance (through SSM, not SSH) with <code>curl -sI https://example.com</code> and the update.</p>'],
      a: `<p><b>Cause:</b> routes live in route tables, and a subnet uses only the table it is associated with. <code>app-rt-a</code> has the correct <code>0.0.0.0/0 → nat-0abc</code>, and the NAT gateway is available in a public subnet, but nobody associated <code>app-rt-a</code> with <code>app-a</code>. The subnet therefore uses the <b>main</b> route table, which only has the local route; packets to the package mirror match nothing and are dropped silently, so <code>dnf</code> times out. <b>Fix:</b> <code>associate-route-table</code> app-rt-a ↔ app-a (one API call, no downtime). <b>Prove:</b> the association query now returns app-rt-a; from the instance, <code>curl -sI https://example.com</code> answers, <code>dnf -y update</code> works, and the NAT's <code>BytesOutToDestination</code> metric moves. <b>Also check, if it still fails:</b> the NAT's subnet routes to the IGW; SG egress allows 443/80; NACLs allow outbound 443/80 and inbound ephemeral replies; DNS resolves. <b>Prevent:</b> keep the main table local-only (already true here, which is why this failed safe) and add a check that every subnet has an explicit association.</p>`,
      code: R`SUB=subnet-0appa; RT=rtb-0appa   # ids from the ticket (examples)
# 1. Which table does the subnet really use? Empty output = the main route table
aws ec2 describe-route-tables --filters Name=association.subnet-id,Values="$SUB" \
  --query 'RouteTables[].RouteTableId' --output text
# 2. Is the NAT healthy and in a public subnet?
aws ec2 describe-nat-gateways --nat-gateway-ids nat-0abc \
  --query 'NatGateways[0].[State,SubnetId]' --output text
# 3. Fix: associate the private route table with the subnet
aws ec2 associate-route-table --route-table-id "$RT" --subnet-id "$SUB"
# 4. Prove it from the instance via SSM (no SSH or bastion needed)
aws ssm send-command --instance-ids i-0app123 --document-name AWS-RunShellScript \
  --parameters 'commands=["curl -sI https://example.com | head -n 1","sudo dnf -y check-update || true"]' \
  --query Command.CommandId --output text`,
      cx: `<p>Two describe calls find it, one association fixes it, under 10 minutes. Reachability Analyzer from the instance ENI to the internet gateway would point at the same missing route.</p>`,
      f: ['The fix worked for app-a but not app-b. What would you look at?', 'How would you stop this happening when Terraform creates new subnets?']
    })]
  });

  // ───────────────────────── Topic 6: security groups vs network ACLs in practice ─────────────────────────
  // Parse "100:allow:tcp:443:0.0.0.0/0,200:deny:all:all:198.51.100.0/24" into sorted NACL rules.
  function naclRules(txt, label) {
    var rules = String(txt || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean).map(function (r) {
      var m = r.match(/^(\d{1,5}):(allow|deny):(tcp|udp|all):(all|\d{1,5}(?:-\d{1,5})?):([\d.]+\/\d{1,2})$/i);
      if (!m) throw new Error(label + ' rule "' + r + '" should look like 100:allow:tcp:443:0.0.0.0/0 or 110:allow:tcp:1024-65535:0.0.0.0/0');
      var lo = 0, hi = 65535;
      if (m[4].toLowerCase() !== 'all') { var pr = m[4].split('-').map(Number); lo = pr[0]; hi = pr.length > 1 ? pr[1] : pr[0]; }
      if (lo > hi || hi > 65535) throw new Error('bad port range in "' + r + '"');
      return { n: Number(m[1]), act: m[2].toLowerCase(), proto: m[3].toLowerCase(), lo: lo, hi: hi, c: cidr(m[5]), text: m[1] + ' ' + m[2].toUpperCase() + ' ' + m[3] + ' ' + m[4] + ' ' + m[5] };
    });
    if (rules.length > 8) throw new Error('up to 8 rules per direction');
    rules.sort(function (a, b) { return a.n - b.n; });
    return rules;
  }
  topics.push({
    title: 'Security Groups vs Network ACLs in Practice: SG References and Ephemeral Ports',
    analogy: `<p>A <b>security group</b> is a <b>personal bodyguard</b> standing next to each server. It has a list of who may approach, it never says "no" out loud (it just blocks), and once it lets a visitor in, it lets that same visitor <b>leave</b> without asking again: it remembers the conversation (stateful). A <b>network ACL</b> is the <b>turnstile at the entrance of the whole street</b> (subnet). It reads numbered rules from the top, the first matching rule wins, and it has <b>no memory</b>: a visitor leaving must pass the outbound turnstile as if they were a stranger. If the exit turnstile only accepts people going to door 443, the reply, which goes back to the visitor's random door number, gets stuck.</p>`,
    explain: `<p>🟢 You met the theory in <b>Cloud &amp; DevOps 3</b>. Here is the side-by-side you will use every week:</p>
      ${H.table(['', 'Security group', 'Network ACL'], [
        ['Attached to', 'network interfaces (instances, ALB, RDS, Lambda in VPC)', 'subnets (one NACL per subnet)'],
        ['Rules', '<b>allow only</b>', 'allow <b>and deny</b>, numbered 1-32766'],
        ['Evaluation', 'all rules together, any match allows', 'lowest number first, <b>first match wins</b>, then the final <code>*</code> deny'],
        ['State', '<b>stateful</b>: replies are allowed automatically', '<b>stateless</b>: replies need their own rule (ephemeral ports)'],
        ['Sources', 'CIDRs, prefix lists, <b>other security groups</b>', 'CIDRs only'],
        ['Defaults', 'new SG: no inbound, all outbound; default SG: allows members of itself', 'default NACL: allow all both ways; <b>new custom NACL: deny all</b>'],
        ['Use for', 'almost all access control', 'coarse guard rails: block a range, separate tiers by CIDR']
      ])}
      <p>🟢 <b>Security groups referencing security groups.</b> Instead of "allow 5432 from 10.20.10.0/23", the database SG says "allow 5432 from <b>members of app-sg</b>". Any instance with <code>app-sg</code> attached can connect, wherever it gets its IP, and nothing else can. This is how tiers are built: <code>alb-sg</code> (443 from the internet) → <code>app-sg</code> (8080 from alb-sg) → <code>db-sg</code> (5432 from app-sg).</p>
      <p>🔵 <b>Situation: "the web tier cannot reach the database".</b> The db-sg rule says <code>5432 from sg-app</code>, but the web instances have <code>web-sg</code> attached, not <code>app-sg</code>. A SG reference matches the <b>groups on the source's network interface</b>, not its subnet or name tag. Fix: add <code>app-sg</code> to the instances (or a rule for <code>web-sg</code> if that tier should really talk to the DB). Also note: a reference only matches traffic using <b>private IPs</b> inside the VPC (or a peered VPC); connecting to a public IP or DNS name that resolves to one goes out and back in, and the reference no longer matches.</p>
      <p>🔵 <b>Situation: "the NACL blocks return traffic".</b> A client connects from <code>203.0.113.7:51544</code> to your web server's port 443. The reply goes <i>from</i> 443 <i>to</i> port <b>51544</b>. An outbound NACL rule "allow tcp 443" does not match port 51544, the final <code>*</code> denies it, and the client times out. Rule: for every allowed inbound service, allow outbound <b>TCP 1024-65535</b> to the clients; for every outbound call your servers make (updates on 443), allow <b>inbound</b> 1024-65535 for the replies. AWS recommends 1024-65535 because NAT gateways, load balancers, Linux (32768-60999) and Windows (49152-65535) all use different parts of it.</p>
      <h4>Same idea on other clouds</h4>
      ${H.table(['AWS', 'Azure', 'Google Cloud'], [
        ['Security group (stateful, allow-only, on ENI)', '<b>NSG</b>: stateful, allow and deny, priority 100-4096, on subnet <b>or</b> NIC', '<b>VPC firewall rules</b>: stateful, allow and deny, priority, applied by network tag or service account'],
        ['SG referencing an SG', '<b>Application security groups</b> (ASGs) as source / destination', 'source tags or <b>source service accounts</b>'],
        ['Network ACL (stateless, subnet)', 'no stateless equivalent; an NSG on the subnet plays the guard-rail role', 'no stateless equivalent; hierarchical firewall policies for org-wide rules'],
        ['VPC Flow Logs', 'NSG / VNet flow logs (Network Watcher)', 'VPC Flow Logs, Firewall Rules Logging'],
        ['Reachability Analyzer', 'Network Watcher IP flow verify / connection troubleshoot', 'Connectivity Tests']
      ])}`,
    clues: [
      '"timeout to the database" with a correct route → check db-sg source: CIDR or SG reference, and which SGs are actually on the client ENI',
      '"works from app servers but not from web servers" → SG reference names one group, the other tier has a different group',
      '"custom NACL, now nothing works" → new custom NACLs deny everything; add rules for both directions',
      '"inbound allowed, still timing out" on a NACL → missing outbound 1024-65535 for replies (stateless)',
      '"block one abusive IP range" → a NACL DENY with a lower number than the allows (SGs cannot deny)',
      '"which one dropped it?" → VPC Flow Logs (REJECT records) and Reachability Analyzer',
      '"Azure NSG priority / GCP firewall tags" → stateful firewalls with priorities; only AWS has the stateless NACL layer'
    ],
    code: [R`# Lab: three-tier security groups (free). VPC is set from the earlier lab.
export AWS_PROFILE=lab AWS_REGION=us-east-1
sg() { aws ec2 create-security-group --vpc-id "$VPC" --group-name "$1" --description "$2" \
  --query GroupId --output text; }
ALB_SG=$(sg alb-sg "internet-facing load balancer")
APP_SG=$(sg app-sg "app instances")
DB_SG=$(sg db-sg "postgres")

# alb-sg: HTTPS from anywhere
aws ec2 authorize-security-group-ingress --group-id "$ALB_SG" --protocol tcp --port 443 --cidr 0.0.0.0/0
# app-sg: 8080 only from members of alb-sg (an SG reference, not a CIDR)
aws ec2 authorize-security-group-ingress --group-id "$APP_SG" --protocol tcp --port 8080 --source-group "$ALB_SG"
# db-sg: 5432 only from members of app-sg; the same with the long form and a description
aws ec2 authorize-security-group-ingress --group-id "$DB_SG" --ip-permissions \
  'IpProtocol=tcp,FromPort=5432,ToPort=5432,UserIdGroupPairs=[{GroupId='"$APP_SG"',Description="app tier"}]'

aws ec2 describe-security-group-rules --filters Name=group-id,Values="$DB_SG" \
  --query 'SecurityGroupRules[].[IsEgress,IpProtocol,FromPort,ToPort,CidrIpv4,ReferencedGroupInfo.GroupId]' --output table`, R`# Lab: a custom NACL for the public subnet, with ephemeral ports in both directions (free)
ACL=$(aws ec2 create-network-acl --vpc-id "$VPC" --query NetworkAcl.NetworkAclId --output text)
e() { aws ec2 create-network-acl-entry --network-acl-id "$ACL" "$@"; }
# Inbound
e --ingress --rule-number 90  --protocol tcp --port-range From=0,To=65535 --cidr-block 192.0.2.0/24 --rule-action deny   # a known bad range
e --ingress --rule-number 100 --protocol tcp --port-range From=443,To=443 --cidr-block 0.0.0.0/0 --rule-action allow
e --ingress --rule-number 110 --protocol tcp --port-range From=1024,To=65535 --cidr-block 0.0.0.0/0 --rule-action allow  # replies to our outbound calls
# Outbound
e --egress --rule-number 100 --protocol tcp --port-range From=443,To=443 --cidr-block 0.0.0.0/0 --rule-action allow       # our calls out (NAT, updates)
e --egress --rule-number 110 --protocol tcp --port-range From=1024,To=65535 --cidr-block 0.0.0.0/0 --rule-action allow  # replies to clients
e --egress --rule-number 120 --protocol tcp --port-range From=8080,To=8080 --cidr-block 10.20.0.0/16 --rule-action allow  # ALB to app tier

# Swap the subnet from its current NACL to the new one (a subnet always has exactly one)
ASSOC=$(aws ec2 describe-network-acls --filters Name=association.subnet-id,Values="$PUB_A" \
  --query "NetworkAcls[0].Associations[?SubnetId=='$PUB_A'].NetworkAclAssociationId | [0]" --output text)
aws ec2 replace-network-acl-association --association-id "$ASSOC" --network-acl-id "$ACL"

# Who is dropping traffic? Flow logs to CloudWatch Logs (log storage is billed per GB)
aws ec2 create-flow-logs --resource-type VPC --resource-ids "$VPC" --traffic-type REJECT \
  --log-destination-type cloud-watch-logs --log-group-name /lab/vpc-flow \
  --deliver-logs-permission-arn arn:aws:iam::123456789012:role/vpc-flow-logs-role`],
    codeTitle: ['Security groups that reference each other: alb → app → db', 'A custom NACL with ephemeral ports, plus flow logs'],
    viz: [{
      title: 'Stateless NACL vs stateful SG: one HTTPS connection, both directions',
      input: 'in=100:allow:tcp:443:0.0.0.0/0 out=100:allow:tcp:443:0.0.0.0/0 port=51544',
      inputLabel: 'in=RULES out=RULES port=CLIENT_EPHEMERAL_PORT (rule = num:allow|deny:tcp|udp|all:port|lo-hi|all:CIDR, comma separated)',
      gen: function (input) {
        var o = { in: '100:allow:tcp:443:0.0.0.0/0', out: '100:allow:tcp:443:0.0.0.0/0', port: '51544' };
        String(input || '').trim().split(/\s+/).filter(Boolean).forEach(function (kv) {
          var m = kv.match(/^(in|out|port)=(\S+)$/);
          if (!m) throw new Error('Use in=100:allow:tcp:443:0.0.0.0/0 out=110:allow:tcp:1024-65535:0.0.0.0/0 port=51544');
          o[m[1]] = m[2];
        });
        var IN = naclRules(o.in, 'inbound'), OUT = naclRules(o.out, 'outbound');
        var cport = Number(o.port);
        if (!(cport >= 1024 && cport <= 65535)) throw new Error('port is the client ephemeral port, 1024-65535');
        var client = ip2n('203.0.113.7');
        function rows(rs, upto, hit) { return rs.map(function (r, k) { return [String(r.n), r.act.toUpperCase(), r.proto, r.lo === 0 && r.hi === 65535 ? 'all' : (r.lo === r.hi ? String(r.lo) : r.lo + '-' + r.hi), r.c.text, k < upto ? 'no match' : k === upto && hit ? 'MATCH' : '']; }).concat([['*', 'DENY', 'all', 'all', '0.0.0.0/0', upto >= rs.length ? 'MATCH' : '']]); }
        var cols = ['rule #', 'action', 'proto', 'ports', 'CIDR', 'result'];
        function walk(rs, port, dirLabel, pkt, f) {
          for (var k = 0; k < rs.length; k++) {
            var r = rs[k];
            var match = (r.proto === 'all' || r.proto === 'tcp') && port >= r.lo && port <= r.hi && inNet(client, r.c);
            var hl = {}; hl[k] = match ? (r.act === 'allow' ? 'ok' : 'bad') : 'done';
            f.push({ narr: dirLabel + ': rule <b>' + r.n + '</b> (' + r.text + ') ' + (match ? '<b>matches</b> ' + pkt + ', so the action is <b>' + r.act.toUpperCase() + '</b> and evaluation stops here.' : 'does not match ' + pkt + ' (' + (!(port >= r.lo && port <= r.hi) ? 'port ' + port + ' is outside ' + (r.lo === r.hi ? r.lo : r.lo + '-' + r.hi) : 'address not in ' + r.c.text) + '). Next rule.'), parts: [{ type: 'table', label: dirLabel + ' rules, lowest number first', columns: cols, rows: rows(rs, k, match), hl: hl }] });
            if (match) return r.act === 'allow';
          }
          var hl2 = {}; hl2[rs.length] = 'bad';
          f.push({ narr: dirLabel + ': no numbered rule matched ' + pkt + ', so the final <b>*</b> rule denies it. The packet is dropped without any reply.', parts: [{ type: 'table', label: dirLabel + ' rules', columns: cols, rows: rows(rs, rs.length, false), hl: hl2 }] });
          return false;
        }
        var f = [];
        f.push({ narr: 'A browser at <b>203.0.113.7</b> opens HTTPS to our web server <b>10.20.0.25:443</b> in public-a. Its own side uses a random <b>ephemeral port ' + cport + '</b>. The SYN must pass the subnet\'s <b>inbound NACL</b>, then the instance\'s <b>security group</b>. The reply must pass the <b>outbound NACL</b>.', parts: [
          { type: 'vars', label: 'the connection', vals: { client: '203.0.113.7:' + cport, server: '10.20.0.25:443', 'SG inbound rule': 'tcp 443 from 0.0.0.0/0' } }
        ] });
        var okIn = walk(IN, 443, 'Inbound NACL', 'tcp 203.0.113.7:' + cport + ' → :443', f);
        if (!okIn) {
          f.push({ narr: 'The request never reaches the instance. The client sees a <b>timeout</b>. If this client should be allowed, add an inbound allow for tcp 443 with a lower number than any deny that would catch it.', parts: [{ type: 'vars', label: 'result', vals: { connection: 'timed out', 'blocked by': 'inbound NACL' }, hl: { connection: 'bad' } }] });
          f.push({ narr: 'Evidence in VPC Flow Logs: one <b>REJECT</b> record for 203.0.113.7:' + cport + ' → 10.20.0.25:443 on the instance ENI. The security group never saw the packet. A deny here is exactly what you want for a blocked range; for everyone else it is a bug.', parts: [{ type: 'table', label: 'flow log (simplified)', columns: ['src', 'dst', 'dport', 'action'], rows: [['203.0.113.7', '10.20.0.25', '443', 'REJECT']], hl: { 0: 'bad' } }] });
          return f;
        }
        f.push({ narr: 'The SYN reaches the instance\'s <b>security group</b>: rule tcp 443 from 0.0.0.0/0 allows it, and the SG <b>records the connection</b> in its tracking table. Because SGs are stateful, the reply will be allowed out automatically, whatever the SG outbound rules say.', parts: [{ type: 'table', label: 'SG connection tracking', columns: ['proto', 'remote', 'local', 'state'], rows: [['tcp', '203.0.113.7:' + cport, '10.20.0.25:443', 'tracked']], hl: { 0: 'ok' } }] });
        f.push({ narr: 'The server answers with SYN-ACK <b>from port 443 to port ' + cport + '</b>. The SG lets it out (tracked). Now the subnet\'s <b>outbound NACL</b> checks it, and the NACL has <b>no memory</b> of the request: it only sees "tcp to 203.0.113.7 port ' + cport + '".', parts: [{ type: 'vars', label: 'reply packet', vals: { src: '10.20.0.25:443', dst: '203.0.113.7:' + cport, 'NACL knows about the request?': 'no (stateless)' }, hl: { 'NACL knows about the request?': 'cur' } }] });
        var okOut = walk(OUT, cport, 'Outbound NACL', 'tcp → 203.0.113.7:' + cport, f);
        if (!okOut) {
          f.push({ narr: '<b>This is the "NACL blocks return traffic" bug.</b> The request got in, the server answered, and the answer was dropped at the subnet edge. The browser waits and times out. Fix: add outbound <code>110 ALLOW tcp 1024-65535 0.0.0.0/0</code> (the ephemeral range), then retry with <code>out=100:allow:tcp:443:0.0.0.0/0,110:allow:tcp:1024-65535:0.0.0.0/0</code>.', parts: [{ type: 'vars', label: 'result', vals: { connection: 'timed out', 'blocked by': 'outbound NACL (reply to port ' + cport + ')' }, hl: { connection: 'bad' } }] });
          return f;
        }
        f.push({ narr: 'The reply passes. The TCP handshake completes and HTTPS works. Note what made it work: an <b>outbound rule for the client\'s port range</b>, not for 443. With security groups alone you never think about this, which is why the NACL bug surprises people.', parts: [{ type: 'vars', label: 'result', vals: { connection: 'established', 'rules used': 'NACL in 443, SG in 443 (stateful), NACL out ephemeral' }, hl: { connection: 'ok' } }] });
        return f;
      }
    }, {
      title: 'Security group references: does the source carry the right group?',
      input: 'client=web-sg dbrule=app-sg via=private',
      inputLabel: 'client=SG list (e.g. web-sg or web-sg,app-sg) dbrule=SG named in db-sg rule via=private|public',
      gen: function (input) {
        var o = { client: 'web-sg', dbrule: 'app-sg', via: 'private' };
        String(input || '').trim().split(/\s+/).filter(Boolean).forEach(function (kv) {
          var m = kv.match(/^(client|dbrule|via)=([A-Za-z0-9,_-]+)$/);
          if (!m) throw new Error('Use client=web-sg dbrule=app-sg via=private');
          o[m[1]] = m[2];
        });
        if (['private', 'public'].indexOf(o.via) < 0) throw new Error('via must be private or public');
        var groups = o.client.split(',').filter(Boolean);
        if (!groups.length || groups.length > 5) throw new Error('client needs 1 to 5 security groups');
        var f = [];
        var nodes = [box('W', 'client ENI 10.20.10.25', 12, 25, 22), box('R', 'VPC routing', 42, 25, 14), box('DB', 'db ENI 10.20.20.9 (db-sg)', 80, 25, 24)];
        function g(hl, ehl) { return { type: 'graph', directed: true, height: 50, nodes: nodes, edges: [['W', 'R'], ['R', 'DB']], hl: hl || {}, ehl: ehl || {} }; }
        f.push({ narr: 'An instance with security groups <b>' + groups.map(H.esc).join(', ') + '</b> connects to PostgreSQL on 5432. The database ENI has <code>db-sg</code>, whose only inbound rule is <b>tcp 5432 from ' + H.esc(o.dbrule) + '</b>.', parts: [g({ W: 'cur' }), { type: 'table', label: 'db-sg inbound', columns: ['proto', 'port', 'source'], rows: [['tcp', '5432', H.esc(o.dbrule) + ' (security group)']] }] });
        f.push({ narr: o.via === 'private' ? 'The app connects to the database\'s <b>private</b> address (the RDS endpoint resolves to 10.20.20.9 inside the VPC). Routing: local. Fine.' : 'The app connects using a <b>public</b> address of the database. The packet leaves through the NAT / IGW and comes back from a <b>public</b> source IP. Group references only match traffic using private IPs inside the VPC (or a peered one).', parts: [g({ R: o.via === 'private' ? 'ok' : 'bad' }, { 'W-R': 'ok' })] });
        var member = groups.indexOf(o.dbrule) >= 0;
        if (o.via === 'public') {
          f.push({ narr: 'The source of the packet is now the NAT gateway\'s Elastic IP, which belongs to <b>no</b> security group. The rule "from ' + H.esc(o.dbrule) + '" cannot match, even if the client has that group. Result: <b>timeout</b>. Fix: use the private endpoint and keep the database non-public.', parts: [g({ DB: 'bad' }, { 'R-DB': 'bad' }), { type: 'vars', label: 'result', vals: { connection: 'timed out', why: 'traffic left the VPC; SG reference no longer applies' }, hl: { connection: 'bad' } }] });
          f.push({ narr: 'Rule: a security group reference means "<i>network interfaces that carry this group, talking over private IPs</i>".', parts: [{ type: 'table', label: 'what an SG reference matches', columns: ['source traffic', 'matches?'], rows: [['private IP, ENI has the group', 'yes'], ['private IP, ENI lacks the group', 'no'], ['via NAT / public IP', 'no']], hl: { 2: 'bad' } }] });
          return f;
        }
        f.push({ narr: 'db-sg checks: does the <b>source ENI</b> carry <b>' + H.esc(o.dbrule) + '</b>? It carries ' + groups.map(H.esc).join(', ') + '. ' + (member ? '<b>Yes.</b>' : '<b>No.</b> Subnet, name tag and IP range do not matter; only group membership does.'), parts: [{ type: 'set', label: 'groups on the client ENI', items: groups, hl: member ? one(o.dbrule, 'ok') : {} }, { type: 'vars', label: 'check', vals: { 'needed group': o.dbrule, 'member?': member ? 'yes' : 'no' }, hl: { 'member?': member ? 'ok' : 'bad' } }] });
        if (member) {
          f.push({ narr: 'Allowed. The connection opens, and because SGs are stateful the replies flow back automatically. Any new app instance launched with ' + H.esc(o.dbrule) + ' gets access, with no CIDR to update.', parts: [g({ W: 'ok', DB: 'ok' }, { 'W-R': 'ok', 'R-DB': 'ok' }), { type: 'vars', label: 'result', vals: { connection: 'established' }, hl: { connection: 'ok' } }] });
        } else {
          f.push({ narr: 'Dropped silently: <b>timeout</b>, not "connection refused". This is the classic "web tier cannot reach the database" ticket. Fix: attach <code>' + H.esc(o.dbrule) + '</code> to these instances (if they are really app servers), or add a db-sg rule for <code>' + H.esc(groups[0]) + '</code> if that tier should talk to the DB.', parts: [g({ DB: 'bad' }, { 'R-DB': 'bad' }), { type: 'vars', label: 'result', vals: { connection: 'timed out', 'blocked by': 'db-sg (no rule for ' + groups.join(',') + ')' }, hl: { connection: 'bad' } }] });
        }
        f.push({ narr: 'How to prove it in the real account: <code>aws ec2 describe-instances --query "...SecurityGroups"</code> for the client, <code>describe-security-group-rules</code> for db-sg, then Reachability Analyzer from the client ENI to the DB ENI on 5432. It names the blocking rule.', parts: [{ type: 'table', label: 'evidence', columns: ['tool', 'shows'], rows: [['describe-instances', 'groups on the client'], ['describe-security-group-rules', 'db-sg sources'], ['Reachability Analyzer', 'the exact blocking component'], ['VPC Flow Logs', 'REJECT records for 5432']] }] });
        return f;
      }
    }],
    examples: [
      { title: 'Situation: web tier cannot reach the database tier', html: `<p>After a refactor, the old <code>app-sg</code> was split into <code>web-sg</code> and <code>api-sg</code>. The db-sg still says "5432 from app-sg". The API instances were launched with only <code>api-sg</code>, so every connection to the database <b>times out</b>. <code>describe-instances</code> shows the groups, <code>describe-security-group-rules</code> shows the stale reference, and the fix is one rule: 5432 from <code>api-sg</code> (and remove the app-sg rule when nothing uses it).</p>`, code: R`aws ec2 describe-instances --instance-ids i-0api123 \
  --query 'Reservations[0].Instances[0].SecurityGroups[].GroupName' --output text      # api-sg
aws ec2 authorize-security-group-ingress --group-id "$DB_SG" --protocol tcp --port 5432 --source-group "$API_SG"` },
      { title: 'Blocking an abusive range: only a NACL can deny', html: `<p>A scraper hammers your public web servers from <code>198.51.100.0/24</code>. Security groups cannot deny; you would have to rewrite "allow 443 from 0.0.0.0/0" as many smaller allows. A NACL deny with a <b>lower rule number</b> than the allow does it in one line. Number rules in steps of 10 (or 100) so you can insert deny rules above later. For layer-7 abuse (paths, rates, bots), use AWS WAF on the load balancer instead.</p>`, code: R`aws ec2 create-network-acl-entry --network-acl-id "$ACL" --ingress --rule-number 80 \
  --protocol -1 --cidr-block 198.51.100.0/24 --rule-action deny     # -1 = all protocols` },
      { title: 'Reading a flow log REJECT', html: `<p>A flow log line: <code>2 123456789012 eni-0abc 203.0.113.7 10.20.0.25 51544 443 6 3 180 1760000000 1760000060 ACCEPT OK</code> followed by <code>... 10.20.0.25 203.0.113.7 443 51544 6 3 180 ... REJECT OK</code>. The inbound request was accepted; the <b>reply</b> was rejected. Security groups never reject replies of accepted connections, so the outbound <b>NACL</b> is the culprit: missing ephemeral ports. Fields: version, account, ENI, src, dst, src port, dst port, protocol (6 = TCP), packets, bytes, start, end, action, status.</p>`, code: R`aws logs filter-log-events --log-group-name /lab/vpc-flow --filter-pattern '"REJECT"' \
  --max-items 20 --query 'events[].message' --output text` },
      { title: 'Reachability Analyzer instead of guessing', html: `<p>Reachability Analyzer reads your configuration (routes, SGs, NACLs, gateways) without sending packets and tells you whether a path exists and which component blocks it, for example "<i>NETWORK_ACL_NO_MATCHING_RULE in acl-0abc egress</i>". Each analysis has a small per-run cost.</p>`, code: R`P=$(aws ec2 create-network-insights-path --source i-0web123 --destination i-0db456 \
  --protocol tcp --destination-port 5432 --query NetworkInsightsPath.NetworkInsightsPathId --output text)
A=$(aws ec2 start-network-insights-analysis --network-insights-path-id "$P" \
  --query NetworkInsightsAnalysis.NetworkInsightsAnalysisId --output text)
aws ec2 describe-network-insights-analyses --network-insights-analysis-ids "$A" \
  --query 'NetworkInsightsAnalyses[0].[Status,NetworkPathFound,Explanations[0].ExplanationCode]' --output text` }
    ],
    deepDive: `<p>🟣 <b>Connection tracking details.</b> Security groups track TCP, UDP and ICMP flows. If you <b>remove</b> an SG rule, existing tracked connections may keep working until they close or time out (TCP established flows idle out after 5 days by default; configurable per ENI). Some flows are <b>untracked</b>: if inbound and outbound both allow 0.0.0.0/0 for all traffic, AWS skips tracking, and removing a rule then cuts traffic immediately. Tracking tables have limits on large instances; <code>conntrack_allowance_exceeded</code> in ENA metrics tells you when you hit them.</p>
      <p><b>Limits</b>: 5 security groups per ENI by default (up to 16), 60 inbound and 60 outbound rules per SG by default; 20 rules per NACL direction by default (up to 40). Rules referencing a <b>prefix list</b> count as many rules as the list's max entries.</p>
      <p><b>NACL specifics</b>: rule numbers are evaluated in ascending order; the <code>*</code> rule cannot be removed. A NACL applies to traffic <b>entering and leaving the subnet</b>, so traffic between two instances in the same subnet is not filtered by the NACL at all (only by SGs). Traffic to the VPC DNS resolver, the instance metadata service (169.254.169.254) and Amazon Time Sync is not filtered by NACLs or SGs.</p>
      <p><b>The default security group</b> of each VPC allows all traffic from its own members. Teams launch things into it by accident, so AWS Config and Security Hub flag default SGs that have any rules. Remove its rules and never use it.</p>
      <p><b>Beyond SG + NACL</b>: AWS Network Firewall (stateful, managed Suricata rules, domain filtering on egress) for central inspection, WAF for HTTP, and security group <b>VPC associations</b> and <b>shared SGs</b> in shared VPCs for multi-account setups.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> flow logs are dense and boring; an assistant (or the built-in log query generators) can turn "show me rejected traffic to port 5432 in the last hour, grouped by source" into a CloudWatch Logs Insights or Athena query instantly, and explain a NACL table rule by rule. Cloud security tools now use AI to propose least-privilege SG rules from observed traffic.</p>
      <p><b>The traps:</b> AI often "fixes" timeouts with <code>0.0.0.0/0</code> on all ports, or forgets that NACLs are stateless and proposes rules that only work in one direction. When it suggests an SG change, ask for the <b>source as a security group reference</b> rather than a CIDR; when it suggests a NACL, ask it to list the request <i>and</i> reply for each flow. Then confirm with Reachability Analyzer, which is deterministic and does not hallucinate.</p>`,
    problems: [P({
      t: 'Fix this NACL: HTTPS times out after a "hardening" change', l: 'Medium', tags: ['nacl', 'ephemeral ports', 'stateless', 'troubleshooting'], co: ['AWS', 'Cisco', 'Wipro'],
      s: `<p>After a security hardening ticket, users time out on <code>https://shop.example.com</code> (an instance in public-a behind an internet gateway), and the instance can no longer run <code>dnf update</code>. The security group allows inbound 443 from 0.0.0.0/0 and all outbound. The subnet's new custom NACL is:</p><pre>Inbound:  100 ALLOW tcp 443        0.0.0.0/0
          *   DENY  all all        0.0.0.0/0
Outbound: 100 ALLOW tcp 443        0.0.0.0/0
          200 DENY  tcp 1024-65535 0.0.0.0/0
          *   DENY  all all        0.0.0.0/0</pre><p>Explain both failures and give the corrected NACL with commands.</p>`,
      ex: `<p>Request in: ${H.c('g', '203.0.113.7:51544 → :443 matches inbound 100')}. Reply out: ${H.c('r', ':443 → 203.0.113.7:51544 hits outbound 200 DENY')}. The update: the instance's call ${H.c('g', 'out to :443 matches outbound 100')}, but the mirror's reply ${H.c('r', 'to our port 40312 hits inbound *')}.</p>`,
      bw: `<p>Replacing every rule with "100 ALLOW all all 0.0.0.0/0" in both directions. It fixes the symptom by removing the NACL's purpose. Or "fixing" it in the security group, which is already fine and cannot help: the drop happens at the subnet edge.</p>`,
      q: ['Which change fixes the website?', ['Allow outbound tcp 1024-65535 to 0.0.0.0/0 (replies to client ports), with a lower number than any deny', 'Allow outbound tcp 443 again with rule 50', 'Allow inbound tcp 1024-65535', 'Add an outbound rule to the security group'], 0, 'The reply goes from 443 to the client\'s ephemeral port. The stateless NACL needs an explicit outbound allow for that range; rule 200 DENY currently catches it.'],
      h: ['<p>Hint 1: write each flow as two packets, request and reply, with source and destination ports. Then evaluate each packet against the NACL for its direction.</p>', '<p>Hint 2: the website needs outbound 1024-65535 (replies to clients). The update needs inbound 1024-65535 (replies from the mirror) plus outbound 443 (already there).</p>', '<p>Hint 3: rule 200 DENY must go (or move below a new allow); NACLs stop at the first match, so order matters. Use <code>replace-network-acl-entry</code> to change a rule in place.</p>'],
      a: `<p><b>Failure 1, website:</b> the inbound SYN (to 443) matches inbound 100 ALLOW. The SG allows it and, being stateful, lets the reply out. The reply leaves the subnet from port 443 <b>to the client's ephemeral port</b> (for example 51544). Outbound rule 100 is for destination port 443, so it does not match; rule 200 explicitly <b>denies</b> 1024-65535; dropped → timeout. <b>Failure 2, updates:</b> the instance connects out to the mirror's 443 (outbound 100 allows), but the mirror's reply comes <b>in</b> to the instance's ephemeral port (for example 40312). Inbound has only 443, so the <code>*</code> rule drops it → timeout. <b>Fixed NACL:</b> Inbound: 100 ALLOW tcp 443 0.0.0.0/0; 110 ALLOW tcp 1024-65535 0.0.0.0/0 (replies to our outbound calls). Outbound: 100 ALLOW tcp 443 0.0.0.0/0 (our calls out); 110 ALLOW tcp 1024-65535 0.0.0.0/0 (replies to clients); remove 200 DENY. If the hardening goal was "no outbound high ports except replies", that cannot be expressed in a stateless NACL; do egress control in security groups or AWS Network Firewall. <b>Verify:</b> curl from outside, <code>dnf check-update</code> via SSM, and flow logs show no new REJECT lines.</p>`,
      code: R`ACL=acl-0pub123   # the custom NACL on public-a (example id)
# Outbound: turn the DENY 200 into the ALLOW for replies to clients' ephemeral ports
aws ec2 replace-network-acl-entry --network-acl-id "$ACL" --egress --rule-number 200 \
  --protocol tcp --port-range From=1024,To=65535 --cidr-block 0.0.0.0/0 --rule-action allow
# Inbound: allow replies to the instance's own outbound calls (updates, APIs)
aws ec2 create-network-acl-entry --network-acl-id "$ACL" --ingress --rule-number 110 \
  --protocol tcp --port-range From=1024,To=65535 --cidr-block 0.0.0.0/0 --rule-action allow
# Check the final order
aws ec2 describe-network-acls --network-acl-ids "$ACL" \
  --query 'NetworkAcls[0].Entries[].[Egress,RuleNumber,RuleAction,Protocol,PortRange.From,PortRange.To,CidrBlock]' --output table`,
      cx: `<p>Two API calls. Each flow needs four checks (NACL in, SG, NACL out for the reply, and the reverse for outbound calls), which is why NACLs should stay simple.</p>`,
      f: ['Why do AWS docs recommend 1024-65535 rather than the Linux range 32768-60999?', 'The same NACL is on the private app subnets. What extra rules does traffic through the NAT gateway need?']
    })]
  });

  // ───────────────────────── Topic 7: two-tier network from scratch ─────────────────────────
  topics.push({
    title: 'Lab: Build a Two-Tier Network from Scratch with the AWS CLI (and Tear It Down)',
    analogy: `<p>Building a VPC by hand is like <b>wiring a new house</b> before anyone moves in. You mark out the rooms (subnets), install the front door (internet gateway), put up the signposts in each hallway (route tables), add a mail-room for the back rooms (NAT gateway), and give each room its own lock (security groups). Once you have wired one house by hand, you understand every line of the blueprint the builders use later (Terraform). And when the house is a <b>rental for one afternoon</b>, you take every fitting out again, because some of them (the mail-room) charge rent by the hour.</p>`,
    explain: `<p>🟢 <b>The target</b>: the classic AWS "VPC with public and private subnets" in <b>two AZs</b>.</p>
      ${H.table(['Piece', 'Count', 'Settings'], [
        ['VPC', '1', '<code>10.30.0.0/16</code>, DNS support + hostnames on'],
        ['Public subnets (web tier)', '2', '<code>10.30.0.0/24</code> (a), <code>10.30.1.0/24</code> (b); auto-assign public IP on'],
        ['Private subnets (database tier)', '2', '<code>10.30.10.0/24</code> (a), <code>10.30.11.0/24</code> (b); no public IPs'],
        ['Internet gateway', '1', 'attached to the VPC'],
        ['NAT gateway + Elastic IP', '1 in the lab (1 per AZ in production)', 'in public-a; <b>billed per hour</b>'],
        ['Route tables', '2', 'public: <code>0.0.0.0/0 → igw</code>; private: <code>0.0.0.0/0 → nat</code>'],
        ['Security groups', '2', '<code>web-sg</code>: 80/443 from anywhere; <code>db-sg</code>: 5432 from <b>web-sg</b> only'],
        ['Network ACL', '1 (optional)', 'private subnets: 5432 from the VPC + ephemeral replies']
      ])}
      <p>🟢 <b>Order matters</b>, because each piece needs the one before it: VPC → subnets → IGW (attach) → route tables (routes, associations) → EIP → NAT (wait until available) → private route → security groups → NACL. <b>Cleanup runs in reverse</b>, and AWS refuses to delete something that is still used, with a <code>DependencyViolation</code> error that names nothing helpful. Knowing the order is the skill.</p>
      <p>🔵 <b>Cost and safety rules for this lab</b> (the same in every lab in this track): use a sandbox account and an SSO profile, never access keys; tag every resource with <code>Project=lab06</code>; the NAT gateway (about USD 0.045/h + per GB) and its Elastic IP (about USD 0.005/h) are the <b>only billable parts</b>, roughly USD 1.20 per day if forgotten, USD 36 a month; any EC2 test instances you add cost extra (use a free-tier type and terminate them). Run the cleanup script the same day and confirm with the "anything left?" queries.</p>
      <p>🔵 <b>Scripting habits</b> from Cloud &amp; DevOps 2: <code>set -euo pipefail</code>, capture every id with <code>--query ... --output text</code>, write ids to a state file so a separate cleanup script can find them, and use <code>aws ec2 wait</code> instead of <code>sleep</code>.</p>
      <h4>Same lab on other clouds</h4>
      ${H.table(['Step', 'Azure CLI', 'gcloud'], [
        ['Network', '<code>az network vnet create</code> (regional VNet)', '<code>gcloud compute networks create --subnet-mode=custom</code> (global)'],
        ['Subnets', '<code>az network vnet subnet create</code> (span zones)', '<code>gcloud compute networks subnets create --region</code>'],
        ['Internet / NAT', 'public IP on the VM, or <code>az network nat gateway create</code> + attach to subnet', 'external IP, or <code>gcloud compute routers nats create</code> (Cloud NAT)'],
        ['Firewalling', '<code>az network nsg create</code> + rules with ASGs as source', '<code>gcloud compute firewall-rules create --source-tags / --source-service-accounts</code>']
      ])}
      <p>🔵 <b>Next step: Infrastructure as Code.</b> Typing 40 CLI calls once teaches you the model; doing it for every environment is how mistakes happen. <b>Cloud &amp; DevOps 9 (Terraform)</b> turns this exact network into a reviewed, repeatable file with <code>plan</code> and <code>destroy</code>. A preview is in the examples below, only as a pointer.</p>`,
    clues: [
      '"build a VPC with public and private subnets" → VPC, 2+ AZs, IGW, two route tables, NAT for private egress, SGs by reference',
      '"DependencyViolation when deleting a VPC / subnet / IGW" → something still uses it: ENIs, NAT, endpoints, associations; delete in reverse order',
      '"forgot the lab running" / "surprise bill" → NAT gateway and Elastic IPs bill per hour: delete NAT, wait, release EIP',
      '"script must be safe to re-run" → tags + a state file + describe-before-create (idempotency, Cloud &amp; DevOps 2)',
      '"how would you do this repeatably?" → Terraform / CloudFormation (Cloud &amp; DevOps 9), not a longer bash script'
    ],
    code: [R`#!/usr/bin/env bash
# build-two-tier.sh: a two-tier VPC across 2 AZs. COST: NAT gateway + Elastic IP bill per hour.
# Run with an SSO profile:  AWS_PROFILE=lab ./build-two-tier.sh   then ALWAYS run cleanup-two-tier.sh
set -euo pipefail
export AWS_REGION=us-east-1
STATE=./lab06.state; : > "$STATE"
save() { echo "$1=$2" >> "$STATE"; echo "$1=$2"; }
tag() { echo "ResourceType=$1,Tags=[{Key=Name,Value=$2},{Key=Project,Value=lab06}]"; }

# 1. VPC with DNS
VPC=$(aws ec2 create-vpc --cidr-block 10.30.0.0/16 --tag-specifications "$(tag vpc lab06-vpc)" --query Vpc.VpcId --output text)
save VPC "$VPC"
aws ec2 modify-vpc-attribute --vpc-id "$VPC" --enable-dns-hostnames '{"Value":true}'

# 2. Four subnets in two AZs
sub() { aws ec2 create-subnet --vpc-id "$VPC" --cidr-block "$2" --availability-zone "$3" \
  --tag-specifications "$(tag subnet "$1")" --query Subnet.SubnetId --output text; }
PUB_A=$(sub public-a 10.30.0.0/24 us-east-1a);   save PUB_A "$PUB_A"
PUB_B=$(sub public-b 10.30.1.0/24 us-east-1b);   save PUB_B "$PUB_B"
PRIV_A=$(sub private-a 10.30.10.0/24 us-east-1a); save PRIV_A "$PRIV_A"
PRIV_B=$(sub private-b 10.30.11.0/24 us-east-1b); save PRIV_B "$PRIV_B"
for S in "$PUB_A" "$PUB_B"; do aws ec2 modify-subnet-attribute --subnet-id "$S" --map-public-ip-on-launch; done

# 3. Internet gateway, attached
IGW=$(aws ec2 create-internet-gateway --tag-specifications "$(tag internet-gateway lab06-igw)" \
  --query InternetGateway.InternetGatewayId --output text); save IGW "$IGW"
aws ec2 attach-internet-gateway --internet-gateway-id "$IGW" --vpc-id "$VPC"

# 4. Public route table: 0.0.0.0/0 -> igw, both public subnets
PUB_RT=$(aws ec2 create-route-table --vpc-id "$VPC" --tag-specifications "$(tag route-table public-rt)" \
  --query RouteTable.RouteTableId --output text); save PUB_RT "$PUB_RT"
aws ec2 create-route --route-table-id "$PUB_RT" --destination-cidr-block 0.0.0.0/0 --gateway-id "$IGW" > /dev/null
for S in "$PUB_A" "$PUB_B"; do aws ec2 associate-route-table --route-table-id "$PUB_RT" --subnet-id "$S" > /dev/null; done

# 5. Elastic IP + NAT gateway in public-a (billing starts now)
EIP=$(aws ec2 allocate-address --domain vpc --tag-specifications "$(tag elastic-ip lab06-eip)" \
  --query AllocationId --output text); save EIP "$EIP"
NAT=$(aws ec2 create-nat-gateway --subnet-id "$PUB_A" --allocation-id "$EIP" \
  --tag-specifications "$(tag natgateway lab06-nat)" --query NatGateway.NatGatewayId --output text); save NAT "$NAT"
aws ec2 wait nat-gateway-available --nat-gateway-ids "$NAT"

# 6. Private route table: 0.0.0.0/0 -> nat, both private subnets
PRIV_RT=$(aws ec2 create-route-table --vpc-id "$VPC" --tag-specifications "$(tag route-table private-rt)" \
  --query RouteTable.RouteTableId --output text); save PRIV_RT "$PRIV_RT"
aws ec2 create-route --route-table-id "$PRIV_RT" --destination-cidr-block 0.0.0.0/0 --nat-gateway-id "$NAT" > /dev/null
for S in "$PRIV_A" "$PRIV_B"; do aws ec2 associate-route-table --route-table-id "$PRIV_RT" --subnet-id "$S" > /dev/null; done

# 7. Security groups: web-sg (public), db-sg allows 5432 only from members of web-sg
WEB_SG=$(aws ec2 create-security-group --vpc-id "$VPC" --group-name lab06-web-sg \
  --description "web tier" --query GroupId --output text); save WEB_SG "$WEB_SG"
DB_SG=$(aws ec2 create-security-group --vpc-id "$VPC" --group-name lab06-db-sg \
  --description "db tier" --query GroupId --output text); save DB_SG "$DB_SG"
for P in 80 443; do
  aws ec2 authorize-security-group-ingress --group-id "$WEB_SG" --protocol tcp --port "$P" --cidr 0.0.0.0/0 > /dev/null
done
aws ec2 authorize-security-group-ingress --group-id "$DB_SG" --protocol tcp --port 5432 --source-group "$WEB_SG" > /dev/null

# 8. NACL for the private subnets: 5432 from the VPC in, ephemeral replies out, egress for updates
ACL=$(aws ec2 create-network-acl --vpc-id "$VPC" --tag-specifications "$(tag network-acl private-acl)" \
  --query NetworkAcl.NetworkAclId --output text); save ACL "$ACL"
e() { aws ec2 create-network-acl-entry --network-acl-id "$ACL" "$@"; }
e --ingress --rule-number 100 --protocol tcp --port-range From=5432,To=5432 --cidr-block 10.30.0.0/16 --rule-action allow
e --ingress --rule-number 110 --protocol tcp --port-range From=1024,To=65535 --cidr-block 0.0.0.0/0 --rule-action allow
e --egress  --rule-number 100 --protocol tcp --port-range From=1024,To=65535 --cidr-block 10.30.0.0/16 --rule-action allow
e --egress  --rule-number 110 --protocol tcp --port-range From=443,To=443 --cidr-block 0.0.0.0/0 --rule-action allow
e --egress  --rule-number 120 --protocol tcp --port-range From=80,To=80 --cidr-block 0.0.0.0/0 --rule-action allow
for S in "$PRIV_A" "$PRIV_B"; do
  A=$(aws ec2 describe-network-acls --filters Name=association.subnet-id,Values="$S" \
    --query "NetworkAcls[0].Associations[?SubnetId=='$S'].NetworkAclAssociationId | [0]" --output text)
  aws ec2 replace-network-acl-association --association-id "$A" --network-acl-id "$ACL" > /dev/null
done
echo "Built. State in $STATE. Remember: ./cleanup-two-tier.sh"`, R`#!/usr/bin/env bash
# cleanup-two-tier.sh: delete everything from lab06.state in REVERSE dependency order.
set -euo pipefail
export AWS_REGION=us-east-1
# shellcheck disable=SC1091
source ./lab06.state

# 0. Anything you launched yourself (test instances) must go first: they hold ENIs in the subnets.
IDS=$(aws ec2 describe-instances --filters Name=vpc-id,Values="$VPC" Name=instance-state-name,Values=pending,running,stopped \
  --query 'Reservations[].Instances[].InstanceId' --output text)
if [ -n "$IDS" ]; then
  aws ec2 terminate-instances --instance-ids $IDS > /dev/null
  aws ec2 wait instance-terminated --instance-ids $IDS
fi

# 1. NAT gateway (the hourly charge), wait, then release the Elastic IP
aws ec2 delete-nat-gateway --nat-gateway-id "$NAT" > /dev/null
aws ec2 wait nat-gateway-deleted --nat-gateway-ids "$NAT"
aws ec2 release-address --allocation-id "$EIP"

# 2. Security groups: remove the reference first (db-sg -> web-sg), then delete both
aws ec2 revoke-security-group-ingress --group-id "$DB_SG" --protocol tcp --port 5432 --source-group "$WEB_SG"
aws ec2 delete-security-group --group-id "$DB_SG"
aws ec2 delete-security-group --group-id "$WEB_SG"

# 3. Subnets (deleting a subnet also removes its route table and NACL associations)
for S in "$PRIV_A" "$PRIV_B" "$PUB_A" "$PUB_B"; do aws ec2 delete-subnet --subnet-id "$S"; done

# 4. Custom NACL and route tables (the main ones go with the VPC)
aws ec2 delete-network-acl --network-acl-id "$ACL"
aws ec2 delete-route-table --route-table-id "$PRIV_RT"
aws ec2 delete-route-table --route-table-id "$PUB_RT"

# 5. Internet gateway: detach, then delete
aws ec2 detach-internet-gateway --internet-gateway-id "$IGW" --vpc-id "$VPC"
aws ec2 delete-internet-gateway --internet-gateway-id "$IGW"

# 6. The VPC itself
aws ec2 delete-vpc --vpc-id "$VPC"

# 7. Anything billable left anywhere in the region?
aws ec2 describe-nat-gateways --filter Name=state,Values=available,pending \
  --query 'NatGateways[].NatGatewayId' --output text
aws ec2 describe-addresses --query 'Addresses[].[AllocationId,PublicIp]' --output text
echo "Clean."`],
    codeTitle: ['build-two-tier.sh: the whole network, step by step', 'cleanup-two-tier.sh: reverse order, then check nothing billable is left'],
    viz: [{
      title: 'Build the two-tier VPC step by step (and watch the meter)',
      input: 'azs=2 nat=1',
      inputLabel: 'azs=1|2 nat=0|1|2 (NAT gateways; 2 = one per AZ)',
      gen: function (input) {
        var o = { azs: '2', nat: '1' };
        String(input || '').trim().split(/\s+/).filter(Boolean).forEach(function (kv) {
          var m = kv.match(/^(azs|nat)=(\d)$/);
          if (!m) throw new Error('Use azs=2 nat=1');
          o[m[1]] = m[2];
        });
        var azs = Number(o.azs), nats = Number(o.nat);
        if (azs < 1 || azs > 2) throw new Error('azs must be 1 or 2');
        if (nats < 0 || nats > azs) throw new Error('nat must be 0 up to the number of AZs');
        var nodes = [], edges = [], f = [], hourly = 0;
        function g(hl, ehl) { return { type: 'graph', directed: true, height: 70, nodes: nodes.slice(), edges: edges.slice(), hl: hl || {}, ehl: ehl || {} }; }
        function meter() { return { type: 'vars', label: 'billing meter (approx., us-east-1)', vals: { 'USD per hour': hourly.toFixed(3), 'USD per 30 days': (hourly * 720).toFixed(2) }, hl: hourly ? { 'USD per hour': 'cur' } : {} }; }
        nodes.push(box('VPC', 'VPC 10.30.0.0/16', 50, 4, 26));
        f.push({ narr: '<b>Step 1: create-vpc</b> with <code>10.30.0.0/16</code> and DNS hostnames on. It already has a main route table (local only), a default NACL (allow all) and a default security group. Cost so far: nothing.', parts: [g({ VPC: 'ok' }), meter()] });
        var X = azs === 1 ? [50] : [28, 72];
        X.forEach(function (x, i) {
          var a = 'ab'[i];
          nodes.push(box('PUB' + a, 'public-' + a + ' 10.30.' + i + '.0/24', x, 22, 24));
          nodes.push(box('PRIV' + a, 'private-' + a + ' 10.30.1' + i + '.0/24', x, 54, 24));
        });
        f.push({ narr: '<b>Step 2: create-subnet</b> ×' + (2 * azs) + ': a public and a private subnet in ' + (azs === 2 ? 'each of two AZs, so one AZ failure leaves half the capacity' : 'one AZ only (fine for a lab, not for production)') + '. Public subnets get <code>map-public-ip-on-launch</code>. Nothing is public yet: no gateway, no route.', parts: [g(), meter()] });
        nodes.push(box('IGW', 'internet gw', 50, 36, 14));
        f.push({ narr: '<b>Step 3: create-internet-gateway + attach-internet-gateway.</b> The door exists, but no subnet uses it until a route points to it. A detached IGW is the reason "DependencyViolation" appears if you try to delete the VPC first.', parts: [g({ IGW: 'ok' }), meter()] });
        X.forEach(function (x, i) { edges.push(['PUB' + 'ab'[i], 'IGW', '0/0']); });
        var eh = {}; X.forEach(function (x, i) { eh['PUB' + 'ab'[i] + '-IGW'] = 'ok'; });
        f.push({ narr: '<b>Step 4: public route table</b>: <code>create-route 0.0.0.0/0 → igw</code>, then <code>associate-route-table</code> with each public subnet. They are now public subnets by definition.', parts: [g({}, eh), { type: 'table', label: 'public-rt', columns: ['destination', 'target'], rows: [['10.30.0.0/16', 'local'], ['0.0.0.0/0', 'igw']] }, meter()] });
        if (nats > 0) {
          for (var n = 0; n < nats; n++) { nodes.push(box('NAT' + n, 'NAT ' + 'ab'[n] + ' + EIP', X[n] + (azs === 1 ? 22 : n === 0 ? -16 : 16), 36, 14)); hourly += 0.045 + 0.005; }
          f.push({ narr: '<b>Step 5: allocate-address + create-nat-gateway</b> in ' + (nats === 1 ? 'public-a' : 'each public subnet') + ', then <code>wait nat-gateway-available</code>. 💸 <b>The meter starts</b>: about USD 0.045/hour per NAT plus USD 0.005/hour per public IPv4, before any data.', parts: [g(one('NAT0', 'cur')), meter()] });
          var eh2 = {};
          X.forEach(function (x, i) { var t = nats === 2 ? 'NAT' + i : 'NAT0'; edges.push(['PRIV' + 'ab'[i], t, '0/0']); eh2['PRIV' + 'ab'[i] + '-' + t] = 'ok'; });
          f.push({ narr: '<b>Step 6: private route table(s)</b>: <code>0.0.0.0/0 → nat</code>, associated with the private subnets. ' + (nats === 1 && azs === 2 ? 'With one NAT, private-b depends on AZ a and pays cross-AZ data charges: fine for a lab, a single point of failure in production.' : 'Each private subnet uses the NAT in its own AZ.') + ' The database tier can now fetch updates but cannot be reached from the internet.', parts: [g({}, eh2), meter()] });
        } else {
          f.push({ narr: '<b>Steps 5-6 skipped (nat=0)</b>: the private subnets keep only the local route. Fully isolated and free. Instances there need VPC endpoints (SSM, S3) for management and packages.', parts: [g(), meter()] });
        }
        nodes.push(box('WSG', 'web-sg 80/443', 12, 70, 16)); nodes.push(box('DSG', 'db-sg 5432', 88, 70, 14)); edges.push(['WSG', 'DSG', '5432']);
        f.push({ narr: '<b>Step 7: security groups.</b> <code>web-sg</code> allows 80/443 from anywhere; <code>db-sg</code> allows 5432 <b>only from members of web-sg</b>. Web instances go in the public subnets with web-sg; the database goes in the private subnets with db-sg. Still no extra cost.', parts: [g({ WSG: 'ok', DSG: 'ok' }, { 'WSG-DSG': 'ok' }), meter()] });
        f.push({ narr: '<b>Step 8: NACL</b> for the private subnets (optional guard rail): in 5432 from 10.30.0.0/16 and 1024-65535 for update replies; out 1024-65535 to the VPC (replies to the web tier) and 80/443 for updates. Then <code>replace-network-acl-association</code>.', parts: [{ type: 'table', label: 'private-acl', columns: ['dir', '#', 'rule'], rows: [['in', '100', 'ALLOW tcp 5432 10.30.0.0/16'], ['in', '110', 'ALLOW tcp 1024-65535 0.0.0.0/0'], ['out', '100', 'ALLOW tcp 1024-65535 10.30.0.0/16'], ['out', '110', 'ALLOW tcp 443 0.0.0.0/0'], ['out', '120', 'ALLOW tcp 80 0.0.0.0/0']] }, meter()] });
        f.push({ narr: '<b>Cleanup, in reverse:</b> instances → NAT gateway (wait for deleted) → release EIP → SG rules and SGs → subnets → custom NACL and route tables → detach + delete IGW → VPC. Do it the same day: forgotten, this lab costs about USD ' + (hourly * 720).toFixed(0) + ' a month.', parts: [{ type: 'stack', label: 'delete order (top first)', items: ['delete-vpc', 'detach + delete-internet-gateway', 'delete-network-acl, delete-route-table', 'delete-subnet x' + (2 * azs), 'revoke + delete-security-group', 'release-address', 'delete-nat-gateway + wait', 'terminate test instances'], hl: { 6: 'cur' } }, meter()] });
        return f;
      }
    }],
    examples: [
      { title: 'Prove the design works (with tiny test instances)', html: `<p>Launch a free-tier instance with <code>web-sg</code> in public-a and one with <code>db-sg</code> in private-a, both with an SSM instance profile so you need no SSH keys or bastion. From the web box, <code>nc -vz 10.30.10.x 5432</code> should reach the database box (once something listens). From your laptop, the private box has no public IP at all. From the private box, <code>curl -sI https://example.com</code> works through the NAT. Terminate both instances before cleanup.</p>`, code: R`AMI=$(aws ssm get-parameter --name /aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64 \
  --query Parameter.Value --output text)
aws ec2 run-instances --image-id "$AMI" --instance-type t3.micro --subnet-id "$PRIV_A" \
  --security-group-ids "$DB_SG" --iam-instance-profile Name=lab-ssm-profile \
  --metadata-options HttpTokens=required \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Project,Value=lab06}]' \
  --query 'Instances[0].InstanceId' --output text` },
      { title: 'DependencyViolation: reading the refusal', html: `<p><code>aws ec2 delete-vpc</code> fails with <code>DependencyViolation: The vpc 'vpc-0abc' has dependencies and cannot be deleted.</code> AWS does not say which. Look for <b>ENIs</b> first (they belong to instances, NAT gateways, load balancers, Lambda functions and interface endpoints), then attached gateways, then non-default SGs, NACLs and route tables. The description of each ENI usually names its owner.</p>`, code: R`aws ec2 describe-network-interfaces --filters Name=vpc-id,Values="$VPC" \
  --query 'NetworkInterfaces[].[NetworkInterfaceId,InterfaceType,Description,Status]' --output table
aws ec2 describe-internet-gateways --filters Name=attachment.vpc-id,Values="$VPC" \
  --query 'InternetGateways[].InternetGatewayId' --output text` },
      { title: 'Terraform preview: the same network as code (pointer to Cloud & DevOps 9)', html: `<p>Here is how the first pieces look in Terraform. Do not learn the syntax here: <b>Cloud &amp; DevOps 9</b> covers providers, state, <code>plan</code> and modules properly. The point is that every CLI call above becomes a resource block, references replace copy-pasted ids, and <code>terraform destroy</code> replaces the cleanup script.</p>`, code: { lang: 'text', code: `resource "aws_vpc" "lab" {
  cidr_block           = "10.30.0.0/16"
  enable_dns_hostnames = true
  tags                 = { Name = "lab06-vpc", Project = "lab06" }
}

resource "aws_subnet" "public_a" {
  vpc_id                  = aws_vpc.lab.id
  cidr_block              = "10.30.0.0/24"
  availability_zone       = "us-east-1a"
  map_public_ip_on_launch = true
}

resource "aws_internet_gateway" "igw" { vpc_id = aws_vpc.lab.id }

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.lab.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }
}
# ...route table associations, NAT gateway, security groups: see Cloud & DevOps 9` } }
    ],
    deepDive: `<p>🟣 <b>Why this is "two-tier", and what production adds.</b> Here web instances sit in public subnets with public IPs. Production usually goes one step further (three tiers): an <b>Application Load Balancer</b> in the public subnets, web/app instances in private subnets with no public IPs, and the database in isolated subnets with no NAT route at all. Managed databases (RDS, Cloud &amp; DevOps 12) take a DB subnet group across both private subnets and handle standby failover.</p>
      <p><b>Idempotency.</b> This script is not safe to run twice: it would create a second VPC. Real scripts first <code>describe-vpcs --filters Name=tag:Project,Values=lab06</code> and reuse what exists, or, better, use a declarative tool that computes the difference for you. That gap is exactly why IaC exists.</p>
      <p><b>Eventual consistency.</b> EC2 APIs are eventually consistent: an id returned by a create call may briefly be "not found" in the next call. The CLI retries many errors automatically (standard retry mode); waiters (<code>aws ec2 wait ...</code>) poll until a state is reached. Use them rather than fixed sleeps.</p>
      <p><b>Finding forgotten resources.</b> Tag everything, then <code>aws resourcegroupstaggingapi get-resources --tag-filters Key=Project,Values=lab06</code> lists what is left across services. Cost Explorer grouped by the <code>Project</code> tag (once activated as a cost allocation tag) shows what each lab really cost. An AWS Budgets alert at a few dollars is the safety net every learner account should have.</p>
      <p><b>Service quotas you may hit</b> in a busy sandbox: 5 Elastic IPs per region and 5 NAT gateways per AZ by default, 5 VPCs per region. Free them when done.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> an assistant will happily write this whole script, or the Terraform for it, in one go, and it is usually 90% right. The 10% is where the learning is: wrong waiter names, a NAT gateway in a private subnet, a missing association, a cleanup that releases the Elastic IP before the NAT has finished deleting (it fails), or a script with no cleanup at all.</p>
      <p><b>How to use it:</b> build the network by hand once (this lab), then ask AI to generate the script or Terraform and <b>review it against your mental model</b>: order of creation, order of deletion, cost items, which subnets are public. Ask it explicitly for the cleanup script and for a list of billable resources. Never give an agent long-lived keys to run it: use an SSO session in a sandbox account with a budget alert.</p>`,
    problems: [P({
      t: 'Tear it down: a cleanup that keeps failing with DependencyViolation', l: 'Medium', tags: ['vpc', 'cleanup', 'cost', 'dependency order'], co: ['AWS', 'HashiCorp', 'Cognizant'],
      s: `<p>A teammate's cleanup script for the lab runs these in order and stops at the first error:</p><pre>aws ec2 delete-vpc --vpc-id $VPC              # DependencyViolation
aws ec2 delete-internet-gateway --internet-gateway-id $IGW
aws ec2 release-address --allocation-id $EIP
aws ec2 delete-nat-gateway --nat-gateway-id $NAT</pre><p>Meanwhile the NAT gateway keeps billing. Explain every error this order causes, and write a cleanup that works the first time, including a check that nothing billable is left.</p>`,
      ex: `<p>Correct order starts with ${H.c('y', 'delete-nat-gateway')} → ${H.c('y', 'wait nat-gateway-deleted')} → ${H.c('g', 'release-address')} ... and ends with ${H.c('g', 'delete-vpc')}. Each step removes the last user of the next resource.</p>`,
      bw: `<p>Clicking "Delete VPC" in the console repeatedly, or adding <code>|| true</code> to every line so the script "succeeds". The console does some dependencies for you but not instances; <code>|| true</code> hides the one error that tells you a NAT gateway is still running.</p>`,
      q: ['Why must you wait after delete-nat-gateway before release-address?', ['The NAT holds the Elastic IP until it reaches the deleted state; releasing earlier fails', 'release-address needs the VPC to be deleted first', 'Elastic IPs can only be released after 24 hours', 'You do not need to wait'], 0, 'delete-nat-gateway returns immediately with state "deleting". The EIP stays associated until the NAT is gone (about a minute); aws ec2 wait nat-gateway-deleted handles that.'],
      h: ['<p>Hint 1: for each resource ask "who is still using it?": the VPC is used by subnets, the IGW, SGs; the IGW is attached; the EIP is held by the NAT; subnets hold ENIs.</p>', '<p>Hint 2: delete in reverse creation order, and use a waiter where deletion is asynchronous (instances, NAT gateways).</p>', '<p>Hint 3: end with describe calls for NAT gateways and addresses; empty output means the meter has stopped.</p>'],
      a: `<p><b>Errors with the given order:</b> (1) <code>delete-vpc</code> fails: the VPC still has subnets, an attached IGW, a NAT gateway (with its ENI), non-default SGs and route tables. (2) <code>delete-internet-gateway</code> fails: it is still <b>attached</b>; you must <code>detach-internet-gateway</code> first. (3) <code>release-address</code> fails: the Elastic IP is still <b>associated with the NAT gateway</b>. (4) Only the last line works, but the script never gets there because <code>set -e</code> (or a human) stops at the first error, so the NAT keeps billing. <b>Working order:</b> terminate any test instances and wait; <code>delete-nat-gateway</code> and <code>wait nat-gateway-deleted</code>; <code>release-address</code>; revoke cross-references and delete custom SGs; delete subnets (this drops route table and NACL associations); delete the custom NACL and route tables; <code>detach-internet-gateway</code>, then <code>delete-internet-gateway</code>; <code>delete-vpc</code>. <b>Check:</b> no NAT gateways in available/pending, no unassociated Elastic IPs, and a tag query for <code>Project=lab06</code> returns nothing. Better long-term: Terraform <code>destroy</code> (Cloud &amp; DevOps 9) computes this order for you.</p>`,
      code: R`#!/usr/bin/env bash
set -euo pipefail
source ./lab06.state      # VPC, NAT, EIP, IGW, subnets, SGs, ACL, route tables
aws ec2 delete-nat-gateway --nat-gateway-id "$NAT" > /dev/null
aws ec2 wait nat-gateway-deleted --nat-gateway-ids "$NAT"       # the meter stops here
aws ec2 release-address --allocation-id "$EIP"
aws ec2 revoke-security-group-ingress --group-id "$DB_SG" --protocol tcp --port 5432 --source-group "$WEB_SG"
aws ec2 delete-security-group --group-id "$DB_SG"
aws ec2 delete-security-group --group-id "$WEB_SG"
for S in "$PRIV_A" "$PRIV_B" "$PUB_A" "$PUB_B"; do aws ec2 delete-subnet --subnet-id "$S"; done
aws ec2 delete-network-acl --network-acl-id "$ACL"
for RT in "$PRIV_RT" "$PUB_RT"; do aws ec2 delete-route-table --route-table-id "$RT"; done
aws ec2 detach-internet-gateway --internet-gateway-id "$IGW" --vpc-id "$VPC"
aws ec2 delete-internet-gateway --internet-gateway-id "$IGW"
aws ec2 delete-vpc --vpc-id "$VPC"
# Nothing billable left?
aws ec2 describe-nat-gateways --filter Name=state,Values=available,pending --query 'NatGateways[].NatGatewayId' --output text
aws ec2 describe-addresses --query 'Addresses[?AssociationId==null].AllocationId' --output text
aws resourcegroupstaggingapi get-resources --tag-filters Key=Project,Values=lab06 \
  --query 'ResourceTagMappingList[].ResourceARN' --output text`,
      cx: `<p>About 3 minutes, most of it waiting for the NAT gateway. The order is the reverse of the build, which is the general rule for any dependent resources.</p>`,
      f: ['How would you make the cleanup safe to re-run after a partial failure?', 'Which resources in this lab would still cost money if only the VPC deletion failed?']
    })]
  });

  // ───────────────────────── Practice: Easy ─────────────────────────
  practice.push(P({
    t: 'Does this IAM action pattern match?', l: 'Easy', tags: ['iam', 'wildcards', 'python'], co: ['AWS', 'Amazon', 'Datadog'], lang: 'python', c: PYC,
    s: `<p>IAM policies use wildcards in <code>Action</code>: <code>*</code> matches any run of characters (including none) and <code>?</code> matches exactly one character. Action names are <b>case-insensitive</b>. Write <code>action_matches(pattern, action)</code> that returns <code>True</code> if the pattern matches the whole action name. You will reuse this in the policy evaluator.</p>`,
    ex: `<p><code>action_matches("s3:Get*", "s3:GetObject")</code> → ${H.c('g', 'True')}. <code>action_matches("s3:GetObject", "s3:GetObjectAcl")</code> → ${H.c('r', 'False')}: without a wildcard the whole name must match, so a longer name does not. <code>action_matches("S3:getobject", "s3:GetObject")</code> → ${H.c('g', 'True')} (case-insensitive).</p>`,
    bw: `<p>Using <code>action.startswith(pattern.rstrip("*"))</code>. It handles <code>s3:Get*</code> but breaks on <code>s3:*Object</code>, on <code>?</code>, on case differences, and wrongly says <code>s3:GetObject</code> matches <code>s3:GetObjectAcl</code> when the pattern has no star.</p>`,
    bc: `def action_matches(pattern, action):
    return action.startswith(pattern.rstrip("*"))   # wrong for *Object, ?, case, exact names`,
    q: ['Which actions does <code>"ec2:Describe*"</code> allow?', ['Every EC2 API whose name starts with Describe, such as DescribeInstances and DescribeVpcs', 'Only DescribeInstances', 'Every EC2 action', 'Describe actions in every service'], 0, 'The prefix ec2: limits it to EC2, and Describe* matches all names starting with Describe. It is the usual way to grant read-only EC2 visibility.'],
    h: ['<p>Hint 1: turn the pattern into a regular expression: <code>*</code> → <code>.*</code>, <code>?</code> → <code>.</code>, every other character escaped.</p>', '<p>Hint 2: use <code>re.fullmatch</code> (the whole string must match) with <code>re.IGNORECASE</code>.</p>', '<p>Hint 3: edge cases: <code>*</code> alone matches everything; <code>s3:Get*</code> matches <code>s3:Get</code> (empty run); dots or other regex characters in the pattern must be literal.</p>'],
    a: `<p>Translate the IAM glob into a regex character by character: star becomes "any run", question mark becomes "any one character", and everything else is escaped so a dot or plus in a name is literal. Then require a <b>full</b> match, case-insensitively. That mirrors AWS: <code>Action</code> and <code>NotAction</code> values are matched case-insensitively against <code>service:ApiName</code>. (Resource ARNs, by contrast, are case-sensitive: the evaluator problem uses the same function without the flag.)</p>`,
    code: `import re

def action_matches(pattern, action):
    """IAM-style match: * = any run of characters, ? = one character, case-insensitive."""
    regex = "".join(".*" if c == "*" else "." if c == "?" else re.escape(c) for c in pattern)
    return re.fullmatch(regex, action, re.IGNORECASE | re.DOTALL) is not None`,
    cx: `<p>O(P + A) to build and run the regex for pattern length P and action length A.</p>`,
    f: ['Why is <code>"Action": "s3:*"</code> on <code>"Resource": "*"</code> almost as dangerous as <code>"*"</code>?', 'How does <code>NotAction</code> change the meaning of a match?'],
    tests: { sig: 'string string -> bool', fn: 'actionMatches', cases: [
      [['s3:Get*', 's3:GetObject'], true], [['s3:Get*', 's3:PutObject'], false], [['*', 'ec2:RunInstances'], true], [['s3:*Object', 's3:DeleteObject'], true],
      [['S3:getobject', 's3:GetObject'], true], [['iam:Get?ser', 'iam:GetUser'], true], [['s3:GetObject', 's3:GetObjectAcl'], false], [['s3:Get*', 's3:Get'], true],
      [['ec2:Describe*', 'ec2:describevpcs'], true], [['iam:?', 'iam:GetUser'], false]
    ] }
  }));

  practice.push(P({
    t: 'Is this subnet public, private or isolated?', l: 'Easy', tags: ['route tables', 'subnets', 'python'], co: ['AWS Support', 'Wipro', 'Capgemini'], lang: 'python', c: PYC + '<p>Each route is <code>"DESTINATION=TARGET"</code> or <code>"DESTINATION=TARGET:blackhole"</code>. Targets start with <code>local</code>, <code>igw-</code>, <code>nat-</code>, <code>tgw-</code>, <code>eigw-</code>, <code>pcx-</code> or <code>vpce-</code>.</p>',
    s: `<p>An auditor gives you the routes of each subnet's route table and asks which subnets are public. Write <code>subnet_type(routes)</code> that returns:</p><ul><li><code>"public"</code> if an <b>active</b> default route (<code>0.0.0.0/0</code> or <code>::/0</code>) points to an internet gateway (<code>igw-</code>);</li><li>otherwise <code>"private-nat"</code> if an active <code>0.0.0.0/0</code> points to a NAT gateway (<code>nat-</code>);</li><li>otherwise <code>"private-other"</code> if any other active default route exists (transit gateway, egress-only IGW...);</li><li>otherwise <code>"isolated"</code>.</li></ul>`,
    ex: `<p><code>["10.0.0.0/16=local", "0.0.0.0/0=nat-0b:blackhole"]</code> → ${H.c('y', '"isolated"')}: the only default route is a blackhole, so nothing leaves the VPC (and the update ticket is on its way).</p>`,
    bw: `<p>Classifying by the subnet's <b>name tag</b> ("public-a") or by whether instances have public IPs. Names lie, and a public IP without an IGW route is useless; only the route table decides.</p>`,
    q: ['A subnet has <code>::/0 → igw-0a</code> but no IPv4 default route. Is it public?', ['Yes, for IPv6: instances with IPv6 addresses are reachable both ways', 'No: only 0.0.0.0/0 counts', 'Only if it also has a NAT', 'Only if MapPublicIpOnLaunch is on'], 0, 'IPv6 has no NAT. A ::/0 route to an internet gateway makes the subnet public for IPv6. Outbound-only IPv6 uses an egress-only internet gateway (eigw-) instead.'],
    h: ['<p>Hint 1: split each route at the first <code>=</code>; a target may end in <code>:blackhole</code>, which means "ignore this route".</p>', '<p>Hint 2: only default routes (<code>0.0.0.0/0</code>, <code>::/0</code>) decide the class; <code>local</code>, peering and endpoint routes do not make a subnet public.</p>', '<p>Hint 3: an IGW route wins immediately; otherwise remember whether you saw a NAT or another default target, then return in priority order.</p>'],
    a: `<p>Walk the routes once. Skip blackhole routes and anything that is not a default route. An internet gateway target makes the subnet public straight away (two-way internet for instances with public addresses). Otherwise a NAT default route makes it private with egress; any other default target (transit gateway to a central egress VPC, egress-only IGW for IPv6) is still private but leaves the VPC another way; no default route at all is isolated: perfect for databases. This is exactly the check to run when someone asks "is our DB subnet really private?".</p>`,
    code: `def subnet_type(routes):
    """Classify a subnet from its route table entries."""
    kind = "isolated"
    for r in routes:
        dest, target = r.split("=", 1)
        state = "active"
        if ":" in target:
            target, state = target.split(":", 1)      # "nat-0b:blackhole"
        if state != "active" or dest not in ("0.0.0.0/0", "::/0"):
            continue                                  # only live default routes decide
        if target.startswith("igw-"):
            return "public"
        if dest == "0.0.0.0/0" and target.startswith("nat-"):
            kind = "private-nat"
        elif kind == "isolated":
            kind = "private-other"
    return kind`,
    cx: `<p>O(R) time for R routes, O(1) extra space.</p>`,
    f: ['Which AWS CLI query would produce these route strings for every subnet in a VPC?', 'Why should the main route table be "isolated"?'],
    tests: { sig: 'string[] -> string', fn: 'subnetType', cases: [
      [[['10.0.0.0/16=local', '0.0.0.0/0=igw-0a']], 'public'], [[['10.0.0.0/16=local', '0.0.0.0/0=nat-0b']], 'private-nat'], [[['10.0.0.0/16=local']], 'isolated'],
      [[['10.0.0.0/16=local', '0.0.0.0/0=nat-0b:blackhole']], 'isolated'], [[['10.0.0.0/16=local', '::/0=igw-0a']], 'public'], [[['10.0.0.0/16=local', '0.0.0.0/0=tgw-01']], 'private-other'],
      [[['10.0.0.0/16=local', '0.0.0.0/0=nat-0b', '::/0=eigw-0c']], 'private-nat'], [[['10.0.0.0/16=local', '10.1.0.0/16=pcx-11']], 'isolated'], [[[]], 'isolated'],
      [[['0.0.0.0/0=nat-0b', '10.0.0.0/16=local', '0.0.0.0/0=igw-0a:blackhole']], 'private-nat']
    ] }
  }));

  practice.push(P({
    t: 'Write the least-privilege policy for a Lambda function', l: 'Easy', tags: ['iam', 'least privilege', 'lambda', 'dynamodb'], co: ['Amazon', 'Netflix', 'Thoughtworks'], lang: 'json', c: LABIAM,
    s: `<p>The Lambda function <code>orders-writer</code> in account <code>123456789012</code>, region <code>us-east-1</code>, does exactly two things: it puts and updates items in the DynamoDB table <code>Orders</code>, and it writes logs to its own CloudWatch log group <code>/aws/lambda/orders-writer</code>. A developer attached <code>AmazonDynamoDBFullAccess</code> and <code>CloudWatchLogsFullAccess</code>. Write the least-privilege permission policy for its execution role.</p>`,
    ex: `<p>After the change, <code>dynamodb:PutItem</code> on <code>table/Orders</code> is ${H.c('g', 'allowed')}, <code>dynamodb:DeleteTable</code> on <code>table/Orders</code> is ${H.c('r', 'implicitly denied')}, and <code>PutItem</code> on <code>table/Payments</code> is ${H.c('r', 'implicitly denied')}.</p>`,
    bw: `<p>Keeping the two FullAccess managed policies. They let a bug or an attacker who controls the function delete every table and every log group in the account, read all data, and change backups. Convenience policies are for exploring, not for workloads.</p>`,
    q: ['Which resource ARN limits DynamoDB access to one table?', ['arn:aws:dynamodb:us-east-1:123456789012:table/Orders', 'arn:aws:dynamodb:::Orders', 'arn:aws:dynamodb:*:*:*', 'Orders'], 0, 'DynamoDB ARNs include region and account: arn:aws:dynamodb:REGION:ACCOUNT:table/NAME. Indexes are table/NAME/index/*, streams table/NAME/stream/*.'],
    h: ['<p>Hint 1: list the API calls the code makes: <code>PutItem</code>, <code>UpdateItem</code>; and for logging <code>CreateLogStream</code>, <code>PutLogEvents</code> (Lambda creates the group, or you create it in IaC).</p>', '<p>Hint 2: one statement per resource type: the table ARN, and the log group ARN with <code>:*</code> for its streams.</p>', '<p>Hint 3: validate with <code>aws accessanalyzer validate-policy</code> and simulate one allowed and one dangerous call before you detach the FullAccess policies.</p>'],
    a: `<p>Start from what the code does, not from what might be handy. Two statements: (1) <code>dynamodb:PutItem</code> and <code>dynamodb:UpdateItem</code> on <code>arn:aws:dynamodb:us-east-1:123456789012:table/Orders</code>; (2) <code>logs:CreateLogStream</code> and <code>logs:PutLogEvents</code> on <code>arn:aws:logs:us-east-1:123456789012:log-group:/aws/lambda/orders-writer:*</code>. Add <code>logs:CreateLogGroup</code> only if the group is not created by your IaC. If the function later needs to read (<code>GetItem</code>, <code>Query</code>), add exactly those. Roll out safely: attach the new policy, keep FullAccess for a day while watching CloudTrail for AccessDenied, then detach FullAccess. Use the IAM policy simulator to prove <code>DeleteTable</code> is denied.</p>`,
    code: `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "WriteOrdersTable",
      "Effect": "Allow",
      "Action": ["dynamodb:PutItem", "dynamodb:UpdateItem"],
      "Resource": "arn:aws:dynamodb:us-east-1:123456789012:table/Orders"
    },
    {
      "Sid": "OwnLogsOnly",
      "Effect": "Allow",
      "Action": ["logs:CreateLogStream", "logs:PutLogEvents"],
      "Resource": "arn:aws:logs:us-east-1:123456789012:log-group:/aws/lambda/orders-writer:*"
    }
  ]
}`,
    cx: `<p>Two statements, four actions. The blast radius shrinks from "every table and log group in the account" to "write rows in one table".</p>`,
    f: ['The function now reads a KMS-encrypted secret. Which actions and resources do you add?', 'How would Access Analyzer policy generation have produced this for you?']
  }));

  practice.push(P({
    t: 'The web tier cannot reach the database tier', l: 'Easy', tags: ['security groups', 'sg reference', 'troubleshooting'], co: ['AWS Support', 'Infosys', 'Rackspace'],
    s: `<p>New web instances (<code>i-0web1</code>, <code>i-0web2</code>) in subnets web-a/web-b time out connecting to PostgreSQL at <code>orders-db.cluster-abc.us-east-1.rds.amazonaws.com:5432</code>. Old app instances connect fine. Facts:</p><pre>db-sg inbound: tcp 5432 from sg-0app (app-sg)
web instances: security groups = web-sg (sg-0web)
route tables: all subnets have 10.20.0.0/16 local
NACLs: default (allow all)</pre><p>Explain the cause and fix it with the smallest safe change.</p>`,
    ex: `<p>The packet reaches the DB's ENI by the ${H.c('g', 'local route')}, but db-sg asks "${H.c('y', 'does the sender carry app-sg?')}". The web ENIs carry ${H.c('r', 'web-sg only')}, so the SYN is dropped: timeout.</p>`,
    bw: `<p>Adding <code>5432 from 0.0.0.0/0</code> (or from <code>10.20.0.0/16</code>) to db-sg. It works, and it lets every instance in the VPC (or the world, if the DB has a public endpoint) try to log in to the database.</p>`,
    q: ['What does an SG rule "5432 from sg-0app" match?', ['Traffic from network interfaces that have sg-0app attached, using private IPs', 'Traffic from the subnet where sg-0app was created', 'Traffic from instances whose Name tag contains "app"', 'Any traffic inside the VPC'], 0, 'A security group reference matches membership of the source ENI. Subnets, names and tags do not matter.'],
    h: ['<p>Hint 1: routes and NACLs are fine (local route, default NACL). The only filter left is db-sg.</p>', '<p>Hint 2: compare the groups on the web ENIs with the group referenced by db-sg.</p>', '<p>Hint 3: decide: should web servers talk to the DB directly? If yes, add a db-sg rule for web-sg with a description; if they are really app servers, attach app-sg instead.</p>'],
    a: `<p><b>Cause:</b> db-sg allows 5432 only from members of <code>app-sg</code>. The new web instances carry only <code>web-sg</code>, so their SYNs are silently dropped at the DB's ENI and the client times out. Routing and NACLs are not involved (local route, default NACL). <b>Smallest safe fix:</b> if the web tier should query the DB, add one rule to db-sg: tcp 5432 from <code>web-sg</code>, with a description. Do not use a CIDR: the reference automatically covers every future instance in web-sg and nothing else. If the web instances are actually meant to be app servers, attach <code>app-sg</code> to them instead. <b>Prove it</b> with <code>nc -vz</code> from a web instance (via SSM) or Reachability Analyzer from i-0web1 to the DB ENI on 5432. Remember that references only work when connecting to the DB's private address; the RDS endpoint resolves to the private IP inside the VPC.</p>`,
    code: R`DB_SG=sg-0db; WEB_SG=sg-0web     # example ids
# Confirm: which groups do the web instances have?
aws ec2 describe-instances --instance-ids i-0web1 i-0web2 \
  --query 'Reservations[].Instances[].[InstanceId,SecurityGroups[].GroupId|join(` + "`,`" + R`,@)]' --output text
# Fix: allow 5432 from members of web-sg, with a description for the next person
aws ec2 authorize-security-group-ingress --group-id "$DB_SG" --ip-permissions \
  'IpProtocol=tcp,FromPort=5432,ToPort=5432,UserIdGroupPairs=[{GroupId='"$WEB_SG"',Description="web tier to orders-db"}]'
# Test from a web instance through SSM (no SSH)
aws ssm send-command --instance-ids i-0web1 --document-name AWS-RunShellScript \
  --parameters 'commands=["timeout 5 bash -c \"exec 3<>/dev/tcp/orders-db.cluster-abc.us-east-1.rds.amazonaws.com/5432\" && echo open"]'`,
    cx: `<p>One describe, one rule. Reachability Analyzer would have named "db-sg: no matching inbound rule" directly.</p>`,
    f: ['The DB endpoint resolves to a public IP from the web instances. What does that tell you, and what breaks?', 'How do Azure application security groups express the same rule?']
  }));

  // ───────────────────────── Practice: Medium ─────────────────────────
  practice.push(P({
    t: 'Evaluate a stateless NACL in rule-number order', l: 'Medium', tags: ['nacl', 'stateless', 'python'], co: ['AWS', 'Cisco', 'Palo Alto Networks'], lang: 'python', c: PYC + '<p>Each rule is <code>"NUMBER ACTION PROTO PORTS CIDR"</code>, for example <code>"100 allow tcp 443 0.0.0.0/0"</code> or <code>"110 allow tcp 1024-65535 0.0.0.0/0"</code>. PROTO is <code>tcp</code>, <code>udp</code> or <code>all</code> (ports are ignored for <code>all</code>). PORTS is a number, a range or <code>all</code>. Rules may arrive in any order.</p>',
    s: `<p>Write <code>nacl_decision(rules, proto, port, ip)</code> for one direction of a network ACL. <code>ip</code> is the remote address of the packet (source for inbound, destination for outbound) and <code>port</code> its destination port. Evaluate rules by <b>ascending number</b>; the first matching rule decides. Return <code>"allow:N"</code> or <code>"deny:N"</code>, or <code>"deny:*"</code> if no rule matches.</p>`,
    ex: `<p>Rules <code>["100 allow tcp 443 0.0.0.0/0", "90 deny all all 203.0.113.0/24"]</code>, packet tcp 443 from 203.0.113.5 → ${H.c('r', '"deny:90"')}: rule 90 comes first even though it is listed second. From 198.51.100.7 → ${H.c('g', '"allow:100"')}.</p>`,
    bw: `<p>Checking whether <b>any</b> allow rule matches (security-group thinking). NACLs stop at the first match, so a deny with a lower number must win over a later allow, and an allow with a lower number must win over a later deny.</p>`,
    q: ['Outbound rules: 100 allow tcp 443, 200 deny tcp 1024-65535, 300 allow all. A reply to a client on port 51544?', ['deny:200', 'allow:300', 'allow:100', 'deny:*'], 0, 'Rule 100 does not match port 51544; rule 200 does, and it is a deny, so evaluation stops there. Rule 300 is never reached.'],
    h: ['<p>Hint 1: parse each rule into a tuple, then sort by the rule number as an integer (not as a string: "90" &gt; "100" as strings).</p>', '<p>Hint 2: a rule matches when the protocol fits (or is <code>all</code>), the port is in range (unless proto or ports is <code>all</code>), and the address is inside the CIDR.</p>', '<p>Hint 3: return on the first match; if the loop ends, return <code>"deny:*"</code>, the rule every NACL ends with.</p>'],
    a: `<p>Parse every rule, sort by number, and test them in order. For each: protocol must equal the packet's or be <code>all</code>; for tcp/udp rules with a port range, the packet's port must be inside it; the remote address must be inside the CIDR (use <code>ipaddress</code>). The first rule that passes all three checks decides, and its number is part of the answer so a human can find it. No match → the implicit <code>*</code> deny. Run it twice per connection, once per direction, to see why stateless filtering needs the ephemeral range for replies.</p>`,
    code: `import ipaddress

def nacl_decision(rules, proto, port, ip):
    """First matching rule by ascending number decides; otherwise the final * rule denies."""
    addr = ipaddress.ip_address(ip)
    parsed = []
    for r in rules:
        num, action, rproto, ports, block = r.split()
        parsed.append((int(num), action, rproto, ports, ipaddress.ip_network(block, strict=False)))
    for num, action, rproto, ports, net in sorted(parsed, key=lambda x: x[0]):
        if rproto != "all":
            if rproto != proto:
                continue
            if ports != "all":
                lo, _, hi = ports.partition("-")
                lo = int(lo)
                hi = int(hi) if hi else lo
                if not lo <= port <= hi:
                    continue
        if addr not in net:
            continue
        return f"{action}:{num}"
    return "deny:*"`,
    cx: `<p>O(R log R) to sort R rules, then O(R) per packet. Real NACLs are capped at 20 rules per direction by default (40 maximum).</p>`,
    f: ['Use the function to show that the outbound rules ["100 allow tcp 443 0.0.0.0/0"] block HTTPS replies.', 'Why does AWS suggest numbering rules in steps of 10 or 100?'],
    tests: { sig: 'string[] string int string -> string', fn: 'naclDecision', cases: [
      [[['100 allow tcp 443 0.0.0.0/0', '90 deny all all 203.0.113.0/24'], 'tcp', 443, '203.0.113.5'], 'deny:90'],
      [[['100 allow tcp 443 0.0.0.0/0', '90 deny all all 203.0.113.0/24'], 'tcp', 443, '198.51.100.7'], 'allow:100'],
      [[['100 allow tcp 443 0.0.0.0/0'], 'tcp', 51544, '203.0.113.7'], 'deny:*'],
      [[['100 allow tcp 443 0.0.0.0/0', '110 allow tcp 1024-65535 0.0.0.0/0'], 'tcp', 51544, '203.0.113.7'], 'allow:110'],
      [[['100 allow tcp 443 0.0.0.0/0', '200 deny tcp 1024-65535 0.0.0.0/0', '300 allow all all 0.0.0.0/0'], 'tcp', 51544, '203.0.113.7'], 'deny:200'],
      [[['100 allow udp 53 10.0.0.0/16'], 'tcp', 53, '10.0.0.2'], 'deny:*'],
      [[['100 allow udp 53 10.0.0.0/16'], 'udp', 53, '10.0.0.2'], 'allow:100'],
      [[['100 allow tcp 5432 10.20.10.0/23'], 'tcp', 5432, '10.20.12.9'], 'deny:*'],
      [[['32766 allow all all 0.0.0.0/0', '5 deny tcp 22 0.0.0.0/0'], 'tcp', 22, '192.0.2.1'], 'deny:5'],
      [[[], 'tcp', 80, '192.0.2.1'], 'deny:*']
    ] }
  }));

  practice.push(P({
    t: 'Route lookup with blackhole routes', l: 'Medium', tags: ['route tables', 'longest prefix match', 'nat gateway', 'python'], co: ['AWS', 'Juniper', 'Cloudflare'], lang: 'python', c: PYC + '<p>Routes are <code>"CIDR=TARGET"</code> or <code>"CIDR=TARGET:blackhole"</code>. No two routes have the same destination CIDR (AWS forbids it in one table).</p>',
    s: `<p>Cloud &amp; DevOps 3 built a longest-prefix-match function. Real VPC route tables add a twist: when a route's target is deleted (a NAT gateway, an instance, an ENI), the route stays and turns into a <b>blackhole</b>. If the most specific matching route is a blackhole, the packet is <b>dropped</b>: AWS does <b>not</b> fall back to a less specific route. Write <code>route_target(routes, ip)</code> returning the winning target, <code>"blackhole"</code>, or <code>"no-route"</code>.</p>`,
    ex: `<p><code>["10.20.0.0/16=local", "0.0.0.0/0=nat-0a:blackhole"]</code> and <code>151.101.1.1</code> → ${H.c('r', '"blackhole"')}: the private instance cannot download updates. With <code>"203.0.113.0/24=tgw-01"</code> added, <code>203.0.113.9</code> → ${H.c('g', '"tgw-01"')} (the /24 beats the dead /0).</p>`,
    bw: `<p>Skipping blackhole routes and continuing to look for another match. That is how many people <i>expect</i> it to work, and it gives the wrong answer: AWS picks the most specific route first and only then checks whether its target is alive.</p>`,
    q: ['Routes: 10.20.0.0/16 local, 10.20.5.0/24 → eni-0fw:blackhole. Where does 10.20.5.9 go?', ['Dropped: the /24 blackhole is the most specific match', 'local: AWS falls back to the /16', 'no-route', 'The NAT gateway'], 0, 'Longest prefix wins first. The /24 wins, its target is gone, so the packet is dropped. (In real AWS a route more specific than local to an appliance ENI is allowed for inspection setups.)'],
    h: ['<p>Hint 1: this is longest prefix match, with the blackhole check done <b>after</b> choosing the winner.</p>', '<p>Hint 2: keep the best prefix length seen so far and a "best answer"; when a route wins, set the answer to <code>"blackhole"</code> if its target ends with <code>:blackhole</code>.</p>', '<p>Hint 3: start with <code>"no-route"</code> and length −1 so that <code>0.0.0.0/0</code> (length 0) still beats "no route".</p>'],
    a: `<p>Parse each route with <code>ipaddress.ip_network</code>. For the destination, keep the matching route with the largest prefix length. The answer is that route's target, or <code>"blackhole"</code> if the route is in blackhole state; with no match, <code>"no-route"</code>. In the console and in <code>describe-route-tables</code> the state appears as <code>State: blackhole</code>. Operationally: alarm on any blackhole route, and when a NAT gateway is replaced, run <code>replace-route</code> on every table that pointed at the old one (IaC does this for you).</p>`,
    code: `import ipaddress

def route_target(routes, ip):
    """Longest prefix match; a winning blackhole route drops the packet (no fallback)."""
    addr = ipaddress.ip_address(ip)
    best, best_len = "no-route", -1
    for r in routes:
        dest, target = r.split("=", 1)
        net = ipaddress.ip_network(dest, strict=False)
        if addr in net and net.prefixlen > best_len:
            best_len = net.prefixlen
            best = "blackhole" if target.endswith(":blackhole") else target
    return best`,
    cx: `<p>O(R) per lookup for R routes.</p>`,
    f: ['Write the CLI query that lists every blackhole route in a region.', 'Why might a FinOps script create blackholes, and how would you guard against it?'],
    tests: { sig: 'string[] string -> string', fn: 'routeTarget', cases: [
      [[['10.20.0.0/16=local', '0.0.0.0/0=nat-0a:blackhole'], '151.101.1.1'], 'blackhole'],
      [[['10.20.0.0/16=local', '0.0.0.0/0=nat-0a:blackhole', '203.0.113.0/24=tgw-01'], '203.0.113.9'], 'tgw-01'],
      [[['10.20.0.0/16=local', '0.0.0.0/0=nat-0a'], '151.101.1.1'], 'nat-0a'],
      [[['10.20.0.0/16=local', '0.0.0.0/0=nat-0a'], '10.20.44.1'], 'local'],
      [[['10.20.0.0/16=local'], '8.8.8.8'], 'no-route'],
      [[['10.20.0.0/16=local', '10.20.5.0/24=eni-0fw:blackhole'], '10.20.5.9'], 'blackhole'],
      [[['10.20.0.0/16=local', '10.20.5.0/24=eni-0fw:blackhole'], '10.20.6.9'], 'local'],
      [[['0.0.0.0/0=igw-01', '10.20.0.0/16=local', '10.30.0.0/16=pcx-02'], '10.30.1.1'], 'pcx-02'],
      [[[], '10.0.0.1'], 'no-route']
    ] }
  }));

  practice.push(P({
    t: 'Replace an over-broad "Action": "*" policy without breaking the app', l: 'Medium', tags: ['iam', 'least privilege', 'access analyzer', 'cloudtrail'], co: ['Amazon', 'Capital One', 'Deloitte'], lang: 'json', c: LABIAM,
    s: `<p>The role <code>invoice-app-role</code> has an inline policy <code>{"Effect": "Allow", "Action": "*", "Resource": "*"}</code>. In the last 90 days CloudTrail shows it calling only: <code>s3:GetObject</code> and <code>s3:PutObject</code> on <code>invoices-bucket/2026/*</code>, <code>sqs:ReceiveMessage</code> and <code>sqs:DeleteMessage</code> on queue <code>invoice-jobs</code>, <code>kms:Decrypt</code> with key <code>1234abcd-12ab-34cd-56ef-1234567890ab</code>, and <code>ssm:GetParameter</code> on <code>/invoice/*</code>. Write the replacement policy and the rollout plan.</p>`,
    ex: `<p>Before: ${H.c('r', 'iam:CreateUser, ec2:TerminateInstances, s3:DeleteBucket ... all allowed')}. After: ${H.c('g', '7 actions on 4 resources')}; everything else is an implicit deny.</p>`,
    bw: `<p>Deleting the <code>*</code> policy on a Friday and attaching a guess. The first nightly job that needs an action you forgot fails at 2 a.m. The other bad option, leaving it because "it works", keeps a full-admin role inside an internet-facing app.</p>`,
    q: ['What is the safest way to find what the role really needs?', ['Access Analyzer policy generation from CloudTrail, plus service last-accessed data', 'Ask ChatGPT what an invoice app needs', 'Copy AWS managed FullAccess policies for each service', 'Remove permissions one at a time until something breaks'], 0, 'Policy generation reads the role\'s actual CloudTrail activity and drafts a policy with those actions; last-accessed data confirms which services are unused. You then tighten resources by hand.'],
    h: ['<p>Hint 1: group the observed calls by resource type: S3 objects, the SQS queue ARN, the KMS key ARN, SSM parameter ARNs.</p>', '<p>Hint 2: resources: <code>arn:aws:s3:::invoices-bucket/2026/*</code>, <code>arn:aws:sqs:us-east-1:123456789012:invoice-jobs</code>, <code>arn:aws:kms:us-east-1:123456789012:key/KEY-ID</code>, <code>arn:aws:ssm:us-east-1:123456789012:parameter/invoice/*</code>.</p>', '<p>Hint 3: rollout: attach new, watch, then remove old. Use <code>simulate-principal-policy</code> and CloudTrail AccessDenied alerts during the overlap.</p>'],
    a: `<p><b>Policy:</b> four statements, one per resource type (below). The KMS decrypt is needed because the bucket or parameters are encrypted with that key; you could narrow it further with <code>kms:ViaService</code> so the key can only be used through S3 and SSM. <b>Rollout:</b> (1) run Access Analyzer policy generation on the role for 90 days to confirm the list and catch rare actions (monthly jobs!); (2) attach the new policy <b>alongside</b> the old one; (3) simulate each observed call against the new policy alone with <code>simulate-custom-policy</code>; (4) remove the <code>*</code> policy in a quiet window and watch CloudTrail for <code>AccessDenied</code> from this role for a week, with an alarm; (5) add a permission boundary or SCP so <code>*</code> cannot silently return; (6) put an Access Analyzer <code>check-no-new-access</code> step in the pipeline that deploys IAM.</p>`,
    code: `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "Invoices2026Objects",
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject"],
      "Resource": "arn:aws:s3:::invoices-bucket/2026/*"
    },
    {
      "Sid": "InvoiceJobsQueue",
      "Effect": "Allow",
      "Action": ["sqs:ReceiveMessage", "sqs:DeleteMessage"],
      "Resource": "arn:aws:sqs:us-east-1:123456789012:invoice-jobs"
    },
    {
      "Sid": "DecryptWithInvoiceKeyViaS3AndSsm",
      "Effect": "Allow",
      "Action": "kms:Decrypt",
      "Resource": "arn:aws:kms:us-east-1:123456789012:key/1234abcd-12ab-34cd-56ef-1234567890ab",
      "Condition": { "StringEquals": { "kms:ViaService": ["s3.us-east-1.amazonaws.com", "ssm.us-east-1.amazonaws.com"] } }
    },
    {
      "Sid": "InvoiceParameters",
      "Effect": "Allow",
      "Action": "ssm:GetParameter",
      "Resource": "arn:aws:ssm:us-east-1:123456789012:parameter/invoice/*"
    }
  ]
}`,
    cx: `<p>A one-week overlap period; the policy itself is 4 statements. Access Analyzer unused-access findings will tell you if any of these 7 actions stop being used.</p>`,
    f: ['A quarterly job also calls s3:ListBucket. Which statement and resource do you add?', 'How would you enforce "no Action * on Resource *" across all accounts?']
  }));

  practice.push(P({
    t: 'The instance cannot use its role: debug the trust policy', l: 'Medium', tags: ['iam', 'roles', 'trust policy', 'ec2'], co: ['AWS Support', 'Accenture', 'Rackspace'], lang: 'json', c: LABIAM,
    s: `<p>A new EC2 instance runs <code>aws s3 ls s3://reports-bucket</code> and gets <code>Unable to locate credentials</code>. You check:</p><pre>aws ec2 describe-instances ... IamInstanceProfile: (none)
role report-app-role trust policy:
{ "Version": "2012-10-17", "Statement": [ { "Effect": "Allow",
  "Principal": { "Service": "lambda.amazonaws.com" }, "Action": "sts:AssumeRole" } ] }</pre><p>An engineer then attached an instance profile containing the role, and the error changed to nothing at all: the CLI hangs and returns no credentials. Find both problems and fix them.</p>`,
    ex: `<p>Problem 1: ${H.c('r', 'no instance profile')} → nothing for the SDK to find. Problem 2: the role trusts ${H.c('r', 'lambda.amazonaws.com')}, so EC2 is not allowed to assume it and the metadata service has no credentials to hand out.</p>`,
    bw: `<p>Creating an IAM user, putting its access keys in <code>~/.aws/credentials</code> on the instance and moving on. It "works" and creates a long-lived secret on a server, readable by anyone who gets a shell or an SSRF into it.</p>`,
    q: ['Which principal must the trust policy name for an EC2 instance role?', ['{"Service": "ec2.amazonaws.com"}', '{"AWS": "arn:aws:iam::123456789012:root"}', '{"Service": "sts.amazonaws.com"}', 'The instance id'], 0, 'EC2 assumes the role on the instance\'s behalf, so the EC2 service principal must be trusted. The instance profile is the container that links the role to instances.'],
    h: ['<p>Hint 1: two separate things are needed: an instance profile attached to the instance, and a role whose trust policy lets the EC2 service assume it.</p>', '<p>Hint 2: on the instance, <code>curl</code> the IMDSv2 path <code>/latest/meta-data/iam/info</code>: it tells you whether a profile is attached and if credentials could be obtained.</p>', '<p>Hint 3: fix the trust with <code>aws iam update-assume-role-policy</code>; if both Lambda and EC2 really need the same permissions, list both services in the principal, but prefer separate roles.</p>'],
    a: `<p><b>Problem 1:</b> no instance profile was attached, so the instance metadata service had no role to offer, and the CLI's credential chain found nothing: "Unable to locate credentials". Attaching the profile was correct. <b>Problem 2:</b> the role's <b>trust policy</b> only trusts <code>lambda.amazonaws.com</code> (it was probably copied from a Lambda role). EC2 asks STS to assume the role for the instance and is refused, so <code>/latest/meta-data/iam/security-credentials/report-app-role</code> returns an error and the SDK gets no credentials. <b>Fix:</b> update the trust policy to <code>{"Service": "ec2.amazonaws.com"}</code> (below). Within a minute or so the metadata service serves credentials and <code>aws sts get-caller-identity</code> on the instance shows <code>assumed-role/report-app-role/i-...</code>. <b>Lesson:</b> trust policy = who may become the role; permission policy = what it may do. Debug them separately. Keep one role per workload type rather than trusting several services.</p>`,
    code: `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "Ec2MayAssume",
      "Effect": "Allow",
      "Principal": { "Service": "ec2.amazonaws.com" },
      "Action": "sts:AssumeRole"
    }
  ]
}`,
    cx: `<p>Two checks (profile attached? trust correct?), one <code>update-assume-role-policy</code> call. The <code>iam/info</code> metadata path tells you which one failed.</p>`,
    f: ['How do you apply this trust policy from the CLI?', 'Why should you add <code>aws:SourceAccount</code> conditions to some service trust policies?']
  }));

  practice.push(P({
    t: 'Denied in eu-west-1: an explicit deny you cannot override', l: 'Medium', tags: ['iam', 'scp', 'explicit deny', 'organizations'], co: ['AWS', 'JPMorgan Chase', 'Deloitte'], lang: 'json', c: LABIAM + '<p>The account is a member of an AWS Organization. You can read the SCPs but only the cloud platform team can change them.</p>',
    s: `<p>A developer with <code>AdministratorAccess</code> tries to create an S3 bucket in <code>eu-west-1</code> for a new EU customer and gets: <code>... is not authorized to perform: s3:CreateBucket ... with an explicit deny in a service control policy</code>. They try attaching another admin policy; nothing changes. The SCP is a region lock that allows only <code>us-east-1</code> and <code>us-west-2</code>. Explain why more Allow policies never help, and write the change you would propose to the platform team so EU workloads can run in <code>eu-west-1</code> while global services keep working.</p>`,
    ex: `<p>Evaluation: ${H.c('r', 'explicit deny in SCP')} → stop. The developer's ${H.c('g', 'AdministratorAccess Allow')} is never even reached.</p>`,
    bw: `<p>Asking the platform team to "remove the SCP for our account". That removes a guard rail for every service and region to solve a one-region need, and fails audits that rely on data staying in approved regions.</p>`,
    q: ['Which policies can override an explicit deny in an SCP?', ['None: an explicit deny always wins; the SCP itself must change', 'An identity policy with AdministratorAccess', 'A resource-based policy on the bucket', 'A permission boundary'], 0, 'Explicit deny is final across every policy type. Only editing or detaching the SCP (by the organization admins) changes the result.'],
    h: ['<p>Hint 1: read the last part of the error: "with an explicit deny in a service control policy". That names the layer.</p>', '<p>Hint 2: region locks use <code>"Condition": {"StringNotEquals": {"aws:RequestedRegion": [...]}}</code> on a Deny, with <code>NotAction</code> for global services such as IAM, Organizations, CloudFront, Route 53 and Support.</p>', '<p>Hint 3: propose adding <code>eu-west-1</code> to the allowed list (or a separate SCP for an EU organizational unit), keep the global-service exceptions, and test with a non-admin role in a sandbox OU first.</p>'],
    a: `<p><b>Why Allows do not help:</b> evaluation checks for explicit denies first, across every policy type. The SCP's Deny matches <code>s3:CreateBucket</code> in <code>eu-west-1</code>, so the answer is Deny before identity policies are even considered. AdministratorAccess, a second admin policy, a bucket policy or a role in the same account cannot change that. <b>Proposed change:</b> the platform team adds <code>eu-west-1</code> to the region list (better: moves EU workload accounts into an OU with an "EU regions" SCP so US accounts stay locked). The statement keeps <code>NotAction</code> for global services, whose API calls are recorded against us-east-1 and would otherwise break. Before rollout they test in a sandbox OU, and the developer verifies with the IAM policy simulator, which includes SCP effects for member accounts, and by creating the bucket. Also note data residency: the EU customer's contract may require eu-west-1 <b>only</b>, which is a reason to have a dedicated EU account.</p>`,
    code: `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyOutsideApprovedRegions",
      "Effect": "Deny",
      "NotAction": [
        "iam:*", "organizations:*", "sts:*", "support:*", "budgets:*",
        "cloudfront:*", "route53:*", "waf:*", "health:*", "account:*"
      ],
      "Resource": "*",
      "Condition": {
        "StringNotEquals": { "aws:RequestedRegion": ["us-east-1", "us-west-2", "eu-west-1"] },
        "ArnNotLike": { "aws:PrincipalARN": "arn:aws:iam::*:role/PlatformBreakGlass" }
      }
    }
  ]
}`,
    cx: `<p>Diagnosis is reading one error line; the fix is a reviewed change in one SCP, tested in a sandbox OU.</p>`,
    f: ['Why does the SCP need NotAction for IAM and CloudFront?', 'How would you let only one account use eu-west-1?']
  }));

  practice.push(P({
    t: 'Force MFA for legacy IAM users', l: 'Medium', tags: ['iam', 'mfa', 'conditions', 'explicit deny'], co: ['AWS', 'Okta', 'HSBC'], lang: 'json', c: LABIAM,
    s: `<p>The company still has 12 IAM users for a legacy tool while it migrates to IAM Identity Center. Security wants: until a user has signed in with MFA, they may only manage their <b>own</b> password and MFA device; every other action is denied. After MFA sign-in, their normal group policies apply. Write the policy you attach to the <code>LegacyUsers</code> group.</p>`,
    ex: `<p>Without MFA, Bob can call ${H.c('g', 'iam:CreateVirtualMFADevice, iam:EnableMFADevice')} on himself, but ${H.c('r', 's3:ListAllMyBuckets')} is denied. After signing in with MFA, ${H.c('g', 'his group\'s normal allows work')}.</p>`,
    bw: `<p>An Allow statement with <code>"Condition": {"Bool": {"aws:MultiFactorAuthPresent": "true"}}</code> on the existing permissions. Any other policy without that condition (a managed policy attached later) still allows everything without MFA, because allows add up. Only an explicit Deny enforces it.</p>`,
    q: ['Why <code>BoolIfExists</code> rather than <code>Bool</code> in the deny?', ['Requests signed with long-term access keys have no MFA key at all; IfExists treats a missing key as matching the deny', 'Bool does not work with Deny', 'IfExists is faster', 'There is no difference'], 0, 'aws:MultiFactorAuthPresent is absent for calls made with long-term access keys. BoolIfExists with "false" makes those calls denied too; plain Bool would not match a missing key and would let them through.'],
    h: ['<p>Hint 1: two parts: allow self-service MFA and password actions on <code>arn:aws:iam::123456789012:user/&#36;{aws:username}</code> and <code>mfa/&#36;{aws:username}</code>; deny everything else when MFA is not present.</p>', '<p>Hint 2: the deny uses <code>NotAction</code> listing the self-service actions, and <code>BoolIfExists aws:MultiFactorAuthPresent false</code>.</p>', '<p>Hint 3: test with a user that has no MFA (only self-service works) and after MFA sign-in (group policies work). Plan to delete this once the users move to Identity Center.</p>'],
    a: `<p>The policy has two statements. <b>AllowSelfServiceMfa</b>: lets each user list MFA devices and create, enable and resync a virtual MFA device and change their own password, scoped with the policy variable <code>aws:username</code> so nobody can touch another user. <b>DenyAllExceptSelfServiceWithoutMfa</b>: an explicit Deny with <code>NotAction</code> (everything except those self-service calls) and <code>BoolIfExists aws:MultiFactorAuthPresent = false</code>. Without MFA (or with plain access keys, where the key is missing) the deny matches and wins over any group allow; after an MFA sign-in it no longer matches, so normal allows apply. For CLI use, legacy users call <code>sts get-session-token --serial-number ... --token-code ...</code> to get MFA-backed temporary credentials. Note the <code>aws:username</code> variable is written with a dollar sign and braces inside the JSON; that is IAM syntax, not shell.</p>`,
    code: `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowSelfServiceMfa",
      "Effect": "Allow",
      "Action": [
        "iam:ListMFADevices", "iam:CreateVirtualMFADevice", "iam:EnableMFADevice",
        "iam:ResyncMFADevice", "iam:ChangePassword", "iam:GetUser"
      ],
      "Resource": [
        "arn:aws:iam::123456789012:user/\${aws:username}",
        "arn:aws:iam::123456789012:mfa/\${aws:username}"
      ]
    },
    {
      "Sid": "DenyAllExceptSelfServiceWithoutMfa",
      "Effect": "Deny",
      "NotAction": [
        "iam:ListMFADevices", "iam:CreateVirtualMFADevice", "iam:EnableMFADevice",
        "iam:ResyncMFADevice", "iam:ChangePassword", "iam:GetUser", "sts:GetSessionToken"
      ],
      "Resource": "*",
      "Condition": { "BoolIfExists": { "aws:MultiFactorAuthPresent": "false" } }
    }
  ]
}`,
    cx: `<p>Two statements; one explicit deny does the enforcing. Test with two sessions (with and without MFA).</p>`,
    f: ['Why is this unnecessary for Identity Center users?', 'How would you require MFA only for destructive actions such as ec2:TerminateInstances?']
  }));

  // ───────────────────────── Practice: Hard ─────────────────────────
  practice.push(P({
    t: 'Build a tiny IAM policy evaluator', l: 'Hard', tags: ['iam', 'policy evaluation', 'explicit deny', 'python'], co: ['AWS', 'Google', 'Wiz'], lang: 'python', c: PYC + '<p>Each statement is <code>"EFFECT|ACTIONS|RESOURCES|CONDITION"</code>: EFFECT is <code>Allow</code> or <code>Deny</code>; ACTIONS and RESOURCES are comma-separated patterns with <code>*</code> and <code>?</code>; CONDITION is empty, <code>mfa=true</code> (applies only when MFA is present) or <code>mfa=false</code> (applies only when it is not). Actions match case-insensitively, resources case-sensitively. Up to 50 statements.</p>',
    s: `<p>Write <code>evaluate(statements, action, resource, mfa)</code> that applies the IAM rule for a single identity policy and returns <code>"Allow"</code>, <code>"ExplicitDeny"</code> or <code>"ImplicitDeny"</code>. Statement order must not matter. This is the decision you make in your head on every AccessDenied ticket.</p>`,
    ex: `<p>Statements <code>["Allow|s3:Get*|arn:aws:s3:::b/*|", "Deny|s3:GetObject|arn:aws:s3:::b/secret/*|"]</code>: <code>s3:getobject</code> on <code>arn:aws:s3:::b/secret/x</code> → ${H.c('r', '"ExplicitDeny"')} (the Deny wins even though an Allow also matches). On <code>arn:aws:s3:::b/public/x</code> → ${H.c('g', '"Allow"')}. <code>s3:PutObject</code> → ${H.c('y', '"ImplicitDeny"')} (nothing matches).</p>`,
    bw: `<p>Returning the effect of the <b>first</b> matching statement, like a firewall. Then the answer depends on statement order, and an Allow listed before a Deny wrongly wins. IAM is not first-match: any matching Deny beats every Allow.</p>`,
    bc: `def evaluate(statements, action, resource, mfa):
    for s in statements:                        # first match wins: NOT how IAM works
        effect, actions, resources, cond = s.split("|")
        if action in actions.split(",") and resource in resources.split(","):
            return effect                       # also ignores wildcards and conditions`,
    q: ['Two statements match a request: one Allow and one Deny with a condition that is false for this request. Result?', ['Allow: the Deny does not apply because its condition is false', 'ExplicitDeny: any Deny statement wins', 'ImplicitDeny', 'It depends on statement order'], 0, 'A statement only applies when action, resource and condition all match. A Deny whose condition is false is ignored, so the Allow decides.'],
    h: ['<p>Hint 1: a statement <b>applies</b> when an action pattern matches, a resource pattern matches, and its condition holds. Write one helper for wildcard matching with a case flag.</p>', '<p>Hint 2: loop over all statements; if an applying statement is a Deny, you can return <code>"ExplicitDeny"</code> immediately; if it is an Allow, remember that you saw one.</p>', '<p>Hint 3: after the loop: an Allow seen → <code>"Allow"</code>, else <code>"ImplicitDeny"</code>. Test that reversing the statement list never changes the answer.</p>'],
    a: `<p>Model exactly the three-step rule. For every statement, decide whether it applies: any action pattern matches (case-insensitive glob), any resource pattern matches (case-sensitive glob), and the MFA condition, if present, agrees with the request. An applying Deny ends evaluation with <code>ExplicitDeny</code>; an applying Allow sets a flag. At the end the flag decides between <code>Allow</code> and the default <code>ImplicitDeny</code>. Because a Deny short-circuits and Allows only set a flag, the result is independent of order, as in AWS. Real IAM adds more condition operators, <code>NotAction</code>/<code>NotResource</code>, policy variables and the other layers (SCPs, boundaries, resource policies, session policies), but every one of them plugs into this same deny-first skeleton.</p>`,
    code: `import re

def _glob(pattern, value, case_insensitive):
    """IAM wildcard: * = any run, ? = one character; the whole value must match."""
    regex = "".join(".*" if c == "*" else "." if c == "?" else re.escape(c) for c in pattern)
    flags = re.DOTALL | (re.IGNORECASE if case_insensitive else 0)
    return re.fullmatch(regex, value, flags) is not None

def evaluate(statements, action, resource, mfa):
    """Return Allow, ExplicitDeny or ImplicitDeny for one identity policy."""
    allowed = False
    for s in statements:
        effect, actions, resources, cond = s.split("|")
        if not any(_glob(a, action, True) for a in actions.split(",")):
            continue                                   # action does not match
        if not any(_glob(r, resource, False) for r in resources.split(",")):
            continue                                   # resource does not match
        if cond == "mfa=true" and not mfa:
            continue                                   # condition false: statement ignored
        if cond == "mfa=false" and mfa:
            continue
        if effect == "Deny":
            return "ExplicitDeny"                      # explicit deny always wins
        allowed = True
    return "Allow" if allowed else "ImplicitDeny"`,
    cx: `<p>O(S × (A + R)) pattern checks for S statements with A action and R resource patterns each; each check is linear in the string lengths.</p>`,
    f: ['Extend it with a second list of SCP statements: what changes in the final decision?', 'How would you add NotAction?'],
    tests: { sig: 'string[] string string bool -> string', fn: 'evaluate', cases: [
      [[['Allow|s3:Get*|arn:aws:s3:::b/*|', 'Deny|s3:GetObject|arn:aws:s3:::b/secret/*|'], 's3:getobject', 'arn:aws:s3:::b/secret/x', true], 'ExplicitDeny'],
      [[['Allow|s3:Get*|arn:aws:s3:::b/*|', 'Deny|s3:GetObject|arn:aws:s3:::b/secret/*|'], 's3:GetObject', 'arn:aws:s3:::b/public/x', true], 'Allow'],
      [[['Allow|s3:Get*|arn:aws:s3:::b/*|', 'Deny|s3:GetObject|arn:aws:s3:::b/secret/*|'], 's3:PutObject', 'arn:aws:s3:::b/public/x', true], 'ImplicitDeny'],
      [[['Deny|s3:GetObject|arn:aws:s3:::b/secret/*|', 'Allow|s3:Get*|arn:aws:s3:::b/*|'], 's3:GetObject', 'arn:aws:s3:::b/secret/x', false], 'ExplicitDeny'],
      [[['Allow|s3:ListBucket|arn:aws:s3:::b|'], 's3:GetObject', 'arn:aws:s3:::b/2026/q1.csv', true], 'ImplicitDeny'],
      [[['Allow|*|*|', 'Deny|iam:*|*|mfa=false'], 'iam:CreateUser', 'arn:aws:iam::123456789012:user/x', false], 'ExplicitDeny'],
      [[['Allow|*|*|', 'Deny|iam:*|*|mfa=false'], 'iam:CreateUser', 'arn:aws:iam::123456789012:user/x', true], 'Allow'],
      [[['Allow|ec2:Describe*|*|mfa=true'], 'ec2:DescribeVpcs', '*', false], 'ImplicitDeny'],
      [[['Allow|s3:GetObject|arn:aws:s3:::Reports/*|'], 's3:GetObject', 'arn:aws:s3:::reports/a', true], 'ImplicitDeny'],
      [[['Allow|s3:GetObject,s3:PutObject|arn:aws:s3:::a/*,arn:aws:s3:::b/*|'], 's3:PutObject', 'arn:aws:s3:::b/k', true], 'Allow'],
      [[[], 's3:GetObject', 'arn:aws:s3:::b/k', true], 'ImplicitDeny'],
      [[['Allow|s3:Get?bject|arn:aws:s3:::b/*|'], 's3:GetObject', 'arn:aws:s3:::b/k', true], 'Allow']
    ] }
  }));

  practice.push(P({
    t: 'Can this instance reach that one? Security groups with references', l: 'Hard', tags: ['security groups', 'sg reference', 'reachability', 'python'], co: ['AWS', 'Microsoft', 'Cisco'], lang: 'python', c: PYC + '<p>Inbound rules are <code>"GROUP PROTO PORTS SOURCE"</code>: PROTO <code>tcp</code> or <code>all</code> (ports ignored for <code>all</code>), PORTS a number or <code>lo-hi</code>, SOURCE a CIDR or <code>sg:NAME</code>. Instances are <code>"IP GROUP1,GROUP2"</code>. Assume routing works and outbound rules allow everything (the default). Up to 60 rules.</p>',
    s: `<p>Write <code>can_connect(rules, src, dst, port)</code>: return <code>True</code> if a new TCP connection from instance <code>src</code> to <code>dst</code> on <code>port</code> is allowed by the <b>destination's</b> security groups. A rule applies if its GROUP is one of the destination's groups. A CIDR source matches if the source IP is inside it. An <code>sg:NAME</code> source matches only if the source carries that group <b>and</b> its IP is a private RFC 1918 address (references do not match traffic that went out through a NAT or public IP).</p>`,
    ex: `<p>Rules <code>["db-sg tcp 5432 sg:app-sg"]</code>: <code>src="10.0.1.5 web-sg"</code>, <code>dst="10.0.21.7 db-sg"</code>, 5432 → ${H.c('r', 'False')} (wrong group: the "web tier cannot reach the DB" ticket). <code>src="10.0.1.5 web-sg,app-sg"</code> → ${H.c('g', 'True')}. <code>src="203.0.113.10 app-sg"</code> → ${H.c('r', 'False')}: came from a public address.</p>`,
    bw: `<p>Treating <code>sg:app-sg</code> as "anything in the VPC" or ignoring which groups belong to the destination. You would say yes to connections that real AWS drops, and spend an hour looking at route tables during the incident.</p>`,
    q: ['The destination has two groups: db-sg (5432 from sg:app-sg) and monitoring-sg (9187 from 10.0.0.0/16). Source 10.0.1.5 with web-sg, port 9187?', ['True: monitoring-sg allows 9187 from the VPC CIDR', 'False: web-sg is not app-sg', 'False: only the first group counts', 'True: all ports inside the VPC are open'], 0, 'Rules from all groups on the destination ENI are combined (a union of allows). monitoring-sg matches by CIDR, so the connection is allowed even though db-sg would not allow it.'],
    h: ['<p>Hint 1: split the instances into an IP and a set of groups; collect only the rules whose GROUP is in the destination\'s set.</p>', '<p>Hint 2: a rule matches when the protocol and port fit and the source matches (CIDR containment, or group membership plus a private source IP).</p>', '<p>Hint 3: security groups are allow-only and order-free: return <code>True</code> on the first matching rule, <code>False</code> after checking all. Write your own RFC 1918 check; Python\'s <code>is_private</code> also includes documentation ranges.</p>'],
    a: `<p>Security groups combine all rules of all groups on the destination ENI into one allow list, with no order and no deny. So: parse the source and destination, keep rules belonging to any destination group, and for each check protocol, port range and source. A CIDR source matches by containment. An SG reference matches by <b>membership of the source ENI</b>, and only for traffic that stays on private addresses inside the VPC (or a peered VPC in the same region): once traffic goes out through a NAT or to a public IP, the packet's source is a public address that belongs to no group. Return <code>True</code> on the first match. This is the core of what Reachability Analyzer reports for the SG hop, and the fastest way to settle "who can talk to the database?" in a review.</p>`,
    code: `import ipaddress

RFC1918 = [ipaddress.ip_network(n) for n in ("10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16")]

def can_connect(rules, src, dst, port):
    """Is a new TCP connection src -> dst:port allowed by dst's security groups?"""
    src_ip, _, src_groups = src.partition(" ")
    _, _, dst_groups = dst.partition(" ")
    src_addr = ipaddress.ip_address(src_ip)
    src_set = set(filter(None, src_groups.split(",")))
    dst_set = set(filter(None, dst_groups.split(",")))
    private = any(src_addr in n for n in RFC1918)          # SG references need private IPs
    for rule in rules:
        group, proto, ports, source = rule.split()
        if group not in dst_set or proto not in ("tcp", "all"):
            continue
        if proto == "tcp":
            lo, _, hi = ports.partition("-")
            lo = int(lo)
            hi = int(hi) if hi else lo
            if not lo <= port <= hi:
                continue
        if source.startswith("sg:"):
            if private and source[3:] in src_set:
                return True
        elif src_addr in ipaddress.ip_network(source, strict=False):
            return True
    return False`,
    cx: `<p>O(R) per question for R rules (plus set lookups).</p>`,
    f: ['Extend it to check the source\'s outbound rules too. When would that change an answer?', 'How would you answer "list every instance that can reach the DB on 5432" for 500 instances?'],
    tests: { sig: 'string[] string string int -> bool', fn: 'canConnect', cases: [
      [[['db-sg tcp 5432 sg:app-sg'], '10.0.1.5 web-sg', '10.0.21.7 db-sg', 5432], false],
      [[['db-sg tcp 5432 sg:app-sg'], '10.0.1.5 web-sg,app-sg', '10.0.21.7 db-sg', 5432], true],
      [[['db-sg tcp 5432 sg:app-sg'], '203.0.113.10 app-sg', '10.0.21.7 db-sg', 5432], false],
      [[['db-sg tcp 5432 sg:app-sg', 'monitoring-sg tcp 9187 10.0.0.0/16'], '10.0.1.5 web-sg', '10.0.21.7 db-sg,monitoring-sg', 9187], true],
      [[['db-sg tcp 5432 sg:app-sg', 'monitoring-sg tcp 9187 10.0.0.0/16'], '10.0.1.5 web-sg', '10.0.21.7 db-sg', 9187], false],
      [[['web-sg tcp 443 0.0.0.0/0'], '203.0.113.10 ', '10.0.0.25 web-sg', 443], true],
      [[['web-sg tcp 443 0.0.0.0/0'], '203.0.113.10 ', '10.0.0.25 web-sg', 80], false],
      [[['app-sg tcp 8080-8081 sg:alb-sg'], '10.0.0.40 alb-sg', '10.0.10.9 app-sg', 8081], true],
      [[['app-sg tcp 8080-8081 sg:alb-sg'], '10.0.0.40 alb-sg', '10.0.10.9 app-sg', 8082], false],
      [[['default-sg all all sg:default-sg'], '172.31.5.5 default-sg', '172.31.9.9 default-sg', 22], true],
      [[[], '10.0.1.5 app-sg', '10.0.21.7 db-sg', 5432], false]
    ] }
  }));

  practice.push(P({
    t: 'Let developers create roles without letting them become admin', l: 'Hard', tags: ['iam', 'permission boundaries', 'privilege escalation'], co: ['AWS', 'Stripe', 'Atlassian'], c: LABIAM,
    s: `<p>Developers (Identity Center permission set <code>DeveloperAccess</code>) keep asking the platform team to create IAM roles for their Lambda functions. You want them to create and manage roles <b>themselves</b>, but: any role they create must be unable to exceed a boundary <code>DevBoundary</code> (everything except IAM, Organizations and account management), they must not be able to edit or remove the boundary, and roles must be named <code>dev-*</code>. Write both policies and the commands.</p>`,
    ex: `<p>A developer runs <code>create-role --role-name dev-orders-fn --permissions-boundary .../DevBoundary</code> → ${H.c('g', 'allowed')}. Without <code>--permissions-boundary</code> → ${H.c('r', 'AccessDenied')}. Attaching <code>AdministratorAccess</code> to dev-orders-fn → allowed, but the role still ${H.c('y', 'cannot call iam:*')}, because effective = policy ∩ boundary.</p>`,
    bw: `<p>Giving developers <code>iam:*</code> "because they are trusted". Anyone (or any compromised laptop) can then create a role with AdministratorAccess, pass it to a Lambda function or an EC2 instance, and act as full admin: the classic IAM privilege escalation path.</p>`,
    q: ['A role has AdministratorAccess attached and DevBoundary (which allows everything except iam:*) as its boundary. Can it call iam:CreateUser?', ['No: the effective permissions are the intersection, and the boundary does not allow IAM', 'Yes: AdministratorAccess allows it', 'Only with MFA', 'Yes, if the developer created the role'], 0, 'A permission boundary sets the maximum. An action must be allowed by both the identity policy and the boundary; IAM is outside the boundary, so it is implicitly denied.'],
    h: ['<p>Hint 1: the boundary is a normal managed policy used as a ceiling. The developer policy grants <code>iam:CreateRole</code> etc. only with the condition <code>iam:PermissionsBoundary</code> equal to the boundary ARN.</p>', '<p>Hint 2: deny the escape hatches explicitly: changing or deleting <code>DevBoundary</code> itself, <code>DeleteRolePermissionsBoundary</code>, and creating roles not named <code>dev-*</code>.</p>', '<p>Hint 3: <code>iam:PassRole</code> must also be limited to <code>role/dev-*</code>, otherwise developers can pass an existing admin role to their function.</p>'],
    a: `<p><b>DevBoundary</b> (the ceiling): allow <code>*</code> on <code>*</code> except <code>iam:*</code>, <code>organizations:*</code> and <code>account:*</code> (written as an Allow with <code>NotAction</code>, which is acceptable here because it is a boundary, not a grant). <b>Developer policy</b> (added to the DeveloperAccess permission set): (1) allow role management actions (<code>CreateRole</code>, <code>PutRolePolicy</code>, <code>AttachRolePolicy</code>, <code>DetachRolePolicy</code>, <code>DeleteRolePolicy</code>) on <code>role/dev-*</code> <b>only if</b> <code>iam:PermissionsBoundary</code> equals the DevBoundary ARN; (2) allow <code>iam:PassRole</code> on <code>role/dev-*</code> only to Lambda (<code>iam:PassedToService</code>); (3) allow read-only IAM (<code>Get*</code>, <code>List*</code>) and <code>DeleteRole</code> on <code>role/dev-*</code>; (4) explicitly deny changing or deleting the boundary policy and deny <code>DeleteRolePermissionsBoundary</code> (<code>PutRolePermissionsBoundary</code> is never allowed, so it is already an implicit deny). Now a role a developer creates may receive any policy, yet it never exceeds DevBoundary; developers cannot remove the boundary or pass other roles. Verify with the policy simulator (developer creating a role without boundary → denied) and Access Analyzer validation of both documents.</p>`,
    code: R`cat > dev-boundary.json <<'JSON'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "CeilingForDeveloperCreatedRoles",
    "Effect": "Allow",
    "NotAction": ["iam:*", "organizations:*", "account:*"],
    "Resource": "*"
  }]
}
JSON
aws iam create-policy --policy-name DevBoundary --policy-document file://dev-boundary.json

cat > dev-role-admin.json <<'JSON'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ManageDevRolesOnlyWithBoundary",
      "Effect": "Allow",
      "Action": ["iam:CreateRole", "iam:PutRolePolicy", "iam:AttachRolePolicy",
                 "iam:DetachRolePolicy", "iam:DeleteRolePolicy"],
      "Resource": "arn:aws:iam::123456789012:role/dev-*",
      "Condition": { "StringEquals": { "iam:PermissionsBoundary": "arn:aws:iam::123456789012:policy/DevBoundary" } }
    },
    {
      "Sid": "ReadAndDeleteDevRoles",
      "Effect": "Allow",
      "Action": ["iam:GetRole", "iam:ListRoles", "iam:ListAttachedRolePolicies", "iam:DeleteRole", "iam:TagRole"],
      "Resource": "arn:aws:iam::123456789012:role/dev-*"
    },
    {
      "Sid": "PassDevRolesToLambdaOnly",
      "Effect": "Allow",
      "Action": "iam:PassRole",
      "Resource": "arn:aws:iam::123456789012:role/dev-*",
      "Condition": { "StringEquals": { "iam:PassedToService": "lambda.amazonaws.com" } }
    },
    {
      "Sid": "NeverTouchTheBoundary",
      "Effect": "Deny",
      "Action": ["iam:CreatePolicyVersion", "iam:DeletePolicy", "iam:DeletePolicyVersion",
                 "iam:SetDefaultPolicyVersion", "iam:DeleteRolePermissionsBoundary"],
      "Resource": ["arn:aws:iam::123456789012:policy/DevBoundary", "arn:aws:iam::123456789012:role/*"]
    }
  ]
}
JSON
aws accessanalyzer validate-policy --policy-type IDENTITY_POLICY --policy-document file://dev-role-admin.json
# Developers then create roles like this (without --permissions-boundary it is denied):
aws iam create-role --role-name dev-orders-fn --assume-role-policy-document file://lambda-trust.json \
  --permissions-boundary arn:aws:iam::123456789012:policy/DevBoundary`,
    cx: `<p>Two policies, about 30 lines. The platform team stops being a ticket queue for roles, and the worst case of a developer mistake is bounded by DevBoundary.</p>`,
    f: ['Why must iam:PassRole be restricted separately?', 'How would you also force every developer-created role to carry the tag team=payments?']
  }));

  practice.push(P({
    t: 'Cross-account access for a security vendor, end to end', l: 'Hard', tags: ['iam', 'cross-account', 'external id', 'trust policy'], co: ['AWS', 'Datadog', 'CrowdStrike'], lang: 'json', c: LABIAM + '<p>Vendor account <code>111122223333</code> (an AWS documentation example id). Your account <code>123456789012</code>.</p>',
    s: `<p>A security-posture vendor needs <b>read-only</b> access to your account <code>123456789012</code> to scan configurations. Their scanner runs as role <code>arn:aws:iam::111122223333:role/vendor-scanner</code> and they gave you an ExternalId <code>ext-7Q2vK9pL</code>. Requirements: no IAM users or keys; read-only; they must not read your S3 <b>object contents</b> or secrets; access can be revoked instantly; every call is attributable. Write the trust policy for the role in your account and list the permission policies and steps.</p>`,
    ex: `<p>The scanner calls ${H.c('g', 'sts:AssumeRole with ExternalId ext-7Q2vK9pL')} → 1-hour credentials → ${H.c('g', 'ec2:DescribeInstances')} works, ${H.c('r', 's3:GetObject')} and ${H.c('r', 'secretsmanager:GetSecretValue')} are denied. CloudTrail shows <code>assumed-role/VendorAudit/scanner-run-42</code>.</p>`,
    bw: `<p>Creating an IAM user <code>vendor</code> with <code>ReadOnlyAccess</code> and emailing its access keys. The keys never expire, live in the vendor's systems forever, <code>ReadOnlyAccess</code> includes reading S3 objects and some secrets-adjacent data, and there is no ExternalId protection against the confused deputy.</p>`,
    q: ['What does the ExternalId protect against?', ['The confused deputy: another customer of the vendor tricking it into assuming your role', 'Brute-forcing your root password', 'Data exfiltration through S3', 'Man-in-the-middle attacks on STS'], 0, 'The vendor assumes roles in many customers\' accounts. A unique ExternalId per customer, required by your trust policy, stops a different customer from pointing the vendor at your role ARN.'],
    h: ['<p>Hint 1: trust policy: Principal = the vendor\'s specific role ARN (not their whole account), Action <code>sts:AssumeRole</code>, Condition <code>sts:ExternalId</code>.</p>', '<p>Hint 2: permissions: the AWS managed <code>SecurityAudit</code> policy (configuration metadata) rather than <code>ReadOnlyAccess</code>, plus an explicit Deny for data-plane reads such as <code>s3:GetObject</code>, <code>secretsmanager:GetSecretValue</code>, <code>ssm:GetParameter*</code>, <code>kms:Decrypt</code>.</p>', '<p>Hint 3: set a 1-hour max session, revoke by editing the trust policy (or "Revoke active sessions"), and monitor <code>AssumeRole</code> events for the role in CloudTrail.</p>'],
    a: `<p><b>Trust policy</b> (below): trust only <code>arn:aws:iam::111122223333:role/vendor-scanner</code>, require the ExternalId, and optionally restrict with <code>aws:SourceIp</code> to the vendor's published egress ranges. <b>Permissions:</b> attach the AWS managed <code>SecurityAudit</code> policy (it is designed for configuration review) and an inline explicit Deny for <code>s3:GetObject</code>, <code>secretsmanager:GetSecretValue</code>, <code>ssm:GetParameter</code>, <code>ssm:GetParameters</code>, <code>kms:Decrypt</code>, <code>dynamodb:GetItem</code>, <code>dynamodb:Scan</code>, <code>dynamodb:Query</code>; explicit deny wins even if a future managed-policy update adds something. <b>Steps:</b> create role <code>VendorAudit</code> with max session 3600 s; give the vendor the role ARN; they add an identity policy on their side allowing <code>sts:AssumeRole</code> on it (cross-account: both sides must allow); test with their scan. <b>Revoke:</b> remove the vendor principal from the trust policy (new sessions fail instantly) and click "Revoke active sessions" for existing ones. <b>Attribute:</b> require a meaningful <code>RoleSessionName</code> and alert on <code>AssumeRole</code> for this role outside the agreed schedule. Run Access Analyzer: it will list this role as an <b>external access</b> finding, which you archive as expected.</p>`,
    code: `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "VendorScannerWithExternalId",
      "Effect": "Allow",
      "Principal": { "AWS": "arn:aws:iam::111122223333:role/vendor-scanner" },
      "Action": "sts:AssumeRole",
      "Condition": {
        "StringEquals": { "sts:ExternalId": "ext-7Q2vK9pL" },
        "IpAddress": { "aws:SourceIp": ["198.51.100.0/24"] }
      }
    }
  ]
}`,
    cx: `<p>One role, one trust policy, one managed policy and one deny. Revocation is a single trust-policy edit.</p>`,
    f: ['Why name the vendor\'s role ARN instead of <code>arn:aws:iam::111122223333:root</code>?', 'How would Access Analyzer show this role, and what do you do with the finding?']
  }));

  practice.push(P({
    t: 'Production egress review: cut the NAT bill, keep high availability', l: 'Hard', tags: ['nat gateway', 'vpc endpoints', 'cost', 'high availability'], co: ['AWS', 'Netflix', 'Zalando'],
    s: `<p>A production VPC in <code>us-east-1</code> has app subnets in 3 AZs, but all three private route tables send <code>0.0.0.0/0</code> to <b>one</b> NAT gateway in AZ a. Last month: NAT processed <b>40 TB</b>, of which 30 TB was S3 (backups and data lake), 6 TB was pulls from ECR, and 4 TB was real internet traffic (partner APIs, OS updates). There were also cross-AZ data charges for traffic from AZ b and c to the NAT. Review the design for availability and cost, and give the commands for your changes. Use approximate list prices: NAT USD 0.045/hour and USD 0.045/GB processed; cross-AZ USD 0.01/GB each way; interface endpoint USD 0.01/hour per AZ plus USD 0.01/GB.</p>`,
    ex: `<p>Today: NAT processing 40,000 GB × 0.045 ≈ ${H.c('r', 'USD 1,800')}, plus ~27 TB cross-AZ ≈ ${H.c('r', 'USD 540')}. After: S3 via ${H.c('g', 'free gateway endpoint')}, ECR via ${H.c('g', 'interface endpoints')}, NAT only for 4 TB ≈ USD 180, and ${H.c('g', 'one NAT per AZ')}.</p>`,
    bw: `<p>Deleting the NAT gateway to save money, or replacing it with a single NAT instance. The first breaks every external call (and creates blackhole routes); the second trades a bill for a pet server that is a single point of failure you now have to patch.</p>`,
    q: ['Which change removes the most cost here?', ['An S3 gateway endpoint on all private route tables (30 TB stops going through the NAT)', 'Adding two more NAT gateways', 'Moving the NAT to a bigger instance size', 'Lowering the DNS TTL'], 0, 'Gateway endpoints for S3 and DynamoDB are free and add a more specific prefix-list route, so S3 traffic bypasses the NAT and its per-GB charge. More NATs improve availability but add hourly cost.'],
    h: ['<p>Hint 1: split the problem: availability (one NAT = one AZ dependency) and cost (per-GB processing and cross-AZ charges).</p>', '<p>Hint 2: S3 → gateway endpoint (free). ECR → interface endpoints for <code>ecr.api</code> and <code>ecr.dkr</code> (image layers come from S3, which the gateway endpoint already covers). What is left needs NAT.</p>', '<p>Hint 3: one NAT per AZ, each route table pointing at its own AZ\'s NAT, removes cross-AZ charges and the single point of failure. Estimate before and after with the given prices.</p>'],
    a: `<p><b>Availability:</b> with one NAT in AZ a, an AZ a outage cuts internet egress for all three AZs, so the app's "multi-AZ" claim is false for anything calling partners. Fix: one NAT gateway (with an EIP) in a public subnet of <b>each</b> AZ, and each private route table points to the NAT in its own AZ. That also removes the cross-AZ hop (about 27 TB × USD 0.02 ≈ USD 540/month). Extra cost: 2 more NATs ≈ USD 65/month plus EIPs. <b>Cost:</b> (1) add an <b>S3 gateway endpoint</b> to all private route tables: 30 TB no longer touches the NAT, saving about USD 1,350/month, at no charge. (2) Add <b>interface endpoints</b> for <code>ecr.api</code> and <code>ecr.dkr</code> (and <code>logs</code>, <code>sts</code> if heavily used) in 3 AZs: about USD 0.01 × 2 endpoints × 3 AZs × 720 h ≈ USD 43/month plus 6 TB × 0.01 = USD 60, versus 6 TB × 0.045 = USD 270 through the NAT. ECR layers are stored in S3, so most of the 6 TB is really covered by the gateway endpoint anyway. (3) The remaining 4 TB of real internet traffic stays on NAT: about USD 180/month processing. <b>Net:</b> roughly USD 2,400/month → about USD 500/month, with better availability. <b>Verify</b> with the NAT <code>BytesOutToDestination</code> metric and Cost Explorer by usage type (<code>NatGateway-Bytes</code>), and add endpoint policies restricting the S3 endpoint to your organisation's buckets (<code>aws:ResourceOrgID</code>).</p>`,
    code: R`export AWS_PROFILE=prod-network AWS_REGION=us-east-1
VPC=vpc-0prod; RTS="rtb-0appa rtb-0appb rtb-0appc"           # example ids
# 1. Free: S3 gateway endpoint on every private route table
aws ec2 create-vpc-endpoint --vpc-id "$VPC" --vpc-endpoint-type Gateway \
  --service-name com.amazonaws.us-east-1.s3 --route-table-ids $RTS
# 2. Interface endpoints for ECR in the three app subnets (private DNS on)
for SVC in ecr.api ecr.dkr; do
  aws ec2 create-vpc-endpoint --vpc-id "$VPC" --vpc-endpoint-type Interface \
    --service-name "com.amazonaws.us-east-1.$SVC" --private-dns-enabled \
    --subnet-ids subnet-0appa subnet-0appb subnet-0appc --security-group-ids sg-0endpoints
done
# 3. One NAT per AZ: create in public-b and public-c, then repoint each AZ's route table
for AZ in b c; do
  EIP=$(aws ec2 allocate-address --domain vpc --query AllocationId --output text)
  NAT=$(aws ec2 create-nat-gateway --subnet-id "subnet-0pub$AZ" --allocation-id "$EIP" \
    --query NatGateway.NatGatewayId --output text)
  aws ec2 wait nat-gateway-available --nat-gateway-ids "$NAT"
  aws ec2 replace-route --route-table-id "rtb-0app$AZ" --destination-cidr-block 0.0.0.0/0 --nat-gateway-id "$NAT"
done
# 4. Watch the effect: bytes through each NAT over the last day
aws cloudwatch get-metric-statistics --namespace AWS/NATGateway --metric-name BytesOutToDestination \
  --dimensions Name=NatGatewayId,Value=nat-0a --statistics Sum --period 86400 \
  --start-time "$(date -u -d '-1 day' +%Y-%m-%dT%H:%M:%SZ)" --end-time "$(date -u +%Y-%m-%dT%H:%M:%SZ)"`,
    cx: `<p>About USD 1,900/month saved with three API changes, and egress now survives an AZ outage. The calculation uses list prices; check your region and any discounts.</p>`,
    f: ['When is a single NAT gateway the right answer?', 'What would an S3 endpoint policy that only allows your organisation\'s buckets look like?']
  }));

  // ───────────────────────── Quiz ─────────────────────────
  quiz.push({ q: 'Which identity should a new engineer use to work in AWS every day?', options: ['An IAM Identity Center user with MFA, assigned a permission set', 'The root user with MFA', 'An IAM user with an access key on their laptop', 'A shared team IAM user'], answer: 0, explain: 'Identity Center gives each person their own login, MFA and temporary credentials through permission sets. Root is for a handful of account tasks; IAM user keys are long-lived secrets.' });
  quiz.push({ q: 'A request matches one Allow statement and one Deny statement. What is the result?', options: ['Denied: an explicit deny always wins', 'Allowed: the Allow came first', 'It depends on which policy was attached last', 'Allowed if the user is an admin'], answer: 0, explain: 'IAM evaluation is not first-match. Any applicable explicit Deny overrides every Allow in every policy type.' });
  quiz.push({ q: 'No policy mentions <code>s3:DeleteBucket</code> for a role. What happens when it calls it?', options: ['Implicit deny: everything not allowed is denied', 'Allowed, because nothing denies it', 'Allowed in the same account only', 'It is logged but allowed'], answer: 0, explain: 'The default is deny. Only a matching Allow (with all guard rails allowing) grants access.' });
  quiz.push({ q: 'A policy allows <code>s3:GetObject</code> on <code>arn:aws:s3:::reports-bucket</code>. Why does reading <code>reports-bucket/a.csv</code> fail?', options: ['Objects have the ARN reports-bucket/a.csv; the policy needs arn:aws:s3:::reports-bucket/*', 'GetObject needs MFA', 'S3 ignores identity policies', 'The bucket policy is missing'], answer: 0, explain: 'Bucket-level actions (ListBucket) use the bucket ARN; object-level actions (GetObject, PutObject) use bucket/key ARNs.' });
  quiz.push({ q: 'What does a role\'s <b>trust policy</b> control?', options: ['Who may assume the role', 'What the role can do', 'How long CloudTrail keeps its events', 'Which regions the role works in'], answer: 0, explain: 'The trust policy is a resource-based policy on the role naming allowed principals for sts:AssumeRole (or AssumeRoleWithWebIdentity / SAML). Permission policies control what the role can do.' });
  quiz.push({ q: 'An access key id starting with <code>AKIA</code> appears in a public GitHub repo. First action?', options: ['Deactivate the key immediately', 'Delete the commit', 'Rotate the user\'s password', 'Wait for AWS to email you'], answer: 0, explain: 'Containment first: an inactive key stops new calls in seconds. Then revoke sessions, investigate CloudTrail in every region, clean up and move to roles. Removing the commit does not un-leak it.' });
  quiz.push({ q: 'What does a <b>permission boundary</b> do?', options: ['Sets the maximum permissions a user or role can have; it grants nothing by itself', 'Grants extra permissions on top of identity policies', 'Limits which IP addresses can log in', 'Replaces the trust policy'], answer: 0, explain: 'Effective permissions = identity policy ∩ boundary (∩ SCPs). It is used to safely delegate role creation.' });
  quiz.push({ q: 'Cross-account: account A\'s role wants to read a bucket in account B. What is needed?', options: ['An Allow in A\'s identity policy and an Allow in B\'s bucket policy', 'Only B\'s bucket policy', 'Only A\'s identity policy', 'An IAM user in account B'], answer: 0, explain: 'Within one account either side can be enough; across accounts both the caller\'s identity policy and the resource policy must allow.' });
  quiz.push({ q: 'Which tool tells you whether a draft policy has unknown actions or security issues before you attach it?', options: ['<code>aws accessanalyzer validate-policy</code>', '<code>aws sts get-caller-identity</code>', '<code>aws iam get-credential-report</code>', '<code>aws ec2 describe-vpcs</code>'], answer: 0, explain: 'Access Analyzer policy validation reports errors, security warnings and suggestions. The policy simulator then checks specific requests.' });
  quiz.push({ q: 'An AWS subnet spans...', options: ['exactly one Availability Zone', 'all AZs of a region', 'all regions', 'one AZ in AWS, and also one zone in Azure'], answer: 0, explain: 'AWS subnets are zonal; Azure subnets are regional and span zones; GCP subnets are regional within a global VPC.' });
  quiz.push({ q: 'A subnet has no explicit route table association. Which route table does it use?', options: ['The VPC\'s main route table', 'None', 'The last route table created', 'The public route table'], answer: 0, explain: 'That is why the main route table should contain only the local route: forgotten subnets stay private.' });
  quiz.push({ q: 'Where must a NAT gateway be placed?', options: ['In a public subnet, whose route table sends 0.0.0.0/0 to the internet gateway', 'In the private subnet it serves', 'Outside the VPC', 'In any subnet with a NACL'], answer: 0, explain: 'The NAT\'s own outbound traffic leaves through the IGW, so its subnet must be public. Private subnets then route 0.0.0.0/0 to the NAT.' });
  quiz.push({ q: 'You finish a lab with a NAT gateway and an Elastic IP. What still costs money if you only delete the VPC\'s instances?', options: ['The NAT gateway (per hour) and the Elastic IP (per hour)', 'Nothing: idle resources are free', 'The route tables', 'The security groups'], answer: 0, explain: 'NAT gateways bill per hour plus per GB, and every public IPv4 address bills per hour. Delete the NAT, wait, then release the EIP.' });
  quiz.push({ q: 'A web server\'s NACL allows inbound 443 and outbound 443 only. What happens to HTTPS?', options: ['It times out: replies go to the client\'s ephemeral port, which outbound does not allow', 'It works, because NACLs are stateful', 'It works only for IPv6', 'The browser shows connection refused'], answer: 0, explain: 'NACLs are stateless. Allow outbound TCP 1024-65535 for replies (and inbound 1024-65535 for replies to the server\'s own outbound calls).' });
  quiz.push({ q: 'db-sg allows 5432 from <code>sg-app</code>. Which client can connect?', options: ['An instance whose ENI has sg-app attached, using the DB\'s private IP', 'Any instance in the same subnet as app servers', 'Any instance named "app"', 'Any instance in the VPC'], answer: 0, explain: 'SG references match the security groups on the source network interface, over private addresses. Subnet and names are irrelevant.' });
  quiz.push({ q: 'You need to block one abusive /24 from reaching public web servers. Which control can do it directly?', options: ['A NACL deny rule with a lower number than the allow', 'A security group deny rule', 'A route table blackhole route', 'An IAM policy'], answer: 0, explain: 'Security groups are allow-only. NACLs support numbered deny rules evaluated before later allows. For HTTP-level abuse, AWS WAF is the better tool.' });
  quiz.push({ q: 'Azure\'s closest equivalent to an AWS security group referencing another security group is...', options: ['An NSG rule whose source is an application security group (ASG)', 'A user-defined route', 'Azure Policy', 'A VNet peering'], answer: 0, explain: 'ASGs group NICs by role, and NSG rules can use them as source or destination. GCP uses network tags or service accounts in firewall rules.' });

  // ───────────────────────── Interview ─────────────────────────
  interview.push({ level: 'B', q: 'What is the difference between an IAM user, a group and a role?', a: `<p>An <b>IAM user</b> is a long-lived identity in one account with a password and/or access keys that never expire on their own. A <b>group</b> is just a collection of users; policies attached to it apply to every member, and it cannot log in or be named as a principal. A <b>role</b> has permissions but no credentials of its own: a trusted principal (a service like EC2 or Lambda, a person through SSO, another account, a CI system via OIDC) <b>assumes</b> it and receives temporary credentials from STS, valid for minutes to hours. Its <b>trust policy</b> says who may assume it. Today I use IAM Identity Center for people (which creates roles behind the scenes), roles for every workload, and IAM users only for rare legacy cases, because temporary credentials limit the damage of any leak.</p>`, followUps: ['How does IAM Identity Center relate to roles?', 'When is an IAM user still justified?'] });
  interview.push({ level: 'B', q: 'Explain the IAM policy evaluation logic.', a: `<p>Every request starts as an <b>implicit deny</b>. AWS gathers all applicable policies: identity-based policies on the principal, resource-based policies on the target, permission boundaries, Organizations SCPs and RCPs, and session policies. If <b>any</b> of them contains a matching explicit <b>Deny</b>, the request is denied: explicit deny always wins. Otherwise the request needs an <b>Allow</b>: from the identity policy or, in the same account, a resource-based policy; and every guard-rail layer (SCP, boundary, session policy) must also allow it, because those only restrict. Across accounts, both the caller's identity policy and the resource's policy must allow. A statement matches when its Action, Resource and Condition all match the request. The AccessDenied message tells you which case you hit: "no identity-based policy allows" means implicit deny; "with an explicit deny in ..." names the layer.</p>`, followUps: ['Can a resource policy override an SCP deny?', 'What does a permission boundary add to this?'] });
  interview.push({ level: 'B', q: 'What does least privilege mean in practice, and how do you get there from an existing over-broad policy?', a: `<p>Least privilege means an identity can perform only the actions, on only the resources, under only the conditions its job needs. In practice I rarely write it from nothing. For an existing role with something like <code>"Action": "*"</code> I look at <b>service last-accessed</b> data to see which services it used, run <b>IAM Access Analyzer policy generation</b>, which drafts a policy from up to 90 days of CloudTrail, and then tighten resource ARNs by hand (one bucket prefix, one queue, one key). I validate the new policy with <code>validate-policy</code>, simulate key requests, attach it alongside the old one, watch CloudTrail for AccessDenied for a period that covers rare jobs, and then remove the broad policy. Access Analyzer unused-access findings keep it tight over time, and a pipeline check (<code>check-no-new-access</code>) stops it widening again.</p>`, followUps: ['Why is NotAction with Allow dangerous?', 'How would you handle a monthly job that did not run during your 90-day window?'] });
  interview.push({ level: 'B', q: 'How do you debug an AccessDenied error?', a: `<p>First, <b>who am I?</b> <code>aws sts get-caller-identity</code>, because the wrong profile, account or environment variable is the most common cause. Then I read the error as four facts: principal, action, resource ARN and reason. "No identity-based policy allows" means implicit deny, so I look for a missing or mis-scoped Allow; classic causes are a bucket ARN where an object ARN (<code>bucket/*</code>) is needed, the wrong region or account in an ARN, or a missing <code>kms:Decrypt</code> for encrypted data. "Explicit deny in a service control policy / permissions boundary / resource-based policy" names the layer to change; more Allows will not help. I reproduce with <code>aws iam simulate-principal-policy</code> for that exact action and ARN, decode encoded messages with <code>sts decode-authorization-message</code>, and check CloudTrail for the event's <code>errorCode</code> and context. Only then do I change a policy, as narrowly as possible.</p>`, followUps: ['What extra layers apply to S3 and KMS?', 'How would you debug it when the simulator says "allowed" but the call fails?'] });
  interview.push({ level: 'B', q: 'Why are long-lived access keys discouraged, and what do you use instead?', a: `<p>Access keys never expire by themselves, so a key copied into a laptop, a CI variable, a container image or a Git commit stays usable until someone notices. Bots scan public repositories for <code>AKIA</code> strings within minutes. Instead I use temporary credentials everywhere: <b>IAM Identity Center</b> (<code>aws sso login</code>) for people, <b>roles</b> for EC2 (instance profiles with IMDSv2), Lambda and ECS, <b>OIDC federation</b> for CI/CD (GitHub Actions or GitLab exchange a signed token for a role session, with the trust policy limited to a repo and branch), <b>cross-account roles</b> for other accounts and vendors, and <b>IAM Roles Anywhere</b> for on-prem servers. If a key is truly unavoidable, it lives in a secrets manager, is rotated with the two-key method, and its age and last use are monitored.</p>`, followUps: ['How does the GitHub OIDC trust policy restrict which workflows can deploy?', 'What is IMDSv2 and why does it matter?'] });
  interview.push({ level: 'I', q: 'An access key was pushed to a public repository. Walk me through your response.', a: `<p><b>Contain:</b> deactivate the key with <code>update-access-key --status Inactive</code> (reversible, keeps the id for investigation) and revoke any temporary sessions minted from it by attaching a deny with <code>aws:TokenIssueTime</code> earlier than now; pause anything that depends on it. <b>Investigate:</b> <code>get-access-key-last-used</code>, then CloudTrail lookups by <code>AccessKeyId</code> in <b>every</b> region (attackers love unused regions), looking for reconnaissance, <code>RunInstances</code>, new users, keys, roles, policy changes, shared snapshots; also GuardDuty findings and billing. <b>Eradicate:</b> remove whatever the attacker created and undo policy changes. <b>Recover:</b> replace the key with a role or OIDC rather than a new key, then delete the old key. <b>Learn:</b> purge it from Git history anyway, enable secret scanning with push protection, alert on new access key creation, and write a blameless postmortem. AWS may also attach a quarantine policy and open a support case automatically.</p>`, followUps: ['Why deactivate instead of delete first?', 'How would you find persistence the attacker created?'] });
  interview.push({ level: 'I', q: 'What is a trust policy, and how would you set one up for GitHub Actions to deploy to AWS?', a: `<p>A trust policy is the resource-based policy on a role that defines who may assume it. For GitHub Actions I create an IAM OIDC identity provider for <code>token.actions.githubusercontent.com</code> once per account, then a deploy role whose trust policy has <code>"Principal": {"Federated": "arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com"}</code>, <code>"Action": "sts:AssumeRoleWithWebIdentity"</code>, and conditions: <code>aud</code> equals <code>sts.amazonaws.com</code>, and <code>sub</code> equals <code>repo:ORG/REPO:ref:refs/heads/main</code> (or an environment such as <code>environment:prod</code>). The workflow requests an OIDC token (<code>permissions: id-token: write</code>) and the AWS credentials action exchanges it for a one-hour session. No secret is stored anywhere. The role's permission policy then grants only the deploy actions. The common mistake is a wildcard <code>sub</code> like <code>repo:ORG/*</code>, which lets any repository, or any branch, deploy to production.</p>`, followUps: ['How would you let pull requests run plans but not applies?', 'What does the sub claim look like for a GitHub environment?'] });
  interview.push({ level: 'I', q: 'Identity-based vs resource-based policies: give examples of when you need each.', a: `<p><b>Identity-based</b> policies attach to users, groups and roles and describe what that identity may do: "this Lambda role may write to table Orders". <b>Resource-based</b> policies attach to the resource and include a <code>Principal</code>: S3 bucket policies, SQS and SNS policies, KMS key policies, Lambda function policies, Secrets Manager resource policies, and role trust policies. I need resource policies when the access crosses an account boundary (another account's role reading my bucket needs my bucket policy <b>and</b> their identity policy), when an AWS service must be allowed to call my resource (S3 invoking a Lambda, with <code>aws:SourceArn</code> to prevent confused deputy), and for organisation-wide guard rails on the resource, like denying non-TLS access or principals outside <code>aws:PrincipalOrgID</code>. KMS is special: the key policy must allow the account before IAM policies count at all.</p>`, followUps: ['Why do KMS key policies behave differently?', 'What would Access Analyzer flag about a bucket policy with "Principal": "*"?'] });
  interview.push({ level: 'B', q: 'Design a VPC for a two-tier web application that must survive an AZ failure.', a: `<p>I would pick a non-overlapping <code>/16</code>, for example <code>10.20.0.0/16</code>, and use two AZs (three for critical systems). Per AZ: a <b>public subnet</b> (/24) for the internet-facing load balancer and a NAT gateway, an <b>app subnet</b> (/23 or larger, sized for peak plus deploy surge) for instances or containers, and a <b>data subnet</b> (/24) for the database's subnet group. One internet gateway; one NAT gateway per AZ with an Elastic IP. Route tables: a shared public table with <code>0.0.0.0/0 → igw</code>; one app table per AZ with <code>0.0.0.0/0 → the NAT in that AZ</code>; a data table with only the local route; the main table left local-only. Security groups chain by reference: alb-sg (443 from the internet) → app-sg (app port from alb-sg) → db-sg (5432 from app-sg). Add an S3 gateway endpoint, flow logs, and SSM for admin access instead of SSH bastions. Then I would codify it in Terraform.</p>`, followUps: ['How do the AZ-specific NAT routes help in an outage?', 'What changes if the database team wants zero internet access?'] });
  interview.push({ level: 'B', q: 'What makes a subnet public or private? How does a private instance reach the internet?', a: `<p>Only the <b>route table</b>: a public subnet's table has <code>0.0.0.0/0</code> (or <code>::/0</code>) pointing to an internet gateway, and instances there with a public IP can be reached from the internet, subject to security groups and NACLs. A private subnet has no route to the IGW. For outbound access, its table sends <code>0.0.0.0/0</code> to a <b>NAT gateway</b> that sits in a public subnet with an Elastic IP; the NAT rewrites the source address, tracks the connection and returns replies, but new inbound connections have no mapping and are dropped. For AWS services, VPC endpoints are often better: a free gateway endpoint for S3 and DynamoDB, or interface endpoints for SSM, ECR and others, which keep traffic off the internet and off the NAT's per-GB bill. Subnet names and "auto-assign public IP" settings do not make a subnet public by themselves.</p>`, followUps: ['How would you troubleshoot a private instance that cannot reach the internet?', 'What is an egress-only internet gateway?'] });
  interview.push({ level: 'I', q: 'Security groups vs network ACLs: how do they differ, and when do you use each?', a: `<p><b>Security groups</b> attach to network interfaces, have allow rules only, are evaluated as a set (no order), and are <b>stateful</b>: return traffic of an allowed connection is allowed automatically. They can reference other security groups, which is how I build tiers that keep working as instances scale. <b>Network ACLs</b> attach to subnets, have numbered allow and deny rules evaluated lowest first with a final deny, and are <b>stateless</b>: every reply needs its own rule, typically TCP 1024-65535 in the opposite direction, because clients and NAT gateways use ephemeral ports. I do nearly all access control with security groups and keep NACLs as simple subnet-level guard rails, for example denying a known bad range or making sure the data subnets only accept the app subnets' CIDRs. Both drop silently, so both cause timeouts; VPC Flow Logs and Reachability Analyzer tell me which one blocked. Azure NSGs and GCP firewall rules are stateful with priorities; AWS is the one with the extra stateless layer.</p>`, followUps: ['What happens to established connections when you remove an SG rule?', 'Why does traffic inside one subnet bypass the NACL?'] });
  interview.push({ level: 'I', q: 'Users time out on a website after someone "hardened" the NACL. How do you find and fix it?', a: `<p>A timeout means a silent drop, so I suspect SGs, NACLs or routes, and the word "hardened" points at the NACL. I list its entries (<code>describe-network-acls</code>) and trace one connection as two packets: the request (client:ephemeral → server:443) against the inbound rules, and the reply (server:443 → client:ephemeral) against the outbound rules, both in rule-number order. Typically the outbound side allows only 443, or explicitly denies 1024-65535, so replies hit a deny. Flow logs confirm it: the inbound record is ACCEPT and the outbound reply is REJECT, which security groups never cause for tracked connections. The fix is an outbound allow for TCP 1024-65535 to the clients with a lower number than any deny, plus inbound 1024-65535 if the servers make outbound calls themselves. I change it with <code>replace-network-acl-entry</code>, test from outside and from the instance, and suggest moving any finer-grained "hardening" into security groups or AWS Network Firewall, which are stateful.</p>`, followUps: ['Which ephemeral range would you allow and why?', 'How would Reachability Analyzer describe this?'] });
  interview.push({ level: 'I', q: 'The web tier cannot reach the database. Routes look fine. What do you check?', a: `<p>I check the security groups first, because a correct local route plus a silent timeout usually means a filter. On the database side: <code>describe-security-group-rules</code> for db-sg; is the source a CIDR or a security group reference, and is the port right? On the client side: which security groups are actually on the web instances' ENIs (<code>describe-instances</code>)? A reference like "5432 from app-sg" matches only interfaces that carry app-sg, so web instances with only web-sg are dropped. I also check that the client uses the database's <b>private</b> endpoint (references do not match traffic that leaves through a NAT or public IP), any custom NACLs on both subnets including the return path, and the database's own listener and credentials (an instant "refused" or an auth error is a different problem from a timeout). Reachability Analyzer from the web ENI to the DB ENI on 5432 names the blocking component. The fix is usually one SG rule referencing the right group.</p>`, followUps: ['Why prefer an SG reference over the app subnet CIDR?', 'How would you prove which tiers can reach the DB in an audit?'] });
  interview.push({ level: 'A', q: 'How would you let developers create IAM roles for their own services without risking privilege escalation?', a: `<p>With <b>permission boundaries</b> plus tight conditions. I create a managed policy <code>DevBoundary</code> that defines the maximum any developer-created role may ever do (for example everything except IAM, Organizations and account management, perhaps limited by tags). The developers' permission set allows <code>iam:CreateRole</code>, <code>AttachRolePolicy</code>, <code>PutRolePolicy</code> and similar on <code>role/dev-*</code> <b>only when</b> <code>iam:PermissionsBoundary</code> equals the DevBoundary ARN. It allows <code>iam:PassRole</code> only for <code>role/dev-*</code> and only to the intended services via <code>iam:PassedToService</code>, and it explicitly denies editing or deleting DevBoundary and removing boundaries from roles. Then even if a developer attaches AdministratorAccess to their role, its effective permissions are the intersection with the boundary. I validate both policies with Access Analyzer, test escalation paths in the simulator, and add an SCP so nobody outside the platform team can create unbounded roles.</p>`, followUps: ['Why is iam:PassRole the escalation path people forget?', 'How do SCPs and boundaries differ?'] });
  interview.push({ level: 'A', q: 'Your NAT gateway bill is the largest line in the network costs. How do you reduce it without hurting availability?', a: `<p>I start with data: Cost Explorer by usage type (<code>NatGateway-Hours</code> vs <code>NatGateway-Bytes</code>), NAT CloudWatch metrics, and flow logs to see <b>where</b> the bytes go. Usually most of it is AWS services: S3 traffic is moved to a free <b>gateway endpoint</b> on every private route table; ECR, CloudWatch Logs, STS, SSM and Secrets Manager traffic can go through <b>interface endpoints</b>, worth it when their hourly cost is below the NAT's per-GB savings. Next I remove <b>cross-AZ</b> hops: one NAT per AZ, with each private route table pointing at its own AZ's NAT, which also fixes the single point of failure. I look for chatty internal traffic hairpinning out to public endpoints of services in the same region, and for workloads that could use IPv6 with an egress-only gateway. Dev environments can share one NAT or turn it off on a schedule. I estimate savings beforehand and confirm them in the next bill.</p>`, followUps: ['When is an interface endpoint more expensive than the NAT?', 'Why would cross-AZ charges appear with a single NAT?'] });
  interview.push({ level: 'E', q: 'How would you design identity and network guard rails for an organisation with 50 AWS accounts?', a: `<p>Identity: <b>AWS Organizations</b> with an OU structure (security, infrastructure, workloads by environment, sandbox). <b>IAM Identity Center</b> federated to the corporate IdP, with group-based permission sets and short sessions for admin sets; no IAM users, and root credentials centrally managed or removed in member accounts. Workloads use roles; CI uses OIDC. <b>SCPs</b> deny leaving the organisation, disabling CloudTrail/GuardDuty/Config, using unapproved regions, and creating IAM users or access keys; <b>RCPs</b> and resource policies restrict data access to principals in the organisation (<code>aws:PrincipalOrgID</code>, <code>aws:ResourceOrgID</code>). Organisation-wide Access Analyzer for external and unused access, and an org CloudTrail into a locked log-archive account. Network: a central <b>IPAM</b> plan so no CIDRs overlap, a Transit Gateway hub, centralised egress with NAT and AWS Network Firewall in a network account, shared VPCs via RAM where teams do not need to own networking, VPC endpoints shared centrally, flow logs everywhere, and everything defined in IaC with policy checks in the pipelines. Exceptions are time-boxed and tracked.</p>`, followUps: ['What are the trade-offs of centralised egress?', 'How do you handle a team that needs an exception to an SCP?'] });

  // ───────────────────────── Module registration ─────────────────────────
  registerModule({
    id: 'devops06',
    title: 'Cloud Fundamentals II: Identity & Networks',
    lang: 'bash',
    langExplain: `<p>Commands are <b>bash with AWS CLI v2</b>, because that is how you inspect and build cloud resources by hand before moving to Terraform. IAM policies are shown as <b>JSON</b>, exactly as AWS stores them. A few decision problems (policy evaluation, NACL rule order, route lookup, security-group reachability) also come with <b>Python</b> standard-library solutions you can run and test, because writing the rule as code is the fastest way to be sure you understand it.</p>`,
    intro: `<p>Two things decide whether anything in the cloud works: <b>who is allowed to do what</b> (identity) and <b>which packets can get where</b> (networking). Most cloud support tickets end up in one of them: "AccessDenied", "the instance has no internet", "the app cannot reach the database", "we found an access key on GitHub". This module teaches both with AWS as the main provider, and an Azure and Google Cloud equivalents table in every topic.</p>
      <p>On the identity side you will set up people with <b>IAM Identity Center</b> and MFA, write and read <b>IAM policy JSON</b> (Effect, Action, Resource, Condition), apply the evaluation logic (explicit deny wins), use identity- and resource-based policies, trust policies, permission boundaries, the policy simulator and Access Analyzer, prefer short-lived role credentials to access keys, and run the leaked-key drill. On the network side you will design a <b>VPC</b> across two Availability Zones, build subnets, route tables, an internet gateway and a NAT gateway with the AWS CLI, chain security groups by reference, write NACL rules with ephemeral ports, and build and tear down a <b>two-tier network from scratch</b>.</p>
      <p><b>Safety rules for every lab:</b> a sandbox account reached through SSO (never production, never access keys in files), the example account id <code>123456789012</code>, and a cleanup step. IAM, VPCs, subnets, route tables, security groups and NACLs are free; <b>NAT gateways and public IPv4 addresses are billed per hour</b>, and each lab shows how to delete them.</p>`,
    goals: [
      'Choose the right identity for people and machines (Identity Center users, groups, roles, instance profiles, OIDC federation) and lock down the root user with MFA',
      'Write least-privilege IAM policies in JSON with Effect, Action, Resource and Condition, and predict any decision with the evaluation logic (implicit deny, explicit deny wins, identity vs resource policies, boundaries, SCPs)',
      'Debug AccessDenied errors with <code>get-caller-identity</code>, the error text, the IAM policy simulator and Access Analyzer, and replace an over-broad <code>"Action": "*"</code> policy safely',
      'Write role trust policies (EC2, Lambda, GitHub OIDC, cross-account with ExternalId), and respond to a leaked access key: deactivate, revoke sessions, rotate, investigate CloudTrail',
      'Design a VPC across two AZs with public, app and data subnets, and explain AWS vs Azure VNet vs GCP VPC differences',
      'Build route tables, an internet gateway and a NAT gateway with an Elastic IP using AWS CLI v2, and fix a private instance that cannot download updates',
      'Use security groups that reference security groups and NACLs with ephemeral ports, and find which one drops traffic with flow logs and Reachability Analyzer',
      'Build a two-tier network from scratch, tear it down in dependency order, and know which resources cost money'
    ],
    prereqs: `<b>Required: Cloud &amp; DevOps 3</b> (Networking for Cloud Engineers) for CIDR and subnet maths, ports, NAT and firewall theory, which this module builds on without repeating. <b>Helpful: Cloud &amp; DevOps 5</b> (Cloud Fundamentals I: Compute &amp; Storage) for regions, AZs, EC2 and S3, and <b>Cloud &amp; DevOps 2</b> (Bash Scripting) for the lab scripts. You need an AWS sandbox account with IAM Identity Center access and the AWS CLI v2; the Python problems need only Python 3.`,
    hours: 12,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
