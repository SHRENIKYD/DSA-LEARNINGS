(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ---------------- shared helpers for prose + visualizers ---------------- */
  // C('DbSet<T>') → inline code with < > escaped; P(`...`) → escaped code block inside prose.
  function C(s) { return '<code>' + H.esc(s) + '</code>'; }
  function P(s) { return '<pre><code>' + H.esc(String(s).replace(/^\n+/, '').replace(/\s+$/, '')) + '</code></pre>'; }
  function esc(s) { return H.esc(s); }
  function note(label, html) { return { type: 'text', label: label, html: html }; }
  /* step = { l: line | [lines], cls, v: {vars}, hv, vl, extra: [parts], narr } */
  function codeFrames(code, steps, label) {
    return steps.map(function (s) {
      var hl = {};
      [].concat(s.l === undefined ? [] : s.l).forEach(function (n) { hl[n] = s.cls || 'cur'; });
      var parts = [{ type: 'code', label: label || 'Source (highlighted line = what runs now)', lang: 'csharp', code: code, hl: hl }];
      if (s.v) parts.push({ type: 'vars', label: s.vl || 'State', vals: s.v, hl: s.hv || {} });
      (s.extra || []).forEach(function (p) { parts.push(p); });
      return { narr: s.narr, parts: parts };
    });
  }
  // EF Core code needs the Microsoft.EntityFrameworkCore packages and a database, so it is shown but not compiled.
  function EF(code, title) { var s = { lang: 'csharp', check: false, code: code }; if (title) s.title = title; return s; }

  /* ======================================================================
     TOPIC 1 — DbContext and its lifetime
     ====================================================================== */
  var T1_CODE = [
    'builder.Services.AddDbContext<ShopDb>(o =>',
    '    o.UseSqlServer(connStr));            // registered as Scoped',
    '',
    'app.MapGet("/orders/{id}", async (int id, ShopDb db) =>',
    '{',
    '    var order = await db.Orders.FindAsync(id);   // same db for the whole request',
    '    order!.Seen = true;',
    '    await db.SaveChangesAsync();',
    '});                                       // scope ends → db.Dispose()'
  ].join('\n');
  topics.push({
    title: 'DbContext: The Unit of Work and Its Lifetime',
    analogy: `<p>A <b>DbContext</b> is like a shopping trolley in a supermarket. You take one when you walk in, put items in it, change your mind and take some out, and at the till (${C('SaveChanges')}) everything in it is paid for in one go. Then you return the trolley. You never share one trolley with a stranger at the same time, and you never keep the same trolley for a whole year — it would fill up with stale things. One trolley per shopping trip = <b>one DbContext per unit of work</b> (in a web app, per request).</p>`,
    explain: `<p>${C('DbContext')} is EF Core's main class. It holds a database connection (opened only when needed), a <b>change tracker</b> that remembers every entity it loaded, and a ${C('DbSet<T>')} per table. It implements the <b>Unit of Work</b> pattern: you make many changes in memory, and ${C('SaveChanges')} writes them together in one transaction.</p>
<h4>1. Defining one</h4>
${P(`
public class ShopDb(DbContextOptions<ShopDb> options) : DbContext(options)
{
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<Customer> Customers => Set<Customer>();
    protected override void OnModelCreating(ModelBuilder b) =>
        b.Entity<Order>().Property(o => o.Total).HasPrecision(18, 2);
}`)}
<h4>2. Lifetimes with dependency injection</h4>
${H.table(['Registration', 'Lifetime', 'Use it when'], [
  [C('AddDbContext<T>'), '<b>Scoped</b> (one per HTTP request)', 'normal web apps and APIs'],
  [C('AddDbContextPool<T>'), 'Scoped, but instances are <b>reset and reused</b> from a pool', 'very high request rates; context setup cost shows in profiles'],
  [C('AddDbContextFactory<T>'), 'you create short-lived contexts yourself', 'Blazor Server, background services, parallel work']
])}
<h4>3. Rules that keep you out of trouble</h4>
<ul><li>A DbContext is <b>not thread-safe</b>. Two queries at once on the same instance throw "A second operation was started on this context instance before a previous operation completed". Always ${C('await')} each call.</li>
<li><b>Short-lived</b>. The change tracker grows with every tracked entity; a context kept for hours becomes slow and returns stale data.</li>
<li>Never inject a scoped DbContext into a <b>singleton</b> (the "captive dependency" bug). In a hosted service, create a scope with ${C('IServiceScopeFactory')} or use ${C('IDbContextFactory<T>')}.</li>
<li>${C('Dispose')} it (DI does this at the end of the scope; with a factory use ${C('using')}).</li></ul>`,
    clues: ['"A second operation was started on this context instance" → the same DbContext is shared across concurrent work', '"inject DbContext into a singleton / BackgroundService" → captive dependency; use a scope or IDbContextFactory', '"high throughput API, context creation shows in the profiler" → AddDbContextPool', '"Blazor Server component keeps stale data" → a circuit lives long; use a factory and short-lived contexts', '"unit of work" / "save everything at once" → one DbContext per business operation'],
    code: [EF(`
// Program.cs — the three registration styles
builder.Services.AddDbContext<ShopDb>(o => o.UseSqlServer(cs));            // scoped
builder.Services.AddDbContextPool<ShopDb>(o => o.UseSqlServer(cs), poolSize: 1024);
builder.Services.AddDbContextFactory<ShopDb>(o => o.UseSqlServer(cs));

// A background worker: never capture a scoped context in a singleton.
public sealed class Cleaner(IDbContextFactory<ShopDb> factory) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        while (!ct.IsCancellationRequested)
        {
            await using var db = await factory.CreateDbContextAsync(ct);   // fresh, short-lived
            await db.Orders.Where(o => o.Expired).ExecuteDeleteAsync(ct);
            await Task.Delay(TimeSpan.FromMinutes(5), ct);
        }
    }
}`, 'Registering a DbContext and using a factory in a background service')],
    codeTitle: ['DbContext registration'],
    viz: {
      title: 'One scoped DbContext per HTTP request',
      gen: function () {
        return codeFrames(T1_CODE, [
          { l: [1, 2], v: { registration: 'Scoped', instances: 0 }, narr: '<b>AddDbContext</b> registers the context as <b>Scoped</b>: DI creates one per scope, and ASP.NET Core opens one scope per request.' },
          { l: 4, v: { request: '#1', instances: 1, 'db (req #1)': 'ShopDb@A' }, hv: { 'db (req #1)': 'ok' }, narr: 'Request #1 arrives. DI builds <code>ShopDb@A</code> for this request only.' },
          { l: 6, v: { request: '#1', tracked: 'Order 42 (Unchanged)' }, narr: '<code>FindAsync</code> runs a SELECT and the change tracker now remembers Order 42 with a snapshot of its values.' },
          { l: 7, v: { request: '#1', tracked: 'Order 42 (Modified)' }, hv: { tracked: 'win' }, narr: 'Changing a property is a plain C# assignment. EF notices it when it next runs DetectChanges.' },
          { l: 8, v: { request: '#1', sql: 'UPDATE Orders SET Seen = 1 WHERE Id = 42' }, narr: '<b>SaveChanges</b> compares values with the snapshot and writes only what changed, in one transaction.' },
          { l: 9, v: { request: '#1', 'db (req #1)': 'disposed' }, hv: { 'db (req #1)': 'bad' }, narr: 'The request ends, the scope is disposed, and so is the context. Its tracked entities are forgotten.' },
          { l: 4, v: { request: '#2 and #3 in parallel', instances: 3, 'db (req #2)': 'ShopDb@B', 'db (req #3)': 'ShopDb@C' }, hv: { 'db (req #2)': 'ok', 'db (req #3)': 'ok' }, narr: 'Two parallel requests get <b>two different</b> contexts, so they never share a change tracker or a connection. That is why scoped is safe.', extra: [note('Rule', 'One context per unit of work. Never share one across threads.')] }
        ]);
      }
    },
    examples: [
      { title: 'The captive dependency bug', html: `<p>A singleton ${C('PriceCache')} takes ${C('ShopDb')} in its constructor. The first request's context is captured forever: it is used from many threads (exceptions) and its tracker keeps growing (memory leak, stale prices). With ${C('ValidateScopes')} on (the default in Development), the host refuses to start. The fix is to inject ${C('IDbContextFactory<ShopDb>')} or ${C('IServiceScopeFactory')}.</p>` },
      { title: 'Running queries in parallel the right way', html: `<p>${C('Task.WhenAll(db.A.ToListAsync(), db.B.ToListAsync())')} on one context throws. Create one context per task instead.</p>`, code: EF(`
async Task<(List<Order>, List<Customer>)> LoadBoth(IDbContextFactory<ShopDb> f)
{
    await using var db1 = await f.CreateDbContextAsync();
    await using var db2 = await f.CreateDbContextAsync();
    var t1 = db1.Orders.AsNoTracking().ToListAsync();
    var t2 = db2.Customers.AsNoTracking().ToListAsync();
    await Task.WhenAll(t1, t2);
    return (t1.Result, t2.Result);
}`) },
      { title: 'Context pooling and state', html: `<p>${C('AddDbContextPool')} keeps up to ${C('poolSize')} (default 1024) instances. When a scope ends, the context is <b>reset</b> (tracker cleared, connection returned) instead of thrown away. Because the instance is reused, the context must not keep per-request state in its own fields; use a scoped service or ${C('IDbContextFactory')} with ${C('PooledDbContextFactory')} for per-tenant setup.</p>` }
    ],
    deepDive: `<p><b>What a context costs.</b> The <b>model</b> (entity types, keys, mappings built from ${C('OnModelCreating')}) is built once per context type and cached for the process, so a new context is cheap: a few allocations plus service lookups in EF's internal service provider. Pooling removes even that and measurably helps only at thousands of requests per second. For very large models, <b>compiled models</b> (${C('dotnet ef dbcontext optimize')}) cut the first-use model build from seconds to milliseconds.</p>
<p><b>Connections.</b> The context opens the ADO.NET connection just before a command and closes it right after (returning it to the ADO.NET pool), unless you opened it yourself or a transaction is active. So a context living a whole request does not hold a connection the whole time.</p>
<p><b>Concurrency detection.</b> EF Core keeps a simple "in use" flag; a second async call while the first is running throws ${C('InvalidOperationException')}. This is a safety net, not a lock, and it does not catch every misuse from multiple threads.</p>
<p><b>Disposal.</b> Disposing releases the tracker and the connection. Using an entity after its context is disposed is fine for reading loaded properties, but lazy loading then throws.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants scaffold the DbContext, entity classes and ${C('AddDbContext')} line in seconds, and can reverse-engineer a model from an existing database (${C('dotnet ef dbcontext scaffold')}). <b>Where AI goes wrong:</b> it often injects a DbContext into a singleton or a ${C('BackgroundService')} constructor, fires parallel queries with ${C('Task.WhenAll')} on one context, or keeps a static context "for performance". <b>Use AI as a partner:</b> ask "which lifetime does each service here have, and does any singleton capture a scoped service?". <b>What you must own:</b> choosing the unit-of-work boundary — which changes must succeed or fail together — and the lifetime that matches your host (web request, Blazor circuit, worker loop).</p>`,
    problems: [{
      title: 'How Many Contexts Were Created?',
      level: 'Easy', tags: ['DbContext', 'dependency injection', 'lifetimes'], companies: ['Microsoft', 'Accenture'],
      statement: `<p>A service is resolved from DI several times. ${C('requests[i]')} is the id of the HTTP request (the DI scope) in which the i-th resolution happened. Write ${C('static int CountContexts(string lifetime, string[] requests)')} that returns how many DbContext instances DI creates when the context is registered as ${C('"Scoped"')}, ${C('"Transient"')} or ${C('"Singleton"')}.</p>`,
      constraints: `0 ≤ requests.Length ≤ 10<sup>5</sup>. lifetime is one of the three words.`,
      example: `<p>${C('CountContexts("Scoped", ["r1","r1","r2","r1","r3"])')} → ${H.c('g', '3')}: one instance per distinct request (r1, r2, r3). As ${C('"Transient"')} the answer would be 5 (one per resolution); as ${C('"Singleton"')}, 1.</p>`,
      brute: { why: `<p>Checking each request id against every earlier one is O(n²). A hash set of seen request ids does it in one pass.</p>`, code: `
public class Brute
{
    public static int CountScoped(string[] requests)
    {
        int count = 0;
        for (int i = 0; i < requests.Length; i++)
        {
            bool seen = false;
            for (int j = 0; j < i; j++) if (requests[j] == requests[i]) seen = true;
            if (!seen) count++;
        }
        return count;
    }
}` },
      mcq: { q: 'Which lifetime does <code>AddDbContext&lt;T&gt;()</code> use by default?', options: ['Scoped', 'Transient', 'Singleton', 'Pooled singleton'], answer: 0, explain: 'AddDbContext registers the context (and its options) as scoped, so each request gets its own instance.' },
      hints: [`<p>Hint 1: Scoped means "one per scope" — count the distinct scope ids.</p>`, `<p>Hint 2: a ${C('HashSet<string>')} gives the distinct count; Transient is just the number of resolutions.</p>`, `<p>Hint 3: Singleton creates one instance only if it is resolved at least once; an empty array means zero instances for every lifetime.</p>`],
      tests: { sig: 'string string[] -> int', fn: 'countContexts', cases: [[["Scoped", ["r1", "r1", "r2", "r1", "r3"]], 3], [["Transient", ["r1", "r1", "r2"]], 3], [["Singleton", ["r1", "r2", "r3"]], 1], [["Scoped", []], 0], [["Singleton", []], 0], [["Scoped", ["a"]], 1], [["Transient", []], 0], [["Scoped", ["x", "y", "x", "y", "z", "z"]], 3]] },
      solution: {
        approach: `<p>Map the lifetime to a counting rule: Scoped = number of distinct scopes, Transient = number of resolutions, Singleton = 1 if resolved at all. A switch expression keeps it readable.</p>`,
        code: `
public class Solution
{
    public static int CountContexts(string lifetime, string[] requests) => lifetime switch
    {
        "Scoped"    => requests.ToHashSet().Count,     // one per request scope
        "Transient" => requests.Length,                // a new one every resolution
        "Singleton" => requests.Length > 0 ? 1 : 0,    // created lazily, once
        _ => throw new ArgumentException("unknown lifetime", nameof(lifetime))
    };
}`,
        dry: { head: ['resolution', 'request', 'new instance? (Scoped)', 'count'], rows: [['1', 'r1', 'yes', '1'], ['2', 'r1', 'no (same scope)', '1'], ['3', 'r2', 'yes', '2'], ['4', 'r1', 'no', '2'], ['5', 'r3', 'yes', '3']] },
        complexity: `<p>O(n) time and O(n) extra space for the set.</p>`,
        followUps: ['What changes with AddDbContextPool? (the same count of logical instances, but objects are reused from the pool)', 'Why is Singleton wrong for a DbContext even though it creates the fewest objects?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 2 — Change tracking and tracking vs no-tracking
     ====================================================================== */
  var T2_CODE = [
    'var blog = await db.Blogs.FirstAsync(b => b.Id == 1);   // Unchanged',
    'blog.Url = "https://new.example";                       // still Unchanged until DetectChanges',
    'db.Blogs.Add(new Blog { Url = "https://b.example" });   // Added',
    'db.Remove(oldPost);                                     // Deleted',
    'db.ChangeTracker.DetectChanges();                       // blog → Modified',
    'await db.SaveChangesAsync();                            // INSERT, UPDATE, DELETE',
    'var list = await db.Blogs.AsNoTracking().ToListAsync(); // not tracked at all'
  ].join('\n');
  topics.push({
    title: 'Change Tracking, Entity States and AsNoTracking',
    analogy: `<p>Imagine a teacher who photocopies every exam paper the moment she hands it out. When papers come back, she lays each one next to its photocopy and circles only what changed. That photocopy is EF Core's <b>snapshot</b>, and comparing is <b>DetectChanges</b>. If you only want to <i>read</i> the papers aloud and never take them back, making photocopies is wasted paper — that is what ${C('AsNoTracking')} skips.</p>`,
    explain: `<p>Every entity a context knows about has an ${C('EntityState')}:</p>
${H.table(['State', 'Meaning', 'What SaveChanges does', 'State after save'], [
  [C('Detached'), 'the context does not know it', 'nothing', '—'],
  [C('Added'), 'new, not in the database yet', 'INSERT', 'Unchanged'],
  [C('Unchanged'), 'loaded, no differences from the snapshot', 'nothing', 'Unchanged'],
  [C('Modified'), 'one or more properties differ', 'UPDATE of the changed columns only', 'Unchanged'],
  [C('Deleted'), 'marked for removal', 'DELETE', 'Detached']
])}
<h4>How entities get their state</h4>
<ul><li>A <b>tracking query</b> (the default) attaches results as <b>Unchanged</b> and stores a snapshot of original values.</li>
<li>${C('Add')} → Added. ${C('Attach')} → Unchanged. ${C('Update')} → Modified (all properties). ${C('Remove')} → Deleted (or Detached if it was Added — it never reached the database).</li>
<li>Assigning a property does not change the state immediately. ${C('DetectChanges')} (run automatically by ${C('SaveChanges')}, ${C('Entries()')} and a few others) compares current values with the snapshot.</li></ul>
<h4>Identity resolution</h4>
<p>A tracking context keeps <b>one instance per primary key</b>. Querying Blog 1 twice returns the <b>same object</b>, and its in-memory changes are not overwritten by the database values.</p>
<h4>No-tracking queries</h4>
${H.table(['Query', 'Snapshot?', 'Same key → same object?', 'Use for'], [
  ['default (tracking)', 'yes', 'yes', 'load, edit, save'],
  [C('AsNoTracking()'), 'no', 'no — one object per row', 'read-only lists, APIs, reports'],
  [C('AsNoTrackingWithIdentityResolution()'), 'no', 'yes, within this query', 'read-only graphs with repeated entities']
])}
<p>You can make no-tracking the default with ${C('optionsBuilder.UseQueryTrackingBehavior(QueryTrackingBehavior.NoTracking)')} and opt in with ${C('AsTracking()')}.</p>`,
    clues: ['"read-only endpoint / report is slow and uses lots of memory" → AsNoTracking', '"I changed a property but SaveChanges did nothing" → entity is Detached (no-tracking query or another context)', '"The instance of entity type cannot be tracked because another instance with the same key is already being tracked" → identity resolution conflict', '"update a disconnected entity from an API DTO" → Attach/Update or load-then-copy', '"only changed columns in the UPDATE" → snapshot change tracking'],
    code: [EF(`
await using var db = new ShopDb(options);

var blog = await db.Blogs.SingleAsync(b => b.Id == 1);
Console.WriteLine(db.Entry(blog).State);              // Unchanged
blog.Rating = 5;
Console.WriteLine(db.Entry(blog).State);              // Modified (Entry() runs DetectChanges)
Console.WriteLine(db.Entry(blog).Property(b => b.Rating).OriginalValue); // the snapshot value

var again = await db.Blogs.SingleAsync(b => b.Id == 1);
Console.WriteLine(ReferenceEquals(blog, again));      // True — identity resolution

var readOnly = await db.Blogs.AsNoTracking().SingleAsync(b => b.Id == 1);
Console.WriteLine(db.Entry(readOnly).State);          // Detached

// Disconnected update: the client sent a full Blog
db.ChangeTracker.Clear();
db.Update(new Blog { Id = 1, Url = "https://x", Rating = 4 });  // Modified, all columns
await db.SaveChangesAsync();

Console.WriteLine(db.ChangeTracker.DebugView.LongView); // every tracked entity and its state`, 'Entity states in practice')],
    codeTitle: ['Change tracker tour'],
    viz: {
      title: 'Entity states through one unit of work',
      gen: function () {
        function tr(rows, hl) { return { type: 'table', label: 'Change tracker', columns: ['entity', 'state'], rows: rows, hl: hl || {} }; }
        return codeFrames(T2_CODE, [
          { l: 1, narr: 'A tracking query returns Blog 1 and stores a <b>snapshot</b> of its values.', extra: [tr([['Blog 1', 'Unchanged']])] },
          { l: 2, narr: 'A plain assignment. The tracker has not looked yet, so the state still says Unchanged.', extra: [tr([['Blog 1', 'Unchanged (Url differs from snapshot)']], { 0: 'win' })] },
          { l: 3, narr: '<b>Add</b> marks a new object Added. It has no real key yet (a temporary one).', extra: [tr([['Blog 1', 'Unchanged'], ['Blog (new)', 'Added']], { 1: 'ok' })] },
          { l: 4, narr: '<b>Remove</b> on a tracked Unchanged entity marks it Deleted.', extra: [tr([['Blog 1', 'Unchanged'], ['Blog (new)', 'Added'], ['Post 9', 'Deleted']], { 2: 'bad' })] },
          { l: 5, narr: '<b>DetectChanges</b> compares current values with the snapshot: Url differs, so Blog 1 becomes Modified.', extra: [tr([['Blog 1', 'Modified'], ['Blog (new)', 'Added'], ['Post 9', 'Deleted']], { 0: 'win' })] },
          { l: 6, narr: '<b>SaveChanges</b> sends INSERT, UPDATE (only Url) and DELETE in one transaction, then accepts the changes.', extra: [tr([['Blog 1', 'Unchanged'], ['Blog 2', 'Unchanged (real key from the database)']], { 1: 'ok' }), note('SQL', 'INSERT Blogs …; UPDATE Blogs SET Url = @p0 WHERE Id = @p1; DELETE FROM Posts WHERE Id = @p2;')] },
          { l: 7, narr: '<b>AsNoTracking</b> materializes objects without snapshots. They never appear in the tracker, so editing them saves nothing.', extra: [tr([['Blog 1', 'Unchanged'], ['Blog 2', 'Unchanged']]), note('list', 'two new Blog objects, state Detached')] }
        ]);
      }
    },
    examples: [
      { title: 'The "already being tracked" error', html: `<p>You load Blog 1, then receive a DTO for Blog 1 and call ${C('db.Update(new Blog { Id = 1, ... })')}. The tracker already holds an instance with key 1, so EF throws. Either copy values onto the tracked instance (${C('db.Entry(tracked).CurrentValues.SetValues(dto)')}) or load with AsNoTracking first.</p>` },
      { title: 'Why AsNoTracking is faster', html: `<p>For 10 000 rows a tracking query also creates 10 000 snapshots, registers each key in the identity map, and fixes up navigations. AsNoTracking skips all of that: less CPU and roughly half the memory for read-only work. Projections to DTOs (${C('Select(b => new BlogDto(...))')}) are never tracked either, because they are not entity types.</p>` },
      { title: 'Turning off automatic DetectChanges in a bulk loop', html: `<p>Adding 50 000 entities with ${C('Add')} in a loop is fine (Add does not scan everything), but calling ${C('Entry()')} or querying inside the loop triggers DetectChanges over all tracked entities each time — O(n²). For bulk imports use ${C('AddRange')}, set ${C('ChangeTracker.AutoDetectChangesEnabled = false')} around the loop, or use ${C('ExecuteUpdate')} / bulk copy instead.</p>`, code: EF(`
db.ChangeTracker.AutoDetectChangesEnabled = false;
try
{
    foreach (var row in rows) db.Products.Add(new Product { Sku = row.Sku, Price = row.Price });
    await db.SaveChangesAsync();          // SaveChanges still detects changes once
}
finally { db.ChangeTracker.AutoDetectChangesEnabled = true; }`) }
    ],
    deepDive: `<p><b>Snapshot vs notification tracking.</b> By default EF Core keeps an array of original values per entity and compares on DetectChanges — O(tracked entities × properties). Entities that implement ${C('INotifyPropertyChanged')}/${C('INotifyPropertyChanging')} can use ${C('ChangeTrackingStrategy.ChangingAndChangedNotifications')}, which removes the scan; proxies (${C('UseChangeTrackingProxies')}) generate that code for you.</p>
<p><b>Key generation.</b> An Added entity with a store-generated key gets a <b>temporary</b> negative value; after INSERT, EF reads the real key (OUTPUT/RETURNING) and fixes up foreign keys on dependents in the same SaveChanges.</p>
<p><b>Fix-up.</b> When an entity becomes tracked, EF connects navigation properties to other tracked entities with matching keys. That is why a no-tracking query's graph contains duplicate instances: there is no identity map to fix up against (unless you ask for identity resolution).</p>
<p><b>Disconnected graphs.</b> ${C('Update')} on a graph marks entities with a set key as Modified and those with a default key as Added. ${C('ChangeTracker.TrackGraph')} lets you decide per entity. Updating all columns may overwrite concurrent edits — combine with a concurrency token (topic 6).</p>
<p><b>Clear.</b> ${C('ChangeTracker.Clear()')} (EF Core 5+) detaches everything — handy in long batch loops to keep memory flat.</p>`,
    aiEra: `<p><b>What AI changes:</b> generated CRUD code is usually correct on the happy path, so the bugs you will review are state bugs. <b>Where AI goes wrong:</b> it adds ${C('AsNoTracking')} to a query and then edits the result and calls SaveChanges (nothing saved), calls ${C('Update')} on an entity that is already tracked, or calls ${C('db.Update')} for a single changed field and overwrites every column. <b>Use AI as a partner:</b> ask it to print ${C('ChangeTracker.DebugView.LongView')} in a failing test and explain each state. <b>What you must own:</b> deciding which endpoints are read-only (no tracking) and how disconnected updates are merged safely.</p>`,
    problems: [{
      title: 'Simulate the Change Tracker',
      level: 'Medium', tags: ['change tracking', 'EntityState', 'simulation'], companies: ['Microsoft', 'Avanade', 'EPAM'],
      statement: `<p>Model a context's change tracker. Each op is ${C('"Verb key"')} or ${C('"Save"')}:</p>
<ul><li>${C('Add k')} → Added; ${C('Query k')} and ${C('Attach k')} → Unchanged. If k is already tracked, these three change nothing (identity resolution).</li>
<li>${C('Modify k')}: Unchanged → Modified; any other state unchanged; ignored if k is not tracked (the context cannot see it).</li>
<li>${C('Remove k')}: Added → Detached (forgotten); Unchanged/Modified → Deleted; not tracked → it is attached as Deleted (as EF does).</li>
<li>${C('Detach k')}: forgotten. ${C('Save')}: Added/Modified → Unchanged, Deleted → forgotten.</li></ul>
<p>Return ${C('"key=State"')} for every tracked entity, in the order they <b>started</b> being tracked (a key tracked again after being forgotten goes to the end).</p>`,
      constraints: `0 ≤ ops ≤ 10<sup>4</sup>. Keys are short words without spaces.`,
      example: `<p>${C('["Add a","Query b","Modify b","Save"]')} → ${H.c('g', '["a=Unchanged","b=Unchanged"]')}: a was Added, b became Modified, and Save turned both into Unchanged.</p>`,
      brute: { why: `<p>Keeping a plain list of (key, state) pairs and searching it for every op is O(n) per op, O(n²) overall. A dictionary from key to state with an insertion-ordered structure is O(1) per op except Save.</p>`, code: `
public class Brute
{
    public static int IndexOf(List<(string Key, string State)> list, string key)
    {
        for (int i = 0; i < list.Count; i++) if (list[i].Key == key) return i;
        return -1;   // linear search on every operation
    }
}` },
      mcq: { q: 'You call <code>db.Remove(entity)</code> on an entity that is in the <b>Added</b> state. What happens on SaveChanges?', options: ['Nothing is sent for it: it becomes Detached because it never existed in the database', 'A DELETE is sent', 'An INSERT then a DELETE are sent', 'An exception is thrown'], answer: 0, explain: 'Removing an Added entity simply stops tracking it; there is no row to delete.' },
      hints: [`<p>Hint 1: keep a ${C('Dictionary<string, string>')} for states plus a list that remembers tracking order.</p>`, `<p>Hint 2: "forgetting" a key removes it from both; tracking it again appends it to the end of the order list.</p>`, `<p>Hint 3: on Save, walk the order list: Deleted entries are removed, all others become Unchanged. Remove on an untracked key adds it as Deleted.</p>`],
      tests: { sig: 'string[] -> string[]', fn: 'trackStates', cases: [[[["Add a", "Query b", "Modify b", "Save"]], ["a=Unchanged", "b=Unchanged"]], [[["Query a", "Remove a", "Save"]], []], [[["Add a", "Remove a"]], []], [[["Remove x"]], ["x=Deleted"]], [[["Add a", "Add a", "Modify a", "Save", "Modify a"]], ["a=Modified"]], [[[]], []], [[["Query a", "Detach a", "Query a", "Modify a"]], ["a=Modified"]], [[["Attach p", "Query p", "Modify q", "Add q", "Remove p", "Save", "Query p"]], ["q=Unchanged", "p=Unchanged"]], [[["Add a", "Add b", "Save", "Remove a", "Modify b", "Detach b", "Save"]], []]] },
      solution: {
        approach: `<p>Store states in a dictionary and the tracking order in a list. Each verb is a small state transition; Save rebuilds the order list without the Deleted keys.</p>`,
        code: `
public class Solution
{
    public static string[] TrackStates(string[] ops)
    {
        var state = new Dictionary<string, string>();
        var order = new List<string>();                     // tracking order

        void Track(string k, string s) { state[k] = s; order.Add(k); }
        void Forget(string k) { state.Remove(k); order.Remove(k); }

        foreach (var op in ops)
        {
            if (op == "Save")
            {
                foreach (var k in order.ToList())
                    if (state[k] == "Deleted") Forget(k); else state[k] = "Unchanged";
                continue;
            }
            var parts = op.Split(' ');
            string verb = parts[0], key = parts[1];
            bool tracked = state.TryGetValue(key, out var cur);
            switch (verb)
            {
                case "Add": if (!tracked) Track(key, "Added"); break;
                case "Query":
                case "Attach": if (!tracked) Track(key, "Unchanged"); break;
                case "Modify": if (cur == "Unchanged") state[key] = "Modified"; break;
                case "Remove":
                    if (!tracked) Track(key, "Deleted");
                    else if (cur == "Added") Forget(key);
                    else state[key] = "Deleted";
                    break;
                case "Detach": if (tracked) Forget(key); break;
            }
        }
        return order.Select(k => $"{k}={state[k]}").ToArray();
    }
}`,
        dry: { head: ['op', 'tracker after op'], rows: [['Add a', 'a=Added'], ['Query b', 'a=Added, b=Unchanged'], ['Modify b', 'a=Added, b=Modified'], ['Save', 'a=Unchanged, b=Unchanged']] },
        complexity: `<p>O(1) per verb except ${C('order.Remove')} (O(n)) and Save (O(n)); fine for 10<sup>4</sup> ops. A linked list plus a dictionary of nodes would make forgetting O(1).</p>`,
        followUps: ['Add an <code>Update k</code> verb (Detached → Modified, Added stays Added).', 'How would you also record which properties changed, like EF\'s snapshot?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 3 — Migrations
     ====================================================================== */
  var T3_CODE = [
    '// 1. change the model: add a property',
    'public int Rating { get; set; }',
    '// 2. dotnet ef migrations add AddRating',
    '//    → diff(ModelSnapshot, current model)',
    'migrationBuilder.AddColumn<int>("Rating", "Blogs", nullable: false, defaultValue: 0);',
    '// 3. snapshot file updated to include Rating',
    '// 4. dotnet ef migrations script --idempotent',
    '// 5. run the script in the deployment pipeline'
  ].join('\n');
  topics.push({
    title: 'Migrations: Evolving the Schema with the Model',
    analogy: `<p>Think of a building with a <b>renovation logbook</b>. The architect's latest drawing is your C# model. The logbook has numbered entries — "added a window to room 3", "removed the wall between 4 and 5" — and the building manager ticks off which entries were already done to this building. A new builder reads the drawing, compares it with the <b>last drawing in the log</b> (not the building itself), and writes only the new entry. That is exactly how EF Core migrations work: the model snapshot is the last drawing, each migration is a log entry, and the ${C('__EFMigrationsHistory')} table is the tick list.</p>`,
    explain: `<p>A <b>migration</b> is a C# class with an ${C('Up')} method (apply the change) and a ${C('Down')} method (undo it), made of operations such as ${C('CreateTable')}, ${C('AddColumn')}, ${C('AlterColumn')}, ${C('CreateIndex')}.</p>
<h4>The workflow</h4>
${H.table(['Command', 'What it does'], [
  [C('dotnet ef migrations add AddRating'), 'diffs the current model against <b>ModelSnapshot.cs</b>, writes a timestamped migration and updates the snapshot'],
  [C('dotnet ef migrations remove'), 'deletes the last migration if it has not been applied'],
  [C('dotnet ef database update [target]'), 'applies pending migrations (or rolls back to target using Down)'],
  [C('dotnet ef migrations script --idempotent'), 'produces a SQL script that checks the history table before each step — the recommended way to deploy'],
  [C('dotnet ef migrations bundle'), 'a self-contained executable that applies migrations (EF Core 6+)'],
  [C('dotnet ef migrations has-pending-model-changes'), 'fails if the model changed without a migration (EF Core 8+) — great in CI']
])}
<h4>Key facts</h4>
<ul><li>The diff is between the <b>snapshot and the model</b>, never the live database. Hand-editing the database makes them drift.</li>
<li>Migrations are ordered by their <b>timestamp id</b>; the history table stores the ids already applied.</li>
<li>EF cannot see intent. A <b>renamed</b> property looks like "drop column + add column" unless EF guesses a rename; always <b>read the generated migration</b> and change it to ${C('RenameColumn')} if needed, or you lose data.</li>
<li>Data changes go in the migration too: ${C('migrationBuilder.Sql("UPDATE ...")')}, or ${C('HasData')} for seed rows.</li>
<li>Calling ${C('Database.Migrate()')} at app start-up is convenient for development but risky in production (several instances racing, app needs DDL rights). EF Core 9 takes a lock around Migrate, but scripts or bundles in the pipeline are still preferred.</li></ul>`,
    clues: ['"deploy schema changes safely / in CI-CD" → idempotent scripts or migration bundles', '"renamed a property and the column data vanished" → generated drop+add instead of RenameColumn', '"two developers added migrations in parallel" → snapshot merge conflict; re-create the later migration', '"database already exists, adopt EF" → scaffold, then an empty baseline migration', '"zero-downtime deploy" → expand/contract migrations (add new, backfill, switch, remove old later)'],
    code: [EF(`
public partial class AddRating : Migration
{
    protected override void Up(MigrationBuilder mb)
    {
        mb.AddColumn<int>(name: "Rating", table: "Blogs", nullable: false, defaultValue: 0);
        mb.CreateIndex(name: "IX_Blogs_Rating", table: "Blogs", column: "Rating");
        mb.Sql("UPDATE Blogs SET Rating = 3 WHERE Url LIKE '%dotnet%'");   // data fix-up
    }

    protected override void Down(MigrationBuilder mb)
    {
        mb.DropIndex(name: "IX_Blogs_Rating", table: "Blogs");
        mb.DropColumn(name: "Rating", table: "Blogs");
    }
}

// A rename that EF generated as drop + add — fix it by hand:
// mb.RenameColumn(name: "Url", table: "Blogs", newName: "Link");`, 'A generated migration with a hand-written data step')],
    codeTitle: ['Migration class'],
    viz: {
      title: 'How "migrations add" finds the difference',
      gen: function () {
        function snap(rows, hl) { return { type: 'table', label: 'ModelSnapshot vs current model', columns: ['column', 'snapshot', 'model'], rows: rows, hl: hl || {} }; }
        return codeFrames(T3_CODE, [
          { l: [1, 2], narr: 'You change the C# model. Nothing touches the database yet.', extra: [snap([['Blogs.Id', 'int', 'int'], ['Blogs.Url', 'nvarchar', 'nvarchar'], ['Blogs.Rating', '—', 'int']], { 2: 'win' })] },
          { l: [3, 4], narr: '<b>migrations add</b> builds the current model and compares it with the <b>snapshot</b> (the model as of the last migration), not with the database.', extra: [snap([['Blogs.Id', 'int', 'int'], ['Blogs.Url', 'nvarchar', 'nvarchar'], ['Blogs.Rating', '—', 'int']], { 2: 'cur' })] },
          { l: 5, narr: 'The diff becomes migration operations. A column missing from the snapshot becomes <b>AddColumn</b>; a non-nullable int needs a default for existing rows.', extra: [note('operations', 'AddColumn Blogs.Rating (int, default 0)')] },
          { l: 6, narr: 'The snapshot file is rewritten to match the model, so the next diff starts from here.', extra: [snap([['Blogs.Id', 'int', 'int'], ['Blogs.Url', 'nvarchar', 'nvarchar'], ['Blogs.Rating', 'int', 'int']], { 2: 'ok' })] },
          { l: 7, narr: 'An <b>idempotent script</b> wraps each migration in IF NOT EXISTS (SELECT … FROM __EFMigrationsHistory WHERE MigrationId = …).', extra: [{ type: 'table', label: '__EFMigrationsHistory', columns: ['MigrationId', 'ProductVersion'], rows: [['20250101_Init', '9.0.0']] }] },
          { l: 8, narr: 'After the pipeline runs the script, the history table lists the new migration, so running the script again is a no-op.', extra: [{ type: 'table', label: '__EFMigrationsHistory', columns: ['MigrationId', 'ProductVersion'], rows: [['20250101_Init', '9.0.0'], ['20250310_AddRating', '9.0.0']], hl: { 1: 'ok' } }] }
        ]);
      }
    },
    examples: [
      { title: 'Rename without losing data', html: `<p>Renaming ${C('Url')} to ${C('Link')} may be scaffolded as ${C('DropColumn("Url")')} + ${C('AddColumn("Link")')}. Replace both with ${C('RenameColumn("Url", "Blogs", "Link")')}. Reviewing every generated migration is part of the job.</p>` },
      { title: 'Expand / contract for zero downtime', html: `<p>Old and new app versions run side by side during a rolling deploy, so a migration must work with both. Step 1 (expand): add the new nullable column and backfill it. Step 2: deploy code that writes both and reads the new one. Step 3 (contract, a later release): drop the old column.</p>` },
      { title: 'Checking for forgotten migrations in CI', html: `<p>EF Core 8 added a command that fails the build when the model has changes with no migration.</p>`, code: { lang: 'bash', code: `dotnet tool restore
dotnet ef migrations has-pending-model-changes --project src/Shop.Data
dotnet ef migrations script --idempotent --output artifacts/migrate.sql` } }
    ],
    deepDive: `<p><b>Snapshot conflicts.</b> Each migration also has a ${C('.Designer.cs')} with the target model. When two branches both add migrations, the snapshot file conflicts. Resolve by keeping one branch's migration, merging the model, removing the other migration and re-adding it so its diff is computed against the merged snapshot.</p>
<p><b>Providers.</b> Migrations are provider-specific (SQL Server types, SQLite's limited ALTER TABLE — EF rebuilds the table for SQLite). Keep one migrations assembly per provider if you support several.</p>
<p><b>Transactions.</b> Each migration runs in a transaction where the provider supports transactional DDL (SQL Server, PostgreSQL). Some operations (e.g. memory-optimized tables, some ${C('CREATE INDEX ONLINE')} options) cannot run in a transaction and need ${C('suppressTransaction: true')} in ${C('Sql()')}.</p>
<p><b>Large tables.</b> Adding a non-nullable column with a default, or an index, can lock a big table. Plan these as online operations, run them out of business hours, or split into small batches with ${C('migrationBuilder.Sql')}.</p>
<p><b>EnsureCreated</b> creates the schema without migrations and cannot evolve it later — fine for tests, never mix it with Migrate.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI can read a generated migration and explain what SQL it will run, spot drop+add pairs that should be renames, and write the backfill SQL for an expand/contract plan. <b>Where AI goes wrong:</b> it suggests ${C('Database.Migrate()')} at start-up in multi-instance production, deletes migrations that were already applied, or "fixes" a snapshot conflict by editing ModelSnapshot.cs by hand. <b>Use AI as a partner:</b> paste the migration and ask "which statements lock or lose data on a 50-million-row table?". <b>What you must own:</b> the deployment order, rollback plan, and data safety of every schema change.</p>`,
    problems: [{
      title: 'Compute a Migration Diff',
      level: 'Medium', tags: ['migrations', 'diff', 'hash map'], companies: ['Microsoft', 'Thoughtworks'],
      statement: `<p>Each model is a list of columns ${C('"Table.Column:type"')}. Write ${C('static string[] MigrationDiff(string[] snapshot, string[] model)')} that returns the operations needed to go from the snapshot to the model:</p>
<ul><li>${C('"CreateTable T"')} for a table only in the model (no AddColumn lines for its columns); ${C('"DropTable T"')} for a table only in the snapshot.</li>
<li>For tables in both: ${C('"AddColumn T.C"')}, ${C('"DropColumn T.C"')}, and ${C('"AlterColumn T.C old->new"')} when the type differs.</li></ul>
<p>Return the operations sorted with ordinal string order (so the output is deterministic).</p>`,
      constraints: `Up to 10<sup>4</sup> columns. Names contain no dots, colons or spaces; a type may contain parentheses.`,
      example: `<p>Snapshot ${C('["Blogs.Id:int","Blogs.Url:nvarchar","Tags.Id:int"]')}, model ${C('["Blogs.Id:int","Blogs.Link:nvarchar","Posts.Id:int"]')} → ${H.c('g', '["AddColumn Blogs.Link","CreateTable Posts","DropColumn Blogs.Url","DropTable Tags"]')}. Note how a rename looks like add + drop — the reason you must review migrations.</p>`,
      brute: { why: `<p>For each model column, scanning the whole snapshot list to find its table and column is O(n·m). Grouping both sides into dictionaries first makes every lookup O(1).</p>`, code: `
public class Brute
{
    public static bool ColumnExists(string[] model, string tableDotColumn)
    {
        foreach (var e in model)                       // O(n) per lookup
            if (e.Split(':')[0] == tableDotColumn) return true;
        return false;
    }
}` },
      mcq: { q: 'What does <code>dotnet ef migrations add</code> compare the current model with?', options: ['The ModelSnapshot file from the previous migration', 'The live database schema', 'The __EFMigrationsHistory table', 'The last generated SQL script'], answer: 0, explain: 'The diff is model vs snapshot. The database is never read, which is why manual schema edits cause drift.' },
      hints: [`<p>Hint 1: parse each side into ${C('Dictionary<table, Dictionary<column, type>>')}.</p>`, `<p>Hint 2: walk the model's tables: missing in the snapshot → CreateTable; otherwise compare its columns both ways. Then walk the snapshot's tables for DropTable.</p>`, `<p>Hint 3: sort with ${C('StringComparer.Ordinal')}; an identical model gives an empty array.</p>`],
      tests: { sig: 'string[] string[] -> string[]', fn: 'migrationDiff', cases: [[[["Blogs.Id:int", "Blogs.Url:nvarchar"], ["Blogs.Id:int", "Blogs.Url:nvarchar", "Blogs.Rating:int"]], ["AddColumn Blogs.Rating"]], [[["Blogs.Id:int"], ["Blogs.Id:int"]], []], [[[], ["Posts.Id:int", "Posts.Title:nvarchar"]], ["CreateTable Posts"]], [[["Posts.Id:int", "Posts.Title:nvarchar"], []], ["DropTable Posts"]], [[["A.Id:int", "A.Name:nvarchar(50)"], ["A.Id:bigint", "A.Name:nvarchar(100)"]], ["AlterColumn A.Id int->bigint", "AlterColumn A.Name nvarchar(50)->nvarchar(100)"]], [[["Blogs.Id:int", "Blogs.Url:nvarchar", "Tags.Id:int"], ["Blogs.Id:int", "Blogs.Link:nvarchar", "Posts.Id:int"]], ["AddColumn Blogs.Link", "CreateTable Posts", "DropColumn Blogs.Url", "DropTable Tags"]], [[["U.Id:int", "U.Email:nvarchar"], ["U.Id:int"]], ["DropColumn U.Email"]]] },
      solution: {
        approach: `<p>Group both lists by table, then compare like EF's model differ: tables first, then columns inside tables present on both sides. Sort the operations at the end.</p>`,
        code: `
public class Solution
{
    static Dictionary<string, Dictionary<string, string>> Parse(string[] cols)
    {
        var tables = new Dictionary<string, Dictionary<string, string>>();
        foreach (var c in cols)
        {
            int colon = c.IndexOf(':'), dot = c.IndexOf('.');
            string table = c[..dot], column = c[(dot + 1)..colon], type = c[(colon + 1)..];
            if (!tables.TryGetValue(table, out var t)) tables[table] = t = new();
            t[column] = type;
        }
        return tables;
    }

    public static string[] MigrationDiff(string[] snapshot, string[] model)
    {
        var before = Parse(snapshot);
        var after = Parse(model);
        var ops = new List<string>();
        foreach (var (table, cols) in after)
        {
            if (!before.TryGetValue(table, out var old)) { ops.Add($"CreateTable {table}"); continue; }
            foreach (var (col, type) in cols)
            {
                if (!old.TryGetValue(col, out var oldType)) ops.Add($"AddColumn {table}.{col}");
                else if (oldType != type) ops.Add($"AlterColumn {table}.{col} {oldType}->{type}");
            }
            foreach (var col in old.Keys)
                if (!cols.ContainsKey(col)) ops.Add($"DropColumn {table}.{col}");
        }
        foreach (var table in before.Keys)
            if (!after.ContainsKey(table)) ops.Add($"DropTable {table}");
        ops.Sort(StringComparer.Ordinal);
        return ops.ToArray();
    }
}`,
        dry: { head: ['table', 'snapshot', 'model', 'operations'], rows: [['Blogs', 'Id, Url', 'Id, Link', 'AddColumn Blogs.Link, DropColumn Blogs.Url'], ['Posts', '—', 'Id', 'CreateTable Posts'], ['Tags', 'Id', '—', 'DropTable Tags'], ['(sorted)', '', '', 'Add…, Create…, DropColumn…, DropTable…']] },
        complexity: `<p>O(n log n) for n columns (dominated by the final sort); O(n) space.</p>`,
        followUps: ['Detect a likely rename: a dropped and an added column of the same type in the same table.', 'Order operations so that dropping a table that others reference happens after dropping the foreign keys.']
      }
    }]
  });

  /* ======================================================================
     TOPIC 4 — Relationships, loading strategies and N+1
     ====================================================================== */
  var T4_CODE = [
    'var blogs = await db.Blogs.ToListAsync();            // query 1',
    'foreach (var b in blogs)',
    '    Console.WriteLine(b.Posts.Count);                  // lazy: 1 query per blog!',
    '',
    'var eager = await db.Blogs',
    '    .Include(b => b.Posts)                             // one JOIN query',
    '    .ToListAsync();'
  ].join('\n');
  topics.push({
    title: 'Relationships and Loading: Include, Explicit, Lazy and N+1',
    analogy: `<p>You need the phone numbers of 100 students. The <b>N+1</b> way: ask the office for the class list (1 trip), then walk back to the office once per student for their number (100 trips). The <b>eager</b> way: ask once for "the class list with phone numbers attached". Lazy loading is the helpful assistant who silently makes those 100 trips for you every time you glance at a name — convenient, until you notice the corridor is full.</p>`,
    explain: `<p><b>Relationships</b> are configured by convention (a ${C('BlogId')} property plus a ${C('Blog')} navigation) or with the fluent API:</p>
${P(`
modelBuilder.Entity<Post>()
    .HasOne(p => p.Blog).WithMany(b => b.Posts)     // one-to-many
    .HasForeignKey(p => p.BlogId)
    .OnDelete(DeleteBehavior.Cascade);
modelBuilder.Entity<Post>().HasMany(p => p.Tags).WithMany(t => t.Posts); // many-to-many, join table implicit`)}
<p>Related data is <b>not loaded</b> by default. You choose how:</p>
${H.table(['Strategy', 'How', 'Queries for 100 blogs', 'Notes'], [
  ['<b>Eager</b>', C('.Include(b => b.Posts).ThenInclude(p => p.Tags)'), '1 (JOIN) or 1 per collection with AsSplitQuery', 'you decide up front; filtered Include is allowed'],
  ['<b>Explicit</b>', C('await db.Entry(b).Collection(x => x.Posts).LoadAsync()'), '1 + one per call', 'load later, on demand, still visible in code'],
  ['<b>Lazy</b>', 'proxies (' + C('UseLazyLoadingProxies') + ') + virtual navigations', '1 + 100 (N+1)', 'loads when the property is first read; hidden queries'],
  ['<b>Projection</b>', C('Select(b => new { b.Url, Count = b.Posts.Count() })'), '1', 'often best: fetch only the columns you need']
])}
<h4>The N+1 problem</h4>
<p>One query for the parents plus one query per parent for its children. With 1 000 blogs that is 1 001 round trips; at 1 ms each, a full second spent on network latency. It appears with lazy loading in loops, explicit loading in loops, and serializers walking navigations. Fix it with Include, a projection, or one query for all children (${C('WHERE BlogId IN (...)')}) grouped in memory.</p>`,
    clues: ['"page is slow, SQL log shows the same SELECT repeated with a different id" → N+1', '"lazy loading in a loop / during JSON serialization" → hidden per-row queries', '"Include of two collections returns millions of rows" → cartesian explosion; AsSplitQuery', '"only need the post count / titles" → projection with Select', '"ObjectDisposedException when accessing a navigation in the view" → lazy loading after the context was disposed'],
    code: [EF(`
// Eager, filtered and ordered (EF Core 5+), then split into one query per collection
var blogs = await db.Blogs
    .Include(b => b.Posts.Where(p => p.Published).OrderByDescending(p => p.Date).Take(5))
        .ThenInclude(p => p.Author)
    .Include(b => b.Owner)
    .AsSplitQuery()
    .ToListAsync();

// Explicit loading of one navigation, with a filter
var blog = await db.Blogs.SingleAsync(b => b.Id == 1);
await db.Entry(blog).Collection(b => b.Posts).Query().Where(p => p.Published).LoadAsync();

// Projection: no entities, no tracking, exactly the columns needed
var summary = await db.Blogs
    .Select(b => new { b.Url, Posts = b.Posts.Count(), Latest = b.Posts.Max(p => (DateTime?)p.Date) })
    .ToListAsync();`, 'Loading related data four ways')],
    codeTitle: ['Loading strategies'],
    viz: {
      title: 'Counting round trips: lazy loading vs Include',
      gen: function () {
        function log(lines, hl) { return { type: 'table', label: 'SQL log', columns: ['#', 'SQL'], rows: lines.map(function (s, i) { return [i + 1, s]; }), hl: hl || {} }; }
        var q1 = 'SELECT * FROM Blogs';
        return codeFrames(T4_CODE, [
          { l: 1, v: { blogs: 3, queries: 1 }, narr: 'Load the blogs: one SELECT. Their Posts navigations are not loaded yet.', extra: [log([q1])] },
          { l: [2, 3], v: { blog: 1, queries: 2 }, hv: { queries: 'bad' }, narr: 'Reading <code>b.Posts</code> with lazy loading fires a query for blog 1.', extra: [log([q1, 'SELECT * FROM Posts WHERE BlogId = 1'], { 1: 'bad' })] },
          { l: [2, 3], v: { blog: 2, queries: 3 }, hv: { queries: 'bad' }, narr: 'Blog 2: another query, same shape, different id.', extra: [log([q1, 'SELECT * FROM Posts WHERE BlogId = 1', 'SELECT * FROM Posts WHERE BlogId = 2'], { 2: 'bad' })] },
          { l: [2, 3], v: { blog: 3, queries: 4 }, hv: { queries: 'bad' }, narr: '3 blogs → 1 + 3 = <b>4 round trips</b>. With 1 000 blogs it would be 1 001. That is N+1.', extra: [log([q1, 'SELECT * FROM Posts WHERE BlogId = 1', 'SELECT * FROM Posts WHERE BlogId = 2', 'SELECT * FROM Posts WHERE BlogId = 3'], { 1: 'bad', 2: 'bad', 3: 'bad' })] },
          { l: [5, 6, 7], v: { queries: 1 }, hv: { queries: 'ok' }, narr: '<b>Include</b> writes one query with a LEFT JOIN, ordered by the blog key so EF can group rows back into blogs.', extra: [log(['SELECT b.*, p.* FROM Blogs b LEFT JOIN Posts p ON b.Id = p.BlogId ORDER BY b.Id'], { 0: 'ok' })] },
          { l: [5, 6, 7], v: { queries: 2, mode: 'AsSplitQuery' }, narr: 'With <b>AsSplitQuery</b> EF sends one query per included collection instead of a JOIN — 2 round trips no matter how many blogs, and no duplicated blog columns.', extra: [log(['SELECT * FROM Blogs ORDER BY Id', 'SELECT p.* FROM Blogs b JOIN Posts p ON b.Id = p.BlogId ORDER BY b.Id'], { 0: 'ok', 1: 'ok' })] }
        ]);
      }
    },
    examples: [
      { title: 'N+1 hiding in a JSON response', html: `<p>An API returns ${C('List<Blog>')} with lazy loading on. The serializer touches ${C('blog.Posts')}, then each ${C('post.Author')}: hundreds of queries, plus a reference cycle Blog → Post → Blog. Return DTOs built with ${C('Select')} instead of entities.</p>` },
      { title: 'Turning off lazy loading per query path', html: `<p>Lazy loading is opt-in in EF Core: it needs the ${C('Microsoft.EntityFrameworkCore.Proxies')} package and ${C('UseLazyLoadingProxies()')}, or an injected ${C('ILazyLoader')}. Many teams leave it off so that every query is visible in code. If it is on, ${C('db.ChangeTracker.LazyLoadingEnabled = false')} disables it for a context.</p>` },
      { title: 'Delete behaviour', html: `<p>A required relationship defaults to ${C('Cascade')}: deleting a blog deletes its posts (in the database and for tracked posts). Optional relationships default to ${C('ClientSetNull')}: tracked children get their FK set to null. SQL Server rejects multiple cascade paths, so configure ${C('Restrict')} or ${C('NoAction')} on one of them.</p>` }
    ],
    deepDive: `<p><b>How Include is translated.</b> A single-query Include of a collection is a LEFT JOIN ordered by the parent key(s); EF streams rows and starts a new parent when the key changes. A reference navigation (many-to-one) adds no rows; a collection multiplies them. Two sibling collections multiply each other: 10 posts × 10 tags = 100 rows per blog — the <b>cartesian explosion</b>. EF Core logs a warning when a query includes multiple collections without choosing split or single mode.</p>
<p><b>Split queries</b> (${C('AsSplitQuery')}, or globally ${C('UseQuerySplittingBehavior')}) send one SELECT per collection. Trade-offs: more round trips, and without a serializable or snapshot transaction the separate queries may see different data; Skip/Take must have a unique ordering to be consistent.</p>
<p><b>Batching children by hand.</b> When Include is not possible (e.g. data from another context), load all parent ids, run one ${C('WHERE BlogId IN (...)')} query (EF parameterizes the list) and group with ${C('ToLookup')}.</p>
<p><b>Detecting N+1.</b> Log commands with ${C('LogTo')} or an ${C('DbCommandInterceptor')}, and count commands per request in tests; tools such as MiniProfiler or OpenTelemetry traces show repeated query shapes.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI is good at reading a SQL log and spotting repeated query shapes, and at rewriting a loop of lazy loads into a projection. <b>Where AI goes wrong:</b> it fixes N+1 by adding ${C('Include')} for every navigation, causing cartesian explosions, or it enables lazy loading "to make the code simpler". It also returns entities with cycles from APIs. <b>Use AI as a partner:</b> ask "how many SQL commands does this endpoint send for 1 000 rows, and how many rows come back?". <b>What you must own:</b> the loading strategy per use case and a test that counts queries so N+1 cannot come back silently.</p>`,
    problems: [{
      title: 'N+1 Query Counter',
      level: 'Easy', tags: ['N+1', 'loading strategies', 'Include'], companies: ['Microsoft', 'Infosys', 'Cognizant'],
      statement: `<p>A page loads all blogs and then reads every blog's ${C('Posts')}. ${C('postsPerBlog[i]')} is how many posts blog i has. Write ${C('static int CountQueries(int[] postsPerBlog, string strategy)')} that returns the number of SQL commands sent:</p>
<ul><li>${C('"Lazy"')} and ${C('"Explicit"')} (loading in a loop): one query for the blogs plus one per blog, even if it has no posts.</li>
<li>${C('"Include"')} (single query) and ${C('"Projection"')}: one query.</li>
<li>${C('"Split"')} (Include + AsSplitQuery): one query for the blogs, plus one for the posts only if at least one blog was returned.</li></ul>`,
      constraints: `0 ≤ number of blogs ≤ 10<sup>5</sup>.`,
      example: `<p>${C('CountQueries([3,0,5], "Lazy")')} → ${H.c('r', '4')} (1 + 3). ${C('"Include"')} → ${H.c('g', '1')}. ${C('"Split"')} → 2.</p>`,
      brute: { why: `<p>Simulating every query in a loop works but hides the formula. The count depends only on the number of blogs, not on how many posts each has.</p>`, code: `
public class Brute
{
    public static int Lazy(int[] postsPerBlog)
    {
        int queries = 1;                               // SELECT * FROM Blogs
        foreach (var _ in postsPerBlog) queries++;     // SELECT * FROM Posts WHERE BlogId = @id
        return queries;
    }
}` },
      mcq: { q: 'A list of 500 orders is shown with each order\'s customer name, using lazy loading. Roughly how many queries run?', options: ['Up to 501', '1', '2', '500 × number of customers'], answer: 0, explain: 'One for the orders, then one per order whose customer is not already tracked — up to 500 more. Identity resolution saves a query when the same customer repeats.' },
      hints: [`<p>Hint 1: only the <b>number</b> of blogs matters, not the post counts.</p>`, `<p>Hint 2: use a switch expression on the strategy name and return a formula per case.</p>`, `<p>Hint 3: Split with zero blogs sends only the first query; Lazy with zero blogs is also 1.</p>`],
      tests: { sig: 'int[] string -> int', fn: 'countQueries', cases: [[[[3, 0, 5], "Lazy"], 4], [[[3, 0, 5], "Include"], 1], [[[3, 0, 5], "Split"], 2], [[[], "Split"], 1], [[[], "Lazy"], 1], [[[1, 1, 1, 1], "Explicit"], 5], [[[2], "Projection"], 1], [[{ $rep: 1, n: 1000 }, "Lazy"], 1001]] },
      solution: {
        approach: `<p>Translate each strategy into its round-trip formula: N+1 for per-blog loading, 1 for a single query, 1 or 2 for split queries.</p>`,
        code: `
public class Solution
{
    public static int CountQueries(int[] postsPerBlog, string strategy)
    {
        int n = postsPerBlog.Length;
        return strategy switch
        {
            "Lazy" or "Explicit"     => 1 + n,            // N+1
            "Include" or "Projection" => 1,               // one JOIN / one SELECT
            "Split"                  => n > 0 ? 2 : 1,    // one query per collection level
            _ => throw new ArgumentException("unknown strategy", nameof(strategy))
        };
    }
}`,
        dry: { head: ['strategy', 'blogs', 'formula', 'queries'], rows: [['Lazy', '3', '1 + 3', '4'], ['Include', '3', '1', '1'], ['Split', '3', '2', '2'], ['Split', '0', '1', '1']] },
        complexity: `<p>O(1) time and O(1) extra space.</p>`,
        followUps: ['With lazy loading of <code>Post.Author</code> too, what is the count? (1 + blogs + distinct authors not yet tracked)', 'Write an interceptor-based test that fails when an endpoint sends more than 3 commands.']
      }
    }]
  });

  /* ======================================================================
     TOPIC 5 — IQueryable vs IEnumerable
     ====================================================================== */
  var T5_CODE = [
    'IQueryable<Product> q = db.Products;               // nothing runs yet',
    'q = q.Where(p => p.Price >= 20);                   // expression tree grows',
    'IEnumerable<Product> e = q.AsEnumerable();         // boundary: SQL ends here',
    'var cheap = e.Where(p => p.Price <= 50);           // runs in C#',
    'var list = cheap.ToList();                         // executes the SQL now'
  ].join('\n');
  topics.push({
    title: 'IQueryable vs IEnumerable: Where Your Filter Runs',
    analogy: `<p>Ordering from a warehouse: with ${C('IQueryable')} you write the whole order on a form — "red shirts, size M, only 10" — and the warehouse sends exactly 10 shirts. With ${C('IEnumerable')} after the boundary, you ask the warehouse to send <b>every shirt</b> to your house and then you sort them on the living-room floor. Same final pile, but one truck versus a hundred.</p>`,
    explain: `<p>${C('DbSet<T>')} implements ${C('IQueryable<T>')}. LINQ operators on an ${C('IQueryable')} come from ${C('Queryable')}: they take ${C('Expression<Func<T, bool>>')} and only <b>build an expression tree</b>. When you enumerate (${C('ToList')}, ${C('foreach')}, ${C('First')}, ${C('Count')}…), EF Core translates the whole tree into <b>one SQL statement</b>.</p>
<p>Operators on an ${C('IEnumerable<T>')} come from ${C('Enumerable')}: they take ${C('Func<T, bool>')} delegates and run <b>in your process</b> over objects already read from the database.</p>
${H.table(['Code', 'Static type', 'Where the filter runs'], [
  [C('db.Products.Where(p => p.Price > 20).ToList()'), 'IQueryable', 'SQL WHERE'],
  [C('db.Products.AsEnumerable().Where(p => p.Price > 20)'), 'IEnumerable', 'C#, after reading <b>every</b> row'],
  [C('IEnumerable<Product> all = db.Products; all.Where(...)'), 'IEnumerable (variable type!)', 'C# — the static type picks Enumerable.Where'],
  [C('Func<Product,bool> f = ...; db.Products.Where(f)'), 'binds to Enumerable.Where', 'C# — a delegate cannot be translated'],
  [C('Expression<Func<Product,bool>> f = ...; db.Products.Where(f)'), 'IQueryable', 'SQL']
])}
<h4>Client evaluation rules (EF Core 3+)</h4>
<ul><li>Only the <b>final projection</b> (the last ${C('Select')}) may call methods EF cannot translate; they run on each result row.</li>
<li>Anywhere else, an untranslatable call throws "The LINQ expression … could not be translated". Rewrite it, or switch to client evaluation <b>explicitly</b> with ${C('AsEnumerable()')} — after filtering as much as possible on the server.</li></ul>
<h4>Deferred execution</h4>
<p>Each enumeration re-runs the query. Calling ${C('Count()')} and then ${C('ToList()')} on the same IQueryable is two round trips; materialize once if you need both.</p>`,
    clues: ['"method returns IEnumerable&lt;T&gt; from a repository and the caller filters" → filter runs in memory after loading the table', '"could not be translated. Either rewrite the query in a form that can be translated, or switch to client evaluation explicitly" → untranslatable method in Where/OrderBy', '"build filters dynamically from UI options" → compose IQueryable or Expression predicates', '"query runs twice" → deferred execution enumerated twice', '"pagination" → Skip/Take must be on IQueryable before ToList'],
    code: [EF(`
// Good: compose on IQueryable, execute once
IQueryable<Product> q = db.Products.AsNoTracking();
if (minPrice is not null) q = q.Where(p => p.Price >= minPrice);
if (!string.IsNullOrEmpty(term)) q = q.Where(p => p.Name.Contains(term));    // LIKE '%term%'
var page = await q.OrderBy(p => p.Id).Skip(skip).Take(20).ToListAsync();

// Bad: the repository returns IEnumerable — the whole table is read
public IEnumerable<Product> All() => db.Products;
var expensive = repo.All().Where(p => p.Price > 1000).ToList();               // filtered in C#

// Explicit client evaluation for a method SQL cannot run, after server filtering
var scored = db.Products.Where(p => p.Price > 100)
    .AsEnumerable()
    .Where(p => MyScorer.Score(p.Name) > 0.8)
    .ToList();

Console.WriteLine(q.ToQueryString());   // see the SQL without running it`, 'Composing queries on the server')],
    codeTitle: ['IQueryable composition'],
    viz: {
      title: 'Which operators become SQL?',
      gen: function () {
        function rows(arr, hl) { return { type: 'array', label: 'rows', values: arr, hl: hl || {} }; }
        return codeFrames(T5_CODE, [
          { l: 1, v: { 'expression tree': 'DbSet<Product>', 'SQL so far': 'SELECT * FROM Products' }, narr: 'An IQueryable is a <b>description</b> of a query. No database call yet.' },
          { l: 2, v: { 'expression tree': 'Where(Price >= 20)', 'SQL so far': '… WHERE Price >= 20' }, hv: { 'SQL so far': 'ok' }, narr: '<code>Queryable.Where</code> adds a node to the expression tree. It will become a SQL WHERE.' },
          { l: 3, v: { boundary: 'AsEnumerable()' }, hv: { boundary: 'cur' }, narr: '<b>AsEnumerable</b> changes the static type. Every operator after this is <code>Enumerable</code> and runs in C#.' },
          { l: 4, v: { 'C# filter': 'Price <= 50 (delegate)' }, narr: 'This Where takes a compiled delegate, not an expression tree. EF never sees it.' },
          { l: 5, v: { sql: 'SELECT … WHERE Price >= 20' }, narr: 'Enumeration runs the SQL. Prices 5, 20, 35, 50, 80 are in the table; the server returns 4 rows.', extra: [rows([5, 20, 35, 50, 80], { 0: 'bad', 1: 'ok', 2: 'ok', 3: 'ok', 4: 'ok' })] },
          { l: 5, v: { 'rows over the network': 4, 'rows in list': 3 }, hv: { 'rows in list': 'ok' }, narr: 'C# drops 80. Result: 3 rows, but 4 crossed the network. Move the second filter before AsEnumerable and only 3 would.', extra: [rows([20, 35, 50, 80], { 3: 'bad' })] }
        ]);
      }
    },
    examples: [
      { title: 'The repository that returns IEnumerable', html: `<p>${C('IEnumerable<Order> GetOrders()')} looks harmless, but callers' ${C('.Where')}, ${C('.Take(10)')} and ${C('.Count()')} all run in memory after <b>every</b> order was loaded. Return ${C('IQueryable')} inside the data layer, or better, accept the filter as parameters and return a materialized page.</p>` },
      { title: 'Translatable string methods', html: `<p>${C('Contains')}, ${C('StartsWith')}, ${C('EndsWith')}, ${C('ToUpper')}, ${C('Trim')}, ${C('string.IsNullOrEmpty')} and ${C('EF.Functions.Like')} translate. Your own helper ${C('IsPremium(p)')} does not — inline its logic or map it with ${C('HasDbFunction')}.</p>` },
      { title: 'Enumerating twice', html: `<p>A query enumerated twice runs twice: every Any, Count or foreach on an IQueryable is a new round trip.</p>`, code: EF(`
var q = db.Orders.Where(o => o.Open);
if (q.Any()) Log(q.Count());       // two queries
foreach (var o in q) Ship(o);      // a third

var open = await db.Orders.Where(o => o.Open).ToListAsync();   // one query
if (open.Count > 0) Log(open.Count);`) }
    ],
    deepDive: `<p><b>The pipeline.</b> EF Core's query pipeline: the LINQ expression tree is pre-processed (closures turned into parameters, navigations expanded), translated into a relational ${C('SelectExpression')}, then a provider-specific SQL generator prints it. The compiled result is cached by the <b>shape</b> of the tree (topic 7), with captured variables as SQL parameters.</p>
<p><b>Why the static type matters.</b> Extension methods are chosen at compile time. ${C('IQueryable<T>')} also implements ${C('IEnumerable<T>')}, so the moment a variable, parameter or return type is ${C('IEnumerable<T>')}, the compiler picks ${C('Enumerable.Where')} — nothing at run time "notices" the database underneath.</p>
<p><b>Streaming vs buffering.</b> Enumerating a query streams rows from a ${C('DbDataReader')}; ${C('ToList')} buffers. ${C('AsAsyncEnumerable()')} with ${C('await foreach')} streams asynchronously — good for exports. Note that a <b>Take after AsEnumerable</b> stops reading early, but the server may already have done the work for the full result.</p>
<p><b>Inspecting SQL.</b> ${C('ToQueryString()')} prints the SQL for an IQueryable; ${C('LogTo(Console.WriteLine, LogLevel.Information)')} logs every executed command with timings.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI writes LINQ quickly and can predict the SQL for most queries; ask it to show ${C('ToQueryString()')} output alongside. <b>Where AI goes wrong:</b> it calls a C# helper inside ${C('Where')} (runtime translation error), "fixes" that error by adding ${C('ToList()')} at the start (loading the whole table), or writes repositories returning ${C('IEnumerable')}. <b>Use AI as a partner:</b> "mark which operators in this query run on the server and which run in C#". <b>What you must own:</b> knowing the row counts of your tables and refusing any query that pulls a large table into memory to filter it.</p>`,
    problems: [{
      title: 'Server Rows vs Client Rows',
      level: 'Medium', tags: ['IQueryable', 'IEnumerable', 'LINQ', 'simulation'], companies: ['Microsoft', 'JPMorgan', 'Deloitte'],
      statement: `<p>A ${C('Products')} table holds ${C('prices')}. A LINQ pipeline is given as ops: ${C('"Where>=X"')}, ${C('"Where<=X"')}, ${C('"OrderBy"')}, ${C('"OrderByDesc"')}, ${C('"Take N"')}, ${C('"Skip N"')} and ${C('"AsEnumerable"')}. Everything before the first ${C('AsEnumerable')} runs as SQL; everything after runs in C#. Write ${C('static int[] ServerRows(int[] prices, string[] ops)')} returning ${C('[rows the SQL returns, rows in the final list]')}.</p>`,
      constraints: `0 ≤ prices ≤ 10<sup>4</sup>; values may be negative; later AsEnumerable calls change nothing.`,
      example: `<p>${C('[5,20,35,50,80]')}, ${C('["Where>=20","AsEnumerable","Where<=50"]')} → ${H.c('g', '[4, 3]')}: SQL returns 20, 35, 50, 80; C# keeps 3 of them.</p>`,
      brute: { why: `<p>Writing one branch per possible pipeline does not scale. Apply the operators in order on a list and record its size at the boundary.</p>`, code: `
public class Brute
{
    public static int[] OnlyFilters(int[] prices, int min, int max) =>
        new[] { prices.Count(p => p >= min), prices.Count(p => p >= min && p <= max) };
}` },
      mcq: { q: '<code>IEnumerable&lt;Product&gt; src = db.Products; var n = src.Count(p =&gt; p.Price &gt; 10);</code> What SQL runs?', options: ['SELECT of all products; Count runs in C#', 'SELECT COUNT(*) … WHERE Price &gt; 10', 'No SQL: it throws', 'SELECT TOP 1'], answer: 0, explain: 'The static type is IEnumerable, so Enumerable.Count is chosen. EF only sees "give me all products".' },
      hints: [`<p>Hint 1: simulate the pipeline on a ${C('List<int>')} — the result after all ops is the final count.</p>`, `<p>Hint 2: when you meet the first ${C('AsEnumerable')}, remember the current count as the server count.</p>`, `<p>Hint 3: if there is no AsEnumerable, both numbers are equal. Use stable sorting (${C('OrderBy')}) and clamp Skip/Take with LINQ.</p>`],
      tests: { sig: 'int[] string[] -> int[]', fn: 'serverRows', cases: [[[[5, 20, 35, 50, 80], ["Where>=20", "AsEnumerable", "Where<=50"]], [4, 3]], [[[5, 20, 35, 50, 80], ["AsEnumerable", "Where>=20", "Where<=50"]], [5, 3]], [[[5, 20, 35, 50, 80], ["Where>=20", "Where<=50"]], [3, 3]], [[[], ["Where>=1"]], [0, 0]], [[[9, 1, 7, 3], ["OrderByDesc", "Take 2", "AsEnumerable", "Skip 1"]], [2, 1]], [[[9, 1, 7, 3], ["AsEnumerable", "OrderByDesc", "Take 2"]], [4, 2]], [[[4, 4, 4], ["Skip 1", "AsEnumerable", "AsEnumerable", "Take 5"]], [2, 2]], [[[-5, 0, 5], ["Where>=-5", "Where<=0", "OrderBy"]], [2, 2]]] },
      solution: {
        approach: `<p>Run the pipeline with LINQ to Objects, one operator at a time. The size of the sequence at the first AsEnumerable is what the server sent; the final size is what the caller sees.</p>`,
        code: `
public class Solution
{
    public static int[] ServerRows(int[] prices, string[] ops)
    {
        IEnumerable<int> rows = prices;
        int? server = null;
        foreach (var op in ops)
        {
            if (op == "AsEnumerable") { server ??= rows.Count(); continue; }
            rows = op switch
            {
                _ when op.StartsWith("Where>=") => Filter(rows, int.Parse(op[7..]), true),
                _ when op.StartsWith("Where<=") => Filter(rows, int.Parse(op[7..]), false),
                "OrderBy" => rows.OrderBy(x => x),
                "OrderByDesc" => rows.OrderByDescending(x => x),
                _ when op.StartsWith("Take ") => rows.Take(int.Parse(op[5..])),
                _ when op.StartsWith("Skip ") => rows.Skip(int.Parse(op[5..])),
                _ => throw new ArgumentException(op)
            };
            rows = rows.ToList();                      // freeze before the lambda's variables change
        }
        int final = rows.Count();
        return new[] { server ?? final, final };
    }

    static IEnumerable<int> Filter(IEnumerable<int> rows, int bound, bool atLeast) =>
        rows.Where(x => atLeast ? x >= bound : x <= bound);
}`,
        dry: { head: ['op', 'rows', 'side'], rows: [['start', '5 20 35 50 80', '—'], ['Where&gt;=20', '20 35 50 80', 'SQL'], ['AsEnumerable', 'server = 4', 'boundary'], ['Where&lt;=50', '20 35 50', 'C#'], ['result', '[4, 3]', '']] },
        complexity: `<p>O(k · n log n) in the worst case for k ops (sorting); O(n) space.</p>`,
        followUps: ['Report which ops EF could not translate if one of them were a custom C# method.', 'Why does Skip/Take without OrderBy produce a warning in EF Core?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 6 — Raw SQL, transactions and concurrency tokens
     ====================================================================== */
  var T6_CODE = [
    'var p = await db.Products.FindAsync(1);   // Price 10, Version 0x01',
    '// … someone else updates row 1 → Version 0x02',
    'p!.Price = 12;',
    'try',
    '{',
    '    await db.SaveChangesAsync();          // UPDATE … WHERE Id = 1 AND Version = 0x01',
    '}',
    'catch (DbUpdateConcurrencyException ex)  // 0 rows affected',
    '{',
    '    var entry = ex.Entries.Single();',
    '    var dbValues = await entry.GetDatabaseValuesAsync();',
    '    entry.OriginalValues.SetValues(dbValues!);   // refresh token, then retry or ask the user',
    '}'
  ].join('\n');
  topics.push({
    title: 'Raw SQL, Transactions and Optimistic Concurrency',
    analogy: `<p>Two clerks edit the same paper form. <b>Optimistic concurrency</b> stamps a version number on the form. When a clerk hands it back, the office checks: "you started from version 7 — is it still version 7?" If yes, the change is accepted and the stamp becomes 8. If someone else already returned version 8, the late clerk is told "the form changed while you were working; look again". Nobody had to lock the filing cabinet while they were thinking.</p>`,
    explain: `<h4>1. Raw SQL — safely</h4>
${H.table(['API', 'Returns', 'Parameterized?'], [
  [C('db.Blogs.FromSql($"SELECT * FROM Blogs WHERE Url = {url}")'), 'entities, composable with LINQ', 'yes — the interpolation becomes a DbParameter'],
  [C('db.Database.SqlQuery<int>($"SELECT Id AS Value FROM ...")'), 'scalars or unmapped types (EF Core 7/8+)', 'yes'],
  [C('db.Database.ExecuteSql($"UPDATE ... WHERE Id = {id}")'), 'rows affected', 'yes'],
  [C('FromSqlRaw("... WHERE Url = \'" + url + "\'")'), 'entities', '<b>no</b> — SQL injection; use ' + C('{0}') + ' placeholders or parameters']
])}
<h4>2. Transactions</h4>
<p>${C('SaveChanges')} is already atomic: all its commands run in one transaction. For several SaveChanges calls or raw SQL that must succeed together, open one explicitly:</p>
${P(`
await using var tx = await db.Database.BeginTransactionAsync();
db.Accounts.Single(a => a.Id == from).Balance -= amount;
await db.SaveChangesAsync();
await db.Database.ExecuteSqlAsync($"INSERT INTO Audit(Msg) VALUES ({"transfer"})");
await tx.CommitAsync();          // disposing without Commit rolls back`)}
<p>EF Core also creates <b>savepoints</b> automatically inside a user transaction when SaveChanges fails, and you can make your own (${C('CreateSavepointAsync')}, ${C('RollbackToSavepointAsync')}). With retrying execution strategies (${C('EnableRetryOnFailure')}), wrap the whole transaction in ${C('db.Database.CreateExecutionStrategy().ExecuteAsync(...)')}.</p>
<h4>3. Concurrency tokens</h4>
<p>Mark a property with ${C('[Timestamp]')} (SQL Server ${C('rowversion')}, ${C('byte[]')}) or ${C('[ConcurrencyCheck]')} / ${C('IsConcurrencyToken()')}. EF adds it to the WHERE clause of UPDATE and DELETE. If 0 rows are affected, someone changed the row since you read it, and EF throws ${C('DbUpdateConcurrencyException')}. You then choose: <b>store wins</b> (reload), <b>client wins</b> (copy database values into OriginalValues and save again), or <b>merge</b> and ask the user.</p>`,
    clues: ['"two users edit the same record; last write silently wins" → concurrency token', '"DbUpdateConcurrencyException" → 0 rows affected by an UPDATE/DELETE with a token in the WHERE', '"string concatenation into FromSqlRaw" → SQL injection; use FromSql with interpolation', '"several SaveChanges must be all-or-nothing" → explicit transaction', '"retry on transient failure with a user transaction" → execution strategy wraps the whole unit'],
    code: [EF(`
public class Product
{
    public int Id { get; set; }
    public decimal Price { get; set; }
    [Timestamp] public byte[] Version { get; set; } = [];       // rowversion on SQL Server
}

async Task<bool> ChangePrice(ShopDb db, int id, decimal price, int maxRetries = 3)
{
    var p = await db.Products.SingleAsync(x => x.Id == id);
    for (int attempt = 0; attempt <= maxRetries; attempt++)
    {
        p.Price = price;
        try { await db.SaveChangesAsync(); return true; }
        catch (DbUpdateConcurrencyException ex)
        {
            var entry = ex.Entries.Single();
            var current = await entry.GetDatabaseValuesAsync();
            if (current is null) return false;                     // row was deleted
            entry.OriginalValues.SetValues(current);               // client wins on next try
        }
    }
    return false;
}

// Raw SQL, parameterized by interpolation
var term = "%dotnet%";
var blogs = await db.Blogs.FromSql($"SELECT * FROM Blogs WHERE Url LIKE {term}")
                          .Where(b => b.Rating > 3).ToListAsync();   // composes into a subquery`, 'rowversion, retry and FromSql')],
    codeTitle: ['Concurrency handling'],
    viz: {
      title: 'Optimistic concurrency with a rowversion',
      gen: function () {
        function row(price, ver, hl) { return { type: 'table', label: 'Products row 1 in the database', columns: ['Id', 'Price', 'Version'], rows: [[1, price, ver]], hl: hl || {} }; }
        return codeFrames(T6_CODE, [
          { l: 1, v: { 'p.Price': 10, 'original Version': '0x01' }, narr: 'Alice loads the product. EF remembers the original <b>Version</b> 0x01 in the snapshot.', extra: [row(10, '0x01')] },
          { l: 2, v: { 'p.Price': 10, 'original Version': '0x01' }, narr: 'Meanwhile Bob saves a price of 11. SQL Server bumps the rowversion automatically.', extra: [row(11, '0x02', { 0: 'cur' })] },
          { l: 3, v: { 'p.Price': 12, 'original Version': '0x01' }, narr: 'Alice changes her copy in memory.', extra: [row(11, '0x02')] },
          { l: 6, v: { sql: 'UPDATE Products SET Price = 12 WHERE Id = 1 AND Version = 0x01' }, narr: 'The token is in the WHERE clause. The row now has Version 0x02, so <b>0 rows</b> match.', extra: [row(11, '0x02', { 0: 'bad' })] },
          { l: 8, v: { 'rows affected': 0, exception: 'DbUpdateConcurrencyException' }, hv: { exception: 'bad' }, narr: 'EF expected 1 row and got 0, so it throws. Bob\'s change was <b>not</b> overwritten.' },
          { l: [10, 11, 12], v: { 'database values': 'Price 11, Version 0x02', 'original Version': '0x02' }, hv: { 'original Version': 'ok' }, narr: 'Read the current database values and copy them into OriginalValues. Now the next SaveChanges uses Version 0x02 in its WHERE.' },
          { l: 6, v: { sql: 'UPDATE … WHERE Id = 1 AND Version = 0x02', 'rows affected': 1 }, hv: { 'rows affected': 'ok' }, narr: 'Retrying succeeds (client wins). A real app might instead show Bob\'s value to Alice and let her decide.', extra: [row(12, '0x03', { 0: 'ok' })] }
        ]);
      }
    },
    examples: [
      { title: 'Injection-safe vs unsafe raw SQL', html: `<p>${C('FromSql($"... WHERE Name = {name}")')} sends ${C('WHERE Name = @p0')} with a parameter. ${C('FromSqlRaw("... WHERE Name = \'" + name + "\'")')} pastes user input into SQL. If you must build dynamic column names, validate them against a whitelist; values always go in parameters.</p>` },
      { title: 'Concurrency token without rowversion', html: `<p>Databases without rowversion (SQLite, PostgreSQL) can use ${C('[ConcurrencyCheck]')} on a ${C('Guid Version')} that the app changes on every save, or PostgreSQL's ${C('xmin')} system column with Npgsql's ${C('IsRowVersion()')} mapping.</p>`, code: EF(`
public class Doc
{
    public int Id { get; set; }
    public string Body { get; set; } = "";
    [ConcurrencyCheck] public Guid Version { get; set; }
}
// before SaveChanges: doc.Version = Guid.NewGuid();   // the old value stays in the WHERE`) },
      { title: 'Bulk updates bypass the tracker', html: `<p>${C('ExecuteUpdateAsync')} / ${C('ExecuteDeleteAsync')} (EF Core 7+) run one SQL statement immediately, without loading entities, without SaveChanges, and without concurrency-token checks unless you add the condition to the Where yourself. Tracked entities in the context are not updated.</p>` }
    ],
    deepDive: `<p><b>Isolation levels.</b> ${C('BeginTransaction(IsolationLevel.Serializable)')} trades throughput for safety. On SQL Server, enabling <b>READ_COMMITTED_SNAPSHOT</b> makes readers not block writers. Optimistic concurrency complements isolation: it detects lost updates across separate requests, where no database transaction spans the user's think time.</p>
<p><b>Affected-row checks.</b> EF compares expected vs actual affected rows per command in a batch; triggers that change row counts can break this (use ${C('SET NOCOUNT ON')} in triggers, or tell EF about triggers with ${C('HasTrigger')} in EF Core 7+ so it avoids the OUTPUT clause).</p>
<p><b>Ambient transactions.</b> ${C('TransactionScope')} works with EF Core (including async with ${C('TransactionScopeAsyncFlowOption.Enabled')}), but distributed transactions across connections need .NET 7+ on Windows. Prefer one connection and ${C('UseTransaction')} to share a transaction with Dapper or ADO.NET code.</p>
<p><b>Raw SQL composition.</b> ${C('FromSql')} must return all entity columns with matching names; when you compose LINQ on top, EF wraps your SQL as a subquery, so it must be a plain SELECT (no stored procedure calls when composing).</p>`,
    aiEra: `<p><b>What AI changes:</b> AI writes the try/catch for ${C('DbUpdateConcurrencyException')} and the merge UI logic quickly. <b>Where AI goes wrong:</b> it uses ${C('FromSqlRaw')} with string interpolation (the raw API does not parameterize interpolated strings), forgets that ${C('ExecuteUpdate')} ignores tracked entities and concurrency tokens, and wraps a transaction around code with a retrying execution strategy, which throws. <b>Use AI as a partner:</b> ask "show the exact SQL and parameters this produces". <b>What you must own:</b> the business rule for conflicts — store wins, client wins, or ask the user — and where transaction boundaries lie.</p>`,
    problems: [{
      title: 'Optimistic Concurrency with a Row Version',
      level: 'Medium', tags: ['concurrency', 'rowversion', 'simulation'], companies: ['Microsoft', 'Goldman Sachs', 'Siemens'],
      statement: `<p>One database row starts with value ${C('"init"')} and version 1. Clients send ops: ${C('"read X"')} (client X remembers the current version) and ${C('"write X v"')} (UPDATE … SET value = v, version = version + 1 WHERE version = X's remembered version). A successful write also updates X's remembered version to the new one; a failed write changes nothing. Write ${C('static string[] Concurrency(string[] ops)')} that logs ${C('"X ok vN"')} (N = new version) or ${C('"X conflict"')} per write, followed by ${C('"final value vN"')}.</p>`,
      constraints: `0 ≤ ops ≤ 10<sup>4</sup>. Every client reads before its first write. Values contain no spaces.`,
      example: `<p>${C('["read A","read B","write A x","write B y"]')} → ${H.c('g', '["A ok v2","B conflict","final x v2"]')}: B read version 1, but A's write moved the row to version 2, so B's WHERE matched 0 rows.</p>`,
      brute: { why: `<p>Without a version check (last write wins), B would silently overwrite A — the "lost update" this pattern prevents.</p>`, code: `
public class Brute
{
    public static string LastWriteWins(string[] writes) =>
        writes.Length == 0 ? "init" : writes[^1];      // no conflict detection at all
}` },
      mcq: { q: 'How does EF Core know an optimistic-concurrency conflict happened?', options: ['The UPDATE/DELETE affected 0 rows because the token in its WHERE did not match', 'It locks the row on read and checks the lock', 'It re-reads the row before every UPDATE', 'The database raises a deadlock error'], answer: 0, explain: 'The original token value is part of the WHERE clause; a row count of 0 means the row changed (or was deleted).' },
      hints: [`<p>Hint 1: keep ${C('value')}, ${C('version')} and a ${C('Dictionary<string, int>')} of each client's remembered version.</p>`, `<p>Hint 2: a write succeeds only when the remembered version equals the current version — exactly the WHERE clause.</p>`, `<p>Hint 3: after success, increment the version and store it for that client; always append the final line, even for no ops.</p>`],
      tests: { sig: 'string[] -> string[]', fn: 'concurrency', cases: [[[["read A", "read B", "write A x", "write B y"]], ["A ok v2", "B conflict", "final x v2"]], [[["read A", "write A x", "write A y"]], ["A ok v2", "A ok v3", "final y v3"]], [[["read A", "read B", "write B y", "write A x", "read A", "write A z"]], ["B ok v2", "A conflict", "A ok v3", "final z v3"]], [[[]], ["final init v1"]], [[["read A", "write A x", "read B", "write B y"]], ["A ok v2", "B ok v3", "final y v3"]], [[["read A", "read B", "read C", "write C c", "write B b", "write A a"]], ["C ok v2", "B conflict", "A conflict", "final c v2"]]] },
      solution: {
        approach: `<p>Simulate the conditional UPDATE: compare the client's remembered version with the row's version; on a match apply the value and bump the version, otherwise report a conflict.</p>`,
        code: `
public class Solution
{
    public static string[] Concurrency(string[] ops)
    {
        string value = "init";
        int version = 1;
        var seen = new Dictionary<string, int>();      // client -> version it read
        var log = new List<string>();
        foreach (var op in ops)
        {
            var p = op.Split(' ');
            if (p[0] == "read") { seen[p[1]] = version; continue; }
            // UPDATE Row SET Value = @v, Version = Version + 1 WHERE Version = @seen
            if (seen.TryGetValue(p[1], out var v) && v == version)
            {
                value = p[2];
                version++;
                seen[p[1]] = version;
                log.Add($"{p[1]} ok v{version}");
            }
            else log.Add($"{p[1]} conflict");          // 0 rows affected
        }
        log.Add($"final {value} v{version}");
        return log.ToArray();
    }
}`,
        dry: { head: ['op', 'A saw', 'B saw', 'row', 'log'], rows: [['read A', '1', '—', 'init v1', ''], ['read B', '1', '1', 'init v1', ''], ['write A x', '2', '1', 'x v2', 'A ok v2'], ['write B y', '2', '1', 'x v2', 'B conflict']] },
        complexity: `<p>O(1) per op, O(clients) space.</p>`,
        followUps: ['Implement "store wins": after a conflict, refresh the client\'s version automatically.', 'How does a DELETE with a stale token behave?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 7 — Performance
     ====================================================================== */
  var T7_CODE = [
    'static readonly Func<ShopDb, int, Task<Product?>> ById =',
    '    EF.CompileAsyncQuery((ShopDb db, int id) =>',
    '        db.Products.AsNoTracking().FirstOrDefault(p => p.Id == id));',
    '',
    'var a = await ById(db, 1);    // translate once, reuse',
    'var b = await db.Products.FirstOrDefaultAsync(p => p.Id == id); // cache lookup by tree shape',
    'var c = await db.Products.FirstOrDefaultAsync(p => p.Id == 5);  // constant → separate cache entry'
  ].join('\n');
  topics.push({
    title: 'Performance: Compiled Queries, Split Queries, AsNoTracking and Bulk Operations',
    analogy: `<p>A restaurant kitchen. Translating a LINQ query to SQL is like writing a new recipe card; the kitchen keeps cards in a box, keyed by the dish, so tomorrow's order for "soup of the day" reuses the card. If every order is written as "soup with exactly 7 grams of salt", "soup with 8 grams", the box fills with near-identical cards. <b>Compiled queries</b> laminate the card so nobody even looks in the box; <b>parameters</b> keep one card per dish; <b>AsNoTracking</b> skips taking a photo of every plate; <b>split queries</b> stop carrying one huge tray that repeats the main course next to every side dish.</p>`,
    explain: `<h4>1. Measure first</h4>
<p>Log SQL and timings (${C('LogTo')}, ${C('EnableSensitiveDataLogging')} in development only), look at execution plans, and count commands and rows per request. Most EF slowness is <b>too many queries</b> (N+1), <b>too many rows or columns</b>, or <b>missing indexes</b> — not EF's own overhead.</p>
<h4>2. The toolbox</h4>
${H.table(['Tool', 'What it saves', 'When'], [
  [C('AsNoTracking()'), 'snapshots and identity map work, memory', 'every read-only query'],
  [C('Select(...)') + ' projections', 'columns and entity materialization', 'lists, APIs, reports'],
  [C('AsSplitQuery()'), 'cartesian explosion of multiple collection Includes', 'Include of 2+ collections or big parent rows'],
  [C('EF.CompileAsyncQuery'), 'expression-tree hashing and cache lookup per call', 'very hot queries (thousands per second)'],
  [C('ExecuteUpdateAsync / ExecuteDeleteAsync'), 'loading entities to change them', 'set-based updates and deletes'],
  [C('AddDbContextPool'), 'context construction', 'high request rates'],
  ['SaveChanges <b>batching</b>', 'round trips: many INSERT/UPDATEs per command', 'automatic; tune with ' + C('MaxBatchSize')],
  ['keyset pagination', 'OFFSET scanning of skipped rows', 'deep pages, infinite scroll']
])}
<h4>3. The query cache</h4>
<p>EF caches the translated SQL keyed by the <b>shape of the expression tree</b>. A captured variable (${C('p.Id == id')}) becomes a SQL parameter, so all ids share one entry. A literal constant (${C('p.Id == 5')}) is part of the shape, so each different constant is a new entry and a new translation (and a new database plan). Build dynamic queries so values are variables, not constants baked into expressions.</p>`,
    clues: ['"Include posts and tags makes the query return millions of rows" → AsSplitQuery or projection', '"update 100k rows" → ExecuteUpdate, not load-modify-save', '"high CPU in EF query compilation / many cache misses" → constants in expression trees; parameterize or compile', '"page 5000 of results is slow" → keyset (seek) pagination instead of Skip', '"read-only dashboard" → AsNoTracking + projection'],
    code: [EF(`
// Hot path: precompiled query, no tracking
private static readonly Func<ShopDb, int, Task<ProductDto?>> GetProduct =
    EF.CompileAsyncQuery((ShopDb db, int id) =>
        db.Products.Where(p => p.Id == id)
                   .Select(p => new ProductDto(p.Id, p.Name, p.Price))
                   .FirstOrDefault());

// Set-based update: one statement, no entities loaded
int changed = await db.Products
    .Where(p => p.CategoryId == 7)
    .ExecuteUpdateAsync(s => s.SetProperty(p => p.Price, p => p.Price * 1.1m));

// Keyset pagination: WHERE Id > @last ORDER BY Id, uses the index, constant cost per page
var page = await db.Products.AsNoTracking()
    .Where(p => p.Id > lastSeenId)
    .OrderBy(p => p.Id)
    .Take(50)
    .ToListAsync();

// Batching: tune or leave the default (SQL Server: 42 statements per batch)
options.UseSqlServer(cs, o => o.MaxBatchSize(100));`, 'The performance toolbox')],
    codeTitle: ['Fast EF Core'],
    viz: {
      title: 'The query cache: parameters vs constants',
      gen: function () {
        function cache(keys, hl) { return { type: 'table', label: 'Query cache', columns: ['key (tree shape)', 'SQL'], rows: keys, hl: hl || {} }; }
        var k1 = ['Products.FirstOrDefault(Id == @id)', 'SELECT TOP 1 … WHERE Id = @id'];
        return codeFrames(T7_CODE, [
          { l: [1, 2, 3], v: { compiled: 'ById delegate' }, narr: '<b>EF.CompileAsyncQuery</b> translates once, when first used, and returns a delegate. Calls skip the cache lookup entirely.', extra: [cache([])] },
          { l: 5, v: { translations: 1 }, narr: 'The compiled delegate runs the prepared SQL with id = 1.', extra: [cache([])] },
          { l: 6, v: { translations: 2, cache: 'miss' }, hv: { cache: 'bad' }, narr: 'A normal query: EF hashes the expression tree. First time this shape is seen → translate and store. The captured <code>id</code> becomes <b>@id</b>.', extra: [cache([k1], { 0: 'ok' })] },
          { l: 6, v: { translations: 2, cache: 'hit (id = 9)' }, hv: { cache: 'ok' }, narr: 'Same line with another id value: same shape → cache <b>hit</b>, no translation.', extra: [cache([k1], { 0: 'cur' })] },
          { l: 7, v: { translations: 3, cache: 'miss' }, hv: { cache: 'bad' }, narr: 'A <b>constant</b> 5 is part of the tree, so this is a different shape and a new entry, with the literal in the SQL.', extra: [cache([k1, ['Products.FirstOrDefault(Id == 5)', 'SELECT TOP 1 … WHERE Id = 5']], { 1: 'bad' })] },
          { l: 7, v: { lesson: 'values in variables, not literals' }, narr: 'Code that builds queries with thousands of different literals (e.g. dynamic expression building with Expression.Constant) floods the cache and the database plan cache.', extra: [note('Fix', 'Capture values in variables or use EF.Parameter / EF.Constant explicitly (EF Core 8+).')] }
        ]);
      }
    },
    examples: [
      { title: 'Cartesian explosion in numbers', html: `<p>A blog with 1 000 posts and 1 000 tags, loaded with ${C('Include(Posts).Include(Tags)')} in a single query, returns 1 000 × 1 000 = 1 000 000 rows. As a split query: 1 + 1 000 + 1 000 = 2 001 rows in 3 commands.</p>` },
      { title: 'Load-modify-save vs ExecuteUpdate', html: `<p>Raising prices of 50 000 products by loading them costs one big SELECT, 50 000 snapshots, then about 1 200 batches of UPDATEs. ${C('ExecuteUpdateAsync')} is one UPDATE statement. The catch: tracked entities in memory are not refreshed, interceptors on SaveChanges do not run, and you must add concurrency checks yourself.</p>` },
      { title: 'Seeing what SaveChanges batches', html: `<p>Inserting 100 rows on SQL Server with the default MaxBatchSize of 42 sends 3 commands (42 + 42 + 16) inside one transaction. Logging shows one ${C('Executed DbCommand')} line per batch.</p>`, code: EF(`
options.UseSqlServer(cs)
       .LogTo(Console.WriteLine, new[] { RelationalEventId.CommandExecuted })
       .EnableSensitiveDataLogging();   // development only: shows parameter values`) }
    ],
    deepDive: `<p><b>Compiled models</b> (${C('dotnet ef dbcontext optimize')}) pre-generate the model so start-up does not build it via reflection; EF Core 9 adds <b>precompiled queries</b> for Native AOT (experimental), generating the SQL at build time.</p>
<p><b>Parameterized collections.</b> ${C('ids.Contains(p.Id)')} was translated to ${C('IN (1, 2, 3)')} with literals in older versions (one plan per list). EF Core 8 sends the list as one JSON parameter (${C('OPENJSON')} on SQL Server) so the plan is reused; EF Core 9 lets you choose with ${C('EF.Parameter')} / ${C('EF.Constant')} and a global ${C('TranslateParameterizedCollectionsToConstants')} option, because constants sometimes give better plans.</p>
<p><b>Batching details.</b> SQL Server providers batch up to 42 statements by default (and use MERGE/OUTPUT for inserts with generated keys); EF Core 7+ also avoids an explicit transaction when a SaveChanges has only one statement.</p>
<p><b>Streaming large results.</b> ${C('AsAsyncEnumerable')} + ${C('AsNoTracking')} keeps memory flat; avoid ${C('ToList')} on millions of rows. For huge imports, use the provider's bulk copy (${C('SqlBulkCopy')}) rather than SaveChanges.</p>
<p><b>Pooling vs compiled queries</b> remove microseconds; an index or a removed N+1 removes seconds. Fix the big ones first.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI can read execution plans and EF logs and point to the expensive query; give it the SQL, row counts and indexes. <b>Where AI goes wrong:</b> it recommends compiled queries or pooling as the first fix when the real problem is N+1 or a missing index, applies ${C('AsSplitQuery')} to a paged query without a unique ordering, or replaces SaveChanges with ${C('ExecuteUpdate')} and loses interceptor-based auditing. <b>Use AI as a partner:</b> "rank these five fixes by expected gain for this log". <b>What you must own:</b> measurements before and after each change, and the correctness trade-offs (consistency of split queries, bypassed tracking).</p>`,
    problems: [{
      title: 'Count Query Translations',
      level: 'Easy', tags: ['query cache', 'compiled queries', 'performance'], companies: ['Microsoft', 'Stack Overflow'],
      statement: `<p>Each query is ${C('"Shape|kind|value"')}: a query shape, whether the value was a captured variable (${C('var')}, becomes a parameter) or a literal (${C('const')}, baked into the tree), and the value. EF's cache key is the shape for ${C('var')} queries and shape + value for ${C('const')} queries. With an unlimited cache, write ${C('static int QueryCompilations(string[] queries)')} returning how many translations happen.</p>`,
      constraints: `0 ≤ queries ≤ 10<sup>5</sup>.`,
      example: `<p>${C('["ById|var|1","ById|var|2","ById|var|3"]')} → ${H.c('g', '1')} (one parameterized entry). ${C('["ById|const|1","ById|const|2","ById|const|1"]')} → ${H.c('r', '2')}.</p>`,
      brute: { why: `<p>Comparing each key with all earlier keys in a list is O(n²). A hash set of keys gives O(n).</p>`, code: `
public class Brute
{
    public static int Count(string[] keys)
    {
        var seen = new List<string>();
        foreach (var k in keys) if (!seen.Contains(k)) seen.Add(k);   // O(n) Contains
        return seen.Count;
    }
}` },
      mcq: { q: 'Why does <code>db.Products.Where(p =&gt; p.Id == id)</code> reuse a cached translation for every id?', options: ['The captured variable becomes a SQL parameter, so the tree shape is the same for every value', 'EF caches results, not SQL', 'EF ignores Where clauses when caching', 'The database compiles the LINQ'], answer: 0, explain: 'Closures are turned into parameters; only the shape is part of the cache key.' },
      hints: [`<p>Hint 1: build the cache key for each query from its parts.</p>`, `<p>Hint 2: ${C('var')} → key = shape; ${C('const')} → key = shape + "|" + value.</p>`, `<p>Hint 3: the answer is the number of distinct keys; zero queries means zero translations.</p>`],
      tests: { sig: 'string[] -> int', fn: 'queryCompilations', cases: [[[["ById|var|1", "ById|var|2", "ById|var|3"]], 1], [[["ById|const|1", "ById|const|2", "ById|const|1"]], 2], [[[]], 0], [[["ById|var|1", "ById|const|1", "ById|const|1"]], 2], [[["A|var|1", "B|var|1", "A|const|1", "B|const|2"]], 4], [[["X|var|0"]], 1]] },
      solution: {
        approach: `<p>Map each query to its cache key and count distinct keys with a hash set.</p>`,
        code: `
public class Solution
{
    public static int QueryCompilations(string[] queries)
    {
        var cache = new HashSet<string>();
        foreach (var q in queries)
        {
            var p = q.Split('|');
            cache.Add(p[1] == "var" ? p[0] : $"{p[0]}|{p[2]}");   // parameter vs constant
        }
        return cache.Count;
    }
}`,
        dry: { head: ['query', 'key', 'new?', 'translations'], rows: [['ById|const|1', 'ById|1', 'yes', '1'], ['ById|const|2', 'ById|2', 'yes', '2'], ['ById|const|1', 'ById|1', 'no', '2']] },
        complexity: `<p>O(n) time and space.</p>`,
        followUps: ['Add a cache capacity with LRU eviction (practice problem).', 'Where else do constants hurt? (the database plan cache)']
      }
    }]
  });

  /* ======================================================================
     PRACTICE
     ====================================================================== */
  practice.push({
    title: 'States After SaveChanges',
    level: 'Easy', tags: ['change tracking', 'EntityState'], companies: ['TCS', 'Infosys'],
    statement: `<p>Given the ${C('EntityState')} of each entry just before a successful ${C('SaveChanges')}, write ${C('static string[] AfterSave(string[] states)')} returning each entry's state afterwards.</p>`,
    constraints: `States are Added, Modified, Unchanged, Deleted or Detached. 0 ≤ n ≤ 10<sup>5</sup>.`,
    example: `<p>${C('["Added","Modified","Unchanged","Deleted"]')} → ${H.c('g', '["Unchanged","Unchanged","Unchanged","Detached"]')}: inserted and updated rows now match the database; deleted rows are no longer tracked.</p>`,
    brute: { why: `<p>An if/else chain per state works; a switch expression is clearer and the compiler checks every arm.</p>`, code: `
public class Brute
{
    public static string One(string s)
    {
        if (s == "Deleted") return "Detached";
        if (s == "Detached") return "Detached";
        return "Unchanged";
    }
}` },
    mcq: { q: 'After SaveChanges succeeds, an entity that was Deleted is…', options: ['Detached', 'Unchanged', 'Still Deleted', 'Added'], answer: 0, explain: 'AcceptAllChanges stops tracking deleted entities.' },
    hints: [`<p>Hint 1: SaveChanges calls AcceptAllChanges at the end.</p>`, `<p>Hint 2: everything that still exists in the database becomes Unchanged.</p>`, `<p>Hint 3: Deleted and Detached both end Detached; use ${C('Select')} with a switch expression.</p>`],
    tests: { sig: 'string[] -> string[]', fn: 'afterSave', cases: [[[["Added", "Modified", "Unchanged", "Deleted"]], ["Unchanged", "Unchanged", "Unchanged", "Detached"]], [[[]], []], [[["Detached"]], ["Detached"]], [[["Deleted", "Deleted"]], ["Detached", "Detached"]], [[["Added"]], ["Unchanged"]], [[["Unchanged", "Modified"]], ["Unchanged", "Unchanged"]]] },
    solution: {
      approach: `<p>Apply the AcceptAllChanges rule to each state.</p>`,
      code: `
public class Solution
{
    public static string[] AfterSave(string[] states) =>
        states.Select(s => s switch
        {
            "Deleted" or "Detached" => "Detached",
            _ => "Unchanged"                     // Added, Modified, Unchanged
        }).ToArray();
}`,
      complexity: `<p>O(n) time, one pass over the input.</p>`
    }
  });

  practice.push({
    title: 'SaveChanges Round Trips',
    level: 'Easy', tags: ['batching', 'SaveChanges', 'performance'], companies: ['Microsoft', 'Wipro'],
    statement: `<p>SaveChanges groups modification statements into batches of at most ${C('maxBatch')} statements per database command. Write ${C('static int BatchRoundTrips(int changes, int maxBatch)')} returning the number of commands sent for ${C('changes')} INSERT/UPDATE/DELETE statements.</p>`,
    constraints: `0 ≤ changes ≤ 10<sup>9</sup>; 1 ≤ maxBatch ≤ 10<sup>4</sup>.`,
    example: `<p>${C('BatchRoundTrips(100, 42)')} → ${H.c('g', '3')} (42 + 42 + 16).</p>`,
    brute: { why: `<p>Subtracting maxBatch in a loop is O(changes / maxBatch); integer ceiling division is O(1).</p>`, code: `
public class Brute
{
    public static int Loop(int changes, int maxBatch)
    {
        int trips = 0;
        while (changes > 0) { changes -= maxBatch; trips++; }
        return trips;
    }
}` },
    mcq: { q: 'What is the default maximum batch size of the SQL Server provider?', options: ['42 statements', '1 statement', '1000 statements', 'Unlimited'], answer: 0, explain: 'The SQL Server provider defaults to 42; it can be changed with MaxBatchSize.' },
    hints: [`<p>Hint 1: this is ceiling division: a partly filled batch still costs a command.</p>`, `<p>Hint 2: ${C('(changes + maxBatch - 1) / maxBatch')} — watch for overflow near int.MaxValue.</p>`, `<p>Hint 3: zero changes means zero commands; do the arithmetic in ${C('long')}.</p>`],
    tests: { sig: 'int int -> int', fn: 'batchRoundTrips', cases: [[[0, 42], 0], [[1, 42], 1], [[42, 42], 1], [[43, 42], 2], [[100, 42], 3], [[5, 1], 5], [[1000000, 42], 23810], [[7, 100], 1], [[2147483647, 1], 2147483647]] },
    solution: {
      approach: `<p>Ceiling division done in ${C('long')} so ${C('changes + maxBatch - 1')} cannot overflow.</p>`,
      code: `
public class Solution
{
    public static int BatchRoundTrips(int changes, int maxBatch) =>
        (int)(((long)changes + maxBatch - 1) / maxBatch);
}`,
      complexity: `<p>O(1) time and O(1) extra space.</p>`
    }
  });

  practice.push({
    title: 'Objects Materialized by a Query',
    level: 'Easy', tags: ['AsNoTracking', 'identity resolution'], companies: ['Microsoft', 'Capgemini'],
    statement: `<p>A query returns rows whose primary keys are ${C('keys')} (a key repeats when a JOIN duplicates a row). Write ${C('static int Materialized(int[] keys, string mode)')} returning how many entity <b>objects</b> are created, for ${C('"Tracking"')}, ${C('"NoTracking"')} and ${C('"NoTrackingWithIdentityResolution"')}, starting from an empty context.</p>`,
    constraints: `0 ≤ keys ≤ 10<sup>5</sup>.`,
    example: `<p>${C('[1,1,2]')}: Tracking → ${H.c('g', '2')}, NoTracking → ${H.c('r', '3')}, NoTrackingWithIdentityResolution → 2.</p>`,
    brute: { why: `<p>Checking each key against all earlier keys is O(n²); a hash set is O(n).</p>`, code: `
public class Brute
{
    public static int Distinct(int[] keys)
    {
        int count = 0;
        for (int i = 0; i < keys.Length; i++)
            if (Array.IndexOf(keys, keys[i]) == i) count++;
        return count;
    }
}` },
    mcq: { q: 'Which query mode can return two different objects for the same primary key?', options: ['AsNoTracking()', 'A tracking query', 'AsNoTrackingWithIdentityResolution()', 'Find()'], answer: 0, explain: 'Without an identity map, each row becomes its own object.' },
    hints: [`<p>Hint 1: identity resolution means one object per key.</p>`, `<p>Hint 2: two of the three modes resolve identity.</p>`, `<p>Hint 3: use ${C('Distinct().Count()')} or a HashSet; NoTracking is just the row count.</p>`],
    tests: { sig: 'int[] string -> int', fn: 'materialized', cases: [[[[1, 1, 2], "Tracking"], 2], [[[1, 1, 2], "NoTracking"], 3], [[[1, 1, 2], "NoTrackingWithIdentityResolution"], 2], [[[], "Tracking"], 0], [[[7], "NoTracking"], 1], [[[3, 3, 3, 3], "Tracking"], 1], [[{ $rep: 5, n: 50000 }, "NoTracking"], 50000]] },
    solution: {
      approach: `<p>NoTracking creates one object per row; the other two modes create one per distinct key.</p>`,
      code: `
public class Solution
{
    public static int Materialized(int[] keys, string mode) =>
        mode == "NoTracking" ? keys.Length : keys.Distinct().Count();
}`,
      complexity: `<p>O(n) time, one pass over the input.</p>`
    }
  });

  practice.push({
    title: 'Pending Migrations',
    level: 'Easy', tags: ['migrations', 'set difference'], companies: ['Microsoft', 'Accenture'],
    statement: `<p>${C('all')} holds the ids of migrations in the code (not necessarily sorted); ${C('applied')} holds the ids in ${C('__EFMigrationsHistory')}. Write ${C('static string[] PendingMigrations(string[] all, string[] applied)')} returning the ids still to apply, in the order EF applies them (ordinal order of the timestamped ids).</p>`,
    constraints: `0 ≤ n ≤ 10<sup>4</sup>. Ids are unique.`,
    example: `<p>all ${C('["20240101_Init","20240201_AddRating","20240301_AddTags"]')}, applied ${C('["20240101_Init"]')} → ${H.c('g', '["20240201_AddRating","20240301_AddTags"]')}.</p>`,
    brute: { why: `<p>${C('applied.Contains')} inside a loop is O(n·m); a HashSet makes it O(n + m).</p>`, code: `
public class Brute
{
    public static string[] Pending(string[] all, string[] applied) =>
        all.Where(a => !applied.Contains(a)).OrderBy(a => a, StringComparer.Ordinal).ToArray();
}` },
    mcq: { q: 'Where does EF Core record which migrations have been applied?', options: ['The __EFMigrationsHistory table in the target database', 'ModelSnapshot.cs', 'appsettings.json', 'The migrations assembly manifest'], answer: 0, explain: 'Each applied migration id is inserted into __EFMigrationsHistory.' },
    hints: [`<p>Hint 1: put the applied ids in a HashSet.</p>`, `<p>Hint 2: keep only the ids that are not in the applied set.</p>`, `<p>Hint 3: sort with ${C('StringComparer.Ordinal')} — the timestamp prefix makes that chronological.</p>`],
    tests: { sig: 'string[] string[] -> string[]', fn: 'pendingMigrations', cases: [[[["20240101_Init", "20240201_AddRating", "20240301_AddTags"], ["20240101_Init"]], ["20240201_AddRating", "20240301_AddTags"]], [[["20240101_Init"], ["20240101_Init"]], []], [[[], []], []], [[["20240301_C", "20240101_A", "20240201_B"], []], ["20240101_A", "20240201_B", "20240301_C"]], [[["20240101_A", "20240201_B"], ["20240201_B"]], ["20240101_A"]], [[["20240101_A", "20240201_B", "20240201_C"], ["20240101_A", "20240201_B", "20240201_C"]], []]] },
    solution: {
      approach: `<p>Set difference, then ordinal sort.</p>`,
      code: `
public class Solution
{
    public static string[] PendingMigrations(string[] all, string[] applied)
    {
        var done = new HashSet<string>(applied);
        return all.Where(id => !done.Contains(id))
                  .OrderBy(id => id, StringComparer.Ordinal)
                  .ToArray();
    }
}`,
      complexity: `<p>O(n log n + m) time, O(m) space.</p>`
    }
  });

  practice.push({
    title: 'Cartesian Explosion: Single vs Split Query',
    level: 'Medium', tags: ['Include', 'AsSplitQuery', 'performance'], companies: ['Microsoft', 'Booking.com'],
    statement: `<p>Blog i has ${C('posts[i]')} posts and ${C('tags[i]')} tags. Loading ${C('Blogs.Include(Posts).Include(Tags)')} as one query (LEFT JOINs) returns ${C('max(p,1) × max(t,1)')} rows per blog. As a split query it returns one row per blog, plus one per post, plus one per tag. Write ${C('static long[] CartesianRows(int[] posts, int[] tags)')} returning ${C('[single-query rows, split-query rows]')}.</p>`,
    constraints: `posts.Length == tags.Length ≤ 10<sup>5</sup>; counts ≤ 10<sup>5</sup>. Use long.`,
    example: `<p>posts ${C('[10,0,3]')}, tags ${C('[5,2,0]')} → ${H.c('g', '[55, 23]')}: single = 50 + 2 + 3; split = 3 blogs + 13 posts + 7 tags.</p>`,
    brute: { why: `<p>Building the joined rows in memory to count them costs as much as the explosion itself; multiply instead.</p>`, code: `
public class Brute
{
    public static long JoinRows(int posts, int tags)
    {
        long rows = 0;
        for (int p = 0; p < Math.Max(posts, 1); p++)
            for (int t = 0; t < Math.Max(tags, 1); t++) rows++;   // materialize every pair
        return rows;
    }
}` },
    mcq: { q: 'Why does a blog with 0 posts and 0 tags still produce one row in the single query?', options: ['LEFT JOIN keeps the parent row with NULLs for the missing children', 'EF adds a dummy row', 'INNER JOIN is used', 'It does not; it produces 0 rows'], answer: 0, explain: 'Include uses LEFT JOIN so parents without children are still returned.' },
    hints: [`<p>Hint 1: per blog, the single query multiplies the two collection sizes, each at least 1.</p>`, `<p>Hint 2: the split query adds: blogs + total posts + total tags.</p>`, `<p>Hint 3: 10<sup>5</sup> × 10<sup>5</sup> overflows int — cast to long before multiplying.</p>`],
    tests: { sig: 'int[] int[] -> long[]', fn: 'cartesianRows', cases: [[[[10, 0, 3], [5, 2, 0]], [55, 23]], [[[], []], [0, 0]], [[[0], [0]], [1, 1]], [[[100], [100]], [10000, 201]], [[[1, 2, 3], [1, 1, 1]], [6, 12]], [[[1000, 1000], [1000, 1000]], [2000000, 4002]], [[[100000], [100000]], [10000000000, 200001]]] },
    solution: {
      approach: `<p>Sum the per-blog products (in long) for the single query, and blogs + posts + tags for the split query.</p>`,
      code: `
public class Solution
{
    public static long[] CartesianRows(int[] posts, int[] tags)
    {
        long single = 0, split = posts.Length;          // one row per blog in the first split query
        for (int i = 0; i < posts.Length; i++)
        {
            single += (long)Math.Max(posts[i], 1) * Math.Max(tags[i], 1);
            split += posts[i] + (long)tags[i];
        }
        return new[] { single, split };
    }
}`,
      complexity: `<p>O(n) time, one pass over the input.</p>`
    }
  });

  practice.push({
    title: 'Detect N+1 in a SQL Log',
    level: 'Medium', tags: ['N+1', 'logging', 'hash map', 'string'], companies: ['Microsoft', 'Shopify', 'Atlassian'],
    statement: `<p>Given the SQL commands logged during one request, normalize each by replacing every single-quoted string literal with ${C('?')} and then every run of digits with ${C('?')}. Write ${C('static string[] DetectNPlusOne(string[] log, int threshold)')} returning each normalized statement that occurs at least ${C('threshold')} times, in order of first appearance.</p>`,
    constraints: `0 ≤ log ≤ 10<sup>5</sup>; string literals contain no quotes; threshold ≥ 1.`,
    example: `<p>${C('["SELECT * FROM Blogs","SELECT * FROM Posts WHERE BlogId = 1","… = 2","… = 3"]')}, threshold 3 → ${H.c('r', '["SELECT * FROM Posts WHERE BlogId = ?"]')}.</p>`,
    brute: { why: `<p>Comparing every pair of normalized statements is O(n²). Counting in a dictionary keyed by the normalized text is O(total length).</p>`, code: `
public class Brute
{
    public static int CountSame(string[] normalized, int i)
    {
        int c = 0;
        foreach (var s in normalized) if (s == normalized[i]) c++;
        return c;
    }
}` },
    mcq: { q: 'Why normalize literals before counting?', options: ['N+1 queries differ only in their parameter values; the shape is what repeats', 'To make SQL shorter', 'SQL Server requires it', 'To prevent SQL injection'], answer: 0, explain: 'Grouping by query shape exposes "same query, different id" — the N+1 signature.' },
    hints: [`<p>Hint 1: use ${C('Regex.Replace')} twice: ${C("'[^']*'")} then ${C('\\d+')}.</p>`, `<p>Hint 2: count with a ${C('Dictionary<string, int>')} and keep a list of first-appearance order.</p>`, `<p>Hint 3: replace strings before digits so a digit inside a string does not leave stray quotes.</p>`],
    tests: { sig: 'string[] int -> string[]', fn: 'detectNPlusOne', cases: [[[["SELECT * FROM Blogs", "SELECT * FROM Posts WHERE BlogId = 1", "SELECT * FROM Posts WHERE BlogId = 2", "SELECT * FROM Posts WHERE BlogId = 3"], 3], ["SELECT * FROM Posts WHERE BlogId = ?"]], [[["SELECT 1"], 2], []], [[[], 1], []], [[["SELECT * FROM U WHERE Name = 'ann'", "SELECT * FROM U WHERE Name = 'bo'", "SELECT * FROM T"], 1], ["SELECT * FROM U WHERE Name = ?", "SELECT * FROM T"]], [[["A 1", "B 2", "A 3", "B 4", "A 55"], 2], ["A ?", "B ?"]], [[["X 1", "X 2"], 3], []]] },
    solution: {
      approach: `<p>Normalize with two regexes, count occurrences, and keep first-seen order.</p>`,
      code: `
using System.Text.RegularExpressions;

public class Solution
{
    static readonly Regex Str = new("'[^']*'", RegexOptions.Compiled);
    static readonly Regex Num = new(@"\\d+", RegexOptions.Compiled);

    public static string[] DetectNPlusOne(string[] log, int threshold)
    {
        var count = new Dictionary<string, int>();
        var order = new List<string>();
        foreach (var sql in log)
        {
            var shape = Num.Replace(Str.Replace(sql, "?"), "?");
            if (count.TryGetValue(shape, out var c)) count[shape] = c + 1;
            else { count[shape] = 1; order.Add(shape); }
        }
        return order.Where(s => count[s] >= threshold).ToArray();
    }
}`,
      complexity: `<p>O(total characters).</p>`
    }
  });

  practice.push({
    title: 'Build the UPDATE for Changed Columns',
    level: 'Medium', tags: ['change tracking', 'SQL generation', 'string'], companies: ['Microsoft', 'EPAM'],
    statement: `<p>Like EF's snapshot change tracking, generate an UPDATE for only the changed properties. ${C('original')} and ${C('current')} list the same properties in the same order as ${C('"Name=value"')}; ${C('key')} names the key property (never updated). Write ${C('static string BuildUpdate(string table, string key, string[] original, string[] current)')} returning ${C('"UPDATE T SET A = @p0, B = @p1 WHERE Key = @p2"')} (parameters numbered in order, the key last), or ${C('""')} if nothing changed.</p>`,
    constraints: `1 ≤ properties ≤ 100. Values may be empty and contain no '='.`,
    example: `<p>Users, Id, ${C('["Id=7","Email=a","Age=3","City=x"]')} → ${C('["Id=7","Email=b","Age=3","City=y"]')} gives ${H.c('g', '"UPDATE Users SET Email = @p0, City = @p1 WHERE Id = @p2"')}.</p>`,
    brute: { why: `<p>Updating every column (what ${C('db.Update(entity)')} does) is simpler but writes unchanged data and can overwrite other users' changes to those columns.</p>`, code: `
public class Brute
{
    public static string AllColumns(string table, string key, string[] current)
    {
        var names = current.Select(c => c.Split('=')[0]).Where(n => n != key).ToList();
        var sets = names.Select((n, i) => $"{n} = @p{i}");
        return $"UPDATE {table} SET {string.Join(", ", sets)} WHERE {key} = @p{names.Count}";
    }
}` },
    mcq: { q: 'With default snapshot tracking, which columns appear in the UPDATE after changing one property of a tracked entity?', options: ['Only the changed property', 'All columns', 'All columns except the key', 'None until you call Update()'], answer: 0, explain: 'DetectChanges marks individual properties as modified; only those are sent.' },
    hints: [`<p>Hint 1: walk both arrays with the same index and compare the strings.</p>`, `<p>Hint 2: skip the key property; number parameters with a counter.</p>`, `<p>Hint 3: if no property changed, return the empty string; otherwise the key parameter number equals the count of SET items.</p>`],
    tests: { sig: 'string string string[] string[] -> string', fn: 'buildUpdate', cases: [[["Products", "Id", ["Id=1", "Name=pen", "Price=2"], ["Id=1", "Name=pen", "Price=3"]], "UPDATE Products SET Price = @p0 WHERE Id = @p1"], [["Products", "Id", ["Id=1", "Name=pen"], ["Id=1", "Name=pen"]], ""], [["Users", "Id", ["Id=7", "Email=a", "Age=3", "City=x"], ["Id=7", "Email=b", "Age=3", "City=y"]], "UPDATE Users SET Email = @p0, City = @p1 WHERE Id = @p2"], [["T", "Key", ["Key=k", "A=1"], ["Key=k", "A=2"]], "UPDATE T SET A = @p0 WHERE Key = @p1"], [["T", "Id", ["A=1", "Id=2", "B=3"], ["A=9", "Id=2", "B=8"]], "UPDATE T SET A = @p0, B = @p1 WHERE Id = @p2"], [["T", "Id", ["Id=1", "Name="], ["Id=1", "Name=x"]], "UPDATE T SET Name = @p0 WHERE Id = @p1"]] },
    solution: {
      approach: `<p>Compare original and current per property, collect changed non-key names, then format the SET list and the key parameter.</p>`,
      code: `
public class Solution
{
    public static string BuildUpdate(string table, string key, string[] original, string[] current)
    {
        var sets = new List<string>();
        for (int i = 0; i < current.Length; i++)
        {
            string name = current[i][..current[i].IndexOf('=')];
            if (name == key || original[i] == current[i]) continue;
            sets.Add($"{name} = @p{sets.Count}");
        }
        return sets.Count == 0 ? "" : $"UPDATE {table} SET {string.Join(", ", sets)} WHERE {key} = @p{sets.Count}";
    }
}`,
      complexity: `<p>O(total length of the property strings).</p>`
    }
  });

  practice.push({
    title: 'Keyset Pagination',
    level: 'Medium', tags: ['pagination', 'binary search', 'performance'], companies: ['Microsoft', 'LinkedIn'],
    statement: `<p>Instead of ${C('Skip(k).Take(n)')}, keyset pagination asks for ${C('WHERE Id > @lastId ORDER BY Id')} with ${C('Take(size)')}, which an index answers by seeking. Given the sorted, unique ${C('ids')} in the table, write ${C('static int[] KeysetPage(int[] ids, int afterId, int size)')} returning the next page — in O(log n + size).</p>`,
    constraints: `0 ≤ ids ≤ 10<sup>6</sup>, strictly increasing; 0 ≤ size ≤ 1000.`,
    example: `<p>${C('[1,3,5,7,9]')}, after 3, size 2 → ${H.c('g', '[5, 7]')}.</p>`,
    brute: { why: `<p>Scanning from the start to find the first id after ${C('afterId')} is O(n) — the same waste as OFFSET, which reads and discards skipped rows.</p>`, code: `
public class Brute
{
    public static int[] Page(int[] ids, int afterId, int size) =>
        ids.Where(id => id > afterId).Take(size).ToArray();   // linear scan
}` },
    mcq: { q: 'Why does <code>Skip(100000).Take(20)</code> get slower for deep pages?', options: ['The database still reads and discards the first 100 000 rows (OFFSET)', 'EF loads all skipped rows into memory', 'Take disables indexes', 'It does not get slower'], answer: 0, explain: 'OFFSET must walk past the skipped rows; a keyset WHERE seeks straight to the start.' },
    hints: [`<p>Hint 1: the start position is the first index with ${C('ids[i] > afterId')} — an upper bound.</p>`, `<p>Hint 2: ${C('Array.BinarySearch')} returns the bitwise complement of the insertion point when not found.</p>`, `<p>Hint 3: if afterId is present, start at index + 1; then copy at most size elements.</p>`],
    tests: { sig: 'int[] int int -> int[]', fn: 'keysetPage', cases: [[[[1, 3, 5, 7, 9], 3, 2], [5, 7]], [[[1, 3, 5, 7, 9], 0, 10], [1, 3, 5, 7, 9]], [[[1, 3, 5, 7, 9], 9, 2], []], [[[], 0, 5], []], [[[2, 4, 6], 4, 1], [6]], [[[2, 4, 6], -100, 0], []], [[{ $range: [0, 100000] }, 99990, 5], [99991, 99992, 99993, 99994, 99995]]] },
    solution: {
      approach: `<p>Binary search for the first id greater than afterId, then take a slice of at most size items.</p>`,
      code: `
public class Solution
{
    public static int[] KeysetPage(int[] ids, int afterId, int size)
    {
        int i = Array.BinarySearch(ids, afterId);
        int start = i >= 0 ? i + 1 : ~i;               // first id > afterId
        int count = Math.Min(size, ids.Length - start);
        return ids.AsSpan(start, count).ToArray();
    }
}`,
      complexity: `<p>O(log n + size) time and output space.</p>`
    }
  });

  practice.push({
    title: 'Transactions and Savepoints',
    level: 'Medium', tags: ['transactions', 'savepoints', 'stack'], companies: ['Microsoft', 'Barclays'],
    statement: `<p>Simulate a connection. Ops: ${C('"begin"')}, ${C('"insert x"')}, ${C('"savepoint s"')}, ${C('"rollback to s"')}, ${C('"commit"')}, ${C('"rollback"')}. Outside a transaction an insert commits immediately. ${C('rollback to s')} undoes inserts made after the latest savepoint named s and discards savepoints created after it (s itself stays). Commit makes pending inserts permanent; rollback discards them. Write ${C('static string[] Transaction(string[] ops)')} returning committed rows in commit order.</p>`,
    constraints: `0 ≤ ops ≤ 10<sup>4</sup>; savepoint/rollback-to/commit/rollback only inside a transaction; rollback-to names an existing savepoint.`,
    example: `<p>${C('["begin","insert a","savepoint s1","insert b","rollback to s1","insert c","commit"]')} → ${H.c('g', '["a","c"]')}.</p>`,
    brute: { why: `<p>Copying the whole pending list at every savepoint costs O(n) per savepoint. Recording only the pending-list <b>length</b> is enough to roll back.</p>`, code: `
public class Brute
{
    public static List<string> Snapshot(List<string> pending) => new List<string>(pending);   // full copy per savepoint
}` },
    mcq: { q: 'In EF Core, what happens if you dispose an IDbContextTransaction without calling Commit?', options: ['The transaction is rolled back', 'It commits automatically', 'It throws', 'Changes stay pending on the connection'], answer: 0, explain: 'Disposing an uncommitted transaction rolls it back.' },
    hints: [`<p>Hint 1: keep a committed list, a nullable pending list, and a stack of (name, pendingLength).</p>`, `<p>Hint 2: rollback to s: find the latest savepoint named s, truncate pending to its length, and pop savepoints above it.</p>`, `<p>Hint 3: begin starts fresh state; commit appends pending to committed; rollback discards both pending and savepoints.</p>`],
    tests: { sig: 'string[] -> string[]', fn: 'transaction', cases: [[[["insert a", "begin", "insert b", "commit"]], ["a", "b"]], [[["begin", "insert a", "rollback", "insert b"]], ["b"]], [[["begin", "insert a", "savepoint s1", "insert b", "rollback to s1", "insert c", "commit"]], ["a", "c"]], [[[]], []], [[["begin", "insert a", "savepoint s1", "insert b", "savepoint s2", "insert c", "rollback to s1", "insert d", "commit"]], ["a", "d"]], [[["begin", "savepoint s", "insert a", "rollback to s", "insert b", "rollback to s", "commit", "insert c"]], ["c"]]] },
    solution: {
      approach: `<p>Savepoints only need the pending-list length at the time they were created. Rolling back truncates the list and the savepoint stack.</p>`,
      code: `
public class Solution
{
    public static string[] Transaction(string[] ops)
    {
        var committed = new List<string>();
        List<string>? pending = null;
        var savepoints = new List<(string Name, int Length)>();
        foreach (var op in ops)
        {
            var p = op.Split(' ');
            switch (p[0])
            {
                case "begin": pending = new(); savepoints.Clear(); break;
                case "insert": (pending ?? committed).Add(p[1]); break;
                case "savepoint": savepoints.Add((p[1], pending!.Count)); break;
                case "commit": committed.AddRange(pending!); pending = null; savepoints.Clear(); break;
                case "rollback" when p.Length == 1: pending = null; savepoints.Clear(); break;
                case "rollback":
                    int i = savepoints.FindLastIndex(s => s.Name == p[2]);
                    pending!.RemoveRange(savepoints[i].Length, pending.Count - savepoints[i].Length);
                    savepoints.RemoveRange(i + 1, savepoints.Count - i - 1);
                    break;
            }
        }
        return committed.ToArray();
    }
}`,
      complexity: `<p>O(total ops + rows), each insert removed at most once.</p>`
    }
  });

  practice.push({
    title: 'SaveChanges Insert Order',
    level: 'Hard', tags: ['topological sort', 'foreign keys', 'unit of work'], companies: ['Microsoft', 'Amazon', 'Oracle'],
    statement: `<p>SaveChanges must insert principals before dependents. Given table names and foreign keys ${C('"Child->Parent"')}, write ${C('static string[] SaveOrder(string[] tables, string[] fks)')} returning an insert order where every parent precedes its children; when several tables are ready, choose the ordinal-smallest name. Self-references (${C('"A->A"')}) are handled row by row and ignored here; duplicate FKs count once. If there is a cycle, return ${C('["CYCLE"]')}.</p>`,
    constraints: `0 ≤ tables ≤ 10<sup>4</sup>, fks ≤ 5·10<sup>4</sup>; FK tables are in the list.`,
    example: `<p>${C('["Post","Blog","Tag","PostTag"]')}, ${C('["Post->Blog","PostTag->Post","PostTag->Tag"]')} → ${H.c('g', '["Blog","Post","Tag","PostTag"]')}: Blog and Tag are ready first; Blog wins the tie, which frees Post; then Post &lt; Tag.</p>`,
    brute: { why: `<p>Repeatedly scanning all tables for one with no remaining parents is O(V·(V+E)). Kahn's algorithm with a priority queue is O((V+E) log V).</p>`, code: `
public class Brute
{
    public static bool Ready(string t, HashSet<string> done, string[] fks) =>
        fks.All(f => { var p = f.Split("->"); return p[0] != t || p[0] == p[1] || done.Contains(p[1]); });
}` },
    mcq: { q: 'Two Added entities, Order and Customer, where Order has a required FK to Customer. What does SaveChanges do?', options: ['Inserts Customer first, reads its generated key, sets Order.CustomerId, then inserts Order', 'Inserts in the order Add was called', 'Throws unless you call SaveChanges twice', 'Inserts Order with a NULL FK and updates it later'], answer: 0, explain: 'EF sorts commands topologically by dependencies and fixes up generated keys within the same SaveChanges.' },
    hints: [`<p>Hint 1: an edge goes parent → child; count each child's in-degree (distinct parents, excluding itself).</p>`, `<p>Hint 2: Kahn's algorithm with a ${C('PriorityQueue<string, string>')} using ${C('StringComparer.Ordinal')} gives the smallest ready name.</p>`, `<p>Hint 3: if fewer than all tables were output, a cycle remains; deduplicate edges with a HashSet.</p>`],
    tests: { sig: 'string[] string[] -> string[]', fn: 'saveOrder', cases: [[[["Orders", "Customers", "OrderLines"], ["Orders->Customers", "OrderLines->Orders"]], ["Customers", "Orders", "OrderLines"]], [[["B", "A", "C"], []], ["A", "B", "C"]], [[["A", "B"], ["A->B", "B->A"]], ["CYCLE"]], [[["Emp"], ["Emp->Emp"]], ["Emp"]], [[["Post", "Blog", "Tag", "PostTag"], ["Post->Blog", "PostTag->Post", "PostTag->Tag"]], ["Blog", "Post", "Tag", "PostTag"]], [[[], []], []], [[["X", "Y", "Z"], ["Z->X", "Z->Y", "Z->X"]], ["X", "Y", "Z"]]] },
    solution: {
      approach: `<p>Kahn's topological sort over deduplicated parent → child edges, using a min-priority queue on the name to break ties deterministically.</p>`,
      code: `
public class Solution
{
    public static string[] SaveOrder(string[] tables, string[] fks)
    {
        var children = tables.ToDictionary(t => t, _ => new List<string>());
        var indegree = tables.ToDictionary(t => t, _ => 0);
        foreach (var fk in new HashSet<string>(fks))
        {
            var parts = fk.Split("->");
            string child = parts[0], parent = parts[1];
            if (child == parent) continue;                 // self-reference: ordered per row
            children[parent].Add(child);
            indegree[child]++;
        }
        var ready = new PriorityQueue<string, string>(StringComparer.Ordinal);
        foreach (var t in tables) if (indegree[t] == 0) ready.Enqueue(t, t);
        var order = new List<string>();
        while (ready.TryDequeue(out var t, out _))
        {
            order.Add(t);
            foreach (var c in children[t])
                if (--indegree[c] == 0) ready.Enqueue(c, c);
        }
        return order.Count == tables.Length ? order.ToArray() : new[] { "CYCLE" };
    }
}`,
      complexity: `<p>O((V + E) log V) time, O(V + E) space.</p>`
    }
  });

  practice.push({
    title: 'Concurrent Increments with Retry',
    level: 'Hard', tags: ['optimistic concurrency', 'retry', 'simulation'], companies: ['Microsoft', 'Stripe', 'Uber'],
    statement: `<p>A counter row starts at ${C('initial')}, version 1. Client X wants to add its delta (${C('"X:d"')} in ${C('deltas')}). Events: ${C('"rX"')} — X reads value and version; ${C('"wX"')} — if X is finished or has never read, nothing happens; if X's version equals the row version, the row becomes X's read value + d, the version increments and X is finished; otherwise it is a conflict: count it, and X reloads (takes the current value and version, like ${C('GetDatabaseValues')}) for its next write. Write ${C('static int[] RetryIncrements(int initial, string[] deltas, string[] events)')} returning ${C('[value, version, conflicts]')}.</p>`,
    constraints: `0 ≤ events ≤ 10<sup>5</sup>; client names are single letters; every writer has a delta.`,
    example: `<p>0, ${C('["A:5","B:3"]')}, ${C('["rA","rB","wA","wB","wB"]')} → ${H.c('g', '[8, 3, 1]')}: A writes 5 (v2); B conflicts, reloads 5/v2, then writes 8 (v3).</p>`,
    brute: { why: `<p>Without the version check both clients write "read value + delta" and one increment is lost: 0 + 3 = 3 instead of 8.</p>`, code: `
public class Brute
{
    public static int LostUpdate(int initial, int[] deltas) =>
        deltas.Length == 0 ? initial : initial + deltas[^1];   // last writer overwrites the others
}` },
    mcq: { q: 'An increment is implemented as read → add → SaveChanges with a concurrency token. What is the simplest alternative that needs no retry?', options: ['A single set-based UPDATE: SET Count = Count + @d (e.g. ExecuteUpdate)', 'Reading the row twice', 'Using AsNoTracking', 'Increasing the transaction timeout'], answer: 0, explain: 'Letting the database do the arithmetic atomically avoids the read-modify-write race entirely.' },
    hints: [`<p>Hint 1: per client keep: hasRead, done, readValue, readVersion.</p>`, `<p>Hint 2: a write compares readVersion with the row version — success applies readValue + delta.</p>`, `<p>Hint 3: on conflict, increment the counter and refresh the client from the row; ignore writes from finished or never-read clients.</p>`],
    tests: { sig: 'int string[] string[] -> int[]', fn: 'retryIncrements', cases: [[[0, ["A:5", "B:3"], ["rA", "rB", "wA", "wB", "wB"]], [8, 3, 1]], [[10, ["A:1"], ["rA", "wA"]], [11, 2, 0]], [[0, ["A:1", "B:1"], ["rA", "rB", "wB", "wA", "rA", "wA"]], [2, 3, 1]], [[5, [], []], [5, 1, 0]], [[0, ["A:2"], ["wA", "rA", "wA", "wA"]], [2, 2, 0]], [[100, ["A:-10", "B:20", "C:5"], ["rA", "rB", "rC", "wC", "wB", "wA", "wB", "wA"]], [125, 3, 3]]] },
    solution: {
      approach: `<p>Simulate each client's optimistic read-modify-write with a small state record, applying the version check on every write.</p>`,
      code: `
public class Solution
{
    sealed class Client { public bool Read, Done; public int Value, Version; }

    public static int[] RetryIncrements(int initial, string[] deltas, string[] events)
    {
        int value = initial, version = 1, conflicts = 0;
        var delta = deltas.Select(d => d.Split(':')).ToDictionary(p => p[0], p => int.Parse(p[1]));
        var clients = new Dictionary<string, Client>();
        foreach (var e in events)
        {
            string name = e[1..];
            if (!clients.TryGetValue(name, out var c)) clients[name] = c = new Client();
            if (e[0] == 'r') { c.Read = true; c.Value = value; c.Version = version; continue; }
            if (c.Done || !c.Read) continue;
            if (c.Version == version)                      // WHERE Version = @read
            {
                value = c.Value + delta[name];
                version++;
                c.Done = true;
            }
            else
            {
                conflicts++;                               // DbUpdateConcurrencyException
                c.Value = value; c.Version = version;      // reload database values
            }
        }
        return new[] { value, version, conflicts };
    }
}`,
      complexity: `<p>O(events + clients).</p>`
    }
  });

  practice.push({
    title: 'Query Cache with LRU Eviction',
    level: 'Hard', tags: ['LRU', 'query cache', 'linked list', 'hash map'], companies: ['Microsoft', 'Google', 'Amazon'],
    statement: `<p>EF stores translated queries in a size-limited memory cache. Model it as an LRU cache of ${C('capacity')} keys. Each query ${C('"Shape|kind|value"')} has key = shape for ${C('var')} and shape + value for ${C('const')}. A hit marks the key most recently used; a miss translates (count it), inserts the key, and evicts the least recently used key if over capacity. Write ${C('static int CacheMisses(string[] queries, int capacity)')} in O(1) per query.</p>`,
    constraints: `0 ≤ queries ≤ 10<sup>5</sup>; 1 ≤ capacity ≤ 10<sup>5</sup>.`,
    example: `<p>${C('["A|const|1","A|const|2","A|const|3","A|const|1"]')}, capacity 2 → ${H.c('r', '4')}: constants make three keys, and key 1 was evicted before it came back.</p>`,
    brute: { why: `<p>A ${C('List<string>')} with ${C('IndexOf')} and ${C('RemoveAt')} is O(capacity) per query. A dictionary pointing at linked-list nodes makes every step O(1).</p>`, code: `
public class Brute
{
    public static int Misses(string[] keys, int capacity)
    {
        var lru = new List<string>();
        int misses = 0;
        foreach (var k in keys)
        {
            int i = lru.IndexOf(k);                        // O(capacity)
            if (i >= 0) lru.RemoveAt(i);
            else { misses++; if (lru.Count == capacity) lru.RemoveAt(0); }
            lru.Add(k);
        }
        return misses;
    }
}` },
    mcq: { q: 'A service builds queries with <code>Expression.Constant(userId)</code>. What happens to the EF query cache under load?', options: ['Every user id is a new cache key, so translations repeat and older entries get evicted', 'Nothing; constants are parameterized automatically', 'The cache is disabled', 'Queries fail to translate'], answer: 0, explain: 'Constants are part of the tree shape; use a closure variable (or EF.Parameter) so the value becomes a parameter.' },
    hints: [`<p>Hint 1: the classic LRU: ${C('LinkedList<string>')} for recency + ${C('Dictionary<string, LinkedListNode<string>>')}.</p>`, `<p>Hint 2: on a hit, move the node to the back; on a miss, add to the back and remove the front if over capacity.</p>`, `<p>Hint 3: build the key exactly as in the guided problem; remember to delete the evicted key from the dictionary.</p>`],
    tests: { sig: 'string[] int -> int', fn: 'cacheMisses', cases: [[[["A|var|1", "A|var|2", "B|var|1"], 2], 2], [[["A|const|1", "A|const|2", "A|const|1"], 2], 2], [[["A|const|1", "A|const|2", "A|const|3", "A|const|1"], 2], 4], [[[], 3], 0], [[["A|var|1", "B|var|1", "A|var|1", "C|var|1", "B|var|1"], 2], 4], [[["A|const|1", "A|const|1"], 1], 1], [[["A|var|1", "B|var|1", "C|var|1", "A|var|1"], 1], 4]] },
    solution: {
      approach: `<p>Standard O(1) LRU: a doubly linked list keeps recency order, a dictionary finds nodes.</p>`,
      code: `
public class Solution
{
    public static int CacheMisses(string[] queries, int capacity)
    {
        var order = new LinkedList<string>();                       // front = least recent
        var nodes = new Dictionary<string, LinkedListNode<string>>();
        int misses = 0;
        foreach (var q in queries)
        {
            var p = q.Split('|');
            string key = p[1] == "var" ? p[0] : $"{p[0]}|{p[2]}";
            if (nodes.TryGetValue(key, out var node))
            {
                order.Remove(node);
                order.AddLast(node);                                // hit: most recent
                continue;
            }
            misses++;                                               // translate the query
            nodes[key] = order.AddLast(key);
            if (nodes.Count > capacity)
            {
                nodes.Remove(order.First!.Value);
                order.RemoveFirst();
            }
        }
        return misses;
    }
}`,
      complexity: `<p>O(1) average per query; O(capacity) space.</p>`
    }
  });

  /* ======================================================================
     QUIZ (authored with the correct option first, rotated below)
     ====================================================================== */
  quiz.push(
    { q: `What lifetime does <code>AddDbContext&lt;ShopDb&gt;()</code> give the context in ASP.NET Core?`, options: ['Scoped — one instance per request', 'Singleton', 'Transient', 'Thread-static'], answer: 0, explain: 'AddDbContext registers the context as scoped by default, so each request (scope) gets its own instance.' },
    { q: `Two <code>ToListAsync()</code> calls on the <b>same</b> context are started and awaited together with <code>Task.WhenAll</code>. What happens?`, options: ['InvalidOperationException: a second operation was started on this context', 'They run in parallel safely', 'They run one after another automatically', 'The second returns cached results'], answer: 0, explain: 'DbContext is not thread-safe; EF detects concurrent use and throws. Use one context per parallel task.' },
    { q: `You load an entity with <code>AsNoTracking()</code>, change a property and call <code>SaveChanges()</code>. What is written?`, options: ['Nothing — the entity is not tracked', 'An UPDATE of the changed column', 'An UPDATE of all columns', 'An INSERT'], answer: 0, explain: 'No-tracking entities are Detached, so the change tracker has nothing to save.' },
    { q: `A tracking query returns Blog 1 twice (in two separate queries on one context). What is true?`, options: ['Both results are the same object instance', 'Two different objects with equal values', 'The second query throws', 'The second query skips the database'], answer: 0, explain: 'Identity resolution keeps one instance per key in a tracking context. (The second query still runs SQL; Find is the method that checks the tracker first.)' },
    { q: `What does <code>dotnet ef migrations add</code> diff the current model against?`, options: ['The model snapshot from the previous migration', 'The live database', 'The __EFMigrationsHistory table', 'The previous build output'], answer: 0, explain: 'The snapshot file stores the model as of the last migration; the database is not consulted.' },
    { q: `Which is the recommended way to apply migrations in a production deployment pipeline?`, options: ['Generate an idempotent SQL script (or a migration bundle) and run it in the pipeline', 'Call Database.EnsureCreated() at start-up', 'Call Database.Migrate() from every app instance at start-up', 'Delete and recreate the database'], answer: 0, explain: 'Scripts/bundles are reviewable, run once, and do not need DDL rights in the app. EnsureCreated cannot evolve a schema.' },
    { q: `Lazy loading is on. A loop over 200 orders reads <code>order.Customer.Name</code>; every order has a different customer. How many queries?`, options: ['201', '1', '2', '200'], answer: 0, explain: 'One for the orders plus one per customer navigation — the N+1 pattern.' },
    { q: `<code>Include(b =&gt; b.Posts).Include(b =&gt; b.Tags)</code> in a single query is slow and returns huge result sets. The usual fix is…`, options: ['AsSplitQuery() (or a projection)', 'AsNoTracking() alone', 'Adding a second Include', 'Switching to lazy loading'], answer: 0, explain: 'Two sibling collections multiply rows (cartesian explosion). Split queries load each collection separately.' },
    { q: `<code>IEnumerable&lt;Order&gt; all = db.Orders; var n = all.Count(o =&gt; o.Open);</code> — where is the filter applied?`, options: ['In C#, after all orders are loaded', 'In SQL as SELECT COUNT(*) … WHERE Open = 1', 'It does not compile', 'EF throws a translation error'], answer: 0, explain: 'The static type is IEnumerable, so Enumerable.Count runs over every loaded row.' },
    { q: `Which raw SQL call is safe from SQL injection when <code>name</code> comes from the user?`, options: ['<code>db.Users.FromSql($"SELECT * FROM Users WHERE Name = {name}")</code>', '<code>db.Users.FromSqlRaw("SELECT * FROM Users WHERE Name = \'" + name + "\'")</code>', '<code>db.Users.FromSqlRaw($"SELECT * FROM Users WHERE Name = \'{name}\'")</code>', 'None of them; EF cannot parameterize'], answer: 0, explain: 'FromSql takes a FormattableString and turns each interpolation hole into a DbParameter. FromSqlRaw with a pre-built string pastes the value into SQL.' },
    { q: `SaveChanges throws <code>DbUpdateConcurrencyException</code>. What did the database report?`, options: ['The UPDATE or DELETE affected 0 rows because the concurrency token no longer matched', 'A deadlock', 'A unique-key violation', 'A timeout'], answer: 0, explain: 'EF expected one affected row per command; zero means the row changed or was deleted since it was read.' },
    { q: `Which change makes all <code>Where(p =&gt; p.Id == X)</code> queries share one cached translation?`, options: ['Capture X in a variable so it becomes a SQL parameter', 'Write X as a literal constant', 'Call ToList() before Where', 'Add AsNoTracking()'], answer: 0, explain: 'The query cache is keyed by expression-tree shape; constants change the shape, captured variables do not.' },
    { q: `What does <code>ExecuteUpdateAsync</code> skip compared with load-modify-SaveChanges?`, options: ['Loading entities and the change tracker; tracked instances are not refreshed', 'The database transaction log', 'The WHERE clause', 'Nothing; it is just a shortcut for SaveChanges'], answer: 0, explain: 'It sends one set-based UPDATE immediately; tracked entities, SaveChanges interceptors and token checks are not involved.' }
  );

  /* ======================================================================
     INTERVIEW Q&A
     ====================================================================== */
  interview.push(
    { level: 'B', q: 'What is a DbContext, and what lifetime should it have in a web application?', a: `<p>${C('DbContext')} is EF Core's unit of work: it holds the model, a connection (opened only when needed), ${C('DbSet<T>')} properties and a change tracker. ${C('SaveChanges')} writes all tracked changes in one transaction. In ASP.NET Core it is registered with ${C('AddDbContext')} as <b>scoped</b>, one instance per request. It is not thread-safe, so never share one across concurrent operations, and keep it short-lived because the tracker grows with every loaded entity. For background services or Blazor Server use ${C('IDbContextFactory<T>')}; for very high throughput consider ${C('AddDbContextPool')}.</p>`, followUps: ['What is a captive dependency and how does it apply to DbContext?', 'What does context pooling reset between uses?'] },
    { level: 'B', q: 'Explain the entity states in EF Core and what SaveChanges does with each.', a: `<p>${C('Detached')}: not tracked, ignored. ${C('Added')}: INSERT, then Unchanged with the generated key filled in. ${C('Unchanged')}: nothing. ${C('Modified')}: UPDATE of the changed properties only, then Unchanged. ${C('Deleted')}: DELETE, then Detached. Queries attach results as Unchanged; ${C('Add')}, ${C('Attach')}, ${C('Update')}, ${C('Remove')} set states explicitly; property assignments are found by ${C('DetectChanges')}, which compares current values with the snapshot taken when the entity was tracked.</p>`, followUps: ['What happens when you Remove an Added entity?', 'When does DetectChanges run automatically?'] },
    { level: 'I', q: 'When would you use AsNoTracking, and what is AsNoTrackingWithIdentityResolution?', a: `<p>Use ${C('AsNoTracking')} for read-only queries: EF skips snapshots and the identity map, so it uses less CPU and memory, and results are Detached. The trade-off: the same row appearing twice (e.g. through a JOIN) becomes two objects, and edits are not saved. ${C('AsNoTrackingWithIdentityResolution')} still does not track, but uses a temporary identity map for the duration of the query, so repeated entities in a graph are one instance. Projections with ${C('Select')} to DTOs are never tracked and are often the best choice for read endpoints. You can set no-tracking as the context default and opt in with ${C('AsTracking')}.</p>`, followUps: ['Why might AsNoTracking increase memory for a graph with many repeated entities?', 'Can you attach a no-tracking result and save it later?'] },
    { level: 'I', q: 'What is the N+1 problem and how do you fix it in EF Core?', a: `<p>N+1 is one query for N parent rows plus one query per parent for related data — e.g. lazy loading ${C('order.Customer')} in a loop, or explicit loading inside ${C('foreach')}. It multiplies network round trips and database load. Fixes: eager loading with ${C('Include')}/${C('ThenInclude')}; a projection that pulls the needed child columns in the same query; or loading all children in one ${C('WHERE ParentId IN (...)')} query and grouping in memory. Detect it with command logging, interceptors that count commands per request, or APM traces; add a test that asserts the command count.</p>`, followUps: ['How does Include translate to SQL?', 'When does Include itself become a problem?'] },
    { level: 'I', q: 'Compare eager, explicit and lazy loading.', a: `<p><b>Eager</b> (${C('Include')}): related data comes with the main query — one round trip (or one per collection with split queries); you must know what you need up front; supports filtered includes. <b>Explicit</b> (${C('Entry(e).Collection(...).LoadAsync()')} / ${C('Reference')}): load later on demand, visible in code, can filter via ${C('.Query()')}; easy to cause N+1 in loops. <b>Lazy</b> (proxies + virtual navigations, opt-in): loads automatically on first access — convenient but hides queries, fails after the context is disposed, and makes serializers trigger many queries. Many teams disable lazy loading and prefer projections.</p>`, followUps: ['What packages and configuration does lazy loading require?', 'How does lazy loading interact with JSON serialization?'] },
    { level: 'I', q: 'What is the difference between IQueryable and IEnumerable when using EF Core?', a: `<p>${C('IQueryable<T>')} operators (${C('Queryable.Where')} etc.) take expression trees and only build a query; on enumeration EF translates the whole tree into one SQL statement, so filtering, sorting and paging run in the database. ${C('IEnumerable<T>')} operators take delegates and run in memory over rows already fetched. The method is chosen by the <b>static type</b>, so returning ${C('IEnumerable')} from a repository or calling ${C('AsEnumerable')}/${C('ToList')} early means later filters run in C# after loading everything. Since EF Core 3, untranslatable expressions outside the final Select throw instead of silently evaluating on the client.</p>`, followUps: ['How do you see the SQL a query will generate?', 'How would you build a dynamic filter that still runs in SQL?'] },
    { level: 'I', q: 'How do migrations work, and how do you deploy them safely?', a: `<p>${C('migrations add')} diffs the current model against the ModelSnapshot and generates a migration with Up/Down operations; applied ids are stored in ${C('__EFMigrationsHistory')}. Review every generated migration (renames can appear as drop + add, which loses data) and add data steps with ${C('migrationBuilder.Sql')}. For production generate an <b>idempotent script</b> or a <b>migration bundle</b> and run it in the pipeline with a privileged account, rather than ${C('Database.Migrate()')} at start-up from many instances. For zero downtime use expand/contract: add new structures compatible with the old code, backfill, switch code, remove old structures later. CI can run ${C('has-pending-model-changes')}.</p>`, followUps: ['How do you resolve a ModelSnapshot merge conflict?', 'How do you roll back a bad migration in production?'] },
    { level: 'A', q: 'How does optimistic concurrency work in EF Core, and how do you resolve a conflict?', a: `<p>Mark a property as a concurrency token (${C('[Timestamp]')} rowversion on SQL Server, or ${C('[ConcurrencyCheck]')}/${C('IsConcurrencyToken')} on a version you change yourself). EF includes its original value in the WHERE of UPDATE/DELETE. If the row changed, 0 rows are affected and ${C('DbUpdateConcurrencyException')} is thrown. In the handler, read ${C('entry.GetDatabaseValuesAsync()')}: <b>store wins</b> — reload and discard the user's edit; <b>client wins</b> — copy database values into ${C('OriginalValues')} and save again; <b>merge</b> — combine per property or show both versions to the user. Retry in a bounded loop. For counters, prefer an atomic ${C('SET x = x + 1')} via ${C('ExecuteUpdate')}.</p>`, followUps: ['Why is optimistic concurrency preferred over pessimistic locking in web apps?', 'How do you do it on PostgreSQL?'] },
    { level: 'A', q: 'When do you need an explicit transaction with EF Core, and how do execution strategies affect it?', a: `<p>A single ${C('SaveChanges')} is already atomic. You need ${C('BeginTransactionAsync')} when several SaveChanges calls, raw SQL (${C('ExecuteSql')}, ${C('ExecuteUpdate')}) or other ADO.NET/Dapper code on the same connection must commit or roll back together; disposing without Commit rolls back. Savepoints allow partial rollback. With a retrying strategy (${C('EnableRetryOnFailure')}), a user transaction cannot be retried piecemeal, so EF throws unless you wrap the whole unit in ${C('db.Database.CreateExecutionStrategy().ExecuteAsync(...)')}, making the block idempotent. Choose isolation levels deliberately and keep transactions short.</p>`, followUps: ['How do you share a transaction between EF Core and Dapper?', 'What does EF do with savepoints when SaveChanges fails inside your transaction?'] },
    { level: 'A', q: 'How do you run raw SQL in EF Core without SQL injection?', a: `<p>Use the interpolated APIs: ${C('FromSql($"... {value}")')} for entities (composable with LINQ, wrapped as a subquery), ${C('Database.SqlQuery<T>($"...")')} for scalars or unmapped types (EF Core 7/8+), and ${C('Database.ExecuteSql($"...")')} for commands. They take a ${C('FormattableString')} and convert each hole into a ${C('DbParameter')}. ${C('FromSqlRaw')}/${C('ExecuteSqlRaw')} take a plain string — safe only with ${C('{0}')} placeholders plus separate arguments or explicit DbParameters; never concatenate user input. Identifiers (table/column names) cannot be parameters, so validate them against a whitelist.</p>`, followUps: ['What are the rules for SQL used with FromSql when composing LINQ on top?', 'How would you call a stored procedure that returns entities?'] },
    { level: 'A', q: 'What are split queries and what are their trade-offs?', a: `<p>By default, Include of collections produces one SQL query with JOINs. With several collections the rows multiply (cartesian explosion) and parent columns are duplicated per child row. ${C('AsSplitQuery()')} (or ${C('UseQuerySplittingBehavior')} globally) sends one query for the root and one per included collection, then stitches them in memory. Trade-offs: more round trips; the queries are not a single snapshot, so concurrent writes can make them inconsistent unless you use a snapshot/serializable transaction; Skip/Take requires a unique, deterministic ordering for the queries to match; and each split query re-runs the root's filter. Use it for multiple collections or wide parents; keep single queries for small reference navigations.</p>`, followUps: ['How many rows does a single query return for 100 posts × 50 tags on one blog?', 'Would a projection be better here?'] },
    { level: 'E', q: 'An endpoint using EF Core is slow under load. Walk through how you would diagnose and fix it.', a: `<p>1) <b>Measure</b>: enable command logging or OpenTelemetry, record commands, rows and duration per request. 2) <b>Too many commands</b> → N+1; fix with Include, projections or batched IN queries. 3) <b>Too many rows/columns</b> → project only needed columns, page with keyset pagination, use split queries for multi-collection Includes. 4) <b>Slow SQL</b> → read execution plans, add indexes, avoid non-sargable predicates, watch parameter sniffing and constants that defeat plan reuse. 5) <b>EF overhead</b> → AsNoTracking for reads, ${C('ExecuteUpdate/Delete')} for set-based changes, compiled queries for very hot paths, context pooling, compiled models for start-up. 6) Re-measure each change and add regression tests that assert command counts.</p>`, followUps: ['How do constants in expression trees affect both EF and the database plan cache?', 'When would you drop to Dapper or raw SQL instead?'] },
    { level: 'E', q: 'How does EF Core order commands in SaveChanges and handle generated keys across related new entities?', a: `<p>EF builds a command for each Added/Modified/Deleted entry and sorts them with a topological sort over foreign-key dependencies: principals are inserted before dependents, dependents deleted before principals. New entities get temporary keys; after a principal's INSERT returns the store-generated key (OUTPUT/RETURNING), EF propagates it to dependents' foreign keys before their INSERT, all within one transaction. Commands are grouped into batches (SQL Server default 42) to reduce round trips. Cycles of required relationships cannot be ordered and fail; self-references are ordered row by row. After success, AcceptAllChanges sets entries to Unchanged and removes Deleted ones.</p>`, followUps: ['How do you break a cycle between two required relationships?', 'What changes when keys are client-generated (e.g. sequential GUIDs)?'] }
  );

  /* Spread correct answers across positions (authored with the correct option first). */
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
    id: 'csharp15',
    title: 'Entity Framework Core',
    lang: 'csharp',
    intro: `<p>Entity Framework Core is the standard way .NET applications talk to relational databases: you write C# classes and LINQ, and EF Core turns them into SQL, tracks what you changed, and saves it in a transaction. It is also a favourite interview topic, because almost every production problem with it — slow pages, lost updates, broken deployments — comes from not knowing what happens underneath.</p>
<p>This module opens the box for EF Core 8/9: the <b>DbContext</b> lifetime, the <b>change tracker</b> and its entity states, <b>migrations</b>, relationships and <b>loading strategies</b> with the N+1 problem, <b>IQueryable vs IEnumerable</b>, <b>raw SQL, transactions and concurrency tokens</b>, and <b>performance</b> tools. EF Core itself needs NuGet packages and a database, so EF code samples are shown for reading; every guided and practice problem is a plain C# 12 model of the mechanism (a change-tracker simulator, an N+1 counter, a migration differ, a rowversion check, an LRU query cache) tested on .NET 8.</p>`,
    goals: [
      'Choose the right DbContext lifetime (scoped, pooled, factory) and avoid thread-safety and captive-dependency bugs',
      'Predict entity states through Add/Attach/Update/Remove/SaveChanges and use AsNoTracking and identity resolution correctly',
      'Create, review and deploy migrations safely (snapshot diff, idempotent scripts, bundles, expand/contract)',
      'Configure relationships, pick eager/explicit/lazy loading or projections, and detect and fix N+1 queries',
      'Know which LINQ runs in SQL and which runs in memory (IQueryable vs IEnumerable, client evaluation)',
      'Use parameterized raw SQL, explicit transactions and optimistic concurrency tokens with conflict resolution',
      'Speed up data access with no-tracking queries, split queries, compiled queries, ExecuteUpdate/Delete, batching and keyset pagination'
    ],
    prereqs: `C# 14 (ASP.NET Core and dependency injection) and SQL 5 (joins, indexes and transactions). LINQ and expression trees from earlier C# modules help.`,
    hours: 16,
    langExplain: `<p>This module is about a .NET library, so all code is C#. EF Core samples need the Microsoft.EntityFrameworkCore packages and a database, so they are shown for reading and not compiled here; the problems model the same mechanisms in plain C# so you can run and test them.</p>`,
    langNotes: {
      csharp: `<p>EF Core 8 targets .NET 8 (LTS); EF Core 9 targets .NET 8 or later. Use the async APIs (${C('ToListAsync')}, ${C('SaveChangesAsync')}) in web apps and always ${C('await')} one call before starting the next on the same context. ${C('decimal')} maps to ${C('decimal(18,2)')} by default — set precision with ${C('HasPrecision')}. Nullable reference types change the model: a non-nullable ${C('string')} property becomes a required (NOT NULL) column. In the problems, ${C('Dictionary')} lookups are O(1) on average, ${C('List.Remove')} is O(n), and ${C('PriorityQueue<TElement, TPriority>')} (.NET 6+) is a min-heap.</p>`
    },
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
