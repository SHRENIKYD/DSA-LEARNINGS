(function () {
  var topics = [], practice = [], quiz = [], interview = [];
  var R = String.raw; // raw template: backslashes (line continuations) in shell code stay exactly as typed
  var LAB = 'Your own AWS account with a <b>budget alert already set</b> (Topic 7), AWS CLI v2 signed in through a named profile (<code>aws sso login --profile lab</code>), free-tier-eligible sizes only (t3.micro / t4g.micro, small gp3 volumes, a few MB in S3). Cost risk: a few cents if you clean up the same day; real money if you forget. Every solution ends with the cleanup commands.';
  var SKIP = { skip: 'cloud procedure, verified by reading' };
  // Compact problem builder: solution.code is bash; o.py adds a Python alt (pure-maths problems with tests).
  function P(o) {
    var p = {
      title: o.t, level: o.l, tags: o.tags, companies: o.co,
      statement: o.s, constraints: o.c || LAB, example: o.ex,
      brute: { why: o.bw },
      mcq: { q: o.q[0], options: o.q[1], answer: o.q[2], explain: o.q[3] },
      hints: o.h,
      solution: { approach: o.a, code: { lang: 'bash', code: o.code }, complexity: o.cx, followUps: o.f },
      tests: o.tests || SKIP
    };
    if (o.py) p.solution.alt = [{ lang: 'python', code: o.py }];
    if (o.bc) p.brute.code = { lang: 'bash', code: o.bc };
    return p;
  }
  function box(id, label, x, y, w) { return { id: id, label: label, x: x, y: y, shape: 'box', w: w || 18 }; }
  function one(k, v) { var h = {}; h[k] = v; return h; }
  function money(x) { return '$' + (Math.round(x * 100) / 100).toFixed(2); }
  // Parse "key=value key=value" input into an object; numbers become numbers.
  function kvIn(input, allowed, hint) {
    var out = {};
    String(input || '').trim().split(/[\s,]+/).filter(Boolean).forEach(function (tok) {
      var m = tok.match(/^([a-zA-Z]+)=([a-zA-Z0-9._-]+)$/);
      if (!m || allowed.indexOf(m[1]) < 0) throw new Error(hint);
      out[m[1]] = isNaN(Number(m[2])) ? m[2] : Number(m[2]);
    });
    return out;
  }

  // ───────────────────────── Topic 1: regions and availability zones ─────────────────────────
  topics.push({
    title: 'Regions and Availability Zones: Where Your Servers Physically Live',
    analogy: `<p>Think of a big <b>supermarket chain</b>. Each <b>city</b> where it operates is a <b>region</b>: you shop in the city you live in because it is close (latency) and because local laws apply there (data residency). Inside each city the chain runs <b>three separate warehouses</b> on different power lines and flood plains: those are the <b>availability zones</b>. If one warehouse floods, the other two keep the shelves full - but only if you stocked goods in more than one warehouse.</p>`,
    explain: `<p>🟢 <b>Region</b> = a geographic area with its own complete copy of the cloud (for example <code>eu-west-1</code> Ireland, <code>us-east-1</code> N. Virginia, <code>ap-south-1</code> Mumbai). Regions are independent: an S3 bucket, an EC2 instance or a disk lives in exactly one region, and data does not leave it unless <i>you</i> copy it. <b>Availability Zone (AZ)</b> = one or more data centres inside a region, with separate power, cooling and networking, a few kilometres to tens of kilometres from the other AZs and linked by fast private fibre (round trips of about a millisecond or two). Most regions have 3 or more AZs, named like <code>eu-west-1a</code>, <code>eu-west-1b</code>.</p>
      ${H.table(['Concept', 'AWS', 'Azure', 'GCP'], [
        ['Geographic area', 'Region (<code>eu-central-1</code>)', 'Region (<code>germanywestcentral</code>)', 'Region (<code>europe-west3</code>)'],
        ['Isolated data-centre group', 'Availability Zone (<code>eu-central-1a</code>)', 'Availability Zone (1, 2, 3) - in most but not all regions', 'Zone (<code>europe-west3-a</code>)'],
        ['Spread VMs without zones', 'Placement group (spread)', 'Availability set (fault and update domains)', 'Spread placement policy'],
        ['Small edge sites', 'Local Zones, Wavelength, CloudFront edge locations', 'Edge Zones, Azure Front Door POPs', 'Cloud CDN / edge POPs'],
        ['Region partner for DR', 'You choose (no built-in pair)', 'Region pairs (for example North Europe + West Europe)', 'You choose']
      ])}
      <p>🟢 <b>What lives where (scope).</b> This decides what survives an outage:</p>
      ${H.table(['Scope', 'Examples', 'Survives one AZ failing?'], [
        ['<b>Global</b>', 'IAM users and roles, Route 53, CloudFront, billing', 'yes'],
        ['<b>Regional</b>', 'S3 buckets, EBS snapshots, AMIs, VPCs, EFS (standard)', 'yes - data is copied across AZs for you'],
        ['<b>Zonal (one AZ)</b>', 'EC2 instances, EBS volumes, subnets, instance store', H.c('r', 'no - it is in exactly one AZ')]
      ])}
      <p>🔵 <b>Choosing a region</b> is a checklist, in this order: (1) <b>law and data residency</b> - must the data stay in the EU, India, Australia? (2) <b>latency</b> to your users - pick the region closest to most of them; (3) <b>service availability</b> - new services and instance types reach some regions first; (4) <b>price</b> - the same instance can cost 10-30% more in some regions (examples: São Paulo and some Asia regions are pricier than us-east-1). Changing region later is a migration, so decide on purpose.</p>
      <p>🔵 <b>Using AZs</b>: one server in one AZ is a single point of failure. The beginner rule for anything that matters is <b>at least two AZs</b> behind a load balancer, with enough capacity in the survivors to carry the load when one AZ goes away (the maths is the guided problem below). Data that must survive (databases, files) needs a copy in another AZ too: a regional service (S3, EFS, multi-AZ RDS) or snapshots.</p>`,
    clues: [
      '"customer data must stay in the EU / in India" → data residency decides the <b>region</b> first; latency and price come after',
      '"users in Singapore complain the app is slow, servers are in us-east-1" → latency: pick a nearer region or put a CDN in front',
      '"the whole site went down when one data centre had a power problem" → single-AZ design; spread across 2-3 AZs behind a load balancer',
      '"how many instances do we need to survive losing an AZ" → N+1 capacity maths: <code>ceil(need / (AZs - 1))</code> per AZ',
      '"my eu-west-1a is not the same as yours" → AZ <b>names</b> are shuffled per account; compare AZ <b>IDs</b> like <code>euw1-az1</code>',
      '"can I attach this EBS volume to an instance in another AZ" → no: volumes are zonal; snapshot it and create a new volume in the target AZ'
    ],
    code: [R`# Which regions are enabled for my account, and what AZs does one region have?
# (uses your named profile; never paste access keys into scripts)
export AWS_PROFILE=lab
aws ec2 describe-regions --query 'Regions[].RegionName' --output text

# AZ names AND IDs. Names (eu-west-1a) are mapped to physical AZs differently
# per account; the ZoneId (euw1-az1) is the same physical AZ for everyone.
aws ec2 describe-availability-zones --region eu-west-1 \
  --query 'AvailabilityZones[].[ZoneName,ZoneId,State]' --output table

# Is an instance type offered in every AZ of the region? (not always true)
aws ec2 describe-instance-type-offerings --region eu-west-1 \
  --location-type availability-zone \
  --filters Name=instance-type,Values=t3.micro \
  --query 'InstanceTypeOfferings[].Location' --output text

# Set a default region for this profile so you do not create things by accident elsewhere
aws configure set region eu-west-1 --profile lab`, R`# Azure equivalents (Azure CLI 'az', signed in with 'az login')
az account list-locations --query "[].{name:name, display:displayName}" --output table
# Zones offered for a VM size in one region (empty list = no zone support there)
az vm list-skus --location westeurope --size Standard_B1s --query "[].locationInfo[].zones" --output json`],
    codeTitle: ['AWS CLI: regions, AZ names vs IDs, instance-type offerings', 'Azure CLI: locations and zones'],
    viz: [{
      title: 'One AZ fails: does the app survive?',
      input: 'azs=3 perAz=2 need=4 fail=2',
      inputLabel: 'azs = number of AZs (2-4), perAz = instances per AZ, need = instances needed at peak, fail = which AZ fails (1..azs)',
      gen: function (input) {
        var o = kvIn(input, ['azs', 'perAz', 'need', 'fail'], 'Use: azs=3 perAz=2 need=4 fail=2');
        var azs = o.azs || 3, per = o.perAz === undefined ? 2 : o.perAz, need = o.need || 4, fail = o.fail || 1;
        if (azs < 2 || azs > 4 || per < 0 || per > 6 || need < 1 || need > 24 || fail < 1 || fail > azs) throw new Error('Keep azs 2-4, perAz 0-6, need 1-24, fail between 1 and azs');
        var names = ['a', 'b', 'c', 'd'].slice(0, azs);
        function g(failed, okEdges) {
          var nodes = [box('u', 'Users', 50, 4, 16), box('lb', 'Load balancer (regional)', 50, 20, 30)];
          var edges = [['u', 'lb']], hl = {}, ehl = {};
          names.forEach(function (n, i) {
            var x = Math.round(100 / (azs + 1) * (i + 1));
            nodes.push(box('az' + n, 'AZ ' + n + ': ' + per + ' x EC2', x, 44, 20));
            edges.push(['lb', 'az' + n]);
            if (failed === i) { hl['az' + n] = 'bad'; } else if (okEdges) { hl['az' + n] = 'ok'; ehl['lb-az' + n] = 'ok'; }
          });
          return { type: 'graph', label: 'region eu-west-1', height: 56, nodes: nodes, edges: edges, hl: hl, ehl: ehl };
        }
        var total = per * azs, left = per * (azs - 1), f = [];
        f.push({ narr: 'The app runs in <b>' + azs + ' AZs</b> with <b>' + per + '</b> instances each (' + total + ' in total) behind a regional load balancer. At peak it needs <b>' + need + '</b> healthy instances.', parts: [g(-1, false), { type: 'vars', label: 'capacity', vals: { instances: total, neededAtPeak: need } }] });
        f.push({ narr: 'Normal day: the load balancer health-checks every instance and spreads requests over all AZs. Each instance carries about ' + Math.round(need / Math.max(1, total) * 100) + '% of one instance\'s peak capacity.', parts: [g(-1, true), { type: 'bars', label: 'instances per AZ', values: names.map(function () { return per; }), idxLabels: names.map(function (n) { return 'AZ ' + n; }) }] });
        f.push({ narr: '<b>AZ ' + names[fail - 1] + ' loses power.</b> Its instances and EBS volumes are unreachable. Health checks fail within seconds and the load balancer stops sending traffic there. Nothing regional (S3, the load balancer itself) is affected.', parts: [g(fail - 1, false), { type: 'bars', label: 'healthy instances per AZ', values: names.map(function (n, i) { return i === fail - 1 ? 0 : per; }), idxLabels: names.map(function (n) { return 'AZ ' + n; }), hl: one(fail - 1, 'bad') }] });
        var ok = left >= need;
        f.push({ narr: 'Survivors: <b>' + left + '</b> instances vs <b>' + need + '</b> needed. ' + (ok ? H.c('g', 'Enough') + ' - users may notice nothing.' : H.c('r', 'Not enough') + ' - the remaining instances overload, latency climbs and requests start failing even though "we were multi-AZ".'), parts: [g(fail - 1, true), { type: 'bars', label: 'healthy vs needed', values: [left, need], idxLabels: ['healthy', 'needed'], hl: { 0: ok ? 'ok' : 'bad', 1: 'cur' } }] });
        var perNeed = Math.max(1, Math.ceil(need / (azs - 1)));
        f.push({ narr: 'The rule: size each AZ so that the <b>other ' + (azs - 1) + '</b> can carry the peak alone: per AZ = ceil(' + need + ' / ' + (azs - 1) + ') = <b>' + perNeed + '</b>, total = ' + perNeed + ' x ' + azs + ' = <b>' + perNeed * azs + '</b>.', parts: [{ type: 'table', label: 'N+1 capacity maths', columns: ['step', 'value'], rows: [['needed at peak', String(need)], ['AZs that must carry it', String(azs - 1)], ['per AZ = ceil(need / (AZs-1))', String(perNeed)], ['total = per AZ x AZs', String(perNeed * azs)]], hl: { 3: 'sel' } }] });
        f.push({ narr: 'Trade-off: more AZs means less spare capacity. With 2 AZs you pay for 2x the peak; with 3 AZs only 1.5x; with 4 AZs 1.33x. That is one reason most production setups use <b>3 AZs</b>. An Auto Scaling group (Cloud &amp; DevOps 12) can also replace lost capacity in the healthy AZs within minutes.', parts: [{ type: 'bars', label: 'total instances for need=' + need + ' (2, 3, 4 AZs)', values: [2, 3, 4].map(function (k) { return Math.max(1, Math.ceil(need / (k - 1))) * k; }), idxLabels: ['2 AZs', '3 AZs', '4 AZs'], hl: one(azs - 2, 'sel') }] });
        return f;
      }
    }],
    examples: [
      { title: 'Choosing a region for an EU health start-up', html: `<p>Patients are in Germany and France; the contract says health data must stay in the EU. Step 1 (law) removes every non-EU region. Step 2 (latency): Frankfurt (<code>eu-central-1</code>) and Paris (<code>eu-west-3</code>) are both 10-20 ms from most users. Step 3 (services): check that the instance types and managed services you need exist there with <code>describe-instance-type-offerings</code>. Step 4 (price): compare in the AWS Pricing Calculator. Result: ${H.c('g', 'eu-central-1')}, with backups copied to <code>eu-west-3</code> (still in the EU) for disaster recovery. Note: residency is about where data is <i>stored</i>; global services like IAM still exist, but do not hold patient data.</p>` },
      { title: 'Postmortem: "we were down for 3 hours when one AZ failed"', html: `<p>A shop ran its only web server and its database on one EC2 instance in <code>us-east-1a</code>. A power event hit that AZ; the instance and its EBS volume were unreachable until AWS recovered the AZ. Nothing in the region was "down" - other AZs were fine. Fix: two web instances in two AZs behind an Application Load Balancer, the database moved to a Multi-AZ managed database (standby in another AZ), static files to S3 (regional). The lesson for support tickets: always ask <b>"which AZ, and is the workload in more than one?"</b></p>` },
      { title: 'Why your AZ "a" is not my AZ "a"', html: `<p>Two teams in different AWS accounts both deploy to <code>eu-west-1a</code> and are surprised that latency between them is higher than within their own AZ. AWS maps AZ <b>names</b> to physical AZs independently per account (so everyone does not pile into "a"). To line up across accounts - for example for a shared network or a Local Zone - compare the <b>AZ ID</b> (<code>euw1-az1</code>) from <code>describe-availability-zones</code>.</p>`, code: R`aws ec2 describe-availability-zones --region eu-west-1 \
  --query 'AvailabilityZones[].[ZoneName,ZoneId]' --output text
# eu-west-1a  euw1-az2   <- example: this account's "a" is physical az2
# eu-west-1b  euw1-az3
# eu-west-1c  euw1-az1` },
      { title: 'Moving a disk to another AZ', html: `<p>A ticket: "I want to attach my data volume to the new instance in <code>eu-west-1b</code> but the console does not list it". EBS volumes are <b>zonal</b>. The route is: snapshot the volume (snapshots are regional), create a new volume from the snapshot in the target AZ, attach it, then delete the old volume and the snapshot when done so they stop costing money.</p>`, code: R`SNAP=$(aws ec2 create-snapshot --volume-id vol-0abc1234def567890 \
  --description "move to eu-west-1b" --query SnapshotId --output text)
aws ec2 wait snapshot-completed --snapshot-ids "$SNAP"
NEWVOL=$(aws ec2 create-volume --snapshot-id "$SNAP" --availability-zone eu-west-1b \
  --volume-type gp3 --query VolumeId --output text)
echo "new volume $NEWVOL in eu-west-1b; remember to delete the old volume and $SNAP after testing"` }
    ],
    deepDive: `<p>🟣 <b>How isolated is an AZ really?</b> AWS designs AZs so that common failures (power, cooling, a fibre cut, a bad deployment of a zonal service) stay inside one AZ, and deploys software changes to one AZ at a time. Real incidents show both sides: many past events were limited to one AZ (and multi-AZ apps rode them out), but a few were <b>regional</b>, usually because a regional control-plane service failed (for example the API that launches instances), or <b>global</b> through a dependency like DNS or identity. That is why architects separate the <b>data plane</b> (already-running instances keep serving) from the <b>control plane</b> (creating new things), and why "static stability" - having enough capacity already running, rather than needing to launch more during an incident - is a design goal.</p>
      <p><b>Latency numbers to remember.</b> Inside one AZ: well under 1 ms. Between AZs in a region: about 1-2 ms. Across a continent: 10-40 ms. Across oceans: 70-250 ms. So synchronous database replication works between AZs, but not between distant regions; that is why multi-AZ is the default for high availability and multi-region is for disaster recovery (Cloud &amp; DevOps 17).</p>
      <p><b>Hidden costs and limits.</b> Traffic between AZs is billed (an example price is $0.01/GB in each direction), so chatty services spread across AZs can add a surprising line to the bill. Some regions are <b>opt-in</b> (for example several regions launched after 2019) and must be enabled before use. Capacity is per AZ: an instance type can be temporarily unavailable in one AZ (<code>InsufficientInstanceCapacity</code>), so allowing several AZs and several instance types makes launches more reliable. On Azure, not every region has zones; where it does not, an <b>availability set</b> spreads VMs over fault domains (racks) inside one data centre, which protects against a rack failure but not a building failure.</p>
      <p><b>Data residency is more than region choice.</b> Backups, logs shipped to a SaaS tool, CDN caches and support tickets can all move data. A good answer in an interview mentions region, encryption with keys you control, and checking where every copy goes.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> an assistant can turn "users in Brazil and Mexico, data must stay in LATAM, budget-sensitive" into a short region comparison, write the <code>describe-availability-zones</code> and offering checks, and explain an AWS Health Dashboard event in plain English during an incident. It is also good at the N+1 capacity sum.</p>
      <p><b>Where it goes wrong:</b> region and service lists change every year, so models confidently name regions that do not exist yet, claim a service is available where it is not, or quote old prices. They also blur "multi-AZ" and "multi-region". <b>How to work with it:</b> let it draft the shortlist and the CLI checks, then verify against the live account (<code>describe-regions</code>, offerings) and the official region table. <b>What you must still own:</b> the legal requirement (ask the customer or the compliance team - never let a model decide residency), and the judgement of how much availability the business actually needs and will pay for.</p>`,
    problems: [P({
      t: 'How many instances survive an AZ failure?', l: 'Medium', tags: ['availability zones', 'capacity', 'high availability'], co: ['AWS Support', 'Accenture'],
      s: `<p>A web tier must serve <code>peakRps</code> requests per second at peak, and one instance handles <code>rpsPerInstance</code>. The team spreads instances <b>evenly</b> across <code>azs</code> Availability Zones. Write <code>instancesForAzFailure(peakRps, rpsPerInstance, azs)</code> that returns the <b>total</b> number of instances to run so the app still meets peak with any <b>one</b> AZ completely lost. Every AZ runs at least 1 instance. If <code>azs &lt; 2</code> it cannot survive an AZ loss: return <code>-1</code>. Then show the CLI that checks how the running instances are actually spread.</p>`,
      c: `<p><code>0 ≤ peakRps ≤ 10<sup>6</sup></code>, <code>1 ≤ rpsPerInstance ≤ 10<sup>5</sup></code>, <code>1 ≤ azs ≤ 6</code>. Pure maths - no AWS resources are created, so no cost. The CLI part only reads (<code>describe-instances</code>), which is free.</p>`,
      ex: `<p><code>peakRps=900, rpsPerInstance=100, azs=3</code> → need ${H.c('b', '9')} instances in total at peak. Lose one AZ and only 2 remain, so each AZ needs <code>ceil(9 / 2) = 5</code>, total ${H.c('g', '15')}. With 2 AZs it would be <code>9 x 2 = 18</code>; with 1 AZ ${H.c('r', '-1')}.</p>`,
      bw: `<p>Run exactly the peak count (9) spread over 3 AZs (3 each). It looks multi-AZ, but when one AZ fails only 6 are left - 67% of what peak needs - and the survivors overload. "Multi-AZ" without spare capacity is only half the job.</p>`,
      q: ['Peak needs 10 instances and you use 2 AZs. How many should you run?', ['20 (10 per AZ)', '10 (5 per AZ)', '12 (6 per AZ)', '11'], 0, 'If either AZ fails, the other must carry all 10 alone, so each AZ needs 10. Two AZs means paying for 2x peak; three AZs would need ceil(10/2)=5 each, 15 total.'],
      h: ['<p>Hint 1: first turn requests into instances: <code>need = ceil(peakRps / rpsPerInstance)</code>.</p>', '<p>Hint 2: after one AZ fails, <code>azs - 1</code> AZs are left and must hold all <code>need</code> instances, so per AZ = <code>ceil(need / (azs - 1))</code>.</p>', '<p>Hint 3: edge cases - fewer than 2 AZs returns -1; zero traffic still keeps 1 instance per AZ (<code>max(1, ...)</code>). Total = per AZ x azs. Use integer ceiling <code>(a + b - 1) / b</code> to avoid floats.</p>'],
      a: `<p>Convert peak load to instances with a ceiling, then size each AZ so that the remaining <code>azs - 1</code> AZs can carry the whole load: <code>perAz = max(1, ceil(need / (azs - 1)))</code>, <code>total = perAz x azs</code>. In Bash use integer arithmetic <code>$(( (a + b - 1) / b ))</code> for the ceiling. After deploying, verify the real spread with <code>describe-instances</code> grouped by <code>Placement.AvailabilityZone</code> - an Auto Scaling group may be unbalanced after an AZ problem. Explain the trade-off to the customer: 2 AZs cost 2x peak, 3 AZs 1.5x, so 3 AZs is usually both safer and cheaper. Prices are not needed for the count, but multiply by the hourly price (Topic 7) to show the cost of resilience.</p>`,
      code: R`#!/usr/bin/env bash
# az_capacity.sh PEAK_RPS RPS_PER_INSTANCE AZS  -> total instances to survive losing one AZ
set -euo pipefail
peak=$1; per_inst=$2; azs=$3
if [ "$azs" -lt 2 ]; then echo -1; exit 0; fi       # one AZ cannot survive losing that AZ
need=$(( (peak + per_inst - 1) / per_inst ))         # ceil(peak / per instance)
per_az=$(( (need + azs - 2) / (azs - 1) ))           # ceil(need / (azs - 1))
[ "$per_az" -lt 1 ] && per_az=1                      # always keep 1 per AZ
echo $(( per_az * azs ))

# Check the real spread of running instances tagged app=web (read-only, free):
aws ec2 describe-instances --profile lab \
  --filters Name=tag:app,Values=web Name=instance-state-name,Values=running \
  --query 'Reservations[].Instances[].Placement.AvailabilityZone' --output text \
  | tr '\t' '\n' | sort | uniq -c`,
      py: `import math

def instances_for_az_failure(peak_rps, rps_per_instance, azs):
    """Total instances, spread evenly, so losing any one AZ still meets peak."""
    if azs < 2 or rps_per_instance <= 0:
        return -1                                  # cannot survive losing the only AZ
    need = math.ceil(peak_rps / rps_per_instance)  # instances needed at peak
    per_az = max(1, math.ceil(need / (azs - 1)))   # survivors must carry everything
    return per_az * azs`,
      cx: `<p>O(1) maths. Cost of resilience: total / need = azs / (azs - 1) times the bare minimum (2.0x for 2 AZs, 1.5x for 3, 1.33x for 4).</p>`,
      f: ['How does an Auto Scaling group change this maths (it can launch replacements in healthy AZs)?', 'What if one AZ does not offer your instance type?'],
      tests: { sig: 'int int int -> int', fn: 'instancesForAzFailure', cases: [
        [[900, 100, 3], 15], [[900, 100, 2], 18], [[1000, 100, 4], 16], [[50, 100, 3], 3],
        [[0, 100, 3], 3], [[900, 100, 1], -1], [[1200, 250, 3], 9], [[10000, 300, 6], 42]
      ] }
    })]
  });

  // ───────────────────────── Topic 2: shared responsibility + safe account setup ─────────────────────────
  topics.push({
    title: 'The Shared Responsibility Model and a Safe Account: Who Patches What, and Never Using Root Keys',
    analogy: `<p>Renting a flat: the <b>landlord</b> is responsible for the building - walls, roof, wiring, the lock on the front door of the block. <b>You</b> are responsible for what happens inside your flat: locking your own door, who you give keys to, and not leaving the window open. If a burglar climbs in through the window you left open, that is not the landlord's fault. In the cloud, AWS is the landlord <b>"of"</b> the cloud; you are responsible for security <b>"in"</b> the cloud.</p>`,
    explain: `<p>🟢 <b>The model in one line:</b> the provider secures the <b>physical world and the platform</b> (data centres, hardware, the hypervisor, the global network, the managed service software); <b>you</b> secure <b>everything you configure</b>: who can log in, what is public, the guest operating system on your VMs, your data and your encryption choices. The line moves with the service type: the more managed the service, the more the provider does.</p>
      ${H.table(['Layer', 'EC2 / Azure VM (IaaS)', 'RDS / Azure SQL (managed)', 'S3 / Blob (storage)', 'Lambda / Functions (serverless)'], [
        ['Data centre, hardware, hypervisor', 'Provider', 'Provider', 'Provider', 'Provider'],
        ['Guest OS patching', H.c('r', 'You'), 'Provider', 'n/a', 'Provider'],
        ['Database / runtime patching', H.c('r', 'You'), 'Provider (you pick the window)', 'n/a', 'Provider (you pick the runtime version)'],
        ['Network exposure (security groups, public access)', H.c('r', 'You'), H.c('r', 'You'), H.c('r', 'You (bucket policy, Block Public Access)'), H.c('r', 'You')],
        ['Identity and permissions (IAM)', H.c('r', 'You'), H.c('r', 'You'), H.c('r', 'You'), H.c('r', 'You')],
        ['Your data, encryption choices, backups policy', H.c('r', 'You'), H.c('r', 'You'), H.c('r', 'You'), H.c('r', 'You')]
      ])}
      <p>🟢 <b>What this means for a support engineer:</b> a leaked public bucket, an unpatched OS on EC2, SSH open to the world, or an access key pushed to GitHub are <b>customer-side</b> problems. Hardware failure, a hypervisor bug or an AZ power event are provider-side. Knowing the line tells you whether the fix is a config change or an AWS Health event.</p>
      <p>🔵 <b>Your side starts on day one: secure the account before any lab.</b></p>
      <ol>
        <li><b>Root user</b> (the email you signed up with): turn on <b>MFA</b>, create <b>no access keys</b> for it, and stop using it except for the few tasks that need it (billing settings, closing the account).</li>
        <li><b>Billing safety net:</b> create a monthly <b>budget</b> with an email alert (Topic 7 shows the CLI). Do this before launching anything.</li>
        <li><b>Daily identity:</b> create a user in <b>IAM Identity Center</b> (single sign-on) and use the CLI with an SSO profile: <code>aws configure sso</code>, then <code>aws sso login --profile lab</code>. Credentials are short-lived (hours) and refreshed by logging in again.</li>
        <li><b>Machines use roles, not keys:</b> an EC2 instance that needs S3 gets an <b>IAM role</b> through an instance profile. The SDKs and CLI on the instance pick up temporary credentials from the instance metadata service automatically.</li>
      </ol>
      <p>🔵 <b>Why not long-lived access keys?</b> An access key (<code>AKIA...</code>) works from anywhere on the internet until someone deletes it. Keys end up in Git history, laptop backups, CI logs and screenshots; bots scan public GitHub for them within minutes and start crypto-mining instances on your bill. Role and SSO credentials expire on their own, are tied to a login with MFA, and show up in CloudTrail under a named session. IAM in depth (policies, least privilege, MFA, when a key is unavoidable) is <b>Cloud &amp; DevOps 6</b>; here you need just enough to launch a VM safely.</p>`,
    clues: [
      '"whose job is it to patch the OS on my EC2 instance?" → yours (IaaS); on RDS or Lambda the provider patches the engine / runtime',
      '"our bucket was public and data leaked - is AWS liable?" → customer side: bucket policy and Block Public Access are your configuration',
      '"bill jumped to $4,000 overnight, instances in regions we never use" → leaked access key; rotate, check CloudTrail, use SSO and roles',
      '"how should the app on EC2 get S3 credentials?" → an <b>IAM role / instance profile</b>, never a key in a config file or user data',
      '"first thing to do in a new AWS account" → root MFA, no root keys, budget alert, SSO user for daily work',
      '"the hardware under my instance failed" → provider side; you see a scheduled event or status check failure, and stop/start moves it to new hardware'
    ],
    code: [R`# One-time: create an SSO profile (opens a browser to sign in; no keys are stored)
aws configure sso --profile lab
#   SSO session name: my-sso
#   SSO start URL:    https://my-company.awsapps.com/start   (your own portal URL)
#   SSO region:       eu-west-1
#   then pick the account (shown as 123456789012) and a permission set, e.g. PowerUserAccess

# Daily: log in (short-lived credentials, cached for a few hours)
aws sso login --profile lab
export AWS_PROFILE=lab

# Always confirm WHO you are before creating anything
aws sts get-caller-identity
# {
#   "UserId": "AROAEXAMPLEID:alice",
#   "Account": "123456789012",
#   "Arn": "arn:aws:sts::123456789012:assumed-role/AWSReservedSSO_PowerUserAccess_abc/alice"
# }

# Root safety checks (1 = present). Want: MFA enabled = 1, root access keys = 0
aws iam get-account-summary \
  --query 'SummaryMap.[AccountMFAEnabled,AccountAccessKeysPresent]' --output text`],
    codeTitle: ['SSO profile instead of access keys, and root checks'],
    viz: [{
      title: 'Who is responsible? Walk the layers for each service',
      input: 'EC2,RDS,S3,Lambda',
      inputLabel: 'services separated by commas (EC2, RDS, S3, Lambda, AzureVM, Blob)',
      gen: function (input) {
        var MAP = {
          EC2: ['Provider', 'Provider', 'You', 'You', 'You', 'You', 'You'],
          AzureVM: ['Provider', 'Provider', 'You', 'You', 'You', 'You', 'You'],
          RDS: ['Provider', 'Provider', 'Provider', 'Provider', 'You', 'You', 'You'],
          S3: ['Provider', 'Provider', 'Provider', 'Provider', 'You', 'You', 'You'],
          Blob: ['Provider', 'Provider', 'Provider', 'Provider', 'You', 'You', 'You'],
          Lambda: ['Provider', 'Provider', 'Provider', 'Provider', 'You (function URL, triggers)', 'You', 'You']
        };
        var NOTE = {
          EC2: 'IaaS: you get a virtual machine and everything inside it is yours - patching, firewall inside the OS, agents, users.',
          AzureVM: 'Same as EC2: Azure secures the host; the guest OS, NSG rules and data are yours.',
          RDS: 'Managed database: AWS patches the OS and engine in your maintenance window; you still choose who can connect and whether it is public.',
          S3: 'Storage service: AWS keeps 11 nines of durability; you decide who can read, via policies and Block Public Access.',
          Blob: 'Azure Blob: Microsoft runs the storage; you control public access level, SAS tokens and RBAC.',
          Lambda: 'Serverless: no OS for you at all, but the code, its IAM role and its triggers are still yours.'
        };
        var layers = ['Physical data centre', 'Hardware + hypervisor', 'Guest OS patching', 'Engine / runtime patching', 'Network exposure', 'Identity + permissions (IAM)', 'Data + encryption choices'];
        var list = String(input || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
        if (!list.length || list.length > 6) throw new Error('Give 1-6 services, e.g. EC2,RDS,S3,Lambda');
        list.forEach(function (s) { if (!MAP[s]) throw new Error('Unknown service "' + s + '". Use EC2, RDS, S3, Lambda, AzureVM or Blob'); });
        var f = [{ narr: 'The stack from the ground up. The provider always owns the bottom (buildings, hardware). <b>You always own the top three rows</b>: what is exposed, who has access, and your data. Only the middle rows move.', parts: [{ type: 'table', label: 'layers', columns: ['layer'], rows: layers.map(function (l) { return [l]; }) }] }];
        var cols = ['layer'], rowsAcc = layers.map(function (l) { return [l]; });
        list.forEach(function (s) {
          cols = cols.concat([s]);
          rowsAcc = rowsAcc.map(function (r, i) { return r.concat([MAP[s][i]]); });
          var mine = MAP[s].filter(function (x) { return x.indexOf('You') === 0; }).length;
          var hl = {};
          MAP[s].forEach(function (x, i) { if (x.indexOf('You') === 0) hl[i] = 'cur'; });
          f.push({ narr: '<b>' + s + '</b>: ' + NOTE[s] + ' You own <b>' + mine + ' of 7</b> layers.', parts: [{ type: 'table', label: 'who is responsible', columns: cols.slice(), rows: rowsAcc.map(function (r) { return r.slice(); }), hl: hl }, { type: 'bars', label: 'layers you own (' + s + ')', values: [mine, 7 - mine], idxLabels: ['you', 'provider'], hl: { 0: 'cur' } }] });
        });
        f.push({ narr: 'Pattern: moving from VMs to managed and serverless services <b>shrinks</b> your patching work but <b>never</b> removes access control and data. Every famous cloud data leak (public buckets, open databases, leaked keys) happened in the rows that are always yours.', parts: [{ type: 'table', label: 'always yours', columns: ['layer', 'typical mistake'], rows: [['Network exposure', 'SSH or a database open to 0.0.0.0/0'], ['Identity + permissions', 'access key in GitHub, admin for everyone'], ['Data + encryption', 'public bucket, no backups, no versioning']], hl: { 0: 'bad', 1: 'bad', 2: 'bad' } }] });
        return f;
      }
    }],
    examples: [
      { title: 'Ticket: "Is AWS responsible for patching my EC2 server?"', html: `<p>A customer's Ubuntu instance was flagged by a scanner for an OpenSSL CVE. They assumed AWS patches it. Answer: EC2 is infrastructure as a service, so the <b>guest OS is the customer's</b> - run <code>sudo apt update &amp;&amp; sudo apt upgrade</code> (Cloud &amp; DevOps 1), or automate with Systems Manager Patch Manager. AWS patches the <i>host</i> and hypervisor; if that ever needs a reboot you see a <b>scheduled event</b> on the instance. If they want AWS to patch the database engine, a managed service such as RDS moves that row to AWS.</p>` },
      { title: 'Incident: access key found on GitHub', html: `<p>A developer pushed <code>~/.aws/credentials</code> to a public repo. Within minutes, AWS sent an "exposed credentials" email and there were 40 large GPU instances in regions the company never uses. Response, in order: (1) <b>deactivate and delete</b> the key, (2) check <b>CloudTrail</b> for what it did, (3) terminate the unknown instances in <b>every region</b>, (4) open a support case about the charges, (5) remove the file from Git history and move the developer to <b>SSO</b> profiles. Prevention: no long-lived keys for humans, secret scanning in CI (Cloud &amp; DevOps 4 and 16), and a budget alert that would have fired early.</p>`, code: R`# Find which user owns a leaked key id (the id, never the secret, is safe to share)
aws iam list-access-keys --user-name dev-alice --profile lab
aws iam update-access-key --user-name dev-alice --access-key-id AKIAIOSFODNN7EXAMPLE --status Inactive --profile lab
aws iam delete-access-key --user-name dev-alice --access-key-id AKIAIOSFODNN7EXAMPLE --profile lab
# Look for instances in every region (attackers pick regions you never check)
for r in $(aws ec2 describe-regions --query 'Regions[].RegionName' --output text); do
  echo "== $r"; aws ec2 describe-instances --region "$r" \
    --query 'Reservations[].Instances[].[InstanceId,InstanceType,State.Name]' --output text
done` },
      { title: 'An app on EC2 reads S3 with a role, not a key', html: `<p>Instead of writing a key into <code>/etc/myapp.conf</code>, attach an instance profile with a role allowing <code>s3:GetObject</code> on one bucket. On the instance, <code>aws s3 cp</code> just works: the CLI asks the instance metadata service (IMDSv2, a local address only the instance can reach) for temporary credentials that rotate automatically. Nothing secret is stored on disk or in the AMI. Writing the role's policy is covered in Cloud &amp; DevOps 6; here we only attach an existing one.</p>`, code: R`# Attach an existing instance profile to a running instance
aws ec2 associate-iam-instance-profile --instance-id i-0abc1234def567890 \
  --iam-instance-profile Name=web-s3-read --profile lab
# On the instance: no keys configured, yet this works through the role
aws sts get-caller-identity   # shows assumed-role/web-s3-read/i-0abc1234def567890
aws s3 cp s3://example-bucket-yourname/config/app.json /tmp/app.json` },
      { title: 'Azure and GCP say the same thing', html: `<p>Microsoft's version shows columns for on-premises, IaaS, PaaS and SaaS: as you move right, Microsoft takes over the OS, network controls and applications, but <b>information and data, devices, and accounts and identities are always the customer's</b>. Google Cloud calls its version "shared fate" and adds secure-by-default blueprints, but the split is the same. On Azure the "no keys" advice becomes: use <b>Microsoft Entra ID</b> sign-in and <b>managed identities</b> for VMs instead of storage account keys.</p>` }
    ],
    deepDive: `<p>🟣 <b>Inherited, shared and customer controls.</b> Auditors split controls three ways. <b>Inherited</b> controls come entirely from the provider (physical security, media destruction) - you show the provider's SOC 2 or ISO 27001 reports (AWS Artifact) as evidence. <b>Shared</b> controls exist on both sides with different meaning: patching (AWS patches hosts, you patch guests), configuration management, awareness training. <b>Customer-specific</b> controls are yours alone: data classification, which regions you use, your IAM design. Being able to say this in an interview signals you understand compliance, not just tooling.</p>
      <p><b>How credentials really work on EC2.</b> The instance metadata service lives at a link-local address (<code>169.254.169.254</code>). With <b>IMDSv2</b> a process first PUTs to get a session token, then asks for <code>/latest/meta-data/iam/security-credentials/ROLE</code>; the answer is an access key, secret and session token valid for a few hours, rotated before expiry. IMDSv2 (session-token based) blocks a whole class of server-side request forgery attacks that stole credentials through IMDSv1, so set <code>HttpTokens=required</code> at launch; recent AMIs such as Amazon Linux 2023 already default to it.</p>
      <p><b>The credential chain.</b> The CLI and SDKs look for credentials in a fixed order: command-line options, environment variables (<code>AWS_ACCESS_KEY_ID</code>...), the shared config and credentials files (profiles, including SSO), container credentials, then the instance metadata service. A forgotten <code>AWS_ACCESS_KEY_ID</code> in <code>.bashrc</code> silently wins over the instance role - a common "why am I the wrong identity?" ticket, solved by <code>aws sts get-caller-identity</code> and <code>aws configure list</code>.</p>
      <p><b>Organisation-level guardrails.</b> Bigger companies use AWS Organizations with several accounts (dev, prod, security, logs) and <b>service control policies</b> that, for example, deny all actions outside approved regions - which would have stopped the leaked-key miners above. Control Tower sets this up as a landing zone. You will meet these in Cloud &amp; DevOps 6 and 16.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> assistants are good at explaining which side of the model a finding falls on, drafting an incident checklist for a leaked key, and reviewing a CloudFormation or Terraform file for public buckets or wide-open security groups. Security tools now use models to summarise findings from GuardDuty or Security Hub into plain language.</p>
      <p><b>Where it goes wrong:</b> the most common bad suggestion is still "run <code>aws configure</code> and paste your access key" - copied from years of old tutorials - and code samples with keys inline. Models also invent IAM actions or claim a managed service patches things it does not. <b>Never paste real keys, account ids or customer data into a chat tool.</b> Use the documentation placeholders (<code>123456789012</code>, <code>AKIAIOSFODNN7EXAMPLE</code>) when asking for help. <b>What you must still own:</b> knowing where the line is for each service your company uses, and insisting on SSO and roles even when a key would be "quicker".</p>`,
    problems: [P({
      t: 'Make a brand-new AWS account safe before the first lab', l: 'Easy', tags: ['shared responsibility', 'root user', 'MFA', 'SSO', 'budgets'], co: ['AWS Support', 'Deloitte'],
      s: `<p>You just created a personal AWS account to practise for interviews. Before launching anything, set it up so that (1) the root user is protected and not used day to day, (2) you sign in to the CLI <b>without</b> long-lived access keys, (3) you get an email if spending passes $5 in a month, and (4) you can prove all three with read-only commands. Describe the console steps and give the CLI.</p>`,
      c: `<p>A new account; one browser; AWS CLI v2. Everything here is free (budgets: the first two are free; IAM Identity Center is free). Use the placeholder account id <code>123456789012</code> and your own email.</p>`,
      ex: `<p>After setup: <code>aws iam get-account-summary</code> shows ${H.c('g', 'AccountMFAEnabled = 1')} and ${H.c('g', 'AccountAccessKeysPresent = 0')}; <code>aws sts get-caller-identity --profile lab</code> shows an <b>assumed-role/AWSReservedSSO_...</b> ARN (temporary credentials), and <code>aws budgets describe-budgets</code> lists <code>monthly-5-usd</code>.</p>`,
      bw: `<p>Create an access key for the root user, run <code>aws configure</code> and paste it in, "just for the labs". That key can do <b>anything</b> in the account, including closing it, never expires, and lives in plain text in <code>~/.aws/credentials</code>. One leak (a public dotfiles repo, a screenshot) and someone else runs up your bill.</p>`,
      bc: `aws configure            # pastes a ROOT access key into ~/.aws/credentials - never do this
aws s3 ls                # works... for you and for anyone who copies that file`,
      q: ['Which is the best daily way to use the AWS CLI on your laptop?', ['An IAM Identity Center (SSO) profile with short-lived credentials', 'A root user access key', 'An IAM user access key that never rotates', 'Sharing a teammate\'s key'], 0, 'SSO credentials expire within hours, are tied to an MFA login and need no secret on disk. Root keys and long-lived IAM keys work until deleted, from anywhere.'],
      h: ['<p>Hint 1: the root user signs in with an email address. In the console: account menu → Security credentials → assign an MFA device. Do not create access keys there.</p>', '<p>Hint 2: enable <b>IAM Identity Center</b>, create a user for yourself and give it a permission set (for a lab account, <code>AdministratorAccess</code> or <code>PowerUserAccess</code>), then <code>aws configure sso</code>.</p>', '<p>Hint 3: a budget needs two JSON files (the budget and the notification). Verify with read-only calls: <code>get-account-summary</code>, <code>sts get-caller-identity</code>, <code>budgets describe-budgets</code>.</p>'],
      a: `<p><b>Console, as root, one time:</b> sign in with the root email → account menu → <i>Security credentials</i> → assign an MFA device (an authenticator app or a passkey/security key). Confirm there are no root access keys. Then open <i>Billing and Cost Management → Budgets</i> or use the CLI below once you have a profile. Open <b>IAM Identity Center</b> → enable → create user <code>alice</code> with your email → assign the account with a permission set. Sign out of root and keep its MFA somewhere safe.</p><p><b>CLI, as your SSO user:</b> run <code>aws configure sso --profile lab</code> with the start URL from Identity Center; this stores <i>no secret</i>, only where to log in. <code>aws sso login</code> gives credentials valid for hours. Create a monthly cost budget of $5 with alerts at 80% actual and 100% forecasted. Finally verify all three with read-only commands. Explain the why: root MFA protects the one identity that cannot be limited; SSO avoids keys that never expire; the budget is your smoke alarm for forgotten resources.</p>`,
      code: R`#!/usr/bin/env bash
# Run AFTER the console steps (root MFA on, Identity Center user created).
set -euo pipefail
aws configure sso --profile lab          # interactive, browser sign-in, stores no secret
aws sso login --profile lab
export AWS_PROFILE=lab
ACCOUNT=$(aws sts get-caller-identity --query Account --output text)   # e.g. 123456789012

# Budget: $5 per month, email at 80% of actual and 100% of forecast
cat > budget.json <<'JSON'
{"BudgetName": "monthly-5-usd", "BudgetLimit": {"Amount": "5", "Unit": "USD"},
 "TimeUnit": "MONTHLY", "BudgetType": "COST"}
JSON
cat > notify.json <<'JSON'
[{"Notification": {"NotificationType": "ACTUAL", "ComparisonOperator": "GREATER_THAN",
   "Threshold": 80, "ThresholdType": "PERCENTAGE"},
  "Subscribers": [{"SubscriptionType": "EMAIL", "Address": "you@example.com"}]},
 {"Notification": {"NotificationType": "FORECASTED", "ComparisonOperator": "GREATER_THAN",
   "Threshold": 100, "ThresholdType": "PERCENTAGE"},
  "Subscribers": [{"SubscriptionType": "EMAIL", "Address": "you@example.com"}]}]
JSON
aws budgets create-budget --account-id "$ACCOUNT" \
  --budget file://budget.json --notifications-with-subscribers file://notify.json

# Prove it (all read-only)
aws iam get-account-summary --query 'SummaryMap.[AccountMFAEnabled,AccountAccessKeysPresent]' --output text  # want: 1 0
aws sts get-caller-identity --query Arn --output text       # want: ...assumed-role/AWSReservedSSO_...
aws budgets describe-budgets --account-id "$ACCOUNT" --query 'Budgets[].BudgetName' --output text
ls ~/.aws/credentials 2>/dev/null && echo "WARNING: a static credentials file exists - check it" || echo "no static keys on disk"`,
      cx: `<p>About 15 minutes, one time. Cost: $0. The budget emails can arrive up to a few hours after spend happens (billing data is not real time), which is why the forecast alert matters.</p>`,
      f: ['How would you also block all regions you never use (hint: Organizations SCP)?', 'What is a "break-glass" user and why keep one?']
    })]
  });

  // ───────────────────────── Topic 3: virtual machines ─────────────────────────
  topics.push({
    title: 'Virtual Machines: Launching, Connecting to and Cleaning Up EC2 and Azure VMs',
    analogy: `<p>A virtual machine is a <b>hotel room</b> carved out of a big building (the physical server). You pick the room size (instance type), the furniture it comes with (the image), the key you use to get in (key pair or Session Manager), which corridor it opens onto (subnet and security group), and a note for housekeeping to set things up before you arrive (user data). You pay per second while you hold the room. <b>Stopping</b> is checking out but keeping your luggage in storage (you still pay for the luggage: the disks). <b>Terminating</b> is checking out for good.</p>`,
    explain: `<p>🟢 <b>A VM is a computer you rent by the second.</b> A hypervisor (on AWS, the Nitro system) splits a physical server into isolated virtual machines, each with its own vCPUs, memory, disks and network card. You get root on the guest OS; the provider runs the hardware. To launch one you choose six things:</p>
      ${H.table(['Ingredient', 'AWS (EC2)', 'Azure', 'GCP'], [
        ['Image (OS template)', 'AMI, e.g. Amazon Linux 2023, Ubuntu 24.04', 'Image (Marketplace or Compute Gallery)', 'Image (image family)'],
        ['Size', 'Instance type (<code>t3.micro</code>)', 'VM size (<code>Standard_B1s</code>)', 'Machine type (<code>e2-micro</code>)'],
        ['Network', 'VPC, subnet, security group', 'VNet, subnet, NSG', 'VPC network, subnet, firewall rules'],
        ['Login', 'Key pair, EC2 Instance Connect, SSM Session Manager', 'SSH key, Bastion, Entra ID login', 'SSH keys, OS Login, IAP'],
        ['Boot-time setup', 'User data (cloud-init)', 'Custom data (cloud-init)', 'Startup script (metadata)'],
        ['Machine identity', 'IAM role via instance profile', 'Managed identity', 'Service account'],
        ['Grouping for cleanup', 'Tags (and CloudFormation stacks)', '<b>Resource group</b> - delete the group, delete everything', 'Project / labels']
      ])}
      <p>🟢 <b>Lifecycle and billing</b> (Linux on-demand is billed per second, minimum 60 seconds):</p>
      ${H.table(['State / action', 'Compute billed?', 'Disk (EBS) billed?', 'Public IPv4', 'Instance store data'], [
        ['<b>running</b>', H.c('r', 'yes'), 'yes', 'kept (billed per hour, example $0.005/h)', 'kept'],
        ['<b>reboot</b>', 'yes (same host)', 'yes', 'kept', 'kept'],
        ['<b>stop</b> → stopped', H.c('g', 'no'), H.c('r', 'yes'), H.c('y', 'released - you get a new one on start'), H.c('r', 'lost')],
        ['<b>start</b> again', 'yes (usually a new host)', 'yes', 'new address', 'empty'],
        ['<b>terminate</b>', 'no', 'root volume deleted if <code>DeleteOnTermination</code> (the default for root); extra volumes often survive', 'released', 'lost']
      ])}
      <p>🔵 <b>User data</b> is a script that cloud-init runs <b>once, as root, at the first boot</b>. It is how you turn a blank image into a web server without logging in: install packages, write config, start services. Its output goes to <code>/var/log/cloud-init-output.log</code> - the first place to look when "my instance launched but nginx is not there". Never put secrets in user data: anyone with <code>ec2:DescribeInstanceAttribute</code> can read it, and so can any process on the instance through the metadata service.</p>
      <p>🔵 <b>Connecting.</b> Classic: SSH with a key pair, port 22 open <b>only to your IP</b>. Better: <b>Session Manager</b> - the SSM agent on the instance calls out to AWS, so you need no open inbound port, no key, and every session is logged; the instance needs a role with the <code>AmazonSSMManagedInstanceCore</code> policy. Default user names: <code>ec2-user</code> (Amazon Linux), <code>ubuntu</code> (Ubuntu), <code>azureuser</code> (the Azure CLI default).</p>
      <p>🔵 <b>Cleaning up is part of the lab.</b> Terminate instances, then check for things that outlive them: extra EBS volumes, snapshots, Elastic IPs, key pairs, security groups. On Azure, put every lab in its own resource group and delete the group.</p>`,
    clues: [
      '"I stopped my instance, why am I still paying?" → EBS volumes (and Elastic IPs, snapshots) are billed while stopped; only compute stops',
      '"after a stop/start my DNS / SSH address changed" → auto-assigned public IPv4 is released on stop; use an Elastic IP or DNS name, or a load balancer',
      '"instance launched but the website is not there" → user data failed: read <code>/var/log/cloud-init-output.log</code>',
      '"we need to SSH but security does not allow port 22" → SSM Session Manager (outbound only, logged, no keys)',
      '"lost data on the local NVMe disk after a stop" → instance store is ephemeral; durable data belongs on EBS or S3',
      '"how do I make sure lab resources get deleted?" → tags + a cleanup script on AWS; one resource group per lab on Azure'
    ],
    code: [R`#!/usr/bin/env bash
# Launch a free-tier-sized web server with user data, test it, and clean up.
# COST: t3.micro + 8 GiB gp3 + public IPv4 is roughly $0.02 per hour (example prices,
# eu-west-1, 2026; free-tier credits may cover it). Terminate when done.
set -euo pipefail
export AWS_PROFILE=lab AWS_REGION=eu-west-1

# 1. User data: runs once as root on first boot
cat > user-data.sh <<'EOF2'
#!/bin/bash
dnf -y install nginx
TOKEN=$(curl -sX PUT http://169.254.169.254/latest/api/token -H 'X-aws-ec2-metadata-token-ttl-seconds: 300')
AZ=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/placement/availability-zone)
echo "<h1>Hello from $(hostname) in $AZ</h1>" > /usr/share/nginx/html/index.html
systemctl enable --now nginx
EOF2

# 2. Network: default VPC, and a security group allowing HTTP from my IP only
VPC=$(aws ec2 describe-vpcs --filters Name=is-default,Values=true --query 'Vpcs[0].VpcId' --output text)
MYIP=$(curl -s https://checkip.amazonaws.com)
SG=$(aws ec2 create-security-group --group-name web-lab-sg --description "web lab" \
  --vpc-id "$VPC" --query GroupId --output text)
aws ec2 authorize-security-group-ingress --group-id "$SG" --protocol tcp --port 80 --cidr "$MYIP/32"

# 3. Launch: the AMI id is resolved from a public SSM parameter (always the latest AL2023)
ID=$(aws ec2 run-instances \
  --image-id resolve:ssm:/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64 \
  --instance-type t3.micro \
  --security-group-ids "$SG" \
  --user-data file://user-data.sh \
  --metadata-options HttpTokens=required \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=web-lab},{Key=lab,Value=devops05}]' \
  --query 'Instances[0].InstanceId' --output text)
aws ec2 wait instance-running --instance-ids "$ID"
IP=$(aws ec2 describe-instances --instance-ids "$ID" \
  --query 'Reservations[0].Instances[0].PublicIpAddress' --output text)
echo "instance $ID at http://$IP (give cloud-init a minute)"
sleep 60; curl -s "http://$IP" || echo "not ready yet - check /var/log/cloud-init-output.log"

# 4. CLEANUP: terminate, wait, then delete the security group
aws ec2 terminate-instances --instance-ids "$ID" > /dev/null
aws ec2 wait instance-terminated --instance-ids "$ID"
aws ec2 delete-security-group --group-id "$SG"
echo "cleaned up $ID and $SG"`, R`# Azure equivalent: one resource group per lab makes cleanup one command.
# COST: Standard_B1s is free-tier eligible for 12 months on a new Azure free account.
az group create --name rg-devops05-lab --location westeurope
az vm create --resource-group rg-devops05-lab --name vm-web \
  --image Ubuntu2404 --size Standard_B1s \
  --admin-username azureuser --generate-ssh-keys \
  --custom-data cloud-init.yaml --public-ip-sku Standard
az vm open-port --resource-group rg-devops05-lab --name vm-web --port 80
# CLEANUP: deletes the VM, disk, NIC, public IP, NSG and VNet together
az group delete --name rg-devops05-lab --yes --no-wait`],
    codeTitle: ['AWS CLI: launch with user data, test, clean up', 'Azure CLI: the same lab in a resource group'],
    viz: [{
      title: 'Instance lifecycle: what you pay for in each state',
      input: 'launch,stop,start,reboot,terminate',
      inputLabel: 'actions separated by commas: launch, stop, start, reboot, terminate',
      gen: function (input) {
        var acts = String(input || '').split(',').map(function (s) { return s.trim().toLowerCase(); }).filter(Boolean);
        if (!acts.length || acts.length > 10) throw new Error('Give 1-10 actions, e.g. launch,stop,start,terminate');
        var ST = ['pending', 'running', 'stopping', 'stopped', 'shutting-down', 'terminated'];
        var X = { pending: 10, running: 32, stopping: 54, stopped: 76, 'shutting-down': 54, terminated: 90 };
        var Y = { pending: 10, running: 10, stopping: 10, stopped: 10, 'shutting-down': 40, terminated: 40 };
        function graph(cur) {
          var hl = {}; hl[cur] = cur === 'terminated' ? 'done' : cur === 'running' ? 'ok' : 'cur';
          return { type: 'graph', label: 'EC2 states', directed: true, height: 50, nodes: ST.map(function (s) { return box(s, s, X[s], Y[s], 16); }),
            edges: [['pending', 'running'], ['running', 'stopping'], ['stopping', 'stopped'], ['stopped', 'pending', 'start'], ['running', 'shutting-down'], ['stopped', 'shutting-down'], ['shutting-down', 'terminated']], hl: hl };
        }
        var st = 'none', ip = 0, ipText = '-', f = [], data = '-';
        function vars(compute, ebs) { return { type: 'vars', label: 'billing and data', vals: { state: st, computeBilled: compute, ebsBilled: ebs, publicIPv4: ipText, instanceStore: data } }; }
        f.push({ narr: 'Nothing exists yet. Each action below changes the state and what you are billed for. Watch the <b>EBS</b> row: it is the one people forget.', parts: [graph('pending'), vars('no', 'no')] });
        acts.forEach(function (a) {
          if (a === 'launch') {
            if (st !== 'none') throw new Error('launch only works first');
            st = 'running'; ip++; ipText = '203.0.113.' + (10 + ip); data = 'empty, usable';
            f.push({ narr: '<b>launch</b>: <code>run-instances</code> → <b>pending</b> (AWS finds a host, attaches the root EBS volume, boots, runs user data) → <b>running</b>. Per-second billing starts at running. An auto-assigned public IP is attached.', parts: [graph('running'), vars('yes (per second)', 'yes')] });
          } else if (a === 'stop') {
            if (st !== 'running') throw new Error('stop needs a running instance (state is ' + st + ')');
            st = 'stopped'; ipText = 'released'; data = 'LOST';
            f.push({ narr: '<b>stop</b>: the OS shuts down, compute billing stops, but the <b>EBS volumes stay and are billed</b>. The public IPv4 goes back to AWS. Anything on instance-store disks is <b>gone</b>.', parts: [graph('stopped'), vars('no', 'YES - still billed')] });
          } else if (a === 'start') {
            if (st !== 'stopped') throw new Error('start needs a stopped instance (state is ' + st + ')');
            st = 'running'; ip++; ipText = '203.0.113.' + (10 + ip) + ' (NEW)'; data = 'empty again';
            f.push({ narr: '<b>start</b>: back through pending to running, usually on a <b>different physical host</b> (this is also how you escape failing hardware). Same instance id, same private IP and EBS data, but a <b>new public IP</b> - DNS records or SSH configs that used the old one break.', parts: [graph('running'), vars('yes', 'yes')] });
          } else if (a === 'reboot') {
            if (st !== 'running') throw new Error('reboot needs a running instance (state is ' + st + ')');
            f.push({ narr: '<b>reboot</b>: an OS restart on the <b>same host</b>. The state stays running, billing continues, the public IP and instance-store data are kept. Use it for kernel updates; use stop/start to move hosts.', parts: [graph('running'), vars('yes', 'yes')] });
          } else if (a === 'terminate') {
            if (st !== 'running' && st !== 'stopped') throw new Error('terminate needs a running or stopped instance');
            st = 'terminated'; ipText = 'released'; data = 'LOST';
            f.push({ narr: '<b>terminate</b>: shutting-down → terminated (visible for about an hour, then gone). The root volume is deleted because <code>DeleteOnTermination=true</code> by default. <b>Extra volumes attached later default to false and keep billing</b> - check <code>describe-volumes --filters Name=status,Values=available</code>.', parts: [graph('terminated'), vars('no', 'root: deleted; extra volumes: maybe still billed')] });
          } else throw new Error('Unknown action "' + a + '"');
        });
        if (f.length < 4) f.push({ narr: 'Try a longer sequence such as <code>launch,stop,start,terminate</code> to see the IP change and the EBS trap.', parts: [graph(st === 'none' ? 'pending' : st), vars('-', '-')] });
        return f;
      }
    }],
    examples: [
      { title: 'Ticket: "I stopped all my instances and still got a bill"', html: `<p>The customer stopped 5 instances for a month. The bill shows ${H.c('r', 'EBS: $40')} and ${H.c('r', 'Public IPv4: $18')}. Stopped instances keep their volumes (5 x 100 GiB gp3 x $0.08 per GB-month = $40, example price) and any <b>Elastic IPs</b> are billed whether attached or not (5 x 730 h x $0.005 = $18.25). Advice: if the servers are not needed, snapshot or image them and <b>terminate</b>; release unused Elastic IPs. Prices are examples and change - always check the pricing page.</p>`, code: R`aws ec2 describe-instances --filters Name=instance-state-name,Values=stopped \
  --query 'Reservations[].Instances[].[InstanceId,LaunchTime]' --output text
aws ec2 describe-volumes --filters Name=attachment.status,Values=attached \
  --query 'Volumes[].[VolumeId,Size,Attachments[0].InstanceId]' --output text
aws ec2 describe-addresses --query 'Addresses[].[PublicIp,AllocationId,InstanceId]' --output text` },
      { title: 'User data did not run: reading cloud-init logs', html: `<p>A new instance answers ping but not HTTP. Connect with Session Manager and check cloud-init. Here the user data started with <code>#!/bin/sh</code> but used Bash syntax, and on another try a Windows-edited script had CRLF line endings, so cloud-init could not find <code>/bin/bash\r</code>. Fix the script and launch a <b>new</b> instance (user data runs only on first boot by default).</p>`, code: R`aws ssm start-session --target i-0abc1234def567890 --profile lab
# on the instance:
sudo tail -n 50 /var/log/cloud-init-output.log
cloud-init status --long
sudo cat /var/lib/cloud/instance/user-data.txt | head -n 3 | od -c | head   # spot \r (CRLF)` },
      { title: 'Connecting without opening port 22', html: `<p>A bank does not allow inbound SSH. The instance gets a role with <code>AmazonSSMManagedInstanceCore</code>, sits in a subnet with outbound access to the SSM endpoints, and the security group has <b>no inbound rules at all</b>. Engineers run <code>aws ssm start-session</code>; sessions are authorised by IAM and logged. SSH over Session Manager also works for <code>scp</code> by adding a <code>ProxyCommand</code>.</p>`, code: R`# ~/.ssh/config entry: SSH tunnelled through Session Manager (no open port)
cat >> ~/.ssh/config <<'EOF2'
Host i-*
    User ec2-user
    ProxyCommand aws ssm start-session --target %h --document-name AWS-StartSSHSession --parameters portNumber=%p --profile lab
EOF2
ssh i-0abc1234def567890 'uptime'` },
      { title: 'Finding everything a lab left behind', html: `<p>Tag every lab resource (<code>lab=devops05</code>) at creation. The Resource Groups Tagging API then lists anything tagged, across services, so nothing is forgotten. Terminated instances still show for about an hour; volumes, snapshots and Elastic IPs do not disappear on their own.</p>`, code: R`aws resourcegroupstaggingapi get-resources --tag-filters Key=lab,Values=devops05 \
  --query 'ResourceTagMappingList[].ResourceARN' --output text --profile lab
aws ec2 describe-volumes --filters Name=status,Values=available \
  --query 'Volumes[].[VolumeId,Size,CreateTime]' --output text --profile lab   # unattached = paying for nothing` }
    ],
    deepDive: `<p>🟣 <b>What is under the VM.</b> Modern EC2 runs on the <b>Nitro System</b>: dedicated cards handle networking, EBS storage and management, and a thin hypervisor gives almost all of the host's CPU and memory to guests. That is why EBS volumes appear as NVMe devices (<code>/dev/nvme1n1</code>) even though they are network storage, and why "bare metal" instance types exist. Azure uses its own hypervisor with accelerated networking; GCP uses KVM.</p>
      <p><b>Status checks.</b> EC2 runs two checks every minute: the <b>system status check</b> (AWS side: host, power, network - fix by stop/start, which moves you to new hardware) and the <b>instance status check</b> (your side: the OS did not boot, a full disk, a bad fstab, wrong network config - fix inside the OS, often via the serial console or by attaching the root volume to a rescue instance). Newer instances add an attached-EBS status check. A CloudWatch alarm on the system check can trigger <b>auto recovery</b>.</p>
      <p><b>Placement and tenancy.</b> Placement groups control how instances are spread: <i>cluster</i> (same rack, lowest latency, for HPC), <i>spread</i> (different racks, max 7 per AZ per group, for small critical sets) and <i>partition</i> (groups of racks, for Kafka or HDFS). Dedicated Hosts exist for licences tied to physical cores. Most workloads need none of this.</p>
      <p><b>Limits and errors you will see in tickets.</b> <code>VcpuLimitExceeded</code> - new accounts have low on-demand vCPU quotas per instance family (raise in Service Quotas). <code>InsufficientInstanceCapacity</code> - that type is temporarily out in that AZ (try another AZ or type). <code>UnauthorizedOperation</code> - IAM; decode the message with <code>aws sts decode-authorization-message</code>. <code>InvalidAMIID.NotFound</code> - AMI ids are <b>per region</b>; the same Amazon Linux release has a different id in each region, which is exactly why we resolve it from an SSM parameter instead of hard-coding it.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> assistants write good first drafts of user data scripts and cloud-init YAML, turn a console click-path into the equivalent <code>run-instances</code> command, and explain status-check failures or a <code>decode-authorization-message</code> output. Infrastructure-as-code tools with AI help (Cloud &amp; DevOps 9) can generate a whole launch template.</p>
      <p><b>Where it goes wrong:</b> generated commands often hard-code an AMI id copied from another region or year, open port 22 to <code>0.0.0.0/0</code>, skip <code>HttpTokens=required</code>, choose a large instance type "to be safe", and almost never include cleanup. Some put access keys or passwords into user data. <b>How to work with it:</b> ask explicitly for "free-tier size, AMI from SSM parameter, SG limited to my IP, IMDSv2, tags, and a cleanup section", then read every flag. <b>What you must still own:</b> the cost of what you launch, where it is reachable from, and making sure it is gone when the lab ends.</p>`,
    problems: [P({
      t: 'Launch a web server with user data from the CLI, then clean up completely', l: 'Easy', tags: ['EC2', 'user data', 'security groups', 'cleanup'], co: ['AWS Support', 'Infosys', 'TCS'],
      s: `<p>Your lead asks for a quick demo web page on EC2 that says which AZ it runs in. Do it entirely with the AWS CLI: find the latest Amazon Linux 2023 AMI <b>without hard-coding its id</b>, use a free-tier-eligible type, install nginx through <b>user data</b>, allow HTTP only from your own IP, require IMDSv2, tag everything, prove it works with <code>curl</code>, and then remove <b>every</b> resource you created.</p>`,
      ex: `<p><code>aws ssm get-parameter</code> returns an id like <code>ami-0abcdef1234567890</code> for <b>this</b> region. After launch and about a minute of cloud-init, <code>curl http://203.0.113.25</code> prints ${H.c('g', '&lt;h1&gt;Hello from ip-172-31-5-9 in eu-west-1b&lt;/h1&gt;')}. After cleanup, <code>get-resources --tag-filters Key=lab,Values=demo</code> returns ${H.c('g', 'nothing')} (terminated instances may show briefly).</p>`,
      bw: `<p>Copy an AMI id from a blog post and click through the console with defaults: the id belongs to another region (<code>InvalidAMIID.NotFound</code>) or is years old and unpatched; the wizard's new security group opens SSH to <code>0.0.0.0/0</code>; nothing is tagged, so a week later nobody knows what <code>i-0f3...</code> is, and it keeps running.</p>`,
      q: ['Why resolve the AMI from <code>/aws/service/ami-amazon-linux-latest/...</code> instead of pasting an id?', ['AMI ids differ per region and change with every release; the parameter always points to the latest one in your region', 'Pasted ids are not allowed by the API', 'The SSM parameter is cheaper', 'It makes the instance free tier'], 0, 'Public SSM parameters are maintained by AWS per region. Resolving them keeps scripts portable across regions and always on a patched image.'],
      h: ['<p>Hint 1: <code>aws ssm get-parameter --name /aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64</code>, or pass <code>resolve:ssm:...</code> straight to <code>--image-id</code>.</p>', '<p>Hint 2: user data is a normal Bash script starting with <code>#!/bin/bash</code>; it runs as root once. Read the AZ from IMDSv2 (PUT for a token first).</p>', '<p>Hint 3: cleanup order matters: terminate → <code>wait instance-terminated</code> → delete the security group (it cannot be deleted while an instance uses it). Check for leftover volumes.</p>'],
      a: `<p>1) Set a profile and region. 2) Look up the AMI id from the public SSM parameter (print it, so the run is auditable). 3) Write user data that installs nginx, asks IMDSv2 for the AZ and writes the page. 4) Find the default VPC, create a security group, allow TCP 80 from <code>MYIP/32</code> only (no SSH at all - use Session Manager if you must log in). 5) <code>run-instances</code> with <code>t3.micro</code> (or <code>t4g.micro</code> with the arm64 parameter), <code>HttpTokens=required</code> and tags on both the instance and its volume. 6) Wait for running, get the public IP, wait for cloud-init, curl. 7) Clean up in dependency order and verify with the tagging API and an "available volumes" check. Cost: a few cents for under an hour (example prices), mostly the instance, its 8 GiB volume and the public IPv4.</p>`,
      code: R`#!/usr/bin/env bash
set -euo pipefail
export AWS_PROFILE=lab AWS_REGION=eu-west-1
TAGS='{Key=lab,Value=demo},{Key=owner,Value=yourname}'

AMI=$(aws ssm get-parameter \
  --name /aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64 \
  --query Parameter.Value --output text)
echo "AMI for $AWS_REGION: $AMI"

cat > user-data.sh <<'EOF2'
#!/bin/bash
set -euxo pipefail
dnf -y install nginx
TOKEN=$(curl -sX PUT http://169.254.169.254/latest/api/token -H 'X-aws-ec2-metadata-token-ttl-seconds: 300')
AZ=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/placement/availability-zone)
echo "<h1>Hello from $(hostname) in $AZ</h1>" > /usr/share/nginx/html/index.html
systemctl enable --now nginx
EOF2

VPC=$(aws ec2 describe-vpcs --filters Name=is-default,Values=true --query 'Vpcs[0].VpcId' --output text)
MYIP=$(curl -s https://checkip.amazonaws.com)
SG=$(aws ec2 create-security-group --group-name demo-web-sg --description "demo web, my IP only" \
  --vpc-id "$VPC" --tag-specifications "ResourceType=security-group,Tags=[$TAGS]" \
  --query GroupId --output text)
aws ec2 authorize-security-group-ingress --group-id "$SG" --protocol tcp --port 80 --cidr "$MYIP/32"

ID=$(aws ec2 run-instances --image-id "$AMI" --instance-type t3.micro \
  --security-group-ids "$SG" --user-data file://user-data.sh \
  --metadata-options HttpTokens=required,HttpEndpoint=enabled \
  --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=demo-web},$TAGS]" \
                       "ResourceType=volume,Tags=[$TAGS]" \
  --query 'Instances[0].InstanceId' --output text)
aws ec2 wait instance-running --instance-ids "$ID"
IP=$(aws ec2 describe-instances --instance-ids "$ID" \
  --query 'Reservations[0].Instances[0].PublicIpAddress' --output text)
for i in 1 2 3 4 5 6; do curl -sf "http://$IP" && break; sleep 20; done

# ---- CLEANUP (always run this part) ----
aws ec2 terminate-instances --instance-ids "$ID" > /dev/null
aws ec2 wait instance-terminated --instance-ids "$ID"
aws ec2 delete-security-group --group-id "$SG"
aws ec2 describe-volumes --filters Name=tag:lab,Values=demo Name=status,Values=available \
  --query 'Volumes[].VolumeId' --output text     # should print nothing
echo "done: $ID terminated, $SG deleted"`,
      cx: `<p>About 5 minutes end to end. Cost: under $0.05 for an hour of t3.micro + 8 GiB gp3 + one public IPv4 (example prices; check the calculator). The risk is entirely in skipping the cleanup block.</p>`,
      f: ['How would you run the cleanup even if the script fails halfway (hint: <code>trap</code>, Cloud &amp; DevOps 2)?', 'What changes for an arm64 <code>t4g.micro</code>?']
    })]
  });

  // ───────────────────────── Topic 4: images and instance types ─────────────────────────
  var CATALOG = ['t3.micro:2:1:0.0104', 't3.small:2:2:0.0208', 't3.medium:2:4:0.0416', 't3.large:2:8:0.0832', 't4g.medium:2:4:0.0336',
    'm7i.large:2:8:0.1008', 'm7g.large:2:8:0.0816', 'c7g.large:2:4:0.0725', 'c7i.xlarge:4:8:0.1785', 'c7g.xlarge:4:8:0.145',
    'r7g.large:2:16:0.1071', 'm7g.xlarge:4:16:0.1632', 'r7g.xlarge:4:32:0.2142'];
  topics.push({
    title: 'Images and Instance Types: AMIs, Golden Images and Reading Names like m7g.large',
    analogy: `<p>An <b>image</b> is a <b>cake mould plus recipe</b>: every server baked from it comes out the same shape, with the same OS and software. The <b>instance type</b> is the <b>size and kind of oven</b>: a small home oven (t3.micro) for a cupcake, a wide pizza oven (compute-optimised) for many quick jobs, a deep oven (memory-optimised) for a giant roast. You pick the mould for <i>what</i> runs, and the oven for <i>how much</i> and <i>what kind of</i> power it needs.</p>`,
    explain: `<p>🟢 <b>Images.</b> An <b>AMI</b> (Amazon Machine Image) is a template: one or more EBS snapshots (the root disk, maybe data disks) plus launch settings (architecture x86_64 or arm64, boot mode, block-device mapping). Sources: <b>AWS-provided</b> (Amazon Linux 2023), <b>vendors</b> (Ubuntu by Canonical, Red Hat, Windows), the <b>Marketplace</b> (pre-installed software, sometimes with an hourly licence fee), and <b>your own</b> "golden" images built from a configured instance. AMIs are <b>regional</b>: copy one with <code>copy-image</code> to use it elsewhere. Look up public ones by <b>SSM parameter</b> instead of pasting ids.</p>
      ${H.table(['Want', 'SSM parameter (public, per region)'], [
        ['Amazon Linux 2023, x86', '<code>/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64</code>'],
        ['Amazon Linux 2023, arm64 (Graviton)', '<code>/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-arm64</code>'],
        ['Ubuntu 24.04 LTS, x86', '<code>/aws/service/canonical/ubuntu/server/24.04/stable/current/amd64/hvm/ebs-gp3/ami-id</code>']
      ])}
      <p>🟢 <b>Instance types</b> are named <code>family</code> + <code>generation</code> + <code>attributes</code> <code>.size</code>. So <code>m7g.large</code> = general purpose (m), 7th generation, Graviton arm CPU (g), large (2 vCPUs, 8 GiB).</p>
      ${H.table(['Family', 'Optimised for', 'GiB per vCPU (typical)', 'Typical use', 'Azure series', 'GCP family'], [
        ['<b>t</b> (t3, t4g)', 'burstable, cheap', '0.5-4', 'dev boxes, small sites, labs (free tier)', 'B', 'E2 shared-core'],
        ['<b>m</b>', 'general purpose, balanced', '4', 'web/app servers, most things', 'D', 'N2/N4, E2'],
        ['<b>c</b>', 'compute (CPU)', '2', 'batch, encoding, busy APIs, CI runners', 'F', 'C3/C4'],
        ['<b>r</b>, <b>x</b>', 'memory', '8 / 16+', 'databases, caches, in-memory analytics', 'E, M', 'M3'],
        ['<b>i</b>, <b>d</b>', 'local NVMe storage', 'varies', 'NoSQL, search, big scratch disks', 'L', 'Z3 / local SSD'],
        ['<b>g</b>, <b>p</b>, inf, trn', 'GPU / ML accelerators', 'varies', 'ML training and inference, graphics', 'N', 'A3, G2, TPU']
      ])}
      ${H.table(['Attribute letter', 'Means'], [
        ['<b>g</b>', 'AWS Graviton (arm64) - often about 20% cheaper for similar work'],
        ['<b>i</b> / <b>a</b>', 'Intel / AMD processor'],
        ['<b>d</b>', 'local NVMe instance-store disks included (ephemeral)'],
        ['<b>n</b>', 'enhanced networking bandwidth'],
        ['<b>-flex</b>', 'Flex: cheaper, for workloads that do not need full CPU all the time']
      ])}
      <p>🔵 <b>Sizes</b> double each step: <code>large</code> = 2 vCPUs, <code>xlarge</code> = 4, <code>2xlarge</code> = 8, and so on; the price doubles too, so <b>two larges cost about the same as one xlarge</b>. The t family also has <code>nano</code>, <code>micro</code>, <code>small</code>, <code>medium</code>.</p>
      <p>🔵 <b>Picking a family</b>: start from the bottleneck. Measure CPU and memory (Cloud &amp; DevOps 1: <code>top</code>, <code>free -m</code>; or CloudWatch). CPU-bound and memory mostly free → <b>c</b>. Memory near full, CPU low → <b>r</b>. Both moderate → <b>m</b>. Mostly idle with short spikes → <b>t</b>. Then pick the smallest size with headroom, prefer the newest generation (better price-performance), and try Graviton if the software supports arm64 (most Linux packages, Java, Python, Node, Go and containers built multi-arch do).</p>
      <p>🔵 <b>Burstable credits.</b> A <code>t3.micro</code> earns CPU credits while it is below its <b>baseline</b> (about 10% of each vCPU for t3.micro) and spends them to burst to 100%. t3/t4g default to <b>unlimited</b> mode: if it stays above baseline after the credits run out, it keeps full speed but you pay a small extra charge per vCPU-hour. Constant high CPU on a t instance is a sign to move to m or c.</p>`,
    clues: [
      '"which instance type for X" → find the bottleneck first: CPU-bound → c, memory-bound → r, balanced → m, spiky/idle → t',
      '"the t3 server is slow every afternoon" → CPU credits exhausted (<code>CPUCreditBalance</code> near 0); move to m/c or check unlimited charges',
      '"InvalidAMIID.NotFound in the new region" → AMIs are regional: <code>copy-image</code> or resolve the SSM parameter in that region',
      '"we need the same setup on 20 servers quickly" → bake a golden AMI (or use user data / config management), launch from it',
      '"cheaper with the same performance" → newer generation and/or Graviton (g) - after checking arm64 support',
      '"exec format error after switching to t4g" → x86 binary on an arm64 instance; use arm64 builds or multi-arch images'
    ],
    code: [R`export AWS_PROFILE=lab AWS_REGION=eu-west-1
# Latest AMIs from public SSM parameters (the id is different in every region)
aws ssm get-parameter --name /aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-arm64 \
  --query Parameter.Value --output text
aws ssm get-parameter --name /aws/service/canonical/ubuntu/server/24.04/stable/current/amd64/hvm/ebs-gp3/ami-id \
  --query Parameter.Value --output text

# Compare instance types: vCPUs, memory, architecture
aws ec2 describe-instance-types --instance-types t3.micro t4g.small m7g.large c7i.large r7g.large \
  --query 'InstanceTypes[].[InstanceType,VCpuInfo.DefaultVCpus,MemoryInfo.SizeInMiB,ProcessorInfo.SupportedArchitectures[0]]' \
  --output table

# Which types are free-tier eligible for THIS account?
aws ec2 describe-instance-types --filters Name=free-tier-eligible,Values=true \
  --query 'InstanceTypes[].InstanceType' --output text

# Bake a golden image from a configured instance, then copy it to another region
AMI=$(aws ec2 create-image --instance-id i-0abc1234def567890 --name "web-golden-2026-10-19" \
  --description "nginx + agents, patched" --query ImageId --output text)
aws ec2 wait image-available --image-ids "$AMI"
aws ec2 copy-image --source-region eu-west-1 --source-image-id "$AMI" \
  --region eu-central-1 --name "web-golden-2026-10-19"

# CLEANUP an image you no longer need: deregister, then delete its snapshots (they keep billing)
SNAPS=$(aws ec2 describe-images --image-ids "$AMI" \
  --query 'Images[0].BlockDeviceMappings[].Ebs.SnapshotId' --output text)
aws ec2 deregister-image --image-id "$AMI"
for s in $SNAPS; do aws ec2 delete-snapshot --snapshot-id "$s"; done`],
    codeTitle: ['AMIs from SSM, comparing types, golden images and their cleanup'],
    viz: [{
      title: 'Decode instance type names',
      input: 'm7g.large c7i.xlarge r6id.2xlarge t3.micro',
      inputLabel: 'instance types separated by spaces (families t, m, c, r, x, i)',
      gen: function (input) {
        var FAM = { t: ['burstable', 0], m: ['general purpose', 4], c: ['compute optimised', 2], r: ['memory optimised', 8], x: ['extra memory', 16], i: ['storage optimised (NVMe)', 8] };
        var TS = { nano: [2, 0.5], micro: [2, 1], small: [2, 2], medium: [2, 4], large: [2, 8], xlarge: [4, 16], '2xlarge': [8, 32] };
        var ATTR = { g: 'Graviton (arm64)', i: 'Intel', a: 'AMD', d: 'local NVMe disk', n: 'more network', e: 'extra', z: 'high frequency' };
        var list = String(input || '').trim().split(/[\s,]+/).filter(Boolean);
        if (!list.length || list.length > 6) throw new Error('Give 1-6 instance types like m7g.large');
        var f = [{ narr: 'Every EC2 type name has the same four parts: <b>family</b> letter, <b>generation</b> number, optional <b>attribute</b> letters, then <b>.size</b>. Let us decode ' + list.length + ' of them.', parts: [{ type: 'table', label: 'pattern', columns: ['family', 'generation', 'attributes', 'size'], rows: [['m', '7', 'g', 'large']] }] }];
        var vc = [], mem = [], names = [];
        list.forEach(function (t) {
          var m = t.match(/^([a-z])(\d)([a-z-]*)\.([0-9]*x?large|nano|micro|small|medium)$/);
          if (!m || !FAM[m[1]]) throw new Error('Cannot decode "' + t + '". Use families t, m, c, r, x, i, e.g. c7i.xlarge');
          var fam = FAM[m[1]], size = m[4], v, g;
          if (m[1] === 't') {
            if (!TS[size]) throw new Error('t sizes: nano, micro, small, medium, large, xlarge, 2xlarge');
            v = TS[size][0]; g = TS[size][1];
          } else {
            if (/^(nano|micro|small|medium)$/.test(size)) throw new Error(size + ' exists only in the t family here');
            var mult = size === 'large' ? 1 : size === 'xlarge' ? 2 : 2 * Number(size.replace('xlarge', ''));
            if (!mult || mult > 64) throw new Error('Size too big for this demo');
            v = 2 * mult; g = v * fam[1];
          }
          var attrs = m[3].replace('-flex', '').split('').map(function (a) { return ATTR[a] || a; });
          if (m[3].indexOf('-flex') >= 0) attrs.push('Flex');
          vc.push(v); mem.push(g); names.push(t);
          f.push({ narr: '<b>' + t + '</b>: family <b>' + m[1] + '</b> = ' + fam[0] + ', generation <b>' + m[2] + '</b>' + (attrs.length ? ', attributes: <b>' + attrs.join(', ') + '</b>' : ', no attribute letters (Intel, default)') + ', size <b>' + size + '</b> → about <b>' + v + ' vCPU / ' + g + ' GiB</b>.' + (m[1] === 't' ? ' Burstable: full speed only while CPU credits last.' : '') + (m[3].indexOf('d') >= 0 ? ' The d means a local NVMe disk that is <b>wiped on stop</b>.' : ''), parts: [
            { type: 'table', label: t, columns: ['part', 'value', 'meaning'], rows: [['family', m[1], fam[0]], ['generation', m[2], 'newer = better price-performance'], ['attributes', m[3] || '-', attrs.join(', ') || 'Intel x86 (default)'], ['size', size, v + ' vCPU, ' + g + ' GiB']], hl: { 0: 'cur' } },
            { type: 'vars', label: 'shape', vals: { vCPU: v, memoryGiB: g, GiBperVCPU: Math.round(g / v * 10) / 10 } }
          ] });
        });
        f.push({ narr: 'Side by side. Same vCPUs can mean very different memory: that ratio (GiB per vCPU) is what the family letter really tells you.', parts: [{ type: 'bars', label: 'vCPUs', values: vc, idxLabels: names }, { type: 'bars', label: 'memory GiB', values: mem, idxLabels: names, hl: one(mem.indexOf(Math.max.apply(null, mem)), 'sel') }] });
        if (f.length < 4) f.push({ narr: 'Add more types (for example <code>c7g.large r7g.large</code>) to compare shapes.', parts: [{ type: 'text', html: 'Try: <code>m7g.large c7g.large r7g.large t3.micro</code>' }] });
        return f;
      }
    }],
    examples: [
      { title: 'Picking a family from monitoring data', html: `<p>Three servers, two weeks of CloudWatch data:</p>${H.table(['Server (now)', 'CPU avg / peak', 'Memory used', 'Decision'], [
        ['API on <code>m5.xlarge</code> (4 vCPU, 16 GiB)', '75% / 95%', '5 GiB', H.c('g', '<code>c7g.xlarge</code>: CPU-bound, memory mostly idle; newer gen + Graviton')],
        ['Redis on <code>m5.large</code> (2 vCPU, 8 GiB)', '10% / 20%', '7.5 GiB, swapping', H.c('g', '<code>r7g.large</code>: memory-bound, 16 GiB for the same vCPUs')],
        ['Wiki on <code>m5.large</code>', '3% / 40% (short spikes)', '1.5 GiB', H.c('g', '<code>t4g.small</code>: idle most of the time; burstable fits')]
      ])}<p>Always check the application supports arm64 before choosing a <b>g</b> type, and change one server at a time.</p>` },
      { title: 'The t3 that was slow every afternoon', html: `<p>A reporting job on a <code>t3.small</code> (standard credit mode) slowed to a crawl at 14:00 every day. CloudWatch showed <code>CPUCreditBalance</code> dropping to ${H.c('r', '0')} at 13:50 and CPU flat at the baseline (20% for t3.small). The instance was not "broken": it had spent its credits. Options: switch to unlimited mode (pay for surplus), or - since the job is CPU-heavy every day - move to <code>c7g.medium</code> or <code>m7g.medium</code>, which never throttle.</p>`, code: R`aws cloudwatch get-metric-statistics --namespace AWS/EC2 --metric-name CPUCreditBalance \
  --dimensions Name=InstanceId,Value=i-0abc1234def567890 \
  --start-time 2026-10-18T00:00:00Z --end-time 2026-10-19T00:00:00Z \
  --period 3600 --statistics Minimum --output table
aws ec2 describe-instance-credit-specifications --instance-ids i-0abc1234def567890` },
      { title: 'Resizing an instance (change type)', html: `<p>You can change the instance type of an EBS-backed instance: <b>stop</b> it, <code>modify-instance-attribute</code>, start it. The disk and private IP stay; the auto-assigned public IP changes. The new type must match the AMI's architecture (you cannot switch an x86 AMI to t4g) and support its drivers (NVMe/ENA on modern types). Plan a short downtime, or use a load balancer with several instances to avoid it.</p>`, code: R`ID=i-0abc1234def567890
aws ec2 stop-instances --instance-ids "$ID" && aws ec2 wait instance-stopped --instance-ids "$ID"
aws ec2 modify-instance-attribute --instance-id "$ID" --instance-type '{"Value": "m7i.large"}'
aws ec2 start-instances --instance-ids "$ID" && aws ec2 wait instance-running --instance-ids "$ID"` },
      { title: 'Azure and GCP names decoded', html: `<p>Azure: <code>Standard_D4s_v5</code> = D series (general purpose), <b>4</b> vCPUs, <b>s</b> = supports premium SSD, version 5. <code>Standard_B1s</code> = burstable, 1 vCPU (free-tier size on a new account). <code>Standard_E8ds_v5</code> = memory optimised, 8 vCPUs, local temp disk (d). GCP: <code>e2-standard-4</code> = E2 family, standard shape (4 GiB per vCPU), 4 vCPUs; <code>n2-highmem-8</code> = 8 GiB per vCPU. The ideas - family, size, generation - map one to one.</p>`, code: R`az vm list-sizes --location westeurope --query "[?starts_with(name, 'Standard_B')].[name,numberOfCores,memoryInMB]" --output table
gcloud compute machine-types list --zones europe-west1-b --filter="name~'^e2-'" --format="table(name,guestCpus,memoryMb)"` }
    ],
    deepDive: `<p>🟣 <b>What makes an AMI.</b> An EBS-backed AMI is metadata pointing at snapshots. Launching copies nothing up front: the root volume is created from the snapshot and blocks are pulled from S3 <b>lazily</b> on first read, which is why a freshly launched instance can have slow disk reads at first (fast snapshot restore or reading the whole disk once with <code>fio</code>/<code>dd</code> "initialises" it). When you deregister an AMI, its snapshots are <b>not</b> deleted - a classic source of a slowly growing bill. AMIs can be shared with other accounts or made public; a public AMI with secrets baked in is a real-world leak pattern, so never bake keys or passwords into images.</p>
      <p><b>Golden images vs bootstrap.</b> Two ways to get software onto servers: <b>bake</b> it into an image (fast boot, identical servers, but you must rebuild for every patch - tools: EC2 Image Builder, Packer) or <b>fry</b> it at boot (user data or config management: always fresh, slower boot, more moving parts). Most teams combine both: a patched base image rebuilt weekly, plus a small boot script for app config. Containers (Cloud &amp; DevOps 8) push this further.</p>
      <p><b>vCPUs are not cores.</b> On most Intel and AMD types a vCPU is one <b>hyperthread</b>, so <code>m7i.large</code> has 1 physical core with 2 threads. Graviton vCPUs are full physical cores, which is part of why they do well on parallel workloads. Network and EBS bandwidth also scale with size ("up to 12.5 Gbps" on small types means a burst allowance, not a guarantee), so a database that is disk-throughput bound may need a bigger size even when CPU is idle.</p>
      <p><b>Right-sizing in practice.</b> AWS Compute Optimizer and Azure Advisor read your metrics and suggest smaller or different types. Memory is not in the default EC2 metrics - install the CloudWatch agent to get it, otherwise "right-sizing" advice only sees CPU.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> give an assistant a week of CPU/memory numbers and it will propose a family and size, explain burst credits, and write a Packer template or Image Builder recipe for a golden image. Cost tools increasingly do this automatically.</p>
      <p><b>Where it goes wrong:</b> instance type catalogues change constantly. Models invent types (a "m8x.large"), quote outdated memory sizes or prices, ignore the arm64 question, and suggest the biggest size "for safety". <b>How to work with it:</b> treat suggestions as a shortlist, confirm each type with <code>describe-instance-types</code> and <code>describe-instance-type-offerings</code> in your region, and check the price in the calculator. <b>What you must still own:</b> measuring the real bottleneck, testing the app on the new type (especially arm64), and the cleanup of old AMIs and snapshots.</p>`,
    problems: [P({
      t: 'Pick the cheapest instance type that fits a workload', l: 'Medium', tags: ['instance types', 'right-sizing', 'cost', 'Graviton'], co: ['AWS Support', 'Capgemini'],
      s: `<p>You are given a small catalogue of instance types as strings <code>"name:vcpu:gib:pricePerHour"</code> (example on-demand prices; they change). Write <code>cheapestFit(needVcpu, needGib, sustained, catalog)</code> that returns the <b>name</b> of the cheapest type with at least <code>needVcpu</code> vCPUs and <code>needGib</code> GiB. If <code>sustained</code> is true (the workload uses CPU all day), <b>burstable types</b> (names starting with <code>t</code>) are not allowed. Break price ties by name (alphabetical). Return <code>""</code> if nothing fits. Assume the app runs on both x86 and arm64. Also show how you would build such a catalogue from the CLI.</p>`,
      c: `<p>1-30 catalogue entries; <code>1 ≤ needVcpu ≤ 64</code>; <code>0.5 ≤ needGib ≤ 512</code>. Pure calculation, no resources created. Example catalogue used in tests: ${H.chips(CATALOG.slice(0, 7), { label: 'first 7 of 13' })}</p>`,
      ex: `<p>Need 2 vCPU / 8 GiB, not sustained → candidates <code>t3.large</code> ($0.0832), <code>m7g.large</code> ($0.0816), <code>m7i.large</code> ($0.1008), <code>r7g.large</code> ($0.1071) → ${H.c('g', 'm7g.large')} - a newer Graviton general-purpose type is cheaper than the burstable one here! Need 2 / 4 sustained → <code>t4g.medium</code> is excluded, answer ${H.c('g', 'c7g.large')}. Need 8 / 32 → ${H.c('r', '""')} (nothing in the list is big enough).</p>`,
      bw: `<p>Pick by habit: "we always use m5.xlarge". It fits, but you may pay double for memory you never use, miss a cheaper newer generation, or pick a burstable type for an all-day CPU job and get throttled when the credits run out.</p>`,
      q: ['A video-encoding job uses 100% of 2 vCPUs all day and 1.5 GiB of RAM. Which family fits best?', ['c (compute optimised)', 't (burstable)', 'r (memory optimised)', 'i (storage optimised)'], 0, 'Sustained CPU with little memory is exactly the compute-optimised profile. A t instance would run out of credits; r pays for memory you do not need.'],
      h: ['<p>Hint 1: split each string on <code>:</code>; turn vCPU and GiB into numbers and the price into a float.</p>', '<p>Hint 2: filter - drop names starting with <code>t</code> when sustained, drop anything too small - then take the minimum by (price, name).</p>', '<p>Hint 3: return <code>""</code> when the filtered list is empty. In Bash, <code>awk -F:</code> does the filter and keeps the best line; sort ties with <code>sort -t: -k4,4g -k1,1</code>.</p>'],
      a: `<p>Parse each entry, keep only types that satisfy both minimums and (for sustained load) are not burstable, then choose the lowest hourly price, breaking ties alphabetically for a deterministic answer. The lesson in the data: newer Graviton types (m7g, c7g) are often cheaper than older or burstable x86 types of the same shape, and memory-optimised r types win when you need lots of RAM per vCPU (2 vCPU / 12 GiB → <code>r7g.large</code> beats <code>m7g.xlarge</code>). In real life, build the catalogue from <code>describe-instance-types</code> (shape) plus the Price List API or calculator (price) for <b>your region</b>, then confirm the type is offered in every AZ you use.</p>`,
      code: R`#!/usr/bin/env bash
# cheapest_fit.sh NEED_VCPU NEED_GIB SUSTAINED(true|false) CATALOG_FILE
# CATALOG_FILE lines: name:vcpu:gib:price   e.g.  m7g.large:2:8:0.0816
set -euo pipefail
need_v=$1; need_g=$2; sustained=$3; file=$4
awk -F: -v v="$need_v" -v g="$need_g" -v s="$sustained" '
  s == "true" && $1 ~ /^t/ { next }            # burstable not allowed for all-day CPU
  ($2 + 0) >= v && ($3 + 0) >= g { print }      # big enough
' "$file" | sort -t: -k4,4g -k1,1 | head -n 1 | cut -d: -f1

# Building the shape part of a catalogue from the CLI (prices come from the calculator / Price List API):
aws ec2 describe-instance-types --profile lab \
  --instance-types t3.micro t3.medium t4g.medium m7g.large m7i.large c7g.large r7g.large \
  --query 'InstanceTypes[].[InstanceType,VCpuInfo.DefaultVCpus,MemoryInfo.SizeInMiB]' --output text \
  | awk '{ printf "%s:%s:%g\n", $1, $2, $3 / 1024 }'`,
      py: `def cheapest_fit(need_vcpu, need_gib, sustained, catalog):
    """Cheapest 'name:vcpu:gib:price' entry that fits; burstable (t*) excluded when sustained."""
    best = None
    for entry in catalog:
        name, vcpu, gib, price = entry.split(':')
        if sustained and name.startswith('t'):
            continue                       # all-day CPU would exhaust burst credits
        if int(vcpu) >= need_vcpu and float(gib) >= need_gib:
            key = (float(price), name)     # cheapest first, then alphabetical
            if best is None or key < best:
                best = key
    return best[1] if best else ''`,
      cx: `<p>O(n) over the catalogue (Bash version O(n log n) because of sort). Trivial for a list of types; the real work is getting correct regional prices.</p>`,
      f: ['How would you add "must be offered in all 3 AZs" to the filter?', 'When would you pick a slightly more expensive type anyway?'],
      tests: { sig: 'int double bool string[] -> string', fn: 'cheapestFit', cases: [
        [[2, 4, false, CATALOG], 't4g.medium'], [[2, 4, true, CATALOG], 'c7g.large'], [[2, 8, true, CATALOG], 'm7g.large'],
        [[2, 8, false, CATALOG], 'm7g.large'], [[4, 16, true, CATALOG], 'm7g.xlarge'], [[2, 12, true, CATALOG], 'r7g.large'],
        [[8, 32, false, CATALOG], ''], [[1, 0.5, false, CATALOG], 't3.micro'], [[4, 8, true, CATALOG], 'c7g.xlarge']
      ] }
    })]
  });

  // ───────────────────────── Topic 5: object storage ─────────────────────────
  var S3P = { STANDARD: 0.023, STANDARD_IA: 0.0125, ONEZONE_IA: 0.01, GLACIER_IR: 0.004, GLACIER: 0.0036, DEEP_ARCHIVE: 0.00099 };
  topics.push({
    title: 'Object Storage: S3 and Azure Blob, Versioning, Block Public Access and Storage Classes',
    analogy: `<p>Object storage is a <b>huge cloakroom with numbered tickets</b>. You hand over a coat (a file of any size), you get a ticket (the <b>key</b>, like <code>logs/2026/10/19/app.gz</code>), and you can get exactly that coat back later, from anywhere, with the ticket. You cannot alter a sleeve while it hangs there - you swap the whole coat. The cloakroom has a <b>front room</b> for coats people want often (Standard, pricier per hook) and a <b>basement</b> for coats nobody will ask for in months (Glacier, cheap, but someone has to go down and fetch them).</p>`,
    explain: `<p>🟢 <b>The model.</b> A <b>bucket</b> (Azure: a <b>container</b> inside a <b>storage account</b>) holds <b>objects</b>. Each object = a key (its full name), the bytes (up to 5 TB), and metadata. There are no real folders: <code>logs/2026/app.gz</code> is just a key with slashes, and consoles show prefixes as folders. You use it over HTTPS (the API, CLI or SDK), not by mounting it as a disk. Bucket names are <b>globally unique</b> across all AWS accounts, so use a pattern like <code>example-bucket-yourname</code>. The bucket lives in <b>one region</b>, and S3 Standard stores every object across at least 3 AZs (designed for 99.999999999% - "11 nines" - durability). Reads after a write are strongly consistent.</p>
      ${H.table(['Concept', 'AWS S3', 'Azure Blob Storage', 'GCP Cloud Storage'], [
        ['Top level', 'Bucket (global name, one region)', 'Storage account (global name) → container', 'Bucket'],
        ['Item', 'Object (key)', 'Blob (block blob)', 'Object'],
        ['Hot / warm / cold / archive', 'Standard → Standard-IA → Glacier IR → Glacier Flexible / Deep Archive', 'Hot → Cool → Cold → Archive (access tiers)', 'Standard → Nearline → Coldline → Archive'],
        ['Move data down automatically', 'Lifecycle rules (or Intelligent-Tiering)', 'Lifecycle management policy', 'Object Lifecycle Management'],
        ['Stop accidental public access', 'Block Public Access (on by default for new buckets)', '"Allow Blob anonymous access" = disabled', 'Public access prevention'],
        ['Keep old versions', 'Versioning', 'Blob versioning / soft delete', 'Object versioning'],
        ['Temporary share link', 'Presigned URL', 'SAS token', 'Signed URL']
      ])}
      <p>🟢 <b>Two CLI families.</b> <code>aws s3</code> is the high-level, file-like one: <code>mb</code> (make bucket), <code>cp</code>, <code>mv</code>, <code>ls</code>, <code>sync</code> (copy only what changed), <code>rm</code>, <code>rb</code>. <code>aws s3api</code> exposes every API call one to one: versioning, policies, lifecycle, public access block.</p>
      <p>🔵 <b>Safety settings every bucket should have:</b> (1) <b>Block Public Access</b> on at account and bucket level - new buckets have it on and ACLs disabled by default since 2023; keep it that way unless the bucket is a deliberate public website, and even then prefer a CDN (CloudFront with origin access control) in front of a private bucket. (2) <b>Encryption</b> - SSE-S3 is automatic for new objects; choose SSE-KMS if you need key control and audit. (3) <b>Versioning</b> for anything you cannot recreate: an overwrite or delete keeps the old version, so ransomware or <code>aws s3 sync --delete</code> mistakes are recoverable. (4) <b>Lifecycle rules</b> so old data moves to cheaper classes and old versions expire.</p>
      ${H.table(['Class (example price per GB-month, us-east-1, 2026 - check the pricing page)', 'Access', 'Minimum storage duration', 'Retrieval'], [
        ['<b>Standard</b> $0.023', 'frequent', 'none', 'free (requests only)'],
        ['<b>Intelligent-Tiering</b> $0.023 → lower tiers automatically', 'unknown / changing', 'none (small monitoring fee per object)', 'free'],
        ['<b>Standard-IA</b> $0.0125', 'less than monthly, needs milliseconds', '30 days (and 128 KB minimum size)', 'per-GB fee'],
        ['<b>One Zone-IA</b> $0.01', 'like IA, data you can recreate', '30 days, <b>one AZ only</b>', 'per-GB fee'],
        ['<b>Glacier Instant Retrieval</b> $0.004', 'about once a quarter, milliseconds', '90 days', 'higher per-GB fee'],
        ['<b>Glacier Flexible Retrieval</b> $0.0036', 'rare, minutes to 12 hours is OK', '90 days', 'restore job first'],
        ['<b>Glacier Deep Archive</b> $0.00099', 'compliance, 12-48 hours is OK', '180 days', 'restore job first']
      ])}`,
    clues: [
      '"our bucket was found public / data leak" → Block Public Access (account + bucket), remove <code>Principal: "*"</code> policy, check access logs / CloudTrail',
      '"need to share one file for a day without making it public" → presigned URL (<code>aws s3 presign</code>), SAS token on Azure',
      '"someone ran sync --delete and wiped files" → versioning would have kept them; restore by deleting the delete markers',
      '"keep logs 1 year cheaply, rarely read after a month" → lifecycle: Standard → Standard-IA (30 d) → Glacier (90 d) → expire (365 d)',
      '"BucketAlreadyExists" → names are global; add your name / account suffix',
      '"S3 bill growing although we delete files" → versioning keeps noncurrent versions; add <code>NoncurrentVersionExpiration</code> and abort incomplete multipart uploads'
    ],
    code: [R`#!/usr/bin/env bash
# S3 basics lab. COST: a few MB in S3 Standard is fractions of a cent per month.
# CLEANUP at the bottom (a versioned bucket needs its versions deleted first).
set -euo pipefail
export AWS_PROFILE=lab AWS_REGION=eu-west-1
B=example-bucket-yourname-$(date +%s)          # globally unique name

aws s3 mb "s3://$B" --region "$AWS_REGION"     # make bucket
aws s3api get-public-access-block --bucket "$B" # new buckets: all four settings true
aws s3api put-bucket-versioning --bucket "$B" --versioning-configuration Status=Enabled

mkdir -p site && echo "<h1>v1</h1>" > site/index.html && echo "body{}" > site/style.css
aws s3 cp site/index.html "s3://$B/site/index.html"
aws s3 sync site "s3://$B/site/"               # uploads only new/changed files
echo "<h1>v2</h1>" > site/index.html
aws s3 sync site "s3://$B/site/"               # overwrite -> a second version is kept
aws s3api list-object-versions --bucket "$B" --prefix site/index.html \
  --query 'Versions[].[VersionId,IsLatest,LastModified]' --output table

# Share one object for 1 hour without making anything public
aws s3 presign "s3://$B/site/index.html" --expires-in 3600

# ---- CLEANUP: delete all versions and delete markers, then the bucket ----
for kind in Versions DeleteMarkers; do
  aws s3api list-object-versions --bucket "$B" --output json \
    --query "{Objects: $kind[].{Key: Key, VersionId: VersionId}}" > batch.json
  if grep -q '"Key"' batch.json; then                # skip when the list is empty
    aws s3api delete-objects --bucket "$B" --delete file://batch.json > /dev/null
  fi
done
aws s3 rb "s3://$B"
rm -rf site batch.json`, { lang: 'json', title: 'lifecycle.json - logs tiering', code: `{
  "Rules": [
    {
      "ID": "logs-tiering",
      "Status": "Enabled",
      "Filter": { "Prefix": "logs/" },
      "Transitions": [
        { "Days": 30, "StorageClass": "STANDARD_IA" },
        { "Days": 90, "StorageClass": "GLACIER_IR" }
      ],
      "Expiration": { "Days": 365 },
      "NoncurrentVersionExpiration": { "NoncurrentDays": 30 },
      "AbortIncompleteMultipartUpload": { "DaysAfterInitiation": 7 }
    }
  ]
}` }, R`# Apply and read back the lifecycle rule
aws s3api put-bucket-lifecycle-configuration --bucket example-bucket-yourname \
  --lifecycle-configuration file://lifecycle.json --profile lab
aws s3api get-bucket-lifecycle-configuration --bucket example-bucket-yourname --profile lab

# Azure: storage account (global name, lowercase, 3-24 chars) with anonymous access OFF
az storage account create --name stexampleyourname --resource-group rg-devops05-lab \
  --location westeurope --sku Standard_LRS --kind StorageV2 \
  --allow-blob-public-access false --min-tls-version TLS1_2
az storage container create --account-name stexampleyourname --name logs --auth-mode login
az storage blob upload --account-name stexampleyourname --container-name logs \
  --name app/2026-10-19.log.gz --file app.log.gz --tier Cool --auth-mode login`],
    codeTitle: ['S3 lab: mb, cp, sync, versioning, presign, full cleanup', 'Lifecycle rule as JSON', 'Apply lifecycle; Azure Blob equivalent'],
    viz: [{
      title: 'Logs lifecycle: steady-state storage and monthly cost',
      input: 'gbPerDay=10 ia=30 glacier=90 expire=365',
      inputLabel: 'gbPerDay of new logs, day to move to Standard-IA, day to move to Glacier IR, day to delete',
      gen: function (input) {
        var o = kvIn(input, ['gbPerDay', 'ia', 'glacier', 'expire'], 'Use: gbPerDay=10 ia=30 glacier=90 expire=365');
        var d = o.gbPerDay || 10, ia = o.ia || 30, gl = o.glacier || 90, ex = o.expire || 365;
        if (d <= 0 || d > 10000 || ia < 30 || gl < ia + 30 || ex < gl + 90 || ex > 3650) throw new Error('Rules: gbPerDay 1-10000, ia ≥ 30, glacier ≥ ia + 30, expire ≥ glacier + 90 (minimum durations), expire ≤ 3650');
        var sStd = d * ia, sIa = d * (gl - ia), sGl = d * (ex - gl);
        var cStd = sStd * S3P.STANDARD, cIa = sIa * S3P.STANDARD_IA, cGl = sGl * S3P.GLACIER_IR, all = d * ex * S3P.STANDARD;
        var f = [];
        f.push({ narr: 'Every day the app writes <b>' + d + ' GB</b> of logs to <code>s3://example-bucket-yourname/logs/</code>. Logs are read a lot in the first days (debugging), rarely after a month, and kept ' + ex + ' days for audit. The lifecycle rule moves each object down the classes as it ages.', parts: [{ type: 'queue', label: 'one object\'s journey', items: ['day 0: STANDARD', 'day ' + ia + ': STANDARD_IA', 'day ' + gl + ': GLACIER_IR', 'day ' + ex + ': deleted'], frontLabel: 'new', backLabel: 'expired' }] });
        f.push({ narr: 'Day ' + ia + ': the first objects reach age ' + ia + ' and move to Standard-IA. Until then everything sits in Standard: <b>' + sStd + ' GB</b>. (IA has a 30-day minimum, which is why moving earlier is pointless.)', parts: [{ type: 'bars', label: 'GB per class on day ' + ia, values: [sStd, 0, 0], idxLabels: ['STANDARD', 'STANDARD_IA', 'GLACIER_IR'], hl: { 0: 'cur' } }] });
        f.push({ narr: 'Day ' + gl + ': Standard holds the newest ' + ia + ' days, IA holds days ' + ia + '-' + gl + ' (<b>' + sIa + ' GB</b>), and the oldest now move to Glacier Instant Retrieval (90-day minimum, still millisecond reads for an auditor).', parts: [{ type: 'bars', label: 'GB per class on day ' + gl, values: [sStd, sIa, 0], idxLabels: ['STANDARD', 'STANDARD_IA', 'GLACIER_IR'], hl: { 1: 'cur' } }] });
        f.push({ narr: 'Day ' + ex + ' and every day after: <b>steady state</b>. Each day ' + d + ' GB arrive and ' + d + ' GB expire, so the totals stop growing: ' + sStd + ' + ' + sIa + ' + ' + sGl + ' = <b>' + (sStd + sIa + sGl) + ' GB</b>.', parts: [{ type: 'bars', label: 'GB per class, steady state', values: [sStd, sIa, sGl], idxLabels: ['STANDARD', 'STANDARD_IA', 'GLACIER_IR'], hl: { 2: 'cur' } }] });
        f.push({ narr: 'Monthly storage cost = GB x price per GB-month (example prices): ' + sStd + ' x $0.023 + ' + sIa + ' x $0.0125 + ' + sGl + ' x $0.004 = <b>' + money(cStd + cIa + cGl) + '</b> per month.', parts: [{ type: 'table', label: 'GB-month maths', columns: ['class', 'GB', '$/GB-month', '$/month'], rows: [['STANDARD', String(sStd), '0.023', money(cStd)], ['STANDARD_IA', String(sIa), '0.0125', money(cIa)], ['GLACIER_IR', String(sGl), '0.004', money(cGl)], ['total', String(sStd + sIa + sGl), '', money(cStd + cIa + cGl)]], hl: { 3: 'sel' } }] });
        f.push({ narr: 'Without the rule, all ' + (d * ex) + ' GB sit in Standard: <b>' + money(all) + '</b> per month - ' + Math.round(all / (cStd + cIa + cGl) * 10) / 10 + 'x more. Not shown: small per-request transition fees and IA/Glacier retrieval fees, which is why you only move data that is <b>rarely read</b>.', parts: [{ type: 'bars', label: '$/month: all Standard vs lifecycle', values: [Math.round(all * 100) / 100, Math.round((cStd + cIa + cGl) * 100) / 100], idxLabels: ['all STANDARD', 'with lifecycle'], hl: { 0: 'bad', 1: 'ok' } }] });
        return f;
      }
    }],
    examples: [
      { title: 'Incident: the public "backups" bucket', html: `<p>A researcher emails: "your bucket <code>acme-db-backups</code> is listable". Someone had added a bucket policy with <code>"Principal": "*"</code> and turned off Block Public Access "to test a website". Contain first: turn Block Public Access on for the bucket <b>and the account</b> (this overrides the policy immediately), then delete the bad policy. Then investigate: S3 server access logs or CloudTrail data events show which objects anonymous users downloaded. Report per your incident process. Prevent: account-level Block Public Access, an AWS Config rule or IAM Access Analyzer alert on public buckets, and code review of bucket policies.</p>`, code: R`B=acme-db-backups
aws s3api put-public-access-block --bucket "$B" --public-access-block-configuration \
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
aws s3control put-public-access-block --account-id 123456789012 --public-access-block-configuration \
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
aws s3api get-bucket-policy-status --bucket "$B"     # IsPublic should now be false
aws s3api delete-bucket-policy --bucket "$B"          # after saving a copy for the incident notes` },
      { title: 'Recovering files after a bad "sync --delete"', html: `<p>A deploy script ran <code>aws s3 sync ./build s3://example-bucket-yourname/site/ --delete</code> from an empty folder and "deleted" the whole site. With <b>versioning</b> on, a delete only adds a <b>delete marker</b> on top of each object; the data is still there. Remove the markers and the previous versions become current again. Without versioning the files would be gone for good.</p>`, code: R`B=example-bucket-yourname
aws s3api list-object-versions --bucket "$B" --prefix site/ \
  --query 'DeleteMarkers[?IsLatest].[Key,VersionId]' --output text |
while read -r key vid; do
  aws s3api delete-object --bucket "$B" --key "$key" --version-id "$vid"   # removes the marker
done
aws s3 ls "s3://$B/site/"       # files are back` },
      { title: 'Picking classes for application logs', html: `<p>Logs: 10 GB/day, read heavily for 7 days, occasionally for 30 days, almost never after that, kept 1 year for audit, and an auditor wants answers <i>the same day</i>. Choice: Standard for the first 30 days (IA's 30-day minimum makes an earlier move pointless), Standard-IA to day 90, then <b>Glacier Instant Retrieval</b> (millisecond reads, still cheap) until expiry at 365. If the auditor could wait 12 hours, Glacier Flexible or Deep Archive would be cheaper still. The visualizer above shows the maths: about $25/month instead of about $84.</p>` },
      { title: 'Why the S3 bill grew after enabling versioning', html: `<p>A team enabled versioning on a bucket where a job overwrites a 2 GB file every hour. Each overwrite keeps the previous version, so after a month there are 720 versions: about ${H.c('r', '1.4 TB')} instead of 2 GB. Fix: a lifecycle rule with <code>NoncurrentVersionExpiration</code> (for example keep noncurrent versions 7 days) and, for jobs like this, write to a new key per run or turn versioning off for that prefix's bucket. Also add <code>AbortIncompleteMultipartUpload</code>: failed big uploads leave invisible parts that are billed.</p>`, code: R`aws s3api list-object-versions --bucket example-bucket-yourname --prefix exports/big.csv \
  --query 'length(Versions)'
aws s3api list-multipart-uploads --bucket example-bucket-yourname \
  --query 'Uploads[].[Key,Initiated]' --output text` }
    ],
    deepDive: `<p>🟣 <b>How S3 decides "public".</b> Access is the union of IAM policies, the bucket policy, ACLs (legacy) and access points, minus any explicit deny. <b>Block Public Access</b> sits on top as a guard rail: <code>BlockPublicPolicy</code> rejects new public policies, <code>RestrictPublicBuckets</code> ignores existing public policies for anonymous and cross-account callers, and the two ACL settings do the same for ACLs. Account-level settings override bucket-level ones, so turning them on for the account is the single strongest protection. Since April 2023 new buckets default to <b>Object Ownership: bucket owner enforced</b> (ACLs disabled), which removes the old trap of objects uploaded by another account with their own ACLs.</p>
      <p><b>Durability vs availability.</b> 11 nines of durability means you will practically never lose an object to hardware failure; it does not protect you from <i>yourself</i> - deletes, overwrites, a compromised key. That is what versioning, Object Lock (write-once-read-many for compliance and ransomware protection) and cross-region replication are for. Availability (can I read it right now?) is a separate SLA: 99.9% for Standard, lower for IA and One Zone-IA.</p>
      <p><b>Costs beyond GB-month.</b> Requests (PUT/COPY/LIST cost more than GET), data transfer <b>out to the internet</b> (an example price is $0.09/GB after the first 100 GB per month that AWS includes free), transitions (a fee per object per lifecycle move - many tiny objects can cost more to move than to store; lifecycle by default skips objects under 128 KB for this reason), retrieval fees for IA and Glacier, and the minimum duration charges if you delete early. Rule of thumb: lifecycle saves money on <b>large, old, rarely read</b> objects.</p>
      <p><b>Performance.</b> S3 scales per prefix to thousands of requests per second; spread hot keys across prefixes for very high rates. Large uploads use <b>multipart upload</b> (the CLI does it automatically above 8 MB), which also allows parallel transfer and resume. <code>aws s3 sync</code> compares size and modification time, not content hashes.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> assistants write bucket policies, lifecycle JSON and presigned-URL code quickly, and explain why a request got <code>AccessDenied</code> if you paste the (sanitised) policy. They are handy for working out lifecycle cost trade-offs.</p>
      <p><b>Where it goes wrong:</b> a classic generated "fix" for <code>AccessDenied</code> is a bucket policy with <code>"Principal": "*"</code> and <code>"Action": "s3:*"</code> - exactly the public-bucket leak this topic warns about. Models also mix old and new defaults (ACLs, "public-read" canned ACLs that now fail), get minimum durations wrong, or forget that <code>s3 rb --force</code> does not remove old versions. <b>How to work with it:</b> ask for least privilege ("only GetObject on this prefix for this role"), keep Block Public Access on, and validate policies with IAM Access Analyzer. <b>What you must still own:</b> knowing which data is sensitive, who should read it, and how long it must be kept.</p>`,
    problems: [P({
      t: 'Contain a public bucket leak and harden the bucket', l: 'Medium', tags: ['S3', 'Block Public Access', 'incident', 'versioning'], co: ['AWS Support', 'Wipro', 'IBM'],
      s: `<p>Security tells you that <code>s3://example-bucket-invoices-yourname</code> (customer invoice PDFs) is readable by anyone on the internet. You must, in this order: (1) stop public access <b>immediately</b> without deleting any data, (2) keep a copy of the bad configuration as evidence, (3) find out whether anonymous users actually downloaded files, (4) harden the bucket (versioning, encryption, ownership controls), (5) give the finance team a safe way to share a single invoice with a customer, and (6) prevent the same mistake for every bucket in the account.</p>`,
      ex: `<p>Before: <code>get-bucket-policy-status</code> → ${H.c('r', '"IsPublic": true')}; the policy has <code>"Principal": "*", "Action": "s3:GetObject"</code>. After step 1: ${H.c('g', '"IsPublic": false')} and <code>curl https://example-bucket-invoices-yourname.s3.eu-west-1.amazonaws.com/inv-001.pdf</code> returns ${H.c('g', '403 AccessDenied')}. Finance shares invoices with <code>aws s3 presign ... --expires-in 86400</code>.</p>`,
      bw: `<p>Delete the bucket, or delete the policy first and investigate later. Deleting the bucket destroys the data and the evidence; deleting the policy without saving it loses what was exposed; and neither stops the next person from doing the same, because account-level Block Public Access is still off.</p>`,
      q: ['What is the fastest single action that stops anonymous reads, even if the public policy is still attached?', ['Turn on Block Public Access (RestrictPublicBuckets) for the bucket or account', 'Enable versioning', 'Enable default encryption', 'Rename the bucket'], 0, 'RestrictPublicBuckets makes S3 ignore public bucket policies for anonymous callers immediately. Versioning and encryption do not change who can read; buckets cannot be renamed.'],
      h: ['<p>Hint 1: Block Public Access acts on top of policies - turn it on first, then deal with the policy at leisure. Save <code>get-bucket-policy</code> output to a file before deleting it.</p>', '<p>Hint 2: evidence of downloads comes from S3 server access logs or CloudTrail <b>data events</b> - only if they were enabled before the leak. Note it in the report if they were not.</p>', '<p>Hint 3: prevention is account-level (<code>aws s3control put-public-access-block</code>) plus detection (IAM Access Analyzer or an AWS Config rule). Share single files with presigned URLs, never by making objects public.</p>'],
      a: `<p><b>1. Contain:</b> <code>put-public-access-block</code> on the bucket with all four settings true; confirm with <code>get-bucket-policy-status</code> and an anonymous <code>curl</code> (403). <b>2. Evidence:</b> save the policy, ACL and ownership settings to files with a timestamp, then delete the public policy. <b>3. Investigate:</b> query access logs (requester <code>-</code> = anonymous) or CloudTrail data events for <code>GetObject</code> by anonymous principals in the exposure window; if logging was off, say so and treat all objects as potentially exposed - this decides whether customers must be notified (a legal/security decision, not yours alone). <b>4. Harden:</b> versioning on, Object Ownership <code>BucketOwnerEnforced</code> (ACLs off), default encryption (SSE-S3, or SSE-KMS for audit), and turn on server access logging to a separate log bucket for the future. <b>5. Share safely:</b> presigned URLs that expire, generated by someone with read permission. <b>6. Prevent:</b> account-level Block Public Access, and an Access Analyzer / Config alert on any bucket that becomes public. Cost: all of these are free or a few cents (logging storage).</p>`,
      code: R`#!/usr/bin/env bash
set -euo pipefail
export AWS_PROFILE=lab
B=example-bucket-invoices-yourname
TS=$(date -u +%Y%m%dT%H%M%SZ)
BPA='BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true'

# 1. CONTAIN - effective immediately, deletes nothing
aws s3api put-public-access-block --bucket "$B" --public-access-block-configuration "$BPA"
aws s3api get-bucket-policy-status --bucket "$B"           # expect "IsPublic": false
curl -s -o /dev/null -w '%{http_code}\n' "https://$B.s3.eu-west-1.amazonaws.com/inv-001.pdf"   # expect 403

# 2. EVIDENCE - save the bad config, then remove the public policy
aws s3api get-bucket-policy --bucket "$B" --query Policy --output text > "evidence-policy-$TS.json"
aws s3api get-bucket-acl --bucket "$B" > "evidence-acl-$TS.json"
aws s3api delete-bucket-policy --bucket "$B"

# 3. INVESTIGATE - anonymous GETs in the access logs (if logging was on)
aws s3 cp "s3://example-bucket-logs-yourname/s3-access/$B/" ./access-logs/ --recursive --quiet || true
grep -h 'REST.GET.OBJECT' ./access-logs/* 2>/dev/null | awk '$6 == "-" { print $3, $5, $9 }' | sort | head

# 4. HARDEN
aws s3api put-bucket-versioning --bucket "$B" --versioning-configuration Status=Enabled
aws s3api put-bucket-ownership-controls --bucket "$B" \
  --ownership-controls 'Rules=[{ObjectOwnership=BucketOwnerEnforced}]'
aws s3api put-bucket-encryption --bucket "$B" --server-side-encryption-configuration \
  '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'

# 5. SHARE ONE FILE SAFELY - link valid 24 hours
aws s3 presign "s3://$B/inv-001.pdf" --expires-in 86400

# 6. PREVENT - account-wide guard rail (account id is the documentation placeholder)
aws s3control put-public-access-block --account-id 123456789012 --public-access-block-configuration "$BPA"`,
      cx: `<p>Containment takes under a minute; the investigation takes longest. Cost: free apart from log storage. Risk: low - nothing is deleted except the public policy, which is saved first.</p>`,
      f: ['When is a public bucket legitimate, and what would you put in front of it?', 'How does Azure\'s "Allow Blob anonymous access" setting compare?']
    })]
  });

  // ───────────────────────── Topic 6: block vs file storage ─────────────────────────
  topics.push({
    title: 'Block vs File Storage: EBS Volumes, Snapshots, Instance Store and EFS (and Growing a Full Disk)',
    analogy: `<p><b>Block storage</b> is a <b>USB hard drive plugged into one laptop</b>: fast, private to that machine, and you format it however you like. <b>File storage</b> is the <b>shared drive on the office network</b>: many computers open the same folders at once, but somebody else runs the server. <b>Object storage</b> (Topic 5) is the <b>cloakroom</b>: whole items in and out by ticket. A <b>snapshot</b> is a photo of the USB drive at a moment in time, kept in the cloakroom so you can make a new drive from it later.</p>`,
    explain: `<p>🟢 <b>Three kinds of storage, three jobs.</b></p>
      ${H.table(['', 'Block (EBS, Managed Disks)', 'File (EFS, Azure Files)', 'Object (S3, Blob)'], [
        ['Looks like', 'a raw disk: <code>/dev/nvme1n1</code>, you run <code>mkfs</code> and mount it', 'a network folder: <code>mount -t nfs</code> or SMB', 'an HTTPS API: PUT / GET whole objects'],
        ['Shared by', '<b>one</b> instance (multi-attach only for special cases)', '<b>many</b> instances, across AZs', 'anyone with permission, anywhere'],
        ['Scope', '<b>one AZ</b>', 'region (EFS Standard spans AZs)', 'region'],
        ['Best for', 'OS root disk, databases, anything needing low latency', 'shared content, home folders, legacy apps that need a POSIX path', 'backups, logs, media, data lakes, static sites'],
        ['Example price per GB-month', 'gp3 $0.08 (you pay for the <b>size you provision</b>)', 'EFS Standard $0.30 (you pay for <b>what you store</b>)', 'S3 Standard $0.023']
      ])}
      <p>🟢 <b>EBS volume types</b> (Azure Managed Disk equivalent in brackets):</p>
      ${H.table(['Type', 'What it is', 'When'], [
        ['<b>gp3</b> (Premium SSD v2 / Standard SSD)', 'general SSD; baseline 3,000 IOPS and 125 MB/s at any size, raise IOPS and throughput separately', 'the default for almost everything'],
        ['gp2 (older)', 'SSD whose IOPS grow with size (3 per GB), burst bucket on small volumes', 'legacy; migrate to gp3 - usually cheaper and faster'],
        ['<b>io2</b> Block Express (Ultra Disk / Premium SSD)', 'provisioned IOPS, very low latency, higher durability', 'busy databases that need guaranteed IOPS'],
        ['st1 / sc1 (Standard HDD)', 'throughput / cold hard disks, cheap per GB', 'big sequential data, rarely accessed data (cannot boot)'],
        ['Instance store (Azure: temp disk)', 'NVMe physically in the host; very fast, <b>lost on stop, terminate or host failure</b>', 'caches, scratch space, replicated data only']
      ])}
      <p>🔵 <b>Working with EBS</b> - the everyday sequence: <code>create-volume</code> in the <b>same AZ</b> as the instance → <code>attach-volume</code> → inside the OS, <code>lsblk</code> to find it (on Nitro it appears as <code>/dev/nvme1n1</code> even if you asked for <code>/dev/sdf</code>) → <code>mkfs</code> once → <code>mount</code> → add to <code>/etc/fstab</code> <b>by UUID</b> with <code>nofail</code> (Cloud &amp; DevOps 1). Volumes can be <b>made bigger, faster or changed type while in use</b> (<code>modify-volume</code>), but <b>never smaller</b>.</p>
      <p>🔵 <b>Snapshots</b> are point-in-time backups stored regionally (in S3, managed by AWS). They are <b>incremental</b>: the first copies all used blocks, later ones only changed blocks. Restore = create a new volume from the snapshot, in any AZ of the region. Snapshots are billed per GB-month (example: $0.05) and <b>never expire on their own</b> - automate creation <i>and deletion</i> with Data Lifecycle Manager or AWS Backup.</p>
      <p>🔵 <b>Full disk on EC2</b> (a top-5 ticket): first free space the Linux way (Cloud &amp; DevOps 1: <code>df</code>, <code>du</code>, logrotate). If the data really needs more room, grow it online in three layers: <b>volume</b> (<code>aws ec2 modify-volume --size</code>), <b>partition</b> (<code>growpart</code>), <b>filesystem</b> (<code>xfs_growfs</code> for XFS on Amazon Linux, <code>resize2fs</code> for ext4 on Ubuntu). Take a snapshot first.</p>`,
    clues: [
      '"disk full on EC2, need more space without downtime" → snapshot, <code>modify-volume --size</code>, <code>growpart</code>, <code>xfs_growfs</code> / <code>resize2fs</code>',
      '"attached a volume but cannot see it / it has no filesystem" → <code>lsblk</code>, <code>mkfs</code> (new disk only), mount, fstab by UUID with <code>nofail</code>',
      '"several servers in different AZs need the same files" → file storage (EFS / Azure Files), not one EBS volume',
      '"database needs guaranteed 20,000 IOPS" → io2 (or gp3 with provisioned IOPS), on an instance type with enough EBS bandwidth',
      '"data vanished from the fast local disk after stop/start" → instance store is ephemeral',
      '"snapshot costs keep rising" → nobody deletes old snapshots; lifecycle policy (DLM / AWS Backup) with retention'
    ],
    code: [R`#!/usr/bin/env bash
# Lab: add a data volume to a running instance. COST: 2 GiB gp3 ~ $0.16/month
# (example price, prorated per second). CLEANUP at the bottom.
set -euo pipefail
export AWS_PROFILE=lab AWS_REGION=eu-west-1
ID=i-0abc1234def567890
AZ=$(aws ec2 describe-instances --instance-ids "$ID" \
  --query 'Reservations[0].Instances[0].Placement.AvailabilityZone' --output text)

VOL=$(aws ec2 create-volume --availability-zone "$AZ" --size 2 --volume-type gp3 \
  --tag-specifications 'ResourceType=volume,Tags=[{Key=Name,Value=data-lab},{Key=lab,Value=devops05}]' \
  --query VolumeId --output text)
aws ec2 wait volume-available --volume-ids "$VOL"
aws ec2 attach-volume --volume-id "$VOL" --instance-id "$ID" --device /dev/sdf
aws ec2 wait volume-in-use --volume-ids "$VOL"

# ---- on the instance (Session Manager or SSH) ----
# lsblk                                    # new disk e.g. nvme1n1, no MOUNTPOINT, no FSTYPE
# sudo file -s /dev/nvme1n1                # "data" = empty; NEVER mkfs a disk that shows a filesystem
# sudo mkfs -t xfs /dev/nvme1n1
# sudo mkdir -p /data && sudo mount /dev/nvme1n1 /data
# echo "UUID=$(sudo blkid -s UUID -o value /dev/nvme1n1) /data xfs defaults,nofail 0 2" | sudo tee -a /etc/fstab
# sudo umount /data && sudo mount -a && df -h /data     # proves fstab works before a reboot does

# Snapshot it (incremental, regional)
SNAP=$(aws ec2 create-snapshot --volume-id "$VOL" --description "data-lab test" \
  --tag-specifications 'ResourceType=snapshot,Tags=[{Key=lab,Value=devops05}]' \
  --query SnapshotId --output text)
aws ec2 wait snapshot-completed --snapshot-ids "$SNAP"

# ---- CLEANUP: unmount inside the OS first (and remove the fstab line), then: ----
aws ec2 detach-volume --volume-id "$VOL"
aws ec2 wait volume-available --volume-ids "$VOL"
aws ec2 delete-volume --volume-id "$VOL"
aws ec2 delete-snapshot --snapshot-id "$SNAP"`, R`# Shared file storage: EFS mounted on instances in several AZs.
# COST: you pay per GB stored (example $0.30/GB-month Standard); an empty lab FS is ~free.
FS=$(aws efs create-file-system --encrypted --performance-mode generalPurpose \
  --throughput-mode elastic --tags Key=Name,Value=shared-lab --query FileSystemId --output text --profile lab)
# One mount target per AZ/subnet you use; its security group must allow NFS (TCP 2049) from the instances
aws efs create-mount-target --file-system-id "$FS" --subnet-id subnet-0aaa1111bbbb22223 \
  --security-groups sg-0123456789abcdef0 --profile lab
# On each instance (Amazon Linux 2023):
#   sudo dnf -y install amazon-efs-utils
#   sudo mkdir -p /mnt/shared && sudo mount -t efs -o tls "$FS":/ /mnt/shared
# CLEANUP: delete mount targets, wait, then the file system
#   aws efs describe-mount-targets --file-system-id "$FS" --query 'MountTargets[].MountTargetId' --output text
#   aws efs delete-mount-target --mount-target-id fsmt-0123456789abcdef0
#   aws efs delete-file-system --file-system-id "$FS"`],
    codeTitle: ['EBS: create, attach, format, mount, snapshot, clean up', 'EFS: shared file system across AZs'],
    viz: [{
      title: 'Growing a full root disk: volume, partition, filesystem',
      input: 'disk=8 used=7.8 new=20 fs=xfs',
      inputLabel: 'disk = current GiB, used = GiB used, new = target GiB, fs = xfs or ext4',
      gen: function (input) {
        var o = kvIn(input, ['disk', 'used', 'new', 'fs'], 'Use: disk=8 used=7.8 new=20 fs=xfs');
        var disk = o.disk || 8, used = o.used === undefined ? 7.8 : o.used, nw = o['new'] || 20, fs = o.fs || 'xfs';
        if (disk < 1 || disk > 1000 || used < 0 || used > disk || nw <= disk || nw > 16384 || (fs !== 'xfs' && fs !== 'ext4')) throw new Error('Need: 1 ≤ disk ≤ 1000, 0 ≤ used ≤ disk, new > disk, fs xfs or ext4');
        var pct = function (u, s) { return Math.round(u / s * 100); };
        var dev = fs === 'xfs' ? 'nvme0n1' : 'nvme0n1', grow = fs === 'xfs' ? 'sudo xfs_growfs -d /' : 'sudo resize2fs /dev/nvme0n1p1';
        function layers(v, p, f) { return { type: 'bars', label: 'size in GiB: EBS volume, partition, filesystem', values: [v, p, f], idxLabels: ['EBS volume', 'partition p1', 'filesystem /'] }; }
        var fr = [];
        fr.push({ narr: 'Alert: root filesystem at <b>' + pct(used, disk) + '%</b>. You already cleaned logs (Cloud &amp; DevOps 1) and the data is legitimate, so the disk must grow. Three layers are stacked: the EBS <b>volume</b>, a <b>partition</b> on it, and the <b>filesystem</b> inside the partition. All three are ' + disk + ' GiB now.', parts: [layers(disk, disk, disk), { type: 'table', label: 'df -h /', columns: ['Filesystem', 'Size', 'Used', 'Use%'], rows: [['/dev/' + dev + 'p1', disk + 'G', used + 'G', pct(used, disk) + '%']], hl: { 0: 'bad' } }] });
        fr.push({ narr: 'Step 0: <b>snapshot first</b> (<code>aws ec2 create-snapshot</code>). Resizing is safe and online, but a typo in the next steps should never cost data. Then find the root volume id: <code>describe-volumes --filters Name=attachment.instance-id,Values=$ID Name=attachment.device,Values=/dev/xvda</code>.', parts: [{ type: 'code', label: 'safety first', lang: 'bash', code: 'aws ec2 create-snapshot --volume-id "$VOL" --description "before grow"\naws ec2 wait snapshot-completed --snapshot-ids "$SNAP"', hl: { 1: 'ok' } }] });
        fr.push({ narr: 'Step 1: <code>aws ec2 modify-volume --volume-id $VOL --size ' + nw + '</code>. The volume grows <b>while the instance runs</b>; state goes modifying → optimizing → completed. But Linux still sees the old partition and filesystem - <code>df</code> has not changed.', parts: [layers(nw, disk, disk), { type: 'table', label: 'lsblk', columns: ['NAME', 'SIZE', 'MOUNTPOINT'], rows: [[dev, nw + 'G', ''], ['└─' + dev + 'p1', disk + 'G', '/']], hl: { 0: 'ok', 1: 'cur' } }] });
        fr.push({ narr: 'Step 2: <code>sudo growpart /dev/' + dev + ' 1</code> stretches partition 1 to fill the disk. (Note the space: device, then partition <b>number</b>.) Now the partition is ' + nw + ' GiB, the filesystem still ' + disk + '.', parts: [layers(nw, nw, disk), { type: 'table', label: 'lsblk', columns: ['NAME', 'SIZE', 'MOUNTPOINT'], rows: [[dev, nw + 'G', ''], ['└─' + dev + 'p1', nw + 'G', '/']], hl: { 1: 'ok' } }] });
        fr.push({ narr: 'Step 3: grow the <b>filesystem</b>, online: <code>' + grow + '</code>. ' + (fs === 'xfs' ? 'XFS (Amazon Linux, RHEL) is grown by its <b>mount point</b>.' : 'ext4 (Ubuntu, Debian) is grown by its <b>device</b>.') + ' Using the wrong tool just errors; it does not damage data.', parts: [layers(nw, nw, nw), { type: 'code', label: 'filesystem tool', lang: 'bash', code: 'df -hT /            # Type column says xfs or ext4\n' + grow, hl: { 2: 'ok' } }] });
        fr.push({ narr: 'Result: <code>df -h /</code> shows <b>' + nw + ' GiB</b>, use dropped from ' + pct(used, disk) + '% to <b>' + pct(used, nw) + '%</b>, no reboot. Cost check: the volume now bills ' + nw + ' GiB x $0.08 = <b>' + money(nw * 0.08) + '</b>/month (example gp3 price) instead of ' + money(disk * 0.08) + '. You cannot shrink it back, so grow in sensible steps. Another modify on the same volume must wait about 6 hours.', parts: [{ type: 'bars', label: 'Use% before vs after', values: [pct(used, disk), pct(used, nw)], idxLabels: ['before', 'after'], hl: { 0: 'bad', 1: 'ok' } }] });
        return fr;
      }
    }],
    examples: [
      { title: 'Ticket: "/var/lib/mysql is full on my EC2 instance"', html: `<p>An 8 GiB root volume holds the OS <i>and</i> a growing MySQL database. Short term: snapshot, grow root to 30 GiB online (guided problem). Better: put the database on its own <b>gp3 data volume</b> mounted at <code>/var/lib/mysql</code>, so it can be resized, snapshotted and moved independently of the OS, and so a runaway log cannot fill the database disk. Best for many teams: a managed database (RDS, Cloud &amp; DevOps 12), where storage can auto-scale.</p>` },
      { title: 'Surprise bill: 2 years of forgotten snapshots', html: `<p>A cost review finds ${H.c('r', '$310/month')} for EBS snapshots. A cron job snapshots 10 volumes nightly and nothing ever deletes them. Snapshots are incremental, but daily change on busy volumes adds up: 6,200 GB stored x $0.05 = $310 (example price). Fix: a Data Lifecycle Manager policy keeping 14 daily snapshots, delete the old ones (after checking none back an AMI you still use), and a monthly report of snapshot count and size.</p>`, code: R`# Snapshots older than 90 days, oldest first (read-only)
aws ec2 describe-snapshots --owner-ids self --profile lab \
  --query "Snapshots[?StartTime<='2026-07-21'].[SnapshotId,VolumeSize,StartTime,Description]" \
  --output text | sort -k3 | head
# Snapshots used by an AMI cannot be deleted until the AMI is deregistered
aws ec2 describe-images --owners self --profile lab \
  --query 'Images[].BlockDeviceMappings[].Ebs.SnapshotId' --output text` },
      { title: 'gp2 to gp3 migration: faster and cheaper', html: `<p>A 500 GiB gp2 volume gets 1,500 IOPS (3 per GiB) for 500 x $0.10 = $50/month (example). As gp3 it gets 3,000 IOPS baseline for 500 x $0.08 = $40/month. <code>modify-volume --volume-type gp3</code> runs online, no detach. Check the instance type's EBS bandwidth so it is not the new bottleneck.</p>`, code: R`aws ec2 modify-volume --volume-id vol-0abc1234def567890 --volume-type gp3 --iops 3000 --throughput 125 --profile lab
aws ec2 describe-volumes-modifications --volume-ids vol-0abc1234def567890 \
  --query 'VolumesModifications[0].[ModificationState,Progress]' --output text --profile lab` },
      { title: 'Azure: same ideas, different names', html: `<p>Azure VMs have an <b>OS disk</b>, optional <b>data disks</b> (Managed Disks: Standard HDD, Standard SSD, Premium SSD, Premium SSD v2, Ultra) and a <b>temporary disk</b> (<code>/dev/sdb</code> or <code>/mnt</code>, wiped on redeploy - like instance store). Growing a disk: <code>az disk update --size-gb</code> (some disk types need the VM deallocated), then the same <code>growpart</code> + filesystem steps inside Linux. Shared files: <b>Azure Files</b> (SMB or NFS shares) is the EFS equivalent; GCP has Persistent Disk / Hyperdisk and Filestore.</p>`, code: R`az vm disk attach --resource-group rg-devops05-lab --vm-name vm-web --name data1 --new --size-gb 4 --sku StandardSSD_LRS
az disk update --resource-group rg-devops05-lab --name data1 --size-gb 8` }
    ],
    deepDive: `<p>🟣 <b>Why EBS is zonal.</b> An EBS volume is network-attached block storage replicated <i>within one AZ</i> - close enough for sub-millisecond latency on every write. Replicating synchronously to other AZs would add latency to every disk write, so AWS leaves cross-AZ protection to snapshots (regional) or the application (database replication). io2 volumes are designed for 99.999% durability; gp3 for 99.8-99.9% annual durability - meaning a small fraction of volumes fail each year, which is exactly why snapshots matter.</p>
      <p><b>Performance has three limits.</b> A volume's IOPS and throughput (gp3: set separately), the <b>instance type's</b> EBS bandwidth (small types have "up to" burst limits), and the I/O pattern (queue depth, block size). Measure with <code>iostat -xz 1</code> (Cloud &amp; DevOps 1) and CloudWatch <code>VolumeQueueLength</code>; high queue with low throughput often means IOPS-bound. Volumes restored from snapshots are slow on first read of each block (lazy loading) unless you pre-read them or enable fast snapshot restore.</p>
      <p><b>Crash-consistent vs application-consistent.</b> A snapshot captures blocks as they are at that instant - like pulling the power cord. Journaling filesystems recover, but a database may need recovery or lose in-flight transactions. For consistent backups, flush and freeze (<code>fsfreeze</code>, or the database's backup mode), or use AWS Backup with application-aware options, or multi-volume crash-consistent snapshot sets for data spread over several volumes.</p>
      <p><b>EFS details.</b> EFS is NFSv4.1, scales to petabytes, and charges for bytes stored (with cheaper Infrequent Access and Archive classes via lifecycle). Throughput mode <i>elastic</i> scales automatically and bills by usage. Latency is higher than EBS (single-digit milliseconds), so it suits shared content, not database files. On Windows the equivalent is FSx for Windows File Server (SMB); for HPC, FSx for Lustre.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> paste <code>lsblk</code> and <code>df -hT</code> output and an assistant will tell you the exact <code>growpart</code> and <code>xfs_growfs</code> / <code>resize2fs</code> commands, write the fstab line, or draft a Data Lifecycle Manager policy. That turns a nervous 30-minute task into five careful minutes.</p>
      <p><b>Where it goes wrong:</b> the dangerous mistakes are device names and destructive commands: running <code>mkfs</code> on the disk that already holds data (often because the model assumed <code>/dev/xvdf</code> while Nitro shows <code>nvme1n1</code>), using <code>resize2fs</code> on XFS, forgetting <code>nofail</code> (an instance that will not boot when the disk is missing), or deleting snapshots that back an AMI. <b>How to work with it:</b> always paste the real <code>lsblk -f</code> output, take a snapshot first, and read each command. <b>What you must still own:</b> knowing which disk holds what, and that storage you provision keeps billing until you delete it.</p>`,
    problems: [P({
      t: 'The EC2 root disk is full: grow the volume and the filesystem online', l: 'Medium', tags: ['EBS', 'growpart', 'xfs_growfs', 'resize2fs', 'disk full'], co: ['AWS Support', 'Rackspace', 'HCL'],
      s: `<p>An Amazon Linux 2023 web server (<code>i-0abc1234def567890</code>) alerts at 97% disk on <code>/</code>. You have checked with <code>du</code>: the growth is real user uploads, not logs. Grow the 8 GiB gp3 root volume to 20 GiB <b>without a reboot or downtime</b>, safely, then explain what the change costs. Also say what differs on Ubuntu (ext4).</p>`,
      ex: `<p>Before: <code>df -hT /</code> → ${H.c('r', '/dev/nvme0n1p1 xfs 8.0G 7.8G 0.2G 97% /')}. After <code>modify-volume</code>, <code>growpart /dev/nvme0n1 1</code> and <code>xfs_growfs -d /</code>: ${H.c('g', '/dev/nvme0n1p1 xfs 20G 7.8G 12.2G 39% /')}. Cost: (20 - 8) GiB x $0.08 = ${H.c('b', '+$0.96 per month')} (example gp3 price).</p>`,
      bw: `<p>Stop the instance, create a bigger volume from a snapshot, swap the root device and start again - or launch a new instance and copy data. Both work but cause downtime and risk mistakes. Another anti-pattern: grow only the EBS volume in the console and close the ticket - the OS still shows 8 GiB because the partition and filesystem were never extended.</p>`,
      q: ['After <code>modify-volume</code> finishes, <code>lsblk</code> shows the disk at 20G but <code>df -h /</code> still shows 8G. What is missing?', ['Growing the partition (growpart) and then the filesystem (xfs_growfs / resize2fs)', 'A reboot', 'Detaching and re-attaching the volume', 'Nothing - df caches sizes for an hour'], 0, 'The volume, partition and filesystem are separate layers. The volume grew; the partition and filesystem must be extended inside the OS, both online.'],
      h: ['<p>Hint 1: snapshot first. Find the root volume with <code>describe-volumes</code> filtered on the instance id and device <code>/dev/xvda</code>.</p>', '<p>Hint 2: <code>modify-volume --size 20</code>, then poll <code>describe-volumes-modifications</code> until the state is <code>optimizing</code> or <code>completed</code> - the new size is usable from <code>optimizing</code>.</p>', '<p>Hint 3: inside the OS: <code>lsblk</code> → <code>sudo growpart /dev/nvme0n1 1</code> → <code>df -hT /</code> to read the filesystem type → <code>xfs_growfs -d /</code> (XFS) or <code>resize2fs /dev/nvme0n1p1</code> (ext4).</p>'],
      a: `<p><b>1. Safety:</b> create a snapshot of the root volume and wait for it. <b>2. Grow the volume:</b> <code>aws ec2 modify-volume --size 20</code>; watch the modification state. <b>3. Inside the OS</b> (Session Manager): <code>lsblk</code> shows <code>nvme0n1</code> 20G with <code>nvme0n1p1</code> 8G; <code>sudo growpart /dev/nvme0n1 1</code> extends the partition; <code>df -hT /</code> confirms XFS; <code>sudo xfs_growfs -d /</code> extends the filesystem. On Ubuntu the root is usually ext4 on <code>/dev/nvme0n1p1</code> (or <code>/dev/xvda1</code> on older types): use <code>sudo resize2fs /dev/nvme0n1p1</code>. Some AMIs grow the root automatically at boot (cloud-init <code>growpart</code>), but not while running. <b>4. Verify</b> with <code>df -h /</code>. <b>5. Follow-ups:</b> delete the safety snapshot after a few days (it costs per GB-month), add a CloudWatch agent disk alarm at 80%, and suggest moving uploads to S3 or a separate data volume. Remember: volumes cannot shrink, and you must wait about 6 hours before modifying the same volume again.</p>`,
      code: R`#!/usr/bin/env bash
set -euo pipefail
export AWS_PROFILE=lab AWS_REGION=eu-west-1
ID=i-0abc1234def567890

# 1. Find the root volume and snapshot it
VOL=$(aws ec2 describe-volumes \
  --filters Name=attachment.instance-id,Values="$ID" Name=attachment.device,Values=/dev/xvda \
  --query 'Volumes[0].VolumeId' --output text)
SNAP=$(aws ec2 create-snapshot --volume-id "$VOL" --description "before grow $(date -u +%F)" \
  --query SnapshotId --output text)
aws ec2 wait snapshot-completed --snapshot-ids "$SNAP"

# 2. Grow the EBS volume online
aws ec2 modify-volume --volume-id "$VOL" --size 20
until aws ec2 describe-volumes-modifications --volume-ids "$VOL" \
      --query 'VolumesModifications[0].ModificationState' --output text | grep -Eq 'optimizing|completed'; do
  sleep 5
done

# 3. Grow partition and filesystem inside the OS (via Session Manager, no SSH port needed)
aws ssm send-command --instance-ids "$ID" --document-name AWS-RunShellScript \
  --comment "grow root fs" --parameters 'commands=[
    "lsblk",
    "sudo growpart /dev/nvme0n1 1",
    "if [ \"$(findmnt -n -o FSTYPE /)\" = xfs ]; then sudo xfs_growfs -d /; else sudo resize2fs \"$(findmnt -n -o SOURCE /)\"; fi",
    "df -hT /"
  ]' --query Command.CommandId --output text

# 4. Later: remove the safety snapshot once you are sure (it is billed per GB-month)
echo "after a few days: aws ec2 delete-snapshot --snapshot-id $SNAP"`,
      cx: `<p>About 5-10 minutes, zero downtime. Cost: +12 GiB x example $0.08 = about $0.96/month, plus the temporary snapshot (incremental, a few cents). Risk is low with the snapshot taken first.</p>`,
      f: ['How would you automate this before it pages someone (alarm + runbook)?', 'Why might moving uploads to S3 be the better long-term fix?']
    })]
  });

  // ───────────────────────── Topic 7: pricing, free tier, budgets ─────────────────────────
  topics.push({
    title: 'Pricing and the Free Tier: Estimating a Bill, On-Demand vs Savings Plans vs Spot, and Budget Alerts',
    analogy: `<p>Cloud pricing is like <b>getting around a city</b>. <b>On-demand</b> is a taxi: no commitment, pay by the minute, most expensive per trip. A <b>Savings Plan or reservation</b> is a monthly travel pass: much cheaper per trip, but you pay for a year whether you travel or not. <b>Spot</b> is a standby seat on a flight: very cheap, but you can be bumped with short notice. And the <b>meter keeps running</b> on anything you leave parked - disks, snapshots, IP addresses and NAT gateways are cars left in a paid car park.</p>`,
    explain: `<p>🟢 <b>The three formulas you need</b> (prices are examples for us-east-1 in 2026 - they change and differ by region; always check the <b>AWS Pricing Calculator</b> at calculator.aws):</p>
      ${H.table(['What', 'Formula', 'Example'], [
        ['Compute', 'price per hour x hours x count', '3 x t3.medium ($0.0416/h) x 730 h = <b>$91.10</b>/month'],
        ['Storage', 'GB x price per GB-month (prorated by the hour)', '3 x 30 GiB gp3 x $0.08 = <b>$7.20</b>/month'],
        ['Traffic', 'GB x price per GB', '200 GB to the internet: first 100 GB/month free, then 100 x $0.09 = <b>$9.00</b>']
      ])}
      <p>A "month" in cloud maths is <b>730 hours</b> (8,760 / 12). Linux EC2 bills <b>per second</b> (60-second minimum); EBS, S3 and snapshots bill per GB-month, prorated. Data coming <b>in</b> is free; data going <b>out</b> to the internet, between regions, and between AZs is not.</p>
      <p>🟢 <b>Pricing models for compute</b> (discounts are typical examples, not promises):</p>
      ${H.table(['Model', 'Discount vs on-demand', 'Commitment', 'Good for', 'Azure', 'GCP'], [
        ['<b>On-demand</b>', '0%', 'none', 'new, spiky or short workloads, labs', 'Pay-as-you-go', 'On-demand (+ automatic sustained-use discounts on some types)'],
        ['<b>Savings Plans</b> (compute or EC2 instance)', 'about 30-70%', '$/hour for 1 or 3 years', 'steady baseline that will exist next year', 'Savings plan for compute', 'Committed use discounts (flexible)'],
        ['<b>Reserved Instances</b>', 'about 30-70%', 'a specific type/region for 1 or 3 years', 'very stable fleets (and RDS, which has no Savings Plan for instances)', 'Reservations', 'Resource-based CUDs'],
        ['<b>Spot</b>', 'up to about 90%', 'none, but 2-minute interruption notice', 'batch, CI, stateless workers that can restart', 'Spot VMs', 'Spot VMs']
      ])}
      <p>🔵 <b>The free tier changed in July 2025.</b> AWS accounts created from 15 July 2025 get a <b>Free plan</b> with up to $200 of credits (part at sign-up, more for completing starter activities) that expire after 6 months, plus "always free" offers (for example Lambda's monthly free requests). Older accounts keep the previous 12-month free tier (for example 750 hours a month of a micro instance, 30 GB of EBS, 5 GB of S3). Azure gives a credit for the first 30 days plus 12 months of popular services (such as 750 hours of <code>B1s</code>); GCP gives a 90-day credit plus an always-free <code>e2-micro</code> in some US regions. <b>Check the current free-tier page for your account</b>, and use <code>describe-instance-types --filters Name=free-tier-eligible,Values=true</code>. Free tier limits are <b>per month across all your resources</b>: two micro instances running all month use 1,460 hours.</p>
      <p>🔵 <b>The usual surprise-bill causes:</b> forgotten instances in another region, <b>EBS volumes and snapshots</b> left after termination, unattached Elastic IPs and public IPv4 addresses (an example price is $0.005/hour each), <b>NAT gateways</b> (hourly fee plus a per-GB processing fee on all traffic through them - example $0.045/h and $0.045/GB), cross-AZ chatter, large log ingestion, and leaked keys used for crypto mining. Defence: a <b>budget with alerts set before anything else</b>, tags on everything, a weekly look at Cost Explorer by service, and cleanup scripts.</p>`,
    clues: [
      '"estimate the monthly cost of N servers" → price x 730 h x N, plus GB x price for disks, plus traffic; state that prices are examples',
      '"the bill doubled and we did not launch anything" → Cost Explorer by service and region; look for NAT data processing, snapshots, idle EBS, other regions',
      '"steady 24/7 baseline, will run for years" → Savings Plan / reservation; "can be interrupted, retries are fine" → Spot',
      '"we stopped the dev servers at night but the saving is smaller than expected" → EBS and IPs still bill while stopped',
      '"student account, I am scared of charges" → budget alert first, free-tier-eligible sizes, one region, cleanup script, tags',
      '"why is NAT gateway the biggest line?" → per-GB processing; send S3/DynamoDB traffic through free gateway endpoints (Cloud &amp; DevOps 6)'
    ],
    code: [R`# 1) BEFORE ANY LAB: a budget with email alerts (account id is the documentation placeholder).
export AWS_PROFILE=lab
aws budgets create-budget --account-id 123456789012 \
  --budget '{"BudgetName":"lab-10-usd","BudgetLimit":{"Amount":"10","Unit":"USD"},"TimeUnit":"MONTHLY","BudgetType":"COST"}' \
  --notifications-with-subscribers '[{"Notification":{"NotificationType":"ACTUAL","ComparisonOperator":"GREATER_THAN","Threshold":50,"ThresholdType":"PERCENTAGE"},"Subscribers":[{"SubscriptionType":"EMAIL","Address":"you@example.com"}]}]'

# 2) Classic billing alarm (CloudWatch). Enable "Receive CloudWatch billing alerts" in
#    Billing preferences first; billing metrics exist only in us-east-1.
TOPIC=$(aws sns create-topic --name billing-alerts --region us-east-1 --query TopicArn --output text)
aws sns subscribe --topic-arn "$TOPIC" --protocol email --notification-endpoint you@example.com --region us-east-1
aws cloudwatch put-metric-alarm --region us-east-1 --alarm-name billing-over-10-usd \
  --namespace AWS/Billing --metric-name EstimatedCharges --dimensions Name=Currency,Value=USD \
  --statistic Maximum --period 21600 --evaluation-periods 1 --threshold 10 \
  --comparison-operator GreaterThanThreshold --alarm-actions "$TOPIC"

# 3) Where is the money going this month? (Cost Explorer API: a small per-request fee)
aws ce get-cost-and-usage --time-period Start=2026-10-01,End=2026-10-19 \
  --granularity MONTHLY --metrics UnblendedCost \
  --group-by Type=DIMENSION,Key=SERVICE \
  --query 'ResultsByTime[0].Groups[].[Keys[0],Metrics.UnblendedCost.Amount]' --output text | sort -t$'\t' -k2 -gr | head

# 4) Quick estimate: price x hours x count + GB x GB-month price (example prices)
awk 'BEGIN { c = 0.0416 * 730 * 3; s = 3 * 30 * 0.08; printf "compute $%.2f + storage $%.2f = $%.2f/month\n", c, s, c + s }'`, R`# Spot: same run-instances call with a market option (for interruptible work only)
aws ec2 describe-spot-price-history --instance-types t3.micro --product-descriptions "Linux/UNIX" \
  --start-time 2026-10-19T00:00:00Z --query 'SpotPriceHistory[].[AvailabilityZone,SpotPrice]' --output table --profile lab
aws ec2 run-instances --profile lab \
  --image-id resolve:ssm:/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64 \
  --instance-type t3.micro --instance-market-options 'MarketType=spot' \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=lab,Value=devops05}]' \
  --query 'Instances[0].InstanceId' --output text
# Inside a spot instance, an interruption notice appears here 2 minutes before (404 = none):
#   curl -s -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/spot/instance-action`],
    codeTitle: ['Budget, billing alarm, Cost Explorer and a quick estimate', 'Spot price history and a spot launch'],
    viz: [{
      title: 'Build a monthly bill line by line, then compare pricing models',
      input: 'price=0.0416 count=3 hours=730 ebs=30 snapgb=60 natgb=500',
      inputLabel: 'price = $/hour per instance, count, hours per month, ebs = GiB per instance, snapgb = snapshot GB stored, natgb = GB through a NAT gateway',
      gen: function (input) {
        var o = kvIn(input, ['price', 'count', 'hours', 'ebs', 'snapgb', 'natgb'], 'Use: price=0.0416 count=3 hours=730 ebs=30 snapgb=60 natgb=500');
        var pr = o.price === undefined ? 0.0416 : o.price, n = o.count === undefined ? 3 : o.count, h = o.hours === undefined ? 730 : o.hours;
        var ebs = o.ebs === undefined ? 30 : o.ebs, snap = o.snapgb || 0, nat = o.natgb || 0;
        if (pr < 0 || pr > 50 || n < 0 || n > 500 || h < 0 || h > 744 || ebs < 0 || ebs > 16384 || snap < 0 || nat < 0 || nat > 1e6) throw new Error('Keep price 0-50, count 0-500, hours 0-744, sizes non-negative');
        var comp = pr * h * n, stor = n * ebs * 0.08, sn = snap * 0.05, natc = nat > 0 ? 0.045 * 730 + nat * 0.045 : 0, tot = comp + stor + sn + natc;
        var lines = [['compute', pr + ' x ' + h + ' h x ' + n, money(comp)]];
        var f = [];
        f.push({ narr: '<b>Compute</b> = price per hour x hours x count = ' + pr + ' x ' + h + ' x ' + n + ' = <b>' + money(comp) + '</b>. 730 hours is a full month; a dev box running 10 h x 22 working days is only 220 hours.', parts: [{ type: 'table', label: 'bill so far (example prices)', columns: ['line', 'maths', '$/month'], rows: lines.slice() }] });
        lines.push(['EBS gp3', n + ' x ' + ebs + ' GiB x $0.08', money(stor)]);
        f.push({ narr: '<b>Disks</b> = GB x price per GB-month = ' + n + ' x ' + ebs + ' x $0.08 = <b>' + money(stor) + '</b>. This line is billed for the <b>whole month even if the instances are stopped</b>, because you pay for provisioned size.', parts: [{ type: 'table', label: 'bill so far', columns: ['line', 'maths', '$/month'], rows: lines.slice(), hl: { 1: 'cur' } }] });
        lines.push(['EBS snapshots', snap + ' GB x $0.05', money(sn)]);
        f.push({ narr: '<b>Snapshots</b> = ' + snap + ' GB x $0.05 = <b>' + money(sn) + '</b>. Small now - but snapshots never expire on their own, so without a retention policy this line only grows.', parts: [{ type: 'table', label: 'bill so far', columns: ['line', 'maths', '$/month'], rows: lines.slice(), hl: { 2: 'cur' } }] });
        lines.push(['NAT gateway', nat > 0 ? '730 h x $0.045 + ' + nat + ' GB x $0.045' : 'none', money(natc)]);
        f.push({ narr: '<b>NAT gateway</b> = hourly fee + per-GB processing = ' + (nat > 0 ? money(0.045 * 730) + ' + ' + money(nat * 0.045) + ' = <b>' + money(natc) + '</b>. Every GB private instances download (OS updates, S3 reads, container images) passes through it.' : '<b>$0</b> (none in this design).'), parts: [{ type: 'table', label: 'bill so far', columns: ['line', 'maths', '$/month'], rows: lines.slice(), hl: { 3: nat > 0 ? 'bad' : 'cur' } }] });
        f.push({ narr: '<b>Total ≈ ' + money(tot) + ' per month</b> (before tax, support plan and data transfer out). The biggest line is ' + ['compute', 'EBS', 'snapshots', 'NAT'][[comp, stor, sn, natc].indexOf(Math.max(comp, stor, sn, natc))] + ' - always look at the biggest line first when cutting cost.', parts: [{ type: 'bars', label: '$/month per line', values: [comp, stor, sn, natc].map(function (x) { return Math.round(x * 100) / 100; }), idxLabels: ['compute', 'EBS', 'snapshots', 'NAT'], hl: one([comp, stor, sn, natc].indexOf(Math.max(comp, stor, sn, natc)), 'sel') }] });
        var sp = comp * 0.7, spot = comp * 0.3;
        f.push({ narr: 'Same compute under other models (example discounts): a 1-year <b>Savings Plan</b> at about 30% off = ' + money(sp) + '; <b>Spot</b> at about 70% off = ' + money(spot) + ' but instances can be reclaimed with 2 minutes notice. A common mix: Savings Plan for the always-on baseline, on-demand for peaks, Spot for batch.', parts: [{ type: 'bars', label: 'compute $/month by pricing model', values: [comp, sp, spot].map(function (x) { return Math.round(x * 100) / 100; }), idxLabels: ['on-demand', 'savings plan', 'spot'], hl: { 0: 'cur', 1: 'ok', 2: 'sel' } }] });
        return f;
      }
    }],
    examples: [
      { title: 'Surprise bill: the NAT gateway line', html: `<p>A team moved app servers into private subnets behind one NAT gateway. The bill jumped by ${H.c('r', '$480')}. Cost Explorer by usage type showed <code>NatGateway-Bytes</code>: 10 TB a month, almost all of it the servers pulling objects from <b>S3 in the same region</b>. 10,000 GB x $0.045 = $450, plus 730 h x $0.045 = $33 (example prices). Fix: an <b>S3 gateway VPC endpoint</b> (free) so S3 traffic bypasses the NAT; NAT cost falls to about $40. VPC design and endpoints are Cloud &amp; DevOps 6.</p>`, code: R`aws ce get-cost-and-usage --time-period Start=2026-09-01,End=2026-10-01 --granularity MONTHLY \
  --metrics UnblendedCost --group-by Type=DIMENSION,Key=USAGE_TYPE --profile lab \
  --query "ResultsByTime[0].Groups[?contains(Keys[0], 'NatGateway')].[Keys[0],Metrics.UnblendedCost.Amount]" --output text` },
      { title: 'Dev servers: schedule them, do not just shrink them', html: `<p>Five <code>m7i.large</code> dev servers ($0.1008/h example) run 24/7: 5 x 730 x $0.1008 = ${H.c('r', '$367.92')}/month. Used only 10 h on 22 working days = 220 h: 5 x 220 x $0.1008 = ${H.c('g', '$110.88')}. Their 50 GiB volumes still cost 5 x 50 x $0.08 = $20 either way. A scheduler (EventBridge Scheduler or Instance Scheduler) that stops them at 20:00 and starts them at 08:00 saves about 70% of compute.</p>` },
      { title: 'Savings Plan or Spot? Three workloads', html: `${H.table(['Workload', 'Pattern', 'Choice'], [
        ['Web tier baseline: 4 instances 24/7 for the next 2 years', 'steady, predictable', H.c('g', '1- or 3-year Compute Savings Plan covering the 4')],
        ['Black Friday peak: +8 instances for 3 days', 'short, unpredictable', H.c('g', 'on-demand (or spot with on-demand fallback via an Auto Scaling group)')],
        ['Nightly video transcoding, can retry a chunk', 'interruptible batch', H.c('g', 'Spot, spread across several instance types and AZs')]
      ])}<p>Never put a single, stateful, non-replicated database on Spot. Never buy a 3-year commitment for something you might delete next quarter.</p>` },
      { title: 'A safe student setup that costs $0-2 a month', html: `<p>One region only, a $5 budget with alerts at 50% and 100%, free-tier-eligible types (<code>t3.micro</code> / <code>t4g.micro</code>), every lab resource tagged <code>lab=...</code>, no NAT gateways (use public subnets or Session Manager for labs), no Elastic IPs left unattached, and a cleanup script run at the end of every session. Check <b>Billing → Free tier</b> usage weekly. On Azure: one resource group per lab, deleted at the end.</p>`, code: R`# End-of-session cleanup check: anything still running or billing?
for r in eu-west-1 us-east-1; do
  echo "== $r"
  aws ec2 describe-instances --region "$r" --filters Name=instance-state-name,Values=running,stopped \
    --query 'Reservations[].Instances[].[InstanceId,InstanceType,State.Name]' --output text --profile lab
  aws ec2 describe-volumes --region "$r" --filters Name=status,Values=available \
    --query 'Volumes[].[VolumeId,Size]' --output text --profile lab
  aws ec2 describe-addresses --region "$r" --query 'Addresses[?AssociationId==null].PublicIp' --output text --profile lab
  aws ec2 describe-nat-gateways --region "$r" --filter Name=state,Values=available \
    --query 'NatGateways[].NatGatewayId' --output text --profile lab
done` }
    ],
    deepDive: `<p>🟣 <b>How Savings Plans really apply.</b> You commit to a dollar amount of compute per hour (for example $2/h) for 1 or 3 years. Every hour, AWS applies the discounted rate to your eligible usage until the commitment is used; anything above is billed on-demand, and any unused commitment is <b>lost</b> for that hour. Compute Savings Plans follow you across instance families, sizes, regions, and even Fargate and Lambda; EC2 Instance Savings Plans are cheaper but locked to one family in one region. So you size the commitment to the <b>lowest steady usage</b> you are sure of, not the average. Payment options (no upfront, partial, all upfront) trade cash flow for a slightly bigger discount.</p>
      <p><b>Spot internals.</b> Spot uses spare capacity; the price moves slowly with long-term supply and demand (no bidding wars any more), and AWS reclaims capacity with a <b>2-minute notice</b> in instance metadata and an EventBridge event (plus an earlier "rebalance recommendation"). Good Spot design: many instance types and AZs (capacity-optimised allocation), checkpointing, idempotent jobs, and an Auto Scaling group or Spot Fleet that replaces interrupted capacity.</p>
      <p><b>Data transfer is the hard part of estimates.</b> Prices differ by direction and destination: internet egress is tiered (cheaper per GB at large volumes), cross-region transfer is a per-GB fee, cross-AZ is billed on both sides, and traffic through NAT gateways, load balancers and some endpoints adds processing charges. A CDN in front of S3 or a load balancer often lowers egress cost and latency. Architects draw the traffic paths on the diagram before estimating.</p>
      <p><b>Cost visibility at scale.</b> Turn on <b>cost allocation tags</b> (for example <code>team</code>, <code>env</code>) in the billing console so Cost Explorer can group by them; use AWS Organizations consolidated billing so discounts are shared; export the Cost and Usage Report (CUR 2.0 / Data Exports) to S3 and query it with Athena for detail per resource. This discipline is called <b>FinOps</b>, and cost optimisation is one of the Well-Architected pillars (Cloud &amp; DevOps 17).</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> an assistant can turn an architecture description into a first cost estimate, explain a confusing bill line (<code>EUW1-NatGateway-Bytes</code>), write Cost Explorer queries and cleanup scripts, and compare Savings Plan scenarios. Cloud providers now ship AI cost assistants inside their consoles that answer "why did my bill go up?" from your actual data.</p>
      <p><b>Where it goes wrong:</b> models quote prices from their training data - often out of date or for the wrong region - and present them as fact. They forget the free-tier rules changed, ignore data transfer, and underestimate always-on items like NAT gateways and public IPv4. <b>How to work with it:</b> use AI for the <i>structure</i> of the estimate (which lines exist, the formulas), then fill in the numbers from the Pricing Calculator for your region and date, and label them "example, as of DATE". <b>What you must still own:</b> setting the budget alert before the first launch, deciding what commitment the business can safely make, and reviewing the bill every month.</p>`,
    problems: [P({
      t: 'Estimate the monthly cost of a small web tier', l: 'Easy', tags: ['pricing', 'estimation', 'EC2', 'EBS'], co: ['AWS Support', 'Accenture', 'Cognizant'],
      s: `<p>A customer asks: "What will 3 web servers cost per month?" Write <code>monthlyEstimate(pricePerHour, count, hours, ebsGbEach, gbMonthPrice)</code> that returns the monthly cost in dollars, <b>rounded to 2 decimals</b>: compute = <code>pricePerHour x hours x count</code>, storage = <code>count x ebsGbEach x gbMonthPrice</code>. <code>hours</code> is how long the instances <i>run</i> in the month (730 = always on); disks are billed the whole month regardless. Then show the same calculation in Bash and explain the answer to the customer with the right caveats.</p>`,
      c: `<p><code>0 ≤ pricePerHour ≤ 50</code>, <code>0 ≤ count ≤ 1000</code>, <code>0 ≤ hours ≤ 744</code>, <code>0 ≤ ebsGbEach ≤ 16384</code>. Prices are examples (us-east-1, 2026) and must be checked in the AWS Pricing Calculator. No resources are created.</p>`,
      ex: `<p>3 x <code>t3.medium</code> at $0.0416/h, always on, 30 GiB gp3 each at $0.08: compute 0.0416 x 730 x 3 = ${H.c('b', '$91.104')}, storage 3 x 30 x 0.08 = ${H.c('b', '$7.20')}, total ${H.c('g', '$98.30')}. If they are <b>stopped all month</b> (hours = 0) the bill is still ${H.c('r', '$7.20')} - the disks.</p>`,
      bw: `<p>Multiply the hourly price by 24 x 30 and forget the disks: 0.0416 x 720 x 3 = $89.86. It undercounts the month (730 h is the cloud convention), ignores EBS (billed even when stopped), and sounds more precise than it is because it does not say that prices are examples and exclude traffic, IPs and tax.</p>`,
      q: ['Two t3.micro instances run all month. How many free-tier hours do they use (old 750 h/month micro allowance)?', ['1,460 hours - over the 750-hour allowance', '730 hours - each instance has its own allowance', '750 hours exactly', '0 - micro instances are always free'], 0, 'The free-tier hours are per account per month, summed over all eligible instances: 2 x 730 = 1,460, so about 710 hours are billed.'],
      h: ['<p>Hint 1: there are only two lines here: compute (per hour, only while running) and storage (per GB-month, always).</p>', '<p>Hint 2: compute = price x hours x count; storage = count x GB x price per GB-month. Add them and round to cents.</p>', '<p>Hint 3: in Bash, floating point needs <code>awk</code> (or <code>bc</code>): <code>awk -v p=... \'BEGIN { printf "%.2f", ... }\'</code>. Explain caveats: example prices, region, data transfer, public IPv4, tax.</p>'],
      a: `<p>Compute is billed per second while running; a full month is 730 hours by convention. EBS is billed on provisioned size for the whole month, even when instances are stopped. So the estimate is <code>round(price x hours x count + count x GB x gbMonthPrice, 2)</code>. For the customer: "About <b>$98 a month</b> for 3 always-on t3.medium servers with 30 GB disks in us-east-1, using example on-demand prices from October 2026. Not included: data transfer out (first 100 GB/month free, then about $0.09/GB), public IPv4 addresses (about $3.65 each per month), load balancer, backups and tax. A 1-year Savings Plan would cut the compute part by roughly 30%. Here is a Pricing Calculator link with the exact current numbers."</p>`,
      code: R`#!/usr/bin/env bash
# estimate.sh PRICE_PER_HOUR COUNT HOURS EBS_GB_EACH GB_MONTH_PRICE
# example: ./estimate.sh 0.0416 3 730 30 0.08   -> 98.30
set -euo pipefail
awk -v p="$1" -v n="$2" -v h="$3" -v gb="$4" -v gp="$5" 'BEGIN {
  compute = p * h * n          # billed only while running
  storage = n * gb * gp        # provisioned GB, billed all month
  printf "compute  $%.2f\nstorage  $%.2f\ntotal    $%.2f  (example prices - check calculator.aws)\n", compute, storage, compute + storage
}'`,
      py: `def monthly_estimate(price_per_hour, count, hours, ebs_gb_each, gb_month_price):
    """Monthly cost: compute while running + EBS for the whole month, rounded to cents."""
    compute = price_per_hour * hours * count      # per-second billing, summed to hours
    storage = count * ebs_gb_each * gb_month_price  # provisioned size, even when stopped
    return round(compute + storage, 2)`,
      cx: `<p>O(1). The hard part of real estimates is not the arithmetic but listing every line (traffic, IPs, NAT, backups) and using current regional prices.</p>`,
      f: ['Add a public IPv4 line ($0.005 per hour per address, example) - what changes?', 'How would the estimate change with a 1-year Savings Plan at 30% off compute?'],
      tests: { sig: 'double int double int double -> double', fn: 'monthlyEstimate', cmp: 'float', cases: [
        [[0.0416, 3, 730, 30, 0.08], 98.3], [[0.0104, 1, 730, 8, 0.08], 8.23], [[0.0832, 2, 220, 20, 0.08], 39.81],
        [[0.1008, 10, 730, 100, 0.08], 815.84], [[0, 0, 730, 0, 0.08], 0], [[0.0416, 3, 0, 30, 0.08], 7.2], [[0.192, 4, 365, 50, 0.08], 296.32]
      ] }
    })]
  });

  // ───────────────────────── Practice: Easy ─────────────────────────
  practice.push(P({
    t: 'Choose a region for an Indian fintech and prove it has what you need', l: 'Easy', tags: ['regions', 'data residency', 'latency'], co: ['AWS Support', 'Infosys', 'Razorpay'],
    s: `<p>A payments start-up in India must keep payment data <b>inside India</b> (local regulation). Users are mostly in Mumbai and Delhi. They need <code>t3</code> and <code>m7i</code> instances and S3. Choose the region (and a DR region), and show read-only CLI checks that (a) the regions are enabled for the account, (b) the instance types are offered in every AZ, and (c) latency from the office is acceptable.</p>`,
    c: `<p>Read-only calls only - no cost. Use your lab profile. Regions to consider: <code>ap-south-1</code> (Mumbai) and <code>ap-south-2</code> (Hyderabad, an opt-in region).</p>`,
    ex: `<p>Law removes everything outside India → ${H.c('b', 'ap-south-1, ap-south-2')}. Mumbai has more AZs and services and is close to both cities → primary ${H.c('g', 'ap-south-1')}, DR ${H.c('g', 'ap-south-2')} (still in India). <code>describe-regions --all-regions</code> shows ap-south-2 as ${H.c('y', 'not-opted-in')} until enabled.</p>`,
    bw: `<p>Pick <code>us-east-1</code> "because it is cheapest and has everything", or Singapore "because it is close". Both break the residency requirement, which is a legal blocker - no price or latency advantage can fix that, and moving later is a full migration.</p>`,
    q: ['In what order should you weigh region criteria?', ['Law/residency, then latency, then service availability, then price', 'Price, then latency', 'Latency only', 'Whatever region the console opens in'], 0, 'Legal requirements are hard constraints, so they filter first. Among legal regions, latency to users matters most, then whether the services exist, then price.'],
    h: ['<p>Hint 1: residency is a filter, not a score. Write down the legal regions first; everything else picks among them.</p>', '<p>Hint 2: <code>aws ec2 describe-regions --all-regions</code> shows <code>OptInStatus</code>; <code>describe-instance-type-offerings --location-type availability-zone</code> shows types per AZ.</p>', '<p>Hint 3: a rough latency check: time a TLS connection to each regional endpoint with <code>curl -w "%{time_connect}"</code>, several times, from the users\' city.</p>'],
    a: `<p>Filter by law: only Indian regions qualify. Between Mumbai and Hyderabad, Mumbai is the more mature region (more AZs, more services and instance types) and is close to the largest user groups, so it is primary; Hyderabad keeps DR copies in-country. Check the opt-in status (Hyderabad must be enabled by an administrator first), check that <code>t3.micro</code>, <code>t3.medium</code> and <code>m7i.large</code> exist in every Mumbai AZ, and measure connect times to both regional endpoints. Document the decision with the reason "data residency" so nobody "optimises" it into another region later. Prices: compare in the calculator; they are similar between the two.</p>`,
    code: R`#!/usr/bin/env bash
set -euo pipefail
export AWS_PROFILE=lab
# (a) are the candidate regions enabled?
aws ec2 describe-regions --all-regions \
  --filters Name=region-name,Values=ap-south-1,ap-south-2 \
  --query 'Regions[].[RegionName,OptInStatus]' --output table
# (b) are the instance types offered in every AZ of the primary region?
for t in t3.micro t3.medium m7i.large; do
  echo "== $t"
  aws ec2 describe-instance-type-offerings --region ap-south-1 --location-type availability-zone \
    --filters Name=instance-type,Values="$t" --query 'InstanceTypeOfferings[].Location' --output text
done
aws ec2 describe-availability-zones --region ap-south-1 --query 'AvailabilityZones[].ZoneName' --output text
# (c) rough latency: TCP+TLS connect time to each regional endpoint, 3 tries each
for r in ap-south-1 ap-south-2 ap-southeast-1; do
  for i in 1 2 3; do
    curl -o /dev/null -s -w "$r %{time_connect}s\n" "https://ec2.$r.amazonaws.com/"
  done
done`,
    cx: `<p>Minutes; free. The decision lasts years, so write it down with the reasons.</p>`,
    f: ['What else could move payment data out of India (logs, backups, support tools)?', 'How do you enable an opt-in region, and who should be allowed to?']
  }));

  practice.push(P({
    t: 'Share a private file from S3 for one day, then clean up', l: 'Easy', tags: ['S3', 'presigned URL', 'cleanup'], co: ['AWS Support', 'Freshworks'],
    s: `<p>Finance must send a 2 MB PDF report to an external auditor. Company policy: no public buckets. Create a bucket named <code>example-bucket-reports-yourname</code>, confirm Block Public Access is on, upload the file, generate a link that works for <b>24 hours</b> only, prove that the plain object URL is denied, and delete everything after the audit.</p>`,
    ex: `<p><code>curl -I https://example-bucket-reports-yourname.s3.eu-west-1.amazonaws.com/q3.pdf</code> → ${H.c('r', '403 Forbidden')}; the presigned URL → ${H.c('g', '200 OK')}; after 24 hours the presigned URL → ${H.c('r', '403 Request has expired')}.</p>`,
    bw: `<p>Make the object public ("just for a day") or email the PDF. Public objects are found by scanners within hours and people forget to undo it; email attachments get forwarded with no expiry or audit trail.</p>`,
    q: ['Who can use a presigned URL?', ['Anyone who has the link, until it expires', 'Only IAM users in your account', 'Only the person who generated it', 'Nobody until the bucket is made public'], 0, 'The URL carries a signature made with the creator\'s credentials, so whoever holds it can GET that one object until expiry. Share it carefully; it also stops working if the signer\'s credentials expire first.'],
    h: ['<p>Hint 1: <code>aws s3 mb</code> creates the bucket; new buckets already have all four Block Public Access settings on - check with <code>get-public-access-block</code>.</p>', '<p>Hint 2: <code>aws s3 presign s3://BUCKET/KEY --expires-in 86400</code> (seconds). Note: a URL signed with SSO/role credentials is valid at most until those credentials expire.</p>', '<p>Hint 3: cleanup with <code>aws s3 rm</code> then <code>aws s3 rb</code>; if versioning is on, delete versions first (or use the console "Empty" button).</p>'],
    a: `<p>Create the bucket in your region, confirm Block Public Access, upload with <code>aws s3 cp</code>, then generate the presigned URL for 86,400 seconds. Test both URLs with <code>curl -I</code>. Send the link over a channel the auditor trusts. Because a presigned URL is limited by the lifetime of the credentials that signed it, sign with a role session that lasts long enough, or accept a shorter window. After the audit, remove the object and the bucket. Cost: fractions of a cent (2 MB stored for a day, a few requests).</p>`,
    code: R`#!/usr/bin/env bash
set -euo pipefail
export AWS_PROFILE=lab AWS_REGION=eu-west-1
B=example-bucket-reports-yourname
aws s3 mb "s3://$B"
aws s3api get-public-access-block --bucket "$B" \
  --query 'PublicAccessBlockConfiguration' --output table      # all four: True
aws s3 cp q3.pdf "s3://$B/q3.pdf"
URL=$(aws s3 presign "s3://$B/q3.pdf" --expires-in 86400)
curl -s -o /dev/null -w 'plain URL: %{http_code}\n' "https://$B.s3.$AWS_REGION.amazonaws.com/q3.pdf"   # 403
curl -s -o /dev/null -w 'presigned: %{http_code}\n' "$URL"                                             # 200
echo "send to auditor: $URL"

# ---- CLEANUP after the audit ----
aws s3 rm "s3://$B/q3.pdf"
aws s3 rb "s3://$B"`,
    cx: `<p>Two minutes; under $0.01. The main risk is forgetting the cleanup - put a calendar reminder or a lifecycle expiration rule on the bucket.</p>`,
    f: ['How would you do this on Azure (SAS token)?', 'How would you log who downloaded the file?']
  }));

  practice.push(P({
    t: 'What does a 3-hour lab really cost? (prorated maths)', l: 'Easy', tags: ['pricing', 'proration', 'free tier'], co: ['AWS Support', 'Cognizant'],
    s: `<p>Learners ask "will this lab cost me money?". Write <code>labCost(pricePerHour, count, hours, ebsGbEach, gbMonthPrice)</code> that returns the cost of running <code>count</code> instances for <code>hours</code> hours, each with an EBS volume of <code>ebsGbEach</code> GB, then deleting everything. Compute is <code>price x hours x count</code>; EBS is prorated: <code>count x GB x gbMonthPrice x hours / 730</code>. Round to <b>4 decimals</b> (fractions of a cent matter for labs). Also give the Bash version.</p>`,
    c: `<p><code>0 ≤ hours ≤ 744</code>; prices are examples. No resources created. Ignore free-tier credits and public IPv4 here (mention them in your explanation).</p>`,
    ex: `<p>1 x t3.micro ($0.0104/h) + 8 GB gp3 ($0.08) for 3 hours: compute 0.0312 + EBS 8 x 0.08 x 3 / 730 = 0.00263 → ${H.c('g', '$0.0338')}. The same left running all month: ${H.c('r', '$8.232')} - that is why cleanup matters more than instance size.</p>`,
    bw: `<p>Charge the whole month of EBS for a 3-hour lab (8 x 0.08 = $0.64), or ignore EBS entirely. The first scares learners away from labs; the second hides the cost that keeps running if they only <i>stop</i> the instance.</p>`,
    q: ['You stop (not terminate) the lab instance and forget it for a month. What keeps costing money?', ['The EBS volume (and any Elastic IP)', 'Nothing - stopped means free', 'Only the compute hours', 'The AMI'], 0, 'Stopping ends compute billing but the provisioned volume is billed per GB-month, and Elastic IPs are billed too. Terminate and delete to reach zero.'],
    h: ['<p>Hint 1: a month is 730 hours in cloud maths, so one hour of a GB-month price is <code>price / 730</code>.</p>', '<p>Hint 2: total = <code>price x hours x count + count x GB x gbPrice x hours / 730</code>.</p>', '<p>Hint 3: round to 4 decimals at the end only; zero hours means zero cost because nothing existed.</p>'],
    a: `<p>Both lines scale with time: compute per second while running, EBS per GB-month prorated to the hours the volume existed. Add them and round. For the learner: "This lab costs about <b>3-4 US cents</b> if you delete everything within 3 hours (example prices). Free-tier credits may cover it entirely. A public IPv4 adds about $0.005/hour. The real risk is leaving it: a forgotten lab costs about $8 a month, and a forgotten <i>stopped</i> one still costs the EBS part."</p>`,
    code: R`#!/usr/bin/env bash
# lab_cost.sh PRICE_PER_HOUR COUNT HOURS EBS_GB_EACH GB_MONTH_PRICE
set -euo pipefail
awk -v p="$1" -v n="$2" -v h="$3" -v gb="$4" -v gp="$5" 'BEGIN {
  compute = p * h * n
  ebs     = n * gb * gp * h / 730      # GB-month prorated by the hour
  printf "compute $%.4f  ebs $%.4f  total $%.4f\n", compute, ebs, compute + ebs
}'`,
    py: `def lab_cost(price_per_hour, count, hours, ebs_gb_each, gb_month_price):
    """Cost of running a lab for the given hours, then deleting everything (4 decimals)."""
    compute = price_per_hour * hours * count
    ebs = count * ebs_gb_each * gb_month_price * hours / 730   # prorated GB-month
    return round(compute + ebs, 4)`,
    cx: `<p>O(1). Good habit: print this estimate at the top of every lab script.</p>`,
    f: ['Add a NAT gateway ($0.045/h example) - how much does a 3-hour lab cost now?', 'Why does per-second billing make short labs cheap?'],
    tests: { sig: 'double int double int double -> double', fn: 'labCost', cmp: 'float', cases: [
      [[0.0104, 1, 3, 8, 0.08], 0.0338], [[0.0416, 2, 5, 20, 0.08], 0.4379], [[0.0104, 1, 730, 8, 0.08], 8.232], [[0, 0, 10, 0, 0.08], 0],
      [[0.1008, 3, 24, 30, 0.08], 7.4943], [[0.0104, 1, 0, 8, 0.08], 0], [[0.0832, 1, 1, 100, 0.08], 0.0942]
    ] }
  }));

  practice.push(P({
    t: '"My instances are stopped but I am still billed"', l: 'Easy', tags: ['billing', 'EBS', 'Elastic IP', 'cleanup'], co: ['AWS Support', 'Wipro'],
    s: `<p>A customer stopped 4 old test servers two months ago and still pays about $35/month for them. Explain where the money goes, find every billable leftover with read-only commands, then retire the servers safely: keep a way to restore them for 30 days, and stop all other charges.</p>`,
    ex: `<p>Found: 4 stopped instances with 50 GiB gp3 each → 4 x 50 x $0.08 = ${H.c('r', '$16.00')}; 4 Elastic IPs not attached to a running instance → 4 x 730 x $0.005 = ${H.c('r', '$14.60')}; 2 old unattached volumes 30 GiB → ${H.c('r', '$4.80')}. Total ≈ $35.40 (example prices). After cleanup: one AMI per server (snapshots, incremental) ≈ ${H.c('g', '$4-8')} until deleted after 30 days.</p>`,
    bw: `<p>Terminate everything immediately. The bill stops, but the customer loses the data with no way back, and the Elastic IPs (allocated separately) and the unattached volumes keep billing anyway, because terminating instances does not release them.</p>`,
    q: ['Which of these is billed while an instance is stopped?', ['Its EBS volumes and any Elastic IP addresses', 'vCPU hours', 'Memory hours', 'Instance store'], 0, 'Compute (vCPU and memory) stops with the instance. Provisioned EBS storage and allocated public IPv4 addresses keep billing until deleted or released.'],
    h: ['<p>Hint 1: three describe calls cover most cases: stopped instances, volumes (attached and <code>available</code>), and addresses.</p>', '<p>Hint 2: to keep a restore path, <code>create-image</code> from each stopped instance (it snapshots its volumes) - then the volumes themselves can go.</p>', '<p>Hint 3: order: image → wait available → terminate → release Elastic IPs → delete unattached volumes → put a reminder to deregister images and delete snapshots after 30 days.</p>'],
    a: `<p>Explain: stopping ends compute charges only. Volumes are billed for provisioned size; Elastic IPs (and all public IPv4) are billed per hour. List them with the describe calls. To retire safely, create an AMI of each stopped server (a snapshot of its disks, billed only for used and changed blocks), terminate the instances, release the Elastic IPs, delete the unattached volumes after confirming nobody needs them (snapshot them first if unsure), and tag the AMIs <code>delete-after=YYYY-MM-DD</code>. After 30 days, deregister the AMIs and delete their snapshots.</p>`,
    code: R`#!/usr/bin/env bash
set -euo pipefail
export AWS_PROFILE=lab
aws ec2 describe-instances --filters Name=instance-state-name,Values=stopped \
  --query 'Reservations[].Instances[].[InstanceId,InstanceType,LaunchTime]' --output text
STOPPED=$(aws ec2 describe-instances --filters Name=instance-state-name,Values=stopped \
  --query 'Reservations[].Instances[].InstanceId' --output text)
aws ec2 describe-volumes --query 'Volumes[].[VolumeId,Size,State,Attachments[0].InstanceId]' --output text
aws ec2 describe-addresses --query 'Addresses[].[PublicIp,AllocationId,InstanceId]' --output text

# Retire: image first (restore path), then terminate
for id in $STOPPED; do
  ami=$(aws ec2 create-image --instance-id "$id" --name "retired-$id-$(date +%F)" \
        --tag-specifications "ResourceType=image,Tags=[{Key=delete-after,Value=$(date -d '+30 days' +%F)}]" \
        --query ImageId --output text)
  aws ec2 wait image-available --image-ids "$ami"
  aws ec2 terminate-instances --instance-ids "$id" > /dev/null
  echo "$id -> $ami"
done
# Release Elastic IPs that are not associated with anything
for alloc in $(aws ec2 describe-addresses --query 'Addresses[?AssociationId==null].AllocationId' --output text); do
  aws ec2 release-address --allocation-id "$alloc"
done
# Unattached volumes: review the list, then delete
aws ec2 describe-volumes --filters Name=status,Values=available --query 'Volumes[].VolumeId' --output text`,
    cx: `<p>15 minutes. Saves about $30/month here; the AMIs cost a few dollars until deleted.</p>`,
    f: ['How would you automate the 30-day deletion?', 'When is stopping (not terminating) the right choice?']
  }));

  // ───────────────────────── Practice: Medium ─────────────────────────
  practice.push(P({
    t: 'Pick an S3 storage class from an access pattern', l: 'Medium', tags: ['S3', 'storage classes', 'cost'], co: ['AWS Support', 'Deloitte', 'Swiggy'],
    s: `<p>Write <code>pickStorageClass(readsPerMonth, keepDays, maxWaitMinutes, recreatable)</code> returning one of <code>STANDARD</code>, <code>STANDARD_IA</code>, <code>ONEZONE_IA</code>, <code>GLACIER_IR</code>, <code>GLACIER</code>, <code>DEEP_ARCHIVE</code>, using these team rules (based on minimum durations and retrieval times):</p>
      <ol>
        <li>Kept under 30 days, or read 1+ times per month on average → <code>STANDARD</code>.</li>
        <li>Must be readable in milliseconds (<code>maxWaitMinutes == 0</code>): if kept ≥ 90 days and read at most about once a quarter (<code>readsPerMonth ≤ 0.34</code>) → <code>GLACIER_IR</code>; otherwise <code>ONEZONE_IA</code> if the data can be recreated, else <code>STANDARD_IA</code>.</li>
        <li>Can wait 12 hours or more (<code>≥ 720</code>) and kept ≥ 180 days → <code>DEEP_ARCHIVE</code>.</li>
        <li>Otherwise, kept ≥ 90 days → <code>GLACIER</code> (Flexible Retrieval).</li>
        <li>Otherwise → <code>ONEZONE_IA</code> if recreatable, else <code>STANDARD_IA</code>.</li>
      </ol>`,
    c: `<p><code>0 ≤ readsPerMonth ≤ 10<sup>6</sup></code>, <code>1 ≤ keepDays ≤ 3650</code>, <code>0 ≤ maxWaitMinutes ≤ 2880</code>. Pure logic, no cost. Real decisions should also weigh object size (IA bills at least 128 KB per object) and retrieval fees.</p>`,
    ex: `<p>App logs read 30x/month → ${H.c('g', 'STANDARD')}. Monthly reports read twice a year, kept 1 year, needed instantly → 0.17 reads/month → ${H.c('g', 'GLACIER_IR')}. Tax records kept 7 years, read almost never, a 2-day wait is fine → ${H.c('g', 'DEEP_ARCHIVE')}. Thumbnails you can regenerate, read 0.1x/month for 60 days → ${H.c('g', 'ONEZONE_IA')}.</p>`,
    bw: `<p>"Put everything in Glacier, it is cheapest." Data read often or deleted within weeks then costs more: retrieval fees, restore delays of hours that break the app, and minimum-duration charges (90 or 180 days) for objects deleted early.</p>`,
    q: ['Objects are deleted after 14 days. Which class is cheapest overall?', ['STANDARD - IA and Glacier classes bill a 30-180 day minimum', 'STANDARD_IA', 'GLACIER_IR', 'DEEP_ARCHIVE'], 0, 'Deleting an IA object after 14 days still bills 30 days; Glacier classes bill 90 or 180. For short-lived data Standard is cheapest.'],
    h: ['<p>Hint 1: apply the rules strictly in order - the first that matches wins. Rule 1 catches both short-lived and frequently read data.</p>', '<p>Hint 2: "milliseconds" rules out Glacier Flexible and Deep Archive entirely, leaving IA and Glacier Instant Retrieval.</p>', '<p>Hint 3: keep comparisons exact: <code>&lt; 30</code>, <code>≥ 1</code>, <code>== 0</code>, <code>≤ 0.34</code>, <code>≥ 720</code>, <code>≥ 180</code>, <code>≥ 90</code>. In Bash, use awk for the decimal comparison.</p>'],
    a: `<p>Encode the rules as an ordered chain of ifs, which mirrors how you would explain it to a customer: short-lived or hot data stays in Standard; data that must be instant goes to IA or, if rare and long-lived, Glacier Instant Retrieval; data that can wait goes to Glacier Flexible, or Deep Archive for the longest and slowest. One Zone-IA is only for data you can rebuild, because it lives in a single AZ. In practice, implement the answer as a lifecycle rule (Topic 5), or use <b>Intelligent-Tiering</b> when the pattern is unknown.</p>`,
    code: R`#!/usr/bin/env bash
# pick_class.sh READS_PER_MONTH KEEP_DAYS MAX_WAIT_MINUTES RECREATABLE(true|false)
set -euo pipefail
awk -v r="$1" -v k="$2" -v w="$3" -v rc="$4" 'BEGIN {
  ia = (rc == "true") ? "ONEZONE_IA" : "STANDARD_IA"
  if (k < 30 || r >= 1)            { print "STANDARD"; exit }
  if (w == 0) {
    if (k >= 90 && r <= 0.34)      { print "GLACIER_IR"; exit }
    print ia; exit
  }
  if (w >= 720 && k >= 180)        { print "DEEP_ARCHIVE"; exit }
  if (k >= 90)                     { print "GLACIER"; exit }
  print ia
}'`,
    py: `def pick_storage_class(reads_per_month, keep_days, max_wait_minutes, recreatable):
    """Team rules for choosing an S3 storage class (first matching rule wins)."""
    ia = 'ONEZONE_IA' if recreatable else 'STANDARD_IA'
    if keep_days < 30 or reads_per_month >= 1:
        return 'STANDARD'                 # hot or short-lived: minimum durations would hurt
    if max_wait_minutes == 0:             # must be instant
        if keep_days >= 90 and reads_per_month <= 0.34:
            return 'GLACIER_IR'
        return ia
    if max_wait_minutes >= 720 and keep_days >= 180:
        return 'DEEP_ARCHIVE'
    if keep_days >= 90:
        return 'GLACIER'
    return ia`,
    cx: `<p>O(1). The value is in the rules: they encode minimum durations and retrieval times.</p>`,
    f: ['When would Intelligent-Tiering be the better answer?', 'How do retrieval fees change the choice for a dataset read in full once a month?'],
    tests: { sig: 'double int int bool -> string', fn: 'pickStorageClass', cases: [
      [[30, 365, 0, false], 'STANDARD'], [[0.5, 365, 0, false], 'STANDARD_IA'], [[0.1, 365, 0, false], 'GLACIER_IR'],
      [[0.1, 60, 0, true], 'ONEZONE_IA'], [[0.01, 2555, 2880, false], 'DEEP_ARCHIVE'], [[0.05, 120, 300, false], 'GLACIER'],
      [[0.2, 20, 0, false], 'STANDARD'], [[0.2, 60, 600, false], 'STANDARD_IA'], [[0.05, 150, 1000, false], 'GLACIER']
    ] }
  }));

  practice.push(P({
    t: 'What will a year of logs cost with a lifecycle rule?', l: 'Medium', tags: ['S3', 'lifecycle', 'GB-month', 'cost'], co: ['AWS Support', 'Zomato'],
    s: `<p>An app writes <code>gbPerDay</code> GB of logs per day. A lifecycle rule moves objects to Standard-IA at age <code>iaDay</code>, to Glacier Instant Retrieval at age <code>glacierDay</code>, and deletes them at <code>expireDay</code> (<code>iaDay ≤ glacierDay ≤ expireDay</code>). Write <code>logsMonthlyCost(gbPerDay, iaDay, glacierDay, expireDay)</code> returning the <b>steady-state</b> monthly storage cost in dollars (2 decimals) with example prices Standard $0.023, Standard-IA $0.0125, Glacier IR $0.004 per GB-month. Also write the lifecycle JSON and apply it.</p>`,
    c: `<p><code>0 ≤ gbPerDay ≤ 10<sup>4</sup></code>, days ≤ 3650. Ignore request, transition and retrieval fees. Applying the rule is free; the lab bucket is <code>example-bucket-logs-yourname</code>.</p>`,
    ex: `<p>10 GB/day, IA at 30, Glacier IR at 90, delete at 365: Standard holds 10 x 30 = 300 GB → $6.90; IA holds 10 x 60 = 600 GB → $7.50; Glacier IR holds 10 x 275 = 2,750 GB → $11.00; total ${H.c('g', '$25.40')} vs ${H.c('r', '$83.95')} if all 3,650 GB stayed in Standard.</p>`,
    bw: `<p>Price the total retained data at the Standard rate (3,650 x $0.023), or at the cheapest rate (3,650 x $0.004). The first overestimates by 3x and the second underestimates by 6x; neither shows the customer what the rule actually buys.</p>`,
    q: ['In steady state, how much data sits in Standard with 10 GB/day and a move to IA at day 30?', ['300 GB - the newest 30 days', '3,650 GB', '10 GB', '30 GB'], 0, 'Each day adds 10 GB and moves the 31-day-old 10 GB out, so Standard always holds the latest 30 days: 30 x 10 = 300 GB.'],
    h: ['<p>Hint 1: in steady state each class holds "GB per day x number of days spent in that class".</p>', '<p>Hint 2: days in Standard = <code>iaDay</code>; in IA = <code>glacierDay - iaDay</code>; in Glacier IR = <code>expireDay - glacierDay</code>.</p>', '<p>Hint 3: multiply each by its price and add; round to cents. Equal days (e.g. <code>iaDay == glacierDay</code>) simply give a class zero GB.</p>'],
    a: `<p>Think of a conveyor belt: every object spends a fixed number of days in each class, so in steady state each class holds <code>gbPerDay x days</code>. Multiply by GB-month prices and add. The JSON rule uses <code>Transitions</code> with <code>Days</code> and <code>StorageClass</code>, plus <code>Expiration</code>; add <code>AbortIncompleteMultipartUpload</code> as hygiene. Apply with <code>put-bucket-lifecycle-configuration</code> and verify with <code>get-bucket-lifecycle-configuration</code>. Tell the customer the caveats: prices are examples, transition fees are per object (so batch small log files into bigger compressed ones), and reading from IA or Glacier IR costs a retrieval fee per GB.</p>`,
    code: R`#!/usr/bin/env bash
# logs_cost.sh GB_PER_DAY IA_DAY GLACIER_DAY EXPIRE_DAY, then apply the matching rule
set -euo pipefail
d=$1; ia=$2; gl=$3; ex=$4
awk -v d="$d" -v ia="$ia" -v gl="$gl" -v ex="$ex" 'BEGIN {
  std = d * ia * 0.023; inf = d * (gl - ia) * 0.0125; gir = d * (ex - gl) * 0.004
  printf "STANDARD $%.2f  STANDARD_IA $%.2f  GLACIER_IR $%.2f  total $%.2f/month\n", std, inf, gir, std + inf + gir
}'
cat > lifecycle.json <<JSON
{"Rules": [{"ID": "logs-tiering", "Status": "Enabled", "Filter": {"Prefix": "logs/"},
  "Transitions": [{"Days": $ia, "StorageClass": "STANDARD_IA"}, {"Days": $gl, "StorageClass": "GLACIER_IR"}],
  "Expiration": {"Days": $ex},
  "AbortIncompleteMultipartUpload": {"DaysAfterInitiation": 7}}]}
JSON
aws s3api put-bucket-lifecycle-configuration --bucket example-bucket-logs-yourname \
  --lifecycle-configuration file://lifecycle.json --profile lab
aws s3api get-bucket-lifecycle-configuration --bucket example-bucket-logs-yourname --profile lab`,
    py: `def logs_monthly_cost(gb_per_day, ia_day, glacier_day, expire_day):
    """Steady-state monthly S3 cost for logs under a tiering lifecycle rule (example prices)."""
    standard = gb_per_day * ia_day * 0.023
    infrequent = gb_per_day * (glacier_day - ia_day) * 0.0125
    glacier_ir = gb_per_day * (expire_day - glacier_day) * 0.004
    return round(standard + infrequent + glacier_ir, 2)`,
    cx: `<p>O(1). Steady state is reached after <code>expireDay</code> days; before that the bill grows month by month.</p>`,
    f: ['How would you estimate the month-by-month bill during the first year?', 'What would compressing logs 10:1 do to every line?'],
    tests: { sig: 'double int int int -> double', fn: 'logsMonthlyCost', cmp: 'float', cases: [
      [[10, 30, 90, 365], 25.4], [[1, 30, 90, 365], 2.54], [[100, 30, 90, 365], 254.0], [[10, 30, 30, 365], 20.3],
      [[4, 30, 180, 400], 13.78], [[10, 365, 365, 365], 83.95], [[0, 30, 90, 365], 0], [[50, 10, 30, 90], 36.0]
    ] }
  }));

  practice.push(P({
    t: 'Add a data volume that survives reboots and moves between instances', l: 'Medium', tags: ['EBS', 'mkfs', 'fstab', 'detach'], co: ['AWS Support', 'TCS'],
    s: `<p>An app on <code>i-0abc1234def567890</code> (Amazon Linux 2023, <code>eu-west-1a</code>) needs a separate 4 GiB volume mounted at <code>/data</code>. It must (1) be mounted again automatically after a reboot, (2) not stop the instance booting if it is ever missing, and (3) be movable to a replacement instance later. Do it with the CLI, prove each point, and clean up at the end of the lab.</p>`,
    ex: `<p>After the steps: <code>lsblk -f</code> shows ${H.c('g', 'nvme1n1 xfs ... /data')}; after <code>sudo reboot</code>, <code>df -h /data</code> still shows it; after detaching and re-attaching to a second instance <b>in the same AZ</b> and mounting, the test file is there.</p>`,
    bw: `<p>Add <code>/dev/nvme1n1 /data xfs defaults 0 0</code> to fstab. Device names are assigned in discovery order, so after adding another volume the name can point at the wrong disk, and without <code>nofail</code> a missing disk drops the instance into emergency mode at boot - unreachable over SSH.</p>`,
    bc: `echo "/dev/nvme1n1 /data xfs defaults 0 0" | sudo tee -a /etc/fstab   # name can change; no nofail`,
    q: ['Why mount by UUID in /etc/fstab?', ['The UUID belongs to the filesystem and never changes, while NVMe device names depend on discovery order', 'UUIDs are faster', 'fstab does not accept device names', 'It encrypts the disk'], 0, 'nvme1n1 vs nvme2n1 depends on the order disks are found. The filesystem UUID is written by mkfs and identifies exactly this filesystem wherever it is attached.'],
    h: ['<p>Hint 1: the volume must be created in the instance\'s AZ; read it from <code>describe-instances</code> (<code>Placement.AvailabilityZone</code>).</p>', '<p>Hint 2: on Nitro, <code>/dev/sdf</code> shows up as <code>/dev/nvme1n1</code>; the EBS volume id is visible as the serial in <code>lsblk -o NAME,SERIAL</code>. Check it is empty with <code>file -s</code> before <code>mkfs</code>.</p>', '<p>Hint 3: fstab line <code>UUID=... /data xfs defaults,nofail 0 2</code>; test with <code>umount</code> + <code>mount -a</code> before rebooting.</p>'],
    a: `<p>Create a gp3 volume in the same AZ, tag it, attach as <code>/dev/sdf</code>. Inside the instance confirm which NVMe device has the volume id as its serial, check it has no filesystem, run <code>mkfs.xfs</code>, mount it, and add a UUID-based fstab line with <code>nofail</code>. Prove persistence with <code>mount -a</code> and a reboot. To move it: unmount, detach, attach to another instance <b>in the same AZ</b> (for another AZ, snapshot and restore). Cleanup: unmount, remove the fstab line, detach, delete the volume. Cost: 4 GiB x $0.08 = $0.32/month prorated - cents for a lab.</p>`,
    code: R`#!/usr/bin/env bash
set -euo pipefail
export AWS_PROFILE=lab AWS_REGION=eu-west-1
ID=i-0abc1234def567890
AZ=$(aws ec2 describe-instances --instance-ids "$ID" --query 'Reservations[0].Instances[0].Placement.AvailabilityZone' --output text)
VOL=$(aws ec2 create-volume --availability-zone "$AZ" --size 4 --volume-type gp3 \
  --tag-specifications 'ResourceType=volume,Tags=[{Key=Name,Value=app-data},{Key=lab,Value=devops05}]' \
  --query VolumeId --output text)
aws ec2 wait volume-available --volume-ids "$VOL"
aws ec2 attach-volume --volume-id "$VOL" --instance-id "$ID" --device /dev/sdf
aws ec2 wait volume-in-use --volume-ids "$VOL"

# Inside the instance (paste via Session Manager). SERIAL shows the volume id without the dash.
cat > on-instance.sh <<'EOF2'
set -euo pipefail
lsblk -o NAME,SIZE,SERIAL,FSTYPE,MOUNTPOINT
DEV=/dev/nvme1n1
sudo file -s "$DEV" | grep -q ': data$' || { echo "not empty - stop"; exit 1; }
sudo mkfs.xfs "$DEV"
sudo mkdir -p /data
UUID=$(sudo blkid -s UUID -o value "$DEV")
echo "UUID=$UUID /data xfs defaults,nofail 0 2" | sudo tee -a /etc/fstab
sudo mount -a && df -h /data && echo hello | sudo tee /data/test.txt
EOF2

# Move later: (inside) sudo umount /data ; then
#   aws ec2 detach-volume --volume-id "$VOL" && aws ec2 wait volume-available --volume-ids "$VOL"
#   aws ec2 attach-volume --volume-id "$VOL" --instance-id i-0fedcba9876543210 --device /dev/sdf

# ---- CLEANUP (after: sudo umount /data and removing the fstab line) ----
aws ec2 detach-volume --volume-id "$VOL"
aws ec2 wait volume-available --volume-ids "$VOL"
aws ec2 delete-volume --volume-id "$VOL"`,
    cx: `<p>10 minutes; a few cents. The dangerous step is <code>mkfs</code> - the <code>file -s</code> check is the safety catch.</p>`,
    f: ['How do you find which NVMe device is which EBS volume when 5 are attached?', 'What changes for ext4 on Ubuntu?']
  }));

  practice.push(P({
    t: 'How much do daily snapshots cost with a retention policy?', l: 'Medium', tags: ['EBS snapshots', 'DLM', 'cost'], co: ['AWS Support', 'Flipkart'],
    s: `<p>A team snapshots a volume every day and keeps the last <code>retained</code> snapshots. The volume has <code>volumeGb</code> GB of used data and about <code>dailyChangeGb</code> GB of changed blocks per day. Because snapshots are incremental, storage is roughly <b>one full copy plus one day of changes for every additional snapshot kept</b>. Write <code>snapshotMonthlyCost(volumeGb, dailyChangeGb, retained, pricePerGbMonth)</code> (2 decimals, 0 when nothing is retained). Then create a Data Lifecycle Manager policy that enforces the retention.</p>`,
    c: `<p><code>0 ≤ retained ≤ 1000</code>; example snapshot price $0.05/GB-month. The DLM policy itself is free; the snapshots it makes are billed. The policy needs the default DLM role (<code>aws dlm create-default-role</code>).</p>`,
    ex: `<p>100 GB used, 5 GB/day changes, keep 14: (100 + 5 x 13) x $0.05 = ${H.c('g', '$8.25')}/month. Keep everything for a year (365): (100 + 5 x 364) x $0.05 = ${H.c('r', '$96.00')} - the "nobody deletes snapshots" bill.</p>`,
    bw: `<p>Assume each snapshot is a full copy: 14 x 100 GB x $0.05 = $70 - an 8x overestimate that might make the team drop backups. Or assume snapshots are free because "they are incremental" - and never set retention.</p>`,
    q: ['You delete the <b>oldest</b> of 14 incremental snapshots. Can the remaining ones still restore the full volume?', ['Yes - blocks still needed by newer snapshots are kept, only unreferenced blocks are freed', 'No - every later snapshot breaks', 'Only the newest one works', 'Only if you delete them in reverse order'], 0, 'EBS tracks which blocks each snapshot references. Deleting any snapshot frees only blocks no other snapshot needs, so every remaining snapshot restores a full volume.'],
    h: ['<p>Hint 1: the first snapshot stores all used blocks; each later one stores only blocks changed since the previous.</p>', '<p>Hint 2: with rolling retention, stored ≈ <code>volumeGb + dailyChangeGb x (retained - 1)</code>; multiply by the price.</p>', '<p>Hint 3: DLM targets volumes by <b>tag</b> (for example <code>backup=daily</code>), with a schedule (<code>CreateRule</code>) and <code>RetainRule</code> Count.</p>'],
    a: `<p>Model storage as one base copy plus the changed blocks of every retained day after the first; this is an approximation (changes that overwrite the same blocks repeatedly cost less; truly random changes more), and the exact number appears in Cost Explorer under <code>EBS:SnapshotUsage</code>. Then automate: tag the volumes, create the DLM default role, and create a policy that snapshots daily at 03:00 UTC and keeps 14. DLM deletes the oldest automatically, so the bill stays flat instead of growing forever. For several services and cross-account copies, AWS Backup does the same job with backup plans.</p>`,
    code: R`#!/usr/bin/env bash
# snap_cost.sh VOLUME_GB DAILY_CHANGE_GB RETAINED PRICE ; then enforce retention with DLM
set -euo pipefail
awk -v v="$1" -v c="$2" -v r="$3" -v p="$4" 'BEGIN {
  stored = (r > 0) ? v + c * (r - 1) : 0
  printf "stored ~%d GB -> $%.2f/month\n", stored, stored * p
}'
export AWS_PROFILE=lab
aws ec2 create-tags --resources vol-0abc1234def567890 --tags Key=backup,Value=daily
aws dlm create-default-role --resource-type snapshot
cat > dlm-policy.json <<'JSON'
{"ResourceTypes": ["VOLUME"],
 "TargetTags": [{"Key": "backup", "Value": "daily"}],
 "Schedules": [{"Name": "daily-keep-14", "CopyTags": true,
   "CreateRule": {"Interval": 24, "IntervalUnit": "HOURS", "Times": ["03:00"]},
   "RetainRule": {"Count": 14}}]}
JSON
aws dlm create-lifecycle-policy --description "daily, keep 14" --state ENABLED \
  --execution-role-arn arn:aws:iam::123456789012:role/AWSDataLifecycleManagerDefaultRole \
  --policy-details file://dlm-policy.json`,
    py: `def snapshot_monthly_cost(volume_gb, daily_change_gb, retained, price_per_gb_month):
    """Approximate monthly cost of rolling incremental snapshots."""
    if retained <= 0:
        return 0
    stored = volume_gb + daily_change_gb * (retained - 1)   # one base + changes
    return round(stored * price_per_gb_month, 2)`,
    cx: `<p>O(1) maths; the policy makes cost grow with retention, not with time.</p>`,
    f: ['What is the snapshot Archive tier and when is it worth it?', 'Why might you also copy snapshots to another region?'],
    tests: { sig: 'int int int double -> double', fn: 'snapshotMonthlyCost', cmp: 'float', cases: [
      [[100, 5, 14, 0.05], 8.25], [[100, 5, 1, 0.05], 5.0], [[100, 5, 0, 0.05], 0], [[500, 20, 30, 0.05], 54.0],
      [[50, 0, 30, 0.05], 2.5], [[200, 10, 365, 0.05], 192.0], [[1000, 50, 7, 0.05], 65.0]
    ] }
  }));

  practice.push(P({
    t: 'Hunt forgotten resources in every region', l: 'Medium', tags: ['cost', 'cleanup', 'automation'], co: ['AWS Support', 'Accenture'],
    s: `<p>A lab account's budget alert fired: $38 this month, expected $3. Nobody knows what is running. Write a <b>read-only</b> Bash report that loops over every enabled region and lists: running and stopped instances, unattached EBS volumes, snapshots older than 30 days, unassociated Elastic IPs, NAT gateways, and load balancers. Finish with what to delete and in which order.</p>`,
    ex: `<p>Report excerpt: ${H.c('r', 'us-east-1  NAT nat-0abc... available')}, ${H.c('r', 'us-east-1  volume vol-0def... 100 GiB available')}, ${H.c('y', 'eu-west-1  EIP 203.0.113.50 unassociated')}. A NAT gateway left from a tutorial alone is about $33/month (example price) before traffic.</p>`,
    bw: `<p>Look only at the console's default region. Forgotten resources are most often in the region a tutorial used (frequently us-east-1), and the console shows one region at a time.</p>`,
    q: ['Which of these keeps billing with zero traffic?', ['A NAT gateway', 'An S3 bucket with no objects', 'A security group', 'An IAM role'], 0, 'A NAT gateway has an hourly charge whether or not traffic flows. Empty buckets, security groups and IAM roles are free.'],
    h: ['<p>Hint 1: get the region list from <code>aws ec2 describe-regions --query \'Regions[].RegionName\'</code> and pass <code>--region</code> to every call.</p>', '<p>Hint 2: useful filters: volumes <code>status=available</code>; addresses with <code>AssociationId==null</code>; snapshots <code>--owner-ids self</code> with a date filter in <code>--query</code>.</p>', '<p>Hint 3: delete in dependency order: instances → load balancers → NAT gateways → release Elastic IPs → volumes → snapshots (after deregistering AMIs that use them). Re-run the report to confirm.</p>'],
    a: `<p>Loop over enabled regions and run one describe call per resource type, printing region and id per line so the output can be sorted and grepped. Keep it strictly read-only; deletion is a separate, reviewed step. Rank findings by cost: NAT gateways and running instances first, then large unattached volumes and old snapshots, then Elastic IPs. For the future: tag at creation, a weekly scheduled run of this report, and the budget alert you already have (it worked). Also check Cost Explorer grouped by region and service to confirm the report found the expensive items.</p>`,
    code: R`#!/usr/bin/env bash
# leftovers.sh - read-only report of billable leftovers in every enabled region
set -euo pipefail
export AWS_PROFILE=lab
CUTOFF=$(date -u -d '30 days ago' +%Y-%m-%d)
for r in $(aws ec2 describe-regions --query 'Regions[].RegionName' --output text); do
  aws ec2 describe-instances --region "$r" --filters Name=instance-state-name,Values=running,stopped \
    --query 'Reservations[].Instances[].[InstanceId,InstanceType,State.Name]' --output text | sed "s/^/$r instance /"
  aws ec2 describe-volumes --region "$r" --filters Name=status,Values=available \
    --query 'Volumes[].[VolumeId,Size]' --output text | sed "s/^/$r volume-unattached /"
  aws ec2 describe-snapshots --region "$r" --owner-ids self \
    --query "Snapshots[?StartTime<='$CUTOFF'].[SnapshotId,VolumeSize]" --output text | sed "s/^/$r snapshot-old /"
  aws ec2 describe-addresses --region "$r" \
    --query 'Addresses[?AssociationId==null].[PublicIp,AllocationId]' --output text | sed "s/^/$r eip-unused /"
  aws ec2 describe-nat-gateways --region "$r" --filter Name=state,Values=available \
    --query 'NatGateways[].[NatGatewayId,VpcId]' --output text | sed "s/^/$r nat /"
  aws elbv2 describe-load-balancers --region "$r" \
    --query 'LoadBalancers[].[LoadBalancerName,Type]' --output text 2>/dev/null | sed "s/^/$r lb /"
done | sort`,
    cx: `<p>About one minute for ~17 regions (6 calls each). Free (describe calls). Saves whatever it finds.</p>`,
    f: ['How would you run this weekly and email the result?', 'How could an Organizations SCP stop resources being created in unused regions?']
  }));

  practice.push(P({
    t: 'Bake a golden AMI and launch it in a second region', l: 'Medium', tags: ['AMI', 'copy-image', 'regions', 'cleanup'], co: ['AWS Support', 'Capgemini'],
    s: `<p>The web server you configured in <code>eu-west-1</code> must also run in <code>eu-central-1</code> for a DR test. Create an image from it (without rebooting production if possible), copy it to Frankfurt, launch one free-tier-sized instance there from the copy, check it serves the page, then remove <b>everything</b> in both regions: the test instance, both AMIs and all their snapshots.</p>`,
    ex: `<p><code>create-image</code> → ${H.c('b', 'ami-0aaa... (eu-west-1)')}; <code>copy-image</code> → ${H.c('b', 'ami-0bbb... (eu-central-1)')}, a <b>different id</b> in the new region. The test instance returns the same page. Cleanup leaves ${H.c('g', '0 images and 0 snapshots')} with the lab tag in both regions.</p>`,
    bw: `<p>Try <code>run-instances --image-id ami-0aaa... --region eu-central-1</code>: it fails with <code>InvalidAMIID.NotFound</code> because AMIs are regional. And deleting only the AMI (<code>deregister-image</code>) leaves its snapshots billing in both regions.</p>`,
    q: ['What does <code>--no-reboot</code> on <code>create-image</code> trade away?', ['Filesystem consistency: the snapshot is taken while the OS is writing, like pulling the plug', 'Nothing at all', 'The AMI will be private', 'The image will be x86 only'], 0, 'Without a reboot the snapshot is crash-consistent. Usually fine for stateless web servers; for databases stop the service or use application-consistent backups.'],
    h: ['<p>Hint 1: <code>aws ec2 create-image --no-reboot</code> then <code>aws ec2 wait image-available</code>.</p>', '<p>Hint 2: <code>copy-image</code> is called in the <b>destination</b> region with <code>--source-region</code>; wait for it there.</p>', '<p>Hint 3: for cleanup, read each AMI\'s snapshot ids from <code>describe-images</code> before deregistering, then delete those snapshots in the matching region.</p>'],
    a: `<p>Image the source instance with <code>--no-reboot</code> (fine for a stateless web server), tag it, wait until available, copy to Frankfurt and wait there. Launch a <code>t3.micro</code> from the copy in the default VPC with a security group that allows HTTP from your IP, test with curl. Cleanup per region: terminate the instance, delete the security group, read the AMI's snapshot ids, deregister the AMI, delete the snapshots. Cost: two image copies of an 8 GiB root (snapshots at an example $0.05/GB-month, prorated), one cross-region copy (per-GB inter-region transfer), and an hour of t3.micro - well under $0.10 if cleaned up the same day.</p>`,
    code: R`#!/usr/bin/env bash
set -euo pipefail
export AWS_PROFILE=lab
SRC=eu-west-1; DST=eu-central-1; ID=i-0abc1234def567890
AMI1=$(aws ec2 create-image --region "$SRC" --instance-id "$ID" --no-reboot --name "web-dr-test" \
  --tag-specifications 'ResourceType=image,Tags=[{Key=lab,Value=dr}]' --query ImageId --output text)
aws ec2 wait image-available --region "$SRC" --image-ids "$AMI1"
AMI2=$(aws ec2 copy-image --region "$DST" --source-region "$SRC" --source-image-id "$AMI1" \
  --name "web-dr-test" --query ImageId --output text)
aws ec2 wait image-available --region "$DST" --image-ids "$AMI2"

VPC=$(aws ec2 describe-vpcs --region "$DST" --filters Name=is-default,Values=true --query 'Vpcs[0].VpcId' --output text)
SG=$(aws ec2 create-security-group --region "$DST" --group-name dr-test-sg --description "dr test" --vpc-id "$VPC" --query GroupId --output text)
aws ec2 authorize-security-group-ingress --region "$DST" --group-id "$SG" --protocol tcp --port 80 --cidr "$(curl -s https://checkip.amazonaws.com)/32"
NEW=$(aws ec2 run-instances --region "$DST" --image-id "$AMI2" --instance-type t3.micro --security-group-ids "$SG" \
  --query 'Instances[0].InstanceId' --output text)
aws ec2 wait instance-running --region "$DST" --instance-ids "$NEW"
IP=$(aws ec2 describe-instances --region "$DST" --instance-ids "$NEW" --query 'Reservations[0].Instances[0].PublicIpAddress' --output text)
sleep 30; curl -s "http://$IP" | head -n 3

# ---- CLEANUP in both regions ----
aws ec2 terminate-instances --region "$DST" --instance-ids "$NEW" > /dev/null
aws ec2 wait instance-terminated --region "$DST" --instance-ids "$NEW"
aws ec2 delete-security-group --region "$DST" --group-id "$SG"
for pair in "$SRC:$AMI1" "$DST:$AMI2"; do
  r=$(echo "$pair" | cut -d: -f1); ami=$(echo "$pair" | cut -d: -f2)
  snaps=$(aws ec2 describe-images --region "$r" --image-ids "$ami" --query 'Images[0].BlockDeviceMappings[].Ebs.SnapshotId' --output text)
  aws ec2 deregister-image --region "$r" --image-id "$ami"
  for s in $snaps; do aws ec2 delete-snapshot --region "$r" --snapshot-id "$s"; done
done`,
    cx: `<p>15-30 minutes (copy time grows with disk size). Under $0.10 if cleaned up the same day.</p>`,
    f: ['How would EC2 Image Builder automate weekly patched images in both regions?', 'What must you change if the image is encrypted with a KMS key?']
  }));

  // ───────────────────────── Practice: Hard ─────────────────────────
  practice.push(P({
    t: 'On-demand vs Savings Plan vs Spot: a year of compute', l: 'Hard', tags: ['pricing', 'savings plans', 'spot', 'cost optimisation'], co: ['AWS', 'Accenture', 'Thoughtworks'],
    s: `<p>A service runs <code>baseline</code> instances 24/7 all year (8,760 h) plus <code>burst</code> extra instances for <code>burstHours</code> hours a year, all at <code>hourly</code> on-demand price. Write <code>annualCosts(hourly, baseline, burst, burstHours, spDiscountPct, spotDiscountPct, interruptible)</code> returning three yearly costs (2 decimals):</p>
      <ol>
        <li>everything on-demand;</li>
        <li>baseline covered by a Savings Plan (<code>spDiscountPct</code> off), burst on-demand;</li>
        <li>baseline on the Savings Plan, burst on Spot (<code>spotDiscountPct</code> off) - or <code>-1</code> when the burst work is <b>not</b> interruptible.</li>
      </ol>
      <p>Then explain which option you recommend and what could go wrong with each.</p>`,
    c: `<p><code>0 ≤ hourly ≤ 50</code>, <code>0 ≤ baseline, burst ≤ 1000</code>, <code>0 ≤ burstHours ≤ 8760</code>, discounts 0-90 (examples, not quotes). Assume the Savings Plan commitment exactly matches the baseline, so none of it is wasted.</p>`,
    ex: `<p>$0.1008/h, 4 baseline, 8 burst for 500 h, SP 30%, Spot 70%, interruptible: on-demand 0.1008 x (35,040 + 4,000) = ${H.c('r', '$3,935.23')}; SP baseline = 0.1008 x 0.7 x 35,040 = $2,472.42 + burst $403.20 = ${H.c('b', '$2,875.62')}; + Spot burst 0.1008 x 0.3 x 4,000 = $120.96 → ${H.c('g', '$2,593.38')}, a 34% saving.</p>`,
    bw: `<p>Put the whole peak (12 instances) on a 3-year Savings Plan "for the biggest discount". 8 of them run only 500 of 8,760 hours, so most of that commitment is paid for and unused every hour - the plan can cost more than on-demand. Or put the baseline on Spot: a reclaim event takes the always-on service down.</p>`,
    q: ['Your commitment is $3/h but this hour you only use $2/h of eligible compute. What happens?', ['You still pay $3 for that hour; the unused $1 is lost', 'You pay $2', 'The unused $1 carries over to next hour', 'AWS refunds it at the end of the year'], 0, 'Savings Plans bill the commitment every hour. That is why you size them to the lowest steady usage you are sure of.'],
    h: ['<p>Hint 1: split usage into baseline hours <code>baseline x 8760</code> and burst hours <code>burst x burstHours</code>; price each separately.</p>', '<p>Hint 2: a discount of d% multiplies the price by <code>(1 - d / 100)</code>. Only the baseline gets the Savings Plan rate in options 2 and 3.</p>', '<p>Hint 3: return a list of three numbers; the third is <code>-1</code> when not interruptible. Round each to cents. Check zero baseline and zero burst cases.</p>'],
    a: `<p>Commitments belong under the floor of your usage, Spot belongs on work that can be interrupted, and on-demand fills the rest. So: baseline → Savings Plan, burst → Spot if the jobs checkpoint or retry (behind an Auto Scaling group with several instance types and AZs, falling back to on-demand), otherwise on-demand. Risks to state: a Savings Plan is a 1-3 year bill even if the service is retired or shrinks (prefer a Compute Savings Plan for flexibility and commit a bit below the baseline); Spot capacity can disappear exactly at peak; on-demand is the most expensive but carries no risk. Use real prices from the calculator and the Savings Plans recommendations in Cost Explorer.</p>`,
    code: R`#!/usr/bin/env bash
# annual_costs.sh HOURLY BASELINE BURST BURST_HOURS SP_PCT SPOT_PCT INTERRUPTIBLE(true|false)
set -euo pipefail
awk -v p="$1" -v b="$2" -v x="$3" -v xh="$4" -v sp="$5" -v spot="$6" -v intr="$7" 'BEGIN {
  base = p * b * 8760; burst = p * x * xh
  od   = base + burst
  spod = base * (1 - sp / 100) + burst
  printf "all on-demand        $%.2f\n", od
  printf "SP baseline + OD     $%.2f\n", spod
  if (intr == "true") printf "SP baseline + spot   $%.2f\n", base * (1 - sp / 100) + burst * (1 - spot / 100)
  else                print  "SP baseline + spot   n/a (burst work cannot be interrupted)"
}'
# Real recommendations from your own usage (Cost Explorer, small per-request fee):
aws ce get-savings-plans-purchase-recommendation --savings-plans-type COMPUTE_SP \
  --term-in-years ONE_YEAR --payment-option NO_UPFRONT --lookback-period-in-days THIRTY_DAYS --profile lab`,
    py: `def annual_costs(hourly, baseline, burst, burst_hours, sp_discount_pct, spot_discount_pct, interruptible):
    """Yearly cost: [all on-demand, SP baseline + on-demand burst, SP baseline + spot burst or -1]."""
    base = hourly * baseline * 8760           # always-on instances, full year
    peak = hourly * burst * burst_hours       # extra instances, only during bursts
    sp = 1 - sp_discount_pct / 100
    on_demand = round(base + peak, 2)
    sp_od = round(base * sp + peak, 2)
    sp_spot = round(base * sp + peak * (1 - spot_discount_pct / 100), 2) if interruptible else -1
    return [on_demand, sp_od, sp_spot]`,
    cx: `<p>O(1). The hard part is forecasting: base the commitment on the minimum usage over the last months, not the average.</p>`,
    f: ['How would you handle a baseline that will drop by half next year?', 'Why might a Compute Savings Plan beat an EC2 Instance Savings Plan despite a smaller discount?'],
    tests: { sig: 'double int int int int int bool -> double[]', fn: 'annualCosts', cmp: 'float', cases: [
      [[0.1008, 4, 8, 500, 30, 70, true], [3935.23, 2875.62, 2593.38]], [[0.1008, 4, 8, 500, 30, 70, false], [3935.23, 2875.62, -1]],
      [[0.0416, 2, 0, 0, 30, 70, true], [728.83, 510.18, 510.18]], [[0.2, 0, 10, 1000, 40, 80, true], [2000, 2000, 400]],
      [[0.1, 10, 0, 0, 50, 70, false], [8760, 4380, -1]], [[0.0104, 1, 1, 8760, 28, 65, true], [182.21, 156.7, 97.48]]
    ] }
  }));

  practice.push(P({
    t: 'Explain and cut a NAT gateway surprise bill', l: 'Hard', tags: ['NAT gateway', 'data transfer', 'VPC endpoints', 'cost'], co: ['AWS Support', 'Razorpay', 'Atlassian'],
    s: `<p>A customer's bill shows NAT gateway charges of several hundred dollars. Write <code>natMonthlyCost(gateways, gbProcessed, s3SharePct)</code> that returns <code>[before, after]</code> monthly cost (2 decimals): <b>before</b> = <code>gateways x 730 h x $0.045 + gbProcessed x $0.045</code>; <b>after</b> adding a free S3 <b>gateway endpoint</b>, the <code>s3SharePct</code>% of traffic that goes to S3 no longer passes through the NAT. Then show how to prove where the traffic goes with Cost Explorer and how to add the endpoint (VPC detail is in Cloud &amp; DevOps 6). Discuss the trade-off of one NAT per AZ.</p>`,
    c: `<p>Example prices ($0.045 per NAT-hour and per GB processed, us-east-1); <code>0 ≤ gateways ≤ 10</code>, <code>0 ≤ gbProcessed ≤ 10<sup>6</sup></code>, <code>0 ≤ s3SharePct ≤ 100</code>. The gateway endpoint for S3 has no hourly or per-GB charge.</p>`,
    ex: `<p>1 NAT, 10,000 GB/month, 90% to S3: before 32.85 + 450 = ${H.c('r', '$482.85')}; after 32.85 + 1,000 x 0.045 = ${H.c('g', '$77.85')}. With 3 NATs (one per AZ) and 3,000 GB, none of it S3: ${H.c('b', '$233.55')} both before and after - the endpoint only helps for S3 (and DynamoDB) traffic.</p>`,
    bw: `<p>"Delete the NAT gateway to save money." Private instances then lose outbound internet: OS patches, package installs and API calls fail. Or move every server to a public subnet with a public IP - which removes the NAT cost by adding attack surface and per-IP charges.</p>`,
    q: ['Private instances download 8 TB a month from S3 in the same region via a NAT gateway. Cheapest fix that keeps them private?', ['Add an S3 gateway VPC endpoint to the private route tables', 'Add a second NAT gateway', 'Give each instance an Elastic IP', 'Use a bigger instance type'], 0, 'A gateway endpoint routes S3 traffic privately inside AWS with no hourly or per-GB fee, so it stops paying NAT processing on that traffic.'],
    h: ['<p>Hint 1: the NAT bill has two parts - hours (per gateway, always on) and GB processed (all traffic through it, both directions).</p>', '<p>Hint 2: after = same hours + only the non-S3 share of the GB: <code>gb x (1 - pct / 100) x 0.045</code>.</p>', '<p>Hint 3: prove it before changing anything: Cost Explorer grouped by <code>USAGE_TYPE</code> (look for <code>NatGateway-Bytes</code>), and VPC Flow Logs to see which destinations dominate.</p>'],
    a: `<p>Compute both lines and show the customer that processing, not the hourly fee, is the big part. Confirm with data: Cost Explorer by usage type, and VPC flow logs on the NAT's network interface aggregated by destination (S3 prefix lists make S3 traffic easy to spot). Add an S3 gateway endpoint and associate it with the private subnets' route tables; S3 traffic then bypasses the NAT, with no app change (bucket policies using <code>aws:SourceIp</code> may need <code>aws:SourceVpce</code> instead). For other AWS services, interface endpoints cost per hour and per GB but less than NAT processing at volume. On the per-AZ question: one NAT per AZ costs more hours but avoids cross-AZ charges and survives an AZ failure; a single NAT is cheaper and fine for dev. Cost of the change: $0.</p>`,
    code: R`#!/usr/bin/env bash
# nat_cost.sh GATEWAYS GB_PROCESSED S3_SHARE_PCT, then prove and fix
set -euo pipefail
awk -v g="$1" -v gb="$2" -v s="$3" 'BEGIN {
  hours = g * 730 * 0.045
  printf "before $%.2f  after $%.2f  (example prices)\n", hours + gb * 0.045, hours + gb * (1 - s / 100) * 0.045
}'
export AWS_PROFILE=lab
# Prove it: NAT usage types last month
aws ce get-cost-and-usage --time-period Start=2026-09-01,End=2026-10-01 --granularity MONTHLY \
  --metrics UnblendedCost UsageQuantity --group-by Type=DIMENSION,Key=USAGE_TYPE \
  --query "ResultsByTime[0].Groups[?contains(Keys[0], 'NatGateway')].[Keys[0],Metrics.UsageQuantity.Amount,Metrics.UnblendedCost.Amount]" \
  --output text
# Fix: S3 gateway endpoint on the private route tables (ids are examples)
aws ec2 create-vpc-endpoint --vpc-id vpc-0123456789abcdef0 --vpc-endpoint-type Gateway \
  --service-name com.amazonaws.eu-west-1.s3 \
  --route-table-ids rtb-0aaa1111bbbb22223 rtb-0ccc3333dddd44445
aws ec2 describe-vpc-endpoints --filters Name=vpc-id,Values=vpc-0123456789abcdef0 \
  --query 'VpcEndpoints[].[VpcEndpointId,ServiceName,State]' --output text`,
    py: `def nat_monthly_cost(gateways, gb_processed, s3_share_pct):
    """[before, after] monthly NAT cost; after = S3 share bypasses NAT via a gateway endpoint."""
    hours = gateways * 730 * 0.045                     # hourly fee, traffic or not
    before = hours + gb_processed * 0.045
    after = hours + gb_processed * (1 - s3_share_pct / 100) * 0.045
    return [round(before, 2), round(after, 2)]`,
    cx: `<p>O(1). Typical result: an 80-90% cut in NAT cost for S3-heavy workloads, at no cost and no downtime.</p>`,
    f: ['When would you add interface endpoints for other services (ECR, CloudWatch Logs)?', 'How does cross-AZ traffic to a single NAT add another charge?'],
    tests: { sig: 'int int int -> double[]', fn: 'natMonthlyCost', cmp: 'float', cases: [
      [[1, 10000, 90], [482.85, 77.85]], [[3, 3000, 0], [233.55, 233.55]], [[3, 0, 50], [98.55, 98.55]],
      [[2, 5000, 100], [290.7, 65.7]], [[0, 0, 0], [0, 0]], [[1, 1200, 25], [86.85, 73.35]]
    ] }
  }));

  practice.push(P({
    t: 'An AZ is impaired and the only server lives there: recover in another AZ', l: 'Hard', tags: ['availability zones', 'snapshots', 'disaster recovery', 'Elastic IP'], co: ['AWS Support', 'Amazon', 'Rackspace'],
    s: `<p>AWS Health reports an impaired <code>eu-west-1a</code>. A customer's single web+data server (<code>i-0abc1234def567890</code>) is there and unreachable; its data volume is tagged <code>role=data</code> and has nightly snapshots. Their users reach it through Elastic IP <code>203.0.113.50</code>. Bring the service back in <code>eu-west-1b</code> as fast as possible, state the data loss (RPO) honestly, avoid creating a mess when 1a recovers, and propose the permanent fix.</p>`,
    c: `<p>A lab rehearsal of this costs cents: one t3.micro, a small volume from a snapshot, for under an hour. Clean up the rehearsal afterwards (instance, new volume, and re-associate the Elastic IP back if you moved it).</p>`,
    ex: `<p>Latest snapshot: ${H.c('b', 'snap-0aaa... 03:00 UTC')}; now 11:30 → RPO ≈ ${H.c('r', '8.5 hours')} of data lost unless 1a recovers. New instance in 1b from the golden AMI, volume from the snapshot attached as <code>/data</code>, Elastic IP moved with <code>--allow-reassociation</code>: users are back in ${H.c('g', 'about 15 minutes')} (the RTO).</p>`,
    bw: `<p>Wait for the AZ to recover, or keep calling <code>start-instances</code> on the impaired instance. Control-plane calls in the impaired AZ may fail or hang, and the outage lasts as long as AWS's recovery. Or launch a blank instance in 1b and start re-installing by hand under pressure.</p>`,
    q: ['Why can you rebuild in eu-west-1b at all, when the EBS volume is stuck in 1a?', ['Snapshots and AMIs are regional, so new volumes can be created from them in any AZ', 'EBS volumes are replicated to all AZs', 'Elastic IPs carry the data', 'AWS copies the instance automatically'], 0, 'EBS volumes are zonal, but snapshots are stored regionally. That is exactly why regular snapshots are your cross-AZ recovery path for single-AZ data.'],
    h: ['<p>Hint 1: find the newest completed snapshot of the data volume by tag; its <code>StartTime</code> is your recovery point. Say the RPO out loud to the customer.</p>', '<p>Hint 2: launch from the golden AMI (or the latest AMI of the server) into a subnet in 1b, create a volume from the snapshot in 1b, attach, mount.</p>', '<p>Hint 3: move the Elastic IP with <code>associate-address --allow-reassociation</code>. When 1a recovers, make sure the old instance does not come back serving stale data or writing to the same database - stop it, then reconcile.</p>'],
    a: `<p><b>Decide:</b> agree with the customer that restoring from the 03:00 snapshot (RPO about 8.5 hours) is better than waiting; if the data is precious, keep the old volume untouched for later reconciliation. <b>Rebuild:</b> pick a subnet in 1b, launch a free-tier-sized (or same-size) instance from the golden AMI with the same security group and role, create a gp3 volume from the latest snapshot in 1b, attach it, mount it (UUID fstab entry already in the image, or user data). <b>Cut over:</b> health-check locally, then move the Elastic IP; DNS needs no change. <b>After 1a recovers:</b> stop the old instance (do not terminate yet), copy any newer data from its volume if needed, then retire it and its volume. <b>Permanent fix:</b> two instances in two AZs behind a load balancer, data in a Multi-AZ managed database or shared storage (EFS/S3), snapshots more often or continuous backup, and a rehearsed runbook. Cost of the rehearsal: cents; cost of the permanent fix: roughly doubling the compute line, which you should show with the Topic 7 maths.</p>`,
    code: R`#!/usr/bin/env bash
set -euo pipefail
export AWS_PROFILE=lab AWS_REGION=eu-west-1
OLD=i-0abc1234def567890; AZ=eu-west-1b; EIP_ALLOC=eipalloc-0123456789abcdef0
AMI=ami-0aaa1111bbbb22223                  # golden AMI of the server (regional)
SG=sg-0123456789abcdef0; ROLE=web-server-profile

# 1. Recovery point: newest completed snapshot of the data volume
read -r SNAP START < <(aws ec2 describe-snapshots --owner-ids self \
  --filters Name=tag:role,Values=data Name=status,Values=completed \
  --query 'sort_by(Snapshots,&StartTime)[-1].[SnapshotId,StartTime]' --output text)
echo "restoring $SNAP taken at $START - data after that time is not included (RPO)"

# 2. New instance in a healthy AZ
SUBNET=$(aws ec2 describe-subnets --filters Name=availability-zone,Values="$AZ" Name=default-for-az,Values=true \
  --query 'Subnets[0].SubnetId' --output text)
NEW=$(aws ec2 run-instances --image-id "$AMI" --instance-type t3.micro --subnet-id "$SUBNET" \
  --security-group-ids "$SG" --iam-instance-profile Name="$ROLE" --metadata-options HttpTokens=required \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=web-recovered}]' \
  --query 'Instances[0].InstanceId' --output text)
VOL=$(aws ec2 create-volume --snapshot-id "$SNAP" --availability-zone "$AZ" --volume-type gp3 \
  --tag-specifications 'ResourceType=volume,Tags=[{Key=role,Value=data},{Key=restored-from,Value=snapshot}]' \
  --query VolumeId --output text)
aws ec2 wait instance-running --instance-ids "$NEW"
aws ec2 wait volume-available --volume-ids "$VOL"
aws ec2 attach-volume --volume-id "$VOL" --instance-id "$NEW" --device /dev/sdf
aws ec2 wait volume-in-use --volume-ids "$VOL"
# (inside: sudo mount -a ; check the app; the AMI's fstab uses UUID + nofail)

# 3. Cut over: move the Elastic IP to the new instance
aws ec2 associate-address --allocation-id "$EIP_ALLOC" --instance-id "$NEW" --allow-reassociation

# 4. When eu-west-1a recovers: stop (not terminate) the old server so it cannot serve stale data
echo "later: aws ec2 stop-instances --instance-ids $OLD ; reconcile data; then retire it"`,
    cx: `<p>RTO about 10-20 minutes if the AMI and snapshots exist; RPO = age of the newest snapshot. The rehearsal costs cents; skipping rehearsals costs hours during the real event.</p>`,
    f: ['How would you shrink the RPO from hours to minutes?', 'What changes if the impaired AZ also hosts the only NAT gateway?']
  }));

  practice.push(P({
    t: 'Build a self-cleaning lab environment for a team of learners', l: 'Hard', tags: ['tags', 'budgets', 'automation', 'cleanup', 'safety'], co: ['AWS Training', 'Deloitte', 'Accenture'],
    s: `<p>You run cloud labs for 10 junior engineers in one shared AWS account. Design and script guard rails so a forgotten lab can never cost more than a few dollars: (1) a budget alert, (2) a rule that every lab resource carries <code>lab</code> and <code>owner</code> tags, (3) an automatic nightly stop of running lab instances, and (4) a <b>cleanup script with a dry-run mode</b> that deletes everything tagged with a given lab id - instances, volumes, snapshots, Elastic IPs, security groups and S3 buckets (including versioned ones). Explain the access model (no shared keys).</p>`,
    c: `<p>Everything here is free or nearly free (budgets, EventBridge Scheduler, tag APIs). The cleanup script is destructive: default to dry-run and require an explicit <code>--yes</code>. Account id placeholder <code>123456789012</code>.</p>`,
    ex: `<p><code>./lab-clean.sh devops05</code> prints ${H.c('y', 'WOULD terminate i-0abc..., WOULD delete vol-0def..., WOULD empty+delete s3://example-bucket-alice-devops05')}; <code>./lab-clean.sh devops05 --yes</code> does it and a second run prints ${H.c('g', 'nothing to delete')}.</p>`,
    bw: `<p>One IAM user with an access key shared in the team chat, "everyone clean up after themselves", and a monthly look at the bill. Keys leak, nobody owns leftovers, and the bill arrives weeks after the waste started.</p>`,
    q: ['Why should a destructive cleanup script default to dry-run?', ['So a wrong tag value or bug shows you what it would delete before anything is lost', 'Dry-run is faster', 'AWS requires it', 'It avoids API charges'], 0, 'Deletion of instances, volumes and buckets is irreversible. Printing the plan first and requiring an explicit confirmation is the standard safety pattern for destructive automation.'],
    h: ['<p>Hint 1: access: IAM Identity Center users per learner with a permission set; optionally a tag-based policy so they can only touch resources with their own <code>owner</code> tag (details in Cloud &amp; DevOps 6).</p>', '<p>Hint 2: <code>aws resourcegroupstaggingapi get-resources --tag-filters Key=lab,Values=ID</code> finds tagged resources across services; parse the ARN type to decide which delete call to run.</p>', '<p>Hint 3: order: terminate instances and wait → delete volumes → release EIPs → delete security groups → snapshots → buckets (delete all versions and delete markers first). Wrap every delete in a <code>run</code> function that only prints unless <code>--yes</code>.</p>'],
    a: `<p><b>Access:</b> each learner signs in through IAM Identity Center (MFA, short-lived credentials); no IAM users or keys. <b>Budget:</b> a monthly cost budget with alerts at 50/80/100% to the instructors (Topic 2 code). <b>Tags:</b> require <code>lab</code> and <code>owner</code> at creation - enforce with a tag policy / SCP in Organizations, or at least report untagged resources daily. <b>Nightly stop:</b> an EventBridge Scheduler schedule calling <code>ec2:StopInstances</code> directly (universal target) on instances tagged <code>lab</code>, or a small Lambda that finds them; stopping removes compute cost while volumes stay. <b>Cleanup:</b> a script driven by the tagging API with a dry-run default; it handles dependencies (instances before volumes and security groups) and versioned buckets. Run it at the end of each lab day and weekly for everything older than 7 days. Explain the residual cost: stopped volumes and snapshots until cleanup - cents per learner per day.</p>`,
    code: R`#!/usr/bin/env bash
# lab-clean.sh LAB_ID [--yes]  - delete everything tagged lab=LAB_ID (dry-run by default)
set -euo pipefail
LAB=$1; APPLY=""; [ $# -ge 2 ] && APPLY=$2
export AWS_PROFILE=lab AWS_REGION=eu-west-1
run() { if [ "$APPLY" = "--yes" ]; then echo "+ $*"; "$@"; else echo "WOULD: $*"; fi; }
arns() { aws resourcegroupstaggingapi get-resources --tag-filters Key=lab,Values="$LAB" \
           --resource-type-filters "$1" --query 'ResourceTagMappingList[].ResourceARN' --output text; }
id_of() { echo "$1" | awk -F/ '{print $NF}'; }

# 1. instances (wait so their volumes and security groups become free)
ids=""; for a in $(arns ec2:instance); do ids="$ids $(id_of "$a")"; done
if [ -n "$ids" ]; then
  run aws ec2 terminate-instances --instance-ids $ids
  [ "$APPLY" = "--yes" ] && aws ec2 wait instance-terminated --instance-ids $ids
fi
# 2. volumes, Elastic IPs, security groups, snapshots
for a in $(arns ec2:volume);         do run aws ec2 delete-volume --volume-id "$(id_of "$a")"; done
for a in $(arns ec2:elastic-ip);     do run aws ec2 release-address --allocation-id "$(id_of "$a")"; done
for a in $(arns ec2:security-group); do run aws ec2 delete-security-group --group-id "$(id_of "$a")"; done
for a in $(arns ec2:snapshot);       do run aws ec2 delete-snapshot --snapshot-id "$(id_of "$a")"; done
# 3. buckets: delete every version and delete marker, then the bucket
for a in $(arns s3); do
  b=$(echo "$a" | awk -F: '{print $NF}')
  for kind in Versions DeleteMarkers; do
    aws s3api list-object-versions --bucket "$b" --output json \
      --query "{Objects: $kind[].{Key: Key, VersionId: VersionId}}" > /tmp/del.json
    grep -q '"Key"' /tmp/del.json && run aws s3api delete-objects --bucket "$b" --delete file:///tmp/del.json
  done
  run aws s3 rb "s3://$b"
done
mode=dry-run; [ "$APPLY" = "--yes" ] && mode=applied
echo "done (mode: $mode)"

# Nightly stop at 20:00 UTC (EventBridge Scheduler universal target; role must allow ec2:StopInstances)
# aws scheduler create-schedule --name lab-nightly-stop --schedule-expression 'cron(0 20 * * ? *)' \
#   --flexible-time-window Mode=OFF \
#   --target '{"Arn":"arn:aws:scheduler:::aws-sdk:ec2:stopInstances","RoleArn":"arn:aws:iam::123456789012:role/lab-scheduler","Input":"{\"InstanceIds\":[\"i-0abc1234def567890\"]}"}'`,
    cx: `<p>Setup: an afternoon. Running cost: effectively $0. A dry-run on 50 resources takes seconds. Worst-case forgotten lab: one night of stopped volumes.</p>`,
    f: ['How would you make the nightly stop find instances by tag instead of a fixed id list?', 'What would you add so learners cannot launch large instance types at all?']
  }));

  // ───────────────────────── Quiz ─────────────────────────
  quiz.push({ q: 'Your instance runs in <code>eu-west-1b</code>. A data volume you need is in <code>eu-west-1a</code>. How do you use it?', options: ['Snapshot it and create a new volume from the snapshot in eu-west-1b', 'Attach it directly - volumes work across AZs', 'Copy the volume with <code>aws s3 cp</code>', 'Move the volume with <code>modify-volume --availability-zone</code>'], answer: 0, explain: 'EBS volumes are zonal. Snapshots are regional, so a new volume can be created from one in any AZ of the region. Delete the old volume and the snapshot when done.' });
  quiz.push({ q: 'Under the shared responsibility model, who patches the guest operating system on an EC2 instance?', options: ['The customer', 'AWS', 'Both, automatically', 'Nobody - EC2 images never need patches'], answer: 0, explain: 'EC2 is IaaS: AWS secures the hardware and hypervisor, the customer owns everything inside the VM. Managed services like RDS or Lambda move OS/engine patching to AWS.' });
  quiz.push({ q: 'A stopped EC2 instance with a 100 GiB gp3 volume and an Elastic IP is left for a month. What is billed?', options: ['The EBS volume and the Elastic IP', 'Nothing', 'Compute hours at a reduced rate', 'Only the Elastic IP'], answer: 0, explain: 'Stopping ends compute charges only. Provisioned EBS storage is billed per GB-month, and public IPv4 addresses (including Elastic IPs) are billed per hour.' });
  quiz.push({ q: 'Which Block Public Access setting makes S3 ignore a public bucket policy that is <b>already attached</b>?', options: ['<code>RestrictPublicBuckets</code>', '<code>BlockPublicAcls</code>', '<code>IgnorePublicAcls</code>', 'Versioning'], answer: 0, explain: 'BlockPublicPolicy rejects new public policies; RestrictPublicBuckets restricts access granted by existing public policies to AWS services and the owner account. The ACL settings cover ACLs, not policies.' });
  quiz.push({ q: 'Audit reports are read about once a quarter, kept a year, and must open instantly. Which S3 class fits best?', options: ['Glacier Instant Retrieval', 'Glacier Deep Archive', 'S3 Standard', 'One Zone-IA'], answer: 0, explain: 'Glacier IR gives millisecond access at a low storage price for data read about once a quarter (90-day minimum). Deep Archive needs hours to restore; One Zone-IA risks losing data in an AZ failure.' });
  quiz.push({ q: 'Two instances at an example $0.0832/hour run all month (730 h). What is the compute cost?', options: ['About $121.47', 'About $60.74', 'About $119.81', 'About $2.00'], answer: 0, explain: '0.0832 x 730 x 2 = 121.47. Using 720 hours (24 x 30) gives $119.81, which is why the 730-hour convention matters. Always label prices as examples.' });
  quiz.push({ q: 'How much warning does EC2 give before reclaiming a Spot instance?', options: ['2 minutes', '24 hours', 'None at all', '30 seconds'], answer: 0, explain: 'A 2-minute interruption notice appears in instance metadata and as an EventBridge event (a rebalance recommendation may come earlier). Design Spot workloads to checkpoint and retry.' });
  quiz.push({ q: 'A customer must keep health data in the EU. What decides the region first?', options: ['Data residency (legal requirement)', 'Lowest price', 'Newest region', 'Most AZs'], answer: 0, explain: 'Legal requirements are hard constraints, so they filter the candidate regions first; latency, service availability and price choose among the legal ones.' });
  quiz.push({ q: 'After <code>aws ec2 modify-volume --size 20</code>, <code>lsblk</code> shows 20G but <code>df -h /</code> still shows 8G. What next?', options: ['<code>growpart</code> the partition, then <code>xfs_growfs</code> or <code>resize2fs</code>', 'Reboot', 'Detach and re-attach the volume', 'Run <code>mkfs</code> on the disk'], answer: 0, explain: 'The volume, partition and filesystem are separate layers; both inner layers must be grown, online. mkfs would erase the data.' });
  quiz.push({ q: 'Six web servers in three AZs must read and write the same uploaded files. Which storage fits?', options: ['EFS (or Azure Files)', 'One EBS volume attached to all six', 'Instance store', 'A separate EBS volume on each server'], answer: 0, explain: 'EFS is a regional NFS file system mountable from many instances in many AZs. EBS is single-AZ and normally single-instance; instance store is ephemeral. (Object storage is also an option if the app can use the S3 API.)' });
  quiz.push({ q: 'What does <code>c7g.large</code> mean?', options: ['Compute optimised, 7th generation, Graviton (arm64), 2 vCPUs', 'Cheap, 7 GB, GPU, large disk', 'Compute optimised, 7 vCPUs, general purpose', 'Container type, version 7, with GPU'], answer: 0, explain: 'Family c = compute optimised, 7 = generation, g = AWS Graviton processor, large = 2 vCPUs (4 GiB for the c family).' });
  quiz.push({ q: 'What is the right way for an application on EC2 to get credentials for S3?', options: ['An IAM role attached through an instance profile', 'An access key in the app config file', 'An access key in user data', 'The root user\'s key'], answer: 0, explain: 'The role provides temporary, automatically rotated credentials through the instance metadata service. Keys in files or user data can be read and leaked, and never expire on their own.' });
  quiz.push({ q: 'A script with a hard-coded AMI id works in eu-west-1 but fails in us-east-1 with <code>InvalidAMIID.NotFound</code>. Best fix?', options: ['Resolve the AMI from the public SSM parameter in each region', 'Make the AMI public', 'Use a bigger instance type', 'Open port 22'], answer: 0, explain: 'AMIs are regional and each region has different ids for the same release. Public SSM parameters (e.g. /aws/service/ami-amazon-linux-latest/...) return the right, latest id per region.' });
  quiz.push({ q: 'When does EC2 user data run by default?', options: ['Once, as root, on the first boot of the instance', 'On every SSH login', 'Every reboot, as ec2-user', 'Only when you call run-command'], answer: 0, explain: 'cloud-init runs user data scripts once per instance at first boot, as root, and logs to /var/log/cloud-init-output.log.' });
  quiz.push({ q: 'In a versioned bucket you delete <code>report.pdf</code>. What happens?', options: ['A delete marker is added; the previous version can be restored', 'The object and all versions are deleted', 'Nothing - versioned objects cannot be deleted', 'The object moves to Glacier'], answer: 0, explain: 'A simple delete on a versioned bucket adds a delete marker as the current version. Removing the marker restores the object; deleting a specific version id removes that version permanently.' });

  // ───────────────────────── Interview ─────────────────────────
  interview.push({ level: 'B', q: 'What are regions and availability zones, and how would you design a simple web app to survive an AZ failure?', a: `<p>A region is a geographic area with its own complete set of AWS services (for example <code>eu-west-1</code>); data stays in the region unless you copy it. An availability zone is one or more data centres in that region with separate power, cooling and network, connected to the others by low-latency links. Some resources are zonal (EC2 instances, EBS volumes, subnets), some regional (S3, snapshots, AMIs, load balancers). To survive losing an AZ I run at least two instances in two or three AZs behind a load balancer that health-checks them, size each AZ so the remaining ones can carry the peak (with 3 AZs, each AZ carries half the peak), keep data in a regional or multi-AZ service (S3, a Multi-AZ database, EFS), and use an Auto Scaling group to replace lost capacity. I would also test it by stopping one AZ's instances.</p>`, followUps: ['What is the difference between an AZ name and an AZ ID?', 'When would you go multi-region instead of multi-AZ?'] });
  interview.push({ level: 'B', q: 'Explain the shared responsibility model with concrete examples.', a: `<p>AWS is responsible for security <b>of</b> the cloud - the buildings, hardware, hypervisor, global network and the software of managed services. The customer is responsible for security <b>in</b> the cloud - what they configure. On EC2 that means the customer patches the guest OS, configures security groups, manages users and keys, and protects their data. On RDS, AWS also patches the OS and database engine, but the customer still decides who can connect, whether it is public, and backup retention. On S3, AWS guarantees durability, but bucket policies and Block Public Access are the customer's job, so a public bucket leak is a customer-side failure. The line moves with how managed the service is, but identity, network exposure and data are always the customer's.</p>`, followUps: ['Whose fault is a hypervisor vulnerability? A leaked access key?', 'How does Azure describe the same split?'] });
  interview.push({ level: 'B', q: 'Walk me through launching an EC2 instance safely, from the CLI.', a: `<p>First I make sure I am the right identity in the right account and region: <code>aws sts get-caller-identity</code> with an SSO profile, no static keys. I look up the AMI from the public SSM parameter rather than hard-coding an id, pick a free-tier-eligible or right-sized type, and put it in the intended VPC subnet. The security group allows only what is needed - for a web server port 80/443, and no SSH at all if I can use Session Manager (otherwise port 22 from my IP only). I attach an IAM role through an instance profile instead of putting keys on the box, require IMDSv2 (<code>HttpTokens=required</code>), configure software with user data, and tag the instance and volumes (owner, lab/app, env). After launch I check status checks and cloud-init logs. And I know the cleanup: terminate, then check for leftover volumes, Elastic IPs and security groups.</p>`, followUps: ['How do you troubleshoot user data that did not run?', 'What do the two EC2 status checks tell you?'] });
  interview.push({ level: 'B', q: 'When would you use S3, EBS or EFS?', a: `<p><b>EBS</b> is block storage: a virtual disk attached to one instance in one AZ, formatted with a filesystem - for the OS root disk, databases and anything needing low-latency random I/O. You pay for provisioned size. <b>EFS</b> is a managed NFS file system that many instances across AZs mount at once - for shared content, home directories or legacy apps that need a shared POSIX path; you pay per GB stored and latency is higher than EBS. <b>S3</b> is object storage over HTTPS - for backups, logs, media, static websites, data lakes and anything written once and read many times; cheapest per GB, practically unlimited, regional and highly durable, but not a mounted disk. Azure equivalents are Managed Disks, Azure Files and Blob Storage. A typical web app uses all three: EBS for the OS, S3 for uploads and backups, and maybe EFS for shared config.</p>`, followUps: ['What is instance store and when is it safe to use?', 'Why is EBS zonal?'] });
  interview.push({ level: 'B', q: 'What is the difference between stop, terminate and reboot for an EC2 instance?', a: `<p><b>Reboot</b> restarts the OS on the same host: the instance keeps its public IP, instance-store data and billing. <b>Stop</b> shuts it down and releases the host: compute billing stops but EBS volumes (and Elastic IPs) keep billing; the auto-assigned public IPv4 is released, so you get a new one on start; instance-store data is lost; on start it usually lands on new hardware, which is also the fix for a failed system status check. <b>Terminate</b> deletes the instance permanently: the root volume is deleted if <code>DeleteOnTermination</code> is true (the default for root), but extra volumes attached later default to false and survive, still billing. Termination protection prevents accidents on important instances. For a customer asking "why am I still billed", the answer is almost always volumes, IPs or snapshots.</p>`, followUps: ['How do you keep the same public IP across stops?', 'What is hibernation?'] });
  interview.push({ level: 'B', q: 'How do you protect yourself or a customer from surprise cloud bills?', a: `<p>Before launching anything: a <b>budget</b> with email alerts on actual and forecasted spend (AWS Budgets, or a CloudWatch billing alarm in us-east-1), root MFA and no root keys so a leaked key cannot run up a bill, and SSO instead of long-lived keys. While working: free-tier-eligible sizes, one region, tags on every resource, and knowing the always-on costs - NAT gateways, public IPv4 and Elastic IPs, EBS volumes and snapshots, load balancers. After working: a cleanup script, and a weekly look at Cost Explorer by service and region. For estimates I use price x hours x count plus GB-month storage plus traffic, label the prices as examples, and confirm in the Pricing Calculator. Note that billing data lags by hours, so alerts are a safety net, not real-time protection.</p>`, followUps: ['What changed about the AWS free tier in 2025?', 'Which costs keep running when everything is stopped?'] });
  interview.push({ level: 'I', q: 'Security reports that a customer\'s S3 bucket is public. What do you do?', a: `<p>Contain first, without deleting data: enable all four <b>Block Public Access</b> settings on the bucket - <code>RestrictPublicBuckets</code> takes effect against an existing public policy immediately - and confirm with <code>get-bucket-policy-status</code> and an anonymous request that now returns 403. Then preserve evidence: save the bucket policy, ACLs and ownership settings with timestamps before removing the public statement. Investigate exposure through S3 server access logs or CloudTrail data events for anonymous GETs; if logging was off, say so, because it affects whether customers must be notified - a decision for security and legal. Harden: Object Ownership bucket-owner-enforced, default encryption, versioning, access logging. Provide a safe sharing method (presigned URLs or CloudFront with origin access control). Prevent recurrence with account-level Block Public Access and alerts from IAM Access Analyzer or AWS Config.</p>`, followUps: ['How would you serve a public static website without a public bucket?', 'How do ACLs and bucket policies interact?'] });
  interview.push({ level: 'I', q: 'An EC2 root disk is 98% full. Walk me through the fix.', a: `<p>First I check whether the space is legitimate: <code>df -h</code>, then a <code>du</code> drill-down - often it is logs without rotation or a deleted file held open, and the fix is truncate plus logrotate, not more disk. If the data is real, I snapshot the root volume, then <code>aws ec2 modify-volume --size</code> to grow it online and wait for the modification to reach <i>optimizing</i>. Inside the OS, <code>lsblk</code> shows the bigger disk but the old partition; <code>sudo growpart /dev/nvme0n1 1</code> grows the partition; then <code>xfs_growfs -d /</code> for XFS (Amazon Linux, RHEL) or <code>resize2fs</code> on the partition for ext4 (Ubuntu). <code>df</code> confirms. No reboot needed. Caveats: volumes cannot shrink, a second modification must wait about six hours, and the bigger size costs more per month. Long term I would move growing data to a separate volume or S3 and add a disk alarm at 80%.</p>`, followUps: ['What if the instance no longer boots because the disk is full?', 'How do you find which NVMe device is which EBS volume?'] });
  interview.push({ level: 'I', q: 'How do you choose an instance type for a workload?', a: `<p>I start from measurements, not habit: CPU, memory, disk and network over a representative period (CloudWatch plus the CloudWatch agent for memory, or <code>top</code>, <code>free</code>, <code>iostat</code> on the box). The bottleneck picks the family: sustained CPU with spare memory → compute optimised (c); memory near full with idle CPU → memory optimised (r/x); balanced → general purpose (m); mostly idle with short spikes → burstable (t), watching CPU credits; heavy local I/O → storage optimised (i); ML → GPU or accelerators. Then the smallest size with headroom, the newest generation for price-performance, and Graviton (g) if the software supports arm64, which is often about 20% cheaper. I confirm the type exists in all AZs I use, test the application, and revisit with Compute Optimizer recommendations. Azure's B/D/F/E/L/N series and GCP's E2/N/C/M families map the same way.</p>`, followUps: ['What are CPU credits and unlimited mode?', 'Why do bigger sizes sometimes help disk-bound workloads?'] });
  interview.push({ level: 'I', q: 'Explain S3 storage classes and design a lifecycle policy for application logs.', a: `<p>S3 classes trade storage price against access cost and speed: Standard for frequent access; Standard-IA and One Zone-IA for infrequent access with millisecond reads but a 30-day minimum and per-GB retrieval fee (One Zone keeps one AZ, so only for recreatable data); Glacier Instant Retrieval for quarterly access with millisecond reads and a 90-day minimum; Glacier Flexible Retrieval (minutes to hours) and Deep Archive (12-48 hours, 180-day minimum) for archives; and Intelligent-Tiering when the pattern is unknown. For logs read heavily for a week, rarely after a month, and kept a year: Standard for 30 days, transition to Standard-IA, then Glacier IR at 90 days (or Flexible if the auditor can wait), expire at 365, plus expiration of noncurrent versions and aborting incomplete multipart uploads. At 10 GB/day that is about $25/month instead of $84 with example prices. Small files should be batched, because transitions are charged per object.</p>`, followUps: ['When is Intelligent-Tiering the better choice?', 'What do minimum storage durations mean for short-lived data?'] });
  interview.push({ level: 'I', q: 'Compare on-demand, Savings Plans or Reserved Instances, and Spot. How would you combine them?', a: `<p>On-demand has no commitment and the highest price - right for new, unpredictable or short workloads. Savings Plans (a dollar-per-hour commitment for one or three years, flexible across instance families and regions for Compute Savings Plans) and Reserved Instances (a specific type and region; still common for RDS) give roughly 30-70% off for steady usage, but unused commitment is lost every hour. Spot uses spare capacity at up to about 90% off, but can be reclaimed with a two-minute notice, so it suits stateless, retryable work: CI, batch, rendering, some web tiers behind an Auto Scaling group with several types and AZs. I combine them by layers: commit under the lowest steady usage seen over recent months, run peaks on-demand, and move interruptible work to Spot. Azure (reservations, savings plan, Spot VMs) and GCP (committed use discounts, Spot VMs, sustained-use discounts) offer the same choices.</p>`, followUps: ['How do you size a Savings Plan commitment?', 'What breaks if you run a single database on Spot?'] });
  interview.push({ level: 'I', q: 'A customer asks you to compare AWS and Azure for basic compute and storage. What maps to what?', a: `<p>The concepts map almost one to one. Regions and availability zones exist on both (Azure has zones in most but not all regions, and uses availability sets where it does not, plus region pairs for DR). EC2 instances are Azure Virtual Machines; AMIs are Azure images (Marketplace or Compute Gallery); instance types are VM sizes (t → B, m → D, c → F, r → E). Security groups are NSGs, user data is custom data (both cloud-init), instance profiles are managed identities. EBS is Managed Disks (Standard HDD/SSD, Premium SSD, Premium SSD v2, Ultra), instance store is the temporary disk, EFS is Azure Files, and S3 is Blob Storage inside a storage account, with access tiers Hot, Cool, Cold and Archive and lifecycle management. Pricing models match too: pay-as-you-go, reservations, savings plan, Spot. A practical Azure difference is resource groups: putting a whole lab or app in one group makes cleanup a single delete.</p>`, followUps: ['How does Azure Blob anonymous access compare to S3 Block Public Access?', 'What is Azure Hybrid Benefit?'] });
  interview.push({ level: 'A', q: 'Estimate the monthly cost of a small three-tier app in AWS. How do you structure it?', a: `<p>I list every line before touching numbers, then use the Pricing Calculator for the region and date and label everything as an estimate. Compute: web and app instances = hourly price x 730 x count (or real running hours), split by pricing model. Database: managed instance hours plus storage plus backup beyond the free allowance, doubled for Multi-AZ. Storage: EBS GB-months for each volume, snapshot GB-months based on retention and change rate, S3 GB-months by class. Network: load balancer hours plus capacity units, NAT gateway hours plus GB processed, data transfer out to the internet beyond the free 100 GB, cross-AZ traffic, public IPv4 addresses. Operations: CloudWatch logs ingestion and retention, support plan. Then I identify the top three lines, since they dominate, and suggest levers: right-sizing, Savings Plans for the baseline, gateway endpoints to cut NAT processing, lifecycle rules, and scheduling non-production off at night. Finally I set a budget at the estimate plus a margin.</p>`, followUps: ['Which lines are most often forgotten?', 'How would you validate the estimate after the first month?'] });
  interview.push({ level: 'A', q: 'Why should people and applications avoid long-lived access keys, and what do you use instead?', a: `<p>An access key works from anywhere until someone deletes it, and keys leak through Git history, CI logs, laptops, screenshots and AMIs; automated scanners find public keys within minutes, and attackers launch crypto miners in regions you never look at. Keys also make audit weak, because many people or systems share one identity. Instead: humans sign in through IAM Identity Center (SSO) with MFA and get short-lived role credentials, used by the CLI via <code>aws configure sso</code> profiles. Workloads on EC2 use IAM roles via instance profiles, reading temporary credentials from IMDSv2; containers and Lambda have their own role mechanisms; external CI systems use OIDC federation to assume a role. Where a key is truly unavoidable (some third-party tools), it gets least privilege, rotation, monitoring and secret storage, never code. Root never has keys. The details of policies and least privilege are the next module; the principle is that credentials should expire on their own.</p>`, followUps: ['How does the CLI decide which credentials to use?', 'What would you do in the first 15 minutes after a key leak?'] });
  interview.push({ level: 'E', q: 'How do AI assistants change cloud support work on compute and storage, and where must you not trust them?', a: `<p>They are very useful for the mechanical parts: turning a console click-path into AWS CLI or Terraform, drafting user data and lifecycle JSON, explaining an error such as <code>UnauthorizedOperation</code> or a confusing bill line, decoding instance types and structuring a cost estimate. Providers also ship assistants in their consoles that answer questions from your account's data. Where they fail: stale facts (prices, free-tier rules, instance types and regions change constantly), and unsafe defaults copied from old tutorials - SSH open to the world, public buckets as a fix for <code>AccessDenied</code>, access keys pasted into config, <code>mkfs</code> on the wrong device, no cleanup. So I use AI for drafts and explanations, verify facts against the live account and official pricing, review every destructive or security-relevant command, never paste real credentials, account ids or customer data, and keep ownership of decisions about residency, exposure and spend. The skill shifts from typing commands to judging them.</p>`, followUps: ['Give an example of an AI suggestion you would reject and why.', 'How would you safely let an agent run cloud commands for you?'] });

  // ───────────────────────── Module registration ─────────────────────────
  registerModule({
    id: 'devops05',
    title: 'Cloud Fundamentals I: Compute & Storage',
    lang: 'bash',
    langExplain: `<p>Code in this module is <b>Bash</b> running the <b>AWS CLI v2</b> (and the Azure CLI in comparison examples), because that is how cloud support and junior cloud engineers actually work: in a shell, with commands they can paste into a ticket. Problems that are pure cost or capacity maths also include a <b>Python</b> version with tests. Every lab uses named profiles (SSO), placeholder account id <code>123456789012</code> and bucket names like <code>example-bucket-yourname</code> - never real keys.</p>`,
    intro: `<p>This is where the cloud stops being abstract. You will learn the building blocks every cloud job uses daily: <b>regions and availability zones</b> (where things physically run, and what survives an outage), the <b>shared responsibility model</b> (what the provider secures and what you must), <b>virtual machines</b> on EC2 and Azure, <b>images and instance types</b>, <b>object storage</b> with S3 and Blob, <b>block and file storage</b> with EBS and EFS, and <b>pricing</b> - how to estimate a bill, when to use Savings Plans or Spot, and how the free tier works.</p>
      <p>AWS is the main provider, with Azure (and GCP where useful) equivalents in a comparison table in every topic. Each topic starts from a real ticket - an AZ outage, a public bucket leak, a disk that filled up, a surprise NAT or snapshot bill - and shows both the console steps and the AWS CLI. Labs are designed to be <b>safe and nearly free</b>: you set a budget alert first, use free-tier-eligible sizes, sign in with SSO profiles instead of access keys, and every lab ends with cleanup commands. Prices quoted are <b>examples that change</b>; the AWS Pricing Calculator is the source of truth.</p>`,
    goals: [
      'Choose a region for latency and data residency, explain zonal vs regional vs global resources, and size a fleet so it survives losing one availability zone',
      'Explain the shared responsibility model for EC2, RDS, S3 and Lambda, and secure a new account: root MFA, no root keys, SSO CLI profiles, IAM roles for instances and a budget alert',
      'Launch, connect to and fully clean up EC2 (and Azure) VMs from the CLI with user data, IMDSv2, least-open security groups and tags, and explain what each instance state costs',
      'Look up AMIs through SSM parameters, read instance type names (m7g.large), pick a family from measured CPU and memory, and bake and copy golden images',
      'Use S3 safely: mb, cp, sync, versioning, Block Public Access, presigned URLs, lifecycle rules in JSON, storage classes for logs, and the cleanup of versioned buckets',
      'Create, attach, format, mount, snapshot and grow EBS volumes online, and choose between block (EBS), file (EFS / Azure Files) and object storage',
      'Estimate monthly costs with price x hours x count and GB-month maths, compare on-demand, Savings Plans and Spot, and find surprise-bill causes such as forgotten snapshots and NAT data processing'
    ],
    prereqs: `Required: <b>Cloud &amp; DevOps 1</b> (Linux for the Cloud) - disk-space hunting, mounting disks and <code>/etc/fstab</code>, SSH keys and systemd are used throughout - and <b>Cloud &amp; DevOps 3</b> (Networking for Cloud Engineers) for CIDR, public vs private IPs, NAT and security groups. Helpful: Cloud &amp; DevOps 2 (Bash Scripting) for the lab scripts. This module touches IAM only as far as launching a VM safely needs; <b>Cloud &amp; DevOps 6</b> (Cloud Fundamentals II: Identity &amp; Networks) goes deep on IAM policies, VPC design, subnets, route tables, NAT gateways and endpoints. You need your own AWS account (and optionally an Azure free account) with a budget alert set before the first lab.`,
    hours: 12,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
