(function () { var topics = [], practice = [], quiz = [], interview = [];

// ---------- helpers ----------
// Scenario problem builder (weak answer vs strong answer).
function P(o) {
  return {
    title: o.t, level: o.l, tags: o.tags,
    statement: '<p>' + o.s + '</p>',
    constraints: o.c || 'Answer out loud in 2 to 3 minutes. Start with the first thing you would check, give your steps in order, and name the Azure service or setting at each step.',
    example: o.ex,
    brute: { why: '<p><b>Weak answer:</b> <i>&ldquo;' + o.weak + '&rdquo;</i></p><p><b>Why it fails:</b> ' + o.why + '</p>' },
    mcq: { q: o.q[0], options: o.q[1], answer: o.q[2], explain: o.q[3] },
    hints: ['<p>Hint 1: ' + o.h[0] + '</p>', '<p>Hint 2: ' + o.h[1] + '</p>', '<p>Hint 3: ' + o.h[2] + '</p>'],
    solution: { approach: o.a, code: o.code, complexity: o.cx, followUps: o.f }
  };
}

// Table that grows one row per frame, then a summary frame.
function rowViz(title, label, columns, rows, narrs, finalNarr, selRows) {
  return {
    title: title,
    gen: function () {
      var frames = [{ narr: narrs[0], parts: [{ type: 'table', label: label, columns: columns, rows: [] }] }];
      for (var i = 0; i < rows.length; i++) {
        var h = {}; h[i] = 'cur';
        frames.push({ narr: narrs[i + 1] || rows[i][0], parts: [{ type: 'table', label: label, columns: columns, rows: rows.slice(0, i + 1), hl: h }] });
      }
      var fh = {}; (selRows || []).forEach(function (r) { fh[r] = 'sel'; });
      frames.push({ narr: finalNarr, parts: [{ type: 'table', label: label, columns: columns, rows: rows.slice(), hl: fh }] });
      return frames;
    }
  };
}

// Box diagram that lights up one hop per frame.
function flowViz(title, label, height, nodes, edges, steps) {
  return {
    title: title,
    gen: function () {
      return steps.map(function (s) {
        var parts = [{ type: 'graph', label: label, directed: true, height: height, nodes: nodes, edges: edges, hl: s.hl || {}, ehl: s.ehl || {}, tags: s.tags || {} }];
        if (s.vars) parts.push({ type: 'vars', label: s.vl || 'What we know so far', vals: s.vars, hl: s.vh || {} });
        return { narr: s.n, parts: parts };
      });
    }
  };
}

// ---------- reference code ----------
var CS_FUNC = `// Isolated worker model: the function runs in its own .NET process.
public class ProcessOrder
{
    private readonly ILogger<ProcessOrder> _log;
    public ProcessOrder(ILogger<ProcessOrder> log) { _log = log; }

    // Trigger: a message lands on the "orders" queue.
    // Output binding: the return value is written to the "receipts" queue.
    [Function(nameof(ProcessOrder))]
    [QueueOutput("receipts")]
    public string Run([QueueTrigger("orders", Connection = "StorageConnection")] string message)
    {
        _log.LogInformation("Processing {Message}", message);
        return "done:" + message;      // throw instead, and the message is retried
    }

    // Timer trigger: six fields (second minute hour day month weekday) = every day at 02:00 UTC.
    [Function("NightlyCleanup")]
    public Task Cleanup([TimerTrigger("0 0 2 * * *")] TimerInfo timer) => Task.CompletedTask;
}`;

var JSON_HOST = `{
  "version": "2.0",
  "extensions": {
    "http": { "routePrefix": "api", "maxConcurrentRequests": 100 },
    "queues": { "batchSize": 8, "maxDequeueCount": 5 }
  },
  "logging": { "applicationInsights": { "samplingSettings": { "isEnabled": true } } }
}`;

var CS_DURABLE = `[Function("InvoiceBatchOrchestrator")]
public static async Task<string> Run([OrchestrationTrigger] TaskOrchestrationContext ctx)
{
    // Every await is a checkpoint. After a restart the orchestrator replays from history.
    string[] invoices = await ctx.CallActivityAsync<string[]>("ListInvoices", ctx.GetInput<string>());

    // Fan-out: start one activity per invoice. Fan-in: wait for all of them.
    var tasks = invoices.Select(i => ctx.CallActivityAsync<string>("CheckInvoice", i));
    string[] results = await Task.WhenAll(tasks);

    // Use ctx.CurrentUtcDateTime, never DateTime.UtcNow, inside an orchestrator.
    return await ctx.CallActivityAsync<string>("Summarise", results);
}`;

var CS_CACHE = `public async Task<ProductDto?> GetAsync(int id, CancellationToken ct)
{
    string key = $"product:{id}";

    // 1. Look in the cache first (IDistributedCache backed by Redis).
    string? cached = await _cache.GetStringAsync(key, ct);
    if (cached is not null) return JsonSerializer.Deserialize<ProductDto>(cached);

    // 2. Miss: read the database, then fill the cache with an expiry.
    ProductDto? dto = await _repo.GetAsync(id, ct);
    if (dto is not null)
        await _cache.SetStringAsync(key, JsonSerializer.Serialize(dto),
            new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5) }, ct);
    return dto;
}
// 3. On every write to the product: await _cache.RemoveAsync(key);`;

var CS_KV = `// No password anywhere: the app proves who it is with its managed identity.
builder.Configuration.AddAzureKeyVault(new Uri(vaultUri), new DefaultAzureCredential());

// Secrets now read like any other setting.
string apiKey = builder.Configuration["PaymentApiKey"];`;

var CS_OPENAI = `using Azure.AI.OpenAI;
using Azure.Identity;
using OpenAI.Chat;

// Endpoint + credential + deployment name. No API key in the app.
var client = new AzureOpenAIClient(new Uri(endpoint), new DefaultAzureCredential());
ChatClient chat = client.GetChatClient("chat-prod");          // the DEPLOYMENT name, not the model name

var messages = new List<ChatMessage>
{
    new SystemChatMessage("You turn a customer message into a JSON support ticket. Output JSON only."),
    new UserChatMessage(userText)
};

ChatCompletion result = await chat.CompleteChatAsync(messages,
    new ChatCompletionOptions { Temperature = 0.1f, MaxOutputTokenCount = 800 });
string text = result.Content[0].Text;

// Streaming: show words as they arrive.
await foreach (StreamingChatCompletionUpdate update in chat.CompleteChatStreamingAsync(messages))
    foreach (var part in update.ContentUpdate) Console.Write(part.Text);`;

var KQL = `// Slowest dependencies in the last hour
dependencies
| where timestamp > ago(1h)
| summarize p95 = percentile(duration, 95), calls = count() by target
| order by p95 desc

// Failed requests in the last hour, grouped by status code
requests
| where timestamp > ago(1h) and success == false
| summarize failures = count() by resultCode, name
| order by failures desc

// Everything that happened in one request, across services
union requests, dependencies, exceptions, traces
| where operation_Id == "<operation id from the failed request>"
| order by timestamp asc`;

var YAML_ADO = `trigger:
  branches: { include: [main] }
pr:
  branches: { include: [main] }

stages:
- stage: Build
  jobs:
  - job: Api
    pool: { vmImage: ubuntu-latest }
    steps:
    - task: UseDotNet@2
      inputs: { packageType: sdk, version: '10.x' }
    - script: dotnet build -c Release
      displayName: Build
    - script: dotnet test -c Release --no-build
      displayName: Unit tests
    - script: dotnet publish src/Api/Api.csproj -c Release -o $(Build.ArtifactStagingDirectory)/api
      displayName: Publish
    - publish: $(Build.ArtifactStagingDirectory)/api
      artifact: api                      # built ONCE, deployed to every environment

- stage: DeployTest
  dependsOn: Build
  jobs:
  - deployment: Test
    environment: test
    strategy:
      runOnce:
        deploy:
          steps:
          - task: AzureFunctionApp@2
            inputs: { azureSubscription: 'conn-test', appType: functionAppLinux, appName: 'func-shop-test', package: '$(Pipeline.Workspace)/api' }

- stage: DeployProd
  dependsOn: DeployTest
  jobs:
  - deployment: Prod
    environment: production              # the manual approval is configured on this environment
    strategy:
      runOnce:
        deploy:
          steps:
          - task: AzureFunctionApp@2
            inputs: { azureSubscription: 'conn-prod', appType: functionAppLinux, appName: 'func-shop-prod', package: '$(Pipeline.Workspace)/api', deployToSlotOrASE: true, slotName: staging }
          - script: curl --fail "$(stagingHealthUrl)"
            displayName: Smoke test the staging slot
          - task: AzureAppServiceManage@0
            inputs: { azureSubscription: 'conn-prod', Action: 'Swap Slots', WebAppName: 'func-shop-prod', SourceSlot: staging }`;

// "@@" stands for a dollar sign so the GitHub expression syntax can be written safely here.
var YAML_GHA = `name: release-shop
on:
  release:
    types: [published]

jobs:
  gate:
    runs-on: ubuntu-latest
    outputs:
      deploy_test: @@{{ steps.g.outputs.test }}
      deploy_prod: @@{{ steps.g.outputs.prod }}
    steps:
      - id: g
        env:
          TAG: @@{{ github.event.release.tag_name }}
        run: |
          [[ "$TAG" == shop-v* ]] && echo "test=true" >> "$GITHUB_OUTPUT"
          [[ "$TAG" == shop-v*-final ]] && echo "prod=true" >> "$GITHUB_OUTPUT"
          exit 0

  deploy-test:
    needs: gate
    if: needs.gate.outputs.deploy_test == 'true'
    uses: ./.github/workflows/deploy-shop.yaml     # reusable workflow
    with: { environment: test }
    secrets: inherit

  deploy-prod:
    needs: [gate, deploy-test]
    if: needs.gate.outputs.deploy_prod == 'true'
    uses: ./.github/workflows/deploy-shop.yaml
    with: { environment: prod }                    # the prod environment requires a reviewer
    secrets: inherit`.replace(/@@/g, '$');

var YAML_OIDC = `# deploy-shop.yaml (reusable)
on:
  workflow_call:
    inputs:
      environment: { type: string, required: true }

jobs:
  build-deploy:
    runs-on: ubuntu-latest
    environment: @@{{ inputs.environment }}
    permissions:
      id-token: write        # lets the job ask GitHub for a short-lived OIDC token
      contents: read
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-dotnet@v4
        with: { dotnet-version: '10.0.x' }
      - run: dotnet test -c Release
      - run: dotnet publish src/Shop.Api -c Release -o out/api
      - uses: azure/login@v2   # swaps the OIDC token for an Azure token. No stored password.
        with:
          client-id: @@{{ vars.AZURE_CLIENT_ID }}
          tenant-id: @@{{ vars.AZURE_TENANT_ID }}
          subscription-id: @@{{ vars.AZURE_SUBSCRIPTION_ID }}
      - uses: Azure/functions-action@v1
        with: { app-name: @@{{ vars.FUNCTION_APP }}, package: out/api }`.replace(/@@/g, '$');

var BICEP = `param location string = resourceGroup().location
param env string                                   // 'test' or 'prod'

resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: format('stshop{0}', env)
  location: location
  sku: { name: 'Standard_ZRS' }
  kind: 'StorageV2'
}

resource plan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: format('plan-shop-{0}', env)
  location: location
  sku: { name: 'EP1', tier: 'ElasticPremium' }
  kind: 'elastic'
}

resource func 'Microsoft.Web/sites@2023-12-01' = {
  name: format('func-shop-{0}', env)
  location: location
  kind: 'functionapp'
  identity: { type: 'SystemAssigned' }             // managed identity, no stored secret
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    siteConfig: {
      appSettings: [ { name: 'AzureWebJobsStorage__accountName', value: storage.name } ]
    }
  }
}`;

var DOCKER = `# Stage 1: build with the full SDK image
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY . .
RUN dotnet publish src/Api/Api.csproj -c Release -o /app

# Stage 2: run on the small runtime image, as a non-root user
FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app .
USER app
ENTRYPOINT ["dotnet", "Api.dll"]`;

var JSON_SWA = `{
  "navigationFallback": { "rewrite": "/index.html", "exclude": ["/assets/*", "/api/*"] },
  "routes": [ { "route": "/admin/*", "allowedRoles": ["admin"] } ],
  "globalHeaders": {
    "Content-Security-Policy": "default-src 'self'",
    "X-Content-Type-Options": "nosniff"
  }
}`;

// ================= TOPIC 1 =================
topics.push({
  title: 'Azure Fundamentals and Choosing Where Code Runs',
  analogy: `<p>Think of Azure as a very large <b>office park</b>. Your company has one <b>staff register</b> that says who works there (the tenant). The company rents several <b>buildings</b>, and each building gets its own bill (subscriptions). Inside a building, each project has its own <b>room</b> (resource group), and the desks and machines in the room are the <b>resources</b>. A key card given at the building door also opens every room inside it. That is how access flows down in Azure.</p>`,
  explain: `<p><b>The plain idea:</b> everything you create in Azure sits in a 5-level tree, and rules set high in the tree flow down to everything below.</p>
    <ul>
      <li><b>Tenant</b>: one Microsoft Entra ID directory (the new name for Azure Active Directory). It holds users, groups and app identities.</li>
      <li><b>Management group</b>: a folder of subscriptions, used to apply policy and access to many at once.</li>
      <li><b>Subscription</b>: the billing boundary, and also a boundary for quotas and access.</li>
      <li><b>Resource group</b>: a container for resources that live and die together, such as one app in one environment.</li>
      <li><b>Resource</b>: the actual thing, such as a Function App, a storage account or a Key Vault.</li>
    </ul>
    <p>A <b>region</b> is a set of datacentres in one area of the world. An <b>availability zone</b> is a physically separate datacentre group inside a region, with its own power and cooling.</p>
    <p>The second half of this topic is the question every tech lead gets: <b>where should this code run?</b> The honest answer is a short decision list:</p>
    ${H.table(['You need', 'Pick', 'Why'], [
      ['A normal web app or API', 'App Service', 'Managed web hosting with slots and autoscale'],
      ['Code that reacts to events, with quiet periods', 'Azure Functions', 'Scales with load, can scale to zero'],
      ['A React or Angular front end', 'Static Web Apps', 'Global hosting plus pull request previews'],
      ['Containers without running Kubernetes', 'Container Apps', 'Scaling and revisions are handled for you'],
      ['Full Kubernetes control', 'AKS', 'Most power, most work'],
      ['An old app that needs its own operating system', 'Virtual Machines', 'You manage everything']
    ])}
    <p>The rule of thumb: <b>pick the most managed service that meets the need</b>. Every step towards more control is also a step towards more patching, more on-call and more cost.</p>`,
  clues: ['"How is Azure organised?" or "explain the resource hierarchy"', '"What is the difference between a subscription and a resource group?"', '"IaaS vs PaaS vs serverless: give an Azure example of each"', '"Why did you choose Functions and not App Service?"', '"Which pillar of the Well-Architected Framework does this decision serve?"', '"What happens to your app if one datacentre goes down?"', '"Who can delete this resource, and how do you control that?"'],
  viz: [
    flowViz('From tenant to resource: where access and policy flow', 'The Azure hierarchy', 64,
      [
        { id: 'T', label: 'Entra tenant', x: 10, y: 12, shape: 'box' },
        { id: 'MG', label: 'Management group', x: 32, y: 12, shape: 'box', w: 20 },
        { id: 'SP', label: 'Subscription: prod', x: 56, y: 12, shape: 'box', w: 20 },
        { id: 'ST', label: 'Subscription: test', x: 56, y: 50, shape: 'box', w: 20 },
        { id: 'RG', label: 'Resource group: shop', x: 80, y: 12, shape: 'box', w: 22 },
        { id: 'F', label: 'Function App', x: 72, y: 34, shape: 'box' },
        { id: 'KV', label: 'Key Vault', x: 90, y: 34, shape: 'box' }
      ],
      [['T', 'MG'], ['MG', 'SP'], ['MG', 'ST'], ['SP', 'RG'], ['RG', 'F'], ['RG', 'KV']],
      [
        { n: 'Start at the top. The <b>tenant</b> is the identity boundary: every user, group and app identity lives in one Microsoft Entra ID directory.', hl: { T: 'cur' } },
        { n: 'A <b>management group</b> is a folder of subscriptions. A policy placed here, such as "only these regions are allowed", applies to everything below.', hl: { MG: 'cur' }, ehl: { 'T-MG': 'ok' }, tags: { MG: 'policy: allowed regions' } },
        { n: 'A <b>subscription</b> is where the bill goes. Many teams use one subscription for production and another for test, so a mistake in test cannot touch production.', hl: { SP: 'cur', ST: 'win' }, ehl: { 'MG-SP': 'ok', 'MG-ST': 'ok' }, tags: { SP: 'bill + quota' } },
        { n: 'A <b>resource group</b> holds resources with the same life cycle. Delete the group and everything in it goes, so one app per group is a good default.', hl: { RG: 'cur' }, ehl: { 'SP-RG': 'ok' } },
        { n: 'The <b>resources</b> are the real things: here a Function App and a Key Vault.', hl: { F: 'ok', KV: 'ok' }, ehl: { 'RG-F': 'ok', 'RG-KV': 'ok' } },
        { n: 'Now give a developer the <b>Reader</b> role on the resource group. The role is <b>inherited</b> by both resources inside it. You did not assign anything on the Function App or the vault.', hl: { RG: 'sel', F: 'sel', KV: 'sel' }, tags: { RG: 'Reader assigned here', F: 'inherited', KV: 'inherited' } },
        { n: 'Careful: Reader on the vault lets them <i>see the vault exists</i>. Reading a secret value is a <b>data action</b> and needs a data role such as Key Vault Secrets User. Interviewers love this difference.', hl: { KV: 'bad' }, tags: { KV: 'secret values: still denied' } },
        { n: 'Summary: identity at the tenant, policy at the management group, billing at the subscription, life cycle at the resource group. Assign access at the <b>lowest level that works</b>.', hl: { T: 'done', MG: 'done', SP: 'done', RG: 'ok' } }
      ]),
    rowViz('IaaS, PaaS, serverless, SaaS: who manages what', 'Service models in Azure terms',
      ['Model', 'You manage', 'Azure manages', 'Azure example'],
      [
        ['IaaS', 'OS, patches, runtime, app, data', 'Hardware, network, virtualisation', 'Virtual Machines'],
        ['PaaS', 'App and data', 'OS, patches, runtime', 'App Service, Azure SQL, Container Apps'],
        ['Serverless', 'Only your code', 'Everything else, including scaling', 'Azure Functions, Logic Apps'],
        ['SaaS', 'Only your settings and users', 'The whole product', 'Microsoft 365']
      ],
      ['Four service models. Each row hands more work to Azure and leaves less to you.',
        '<b>IaaS</b>: you rent a machine. You patch it, secure it and scale it.',
        '<b>PaaS</b>: you bring an app. The platform keeps the operating system and runtime healthy.',
        '<b>Serverless</b>: you bring a function. It runs when something happens and you pay for what ran.',
        '<b>SaaS</b>: you just use the finished product.'],
      'Moving down the table means less control and less work. A tech lead picks the lowest row that still meets the need.', [1, 2])
  ],
  examples: [
    { title: 'One subscription or two?', html: `<p>A team runs test and production in the same subscription and the same resource group. One person with Contributor can delete production by accident.</p><p><b>Better:</b> one resource group per app per environment at least, and for anything serious a separate subscription for production. Then the production role assignments, budgets and policies are separate from test, and a quota used up in test does not block production.</p>` },
    { title: 'Reading a compute question for clues', html: `<p>"We receive about 200 invoices a night and each needs 20 seconds of work." The words <i>a night</i> and <i>each</i> tell you the load is in bursts and the work is per item. That points to a queue plus <b>Azure Functions</b>, which can sit at zero during the day.</p><p>"We serve a steady 300 requests a second all day." Steady load points to <b>App Service</b> or <b>Container Apps</b> with a fixed number of instances, which is cheaper than paying per execution.</p>` },
    { title: 'Using the 5 pillars as a checklist', html: `<p>When asked to review any design, walk the Well-Architected pillars out loud:</p>${H.table(['Pillar', 'One question to ask'], [['Reliability', 'What happens when one zone or one dependency fails?'], ['Security', 'Where are the secrets, and who can read them?'], ['Cost optimisation', 'What does this cost at 10 times the load, and at zero load?'], ['Operational excellence', 'Can we rebuild it from code and see when it breaks?'], ['Performance efficiency', 'Where is the slowest hop, and can it be cached or made async?']])}` }
  ],
  deepDive: `<p><b>Control plane and data plane.</b> Azure Resource Manager (ARM) is the single front door for managing resources. The portal, the CLI, Bicep and Terraform all call it. Creating a storage account is a control plane action. Reading a blob inside it is a data plane action and goes to the storage service directly. The two are secured separately, which is why the built-in <b>Contributor</b> role can create a Key Vault but cannot read a secret from one that uses role-based access.</p>
    <p><b>Role assignment = who + what + where.</b> A security principal (user, group, service principal or managed identity), a role definition (a list of allowed actions) and a scope. Assignments add up, and a deny assignment or an Azure Policy can still block the action. Prefer groups over single users and assign at the resource group, not the subscription.</p>
    <p><b>Zones and pairs.</b> Zone-redundant services keep working when one datacentre group fails. Many regions also have a <b>paired region</b> used for geo-redundant storage and staged platform updates, but newer regions may have zones and no pair, so check the region you plan to use.</p>
    <p><b>Limits are per subscription and per region.</b> Core quotas, the number of storage accounts and model quotas for Azure OpenAI can all block a deployment that worked in test. Ask for quota increases before launch day.</p>`,
  aiEra: `<p><b>What AI changes:</b> an assistant can draft a Bicep file, an <code>az</code> command or a compute comparison in seconds, so interviewers spend less time on syntax and more on <i>why</i> you chose a service.</p>
    <p><b>Use AI as a partner:</b> ask it <code>List the trade-offs between Container Apps and App Service for a .NET API with 3 background workers</code>, then check each claim against the current Microsoft documentation.</p>
    <p><b>Where AI goes wrong:</b> Azure names and limits change quickly. Models often still say "Azure Active Directory", recommend the old Consumption plan, or quote limits that have moved. They also invent role names.</p>
    <p><b>What you must still own:</b> the decision, the cost, and the blast radius. Nobody can hand accountability for a production subscription to a chat window.</p>`,
  problems: [P({
    t: 'Pick the compute for three workloads', l: 'Easy', tags: ['compute', 'fundamentals'],
    s: 'An online shop has 3 workloads: (1) a public REST API with steady traffic all day, (2) a job that resizes product photos whenever a seller uploads one, and (3) a React admin site. The interviewer asks: which Azure compute service would you choose for each, and why?',
    ex: '<p><b>Workload 2 in detail:</b> uploads come in bursts. Some hours have 0 uploads, others have 2,000. Each resize takes about 3 seconds.</p><p>The phrase to notice is <span class="c-g">"whenever a seller uploads"</span>: this is an event, not a request from a waiting user.</p>',
    weak: 'I would put all three on one virtual machine because it is simple and we control everything.',
    why: 'One machine means you patch the operating system, you pay for it all night, the photo job can starve the API of CPU, and one failure takes down all three. It also shows the interviewer that you did not read the load pattern in the question.',
    q: ['Which wording most strongly suggests Azure Functions?', ['"steady traffic all day"', '"whenever a seller uploads one"', '"a React admin site"', '"a public REST API"'], 1, 'An upload is an event with bursts and quiet hours. Functions run on a trigger and can scale to zero between bursts.'],
    h: ['Sort each workload by its load pattern: steady, bursty, or static files.', 'Steady HTTP suits an always-on web host. Event-driven work suits a function with a trigger. Static files suit a content delivery network.', 'For each choice say one reason and one risk. Example recipe: service, reason, how it scales, what you would watch.'],
    a: '<p><b>API:</b> App Service (or Container Apps if the team already ships containers). The load is steady, so always-on instances with autoscale rules are cheaper and more predictable than paying per execution. Deployment slots give a safe release and a fast rollback.</p><p><b>Photo resize:</b> Azure Functions with a Blob or Event Grid trigger, on the Flex Consumption plan. It scales out during a burst and back to zero when nothing is uploaded. I would make the handler idempotent, because the same event can arrive twice.</p><p><b>Admin site:</b> Static Web Apps. The built files are served from edge locations, each pull request gets a preview site, and a navigation fallback handles client-side routes.</p><p><b>What I would watch:</b> the resize function must not open more database connections than the database allows, so I would cap its concurrency.</p>',
    cx: '<p>Cost shape: the API is a fixed monthly cost, the function is pay-per-use, the static site is close to free. Risk to mention: cold start on the function is fine here because no user is waiting.</p>',
    f: ['What changes if the resize takes 20 minutes per photo?', 'When would you move the API to Container Apps?']
  })]
});

// ================= TOPIC 2 =================
topics.push({
  title: 'Azure Functions in Depth: Triggers, Plans, Scaling and Reliability',
  analogy: `<p>A function is like a <b>motion-sensor light</b>. It does nothing and costs nothing until something happens. When someone walks past (the <b>trigger</b>), it switches on, does its job and switches off. If a whole crowd walks past, more lights come on. A <b>binding</b> is like the wiring already fitted in the wall: you plug in and it works, you do not run your own cable each time.</p>`,
  explain: `<p><b>The plain idea:</b> Azure Functions runs a small piece of your code when an event happens. You do not manage a server. The platform adds instances when there is more work and removes them when there is less.</p>
    <ul>
      <li>A <b>trigger</b> is what starts the function. Each function has exactly one: an HTTP request, a timer, a queue message, a new blob, an event.</li>
      <li>A <b>binding</b> connects the function to data without client code. An input binding hands you data. An output binding writes whatever you return.</li>
      <li>The <b>hosting plan</b> decides how it scales and what it costs.</li>
    </ul>
    ${H.table(['Plan', 'Scales', 'Cold start', 'Choose it when'], [
      ['Flex Consumption', 'Fast, per function, down to zero', 'Reduced with "always ready" instances', 'New serverless apps (the recommended default)'],
      ['Consumption (older)', 'Down to zero', 'Yes', 'Existing apps only; plan a move to Flex'],
      ['Premium', 'Pre-warmed instances', 'None on warm instances', 'Steady low latency, long runs, Windows or containers'],
      ['Dedicated (App Service plan)', 'Manual or autoscale rules', 'None with Always On', 'You already pay for a plan with spare room']
    ])}
    <p><b>Two facts to state with confidence in 2026:</b></p>
    <ul>
      <li>.NET functions should use the <b>isolated worker model</b>: your code runs in its own process with normal dependency injection and middleware. Support for the old in-process model ended on 10 November 2026.</li>
      <li>.NET 8 and .NET 9 reached end of support on the same day, so new work targets <b>.NET 10</b>, the current long-term support release.</li>
    </ul>
    <p><b>Three ideas explain most Functions questions:</b> instances are <b>stateless</b> (keep nothing in memory you cannot lose), messages are delivered <b>at least once</b> (so handlers must be safe to run twice), and <b>the thing you call</b> usually breaks before the function does (so cap concurrency).</p>`,
  clues: ['"What are triggers and bindings?"', '"Which hosting plan did you use, and why?"', '"How do you deal with cold start?"', '"What happens when a queue-triggered function throws?"', '"Your function scaled out and took the database down. What now?"', '"When would you use Durable Functions?"', '"How is your Function App secured?" or "is that endpoint anonymous?"', '"In-process or isolated worker?"'],
  code: [{ lang: 'csharp', check: false, code: CS_FUNC }, { lang: 'json', code: JSON_HOST }, { lang: 'csharp', check: false, code: CS_DURABLE }],
  codeTitle: ['Queue trigger with an output binding, plus a timer (isolated worker)', 'host.json: limit how much work one instance takes', 'Durable Functions: fan-out and fan-in'],
  viz: {
    title: 'A queue message that keeps failing: retries, then the poison queue',
    input: 'fail fail ok',
    inputLabel: 'Result of each attempt (fail or ok, space separated, up to 8). maxDequeueCount is 5',
    gen: function (input) {
      var tries = String(input || '').trim().toLowerCase().split(/[\s,]+/).filter(Boolean);
      if (!tries.length || tries.length > 8 || tries.some(function (t) { return t !== 'fail' && t !== 'ok'; })) throw new Error('Type 1 to 8 words, each "fail" or "ok", for example: fail fail ok');
      var MAX = 5;
      var nodes = [
        { id: 'P', label: 'Checkout API', x: 10, y: 15, shape: 'box' },
        { id: 'Q', label: 'orders queue', x: 36, y: 15, shape: 'box' },
        { id: 'F', label: 'Function', x: 62, y: 15, shape: 'box' },
        { id: 'D', label: 'Database', x: 88, y: 15, shape: 'box' },
        { id: 'X', label: 'orders-poison', x: 36, y: 46, shape: 'box' }
      ];
      var edges = [['P', 'Q', 'send'], ['Q', 'F', 'trigger'], ['F', 'D', 'save'], ['Q', 'X', 'give up']];
      var g = function (hl, ehl, tags) { return { type: 'graph', label: 'Order processing', directed: true, height: 60, nodes: nodes, edges: edges, hl: hl, ehl: ehl, tags: tags || {} }; };
      var frames = [];
      frames.push({ narr: 'The checkout API puts one message on the <b>orders</b> queue and returns to the user straight away. The slow work happens later.', parts: [g({ P: 'cur', Q: 'ok' }, { 'P-Q': 'ok' }), { type: 'vars', label: 'Message state', vals: { dequeueCount: 0, maxDequeueCount: MAX, status: 'waiting' } }] });
      var count = 0, done = false;
      for (var i = 0; i < tries.length && !done; i++) {
        count++;
        frames.push({ narr: 'Attempt <b>' + count + '</b>: the queue trigger hands the message to the function. The message is hidden from other instances while it is being processed.', parts: [g({ Q: 'win', F: 'cur' }, { 'Q-F': 'ok' }), { type: 'vars', label: 'Message state', vals: { dequeueCount: count, maxDequeueCount: MAX, status: 'processing' }, hl: { dequeueCount: 'cur' } }] });
        if (tries[i] === 'ok') {
          frames.push({ narr: '<span class="c-g">The function finishes without an exception.</span> The runtime deletes the message. If this was attempt 2 or later, the save may have partly run before, so the handler must be <b>idempotent</b> (safe to run twice).', parts: [g({ F: 'ok', D: 'ok' }, { 'F-D': 'ok' }), { type: 'vars', label: 'Message state', vals: { dequeueCount: count, maxDequeueCount: MAX, status: 'done, message deleted' }, hl: { status: 'ok' } }] });
          done = true;
        } else if (count >= MAX) {
          frames.push({ narr: '<span class="c-r">The function throws again and dequeueCount has reached ' + MAX + '.</span> The runtime stops retrying and moves the message to <b>orders-poison</b>. Nothing is lost, but someone must look at it, so put an alert on that queue.', parts: [g({ F: 'bad', X: 'bad' }, { 'Q-X': 'bad' }, { X: 'alert here' }), { type: 'vars', label: 'Message state', vals: { dequeueCount: count, maxDequeueCount: MAX, status: 'moved to poison queue' }, hl: { status: 'bad' } }] });
          done = true;
        } else {
          frames.push({ narr: '<span class="c-r">The function throws.</span> The message is not deleted. It becomes visible again and will be retried. ' + (MAX - count) + ' attempt(s) left.', parts: [g({ F: 'bad', Q: 'cur' }, { 'F-D': 'bad' }), { type: 'vars', label: 'Message state', vals: { dequeueCount: count, maxDequeueCount: MAX, status: 'back on the queue' }, hl: { status: 'bad' } }] });
        }
      }
      if (!done) frames.push({ narr: 'You ran out of attempts in the input. The message is still on the queue and the next attempt would be number ' + (count + 1) + '.', parts: [g({ Q: 'cur' }, {}), { type: 'vars', label: 'Message state', vals: { dequeueCount: count, maxDequeueCount: MAX, status: 'waiting for retry' } }] });
      frames.push({ narr: 'What to say: <b>at-least-once delivery</b>, so make the handler idempotent; a <b>retry limit</b>, so bad messages cannot loop forever; and an <b>alert on the poison queue</b>, so failures are seen. Try the input <code>fail fail fail fail fail</code>.', parts: [g({ Q: 'done', F: 'done', D: 'done', X: 'sel' }, {}), { type: 'table', label: 'Three habits', columns: ['Habit', 'Why'], rows: [['Idempotent handler', 'The same message can arrive twice'], ['maxDequeueCount', 'Stops endless retries'], ['Alert on poison queue', 'Someone has to notice']] }] });
      return frames;
    }
  },
  examples: [
    { title: 'Cold start: what it is and 5 ways to shrink it', html: `<p>A cold start is the wait while the platform starts a fresh instance and loads your app because none was warm.</p><ol><li>Use Flex Consumption "always ready" instances or the Premium plan for user-facing HTTP.</li><li>Keep the deployment package small and remove unused packages.</li><li>Create heavy clients lazily, on first use, not at startup.</li><li>Register <code>HttpClient</code> and SDK clients once through dependency injection and reuse them.</li><li>Publish with ReadyToRun so less code is compiled at startup.</li></ol><p>If no user is waiting (a queue or timer), a cold start usually does not matter. Say that too.</p>` },
    { title: 'The function scaled out and the database fell over', html: `<p>A queue receives 50,000 messages. The platform adds 40 instances. Each takes 16 messages at once, and each message opens a database connection. That is 640 connections against a database that allows 300.</p><p><b>Fix:</b> lower <code>batchSize</code> in host.json, cap the maximum instance count on the plan, reuse one pooled client per instance, and add retry with backoff for throttling errors. The lesson: <b>scale the function to what the weakest dependency can take</b>.</p>`, code: { lang: 'json', code: JSON_HOST } },
    { title: 'Securing an HTTP function in layers', html: `<ol><li><b>Who is calling:</b> validate a Microsoft Entra ID token in middleware, or turn on built-in authentication, or put API Management in front. A function key is a shared password, not an identity.</li><li><b>Secrets:</b> Key Vault references in app settings, read with a managed identity.</li><li><b>Network:</b> access restrictions or a private endpoint so only the gateway can reach the app; virtual network integration for outbound calls.</li><li><b>Transport:</b> HTTPS only, a modern minimum TLS version, and CORS limited to your own front end.</li><li><b>Least privilege:</b> the identity gets only the roles it needs.</li></ol>` },
    { title: 'Local development in 4 commands', html: `<p>The Azure Functions Core Tools run the same runtime on your machine. Azurite emulates Blob, Queue and Table storage locally.</p>`, code: { lang: 'bash', check: false, code: `func init ShopApi --worker-runtime dotnet-isolated --target-framework net10.0
func new --name GetOrder --template "HTTP trigger"
func start                                    # runs locally on port 7071 (start Azurite first)
func azure functionapp publish func-shop-test # quick manual deploy; a pipeline is better for real releases` } }
  ],
  deepDive: `<p><b>How scaling really works.</b> A component called the scale controller watches each trigger: HTTP concurrency, queue length, event backlog. It adds or removes instances from those signals. On Flex Consumption, HTTP functions scale together and most other triggers scale on their own, so a busy queue does not steal instances from the API.</p>
    <p><b>Timeouts.</b> An HTTP-triggered function must answer within about 230 seconds because of the load balancer in front, whatever the plan timeout says. For longer work return <code>202 Accepted</code> with a status address and do the work in the background, which is exactly the Durable Functions "async HTTP API" pattern.</p>
    <p><b>Durable Functions replay.</b> The orchestrator does not stay in memory while it waits. Each <code>await</code> saves progress to a history store. When an activity finishes, the orchestrator code runs again <i>from the top</i> and the history supplies results for steps that already ran. That is why orchestrator code must be deterministic: no current time, no random numbers, no direct network or database calls. Put those in activities.</p>
    <p><b>Retries differ by trigger.</b> Storage queues retry up to <code>maxDequeueCount</code> and then use a poison queue. Service Bus uses its max delivery count and a dead-letter queue. Timer and Event Hubs triggers can use retry policies in code or attributes. HTTP has no automatic retry: the caller decides.</p>
    <p><b>The storage account matters.</b> The host uses the <code>AzureWebJobsStorage</code> connection for timer locks, trigger state and keys. Losing access to it stops the app, so connect to it with a managed identity and keep it close to the app.</p>`,
  aiEra: `<p><b>What AI changes:</b> an assistant writes a trigger, a binding and a host.json in one go, so the typing is no longer the skill. The skill is knowing what happens on the 6th failed delivery.</p>
    <p><b>Use AI as a partner:</b> paste a function and ask <code>What happens if this handler runs twice for the same message? List every side effect</code>. It is good at spotting non-idempotent writes.</p>
    <p><b>Where AI goes wrong:</b> it still generates the in-process model (<code>[FunctionName]</code> and static classes) because most older samples use it. It also calls the current time inside orchestrators and creates a new <code>HttpClient</code> per call.</p>
    <p><b>What you must still own:</b> the plan choice, the concurrency limits, and the failure path. Functions are also a common host for AI features, so expect questions about calling a model from a function without holding a request open for minutes.</p>`,
  problems: [P({
    t: 'Orders are processed twice', l: 'Medium', tags: ['functions', 'reliability', 'idempotency'],
    s: 'A queue-triggered function charges a customer and then saves the order. Support reports that a few customers were charged twice last night. The logs show a database timeout at the same time. Explain what happened and how you would fix it.',
    ex: '<p><b>Timeline for one message:</b></p>' + H.table(['Step', 'Result'], [['Attempt 1: charge card', '<span class="c-g">success</span>'], ['Attempt 1: save order', '<span class="c-r">database timeout, exception</span>'], ['Message returns to the queue', 'dequeueCount = 1'], ['Attempt 2: charge card', '<span class="c-r">success again = double charge</span>']]),
    weak: 'I would wrap the code in a try-catch so the exception does not happen and the message is not retried.',
    why: 'Swallowing the exception hides the failure: the customer is charged and no order is saved, and nobody is told. Retries are a feature. The real problem is that running the handler twice is not safe.',
    q: ['Why did the second charge happen?', ['The queue lost the message', 'The function threw after the charge, so the whole message was retried', 'Two customers had the same order number', 'The timer trigger fired twice'], 1, 'Queue triggers give at-least-once delivery. An exception after a side effect means the side effect runs again on retry.'],
    h: ['The queue did its job. Ask what "at least once" means for a step that has side effects.', 'Give each order a unique key and let the payment provider or your own table reject a repeat of that key.', 'Recipe: check "already done?" first, do the step, record that it is done, then let the poison queue and an alert handle the ones that still fail.'],
    a: '<p><b>What happened:</b> the charge succeeded, then the save failed with a timeout. The function threw, so the runtime put the message back and ran the whole handler again. Delivery is at least once, so the charge ran twice.</p><p><b>Fix, in order:</b></p><ol><li>Send an <b>idempotency key</b> (the order id) with the charge, so the payment provider returns the first result for a repeat.</li><li>Record progress per order ("charged", "saved") and check it at the start of the handler.</li><li>Keep the exception, so real failures still retry, and add a retry with backoff around the database call for short timeouts.</li><li>Alert on the poison queue and write a small tool to replay messages from it.</li></ol><p>If the workflow grows to several steps, I would move it to Durable Functions so each step is checkpointed.</p>',
    cx: '<p>Trade-off: one extra lookup per message to check state. That cost is tiny next to a double charge and a refund.</p>',
    f: ['How would you refund the customers already affected?', 'Would the Service Bus duplicate detection feature solve this on its own?']
  })]
});

// ================= TOPIC 3 =================
topics.push({
  title: 'Storage, Messaging, Secrets and Network Security',
  analogy: `<p>Picture a <b>hotel</b>. Luggage goes to the store room (Blob Storage). Notes for staff go in a tray at the front desk and are handled one by one (a queue). Valuables go in the <b>safe</b> (Key Vault). Staff do not carry a copy of the safe key in their pocket. They show their <b>staff badge</b>, which the hotel issues and renews (a managed identity), and the safe opens only for the boxes that badge is allowed to open.</p>`,
  explain: `<p><b>The plain idea:</b> most Azure apps are a small amount of compute surrounded by managed services for data, messages and secrets. Tech lead questions here are almost always "which one, and why?".</p>
    <p><b>Where data goes:</b></p>
    ${H.table(['Service', 'Stores', 'Use it for'], [
      ['Blob Storage', 'Files (objects)', 'Documents, images, backups'],
      ['Table Storage', 'Simple key and value rows', 'Cheap lookups, job state'],
      ['Azure SQL Database', 'Relational tables', 'Transactions, joins, reporting'],
      ['Cosmos DB', 'JSON documents, spread across regions', 'Low latency at global scale, flexible shape'],
      ['Redis', 'Values in memory', 'Caching, sessions, rate limits'],
      ['Azure AI Search', 'A search index (keyword and vector)', 'Full-text search, retrieval for AI answers']
    ])}
    <p><b>How services talk without waiting for each other:</b></p>
    ${H.table(['Service', 'Think of it as', 'Choose when'], [
      ['Storage Queue', 'A simple to-do list', 'Cheap, basic background work'],
      ['Service Bus', 'A reliable post office', 'Business messages that must not be lost; ordering; dead-lettering'],
      ['Event Grid', 'A doorbell', '"Something happened", tell whoever is interested'],
      ['Event Hubs', 'A firehose', 'Millions of telemetry or log events as a stream']
    ])}
    <p><b>Secrets and identity:</b></p>
    <ul>
      <li><b>Key Vault</b> stores secrets, keys and certificates, and logs who read them.</li>
      <li>A <b>managed identity</b> is an identity that Azure creates and rotates for your app, so the app holds no password at all.</li>
      <li><b>App Configuration</b> holds ordinary settings and feature flags. Secrets stay in Key Vault and are only referenced.</li>
    </ul>
    <p><b>Network:</b> a <b>private endpoint</b> gives a managed service a private address inside your virtual network, so the database or vault is not reachable from the internet at all.</p>`,
  clues: ['"Service Bus or Event Grid or Event Hubs?"', '"Where do you keep connection strings and API keys?"', '"What is a managed identity? System-assigned or user-assigned?"', '"How does your app authenticate to the database without a password?"', '"What is a SAS token?"', '"How do you stop the database being reachable from the internet?"', '"What is cache-aside, and what goes wrong with caches?"', '"What does API Management give you?"'],
  code: [{ lang: 'csharp', check: false, code: CS_KV }, { lang: 'csharp', check: false, code: CS_CACHE }],
  codeTitle: ['Key Vault through a managed identity: no secret in the app', 'Cache-aside with Redis'],
  viz: flowViz('How an app reads a secret with no password of its own', 'Managed identity and Key Vault', 62,
    [
      { id: 'A', label: 'Function App', x: 12, y: 14, shape: 'box' },
      { id: 'E', label: 'Entra ID', x: 50, y: 14, shape: 'box' },
      { id: 'K', label: 'Key Vault', x: 50, y: 48, shape: 'box' },
      { id: 'R', label: 'RBAC check', x: 86, y: 48, shape: 'box' },
      { id: 'S', label: 'Payment API', x: 12, y: 48, shape: 'box' }
    ],
    [['A', 'E', 'ask for token'], ['E', 'A', 'token'], ['A', 'K', 'get secret + token'], ['K', 'R', 'allowed?'], ['A', 'S', 'call with key']],
    [
      { n: 'The Function App needs the API key for a payment provider. Old way: paste the key into app settings. Then it sits in the portal, in pipeline logs and in people\'s notes.', hl: { A: 'cur' }, vars: { 'secret stored in the app': 'none', 'identity': 'system-assigned managed identity' } },
      { n: 'New way, step 1: the app asks the platform for a token for its <b>managed identity</b>. In code this is one line: <code>new DefaultAzureCredential()</code>. No password is involved.', hl: { A: 'cur', E: 'win' }, ehl: { 'A-E': 'ok' }, vars: { 'secret stored in the app': 'none', 'asking for': 'token for Key Vault' } },
      { n: 'Step 2: Microsoft Entra ID returns a <b>short-lived access token</b>. Azure renews it for you, so there is nothing to rotate by hand.', hl: { E: 'ok', A: 'ok' }, ehl: { 'E-A': 'ok' }, vars: { 'secret stored in the app': 'none', 'token': 'short-lived, audience = Key Vault' }, vh: { token: 'ok' } },
      { n: 'Step 3: the app calls Key Vault and sends the token with the request.', hl: { A: 'cur', K: 'win' }, ehl: { 'A-K': 'ok' }, vars: { 'secret stored in the app': 'none', 'request': 'GET secret PaymentApiKey' } },
      { n: 'Step 4: Key Vault checks role-based access. Does this identity have <b>Key Vault Secrets User</b> on this vault? If not, the answer is 403, even though the token is valid.', hl: { K: 'cur', R: 'cur' }, ehl: { 'K-R': 'ok' }, tags: { R: 'Key Vault Secrets User' }, vars: { 'secret stored in the app': 'none', 'role needed': 'Key Vault Secrets User' }, vh: { 'role needed': 'cur' } },
      { n: 'Step 5: the role is there, so the vault returns the value and writes an audit log entry saying which identity read which secret.', hl: { K: 'ok', A: 'ok' }, vars: { 'secret stored in the app': 'in memory only', 'audit log': 'identity + secret name + time' }, vh: { 'audit log': 'ok' } },
      { n: 'Step 6: the app calls the payment API with the key. If the key is rotated in the vault, the app picks up the new version without a code change.', hl: { A: 'ok', S: 'ok' }, ehl: { 'A-S': 'ok' }, vars: { 'secret stored in the app': 'in memory only', 'rotation': 'change it in the vault only' } },
      { n: 'Summary: <b>identity instead of passwords</b>, <b>least privilege</b> by role, and an <b>audit trail</b>. Where the service supports Entra sign-in itself (SQL, Storage, Service Bus, Azure OpenAI), skip the secret completely and use the identity directly.', hl: { A: 'sel', E: 'done', K: 'sel', R: 'done', S: 'done' } }
    ]),
  examples: [
    { title: 'Picking a messaging service from one sentence', html: `${H.table(['The requirement says', 'Pick', 'Because'], [['"Each payment instruction must be processed once, in order per account"', 'Service Bus with sessions', 'Ordering, dead-lettering, duplicate detection'], ['"When a file lands in storage, three systems should react"', 'Event Grid', 'Push notification to many subscribers'], ['"We collect 50,000 device readings per second"', 'Event Hubs', 'Partitioned stream built for volume'], ['"Send a welcome email later, cheaply"', 'Storage Queue', 'Simple and costs almost nothing']])}<p>A message is a <b>command</b> ("do this"). An event is a <b>fact</b> ("this happened"). Say which one you have before naming a service.</p>` },
    { title: 'Four ways a cache hurts you', html: `<ol><li><b>Stampede:</b> a popular key expires and 500 requests all rebuild it at once. Use a lock per key, or <code>HybridCache</code> in modern .NET, which lets one caller rebuild while the others wait.</li><li><b>Stale data:</b> the database changed and the cache did not. Remove the key on every write and keep expiry times short.</li><li><b>Tenant leak:</b> the key is <code>report:42</code> and two customers both have a report 42. Put the tenant id in the key.</li><li><b>Personal data in a shared key:</b> never cache one user's data under a key another user can hit.</li></ol>`, code: { lang: 'csharp', check: false, code: CS_CACHE } },
    { title: 'The network path of a public API', html: `<p>A common layout, from the internet inwards:</p><ol><li><b>Front Door with a web application firewall</b>: TLS, global routing, blocks common attacks.</li><li><b>API Management</b>: checks the token, applies rate limits, versions the API.</li><li><b>Functions or App Service</b>: access restricted so only the gateway can call it.</li><li><b>Private endpoints</b> to Azure SQL, Storage and Key Vault, with public access turned off.</li></ol><p>Each layer has one job. If asked "why not expose the function directly?", the answer is that you would have to rebuild rate limiting, token checks and attack filtering in every API.</p>` }
  ],
  deepDive: `<p><b>System-assigned vs user-assigned identity.</b> System-assigned is created with the resource and deleted with it: simple, one per resource. User-assigned is its own resource that you attach to many apps: useful when 5 apps need the same access, or when the identity must exist before the app so roles can be granted first. With several identities attached, tell <code>DefaultAzureCredential</code> which client id to use.</p>
    <p><b><code>DefaultAzureCredential</code> is a chain.</b> It tries environment variables, workload identity, managed identity, then developer sign-ins such as Visual Studio and the Azure CLI. That makes the same code work locally and in Azure, but the chain can be slow on first use and can pick up an identity you did not expect. In production many teams use <code>ManagedIdentityCredential</code> directly.</p>
    <p><b>Key Vault limits and habits.</b> The vault throttles heavy callers, so read secrets at startup or cache them, do not fetch one per request. Turn on purge protection, use role-based access in place of the older access policies, and use one vault per app per environment so a test identity cannot read production secrets.</p>
    <p><b>Service Bus details that come up.</b> Peek-lock receive (the message is locked, then completed or abandoned), a max delivery count before dead-lettering, sessions for first-in-first-out per key, topics with filtered subscriptions for publish and subscribe, and duplicate detection by message id within a time window.</p>
    <p><b>Private endpoint vs service endpoint.</b> A private endpoint puts a private IP for the service inside your network and needs private DNS so the normal host name resolves to it. A service endpoint keeps the service on its public address but only accepts traffic from chosen subnets. Private endpoints also work from on-premises networks; service endpoints do not.</p>
    <p><b>Redis on Azure in 2026.</b> Azure Managed Redis is the newer service and the older Azure Cache for Redis tiers have announced retirement dates, so check which one a team is on before quoting features.</p>`,
  aiEra: `<p><b>What AI changes:</b> AI features add new secrets (model keys), new data stores (vector indexes in Azure AI Search or Cosmos DB) and new sensitive data (prompts). The rules in this topic apply to them unchanged: identity over keys, private endpoints, least privilege.</p>
    <p><b>Use AI as a partner:</b> ask <code>Review this Bicep for public network access and for secrets in plain app settings</code>. Assistants are quick at this kind of pattern check.</p>
    <p><b>Where AI goes wrong:</b> generated samples very often hard-code a connection string or an API key "for simplicity", suggest account-key SAS tokens, and use legacy Key Vault access policies. They also mix up Service Bus and Event Grid.</p>
    <p><b>What you must still own:</b> the trust boundaries. Decide what may leave your network, which identity may read which secret, and what must never be sent to a model or written to a log.</p>`,
  problems: [P({
    t: 'A connection string was committed to Git', l: 'Medium', tags: ['security', 'key vault', 'managed identity'],
    s: 'A developer tells you that the production SQL connection string, with user name and password, was committed to the repository 3 weeks ago. The repository is private but has 60 contributors. What do you do today, and what do you change so it cannot happen again?',
    ex: '<p><b>What is exposed:</b> ' + H.c('r', 'a SQL login that can read and write production data') + '. It is in Git history, so deleting the line in a new commit does <b>not</b> remove it.</p>',
    weak: 'I would delete the line, push a new commit, and remind everyone not to do it again.',
    why: 'The password is still in history, in every clone and in any fork or build cache. A reminder is not a control. The answer misses the only step that makes the leak harmless: changing the password.',
    q: ['What is the single most urgent step?', ['Rewrite Git history to remove the commit', 'Rotate the password so the leaked value stops working', 'Make the repository private', 'Add a note to the wiki'], 1, 'Once a secret has been shared you cannot prove where it went. Rotation is the only step that makes the leaked value useless.'],
    h: ['Assume the secret is already known to someone you did not intend. What makes it worthless?', 'After the fire is out, remove the need for a password at all: an identity that Azure manages can sign in to Azure SQL.', 'Recipe: rotate, check logs for misuse, clean history, move to managed identity, add secret scanning with push protection, tell the right people.'],
    a: '<p><b>Today:</b></p><ol><li><b>Rotate</b> the SQL password now and update the app through Key Vault. This makes the leaked value useless.</li><li><b>Check for misuse:</b> review SQL audit logs and sign-in logs for the 3 weeks for unknown addresses or unusual queries.</li><li><b>Report it</b> through the security incident process. A lead does not decide alone that a leak "probably did no harm".</li><li>Clean the history if policy asks for it, but treat that as tidying, not as the fix.</li></ol><p><b>So it cannot happen again:</b></p><ol><li>Move the app to a <b>managed identity</b> with Microsoft Entra authentication on Azure SQL, so there is no password to leak.</li><li>Any secret that must exist lives in <b>Key Vault</b> and is referenced from app settings.</li><li>Turn on <b>secret scanning with push protection</b> so the push is blocked before it reaches the server.</li><li>Local development uses the developer\'s own sign-in through <code>DefaultAzureCredential</code>, not a shared password.</li></ol>',
    cx: '<p>Cost: about a day of work for the identity change. Benefit: a whole class of incident disappears, and rotation stops being a manual task.</p>',
    f: ['How would you rotate the password with no downtime?', 'What if the secret was a storage account key?']
  })]
});

// ================= TOPIC 4 =================
topics.push({
  title: 'Monitoring, High Availability and Azure OpenAI in Production',
  analogy: `<p>Running a service without monitoring is like <b>driving at night with the dashboard covered</b>. You only learn about the problem when the engine stops. Application Insights is the dashboard: speed (latency), warning lights (errors) and a trip recorder (traces). High availability is the <b>spare tyre</b>, and disaster recovery is the <b>plan for when the whole car is gone</b>. An AI model is a new part under the bonnet with its own gauges: tokens, rate limits and filters.</p>`,
  explain: `<p><b>The plain idea:</b> you cannot fix what you cannot see, and you cannot promise uptime you have not designed for.</p>
    <p><b>Three names people mix up:</b></p>
    <ul>
      <li><b>Azure Monitor</b> is the umbrella: metrics, logs, alerts and dashboards for everything in Azure.</li>
      <li>A <b>Log Analytics workspace</b> is the store where logs are kept. You query it with <b>KQL</b> (Kusto Query Language).</li>
      <li><b>Application Insights</b> is the part that watches your application: requests, calls to dependencies, exceptions, traces and custom events.</li>
    </ul>
    <p><b>Three words for promises:</b> an <b>SLI</b> is a measurement ("percentage of requests under 500 ms"), an <b>SLO</b> is your target for it ("99.9%"), and an <b>SLA</b> is a contract with a customer that has consequences.</p>
    <p><b>Two words for disasters:</b> <b>RPO</b> is how much data you can afford to lose, measured in time. <b>RTO</b> is how long you can afford to be down. Decide these first, then pick zones, regions and backups to meet them.</p>
    <p><b>Azure OpenAI in one paragraph:</b> it gives you OpenAI models as an Azure service, with Azure identity, private networking and content filtering. <b>Microsoft Foundry</b> (earlier called Azure AI Foundry) is the wider platform around it: a catalogue of models from several providers, projects, an agent service, evaluation and tracing. You create a <b>deployment</b>, which is your own named copy of a model with its own quota, and your code calls the deployment name.</p>
    ${H.table(['LLM concern', 'What to do'], [['Rate limits (429)', 'Respect Retry-After, back off, spread load across deployments'], ['Cost', 'Cap output tokens, trim prompts, cache, use the smallest model that is good enough'], ['Latency', 'Stream the answer, keep prompts short'], ['Safety', 'Handle filtered responses as a normal outcome'], ['Privacy', 'Managed identity, private endpoint, no prompts or personal data in logs']])}`,
  clues: ['"What is the difference between Azure Monitor and Application Insights?"', '"How would you find out why one request was slow?"', '"What do you alert on?"', '"What are your RPO and RTO?"', '"What happens if the whole region goes down?"', '"How do you call Azure OpenAI without an API key?"', '"You are getting 429 from the model. What do you do?"', '"What do you log for an LLM call, and what do you never log?"'],
  code: [{ lang: 'text', check: false, code: KQL }, { lang: 'csharp', check: false, code: CS_OPENAI }],
  codeTitle: ['KQL: slow dependencies, failed requests, and one request end to end', 'Azure OpenAI from C# with a managed identity'],
  viz: flowViz('Following one slow request hop by hop', 'One checkout request, traced', 62,
    [
      { id: 'C', label: 'Browser', x: 8, y: 14, shape: 'box' },
      { id: 'G', label: 'API gateway', x: 30, y: 14, shape: 'box' },
      { id: 'F', label: 'Function', x: 54, y: 14, shape: 'box' },
      { id: 'D', label: 'Azure SQL', x: 82, y: 14, shape: 'box' },
      { id: 'O', label: 'Azure OpenAI', x: 82, y: 46, shape: 'box' },
      { id: 'AI', label: 'Application Insights', x: 40, y: 48, shape: 'box', w: 24 }
    ],
    [['C', 'G'], ['G', 'F'], ['F', 'D'], ['F', 'O'], ['F', 'AI', 'telemetry']],
    [
      { n: 'A user says "checkout took 6 seconds". Before guessing, follow one real request. Every hop records telemetry with the <b>same operation id</b>, so the pieces can be joined later.', hl: { C: 'cur' }, vars: { 'total seen by user': '6.1 s', 'operation id': 'same on every hop' } },
      { n: 'The gateway took 20 ms. It checked the token and passed on the trace header (<code>traceparent</code>, the W3C standard). Not the problem.', hl: { G: 'ok' }, ehl: { 'C-G': 'ok' }, vars: { gateway: '20 ms', 'total seen by user': '6.1 s' } },
      { n: 'The function recorded a <b>request</b> of 6.0 seconds. So nearly all the time is inside the function or the things it calls.', hl: { F: 'cur' }, ehl: { 'G-F': 'ok' }, vars: { gateway: '20 ms', 'function request': '6.0 s' }, vh: { 'function request': 'cur' } },
      { n: 'Dependency 1: the SQL query took 80 ms. Fine. Application Insights records each outgoing call as a <b>dependency</b> with its target and duration.', hl: { D: 'ok' }, ehl: { 'F-D': 'ok' }, vars: { gateway: '20 ms', 'function request': '6.0 s', 'SQL dependency': '80 ms' } },
      { n: 'Dependency 2: the model call returned <span class="c-r">429 Too Many Requests</span> with a Retry-After of 4 seconds. The quota for this deployment was used up.', hl: { O: 'bad' }, ehl: { 'F-O': 'bad' }, vars: { 'SQL dependency': '80 ms', 'OpenAI call 1': '429, wait 4 s' }, vh: { 'OpenAI call 1': 'bad' } },
      { n: 'The code waited 4 seconds and tried again. The second call succeeded in 1.8 seconds. Total: 80 ms + 4 s wait + 1.8 s. That is the 6 seconds.', hl: { O: 'ok', F: 'cur' }, ehl: { 'F-O': 'ok' }, vars: { 'SQL dependency': '80 ms', 'OpenAI call 1': '429, wait 4 s', 'OpenAI call 2': '200 in 1.8 s' }, vh: { 'OpenAI call 2': 'ok' } },
      { n: 'All of this was visible in Application Insights as one timeline, because every item carries the same operation id. One KQL query proves it and counts how many users were hit.', hl: { AI: 'sel' }, ehl: { 'F-AI': 'ok' }, vars: { 'root cause': 'tokens-per-minute quota on the deployment', 'users affected last hour': 'count 429s by deployment' }, vh: { 'root cause': 'sel' } },
      { n: 'Fix options, cheapest first: cap output tokens and trim the prompt; raise the quota; spread calls over a second deployment or region; add an alert on the 429 rate. Then confirm with the same query tomorrow.', hl: { F: 'ok', O: 'ok', AI: 'done' } }
    ]),
  examples: [
    { title: 'Alert on what users feel', html: `<p><span class="c-r">Weak alert:</span> "CPU above 80% for 5 minutes". CPU can be high while every user is happy, and low while every request fails.</p><p><span class="c-g">Strong alerts:</span> error rate above 2% for 5 minutes; 95th percentile latency above 1 second; messages in the dead-letter queue above 0; availability test failing from 2 locations. Each alert goes to an <b>action group</b> (chat channel, email, on-call tool) and links to a runbook that says what to check first.</p>` },
    { title: 'Liveness vs readiness', html: `<p><b>Liveness</b> answers "is the process alive?". If not, restart it. <b>Readiness</b> answers "can it take traffic right now?". If not, stop sending requests but do not restart.</p><p>Keep liveness simple. If liveness checks the database and the database blips, the platform restarts every instance at once and turns a small problem into an outage. Put dependency checks in readiness.</p>` },
    { title: 'From RPO and RTO to a design', html: `${H.table(['Business says', 'Design'], [['"An hour of downtime is acceptable, lose at most 15 minutes of data"', 'One region, zone-redundant services, geo-backups, infrastructure as code to rebuild'], ['"5 minutes of downtime, almost no data loss"', 'Two regions active-passive, SQL failover group, Front Door routing, tested failover'], ['"No visible downtime"', 'Two regions active-active, data store with multi-region writes, much higher cost']])}<p>The honest sentence: <b>a plan that has never been tested is a hope, not a plan</b>.</p>` },
    { title: 'What to log for a model call', html: `<p><b>Log:</b> deployment name, prompt template version, input and output token counts, duration, result (ok, filtered, 429), and the operation id.</p><p><b>Do not log:</b> the raw prompt or the answer when they can hold personal or confidential data. If you must keep samples for quality checks, store them separately with tight access and a retention period.</p>`, code: { lang: 'csharp', check: false, code: CS_OPENAI } }
  ],
  deepDive: `<p><b>OpenTelemetry.</b> This is the vendor-neutral standard for traces, metrics and logs. The Azure Monitor OpenTelemetry distro sends that data to Application Insights, so your instrumentation is not tied to one vendor. Application Insights resources are now workspace-based: the data lands in a Log Analytics workspace, and you connect with a connection string, not the old instrumentation key alone.</p>
    <p><b>Sampling.</b> At high volume you keep a share of telemetry to control cost. Sampling keeps or drops whole operations, so a kept request still has all its dependencies. Never rely on sampled data for exact counts, and exclude rare, important events from sampling.</p>
    <p><b>Error budgets.</b> A 99.9% monthly target allows about 43 minutes of failure. If the budget is spent, slow down releases and fix reliability; if it is healthy, ship faster. This turns "be careful" into a number the product owner can agree to.</p>
    <p><b>Zones vs regions.</b> Zone redundancy covers a datacentre failure with little effort. Multi-region covers a regional failure but adds data replication lag, failover testing and roughly double the cost. Front Door routes at the HTTP layer with health probes; Traffic Manager routes by DNS.</p>
    <p><b>Azure OpenAI capacity.</b> Standard deployments are limited by tokens per minute and requests per minute, per deployment and region. Provisioned throughput buys reserved capacity for predictable latency at a fixed price. Global and data-zone deployment types trade where the request is processed for more capacity, which matters for data-residency rules.</p>
    <p><b>Names move.</b> The product is now presented as Azure OpenAI in Foundry Models, the Responses API is the forward path beside Chat Completions, and the older Assistants API has been replaced. Check the current documentation before quoting an API name.</p>`,
  aiEra: `<p><b>What AI changes:</b> a model call is a new kind of dependency. It is slow, it is priced per token, it can be throttled, and the same input can give a different output. Your monitoring needs token counts and filter results next to latency and errors.</p>
    <p><b>Use AI as a partner:</b> paste a KQL result and ask <code>What changed between these two hours?</code>, or ask for a first draft of a KQL query and then run it yourself. Azure also offers assistants inside the portal that write KQL.</p>
    <p><b>Where AI goes wrong:</b> it invents table and column names in KQL, forgets time filters (an expensive mistake), and writes Azure OpenAI code against SDK shapes that have since changed, often with an API key.</p>
    <p><b>What you must still own:</b> the SLO, the alert thresholds and the incident call. During an outage the lead decides to roll back; a model can only suggest.</p>`
});

// ================= TOPIC 5 =================
topics.push({
  title: 'DevOps, CI/CD, Infrastructure as Code and Architecture Answers',
  analogy: `<p>Think of a <b>car factory line</b>. Every car goes through the same stations in the same order: weld, paint, safety test, final check. Nobody carries a car past the safety test by hand. A pipeline is that line for software: the same steps for every change, with gates that stop a bad build. <b>Infrastructure as code</b> is the factory blueprint: with it, you can build a second identical factory in another city.</p>`,
  explain: `<p><b>The plain idea:</b> every change should travel to production the same automated way, and the environments themselves should be created from files in Git.</p>
    <p><b>Three terms that sound alike:</b></p>
    <ul>
      <li><b>Continuous integration (CI):</b> every commit is built and tested automatically.</li>
      <li><b>Continuous delivery:</b> every passing build <i>can</i> be released; a person presses the button.</li>
      <li><b>Continuous deployment:</b> every passing build <i>is</i> released, with no person in the way.</li>
    </ul>
    <p><b>A healthy pipeline:</b> pull request → build → unit tests, lint, static analysis, security scan → one artifact → deploy to test → smoke tests → approval → production → health check → monitoring → rollback if needed.</p>
    <p><b>Four ideas to say by name:</b></p>
    <ul>
      <li><b>Build once, deploy many:</b> the same artifact goes to test and to production. Only configuration changes.</li>
      <li><b>No stored cloud passwords:</b> the pipeline signs in to Azure with <b>OIDC federation</b>, a short-lived token exchange.</li>
      <li><b>Infrastructure as code:</b> Bicep (Azure-native, no state file) or Terraform (multi-cloud, keeps a state file).</li>
      <li><b>Safe release:</b> slot swap, canary or feature flags, plus database changes that old and new code can both live with.</li>
    </ul>
    ${H.table(['Strategy', 'How', 'Rollback'], [['Rolling', 'Replace instances a few at a time', 'Redeploy the old version'], ['Blue-green / slot swap', 'Deploy beside the live version, then swap', 'Swap back'], ['Canary', 'Send a small share of traffic first', 'Route traffic back'], ['Feature flag', 'Ship the code switched off', 'Switch the flag off'], ['Recreate', 'Stop, deploy, start', 'Redeploy (with downtime)']])}
    <p>Architecture questions ("design a secure API", "the API is slow after a release") are answered with the same parts in a fixed order: <b>edge, compute, data, security, operations, resilience, cost</b>.</p>`,
  clues: ['"Walk me through your pipeline from commit to production"', '"Continuous delivery vs continuous deployment?"', '"How does your pipeline authenticate to Azure?"', '"How do you roll back?" and "what about the database?"', '"Bicep or Terraform, and why?"', '"Which branching strategy do you use?"', '"What are your quality gates?"', '"Design a secure, scalable API on Azure"', '"The API got slow after yesterday\'s deployment. Go."'],
  code: [{ lang: 'yaml', check: false, code: YAML_ADO }, { lang: 'yaml', check: false, code: YAML_GHA }, { lang: 'yaml', check: false, code: YAML_OIDC }, { lang: 'text', check: false, code: BICEP }],
  codeTitle: ['Azure DevOps: multi-stage YAML with a slot swap', 'GitHub Actions: releases driven by tags', 'GitHub Actions: reusable deploy workflow with OIDC sign-in', 'Bicep: storage, plan and a Function App with a managed identity'],
  viz: [
    flowViz('One change, from pull request to production', 'Release pipeline', 64,
      [
        { id: 'PR', label: 'Pull request', x: 8, y: 12, shape: 'box' },
        { id: 'B', label: 'Build + tests', x: 30, y: 12, shape: 'box' },
        { id: 'G', label: 'Quality gates', x: 52, y: 12, shape: 'box' },
        { id: 'A', label: 'Artifact', x: 74, y: 12, shape: 'box' },
        { id: 'T', label: 'Test env', x: 92, y: 32, shape: 'box' },
        { id: 'AP', label: 'Approval', x: 74, y: 52, shape: 'box' },
        { id: 'S', label: 'Staging slot', x: 52, y: 52, shape: 'box' },
        { id: 'P', label: 'Production', x: 30, y: 52, shape: 'box' },
        { id: 'M', label: 'Monitoring', x: 8, y: 52, shape: 'box' }
      ],
      [['PR', 'B'], ['B', 'G'], ['G', 'A'], ['A', 'T'], ['T', 'AP'], ['AP', 'S'], ['S', 'P', 'swap'], ['P', 'M']],
      [
        { n: 'A developer opens a <b>pull request</b>. Branch protection says it cannot merge until checks pass and a teammate approves.', hl: { PR: 'cur' } },
        { n: '<b>Build and unit tests</b> run on a clean agent. If the build only works on one laptop, this is where you find out.', hl: { B: 'cur' }, ehl: { 'PR-B': 'ok' } },
        { n: '<b>Quality gates:</b> static analysis, coverage on new code, dependency and secret scanning. A failed gate blocks the merge. No exceptions by hand.', hl: { G: 'cur' }, ehl: { 'B-G': 'ok' }, tags: { G: 'fails = no merge' } },
        { n: 'After the merge, the pipeline publishes <b>one artifact</b>. This exact package is what every environment receives. It is never rebuilt for production.', hl: { A: 'ok' }, ehl: { 'G-A': 'ok' }, tags: { A: 'build once' } },
        { n: 'Deploy to the <b>test environment</b> and run smoke and integration tests against it. The pipeline signs in to Azure with a short-lived OIDC token, not a stored password.', hl: { T: 'cur' }, ehl: { 'A-T': 'ok' }, tags: { T: 'OIDC sign-in' } },
        { n: 'A named person <b>approves</b> the production stage. The approval is set on the environment, so nobody can skip it by editing the YAML in a branch.', hl: { AP: 'cur' }, ehl: { 'T-AP': 'ok' } },
        { n: 'The same artifact goes to the <b>staging slot</b> of production. A health check warms it up while live users are still on the old version.', hl: { S: 'cur', P: 'win' }, ehl: { 'AP-S': 'ok' }, tags: { P: 'old version, still live' } },
        { n: '<b>Swap.</b> Staging becomes production in seconds. The old version is now sitting in the staging slot, so rollback is just a swap back.', hl: { S: 'done', P: 'ok' }, ehl: { 'S-P': 'ok' }, tags: { S: 'old version kept' } },
        { n: '<b>Watch</b> error rate and latency for the next minutes. If they jump, swap back first and investigate after. That order matters.', hl: { M: 'sel', P: 'ok' }, ehl: { 'P-M': 'ok' } }
      ]),
    rowViz('Expand and contract: renaming a column with no downtime', 'Rename Customer.Phone to Customer.Mobile',
      ['Release', 'Database', 'Code', 'Safe to roll back?'],
      [
        ['1. Expand', 'Add Mobile (nullable). Keep Phone', 'Writes both, reads Phone', 'Yes: old code ignores Mobile'],
        ['2. Backfill', 'Copy Phone into Mobile for old rows', 'No change', 'Yes'],
        ['3. Switch reads', 'No change', 'Reads Mobile, still writes both', 'Yes: Phone is still correct'],
        ['4. Contract', 'Drop Phone', 'Writes Mobile only', 'Only after step 3 has been stable']
      ],
      ['A slot swap can roll code back in seconds, but it cannot roll a database back. So the schema must work with <b>both</b> the old and the new code during a release.',
        '<b>Expand:</b> add the new column next to the old one. Nothing breaks, because old code never looks at it.',
        '<b>Backfill:</b> copy existing data across, in batches so the table is not locked.',
        '<b>Switch reads:</b> new code reads the new column but keeps writing both, so a rollback still finds good data in the old column.',
        '<b>Contract:</b> only in a later release, once nothing uses the old column, remove it.'],
      'Four small releases, each one safe to undo. This is the answer to "how do you roll back when the database changed?".', [0, 3])
  ],
  examples: [
    { title: 'Bicep or Terraform?', html: `${H.table(['', 'Bicep', 'Terraform'], [['Clouds', 'Azure only', 'Many clouds and other providers'], ['State', 'No state file; Azure is the source of truth', 'State file you must store, lock and protect'], ['New Azure features', 'Available on day one', 'When the provider adds them'], ['Preview a change', '<code>what-if</code>', '<code>plan</code>'], ['Choose when', 'The team is all-in on Azure', 'You manage more than one cloud or already use it']])}<p>Either answer is fine. What the interviewer wants is a reason, and the habit of reviewing infrastructure changes in a pull request with a preview attached.</p>`, code: { lang: 'text', check: false, code: BICEP } },
    { title: 'Branching: match the strategy to the release rhythm', html: `${H.table(['Strategy', 'In short', 'Fits'], [['Trunk-based', 'Short branches, merge to main daily, feature flags', 'Teams that release often'], ['GitHub Flow', 'Branch, pull request, merge, deploy', 'Web apps with continuous deployment'], ['Git Flow', 'develop, release and hotfix branches', 'Scheduled, versioned releases'], ['Release branches', 'Stabilise a version while main moves on', 'Products that patch old versions']])}<p><b>Merge vs rebase:</b> merge keeps history as it happened. Rebase rewrites your commits on top of the latest main, so use it on your own branch only, never on a branch others have pulled. <code>git revert</code> undoes a change on a shared branch by adding a new commit.</p>`, code: { lang: 'bash', check: false, code: `git switch -c topic/SHOP-1234-add-filter
git rebase origin/main          # replay my commits on the latest main (my own branch only)
git cherry-pick <sha>           # copy one fix onto a release branch
git revert <sha>                # undo safely on a shared branch (adds a new commit)
git bisect start                # then mark good and bad commits to find the one that broke it` } },
    { title: 'The 7-part answer to "design a secure, scalable API"', html: `<ol><li><b>Edge:</b> Front Door with a web application firewall, then API Management for token checks and rate limits.</li><li><b>Compute:</b> stateless Functions or Container Apps with autoscale and a managed identity.</li><li><b>Data:</b> Azure SQL for transactions, Redis for cache, Blob for files, Service Bus for background work.</li><li><b>Security:</b> Entra ID, Key Vault, private endpoints, least-privilege roles.</li><li><b>Operations:</b> Application Insights, alerts, infrastructure as code, a pipeline with approvals.</li><li><b>Resilience:</b> retries with backoff, idempotency, dead-letter handling, zones, tested recovery.</li><li><b>Cost:</b> right-size, autoscale, budgets, tags.</li></ol><p>Say the order out loud first, then fill it in. The structure is half the mark.</p>` },
    { title: '"Slow after deployment": the order of checks', html: `<ol><li><b>What changed?</b> The deployment diff, config and feature flags.</li><li><b>Compare before and after</b> in Application Insights: which operation got slower?</li><li><b>Split the time:</b> gateway, function, each dependency.</li><li><b>Platform signs:</b> cold starts, instance count, throttling (429 or 503), connection exhaustion.</li><li><b>Database:</b> a new query, a missing index, a changed plan, blocking.</li><li><b>If users are hurting, roll back first</b>, then investigate, then add a test and an alert.</li></ol>` }
  ],
  deepDive: `<p><b>Why OIDC federation beats a stored secret.</b> With a client secret, a long-lived password sits in the pipeline settings and must be rotated. With workload identity federation, you tell Microsoft Entra ID "trust tokens from this repository, for this branch or environment". At run time the pipeline asks its own platform for a signed token and swaps it for a short-lived Azure token. There is nothing to leak or rotate, and the trust is scoped to an exact repository and environment.</p>
    <p><b>Environments are the control point.</b> In both Azure DevOps and GitHub Actions, approvals and protection rules live on the environment, not in the YAML. That means a change to the pipeline file in a branch cannot remove the approval. Scope the production identity to the production resource group only.</p>
    <p><b>Slot swap details.</b> Settings marked as slot settings stay with the slot (for example a connection to a staging database). The platform warms up the staging slot before the swap. A swap moves code, not data, so database compatibility is your job.</p>
    <p><b>Drift.</b> Someone changes a setting in the portal and now production no longer matches the files. Run <code>what-if</code> or <code>plan</code> on a schedule to detect it, limit portal write access in production, and treat the files as the truth.</p>
    <p><b>Supply chain.</b> Pin action and task versions, scan dependencies and container images, generate a software bill of materials, and sign artifacts. A compromised build step has the same access as your pipeline identity.</p>
    <p><b>Multi-environment rules.</b> Same templates with different parameters, separate identities and secrets per environment, masked data outside production, just-in-time elevation for production access (Privileged Identity Management), and budgets with alerts on every subscription.</p>`,
  aiEra: `<p><b>What AI changes:</b> assistants and coding agents now write pipeline YAML and Bicep, and can open pull requests on their own. That raises the value of the gates: reviews, tests, scans and approvals are what make machine-written changes safe to ship.</p>
    <p><b>Use AI as a partner:</b> <code>Explain what this pipeline does stage by stage and list anything that runs with production credentials</code> is a fast way to review a workflow you did not write.</p>
    <p><b>Where AI goes wrong:</b> it stores a client secret where OIDC should be used, rebuilds the app per environment, uses outdated task versions, and grants Contributor on the whole subscription "to make it work". It also writes database migrations that drop a column in the same release that stops using it.</p>
    <p><b>What you must still own:</b> who can approve production, what the rollback is, and what the blast radius of the pipeline identity is. If an agent has write access to your pipeline, it has write access to production.</p>`,
  problems: [P({
    t: 'The release needs a breaking database change', l: 'Hard', tags: ['deployment', 'database', 'rollback'],
    s: 'Your team wants to split the column <code>FullName</code> into <code>FirstName</code> and <code>LastName</code> in a table that the live API reads 200 times a second. Releases use a staging slot and a swap. Plan the release so there is no downtime and a rollback is always possible.',
    ex: '<p><b>The trap:</b> during a swap, and for as long as a rollback is possible, <span class="c-r">old code and new code both run against the same database</span>. If the migration drops <code>FullName</code>, the old code breaks at once and a swap back cannot help.</p>',
    weak: 'We run the migration that drops FullName and adds the two columns, then swap the slot. If it fails we swap back.',
    why: 'Swapping back restores old code, but the column the old code needs is gone and so is its data. The rollback plan does not work, which is the one thing a rollback plan must do.',
    q: ['Which step must come LAST?', ['Add the new columns', 'Copy data into the new columns', 'Switch the code to read the new columns', 'Drop the old column'], 3, 'Removing the old structure is only safe when no running or rollback version of the code needs it. That is the "contract" step.'],
    h: ['Ask at every step: if I swap back right now, does the old code still work?', 'Add before you remove. New things can be ignored by old code; missing things cannot.', 'Recipe: expand (add columns), write both, backfill in batches, switch reads, wait, then contract (drop the old column) in a later release.'],
    a: '<p>I would use <b>expand and contract</b> over several small releases.</p><ol><li><b>Expand:</b> add <code>FirstName</code> and <code>LastName</code> as nullable columns. Old code is unaffected.</li><li><b>Write both:</b> release code that writes all three columns and still reads <code>FullName</code>.</li><li><b>Backfill:</b> copy old rows in small batches, off-peak, and verify counts.</li><li><b>Switch reads:</b> release code that reads the new columns but keeps writing <code>FullName</code>. If this release misbehaves, a swap back still finds correct data.</li><li><b>Contract:</b> after a stable period, stop writing <code>FullName</code>, then drop it in a later release.</li></ol><p>A feature flag on the read switch gives an even faster undo than a swap. Each release is smoke-tested on the staging slot first, and I would watch error rate and query duration after each swap.</p>',
    cx: '<p>Cost: 4 or 5 small releases in place of 1, and a period of double writes. Benefit: every single step can be undone in seconds with no data loss.</p>',
    f: ['How do you backfill 50 million rows without locking the table?', 'What if names cannot be split cleanly into two parts?']
  })]
});

// ================= PRACTICE (3 Easy, 5 Medium, 4 Hard) =================
practice.push(P({
  t: 'The React site shows 404 when the page is refreshed', l: 'Easy', tags: ['static web apps', 'spa'],
  s: 'A React app is hosted on Azure Static Web Apps. Clicking around works. But if a user refreshes the browser on <code>/orders/42</code>, or opens that link from an email, they get a 404 page. What is wrong and how do you fix it?',
  ex: '<p>Click from home to /orders/42: <span class="c-g">works</span> (the browser never asks the server).</p><p>Refresh on /orders/42: <span class="c-r">404</span> (the server is asked for a file called /orders/42, and no such file exists).</p>',
  weak: 'It is probably a caching problem. I would ask users to clear the browser cache or redeploy the site.',
  why: 'The guess does not explain why clicking works and refreshing fails. An interviewer wants you to reason from the symptom: the only difference is who handles the route, the browser or the server.',
  q: ['Why does clicking a link inside the app work?', ['The CDN caches every route', 'The JavaScript router changes the page without asking the server', 'The server has a file for every route', 'Static Web Apps guesses the route'], 1, 'In a single-page app the router handles routes in the browser. The server only ever needs to return index.html.'],
  h: ['Who answers the request in each case: the JavaScript router or the web server?', 'The server needs a rule that says "for any path that is not a real file, return the main page".', 'Add a navigationFallback to staticwebapp.config.json that rewrites to /index.html, and exclude static assets and /api so real 404s still work there.'],
  a: '<p>This is the classic single-page app routing problem. Routes such as <code>/orders/42</code> exist only inside the JavaScript router. On a refresh the browser asks the host for that path, and there is no such file, so the host returns 404.</p><p><b>Fix:</b> add a <b>navigation fallback</b> in <code>staticwebapp.config.json</code> that rewrites unknown paths to <code>/index.html</code>. The app then loads and its router shows the right page. I would exclude <code>/assets/*</code> and <code>/api/*</code>, so a missing image or a wrong API path still returns a real 404 and is not hidden behind the home page.</p><p>I would also add a test to the pipeline that requests a deep link on the preview site, so this cannot come back unnoticed.</p>',
  code: { lang: 'json', code: JSON_SWA },
  cx: '<p>One config file, no code change. The same idea applies on App Service or any other host: a rewrite rule to the main page.</p>',
  f: ['How would you restrict /admin routes to one role?', 'How do you give test and production different API addresses when the build output is static?']
}));

practice.push(P({
  t: 'The app gets 403 from Key Vault', l: 'Easy', tags: ['key vault', 'managed identity', 'rbac'],
  s: 'A new Function App starts in the test environment and fails with "403 Forbidden" when it reads a secret from Key Vault. The same code works on your laptop. What do you check, in order?',
  ex: '<p>Laptop: signs in as <b>you</b> (a developer with access) → <span class="c-g">200</span>.</p><p>Azure: signs in as <b>the app\'s managed identity</b> → <span class="c-r">403</span>.</p><p>Same code, different identity.</p>',
  weak: 'I would copy the secret into the app settings so the app does not need Key Vault. That unblocks the team.',
  why: 'It removes the security control to get past it. The secret is now readable by anyone who can open the app settings, and the real cause, a missing role, is still there for the next app.',
  q: ['A 403 (not 401) from Key Vault most likely means…', ['The token is missing or invalid', 'The identity is known but is not allowed to read secrets', 'The vault does not exist', 'The secret has expired'], 1, '401 means "I do not know who you are". 403 means "I know who you are and the answer is no", which points to a missing role or a network rule.'],
  h: ['The code is the same in both places. What is different about who is calling?', 'Check three things: does the app have a managed identity, does that identity have a data role on the vault, and does the vault firewall allow the app?', 'Recipe: confirm identity is enabled, assign Key Vault Secrets User at the vault scope, wait a few minutes for it to apply, check the vault network settings, restart the app.'],
  a: '<p>403 means the vault recognised the caller and refused. On my laptop the caller is me. In Azure it is the app\'s managed identity, which is a different principal with its own access.</p><ol><li><b>Is a managed identity enabled</b> on the Function App? If several are attached, is the code using the right client id?</li><li><b>Does it have a data role?</b> Assign <b>Key Vault Secrets User</b> on that vault. Contributor is a management role and does not allow reading secret values.</li><li><b>Access model:</b> is the vault using role-based access or the older access policies? The grant must be made in the model the vault uses.</li><li><b>Network:</b> if the vault allows only private or selected networks, the app needs virtual network integration and a route to the private endpoint.</li><li>Role changes can take a few minutes to apply. Then restart the app.</li></ol><p>Finally I would put the role assignment in the infrastructure code, so the next environment gets it automatically.</p>',
  cx: '<p>Usually a 5-minute fix. The lasting fix is adding the role assignment to the Bicep or Terraform files.</p>',
  f: ['What is the difference between Key Vault Secrets User and Key Vault Administrator?', 'How would this differ if the app used a Key Vault reference in app settings?']
}));

practice.push(P({
  t: 'Choose the messaging service three times', l: 'Easy', tags: ['messaging', 'service bus', 'event grid'],
  s: 'A booking system has 3 needs. (1) When a booking is paid, the invoice must be created exactly once and never lost. (2) When a photo is uploaded, 3 different systems want to know. (3) Door sensors in 4,000 rooms send a reading every second for analysis. Which Azure messaging service fits each?',
  ex: '<p>Read each need as either a <b>command</b> ("create the invoice") or an <b>event</b> ("a photo was uploaded") or a <b>stream</b> (4,000 readings a second).</p>',
  weak: 'I would use Service Bus for all three, because it is the most powerful one.',
  why: 'One tool for three shapes of problem. Service Bus is not built for 4,000 events a second of telemetry, and it is more than is needed to announce an upload. The answer shows no feel for cost or fit.',
  q: ['4,000 small readings every second, read later by an analytics job. Which fits best?', ['Storage Queue', 'Service Bus topic', 'Event Hubs', 'Event Grid'], 2, 'Event Hubs is a partitioned stream designed for very high volumes that consumers read at their own pace.'],
  h: ['Sort the three by type: a task that must be done, a notice that something happened, a constant flow of data.', 'Tasks that must not be lost need dead-lettering and delivery tracking. Notices need fan-out to many listeners. Flows need partitions and volume.', 'Give one reason for each choice and name one feature you would turn on, for example duplicate detection or a dead-letter queue.'],
  a: '<p><b>1. Invoice after payment: Service Bus queue.</b> This is a command that must not be lost. Service Bus gives peek-lock delivery, a dead-letter queue for messages that keep failing, and duplicate detection by message id. Delivery is still at least once, so the invoice handler checks whether an invoice already exists for that booking.</p><p><b>2. Photo uploaded: Event Grid.</b> This is a fact that several systems care about. Event Grid pushes the event to each subscriber, with retries and its own dead-lettering. Adding a 4th listener later needs no change to the uploader.</p><p><b>3. Sensor readings: Event Hubs.</b> This is a high-volume stream. Event Hubs spreads it over partitions, keeps it for a retention period, and lets analytics jobs read at their own speed with consumer groups.</p>',
  cx: '<p>Rule of thumb: command = Service Bus, notification = Event Grid, stream = Event Hubs, cheap and simple = Storage Queue.</p>',
  f: ['When would a Service Bus topic be better than Event Grid for need 2?', 'How do you keep sensor readings from one room in order?']
}));

practice.push(P({
  t: 'The API returns 401 only in production', l: 'Medium', tags: ['auth', 'entra id', 'troubleshooting'],
  s: 'After a release, the React front end gets 401 Unauthorized from the API in production. In test, the same build works. Users can sign in and see the home page. What do you check?',
  ex: '<p>Test: sign in <span class="c-g">ok</span>, API call <span class="c-g">200</span>.</p><p>Production: sign in <span class="c-g">ok</span>, API call <span class="c-r">401</span>.</p><p>Same code. So the difference is configuration.</p>',
  weak: 'There must be a bug in the authentication code. I would add more logging and redeploy to production to see.',
  why: 'The same build works in test, so the code is not the first suspect. Redeploying to production to add logs costs time and risk when the token and the configuration can be inspected in a few minutes.',
  q: ['The same artifact works in test and fails in production. The most likely cause is…', ['A compiler bug', 'A difference in environment configuration', 'The browser cache', 'A slow database'], 1, 'With "build once, deploy many", the artifact is identical. What differs between environments is configuration: client ids, audiences, tenant, gateway policies.'],
  h: ['Decode the token the browser sends in production. Look at the audience, the issuer and the expiry.', 'Compare those values with what the API (or the gateway in front of it) is configured to accept in production.', 'Checklist: is the Authorization header present, is the audience the production API, is the issuer the right tenant, do scopes or roles match, is a gateway or built-in auth rejecting it before your code runs?'],
  a: '<p>401 means the API did not accept the caller\'s identity. Since the build is identical, I compare configuration.</p><ol><li><b>Is the token sent at all?</b> Check the request in the browser tools for the Authorization header. A wrong API address in the production build config can mean the token is requested for a different resource.</li><li><b>Decode the token.</b> Check <code>aud</code> (audience), <code>iss</code> (issuer) and expiry. The classic cause is a production front end using the test API\'s client id or scope, so the audience is wrong.</li><li><b>Check what the API accepts:</b> production app settings for tenant id, audience and valid issuers. A missing or mistyped setting gives a 401 for everyone.</li><li><b>Check the layers in front:</b> an API Management <code>validate-jwt</code> policy or built-in App Service authentication may reject the request before my code runs. The response body and gateway trace say which layer answered.</li><li><b>Check slot settings:</b> after a swap, a setting that should stay with production may have moved with the code.</li></ol><p>Then fix the config in the infrastructure files, not by hand, and add a post-deploy smoke test that calls one protected endpoint.</p>',
  cx: '<p>Most cases are found in 10 minutes by decoding one token. Prevention is a smoke test with a real token after each deployment.</p>',
  f: ['What would 403 in production point to instead?', 'How do you keep audience and client ids from drifting between environments?']
}));

practice.push(P({
  t: 'Users complain the first request is slow', l: 'Medium', tags: ['functions', 'cold start', 'hosting plans'],
  s: 'An internal HTTP API runs on Azure Functions on the old Consumption plan. People say that the first call in the morning, or after a quiet 20 minutes, takes 8 seconds. Later calls take 150 ms. What do you do?',
  ex: '<p>09:00 first call: <span class="c-r">8,000 ms</span>. 09:01 next call: <span class="c-g">150 ms</span>. 09:30 after a quiet spell: <span class="c-r">7,500 ms</span>.</p>',
  weak: 'I would add a timer function that pings the API every minute so it never goes to sleep.',
  why: 'A keep-alive ping is a workaround that only keeps one instance warm. When load rises and a new instance is added, users hit the cold start again. It also hides the real choice: this workload is on the wrong plan.',
  q: ['Why are only some calls slow?', ['The database is slow in the morning', 'No warm instance existed, so the platform had to start one and load the app', 'The network is congested', 'The code has a memory leak'], 1, 'That is a cold start: the delay to start an instance and load the app when the plan had scaled to zero.'],
  h: ['The pattern "slow after idle, fast after" names the problem. What is the platform doing during those 8 seconds?', 'There are two levers: keep instances warm (a plan choice), and make starting faster (an app choice).', 'Recipe: measure startup, move to Flex Consumption with always-ready instances or Premium, trim the package, create heavy clients lazily, reuse clients through dependency injection.'],
  a: '<p>This is a cold start: the plan scaled to zero, so the first request waits for a new instance to start and load the app.</p><p><b>Platform side:</b> move to <b>Flex Consumption with one or two always-ready instances</b>, or to Premium if we need Windows or containers. That keeps warm capacity for HTTP while still scaling out. The old Consumption plan is no longer the recommended choice for new work anyway.</p><p><b>App side:</b> 8 seconds is long, so startup itself needs work. I would check the startup trace in Application Insights, then shrink the deployment package, create heavy clients on first use, register <code>HttpClient</code> and SDK clients as singletons, avoid network calls during startup, and publish with ReadyToRun.</p><p><b>Then measure:</b> track the 95th percentile of the first request after idle, before and after, so the fix is proven and not assumed.</p>',
  cx: '<p>Cost: always-ready instances are billed while idle. For a user-facing API that is normally worth it; for a nightly job it is not.</p>',
  f: ['Would you make the same change for a queue-triggered function?', 'How would you measure cold start time separately from normal latency?']
}));

practice.push(P({
  t: 'The poison queue filled up overnight', l: 'Medium', tags: ['functions', 'queues', 'operations'],
  s: 'You arrive to find 3,000 messages in the <code>orders-poison</code> queue. They arrived between 02:00 and 02:20. Normal processing looks fine now. What do you do, step by step?',
  ex: '<p>3,000 poison messages × 5 attempts each = <b>15,000 failed runs</b> in 20 minutes. The window is short and has a clear start and end.</p>',
  weak: 'I would move all the messages back to the main queue so they get processed again.',
  why: 'Replaying before knowing the cause can fail all 3,000 again, or worse, apply a side effect twice if the handler is not idempotent. It also skips telling anyone that 3,000 orders are late.',
  q: ['What does a short, sharp window of failures most often point to?', ['A bug in every message', 'A dependency that was unavailable for that window', 'A slow memory leak', 'A wrong time zone'], 1, 'A burst with a clear start and end usually means something the function calls was down or throttling, not that 3,000 messages were all malformed.'],
  h: ['Look at the exception on the failed runs in Application Insights for 02:00 to 02:20. Is it the same error on all of them?', 'Decide whether the messages are bad (will never work) or the world was bad (they will work now).', 'Recipe: find the cause, tell stakeholders, check the handler is idempotent, replay a small sample, replay the rest at a controlled rate, then add an alert and a longer backoff.'],
  a: '<ol><li><b>Find the cause.</b> Query exceptions for that window. If all 3,000 share one error, such as a database timeout or a 503 from a partner API, it was a dependency outage, not bad data.</li><li><b>Tell people.</b> 3,000 orders are delayed. Operations and the product owner should hear it from me, with a time estimate.</li><li><b>Check it is safe to replay.</b> Is the handler idempotent? Did any step succeed before the failure? If not sure, replay 10 messages and verify the results by hand.</li><li><b>Replay at a controlled rate</b> with a small script that moves messages back in batches, watching the dependency so we do not cause a second outage.</li><li><b>Fix the weakness.</b> 5 quick retries all landed inside the same outage. Add retry with backoff inside the handler for short errors, consider Service Bus with a longer delay between deliveries, and add an <b>alert on poison queue length above 0</b>, so next time we know at 02:05, not at 09:00.</li></ol>',
  cx: '<p>Recovery takes an hour or two. The lasting value is the alert and the backoff, which turn a morning surprise into a night-time page with a runbook.</p>',
  f: ['How would you tell a bad message from a bad dependency automatically?', 'What changes if the handler sends emails?']
}));

practice.push(P({
  t: 'The pipeline secret expires tomorrow', l: 'Medium', tags: ['ci/cd', 'oidc', 'security'],
  s: 'Deployments use a service principal with a client secret stored in the pipeline settings. The secret expires tomorrow, nobody remembers who created it, and it has Contributor on the whole subscription. What do you do now, and what do you change for good?',
  ex: '<p>Three problems in one sentence: a <span class="c-r">long-lived secret</span>, <span class="c-r">no owner</span>, and <span class="c-r">far too much access</span>.</p>',
  weak: 'I would create a new secret with the longest expiry allowed, 2 years, and update the pipeline so we do not have to think about it for a while.',
  why: 'It postpones the same emergency by 2 years, keeps a powerful password in the pipeline, and leaves subscription-wide access in place. The interviewer hears "I fix symptoms".',
  q: ['What does OIDC federation remove from the pipeline?', ['The need for approvals', 'The stored long-lived secret', 'The need for a pipeline agent', 'The Azure subscription'], 1, 'With federation the pipeline swaps its own signed token for a short-lived Azure token at run time. No password is stored anywhere.'],
  h: ['Separate the urgent fix (deployments must work tomorrow) from the real fix (no secret at all).', 'Azure can be told to trust tokens from one exact repository and environment. Then the pipeline needs no password.', 'Recipe: rotate now with a short expiry, set up a federated credential, switch the pipeline, narrow the role to the resource groups it deploys to, delete the old secret, record an owner.'],
  a: '<p><b>Today:</b> create a new secret with a short expiry, update the pipeline, run a test deployment, and record an owner. That buys time without building a new 2-year problem.</p><p><b>This sprint, the real fix:</b></p><ol><li><b>Move to OIDC federation</b> (workload identity federation). Add a federated credential that trusts tokens from this repository and the production environment only. The pipeline then signs in with a short-lived token and stores no secret.</li><li><b>Narrow the access.</b> Replace Contributor on the subscription with the roles needed on the specific resource groups. Use a separate identity for test and for production.</li><li><b>Protect production</b> with an environment that requires an approval, so the production identity can only be used after a named person agrees.</li><li><b>Delete the old secret</b> and check sign-in logs to confirm nothing else was using it.</li></ol><p>I would also list other secrets with expiry dates and put the dates in a shared calendar until they are replaced too.</p>',
  code: { lang: 'yaml', check: false, code: YAML_OIDC },
  cx: '<p>About a day of work. After it, there is no secret to expire, leak or rotate, and a stolen pipeline token is useless within minutes.</p>',
  f: ['What exactly does the federated credential trust?', 'How do you do the same in Azure DevOps?']
}));

practice.push(P({
  t: 'The Azure bill jumped 40% in one month', l: 'Medium', tags: ['cost', 'operations'],
  s: 'Finance reports that the monthly Azure cost rose by 40%. Nobody on the team knows why. How do you find the cause and how do you stop surprises like this?',
  ex: '<p>Last month: 10,000. This month: 14,000. The question is not "how do we cut cost" yet. It is <b>"which 4,000 is new?"</b></p>',
  weak: 'I would scale everything down a tier and turn off the test environment at night to bring the cost back.',
  why: 'It cuts blindly before finding the cause. It may slow production, and if the real cause is something like log volume or model tokens, the bill will stay high anyway.',
  q: ['What is the first tool to open?', ['The pipeline history', 'Cost analysis, grouped by service and resource, compared with last month', 'The source code', 'The network watcher'], 1, 'Cost analysis shows where the money went. Grouping by service, resource group and tag turns "40% more" into a named resource.'],
  h: ['Do not cut yet. Find which service and which resource the extra spend belongs to.', 'Usual suspects: log ingestion, a forgotten test resource, a scaled-up tier never scaled back, outbound data, model tokens.', 'Recipe: group cost by service then resource, line it up with deployments on the date it rose, fix the cause, then add budgets, alerts and tags.'],
  a: '<p><b>Find it:</b> open Cost Management and compare this month with last, grouped by service, then by resource group and tag. Look at the daily chart for the day the line bends, and match that date with deployments and config changes.</p><p><b>Common causes I would check:</b> verbose logging left on, so Log Analytics ingestion grew; a database or plan scaled up for a load test and never scaled back; resources left behind by a branch environment; a retry storm that multiplied calls; token usage on a model deployment after a prompt grew.</p><p><b>Fix the cause</b>, for example turn on sampling, set a daily cap on ingestion with an alert, or cap output tokens.</p><p><b>Prevent it:</b></p><ul><li>Budgets with alerts at 50, 80 and 100% on each subscription.</li><li>Required tags for owner and environment, enforced by policy.</li><li>Autoscale and scale-to-zero where the load allows, and reservations or savings plans for steady load.</li><li>A 30-minute monthly cost review using Cost analysis and Azure Advisor.</li></ul>',
  cx: '<p>Finding the cause is usually under an hour once cost is grouped well. Tags are what make that possible, so they pay for themselves the first time this happens.</p>',
  f: ['How do you estimate the cost of a new feature before building it?', 'When is a reservation a bad idea?']
}));

practice.push(P({
  t: 'The model returns 429 at peak time', l: 'Hard', tags: ['azure openai', 'rate limits', 'resilience'],
  s: 'A support tool summarises customer tickets with an Azure OpenAI deployment. Every weekday from 10:00 to 11:00 about 15% of calls fail with 429 and users see errors. Outside that hour all is well. Design the fix.',
  ex: '<p>Peak hour: 900 requests a minute, about 2,500 tokens each = <b>2.25 million tokens a minute</b> wanted. The deployment quota is 1.5 million tokens a minute. ' + H.c('r', 'Demand is above the limit, so some calls must fail or wait.') + '</p>',
  weak: 'I would wrap the call in a retry loop that tries again immediately up to 10 times.',
  why: 'Immediate retries send even more requests into a limit that is already exceeded, which makes the throttling worse for everyone. It ignores the Retry-After header and does nothing about demand being higher than quota.',
  q: ['What does a 429 from the deployment tell you?', ['The prompt was unsafe', 'The deployment hit its tokens-per-minute or requests-per-minute limit', 'The key is wrong', 'The model is retired'], 1, '429 means rate limited. The quota is per deployment and region, counted in tokens and requests per minute.'],
  h: ['Compare demand with quota in numbers. If demand is higher, retries alone cannot fix it.', 'You can lower demand (fewer tokens, fewer calls), raise supply (more quota, more deployments), or smooth the peak (queue the work).', 'Recipe: honour Retry-After with backoff and jitter, cut tokens per call, cache repeats, move non-urgent work to a queue, add capacity, and alert on the 429 rate.'],
  a: '<p>Demand is above quota for one hour, so I work on all three sides.</p><p><b>Handle 429 properly:</b> read the <code>Retry-After</code> header, back off with jitter, and cap the number of retries. Show the user "summary is being prepared" and not an error.</p><p><b>Lower demand:</b> set a tight output token limit, trim the prompt (send the last few messages, not the whole ticket history), and cache the summary per ticket version so a second viewer does not trigger a second call. Check whether a smaller model gives summaries that are good enough.</p><p><b>Smooth the peak:</b> summaries do not have to be instant. Put requests on a queue and let a function process them at a rate just under the quota. The queue absorbs the 10:00 spike.</p><p><b>Raise supply:</b> ask for more quota, add a second deployment in another region and spread calls across both, or buy provisioned throughput if the peak is predictable and latency matters.</p><p><b>See it next time:</b> log tokens and outcome per call and alert when the 429 rate passes 2%.</p>',
  cx: '<p>Cheapest first: token caps and caching cost nothing and often remove the problem. Extra regions and provisioned throughput cost money and bring data-residency questions, so they come last.</p>',
  f: ['How do you keep data-residency rules when adding a second region?', 'How would you test this without spending the quota?']
}));

practice.push(P({
  t: 'Plan for losing a whole region', l: 'Hard', tags: ['high availability', 'disaster recovery'],
  s: 'A payroll product runs in one Azure region: Functions, Azure SQL, Blob Storage, Key Vault. The business now says: "If the region is lost, we can lose at most 5 minutes of data and must be back within 30 minutes." Design it.',
  ex: '<p><b>RPO = 5 minutes</b> (data loss allowed). <b>RTO = 30 minutes</b> (downtime allowed). Nightly backups give an RPO of up to 24 hours, so backups alone ' + H.c('r', 'cannot meet this') + '.</p>',
  weak: 'Azure is highly available, so we are covered. We also take a database backup every night.',
  why: 'The platform keeps its own services running, but a single-region design still has one region of failure. A nightly backup can lose a full day of data and a restore into a new region takes hours, so both numbers are missed.',
  q: ['Which number tells you how often data must be copied to the second region?', ['RTO', 'RPO', 'SLA', 'SLI'], 1, 'RPO is the maximum data loss measured in time. A 5-minute RPO needs continuous replication, not periodic backups.'],
  h: ['Translate each number into a requirement: 5 minutes of data means continuous replication; 30 minutes of downtime means the second region must already exist.', 'Go through each part: compute, database, files, secrets, traffic routing. Each needs a second-region story.', 'Recipe: active-passive in a second region, SQL failover group, geo-redundant storage, a second vault, Front Door for routing, everything from infrastructure code, and a failover drill twice a year.'],
  a: '<p>I would build <b>active-passive across two regions</b>. Active-active is more than these numbers need and costs much more.</p><ul><li><b>Traffic:</b> Front Door in front with health probes, so users move to the second region when the first fails its probe.</li><li><b>Compute:</b> the same Function App deployed to both regions from the same pipeline and the same infrastructure files. The passive side runs at minimum scale.</li><li><b>Database:</b> an Azure SQL <b>failover group</b> with a readable secondary. Replication is asynchronous with lag normally measured in seconds, which fits a 5-minute RPO. The app uses the failover group listener name, so no connection string changes.</li><li><b>Files:</b> geo-redundant storage, with the app able to use the secondary.</li><li><b>Secrets:</b> a vault in each region, filled by the pipeline.</li><li><b>Inside each region:</b> zone-redundant options, so a single datacentre failure never needs a failover at all.</li></ul><p><b>Prove it:</b> a written runbook, a failover drill twice a year with the time measured against 30 minutes, and alerts on replication lag. I would also tell the business the cost, roughly 1.5 to 2 times today, so the numbers are a conscious choice.</p>',
  cx: '<p>Trade-off: cost and extra moving parts against the two targets. If the business relaxed RTO to 4 hours, backups plus infrastructure as code in a second region would be enough and far cheaper.</p>',
  f: ['Who decides to fail over, a person or automation?', 'What happens to messages in flight on a queue during failover?']
}));

practice.push(P({
  t: 'The API is slow after yesterday\'s deployment', l: 'Hard', tags: ['troubleshooting', 'performance', 'application insights'],
  s: 'Yesterday at 16:00 your team deployed a release. Since then the 95th percentile response time of the orders API went from 300 ms to 2.4 seconds. Error rate is normal. You are the lead on call. Talk through what you do.',
  ex: '<p>Before 16:00: p95 = <span class="c-g">300 ms</span>. After 16:00: p95 = <span class="c-r">2,400 ms</span>. Errors: unchanged. The start time matches the release exactly.</p>',
  weak: 'I would scale the app out to more instances and see if it gets faster.',
  why: 'Scaling out treats a symptom without a diagnosis. If the cause is a slow query or a slow dependency, more instances send more load at the same slow thing and can make it worse. It also ignores the strongest clue: the timing.',
  q: ['Users are affected now and a release is the clear suspect. What comes first?', ['Finish the root cause analysis', 'Roll back (swap back), then investigate', 'Wait for traffic to drop', 'Add more logging and redeploy'], 1, 'Restore service first. The old version is still in the staging slot, so a swap back takes seconds. The investigation can then happen without users waiting.'],
  h: ['The slowdown starts at the deployment time. What is the fastest way to remove a bad deployment?', 'After service is restored, split the 2.4 seconds: how much is your code and how much is each dependency?', 'Recipe: swap back, diff the release, compare operations and dependencies before and after in Application Insights, check the database plan and indexes, fix, add a regression test and an alert.'],
  a: '<p><b>1. Restore service.</b> The impact is real and the timing points at the release, so I swap the slots back and confirm p95 returns to 300 ms. I tell stakeholders what happened and that we are investigating.</p><p><b>2. What changed?</b> The release diff, config changes and feature flags. I am looking for a new query, a new outgoing call, or a changed setting.</p><p><b>3. Where does the time go?</b> In Application Insights I compare the hour before and after 16:00 by operation name, then open a slow request end to end. If the request is 2.4 seconds and a SQL dependency is 2.1 of them, the search is over.</p><p><b>4. Platform checks</b> if dependencies look fine: instance count, cold starts, throttling responses, connection pool or port exhaustion, a lost Always On or always-ready setting.</p><p><b>5. Database checks</b> if SQL is the slow part: the new query\'s plan, a missing index for a new filter, a query now run once per row, blocking.</p><p><b>6. Fix and prevent:</b> fix on a branch, test under production-like data, add a performance check to the pipeline and an alert on p95, then release again behind a flag.</p>',
  cx: '<p>Order matters more than tools here: restore, then diff, then measure. Guessing first usually costs more time than looking.</p>',
  f: ['What if the release included a database migration, so a swap back is not safe?', 'How would you catch this before production next time?']
}));

practice.push(P({
  t: 'Design a secure, scalable API for a booking product', l: 'Hard', tags: ['architecture', 'saas', 'design'],
  s: 'Design the Azure architecture for the API of a booking product sold to many companies. Expect 50 companies at launch, traffic peaks at lunchtime, and customers ask security questions before they buy. You have 5 minutes at a whiteboard.',
  ex: '<p>Words to notice: ' + H.c('b', '"many companies"') + ' (tenant isolation), ' + H.c('b', '"peaks at lunchtime"') + ' (autoscale), ' + H.c('b', '"security questions"') + ' (identity, secrets, network, audit).</p>',
  weak: 'I would use AKS with microservices, Cosmos DB, Kafka and a service mesh so it can scale to millions of users.',
  why: 'It lists heavy technology for a product with 50 customers and no stated reason for any of it. It says nothing on tenant isolation, secrets or operations, which are the three things the question pointed at.',
  q: ['Which sentence in the question most affects the data design?', ['"peaks at lunchtime"', '"sold to many companies"', '"5 minutes at a whiteboard"', '"50 at launch"'], 1, 'Many companies sharing one system means every query and every cache key must be scoped to a tenant, and you must decide how data is separated.'],
  h: ['Give the answer a fixed shape before the details: edge, compute, data, security, operations, resilience, cost.', 'Choose the simplest managed service at each layer and say what would make you change it later.', 'Add the tenant story: where the tenant id comes from (the token), how every query is filtered by it, and how one tenant is stopped from using all the capacity.'],
  a: '<p>I would say the structure first: edge, compute, data, security, operations, resilience, cost.</p><ol><li><b>Edge:</b> Front Door with a web application firewall, then API Management to validate tokens, apply rate limits <b>per tenant</b> and version the API.</li><li><b>Compute:</b> stateless .NET 10 API on Functions (Flex Consumption with always-ready instances) or Container Apps, autoscaling for the lunchtime peak. Only the gateway can reach it.</li><li><b>Data:</b> Azure SQL, zone-redundant, shared database with a tenant id on every row to start, enforced by a query filter and row-level security. Blob Storage for files, Redis for cache with the tenant id in every key, Service Bus for emails and other background work.</li><li><b>Security:</b> Microsoft Entra ID sign-in, the tenant id taken from the token and never from the request body, managed identities, Key Vault, private endpoints, least-privilege roles, audit logs.</li><li><b>Operations:</b> Application Insights with the tenant id on telemetry, alerts on error rate and latency, infrastructure as code, a pipeline with approvals and slot swaps.</li><li><b>Resilience:</b> retries with backoff, idempotent handlers, dead-letter queues, backups with a tested restore.</li><li><b>Cost:</b> autoscale, budgets, tags per environment.</li></ol><p><b>What would change it:</b> a large customer demanding isolation gets its own database; a regional outage requirement adds a second region.</p>',
  cx: '<p>Trade-off to say out loud: a shared database is cheap and simple but needs strict tenant filtering; a database per tenant isolates better and costs more to run.</p>',
  f: ['How do you prove to a customer that another tenant cannot read their data?', 'How do you stop one tenant\'s bulk import from slowing everyone else?']
}));

// ================= QUIZ =================
quiz.push(
  { q: 'Which level of the Azure hierarchy is the billing boundary?', options: ['Resource group', 'Subscription', 'Management group', 'Region'], answer: 1, explain: 'Costs, quotas and many access decisions are tracked per subscription. A resource group is a life-cycle container inside it.' },
  { q: 'A developer has the Contributor role on a Key Vault that uses role-based access. Can they read a secret value?', options: ['Yes, Contributor can do everything', 'No, reading a secret is a data action and needs a data role', 'Only from the portal', 'Only if the secret is disabled'], answer: 1, explain: 'Contributor covers management actions such as creating or deleting the vault. Reading secret values needs a data role such as Key Vault Secrets User.' },
  { q: 'Which hosting plan is the recommended starting point for a new serverless Function App in 2026?', options: ['The older Consumption plan', 'Flex Consumption', 'A virtual machine', 'App Service Free tier'], answer: 1, explain: 'Flex Consumption scales fast and to zero, supports virtual network integration and offers always-ready instances to reduce cold starts.' },
  { q: 'A queue-triggered function throws an exception. What happens to the message?', options: ['It is deleted', 'It becomes visible again and is retried, up to a limit, then moved aside', 'It is sent back to the sender', 'The Function App stops'], answer: 1, explain: 'Delivery is at least once. After the maximum dequeue count the runtime moves the message to a poison queue so it cannot loop forever.' },
  { q: 'Why must Durable Functions orchestrator code be deterministic?', options: ['Because it runs on several threads', 'Because it is replayed from stored history and must take the same path each time', 'Because it cannot use async code', 'Because it runs only once'], answer: 1, explain: 'After each checkpoint the orchestrator runs again from the top. If it read the clock or a random number directly, the replay would not match the history.' },
  { q: 'Three systems should each be told when a file is uploaded. Which service is the natural fit?', options: ['Event Grid', 'Azure Files', 'Redis', 'Table Storage'], answer: 0, explain: 'Event Grid pushes "something happened" notifications to many subscribers, with retries.' },
  { q: 'What is the main benefit of a managed identity?', options: ['It makes the app faster', 'The app has no stored credential to leak or rotate', 'It removes the need for HTTPS', 'It gives the app admin rights'], answer: 1, explain: 'Azure creates and renews the credential. Access is then granted by assigning roles to that identity.' },
  { q: 'In Application Insights, which piece of data lets you join a request with its dependency calls and exceptions?', options: ['The instance name', 'The operation id shared by every item in that request', 'The resource group name', 'The sampling rate'], answer: 1, explain: 'Distributed tracing stamps every telemetry item in one request with the same operation id, so a single query shows the whole timeline.' },
  { q: 'The business says "we can lose at most 15 minutes of data". Which term is that?', options: ['RTO', 'RPO', 'SLA', 'TPM'], answer: 1, explain: 'Recovery point objective is the tolerated data loss in time. Recovery time objective is the tolerated downtime.' },
  { q: 'In Azure OpenAI, what name does your code pass when it calls a model?', options: ['The subscription name', 'The name of your deployment', 'The region name', 'The resource group name'], answer: 1, explain: 'A deployment is your named, quota-bound instance of a model. Code refers to it, which lets you change the model behind it per environment.' },
  { q: '"Build once, deploy many" means…', options: ['Build a separate package for each environment', 'One artifact is promoted through all environments and only configuration changes', 'Deploy many times a day', 'Build on many agents at once'], answer: 1, explain: 'What was tested is exactly what reaches production. Rebuilding per environment can produce a different package.' },
  { q: 'In an expand-and-contract database change, when is the old column dropped?', options: ['In the first release', 'Together with the backfill', 'In a later release, after no version of the code uses it', 'Never'], answer: 2, explain: 'Old and new code must both work during rollout and rollback. The old structure goes last, once nothing depends on it.' }
);

// ================= INTERVIEW: 1. Azure fundamentals =================
interview.push({
  q: 'How is Azure organised? (tenant, management groups, subscriptions, resource groups, resources)', level: 'B',
  a: `<p>Azure is a tree with 5 levels, and access and rules set at a higher level flow down to everything below it.</p>
<ul><li><b>Tenant:</b> one Microsoft Entra ID directory. It is the identity boundary: users, groups and app identities.</li><li><b>Management group:</b> a folder of subscriptions, for applying policy and access to many at once.</li><li><b>Subscription:</b> the billing boundary, with its own quotas.</li><li><b>Resource group:</b> a container for resources that share a life cycle, such as one app in one environment.</li><li><b>Resource:</b> the thing itself: a Function App, a database, a vault.</li></ul>
<p>Around the tree: Azure Resource Manager is the one management API that the portal, CLI and Bicep all call. Role-based access control gives a role to an identity at a scope. Azure Policy enforces rules such as allowed regions or required tags. Tags and Cost Management tell you who spends what.</p>
<blockquote><b>Say it in the interview:</b> Identity lives in the tenant, policy at management groups, billing at the subscription and life cycle at the resource group. I assign access at the lowest scope that works, because it is inherited downward.</blockquote>`,
  followUps: ['Would you separate test and production by subscription or by resource group?', 'What is the difference between Azure Policy and a role assignment?', 'What can you not do across two tenants?']
});

interview.push({
  q: 'What are regions, availability zones and region pairs?', level: 'B',
  a: `<p>A region is a group of datacentres in one part of the world, and an availability zone is a physically separate part of that region with its own power, cooling and network.</p>
<table><tr><th>Term</th><th>Protects against</th><th>Example use</th></tr>
<tr><td>Availability zone</td><td>One datacentre failing</td><td>Zone-redundant App Service, SQL or storage</td></tr>
<tr><td>Second region</td><td>A whole region failing</td><td>Failover of the app and database</td></tr>
<tr><td>Region pair</td><td>Wide-area events</td><td>Geo-redundant storage copies to the paired region</td></tr></table>
<p>You choose a region for 3 reasons: distance to users (latency), data-residency rules, and which services and prices are available there. Not every region has zones or a pair, so check before you design around them.</p>
<blockquote><b>Say it in the interview:</b> Zones cover a datacentre failure cheaply, so I use zone-redundant options by default. A second region covers a regional failure, and I add it only when the recovery targets need it.</blockquote>`,
  followUps: ['Why not run everything in two regions by default?', 'What decides which region you deploy to?']
});

interview.push({
  q: 'IaaS vs PaaS vs SaaS vs serverless, in Azure terms', level: 'B',
  a: `<p>These are 4 levels of "how much does the cloud provider manage for me", from almost nothing to everything.</p>
<table><tr><th>Model</th><th>You manage</th><th>Azure examples</th></tr>
<tr><td>IaaS</td><td>Operating system, patching, runtime, app</td><td>Virtual Machines, VM Scale Sets</td></tr>
<tr><td>PaaS</td><td>Your app and data</td><td>App Service, Azure SQL, Container Apps</td></tr>
<tr><td>Serverless</td><td>Only your code; scaling is automatic</td><td>Azure Functions, Logic Apps</td></tr>
<tr><td>SaaS</td><td>Nothing; you use the product</td><td>Microsoft 365</td></tr></table>
<p>Serverless does not mean "no servers". It means you do not see or manage them, and you usually pay for what runs. The trade is control for effort: with a virtual machine you can install anything, and you also patch it at 2 am.</p>
<blockquote><b>Say it in the interview:</b> I start with the most managed option that meets the need, usually PaaS or serverless, and only drop to virtual machines when something truly needs operating system control.</blockquote>`,
  followUps: ['Give a case where IaaS is the right answer.', 'Is Container Apps PaaS or serverless?']
});

interview.push({
  q: 'How does role-based access control (RBAC) work in Azure, and what is the control plane vs the data plane?', level: 'I',
  a: `<p>RBAC answers "who can do what, where": you give a role to an identity at a scope.</p>
<ul><li><b>Who:</b> a user, a group, a service principal or a managed identity.</li><li><b>What:</b> a role definition, which is a list of allowed actions. Owner, Contributor and Reader are the broad built-in ones; there are hundreds of narrow ones and you can write custom roles.</li><li><b>Where:</b> a management group, subscription, resource group or single resource. Assignments are inherited downward.</li></ul>
<p>The <b>control plane</b> is managing resources: create a storage account, change a setting. The <b>data plane</b> is using what is inside: read a blob, read a secret, send a message. They are granted separately. That is why Contributor on a vault does not let you read its secrets, and why an app needs a role such as Storage Blob Data Reader, not Reader.</p>
<blockquote><b>Say it in the interview:</b> A role assignment is identity plus role plus scope. I give groups, not individuals, the narrowest role at the lowest scope, and I remember that data access needs its own data roles.</blockquote>`,
  followUps: ['What is the difference between Owner and Contributor?', 'How do you give temporary admin access to production?', 'When would you write a custom role?']
});

interview.push({
  q: 'What are the pillars of the Azure Well-Architected Framework?', level: 'I',
  a: `<p>There are 5 pillars, and they work as a checklist for judging any design: reliability, security, cost optimisation, operational excellence and performance efficiency.</p>
<table><tr><th>Pillar</th><th>What I check</th></tr>
<tr><td>Reliability</td><td>Redundancy, health probes, retries, tested recovery</td></tr>
<tr><td>Security</td><td>Identity, secrets, network exposure, least privilege</td></tr>
<tr><td>Cost optimisation</td><td>Right size, autoscale, budgets, idle resources</td></tr>
<tr><td>Operational excellence</td><td>Infrastructure as code, pipelines, monitoring, runbooks</td></tr>
<tr><td>Performance efficiency</td><td>Caching, async work, scaling limits</td></tr></table>
<p>The pillars pull against each other. A second region helps reliability and hurts cost. So the useful skill is naming the trade-off, not reciting the list.</p>
<blockquote><b>Say it in the interview:</b> I use the 5 pillars as a review checklist, and for each decision I say which pillar it helps and which one it costs.</blockquote>`,
  followUps: ['Give an example where security and performance conflict.', 'Which pillar does your current system serve worst?']
});

interview.push({
  q: 'How do you choose a compute service in Azure?', level: 'A',
  a: `<p>I match the shape of the workload to the most managed service that fits it.</p>
<table><tr><th>Need</th><th>Choose</th></tr>
<tr><td>Web app or API, simple managed hosting</td><td>App Service</td></tr>
<tr><td>Event-driven or bursty work, scale to zero</td><td>Azure Functions</td></tr>
<tr><td>Containers without managing Kubernetes</td><td>Container Apps</td></tr>
<tr><td>Full Kubernetes control, many services</td><td>AKS</td></tr>
<tr><td>One container for a short task</td><td>Container Instances</td></tr>
<tr><td>Static front end with an API</td><td>Static Web Apps</td></tr>
<tr><td>Lift and shift, special operating system needs</td><td>Virtual Machines</td></tr>
<tr><td>Large batch or compute-heavy jobs</td><td>Azure Batch</td></tr></table>
<p>The questions I ask: is the load steady or bursty, how long does one unit of work run, does it need a private network, does the team already ship containers, and who will be on call for it.</p>
<blockquote><b>Say it in the interview:</b> I pick by load pattern and team skill, not by fashion. Steady HTTP goes to App Service or Container Apps, event-driven work goes to Functions, and I only choose AKS when we need Kubernetes itself.</blockquote>`,
  followUps: ['When do Functions become more expensive than App Service?', 'What would make you choose AKS over Container Apps?', 'How does team size change your answer?']
});

// ================= INTERVIEW: 2. Azure Functions =================
interview.push({
  q: 'What is Azure Functions, and what are triggers and bindings?', level: 'B',
  a: `<p>Azure Functions runs a small piece of your code whenever a chosen event happens, without you managing a server.</p>
<ul><li>A <b>trigger</b> is the event that starts the function. Each function has exactly one.</li><li>A <b>binding</b> connects the function to data by declaration, so you write less client code. Input bindings hand data in; output bindings write what you return.</li></ul>
<table><tr><th>Trigger</th><th>Fires when</th><th>Typical use</th></tr>
<tr><td>HTTP</td><td>A request arrives</td><td>REST API</td></tr>
<tr><td>Timer</td><td>A schedule is due</td><td>Cleanup, reports</td></tr>
<tr><td>Queue / Service Bus</td><td>A message arrives</td><td>Background work</td></tr>
<tr><td>Blob</td><td>A file is added</td><td>Document processing</td></tr>
<tr><td>Event Grid / Event Hubs</td><td>An event arrives</td><td>Integration, telemetry</td></tr>
<tr><td>Cosmos DB change feed</td><td>A document changes</td><td>Keeping a read copy up to date</td></tr></table>
<blockquote><b>Say it in the interview:</b> A function is code plus one trigger. Bindings are optional shortcuts for input and output. I use them for simple cases and the SDK client when I need more control over errors and retries.</blockquote>`,
  followUps: ['When would you avoid an output binding and use the SDK?', 'What is the format of a timer schedule?', 'Can one function have two triggers?']
});

interview.push({
  q: 'How do you develop and deploy a Function App? Which commands do you use?', level: 'B',
  a: `<p>You build and run functions locally with the Azure Functions Core Tools, and you deploy with a pipeline (or one command for a quick test).</p>
<pre><code>func init ShopApi --worker-runtime dotnet-isolated --target-framework net10.0
func new --name GetOrder --template "HTTP trigger"
func start                                  # local run on port 7071
func azure functionapp publish func-shop-test
az functionapp config appsettings set -g rg-shop-test -n func-shop-test --settings "Payment__Endpoint=value"</code></pre>
<ul><li><b>Azurite</b> emulates Blob, Queue and Table storage on your machine.</li><li><code>local.settings.json</code> holds local settings and must stay out of Git.</li><li>A double underscore in a setting name maps to a colon in .NET configuration, so <code>Payment__Endpoint</code> is read as <code>Payment:Endpoint</code>.</li></ul>
<blockquote><b>Say it in the interview:</b> I run locally with Core Tools and Azurite, keep settings out of source control, and deploy through the pipeline. The publish command is only for quick experiments.</blockquote>`,
  followUps: ['What goes in local.settings.json and what goes in host.json?', 'How do you debug a queue trigger locally?']
});

interview.push({
  q: 'Explain the hosting plans: Consumption, Flex Consumption, Premium and Dedicated', level: 'I',
  a: `<p>The hosting plan decides how a Function App scales, whether it has cold starts, and how you pay.</p>
<table><tr><th>Plan</th><th>Scaling</th><th>Cold start</th><th>Good for</th></tr>
<tr><td>Flex Consumption</td><td>Fast, per function, to zero</td><td>Reduced with always-ready instances</td><td>New serverless apps; private networking; Linux</td></tr>
<tr><td>Consumption (older)</td><td>To zero</td><td>Yes</td><td>Existing apps; Microsoft advises moving to Flex</td></tr>
<tr><td>Premium</td><td>Pre-warmed instances</td><td>None on warm instances</td><td>Steady low latency, long runs, Windows or containers</td></tr>
<tr><td>Dedicated</td><td>Manual or autoscale rules</td><td>None with Always On</td><td>Spare room on an App Service plan you already pay for</td></tr></table>
<p>Billing follows the same line: the consumption plans charge for executions and memory time, Premium and Dedicated charge for instances whether or not they are busy.</p>
<blockquote><b>Say it in the interview:</b> For new work I start on Flex Consumption with always-ready instances for user-facing HTTP. I move to Premium when I need features Flex does not have, and to Dedicated only when the plan is already paid for.</blockquote>`,
  followUps: ['What does "always ready" cost you?', 'Which plans support virtual network integration?', 'How would you migrate an app off the old Consumption plan?']
});

interview.push({
  q: 'In-process vs isolated worker model for .NET functions: what is the difference and which do you use?', level: 'I',
  a: `<p>In the isolated worker model your function code runs in its own .NET process, separate from the Functions host; in the old in-process model it ran inside the host's process.</p>
<table><tr><th></th><th>In-process (old)</th><th>Isolated worker</th></tr>
<tr><td>.NET version</td><td>Tied to the host</td><td>Any supported version, including .NET 10</td></tr>
<tr><td>Startup</td><td>FunctionsStartup class</td><td>Normal Program.cs with dependency injection</td></tr>
<tr><td>Middleware</td><td>No</td><td>Yes</td></tr>
<tr><td>Attribute</td><td>[FunctionName]</td><td>[Function]</td></tr>
<tr><td>Support</td><td>Ended 10 November 2026</td><td>The supported model</td></tr></table>
<p>Because your process is separate, package versions cannot clash with the host. .NET 8 and .NET 9 reached end of support on the same date, so the target today is .NET 10 on the isolated worker.</p>
<blockquote><b>Say it in the interview:</b> I use the isolated worker model on .NET 10. It gives me normal dependency injection and middleware, and the in-process model is out of support.</blockquote>`,
  followUps: ['What did you have to change when migrating from in-process?', 'How do you add middleware for a correlation id?']
});

interview.push({
  q: 'Cold start, scaling and concurrency in Functions: what do you say?', level: 'A',
  a: `<p>A cold start is the delay when no warm instance exists; scaling is the platform adding instances as load grows; concurrency is how much work one instance takes at once. All three need limits that you choose.</p>
<ul><li><b>Cold start:</b> use always-ready instances (Flex) or Premium, keep the package small, create heavy clients lazily, reuse <code>HttpClient</code> and SDK clients as singletons, publish with ReadyToRun.</li><li><b>Scale-out:</b> the scale controller adds instances from trigger load: HTTP concurrency, queue length, event backlog.</li><li><b>Concurrency:</b> the real limit is usually downstream: database connections or a partner's rate limit. Control it in host.json and with a maximum instance count.</li><li><b>Statelessness:</b> instances come and go, so keep state in storage or a cache.</li></ul>
<pre><code>"extensions": {
  "http":   { "maxConcurrentRequests": 100 },
  "queues": { "batchSize": 8, "maxDequeueCount": 5 }
}</code></pre>
<blockquote><b>Say it in the interview:</b> I size the function to what its weakest dependency can take. Cold start matters for user-facing HTTP, where I keep warm instances; for queues it rarely matters.</blockquote>`,
  followUps: ['Your function exhausted outbound connections. Why, and how do you fix it?', 'How do you limit the maximum number of instances?', 'Why is a static in-memory cache risky here?']
});

interview.push({
  q: 'How do you handle errors and reliability in Functions?', level: 'A',
  a: `<p>It depends on the trigger: for HTTP you return a clear error to the caller, and for messages you let the platform retry and make the handler safe to run twice.</p>
<table><tr><th>Trigger</th><th>What I do</th></tr>
<tr><td>HTTP</td><td>Map exceptions to status codes in middleware, return one consistent error body, log with a correlation id. No automatic retry.</td></tr>
<tr><td>Storage Queue</td><td>An exception makes the message retry. After maxDequeueCount it goes to the poison queue.</td></tr>
<tr><td>Service Bus</td><td>Same idea with max delivery count and a dead-letter queue.</td></tr>
<tr><td>Timer</td><td>Retry policy in code or attributes; the next schedule is a second chance.</td></tr>
<tr><td>Multi-step work</td><td>Durable Functions, which checkpoints each step.</td></tr></table>
<p>Two rules cover most of it. Delivery is <b>at least once</b>, so handlers must be idempotent. And a message that keeps failing must end up somewhere <b>visible</b>, with an alert.</p>
<blockquote><b>Say it in the interview:</b> I never swallow exceptions in a message handler. I let it retry, I make the handler idempotent, and I alert on the poison or dead-letter queue.</blockquote>`,
  followUps: ['How do you make a handler idempotent?', 'How do you replay messages from a dead-letter queue?', 'When would you catch the exception and not retry?']
});

interview.push({
  q: 'How do you secure an Azure Function App?', level: 'A',
  a: `<p>In layers: prove who is calling, keep secrets out of the app, close the network, and give the app's own identity only what it needs.</p>
<ol><li><b>Authentication:</b> validate Microsoft Entra ID tokens in middleware, or use built-in App Service authentication, or put API Management in front. Do not leave anonymous endpoints open by accident. Function keys are shared passwords, not user identity.</li><li><b>Secrets:</b> Key Vault references in app settings, resolved with a managed identity.</li><li><b>Network:</b> access restrictions or private endpoints for inbound, virtual network integration for outbound, a web application firewall in front of public APIs.</li><li><b>Transport and browser:</b> HTTPS only, a modern minimum TLS version, CORS limited per environment.</li><li><b>Least privilege:</b> the managed identity gets narrow roles, for example Key Vault Secrets User on one vault.</li></ol>
<blockquote><b>Say it in the interview:</b> Identity at the door with Entra tokens, secrets in Key Vault through a managed identity, private networking to data, and narrow roles for the app itself.</blockquote>`,
  followUps: ['Is AuthorizationLevel.Function enough for a public API?', 'How do you stop callers bypassing the gateway?', 'How do you check roles or scopes inside the function?']
});

interview.push({
  q: 'Durable Functions: when do you use them and which patterns do you know?', level: 'E',
  a: `<p>Durable Functions let you write a long, multi-step workflow as ordinary code, and the platform remembers where it got to even if the app restarts.</p>
<table><tr><th>Pattern</th><th>Use</th></tr>
<tr><td>Function chaining</td><td>Step 1, then 2, then 3</td></tr>
<tr><td>Fan-out / fan-in</td><td>Run many activities in parallel, then combine</td></tr>
<tr><td>Async HTTP API</td><td>Start a long job, return 202 with a status address</td></tr>
<tr><td>Monitor</td><td>Poll until a condition is true</td></tr>
<tr><td>Human interaction</td><td>Wait for an approval event, with a timeout</td></tr></table>
<pre><code>var items = await ctx.CallActivityAsync&lt;string[]&gt;("ListInvoices", input);
var tasks = items.Select(i =&gt; ctx.CallActivityAsync&lt;string&gt;("CheckInvoice", i));
var results = await Task.WhenAll(tasks);   // fan-out, fan-in</code></pre>
<p>The orchestrator is <b>replayed</b> from a stored history after every await, so its code must be deterministic: no <code>DateTime.Now</code>, no random numbers, no direct I/O. Use <code>ctx.CurrentUtcDateTime</code> and put real work in activities.</p>
<blockquote><b>Say it in the interview:</b> I use Durable Functions when a workflow has several steps, waits, or parallel work that must survive restarts. The key rule is that orchestrators only coordinate and activities do the work.</blockquote>`,
  followUps: ['What happens if you change orchestrator code while instances are running?', 'How do you cap parallelism in a fan-out of 10,000 items?', 'Durable Functions or Logic Apps or a Service Bus saga?']
});

// ================= INTERVIEW: 3. Static Web Apps, App Service, containers =================
interview.push({
  q: 'Containers: what are the Docker basics, and where do containers run in Azure?', level: 'B',
  a: `<p>A container packages an app with everything it needs to run, so it behaves the same on a laptop and in the cloud.</p>
<ul><li>An <b>image</b> is the template; a <b>container</b> is a running copy of it.</li><li>Images are built in <b>layers</b>, and unchanged layers are cached.</li><li>A <b>multi-stage build</b> compiles with the big SDK image and ships only the small runtime image.</li></ul>
<pre><code>FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY . .
RUN dotnet publish src/Api/Api.csproj -c Release -o /app
FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app .
USER app
ENTRYPOINT ["dotnet", "Api.dll"]</code></pre>
<p>You push the image to Azure Container Registry and run it on <b>Container Apps</b> (scaling and revisions handled for you) or <b>AKS</b> (full Kubernetes: pods, deployments, services, ingress, probes).</p>
<blockquote><b>Say it in the interview:</b> I build small multi-stage images that run as a non-root user, store them in a private registry, and run them on Container Apps unless we truly need Kubernetes-level control.</blockquote>`,
  followUps: ['Why run as a non-root user?', 'What do readiness and liveness probes do?', 'How does Container Apps decide when to scale?']
});

interview.push({
  q: 'How does Azure Static Web Apps host a React or Angular single-page app?', level: 'I',
  a: `<p>Static Web Apps serves your built HTML, JavaScript and CSS from locations around the world, and wires up build and deploy from your repository.</p>
<ul><li>A <b>preview environment per pull request</b>, so reviewers can click through the change.</li><li>Built-in sign-in providers and role-based routes.</li><li>Routing rules and headers in <code>staticwebapp.config.json</code>.</li><li>An API can be linked behind <code>/api</code>.</li></ul>
<pre><code>{
  "navigationFallback": { "rewrite": "/index.html", "exclude": ["/assets/*", "/api/*"] },
  "routes": [ { "route": "/admin/*", "allowedRoles": ["admin"] } ],
  "globalHeaders": { "X-Content-Type-Options": "nosniff" }
}</code></pre>
<p>Two things specific to single-page apps: client-side routes need the <b>navigation fallback</b>, or a refresh gives 404; and settings are baked in at <b>build time</b>, so each environment needs its own build of the front end or a small config file loaded at run time.</p>
<blockquote><b>Say it in the interview:</b> Static Web Apps gives me global hosting, pull request previews and routing rules in one config file. The two traps are the navigation fallback and build-time environment settings.</blockquote>`,
  followUps: ['How do you keep "build once" for a front end with build-time settings?', 'Where would you set a Content Security Policy?', 'When would you use Blob static website hosting plus Front Door instead?']
});

interview.push({
  q: 'What are the App Service essentials a lead should know?', level: 'I',
  a: `<p>App Service is managed web hosting, and the feature that matters most for releases is the deployment slot.</p>
<ul><li><b>Deployment slots:</b> deploy to a staging slot, warm it up, then swap with production. Rollback is a swap back.</li><li><b>Slot settings:</b> settings marked to stay with the slot do not move in a swap, for example a staging database connection.</li><li><b>Autoscale rules</b> on metrics or a schedule.</li><li><b>Always On</b> keeps the app loaded.</li><li><b>Health check path:</b> unhealthy instances are taken out of rotation.</li><li>Managed certificates, custom domains, WebJobs for background tasks, virtual network integration.</li></ul>
<p>A swap gives near-zero-downtime releases, but only if database changes are backward compatible, because the old and new code share one database during and after the swap.</p>
<blockquote><b>Say it in the interview:</b> I release through a staging slot with a warm-up and a smoke test, then swap. Rollback is a swap back, which only works because I keep database changes backward compatible.</blockquote>`,
  followUps: ['What exactly happens during a swap?', 'Which settings should be slot settings?', 'How do you scale up versus scale out?']
});

// ================= INTERVIEW: 4. Storage, messaging and data =================
interview.push({
  q: 'How do you choose a storage or data service in Azure?', level: 'B',
  a: `<p>You match the shape of the data and how it is read to the service built for that shape.</p>
<table><tr><th>Service</th><th>Model</th><th>Use</th></tr>
<tr><td>Blob Storage</td><td>Files (objects)</td><td>Documents, images, backups</td></tr>
<tr><td>Table Storage</td><td>Simple key and value rows</td><td>Cheap lookups, job state</td></tr>
<tr><td>Queue Storage</td><td>Simple queue</td><td>Basic background work</td></tr>
<tr><td>Azure Files</td><td>Shared network drive</td><td>Lift and shift of apps that expect a file share</td></tr>
<tr><td>Azure SQL Database</td><td>Relational</td><td>Transactions, joins, reporting</td></tr>
<tr><td>Cosmos DB</td><td>JSON documents, global</td><td>Low latency worldwide, flexible shape</td></tr>
<tr><td>Redis</td><td>In memory</td><td>Caching, sessions, rate limits</td></tr>
<tr><td>Azure AI Search</td><td>Search index: keyword, vector, hybrid</td><td>Full-text search, retrieval for AI answers</td></tr></table>
<p>The questions that decide it: do I need transactions across rows, how will I query it, how big and how global is it, and what does it cost at rest.</p>
<blockquote><b>Say it in the interview:</b> Relational data with transactions goes to Azure SQL, files go to Blob, hot lookups go to Redis. I reach for Cosmos DB only when I need global scale or a flexible document shape.</blockquote>`,
  followUps: ['When is Table Storage enough and Cosmos DB too much?', 'Why not store files in the SQL database?', 'What makes you choose Cosmos DB over Azure SQL?']
});

interview.push({
  q: 'What are the storage redundancy options and blob access tiers?', level: 'B',
  a: `<p>Redundancy is how many copies Azure keeps and where; access tiers are how cheaply a blob is stored in exchange for how costly it is to read.</p>
<table><tr><th>Redundancy</th><th>Copies</th><th>Survives</th></tr>
<tr><td>LRS (locally redundant)</td><td>3 in one datacentre</td><td>Disk or rack failure</td></tr>
<tr><td>ZRS (zone-redundant)</td><td>3 across zones in one region</td><td>A datacentre failure</td></tr>
<tr><td>GRS (geo-redundant)</td><td>3 local + 3 in a second region</td><td>A region failure</td></tr>
<tr><td>GZRS</td><td>Zones + a second region</td><td>Both</td></tr></table>
<table><tr><th>Tier</th><th>For</th></tr>
<tr><td>Hot</td><td>Data read often</td></tr>
<tr><td>Cool / Cold</td><td>Data read rarely; cheaper to keep, dearer to read, with minimum keep periods</td></tr>
<tr><td>Archive</td><td>Offline; takes hours to bring back</td></tr></table>
<p>Lifecycle rules can move blobs between tiers by age automatically.</p>
<blockquote><b>Say it in the interview:</b> I pick redundancy from the recovery targets, usually zone-redundant for production, and I use lifecycle rules to move old blobs to cooler tiers so storage cost falls on its own.</blockquote>`,
  followUps: ['Can you read from the second region with GRS?', 'What is the catch with the archive tier?']
});

interview.push({
  q: 'Service Bus vs Event Grid vs Event Hubs vs Storage Queue: how do you choose?', level: 'I',
  a: `<p>They solve 4 different problems: reliable business messages, notifications that something happened, very large streams, and cheap simple queues.</p>
<table><tr><th></th><th>Service Bus</th><th>Event Grid</th><th>Event Hubs</th><th>Storage Queue</th></tr>
<tr><td>Pattern</td><td>Messaging (commands)</td><td>Event notification</td><td>High-volume stream</td><td>Simple queue</td></tr>
<tr><td>Ordering</td><td>Yes, with sessions</td><td>No</td><td>Within a partition</td><td>No</td></tr>
<tr><td>Dead-letter</td><td>Yes, plus duplicate detection</td><td>Retry, then dead-letter</td><td>Not applicable; you re-read</td><td>Poison queue by convention</td></tr>
<tr><td>Message size</td><td>256 KB, far larger on Premium</td><td>Small events</td><td>Batches</td><td>64 KB</td></tr>
<tr><td>Choose when</td><td>Workflows that must not lose work</td><td>"Something happened", fan-out</td><td>Telemetry, logs, devices</td><td>Cheap, simple tasks</td></tr></table>
<p>First decide what you are sending. A <b>command</b> has one intended handler and must be done. An <b>event</b> is a fact that zero or many listeners may care about.</p>
<blockquote><b>Say it in the interview:</b> Commands go on Service Bus, notifications go through Event Grid, streams go to Event Hubs, and a Storage Queue is fine when I just need cheap background work.</blockquote>`,
  followUps: ['Can you combine Event Grid and Service Bus?', 'How do consumer groups work in Event Hubs?', 'What would make you pick Kafka instead?']
});

interview.push({
  q: 'In Service Bus, what is the difference between a queue and a topic, and what are sessions and the dead-letter queue?', level: 'I',
  a: `<p>A queue delivers each message to one receiver; a topic copies each message to every subscription, so several systems each get their own copy.</p>
<ul><li><b>Queue:</b> point to point. Competing consumers share the work.</li><li><b>Topic and subscriptions:</b> publish and subscribe. Each subscription can have a <b>filter</b>, for example only orders above a value.</li><li><b>Peek-lock:</b> the receiver locks a message, processes it, then completes it. If it fails or the lock expires, the message returns.</li><li><b>Dead-letter queue:</b> after the max delivery count (10 by default) the message is moved aside with a reason, so it does not block the rest.</li><li><b>Sessions:</b> messages with the same session id are handled in order by one receiver at a time. This gives first-in-first-out per customer or per order.</li><li><b>Duplicate detection:</b> a repeat of the same message id within a time window is dropped.</li></ul>
<blockquote><b>Say it in the interview:</b> Queue for one handler, topic for many. I use sessions when order matters per key, and I always monitor the dead-letter queue because that is where failed work hides.</blockquote>`,
  followUps: ['Does duplicate detection give you exactly-once processing?', 'What happens if processing takes longer than the lock?', 'What is the outbox pattern and why pair it with Service Bus?']
});

interview.push({
  q: 'Show the cache-aside pattern with Redis in .NET. What can go wrong with a cache?', level: 'A',
  a: `<p>Cache-aside means the app looks in the cache first, reads the database only on a miss, and then stores the result in the cache with an expiry.</p>
<pre><code>var key = $"product:{id}";
var cached = await _cache.GetStringAsync(key, ct);
if (cached is not null) return JsonSerializer.Deserialize&lt;ProductDto&gt;(cached);

var dto = await _repo.GetAsync(id, ct);
if (dto is not null)
    await _cache.SetStringAsync(key, JsonSerializer.Serialize(dto),
        new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5) }, ct);
return dto;
// on write: await _cache.RemoveAsync(key);</code></pre>
<p>Problems to name:</p>
<ul><li><b>Stampede:</b> many requests rebuild the same expired key at once. Use a lock per key or <code>HybridCache</code>, which protects against it.</li><li><b>Stale data:</b> remove the key on write and keep expiry short.</li><li><b>Tenant isolation:</b> put the tenant id in the key.</li><li><b>Per-user data</b> must never sit under a shared key.</li><li><b>Cache down:</b> the app should fall back to the database, not fail.</li></ul>
<blockquote><b>Say it in the interview:</b> I use cache-aside with a short expiry and remove the key on writes. I plan for stampedes, stale data and tenant-safe keys, and the app must still work if the cache is unavailable.</blockquote>`,
  followUps: ['What is HybridCache and what does it add over IDistributedCache?', 'How do you invalidate many related keys at once?', 'What should you never cache?']
});

interview.push({
  q: 'In Cosmos DB, how do you choose a partition key, and what are the consistency levels?', level: 'E',
  a: `<p>The partition key decides how Cosmos DB spreads your data across servers, and a bad choice cannot be fixed without moving the data, so it is the most important design decision.</p>
<p>A good key:</p>
<ul><li>has <b>many distinct values</b>, so data and load spread evenly (no "hot" partition);</li><li>appears in <b>most queries</b>, so a read goes to one partition, which is cheap; a query across all partitions costs far more request units;</li><li>keeps each logical partition <b>under the size limit</b> (20 GB).</li></ul>
<p>For a multi-tenant app, tenant id is a natural start; if one tenant is huge, use a hierarchical key such as tenant id then user id.</p>
<table><tr><th>Consistency</th><th>Meaning</th></tr>
<tr><td>Strong</td><td>Always the latest write; slowest and least available</td></tr>
<tr><td>Bounded staleness</td><td>Behind by at most a set amount</td></tr>
<tr><td>Session (default)</td><td>You always read your own writes</td></tr>
<tr><td>Consistent prefix</td><td>Never out of order, may be behind</td></tr>
<tr><td>Eventual</td><td>Fastest; may be briefly out of date or out of order</td></tr></table>
<blockquote><b>Say it in the interview:</b> I pick the partition key from the main query and check it spreads load evenly. I keep session consistency unless there is a clear reason, because it gives read-your-own-writes at a good price.</blockquote>`,
  followUps: ['What is a request unit and how do you bring the cost of a query down?', 'How would you fix a hot partition in a live system?', 'What does the change feed give you?']
});

// ================= INTERVIEW: 5. Security and configuration =================
interview.push({
  q: 'Explain Key Vault, managed identity and App Configuration, and how they fit together', level: 'I',
  a: `<p>Key Vault keeps secrets safe, a managed identity lets the app prove who it is without a password, and App Configuration holds the ordinary settings.</p>
<ul><li><b>Key Vault:</b> stores secrets, keys and certificates. Access by role-based access (preferred) or the older access policies. Soft delete and purge protection stop accidental loss. Every read is logged.</li><li><b>Managed identity:</b> an identity Azure creates and renews for a resource. <i>System-assigned</i> lives and dies with one resource. <i>User-assigned</i> is separate and can be shared by several.</li><li><b>App Configuration:</b> non-secret settings and feature flags, with labels per environment. It can point to Key Vault for anything secret.</li></ul>
<pre><code>builder.Configuration.AddAzureKeyVault(new Uri(vaultUri), new DefaultAzureCredential());
var key = builder.Configuration["PaymentApiKey"];</code></pre>
<pre><code>az role assignment create --assignee &lt;identity-principal-id&gt; --role "Key Vault Secrets User" --scope &lt;vault-resource-id&gt;</code></pre>
<blockquote><b>Say it in the interview:</b> Settings in App Configuration, secrets in Key Vault, and the app reads both with a managed identity that has only the roles it needs. No secret lives in code or in the pipeline.</blockquote>`,
  followUps: ['When do you choose a user-assigned identity?', 'How does a Key Vault reference in app settings work?', 'How do feature flags refresh without a restart?']
});

interview.push({
  q: 'What is DefaultAzureCredential and how does it work locally and in Azure?', level: 'I',
  a: `<p><code>DefaultAzureCredential</code> is a helper that tries several ways of signing in, in order, and uses the first one that works, so the same code runs on a laptop and in Azure.</p>
<table><tr><th>Where</th><th>What it usually finds</th></tr>
<tr><td>In Azure</td><td>The managed identity of the app</td></tr>
<tr><td>In a pipeline or Kubernetes</td><td>Environment variables or workload identity</td></tr>
<tr><td>On a laptop</td><td>Your own sign-in from Visual Studio or the Azure CLI</td></tr></table>
<p>Things to know:</p>
<ul><li>Locally it acts as <b>you</b>, so you need the same data roles the app has.</li><li>The first token request can be slow while it walks the chain.</li><li>With several user-assigned identities attached, give it the client id of the one to use.</li><li>In production some teams use <code>ManagedIdentityCredential</code> directly, so the app can never pick up an unexpected credential.</li></ul>
<blockquote><b>Say it in the interview:</b> It is a chain of credential sources. Locally it uses my developer sign-in and in Azure it uses the managed identity, so there is no secret in either place.</blockquote>`,
  followUps: ['It works locally but fails in Azure with 403. What do you check?', 'Why might you avoid it in production code?']
});

interview.push({
  q: 'What is API Management (APIM) and what does it give you?', level: 'I',
  a: `<p>API Management is a gateway that sits in front of your APIs and handles the jobs every API needs, so each API does not rebuild them.</p>
<ul><li>Token validation (<code>validate-jwt</code>)</li><li>Rate limits and quotas</li><li>Request and response changes, such as adding headers</li><li>Response caching</li><li>Versioning and revisions</li><li>A developer portal and usage analytics</li></ul>
<pre><code>&lt;inbound&gt;
  &lt;validate-jwt header-name="Authorization" failed-validation-httpcode="401"&gt;
    &lt;openid-config url="{tenant-metadata-address}" /&gt;
    &lt;audiences&gt;&lt;audience&gt;api://{api-client-id}&lt;/audience&gt;&lt;/audiences&gt;
  &lt;/validate-jwt&gt;
  &lt;rate-limit-by-key calls="100" renewal-period="60"
      counter-key="@(context.Request.IpAddress)" /&gt;
&lt;/inbound&gt;</code></pre>
<p>Policies run in order on the way in and on the way out. The backend should accept traffic only from the gateway, or callers can simply go around it.</p>
<blockquote><b>Say it in the interview:</b> APIM gives me one place for token checks, rate limits, versioning and analytics. I still validate authorisation in the API itself, because the gateway is a first line, not the only line.</blockquote>`,
  followUps: ['How do you rate-limit per customer and not per IP address?', 'How do you stop traffic bypassing APIM?', 'What is the difference between a version and a revision?']
});

interview.push({
  q: 'What are the network security building blocks in Azure?', level: 'A',
  a: `<p>They are the parts you use to decide what can talk to what: a private network, rules on it, and guarded entry points.</p>
<table><tr><th>Block</th><th>Job</th></tr>
<tr><td>Virtual network and subnets</td><td>Your private address space, split into zones</td></tr>
<tr><td>Network security group</td><td>Allow and deny rules on a subnet</td></tr>
<tr><td>Private endpoint</td><td>A private IP for a managed service</td></tr>
<tr><td>Virtual network integration</td><td>Outbound calls from App Service or Functions into the network</td></tr>
<tr><td>Azure Firewall</td><td>Central control of outbound traffic</td></tr>
<tr><td>Front Door / Application Gateway with WAF</td><td>Guarded HTTP entry; blocks common web attacks</td></tr>
<tr><td>DDoS protection</td><td>Absorbs flooding attacks</td></tr>
<tr><td>Bastion</td><td>Safe admin access to machines with no public IP</td></tr></table>
<p>A typical internet-facing API: Front Door with a web application firewall → API Management → Functions or App Service that only accepts the gateway → private endpoints to SQL and Key Vault.</p>
<blockquote><b>Say it in the interview:</b> Public traffic enters through one guarded door with a firewall, the compute only accepts the gateway, and data services have private endpoints with public access switched off.</blockquote>`,
  followUps: ['Front Door or Application Gateway: when each?', 'How does the function reach a database that has no public access?', 'What does private networking do to your pipeline?']
});

interview.push({
  q: 'Private endpoint vs service endpoint: what is the difference?', level: 'A',
  a: `<p>A private endpoint gives the service a private address inside your network; a service endpoint leaves the service on its public address but only lets chosen subnets in.</p>
<table><tr><th></th><th>Private endpoint</th><th>Service endpoint</th></tr>
<tr><td>Address of the service</td><td>A private IP in your subnet</td><td>Still the public address</td></tr>
<tr><td>Public access</td><td>Can be switched off completely</td><td>Limited by firewall rules to your subnets</td></tr>
<tr><td>From on-premises</td><td>Works over VPN or ExpressRoute</td><td>Does not</td></tr>
<tr><td>DNS</td><td>Needs a private DNS zone</td><td>No change</td></tr>
<tr><td>Cost</td><td>Charged per endpoint and data</td><td>Free</td></tr></table>
<p>The usual trap with private endpoints is DNS. The normal host name must resolve to the private IP from inside the network. If the private DNS zone is missing or not linked, the app resolves the public address and is refused.</p>
<blockquote><b>Say it in the interview:</b> I use private endpoints for data services in production because public access can be turned off entirely. The thing I check first when it fails is private DNS.</blockquote>`,
  followUps: ['An app gets "public network access is disabled" after you add a private endpoint. Why?', 'How do build agents reach a private-only resource?']
});

// ================= INTERVIEW: 6. Monitoring and operations =================
interview.push({
  q: 'Application Insights, Azure Monitor and Log Analytics: what is what?', level: 'B',
  a: `<p>Azure Monitor is the overall monitoring platform, Log Analytics is where logs are stored and queried, and Application Insights is the part that watches your application.</p>
<ul><li><b>Azure Monitor:</b> the umbrella for metrics, logs, alerts and dashboards across all resources.</li><li><b>Log Analytics workspace:</b> the log store. You query it with KQL.</li><li><b>Application Insights:</b> requests, dependency calls, exceptions, traces, custom events, live metrics, availability tests and distributed tracing.</li><li><b>OpenTelemetry:</b> the vendor-neutral standard for instrumenting code. The Azure Monitor distro sends that data to Application Insights.</li></ul>
<pre><code>requests
| where timestamp &gt; ago(1h) and success == false
| summarize failures = count() by resultCode, name
| order by failures desc</code></pre>
<blockquote><b>Say it in the interview:</b> Azure Monitor is the platform, Log Analytics is the store I query with KQL, and Application Insights gives me requests, dependencies and exceptions for my app, linked by one operation id.</blockquote>`,
  followUps: ['What is the difference between a metric and a log?', 'What is sampling and when does it mislead you?', 'Which custom events would you track?']
});

interview.push({
  q: 'Health checks, alerts, and SLI, SLO, SLA: explain them', level: 'I',
  a: `<p>Health checks tell the platform whether an instance should get traffic, alerts tell people something is wrong, and SLI, SLO and SLA are the measurement, the target and the contract.</p>
<ul><li><b>Liveness:</b> is the process alive? If not, restart it.</li><li><b>Readiness:</b> can it serve traffic now? If not, stop routing to it.</li><li><b>Alerts:</b> on error rate, 95th percentile latency, queue depth and dead-letter count, sent through action groups to chat, email or an on-call tool. Alert on what users feel, not only on CPU.</li></ul>
<table><tr><th>Term</th><th>Meaning</th><th>Example</th></tr>
<tr><td>SLI</td><td>What you measure</td><td>Share of requests under 500 ms</td></tr>
<tr><td>SLO</td><td>Your internal target</td><td>99.9% over 30 days</td></tr>
<tr><td>SLA</td><td>A contract with consequences</td><td>Credit if below 99.5%</td></tr></table>
<p>The gap between 100% and the SLO is the <b>error budget</b>. If it is used up, slow releases and fix reliability.</p>
<blockquote><b>Say it in the interview:</b> I alert on symptoms users feel, keep liveness checks simple, and use an SLO with an error budget so release pace is a shared, numeric decision.</blockquote>`,
  followUps: ['Why should a liveness check not call the database?', 'How do you avoid alert fatigue?', 'How do you pick the first SLO for a new service?']
});

interview.push({
  q: 'How do you trace one request across several services?', level: 'A',
  a: `<p>Every service passes along a shared trace id, and each piece of telemetry is stamped with it, so one query can show the whole journey.</p>
<ol><li>The first service creates a trace id and sends it on in the <code>traceparent</code> header (the W3C Trace Context standard).</li><li>Each service records its own request and its outgoing calls (dependencies) with that id. The SDKs do this automatically for HTTP, and for Service Bus messages too.</li><li>In Application Insights the id appears as <code>operation_Id</code>, and the end-to-end view draws the timeline.</li></ol>
<pre><code>union requests, dependencies, exceptions, traces
| where operation_Id == "&lt;id&gt;"
| order by timestamp asc</code></pre>
<p>What breaks it: a hop that drops the header (a custom queue message, a background thread), or services sending to different stores. I also add a business id, such as order id, as a custom property so support can search by something a user knows.</p>
<blockquote><b>Say it in the interview:</b> I rely on W3C trace context so every hop shares one operation id, and I make sure queues and background jobs carry it too. Then one KQL query shows the whole request.</blockquote>`,
  followUps: ['How do you carry the trace across a queue?', 'How do you return a correlation id to the user in an error?', 'What does sampling do to a trace?']
});

interview.push({
  q: 'How do you design for high availability and disaster recovery?', level: 'A',
  a: `<p>You first agree how much downtime and data loss the business can accept, and then choose the cheapest design that meets those numbers.</p>
<ul><li><b>RPO:</b> how much data you may lose, in time.</li><li><b>RTO:</b> how long you may be down.</li></ul>
<table><tr><th>Failure</th><th>Defence</th></tr>
<tr><td>One instance</td><td>More than one instance, health checks</td></tr>
<tr><td>One datacentre</td><td>Availability zones: zone-redundant App Service, SQL, ZRS storage</td></tr>
<tr><td>One region</td><td>A second region behind Front Door or Traffic Manager; geo-redundant storage; SQL failover groups; Cosmos DB multi-region</td></tr>
<tr><td>Bad data or deletion</td><td>Backups with point-in-time restore, soft delete</td></tr></table>
<p>Multi-region can be active-passive (cheaper, short failover) or active-active (no failover, much harder data story). Keep infrastructure as code so the second environment can be recreated, and <b>test the restore and the failover</b>.</p>
<blockquote><b>Say it in the interview:</b> I start from RPO and RTO, use zones by default, add a second region only when the targets need it, and I do not count a recovery plan until it has been tested.</blockquote>`,
  followUps: ['Active-active or active-passive: how do you decide?', 'How often do you run a failover drill?', 'What does replication not protect you from?']
});

// ================= INTERVIEW: 7. Azure OpenAI and Microsoft Foundry =================
interview.push({
  q: 'What are Azure OpenAI and Microsoft Foundry, and how are they related?', level: 'I',
  a: `<p>Azure OpenAI gives you OpenAI's models as an Azure service, and Microsoft Foundry is the larger platform around it for building AI apps and agents.</p>
<ul><li><b>Azure OpenAI:</b> chat, embedding, image and audio models, with Azure identity, private networking, regional data-processing choices and content filtering.</li><li><b>Microsoft Foundry</b> (earlier branded Azure AI Foundry): a model catalogue from OpenAI and other providers, projects to organise work, an agent service for hosted agents with tools, plus evaluation, tracing and safety tooling.</li><li><b>Resource and deployment:</b> you create a resource, then a <b>deployment</b>: a named, versioned instance of a model with its own quota. Your code calls the deployment name, not the model name.</li></ul>
<p>Because the app refers to a deployment, each environment can point at a different model, and you can change model without changing code. Names and APIs in this area move fast (for example the Responses API alongside Chat Completions), so check the current documentation before an interview.</p>
<blockquote><b>Say it in the interview:</b> Azure OpenAI is the model service and Foundry is the platform around it. My code targets a deployment name, so the model is a per-environment configuration choice based on cost, latency and quality.</blockquote>`,
  followUps: ['Why does a deployment have a quota?', 'How do you choose which model to deploy?', 'What stays in your tenant and what is sent to the model?']
});

interview.push({
  q: 'How do you call Azure OpenAI from C# with a managed identity?', level: 'I',
  a: `<p>You create a client with the endpoint and a credential, not an API key, then ask for a chat client by deployment name and send messages.</p>
<pre><code>var client = new AzureOpenAIClient(new Uri(endpoint), new DefaultAzureCredential());
ChatClient chat = client.GetChatClient("chat-prod");      // deployment name

var messages = new List&lt;ChatMessage&gt;
{
    new SystemChatMessage("Return JSON only."),
    new UserChatMessage(userText)
};
ChatCompletion result = await chat.CompleteChatAsync(messages,
    new ChatCompletionOptions { Temperature = 0.1f, MaxOutputTokenCount = 800 });
string text = result.Content[0].Text;

await foreach (var update in chat.CompleteChatStreamingAsync(messages))
    foreach (var part in update.ContentUpdate) Console.Write(part.Text);</code></pre>
<ul><li>The app's identity needs a data role on the resource, such as Cognitive Services OpenAI User.</li><li>Register the client once as a singleton.</li><li>SDK shapes change between versions. The stable ideas are: endpoint, credential, deployment name, messages, options, streaming.</li></ul>
<blockquote><b>Say it in the interview:</b> Endpoint plus managed identity plus deployment name. No key in the app, the client is a singleton, and I always cap output tokens and set a low temperature for structured output.</blockquote>`,
  followUps: ['Which role does the identity need?', 'Why stream the response?', 'How do you make sure the model returns valid JSON?']
});

interview.push({
  q: 'What are the operational concerns for LLM calls in Azure?', level: 'A',
  a: `<p>A model call is a slow, metered, rate-limited dependency whose output can vary, so you manage quota, cost, safety, security and visibility on purpose.</p>
<table><tr><th>Concern</th><th>What to do</th></tr>
<tr><td>Quotas</td><td>Tokens and requests per minute are limited per deployment and region. Handle 429 using Retry-After, spread load over deployments or regions, consider provisioned throughput for steady latency.</td></tr>
<tr><td>Latency and cost</td><td>Cap output tokens, trim prompts, cache repeated work, use the smallest model that meets quality, stream for perceived speed.</td></tr>
<tr><td>Content filters</td><td>On by default. Treat a filtered response as a normal, handled outcome.</td></tr>
<tr><td>Security</td><td>Managed identity, private endpoints, no prompts or personal data in logs, a data-residency choice, prompt-injection defences.</td></tr>
<tr><td>Observability</td><td>Log token counts, latency, deployment, prompt template version and outcome, and trace tool calls.</td></tr></table>
<blockquote><b>Say it in the interview:</b> I treat the model like any fragile dependency: timeouts, backoff on 429, token caps, and telemetry on tokens and outcomes, with raw prompts kept out of the logs.</blockquote>`,
  followUps: ['What is provisioned throughput and when is it worth it?', 'How do you test a prompt change before release?', 'What do you show the user when a response is filtered?']
});

// ================= INTERVIEW: 8. DevOps, CI/CD and IaC =================
interview.push({
  q: 'CI vs continuous delivery vs continuous deployment: what is the difference?', level: 'B',
  a: `<p>All three automate the path from a code change to users; they differ in how far the automation goes without a person.</p>
<table><tr><th>Term</th><th>What happens</th></tr>
<tr><td>Continuous integration</td><td>Every commit or pull request is built and tested automatically.</td></tr>
<tr><td>Continuous delivery</td><td>Every passing build is ready to release. A person approves the release.</td></tr>
<tr><td>Continuous deployment</td><td>Every passing build goes to production with no manual step.</td></tr></table>
<p>A mature pipeline looks like this: pull request → build → unit tests, lint, static analysis, dependency and secret scan → artifact → deploy to test → smoke and integration tests → approval → production → health checks → monitoring → rollback if needed.</p>
<p>Continuous deployment is only safe when the tests, monitoring and rollback are strong enough that a person adds no extra safety.</p>
<blockquote><b>Say it in the interview:</b> CI proves every change builds and passes tests. Delivery means it is always releasable with a human approval, and deployment means it releases itself. Most regulated teams stop at delivery.</blockquote>`,
  followUps: ['What must be true before you remove the manual approval?', 'How long should a pull request build take?']
});

interview.push({
  q: 'Which Git branching strategies do you know, and when do you merge vs rebase?', level: 'I',
  a: `<p>A branching strategy is the team's rule for how changes reach the main line, and it should match how often you release.</p>
<table><tr><th>Strategy</th><th>In short</th><th>Best for</th></tr>
<tr><td>Trunk-based</td><td>Short branches, merge to main often, feature flags</td><td>Teams that release continuously</td></tr>
<tr><td>GitHub Flow</td><td>Branch → pull request → main → deploy</td><td>Web apps</td></tr>
<tr><td>Git Flow</td><td>develop, release and hotfix branches</td><td>Scheduled, versioned releases</td></tr>
<tr><td>Release branches</td><td>Stabilise one version while main moves on</td><td>Products that patch old versions</td></tr></table>
<pre><code>git rebase origin/main     # replay my commits on top (my own branch only)
git merge --no-ff topic/x  # keep a merge commit
git cherry-pick &lt;sha&gt;      # take one fix to a release branch
git revert &lt;sha&gt;           # undo on a shared branch with a new commit
git bisect start           # find the commit that broke it</code></pre>
<p><b>Merge</b> keeps history as it happened. <b>Rebase</b> rewrites it, so never rebase a branch others share. <b>Squash merge</b> gives one clean commit per pull request.</p>
<blockquote><b>Say it in the interview:</b> I prefer short-lived branches merged to main behind feature flags. I rebase my own branch to stay current, and on shared branches I only merge or revert.</blockquote>`,
  followUps: ['How do you ship a hotfix while main has unreleased work?', 'What goes wrong with long-lived feature branches?', 'How do you link a branch to its work item?']
});

interview.push({
  q: 'What quality gates do you put in the pipeline?', level: 'I',
  a: `<p>Quality gates are automatic checks that block a change from merging or releasing when it falls below an agreed bar.</p>
<ul><li><b>Tests:</b> unit tests on every pull request; integration and smoke tests after deploying to test.</li><li><b>Static analysis</b> (SonarQube or SonarCloud): bugs, vulnerabilities, code smells, duplication and coverage <i>on new code</i>, with a gate that fails the pull request.</li><li><b>Dependency and secret scanning:</b> Dependabot, <code>dotnet list package --vulnerable</code>, <code>npm audit</code>, secret scanning with push protection.</li><li><b>Supply chain:</b> container image scanning, a software bill of materials, signed artifacts.</li><li><b>Process:</b> required reviews, branch protection, required status checks, CODEOWNERS.</li></ul>
<p>Two rules keep gates useful: they must be fast enough that people do not route around them, and they apply to new code first, so an old codebase can adopt them without a wall of failures.</p>
<blockquote><b>Say it in the interview:</b> Every pull request must pass build, tests, static analysis and security scans before merge, and the rules are enforced by branch protection, not by goodwill.</blockquote>`,
  followUps: ['What coverage number do you require, and why that one?', 'A gate blocks an urgent fix. What do you do?', 'How do you deal with flaky tests?']
});

interview.push({
  q: 'What is Infrastructure as Code? Compare Bicep and Terraform', level: 'I',
  a: `<p>Infrastructure as code means your cloud resources are described in files in Git and created by a pipeline, not by clicking in the portal.</p>
<pre><code>param env string
resource func 'Microsoft.Web/sites@2023-12-01' = {
  name: format('func-shop-{0}', env)
  location: resourceGroup().location
  kind: 'functionapp'
  identity: { type: 'SystemAssigned' }
  properties: { serverFarmId: plan.id, httpsOnly: true }
}</code></pre>
<p><b>Benefits:</b> identical environments, peer review of infrastructure changes, a preview before applying, and a fast rebuild for disaster recovery.</p>
<table><tr><th></th><th>Bicep</th><th>Terraform</th></tr>
<tr><td>Scope</td><td>Azure only</td><td>Many clouds and providers</td></tr>
<tr><td>State</td><td>No state file</td><td>State file to store and lock</td></tr>
<tr><td>Preview</td><td>what-if</td><td>plan</td></tr>
<tr><td>New Azure features</td><td>Immediately</td><td>When the provider supports them</td></tr></table>
<blockquote><b>Say it in the interview:</b> All infrastructure is in code and goes through pull requests with a preview. I use Bicep for Azure-only estates and Terraform when more than one cloud or an existing Terraform practice is involved.</blockquote>`,
  followUps: ['What is drift and how do you detect it?', 'Where do you keep Terraform state, and why does it need protecting?', 'How do you structure modules for 3 environments?']
});

interview.push({
  q: 'Walk me through a multi-stage Azure DevOps YAML pipeline for an API and a React or Angular UI', level: 'A',
  a: `<p>The pipeline has a build stage that produces artifacts once, then one deploy stage per environment that reuses those artifacts.</p>
<pre><code>stages:
- stage: Build
  jobs:
  - job: Api      # dotnet build, dotnet test, dotnet publish, publish artifact "api"
  - job: Ui       # npm ci, lint, test, build, publish artifact "ui"
- stage: DeployTest
  dependsOn: Build
  jobs:
  - deployment: Test
    environment: test
- stage: DeployProd
  dependsOn: DeployTest
  jobs:
  - deployment: Prod
    environment: production   # approval is set on the environment
    # deploy to staging slot, smoke test, swap slots</code></pre>
<p>Concepts to name:</p>
<ul><li><b>Stages, jobs, steps</b> and <b>artifacts</b> passed between stages.</li><li><b>Environments</b> with approvals and checks.</li><li><b>Service connections</b> with least privilege, ideally using workload identity federation.</li><li><b>Variable groups</b> linked to Key Vault.</li><li><b>Templates</b> for reuse across repositories.</li><li><b>Agent pools:</b> Microsoft-hosted or self-hosted (needed to reach private networks).</li></ul>
<blockquote><b>Say it in the interview:</b> Build once, publish artifacts, then promote the same artifacts through test and production. Production deploys to a staging slot, runs a smoke test, and swaps, with the approval on the environment.</blockquote>`,
  followUps: ['Why put the approval on the environment and not in the YAML?', 'When do you need self-hosted agents?', 'How do you share pipeline logic between 10 repositories?']
});

interview.push({
  q: 'Describe a tag-driven release workflow in GitHub Actions for a monorepo', level: 'A',
  a: `<p>Each product in the repository is released by publishing a tag with that product's prefix, so products ship on their own schedule from one codebase.</p>
<p>For example, a tag <code>shop-v1.4.0</code> deploys the shop to test, and <code>shop-v1.4.0-final</code> also promotes it to production.</p>
<pre><code>on:
  release:
    types: [published]
jobs:
  gate:          # reads the tag, sets outputs: deploy_test, deploy_prod
  deploy-test:
    needs: gate
    if: needs.gate.outputs.deploy_test == 'true'
    uses: ./.github/workflows/deploy-shop.yaml   # reusable workflow
    with: { environment: test }
  deploy-prod:
    needs: [gate, deploy-test]
    if: needs.gate.outputs.deploy_prod == 'true'
    uses: ./.github/workflows/deploy-shop.yaml
    with: { environment: prod }</code></pre>
<ul><li><b>Reusable workflows</b> and composite actions remove copy and paste.</li><li><b>Environments</b> hold per-stage secrets and required reviewers.</li><li><b>OIDC</b> sign-in to Azure replaces stored secrets.</li><li>Pull request workflows run build, tests and analysis before merge.</li></ul>
<blockquote><b>Say it in the interview:</b> A tag prefix selects the product and a suffix selects how far it goes. One reusable deploy workflow runs for test and production, with the production environment guarded by a reviewer.</blockquote>`,
  followUps: ['What are the risks of releasing by tag, and how do you guard against a wrong tag?', 'How would you keep "build once" in this design?', 'How do you run only the tests for the product that changed?']
});

interview.push({
  q: 'How does your pipeline sign in to Azure without a stored secret? (OIDC / workload identity federation)', level: 'A',
  a: `<p>The pipeline proves who it is with a short-lived token issued by its own platform, and Microsoft Entra ID swaps that for a short-lived Azure token, so no password is stored anywhere.</p>
<ol><li>In Entra ID, add a <b>federated credential</b> to an app registration or a user-assigned managed identity. It says: trust tokens from this repository, for this branch, tag or environment.</li><li>Give that identity narrow roles on the target resource group.</li><li>In the workflow, allow the job to request an identity token and sign in.</li></ol>
<pre><code>permissions:
  id-token: write
  contents: read
steps:
  - uses: azure/login@v2
    with:
      client-id: &#36;{{ vars.AZURE_CLIENT_ID }}
      tenant-id: &#36;{{ vars.AZURE_TENANT_ID }}
      subscription-id: &#36;{{ vars.AZURE_SUBSCRIPTION_ID }}</code></pre>
<p>The three ids are identifiers, not secrets. Azure DevOps offers the same thing as a service connection using workload identity federation.</p>
<blockquote><b>Say it in the interview:</b> We use OIDC federation. Entra ID trusts tokens from one exact repository and environment, so there is no client secret to leak, rotate or expire.</blockquote>`,
  followUps: ['What does the subject claim in the token contain, and why does it matter?', 'What can an attacker do with write access to the workflow file?', 'How do you separate the test and production identities?']
});

interview.push({
  q: 'Which deployment strategies do you know, and how do you roll back, including the database?', level: 'E',
  a: `<p>A deployment strategy is how you replace the old version with the new one, and the right choice depends on how quickly you need to undo it.</p>
<table><tr><th>Strategy</th><th>How</th><th>Rollback</th><th>Watch out for</th></tr>
<tr><td>Rolling</td><td>Replace instances gradually</td><td>Redeploy previous</td><td>Two versions live at once</td></tr>
<tr><td>Blue-green / slot swap</td><td>Deploy beside, then swap</td><td>Swap back</td><td>Warm-up, slot settings, database compatibility</td></tr>
<tr><td>Canary</td><td>Small share of traffic first</td><td>Route back</td><td>Needs good metrics and automation</td></tr>
<tr><td>Feature flags</td><td>Ship switched off, enable gradually</td><td>Switch off</td><td>Flag clean-up, testing both paths</td></tr>
<tr><td>Recreate</td><td>Stop, deploy, start</td><td>Redeploy</td><td>Downtime</td></tr></table>
<p>Code rolls back in seconds; data does not. So database changes use <b>expand and contract</b>:</p>
<ol><li>Add the new column or table. Deploy code that writes both and reads the old.</li><li>Backfill existing rows.</li><li>Switch reads to the new structure.</li><li>Remove the old structure in a later release.</li></ol>
<blockquote><b>Say it in the interview:</b> I release with slot swaps and feature flags so rollback takes seconds, and I make every schema change in expand-and-contract steps so the old and new code both work against the database.</blockquote>`,
  followUps: ['How do you roll back after a destructive migration has already run?', 'Canary or slot swap: when each?', 'How do you stop feature flags piling up?']
});

// ================= INTERVIEW: 9. Azure architecture =================
interview.push({
  q: 'What is your multi-environment strategy?', level: 'I',
  a: `<p>Each environment is a separate, identically built copy of the system, and the same tested package moves through them with only configuration changing.</p>
<ul><li><b>Isolation:</b> separate subscriptions, or at least separate resource groups, for dev, test, staging and production.</li><li><b>Same code for infrastructure:</b> one set of templates, with a parameter file per environment.</li><li><b>Separate identities and secrets</b> per environment, so test can never read production.</li><li><b>Production access:</b> by approval and just-in-time elevation (Privileged Identity Management), not standing admin rights.</li><li><b>Data:</b> masked or generated data outside production.</li><li><b>Promotion:</b> build once, deploy many.</li></ul>
<p>Lower environments can be smaller to save money, but should be the same <i>shape</i>: if production has a private endpoint and a gateway, so does staging, or you will find the difference on release day.</p>
<blockquote><b>Say it in the interview:</b> Separate subscriptions per environment, identical infrastructure code with different parameters, separate identities, and one artifact promoted through all of them.</blockquote>`,
  followUps: ['How do you give developers production access for an incident?', 'How do you get realistic test data without copying production?', 'How many environments are too many?']
});

interview.push({
  q: 'How do you control Azure cost?', level: 'I',
  a: `<p>You make cost visible, give it an owner, and then remove waste; in that order.</p>
<table><tr><th>Step</th><th>Actions</th></tr>
<tr><td>See it</td><td>Cost analysis by service and tag; budgets with alerts; tags for owner and environment</td></tr>
<tr><td>Right-size</td><td>Pick the smallest tier that meets the load; review Azure Advisor suggestions</td></tr>
<tr><td>Match demand</td><td>Autoscale; scale to zero where possible; shut down non-production out of hours</td></tr>
<tr><td>Commit</td><td>Reservations or savings plans for steady workloads</td></tr>
<tr><td>Clean up</td><td>Delete idle resources, old disks and snapshots; move old blobs to cooler tiers</td></tr>
<tr><td>Watch the meters that grow quietly</td><td>Log ingestion, outbound data, model tokens</td></tr></table>
<p>For AI workloads, cap output tokens and cache repeated calls, because cost follows tokens, not requests. A short monthly review keeps all of this from drifting.</p>
<blockquote><b>Say it in the interview:</b> Budgets, alerts and tags first, so every cost has an owner. Then right-size, autoscale, reserve the steady part, and review monthly with Cost analysis and Advisor.</blockquote>`,
  followUps: ['Which cost surprised you most, and how did you find it?', 'When is serverless more expensive than a fixed plan?', 'How do you estimate cost for a new design?']
});

interview.push({
  q: 'Troubleshooting scenario: "the API is slow after deployment". What do you do?', level: 'A',
  a: `<p>I check what changed, find where the time goes, and if users are hurting I roll back first and investigate afterwards.</p>
<ol><li><b>What changed:</b> the deployment diff, configuration and feature flags. Compare metrics before and after in Application Insights.</li><li><b>Break the latency down:</b> client → gateway → function → dependencies (SQL, Storage, model calls). Look at dependency duration and failure rate.</li><li><b>Platform:</b> cold starts, instance count, throttling (429 or 503), connection or port exhaustion.</li><li><b>Database:</b> the query plan, a missing index for a new query, parameter sniffing, blocking.</li><li><b>Decide:</b> if impact is high, swap the slot back or switch the flag off, then investigate offline.</li><li><b>Afterwards:</b> add a regression test and an alert so it is caught earlier next time.</li></ol>
<pre><code>dependencies
| where timestamp &gt; ago(1h)
| summarize p95 = percentile(duration, 95), calls = count() by target
| order by p95 desc</code></pre>
<blockquote><b>Say it in the interview:</b> I start from the diff and the telemetry, not from guesses. I split the latency by hop to find the slow one, and I restore service by rolling back before I chase the root cause.</blockquote>`,
  followUps: ['The slow part is a SQL query that was fast in test. Why might that be?', 'How do you decide between rolling back and fixing forward?', 'What would you add to the pipeline to catch this?']
});

interview.push({
  q: 'How would you move an on-premises .NET application to Azure?', level: 'A',
  a: `<p>I would first find out what the app depends on, then choose the smallest change that gets it running safely in Azure, and modernise in steps after that.</p>
<table><tr><th>Approach</th><th>Meaning</th><th>When</th></tr>
<tr><td>Rehost</td><td>Move as-is to virtual machines</td><td>Deadline-driven; no code access</td></tr>
<tr><td>Replatform</td><td>Small changes to run on App Service and Azure SQL</td><td>The usual best first step for .NET web apps</td></tr>
<tr><td>Refactor</td><td>Redesign parts, for example to Functions or containers</td><td>When a part needs scale or faster change</td></tr></table>
<p>Things I check before choosing:</p>
<ul><li><b>Runtime:</b> .NET Framework runs on Windows App Service; upgrading to modern .NET opens Linux and containers.</li><li><b>State on the machine:</b> local files, in-memory sessions, Windows services, scheduled tasks. Move them to Blob, Redis, and Functions or WebJobs.</li><li><b>Identity:</b> Windows authentication becomes Microsoft Entra ID.</li><li><b>Data:</b> migrate the database with a rehearsal and a cut-over plan.</li><li><b>Network:</b> anything that still lives on-premises needs a private connection.</li></ul>
<blockquote><b>Say it in the interview:</b> I assess dependencies first, replatform to managed services as the first step, and migrate in slices with a rehearsed cut-over and a rollback, not in one big switch.</blockquote>`,
  followUps: ['How do you cut over the database with minimal downtime?', 'What is the strangler fig pattern?', 'What would make you choose rehost?']
});

interview.push({
  q: 'Design a secure, scalable API on Azure for a SaaS product', level: 'E',
  a: `<p>I would build it in layers, from the internet inwards, and give each layer one clear job.</p>
<ol><li><b>Edge:</b> Front Door with a web application firewall (TLS, DDoS, geo rules) → API Management (token validation, rate limits per tenant, versioning).</li><li><b>Compute:</b> stateless Functions (Flex Consumption or Premium) or Container Apps, autoscaled, with a managed identity.</li><li><b>Data:</b> zone-redundant Azure SQL for transactions, Redis for cache, Blob for files, Table or Cosmos DB for flexible data, Service Bus for background workflows.</li><li><b>Security:</b> Microsoft Entra ID, private endpoints, Key Vault, least-privilege roles, no secrets in code. The tenant id comes from the token and filters every query.</li><li><b>Operations:</b> Application Insights and Log Analytics, alerts, dashboards, health checks, infrastructure as code, a pipeline with approvals.</li><li><b>Resilience:</b> retries with backoff, circuit breakers, idempotency, dead-letter handling, backups and a tested recovery plan.</li><li><b>Cost:</b> right-size, autoscale, reserve steady load, budgets, tags.</li></ol>
<p>Then I state the trade-offs: shared database or one per tenant, one region or two, and what load or customer demand would make me change each.</p>
<blockquote><b>Say it in the interview:</b> Edge, compute, data, security, operations, resilience, cost. I name the simplest managed service at each layer, then say what requirement would make me change it.</blockquote>`,
  followUps: ['How do you isolate tenants in the data layer?', 'Where is the first bottleneck at 10 times the load?', 'How would this design change for a strict data-residency customer?']
});

// ================= INTERVIEW: 10. Rapid fire =================
interview.push({
  q: 'Rapid fire: compute and Functions', level: 'B',
  a: `<p>Short questions get short answers: one line each, said with confidence.</p>
<table><tr><th>Question</th><th>Short answer</th></tr>
<tr><td>App Service vs Functions?</td><td>App Service is always-on web hosting with more control. Functions are event-driven, scale per execution and have bindings.</td></tr>
<tr><td>What triggers a Function scale-out?</td><td>The scale controller watches HTTP concurrency, queue length and event backlog.</td></tr>
<tr><td>What is a slot-sticky setting?</td><td>A setting that stays with its slot during a swap, such as an environment-specific connection.</td></tr>
<tr><td>What is AzureWebJobsStorage?</td><td>The storage connection the Functions host uses for trigger state, locks and keys.</td></tr>
<tr><td>What is Azurite?</td><td>A local emulator for Blob, Queue and Table storage.</td></tr>
<tr><td>What is a resource group?</td><td>A life-cycle and access container for related resources.</td></tr></table>
<blockquote><b>Say it in the interview:</b> For rapid-fire questions I give the one-line definition first and offer an example only if they ask for more.</blockquote>`,
  followUps: ['Which settings would you mark as slot settings?', 'Can AzureWebJobsStorage use a managed identity?']
});

interview.push({
  q: 'Rapid fire: identity, secrets and storage', level: 'B',
  a: `<p>These all come back to one idea: prefer short-lived, narrowly scoped access over long-lived passwords.</p>
<table><tr><th>Question</th><th>Short answer</th></tr>
<tr><td>Managed identity vs service principal?</td><td>A managed identity is run by Azure with no secret for you to hold. A service principal needs a secret or certificate that you manage.</td></tr>
<tr><td>Key Vault: RBAC vs access policies?</td><td>RBAC is the current, unified model. Access policies are the older, vault-only model.</td></tr>
<tr><td>What is a SAS token?</td><td>A signed link that gives time-limited, scoped access to storage without sharing the account key.</td></tr>
<tr><td>How do you rotate secrets?</td><td>Key Vault rotation policies, short-lived credentials, OIDC for pipelines, and references without a fixed version so apps pick up the new value.</td></tr>
<tr><td>What is ACR?</td><td>Azure Container Registry, a private store for container images.</td></tr></table>
<blockquote><b>Say it in the interview:</b> My default is identity over secrets. Where a secret must exist, it lives in Key Vault, is short-lived, and rotates without a redeploy.</blockquote>`,
  followUps: ['What is a user delegation SAS and why is it safer?', 'How does an app pull an image from the registry without a password?']
});

interview.push({
  q: 'Rapid fire: delivery and AI', level: 'I',
  a: `<p>These test whether you can define a release or AI term in one breath.</p>
<table><tr><th>Question</th><th>Short answer</th></tr>
<tr><td>Build once, deploy many?</td><td>One unchangeable artifact is promoted through every environment; only configuration is injected per environment.</td></tr>
<tr><td>Blue-green vs canary?</td><td>Blue-green swaps all traffic to a full parallel copy. Canary shifts a small share first and grows it while watching metrics.</td></tr>
<tr><td>Foundry deployment vs model?</td><td>A model is the thing you choose from the catalogue. A deployment is your named, quota-bound instance of it, and code refers to the deployment.</td></tr>
<tr><td>What does what-if do?</td><td>Shows what a Bicep deployment would change, before anything is changed.</td></tr>
<tr><td>What does 429 from a model mean?</td><td>The deployment hit its rate limit. Wait as Retry-After says and try again.</td></tr></table>
<blockquote><b>Say it in the interview:</b> One artifact, promoted with config. Swap for blue-green, percentage for canary. Code calls a deployment, not a model.</blockquote>`,
  followUps: ['Which is easier to roll back, blue-green or canary?', 'Why might two environments use different models behind the same deployment name?']
});

registerModule({
  id: 'tl06',
  title: 'Azure Questions for Tech Leads',
  intro: `<p>This module is the Azure round of a .NET full-stack tech lead interview, question by question. Read a question, say your answer out loud, then open the model answer. Every answer starts with one plain sentence, goes deeper, and ends with a line you can say in the room.</p>
    <p>It covers how Azure is organised, Azure Functions in depth, Static Web Apps, App Service and containers, storage and messaging, Key Vault and managed identity, monitoring, Azure OpenAI and Microsoft Foundry, pipelines and infrastructure as code, and the architecture and troubleshooting questions that decide a lead-level offer. Facts are current for 2026: .NET 10 is the long-term support release, the isolated worker model is the supported way to run .NET functions, and Azure Active Directory is now Microsoft Entra ID.</p>`,
  goals: [
    'Explain the Azure hierarchy, RBAC and the service models in plain words, with an example of each',
    'Choose between App Service, Functions, Static Web Apps, Container Apps and AKS, and defend the choice',
    'Describe how Functions scale, fail and retry, and how you secure them with a managed identity and Key Vault',
    'Pick the right storage and messaging service from one sentence of requirements',
    'Walk through a pipeline from pull request to production, including OIDC sign-in, slot swaps and safe database changes',
    'Answer design and troubleshooting scenarios in a fixed order: edge, compute, data, security, operations, resilience, cost'
  ],
  prereqs: `<p>You should be comfortable with building a web API in ASP.NET Core and with basic sign-in ideas such as tokens (the earlier modules in this track). No Azure account is needed to follow along, but trying the commands in a free subscription helps them stick.</p>`,
  hours: 12,
  topics: topics, practice: practice, quiz: quiz, interview: interview
});
})();
