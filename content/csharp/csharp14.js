(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ---------------- shared helpers ---------------- */
  function C(s) { return '<code>' + H.esc(s) + '</code>'; }
  function P(s) { return '<pre><code>' + H.esc(String(s).replace(/^\n+/, '').replace(/\s+$/, '')) + '</code></pre>'; }
  // ASP.NET Core snippets need the Microsoft.AspNetCore.App framework, which the sandbox compiler does not reference.
  function web(code, title) { var s = { lang: 'csharp', check: false, code: code }; if (title) s.title = title; return s; }
  function hlOf(ids, cls) { var o = {}; (ids || []).forEach(function (i) { o[i] = cls || 'cur'; }); return o; }
  function note(label, html) { return { type: 'text', label: label, html: html }; }
  /* flowViz: nodes [{id,label,x,y,shape:'box'}], edges [[u,v,label]], steps [{n: narr, hl:[ids], cls, ok:[ids], bad:[ids], e:['u-v'], extra:[parts]}] */
  function flowViz(title, nodes, edges, steps, height) {
    return {
      title: title,
      gen: function () {
        return steps.map(function (s) {
          var hl = hlOf(s.hl, s.cls);
          (s.ok || []).forEach(function (i) { hl[i] = 'ok'; });
          (s.bad || []).forEach(function (i) { hl[i] = 'bad'; });
          var parts = [{ type: 'graph', label: 'Request flow', directed: true, height: height || 60, nodes: nodes, edges: edges, hl: hl, ehl: hlOf(s.e, 'cur') }];
          (s.extra || []).forEach(function (p) { parts.push(p); });
          return { narr: s.n, parts: parts };
        });
      }
    };
  }
  function bx(id, label, x, y, w) { return { id: id, label: label, x: x, y: y, shape: 'box', w: w || 16 }; }

  /* ======================================================================
     TOPIC 1 — The request pipeline and middleware
     ====================================================================== */
  var T1_NODES = [bx('c', 'Client', 6, 30, 10), bx('ex', 'ExceptionHandler', 24, 10), bx('https', 'HttpsRedirection', 24, 50), bx('rt', 'Routing', 46, 10), bx('au', 'Authentication', 46, 50), bx('az', 'Authorization', 68, 10), bx('ep', 'Endpoint', 88, 30, 12)];
  var T1_EDGES = [['c', 'ex'], ['ex', 'https'], ['https', 'rt'], ['rt', 'au'], ['au', 'az'], ['az', 'ep']];
  function logPart(lines) { return { type: 'stack', label: 'Response log (oldest at bottom)', items: lines.slice() }; }
  topics.push({
    title: 'The Request Pipeline and Middleware',
    analogy: `<p>Think of an airport. Every passenger walks the <b>same corridor</b>: check-in, security, passport control, gate. Each desk can look at you, do its job and wave you on — or stop you right there ("no boarding pass, go back"). On the way back from a flight you pass the desks again in <b>reverse order</b>. ASP.NET Core's request pipeline is that corridor: each <b>middleware</b> sees the request on the way in, may stop it (<b>short-circuit</b>), and sees the response on the way out.</p>`,
    explain: `<p>An ASP.NET Core app is a chain of functions. Each one has the shape ${C('Task Invoke(HttpContext context)')}, called a ${C('RequestDelegate')}. A <b>middleware</b> is a function that receives the <b>next</b> delegate and returns a new delegate that wraps it.</p>
<h4>1. Building the pipeline</h4>
${P(`
var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

app.UseExceptionHandler();        // 1st in, last out: catches everything below it
app.UseHttpsRedirection();
app.UseRouting();                 // picks the endpoint (optional: WebApplication adds it for you)
app.UseAuthentication();          // who are you? sets HttpContext.User
app.UseAuthorization();           // are you allowed? reads endpoint metadata
app.Use(async (ctx, next) =>      // inline middleware
{
    var sw = Stopwatch.StartNew();
    await next(ctx);              // run the rest of the pipeline
    app.Logger.LogInformation("{Path} took {Ms} ms", ctx.Request.Path, sw.ElapsedMilliseconds);
});
app.MapGet("/hello", () => "Hello");   // terminal endpoint
app.Run();`)}
<h4>2. Three ways to add middleware</h4>
${H.table(['API', 'Calls next?', 'Typical use'], [
  [C('app.Use((ctx, next) => ...)'), 'when it wants to', 'logging, headers, timing'],
  [C('app.Run(ctx => ...)'), 'never (terminal)', 'catch-all fallback'],
  [C('app.Map("/admin", branch => ...)'), 'branches the pipeline by path', 'separate sub-app'],
  [C('app.UseMiddleware<T>()'), 'class with ' + C('InvokeAsync(HttpContext)'), 'reusable middleware with DI']
])}
<h4>3. Order is everything</h4>
<p>Middleware runs <b>in the order you register it</b> on the way in and in reverse on the way out. Classic bugs: ${C('UseAuthorization')} before ${C('UseAuthentication')} (user is always anonymous), ${C('UseCors')} after the endpoint ran, an exception handler registered <b>after</b> the code that throws (it can only catch what is below it).</p>
<h4>4. Short-circuiting</h4>
<p>A middleware that does not call ${C('next')} ends the request: static files, health checks, a 401 from auth, a 429 from a rate limiter. Writing to the response after ${C('next')} has started sending it throws — check ${C('ctx.Response.HasStarted')}.</p>`,
    clues: ['"what happens between Kestrel receiving a request and my controller running?"', '"why is User always anonymous?" → UseAuthentication/UseAuthorization order', '"add a correlation id / timing header to every request" → custom middleware', '"return 503 before the app does any work" → short-circuit middleware', '"difference between Use, Run and Map"'],
    code: web(`
// A reusable convention-based middleware class. Constructor gets singletons; InvokeAsync gets per-request services.
public sealed class CorrelationIdMiddleware(RequestDelegate next, ILogger<CorrelationIdMiddleware> log)
{
    public async Task InvokeAsync(HttpContext ctx)
    {
        var id = ctx.Request.Headers.TryGetValue("X-Correlation-Id", out var v) ? v.ToString() : Guid.NewGuid().ToString("n");
        ctx.Response.OnStarting(() => { ctx.Response.Headers["X-Correlation-Id"] = id; return Task.CompletedTask; });
        using (log.BeginScope(new Dictionary<string, object> { ["CorrelationId"] = id }))
            await next(ctx);   // the rest of the pipeline runs inside the logging scope
    }
}
// Program.cs
app.UseMiddleware<CorrelationIdMiddleware>();`),
    codeTitle: 'A middleware class (ASP.NET Core, not compiled here)',
    viz: flowViz('A request walking the pipeline', T1_NODES, T1_EDGES, [
      { n: 'The client sends <b>GET /orders/7</b>. Kestrel turns it into an <code>HttpContext</code> and calls the first middleware.', hl: ['c'], extra: [logPart([])] },
      { n: '<b>ExceptionHandler</b> wraps everything after it in a try/catch, then calls <code>next</code>.', hl: ['ex'], e: ['c-ex'], extra: [logPart(['ExceptionHandler in'])] },
      { n: '<b>HttpsRedirection</b>: the request is already HTTPS, so it just calls <code>next</code>. (For http:// it would short-circuit with a 307.)', hl: ['https'], e: ['ex-https'], extra: [logPart(['ExceptionHandler in', 'HttpsRedirection pass'])] },
      { n: '<b>Routing</b> matches the URL against the route table and stores the chosen endpoint (and its metadata like <code>[Authorize]</code>) on the context.', hl: ['rt'], e: ['https-rt'], extra: [logPart(['ExceptionHandler in', 'HttpsRedirection pass', 'Routing: /orders/{id:int}'])] },
      { n: '<b>Authentication</b> reads the bearer token and sets <code>HttpContext.User</code>. It never rejects on its own.', hl: ['au'], e: ['rt-au'], extra: [logPart(['ExceptionHandler in', 'HttpsRedirection pass', 'Routing: /orders/{id:int}', 'User = alice'])] },
      { n: '<b>Authorization</b> reads the endpoint metadata. Policy satisfied → call <code>next</code>. Otherwise it would short-circuit with 401/403 and the endpoint would never run.', hl: ['az'], ok: ['au'], e: ['au-az'], extra: [logPart(['ExceptionHandler in', 'HttpsRedirection pass', 'Routing: /orders/{id:int}', 'User = alice', 'Authorized'])] },
      { n: 'The <b>endpoint</b> (your handler) runs and writes a 200 response.', hl: ['ep'], cls: 'ok', e: ['az-ep'], extra: [logPart(['ExceptionHandler in', 'HttpsRedirection pass', 'Routing: /orders/{id:int}', 'User = alice', 'Authorized', 'Endpoint 200'])] },
      { n: 'Unwinding: each <code>await next(ctx)</code> returns in <b>reverse order</b>. Code after <code>next</code> (timing, logging) runs now; the response is on its way.', ok: ['ep', 'az', 'au', 'rt', 'https', 'ex'], hl: ['c'], extra: [logPart(['ExceptionHandler in', 'HttpsRedirection pass', 'Routing: /orders/{id:int}', 'User = alice', 'Authorized', 'Endpoint 200', 'ExceptionHandler out'])] }
    ]),
    examples: [
      { title: 'Branching with Map and MapWhen', html: `<p>${C('app.Map("/health", b => b.Run(...))')} gives /health its own tiny pipeline — the main middleware after the branch never sees those requests. ${C('MapWhen(ctx => ctx.Request.Query.ContainsKey("debug"), ...)')} branches on any condition. ${C('UseWhen')} rejoins the main pipeline afterwards.</p>`, code: web(`
app.Map("/health", health => health.Run(ctx => ctx.Response.WriteAsync("ok")));
app.UseWhen(ctx => ctx.Request.Path.StartsWithSegments("/api"),
    api => api.UseMiddleware<ApiKeyMiddleware>());   // only /api requests pass through it`) },
      { title: 'The same idea in plain C#', html: `<p>A pipeline is just function composition. Build it from the last component backwards, exactly like ${C('ApplicationBuilder.Build()')} does.</p>`, code: `
using System;
using System.Collections.Generic;

class Program
{
    static void Main()
    {
        var log = new List<string>();
        Action endpoint = () => log.Add("endpoint");
        var components = new List<Func<Action, Action>>
        {
            next => () => { log.Add("A in"); next(); log.Add("A out"); },
            next => () => { log.Add("B in"); next(); log.Add("B out"); }
        };
        Action app = endpoint;
        for (int i = components.Count - 1; i >= 0; i--) app = components[i](app); // wrap from the end
        app();
        Console.WriteLine(string.Join(" | ", log)); // A in | B in | endpoint | B out | A out
    }
}` },
      { title: 'Writing after the response started', html: `<p>Once the endpoint has flushed headers, ${C('ctx.Response.Headers["X"] = ...')} after ${C('await next(ctx)')} throws ${C('InvalidOperationException: Headers are read-only')}. Use ${C('ctx.Response.OnStarting(...)')} to add headers at the last safe moment.</p>` }
    ],
    deepDive: `<p><b>How Build() works.</b> ${C('ApplicationBuilder')} keeps a ${C('List<Func<RequestDelegate, RequestDelegate>>')}. ${C('Build()')} starts with a terminal delegate that returns 404, then walks the list <b>backwards</b>, wrapping each component around the previous result. The final delegate is what Kestrel calls for every request — the composition happens once, at start-up.</p>
<p><b>Convention vs factory middleware.</b> A convention class (constructor + ${C('InvokeAsync')}) is created <b>once</b> — it is effectively a singleton, so injecting a scoped service in its constructor is a captive-dependency bug; take scoped services as extra ${C('InvokeAsync')} parameters instead. ${C('IMiddleware')} implementations are resolved from DI <b>per request</b> and must be registered.</p>
<p><b>WebApplication magic.</b> With minimal hosting, ${C('UseRouting')} is added automatically at the start and ${C('UseEndpoints')} at the end if you do not call them; call ${C('UseRouting')} explicitly when middleware before it must not see endpoint data, or after it must. ${C('UseExceptionHandler')} should be first so it can catch failures in everything else. The recommended order: ExceptionHandler → HSTS → HttpsRedirection → StaticFiles → Routing → CORS → RateLimiter (if per-endpoint) → Authentication → Authorization → custom → endpoints.</p>
<p><b>Performance.</b> Each middleware is one async call per request. Avoid buffering bodies, avoid sync I/O (Kestrel disallows it by default), and short-circuit early for cheap rejections.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants scaffold a ${C('Program.cs')} with a dozen ${C('Use...')} calls in seconds. <b>Where AI goes wrong:</b> it often places ${C('UseAuthorization')} before ${C('UseAuthentication')} or ${C('UseCors')} after ${C('MapControllers')}, injects ${C('DbContext')} into a middleware constructor, or modifies headers after ${C('next')}. <b>How to work with it:</b> ask it to list the middleware in order and say for each one what it short-circuits and what it needs from earlier middleware, then check that list against the documented order. <b>What you still own:</b> the order, and knowing which middleware may end a request.</p>`,
    problems: [{
      title: 'Build a Middleware Pipeline',
      level: 'Easy', tags: ['middleware', 'delegates', 'composition'], companies: ['Microsoft', 'Infosys', 'Accenture'],
      statement: `<p>Model ASP.NET Core's pipeline in plain C#. ${C('Run(string[] mws, string path)')} builds a pipeline from the specs in order and runs one request; it returns the log lines.</p>
<ul><li>${C('"Name"')} — a normal middleware: logs ${C('"Name in"')}, calls next, logs ${C('"Name out"')}.</li>
<li>${C('"Name|/prefix"')} — a guard: if the path starts with the prefix (case-insensitive) it logs ${C('"Name stop"')} and does <b>not</b> call next; otherwise it logs ${C('"Name pass"')} and calls next.</li>
<li>The terminal endpoint logs ${C('"endpoint " + path')}.</li></ul>`,
      constraints: `0 ≤ middleware count ≤ 20. Paths start with "/".`,
      example: `<p>${C('Run(["A", "Auth|/admin", "B"], "/admin/users")')} → ${H.c('g', '["A in", "Auth stop", "A out"]')}. Auth short-circuits, so B and the endpoint never run, but A still unwinds.</p>`,
      brute: { why: `<p>Hard-coding nested calls (${C('A(() => B(() => Endpoint()))')}) works for one fixed list only. The real builder composes any list by wrapping from the last component backwards.</p>`, code: `
using System.Collections.Generic;

static class FixedPipeline
{
    public static List<string> RunAB(string path)
    {
        var log = new List<string> { "A in", "B in", "endpoint " + path, "B out", "A out" };
        return log; // only correct for exactly ["A", "B"]
    }
}` },
      mcq: { q: 'In <code>Build()</code>, why are components wrapped from the last one to the first?', options: ['Each component needs the already-built "rest of the pipeline" as its next delegate', 'To run them in reverse order', 'Because List enumerates backwards faster', 'So that exceptions are caught'], answer: 0, explain: 'Component i receives next = the composition of components i+1..n plus the endpoint, so that composition must exist first.' },
      hints: [`<p>Hint 1: a middleware is ${C('Func<RequestDelegate, RequestDelegate>')}: given next, return a new delegate.</p>`, `<p>Hint 2: start with the endpoint delegate and wrap it with components from last to first.</p>`, `<p>Hint 3: the guard simply returns without calling next when ${C('path.StartsWith(prefix, StringComparison.OrdinalIgnoreCase)')}; the outer middleware still logs its "out" line.</p>`],
      tests: { sig: 'string[] string -> string[]', fn: 'run', cases: [
        [[['A', 'B'], '/x'], ['A in', 'B in', 'endpoint /x', 'B out', 'A out']],
        [[[], '/'], ['endpoint /']],
        [[['A', 'Auth|/admin', 'B'], '/admin/users'], ['A in', 'Auth stop', 'A out']],
        [[['A', 'Auth|/admin', 'B'], '/home'], ['A in', 'Auth pass', 'B in', 'endpoint /home', 'B out', 'A out']],
        [[['Auth|/'], '/anything'], ['Auth stop']],
        [[['A'], '/a'], ['A in', 'endpoint /a', 'A out']],
        [[['A', 'A'], '/p'], ['A in', 'A in', 'endpoint /p', 'A out', 'A out']],
        [[['Gate|/ADMIN'], '/admin'], ['Gate stop']]
      ] },
      solution: {
        approach: `<p>Turn each spec into a ${C('Func<RequestDelegate, RequestDelegate>')}. Start from the endpoint delegate and wrap it with the components from last to first — exactly what ${C('ApplicationBuilder.Build()')} does. Then invoke the result once with a context.</p>`,
        code: `
public delegate void RequestDelegate(Ctx ctx);

public sealed class Ctx
{
    public string Path { get; init; } = "";
    public List<string> Log { get; } = new();
}

public class Solution
{
    public static string[] Run(string[] mws, string path)
    {
        var components = new List<Func<RequestDelegate, RequestDelegate>>();
        foreach (var spec in mws)
        {
            var parts = spec.Split('|');
            string name = parts[0];
            if (parts.Length == 1)
            {
                components.Add(next => ctx =>
                {
                    ctx.Log.Add(name + " in");
                    next(ctx);                       // the rest of the pipeline
                    ctx.Log.Add(name + " out");
                });
            }
            else
            {
                string prefix = parts[1];
                components.Add(next => ctx =>
                {
                    if (ctx.Path.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
                    {
                        ctx.Log.Add(name + " stop");   // short-circuit: next is never called
                        return;
                    }
                    ctx.Log.Add(name + " pass");
                    next(ctx);
                });
            }
        }

        RequestDelegate app = ctx => ctx.Log.Add("endpoint " + ctx.Path);
        for (int i = components.Count - 1; i >= 0; i--)
            app = components[i](app);                // wrap from the end, like Build()

        var context = new Ctx { Path = path };
        app(context);
        return context.Log.ToArray();
    }
}`,
        dry: { head: ['step', 'app after wrapping', 'log for "/admin/users"'], rows: [['start', 'endpoint', '—'], ['wrap B', 'B(endpoint)', '—'], ['wrap Auth', 'Auth(B(endpoint))', '—'], ['wrap A', 'A(Auth(B(endpoint)))', '—'], ['invoke', 'A in → Auth stop', 'A in, Auth stop'], ['unwind', 'A out', 'A in, Auth stop, A out']] },
        complexity: `<p>Building is O(m) for m middleware, done once. Each request costs O(m) delegate calls.</p>`,
        followUps: ['Make the delegates async (<code>Func&lt;Ctx, Task&gt;</code>) and await next.', 'Add a <code>Map(prefix, branch)</code> that sends matching paths to a separate sub-pipeline.']
      }
    }]
  });

  /* ======================================================================
     TOPIC 2 — Dependency injection and lifetimes
     ====================================================================== */
  topics.push({
    title: 'The Built-in DI Container and Service Lifetimes',
    analogy: `<p>Picture a hotel. The <b>lobby clock</b> is shared by every guest for years — that is a <b>singleton</b>. Each <b>room</b> gets its own towels for the length of one stay, shared by everyone in that room — that is <b>scoped</b> (one scope = one HTTP request). A <b>paper cup</b> is new every time anyone asks for one — that is <b>transient</b>. The trouble starts when the lobby clock is handed a room's towels to hold forever: they never get washed. That is a <b>captive dependency</b>.</p>`,
    explain: `<p>ASP.NET Core ships a dependency-injection (DI) container in ${C('Microsoft.Extensions.DependencyInjection')}. You <b>register</b> services on ${C('builder.Services')}; the framework <b>resolves</b> them through constructor parameters, endpoint parameters or ${C('[FromServices]')}.</p>
${P(`
builder.Services.AddSingleton<IClock, SystemClock>();          // one for the app's life
builder.Services.AddScoped<IOrderRepository, EfOrderRepository>(); // one per request
builder.Services.AddTransient<IEmailBuilder, EmailBuilder>();  // new every resolve
builder.Services.AddDbContext<ShopDb>(o => o.UseSqlServer(cs)); // scoped by default`)}
<h4>1. The three lifetimes</h4>
${H.table(['Lifetime', 'Instances', 'Disposed', 'Good for'], [
  ['Singleton', 'one per container (root)', 'when the app stops', 'stateless helpers, caches, HttpClient factories, options'],
  ['Scoped', 'one per scope — ASP.NET Core creates a scope per request', 'end of the request', 'DbContext, unit of work, per-request user context'],
  ['Transient', 'new on every resolve', 'with the scope that resolved it', 'lightweight stateless services']
])}
<h4>2. The captive dependency rule</h4>
<p>A service must not depend on something with a <b>shorter</b> lifetime. A singleton holding a scoped ${C('DbContext')} keeps the first request's context forever: stale data, thread-safety bugs (DbContext is not thread-safe), and it is never disposed. In Development, ${C('ValidateScopes')} is on and resolving a scoped service from the root provider or from a singleton throws ${C('InvalidOperationException: Cannot consume scoped service ... from singleton ...')}. ${C('ValidateOnBuild')} checks all registrations at start-up.</p>
<h4>3. Using scoped services from a singleton correctly</h4>
${P(`
public sealed class Cleanup(IServiceScopeFactory scopes) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        await using var scope = scopes.CreateAsyncScope();   // our own "request"
        var db = scope.ServiceProvider.GetRequiredService<ShopDb>();
        await db.Carts.Where(c => c.Expired).ExecuteDeleteAsync(ct);
    }
}`)}
<h4>4. Registration details worth knowing</h4>
<ul><li>Registering the same interface twice: ${C('GetService<T>')} returns the <b>last</b> one; ${C('IEnumerable<T>')} returns all, in order. ${C('TryAdd*')} adds only if missing.</li>
<li>Keyed services (.NET 8): ${C('AddKeyedSingleton<ICache, RedisCache>("redis")')} + ${C('[FromKeyedServices("redis")]')}.</li>
<li>The container disposes what it <b>created</b>; it does not dispose instances you passed in yourself (${C('AddSingleton(myObj)')}).</li></ul>`,
    clues: ['"singleton vs scoped vs transient" — the most-asked ASP.NET question', '"Cannot consume scoped service from singleton" → captive dependency', '"use DbContext in a BackgroundService / hosted service" → IServiceScopeFactory', '"two implementations of one interface" → last wins / IEnumerable / keyed services', '"why is my DbContext disposed / shared across threads?"'],
    code: web(`
var builder = WebApplication.CreateBuilder(args);
builder.Host.UseDefaultServiceProvider(o => { o.ValidateScopes = true; o.ValidateOnBuild = true; });
builder.Services.AddSingleton<IClock, SystemClock>();
builder.Services.AddScoped<ICurrentUser, HttpCurrentUser>();
builder.Services.AddTransient<InvoiceBuilder>();
var app = builder.Build();

// Endpoint parameters that are registered services are injected automatically (.NET 7+).
app.MapGet("/now", (IClock clock, ICurrentUser user) => $"{user.Name}: {clock.UtcNow:O}");`),
    codeTitle: 'Registering and consuming services (ASP.NET Core, not compiled here)',
    viz: {
      title: 'Which instance does each resolve get?',
      gen: function () {
        var reqs = [['1', 'Clock', 'Singleton'], ['1', 'Repo', 'Scoped'], ['1', 'Repo', 'Scoped'], ['1', 'Email', 'Transient'], ['1', 'Email', 'Transient'], ['2', 'Clock', 'Singleton'], ['2', 'Repo', 'Scoped']];
        var made = {}, single = {}, scoped = {}, out = [], frames = [];
        frames.push({ narr: 'Registrations: <b>Clock</b> singleton, <b>Repo</b> scoped, <b>Email</b> transient. Two HTTP requests arrive, so two scopes (1 and 2).', parts: [{ type: 'table', label: 'Registrations', columns: ['service', 'lifetime'], rows: [['Clock', 'Singleton'], ['Repo', 'Scoped'], ['Email', 'Transient']] }, { type: 'map', label: 'Instances created', entries: [] }] });
        reqs.forEach(function (r) {
          var key = r[1], id, why;
          function mk() { made[key] = (made[key] || 0) + 1; return key + '#' + made[key]; }
          if (r[2] === 'Singleton') { why = single[key] ? 'reuse the one root instance' : 'first time anywhere → create it in the root'; id = single[key] || (single[key] = mk()); }
          else if (r[2] === 'Scoped') { var k = r[0] + '/' + key; why = scoped[k] ? 'already created in scope ' + r[0] + ' → reuse' : 'first time in scope ' + r[0] + ' → create'; id = scoped[k] || (scoped[k] = mk()); }
          else { why = 'transient → always new'; id = mk(); }
          out.push('scope ' + r[0] + ': ' + key + ' → ' + id);
          var entries = Object.keys(made).map(function (s) { return [s, made[s] + ' created']; });
          var hl = {}; hl[key] = 'cur';
          frames.push({ narr: 'Scope <b>' + r[0] + '</b> asks for <b>' + key + '</b> (' + r[2] + '): ' + why + ' → <b>' + id + '</b>.', parts: [{ type: 'map', label: 'Instances created per service', entries: entries, hl: hl }, { type: 'stack', label: 'Resolutions so far', items: out.slice() }] });
        });
        frames.push({ narr: 'End of each request: the scope is disposed, taking Repo#1/Repo#2 and the Email instances with it. Clock#1 lives until the app stops.', parts: [{ type: 'stack', label: 'Resolutions', items: out.slice() }, note('Rule', 'Singleton: 1 per app · Scoped: 1 per request · Transient: 1 per resolve')] });
        return frames;
      }
    },
    examples: [
      { title: 'The captive dependency, concretely', html: `<p>${C('AddSingleton<PriceCache>()')} whose constructor takes ${C('ShopDb')} (scoped). Request 1 resolves PriceCache, which captures request 1's DbContext. Request 1 ends and disposes that context. Request 2 uses PriceCache → ${C('ObjectDisposedException')}. With ValidateScopes on, start-up throws instead — far better.</p>` },
      { title: 'Last registration wins, IEnumerable gets all', html: `<p>Notification fan-out uses this: register several ${C('INotifier')} implementations and inject ${C('IEnumerable<INotifier>')}.</p>`, code: web(`
builder.Services.AddSingleton<INotifier, EmailNotifier>();
builder.Services.AddSingleton<INotifier, SmsNotifier>();
// INotifier → SmsNotifier; IEnumerable<INotifier> → [EmailNotifier, SmsNotifier]
builder.Services.TryAddSingleton<INotifier, PushNotifier>(); // ignored: already registered`) },
      { title: 'A tiny container in plain C#', html: `<p>The core of a DI container is a dictionary from service type to (lifetime, factory) plus two caches.</p>`, code: `
using System;
using System.Collections.Generic;

enum Lifetime { Singleton, Scoped, Transient }

sealed class MiniContainer
{
    readonly Dictionary<Type, (Lifetime Life, Func<Scope, object> Make)> _regs = new();
    readonly Dictionary<Type, object> _singletons = new();
    public void Add<T>(Lifetime life, Func<Scope, T> make) where T : class => _regs[typeof(T)] = (life, s => make(s));
    public Scope CreateScope() => new Scope(this);

    public sealed class Scope
    {
        readonly MiniContainer _c; readonly Dictionary<Type, object> _scoped = new();
        public Scope(MiniContainer c) => _c = c;
        public T Get<T>() where T : class
        {
            var (life, make) = _c._regs[typeof(T)];
            if (life == Lifetime.Transient) return (T)make(this);
            var cache = life == Lifetime.Singleton ? _c._singletons : _scoped;
            if (!cache.TryGetValue(typeof(T), out var o)) cache[typeof(T)] = o = make(this);
            return (T)o;
        }
    }
}` }
    ],
    deepDive: `<p><b>Root vs scoped providers.</b> ${C('app.Services')} is the root provider. Singletons live there. Resolving a scoped service from the root makes it a de-facto singleton (and ValidateScopes throws in Development). Each request gets ${C('HttpContext.RequestServices')}, a scope created by the hosting layer.</p>
<p><b>Disposal.</b> Every scope tracks the ${C('IDisposable')}/${C('IAsyncDisposable')} instances it created, including <b>transients</b>. Resolving disposable transients from the root therefore leaks: the root holds them until shutdown. Prefer factories or scopes.</p>
<p><b>Call-site compilation.</b> The default container builds a "call site" tree per service the first time it is resolved, then switches to compiled IL / expression-tree factories for hot services. That is why resolution is cheap but the first request after start-up is slower.</p>
<p><b>Constructor selection.</b> With several public constructors, the container picks the one with the most parameters it can satisfy; ambiguity throws. ${C('ActivatorUtilities.CreateInstance')} creates types that are not registered, mixing DI services and explicit arguments.</p>
<p><b>Thread safety.</b> Singletons are shared by all requests at once, so they must be thread-safe. Scoped services are not accessed concurrently unless you start parallel work inside a request — a classic DbContext "A second operation was started" error.</p>`,
    aiEra: `<p><b>What AI changes:</b> generated code registers everything correctly-looking with ${C('AddScoped')}, which hides lifetime mistakes. <b>Where AI goes wrong:</b> singletons that take ${C('DbContext')}, ${C('BuildServiceProvider()')} called inside ${C('ConfigureServices')} (a second container with duplicate singletons), disposable transients from the root, and ${C('HttpClient')} created per call instead of ${C('IHttpClientFactory')}. <b>How to work with it:</b> keep ${C('ValidateOnBuild')} and ${C('ValidateScopes')} on in tests, and ask the assistant to list each service with its lifetime and its dependencies' lifetimes. <b>What you still own:</b> lifetime decisions and thread-safety of singletons.</p>`,
    problems: [{
      title: 'Which Instance Do I Get?',
      level: 'Medium', tags: ['dependency injection', 'lifetimes', 'dictionary'], companies: ['Microsoft', 'Amazon', 'TCS'],
      statement: `<p>Simulate the container's caching. ${C('regs')} holds ${C('"Name:Lifetime"')} (Singleton, Scoped or Transient). Each request is ${C('"scopeId:Name"')}. Every new instance of a service gets the next number for that service (1, 2, …). Return ${C('"Name#n"')} for each request, or ${C('"Name not registered"')}.</p>`,
      constraints: `0 ≤ requests ≤ 10<sup>4</sup>. Scope ids are arbitrary strings.`,
      example: `<p>regs ${C('["S:Singleton","C:Scoped","T:Transient"]')}, requests ${C('["1:S","1:C","1:C","1:T","1:T","2:S","2:C"]')} → ${H.c('g', '["S#1","C#1","C#1","T#1","T#2","S#1","C#2"]')}.</p>`,
      brute: { why: `<p>Scanning all earlier requests to see whether an instance already exists for this (scope, service) is O(n) per request, O(n²) overall. Two dictionaries make each lookup O(1).</p>`, code: `
using System.Collections.Generic;

static class SlowLookup
{
    // O(n) scan per request: finds an earlier request with the same scope and service
    public static int FindEarlier(List<(string Scope, string Svc, int Id)> done, string scope, string svc)
    {
        foreach (var d in done) if (d.Scope == scope && d.Svc == svc) return d.Id;
        return -1;
    }
}` },
      mcq: { q: 'Two different requests ask for the same scoped service. What do they get?', options: ['Two different instances, one per request scope', 'The same instance', 'Whatever was resolved first at start-up', 'An exception'], answer: 0, explain: 'Scoped means one instance per scope; ASP.NET Core creates one scope per HTTP request.' },
      hints: [`<p>Hint 1: keep a counter per service name for numbering new instances.</p>`, `<p>Hint 2: cache singletons by name, and scoped instances by the pair ${C('(scope, name)')}.</p>`, `<p>Hint 3: transient skips every cache. An unknown name returns the "not registered" text, like ${C('GetRequiredService')} throwing.</p>`],
      tests: { sig: 'string[] string[] -> string[]', fn: 'instances', cases: [
        [[['S:Singleton', 'C:Scoped', 'T:Transient'], ['1:S', '1:C', '1:C', '1:T', '1:T', '2:S', '2:C']], ['S#1', 'C#1', 'C#1', 'T#1', 'T#2', 'S#1', 'C#2']],
        [[['S:Singleton'], []], []],
        [[['X:Transient'], ['1:X', '1:X', '1:X']], ['X#1', 'X#2', 'X#3']],
        [[['C:Scoped'], ['1:C', '2:C', '1:C', '3:C']], ['C#1', 'C#2', 'C#1', 'C#3']],
        [[['S:Singleton'], ['1:S', '2:S', '9:S']], ['S#1', 'S#1', 'S#1']],
        [[['S:Singleton'], ['1:Q']], ['Q not registered']],
        [[['A:Scoped', 'B:Transient'], ['1:A', '1:B', '2:B', '2:A', '1:A']], ['A#1', 'B#1', 'B#2', 'A#2', 'A#1']]
      ] },
      solution: {
        approach: `<p>Store each service's lifetime. Singleton → one cache keyed by name. Scoped → a cache keyed by ${C('(scope, name)')}. Transient → always create. Creating increments the per-service counter.</p>`,
        code: `
public class Solution
{
    public static string[] Instances(string[] regs, string[] requests)
    {
        var lifetime = new Dictionary<string, string>();
        foreach (var r in regs) { var p = r.Split(':'); lifetime[p[0]] = p[1]; }

        var created = new Dictionary<string, int>();
        var singletons = new Dictionary<string, int>();
        var scoped = new Dictionary<(string Scope, string Svc), int>();
        int Create(string svc) => created[svc] = created.GetValueOrDefault(svc) + 1;

        var result = new List<string>();
        foreach (var req in requests)
        {
            var p = req.Split(':');
            string scope = p[0], svc = p[1];
            if (!lifetime.TryGetValue(svc, out var life)) { result.Add(svc + " not registered"); continue; }
            int id = life switch
            {
                "Singleton" => singletons.TryGetValue(svc, out var s) ? s : singletons[svc] = Create(svc),
                "Scoped" => scoped.TryGetValue((scope, svc), out var sc) ? sc : scoped[(scope, svc)] = Create(svc),
                _ => Create(svc)                                  // Transient
            };
            result.Add($"{svc}#{id}");
        }
        return result.ToArray();
    }
}`,
        dry: { head: ['request', 'lifetime', 'cache hit?', 'result'], rows: [['1:S', 'Singleton', 'no', 'S#1'], ['1:C', 'Scoped', 'no (1,C)', 'C#1'], ['1:C', 'Scoped', 'yes', 'C#1'], ['1:T', 'Transient', '—', 'T#1'], ['1:T', 'Transient', '—', 'T#2'], ['2:S', 'Singleton', 'yes', 'S#1'], ['2:C', 'Scoped', 'no (2,C)', 'C#2']] },
        complexity: `<p>O(1) average per request, O(n) total. Memory: one entry per singleton and per (scope, scoped service).</p>`,
        followUps: ['Add disposal: when a scope ends, list the instances it created in reverse creation order.', 'Detect a scoped service resolved from scope "root" and report it like ValidateScopes.']
      }
    }]
  });

  /* ======================================================================
     TOPIC 3 — Minimal APIs vs controllers
     ====================================================================== */
  topics.push({
    title: 'Minimal APIs vs Controllers',
    analogy: `<p>A food truck and a restaurant both serve meals. The <b>food truck</b> (minimal API) is a counter and a menu board: fast to set up, every dish is one line, perfect for a focused menu. The <b>restaurant</b> (controllers) has sections, a host, house rules applied to every table (filters, conventions) — more structure, more ceremony. Same kitchen underneath: both are endpoints on the same routing, DI and middleware.</p>`,
    explain: `<p>Both styles produce <b>endpoints</b> — a ${C('RequestDelegate')} plus metadata — on the same routing system.</p>
<h4>1. Minimal API</h4>
${P(`
var todos = app.MapGroup("/todos").WithTags("Todos").RequireAuthorization();

todos.MapGet("/{id:int}", async Task<Results<Ok<Todo>, NotFound>> (int id, TodoDb db) =>
    await db.Todos.FindAsync(id) is { } t ? TypedResults.Ok(t) : TypedResults.NotFound());

todos.MapPost("/", async (CreateTodo dto, TodoDb db) =>
{
    var t = new Todo { Title = dto.Title };
    db.Todos.Add(t);
    await db.SaveChangesAsync();
    return TypedResults.Created($"/todos/{t.Id}", t);
});`)}
<p>Parameters are bound by convention: route values, query, body (JSON) for complex types, DI services, and special types (${C('HttpContext')}, ${C('CancellationToken')}, ${C('ClaimsPrincipal')}). ${C('TypedResults')} + ${C('Results<T1, T2>')} make the possible responses part of the signature, so OpenAPI knows them and unit tests can check the type.</p>
<h4>2. Controllers</h4>
${P(`
[ApiController]
[Route("api/[controller]")]
public sealed class TodosController(TodoDb db) : ControllerBase
{
    [HttpGet("{id:int}")]
    public async Task<ActionResult<Todo>> Get(int id) =>
        await db.Todos.FindAsync(id) is { } t ? t : NotFound();
}
// Program.cs: builder.Services.AddControllers(); app.MapControllers();`)}
<p>${C('[ApiController]')} turns on: attribute routing required, automatic <b>400 ValidationProblemDetails</b> when model state is invalid, binding-source inference (${C('[FromBody]')} for complex types), and ProblemDetails for error status codes.</p>
<h4>3. Choosing</h4>
${H.table(['Need', 'Minimal APIs', 'Controllers'], [
  ['Small service, microservice, high RPS', '✅ less overhead, Native AOT support', 'works'],
  ['Big API with many cross-cutting rules', 'route groups + endpoint filters', '✅ filters, conventions, model binding extensibility'],
  ['Validation', 'manual or a library / endpoint filter (built-in validation arrives in .NET 10)', '✅ automatic with [ApiController]'],
  ['Native AOT', '✅ with the Request Delegate Generator', '❌ not supported'],
  ['Team familiarity / existing MVC code', 'new style', '✅ familiar']
])}`,
    clues: ['"minimal APIs or controllers for a new service?"', '"what does [ApiController] do?"', '"return 404 or 200 from the same endpoint with OpenAPI types" → Results&lt;Ok&lt;T&gt;, NotFound&gt;', '"group endpoints with a common prefix and auth" → MapGroup', '"Native AOT web API" → minimal APIs'],
    code: web(`
// Endpoint filter: cross-cutting logic for minimal APIs (like an action filter)
todos.MapPost("/", Create).AddEndpointFilter(async (ctx, next) =>
{
    var dto = ctx.GetArgument<CreateTodo>(0);
    if (string.IsNullOrWhiteSpace(dto.Title))
        return TypedResults.ValidationProblem(new Dictionary<string, string[]> { ["title"] = ["Title is required."] });
    return await next(ctx);
});`),
    codeTitle: 'Endpoint filter on a minimal API (ASP.NET Core, not compiled here)',
    viz: flowViz('Same request, two styles', [bx('c', 'Client', 6, 30, 10), bx('rt', 'Routing', 26, 30), bx('me', 'Minimal endpoint', 52, 10, 20), bx('mvc', 'MVC action invoker', 52, 50, 20), bx('h', 'Handler lambda', 82, 10, 16), bx('ac', 'Controller action', 82, 50, 16)], [['c', 'rt'], ['rt', 'me'], ['rt', 'mvc'], ['me', 'h'], ['mvc', 'ac']], [
      { n: '<b>GET /todos/7</b> arrives. Both styles register endpoints in the same route table, so routing is identical.', hl: ['c'], e: ['c-rt'] },
      { n: 'Routing picks the endpoint. For a minimal API it is a <code>RequestDelegate</code> generated from your lambda (at start-up, or at build time by the Request Delegate Generator for AOT).', hl: ['rt', 'me'], e: ['rt-me'] },
      { n: 'The generated delegate binds <code>id</code> from the route, resolves <code>TodoDb</code> from DI and calls your lambda. Very little machinery.', hl: ['h'], e: ['me-h'], extra: [note('Bound parameters', 'id = 7 (route) · db = TodoDb (services)')] },
      { n: 'For a controller, the endpoint is the <b>MVC action invoker</b>: it creates the controller, runs model binding and validation, then the filter pipeline (authorization → resource → action → result filters).', hl: ['rt', 'mvc'], e: ['rt-mvc'] },
      { n: 'The action runs and returns <code>ActionResult&lt;Todo&gt;</code>; a result executor serialises it to JSON.', hl: ['ac'], e: ['mvc-ac'] },
      { n: 'Both return the same HTTP response. The difference is the amount of framework around your code — and therefore features (filters, conventions) versus overhead and AOT support.', ok: ['h', 'ac'] }
    ]),
    examples: [
      { title: 'Typed results are testable', html: `<p>Because the handler returns ${C('Results<Ok<Todo>, NotFound>')}, a unit test can call the static handler method directly and assert ${C('result.Result is NotFound')} without an HTTP server.</p>` },
      { title: 'Route groups', html: `<p>${C('MapGroup("/api/v1")')} shares a prefix, filters, auth, rate-limit and OpenAPI metadata across endpoints — the minimal-API answer to a controller's class-level attributes.</p>`, code: web(`
var v1 = app.MapGroup("/api/v1").RequireAuthorization().RequireRateLimiting("fixed");
v1.MapGet("/orders", ListOrders);
v1.MapGet("/orders/{id:int}", GetOrder);`) },
      { title: 'Modelling a result union in plain C#', html: `<p>${C('Results<A, B>')} is a closed set of outcomes. A sealed record hierarchy with a switch expression gives the same compile-time shape in plain C#.</p>`, code: `
using System;

abstract record ApiResult;
sealed record Ok(string Body) : ApiResult;
sealed record NotFound : ApiResult;

class Program
{
    static ApiResult Get(int id) => id == 1 ? new Ok("milk") : new NotFound();
    static string Render(ApiResult r) => r switch
    {
        Ok ok => "200 " + ok.Body,
        NotFound => "404",
        _ => "500"
    };
    static void Main() { Console.WriteLine(Render(Get(1))); Console.WriteLine(Render(Get(2))); }
}`, run: true }
    ],
    deepDive: `<p><b>How a lambda becomes an endpoint.</b> ${C('RequestDelegateFactory')} inspects the lambda's parameters at start-up and builds an expression tree that reads route values, query, headers, the JSON body (via ${C('System.Text.Json')}) and services, then compiles it. With ${C('<PublishAot>true</PublishAot>')}, the <b>Request Delegate Generator</b> (a source generator) emits that code at build time instead, so no reflection or dynamic code is needed.</p>
<p><b>Binding rules for minimal APIs.</b> Explicit attributes win (${C('[FromRoute]')}, ${C('[FromQuery]')}, ${C('[FromHeader]')}, ${C('[FromBody]')}, ${C('[FromServices]')}, ${C('[AsParameters]')}). Otherwise: special types; a name matching a route parameter → route; a type registered in DI → service; a simple type (has ${C('TryParse')}) → query; a complex type → body for POST/PUT/PATCH. Only one body parameter is allowed.</p>
<p><b>Controllers' extra layers.</b> ${C('ControllerBase')} gives helpers (${C('Ok()')}, ${C('CreatedAtAction')}), ${C('ModelState')}, ${C('IActionFilter')}s, application model conventions and formatters (XML, custom). In benchmarks minimal APIs are noticeably faster for trivial endpoints; in real apps the database dominates and the choice is about structure and features.</p>
<p><b>Mixing.</b> One app can host both: ${C('app.MapControllers()')} and ${C('app.MapGet(...)')} share the route table, DI, auth and middleware.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants can turn a controller into minimal-API endpoints (or back) quickly. <b>Where AI goes wrong:</b> it returns ${C('IResult')} everywhere (losing OpenAPI response types), forgets that minimal APIs have no automatic model validation before .NET 10, adds two body parameters, or puts business logic in the lambda. <b>How to work with it:</b> ask for ${C('TypedResults')} with ${C('Results<...>')} return types, handlers as static methods you can unit test, and route groups for shared policy. <b>What you still own:</b> the style decision for your team and the API contract.</p>`,
    problems: [{
      title: 'A Tiny Todo API with Typed Results',
      level: 'Medium', tags: ['minimal APIs', 'results', 'records', 'switch expression'], companies: ['Microsoft', 'Capgemini', 'Deloitte'],
      statement: `<p>Simulate a minimal todo API. Each command is one request; return one response line per command.</p>
<ul><li>${C('"POST title"')} → ${C('"201 /todos/{id}"')} (ids start at 1 and are never reused); blank title → ${C('"400 title is required"')}.</li>
<li>${C('"GET id"')} → ${C('"200 title"')} or ${C('"404"')}.</li>
<li>${C('"PUT id title"')} → ${C('"204"')}, ${C('"404"')}, or the 400 for a blank title (checked only when the todo exists).</li>
<li>${C('"DELETE id"')} → ${C('"204"')} or ${C('"404"')}.</li>
<li>${C('"LIST"')} → ${C('"200 [a,b]"')} in id order.</li></ul>
<p>Routes use ${C('{id:int}')}: an id that is not an integer matches no route → ${C('"404"')}.</p>`,
      constraints: `≤ 10<sup>4</sup> commands. Titles may contain spaces.`,
      example: `<p>${C('["POST milk","GET 1","GET 2"]')} → ${H.c('g', '["201 /todos/1","200 milk","404"]')}</p>`,
      brute: { why: `<p>Storing todos in a list and scanning it for every GET/PUT/DELETE costs O(n) per request. A dictionary keyed by id plus a sorted view for LIST is the usual in-memory store.</p>`, code: `
using System.Collections.Generic;

static class ListStore
{
    public static string Get(List<(int Id, string Title)> todos, int id)
    {
        foreach (var t in todos) if (t.Id == id) return "200 " + t.Title; // O(n) scan
        return "404";
    }
}` },
      mcq: { q: 'A route <code>/todos/{id:int}</code> receives <code>/todos/abc</code>. What happens?', options: ['No endpoint matches, so the response is 404', 'The handler runs with id = 0', '400 Bad Request from model binding', '500 because int.Parse throws'], answer: 0, explain: 'Route constraints take part in matching. A failed constraint means the route does not match at all, so routing returns 404.' },
      hints: [`<p>Hint 1: split each command at the first space into verb and rest; for PUT, split the rest again into id and title.</p>`, `<p>Hint 2: use ${C('SortedDictionary<int, string>')} so LIST comes out in id order, and a counter for the next id.</p>`, `<p>Hint 3: model the outcomes as records (${C('Created')}, ${C('Ok')}, ${C('NoContent')}, ${C('NotFound')}, ${C('BadRequest')}) and render them with one switch expression.</p>`],
      tests: { sig: 'string[] -> string[]', fn: 'api', cases: [
        [[['POST milk', 'GET 1', 'GET 2']], ['201 /todos/1', '200 milk', '404']],
        [[['POST a', 'POST b', 'DELETE 1', 'LIST', 'POST c', 'LIST']], ['201 /todos/1', '201 /todos/2', '204', '200 [b]', '201 /todos/3', '200 [b,c]']],
        [[['POST', 'POST   ']], ['400 title is required', '400 title is required']],
        [[['GET abc', 'DELETE 5', 'PUT 1 x']], ['404', '404', '404']],
        [[['POST buy milk', 'PUT 1 buy eggs', 'GET 1', 'PUT 1 ', 'GET 1']], ['201 /todos/1', '204', '200 buy eggs', '400 title is required', '200 buy eggs']],
        [[['LIST']], ['200 []']],
        [[['POST x', 'DELETE 1', 'DELETE 1', 'GET 1']], ['201 /todos/1', '204', '404', '404']]
      ] },
      solution: {
        approach: `<p>Keep a ${C('SortedDictionary<int, string>')} and a next-id counter. Each handler returns a typed result record; one switch expression renders it — the same split as ${C('TypedResults')} and the result executor.</p>`,
        code: `
public abstract record ApiResult;
public sealed record Created(string Location) : ApiResult;
public sealed record Ok(string Body) : ApiResult;
public sealed record NoContent : ApiResult;
public sealed record NotFound : ApiResult;
public sealed record BadRequest(string Error) : ApiResult;

public sealed class TodoApi
{
    private readonly SortedDictionary<int, string> _todos = new();
    private int _nextId = 1;

    public ApiResult Post(string title)
    {
        if (string.IsNullOrWhiteSpace(title)) return new BadRequest("title is required");
        int id = _nextId++;
        _todos[id] = title;
        return new Created($"/todos/{id}");
    }
    public ApiResult Get(int id) => _todos.TryGetValue(id, out var t) ? new Ok(t) : new NotFound();
    public ApiResult Put(int id, string title)
    {
        if (!_todos.ContainsKey(id)) return new NotFound();
        if (string.IsNullOrWhiteSpace(title)) return new BadRequest("title is required");
        _todos[id] = title;
        return new NoContent();
    }
    public ApiResult Delete(int id) => _todos.Remove(id) ? new NoContent() : new NotFound();
    public ApiResult List() => new Ok("[" + string.Join(",", _todos.Values) + "]");
}

public class Solution
{
    static string Render(ApiResult r) => r switch
    {
        Created c => "201 " + c.Location,
        Ok o => "200 " + o.Body,
        NoContent => "204",
        NotFound => "404",
        BadRequest b => "400 " + b.Error,
        _ => "500"
    };

    public static string[] Api(string[] cmds)
    {
        var api = new TodoApi();
        var output = new List<string>();
        foreach (var cmd in cmds)
        {
            int sp = cmd.IndexOf(' ');
            string verb = sp < 0 ? cmd : cmd[..sp];
            string rest = sp < 0 ? "" : cmd[(sp + 1)..];
            ApiResult result;
            if (verb == "POST") result = api.Post(rest);
            else if (verb == "LIST") result = api.List();
            else
            {
                int sp2 = rest.IndexOf(' ');
                string idText = sp2 < 0 ? rest : rest[..sp2];
                string title = sp2 < 0 ? "" : rest[(sp2 + 1)..];
                if (!int.TryParse(idText, out int id)) result = new NotFound();   // {id:int} did not match
                else result = verb switch
                {
                    "GET" => api.Get(id),
                    "PUT" => api.Put(id, title),
                    "DELETE" => api.Delete(id),
                    _ => new NotFound()
                };
            }
            output.Add(Render(result));
        }
        return output.ToArray();
    }
}`,
        dry: { head: ['command', 'handler', 'result record', 'line'], rows: [['POST a', 'Post("a")', 'Created("/todos/1")', '201 /todos/1'], ['POST b', 'Post("b")', 'Created("/todos/2")', '201 /todos/2'], ['DELETE 1', 'Delete(1)', 'NoContent', '204'], ['LIST', 'List()', 'Ok("[b]")', '200 [b]'], ['POST c', 'Post("c")', 'Created("/todos/3")', '201 /todos/3']] },
        complexity: `<p>O(log n) per command with a sorted dictionary; LIST is O(n).</p>`,
        followUps: ['Return 409 Conflict when posting a duplicate title.', 'Add ETags: GET returns a version, PUT with a stale version returns 412.']
      }
    }]
  });

  /* ======================================================================
     TOPIC 4 — Routing and model binding
     ====================================================================== */
  topics.push({
    title: 'Routing and Model Binding',
    analogy: `<p>A post office sorts letters by address. "Flat 7, Rose Street" goes to one pigeonhole; "anything for Rose Street" goes to a broader one; a letter with a missing street goes to "return to sender" (404). The sorter always prefers the <b>most specific</b> match. Once the letter is in the right pigeonhole, a clerk opens it and fills in a form from its contents — that is <b>model binding</b>: copying values from the route, query string, headers and body into your method's parameters.</p>`,
    explain: `<p><b>Routing</b> maps a URL + HTTP method to an endpoint. <b>Model binding</b> turns the raw request into typed parameters.</p>
<h4>1. Route templates</h4>
${H.table(['Template piece', 'Meaning', 'Example match'], [
  [C('/products'), 'literal segment (case-insensitive)', '/Products'],
  [C('{id}'), 'parameter: any one segment', '/products/blue-pen'],
  [C('{id:int}'), 'constrained parameter (also guid, bool, min(1), length(3,8), regex(...), alpha)', '/products/42'],
  [C('{id?}'), 'optional parameter', '/products'],
  [C('{page=1}'), 'parameter with default', '/list → page = 1'],
  [C('{*path}'), 'catch-all: the rest of the path (may be empty)', '/files/a/b/c.txt']
])}
<h4>2. Precedence: the most specific route wins</h4>
<p>When several templates match, routing compares them segment by segment: <b>literal</b> beats <b>constrained parameter</b> beats <b>plain parameter</b> beats <b>catch-all</b>. So ${C('/products/new')} wins over ${C('/products/{id}')} for the URL /products/new regardless of registration order. Two equally specific matches throw ${C('AmbiguousMatchException')}.</p>
<p>Constraints are for <b>disambiguating routes</b>, not input validation: ${C('/products/abc')} with only ${C('{id:int}')} is a 404, not a 400.</p>
<h4>3. Where values come from</h4>
${P(`
app.MapGet("/shops/{shopId:int}/products", (
    int shopId,                                  // route
    [FromQuery] int page,                        // ?page=2
    [FromQuery(Name = "q")] string? search,      // ?q=pen
    [FromHeader(Name = "X-Tenant")] string tenant,
    ProductService svc) => svc.List(shopId, page, search, tenant));

app.MapPost("/products", (CreateProduct dto) => ...);   // complex type → JSON body

// Group many parameters into one object
app.MapGet("/search", ([AsParameters] SearchQuery q) => ...);
public record SearchQuery(string? Q, int Page = 1, int Size = 20);`)}
<p>Simple types bind from text via ${C('TryParse')} (any type with a static ${C('TryParse')} or ${C('IParsable<T>')} works). Complex types bind from the JSON body with System.Text.Json (camelCase, case-insensitive by default in web defaults). A value that cannot convert gives <b>400</b> in minimal APIs; in controllers it adds a ${C('ModelState')} error, which ${C('[ApiController]')} turns into a 400 ProblemDetails.</p>`,
    clues: ['"two routes match the same URL — which one runs?" → precedence', '"/products/abc returns 404 not 400" → route constraints', '"read a value from header / query / route / body"', '"too many parameters on the endpoint" → [AsParameters]', '"bind a custom type from a query string" → static TryParse / IParsable'],
    code: web(`
// A custom route constraint: only lowercase slugs
public sealed class SlugConstraint : IRouteConstraint
{
    public bool Match(HttpContext? http, IRouter? route, string key, RouteValueDictionary values, RouteDirection dir) =>
        values.TryGetValue(key, out var v) && v is string s && s.Length > 0 && s.All(c => char.IsAsciiLetterLower(c) || char.IsAsciiDigit(c) || c == '-');
}
builder.Services.Configure<RouteOptions>(o => o.ConstraintMap["slug"] = typeof(SlugConstraint));
app.MapGet("/blog/{post:slug}", (string post) => post);`),
    codeTitle: 'Custom route constraint (ASP.NET Core, not compiled here)',
    viz: {
      title: 'Matching /products/42 against the route table',
      gen: function () {
        var rows = [['/products', '—'], ['/products/{id:int}', '—'], ['/products/{slug}', '—'], ['/products/new', '—'], ['/files/{*path}', '—']];
        function tbl(hl) { return { type: 'table', label: 'Route table', columns: ['template', 'status'], rows: rows.map(function (r) { return r.slice(); }), hl: hl || {} }; }
        var f = [];
        f.push({ narr: 'URL <b>/products/42</b> → segments <code>["products", "42"]</code>. Every template is a candidate.', parts: [{ type: 'array', label: 'path segments', values: ['products', '42'] }, tbl()] });
        rows[0][1] = 'too short ✗'; f.push({ narr: '<code>/products</code> has 1 segment, the URL has 2 → no match.', parts: [tbl({ 0: 'bad' })] });
        rows[1][1] = 'match (int ok) ✓'; f.push({ narr: '<code>/products/{id:int}</code>: literal "products" matches; "42" passes the int constraint → <b>candidate</b>, id = 42.', parts: [tbl({ 1: 'ok' })] });
        rows[2][1] = 'match ✓'; f.push({ narr: '<code>/products/{slug}</code>: a plain parameter accepts anything → also a candidate.', parts: [tbl({ 2: 'ok' })] });
        rows[3][1] = 'literal "new" ≠ "42" ✗'; rows[4][1] = 'literal "files" ✗'; f.push({ narr: 'The remaining templates fail on a literal segment.', parts: [tbl({ 3: 'bad', 4: 'bad' })] });
        f.push({ narr: 'Two candidates. Compare segment 2: <b>constrained parameter</b> beats plain parameter, so <code>{id:int}</code> wins.', parts: [{ type: 'table', label: 'Precedence (lower wins)', columns: ['segment kind', 'rank'], rows: [['literal', '0'], ['constrained parameter', '1'], ['parameter', '2'], ['catch-all', '3']], hl: { 1: 'sel' } }, tbl({ 1: 'sel', 2: 'done' })] });
        f.push({ narr: 'Model binding: <code>id</code> is an <code>int</code> parameter whose name matches the route value → <code>int.TryParse("42")</code> → 42. The handler runs.', parts: [{ type: 'vars', label: 'Bound parameters', vals: { id: 42, source: 'route' }, hl: { id: 'ok' } }] });
        return f;
      }
    },
    examples: [
      { title: 'Binding a custom type with TryParse', html: `<p>Any type with ${C('public static bool TryParse(string? s, IFormatProvider? p, out T result)')} binds from route or query in minimal APIs.</p>`, code: `
using System;
using System.Diagnostics.CodeAnalysis;
using System.Globalization;

public readonly record struct Point(int X, int Y) : IParsable<Point>
{
    public static Point Parse(string s, IFormatProvider? p) =>
        TryParse(s, p, out var r) ? r : throw new FormatException("expected x,y");
    public static bool TryParse([NotNullWhen(true)] string? s, IFormatProvider? p, out Point result)
    {
        result = default;
        var parts = s?.Split(',');
        if (parts is not { Length: 2 }) return false;
        if (!int.TryParse(parts[0], NumberStyles.Integer, CultureInfo.InvariantCulture, out int x)) return false;
        if (!int.TryParse(parts[1], NumberStyles.Integer, CultureInfo.InvariantCulture, out int y)) return false;
        result = new Point(x, y);
        return true;
    }
}
// app.MapGet("/map", (Point at) => ...);   GET /map?at=3,4` },
      { title: 'Route values vs query string', html: `<p>Use the route for <b>identity</b> (${C('/orders/7')}) and the query for <b>options</b> (${C('?status=paid&page=2')}). Changing a query option should never change which resource you are talking about.</p>` },
      { title: 'Controller binding sources', html: `<p>With ${C('[ApiController]')}, complex types are inferred as ${C('[FromBody]')}, ${C('IFormFile')} as ${C('[FromForm]')}, names in the route template as ${C('[FromRoute]')}, and everything else as ${C('[FromQuery]')}.</p>`, code: web(`
[HttpPut("{id:int}")]
public IActionResult Update(int id, [FromBody] UpdateOrder dto, [FromHeader(Name = "If-Match")] string? etag) => NoContent();`) }
    ],
    deepDive: `<p><b>Endpoint routing internals.</b> At start-up all endpoints are compiled into a <b>DFA</b> (a tree keyed by literal segments, with parameter branches). Matching walks the tree once per request, so cost depends on path length, not on the number of routes. Candidates that survive are filtered by constraints and HTTP method (${C('HttpMethodMatcherPolicy')}), then sorted by ${C('RoutePattern')} precedence and ${C('Order')}.</p>
<p><b>Link generation.</b> ${C('LinkGenerator.GetPathByName("GetOrder", new { id = 7 })')} turns route values back into a URL — the reverse of matching. Defaults are dropped from the end, extra values become the query string. ${C('CreatedAtRoute')} uses it for the Location header.</p>
<p><b>Binding failures.</b> Minimal APIs return 400 when a required parameter is missing or does not parse (set ${C('RouteHandlerOptions.ThrowOnBadRequest')} in development to see why). Nullable or defaulted parameters become optional. Body size limits (30 MB default in Kestrel) and JSON depth limits protect the server.</p>
<p><b>Security.</b> Over-posting: binding a whole entity from the body lets clients set fields like ${C('IsAdmin')}. Bind a dedicated input DTO and map it.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants write route templates and DTOs quickly. <b>Where AI goes wrong:</b> it uses constraints as validation (expecting 400), binds EF entities directly from the body (over-posting), creates ambiguous routes like ${C('{id}')} and ${C('{name}')} on the same path, and mixes ${C('[FromBody]')} on two parameters. <b>How to work with it:</b> give it your route table and ask which template wins for a list of tricky URLs; ask for separate input DTOs. <b>What you still own:</b> URL design (resource identity in the path, options in the query) and the contract.</p>`,
    problems: [{
      title: 'Route Matcher with Precedence',
      level: 'Medium', tags: ['routing', 'strings', 'parsing'], companies: ['Microsoft', 'Amazon', 'Flipkart'],
      statement: `<p>Implement ${C('Match(string[] templates, string path)')}. Segments are separated by ${C('/')} (empty segments ignored, so trailing slashes do not matter). Template segments: a literal (case-insensitive), ${C('{name}')}, ${C('{name:int}')}, or ${C('{*name}')} (catch-all, must be last, takes the remaining segments joined by ${C('/')}, possibly empty). Among matching templates the most specific wins: compare segment ranks left to right (literal 0 &lt; int 1 &lt; parameter 2 &lt; catch-all 3); a full tie keeps the earlier template. Return the template followed by ${C('" name=value;name2=value2"')} (omit the space and values when there are no parameters), or ${C('"404"')}.</p>`,
      constraints: `≤ 100 templates, ≤ 20 segments each.`,
      example: `<p>With ${C('/products/{id:int}')} and ${C('/products/{slug}')}, path ${C('/products/42')} → ${H.c('g', '"/products/{id:int} id=42"')}.</p>`,
      brute: { why: `<p>Returning the <b>first</b> matching template depends on registration order and gets ${C('/products/new')} wrong if ${C('{slug}')} was added first. Precedence must be computed, not assumed.</p>`, code: `
static class FirstMatch
{
    // wrong: order-dependent; ignores precedence and constraints
    public static string Match(string[] templates, string path)
    {
        int n = path.Split('/', System.StringSplitOptions.RemoveEmptyEntries).Length;
        foreach (var t in templates)
            if (t.Split('/', System.StringSplitOptions.RemoveEmptyEntries).Length == n) return t;
        return "404";
    }
}` },
      mcq: { q: 'Templates <code>/a/{x}</code> and <code>/a/b</code> both match <code>/a/b</code>. Which runs?', options: ['/a/b — a literal segment is more specific than a parameter', 'Whichever was registered first', 'AmbiguousMatchException', '/a/{x} because it is more general'], answer: 0, explain: 'Endpoint routing orders candidates by precedence: literal > constrained parameter > parameter > catch-all.' },
      hints: [`<p>Hint 1: parse each template once into (kind, name) segments, and split the path with ${C('StringSplitOptions.RemoveEmptyEntries')}.</p>`, `<p>Hint 2: match segment by segment; a catch-all swallows the rest, otherwise both lengths must end together. Use ${C('int.TryParse')} for the int constraint.</p>`, `<p>Hint 3: the rank array of a template is its precedence key; keep the best by comparing arrays lexicographically with a strict "less than".</p>`],
      tests: { sig: 'string[] string -> string', fn: 'match', cases: [
        [[['/products', '/products/{id:int}', '/products/{slug}', '/products/new', '/files/{*path}'], '/products'], '/products'],
        [[['/products', '/products/{id:int}', '/products/{slug}', '/products/new', '/files/{*path}'], '/products/42'], '/products/{id:int} id=42'],
        [[['/products', '/products/{id:int}', '/products/{slug}', '/products/new', '/files/{*path}'], '/products/new'], '/products/new'],
        [[['/products', '/products/{id:int}', '/products/{slug}', '/products/new', '/files/{*path}'], '/products/blue-pen'], '/products/{slug} slug=blue-pen'],
        [[['/products', '/products/{id:int}', '/products/{slug}', '/products/new', '/files/{*path}'], '/files/a/b/c.txt'], '/files/{*path} path=a/b/c.txt'],
        [[['/products', '/products/{id:int}', '/products/{slug}', '/products/new', '/files/{*path}'], '/orders/1'], '404'],
        [[['/products', '/products/{id:int}', '/products/{slug}', '/products/new', '/files/{*path}'], '/PRODUCTS/7/'], '/products/{id:int} id=7'],
        [[['/products', '/products/{id:int}', '/products/{slug}', '/products/new', '/files/{*path}'], '/products/1/2'], '404'],
        [[['/products', '/products/{id:int}', '/products/{slug}', '/products/new', '/files/{*path}'], '/files'], '/files/{*path} path='],
        [[['/users/{uid:int}/orders/{oid:int}', '/users/{name}/orders/{oid}'], '/users/5/orders/x'], '/users/{name}/orders/{oid} name=5;oid=x'],
        [[[], '/'], '404']
      ] },
      solution: {
        approach: `<p>Parse templates into typed segments. For each template, walk the path: literals compare case-insensitively, ${C('{x:int}')} needs ${C('int.TryParse')}, ${C('{*x}')} takes the rest. A matching template's precedence key is the list of segment ranks; the lexicographically smallest key wins and ties keep the earlier template.</p>`,
        code: `
using System.Globalization;

public class Solution
{
    enum Kind { Literal = 0, IntParam = 1, Param = 2, CatchAll = 3 }
    record Seg(Kind Kind, string Text);

    static string[] Split(string s) => s.Split('/', StringSplitOptions.RemoveEmptyEntries);

    static Seg Parse(string s)
    {
        if (!s.StartsWith('{')) return new Seg(Kind.Literal, s);
        string inner = s[1..^1];
        if (inner.StartsWith('*')) return new Seg(Kind.CatchAll, inner[1..]);
        int colon = inner.IndexOf(':');
        return colon < 0 ? new Seg(Kind.Param, inner) : new Seg(Kind.IntParam, inner[..colon]);
    }

    static bool TryMatch(List<Seg> tpl, string[] path, List<string> values)
    {
        for (int i = 0; i < tpl.Count; i++)
        {
            var seg = tpl[i];
            if (seg.Kind == Kind.CatchAll) { values.Add(seg.Text + "=" + string.Join("/", path.Skip(i))); return true; }
            if (i >= path.Length) return false;
            switch (seg.Kind)
            {
                case Kind.Literal when !seg.Text.Equals(path[i], StringComparison.OrdinalIgnoreCase): return false;
                case Kind.IntParam when !int.TryParse(path[i], NumberStyles.Integer, CultureInfo.InvariantCulture, out _): return false;
                case Kind.IntParam:
                case Kind.Param: values.Add(seg.Text + "=" + path[i]); break;
            }
        }
        return tpl.Count == path.Length;
    }

    static int Compare(int[] a, int[] b)
    {
        for (int i = 0; i < Math.Min(a.Length, b.Length); i++)
            if (a[i] != b[i]) return a[i].CompareTo(b[i]);
        return 0;                                   // full tie: keep the earlier template
    }

    public static string Match(string[] templates, string path)
    {
        var segs = Split(path);
        string? best = null; int[]? bestRank = null; string bestValues = "";
        foreach (var t in templates)
        {
            var tpl = Split(t).Select(Parse).ToList();
            var values = new List<string>();
            if (!TryMatch(tpl, segs, values)) continue;
            int[] rank = tpl.Select(s => (int)s.Kind).ToArray();
            if (bestRank is null || Compare(rank, bestRank) < 0)
            {
                best = t; bestRank = rank; bestValues = string.Join(";", values);
            }
        }
        if (best is null) return "404";
        return bestValues.Length == 0 && !best.Contains('{') ? best : best + " " + bestValues;
    }
}`,
        dry: { head: ['template', 'matches /products/42?', 'rank', 'best so far'], rows: [['/products', 'no (length)', '—', '—'], ['/products/{id:int}', 'yes, id=42', '[0,1]', '{id:int}'], ['/products/{slug}', 'yes, slug=42', '[0,2]', '{id:int} ([0,1] &lt; [0,2])'], ['/products/new', 'no (literal)', '—', '{id:int}'], ['/files/{*path}', 'no (literal)', '—', '{id:int}']] },
        complexity: `<p>O(T · S) per request for T templates of S segments. Real routing builds a DFA once so matching is O(S).</p>`,
        followUps: ['Add <code>{id?}</code> optional parameters and <code>{page=1}</code> defaults.', 'Detect two templates that are exactly equally specific and report them as ambiguous.']
      }
    }]
  });

  /* ======================================================================
     TOPIC 5 — Configuration and the options pattern
     ====================================================================== */
  topics.push({
    title: 'Configuration and the Options Pattern',
    analogy: `<p>Think of a stack of transparent sheets on an overhead projector. The bottom sheet is ${C('appsettings.json')}; above it ${C('appsettings.Production.json')}; then user secrets, environment variables, and the command line on top. You read the stack from above: a value written on a higher sheet <b>covers</b> the same spot below. The <b>options pattern</b> is a clerk who copies one region of that picture into a neat typed form (${C('SmtpOptions')}) and checks it is filled in properly before the shop opens.</p>`,
    explain: `<p>${C('IConfiguration')} is a flat dictionary of string keys to string values. Sections are joined with ${C(':')} — ${C('"Smtp:Port"')}. Keys are <b>case-insensitive</b>.</p>
<h4>1. Default providers (later wins)</h4>
${H.table(['Order', 'Provider', 'Notes'], [
  ['1', C('appsettings.json'), 'base settings, committed to git'],
  ['2', C('appsettings.{Environment}.json'), 'from ASPNETCORE_ENVIRONMENT (Development, Staging, Production)'],
  ['3', 'User secrets', 'Development only; never in git'],
  ['4', 'Environment variables', C('Smtp__Port=587') + ' — double underscore becomes ' + C(':')],
  ['5', 'Command line', C('--Smtp:Port=587')]
])}
<h4>2. The options pattern</h4>
${P(`
public sealed class SmtpOptions
{
    public const string Section = "Smtp";
    [Required] public string Host { get; set; } = "";
    [Range(1, 65535)] public int Port { get; set; } = 25;
    public bool UseSsl { get; set; }
}

builder.Services.AddOptions<SmtpOptions>()
    .BindConfiguration(SmtpOptions.Section)
    .ValidateDataAnnotations()
    .Validate(o => !o.UseSsl || o.Port != 25, "SSL on port 25 is unusual")
    .ValidateOnStart();          // fail at start-up, not on first use

public sealed class Mailer(IOptions<SmtpOptions> options) { ... options.Value.Host ... }`)}
<h4>3. Three interfaces</h4>
${H.table(['Interface', 'Lifetime', 'Reloads?', 'Use'], [
  [C('IOptions<T>'), 'singleton', 'no — read once', 'most code'],
  [C('IOptionsSnapshot<T>'), 'scoped', 'yes, per request', 'per-request fresh values, named options'],
  [C('IOptionsMonitor<T>'), 'singleton', 'yes, with ' + C('OnChange'), 'singletons/background services that need live values']
])}
<p>The binder sets public properties by matching names case-insensitively and converts strings with type converters. A value that cannot convert throws ${C('InvalidOperationException')} when the options are first built.</p>`,
    clues: ['"different settings per environment" → appsettings.{Environment}.json', '"override a nested setting in Docker/Kubernetes" → env var with __', '"read settings in a typed way / validate at start-up" → options pattern + ValidateOnStart', '"IOptions vs IOptionsSnapshot vs IOptionsMonitor"', '"where do I put secrets?" → user secrets locally, Key Vault / env in production'],
    code: web(`
// Kubernetes: env vars override JSON
//   Smtp__Host=mail.prod.local   ConnectionStrings__Shop=Server=...
builder.Configuration.AddAzureKeyVault(new Uri(vaultUrl), new DefaultAzureCredential()); // added last → wins
var cs = builder.Configuration.GetConnectionString("Shop");   // = Configuration["ConnectionStrings:Shop"]`),
    codeTitle: 'Configuration sources in production (ASP.NET Core, not compiled here)',
    viz: {
      title: 'Layering configuration providers',
      gen: function () {
        var layers = [['appsettings.json', 'Db:Host', 'localhost'], ['appsettings.json', 'Db:Port', '5432'], ['appsettings.Development.json', 'Db:Host', 'devbox'], ['environment', 'DB__PORT → Db:Port', '6000'], ['command line', '--Db:Host → Db:Host', 'prod-db']];
        var eff = {}, frames = [];
        frames.push({ narr: 'Providers are added in order. We read <b>Db:Host</b> and <b>Db:Port</b> at the end; each provider can overwrite keys from earlier ones.', parts: [{ type: 'map', label: 'Effective configuration', entries: [] }] });
        layers.forEach(function (l) {
          var key = l[1].indexOf('→') >= 0 ? l[1].split('→ ')[1] : l[1];
          var over = eff[key] !== undefined;
          eff[key] = l[2] + ' (' + l[0] + ')';
          var hl = {}; hl[key] = over ? 'cur' : 'ok';
          frames.push({ narr: '<b>' + l[0] + '</b> sets <code>' + l[1] + '</code> = <b>' + l[2] + '</b>' + (over ? ' — <span class="c-y">overrides</span> the earlier value.' : ' — new key.') + (l[0] === 'environment' ? ' The env provider turns <code>__</code> into <code>:</code>; keys are case-insensitive.' : ''), parts: [{ type: 'map', label: 'Effective configuration', entries: Object.keys(eff).map(function (k) { return [k, eff[k]]; }), hl: hl }] });
        });
        frames.push({ narr: 'Binding <code>DbOptions</code> from section "Db": Host = "prod-db", Port = 6000 (converted from the string "6000"). ValidateOnStart runs the validators before the app accepts traffic.', parts: [{ type: 'vars', label: 'DbOptions', vals: { Host: 'prod-db', Port: 6000 }, hl: { Host: 'ok', Port: 'ok' } }] });
        return frames;
      }
    },
    examples: [
      { title: 'Arrays in configuration', html: `<p>JSON arrays flatten to indexed keys: ${C('"Cors:Origins:0"')}, ${C('"Cors:Origins:1"')}. An environment variable ${C('Cors__Origins__0=https://a.com')} replaces only element 0 — overriding a whole array from env vars needs every index.</p>` },
      { title: 'Named options', html: `<p>Two Smtp servers with one options type: ${C('Configure<SmtpOptions>("marketing", section1)')}, read with ${C('IOptionsSnapshot<SmtpOptions>.Get("marketing")')} or ${C('IOptionsMonitor<T>.Get(name)')}.</p>` },
      { title: 'A flat key-value store in plain C#', html: `<p>The core of ${C('ConfigurationRoot')}: providers in order, a case-insensitive lookup that asks the <b>last</b> provider first.</p>`, code: `
using System;
using System.Collections.Generic;

class Program
{
    static void Main()
    {
        var providers = new List<Dictionary<string, string>>
        {
            new(StringComparer.OrdinalIgnoreCase) { ["Db:Host"] = "localhost", ["Db:Port"] = "5432" },
            new(StringComparer.OrdinalIgnoreCase) { ["db:port"] = "6000" }        // e.g. from DB__PORT
        };
        string? Get(string key)
        {
            for (int i = providers.Count - 1; i >= 0; i--)                   // last provider wins
                if (providers[i].TryGetValue(key, out var v)) return v;
            return null;
        }
        Console.WriteLine(Get("Db:Host") + " " + Get("DB:PORT"));            // localhost 6000
    }
}`, run: true }
    ],
    deepDive: `<p><b>How lookups work.</b> ${C('ConfigurationRoot')} asks providers from last to first and returns the first hit — there is no merged dictionary. ${C('GetSection("Smtp")')} is a cheap view with a path prefix; ${C('GetChildren')} unions child keys from all providers.</p>
<p><b>Reload.</b> JSON providers watch files (${C('reloadOnChange: true')}); a change fires a change token, ${C('IOptionsMonitor')} recomputes and calls ${C('OnChange')}. ${C('IOptions<T>')} never changes after first access. Inside containers, file watching on mounted ConfigMaps may need ${C('DOTNET_USE_POLLING_FILE_WATCHER')}.</p>
<p><b>Binder details.</b> ${C('ConfigurationBinder')} creates the object, then for each public settable property looks up the child key (case-insensitive) and converts with ${C('TypeDescriptor.GetConverter')} (invariant culture). Collections are appended to unless you clear them, and ${C('ErrorOnUnknownConfiguration')} can make typos fail. .NET 8 adds a <b>configuration binding source generator</b> (${C('EnableConfigurationBindingGenerator')}) so binding works with trimming and Native AOT.</p>
<p><b>Secrets.</b> Never commit secrets to appsettings. Locally: ${C('dotnet user-secrets')}. In production: environment variables injected by the platform, Azure Key Vault / AWS Secrets Manager providers, or managed identity so there is no secret at all.</p>`,
    aiEra: `<p><b>What AI changes:</b> generated code tends to read ${C('Configuration["Smtp:Host"]')} everywhere. <b>Where AI goes wrong:</b> it injects ${C('IOptionsSnapshot')} into singletons (scoped into singleton → error), forgets ${C('ValidateOnStart')}, writes env vars with a single underscore or a colon (not portable to Linux shells), and suggests secrets in appsettings.json. <b>How to work with it:</b> ask for a typed options class with validation and a list of env-var names for each setting. <b>What you still own:</b> where each secret lives and which settings may change without a restart.</p>`,
    problems: [{
      title: 'Effective Configuration Value',
      level: 'Easy', tags: ['configuration', 'dictionary', 'strings'], companies: ['Microsoft', 'Wipro', 'Cognizant'],
      statement: `<p>Each entry is ${C('"source key=value"')}, in provider order (later wins). Source ${C('env')} uses ${C('__')} for ${C(':')}; source ${C('cmd')} keys start with ${C('--')} or ${C('/')} which are removed. Keys are case-insensitive; the value is everything after the first ${C('=')} (may be empty). Return ${C('"[value] from source"')} for ${C('key')}, or ${C('"(null)"')}.</p>`,
      constraints: `≤ 10<sup>4</sup> entries. Source names contain no spaces.`,
      example: `<p>Entries ${C('["json Db:Port=5432", "env DB__PORT=6000"]')}, key ${C('"db:port"')} → ${H.c('g', '"[6000] from env"')}.</p>`,
      brute: { why: `<p>Scanning every entry for every lookup and normalising keys each time costs O(n) per read. Building one case-insensitive dictionary in order costs O(n) once, then O(1) per read.</p>`, code: `
static class ScanAll
{
    public static string Find(string[] entries, string key)
    {
        string result = "(null)";
        foreach (var e in entries)   // O(n) per lookup
        {
            var kv = e[(e.IndexOf(' ') + 1)..];
            if (kv.StartsWith(key + "=", System.StringComparison.OrdinalIgnoreCase)) result = kv[(key.Length + 1)..];
        }
        return result;
    }
}` },
      mcq: { q: 'Which environment variable overrides <code>Logging:LogLevel:Default</code> on Linux?', options: ['<code>Logging__LogLevel__Default</code>', '<code>Logging:LogLevel:Default</code>', '<code>Logging_LogLevel_Default</code>', '<code>LOGGING.LOGLEVEL.DEFAULT</code>'], answer: 0, explain: 'Colons are not allowed in env var names on every shell, so the provider maps a double underscore to the section separator. Case does not matter.' },
      hints: [`<p>Hint 1: split each entry at the first space (source) and the first ${C('=')} after it (key, value).</p>`, `<p>Hint 2: normalise the key per source: env replaces ${C('"__"')} with ${C('":"')}; cmd trims a leading ${C('"--"')} or ${C('"/"')}.</p>`, `<p>Hint 3: store into a ${C('Dictionary')} with ${C('StringComparer.OrdinalIgnoreCase')}, overwriting as you go — the last write is the winner.</p>`],
      tests: { sig: 'string[] string -> string', fn: 'effective', cases: [
        [[['json Db:Host=localhost', 'json Db:Port=5432', 'json.Development Db:Host=devbox', 'env DB__PORT=6000', 'cmd --Db:Host=prod-db'], 'Db:Host'], '[prod-db] from cmd'],
        [[['json Db:Host=localhost', 'json Db:Port=5432', 'json.Development Db:Host=devbox', 'env DB__PORT=6000', 'cmd --Db:Host=prod-db'], 'db:port'], '[6000] from env'],
        [[['json Db:Host=localhost', 'json Db:Port=5432', 'json.Development Db:Host=devbox', 'env DB__PORT=6000', 'cmd --Db:Host=prod-db'], 'Db:User'], '(null)'],
        [[['json Db:Host=localhost', 'json.Development Db:Host=devbox', 'env DB__PORT=6000'], 'Db:Host'], '[devbox] from json.Development'],
        [[['json Logging:LogLevel:Default=Information', 'env Logging__LogLevel__Default=Warning'], 'Logging:LogLevel:Default'], '[Warning] from env'],
        [[['json Feature:Beta=true', 'cmd --Feature:Beta='], 'Feature:Beta'], '[] from cmd'],
        [[[], 'A'], '(null)'],
        [[['cmd /Port=80', 'env PORT=8080'], 'port'], '[8080] from env'],
        [[['json Cs:Main=Server=db;User=sa'], 'cs:main'], '[Server=db;User=sa] from json']
      ] },
      solution: {
        approach: `<p>Walk the entries in order, normalise each key for its source, and write into a case-insensitive dictionary. The final dictionary holds each key's winning value and source.</p>`,
        code: `
public class Solution
{
    static string NormalizeKey(string source, string key) => source switch
    {
        "env" => key.Replace("__", ":"),
        "cmd" => key.StartsWith("--") ? key[2..] : key.StartsWith('/') ? key[1..] : key,
        _ => key
    };

    public static string Effective(string[] entries, string key)
    {
        var config = new Dictionary<string, (string Value, string Source)>(StringComparer.OrdinalIgnoreCase);
        foreach (var entry in entries)
        {
            int sp = entry.IndexOf(' ');
            string source = entry[..sp];
            string kv = entry[(sp + 1)..];
            int eq = kv.IndexOf('=');
            string k = NormalizeKey(source, kv[..eq]);
            config[k] = (kv[(eq + 1)..], source);          // later providers overwrite earlier ones
        }
        return config.TryGetValue(key, out var hit) ? $"[{hit.Value}] from {hit.Source}" : "(null)";
    }
}`,
        dry: { head: ['entry', 'normalised key', 'Db:Host', 'Db:Port'], rows: [['json Db:Host=localhost', 'Db:Host', 'localhost', '—'], ['json Db:Port=5432', 'Db:Port', 'localhost', '5432'], ['json.Development Db:Host=devbox', 'Db:Host', 'devbox', '5432'], ['env DB__PORT=6000', 'DB:PORT', 'devbox', '6000'], ['cmd --Db:Host=prod-db', 'Db:Host', 'prod-db', '6000']] },
        complexity: `<p>O(total input length) to build, O(1) average per lookup.</p>`,
        followUps: ['Support an env prefix such as <code>MYAPP_</code> that is stripped and filters other variables.', 'Return all keys under a section (like <code>GetChildren</code>).']
      }
    }]
  });

  /* ======================================================================
     TOPIC 6 — Filters and validation
     ====================================================================== */
  topics.push({
    title: 'Filters and Validation',
    analogy: `<p>A nightclub has a bouncer at the street door (middleware: sees everyone, knows nothing about which room you want), and a second check at each private room (filters: they know which room — which <b>action</b> — you are entering, and what you are carrying in). Validation is the room host reading your invitation form: name filled in? age 18+? If not, you get the form back with every problem circled — a <b>400 with a list of errors</b>, not a vague "no".</p>`,
    explain: `<p><b>Filters</b> run inside the MVC (or endpoint) pipeline, after routing has chosen an action, so they can see the action, its arguments and its result.</p>
<h4>1. MVC filter types, in order</h4>
${H.table(['Filter', 'Runs', 'Typical use'], [
  ['Authorization', 'first', 'reject unauthenticated/forbidden'],
  ['Resource', 'before model binding / after everything', 'caching, short-circuit whole pipeline'],
  ['Action', 'around the action method (args bound)', 'validation, logging arguments, transactions'],
  ['Exception', 'when the action or action filters throw', 'map exceptions (prefer IExceptionHandler today)'],
  ['Result', 'around executing the result', 'add headers, change formatting']
])}
<p>Filters are applied globally (${C('options.Filters.Add')}), on a controller, or on an action. Default order: global → controller → action on the way in, reverse on the way out; ${C('IOrderedFilter.Order')} overrides it (lower first).</p>
<h4>2. Validation with data annotations</h4>
${P(`
public sealed record CreateUser(
    [property: Required, StringLength(20)] string Name,
    [property: Required, EmailAddress] string Email,
    [property: Range(18, 120)] int Age);

[ApiController] ...
[HttpPost] public IActionResult Create(CreateUser dto) => ...;   // invalid → automatic 400`)}
<p>With ${C('[ApiController]')}, an invalid model never reaches your action: the framework returns <b>400</b> with a ${C('ValidationProblemDetails')} body:</p>
${P(`
{ "type": "https://tools.ietf.org/html/rfc9110#section-15.5.1",
  "title": "One or more validation errors occurred.", "status": 400,
  "errors": { "Name": ["The Name field is required."], "Age": ["The field Age must be between 18 and 120."] } }`)}
<p>For minimal APIs (.NET 8/9) use an <b>endpoint filter</b> or a library such as FluentValidation; .NET 10 adds built-in ${C('AddValidation()')}. ${C('IValidatableObject')} handles cross-field rules ("end date after start date").</p>
<h4>3. Middleware or filter?</h4>
<p>Use middleware for anything about raw HTTP (all requests, static files too). Use a filter when you need the chosen action, its bound arguments or ${C('ModelState')}.</p>`,
    clues: ['"return all validation errors at once in a standard format" → ValidationProblemDetails', '"run code before and after every controller action" → action filter', '"filter vs middleware?"', '"cross-field validation" → IValidatableObject / FluentValidation', '"why is my action never called with invalid input?" → [ApiController] automatic 400'],
    code: web(`
public sealed class TimingFilter(ILogger<TimingFilter> log) : IAsyncActionFilter
{
    public async Task OnActionExecutionAsync(ActionExecutingContext ctx, ActionExecutionDelegate next)
    {
        var sw = Stopwatch.StartNew();
        var executed = await next();                       // runs the action (and inner filters)
        log.LogInformation("{Action} took {Ms} ms, exception: {Failed}",
            ctx.ActionDescriptor.DisplayName, sw.ElapsedMilliseconds, executed.Exception is not null);
    }
}
builder.Services.AddControllers(o => o.Filters.Add<TimingFilter>());`),
    codeTitle: 'An async action filter (ASP.NET Core, not compiled here)',
    viz: flowViz('Filter pipeline around an action', [bx('mw', 'Middleware', 8, 30, 12), bx('af', 'Authorization filters', 28, 10, 18), bx('rf', 'Resource filters', 28, 50, 16), bx('mb', 'Model binding + validation', 52, 30, 20), bx('acf', 'Action filters', 74, 10, 14), bx('a', 'Action', 92, 30, 10), bx('res', 'Result filters', 74, 50, 14)], [['mw', 'af'], ['af', 'rf'], ['rf', 'mb'], ['mb', 'acf'], ['acf', 'a'], ['a', 'res']], [
      { n: 'POST /users with body <code>{"name":"","email":"x","age":10}</code>. Middleware ran; routing chose <code>UsersController.Create</code>.', hl: ['mw'] },
      { n: '<b>Authorization filters</b> run first. The user has a valid token → continue.', hl: ['af'], e: ['mw-af'] },
      { n: '<b>Resource filters</b> could serve a cached response here and skip everything else. Nothing cached.', hl: ['rf'], e: ['af-rf'] },
      { n: '<b>Model binding</b> reads JSON into <code>CreateUser</code>, then <b>validation</b> runs every attribute and records errors in ModelState.', hl: ['mb'], e: ['rf-mb'], extra: [{ type: 'map', label: 'ModelState errors', entries: [['Name', 'required'], ['Email', 'not a valid e-mail'], ['Age', 'must be 18-120']], hl: { Name: 'bad', Email: 'bad', Age: 'bad' } }] },
      { n: '<code>[ApiController]</code> registers an action filter that checks ModelState first: invalid → it sets the result to a <b>400 ValidationProblemDetails</b> and the action never runs.', hl: ['acf'], bad: ['a'], e: ['mb-acf'] },
      { n: '<b>Result filters</b> still run around writing the 400 (e.g. adding a header). The client receives every error at once.', hl: ['res'], extra: [note('Response', '400 · application/problem+json · errors: Name, Email, Age')] }
    ]),
    examples: [
      { title: 'IValidatableObject for cross-field rules', html: `<p>Cross-field rules (end after start) run after all the property attributes have passed.</p>`, code: `
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

public sealed class Booking : IValidatableObject
{
    [Required] public string Room { get; set; } = "";
    public DateOnly From { get; set; }
    public DateOnly To { get; set; }
    public IEnumerable<ValidationResult> Validate(ValidationContext ctx)
    {
        if (To <= From) yield return new ValidationResult("To must be after From.", new[] { nameof(To) });
    }
}` },
      { title: 'Turning off the automatic 400', html: `<p>${C('builder.Services.Configure<ApiBehaviorOptions>(o => o.SuppressModelStateInvalidFilter = true)')} — then you check ${C('ModelState.IsValid')} yourself. Or customise the response with ${C('InvalidModelStateResponseFactory')}.</p>` },
      { title: 'Endpoint filter as a validator', html: `<p>A reusable endpoint filter that validates any argument with data annotations:</p>`, code: web(`
public sealed class ValidateFilter<T> : IEndpointFilter where T : class
{
    public async ValueTask<object?> InvokeAsync(EndpointFilterInvocationContext ctx, EndpointFilterDelegate next)
    {
        var arg = ctx.Arguments.OfType<T>().First();
        var results = new List<ValidationResult>();
        if (!Validator.TryValidateObject(arg, new ValidationContext(arg), results, validateAllProperties: true))
            return TypedResults.ValidationProblem(results
                .GroupBy(r => r.MemberNames.FirstOrDefault() ?? "")
                .ToDictionary(g => g.Key, g => g.Select(r => r.ErrorMessage!).ToArray()));
        return await next(ctx);
    }
}
app.MapPost("/users", Create).AddEndpointFilter<ValidateFilter<CreateUser>>();`) }
    ],
    deepDive: `<p><b>How Validator works.</b> ${C('Validator.TryValidateObject(obj, ctx, results, validateAllProperties: true)')} visits each property; for each it runs ${C('[Required]')} <b>first</b> and, if that fails, skips the property's other attributes (so an empty email reports "required", not also "invalid email"). Without ${C('validateAllProperties: true')} only ${C('[Required]')} is checked — a famous trap. It does not recurse into nested objects; MVC's validation visitor does.</p>
<p><b>Attribute semantics.</b> ${C('[Required]')} on a string rejects null, empty and whitespace (unless ${C('AllowEmptyStrings')}). ${C('[EmailAddress]')} only checks for one ${C('@')} that is neither first nor last; ${C('[StringLength]')} and ${C('[Range]')} treat null as valid. Non-nullable reference properties are implicitly required in MVC when nullable reference types are enabled.</p>
<p><b>Filter lifetimes.</b> ${C('Filters.Add<T>()')} creates the filter via ${C('ActivatorUtilities')}; ${C('[ServiceFilter(typeof(T))]')} resolves it from DI (register it), ${C('[TypeFilter]')} creates it with DI arguments. Filter instances added as objects are shared singletons — keep them stateless.</p>
<p><b>Short-circuiting.</b> Setting ${C('context.Result')} in an action filter's "executing" phase skips the action and inner filters; outer filters still see the result on the way out, and the short-circuiting filter's own "executed" phase does not run.</p>`,
    aiEra: `<p><b>What AI changes:</b> validation rules and filters are boilerplate an assistant writes well. <b>Where AI goes wrong:</b> it calls ${C('TryValidateObject')} without ${C('validateAllProperties')}, builds custom error JSON instead of ProblemDetails, validates in the controller after ${C('[ApiController]')} already did, and puts HTTP concerns (status codes) into domain code. <b>How to work with it:</b> ask for tests covering each rule and the exact 400 body. <b>What you still own:</b> which rules belong to input validation (shape) vs. the domain (business invariants).</p>`,
    problems: [{
      title: 'Data-Annotation Validation Errors',
      level: 'Easy', tags: ['validation', 'attributes', 'DataAnnotations'], companies: ['Microsoft', 'Infosys', 'EPAM'],
      statement: `<p>Validate a ${C('CreateUser')} DTO with real ${C('System.ComponentModel.DataAnnotations')} attributes and return the errors as ${C('"field: message"')} strings sorted ordinally, with camelCase field names (as a JSON API would). Rules and messages:</p>
<ul><li>Name: required → ${C('"is required"')}; at most 20 characters → ${C('"max 20 chars"')}.</li>
<li>Email: required → ${C('"is required"')}; e-mail format (${C('[EmailAddress]')}) → ${C('"is not a valid email"')}.</li>
<li>Age: 18 to 120 → ${C('"must be 18-120"')}.</li></ul>
<p>Return an empty array when valid.</p>`,
      constraints: `Strings are non-null; they may be empty or whitespace.`,
      example: `<p>${C('Validate("", "", 10)')} → ${H.c('r', '["age: must be 18-120", "email: is required", "name: is required"]')} — Required failed, so the email format check is skipped.</p>`,
      brute: { why: `<p>Hand-written ${C('if')} chains duplicate the rules for every DTO and drift from the attributes that OpenAPI and the client see. Attributes keep rules in one place.</p>`, code: `
using System.Collections.Generic;

static class ManualRules
{
    public static List<string> Check(string name, int age)
    {
        var errors = new List<string>();
        if (name.Length == 0) errors.Add("name: is required");      // misses whitespace-only names
        if (age < 18 || age > 120) errors.Add("age: must be 18-120");
        return errors;
    }
}` },
      mcq: { q: '<code>Validator.TryValidateObject(dto, ctx, results)</code> without the last argument checks…', options: ['Only [Required] attributes', 'All attributes', 'Nothing', 'Only [Range] attributes'], answer: 0, explain: 'validateAllProperties defaults to false, which checks only RequiredAttribute. Pass true to run every attribute.' },
      hints: [`<p>Hint 1: put ${C('[Required]')}, ${C('[StringLength]')}, ${C('[EmailAddress]')}, ${C('[Range]')} with ${C('ErrorMessage = "..."')} on the properties.</p>`, `<p>Hint 2: call ${C('Validator.TryValidateObject(dto, new ValidationContext(dto), results, validateAllProperties: true)')}.</p>`, `<p>Hint 3: each ${C('ValidationResult')} has ${C('MemberNames')}; lower-case the first letter, prepend it to the message and sort with ${C('StringComparer.Ordinal')}.</p>`],
      tests: { sig: 'string string int -> string[]', fn: 'validate', cases: [
        [['Ann', 'ann@x.io', 30], []],
        [['', '', 10], ['age: must be 18-120', 'email: is required', 'name: is required']],
        [['ThisNameIsWayTooLongForUs', 'bob@', 18], ['email: is not a valid email', 'name: max 20 chars']],
        [['  ', 'a@b', 121], ['age: must be 18-120', 'name: is required']],
        [['Bo', '@bo.com', 120], ['email: is not a valid email']],
        [['Al', 'a@b@c', 17], ['age: must be 18-120', 'email: is not a valid email']],
        [['12345678901234567890', 'x@y', 18], []]
      ] },
      solution: {
        approach: `<p>Declare the rules as attributes on the DTO and let ${C('Validator')} run them all. Map each result's member name to camelCase and sort, so the output is stable like a ${C('ValidationProblemDetails')} dictionary.</p>`,
        code: `
using System.ComponentModel.DataAnnotations;

public sealed class CreateUser
{
    [Required(ErrorMessage = "is required")]
    [StringLength(20, ErrorMessage = "max 20 chars")]
    public string Name { get; set; } = "";

    [Required(ErrorMessage = "is required")]
    [EmailAddress(ErrorMessage = "is not a valid email")]
    public string Email { get; set; } = "";

    [Range(18, 120, ErrorMessage = "must be 18-120")]
    public int Age { get; set; }
}

public class Solution
{
    public static string[] Validate(string name, string email, int age)
    {
        var dto = new CreateUser { Name = name, Email = email, Age = age };
        var results = new List<ValidationResult>();
        Validator.TryValidateObject(dto, new ValidationContext(dto), results, validateAllProperties: true);
        return results
            .Select(r =>
            {
                string member = r.MemberNames.First();
                return char.ToLowerInvariant(member[0]) + member[1..] + ": " + r.ErrorMessage;
            })
            .OrderBy(s => s, StringComparer.Ordinal)
            .ToArray();
    }
}`,
        dry: { head: ['property', 'value', 'Required', 'other attribute', 'error'], rows: [['Name', '""', 'fails', 'skipped', 'name: is required'], ['Email', '""', 'fails', 'skipped', 'email: is required'], ['Age', '10', '—', 'Range fails', 'age: must be 18-120']] },
        complexity: `<p>O(attributes) per object; the attribute lookup is cached per type by the framework.</p>`,
        followUps: ['Add <code>IValidatableObject</code> so an email at "example.com" is rejected for adults only.', 'Group the errors into <code>Dictionary&lt;string, string[]&gt;</code> like ValidationProblemDetails.']
      }
    }]
  });

  /* ======================================================================
     TOPIC 7 — Authentication and authorization
     ====================================================================== */
  topics.push({
    title: 'Authentication and Authorization: JWT and Policies',
    analogy: `<p>At a conference, the front desk checks your passport once and gives you a <b>badge</b> printed with your name, company and ticket type, stamped with a hologram nobody can fake. That is <b>authentication</b> and the badge is a <b>JWT</b>. At each room a volunteer reads the badge — "speakers only", "over 18", "VIP or staff" — that is <b>authorization</b> by <b>policy</b>. No badge: "please register first" (<b>401</b>). Valid badge, wrong room: "sorry, not for you" (<b>403</b>).</p>`,
    explain: `<p><b>Authentication</b> answers "who are you?" and builds a ${C('ClaimsPrincipal')} (${C('HttpContext.User')}). <b>Authorization</b> answers "may you do this?" by evaluating policies against those claims.</p>
<h4>1. JWT bearer authentication</h4>
${P(`
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o =>
    {
        o.Authority = "https://login.example.com/";      // OIDC discovery: issuer + signing keys
        o.Audience = "orders-api";
        o.TokenValidationParameters.ClockSkew = TimeSpan.FromSeconds(30); // default is 5 minutes
    });`)}
<p>A JWT is ${C('base64url(header).base64url(payload).base64url(signature)')}. The handler checks: the signature (with the issuer's public key for RS256/ES256, or a shared secret for HS256), ${C('iss')}, ${C('aud')}, ${C('exp')}/${C('nbf')} with clock skew, and the allowed algorithms. The payload is <b>only encoded, not encrypted</b> — anyone can read it, so never put secrets in it.</p>
<h4>2. Policies</h4>
${P(`
builder.Services.AddAuthorizationBuilder()
    .AddPolicy("Admin", p => p.RequireRole("admin"))
    .AddPolicy("EuStaff", p => p.RequireRole("staff").RequireClaim("country", "DE", "FR", "NL"))
    .AddPolicy("Adult", p => p.AddRequirements(new MinimumAgeRequirement(18)));
builder.Services.AddSingleton<IAuthorizationHandler, MinimumAgeHandler>();

app.MapDelete("/orders/{id:int}", Delete).RequireAuthorization("Admin");
// controllers: [Authorize(Policy = "Admin")], [AllowAnonymous]`)}
<p>A policy is a list of <b>requirements</b>; <b>all</b> must succeed. Each requirement can have several <b>handlers</b>; <b>any one</b> succeeding is enough (unless one calls ${C('Fail()')}). That gives AND across requirements and OR inside one requirement.</p>
<h4>3. 401 vs 403</h4>
${H.table(['Situation', 'Status', 'Who decides'], [
  ['No token, or invalid/expired token', '401 Unauthorized + WWW-Authenticate', 'authentication handler "challenge"'],
  ['Valid token, policy fails', '403 Forbidden', 'authentication handler "forbid"'],
  ['Policy passes', 'endpoint runs', '—']
])}`,
    clues: ['"secure an API with tokens from Entra ID / Auth0 / Keycloak" → AddJwtBearer + Authority/Audience', '"only admins or the owner can edit" → policy with requirement + resource-based handler', '"401 or 403?"', '"token still accepted 4 minutes after expiry" → ClockSkew default 5 min', '"role vs claim vs policy"'],
    code: web(`
public sealed record MinimumAgeRequirement(int Age) : IAuthorizationRequirement;

public sealed class MinimumAgeHandler : AuthorizationHandler<MinimumAgeRequirement>
{
    protected override Task HandleRequirementAsync(AuthorizationHandlerContext ctx, MinimumAgeRequirement req)
    {
        var claim = ctx.User.FindFirst("age");
        if (claim is not null && int.TryParse(claim.Value, out var age) && age >= req.Age)
            ctx.Succeed(req);           // not calling Succeed simply means "this handler did not approve"
        return Task.CompletedTask;
    }
}`),
    codeTitle: 'A custom requirement and handler (ASP.NET Core, not compiled here)',
    viz: flowViz('Authenticate, then authorize', [bx('c', 'Client + JWT', 8, 30, 14), bx('an', 'JwtBearer handler', 32, 30, 18), bx('u', 'HttpContext.User', 56, 10, 18), bx('pol', 'Policy "EuStaff"', 56, 50, 18), bx('ok', 'Endpoint', 86, 10, 12), bx('no', '403 Forbidden', 86, 50, 14)], [['c', 'an'], ['an', 'u'], ['u', 'pol'], ['pol', 'ok'], ['pol', 'no']], [
      { n: 'Request with <code>Authorization: Bearer eyJ...</code>. Authentication middleware asks the default scheme (JwtBearer) to authenticate.', hl: ['c'], e: ['c-an'] },
      { n: 'The handler splits the token, checks the <b>signature</b> with the issuer key, then <b>iss</b>, <b>aud</b>, <b>exp/nbf</b> (± clock skew). Any failure → anonymous user (and later a 401 challenge).', hl: ['an'], extra: [{ type: 'table', label: 'Token checks', columns: ['check', 'result'], rows: [['signature (RS256)', '✓'], ['iss = login.example.com', '✓'], ['aud = orders-api', '✓'], ['exp 12:05 vs now 12:01', '✓']] }] },
      { n: 'Success: claims become <code>HttpContext.User</code>.', hl: ['u'], cls: 'ok', e: ['an-u'], extra: [{ type: 'map', label: 'Claims', entries: [['sub', 'alice'], ['role', 'staff'], ['country', 'US']] }] },
      { n: 'Authorization middleware loads the endpoint’s policy <b>EuStaff</b>: requirement 1 RolesAuthorization(staff), requirement 2 ClaimsAuthorization(country ∈ DE, FR, NL).', hl: ['pol'], e: ['u-pol'] },
      { n: 'Requirement 1 succeeds (role = staff). Requirement 2 fails (country = US). <b>All</b> requirements must pass.', hl: ['pol'], cls: 'bad', extra: [{ type: 'table', label: 'Requirements', columns: ['requirement', 'result'], rows: [['role staff', '✓'], ['country in DE/FR/NL', '✗']], hl: { 1: 'bad' } }] },
      { n: 'The user <b>is</b> authenticated but not allowed → the scheme’s <b>Forbid</b> → <b>403</b>. (An anonymous user would get <b>Challenge</b> → 401.)', bad: ['no'], e: ['pol-no'] }
    ]),
    examples: [
      { title: 'Resource-based authorization', html: `<p>"Only the owner may edit this document" needs the document, which exists only after loading it. Inject ${C('IAuthorizationService')} and call ${C('AuthorizeAsync(User, doc, "EditPolicy")')} inside the handler; a handler for ${C('AuthorizationHandler<OwnerRequirement, Document>')} compares ${C('doc.OwnerId')} with the user's ${C('sub')}.</p>` },
      { title: 'Fallback and default policies', html: `<p>${C('FallbackPolicy')} applies to endpoints with <b>no</b> authorization metadata — set it to require authenticated users so new endpoints are secure by default; opt out with ${C('[AllowAnonymous]')}.</p>`, code: web(`
builder.Services.AddAuthorizationBuilder()
    .SetFallbackPolicy(new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build());`) },
      { title: 'Reading a JWT payload in plain C#', html: `<p>Decoding is easy; <b>trusting</b> it requires checking the signature. Base64url uses ${C('-')} and ${C('_')} and drops padding.</p>`, code: `
using System;
using System.Text;

class Program
{
    static string B64UrlDecode(string s)
    {
        string b = s.Replace('-', '+').Replace('_', '/');
        b += new string('=', (4 - b.Length % 4) % 4);
        return Encoding.UTF8.GetString(Convert.FromBase64String(b));
    }
    static void Main()
    {
        string token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJib2IiLCJhdWQiOiJhcGkiLCJuYmYiOjAsImV4cCI6NTAwMH0.sig";
        Console.WriteLine(B64UrlDecode(token.Split('.')[1]));   // {"sub":"bob","aud":"api","nbf":0,"exp":5000}
    }
}`, run: true }
    ],
    deepDive: `<p><b>Signing algorithms.</b> Prefer asymmetric keys (RS256/ES256): the identity provider signs with a private key and APIs validate with public keys fetched from the ${C('jwks_uri')} (cached and rotated automatically). HS256 means every validator holds the secret that can also <b>mint</b> tokens. Historic attacks: ${C('alg: none')} and RS→HS confusion; the handler only accepts algorithms valid for the configured keys, and you can pin ${C('ValidAlgorithms')}.</p>
<p><b>Token lifetime.</b> JWTs cannot be revoked before ${C('exp')}; keep access tokens short (5–60 min) and use refresh tokens, or introspection / reference tokens when instant revocation matters. ${C('ClockSkew')} defaults to <b>5 minutes</b>, so an "expired" token is still accepted for a while.</p>
<p><b>Claims mapping.</b> The handler historically mapped short claim names to long URIs (${C('sub')} → ${C('ClaimTypes.NameIdentifier')}); in .NET 8 the default ${C('JsonWebTokenHandler')} still maps unless ${C('MapInboundClaims = false')}. Role checks use ${C('RoleClaimType')} — set it to ${C('"role"')} or ${C('"roles"')} to match your IdP.</p>
<p><b>Multiple schemes.</b> APIs can accept cookies and bearer tokens; ${C('AuthenticationSchemes')} on a policy picks which schemes produce the user. Authorization results are evaluated per request; policies can be built dynamically with ${C('IAuthorizationPolicyProvider')} (for example ${C('[MinAge(21)]')} → policy "MinAge21").</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants generate JWT set-up and policy code quickly. <b>Where AI goes wrong:</b> it writes HS256 with a short hard-coded secret, sets ${C('ValidateIssuer = false')}/${C('ValidateAudience = false')} "to make it work", decodes the token without validating, stores passwords or PII in claims, and returns 401 where 403 is right. <b>How to work with it:</b> ask for an explicit threat list (expired, wrong audience, alg none, tampered payload) and tests for each. <b>What you still own:</b> token lifetimes, key management, and what each policy actually protects.</p>`,
    problems: [{
      title: 'Policy Evaluator: 401, 403 or 200',
      level: 'Medium', tags: ['authorization', 'policies', 'claims'], companies: ['Microsoft', 'Okta', 'Amazon'],
      statement: `<p>Claims are ${C('"type=value"')} strings (a type may repeat, like role). No claims means the user is anonymous. Evaluate ${C('policy')} and return ${C('"200"')}, ${C('"401"')} (anonymous) or ${C('"403"')} (authenticated, policy failed); an unknown policy returns ${C('"500 unknown policy"')}.</p>
<ul><li><b>Authenticated</b>: any authenticated user.</li><li><b>Admin</b>: role = admin.</li><li><b>Adult</b>: an ${C('age')} claim that parses to an int ≥ 18.</li><li><b>EuStaff</b>: role = staff <b>and</b> country ∈ {DE, FR, NL}.</li><li><b>AdminOrOwner</b>: one requirement with two handlers — role = admin <b>or</b> owner = true.</li></ul>
<p>Claim types and values are compared case-sensitively.</p>`,
      constraints: `≤ 50 claims.`,
      example: `<p>${C('["sub=2","role=staff","country=US"]')} with EuStaff → ${H.c('r', '"403"')}: the user is known, but the country requirement fails.</p>`,
      brute: { why: `<p>One ${C('if')} chain per policy name mixes "who is it" with "what is allowed" and cannot express OR inside a requirement or reuse requirements. Modelling requirements and handlers gives AND/OR composition for free.</p>`, code: `
static class IfChain
{
    public static string Admin(string[] claims) =>
        claims.Length == 0 ? "401" : System.Array.IndexOf(claims, "role=admin") >= 0 ? "200" : "403";
}` },
      mcq: { q: 'A policy has two requirements; requirement B has handlers H1 and H2. When does the policy succeed?', options: ['Requirement A succeeds AND (H1 OR H2 succeeds for B)', 'A OR B succeeds', 'All handlers succeed', 'H1 AND H2 succeed'], answer: 0, explain: 'Every requirement in a policy must be satisfied; a requirement is satisfied when any of its handlers calls Succeed (and none calls Fail).' },
      hints: [`<p>Hint 1: parse claims into a list of ${C('(Type, Value)')} pairs; an empty list is anonymous → 401 before looking at the policy.</p>`, `<p>Hint 2: model a requirement as a list of handler functions ${C('Func<Claims, bool>')}; a policy is a list of requirements.</p>`, `<p>Hint 3: policy passes when ${C('requirements.All(r => r.Any(h => h(user)))')}; ${C('int.TryParse')} guards the age claim.</p>`],
      tests: { sig: 'string[] string -> string', fn: 'authorize', cases: [
        [[[], 'Admin'], '401'],
        [[['sub=1', 'role=admin'], 'Admin'], '200'],
        [[['sub=1', 'role=user'], 'Admin'], '403'],
        [[['sub=2', 'role=user', 'role=staff', 'country=FR'], 'EuStaff'], '200'],
        [[['sub=2', 'role=staff', 'country=US'], 'EuStaff'], '403'],
        [[['sub=3', 'age=17'], 'Adult'], '403'],
        [[['sub=3', 'age=18'], 'Adult'], '200'],
        [[['sub=4', 'age=abc'], 'Adult'], '403'],
        [[['sub=5', 'owner=true'], 'AdminOrOwner'], '200'],
        [[['sub=5'], 'Authenticated'], '200'],
        [[['sub=5'], 'Nope'], '500 unknown policy'],
        [[['sub=6', 'role=Admin'], 'Admin'], '403'],
        [[[], 'Nope'], '401']
      ] },
      solution: {
        approach: `<p>Build a principal from the claims. A policy is a list of requirements, each a list of handlers: AND across requirements, OR across handlers. Anonymous users are rejected with 401 before policy evaluation, as the authorization middleware challenges them.</p>`,
        code: `
public sealed record Claim(string Type, string Value);

public sealed class Principal(IReadOnlyList<Claim> claims)
{
    public bool IsAuthenticated => claims.Count > 0;
    public bool Has(string type, string value) => claims.Any(c => c.Type == type && c.Value == value);
    public string? Find(string type) => claims.FirstOrDefault(c => c.Type == type)?.Value;
}

public class Solution
{
    // requirement = list of handlers (OR); policy = list of requirements (AND)
    static readonly Dictionary<string, List<List<Func<Principal, bool>>>> Policies = new()
    {
        ["Authenticated"] = new() { new() { u => u.IsAuthenticated } },
        ["Admin"] = new() { new() { u => u.Has("role", "admin") } },
        ["Adult"] = new() { new() { u => int.TryParse(u.Find("age"), out int age) && age >= 18 } },
        ["EuStaff"] = new()
        {
            new() { u => u.Has("role", "staff") },
            new() { u => u.Has("country", "DE") || u.Has("country", "FR") || u.Has("country", "NL") }
        },
        ["AdminOrOwner"] = new() { new() { u => u.Has("role", "admin"), u => u.Has("owner", "true") } }
    };

    public static string Authorize(string[] claims, string policy)
    {
        var user = new Principal(claims.Select(c => { int eq = c.IndexOf('='); return new Claim(c[..eq], c[(eq + 1)..]); }).ToList());
        if (!user.IsAuthenticated) return "401";                       // challenge
        if (!Policies.TryGetValue(policy, out var requirements)) return "500 unknown policy";
        bool allowed = requirements.All(handlers => handlers.Any(h => h(user)));
        return allowed ? "200" : "403";                               // forbid
    }
}`,
        dry: { head: ['claims', 'policy', 'requirement results', 'status'], rows: [['(none)', 'Admin', '— (anonymous)', '401'], ['role=staff, country=FR', 'EuStaff', 'staff ✓, country ✓', '200'], ['role=staff, country=US', 'EuStaff', 'staff ✓, country ✗', '403'], ['owner=true', 'AdminOrOwner', 'admin ✗ OR owner ✓', '200']] },
        complexity: `<p>O(R · H · C) for R requirements, H handlers and C claims — tiny in practice.</p>`,
        followUps: ['Add a handler that can veto with Fail() even if another handler succeeded.', 'Make Adult a parameterised MinimumAge(n) requirement built from the policy name.']
      }
    }]
  });

  /* ======================================================================
     TOPIC 8 — Logging and ProblemDetails errors
     ====================================================================== */
  topics.push({
    title: 'Logging and ProblemDetails Errors',
    analogy: `<p>A ship keeps a <b>logbook</b>: each line has a time, who wrote it, how serious it is, and filled-in fields ("speed: 12 knots") instead of free prose, so later anyone can search "all entries where speed &gt; 20". When something goes wrong with a passenger, the crew does not hand them the engine-room report; they give a <b>standard incident card</b>: what kind of problem, a short title, a reference number to quote. That card is <b>ProblemDetails</b>; the reference number is the <b>trace id</b> that links it to the logbook.</p>`,
    explain: `<p><b>Logging</b> in ASP.NET Core goes through ${C('ILogger<T>')}; the category is the type name. <b>Errors</b> should leave the API as RFC 9457 <b>ProblemDetails</b> JSON (${C('application/problem+json')}).</p>
<h4>1. Structured logging</h4>
${P(`
log.LogInformation("Order {OrderId} placed by {UserId} for {Total:C}", order.Id, user.Id, order.Total);
// NOT: log.LogInformation($"Order {order.Id} placed ...")  — loses the fields and allocates even when disabled`)}
<p>The <b>message template</b> keeps named placeholders as properties, so Seq, Elastic, Application Insights or OpenTelemetry can query ${C('OrderId = 42')}. Placeholders bind by <b>position</b>, not by name.</p>
${H.table(['Level', 'Use'], [['Trace / Debug', 'developer detail, off in production'], ['Information', 'normal flow: request finished, order placed'], ['Warning', 'unexpected but handled: retry, validation spike'], ['Error', 'an operation failed'], ['Critical', 'the app cannot continue']])}
<p>Filtering is configured per category prefix: ${C('"Logging:LogLevel:Microsoft.AspNetCore": "Warning"')}. The longest matching prefix wins, otherwise ${C('Default')}.</p>
<h4>2. ProblemDetails for errors</h4>
${P(`
builder.Services.AddProblemDetails(o => o.CustomizeProblemDetails = c =>
    c.ProblemDetails.Extensions["traceId"] = Activity.Current?.Id ?? c.HttpContext.TraceIdentifier);
builder.Services.AddExceptionHandler<DomainExceptionHandler>();   // .NET 8 IExceptionHandler
app.UseExceptionHandler();      // unhandled exceptions → handlers → ProblemDetails (500 by default)
app.UseStatusCodePages();       // empty 404/405 responses → ProblemDetails bodies`)}
${P(`
{ "type": "https://tools.ietf.org/html/rfc9110#section-15.5.5", "title": "Not Found",
  "status": 404, "detail": "Order 7 does not exist.", "instance": "/orders/7", "traceId": "00-4bf9..." }`)}
<p>Never leak stack traces or SQL to clients in production; log the exception server-side with the same trace id.</p>`,
    clues: ['"consistent error format for all endpoints" → ProblemDetails + AddProblemDetails', '"map domain exceptions to status codes" → IExceptionHandler', '"why not string interpolation in logs?" → structured templates', '"too many logs from Microsoft.*" → per-category LogLevel', '"correlate a user\'s error report with the logs" → traceId'],
    code: web(`
public sealed class DomainExceptionHandler(IProblemDetailsService problems, ILogger<DomainExceptionHandler> log) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext ctx, Exception ex, CancellationToken ct)
    {
        (int status, string title) = ex switch
        {
            KeyNotFoundException => (404, "Not Found"),
            ArgumentException => (400, "Bad Request"),
            _ => (0, "")
        };
        if (status == 0) return false;                       // let the next handler / default 500 deal with it
        log.LogWarning(ex, "Handled {ExceptionType} on {Path}", ex.GetType().Name, ctx.Request.Path);
        ctx.Response.StatusCode = status;
        return await problems.TryWriteAsync(new() { HttpContext = ctx, Exception = ex,
            ProblemDetails = { Status = status, Title = title, Detail = ex.Message } });
    }
}`),
    codeTitle: 'IExceptionHandler writing ProblemDetails (ASP.NET Core, not compiled here)',
    viz: flowViz('An exception becomes ProblemDetails', [bx('ep', 'Endpoint throws', 10, 30, 16), bx('eh', 'UseExceptionHandler', 36, 30, 18), bx('h1', 'DomainExceptionHandler', 64, 10, 22), bx('log', 'ILogger', 64, 50, 12), bx('pd', 'ProblemDetails 404', 90, 30, 16)], [['ep', 'eh'], ['eh', 'h1'], ['h1', 'log'], ['h1', 'pd']], [
      { n: 'GET /orders/7. The repository throws <code>KeyNotFoundException("Order 7 does not exist.")</code>.', bad: ['ep'] },
      { n: 'The exception unwinds through middleware to <b>UseExceptionHandler</b>, registered first so it wraps everything.', hl: ['eh'], e: ['ep-eh'] },
      { n: 'It calls each registered <code>IExceptionHandler</code> in order. <b>DomainExceptionHandler</b> pattern-matches: <code>KeyNotFoundException</code> → 404.', hl: ['h1'], e: ['eh-h1'], extra: [{ type: 'table', label: 'Mapping (first match wins)', columns: ['exception', 'status'], rows: [['ArgumentException (+ subclasses)', '400'], ['KeyNotFoundException', '404'], ['UnauthorizedAccessException', '403'], ['anything else', '500']], hl: { 1: 'sel' } }] },
      { n: 'It logs with a <b>template</b>: properties ExceptionType = KeyNotFoundException, Path = /orders/7, plus the trace id from the current Activity.', hl: ['log'], e: ['h1-log'], extra: [{ type: 'map', label: 'Log event properties', entries: [['Level', 'Warning'], ['ExceptionType', 'KeyNotFoundException'], ['Path', '/orders/7'], ['TraceId', '00-4bf9…']] }] },
      { n: 'The client gets <code>application/problem+json</code> with status, title, detail, instance and the same traceId — enough to report, nothing internal leaked.', ok: ['pd'], e: ['h1-pd'], extra: [note('Body', '{ "status": 404, "title": "Not Found", "detail": "Order 7 does not exist.", "instance": "/orders/7", "traceId": "00-4bf9…" }')] }
    ]),
    examples: [
      { title: 'High-performance logging with LoggerMessage', html: `<p>The source generator creates a cached, strongly typed method with an ${C('IsEnabled')} check — no boxing, no params array.</p>`, code: web(`
