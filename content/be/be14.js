(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ---------- shared helpers ---------- */
  function cp(o) { return JSON.parse(JSON.stringify(o)); }
  function bx(id, label, x, y, w) {
    var n = { id: id, label: label === undefined ? id : label, x: x, y: y, shape: 'box' };
    if (w) n.w = w;
    return n;
  }
  // Flow story: each step lights some edges/nodes; earlier steps stay green.
  function flow(cfg) {
    var trail = {}, seen = {};
    return cfg.steps.map(function (s) {
      var ehl = cp(trail), hl = cp(seen);
      (s.on || []).forEach(function (k) { ehl[k] = s.cls || 'cur'; });
      (s.nodes || []).forEach(function (k) { hl[k] = s.cls || 'cur'; });
      (s.on || []).forEach(function (k) { trail[k] = 'ok'; });
      (s.nodes || []).forEach(function (k) { seen[k] = 'ok'; });
      var parts = [{ type: 'graph', directed: true, height: cfg.height || 60, nodes: cfg.nodes, edges: cfg.edges, hl: hl, ehl: ehl, tags: s.tags || {} }];
      (s.extra || []).forEach(function (p) { parts.push(p); });
      return { narr: s.narr, parts: parts };
    });
  }
  // Compact problem builder (same shape as the schema's problem object)
  function prob(o) {
    return {
      title: o.title, level: o.level, tags: o.tags, companies: o.companies,
      statement: o.statement, constraints: o.constraints, example: o.example,
      brute: { why: o.brute },
      mcq: o.mcq,
      hints: o.hints.map(function (h) { var t = h.replace(/<[^>]*>/g, ''); return t.length < 40 ? h.replace('</p>', ' Take a moment to reason about it before reading further.</p>') : h; }),
      solution: { approach: o.approach, code: o.code, alt: o.alt, complexity: (o.complexity.replace(/<[^>]*>/g, '').length < 20 ? o.complexity.replace('</p>', ' (design question, no algorithm).</p>') : o.complexity), followUps: o.followUps }
    };
  }

  /* ================= TOPIC 1: AWS core map + 3-tier ================= */
  topics.push({
    title: 'The AWS Core Map: Which Service Does What (and the 3-Tier Web App)',
    analogy: `<p>Think of AWS as a giant <b>city with ready-made buildings</b>. <b>EC2</b> is renting an empty apartment (you furnish it). <b>Lambda</b> is a hotel room you pay for by the night you actually sleep. <b>S3</b> is a huge warehouse for boxes (files). <b>RDS</b> is a librarian who keeps your tidy, related records. <b>DynamoDB</b> is a locker wall where every locker opens instantly if you know its number. <b>SQS</b> is a mailbox with a line of letters; <b>SNS</b> is a loudspeaker that shouts to many people at once.</p>`,
    explain: `<p>You do not need all 200+ AWS services. Interviews almost always use about ten. Learn what each one is <i>for</i>:</p>
${H.table(['Service', 'What it is', 'Use it for', 'Billed by'], [
  ['EC2', 'Virtual machine', 'Long-running app servers, custom software', 'Seconds the VM runs'],
  ['S3', 'Object storage (files)', 'Images, backups, logs, static sites', 'GB stored + requests + data out'],
  ['RDS / Aurora', 'Managed SQL database', 'Orders, users, anything relational', 'Instance hours + storage'],
  ['DynamoDB', 'Managed key-value / document DB', 'Huge scale, single-digit-ms lookups', 'Reads/writes (or provisioned capacity)'],
  ['SQS', 'Message queue', 'Buffer work between services', 'Per million requests'],
  ['SNS', 'Pub/sub topic', 'Fan-out one event to many subscribers', 'Per million publishes'],
  ['Lambda', 'Run a function on demand', 'Event handlers, glue code, spiky load', 'Requests + GB-seconds'],
  ['API Gateway', 'Managed front door for APIs', 'Auth, throttling, routing to Lambda/HTTP', 'Per million calls'],
  ['ALB', 'Load balancer (layer 7)', 'Spread HTTP traffic over EC2/containers', 'Hours + capacity units']
])}
<p>The classic starter design is the <b>3-tier web app</b>: a <b>web tier</b> (load balancer), an <b>app tier</b> (EC2 servers in an Auto Scaling Group) and a <b>data tier</b> (RDS). Each tier lives in its own subnet layer, and each only talks to the next one down.</p>
<p>Golden rule: <b>pick the most managed service that fits</b>. Managed means AWS patches, backs up and scales it for you. You trade a little control for a lot less 3 a.m. pain.</p>
<p>Every AWS API call is an HTTPS request signed with credentials. The region (for example <code>us-east-1</code>) decides <i>where</i> your stuff physically lives; each region has several isolated data centres called <b>Availability Zones (AZs)</b>.</p>`,
    clues: [
      '"Users upload images / videos" → <b>S3</b> (never store blobs in the database)',
      '"Millions of requests per second, simple lookups by key" → <b>DynamoDB</b>',
      '"Joins, transactions, reports" → <b>RDS / Aurora</b>',
      '"Spiky or unpredictable traffic, pay only when used" → <b>Lambda</b> + API Gateway',
      '"Decouple producer from consumer / absorb bursts" → <b>SQS</b>; "notify many systems" → <b>SNS</b>',
      '"Design a web app that survives one data centre failing" → ALB + ASG across 2+ AZs + Multi-AZ RDS'
    ],
    code: [
      { lang: 'java', check: false, title: 'Upload to S3 with SDK v2', code: `// Java (AWS SDK v2) - put one object into S3. Credentials come from the environment/role, NEVER from source code.
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.core.sync.RequestBody;

public class UploadDemo {
    public static void main(String[] args) {
        // Region and credentials are resolved by the default provider chain:
        // env vars -> shared config -> container/instance role.
        try (S3Client s3 = S3Client.create()) {
            String bucket = System.getenv("APP_BUCKET");   // e.g. my-app-uploads-dev
            PutObjectRequest req = PutObjectRequest.builder()
                .bucket(bucket)
                .key("avatars/user-42.png")
                .contentType("image/png")
                .build();
            s3.putObject(req, RequestBody.fromBytes(new byte[] {1, 2, 3}));
            System.out.println("uploaded");
        }
    }
}` },
      { lang: 'yaml', title: '3-tier layout sketch (CloudFormation-style, shortened)', check: false, code: `# Shortened sketch - not a complete template
Resources:
  Alb:        # web tier: public subnets in 2 AZs
    Type: AWS::ElasticLoadBalancingV2::LoadBalancer
    Properties: { Scheme: internet-facing, Subnets: [PublicA, PublicB] }
  AppAsg:     # app tier: private subnets, min 2 instances
    Type: AWS::AutoScaling::AutoScalingGroup
    Properties: { MinSize: 2, MaxSize: 6, VPCZoneIdentifier: [PrivAppA, PrivAppB] }
  Db:         # data tier: private DB subnets, Multi-AZ
    Type: AWS::RDS::DBInstance
    Properties: { Engine: postgres, MultiAZ: true, PubliclyAccessible: false }` }
    ],
    codeTitle: ['Upload to S3 with SDK v2 (no keys in code)', '3-tier skeleton in CloudFormation'],
    viz: [{
      title: 'Request path: Browser → ALB → EC2 → RDS',
      gen: function () {
        var nodes = [bx('U', 'Browser', 6, 25, 14), bx('ALB', 'ALB (public)', 30, 25, 18), bx('E1', 'EC2 app A', 58, 10, 16), bx('E2', 'EC2 app B', 58, 40, 16), bx('DB', 'RDS primary', 86, 10, 16), bx('SB', 'RDS standby', 86, 40, 16)];
        var edges = [['U', 'ALB', 'HTTPS'], ['ALB', 'E1'], ['ALB', 'E2'], ['E1', 'DB', 'SQL'], ['E2', 'DB'], ['DB', 'SB', 'sync copy']];
        return flow({ nodes: nodes, edges: edges, height: 50, steps: [
          { narr: 'A user opens the site. Their browser looks up the name and sends an <b>HTTPS</b> request to the internet-facing <b>Application Load Balancer</b>.', on: ['U-ALB'], nodes: ['U'] },
          { narr: 'The ALB checks which app servers are <b>healthy</b> and picks one. It lives in a <i>public</i> subnet; the servers behind it do not.', on: ['ALB-E1'], nodes: ['ALB'], tags: { E2: 'healthy' } },
          { narr: 'EC2 app A runs your business code. It needs data, so it opens a database connection. Only the app tier security group is allowed to reach the DB port.', on: ['E1-DB'], nodes: ['E1'], tags: { E1: 'handles it' } },
          { narr: 'RDS primary answers the SQL query. Because it is <b>Multi-AZ</b>, every write is also copied to the standby in another AZ.', on: ['DB-SB'], nodes: ['DB'], tags: { SB: 'in sync' } },
          { narr: 'The answer travels back the same way. If app A had died, the ALB would simply send the next request to <b>app B</b>. No user would notice.', on: ['ALB-E2'], cls: 'sel', nodes: ['E2', 'SB'] }
        ] });
      }
    }, {
      title: 'Pick the right service (decision queue)',
      input: 'images',
      inputLabel: 'Need (images, orders, sessions, jobs, events)',
      gen: function (input) {
        var map = {
          images: ['Binary files?', 'Yes: object storage', 'S3'],
          orders: ['Relational + transactions?', 'Yes: SQL', 'RDS / Aurora'],
          sessions: ['Key lookups, huge scale?', 'Yes: key-value', 'DynamoDB'],
          jobs: ['Work can wait & retry?', 'Yes: queue it', 'SQS'],
          events: ['Many listeners?', 'Yes: fan-out', 'SNS']
        };
        var k = String(input).trim().toLowerCase();
        if (!map[k]) throw new Error('Type one of: images, orders, sessions, jobs, events');
        var m = map[k];
        return [
          { narr: 'Requirement: <b>' + k + '</b>. Ask the deciding question.', parts: [{ type: 'queue', label: 'Decision steps', items: [m[0]], hl: { 0: 'cur' } }] },
          { narr: 'Answer the question honestly.', parts: [{ type: 'queue', label: 'Decision steps', items: [m[0], m[1]], hl: { 1: 'cur' } }] },
          { narr: 'Pick the managed service: <b>' + m[2] + '</b>.', parts: [{ type: 'queue', label: 'Decision steps', items: [m[0], m[1], m[2]], hl: { 2: 'win' } }, { type: 'text', html: 'Always ask next: <i>what does it cost at 10x traffic, and what is its failure mode?</i>' }] },
          { narr: 'Double-check with one more question: <b>what is the access pattern and the failure mode?</b> A good answer names the trade-off, not only the service.', parts: [{ type: 'queue', label: 'Decision steps', items: [m[0], m[1], m[2], 'cost + failure mode'], hl: { 2: 'win', 3: 'sel' } }] }
        ];
      }
    }],
    examples: [
      { title: 'Photo-sharing app: who does what?', html: `<p>Browser → <b>CloudFront</b> (cache) → <b>S3</b> for image bytes. Metadata (owner, caption) goes in <b>DynamoDB</b> or <b>RDS</b>. Thumbnails are created by a <b>Lambda</b> triggered by S3 events. Notifications go through <b>SNS</b>.</p>` },
      { title: 'Why not put the image in the database?', html: `<p>A 5 MB image in a row makes backups huge, slows queries, and costs database-grade money per GB. S3 costs roughly a tenth. The row stores only the <code>s3_key</code> string.</p>` },
      { title: 'EC2 vs Lambda for a nightly report', html: `<p>Runs 10 minutes once a day: Lambda (or a scheduled container task). Running a 24/7 EC2 for 10 minutes of work wastes 99% of the bill. For a service answering requests all day at steady load, EC2/containers are often cheaper.</p>`, code: { lang: 'json', title: 'EventBridge schedule rule (shape only)', code: `{ "ScheduleExpression": "cron(0 2 * * ? *)", "State": "ENABLED" }` } }
    ],
    deepDive: `<p><b>Regions, AZs, edge.</b> A region is a geographic area with 3+ AZs; an AZ is one or more data centres with independent power and network, a few milliseconds apart. Some services are <i>regional</i> (S3, DynamoDB, SQS: AWS spreads them over AZs for you), some are <i>zonal</i> (an EC2 instance, an EBS volume, a subnet lives in exactly one AZ). Knowing which is which decides your availability design.</p>
<p><b>Shared responsibility.</b> AWS secures the cloud (buildings, hypervisor); you secure what is <i>in</i> it (IAM, OS patches on EC2, data encryption choices, security groups). The more managed the service, the less you patch.</p>
<p><b>Service limits and quotas.</b> Every account has soft limits (for example Lambda concurrency, EC2 vCPUs). Hitting them in production is a classic outage. Ask for increases early and alert on usage.</p>
<p><b>Compute choices beyond EC2.</b> ECS/EKS/Fargate run containers; Fargate removes servers but not the container. Pick Lambda for event glue, containers for long-lived services, EC2 when you need special hardware or full OS control.</p>
<p><b>Data egress is the hidden tax:</b> traffic <i>into</i> AWS is free, traffic <i>out</i> to the internet and across regions costs money, even between AZs it is a small fee per GB. Chatty cross-AZ designs surprise people on the invoice.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants can now draft CloudFormation/Terraform and explain service choices in seconds, and managed AI services (Bedrock-style hosted models, vector search in managed databases) are just more building blocks on the same map: model calls are another API behind your VPC endpoint, with IAM controlling who may invoke them.</p>
<p><b>Use AI as a partner:</b> <code>Compare Lambda vs Fargate for a 200 req/s API with 400 ms p99 target; give a table and cost assumptions</code>. Ask it to list failure modes and then verify each against the official docs.</p>
<p><b>Where AI goes wrong:</b> it invents service features or old limits, suggests public S3 buckets or <code>0.0.0.0/0</code> database rules to "make it work", and hard-codes sample keys. <b>You still own:</b> choosing the architecture from requirements, checking security defaults, and reading the bill.</p>`,
    problems: [prob({
      title: 'Pick services for a ride-booking MVP', level: 'Easy', tags: ['aws', 'service-selection'], companies: ['Uber', 'Amazon'],
      statement: `<p>You are building an MVP: riders request trips, drivers send GPS every 5 seconds, receipts are emailed, and PDFs of receipts are stored for 7 years. Choose an AWS service for each of: trip records, live driver location, the email trigger, the PDF storage, and the public API.</p>`,
      constraints: `Small team, minimal operations, 50k riders, spiky evening traffic.`,
      example: `<p>Trip records → ${H.c('g', 'Aurora/RDS (relational, transactions)')}. Driver location → ${H.c('g', 'DynamoDB (high write rate, key = driverId)')}.</p>`,
      brute: `Putting everything into one big RDS instance: GPS writes (10k/s) compete with trip transactions and the DB becomes the bottleneck and a single point of failure.`,
      mcq: { q: 'Where should the 7-year PDF receipts live?', options: ['RDS blob column', 'S3 with a lifecycle rule to Glacier', 'EC2 local disk', 'SQS'], answer: 1, explain: 'S3 is cheap durable object storage and lifecycle rules move cold files to cheaper tiers automatically.' },
      hints: [`<p>Match each data shape to a store: relational, key-value, file.</p>`, `<p>Events (trip completed) are better as messages than as direct calls.</p>`, `<p>Recipe: API Gateway + Lambda (spiky) → RDS for trips, DynamoDB for location, SNS/SQS for "trip completed", Lambda sends email, S3 for PDFs.</p>`],
      approach: `<p>Public API: API Gateway in front of Lambda (or an ALB + containers if latency or long requests matter). Trips need transactions and joins (fare, rider, driver) so use Aurora PostgreSQL with Multi-AZ. Driver GPS is a high-rate write keyed by driverId, with only the latest value needed, so DynamoDB with a TTL fits and scales without capacity planning. When a trip completes, publish an event to SNS; an SQS queue subscribed to it buffers receipt jobs, and a Lambda renders the PDF, writes it to S3 (lifecycle rule: Standard-IA after 30 days, Glacier after a year), and sends the email through SES. This decouples slow work from the rider's request, absorbs evening spikes, and uses managed services so a tiny team has little to operate.</p>`,
      complexity: `<p>Operational complexity low; main costs: Aurora instance hours, DynamoDB writes, Lambda invocations.</p>`,
      followUps: ['How would you handle a driver app that goes offline?', 'What changes at 50 million riders?']
    })]
  });

  /* ================= TOPIC 2: VPC ================= */
  topics.push({
    title: 'VPC Networking: Subnets, Route Tables, NAT, Security Groups vs NACLs',
    analogy: `<p>A VPC is your own <b>gated office campus</b> inside AWS. <b>Subnets</b> are buildings; the <b>public</b> building has a door to the street (internet gateway), the <b>private</b> buildings have no street door. <b>Route tables</b> are the signposts saying "to reach the outside, go through that gate". A <b>NAT gateway</b> is the mailroom: staff in private buildings can send letters out and get replies, but strangers cannot walk in. A <b>security group</b> is the bouncer at each room's door (remembers who you let in); a <b>NACL</b> is the guard at the building entrance who checks every person both ways with a fixed list.</p>`,
    explain: `<p>A <b>VPC</b> (Virtual Private Cloud) is a private network you define with an IP range in CIDR form, for example <code>10.0.0.0/16</code> (65,536 addresses). You slice it into <b>subnets</b>, each living in exactly <b>one AZ</b>.</p>
${H.table(['Piece', 'Job', 'Key fact'], [
  ['Subnet', 'A slice of the VPC range in one AZ', 'AWS reserves 5 addresses in every subnet'],
  ['Internet Gateway (IGW)', 'Door between VPC and the internet', 'A subnet is "public" only if its route table sends 0.0.0.0/0 to the IGW'],
  ['Route table', 'Where each destination goes', 'Most specific prefix wins; "local" route always exists'],
  ['NAT gateway', 'Lets private instances start outbound connections', 'Sits in a PUBLIC subnet, costs per hour + per GB; one per AZ for HA'],
  ['Security group', 'Stateful firewall on the network interface', 'Allow rules only; reply traffic is automatic; can reference other SGs'],
  ['NACL', 'Stateless firewall on the subnet', 'Allow AND deny rules, numbered, you must open return (ephemeral) ports']
])}
<p><b>Typical layout</b> (2 AZs): public subnets hold the ALB and NAT gateways; private app subnets hold EC2/containers; private data subnets hold RDS with <i>no</i> route to the internet at all. Security groups chain: ALB-SG allows 443 from the world; App-SG allows 8080 only <i>from ALB-SG</i>; DB-SG allows 5432 only <i>from App-SG</i>.</p>
<p>Prefer <b>VPC endpoints</b> (gateway endpoints for S3 and DynamoDB are free) so private traffic to AWS services skips the NAT and the public internet, which is both safer and cheaper.</p>`,
    clues: [
      '"Database must not be reachable from the internet" → private subnet + SG referencing app SG',
      '"Private servers need to download patches" → NAT gateway in a public subnet',
      '"Block one abusive IP range" → NACL deny rule (security groups cannot deny)',
      '"Stateful vs stateless firewall" → security group vs NACL',
      '"Survive an AZ outage" → subnets in at least 2 AZs, one NAT per AZ',
      '"Huge NAT bill for S3 traffic" → add an S3 gateway endpoint'
    ],
    code: [
      { lang: 'js', run: true, title: 'CIDR subnet calculator (runnable)', code: `// Given a CIDR like 10.0.1.0/24, show the network, range and usable hosts.
function ipToInt(ip) {
  var p = ip.split('.').map(Number);
  if (p.length !== 4 || p.some(function (x) { return !(x >= 0 && x <= 255); })) throw new Error('bad ip ' + ip);
  return ((p[0] << 24) >>> 0) + (p[1] << 16) + (p[2] << 8) + p[3];
}
function intToIp(n) { return [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.'); }
function cidr(c) {
  var parts = c.split('/'), bits = Number(parts[1]);
  if (!(bits >= 0 && bits <= 32)) throw new Error('bad prefix');
  var size = Math.pow(2, 32 - bits);                       // total addresses
  var mask = bits === 0 ? 0 : (0xFFFFFFFF << (32 - bits)) >>> 0;
  var net = (ipToInt(parts[0]) & mask) >>> 0;              // network address
  var last = net + size - 1;                               // broadcast-style last address
  return { cidr: intToIp(net) + '/' + bits, first: intToIp(net), last: intToIp(last), total: size,
           awsUsable: Math.max(size - 5, 0) };             // AWS reserves 5 per subnet
}
function split(parent, newBits) {                          // cut a VPC into equal subnets
  var p = cidr(parent), bits = Number(parent.split('/')[1]), out = [];
  var step = Math.pow(2, 32 - newBits), n = Math.pow(2, newBits - bits);
  for (var i = 0; i < n && i < 8; i++) out.push(intToIp(ipToInt(p.first) + i * step) + '/' + newBits);
  return out;
}
function overlaps(a, b) {
  var x = cidr(a), y = cidr(b);
  return ipToInt(x.first) <= ipToInt(y.last) && ipToInt(y.first) <= ipToInt(x.last);
}
console.log(cidr('10.0.0.0/16'));
console.log(cidr('10.0.1.77/24'));
console.log('split /16 into /20:', split('10.0.0.0/16', 20).join(', '));
console.log('overlap 10.0.0.0/16 vs 10.0.5.0/24 ?', overlaps('10.0.0.0/16', '10.0.5.0/24'));
console.log('overlap 10.0.0.0/16 vs 10.1.0.0/16 ?', overlaps('10.0.0.0/16', '10.1.0.0/16'));` },
      { lang: 'yaml', check: false, title: 'Security group chain (CloudFormation-style sketch)', code: `AppSg:
  Type: AWS::EC2::SecurityGroup
  Properties:
    GroupDescription: app tier
    SecurityGroupIngress:
      - { IpProtocol: tcp, FromPort: 8080, ToPort: 8080, SourceSecurityGroupId: !Ref AlbSg }
DbSg:
  Type: AWS::EC2::SecurityGroup
  Properties:
    GroupDescription: data tier
    SecurityGroupIngress:
      - { IpProtocol: tcp, FromPort: 5432, ToPort: 5432, SourceSecurityGroupId: !Ref AppSg }` }
    ],
    codeTitle: ['CIDR calculator', 'Security groups referencing each other'],
    viz: [{
      title: 'VPC: public/private subnets across two AZs',
      gen: function () {
        var nodes = [
          bx('NET', 'Internet', 6, 30, 12), bx('IGW', 'IGW', 22, 30, 10),
          bx('PA', 'Public A ALB+NAT', 42, 8, 22), bx('PB', 'Public B ALB+NAT', 42, 52, 22),
          bx('AA', 'Private App A', 68, 8, 20), bx('AB', 'Private App B', 68, 52, 20),
          bx('DA', 'DB subnet A', 92, 8, 14), bx('DB', 'DB subnet B', 92, 52, 14)];
        var edges = [['NET', 'IGW'], ['IGW', 'PA'], ['IGW', 'PB'], ['PA', 'AA'], ['PB', 'AB'], ['AA', 'DA'], ['AB', 'DB'], ['AA', 'PA', 'via NAT'], ['DA', 'DB', 'replica']];
        return flow({ nodes: nodes, edges: edges, height: 62, steps: [
          { narr: 'The VPC spans <b>two AZs</b>. Top row = AZ-a, bottom row = AZ-b. Each AZ has three subnet layers: public, private app, private data.', nodes: [], tags: { PA: 'AZ-a', PB: 'AZ-b' } },
          { narr: 'Internet traffic enters through the <b>Internet Gateway</b>. Only public subnets have a route to it.', on: ['NET-IGW', 'IGW-PA'], nodes: ['NET', 'IGW', 'PA'] },
          { narr: 'The ALB in the public subnet forwards to the app tier in the <b>private</b> subnet. The app servers have no public IPs.', on: ['PA-AA'], nodes: ['AA'] },
          { narr: 'The app talks to the database subnet. The DB security group only trusts the app security group, and this subnet has <b>no</b> internet route.', on: ['AA-DA'], nodes: ['DA'] },
          { narr: 'App servers need an OS patch: outbound traffic goes <b>app → NAT gateway (public subnet) → IGW</b>. Replies return; nobody can start a connection inward.', on: ['AA-PA'], cls: 'sel' },
          { narr: 'AZ-a dies? The second row keeps serving. That is why every tier exists in both AZs, and why each AZ gets its own NAT gateway.', on: ['IGW-PB', 'PB-AB', 'AB-DB'], cls: 'win', nodes: ['PB', 'AB', 'DB'], tags: { PA: 'DOWN', AA: 'DOWN', DA: 'DOWN' } }
        ] });
      }
    }, {
      title: 'Security group vs NACL: the same packet',
      input: 'tcp 8080 from-alb',
      inputLabel: 'proto port source (try: tcp 22 world)',
      gen: function (input) {
        var p = String(input).trim().split(/\s+/);
        if (p.length < 3) throw new Error('Format: tcp 8080 from-alb  |  tcp 22 world');
        var port = Number(p[1]), src = p[2];
        var nacl = port === 22 && src === 'world' ? 'DENY (rule 90)' : 'ALLOW (rule 100)';
        var sg = (port === 8080 && src === 'from-alb') ? 'ALLOW' : 'implicit deny';
        return [
          { narr: 'A packet arrives: <b>' + p[0] + ' ' + port + '</b> from <b>' + src + '</b>. First stop: the subnet <b>NACL</b> (stateless, ordered rules).', parts: [{ type: 'table', label: 'Checks', columns: ['Layer', 'Result'], rows: [['NACL (subnet)', 'checking...'], ['Security group (ENI)', 'waiting']], hl: { 0: 'cur' } }] },
          { narr: 'NACL rules go lowest number first; first match wins. Result: <b>' + nacl + '</b>.', parts: [{ type: 'table', label: 'Checks', columns: ['Layer', 'Result'], rows: [['NACL (subnet)', nacl], ['Security group (ENI)', 'waiting']], hl: nacl.indexOf('DENY') === 0 ? { 0: 'bad' } : { 0: 'ok' } }] },
          { narr: nacl.indexOf('DENY') === 0 ? 'Packet dropped at the subnet edge. The security group never sees it.' : 'Now the instance <b>security group</b> (stateful, allow-only). Result: <b>' + sg + '</b>.', parts: [{ type: 'table', label: 'Checks', columns: ['Layer', 'Result'], rows: [['NACL (subnet)', nacl], ['Security group (ENI)', nacl.indexOf('DENY') === 0 ? 'not reached' : sg]], hl: (nacl.indexOf('DENY') === 0 || sg !== 'ALLOW') ? { 0: nacl.indexOf('DENY') === 0 ? 'bad' : 'ok', 1: 'bad' } : { 0: 'ok', 1: 'ok' } }] },
          { narr: 'Remember: the reply to an allowed security-group request is allowed automatically (<b>stateful</b>). A NACL needs an explicit outbound rule for the ephemeral ports 1024-65535 (<b>stateless</b>).', parts: [{ type: 'text', html: 'Security group = remembers conversations. NACL = checks every single packet, in both directions.' }] }
        ];
      }
    }],
    examples: [
      { title: 'Planning CIDR for a company', html: `<p>Choose a VPC range that will not overlap other VPCs or the office network (peering and VPN need non-overlapping ranges). <code>10.0.0.0/16</code> for prod, <code>10.1.0.0/16</code> for staging. Split a /16 into /20 subnets: 4,096 addresses each (4,091 usable in AWS).</p>` },
      { title: 'Why is my private instance unable to reach the internet?', html: `<p>Checklist: (1) route table of its subnet has <code>0.0.0.0/0 → nat-xxxx</code>; (2) the NAT gateway sits in a <i>public</i> subnet whose table routes to the IGW; (3) NAT has an Elastic IP; (4) security group egress and NACL allow it. Almost every outage is a missing route.</p>` },
      { title: 'Block one bad IP quickly', html: `<p>Security groups only allow, so use a <b>NACL deny</b> rule with a low number (for example 50) placed before the allow-all rule 100. For many IPs use AWS WAF in front of the ALB instead.</p>`, code: { lang: 'json', title: 'NACL entry (shape)', code: `{ "RuleNumber": 50, "Protocol": "-1", "RuleAction": "deny", "CidrBlock": "203.0.113.0/24", "Egress": false }` } }
    ],
    deepDive: `<p><b>Reserved addresses.</b> In each subnet AWS takes the first four and the last address (network, VPC router, DNS, future use, broadcast). A /28 (16 addresses) therefore gives 11 usable, which is the smallest allowed subnet.</p>
<p><b>Route selection.</b> The most specific (longest) prefix wins: a route for <code>10.0.5.0/24</code> beats <code>10.0.0.0/16</code>, which beats <code>0.0.0.0/0</code>. Peering, Transit Gateway and VPN add routes that you must write in <i>both</i> directions; peering is not transitive.</p>
<p><b>NAT gateway economics.</b> A NAT gateway is zonal and costs roughly a few cents per hour plus a per-GB processing charge. One NAT for the whole VPC is cheaper but a single AZ failure then cuts off outbound access for everyone, and cross-AZ traffic costs extra. Production: one per AZ; dev: one total.</p>
<p><b>IPv6.</b> Egress-only internet gateways give private IPv6 subnets outbound-only access with no NAT charge. <b>Flow Logs</b> record accepted/rejected traffic per interface, the first tool when a connection silently fails (an RST or timeout almost always means a security group/NACL/route problem).</p>
<p><b>PrivateLink and endpoints.</b> Interface endpoints put an ENI in your subnet for services like SQS or Secrets Manager. They cost per hour per AZ, so evaluate against NAT charges. Gateway endpoints (S3, DynamoDB) are free and add a route-table entry.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants can draft Terraform for a whole VPC in seconds, and they can read Flow Logs or Reachability Analyzer output and explain "why can't A reach B". Model inference endpoints are often reached through VPC interface endpoints so prompts and customer data never cross the public internet.</p>
<p><b>Use AI as a partner:</b> paste the route tables and security group rules (redacted) and ask <code>Trace a packet from the app subnet to the DB, step by step; where does it fail?</code>.</p>
<p><b>Where AI goes wrong:</b> it loves <code>0.0.0.0/0</code> on port 22 or 5432 "for testing", forgets the NAT must be in a public subnet, and picks overlapping CIDRs. <b>You still own:</b> the address plan, the least-open firewall rules, and verifying with Reachability Analyzer before shipping.</p>`,
    problems: [prob({
      title: 'Design a 3-tier web app in a VPC', level: 'Medium', tags: ['vpc', 'subnets', 'security-groups'], companies: ['Amazon', 'Stripe'],
      statement: `<p>Design the network for a web app that must stay up if one AZ fails. Give the CIDR plan, subnets, route tables, gateways and the security-group rules for ALB, app and database. The DB must never be internet-reachable; app servers must still download packages.</p>`,
      constraints: `Region with 3 AZs (use 2), up to 500 app instances, expected to peer later with a 10.20.0.0/16 corporate network.`,
      example: `<p>VPC ${H.c('b', '10.0.0.0/16')} · public ${H.c('g', '10.0.0.0/24, 10.0.1.0/24')} · app ${H.c('g', '10.0.16.0/20, 10.0.32.0/20')} · data ${H.c('g', '10.0.48.0/24, 10.0.49.0/24')}.</p>`,
      brute: `One public subnet with everything in it: a single AZ is a single point of failure and the DB gets a public IP exposed to scans. No separation means one SSH leak exposes data.`,
      mcq: { q: 'Which makes a subnet "public"?', options: ['Its name contains public', 'A route 0.0.0.0/0 to an internet gateway', 'It has a NACL', 'It holds an ALB'], answer: 1, explain: 'Only the route table decides. Without an IGW route the subnet is private.' },
      hints: [`<p>Three layers times two AZs = six subnets. Size the app subnets bigger.</p>`, `<p>Chain security groups by reference: world to ALB-SG, ALB-SG to App-SG, App-SG to DB-SG.</p>`, `<p>Recipe: VPC 10.0.0.0/16 (does not overlap 10.20/16); public RT 0.0.0.0/0 to IGW; private app RT 0.0.0.0/0 to the NAT in the same AZ; data RT has only local. S3 gateway endpoint.</p>`],
      approach: `<p>VPC 10.0.0.0/16, chosen so it will not overlap the corporate 10.20.0.0/16. In each of two AZs create three subnets: public /24 (ALB and one NAT gateway), private app /20 (4,091 usable, room for 500 instances plus growth and ENIs), private data /24 (RDS). Route tables: public subnets send 0.0.0.0/0 to the internet gateway; each private app subnet sends 0.0.0.0/0 to the NAT gateway in its own AZ (so an AZ failure does not break the other); data subnets have only the local route. Add a free S3 gateway endpoint so artifact downloads skip the NAT. Security groups: ALB-SG allows 443 from 0.0.0.0/0; App-SG allows the app port only from ALB-SG; DB-SG allows 5432 only from App-SG; no SSH, use SSM Session Manager. RDS Multi-AZ spans the two data subnets via a DB subnet group. Keep the default NACL (allow) and add deny rules only for specific abusive ranges. Enable VPC Flow Logs to a log group for diagnosis.</p>`,
      complexity: `<p>Cost drivers: 2 NAT gateways (hourly + per GB), ALB hours, cross-AZ data. Reduce with endpoints.</p>`,
      followUps: ['How do you connect this VPC to the corporate network?', 'What breaks if you use one NAT only?']
    })]
  });

  /* ================= TOPIC 3: IAM ================= */
  topics.push({
    title: 'IAM: Users, Roles, Policies and Least Privilege',
    analogy: `<p>IAM is the <b>badge system of a office building</b>. A <b>user</b> is an employee with a permanent badge. A <b>role</b> is a visitor badge that anyone trusted can borrow for a few hours (an EC2 server or a Lambda "wears" a role). A <b>policy</b> is the list printed on the badge: which doors open. <b>Least privilege</b> means giving the intern a badge for one room, not the master key. And one rule overrides everything: if any rule says <b>"never this door"</b>, the door stays shut, no matter how many other badges say yes.</p>`,
    explain: `<p>IAM answers one question for every AWS API call: <i>"Is this caller allowed to do this action on this resource?"</i></p>
${H.table(['Piece', 'Meaning', 'Tip'], [
  ['Principal', 'Who is calling (user, role session, service)', 'Prefer roles with short-lived credentials'],
  ['Action', 'The API, e.g. <code>s3:GetObject</code>', 'Wildcards like <code>s3:*</code> are a smell'],
  ['Resource', 'The ARN it targets', 'Scope to a bucket/prefix, not <code>*</code>'],
  ['Condition', 'Extra tests (IP, MFA, tag, time)', 'Great for tightening without more policies'],
  ['Effect', '<code>Allow</code> or <code>Deny</code>', 'Explicit Deny always wins']
])}
<p><b>The evaluation rule in three lines:</b></p>
<ol><li>Start with <span class="c-m">implicit deny</span> (everything is denied by default).</li>
<li>If any applicable policy has a matching <span class="c-r">explicit Deny</span> → <b>DENIED</b>, stop.</li>
<li>Else if some policy has a matching <span class="c-g">Allow</span> → <b>ALLOWED</b>. Otherwise → DENIED (implicit).</li></ol>
<p><b>Users vs roles.</b> Humans should sign in through SSO (IAM Identity Center) and assume roles. Machines never get long-lived access keys: EC2 uses an <b>instance profile</b>, Lambda an <b>execution role</b>, containers a <b>task role</b>. A role has two policy kinds: a <b>trust policy</b> (who may assume it) and <b>permission policies</b> (what it can do).</p>
<p><b>Least privilege recipe:</b> start with no access, add exactly the actions the code calls, pin each to the specific resource ARN, add conditions, then review "last accessed" data to remove unused permissions.</p>
<p>Never put keys in code, git, or chat. Use environment variables/roles, and rotate or delete anything that leaks.</p>`,
    clues: [
      '"Lambda needs to read one S3 bucket" → execution role with <code>s3:GetObject</code> on that bucket ARN only',
      '"Developer accidentally deleted prod data" → permission boundary / SCP / explicit Deny + MFA condition',
      '"Cross-account access" → role in target account + trust policy naming the other account',
      '"Allow everything except..." → Allow plus explicit Deny (Deny beats Allow)',
      '"No long-lived credentials on servers" → instance profile / IRSA / task role',
      '"Principle of least privilege" is nearly always the expected phrase'
    ],
    code: [
      { lang: 'js', run: true, title: 'IAM policy evaluator: explicit deny > allow > implicit deny', code: `// Tiny simulator of AWS policy evaluation (identity policies only).
// A statement: { effect, actions[], resources[] } with '*' wildcards.
function wild(pattern, value) {                        // glob match: * = any characters
  var re = new RegExp('^' + pattern.replace(/[.+^$(){}|\\[\\]\\\\]/g, '\\\\$&').replace(/\\*/g, '.*') + '$');
  return re.test(value);
}
function matches(st, action, resource) {
  return st.actions.some(function (a) { return wild(a, action); }) &&
         st.resources.some(function (r) { return wild(r, resource); });
}
function evaluate(policies, action, resource) {
  var trace = [], allowed = false;
  policies.forEach(function (p) {
    p.statements.forEach(function (st) {
      if (matches(st, action, resource)) {
        trace.push(p.name + ' -> ' + st.effect);
        if (st.effect === 'Deny') allowed = 'DENY';
        else if (allowed !== 'DENY') allowed = true;
      }
    });
  });
  if (allowed === 'DENY') return { decision: 'DENIED (explicit deny)', trace: trace };
  if (allowed === true) return { decision: 'ALLOWED', trace: trace };
  return { decision: 'DENIED (implicit deny)', trace: ['no statement matched'] };
}
var policies = [
  { name: 'AppRole', statements: [
    { effect: 'Allow', actions: ['s3:GetObject', 's3:PutObject'], resources: ['arn:aws:s3:::my-app-uploads/*'] },
    { effect: 'Allow', actions: ['sqs:*'], resources: ['arn:aws:sqs:us-east-1:123456789012:jobs'] } ] },
  { name: 'SafetyNet', statements: [
    { effect: 'Deny', actions: ['s3:DeleteObject'], resources: ['*'] } ] }
];
var tests = [
  ['s3:GetObject', 'arn:aws:s3:::my-app-uploads/a.png'],
  ['s3:GetObject', 'arn:aws:s3:::other-bucket/a.png'],
  ['s3:DeleteObject', 'arn:aws:s3:::my-app-uploads/a.png'],
  ['sqs:SendMessage', 'arn:aws:sqs:us-east-1:123456789012:jobs']
];
tests.forEach(function (t) {
  var r = evaluate(policies, t[0], t[1]);
  console.log(t[0] + ' on ' + t[1] + '\\n   ' + r.decision + '  [' + r.trace.join('; ') + ']');
});` },
      { lang: 'json', title: 'Least-privilege policy: upload to one prefix, read it back', code: `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "UploadsOnly",
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject"],
      "Resource": "arn:aws:s3:::my-app-uploads-dev/user-uploads/*"
    },
    {
      "Sid": "ListOnlyThatPrefix",
      "Effect": "Allow",
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::my-app-uploads-dev",
      "Condition": { "StringLike": { "s3:prefix": ["user-uploads/*"] } }
    },
    {
      "Sid": "NeverDelete",
      "Effect": "Deny",
      "Action": "s3:DeleteObject",
      "Resource": "arn:aws:s3:::my-app-uploads-dev/*"
    }
  ]
}` },
      { lang: 'json', title: 'Trust policy: only Lambda may assume this role', code: `{
  "Version": "2012-10-17",
  "Statement": [
    { "Effect": "Allow", "Principal": { "Service": "lambda.amazonaws.com" }, "Action": "sts:AssumeRole" }
  ]
}` }
    ],
    codeTitle: ['Policy evaluator', 'Permission policy (least privilege)', 'Trust policy'],
    viz: [{
      title: 'IAM evaluation: why was this request allowed or denied?',
      input: 'delete',
      inputLabel: 'Request (read, write, delete, other-bucket)',
      gen: function (input) {
        var k = String(input).trim().toLowerCase();
        var cases = {
          read: ['s3:GetObject uploads/a.png', [['Identity policy: UploadsOnly', 'Allow', 'ok']], 'ALLOWED'],
          write: ['s3:PutObject uploads/b.png', [['Identity policy: UploadsOnly', 'Allow', 'ok']], 'ALLOWED'],
          delete: ['s3:DeleteObject uploads/a.png', [['Identity policy: UploadsOnly', 'no match', 'done'], ['Identity policy: NeverDelete', 'Deny', 'bad']], 'DENIED (explicit deny)'],
          'other-bucket': ['s3:GetObject secrets/key.txt', [['Identity policy: UploadsOnly', 'wrong resource', 'done']], 'DENIED (implicit deny)']
        };
        if (!cases[k]) throw new Error('Type: read, write, delete or other-bucket');
        var c = cases[k], rows = [['Start', 'implicit deny']], hl = { 0: 'done' };
        var frames = [{ narr: 'Request: <b>' + c[0] + '</b>. IAM starts from <b>implicit deny</b>: nothing is allowed until a rule says so.', parts: [{ type: 'queue', label: 'Evaluation order', items: ['implicit deny'], hl: { 0: 'cur' } }, { type: 'table', label: 'Statements checked', columns: ['Policy', 'Result'], rows: [] }] }];
        c[1].forEach(function (s, i) {
          rows.push([s[0], s[1]]);
          hl[i + 1] = s[2];
          frames.push({ narr: 'Check <b>' + s[0] + '</b>: ' + s[1] + '. ' + (s[1] === 'Deny' ? '<span class="c-r">An explicit Deny ends the evaluation immediately.</span>' : (s[1] === 'Allow' ? 'This statement allows it.' : 'Does not apply to this request.')), parts: [{ type: 'queue', label: 'Evaluation order', items: ['implicit deny', 'explicit deny?', 'allow?', 'result'], hl: { 1: 'cur' } }, { type: 'table', label: 'Statements checked', columns: ['Policy', 'Result'], rows: rows.slice(1), hl: (function () { var h = {}; h[i] = s[2]; return h; })() }] });
        });
        var bad = c[2].indexOf('DENIED') === 0;
        frames.push({ narr: 'Final decision: <b>' + c[2] + '</b>. Order of power: explicit deny &gt; allow &gt; implicit deny.', parts: [{ type: 'queue', label: 'Evaluation order', items: ['implicit deny', 'explicit deny?', 'allow?', c[2]], hl: { 3: bad ? 'bad' : 'ok' } }, { type: 'table', label: 'Statements checked', columns: ['Policy', 'Result'], rows: rows.slice(1), hl: bad && k === 'delete' ? { 1: 'bad' } : (bad ? {} : { 0: 'ok' }) }] });
        return frames;
      }
    }],
    examples: [
      { title: 'Lambda reading one DynamoDB table', html: `<p>Give the execution role <code>dynamodb:GetItem</code> and <code>dynamodb:Query</code> on <code>arn:aws:dynamodb:us-east-1:123456789012:table/Orders</code> and its indexes (<code>.../Orders/index/*</code>). Not <code>dynamodb:*</code> on <code>*</code>.</p>` },
      { title: 'Require MFA for dangerous actions', html: `<p>Add a condition so deleting a database only works when the session used MFA: <code>"Condition": {"BoolIfExists": {"aws:MultiFactorAuthPresent": "false"}}</code> on a Deny statement.</p>` },
      { title: 'Cross-account read', html: `<p>Account B owns a bucket. Create a role in B with a trust policy naming account <code>123456789012</code> as principal. Services in account A call <code>sts:AssumeRole</code> and receive temporary credentials valid 1 hour.</p>` }
    ],
    deepDive: `<p><b>Policy types, in layers.</b> (1) Identity-based policies attached to users/roles; (2) resource-based policies (S3 bucket policy, SQS queue policy, KMS key policy) that name principals; (3) <b>permission boundaries</b> that cap what an identity policy can grant; (4) <b>Organizations SCPs</b> that cap an entire account; (5) session policies. A request is allowed only if it is allowed by <i>all</i> applicable ceilings and there is an Allow somewhere inside them, and no explicit Deny anywhere. Within one account, an Allow in either the identity or resource policy is enough; across accounts you need both sides.</p>
<p><b>Credentials.</b> Roles hand out STS temporary credentials (access key + secret + session token) that expire. A leaked temporary token dies on its own; a leaked long-lived user key lives until someone notices. Use IAM Access Analyzer to find resources shared outside the account and to generate policies from CloudTrail activity.</p>
<p><b>Common pitfalls.</b> <code>s3:ListBucket</code> applies to the bucket ARN, while <code>GetObject</code> applies to <code>bucket/*</code>, the classic "AccessDenied" confusion. <code>iam:PassRole</code> lets someone attach a powerful role to a service, so it is a privilege-escalation path; restrict it. Wildcard-in-resource plus <code>iam:*</code> equals admin.</p>
<p><b>Auditing.</b> CloudTrail logs every API call; "last accessed" shows unused permissions. Keep root locked away with MFA and use it only for the few tasks that need it.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants can generate a first-draft policy from a description or from CloudTrail logs, and tools like Access Analyzer can suggest least-privilege versions. AI agents that call AWS tools need their own narrowly scoped roles: an agent is a new principal that can be tricked by prompt injection, so its role must assume the worst.</p>
<p><b>Use AI as a partner:</b> <code>Here is my Lambda code (paste). List every AWS API it calls and write the smallest IAM policy, with resource ARNs as placeholders</code>. Then run the policy through the IAM policy simulator.</p>
<p><b>Where AI goes wrong:</b> it defaults to <code>"Action": "*", "Resource": "*"</code> to "fix" an AccessDenied, mixes up the bucket vs object ARN, and pastes real-looking keys. <b>You still own:</b> deciding the blast radius, adding Deny guardrails, and reviewing every policy diff before it reaches production.</p>`,
    problems: [prob({
      title: 'Write a least-privilege policy for an upload service', level: 'Medium', tags: ['iam', 'least-privilege', 's3'], companies: ['Amazon', 'Atlassian'],
      statement: `<p>A service writes user avatars to <code>avatars/</code> in bucket <code>my-app-uploads-dev</code>, reads them back, and lists only that prefix. It must never delete, and must never touch other prefixes. Write the identity policy JSON and the trust policy for an ECS task role. Explain why each statement exists.</p>`,
      constraints: `Placeholder account id 123456789012. No wildcards on actions except where truly necessary.`,
      example: `<p>${H.c('g', 'PutObject/GetObject on bucket/avatars/*')} · ${H.c('g', 'ListBucket on the bucket, prefix condition')} · ${H.c('r', 'Deny DeleteObject')}.</p>`,
      brute: `Attach AmazonS3FullAccess "because it works": a bug or injected request can then read every bucket in the account and delete data.`,
      mcq: { q: 'ListBucket needs which resource ARN?', options: ['arn:aws:s3:::bucket/*', 'arn:aws:s3:::bucket', 'Either', '*'], answer: 1, explain: 'ListBucket acts on the bucket itself, not on objects. Object actions use bucket/*.' },
      hints: [`<p>Split bucket-level actions from object-level actions.</p>`, `<p>Use a Condition with s3:prefix to restrict listing.</p>`, `<p>Trust policy principal is ecs-tasks.amazonaws.com with sts:AssumeRole. Add an explicit Deny for DeleteObject as a guardrail.</p>`],
      approach: `<p>Permission policy with three statements. (1) Allow s3:PutObject and s3:GetObject on arn:aws:s3:::my-app-uploads-dev/avatars/* only, because object actions are scoped to object ARNs. (2) Allow s3:ListBucket on the bucket ARN with a StringLike condition on s3:prefix equal to avatars/*, so listing other prefixes is impossible. (3) An explicit Deny of s3:DeleteObject on the bucket objects, so a future mistaken Allow cannot grant deletion (explicit deny wins). The trust policy allows the Principal Service ecs-tasks.amazonaws.com to perform sts:AssumeRole, meaning only ECS tasks can wear the role and no human or other service can. Credentials are short-lived and delivered by the task metadata endpoint, so nothing is stored in code or env files. Validate with the IAM policy simulator and Access Analyzer, and review CloudTrail after a week to confirm no actions are unused or denied unexpectedly.</p>`,
      complexity: `<p>Not computational. The attack surface shrinks from "whole account" to one prefix.</p>`,
      followUps: ['How would you let the service write to a different account bucket?', 'Where would a permission boundary help here?']
    })]
  });

  /* ================= TOPIC 4: DynamoDB ================= */
  topics.push({
    title: 'DynamoDB: Choosing Keys for Your Access Pattern',
    analogy: `<p>DynamoDB is a <b>wall of lockers in many hallways</b>. The <b>partition key</b> is the hallway number: a hashing machine sends you to exactly one hallway, instantly. The <b>sort key</b> is the order of lockers inside that hallway. If everyone in town is told to use hallway 7 (a popular celebrity, a today's-date key), a crowd jams that one hallway while the other hallways sit empty. That jam is a <b>hot partition</b>. Good key design spreads people across hallways and lets you grab what you need with one walk.</p>`,
    explain: `<p>DynamoDB is a managed key-value/document database. It is fast (single-digit milliseconds) at any scale, but only <i>if you ask for data the way you designed the keys</i>. You design from the <b>access patterns</b>, not from the entities (the opposite of SQL).</p>
${H.table(['Concept', 'Meaning'], [
  ['Partition key (PK)', 'Hashed to pick the physical partition. Equality lookups only'],
  ['Sort key (SK)', 'Orders items inside one PK; supports <code>begins_with</code>, <code>between</code>, &lt;, &gt;'],
  ['Query', 'Reads one PK (optionally a SK range). Fast and cheap'],
  ['Scan', 'Reads the whole table. Slow and costly. Avoid in production paths'],
  ['GSI', 'Global secondary index: a different PK/SK for another access pattern (eventually consistent)'],
  ['LSI', 'Same PK, different SK; must be created with the table'],
  ['Capacity', 'On-demand (pay per request) or provisioned (RCU/WCU, can auto-scale)']
])}
<p>One partition handles about <b>3,000 reads/s and 1,000 writes/s</b>; a table spreads over many partitions, so total throughput is huge <i>as long as traffic is spread</i>. Item size limit: 400 KB.</p>
<p><b>Design steps:</b> (1) list your questions ("get a user's orders newest first", "get order by id"); (2) pick a PK that is high-cardinality and used with equality in the query; (3) choose an SK that gives the sort/filter; (4) add a GSI only for a question the base table cannot answer; (5) check the busiest key for skew.</p>
<p>Example, an orders table: <code>PK = USER#42</code>, <code>SK = ORDER#2026-03-01#9001</code>. "All of user 42's orders in March" is one Query with <code>begins_with(SK, 'ORDER#2026-03')</code>.</p>`,
    clues: [
      '"Millions of requests per second, lookups by id" → DynamoDB',
      '"Get items for a user sorted by time" → PK = userId, SK = timestamp',
      '"Hot key / celebrity user / throttled on one partition" → write sharding (add a suffix) or better key',
      '"Need to query by another attribute too" → GSI',
      '"Single-table design" → generic PK/SK with entity prefixes',
      '"Joins or ad-hoc analytics" → wrong tool (use RDS / export to Athena)'
    ],
    code: [
      { lang: 'js', run: true, title: 'Partition-key hot-spot simulator (runnable)', code: `// Hash each request's partition key into one of N partitions and count the load.
// Compare a skewed key (date) with a spread key (userId) and with write-sharding.
function hash(s) {                                   // small deterministic string hash
  var h = 2166136261;
  for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}
function simulate(keys, partitions) {
  var load = new Array(partitions).fill(0);
  keys.forEach(function (k) { load[hash(k) % partitions]++; });
  var max = Math.max.apply(null, load), avg = keys.length / partitions;
  return { load: load, hotFactor: (max / avg).toFixed(2) };
}
var N = 4, requests = 4000;
var byDate = [], byUser = [], sharded = [];
for (var i = 0; i < requests; i++) {
  byDate.push('2026-03-01');                          // everyone writes "today"
  byUser.push('user-' + (i % 1000));                  // 1000 different users
  sharded.push('2026-03-01#' + (i % 10));             // today + random suffix 0..9
}
['byDate', 'byUser', 'sharded'].forEach(function (name) {
  var data = name === 'byDate' ? byDate : name === 'byUser' ? byUser : sharded;
  var r = simulate(data, N);
  console.log(name.padEnd(8), 'load per partition:', r.load.join(' / '), ' hot factor', r.hotFactor, '(1.00 is perfect)');
});
console.log('Ceiling per partition is ~1000 writes/s, so a hot factor of 4 on 4 partitions means 75% of capacity is wasted.');` },
      { lang: 'java', check: false, title: 'Query by PK and SK prefix', code: `// Java (SDK v2, shown with the low-level client): Query one user's March orders.
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.*;
import java.util.Map;

public class OrderQuery {
    public static void main(String[] args) {
        try (DynamoDbClient ddb = DynamoDbClient.create()) {
            QueryRequest q = QueryRequest.builder()
                .tableName(System.getenv("ORDERS_TABLE"))
                .keyConditionExpression("pk = :pk AND begins_with(sk, :prefix)")
                .expressionAttributeValues(Map.of(
                    ":pk", AttributeValue.fromS("USER#42"),
                    ":prefix", AttributeValue.fromS("ORDER#2026-03")))
                .scanIndexForward(false)   // newest first
                .limit(25)
                .build();
            QueryResponse r = ddb.query(q);
            System.out.println("items: " + r.count());
        }
    }
}` }
    ],
    codeTitle: ['Hot-spot simulator', 'Query by PK and SK prefix'],
    viz: [{
      title: 'DynamoDB items spread across partitions',
      input: 'userId',
      inputLabel: 'Partition key choice (userId, date, status, userId+shard)',
      gen: function (input) {
        var k = String(input).trim().toLowerCase();
        var N = 4, items = 16;
        function pick(i) {
          if (k === 'date') return 0;
          if (k === 'status') return i % 5 === 0 ? 1 : 0;           // 80% "pending"
          if (k === 'userid') return (i * 7 + 3) % N;
          if (k === 'userid+shard') return (i * 5 + 1) % N;
          throw new Error('Type: userId, date, status or userId+shard');
        }
        var load = [0, 0, 0, 0], rows = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], hl = {};
        var frames = [{ narr: 'Four partitions (columns). Each write picks a partition by <b>hashing the partition key</b>. Key choice: <b>' + k + '</b>.', parts: [{ type: 'grid', label: 'Items per partition (rows = slot)', colHead: ['P0', 'P1', 'P2', 'P3'], rowHead: ['', '', '', ''], rows: cp(rows) }, { type: 'bars', label: 'Write load', values: load.slice(), idxLabels: ['P0', 'P1', 'P2', 'P3'] }] }];
        for (var i = 0; i < items; i++) {
          var p = pick(i), slot = load[p] % 4;
          load[p]++;
          rows[slot][p] = i + 1;
          hl = {}; hl[slot + ',' + p] = 'cur';
          if (i % 4 === 3 || i === items - 1) {
            var mx = Math.max.apply(null, load);
            var skew = mx / (items / N);
            frames.push({ narr: 'After ' + (i + 1) + ' writes. Busiest partition holds <b>' + mx + '</b> of ' + (i + 1) + '. ' + (skew > 2.5 ? '<span class="c-r">HOT partition: it throttles while the others idle.</span>' : '<span class="c-g">Even spread: capacity is used well.</span>'), parts: [{ type: 'grid', label: 'Items per partition (rows = slot)', colHead: ['P0', 'P1', 'P2', 'P3'], rowHead: ['', '', '', ''], rows: cp(rows), hl: hl }, { type: 'bars', label: 'Write load', values: load.slice(), hl: (function () { var h = {}; load.forEach(function (v, j) { h[j] = v === mx && skew > 2.5 ? 'bad' : 'ok'; }); return h; })(), idxLabels: ['P0', 'P1', 'P2', 'P3'] }] });
          }
        }
        return frames;
      }
    }],
    examples: [
      { title: 'Chat app: messages in a room', html: `<p>Access pattern: "latest 50 messages in room X". <code>PK = ROOM#id</code>, <code>SK = ts#msgId</code>, Query with <code>ScanIndexForward=false, Limit=50</code>. A mega-popular room can still be hot: shard as <code>ROOM#id#0..9</code> and read all 10 shards in parallel.</p>` },
      { title: 'E-commerce, single table', html: `${H.table(['PK', 'SK', 'Item'], [['USER#42', 'PROFILE', 'name, email'], ['USER#42', 'ORDER#2026-03-01#9001', 'total, status'], ['ORDER#9001', 'ITEM#1', 'sku, qty']])}<p>One Query on <code>USER#42</code> returns the profile and all orders together.</p>` },
      { title: 'A bad key: status', html: `<p><code>PK = status</code> has only a handful of values (low cardinality) and "pending" gets most traffic. Use a high-cardinality PK and a GSI like <code>GSI1PK = STATUS#pending#shard-3</code> if you must list by status.</p>` }
    ],
    deepDive: `<p><b>Adaptive capacity and splitting.</b> DynamoDB automatically splits hot partitions and shifts unused capacity, which hides mild skew, but a single hot <i>key</i> (one item or one PK value) is capped by a single partition (about 1,000 writes/s, 3,000 reads/s). Spreading means more PK values, not a bigger table.</p>
<p><b>Consistency.</b> Reads are eventually consistent by default (half the cost); ask for strongly consistent when you need read-your-write on the base table. GSIs are always eventually consistent. Transactions (<code>TransactWriteItems</code>, up to 100 items) cost double.</p>
<p><b>Cost model.</b> On-demand charges per request unit: 1 write unit per 1 KB, 1 read unit per 4 KB (strong) or 8 KB (eventual). A 3.5 KB write costs 4 units. Scans read and bill everything they touch, even if a filter drops most items. Provisioned with auto scaling is cheaper for steady load; on-demand wins for unknown or spiky load.</p>
<p><b>Patterns.</b> Write sharding for hot keys; sparse GSIs (only items with the attribute appear); TTL to expire data free; DynamoDB Streams feed Lambda for change-data-capture; conditional writes (<code>attribute_not_exists</code>) give optimistic locking and idempotency; adjacency-list for many-to-many.</p>
<p><b>When not to use it:</b> unknown or evolving access patterns, heavy ad-hoc queries, multi-table joins, strict relational constraints. Redesigning keys later means migrating the table.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI can propose a single-table design and the matching Query code from a list of access patterns, and managed vector features let embeddings sit next to items. Agents also love DynamoDB as short-term memory: conversation id as PK, turn number as SK, TTL to expire sessions.</p>
<p><b>Use AI as a partner:</b> give it your top 5 access patterns with expected request rates and ask <code>Propose PK/SK/GSIs and flag any hot key risk; show the Query for each pattern</code>. Then run the traffic through a simulator like the one above.</p>
<p><b>Where AI goes wrong:</b> it designs entity-per-table like SQL, uses a Scan "for now", picks a timestamp or status as partition key, or forgets GSI eventual consistency. <b>You still own:</b> the access-pattern list, the skew analysis on real traffic, and the cost estimate.</p>`,
    problems: [prob({
      title: 'Pick DynamoDB keys for an access pattern', level: 'Medium', tags: ['dynamodb', 'data-modeling', 'hot-partition'], companies: ['Amazon', 'Netflix'],
      statement: `<p>A food-delivery app stores orders. Needs: (1) get an order by id; (2) list a customer's orders newest first; (3) list a restaurant's orders for today for the kitchen screen. Peak: 5,000 orders/s overall; one huge chain has 40% of all orders. Design the keys and indexes.</p>`,
      constraints: `Each pattern must be a Query, not a Scan. Avoid hot partitions.`,
      example: `<p>Base: ${H.c('b', 'PK=ORDER#id')}. GSI1: ${H.c('g', 'PK=CUST#id, SK=createdAt')}. GSI2: ${H.c('g', 'PK=REST#id#day#shard, SK=createdAt')}.</p>`,
      brute: `A single table keyed by restaurantId: the big chain's 2,000 writes/s hit one partition (limit ~1,000/s) and gets throttled while others sit idle.`,
      mcq: { q: 'How do you fix a single restaurant key getting 2,000 writes/s?', options: ['Buy bigger table', 'Add a random shard suffix 0..N to the GSI partition key', 'Use a Scan', 'Use a strongly consistent read'], answer: 1, explain: 'Spread one logical key across several physical keys and read all shards back in parallel.' },
      hints: [`<p>One key per question; do not start from the entity.</p>`, `<p>Pattern 1 is the base table. Patterns 2 and 3 become GSIs.</p>`, `<p>Shard the kitchen GSI: shard = hash(orderId) % 8; the kitchen reads 8 shards and merges by time.</p>`],
      approach: `<p>Base table: PK = ORDER#orderId gives pattern 1 as a GetItem. GSI1 with PK = CUST#customerId and SK = createdAt (ISO timestamp) answers pattern 2 as a Query with ScanIndexForward=false. Pattern 3 is the dangerous one: restaurant id alone is a low-cardinality, skewed key. Use GSI2 with PK = REST#restaurantId#yyyymmdd#shard where shard = hash(orderId) mod 8 and SK = createdAt. The big chain then spreads over 8 partition key values (about 250 writes/s each), within limits, and the kitchen screen issues 8 parallel Queries and merges them by time. Including the date in the key bounds partition growth and makes old days cold. Items need TTL for cleanup after the retention period. GSI writes are asynchronous, so the kitchen screen may lag by milliseconds; that is acceptable. If strong consistency is required for kitchen reads, query the base table by a different design or add a small cache of the most recent orders. Provision GSI capacity at least equal to the base table or use on-demand to avoid back-pressure throttling.</p>`,
      complexity: `<p>Queries are O(items returned). Cost scales with item size and number of GSIs (each is another write).</p>`,
      followUps: ['What if you also need orders by status?', 'How do you page results?']
    })]
  });

  /* ================= TOPIC 5: SQS/SNS/Lambda/API GW/S3 ================= */
  topics.push({
    title: 'Serverless and Messaging: SQS, SNS, Lambda, API Gateway, S3 Uploads, Cold Starts',
    analogy: `<p>A busy restaurant. Waiters drop order slips into a <b>ticket rail</b> (<b>SQS</b>); the kitchen takes slips when ready, so a rush never crashes the cooks. Calling out "table 5 is ready!" on a speaker so the waiter, the cashier and the screen all hear it is <b>SNS</b>. <b>Lambda</b> is a pool of cooks you hire <i>per dish</i>: when slips pile up the manager hires more cooks within seconds, when the rail is empty they all go home and you pay nothing. A brand-new cook needs a minute to find the knives: that delay is the <b>cold start</b>. <b>API Gateway</b> is the host at the door checking reservations and limiting the crowd.</p>`,
    explain: `<p><b>Decoupling = survive bursts.</b> Instead of service A calling service B directly (and failing when B is slow), A drops a message in a <b>queue</b>. B pulls at its own pace.</p>
${H.table(['', 'SQS', 'SNS'], [
  ['Model', 'Queue: each message goes to ONE consumer', 'Topic: each message goes to ALL subscribers'],
  ['Delivery', 'Consumer pulls; message hidden while processing (visibility timeout)', 'Pushes to SQS, Lambda, HTTP, email'],
  ['Failures', 'Retries, then Dead-Letter Queue (DLQ)', 'Retries per subscriber, DLQ optional'],
  ['Order', 'FIFO queues give order + dedupe (lower throughput)', 'FIFO topics exist too'],
  ['Pattern', 'Work queue, buffer', 'Fan-out: SNS topic → many SQS queues']
])}
<p><b>Lambda</b> runs your code per event, up to 15 minutes, with memory 128 MB-10 GB (CPU scales with memory). With an SQS trigger, Lambda polls the queue and <b>scales out</b> with queue depth (up to your concurrency limit), then scales to zero.</p>
<p><b>API Gateway</b> exposes HTTP endpoints, handles auth (JWT/Cognito/IAM), throttling, and routes to Lambda or other backends. <b>At-least-once delivery</b> is the SQS standard promise: the same message can arrive twice, so consumers must be <b>idempotent</b>.</p>
<p><b>Cold starts.</b> The first request after idle (or a scale-out) must create a sandbox, load the runtime and your code: roughly 100-300 ms for Node/Python, 0.5-3 s for heavy Java/.NET, plus VPC-attached networking is now fast. Fixes: smaller packages, lazy init, SnapStart (Java), provisioned concurrency (pay to keep warm), or don't use Lambda for strict-latency paths.</p>
<p><b>S3 presigned upload.</b> The browser uploads straight to S3 with a temporary signed URL, so big files never pass through your servers: (1) client asks API for an upload URL; (2) API (with a tightly scoped role) signs a PUT URL valid ~5 minutes for one key; (3) client PUTs the file to S3; (4) S3 event triggers processing.</p>`,
    clues: [
      '"Absorb traffic spikes / downstream is slow" → SQS buffer',
      '"One event, many consumers" → SNS fan-out to SQS queues',
      '"Process images / files after upload" → S3 event → SQS → Lambda',
      '"Messages processed twice" → at-least-once → idempotency key',
      '"Latency-critical, p99 &lt; 100 ms, Java" → cold start concern: provisioned concurrency / containers',
      '"Users upload large files (GBs)" → presigned URL / multipart direct to S3'
    ],
    code: [
      { lang: 'python', title: 'Lambda worker for the image pipeline (SQS trigger, partial batch failures)', code: `import json
import os

# Created OUTSIDE the handler so a warm container reuses it (saves cold-start time on later calls).
# import boto3; s3 = boto3.client("s3")          # real code; omitted so this file stays dependency-free
BUCKET = os.environ.get("APP_BUCKET", "my-app-uploads-dev")

def make_thumbnail(bucket, key):
    # Stand-in for the real work (download, resize, upload to a thumbs/ prefix).
    # Must be IDEMPOTENT: running twice for the same key yields the same result.
    return "thumbs/" + key.split("/")[-1]

def handler(event, context):
    failures = []
    for record in event["Records"]:                  # SQS delivers a batch (up to 10 here)
        try:
            body = json.loads(record["body"])         # message from the S3 event
            make_thumbnail(BUCKET, body["key"])
        except Exception:
            # Report only the failed message so the others are NOT retried
            failures.append({"itemIdentifier": record["messageId"]})
    return {"batchItemFailures": failures}` },
      { lang: 'java', check: false, title: 'Presigned PUT URL (SDK v2) - the API only signs, never touches the bytes', code: `import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.*;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import java.time.Duration;
import java.util.UUID;

public class PresignDemo {
    public static String uploadUrl(String userId) {
        // Server picks the key, so the client cannot overwrite arbitrary objects.
        String key = "user-uploads/" + userId + "/" + UUID.randomUUID() + ".png";
        try (S3Presigner presigner = S3Presigner.create()) {
            PutObjectRequest put = PutObjectRequest.builder()
                .bucket(System.getenv("APP_BUCKET"))
                .key(key)
                .contentType("image/png")          // signed: client must send this type
                .build();
            PutObjectPresignRequest req = PutObjectPresignRequest.builder()
                .signatureDuration(Duration.ofMinutes(5))   // short-lived
                .putObjectRequest(put)
                .build();
            return presigner.presignPutObject(req).url().toString();
        }
    }
}` },
      { lang: 'json', title: 'SQS redrive policy: after 5 failed receives, move to DLQ', code: `{ "deadLetterTargetArn": "arn:aws:sqs:us-east-1:123456789012:thumbs-dlq", "maxReceiveCount": 5 }` }
    ],
    codeTitle: ['Lambda worker', 'Presign upload', 'Dead-letter config'],
    viz: [{
      title: 'Image pipeline: S3 → SQS → Lambda',
      gen: function () {
        var nodes = [bx('B', 'Browser', 6, 25, 14), bx('API', 'API Gateway + Lambda', 30, 8, 24), bx('S3', 'S3 bucket', 30, 42, 16), bx('Q', 'SQS queue', 58, 42, 16), bx('L', 'Lambda workers', 82, 42, 18), bx('DLQ', 'DLQ', 82, 10, 12)];
        var edges = [['B', 'API', '1 ask URL'], ['API', 'B', '2 signed URL'], ['B', 'S3', '3 PUT file'], ['S3', 'Q', '4 event'], ['Q', 'L', '5 poll'], ['L', 'S3', '6 write thumb'], ['Q', 'DLQ', 'after 5 fails']];
        return flow({ nodes: nodes, edges: edges, height: 55, steps: [
          { narr: 'The browser asks the API for permission to upload. The API checks login and prepares a one-file signed link.', on: ['B-API'], nodes: ['B'] },
          { narr: 'The API returns a <b>presigned URL</b> (valid 5 minutes, one key, one content type). No AWS keys reach the browser.', on: ['API-B'], nodes: ['API'] },
          { narr: 'The browser uploads the big file <b>directly to S3</b>. Your servers never carry the bytes.', on: ['B-S3'], nodes: ['S3'] },
          { narr: 'S3 emits an "object created" event into the queue. The queue now <b>holds the work</b> even if workers are busy.', on: ['S3-Q'], nodes: ['Q'] },
          { narr: 'Lambda polls the queue and starts as many workers as the backlog needs (up to the concurrency limit).', on: ['Q-L'], nodes: ['L'] },
          { narr: 'A worker resizes the picture and writes the thumbnail back to S3. The message is deleted only on success.', on: ['L-S3'], cls: 'sel' },
          { narr: 'A poison file keeps failing? After 5 receives the message moves to the <b>DLQ</b> for a human to inspect instead of blocking the line.', on: ['Q-DLQ'], cls: 'bad', nodes: ['DLQ'] }
        ] });
      }
    }, {
      title: 'SQS backlog vs Lambda scaling',
      input: '300 20',
      inputLabel: 'Messages arriving per second, and one worker handles per second',
      gen: function (input) {
        var p = String(input).trim().split(/\s+/).map(Number);
        if (p.length < 2 || p.some(isNaN) || p[0] <= 0 || p[1] <= 0) throw new Error('Format: arrivalRate perWorkerRate  e.g. 300 20');
        var arr = p[0], per = p[1], max = 30, workers = 1, backlog = 0, frames = [], series = [], wk = [];
        for (var t = 0; t < 8; t++) {
          backlog = Math.max(0, backlog + arr - workers * per);
          series.push(backlog); wk.push(workers);
          frames.push({ narr: 'Second ' + (t + 1) + ': <b>' + workers + '</b> worker(s) drain ' + workers * per + '/s against ' + arr + '/s arriving. Backlog = <b>' + backlog + '</b>. ' + (backlog > 0 ? 'Lambda sees a backlog and adds workers.' : '<span class="c-g">Caught up.</span>'), parts: [
            { type: 'bars', label: 'Queue backlog over time', values: series.slice(), hl: { [t]: backlog > 0 ? 'cur' : 'ok' } },
            { type: 'bars', label: 'Concurrent Lambda workers', values: wk.slice(), hl: { [t]: 'win' } },
            { type: 'queue', label: 'Queue (sample)', items: new Array(Math.min(backlog, 8)).fill('msg'), frontLabel: 'oldest', backLabel: 'newest' }] });
          workers = Math.min(max, workers + Math.max(1, Math.ceil((backlog / per) / 3)));
        }
        return frames;
      }
    }],
    examples: [
      { title: 'Fan-out: new order event', html: `<p>Order service publishes <code>OrderPlaced</code> to one SNS topic. Three SQS queues subscribe: <b>billing</b>, <b>inventory</b>, <b>email</b>. Each team scales and fails independently; if email is down its queue just grows. Add a filter policy so inventory only gets physical goods.</p>` },
      { title: 'Idempotent consumer', html: `<p>Before charging, write <code>messageId</code> to DynamoDB with a condition <code>attribute_not_exists(pk)</code>. If the write fails, you already processed it: skip. Safe under duplicate delivery.</p>` },
      { title: 'Visibility timeout mistake', html: `<p>Lambda takes 90 s but the queue visibility timeout is 30 s: the message reappears and a second worker starts it. Rule of thumb: visibility timeout at least 6 times the function timeout.</p>`, code: { lang: 'json', title: 'Queue attributes (shape)', code: `{ "VisibilityTimeout": "180", "ReceiveMessageWaitTimeSeconds": "20", "MessageRetentionPeriod": "345600" }` } }
    ],
    deepDive: `<p><b>Standard vs FIFO.</b> Standard queues: near-unlimited throughput, at-least-once, best-effort order. FIFO: exactly-once processing within a dedup window and strict order per <i>message group id</i>, with lower throughput (high-throughput mode raises it). Pick one group id per entity (like orderId) so unrelated entities still parallelise.</p>
<p><b>Lambda concurrency.</b> Concurrency = requests per second times duration in seconds. 200 req/s at 500 ms needs about 100 concurrent executions. Account limit (default 1,000) is shared across functions: a runaway function can starve others, so set <b>reserved concurrency</b> on important and on dangerous functions. With an SQS source, set <code>maximum concurrency</code> to protect a downstream database from a thundering herd of workers.</p>
<p><b>Cold start anatomy:</b> download code, start execution environment, init runtime, run your global/init code, then invoke. Reduce by: smaller deployment, fewer dependencies, initialising SDK clients once outside the handler, ARM (Graviton) functions, Java SnapStart, and provisioned concurrency for the latency-critical path. Warm reuse is not guaranteed; never store state in the container.</p>
<p><b>API Gateway variants:</b> HTTP API (cheaper, simpler, lower latency) vs REST API (more features: usage plans, API keys, request validation, caching). The 29-second integration timeout means long jobs must be asynchronous: return 202 plus a job id and let a queue do the work.</p>
<p><b>Serverless trade-offs:</b> + no servers, scales to zero, pay per use, great for spiky/event work; - cold starts, 15-min limit, harder local debugging, per-request cost grows so steady heavy load is cheaper on containers/EC2, vendor lock-in, and concurrency limits. Presigned URLs: restrict content-type and size (use a presigned POST with a content-length-range condition) and scan uploads before trusting them.</p>`,
    aiEra: `<p><b>What AI changes:</b> inference jobs (embeddings, summarising uploaded documents, image classification) fit this pipeline perfectly: upload to S3, enqueue, a worker calls a model, results land in a table. The queue also acts as a <b>rate limiter and budget guard</b> in front of an expensive or rate-limited model API. Agent frameworks use queues for long-running tool calls.</p>
<p><b>Use AI as a partner:</b> ask <code>Review this Lambda handler for idempotency, timeouts and partial batch failure handling</code> or have it generate load-test event payloads.</p>
<p><b>Where AI goes wrong:</b> generated handlers often create the SDK client inside the handler (slow), swallow exceptions so failed messages vanish, forget the DLQ, or set visibility timeout lower than the function timeout. <b>You still own:</b> the failure semantics (retry, DLQ, idempotency), concurrency caps and the latency budget.</p>`,
    problems: [prob({
      title: 'Build an SQS + Lambda image pipeline', level: 'Medium', tags: ['sqs', 'lambda', 's3', 'serverless'], companies: ['Amazon', 'Shopify'],
      statement: `<p>Users upload profile photos up to 10 MB. You must generate 3 thumbnail sizes within a minute, survive 5,000 uploads in a 2-minute burst, never lose an upload, and never overload the database that stores metadata. Design the pipeline, retry behaviour, and the presigned-upload flow.</p>`,
      constraints: `Lambda timeout 60 s; metadata DB handles at most 100 concurrent connections.`,
      example: `<p>${H.c('b', 'Browser')} → presigned PUT → ${H.c('b', 'S3')} → event → ${H.c('g', 'SQS')} → ${H.c('g', 'Lambda (max concurrency 50)')} → thumbs in S3 + DynamoDB row.</p>`,
      brute: `The API receives the file, resizes inline, and writes to the DB: 10 MB bodies clog the web tier, one slow resize blocks a request thread, and a burst takes the service down or loses uploads on a crash.`,
      mcq: { q: 'Why set maximum concurrency on the SQS event source?', options: ['To make Lambda faster', 'To protect a downstream dependency from too many parallel workers', 'To enable FIFO', 'To avoid cold starts'], answer: 1, explain: 'The queue holds the burst; capping workers keeps the database within its connection limit.' },
      hints: [`<p>Uploads should bypass your servers entirely.</p>`, `<p>Queue between S3 and the worker so bursts wait instead of failing.</p>`, `<p>Visibility timeout above 6x function timeout, DLQ after a few receives, idempotent output keys, partial batch response.</p>`],
      approach: `<p>Upload flow: the browser calls the API with file name and size; the API authenticates, picks the object key itself, and returns a presigned PUT URL (5 minutes, fixed content type; use a presigned POST with a size limit to enforce 10 MB). The browser uploads straight to S3, so the web tier never handles the bytes. An S3 ObjectCreated notification sends a message to an SQS queue (use SNS then SQS if several consumers need it). A Lambda with an SQS event source and maximum concurrency 50 reads batches of 5 and creates the three sizes under a deterministic key like thumbs/{id}/{size}.jpg, so retries overwrite the same output (idempotent). It updates a DynamoDB row with a conditional write. The queue's visibility timeout is set to 6 minutes (6x the 60 s timeout), the redrive policy moves a message to a DLQ after 5 receives, and the function reports batchItemFailures so one bad image does not retry the whole batch. A CloudWatch alarm on queue age and DLQ depth pages someone. The 5,000-upload burst becomes a backlog drained at 50 workers times the per-image speed; users see thumbnails a little later, and nothing is lost because SQS stores messages for up to 14 days. A lifecycle rule deletes incomplete multipart uploads, and a malware scan step can sit before thumbnailing.</p>`,
      complexity: `<p>Throughput is workers / seconds-per-image; with 50 workers at 2 s per image, about 25 images/s, so 5,000 drain in about 200 s.</p>`,
      followUps: ['How do you notify the user when the thumbnail is ready?', 'What if the same upload event arrives twice?']
    })]
  });

  /* ================= TOPIC 6: Multi-AZ, multi-region, DR ================= */
  topics.push({
    title: 'High Availability and Disaster Recovery: Multi-AZ vs Multi-Region, RTO and RPO',
    analogy: `<p>A bakery with two ovens in the same building (<b>multi-AZ</b>): if one oven breaks, the other bakes and customers hardly notice. But if the building floods, both are gone. A second bakery in another city (<b>multi-region</b>) survives the flood, but costs a lot more and the recipes (data) must be copied there. <b>RPO</b> asks "how many hours of orders may we lose?" (how old is the backup). <b>RTO</b> asks "how long can the shop stay closed?" (how fast we reopen).</p>`,
    explain: `<p><b>Two different problems:</b> <i>high availability</i> (HA) keeps you running through small failures such as a server or an AZ; <i>disaster recovery</i> (DR) gets you back after a big failure such as a whole region, a bad deployment, or deleted data.</p>
<p><b>Multi-AZ</b> is the default HA tool: ALB and Auto Scaling over 2+ AZs, RDS Multi-AZ (synchronous standby, automatic failover in about 1-2 minutes, zero data loss), S3/DynamoDB/SQS already span AZs. It does <b>not</b> protect against region loss or logical corruption.</p>
<p><b>Multi-region</b> protects against a regional outage and brings users closer to data, but adds cost, complexity and data-consistency problems (cross-region replication is asynchronous, so lag = potential data loss).</p>
<p><b>Define the targets first</b> (ask the business):</p>
<ul><li><b>RPO</b> (Recovery Point Objective): the maximum data you can lose, measured in time. RPO 5 min means backups/replication at least every 5 minutes.</li>
<li><b>RTO</b> (Recovery Time Objective): the maximum downtime allowed. RTO 15 min means you must be serving again within 15 minutes.</li></ul>
${H.table(['Strategy', 'Idea', 'RTO', 'RPO', 'Cost'], [
  ['Backup &amp; restore', 'Copy backups to another region; rebuild when needed', 'Hours', 'Hours', '$ (cheapest)'],
  ['Pilot light', 'Core data replicated, app servers off; scale up on disaster', 'Tens of minutes', 'Minutes', '$$'],
  ['Warm standby', 'Scaled-down full copy always running; scale up on disaster', 'Minutes', 'Seconds to minutes', '$$$'],
  ['Active-active', 'Full stacks in 2+ regions serving traffic', 'Near zero', 'Near zero', '$$$$ (and hardest)']
])}
<p>Lower RTO/RPO costs more, so choose the cheapest strategy that meets the target, per system. Practice failover: an untested plan is a hope, not a plan.</p>`,
    clues: [
      '"Survive an AZ failure" → multi-AZ (cheap, automatic)',
      '"Survive a region failure" → multi-region DR strategy',
      '"RPO of 5 minutes" → continuous replication, not nightly backups',
      '"RTO of 1 hour, tight budget" → pilot light / warm standby',
      '"Zero downtime across regions, users worldwide" → active-active (Route 53, global tables, conflict handling)',
      '"Someone deleted data / bad migration" → point-in-time recovery and backups, since replication copies mistakes too'
    ],
    code: [
      { lang: 'js', run: true, title: 'DR strategy chooser from RTO / RPO / budget (runnable)', code: `// Choose the cheapest strategy that meets BOTH targets. Numbers are typical, not guarantees.
var strategies = [
  { name: 'Backup & restore', rtoMin: 480, rpoMin: 240, cost: 1 },
  { name: 'Pilot light',      rtoMin: 60,  rpoMin: 5,   cost: 2 },
  { name: 'Warm standby',     rtoMin: 10,  rpoMin: 1,   cost: 3 },
  { name: 'Active-active',    rtoMin: 1,   rpoMin: 0,   cost: 4 }
];
function choose(rtoTargetMin, rpoTargetMin) {
  var ok = strategies.filter(function (s) { return s.rtoMin <= rtoTargetMin && s.rpoMin <= rpoTargetMin; });
  ok.sort(function (a, b) { return a.cost - b.cost; });
  return ok.length ? ok[0].name : 'Active-active (or redesign: targets are extreme)';
}
var cases = [
  ['Internal wiki', 1440, 1440],
  ['Customer API', 60, 15],
  ['Checkout', 10, 1],
  ['Payments ledger', 1, 0]
];
cases.forEach(function (c) {
  console.log(c[0].padEnd(16), 'RTO ' + c[1] + 'm, RPO ' + c[2] + 'm ->', choose(c[1], c[2]));
});
// Availability math: nines to allowed downtime per year
[99, 99.9, 99.95, 99.99, 99.999].forEach(function (p) {
  var minutes = (1 - p / 100) * 365 * 24 * 60;
  console.log(p + '% available =>', minutes.toFixed(1), 'min downtime / year');
});` },
      { lang: 'yaml', check: false, title: 'Route 53 failover records (CloudFormation-style sketch)', code: `PrimaryRecord:
  Type: AWS::Route53::RecordSet
  Properties:
    Name: api.example.com
    Type: A
    SetIdentifier: primary
    Failover: PRIMARY
    HealthCheckId: !Ref PrimaryHealthCheck
    AliasTarget: { DNSName: primary-alb.us-east-1.elb.amazonaws.com, HostedZoneId: ZEXAMPLE1 }
SecondaryRecord:
  Type: AWS::Route53::RecordSet
  Properties:
    Name: api.example.com
    Type: A
    SetIdentifier: secondary
    Failover: SECONDARY
    AliasTarget: { DNSName: dr-alb.us-west-2.elb.amazonaws.com, HostedZoneId: ZEXAMPLE2 }` }
    ],
    codeTitle: ['DR strategy chooser and nines calculator', 'DNS failover between regions'],
    viz: [{
      title: 'DR strategies compared (RTO, RPO, cost)',
      input: 'all',
      inputLabel: 'Show (all, rto, rpo, cost)',
      gen: function (input) {
        var k = String(input).trim().toLowerCase();
        var names = ['Backup', 'Pilot light', 'Warm standby', 'Active-active'];
        var rto = [480, 60, 10, 1], rpo = [240, 5, 1, 0], cost = [1, 2, 3, 4];
        if (['all', 'rto', 'rpo', 'cost'].indexOf(k) < 0) throw new Error('Type: all, rto, rpo or cost');
        var f = [];
        function bars(label, v, t) { return { type: 'bars', label: label, values: v, texts: t, idxLabels: names, hl: { 0: 'bad', 1: 'cur', 2: 'win', 3: 'ok' } }; }
        if (k === 'all' || k === 'rto') f.push({ narr: '<b>RTO</b> (minutes to be back). Backup &amp; restore takes hours; active-active is nearly instant.', parts: [bars('RTO minutes', rto, ['8h', '1h', '10m', '~1m'])] });
        if (k === 'all' || k === 'rpo') f.push({ narr: '<b>RPO</b> (minutes of data you may lose). Backups lose hours, replication loses seconds.', parts: [bars('RPO minutes', rpo, ['4h', '5m', '1m', '~0'])] });
        if (k === 'all' || k === 'cost') f.push({ narr: '<b>Cost</b> rises as RTO and RPO fall: you pay for idle copies of your system.', parts: [bars('Relative cost', cost, ['1x', '2x', '3x', '4x+'])] });
        f.push({ narr: 'Summary: pick the <b>cheapest row</b> that still meets the business RTO and RPO.', parts: [{ type: 'table', label: 'Strategy table', columns: ['Strategy', 'RTO', 'RPO', 'Cost'], rows: [['Backup &amp; restore', 'hours', 'hours', '$'], ['Pilot light', '10s of min', 'minutes', '$$'], ['Warm standby', 'minutes', 'sec-min', '$$$'], ['Active-active', '~0', '~0', '$$$$']], hl: { 1: 'win', 2: 'win' } }] });
        return f;
      }
    }, {
      title: 'Region failover with Route 53',
      gen: function () {
        var nodes = [bx('U', 'Users', 6, 25, 12), bx('R53', 'Route 53', 28, 25, 16), bx('E', 'us-east-1 (primary)', 62, 8, 26), bx('W', 'us-west-2 (standby)', 62, 42, 26), bx('D', 'DB (async copy)', 92, 25, 16)];
        var edges = [['U', 'R53'], ['R53', 'E', 'healthy'], ['R53', 'W', 'on failure'], ['E', 'D', 'replicate'], ['D', 'W']];
        return flow({ nodes: nodes, edges: edges, height: 52, steps: [
          { narr: 'Normal day: Route 53 health checks the primary region and sends all users there. The standby region receives replicated data.', on: ['U-R53', 'R53-E', 'E-D'], nodes: ['U', 'R53', 'E'], tags: { W: 'idle/scaled-down' } },
          { narr: 'Disaster: the primary region stops answering health checks. Data newer than the last replication (<b>RPO</b>) is at risk.', cls: 'bad', nodes: ['E'], tags: { E: 'DOWN' } },
          { narr: 'Standby is promoted (database made writable, servers scaled up). How long this takes is your <b>RTO</b>. Automate it.', on: ['D-W'], cls: 'sel', nodes: ['W'], tags: { W: 'scaling up' } },
          { narr: 'DNS now returns the standby region. Users reconnect (DNS TTL matters: keep it low, e.g. 60 s). Service restored.', on: ['R53-W'], cls: 'ok', nodes: ['W'], tags: { W: 'serving' } }
        ] });
      }
    }],
    examples: [
      { title: 'Which RPO does RDS Multi-AZ give?', html: `<p>RPO ~0 for an instance or AZ failure (synchronous standby), RTO 1-2 minutes. For a region loss it gives nothing; add a cross-region read replica (asynchronous, RPO seconds-to-minutes) or snapshot copies.</p>` },
      { title: 'Choosing for three systems', html: `${H.table(['System', 'RTO / RPO', 'Choice'], [['Reporting dashboard', '1 day / 1 day', 'Backup &amp; restore'], ['B2B API', '30 min / 5 min', 'Pilot light'], ['Checkout', '5 min / ~0', 'Warm standby or active-active']])}` },
      { title: 'Replication copies mistakes', html: `<p>A bad <code>DELETE</code> replicates in milliseconds to your standby. Backups with point-in-time recovery, S3 versioning and object lock protect against human error; replication does not.</p>` }
    ],
    deepDive: `<p><b>Availability maths.</b> Series components multiply (99.9% x 99.9% = 99.8%); parallel redundant components improve it: two independent 99.9% copies give 1 - 0.001<sup>2</sup> = 99.9999%, <i>if</i> failures are truly independent and failover works. Real systems fail on shared dependencies (DNS, a config push, one database), so draw the dependency graph and find the single points of failure.</p>
<p><b>Data layer is the hard part.</b> Cross-region options: Aurora Global Database (typical lag under a second), DynamoDB Global Tables (multi-writer, last-writer-wins conflicts), S3 Cross-Region Replication (asynchronous), RDS cross-region read replica. Active-active writes require conflict resolution or partitioning users by home region.</p>
<p><b>Control plane vs data plane.</b> During a regional failure, relying on control-plane operations (creating instances, changing DNS records through the console/API) can fail. Design failover to depend only on the data plane: pre-provisioned capacity, Route 53 health checks with ARC routing controls.</p>
<p><b>Bad deploys are the common disaster.</b> Use blue/green or canary releases, feature flags and fast rollback; they often matter more than region failover. Run game days and chaos tests; measure real RTO. Also plan for dependencies: third-party APIs and your DR region's own quotas.</p>
<p><b>Costs of DR:</b> idle replicas, cross-region transfer, duplicate licences. Tier your systems: only the revenue-critical ones deserve warm standby or active-active.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI-assisted runbooks and incident copilots speed up diagnosis, and AI workloads add new DR questions: model endpoints are regional, quotas differ per region, vector indexes must be replicated, and a fallback to a smaller model in another region can be your "warm standby".</p>
<p><b>Use AI as a partner:</b> <code>Given RTO 15 min, RPO 1 min and this architecture, list single points of failure and a failover runbook with verification steps</code>. Use it to draft game-day scenarios.</p>
<p><b>Where AI goes wrong:</b> it confuses Multi-AZ with multi-region, promises "zero downtime" without a data-layer story, and skips the testing and cost parts. <b>You still own:</b> the RTO/RPO conversation with the business, the tested failover, and the budget trade-off.</p>`,
    problems: [prob({
      title: 'Choose backup, pilot light, warm standby or active-active', level: 'Hard', tags: ['disaster-recovery', 'rto-rpo', 'multi-region'], companies: ['Amazon', 'Goldman Sachs'],
      statement: `<p>A company runs three systems on AWS: (A) internal HR portal, RTO 24 h / RPO 12 h; (B) customer order API, RTO 30 min / RPO 5 min; (C) payment authorisation, RTO 2 min / RPO 0. Pick a DR strategy for each, name the data-layer mechanism, and explain the cost trade-off and how you would test it.</p>`,
      constraints: `Primary region us-east-1, DR region us-west-2. Finance wants to minimise DR spend.`,
      example: `<p>A → ${H.c('g', 'Backup &amp; restore')}. B → ${H.c('y', 'Pilot light')}. C → ${H.c('r', 'Active-active')}.</p>`,
      brute: `Put everything in active-active "to be safe": triples the bill for the HR portal that nobody needs within a day, and adds conflict-resolution complexity for no business value.`,
      mcq: { q: 'Which strategy fits RTO 30 min, RPO 5 min on a tight budget?', options: ['Backup & restore', 'Pilot light', 'Active-active', 'Nothing, multi-AZ is enough'], answer: 1, explain: 'Replicate data continuously (small RPO), keep compute off, and script scale-up to hit 30 minutes.' },
      hints: [`<p>Match each pair of numbers to the table of strategies, cheapest that meets both.</p>`, `<p>RPO 0 across regions means synchronous or multi-writer data, not async replication.</p>`, `<p>Name the data service for each: snapshots copied, cross-region read replica, global tables/Aurora global, and describe the failover trigger and test.</p>`],
      approach: `<p>System A (RTO 24 h, RPO 12 h): backup and restore. Take automated daily snapshots plus infrastructure as code, copy snapshots to us-west-2 and rebuild with the templates if us-east-1 is lost; cost is almost only snapshot storage. System B (30 min / 5 min): pilot light. Keep the database replicated with a cross-region read replica (lag in seconds meets RPO 5 min) and AMIs/container images and IaC ready in us-west-2 with compute at zero; on disaster promote the replica, apply the template to scale up, and switch Route 53 failover records; practise it quarterly to prove the 30 minutes. System C (2 min / 0): active-active. Run the stack in both regions behind Route 53 or Global Accelerator with health checks; use a database that supports multi-region writes (DynamoDB global tables with idempotent writes and a conflict policy, or partition customers to a home region and have the other region only take over reads and queued work); RPO 0 demands that an authorisation is acknowledged only once durably stored, so accept extra write latency or a regional-ownership model. It is the most expensive and complex, justified by the revenue loss per minute. Test all three with game days, measure actual RTO/RPO, watch replication lag alarms, and also protect against logical errors with point-in-time recovery since replication copies mistakes.</p>`,
      complexity: `<p>Relative spend roughly 1x, 2x and 4x+ of the single-region cost for A, B, C.</p>`,
      followUps: ['How would you detect a regional failure automatically without false alarms?', 'What breaks if DNS TTL is 1 hour?']
    })]
  });

  /* ================= TOPIC 7: Cost + Well-Architected ================= */
  topics.push({
    title: 'Cost Awareness and the Well-Architected Pillars',
    analogy: `<p>AWS billing is like a <b>taxi meter plus a hotel bill plus a phone plan</b> at once: you pay for time, for space and for data traveling out. Leave the meter running (an idle big server) and money burns silently. The <b>Well-Architected Framework</b> is the home inspector's checklist: six questions every good building must answer: is it safe, strong, cheap to run, efficient, sustainable, and easy to operate?</p>`,
    explain: `<p><b>The six pillars:</b></p>
${H.table(['Pillar', 'Key question', 'Typical moves'], [
  ['Operational Excellence', 'Can we run and improve it?', 'IaC, CI/CD, runbooks, observability, small safe deploys'],
  ['Security', 'Is data protected?', 'Least privilege IAM, encryption, private subnets, logging'],
  ['Reliability', 'Does it recover and scale?', 'Multi-AZ, retries with backoff, tested backups, limits'],
  ['Performance Efficiency', 'Right resources for the job?', 'Right-size, caching (CloudFront, ElastiCache), managed services'],
  ['Cost Optimization', 'Pay only for value?', 'Right-size, Savings Plans, spot, lifecycle, turn off idle'],
  ['Sustainability', 'Minimal environmental impact?', 'Efficient instances (Graviton), high utilisation, less data kept']
])}
<p><b>Cost basics.</b> You pay for four things: <b>compute</b> (hours or requests), <b>storage</b> (GB-month), <b>requests</b>, and <b>data transfer out</b>. Pricing options for steady compute: On-Demand (flexible), Savings Plans / Reserved (commit 1-3 years for ~30-70% off), Spot (up to ~90% off, can be interrupted: good for batch and stateless workers).</p>
<p><b>Estimating monthly cost</b> is multiplication: units x price x hours/month (about 730). Always include the sneaky ones: NAT gateways, cross-AZ and internet egress, load balancer hours, log storage, and idle dev environments. Tag everything (team, env) and set budgets with alerts.</p>
<p>Cost is a design input, not a cleanup task: ask "what does one request cost?" and "what happens to the bill at 10x traffic?".</p>`,
    clues: [
      '"Estimate the monthly bill" → list components, units, price, 730 hours',
      '"Reduce AWS cost by 30%" → right-size, commitments, spot, lifecycle, delete idle',
      '"Traffic is steady and predictable" → reserved / Savings Plan; "spiky" → on-demand/serverless',
      '"Batch job that can be interrupted" → Spot instances',
      '"Large egress charges" → CloudFront, VPC endpoints, keep traffic in one AZ/region',
      '"Review against Well-Architected" → walk the six pillars'
    ],
    code: [
      { lang: 'js', run: true, title: 'Simple monthly cost calculator (runnable)', code: `// Rough monthly estimate for a small 3-tier app. Prices are ILLUSTRATIVE round numbers,
// not a quote: always check the AWS Pricing Calculator for real figures.
var HOURS = 730;                                  // hours in an average month
var price = {
  ec2_t3_medium_hr: 0.042, alb_hr: 0.0225, alb_lcu_hr: 0.008,
  rds_multiaz_db_m5_large_hr: 0.38, rds_storage_gb: 0.23,
  nat_hr: 0.045, nat_gb: 0.045, s3_gb: 0.023, egress_gb: 0.09,
  lambda_req_million: 0.20, lambda_gb_sec: 0.0000166667,
  sqs_req_million: 0.40, ddb_write_million: 1.25, ddb_read_million: 0.25
};
function line(name, qty, unitPrice) { return { name: name, cost: qty * unitPrice }; }
var items = [
  line('EC2 app servers (4 x t3.medium)', 4 * HOURS, price.ec2_t3_medium_hr),
  line('ALB hours', HOURS, price.alb_hr),
  line('ALB capacity units (avg 5)', 5 * HOURS, price.alb_lcu_hr),
  line('RDS Multi-AZ instance', HOURS, price.rds_multiaz_db_m5_large_hr),
  line('RDS storage 200 GB', 200, price.rds_storage_gb),
  line('NAT gateways (2) hours', 2 * HOURS, price.nat_hr),
  line('NAT data processed 500 GB', 500, price.nat_gb),
  line('S3 storage 2 TB', 2048, price.s3_gb),
  line('Internet egress 1 TB', 1024, price.egress_gb),
  line('Lambda: 20M req', 20, price.lambda_req_million),
  line('Lambda compute: 20M x 0.2s x 0.5GB', 20e6 * 0.2 * 0.5, price.lambda_gb_sec),
  line('SQS 50M requests', 50, price.sqs_req_million),
  line('DynamoDB 30M writes + 100M reads', 0, 0)
];
items[items.length - 1].cost = 30 * price.ddb_write_million + 100 * price.ddb_read_million;
var total = 0;
items.forEach(function (i) { total += i.cost; });
items.sort(function (a, b) { return b.cost - a.cost; });
items.forEach(function (i) {
  var pct = (100 * i.cost / total).toFixed(0);
  console.log(i.name.padEnd(42), ('$' + i.cost.toFixed(2)).padStart(10), (pct + '%').padStart(5), '#'.repeat(Math.round(pct / 3)));
});
console.log('TOTAL / month: $' + total.toFixed(2));
// What-if: 1-year commitment saves ~35% on the steady compute lines (EC2 + RDS)
var steady = items.filter(function (i) { return /EC2|RDS Multi/.test(i.name); }).reduce(function (s, i) { return s + i.cost; }, 0);
console.log('Savings Plan what-if saves about $' + (steady * 0.35).toFixed(2) + ' / month');` },
      { lang: 'json', title: 'S3 lifecycle rule: cheaper tiers as data cools', code: `{
  "Rules": [
    {
      "ID": "age-out-uploads",
      "Status": "Enabled",
      "Filter": { "Prefix": "user-uploads/" },
      "Transitions": [
        { "Days": 30, "StorageClass": "STANDARD_IA" },
        { "Days": 365, "StorageClass": "GLACIER" }
      ],
      "AbortIncompleteMultipartUpload": { "DaysAfterInitiation": 7 }
    }
  ]
}` }
    ],
    codeTitle: ['Monthly cost calculator', 'S3 lifecycle to save money'],
    viz: [{
      title: 'Where the monthly bill goes',
      gen: function () {
        var names = ['RDS', 'EC2', 'NAT', 'Egress', 'S3', 'ALB', 'Other'];
        var vals = [277, 122, 106, 92, 47, 22, 60];
        var tot = vals.reduce(function (a, b) { return a + b; }, 0);
        var f = [{ narr: 'A typical small 3-tier bill (illustrative): total <b>$' + tot + '</b>/month. Each bar is one component.', parts: [{ type: 'bars', label: 'Cost by component ($)', values: vals, idxLabels: names, texts: vals.map(function (v) { return '$' + v; }) }] }];
        f.push({ narr: 'The database (Multi-AZ) is the biggest line. Right-size it and buy a commitment: it never sleeps.', parts: [{ type: 'bars', label: 'Cost by component ($)', values: vals, idxLabels: names, hl: { 0: 'cur' } }] });
        f.push({ narr: '<b>NAT + egress</b> together cost more than the app servers. An S3 gateway endpoint and CloudFront shrink these two bars.', parts: [{ type: 'bars', label: 'Cost by component ($)', values: vals, idxLabels: names, hl: { 2: 'bad', 3: 'bad' } }] });
        var after = [vals[0] * 0.7, vals[1] * 0.65, vals[2] * 0.4, vals[3] * 0.5, vals[4] * 0.6, vals[5], vals[6]].map(Math.round);
        f.push({ narr: 'After: 1-year commitment on RDS/EC2, endpoints to cut NAT, CloudFront for egress, S3 lifecycle. New total about <b>$' + after.reduce(function (a, b) { return a + b; }, 0) + '</b>.', parts: [{ type: 'bars', label: 'Cost after optimisation ($)', values: after, idxLabels: names, hl: { 0: 'ok', 1: 'ok', 2: 'ok', 3: 'ok', 4: 'ok' } }] });
        return f;
      }
    }, {
      title: 'Well-Architected review checklist',
      gen: function () {
        var rows = [['Operational Excellence', 'IaC + CI/CD', 'done'], ['Security', 'Least privilege + private DB', 'done'], ['Reliability', 'Multi-AZ + backups tested', 'gap'], ['Performance', 'Caching + right-size', 'done'], ['Cost', 'Budgets + tags', 'gap'], ['Sustainability', 'Graviton + lifecycle', 'done']];
        var f = [];
        for (var i = 0; i <= rows.length; i++) {
          var hl = {};
          for (var j = 0; j < i; j++) hl[j] = rows[j][2] === 'gap' ? 'bad' : 'ok';
          if (i < rows.length) hl[i] = 'cur';
          f.push({ narr: i < rows.length ? 'Pillar <b>' + rows[i][0] + '</b>: ' + (rows[i][2] === 'gap' ? '<span class="c-r">gap found</span>' : '<span class="c-g">looks fine</span>') + ' (' + rows[i][1] + ').' : 'Review done: gaps (red) become the backlog, ordered by risk.', parts: [{ type: 'table', label: 'Pillar review', columns: ['Pillar', 'Evidence', 'Status'], rows: rows.map(function (r, k) { return [r[0], r[1], k <= i - 1 || i === rows.length ? r[2] : (k === i ? 'checking' : '?')]; }), hl: hl }] });
        }
        return f;
      }
    }],
    examples: [
      { title: 'Estimating by hand', html: `<p>4 servers x 730 h x $0.042 = <b>$122.64</b>. ALB: 730 x $0.0225 = $16.43 plus capacity units. Always multiply hours by 730 and do not forget data transfer and NAT.</p>` },
      { title: 'Quick wins checklist', html: `<ul><li>Stop dev/test environments nights and weekends.</li><li>Delete unattached EBS volumes and old snapshots.</li><li>S3 lifecycle and Intelligent-Tiering.</li><li>Gateway endpoints for S3/DynamoDB.</li><li>Move to Graviton (ARM) instances: often 20% cheaper for the same work.</li></ul>` },
      { title: 'Serverless vs EC2 break-even', html: `<p>Lambda at 20M requests x 200 ms x 0.5 GB is about $20/month, far cheaper than a server idle most of the day. At a steady 500 requests/s all day (1.3 billion/month) the same function costs several thousand dollars while a few containers cost a few hundred. Compute the crossover with real numbers.</p>` }
    ],
    deepDive: `<p><b>Unit economics.</b> Express cost per user, per order or per 1,000 requests, then track it over time. Absolute dollars hide inefficiency during growth. FinOps practice: tag resources, allocate cost to teams, review weekly, and assign owners.</p>
<p><b>Commitment mechanics.</b> Compute Savings Plans apply to EC2, Fargate and Lambda usage across families and regions; Reserved Instances are tied to type/region (RDS has its own reservations). Commit to the baseline you are sure about (say the 70% always-on floor), leave the spiky rest on-demand or spot. Over-committing wastes money just like over-provisioning.</p>
<p><b>Spot design.</b> Two-minute interruption notice, so workers must be stateless or checkpoint; mix several instance types and AZs; keep a small on-demand base in the Auto Scaling Group.</p>
<p><b>Hidden costs:</b> NAT per-GB charges, cross-AZ transfer (about a cent per GB each way), CloudWatch Logs ingestion, idle load balancers, unused Elastic IPs, snapshots that never expire, over-provisioned IOPS, DynamoDB scans and extra GSIs, and S3 request charges on millions of tiny objects.</p>
<p><b>Trade-offs between pillars.</b> More reliability (multi-region) costs more; more security controls add latency and complexity; maximum cost saving can reduce resilience. The architect's job is to make these trade-offs explicit and tied to business value, document them (ADRs), and revisit them with the Well-Architected Tool reviews and Trusted Advisor / Cost Explorer data.</p>`,
    aiEra: `<p><b>What AI changes:</b> GPU and model-inference spend can dwarf the rest of the bill, and it is priced per token or per accelerator hour. Cost-aware design now includes caching prompts and responses, picking smaller models for easy tasks, batching, and setting per-team budgets. AI also helps: assistants analyse cost-and-usage reports and spot anomalies.</p>
<p><b>Use AI as a partner:</b> export a cost report (no secrets) and ask <code>Group these lines, find the top 5 savings and the risk of each</code>; have it draft a calculator in a spreadsheet for your design.</p>
<p><b>Where AI goes wrong:</b> it quotes outdated or invented prices, forgets data-transfer and NAT, and suggests risky savings like spot for stateful databases. <b>You still own:</b> the real numbers (Pricing Calculator), the assumptions written down, and the trade-off between saving and reliability.</p>`,
    problems: [prob({
      title: 'Estimate monthly cost and cut it by 30%', level: 'Medium', tags: ['cost', 'finops', 'well-architected'], companies: ['Amazon', 'Datadog'],
      statement: `<p>Your 3-tier app costs about $1,000/month: RDS Multi-AZ $380, EC2 x4 $240, NAT gateways and processing $190, internet egress $110, S3 $50, other $30. Propose changes to reach $700 without hurting reliability, state the saving of each, and say which Well-Architected pillar each touches.</p>`,
      constraints: `No removal of Multi-AZ on production. Changes must be reversible.`,
      example: `<p>NAT $190 → ${H.c('g', '$90')} with S3/DynamoDB gateway endpoints and fewer cross-AZ hops. EC2 $240 → ${H.c('g', '$150')} with a Savings Plan and Graviton.</p>`,
      brute: `Delete the second AZ and NAT to save money: saves cash but violates reliability and turns an AZ outage into a full outage.`,
      mcq: { q: 'Which change reduces NAT gateway data charges the most?', options: ['Bigger NAT', 'S3/DynamoDB gateway endpoints', 'More Elastic IPs', 'Switch to Spot'], answer: 1, explain: 'Gateway endpoints send S3 and DynamoDB traffic over the AWS network for free, bypassing the NAT per-GB charge.' },
      hints: [`<p>Sort lines by cost; attack the largest ones that have a safe lever.</p>`, `<p>Steady, always-on compute is perfect for commitments.</p>`, `<p>Check cheap wins too: S3 lifecycle, log retention, stop non-prod at night, CloudFront for egress.</p>`],
      approach: `<p>Rank lines: RDS 380, EC2 240, NAT 190, egress 110, S3 50. (1) RDS: a 1-year reserved instance or Savings Plan on the always-on Multi-AZ database saves about 30-35 percent (about $120), after right-sizing based on CPU and memory metrics; touches cost and sustainability, no reliability loss. (2) EC2: Compute Savings Plan for the baseline plus moving to Graviton instances saves roughly 35-40 percent (about $90); pillar cost and performance efficiency. (3) NAT: add S3 and DynamoDB gateway endpoints (free) and interface endpoints only where traffic justifies the hourly fee; pull container images through an ECR endpoint; this cuts per-GB charges and saves about $90-100. (4) Egress: put CloudFront in front of static and cacheable responses; cached egress is cheaper and faster, saving about $40-50; also performance efficiency. (5) S3: lifecycle to Standard-IA and Glacier plus abort incomplete uploads saves $15-20. Total saving about $350, comfortably more than the $300 target, with Multi-AZ untouched. Add budgets and alerts, tag by team, and review monthly so the saving does not drift back. Each change can be rolled back, except that commitments are sticky, so commit only to the baseline.</p>`,
      complexity: `<p>Savings are roughly additive but overlap slightly (CloudFront reduces NAT traffic too).</p>`,
      followUps: ['When is Spot appropriate here?', 'How do you track cost per customer?']
    })]
  });

  /* ================= PRACTICE ================= */
  function mc(q, options, answer, explain) { return { q: q, options: options, answer: answer, explain: explain }; }
  function H3(a, b, c) { return ['<p>' + a + '</p>', '<p>' + b + '</p>', '<p>' + c + '</p>']; }

  practice.push(prob({
    title: 'Security group or NACL?', level: 'Easy', tags: ['vpc', 'security'], companies: ['Amazon'],
    statement: `<p>For each need choose security group or NACL: (a) allow the app tier to reach the DB port, (b) block one abusive IP range, (c) let replies return automatically, (d) apply one rule to every instance in a subnet.</p>`,
    constraints: `Explain the stateful/stateless difference in one sentence.`,
    example: `<p>(a) ${H.c('g', 'Security group')} referencing the app SG. (b) ${H.c('r', 'NACL deny')}.</p>`,
    brute: `Using NACLs for everything: you must hand-write ephemeral port return rules in both directions, which is easy to get wrong and breaks connections silently.`,
    mcq: mc('Which firewall can explicitly DENY?', ['Security group', 'NACL', 'Both', 'Neither'], 1, 'Security groups only allow; NACLs have allow and deny rules.'),
    hints: H3('Which one remembers connections?', 'Only one of them supports deny rules.', '(a) SG, (b) NACL, (c) SG (stateful), (d) NACL applies at the subnet.'),
    approach: `<p>(a) Security group on the DB, source = the app security group, port 5432; referencing groups instead of IPs survives auto scaling. (b) NACL deny rule with a low rule number, because security groups cannot deny. (c) Replies are automatic with security groups because they are stateful and track the connection; a NACL is stateless and needs an explicit outbound rule for ephemeral ports 1024-65535. (d) A NACL attaches to the subnet and filters all traffic crossing its boundary, so it is a coarse second layer. Default practice: rely on security groups for fine-grained allow rules and add NACL denies only for blocklists or compliance.</p>`,
    complexity: `<p>Not applicable; evaluation order: NACL first at the subnet, then the security group.</p>`
  }));
  practice.push(prob({
    title: 'Which AWS service fits?', level: 'Easy', tags: ['aws', 'service-selection'], companies: ['Amazon', 'Microsoft'],
    statement: `<p>Match: (1) store 5 TB of user videos, (2) buffer 10k jobs per second for slow workers, (3) relational orders with joins, (4) run a 2-second function when a file lands, (5) notify billing, email and analytics of one event.</p>`,
    constraints: `One primary service per item.`,
    example: `<p>(1) ${H.c('g', 'S3')}, (2) ${H.c('g', 'SQS')}, (3) ${H.c('g', 'RDS/Aurora')}, (4) ${H.c('g', 'Lambda')}, (5) ${H.c('g', 'SNS')}.</p>`,
    brute: `Using EC2 plus a self-managed database for everything: you now patch, back up, scale and fail over every piece yourself.`,
    mcq: mc('Which service delivers one message to ALL subscribers?', ['SQS', 'SNS', 'S3', 'RDS'], 1, 'SNS is publish/subscribe fan-out; SQS gives each message to one consumer.'),
    hints: H3('Think data shape: file, row, message, event.', 'Queue = one consumer; topic = many.', 'Lambda is the glue for short event-driven code.'),
    approach: `<p>Videos are large binary objects, so S3 (cheap, durable, with lifecycle tiers). Buffering a high job rate for slow workers is exactly what a queue is for: SQS decouples producer speed from consumer speed and holds the backlog. Orders with joins and transactions need a relational engine: RDS or Aurora, Multi-AZ. A short function reacting to an object upload is Lambda with an S3 event trigger. Telling several independent systems about one event is fan-out: publish to an SNS topic with each system subscribing through its own SQS queue so they fail and scale independently. Choose managed services so the team operates less.</p>`,
    complexity: `<p>Not applicable.</p>`
  }));
  practice.push(prob({
    title: 'Run the IAM evaluation by hand', level: 'Easy', tags: ['iam', 'policy-evaluation'], companies: ['Amazon', 'Google'],
    statement: `<p>A role has Policy A: Allow <code>s3:*</code> on <code>*</code>, and Policy B: Deny <code>s3:DeleteObject</code> on bucket <code>logs</code>. Decide for: (1) GetObject on logs, (2) DeleteObject on logs, (3) DeleteObject on photos, (4) <code>ec2:StartInstances</code>.</p>`,
    constraints: `Use the order: explicit deny, allow, implicit deny.`,
    example: `<p>(1) ${H.c('g', 'allowed')} (2) ${H.c('r', 'explicit deny')} (3) ${H.c('g', 'allowed')} (4) ${H.c('r', 'implicit deny')}.</p>`,
    brute: `Reading statements top to bottom and trusting the first match, like a firewall: IAM ignores order. Any matching Deny anywhere wins.`,
    mcq: mc('Policy allows s3:* and another denies s3:DeleteObject. Delete result?', ['Allowed', 'Denied', 'Depends on order', 'Needs MFA'], 1, 'An explicit deny always overrides any allow.'),
    hints: H3('Start from "everything is denied".', 'Look for a matching Deny first.', 'Then look for any matching Allow; otherwise it stays denied.'),
    approach: `<p>Start at implicit deny. (1) GetObject on logs: no Deny matches (the deny names DeleteObject only), Allow s3:* on * matches, result allowed. (2) DeleteObject on logs: Policy B's explicit Deny matches, evaluation stops, denied even though Policy A allows it. (3) DeleteObject on photos: the Deny is scoped to bucket logs, so it does not match; Policy A allows, so allowed. (4) ec2:StartInstances: no statement matches the action, so the implicit deny stands. The evaluator in this module encodes the same three steps and prints the trace.</p>`,
    complexity: `<p>Linear in the number of statements.</p>`
  }));

  practice.push(prob({
    title: 'S3 presigned upload flow', level: 'Medium', tags: ['s3', 'presigned-url', 'security'], companies: ['Dropbox', 'Amazon'],
    statement: `<p>Design a secure browser upload of files up to 2 GB to S3 without proxying bytes through your servers. Cover authentication, key naming, expiry, size/type limits, multipart for large files, and post-upload processing.</p>`,
    constraints: `Credentials must never reach the browser; users must not overwrite each other's files.`,
    example: `<p>Browser → API ${H.c('b', 'POST /uploads')} → returns ${H.c('g', 'presigned URL(s)')} → PUT to S3 → event → worker.</p>`,
    brute: `Browser posts the file to your API which forwards it to S3: doubles bandwidth, ties up threads for minutes, and hits timeouts on big files.`,
    mcq: mc('Who chooses the S3 object key?', ['The browser', 'The server that signs the URL', 'S3 randomly', 'CloudFront'], 1, 'The server picks the key (for example including the user id and a random id) so a client cannot target someone else\'s object.'),
    hints: H3('The API only signs; S3 receives the bytes.', 'Short expiry, fixed key, fixed content type.', 'For 2 GB use multipart upload with a presigned URL per part, and a lifecycle rule to abort unfinished uploads.'),
    approach: `<p>The authenticated client calls POST /uploads with file name, size and content type. The API validates size and type against policy, builds a server-chosen key such as user-uploads/{userId}/{uuid}, and asks the S3 SDK to presign. For files under about 100 MB, one presigned PUT (or presigned POST with a content-length-range condition) valid for 5 minutes. For up to 2 GB, start a multipart upload, presign one URL per part (5-100 MB each), let the browser upload parts in parallel with retries, then call a complete endpoint that finishes the multipart upload. The signing role has only PutObject on that prefix. S3 default encryption is on, public access is blocked, and a CORS rule allows only your origin. An ObjectCreated event goes to SQS, a worker scans for malware, verifies size and type, and marks the record active; unverified objects stay quarantined. A lifecycle rule aborts incomplete multipart uploads after 7 days to avoid paying for orphan parts.</p>`,
    complexity: `<p>Server load is O(1) per upload; bandwidth is borne by S3.</p>`
  }));
  practice.push(prob({
    title: 'Plan a CIDR layout', level: 'Medium', tags: ['vpc', 'cidr'], companies: ['Amazon', 'Cisco'],
    statement: `<p>Plan address space for prod and staging VPCs that may later peer with each other and with a corporate 192.168.0.0/16 network. Each VPC needs 3 subnet tiers in 3 AZs. Give ranges and the number of usable AWS addresses per subnet.</p>`,
    constraints: `No overlaps; leave room to grow.`,
    example: `<p>prod ${H.c('b', '10.0.0.0/16')}, staging ${H.c('b', '10.1.0.0/16')}; /20 subnets = ${H.c('g', '4,091')} usable.</p>`,
    brute: `Both VPCs use 10.0.0.0/16: peering is impossible because the routes would overlap, and you must renumber later at great pain.`,
    mcq: mc('How many usable addresses in a /24 subnet on AWS?', ['256', '254', '251', '250'], 2, '256 minus the 5 AWS reserves is 251.'),
    hints: H3('Overlap kills peering and VPN.', 'A /16 split into /20s gives 16 subnets.', 'Reserve unused blocks for future tiers and a third region.'),
    approach: `<p>Pick distinct /16 blocks from the 10.0.0.0/8 space, avoiding 192.168.0.0/16: prod 10.0.0.0/16, staging 10.1.0.0/16, leaving 10.2+ for dev and other regions. Within a /16 carve /20 subnets (4,096 addresses, 4,091 usable): AZ-a/b/c public 10.0.0.0/20, 10.0.16.0/20, 10.0.32.0/20; app 10.0.48.0/20, 10.0.64.0/20, 10.0.80.0/20; data 10.0.96.0/20, 10.0.112.0/20, 10.0.128.0/20; the remaining blocks stay unallocated for future tiers. Public and data tiers may be smaller (/24) because they hold few addresses, which leaves even more room. Document the plan in IaC, verify no overlap with the CIDR calculator, and remember peering is not transitive and needs routes in both route tables.</p>`,
    complexity: `<p>Address arithmetic: 2^(32-prefix) minus 5.</p>`
  }));
  practice.push(prob({
    title: 'Fix a hot partition', level: 'Medium', tags: ['dynamodb', 'hot-partition'], companies: ['Amazon', 'Snap'],
    statement: `<p>A DynamoDB table uses PK = <code>date</code> (YYYY-MM-DD) for a click log with 8,000 writes/s. Writers are throttled although the table has plenty of provisioned capacity. Explain why and fix the key design while keeping "show all clicks for a day" possible.</p>`,
    constraints: `A single partition value tops out near 1,000 writes/s.`,
    example: `<p>Before: ${H.c('r', 'PK=2026-03-01 (one hot key)')}. After: ${H.c('g', 'PK=2026-03-01#0..15')}.</p>`,
    brute: `Increase provisioned capacity: capacity is spread across partitions, but one key lives in one partition, so adding money does not remove the cap.`,
    mcq: mc('Why is a date as partition key bad for a write-heavy log?', ['Dates are strings', 'All current writes hit one key/partition', 'Dates cannot be sorted', 'It disables TTL'], 1, 'All of today\'s writes share a key, so one partition takes the whole load.'),
    hints: H3('All writes today share one key.', 'Spread one logical key over N physical keys.', 'Reads then query all N shards in parallel and merge.'),
    approach: `<p>The date key has one value per day, so every write in that day targets a single partition limited to about 1,000 writes per second, leaving the rest of the table idle while requests are throttled. Use write sharding: PK = date#shard where shard is a random or hash-based number from 0 to 15, giving 16 keys at roughly 500 writes per second each. Put a high-cardinality part in the sort key, for example timestamp#clickId, so items remain ordered per shard. Reading all clicks for a day issues 16 Queries in parallel and merges them by timestamp; the application hides this. If clicks are mostly analysed in aggregate, better still is to write to Kinesis or Firehose and S3 and query with Athena, using DynamoDB only for lookups. Verify with CloudWatch contributor insights or throttle metrics. Pick the shard count from peak writes divided by a safe 500 per key.</p>`,
    complexity: `<p>Reads cost N queries instead of 1; writes scale linearly with the shard count.</p>`
  }));
  practice.push(prob({
    title: 'Fan-out with SNS and SQS', level: 'Medium', tags: ['sns', 'sqs', 'messaging'], companies: ['Amazon', 'Uber'],
    statement: `<p>An order service must tell inventory, billing and email systems about every new order. Email is flaky and sometimes down for an hour. Design it so one failing consumer never blocks the others or loses messages.</p>`,
    constraints: `At-least-once delivery is acceptable; consumers must be safe to retry.`,
    example: `<p>${H.c('b', 'OrderPlaced')} → SNS topic → 3 SQS queues → 3 consumers (+ DLQ each).</p>`,
    brute: `Order service calls the three APIs synchronously: any slow or failing call slows or fails the customer's checkout.`,
    mcq: mc('Why put an SQS queue between SNS and each consumer?', ['SNS cannot reach Lambda', 'To buffer, retry, and isolate each consumer', 'To make it FIFO', 'To encrypt messages'], 1, 'The queue stores messages while a consumer is down and lets each consumer scale and retry on its own.'),
    hints: H3('Publish once, deliver many.', 'Each consumer gets its own queue.', 'Add DLQs, idempotency keys and a filter policy.'),
    approach: `<p>The order service writes the order and publishes one OrderPlaced event to an SNS topic (ideally via the outbox pattern, so the event is not lost if the publish fails after the database commit). Three SQS queues subscribe to the topic, one per consumer, with filter policies so each only receives the events it needs. When email is down its queue simply grows (messages kept up to 14 days) and drains when it recovers, while inventory and billing continue. Each queue has a redrive policy to a DLQ after several attempts and an alarm on DLQ depth and oldest message age. Because delivery is at-least-once, consumers dedupe by event id using a conditional write in DynamoDB or a unique constraint. Visibility timeout exceeds the processing time. The checkout request only waits for the database commit, so latency and availability are decoupled from the downstream systems.</p>`,
    complexity: `<p>Publish is O(subscribers) for AWS; each consumer processes independently.</p>`
  }));
  practice.push(prob({
    title: 'Mitigate Lambda cold starts', level: 'Medium', tags: ['lambda', 'cold-start', 'latency'], companies: ['Amazon', 'Capital One'],
    statement: `<p>A Java Lambda behind API Gateway has p99 latency of 3.5 s on the first request after idle, but 80 ms when warm. The SLO is p99 under 500 ms. List the options in order of effort and pick one.</p>`,
    constraints: `Traffic is steady during the day and quiet at night.`,
    example: `<p>${H.c('g', 'SnapStart')} often cuts Java init by about 90%; ${H.c('y', 'provisioned concurrency')} removes it for N instances.</p>`,
    brute: `Ping the function every 5 minutes to keep one container warm: helps only one concurrent instance, and scale-out still cold starts.`,
    mcq: mc('Which option guarantees pre-initialised instances?', ['Higher memory only', 'Provisioned concurrency', 'A cron ping', 'More retries'], 1, 'Provisioned concurrency keeps the configured number of environments initialised.'),
    hints: H3('Cold start = init time, not handler time.', 'Reduce what loads at start, or pre-warm.', 'Compare cost: provisioned concurrency is billed while idle.'),
    approach: `<p>First measure the init phase (Init Duration in logs) separately from handler time. Cheap fixes: shrink the package and dependencies, move heavy work out of static initialisers or lazy-load it, create SDK clients once outside the handler, raise memory (more CPU speeds init), and use ARM. For Java, enable SnapStart, which restores a snapshot of the initialised function and usually cuts the penalty dramatically. If SnapStart is still not enough or the runtime does not support it, use provisioned concurrency sized to the daytime baseline and scheduled with Application Auto Scaling, so you pay only in business hours. If the workload is steady and latency critical, a container service (Fargate or ECS) with a minimum of two tasks removes cold starts altogether. Choose SnapStart plus a small provisioned concurrency during peak hours, then re-measure p99 under a realistic scale-out test, since burst traffic still creates new environments.</p>`,
    complexity: `<p>Cost trade-off: provisioned concurrency is paid per GB-second of reserved capacity whether used or not.</p>`
  }));
  practice.push(prob({
    title: 'Private subnet cannot reach the internet', level: 'Medium', tags: ['vpc', 'nat', 'troubleshooting'], companies: ['Amazon', 'Okta'],
    statement: `<p>Instances in a private subnet fail to reach a public package repository. List the checks in order and the fix for each likely cause.</p>`,
    constraints: `Do not give the instances public IPs.`,
    example: `<p>Route table lacks ${H.c('r', '0.0.0.0/0 → nat-xxxx')}; the NAT is in a ${H.c('r', 'private')} subnet.</p>`,
    brute: `Give the instances public IPs and open security groups to the world: it "works" but exposes them to the internet.`,
    mcq: mc('Where must a NAT gateway be placed?', ['Private subnet', 'Public subnet', 'Any subnet', 'Outside the VPC'], 1, 'The NAT needs a route to the internet gateway, so it lives in a public subnet.'),
    hints: H3('Follow the packet: subnet route, NAT, IGW.', 'Check both route tables.', 'Then check security group egress, NACL ephemeral ports and DNS.'),
    approach: `<p>Trace the outbound packet. Step 1: the private subnet route table must contain 0.0.0.0/0 pointing to a NAT gateway. Step 2: that NAT gateway must sit in a public subnet whose route table sends 0.0.0.0/0 to the internet gateway, and it needs an Elastic IP. Step 3: the instance security group egress must allow the destination port (default allows all). Step 4: the subnet NACLs must allow outbound traffic and the inbound ephemeral return ports 1024-65535. Step 5: DNS resolution must be enabled on the VPC. Use VPC Reachability Analyzer and Flow Logs to find the rejected hop. For AWS service traffic, add gateway endpoints for S3 and DynamoDB so the NAT is not needed at all. A multi-AZ design needs one NAT per AZ with each private subnet routing to its own AZ's NAT.</p>`,
    complexity: `<p>Debugging is a linear walk of the path.</p>`
  }));
  practice.push(prob({
    title: 'Design a least-privilege role for a Lambda', level: 'Medium', tags: ['iam', 'lambda'], companies: ['Amazon', 'Zalando'],
    statement: `<p>A Lambda reads messages from one SQS queue, writes to one DynamoDB table, and logs to CloudWatch. Write the permissions and the trust policy and explain what you deliberately left out.</p>`,
    constraints: `Use placeholder account 123456789012 and region us-east-1.`,
    example: `<p>${H.c('g', 'sqs:ReceiveMessage, DeleteMessage, GetQueueAttributes')} on the queue ARN; ${H.c('g', 'dynamodb:PutItem')} on the table ARN.</p>`,
    brute: `Attach AdministratorAccess so deployments stop failing: any bug or compromised dependency can then touch the entire account.`,
    mcq: mc('Which principal goes in the trust policy of a Lambda execution role?', ['lambda.amazonaws.com', 'The developer user', 'ec2.amazonaws.com', '*'], 0, 'The Lambda service assumes the role when it runs your function.'),
    hints: H3('List every API call the code makes.', 'One ARN per resource, no wildcards.', 'Logs need CreateLogStream and PutLogEvents on its own log group.'),
    approach: `<p>Trust policy: Principal Service lambda.amazonaws.com with action sts:AssumeRole. Permissions: (1) sqs:ReceiveMessage, sqs:DeleteMessage and sqs:GetQueueAttributes on arn:aws:sqs:us-east-1:123456789012:thumbs (the event source mapping needs exactly these). (2) dynamodb:PutItem, and dynamodb:UpdateItem only if the code updates, on arn:aws:dynamodb:us-east-1:123456789012:table/Thumbs. (3) logs:CreateLogStream and logs:PutLogEvents on the function's own log group ARN. Left out: any dynamodb:Scan, Delete or table administration; sqs:SendMessage; s3 access unless it is used; iam:PassRole; wildcard resources. Add a condition such as aws:SourceAccount where supported. Check with IAM Access Analyzer policy validation and generate a policy from CloudTrail after a test run to see what is truly used, then remove extras.</p>`,
    complexity: `<p>Not applicable.</p>`
  }));

  practice.push(prob({
    title: 'Estimate the monthly cost of a video-thumbnail service', level: 'Hard', tags: ['cost', 'lambda', 's3', 'estimation'], companies: ['Amazon', 'Netflix'],
    statement: `<p>5 million uploads per month, average 4 MB each (stored 90 days then deleted). Each triggers one SQS message and one Lambda run of 1.5 s at 1 GB. Thumbnails add 100 KB per upload. Users download 50 TB per month through CloudFront. Estimate monthly cost with explicit assumptions and say which line dominates.</p>`,
    constraints: `Use rounded illustrative prices and state them; compare against the Pricing Calculator.`,
    example: `<p>Storage ≈ 5M x 4 MB x 3 months ≈ ${H.c('b', '60 TB-months')}; Lambda ≈ ${H.c('b', '7.5M GB-seconds')}.</p>`,
    brute: `Quote one number with no breakdown: you cannot defend it or find the cost lever. Forgetting data transfer is the usual miss.`,
    mcq: mc('Which line most likely dominates?', ['SQS requests', 'Lambda requests', 'Data transfer out', 'Lambda init'], 2, 'Serving 50 TB out costs far more than a few million small compute calls.'),
    hints: H3('Multiply: units x price. Split storage, compute, requests, transfer.', 'Average stored volume over 90 days is about 3 months of uploads.', 'Express each as dollars and rank; then name the lever for the top line.'),
    approach: `<p>Assumptions (illustrative): S3 Standard $0.023/GB-month; Lambda $0.0000166667 per GB-second and $0.20 per million requests; SQS $0.40 per million; CloudFront $0.085/GB first tiers. Storage: 5M uploads x 4 MB = 20 TB per month of new data; with 90-day retention about 60 TB stored on average, so 60,000 GB x 0.023 = about $1,380; add thumbnails 0.5 TB x 3 = 1.5 TB, about $35. Lambda compute: 5M x 1.5 s x 1 GB = 7.5M GB-seconds x $0.0000166667 = about $125; requests 5M = $1. SQS: about 15M requests including receive and delete, about $6. S3 PUT/GET requests about 5M x $5 per million for PUTs = $25. Delivery: 50 TB = 51,200 GB x about $0.085 = about $4,350. Total about $5,900 per month; delivery dominates (about 74 percent), storage second (about 24 percent), compute is almost noise (about 2 percent). Levers: CloudFront cache hit ratio and compressed/WebP thumbnails, price class selection, committed CloudFront pricing; shorter retention or Intelligent-Tiering for storage. Note: always confirm with the Pricing Calculator and add a 20 percent buffer.</p>`,
    complexity: `<p>Cost grows linearly with uploads and downloads; delivery grows with audience, not uploads.</p>`
  }));
  practice.push(prob({
    title: 'Design a multi-AZ, multi-tier app with failure analysis', level: 'Hard', tags: ['architecture', 'high-availability', 'vpc'], companies: ['Amazon', 'Airbnb'],
    statement: `<p>Draw (describe) a web app for 1M daily users that tolerates the loss of one AZ with no manual action. For each component state what happens when its AZ dies, how long the recovery takes, and what can still go wrong. Include DNS, CDN, ALB, compute, cache, database and queue.</p>`,
    constraints: `Single region, 99.95 percent availability target.`,
    example: `<p>Route 53 → CloudFront → ALB (2+ AZs) → ASG → Aurora Multi-AZ + ElastiCache replica → SQS.</p>`,
    brute: `All servers in one AZ behind one load balancer node: one AZ event is a full outage, and the single NAT or single DB instance is another single point of failure.`,
    mcq: mc('Aurora/RDS Multi-AZ failover mainly gives you:', ['Read scaling', 'Automatic promotion of a standby in another AZ', 'Multi-region writes', 'Cheaper storage'], 1, 'The standby is promoted automatically; read scaling is a separate feature (replicas).'),
    hints: H3('List each component and ask "what is its failure domain?"', 'Regional services already span AZs; zonal ones need copies.', 'Find hidden single points: NAT, cache primary, config, DNS TTL, quotas.'),
    approach: `<p>Edge: Route 53 and CloudFront are global/regional managed services, unaffected by one AZ. ALB spans at least 2 AZ subnets; its nodes in the failed AZ are removed from DNS and health checks route around instances there. Compute: an Auto Scaling Group over 3 AZs with at least 2 instances per AZ sized so any two AZs can carry peak load (N+1 AZ capacity); it launches replacements in healthy AZs within minutes, so also pre-scale rather than depend on scaling during the event. Data: Aurora with a writer in one AZ and a replica in another; on AZ failure a replica is promoted, typically 30-120 seconds of write unavailability and RPO about 0 because storage is replicated across 3 AZs; apps must retry connections and use the cluster endpoint. Cache: ElastiCache with a replica in another AZ and automatic failover; the app must tolerate a cold cache (protect the database with request coalescing and TTL jitter). Queue: SQS is regional and unaffected. NAT: one per AZ with route tables per AZ. Remaining risks: bad deployments, shared dependencies, connection storms after failover, account quotas in the surviving AZs, DNS TTL caching. Test with AZ-failure game days (disable subnets, terminate instances), and watch the 99.95 percent budget of about 4.4 hours per year.</p>`,
    complexity: `<p>Capacity cost: running at 3 AZs with N+1 headroom means about 50 percent extra spare capacity.</p>`
  }));
  practice.push(prob({
    title: 'DR plan from RTO and RPO for an e-commerce platform', level: 'Hard', tags: ['disaster-recovery', 'rto-rpo', 'cost'], companies: ['Amazon', 'Walmart'],
    statement: `<p>Business says: during a regional outage checkout must be back within 15 minutes with at most 1 minute of order loss; the product catalog can be down 4 hours with 1 hour of loss; analytics may be down 3 days. Propose the DR strategy per component, the replication tech, the failover trigger, and a quarterly test plan. Estimate the relative cost.</p>`,
    constraints: `Primary us-east-1, DR us-west-2. Avoid active-active unless required.`,
    example: `<p>Checkout → ${H.c('y', 'warm standby')}. Catalog → ${H.c('g', 'pilot light / backups')}. Analytics → ${H.c('g', 'rebuild from S3')}.</p>`,
    brute: `One blanket strategy for all components: either you overpay for analytics, or checkout misses the 15 minute target.`,
    mcq: mc('Which setting keeps checkout RPO near one minute across regions?', ['Nightly snapshots', 'Continuous cross-region replication (Aurora Global or Global Tables)', 'Weekly export', 'Multi-AZ only'], 1, 'Only continuous asynchronous replication with seconds of lag meets a 1-minute RPO across regions.'),
    hints: H3('Tier by component, not by company.', 'RPO is a replication question; RTO is an automation question.', 'Name what you will test and how you will measure real RTO.'),
    approach: `<p>Tier 1, checkout and orders (RTO 15 min, RPO 1 min): warm standby in us-west-2. Aurora Global Database (typically sub-second lag) or DynamoDB global tables; a scaled-down but running copy of the ALB, services and cache; queues and config replicated by IaC and stored in both regions. Failover is a runbook automated as a script/Step Functions workflow: promote the secondary cluster, scale the Auto Scaling Group to full size (pre-warmed baseline cuts time), then flip Route 53 or Global Accelerator; health-check-driven but with human approval to avoid split brain from a false alarm. Reconcile in-flight orders using idempotency keys. Tier 2, catalog (RTO 4 h, RPO 1 h): pilot light. Cross-region read replica or hourly snapshot copy and S3 replication for images; compute templates ready, scaled to zero. Tier 3, analytics (RTO 3 days): backup and restore, data already lands in S3 with cross-region replication, rebuild the warehouse from IaC. Relative cost: tier 1 about 1.5-2x its single-region cost (idle capacity, replication, transfer), tier 2 about 1.1-1.3x, tier 3 about 1.02x; overall maybe 1.3x of the platform for meeting the targets, far less than full active-active at 2x+. Quarterly game day: fail over a test slice, measure actual RTO and RPO, fix the gaps, then fail back; verify backups by restoring them; monitor replication lag with an alarm at 30 seconds.</p>`,
    complexity: `<p>Cost scales with the idle capacity kept in the second region.</p>`
  }));
  practice.push(prob({
    title: 'Cross-account access and permission guardrails', level: 'Hard', tags: ['iam', 'organizations', 'security'], companies: ['Amazon', 'Stripe'],
    statement: `<p>A data-platform account must read a bucket in a separate production account, and developers must never be able to delete production data or disable CloudTrail even if someone grants them broad permissions by mistake. Design the IAM roles, trust, bucket policy and guardrails, and explain how evaluation works across accounts.</p>`,
    constraints: `Use placeholder account ids 111111111111 (data) and 222222222222 (prod).`,
    example: `<p>Role in prod trusted by the data account; ${H.c('r', 'SCP deny')} on CloudTrail changes and bucket deletes.</p>`,
    brute: `Share an IAM user's access keys between accounts: long-lived credentials with no audit trail per person that live in tickets and chat.`,
    mcq: mc('For cross-account access you need:', ['Only the identity policy', 'Only the resource policy', 'Allow on both sides (identity side and the target account)', 'Root credentials'], 2, 'A request across accounts must be allowed by the caller account\'s identity policy and by the target account (role trust or resource policy).'),
    hints: H3('Prefer assume-role over sharing credentials.', 'Guardrails belong in Organizations SCPs, which cap even admins.', 'Remember explicit deny wins and an SCP is a ceiling, not a grant.'),
    approach: `<p>In the prod account create a role ProdBucketReader with permissions s3:GetObject and s3:ListBucket scoped to the single bucket and prefix, and a trust policy whose principal is the data account's pipeline role (not the whole account root), with an ExternalId or aws:PrincipalOrgID condition where useful. In the data account give the pipeline role sts:AssumeRole on that one role ARN. Calls return temporary credentials that expire in an hour and appear in CloudTrail under the assumed-role session name. Optionally a bucket policy in prod grants the same role directly, but note KMS: if the bucket is encrypted with a customer-managed key, the key policy must also allow the role. Guardrails: attach Service Control Policies at the production OU that explicitly Deny s3:DeleteObject and s3:DeleteBucket except for a break-glass role with MFA, and Deny cloudtrail:StopLogging, DeleteTrail and UpdateTrail for everyone. Because SCPs are ceilings that apply to every principal in the account including admins, they hold even if an identity policy later allows more. Add permission boundaries for roles that developers create, S3 Object Lock or versioning with MFA delete for data safety, and Access Analyzer to detect unintended external access. Evaluation across accounts: explicit deny anywhere wins; the SCP, boundary and identity policy must all permit; the target account side must also allow.</p>`,
    complexity: `<p>Not computational; the design reduces blast radius to one bucket and gives auditable temporary access.</p>`
  }));

  /* ================= QUIZ ================= */
  quiz.push({ q: 'A subnet is "public" because…', options: ['its name says public', 'its route table sends 0.0.0.0/0 to an internet gateway', 'it contains a load balancer', 'it has a NACL'], answer: 1, explain: 'Only the default route to an IGW makes a subnet public.' });
  quiz.push({ q: 'Which statement about security groups is true?', options: ['They are stateless', 'They support deny rules', 'They are stateful and allow-only', 'They apply to subnets only'], answer: 2, explain: 'Security groups remember connections and only contain allow rules; NACLs are stateless and support deny.' });
  quiz.push({ q: 'An IAM policy allows <code>s3:*</code> and another denies <code>s3:DeleteObject</code>. Deleting an object is…', options: ['Allowed', 'Denied', 'Allowed if MFA is used', 'Decided by policy order'], answer: 1, explain: 'Explicit deny always beats allow, regardless of order.' });
  quiz.push({ q: 'Best partition key for a table of per-user orders at huge scale?', options: ['order status', 'today\'s date', 'userId', 'a constant'], answer: 2, explain: 'userId is high-cardinality and used with equality in the main query. Status and date concentrate traffic.' });
  quiz.push({ q: 'SQS standard queues guarantee…', options: ['exactly-once, ordered delivery', 'at-least-once delivery', 'at-most-once delivery', 'delivery to every consumer'], answer: 1, explain: 'Duplicates are possible, so make consumers idempotent.' });
  quiz.push({ q: 'RPO measures…', options: ['how long you can be down', 'how much data you can afford to lose', 'cost of recovery', 'number of AZs'], answer: 1, explain: 'RPO is a time window of data loss. RTO is the downtime allowed.' });
  quiz.push({ q: 'Which DR strategy has the lowest cost but the slowest recovery?', options: ['Active-active', 'Warm standby', 'Pilot light', 'Backup and restore'], answer: 3, explain: 'Backups are cheap to keep but need hours to rebuild.' });
  quiz.push({ q: 'RDS Multi-AZ protects against…', options: ['loss of a whole region', 'accidental DELETE statements', 'failure of the primary instance or its AZ', 'slow queries'], answer: 2, explain: 'The synchronous standby takes over on instance/AZ failure. It does not protect against logical errors or regional loss.' });
  quiz.push({ q: 'A Lambda cold start is…', options: ['a slow SQL query', 'extra latency creating a new execution environment', 'an IAM error', 'a throttling response'], answer: 1, explain: 'New sandboxes must start the runtime and run init code before the first invocation.' });
  quiz.push({ q: 'Where must a NAT gateway be placed?', options: ['In a private subnet', 'In a public subnet with a route to the IGW', 'Outside the VPC', 'In the database subnet'], answer: 1, explain: 'It needs internet access itself; private subnets route to it.' });
  quiz.push({ q: 'To let a browser upload a 1 GB file to S3 safely you should…', options: ['embed access keys in JavaScript', 'proxy through your API server', 'return a short-lived presigned URL for a server-chosen key', 'make the bucket public-write'], answer: 2, explain: 'Presigned URLs give narrow, expiring access without exposing credentials or loading your servers.' });
  quiz.push({ q: 'Which is NOT a Well-Architected pillar?', options: ['Reliability', 'Sustainability', 'Portability', 'Cost Optimization'], answer: 2, explain: 'The six pillars: Operational Excellence, Security, Reliability, Performance Efficiency, Cost Optimization, Sustainability.' });
  quiz.push({ q: 'A queue visibility timeout of 30 s with a 90 s Lambda will cause…', options: ['faster processing', 'duplicate processing', 'messages deleted early', 'nothing'], answer: 1, explain: 'The message becomes visible again after 30 s and another worker picks it up while the first is still running.' });

  /* ================= INTERVIEW ================= */
  function qa(q, level, a, fu) { interview.push({ q: q, level: level, a: '<p>' + a + '</p>', followUps: fu }); }
  qa('Walk me through a 3-tier web app in AWS that survives an AZ failure.', 'B', 'Put an internet-facing ALB in public subnets in two or more AZs. Run the app servers in an Auto Scaling Group in private subnets across the same AZs, with capacity so that losing one AZ still carries peak load. The database is RDS or Aurora Multi-AZ in private data subnets with no internet route. Security groups chain: world to ALB, ALB to app, app to DB. Each AZ has its own NAT gateway for outbound traffic. Health checks remove failed instances; the DB standby is promoted automatically in about a minute or two. Add CloudFront in front and backups for logical errors.', ['What happens to in-flight requests?', 'How do you test it?']);
  qa('Security group vs NACL?', 'B', 'A security group is a stateful firewall attached to an instance network interface and only has allow rules; return traffic is automatically permitted. A NACL is a stateless firewall on a subnet with ordered allow and deny rules, so you must allow return ephemeral ports explicitly. Use security groups for normal access control (and reference other groups instead of IPs), and NACLs for coarse blocks like denying a hostile IP range.', ['Which is evaluated first?', 'Can a security group deny?']);
  qa('How does IAM decide whether a request is allowed?', 'I', 'Everything starts as implicitly denied. IAM gathers all applicable policies (identity, resource, permission boundary, SCP, session). If any matches with an explicit Deny, the request is denied. Otherwise it must be allowed by the identity or resource policy within the ceilings of boundaries and SCPs. If nothing allows it the implicit deny stands. Order of statements does not matter. Across accounts both sides must allow.', ['What is a permission boundary?', 'Explain the difference between an SCP and an IAM policy.']);
  qa('Users vs roles: when do you use each?', 'B', 'Humans should use federated sign-in (SSO) and assume roles, so credentials are temporary. Workloads such as EC2, Lambda and ECS tasks get roles through instance profiles, execution roles and task roles, so no access keys live in code or config. Long-lived IAM user access keys are a last resort for systems that cannot assume roles, and must be rotated and tightly scoped. Roles have a trust policy (who can assume) and permission policies (what they can do).', ['How do temporary credentials work?', 'What does iam:PassRole do and why is it dangerous?']);
  qa('How would you choose DynamoDB keys?', 'I', 'Start by listing access patterns with their rates. Choose a high-cardinality partition key that appears with equality in the most important query, and a sort key that supports the needed ordering or range. Use GSIs for other patterns, sparse GSIs for subsets, and write sharding when a single key would exceed about 1,000 writes per second or 3,000 reads per second. Check skew against real traffic. Avoid scans on hot paths, and avoid low-cardinality keys like status or date.', ['What is single-table design?', 'How do you page through results?']);
  qa('What is a hot partition and how do you fix it?', 'I', 'When many requests share one partition key value, they hit one physical partition whose throughput is capped, so throttling occurs even though the table as a whole has spare capacity. Fixes: pick a more evenly distributed key, add a shard suffix to the key and read all shards, cache hot reads with DAX or ElastiCache, buffer writes through a queue or Kinesis and batch them, and use on-demand capacity for spiky patterns while still keeping the key design healthy.', ['Does on-demand mode remove the limit?', 'How do you detect it?']);
  qa('SQS vs SNS vs Kinesis vs EventBridge?', 'I', 'SQS is a work queue: one consumer per message, buffering and retries. SNS is pub/sub fan-out to many subscribers. Kinesis (or Kafka/MSK) is an ordered replayable log for high-throughput streams with multiple independent readers. EventBridge is a serverless event bus with rules and filtering for routing events between AWS services and SaaS. Pick by the semantics you need: buffering, fan-out, replay, or routing. Combine them, for example SNS to SQS.', ['When do you need FIFO?', 'How do you handle duplicates?']);
  qa('What are Lambda cold starts and how do you reduce them?', 'I', 'A cold start is the extra time to create a new execution environment, load the runtime and run initialisation code when no warm environment is available, for example the first call after idle or when scaling out. Reduce it with smaller packages, lazy initialisation, creating clients outside the handler, ARM, higher memory, Java SnapStart, provisioned concurrency for critical paths, or moving latency-sensitive steady workloads to containers.', ['Does provisioned concurrency cost money when idle?', 'What are the other Lambda limits?']);
  qa('Multi-AZ vs multi-region: what does each give you?', 'I', 'Multi-AZ protects against a data centre or AZ failure inside a region with automatic failover and typically zero data loss, at modest cost. Multi-region protects against a regional outage and can reduce latency for global users, but costs more, needs asynchronous replication (so possible data loss), and adds consistency and operational complexity. Most systems should be multi-AZ by default and add multi-region only for the business-critical ones with justified RTO and RPO.', ['What are the common DR strategies?', 'What does multi-AZ not protect?']);
  qa('Explain RTO and RPO and map them to DR strategies.', 'I', 'RPO is the maximum acceptable data loss measured in time; RTO is the maximum acceptable downtime. Backup and restore: hours for both and cheapest. Pilot light: data replicated, compute off, tens of minutes RTO and minutes RPO. Warm standby: a small always-running copy, minutes for both. Active-active: near-zero RTO and RPO with the highest cost and complexity. Choose the cheapest that meets both, test it, and tier by system importance.', ['How do you test DR without downtime?', 'What is the role of DNS TTL?']);
  qa('How do you keep an AWS bill under control?', 'I', 'Tag resources by team and environment, set budgets and anomaly alerts, and review Cost Explorer regularly. Right-size from metrics, buy Savings Plans or reservations for the steady baseline, use Spot for interruptible work, shut down non-production at night, add S3 lifecycle rules, use gateway endpoints and CDN to cut NAT and egress, and delete orphaned volumes and snapshots. Track unit cost (per order or per request) so growth is understood.', ['Which charges surprise teams?', 'When is serverless more expensive than servers?']);
  qa('Describe the S3 presigned URL upload pattern and its risks.', 'I', 'The client asks your API for permission; the API authenticates, chooses the key, and returns a presigned PUT (or POST) URL valid for a few minutes. The client uploads straight to S3, so your servers do not carry the bytes. Risks: URLs can be shared while valid, so keep expiry short, bind key and content type, use a content-length-range condition with presigned POST, block public access, set CORS narrowly, scan files after upload, and treat uploads as untrusted.', ['How do you handle multipart uploads?', 'How do you download privately?']);
  qa('Name the Well-Architected pillars and give a trade-off between two of them.', 'B', 'Operational Excellence, Security, Reliability, Performance Efficiency, Cost Optimization and Sustainability. Trade-off example: reliability versus cost, since multi-AZ and multi-region copies, extra NAT gateways and headroom capacity raise the bill, so you size reliability to the business impact. Another is security versus operational speed: tighter permissions and approvals slow delivery, so automate them.', ['How do you document these decisions?', 'What is a Well-Architected review?']);
  qa('When would you choose serverless, and when not?', 'A', 'Serverless fits spiky, event-driven, low-ops workloads: glue code, file processing, APIs with unpredictable traffic, scheduled jobs. It scales to zero and removes server management. Avoid or reconsider it for steady high-throughput workloads where per-request pricing exceeds the cost of containers, for strict low-latency paths where cold starts hurt, for long-running jobs beyond 15 minutes, for needs of special hardware or heavy local state, and when lock-in or hard-to-debug distributed behaviour outweighs savings. Compute the break-even with real numbers.', ['How do you limit blast radius with reserved concurrency?', 'How do you test serverless locally?']);

  registerModule({
    id: 'be14',
    title: 'Cloud Architecture (AWS Core)',
    intro: `<p>Almost every backend job today runs on a cloud, and interviews ask you to <b>draw it</b>: which AWS service for which job, how the network is split, who is allowed to do what, how it survives a failure, and what it costs. This module teaches the ten services that cover 90% of designs, using everyday analogies, runnable simulators (IAM evaluation, hot-partition detection, CIDR maths, cost estimates, DR choice) and step-by-step visualisers.</p>`,
    goals: [
      'Pick the right AWS service (EC2, S3, RDS, DynamoDB, SQS/SNS, Lambda, API Gateway) for a requirement and justify it',
      'Design a VPC with public and private subnets, route tables, NAT and security groups across two AZs',
      'Write a least-privilege IAM policy and predict allow or deny using explicit deny > allow > implicit deny',
      'Choose DynamoDB keys for an access pattern and spot or fix hot partitions',
      'Build an SQS + Lambda pipeline and an S3 presigned upload flow with retries, DLQ and idempotency',
      'Select a DR strategy from RTO/RPO, and estimate and reduce a monthly AWS bill with the Well-Architected pillars'
    ],
    prereqs: `Basic networking (IP, ports, HTTP/DNS), a database basics module (SQL vs NoSQL), and the earlier backend modules on APIs and messaging. No AWS account is needed; all code here uses placeholders and environment variables.`,
    hours: 14,
    topics: topics,
    quiz: quiz,
    interview: interview,
    practice: practice
  });
})();
