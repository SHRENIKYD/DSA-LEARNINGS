(function () { var topics = [], practice = [], quiz = [], interview = [];

// ---------- small builders ----------
function escH(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
// Plain HTML table: cells are HTML strings (escape angle brackets yourself).
function T(head, rows) {
  return '<table><thead><tr>' + head.map(function (h) { return '<th>' + h + '</th>'; }).join('') + '</tr></thead><tbody>' +
    rows.map(function (r) { return '<tr>' + r.map(function (c) { return '<td>' + c + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table>';
}
// Code sample for prose: escapes &, < and >.
function CODE(s) { return '<pre><code>' + escH(String(s).replace(/^\n/, '')) + '</code></pre>'; }

// Scenario problem builder (weak answer -> strong answer).
function P(o) {
  return {
    title: o.t, level: o.l, tags: o.tags,
    statement: '<p>' + o.s + '</p>',
    constraints: o.c || 'Answer out loud in 2 to 3 minutes. Start with the most likely cause, say how you would prove it, then give the fix and how you stop it coming back.',
    example: o.ex,
    brute: { why: '<p><b>Weak answer:</b> <i>&ldquo;' + o.weak + '&rdquo;</i></p><p><b>Why it fails:</b> ' + o.why + '</p>' },
    mcq: { q: o.q[0], options: o.q[1], answer: o.q[2], explain: o.q[3] },
    hints: ['<p>Hint 1: ' + o.h[0] + '</p>', '<p>Hint 2: ' + o.h[1] + '</p>', '<p>Hint 3: ' + o.h[2] + '</p>'],
    solution: { approach: o.a, code: o.code, complexity: '<p><b>What a strong answer shows:</b> ' + o.cx + '</p>', followUps: o.f }
  };
}

// Visualizer: build a table row by row.
function rowViz(title, label, columns, rows, narrs, finalNarr, selRows) {
  return {
    title: title,
    gen: function () {
      var frames = [{ narr: narrs[0], parts: [{ type: 'table', label: label, columns: columns, rows: [] }] }];
      for (var i = 0; i < rows.length; i++) {
        var h = {}; h[i] = 'cur';
        frames.push({ narr: narrs[i + 1] || String(rows[i][0]), parts: [{ type: 'table', label: label, columns: columns, rows: rows.slice(0, i + 1), hl: h }] });
      }
      var fh = {}; (selRows || []).forEach(function (r) { fh[r] = 'sel'; });
      frames.push({ narr: finalNarr, parts: [{ type: 'table', label: label, columns: columns, rows: rows.slice(), hl: fh }] });
      return frames;
    }
  };
}
// Visualizer: a box diagram animated step by step. steps: [{ n, hl, ehl, tags, note }]
function flowViz(title, label, nodes, edges, steps, height) {
  return {
    title: title,
    gen: function () {
      return steps.map(function (s) {
        var parts = [{ type: 'graph', label: label, directed: true, height: height || 60, nodes: nodes, edges: edges, hl: s.hl || {}, ehl: s.ehl || {}, tags: s.tags || {} }];
        if (s.note) parts.push({ type: 'text', html: s.note });
        return { narr: s.n, parts: parts };
      });
    }
  };
}
// Visualizer: step through code. steps: [{ line, cls, n, vars, stack }]
function codeViz(title, lang, code, steps) {
  return {
    title: title,
    gen: function () {
      return steps.map(function (s) {
        var h = {}; h[s.line] = s.cls || 'cur';
        var parts = [{ type: 'code', label: 'Code', lang: lang, code: code, hl: h }];
        if (s.vars) parts.push({ type: 'vars', label: 'State', vals: s.vars, hl: s.vhl || {} });
        if (s.stack) parts.push({ type: 'stack', label: 'Call stack (top is running)', items: s.stack });
        return { narr: s.n, parts: parts };
      });
    }
  };
}

// ====================== TOPIC 1 ======================
topics.push({
  title: '.NET History, Versions and Support',
  analogy: `<p>Think of a <b>car maker</b>. For years it sold one model that only ran on one kind of road (Windows). That is <b>.NET Framework</b>. Then it designed a new, lighter model that runs on any road (Windows, Linux, macOS, containers) and published the blueprints. That is <b>.NET Core</b>. In 2020 it dropped the word "Core" and now ships a new model year every November, simply called <b>.NET 5, 6, 7, 8, 9, 10</b>. The old model still gets safety recalls, but all new features go into the new line.</p>`,
  explain: `<p><b>The plain idea:</b> there are two families. <b>.NET Framework</b> (2002 to 4.8.1) is Windows-only and is in maintenance: security fixes, no new features. <b>Modern .NET</b> (.NET Core 1.0 in 2016, renamed to plain ".NET" from version 5) is cross-platform, open source and much faster. Interviewers want you to tell the two apart and to know which version is supported today.</p>
    <p><b>The release rhythm:</b> one major version every November. Even numbers are <b>LTS</b> (long-term support, 3 years). Odd numbers are <b>STS</b> (standard-term support, 2 years since the 2025 policy change, 18 months before that).</p>` +
    T(['Version', 'Kind', 'Released', 'End of support'], [
      ['.NET 8', 'LTS', 'November 2023', '10 November 2026 (ended)'],
      ['.NET 9', 'STS', 'November 2024', '10 November 2026 (ended)'],
      ['<b>.NET 10</b>', '<b>LTS, the current one</b>', '11 November 2025', '14 November 2028'],
      ['.NET Framework 4.8.1', 'part of Windows', '2022', 'follows the Windows lifecycle']
    ]) +
    `<p><b>Words you must be able to define:</b></p>
    <ul>
      <li><b>SDK</b>: the tools to <i>build</i> (compiler, the <code>dotnet</code> command, templates). <b>Runtime</b>: what a machine needs to <i>run</i> the app.</li>
      <li><b>Target framework</b>: the line <code>&lt;TargetFramework&gt;net10.0&lt;/TargetFramework&gt;</code> in the project file. It says which .NET version the app is built for.</li>
      <li><b>.NET Standard</b>: an older list of APIs that let one library run on both families. Today you only need <code>netstandard2.0</code> when a library must still load in .NET Framework.</li>
      <li><b>Framework-dependent</b> deployment needs the runtime installed on the server. <b>Self-contained</b> ships the runtime inside your output folder.</li>
    </ul>`,
  clues: ['"Give me the .NET timeline" or "What is the difference between .NET Framework and .NET Core?"', '"Which .NET version are you on, and why that one?"', '"What do LTS and STS mean?"', '"How would you move a legacy .NET Framework app to modern .NET?"', '"What is .NET Standard, and do we still need it?"', '"What is new in .NET 8, 9 or 10?" (they want 3 named features, not a list of 30)', '"Self-contained vs framework-dependent deployment"'],
  code: [{ lang: 'bash', title: 'The dotnet commands interviewers expect you to know', code: `dotnet --list-sdks                 # which SDKs are installed
dotnet new webapi -n Shop.Api      # create a project from a template
dotnet run                         # build and run (development)
dotnet build -c Release            # compile only
dotnet test                        # run the test projects
dotnet publish -c Release -o out   # framework-dependent: server needs the runtime
dotnet publish -c Release -r linux-x64 --self-contained true   # ships the runtime too
dotnet publish -r linux-x64 -p:PublishSingleFile=true          # one executable file
dotnet publish -r linux-x64 -p:PublishAot=true                 # Native AOT: no JIT at run time` }],
  viz: [
    rowViz('The .NET timeline, one row at a time', '.NET timeline',
      ['Family', 'Release', 'Year', 'What mattered'],
      [
        ['.NET Framework', '1.0', '2002', 'CLR, C#, Web Forms. Windows only'],
        ['.NET Framework', '2.0', '2005', 'Generics, nullable value types'],
        ['.NET Framework', '3.5', '2007', 'LINQ (WPF and WCF came with 3.0 in 2006)'],
        ['.NET Framework', '4.0 / 4.5', '2010 / 2012', 'Task Parallel Library, then async/await'],
        ['.NET Framework', '4.8 / 4.8.1', '2019 / 2022', 'Last versions. Security fixes only'],
        ['.NET Core', '1.0', '2016', 'Cross-platform, open source, ASP.NET Core'],
        ['.NET Core', '3.1 (LTS)', '2019', 'WinForms and WPF on Core, gRPC, C# 8'],
        ['.NET', '5', '2020', '"Core" dropped from the name. One platform'],
        ['.NET', '6 (LTS)', '2021', 'Minimal APIs, hot reload, C# 10'],
        ['.NET', '8 (LTS)', '2023', 'Native AOT for web APIs, keyed DI, C# 12'],
        ['.NET', '9 (STS)', '2024', 'Built-in OpenAPI, HybridCache, C# 13'],
        ['.NET', '10 (LTS)', '2025', 'Current LTS, C# 14']
      ],
      ['We build the timeline in three blocks: the Windows-only original, the cross-platform rewrite, and the unified line.',
        '<b>2002</b>: .NET Framework 1.0 ships with the CLR (the engine that runs your code) and C#. It only runs on Windows.',
        '<b>2005</b>: generics arrive. <code>List&lt;T&gt;</code> replaces untyped collections.',
        '<b>2007</b>: LINQ lets you query collections and databases with the same syntax.',
        '<b>2010 to 2012</b>: tasks first, then the <code>async</code> and <code>await</code> keywords.',
        '<b>4.8.1</b> is the end of the Framework line. It still gets security fixes because it is part of Windows.',
        '<b>2016</b>: the rewrite. .NET Core runs on Linux and macOS, is open source, and brings ASP.NET Core.',
        '<b>2019</b>: 3.1 is the release that made many teams move, because desktop apps and most APIs were now available.',
        '<b>2020</b>: version 4 is skipped to avoid confusion with Framework 4.x, and the name becomes just ".NET".',
        '<b>2021</b>: .NET 6 makes a web API fit in a few lines of <code>Program.cs</code>.',
        '<b>2023</b>: .NET 8, a long-term support release that many companies standardised on.',
        '<b>2024</b>: .NET 9, a standard-term release.',
        '<b>2025</b>: .NET 10 is the long-term support release you should target for new work in 2026.'],
      'Say it in one breath: <b>Framework</b> (Windows only, maintenance) → <b>Core</b> (cross-platform rewrite) → <b>unified .NET</b> with a release every November, even numbers LTS.', [4, 7, 11])
  ],
  examples: [
    { title: 'Reading a project file', html: `<p>The target framework is one line. Changing it is step one of an upgrade; the real work is the packages and the breaking changes that follow.</p>`, code: { lang: 'text', code: `<Project Sdk="Microsoft.NET.Sdk.Web">
  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>   <!-- was net8.0 -->
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
  </PropertyGroup>
</Project>` } },
    { title: 'A library that must serve both families', html: `<p>A shared pricing library is used by an old .NET Framework 4.8 desktop app and by a new .NET 10 API. Two honest options:</p><ul><li>Target <code>netstandard2.0</code> only: one build, but you are limited to the older API set.</li><li><b>Multi-target</b> with <code>&lt;TargetFrameworks&gt;net10.0;net48&lt;/TargetFrameworks&gt;</code>: two builds in one package, and the modern build can use new APIs behind <code>#if NET</code>.</li></ul><p>Pick multi-targeting when the modern side needs speed or new APIs. Pick .NET Standard when the library is small and stable.</p>` },
    { title: 'Which deployment kind for which case', html: T(['Case', 'Pick', 'Why'], [['20 services on one shared host image', 'Framework-dependent', 'Small outputs; the runtime is patched once in the base image'], ['A tool sent to customers who have no .NET', 'Self-contained, single file', 'Nothing to install first'], ['A function that must start in milliseconds', 'Native AOT (if every library supports it)', 'No JIT warm-up, small memory']]) }
  ],
  deepDive: `<p><b>Support dates are an engineering task, not trivia.</b> When a version leaves support it stops getting security patches, and many companies' compliance rules then forbid it in production. A tech lead keeps a list of every service and its target framework, and plans the next LTS move months ahead. Because .NET 8 (LTS) and .NET 9 (STS) both ended on 10 November 2026, "what did you do about it?" is a live question.</p>
    <p><b>What an upgrade between modern versions really costs.</b> Usually small: retarget, update NuGet packages, read the "breaking changes" page, fix warnings, run the tests, deploy one low-risk service first and watch latency and memory. The risky parts are third-party packages that lag behind and behaviour changes (for example a serializer default), which is why automated tests matter more than the edit itself.</p>
    <p><b>Roll-forward.</b> A framework-dependent app built for 10.0.0 runs on the newest 10.0.x patch installed, so servers get security fixes without a rebuild. It does not jump to the next major version unless you opt in.</p>
    <p><b><code>global.json</code></b> pins the SDK version used to build, so every developer and the build server compile with the same tools. The SDK version and the target framework are separate: a .NET 10 SDK can build a <code>net8.0</code> app.</p>
    <p><b>Azure Functions</b> has its own date to remember: the in-process model ended support on 10 November 2026. Function apps should run on the isolated worker model.</p>`,
  aiEra: `<p><b>What AI changes:</b> upgrades are now partly automated. Microsoft's older .NET Upgrade Assistant has been replaced by an AI agent (GitHub Copilot app modernization for .NET) that plans the upgrade, edits project files and fixes build errors in a loop. This turns a week of mechanical edits into a day of review.</p>
    <p><b>Where AI goes wrong:</b> models often answer with out-of-date version facts ("the latest LTS is .NET 8") because of their training date, and they suggest APIs that were removed or renamed. Always check support dates on Microsoft's official support policy page and build the code.</p>
    <p><b>What you must still own:</b> the order of services to upgrade, the test safety net, the rollback plan, and the decision to say "this package blocks us, we replace it". Try this prompt: <code>List the breaking changes between .NET 8 and .NET 10 that affect an ASP.NET Core API using EF Core and System.Text.Json. Give me the official page for each.</code> Then verify each link.</p>`,
  problems: [
    P({
      t: 'Your services run on a .NET version that just left support', l: 'Medium', tags: ['versions', 'upgrade', 'planning'],
      s: 'You lead a team with 14 ASP.NET Core services on .NET 8. Support ended on 10 November 2026. The interviewer asks: "What is your plan, and how do you explain the cost to the product owner?"',
      ex: '<p>Shape of a good answer: ' + '<span class="c-g">why it matters</span> → <span class="c-b">inventory</span> → <span class="c-y">order and safety net</span> → <span class="c-p">rollout and proof</span>.</p>',
      weak: 'We just change the target framework to net10.0 in every project and redeploy. It is a one-line change.',
      why: 'It ignores package compatibility, breaking changes, testing and rollout order. It also gives the product owner no reason and no risk picture.',
      q: ['What is the best first step?', ['Retarget every service in one pull request', 'List every service with its target framework, key packages and test coverage', 'Wait until a security bug is announced', 'Rewrite the services as minimal APIs first'], 1, 'You cannot plan or estimate without the inventory. It shows which services are easy and which have a blocking package.'],
      h: ['Out of support means no security patches. Who in the company cares about that?', 'Not all 14 services are equal. Which one would you upgrade first, and why that one?', 'Think: inventory, one pilot, shared packages, test suite, canary, monitoring, rollback.'],
      a: `<p><b>Model answer.</b> "Out of support means no more security patches, so this is a risk item, not a nice-to-have. I would do it in four steps."</p>
        <ol>
          <li><b>Inventory:</b> every service, its target framework, its NuGet packages and its test coverage. Flag packages with no .NET 10 version.</li>
          <li><b>Pilot:</b> upgrade one low-risk service end to end: retarget to <code>net10.0</code>, update packages, read the breaking-changes list, fix warnings, run tests. Write down what broke.</li>
          <li><b>Shared code first:</b> upgrade internal libraries (multi-target them for the transition), then the remaining services in small batches using the pilot checklist.</li>
          <li><b>Rollout:</b> deploy each service through the normal pipeline to a canary or one slot, compare latency, error rate and memory with the old version, and keep the old build ready to roll back.</li>
        </ol>
        <p>"To the product owner I say: about two to three days per service, mostly testing, spread over two sprints, and in return we stay patched until November 2028 and usually get a free speed-up."</p>`,
      cx: 'treats support as a security and compliance risk, starts with an inventory, pilots on one service, and has a measured rollout with rollback.',
      f: ['One package has no .NET 10 version. What are your options?', 'Would you skip LTS and go to an STS release? When?']
    })
  ]
});

// ====================== TOPIC 2 ======================
var PROGRAM_CS = `var builder = WebApplication.CreateBuilder(args);

// 1) Register services in the DI container
builder.Services.AddControllers();
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddAuthentication().AddJwtBearer();
builder.Services.AddAuthorization();
builder.Services.AddCors(o => o.AddPolicy("Frontend", p =>
    p.WithOrigins("https://shop.example.com").AllowAnyHeader().AllowAnyMethod()));
builder.Services.AddDbContext<ShopDb>(o =>
    o.UseSqlServer(builder.Configuration.GetConnectionString("Default")));
builder.Services.AddScoped<IOrderService, OrderService>();
builder.Services.AddHttpClient<IPaymentClient, PaymentClient>();
builder.Services.AddHealthChecks();

var app = builder.Build();

// 2) Build the middleware pipeline: ORDER MATTERS
app.UseExceptionHandler();   // first, so it catches errors from everything below
app.UseHttpsRedirection();
app.UseRouting();            // picks the endpoint
app.UseCors("Frontend");     // after routing, before auth
app.UseAuthentication();     // who are you?
app.UseAuthorization();      // are you allowed?
app.MapControllers();        // the endpoints
app.MapHealthChecks("/health");

app.Run();`;

var PIPE_NODES = [
  { id: 'C', label: 'Browser', x: 8, y: 14, shape: 'box' },
  { id: 'K', label: 'Kestrel', x: 31, y: 14, shape: 'box' },
  { id: 'E', label: 'Exception handler', x: 58, y: 14, shape: 'box', w: 22 },
  { id: 'R', label: 'Routing', x: 88, y: 14, shape: 'box' },
  { id: 'N', label: 'Authentication', x: 88, y: 46, shape: 'box', w: 18 },
  { id: 'Z', label: 'Authorization', x: 62, y: 46, shape: 'box', w: 18 },
  { id: 'A', label: 'Endpoint (action)', x: 34, y: 46, shape: 'box', w: 20 },
  { id: 'D', label: 'Database', x: 8, y: 46, shape: 'box' }
];
var PIPE_EDGES = [['C', 'K'], ['K', 'E'], ['E', 'R'], ['R', 'N'], ['N', 'Z'], ['Z', 'A'], ['A', 'D']];

topics.push({
  title: 'ASP.NET Core Fundamentals: Host, Pipeline, DI and Configuration',
  analogy: `<p>Picture an <b>airport</b>. Every passenger (a request) walks through the same line of stations in a fixed order: the entrance, the ticket check, the passport desk, security, and only then the gate. Each station can let you through, stop you, or stamp something on your boarding pass. On the way back out you pass the same stations in reverse. Those stations are <b>middleware</b>. The staff rota that decides who works where, and for how long, is <b>dependency injection</b>. The notice boards that staff read their instructions from are <b>configuration</b>.</p>`,
  explain: `<p><b>The plain idea:</b> an ASP.NET Core app is one small program, <code>Program.cs</code>, that does two things. First it <b>registers services</b> (the objects your code needs). Then it <b>builds a pipeline</b> of middleware that every HTTP request passes through.</p>
    <ul>
      <li><b>Host</b>: the object that starts the app, loads configuration, sets up logging and dependency injection, and runs the web server.</li>
      <li><b>Kestrel</b>: the built-in web server that listens for HTTP connections.</li>
      <li><b>Middleware</b>: a small piece of code that sees every request, can do work before and after the next piece, or can answer early (called "short-circuit").</li>
      <li><b>Dependency injection (DI)</b>: instead of a class creating the things it needs with <code>new</code>, it asks for them in its constructor and the framework hands them in.</li>
      <li><b>Configuration</b>: settings read from several places and merged. The later source wins.</li>
    </ul>
    <p><b>The three service lifetimes</b> (how long one object lives):</p>` +
    T(['Lifetime', 'One object per', 'Use it for'], [
      ['<b>Transient</b>', 'every time it is asked for', 'small, stateless helpers'],
      ['<b>Scoped</b>', 'HTTP request', '<code>DbContext</code>, per-request user context'],
      ['<b>Singleton</b>', 'whole application', 'caches, configuration, thread-safe clients']
    ]) +
    `<p><b>The rule that catches people:</b> a long-lived object must not hold a shorter-lived one. A singleton that takes a scoped <code>DbContext</code> in its constructor keeps it forever. This is called a <b>captive dependency</b>.</p>`,
  clues: ['"Walk me through what happens when a request hits your API"', '"What is middleware? Does the order matter?"', '"Transient vs scoped vs singleton"', '"What is a captive dependency?" or "Can a singleton use a DbContext?"', '"IOptions vs IOptionsSnapshot vs IOptionsMonitor"', '"Where do you keep secrets?"', '"Filters vs middleware"', '"Controllers or minimal APIs, and why?"', '"How do you handle errors globally?"'],
  code: [{ lang: 'csharp', check: false, title: 'A typical Program.cs', code: PROGRAM_CS }],
  viz: [
    flowViz('One request through the middleware pipeline', 'GET /api/orders/42', PIPE_NODES, PIPE_EDGES, [
      { n: 'A browser sends <code>GET /api/orders/42</code> with a bearer token. We follow it station by station.', hl: { C: 'cur' } },
      { n: '<b>Kestrel</b>, the web server, accepts the connection, parses the HTTP text and creates an <code>HttpContext</code> object that holds the request and the response.', hl: { K: 'cur' }, ehl: { 'C-K': 'ok' } },
      { n: 'The <b>exception handler</b> is first. On the way in it does nothing except wrap everything after it in a try/catch.', hl: { E: 'cur' }, ehl: { 'K-E': 'ok' } },
      { n: '<b>Routing</b> matches the URL to an endpoint and stores the match on the <code>HttpContext</code>. Nothing has run yet.', hl: { R: 'cur' }, ehl: { 'E-R': 'ok' }, tags: { R: 'OrdersController.Get' } },
      { n: '<b>Authentication</b> reads the token and builds the user (<code>HttpContext.User</code>). It answers "who are you?".', hl: { N: 'cur' }, ehl: { 'R-N': 'ok' }, tags: { N: 'user = ana' } },
      { n: '<b>Authorization</b> reads the endpoint\'s <code>[Authorize]</code> rules and the user. If the user is not allowed it <b>short-circuits</b> with 401 or 403 and the endpoint never runs.', hl: { Z: 'cur' }, ehl: { 'N-Z': 'ok' }, tags: { Z: 'allowed' } },
      { n: 'The <b>endpoint</b> runs. DI creates the controller and hands it a scoped <code>DbContext</code>. The action queries the database.', hl: { A: 'cur', D: 'win' }, ehl: { 'Z-A': 'ok', 'A-D': 'ok' } },
      { n: 'The response travels <b>back through the same middleware in reverse order</b>. Each one can add headers or log the status code.', hl: { A: 'done', Z: 'ok', N: 'ok', R: 'ok', E: 'ok', K: 'ok' }, tags: { K: '200 OK' } },
      { n: 'If the action had thrown, the exception would bubble up to the <b>exception handler</b>, which logs it and writes a clean Problem Details error instead of a stack trace.', hl: { A: 'bad', E: 'sel' }, tags: { E: 'catches it', K: '500 + problem+json' } },
      { n: '<b>Order bug to remember:</b> if <code>UseAuthorization</code> were placed before <code>UseAuthentication</code>, the user would still be anonymous when rules are checked, so every protected endpoint would return 401.', hl: { N: 'bad', Z: 'bad' }, note: '<b>Recommended order:</b> exception handler → HTTPS redirection → static files → routing → CORS → authentication → authorization → rate limiter → endpoints.' }
    ], 60),
    rowViz('DI lifetimes across two requests', 'Which object does each resolve return?',
      ['Request', 'Who asks', 'Transient', 'Scoped', 'Singleton'],
      [
        ['1', 'OrdersController', 'T#1', 'S#1', 'G#1'],
        ['1', 'OrderService (same request)', 'T#2', 'S#1', 'G#1'],
        ['2', 'OrdersController', 'T#3', 'S#2', 'G#1'],
        ['2', 'OrderService (same request)', 'T#4', 'S#2', 'G#1'],
        ['none', 'Background worker (no request)', 'T#5', 'needs its own scope', 'G#1']
      ],
      ['Two HTTP requests arrive. In each one, the controller and a service both ask the container for the same three services. Watch which object number they get.',
        'Request 1, controller: everything is new the first time.',
        'Same request, another class: <b>transient</b> is a new object, <b>scoped</b> is the <i>same</i> one (this is how a controller and a service share one <code>DbContext</code> and one transaction), <b>singleton</b> is the same.',
        'Request 2: a new scope starts, so <b>scoped</b> gives a fresh object. The singleton is still object 1.',
        'Same again inside request 2: scoped is shared within the request only.',
        'A background worker has no request, so there is no scope. It must create one with <code>IServiceScopeFactory.CreateScope()</code> for each unit of work.'],
      'Transient: new every time. Scoped: one per request. Singleton: one for the whole app. A singleton must never capture a scoped service.', [1, 4])
  ],
  examples: [
    { title: 'Configuration layering: which value wins?', html: `<p>Sources are read in order and <b>the later one wins</b> for the same key:</p>` + T(['Order', 'Source', 'Value of <code>Payments:TimeoutSeconds</code>'], [['1', '<code>appsettings.json</code>', '30'], ['2', '<code>appsettings.Production.json</code>', '20'], ['3', 'User secrets (Development only)', 'not set'], ['4', 'Environment variable <code>Payments__TimeoutSeconds</code>', '<span class="c-g">10 (wins)</span>'], ['5', 'Command-line argument', 'not set']]) + `<p>Note the <b>double underscore</b>: environment variables use <code>__</code> where JSON uses a colon. Secrets come from a vault (Azure Key Vault) or a managed identity, never from a file in source control.</p>` },
    { title: 'The Options pattern with fail-fast validation', html: `<p>Bind a section to a typed class once, validate it at startup, and inject it. A missing setting then stops the deployment instead of failing at 2 a.m. on the first request.</p>`, code: { lang: 'csharp', check: false, code: `public class PaymentOptions
{
    public const string Section = "Payments";
    [Required, Url] public string BaseUrl { get; init; } = "";
    [Range(1, 120)] public int TimeoutSeconds { get; init; } = 30;
}

builder.Services.AddOptions<PaymentOptions>()
    .Bind(builder.Configuration.GetSection(PaymentOptions.Section))
    .ValidateDataAnnotations()
    .ValidateOnStart();          // fail at startup, not on first use

public class PaymentClient(HttpClient http, IOptions<PaymentOptions> options)
{
    private readonly PaymentOptions _o = options.Value;
}` } },
    { title: 'A small custom middleware', html: `<p>This one gives every request a correlation ID (an ID used to find all log lines of one request) and returns it in a header.</p>`, code: { lang: 'csharp', check: false, code: `public class CorrelationIdMiddleware(RequestDelegate next, ILogger<CorrelationIdMiddleware> log)
{
    public async Task InvokeAsync(HttpContext ctx)
    {
        var id = ctx.Request.Headers["X-Correlation-ID"].FirstOrDefault()
                 ?? Guid.NewGuid().ToString("N");
        ctx.Response.Headers["X-Correlation-ID"] = id;

        using (log.BeginScope(new Dictionary<string, object> { ["CorrelationId"] = id }))
        {
            await next(ctx);     // run the rest of the pipeline
        }
    }
}

app.UseMiddleware<CorrelationIdMiddleware>();` } },
    { title: 'Fixing a captive dependency in a background worker', html: `<p>A <code>BackgroundService</code> is a singleton. It cannot take a scoped <code>DbContext</code> in its constructor. It creates a scope for each round of work instead.</p>`, code: { lang: 'csharp', check: false, code: `public class CleanupWorker(IServiceScopeFactory scopes) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        while (!ct.IsCancellationRequested)
        {
            using (var scope = scopes.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<ShopDb>();
                await db.Carts.Where(c => c.ExpiresAt < DateTime.UtcNow).ExecuteDeleteAsync(ct);
            }
            await Task.Delay(TimeSpan.FromMinutes(5), ct);
        }
    }
}` } }
  ],
  deepDive: `<p><b>Middleware vs filters.</b> Middleware sees every request and knows only HTTP. Filters run inside MVC, around one action, and know the action, its arguments and the model state. Rule of thumb: cross-cutting HTTP concerns (errors, CORS, auth, compression) are middleware; action-level concerns (validating a model, wrapping a result) are filters, or endpoint filters in minimal APIs.</p>
    <p><b>How the container catches lifetime bugs.</b> In the Development environment the host turns on <code>ValidateScopes</code> and <code>ValidateOnBuild</code>. A singleton that needs a scoped service then fails at startup with "Cannot consume scoped service ... from singleton". In Production those checks are off by default, which is why the bug can reach users: a shared <code>DbContext</code> is not thread-safe and throws "A second operation was started on this context".</p>
    <p><b>The three options interfaces.</b> <code>IOptions&lt;T&gt;</code> is a singleton and reads the value once. <code>IOptionsSnapshot&lt;T&gt;</code> is scoped and re-reads per request. <code>IOptionsMonitor&lt;T&gt;</code> is a singleton that always has the current value and can notify you on change, so it is the one a singleton or background service should use.</p>
    <p><b>Errors.</b> Register <code>AddProblemDetails()</code> and an <code>IExceptionHandler</code> (.NET 8 and later). The client gets a stable JSON shape defined by RFC 9457 (type, title, status, detail, plus a trace ID). The real exception goes to the logs only.</p>
    <p><b>Outgoing HTTP.</b> Creating <code>new HttpClient()</code> per call leaks sockets; one static client never notices DNS changes. <code>IHttpClientFactory</code> pools and recycles the underlying handlers. Add <code>AddStandardResilienceHandler()</code> for timeouts, retries with backoff and a circuit breaker, and retry only calls that are safe to repeat.</p>
    <p><b>Keyed services</b> (.NET 8) let you register several implementations of one interface under names and pick one with <code>[FromKeyedServices("email")]</code>.</p>`,
  aiEra: `<p><b>What AI changes:</b> assistants write a correct-looking <code>Program.cs</code> in seconds, so the interview value moved from "can you type it" to "can you spot what is wrong with it". Typical AI mistakes here: middleware in the wrong order, <code>AddSingleton</code> for a class that holds a <code>DbContext</code>, <code>new HttpClient()</code> inside a method, <code>.Result</code> on a task, and old <code>Startup.cs</code> style mixed with the new hosting model.</p>
    <p><b>Use AI as a reviewer:</b> <code>Here is my Program.cs. List every middleware order problem and every DI lifetime problem. Do not rewrite it, just list them with the reason.</code> Then check each claim against the docs.</p>
    <p><b>New concerns for AI features:</b> calls to a language model are slow (seconds) and cost money per call, so use the accept, return job ID, poll pattern or streaming, set timeouts and a per-user rate limit, and never put the API key in <code>appsettings.json</code>.</p>
    <p><b>What you must still own:</b> the order of the pipeline, lifetimes, where secrets live, and what the error response looks like. These are design choices, and a wrong one is a production incident.</p>`,
  problems: [
    P({
      t: 'Every protected endpoint returns 401 after a small refactor', l: 'Easy', tags: ['middleware', 'order', 'auth'],
      s: 'A developer tidied up <code>Program.cs</code>. Since then every endpoint with <code>[Authorize]</code> returns 401, even with a valid token. Anonymous endpoints work. What do you check?',
      ex: '<p>After the refactor: <code>app.UseRouting(); app.UseAuthorization(); app.UseAuthentication(); app.MapControllers();</code></p><p><span class="c-r">The two auth lines are swapped.</span></p>',
      weak: 'The token must be wrong or expired. I would ask the front-end team to log in again and check the identity provider.',
      why: 'The token worked before the change, and the only thing that changed is the startup code. A strong answer follows the evidence to the pipeline order.',
      q: ['Why does swapping the two lines cause 401?', ['Authorization runs while the user is still anonymous', 'The token is decrypted twice', 'Routing can no longer find the controller', 'CORS blocks the request'], 0, 'Authentication is what fills HttpContext.User. If authorization runs first it sees no user and challenges with 401.'],
      h: ['What changed? Only the startup file. Read the pipeline top to bottom like a request would.', 'Which middleware creates the user object, and which one reads it?', 'Fix: UseRouting, then UseCors, then UseAuthentication, then UseAuthorization, then the endpoints. Add a test that calls a protected endpoint with a token.'],
      a: `<p><b>Model answer.</b> "The token did not change, the startup code did, so I look at the middleware order first. <code>UseAuthentication</code> reads the token and sets <code>HttpContext.User</code>. <code>UseAuthorization</code> checks that user against the endpoint's rules. If authorization comes first, the user is still anonymous, so every protected endpoint returns 401. The fix is to put <code>UseAuthentication</code> before <code>UseAuthorization</code>, both after <code>UseRouting</code> and before the endpoints."</p>
        <p>"To stop it coming back I add an integration test with <code>WebApplicationFactory</code>: a protected endpoint returns 401 without a token and 200 with a test token. Then a wrong order fails the build, not production."</p>`,
      cx: 'follows the evidence (what changed), explains what each middleware does, and adds a test so the order cannot silently break again.',
      f: ['What is the difference between 401 and 403?', 'Where does UseCors go, and why before authentication?']
    })
  ]
});

// ====================== TOPIC 3 ======================
var DECORATOR_CS = `class CachedProductRepo : IProductRepo {
  Dictionary<int, Product> cache = new Dictionary<int, Product>();
  IProductRepo inner;                  // the real, slow repository
  public Product Get(int id) {
    if (cache.TryGetValue(id, out var hit))
      return hit;                      // cache hit: no database call
    var p = inner.Get(id);             // cache miss: ask the real one
    cache[id] = p;
    return p;
  }
}`;

var PATTERNS_CS = `using System.Diagnostics;

// ---------- Strategy: swap an algorithm behind one interface ----------
public interface IShippingStrategy { decimal Cost(decimal weightKg); }

public class StandardShipping : IShippingStrategy
{
    public decimal Cost(decimal weightKg) { return 4m + 1m * weightKg; }
}
public class ExpressShipping : IShippingStrategy
{
    public decimal Cost(decimal weightKg) { return 9m + 2m * weightKg; }
}

public class Checkout
{
    private readonly IShippingStrategy _shipping;
    public Checkout(IShippingStrategy shipping) { _shipping = shipping; }   // injected, not created here
    public decimal Total(decimal items, decimal weightKg) { return items + _shipping.Cost(weightKg); }
}

// ---------- Decorator: add behaviour without changing the class ----------
public class Product { public int Id; public string Name; }

public interface IProductRepo { Product Get(int id); }

public class SqlProductRepo : IProductRepo
{
    public Product Get(int id) { return new Product { Id = id, Name = "Product " + id }; }  // stands in for a query
}

// Wraps ANY IProductRepo and adds logging + timing. The wrapped class does not know.
public class TimedProductRepo : IProductRepo
{
    private readonly IProductRepo _inner;
    public TimedProductRepo(IProductRepo inner) { _inner = inner; }

    public Product Get(int id)
    {
        var watch = Stopwatch.StartNew();
        try { return _inner.Get(id); }
        finally { Console.WriteLine("Get(" + id + ") took " + watch.ElapsedMilliseconds + " ms"); }
    }
}

public static class Demo
{
    public static void Main()
    {
        var checkout = new Checkout(new ExpressShipping());
        Console.WriteLine(checkout.Total(50m, 2m));          // 50 + 9 + 4 = 63

        IProductRepo repo = new TimedProductRepo(new SqlProductRepo());
        Console.WriteLine(repo.Get(7).Name);                 // logs the time, then prints Product 7
    }
}`;

topics.push({
  title: 'Design Patterns in C# and .NET',
  analogy: `<p>Design patterns are like <b>standard moves in the kitchen</b>. Nobody invents "boil, then simmer" each time; cooks share names for moves that work. A <b>travel plug adapter</b> lets your charger fit a foreign socket (Adapter). A <b>gift wrap</b> adds something around a present without changing the present (Decorator). A <b>reception desk</b> hides ten departments behind one counter (Facade). Knowing the names lets a team say a lot in one word.</p>`,
  explain: `<p><b>The plain idea:</b> a design pattern is a named, reusable answer to a design problem that keeps coming back. Interviewers do not want you to recite all 23 classic patterns. They want <b>four to six patterns you really used</b>, each told as: the pain, the pattern, the trade-off.</p>` +
    T(['Family', 'What it is about', 'Patterns to know', 'Where .NET itself uses it'], [
      ['<b>Creational</b>', 'how objects get made', 'Singleton, Factory, Builder, Prototype', 'DI singleton lifetime; <code>WebApplication.CreateBuilder</code>; records with <code>with</code>'],
      ['<b>Structural</b>', 'how objects are wrapped and joined', 'Adapter, Decorator, Facade, Proxy, Composite', '<code>Stream</code> wrappers (<code>GZipStream</code> around <code>FileStream</code>); <code>DelegatingHandler</code>; EF Core lazy-loading proxies'],
      ['<b>Behavioural</b>', 'how objects talk and share work', 'Strategy, Observer, Command, Chain of Responsibility, State, Mediator, Iterator, Template Method', 'middleware pipeline; events; <code>IEnumerable</code> with <code>yield</code>; <code>IComparer&lt;T&gt;</code>']
    ]) +
    `<p><b>Enterprise and cloud patterns</b> are the second list a tech lead needs: Repository, Unit of Work, CQRS, Outbox, Saga, Circuit Breaker, Retry with backoff, Bulkhead, Cache-aside, API Gateway, Strangler Fig, Idempotency key.</p>
    <p><b>The honest rule:</b> a pattern is a cost you pay to make one kind of change cheap. If that change never comes, you paid for nothing. Saying when you would <i>not</i> use a pattern is what makes an answer sound senior.</p>`,
  clues: ['"Which design patterns have you used in your project?"', '"How would you add caching or logging without changing the existing class?" → Decorator', '"We may switch vendors later" → Adapter', '"A big switch statement that grows with every new type" → Strategy or Factory', '"Is the repository pattern still useful with EF Core?"', '"How do you publish an event only if the database commit succeeded?" → Outbox', '"What pattern is the ASP.NET Core middleware pipeline?" → Chain of Responsibility', '"Name some anti-patterns you have removed"'],
  code: [{ lang: 'csharp', title: 'Strategy and Decorator in plain C#', code: PATTERNS_CS }],
  viz: [
    codeViz('Decorator: a cache wrapped around a repository', 'csharp', DECORATOR_CS, [
      { line: 4, n: 'The controller only knows the interface <code>IProductRepo</code>. DI gave it the <b>cached wrapper</b>, which holds the real repository inside. First call: <code>Get(7)</code>.', vars: { id: 7, cache: '{ }', 'database calls': 0 }, stack: ['Controller.Show', 'CachedProductRepo.Get(7)'] },
      { line: 5, n: 'The wrapper looks in its dictionary. Product 7 is not there: a <b>cache miss</b>.', vars: { id: 7, cache: '{ }', 'database calls': 0 }, stack: ['Controller.Show', 'CachedProductRepo.Get(7)'] },
      { line: 7, n: 'It passes the call to the wrapped object, <code>inner.Get(7)</code>. The real repository queries the database. It has no idea a cache exists.', vars: { id: 7, cache: '{ }', 'database calls': 1 }, vhl: { 'database calls': 'bad' }, stack: ['Controller.Show', 'CachedProductRepo.Get(7)', 'SqlProductRepo.Get(7)'] },
      { line: 8, cls: 'ok', n: 'The result comes back and is stored in the dictionary.', vars: { id: 7, cache: '{ 7: Kettle }', 'database calls': 1 }, vhl: { cache: 'ok' }, stack: ['Controller.Show', 'CachedProductRepo.Get(7)'] },
      { line: 9, n: 'The wrapper returns the product. The controller cannot tell whether it came from the cache or the database.', vars: { id: 7, cache: '{ 7: Kettle }', 'database calls': 1 }, stack: ['Controller.Show'] },
      { line: 4, n: 'Second call with the same ID: <code>Get(7)</code>.', vars: { id: 7, cache: '{ 7: Kettle }', 'database calls': 1 }, stack: ['Controller.Show', 'CachedProductRepo.Get(7)'] },
      { line: 5, cls: 'ok', n: 'This time the dictionary has it: a <b>cache hit</b>.', vars: { id: 7, cache: '{ 7: Kettle }', 'database calls': 1 }, vhl: { cache: 'ok' }, stack: ['Controller.Show', 'CachedProductRepo.Get(7)'] },
      { line: 6, cls: 'sel', n: 'It returns straight away. The database was called <b>once for two reads</b>, and neither the controller nor the SQL repository changed. That is the Decorator pattern. In real code use <code>IMemoryCache</code> or <code>HybridCache</code> with an expiry, not a bare dictionary.', vars: { id: 7, cache: '{ 7: Kettle }', 'database calls': 1 }, vhl: { 'database calls': 'ok' }, stack: ['Controller.Show'] }
    ])
  ],
  examples: [
    { title: 'Telling a pattern story in 45 seconds', html: `<p>Use three beats: <b>pain</b>, <b>pattern</b>, <b>trade-off</b>.</p><p><span class="c-r">Weak:</span> "We used singleton, factory and repository."</p><p><span class="c-g">Strong:</span> "Our booking system sent notifications by email only. Then sales wanted SMS and push. The send code was a growing <code>if</code> chain inside the booking service. I put each channel behind an <code>INotifier</code> interface (Strategy), registered them as keyed services, and a small factory picks one by the customer's preference. Adding push was one new class and one line of registration, with no change to the booking service. The trade-off is more files and one level of indirection, which is why I would not do it for a single channel."</p>` },
    { title: 'Adapter: hide a vendor SDK behind your own interface', html: `<p>Your code depends on a small interface that <i>you</i> own. One adapter class translates to the vendor's SDK. Switching vendor means writing one new adapter and changing one registration.</p>`, code: { lang: 'csharp', check: false, code: `public interface ISmsSender
{
    Task SendAsync(string phone, string text, CancellationToken ct);
}

// The only class that knows the vendor's types
public class AcmeSmsAdapter(AcmeSmsClient sdk) : ISmsSender
{
    public async Task SendAsync(string phone, string text, CancellationToken ct)
    {
        var request = new AcmeMessage { To = phone, Body = text };
        await sdk.Messages.CreateAsync(request, ct);
    }
}

builder.Services.AddScoped<ISmsSender, AcmeSmsAdapter>();   // swap vendor here` } },
    { title: 'Enterprise patterns in one table', html: T(['Pattern', 'Problem it solves', 'Watch out for'], [['Repository', 'hide data access behind an interface', 'do not wrap EF Core one-to-one for no reason'], ['Unit of Work', 'save several changes as one transaction', '<code>DbContext</code> already is one'], ['CQRS', 'separate read models from write models', 'not the same as event sourcing; adds code'], ['Outbox', 'publish a message only if the database commit succeeded', 'needs a relay process and de-duplication on the consumer'], ['Saga', 'a business transaction across services', 'every step needs an undo (compensation)'], ['Circuit breaker', 'stop calling a dependency that is failing', 'pair with timeouts and a fallback'], ['Retry + backoff + jitter', 'short, temporary failures', 'only for operations safe to repeat'], ['Cache-aside', 'read from cache, fall back to the database', 'stale data and many callers refilling at once'], ['Strangler fig', 'replace an old system piece by piece', 'the routing layer becomes critical'], ['Idempotency key', 'make a retried write safe', 'store the first result per key']]) },
    { title: 'State with a guard: draft, confirmed, cancelled', html: `<p>An order suggested by an automatic process must not become real until a person confirms it. The allowed moves live in one place and illegal moves throw.</p>`, code: { lang: 'csharp', code: `public enum OrderState { Draft, Confirmed, Cancelled }

public class DraftOrder
{
    public OrderState State { get; private set; }

    public void Confirm()
    {
        if (State != OrderState.Draft) throw new InvalidOperationException("Only a draft can be confirmed.");
        State = OrderState.Confirmed;
    }

    public void Cancel()
    {
        if (State == OrderState.Confirmed) throw new InvalidOperationException("A confirmed order cannot be cancelled here.");
        State = OrderState.Cancelled;
    }
}` } }
  ],
  deepDive: `<p><b>Singleton in modern .NET.</b> The classic static <code>Instance</code> property is hard to test and hides dependencies. Prefer registering the class with <code>AddSingleton</code>: you still get one object, but it is injected and replaceable in tests. Whatever you make a singleton must be thread-safe, because every request shares it.</p>
    <p><b>Repository over EF Core: when not to.</b> <code>DbSet&lt;T&gt;</code> is already a repository and <code>DbContext</code> is already a unit of work. A generic <code>IRepository&lt;T&gt;</code> with <code>GetAll()</code> on top adds a layer, hides useful features (projection, <code>Include</code>, <code>AsNoTracking</code>, bulk updates) and often leaks <code>IQueryable</code> anyway. A repository earns its place when it names real domain queries (<code>GetOverdueInvoices</code>), when you need to swap the store, or when you want a small seam for unit tests.</p>
    <p><b>Mediator and CQRS.</b> A mediator library turns each use case into a request object and a handler, with pipeline behaviours for logging and validation (another chain of responsibility). It keeps controllers thin, but "go to definition" no longer leads you to the code, and since 2025 the most used library, MediatR, needs a paid licence for larger companies. Many teams now call handlers directly or use a small in-house dispatcher.</p>
    <p><b>Outbox in one sentence.</b> In the same database transaction, write the business row and a row in an <code>Outbox</code> table; a background relay reads the table and publishes to the message broker. You get at-least-once delivery, so consumers must be idempotent (safe to receive the same message twice).</p>
    <p><b>Anti-patterns to name:</b> god class, service locator (calling the container from everywhere), leaky abstraction (EF entities returned straight from the API), N+1 queries, chatty APIs, shared database between services, distributed monolith (services that must deploy together), and premature optimisation.</p>`,
  aiEra: `<p><b>What AI changes:</b> assistants know every pattern and will happily apply five of them to a 50-line problem. The skill that matters now is <b>judgment</b>: asking "which change does this pattern make cheap, and do we expect that change?"</p>
    <p><b>Patterns are also how AI features are built.</b> A language model client behind your own interface is an Adapter, so you can change provider by configuration. Picking a tool or an agent by name is Strategy plus a registry. Retry, timeout and circuit breaker around the model call are resilience patterns. A draft that needs human approval before it is saved is State with a guard.</p>
    <p><b>Use AI as a sparring partner:</b> <code>Here is my class. Name the design smell, suggest at most one pattern, and tell me the cost of using it.</code> Reject answers that add layers without naming a concrete future change.</p>
    <p><b>What you must still own:</b> the story. Interviewers ask "why that pattern, what did it cost, what would you do differently?" Only someone who lived the trade-off can answer that.</p>`,
  problems: [
    P({
      t: 'The SMS vendor is called from 40 places and must be replaced', l: 'Medium', tags: ['adapter', 'dependency inversion', 'refactoring'],
      s: 'A booking system calls a vendor SMS SDK directly in about 40 classes. The contract ends in two months and a new vendor has a different SDK. How do you make the switch safely, and how do you make the next switch cheap?',
      ex: '<p>Today: <code>new AcmeSmsClient(key).Send(phone, text)</code> scattered across services.</p><p>Goal: <span class="c-g">one interface you own</span>, <span class="c-b">one adapter per vendor</span>, <span class="c-y">one line of registration</span> to switch.</p>',
      weak: 'I would search and replace the old SDK calls with the new SDK calls in all 40 files and test everything by hand.',
      why: 'It couples the code to the new vendor just as tightly, is risky in one big change, cannot be rolled back easily, and the next switch costs the same again.',
      q: ['Which pattern removes the direct dependency on the vendor SDK?', ['Singleton', 'Adapter behind an interface you own', 'Observer', 'Template Method'], 1, 'An Adapter translates your own small interface to the vendor API. Callers depend only on your interface.'],
      h: ['What do the 40 callers actually need? Probably one method: send this text to this number.', 'Do the refactor in two moves: first hide the OLD vendor behind an interface, with no behaviour change. Then add the new vendor.', 'Use configuration or a feature flag to choose the adapter, roll out to a small share of traffic, compare delivery rates, keep the old adapter until the contract ends.'],
      a: `<p><b>Model answer.</b> "I split it into two safe steps."</p>
        <ol>
          <li><b>Introduce a seam, no behaviour change.</b> Define <code>ISmsSender</code> with one method. Write <code>OldVendorSmsAdapter</code> that wraps the current SDK. Replace the 40 direct calls with the injected interface. This is mechanical, covered by existing tests, and can ship on its own.</li>
          <li><b>Add the new vendor.</b> Write <code>NewVendorSmsAdapter</code>, with contract tests that both adapters must pass (same inputs, same observable result). Choose the adapter by configuration or a feature flag.</li>
          <li><b>Roll out gradually.</b> Send 5% of messages through the new adapter, compare delivery rate, latency and cost, then move to 100%. Keep the old adapter registered until the contract ends so rollback is one setting.</li>
        </ol>
        <p>"I would also wrap the sender in a decorator for retry and logging, so resilience is written once and not per vendor. The cost is one interface and two small classes. The gain is that the next vendor change touches one class."</p>`,
      cx: 'separates the refactor (no behaviour change) from the vendor switch, uses Adapter with dependency inversion, and rolls out behind a flag with a rollback.',
      f: ['The new vendor is asynchronous and reports delivery by webhook. How does your interface change?', 'How do you test the adapter without sending real messages?']
    })
  ]
});

// ====================== TOPIC 4 ======================
var RUN_NODES = [
  { id: 'S', label: 'C# source', x: 9, y: 14, shape: 'box' },
  { id: 'R', label: 'Roslyn compiler', x: 34, y: 14, shape: 'box', w: 18 },
  { id: 'A', label: 'Assembly: IL + metadata', x: 68, y: 14, shape: 'box', w: 26 },
  { id: 'L', label: 'CLR loads types', x: 80, y: 46, shape: 'box', w: 18 },
  { id: 'J', label: 'JIT tier 0 (quick)', x: 54, y: 46, shape: 'box', w: 20 },
  { id: 'H', label: 'JIT tier 1 (optimised)', x: 26, y: 46, shape: 'box', w: 22 },
  { id: 'N', label: 'CPU', x: 6, y: 46, shape: 'box', w: 8 }
];
var RUN_EDGES = [['S', 'R'], ['R', 'A'], ['A', 'L'], ['L', 'J'], ['J', 'H'], ['H', 'N']];

function gcFrame(narr, g0, g1, g2, h0, h1, h2, note) {
  var parts = [
    { type: 'array', label: 'Gen 0 (new objects, collected often)', values: g0, hl: h0 || {} },
    { type: 'array', label: 'Gen 1 (survived once)', values: g1, hl: h1 || {} },
    { type: 'array', label: 'Gen 2 (long-lived, collected rarely)', values: g2, hl: h2 || {} }
  ];
  if (note) parts.push({ type: 'text', html: note });
  return { narr: narr, parts: parts };
}

var DISPOSE_CS = `using System.IO;

// Owns a file handle, so it implements IDisposable.
public sealed class FileLog : IDisposable
{
    private readonly StreamWriter _writer;
    private bool _disposed;

    public FileLog(string path) { _writer = new StreamWriter(path); }

    public void Write(string line)
    {
        if (_disposed) throw new ObjectDisposedException("FileLog");
        _writer.WriteLine(line);
    }

    public void Dispose()
    {
        if (_disposed) return;      // safe to call twice
        _writer.Dispose();          // release the file handle NOW, not when the GC gets round to it
        _disposed = true;
    }
}

public static class Demo
{
    public static void Main()
    {
        using (var log = new FileLog(Path.GetTempFileName()))   // Dispose runs at the closing brace
        {
            log.Write("order 42 created");
        }
    }
}`;

topics.push({
  title: 'Runtime Internals: CLR, JIT, Assemblies and the Garbage Collector',
  analogy: `<p>Think of a <b>play performed by a live translator</b>. The script is written once in a neutral language (IL). On the night, a translator (the JIT) turns each scene into the local language the first time it is performed, and remembers it. Scenes that are performed often get a second, polished translation. Backstage, a <b>cleaner</b> (the garbage collector) walks round. The cleaner checks the newest rubbish often, because most things are thrown away quickly, and only rarely does a deep clean of the whole building.</p>`,
  explain: `<p><b>The plain idea:</b> C# is not compiled straight to machine code. It goes in two steps.</p>
    <ol>
      <li>The compiler (<b>Roslyn</b>) turns your source into an <b>assembly</b>: a <code>.dll</code> file holding <b>IL</b> (Intermediate Language, CPU-neutral instructions) and <b>metadata</b> (a description of every type and method).</li>
      <li>At run time the <b>CLR</b> (Common Language Runtime, the engine) loads the assembly, and the <b>JIT</b> (just-in-time compiler) turns each method into machine code the first time it is called.</li>
    </ol>
    <p>Code that runs under the CLR is called <b>managed code</b>: the runtime manages memory, type safety and exceptions for you.</p>
    <p><b>The garbage collector (GC)</b> frees memory for objects nobody can reach any more. It sorts objects by age into three <b>generations</b>, because most objects die young:</p>` +
    T(['Area', 'Holds', 'Collected'], [
      ['Gen 0', 'brand-new objects', 'very often, very cheaply'],
      ['Gen 1', 'objects that survived one collection', 'sometimes; a buffer zone'],
      ['Gen 2', 'long-lived objects (caches, singletons)', 'rarely; the expensive one'],
      ['Large Object Heap', 'objects of 85,000 bytes or more', 'together with Gen 2']
    ]) +
    `<p><b>Why a lead cares:</b> startup time, latency spikes and memory bills all trace back to these two machines. "The API is slow for the first request" is the JIT. "Latency spikes every few minutes" is often a Gen 2 collection.</p>`,
  clues: ['"What happens between writing C# and the CPU running it?"', '"What is the CLR? What is IL?"', '"How does garbage collection work? What are generations?"', '"What is the Large Object Heap?"', '"Can a managed app have a memory leak?"', '"IDisposable vs finalizer"', '"What is Native AOT, and when would you use it?"', '"Why is the first request slow?" → JIT warm-up, cold start', '"What is Span&lt;T&gt; and why is it faster?"'],
  code: [{ lang: 'csharp', title: 'The dispose pattern for a class that owns a resource', code: DISPOSE_CS }],
  viz: [
    flowViz('From source code to running machine code', 'Build time, then run time', RUN_NODES, RUN_EDGES, [
      { n: 'You write C#. The CPU cannot run it, and it cannot run IL either. Two translations are needed.', hl: { S: 'cur' } },
      { n: '<b>Build time:</b> the Roslyn compiler checks your code and translates it.', hl: { R: 'cur' }, ehl: { 'S-R': 'ok' } },
      { n: 'The output is an <b>assembly</b> (<code>Shop.Api.dll</code>). It contains IL, metadata about every type, and a manifest with its name, version and references. The same file runs on Windows, Linux, x64 and Arm64.', hl: { A: 'cur' }, ehl: { 'R-A': 'ok' }, tags: { A: 'portable' } },
      { n: '<b>Run time:</b> the CLR starts, finds the assembly, and loads a type the first time it is used. It also sets up the garbage collector and the thread pool.', hl: { L: 'cur' }, ehl: { 'A-L': 'ok' } },
      { n: 'The first call to a method triggers the <b>JIT</b>. Tier 0 produces machine code fast, with few optimisations, so the app starts quickly.', hl: { J: 'cur' }, ehl: { 'L-J': 'ok' }, tags: { J: 'first call' } },
      { n: 'The runtime counts calls. A method called about 30 times is "hot" and is compiled again in the background at <b>tier 1</b>, fully optimised, using what was measured while it ran (dynamic PGO).', hl: { H: 'cur' }, ehl: { 'J-H': 'ok' }, tags: { H: 'hot methods only' } },
      { n: 'The CPU now runs fast native code. This is why a .NET service gets faster in its first minutes, and why the very first request is the slowest.', hl: { N: 'ok', H: 'ok' }, ehl: { 'H-N': 'ok' } },
      { n: '<b>Two ways to shift work to build time:</b> ReadyToRun ships pre-compiled code next to the IL (faster start, JIT still available). Native AOT compiles everything ahead of time into one native file with no JIT at all (fastest start, smallest memory, but limits on reflection and dynamic loading).', hl: { A: 'sel', J: 'done', H: 'done' }, note: '<b>Rule of thumb:</b> long-running API → normal JIT. Slow cold start → ReadyToRun. Functions, command-line tools, tiny containers → Native AOT if your libraries support it.' }
    ], 60),
    {
      title: 'Generational garbage collection, step by step',
      gen: function () {
        return [
          gcFrame('The app allocates four objects. All new objects start in <b>Gen 0</b>. A and C are still referenced (for example from a list). B and D were temporary.', ['A', 'B', 'C', 'D'], [], [], { 0: 'ok', 2: 'ok', 1: 'bad', 3: 'bad' }),
          gcFrame('Gen 0 is full, so a <b>Gen 0 collection</b> runs. The GC starts from the <b>roots</b> (local variables, static fields) and marks what it can reach: A and C. B and D are unreachable.', ['A', 'B', 'C', 'D'], [], [], { 0: 'cur', 2: 'cur', 1: 'done', 3: 'done' }),
          gcFrame('The dead objects are simply dropped. The survivors are <b>promoted to Gen 1</b> and moved together (compacted). Gen 0 is empty again. This took well under a millisecond.', [], ['A', 'C'], [], {}, { 0: 'ok', 1: 'ok' }),
          gcFrame('More allocations: E, F, G land in Gen 0. Only F stays referenced. C is no longer referenced by anyone.', ['E', 'F', 'G'], ['A', 'C'], [], { 1: 'ok', 0: 'bad', 2: 'bad' }, { 1: 'bad' }),
          gcFrame('A <b>Gen 1 collection</b> runs (it always includes Gen 0). Survivor A moves up to <b>Gen 2</b>. Survivor F moves from Gen 0 to Gen 1. C, E and G are freed.', [], ['F'], ['A'], {}, { 0: 'ok' }, { 0: 'sel' }),
          gcFrame('A is now a long-lived object, maybe a cache entry. It will be looked at again only on a <b>Gen 2 collection</b>, which scans the whole heap and is the costly one. Background GC does most of that work while your threads keep running.', ['H', 'I'], ['F'], ['A'], {}, {}, { 0: 'sel' }),
          gcFrame('<b>Lesson:</b> short-lived objects are nearly free. The expensive cases are objects that live just long enough to reach Gen 2 and then die, and big arrays of 85,000 bytes or more, which go straight to the Large Object Heap.', ['H', 'I'], ['F'], ['A'], {}, {}, {}, '<b>How to help the GC:</b> allocate less in hot paths, reuse big buffers with <code>ArrayPool&lt;T&gt;</code>, avoid caches without a size limit, and dispose things that hold handles.')
        ];
      }
    }
  ],
  examples: [
    { title: 'A managed memory leak', html: `<p>The GC only frees objects that are <b>unreachable</b>. A leak in .NET means something is still holding a reference by mistake. Common holders:</p><ul><li>a static list or dictionary that only ever grows,</li><li>an event subscription that was never removed (the publisher keeps the subscriber alive),</li><li>a cache with no size limit and no expiry,</li><li>a timer that is never disposed,</li><li>a long-lived <code>DbContext</code> whose change tracker keeps every entity it ever loaded.</li></ul><p>To prove it: watch Gen 2 size with <code>dotnet-counters</code>, take two memory dumps a few minutes apart with <code>dotnet-gcdump</code>, and compare which type's count keeps growing and what holds it.</p>` },
    { title: 'JIT vs ReadyToRun vs Native AOT', html: T(['', 'Normal JIT', 'ReadyToRun', 'Native AOT'], [['Start-up', 'slowest', 'faster', 'fastest'], ['Peak speed', 'best (tier 1 + PGO)', 'best after re-JIT', 'good, no run-time tuning'], ['Output size', 'small', 'larger', 'one native file'], ['Reflection, dynamic code', 'full', 'full', 'limited'], ['Needs .NET runtime on the machine', 'yes (or self-contained)', 'yes (or self-contained)', 'no']]) + `<p>Native AOT needs trim-safe libraries. Use source generators (for JSON, logging, regular expressions) in place of run-time reflection.</p>` },
    { title: 'Span: a window onto memory with no copy', html: `<p><code>Substring</code> creates a new string. A <b>span</b> is just a pointer and a length over memory that already exists, so slicing costs nothing and creates no garbage.</p>`, code: { lang: 'csharp', check: false, code: `static int CountDigits(ReadOnlySpan<char> text)
{
    int n = 0;
    foreach (char c in text)
        if (char.IsDigit(c)) n++;
    return n;
}

ReadOnlySpan<char> id = "INV-2026-00042".AsSpan(9);   // a view of "00042", no new string
Console.WriteLine(CountDigits(id));                    // 5

Span<byte> small = stackalloc byte[128];               // on the stack, never seen by the GC

byte[] big = ArrayPool<byte>.Shared.Rent(64 * 1024);   // borrow a large buffer
try { /* fill and use the buffer */ }
finally { ArrayPool<byte>.Shared.Return(big); }        // give it back` } }
  ],
  deepDive: `<p><b>How a collection works.</b> Mark: start from roots (locals on thread stacks, static fields, GC handles) and mark everything reachable. Plan and relocate: decide where survivors go. Compact or sweep: move survivors together or just record the free gaps. A Gen 0 or Gen 1 collection pauses managed threads briefly. A Gen 2 collection is mostly done by <b>background GC</b> while the app runs.</p>
    <p><b>Workstation vs Server GC.</b> Server GC uses one heap and one GC thread per core: higher throughput, more memory. ASP.NET Core uses Server GC on multi-core machines. In containers with small memory limits this matters; since .NET 9 a mode called DATAS is on by default with Server GC and adapts the heap size to the real load.</p>
    <p><b>Large Object Heap (LOH).</b> Objects of 85,000 bytes or more skip the generations. The LOH is collected with Gen 2 and is not compacted by default, so repeated big allocations fragment it. Fix: reuse buffers (<code>ArrayPool&lt;T&gt;</code>), stream data instead of loading it whole, and avoid building huge strings.</p>
    <p><b>Finalizers vs Dispose.</b> A finalizer (<code>~ClassName</code>) runs on a separate thread some time after the object dies, and delays freeing its memory by at least one collection. It is a last-resort safety net. <code>IDisposable</code> with <code>using</code> releases the resource at a known moment. Use <code>IAsyncDisposable</code> and <code>await using</code> when cleanup does I/O.</p>
    <p><b>Assemblies and loading.</b> .NET Framework isolated code in AppDomains. Modern .NET has one AppDomain per process and uses <code>AssemblyLoadContext</code> for isolation, for example to load two versions of a plug-in dependency and to unload plug-ins.</p>
    <p><b>Span rules.</b> <code>Span&lt;T&gt;</code> is a <code>ref struct</code>: it can live only on the stack, so it cannot be a field of a class. Use <code>Memory&lt;T&gt;</code> when the data must be stored on the heap or outlive the current method. C# 13 relaxed one rule: spans can now be used in <code>async</code> methods as long as they are not alive across an <code>await</code>.</p>
    <p><b>Thread pool.</b> Blocking calls such as <code>.Result</code> hold a pool thread doing nothing. Under load the pool runs out, adds threads only slowly, and requests queue while the CPU sits idle. This is thread pool starvation, and the cure is async all the way down.</p>`,
  aiEra: `<p><b>What AI changes:</b> reading a memory dump or a trace used to be a specialist skill. Today you can export the top types from <code>dotnet-gcdump</code> or a flame graph summary and ask an assistant to explain what is holding memory or where the time goes. It is a fast first reading, not a verdict.</p>
    <p><b>Where AI goes wrong:</b> it recommends calling <code>GC.Collect()</code>, adds finalizers "to be safe", suggests <code>Span&lt;T&gt;</code> as a class field, or claims Native AOT works with a library that relies on reflection. It also "optimises" code without a measurement. Ask for a BenchmarkDotNet benchmark and run it.</p>
    <p><b>AI workloads stress the runtime in new ways:</b> big prompt and response strings and embedding arrays easily cross 85,000 bytes and land on the Large Object Heap; streaming responses keep connections open for a long time. Stream and pool where you can.</p>
    <p><b>What you must still own:</b> measure first, change one thing, measure again. And know enough about generations, the LOH and the thread pool to tell when a confident answer is wrong.</p>`,
  problems: [
    P({
      t: 'Memory climbs until the container is killed', l: 'Hard', tags: ['garbage collector', 'memory leak', 'diagnostics'],
      s: 'An ASP.NET Core API in a container with a 1 GB limit restarts every 6 to 8 hours with "out of memory". Traffic is steady. After each restart memory starts low and climbs in a straight line. How do you find and fix it?',
      ex: '<p>Memory graph: <span class="c-g">180 MB</span> after start → <span class="c-y">600 MB</span> after 4 hours → <span class="c-r">1 GB, killed</span>. A straight line under steady traffic means something is being kept on every request.</p>',
      weak: 'The garbage collector is not running often enough. I would call GC.Collect() on a timer, or just give the container 2 GB.',
      why: 'The GC cannot free objects that are still referenced, so forcing it changes nothing. More memory only moves the crash from 6 hours to 12.',
      q: ['Memory grows in a straight line and a forced Gen 2 collection does not bring it down. What does that tell you?', ['The GC is broken', 'Something still references the objects, so this is a leak in your code or a library', 'The container limit is too low', 'Server GC should be switched to Workstation GC'], 1, 'The GC frees only unreachable objects. If a full collection frees nothing, a live reference is holding them.'],
      h: ['A managed leak always has a holder. Think of things that live for the whole process: static fields, singletons, caches, event subscriptions.', 'Which tools show what is growing? Live counters for Gen 2 size, then two heap dumps taken an hour apart and compared.', 'After you find the growing type, look at its "path to root". Fix the holder (bound the cache, unsubscribe, dispose, fix the lifetime), then prove it with a soak test.'],
      a: `<p><b>Model answer.</b> "A straight line under steady load says we keep something per request. I would work in four steps."</p>
        <ol>
          <li><b>Confirm it is managed memory.</b> <code>dotnet-counters monitor</code> on the process: if Gen 2 and LOH size climb with the container memory, it is a managed leak. If the managed heap is flat, I look at native memory instead.</li>
          <li><b>Find the type.</b> Take a <code>dotnet-gcdump</code> one hour after start and another three hours later. Compare counts by type. The type whose count only grows is the lead.</li>
          <li><b>Find the holder.</b> Follow the path to root for that type. Usual suspects: a static or singleton dictionary used as a cache with no limit, an event handler never unsubscribed, a singleton that captured a scoped <code>DbContext</code> whose change tracker keeps every entity, or timers and <code>HttpClient</code> objects created per request.</li>
          <li><b>Fix and prove.</b> Give the cache a size limit and expiry (<code>IMemoryCache</code> with <code>SizeLimit</code>, or <code>HybridCache</code>), fix the lifetime, dispose what must be disposed. Then run a load test for a few hours and show a flat memory line. Add an alert on memory growth rate.</li>
        </ol>
        <p>"I would not call <code>GC.Collect()</code> and I would not just raise the limit, because both hide the cause."</p>`,
      cx: 'knows the GC cannot free reachable objects, uses counters and two dumps to find the growing type and its holder, and proves the fix with a soak test.',
      f: ['The managed heap is flat but process memory still grows. What now?', 'Why can a bounded cache still cause Gen 2 pressure?']
    })
  ]
});

// ====================== TOPIC 5 ======================
var MODERN_CS = `// C# 9: record = small immutable data type with value equality
public record Customer(Guid Id, string Name);
var renamed = customer with { Name = "New name" };          // copy with one change

// C# 11: required members and raw string literals
public class Address { public required string City { get; init; } }
string json = """{ "city": "Pune" }""";

// C# 12: primary constructor and collection expressions
public class OrderService(IOrderRepo repo, ILogger<OrderService> log)
{
    public Task<Order?> Find(int id) => repo.FindAsync(id);
}
int[] first = [1, 2, 3];
int[] all = [.. first, 4, 5];                               // spread

// Pattern matching (C# 8 to 11)
string Describe(Shape s) => s switch
{
    Circle { Radius: > 10 } => "big circle",
    Circle                  => "circle",
    Rect(var w, var h) when w == h => "square",
    _                       => "other"
};
if (items is [var head, .., var tail]) { /* list pattern: first and last */ }

// C# 13: params on any collection type, and the new Lock type
void Log(params ReadOnlySpan<string> parts) { }
private readonly Lock _gate = new();

// C# 14 (.NET 10): the field keyword, null-conditional assignment, extension members
public string Code { get; set => field = value.Trim().ToUpperInvariant(); }
customer?.Name = "Set only when customer is not null";

public static class StringExtensions
{
    extension(string s)
    {
        public bool IsBlank => string.IsNullOrWhiteSpace(s);   // an extension PROPERTY
    }
}`;

var TOOLBOX_CS = `builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    o.AddPolicy("per-user", ctx => RateLimitPartition.GetTokenBucketLimiter(
        ctx.User.Identity?.Name ?? ctx.Connection.RemoteIpAddress?.ToString() ?? "anonymous",
        _ => new TokenBucketRateLimiterOptions
        {
            TokenLimit = 20,                                  // burst size
            TokensPerPeriod = 10,                             // refill
            ReplenishmentPeriod = TimeSpan.FromSeconds(1),
            QueueLimit = 0
        }));
});
builder.Services.AddOutputCache(o =>
    o.AddPolicy("short", p => p.Expire(TimeSpan.FromSeconds(30)).Tag("products")));
builder.Services.AddResponseCompression();
builder.Services.AddHealthChecks()
    .AddCheck("self", () => HealthCheckResult.Healthy(), tags: new[] { "live" })
    .AddDbContextCheck<ShopDb>("database", tags: new[] { "ready" });

app.UseRateLimiter();
app.UseOutputCache();

// liveness: is the process alive?   readiness: can it serve traffic right now?
app.MapHealthChecks("/health/live",  new HealthCheckOptions { Predicate = r => r.Tags.Contains("live") });
app.MapHealthChecks("/health/ready", new HealthCheckOptions { Predicate = r => r.Tags.Contains("ready") });`;

topics.push({
  title: 'Features by Version and the Production Toolbox',
  analogy: `<p>A <b>phone</b> gets a system update every year. You do not need to know every setting that changed, but you should know the two or three new things you now use daily, and which year they arrived. Language and framework versions are the same. On top of that, a production API needs a <b>safety kit</b>, like a car: a speed limiter (rate limiting), a dashboard warning light (health checks), and a black-box recorder (logging and tracing).</p>`,
  explain: `<p><b>The plain idea:</b> each November brings a new C# version with a new .NET version. Interviewers ask "what is new?" to see whether you keep up and whether you use features for a reason. Have <b>two or three features per version</b> that you can explain with an example.</p>` +
    T(['C#', 'Ships with', 'Features to name'], [
      ['7', '.NET Framework 4.7, .NET Core 2', 'tuples, pattern matching basics, local functions, <code>out var</code>'],
      ['8', '.NET Core 3', 'nullable reference types, switch expressions, async streams, ranges'],
      ['9', '.NET 5', 'records, init-only setters, top-level statements'],
      ['10', '.NET 6', 'global usings, file-scoped namespaces, record structs'],
      ['11', '.NET 7', 'required members, raw string literals, list patterns'],
      ['12', '.NET 8', 'primary constructors, collection expressions'],
      ['13', '.NET 9', 'params collections, the <code>Lock</code> type, ref structs in async methods'],
      ['14', '.NET 10', '<code>field</code> keyword, extension members, null-conditional assignment']
    ]) +
    `<p><b>The production toolbox</b> built into ASP.NET Core, which a lead is expected to switch on:</p>
    <ul>
      <li><b>Rate limiting</b>: refuse requests above a limit with status 429, so one client cannot starve the rest.</li>
      <li><b>Output caching</b>: keep a whole response on the server for a short time.</li>
      <li><b>Health checks</b>: <i>liveness</i> (the process is alive) and <i>readiness</i> (it can serve traffic now).</li>
      <li><b>Structured logging and OpenTelemetry</b>: logs, metrics and traces that can be followed across services.</li>
      <li><b>System.Text.Json</b>: the built-in JSON serializer, with source generation for speed and Native AOT.</li>
    </ul>`,
  clues: ['"What is new in C# 12, 13 or 14?"', '"Which recent .NET feature did you adopt, and why?"', '"What is a record? Why use it for DTOs?"', '"Explain deferred execution in LINQ"', '"How do you protect an API from being flooded?"', '"Liveness vs readiness"', '"How do you trace one request across three services?"', '"System.Text.Json or Newtonsoft?"', '"Give me a real example of each SOLID principle"'],
  code: [
    { lang: 'csharp', check: false, title: 'Modern C# in one screen (C# 9 to 14)', code: MODERN_CS },
    { lang: 'csharp', check: false, title: 'Rate limiting, output caching and health checks', code: TOOLBOX_CS }
  ],
  viz: [
    rowViz('C# and .NET versions: what to name for each', 'One feature story per version',
      ['C#', '.NET', 'Year', 'The feature', 'Why you would use it'],
      [
        ['8', 'Core 3.x', '2019', 'Nullable reference types', 'The compiler warns before a null reference crash'],
        ['9', '5', '2020', 'Records', 'Immutable DTOs with value equality in one line'],
        ['10', '6 (LTS)', '2021', 'File-scoped namespaces, minimal APIs', 'Less ceremony; a small API in one file'],
        ['11', '7', '2022', 'Required members, raw strings', 'Object must be fully set; JSON and SQL text without escaping'],
        ['12', '8 (LTS)', '2023', 'Primary constructors, collection expressions', 'Constructor injection without boilerplate'],
        ['13', '9', '2024', 'Lock type, params collections', 'A faster, clearer lock; no array allocation for params'],
        ['14', '10 (LTS)', '2025', 'field keyword, extension members', 'Validate in a setter without a backing field; extension properties']
      ],
      ['Nobody remembers every feature. Build one short story per version: the feature and the reason you use it.',
        '<b>C# 8</b>: nullable reference types. <code>string?</code> may be null, <code>string</code> may not, and the compiler checks it.',
        '<b>C# 9</b>: records. <code>record Customer(Guid Id, string Name)</code> gives a constructor, equality by value and <code>with</code> copies.',
        '<b>C# 10 and .NET 6</b>: the "less ceremony" release. One-line namespaces and minimal APIs.',
        '<b>C# 11</b>: <code>required</code> forces callers to set a property. Raw string literals hold JSON without backslashes.',
        '<b>C# 12</b>: a class can take its dependencies in its header, <code>class OrderService(IOrderRepo repo)</code>.',
        '<b>C# 13</b>: <code>System.Threading.Lock</code> replaces locking on a plain <code>object</code>.',
        '<b>C# 14</b>: inside a property, <code>field</code> is the compiler-made backing field, so a setter can validate without you declaring one.'],
      'In the interview pick <b>three</b> you really use and say why. "We moved our DTOs to records and turned on nullable reference types, which removed a class of null bugs" beats a list of ten names.', [1, 4, 6]),
    {
      title: 'Token bucket rate limiter',
      input: '3 0 7 2 9 1 0 4',
      inputLabel: 'Requests arriving in each second (bucket holds 5 tokens, refills 2 per second)',
      gen: function (input) {
        var a = String(input).trim().split(/[\s,]+/).map(Number);
        if (!a.length || a.some(function (x) { return isNaN(x) || x < 0 || x > 50; })) throw new Error('Enter whole numbers from 0 to 50 separated by spaces, for example: 3 0 7 2');
        if (a.length > 12) throw new Error('Use at most 12 seconds');
        var cap = 5, refill = 2, tokens = cap, okTotal = 0, rejTotal = 0, okSeries = [], rejSeries = [], labels = [];
        var frames = [{ narr: 'A <b>token bucket</b> holds up to ' + cap + ' tokens and gains ' + refill + ' each second. Every request takes one token. No token means the request is refused with <b>429 Too Many Requests</b>. The bucket starts full.', parts: [{ type: 'vars', label: 'Bucket', vals: { tokens: tokens, capacity: cap, 'refill per second': refill } }] }];
        for (var i = 0; i < a.length; i++) {
          if (i > 0) tokens = Math.min(cap, tokens + refill);
          var before = tokens, served = Math.min(a[i], tokens), rejected = a[i] - served;
          tokens -= served; okTotal += served; rejTotal += rejected;
          okSeries.push(served); rejSeries.push(rejected); labels.push('s' + (i + 1));
          var h = {}; h[i] = rejected ? 'bad' : 'ok';
          frames.push({
            narr: 'Second ' + (i + 1) + ': ' + before + ' token(s) available, <b>' + a[i] + '</b> request(s) arrive. ' + served + ' served' + (rejected ? ', <span class="c-r">' + rejected + ' refused with 429</span>.' : ', none refused.') + ' Tokens left: ' + tokens + '.',
            parts: [
              { type: 'bars', label: 'Served per second', values: okSeries.slice(), idxLabels: labels.slice(), hl: h },
              { type: 'bars', label: 'Refused per second (429)', values: rejSeries.slice(), idxLabels: labels.slice(), hl: h },
              { type: 'vars', label: 'Bucket', vals: { 'tokens before': before, 'tokens after': tokens, 'served so far': okTotal, 'refused so far': rejTotal }, hl: rejected ? { 'refused so far': 'bad' } : { 'tokens after': 'ok' } }
            ]
          });
        }
        frames.push({ narr: 'Total: <b>' + okTotal + '</b> served, <b>' + rejTotal + '</b> refused. Short bursts up to the bucket size pass; a steady flood is cut down to the refill rate. Clients that get 429 should wait (the <code>Retry-After</code> header) and try again.', parts: [{ type: 'bars', label: 'Served per second', values: okSeries.slice(), idxLabels: labels.slice() }, { type: 'bars', label: 'Refused per second (429)', values: rejSeries.slice(), idxLabels: labels.slice() }] });
        return frames;
      }
    }
  ],
  examples: [
    { title: 'LINQ deferred execution: the query that runs twice', html: `<p>A LINQ query is a <b>recipe</b>, not a result. It runs each time you loop over it.</p>` + CODE(`var active = db.Customers.Where(c => c.IsActive);   // nothing has run yet

var count = active.Count();        // SQL query 1
foreach (var c in active) { }      // SQL query 2 (the data may have changed in between)

var list = active.ToList();        // run once, keep the result
var count2 = list.Count;           // no query`) + `<p>Other traps: <code>Count() &gt; 0</code> where <code>Any()</code> would do; <code>AsEnumerable()</code> or <code>ToList()</code> too early, which pulls a whole table into memory before filtering; <code>Single</code> where you meant <code>First</code>.</p>` },
    { title: 'SOLID with real violations', html: T(['Principle', 'A violation you have seen', 'The fix'], [['Single responsibility', 'a controller that validates, queries the database and sends email', 'split into validator, service, notifier'], ['Open/closed', 'a <code>switch (paymentType)</code> edited for every new type', 'one class per type behind an interface; add a class, not a branch'], ['Liskov substitution', 'a subclass that throws <code>NotSupportedException</code> for an inherited method', 'split the interface; prefer composition'], ['Interface segregation', 'one repository interface with 20 methods', 'small role interfaces such as <code>IOrderReader</code> and <code>IOrderWriter</code>'], ['Dependency inversion', 'business code that creates a <code>SqlConnection</code> itself', 'depend on an interface; inject the implementation']]) },
    { title: 'JSON pitfalls with System.Text.Json', html: T(['Pitfall', 'What happens', 'What to do'], [['Enums', 'written as numbers by default', 'add <code>JsonStringEnumConverter</code>'], ['Dates', '<code>DateTime</code> without a zone is ambiguous', 'use <code>DateTimeOffset</code> in UTC'], ['Property name case', 'the plain serializer is case-sensitive; ASP.NET Core web defaults are camelCase and case-insensitive', 'know which options object you are using'], ['Cycles', 'parent → child → parent throws', 'return DTOs, not EF entities'], ['Inheritance', 'derived properties are dropped', 'mark the base with <code>[JsonDerivedType]</code>'], ['Unknown properties', 'silently ignored', 'set <code>UnmappedMemberHandling.Disallow</code> if you want strictness']]) },
    { title: 'Tracing one request across services', html: `<p>OpenTelemetry gives each request a <b>trace ID</b> and each step a <b>span</b>. The ID travels to the next service in the <code>traceparent</code> HTTP header (the W3C Trace Context standard), so one search shows the whole journey.</p>`, code: { lang: 'csharp', check: false, code: `builder.Services.AddOpenTelemetry()
    .ConfigureResource(r => r.AddService("shop-api"))
    .WithTracing(t => t
        .AddAspNetCoreInstrumentation()
        .AddHttpClientInstrumentation()
        .AddSource("Shop.Checkout"))
    .WithMetrics(m => m
        .AddAspNetCoreInstrumentation()
        .AddRuntimeInstrumentation())
    .UseOtlpExporter();

// A custom span around an important step
static readonly ActivitySource Source = new("Shop.Checkout");

using (var activity = Source.StartActivity("checkout.pay"))
{
    activity?.SetTag("order.id", orderId);
    await payments.ChargeAsync(orderId, ct);
}

// Structured log: named placeholders, not string concatenation
log.LogInformation("Order {OrderId} paid in {ElapsedMs} ms", orderId, elapsedMs);` } }
  ],
  deepDive: `<p><b>What actually landed in the last three releases.</b></p>
    <ul>
      <li><b>.NET 8 (LTS, 2023):</b> Native AOT for minimal APIs, keyed DI services, <code>TimeProvider</code> (testable time), <code>FrozenDictionary</code>, <code>IExceptionHandler</code>, the <code>Microsoft.Extensions.Http.Resilience</code> package, Blazor Web App, EF Core 8 complex types and primitive collections.</li>
      <li><b>.NET 9 (STS, 2024):</b> built-in OpenAPI document generation (Swashbuckle left the default template), <code>HybridCache</code>, <code>System.Threading.Lock</code>, LINQ <code>CountBy</code>, <code>AggregateBy</code> and <code>Index</code>, <code>Task.WhenEach</code>.</li>
      <li><b>.NET 10 (LTS, 2025):</b> C# 14; ASP.NET Core 10 with built-in validation for minimal APIs, Server-Sent Events results, OpenAPI 3.1 and passkey sign-in in Identity; EF Core 10 with named query filters, <code>LeftJoin</code>, vector search and a native JSON column type on SQL Server 2025 and Azure SQL; run a single file with <code>dotnet run app.cs</code>; and the <code>Microsoft.Extensions.AI</code> building blocks.</li>
    </ul>
    <p><b>Liveness must be dumb.</b> If the liveness check pings the database, a short database outage makes the orchestrator restart every instance at once, and they all come back to a database that is still down. Liveness says "the process is not stuck". Readiness says "send me traffic", and a failed readiness check only removes the instance from the load balancer.</p>
    <p><b>Rate limiter choices:</b> fixed window (simple, allows a double burst at the edge of two windows), sliding window (smoother), token bucket (allows short bursts), concurrency (limits requests in flight, good for expensive endpoints). The built-in limiter keeps its counters in memory per instance. For one shared limit across instances, put it at the gateway or use a shared store.</p>
    <p><b>Logging on hot paths.</b> Use message templates with named placeholders so log systems can filter by field. For very hot code, <code>[LoggerMessage]</code> source-generated methods avoid boxing and string work when the level is off.</p>
    <p><b>Refactoring legacy code:</b> write characterisation tests (tests that pin down what the code does today), then change in small steps: extract method, introduce an interface as a seam, branch by abstraction, ship behind a feature flag.</p>`,
  aiEra: `<p><b>What AI changes:</b> assistants were trained mostly on older code, so they default to older style: <code>Startup.cs</code>, Newtonsoft.Json, Swashbuckle, <code>lock (obj)</code>, hand-written backing fields. As a lead, write the target version and the house style into the project's AI instructions file so generated code matches your code base.</p>
    <p><b>.NET itself now ships AI building blocks.</b> <code>Microsoft.Extensions.AI</code> gives one interface, <code>IChatClient</code>, over different model providers, with middleware for caching, telemetry and tool calling. It follows the same ideas as the rest of this module: dependency injection, a pipeline, and options.</p>
    <p><b>The toolbox matters more with AI features:</b> rate limit per user because every call costs money; trace each model call with token counts as span tags; use Server-Sent Events to stream answers; keep health checks independent of the model provider.</p>
    <p><b>What you must still own:</b> deciding which new feature is worth adopting. A good rule to say out loud: "We adopt a language feature when it removes a class of bugs or a lot of boilerplate, and we adopt it everywhere with an analyzer rule, not in one file."</p>`
});

// ====================== INTERVIEW: 1. .NET history and versions ======================
interview.push({
  q: 'Give me the .NET timeline in one minute.', level: 'B',
  a: `<p>.NET started in 2002 as a Windows-only platform, was rewritten as a cross-platform open-source platform in 2016, and since 2020 is one product with a new version every November.</p>` +
    T(['Era', 'Releases', 'Remember it for'], [
      ['.NET Framework', '1.0 (2002) to 4.8.1 (2022)', 'Windows only. Generics (2.0), LINQ (3.5), tasks (4.0), async/await (4.5). Now security fixes only'],
      ['.NET Core', '1.0 (2016) to 3.1 (2019)', 'Cross-platform, open source, ASP.NET Core, much faster'],
      ['.NET (unified)', '5 (2020), 6, 7, 8, 9, 10 (2025)', 'One platform. Even numbers are long-term support']
    ]) +
    `<p>Version 4 was skipped for the new line so nobody would confuse it with .NET Framework 4.x, and the word "Core" was dropped at version 5. ASP.NET Core kept its name.</p>
    <blockquote><b>Say it in the interview:</b> .NET Framework is the Windows-only original and is in maintenance. .NET Core was the cross-platform rewrite. From .NET 5 it is simply ".NET", with a release every November, and .NET 10 is the current long-term support version.</blockquote>`,
  followUps: ['Why was version 4 skipped?', 'Which version brought async and await?', 'Is .NET Framework dead?']
});

interview.push({
  q: 'What is managed code, and what does the CLR do for you?', level: 'B',
  a: `<p>Managed code is code that runs under the control of the .NET runtime, called the CLR (Common Language Runtime), which looks after memory and safety for you.</p>
    <p>What the CLR does while your program runs:</p>
    <ul>
      <li><b>Memory:</b> it allocates objects and the garbage collector frees them when nothing uses them. You never call <code>free</code>.</li>
      <li><b>Type safety:</b> it stops you treating an object as the wrong type or reading past the end of an array.</li>
      <li><b>Compilation:</b> the JIT compiler turns the portable IL in your <code>.dll</code> into machine code for the CPU it is running on.</li>
      <li><b>Exceptions, threads and the thread pool.</b></li>
    </ul>
    <p><b>Unmanaged code</b> is code outside that control, such as a C library or a Windows API. Unmanaged <b>resources</b> are things the garbage collector does not understand: file handles, sockets, database connections. Those you release yourself with <code>Dispose</code>.</p>
    <blockquote><b>Say it in the interview:</b> Managed code runs on the CLR, which gives me garbage collection, type safety and just-in-time compilation. The one thing it cannot do is release unmanaged resources like file handles, so for those I use IDisposable and a using statement.</blockquote>`,
  followUps: ['How do you call unmanaged code from C#?', 'What is IL?', 'Does the garbage collector close a file for you?']
});

interview.push({
  q: 'What is the difference between an assembly, a namespace and a NuGet package?', level: 'B',
  a: `<p>An assembly is a file, a namespace is a name, and a NuGet package is a zip that delivers assemblies.</p>` +
    T(['Term', 'What it is', 'Example'], [
      ['<b>Assembly</b>', 'the compiled unit: a <code>.dll</code> or <code>.exe</code> containing IL, metadata and a version', '<code>Shop.Orders.dll</code>'],
      ['<b>Namespace</b>', 'a logical prefix that groups type names and avoids clashes', '<code>Shop.Orders.Domain</code>'],
      ['<b>NuGet package</b>', 'a versioned <code>.nupkg</code> archive with one or more assemblies and a list of dependencies', '<code>Serilog 4.x</code>'],
      ['<b>Project</b>', 'a <code>.csproj</code> that builds one assembly', '<code>Shop.Orders.csproj</code>']
    ]) +
    `<p>They do not have to line up. One assembly can hold many namespaces, and one namespace (<code>System</code>) is spread across many assemblies. The <code>internal</code> keyword means "visible inside this assembly", which is why the assembly is the real unit of encapsulation and of versioning.</p>
    <blockquote><b>Say it in the interview:</b> An assembly is the physical compiled file and the unit of deployment and versioning. A namespace is only a logical name for organising types. A NuGet package is how assemblies are shipped and versioned between teams.</blockquote>`,
  followUps: ['What does internal mean, and what is InternalsVisibleTo?', 'What is in the assembly manifest?', 'What is a transitive package dependency?']
});

interview.push({
  q: '.NET Framework vs modern .NET: what are the differences interviewers want?', level: 'B',
  a: `<p>.NET Framework runs only on Windows and gets no new features, while modern .NET runs anywhere, is open source and is where all new work happens.</p>` +
    T(['', '.NET Framework', 'Modern .NET'], [
      ['Runs on', 'Windows only', 'Windows, Linux, macOS, containers'],
      ['Install', 'one copy per machine, part of Windows', 'many versions side by side, or shipped inside the app'],
      ['Web', 'ASP.NET on <code>System.Web</code>, tied to IIS', 'ASP.NET Core on Kestrel, middleware, DI built in'],
      ['Settings', '<code>web.config</code>', '<code>appsettings.json</code>, environment variables, vaults'],
      ['Speed', 'baseline', 'much faster (better JIT and GC, <code>Span&lt;T&gt;</code>)'],
      ['Source', 'mostly closed', 'fully open source'],
      ['Future', 'security fixes', 'all new features']
    ]) +
    `<p>Not carried over to modern .NET: Web Forms, the WCF server side (the community project CoreWCF fills that gap), Remoting, and creating extra AppDomains.</p>
    <blockquote><b>Say it in the interview:</b> Framework is Windows-only and in maintenance. Modern .NET is cross-platform, open source, faster and can be deployed side by side or self-contained. Web Forms and server-side WCF did not come across, so those are the parts that make a migration hard.</blockquote>`,
  followUps: ['Why is modern .NET faster?', 'What would you do with a WCF service during a migration?', 'Can both run on the same server?']
});

interview.push({
  q: 'What is the difference between <code>dotnet build</code>, <code>run</code> and <code>publish</code>, and what are framework-dependent, self-contained and single-file deployments?', level: 'B',
  a: `<p><code>build</code> compiles, <code>run</code> compiles and starts the app for development, and <code>publish</code> produces the folder you actually deploy.</p>` +
    T(['Command', 'What you get'], [
      ['<code>dotnet build</code>', 'compiled output in <code>bin/</code> for development and testing'],
      ['<code>dotnet run</code>', 'build, then start the app from source'],
      ['<code>dotnet test</code>', 'build and run the tests'],
      ['<code>dotnet publish -c Release</code>', 'a clean deployable folder with the app and its dependencies']
    ]) +
    `<p>Publish has three main shapes:</p>
    <ul>
      <li><b>Framework-dependent</b> (the default): small output; the server must have the matching .NET runtime.</li>
      <li><b>Self-contained</b> (<code>-r linux-x64 --self-contained true</code>): the runtime is included; nothing to install, bigger output, and you own patching the runtime.</li>
      <li><b>Single file</b> (<code>-p:PublishSingleFile=true</code>): everything packed into one executable. Add <code>PublishTrimmed</code> to remove unused code, or <code>PublishAot</code> for a native binary with no JIT.</li>
    </ul>
    <blockquote><b>Say it in the interview:</b> I build and run during development and publish for deployment. Framework-dependent is small and relies on the runtime on the host, which suits a shared container base image. Self-contained carries its own runtime, which suits machines I do not control.</blockquote>`,
  followUps: ['Who patches the runtime in a self-contained app?', 'What is a runtime identifier (RID)?', 'What does trimming break?']
});

interview.push({
  q: 'What are LTS and STS, and what is the support situation today?', level: 'I',
  a: `<p>LTS means long-term support (3 years) and STS means standard-term support (2 years); even versions are LTS and odd versions are STS.</p>
    <p>STS used to be 18 months. In 2025 Microsoft extended it to 24 months, so an STS version now ends on the same day as the LTS version released before it.</p>` +
    T(['Version', 'Kind', 'Supported until'], [
      ['.NET 8', 'LTS', '10 November 2026 (now out of support)'],
      ['.NET 9', 'STS', '10 November 2026 (now out of support)'],
      ['.NET 10', 'LTS', '14 November 2028'],
      ['.NET Framework 4.8.1', 'Windows component', 'as long as the Windows version it ships with']
    ]) +
    `<p>"Out of support" means no more security patches. For most companies that makes it a compliance problem, so the lead plans the move before the date. A related date: the Azure Functions in-process model also ended on 10 November 2026; use the isolated worker model.</p>
    <p>Always confirm dates on Microsoft's .NET support policy page before you quote them.</p>
    <blockquote><b>Say it in the interview:</b> Even versions are LTS with three years of patches, odd versions are STS with two. .NET 8 and 9 both left support in November 2026, so production should be on .NET 10, which is supported until November 2028.</blockquote>`,
  followUps: ['How would you handle a fleet of services still on .NET 8?', 'When would you choose an STS release?', 'What is a servicing (patch) update and how does it reach your servers?']
});

interview.push({
  q: 'Explain the .NET architecture: CLR, CLI, IL, JIT, BCL, runtime vs SDK.', level: 'I',
  a: `<p>Your C# is compiled to a portable instruction format called IL, and a runtime called the CLR turns that IL into machine code while the program runs.</p>` +
    T(['Term', 'Meaning'], [
      ['<b>IL</b>', 'Intermediate Language: CPU-neutral instructions stored in the <code>.dll</code> next to metadata'],
      ['<b>CLI</b>', 'Common Language Infrastructure: the open standard (ECMA-335) that defines IL, metadata and how they run'],
      ['<b>CLR</b>', "Common Language Runtime: Microsoft's implementation of that standard (type loader, JIT, garbage collector, exceptions)"],
      ['<b>JIT</b>', 'just-in-time compiler: IL to machine code on first call; tiered, so hot methods are re-compiled with more optimisation'],
      ['<b>BCL</b>', 'Base Class Library: <code>System.*</code> types such as collections, IO, networking, LINQ'],
      ['<b>Runtime</b>', 'what you need to run an app: <code>Microsoft.NETCore.App</code>, plus <code>Microsoft.AspNetCore.App</code> for web apps'],
      ['<b>SDK</b>', 'what you need to build: compiler, the <code>dotnet</code> tool, templates. It includes a runtime']
    ]) +
    `<p>Several SDKs and runtimes can be installed side by side. <code>global.json</code> pins which SDK builds the code. <code>TargetFramework</code> (for example <code>net10.0</code>) decides which runtime the app runs on. Note that "CLI" is also used for the <code>dotnet</code> command-line interface, so say which one you mean.</p>
    <blockquote><b>Say it in the interview:</b> Roslyn compiles C# to IL inside an assembly. At run time the CLR loads it and the JIT compiles each method to native code on first use, while the garbage collector manages memory. The SDK is for building, the runtime is for running.</blockquote>`,
  followUps: ['What is tiered compilation?', 'What is the difference between the SDK version and the target framework?', 'What does Native AOT remove from this picture?']
});

interview.push({
  q: 'What is .NET Standard, and is it still relevant?', level: 'I',
  a: `<p>.NET Standard is a specification, a list of APIs, that let one library work on .NET Framework, .NET Core and Xamarin at the same time. It is only needed today when a library must still load in .NET Framework.</p>
    <ul>
      <li><code>netstandard2.0</code> is the widest target: it works on .NET Framework 4.6.1 and later (4.7.2 or later in practice) and on every modern .NET.</li>
      <li><code>netstandard2.1</code> is <b>not</b> supported by any .NET Framework version, so it rarely helps.</li>
      <li>There will be no new .NET Standard versions. Since .NET 5, the unified platform itself is the common base.</li>
    </ul>
    <p>The current advice:</p>` +
    T(['Your library is used by', 'Target'], [
      ['modern .NET apps only', '<code>net10.0</code> (or the lowest version you support)'],
      ['modern .NET and .NET Framework', 'multi-target: <code>&lt;TargetFrameworks&gt;net10.0;net48&lt;/TargetFrameworks&gt;</code>, or <code>netstandard2.0</code> if it is small'],
      ['Roslyn source generators and analyzers', '<code>netstandard2.0</code> (still required)']
    ]) +
    `<blockquote><b>Say it in the interview:</b> .NET Standard was the bridge between the old and new runtimes. For new libraries I target a modern .NET version directly, and I only add netstandard2.0 or multi-targeting when a .NET Framework app still has to consume the library.</blockquote>`,
  followUps: ['What is multi-targeting and how do you write version-specific code?', 'Why can .NET Framework not use netstandard2.1?', 'Why do source generators still target netstandard2.0?']
});

interview.push({
  q: 'What changed in the recent .NET releases that you should be able to name?', level: 'I',
  a: `<p>Name two or three real features per release, the ones you would use in a web API.</p>` +
    T(['Release', 'Features worth naming'], [
      ['.NET 6 (LTS)', 'minimal APIs and the single-file <code>Program.cs</code> host, hot reload, <code>DateOnly</code> and <code>TimeOnly</code>, <code>Parallel.ForEachAsync</code>'],
      ['.NET 7', 'rate limiting middleware, output caching, Native AOT for console apps'],
      ['.NET 8 (LTS)', 'keyed DI services, <code>TimeProvider</code>, <code>FrozenDictionary</code>, <code>IExceptionHandler</code>, Native AOT for minimal APIs, the HTTP resilience package'],
      ['.NET 9', 'built-in OpenAPI document generation, <code>HybridCache</code>, <code>System.Threading.Lock</code>, LINQ <code>CountBy</code> and <code>AggregateBy</code>'],
      ['.NET 10 (LTS)', 'C# 14, built-in validation for minimal APIs, Server-Sent Events results, passkeys in Identity, EF Core 10 named query filters and vector search, <code>dotnet run app.cs</code>']
    ]) +
    `<p>Then add one sentence of use: "We replaced our own clock interface with <code>TimeProvider</code>, so time-based tests no longer sleep."</p>
    <blockquote><b>Say it in the interview:</b> From .NET 8 I use keyed services, TimeProvider and IExceptionHandler. From .NET 9, the built-in OpenAPI generation and HybridCache. From .NET 10, C# 14 and the built-in minimal API validation. I check the official "What's new" page before quoting details.</blockquote>`,
  followUps: ['What problem does HybridCache solve over IMemoryCache?', 'Why did the default template drop Swashbuckle?', 'What is TimeProvider for?']
});

interview.push({
  q: 'How would you migrate a .NET Framework application to modern .NET?', level: 'A',
  a: `<p>I would not rewrite it in one go; I would measure what blocks the move, put tests around current behaviour, and migrate piece by piece while the old app keeps running.</p>
    <ol>
      <li><b>Inventory:</b> projects, NuGet packages, and Windows-only or removed technology (<code>System.Web</code>, Web Forms, WCF hosting, COM, the registry).</li>
      <li><b>Analyse:</b> run the upgrade tooling to list blockers. The older .NET Upgrade Assistant is now replaced by the GitHub Copilot app modernization agent, which plans and applies the upgrade.</li>
      <li><b>Choose a strategy:</b> big bang for a small app. For a large one, the <b>strangler fig</b>: a new ASP.NET Core app sits in front, a reverse proxy (YARP) sends migrated routes to it and the rest to the old app.</li>
      <li><b>Mechanics:</b> SDK-style project files, update packages, class libraries first (multi-target them), <code>web.config</code> to <code>appsettings.json</code>, <code>HttpContext.Current</code> to injected services, WCF to REST or gRPC (or CoreWCF), Web Forms pages rewritten in Razor, Blazor or a JavaScript front end.</li>
      <li><b>Safety net:</b> characterisation tests before touching anything, then compare outputs and performance old against new.</li>
      <li><b>Cutover:</b> canary traffic, monitoring, a rollback path, and a date to delete the old code.</li>
    </ol>
    <blockquote><b>Say it in the interview:</b> I start with an inventory and tests, move shared libraries first, and use the strangler fig pattern with a reverse proxy so features move one at a time and every step can be rolled back. A full rewrite is my last choice.</blockquote>`,
  followUps: ['How do old and new apps share login sessions during the migration?', 'What do you do with Web Forms pages?', 'How do you convince the business to pay for it?']
});

// ====================== INTERVIEW: 2. ASP.NET Core fundamentals ======================
interview.push({
  q: 'What does the host do, and what does <code>WebApplication.CreateBuilder(args)</code> set up for you?', level: 'B',
  a: `<p>The host is the object that starts your app and owns everything it needs to run: configuration, logging, dependency injection and the web server.</p>
    <p>One call to <code>WebApplication.CreateBuilder(args)</code> prepares sensible defaults:</p>
    <ul>
      <li><b>Configuration</b> from <code>appsettings.json</code>, <code>appsettings.{Environment}.json</code>, user secrets (Development only), environment variables and command-line arguments.</li>
      <li><b>Logging</b> to the console and debug output.</li>
      <li><b>Dependency injection</b> container, exposed as <code>builder.Services</code>.</li>
      <li><b>Kestrel</b> as the web server.</li>
      <li>The <b>environment name</b>, from <code>ASPNETCORE_ENVIRONMENT</code>.</li>
    </ul>
    <p>Then <code>builder.Build()</code> creates the app, you add middleware and endpoints, and <code>app.Run()</code> starts listening and blocks until shutdown. On shutdown the host stops accepting requests, lets running ones finish, and stops hosted services.</p>
    <p>Before .NET 6 this was split across <code>Program.cs</code> and a <code>Startup</code> class with <code>ConfigureServices</code> and <code>Configure</code>. You will still meet that in older code.</p>
    <blockquote><b>Say it in the interview:</b> The host wires up configuration, logging, DI and Kestrel and manages the app's lifetime. In Program.cs I register services on the builder, build the app, add middleware in order, map endpoints and call Run.</blockquote>`,
  followUps: ['What was Startup.cs and why did it go away?', 'What is the generic host used for outside web apps?', 'What happens on graceful shutdown?']
});

interview.push({
  q: 'What is dependency injection, and why is it built into ASP.NET Core?', level: 'B',
  a: `<p>Dependency injection means a class does not create the things it needs; it asks for them in its constructor and something else hands them in.</p>` +
    CODE(`// Without DI: the class is welded to SQL Server and to a real email server
public class OrderService
{
    private readonly SqlOrderRepo _repo = new SqlOrderRepo("Server=...");
}

// With DI: the class only knows the interface
public class OrderService(IOrderRepo repo, IEmailSender email) { }

// One place decides what is real
builder.Services.AddScoped<IOrderRepo, SqlOrderRepo>();
builder.Services.AddScoped<IEmailSender, SmtpEmailSender>();`) +
    `<p>Why it matters:</p>
    <ul>
      <li><b>Testing:</b> a test passes in a fake repository, so no database is needed.</li>
      <li><b>Change:</b> swap an implementation in one line of registration.</li>
      <li><b>Lifetime:</b> the container creates and disposes objects at the right time (per request, per app).</li>
    </ul>
    <p>The built-in container is the "something else". The framework itself is built on it: controllers, middleware, logging and configuration all arrive by injection.</p>
    <blockquote><b>Say it in the interview:</b> With dependency injection a class declares what it needs through its constructor and the container supplies it. That gives loose coupling, easy testing with fakes, and one place that controls how long each object lives.</blockquote>`,
  followUps: ['What is the difference between dependency injection and dependency inversion?', 'What is the service locator anti-pattern?', 'When would you use a third-party container?']
});

interview.push({
  q: 'Walk me through the request pipeline and <code>Program.cs</code>.', level: 'B',
  a: `<p>A request enters through the web server, passes through a chain of middleware in the order you wrote them, reaches an endpoint, and the response travels back through the same chain in reverse.</p>` +
    CODE(`var builder = WebApplication.CreateBuilder(args);
builder.Services.AddControllers();          // 1) register services
builder.Services.AddAuthentication().AddJwtBearer();
builder.Services.AddAuthorization();

var app = builder.Build();
app.UseExceptionHandler();                  // 2) pipeline, in order
app.UseHttpsRedirection();
app.UseRouting();
app.UseCors();
app.UseAuthentication();                    // who are you?
app.UseAuthorization();                     // are you allowed?
app.MapControllers();                       // 3) endpoints
app.Run();`) +
    `<ol>
      <li><b>Kestrel</b> accepts the connection and creates an <code>HttpContext</code>.</li>
      <li>Each <b>middleware</b> runs, then calls the next one. Any of them can answer early.</li>
      <li><b>Routing</b> picks the endpoint; authentication and authorization check the caller.</li>
      <li>The <b>endpoint</b> (controller action or minimal API handler) runs with its dependencies injected.</li>
      <li>The response goes back out through the middleware in reverse order.</li>
    </ol>
    <blockquote><b>Say it in the interview:</b> Program.cs has two halves: register services, then build the middleware pipeline. Order matters. The exception handler goes first, routing before CORS and auth, authentication before authorization, and the endpoints last.</blockquote>`,
  followUps: ['What breaks if UseAuthorization comes before UseAuthentication?', 'What does "short-circuit" mean?', 'Where does UseCors go and why?']
});

interview.push({
  q: 'What is middleware? Write a custom one.', level: 'B',
  a: `<p>Middleware is a small component that sees every HTTP request, can do something before and after the rest of the pipeline, and decides whether to pass the request on.</p>` +
    CODE(`public class RequestTimingMiddleware(RequestDelegate next, ILogger<RequestTimingMiddleware> log)
{
    public async Task InvokeAsync(HttpContext ctx)
    {
        var watch = Stopwatch.StartNew();          // before
        await next(ctx);                           // the rest of the pipeline
        log.LogInformation("{Method} {Path} -> {Status} in {Ms} ms",   // after
            ctx.Request.Method, ctx.Request.Path, ctx.Response.StatusCode, watch.ElapsedMilliseconds);
    }
}

app.UseMiddleware<RequestTimingMiddleware>();`) +
    T(['Method', 'Meaning'], [
      ['<code>app.Use(...)</code>', 'does work and may call the next middleware'],
      ['<code>app.Run(...)</code>', 'terminal: never calls next'],
      ['<code>app.Map(...)</code> / <code>MapWhen</code>', 'branches the pipeline for a path or condition']
    ]) +
    `<p>One lifetime trap: a class-based middleware is created once, so it behaves like a singleton. Take scoped services (such as a <code>DbContext</code>) as parameters of <code>InvokeAsync</code>, not in the constructor.</p>
    <blockquote><b>Say it in the interview:</b> Middleware is a link in a chain: each piece gets the HttpContext and a delegate to the next piece. I use it for cross-cutting HTTP concerns like correlation IDs, timing and error handling, and it is the Chain of Responsibility pattern.</blockquote>`,
  followUps: ['Why must scoped services be injected into InvokeAsync and not the constructor?', 'What is the difference between Use and Run?', 'When would you write a filter instead?']
});

interview.push({
  q: 'What are environments in ASP.NET Core (Development, Staging, Production), and how does the app know which one it is in?', level: 'B',
  a: `<p>The environment is just a name, read from the <code>ASPNETCORE_ENVIRONMENT</code> variable, that lets the same build behave differently on a laptop and in production.</p>
    <ul>
      <li>If the variable is not set, the app assumes <b>Production</b>. That is the safe default.</li>
      <li>On a developer machine, <code>launchSettings.json</code> sets it to <b>Development</b>. That file is for local runs only and is not deployed.</li>
      <li>The name selects an extra settings file: <code>appsettings.Development.json</code> or <code>appsettings.Production.json</code> is loaded on top of <code>appsettings.json</code>.</li>
    </ul>` +
    T(['Only in Development', 'Why'], [
      ['developer exception page with stack traces', 'helpful locally, a data leak in production'],
      ['user secrets', 'keeps local passwords out of source control'],
      ['DI scope validation', 'catches lifetime bugs early'],
      ['OpenAPI or Swagger UI (by convention)', 'you may not want to publish the full API surface']
    ]) +
    CODE(`if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}`) +
    `<blockquote><b>Say it in the interview:</b> The environment name comes from ASPNETCORE_ENVIRONMENT and defaults to Production. I use it to layer settings files and to keep developer-only features, like detailed error pages, out of production. One build, promoted through environments, with only configuration changing.</blockquote>`,
  followUps: ['Why should you build once and promote the same artifact?', 'Where do production secrets come from?', 'What is launchSettings.json?']
});

interview.push({
  q: 'Explain configuration and the Options pattern.', level: 'I',
  a: `<p>Configuration is a set of key and value pairs merged from several sources, and the Options pattern binds a group of those keys to a typed class that you inject.</p>
    <p><b>Sources, in order; the later one wins:</b> <code>appsettings.json</code> → <code>appsettings.{Environment}.json</code> → user secrets (Development) → environment variables → command line. A vault such as Azure Key Vault or App Configuration can be added as another source.</p>` +
    CODE(`public class SmtpOptions
{
    [Required] public string Host { get; init; } = "";
    [Range(1, 65535)] public int Port { get; init; } = 587;
}

builder.Services.AddOptions<SmtpOptions>()
    .BindConfiguration("Smtp")
    .ValidateDataAnnotations()
    .ValidateOnStart();      // a bad setting stops the app at startup`) +
    T(['Interface', 'Lifetime', 'Sees changes?'], [
      ['<code>IOptions&lt;T&gt;</code>', 'singleton', 'no, read once'],
      ['<code>IOptionsSnapshot&lt;T&gt;</code>', 'scoped', 'yes, re-read per request'],
      ['<code>IOptionsMonitor&lt;T&gt;</code>', 'singleton', 'yes, always current, with change callbacks']
    ]) +
    `<p>Secrets never go in <code>appsettings.json</code>. Use a vault or, better, a managed identity so there is no secret at all.</p>
    <blockquote><b>Say it in the interview:</b> I bind each settings section to a typed options class, validate it at startup so a bad deployment fails fast, and inject IOptions. Environment variables override files, and secrets come from a vault or managed identity, never from source control.</blockquote>`,
  followUps: ['Which options interface would you inject into a singleton that needs live changes?', 'How is a nested key written as an environment variable?', 'Why validate on start?']
});

interview.push({
  q: 'Dependency injection lifetimes: transient, scoped, singleton. What is a captive dependency, and what are keyed services?', level: 'I',
  a: `<p>The lifetime says how long the container keeps one object: transient is new every time, scoped is one per HTTP request, singleton is one for the whole app.</p>` +
    T(['Lifetime', 'Typical use', 'Must be thread-safe?'], [
      ['Transient', 'light, stateless helpers', 'no'],
      ['Scoped', '<code>DbContext</code>, unit of work, current-user context', 'no (one request at a time)'],
      ['Singleton', 'caches, options, <code>HttpClient</code>-based clients', '<b>yes</b>']
    ]) +
    `<p>A <b>captive dependency</b> is a longer-lived service holding a shorter-lived one, for example a singleton that takes a scoped <code>DbContext</code> in its constructor. The context then lives forever and is shared by all requests, which causes stale data and "a second operation was started on this context" errors. In Development the container detects it and throws at startup. Fixes: make the consumer scoped, or inject <code>IServiceScopeFactory</code> and create a scope per unit of work.</p>
    <p><b>Keyed services</b> (.NET 8) register several implementations of one interface under a key:</p>` +
    CODE(`builder.Services.AddKeyedSingleton<INotifier, EmailNotifier>("email");
builder.Services.AddKeyedSingleton<INotifier, SmsNotifier>("sms");

public class Reminder([FromKeyedServices("sms")] INotifier notifier) { }`) +
    `<blockquote><b>Say it in the interview:</b> Transient per resolve, scoped per request, singleton per app. A service must never depend on something shorter-lived than itself. That is a captive dependency, and in a background service I solve it by creating a scope for each piece of work.</blockquote>`,
  followUps: ['Why is DbContext registered as scoped?', 'What happens to IDisposable transients resolved from the root container?', 'How did people pick between implementations before keyed services?']
});

interview.push({
  q: 'Controllers vs minimal APIs: which would you choose?', level: 'I',
  a: `<p>Both are fully supported ways to write HTTP endpoints; controllers group actions in classes with attributes, and minimal APIs map a route straight to a function.</p>` +
    CODE(`// Controller
[ApiController, Route("api/orders")]
public class OrdersController(IOrderService svc) : ControllerBase
{
    [HttpGet("{id:int}")]
    public async Task<ActionResult<OrderDto>> Get(int id, CancellationToken ct)
        => await svc.GetAsync(id, ct) is { } dto ? Ok(dto) : NotFound();
}

// Minimal API
app.MapGet("/api/orders/{id:int}", async (int id, IOrderService svc, CancellationToken ct) =>
        await svc.GetAsync(id, ct) is { } dto ? Results.Ok(dto) : Results.NotFound())
   .RequireAuthorization();`) +
    T(['', 'Controllers', 'Minimal APIs'], [
      ['Structure', 'conventions out of the box', 'you organise it (route groups, one file per feature)'],
      ['Cross-cutting', 'action, result and exception filters', 'endpoint filters'],
      ['Overhead', 'a little more per request', 'lowest; works with Native AOT'],
      ['Validation', 'automatic 400 with <code>[ApiController]</code>', 'built in from .NET 10 (<code>AddValidation</code>), endpoint filters before that']
    ]) +
    `<p>My rule: follow what the code base already does. For a new small service or function-style API, minimal APIs grouped by feature. For a large API with many shared conventions and a team used to MVC, controllers.</p>
    <blockquote><b>Say it in the interview:</b> Both are production-grade. Minimal APIs are leaner and AOT-friendly; controllers give more built-in structure and filters. I choose by team convention and API size, and I do not mix styles inside one service without a reason.</blockquote>`,
  followUps: ['How do you keep a minimal API project organised at 80 endpoints?', 'What does the [ApiController] attribute add?', 'What are TypedResults?']
});

interview.push({
  q: 'Filters vs middleware, and how do model binding and validation work?', level: 'I',
  a: `<p>Middleware runs for every request and knows only HTTP; filters run inside MVC around one action and know which action, which arguments and whether the model is valid.</p>` +
    T(['', 'Middleware', 'Filters'], [
      ['Scope', 'whole app, every request', 'chosen controllers or actions'],
      ['Knows', '<code>HttpContext</code>', 'action, arguments, <code>ModelState</code>, result'],
      ['Use for', 'errors, CORS, auth, compression, logging', 'validation, wrapping results, action-level auditing']
    ]) +
    `<p>Filter order: authorization → resource → action → exception → result. Minimal APIs use <b>endpoint filters</b> for the same job.</p>
    <p><b>Model binding</b> fills action parameters from the request: <code>[FromRoute]</code>, <code>[FromQuery]</code>, <code>[FromHeader]</code>, <code>[FromBody]</code> (JSON, one per action), <code>[FromForm]</code>. With <code>[ApiController]</code> the source is inferred: complex types come from the body, simple types from the route or query.</p>
    <p><b>Validation</b> then checks the bound object using data annotations or a library such as FluentValidation. With <code>[ApiController]</code>, an invalid model returns <b>400</b> with a validation problem body before your action runs.</p>` +
    CODE(`public record CreateOrder(
    [property: Required, StringLength(100, MinimumLength = 2)] string Customer,
    [property: Range(1, 1000)] int Quantity);`) +
    `<blockquote><b>Say it in the interview:</b> Middleware for cross-cutting HTTP concerns, filters when I need action context. Binding maps route, query, header and body to parameters, and with ApiController an invalid model returns a 400 problem response automatically.</blockquote>`,
  followUps: ['In which order do the filter types run?', 'Can you read the request body in two places?', 'Where do business rules get validated?']
});

interview.push({
  q: 'How do you handle exceptions globally, and what is Problem Details?', level: 'I',
  a: `<p>I catch unhandled exceptions in one place at the top of the pipeline, log the full error on the server, and return a standard JSON error shape called Problem Details to the client.</p>` +
    CODE(`builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();

public class GlobalExceptionHandler(ILogger<GlobalExceptionHandler> log, IProblemDetailsService problems)
    : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext ctx, Exception ex, CancellationToken ct)
    {
        log.LogError(ex, "Unhandled error {TraceId}", ctx.TraceIdentifier);
        var (status, title) = ex switch
        {
            NotFoundException => (404, "Not found"),
            ConflictException => (409, "Conflict"),
            _                 => (500, "An unexpected error occurred")
        };
        ctx.Response.StatusCode = status;
        return await problems.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = ctx,
            ProblemDetails = { Status = status, Title = title }
        });
    }
}

app.UseExceptionHandler();   // first in the pipeline`) +
    `<p><b>Problem Details</b> (RFC 9457, which replaced RFC 7807) is a small JSON object with <code>type</code>, <code>title</code>, <code>status</code>, <code>detail</code> and <code>instance</code>, sent as <code>application/problem+json</code>. Add a trace ID so support can find the log line. Never return stack traces or SQL text; the developer exception page is for Development only.</p>
    <blockquote><b>Say it in the interview:</b> One IExceptionHandler maps known exception types to status codes, logs the real exception with a trace ID, and returns RFC 9457 Problem Details. Clients get a stable error shape, and nothing internal leaks.</blockquote>`,
  followUps: ['Should expected outcomes like "not found" be exceptions at all?', 'How do validation errors fit into Problem Details?', 'How does a client correlate an error with your logs?']
});

interview.push({
  q: 'How does logging work in ASP.NET Core?', level: 'I',
  a: `<p>You inject <code>ILogger&lt;T&gt;</code>, write messages with a level, and the host sends them to whichever providers are configured, such as the console or a cloud log service.</p>
    <ul>
      <li><b>Levels</b>, low to high: Trace, Debug, Information, Warning, Error, Critical. Configuration sets the minimum per category, so you can turn on Debug for one namespace without redeploying.</li>
      <li><b>Category</b>: the <code>T</code> in <code>ILogger&lt;T&gt;</code>, normally the class name.</li>
      <li><b>Providers</b>: console, debug, OpenTelemetry, Application Insights, or a library such as Serilog.</li>
    </ul>` +
    CODE(`// Structured: OrderId and Total become searchable fields
log.LogInformation("Order {OrderId} placed, total {Total}", order.Id, order.Total);

// Not this: one opaque string, and the string is built even if the level is off
log.LogInformation($"Order {order.Id} placed, total {order.Total}");`) +
    `<p><b>Structured logging</b> is the key idea: the template and the values are kept separate, so you can query "all log lines where OrderId = 42". <b>Scopes</b> (<code>BeginScope</code>) attach values such as a correlation ID to every line inside a block.</p>
    <p>Rules I enforce: no passwords, tokens or personal data in logs; errors logged once, at the boundary, with the exception object; Information level in production, not Debug.</p>
    <blockquote><b>Say it in the interview:</b> I inject ILogger of T and use message templates with named placeholders, so logs are structured and searchable. Levels are set per category in configuration, a correlation or trace ID is on every line, and secrets and personal data never go in.</blockquote>`,
  followUps: ['Why is string interpolation in a log call a problem?', 'What is a log scope?', 'How do you change the log level in production without a redeploy?']
});

interview.push({
  q: 'What is CORS, and how do you configure it in ASP.NET Core?', level: 'I',
  a: `<p>CORS (Cross-Origin Resource Sharing) is a browser rule: a page loaded from one origin may only call an API on another origin if that API says so in its response headers.</p>
    <p>An <b>origin</b> is scheme + host + port. <code>https://shop.example.com</code> calling <code>https://api.example.com</code> is cross-origin. For anything beyond a simple GET, the browser first sends a <b>preflight</b> <code>OPTIONS</code> request asking "may I?", and only sends the real request if the answer allows it.</p>` +
    CODE(`builder.Services.AddCors(o => o.AddPolicy("Frontend", p => p
    .WithOrigins("https://shop.example.com")
    .WithMethods("GET", "POST", "PUT", "DELETE")
    .WithHeaders("Authorization", "Content-Type")));

app.UseRouting();
app.UseCors("Frontend");        // after routing, before authentication
app.UseAuthentication();
app.UseAuthorization();`) +
    `<p>Things interviewers check:</p>
    <ul>
      <li>CORS is enforced by the <b>browser</b>. Postman and server-to-server calls ignore it, so it is <b>not</b> a security control for your API.</li>
      <li><code>AllowAnyOrigin()</code> cannot be combined with <code>AllowCredentials()</code>.</li>
      <li>CORS must come before authentication, because the preflight request carries no token and must not get a 401.</li>
    </ul>
    <blockquote><b>Say it in the interview:</b> CORS is the browser asking the API whether a page from another origin may call it. I list the exact front-end origins in a named policy and place UseCors after routing and before authentication. It protects users' browsers; it does not replace authentication.</blockquote>`,
  followUps: ['Why does the call work in Postman but fail in the browser?', 'What is a preflight request and when is it sent?', 'Why is AllowAnyOrigin with credentials refused?']
});

interview.push({
  q: 'Why use <code>IHttpClientFactory</code> instead of <code>new HttpClient()</code>, and how do you add resilience?', level: 'A',
  a: `<p>Creating an <code>HttpClient</code> per call leaks network sockets, and keeping one forever misses DNS changes; the factory gives you cheap clients on top of pooled, recycled connections.</p>` +
    T(['Approach', 'Problem'], [
      ['<code>new HttpClient()</code> in every call', 'each one opens new connections; closed sockets linger; under load you run out of ports'],
      ['one static <code>HttpClient</code> for ever', 'connections never refresh, so a DNS change (a failover) is not seen'],
      ['<code>IHttpClientFactory</code>', 'pools message handlers and recycles them (every 2 minutes by default)']
    ]) +
    CODE(`builder.Services.AddHttpClient<IPaymentClient, PaymentClient>(c =>
{
    c.BaseAddress = new Uri(builder.Configuration["Payments:BaseUrl"]!);
    c.Timeout = TimeSpan.FromSeconds(10);
})
.AddStandardResilienceHandler();   // Microsoft.Extensions.Http.Resilience`) +
    `<p>The standard resilience handler adds, in order: a total timeout, retry with exponential backoff and jitter, a circuit breaker, and a per-attempt timeout. Rules that go with it:</p>
    <ul>
      <li>Retry only requests that are safe to repeat (GET, or writes protected by an idempotency key).</li>
      <li>Always pass the <code>CancellationToken</code> through.</li>
      <li>Do not inject a typed client into a singleton; it would hold one handler forever.</li>
    </ul>
    <blockquote><b>Say it in the interview:</b> I register typed clients through IHttpClientFactory so handlers are pooled and rotated, which avoids both socket exhaustion and stale DNS. I add the standard resilience handler for timeouts, retries with jitter and a circuit breaker, and I only retry idempotent calls.</blockquote>`,
  followUps: ['What is socket exhaustion?', 'What does a circuit breaker do that a retry does not?', 'Why add jitter to retries?']
});

interview.push({
  q: 'How do you run background work: <code>IHostedService</code>, <code>BackgroundService</code>, job libraries, queues?', level: 'A',
  a: `<p>Short work that may be lost on a restart can run inside the app as a hosted service; work that must not be lost goes onto a durable queue and is processed by a separate worker.</p>` +
    T(['Need', 'Tool'], [
      ['a simple loop or timer inside the app', '<code>BackgroundService</code> (a base class over <code>IHostedService</code>)'],
      ['reliable work that survives restarts and scales out', 'a message queue (Azure Service Bus, storage queue, RabbitMQ) with a worker service or a queue-triggered function'],
      ['scheduled jobs', 'a timer-triggered function, a Kubernetes CronJob, or Hangfire or Quartz.NET inside the app'],
      ['a slow request, such as a report or an AI call', 'accept, return 202 with a job ID, let the client poll or get a notification']
    ]) +
    `<p>What goes wrong with in-process work:</p>
    <ul>
      <li>A deployment or scale-in kills it mid-job, so jobs must be <b>idempotent</b> and resumable.</li>
      <li>With three instances the timer fires three times unless you add a lock or use a queue.</li>
      <li>A hosted service is a singleton: create a DI scope for each unit of work to use a <code>DbContext</code>.</li>
      <li>Honour the cancellation token so shutdown is graceful.</li>
    </ul>
    <blockquote><b>Say it in the interview:</b> For anything that must not be lost I put a message on a durable queue and process it in a worker, with retries and a dead-letter queue. BackgroundService is for light in-process loops. For long requests I return 202 with a job ID and let the client poll.</blockquote>`,
  followUps: ['Your timer job runs on three instances. How do you make it run once?', 'What is a dead-letter queue?', 'What happens to a BackgroundService during a deployment?']
});

interview.push({
  q: 'Explain the Azure Functions .NET isolated worker model.', level: 'A',
  a: `<p>In the isolated worker model your function code runs in its own .NET process, separate from the Functions host, so you control the .NET version, the dependencies and the startup code.</p>` +
    CODE(`// Program.cs
var builder = FunctionsApplication.CreateBuilder(args);
builder.ConfigureFunctionsWebApplication();          // ASP.NET Core integration
builder.Services.AddScoped<IBookingService, BookingService>();
builder.Build().Run();

public class BookingFunctions(IBookingService svc)
{
    [Function("GetBooking")]
    public async Task<IActionResult> Get(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "bookings/{id:int}")] HttpRequest req,
        int id, CancellationToken ct)
    {
        var booking = await svc.GetAsync(id, ct);
        return booking is null ? new NotFoundResult() : new OkObjectResult(booking);
    }
}`) +
    `<ul>
      <li><b>Why isolated:</b> the older in-process model tied you to the host's .NET version and assemblies, and its support ended on 10 November 2026.</li>
      <li><b><code>AuthorizationLevel.Anonymous</code></b> means no function key is required, so you must authenticate callers yourself, with App Service authentication, or at an API gateway.</li>
      <li><b>Cold start:</b> the Flex Consumption plan with always-ready instances, or the Premium plan, keeps instances warm.</li>
    </ul>
    <blockquote><b>Say it in the interview:</b> Isolated worker runs my code in a separate process from the Functions host, so I pick the .NET version and get standard DI and middleware. It is the only supported model for .NET now. I treat anonymous HTTP triggers as unprotected until I add real authentication.</blockquote>`,
  followUps: ['How do you reduce cold start time?', 'Function keys vs real authentication: what is the difference?', 'What changes when you migrate from in-process to isolated?']
});

interview.push({
  q: 'How do you test an ASP.NET Core API end to end without deploying it?', level: 'A',
  a: `<p>I use <code>WebApplicationFactory</code>, which starts the whole app in memory inside the test, with the real pipeline, and gives me an <code>HttpClient</code> to call it.</p>` +
    CODE(`public class OrdersApiTests(WebApplicationFactory<Program> factory)
    : IClassFixture<WebApplicationFactory<Program>>
{
    [Fact]
    public async Task Get_unknown_order_returns_404_problem()
    {
        var client = factory.WithWebHostBuilder(b => b.ConfigureTestServices(s =>
        {
            s.AddSingleton<IPaymentClient, FakePaymentClient>();   // replace the outside world
        })).CreateClient();

        var response = await client.GetAsync("/api/orders/999999");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
    }
}`) +
    `<p>What this catches that unit tests miss: middleware order, routing, model binding, validation, authorization rules, JSON settings and DI registration mistakes.</p>
    <ul>
      <li><b>Database:</b> a real engine in a container (Testcontainers) is more honest than the EF Core in-memory provider, which does not enforce constraints or run real SQL.</li>
      <li><b>Auth:</b> register a test authentication handler that produces a known user.</li>
      <li><b>Outside services:</b> replace typed HTTP clients with fakes or a stub server.</li>
    </ul>
    <blockquote><b>Say it in the interview:</b> WebApplicationFactory hosts the real pipeline in memory, so a test exercises routing, auth, validation and serialization through an HttpClient. I swap external dependencies in ConfigureTestServices and run the database in a container.</blockquote>`,
  followUps: ['Why avoid the EF Core in-memory provider for these tests?', 'How do you fake an authenticated user?', 'How do you keep integration tests fast and isolated from each other?']
});

// ====================== INTERVIEW: 3. Design patterns ======================
interview.push({
  q: 'How should you answer "Which design patterns have you used?"', level: 'B',
  a: `<p>Pick four to six patterns you really used and tell each one as a tiny story: the pain, the pattern, the trade-off.</p>
    <p>A list of names ("singleton, factory, repository") proves nothing. A story proves you understood why.</p>` +
    T(['Beat', 'What to say', 'Example'], [
      ['Pain', 'the concrete problem', '"Every new payment method meant editing one 300-line switch."'],
      ['Pattern', 'what you did, in one line', '"Each method became a class behind <code>IPaymentMethod</code>, picked by a small factory. Strategy."'],
      ['Result', 'what became cheap', '"A new method is one class and one registration line."'],
      ['Trade-off', 'what it cost, when you would not do it', '"More files. I would not do it for two fixed cases."']
    ]) +
    `<p>A safe set for a .NET lead: <b>Strategy</b>, <b>Decorator</b> (caching or logging), <b>Adapter</b> (wrapping a vendor SDK), <b>Chain of Responsibility</b> (middleware), <b>Options and DI</b> as creational patterns, plus one distributed pattern such as <b>Outbox</b> or <b>Circuit Breaker</b>.</p>
    <p>Speak generically about confidential work: "an order system", not the product name.</p>
    <blockquote><b>Say it in the interview:</b> I will give you three I used recently, each with the problem it solved and what it cost us. I reach for a pattern when I can name the change it makes cheap, not because the pattern exists.</blockquote>`,
  followUps: ['Tell me about a pattern you removed because it was overkill.', 'Which pattern do you see misused most often?', 'How do you teach patterns to juniors?']
});

interview.push({
  q: 'Explain the creational patterns: Singleton, Factory, Builder, Prototype.', level: 'I',
  a: `<p>Creational patterns are about who creates an object and how, so that the code using it does not have to know.</p>` +
    T(['Pattern', 'Idea', 'In .NET'], [
      ['<b>Singleton</b>', 'exactly one instance', '<code>AddSingleton</code> in DI; avoid hand-made static instances'],
      ['<b>Factory</b>', 'one place decides which class to create', '<code>IHttpClientFactory</code>, <code>IDbContextFactory</code>, <code>ILoggerFactory</code>'],
      ['<b>Builder</b>', 'build a complex object step by step', '<code>WebApplication.CreateBuilder</code>, <code>StringBuilder</code>'],
      ['<b>Prototype</b>', 'make a new object by copying one', 'records: <code>order with { Status = "Paid" }</code>']
    ]) +
    CODE(`public interface IExporter { byte[] Export(Report r); }
public interface IExporterFactory { IExporter Create(string format); }

public class ExporterFactory(IServiceProvider sp) : IExporterFactory
{
    public IExporter Create(string format) => format switch
    {
        "pdf" => sp.GetRequiredService<PdfExporter>(),
        "csv" => sp.GetRequiredService<CsvExporter>(),
        _     => throw new ArgumentException("Unknown format " + format)
    };
}`) +
    `<p>With .NET 8 keyed services the factory above can become <code>sp.GetRequiredKeyedService&lt;IExporter&gt;(format)</code>, so adding a format needs no edit to the factory. Why prefer a DI singleton over a static one: it can be replaced in tests and its dependencies are visible. Either way it must be thread-safe.</p>
    <blockquote><b>Say it in the interview:</b> I let the DI container handle singletons, I use a factory when the concrete type is chosen at run time, a builder when construction has many optional steps, and records with the with expression where I need copies.</blockquote>`,
  followUps: ['Why is a static singleton hard to test?', 'How do you make a lazy singleton thread-safe?', 'Factory method vs abstract factory?']
});

interview.push({
  q: 'Explain the structural patterns: Adapter, Decorator, Facade, Proxy.', level: 'I',
  a: `<p>Structural patterns are about wrapping and combining objects so that pieces with different shapes fit together.</p>` +
    T(['Pattern', 'What the wrapper does', 'Example'], [
      ['<b>Adapter</b>', 'changes the interface, same behaviour', 'your <code>IEmailSender</code> over a vendor SDK'],
      ['<b>Decorator</b>', 'same interface, adds behaviour', 'a caching or logging repository; <code>GZipStream</code> around a <code>FileStream</code>'],
      ['<b>Facade</b>', 'one simple entry point over several subsystems', 'a <code>CheckoutService</code> that calls stock, payment and shipping'],
      ['<b>Proxy</b>', 'same interface, controls access', 'EF Core lazy-loading proxies; a generated gRPC client'],
      ['<b>Composite</b>', 'treat one item and a tree of items alike', 'a menu with sub-menus; a UI component tree']
    ]) +
    CODE(`public class CachedProductRepo(IProductRepo inner, IMemoryCache cache) : IProductRepo
{
    public Task<Product?> GetAsync(int id, CancellationToken ct) =>
        cache.GetOrCreateAsync("product:" + id, entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5);
            return inner.GetAsync(id, ct);
        });
}`) +
    `<p>Adapter and Decorator look alike in code. The difference is intent: an adapter makes something fit, a decorator adds something. Both rely on dependency inversion, because callers depend on your interface and never on the wrapped class.</p>
    <blockquote><b>Say it in the interview:</b> I wrap every external system in an adapter behind my own interface, so a vendor can be swapped by configuration. I use decorators to add caching, logging or retries without touching the class they wrap.</blockquote>`,
  followUps: ['What is the difference between a decorator and a proxy?', 'How do you register a decorator in the built-in DI container?', 'When does a facade become a god class?']
});

interview.push({
  q: 'Explain the behavioural patterns: Strategy, Observer, Command, State, Mediator and the rest.', level: 'I',
  a: `<p>Behavioural patterns are about how objects share work and talk to each other.</p>` +
    T(['Pattern', 'Idea', 'In .NET'], [
      ['<b>Strategy</b>', 'swap an algorithm behind one interface', '<code>IComparer&lt;T&gt;</code>; pricing or shipping rules'],
      ['<b>Observer</b>', 'tell subscribers when something happens', 'C# events, <code>IObservable&lt;T&gt;</code>, domain events'],
      ['<b>Command</b>', 'a request as an object', 'CQRS commands, undo stacks, queue messages'],
      ['<b>Chain of Responsibility</b>', 'pass a request along handlers', 'middleware, <code>DelegatingHandler</code>'],
      ['<b>State</b>', 'behaviour depends on the current state', 'order: draft → confirmed → shipped'],
      ['<b>Mediator</b>', 'objects talk through a middleman', 'request and handler libraries'],
      ['<b>Template Method</b>', 'base class fixes the steps, subclasses fill them in', '<code>BackgroundService.ExecuteAsync</code>'],
      ['<b>Iterator</b>', 'walk a collection without knowing its inside', '<code>IEnumerable&lt;T&gt;</code> and <code>yield return</code>']
    ]) +
    CODE(`public interface IDiscount { decimal Apply(decimal price); }
public class NoDiscount : IDiscount { public decimal Apply(decimal p) => p; }
public class MemberDiscount : IDiscount { public decimal Apply(decimal p) => p * 0.9m; }`) +
    `<p>A State example worth having ready: a record proposed by an automated process stays a <b>draft</b> until a person confirms it, and the class refuses any other move. That is a design pattern doing the job of a safety rule.</p>
    <blockquote><b>Say it in the interview:</b> Strategy replaces growing if and switch chains. Observer and domain events decouple "something happened" from "who reacts". State keeps the legal transitions in one place. And the middleware pipeline is Chain of Responsibility that every .NET developer already uses.</blockquote>`,
  followUps: ['Strategy vs State: what is the difference?', 'What memory leak can events cause?', 'What is the downside of a mediator?']
});

interview.push({
  q: 'Write a decorator that adds logging and timing around any repository.', level: 'I',
  a: `<p>A decorator is a class that implements the same interface as the thing it wraps, does its extra work, and passes the call on.</p>` +
    CODE(`public interface IOrderRepo
{
    Task<Order?> GetAsync(int id, CancellationToken ct);
}

public class LoggingOrderRepo(IOrderRepo inner, ILogger<LoggingOrderRepo> log) : IOrderRepo
{
    public async Task<Order?> GetAsync(int id, CancellationToken ct)
    {
        var watch = Stopwatch.StartNew();
        try
        {
            return await inner.GetAsync(id, ct);
        }
        catch (Exception ex)
        {
            log.LogError(ex, "GetAsync({Id}) failed", id);
            throw;                                  // rethrow, keep the stack trace
        }
        finally
        {
            log.LogInformation("GetAsync({Id}) took {Ms} ms", id, watch.ElapsedMilliseconds);
        }
    }
}

// Registration with the built-in container
builder.Services.AddScoped<SqlOrderRepo>();
builder.Services.AddScoped<IOrderRepo>(sp => new LoggingOrderRepo(
    sp.GetRequiredService<SqlOrderRepo>(),
    sp.GetRequiredService<ILogger<LoggingOrderRepo>>()));`) +
    `<p>Points to say while you write it: the caller and the SQL class do not change; decorators stack (logging around caching around SQL), and the order of stacking changes the meaning; use <code>throw;</code> and not <code>throw ex;</code>. The built-in container has no <code>Decorate</code> method, so you register with a factory lambda as above or use the Scrutor library.</p>
    <blockquote><b>Say it in the interview:</b> The decorator implements the same interface, wraps the inner repository, measures and logs around the call, and rethrows. I register it so that consumers asking for the interface get the decorator, which holds the real one inside.</blockquote>`,
  followUps: ['If you stack caching and logging, which goes outside?', 'Why throw; and not throw ex;?', 'How would you do this for 30 interfaces without 30 classes?']
});

interview.push({
  q: 'How does ASP.NET Core middleware implement Chain of Responsibility, and where do order mistakes cause bugs?', level: 'I',
  a: `<p>Each middleware holds a reference to the next one and chooses to handle the request, pass it on, or both, which is exactly the Chain of Responsibility pattern.</p>
    <p>At startup the framework builds the chain backwards: the last middleware is wrapped by the one before it, and so on, into one <code>RequestDelegate</code>. A request then runs like nested function calls: in through each layer, out in reverse.</p>` +
    T(['Order mistake', 'Symptom'], [
      ['<code>UseAuthorization</code> before <code>UseAuthentication</code>', 'every protected endpoint returns 401; the user is still anonymous when rules are checked'],
      ['<code>UseCors</code> after <code>UseAuthorization</code>', 'the browser preflight (no token) gets 401, and the page reports a CORS error'],
      ['exception handler not first', 'errors thrown by earlier middleware escape as a bare 500'],
      ['<code>UseStaticFiles</code> after authorization', 'public files suddenly need a login (or, the other way round, private files are served to anyone)'],
      ['<code>UseResponseCompression</code> after the code that writes the body', 'responses are not compressed'],
      ['<code>UseRateLimiter</code> before <code>UseRouting</code> with per-endpoint policies', 'endpoint-specific limits are not applied']
    ]) +
    `<p>Recommended order: exception handler → HSTS and HTTPS redirection → static files → routing → CORS → authentication → authorization → rate limiter → output cache → endpoints.</p>
    <blockquote><b>Say it in the interview:</b> Middleware is a chain where each link calls the next, so order is behaviour. The classic bug is authorization placed before authentication, which turns every protected call into a 401. I protect the order with an integration test.</blockquote>`,
  followUps: ['How would you test that the pipeline order is right?', 'What does short-circuiting look like in code?', 'Where does a custom correlation ID middleware belong?']
});

interview.push({
  q: 'Which anti-patterns do you name and avoid?', level: 'I',
  a: `<p>An anti-pattern is a common solution that looks reasonable and reliably causes pain later.</p>` +
    T(['Anti-pattern', 'What it looks like', 'What to do'], [
      ['God class', 'one <code>OrderManager</code> with 4,000 lines that everything touches', 'split by responsibility'],
      ['Service locator', 'code calls <code>serviceProvider.GetService</code> everywhere', 'constructor injection, so dependencies are visible'],
      ['Leaky abstraction', 'EF entities returned straight from the API', 'map to DTOs'],
      ['N+1 queries', 'one query for the list, then one per row', 'projection or <code>Include</code>'],
      ['Chatty API', 'a screen needs 15 calls', 'coarser endpoints, or a backend-for-frontend'],
      ['Distributed monolith', '"microservices" that must be deployed together', 'fix the boundaries or merge them'],
      ['Shared database', 'two services write the same tables', 'one owner per table; others go through its API or events'],
      ['Sync over async', '<code>.Result</code> or <code>.Wait()</code> on a task', 'async all the way'],
      ['Premature optimisation', 'complex code with no measurement behind it', 'measure, then optimise the hot spot']
    ]) +
    `<p>One nuance worth saying: an <b>anemic domain model</b> (entities that are only data, with all logic in services) is often listed as an anti-pattern, but for simple create, read, update, delete screens it is a fine choice. It hurts when the business rules are rich.</p>
    <blockquote><b>Say it in the interview:</b> The ones I have actually removed are N+1 queries, entities leaking through the API, and a distributed monolith where three services always shipped together. In each case I can tell you how we found it and what we measured afterwards.</blockquote>`,
  followUps: ['How do you detect N+1 queries in a running system?', 'Is the service locator ever acceptable?', 'How do you tell a distributed monolith from real microservices?']
});

interview.push({
  q: 'When would you not use the repository pattern with EF Core?', level: 'A',
  a: `<p>I skip it when it would only repeat what EF Core already gives me, because <code>DbSet&lt;T&gt;</code> is already a repository and <code>DbContext</code> is already a unit of work.</p>
    <p>What a generic <code>IRepository&lt;T&gt;</code> on top usually costs:</p>
    <ul>
      <li>It hides the useful parts: projection with <code>Select</code>, <code>Include</code>, <code>AsNoTracking</code>, split queries, <code>ExecuteUpdate</code>.</li>
      <li>To get them back, people return <code>IQueryable</code>, and then the abstraction leaks anyway.</li>
      <li><code>GetAll()</code> invites loading whole tables and filtering in memory.</li>
      <li>"We can swap the ORM later" almost never happens, and would not be that simple if it did.</li>
    </ul>` +
    T(['Use the DbContext directly when', 'Add a repository when'], [
      ['queries are simple and close to the use case', 'the same complex domain query is needed in several places (<code>GetOverdueInvoicesAsync</code>)'],
      ['you want read models projected straight to DTOs', 'you follow domain-driven design and load whole aggregates'],
      ['integration tests against a real database cover it', 'there really are two stores (SQL plus a document store or an API)'],
      ['', 'you want a narrow seam so domain logic can be unit-tested with a fake']
    ]) +
    `<p>A middle road I like: query handlers use the <code>DbContext</code> directly for reads, and small, specific repositories exist only for the write side.</p>
    <blockquote><b>Say it in the interview:</b> EF Core is already a repository and unit of work, so I do not wrap it one-to-one. I add a repository when it names real domain queries or protects an aggregate, not as a generic layer that hides Include and projection.</blockquote>`,
  followUps: ['How do you unit-test code that uses DbContext directly?', 'What is the specification pattern?', 'What is wrong with returning IQueryable from a repository?']
});

interview.push({
  q: 'Which enterprise and cloud patterns must a tech lead know?', level: 'A',
  a: `<p>These are the patterns for systems made of several services, where networks fail and one database transaction cannot cover everything.</p>` +
    T(['Pattern', 'Problem it solves', 'Note'], [
      ['CQRS', 'reads and writes need different models', 'can share one database; not the same as event sourcing'],
      ['Outbox', 'save data and publish an event reliably', 'the event row is written in the same transaction; a relay publishes it'],
      ['Saga', 'a business transaction across services', 'each step has a compensating action; orchestrated or choreographed'],
      ['Circuit breaker', 'stop hammering a failing dependency', 'opens after failures, tests again later'],
      ['Retry, backoff, jitter', 'short, temporary faults', 'only for idempotent operations'],
      ['Bulkhead', 'one slow dependency must not use up all threads or connections', 'separate pools or limits'],
      ['Cache-aside', 'cut read load', 'plan invalidation and protect against a stampede'],
      ['Idempotency key', 'a retried write must not happen twice', 'store the result per key']
    ]) +
    `<p>How they combine in a checkout: the order service saves the order and an outbox row in one transaction; a relay publishes <code>OrderPlaced</code>; payment and stock react; if payment fails, a saga step cancels the order; every consumer is idempotent because messages can arrive twice.</p>
    <blockquote><b>Say it in the interview:</b> Across services I assume at-least-once delivery and partial failure. So I use an outbox to publish reliably, idempotent consumers, sagas with compensation in place of distributed transactions, and timeouts, retries and circuit breakers on every outgoing call.</blockquote>`,
  followUps: ['Why not use a distributed transaction (two-phase commit)?', 'Orchestration vs choreography in a saga?', 'What is a cache stampede and how do you prevent it?']
});

// ====================== INTERVIEW: 4. Runtime internals and advanced ASP.NET Core ======================
interview.push({
  q: 'What is Kestrel, how do you host an ASP.NET Core app, and what is the request lifecycle?', level: 'I',
  a: `<p>Kestrel is the fast, cross-platform web server built into ASP.NET Core; it accepts the network connection and feeds requests into your middleware pipeline.</p>
    <p><b>Lifecycle:</b> connection → TLS handshake → HTTP parsing (HTTP/1.1, HTTP/2 or HTTP/3) → middleware → routing → filters → your handler → response back out.</p>` +
    T(['Hosting choice', 'Notes'], [
      ['Kestrel directly (containers, Azure Container Apps, Kubernetes)', 'common today; the platform ingress handles TLS and routing'],
      ['Kestrel behind a reverse proxy (nginx, YARP, Azure Front Door, Application Gateway)', 'the proxy adds TLS termination, caching, a web application firewall'],
      ['IIS in-process on Windows (Azure App Service on Windows)', 'the app runs inside the IIS worker process']
    ]) +
    `<p>Settings a lead should know:</p>
    <ul>
      <li><b>Forwarded headers:</b> behind a proxy the app sees the proxy's IP and <code>http</code>. Enable <code>UseForwardedHeaders</code> (and trust only your proxy) so scheme, host and client IP are right; otherwise redirects and generated links break.</li>
      <li><b>Limits:</b> maximum request body size, header size, and request timeouts.</li>
      <li><b>Graceful shutdown:</b> on SIGTERM the host stops taking new requests and waits up to <code>HostOptions.ShutdownTimeout</code> (30 seconds by default) for running ones.</li>
    </ul>
    <blockquote><b>Say it in the interview:</b> Kestrel is the in-process web server and is fine to face the network, though I usually have a proxy or ingress in front for TLS and protection. When there is a proxy I configure forwarded headers, and I make sure shutdown is graceful so deployments do not drop requests.</blockquote>`,
  followUps: ['What goes wrong if forwarded headers are not configured?', 'In-process vs out-of-process hosting on IIS?', 'How do you deploy without dropping in-flight requests?']
});

interview.push({
  q: 'Explain routing, endpoint metadata and model binding in more detail.', level: 'I',
  a: `<p>Routing matches the URL and HTTP method to one endpoint, and binding then fills that endpoint's parameters from the route, query string, headers, body or DI container.</p>` +
    CODE(`var api = app.MapGroup("/api/customers")
             .RequireAuthorization()
             .WithTags("Customers");

api.MapGet("/{id:guid}", async (Guid id, ICustomerService svc, CancellationToken ct) =>
    await svc.GetAsync(id, ct) is { } c ? Results.Ok(c) : Results.NotFound());
`) +
    `<ul>
      <li><b>Route constraints</b> such as <code>:int</code>, <code>:guid</code>, <code>:minlength(3)</code> decide whether a route matches. They are for picking a route, not for validating input.</li>
      <li><b>Precedence:</b> more specific templates win; literal segments beat parameters.</li>
      <li><b>Endpoint metadata</b> is data attached to an endpoint: authorization rules, CORS policy, rate limit policy, OpenAPI information. Middleware that runs after <code>UseRouting</code> reads it. That is why auth middleware must come after routing.</li>
      <li><b>Binding sources:</b> route, query, header, body (one JSON body per endpoint), form, services. <code>[AsParameters]</code> groups many parameters into one object. A type can bind itself with <code>TryParse</code> or <code>BindAsync</code>.</li>
      <li><b>OpenAPI:</b> from .NET 9 the document comes from the built-in <code>Microsoft.AspNetCore.OpenApi</code> package (<code>AddOpenApi</code>, <code>MapOpenApi</code>).</li>
    </ul>
    <blockquote><b>Say it in the interview:</b> Routing picks the endpoint and exposes its metadata; later middleware like authorization acts on that metadata. Binding pulls parameters from route, query, header, body and services. I use route groups to apply auth, tags and filters to a whole feature at once.</blockquote>`,
  followUps: ['Why is a route constraint not validation?', 'What happens when two routes match the same URL?', 'How do you bind a custom type from a query string?']
});

interview.push({
  q: 'Validation: data annotations, FluentValidation and problem details. Where do you validate?', level: 'I',
  a: `<p>I validate the shape of the input at the edge of the API and the business rules inside the domain, and I return validation errors in one standard format.</p>` +
    T(['Option', 'Good for', 'Limits'], [
      ['Data annotations (<code>[Required]</code>, <code>[Range]</code>)', 'simple rules next to the property', 'cross-field and async rules are awkward'],
      ['FluentValidation', 'rules in a separate class, conditional and cross-field rules, easy to test', 'an extra library; you call it yourself (its automatic MVC hook is deprecated)'],
      ['Built-in minimal API validation (.NET 10)', 'annotations checked automatically after <code>AddValidation()</code>', 'annotation-style rules only'],
      ['Domain checks', 'invariants: "an order cannot ship before it is paid"', 'belongs in the domain, not the controller']
    ]) +
    CODE(`public sealed class CreateCustomerValidator : AbstractValidator<CreateCustomer>
{
    public CreateCustomerValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Email).EmailAddress().When(x => x.Email is not null);
    }
}

var result = await validator.ValidateAsync(body, ct);
if (!result.IsValid) return Results.ValidationProblem(result.ToDictionary());   // 400 problem+json`) +
    `<p>The response is a validation problem: status 400 with an <code>errors</code> object listing messages per field.</p>
    <blockquote><b>Say it in the interview:</b> Shape and range checks at the API edge, business invariants in the domain, and a consistent 400 validation problem response. I never trust client-side validation, and I keep validators as separate, unit-tested classes when rules get complex.</blockquote>`,
  followUps: ['400 vs 422 for validation errors?', 'Where would you check "email must be unique"?', 'How do you return several errors at once?']
});

interview.push({
  q: 'How do you configure System.Text.Json, and what are its pitfalls?', level: 'I',
  a: `<p>System.Text.Json is the built-in, fast JSON serializer; you configure it once for the whole API and need to know a handful of defaults that surprise people.</p>` +
    CODE(`builder.Services.ConfigureHttpJsonOptions(o =>          // minimal APIs
{
    o.SerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
    o.SerializerOptions.Converters.Add(new JsonStringEnumConverter());
    o.SerializerOptions.TypeInfoResolverChain.Insert(0, AppJsonContext.Default);
});

[JsonSerializable(typeof(CustomerDto))]
[JsonSerializable(typeof(List<CustomerDto>))]
public partial class AppJsonContext : JsonSerializerContext { }   // source generation`) +
    T(['Pitfall', 'Detail'], [
      ['Two sets of defaults', '<code>new JsonSerializerOptions()</code> is case-sensitive and keeps PascalCase. ASP.NET Core uses web defaults: camelCase and case-insensitive'],
      ['Enums', 'numbers unless you add the string converter'],
      ['Dates', 'prefer <code>DateTimeOffset</code> in UTC'],
      ['Reference loops', 'throws by default: return DTOs, not entity graphs'],
      ['Polymorphism', 'declare derived types with <code>[JsonDerivedType]</code>'],
      ['Coming from Newtonsoft.Json', 'stricter: no comments, no numbers in quotes, no private setters unless told']
    ]) +
    `<p><b>Source generation</b> writes the serialization code at build time: faster startup, no reflection, and it is required for Native AOT.</p>
    <blockquote><b>Say it in the interview:</b> I set the JSON options once, with string enums and nulls omitted, return DTOs to avoid cycles, and use DateTimeOffset. For performance or Native AOT I add a source-generated serializer context.</blockquote>`,
  followUps: ['When would you still use Newtonsoft.Json?', 'How do you serialize a base type with derived classes?', 'Why does source generation matter for Native AOT?']
});

interview.push({
  q: 'How does the .NET garbage collector work in detail?', level: 'A',
  a: `<p>The garbage collector finds objects that no code can reach any more and frees their memory, and it does this by age group because most objects die young.</p>
    <ul>
      <li><b>Generations:</b> new objects go to Gen 0. Survivors move to Gen 1, then Gen 2. Gen 0 collections are frequent and cheap; Gen 2 collections are rare and costly.</li>
      <li><b>Large Object Heap:</b> objects of 85,000 bytes or more. Collected only with Gen 2 and not compacted by default, so it fragments.</li>
      <li><b>Phases:</b> mark what is reachable from the roots (stack variables, static fields, GC handles), then sweep or compact.</li>
      <li><b>Modes:</b> Workstation or Server GC (one heap per core: more throughput, more memory). Background GC does most Gen 2 work while the app keeps running.</li>
      <li><b>Finalizers</b> run later on a separate thread and keep the object alive for another collection. Prefer <code>IDisposable</code>; call <code>GC.SuppressFinalize(this)</code> in <code>Dispose</code> if the class has a finalizer.</li>
    </ul>
    <p><b>Managed leaks</b> are references you forgot: static collections, events never unsubscribed, unbounded caches, undisposed timers, a long-lived <code>DbContext</code>.</p>` +
    `<blockquote><b>Say it in the interview:</b> It is a generational, compacting collector: cheap Gen 0 collections for short-lived objects, expensive Gen 2 for long-lived ones, and a separate heap for objects over 85,000 bytes. Leaks in .NET are unwanted references, and I find them by comparing heap dumps.</blockquote>`,
  followUps: ['Why is a finalizer more expensive than Dispose?', 'Server GC vs Workstation GC in a small container?', 'When, if ever, would you call GC.Collect?']
});

interview.push({
  q: 'Explain the JIT, tiered compilation, ReadyToRun, Native AOT and trimming.', level: 'A',
  a: `<p>These are different answers to one question: when is IL turned into machine code, at run time or at build time?</p>` +
    T(['Technology', 'What it does', 'Trade-off'], [
      ['JIT', 'compiles a method the first time it is called', 'warm-up cost on first use'],
      ['Tiered compilation', 'quick unoptimised code first (tier 0); hot methods are re-compiled optimised (tier 1) using run-time measurements (dynamic PGO)', 'fast start and a high peak, but speed ramps up over the first minutes'],
      ['ReadyToRun', 'pre-compiled native code shipped with the IL', 'faster start, bigger files, JIT can still improve hot code'],
      ['Native AOT', 'the whole app compiled ahead of time to one native executable, no JIT', 'fastest start, low memory; limited reflection, no run-time code generation, no dynamic assembly loading'],
      ['Trimming', 'removes code the app never uses', 'smaller output; breaks code that finds types by reflection']
    ]) +
    `<p>How I choose:</p>
    <ul>
      <li>A long-running API: plain JIT. Startup happens once and the peak speed is best.</li>
      <li>Cold starts hurt (scale-to-zero containers, functions): ReadyToRun first.</li>
      <li>Small tools, sidecars, tiny functions: Native AOT, after checking every library. EF Core's support is still limited, and anything built on heavy reflection needs care.</li>
    </ul>
    <blockquote><b>Say it in the interview:</b> The JIT gives the best steady-state speed, with a warm-up. ReadyToRun and Native AOT move that work to build time to cut cold start. Native AOT is the most extreme: one native file with no JIT, at the price of restrictions on reflection, so I check library support before choosing it.</blockquote>`,
  followUps: ['Why can Native AOT code be slower at peak than JIT code?', 'What replaces reflection in an AOT app?', 'How would you cut the cold start of a function app?']
});

interview.push({
  q: 'Rate limiting, output caching, response compression and health checks: how do you set them up?', level: 'A',
  a: `<p>These four are built-in middleware that protect and speed up an API: limit how much one caller can ask for, reuse responses, shrink them, and tell the platform whether the app is well.</p>` +
    CODE(`builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = 429;
    o.AddPolicy("per-user", ctx => RateLimitPartition.GetTokenBucketLimiter(
        ctx.User.Identity?.Name ?? ctx.Connection.RemoteIpAddress?.ToString() ?? "anonymous",
        _ => new TokenBucketRateLimiterOptions
        { TokenLimit = 20, TokensPerPeriod = 10, ReplenishmentPeriod = TimeSpan.FromSeconds(1) }));
});
builder.Services.AddOutputCache(o => o.AddPolicy("short", p => p.Expire(TimeSpan.FromSeconds(30)).Tag("products")));

app.UseRateLimiter();
app.UseOutputCache();`) +
    `<ul>
      <li><b>Rate limiter algorithms:</b> fixed window, sliding window, token bucket (allows bursts), concurrency. Counters are per instance; for one global limit use the gateway or a shared store.</li>
      <li><b>Output cache</b> stores whole responses on the server and can be cleared by tag when data changes. By default it does not cache authenticated requests.</li>
      <li><b>Liveness</b> = the process is alive. <b>Readiness</b> = dependencies are reachable. Never put the database in the liveness check, or one database blip restarts every instance.</li>
    </ul>
    <blockquote><b>Say it in the interview:</b> I rate limit per user with a token bucket and return 429, cache hot read endpoints with tag-based invalidation, and expose separate liveness and readiness endpoints. Liveness stays trivial so that a dependency outage does not cause a restart storm.</blockquote>`,
  followUps: ['Output caching vs response caching vs HybridCache?', 'How do you rate limit across ten instances?', 'What should a client do when it receives 429?']
});

interview.push({
  q: 'How do you do logging, tracing and metrics with OpenTelemetry in code?', level: 'A',
  a: `<p>OpenTelemetry is a vendor-neutral standard for the three signals (logs, metrics and traces), and in .NET you switch it on in <code>Program.cs</code> and export to whatever backend you use.</p>` +
    CODE(`builder.Services.AddOpenTelemetry()
    .ConfigureResource(r => r.AddService("booking-api"))
    .WithTracing(t => t
        .AddAspNetCoreInstrumentation()
        .AddHttpClientInstrumentation()
        .AddSource("Booking.Workflow"))
    .WithMetrics(m => m
        .AddAspNetCoreInstrumentation()
        .AddRuntimeInstrumentation())
    .UseOtlpExporter();

static readonly ActivitySource Source = new("Booking.Workflow");

using var activity = Source.StartActivity("booking.confirm");
activity?.SetTag("booking.id", bookingId);`) +
    `<ul>
      <li><b>Trace:</b> the whole journey of one request. <b>Span:</b> one step in it. In .NET a span is a <code>System.Diagnostics.Activity</code>.</li>
      <li><b>Propagation:</b> the trace ID travels to the next service in the W3C <code>traceparent</code> header. <code>HttpClient</code> adds it automatically, and message brokers need it copied into message headers.</li>
      <li><b>Correlation:</b> <code>Activity.Current?.TraceId</code> is attached to log lines, so one ID finds logs and traces. Return it in error responses.</li>
      <li><b>Metrics:</b> request rate, error rate, duration, plus runtime counters such as GC and thread pool queue length.</li>
    </ul>
    <blockquote><b>Say it in the interview:</b> I instrument with OpenTelemetry so traces, metrics and logs share one trace ID that flows between services in the traceparent header. Auto-instrumentation covers ASP.NET Core and HttpClient, and I add custom spans and metrics around the business steps that matter.</blockquote>`,
  followUps: ['How does the trace ID cross a message queue?', 'What is sampling and what do you lose with it?', 'Which four signals would you alert on for an API?']
});

interview.push({
  q: 'Explain <code>Span&lt;T&gt;</code>, <code>Memory&lt;T&gt;</code>, ref structs and allocation-free code.', level: 'E',
  a: `<p>A span is a lightweight window onto memory that already exists, so you can read or slice part of an array or string without copying it.</p>` +
    CODE(`static int CountDigits(ReadOnlySpan<char> text)
{
    int n = 0;
    foreach (char c in text) if (char.IsDigit(c)) n++;
    return n;
}

ReadOnlySpan<char> tail = "ID-12345".AsSpan(3);    // view of "12345", nothing allocated
Span<byte> scratch = stackalloc byte[256];         // stack memory, invisible to the GC

byte[] rented = ArrayPool<byte>.Shared.Rent(8192); // reuse big buffers
try { Process(rented); }
finally { ArrayPool<byte>.Shared.Return(rented); }`) +
    T(['Type', 'Lives', 'Use'], [
      ['<code>Span&lt;T&gt;</code> / <code>ReadOnlySpan&lt;T&gt;</code>', 'stack only (a <code>ref struct</code>)', 'synchronous parsing and slicing'],
      ['<code>Memory&lt;T&gt;</code> / <code>ReadOnlyMemory&lt;T&gt;</code>', 'can be stored on the heap', 'fields, and data that must survive an <code>await</code>']
    ]) +
    `<p><b>Why a ref struct is restricted:</b> a span may point at stack memory, so the compiler makes sure it can never outlive that memory. It cannot be a field of a class, and cannot be alive across an <code>await</code>. Since C# 13 you may declare one in an async method as long as it is not used after an await.</p>
    <p><b>Where it pays off:</b> parsers, serializers, network pipelines (Kestrel and <code>System.IO.Pipelines</code> are built on it). Where it does not: ordinary business code.</p>
    <blockquote><b>Say it in the interview:</b> Span is a stack-only view over existing memory, which lets me slice and parse without allocating. When data has to live on the heap or across an await I use Memory. I use these in measured hot paths, together with stackalloc and ArrayPool, not everywhere.</blockquote>`,
  followUps: ['Why can a Span not be a field in a class?', 'What happens if you forget to return a rented array?', 'How would you prove an optimisation removed allocations?']
});

interview.push({
  q: 'Under load, requests hang while the CPU is almost idle. What is thread pool starvation and how do you diagnose it?', level: 'E',
  a: `<p>Thread pool starvation means every pool thread is blocked waiting for something, so new requests sit in a queue even though the CPU has nothing to do.</p>
    <p><b>How it happens:</b> code blocks a thread on asynchronous work with <code>.Result</code>, <code>.Wait()</code> or <code>.GetAwaiter().GetResult()</code>. The blocked thread needs <i>another</i> pool thread to complete the work it waits for. When all threads wait, nothing can finish. The pool notices and adds threads, but only about one or two per second, so a traffic burst outruns it.</p>` +
    T(['Signal', 'Tool'], [
      ['thread pool queue length rising, thread count climbing steadily, CPU low', '<code>dotnet-counters monitor System.Runtime</code>'],
      ['hundreds of threads with the same blocked stack', '<code>dotnet-stack report</code> or a dump opened with <code>dotnet-dump</code> (<code>clrthreads</code>, <code>parallelstacks</code>)']
    ]) +
    CODE(`// Blocks a pool thread for the whole call
var order = orderService.GetAsync(id).Result;

// Frees the thread while waiting
var order = await orderService.GetAsync(id, ct);`) +
    `<p><b>Fix:</b> async all the way down, including data access and HTTP calls; remove sync wrappers around async libraries; move truly blocking work off request threads; add timeouts. Raising <code>ThreadPool.SetMinThreads</code> can buy time during an incident, but it treats the symptom.</p>
    <blockquote><b>Say it in the interview:</b> Low CPU with a growing request queue points to blocked threads, usually sync-over-async. I confirm it with dotnet-counters and a stack dump showing many threads parked on the same call, then make that path fully async. Raising the minimum thread count is only a stopgap.</blockquote>`,
  followUps: ['Why does the pool add threads so slowly?', 'Why does .Result not deadlock in ASP.NET Core the way it did in classic ASP.NET?', 'Is Task.Run a fix for blocking code in a web API?']
});

interview.push({
  q: 'How are assemblies loaded in modern .NET, and what replaced AppDomains?', level: 'E',
  a: `<p>Assemblies are loaded lazily, the first time a type from them is needed, and isolation between sets of assemblies is now done with <code>AssemblyLoadContext</code> because modern .NET has only one AppDomain per process.</p>
    <ul>
      <li><b>Resolution:</b> for a normal app the host reads <code>MyApp.deps.json</code> (the exact list of dependencies and versions) and <code>MyApp.runtimeconfig.json</code> (which shared framework to use), and builds the list of trusted assemblies.</li>
      <li><b>Default context:</b> everything the app references loads into the default <code>AssemblyLoadContext</code>.</li>
      <li><b>Custom contexts:</b> a plug-in host creates one context per plug-in, so two plug-ins can use different versions of the same library.</li>
      <li><b>Unloading:</b> a context created as <i>collectible</i> can be unloaded, but only when nothing references its types any more.</li>
    </ul>` +
    T(['.NET Framework', 'Modern .NET'], [
      ['several AppDomains per process, with a security boundary', 'one AppDomain; isolation by process or container'],
      ['unload an AppDomain to unload code', 'collectible <code>AssemblyLoadContext</code>']
    ]) +
    `<p>A type's identity includes its load context: the same class loaded in two contexts is two different types, which is the usual cause of the confusing "cannot cast X to X" error in plug-in systems.</p>
    <blockquote><b>Say it in the interview:</b> Modern .NET resolves assemblies from deps.json into a default AssemblyLoadContext and loads them on first use. For plug-ins I create a collectible load context per plug-in for version isolation and unloading. For real security isolation I use a separate process, because AppDomain sandboxes no longer exist.</blockquote>`,
  followUps: ['Why might an AssemblyLoadContext refuse to unload?', 'What causes "type X cannot be cast to type X"?', 'What are deps.json and runtimeconfig.json for?']
});

// ====================== INTERVIEW: 5. Modern language and framework features ======================
interview.push({
  q: 'Which C# features can you name by version?', level: 'B',
  a: `<p>Each C# version ships with a .NET version, and you should be able to name two or three features for each recent one.</p>` +
    T(['C#', '.NET', 'Highlights'], [
      ['7', 'Framework 4.7 / Core 2', 'tuples, <code>out var</code>, local functions, first pattern matching'],
      ['8', 'Core 3.x', 'nullable reference types, switch expressions, async streams, ranges and indices'],
      ['9', '5', 'records, init-only setters, top-level statements, target-typed <code>new</code>'],
      ['10', '6', 'global usings, file-scoped namespaces, record structs'],
      ['11', '7', 'required members, raw string literals, list patterns, generic math'],
      ['12', '8', 'primary constructors, collection expressions <code>[1, 2, 3]</code>'],
      ['13', '9', 'params collections, the <code>Lock</code> type, the <code>\\e</code> escape'],
      ['14', '10', 'the <code>field</code> keyword, extension members, null-conditional assignment']
    ]) +
    CODE(`public record Customer(Guid Id, string Name);              // C# 9
var renamed = customer with { Name = "New" };

public class Svc(IRepo repo) { }                           // C# 12 primary constructor
int[] more = [.. nums, 4, 5];                              // C# 12 spread

public string Name { get; set => field = value.Trim(); }   // C# 14 field keyword`) +
    `<p>The language version follows the target framework by default, so targeting <code>net10.0</code> gives you C# 14.</p>
    <blockquote><b>Say it in the interview:</b> The ones I use daily are records and nullable reference types from C# 8 and 9, primary constructors and collection expressions from C# 12, and from C# 14 the field keyword, which removes hand-written backing fields.</blockquote>`,
  followUps: ['What does a record give you that a class does not?', 'What do nullable reference types actually check?', 'Can you use C# 14 in a .NET Framework project?']
});

interview.push({
  q: 'Rapid fire: request handling in ASP.NET Core', level: 'B',
  a: `<p>Short questions about how a request is handled; each needs a one-line answer and one reason.</p>` +
    T(['Question', 'Short answer'], [
      ['What do <code>UseRouting</code> and <code>UseEndpoints</code> do now?', 'With <code>WebApplication</code> they are added for you. Routing picks the endpoint; middleware after it can read the endpoint\'s metadata; the endpoint runs at the end.'],
      ['<code>IActionResult</code> vs <code>ActionResult&lt;T&gt;</code>?', '<code>IActionResult</code> can be any result. <code>ActionResult&lt;T&gt;</code> also states the success type, so OpenAPI knows the response shape and you can return the object directly.'],
      ['How do you handle cancellation?', 'Accept a <code>CancellationToken</code> in the action and pass it to EF Core and <code>HttpClient</code>. It fires when the client disconnects, so abandoned work stops.'],
      ['What happens on an unhandled exception?', 'The exception-handler middleware catches it, logs it and writes a Problem Details response. The detailed developer page is for Development only.'],
      ['Sync over async in a controller?', 'Avoid <code>.Result</code> and <code>.Wait()</code>. They block pool threads and cause thread starvation under load.'],
      ['Why records for DTOs?', 'Immutable by default, equality by value, one line to declare, and a readable <code>ToString</code>.']
    ]) +
    `<blockquote><b>Say it in the interview:</b> Routing selects the endpoint, I return ActionResult of T for typed responses, I pass the cancellation token all the way down, errors become Problem Details, and I never block on async code.</blockquote>`,
  followUps: ['When does the request cancellation token fire?', 'What are TypedResults in minimal APIs?', 'What is the difference between a record class and a record struct?']
});

interview.push({
  q: 'Rapid fire: services, configuration and clients', level: 'I',
  a: `<p>Short questions about the container, settings and outgoing calls.</p>` +
    T(['Question', 'Short answer'], [
      ['A scoped service used inside a singleton?', 'A captive dependency. Inject <code>IServiceScopeFactory</code> and create a scope per operation, or make the consumer scoped.'],
      ['<code>IOptionsSnapshot</code> vs <code>IOptionsMonitor</code>?', 'Snapshot is scoped and re-reads per request. Monitor is a singleton with the current value and change notifications; use it in singletons.'],
      ['What is <code>HttpContext.RequestServices</code>?', 'The scoped service provider for the current request. Resolving from it gives the same scoped instances the controller got.'],
      ['How is configuration layered?', '<code>appsettings.json</code>, then the environment file, user secrets in Development, environment variables, command line. The later source wins.'],
      ['Typed vs named <code>HttpClient</code>?', 'A named client is fetched from the factory by a string. A typed client is a class that receives a configured <code>HttpClient</code>, so callers get a strongly typed API.'],
      ['Blazor vs React?', 'Blazor builds the UI in C#, rendered on the server or in the browser through WebAssembly, and shares code with the back end. React is JavaScript or TypeScript with a far larger ecosystem and hiring pool. Choose by team skills and what already exists.']
    ]) +
    `<blockquote><b>Say it in the interview:</b> Longer-lived services must not capture shorter-lived ones, later configuration sources override earlier ones, IOptionsMonitor is the one for singletons, and I prefer typed HttpClients because the HTTP details stay in one class.</blockquote>`,
  followUps: ['How do you write a nested configuration key as an environment variable?', 'Why should a typed client not be injected into a singleton?', 'When would Blazor be the better choice for a team?']
});

interview.push({
  q: 'What is new in recent .NET releases, and how do you talk about it?', level: 'I',
  a: `<p>Pick a few features you can explain with a use case, grouped by release, and be honest about which you have used in production.</p>` +
    T(['Release', 'Area', 'What to mention'], [
      ['.NET 8 (LTS)', 'runtime and web', 'Native AOT for minimal APIs, keyed DI, <code>TimeProvider</code>, <code>FrozenDictionary</code>, Blazor Web App'],
      ['', 'data', 'EF Core 8: complex types, primitive collections (<code>ExecuteUpdate</code> and <code>ExecuteDelete</code> came in EF Core 7)'],
      ['.NET 9 (STS)', 'web and libraries', 'built-in OpenAPI, <code>HybridCache</code>, <code>System.Threading.Lock</code>, <code>Task.WhenEach</code>, LINQ <code>CountBy</code>, <code>AggregateBy</code>, <code>Index</code>'],
      ['.NET 10 (LTS)', 'language', 'C# 14: <code>field</code>, extension members, null-conditional assignment'],
      ['', 'web', 'validation in minimal APIs, Server-Sent Events results, OpenAPI 3.1, passkeys in ASP.NET Core Identity'],
      ['', 'data', 'EF Core 10: named query filters, <code>LeftJoin</code>, vector search and the JSON column type on SQL Server 2025 and Azure SQL'],
      ['', 'AI and tools', '<code>Microsoft.Extensions.AI</code> abstractions, Microsoft Agent Framework, file-based apps (<code>dotnet run app.cs</code>)']
    ]) +
    `<p>A good pattern for the answer: <b>feature → the problem it removed for us</b>. "<code>HybridCache</code> gave us one API over memory and a distributed cache, and it stops many callers recomputing the same missing entry at once."</p>
    <p>If you have not used a feature, say "I have read about it and would use it for X". Do not bluff; a follow-up will show it.</p>
    <blockquote><b>Say it in the interview:</b> We are on .NET 10, the current LTS. The features that changed our code are keyed services and TimeProvider from 8, built-in OpenAPI and HybridCache from 9, and C# 14 plus built-in minimal API validation from 10.</blockquote>`,
  followUps: ['What does HybridCache add over IDistributedCache?', 'What are named query filters in EF Core 10?', 'Which of these have you actually shipped?']
});

interview.push({
  q: 'Explain LINQ internals and pitfalls.', level: 'I',
  a: `<p>A LINQ query does not run when you write it; it runs when you loop over it or ask for a result. This is called deferred execution.</p>
    <ul>
      <li><b>Deferred:</b> <code>Where</code>, <code>Select</code>, <code>OrderBy</code> only build a recipe. <code>ToList</code>, <code>Count</code>, <code>First</code>, <code>foreach</code> run it. Looping twice runs it twice, and for a database query that means two SQL queries.</li>
      <li><b><code>IEnumerable&lt;T&gt;</code> vs <code>IQueryable&lt;T&gt;</code>:</b> the first runs in memory with delegates. The second builds an expression tree that a provider (EF Core) translates to SQL. Calling <code>AsEnumerable()</code> or <code>ToList()</code> switches from database to memory, so do it only after filtering.</li>
      <li><b>Streaming vs buffering:</b> <code>Where</code> and <code>Select</code> pass items through one at a time. <code>OrderBy</code>, <code>GroupBy</code> and <code>Reverse</code> must read everything first.</li>
    </ul>` +
    T(['Pitfall', 'Better'], [
      ['<code>Count() &gt; 0</code>', '<code>Any()</code> stops at the first match'],
      ['<code>Single</code> when you mean "the first one"', '<code>First</code>; <code>Single</code> throws if there are two'],
      ['<code>ToDictionary</code> with duplicate keys throws', '<code>ToLookup</code> or <code>GroupBy</code>'],
      ['enumerating the same query several times', 'materialise once with <code>ToList()</code>'],
      ['a lambda capturing a <code>for</code> loop variable', 'copy it to a local first (the <code>foreach</code> variable has been safe since C# 5)']
    ]) +
    CODE(`var top = customers.Where(c => c.IsActive)
                   .OrderByDescending(c => c.Revenue)
                   .Take(10)
                   .ToList();                       // runs once, here
var perTier = customers.CountBy(c => c.Tier);       // .NET 9: count per key without GroupBy`) +
    `<blockquote><b>Say it in the interview:</b> LINQ is lazy: the query runs on enumeration, every time. With IQueryable the expression becomes SQL, so I filter and project before materialising, and I call ToList once when I need the results more than once.</blockquote>`,
  followUps: ['How do you write a left join in LINQ?', 'What does SelectMany do?', 'How does yield return produce deferred execution?']
});

interview.push({
  q: 'Apply SOLID to real code. Give a violation and a fix for each principle.', level: 'I',
  a: `<p>SOLID is five rules of thumb for classes that are easy to change, and the convincing way to explain them is with a violation you have actually met.</p>` +
    T(['Principle', 'In plain words', 'Violation', 'Fix'], [
      ['<b>S</b>ingle responsibility', 'one reason to change', 'a controller validates, queries the database and sends email', 'validator, service, notifier'],
      ['<b>O</b>pen/closed', 'add behaviour without editing tested code', 'a <code>switch (reportType)</code> edited for each new report', 'one class per report behind an interface, found through a registry'],
      ['<b>L</b>iskov substitution', 'a subtype must work wherever the base type works', '<code>ReadOnlyStore : Store</code> whose <code>Save</code> throws <code>NotSupportedException</code>', 'split into reader and writer interfaces'],
      ['<b>I</b>nterface segregation', 'no client should depend on methods it does not use', 'an <code>IRepository</code> with 20 methods', 'small role interfaces'],
      ['<b>D</b>ependency inversion', 'depend on abstractions, not on details', 'domain code creates a <code>SqlConnection</code>', 'inject an interface; the infrastructure layer implements it']
    ]) +
    `<p>The senior point: SOLID is a means, not a score. Splitting a 40-line class into five interfaces to satisfy a rule makes the code harder to follow. Apply a principle when the code is actually hurting: hard to test, or risky to change.</p>
    <blockquote><b>Say it in the interview:</b> My best example is open/closed: we had a switch that every new report type had to edit. We moved each type behind one interface with DI registration, so a new report is a new class and nothing tested is touched. I apply SOLID where change is frequent, not everywhere.</blockquote>`,
  followUps: ['Dependency inversion vs dependency injection?', 'Give an example where applying SOLID made code worse.', 'How does interface segregation help testing?']
});

interview.push({
  q: 'Which techniques do you use to refactor legacy code safely?', level: 'A',
  a: `<p>I first pin down what the code does today with tests, then change its structure in small steps that each keep the behaviour the same.</p>` +
    T(['Technique', 'What it means'], [
      ['Characterisation tests', 'tests that record current behaviour, bugs included, so any change in output shows up'],
      ['Seams', 'put an interface in front of a hard dependency (database, clock, file system) so the logic can be tested alone'],
      ['Extract method and class', 'small mechanical moves, done with the IDE\'s refactoring tools'],
      ['Branch by abstraction', 'add an abstraction, build the new implementation behind it, switch over, delete the old one, all on the main branch'],
      ['Strangler fig', 'put a facade or proxy in front and replace the system one piece at a time'],
      ['Feature flags', 'ship the new path switched off, turn it on for a few users, keep a quick way back'],
      ['Delete dead code', 'use coverage and production telemetry to prove a path is unused, then remove it']
    ]) +
    `<p>Rules I hold the team to:</p>
    <ul>
      <li>Never mix a refactor and a behaviour change in one commit. Reviewers cannot verify both.</li>
      <li>Small commits, each one green.</li>
      <li>For risky logic, run old and new in parallel and compare the results before switching.</li>
      <li>Refactor the code you need to touch for a feature. A "big clean-up" project with no business outcome rarely gets finished.</li>
    </ul>
    <blockquote><b>Say it in the interview:</b> Tests first to capture today's behaviour, then small behaviour-preserving steps behind a seam, shipped continuously with a feature flag. For a whole system I use the strangler fig pattern in preference to a rewrite.</blockquote>`,
  followUps: ['How do you test code that calls DateTime.Now and a static database helper?', 'How do you get time for refactoring from the business?', 'When is a rewrite the right call?']
});

interview.push({
  q: 'As a lead, how do you decide which new language and framework features the team adopts?', level: 'A',
  a: `<p>I adopt a new feature when it removes a class of bugs or a lot of repeated code, and I roll it out as a team rule with tooling, not as one person's style.</p>` +
    T(['Question I ask', 'Example'], [
      ['Does it prevent bugs?', 'nullable reference types, <code>required</code> members: yes, adopt everywhere'],
      ['Does it remove boilerplate without hiding meaning?', 'records for DTOs, primary constructors for DI, collection expressions: yes'],
      ['Does it change run-time behaviour or performance?', '<code>HybridCache</code>, Native AOT, the new <code>Lock</code> type: trial on one service and measure'],
      ['Is it still in preview?', 'not in production code'],
      ['Will everyone understand it at 2 a.m. during an incident?', 'clever pattern matching nested four levels deep: no']
    ]) +
    `<p>How I roll it out:</p>
    <ol>
      <li>A short written decision: the feature, why, and one before and after example.</li>
      <li>Enforce with <code>.editorconfig</code> and analyzers, with warnings as errors for the rules that matter, so reviews are not about style.</li>
      <li>Migrate old code when it is touched, or in one automated pass. Avoid a code base that is half old style, half new.</li>
      <li>For framework upgrades: stay on LTS versions, one pilot service first, then the rest on a checklist.</li>
      <li>Put the same rules in the instructions file for AI coding assistants, so generated code follows the house style.</li>
    </ol>
    <blockquote><b>Say it in the interview:</b> My filter is simple: does the feature remove bugs or boilerplate, and can the whole team read it? If yes, we adopt it everywhere with an analyzer rule and a short decision record. Run-time features get a measured trial on one service first.</blockquote>`,
  followUps: ['How do you turn on nullable reference types in a large old code base?', 'A senior developer dislikes primary constructors. How do you handle it?', 'Would you ever run production on an STS release?']
});

// ====================== PRACTICE (3 Easy, 5 Medium, 4 Hard) ======================
practice.push(P({
  t: 'Explain to a product owner why the team must leave .NET 8', l: 'Easy', tags: ['versions', 'support', 'communication'],
  s: 'The product owner says: "The app works fine on .NET 8. Why should I give you two sprints to move to .NET 10?" Answer in plain language, with no jargon.',
  ex: '<p>Shape: <span class="c-g">what "out of support" means</span> → <span class="c-b">the risk in business words</span> → <span class="c-y">the cost</span> → <span class="c-p">what they get</span>.</p>',
  weak: '.NET 10 has C# 14 with extension members and the field keyword, and the JIT has better PGO, so we should upgrade.',
  why: 'It is a list of features the product owner cannot value. It never mentions the real reason: no more security fixes.',
  q: ['What is the strongest reason to give a non-technical person?', ['The new language features are nicer', 'After 10 November 2026 .NET 8 receives no security patches', 'Developers are bored with the old version', 'Upgrading always makes apps twice as fast'], 1, 'End of support means known security holes stay open. That is a business and compliance risk anyone can understand.'],
  h: ['Translate "LTS ended" into something a business person fears: unpatched security holes, failed audits.', 'Give a cost they can plan: days per service, and that it is mostly testing.', 'Close with the benefit: supported until November 2028, and usually faster for free. Offer a pilot on one service to firm up the estimate.'],
  a: `<p><b>Model answer.</b> "It works today, and it will keep working. The problem is what happens when a security hole is found. Microsoft stopped fixing .NET 8 on 10 November 2026. From then on, any new weakness stays open in our app, and our security audit will flag it. It is like running a phone that no longer gets updates."</p>
    <p>"The move is mostly testing, not rewriting: roughly two to three days per service. I would start with one small service this sprint, so the estimate for the rest is based on facts. In return we are covered until November 2028, and each .NET version has also made our kind of app faster, which can lower hosting cost."</p>
    <p>"If two sprints in a row is too much, we can spread it: the internet-facing services first, internal ones after."</p>`,
  cx: 'puts the reason in business terms (security and audit), gives a concrete cost, offers a low-risk first step and a way to phase the work.',
  f: ['The product owner asks: "Can we skip to .NET 12 later and save one upgrade?"', 'How do you make sure this is not a surprise again in 2028?']
}));

practice.push(P({
  t: 'The app reads the wrong connection string in production', l: 'Easy', tags: ['configuration', 'environments'],
  s: 'An API works on every laptop. In production it tries to connect to <code>localhost</code> and fails. The correct connection string was added to <code>appsettings.Production.json</code>. What do you check?',
  ex: '<p>Log line in production: <code>Hosting environment: Staging</code>. So <code>appsettings.Production.json</code> was never loaded, and the value from <code>appsettings.json</code> (<span class="c-r">localhost</span>) won.</p>',
  weak: 'I would hard-code the production connection string in Program.cs so it cannot be wrong.',
  why: 'It puts a secret in source control, breaks every other environment, and does not find out why configuration was not applied.',
  q: ['Which source wins when the same key exists in several places?', ['appsettings.json always wins', 'The source added last, so environment variables beat the JSON files', 'The first file found', 'Whichever value is longer'], 1, 'Configuration providers are layered and the last one added wins. By default environment variables come after the JSON files.'],
  h: ['Which file is loaded depends on one environment variable. What is its value on that server?', 'List the sources in order and ask which one actually supplied the value. The startup log shows the environment name.', 'Check ASPNETCORE_ENVIRONMENT, check whether an environment variable such as ConnectionStrings__Default overrides the file, and move the secret out of files into a vault.'],
  a: `<p><b>Model answer.</b> "Configuration is layered, so I find out which layer supplied the value."</p>
    <ol>
      <li><b>Environment name.</b> The startup log prints "Hosting environment". If <code>ASPNETCORE_ENVIRONMENT</code> is missing it defaults to Production; if it says Staging, the Production file is never read.</li>
      <li><b>Is the file deployed?</b> Check the published output actually contains <code>appsettings.Production.json</code>.</li>
      <li><b>Overrides.</b> Environment variables beat files. A leftover <code>ConnectionStrings__Default</code> variable on the host would silently win. Note the double underscore.</li>
      <li><b>Key spelling.</b> <code>ConnectionStrings:Default</code> must match what <code>GetConnectionString("Default")</code> asks for.</li>
    </ol>
    <p>"Then I fix the cause and improve the design: connection strings do not belong in a JSON file in the repository. I would use a managed identity, or a vault reference, and add <code>ValidateOnStart</code> so a missing or obviously wrong setting stops the deployment."</p>`,
  cx: 'knows the layering order and the environment variable, checks evidence in the startup log, and moves the secret to a safer place.',
  f: ['How can you print the effective configuration safely for debugging?', 'What is the risk of user secrets being used outside Development?']
}));

practice.push(P({
  t: '"Cannot consume scoped service from singleton" at startup', l: 'Easy', tags: ['dependency injection', 'lifetimes'],
  s: 'After adding a new <code>PriceCache</code> class registered with <code>AddSingleton</code>, the app fails on a developer machine with: "Cannot consume scoped service ShopDb from singleton PriceCache". A colleague suggests registering the <code>DbContext</code> as a singleton to make the error go away. What do you say?',
  ex: '<p><code>AddSingleton&lt;PriceCache&gt;()</code> and <code>class PriceCache(ShopDb db)</code>. <span class="c-r">A singleton is holding a per-request object.</span></p>',
  weak: 'Make the DbContext a singleton too. Then the lifetimes match and the error disappears.',
  why: 'A DbContext is not thread-safe and tracks every entity it loads. Shared by all requests it throws under load, returns stale data and grows without limit.',
  q: ['What is the correct way for a singleton to use a DbContext?', ['Register the DbContext as a singleton', 'Create a scope per operation with IServiceScopeFactory, or use IDbContextFactory', 'Turn off scope validation', 'Store the DbContext in a static field'], 1, 'The singleton must not hold the context. It creates a short-lived scope (or context) for each operation and disposes it.'],
  h: ['The error is the container protecting you. What would happen if one DbContext were shared by 200 requests at once?', 'A singleton may create short-lived things. It just must not keep them in a field.', 'Inject IServiceScopeFactory (or IDbContextFactory), create and dispose a scope per refresh, and keep only plain data in the cache.'],
  a: `<p><b>Model answer.</b> "The error is correct and I would not hide it. This is a captive dependency: the singleton would keep one <code>DbContext</code> for the life of the app. A context is not thread-safe, so concurrent requests would throw 'a second operation was started on this context', and its change tracker would grow forever."</p>
    <p>"The fix is for the singleton to borrow a context only while it needs one:"</p>` +
    CODE(`public class PriceCache(IServiceScopeFactory scopes, IMemoryCache cache)
{
    public Task<decimal?> GetAsync(int productId, CancellationToken ct) =>
        cache.GetOrCreateAsync("price:" + productId, async entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5);
            using var scope = scopes.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<ShopDb>();
            return await db.Products.Where(p => p.Id == productId)
                                    .Select(p => (decimal?)p.Price)
                                    .FirstOrDefaultAsync(ct);
        });
}`) +
    `<p>"I would also point out that this check only runs in Development by default, so I turn on <code>ValidateScopes</code> and <code>ValidateOnBuild</code> in the integration tests to catch it in the pipeline."</p>`,
  cx: 'names the captive dependency, explains why a shared DbContext is dangerous, and fixes it with a scope per operation.',
  f: ['Why is this error only thrown in the Development environment?', 'What is IDbContextFactory for?']
}));

practice.push(P({
  t: 'Outgoing calls fail with socket errors under load', l: 'Medium', tags: ['HttpClient', 'resilience'],
  s: 'During a sale, an order API starts throwing <code>SocketException: Only one usage of each socket address is normally permitted</code> when calling the payment service. CPU and memory are fine. The code does <code>using var client = new HttpClient();</code> inside the method. Explain and fix.',
  ex: '<p>Each request creates and disposes an <code>HttpClient</code>. <span class="c-r">Closed connections linger for minutes</span>, so under load the machine runs out of ports.</p>',
  weak: 'The payment service is overloaded. I would add a retry loop with five attempts around the call.',
  why: 'The error is local, not from the payment service. Retrying opens even more connections and makes the exhaustion worse.',
  q: ['Why does disposing HttpClient after each call not free the port straight away?', ['The garbage collector is slow', 'The operating system keeps a closed TCP connection in a wait state for a while', 'HttpClient ignores Dispose', 'DNS caches the port'], 1, 'After close, a TCP connection stays in TIME_WAIT. Thousands of short-lived connections exhaust the available ports.'],
  h: ['Read the error again: is it the remote service refusing you, or your own machine running out of something?', 'Connections are meant to be reused. Which .NET service hands out clients that share pooled connections?', 'Register a typed client with IHttpClientFactory, set a timeout, add the standard resilience handler, and retry only what is safe to repeat.'],
  a: `<p><b>Model answer.</b> "This is socket exhaustion on our side. Every <code>new HttpClient()</code> opens new connections, and after dispose the operating system keeps each port reserved for a while. At sale traffic we run out of ports. The fix is to reuse connections."</p>` +
    CODE(`builder.Services.AddHttpClient<IPaymentClient, PaymentClient>(c =>
{
    c.BaseAddress = new Uri(builder.Configuration["Payments:BaseUrl"]!);
    c.Timeout = TimeSpan.FromSeconds(10);
})
.AddStandardResilienceHandler();

public class PaymentClient(HttpClient http) : IPaymentClient
{
    public async Task<PaymentResult?> ChargeAsync(ChargeRequest request, CancellationToken ct)
    {
        var response = await http.PostAsJsonAsync("/charges", request, ct);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<PaymentResult>(ct);
    }
}`) +
    `<p>"The factory pools the underlying handlers and recycles them, so we get connection reuse and still pick up DNS changes. Because a charge is not safe to repeat blindly, I send an idempotency key with it before allowing retries. Afterwards I would load-test, watch the open connection count, and add an analyzer rule or review checklist item against <code>new HttpClient()</code>."</p>`,
  cx: 'recognises a local resource problem, fixes it with pooled clients, and thinks about idempotency before adding retries.',
  f: ['Why is one static HttpClient not a perfect fix either?', 'How do you make a payment call safe to retry?']
}));

practice.push(P({
  t: 'The browser reports a CORS error, but the same call works in Postman', l: 'Medium', tags: ['CORS', 'middleware', 'front end'],
  s: 'A React app on <code>https://app.example.com</code> calls your API on <code>https://api.example.com</code>. The browser console shows "blocked by CORS policy". The same request from Postman returns 200. The network tab shows an <code>OPTIONS</code> request returning 401. What is wrong?',
  ex: '<p><code>OPTIONS /api/orders</code> → <span class="c-r">401</span>, so the browser never sends the real <code>POST</code>. Pipeline: <code>UseAuthentication(); UseAuthorization(); UseCors();</code></p>',
  weak: 'CORS is broken, so I would call AllowAnyOrigin, AllowAnyHeader and AllowAnyMethod to open it up.',
  why: 'It widens access without finding the cause, and the preflight would still get 401 because the order of middleware is the real problem.',
  q: ['Why does Postman succeed while the browser fails?', ['Postman sends a better token', 'CORS is enforced only by browsers; Postman does not send a preflight or check the response headers', 'Postman uses HTTP/2', 'The API detects Postman and allows it'], 1, 'CORS is a browser protection. Tools and servers ignore it, which is also why it is not an API security control.'],
  h: ['Look at the OPTIONS request. Does a preflight carry the Authorization header?', 'Which middleware answered 401 before the CORS middleware could answer the preflight?', 'Move UseCors after UseRouting and before UseAuthentication, allow exactly the front-end origin, the Authorization and Content-Type headers, and the methods used.'],
  a: `<p><b>Model answer.</b> "Postman is not a browser, so it skips CORS. The browser sends a <b>preflight</b> <code>OPTIONS</code> request first because the call has an <code>Authorization</code> header and a JSON body. A preflight never carries the token. Our pipeline runs authorization before CORS, so the preflight gets 401, the browser sees no CORS headers and blocks the real request."</p>
    <p>"The fix is the order and a precise policy:"</p>` +
    CODE(`builder.Services.AddCors(o => o.AddPolicy("Frontend", p => p
    .WithOrigins("https://app.example.com")
    .WithHeaders("Authorization", "Content-Type")
    .WithMethods("GET", "POST", "PUT", "DELETE")));

app.UseRouting();
app.UseCors("Frontend");
app.UseAuthentication();
app.UseAuthorization();`) +
    `<p>"I keep the origin list exact and read it from configuration per environment. I would not use <code>AllowAnyOrigin</code>, and it cannot be combined with credentials anyway. If an API gateway sits in front, I decide on one place to handle CORS, the gateway or the app, not both, or the headers get duplicated."</p>`,
  cx: 'explains the preflight, reads the evidence in the network tab, fixes the middleware order and keeps the policy narrow.',
  f: ['Which requests do not trigger a preflight?', 'What happens if both the gateway and the app add the CORS header?']
}));

practice.push(P({
  t: 'The API returns stack traces and SQL to clients', l: 'Medium', tags: ['error handling', 'Problem Details', 'security'],
  s: 'A security review found that error responses from your API include exception messages, stack traces and a SQL statement. Each controller has its own try/catch that returns <code>ex.ToString()</code>. Design the fix.',
  ex: '<p>Today: <code>500 { "error": "SqlException: Invalid column name... at Shop.Data.OrderRepo.Get() ..." }</code></p><p>Goal: <code>500 application/problem+json { "title": "An unexpected error occurred", "status": 500, "traceId": "..." }</code></p>',
  weak: 'I would edit every catch block to return a generic message string instead of ex.ToString().',
  why: 'It leaves dozens of copies of error handling, misses exceptions thrown outside those blocks, loses the log detail, and gives clients no consistent shape.',
  q: ['Where should the full exception detail go?', ['Into the response body in all environments', 'Into server-side logs, linked to the response by a trace ID', 'Into a response header', 'Nowhere, to be safe'], 1, 'Operators need the detail, clients must not see it. A shared trace ID connects the safe response to the full log entry.'],
  h: ['Thirty try/catch blocks doing the same thing is a sign the logic belongs in one place. Where in the pipeline can one piece of code see every unhandled error?', 'Clients need a stable, documented error shape. Which standard defines one for HTTP APIs?', 'Register AddProblemDetails and an IExceptionHandler, map known exception types to status codes, log the exception with the trace ID, delete the per-controller catch blocks, and add a test that asserts no stack trace is returned.'],
  a: `<p><b>Model answer.</b> "I would centralise it."</p>
    <ol>
      <li><b>One handler.</b> <code>AddProblemDetails()</code>, an <code>IExceptionHandler</code>, and <code>UseExceptionHandler()</code> first in the pipeline. It catches everything below it, including errors in middleware and model binding that the controller blocks never saw.</li>
      <li><b>Mapping.</b> Known exception types map to status codes: not found → 404, conflict → 409, validation → 400 with field errors, everything else → 500 with a generic title.</li>
      <li><b>Logging.</b> The handler logs the full exception once, with the trace ID. The response includes the same trace ID so support can find it.</li>
      <li><b>Clean-up.</b> Remove the controller try/catch blocks. Controllers either return a result or let the exception go.</li>
      <li><b>Guard.</b> The developer exception page is enabled only in Development. An integration test forces an error and asserts the body is <code>application/problem+json</code> and contains no "at " stack frames.</li>
    </ol>
    <p>"For expected outcomes such as 'order not found' I prefer returning a result over throwing, since exceptions are slow and noisy in logs."</p>`,
  cx: 'moves error handling to one place, uses the Problem Details standard, separates what clients see from what is logged, and adds a regression test.',
  f: ['How do you handle errors thrown in a background service, where there is no HTTP response?', 'Should a 404 be logged as an error?']
}));

practice.push(P({
  t: 'A report endpoint times out after a few minutes', l: 'Medium', tags: ['background work', 'async request-reply'],
  s: 'A booking system has <code>POST /reports/yearly</code>, which takes 4 to 6 minutes to build a PDF. Users get a gateway timeout, and when they retry, two reports are generated. Redesign it.',
  ex: '<p>Today: <span class="c-r">one HTTP request held open for minutes</span>. Goal: <span class="c-g">202 Accepted + job ID</span> → client polls <code>GET /reports/jobs/{id}</code> → <span class="c-b">download link when done</span>.</p>',
  weak: 'Increase the timeout on the gateway and on Kestrel to ten minutes.',
  why: 'Long open requests are fragile (deployments, mobile networks, proxies), tie up resources, give the user no progress, and retries still create duplicates.',
  q: ['Which status code tells the client "I took your request, the work is not done yet"?', ['200 OK', '201 Created', '202 Accepted', '204 No Content'], 2, '202 Accepted means the request was accepted for processing. The response points to where the status can be checked.'],
  h: ['The work takes minutes but the HTTP request does not have to. What could the API return immediately?', 'If the API instance restarts in minute 3, what happens to the job? Where must the job and its state live?', 'Create a job record, put a message on a durable queue, return 202 with a status URL, process in a worker, store the PDF in blob storage, and use an idempotency key so a retry returns the same job.'],
  a: `<p><b>Model answer.</b> "I would switch to the asynchronous request-reply pattern."</p>
    <ol>
      <li><code>POST /reports/yearly</code> validates the input, writes a <b>job row</b> (status Queued), puts a message on a <b>durable queue</b>, and returns <b>202 Accepted</b> with a <code>Location</code> header pointing to <code>/reports/jobs/{id}</code>.</li>
      <li>A <b>worker</b> (a worker service or a queue-triggered function) builds the PDF, saves it to blob storage, and updates the job to Succeeded or Failed.</li>
      <li>The client <b>polls</b> the status URL (with a <code>Retry-After</code> hint), or gets a push notification, and then downloads through a short-lived link.</li>
      <li><b>Duplicates:</b> the client sends an idempotency key, or I derive one from user + report + year. A second POST with the same key returns the existing job.</li>
      <li><b>Failure:</b> the queue redelivers if the worker crashes, so the job is written to be safe to run twice. After a few failed attempts the message goes to a dead-letter queue and the job is marked Failed.</li>
      <li><b>Housekeeping:</b> finished jobs and files are deleted after a retention period.</li>
    </ol>
    <p>"I would not run this in a <code>BackgroundService</code> inside the API with an in-memory queue, because a deployment would lose the job."</p>`,
  cx: 'decouples the long work from the HTTP request, makes the job durable and idempotent, and covers failure and clean-up.',
  f: ['Polling vs webhooks vs SignalR for telling the client?', 'How do you show progress, such as 40% done?']
}));

practice.push(P({
  t: 'Intermittent "A second operation was started on this context"', l: 'Medium', tags: ['EF Core', 'lifetimes', 'async'],
  s: 'An order API sometimes throws <code>InvalidOperationException: A second operation was started on this context instance before a previous operation completed</code>. It appeared after a developer "made the dashboard faster". What do you look for?',
  ex: '<p>The change: <code>await Task.WhenAll(db.Orders.CountAsync(), db.Customers.CountAsync(), db.Products.CountAsync());</code> <span class="c-r">Three queries at once on one DbContext.</span></p>',
  weak: 'It is a random EF Core bug. I would wrap the call in a retry so it succeeds the second time.',
  why: 'The message states the cause exactly. A retry hides a real concurrency bug that can also corrupt the change tracker.',
  q: ['What does this exception tell you about DbContext?', ['It is slow', 'One instance cannot run two operations at the same time; it is not thread-safe', 'It needs a bigger connection pool', 'It must be registered as a singleton'], 1, 'A DbContext supports one operation at a time. Parallel use of one instance is a bug, whether from threads or from un-awaited tasks.'],
  h: ['There are three usual causes: tasks started in parallel on one context, a forgotten await, or a context shared between requests.', 'Search the recent change for Task.WhenAll, Parallel.ForEach, or a call without await.', 'Either await the queries one after another, or give each parallel query its own context from IDbContextFactory. Also check that no singleton is holding the context.'],
  a: `<p><b>Model answer.</b> "The message is precise: one <code>DbContext</code> was asked to do two things at once. I check three causes, in order of likelihood given the recent change."</p>
    <ol>
      <li><b>Parallel queries on one context:</b> <code>Task.WhenAll</code> over several <code>db.X.CountAsync()</code> calls. This is what "made it faster" usually means.</li>
      <li><b>A missing <code>await</code>:</b> a query task started and not awaited before the next one begins. I turn the compiler warning for un-awaited tasks into an error.</li>
      <li><b>A shared context:</b> the context captured by a singleton or stored in a static field, so two requests use it together.</li>
    </ol>
    <p>"Fix for the dashboard: if the queries really must run in parallel, inject <code>IDbContextFactory&lt;ShopDb&gt;</code> and create one context per query. Often the better fix is one SQL round trip that returns all three numbers, or caching the dashboard for 30 seconds. Parallel queries also take three connections from the pool, so I would measure before keeping them."</p>`,
  cx: 'reads the exception literally, connects it to the recent change, and offers both a correct parallel version and a simpler alternative.',
  f: ['Why is a missing await especially dangerous with a scoped DbContext?', 'When is running queries in parallel actually worth it?']
}));

practice.push(P({
  t: 'Plan the migration of a large .NET Framework application', l: 'Hard', tags: ['migration', 'strangler fig', 'planning'],
  s: 'You inherit a payroll application: 400,000 lines, .NET Framework 4.8, ASP.NET Web Forms front end, 30 WCF services, almost no tests, hosted on Windows servers. Management wants it on modern .NET in the cloud. Present your approach.',
  ex: '<p>Blocking parts: <span class="c-r">Web Forms</span> (no version on modern .NET), <span class="c-r">WCF server</span>, <span class="c-y">System.Web</span> everywhere, <span class="c-y">no tests</span>.</p>',
  weak: 'We freeze features for a year and rewrite everything from scratch in .NET 10 with microservices.',
  why: 'A big-bang rewrite with no tests has no way to prove it matches the old behaviour, delivers nothing for a year, and payroll rules hidden in old code get lost.',
  q: ['Which part of this system has no direct upgrade path and must be rewritten?', ['The class libraries', 'The Web Forms user interface', 'The SQL database', 'The logging'], 1, 'Web Forms does not exist on modern .NET. Libraries can be retargeted and WCF has options (CoreWCF, gRPC, REST), but the pages must be rebuilt.'],
  h: ['With almost no tests, what is the first thing you need before changing payroll calculations?', 'Which layers can move with little rewriting (libraries), and which cannot (Web Forms, WCF hosting)? Order the work by that.', 'Use the strangler fig pattern: a reverse proxy in front, new ASP.NET Core app beside the old one, move one vertical slice at a time, compare outputs old against new, and keep a rollback.'],
  a: `<p><b>Model answer.</b> "I would treat it as a multi-quarter programme with value delivered every few weeks, not one rewrite."</p>
    <ol>
      <li><b>Assess (2 to 3 weeks).</b> Inventory projects, packages and Windows-only APIs. Run the upgrade analysis tooling. Rank modules by business value and by difficulty.</li>
      <li><b>Safety net.</b> Characterisation tests around payroll calculations: feed last year's real inputs (anonymised) through the old code and record the outputs as the expected results.</li>
      <li><b>Libraries first.</b> Convert to SDK-style projects and multi-target <code>net48</code> and <code>net10.0</code>, so the same business logic runs in both worlds during the transition.</li>
      <li><b>Strangler fig.</b> A new ASP.NET Core app and a YARP reverse proxy in front. Migrated routes go to the new app, the rest to the old one. Users see one site.</li>
      <li><b>Services.</b> Internal WCF services become REST or gRPC. Where an external partner depends on a SOAP contract, host it with CoreWCF.</li>
      <li><b>User interface.</b> Web Forms pages are rebuilt screen by screen, in the front-end stack the team knows, starting with the most used screens.</li>
      <li><b>Parallel run.</b> For each payroll slice, run old and new side by side for one or two pay cycles and compare to the cent before switching.</li>
      <li><b>Cloud last, or alongside.</b> The old app can be moved to cloud virtual machines as it is, to leave the data centre early, while the new parts go to containers or app services.</li>
    </ol>
    <p>"Risks I would raise: hidden business rules in page code-behind, shared session state between old and new, and migration fatigue. So every quarter ends with something retired."</p>`,
  cx: 'refuses the big-bang rewrite, builds a test safety net first, sequences by what can be retargeted versus rewritten, and proves equality with a parallel run.',
  f: ['How do old and new apps share authentication during the transition?', 'When would you choose a rewrite after all?', 'How do you report progress to management?']
}));

practice.push(P({
  t: 'p99 latency spikes every few minutes', l: 'Hard', tags: ['garbage collector', 'LOH', 'performance'],
  s: 'A search API has a median response time of 20 ms, but every few minutes the 99th percentile jumps to 900 ms for a second or two. CPU averages 30%. The spikes line up with Gen 2 collections. Each request builds a result with <code>new byte[200_000]</code> and a large JSON string. Diagnose and fix.',
  ex: '<p>Counters: Gen 0 collections 40 per second, <span class="c-r">Gen 2 collections every 2 to 3 minutes</span>, LOH size sawing between 200 MB and 1.5 GB.</p>',
  weak: 'The server needs more CPU. I would scale up, and switch off the garbage collector during business hours.',
  why: 'CPU is not the limit, the GC cannot be switched off, and the answer ignores the evidence: big allocations and Gen 2 timing.',
  q: ['Where does a 200,000-byte array get allocated?', ['Gen 0', 'On the stack', 'On the Large Object Heap, which is collected only with Gen 2', 'In Gen 1'], 2, 'Objects of 85,000 bytes or more go to the LOH. Filling it triggers Gen 2 collections, the expensive kind.'],
  h: ['What is special about objects of 85,000 bytes or more?', 'If every request allocates a big buffer, how could requests share buffers instead?', 'Rent buffers from ArrayPool, stream the JSON to the response instead of building one big string, check Server GC and container memory settings, then re-measure p99 and Gen 2 count.'],
  a: `<p><b>Model answer.</b> "The evidence points at the Large Object Heap. A 200,000-byte array and a big string are both over 85,000 bytes, so every request allocates on the LOH. The LOH is only cleaned by a Gen 2 collection, so we fill it quickly, trigger a full collection, and requests in flight wait. That is the periodic spike."</p>
    <ol>
      <li><b>Confirm:</b> <code>dotnet-counters</code> for Gen 2 count, LOH size and time in GC; a trace to see which call sites allocate the large objects.</li>
      <li><b>Remove the big allocations:</b> rent the buffer from <code>ArrayPool&lt;byte&gt;.Shared</code> and return it in a <code>finally</code>; write JSON straight to the response stream with <code>System.Text.Json</code> instead of building a string; page the results so no response is that large.</li>
      <li><b>Check GC settings:</b> Server GC with background collection is right for this API. In a container, make sure the memory limit is realistic, since a tight limit forces more frequent full collections.</li>
      <li><b>Measure again:</b> same load test, compare p99, Gen 2 collections per hour and allocation rate. I expect Gen 2 collections to become rare.</li>
    </ol>
    <p>"I would not call <code>GC.Collect()</code> or tune obscure GC switches before removing the allocations, because the allocations are the cause."</p>`,
  cx: 'links tail latency to Gen 2 collections caused by LOH allocations, removes the allocations with pooling and streaming, and verifies with the same measurement.',
  f: ['What goes wrong if a rented array is returned twice or used after return?', 'How would the picture differ if the spikes lined up with deployments?']
}));

practice.push(P({
  t: 'Requests hang under load while CPU stays at 10%', l: 'Hard', tags: ['thread pool', 'async', 'diagnostics'],
  s: 'After a marketing email, an API becomes unresponsive: requests take 30 seconds or time out, yet CPU is at 10% and the database is healthy. Restarting helps for a few minutes. The code base has a helper <code>RunSync(Func&lt;Task&gt;)</code> used "to call async code from old synchronous services". What is happening?',
  ex: '<p><code>dotnet-counters</code>: ThreadPool Queue Length <span class="c-r">4,000 and rising</span>, ThreadPool Thread Count climbing by about 1 per second, CPU 10%.</p>',
  weak: 'The server is too small. I would add more instances and increase the request timeout.',
  why: 'More instances delay the problem and cost money. Low CPU with a long queue means threads are blocked, not busy.',
  q: ['Low CPU, long thread pool queue, thread count rising slowly. What is the most likely cause?', ['A CPU-heavy loop', 'Thread pool starvation from blocking on async work', 'A memory leak', 'Too many Gen 0 collections'], 1, 'Blocked threads use no CPU. The pool adds new threads slowly, so the queue grows faster than threads become available.'],
  h: ['If the CPU is idle, what are the threads doing? Waiting. On what?', 'What does a helper that turns async into sync do to the thread that calls it?', 'Capture stacks (dotnet-stack or a dump) to find where threads are parked, make that call path async end to end, and add an analyzer that bans .Result, .Wait and the helper.'],
  a: `<p><b>Model answer.</b> "This is thread pool starvation. <code>RunSync</code> blocks a pool thread until the async work finishes, and the async work itself needs a pool thread to complete. Under a burst, all threads end up blocked waiting for work that has no thread to run on. The pool adds threads only about one per second, so the queue explodes while the CPU idles."</p>
    <ol>
      <li><b>Prove it:</b> <code>dotnet-counters</code> shows queue length and thread count rising with low CPU. <code>dotnet-stack report</code> or a dump shows hundreds of threads parked in <code>RunSync</code> → <code>Task.Wait</code>.</li>
      <li><b>Stop the bleeding:</b> raising the minimum thread count buys time during the incident. I say clearly that this is a bandage.</li>
      <li><b>Fix:</b> make the hot path async from controller to database: <code>async Task</code> actions, <code>await</code> all the way, async EF Core and <code>HttpClient</code> calls, cancellation tokens passed down. Start with the endpoints the email links to.</li>
      <li><b>Prevent:</b> an analyzer rule that fails the build on <code>.Result</code>, <code>.Wait()</code> and <code>RunSync</code>; a load test in the pipeline that ramps concurrency; an alert on thread pool queue length.</li>
    </ol>
    <p>"<code>Task.Run</code> around the blocking call is not a fix. It only moves the blocking to another pool thread."</p>`,
  cx: 'recognises starvation from the counters, proves it with stacks, separates the emergency bandage from the real fix, and adds a guard.',
  f: ['Why did this only appear under a traffic burst?', 'How do you migrate a large synchronous code base to async gradually?']
}));

practice.push(P({
  t: 'A short database outage restarts every instance', l: 'Hard', tags: ['health checks', 'Kubernetes', 'resilience'],
  s: 'Your API runs 12 instances on Kubernetes. The database had a 40-second failover. All 12 instances were killed and restarted together, the restart took 3 minutes, and customers saw a 4-minute outage for a 40-second fault. The single <code>/health</code> endpoint checks the database and is used for both probes. Fix the design.',
  ex: '<p>Database down 40 s → <code>/health</code> fails → <span class="c-r">liveness probe fails → every instance killed</span> → cold start × 12 → all reconnect at once.</p>',
  weak: 'Increase the probe timeout and failure threshold so the instances survive a 40-second failover.',
  why: 'It tunes numbers around a wrong design. A longer database fault would still kill everything, and a truly stuck process would now take longer to be restarted.',
  q: ['What should a failed readiness probe cause?', ['The instance is restarted', 'The instance is taken out of the load balancer until it passes again', 'The whole deployment is rolled back', 'Nothing at all'], 1, 'Readiness controls traffic. Liveness controls restarts. Restarting an app does not fix a database that is down.'],
  h: ['Would restarting the API fix the database? Then which probe should the database check belong to?', 'Liveness answers one question only: is this process stuck beyond repair?', 'Split into /health/live (no dependencies) and /health/ready (database, with a short timeout), add a startup probe, add retries with backoff and jitter on reconnect, and handle SIGTERM gracefully.'],
  a: `<p><b>Model answer.</b> "The liveness probe depended on the database, so the platform 'fixed' a database problem by killing healthy processes. I would separate the probes."</p>
    <ol>
      <li><b>Liveness</b> (<code>/health/live</code>): no dependencies, just "the process responds". It fails only if the app is deadlocked or broken.</li>
      <li><b>Readiness</b> (<code>/health/ready</code>): checks the database with a short timeout. On failure the instance is removed from the load balancer but keeps running, and returns when the database is back.</li>
      <li><b>Startup probe:</b> gives a slow-starting instance time before liveness begins, so warm-up is not mistaken for a hang.</li>
      <li><b>In the app:</b> EF Core connection resiliency (retry on transient failures), a circuit breaker so requests fail fast with 503 and <code>Retry-After</code> during the failover, and backoff with jitter so 12 instances do not reconnect in the same instant.</li>
      <li><b>Degrade where possible:</b> serve cached reads while the database is away.</li>
      <li><b>Shutdown:</b> handle SIGTERM, stop accepting requests, finish the running ones within the shutdown timeout.</li>
    </ol>
    <p>"Then I would rehearse it: trigger a failover in a test environment and confirm no instance restarts and recovery takes about as long as the fault."</p>`,
  cx: 'separates liveness from readiness, explains the restart storm, adds application-level resilience, and tests the failure on purpose.',
  f: ['Should readiness check every downstream service?', 'What is a startup probe for?', 'How do you avoid a reconnect stampede after the database returns?']
}));

// ====================== QUIZ ======================
quiz.push({ q: 'Which statement about .NET versions is correct in late 2026?', options: ['.NET 8 is the current LTS release', '.NET 10 is the current LTS release, supported until November 2028', '.NET 9 is an LTS release', '.NET Framework 4.8 gets new features every November'], answer: 1, explain: '.NET 10 shipped in November 2025 as LTS with three years of support. .NET 8 and .NET 9 both ended support on 10 November 2026.' });
quiz.push({ q: 'What is inside a compiled .NET assembly (.dll)?', options: ['Machine code for one specific CPU', 'C# source code', 'IL plus metadata and a manifest', 'Only a list of NuGet packages'], answer: 2, explain: 'The compiler emits CPU-neutral IL with metadata. The JIT turns it into machine code at run time (unless you use Native AOT).' });
quiz.push({ q: 'A class registered with AddScoped is resolved twice during one HTTP request and once in the next request. How many instances are created?', options: ['1', '2', '3', 'It depends on the thread'], answer: 1, explain: 'Scoped means one instance per scope, and each request is a scope. The two resolves in the first request share one object; the next request gets a new one.' });
quiz.push({ q: 'A singleton service takes a scoped DbContext in its constructor. What is this called?', options: ['A keyed service', 'A captive dependency', 'A circular dependency', 'A transient fault'], answer: 1, explain: 'The longer-lived singleton captures the shorter-lived scoped object and keeps it alive for the whole app, shared by all requests.' });
quiz.push({ q: 'Which order is correct?', options: ['UseAuthorization → UseAuthentication → UseRouting', 'UseRouting → UseAuthentication → UseAuthorization', 'UseAuthentication → UseRouting → UseCors → UseAuthorization', 'MapControllers → UseRouting → UseAuthorization'], answer: 1, explain: 'Routing selects the endpoint, authentication builds the user, and authorization checks that user against the endpoint rules.' });
quiz.push({ q: 'Which options interface should a singleton background service use to see configuration changes while the app runs?', options: ['IOptions&lt;T&gt;', 'IOptionsSnapshot&lt;T&gt;', 'IOptionsMonitor&lt;T&gt;', 'IConfigurationRoot only'], answer: 2, explain: 'IOptionsSnapshot is scoped and cannot be injected into a singleton. IOptions never updates. IOptionsMonitor is a singleton that always returns the current value.' });
quiz.push({ q: 'Why is <code>new HttpClient()</code> inside every method call a problem?', options: ['HttpClient is slow to construct', 'It can exhaust sockets, because each instance opens new connections that linger after dispose', 'It disables HTTPS', 'It ignores cancellation tokens'], answer: 1, explain: 'Connections are not reused and closed ones stay reserved by the operating system for a while. IHttpClientFactory pools the handlers.' });
quiz.push({ q: 'You need to add caching to a repository without changing the repository class or its callers. Which pattern fits?', options: ['Singleton', 'Decorator', 'Observer', 'Template Method'], answer: 1, explain: 'A decorator implements the same interface, wraps the original and adds behaviour around the call.' });
quiz.push({ q: 'Where is an array of 100,000 bytes allocated, and when is it collected?', options: ['Gen 0, on the next Gen 0 collection', 'On the stack, when the method returns', 'On the Large Object Heap, during a Gen 2 collection', 'Gen 1, every second'], answer: 2, explain: 'Objects of 85,000 bytes or more go to the Large Object Heap, which is collected together with Gen 2.' });
quiz.push({ q: 'What is the main trade-off of Native AOT?', options: ['Slower startup in exchange for better peak speed', 'Fast startup and low memory, but limits on reflection and dynamic loading', 'It only works on Windows', 'It needs the .NET runtime installed on the server'], answer: 1, explain: 'Everything is compiled ahead of time into one native file with no JIT, so features that create or discover code at run time are restricted.' });
quiz.push({ q: 'What should a Kubernetes liveness endpoint check?', options: ['The database, the cache and every downstream API', 'Only that the process itself can respond', 'That the latest deployment succeeded', 'That CPU is below 50%'], answer: 1, explain: 'A failed liveness probe restarts the instance. Restarting does not repair a dependency, so dependency checks belong in the readiness probe.' });
quiz.push({ q: '<code>var q = db.Orders.Where(o =&gt; o.Total &gt; 100);</code> followed by <code>q.Count()</code> and then <code>foreach (var o in q)</code>. How many SQL queries run?', options: ['0', '1', '2', '3'], answer: 2, explain: 'LINQ is deferred. The Where line runs nothing. Count executes one query and the foreach executes another.' });

// ====================== MODULE ======================
registerModule({
  id: 'tl03',
  title: '.NET & ASP.NET Core Questions',
  intro: `<p>This module is the <b>.NET and ASP.NET Core question bank</b> for a full-stack tech lead interview. It covers the questions that come up again and again: the history and versions of .NET, how an ASP.NET Core app handles a request, dependency injection, configuration, design patterns, how the runtime works underneath (CLR, JIT, garbage collector), and what each recent version added.</p>
    <p><b>How to use it:</b> go to the interview section, read a question, <i>say your answer out loud</i>, then open the model answer. Every answer starts with one plain sentence a beginner can follow, then goes deeper, and ends with a short line you can say in the interview. The lessons before it explain the ideas with pictures and step-by-step walk-throughs, so nothing in the answers is new to you.</p>
    <p>Facts are current for 2026: <b>.NET 10</b> is the long-term support release, with C# 14.</p>`,
  goals: [
    'Tell the .NET story in one minute: .NET Framework, .NET Core, unified .NET, and what LTS and STS mean today',
    'Walk an interviewer through <code>Program.cs</code>: services, middleware order, endpoints, and what breaks when the order is wrong',
    'Choose the right DI lifetime and explain a captive dependency and how to fix it',
    'Explain four to six design patterns as stories: the pain, the pattern, the trade-off',
    'Describe what the CLR, JIT and garbage collector do, and use that to diagnose slow starts, latency spikes and memory growth',
    'Name two or three features for each recent C# and .NET version and say why you would adopt them'
  ],
  prereqs: `<p>You should be able to read C# classes, interfaces and <code>async</code>/<code>await</code>. The C# questions module of this track comes first. No ASP.NET Core experience is assumed: each topic starts from the plain idea.</p>`,
  hours: 12,
  langExplain: `<p>The code in this module is C#, because the interview is for a .NET role. Most samples use ASP.NET Core types, so they are shown for reading and are not compiled in the browser.</p>`,
  topics: topics, practice: practice, quiz: quiz, interview: interview
}); })();