public static partial class Log
{
    [LoggerMessage(EventId = 1001, Level = LogLevel.Information, Message = "Order {OrderId} placed by {UserId}")]
    public static partial void OrderPlaced(ILogger logger, int orderId, string userId);
}
Log.OrderPlaced(logger, order.Id, user.Id);`) },
      { title: 'Scopes add context to every line', html: `<p>${C('using (log.BeginScope("Order {OrderId}", id)) { ... }')} attaches OrderId to every log inside the block — the correlation-id middleware in topic 1 uses this.</p>` },
      { title: 'Results.Problem in endpoints', html: `<p>For expected failures, return a problem instead of throwing: ${C('TypedResults.Problem(detail: "Out of stock", statusCode: 409)')} or ${C('TypedResults.ValidationProblem(errors)')}. Exceptions are for the unexpected.</p>` }
    ],
    deepDive: `<p><b>Cost of logging.</b> ${C('LogInformation(template, args)')} boxes value types and allocates an ${C('object[]')} even if the level is disabled; the template is parsed once and cached. ${C('[LoggerMessage]')} or ${C('if (log.IsEnabled(...))')} avoid that on hot paths. String interpolation is worst: it formats the string even when nothing is written and destroys the structure.</p>
<p><b>Providers and filters.</b> ${C('ILoggerFactory')} fans each event to providers (Console, Debug, EventSource, OpenTelemetry, Serilog…). Filter rules are chosen per provider and category: the most specific provider match, then the <b>longest category prefix</b>, then Default; the minimum level defaults to Information.</p>
<p><b>Observability.</b> ASP.NET Core creates an ${C('Activity')} per request (W3C ${C('traceparent')}); OpenTelemetry exports traces, metrics and logs with the same trace id, so a ProblemDetails ${C('traceId')} leads straight to the distributed trace.</p>
<p><b>Exception handler details.</b> ${C('UseExceptionHandler')} re-executes a path or calls ${C('IExceptionHandler')}s in registration order until one returns true; if none handles it, ${C('IProblemDetailsService')} writes a 500. It cannot help if the response has already started. ${C('UseDeveloperExceptionPage')} (on by default in Development) shows the stack trace — never in production.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants add logs everywhere, quickly. <b>Where AI goes wrong:</b> interpolated log messages, logging whole request bodies (PII, tokens), catching every exception in the controller and returning 200 with an error string, inventing a custom error JSON instead of ProblemDetails, and leaking ${C('ex.ToString()')} to clients. <b>How to work with it:</b> ask for templates with named properties, a log-level policy per category, and an exception-to-status table. <b>What you still own:</b> what is safe to log, alerting thresholds, and the public error contract.</p>`,
    problems: [{
      title: 'Map Exceptions to ProblemDetails',
      level: 'Easy', tags: ['exceptions', 'pattern matching', 'ProblemDetails'], companies: ['Microsoft', 'Accenture', 'JPMorgan'],
      statement: `<p>${C('ToProblem(string exType, string path)')} creates an exception of the named type (one of ArgumentException, ArgumentNullException, ArgumentOutOfRangeException, KeyNotFoundException, UnauthorizedAccessException, InvalidOperationException, ObjectDisposedException, TimeoutException, OperationCanceledException, TaskCanceledException; any other name → ${C('Exception')}) and maps it by <b>type</b>, using inheritance:</p>
