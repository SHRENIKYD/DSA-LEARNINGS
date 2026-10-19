(function () {
  var topics = [], practice = [], quiz = [], interview = [];
  var R = String.raw; // raw template: backslashes in shell code stay exactly as typed
  var LAB = '<b>Cost risk:</b> RDS instances, RDS Proxy, NAT gateways, ALBs/NLBs, Elastic IPs and running EC2 instances all bill <b>per hour</b> while they exist, even when idle, and snapshots bill per GB-month until deleted. Use a sandbox account with a budget alert, free-tier sizes (<code>db.t4g.micro</code>, <code>t3.micro</code>, 20 GB storage, Single-AZ) and finish each lab within an hour. <b>Cleanup:</b> delete in reverse order (scaling policies and ASG, then listeners, load balancer and target groups, then replicas, then the DB with <code>--delete-automated-backups</code>; disable deletion protection only at cleanup time), delete manual snapshots, queues and functions, then check Cost Explorer next day. Account id <code>123456789012</code>, ARNs, subnets and security groups are placeholders; no keys or passwords appear anywhere (the DB password lives in Secrets Manager, Lambda uses an execution role).';
  var SKIP = { skip: 'cloud procedure, verified by reading' };
  function SH(code, title) { var s = { lang: 'bash', code: code }; if (title) s.title = title; return s; }   // bash -n checked
  function PY(code, title) { return { lang: 'python', title: title || 'Python (tested)', code: code }; }
  function JS(code, title) { return { lang: 'json', title: title || 'JSON', code: code }; }                // parsed by the validator
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
  function one(k, v) { var h = {}; h[k] = v; return h; }
  function pad4(f, tip) { while (f.length < 4) f.push({ narr: tip, parts: f[f.length - 1].parts }); return f; }

  // ── Small models shared by visualizers (the Python problem answers are written separately and tested) ──
  // Target tracking: desired = ceil(current * metric / target), kept between min and max.
  function targetDesired(cur, metric, target, mn, mx) {
    var d = Math.ceil(cur * metric / target - 1e-9);
    return Math.max(mn, Math.min(mx, d));
  }
  // One message, receive by receive. attempts[i] = seconds the worker needs (-1 = crashes). Beyond the list = crash.
  function sqsRun(attempts, vis, maxRecv) {
    var log = [], n;
    for (n = 1; n <= maxRecv; n++) {
      var p = n - 1 < attempts.length ? attempts[n - 1] : -1;
      if (p >= 0 && p <= vis) { log.push({ n: n, p: p, res: 'deleted' }); return { out: 'deleted:' + n, log: log }; }
      log.push({ n: n, p: p, res: p < 0 ? 'crash' : 'too slow' });
    }
    return { out: 'dlq:' + maxRecv, log: log };
  }
  // Lambda: every accepted request holds one slot for dur seconds; arrivals above the free slots are throttled.
  function lambdaRun(arr, dur, limit) {
    var acc = [], rows = [], thr = 0;
    arr.forEach(function (a, t) {
      var inflight = 0, k;
      for (k = Math.max(0, t - dur + 1); k < t; k++) inflight += acc[k];
      var ok = Math.min(a, Math.max(0, limit - inflight));
      acc.push(ok); thr += a - ok;
      rows.push([t, a, inflight, ok, a - ok]);
    });
    return { rows: rows, throttled: thr };
  }
  function parseNums(s, what, cap) {
    var v = String(s || '').split(/[\s,]+/).filter(Boolean).map(Number);
    if (!v.length || v.some(isNaN)) throw new Error('Type ' + what + ', e.g. 40, 70, 90');
    if (v.length > (cap || 24)) throw new Error('Use at most ' + (cap || 24) + ' numbers');
    return v;
  }

  // ───────────────────────── Topic 1: managed databases ─────────────────────────
  topics.push({
    title: 'Managed Databases: RDS and PostgreSQL, Multi-AZ vs Read Replicas',
    analogy: `<p>Running PostgreSQL yourself on a server is like <b>owning a house</b>: you fix the roof, change the locks, and when the pipes burst at 3 a.m. it is your problem. A managed database like <b>Amazon RDS</b> is a <b>serviced apartment</b>: the building team patches the OS, takes the backups, and keeps a spare apartment ready next door. You still decorate (schema, queries, indexes) and you still pay rent every hour. A <b>Multi-AZ</b> setup is the spare apartment that is kept identical and locked, ready to swap in if the first one floods. A <b>read replica</b> is a different thing: a second apartment where guests may <em>look around</em> but the owner has not given it the keys yet.</p>`,
    explain: `<p>🟢 <b>What "managed" means.</b> With <b>RDS</b> (Relational Database Service) AWS runs the database engine (PostgreSQL, MySQL, MariaDB, Oracle, SQL Server; <b>Aurora</b> is AWS's own PostgreSQL/MySQL-compatible engine). AWS handles the hardware, OS and engine patches, automated backups, health monitoring and failover. You still choose: the <b>instance class</b> (CPU and RAM, e.g. <code>db.t4g.micro</code>), the <b>storage</b> (gp3 SSD, size, IOPS), the <b>network</b> (a DB subnet group and security group, almost always <em>private</em>), parameters, and users. You do <b>not</b> get a shell on the server or the <code>postgres</code> superuser; you get <code>rds_superuser</code>.</p>
      ${H.table(['You still own', 'AWS owns'], [
        ['schema, indexes, queries, migrations', 'host hardware, OS, engine minor-version patching (in your maintenance window)'],
        ['instance size, storage size, parameter tuning', 'automated backups and log shipping, storage replication, health checks'],
        ['network rules (security group), who can connect, encryption choices', 'failover mechanics and DNS flip (when Multi-AZ is on)'],
        ['monitoring thresholds, restore drills, cost', 'physical security and the data-centre']
      ])}
      <p>🟢 <b>Multi-AZ is about availability. A read replica is about reads.</b> This is the most confused pair in the whole topic.</p>
      ${H.table(['', 'Multi-AZ (instance or cluster)', 'Read replica'], [
        ['Goal', '<b>survive</b> an instance or AZ failure with little data loss', '<b>scale reads</b>, run reports, or build a copy in another Region'],
        ['Replication', '<b>synchronous</b> to a standby in another AZ (commit waits for the standby), so RPO is about 0', '<b>asynchronous</b>: the replica can lag by seconds or minutes'],
        ['Can you query the standby?', 'Multi-AZ <em>instance</em>: <b>no</b>, it is a hidden standby. Multi-AZ <em>DB cluster</em> (2 readable standbys): yes, through a reader endpoint', 'yes, it is a normal read-only database with its own endpoint'],
        ['On failure', '<b>automatic</b>: RDS flips the endpoint DNS name to the standby, usually in 60-120 s', '<b>nothing happens</b>; you must promote it yourself and point the app at it'],
        ['Same endpoint after?', 'yes (the DNS name is the same, the IP behind it changes)', 'no: a promoted replica becomes a separate standalone instance with its own endpoint'],
        ['Cost', 'about <b>2x</b> the instance and storage price', 'one more full instance per replica (plus cross-Region data transfer)']
      ])}
      <p>🔵 <b>How the failover feels to the app.</b> Your app connects to a <b>DNS name</b> like <code>orders.abc123.us-east-1.rds.amazonaws.com</code>, never to an IP. During failover existing connections drop, DNS now answers with the standby's IP, and new connections work. If your app caches DNS for too long (a JVM with an infinite DNS cache is the classic case) or has no reconnect logic, it keeps failing even though the database is healthy again. So: <b>retry with backoff, use a small connection-pool lifetime, and keep DNS TTL low</b>. You can rehearse this safely with <code>reboot-db-instance --force-failover</code>.</p>
      <p>🔵 <b>RDS Proxy (intro).</b> Each PostgreSQL connection is a whole OS process using several MB of RAM, and a <code>db.t4g.micro</code> only has 1 GB. Hundreds of Lambda functions each opening their own connection can exhaust the database ("too many connections"). <b>RDS Proxy</b> sits between app and database, keeps a small warm pool of real connections, and shares them among many short-lived clients. It also makes failover faster for clients (it holds their connections and reconnects to the new primary). Costs an hourly charge per vCPU, so it is for real workloads, not the free-tier lab.</p>
      <p>🔵 <b>Credentials, the safe way.</b> Create the instance with <code>--manage-master-user-password</code> and RDS creates and rotates the master password inside <b>AWS Secrets Manager</b> for you. The app reads the secret at start-up through its IAM role. The password is never in your shell history, your Git repo, a Terraform variable, or a Docker image (the rule from the Docker module applies here too).</p>
      ${H.table(['AWS', 'Azure', 'GCP'], [
        ['RDS for PostgreSQL', 'Azure Database for PostgreSQL - Flexible Server', 'Cloud SQL for PostgreSQL (or AlloyDB)'],
        ['Multi-AZ (sync standby)', 'Zone-redundant high availability (standby in another zone)', 'High availability (regional) instance, standby in another zone'],
        ['Read replica', 'Read replica (up to 5)', 'Read replica (and cross-region replica)'],
        ['RDS Proxy', 'built-in PgBouncer option on Flexible Server', 'Managed Connection Pooling (Cloud SQL Enterprise Plus), or PgBouncer'],
        ['Secrets Manager (managed master password)', 'Key Vault + Microsoft Entra authentication', 'Secret Manager + IAM database authentication']
      ])}`,
    clues: ['"the primary AZ goes down, how does the database stay up?" → <b>Multi-AZ</b> with automatic failover (not a read replica)', '"scale <b>reads</b>", "reporting queries slow down the app" → <b>read replica</b> (accept some lag)', '"zero data loss on failover" or "RPO near 0" → synchronous Multi-AZ', '"too many connections" from Lambda or many pods → <b>RDS Proxy</b> or a pooler', '"where should the DB password live?" → Secrets Manager / <code>--manage-master-user-password</code>, never in code', '"database must not be reachable from the internet" → private subnets, <code>--no-publicly-accessible</code>, security group from the app only'],
    code: [SH(R`# Single-AZ free-tier-sized instance for a lab. Multi-AZ doubles the price: add --multi-az only for a short test.
# The master password is created and rotated by RDS inside Secrets Manager, so we never type one.
aws rds create-db-instance \
  --db-instance-identifier demo-pg \
  --engine postgres \
  --engine-version 16 \
  --db-instance-class db.t4g.micro \
  --storage-type gp3 --allocated-storage 20 \
  --master-username appadmin \
  --manage-master-user-password \
  --db-subnet-group-name demo-private-subnets \
  --vpc-security-group-ids sg-0123456789abcdef0 \
  --no-publicly-accessible \
  --storage-encrypted \
  --backup-retention-period 7 \
  --preferred-backup-window 03:00-04:00 \
  --deletion-protection

aws rds wait db-instance-available --db-instance-identifier demo-pg

# Later: turn on Multi-AZ (RDS takes a snapshot, builds the standby, and bills ~2x until you turn it off)
aws rds modify-db-instance --db-instance-identifier demo-pg --multi-az --apply-immediately

# Rehearse a failover (brief connection drop, same endpoint name afterwards)
aws rds reboot-db-instance --db-instance-identifier demo-pg --force-failover

# Where is the generated password? (the app reads this through its IAM role; never paste it anywhere)
aws rds describe-db-instances --db-instance-identifier demo-pg \
  --query 'DBInstances[0].MasterUserSecret.SecretArn' --output text`, 'AWS CLI v2: create a PostgreSQL instance, Multi-AZ, failover drill'),
      PY(`# boto3: read the managed secret with the app's IAM role (no keys in code), then connect.
import json
import os

import boto3

def db_settings():
    """Secret ARN and host come from environment variables set by the platform, not from code."""
    sm = boto3.client("secretsmanager")
    secret = json.loads(sm.get_secret_value(SecretId=os.environ["DB_SECRET_ARN"])["SecretString"])
    return {
        "host": os.environ["DB_HOST"],          # the RDS endpoint DNS name, never an IP
        "port": 5432,
        "user": secret["username"],
        "password": secret["password"],
        "dbname": os.environ.get("DB_NAME", "app"),
        "connect_timeout": 5,                   # fail fast so retry logic can take over during a failover
        "sslmode": "require",
    }

def failover_status(identifier="demo-pg"):
    rds = boto3.client("rds")
    db = rds.describe_db_instances(DBInstanceIdentifier=identifier)["DBInstances"][0]
    return {"status": db["DBInstanceStatus"], "multi_az": db["MultiAZ"], "az": db["AvailabilityZone"],
            "secondary_az": db.get("SecondaryAvailabilityZone")}`, 'boto3: secret from Secrets Manager, failover status')],
    codeTitle: ['Create, Multi-AZ and failover drill (AWS CLI v2)', 'Python with boto3: no hardcoded credentials'],
    viz: [{
      title: 'AZ outage: Multi-AZ failover vs a read replica',
      input: 'multi-az',
      inputLabel: 'type multi-az or replica',
      gen: function (input) {
        var mode = String(input || '').trim().toLowerCase();
        if (mode !== 'multi-az' && mode !== 'replica') throw new Error('Type multi-az or replica');
        var multi = mode === 'multi-az';
        var nodes = [box('app', 'App (AZ-b)', 8, 8, 16), box('dns', 'DB endpoint (DNS)', 38, 8, 22), box('p', 'Primary (AZ-a)', 8, 40, 20), box('s', multi ? 'Standby (AZ-b)' : 'Replica (AZ-b)', 62, 40, 22)];
        var edges = [['app', 'dns'], ['dns', 'p'], ['p', 's', multi ? 'sync' : 'async']];
        function g(narr, hl, ehl, tags, ed) { return { narr: narr, parts: [{ type: 'graph', label: multi ? 'Multi-AZ instance' : 'Single-AZ primary + read replica', directed: true, height: 56, nodes: nodes, edges: ed || edges, hl: hl, ehl: ehl || {}, tags: tags || {} }] }; }
        var f = [];
        f.push(g('Normal day. The app talks to one DNS name that points at the primary in AZ-a. ' + (multi ? 'Every commit is copied <b>synchronously</b> to the standby in AZ-b before the app is told "committed".' : 'The replica copies changes <b>asynchronously</b>, so it can be a few seconds behind. The app may read from it, but never writes there.'), { p: 'ok', s: 'win' }, { 'dns-p': 'ok' }, { p: 'writes', s: multi ? 'hidden' : 'reads' }));
        f.push(g('AZ-a loses power. The primary is gone. Writes start failing with "connection refused" or timeouts.', { p: 'bad' }, { 'dns-p': 'bad' }, { p: 'DOWN' }));
        if (multi) {
          f.push(g('RDS notices (failed health checks, usually within 30-60 s) and decides to fail over. Because the standby has every committed transaction, <b>nothing committed is lost</b>.', { s: 'cur', p: 'bad' }, {}, { s: 'promote' }));
          f.push(g('RDS promotes the standby and flips the DNS name to its IP. Total time is typically 60-120 s. The endpoint <b>name</b> does not change.', { s: 'ok', p: 'bad' }, { 'dns-s': 'ok' }, { s: 'new primary' }, [['app', 'dns'], ['dns', 's']]));
          f.push(g('The app reconnects (its pool retries with backoff) and carries on. RDS later builds a fresh standby in another AZ. <b>Lesson:</b> the app needs reconnect logic, and a low DNS cache time, or it will keep failing against the old IP.', { s: 'ok', app: 'ok' }, { 'dns-s': 'ok' }, { s: 'primary' }, [['app', 'dns'], ['dns', 's']]));
        } else {
          f.push(g('Nothing fails over. A read replica is <b>not</b> a standby: RDS does not promote it by itself. Reads from the replica still work, but every write still goes to the dead primary. The site is read-only at best.', { s: 'cur', p: 'bad' }, {}, { s: 'still read-only' }));
          f.push(g('An engineer must run <code>promote-read-replica</code> (a few minutes). Because replication was async, the last seconds of writes the replica had not applied are <b>lost</b>. The replica becomes a separate instance with a <b>new endpoint</b>.', { s: 'sel', p: 'bad' }, {}, { s: 'promoted' }));
          f.push(g('The app config must now be changed to the new endpoint and redeployed (or the DNS alias you control repointed). Total outage: many minutes, plus possible data loss. <b>Lesson:</b> for availability use Multi-AZ; replicas are for reads and for cross-Region disaster recovery.', { s: 'ok', app: 'cur' }, { 'dns-s': 'cur' }, { s: 'new endpoint' }, [['app', 'dns'], ['dns', 's']]));
        }
        return f;
      }
    }],
    examples: [
      { title: 'Incident: "we had Multi-AZ, why was the site down for 4 minutes?"', html: `<p>AZ-a had a networking fault at 14:02. The team had Multi-AZ on and expected zero downtime. What really happened: RDS needed about 90 s to detect the failure and flip DNS. The app (a Java service with a connection pool of 50) held dead TCP connections; the pool only noticed after a 30 s socket timeout, and the JVM cached the old DNS answer for 60 s. Fixes: <b>enable pool validation</b> (test on borrow), <b>lower the JVM DNS TTL</b> (<code>networkaddress.cache.ttl=10</code>), set <code>connect_timeout=5</code>, and run a failover drill each quarter. Multi-AZ gives you automatic <em>database</em> recovery, not zero-second <em>application</em> recovery.</p>` },
      { title: 'Confusion: "we added a read replica for high availability"', html: `<p>A startup added a replica "so we survive an outage", then lost their primary instance. The replica was readable but the app had no way to write, the promotion was manual, and 20 seconds of orders were missing (async lag). The right design for HA is <b>Multi-AZ</b> on the primary. The replica is a bonus for report queries (send them to the replica endpoint) or a cross-Region copy for disaster recovery. You can have both: a Multi-AZ primary <em>and</em> one or more replicas.</p>` },
      { title: 'Lambda "too many connections" and RDS Proxy', html: `<p>A Lambda function ran at 400 concurrent executions; each opened a PostgreSQL connection. A <code>db.t4g.small</code> (about 2 GB RAM) allows roughly <code>max_connections ~ 170</code>, so new invocations got <code>FATAL: remaining connection slots are reserved</code>. Putting <b>RDS Proxy</b> between them let 400 short-lived clients share about 20 real connections. Cheaper first steps: reuse the connection outside the handler, or cap concurrency (topic 5). RDS Proxy also needs the function in the same VPC and its own IAM role to read the secret.</p>` }
    ],
    deepDive: `<p>🟣 <b>Multi-AZ flavours.</b> The classic <b>Multi-AZ instance</b> uses storage-level (EBS-level) synchronous block replication to a hidden standby: simple, 60-120 s failover, standby not readable. The newer <b>Multi-AZ DB cluster</b> (PostgreSQL and MySQL) has one writer and <em>two readable standbys</em> in three AZs, uses the engine's own replication with a semi-synchronous commit (a transaction is committed once one standby has it), and typically fails over in about 35 s or less with lower write latency. <b>Aurora</b> is different again: a shared distributed storage volume with six copies across three AZs; replicas read the same storage so lag is typically milliseconds and failover about 30 s.</p>
      <p>🟣 <b>What causes a failover?</b> AZ outage, primary instance failure, storage failure, OS patching during the maintenance window, instance class change, a manual reboot with failover, or a network partition between primary and standby. Synchronous replication means a slow standby slows <em>every commit</em>, which is why Multi-AZ writes are a little slower (an extra cross-AZ round trip, around a millisecond or two).</p>
      <p>🟣 <b>Replica lag is real.</b> PostgreSQL ships WAL (write-ahead log) records to the replica, which replays them. A long-running query on the replica can conflict with replay (the replica either waits, causing lag, or cancels your query: <code>hot_standby_feedback</code> and <code>max_standby_streaming_delay</code> trade these off). Watch the CloudWatch metric <code>ReplicaLag</code>. Never read-your-own-write from a replica without handling lag: after "place order" the user's next page may not find the order yet. Send that read to the primary, or pin the user's session to the primary for a few seconds.</p>
      <p>🟣 <b>Operational reality.</b> Maintenance (minor engine upgrades) happens in your chosen window and usually causes a Multi-AZ failover-length blip. Major upgrades are your decision and need testing on a restored copy. Storage can grow but <b>never shrink</b>. Parameter group changes may need a reboot. And <b>deletion protection</b> plus a final snapshot are your seat belt: keep both on in production, and remove deletion protection only in the cleanup step of a lab.</p>`,
    aiEra: `<p>🤖 AI assistants write correct-looking <code>create-db-instance</code> commands fast, but they often slip on exactly the points that cost money or cause outages: publicly accessible set to true "so it connects", a master password passed as a plain flag, <code>--multi-az</code> in a free-tier lab, or "add a read replica for HA". Review any generated database command against four questions: Is it private? Where does the password come from? What does it cost per hour? What happens when one AZ dies? AI is also useful for reading a parameter-group diff or turning a failover post-mortem into a runbook; treat its numbers (failover times, connection limits) as hints to confirm in the AWS documentation and in your own drill.</p>`,
    problems: [P({
      t: 'Plan the response: primary AZ outage with a Multi-AZ database and a read replica',
      l: 'Medium', tags: ['RDS', 'Multi-AZ', 'failover'], co: ['Amazon', 'Stripe'],
      s: `<p>Your PostgreSQL instance <code>orders-pg</code> has <b>Multi-AZ on</b> and one read replica <code>orders-pg-ro</code> in another AZ used by the reporting dashboard. At 14:02 AZ-a fails. Write a runbook as a bash script of <b>checks only</b> (read-only commands plus comments) that an on-call engineer follows: confirm whether a failover happened, find the new AZ, check replica lag afterwards, and say clearly what to do and what <b>not</b> to do with the replica.</p>`,
      ex: `<p>Expected evidence: <code>describe-events</code> shows "Multi-AZ instance failover completed"; <code>AvailabilityZone</code> changes from us-east-1a to us-east-1b; the endpoint name is unchanged; <code>ReplicaLag</code> is back below 5 s. <span class="c-r">Do not promote the replica</span>: the Multi-AZ standby already took over, and promoting would split the data into two databases.</p>`,
      bw: `<p>"Promote the read replica and update the app." That breaks the endpoint, loses the replica's un-applied writes, ends replication, and was never needed because Multi-AZ fails over automatically. It is the exact confusion the incident came from.</p>`,
      q: ['Multi-AZ is on and the primary AZ dies. What does the on-call do first?', ['Watch events and confirm RDS failed over; check the app reconnects', 'Promote the read replica immediately', 'Create a new instance from the latest snapshot', 'Change the app to use the standby IP address'], 0, 'RDS fails over by itself and keeps the same endpoint name. Your job is to verify, to check app health, and to look at replica lag afterwards. Promoting the replica or using IPs is wrong.'],
      h: ['Hint 1: with Multi-AZ on, the failover is automatic; your first job is to verify, not to act.', 'Hint 2: use <code>describe-events --source-type db-instance</code>, <code>describe-db-instances</code> (AvailabilityZone, MultiAZ, status) and the CloudWatch metric <code>ReplicaLag</code>.', 'Hint 3: the replica re-points to the new primary by itself; just confirm its lag, and say "do not promote" in the runbook.'],
      a: `<p>Verify in order: (1) events show the failover finished and the instance is <code>available</code>; (2) the AZ changed but the endpoint name did not; (3) the app can open a new connection; (4) the replica's <code>ReplicaLag</code> returns to normal (it briefly spikes while it reconnects to the new primary). The script prints facts only and ends with warnings. Everything is read-only, so it is safe to run during the incident.</p>`,
      code: SH(R`#!/usr/bin/env bash
# Runbook: primary AZ outage, Multi-AZ primary + one read replica. READ-ONLY checks.
set -euo pipefail
DB=orders-pg
RO=orders-pg-ro

# 1) Did RDS fail over? Look at the last 60 minutes of events.
aws rds describe-events --source-type db-instance --source-identifier "$DB" --duration 60 \
  --query 'Events[].[Date,Message]' --output text

# 2) Status, which AZ is primary now, and is Multi-AZ still on?
aws rds describe-db-instances --db-instance-identifier "$DB" \
  --query 'DBInstances[0].[DBInstanceStatus,MultiAZ,AvailabilityZone,SecondaryAvailabilityZone,Endpoint.Address]' --output table

# 3) Replica status and its lag over the last 15 minutes (maximum, 60 s buckets)
aws rds describe-db-instances --db-instance-identifier "$RO" \
  --query 'DBInstances[0].[DBInstanceStatus,StatusInfos]' --output json
aws cloudwatch get-metric-statistics --namespace AWS/RDS --metric-name ReplicaLag \
  --dimensions Name=DBInstanceIdentifier,Value="$RO" \
  --start-time "$(date -u -d '-15 min' +%Y-%m-%dT%H:%M:%SZ)" --end-time "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --period 60 --statistics Maximum --output table

# 4) Decision notes for the on-call:
#    - Endpoint name unchanged and status available  -> failover worked, only watch the app and replica lag.
#    - DO NOT run promote-read-replica: Multi-AZ already recovered, promotion would fork the data.
#    - If the app still errors: check pool validation and DNS caching (resolve the endpoint and compare the IP).
getent hosts "$(aws rds describe-db-instances --db-instance-identifier "$DB" --query 'DBInstances[0].Endpoint.Address' --output text)"`, 'Failover runbook (read-only)'),
      cx: `<p>Four API calls, constant time. The value is in the order and in the explicit "do not promote" decision.</p>`,
      f: ['When would promoting the replica be right? (Answer: the whole Region is lost, or Multi-AZ is off and the primary is not coming back.)', 'How would you make the app survive the 60-120 s window with no errors shown to users?']
    })]
  });

  // ───────────────────────── Topic 2: backups, PITR, replicas ─────────────────────────
  topics.push({
    title: 'Backups, Point-in-Time Recovery and Read Replicas (RPO and RTO)',
    analogy: `<p>Think of a <b>security camera with a daily photo album</b>. Once a day someone takes a full photo of the room (the <b>snapshot</b>). All day long the camera also records every small change as a tiny note (the <b>transaction log</b>, uploaded every 5 minutes). To see the room at 14:12 you take the 03:00 photo and replay the notes until 14:12. That is <b>point-in-time recovery (PITR)</b>. How much you may lose is the gap since the last note (<b>RPO</b>); how long it takes to rebuild the room is the <b>RTO</b>. A <b>read replica</b> is a second room kept almost up to date so visitors can look at it, which is not the same thing as a backup: if you delete a table, the replica deletes it too, seconds later.</p>`,
    explain: `<p>🟢 <b>Two numbers you must be able to say out loud.</b></p>
      ${H.table(['Term', 'Plain meaning', 'Example'], [
        ['<b>RPO</b> (recovery point objective)', 'how much <b>data</b> you can afford to lose, measured in time', 'RPO 5 min = at worst the last 5 minutes of writes are gone'],
        ['<b>RTO</b> (recovery time objective)', 'how long you can afford to be <b>down</b> while recovering', 'RTO 30 min = service must be back within half an hour']
      ])}
      <p>🟢 <b>Automated backups.</b> When <code>--backup-retention-period</code> is 1 to 35 days, RDS takes a daily snapshot in your <b>backup window</b> and uploads transaction logs about every <b>5 minutes</b>. Together they give you <b>PITR</b>: restore to any second inside the retention period, up to the "latest restorable time" (usually about 5 minutes ago). Retention 0 turns automated backups <em>off</em>: no PITR at all.</p>
      <p>🟢 <b>Restores always create a NEW instance.</b> RDS never rewinds the database in place. <code>restore-db-instance-to-point-in-time</code> builds a second instance with a new endpoint. That is a feature: you can look at the old data safely, copy back only what you need (for example one deleted table), then delete the restored copy. (Aurora has an in-place "backtrack" for MySQL-compatible clusters, which is the exception.)</p>
      <p>🔵 <b>Snapshots.</b> Automated snapshots are tied to the instance and expire with the retention period (and are deleted with the instance unless you ask RDS to retain automated backups). <b>Manual snapshots</b> stay until <em>you</em> delete them: take one before a risky migration and before deleting an instance. Snapshots can be copied to another Region and shared with another account, which is the basis of simple disaster recovery. Both bill per GB-month beyond the free backup storage equal to your database size.</p>
      <p>🔵 <b>Read replicas.</b> <code>create-db-instance-read-replica</code> builds an asynchronous copy with its own endpoint. Use it to move heavy reports and read traffic off the primary, or to place a copy in another Region. Rules of thumb: reads that tolerate a little staleness go to the replica; reads right after a write go to the primary; monitor <code>ReplicaLag</code>. A replica can be <b>promoted</b> to a standalone database (used for Region failover or migrations). A replica is a <b>scaling and DR tool, not a backup</b>: it faithfully copies your mistakes.</p>
      ${H.table(['Need', 'Use', 'RPO / RTO feel'], [
        ['Undo a bad deploy or deleted table 20 minutes ago', '<b>PITR</b> to a new instance, copy the data back', 'RPO about 5 min; RTO tens of minutes (grows with DB size)'],
        ['Survive an AZ failure', '<b>Multi-AZ</b>', 'RPO ~0; RTO 1-2 min'],
        ['Survive a Region failure', 'cross-Region replica or copied snapshots', 'RPO seconds (replica) or hours (snapshot); RTO minutes to hours'],
        ['Keep a copy for 7 years (audit)', 'AWS Backup vault or manual snapshots/exports', 'not for fast recovery']
      ])}
      ${H.table(['AWS', 'Azure', 'GCP'], [
        ['Automated backups + PITR (1-35 days)', 'Automated backups + PITR (7-35 days)', 'Automated backups + PITR (transaction log retention up to 7 days; backups up to 365)'],
        ['Manual snapshot, copy to Region', 'Long-term retention backups; geo-redundant backup storage', 'On-demand backups; cross-region replica'],
        ['restore-db-instance-to-point-in-time', 'Restore to a new server (point in time)', 'Clone / restore to a new instance'],
        ['AWS Backup (central policies)', 'Azure Backup', 'Backup and DR service']
      ])}`,
    clues: ['"restore the table that was dropped 20 minutes ago" → <b>PITR</b> to a new instance, then copy the data back', '"RPO of 5 minutes" → automated backups with transaction logs (not daily snapshots only)', '"RTO" asked for a big database → restore time scales with size; consider Multi-AZ or a standby for faster recovery', '"read-heavy reporting", "offload analytics" → read replica; "backup" is a wrong reason to add one', '"disaster recovery to another Region" → cross-Region read replica or copied snapshots', '"keep for compliance for years" → manual snapshots / AWS Backup, not the 35-day automated window'],
    code: [SH(R`# 1) Make sure automated backups (and so PITR) are on: retention 1-35 days, 0 = OFF
aws rds modify-db-instance --db-instance-identifier demo-pg \
  --backup-retention-period 7 --preferred-backup-window 03:00-04:00 --apply-immediately

# 2) Manual snapshot before a risky change (kept until YOU delete it; billed per GB-month)
aws rds create-db-snapshot --db-instance-identifier demo-pg --db-snapshot-identifier demo-pg-before-migration
aws rds wait db-snapshot-available --db-snapshot-identifier demo-pg-before-migration

# 3) How far back can we go? (latest restorable time is about 5 minutes ago)
aws rds describe-db-instances --db-instance-identifier demo-pg \
  --query 'DBInstances[0].[LatestRestorableTime,BackupRetentionPeriod]' --output text

# 4) PITR: restore to 14:12 UTC, as a NEW instance (never in place). Same network and security group.
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier demo-pg \
  --target-db-instance-identifier demo-pg-restore \
  --restore-time 2026-10-19T14:12:00Z \
  --db-instance-class db.t4g.micro \
  --db-subnet-group-name demo-private-subnets \
  --vpc-security-group-ids sg-0123456789abcdef0 \
  --no-publicly-accessible
aws rds wait db-instance-available --db-instance-identifier demo-pg-restore

# 5) Read replica for reporting (async copy, own endpoint, billed as one more instance)
aws rds create-db-instance-read-replica \
  --db-instance-identifier demo-pg-ro --source-db-instance-identifier demo-pg \
  --db-instance-class db.t4g.micro

# Promotion is for Region DR or migrations. It cuts replication for good.
# aws rds promote-read-replica --db-instance-identifier demo-pg-ro`, 'AWS CLI v2: backups, PITR, snapshot, read replica'),
      PY(`# boto3: restore to the latest restorable time and wait. Names come from the caller, nothing secret is in the code.
import boto3

def restore_latest(source: str, target: str, subnet_group: str, sg_ids: list[str]) -> str:
    rds = boto3.client("rds")
    rds.restore_db_instance_to_point_in_time(
        SourceDBInstanceIdentifier=source,
        TargetDBInstanceIdentifier=target,
        UseLatestRestorableTime=True,          # or RestoreTime=datetime(...) for an exact moment
        DBSubnetGroupName=subnet_group,
        VpcSecurityGroupIds=sg_ids,
        PubliclyAccessible=False,
    )
    rds.get_waiter("db_instance_available").wait(
        DBInstanceIdentifier=target, WaiterConfig={"Delay": 30, "MaxAttempts": 120})
    db = rds.describe_db_instances(DBInstanceIdentifier=target)["DBInstances"][0]
    return db["Endpoint"]["Address"]            # a NEW endpoint: the original is untouched`, 'boto3: PITR restore and wait')],
    codeTitle: ['Backups, snapshot, PITR and read replica (AWS CLI v2)', 'Python with boto3: restore and wait'],
    viz: [{
      title: 'PITR: replay the day to 14:12 and rescue one table',
      input: '14:12',
      inputLabel: 'restore target time today (hh:mm between 03:00 and 14:47). Now is 14:52, the table was dropped at 14:32',
      gen: function (input) {
        var m = String(input || '').trim().match(/^(\d{1,2}):(\d{2})$/);
        if (!m) throw new Error('Type a time like 14:12');
        var t = +m[1] * 60 + +m[2], base = 3 * 60, latest = 14 * 60 + 47, dropped = 14 * 60 + 32;
        if (t < base || t > latest) throw new Error('Pick a time between 03:00 (the daily snapshot) and 14:47 (latest restorable time)');
        function hm(x) { return ('0' + Math.floor(x / 60)).slice(-2) + ':' + ('0' + (x % 60)).slice(-2); }
        var logs = Math.floor((t - base) / 5), gap = latest - t, f = [];
        var good = t < dropped;
        f.push({ narr: 'Now it is 14:52. A teammate ran <code>DROP TABLE payments</code> at ' + hm(dropped) + ' by mistake. Do <b>not</b> panic and do not restore over production. We have the 03:00 snapshot plus transaction logs uploaded every 5 minutes, so we can rebuild the database as it was at ' + hm(t) + '.', parts: [{ type: 'vars', label: 'situation', vals: { 'daily snapshot': '03:00', 'log upload every': '5 min', 'latest restorable': hm(latest), 'bad DROP at': hm(dropped), 'restore target': hm(t) }, hl: { 'restore target': 'cur', 'bad DROP at': 'bad' } }] });
        f.push({ narr: 'Step 1: RDS creates a <b>new</b> instance <code>demo-pg-restore</code> from the 03:00 snapshot. Production keeps serving; nothing is overwritten.', parts: [{ type: 'array', label: 'new instance state', values: ['snapshot 03:00'], hl: { 0: 'ok' } }, { type: 'text', label: 'time', html: 'restoring base snapshot (the slowest part, grows with database size)' }] });
        f.push({ narr: 'Step 2: it replays <b>' + logs + '</b> transaction-log files (' + hm(base) + ' to ' + hm(base + logs * 5) + ') and then the rest up to exactly ' + hm(t) + '. Roughly ' + (t - base) + ' minutes of the day are re-applied.', parts: [{ type: 'bars', label: 'minutes of changes replayed (snapshot to target)', values: [t - base, latest - base], texts: [hm(t) + ' target', hm(latest) + ' latest'], hl: { 0: 'cur' } }] });
        f.push({ narr: good ? 'Step 3: the target is <b>before</b> the DROP, so the restored copy still has the <code>payments</code> table. Data lost if we used this copy as the new truth: everything written after ' + hm(t) + ' (' + (latest - t) + ' min of the window), which is why we only copy back the one table.' : 'Step 3: the target is <b>at or after</b> the DROP (' + hm(dropped) + '), so the restored copy has no <code>payments</code> table either. Restore again with an earlier time, for example ' + hm(dropped - 5) + '. Restores are cheap to retry.', parts: [{ type: 'vars', label: 'check on the restored copy', vals: { 'payments table exists': good ? 'yes' : 'NO', 'changes after target': gap + ' min not in this copy' }, hl: good ? { 'payments table exists': 'ok' } : { 'payments table exists': 'bad' } }] });
        f.push({ narr: 'Step 4: the DBA runs <code>pg_dump -t payments</code> against the restored copy and loads it into production (or renames and merges). Only that table travels. Rows added to other tables since ' + hm(t) + ' stay untouched.', parts: [{ type: 'text', label: 'copy back', html: 'restored copy &rarr; <code>pg_dump -t payments</code> &rarr; production <code>psql</code>' }] });
        f.push({ narr: 'Step 5: delete the restored instance (it bills hourly!) and write the post-mortem: restrict <code>DROP</code> to a migration role, and require a review for destructive statements. A read replica would <b>not</b> have saved us: it replayed the DROP within seconds.', parts: [{ type: 'vars', label: 'cleanup', vals: { 'restored instance': 'deleted', 'manual snapshot kept': 'yes, until reviewed', 'prevention': 'least-privilege roles' }, hl: { 'restored instance': 'done' } }] });
        return f;
      }
    }],
    examples: [
      { title: 'Incident: a table was dropped 20 minutes ago', html: `<p>At 14:32 someone dropped <code>payments</code> in production. At 14:52 it is noticed. Procedure: (1) stop writes to the table if you can; (2) run <code>restore-db-instance-to-point-in-time</code> with <code>--restore-time</code> 14:30 into a new instance; (3) <code>pg_dump -t payments</code> from the copy and load it into production; (4) delete the copy. Total time depends on size: a 50 GB database may take 15-30 minutes, a 2 TB one hours. Restoring in place would have thrown away 20 minutes of good orders.</p>` },
      { title: 'Snapshots outlive instances (and bills)', html: `<p>A team deleted a test database and kept the "final snapshot" 14 months later: 500 GB at about $0.095 per GB-month is roughly $47 a month for something nobody used. Automated backups vanish with the instance (unless retained), but <b>manual snapshots live until deleted</b>. Put an owner tag and an expiry date on every manual snapshot, and let AWS Backup lifecycle rules delete old ones.</p>` },
      { title: 'Reading your own write from a lagging replica', html: `<p>A shop sends all <code>SELECT</code>s to a replica. A customer places an order and is redirected to "My orders", which reads from the replica 400 ms behind: the order is missing, the customer orders again. Fix: after a write, read from the primary for a short time (or until the replica's replay position passes the write), and alert when <code>ReplicaLag</code> exceeds, say, 30 s. The same lag is what makes replica promotion lose recent writes.</p>` }
    ],
    deepDive: `<p>🟣 <b>How PITR actually works.</b> PostgreSQL logs every change to the <b>WAL</b> (write-ahead log). RDS archives WAL segments to S3 continuously (a segment is shipped when it fills or on a timer, giving the roughly 5-minute RPO). A restore copies the snapshot's EBS blocks (lazily, on first read, so a freshly restored database can feel slow until the blocks warm up; you can run a <code>SELECT count(*)</code> over big tables to touch them), then PostgreSQL's recovery mode replays WAL until it reaches the target timestamp. That is why RTO depends on the amount of WAL since the last snapshot as much as on database size.</p>
      <p>🟣 <b>Backups you never test do not exist.</b> A restore drill (restore latest, run a smoke query, record how long it took) turns the guess "RTO 30 min" into a measured number. Automate it monthly with a scheduled job in a sandbox account and delete the instance at the end. Include "restore into a different account and Region" once a year to test the cross-account copy path and KMS key sharing (encrypted snapshots need the key shared with the target account).</p>
      <p>🟣 <b>Replica details.</b> A replica of an encrypted source must be encrypted. Cross-Region replicas pay data-transfer charges and add latency to nothing (asynchronous), but their lag grows with distance and write rate. You can create replicas of replicas (cascading) in PostgreSQL on RDS, spreading the load on the primary. Replicas have their own backup settings, parameter groups and instance class: a smaller replica that is overwhelmed will lag and may be the reason reports become stale. <b>Storage-full on the primary</b> stalls WAL archiving too, so keep a CloudWatch alarm on <code>FreeStorageSpace</code> and on <code>OldestReplicationSlotLag</code> if you use logical replication.</p>
      <p>🟣 <b>Cost shape.</b> Automated backup storage is free up to 100% of your allocated storage per Region; extra (long retention, many snapshots) is billed per GB-month. Cross-Region copies bill storage in the destination and transfer once. The cheapest safe default for a small app is: retention 7 days, Multi-AZ if it is customer-facing, a manual snapshot before each schema migration, and a quarterly restore drill.</p>`,
    aiEra: `<p>🤖 Ask an AI to "write a backup strategy" and it will often list every service it knows. Do the opposite: give it your <b>RPO and RTO</b> and your database size and ask for the cheapest design that meets them, then check the arithmetic yourself (restore time grows with size; replication lag adds to RPO for cross-Region copies). AI can generate the drill script, parse <code>describe-events</code> output and draft the post-mortem, but only your own measured restore time proves the RTO. And never let an assistant run a restore or delete against production for you without a human reading the exact identifiers: <code>--source-db-instance-identifier</code> and <code>--target-db-instance-identifier</code> swapped is a very bad day.</p>`,
    problems: [P({
      t: 'RPO and RTO from the backup settings',
      l: 'Medium', tags: ['RDS', 'backup', 'PITR', 'RPO/RTO'], co: ['Amazon', 'Datadog'],
      lang: 'python',
      s: `<p>Write <code>backup_plan(retention_days, snap_hours, log_min, db_gb, gb_per_min, boot_min)</code> returning <code>[worst_rpo_minutes, rto_minutes]</code> for a PostgreSQL database.</p>
        <ul><li>If <code>retention_days &gt; 0</code> (automated backups on) PITR is available, so the worst RPO is <code>log_min</code>.</li>
        <li>If automated backups are off but you take manual snapshots every <code>snap_hours</code> hours, the worst RPO is <code>snap_hours * 60</code>.</li>
        <li>If neither exists you cannot recover: return <code>[-1, -1]</code>.</li>
        <li>RTO (planning estimate) = <code>boot_min</code> + ceil(<code>db_gb</code> / <code>gb_per_min</code>) minutes.</li></ul>`,
      ex: `<p>Input <code>(7, 0, 5, 100, 10, 10)</code> &rarr; <span class="c-g">[5, 20]</span>: PITR gives RPO 5 min; restoring 100 GB at 10 GB/min is 10 min plus 10 min to boot.<br>Input <code>(0, 24, 5, 100, 10, 10)</code> &rarr; <span class="c-y">[1440, 20]</span>: only a daily snapshot, so up to a day of data may be lost.</p>`,
      bw: `<p>Reading the console and guessing "it has backups, so RPO is small". Without the numbers you cannot tell a 5-minute RPO (PITR) from a 24-hour RPO (daily snapshot only) or no RPO at all (retention 0).</p>`,
      q: ['A database has retention 0 and a manual snapshot every 6 hours. What is the worst RPO?', ['360 minutes', '5 minutes', '0 minutes, snapshots are synchronous', 'It cannot be recovered'], 0, 'No automated backups means no transaction logs and no PITR. You can only restore a snapshot, so the worst case is losing everything since the last one: 6 hours = 360 minutes.'],
      h: ['Hint 1: the RPO has three cases: automated backups on, snapshots only, or nothing.', 'Hint 2: ceiling division with integers is <code>(a + b - 1) // b</code>.', 'Hint 3: when nothing can be restored return <code>[-1, -1]</code> immediately.'],
      a: `<p>Decide the RPO from the strongest mechanism available (PITR beats snapshots), return the sentinel when there is no backup at all, and compute the RTO as boot time plus ceiling-divided copy time. Real restores are lazy-loaded so the true RTO is not exactly linear, which is why the answer is called a planning estimate that you replace with a measured drill.</p>`,
      code: PY(`def backup_plan(retention_days, snap_hours, log_min, db_gb, gb_per_min, boot_min):
    """Return [worst_rpo_minutes, rto_minutes]; [-1, -1] means nothing can be recovered."""
    if retention_days > 0:
        rpo = log_min                      # PITR: logs shipped every log_min minutes
    elif snap_hours > 0:
        rpo = snap_hours * 60              # manual snapshots only
    else:
        return [-1, -1]                    # no backup of any kind
    copy_min = (db_gb + gb_per_min - 1) // gb_per_min   # ceiling division without floats
    return [rpo, boot_min + copy_min]`, 'Python (tested)'),
      cx: `<p>O(1) time and space.</p>`,
      f: ['Why is the real RTO often longer than this formula for a freshly restored big database? (Lazy block loading.)', 'How would you add cross-Region replica lag to the RPO?'],
      tests: { sig: 'int int int int int int -> int[]', fn: 'backup_plan', names: { python: 'backup_plan' }, cases: [
        [[7, 0, 5, 100, 10, 10], [5, 20]],
        [[0, 24, 5, 100, 10, 10], [1440, 20]],
        [[0, 0, 5, 100, 10, 10], [-1, -1]],
        [[14, 24, 5, 250, 20, 15], [5, 28]],
        [[1, 6, 5, 1, 10, 5], [5, 6]],
        [[0, 6, 5, 1000, 30, 20], [360, 54]],
        [[35, 12, 1, 64, 8, 10], [1, 18]],
        [[7, 0, 10, 0, 10, 10], [10, 10]]
      ] }
    })]
  });

  // ───────────────────────── Topic 3: load balancers ─────────────────────────
  topics.push({
    title: 'Load Balancers: ALB, NLB, Target Groups, Health Checks and Listener Rules',
    analogy: `<p>A load balancer is the <b>host at a busy restaurant door</b>. Guests (requests) arrive; the host looks at who is free and sends each party to a table (a target). The host also pokes his head into the kitchen every few seconds: "Is the grill still working?" If the grill says nothing three times in a row, the host stops sending steak orders there. An <b>ALB</b> is a host who reads the order slip (path, host name, headers) and sends pizza to one counter and sushi to another; an <b>NLB</b> is a host who only looks at the door number (TCP port) and moves a huge crowd very fast without reading anything.</p>`,
    explain: `<p>🟢 <b>The pieces.</b> You met load balancing as a design idea in <b>HLD 4</b>. Here is how AWS builds it:</p>
      ${H.table(['Piece', 'What it is'], [
        ['<b>Load balancer</b>', 'the entry point with a DNS name, spread over 2+ subnets in different AZs; <b>ALB</b> (Layer 7, HTTP/HTTPS/gRPC/WebSocket) or <b>NLB</b> (Layer 4, TCP/UDP/TLS)'],
        ['<b>Listener</b>', 'a port and protocol the LB listens on (for example HTTPS:443 with a certificate from ACM)'],
        ['<b>Rule</b> (ALB)', 'if the request matches a condition (path <code>/api/*</code>, host <code>admin.example.com</code>, header, query string) then do an action (forward, redirect, fixed response, weighted forward)'],
        ['<b>Target group</b>', 'a set of targets (EC2 instances, IPs, a Lambda function, containers) plus the <b>health check</b> settings for them'],
        ['<b>Health check</b>', 'the LB calls a path like <code>/healthz</code> on each target; only healthy targets get traffic']
      ])}
      <p>🟢 <b>ALB or NLB?</b></p>
      ${H.table(['', 'ALB', 'NLB'], [
        ['Layer', '7: understands HTTP', '4: TCP / UDP / TLS'],
        ['Routing', 'path, host, header, weighted, redirects, built-in auth (OIDC/Cognito)', 'by port only; target chosen by flow hash'],
        ['Speed / scale', 'very high, scales automatically; tens of ms warm-up on big spikes', 'millions of requests per second, ultra-low latency'],
        ['IP address', 'DNS name only (IPs change)', '<b>static IP per AZ</b> (or Elastic IP) - allow-listing by partners'],
        ['Client IP seen by app', 'in the <code>X-Forwarded-For</code> header', 'preserved as the real source IP (for instance targets)'],
        ['Use for', 'web apps, APIs, microservices, gRPC', 'databases-over-TCP, game servers, MQTT, very spiky or static-IP needs, PrivateLink services']
      ])}
      <p>🔵 <b>Health checks, the three numbers.</b> A target group checks every <code>interval</code> seconds (default 30). A target turns <b>unhealthy</b> after <code>unhealthy-threshold</code> failed checks in a row (default 2) and back to <b>healthy</b> after <code>healthy-threshold</code> good checks (default 5). Worst case time to notice a dead target is <code>interval x unhealthy-threshold</code>, and during that window the LB still sends it traffic. Tune it: interval 10-15 s, thresholds 2-3, timeout 5 s, a cheap <code>/healthz</code> that checks the app is alive (and maybe one local dependency, not the whole world).</p>
      <p>🔵 <b>Reading the error codes.</b> ALB errors tell you where to look:</p>
      ${H.table(['Code', 'Meaning', 'Usual causes'], [
        ['<b>502</b> Bad Gateway', 'the target answered badly or closed the connection', 'app crashed mid-request; app keep-alive timeout is <b>shorter</b> than the ALB idle timeout (60 s); invalid HTTP response; deploy killed the process while requests were in flight'],
        ['<b>503</b> Service Unavailable', 'no healthy targets (or none registered)', 'health check path returns 404/500; security group blocks the health check; all instances unhealthy'],
        ['<b>504</b> Gateway Timeout', 'the target did not answer within the idle timeout, or the connection could not be opened', 'slow query or report endpoint longer than 60 s; target SG does not allow the ALB; app threads exhausted']
      ])}
      <p>🔵 <b>Deregistration delay.</b> When a target is removed (scale-in, deploy) the LB stops sending <em>new</em> requests and waits up to <code>deregistration_delay.timeout_seconds</code> (default 300 s) for in-flight ones to finish. For short APIs set it to 30 s so deploys are not slow; for long downloads keep it higher. Your app should also handle SIGTERM and finish the request (see the Docker module).</p>
      ${H.table(['AWS', 'Azure', 'GCP'], [
        ['Application Load Balancer', 'Application Gateway (L7, regional); Front Door (global L7)', 'External Application Load Balancer (global, L7)'],
        ['Network Load Balancer', 'Azure Load Balancer (L4)', 'External/Internal Network (passthrough) Load Balancer'],
        ['Target group + health check', 'Backend pool + health probe', 'Backend service + health check'],
        ['Listener rules', 'Routing rules / URL path map', 'URL map (host and path rules)'],
        ['ACM certificate on the listener', 'Key Vault certificate / managed certs', 'Google-managed certificate']
      ])}`,
    clues: ['"route <code>/api</code> to one service and <code>/static</code> to another" → <b>ALB listener rules</b> with path conditions', '"static IP addresses for a partner allow-list" or "millions of connections, TCP" → <b>NLB</b>', '"502 after deploy" → keep-alive / in-flight requests / deregistration delay; "504" → slow target or idle timeout; "503" → no healthy targets', '"remove an unhealthy server automatically" → target-group <b>health checks</b> (and ASG ELB health type)', '"canary release, send 5% to the new version" → <b>weighted target groups</b> in a forward action', '"terminate TLS" → HTTPS listener with an ACM certificate on the ALB'],
    code: [SH(R`# ALB across two public subnets, one target group with tuned health checks, one HTTPS-ready listener.
# COST: an ALB bills per hour plus LCUs. Delete it when the lab ends.
aws elbv2 create-load-balancer --name demo-alb --type application --scheme internet-facing \
  --subnets subnet-0aaa1111bbb22222a subnet-0bbb3333ccc44444b \
  --security-groups sg-0123456789abcdef1

aws elbv2 create-target-group --name demo-tg --protocol HTTP --port 8080 --target-type instance \
  --vpc-id vpc-0123456789abcdef0 \
  --health-check-path /healthz --health-check-interval-seconds 15 --health-check-timeout-seconds 5 \
  --healthy-threshold-count 3 --unhealthy-threshold-count 2 --matcher HttpCode=200

# Faster, safer deploys: do not wait 300 s for in-flight requests on removal
aws elbv2 modify-target-group-attributes \
  --target-group-arn arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/demo-tg/0123456789abcdef \
  --attributes Key=deregistration_delay.timeout_seconds,Value=30

aws elbv2 create-listener \
  --load-balancer-arn arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/app/demo-alb/0123456789abcdef \
  --protocol HTTP --port 80 \
  --default-actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/demo-tg/0123456789abcdef

# Listener rule: /reports/* goes to a separate target group with a longer-lived pool
aws elbv2 create-rule \
  --listener-arn arn:aws:elasticloadbalancing:us-east-1:123456789012:listener/app/demo-alb/0123456789abcdef/0123456789abcdef \
  --priority 10 \
  --conditions Field=path-pattern,Values='/reports/*' \
  --actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/reports-tg/0123456789abcdef

# Why 504? The default idle timeout is 60 s; raise it only for a good reason
aws elbv2 modify-load-balancer-attributes \
  --load-balancer-arn arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/app/demo-alb/0123456789abcdef \
  --attributes Key=idle_timeout.timeout_seconds,Value=120`, 'AWS CLI v2: ALB, target group, listener, rule'),
      PY(`# boto3: which targets are unhealthy and why? (Reason codes tell you what to fix.)
import boto3

def unhealthy_report(target_group_arn: str) -> list[str]:
    elb = boto3.client("elbv2")
    out = []
    for d in elb.describe_target_health(TargetGroupArn=target_group_arn)["TargetHealthDescriptions"]:
        h = d["TargetHealth"]
        if h["State"] != "healthy":
            # Reason examples: Target.Timeout, Target.ResponseCodeMismatch, Target.FailedHealthChecks
            out.append(f"{d['Target']['Id']}:{d['Target'].get('Port')} {h['State']} {h.get('Reason', '-')} {h.get('Description', '')}")
    return out`, 'boto3: describe target health')],
    codeTitle: ['ALB, target group, listener and rule (AWS CLI v2)', 'Python with boto3: unhealthy target report'],
    viz: [{
      title: 'Health checks: when does a target get traffic?',
      input: 'H=3 U=2 : o o o f f f o o o o',
      inputLabel: 'H=healthy threshold, U=unhealthy threshold : probe results (o = pass, f = fail). A target starts out unhealthy.',
      gen: function (input) {
        var m = String(input || '').match(/^\s*H\s*=\s*(\d+)\s+U\s*=\s*(\d+)\s*:\s*([of\s]+)$/i);
        if (!m) throw new Error('Use the form: H=3 U=2 : o o o f f o');
        var H_ = +m[1], U_ = +m[2], probes = m[3].trim().split(/\s+/).map(function (x) { return x.toLowerCase(); });
        if (H_ < 2 || U_ < 2 || H_ > 10 || U_ > 10) throw new Error('Thresholds must be between 2 and 10');
        if (probes.length > 20) throw new Error('Use at most 20 probes');
        var state = 'unhealthy', pass = 0, fail = 0, f = [], seen = [], hl = {};
        function snap(narr) {
          f.push({ narr: narr, parts: [
            { type: 'array', label: 'probe results so far', values: seen.slice(), hl: JSON.parse(JSON.stringify(hl)) },
            { type: 'vars', label: 'target group view of this target', vals: { state: state, 'good in a row': pass + ' / ' + H_, 'bad in a row': fail + ' / ' + U_, 'gets traffic?': state === 'healthy' ? 'YES' : 'no' }, hl: { state: state === 'healthy' ? 'ok' : 'bad' } }
          ] });
        }
        snap('A new target is registered. It starts <b>unhealthy</b> (no traffic) until it passes <b>' + H_ + '</b> probes in a row. Each probe is a request to <code>/healthz</code>.');
        probes.forEach(function (p, i) {
          var ok = p === 'o';
          seen.push(ok ? 'pass' : 'FAIL'); hl[i] = ok ? 'ok' : 'bad';
          var before = state;
          if (ok) { pass++; fail = 0; if (state === 'unhealthy' && pass >= H_) state = 'healthy'; }
          else { fail++; pass = 0; if (state === 'healthy' && fail >= U_) state = 'unhealthy'; }
          var msg = ok ? 'Probe ' + (i + 1) + ' passes.' : 'Probe ' + (i + 1) + ' <b>fails</b> (timeout or non-200).';
          if (before !== state) msg += state === 'healthy' ? ' That is ' + H_ + ' good probes in a row: the target becomes <b>healthy</b> and starts receiving requests.' : ' That is ' + U_ + ' bad probes in a row: the target is marked <b>unhealthy</b> and removed from rotation. Until now it was still getting traffic, which is why an interval of 30 s with threshold 2 means up to 60 s of errors.';
          else if (state === 'healthy' && !ok) msg += ' Still healthy: one failure is not enough (' + fail + ' of ' + U_ + ').';
          else if (state === 'unhealthy' && ok) msg += ' Still unhealthy: it needs ' + (H_ - pass) + ' more good probe(s) in a row.';
          snap(msg);
        });
        return pad4(f, 'No more probes in the list.');
      }
    }],
    examples: [
      { title: 'Incident: 502s for 30 seconds on every deploy', html: `<p>During each rolling deploy users saw a burst of 502s. Cause 1: the old container was killed instantly, cutting live requests (the target closed the connection: 502). Cause 2: the app's keep-alive timeout was 5 s while the ALB reuses connections for up to 60 s, so the ALB sometimes sent a request down a connection the app had just closed. Fixes: handle SIGTERM and drain, set deregistration delay to 30 s, and make the <b>app keep-alive timeout longer than the ALB idle timeout</b> (for example 65 s). 502 almost always means "the target hung up or spoke nonsense".</p>` },
      { title: 'Incident: 504 on the monthly report', html: `<p>One endpoint, <code>/reports/export</code>, builds a big CSV and takes 90 s. Users get 504 at exactly 60 s: the ALB idle timeout. Raising the timeout for the whole ALB hides slow code everywhere. Better: make the export asynchronous (queue a job, return 202, download from S3 when ready - see topic 6), or at least route <code>/reports/*</code> to its own target group with a rule and give only that path the longer timeout through a dedicated load balancer or CloudFront behaviour.</p>` },
      { title: 'Canary: send 10% of traffic to version 2', html: `<p>A listener forward action can hold two target groups with weights: <code>blue-tg 90</code>, <code>green-tg 10</code>. ALB picks a target group per request at random with those probabilities (add a stickiness block if one user must stay on one side). Watch error rate and latency on the green group in CloudWatch; if good, shift to 50/50, then 0/100; to roll back, set green to 0. The weights are the only thing that changes, so a rollback takes seconds.</p>`, code: SH(R`aws elbv2 modify-listener --listener-arn arn:aws:elasticloadbalancing:us-east-1:123456789012:listener/app/demo-alb/0123456789abcdef/0123456789abcdef \
  --default-actions '[{"Type":"forward","ForwardConfig":{"TargetGroups":[{"TargetGroupArn":"arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/blue-tg/0123456789abcdef","Weight":90},{"TargetGroupArn":"arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/green-tg/0123456789abcdef","Weight":10}]}}]'`) }
    ],
    deepDive: `<p>🟣 <b>Cross-zone and capacity.</b> An ALB puts a node in each AZ you enable. With cross-zone load balancing (always on for ALB) every node can send to targets in any AZ, so an uneven number of targets per AZ does not skew load. NLB has cross-zone <em>off</em> by default (and charges for cross-AZ traffic when on). Always enable at least two AZs; a one-AZ load balancer turns an AZ outage into a total outage.</p>
      <p>🟣 <b>Security groups are the usual culprit.</b> The ALB has its own security group (allow 80/443 from the internet). The target's security group should allow the app port <b>only from the ALB's security group</b> (reference the SG id, not an IP range). A missing rule gives targets stuck in "unhealthy: Request timed out" and 504s. NLB with instance targets preserves the client IP, so the target SG must allow the client ranges; with IP targets it is simpler to allow the NLB's subnets.</p>
      <p>🟣 <b>Health check design.</b> A shallow check (<code>/healthz</code> returns 200 if the process runs) never fails because of a database blip, so the load balancer will not drain all instances during a dependency outage. A deep check that queries the database can turn a small database slowdown into "all targets unhealthy", an outage of your own making. Common pattern: liveness (shallow) for the target group, readiness (deeper) for deployment gating, and alarms for dependencies. If <em>every</em> target is unhealthy, ALB fails open and sends traffic to all of them anyway - one more reason not to rely on deep checks.</p>
      <p>🟣 <b>Other features worth knowing.</b> <b>Slow start</b> mode ramps traffic to a new target (helpful for JVMs that need to warm up); <b>least outstanding requests</b> routing beats round robin when request times vary; <b>sticky sessions</b> use a cookie but make scale-in unfair; <b>WAF</b> attaches to an ALB; <b>access logs</b> go to S3 and are the best tool for a 502/504 investigation (they contain <code>target_status_code</code>, <code>elb_status_code</code> and processing times, so you can tell if the ALB or the target produced the error). An ALB is regional; for global users add CloudFront or Global Accelerator in front.</p>`,
    aiEra: `<p>🤖 When a chatbot answers "why do I get 502?" it usually lists ten causes. Give it facts instead: the <b>ALB access-log line</b> (<code>elb_status_code</code> vs <code>target_status_code</code>, <code>target_processing_time</code>) and the target group's health reasons, and it can narrow the cause quickly: <code>target_status_code = -</code> and 502 means the target closed the connection; 504 with <code>target_processing_time = -1</code> means the ALB never got an answer. AI is also handy for turning a listener-rule plan into valid JSON for <code>--actions</code>. Always run the command against a test listener first: a wrong default action sends 100% of production traffic somewhere unexpected.</p>`,
    problems: [P({
      t: 'Diagnose ALB 502/504 spikes with access logs and target health',
      l: 'Medium', tags: ['ALB', 'health checks', '502', '504'], co: ['Amazon', 'Cloudflare'],
      s: `<p>After a deploy, an ALB shows 502s for about 20 seconds, and a separate <code>/reports</code> endpoint returns 504 at exactly 60 seconds. You have <code>demo-tg</code> and an access-log line format. Write a bash runbook (comments plus read-only commands) that (1) shows target health and the reason codes, (2) prints the current idle timeout and deregistration delay, (3) greps an access log file for 502 and 504 lines and splits them by <code>target_status_code</code> and processing time, and (4) states the fix for each symptom.</p>`,
      ex: `<p>A 502 line with <code>target_status_code</code> = <code>-</code> and <code>target_processing_time</code> = <code>-1</code> means the target closed the connection before replying (<span class="c-r">crash or keep-alive mismatch</span>). A 504 line with <code>request_processing_time</code> = 0.000 and a total of exactly 60.0 s means the <span class="c-y">idle timeout</span> fired.</p>`,
      bw: `<p>"Increase the ALB idle timeout to 300 s and the instance size." That hides slow code, does nothing for 502s caused by connection resets on deploy, and costs money. Without the log fields you are guessing.</p>`,
      q: ['The ALB returns 502 for 20 s on every rolling deploy. Which change is the best first fix?', ['Handle SIGTERM and drain, shorten the deregistration delay, and make the app keep-alive timeout longer than the ALB idle timeout', 'Raise the ALB idle timeout to 300 s', 'Switch from ALB to NLB', 'Add more targets to the group'], 0, '502 means the target hung up or sent a bad reply. Killing live requests and a keep-alive shorter than the ALB idle timeout are the classic reasons. Idle timeout is the cure for slow responses (504), not resets.'],
      h: ['Hint 1: 502 = the target closed or spoke nonsense; 504 = no answer in time; 503 = nothing healthy.', 'Hint 2: <code>aws elbv2 describe-target-health</code> shows the reason code; <code>describe-target-group-attributes</code> and <code>describe-load-balancer-attributes</code> show the two timeouts.', 'Hint 3: the access log is space separated; fields 9 and 10 are <code>elb_status_code</code> and <code>target_status_code</code>, field 7 is <code>target_processing_time</code> (check your log format).'],
      a: `<p>The script collects facts first, then decides: unhealthy reasons point at security groups or the health path; attributes show timeouts; the log split shows whether the ALB produced the error without the target (<code>target_status_code</code> = <code>-</code>) or the target itself returned 5xx. Fixes: graceful shutdown plus deregistration delay 30 s plus keep-alive 65 s for 502s on deploy; an asynchronous job or a dedicated path for the 60 s report endpoint.</p>`,
      code: SH(R`#!/usr/bin/env bash
# Runbook: ALB 502 / 504. All commands are read-only.
set -euo pipefail
TG=arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/demo-tg/0123456789abcdef
LB=arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/app/demo-alb/0123456789abcdef
LOG="$1"   # path of a downloaded ALB access log

echo "== 1) target health and reasons (Target.Timeout -> security group or slow path; ResponseCodeMismatch -> wrong health path)"
aws elbv2 describe-target-health --target-group-arn "$TG" \
  --query 'TargetHealthDescriptions[].[Target.Id,TargetHealth.State,TargetHealth.Reason,TargetHealth.Description]' --output table

echo "== 2) the two timeouts that explain most 502/504 problems"
aws elbv2 describe-load-balancer-attributes --load-balancer-arn "$LB" \
  --query "Attributes[?Key=='idle_timeout.timeout_seconds']" --output table
aws elbv2 describe-target-group-attributes --target-group-arn "$TG" \
  --query "Attributes[?Key=='deregistration_delay.timeout_seconds']" --output table

echo "== 3) 5xx lines in the access log: elb_status target_status target_processing_time"
# fields: 9=elb_status_code 10=target_status_code 7=target_processing_time
awk '$9 ~ /^50[24]$/ {print $9, $10, $7}' "$LOG" | sort | uniq -c | sort -rn | head -20

cat <<'NOTES'
== 4) decisions
502 with target_status_code "-"  : target closed the connection. Fix: graceful SIGTERM drain, deregistration delay 30 s,
                                   app keep-alive timeout (65 s) longer than ALB idle timeout (60 s).
504 at exactly 60 s              : idle timeout. Fix the slow path: make /reports async (queue + 202 + S3 link) or give it its own target group.
503                              : no healthy targets. Fix the health path or the target security group (allow ALB SG on the app port).
NOTES`, 'ALB 502/504 runbook'),
      cx: `<p>Four read-only calls plus one pass over the log file, O(L) for L log lines.</p>`,
      f: ['How does the ALB behave if every target in the group is unhealthy? (It fails open and tries all of them.)', 'How would you alert on this before users complain? (CloudWatch HTTPCode_ELB_5XX_Count and HTTPCode_Target_5XX_Count, plus UnHealthyHostCount.)']
    })]
  });

  // ───────────────────────── Topic 4: launch templates, ASG, scaling ─────────────────────────
  topics.push({
    title: 'Launch Templates, Auto Scaling Groups, Target Tracking and Health Checks',
    analogy: `<p>An Auto Scaling Group is a <b>shift manager for a restaurant</b>. The <b>launch template</b> is the staff handbook and uniform: every new waiter is hired exactly the same way (same AMI, size, role, security group). The manager is told "keep the average waiter busy about 50% of the time" (<b>target tracking</b>). Rush hour begins, waiters are at 90%, so the manager calls in more staff. But new hires need time to arrive and get ready (<b>boot time and warm-up</b>), so a manager who only reacts after the queue forms is always a little late. The <b>health check</b> is the manager noticing a waiter who has collapsed and sending a replacement.</p>`,
    explain: `<p>🟢 <b>The three objects.</b></p>
      ${H.table(['Object', 'What it holds'], [
        ['<b>Launch template</b>', 'how to build one instance: AMI, instance type, instance profile (IAM role), security groups, user data, IMDSv2 required, tags. It is <b>versioned</b>: v1, v2, <code>$Latest</code>, <code>$Default</code>'],
        ['<b>Auto Scaling Group (ASG)</b>', 'min, max and desired size; which subnets (spread over 2+ AZs); which launch template version; health check type; which target group to register new instances with'],
        ['<b>Scaling policy</b>', 'the rule that changes desired capacity: target tracking, step, simple, scheduled, or predictive']
      ])}
      <p>🟢 <b>Why ASG even without scaling?</b> Set min = max = desired = 2 and you get <b>self-healing</b>: if an instance dies, the ASG launches a replacement in a healthy AZ. Many teams run a fixed-size ASG for exactly this reason.</p>
      <p>🟢 <b>Target tracking</b> is the easy, recommended policy. You choose a metric and a target, for example <code>ASGAverageCPUUtilization = 50</code> or <code>ALBRequestCountPerTarget = 1000</code>. The service does the maths for you, roughly:</p>
      <p><b>desired = ceil( current instances x metric / target )</b>, then clamp between min and max.</p>
      <p>Worked example: 4 instances at 90% CPU with a 50% target &rarr; ceil(4 x 90 / 50) = ceil(7.2) = <b>8</b> instances. It scales out fast and in slowly (scale-in needs the metric to stay low for about 15 minutes, to avoid flapping).</p>
      <p>🔵 <b>Health checks and replacement.</b> The default health check type is <b>EC2</b>: the ASG only replaces an instance if the VM itself is dead (stopped, failed status checks). If the app inside is hung but the VM is fine, nothing happens. Choose <b>ELB</b> health checks (<code>--health-check-type ELB</code>) so a target the load balancer calls unhealthy is also terminated and replaced. Set a <b>health-check grace period</b> (e.g. 120-300 s) so a new instance has time to boot before it is judged, otherwise you get a launch-and-kill loop.</p>
      <p>🔵 <b>Why scaling is "too late".</b> Look at the clock for a sudden spike: the metric is published every minute (and averaged), the alarm needs a few data points, the instance takes 30-60 s to launch plus OS boot plus app start (1-3 min), then the LB needs <code>healthy-threshold x interval</code> to pass checks, and the new instance is still cold (caches, JIT). Realistically 3-6 minutes. During that time the old instances sit at 100% and users see errors. Tools to fix it:</p>
      ${H.table(['Problem', 'Fix'], [
        ['predictable daily peak (09:00, sale at noon)', '<b>scheduled scaling</b> or <b>predictive scaling</b>: scale before the peak'],
        ['slow boot (installing packages at start-up)', 'bake a ready AMI or use a container image; keep user data tiny'],
        ['not enough headroom', 'lower the target (40-50% not 70%); scale on request count per target, which reacts earlier than CPU'],
        ['cold instances get full load immediately', '<code>--default-instance-warmup</code> (so a still-warming instance is not counted as fully useful) and ALB <b>slow start</b>'],
        ['sudden big spike beyond reaction time', '<b>warm pool</b> of pre-initialized stopped instances, or queue the work (topic 6)']
      ])}
      ${H.table(['AWS', 'Azure', 'GCP'], [
        ['Launch template + Auto Scaling Group', 'Virtual Machine Scale Set (VMSS) with a model/image', 'Instance template + Managed Instance Group (MIG)'],
        ['Target tracking policy', 'Autoscale rule on a metric (CPU %, queue length); schedules', 'Autoscaler target utilization (CPU, LB utilization, custom metric)'],
        ['ELB health check + grace period', 'Application health extension / load balancer probe; automatic repairs', 'Autohealing health check + initial delay'],
        ['Instance refresh (rolling update)', 'Rolling upgrade policy', 'Rolling update of a MIG'],
        ['Warm pool', 'Scale-in policies / overprovisioning', 'Predictive autoscaling, standby pools']
      ])}`,
    clues: ['"scale automatically with load" → <b>ASG</b> with target tracking on CPU or <code>ALBRequestCountPerTarget</code>', '"instances are healthy by EC2 checks but the app is hung and never replaced" → health check type <b>ELB</b>', '"new instances are killed right after launch" → health-check <b>grace period</b> too short', '"scales too late", "errors at the start of a flash sale" → scheduled/predictive scaling, faster boot (baked AMI), lower target, warm pool', '"keep exactly N instances running" → ASG with min = max = N (self-healing)', '"roll out a new AMI without downtime" → new launch template version + <b>instance refresh</b> with minimum healthy percentage'],
    code: [JS(R`{
  "ImageId": "resolve:ssm:/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64",
  "InstanceType": "t3.micro",
  "IamInstanceProfile": { "Name": "demo-app-instance-profile" },
  "SecurityGroupIds": ["sg-0123456789abcdef2"],
  "MetadataOptions": { "HttpTokens": "required", "HttpEndpoint": "enabled" },
  "Monitoring": { "Enabled": true },
  "TagSpecifications": [
    { "ResourceType": "instance", "Tags": [ { "Key": "app", "Value": "demo" }, { "Key": "owner", "Value": "team-platform" } ] }
  ]
}`, 'lt.json (launch template data: no keys, role via instance profile, IMDSv2 required)'),
      SH(R`# COST: t3.micro is free-tier eligible for one instance-month in older accounts, otherwise a few cents per hour.
# Keep min/max tiny and delete the ASG at the end of the lab (scale to 0 first, then delete --force-delete).
aws ec2 create-launch-template --launch-template-name demo-lt --version-description v1 \
  --launch-template-data file://lt.json

aws autoscaling create-auto-scaling-group --auto-scaling-group-name demo-asg \
  --launch-template 'LaunchTemplateName=demo-lt,Version=$Latest' \
  --min-size 1 --max-size 3 --desired-capacity 1 \
  --vpc-zone-identifier "subnet-0aaa1111bbb22222a,subnet-0bbb3333ccc44444b" \
  --target-group-arns arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/demo-tg/0123456789abcdef \
  --health-check-type ELB --health-check-grace-period 180 \
  --default-instance-warmup 120

# Target tracking: keep average CPU near 50%
cat > tt.json <<'JSON'
{
  "PredefinedMetricSpecification": { "PredefinedMetricType": "ASGAverageCPUUtilization" },
  "TargetValue": 50.0
}
JSON
aws autoscaling put-scaling-policy --auto-scaling-group-name demo-asg \
  --policy-name cpu-50 --policy-type TargetTrackingScaling \
  --target-tracking-configuration file://tt.json

# Scheduled scaling for a known 09:00 peak (UTC): be ready BEFORE the rush
aws autoscaling put-scheduled-update-group-action --auto-scaling-group-name demo-asg \
  --scheduled-action-name before-peak --recurrence "45 8 * * 1-5" --min-size 2 --desired-capacity 2

# What did the ASG do and why?
aws autoscaling describe-scaling-activities --auto-scaling-group-name demo-asg --max-items 5 \
  --query 'Activities[].[StartTime,StatusCode,Description,Cause]' --output text

# Cleanup
aws autoscaling delete-auto-scaling-group --auto-scaling-group-name demo-asg --force-delete
aws ec2 delete-launch-template --launch-template-name demo-lt`, 'AWS CLI v2: launch template, ASG, target tracking, schedule'),
      PY(`# boto3: roll out a new launch template version without downtime (instance refresh keeps 90% healthy).
import boto3

def roll_out(asg: str, template: str, new_version: str) -> str:
    ec2 = boto3.client("ec2")
    asg_c = boto3.client("autoscaling")
    ec2.modify_launch_template(LaunchTemplateName=template, DefaultVersion=new_version)
    r = asg_c.start_instance_refresh(
        AutoScalingGroupName=asg,
        Strategy="Rolling",
        Preferences={"MinHealthyPercentage": 90, "InstanceWarmup": 120},
    )
    return r["InstanceRefreshId"]`, 'boto3: instance refresh')],
    codeTitle: ['Launch template data (JSON)', 'ASG, target tracking and cleanup (AWS CLI v2)', 'Python with boto3: instance refresh'],
    viz: [{
      title: 'Target tracking vs boot time: why scaling feels late',
      input: '100, 100, 200, 400, 400, 400, 400, 400, 400, 300, 200, 200',
      inputLabel: 'total load per minute, in "percent of one instance" (400 = needs 4 instances at 100%). Target 50%, boot 3 min, min 2, max 10, starts with 2.',
      gen: function (input) {
        var load = parseNums(input, 'total load per minute', 16);
        var target = 50, boot = 3, mn = 2, mx = 10, ready = 2, desired = 2, pend = [], f = [], rows = [], hl = {}, sat = 0;
        load.forEach(function (L, t) {
          pend = pend.filter(function (p) { if (p.at <= t) { ready++; return false; } return true; });
          var cpu = Math.min(100, Math.round(L / ready));
          var inflight = pend.length;
          var want = targetDesired(ready + inflight, cpu, target, mn, mx);
          var launch = Math.max(0, want - (ready + inflight));
          for (var k = 0; k < launch; k++) pend.push({ at: t + boot });
          if (want < ready + inflight) { var cut = Math.min(ready + inflight - want, ready - mn); if (cut > 0 && L / (ready - cut) < target * 0.9) ready -= cut; }
          desired = ready + pend.length;
          rows.push([t + 1, L, ready, cpu + '%', pend.length, desired]);
          if (cpu >= 100) { hl[t] = 'bad'; sat++; } else if (launch > 0) hl[t] = 'cur';
          var msg = 'Minute ' + (t + 1) + ': total load ' + L + ', <b>' + ready + '</b> instance(s) in service, so each is at about <b>' + cpu + '%</b>. ';
          if (cpu >= 100) msg += 'The fleet is <b>saturated</b>: users wait or get errors. ';
          if (launch > 0) msg += 'Target tracking asks for ceil(' + (ready + inflight) + ' x ' + cpu + ' / ' + target + ') = <b>' + want + '</b> total, so it launches ' + launch + ' more; they will be ready in ' + boot + ' min (boot + health checks). ';
          else if (inflight) msg += inflight + ' instance(s) are still booting; the policy already counted them, so it does not over-order. ';
          else msg += 'Nothing to change. ';
          f.push({ narr: msg, parts: [{ type: 'table', label: 'minute by minute', columns: ['min', 'load', 'in service', 'CPU each', 'booting', 'desired'], rows: rows.map(function (r) { return r.slice(); }), hl: JSON.parse(JSON.stringify(hl)) }, { type: 'bars', label: 'CPU per instance (%) so far', values: rows.map(function (r) { return parseInt(r[3], 10); }), hl: JSON.parse(JSON.stringify(hl)) }] });
        });
        f.push({ narr: '<b>Summary:</b> the fleet was saturated for <b>' + sat + '</b> minute(s). Every saturated minute is the price of reacting to a metric instead of predicting load. Faster boot (baked AMI), a lower target (more headroom), request-count metrics, or scheduled scaling shrink that number.', parts: [{ type: 'vars', label: 'result', vals: { 'saturated minutes': sat, 'boot + health time': boot + ' min', 'target': target + '% CPU' }, hl: { 'saturated minutes': sat ? 'bad' : 'ok' } }] });
        return pad4(f, 'Done.');
      }
    }],
    examples: [
      { title: 'Incident: the flash sale starts and the site stalls for 5 minutes', html: `<p>At 12:00 traffic jumps 6x. CPU reaches 100% at 12:01. The CloudWatch alarm needs 3 one-minute data points, so scale-out starts at 12:03; instances boot until 12:05 (user data runs <code>yum install</code> and pulls code), pass health checks at 12:06, and are warm by 12:08. Total: about 7 minutes of errors. Fixes in order of cost: a scheduled action at 11:45 (free), a baked AMI that boots in 40 s, a target of 40% and the <code>ALBRequestCountPerTarget</code> metric, and a warm pool for the big events.</p>` },
      { title: 'Incident: a hung instance stays in the ASG for hours', html: `<p>An app deadlocked on one instance. EC2 status checks were green (the VM was fine), the ALB marked it unhealthy and stopped sending traffic, but the ASG still counted it as healthy because the health check type was <b>EC2</b>, so no replacement was launched and capacity silently dropped by a third. Switching to <code>--health-check-type ELB</code> makes the ASG terminate and replace targets the load balancer has given up on. Keep the grace period longer than your slowest boot.</p>` },
      { title: 'Safe roll-out of a new AMI', html: `<p>Create launch template <b>version 2</b> (new AMI), set it as the default, then start an <b>instance refresh</b> with <code>MinHealthyPercentage=90</code>. The ASG replaces instances in small batches, waits for each batch to pass health checks, and stops if too many fail (with auto-rollback if configured). Never edit "the one running instance" by hand: the next scale-out would launch the old image, and a configuration that exists only on one server is exactly what an ASG exists to prevent.</p>` }
    ],
    deepDive: `<p>🟣 <b>What target tracking really does.</b> It creates and manages two CloudWatch alarms for you (one high, one low) and adjusts capacity proportionally, so you should not edit them. It is intentionally asymmetric: it scales out aggressively when the metric is above target but scales in conservatively (the low alarm needs about 15 consecutive minutes below 90% of the target), so a brief lull does not remove servers you will need in two minutes. You can disable scale-in on a policy if you prefer to scale in with a schedule.</p>
      <p>🟣 <b>Metrics to choose.</b> CPU is easy but only right for CPU-bound services. <code>ALBRequestCountPerTarget</code> scales on traffic directly and is steady for web fleets. For queue workers use a custom "backlog per instance" metric (queue length divided by running instances) so the fleet grows with the backlog (topic 6). Memory is not published by default; install the CloudWatch agent if you scale on it. Scaling on a metric that your own scaling changes (latency of a shared database) can oscillate.</p>
      <p>🟣 <b>Cooldowns and warm-up.</b> <code>DefaultInstanceWarmup</code> tells the ASG how long a new instance takes to contribute to the metrics; during warm-up its usage is not counted into the aggregate, so a fresh cold instance with low CPU does not trick the policy into scaling in, and the policy does not keep adding instances while earlier ones start. Too long a warm-up scales out slowly under continued pressure; too short overshoots. Measure your real time-to-ready and set it just above.</p>
      <p>🟣 <b>Cost and resilience.</b> Spread over at least two AZs; ASG rebalances after an AZ recovers. A <b>mixed instances policy</b> can run most of the fleet on Spot (up to ~70-90% cheaper, interruptible with a 2-minute warning) with a base of On-Demand, and diversifies over several instance types so one Spot pool running dry does not stall scaling. Scale-in protection and lifecycle hooks (finish the job, deregister from service discovery) keep long tasks from being cut. Always cap <code>max-size</code>: a bug or an attack that floods the metric should not be able to launch 500 instances on your bill.</p>`,
    aiEra: `<p>🤖 AI is a good partner for writing the launch template JSON and for explaining a <code>describe-scaling-activities</code> history ("why did it scale in at 3 a.m.?"). It is a poor judge of your numbers: ask it for a target value and it will say 50% or 70% with equal confidence. Use load-test data instead: find the CPU at which p95 latency starts to rise, and set the target comfortably below that. When an assistant proposes a huge <code>max-size</code> "to be safe" or a user-data script with a pasted token, treat that as a bug. Give the assistant your measured boot time and ask it to reason about the worst-case reaction time with you; the arithmetic of alarm periods plus boot plus warm-up is something it can lay out clearly.</p>`,
    problems: [P({
      t: 'Target-tracking desired capacity',
      l: 'Medium', tags: ['ASG', 'target tracking', 'autoscaling'], co: ['Amazon', 'Netflix'],
      lang: 'python',
      s: `<p>Write <code>desired_capacity(current, metric, target, min_size, max_size)</code> that returns the number of instances target tracking asks for: <code>ceil(current x metric / target)</code>, kept between <code>min_size</code> and <code>max_size</code>. All values are non-negative integers (<code>metric</code> and <code>target</code> are percentages such as 90 and 50, and <code>target</code> is at least 1). Use integer arithmetic only, so there is no floating-point rounding surprise.</p>`,
      ex: `<p><code>(4, 90, 50, 2, 10)</code> &rarr; <span class="c-g">8</span> because 4 x 90 / 50 = 7.2, rounded <b>up</b> to 8.<br><code>(4, 90, 50, 2, 6)</code> &rarr; <span class="c-y">6</span>: the cap (max 6) wins.<br><code>(3, 0, 50, 2, 10)</code> &rarr; <span class="c-y">2</span>: zero load, but never below the minimum.</p>`,
      bw: `<p>Rounding down or to the nearest integer (<code>round(7.2) = 7</code>) leaves the fleet under target: 7 instances at the same total load run at about 51.4% CPU, above the 50% goal. Ceiling guarantees the metric ends at or below target. Floating-point <code>ceil(x / y)</code> can also be off by one for large products; integer maths avoids that.</p>`,
      q: ['4 instances at 75% CPU with target 50%. What does target tracking want?', ['6', '5', '7', '4'], 0, '4 x 75 / 50 = 6.0 exactly, so 6. At 6 instances the same load is 50% each. (Rounding errors in float code could turn 6.0 into 6.000000001 and give 7: use integers.)'],
      h: ['Hint 1: total load is current x metric; each instance should carry target of it, so divide.', 'Hint 2: ceiling of a / b for positive integers is <code>(a + b - 1) // b</code>.', 'Hint 3: clamp afterwards: <code>max(min_size, min(max_size, value))</code>.'],
      a: `<p>The total load in "percent of one instance" is <code>current x metric</code>. To bring the average back to <code>target</code> you need that total divided by target instances, rounded up, then limited by the group bounds. Real target tracking also scales in more cautiously and respects warm-up; this function is the core proportional rule.</p>`,
      code: PY(`def desired_capacity(current, metric, target, min_size, max_size):
    """Instances target tracking asks for: ceil(current * metric / target), clamped to [min_size, max_size]."""
    total = current * metric                        # total load in "percent of one instance"
    want = (total + target - 1) // target           # integer ceiling division, no float rounding issues
    return max(min_size, min(max_size, want))`, 'Python (tested)'),
      cx: `<p>O(1) time and space.</p>`,
      f: ['Why does AWS scale in more slowly than out? (Flapping costs more than a few extra idle minutes.)', 'How would you account for instances still warming up?'],
      tests: { sig: 'int int int int int -> int', fn: 'desired_capacity', cases: [
        [[4, 90, 50, 2, 10], 8],
        [[4, 90, 50, 2, 6], 6],
        [[4, 20, 50, 2, 10], 2],
        [[4, 10, 50, 3, 10], 3],
        [[1, 50, 50, 1, 5], 1],
        [[10, 75, 60, 2, 20], 13],
        [[3, 0, 50, 2, 10], 2],
        [[5, 100, 40, 1, 10], 10],
        [[4, 75, 50, 1, 10], 6]
      ] }
    })]
  });

  // ───────────────────────── Topic 5: serverless functions ─────────────────────────
  topics.push({
    title: 'Serverless Functions: Lambda and Azure Functions, Cold Starts, Timeouts and Concurrency',
    analogy: `<p>A serverless function is a <b>taxi instead of a car you own</b>. You do not park, insure or service anything; you pay only for the minutes you ride. But there are rules of the road: the first ride after a quiet period has to wait for a taxi to arrive (<b>cold start</b>); a taxi trip has a maximum length (<b>timeout</b>); and the city only has so many taxis for everyone (<b>concurrency limit</b>). If a thousand people shout "taxi!" at once, some get a "none available" (<b>throttle</b>) and must try again.</p>`,
    explain: `<p>🟢 <b>What Lambda is.</b> You upload a small piece of code (a <b>handler</b> function). AWS runs it when an <b>event</b> arrives (an HTTP request through API Gateway or a function URL, an S3 upload, an SQS message, a schedule, ...) and bills per request and per GB-second of run time. No server to patch, no idle cost, scales from zero to thousands of copies. Your code runs with an <b>execution role</b> (an IAM role): AWS gives it temporary credentials automatically, so there are <b>never access keys</b> in your code or environment variables.</p>
      ${H.table(['Setting', 'What it does', 'Default / limit'], [
        ['<b>Memory</b>', 'RAM for the function; CPU power scales with it (about 1 vCPU at 1,769 MB)', '128 MB - 10,240 MB'],
        ['<b>Timeout</b>', 'the function is killed if it runs longer', 'default 3 s, max 15 min'],
        ['<b>Environment variables</b>', 'config like table names or secret ARNs (never secret values)', '4 KB total'],
        ['<b>Execution role</b>', 'which AWS APIs the code may call', 'least privilege, one role per function'],
        ['<b>Reserved concurrency</b>', 'guarantees AND caps how many copies can run at once', 'carved out of the account pool'],
        ['<b>Provisioned concurrency</b>', 'keeps N environments initialized and warm; billed while on', 'removes cold starts for that N']
      ])}
      <p>🟢 <b>Cold starts.</b> A Lambda "execution environment" is a tiny sandbox. The first request on a new one must <b>start the sandbox, download your code, start the runtime and run your top-level (init) code</b>: that is the cold start, from about 100-300 ms for Python and Node up to a few seconds for big Java apps or functions inside a VPC with large packages. Later requests reuse the warm environment and run only the handler. Three habits help: create SDK clients and database connections <b>outside</b> the handler (reused while warm), keep the package small, and give it enough memory (more memory = more CPU = faster init).</p>
      <p>🔵 <b>Concurrency is arithmetic, not magic.</b> By Little's law: <b>concurrent executions = requests per second x average duration in seconds</b>. 100 requests/s at 200 ms need 100 x 0.2 = <b>20</b> copies running at once. If the same function slows to 2 s, it needs 200. A slow dependency therefore multiplies your concurrency and can exhaust the account limit (default <b>1,000 per Region</b>, can be raised). When the limit is hit, synchronous callers get <b>429 TooManyRequests</b>; asynchronous events are retried for up to 6 hours; SQS pollers back off and the messages return to the queue.</p>
      <p>🔵 <b>Cost, a worked example.</b> 3 million requests a month, 200 ms average, 512 MB (0.5 GB): compute = 3,000,000 x 0.2 s x 0.5 GB = <b>300,000 GB-seconds</b>. Price (x86, us-east-1) about $0.0000166667 per GB-s and $0.20 per million requests, with a monthly free tier of 1M requests and 400,000 GB-s. So compute is covered by the free tier and requests cost (3 - 1) x $0.20 = <b>$0.40</b>. The same load on an always-on small server costs more than that, but at a steady very high load (say 500 requests/s all day) Lambda becomes more expensive than containers or instances. Serverless wins for spiky, idle-heavy or event-driven work.</p>
      <p>🔵 <b>Good fits and bad fits.</b> Good: glue between services, webhooks, image resize on upload, cron jobs, queue consumers, low-traffic APIs. Poor: long-running jobs (&gt; 15 min), constant heavy CPU, connections that must stay open (use containers), latency that cannot tolerate any cold start (use provisioned concurrency or a container).</p>
      ${H.table(['AWS', 'Azure', 'GCP'], [
        ['Lambda', '<b>Azure Functions</b> (Consumption, Flex Consumption, Premium, Dedicated plans)', 'Cloud Run functions (ex Cloud Functions) / Cloud Run'],
        ['Event source mapping (SQS, Kinesis, DynamoDB)', 'Triggers and <b>bindings</b> (Queue, Service Bus, Event Hubs, Blob)', 'Eventarc triggers, Pub/Sub push or pull'],
        ['Execution role', 'Managed identity (system- or user-assigned)', 'Service account attached to the function'],
        ['Reserved / provisioned concurrency', 'Max scale-out limit; Premium "always ready" instances', 'max-instances / min-instances'],
        ['Max time: 15 min', 'Consumption 5-10 min; Premium/Flex longer; Durable Functions for workflows', 'functions up to 60 min (2nd gen HTTP: 60 min); Cloud Run jobs longer'],
        ['Step Functions', 'Durable Functions / Logic Apps', 'Workflows']
      ])}`,
    clues: ['"run code on an event, pay only when it runs", "no servers to manage" → Lambda / Azure Functions', '"function times out after 3 seconds" → raise <code>--timeout</code>, but first find out what is slow (cold start? downstream call?)', '"429 TooManyRequests", "throttles" → concurrency limit; use reserved concurrency, queue in front, or request a limit increase', '"first request is slow after idle" → <b>cold start</b>: provisioned concurrency, smaller package, init outside the handler', '"function needs a database password" → execution role + Secrets Manager (cached at init), never env-var secrets in plain text or keys', '"500 requests/s, 200 ms each, how many instances?" → Little\'s law: 500 x 0.2 = 100 concurrent'],
    code: [PY(`# app.py - a Lambda handler. Runs locally too: the handler is a plain function.
import json
import os
import time

# INIT phase: runs once per cold start. Create SDK clients and read config here, NOT inside the handler.
TABLE = os.environ.get("TABLE_NAME", "orders")        # config from an environment variable
SOFT_LIMIT_MS = 1500                                  # stop early if less than this remains

def handler(event, context):
    """Process a batch of SQS records; report only failed ones so good ones are not retried."""
    failures = []
    for rec in event.get("Records", []):
        if context.get_remaining_time_in_millis() < SOFT_LIMIT_MS:
            failures.append({"itemIdentifier": rec["messageId"]})  # out of time: give it back to the queue
            continue
        try:
            order = json.loads(rec["body"])
            if "order_id" not in order:
                raise ValueError("missing order_id")        # poison message: will retry, then land in the DLQ
            print(json.dumps({"table": TABLE, "processed": order["order_id"]}))
        except Exception as exc:                            # log and mark just this record as failed
            print(json.dumps({"error": str(exc), "messageId": rec["messageId"]}))
            failures.append({"itemIdentifier": rec["messageId"]})
    return {"batchItemFailures": failures}               # requires ReportBatchItemFailures on the mapping


class FakeContext:                                      # local stand-in for the Lambda context object
    def __init__(self, ms):
        self._end = time.time() + ms / 1000.0
    def get_remaining_time_in_millis(self):
        return int((self._end - time.time()) * 1000)


if __name__ == "__main__":
    ev = {"Records": [{"messageId": "m1", "body": json.dumps({"order_id": 1})},
                      {"messageId": "m2", "body": "not json"},
                      {"messageId": "m3", "body": json.dumps({"order_id": 3})}]}
    print(handler(ev, FakeContext(30000)))`, 'Python: SQS batch handler (partial batch failures)'),
      JS(R`{
  "Version": "2012-10-17",
  "Statement": [
    { "Effect": "Allow", "Action": ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"], "Resource": "arn:aws:logs:us-east-1:123456789012:log-group:/aws/lambda/orders-worker:*" },
    { "Effect": "Allow", "Action": ["sqs:ReceiveMessage", "sqs:DeleteMessage", "sqs:GetQueueAttributes"], "Resource": "arn:aws:sqs:us-east-1:123456789012:orders-queue" },
    { "Effect": "Allow", "Action": "secretsmanager:GetSecretValue", "Resource": "arn:aws:secretsmanager:us-east-1:123456789012:secret:prod/orders/db-AbCdEf" }
  ]
}`, 'Execution role permissions policy (least privilege, no keys anywhere)'),
      SH(R`# The role's TRUST policy lets the Lambda service assume it; permissions come from the policy above.
cat > trust.json <<'JSON'
{ "Version": "2012-10-17", "Statement": [ { "Effect": "Allow", "Principal": { "Service": "lambda.amazonaws.com" }, "Action": "sts:AssumeRole" } ] }
JSON
aws iam create-role --role-name orders-worker-role --assume-role-policy-document file://trust.json
aws iam put-role-policy --role-name orders-worker-role --policy-name orders-worker --policy-document file://policy.json

zip function.zip app.py
aws lambda create-function --function-name orders-worker \
  --runtime python3.13 --handler app.handler \
  --role arn:aws:iam::123456789012:role/orders-worker-role \
  --zip-file fileb://function.zip \
  --timeout 30 --memory-size 256 \
  --environment 'Variables={TABLE_NAME=orders,DB_SECRET_ARN=arn:aws:secretsmanager:us-east-1:123456789012:secret:prod/orders/db-AbCdEf}'

# Concurrency: reserve 20 (guarantee AND cap, protects the database), or keep 2 warm (billed while on)
aws lambda put-function-concurrency --function-name orders-worker --reserved-concurrent-executions 20
# aws lambda put-provisioned-concurrency-config --function-name orders-worker --qualifier live --provisioned-concurrent-executions 2

# Try it, then read the logs. COST: a few invocations are far inside the free tier.
echo '{"Records":[{"messageId":"m1","body":"{\"order_id\": 1}"}]}' > event.json
aws lambda invoke --function-name orders-worker --payload fileb://event.json out.json && cat out.json
aws logs tail /aws/lambda/orders-worker --since 15m

# Cleanup
aws lambda delete-function --function-name orders-worker
aws iam delete-role-policy --role-name orders-worker-role --policy-name orders-worker
aws iam delete-role --role-name orders-worker-role`, 'AWS CLI v2: role, function, concurrency, invoke, logs'),
      SH(R`# Azure equivalent (verify flags against the current az docs). Identity replaces keys here too.
az group create --name demo-rg --location eastus
az storage account create --name demostorage12345 --resource-group demo-rg --sku Standard_LRS
az functionapp create --name demo-func-12345 --resource-group demo-rg \
  --storage-account demostorage12345 --flexconsumption-location eastus \
  --runtime python --runtime-version 3.12
az functionapp identity assign --name demo-func-12345 --resource-group demo-rg
az functionapp config appsettings set --name demo-func-12345 --resource-group demo-rg \
  --settings TABLE_NAME=orders
# Cleanup: removes everything in the group
az group delete --name demo-rg --yes --no-wait`, 'Azure CLI: Function App with a managed identity')],
    codeTitle: ['Handler for SQS batches with partial failures (Python)', 'Execution role policy', 'Create, limit, invoke and clean up (AWS CLI v2)', 'Azure Functions equivalent'],
    viz: [{
      title: 'Concurrency limit: who gets throttled?',
      input: 'dur=2 limit=8 : 5 5 5 5 0 0 9 9',
      inputLabel: 'dur = seconds each request runs, limit = concurrent executions allowed : requests arriving each second',
      gen: function (input) {
        var m = String(input || '').match(/^\s*dur\s*=\s*(\d+)\s+limit\s*=\s*(\d+)\s*:\s*([\d\s,]+)$/i);
        if (!m) throw new Error('Use the form: dur=2 limit=8 : 5 5 5 5');
        var dur = +m[1], limit = +m[2], arr = parseNums(m[3], 'requests per second', 16);
        if (dur < 1 || dur > 10) throw new Error('dur must be between 1 and 10');
        var res = lambdaRun(arr, dur, limit), rows = [], hl = {}, f = [];
        res.rows.forEach(function (r, i) {
          rows.push([r[0] + 's', r[1], r[2], r[3], r[4]]);
          if (r[4] > 0) hl[i] = 'bad';
          var free = Math.max(0, limit - r[2]);
          f.push({ narr: 'Second ' + r[0] + ': <b>' + r[1] + '</b> requests arrive. <b>' + r[2] + '</b> executions from earlier seconds are still running (each lasts ' + dur + ' s), leaving <b>' + free + '</b> free slot(s) of ' + limit + '. ' + (r[4] > 0 ? 'The extra <b>' + r[4] + '</b> are throttled (HTTP 429 for synchronous callers; async/SQS callers retry later).' : 'Everyone fits.'), parts: [{ type: 'table', label: 'per second', columns: ['time', 'arriving', 'still running', 'accepted', 'throttled'], rows: rows.map(function (x) { return x.slice(); }), hl: JSON.parse(JSON.stringify(hl)) }, { type: 'bars', label: 'running now / limit', values: [r[2] + r[3], limit], texts: [(r[2] + r[3]) + ' running', limit + ' limit'], hl: r[4] > 0 ? { 0: 'bad' } : { 0: 'ok' } }] });
        });
        f.push({ narr: '<b>Total throttled: ' + res.throttled + '.</b> Doubling the duration (a slow database call) doubles how long every slot is held, so the same traffic needs twice the concurrency. Fixes: put a queue in front, raise the limit, shorten the function, or reserve concurrency for the important function so others cannot starve it.', parts: [{ type: 'vars', label: 'rule of thumb', vals: { 'concurrency needed': 'requests per second x seconds each', 'throttled': res.throttled }, hl: { throttled: res.throttled ? 'bad' : 'ok' } }] });
        return pad4(f, 'Done.');
      }
    }],
    examples: [
      { title: 'Incident: a Lambda times out at 3 seconds', html: `<p>A new function calls a partner API that takes 2-5 s. Half the calls end with <code>Task timed out after 3.00 seconds</code> because the default timeout is 3 s. Do not just set 15 minutes. Decide the real budget: if the caller (API Gateway) allows 29 s, set the function to about 25 s, set the HTTP client timeout to 10 s <em>inside</em> the code so you fail with a clear error and not a kill, and for slow work return 202 and finish it from a queue. Check the log line <code>REPORT ... Duration ... Init Duration ...</code>: an <code>Init Duration</code> shows a cold start, a big <code>Duration</code> shows slow work.</p>` },
      { title: 'Incident: 429s and the database melts at the same time', html: `<p>A marketing email sends 5,000 users to a page backed by a Lambda that queries PostgreSQL. Lambda scales to the 1,000-concurrency account limit, the database hits its connection limit, and <em>other</em> functions in the account are throttled because the pool is shared. Fixes: <b>reserved concurrency of 50</b> on this function (guarantees capacity for it, caps its damage), RDS Proxy to share connections, a queue to smooth the burst, and caching the hot page at CloudFront. The cap is often the real protection for a downstream dependency.</p>` },
      { title: 'Cold start numbers and the cheap fixes', html: `<p>A Python function with 5 MB of code shows <code>Init Duration: 180 ms</code> at 128 MB. Raising memory to 512 MB cut init to 70 ms and total duration by half, so the bill went <em>down</em> (cost = memory x time). Importing a heavy library (pandas, a big SDK) inside the handler adds the cost on every call; import it at the top once. Provisioned concurrency of 2 removes cold starts for the first 2 parallel requests, costing a small hourly fee. For Java, <b>SnapStart</b> snapshots the initialized runtime and restores it in tens of milliseconds.</p>` }
    ],
    deepDive: `<p>🟣 <b>Scaling behaviour.</b> A function scales by adding execution environments: up to 1,000 new environments every 10 seconds per function (up to the account limit), each handling one request at a time. So 5,000 requests in the first second cannot all be served; most are throttled until environments exist. Provisioned concurrency pre-creates them. For SQS sources, the poller starts with 5 concurrent batches and adds up to 300 per minute, so a sudden backlog drains gradually; use <code>MaximumConcurrency</code> on the event source mapping (2-1000) to cap it without reserving account capacity.</p>
      <p>🟣 <b>Failure modes by invocation type.</b> Synchronous (API Gateway, function URL): the caller sees the error and decides; no automatic retry. Asynchronous (S3, SNS, EventBridge): Lambda queues the event and retries twice by default; configure an on-failure destination or a DLQ so you do not lose events. Poll-based (SQS, Kinesis, DynamoDB streams): the mapping retries until success or until the message hits maxReceiveCount (SQS) or expires (streams). Your handler must be <b>idempotent</b>: the same event can arrive twice (retries, at-least-once delivery), so use an idempotency key or a conditional write.</p>
      <p>🟣 <b>Networking and permissions.</b> A function outside a VPC reaches the internet and AWS public APIs by default. A function in a VPC (needed to reach a private RDS) reaches the internet only through a <b>NAT gateway</b>, which is the most common surprise bill (about $32/month plus data) in small projects: use VPC endpoints for S3, DynamoDB, Secrets Manager and SQS instead. Never put long-lived access keys in env vars; the role's temporary credentials are injected as <code>AWS_ACCESS_KEY_ID</code>/<code>AWS_SESSION_TOKEN</code> for the SDK, and the SDK picks them up by itself.</p>
      <p>🟣 <b>Operations.</b> Use <b>versions and aliases</b> (<code>live</code> pointing at version 7) for safe rollout with weighted aliases (10% to the new version); structured JSON logs; the Powertools for AWS Lambda library for logging, tracing and idempotency; X-Ray for traces; and alarms on <code>Errors</code>, <code>Throttles</code> and <code>Duration</code> p99 against the timeout (p99 near the timeout is an incident waiting to happen). Package size limits: 50 MB zipped, 250 MB unzipped, or a container image up to 10 GB.</p>`,
    aiEra: `<p>🤖 Serverless is a favourite for AI-generated code because the unit is small. Typical mistakes to catch in review: clients created inside the handler (slow and connection-leaking), an <code>except: pass</code> that swallows errors so the message is deleted anyway, a wildcard <code>"Action": "*"</code> role, a timeout of 900 s "to be safe", and secrets pasted into environment variables. Ask the assistant to compute concurrency for your traffic with Little's law and show the arithmetic, then verify it against the real <code>ConcurrentExecutions</code> metric. Lambda is also where AI agents increasingly run tool calls; the same rules (narrow role, timeout, concurrency cap, idempotency) are what keep an over-eager agent from running up a bill.</p>`,
    problems: [P({
      t: 'Count throttled requests with a concurrency limit',
      l: 'Medium', tags: ['Lambda', 'concurrency', 'throttling', 'Little\'s law'], co: ['Amazon', 'Shopify'],
      lang: 'python',
      s: `<p>A Lambda function has a concurrency limit <code>limit</code>. Every accepted request holds one slot for exactly <code>dur</code> whole seconds (a request accepted at second <code>t</code> occupies seconds <code>t .. t+dur-1</code>). The list <code>arrivals</code> gives how many requests arrive in each second. In each second, as many requests are accepted as there are free slots; the rest are <b>throttled</b> (dropped, no retry). Write <code>throttled(arrivals, dur, limit)</code> that returns the total number of throttled requests.</p>`,
      ex: `<p><code>arrivals = [5,5,5,5], dur = 2, limit = 8</code>: second 0 accepts 5; second 1 has 5 still running, 3 free, accepts 3 and throttles 2; second 2 has only the 3 from second 1 running, accepts 5; second 3 has 5 running, accepts 3 and throttles 2. Total <span class="c-r">4</span>.</p>`,
      bw: `<p>Dividing total requests by the limit ignores timing. Slots are held for <code>dur</code> seconds, so bursts and quiet seconds matter: <code>[100,0,0,100]</code> with limit 50 loses 100 even though the average rate is tiny.</p>`,
      q: ['100 requests/s each lasting 0.5 s. Roughly how many concurrent executions does the function need?', ['50', '100', '200', '0.5'], 0, 'Little\'s law: concurrency = rate x duration = 100 x 0.5 = 50. If the duration doubles to 1 s, you need 100.'],
      h: ['Hint 1: keep, for each second, how many requests you accepted.', 'Hint 2: in second t, the running requests are those accepted in the last <code>dur - 1</code> seconds before t.', 'Hint 3: accepted = min(arrivals[t], max(0, limit - running)); throttled += arrivals[t] - accepted.'],
      a: `<p>Keep an <code>accepted</code> list. For each second sum the accepted counts of the previous <code>dur - 1</code> seconds (they are still running), compute free slots, accept up to that, and count the rest as throttled. With a sliding sum it is O(n); the direct window sum is O(n x dur), which is fine for small <code>dur</code>.</p>`,
      code: PY(`def throttled(arrivals, dur, limit):
    """Total requests rejected when each accepted request holds a slot for dur seconds."""
    accepted = []
    total = 0
    running = 0                                    # accepted requests still holding a slot
    for t, arriving in enumerate(arrivals):
        if t - dur >= 0:
            running -= accepted[t - dur]           # the request accepted at t-dur finishes before second t
        free = max(0, limit - running)
        ok = min(arriving, free)
        accepted.append(ok)
        running += ok
        total += arriving - ok
    return total`, 'Python (tested)'),
      cx: `<p>O(n) time with the sliding "running" counter, O(n) space for the accepted list.</p>`,
      f: ['How does reserved concurrency of 0 behave? (Everything is throttled: a kill switch.)', 'How would SQS change the outcome? (Throttled messages go back to the queue instead of being lost.)'],
      tests: { sig: 'int[] int int -> int', fn: 'throttled', cases: [
        [[[5, 5, 5, 5], 2, 8], 4],
        [[[10, 3, 12], 1, 8], 6],
        [[[0, 0, 0], 3, 5], 0],
        [[[10], 5, 4], 6],
        [[[3, 3, 3, 3, 3], 3, 6], 3],
        [[[2, 2, 2, 2], 2, 3], 2],
        [[[100, 0, 0, 100], 2, 50], 100],
        [[[4, 4, 4, 4, 4, 4], 3, 10], 4],
        [[[3, 4], 2, 0], 7]
      ] }
    })]
  });

  // ───────────────────────── Topic 6: queues and events ─────────────────────────
  topics.push({
    title: 'Queues and Events: SQS, DLQs, SNS Fan-Out and EventBridge',
    analogy: `<p>A queue is a <b>pickup counter at a bakery</b>. The shop (producer) puts orders on the counter and goes back to baking; the pickers (consumers) take one when they are free. When a picker takes an order, a sign says "being handled" for a few minutes (the <b>visibility timeout</b>). If the picker never comes back with a "done" slip, the order reappears on the counter. An order that has been picked up and dropped five times is clearly broken (a cake with no address), so it goes into a <b>"problems" box</b> (the dead-letter queue) for a human to look at instead of circling forever. <b>SNS</b> is a loudspeaker: one announcement, many listeners each with their own counter. <b>EventBridge</b> is a smart post room that reads each envelope and delivers it to whoever asked for that kind of mail.</p>`,
    explain: `<p>🟢 <b>Why queues.</b> You met this in <b>HLD 5</b>: a queue lets the fast part of a system hand work to the slow part and absorbs bursts. In AWS: <b>SQS</b> (Simple Queue Service) is a fully managed queue. Producers call <code>SendMessage</code>; consumers call <code>ReceiveMessage</code>, process, then <code>DeleteMessage</code>. SQS never deletes for you, because only your code knows whether the work succeeded.</p>
      ${H.table(['', 'SQS Standard', 'SQS FIFO'], [
        ['Order', 'best-effort, may be out of order', 'strict order per <b>message group id</b>'],
        ['Delivery', '<b>at least once</b> (duplicates are possible)', 'exactly-once <em>processing</em> via deduplication id (5-minute window)'],
        ['Throughput', 'nearly unlimited', '300 msg/s per API action (3,000 with batching); higher in high-throughput mode'],
        ['Name', 'any', 'must end in <code>.fifo</code>'],
        ['Use for', 'most background work, fan-out, load levelling', 'payments per account, per-user event order']
      ])}
      <p>🟢 <b>Visibility timeout.</b> When a consumer receives a message, SQS hides it for <code>VisibilityTimeout</code> seconds (default 30). If the consumer deletes it in time, done. If not (crash, or processing took longer than the timeout), the message becomes visible again and <b>another worker gets it</b>. Rule: <b>visibility timeout &gt; the longest normal processing time</b>. For a Lambda consumer AWS advises at least <b>6 x the function timeout</b>. Too short gives duplicate processing; too long delays retry after a crash.</p>
      <p>🟢 <b>Dead-letter queue (DLQ) and maxReceiveCount.</b> A <b>redrive policy</b> says: after a message has been received <code>maxReceiveCount</code> times without being deleted, move it to the DLQ (another SQS queue). Without a DLQ a <b>poison message</b> (bad JSON, missing field, a bug) is retried forever, burns capacity and hides real problems. Set <code>maxReceiveCount</code> to 3-5, give the DLQ a longer retention than the main queue (14 days), and <b>alarm when the DLQ is not empty</b>. After you fix the bug, <code>start-message-move-task</code> ("redrive") sends the messages back to the source queue.</p>
      <p>🔵 <b>Long polling.</b> Set <code>ReceiveMessageWaitTimeSeconds</code> to 20 so <code>ReceiveMessage</code> waits for messages instead of returning empty again and again: fewer empty responses, lower cost, lower latency.</p>
      <p>🔵 <b>SNS, EventBridge, SQS: which one?</b></p>
      ${H.table(['', 'SQS', 'SNS', 'EventBridge'], [
        ['Model', 'queue: one consumer group pulls', 'topic: push to <b>many</b> subscribers', 'event bus: rules match event content and route to up to 5 targets per rule'],
        ['Filtering', 'none (separate queues)', 'subscription filter policies on attributes/body', 'rich content-based patterns (prefix, numeric, exists, ...)'],
        ['Targets', '(consumers pull)', 'SQS, Lambda, HTTPS, email, SMS, mobile push', '20+ AWS services, API destinations (HTTP), other buses'],
        ['Extras', 'buffering, retry, DLQ', 'fan-out, FIFO topics', 'schedules (cron/rate), SaaS and AWS-service events, archive and replay, schema registry'],
        ['Use for', 'work to be done', 'tell several systems the same thing', 'react to things that happened; scheduled jobs; decouple many teams']
      ])}
      <p>🔵 <b>The classic pattern: SNS fan-out to SQS.</b> One <code>OrderPlaced</code> message goes to an SNS topic. Three SQS queues subscribe: inventory, email, analytics. Each service reads its own queue at its own pace and has its own DLQ, so a broken email service never blocks inventory. Enable <b>raw message delivery</b> so the queue message is your JSON, not wrapped in an SNS envelope.</p>
      ${H.table(['AWS', 'Azure', 'GCP'], [
        ['SQS', 'Service Bus queue (or Storage Queue for simple cases)', 'Pub/Sub subscription (pull) or Cloud Tasks'],
        ['SQS DLQ + maxReceiveCount', 'Service Bus dead-letter sub-queue + MaxDeliveryCount', 'Pub/Sub dead-letter topic + max delivery attempts'],
        ['SNS topic', 'Service Bus topic + subscriptions; Event Grid topic', 'Pub/Sub topic'],
        ['EventBridge rules / Scheduler', 'Event Grid (+ Logic Apps, Timer trigger)', 'Eventarc, Cloud Scheduler'],
        ['Kinesis / MSK (streams)', 'Event Hubs', 'Pub/Sub, Dataflow']
      ])}`,
    clues: ['"a message keeps failing and blocking the queue", "poison message" → <b>DLQ</b> with <code>maxReceiveCount</code>', '"the same message was processed twice" → standard queues are at-least-once; make consumers <b>idempotent</b>; check visibility timeout vs processing time', '"one event, several independent consumers" → <b>SNS fan-out to SQS</b> (or EventBridge)', '"handle a traffic spike without dropping requests", "decouple the web tier from slow processing" → put an <b>SQS queue</b> in between', '"strict ordering per customer" → <b>FIFO</b> with a message group id', '"run a job every night" or "react when an EC2/S3 event happens" → <b>EventBridge</b> rule or Scheduler'],
    code: [JS(R`{
  "VisibilityTimeout": "180",
  "MessageRetentionPeriod": "345600",
  "ReceiveMessageWaitTimeSeconds": "20",
  "RedrivePolicy": "{\"deadLetterTargetArn\":\"arn:aws:sqs:us-east-1:123456789012:orders-dlq\",\"maxReceiveCount\":\"5\"}"
}`, 'queue-attrs.json (visibility 180 s = 6 x a 30 s function; DLQ after 5 receives)'),
      SH(R`# SQS: create the DLQ first (longer retention), then the main queue that points at it.
aws sqs create-queue --queue-name orders-dlq --attributes MessageRetentionPeriod=1209600
aws sqs create-queue --queue-name orders-queue --attributes file://queue-attrs.json

# Alarm when anything lands in the DLQ (ApproximateNumberOfMessagesVisible > 0) - sketch:
aws cloudwatch put-metric-alarm --alarm-name orders-dlq-not-empty \
  --namespace AWS/SQS --metric-name ApproximateNumberOfMessagesVisible \
  --dimensions Name=QueueName,Value=orders-dlq --statistic Maximum --period 60 \
  --evaluation-periods 1 --threshold 0 --comparison-operator GreaterThanThreshold \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:ops-alerts

# Lambda consumer: batches of 10, partial failures reported, at most 5 concurrent batches
aws lambda create-event-source-mapping --function-name orders-worker \
  --event-source-arn arn:aws:sqs:us-east-1:123456789012:orders-queue \
  --batch-size 10 --function-response-types ReportBatchItemFailures \
  --scaling-config MaximumConcurrency=5

# After fixing the bug: send DLQ messages back to the source queue
aws sqs start-message-move-task --source-arn arn:aws:sqs:us-east-1:123456789012:orders-dlq

# SNS fan-out: topic -> queue. Raw delivery so consumers see the original JSON.
aws sns create-topic --name order-events
aws sns subscribe --topic-arn arn:aws:sns:us-east-1:123456789012:order-events \
  --protocol sqs --notification-endpoint arn:aws:sqs:us-east-1:123456789012:inventory-queue \
  --attributes '{"RawMessageDelivery":"true","FilterPolicy":"{\"event\":[\"OrderPlaced\"]}"}'
# (the inventory queue also needs a queue policy that lets sns.amazonaws.com SendMessage from this topic ARN)

# EventBridge: rule on the default bus + a target with its own DLQ for undeliverable events
cat > pattern.json <<'JSON'
{ "source": ["demo.orders"], "detail-type": ["OrderPlaced"], "detail": { "total": [ { "numeric": [">", 100] } ] } }
JSON
aws events put-rule --name big-orders --event-pattern file://pattern.json
aws events put-targets --rule big-orders --targets \
  '[{"Id":"vip-queue","Arn":"arn:aws:sqs:us-east-1:123456789012:vip-queue","DeadLetterConfig":{"Arn":"arn:aws:sqs:us-east-1:123456789012:events-dlq"}}]'
aws events put-events --entries '[{"Source":"demo.orders","DetailType":"OrderPlaced","Detail":"{\"order_id\":42,\"total\":250}"}]'

# Schedule: every 5 minutes (EventBridge Scheduler is the newer, more flexible option)
aws events put-rule --name every-5-min --schedule-expression "rate(5 minutes)"

# Cleanup (queues, topic, rules cost nothing idle but leave no orphans)
aws sqs delete-queue --queue-url https://sqs.us-east-1.amazonaws.com/123456789012/orders-queue
aws sqs delete-queue --queue-url https://sqs.us-east-1.amazonaws.com/123456789012/orders-dlq
aws sns delete-topic --topic-arn arn:aws:sns:us-east-1:123456789012:order-events`, 'AWS CLI v2: SQS + DLQ, Lambda mapping, SNS fan-out, EventBridge'),
      PY(`# boto3 consumer loop for a non-Lambda worker: long polling, delete only after success, idempotent handling.
import json
import os

import boto3

sqs = boto3.client("sqs")
QUEUE_URL = os.environ["QUEUE_URL"]                 # set by the platform, not hardcoded
seen = set()                                        # stand-in for a real idempotency store (DynamoDB conditional write)

def handle(body: dict) -> None:
    if "order_id" not in body:
        raise ValueError("missing order_id")        # poison: we do NOT delete, so it retries and ends in the DLQ

def poll_once() -> int:
    resp = sqs.receive_message(QueueUrl=QUEUE_URL, MaxNumberOfMessages=10, WaitTimeSeconds=20,
                               VisibilityTimeout=180, AttributeNames=["ApproximateReceiveCount"])
    done = 0
    for m in resp.get("Messages", []):
        try:
            body = json.loads(m["Body"])
            if body.get("order_id") not in seen:    # duplicates are normal with at-least-once delivery
                handle(body)
                seen.add(body["order_id"])
            sqs.delete_message(QueueUrl=QUEUE_URL, ReceiptHandle=m["ReceiptHandle"])
            done += 1
        except Exception as exc:
            print(f"failed (receive #{m['Attributes']['ApproximateReceiveCount']}): {exc}")   # leave it for retry/DLQ
    return done`, 'boto3: long-polling worker')],
    codeTitle: ['Queue attributes with the redrive policy', 'SQS, DLQ, SNS and EventBridge (AWS CLI v2)', 'Python with boto3: worker loop'],
    viz: [{
      title: 'Poison message: visibility timeout, retries and the DLQ',
      input: 'vis=30 max=3 : -1 -1 -1',
      inputLabel: 'vis = visibility timeout (s), max = maxReceiveCount : seconds the worker needs on each receive (-1 = crash / exception)',
      gen: function (input) {
        var m = String(input || '').match(/^\s*vis\s*=\s*(\d+)\s+max\s*=\s*(\d+)\s*:\s*([-\d\s,]+)$/i);
        if (!m) throw new Error('Use the form: vis=30 max=3 : -1 -1 -1');
        var vis = +m[1], mx = +m[2], at = parseNums(m[3], 'seconds per attempt (-1 = crash)', 10);
        if (mx < 1 || mx > 10 || vis < 1) throw new Error('vis must be at least 1 and max between 1 and 10');
        var run = sqsRun(at, vis, mx), f = [], rows = [], hl = {};
        function parts(main, dlq, note) { return [{ type: 'queue', label: 'orders-queue', items: main, frontLabel: 'next', backLabel: '' }, { type: 'queue', label: 'orders-dlq (alarm if not empty)', items: dlq, frontLabel: '', backLabel: '' }, { type: 'table', label: 'receives of message m-17', columns: ['receive #', 'worker needs', 'result'], rows: rows.length ? rows.map(function (r) { return r.slice(); }) : [['-', '-', note || '-']], hl: JSON.parse(JSON.stringify(hl)) }]; }
        f.push({ narr: 'A producer sends message <b>m-17</b>. Settings: visibility timeout <b>' + vis + ' s</b>, maxReceiveCount <b>' + mx + '</b>. Nothing has received it yet.', parts: parts(['m-17'], [], 'waiting') });
        run.log.forEach(function (e, i) {
          var need = e.p < 0 ? 'crashes' : e.p + ' s';
          rows.push([e.n, need, e.res]); hl[i] = e.res === 'deleted' ? 'ok' : 'bad';
          if (e.res === 'deleted') f.push({ narr: 'Receive <b>#' + e.n + '</b>: the worker finishes in ' + e.p + ' s, which is within the ' + vis + ' s visibility window, and calls <code>DeleteMessage</code>. Done. ' + (e.n > 1 ? 'It took ' + e.n + ' receives, so the work may have been partly done before: the handler must be <b>idempotent</b>.' : ''), parts: parts([], [], '')});
          else {
            var why = e.p < 0 ? 'the worker crashes (or throws) and never deletes it' : 'the worker needs ' + e.p + ' s but the message was hidden for only ' + vis + ' s: it reappears <b>while the first worker is still busy</b>, so a second worker may process it too (duplicate)';
            var last = e.n === mx;
            f.push({ narr: 'Receive <b>#' + e.n + '</b>: ' + why + '. ' + (last ? 'That was receive number maxReceiveCount (' + mx + ') and it was not deleted, so SQS moves it to the <b>DLQ</b>. It stops looping, and the alarm tells a human.' : 'After ' + vis + ' s it becomes visible again for receive #' + (e.n + 1) + '.'), parts: parts(last ? [] : ['m-17'], last ? ['m-17'] : [], '') });
          }
        });
        f.push({ narr: '<b>Outcome:</b> ' + (run.out.indexOf('deleted') === 0 ? 'deleted after ' + run.out.split(':')[1] + ' receive(s).' : 'sent to the DLQ after ' + mx + ' receives.') + ' Without a redrive policy this message would have looped forever.', parts: parts([], run.out.indexOf('dlq') === 0 ? ['m-17'] : [], '') });
        return pad4(f, 'Done.');
      }
    }, {
      title: 'SNS fan-out: one publish, three independent queues',
      gen: function () {
        var nodes = [box('pub', 'Order service', 6, 24, 18), box('sns', 'SNS: order-events', 34, 24, 20), box('q1', 'inventory-queue', 66, 4, 22), box('q2', 'email-queue', 66, 24, 22), box('q3', 'analytics-queue', 66, 44, 22)];
        var edges = [['pub', 'sns'], ['sns', 'q1'], ['sns', 'q2'], ['sns', 'q3']];
        function g(narr, hl, ehl, tags) { return { narr: narr, parts: [{ type: 'graph', label: 'fan-out', directed: true, height: 56, nodes: nodes, edges: edges, hl: hl, ehl: ehl || {}, tags: tags || {} }] }; }
        return [
          g('The order service publishes <b>one</b> message, <code>OrderPlaced</code>, to the SNS topic. It does not know who listens, so adding a fourth consumer later needs no change here.', { pub: 'cur' }, { 'pub-sns': 'cur' }, { sns: 'topic' }),
          g('SNS copies the message to every subscription. Each copy is delivered to its own SQS queue (raw delivery, so the body is the original JSON).', { sns: 'cur' }, { 'sns-q1': 'ok', 'sns-q2': 'ok', 'sns-q3': 'ok' }, { q1: '1 msg', q2: '1 msg', q3: '1 msg' }),
          g('The consumers read at their own speed. Inventory is fast and deletes its message at once. Analytics is slow and falls behind, but nobody else waits for it.', { q1: 'ok', q2: 'win', q3: 'win' }, { 'sns-q1': 'done' }, { q1: 'done', q2: 'reading', q3: 'slow' }),
          g('The email service has a bug and keeps failing. Its own <b>DLQ</b> collects the broken messages after maxReceiveCount tries. Inventory and analytics are unaffected: that isolation is the point of one queue per consumer.', { q2: 'bad' }, { 'sns-q2': 'bad' }, { q2: 'to DLQ' }),
          g('With a <b>filter policy</b> on a subscription (for example only <code>event = OrderPlaced</code>), a queue receives just the messages it cares about, so you do not pay to deliver and discard the rest.', { sns: 'sel' }, {}, { sns: 'filters' })
        ];
      }
    }],
    examples: [
      { title: 'Incident: a poison message loops forever', html: `<p>A queue had no DLQ. One order with a missing field made the worker throw before deleting it. The message reappeared every 30 seconds, got picked up, threw again, and filled the logs with the same stack trace; <code>ApproximateAgeOfOldestMessage</code> climbed and nobody noticed for two days. Fix: create <code>orders-dlq</code>, add a redrive policy with <code>maxReceiveCount = 5</code>, alarm on DLQ depth, and teach the handler to distinguish "bad message, do not retry" from "dependency down, retry later". Then read the DLQ, fix the bug, and use <code>start-message-move-task</code>.</p>` },
      { title: 'Incident: duplicates because visibility timeout < processing time', html: `<p>The default visibility timeout is 30 s. A consumer that calls a slow partner API takes 45 s. After 30 s the message is visible again, a second worker takes it, and the customer gets two confirmation emails (and sometimes two charges). Fix: visibility timeout 6 x the function timeout for Lambda, or for long jobs call <code>ChangeMessageVisibility</code> periodically as a heartbeat; and make the work <b>idempotent</b> by recording <code>order_id</code> with a conditional write before charging.</p>` },
      { title: 'Turning the slow report (504) into a queue job', html: `<p>From topic 3: <code>/reports/export</code> took 90 s and hit the ALB's 60 s limit. New design: the API validates the request, sends <code>{report_id, user}</code> to <code>reports-queue</code>, returns <b>202 Accepted</b> with a status URL in 50 ms. A worker (Lambda with a 5-minute timeout or an ASG fleet scaled on queue depth) builds the file, uploads it to S3, and publishes <code>ReportReady</code> to SNS, which emails a pre-signed link. The web tier no longer waits for slow work, and a burst of 500 requests just makes the queue longer instead of failing.</p>` }
    ],
    deepDive: `<p>🟣 <b>At-least-once means design for duplicates.</b> Standard SQS may deliver a message more than once even when everything works (distributed storage, a rare retry). The cure is idempotency: use a natural key (<code>order_id</code>), do an insert with a unique constraint or a DynamoDB conditional put, and treat "already done" as success. FIFO queues dedupe on the <code>MessageDeduplicationId</code> for 5 minutes, but a consumer crash after the side effect and before <code>DeleteMessage</code> still repeats the work, so idempotency is needed there too.</p>
      <p>🟣 <b>DLQ details that bite.</b> The DLQ of a FIFO queue must be FIFO; a standard queue's DLQ must be standard. The message keeps its <em>original enqueue timestamp</em> when moved, so the DLQ retention clock started when it was first sent: set DLQ retention (up to 14 days) longer than the source. For Lambda consumers, the DLQ must be configured on the <b>SQS queue</b> (redrive policy), not on the Lambda function (a Lambda DLQ is for async invocations). Use <code>ReportBatchItemFailures</code>: otherwise one bad record fails the whole batch of 10 and the 9 good ones are reprocessed, count towards maxReceiveCount, and may land in the DLQ unfairly.</p>
      <p>🟣 <b>Scaling on queue depth.</b> For a worker fleet, the signal is <b>backlog per instance</b> = <code>ApproximateNumberOfMessagesVisible / running instances</code>, compared with the number one instance can clear within your latency goal. Publish it as a custom metric and use it in a target-tracking policy (topic 4). Also watch <code>ApproximateAgeOfOldestMessage</code>: depth alone does not tell you how late you are.</p>
      <p>🟣 <b>EventBridge in more depth.</b> Rules match on a JSON pattern; one event can trigger several rules. Delivery to a target is retried for up to 24 hours (185 attempts by default) unless you shorten it; a per-target DLQ catches what cannot be delivered. <b>Archive and replay</b> let you re-send past events to test a new consumer. EventBridge Pipes connects a source (SQS, Kinesis, DynamoDB stream) to a target with optional filtering and enrichment. Compared with SNS: richer routing and many AWS sources, but lower throughput per account by default and a per-event price; SNS is cheaper and simpler for plain high-volume fan-out. A common architecture uses both: services publish domain events to EventBridge, rules fan them out to SQS queues per consumer.</p>`,
    aiEra: `<p>🤖 Event-driven systems are hard to read, which is where AI helps: paste the rule patterns and subscriptions and ask for "draw who receives an OrderPlaced event" and you get a map in seconds. It also drafts filter policies and event patterns, which are fiddly JSON. Check the output with <code>aws events test-event-pattern</code> against a real sample before trusting it. The frequent AI mistakes are the ones in this topic: no DLQ, a default 30 s visibility timeout under a slow handler, deleting the message in a <code>finally</code> block (so failed work is silently lost), and consumers that are not idempotent. Also note that LLM-backed workers have long and unpredictable runtimes, so queue-based, async designs with a generous visibility timeout and heartbeat are the standard way to run them safely.</p>`,
    problems: [P({
      t: 'Simulate one message: visibility timeout, retries and the DLQ',
      l: 'Medium', tags: ['SQS', 'DLQ', 'visibility timeout', 'redrive'], co: ['Amazon', 'Uber'],
      lang: 'python',
      s: `<p>Write <code>redrive(attempts, vis, max_receive)</code> that simulates one SQS message. <code>attempts[i]</code> is how many seconds the consumer needs on receive number <code>i + 1</code>; <code>-1</code> means the consumer crashes before deleting. Receives beyond the end of the list also crash.</p>
        <ul><li>If the consumer finishes within the visibility timeout (<code>0 &lt;= p &lt;= vis</code>) it deletes the message: return <code>"deleted:N"</code> where N is the receive number.</li>
        <li>Otherwise (crash, or <code>p &gt; vis</code> so the message reappeared) the message is received again.</li>
        <li>After <code>max_receive</code> receives without a delete the message goes to the dead-letter queue: return <code>"dlq:max_receive"</code>.</li></ul>`,
      ex: `<p><code>([-1,-1,5], 30, 5)</code> &rarr; <span class="c-g">"deleted:3"</span>: two crashes, then a 5 s success within 30 s.<br><code>([-1,-1,-1], 30, 3)</code> &rarr; <span class="c-r">"dlq:3"</span>: three receives, none deleted.<br><code>([31,30], 30, 2)</code> &rarr; <span class="c-g">"deleted:2"</span>: 31 s is one second too slow, but 30 s still fits (equal is fine).</p>`,
      bw: `<p>"Retry until it works." That is exactly the infinite loop a DLQ exists to prevent: a permanently bad message is retried forever and wastes capacity. The simulation shows the cap.</p>`,
      q: ['A consumer needs 45 s per message and the visibility timeout is 30 s. What happens?', ['The message reappears while the first worker is still busy, causing duplicate processing and wasted receives', 'SQS extends the timeout automatically', 'The message is deleted', 'The consumer is throttled'], 0, 'Visibility timeout is a fixed hide window. If processing outlasts it, another consumer can receive the same message, and each receive counts toward maxReceiveCount. Raise the timeout or heartbeat with ChangeMessageVisibility.'],
      h: ['Hint 1: loop over receive numbers 1 .. max_receive.', 'Hint 2: for receive n take <code>attempts[n-1]</code> if it exists, else -1.', 'Hint 3: success is <code>0 &lt;= p &lt;= vis</code>; if the loop ends, return <code>"dlq:" + str(max_receive)</code>.'],
      a: `<p>Walk the receives in order. A receive succeeds only if the work finished inside the visibility window. Otherwise the message returns to the queue and the next receive starts. When the loop ends with no success, the redrive policy fires and the message lands in the DLQ after exactly <code>max_receive</code> receives.</p>`,
      code: PY(`def redrive(attempts, vis, max_receive):
    """Outcome of one SQS message: 'deleted:N' or 'dlq:max_receive'."""
    for n in range(1, max_receive + 1):
        p = attempts[n - 1] if n - 1 < len(attempts) else -1   # beyond the list the consumer crashes
        if 0 <= p <= vis:                                      # finished before the message became visible again
            return "deleted:" + str(n)
    return "dlq:" + str(max_receive)                           # received max_receive times, never deleted`, 'Python (tested)'),
      cx: `<p>O(max_receive) time, O(1) space.</p>`,
      f: ['What changes with a FIFO queue and a message group? (A failing message blocks later messages in that group until it moves to the DLQ.)', 'How would a heartbeat (ChangeMessageVisibility) change the outcome for p &gt; vis?'],
      tests: { sig: 'int[] int int -> string', fn: 'redrive', cases: [
        [[[-1, -1, 5], 30, 5], 'deleted:3'],
        [[[-1, -1, -1], 30, 3], 'dlq:3'],
        [[[40, 40, 10], 30, 3], 'deleted:3'],
        [[[], 30, 5], 'dlq:5'],
        [[[0], 30, 1], 'deleted:1'],
        [[[31, 30], 30, 2], 'deleted:2'],
        [[[-1, -1, -1, -1, 2], 10, 4], 'dlq:4'],
        [[[30], 30, 3], 'deleted:1'],
        [[[45, 45], 30, 2], 'dlq:2']
      ] }
    })]
  });

  // ───────────────────────── Topic 7: managed vs self-hosted ─────────────────────────
  topics.push({
    title: 'Managed vs Self-Hosted: Real Costs, Trade-offs and Choosing',
    analogy: `<p>Should you cook at home or order from a restaurant? Groceries and a stove look cheaper than a restaurant bill, until you count <b>your evenings</b>, the broken oven, the food poisoning risk and the dishes. But if you feed 200 people every day, you hire a cook and buy a bigger kitchen, because the restaurant markup now dwarfs your own labour. The honest question is never "which line on the bill is smaller?" but <b>"what is the total cost including people, risk and speed, for the size we really are?"</b></p>`,
    explain: `<p>🟢 <b>The decision in one table.</b> "Self-hosted" here means running the software yourself on EC2/VMs (or Kubernetes); "managed" means a cloud service operates it for you.</p>
      ${H.table(['', 'Managed (RDS, SQS, ALB, Lambda)', 'Self-hosted (PostgreSQL on EC2, RabbitMQ, nginx, your own workers)'], [
        ['Infra bill', 'higher per unit (you pay for the operation)', 'lower per unit'],
        ['People time', 'small: patching, backups, failover are included', '<b>large</b>: install, patch, tune, monitor, back up, upgrade, on-call'],
        ['Time to first working system', 'minutes', 'days'],
        ['Control', 'limited: no OS shell, approved extensions and parameters only', 'full: any extension, kernel setting, version'],
        ['Failure handling', 'built-in Multi-AZ, automated backups, tested by AWS at huge scale', 'you design, build, <b>and test</b> it'],
        ['Lock-in', 'service-specific APIs for SQS/Lambda/EventBridge; RDS PostgreSQL itself is portable', 'portable, but you carry the operations burden everywhere'],
        ['Best when', 'small/medium teams, standard needs, spiky load, regulated uptime', 'huge steady scale, special needs (extensions, hardware, latency), strong platform team']
      ])}
      <p>🟢 <b>Monthly bill, a worked comparison.</b> A 500 GB PostgreSQL production database that must survive an AZ failure (illustrative us-east-1 prices, check the pricing pages):</p>
      ${H.table(['Line', 'Managed RDS Multi-AZ', 'Self-hosted on 2 EC2 (primary + replica)'], [
        ['Instances', '2 x db.m6g.large at ~$0.18/h x 730 h = <b>$263</b>', '2 x m6g.large at ~$0.08/h x 730 h = <b>$117</b>'],
        ['Storage (500 GB gp3 at ~$0.12/GB-month, x2 copies)', '<b>$120</b>', '<b>$120</b>'],
        ['Backups / snapshots', 'included up to DB size', 'S3 or EBS snapshots ~ $25 (you script them)'],
        ['People: patching, backup checks, failover tests, on-call', '~2 h/month x $75 = <b>$150</b>', '~10 h/month x $75 = <b>$750</b>'],
        ['<b>Total</b>', '<b>~$533 / month</b>', '<b>~$1,012 / month</b>']
      ])}
      <p>The infrastructure alone says self-hosting is about $120 cheaper per month ($383 managed vs $262 self-hosted including snapshots); with people time it becomes almost <b>twice as expensive</b>. The break-even is the engineer hours: here managed wins unless self-hosting needs under about 3.6 hours a month. Add the invisible costs: a restore you never tested, an upgrade postponed for two years, a 3 a.m. page. Flip it around at scale: with 40 TB, 30 nodes and a platform team that already exists, the 40-60% managed premium is real money, and reserved capacity plus your own tuning wins.</p>
      <p>🔵 <b>Cutting the managed bill without leaving.</b> Reserved Instances / Savings Plans (1-3 years) cut RDS and EC2 by roughly 30-60%; right-size using CloudWatch (CPU and memory below 30% means a smaller class); turn off non-production databases at night (stop up to 7 days) or use Aurora Serverless v2; use gp3 not io1 unless you need the IOPS; shorten retention for dev; delete old snapshots; use Graviton (<code>m6g</code>, <code>t4g</code>) for about 20% better price per performance; avoid NAT gateways by using VPC endpoints.</p>
      <p>🔵 <b>A fast chooser for this module's services.</b></p>
      ${H.table(['Need', 'Managed choice (AWS)', 'Self-hosted alternative', 'Reasonable to self-host when'], [
        ['relational database', 'RDS / Aurora', 'PostgreSQL on EC2 or Kubernetes (Patroni, CloudNativePG)', 'special extensions, huge scale, strong DB team'],
        ['load balancing', 'ALB / NLB', 'nginx / HAProxy / Envoy on instances', 'custom L7 logic, very high steady throughput, portability'],
        ['compute scaling', 'ASG, Lambda, ECS Fargate', 'your own scheduler on VMs, Kubernetes', 'long-running heavy jobs, already running a cluster'],
        ['queue / events', 'SQS, SNS, EventBridge', 'RabbitMQ, Kafka, NATS', 'exact protocol needs, on-prem requirements, replay at huge volume (or MSK as a middle path)'],
        ['secrets', 'Secrets Manager / Parameter Store', 'HashiCorp Vault', 'multi-cloud, dynamic credentials at scale']
      ])}
      ${H.table(['Topic', 'AWS', 'Azure', 'GCP'], [
        ['Managed PostgreSQL', 'RDS / Aurora PostgreSQL', 'Flexible Server', 'Cloud SQL / AlloyDB'],
        ['Load balancing', 'ALB / NLB', 'Application Gateway / Load Balancer / Front Door', 'Cloud Load Balancing'],
        ['Scaling groups', 'ASG + launch template', 'VM Scale Sets', 'Managed Instance Groups'],
        ['Functions', 'Lambda', 'Azure Functions', 'Cloud Run functions'],
        ['Queue / topic', 'SQS / SNS', 'Service Bus / Storage Queues', 'Pub/Sub / Cloud Tasks'],
        ['Event routing', 'EventBridge', 'Event Grid', 'Eventarc'],
        ['Managed Kubernetes (for later)', 'EKS', 'AKS', 'GKE']
      ])}`,
    clues: ['"small team, no dedicated DBA, needs HA" → <b>managed</b> database (RDS Multi-AZ)', '"compare the cost of RDS and PostgreSQL on EC2" → include <b>engineer time, on-call and risk</b>, not only the instance price', '"need a custom extension or OS access" → self-hosted (or check the RDS extension list first)', '"steady, predictable, very high load for years" → reservations, Savings Plans, maybe self-hosted or containers', '"spiky, unpredictable traffic, idle most of the day" → serverless and managed scaling', '"avoid vendor lock-in" → weigh it honestly: standard engines (PostgreSQL, Kafka-compatible) are portable; proprietary event wiring costs more to move'],
    code: [PY(`# monthly_cost.py - compare two options with the same function. Standard library only; all numbers are illustrative.
HOURS = 730            # average hours in a month

def monthly_cost(nodes, inst_per_hour, gb, gb_month, ops_hours, rate):
    """Dollars per month: instances + storage + engineer time."""
    infra = nodes * (inst_per_hour * HOURS + gb * gb_month)
    people = ops_hours * rate
    return round(infra, 2), round(people, 2), round(infra + people, 2)

managed = monthly_cost(nodes=2, inst_per_hour=0.18, gb=500, gb_month=0.12, ops_hours=2, rate=75)
self_hosted = monthly_cost(nodes=2, inst_per_hour=0.08, gb=500, gb_month=0.12, ops_hours=10, rate=75)
snapshots = 25.0                                    # self-hosted: S3/EBS snapshot storage you manage yourself

print("option         infra   people    total")
print(f"managed     {managed[0]:8.2f} {managed[1]:8.2f} {managed[2]:8.2f}")
print(f"self-hosted {self_hosted[0] + snapshots:8.2f} {self_hosted[1]:8.2f} {self_hosted[2] + snapshots:8.2f}")

# Break-even: how many engineer hours per month make self-hosting cost the same as managed?
infra_gap = (managed[0]) - (self_hosted[0] + snapshots)
print(f"infra saving from self-hosting: {infra_gap:.2f} per month")
print(f"self-hosting stays cheaper only if it needs fewer than {(infra_gap + managed[1]) / 75:.1f} engineer hours a month")`, 'Python: cost comparison (runs locally)')],
    codeTitle: ['Managed vs self-hosted monthly cost model'],
    viz: [{
      title: 'Where the money goes: managed vs self-hosted PostgreSQL',
      input: 'ops=10 rate=75',
      inputLabel: 'ops = engineer hours per month for self-hosting, rate = dollars per hour (managed uses 2 hours)',
      gen: function (input) {
        var m = String(input || '').match(/^\s*ops\s*=\s*(\d+)\s+rate\s*=\s*(\d+)\s*$/i);
        if (!m) throw new Error('Use the form: ops=10 rate=75');
        var ops = +m[1], rate = +m[2];
        if (ops > 200 || rate > 500) throw new Error('Keep ops up to 200 and rate up to 500');
        var mInf = 2 * (18 * 730 + 500 * 12) / 100, sInf = 2 * (8 * 730 + 500 * 12) / 100 + 25, mP = 2 * rate, sP = ops * rate;
        var mT = mInf + mP, sT = sInf + sP, f = [];
        function d(x) { return '$' + Math.round(x).toLocaleString('en-US'); }
        f.push({ narr: 'Step 1: <b>infrastructure only</b>. Managed Multi-AZ: 2 x $0.18/h x 730 h + 500 GB x 2 x $0.12 = <b>' + d(mInf) + '</b>. Self-hosted on 2 EC2 + snapshots you script: <b>' + d(sInf) + '</b>. Self-hosting looks ' + d(mInf - sInf) + ' cheaper per month.', parts: [{ type: 'bars', label: 'infrastructure $/month', values: [Math.round(mInf), Math.round(sInf)], texts: ['managed ' + d(mInf), 'self ' + d(sInf)], hl: { 1: 'ok' } }] });
        f.push({ narr: 'Step 2: add <b>people time</b>. Managed needs about 2 h/month (review, maintenance windows) = ' + d(mP) + '. Self-hosting needs your ' + ops + ' h/month (patches, backup checks, failover tests, upgrades, on-call) x $' + rate + ' = <b>' + d(sP) + '</b>.', parts: [{ type: 'bars', label: 'people $/month', values: [Math.round(mP), Math.round(sP)], texts: ['managed ' + d(mP), 'self ' + d(sP)], hl: { 1: 'cur' } }] });
        f.push({ narr: 'Step 3: the <b>total</b>: managed ' + d(mT) + ' vs self-hosted ' + d(sT) + '. ' + (sT > mT ? 'Managed is cheaper by ' + d(sT - mT) + ' a month once people are counted.' : 'Self-hosted is cheaper by ' + d(mT - sT) + ' a month at these numbers (a heavy platform team or very low ops hours).'), parts: [{ type: 'table', label: 'monthly bill', columns: ['option', 'infra', 'people', 'total'], rows: [['managed RDS Multi-AZ', d(mInf), d(mP), d(mT)], ['self-hosted EC2', d(sInf), d(sP), d(sT)]], hl: sT > mT ? { 0: 'ok' } : { 1: 'ok' } }] });
        var be = (mInf + mP - sInf) / rate;
        f.push({ narr: 'Step 4: <b>break-even.</b> Self-hosting costs the same as managed when it needs only <b>' + be.toFixed(1) + '</b> engineer hours a month. If your honest estimate (including nights and the quarterly restore drill) is higher, managed wins; remember you also own the risk of a restore that was never tested.', parts: [{ type: 'vars', label: 'break-even', vals: { 'self-hosting hours that equal managed': be.toFixed(1), 'your estimate': ops }, hl: { 'your estimate': ops > be ? 'bad' : 'ok' } }] });
        f.push({ narr: 'Step 5: scale changes the answer. At 20x the data and nodes, the infrastructure gap grows 20x while the operations hours grow far less, so large steady workloads with a platform team often leave managed services (or buy reservations). Small and medium teams almost never gain by running their own database.', parts: [{ type: 'text', label: 'rule of thumb', html: '<b>Small team or spiky load:</b> managed. <b>Huge steady load with expert staff:</b> price it both ways, include reservations.' }] });
        return f;
      }
    }],
    examples: [
      { title: 'The monthly bill: RDS vs PostgreSQL on EC2', html: `<p>A 6-person startup compared $383 (RDS Multi-AZ infra) to $262 (EC2 plus snapshots) and chose EC2 to "save $1,500 a year". Within a year: a disk filled at night (no alert), an unreviewed backup script had silently failed for 3 weeks, and a hand-built failover took 40 minutes instead of 2. The engineers spent about 12 hours a month on database chores, about $900 in salary, per month. Moving back to RDS plus a 1-year Reserved Instance (about 35% off) cost less than the EC2 setup once time was priced in.</p>` },
      { title: 'When self-hosting wins: 30 TB and a platform team', html: `<p>A data company ran 40 PostgreSQL clusters on i3en instances with local NVMe: 60+ GB/s read throughput that RDS's EBS volumes could not match at that price, a patched extension, and an existing 5-person platform team with Patroni runbooks. Their quote for the same RDS capacity was 2.8x higher. Here the extra control and scale paid for the people. Notice what they brought: staff, runbooks, restore drills, and metrics. Self-hosting is a capability, not a coupon.</p>` },
      { title: 'Serverless vs always-on, by the numbers', html: `<p>A webhook receiver handles 2 million events a month at 150 ms, 256 MB: 2M x 0.15 s x 0.25 GB = 75,000 GB-s, inside the free tier, so the bill is about $0.20 for requests. A small always-on t4g.small instance costs about $12/month plus patching and an ALB at $18+. But the same function at 300 requests per second all day (777M requests/month) costs roughly $155 for requests and $486 for compute, where a small fleet of containers would cost around $150-250. <b>Spiky and idle-heavy: serverless. Flat and heavy: containers or instances.</b></p>` }
    ],
    deepDive: `<p>🟣 <b>Hidden costs on both sides.</b> Managed services also hide costs: cross-AZ and cross-Region data transfer, NAT gateway processing, provisioned IOPS, RDS Proxy per-vCPU hours, Multi-AZ doubling, long snapshot retention, CloudWatch Logs ingestion and Lambda invoked in a retry storm. Self-hosting hides others: your own on-call rotation burnout, security patch lag, key-person risk ("only Dana knows the failover script"), and compliance evidence you must produce yourself (backups, access logs, encryption proof).</p>
      <p>🟣 <b>TCO method.</b> Write the same table for 12 and 36 months: infra (with reservations), software licences, people hours at a loaded hourly rate, expected incident cost (probability x downtime x revenue per hour), migration or exit cost, and the opportunity cost of what the team did not build. Run it with optimistic, expected and pessimistic ops hours. If the decision flips only in the optimistic column, choose managed. Revisit when scale changes by 5x.</p>
      <p>🟣 <b>Lock-in, honestly.</b> RDS PostgreSQL is the same PostgreSQL you can run elsewhere (dump and restore, or logical replication), so exit cost is a weekend, not a rewrite. Aurora-specific features, Lambda event shapes, EventBridge rules, Step Functions and DynamoDB are where real coupling lives. A pragmatic approach: keep business logic in plain code behind a thin adapter, keep data in standard formats, and accept coupling where the managed feature gives a big win. Multi-cloud "to avoid lock-in" usually costs more than it saves for a small team.</p>
      <p>🟣 <b>Middle paths.</b> <b>Aurora Serverless v2</b> scales database capacity in small steps; <b>MSK/Managed Kafka</b>, <b>Amazon MQ</b>, <b>ElastiCache</b>, <b>OpenSearch Service</b> are managed versions of classic self-hosted tools; <b>Kubernetes operators</b> (CloudNativePG, Strimzi) automate much of self-hosting if you already run clusters (later modules). Ask what the provider operates (hardware, patches, backups, failover) versus what you still own (schema, tuning, capacity, cost, access).</p>`,
    aiEra: `<p>🤖 AI makes "just self-host it" feel cheap, because an assistant writes the Ansible, the Patroni config and the backup script in a minute. That removes the typing cost, not the <b>operating</b> cost: the 3 a.m. failover, the version upgrade, the restore drill and the audit evidence are still yours. Use AI to build the TCO spreadsheet and to stress-test it with different assumptions, but supply the real numbers (actual hourly rates, measured ops hours, a pricing-page export). When an assistant quotes prices from memory, treat them as stale: cloud prices change, so verify on the pricing page or with the AWS Pricing Calculator before showing a number to a manager.</p>`,
    problems: [P({
      t: 'Monthly cost: managed vs self-hosted PostgreSQL',
      l: 'Medium', tags: ['cost', 'RDS', 'TCO'], co: ['Amazon', 'Atlassian'],
      lang: 'python',
      s: `<p>Each option is described by a list <code>[nodes, inst_cents_per_hour, gb, gb_cents_per_month, ops_hours, rate_cents_per_hour]</code>. Its monthly cost in cents is <code>nodes x (inst_cents_per_hour x 730 + gb x gb_cents_per_month) + ops_hours x rate_cents_per_hour</code>. Write <code>cost_compare(managed, self_hosted)</code> returning <code>[managed_cost, self_cost, self_cost - managed_cost]</code>. A positive last number means managed is cheaper. Integers only (cents), so no rounding errors.</p>`,
      ex: `<p>Managed <code>[2,18,500,12,2,7500]</code>: 2 x (18 x 730 + 500 x 12) = 2 x 19,140 = 38,280, plus 2 x 7,500 = 15,000, total <b>53,280</b> cents ($532.80).<br>Self-hosted <code>[2,8,500,12,10,7500]</code>: 2 x (5,840 + 6,000) = 23,680, plus 75,000 = <b>98,680</b>.<br>Answer <span class="c-g">[53280, 98680, 45400]</span>: managed saves $454 a month.</p>`,
      bw: `<p>Comparing only the instance price. That reports self-hosting as 56% cheaper on instances and misses people time, which here is 76% of the self-hosted total.</p>`,
      q: ['Self-hosting saves $120/month on infrastructure but needs 8 extra engineer hours at $75/hour. What is the monthly result?', ['Self-hosting costs $480 more', 'Self-hosting saves $120', 'Self-hosting saves $480', 'They are equal'], 0, '8 x $75 = $600 of extra people cost against $120 saved: net $480 more for self-hosting. Always price the hours.'],
      h: ['Hint 1: write one helper that turns an option into a single cost number.', 'Hint 2: all values are integers, so use 730 hours and keep cents.', 'Hint 3: return the two costs and the difference self minus managed.'],
      a: `<p>One helper computes <code>nodes x (hourly x 730 + gb x gb_price) + hours x rate</code>; call it for both lists and subtract. The model is deliberately simple: real bills add transfer, IOPS, snapshots and reservations, but the same function with more fields extends naturally.</p>`,
      code: PY(`def cost_compare(managed, self_hosted):
    """Each option: [nodes, inst_cents_per_hour, gb, gb_cents_per_month, ops_hours, rate_cents_per_hour]."""
    def month(opt):
        nodes, inst, gb, gb_price, ops_hours, rate = opt
        return nodes * (inst * 730 + gb * gb_price) + ops_hours * rate
    m, s = month(managed), month(self_hosted)
    return [m, s, s - m]                          # positive last value = managed is cheaper`, 'Python (tested)'),
      cx: `<p>O(1) time and space.</p>`,
      f: ['What would you add for reserved instances (a discount percentage on the instance part only)?', 'How would you present uncertainty in ops_hours to a manager? (Three scenarios.)'],
      tests: { sig: 'int[] int[] -> int[]', fn: 'cost_compare', cases: [
        [[[2, 18, 500, 12, 2, 7500], [2, 8, 500, 12, 10, 7500]], [53280, 98680, 45400]],
        [[[1, 18, 100, 12, 0, 7500], [1, 8, 100, 12, 4, 7500]], [14340, 37040, 22700]],
        [[[2, 50, 1000, 12, 0, 5000], [2, 10, 1000, 12, 2, 5000]], [97000, 48600, -48400]],
        [[[0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0]], [0, 0, 0]],
        [[[3, 20, 200, 10, 1, 6000], [3, 20, 200, 10, 1, 6000]], [55800, 55800, 0]],
        [[[1, 1, 1, 1, 1, 1], [1, 2, 1, 1, 1, 1]], [732, 1462, 730]],
        [[[2, 18, 500, 12, 2, 7500], [2, 8, 500, 12, 0, 7500]], [53280, 23680, -29600]],
        [[[4, 30, 2000, 10, 3, 8000], [4, 12, 2000, 10, 20, 8000]], [191600, 275040, 83440]]
      ] }
    })]
  });

  // ───────────────────────── Practice: Easy ─────────────────────────
  practice.push(P({
    t: 'Final health state of a target', l: 'Easy', tags: ['ALB', 'health checks'], co: ['Amazon'], lang: 'python',
    s: `<p>A target starts <b>unhealthy</b>. Write <code>health_state(probes, healthy, unhealthy)</code> where <code>probes</code> is a list of 1 (pass) and 0 (fail). The target becomes healthy after <code>healthy</code> passes in a row, and unhealthy again after <code>unhealthy</code> fails in a row. Any pass resets the fail streak and any fail resets the pass streak. Return <code>"healthy"</code> or <code>"unhealthy"</code> after the last probe.</p>`,
    ex: `<p><code>([1,1,1,0,1,0], 3, 2)</code> &rarr; <span class="c-g">"healthy"</span>: three passes make it healthy, then fail, pass, fail never gives two fails in a row.<br><code>([1,1,0,1], 3, 2)</code> &rarr; <span class="c-r">"unhealthy"</span>: the fail reset the pass streak, so it never reached 3.</p>`,
    bw: `<p>Counting the total number of passes and fails ignores order and resets; "3 passes then 2 fails spread out" would wrongly flip the state.</p>`,
    q: ['Interval 30 s, unhealthy threshold 2. How long can a dead target keep receiving traffic?', ['Up to about 60 s', 'Zero seconds', 'Exactly 30 s', 'Until the next deployment'], 0, 'It needs 2 failed checks in a row, 30 s apart, so users can hit it for about a minute. Shorter intervals shrink the window.'],
    h: ['Hint 1: keep two counters, passes in a row and fails in a row.', 'Hint 2: a pass sets fails to 0, a fail sets passes to 0.', 'Hint 3: flip the state only when a counter reaches its threshold.'],
    a: `<p>Walk the probes once, updating the two streak counters and the state when a threshold is reached.</p>`,
    code: PY(`def health_state(probes, healthy, unhealthy):
    state = "unhealthy"
    passes = fails = 0
    for p in probes:
        if p == 1:
            passes += 1
            fails = 0
            if state == "unhealthy" and passes >= healthy:
                state = "healthy"
        else:
            fails += 1
            passes = 0
            if state == "healthy" and fails >= unhealthy:
                state = "unhealthy"
    return state`, 'Python (tested)'),
    cx: `<p>O(n) time, O(1) space.</p>`, f: ['How would you also return the number of probes before the first healthy state?'],
    tests: { sig: 'int[] int int -> string', fn: 'health_state', cases: [
      [[[1, 1, 1], 3, 2], 'healthy'], [[[1, 1, 0, 1], 3, 2], 'unhealthy'], [[[1, 1, 1, 0, 0], 3, 2], 'unhealthy'],
      [[[1, 1, 1, 0, 1, 0], 3, 2], 'healthy'], [[[], 3, 2], 'unhealthy'], [[[1, 1, 1, 1, 1], 5, 2], 'healthy'],
      [[[0, 0, 0], 2, 2], 'unhealthy'], [[[1, 1, 0, 0, 1, 1], 2, 2], 'healthy']
    ] }
  }));
  practice.push(P({
    t: 'Create an SQS queue with a DLQ and an alarm', l: 'Easy', tags: ['SQS', 'DLQ', 'CloudWatch'], co: ['Amazon'],
    s: `<p>Write the AWS CLI commands (bash) to create <code>jobs-dlq</code> (14-day retention) and <code>jobs-queue</code> (visibility timeout 120 s, long polling 20 s, moved to the DLQ after 4 receives), then a CloudWatch alarm that fires when the DLQ has any visible message, sending to the SNS topic <code>ops-alerts</code>. Use account id 123456789012 and read the DLQ ARN from the API instead of typing it.</p>`,
    ex: `<p>After a failing message is received 4 times, <code>ApproximateNumberOfMessagesVisible</code> on <code>jobs-dlq</code> becomes 1 and the alarm goes to <span class="c-r">ALARM</span>, notifying <code>ops-alerts</code>.</p>`,
    bw: `<p>A single queue with no DLQ: a bad message is retried forever, nobody is told, and the real work behind it starves.</p>`,
    q: ['Why create the DLQ first?', ['The main queue\'s redrive policy needs the DLQ ARN', 'SQS requires queues to be created alphabetically', 'DLQs are cheaper', 'The alarm needs it'], 0, 'RedrivePolicy contains the DLQ ARN, so the DLQ must exist before the source queue references it.'],
    h: ['Hint 1: <code>create-queue</code> twice; ask <code>get-queue-attributes --attribute-names QueueArn</code> for the DLQ ARN.', 'Hint 2: the RedrivePolicy is a JSON <b>string</b> inside the attributes JSON.', 'Hint 3: alarm on namespace AWS/SQS, metric ApproximateNumberOfMessagesVisible, dimension QueueName=jobs-dlq, threshold 0.'],
    a: `<p>Create the DLQ, read its ARN, build an attributes file that embeds the redrive policy as an escaped JSON string, create the main queue from that file, and add the alarm. Queues cost nothing while idle, but the cleanup is still listed so nothing is left behind.</p>`,
    code: SH(R`#!/usr/bin/env bash
set -euo pipefail
aws sqs create-queue --queue-name jobs-dlq --attributes MessageRetentionPeriod=1209600
DLQ_URL=$(aws sqs get-queue-url --queue-name jobs-dlq --query QueueUrl --output text)
DLQ_ARN=$(aws sqs get-queue-attributes --queue-url "$DLQ_URL" --attribute-names QueueArn --query Attributes.QueueArn --output text)

# The redrive policy is a JSON string inside JSON, so build it with python to get the escaping right
python3 - "$DLQ_ARN" > jobs-attrs.json <<'PY'
import json, sys
print(json.dumps({
    "VisibilityTimeout": "120",
    "ReceiveMessageWaitTimeSeconds": "20",
    "RedrivePolicy": json.dumps({"deadLetterTargetArn": sys.argv[1], "maxReceiveCount": "4"}),
}))
PY
aws sqs create-queue --queue-name jobs-queue --attributes file://jobs-attrs.json

aws cloudwatch put-metric-alarm --alarm-name jobs-dlq-not-empty \
  --namespace AWS/SQS --metric-name ApproximateNumberOfMessagesVisible \
  --dimensions Name=QueueName,Value=jobs-dlq --statistic Maximum --period 60 \
  --evaluation-periods 1 --threshold 0 --comparison-operator GreaterThanThreshold \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:ops-alerts

# Cleanup
# aws sqs delete-queue --queue-url "$DLQ_URL"
# aws sqs delete-queue --queue-url "$(aws sqs get-queue-url --queue-name jobs-queue --query QueueUrl --output text)"
# aws cloudwatch delete-alarms --alarm-names jobs-dlq-not-empty`, 'Queue + DLQ + alarm'),
    cx: `<p>Constant number of API calls.</p>`, f: ['What would change for a FIFO queue? (names end in .fifo, DLQ must be FIFO too)']
  }));
  practice.push(P({
    t: 'Lambda concurrency from traffic (Little\'s law)', l: 'Easy', tags: ['Lambda', 'concurrency'], co: ['Amazon'], lang: 'python',
    s: `<p>Write <code>lambda_concurrency(rps, avg_ms)</code>: the number of concurrent executions needed for <code>rps</code> requests per second that each take <code>avg_ms</code> milliseconds. Round up to a whole number and use integer arithmetic.</p>`,
    ex: `<p><code>(100, 200)</code> &rarr; <span class="c-g">20</span> (100 x 0.2 s). <code>(7, 150)</code> &rarr; <span class="c-y">2</span> (1.05 rounds up).</p>`,
    bw: `<p>Using the request rate as the concurrency ("100 requests/s means 100 copies") over-provisions by 5x for 200 ms functions, and under-provisions by 10x for 10 s functions.</p>`,
    q: ['A dependency slows the function from 200 ms to 2 s at 100 rps. Needed concurrency goes from 20 to?', ['200', '40', '100', '20'], 0, '100 x 2 = 200. A slow downstream multiplies concurrency and can hit the account limit.'],
    h: ['Hint 1: concurrency = rate x duration in seconds.', 'Hint 2: duration in seconds is avg_ms / 1000.', 'Hint 3: integer ceiling: <code>(a + 999) // 1000</code> for a = rps x avg_ms.'],
    a: `<p>Multiply, then ceiling-divide by 1000 with integers.</p>`,
    code: PY(`def lambda_concurrency(rps, avg_ms):
    return (rps * avg_ms + 999) // 1000      # ceil(rps * avg_ms / 1000) without floats`, 'Python (tested)'),
    cx: `<p>O(1) time and O(1) space: one multiplication and one division.</p>`, f: ['How do you add a safety margin for bursts? (Multiply by 1.2 to 2 and compare with reserved concurrency.)'],
    tests: { sig: 'int int -> int', fn: 'lambda_concurrency', cases: [[[100, 200], 20], [[1, 1], 1], [[0, 500], 0], [[1000, 200], 200], [[7, 150], 2], [[500, 2000], 1000], [[3, 333], 1], [[10, 101], 2]] }
  }));

  // ───────────────────────── Practice: Medium ─────────────────────────
  practice.push(P({
    t: 'Weighted target-group split', l: 'Medium', tags: ['ALB', 'canary', 'weighted routing'], co: ['Google', 'Amazon'], lang: 'python',
    s: `<p>An ALB forward action splits traffic by weights. Write <code>weighted_split(weights, n)</code>: how many of <code>n</code> requests each target group should receive so the counts sum to exactly <code>n</code>. Give each group <code>n x w // total</code> first, then hand the leftover requests one each to the groups with the <b>largest remainders</b> (ties go to the lower index). If the total weight is 0 return all zeros.</p>`,
    ex: `<p><code>([70,20,10], 15)</code>: base 10, 3, 1 = 14, remainders 50, 0, 50, one left over goes to index 0 &rarr; <span class="c-g">[11,3,1]</span>.</p>`,
    bw: `<p>Rounding each share separately (<code>round(10.5)</code>, <code>round(3.0)</code>, <code>round(1.5)</code>) can sum to 15, 16 or 14 depending on the language, so the total drifts.</p>`,
    q: ['In a 90/10 canary, how do you roll back fastest?', ['Set the new group\'s weight to 0', 'Redeploy the old version', 'Delete the load balancer', 'Scale the ASG to 0'], 0, 'Weights are the only thing that changes, so the rollback is one modify-listener call.'],
    h: ['Hint 1: compute base shares with integer division.', 'Hint 2: leftover = n - sum(base); the remainders are <code>n*w % total</code>.', 'Hint 3: sort indexes by (-remainder, index) and add 1 to the first leftover of them.'],
    a: `<p>This is the largest remainder method. Integer maths avoids float drift; sorting by remainder then index makes ties deterministic.</p>`,
    code: PY(`def weighted_split(weights, n):
    total = sum(weights)
    if total == 0:
        return [0] * len(weights)
    out = [n * w // total for w in weights]            # floor shares
    rems = [n * w % total for w in weights]            # what each share lost to flooring
    left = n - sum(out)
    order = sorted(range(len(weights)), key=lambda i: (-rems[i], i))
    for i in order[:left]:
        out[i] += 1
    return out`, 'Python (tested)'),
    cx: `<p>O(k log k) for k target groups.</p>`, f: ['Real ALB routing is random per request. How far from the weights is a 1,000-request sample likely to be? (A few percent.)'],
    tests: { sig: 'int[] int -> int[]', fn: 'weighted_split', cases: [
      [[[90, 10], 100], [90, 10]], [[[1, 1, 1], 10], [4, 3, 3]], [[[70, 20, 10], 15], [11, 3, 1]], [[[0, 5], 7], [0, 7]],
      [[[50, 50], 0], [0, 0]], [[[3, 2], 5], [3, 2]], [[[1, 2, 3], 7], [1, 2, 4]], [[[95, 5], 10], [10, 0]], [[[1, 1], 3], [2, 1]], [[[0, 0], 5], [0, 0]]
    ] }
  }));
  practice.push(P({
    t: 'Read-replica lag from write bursts', l: 'Medium', tags: ['RDS', 'read replica', 'replication lag'], co: ['Meta', 'Amazon'], lang: 'python',
    s: `<p>The primary produces <code>writes[t]</code> MB of changes in second <code>t</code>. The replica applies up to <code>apply_rate</code> MB per second. Any change not applied waits in a backlog: <code>backlog = max(0, backlog + writes[t] - apply_rate)</code> after each second (start at 0). Write <code>replica_lag(writes, apply_rate)</code> returning <code>[max_backlog_mb, max_lag_seconds]</code> where lag seconds is <code>ceil(max_backlog / apply_rate)</code>. <code>apply_rate</code> is at least 1.</p>`,
    ex: `<p><code>([30,30,0,0], 10)</code>: backlog 20, 40, 30, 20. Max 40 MB, 40/10 = <span class="c-r">[40, 4]</span>: a reader on the replica sees data up to 4 seconds old at the worst moment.</p>`,
    bw: `<p>Comparing the average write rate with the apply rate says "no lag" for <code>[100,0,0,0]</code> at 25 MB/s, yet the replica is 3 seconds behind right after the burst.</p>`,
    q: ['Right after "place order", the order is missing on the replica page. Best fix?', ['Read that user\'s next page from the primary for a few seconds', 'Promote the replica', 'Disable Multi-AZ', 'Retry the read forever'], 0, 'Async replicas can lag. Read-your-own-write needs the primary (or a wait until the replica has caught up).'],
    h: ['Hint 1: simulate the replica second by second with a running backlog.', 'Hint 2: track the largest backlog seen so far at every step.', 'Hint 3: ceiling division with integers: <code>(b + r - 1) // r</code>.'],
    a: `<p>Update the backlog each second with the clamp at zero, record the maximum, and convert it to seconds of lag at the end.</p>`,
    code: PY(`def replica_lag(writes, apply_rate):
    backlog = peak = 0
    for w in writes:
        backlog = max(0, backlog + w - apply_rate)    # replica applies up to apply_rate MB each second
        peak = max(peak, backlog)
    return [peak, (peak + apply_rate - 1) // apply_rate]`, 'Python (tested)'),
    cx: `<p>O(n) time, O(1) space.</p>`, f: ['Which CloudWatch metric would you alarm on? (ReplicaLag, in seconds.)'],
    tests: { sig: 'int[] int -> int[]', fn: 'replica_lag', cases: [
      [[[10, 10, 10], 5], [15, 3]], [[[5, 5], 10], [0, 0]], [[[20, 0, 0, 0, 0], 5], [15, 3]], [[[30, 30, 0, 0], 10], [40, 4]],
      [[[], 5], [0, 0]], [[[7], 3], [4, 2]], [[[12, 0, 12, 0], 4], [12, 3]], [[[100, 100, 100, 0, 0, 0], 50], [150, 3]], [[[1, 1, 1], 1], [0, 0]]
    ] }
  }));
  practice.push(P({
    t: 'Runbook: restore one dropped table with PITR', l: 'Medium', tags: ['RDS', 'PITR', 'runbook'], co: ['Amazon', 'Stripe'],
    s: `<p>At 14:52 UTC on 2026-10-19 someone reports that table <code>payments</code> in database <code>app</code> of <code>demo-pg</code> was dropped at 14:32. Write a bash runbook that restores to 14:30 into a new instance, waits for it, copies only that table back to production, and deletes the restored copy. The database password must come from Secrets Manager (the instance uses a managed master password); never type it.</p>`,
    ex: `<p>Result: <code>payments</code> exists again in production with its rows as of 14:30; other tables keep their newer rows. The restored instance <code>demo-pg-fix</code> is deleted, so billing stops.</p>`,
    bw: `<p>Restoring the snapshot over production: it is impossible in place (restores create a new instance), and repointing the app to the old data would discard 20 minutes of valid orders.</p>`,
    q: ['Why restore into a new instance and copy one table back?', ['It keeps the 20 minutes of good data in other tables', 'It is faster than any other way', 'RDS forbids restoring tables', 'It avoids paying for the restore'], 0, 'PITR rebuilds the entire database as of the target time. Copying back only the damaged table keeps newer valid changes elsewhere.'],
    h: ['Hint 1: <code>restore-db-instance-to-point-in-time</code> with <code>--restore-time</code>, then <code>wait db-instance-available</code>.', 'Hint 2: read the password with <code>secretsmanager get-secret-value</code> into <code>PGPASSWORD</code> and use <code>pg_dump -t payments</code> piped to <code>psql</code>.', 'Hint 3: always delete the copy at the end (hourly billing); keep a manual snapshot first if unsure.'],
    a: `<p>Take a safety snapshot, restore to a new instance with the same network settings, wait for it, dump just the one table from the copy and load it into production, verify a row count, then delete the copy. Secrets are fetched at run time and only live in an environment variable of this shell.</p>`,
    code: SH(R`#!/usr/bin/env bash
# Runbook: bring back table payments. COST: the restored instance bills hourly until step 6.
set -euo pipefail
SRC=demo-pg
COPY=demo-pg-fix
WHEN=2026-10-19T14:30:00Z

# 0) safety snapshot of production first
aws rds create-db-snapshot --db-instance-identifier "$SRC" --db-snapshot-identifier "$SRC-before-fix"

# 1) restore to a NEW instance at the chosen moment
aws rds restore-db-instance-to-point-in-time --source-db-instance-identifier "$SRC" \
  --target-db-instance-identifier "$COPY" --restore-time "$WHEN" \
  --db-instance-class db.t4g.micro --no-publicly-accessible
aws rds wait db-instance-available --db-instance-identifier "$COPY"

# 2) the password comes from Secrets Manager (same master user as the source), never typed
SECRET_ARN=$(aws rds describe-db-instances --db-instance-identifier "$SRC" \
  --query 'DBInstances[0].MasterUserSecret.SecretArn' --output text)
PGPASSWORD=$(aws secretsmanager get-secret-value --secret-id "$SECRET_ARN" --query SecretString --output text \
  | python3 -c 'import json,sys; print(json.load(sys.stdin)["password"])')
export PGPASSWORD
host() { aws rds describe-db-instances --db-instance-identifier "$1" --query 'DBInstances[0].Endpoint.Address' --output text; }

# 3) check the table exists in the copy
psql "host=$(host "$COPY") dbname=app user=appadmin sslmode=require" -c 'SELECT count(*) FROM payments;'

# 4) copy only that table into production (run from a host inside the VPC)
pg_dump "host=$(host "$COPY") dbname=app user=appadmin sslmode=require" -t payments \
  | psql "host=$(host "$SRC") dbname=app user=appadmin sslmode=require"

# 5) verify, then 6) remove the copy and the temporary password variable
psql "host=$(host "$SRC") dbname=app user=appadmin sslmode=require" -c 'SELECT count(*) FROM payments;'
aws rds delete-db-instance --db-instance-identifier "$COPY" --skip-final-snapshot --delete-automated-backups
unset PGPASSWORD`, 'PITR single-table recovery'),
    cx: `<p>Time is dominated by the restore (minutes to hours with size).</p>`, f: ['How do you shorten RTO next time? (Drills, smaller databases per service, Multi-AZ cluster readers, or logical per-table backups for critical tables.)']
  }));
  practice.push(P({
    t: 'Canary release with weighted listener actions', l: 'Medium', tags: ['ALB', 'listener rules', 'canary'], co: ['Netflix', 'Amazon'],
    s: `<p>Write a bash script <code>shift.sh PERCENT</code> that sets an ALB listener's default action to forward <code>100-PERCENT</code> to <code>blue-tg</code> and <code>PERCENT</code> to <code>green-tg</code>, with target-group stickiness for 10 minutes so a user does not flip between versions. Reject values outside 0-100. Show how you would run 5, 25, 50, 100 and how to roll back.</p>`,
    ex: `<p><code>./shift.sh 25</code> &rarr; weights blue 75, green 25. <code>./shift.sh 0</code> &rarr; all traffic back to blue: the rollback.</p>`,
    bw: `<p>Editing DNS records or redeploying for each step: slow, cached by clients, and no instant rollback.</p>`,
    q: ['What is the safest default behaviour when PERCENT is invalid?', ['Exit with an error before calling AWS', 'Treat it as 100', 'Treat it as 0 silently', 'Call AWS and see what happens'], 0, 'A script that changes production traffic must validate input first. A typo like 250 should never reach the API.'],
    h: ['Hint 1: the action JSON has <code>ForwardConfig</code> with <code>TargetGroups</code> (each with <code>Weight</code>) and <code>TargetGroupStickinessConfig</code>.', 'Hint 2: build the JSON with printf, validating the argument with a bash pattern.', 'Hint 3: <code>aws elbv2 modify-listener --default-actions</code> replaces the action list.'],
    a: `<p>Validate the number, compute the two weights, build the JSON, and apply it with one call. Because only weights change, 0 is a one-command rollback. Watch the 5xx rate and p95 latency of the green group between steps.</p>`,
    code: SH(R`#!/usr/bin/env bash
# shift.sh PERCENT - send PERCENT of traffic to green-tg. 0 = rollback, 100 = finished.
set -euo pipefail
PCT="$1"
case "$PCT" in ''|*[!0-9]*) echo "PERCENT must be a whole number 0-100" >&2; exit 1;; esac
[ "$PCT" -le 100 ] || { echo "PERCENT must be 0-100" >&2; exit 1; }
BLUE=$((100 - PCT))

LISTENER=arn:aws:elasticloadbalancing:us-east-1:123456789012:listener/app/demo-alb/0123456789abcdef/0123456789abcdef
BLUE_TG=arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/blue-tg/0123456789abcdef
GREEN_TG=arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/green-tg/0123456789abcdef

ACTIONS=$(printf '[{"Type":"forward","ForwardConfig":{"TargetGroups":[{"TargetGroupArn":"%s","Weight":%d},{"TargetGroupArn":"%s","Weight":%d}],"TargetGroupStickinessConfig":{"Enabled":true,"DurationSeconds":600}}}]' \
  "$BLUE_TG" "$BLUE" "$GREEN_TG" "$PCT")

aws elbv2 modify-listener --listener-arn "$LISTENER" --default-actions "$ACTIONS" >/dev/null
echo "blue=$BLUE green=$PCT"
# Usage:  ./shift.sh 5 ; ./shift.sh 25 ; ./shift.sh 50 ; ./shift.sh 100      Rollback: ./shift.sh 0`, 'shift.sh'),
    cx: `<p>One API call per step.</p>`, f: ['Where could you automate the promote/rollback decision? (CloudWatch alarms plus CodeDeploy or a pipeline stage.)']
  }));
  practice.push(P({
    t: 'SNS fan-out with filter policies to three queues', l: 'Medium', tags: ['SNS', 'SQS', 'fan-out', 'filter policy'], co: ['Amazon', 'Airbnb'],
    s: `<p>Topic <code>order-events</code> receives messages with attribute <code>event</code> = <code>OrderPlaced</code> or <code>OrderCancelled</code>. Subscribe three queues: <code>inventory-queue</code> (both events), <code>email-queue</code> (only OrderPlaced), <code>refund-queue</code> (only OrderCancelled). Use raw message delivery. Show the queue policy that lets only this topic send to <code>email-queue</code>, and one publish command.</p>`,
    ex: `<p>Publishing <code>event=OrderCancelled</code> lands in inventory-queue and refund-queue, not in email-queue.</p>`,
    bw: `<p>Three producers each calling three queues: tight coupling, partial failures, and a code change every time a consumer is added.</p>`,
    q: ['Why does the queue need a policy?', ['SQS refuses messages from SNS unless the queue\'s resource policy allows that topic', 'SNS cannot send to SQS', 'To encrypt the message', 'To set the visibility timeout'], 0, 'SQS queues are private by default. The queue policy grants sns.amazonaws.com SendMessage, restricted with a condition on the topic ARN.'],
    h: ['Hint 1: <code>sns subscribe --protocol sqs</code> with <code>--attributes</code> containing RawMessageDelivery and FilterPolicy.', 'Hint 2: the policy needs <code>Condition: ArnEquals aws:SourceArn</code> set to the topic ARN.', 'Hint 3: publish with <code>--message-attributes</code> of DataType String.'],
    a: `<p>Create the topic, subscribe each queue with its filter policy, and attach a queue policy per queue (shown for email-queue). Filter policies drop non-matching messages before delivery, so queues are not filled with messages they would ignore.</p>`,
    code: SH(R`#!/usr/bin/env bash
set -euo pipefail
TOPIC=arn:aws:sns:us-east-1:123456789012:order-events
sub() {  # sub <queue-name> <filter-json>
  local arn=arn:aws:sqs:us-east-1:123456789012:$1
  local attrs
  attrs=$(python3 -c 'import json,sys; print(json.dumps({"RawMessageDelivery": "true", "FilterPolicy": sys.argv[1]}))' "$2")
  aws sns subscribe --topic-arn "$TOPIC" --protocol sqs --notification-endpoint "$arn" --attributes "$attrs"
}
sub inventory-queue '{"event":["OrderPlaced","OrderCancelled"]}'
sub email-queue     '{"event":["OrderPlaced"]}'
sub refund-queue    '{"event":["OrderCancelled"]}'

# Queue policy: only THIS topic may send to email-queue (repeat for the others)
cat > email-policy.json <<'JSON'
{ "Version": "2012-10-17", "Statement": [ { "Effect": "Allow", "Principal": { "Service": "sns.amazonaws.com" }, "Action": "sqs:SendMessage",
  "Resource": "arn:aws:sqs:us-east-1:123456789012:email-queue",
  "Condition": { "ArnEquals": { "aws:SourceArn": "arn:aws:sns:us-east-1:123456789012:order-events" } } } ] }
JSON
python3 -c 'import json; print(json.dumps({"Policy": open("email-policy.json").read()}))' > email-attrs.json
aws sqs set-queue-attributes --queue-url https://sqs.us-east-1.amazonaws.com/123456789012/email-queue --attributes file://email-attrs.json

aws sns publish --topic-arn "$TOPIC" --message '{"order_id":42}' \
  --message-attributes '{"event":{"DataType":"String","StringValue":"OrderCancelled"}}'`, 'Fan-out with filters'),
    cx: `<p>One subscription call per consumer; publishing cost is independent of how many consumers exist.</p>`, f: ['How do you test that email-queue got nothing? (get-queue-attributes ApproximateNumberOfMessages.)']
  }));
  practice.push(P({
    t: 'Connection budget: Lambda concurrency vs PostgreSQL max_connections', l: 'Medium', tags: ['RDS', 'Lambda', 'RDS Proxy', 'connections'], co: ['Amazon'], lang: 'python',
    s: `<p>An RDS PostgreSQL instance allows <code>max_connections = min(mem_gib x 1073741824 // 9531392, 5000)</code> (this is the shape of the RDS default formula, using instance memory in bytes). Write <code>connection_budget(mem_gib, reserved, lambda_concurrency, conns_per_env)</code> returning the connections left: <code>max_connections - reserved - lambda_concurrency x conns_per_env</code>. A negative number means the database will refuse connections.</p>`,
    ex: `<p><code>(2, 5, 100, 1)</code>: max_connections 225, minus 5 reserved and 100 Lambda connections = <span class="c-g">120</span> left. <code>(1, 5, 200, 1)</code> = 112 - 5 - 200 = <span class="c-r">-93</span>: use RDS Proxy or cap concurrency.</p>`,
    bw: `<p>"The database is big enough" without the formula: a micro instance with 1 GiB only allows about 112 connections, which 112 concurrent Lambdas use up alone.</p>`,
    q: ['What does RDS Proxy change?', ['Many short-lived clients share a small pool of real connections', 'It makes queries faster', 'It replaces Multi-AZ', 'It removes the need for passwords'], 0, 'The proxy multiplexes client connections onto a few database connections, protecting the database from connection storms.'],
    h: ['Hint 1: compute max_connections with integer division and cap at 5000.', 'Hint 2: each Lambda environment may hold conns_per_env connections while warm.', 'Hint 3: return the plain difference, negative included.'],
    a: `<p>Compute the cap, then subtract reserved connections (admin, monitoring) and the worst-case Lambda usage.</p>`,
    code: PY(`def connection_budget(mem_gib, reserved, lambda_concurrency, conns_per_env):
    max_conn = min(mem_gib * 1073741824 // 9531392, 5000)    # RDS-style default formula, capped at 5000
    return max_conn - reserved - lambda_concurrency * conns_per_env`, 'Python (tested)'),
    cx: `<p>O(1) time and O(1) space: a few integer operations.</p>`, f: ['Which Lambda setting caps the usage without RDS Proxy? (Reserved concurrency or MaximumConcurrency on the SQS mapping.)'],
    tests: { sig: 'int int int int -> int', fn: 'connection_budget', cases: [
      [[2, 5, 100, 1], 120], [[1, 5, 200, 1], -93], [[8, 10, 50, 2], 791], [[64, 20, 1000, 3], 1980], [[2, 0, 0, 1], 225],
      [[1, 112, 0, 5], 0], [[4, 5, 10, 1], 435], [[0, 0, 0, 1], 0], [[8, 10, 451, 2], -11]
    ] }
  }));

  // ───────────────────────── Practice: Hard ─────────────────────────
  practice.push(P({
    t: 'Queue workers needed to drain a backlog', l: 'Hard', tags: ['SQS', 'ASG', 'scaling on queue depth'], co: ['Amazon', 'Uber'], lang: 'python',
    s: `<p>A worker fleet reads an SQS queue. Each worker clears <code>rate</code> messages per second. There are <code>backlog</code> messages waiting now and <code>arrival</code> new messages arrive each second. You want the queue empty after <code>drain_s</code> seconds. Write <code>workers_needed(backlog, arrival, rate, drain_s, min_w, max_w)</code>: the smallest worker count that drains everything in time, i.e. <code>ceil((backlog + arrival x drain_s) / (rate x drain_s))</code>, kept between <code>min_w</code> and <code>max_w</code>. Use integers only.</p>`,
    ex: `<p><code>(6000, 10, 5, 600, 1, 50)</code>: total work 6000 + 10 x 600 = 12,000 messages; one worker does 5 x 600 = 3,000 in the window &rarr; <span class="c-g">4</span>. With <code>(500,20,4,120,1,6)</code> the formula says 7 but the cap makes it <span class="c-y">6</span> (and the queue will not fully drain).</p>`,
    bw: `<p>Sizing on backlog alone ignores the messages that keep arriving while you drain: with arrival close to the fleet's rate, the backlog never shrinks.</p>`,
    q: ['Which metric is best for scaling a queue-worker ASG?', ['Backlog per instance (visible messages / running workers)', 'Instance CPU only', 'Number of ALB requests', 'Free disk space'], 0, 'Queue depth divided by the workers shows how long the backlog would take to clear. CPU can be low while the queue grows (workers blocked on I/O).'],
    h: ['Hint 1: total messages to handle in the window = backlog + arrival x drain_s.', 'Hint 2: one worker handles rate x drain_s messages in the window.', 'Hint 3: integer ceiling, then clamp to [min_w, max_w].'],
    a: `<p>Divide the work by one worker's capacity over the window, rounding up, and clamp. In production publish backlog per instance as a custom metric and let target tracking do this continuously; remember the boot and warm-up delay from topic 4.</p>`,
    code: PY(`def workers_needed(backlog, arrival, rate, drain_s, min_w, max_w):
    work = backlog + arrival * drain_s              # everything that must be handled inside the window
    per_worker = rate * drain_s                     # what one worker can do inside the window
    need = (work + per_worker - 1) // per_worker    # ceiling division
    return max(min_w, min(max_w, need))`, 'Python (tested)'),
    cx: `<p>O(1) time and O(1) space: a few integer operations.</p>`, f: ['What if workers take 60 s to boot? (Add boot time to the drain window or use a warm pool.)'],
    tests: { sig: 'int int int int int int -> int', fn: 'workers_needed', cases: [
      [[6000, 10, 5, 600, 1, 50], 4], [[0, 10, 5, 60, 1, 10], 2], [[1000, 0, 2, 100, 1, 3], 3], [[0, 0, 5, 60, 2, 10], 2],
      [[100, 3, 5, 10, 1, 20], 3], [[50000, 100, 10, 300, 5, 100], 27], [[1, 0, 1, 1, 1, 5], 1], [[7, 1, 2, 3, 1, 10], 2], [[500, 20, 4, 120, 1, 6], 6]
    ] }
  }));
  practice.push(P({
    t: 'How many instances survive the loss of an AZ?', l: 'Hard', tags: ['ASG', 'availability', 'capacity planning'], co: ['Amazon', 'Microsoft'], lang: 'python',
    s: `<p>An ASG spreads <code>n</code> instances evenly over <code>azs</code> Availability Zones (the fullest AZ holds <code>ceil(n / azs)</code> instances). If that fullest AZ fails, the rest must still carry the whole <code>load</code>. Each instance handles <code>per_instance</code> units. Write <code>min_instances(load, per_instance, azs)</code>: the smallest <code>n</code> (starting from 1) such that <code>(n - ceil(n / azs)) x per_instance &gt;= load</code>. <code>load</code> is at least 1 and <code>azs</code> is at least 2.</p>`,
    ex: `<p><code>(100, 50, 2)</code>: n = 4 (2 + 2): lose one AZ, 2 x 50 = 100 &ge; 100 &rarr; <span class="c-g">4</span>. With 3 AZs <code>(100,50,3)</code> only <span class="c-g">3</span> instances are needed: losing 1 leaves 2 x 50. More AZs means a smaller N+1 premium.</p>`,
    bw: `<p>"Load / per_instance, plus one" ignores how instances are spread: with 2 AZs, losing an AZ removes half the fleet, not one instance.</p>`,
    q: ['Why is a 3-AZ design cheaper to make AZ-failure-proof than a 2-AZ one?', ['Losing one AZ removes only a third of the capacity instead of half', 'Three AZs are discounted', 'ASG refuses two AZs', 'Cross-AZ traffic is free'], 0, 'The headroom you need is the share of the largest AZ. With 3 AZs you keep 2/3 of the fleet after a failure, so you provision about 1.5x the load rather than 2x.'],
    h: ['Hint 1: the worst case is the AZ with ceil(n/azs) instances.', 'Hint 2: try n = 1, 2, 3, ... until the surviving capacity is enough.', 'Hint 3: ceiling with integers: <code>(n + azs - 1) // azs</code>.'],
    a: `<p>Loop upwards; the surviving capacity grows with n, so the first n that works is the answer (the loop ends because capacity grows at least by per_instance every azs steps).</p>`,
    code: PY(`def min_instances(load, per_instance, azs):
    n = 1
    while True:
        biggest_az = (n + azs - 1) // azs                 # instances in the fullest AZ
        if (n - biggest_az) * per_instance >= load:       # capacity that survives its loss
            return n
        n += 1`, 'Python (tested)'),
    cx: `<p>O(answer) iterations; the answer is at most about <code>load/per_instance x azs/(azs-1) + azs</code>.</p>`, f: ['What does the extra capacity cost, and when is it worth it? (Compare with the cost of an outage per hour.)'],
    tests: { sig: 'int int int -> int', fn: 'min_instances', cases: [
      [[100, 50, 2], 4], [[100, 50, 3], 3], [[10, 50, 2], 2], [[300, 100, 3], 5], [[1000, 100, 4], 14], [[7, 3, 2], 6], [[1, 1, 2], 2], [[250, 100, 5], 4]
    ] }
  }));
  practice.push(P({
    t: 'Design: image-upload pipeline that survives bursts and bad files', l: 'Hard', tags: ['design', 'S3', 'EventBridge', 'SQS', 'Lambda'], co: ['Dropbox', 'Pinterest'],
    s: `<p>Users upload photos to S3. Each must be resized into three sizes. Peak: 2,000 uploads per second for 10 minutes, normally 5 per second. Some files are corrupt. The thumbnail database allows at most 100 connections for this workload. Design the pipeline with AWS managed services and justify each piece: where the burst is absorbed, how corrupt files are isolated, how concurrency is capped, what you alarm on, and how it is deployed and cleaned up safely. Give the core commands.</p>`,
    ex: `<p>Flow: S3 &rarr; EventBridge rule &rarr; <code>resize-queue</code> (DLQ after 3 receives) &rarr; Lambda with <code>MaximumConcurrency=50</code> and reserved concurrency 60 &rarr; S3 output + DynamoDB/RDS Proxy. A corrupt file ends in the DLQ and raises an alarm; the burst becomes queue depth, not errors.</p>`,
    bw: `<p>S3 event &rarr; Lambda directly, no queue, no cap: 2,000 parallel invocations hammer the database, the account concurrency pool is exhausted (other functions throttle), and a corrupt file is retried by the async mechanism and then silently dropped.</p>`,
    q: ['Where does the burst get absorbed?', ['In the SQS queue, which grows while the capped consumers drain it', 'In the Lambda timeout', 'In the S3 bucket policy', 'In CloudFront'], 0, 'A queue converts a short high-rate burst into a longer steady drain. The concurrency cap protects the database; the DLQ isolates bad files.'],
    h: ['Hint 1: decouple producer and consumer with a queue; cap the consumer.', 'Hint 2: compute the drain time: 2,000/s x 600 s = 1.2M messages; with 50 concurrent at 0.5 s each the fleet clears 100/s, so about 3.3 hours: decide if that is acceptable or raise the cap (and the database limit).', 'Hint 3: alarm on DLQ depth and queue age, deploy with infrastructure as code, clean up in reverse order.'],
    a: `<p>S3 sends <code>Object Created</code> events to EventBridge (or directly to SQS); a rule routes them to <code>resize-queue</code>, whose redrive policy moves a message to the DLQ after 3 receives so a corrupt image is isolated after 3 quick tries. The queue is the shock absorber. The Lambda consumer reports batch item failures, has a timeout of 30 s with visibility timeout 180 s, and a <code>MaximumConcurrency</code> of 50 so the database never sees more than 50 x 1 connections (RDS Proxy or DynamoDB if more is needed). The honest arithmetic: 1.2M uploads in the burst at 100 per second drains in about 3.3 hours; if the product needs minutes, raise concurrency and move the output metadata to DynamoDB. Alarms: DLQ not empty, <code>ApproximateAgeOfOldestMessage</code> above the freshness goal, Lambda errors/throttles. Use idempotent writes keyed by object key and version id. Cleanup: remove the event rule, mapping, function, queues, then empty and delete buckets.</p>`,
    code: SH(R`#!/usr/bin/env bash
# Core of the pipeline. COST: queues and rules are pay-per-use; Lambda is free-tier friendly at lab volumes.
set -euo pipefail
# 1) Bucket sends events to EventBridge
aws s3api put-bucket-notification-configuration --bucket demo-uploads-123456789012 \
  --notification-configuration '{"EventBridgeConfiguration":{}}'

# 2) Rule: only new objects under uploads/, target = resize-queue
cat > s3-pattern.json <<'JSON'
{ "source": ["aws.s3"], "detail-type": ["Object Created"],
  "detail": { "bucket": { "name": ["demo-uploads-123456789012"] }, "object": { "key": [ { "prefix": "uploads/" } ] } } }
JSON
aws events put-rule --name uploads-created --event-pattern file://s3-pattern.json
aws events put-targets --rule uploads-created --targets \
  '[{"Id":"resize","Arn":"arn:aws:sqs:us-east-1:123456789012:resize-queue","DeadLetterConfig":{"Arn":"arn:aws:sqs:us-east-1:123456789012:events-dlq"}}]'
# (resize-queue needs a policy allowing events.amazonaws.com to SendMessage from the rule ARN)

# 3) Consumer: capped concurrency protects the database, partial batch failures isolate bad files
aws lambda put-function-concurrency --function-name resizer --reserved-concurrent-executions 60
aws lambda create-event-source-mapping --function-name resizer \
  --event-source-arn arn:aws:sqs:us-east-1:123456789012:resize-queue \
  --batch-size 10 --maximum-batching-window-in-seconds 5 \
  --function-response-types ReportBatchItemFailures --scaling-config MaximumConcurrency=50

# 4) Alarms: poison files and falling behind
aws cloudwatch put-metric-alarm --alarm-name resize-dlq-not-empty --namespace AWS/SQS \
  --metric-name ApproximateNumberOfMessagesVisible --dimensions Name=QueueName,Value=resize-dlq \
  --statistic Maximum --period 60 --evaluation-periods 1 --threshold 0 --comparison-operator GreaterThanThreshold \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:ops-alerts
aws cloudwatch put-metric-alarm --alarm-name resize-queue-too-old --namespace AWS/SQS \
  --metric-name ApproximateAgeOfOldestMessage --dimensions Name=QueueName,Value=resize-queue \
  --statistic Maximum --period 60 --evaluation-periods 5 --threshold 900 --comparison-operator GreaterThanThreshold \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:ops-alerts`, 'Pipeline core commands'),
    cx: `<p>Throughput is bounded by concurrency / duration; the design trades latency during bursts for safety.</p>`, f: ['What changes if every image must be ready in 10 seconds? (Higher cap, provisioned concurrency, and a database that can take the writes, or a different output store.)']
  }));
  practice.push(P({
    t: 'Safe teardown script for the whole lab', l: 'Hard', tags: ['cleanup', 'cost', 'RDS', 'ALB', 'ASG'], co: ['Amazon', 'Datadog'],
    s: `<p>You built a lab in a sandbox account: ASG <code>demo-asg</code>, ALB <code>demo-alb</code> with listener and target group <code>demo-tg</code>, RDS <code>demo-pg</code> (deletion protection on) with replica <code>demo-pg-ro</code>, a Lambda <code>orders-worker</code>, and queues. Write a teardown script that deletes everything in a safe order, <b>refuses to run</b> unless a confirmation variable matches the account id, disables RDS deletion protection only at that point, deletes manual snapshots tagged <code>lab=demo</code>, and finally prints what could still be billing.</p>`,
    ex: `<p>Order: ASG (stops instances) &rarr; listener &rarr; load balancer &rarr; target group &rarr; replica &rarr; primary (with <code>--delete-automated-backups</code>) &rarr; snapshots &rarr; Lambda and queues. Running without <code>CONFIRM_ACCOUNT=123456789012</code> prints an error and deletes nothing.</p>`,
    bw: `<p>Deleting by hand in the console and forgetting the replica, a manual snapshot and an Elastic IP: they bill for months. Or running a destructive script in the wrong account.</p>`,
    q: ['Why delete the ASG before the load balancer and target group?', ['Otherwise the ASG keeps launching instances and registering them', 'Target groups cannot be deleted at all', 'ALBs are free when empty', 'The ASG is cheaper'], 0, 'Remove the thing that creates resources first, then the things they depend on, then the dependencies themselves (reverse of creation).'],
    h: ['Hint 1: check <code>aws sts get-caller-identity</code> against the confirmation variable first.', 'Hint 2: replicas must be deleted before their source.', 'Hint 3: list leftovers with tag queries at the end: snapshots, volumes, addresses, NAT gateways.'],
    a: `<p>A guard clause compares the caller's account id with the expected one. Then delete in reverse order of creation, waiting for the slow ones, disabling deletion protection immediately before the delete (never earlier), and using <code>--skip-final-snapshot</code> only because this is a throwaway lab. The final report prints unattached volumes and addresses so a human checks for strays.</p>`,
    code: SH(R`#!/usr/bin/env bash
# teardown.sh - run as: CONFIRM_ACCOUNT=123456789012 ./teardown.sh
set -uo pipefail
ACCT=$(aws sts get-caller-identity --query Account --output text)
if [ "$ACCT" != "123456789012" ] || [ "$CONFIRM_ACCOUNT" != "$ACCT" ]; then
  echo "Refusing: this is not the sandbox account or CONFIRM_ACCOUNT is not set." >&2; exit 1
fi
run() { echo "+ $*"; "$@" || echo "  (continuing: $* failed or was already gone)"; }

# 1) ASG first: it would otherwise relaunch instances. Force-delete terminates them.
run aws autoscaling delete-auto-scaling-group --auto-scaling-group-name demo-asg --force-delete

# 2) Load balancer pieces: listeners go with the LB, then the target group
LB_ARN=$(aws elbv2 describe-load-balancers --names demo-alb --query 'LoadBalancers[0].LoadBalancerArn' --output text 2>/dev/null)
[ -n "$LB_ARN" ] && [ "$LB_ARN" != "None" ] && run aws elbv2 delete-load-balancer --load-balancer-arn "$LB_ARN"
sleep 30
TG_ARN=$(aws elbv2 describe-target-groups --names demo-tg --query 'TargetGroups[0].TargetGroupArn' --output text 2>/dev/null)
[ -n "$TG_ARN" ] && [ "$TG_ARN" != "None" ] && run aws elbv2 delete-target-group --target-group-arn "$TG_ARN"

# 3) Database: replica before source; remove deletion protection ONLY now
run aws rds delete-db-instance --db-instance-identifier demo-pg-ro --skip-final-snapshot
run aws rds modify-db-instance --db-instance-identifier demo-pg --no-deletion-protection --apply-immediately
run aws rds delete-db-instance --db-instance-identifier demo-pg --skip-final-snapshot --delete-automated-backups

# 4) Manual snapshots tagged lab=demo
for s in $(aws rds describe-db-snapshots --snapshot-type manual --query 'DBSnapshots[].DBSnapshotIdentifier' --output text); do
  case "$s" in demo-*) run aws rds delete-db-snapshot --db-snapshot-identifier "$s";; esac
done

# 5) Functions and queues
run aws lambda delete-function --function-name orders-worker
for q in orders-queue orders-dlq; do
  url=$(aws sqs get-queue-url --queue-name "$q" --query QueueUrl --output text 2>/dev/null) && run aws sqs delete-queue --queue-url "$url"
done

# 6) What could still bill? A human reads this list.
echo "== unattached volumes";  aws ec2 describe-volumes --filters Name=status,Values=available --query 'Volumes[].VolumeId' --output text
echo "== Elastic IPs";         aws ec2 describe-addresses --query 'Addresses[?AssociationId==null].PublicIp' --output text
echo "== NAT gateways";        aws ec2 describe-nat-gateways --filter Name=state,Values=available --query 'NatGateways[].NatGatewayId' --output text
echo "Check Cost Explorer tomorrow."`, 'teardown.sh'),
    cx: `<p>Linear in the number of resources; most time is spent waiting for deletions.</p>`, f: ['How would infrastructure as code (Terraform) change this? (destroy knows the dependency graph.)']
  }));
  practice.push(P({
    t: 'Which manual snapshots can be deleted?', l: 'Hard', tags: ['RDS', 'snapshots', 'cost', 'retention'], co: ['Amazon', 'Snowflake'], lang: 'python',
    s: `<p>Manual snapshots never expire, so cleanup is a script's job. Write <code>snapshots_to_delete(ids, ages, keep_days, keep_min)</code>: <code>ids[i]</code> has age <code>ages[i]</code> days. Always protect the <code>keep_min</code> newest snapshots (smallest age; ties broken by smaller id). Among the others delete those with age <b>greater than</b> <code>keep_days</code>. Return the ids to delete, oldest first (largest age first, ties by id).</p>`,
    ex: `<p><code>(["a","b","c"], [10,40,100], 30, 2)</code>: protect a and b (the two newest), c is older than 30 days &rarr; <span class="c-r">["c"]</span>. With <code>keep_min = 0</code> the answer is <span class="c-r">["c","b"]</span>.</p>`,
    bw: `<p>"Delete everything older than 30 days" can delete your only backup of a database nobody touched for a month. The keep_min rule always leaves recent restore points.</p>`,
    q: ['Why use a dry run first?', ['Deleting snapshots is irreversible', 'It is faster', 'AWS requires it', 'It lowers the bill'], 0, 'A deleted snapshot is gone. Print the list, review it, then delete (and tag snapshots with owner and expiry to make decisions obvious).'],
    h: ['Hint 1: sort indexes by (age, id) and mark the first keep_min as protected.', 'Hint 2: candidates are unprotected snapshots with age &gt; keep_days.', 'Hint 3: sort candidates by (-age, id) and return the ids.'],
    a: `<p>Two passes: choose the protected set from the newest, then filter and sort the deletions. In a real script wrap the deletions in <code>--dry-run</code> logic and skip any snapshot used by a running restore or shared with another account.</p>`,
    code: PY(`def snapshots_to_delete(ids, ages, keep_days, keep_min):
    order = sorted(range(len(ids)), key=lambda i: (ages[i], ids[i]))   # newest first
    protected = set(order[:keep_min])
    doomed = [i for i in range(len(ids)) if i not in protected and ages[i] > keep_days]
    doomed.sort(key=lambda i: (-ages[i], ids[i]))                       # oldest first
    return [ids[i] for i in doomed]`, 'Python (tested)'),
    cx: `<p>O(n log n) for the sorts.</p>`, f: ['What extra checks make deletion safe in a real account? (Tags, shares, ongoing restores, legal hold.)'],
    tests: { sig: 'string[] int[] int int -> string[]', fn: 'snapshots_to_delete', cases: [
      [[['a', 'b', 'c'], [10, 40, 100], 30, 0], ['c', 'b']], [[['a', 'b', 'c'], [10, 40, 100], 30, 2], ['c']], [[['a', 'b', 'c'], [10, 40, 100], 30, 3], []],
      [[[], [], 30, 1], []], [[['x', 'y'], [31, 30], 30, 0], ['x']], [[['p', 'q', 'r', 's'], [90, 90, 5, 200], 60, 1], ['s', 'p', 'q']],
      [[['a', 'b'], [50, 50], 30, 1], ['b']], [[['a', 'b', 'c'], [1, 2, 3], 0, 0], ['c', 'b', 'a']], [[['a'], [100], 30, 1], []]
    ] }
  }));

  // ───────────────────────── Quiz ─────────────────────────
  quiz.push({ q: 'The primary database\'s AZ fails. Multi-AZ is on and there is also a read replica. What should happen?', options: ['RDS fails over to the standby automatically and the endpoint name stays the same', 'The read replica is promoted automatically', 'Nothing until an engineer restores a snapshot', 'The endpoint name changes to the replica\'s'], answer: 0, explain: 'Multi-AZ is the automatic high-availability feature (60-120 s DNS flip). Read replicas are never promoted by themselves.' });
  quiz.push({ q: 'Which statement about Multi-AZ (instance) and read replicas is correct?', options: ['Multi-AZ replicates synchronously and the standby is not readable; replicas replicate asynchronously and are readable', 'Both replicate synchronously', 'Replicas are for availability, Multi-AZ is for reads', 'Multi-AZ standbys can serve reports'], answer: 0, explain: 'Synchronous standby gives RPO about 0 but cannot be queried (instance flavour); asynchronous replicas scale reads and can lag.' });
  quiz.push({ q: 'A table was dropped 20 minutes ago. What is the safest recovery on RDS?', options: ['PITR to a new instance at a time before the drop, copy the table back, delete the copy', 'Promote the read replica', 'Run PITR in place over production', 'Reboot with failover'], answer: 0, explain: 'Restores create a new instance. The read replica already replayed the DROP, and there is no in-place rewind in RDS PostgreSQL.' });
  quiz.push({ q: 'Backup retention period is set to 0. What is lost?', options: ['Automated backups and therefore point-in-time recovery', 'Only Multi-AZ', 'Only read replicas', 'Nothing, snapshots are still automatic'], answer: 0, explain: 'Retention 0 disables automated backups and PITR. Manual snapshots still work but are taken only when you ask.' });
  quiz.push({ q: 'An ALB returns 503 for every request. The most likely cause is:', options: ['No healthy targets in the target group', 'The idle timeout is too long', 'The listener uses HTTP', 'Cross-zone balancing is off'], answer: 0, explain: '503 means the load balancer has nowhere healthy to send the request: check the health check path, port and the target security group.' });
  quiz.push({ q: 'A report endpoint always fails with 504 after exactly 60 seconds. The report takes 90 s. The best long-term fix is:', options: ['Make it asynchronous: queue the job, return 202, deliver the result later', 'Add more targets', 'Switch to an NLB without any other change', 'Lower the health check interval'], answer: 0, explain: '60 s is the ALB idle timeout. Raising it hides slow code; moving long work behind a queue keeps requests short.' });
  quiz.push({ q: '4 instances run at 90% CPU and the target-tracking target is 60%. Min 2, max 10. What is the desired capacity?', options: ['6', '4', '7', '10'], answer: 0, explain: 'ceil(4 x 90 / 60) = ceil(6.0) = 6.' });
  quiz.push({ q: 'An instance has a hung app, passes EC2 status checks, and is never replaced by the ASG. What setting fixes this?', options: ['Health check type ELB', 'Larger instance type', 'Longer cooldown', 'Spot instances'], answer: 0, explain: 'EC2 health checks look only at the VM. ELB health checks let the ASG replace targets that the load balancer marks unhealthy.' });
  quiz.push({ q: 'A Lambda handles 200 requests per second, each taking 500 ms. About how many concurrent executions does it need?', options: ['100', '200', '500', '10'], answer: 0, explain: 'Little\'s law: concurrency = rate x duration = 200 x 0.5 = 100.' });
  quiz.push({ q: 'What is the best place to create an SDK client or database connection in a Lambda function?', options: ['Outside the handler, at module level, so warm invocations reuse it', 'Inside the handler on every call', 'In an environment variable', 'In a separate function'], answer: 0, explain: 'Init code runs once per cold start; warm environments reuse the objects, saving time and connections.' });
  quiz.push({ q: 'A message fails every time. The queue has no DLQ. What happens?', options: ['It reappears after each visibility timeout and loops until retention expires', 'SQS deletes it after 3 tries', 'It moves to a default DLQ', 'The queue is paused'], answer: 0, explain: 'Without a redrive policy SQS never gives up on a message before the retention period (up to 14 days).' });
  quiz.push({ q: 'You want one OrderPlaced event delivered to inventory, email and analytics services independently. Which design fits best?', options: ['SNS topic with one SQS queue (and DLQ) per consumer', 'One shared SQS queue read by all three', 'Three Lambda functions calling each other', 'A single database table polled by each'], answer: 0, explain: 'Fan-out gives each consumer its own buffer, retry and DLQ, so one slow or broken consumer does not affect the others.' });
  quiz.push({ q: 'Self-hosting PostgreSQL saves $120/month on infrastructure but needs 6 extra engineer hours at $75/hour. Net effect?', options: ['It costs $330 more per month', 'It saves $120', 'It saves $330', 'It costs $120 more'], answer: 0, explain: '6 x $75 = $450 of extra labour minus $120 saved = $330 more. Include people time in TCO.' });
  quiz.push({ q: 'Which is the right way to give a Lambda function access to Secrets Manager?', options: ['Attach an execution role with GetSecretValue on that secret only', 'Put an access key in an environment variable', 'Hardcode the secret value in the code', 'Make the secret public'], answer: 0, explain: 'The execution role provides short-lived credentials automatically. Keys in env vars or code leak and never rotate.' });

  // ───────────────────────── Interview ─────────────────────────
  interview.push({ q: 'Explain Multi-AZ versus a read replica in RDS. When do you use each?', level: 'B', a: `<p>Multi-AZ is for <b>availability</b>: RDS keeps a synchronous standby in another AZ, and on failure flips the endpoint DNS name to it in roughly 60-120 seconds with almost no data loss. The standby is not queried (for the instance flavour). A read replica is for <b>scaling reads</b> or cross-Region copies: it is asynchronous, readable, has its own endpoint and can lag, and it is never promoted automatically. I use Multi-AZ for any production database that must survive an AZ failure, and add replicas for reporting or read-heavy paths, sending read-your-own-write queries to the primary. They are not alternatives: a Multi-AZ primary can also have replicas.</p>`, followUps: ['What would you do if the app still errors after the failover completed? (DNS caching, stale pooled connections.)', 'What is a Multi-AZ DB cluster and how does it differ?'] });
  interview.push({ q: 'Walk me through restoring a table that was deleted 20 minutes ago on RDS PostgreSQL.', level: 'I', a: `<p>First stop the damage (revoke the role, pause the job) and note the exact time of the drop. I check <code>LatestRestorableTime</code> and that retention is above zero. I run <code>restore-db-instance-to-point-in-time</code> to a time just before the drop; this creates a <b>new</b> instance, because RDS never restores in place. I wait until it is available, verify the table, then <code>pg_dump -t table</code> from the copy into production, so newer data in other tables survives. Finally I delete the restored instance (hourly billing), take a manual snapshot before any risky step, and write a post-mortem: least-privilege roles, review for destructive SQL, and a restore drill so I know the real RTO.</p>`, followUps: ['Why does a read replica not help here?', 'How do you estimate the time this takes for a 1 TB database?'] });
  interview.push({ q: 'Define RPO and RTO and relate them to RDS features.', level: 'B', a: `<p>RPO is how much data I can afford to lose (measured in time); RTO is how long I can be down. With Multi-AZ, RPO is about zero and RTO is one to two minutes for instance or AZ failures. With automated backups and PITR the RPO is about 5 minutes (transaction logs shipped about every 5 minutes) but the RTO is the restore time, which grows with database size. With only daily snapshots the RPO can be 24 hours. A cross-Region replica gives an RPO of seconds (lag) and an RTO of minutes (promote and repoint). I choose features from the business numbers and test with drills, because a measured restore beats a promised one.</p>`, followUps: ['What RPO does a cross-Region snapshot copy give?', 'How would you reduce the RTO of a 2 TB restore?'] });
  interview.push({ q: 'Your ALB is returning 502 and 504 errors. How do you investigate?', level: 'I', a: `<p>I separate the codes: 502 means the target closed the connection or sent a bad reply, 503 means no healthy targets, 504 means no answer within the idle timeout or the connection could not be made. I look at target health reason codes, the ALB access logs (<code>elb_status_code</code>, <code>target_status_code</code>, <code>target_processing_time</code>), and CloudWatch metrics (<code>HTTPCode_Target_5XX_Count</code> vs <code>HTTPCode_ELB_5XX_Count</code>). Typical fixes: graceful shutdown and a deregistration delay for 502s on deploy, app keep-alive timeout longer than the ALB idle timeout (60 s), fix the health check path or security group for 503, and make slow endpoints asynchronous or faster for 504. I would not just raise the timeout.</p>`, followUps: ['How can you tell whether the ALB or the target produced a 5xx?', 'What is the effect of the deregistration delay on deploys?'] });
  interview.push({ q: 'ALB or NLB? Give a decision rule.', level: 'B', a: `<p>ALB works at Layer 7: it understands HTTP, so I get path and host routing, header rules, weighted target groups, redirects, WebSocket and gRPC, and WAF integration. NLB works at Layer 4: TCP, UDP and TLS passthrough with very high throughput, ultra-low latency, preserved client IPs and a static IP (or Elastic IP) per AZ. If the app speaks HTTP and I need smart routing, I use ALB. If I need static IPs for a partner allow-list, a non-HTTP protocol, or extreme connection counts, I use NLB. Sometimes both: an NLB in front of an ALB to give HTTP routing behind static IPs.</p>`, followUps: ['How does each see the client IP?', 'How do you do a canary release with an ALB?'] });
  interview.push({ q: 'How do ALB health checks work, and how do you tune them?', level: 'I', a: `<p>The target group probes each target on a path and port every <code>interval</code> seconds with a timeout. A target turns unhealthy after <code>unhealthy-threshold</code> consecutive failures and healthy again after <code>healthy-threshold</code> successes. The worst-case time to stop sending traffic to a dead target is roughly interval x unhealthy-threshold, so I use 10-15 s intervals and thresholds of 2-3. The check should be cheap and shallow (process alive), not a deep dependency check that can mark every target unhealthy during a database blip. If all targets are unhealthy the ALB fails open. Pair it with an ASG using ELB health checks so unhealthy instances are replaced.</p>`, followUps: ['What happens when every target is unhealthy?', 'How is slow start different from the health check?'] });
  interview.push({ q: 'Explain target-tracking scaling and why scaling can be "too late".', level: 'I', a: `<p>Target tracking keeps a metric near a target, for example average CPU at 50%. Roughly desired = ceil(current x metric / target), clamped to min and max; it scales out quickly and in slowly. It is late because of the pipeline: one-minute metric periods, alarm evaluation, instance launch and boot, load balancer health checks, and application warm-up can total 3-6 minutes during which existing capacity is saturated. Mitigations: scheduled or predictive scaling for known peaks, baked AMIs or container images for fast boot, a lower target for headroom, request-count metrics that react earlier than CPU, instance warm-up settings, warm pools, and queues to absorb bursts.</p>`, followUps: ['What does the default instance warm-up do?', 'How do you scale a queue-worker fleet?'] });
  interview.push({ q: 'Lambda: what causes cold starts and how do you reduce them?', level: 'I', a: `<p>A cold start happens when there is no warm execution environment: Lambda must create the sandbox, download the code, start the runtime and run init code before the handler. It is longer for large packages, heavy imports, big runtimes like Java, and functions with VPC networking that was not pre-warmed (much improved now). Reduce it by keeping the package small, importing and creating clients at module level (not per call), giving more memory (more CPU), using SnapStart for supported runtimes, or provisioned concurrency for latency-critical paths. Measure with the <code>Init Duration</code> field in the REPORT log line before optimizing.</p>`, followUps: ['Why can raising memory lower the bill?', 'What does provisioned concurrency cost?'] });
  interview.push({ q: 'A Lambda function is throttled and the database is overloaded at the same time. What do you do?', level: 'A', a: `<p>Concurrency equals request rate x duration, so a slow database inflates both. I set reserved concurrency (or <code>MaximumConcurrency</code> on the SQS mapping) to cap what the function can throw at the database and to protect other functions' share of the account pool, add RDS Proxy to multiplex connections, put a queue in front so the burst becomes backlog rather than errors, cache hot reads, fix the slow query, and set client timeouts so failures are fast. I would also request a concurrency quota increase only after the downstream can actually handle more. Alarms on <code>Throttles</code>, <code>ConcurrentExecutions</code>, and database connections tell me early.</p>`, followUps: ['Reserved vs provisioned concurrency: what is the difference?', 'How does Lambda behave when it is throttled, by invocation type?'] });
  interview.push({ q: 'What is a dead-letter queue and how do you choose maxReceiveCount and the visibility timeout?', level: 'I', a: `<p>A DLQ is a queue that receives messages that were received maxReceiveCount times without being deleted, so poison messages stop looping and can be inspected. I choose maxReceiveCount of 3-5 (enough for transient errors, small enough to isolate bad data), alarm when the DLQ is not empty, give the DLQ longer retention than the source (the retention clock starts at the original enqueue), and redrive after fixing the bug with <code>start-message-move-task</code>. Visibility timeout must exceed the longest normal processing time (for Lambda, at least 6 x the function timeout), or messages reappear while still being processed and cause duplicates.</p>`, followUps: ['How do partial batch responses help?', 'What differs for FIFO queues?'] });
  interview.push({ q: 'SQS vs SNS vs EventBridge: how do you pick?', level: 'I', a: `<p>SQS is a buffer: work waits until a consumer pulls it, with retries and a DLQ. SNS is publish/subscribe with push fan-out to many subscribers (SQS, Lambda, HTTP, email) and simple filter policies, with very high throughput. EventBridge is an event bus with rich content-based rules, many AWS and SaaS event sources, schedules, archive and replay, and per-target DLQs. A typical combination is events published to EventBridge or SNS, fanned out to one SQS queue per consumer, and Lambda or workers reading those queues. I use a plain SQS queue when there is a single consumer group, SNS for simple high-volume fan-out, and EventBridge when routing depends on event content or when reacting to AWS service events and schedules.</p>`, followUps: ['How do you make consumers idempotent?', 'What delivery guarantee does each provide?'] });
  interview.push({ q: 'When would you self-host PostgreSQL instead of using RDS?', level: 'A', a: `<p>When RDS cannot do what I need or the economics flip at scale: an unsupported extension or OS-level access, specific hardware such as local NVMe, extreme sizes where the managed premium dwarfs people cost, or a requirement to run the same stack across clouds and on-premises. It also requires capability: a team that can run Patroni or an operator, tested backups with PITR, monitoring, on-call and upgrades. For a small team, RDS wins because patching, backups, failover and monitoring come included, and the exit cost is low since it is standard PostgreSQL. I would build a TCO for 12 and 36 months including engineer hours and expected incident cost, and decide using the pessimistic ops-hours column.</p>`, followUps: ['What are the hidden costs of managed services?', 'How can you lower an RDS bill without leaving?'] });
  interview.push({ q: 'How do you keep database passwords and cloud credentials out of code and logs in these services?', level: 'I', a: `<p>Compute gets <b>roles</b>, not keys: Lambda uses an execution role, EC2 an instance profile, containers a task role. The role has least-privilege permissions scoped to specific ARNs. The RDS master password is created and rotated by RDS in Secrets Manager (<code>--manage-master-user-password</code>); applications fetch it at start-up (and cache it) or use IAM database authentication. Environment variables carry only identifiers like the secret ARN, never values. CI uses short-lived OIDC credentials. Logs are scrubbed, secrets are never echoed in CLI output, and secret scanning plus rotation catch mistakes. For Azure the equivalents are managed identity plus Key Vault; for GCP a service account plus Secret Manager.</p>`, followUps: ['What are the risks of putting secrets in Lambda environment variables?', 'How does rotation work without downtime?'] });
  interview.push({ q: 'Design: how would you absorb a 100x traffic burst on an upload-processing system?', level: 'A', a: `<p>Decouple with a queue. Uploads land in S3; an event goes through EventBridge or S3 notifications into an SQS queue with a DLQ. A consumer fleet (Lambda with capped concurrency, or an ASG scaled on backlog per instance) drains at a rate that the downstream database or API can sustain. The burst becomes queue depth and some delay instead of errors. I calculate the drain time (messages / throughput), choose the cap to meet the freshness requirement, monitor <code>ApproximateAgeOfOldestMessage</code> and DLQ depth, make processing idempotent, and use RDS Proxy or a different store if the database is the bottleneck. This builds on the queue and back-pressure ideas from the system design modules.</p>`, followUps: ['What if the results must be ready within seconds?', 'Where would you add rate limiting?'] });

  // Rotate the options so the correct answer is not always first (answers are written first for clarity).
  function rot(q, i) { var n = q.options.length, k = (i * 3 + 1) % n; q.options = q.options.slice(k).concat(q.options.slice(0, k)); q.answer = (q.answer - k + n) % n; }
  quiz.forEach(rot);
  practice.forEach(function (p, i) { rot(p.mcq, i + 1); });
  topics.forEach(function (t, i) { (t.problems || []).forEach(function (p) { rot(p.mcq, i + 2); }); });

  registerModule({
    id: 'devops12',
    title: 'Managed Cloud Services',
    intro: `<p>Most real companies do not run their own database servers, load balancers or queues: they rent them as <b>managed services</b> and spend their time on the product. This module teaches the AWS set you will meet on every cloud team (RDS PostgreSQL, ALB/NLB, Auto Scaling Groups, Lambda, SQS, SNS and EventBridge), with the Azure and GCP equivalents beside each. You learn them through the situations that decide interviews and on-call nights: a database failing over during an AZ outage, a table restored 20 minutes after it was dropped, an ALB returning 502 and 504, scaling that arrives too late, a Lambda hitting its concurrency limit, a poison message looping forever, and the monthly bill of managed versus self-hosted PostgreSQL. Every lab is cost-aware, secret-free and ends with a cleanup.</p>`,
    goals: [
      'Explain <b>Multi-AZ vs read replicas</b>, run a failover drill, and set backups, <b>PITR</b> and snapshots to meet a stated RPO and RTO',
      'Build an <b>ALB</b> with target groups, tuned <b>health checks</b> and listener rules (including weighted canaries), and diagnose <b>502, 503 and 504</b> from logs and metrics',
      'Create <b>launch templates and Auto Scaling Groups</b> with ELB health checks and <b>target-tracking</b> scaling, and explain why scaling arrives late and how to fix it',
      'Write and configure a <b>Lambda</b> function (handler, env vars, timeout, memory, execution role), reason about <b>cold starts and concurrency</b>, and compare Azure Functions and Cloud Run functions',
      'Design reliable asynchronous flows with <b>SQS</b> (visibility timeout, DLQ, maxReceiveCount), <b>SNS fan-out</b> and <b>EventBridge</b> rules',
      'Choose <b>managed vs self-hosted</b> with a real monthly cost model that includes engineer time, and map every service to its Azure and GCP counterpart'
    ],
    prereqs: `<p><b>Required:</b> <b>Identity &amp; Networks</b> (DevOps 6): IAM roles, VPCs, subnets and security groups appear in every lab here. <b>Helpful:</b> <b>HLD 4</b> (load balancing) and <b>HLD 5</b> (queues and messaging) cover the design ideas; this module shows how AWS builds them and what goes wrong in practice. Comfort with the AWS CLI from <b>Compute &amp; Storage</b> (DevOps 5) is assumed. Labs use a sandbox account, free-tier sizes where possible, and end with cleanup commands.</p>`,
    hours: 12,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
