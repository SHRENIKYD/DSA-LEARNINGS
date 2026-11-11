(function () { var topics = [], practice = [], quiz = [], interview = [];

// Scenario problem builder: weak answer, why it fails, strong answer.
function P(o) {
  return {
    title: o.t, level: o.l, tags: o.tags,
    statement: '<p>' + o.s + '</p>',
    constraints: o.c || 'Answer out loud in 2 to 4 minutes. Start with one plain sentence, name the trade-off, and finish with what you would do first.',
    example: o.ex,
    brute: { why: '<p><b>Weak answer:</b> <i>&ldquo;' + o.weak + '&rdquo;</i></p><p><b>Why it fails:</b> ' + o.why + '</p>' },
    mcq: { q: o.q[0], options: o.q[1], answer: o.q[2], explain: o.q[3] },
    hints: ['<p>Hint 1: ' + o.h[0] + '</p>', '<p>Hint 2: ' + o.h[1] + '</p>', '<p>Hint 3: ' + o.h[2] + '</p>'],
    solution: { approach: o.a, complexity: o.cx, followUps: o.f }
  };
}

// Box helper for flow diagrams.
function B(id, label, x, y, w) { var n = { id: id, label: label, x: x, y: y, shape: 'box' }; if (w) n.w = w; return n; }

// ---------- TOPIC 1 ----------
topics.push({
  title: 'Shaping a System: The Design Framework, Monolith vs Microservices, Layers',
  analogy: `<p>Think of a <b>restaurant</b>. A small one has one kitchen where every cook can reach every pot: that is a <b>monolith</b>. As it grows you put up stations (grill, salads, desserts) inside the same kitchen, each with its own tools: that is a <b>modular monolith</b>. A food court has separate stalls, each with its own kitchen, stock and till: those are <b>microservices</b>. Stalls can open and close on their own, but now somebody has to carry orders between them, and a missing ingredient at one stall can hold up a whole meal.</p>`,
  explain: `<p><b>The plain idea:</b> architecture is the set of decisions that are expensive to change later: how the system is split into parts, where the data lives, and how the parts talk. There is no best architecture. There is only the one that fits the <b>constraints</b> (load, team size, budget, deadline, existing stack).</p>
    <p><b>A 7-step way to answer any design question:</b></p>
    <ol>
      <li><b>Clarify</b> what it must do (functional) and how well (non-functional: scale, speed, uptime, security, cost).</li>
      <li><b>Estimate</b> users, requests per second, data size, read to write ratio.</li>
      <li><b>API and data model</b> first: the main entities and the 3 or 4 key queries.</li>
      <li><b>High-level picture</b>: clients, gateway, services, data stores, queues, caches.</li>
      <li><b>Deep dive</b> on the 1 or 2 hardest parts.</li>
      <li><b>Cross-cutting</b>: security, observability (can we see what it is doing), deployment, cost.</li>
      <li><b>Trade-offs</b>: what you chose, what you gave up, what ships first.</li>
    </ol>
    <table><thead><tr><th></th><th>Monolith</th><th>Modular monolith</th><th>Microservices</th></tr></thead><tbody>
      <tr><td>Deploys as</td><td>1 unit</td><td>1 unit, strict modules inside</td><td>many units</td></tr>
      <tr><td>Data</td><td>1 database</td><td>1 database, each module owns its tables</td><td>a database per service</td></tr>
      <tr><td>Hard part</td><td>code tangles as it grows</td><td>keeping module walls honest</td><td>network, data consistency, operations</td></tr>
    </tbody></table>
    <p><b>Layers inside one unit:</b> presentation (controllers) → application (use cases) → domain (business rules) → infrastructure (database, email). In <b>clean architecture</b> the arrows of dependency point inward: the domain knows nothing about the database or the web framework.</p>`,
  clues: ['"Design a system that..." (start with questions, not boxes)', '"Would you use microservices here?"', '"How would you structure the solution / the projects?"', '"What are the non-functional requirements?"', '"Why not just one application?"', '"What would you build first?"'],
  code: { lang: 'csharp', check: false, title: 'Clean architecture: the domain defines the port, infrastructure plugs in', code: `// Domain project: no reference to EF Core, ASP.NET Core or any vendor SDK.
public sealed class Order
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public OrderStatus Status { get; private set; } = OrderStatus.Pending;
    public void Confirm()
    {
        if (Status != OrderStatus.Pending) throw new InvalidOperationException("Only a pending order can be confirmed.");
        Status = OrderStatus.Confirmed;      // the business rule lives here, not in a controller
    }
}
public interface IOrderRepository            // a "port": the domain says what it needs
{
    Task<Order?> FindAsync(Guid id, CancellationToken ct);
    Task SaveAsync(Order order, CancellationToken ct);
}

// Application project: one use case, depends only on the domain.
public sealed class ConfirmOrderHandler(IOrderRepository orders)
{
    public async Task HandleAsync(Guid orderId, CancellationToken ct)
    {
        var order = await orders.FindAsync(orderId, ct) ?? throw new KeyNotFoundException();
        order.Confirm();
        await orders.SaveAsync(order, ct);
    }
}

// Infrastructure project: the "adapter". Only this project knows about EF Core.
public sealed class EfOrderRepository(ShopDbContext db) : IOrderRepository
{
    public Task<Order?> FindAsync(Guid id, CancellationToken ct) => db.Orders.FirstOrDefaultAsync(o => o.Id == id, ct);
    public Task SaveAsync(Order order, CancellationToken ct) => db.SaveChangesAsync(ct);
}

// Web project (composition root) wires them together.
builder.Services.AddScoped<IOrderRepository, EfOrderRepository>();
builder.Services.AddScoped<ConfirmOrderHandler>();` },
  viz: {
    title: 'From one kitchen to a food court: when to split a module out',
    gen: function () {
      var mono = [B('C', 'Browser', 8, 30), B('M', 'Shop app (one deploy)', 42, 30, 30), B('D', 'Shop DB', 85, 30)];
      var mod = [B('C', 'Browser', 8, 30), B('O', 'Orders module', 42, 10, 24), B('K', 'Catalog module', 42, 30, 24), B('P', 'Payments module', 42, 50, 24), B('D', 'Shop DB', 85, 30)];
      var ms = [B('C', 'Browser', 6, 30), B('G', 'API gateway', 26, 30), B('O', 'Orders (module)', 52, 10, 24), B('K', 'Catalog (module)', 52, 30, 24), B('P', 'Payments service', 52, 52, 24), B('D', 'Shop DB', 88, 20), B('PD', 'Payments DB', 88, 52), B('Q', 'Message queue', 70, 38)];
      return [
        { narr: '<b>Step 1, monolith.</b> One app, one database, one deploy. For a 5-person team this is the fastest way to ship. Nothing is wrong with it yet.', parts: [{ type: 'graph', directed: true, height: 60, nodes: mono, edges: [['C', 'M', 'HTTPS'], ['M', 'D', 'SQL']], hl: { M: 'ok' } }] },
        { narr: '<b>The pain starts.</b> Any class can call any other class. A change in payments breaks the catalog. Every release needs the whole team to test everything.', parts: [{ type: 'graph', directed: true, height: 60, nodes: mono, edges: [['C', 'M', 'HTTPS'], ['M', 'D', 'SQL']], hl: { M: 'bad' }, tags: { M: 'tangled' } }] },
        { narr: '<b>Step 2, modular monolith.</b> Same single deploy, but 3 modules with walls: each has a public interface and owns its own tables. Other modules may not touch those tables.', parts: [{ type: 'graph', directed: true, height: 60, nodes: mod, edges: [['C', 'O'], ['C', 'K'], ['C', 'P'], ['O', 'D'], ['K', 'D'], ['P', 'D']], hl: { O: 'ok', K: 'ok', P: 'ok' } }] },
        { narr: '<b>Modules talk through interfaces only.</b> Orders asks Payments to charge through a small contract, not by reading its tables. This is the cheap rehearsal for a later split.', parts: [{ type: 'graph', directed: true, height: 60, nodes: mod, edges: [['C', 'O'], ['O', 'P', 'IPayments'], ['O', 'D'], ['K', 'D'], ['P', 'D']], hl: { O: 'cur', P: 'cur' }, ehl: { 'O-P': 'ok' } }] },
        { narr: '<b>A real reason to split appears.</b> Payments must release daily for compliance fixes, needs stricter security review, and has its own team. That is 3 honest reasons: release pace, risk isolation, ownership.', parts: [{ type: 'table', label: 'Reasons to extract a service', columns: ['Reason', 'Present for Payments?'], rows: [['Needs to scale on its own', 'no'], ['Needs its own release pace', 'yes'], ['Needs its own team', 'yes'], ['Needs fault or security isolation', 'yes'], ['"Microservices are modern"', 'not a reason']], hl: { 1: 'ok', 2: 'ok', 3: 'ok', 4: 'bad' } }] },
        { narr: '<b>Step 3, extract only Payments.</b> It gets its own deploy and its own database. The interface from step 2 becomes an HTTP or message contract. Orders and Catalog stay together.', parts: [{ type: 'graph', directed: true, height: 64, nodes: ms, edges: [['C', 'G'], ['G', 'O'], ['G', 'K'], ['O', 'D'], ['K', 'D'], ['O', 'Q', 'ChargeRequested'], ['Q', 'P'], ['P', 'PD']], hl: { P: 'sel', PD: 'sel' }, ehl: { 'O-Q': 'ok', 'Q-P': 'ok' } }] },
        { narr: '<b>The bill for the split.</b> You now own a network hop that can fail, 2 databases that can disagree for a moment, 2 pipelines, and tracing across both. That cost is why you split one module at a time, with a reason.', parts: [{ type: 'table', label: 'What the split costs', columns: ['New problem', 'Answer'], rows: [['The call can time out', 'timeouts, retries, circuit breaker'], ['Data can disagree briefly', 'saga + outbox, idempotent handlers'], ['Hard to follow one request', 'correlation ID + distributed tracing'], ['Contract changes break callers', 'versioned, backwards compatible contracts']], hl: { 0: 'cur', 1: 'cur', 2: 'cur', 3: 'cur' } }] }
      ];
    }
  },
  examples: [
    { title: 'Clarifying questions for "design a booking system"', html: `<p>Before drawing anything, ask 5 things: Who books (public users or staff)? How many bookings per day and what is the busiest minute? Can 2 people ever get the same slot (no, so that part needs strong consistency)? Do we take payment? What uptime is promised? The answers decide the design. 200 bookings a day needs one app and one database. 2,000 bookings a second on a ticket sale needs a queue and a reservation step.</p>` },
    { title: 'Quick sizing with round numbers', html: `<p>1 million users a day, each making 10 requests = 10 million requests a day. A day has about 100,000 seconds (86,400), so that is about <b>100 requests per second</b> on average. Peak is often 5 to 10 times the average, so plan for about 1,000 per second. If each order row is 1 KB and you store 1 million orders a day, that is 1 GB a day, about 365 GB a year. Round numbers are fine. The interviewer wants to see that the numbers drive your choices.</p>` },
    { title: 'Where does this rule go? A layering check', html: `<p>Rule: "an order above 10,000 needs manager approval". If it sits in a controller, the mobile API and the batch import will each need their own copy. If it sits in a stored procedure, it is hard to unit test. Put it in the <b>domain</b> (the Order class or a domain service). Then every entry point gets the rule for free and one fast test covers it.</p>` }
  ],
  deepDive: `<p><b>Modular monolith in practice.</b> In .NET, make each module its own set of projects (Orders.Api, Orders.Application, Orders.Domain, Orders.Infrastructure), expose only a small public contract, and mark the rest <code>internal</code>. Give each module its own database schema and its own <code>DbContext</code>. Add architecture tests (for example with NetArchTest or ArchUnitNET) that fail the build when Orders references Payments internals. Without an automatic check the walls rot within months.</p>
    <p><b>The distributed monolith trap.</b> If services share a database, must be deployed together, or call each other in long synchronous chains, you have the cost of microservices and the coupling of a monolith. Signs: a "simple" change touches 4 repositories, and one slow service makes every page slow.</p>
    <p><b>Conway's law.</b> Systems end up shaped like the teams that build them. 3 teams will tend to produce 3 parts. Use this on purpose: draw service boundaries around business capabilities that one team can own end to end.</p>
    <p><b>Clean vs layered.</b> Classic layers let the business layer depend on the data layer. Clean, hexagonal and onion architecture all flip that: the domain defines interfaces and the outer layers implement them (dependency inversion). The gain is testability and the freedom to swap the database or framework. The cost is more projects and more mapping, which is overkill for a small CRUD screen (create, read, update, delete).</p>`,
  aiEra: `<p><b>What AI changes:</b> an assistant can sketch a reasonable high-level design, list non-functional requirements and write the first ADR draft in minutes. That removes the blank page, not the judgment.</p>
    <p><b>Use it as a partner:</b> ask <code>List 10 clarifying questions for a booking system design, grouped by scale, consistency and security</code>, or <code>Argue against splitting payments into its own service</code>. Getting the opposite view is the valuable part.</p>
    <p><b>Where it goes wrong:</b> it reaches for microservices, Kafka and Kubernetes for a system with 200 users, because those words are common in its training text. It also does not know your team size, budget or the skills you already have.</p>
    <p><b>What you still own:</b> the constraints, the numbers, the choice, and the sentence "we chose X and gave up Y because Z".</p>`,
  problems: [P({
    t: 'The team wants microservices for a 6-person product', l: 'Medium', tags: ['monolith', 'microservices', 'trade-offs'],
    s: 'You join as tech lead of a 6-developer team that runs an online shop as one ASP.NET Core application with one SQL database. Releases are slow because every change needs a full regression test. Two senior developers propose rewriting it as 12 microservices. The interviewer asks: what do you do?',
    ex: '<p>Good answers name the <b>actual problem</b> (slow, risky releases), not the fashionable cure. Example opening: "The pain is release risk, so I would first ask what causes it. Tangled code and missing tests are fixed by module boundaries and automated tests, not by a network."</p>',
    weak: 'Microservices are the industry standard, so yes, we should rewrite. It will take about a year but then we will be scalable.',
    why: 'it treats a pattern as a goal, proposes a stop-the-world rewrite, and never checks whether 6 people can run 12 pipelines, 12 databases and distributed tracing. It names no trade-off.',
    q: ['Which signal is the strongest reason to extract one module into its own service?', ['The codebase is more than 100,000 lines', 'That module needs a different release pace, scale or owner than the rest', 'A conference talk recommended it', 'The team wants to try a new language'], 1, 'Independent release cadence, independent scaling, fault isolation and team ownership are the real reasons. Size alone and fashion are not.'],
    h: ['Ask what hurts today. Is it deployment, scaling, or tangled code? Each has a different cure.', 'A modular monolith fixes tangled code without adding a network. Think about what makes the walls enforceable.', 'Recipe: name the problem, propose modules plus tests plus a faster pipeline, define the measurable reasons that would justify extracting one service later, and write it down as an ADR.'],
    a: '<p><b>Strong answer:</b> "I would start from the problem, which is slow and risky releases, not from the pattern. I would measure where release time goes: usually manual regression and code where everything depends on everything. So step 1 is a modular monolith: 4 or 5 modules by business capability, each owning its tables, talking through small interfaces, with architecture tests that fail the build if a wall is crossed, plus automated tests and a pipeline that deploys in minutes. That gives most of the benefit with no new network failures. Step 2: I would write down the triggers for a split, such as a module that needs its own scaling, release pace or team. When one module meets them, we extract that one, with the interface we already have. I would record this in an ADR and review it in 3 months. For 6 people, 12 services means more pipelines than developers, and I would say that openly."</p>',
    cx: '<p><b>What the interviewer scores:</b> problem before pattern, a step-by-step path instead of a rewrite, clear triggers for change, and respect for the people who proposed the idea.</p>',
    f: ['The two seniors still disagree. How do you close the decision?', 'Which module would you extract first, and why?', 'How do you stop modules from quietly sharing tables?']
  })]
});

// ---------- TOPIC 2 ----------
topics.push({
  title: 'Data Across Services: Messaging, Consistency, Saga, Outbox, CQRS',
  analogy: `<p>Booking a holiday means 3 separate bookings: flight, hotel, car. No single clerk can lock all 3 companies at once. So you book them one by one, and if the hotel is full you <b>cancel the flight</b> you already booked. That is a <b>saga</b>: a chain of small local steps, each with an "undo" step. And the travel agent who writes "send confirmation" in the same notebook line as the booking, so it can never be forgotten, is the <b>outbox</b>.</p>`,
  explain: `<p><b>The plain idea:</b> inside one database a transaction keeps everything correct. Across services there is no shared transaction, so you need other tools.</p>
    <table><thead><tr><th>Style</th><th>Examples</th><th>Use when</th></tr></thead><tbody>
      <tr><td>Synchronous request and response</td><td>REST, gRPC, GraphQL</td><td>the caller needs the answer now</td></tr>
      <tr><td>Asynchronous messages (queues)</td><td>Azure Service Bus, RabbitMQ</td><td>work can wait, load comes in spikes, retries matter</td></tr>
      <tr><td>Events (publish and subscribe)</td><td>Event Grid, Kafka, Service Bus topics</td><td>many parts react to one fact</td></tr>
      <tr><td>Batch and streaming</td><td>Data Factory, Event Hubs, Spark</td><td>analytics and bulk data movement</td></tr>
    </tbody></table>
    <ul>
      <li><b>CAP theorem:</b> when the network splits, a distributed store must pick: refuse some requests to stay <b>consistent</b>, or keep answering and risk stale data (<b>available</b>).</li>
      <li><b>Eventual consistency:</b> copies agree after a short delay. Fine for a product feed, not for a bank balance.</li>
      <li><b>Saga:</b> a sequence of local transactions with compensating (undo) steps.</li>
      <li><b>Outbox:</b> save the data and the message to send in one local transaction, publish later.</li>
      <li><b>Idempotent:</b> doing it twice has the same effect as doing it once. Needed because messages can arrive twice.</li>
      <li><b>CQRS:</b> one model for writes (commands), another shaped for reads (queries).</li>
      <li><b>Event sourcing:</b> store every change as an event and rebuild the current state by replaying them.</li>
    </ul>`,
  clues: ['"How do you keep data consistent across services?"', '"What if the payment succeeds but the order update fails?"', '"What happens if the message is delivered twice?"', '"Can you guarantee exactly-once?"', '"Reads are 100 times more frequent than writes"', '"We need a full audit history of every change"', '"The user clicked Pay twice"'],
  code: [
    { lang: 'csharp', check: false, title: 'Orchestrated saga with compensation (Azure Durable Functions, isolated worker)', code: `[Function(nameof(OrderSaga))]
public static async Task OrderSaga([OrchestrationTrigger] TaskOrchestrationContext ctx)
{
    var order = ctx.GetInput<OrderRequest>()!;
    var undo = new Stack<Func<Task>>();           // compensations, newest on top
    try
    {
        await ctx.CallActivityAsync(nameof(Steps.ReserveStock), order);
        undo.Push(() => ctx.CallActivityAsync(nameof(Steps.ReleaseStock), order));

        await ctx.CallActivityAsync(nameof(Steps.ChargePayment), order);
        undo.Push(() => ctx.CallActivityAsync(nameof(Steps.RefundPayment), order));

        await ctx.CallActivityAsync(nameof(Steps.ConfirmOrder), order);
    }
    catch (TaskFailedException)
    {
        while (undo.TryPop(out var compensate)) await compensate();   // undo in reverse order
        await ctx.CallActivityAsync(nameof(Steps.CancelOrder), order);
    }
}` },
    { lang: 'csharp', check: false, title: 'Transactional outbox with EF Core + an idempotent consumer', code: `// WRITE SIDE: the order and the "message to send" commit together or not at all.
await using var tx = await db.Database.BeginTransactionAsync(ct);
db.Orders.Add(order);
db.Outbox.Add(new OutboxMessage
{
    Id = Guid.NewGuid(),
    Type = "OrderCreated",
    Payload = JsonSerializer.Serialize(new OrderCreated(order.Id, order.Total)),
    CreatedUtc = DateTime.UtcNow
});
await db.SaveChangesAsync(ct);
await tx.CommitAsync(ct);
// A background worker reads unsent outbox rows, publishes them to the broker,
// then marks them as sent. If it crashes after publishing, it publishes again: at-least-once.

// READ SIDE: the consumer remembers which message IDs it has already handled.
public async Task HandleAsync(OrderCreated evt, Guid messageId, CancellationToken ct)
{
    if (await db.ProcessedMessages.AnyAsync(m => m.Id == messageId, ct)) return;  // duplicate: do nothing
    db.Invoices.Add(Invoice.For(evt.OrderId, evt.Total));
    db.ProcessedMessages.Add(new ProcessedMessage { Id = messageId });
    await db.SaveChangesAsync(ct);   // one transaction; a unique key on Id stops a race between two copies
}` }
  ],
  viz: {
    title: 'Order saga: the happy path, then a payment failure with compensation',
    gen: function () {
      var n = [B('OR', 'Orchestrator', 50, 8, 22), B('O', 'Orders', 12, 40), B('S', 'Stock', 38, 40), B('P', 'Payments', 64, 40), B('N', 'Email', 90, 40)];
      function f(narr, edges, hl, ehl, tags, rows, rh) {
        return { narr: narr, parts: [{ type: 'graph', directed: true, height: 52, nodes: n, edges: edges, hl: hl, ehl: ehl || {}, tags: tags || {} }, { type: 'table', label: 'Saga state (stored durably)', columns: ['Step', 'Status'], rows: rows, hl: rh || {} }] };
      }
      return [
        f('A customer places an order. The <b>orchestrator</b> will tell each service what to do, one local transaction at a time. Its progress is saved, so a crash does not lose the saga.', [], { OR: 'cur' }, {}, {}, [['1 CreateOrder', 'waiting'], ['2 ReserveStock', 'waiting'], ['3 ChargePayment', 'waiting'], ['4 ConfirmOrder', 'waiting']]),
        f('<b>Step 1.</b> Orders saves the order as <b>Pending</b>. This is a normal local transaction in the Orders database.', [['OR', 'O', 'CreateOrder']], { O: 'ok' }, { 'OR-O': 'ok' }, { O: 'Pending' }, [['1 CreateOrder', 'done'], ['2 ReserveStock', 'waiting'], ['3 ChargePayment', 'waiting'], ['4 ConfirmOrder', 'waiting']], { 0: 'ok' }),
        f('<b>Step 2.</b> Stock reserves 1 item. The orchestrator notes the matching undo: <b>ReleaseStock</b>.', [['OR', 'S', 'ReserveStock']], { O: 'done', S: 'ok' }, { 'OR-S': 'ok' }, { O: 'Pending', S: 'reserved' }, [['1 CreateOrder', 'done'], ['2 ReserveStock', 'done (undo: ReleaseStock)'], ['3 ChargePayment', 'waiting'], ['4 ConfirmOrder', 'waiting']], { 1: 'ok' }),
        f('<b>Step 3 fails.</b> The card is declined. There is no global rollback to call: steps 1 and 2 are already committed in 2 different databases.', [['OR', 'P', 'ChargePayment']], { O: 'done', S: 'done', P: 'bad' }, { 'OR-P': 'bad' }, { P: 'declined' }, [['1 CreateOrder', 'done'], ['2 ReserveStock', 'done (undo: ReleaseStock)'], ['3 ChargePayment', 'FAILED'], ['4 ConfirmOrder', 'skipped']], { 2: 'bad' }),
        f('<b>Compensate step 2.</b> Undo runs in reverse order. Stock releases the item. This is a new business action, not a database rollback.', [['OR', 'S', 'ReleaseStock']], { S: 'cur', P: 'bad' }, { 'OR-S': 'cur' }, { S: 'released' }, [['1 CreateOrder', 'done'], ['2 ReserveStock', 'compensated'], ['3 ChargePayment', 'FAILED'], ['4 ConfirmOrder', 'skipped']], { 1: 'cur' }),
        f('<b>Compensate step 1.</b> Orders marks the order <b>Cancelled</b>. The row is kept, so support can see what happened.', [['OR', 'O', 'CancelOrder']], { O: 'cur', P: 'bad' }, { 'OR-O': 'cur' }, { O: 'Cancelled' }, [['1 CreateOrder', 'compensated (Cancelled)'], ['2 ReserveStock', 'compensated'], ['3 ChargePayment', 'FAILED'], ['4 ConfirmOrder', 'skipped']], { 0: 'cur' }),
        f('<b>Tell the customer.</b> Some things cannot be undone. If a "thank you" email had already gone out, the compensation is a second, correcting email.', [['OR', 'N', 'PaymentFailed email']], { N: 'sel' }, { 'OR-N': 'sel' }, {}, [['1 CreateOrder', 'compensated (Cancelled)'], ['2 ReserveStock', 'compensated'], ['3 ChargePayment', 'FAILED'], ['4 ConfirmOrder', 'skipped'], ['Notify customer', 'done']], { 4: 'sel' }),
        f('<b>What makes it safe.</b> Every step and every undo must be <b>idempotent</b>, because the orchestrator retries after a timeout and may send the same command twice. ReleaseStock for an already released item must do nothing.', [['OR', 'S', 'ReleaseStock (retry)']], { S: 'ok' }, { 'OR-S': 'ok' }, { S: 'no change' }, [['Rule 1', 'each step is a local transaction'], ['Rule 2', 'each step has a compensation'], ['Rule 3', 'steps and compensations are idempotent'], ['Rule 4', 'saga state is persisted, with timeouts']], { 2: 'ok' })
      ];
    }
  },
  examples: [
    { title: 'The dual write problem in 2 lines', html: `<p>Code saves an order, then publishes "OrderCreated". If the app crashes between the 2 lines, the order exists but nobody was told, so no invoice and no email. Swap the lines and you get the opposite: an email about an order that was never saved. You cannot fix this with a try/catch, because a crash skips the catch. The fix is the <b>outbox</b>: write the message as a row in the same database transaction, and let a separate worker publish it.</p>` },
    { title: 'Idempotency key on a payment API', html: `<p>The browser sends <code>POST /payments</code> with header <code>Idempotency-Key: 7f3a...</code>. The network drops the reply, so the browser retries with the <b>same key</b>. The server finds the key in its table, sees the first attempt succeeded, and returns the stored result without charging again. The key is generated by the client once per user action, and the server stores key + result with a unique index.</p>` },
    { title: 'CQRS without the hype', html: `<p>A shop's order screen writes to normalised tables (orders, lines, payments). The "my orders" page needs a flat list with product names, totals and status, read 100 times more often than orders are written. Simple CQRS: commands go through the domain model and EF Core, queries use a hand-written SQL view or a denormalised read table through Dapper. Same database, 2 code paths. You only add a separate read store when one database truly cannot serve both.</p>` }
  ],
  deepDive: `<p><b>CAP in real life.</b> Network partitions are rare, so the everyday trade-off is latency against consistency (the PACELC extension): waiting for all replicas to confirm is safer but slower. Azure Cosmos DB exposes this as 5 consistency levels from strong to eventual, with session consistency (you always read your own writes) as the default.</p>
    <p><b>Why not two-phase commit (2PC)?</b> 2PC asks every participant to prepare, then commit. It holds locks while it waits, and if the coordinator dies, participants are stuck. Most message brokers and HTTP APIs do not support it at all, so sagas replaced it for cross-service work.</p>
    <p><b>Exactly-once is a myth at the network level.</b> A sender cannot tell "the message was lost" from "the reply was lost", so it must resend, which gives at-least-once delivery. What you can build is <b>exactly-once effect</b>: at-least-once delivery plus an idempotent consumer. Broker features help (Service Bus duplicate detection, Kafka idempotent producers and transactions) but only inside their own boundary.</p>
    <p><b>Ordering.</b> Queues do not promise global order once you have competing consumers. Use Service Bus sessions or a Kafka partition key (for example the order ID) to keep the events of one entity in order, and carry a version number so a consumer can ignore an older event.</p>
    <p><b>Event sourcing costs.</b> Events live forever, so changing their shape needs versioning or upcasting. Read models are projections that lag slightly. Long streams need snapshots. Personal data in an immutable log needs a plan for erasure requests.</p>`,
  aiEra: `<p><b>What AI changes:</b> assistants write saga orchestrators, outbox tables and consumer boilerplate quickly, and they are good at listing failure cases you forgot when you ask <code>List every way this checkout flow can end up half done</code>.</p>
    <p><b>Where it goes wrong:</b> generated code often publishes the message right after <code>SaveChanges</code> (a dual write), retries calls that are not idempotent, or claims a broker gives exactly-once end to end. It also forgets that compensation is a business action.</p>
    <p><b>AI features are distributed systems too:</b> a model call is slow, can time out and can be retried, so an agent that "creates a record" needs the same idempotency key and confirm step as a payment.</p>
    <p><b>What you still own:</b> deciding which data must be strongly consistent, and proving by a test that a duplicate message does no harm.</p>`,
  problems: [P({
    t: 'The customer was charged twice', l: 'Hard', tags: ['idempotency', 'outbox', 'retries'],
    s: 'An online shop has an Orders service and a Payments service. Support reports that about 1 in 2,000 customers is charged twice. Logs show the checkout page retried a payment call after a 10 second timeout. The interviewer asks: explain why this happens and how you would fix it for good.',
    ex: '<p>Timeline: the browser sends the charge, Payments charges the card in 11 seconds, the browser gave up at 10 seconds and sent the request again. Both requests were valid, so both charged. Nothing "crashed".</p>',
    weak: 'I would increase the timeout to 60 seconds and disable the retry so it cannot happen again.',
    why: 'a longer timeout only makes the window smaller, and removing retries turns double charges into lost orders. It treats the symptom and ignores that any network call can be repeated.',
    q: ['A caller times out waiting for a reply. What does the caller know for sure?', ['The request never arrived', 'The request arrived but failed', 'Nothing: the work may or may not have been done', 'The server is down'], 2, 'A timeout only says the reply did not arrive in time. The work may have completed, which is exactly why retried operations must be idempotent.'],
    h: ['A timeout is not a failure. Ask what the server did with the first request.', 'Give each user action one unique key that travels with every retry, and make the server remember it.', 'Recipe: client-generated Idempotency-Key, unique index on the key in Payments, store the result and return it on a repeat, pass the same key to the card provider, add a metric for duplicate keys seen.'],
    a: '<p><b>Strong answer:</b> "A timeout does not mean the charge failed, only that the reply was late. The retry was a second valid request, so we charged twice. The fix is to make the charge <b>idempotent</b>. The checkout page creates one key per click on Pay and sends it as an Idempotency-Key header on every attempt. Payments stores the key with a unique index before calling the card provider. If the key already exists, it returns the stored result, or \'in progress\' if the first attempt is still running. I would pass the same key to the card provider, since most providers support one. Between Orders and Payments I would use the outbox pattern so a saved order always produces exactly one payment request message, and Payments records processed message IDs. Then I would keep the retry, with backoff, because now it is safe. Finally I would add a test that sends the same request twice and asserts one charge, refund the affected customers, and add an alert on duplicate keys."</p>',
    cx: '<p><b>What the interviewer scores:</b> the insight that timeouts are ambiguous, idempotency at the server (not only in the browser), keeping retries, a test that proves it, and care for the customers already affected.</p>',
    f: ['How long do you keep idempotency keys?', 'Two requests with the same key arrive at the same millisecond. What happens?', 'What if the same key arrives with a different amount?']
  })]
});

// ---------- TOPIC 3 ----------
topics.push({
  title: 'Staying Up Under Load: Resilience, Caching, Scale, Observability, Security',
  analogy: `<p>Think of the <b>electrics in a house</b>. A <b>fuse box</b> cuts one faulty circuit so the whole house does not burn: that is a <b>circuit breaker</b>. Separate circuits for the kitchen and the bedrooms mean a broken kettle does not switch off your lights: that is a <b>bulkhead</b>. Keeping milk in the fridge instead of walking to the shop for every cup of tea is a <b>cache</b>. And the meter on the wall that shows what is being used right now is <b>observability</b>.</p>`,
  explain: `<p><b>The plain idea:</b> in production, things fail and load arrives in spikes. A good design expects both.</p>
    <table><thead><tr><th>Resilience pattern</th><th>What it does</th></tr></thead><tbody>
      <tr><td>Timeout</td><td>never wait forever for a reply</td></tr>
      <tr><td>Retry with backoff and jitter</td><td>try again after a growing, slightly random wait; only for safe (idempotent) calls</td></tr>
      <tr><td>Circuit breaker</td><td>after repeated failures, stop calling for a while and fail fast</td></tr>
      <tr><td>Bulkhead</td><td>give each dependency its own limited pool so one cannot drain everything</td></tr>
      <tr><td>Fallback</td><td>return cached or partial data instead of an error</td></tr>
      <tr><td>Rate limiting</td><td>refuse extra requests with HTTP 429 to protect the system</td></tr>
      <tr><td>Queue-based load levelling</td><td>put work in a queue so a spike is processed at a steady pace</td></tr>
      <tr><td>Health checks</td><td>let the platform detect and replace a sick instance</td></tr>
    </tbody></table>
    <ul>
      <li><b>Caching:</b> cache-aside (check the cache, on a miss load from the database and store it), with a time to live (TTL) so data expires.</li>
      <li><b>Scaling:</b> <i>up</i> = a bigger machine, <i>out</i> = more machines. Scaling out needs <b>stateless</b> services: no user session kept in one server's memory.</li>
      <li><b>Observability:</b> 3 signals. <b>Logs</b> (what happened), <b>metrics</b> (how much, how fast), <b>traces</b> (the path of one request across services).</li>
      <li><b>Security:</b> who are you (authentication), what may you do (authorization), least privilege, encrypt in transit and at rest, no secrets in code.</li>
    </ul>`,
  clues: ['"What happens when the payment provider is slow?"', '"The site falls over every time marketing sends an email"', '"How would you scale this to 10 times the traffic?"', '"The data on the page is stale"', '"How would you find out why one request was slow?"', '"What would you alert on?"', '"Where do you keep the connection strings?"'],
  code: [
    { lang: 'csharp', check: false, title: 'Resilience and caching in ASP.NET Core (.NET 10)', code: `// 1) One line adds a rate limiter, total timeout, retry with backoff + jitter,
//    circuit breaker and per-attempt timeout (Microsoft.Extensions.Http.Resilience, built on Polly v8).
builder.Services.AddHttpClient<PaymentsClient>(c => c.BaseAddress = new Uri("https://payments.internal"))
       .AddStandardResilienceHandler();

// 2) HybridCache: in-memory first level + distributed second level (Redis),
//    and it protects against a stampede: concurrent callers for one key share one load.
builder.Services.AddStackExchangeRedisCache(o => o.Configuration = builder.Configuration["Redis"]);
builder.Services.AddHybridCache();

public sealed class ProductService(HybridCache cache, ShopDbContext db)
{
    public async Task<Product?> GetAsync(Guid id, CancellationToken ct) =>
        await cache.GetOrCreateAsync(
            "product:" + id,                                   // key includes the id
            async token => await db.Products.AsNoTracking().FirstOrDefaultAsync(p => p.Id == id, token),
            new HybridCacheEntryOptions { Expiration = TimeSpan.FromMinutes(5) },
            cancellationToken: ct);

    public async Task RenameAsync(Guid id, string name, CancellationToken ct)
    {
        await db.Products.Where(p => p.Id == id).ExecuteUpdateAsync(s => s.SetProperty(p => p.Name, name), ct);
        await cache.RemoveAsync("product:" + id, ct);            // invalidate after the write
    }
}` },
    { lang: 'csharp', title: 'Token bucket rate limiter, the idea in plain C#', code: `using System;

public class TokenBucket
{
    private readonly int _capacity;          // most tokens the bucket can hold (the burst size)
    private readonly double _refillPerSec;   // tokens added each second (the steady rate)
    private double _tokens;
    private DateTime _last;

    public TokenBucket(int capacity, double refillPerSec, DateTime now)
    {
        _capacity = capacity;
        _refillPerSec = refillPerSec;
        _tokens = capacity;                  // start full
        _last = now;
    }

    // Returns true if the request may pass, false if the caller should get HTTP 429.
    public bool TryTake(DateTime now)
    {
        double seconds = (now - _last).TotalSeconds;
        _tokens = Math.Min(_capacity, _tokens + seconds * _refillPerSec);   // refill for the time that passed
        _last = now;
        if (_tokens < 1) return false;       // empty: reject
        _tokens -= 1;                        // spend one token
        return true;
    }
}

public static class Demo
{
    public static void Main()
    {
        DateTime t = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        TokenBucket bucket = new TokenBucket(3, 1.0, t);     // burst of 3, then 1 per second
        for (int i = 0; i < 5; i++) Console.WriteLine("t=0s request " + (i + 1) + ": " + bucket.TryTake(t));
        Console.WriteLine("t=2s request 6: " + bucket.TryTake(t.AddSeconds(2)));
    }
}` }
  ],
  viz: {
    title: 'Circuit breaker + cache fallback when the catalog service slows down',
    gen: function () {
      var n = [B('U', 'Users', 6, 30), B('A', 'Shop API', 30, 30), B('R', 'Cache (Redis)', 58, 8, 22), B('K', 'Catalog service', 62, 48, 24), B('D', 'Catalog DB', 92, 48)];
      function f(narr, edges, hl, ehl, tags, state, fails, cls) {
        var h = {}; h.breaker = cls;
        return { narr: narr, parts: [{ type: 'graph', directed: true, height: 60, nodes: n, edges: edges, hl: hl, ehl: ehl || {}, tags: tags || {} }, { type: 'vars', label: 'Circuit breaker for Catalog', vals: { breaker: state, 'failures in window': fails }, hl: h }] };
      }
      return [
        f('<b>Normal day.</b> The API looks in the cache first (cache-aside). A <b>hit</b> returns in about 2 ms and never touches the catalog service.', [['U', 'A'], ['A', 'R', 'get product:42']], { R: 'ok' }, { 'A-R': 'ok' }, { R: 'hit' }, 'Closed (calls allowed)', 0, 'ok'),
        f('<b>Cache miss.</b> The key expired. The API calls the catalog service, gets the product, and stores it with a 5 minute TTL.', [['U', 'A'], ['A', 'R', 'miss'], ['A', 'K', 'GET /products/42'], ['K', 'D']], { R: 'cur', K: 'ok', D: 'ok' }, { 'A-K': 'ok', 'K-D': 'ok' }, { R: 'miss then set' }, 'Closed (calls allowed)', 0, 'ok'),
        f('<b>The catalog DB gets slow.</b> Calls now take 30 seconds. Without a <b>timeout</b>, every API thread would sit waiting and the whole shop would freeze.', [['U', 'A'], ['A', 'K', 'waiting...'], ['K', 'D', 'slow']], { K: 'bad', D: 'bad' }, { 'A-K': 'bad', 'K-D': 'bad' }, { K: '30 s' }, 'Closed (calls allowed)', 1, 'cur'),
        f('<b>Timeout + retry.</b> The call is cut at 2 seconds and retried with backoff (wait 200 ms, 400 ms, 800 ms, each with a little random jitter). Still failing. Retries alone add more load to a sick service.', [['U', 'A'], ['A', 'K', 'retry x3']], { K: 'bad' }, { 'A-K': 'bad' }, { K: 'timeouts' }, 'Closed (calls allowed)', 6, 'cur'),
        f('<b>The breaker opens.</b> Too many failures in the window. For the next 30 seconds the API does not call the catalog at all. It fails in 1 ms instead of 2 seconds, and the catalog gets room to recover.', [['U', 'A']], { K: 'bad', A: 'cur' }, {}, { K: 'not called' }, 'OPEN (fail fast)', 12, 'bad'),
        f('<b>Fallback.</b> While the breaker is open, the API serves the last known product data from the cache, marked as possibly stale. Users can still browse. Checkout shows live stock only.', [['U', 'A'], ['A', 'R', 'stale copy']], { R: 'sel', K: 'bad' }, { 'A-R': 'sel' }, { R: 'fallback' }, 'OPEN (fail fast)', 12, 'bad'),
        f('<b>Half-open.</b> After 30 seconds the breaker lets 1 test call through. If it fails, the breaker opens again. If it works, normal traffic resumes.', [['U', 'A'], ['A', 'K', '1 probe call'], ['K', 'D']], { K: 'cur', D: 'cur' }, { 'A-K': 'cur' }, { K: 'probe' }, 'Half-open (probing)', 0, 'cur'),
        f('<b>Recovered.</b> The probe succeeded, so the breaker closes. An alert already told the team, because the error rate and latency metrics crossed their threshold while this was happening.', [['U', 'A'], ['A', 'K', 'GET /products/42'], ['K', 'D']], { K: 'ok', D: 'ok' }, { 'A-K': 'ok', 'K-D': 'ok' }, {}, 'Closed (calls allowed)', 0, 'ok')
      ];
    }
  },
  examples: [
    { title: 'Backoff with jitter, with numbers', html: `<p>Plain retry: 1,000 clients all fail at 12:00:00 and all retry at exactly 12:00:01. The recovering service gets hit by the same wave again. Exponential backoff spaces attempts at 1 s, 2 s, 4 s. <b>Jitter</b> adds a random part, so client A waits 0.7 s and client B waits 1.4 s. The wave is spread into a trickle. Rule: retry only timeouts, HTTP 429 and 5xx errors (transient faults). Never retry a 400 or 404, and never retry a call that is not idempotent.</p>` },
    { title: 'Cache stampede on a hot key', html: `<p>The home page's "top products" key expires. In the next 50 ms, 500 requests all miss, and all 500 run the same heavy query. The database stalls. 3 fixes: (1) let only one request rebuild the value while the others wait for it (request coalescing, which <code>HybridCache</code> does for you), (2) add random jitter to TTLs so keys do not all expire together, (3) refresh hot keys in the background before they expire.</p>` },
    { title: 'Following one slow request', html: `<p>A user reports "checkout was slow at 14:02". The error page showed correlation ID <code>c81d</code>. You search the logs for that ID and open its trace: API 40 ms, Orders 60 ms, Payments <b>4,100 ms</b>. Inside Payments, the span for the card provider call took 4,050 ms. In 2 minutes you know it was the external provider, not your code. That only works if every service passes on the W3C <code>traceparent</code> header and writes structured logs with the same ID.</p>` }
  ],
  deepDive: `<p><b>Caching layers and strategies.</b> Layers from the user inward: browser, CDN, API gateway, in-process memory (<code>IMemoryCache</code>), distributed cache (Redis), database buffer. Strategies: cache-aside (the app manages it), read-through and write-through (the cache layer loads and writes for you), write-behind (write to the cache now, flush to the database later, with a risk of loss). For HTTP, use <code>Cache-Control</code>, and <code>ETag</code> with <code>If-None-Match</code> so an unchanged resource returns 304 with no body. Pitfalls: stale data, stampedes, hot keys, caching per-user data under a shared key, and cache poisoning.</p>
    <p><b>Database scaling order.</b> Fix queries and indexes first. Then cache. Then read replicas (accept replica lag). Then archive old data. Only then partition or shard by a key such as tenant ID, because sharding makes cross-shard queries and transactions hard.</p>
    <p><b>Metrics and SLOs.</b> For services use <b>RED</b>: rate, errors, duration. For resources use <b>USE</b>: utilisation, saturation, errors. An <b>SLI</b> is what you measure (share of requests under 300 ms), an <b>SLO</b> is the target (99.9% over 30 days), an <b>SLA</b> is the contract with a penalty. 99.9% allows about 43 minutes of downtime in a 30 day month. Alert on symptoms users feel (fast burn of the error budget), not on every CPU spike. OpenTelemetry is the vendor-neutral standard for all 3 signals and is built into .NET.</p>
    <p><b>Security checklist.</b> OpenID Connect sign-in with Microsoft Entra ID, role or attribute based authorization checked per resource, TLS everywhere, secrets in Key Vault read through managed identities, input validation, output encoding, parameterised queries, narrow CORS, rate limits, dependency and secret scanning in the pipeline, audit logs, encryption at rest, private endpoints, tested backups, and threat modelling with STRIDE (spoofing, tampering, repudiation, information disclosure, denial of service, elevation of privilege).</p>`,
  aiEra: `<p><b>What AI changes:</b> assistants can read a stack trace or a slow query plan and suggest causes, write alert rules and dashboards, and summarise an incident timeline from logs. Platform tools now use models to group related alerts.</p>
    <p><b>New things to watch:</b> a model call is a slow, costly, rate-limited dependency. It needs a timeout, a retry that respects HTTP 429 and <code>Retry-After</code>, a circuit breaker, and a fallback. Track token usage, cost per request, and the model and prompt version as metrics and trace tags.</p>
    <p><b>Where it goes wrong:</b> generated code retries everything including POSTs that are not idempotent, caches per-user answers under a shared key, or logs personal data and secrets into prompts and traces.</p>
    <p><b>What you still own:</b> choosing the SLO, deciding what is safe to serve stale, and deciding what must never be cached or logged.</p>`,
  problems: [P({
    t: 'The shop goes down during every sale', l: 'Medium', tags: ['resilience', 'caching', 'scalability'],
    s: 'An online shop runs fine on normal days. During each sale, traffic rises 8 times for an hour, pages time out and the database CPU sits at 100%. The interviewer asks: how do you find the cause and what do you change, in what order?',
    ex: '<p>Typical finding: 85% of requests are product and category pages (reads), each running 6 queries, none cached. Order placement is under 2% of the traffic but shares the same starved database.</p>',
    weak: 'I would move to a bigger database server and add more web servers before the next sale.',
    why: 'it spends money before measuring. More web servers push even more queries at the same database, and a bigger server only moves the limit a little. It also has no plan to protect checkout.',
    q: ['Reads are 85% of the load and the data changes a few times a day. What gives the biggest win for the least risk?', ['Shard the database', 'Cache the read pages and their queries with a short TTL', 'Rewrite the shop as microservices', 'Double the web servers'], 1, 'Rarely changing, heavily read data is the ideal cache case. Sharding and rewrites are costly and do not address the read pattern.'],
    h: ['Measure first: which requests and which queries eat the database during the peak?', 'Reads that rarely change can be served without touching the database at all. Think CDN and distributed cache.', 'Recipe: measure, fix top queries and indexes, cache reads (with stampede protection), make the web tier stateless and autoscale, put order work behind a queue, add a rate limit, then load test at 10 times.'],
    a: '<p><b>Strong answer:</b> "First I would measure during a load test that copies the sale: top endpoints, top queries, database waits. Usually the read pages dominate. Then, in order of cost: 1) fix the worst queries and add missing indexes. 2) cache: static assets and public pages on a CDN, product and category data in Redis with a short TTL plus jitter and single-flight loading so an expired key does not cause a stampede. 3) make sure the web tier is stateless, sessions in Redis or tokens, and autoscale on CPU and request count before the sale starts. 4) protect checkout: its own connection pool as a bulkhead, a read replica for browsing, and order confirmation work such as emails and invoices moved to a queue. 5) add a rate limit and a friendly \'busy\' page as a last line. Then I would rerun the load test at 10 times normal traffic and set alerts on latency and error rate. Only if the write path is still the limit would I look at partitioning."</p>',
    cx: '<p><b>What the interviewer scores:</b> measure before spend, cheapest fix first, protecting the money path, and proving the result with a load test.</p>',
    f: ['A price changes during the sale. How do users see it quickly despite the cache?', 'What would you autoscale on, and why not only CPU?', 'How do you stop the sale itself from overselling stock?']
  })]
});

// ---------- TOPIC 4 ----------
topics.push({
  title: 'Shipping and Explaining Design: ADRs, DDD, Multi-Tenancy, Safe Releases',
  analogy: `<p>A <b>ship's logbook</b> records each decision the captain made and why: "changed course north because of the storm". A new officer can read it and understand the route without waking anyone. An <b>Architecture Decision Record (ADR)</b> is that logbook for a codebase. And a careful release is like <b>changing a bridge one lane at a time</b>: traffic keeps flowing while the new lane is tested with a few cars first.</p>`,
  explain: `<p><b>The plain idea:</b> a design is only useful if people can understand it, change it safely, and ship it without downtime.</p>
    <ul>
      <li><b>ADR:</b> a 1-page note in the repository: context, decision, options considered, consequences. It records <i>why</i>.</li>
      <li><b>C4 diagrams:</b> 4 zoom levels: context (system and its users), containers (apps and data stores), components, code.</li>
      <li><b>Domain-Driven Design (DDD):</b> model the software on the business. Key words: <b>ubiquitous language</b> (the same words in talk and in code), <b>bounded context</b> (an area where a word has one meaning), <b>aggregate</b> (a cluster of objects changed together through one root), <b>entity</b> (has identity) vs <b>value object</b> (equal when its values are equal), <b>domain event</b>.</li>
      <li><b>Multi-tenancy:</b> one system serving many customers (tenants) while keeping their data apart.</li>
    </ul>
    <table><thead><tr><th>Release strategy</th><th>Idea</th></tr></thead><tbody>
      <tr><td>Rolling</td><td>replace instances a few at a time</td></tr>
      <tr><td>Blue/green</td><td>2 full environments, switch traffic from old to new</td></tr>
      <tr><td>Canary</td><td>send 5% of traffic to the new version, watch metrics, then widen</td></tr>
      <tr><td>Feature flags</td><td>ship code switched off, turn it on per user or tenant: deploy is not release</td></tr>
      <tr><td>Expand and contract</td><td>database change in 3 safe steps: add new, run both, remove old</td></tr>
      <tr><td>Rollback plan</td><td>the previous version, ready and tested, restored in minutes</td></tr>
    </tbody></table>`,
  clues: ['"How do you document architectural decisions?"', '"How do you deploy without downtime?"', '"How do you rename a column on a live system?"', '"How do you keep one customer from seeing another customer\'s data?"', '"What is a bounded context / an aggregate?"', '"What is your rollback plan?"'],
  code: [
    { lang: 'csharp', check: false, title: 'Shared-schema multi-tenancy: EF Core global query filter', code: `public interface ITenantContext { Guid TenantId { get; } }

// The tenant comes from the validated token, never from a query string or request body.
public sealed class TokenTenantContext(IHttpContextAccessor http) : ITenantContext
{
    public Guid TenantId => Guid.Parse(
        http.HttpContext!.User.FindFirst("tid")?.Value
        ?? throw new UnauthorizedAccessException("No tenant claim in the token."));
}

public sealed class ShopDbContext(DbContextOptions<ShopDbContext> options, ITenantContext tenant) : DbContext(options)
{
    public DbSet<Order> Orders => Set<Order>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        // Every query on Orders gets "WHERE TenantId = @current" added automatically.
        b.Entity<Order>().HasQueryFilter(o => o.TenantId == tenant.TenantId);
        b.Entity<Order>().HasIndex(o => new { o.TenantId, o.CreatedUtc });   // tenant first in the index
    }
}
// Defence in depth: also add SQL Server row-level security, so a raw SQL query
// or a forgotten filter still cannot cross tenants.` },
    { lang: 'text', title: 'ADR template (keep in /docs/adr in the repository)', code: `# ADR 0007: Use a transactional outbox for order events

Status: Accepted (2026-03-02)        Owner: checkout team

## Context
Orders are saved in SQL and an OrderCreated event is published to the broker.
Twice last quarter the event was lost when the app restarted between the two steps.

## Decision
Write the event to an Outbox table in the same transaction as the order.
A background worker publishes unsent rows and marks them as sent.

## Options considered
1. Publish first, then save: can announce an order that does not exist.
2. Distributed transaction (2PC): not supported by the broker.
3. Outbox (chosen): at-least-once delivery, needs idempotent consumers.

## Consequences
+ No lost events. + Works with any broker.
- Events arrive up to a few seconds late. - Consumers must ignore duplicates.
- One more table and worker to monitor (alert if unsent rows are older than 1 minute).

## Revisit when
Publish delay above 5 seconds, or the outbox table grows without bound.` }
  ],
  viz: {
    title: 'Renaming a column with zero downtime: expand, migrate, contract + a canary',
    gen: function () {
      var cols = ['Step', 'Database schema', 'App version running', 'Safe to roll back?'];
      var rows = [
        ['0 Start', 'Customers.Phone', 'v1 reads and writes Phone', 'n/a'],
        ['1 Expand', 'Phone + MobileNumber (nullable)', 'v1 (ignores the new column)', 'yes, drop the new column'],
        ['2 Dual write', 'Phone + MobileNumber', 'v2 writes both, reads Phone', 'yes, back to v1'],
        ['3 Backfill', 'old rows copied in batches', 'v2', 'yes'],
        ['4 Switch read', 'both columns in sync', 'v3 reads MobileNumber (canary 5%, then 100%)', 'yes, flag off'],
        ['5 Stop old write', 'Phone no longer written', 'v4 writes only MobileNumber', 'yes, until step 6'],
        ['6 Contract', 'MobileNumber only', 'v4', 'restore from backup only']
      ];
      var narr = [
        '<b>The goal:</b> rename <code>Phone</code> to <code>MobileNumber</code> while the booking system stays online. A single "rename column" script would break every running copy of the old app the moment it runs.',
        '<b>Expand.</b> Add the new column as nullable. The old app does not know about it and keeps working. Nothing can break.',
        '<b>Dual write.</b> Deploy v2, which writes to both columns but still reads the old one. During a rolling deploy v1 and v2 run side by side, and both are happy with this schema.',
        '<b>Backfill.</b> Copy old values into the new column in small batches (for example 5,000 rows at a time) to avoid long locks. Check the counts match.',
        '<b>Switch the read.</b> v3 reads the new column behind a feature flag. Start as a <b>canary</b> on 5% of traffic, watch error rate and latency for 30 minutes, then go to 100%. If something is wrong, turn the flag off.',
        '<b>Stop writing the old column.</b> Only after v3 has been stable. Up to here every step can be undone in minutes.',
        '<b>Contract.</b> Drop the old column in a later release, days later. This is the only step that is hard to undo, so it goes last and alone.'
      ];
      var frames = [];
      for (var i = 0; i < rows.length; i++) {
        var h = {}; for (var j = 0; j < i; j++) h[j] = 'done'; h[i] = i === 6 ? 'sel' : 'cur';
        var traffic = i === 4 ? [95, 5] : (i > 4 ? [0, 100] : [100, 0]);
        frames.push({ narr: narr[i], parts: [{ type: 'table', label: 'Expand and contract migration', columns: cols, rows: rows.slice(0, i + 1), hl: h }, { type: 'bars', label: 'Traffic: old read path vs new read path (%)', values: traffic, idxLabels: ['old', 'new'], hl: i === 4 ? { 1: 'cur' } : (i > 4 ? { 1: 'ok' } : { 0: 'ok' }) }] });
      }
      frames.push({ narr: '<b>The rule to remember:</b> every deploy must work with the schema before it and the schema after it. Deploy code and schema changes separately, and keep the destructive step for last.', parts: [{ type: 'table', label: 'Expand and contract migration', columns: cols, rows: rows, hl: { 1: 'ok', 2: 'ok', 3: 'ok', 4: 'ok', 5: 'ok', 6: 'sel' } }] });
      return frames;
    }
  },
  examples: [
    { title: 'Three tenancy models side by side', html: `<table><thead><tr><th>Model</th><th>Isolation</th><th>Cost</th><th>Note</th></tr></thead><tbody><tr><td>Database per tenant</td><td>strongest</td><td>highest</td><td>easy per-tenant backup and restore; many databases to migrate and connect to</td></tr><tr><td>Schema per tenant</td><td>medium</td><td>medium</td><td>migrations run once per schema</td></tr><tr><td>Shared tables + TenantId column</td><td>weakest</td><td>lowest</td><td>every query must filter by tenant; enforce it with global query filters and row-level security</td></tr></tbody></table><p>A common mix: shared tables for small customers, a dedicated database for the few large or regulated ones.</p>` },
    { title: 'One word, two bounded contexts', html: `<p>In an online shop, "Product" in the <b>Catalog</b> context means name, photos, description and price. In the <b>Warehouse</b> context "Product" means weight, shelf location and quantity on hand. Forcing both into one giant Product class with 60 fields couples the 2 teams. DDD says: keep 2 small models, one per bounded context, linked by the product ID, and translate at the border.</p>` },
    { title: 'An aggregate protects a rule', html: `<p>Rule: an order's total may not exceed the customer's credit limit. If any code can add an OrderLine straight to the database, the rule can be skipped. Make <b>Order</b> the aggregate root: lines are only added through <code>order.AddLine(...)</code>, which checks the rule, and the repository loads and saves the whole Order in one transaction. One aggregate, one transaction. Changes to other aggregates happen through domain events.</p>` }
  ],
  deepDive: `<p><b>ADRs that get read.</b> Number them, keep them to 1 page, never edit an accepted one: write a new ADR that supersedes it. Store them next to the code so a pull request can change the code and the decision together. The most valuable section is "options considered", because it stops the same debate from restarting every 6 months.</p>
    <p><b>Tenant resolution.</b> Take the tenant from the validated token (for Microsoft Entra ID the <code>tid</code> claim) or a server-side session, never from a client-supplied header or URL alone, or one customer can read another's data by changing a number. Watch the "noisy neighbour": one tenant's heavy report slowing everyone. Per-tenant rate limits and partitioning by tenant key help. Cache keys and background jobs must carry the tenant ID too.</p>
    <p><b>Anti-corruption layer.</b> When you integrate with a legacy or third-party system, put a translation layer between its model and yours, so its odd field names and rules do not leak into your domain.</p>
    <p><b>Release mechanics.</b> Blue/green needs double the capacity for a short time and a database both versions can use. Canary needs good metrics and automatic rollback rules. On Azure, App Service deployment slots give a blue/green swap, and Container Apps revisions can split traffic by percentage. Feature flags (for example Azure App Configuration) are debt: remove a flag once the feature is fully on. A rollback you have never practised is a hope, not a plan.</p>`,
  aiEra: `<p><b>What AI changes:</b> an assistant can draft an ADR from a design discussion, generate a C4 diagram in text form (Mermaid or Structurizr DSL), and write the 3 migration scripts for an expand and contract change.</p>
    <p><b>Use it as a partner:</b> <code>Here is my ADR. List the consequences I have not written down</code>, or <code>Check this migration plan: at which step would a rolling deploy break?</code></p>
    <p><b>Where it goes wrong:</b> it will happily generate a single destructive migration (rename or drop in one step), forget the tenant filter in a hand-written SQL query, or invent a decision history that never happened.</p>
    <p><b>New decisions to record:</b> which model and version a feature uses, where prompts are stored and versioned, and what data may be sent to the model. These deserve ADRs like any other architectural choice.</p>
    <p><b>What you still own:</b> the decision and its consequences, and the check that tenant A can never read tenant B's rows.</p>`
});

// ---------- TOPIC 5 ----------
topics.push({
  title: 'The Tech Lead Playbook: STAR Stories and Leadership Answers',
  analogy: `<p>A tech lead is like the <b>captain of a football team who still plays</b>. They are on the pitch, passing and scoring, but their real job is that the whole team plays well: setting the shape, talking to the coach, calming an argument, bringing a new player into the game. In the interview, the panel is not asking "how good a player are you?" They are asking "does the team play better because you are in it?"</p>`,
  explain: `<p><b>The plain idea:</b> behavioural questions ("tell me about a time...") are answered with a short true story in <b>STAR</b> form:</p>
    <ul>
      <li><b>S, Situation:</b> 1 or 2 sentences of context.</li>
      <li><b>T, Task:</b> what you were responsible for.</li>
      <li><b>A, Action:</b> what <i>you</i> did, step by step. Say "I" for your part and "we" for the team's. This is most of the answer.</li>
      <li><b>R, Result:</b> a number or something observable, plus what you learned.</li>
    </ul>
    <p>Prepare <b>6 to 8 stories</b> you can bend to many questions:</p>
    <table><thead><tr><th>Story type</th><th>Questions it answers</th></tr></thead><tbody>
      <tr><td>Performance problem solved</td><td>hardest bug, proudest work, measuring impact</td></tr>
      <tr><td>Migration or modernisation</td><td>legacy systems, managing risk, planning</td></tr>
      <tr><td>Technical decision with a trade-off</td><td>decision making, disagreement</td></tr>
      <tr><td>Introducing something new safely</td><td>innovation, AI adoption, change</td></tr>
      <tr><td>Speed with quality</td><td>deadlines, process, quality gates</td></tr>
      <tr><td>Mentoring</td><td>growing people, feedback</td></tr>
      <tr><td>Conflict</td><td>disagreement with a peer, manager or stakeholder</td></tr>
      <tr><td>Failure</td><td>mistakes, incidents, learning</td></tr>
    </tbody></table>
    <p><b>The tech lead's job in one line:</b> technical direction, design and code reviews, delivery planning with product, mentoring, and quality gates, while staying hands-on enough to be credible and not so much that you become the bottleneck.</p>`,
  clues: ['"Tell me about a time when..."', '"How do you handle a developer who..."', '"What would you do if the deadline cannot be met?"', '"How do you run code reviews?"', '"Describe a disagreement with your manager"', '"Walk me through a production incident you led"', '"Tell me about yourself"', '"Do you have any questions for us?"'],
  viz: {
    title: 'Building a STAR answer: from a vague reply to a strong one',
    gen: function () {
      var cols = ['Part', 'Weak version', 'Strong version'];
      var rows = [
        ['Situation', 'We had some performance issues.', 'The order history page of an online shop took 12 seconds for customers with more than 500 orders.'],
        ['Task', 'We needed to fix it.', 'As tech lead I owned getting it under 1 second before the holiday season, without a rewrite.'],
        ['Action', 'We optimised the code.', 'I measured first: tracing showed 1 query per order line. I replaced it with 1 paged query and a covering index, then added a 5 minute cache for the summary.'],
        ['Action (team)', '(missing)', 'I paired with a junior developer on the query so she could own the next one, and added a load test to the pipeline.'],
        ['Result', 'It got faster.', 'The page dropped from 12 seconds to about 400 ms at the 95th percentile. Support tickets about it stopped.'],
        ['Learning', '(missing)', 'Measure before changing anything, and add a test so the problem cannot quietly return.']
      ];
      var narr = [
        'The question: <b>"Tell me about a performance problem you solved."</b> Start with the <b>Situation</b>. The weak version has no picture. The strong one gives a place, a number and who was hurt, in 1 sentence.',
        '<b>Task.</b> Say what <i>you</i> were responsible for and what "done" meant. A target (under 1 second) and a constraint (no rewrite) make the story concrete.',
        '<b>Action</b> is the heart: about 60% of the answer. "We optimised" tells the panel nothing. Say how you found the cause and what you changed, in order.',
        '<b>Show the lead part.</b> A senior developer fixes the query. A tech lead also makes the team better at it and stops the problem returning.',
        '<b>Result.</b> Give a before and after number and say how you measured it. If you do not have exact figures, give honest relative ones ("seconds to under half a second").',
        '<b>Learning.</b> One sentence on what you now do differently. It shows you reflect, and it is a natural ending.'
      ];
      var frames = [];
      for (var i = 0; i < rows.length; i++) {
        var h = {}; h[i] = 'cur';
        frames.push({ narr: narr[i], parts: [{ type: 'table', label: 'STAR answer, built row by row', columns: cols, rows: rows.slice(0, i + 1), hl: h }] });
      }
      frames.push({ narr: '<b>Check the finished answer:</b> under 2 minutes, mostly Action, "I" for your decisions, a number in the Result, a lesson at the end, and nothing confidential.', parts: [{ type: 'table', label: 'STAR answer, complete', columns: cols, rows: rows, hl: { 2: 'sel', 3: 'sel', 4: 'ok' } }, { type: 'bars', label: 'Share of speaking time (%)', values: [10, 10, 60, 20], idxLabels: ['S', 'T', 'A', 'R+L'], hl: { 2: 'sel' } }] });
      return frames;
    }
  },
  examples: [
    { title: 'One story, three questions', html: `<p>The slow order history story answers "a performance problem you solved" as told. For "a time you mentored someone", open with the junior developer and make the pairing the Action. For "how do you ensure quality", open with the missing load test and make the pipeline change the Action. Same facts, different emphasis. That is why 6 to 8 well-chosen stories are enough.</p>` },
    { title: 'Talking about work without leaking it', html: `<p>Instead of a customer name, product name or revenue figure, say "a booking platform for clinics" and "response time went from seconds to under half a second". Describe the problem, the pattern and your decision. If pushed for something sensitive, say: "I can explain the approach in general terms. The specifics are confidential." Interviewers respect that, because it shows how you will treat their secrets too.</p>` },
    { title: 'A weakness answer that is real', html: `<p>Weak: "I am a perfectionist." Strong: "I used to take the hardest tasks myself because it was faster. It made me a bottleneck and the team learned less. Now I hand over one hard task each sprint with clear context, and review instead of doing. The team's reviews of my design notes have also got better because more people understand the tricky parts." Real, modest, and with a visible fix.</p>` }
  ],
  deepDive: `<p><b>What panels score at lead level.</b> Scope (did you affect the team or only your own code), judgment (did you weigh options), ownership (do you own the bad outcomes too), and communication (can a non-specialist follow you). An answer full of "we" hides your contribution, an answer full of "I" for team work sounds like taking credit. Be precise about which is which.</p>
    <p><b>Common model answers, in short.</b> <i>Decisions:</i> gather options, write a short ADR, discuss trade-offs, one clear owner decides, disagree and commit, revisit when assumptions change. <i>Code reviews:</i> small pull requests, automated checks first, review for correctness, security, readability and tests, be kind and specific. <i>Tech debt:</i> make it visible, attach a cost or risk, reserve capacity every sprint. <i>Estimation:</i> break down, give ranges, include testing and review, re-estimate when facts change. <i>Missed deadline:</i> say it early, offer options on scope, date or people, protect quality gates, hold a retrospective. <i>Underperformance:</i> clarify expectations, specific feedback, support, an agreed plan, follow up.</p>
    <p><b>Incidents.</b> During: one incident lead, stop the bleeding first (roll back, switch the flag off), communicate at fixed intervals. After: a blameless review that asks "what let this happen?" and ends with owned actions that have dates.</p>
    <p><b>Questions for them.</b> Ask how the team is structured, how releases and quality gates work, how architectural decisions are made, the biggest technical challenge of the next 6 months, how AI tools are used, what success looks like in the first 90 days, and what on-call looks like.</p>`,
  aiEra: `<p><b>What AI changes:</b> a tech lead is now expected to have a view on AI-assisted delivery. A sound position: specs and acceptance criteria are written and reviewed before code, assistants draft, people decide and stay accountable, and the same gates apply to generated code as to hand-written code (tests, linters, static analysis, security scans, human review).</p>
    <p><b>Measure, do not guess:</b> watch cycle time, defect rate and review time before and after, and share the prompt patterns that work.</p>
    <p><b>Honest risks to name:</b> invented APIs, subtle bugs that look plausible, licence and data questions, secrets pasted into prompts, and juniors who stop learning because the tool always answers.</p>
    <p><b>For your own preparation:</b> use an assistant as a mock interviewer (<code>Ask me 5 follow-up questions on this STAR story and point out where I say "we" but mean "I"</code>). Never let it invent a story for you. Panels probe details, and a made-up story falls apart on the second follow-up.</p>`,
  problems: [P({
    t: 'The release will miss its date by two weeks', l: 'Medium', tags: ['stakeholders', 'estimation', 'deadline'],
    s: 'You lead a team building a new booking flow. Three weeks before the promised date you can see the work needs about five weeks: an integration with a payment provider turned out harder than estimated. The interviewer asks: what do you do, and what do you say to the product owner?',
    ex: '<p>The panel wants to hear <b>when</b> you speak up (now, not in week 3), <b>what</b> you bring (options with costs, not just bad news), and <b>what you refuse to cut</b> (tests, security review).</p>',
    weak: 'I would ask the team to work weekends and skip some testing so we can still hit the date. I would only tell the product owner if we really cannot make it.',
    why: 'it hides the risk until it is too late to choose, burns the team out, and cuts the quality gates that protect customers. A late surprise damages trust far more than an early warning.',
    q: ['You realise a deadline is at risk. When is the right time to tell stakeholders?', ['When the deadline has passed', 'As soon as you have checked the facts and can offer options', 'Only if they ask', 'After trying overtime for 2 weeks'], 1, 'Early warning with options lets the business choose between scope, date and people. Late surprises remove every choice.'],
    h: ['Check your facts first: what exactly is left, and how sure are you of the 5 weeks?', 'There are only 3 levers: scope, date, people. Adding people late often slows things down.', 'Recipe: re-estimate with the team, tell the product owner the same day, bring 2 or 3 options with their costs, recommend one, keep quality gates, agree checkpoints, review afterwards why the estimate was off.'],
    a: '<p><b>Strong answer:</b> "First I would confirm the facts with the team the same day: break the remaining work down, re-estimate as a range, and name what is uncertain. Then I would tell the product owner straight away, with options rather than only a problem. Option 1: keep the date and reduce scope, for example launch with card payments only and add the second payment method 2 weeks later behind a feature flag. Option 2: keep the full scope and move the date by 2 weeks. Option 3: add a developer who already knows the provider, which helps a little, while adding someone new would slow us down. I would recommend option 1 and say why. I would be clear about what is not on the table: automated tests, the security review and the rollback plan stay. Then we agree twice-weekly checkpoints so there are no more surprises. After release I would run a short retrospective on why the estimate was wrong, here an untested integration, and next time spike the risky part in week 1."</p>',
    cx: '<p><b>What the interviewer scores:</b> early and honest communication, options with a recommendation, protecting quality and the team, and learning from the estimate.</p>',
    f: ['The product owner insists on full scope and the original date. What now?', 'How would you have found this risk earlier?', 'How do you tell the team without lowering morale?']
  })]
});

// ================= INTERVIEW: SECTION 1, ARCHITECTURE FUNDAMENTALS =================
// ---- Level B ----
interview.push({ q: 'What is software architecture, and what does "it depends on the trade-offs" really mean?', level: 'B',
  a: `<p>Software architecture is the set of big decisions about how a system is split into parts, where its data lives and how the parts talk, the decisions that are costly to change later.</p>
<p>A <b>trade-off</b> means that every choice buys one quality by paying with another:</p>
<table><thead><tr><th>You gain</th><th>You usually pay with</th></tr></thead><tbody>
<tr><td>Speed from a cache</td><td>data that can be slightly old</td></tr>
<tr><td>Independent deploys from microservices</td><td>network failures and harder debugging</td></tr>
<tr><td>Strong consistency</td><td>lower availability or higher latency</td></tr>
<tr><td>Flexibility from extra layers</td><td>more code and slower delivery</td></tr></tbody></table>
<p>Good architects start from the <b>non-functional requirements</b> (how fast, how many users, how much downtime is acceptable, how secure, how cheap) and the <b>constraints</b> (team size, skills, budget, deadline). Then they pick the simplest design that meets them and say what they gave up.</p>
<blockquote><b>Say it in the interview:</b> There is no best architecture, only the one that fits the constraints. For each choice I name what we gain, what we give up, and why that is acceptable here.</blockquote>`,
  followUps: ['Give an example of a decision you would reverse today.', 'Which non-functional requirement is most often forgotten?', 'How do you decide something is "good enough"?'] });

interview.push({ q: 'How do you approach designing a system in an interview? Give your framework.', level: 'B',
  a: `<p>I follow the same 7 steps every time, starting with questions and ending with trade-offs, so I never jump straight to drawing boxes.</p>
<ol>
<li><b>Clarify requirements:</b> what it must do, plus scale, latency, availability, consistency, security, compliance and cost. Also constraints: team, budget, existing stack.</li>
<li><b>Estimate:</b> users, requests per second, data volume, read to write ratio.</li>
<li><b>API and data model:</b> main entities, relationships and the key queries.</li>
<li><b>High-level design:</b> clients, gateway, services, data stores, queues, caches, external systems.</li>
<li><b>Deep dive</b> into the 1 or 2 hardest parts: consistency, scaling or failure handling.</li>
<li><b>Cross-cutting concerns:</b> security, observability, deployment, cost.</li>
<li><b>Trade-offs and phasing:</b> alternatives, what goes in the first version, what comes later.</li>
</ol>
<p>Spend about 5 minutes on steps 1 and 2. Interviewers mark down candidates who design for the wrong problem.</p>
<blockquote><b>Say it in the interview:</b> Before I draw anything, let me ask a few questions about scale and what must never go wrong. Then I will sketch the API and data, the high-level picture, and go deep on the hardest part.</blockquote>`,
  followUps: ['What do you ask first if you only get 2 questions?', 'How do you decide which part to deep dive?', 'What goes in your first version and what waits?'] });

interview.push({ q: 'Compare a monolith, a modular monolith and microservices. Which would you start with?', level: 'B',
  a: `<p>A monolith is one application deployed as one unit, a modular monolith is one unit with strict internal modules, and microservices are many small applications deployed on their own.</p>
<table><thead><tr><th></th><th>Monolith</th><th>Modular monolith</th><th>Microservices</th></tr></thead><tbody>
<tr><td>Deployment</td><td>1 unit</td><td>1 unit, walls inside</td><td>many independent units</td></tr>
<tr><td>Complexity</td><td>low</td><td>medium</td><td>high: network, data, operations</td></tr>
<tr><td>Team scaling</td><td>limited</td><td>good</td><td>best, if the platform is mature</td></tr>
<tr><td>Data</td><td>1 database</td><td>1 database, module-owned schemas</td><td>database per service</td></tr>
<tr><td>Failure</td><td>all or nothing</td><td>all or nothing</td><td>partial, but failures can cascade</td></tr></tbody></table>
<p>My default advice is to start with a <b>modular monolith</b>. Extract a module into a service only when it needs its own scaling, its own release pace or its own team. Microservices bring distributed-system problems: network failure, eventual consistency, contract versioning, tracing and cost.</p>
<blockquote><b>Say it in the interview:</b> I start with a modular monolith and split out a service only for a clear reason: independent scaling, release cadence or team ownership. Microservices solve an organisation problem and you pay for it in operations.</blockquote>`,
  followUps: ['What is a distributed monolith?', 'How do you enforce module boundaries in .NET?', 'When is a plain monolith the right answer?'] });

interview.push({ q: 'What communication styles exist between services, and when do you use each?', level: 'B',
  a: `<p>Services either call each other and wait for the answer (synchronous) or pass messages and carry on (asynchronous).</p>
<table><thead><tr><th>Style</th><th>Technology</th><th>Use when</th></tr></thead><tbody>
<tr><td>Synchronous request and response</td><td>REST, gRPC, GraphQL</td><td>the caller needs the answer now</td></tr>
<tr><td>Asynchronous messaging</td><td>Azure Service Bus, RabbitMQ</td><td>decoupling, traffic spikes, workflows, retries</td></tr>
<tr><td>Events (publish and subscribe)</td><td>Event Grid, Kafka, Service Bus topics</td><td>several consumers react to one fact</td></tr>
<tr><td>Batch and streaming</td><td>Data Factory, Event Hubs, Spark</td><td>analytics and bulk data movement</td></tr></tbody></table>
<p>Rule of thumb: queries, and commands that need an immediate answer, go synchronously. State changes are announced as events so other services can react without the sender knowing them. Watch out for long synchronous chains: if A calls B calls C calls D, the availability multiplies down (4 services at 99.9% give about 99.6%) and the latency adds up.</p>
<blockquote><b>Say it in the interview:</b> If the caller needs the answer now I use a synchronous call. If the work can wait or many parts must react, I use a queue or an event, which also absorbs spikes and gives me retries.</blockquote>`,
  followUps: ['REST or gRPC between internal services?', 'What is the difference between a queue and a topic?', 'How do you return a result to the user from an asynchronous flow?'] });

interview.push({ q: 'How do you scale a system? Explain scaling up vs scaling out, stateless services and database scaling.', level: 'B',
  a: `<p>Scaling up means a bigger machine, scaling out means more machines, and scaling out only works when any machine can handle any request.</p>
<ul>
<li><b>Vertical (up):</b> simple, no code change, but there is a ceiling and one machine is still one point of failure.</li>
<li><b>Horizontal (out):</b> add instances behind a load balancer (round robin or least connections). Services must be <b>stateless</b>: keep sessions in Redis or in tokens, files in blob storage, not in one server's memory or disk.</li>
<li><b>Autoscaling:</b> add and remove instances on CPU, request count or queue length.</li>
<li><b>Database, in this order:</b> tune queries and indexes, cache, read replicas, archive old data, then partition or shard by a key such as tenant. CQRS with a separate read store is another option.</li>
<li><b>Slow work:</b> move it to a queue and process it in the background.</li>
<li><b>Static content:</b> serve it from a CDN.</li>
</ul>
<p>The database is usually the real limit, because the stateless tier is easy to multiply and data is not.</p>
<blockquote><b>Say it in the interview:</b> I keep the web tier stateless so I can scale it out behind a load balancer. For the database I go in order: indexes and queries, caching, read replicas, and only then partitioning.</blockquote>`,
  followUps: ['What breaks when you add a second instance of a stateful app?', 'What is replica lag and how do you handle it?', 'What would you autoscale a queue worker on?'] });

interview.push({ q: 'What is an Architecture Decision Record (ADR), and how do you document a design?', level: 'B',
  a: `<p>An ADR is a short note, about 1 page, that records one important technical decision and why it was made.</p>
<p>It has 4 parts:</p>
<ul>
<li><b>Context:</b> the problem and the forces at play.</li>
<li><b>Decision:</b> what we chose.</li>
<li><b>Alternatives considered:</b> what we rejected and why.</li>
<li><b>Consequences:</b> what gets better, what gets worse, what we must now watch.</li>
</ul>
<p>Keep ADRs in the repository next to the code, numbered, and do not edit an accepted one. If the decision changes, write a new ADR that supersedes the old one.</p>
<p>For pictures, use the <b>C4 model</b>, which zooms in 4 levels: system <b>context</b> (the system and who uses it), <b>containers</b> (apps, databases, queues), <b>components</b> (the parts inside one app) and <b>code</b>. Most audiences only need the first 2.</p>
<p>A good tech lead writes down <i>why</i>, not only <i>what</i>. The code already shows what.</p>
<blockquote><b>Say it in the interview:</b> For every significant decision I write a 1-page ADR in the repo: context, decision, options and consequences. It stops the same debate from coming back and lets a new joiner understand why the system looks the way it does.</blockquote>`,
  followUps: ['What counts as "significant" enough for an ADR?', 'How do you keep diagrams from going out of date?', 'Who approves an ADR in your team?'] });

// ---- Level I ----
interview.push({ q: 'What is the difference between layered architecture and clean (hexagonal, onion) architecture?', level: 'I',
  a: `<p>Both split code into layers, but in clean architecture the business rules sit in the centre and depend on nothing, while in classic layering the business layer depends on the data layer.</p>
<table><thead><tr><th></th><th>Classic layered</th><th>Clean / hexagonal / onion</th></tr></thead><tbody>
<tr><td>Dependency direction</td><td>UI → business → data</td><td>everything points inward to the domain</td></tr>
<tr><td>Database access</td><td>business code calls it directly</td><td>domain defines an interface, infrastructure implements it</td></tr>
<tr><td>Testing business rules</td><td>often needs a database</td><td>plain unit tests, no framework</td></tr>
<tr><td>Cost</td><td>low</td><td>more projects, interfaces and mapping</td></tr></tbody></table>
<p>The usual .NET layout is 4 projects: <code>Domain</code> (entities, rules), <code>Application</code> (use cases), <code>Infrastructure</code> (EF Core, email, queues) and <code>Web</code> (controllers, composition root). The trick is <b>dependency inversion</b>: the inner layer owns the interface and dependency injection supplies the outer implementation at run time.</p>
<p>Use it where there are real business rules. For a simple CRUD admin screen it is extra ceremony.</p>
<blockquote><b>Say it in the interview:</b> In clean architecture dependencies point inward, so the domain has no reference to EF Core or ASP.NET Core. That makes business rules easy to test and frameworks replaceable, at the cost of more structure.</blockquote>`,
  followUps: ['Where do you put validation?', 'Should the domain entity be the same class as the EF Core entity?', 'What is vertical slice architecture and when would you prefer it?'] });

interview.push({ q: 'What are the key design principles for microservices?', level: 'I',
  a: `<p>A good microservice does one business job, owns its own data and can be changed and deployed without touching the others.</p>
<ul>
<li><b>Built around a business capability:</b> a bounded context such as Orders or Payments, not a technical layer or a table.</li>
<li><b>Owns its data:</b> no shared database. Others use its API or its events.</li>
<li><b>Loose coupling, high cohesion:</b> versioned contracts and backwards compatible changes, so consumers do not break.</li>
<li><b>Designed for failure:</b> timeouts, retries with backoff, circuit breakers, bulkheads, fallbacks, idempotent operations.</li>
<li><b>Automated:</b> its own CI/CD pipeline, infrastructure as code, health checks.</li>
<li><b>Observable:</b> correlation IDs, structured logs, metrics, distributed traces.</li>
</ul>
<p>The quickest test: can one team release this service on a Tuesday afternoon without coordinating with anyone? If not, the boundary or the contract is wrong.</p>
<blockquote><b>Say it in the interview:</b> Each service maps to a business capability, owns its data and exposes a versioned contract. I design every call for failure and I make sure each service can be deployed and observed on its own.</blockquote>`,
  followUps: ['How do you make a breaking change to a service contract?', 'Two services need the same customer data. What do you do?', 'How small is too small for a service?'] });

interview.push({ q: 'What is event-driven design? Explain events vs commands and what delivery guarantees you get.', level: 'I',
  a: `<p>In event-driven design a service announces "this happened" and other services react, instead of one service calling the others directly.</p>
<table><thead><tr><th></th><th>Command</th><th>Event</th></tr></thead><tbody>
<tr><td>Meaning</td><td>"do this" (ChargePayment)</td><td>"this happened" (OrderPlaced)</td></tr>
<tr><td>Receivers</td><td>exactly 1 handler</td><td>0 to many subscribers</td></tr>
<tr><td>Sender knows receiver?</td><td>yes</td><td>no</td></tr>
<tr><td>Typical transport</td><td>queue</td><td>topic, event stream</td></tr></tbody></table>
<p>What to expect from the broker:</p>
<ul>
<li><b>At-least-once delivery:</b> a message can arrive twice, so handlers must be idempotent.</li>
<li><b>No global ordering:</b> use sessions or a partition key to keep one entity's events in order.</li>
<li><b>Poison messages:</b> after a few failed attempts they move to a <b>dead-letter queue</b> that someone must watch.</li>
<li><b>Eventual consistency:</b> subscribers catch up after a short delay.</li>
</ul>
<p>The gain is loose coupling and spike absorption. The price is that the flow is harder to see, so you need tracing and good event names.</p>
<blockquote><b>Say it in the interview:</b> A command tells one service to do something, an event tells anyone interested that something happened. With events I plan for duplicates, out-of-order delivery and a dead-letter queue from day 1.</blockquote>`,
  followUps: ['How do you version an event that many services consume?', 'Thin event with just an ID, or fat event with the data?', 'How do you debug a flow that crosses 5 subscribers?'] });

interview.push({ q: 'Which resilience patterns do you use, and how do you add them in .NET?', level: 'I',
  a: `<p>Resilience patterns keep one failing part from taking the whole system down.</p>
<table><thead><tr><th>Pattern</th><th>Purpose</th></tr></thead><tbody>
<tr><td>Timeout</td><td>never wait forever</td></tr>
<tr><td>Retry with exponential backoff and jitter</td><td>survive short faults; only for idempotent calls</td></tr>
<tr><td>Circuit breaker</td><td>stop calling a failing dependency, fail fast, probe to recover</td></tr>
<tr><td>Bulkhead</td><td>separate pools so one dependency cannot exhaust everything</td></tr>
<tr><td>Fallback</td><td>return cached or partial data</td></tr>
<tr><td>Rate limiting</td><td>protect against overload</td></tr>
<tr><td>Health checks and auto-restart</td><td>replace unhealthy instances</td></tr>
<tr><td>Queue-based load levelling</td><td>absorb spikes</td></tr></tbody></table>
<pre><code>builder.Services.AddHttpClient&lt;PaymentsClient&gt;()
       .AddStandardResilienceHandler();</code></pre>
<p>That one call (package <code>Microsoft.Extensions.Http.Resilience</code>, built on Polly v8) adds a rate limiter, a total timeout, retry, a circuit breaker and a per-attempt timeout. ASP.NET Core also has built-in rate limiting middleware and health check endpoints.</p>
<blockquote><b>Say it in the interview:</b> Every outbound call gets a timeout, a retry with backoff and jitter for transient faults, and a circuit breaker. I only retry idempotent operations, and I always think about what the user sees as a fallback.</blockquote>`,
  followUps: ['Why is retrying without jitter dangerous?', 'What are the 3 states of a circuit breaker?', 'Which errors should never be retried?'] });

interview.push({ q: 'Explain caching strategies and the common pitfalls.', level: 'I',
  a: `<p>A cache keeps a copy of data that is expensive to fetch so the next request gets it quickly, and the hard part is keeping that copy fresh enough.</p>
<table><thead><tr><th>Strategy</th><th>How it works</th></tr></thead><tbody>
<tr><td>Cache-aside</td><td>app checks the cache; on a miss it loads from the database and stores the result</td></tr>
<tr><td>Read-through / write-through</td><td>the cache layer itself loads from and writes to the database</td></tr>
<tr><td>Write-behind</td><td>write to the cache now, flush to the database later (risk of loss)</td></tr>
<tr><td>TTL and eviction</td><td>entries expire, or the least recently used are removed; versioned keys</td></tr>
<tr><td>HTTP caching</td><td><code>Cache-Control</code>, <code>ETag</code> with <code>If-None-Match</code>, CDN</td></tr></tbody></table>
<p><b>Pitfalls:</b> stale data, <b>cache stampede</b> (many misses at once: fix with a lock or request coalescing, jittered TTLs, early refresh), hot keys, cache poisoning, memory limits, and user-specific data stored under a shared key.</p>
<p><b>Layers:</b> browser, CDN, gateway, in-memory (<code>IMemoryCache</code>), distributed (Redis), database. Since .NET 9, <code>HybridCache</code> combines an in-memory level and a distributed level with built-in stampede protection.</p>
<blockquote><b>Say it in the interview:</b> My default is cache-aside with a TTL and explicit invalidation on writes. Before caching anything I ask how stale it may be, and I guard hot keys against a stampede.</blockquote>`,
  followUps: ['How do you invalidate a cache across 10 instances?', 'What should never be cached?', 'IMemoryCache or Redis: how do you choose?'] });

interview.push({ q: 'How do you do back-of-the-envelope capacity estimation in a design interview?', level: 'I',
  a: `<p>You turn a few rough inputs into requests per second and gigabytes with round numbers, so that the numbers can steer the design.</p>
<p>Useful constants: 1 day is about 100,000 seconds (86,400). 1 million requests a day is about 12 per second. Peak is often 5 to 10 times the average.</p>
<p>Worked example, a booking system:</p>
<ul>
<li>2 million users a day, 20 requests each = 40 million requests a day, about <b>460 per second</b> on average, so plan for about <b>4,000</b> at peak.</li>
<li>Reads to writes about 50 to 1, so about 80 writes per second at peak. One well-indexed SQL database handles that. Reads are the place for caching and replicas.</li>
<li>500,000 bookings a day at 1 KB each = 0.5 GB a day, about 180 GB a year. No sharding needed.</li>
</ul>
<p>Then say what the numbers mean: "this fits one primary database with a cache, so I will not add complexity". That conclusion is the point, not the arithmetic.</p>
<blockquote><b>Say it in the interview:</b> Let me do quick numbers: users times actions, divided by 100,000 seconds, times a peak factor. That tells me whether one database is enough or whether I need caching, replicas or partitioning.</blockquote>`,
  followUps: ['How many servers would you need for 4,000 requests per second?', 'Which number changes the design most if it grows 10 times?', 'How do you estimate cache memory?'] });

interview.push({ q: 'Give me your security architecture checklist for a web application.', level: 'I',
  a: `<p>I check security in layers: who the user is, what they may do, how data is protected, and how we would notice and recover from an attack.</p>
<ul>
<li><b>Identity:</b> sign-in with OpenID Connect through Microsoft Entra ID. Authorization by roles or attributes (RBAC, ABAC), least privilege, and a check on <b>each resource</b>, not only on the endpoint.</li>
<li><b>Data in transit and at rest:</b> TLS everywhere, encryption at rest.</li>
<li><b>Secrets:</b> in Key Vault, read with managed identities, never in code or config files.</li>
<li><b>Input and output:</b> validation, output encoding, parameterised queries, narrow CORS.</li>
<li><b>Abuse protection:</b> rate limiting.</li>
<li><b>Known risks:</b> the OWASP Top 10, dependency and code scanning in the pipeline.</li>
<li><b>Network:</b> private endpoints and isolation.</li>
<li><b>Multi-tenant isolation</b> of data.</li>
<li><b>Evidence and recovery:</b> audit logs, tested backups, disaster recovery.</li>
<li><b>Design time:</b> threat modelling with STRIDE.</li>
</ul>
<p>The most common real-world hole is broken access control: user A changes an ID in the URL and reads user B's record.</p>
<blockquote><b>Say it in the interview:</b> I think in layers: identity and per-resource authorization, encryption, secrets in a vault with managed identity, input validation, and scanning in the pipeline. I threat-model new features with STRIDE before we build.</blockquote>`,
  followUps: ['What is the difference between RBAC and ABAC?', 'How do you rotate a secret without downtime?', 'What does each letter of STRIDE stand for?'] });

interview.push({ q: 'What is observability? Explain logs, metrics, traces, and SLI, SLO, SLA.', level: 'I',
  a: `<p>Observability means you can understand what a running system is doing, and why, from the signals it sends out.</p>
<ul>
<li><b>Logs:</b> structured (JSON) records of events, each carrying a <b>correlation ID</b> that is passed from service to service.</li>
<li><b>Metrics:</b> numbers over time. Per service use <b>RED</b> (rate, errors, duration). Per resource use <b>USE</b> (utilisation, saturation, errors). Add business metrics such as orders per minute.</li>
<li><b>Traces:</b> the path and timing of one request across services, with OpenTelemetry and the W3C <code>traceparent</code> header.</li>
<li><b>Alerting:</b> on symptoms users feel, such as error budget burn rate, not on every possible cause. Each alert links to a dashboard and a runbook.</li>
</ul>
<table><thead><tr><th>Term</th><th>Meaning</th><th>Example</th></tr></thead><tbody>
<tr><td>SLI (indicator)</td><td>what you measure</td><td>share of requests under 300 ms</td></tr>
<tr><td>SLO (objective)</td><td>your target</td><td>99.9% over 30 days</td></tr>
<tr><td>SLA (agreement)</td><td>the contract, with penalties</td><td>99.5% or credit is paid</td></tr></tbody></table>
<p>Tip: give every request a correlation ID at the edge and return it in error responses, so support can trace one failure across the API, the database layer and any background work.</p>
<blockquote><b>Say it in the interview:</b> I want 3 signals: structured logs with a correlation ID, RED metrics per service, and distributed traces through OpenTelemetry. I alert on SLO burn, which is what users feel, not on every CPU spike.</blockquote>`,
  followUps: ['What is an error budget?', 'What makes an alert a bad alert?', 'How do you avoid logging personal data?'] });

interview.push({ q: 'Which deployment and release strategies do you know, and how do you change a database without downtime?', level: 'I',
  a: `<p>The safe way to release is in small steps that can each be undone, with new code reaching a few users before it reaches everyone.</p>
<table><thead><tr><th>Strategy</th><th>Idea</th></tr></thead><tbody>
<tr><td>Rolling</td><td>replace instances gradually</td></tr>
<tr><td>Blue/green</td><td>2 environments, switch traffic from old to new</td></tr>
<tr><td>Canary</td><td>a small percentage first, watch metrics, then expand</td></tr>
<tr><td>Feature flags</td><td>deploy switched off, enable per user or tenant: separates deploy from release</td></tr>
<tr><td>Expand and contract</td><td>add the new schema, run both versions, remove the old later</td></tr>
<tr><td>Rollback plan</td><td>the previous artifact, tested, fast to restore</td></tr></tbody></table>
<p>For the database, never rename or drop in the same release as the code change. Add the new column, write to both, backfill, switch reads, stop writing the old one, and drop it in a later release.</p>
<p>A good pipeline description: a version tag triggers build, test, scan, package and deploy, and the pipeline is the only path to production, so every release is repeatable and auditable.</p>
<blockquote><b>Say it in the interview:</b> I separate deploy from release with feature flags, roll out as a canary while watching error rate and latency, and make schema changes with expand and contract so the old and new versions can run side by side.</blockquote>`,
  followUps: ['Blue/green or canary: when do you pick each?', 'What metrics decide whether a canary continues?', 'How do you roll back after a data migration has run?'] });

interview.push({ q: 'What is an API gateway, and what is the Backend for Frontend (BFF) pattern?', level: 'I',
  a: `<p>An API gateway is a single front door that sits between clients and your services and handles the concerns every request shares.</p>
<p>What a gateway typically does:</p>
<ul>
<li>routing to the right service, and TLS termination</li>
<li>authentication (validating the token) and coarse authorization</li>
<li>rate limiting and quotas per client or API key</li>
<li>response caching, request and response transformation</li>
<li>logging and a correlation ID for every call</li>
</ul>
<p>In Azure this is API Management or Application Gateway. In code, YARP is the .NET reverse proxy library.</p>
<p>A <b>BFF</b> is a small backend built for one kind of client. The web app and the mobile app each get their own, which calls several services and returns exactly the shape that screen needs. It also lets a browser app keep tokens on the server behind a secure cookie instead of in JavaScript.</p>
<p>Risks: the gateway becomes a single point of failure (run several instances) and a dumping ground for business logic (keep rules in the services).</p>
<blockquote><b>Say it in the interview:</b> The gateway is one entry point for cross-cutting concerns like authentication, rate limits and routing. A BFF goes one step further and shapes the API for one client type. I keep business logic out of both.</blockquote>`,
  followUps: ['Where should fine-grained authorization happen?', 'How is a BFF different from GraphQL?', 'What happens to your system if the gateway is down?'] });

interview.push({ q: 'Rapid fire: common system design prompts (part 1)', level: 'I',
  a: `<p>Each of these prompts has 3 or 4 ideas the interviewer is waiting to hear, so learn the key words for each.</p>
<table><thead><tr><th>Prompt</th><th>Key ideas to mention</th></tr></thead><tbody>
<tr><td>URL shortener</td><td>ID from a counter or hash, encoded in base62. Very read heavy, so cache the lookup. Redirect with 301 (permanent, cached by browsers) or 302 (temporary, lets you count clicks). Click analytics through asynchronous events.</td></tr>
<tr><td>Rate limiter</td><td>Token bucket or sliding window. Atomic counters in Redis so all instances share one count. Limit per user, IP or API key. Reply 429 with a <code>Retry-After</code> header.</td></tr>
<tr><td>Notification service</td><td>A queue in front, templates, channels (email, SMS, push), retries, idempotency so nobody gets 2 copies, user preferences, per-user rate limits.</td></tr>
<tr><td>File upload and storage</td><td>Browser uploads straight to blob storage with a short-lived SAS URL. Virus scan before the file is usable. Metadata in a database. CDN for downloads. Resumable chunked uploads for large files.</td></tr>
<tr><td>Large report export</td><td>Start an asynchronous job, return 202 with a job ID, process from a queue, client polls status, download link to blob storage when ready.</td></tr></tbody></table>
<blockquote><b>Say it in the interview:</b> For each of these I name the read to write pattern first, then the 1 trick that makes it work: base62 IDs, a token bucket in Redis, a queue with idempotent senders, or direct upload with a SAS URL.</blockquote>`,
  followUps: ['How do you avoid 2 short URLs colliding?', 'Why must the rate limit counter be atomic?', 'Why should the file not pass through your API server?'] });

// ---- Level A ----
interview.push({ q: 'Explain the CAP theorem, consistency models and eventual consistency.', level: 'A',
  a: `<p>The CAP theorem says that when the network between nodes breaks, a distributed data store must choose between giving every reader the same correct answer (consistency) and answering every request (availability).</p>
<p>P (partition tolerance) is not optional, because networks do fail. So the real choice during a partition is C or A. Outside a partition, the daily trade-off is latency against consistency.</p>
<table><thead><tr><th>Model</th><th>Promise</th><th>Good for</th></tr></thead><tbody>
<tr><td>Strong</td><td>every read sees the latest write</td><td>money, stock counts, seat booking</td></tr>
<tr><td>Read-your-writes (session)</td><td>you always see your own changes</td><td>profile edits, carts</td></tr>
<tr><td>Causal</td><td>related changes are seen in order</td><td>comment threads</td></tr>
<tr><td>Eventual</td><td>replicas agree after a delay</td><td>feeds, analytics, search</td></tr></tbody></table>
<p><b>ACID</b> (atomic, consistent, isolated, durable) describes relational transactions. <b>BASE</b> (basically available, soft state, eventual consistency) describes systems that favour availability.</p>
<p>In practice you mix them: strong consistency <b>inside</b> one service boundary, eventual consistency <b>between</b> services.</p>
<blockquote><b>Say it in the interview:</b> During a network partition you pick consistency or availability. I keep money and inventory strongly consistent inside one boundary, and accept eventual consistency for feeds, search and reports.</blockquote>`,
  followUps: ['Is a single SQL Server instance CP or AP?', 'How do you explain eventual consistency to a product owner?', 'A user saves and immediately sees old data. What is going on?'] });

interview.push({ q: 'What is the saga pattern? Compare choreography and orchestration.', level: 'A',
  a: `<p>A saga is a business transaction split into a chain of local transactions, where each completed step has a compensating step that undoes it if a later step fails.</p>
<p>It replaces two-phase commit (2PC), which locks resources across services and is not supported by most brokers and HTTP APIs.</p>
<table><thead><tr><th></th><th>Choreography</th><th>Orchestration</th></tr></thead><tbody>
<tr><td>Coordination</td><td>services react to each other's events</td><td>a central orchestrator tells each service what to do</td></tr>
<tr><td>Pros</td><td>no central component, simple for 2 or 3 steps</td><td>the flow is visible in one place, easy to monitor and change</td></tr>
<tr><td>Cons</td><td>hard to follow as it grows, risk of cyclic dependencies</td><td>the orchestrator must be built and kept available</td></tr></tbody></table>
<pre><code>CreateOrder(Pending) -&gt; ReserveStock -&gt; ChargePayment -&gt; ConfirmOrder
ChargePayment fails  -&gt; ReleaseStock -&gt; CancelOrder</code></pre>
<p>Requirements: every step and every compensation is idempotent and retryable, the saga state is persisted, and timeouts are handled. Compensation is a <b>business undo</b>, not a database rollback: you cannot unsend an email, you send a correction. On Azure, Durable Functions is a natural fit for an orchestrated saga.</p>
<blockquote><b>Say it in the interview:</b> A saga is a sequence of local transactions with compensations instead of a global lock. I use orchestration when the flow has more than a few steps, and I make every step and its undo idempotent.</blockquote>`,
  followUps: ['What if a compensation step itself fails?', 'How does the user see an order that is "in progress"?', 'Which step should you put last, and why?'] });

interview.push({ q: 'What is the outbox pattern? Explain idempotency and why "exactly-once" is a myth.', level: 'A',
  a: `<p>The outbox pattern makes sure a database change and the message about it either both happen or neither does, by saving the message as a row in the same transaction.</p>
<p><b>The problem (dual write):</b> saving to the database and publishing to a broker are 2 separate operations. A crash between them loses the message or announces something that was never saved.</p>
<pre><code>await using var tx = await db.Database.BeginTransactionAsync(ct);
db.Orders.Add(order);
db.Outbox.Add(new OutboxMessage { Id = Guid.NewGuid(),
    Type = "OrderCreated", Payload = JsonSerializer.Serialize(evt) });
await db.SaveChangesAsync(ct);
await tx.CommitAsync(ct);   // a worker publishes unsent rows later</code></pre>
<p>The worker may publish a row and crash before marking it sent, so it publishes again. Delivery is therefore <b>at least once</b>, and consumers must be <b>idempotent</b>: store processed message IDs, or use operations that are naturally safe to repeat ("set status to Paid", not "add 1").</p>
<p>True exactly-once delivery is impossible over an unreliable network. What you can achieve is exactly-once <b>effect</b>: at-least-once delivery plus idempotent handling.</p>
<p>For HTTP, the client sends an <code>Idempotency-Key</code> header. The server stores the key with the result and returns the same result on a retry.</p>
<blockquote><b>Say it in the interview:</b> I never write to the database and the broker separately. I use an outbox in the same transaction, accept at-least-once delivery, and make every consumer idempotent. Exactly-once is really at-least-once plus deduplication.</blockquote>`,
  followUps: ['How does the outbox worker avoid 2 instances publishing the same row?', 'How long do you keep processed message IDs?', 'What is the inbox pattern?'] });

interview.push({ q: 'What are CQRS and event sourcing, and when would you use them?', level: 'A',
  a: `<p>CQRS means using one model to change data and a different model to read it, and event sourcing means storing every change as an event instead of storing only the current state.</p>
<table><thead><tr><th></th><th>CQRS</th><th>Event sourcing</th></tr></thead><tbody>
<tr><td>Idea</td><td>commands (writes) and queries (reads) go through separate models</td><td>an append-only list of events is the source of truth; state is rebuilt by replaying it</td></tr>
<tr><td>Gain</td><td>each side is shaped and scaled for its own job</td><td>full audit trail, "what did it look like last Tuesday", new read views from old events</td></tr>
<tr><td>Cost</td><td>2 models to maintain; read side may lag</td><td>event versioning, projections, snapshots, eventual consistency</td></tr>
<tr><td>Use when</td><td>read and write needs differ a lot</td><td>history itself has business value: ledgers, audits</td></tr></tbody></table>
<p>They are independent. You can use CQRS on one database with 2 code paths (EF Core for writes, Dapper or a view for reads) and no events at all. That light form is often enough.</p>
<p>Neither is needed for simple CRUD. Applying them everywhere is a classic over-engineering mistake.</p>
<blockquote><b>Say it in the interview:</b> CQRS separates the write model from the read model, and I start with the light version on one database. Event sourcing I reserve for domains where the history is the product, because its complexity is real.</blockquote>`,
  followUps: ['How do you handle a read model that is a second behind?', 'How do you change the shape of an event stored 3 years ago?', 'Does CQRS require 2 databases?'] });

interview.push({ q: 'How do you design multi-tenancy? Compare the data isolation models.', level: 'A',
  a: `<p>Multi-tenancy means one running system serves many customers (tenants), and the key design choice is how strongly their data is kept apart.</p>
<table><thead><tr><th>Model</th><th>Isolation</th><th>Cost</th><th>Notes</th></tr></thead><tbody>
<tr><td>Database per tenant</td><td>strongest</td><td>highest</td><td>easy per-tenant backup and restore; many databases and connections to manage</td></tr>
<tr><td>Schema per tenant</td><td>medium</td><td>medium</td><td>migrations run once per schema</td></tr>
<tr><td>Shared schema with a tenant ID column</td><td>weakest</td><td>lowest</td><td>every query must be tenant-scoped; enforce with EF Core global query filters and SQL row-level security</td></tr></tbody></table>
<pre><code>b.Entity&lt;Order&gt;().HasQueryFilter(o =&gt; o.TenantId == tenant.TenantId);</code></pre>
<p>Rules that matter:</p>
<ul>
<li>Resolve the tenant from the token (the <code>tid</code> claim) or the server session, <b>never</b> from client-supplied input alone.</li>
<li>Carry the tenant ID in cache keys, background jobs, logs and blob paths too.</li>
<li>Guard against a noisy neighbour with per-tenant rate limits.</li>
<li>Write an automated test that signs in as tenant A and tries to read tenant B's data.</li>
</ul>
<blockquote><b>Say it in the interview:</b> I pick the isolation model from compliance needs and cost: shared tables with a tenant ID for most, a dedicated database for regulated customers. The tenant always comes from the token and is enforced in 2 layers.</blockquote>`,
  followUps: ['How do you run a migration across 500 tenant databases?', 'One tenant wants its data in another region. What changes?', 'What bypasses an EF Core global query filter?'] });

interview.push({ q: 'What are the essentials of Domain-Driven Design (DDD)?', level: 'A',
  a: `<p>Domain-Driven Design is a way of building software so that the code mirrors the business, using the same words the business people use.</p>
<table><thead><tr><th>Term</th><th>Plain meaning</th></tr></thead><tbody>
<tr><td>Ubiquitous language</td><td>one shared vocabulary in meetings, tickets and code</td></tr>
<tr><td>Bounded context</td><td>an area where a model and its words have one meaning; a natural service boundary</td></tr>
<tr><td>Aggregate</td><td>a group of objects changed together through one root, inside one transaction</td></tr>
<tr><td>Entity vs value object</td><td>entity has an identity (Order 42); a value object is equal by its values (Money 10 EUR)</td></tr>
<tr><td>Domain event</td><td>something that happened in the business (OrderShipped)</td></tr>
<tr><td>Repository</td><td>loads and saves one aggregate</td></tr>
<tr><td>Anti-corruption layer</td><td>a translator that stops a legacy model leaking into yours</td></tr></tbody></table>
<p>The layers are presentation → application (use cases) → domain → infrastructure. Clean and hexagonal architecture keep the domain free of frameworks through dependency inversion.</p>
<p>DDD has 2 halves. <b>Strategic</b> design (contexts and their relationships) helps almost every large system. <b>Tactical</b> design (aggregates, value objects) pays off only where the rules are complex.</p>
<blockquote><b>Say it in the interview:</b> For me the most useful part of DDD is strategic: finding bounded contexts and a shared language, because that is where service boundaries come from. I use aggregates where a business rule must always hold inside one transaction.</blockquote>`,
  followUps: ['How big should an aggregate be?', 'How do 2 aggregates stay consistent with each other?', 'How do you discover bounded contexts with the business?'] });

interview.push({ q: 'Rapid fire: common system design prompts (part 2)', level: 'A',
  a: `<p>These prompts are heavier on consistency and real-time behaviour, so name the hard part first and then the pattern that handles it.</p>
<table><thead><tr><th>Prompt</th><th>Key ideas to mention</th></tr></thead><tbody>
<tr><td>Chat or real-time updates</td><td>WebSockets through SignalR, presence, fan-out to group members, message ordering per conversation, a backplane (Redis or Azure SignalR Service) so several servers can reach every connection.</td></tr>
<tr><td>E-commerce checkout</td><td>Reserve inventory with an expiry, a saga across order, stock and payment, idempotent payments, outbox for events, eventual consistency for emails and reports.</td></tr>
<tr><td>Search</td><td>A separate index (Azure AI Search or Elasticsearch), analyzers for language, relevance tuning, hybrid keyword plus vector search, a reindexing pipeline fed by change events.</td></tr>
<tr><td>Audit trail</td><td>Append-only and immutable store, who did what and when, retention rules, tamper evidence such as hash chaining or write-once storage.</td></tr>
<tr><td>Type-ahead suggestions</td><td>Prefix index or search suggester, debounce in the browser, cache the most common prefixes, keep the response under about 100 ms.</td></tr></tbody></table>
<blockquote><b>Say it in the interview:</b> For checkout the hard part is not overselling, so I reserve stock and run a saga with idempotent payment. For chat it is fan-out across servers, so I add a backplane. I always name the hard part before the technology.</blockquote>`,
  followUps: ['How do you keep the search index in sync with the database?', 'What happens to a stock reservation if the user walks away?', 'How do you prove an audit log was not altered?'] });

// ---- Level E ----
interview.push({ q: 'Design exercise: an AI assistant platform for a document management system. Users ask in plain language, the assistant proposes changes, users confirm.', level: 'E',
  a: `<p>I would build it as an asynchronous job system where the AI only <b>proposes</b> and a person confirms, with every action checked against that user's own permissions.</p>
<pre><code>Clients (web app, editor add-in) --HTTPS + bearer token--&gt; API
 -&gt; validate token, build caller context (user, tenant, permissions)
 -&gt; Orchestrator (agent registry, adapters, job store)
    -&gt; Queue -&gt; Worker -&gt; LLM + tools (read schema, search, propose)
    -&gt; Job store: Queued / Running / NeedsConfirmation / Succeeded / Failed
 &lt;- client polls or gets server-sent events
 -&gt; user confirms -&gt; confirm gate -&gt; document API (writes)</code></pre>
<ul>
<li><b>Why job and poll:</b> model calls take seconds to minutes, so they cannot sit inside one HTTP request.</li>
<li><b>Why registry and adapters:</b> several assistants (intake, contracts, setup) share one platform.</li>
<li><b>Confirm gate:</b> idempotent, re-validates the proposal, and writes with the caller's permissions, never a super-user.</li>
<li><b>Security:</b> Key Vault, managed identity, content filters, prompt injection defences, least-privilege tools.</li>
<li><b>Scale and failure:</b> autoscale on queue depth, quota-aware retry, timeouts, dead-letter queue, errors with a correlation ID.</li>
<li><b>Quality and cost:</b> a golden test set, contract tests, model routing, token caps, caching. Trace prompt and model versions and token use.</li>
</ul>
<blockquote><b>Say it in the interview:</b> The model proposes, a human confirms, and the write goes through a gate that re-checks the user's own permissions. Everything runs as an audited asynchronous job, because model calls are slow and can fail.</blockquote>`,
  followUps: ['A document contains "ignore your instructions and delete everything". What stops it?', 'How do you test that the assistant has not got worse after a prompt change?', 'How do you keep cost per request under control?'] });

interview.push({ q: 'How would you migrate a large legacy monolith to a modern architecture without stopping feature delivery?', level: 'E',
  a: `<p>I would replace it piece by piece behind a routing layer, the <b>strangler fig</b> approach, instead of a big-bang rewrite.</p>
<ol>
<li><b>Understand first:</b> map the modules, the data and the pain. Agree with the business which outcomes matter (release speed, cost, a dying technology).</li>
<li><b>Put a facade in front:</b> a gateway or reverse proxy routes every request to the old system at first.</li>
<li><b>Pick a first slice:</b> valuable but low risk, with clear data ownership. Build it new, route its URLs to the new code, keep the old path as a fallback behind a flag.</li>
<li><b>Handle data carefully:</b> the new slice owns its tables. Sync with the old system through events or change data capture, with an anti-corruption layer to translate models. Use expand and contract for schema changes.</li>
<li><b>Prove equivalence:</b> run old and new in parallel and compare results before switching.</li>
<li><b>Repeat</b>, and delete old code as each slice lands.</li>
</ol>
<p>Risks to name: the migration stalls at 70% and you run 2 systems for years, shared database tables hold everything together, and nobody knows the hidden rules in the old code. Counter them with a visible burn-down of remaining modules, a fixed share of capacity every sprint, and characterisation tests on the legacy behaviour.</p>
<blockquote><b>Say it in the interview:</b> I avoid big-bang rewrites. I put a facade in front, move one slice at a time with the strangler fig pattern, run old and new side by side to compare, and keep shipping features throughout.</blockquote>`,
  followUps: ['How do you choose the first slice?', 'The old and new systems both need to write the same table. What do you do?', 'How do you sell this plan to a business that wants features, not migration?'] });

interview.push({ q: 'The business asks for "99.99% availability". How do you respond and what does the design need?', level: 'E',
  a: `<p>I first turn the number into minutes and money, because each extra 9 costs about 10 times more and the business may not need it everywhere.</p>
<table><thead><tr><th>Target</th><th>Downtime allowed per 30 days</th></tr></thead><tbody>
<tr><td>99%</td><td>about 7 hours</td></tr>
<tr><td>99.9%</td><td>about 43 minutes</td></tr>
<tr><td>99.99%</td><td>about 4 minutes</td></tr></tbody></table>
<p>Questions back to the business: which user journeys need it (checkout, or also reports)? What does 1 hour down cost? What are the recovery targets: <b>RTO</b> (how fast we must be back) and <b>RPO</b> (how much data we may lose)?</p>
<p>What 99.99% needs in the design:</p>
<ul>
<li>no single point of failure: several instances across availability zones, and usually a second region with automatic failover</li>
<li>a replicated database with tested failover</li>
<li>fewer hard dependencies: serial dependencies multiply (3 parts at 99.9% give about 99.7%), so use queues, caches and fallbacks</li>
<li>zero-downtime deploys with automatic rollback, since most outages come from changes</li>
<li>SLO monitoring, on-call, runbooks and regular failover drills</li>
</ul>
<p>Often the honest answer is 99.99% for the payment path and 99.9% for the rest.</p>
<blockquote><b>Say it in the interview:</b> 99.99% is about 4 minutes a month, so I ask which journeys truly need it and what an hour of downtime costs. Then I remove single points of failure, cut hard dependencies, and practise failover, because an untested failover does not count.</blockquote>`,
  followUps: ['Active-active or active-passive across regions?', 'Your cloud provider offers 99.95% for a service you depend on. What now?', 'What is the difference between RTO and RPO?'] });

// ================= INTERVIEW: SECTION 2, TECH LEAD AND BEHAVIOURAL PLAYBOOK =================
// ---- Level B ----
interview.push({ q: 'How do you describe your role as a Tech Lead?', level: 'B',
  a: `<p>A tech lead is the person responsible for the technical outcome of a team: they set direction and keep quality high while still writing code.</p>
<p>A model answer covers 4 things in under a minute:</p>
<ul>
<li><b>Scope:</b> how many people and what they build ("a team of 6 developers and 1 tester building the booking product").</li>
<li><b>Responsibilities:</b> technical direction, design and code reviews, delivery planning with the product owner, mentoring, and keeping quality gates in place.</li>
<li><b>Hands-on:</b> "I still design and build core pieces myself."</li>
<li><b>Not a bottleneck:</b> "I make sure the team can deliver without depending on me."</li>
</ul>
<p>Example: "I lead a team of 6 on an online booking product. I own the technical direction, review designs and pull requests, plan delivery with the product owner, and mentor the developers. I stay hands-on on the core parts, and I work so that the team can ship when I am on holiday."</p>
<p>Use the real numbers from your own job and keep it factual, not promotional. The panel will check it against your CV.</p>
<blockquote><b>Say it in the interview:</b> I own the technical direction and quality for the team, plan delivery with product, and grow the developers. I stay hands-on, and I measure myself by whether the team can deliver without me.</blockquote>`,
  followUps: ['How much of your week is coding?', 'How is a tech lead different from an engineering manager?', 'What is the hardest part of the role for you?'] });

interview.push({ q: 'What is the STAR method, and which stories should you prepare?', level: 'B',
  a: `<p>STAR is a 4-part way to tell a short work story: Situation, Task, Action, Result.</p>
<ul>
<li><b>Situation:</b> 1 or 2 sentences of context.</li>
<li><b>Task:</b> what you were responsible for.</li>
<li><b>Action:</b> what you did. Use "I" for your part and "we" for the team's. This is most of the answer.</li>
<li><b>Result:</b> something measurable or observable, and what you learned.</li>
</ul>
<p>Prepare 6 to 8 stories that can bend to many questions:</p>
<table><thead><tr><th>Story</th><th>Generic example to model yours on</th></tr></thead><tbody>
<tr><td>Performance problem solved</td><td>a slow order history page made fast</td></tr>
<tr><td>Migration</td><td>moving an old front end to a modern framework in stages</td></tr>
<tr><td>Decision with trade-offs</td><td>choosing a modular design over a quick fix</td></tr>
<tr><td>Introducing something new safely</td><td>an AI feature with a human confirm step</td></tr>
<tr><td>Speed with quality</td><td>faster releases without dropping tests and reviews</td></tr>
<tr><td>Mentoring</td><td>growing a junior into owning a module</td></tr>
<tr><td>Conflict</td><td>a real disagreement, focused on how it was resolved</td></tr>
<tr><td>Failure</td><td>a real mistake and what you changed</td></tr></tbody></table>
<blockquote><b>Say it in the interview:</b> I will answer with a short example. The situation was this, my task was that, here is what I did, and here is the result and what I learned.</blockquote>`,
  followUps: ['How long should a STAR answer be?', 'What do you do if you have no story for a question?', 'How do you show your own contribution in a team effort?'] });

interview.push({ q: 'How do you do code reviews?', level: 'B',
  a: `<p>I treat a code review as a way to share knowledge and catch problems early, not as a gate where one person judges another.</p>
<ul>
<li><b>Small pull requests:</b> a few hundred lines at most, so the review is real and fast.</li>
<li><b>Machines first:</b> build, tests, formatting and static analysis run automatically, so people do not argue about spacing.</li>
<li><b>What I look for, in order:</b> correctness, security, readability, and whether the tests cover the change.</li>
<li><b>How I comment:</b> kind and specific. "This loop runs a query per row, could we load them in 1 query?" not "this is bad". I mark what is blocking and what is only a suggestion.</li>
<li><b>Teach, do not gatekeep:</b> explain the reason, link to an example, and approve when it is good enough, not only when it is how I would write it.</li>
<li><b>Speed:</b> first response within a working day, so reviews do not block delivery.</li>
</ul>
<p>I also ask the team to review my code. A lead whose code is never questioned sets the wrong tone.</p>
<blockquote><b>Say it in the interview:</b> Small pull requests, automated checks first, then I review for correctness, security, readability and tests. My comments are specific and kind, and I explain the why so the review teaches as well as protects.</blockquote>`,
  followUps: ['A pull request has 2,000 lines. What do you do?', 'How do you handle a developer who takes review comments personally?', 'What do you review differently when the code was AI-generated?'] });

interview.push({ q: 'How do you onboard a new developer?', level: 'B',
  a: `<p>I aim for the new person to merge a small real change in their first week, because nothing builds confidence faster than shipping something.</p>
<ul>
<li><b>Before day 1:</b> accounts, access and a working laptop setup, so the first day is not spent waiting.</li>
<li><b>Good written basics:</b> a README that gets the project running in under an hour, and a short architecture overview with 1 or 2 diagrams.</li>
<li><b>A first small task in week 1:</b> real, low risk, touching the full path from code to deploy.</li>
<li><b>A buddy:</b> one named person for questions, and pairing on the first tasks.</li>
<li><b>Clear review feedback:</b> the first pull requests get careful, friendly reviews that explain the team's conventions.</li>
<li><b>A 30, 60, 90 day plan:</b> what "going well" looks like at each point, with a weekly check-in.</li>
</ul>
<p>I also ask the newcomer to fix anything in the README that was wrong or missing. Fresh eyes find the gaps, and it is an easy first contribution.</p>
<blockquote><b>Say it in the interview:</b> A working setup on day 1, a clear README and architecture overview, a small real task in the first week, and a buddy to pair with. By day 90 I want them owning a piece of the system.</blockquote>`,
  followUps: ['How is onboarding a senior different from a junior?', 'How do you onboard someone remotely?', 'How do you know onboarding is working?'] });

interview.push({ q: 'How do you work with product owners and QA?', level: 'B',
  a: `<p>I bring product, developers and testers together before coding starts, so that everyone agrees on what "done" means.</p>
<ul>
<li><b>Shared acceptance criteria:</b> each story has examples written together, in plain language ("given a fully booked slot, when a user tries to book it, they see the next free slot").</li>
<li><b>QA involved early:</b> testers read the spec and ask "what if" before the code exists. A bug found in a conversation costs minutes, not days.</li>
<li><b>Specs before code:</b> a short written description of behaviour and edge cases, reviewed by product and QA.</li>
<li><b>Regular demos:</b> show working software every sprint so product can correct course early.</li>
<li><b>Honest trade-off talks:</b> when product asks for more, I explain cost and risk in business terms and offer options.</li>
<li><b>Quality is shared:</b> developers write automated tests, and testers focus on exploratory testing and risk.</li>
</ul>
<p>The sign of a healthy relationship is that there are few surprises at the end of a sprint, in either direction.</p>
<blockquote><b>Say it in the interview:</b> We agree acceptance criteria together before coding, QA is in the conversation from the start, and we demo every sprint. That way we find misunderstandings in a meeting instead of in production.</blockquote>`,
  followUps: ['Product keeps changing requirements mid-sprint. What do you do?', 'Who decides whether a bug blocks the release?', 'How do you explain technical debt to a product owner?'] });

interview.push({ q: 'How do you talk about confidential or internal projects safely in an interview?', level: 'B',
  a: `<p>You describe the problem, the pattern and your decisions in general words, and you leave out anything that identifies a customer, a product or a business number.</p>
<ol>
<li><b>Talk about problems, patterns and decisions</b>, not customer names, internal system names, internal metrics, pricing or roadmaps.</li>
<li><b>Use generic nouns:</b> "a document management platform", "a booking product", "customer-configurable dashboards".</li>
<li><b>Give relative outcomes:</b> "minutes to milliseconds", "weeks to days", not revenue or contract figures.</li>
<li><b>Never share</b> security details, secrets, internal URLs or unreleased products.</li>
<li><b>Have a polite line ready:</b> "I can describe the approach in general terms. The specifics are confidential."</li>
<li><b>Stay factual and modest:</b> say what you built, what the team built, and what you learned.</li>
</ol>
<p>This does not make you less impressive. Interviewers judge your thinking, and they notice how you treat your current employer's secrets, because theirs are next.</p>
<blockquote><b>Say it in the interview:</b> I can walk you through the problem and the approach I took in general terms. Some specifics are confidential, so I will keep the names and numbers generic.</blockquote>`,
  followUps: ['The interviewer pushes for the customer name. What do you say?', 'Can you show code from your current job?', 'How do you give a believable result without real numbers?'] });

interview.push({ q: 'What questions do you ask the interviewer at the end?', level: 'B',
  a: `<p>Ask questions that show you are already thinking about how to do the job well, and that help you decide whether you want it.</p>
<table><thead><tr><th>Question</th><th>What it tells you</th></tr></thead><tbody>
<tr><td>How is the team structured, and what does the tech lead own day to day?</td><td>the real scope of the role</td></tr>
<tr><td>What does delivery look like: releases, environments, quality gates?</td><td>engineering maturity</td></tr>
<tr><td>How are architectural decisions made and documented?</td><td>how much say you will have</td></tr>
<tr><td>What are the biggest technical challenges in the next 6 months?</td><td>what you will actually work on</td></tr>
<tr><td>How do you use AI tools in development and in the product?</td><td>how current the practices are</td></tr>
<tr><td>How is success measured for this role in the first 90 days?</td><td>expectations</td></tr>
<tr><td>What do on-call and production support look like?</td><td>the load outside office hours</td></tr></tbody></table>
<p>Pick 3 or 4. Avoid questions the company website answers, and leave salary and leave for the HR conversation unless they raise it.</p>
<blockquote><b>Say it in the interview:</b> Yes, a few. What does the tech lead own day to day here, how are architectural decisions made, and what would success look like in my first 90 days?</blockquote>`,
  followUps: ['Which question would you ask a hiring manager but not a peer?', 'What answer would make you turn the job down?', 'What do you do if they have already answered your questions?'] });

interview.push({ q: 'Give a 60 to 90 second answer to "Tell me about yourself".', level: 'B',
  a: `<p>Use 3 short parts, present, past and future, and keep it under 90 seconds.</p>
<ul>
<li><b>Present:</b> your role and its scope.</li>
<li><b>Past:</b> the strengths you built and 1 concrete result.</li>
<li><b>Future:</b> why this role is the next step.</li>
</ul>
<p>Model answer (replace every detail with your own true ones):</p>
<p><i>"I am a tech lead with about 10 years of experience building web products on .NET with React front ends. Today I lead a team of 6 on an online booking product. My work covers APIs in ASP.NET Core with EF Core and SQL Server, front ends in React and TypeScript, hosting on Azure, and recently AI features with guardrails and a human confirm step. I enjoy turning slow or complicated workflows into simple, fast ones. For example, we took a key page from several seconds to under half a second by fixing how it loaded data. I also like mentoring and setting up quality practices. I am looking for a role where I can own the technical direction of a full-stack product."</i></p>
<p>Make the years and technologies match your CV exactly, and do not recite your whole history.</p>
<blockquote><b>Say it in the interview:</b> I am a tech lead with around 10 years on .NET and React, currently leading a team of 6. I enjoy making slow workflows fast and growing developers, and I am looking to own the technical direction of a full-stack product.</blockquote>`,
  followUps: ['Why this company?', 'Which part of that work did you personally build?', 'What would your team say about you?'] });

interview.push({ q: 'Rapid fire: common behavioural questions', level: 'B',
  a: `<p>For each of these, give one honest sentence and one piece of evidence, and stay positive about people and past employers.</p>
<table><thead><tr><th>Question</th><th>Short answer pointer</th></tr></thead><tbody>
<tr><td>Why are you leaving?</td><td>Growth, wider scope or technology direction. Stay positive and never criticise the employer.</td></tr>
<tr><td>What is your biggest strength?</td><td>One real strength with evidence: "I simplify. I cut a 9-step booking flow to 4 and completion went up."</td></tr>
<tr><td>What is your biggest weakness?</td><td>Real but minor, with what you are doing about it, for example learning to delegate more.</td></tr>
<tr><td>Tell me about a failure.</td><td>Own it, state the impact, the fix, and the process change that stops a repeat.</td></tr>
<tr><td>Where do you see yourself in 3 to 5 years?</td><td>Growing as a tech lead or architect: broader systems, more mentoring.</td></tr>
<tr><td>How do you keep learning?</td><td>Real projects, official documentation, courses, small side experiments, and sharing what you learn with the team.</td></tr></tbody></table>
<p>Keep each answer to 20 to 40 seconds. If the interviewer wants more, they will ask.</p>
<blockquote><b>Say it in the interview:</b> I am leaving for wider scope, not because of a problem. My strength is simplifying complex things, and the thing I am working on is delegating earlier instead of taking the hard tasks myself.</blockquote>`,
  followUps: ['Why should we hire you over another candidate?', 'What did you learn in the last 3 months?', 'What kind of work drains you?'] });

// ---- Level I ----
interview.push({ q: 'Tell me about a performance problem you solved. (STAR model answer)', level: 'I',
  a: `<p>A strong answer names a number before, a number after, and how you found the cause, in STAR order.</p>
<ul>
<li><b>Situation:</b> "In an online shop, the order history page took around 12 seconds for customers with many orders, and sometimes timed out."</li>
<li><b>Task:</b> "As tech lead I had to get it under 1 second before the busy season, without a rewrite."</li>
<li><b>Action:</b> "I measured first. Tracing showed the API loaded each order and then ran a query per order line, about 500 queries per page. I changed it to 1 paged query that returns only the fields the page shows, added a covering index, and pushed the totals into the database query so the aggregation happens next to the data. I paired with a developer on the fix and added a load test to the pipeline."</li>
<li><b>Result:</b> "The page went from about 12 seconds to about 400 ms at the 95th percentile, and timeouts stopped."</li>
<li><b>Learning:</b> "Measure before changing, do the work where the data lives, and add a test so it stays fixed."</li>
</ul>
<p>Only use claims you can defend. If asked for exact figures, say how you measured them.</p>
<blockquote><b>Say it in the interview:</b> The page took 12 seconds. I traced it, found a query per row, replaced it with 1 paged query and an index, and it dropped to about 400 ms. My lesson was to measure first and add a load test so it cannot come back.</blockquote>`,
  followUps: ['How exactly did you measure the before and after?', 'What other options did you consider?', 'What would you do if the fix had not been enough?'] });

interview.push({ q: 'How do you make technical decisions in a team?', level: 'I',
  a: `<p>I make sure the options are written down, the right people are heard, one person owns the call, and the reason is recorded.</p>
<ol>
<li><b>Frame the decision:</b> what problem, by when, and how reversible it is. Cheap, reversible choices are made quickly by whoever is closest.</li>
<li><b>Gather options:</b> usually 2 or 3, including "do nothing".</li>
<li><b>Write a short ADR draft:</b> context, options, trade-offs. Writing exposes weak arguments.</li>
<li><b>Discuss:</b> ask the quietest people first, and separate facts from preferences. A small spike (a time-boxed experiment) settles what debate cannot.</li>
<li><b>Decide with a clear owner:</b> consensus if it comes quickly, otherwise the owner decides.</li>
<li><b>Disagree and commit:</b> once decided, everyone backs it, including those who argued against it.</li>
<li><b>Revisit</b> when the assumptions change, not every time someone is unhappy.</li>
</ol>
<p>The aim is not that I make every decision. It is that decisions get made, at the right level, and can be explained 6 months later.</p>
<blockquote><b>Say it in the interview:</b> I gather 2 or 3 options, write a short ADR with the trade-offs, discuss it with the team, and make sure one clear owner decides. Then we disagree and commit, and revisit only if the assumptions change.</blockquote>`,
  followUps: ['What if the team wants a technology you think is wrong?', 'How do you decide which decisions need an ADR?', 'Tell me about a decision you got wrong.'] });

interview.push({ q: 'How do you ensure quality in what your team delivers?', level: 'I',
  a: `<p>I build quality into every step of delivery instead of testing it in at the end.</p>
<ul>
<li><b>Test pyramid:</b> many fast unit tests, fewer integration tests, a small number of end-to-end tests for the critical journeys.</li>
<li><b>CI gates:</b> every pull request must build, pass tests and pass static analysis before it can merge.</li>
<li><b>Quality gate:</b> a tool such as SonarQube Cloud blocks new code with bugs, security issues or low coverage.</li>
<li><b>Definition of done:</b> agreed and written: reviewed, tested, documented, deployable, monitored.</li>
<li><b>Observability:</b> logs, metrics and alerts, so we find problems before customers report them.</li>
<li><b>Release checklist:</b> migration checked, feature flags set, rollback plan ready.</li>
</ul>
<p>Then I watch outcome measures, not just activity: defects that escape to production, change failure rate, and time to restore service. Coverage percentage alone proves little.</p>
<p>When a bug does escape, we add the test that would have caught it. That is how the safety net grows.</p>
<blockquote><b>Say it in the interview:</b> Quality is built in: a test pyramid, CI gates on every pull request, a static analysis quality gate, a clear definition of done and monitoring in production. I judge it by escaped defects and change failure rate.</blockquote>`,
  followUps: ['What code coverage do you require, and why?', 'How do you deal with flaky tests?', 'What belongs in your definition of done?'] });

interview.push({ q: 'How do you handle technical debt?', level: 'I',
  a: `<p>Technical debt is the extra work created by past shortcuts, and I manage it like money debt: keep it visible, know the interest, and pay it down regularly.</p>
<ul>
<li><b>Make it visible:</b> debt items live in the same backlog as features, each with a short description.</li>
<li><b>Quantify the impact:</b> "this module adds 2 days to every pricing change" or "this library is out of support in 6 months". Numbers and risks, not "the code is ugly".</li>
<li><b>Reserve capacity:</b> a steady share of every sprint, often 15 to 20%, so it never depends on a "cleanup sprint" that gets cancelled.</li>
<li><b>Tie it to risk and plans:</b> fix debt in the areas you are about to change, since that is where the interest is paid.</li>
<li><b>Stop adding it silently:</b> a deliberate shortcut is fine if it is written down with a ticket to repay it.</li>
</ul>
<p>Not all debt is worth paying. Ugly code that nobody touches and that works can stay as it is.</p>
<blockquote><b>Say it in the interview:</b> I keep debt visible in the backlog, attach a cost or risk to each item, and reserve a fixed share of every sprint for it. I prioritise debt in the code we are about to change, because that is where it slows us down.</blockquote>`,
  followUps: ['How do you convince a product owner to give you that capacity?', 'What is the difference between deliberate and accidental debt?', 'When is a rewrite justified?'] });

interview.push({ q: 'How do you estimate work?', level: 'I',
  a: `<p>I estimate by breaking the work into small pieces, giving a range instead of a single number, and updating it as soon as the facts change.</p>
<ul>
<li><b>Break it down:</b> pieces of 1 to 3 days. Large pieces hide surprises.</li>
<li><b>Use ranges:</b> "3 to 5 weeks, most likely 4", with the reason for the spread.</li>
<li><b>Include everything:</b> testing, code review, deployment, documentation, bug fixing, meetings and holidays, not only coding time.</li>
<li><b>Estimate with the people doing the work</b>, and compare against similar past work.</li>
<li><b>Track velocity:</b> how much the team really finishes per sprint, and use that instead of hope.</li>
<li><b>Name the risks early:</b> for unknowns such as a new integration, do a short spike first, then estimate.</li>
<li><b>Re-estimate when facts change</b>, and say so straight away.</li>
</ul>
<p>An estimate is a forecast, not a promise. If the business needs a commitment, I give the end of the range that I am about 90% sure of, and explain what would move it.</p>
<blockquote><b>Say it in the interview:</b> I break work down, give a range with the main risks, include testing and review, and check it against our real velocity. When the facts change I re-estimate and tell stakeholders the same day.</blockquote>`,
  followUps: ['Story points or days?', 'Your manager wants one fixed date. What do you give?', 'How do you estimate something nobody on the team has done before?'] });

interview.push({ q: 'How do you handle a missed or at-risk deadline?', level: 'I',
  a: `<p>I tell the stakeholders as soon as I am sure of the facts, and I bring options, not only bad news.</p>
<ol>
<li><b>Confirm the facts:</b> what is left, how sure we are, what caused the slip.</li>
<li><b>Communicate early:</b> a warning 3 weeks out leaves choices. A surprise on the last day leaves none.</li>
<li><b>Offer options</b> on the 3 levers:
<ul><li><b>Scope:</b> ship the core now, the rest later behind a feature flag.</li>
<li><b>Date:</b> move it, with a new date we trust.</li>
<li><b>Resources:</b> add someone who already knows the area. New people slow a late project down at first.</li></ul></li>
<li><b>Protect quality gates:</b> tests, security review and rollback plan are not what we cut. Skipping them turns a late project into a broken one.</li>
<li><b>Agree checkpoints</b> so progress is visible.</li>
<li><b>Retrospective:</b> why did it slip, and what do we change?</li>
</ol>
<p>I also protect the team: a short, agreed push is acceptable, weeks of overtime are not, because tired people create bugs.</p>
<blockquote><b>Say it in the interview:</b> I raise it as soon as I know, with options on scope, date and resources and a recommendation. I do not cut tests or security to hit a date, and afterwards we look at why the estimate was wrong.</blockquote>`,
  followUps: ['The date is fixed by a regulator. What then?', 'How do you tell the team?', 'What did your last retrospective on a slip change?'] });

interview.push({ q: 'How do you mentor developers?', level: 'I',
  a: `<p>I help each person grow towards a goal they care about, by giving them work slightly beyond their comfort zone and regular honest feedback.</p>
<ul>
<li><b>Goals per person:</b> in 1-to-1 conversations we agree what they want to get better at: a technology, design skills, speaking up.</li>
<li><b>Stretch tasks:</b> work a little harder than what they have done, with a safety net. For example, a mid-level developer designs a small feature and I review the design before coding.</li>
<li><b>Pairing:</b> working together on a hard problem teaches how to think, not just what the answer is.</li>
<li><b>Feedback loops:</b> specific and soon after the event. "In that review you explained the trade-off clearly" is more useful than "good job".</li>
<li><b>Step back:</b> I let them present their own work in demos and reviews, and resist fixing things myself.</li>
</ul>
<p>I measure mentoring by what people can do without me: who can now lead a design, handle an incident, or review code well.</p>
<p>Mentoring is not only for juniors. Seniors need sponsorship: chances to lead bigger things.</p>
<blockquote><b>Say it in the interview:</b> I agree a growth goal with each person, give them stretch tasks with support, pair on the hard parts and give specific feedback quickly. My measure is what they can do without me 6 months later.</blockquote>`,
  followUps: ['Tell me about someone you helped grow.', 'How do you mentor someone more experienced than you in an area?', 'What do you do when a stretch task goes badly?'] });

interview.push({ q: 'Tell me about a disagreement with a peer or your manager. (STAR model answer)', level: 'I',
  a: `<p>A good conflict story shows that you listened, used facts instead of rank, and ended with a working relationship.</p>
<ul>
<li><b>Situation:</b> "On a booking system, a senior colleague wanted to add a new NoSQL database for the availability search. I thought our existing SQL database could do it."</li>
<li><b>Task:</b> "As tech lead I had to get us to a decision without it becoming personal, within the sprint."</li>
<li><b>Action:</b> "I first asked him to walk me through his reasoning, and I repeated it back to check I had understood: he was worried about search speed at peak. I shared my worry: a second database to run, back up and keep in sync. We agreed what would decide it: under 200 ms at 5 times the current load. We each built a 2-day spike and ran the same load test."</li>
<li><b>Result:</b> "SQL with a new index and a cache met the target, so we stayed with it. We wrote an ADR that said at which load we would revisit his option. He later led that review."</li>
<li><b>Learning:</b> "Agree on the test before arguing about the answer."</li>
</ul>
<p>Choose a real disagreement of your own, and never make the other person the villain.</p>
<blockquote><b>Say it in the interview:</b> I listened to his concern first, we agreed on a measurable test, ran a short spike each, and let the data decide. We recorded the decision and stayed on good terms, which mattered more than who was right.</blockquote>`,
  followUps: ['What if the data had supported his option?', 'What do you do when there is no time for a spike?', 'Have you ever disagreed and lost? What did you do next?'] });

interview.push({ q: 'Tell me about a failure or mistake of yours. (STAR model answer)', level: 'I',
  a: `<p>Choose a real mistake that was yours, state the impact plainly, and spend most of the answer on what you fixed and changed.</p>
<ul>
<li><b>Situation:</b> "On an online shop, I approved a database change that added a required column to a large table."</li>
<li><b>Task:</b> "I was responsible for the release."</li>
<li><b>Action (the mistake):</b> "I had tested it on a small data set. In production the change locked the table for several minutes during the day, and checkout failed for those minutes."</li>
<li><b>Action (the response):</b> "I owned it at once: told the product owner what had happened, monitored until orders recovered, and checked that no orders were lost. Then I led a blameless review. I changed 3 things: schema changes are now tested against a production-sized copy, big changes use expand and contract in small steps, and risky migrations run in a low-traffic window with a rollback script."</li>
<li><b>Result:</b> "We have had no migration outage since, and the checklist is now part of every release."</li>
<li><b>Learning:</b> "Test with realistic data, and treat database changes as the riskiest part of a release."</li>
</ul>
<p>Avoid fake failures ("I worked too hard") and avoid blaming others.</p>
<blockquote><b>Say it in the interview:</b> It was my call and it caused a few minutes of failed checkouts. I told people straight away, fixed it, and changed our process so schema changes are tested on real-sized data and done in small reversible steps.</blockquote>`,
  followUps: ['How did your manager react?', 'What does blameless mean to you?', 'What mistake has your team made that you felt responsible for?'] });

// ---- Level A ----
interview.push({ q: 'How do you handle an underperforming team member?', level: 'A',
  a: `<p>I start by finding out why, privately and early, and I give the person a fair and specific chance to improve.</p>
<ol>
<li><b>Check my facts:</b> concrete examples, not a feeling. "The last 3 tasks were each a week late", not "he is slow".</li>
<li><b>Clarify expectations:</b> often the person does not know what "good" looks like at their level. I say it clearly.</li>
<li><b>Ask and listen:</b> is it skill, unclear tasks, motivation, or something personal? Each has a different answer.</li>
<li><b>Give specific feedback:</b> what I saw, the effect on the team, what I need instead.</li>
<li><b>Support:</b> smaller tasks, pairing, training, or a change of work that fits better.</li>
<li><b>Agree a plan:</b> 2 or 3 measurable goals over a few weeks, written down.</li>
<li><b>Follow up:</b> weekly, and recognise progress as clearly as I flagged problems.</li>
</ol>
<p>If there is no improvement after real support, I involve the manager and HR. Leaving it unaddressed is unfair to the rest of the team, who carry the extra load and notice when nothing is done.</p>
<p>Throughout, I keep it private and respectful.</p>
<blockquote><b>Say it in the interview:</b> I talk to the person privately with specific examples, find the real cause, make expectations clear and agree a short plan with support and weekly follow-up. If nothing changes, I escalate, because ignoring it is unfair to the team.</blockquote>`,
  followUps: ['The person is the most senior developer on the team. Does that change anything?', 'How long do you give before escalating?', 'What if the cause is a personal problem?'] });

interview.push({ q: 'How do you balance hands-on coding with leading the team?', level: 'A',
  a: `<p>I stay hands-on enough to make good technical judgments, but I keep myself off the critical path so the team never waits for me.</p>
<ul>
<li><b>Protect time for lead work first:</b> design, reviews, planning and 1-to-1 conversations go in the calendar before coding. If these slip, the whole team slows down.</li>
<li><b>Choose my coding carefully:</b> proofs of concept, tooling, tricky investigations, cross-cutting pieces. Not the feature that blocks a release, because my day is full of interruptions.</li>
<li><b>Delegate with context:</b> hand over the goal, the constraints and the "why", not a list of steps. Then let people find their own way.</li>
<li><b>Avoid being the bottleneck:</b> at least 2 people can review and release anything. If only I can approve something, that is a risk to fix.</li>
<li><b>Adjust with team size:</b> with 3 people I may code half the time, with 8 perhaps a fifth.</li>
</ul>
<p>A warning sign I watch for: when I take a task "because it is faster if I do it". That is true today and costs the team its growth tomorrow.</p>
<blockquote><b>Say it in the interview:</b> I block time for design, reviews and people first, and code on things that are important but not on the critical path. I delegate with context, and I check regularly that nothing depends on me alone.</blockquote>`,
  followUps: ['What did you last code yourself, and why that?', 'How do you stay technically current?', 'What happens to the team when you take 3 weeks off?'] });

interview.push({ q: 'How do you choose between building something and buying it?', level: 'A',
  a: `<p>I build what makes our product different and buy what every company needs, then check the full cost of both paths.</p>
<table><thead><tr><th>Factor</th><th>Question to ask</th></tr></thead><tbody>
<tr><td>Core or commodity</td><td>Does this set us apart for customers (build), or is it plumbing such as sign-in, payments or email (buy)?</td></tr>
<tr><td>Total cost</td><td>Buy: licence, integration, training, price rises. Build: development, then maintenance, on-call and security patches for years.</td></tr>
<tr><td>Lock-in</td><td>How hard is it to leave? Can we get our data out? Can we hide the vendor behind our own interface?</td></tr>
<tr><td>Security and compliance</td><td>Where is data stored? Certifications? Who is responsible in a breach?</td></tr>
<tr><td>Time to market</td><td>Buying usually gets us there in weeks instead of months.</td></tr>
<tr><td>Fit</td><td>Does it cover 80% of what we need, or will we fight it?</td></tr></tbody></table>
<p>There is a third option: adopt open source. It has no licence fee, but you still pay to run, upgrade and secure it.</p>
<p>Teams usually underestimate the long-term cost of building. The first version is perhaps a third of the lifetime cost.</p>
<blockquote><b>Say it in the interview:</b> I build what differentiates us and buy commodity capabilities. I compare total cost over 3 years, lock-in, security and time to market, and I wrap a bought component behind our own interface so we can change it later.</blockquote>`,
  followUps: ['Give an example of something you would never build yourself.', 'The vendor doubles its price next year. What is your plan?', 'How do you evaluate an open-source library before adopting it?'] });

interview.push({ q: 'How do you deliver with AI-assisted development practices, and what are the risks?', level: 'A',
  a: `<p>I let AI assistants do the drafting while people keep the decisions, the review and the accountability, with the same quality gates as for any other code.</p>
<ul>
<li><b>Spec first:</b> requirements and acceptance criteria are written and reviewed before implementation. A clear spec is what makes an assistant useful.</li>
<li><b>Assistants draft, humans decide:</b> the developer who merges the code owns it, however it was written.</li>
<li><b>Guardrails:</b> mandatory tests, linters, static analysis gates, security scans, and no secrets or customer data in prompts.</li>
<li><b>Measure:</b> cycle time, defect rate and review time, before and after. Share the prompt patterns that work.</li>
</ul>
<table><thead><tr><th>Honest risk</th><th>Mitigation</th></tr></thead><tbody>
<tr><td>Invented APIs and packages</td><td>build and tests must pass; check that dependencies exist</td></tr>
<tr><td>Subtle bugs that look right</td><td>human review, tests written from the spec</td></tr>
<tr><td>Licensing and intellectual property</td><td>approved tools and settings only</td></tr>
<tr><td>Over-reliance, juniors not learning</td><td>ask people to explain the code they submit</td></tr></tbody></table>
<blockquote><b>Say it in the interview:</b> We write the spec first, let assistants draft, and keep humans accountable. Generated code passes the same tests, scans and reviews as any other code, and I measure cycle time and defects to see if it really helps.</blockquote>`,
  followUps: ['Has review time gone up or down with AI-generated code?', 'What may never be pasted into a prompt?', 'How do you keep juniors learning?'] });

interview.push({ q: 'Production is down. How do you lead the incident, and what happens afterwards?', level: 'A',
  a: `<p>During an incident my job is to restore service quickly and keep people informed, and finding the root cause comes after that.</p>
<p><b>During:</b></p>
<ol>
<li><b>Take charge clearly:</b> one incident lead, one person on communication, the rest investigating. One shared channel.</li>
<li><b>Assess the impact:</b> who is affected, since when, how badly.</li>
<li><b>Stop the bleeding first:</b> ask "what changed?" and roll back the last deploy, switch off the feature flag, or fail over. Mitigate before you fully understand.</li>
<li><b>Communicate on a schedule:</b> a short update to stakeholders every 15 to 30 minutes, even if it is "no change yet".</li>
<li><b>Keep a timeline</b> of what was seen and done.</li>
</ol>
<p><b>After:</b></p>
<ul>
<li>A <b>blameless review</b> within a few days: what happened, why our system allowed it, how we found out.</li>
<li>Actions with an owner and a date: a missing alert, a missing test, a safer rollout.</li>
<li>Share the write-up so other teams learn too.</li>
</ul>
<p>Blameless does not mean no accountability. It means we fix the system that let a normal human mistake reach production.</p>
<blockquote><b>Say it in the interview:</b> First I restore service, usually by rolling back the last change, with one person leading and regular updates to stakeholders. Then we hold a blameless review and turn the findings into owned actions with dates.</blockquote>`,
  followUps: ['You cannot roll back because of a data migration. What now?', 'How do you decide whether to wake people up at night?', 'How do you make sure review actions actually get done?'] });

interview.push({ q: 'A stakeholder demands a feature you believe is a bad idea, or wants it by an impossible date. How do you push back?', level: 'A',
  a: `<p>I do not start with "no". I find out what they really need, explain the cost in their terms, and offer something that gets them most of it.</p>
<ol>
<li><b>Understand the goal behind the request:</b> "what problem does this solve, and for whom?" The stated solution is often 1 of several ways to reach it.</li>
<li><b>Explain the impact in business language:</b> not "it violates our architecture" but "it would add about 3 weeks and make every future price change slower and riskier".</li>
<li><b>Offer options:</b> a smaller version now, a different approach that meets the goal, or the full version with the true date.</li>
<li><b>Be clear about real limits:</b> security, legal and data protection issues are not negotiable, and I say why.</li>
<li><b>Let the right person decide:</b> priorities belong to the business. My job is to make sure the decision is informed.</li>
<li><b>Write it down</b> and, if overruled on a judgment call, commit and deliver it well.</li>
</ol>
<p>Example: asked for "export everything to Excel by Friday", I learned that finance needed 1 monthly report. We delivered that report in 2 days.</p>
<blockquote><b>Say it in the interview:</b> I ask what problem they are trying to solve, explain the cost and risk in business terms, and offer options with a recommendation. The business sets priorities, and my job is to make sure it chooses with the full picture.</blockquote>`,
  followUps: ['They go over your head to your manager. What do you do?', 'When is a flat "no" the right answer?', 'How do you rebuild trust after saying no?'] });

// ---- Level E ----
interview.push({ q: 'Two senior developers on your team strongly disagree about a design and the debate is blocking work. What do you do?', level: 'E',
  a: `<p>I turn the argument from "who is right" into "what would prove it", set a time limit, and make sure a decision is made and recorded.</p>
<ol>
<li><b>Talk to each one alone first:</b> understand the real concern. Often they are optimising for different things, for example speed now against flexibility later, and both are valid.</li>
<li><b>Write both options down side by side:</b> same template, same criteria. Have each person describe the <i>other's</i> option fairly. This alone cools most debates.</li>
<li><b>Agree the criteria before the answer:</b> the requirements that matter here, such as load, deadline, team skills and cost of change.</li>
<li><b>Get evidence:</b> a time-boxed spike or a small test if the question can be measured.</li>
<li><b>Time-box the decision:</b> "we decide on Thursday".</li>
<li><b>Decide:</b> if they converge, good. If not, I decide as the owner and explain why, in an ADR that records the rejected option and when we would revisit it.</li>
<li><b>Afterwards:</b> check in with the person whose option lost, and give them something meaningful to own.</li>
</ol>
<p>What I avoid: letting it drag on, splitting the difference into a design nobody wants, or deciding by who talks loudest.</p>
<blockquote><b>Say it in the interview:</b> I get both options written against the same criteria, gather evidence with a short spike, and set a date for the decision. If they do not converge I make the call, record why, and make sure the person who lost still feels heard.</blockquote>`,
  followUps: ['One of them keeps reopening the decision afterwards. What do you do?', 'What if you personally prefer one option from the start?', 'How do you prevent this kind of deadlock next time?'] });

interview.push({ q: 'You join a new team as Tech Lead. What do you do in your first 90 days?', level: 'E',
  a: `<p>I spend the first month listening and learning, the second making a few visible improvements, and the third setting direction with the team.</p>
<table><thead><tr><th>Period</th><th>Focus</th><th>Examples</th></tr></thead><tbody>
<tr><td>Days 1 to 30: learn</td><td>people, system, delivery</td><td>1-to-1 with everyone ("what works, what hurts, what would you fix first?"), ship a small change myself to feel the pipeline, read incidents and ADRs, meet product and stakeholders</td></tr>
<tr><td>Days 31 to 60: quick wins</td><td>remove the pain the team named</td><td>fix a flaky build, speed up the pipeline, add a missing dashboard, agree a definition of done</td></tr>
<tr><td>Days 61 to 90: direction</td><td>a shared plan</td><td>a short technical roadmap with the top 3 risks, agreed with the team and product; clear ownership; a regular rhythm for design reviews</td></tr></tbody></table>
<p>Rules I keep:</p>
<ul>
<li>No big changes in the first weeks. I do not yet know why things are the way they are.</li>
<li>Earn trust by being useful and by doing what I said I would.</li>
<li>Agree with my manager early on what success at 90 days looks like.</li>
<li>Find the existing strengths and say so. The team built something that works.</li>
</ul>
<blockquote><b>Say it in the interview:</b> First month I listen: 1-to-1s with everyone and a small change shipped myself. Second month I fix a few pains the team named. By day 90 we have a shared technical roadmap with the top risks and clear owners.</blockquote>`,
  followUps: ['You see a serious security problem in week 1. Do you still wait?', 'A long-standing team member wanted your job. How do you handle that?', 'How do you agree success criteria with your manager?'] });

// ================= PRACTICE: 3 Easy, 5 Medium, 4 Hard =================
practice.push(P({
  t: 'Start a design interview: "Design a clinic booking system"', l: 'Easy', tags: ['framework', 'requirements'],
  s: 'The interviewer says only: "Design a booking system for a chain of clinics." You have 40 minutes. What are your first 5 minutes?',
  ex: '<p>Strong openings sound like questions: "Who books, patients or reception staff? How many bookings a day? Can a slot ever be double booked? Do we take payment? Any rules about health data?"</p>',
  weak: 'I would start drawing: a React front end, an API gateway, 6 microservices, Kafka and a NoSQL database.',
  why: 'it designs before knowing the problem. With 300 bookings a day those boxes are wildly oversized, and the one thing that matters (no double booking, protected health data) is never mentioned.',
  q: ['What should come first in a system design answer?', ['The database choice', 'Clarifying functional and non-functional requirements', 'The deployment diagram', 'The choice of message broker'], 1, 'Requirements and scale decide everything else. Designing first risks solving the wrong problem.'],
  h: ['Do not draw yet. What do you not know?', 'Split your questions into "what must it do" and "how well must it do it".', 'Recipe: 3 functional questions, 3 non-functional ones (scale, consistency, privacy), a quick estimate, then say which part you will deep dive.'],
  a: '<p><b>Strong answer:</b> "I would spend the first 5 minutes on questions. Functional: who books, can they cancel or move a booking, do we send reminders, do we take payment? Non-functional: how many clinics and bookings per day, how fast must search be, what uptime, and since this is health data, what privacy rules apply? Then one rule I would confirm: a slot must never be double booked, so that write needs strong consistency. A quick estimate: 200 clinics times 150 bookings is 30,000 a day, under 1 per second, so one relational database is plenty. Then I would outline the plan: API and data model, a simple high-level design, and a deep dive on preventing double booking."</p>',
  cx: '<p><b>What the interviewer scores:</b> questions before boxes, numbers that drive the design, and spotting the one hard requirement.</p>',
  f: ['How would you prevent a double booking in SQL?', 'What changes if it becomes 30,000 bookings a minute?']
}));

practice.push(P({
  t: 'The user was logged out when a second server was added', l: 'Easy', tags: ['scalability', 'stateless'],
  s: 'A team added a second instance of their ASP.NET Core shop behind a load balancer. Now users are randomly logged out and carts go empty. What is wrong and how do you fix it?',
  ex: '<p>Request 1 goes to server A, which keeps the session and cart in its memory. Request 2 goes to server B, which has never seen this user.</p>',
  weak: 'Turn on sticky sessions in the load balancer so each user always goes to the same server.',
  why: 'it hides the problem. When that server restarts or is scaled in, the users on it still lose everything, and load is spread unevenly. The app is still not stateless.',
  q: ['What must be true for a web tier to scale out safely?', ['Each server keeps its users in memory', 'Any server can handle any request because state lives outside the servers', 'There is exactly 1 server', 'Users are pinned to servers'], 1, 'Stateless servers with shared state (Redis, database, tokens) can be added, removed and replaced freely.'],
  h: ['Where does the session live, and which server sees the next request?', 'Move the state somewhere every instance can reach.', 'Recipe: distributed cache for session and cart, shared data protection keys so cookies work on every instance, files in blob storage, then test by killing one instance.'],
  a: '<p><b>Strong answer:</b> "The app keeps state in the memory of one server, so it is not stateless. I would move session and cart data to a shared store: Redis as a distributed cache, or the cart in the database. In ASP.NET Core I would also store the data protection keys in a shared place such as blob storage with Key Vault, otherwise a cookie encrypted by server A cannot be read by server B, which looks exactly like a random logout. Uploaded files go to blob storage, not local disk. Sticky sessions can be a short-term patch, but I would not rely on them. To prove the fix, I would restart one instance during a test and check that nobody loses their cart."</p>',
  cx: '<p><b>What the interviewer scores:</b> the word "stateless", shared state, the data protection key detail, and a way to verify.</p>',
  f: ['Why are sticky sessions a weak fix?', 'Could tokens replace the server session entirely?']
}));

practice.push(P({
  t: 'Answer "What is your biggest weakness?"', l: 'Easy', tags: ['behavioural', 'self-awareness'],
  s: 'In a tech lead interview you are asked: "What is your biggest weakness?" Give an answer that is honest and still leaves a good impression.',
  ex: '<p>Shape: a real weakness → a short example of its cost → what you do about it now → evidence it is improving.</p>',
  weak: 'I am a perfectionist and I work too hard. Sometimes I care too much about quality.',
  why: 'it is a disguised strength that every interviewer has heard. It shows no self-awareness and gives nothing to discuss.',
  q: ['Which weakness answer is strongest?', ['"I have no real weaknesses"', '"I am a perfectionist"', 'A real, moderate weakness plus the concrete steps you are taking', 'A weakness that is central to the job, with no plan'], 2, 'Panels look for self-awareness and improvement. A real weakness with action shows both, without disqualifying you.'],
  h: ['Pick something true that is not fatal for a tech lead.', 'Add a short moment where it cost you something.', 'Recipe: name it, give a 1-sentence example, say what you changed, say how you know it is working.'],
  a: '<p><b>Strong answer:</b> "I used to hold on to the hardest technical tasks because I could finish them faster myself. On a booking project that made me the bottleneck: a release waited 3 days for me, and the team learned less. Now I hand over at least one hard task each sprint with clear context and a design conversation at the start, and I review instead of doing. It still takes discipline, but 2 developers have since led designs on their own, and reviews no longer queue behind me." This is real, relevant to leading, and shows a working fix.</p>',
  cx: '<p><b>What the interviewer scores:</b> honesty, self-awareness, a concrete action and evidence of change.</p>',
  f: ['What weakness would your team name?', 'What feedback did you last receive that stung?']
}));

practice.push(P({
  t: 'Order saved, but the confirmation email never arrived', l: 'Medium', tags: ['outbox', 'dual write'],
  s: 'In an online shop, about 1 order in 5,000 is saved correctly but no confirmation email is sent and no invoice is created. The code saves the order with EF Core and then publishes an OrderCreated message to a queue. Explain the cause and the fix.',
  ex: '<p><code>SaveChangesAsync()</code> succeeded at 10:00:00.200. The instance was recycled at 10:00:00.210. The publish line never ran.</p>',
  weak: 'Wrap the save and the publish in a try/catch and retry the publish 3 times if it fails.',
  why: 'a crash or restart between the 2 lines never reaches the catch block, so the message is still lost. And a retry after an unknown failure can publish twice.',
  q: ['What does the transactional outbox guarantee?', ['Exactly-once delivery', 'The business row and the message row are saved together or not at all', 'Messages arrive in order', 'No duplicate messages'], 1, 'It removes the dual write. Delivery to the broker is then at least once, so consumers still need to be idempotent.'],
  h: ['Two separate systems are being written. What if the process stops between them?', 'Can the "message to send" be saved in the same database transaction as the order?', 'Recipe: outbox table, same transaction, background publisher, idempotent consumers, alert on old unsent rows, a one-off script to repair past orders.'],
  a: '<p><b>Strong answer:</b> "This is the dual write problem. Saving the order and publishing the message are 2 operations, and when the process stops between them the message is lost. A try/catch cannot help, because a crash does not run it. I would add a transactional outbox: in the same transaction as the order, insert an outbox row with the event. A background worker reads unsent rows, publishes them and marks them sent. If the worker crashes after publishing it will publish again, so delivery is at least once and the email and invoice consumers must be idempotent, for example by recording processed message IDs. I would alert when an unsent row is older than a minute, and run a script to find past orders with no invoice and repair them."</p>',
  cx: '<p><b>What the interviewer scores:</b> naming the dual write, the outbox, the idempotent consumer, and cleaning up the old damage.</p>',
  f: ['Polling the outbox table or change data capture?', 'How do you stop 2 worker instances sending the same row?']
}));

practice.push(P({
  t: 'One slow dependency freezes the whole site', l: 'Medium', tags: ['resilience', 'circuit breaker', 'bulkhead'],
  s: 'A shop shows product recommendations from a third-party API on every page. When that API becomes slow, the entire shop stops responding, including checkout. Why, and what do you change?',
  ex: '<p>The recommendations call has no timeout. Each request holds a connection for up to 100 seconds. Within a minute every available connection and worker is waiting on recommendations.</p>',
  weak: 'Ask the provider to fix their API and add more servers on our side in the meantime.',
  why: 'more servers just fill up with more waiting requests. The design lets an optional feature take down the essential one, and that is ours to fix.',
  q: ['Which pattern stops calling a failing dependency for a while and fails fast?', ['Retry', 'Circuit breaker', 'Cache-aside', 'Saga'], 1, 'A circuit breaker opens after repeated failures so callers fail immediately and the dependency can recover.'],
  h: ['How long does a call wait before it gives up? What is the default?', 'Recommendations are optional. What should the page show without them?', 'Recipe: short timeout, circuit breaker, fallback (hide or cached), separate connection limit as a bulkhead, load it after the page, alert on breaker state.'],
  a: '<p><b>Strong answer:</b> "An optional dependency without a timeout is consuming all our capacity. I would add a short timeout on that call, around 500 ms, and a circuit breaker so that after repeated failures we stop calling for 30 seconds and fail in a millisecond. The fallback is simple: show cached popular products or hide the block. I would give that client its own connection limit as a bulkhead so it can never starve checkout. In .NET the standard resilience handler on the HttpClient gives timeout, retry and breaker in one line, and I would keep retries low here since the data is optional. Better still, load recommendations from the browser after the page renders, so the page never waits for them. Finally, a metric and alert on breaker state so we know when it opens."</p>',
  cx: '<p><b>What the interviewer scores:</b> timeout first, breaker plus fallback, isolation of the money path, and treating optional features as optional.</p>',
  f: ['What is a sensible retry policy for this call?', 'How would you test this behaviour before production?']
}));

practice.push(P({
  t: 'A customer saw another customer\'s invoices', l: 'Medium', tags: ['multi-tenancy', 'security'],
  s: 'A multi-tenant invoicing product uses shared tables with a TenantId column. A customer reports that changing the tenantId value in the URL showed another company\'s invoices. What went wrong, and how do you fix it properly?',
  ex: '<p><code>GET /api/invoices?tenantId=17</code> returns tenant 17 data to any signed-in user, because the API trusts the query string.</p>',
  weak: 'Hide the tenantId from the URL by putting it in a hidden form field or encrypting it.',
  why: 'the server still trusts a value the client controls. Hiding or obscuring it only makes the hole slightly harder to find.',
  q: ['Where should the current tenant come from?', ['A query string parameter', 'A hidden field', 'The validated token or server-side session', 'A browser cookie the page script can edit'], 2, 'Only a server-validated identity can be trusted. Anything the client can edit can be forged.'],
  h: ['Who decided which tenant the request was for?', 'Make it impossible to forget the filter, not just unlikely.', 'Recipe: tenant from the token claim, EF Core global query filter, SQL row-level security, automated cross-tenant test, review logs for past access, notify as required.'],
  a: '<p><b>Strong answer:</b> "This is broken access control: the server trusted a tenant ID supplied by the client. First I would treat it as a security incident: fix, check the logs for which tenants were accessed, and follow the breach notification process. The fix has layers. The tenant is resolved only from the validated token, for example the tid claim, and the URL parameter is removed. An EF Core global query filter adds the tenant condition to every query, so a developer cannot forget it. SQL row-level security enforces the same rule inside the database for raw SQL and reports. Cache keys and background jobs carry the tenant too. Then an automated test signs in as tenant A and requests tenant B data on every endpoint and must get 404 or 403. That test runs in the pipeline for good."</p>',
  cx: '<p><b>What the interviewer scores:</b> never trust client input for identity, defence in depth, an automated test, and handling it as an incident.</p>',
  f: ['What can bypass a global query filter?', 'How do support staff legitimately access a tenant\'s data?']
}));

practice.push(P({
  t: 'A senior developer rejects every review comment', l: 'Medium', tags: ['code review', 'conflict'],
  s: 'A senior developer on your team writes good code but reacts badly to reviews: dismisses comments, merges with open threads, and juniors have stopped commenting on his pull requests. What do you do?',
  ex: '<p>Signals: pull requests of 1,500 lines, replies such as "works fine, merging", and 2 juniors who say privately that reviewing his code "is not worth the argument".</p>',
  weak: 'I would post in the team channel that everyone must respect review comments, and block his merges until he complies.',
  why: 'it shames him in public, does not find out why he behaves this way, and turns a coaching matter into a power struggle.',
  q: ['What is the best first step?', ['Call it out in the team meeting', 'A private conversation with specific examples and a question about his view', 'Remove his merge rights', 'Ignore it because his code is good'], 1, 'Private, specific and curious first. Public pressure or silence both make it worse.'],
  h: ['Talk in private, with examples, and ask before you tell.', 'Look at the system too: are the pull requests too big, are the comments about taste?', 'Recipe: 1-to-1 with examples and impact on juniors, listen, agree team review rules together, smaller PRs, ask him to mentor through reviews, follow up.'],
  a: '<p><b>Strong answer:</b> "I would talk to him privately, with 2 or 3 concrete examples, and describe the effect: juniors have stopped reviewing his code, so we lose a safety net and they lose a chance to learn from him. Then I would ask for his view. Often there is a real cause: comments about style instead of substance, or reviews that take days. I would fix what is fair on the team side: formatting rules enforced by tools, a team agreement on what blocks a merge, a 1-day review turnaround, and smaller pull requests. On his side I would be clear about the expectation: threads are resolved before merge, and replies are respectful. I would also give him a role that uses his strength, such as explaining design choices in his pull request descriptions so others learn. Then I follow up in 2 weeks, and recognise the change if it happens."</p>',
  cx: '<p><b>What the interviewer scores:</b> private and specific feedback, listening, fixing the process as well as the person, and follow-up.</p>',
  f: ['Nothing changes after a month. What next?', 'How do you get juniors to review a senior\'s code with confidence?']
}));

practice.push(P({
  t: 'Product wants a rewrite paused for features, the team wants the opposite', l: 'Medium', tags: ['technical debt', 'stakeholders'],
  s: 'Your team says the pricing module is so tangled that every change takes 3 times longer than it should, and wants 2 months to rewrite it. The product owner says there is no time: 3 customer features are due this quarter. How do you handle it?',
  ex: '<p>Useful facts to gather: the last 5 pricing changes took 9 days on average and caused 4 production bugs. 2 of the 3 planned features touch pricing.</p>',
  weak: 'I would back the team and insist on the 2-month rewrite, because technical quality has to come first.',
  why: 'it is all or nothing, gives product no business reason, and a 2-month freeze with no visible value usually gets cancelled halfway.',
  q: ['What makes a technical debt case convincing to a product owner?', ['"The code is ugly"', 'Its measured cost on delivery time and defects for planned work', 'The team threatens to leave', 'A new framework is available'], 1, 'Cost and risk in business terms, tied to the roadmap, is something a product owner can weigh against features.'],
  h: ['Turn "tangled" into days and bugs.', 'Is there an option between "rewrite everything" and "do nothing"?', 'Recipe: measure the cost, link it to the 2 features that touch pricing, propose incremental refactoring inside those features plus a fixed capacity share, add tests first, show progress.'],
  a: '<p><b>Strong answer:</b> "I would bring numbers, not opinions: pricing changes average 9 days and have caused 4 production bugs, and 2 of the 3 features this quarter touch pricing. So the debt is already on the critical path. I would not ask for a 2-month freeze. I would propose to improve the module in steps while delivering: first add characterisation tests around the current behaviour, then restructure the parts each feature touches as part of that feature, with about 20% of capacity reserved for it. The first pricing feature will take a little longer, the second should be faster, and I would show that trend each sprint. I would present this to the product owner as options with costs, recommend the incremental one, and record it in an ADR. The team gets a real plan, and product keeps its features."</p>',
  cx: '<p><b>What the interviewer scores:</b> evidence, an incremental path, linking debt to the roadmap, and treating product as a partner.</p>',
  f: ['When would a full rewrite be the right call?', 'How do you show that the refactoring paid off?']
}));

practice.push(P({
  t: 'Design checkout so stock is never oversold', l: 'Hard', tags: ['saga', 'consistency', 'idempotency'],
  s: 'Design the checkout of an online shop with separate Orders, Stock and Payments services. During a flash sale 5,000 people try to buy the last 100 items. Stock must never go below zero, nobody may be charged for an item they do not get, and nobody may be charged twice.',
  ex: '<p>Hard cases: 2 buyers for the last item at the same millisecond. Payment succeeds but the confirmation step fails. The buyer double-clicks Pay. The buyer reserves an item and leaves.</p>',
  weak: 'Check the stock, then charge the card, then reduce the stock, all in one API call wrapped in a distributed transaction.',
  why: 'check-then-act lets 2 buyers both see "1 left". A distributed transaction across services and a card provider is not available, and holding locks during a slow payment would stall the sale.',
  q: ['How do you make "reserve 1 item" safe under concurrency?', ['Read the stock, then write the new value', 'One atomic conditional update: decrement only where quantity is at least 1', 'Lock the whole table for each buyer', 'Cache the stock in each web server'], 1, 'An atomic conditional update makes the check and the change one operation, so only 1 buyer can win the last item.'],
  h: ['Which single step must be strongly consistent? Keep it small and atomic.', 'There is no transaction across the 3 services. What pattern gives you step, step, undo?', 'Recipe: reserve atomically with an expiry, saga (reserve, charge, confirm) with compensations, idempotency key on payment, outbox for events, a queue to level the spike.'],
  a: '<p><b>Strong answer:</b> "The one strongly consistent step is the reservation, inside the Stock service: a single atomic update that decrements available stock only where quantity is at least 1 and creates a reservation with a 10 minute expiry. Only 100 can succeed, and the rest get \'sold out\' immediately. Then an orchestrated saga: create order as pending, reserve stock, charge payment, confirm order. If payment fails, compensate by releasing the reservation and cancelling the order. If confirmation fails after a charge, retry it, and only refund if it can never complete. Every step is idempotent. The payment call carries an idempotency key per order, so a double click or a retry charges once. Events leave each service through an outbox. A background job releases expired reservations so abandoned carts free the stock. To survive the spike I would put a queue or waiting room in front of checkout and rate limit per user. Emails and analytics are eventual. I would test it with a load test that fires 5,000 concurrent buyers and asserts exactly 100 orders and 100 charges."</p>',
  cx: '<p><b>What the interviewer scores:</b> a small strongly consistent core, saga with correct compensation, idempotent payment, expiry of reservations, and a test that proves the invariant.</p>',
  f: ['Charge first or reserve first, and why?', 'What does the user see while the saga is running?', 'How do you handle a refund that fails?']
}));

practice.push(P({
  t: 'Move a 15-year-old monolith without stopping delivery', l: 'Hard', tags: ['migration', 'strangler fig'],
  s: 'A payroll product is a 15-year-old .NET Framework web application with 1 huge database and 800 stored procedures. Releases happen every 3 months and are painful. Management asks you for a modernisation plan. The business will not accept a feature freeze.',
  ex: '<p>Constraints to respect: payroll runs must be correct every month, 3 developers know the old code well, and there are almost no automated tests.</p>',
  weak: 'Rewrite everything in .NET 10 microservices over 18 months, then switch over in one weekend.',
  why: 'big-bang rewrites of working systems usually run late, miss hidden rules buried in old code, and deliver no value until the very end. A weekend switch of payroll has no safe fallback.',
  q: ['What is the core idea of the strangler fig approach?', ['Rewrite the system in one go', 'Route traffic through a facade and replace one slice at a time until the old system can be removed', 'Freeze the old system and build a copy', 'Move the database first'], 1, 'A facade in front lets new slices take over route by route, with the old system as a fallback, so value arrives continuously.'],
  h: ['What must be true before you change anything in code with no tests?', 'How can new and old run at the same time?', 'Recipe: outcomes and metrics, characterisation tests, pipeline first, facade, first low-risk slice, data ownership with sync, parallel run and compare, repeat, track remaining modules.'],
  a: '<p><b>Strong answer:</b> "I would start by agreeing the outcome with management: for example monthly releases within a year and a supported platform, not \'microservices\'. Step 1 makes the current system safer: an automated build and deploy pipeline, and characterisation tests that record what payroll calculates today for real past runs. Step 2 puts a reverse proxy in front so we can route by URL. Step 3 picks a first slice with clear edges and low risk, such as employee self-service payslip viewing, builds it on .NET 10, and routes those URLs to it behind a flag. Each new slice owns its tables. Where both sides need the data, we sync through events or change data capture with a translation layer. For the calculation core I would run old and new in parallel for several months and compare every payslip before switching. I would aim for a modular monolith as the target, not many services, given the team size. Feature work continues, with a fixed share of capacity for migration, and a visible list of remaining modules so it does not stall at 70%."</p>',
  cx: '<p><b>What the interviewer scores:</b> outcomes over fashion, safety nets first, incremental slices, parallel run for the risky core, and realism about team size.</p>',
  f: ['What do you do with the 800 stored procedures?', 'How do you keep the 3 experts from becoming a bottleneck?', 'When do you stop and declare it done?']
}));

practice.push(P({
  t: 'Checkout failed for 40 minutes on a Friday evening', l: 'Hard', tags: ['incident', 'leadership', 'postmortem'],
  s: 'At 18:05 on a Friday, alerts show checkout errors at 60%. A release went out at 17:50. You are the tech lead on call. Walk the interviewer through the next hour and the following week.',
  ex: '<p>Facts as they emerge: the release contained a database migration and a new payment screen. Error logs show timeouts on the Orders table. Support is receiving calls.</p>',
  weak: 'I would start reading the code of the release to find the bug and fix it forward as fast as I can.',
  why: 'it puts diagnosis before recovery. Customers keep failing while one person debugs alone, nobody is told what is happening, and a rushed fix on a Friday can make things worse.',
  q: ['What is the first priority in a production incident?', ['Find the root cause', 'Restore service for users', 'Find who made the mistake', 'Write the report'], 1, 'Mitigate first: roll back, switch off the flag or fail over. Root cause analysis comes once users are safe.'],
  h: ['What changed 15 minutes before it started?', 'Who needs to know, and how often?', 'Recipe: declare and assign roles, mitigate (flag off, roll back, check the migration), communicate every 15 minutes, verify recovery, then blameless review with owned actions.'],
  a: '<p><b>Strong answer:</b> "First I declare an incident and set roles: I lead, one person handles communication, 2 investigate. The obvious suspect is the 17:50 release, so the first action is mitigation, not diagnosis: turn off the new payment screen flag and roll back the application. Because there was a migration, I check whether the old version works with the new schema. If we used expand and contract it does. If the migration is still running and locking the Orders table, we stop it. Meanwhile support and stakeholders get a short update every 15 minutes: what is affected, what we are doing, when the next update comes. Once errors drop, we watch for 30 minutes, check for orders that were paid but not confirmed, and fix those customers. The following week: a blameless review with a timeline. Likely actions, each with an owner and a date: test migrations on production-sized data, no risky releases late on Friday, canary rollout with automatic rollback, and an alert that fires in 2 minutes instead of 15. I would share the write-up openly."</p>',
  cx: '<p><b>What the interviewer scores:</b> mitigate before diagnose, clear roles, steady communication, care for affected customers, and a blameless review that changes the system.</p>',
  f: ['The rollback fails. What is plan B?', 'A director joins the call and starts giving orders. How do you handle it?', 'How do you decide the incident is over?']
}));

practice.push(P({
  t: 'Add an AI assistant that can change customer bookings', l: 'Hard', tags: ['AI', 'architecture', 'safety'],
  s: 'The business wants a chat assistant in a booking product: customers type "move my appointment to next Tuesday afternoon" and it happens. Design it so that it is safe, auditable, affordable, and does not slow down the rest of the system.',
  ex: '<p>Risks to design against: the model misreads the date, a user asks it to change someone else\'s booking, a model call takes 20 seconds or fails, a retry moves the booking twice, monthly cost runs away.</p>',
  weak: 'Give the model direct access to the bookings database with an admin connection so it can do whatever the user asks.',
  why: 'the model becomes a super-user that any cleverly worded message can steer. There is no confirmation, no permission check per user, no audit trail and no protection against retries.',
  q: ['Whose permissions should the assistant\'s write action use?', ['A shared admin account', 'The signed-in user\'s own permissions, checked again at write time', 'No permissions, it is internal', 'The model provider\'s account'], 1, 'The assistant must never be able to do more than the user could do themselves. Re-check at the moment of the write.'],
  h: ['Separate "propose" from "do". Who presses the final button?', 'A model call is a slow, unreliable dependency. Treat it like one.', 'Recipe: tools with narrow scope, propose then confirm, confirm gate with user permissions + idempotency key, async job with status, audit log, timeouts and fallback, token caps and evaluation set.'],
  a: '<p><b>Strong answer:</b> "I would separate proposing from doing. The model gets a few narrow tools: read this user\'s bookings, search free slots, and propose a change. It cannot write. The proposal is shown to the user in plain words, \'Move your appointment from Monday 10:00 to Tuesday 14:30?\', and only their confirmation triggers the write. The confirm endpoint is ordinary code: it re-validates the slot, checks the signed-in user\'s own permissions, and uses an idempotency key so a retry cannot move the booking twice. Model calls run as asynchronous jobs with a status the client polls or streams, with timeouts, limited retries that respect rate limits, a circuit breaker, and a fallback to the normal booking screen. Every prompt, tool call, proposal and confirmation is logged with a correlation ID and the model and prompt version. For safety: input and output filters, user text treated as data and never as instructions, and no secrets in prompts. For cost: token caps per request and per user, a smaller model for simple intents, caching of slot searches. For quality: a golden set of 200 example requests run on every prompt or model change."</p>',
  cx: '<p><b>What the interviewer scores:</b> human confirmation, least privilege tied to the user, idempotent writes, treating the model as an unreliable dependency, audit, cost control and evaluation.</p>',
  f: ['How do you defend against prompt injection hidden in a booking note?', 'Which actions would you allow without confirmation, if any?', 'How do you measure whether the assistant is worth its cost?']
}));

// ================= QUIZ =================
quiz.push({ q: 'A 5-person team starts a new product with unclear requirements. Which architecture is the most sensible default?', options: ['12 microservices with a service mesh', 'A modular monolith with clear internal boundaries', 'Event sourcing everywhere', 'A separate database per screen'], answer: 1, explain: 'A modular monolith keeps delivery simple while the boundaries are still being learned, and a module can be extracted later for a real reason.' });
quiz.push({ q: 'In clean architecture, which statement is correct?', options: ['The domain project references EF Core', 'Controllers contain the business rules', 'Dependencies point inward: infrastructure implements interfaces defined by inner layers', 'The database layer is the centre'], answer: 2, explain: 'Dependency inversion keeps the domain free of frameworks. Outer layers depend on inner ones, never the reverse.' });
quiz.push({ q: 'During a network partition, a CP system will...', options: ['Answer every request, possibly with stale data', 'Reject or delay some requests to avoid inconsistent data', 'Lose all data', 'Switch to eventual consistency automatically'], answer: 1, explain: 'CP favours consistency over availability when the network splits. AP systems keep answering and reconcile later.' });
quiz.push({ q: 'In a saga, what is a compensating transaction?', options: ['A database rollback issued by the coordinator', 'A new business action that undoes the effect of an earlier completed step', 'A retry of the failed step', 'A lock held on all services'], answer: 1, explain: 'Earlier steps are already committed, so they cannot be rolled back. They are undone by a new action such as a refund or a release of stock.' });
quiz.push({ q: 'Why must message consumers be idempotent even when you use the outbox pattern?', options: ['Because the outbox delivers at least once, so duplicates are possible', 'Because the outbox loses messages', 'Because messages arrive encrypted', 'Because EF Core requires it'], answer: 0, explain: 'The publisher can crash after sending but before marking the row as sent, and will send it again.' });
quiz.push({ q: 'Which call is safe to retry automatically without any extra design?', options: ['POST /payments without an idempotency key', 'GET /products/42', 'POST /orders', 'POST /emails/send'], answer: 1, explain: 'A GET does not change state. The POST calls could repeat a charge, an order or an email unless they carry an idempotency key.' });
quiz.push({ q: 'A hot cache key expires and 500 requests hit the database at once. What is this called and what helps?', options: ['Cache poisoning; encrypt the cache', 'Cache stampede; let one request rebuild while others wait, and add jitter to TTLs', 'Replica lag; add a replica', 'Deadlock; add an index'], answer: 1, explain: 'Request coalescing (as HybridCache does), jittered expiry and early refresh prevent the pile-up.' });
quiz.push({ q: 'An SLO of 99.9% over 30 days allows roughly how much downtime?', options: ['About 4 minutes', 'About 43 minutes', 'About 7 hours', 'About 3 days'], answer: 1, explain: '30 days is 43,200 minutes, and 0.1% of that is about 43 minutes. 99.99% would be about 4 minutes.' });
quiz.push({ q: 'You need to rename a column on a live system that is deployed with rolling updates. What is the safe approach?', options: ['Rename it in one migration during the deploy', 'Expand and contract: add the new column, write both, backfill, switch reads, drop the old one later', 'Stop the site for an hour', 'Rename it by hand in production'], answer: 1, explain: 'Old and new app versions run side by side during a rolling deploy, so the schema must work for both at every step.' });
quiz.push({ q: 'In a shared-schema multi-tenant app, where should the tenant ID for a request come from?', options: ['The validated token or server session', 'A query string value', 'A custom header set by the browser script', 'The request body'], answer: 0, explain: 'Anything the client can edit can be forged. The tenant must come from identity the server has verified.' });
quiz.push({ q: 'In a STAR answer, which part should take most of the time?', options: ['Situation', 'Task', 'Action', 'Result'], answer: 2, explain: 'The Action shows what you personally did and how you think. Situation and Task should be 1 or 2 sentences each.' });
quiz.push({ q: 'You discover 3 weeks before a release that it will be 2 weeks late. What is the best first move?', options: ['Ask the team for weekend work and say nothing yet', 'Cut the automated tests to save time', 'Confirm the facts, then tell stakeholders promptly with options on scope, date and people', 'Wait to see if the team catches up'], answer: 2, explain: 'Early, factual communication with options keeps the business able to choose. Hiding it or cutting quality makes the outcome worse.' });

registerModule({
  id: 'tl10',
  title: 'Architecture & the Tech Lead Playbook',
  intro: `<p>This is the round where the interviewer stops asking "can you code?" and starts asking <b>"can we trust you with the system and the team?"</b>. It has 2 halves. The first is <b>architecture</b>: how you split a system, keep its data correct across services, keep it running under load and failure, and ship it safely. The second is the <b>tech lead playbook</b>: how you make decisions, review code, estimate, handle a late project, a production incident, a disagreement or a struggling teammate.</p>
<p>Every question starts with one plain sentence, then goes deeper, and ends with a line you can say out loud. There is rarely one right answer here. What is scored is whether you ask about the constraints, name the <b>trade-off</b>, and choose. Read the question, say your answer aloud, then open the model answer and compare.</p>`,
  goals: [
    'Answer any "design a system" question with a 7-step framework, starting from requirements and ending with trade-offs',
    'Explain when to choose a monolith, a modular monolith or microservices, and what each one costs',
    'Keep data correct across services with sagas, the outbox pattern and idempotent handlers, and say why exactly-once is a myth',
    'Describe how to keep a system up: timeouts, retries, circuit breakers, caching, scaling, observability and safe releases',
    'Tell clear STAR stories about performance, conflict, failure and mentoring without leaking confidential details',
    'Give model answers for the everyday tech lead questions: code reviews, estimation, technical debt, missed deadlines, incidents and underperformance'
  ],
  prereqs: `<p>You should be comfortable with ASP.NET Core basics (module 3) and HTTP APIs (module 4). The Azure, database and sign-in modules help with the examples but are not required. No earlier architecture knowledge is assumed: every term is explained the first time it appears.</p>`,
  hours: 12,
  topics: topics, practice: practice, quiz: quiz, interview: interview
}); })();