<ul><li>ArgumentException family → 400 Bad Request</li><li>KeyNotFoundException → 404 Not Found</li><li>UnauthorizedAccessException → 403 Forbidden</li><li>OperationCanceledException family → 499 Client Closed Request</li><li>TimeoutException → 504 Gateway Timeout</li><li>InvalidOperationException family → 409 Conflict</li><li>anything else → 500 Internal Server Error</li></ul>
<p>Return ${C('"status title instance"')}.</p>`,
      constraints: `Paths start with "/".`,
      example: `<p>${C('ToProblem("ArgumentNullException", "/users")')} → ${H.c('g', '"400 Bad Request /users"')} because ArgumentNullException derives from ArgumentException.</p>`,
      brute: { why: `<p>Comparing ${C('ex.GetType().Name')} to strings misses subclasses: ArgumentNullException, TaskCanceledException and ObjectDisposedException would all fall to 500. Type patterns respect inheritance.</p>`, code: `
static class ByName
{
    public static int Status(System.Exception ex) => ex.GetType().Name switch
    {
        "ArgumentException" => 400,
        "KeyNotFoundException" => 404,
        _ => 500                                  // ArgumentNullException wrongly becomes 500
    };
}` },
      mcq: { q: 'Which arm order is correct in a switch over exceptions?', options: ['More derived types before their base types', 'Base types first', 'Alphabetical', 'Order does not matter in switch expressions'], answer: 0, explain: 'The first matching arm wins; the compiler even reports an error when a base type arm makes a later derived arm unreachable.' },
      hints: [`<p>Hint 1: build the exception with a ${C('switch')} on the name; default to ${C('new Exception()')}.</p>`, `<p>Hint 2: map with a switch expression on the exception <b>type pattern</b> so subclasses match their base arm.</p>`, `<p>Hint 3: ObjectDisposedException is an InvalidOperationException, and TaskCanceledException is an OperationCanceledException.</p>`],
      tests: { sig: 'string string -> string', fn: 'toProblem', cases: [
        [['KeyNotFoundException', '/orders/7'], '404 Not Found /orders/7'],
        [['ArgumentNullException', '/users'], '400 Bad Request /users'],
        [['ArgumentOutOfRangeException', '/page'], '400 Bad Request /page'],
        [['UnauthorizedAccessException', '/admin'], '403 Forbidden /admin'],
        [['TaskCanceledException', '/slow'], '499 Client Closed Request /slow'],
        [['TimeoutException', '/upstream'], '504 Gateway Timeout /upstream'],
        [['ObjectDisposedException', '/x'], '409 Conflict /x'],
        [['NullReferenceException', '/bug'], '500 Internal Server Error /bug'],
        [['ArgumentException', '/'], '400 Bad Request /'],
        [['InvalidOperationException', '/cart'], '409 Conflict /cart']
      ] },
      solution: {
        approach: `<p>Create the exception, then use a switch expression with type patterns. Because ${C('ArgumentException')} and ${C('InvalidOperationException')} arms match subclasses, the inheritance tree does the work.</p>`,
        code: `
public class Solution
{
    static Exception Create(string name) => name switch
    {
        "ArgumentException" => new ArgumentException("bad"),
        "ArgumentNullException" => new ArgumentNullException("arg"),
        "ArgumentOutOfRangeException" => new ArgumentOutOfRangeException("arg"),
        "KeyNotFoundException" => new KeyNotFoundException("missing"),
        "UnauthorizedAccessException" => new UnauthorizedAccessException("no"),
        "InvalidOperationException" => new InvalidOperationException("state"),
        "ObjectDisposedException" => new ObjectDisposedException("obj"),
        "TimeoutException" => new TimeoutException("slow"),
        "OperationCanceledException" => new OperationCanceledException("cancel"),
        "TaskCanceledException" => new TaskCanceledException("cancel"),
        _ => new Exception("unknown")
    };

    public static string ToProblem(string exType, string path)
    {
        (int status, string title) = Create(exType) switch
        {
            ArgumentException => (400, "Bad Request"),
            KeyNotFoundException => (404, "Not Found"),
            UnauthorizedAccessException => (403, "Forbidden"),
            OperationCanceledException => (499, "Client Closed Request"),
            TimeoutException => (504, "Gateway Timeout"),
            InvalidOperationException => (409, "Conflict"),
            _ => (500, "Internal Server Error")
        };
        return $"{status} {title} {path}";
    }
}`,
        dry: { head: ['name', 'created', 'first matching arm', 'result'], rows: [['ArgumentNullException', 'ArgumentNullException', 'ArgumentException', '400'], ['TaskCanceledException', 'TaskCanceledException', 'OperationCanceledException', '499'], ['ObjectDisposedException', 'ObjectDisposedException', 'InvalidOperationException', '409'], ['NullReferenceException', 'Exception', '_', '500']] },
        complexity: `<p>O(1) per exception — a few type checks.</p>`,
        followUps: ['Note: OperationCanceledException derives from SystemException, not InvalidOperationException — verify each base class before ordering arms.', 'Add a "detail" that is the exception message only in Development.']
      }
    }]
  });

  /* ======================================================================
     PRACTICE ARENA
     ====================================================================== */
  practice.push({
    title: 'Status Code Describer',
    level: 'Easy', tags: ['HTTP', 'status codes', 'switch expression'], companies: ['TCS', 'Infosys', 'Microsoft'],
    statement: `<p>Write ${C('Describe(int code)')} returning ${C('"code Phrase (class)"')}. Known phrases: 200 OK, 201 Created, 204 No Content, 301 Moved Permanently, 304 Not Modified, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 409 Conflict, 422 Unprocessable Entity, 429 Too Many Requests, 500 Internal Server Error, 503 Service Unavailable; others use ${C('Unknown')}. Classes: 1xx informational, 2xx success, 3xx redirection, 4xx client error, 5xx server error. Codes outside 100–599 return ${C('"code invalid"')}.</p>`,
    constraints: `-10<sup>9</sup> ≤ code ≤ 10<sup>9</sup>.`,
    example: `<p>${C('Describe(404)')} → ${H.c('g', '"404 Not Found (client error)"')}; ${C('Describe(418)')} → ${H.c('g', '"418 Unknown (client error)"')}.</p>`,
    brute: { why: `<p>A long ${C('if/else')} ladder per code repeats the class logic for every phrase. Split the problem: a lookup for the phrase, integer division for the class.</p>`, code: `
static class Ladder
{
    public static string Describe(int code)
    {
        if (code == 200) return "200 OK (success)";
        if (code == 404) return "404 Not Found (client error)";
        return code + " Unknown";   // and dozens more branches
    }
}` },
    mcq: { q: 'A request has no token at all. Which status should an API return?', options: ['401 Unauthorized', '403 Forbidden', '400 Bad Request', '404 Not Found'], answer: 0, explain: '401 means "not authenticated" (despite the name). 403 is for an authenticated caller who is not allowed.' },
    hints: [`<p>Hint 1: check the 100–599 range first and return early for anything outside it.</p>`, `<p>Hint 2: ${C('code / 100')} gives the class digit; a switch expression maps 1..5 to the class text.</p>`, `<p>Hint 3: a ${C('Dictionary<int, string>')} or switch expression holds the phrases; ${C('GetValueOrDefault(code, "Unknown")')} handles the rest.</p>`],
    tests: { sig: 'int -> string', fn: 'describe', cases: [
      [[404], '404 Not Found (client error)'],
      [[201], '201 Created (success)'],
      [[503], '503 Service Unavailable (server error)'],
      [[418], '418 Unknown (client error)'],
      [[100], '100 Unknown (informational)'],
      [[99], '99 invalid'],
      [[600], '600 invalid'],
      [[304], '304 Not Modified (redirection)'],
      [[429], '429 Too Many Requests (client error)'],
      [[-1], '-1 invalid']
    ] },
    solution: {
      approach: `<p>Validate the range, look up the phrase, derive the class from the hundreds digit.</p>`,
      code: `
public class Solution
{
    static readonly Dictionary<int, string> Phrases = new()
    {
        [200] = "OK", [201] = "Created", [204] = "No Content", [301] = "Moved Permanently", [304] = "Not Modified",
        [400] = "Bad Request", [401] = "Unauthorized", [403] = "Forbidden", [404] = "Not Found", [409] = "Conflict",
        [422] = "Unprocessable Entity", [429] = "Too Many Requests", [500] = "Internal Server Error", [503] = "Service Unavailable"
    };

    public static string Describe(int code)
    {
        if (code < 100 || code > 599) return $"{code} invalid";
        string cls = (code / 100) switch
        {
            1 => "informational", 2 => "success", 3 => "redirection", 4 => "client error", _ => "server error"
        };
        return $"{code} {Phrases.GetValueOrDefault(code, "Unknown")} ({cls})";
    }
}`,
      complexity: `<p>O(1): one range check and one dictionary lookup.</p>`
    }
  });

  practice.push({
    title: 'Environment Variable to Configuration Key',
    level: 'Easy', tags: ['configuration', 'strings'], companies: ['Microsoft', 'Wipro', 'Red Hat'],
    statement: `<p>Mimic ${C('AddEnvironmentVariables(prefix)')}. ${C('ToConfigKey(string envVar, string prefix)')} returns the configuration key: if the name starts with the prefix (case-insensitive), remove it and replace every ${C('"__"')} with ${C('":"')} (left to right, non-overlapping). If the name does not start with the prefix, return ${C('""')} (ignored). An empty prefix accepts every variable.</p>`,
    constraints: `Names are ASCII, length ≤ 200.`,
    example: `<p>${C('ToConfigKey("MYAPP_Logging__LogLevel__Default", "MYAPP_")')} → ${H.c('g', '"Logging:LogLevel:Default"')}</p>`,
    brute: { why: `<p>Splitting on ${C('"_"')} and re-joining breaks names that contain single underscores (${C('MAX_SIZE')}) and loses odd runs like ${C('"___"')}. ${C('string.Replace("__", ":")')} has exactly the provider's semantics.</p>`, code: `
static class Wrong
{
    public static string Key(string env) => string.Join(":", env.Split('_', System.StringSplitOptions.RemoveEmptyEntries));
}` },
    mcq: { q: 'Why does the env provider use <code>__</code> instead of <code>:</code>?', options: ['Colons are not valid in environment variable names on all platforms and shells', 'Underscores are faster to parse', 'Because JSON uses __', 'For backwards compatibility with web.config'], answer: 0, explain: 'Bash and many orchestrators do not allow ":" in variable names, so a double underscore stands for the hierarchy separator.' },
    hints: [`<p>Hint 1: ${C('StartsWith(prefix, StringComparison.OrdinalIgnoreCase)')}.</p>`, `<p>Hint 2: take the substring after the prefix length.</p>`, `<p>Hint 3: ${C('Replace("__", ":")')} scans left to right, so ${C('"A___B"')} becomes ${C('"A:_B"')}.</p>`],
    tests: { sig: 'string string -> string', fn: 'toConfigKey', cases: [
      [['MYAPP_Logging__LogLevel__Default', 'MYAPP_'], 'Logging:LogLevel:Default'],
      [['PATH', 'MYAPP_'], ''],
      [['myapp_Db__Port', 'MYAPP_'], 'Db:Port'],
      [['ConnectionStrings__Main', ''], 'ConnectionStrings:Main'],
      [['MYAPP_', 'MYAPP_'], ''],
      [['A___B', ''], 'A:_B'],
      [['MYAPP_Kestrel__Endpoints__Http__Url', 'MYAPP_'], 'Kestrel:Endpoints:Http:Url'],
      [['MAX_SIZE', ''], 'MAX_SIZE']
    ] },
    solution: {
      approach: `<p>Filter by prefix (case-insensitive), strip it, then replace double underscores.</p>`,
      code: `
public class Solution
{
    public static string ToConfigKey(string envVar, string prefix)
    {
        if (!envVar.StartsWith(prefix, StringComparison.OrdinalIgnoreCase)) return "";
        return envVar[prefix.Length..].Replace("__", ":");
    }
}`,
      complexity: `<p>O(length) for the prefix check and the replace.</p>`
    }
  });

  practice.push({
    title: 'Is This Log Level Enabled?',
    level: 'Easy', tags: ['logging', 'configuration', 'prefix match'], companies: ['Microsoft', 'Datadog', 'Infosys'],
    statement: `<p>Rules are ${C('"Category=Level"')} like ${C('Logging:LogLevel')} entries; ${C('"Default=..."')} is the fallback. Levels in order: Trace, Debug, Information, Warning, Error, Critical, None. For a category, the rule with the <b>longest</b> category that is a prefix of it (case-insensitive) wins; else Default; else Information. Return whether ${C('level')} is enabled: ${C('level >= minimum')} and the minimum is not None.</p>`,
    constraints: `≤ 100 rules. level is never None.`,
    example: `<p>Rules ${C('["Default=Information","Microsoft=Warning","Microsoft.Hosting.Lifetime=Information"]')}: category ${C('Microsoft.AspNetCore.Routing')} at Information → ${H.c('r', 'false')} (Microsoft=Warning is the longest match).</p>`,
    brute: { why: `<p>Taking the <b>first</b> matching rule depends on JSON order and picks ${C('Microsoft')} for ${C('Microsoft.Hosting.Lifetime')}. The framework selects the most specific (longest) prefix.</p>`, code: `
static class FirstRule
{
    public static string Pick(string[] rules, string category)
    {
        foreach (var r in rules)
            if (category.StartsWith(r.Split('=')[0], System.StringComparison.OrdinalIgnoreCase)) return r;
        return "Default";
    }
}` },
    mcq: { q: 'Which minimum level applies when no rule and no Default exist?', options: ['Information', 'Trace', 'Warning', 'None'], answer: 0, explain: 'The logging builder’s default minimum level is Information.' },
    hints: [`<p>Hint 1: parse levels with ${C('Enum.Parse<LogLevel>')} on an enum declared in the order given.</p>`, `<p>Hint 2: skip Default while matching; track the longest matching prefix.</p>`, `<p>Hint 3: enabled = ${C('min != None && level >= min')}.</p>`],
    tests: { sig: 'string[] string string -> bool', fn: 'isEnabled', cases: [
      [[['Default=Information', 'Microsoft=Warning', 'Microsoft.Hosting.Lifetime=Information', 'MyApp.Data=Debug'], 'Microsoft.AspNetCore.Routing', 'Information'], false],
      [[['Default=Information', 'Microsoft=Warning', 'Microsoft.Hosting.Lifetime=Information', 'MyApp.Data=Debug'], 'Microsoft.Hosting.Lifetime', 'Information'], true],
      [[['Default=Information', 'Microsoft=Warning', 'Microsoft.Hosting.Lifetime=Information', 'MyApp.Data=Debug'], 'MyApp.Data.OrderRepo', 'Debug'], true],
      [[['Default=Information', 'Microsoft=Warning', 'Microsoft.Hosting.Lifetime=Information', 'MyApp.Data=Debug'], 'MyApp.Api', 'Debug'], false],
      [[[], 'X', 'Information'], true],
      [[[], 'X', 'Debug'], false],
      [[['Default=None'], 'X', 'Critical'], false],
      [[['Default=Information', 'Microsoft=Warning', 'Microsoft.Hosting.Lifetime=Information', 'MyApp.Data=Debug'], 'microsoft.EntityFrameworkCore', 'Error'], true],
      [[['Default=Trace', 'Noisy=None'], 'Noisy.Worker', 'Critical'], false]
    ] },
    solution: {
      approach: `<p>Find the longest non-Default rule whose category prefixes the given one; fall back to Default, then Information; compare enum values.</p>`,
      code: `
public enum Level { Trace, Debug, Information, Warning, Error, Critical, None }

public class Solution
{
    public static bool IsEnabled(string[] rules, string category, string level)
    {
        Level? best = null, fallback = null;
        int bestLen = -1;
        foreach (var rule in rules)
        {
            int eq = rule.IndexOf('=');
            string cat = rule[..eq];
            var min = Enum.Parse<Level>(rule[(eq + 1)..]);
            if (cat == "Default") { fallback = min; continue; }
            if (category.StartsWith(cat, StringComparison.OrdinalIgnoreCase) && cat.Length > bestLen)
            {
                best = min; bestLen = cat.Length;
            }
        }
        Level minimum = best ?? fallback ?? Level.Information;
        var requested = Enum.Parse<Level>(level);
        return minimum != Level.None && requested >= minimum;
    }
}`,
      complexity: `<p>O(R · L) for R rules of length L. The framework caches the result per category.</p>`
    }
  });

  practice.push({
    title: 'Bind and Validate Paging Parameters',
    level: 'Medium', tags: ['model binding', 'query string', 'validation'], companies: ['Microsoft', 'Flipkart', 'Swiggy'],
    statement: `<p>Bind ${C('?page=&size=&sort=')} into a paging object like ${C('[AsParameters]')} would. Rules: leading ${C('?')} optional; pairs split by ${C('&')}, a pair without ${C('=')} has value ""; keys case-insensitive; names and values are URL-decoded (${C('+')} is a space); for a repeated key the <b>first</b> value wins; unknown keys ignored. Defaults page=1, size=20, sort=id. Errors, checked in the order page, size, sort and joined by ${C('"; "')} after ${C('"400 "')}:</p>
<ul><li>non-integer → ${C('"name: \'value\' is not a valid integer"')}</li><li>page &lt; 1 → ${C('"page: must be >= 1"')}; size outside 1–100 → ${C('"size: must be 1-100"')}</li><li>sort not id/name/price (case-insensitive) → ${C('"sort: must be one of id, name, price"')}</li></ul>
<p>Success returns ${C('"page=P size=S sort=s"')} with sort lower-cased.</p>`,
    constraints: `Query length ≤ 2000.`,
    example: `<p>${C('"?page=0&size=500"')} → ${H.c('r', '"400 page: must be >= 1; size: must be 1-100"')}</p>`,
    brute: { why: `<p>${C('query.Split("&")')} then ${C('int.Parse')} on whatever comes out throws on bad input (500 instead of 400), ignores encoding, and stops at the first problem. A binder collects every error and reports them together.</p>`, code: `
static class Naive
{
    public static int Page(string query) => int.Parse(query.Split('&')[0].Split('=')[1]); // throws on bad input
}` },
    mcq: { q: 'A minimal API parameter <code>int page</code> receives <code>?page=abc</code>. What does the framework return?', options: ['400 Bad Request', '500 Internal Server Error', 'page = 0', '404 Not Found'], answer: 0, explain: 'Parameter binding failures in minimal APIs produce 400 (the exception is only thrown in development with ThrowOnBadRequest).' },
    hints: [`<p>Hint 1: decode with ${C('Uri.UnescapeDataString(s.Replace("+", " "))')} and store into a case-insensitive dictionary using ${C('TryAdd')} so the first value wins.</p>`, `<p>Hint 2: write one helper ${C('BindInt(name, default, errors)')} that returns the value or records the parse error.</p>`, `<p>Hint 3: only run range checks on values that parsed; build the output only if the error list is empty.</p>`],
    tests: { sig: 'string -> string', fn: 'bindPaging', cases: [
      [['?page=2&size=50&sort=name'], 'page=2 size=50 sort=name'],
      [[''], 'page=1 size=20 sort=id'],
      [['?PAGE=3&Sort=PRICE'], 'page=3 size=20 sort=price'],
      [['?page=0&size=500'], '400 page: must be >= 1; size: must be 1-100'],
      [['?page=abc'], "400 page: 'abc' is not a valid integer"],
      [['?sort=color&size=10'], '400 sort: must be one of id, name, price'],
      [['?page=2&page=9&debug=true'], 'page=2 size=20 sort=id'],
      [['?sort=na%6De&size=7'], 'page=1 size=7 sort=name'],
      [['page=x&size=y&sort=z'], "400 page: 'x' is not a valid integer; size: 'y' is not a valid integer; sort: must be one of id, name, price"],
      [['?size=100&&page=1&flag'], 'page=1 size=100 sort=id']
    ] },
    solution: {
      approach: `<p>Parse the query into a case-insensitive first-wins dictionary, bind each field with its default, collect conversion and range errors in field order, and only produce the bound object when there are no errors — the same flow as model binding followed by validation.</p>`,
      code: `
using System.Globalization;

public sealed record Paging(int Page, int Size, string Sort);

public class Solution
{
    static readonly string[] Sorts = { "id", "name", "price" };

    static string Decode(string s) => Uri.UnescapeDataString(s.Replace('+', ' '));

    public static string BindPaging(string query)
    {
        var values = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        foreach (var pair in query.TrimStart('?').Split('&', StringSplitOptions.RemoveEmptyEntries))
        {
            int eq = pair.IndexOf('=');
            string key = Decode(eq < 0 ? pair : pair[..eq]);
            string value = eq < 0 ? "" : Decode(pair[(eq + 1)..]);
            values.TryAdd(key, value);                      // first value wins
        }

        var errors = new List<string>();
        int? BindInt(string name, int fallback)
        {
            if (!values.TryGetValue(name, out var raw)) return fallback;
            if (int.TryParse(raw, NumberStyles.Integer, CultureInfo.InvariantCulture, out int v)) return v;
            errors.Add($"{name}: '{raw}' is not a valid integer");
            return null;
        }

        int? page = BindInt("page", 1);
        if (page is < 1) errors.Add("page: must be >= 1");
        int? size = BindInt("size", 20);
        if (size is < 1 or > 100) errors.Add("size: must be 1-100");
        string sort = values.TryGetValue("sort", out var s) ? s.ToLowerInvariant() : "id";
        if (!Sorts.Contains(sort)) errors.Add("sort: must be one of id, name, price");

        if (errors.Count > 0) return "400 " + string.Join("; ", errors);
        var p = new Paging(page!.Value, size!.Value, sort);
        return $"page={p.Page} size={p.Size} sort={p.Sort}";
    }
}`,
      complexity: `<p>O(query length) for parsing and decoding; binding is O(1).</p>`
    }
  });

  practice.push({
    title: 'Action Filter Execution Order',
    level: 'Medium', tags: ['filters', 'sorting', 'stable sort'], companies: ['Microsoft', 'Accenture', 'Capgemini'],
    statement: `<p>Each spec is ${C('"Name:Scope:Order"')} or ${C('"Name:Scope:Order:!"')} where Scope is Global, Controller or Action and ${C('!')} means the filter short-circuits (sets a result) in its "executing" phase. Filters are sorted by Order ascending, then scope Global → Controller → Action, keeping input order for full ties. Output ${C('"Name before"')} for each executing phase, ${C('"action"')}, then ${C('"Name after"')} in reverse. A short-circuiting filter outputs ${C('"Name short-circuit"')} instead of "before"; the action and inner filters are skipped, its own "after" does not run, and only the filters before it run their "after" phases.</p>`,
    constraints: `≤ 50 filters; Order fits in int.`,
    example: `<p>${C('["Log:Global:0","Auth:Controller:0:!","Cache:Action:0"]')} → ${H.c('g', '["Log before","Auth short-circuit","Log after"]')}</p>`,
    brute: { why: `<p>Running filters in registration order ignores ${C('Order')} and scope. ${C('List.Sort')} is not stable either — equal filters could swap. LINQ ${C('OrderBy().ThenBy()')} is stable.</p>`, code: `
using System.Collections.Generic;

static class InOrder
{
    public static List<string> Run(string[] names)
    {
        var log = new List<string>();
        foreach (var n in names) log.Add(n + " before"); // ignores Order and scope
        log.Add("action");
        return log;
    }
}` },
    mcq: { q: 'A global filter has Order = 10 and an action filter has Order = 0. Which runs first?', options: ['The action filter — Order is compared before scope', 'The global filter — global always runs first', 'Registration order decides', 'They run in parallel'], answer: 0, explain: 'Filters are sorted by Order first; scope (global, controller, action) only breaks ties.' },
    hints: [`<p>Hint 1: parse to records ${C('(Name, ScopeRank, Order, ShortCircuit)')}.</p>`, `<p>Hint 2: ${C('OrderBy(f => f.Order).ThenBy(f => f.ScopeRank)')} is stable.</p>`, `<p>Hint 3: push each filter that ran "before" onto a stack; on short-circuit stop; then pop the stack for the "after" lines.</p>`],
    tests: { sig: 'string[] -> string[]', fn: 'runFilters', cases: [
      [[['Log:Global:0', 'Audit:Controller:0', 'Cache:Action:0']], ['Log before', 'Audit before', 'Cache before', 'action', 'Cache after', 'Audit after', 'Log after']],
      [[['Log:Global:0', 'Cache:Action:-1']], ['Cache before', 'Log before', 'action', 'Log after', 'Cache after']],
      [[[]], ['action']],
      [[['A:Action:0', 'B:Action:0']], ['A before', 'B before', 'action', 'B after', 'A after']],
      [[['Log:Global:0', 'Auth:Controller:0:!', 'Cache:Action:0']], ['Log before', 'Auth short-circuit', 'Log after']],
      [[['X:Action:5', 'Y:Global:10', 'Z:Controller:5']], ['Z before', 'X before', 'Y before', 'action', 'Y after', 'X after', 'Z after']],
      [[['S:Global:0:!']], ['S short-circuit']],
      [[['C:Action:0', 'B:Controller:0', 'A:Global:0']], ['A before', 'B before', 'C before', 'action', 'C after', 'B after', 'A after']]
    ] },
    solution: {
      approach: `<p>Stable sort by (Order, scope). Run the "before" phases, remembering each on a stack. A short-circuit ends the inward walk; otherwise the action runs. Then pop the stack for the "after" phases — the short-circuiting filter was never pushed.</p>`,
      code: `
public sealed record FilterSpec(string Name, int Scope, int Order, bool ShortCircuit);

public class Solution
{
    static int ScopeRank(string s) => s switch { "Global" => 0, "Controller" => 1, _ => 2 };

    public static string[] RunFilters(string[] specs)
    {
        var filters = specs.Select(s =>
        {
            var p = s.Split(':');
            return new FilterSpec(p[0], ScopeRank(p[1]), int.Parse(p[2]), p.Length > 3 && p[3] == "!");
        })
        .OrderBy(f => f.Order).ThenBy(f => f.Scope)        // stable
        .ToList();

        var log = new List<string>();
        var ran = new Stack<FilterSpec>();
        bool shortCircuited = false;
        foreach (var f in filters)
        {
            if (f.ShortCircuit) { log.Add(f.Name + " short-circuit"); shortCircuited = true; break; }
            log.Add(f.Name + " before");
            ran.Push(f);
        }
        if (!shortCircuited) log.Add("action");
        while (ran.Count > 0) log.Add(ran.Pop().Name + " after");
        return log.ToArray();
    }
}`,
      complexity: `<p>O(n log n) to sort, O(n) to run.</p>`
    }
  });

  practice.push({
    title: 'Resolve a Dependency Graph',
    level: 'Medium', tags: ['dependency injection', 'DFS', 'cycle detection'], companies: ['Microsoft', 'Google', 'Atlassian'],
    statement: `<p>Each registration is ${C('"Name:dep1,dep2"')} (the dependency list may be empty). Resolving ${C('target')} creates dependencies first, in listed order, each service at most once (post-order DFS). Return the creation order. If a dependency is not registered return ${C('["missing: X (needed by Y)"]')} (${C('root')} when the target itself is missing). If there is a cycle return ${C('["cycle: A -> B -> A"]')} starting at the first service on the cycle.</p>`,
    constraints: `≤ 10<sup>3</sup> services.`,
    example: `<p>${C('["Controller:Service,Logger","Service:Repo,Logger","Repo:Db","Db:","Logger:"]')}, target Controller → ${H.c('g', '["Db","Repo","Logger","Service","Controller"]')}</p>`,
    brute: { why: `<p>Recursing without a "visiting" set loops forever on a cycle (a stack overflow, which C# cannot catch). Without a "done" set, shared dependencies are built many times.</p>`, code: `
using System.Collections.Generic;

static class NoCycleCheck
{
    public static void Resolve(Dictionary<string, string[]> deps, string s, List<string> order)
    {
        foreach (var d in deps[s]) Resolve(deps, d, order);   // A -> B -> A recurses forever
        order.Add(s);
    }
}` },
    mcq: { q: 'What does the real container do for constructor cycles A → B → A?', options: ['Throws InvalidOperationException describing the circular dependency', 'Creates A with a null B', 'Hangs forever', 'Creates two A instances'], answer: 0, explain: 'The call-site factory tracks the chain being built and throws "A circular dependency was detected for the service of type ...".' },
    hints: [`<p>Hint 1: three states per node: unvisited, visiting (on the current path), done.</p>`, `<p>Hint 2: keep the current path as a list; when you meet a "visiting" node, the cycle is the path from that node to the end, plus the node again.</p>`, `<p>Hint 3: report missing dependencies with the name of the service that asked for them.</p>`],
    tests: { sig: 'string[] string -> string[]', fn: 'resolveOrder', cases: [
      [[['Controller:Service,Logger', 'Service:Repo,Logger', 'Repo:Db', 'Db:', 'Logger:'], 'Controller'], ['Db', 'Repo', 'Logger', 'Service', 'Controller']],
      [[['Controller:Service,Logger', 'Service:Repo,Logger', 'Repo:Db', 'Db:', 'Logger:'], 'Db'], ['Db']],
      [[['A:B', 'B:C', 'C:A'], 'A'], ['cycle: A -> B -> C -> A']],
      [[['A:B', 'B:'], 'Z'], ['missing: Z (needed by root)']],
      [[['A:B,C', 'B:', 'C:D'], 'A'], ['missing: D (needed by C)']],
      [[['A:A'], 'A'], ['cycle: A -> A']],
      [[['A:B,C', 'B:D', 'C:D', 'D:'], 'A'], ['D', 'B', 'C', 'A']],
      [[['Top:Mid', 'Mid:Low', 'Low:Mid'], 'Top'], ['cycle: Mid -> Low -> Mid']]
    ] },
    solution: {
      approach: `<p>DFS with a path list. Before visiting a node check: missing → error; on the path → cycle; done → skip. After all dependencies, append the node (post-order). Errors propagate up as an exception-free result.</p>`,
      code: `
public class Solution
{
    public static string[] ResolveOrder(string[] regs, string target)
    {
        var deps = new Dictionary<string, string[]>();
        foreach (var r in regs)
        {
            int c = r.IndexOf(':');
            deps[r[..c]] = r[(c + 1)..].Split(',', StringSplitOptions.RemoveEmptyEntries);
        }
        var order = new List<string>();
        var done = new HashSet<string>();
        var path = new List<string>();

        string? Visit(string name, string neededBy)
        {
            if (!deps.ContainsKey(name)) return $"missing: {name} (needed by {neededBy})";
            int onPath = path.IndexOf(name);
            if (onPath >= 0) return "cycle: " + string.Join(" -> ", path.Skip(onPath).Append(name));
            if (done.Contains(name)) return null;
            path.Add(name);
            foreach (var d in deps[name])
                if (Visit(d, name) is { } error) return error;
            path.RemoveAt(path.Count - 1);
            done.Add(name);
            order.Add(name);                                  // created after its dependencies
            return null;
        }

        var err = Visit(target, "root");
        return err is null ? order.ToArray() : new[] { err };
    }
}`,
      complexity: `<p>O(V + E) plus O(depth) per path lookup. Recursion depth ≤ number of services (fine for 10<sup>3</sup>).</p>`
    }
  });

  practice.push({
    title: 'Bind and Validate Options',
    level: 'Medium', tags: ['options pattern', 'reflection', 'TypeConverter'], companies: ['Microsoft', 'EPAM', 'Thoughtworks'],
    statement: `<p>Bind the ${C('Smtp')} section into ${C('SmtpOptions { string Host = ""; int Port = 25; bool UseSsl; string From = "" }')}. Entries are ${C('"Key=Value"')}; keys are case-insensitive and later entries win; keys outside ${C('Smtp:')} and unknown properties are ignored. Bind properties in the order Host, Port, UseSsl, From using type converters with the invariant culture; the first value that cannot convert returns ${C('["error: Failed to convert configuration value at \'Smtp:Prop\' to type \'System.Int32\'."]')} (with the property's type full name). Otherwise validate (like ValidateOnStart) and return each failure as ${C('"invalid: ..."')} in this order: ${C('Host is required')} (empty/whitespace), ${C('Port must be 1-65535')}, ${C('From must be an email')} (must contain ${C('@')}). If valid, return ${C('["Host=..","Port=..","UseSsl=..","From=.."]')} (bool as True/False).</p>`,
    constraints: `≤ 100 entries.`,
    example: `<p>${C('["smtp:host=mail","SMTP:FROM=me@mail"]')} → ${H.c('g', '["Host=mail","Port=25","UseSsl=False","From=me@mail"]')}</p>`,
    brute: { why: `<p>Reading ${C('config["Smtp:Port"]')} with ${C('int.Parse')} in every class that needs it scatters parsing, gives an unhelpful FormatException at first use, and nobody validates. Bind once, fail fast at start-up.</p>`, code: `
using System.Collections.Generic;

static class Scattered
{
    public static int Port(Dictionary<string, string> config) => int.Parse(config["Smtp:Port"]); // KeyNotFound / FormatException later
}` },
    mcq: { q: 'Why add <code>ValidateOnStart()</code> to options registration?', options: ['Invalid configuration fails the app at start-up instead of on the first request that reads the options', 'It makes options reload on change', 'It validates JSON syntax', 'It is required for IOptionsMonitor'], answer: 0, explain: 'Options are built lazily on first IOptions.Value access. ValidateOnStart forces validation during host start, so a bad deployment fails immediately.' },
    hints: [`<p>Hint 1: keep a case-insensitive dictionary of the ${C('Smtp:')} children (strip the section prefix).</p>`, `<p>Hint 2: for each property ${C('TypeDescriptor.GetConverter(prop.PropertyType).ConvertFromInvariantString(raw)')}; catch the exception and build the message from ${C('prop.PropertyType.FullName')}.</p>`, `<p>Hint 3: validation runs only after binding succeeds; collect every failure.</p>`],
    tests: { sig: 'string[] -> string[]', fn: 'bindSmtp', cases: [
      [[['Smtp:Host=smtp.x.com', 'Smtp:Port=587', 'Smtp:UseSsl=true', 'Smtp:From=a@x.com']], ['Host=smtp.x.com', 'Port=587', 'UseSsl=True', 'From=a@x.com']],
      [[['smtp:host=mail', 'SMTP:FROM=me@mail']], ['Host=mail', 'Port=25', 'UseSsl=False', 'From=me@mail']],
      [[['Smtp:Host=h', 'Smtp:Port=abc', 'Smtp:From=a@b']], ["error: Failed to convert configuration value at 'Smtp:Port' to type 'System.Int32'."]],
      [[[]], ['invalid: Host is required', 'invalid: From must be an email']],
      [[['Smtp:Host=h', 'Smtp:Port=70000', 'Smtp:From=x']], ['invalid: Port must be 1-65535', 'invalid: From must be an email']],
      [[['Smtp:Host=h', 'Smtp:UseSsl=yes', 'Smtp:From=a@b']], ["error: Failed to convert configuration value at 'Smtp:UseSsl' to type 'System.Boolean'."]],
      [[['Other:Host=x', 'Smtp:Host=h', 'Smtp:Retries=3', 'Smtp:From=a@b', 'Smtp:Host=h2']], ['Host=h2', 'Port=25', 'UseSsl=False', 'From=a@b']],
      [[['Smtp:Host= ', 'Smtp:Port=0', 'Smtp:From=a@b']], ['invalid: Host is required', 'invalid: Port must be 1-65535']]
    ] },
    solution: {
      approach: `<p>Collect the section's keys case-insensitively (last wins). Bind properties by name through reflection and type converters, exactly like ${C('ConfigurationBinder')}. Then run the validators and either report every failure or print the bound object.</p>`,
      code: `
using System.ComponentModel;
using System.Reflection;

public sealed class SmtpOptions
{
    public string Host { get; set; } = "";
    public int Port { get; set; } = 25;
    public bool UseSsl { get; set; }
    public string From { get; set; } = "";
}

public class Solution
{
    const string Section = "Smtp:";
    static readonly string[] BindOrder = { "Host", "Port", "UseSsl", "From" };

    public static string[] BindSmtp(string[] kv)
    {
        var section = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        foreach (var entry in kv)
        {
            int eq = entry.IndexOf('=');
            string key = entry[..eq];
            if (key.StartsWith(Section, StringComparison.OrdinalIgnoreCase))
                section[key[Section.Length..]] = entry[(eq + 1)..];        // later wins
        }

        var options = new SmtpOptions();
        foreach (var name in BindOrder)
        {
            PropertyInfo prop = typeof(SmtpOptions).GetProperty(name)!;
            if (!section.TryGetValue(name, out var raw)) continue;          // keep the default
            try
            {
                prop.SetValue(options, TypeDescriptor.GetConverter(prop.PropertyType).ConvertFromInvariantString(raw));
            }
            catch (Exception)
            {
                return new[] { $"error: Failed to convert configuration value at 'Smtp:{name}' to type '{prop.PropertyType.FullName}'." };
            }
        }

        var failures = new List<string>();
        if (string.IsNullOrWhiteSpace(options.Host)) failures.Add("invalid: Host is required");
        if (options.Port is < 1 or > 65535) failures.Add("invalid: Port must be 1-65535");
        if (!options.From.Contains('@')) failures.Add("invalid: From must be an email");
        if (failures.Count > 0) return failures.ToArray();

        return new[] { $"Host={options.Host}", $"Port={options.Port}", $"UseSsl={options.UseSsl}", $"From={options.From}" };
    }
}`,
      complexity: `<p>O(entries + properties). Real binders cache the property metadata per type.</p>`
    }
  });

  practice.push({
    title: 'Fixed-Window Rate Limiter',
    level: 'Medium', tags: ['rate limiting', 'middleware', 'counting'], companies: ['Microsoft', 'Stripe', 'Razorpay'],
    statement: `<p>Model ${C('AddFixedWindowLimiter')} with ${C('QueueLimit = 0')}: windows of ${C('window')} seconds start at time 0 (window k covers [k·window, (k+1)·window)). Each window allows ${C('permit')} requests; the rest are rejected. Given non-decreasing request times, return the status for each: 200 or 429.</p>`,
    constraints: `0 ≤ permit ≤ 10<sup>6</sup>, 1 ≤ window ≤ 10<sup>6</sup>, ≤ 10<sup>5</sup> requests, times ≥ 0.`,
    example: `<p>permit 2, window 10, times ${C('[0,1,2,10,11,12]')} → ${H.c('g', '[200,200,429,200,200,429]')}</p>`,
    brute: { why: `<p>Counting all earlier requests in the same window for each request is O(n²). Because times are sorted, a running counter reset when the window index changes is O(n).</p>`, code: `
static class Quadratic
{
    public static int Count(int[] times, int i, int window)
    {
        int c = 0;
        for (int j = 0; j <= i; j++) if (times[j] / window == times[i] / window) c++;
        return c;
    }
}` },
    mcq: { q: 'What is the main weakness of a fixed-window limiter?', options: ['A burst at the end of one window plus the start of the next can reach twice the limit in a short time', 'It needs a queue', 'It cannot be partitioned per user', 'It uses too much memory'], answer: 0, explain: 'Sliding-window and token-bucket limiters smooth this edge effect.' },
    hints: [`<p>Hint 1: the window index of time t is ${C('t / window')}.</p>`, `<p>Hint 2: keep the current window index and a counter; reset the counter when the index changes.</p>`, `<p>Hint 3: allow while ${C('count < permit')}, then increment; otherwise 429 (rejected requests do not consume permits).</p>`],
    tests: { sig: 'int int int[] -> int[]', fn: 'fixedWindow', cases: [
      [[2, 10, [0, 1, 2, 10, 11, 12]], [200, 200, 429, 200, 200, 429]],
      [[1, 1, [0, 0, 1, 1, 2]], [200, 429, 200, 429, 200]],
      [[3, 60, []], []],
      [[0, 10, [5]], [429]],
      [[2, 10, [9, 10]], [200, 200]],
      [[2, 5, [0, 4, 4, 5, 9, 9, 15]], [200, 200, 429, 200, 200, 429, 200]],
      [[1000000, 1000000, { $rep: 7, n: 5 }], { $rep: 200, n: 5 }]
    ] },
    solution: {
      approach: `<p>One pass with a window index and a counter. This is what ${C('FixedWindowRateLimiter')} does per partition, with a timer instead of an index.</p>`,
      code: `
public class Solution
{
    public static int[] FixedWindow(int permit, int window, int[] times)
    {
        var result = new int[times.Length];
        long currentWindow = -1;
        int used = 0;
        for (int i = 0; i < times.Length; i++)
        {
            long w = times[i] / window;
            if (w != currentWindow) { currentWindow = w; used = 0; }   // new window: permits replenish
            if (used < permit) { used++; result[i] = 200; }
            else result[i] = 429;
        }
        return result;
    }
}`,
      complexity: `<p>O(n) time, O(1) extra space.</p>`
    }
  });

  practice.push({
    title: 'Captive Dependency Validator',
    level: 'Hard', tags: ['dependency injection', 'lifetimes', 'graph', 'DFS'], companies: ['Microsoft', 'Amazon', 'Uber'],
    statement: `<p>Re-implement the idea behind ${C('ValidateScopes')}. Registrations are ${C('"Name:Lifetime"')} or ${C('"Name:Lifetime:dep1,dep2"')}. For each <b>singleton</b> in registration order, search its dependencies depth-first in listed order: a <b>scoped</b> dependency is a violation (report the path ${C('"S -> T1 -> D"')} and do not go deeper); a <b>transient</b> is followed further (it lives as long as the singleton that holds it); a <b>singleton</b> dependency is not followed (it is checked on its own). Report each service at most once per singleton (first path found); ignore unregistered names. Return the violations, or ${C('["ok"]')}.</p>`,
    constraints: `≤ 10<sup>3</sup> registrations; transients may form cycles.`,
    example: `<p>${C('["Cache:Singleton:Helper","Helper:Transient:Db","Db:Scoped"]')} → ${H.c('r', '["Cache -> Helper -> Db"]')}: the transient Helper is created once for the singleton, so its Db is captured forever.</p>`,
    brute: { why: `<p>Checking only <b>direct</b> dependencies misses the common case where a transient helper sits in the middle. The capture is transitive, so you need a graph search.</p>`, code: `
using System.Collections.Generic;

static class DirectOnly
{
    public static bool Captive(string life, IEnumerable<string> depLifetimes)
    {
        if (life != "Singleton") return false;
        foreach (var d in depLifetimes) if (d == "Scoped") return true;   // misses Singleton -> Transient -> Scoped
        return false;
    }
}` },
    mcq: { q: 'A singleton depends on a transient that depends on a scoped DbContext. Is that a problem?', options: ['Yes — the transient is created once for the singleton, so the scoped DbContext is captured for the app’s lifetime', 'No — transient breaks the chain', 'Only if the transient is disposable', 'Only in Production'], answer: 0, explain: 'A transient’s lifetime is effectively that of whoever holds it. The default container’s scope validation reports this path too.' },
    hints: [`<p>Hint 1: build ${C('name → (lifetime, deps)')}; loop over singletons in input order.</p>`, `<p>Hint 2: DFS with the current path list and a per-singleton visited set (it also stops transient cycles).</p>`, `<p>Hint 3: on a scoped child, record ${C('string.Join(" -> ", path + child)')} and do not recurse; on a singleton child, skip; on a transient child, recurse.</p>`],
    tests: { sig: 'string[] -> string[]', fn: 'captive', cases: [
      [[['Cache:Singleton:Db', 'Db:Scoped']], ['Cache -> Db']],
      [[['Clock:Singleton', 'Svc:Scoped:Clock,Db', 'Db:Scoped']], ['ok']],
      [[['Cache:Singleton:Helper', 'Helper:Transient:Db', 'Db:Scoped']], ['Cache -> Helper -> Db']],
      [[['A:Singleton:B', 'B:Singleton:C', 'C:Scoped']], ['B -> C']],
      [[['S:Singleton:T1,T2', 'T1:Transient:D', 'T2:Transient:D', 'D:Scoped']], ['S -> T1 -> D']],
      [[[]], ['ok']],
      [[['T:Transient:X', 'X:Transient:T', 'S:Singleton:T', 'Y:Scoped']], ['ok']],
      [[['S1:Singleton:D', 'S2:Singleton:D,E', 'D:Scoped', 'E:Scoped']], ['S1 -> D', 'S2 -> D', 'S2 -> E']],
      [[['S:Singleton:Ghost,T', 'T:Transient:U', 'U:Transient:Db', 'Db:Scoped']], ['S -> T -> U -> Db']]
    ] },
    solution: {
      approach: `<p>For each singleton, run an iterative-friendly DFS over the dependency graph that only continues through transients, reporting the path to every reachable scoped service once. A visited set per root makes it O(V + E) per singleton and handles transient cycles.</p>`,
      code: `
public enum Life { Singleton, Scoped, Transient }
public sealed record Registration(string Name, Life Life, string[] Deps);

public class Solution
{
    public static string[] Captive(string[] regs)
    {
        var map = new Dictionary<string, Registration>();
        var order = new List<Registration>();
        foreach (var r in regs)
        {
            var p = r.Split(':');
            var deps = p.Length > 2 ? p[2].Split(',', StringSplitOptions.RemoveEmptyEntries) : Array.Empty<string>();
            var reg = new Registration(p[0], Enum.Parse<Life>(p[1]), deps);
            map[reg.Name] = reg;
            order.Add(reg);
        }

        var violations = new List<string>();
        foreach (var root in order.Where(r => r.Life == Life.Singleton))
        {
            var visited = new HashSet<string> { root.Name };
            var path = new List<string> { root.Name };
            void Dfs(Registration current)
            {
                foreach (var dep in current.Deps)
                {
                    if (!map.TryGetValue(dep, out var child) || !visited.Add(dep)) continue;
                    if (child.Life == Life.Scoped) violations.Add(string.Join(" -> ", path.Append(dep)));
                    else if (child.Life == Life.Transient)
                    {
                        path.Add(dep);
                        Dfs(child);
                        path.RemoveAt(path.Count - 1);
                    }
                    // Singleton: validated as its own root
                }
            }
            Dfs(root);
        }
        return violations.Count == 0 ? new[] { "ok" } : violations.ToArray();
    }
}`,
      complexity: `<p>O(S · (V + E)) for S singletons. Recursion depth is bounded by the length of transient chains.</p>`
    }
  });

  practice.push({
    title: 'Validate an HS256 JWT',
    level: 'Hard', tags: ['JWT', 'HMAC', 'base64url', 'security'], companies: ['Microsoft', 'Okta', 'PayPal', 'Auth0'],
    statement: `<p>Validate a JWT signed with HMAC-SHA256 and the UTF-8 key ${C('"dev-secret-key-please-change-32b!"')}. Checks, in order, returning the first failure:</p>
<ol><li>not exactly 3 parts, or header/payload not valid base64url JSON → ${C('"malformed"')}</li><li>header ${C('alg')} ≠ ${C('"HS256"')} → ${C('"unsupported alg"')}</li><li>signature over ${C('header.payload')} does not match (constant-time compare) → ${C('"bad signature"')}</li><li>${C('aud')} ≠ ${C('"api"')} → ${C('"bad audience"')}</li><li>${C('now + 300 < nbf')} → ${C('"not yet valid"')}</li><li>${C('now - 300 > exp')} → ${C('"expired"')} (300 s = the default 5-minute clock skew)</li></ol>
<p>Otherwise return ${C('"ok sub=<sub>"')}.</p>`,
    constraints: `Token length ≤ 4096. Times are Unix seconds.`,
    example: `<p>A valid token with nbf 1000, exp 2000: at now = 2300 → ${H.c('g', '"ok sub=alice"')} (inside the skew); at 2301 → ${H.c('r', '"expired"')}.</p>`,
    brute: { why: `<p>Decoding the payload and trusting ${C('sub')} without verifying the signature lets anyone mint tokens. Accepting the header's ${C('alg')} blindly allows ${C('alg: none')}. Comparing signatures with ${C('==')} on strings leaks timing information.</p>`, code: `
using System;
using System.Text;

static class DecodeOnly
{
    public static string Sub(string token)
    {
        string p = token.Split('.')[1].Replace('-', '+').Replace('_', '/');
        p += new string('=', (4 - p.Length % 4) % 4);
        return Encoding.UTF8.GetString(Convert.FromBase64String(p)); // trusts an unverified payload
    }
}` },
    mcq: { q: 'Why must the validator pin the expected algorithm instead of reading it from the token header?', options: ['An attacker controls the header and could pick "none" or switch to a weaker or confused algorithm', 'Reading the header is slow', 'The header is encrypted', 'Because HS256 tokens have no header'], answer: 0, explain: 'The header is attacker-controlled input. Validators must only accept algorithms that match the configured key.' },
    hints: [`<p>Hint 1: base64url → base64: replace ${C('-')}/${C('_')} with ${C('+')}/${C('/')} and pad with ${C('=')} to a multiple of 4; wrap decoding and JSON parsing in try/catch → malformed.</p>`, `<p>Hint 2: ${C('HMACSHA256.HashData(key, Encoding.ASCII.GetBytes(parts[0] + "." + parts[1]))')} and ${C('CryptographicOperations.FixedTimeEquals')} against the decoded signature bytes.</p>`, `<p>Hint 3: read claims with ${C('JsonDocument')}; compare times with the 300-second skew on both sides.</p>`],
    tests: { sig: 'string long -> string', fn: 'validate', cases: [
      [['eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhbGljZSIsImF1ZCI6ImFwaSIsIm5iZiI6MTAwMCwiZXhwIjoyMDAwfQ.KwGwEVFwJabjzs0PN6hUIIwN09ApECdmMThoY7tZP_o', 1500], 'ok sub=alice'],
      [['eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhbGljZSIsImF1ZCI6ImFwaSIsIm5iZiI6MTAwMCwiZXhwIjoyMDAwfQ.KwGwEVFwJabjzs0PN6hUIIwN09ApECdmMThoY7tZP_o', 2301], 'expired'],
      [['eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhbGljZSIsImF1ZCI6ImFwaSIsIm5iZiI6MTAwMCwiZXhwIjoyMDAwfQ.KwGwEVFwJabjzs0PN6hUIIwN09ApECdmMThoY7tZP_o', 2300], 'ok sub=alice'],
      [['eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhbGljZSIsImF1ZCI6ImFwaSIsIm5iZiI6MTAwMCwiZXhwIjoyMDAwfQ.KwGwEVFwJabjzs0PN6hUIIwN09ApECdmMThoY7tZP_o', 600], 'not yet valid'],
      [['eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbiIsImF1ZCI6ImFwaSIsIm5iZiI6MTAwMCwiZXhwIjoyMDAwfQ.KwGwEVFwJabjzs0PN6hUIIwN09ApECdmMThoY7tZP_o', 1500], 'bad signature'],
      [['eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiJldmUiLCJhdWQiOiJhcGkiLCJuYmYiOjAsImV4cCI6OTk5OTl9.', 1500], 'unsupported alg'],
      [['eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhbGljZSIsImF1ZCI6ImFkbWluIiwibmJmIjoxMDAwLCJleHAiOjIwMDB9.5__RMsLL4SoqlyiEOGUWAZVT7rezbGsDqYPVUme97ms', 1500], 'bad audience'],
      [['abc', 0], 'malformed'],
      [['eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhbGljZSIsImF1ZCI6ImFwaSIsIm5iZiI6MTAwMCwiZXhwIjoyMDAwfQ.plq8tWU4lsw0s3gy__4dJCM80Z-IaLEBfZ229Qs5kJg', 1500], 'bad signature'],
      [['eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJib2IiLCJhdWQiOiJhcGkiLCJuYmYiOjAsImV4cCI6NTAwMH0.jXw51hpAh-XAikxmmKye-xJ0A7viRDSUcnE2AePqLOQ', 4000], 'ok sub=bob'],
      [['a.b.c', 0], 'malformed']
    ] },
    solution: {
      approach: `<p>Decode defensively, pin the algorithm, verify the HMAC with a constant-time comparison, and only then trust the claims: audience first, then the time window with clock skew. This is the order JwtBearer's ${C('TokenValidationParameters')} applies.</p>`,
      code: `
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

public class Solution
{
    static readonly byte[] Key = Encoding.UTF8.GetBytes("dev-secret-key-please-change-32b!");
    const long SkewSeconds = 300;

    static byte[] B64Url(string s)
    {
        string b = s.Replace('-', '+').Replace('_', '/');
        b += new string('=', (4 - b.Length % 4) % 4);
        return Convert.FromBase64String(b);
    }

    public static string Validate(string token, long now)
    {
        var parts = token.Split('.');
        if (parts.Length != 3) return "malformed";
        JsonElement header, payload;
        byte[] signature;
        try
        {
            header = JsonDocument.Parse(B64Url(parts[0])).RootElement;
            payload = JsonDocument.Parse(B64Url(parts[1])).RootElement;
            signature = B64Url(parts[2]);
        }
        catch (Exception e) when (e is FormatException or JsonException) { return "malformed"; }

        if (!header.TryGetProperty("alg", out var alg) || alg.GetString() != "HS256") return "unsupported alg";

        byte[] expected = HMACSHA256.HashData(Key, Encoding.ASCII.GetBytes(parts[0] + "." + parts[1]));
        if (!CryptographicOperations.FixedTimeEquals(expected, signature)) return "bad signature";

        if (!payload.TryGetProperty("aud", out var aud) || aud.GetString() != "api") return "bad audience";
        long nbf = payload.TryGetProperty("nbf", out var n) ? n.GetInt64() : long.MinValue / 2;
        long exp = payload.TryGetProperty("exp", out var x) ? x.GetInt64() : long.MaxValue / 2;
        if (now + SkewSeconds < nbf) return "not yet valid";
        if (now - SkewSeconds > exp) return "expired";
        return "ok sub=" + (payload.TryGetProperty("sub", out var sub) ? sub.GetString() : "");
    }
}`,
      complexity: `<p>O(token length): one HMAC and two small JSON parses.</p>`
    }
  });

  practice.push({
    title: 'Generate a Link from Route Values',
    level: 'Hard', tags: ['routing', 'link generation', 'strings'], companies: ['Microsoft', 'Booking.com', 'Zalando'],
    statement: `<p>Implement a small ${C('LinkGenerator')}. The template has segments that are literals, ${C('{name}')}, ${C('{name=default}')} or ${C('{name?}')} (optional, only at the end). Values are ${C('"key=value"')} (keys case-insensitive). Rules:</p>
<ol><li>Each parameter takes its value, else its default. A required parameter with neither → return ${C('"(no route)"')}. An optional parameter with no value ends the path.</li>
<li>Trailing parameter segments whose value equals their default (case-insensitive) are dropped, from the end, until a segment that must stay.</li>
<li>Path values are escaped with ${C('Uri.EscapeDataString')}. Values not used by the template become the query string in input order: ${C('?k=v&k2=v2')} (escaped).</li>
<li>The result starts with ${C('/')}; an empty path is ${C('"/"')}.</li></ol>`,
    constraints: `≤ 20 segments, ≤ 20 values.`,
    example: `<p>Template ${C('"{controller=Home}/{action=Index}/{id?}"')}, values ${C('["controller=Products","id=5"]')} → ${H.c('g', '"/Products/Index/5"')}; values ${C('["page=2","controller=Blog"]')} → ${H.c('g', '"/Blog?page=2"')}.</p>`,
    brute: { why: `<p>String-replacing ${C('{controller=Home}')} with the value gives ${C('/Home/Index')} for the home page instead of ${C('/')}, cannot handle optional segments, and drops extra values instead of turning them into a query string.</p>`, code: `
static class ReplaceOnly
{
    public static string Link(string controller, string action) => "/" + controller + "/" + action; // never trims defaults
}` },
    mcq: { q: 'Why does conventional routing generate "/" instead of "/Home/Index" for the home page?', options: ['Trailing segments equal to their defaults are omitted, since matching "/" fills them back in', 'Home is a reserved word', 'Index actions are always hidden', 'Because of a redirect'], answer: 0, explain: 'Link generation produces the shortest URL that round-trips: dropped default segments are restored by the defaults during matching.' },
    hints: [`<p>Hint 1: parse segments into (isLiteral, name, default, optional); put values in a case-insensitive dictionary and remember their order.</p>`, `<p>Hint 2: build a list of (text, droppable) — droppable when it is a parameter whose value equals its default — then pop droppable items from the end.</p>`, `<p>Hint 3: every key consumed by a parameter is removed from the "extra" list; the rest form the query.</p>`],
    tests: { sig: 'string string[] -> string', fn: 'link', cases: [
      [['{controller=Home}/{action=Index}/{id?}', ['controller=Products', 'id=5']], '/Products/Index/5'],
      [['{controller=Home}/{action=Index}/{id?}', []], '/'],
      [['{controller=Home}/{action=Index}/{id?}', ['controller=Home', 'action=Index']], '/'],
      [['{controller=Home}/{action=Index}/{id?}', ['controller=Products']], '/Products'],
      [['{controller=Home}/{action=Index}/{id?}', ['action=About']], '/Home/About'],
      [['{controller=Home}/{action=Index}/{id?}', ['page=2', 'controller=Blog']], '/Blog?page=2'],
      [['api/orders/{id}', []], '(no route)'],
      [['api/orders/{id}', ['id=a b', 'sort=desc']], '/api/orders/a%20b?sort=desc'],
      [['api/{version=v1}/items', []], '/api/v1/items'],
      [['{controller=Home}/{action=Index}/{id?}', ['id=7']], '/Home/Index/7'],
      [['{controller=Home}/{action=Index}/{id?}', ['CONTROLLER=home', 'q=c#']], '/?q=c%23']
    ] },
    solution: {
      approach: `<p>Resolve each segment to text, marking parameters whose value equals the default as droppable. Stop at a missing optional parameter; fail on a missing required one. Pop droppable segments from the end, then append unused values as an escaped query string.</p>`,
      code: `
public sealed record TemplateSegment(bool Literal, string Name, string? Default, bool Optional);

public class Solution
{
    static TemplateSegment Parse(string s)
    {
        if (!s.StartsWith('{')) return new TemplateSegment(true, s, null, false);
        string inner = s[1..^1];
        if (inner.EndsWith('?')) return new TemplateSegment(false, inner[..^1], null, true);
        int eq = inner.IndexOf('=');
        return eq < 0 ? new TemplateSegment(false, inner, null, false)
                      : new TemplateSegment(false, inner[..eq], inner[(eq + 1)..], false);
    }

    public static string Link(string template, string[] values)
    {
        var given = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        var keys = new List<string>();
        foreach (var v in values)
        {
            int eq = v.IndexOf('=');
            given[v[..eq]] = v[(eq + 1)..];
            keys.Add(v[..eq]);
        }

        var used = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var parts = new List<(string Text, bool Droppable)>();
        foreach (var seg in template.Split('/', StringSplitOptions.RemoveEmptyEntries).Select(Parse))
        {
            if (seg.Literal) { parts.Add((seg.Name, false)); continue; }
            used.Add(seg.Name);
            if (given.TryGetValue(seg.Name, out var value))
                parts.Add((Uri.EscapeDataString(value), seg.Default is not null && value.Equals(seg.Default, StringComparison.OrdinalIgnoreCase)));
            else if (seg.Default is not null) parts.Add((Uri.EscapeDataString(seg.Default), true));
            else if (seg.Optional) break;                         // optional and absent: path ends here
            else return "(no route)";                             // required value missing
        }
        while (parts.Count > 0 && parts[^1].Droppable) parts.RemoveAt(parts.Count - 1);

        string path = "/" + string.Join("/", parts.Select(p => p.Text));
        var extra = keys.Where(k => !used.Contains(k))
                        .Select(k => Uri.EscapeDataString(k) + "=" + Uri.EscapeDataString(given[k]))
                        .ToList();
        return extra.Count == 0 ? path : path + "?" + string.Join("&", extra);
    }
}`,
      complexity: `<p>O(template length + values).</p>`
    }
  });

  practice.push({
    title: 'Content Negotiation with Accept Headers',
    level: 'Hard', tags: ['HTTP', 'content negotiation', 'parsing'], companies: ['Microsoft', 'Netflix', 'Shopify'],
    statement: `<p>Pick a response media type like MVC output formatters with ${C('ReturnHttpNotAcceptable = true')}. ${C('Negotiate(string accept, string[] supported)')}:</p>
<ul><li>Empty or whitespace Accept → the first supported type (or ${C('"406"')} if none).</li>
<li>Parse comma-separated ranges ${C('type/subtype;q=0.8')} (case-insensitive, default q = 1, q parsed with the invariant culture; ignore other parameters).</li>
<li>For each supported type, use the q of the <b>most specific</b> matching range: exact (2) beats ${C('type/*')} (1) beats ${C('*/*')} (0); the first range wins among equally specific ones. No match → q = 0.</li>
<li>Return the supported type (original spelling) with the highest q &gt; 0, earliest on ties; otherwise ${C('"406"')}.</li></ul>`,
    constraints: `Header length ≤ 2000; ≤ 20 supported types.`,
    example: `<p>Accept ${C('"application/json;q=0, */*"')} with ${C('["application/json","application/xml","text/csv"]')} → ${H.c('g', '"application/xml"')}: JSON was explicitly refused; XML gets q = 1 from ${C('*/*')}.</p>`,
    brute: { why: `<p>Checking ${C('accept.Contains("json")')} ignores q-values (including explicit refusals with q=0), wildcards and specificity. A proper parse handles them all.</p>`, code: `
static class ContainsCheck
{
    public static string Pick(string accept) => accept.Contains("json") ? "application/json" : "application/xml"; // ignores q=0
}` },
    mcq: { q: 'Accept is <code>text/*;q=0.3, text/html;q=0.7</code>. What q applies to text/html?', options: ['0.7 — the most specific matching range wins', '0.3 — the first range wins', '1.0 — the default', 'The average, 0.5'], answer: 0, explain: 'RFC 9110: the most specific reference has precedence, so text/html uses its own range.' },
    hints: [`<p>Hint 1: split on ${C(',')}, then on ${C(';')}; the first piece is the media range, look for a ${C('q=')} parameter in the rest.</p>`, `<p>Hint 2: specificity of a range for a type: ${C('"*/*"')} → 0, ${C('"t/*"')} with the same t → 1, exact → 2, otherwise no match.</p>`, `<p>Hint 3: track the best (q, index) with a strict ${C('>')} so earlier supported types win ties.</p>`],
    tests: { sig: 'string string[] -> string', fn: 'negotiate', cases: [
      [['application/xml', ['application/json', 'application/xml', 'text/csv']], 'application/xml'],
      [['text/html, */*;q=0.1', ['application/json', 'application/xml', 'text/csv']], 'application/json'],
      [['application/*;q=0.5, text/csv', ['application/json', 'application/xml', 'text/csv']], 'text/csv'],
      [['application/json;q=0, */*', ['application/json', 'application/xml', 'text/csv']], 'application/xml'],
      [['', ['application/json', 'application/xml', 'text/csv']], 'application/json'],
      [['image/png', ['application/json', 'application/xml', 'text/csv']], '406'],
      [['Application/XML;q=0.9, application/json;q=0.8', ['application/json', 'application/xml', 'text/csv']], 'application/xml'],
      [['text/*;q=0.3, application/xml;q=0.3', ['application/json', 'application/xml', 'text/csv']], 'application/xml'],
      [['*/*', []], '406'],
      [['text/*;q=0.3, text/csv;q=0.7, */*;q=0.5', ['application/json', 'text/csv']], 'text/csv']
    ] },
    solution: {
      approach: `<p>Parse the header once into (type, subtype, q). For each supported type, find the matching range with the highest specificity and use its q. Choose the best q above zero, keeping the earliest on ties.</p>`,
      code: `
using System.Globalization;

public sealed record MediaRange(string Type, string Sub, double Q);

public class Solution
{
    static List<MediaRange> ParseAccept(string accept)
    {
        var ranges = new List<MediaRange>();
        foreach (var raw in accept.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        {
            var pieces = raw.Split(';', StringSplitOptions.TrimEntries);
            var media = pieces[0].ToLowerInvariant().Split('/');
            if (media.Length != 2) continue;
            double q = 1;
            foreach (var p in pieces.Skip(1))
                if (p.StartsWith("q=", StringComparison.OrdinalIgnoreCase))
                    q = double.TryParse(p[2..], NumberStyles.Float, CultureInfo.InvariantCulture, out var v) ? v : 0;
            ranges.Add(new MediaRange(media[0], media[1], q));
        }
        return ranges;
    }

    static int Specificity(MediaRange r, string type, string sub)
    {
        if (r.Type == "*" && r.Sub == "*") return 0;
        if (r.Type == type && r.Sub == "*") return 1;
        if (r.Type == type && r.Sub == sub) return 2;
        return -1;
    }

    public static string Negotiate(string accept, string[] supported)
    {
        if (supported.Length == 0) return "406";
        if (string.IsNullOrWhiteSpace(accept)) return supported[0];
        var ranges = ParseAccept(accept);
        string? best = null;
        double bestQ = 0;
        foreach (var s in supported)
        {
            var media = s.ToLowerInvariant().Split('/');
            int bestSpec = -1; double q = 0;
            foreach (var r in ranges)
            {
                int spec = Specificity(r, media[0], media[1]);
                if (spec > bestSpec) { bestSpec = spec; q = r.Q; }   // first range wins among equals
            }
            if (q > bestQ) { bestQ = q; best = s; }
        }
        return best ?? "406";
    }
}`,
      complexity: `<p>O(R · S) for R ranges and S supported types.</p>`
    }
  });

  /* ======================================================================
     QUIZ (authored with the correct option first; rotated below)
     ====================================================================== */
  quiz.push(
    { q: `<code>app.UseAuthorization()</code> is registered <b>before</b> <code>app.UseAuthentication()</code>. What happens to a request with a valid token for an <code>[Authorize]</code> endpoint?`, options: ['It gets 401 — authorization runs while the user is still anonymous', 'It works normally; order does not matter', 'Startup throws an exception', 'It gets 403'], answer: 0, explain: 'Middleware runs in registration order. Authorization sees an unauthenticated user and challenges, producing 401.' },
    { q: `A middleware does not call <code>next</code>. What happens?`, options: ['The request is short-circuited: later middleware and the endpoint never run', 'ASP.NET calls next automatically', 'The request hangs until timeout', 'An exception is thrown'], answer: 0, explain: 'Not calling next is how static files, health checks and auth rejections end a request early.' },
    { q: `A singleton's constructor takes a scoped <code>DbContext</code>. With <code>ValidateScopes</code> enabled (Development default) you get…`, options: ['InvalidOperationException: cannot consume scoped service from singleton', 'A new DbContext per request', 'The DbContext silently becomes a singleton with no error', 'A compile-time error'], answer: 0, explain: 'Scope validation detects the captive dependency when the singleton is resolved.' },
    { q: `How many instances of a <b>transient</b> service are created when one request injects it into two different constructors?`, options: ['Two', 'One per request', 'One per application', 'Zero until first use'], answer: 0, explain: 'Transient means a new instance for every resolution.' },
    { q: `Templates <code>/items/{id:int}</code> and <code>/items/{name}</code>. Request: <code>/items/abc</code>. Result?`, options: ['/items/{name} runs with name = "abc"', '400 Bad Request', '404 Not Found', 'AmbiguousMatchException'], answer: 0, explain: 'The int constraint fails, so only the plain-parameter route matches.' },
    { q: `Which environment variable overrides <code>ConnectionStrings:Main</code>?`, options: ['ConnectionStrings__Main', 'ConnectionStrings:Main only on Windows', 'CONNECTIONSTRINGS_MAIN', 'ConnectionStrings.Main'], answer: 0, explain: 'A double underscore maps to the colon separator, and keys are case-insensitive.' },
    { q: `Which options interface gives a <b>singleton</b> service the current value after appsettings.json changes?`, options: ['IOptionsMonitor&lt;T&gt;', 'IOptions&lt;T&gt;', 'IOptionsSnapshot&lt;T&gt;', 'IConfigureOptions&lt;T&gt;'], answer: 0, explain: 'IOptions is computed once; IOptionsSnapshot is scoped (cannot go into a singleton); IOptionsMonitor is a singleton that tracks changes.' },
    { q: `With <code>[ApiController]</code>, what happens when the request body fails validation?`, options: ['An automatic 400 with ValidationProblemDetails; the action does not run', 'The action runs with ModelState.IsValid = false', '500 Internal Server Error', 'The invalid properties are set to null'], answer: 0, explain: 'The ModelStateInvalidFilter returns the 400 before the action executes (unless suppressed).' },
    { q: `An authenticated user lacks the required role for an endpoint. The response is…`, options: ['403 Forbidden', '401 Unauthorized', '404 Not Found', '400 Bad Request'], answer: 0, explain: 'Authenticated but not allowed → Forbid → 403. Anonymous → Challenge → 401.' },
    { q: `A JWT expired 3 minutes ago, and the API uses default <code>JwtBearer</code> settings. It is…`, options: ['Still accepted because the default ClockSkew is 5 minutes', 'Rejected immediately', 'Accepted forever', 'Refreshed automatically'], answer: 0, explain: 'TokenValidationParameters.ClockSkew defaults to 5 minutes; lower it if you need tight expiry.' },
    { q: `Why is <code>log.LogInformation($"Order {id} placed")</code> worse than <code>log.LogInformation("Order {OrderId} placed", id)</code>?`, options: ['It loses the OrderId property and formats the string even if the level is disabled', 'It does not compile', 'Interpolation is not allowed in logs', 'It logs at Debug level'], answer: 0, explain: 'Message templates keep structured properties for querying and defer formatting to the providers.' },
    { q: `What content type does a ProblemDetails error response use?`, options: ['application/problem+json', 'application/json; error=true', 'text/plain', 'application/error+json'], answer: 0, explain: 'RFC 9457 (which replaced RFC 7807) defines application/problem+json.' },
    { q: `In a policy with two requirements, requirement 2 has two handlers. One handler succeeds, the other does nothing. Requirement 1 succeeds. Result?`, options: ['Authorized', 'Forbidden — all handlers must succeed', 'Forbidden — handlers that do nothing count as failure', 'Exception'], answer: 0, explain: 'Requirements are ANDed; handlers for one requirement are ORed. Doing nothing is neutral; only Fail() vetoes.' },
    { q: `Where should <code>app.UseExceptionHandler()</code> go?`, options: ['First, so it wraps every later middleware and endpoint', 'Last, after MapControllers', 'Right after UseAuthorization', 'Anywhere; order does not matter'], answer: 0, explain: 'It can only catch exceptions thrown by middleware registered after it.' }
  );

  /* ======================================================================
     INTERVIEW
     ====================================================================== */
  interview.push(
    { level: 'B', q: 'Explain the ASP.NET Core request pipeline. What is middleware?', a: `<p>Kestrel receives the request and creates an ${C('HttpContext')}. The app is a chain of <b>middleware</b> components, each a function that receives the context and a ${C('next')} delegate. A component can do work before calling ${C('next')}, after it returns, or not call it at all (short-circuit). Components are registered with ${C('Use')}, ${C('Run')}, ${C('Map')} or ${C('UseMiddleware<T>')}, and ${C('Build()')} composes them once at start-up from last to first. Order is critical: exception handling first, then HTTPS, static files, routing, CORS, authentication, authorization, then endpoints. On the way back the response passes the components in reverse order.</p>`, followUps: ['What breaks if UseCors comes after the endpoints?', 'How do you add a header after the endpoint has started writing the body?'] },
    { level: 'B', q: 'What is the difference between singleton, scoped and transient services?', a: `<p><b>Singleton</b>: one instance for the whole app, created on first use and disposed at shutdown — must be thread-safe. <b>Scoped</b>: one instance per scope; ASP.NET Core creates a scope per HTTP request, so everything in one request shares it (DbContext is the classic example). <b>Transient</b>: a new instance every time it is resolved; disposable transients are disposed with the scope that created them. The rule: a service must not depend on a shorter-lived one — a singleton holding a scoped DbContext keeps a disposed, non-thread-safe context forever (captive dependency). ${C('ValidateScopes')} catches it in Development.</p>`, followUps: ['How do you use a DbContext in a BackgroundService?', 'Why can resolving a disposable transient from the root provider leak memory?'] },
    { level: 'I', q: 'Minimal APIs or controllers — how do you choose?', a: `<p>Both create endpoints on the same routing, DI and middleware. <b>Minimal APIs</b> are lighter, faster for small endpoints, support Native AOT via the Request Delegate Generator, and use route groups and endpoint filters for shared behaviour; typed results (${C('Results<Ok<T>, NotFound>')}) give testable handlers and accurate OpenAPI. <b>Controllers</b> bring the MVC filter pipeline, ${C('[ApiController]')} automatic validation and ProblemDetails, conventions, formatters and a familiar structure for big teams. I pick minimal APIs for new microservices and AOT targets, controllers for large APIs that rely on filters and model-binding extensibility or for teams with existing MVC code — and mixing is fine.</p>`, followUps: ['How do you validate input in minimal APIs on .NET 8?', 'How do you organise 100 minimal endpoints?'] },
    { level: 'I', q: 'How does routing pick an endpoint when several templates match?', a: `<p>At start-up endpoints are compiled into a DFA keyed by path segments. For a request, candidates are found by walking the DFA, then filtered by route constraints and matcher policies (HTTP method, host, content type). Remaining candidates are ordered by <b>precedence</b>: per segment, literal &gt; constrained parameter &gt; parameter &gt; catch-all (plus the explicit ${C('Order')}). The best one wins; an exact tie throws ${C('AmbiguousMatchException')}. Constraints exist to disambiguate routes, so a failed constraint gives 404, not 400 — validate input in the handler or with validators.</p>`, followUps: ['Why is regex in route constraints discouraged for validation?', 'How does link generation choose which route to use?'] },
    { level: 'I', q: 'Explain configuration providers and the options pattern.', a: `<p>${C('IConfiguration')} is a flat, case-insensitive key/value view (${C('Section:Key')}) over providers added in order: appsettings.json, appsettings.{Environment}.json, user secrets in Development, environment variables (${C('__')} → ${C(':')}), command line. Later providers win. The <b>options pattern</b> binds a section to a typed class: ${C('AddOptions<T>().BindConfiguration("Smtp").ValidateDataAnnotations().ValidateOnStart()')}. Consumers inject ${C('IOptions<T>')} (singleton, fixed), ${C('IOptionsSnapshot<T>')} (scoped, recomputed per request) or ${C('IOptionsMonitor<T>')} (singleton with change notifications). Validation on start makes a bad deployment fail fast instead of on the first request.</p>`, followUps: ['How do you keep secrets out of appsettings.json?', 'What does the configuration binding source generator solve?'] },
    { level: 'I', q: 'Filters vs middleware: when do you use which?', a: `<p><b>Middleware</b> sees every request as raw HTTP and knows nothing about MVC actions — use it for cross-cutting HTTP concerns: exception handling, compression, CORS, correlation ids, rate limiting. <b>Filters</b> run inside the MVC/endpoint pipeline after an action was selected, so they can see the action descriptor, bound arguments, ${C('ModelState')} and the result: validation, auditing arguments, transactions around an action, result formatting. MVC filters run in the order authorization → resource → (model binding) → action → exception → result, with global → controller → action scope and ${C('Order')} overriding. Minimal APIs have endpoint filters with a similar role.</p>`, followUps: ['How does a resource filter differ from an action filter?', 'How do you inject services into a filter?'] },
    { level: 'I', q: 'How do you return consistent error responses from an API?', a: `<p>Use RFC 9457 <b>ProblemDetails</b>: ${C('builder.Services.AddProblemDetails()')} plus ${C('app.UseExceptionHandler()')} and ${C('app.UseStatusCodePages()')}, so unhandled exceptions and empty error statuses become ${C('application/problem+json')} with type, title, status, detail and instance. Map known exceptions with ${C('IExceptionHandler')} implementations (.NET 8) — for example ${C('KeyNotFoundException')} → 404 — and return ${C('TypedResults.Problem')} / ${C('ValidationProblem')} for expected failures instead of throwing. Add a ${C('traceId')} extension so support can find the matching logs, and never expose stack traces outside Development.</p>`, followUps: ['When should a domain error be an exception vs a result value?', 'How does ValidationProblemDetails differ from ProblemDetails?'] },
    { level: 'I', q: 'Walk through JWT bearer authentication in ASP.NET Core.', a: `<p>The client gets a token from an identity provider and sends ${C('Authorization: Bearer <jwt>')}. ${C('AddJwtBearer')} with ${C('Authority')} downloads the OIDC metadata and signing keys (JWKS). For each request the handler parses the token, verifies the signature with the right key and an allowed algorithm, validates ${C('iss')}, ${C('aud')}, ${C('exp')}/${C('nbf')} with ${C('ClockSkew')} (5 minutes by default), maps claims and sets ${C('HttpContext.User')}. Authorization then evaluates policies; anonymous users get 401 (challenge with ${C('WWW-Authenticate')}), authenticated but unauthorised users get 403. Tokens are signed, not encrypted, so they must not contain secrets, and they cannot be revoked before expiry — keep them short-lived.</p>`, followUps: ['Why prefer RS256 over HS256 for multiple APIs?', 'How would you revoke access immediately?'] },
    { level: 'A', q: 'Design authorization for "users can edit their own documents; editors can edit any document in their department".', a: `<p>This is <b>resource-based</b> authorization: the rule needs the document. Define ${C('EditDocumentRequirement')} and two handlers implementing ${C('AuthorizationHandler<EditDocumentRequirement, Document>')}: an owner handler (${C('doc.OwnerId == user sub')}) and an editor handler (role ${C('editor')} and ${C('department')} claim equals ${C('doc.Department')}). Because handlers for one requirement are ORed, either succeeds. In the endpoint, load the document, then call ${C('authz.AuthorizeAsync(User, doc, "EditDocument")')}; return 404 if not found, 403 if denied (or 404 to avoid leaking existence). Keep the policy registration central, unit-test handlers with fake principals, and log denials with the user and resource id.</p>`, followUps: ['How do you filter a list endpoint to only documents the user can see?', 'Where would you cache department membership?'] },
    { level: 'A', q: 'A service in production slowly leaks memory and sometimes throws "A second operation was started on this context". What do you suspect?', a: `<p>Both point to <b>lifetime mistakes</b>. The DbContext error means the same context is used concurrently — typically a scoped DbContext captured by a singleton (or a transient inside a singleton), or parallel ${C('Task.WhenAll')} queries in one request. The memory leak fits disposable transients resolved from the root provider (the root keeps them until shutdown), a captured scope, or a singleton cache without bounds. I would enable ${C('ValidateScopes')} and ${C('ValidateOnBuild')} in a staging build, review singletons and middleware constructors for scoped dependencies, use ${C('IServiceScopeFactory')} in background services, and take a memory dump (dotnet-gcdump) to see which objects are rooted by the ServiceProvider.</p>`, followUps: ['Why is a convention-based middleware effectively a singleton?', 'How do you use DbContext safely in parallel work?'] },
    { level: 'A', q: 'How do you design logging and observability for an ASP.NET Core API?', a: `<p>Use ${C('ILogger<T>')} with message templates (structured properties, no interpolation), ${C('[LoggerMessage]')} for hot paths, and scopes for request context (correlation id, tenant, user id). Set levels per category in configuration (${C('Microsoft.AspNetCore')} at Warning, your app at Information) and change them without redeploying. Export logs, traces and metrics with OpenTelemetry; ASP.NET Core already creates an ${C('Activity')} per request, so the trace id ties logs to distributed traces and appears in ProblemDetails. Never log secrets, tokens or full bodies; redact PII. Alert on rates (5xx ratio, p95 latency) rather than individual lines.</p>`, followUps: ['What does HTTP logging middleware cost?', 'How do you sample traces at high volume?'] },
    { level: 'E', q: 'You are moving a high-traffic controller-based API to .NET 9 and want Native AOT. What changes?', a: `<p>Native AOT does not support MVC controllers, so endpoints must move to <b>minimal APIs</b> (the Request Delegate Generator emits binding code at build time). JSON must use the System.Text.Json <b>source generator</b> (${C('JsonSerializerContext')} registered in ${C('ConfigureHttpJsonOptions')}); configuration binding should use the binding generator; any reflection-based libraries (some validators, mappers, older ORMs) must be replaced or annotated, and EF Core AOT support is still limited. Validation needs endpoint filters or a source-generated validator. I would enable ${C('<PublishAot>true</PublishAot>')} and the trim/AOT analyzers early to see warnings, migrate endpoint groups incrementally behind the same routes, benchmark start-up time and memory (the main gains), and keep a JIT build as a fallback until the AOT build passes the full integration test suite.</p>`, followUps: ['Which DI features still work under AOT?', 'Is AOT worth it for a long-running API with steady traffic?'] },
    { level: 'E', q: 'How would you protect an API from abuse and overload?', a: `<p>Layers: authentication and per-client identification; the built-in <b>rate limiting middleware</b> (${C('AddRateLimiter')} with fixed window, sliding window, token bucket or concurrency limiters, partitioned by user or API key, returning 429 with ${C('Retry-After')}); request size limits in Kestrel and on JSON; timeouts (${C('AddRequestTimeouts')} in .NET 8) and cancellation tokens passed to the database; output caching for hot reads; and back-pressure at the gateway. Inside, keep handlers async, avoid sync-over-async thread-pool starvation, and bound queues. Monitor 429/5xx rates and latency, and load-test to set limits from data rather than guesses.</p>`, followUps: ['Fixed window vs token bucket — trade-offs?', 'Where should rate limiting live: gateway or app?'] }
  );

  /* Spread correct answers across positions. */
  function rotate(m, k) {
    var n = m.options.length; k = k % n;
    if (!k) return;
    m.options = m.options.slice(k).concat(m.options.slice(0, k));
    m.answer = (m.answer - k + n) % n;
  }
  quiz.forEach(function (q, i) { rotate(q, i * 3 + 1); });
  var mcqIdx = 0;
  topics.forEach(function (t) { (t.problems || []).forEach(function (p) { rotate(p.mcq, mcqIdx++ * 3 + 2); }); });
  practice.forEach(function (p) { rotate(p.mcq, mcqIdx++ * 3 + 2); });

  registerModule({
    id: 'csharp14',
    title: 'ASP.NET Core Web APIs',
    lang: 'csharp',
    intro: `<p>Almost every C# backend job interview ends up in ASP.NET Core. This module explains how a web API really works, from the moment Kestrel receives a request to the moment a JSON (or ProblemDetails) response leaves: the <b>middleware pipeline</b>, the built-in <b>dependency-injection container</b> and its lifetimes, <b>minimal APIs vs controllers</b>, <b>routing and model binding</b>, <b>configuration and the options pattern</b>, <b>filters and validation</b>, <b>authentication and authorization</b> with JWT and policies, and <b>logging and ProblemDetails</b> errors — all on .NET 8/9.</p>
<p>ASP.NET Core snippets are shown for reading (they need the web framework, which the in-browser checker does not load). Every problem, though, is plain modern C# that you can run and test: you build the framework's core ideas yourself — a middleware pipeline, a DI container with the captive-dependency check, a route matcher, an options binder, a policy evaluator and a JWT validator.</p>`,
    goals: [
      'Order middleware correctly, write custom middleware, and explain short-circuiting and how <code>Build()</code> composes the pipeline',
      'Choose singleton, scoped and transient lifetimes, and detect and fix captive dependencies',
      'Build endpoints with minimal APIs (typed results, route groups, endpoint filters) and controllers, and justify the choice',
      'Predict which route wins, bind values from route, query, header and body, and generate links',
      'Layer configuration providers and bind validated, typed options with <code>IOptions</code>, <code>IOptionsSnapshot</code> and <code>IOptionsMonitor</code>',
      'Validate input and return ValidationProblemDetails; use filters for action-level cross-cutting logic',
      'Secure APIs with JWT bearer authentication and policy-based (including resource-based) authorization, and return 401 vs 403 correctly',
      'Log with structured templates and per-category levels, and map exceptions to ProblemDetails with trace ids'
    ],
    prereqs: `C# 6 (Delegates, Lambdas, Events &amp; LINQ) and C# 9 (Async/Await &amp; Tasks). C# 11 (Reflection &amp; Attributes) helps for the attribute and binder topics. A .NET 8 or 9 SDK to run the examples.`,
    hours: 16,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
