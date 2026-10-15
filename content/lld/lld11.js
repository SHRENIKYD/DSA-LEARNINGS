(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ---------- tiny helpers shared by all visualizers ---------- */
  function B(id, label, x, y, w) { var n = { id: id, label: label, x: x, y: y, shape: 'box' }; if (w) n.w = w; return n; }
  function G(label, nodes, edges, o) {
    o = o || {};
    return { type: 'graph', label: label, directed: o.undirected ? false : true, height: o.h || 60, nodes: nodes, edges: edges, hl: o.hl || {}, ehl: o.ehl || {}, tags: o.tags || {} };
  }
  function CODE(label, code, hl) { return { type: 'code', label: label, lang: 'java', code: code, hl: hl || {} }; }
  function TXT(html, label) { var p = { type: 'text', html: html }; if (label) p.label = label; return p; }
  function VARS(label, vals, hl) { return { type: 'vars', label: label, vals: clone(vals), hl: hl || {} }; }
  function ARR(label, values, hl, ptr) { return { type: 'array', label: label, values: values.slice(), hl: hl || {}, ptr: ptr || {} }; }
  function MAP(label, entries, hl) { return { type: 'map', label: label, entries: entries.map(function (e) { return [e[0], e[1]]; }), hl: hl || {} }; }
  function STACK(label, items, hl) { return { type: 'stack', label: label, items: items.slice(), hl: hl || {} }; }
  function QUEUE(label, items, hl) { return { type: 'queue', label: label, items: items.slice(), hl: hl || {}, frontLabel: 'next', backLabel: 'newest' }; }
  function TABLE(label, columns, rows, hl) { return { type: 'table', label: label, columns: columns, rows: rows.map(function (r) { return r.slice(); }), hl: hl || {} }; }
  function F(narr, parts) { return { narr: narr, parts: parts }; }
  function clone(o) { var r = {}; for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) r[k] = o[k]; return r; }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function paint(edges, cls) { var r = {}; edges.forEach(function (e) { r[e[0] + '-' + e[1]] = cls; }); return r; }
  function pick(input, options, hint) {
    var k = String(input === undefined ? '' : input).trim().toLowerCase();
    if (!Object.prototype.hasOwnProperty.call(options, k)) throw new Error(hint);
    return options[k];
  }
  function tokens(input, sep, max, hint) {
    var t = String(input === undefined ? '' : input).split(sep).map(function (s) { return s.trim(); }).filter(function (s) { return s.length; });
    if (!t.length) throw new Error(hint);
    if (t.length > max) throw new Error('Use at most ' + max + ' items. ' + hint);
    return t;
  }
  /* ======================= TOPIC 1: THE BRUTE FORCE ======================= */
  topics.push({
    title: 'The Brute Force: Tightly Coupled, Anemic Design (and Why It Hurts)',
    analogy: `<p>Imagine a <b>house where every appliance is soldered straight into the wiring</b>. No plugs, no sockets. The fridge works fine on day one. Then you want a new fridge: an electrician must open the wall, cut wires and re-solder. Worse, the fridge wire is tangled with the TV wire, so the TV goes dark while he works. A normal house has <b>sockets</b> (a standard shape) and <b>plugs</b> (anything that fits). Swapping a fridge takes ten seconds.</p>
<p>Now imagine a <b>bank passbook that anyone can write in with a pen</b>. The cashier is supposed to check your balance before writing a withdrawal, but the clerk at the next desk, the ATM team and the loan team all write in it too, and each one remembers the rules a little differently. One day someone forgets, and your balance goes negative. That passbook is an <b>anemic object</b>: it holds data but protects nothing.</p>`,
    explain: `<p>This whole module is about one question: <b>how do you build code that survives change?</b> Before learning the good tools, look closely at the "brute force" design almost everyone writes first. It has two diseases that usually travel together.</p>
<p><b>Disease 1 — tight coupling.</b> A class creates its own helpers with <code>new</code>: <code>new MySqlOrderDao()</code>, <code>new StripeClient()</code>, <code>new SmtpMailer()</code>. It now knows the exact brand of database, payment company and email server. Coupling means "if B changes, A must change too". With <code>new</code> inside, A is welded to B.</p>
${H.table(['Symptom', 'What you see', 'Why it hurts'], [
  ['Hard-coded <code>new</code>', '<code>private StripeClient s = new StripeClient();</code>', 'Switching to Razorpay means editing every class that says <code>new StripeClient</code>'],
  ['Infrastructure inside business code', 'SQL strings and HTTP calls next to the "can this order be cancelled?" rule', 'You cannot read the rules without reading plumbing'],
  ['Untestable', 'A unit test of <code>placeOrder</code> needs a real DB and a real card network', 'Tests are slow, flaky and so nobody writes them'],
  ['Change ripple', 'One small change touches 6 files', 'Every release is scary; bugs appear far from the change']
])}
<p><b>Disease 2 — the anemic domain model.</b> "Anemic" means "no blood". The <code>Order</code> class is a bag of getters and setters: <code>setStatus</code>, <code>setTotal</code>, <code>getLines</code>. All the rules ("you cannot cancel a shipped order", "total must equal the sum of lines") live in <i>service</i> classes that poke the data from outside. Because anyone can call <code>setStatus("CANCELLED")</code>, the rule must be repeated in every service that touches orders. Repeat a rule three times and one copy will eventually be wrong.</p>
${H.table(['', 'Anemic (brute force)', 'Rich (what we build in this module)'], [
  ['Where rules live', 'Spread across services', 'Inside the object that owns the data'],
  ['Who can break an order', 'Anyone with a setter', 'Nobody — only valid methods like <code>cancel()</code>'],
  ['Style', '"Ask" for data, decide outside, "set" it back', '"Tell" the object what you want; it decides (<b>Tell, Don\'t Ask</b>)']
])}
<p>The rest of the module fixes both diseases: <b>dependency injection</b> and <b>plugins</b> remove the welded <code>new</code>; <b>hexagonal architecture</b> pushes plumbing to the edges; <b>DDD entities, value objects and aggregates</b> put rules back inside the objects; <b>domain events</b> and <b>event sourcing</b> let parts of the system react to changes without knowing each other.</p>`,
    clues: [
      'Interviewer says <b>"now we want to switch payment provider / database"</b> — they are testing whether your design was coupled.',
      '"How would you <b>unit test</b> this?" — if your answer needs a real DB, the design is coupled.',
      'Your class diagram shows <code>Order</code> with only getters/setters and an <code>OrderService</code> with 20 methods → anemic model smell.',
      '"Where does the rule <i>X cannot happen after Y</i> live?" — the right answer is "in one place, inside the entity".',
      '"Make it <b>extensible</b>" / "new providers will be added monthly" → they want seams (interfaces) instead of <code>new</code>.',
      'Requirement lists many invariants ("balance never negative", "max 5 items") → model must protect itself, not rely on callers.'
    ],
    code: [`// BRUTE FORCE: tightly coupled + anemic. Compiles, works on day one, hurts on day thirty.
class Order {                                   // anemic: data only, no protection
    private String id; private String status = "NEW"; private double total;
    public String getId() { return id; }          public void setId(String id) { this.id = id; }
    public String getStatus() { return status; }  public void setStatus(String s) { this.status = s; }
    public double getTotal() { return total; }    public void setTotal(double t) { this.total = t; }
}
class MySqlOrderDao { void save(Order o) { System.out.println("INSERT INTO orders ... " + o.getId()); } }
class StripeClient  { boolean charge(double amt) { System.out.println("Stripe charge " + amt); return true; } }
class SmtpMailer    { void send(String to, String body) { System.out.println("SMTP to " + to + ": " + body); } }

class OrderService {
    private final MySqlOrderDao dao = new MySqlOrderDao();   // welded to MySQL
    private final StripeClient stripe = new StripeClient();   // welded to Stripe
    private final SmtpMailer mailer = new SmtpMailer();       // welded to SMTP

    void place(Order o) {
        if (o.getTotal() <= 0) throw new IllegalStateException("empty order");  // rule copy #1
        stripe.charge(o.getTotal());
        o.setStatus("PAID");
        dao.save(o);
        mailer.send("customer@example.com", "Order " + o.getId() + " paid");
    }
    void cancel(Order o) {
        if (o.getStatus().equals("SHIPPED")) throw new IllegalStateException("too late"); // rule copy #1
        o.setStatus("CANCELLED");
        dao.save(o);
    }
}
class AdminTool {                                  // another team, another copy of the rules...
    void forceCancel(Order o) { o.setStatus("CANCELLED"); new MySqlOrderDao().save(o); } // forgot the SHIPPED rule!
}`, `// THE FIX (preview of the whole module): rich entity + ports + constructor injection.
interface PaymentPort { boolean charge(String orderId, long paise); }
interface OrderRepository { void save(Order o); }
interface Notifier { void notify(String orderId, String message); }

enum Status { NEW, PAID, SHIPPED, CANCELLED }

class Order {                                      // rich: rules live HERE, once
    private final String id; private final long totalPaise; private Status status = Status.NEW;
    Order(String id, long totalPaise) {
        if (totalPaise <= 0) throw new IllegalArgumentException("empty order");
        this.id = id; this.totalPaise = totalPaise;
    }
    void markPaid() { require(status == Status.NEW, "only NEW orders can be paid"); status = Status.PAID; }
    void ship()     { require(status == Status.PAID, "only PAID orders ship");      status = Status.SHIPPED; }
    void cancel()   { require(status != Status.SHIPPED, "cannot cancel after shipping"); status = Status.CANCELLED; }
    String id() { return id; } long totalPaise() { return totalPaise; } Status status() { return status; }
    private static void require(boolean ok, String msg) { if (!ok) throw new IllegalStateException(msg); }
}

class OrderService {                               // knows only interfaces: no 'new' of infrastructure
    private final PaymentPort payments; private final OrderRepository repo; private final Notifier notifier;
    OrderService(PaymentPort p, OrderRepository r, Notifier n) { payments = p; repo = r; notifier = n; }
    void place(Order o) {
        if (!payments.charge(o.id(), o.totalPaise())) throw new IllegalStateException("payment declined");
        o.markPaid();                              // the entity enforces its own rule
        repo.save(o);
        notifier.notify(o.id(), "paid");
    }
}

class Main {                                       // composition root: the ONLY place that picks brands
    public static void main(String[] args) {
        List<String> log = new ArrayList<>();
        OrderService svc = new OrderService(
            (id, amt) -> { log.add("charged " + id + " " + amt); return true; },  // fake payment for a test
            o -> log.add("saved " + o.id() + " " + o.status()),
            (id, msg) -> log.add("notified " + id + " " + msg));
        Order o = new Order("A-1", 49_900);
        svc.place(o);
        o.ship();
        try { o.cancel(); } catch (IllegalStateException e) { log.add("blocked: " + e.getMessage()); }
        log.forEach(System.out::println);
    }
}`],
    codeTitle: ['Brute force: welded dependencies + anemic Order', 'Preview of the cure: rich Order, ports, constructor injection'],
    viz: {
      title: 'Change ripple: coupled + anemic vs ports + rich model',
      input: 'payment',
      inputLabel: 'Change request: payment | database | email | rule',
      gen: function (input) {
        var ch = pick(input, {
          payment: { ask: 'Switch from Stripe to Razorpay', target: 'STR', ripple: [['STR', 'replace StripeClient with RazorpayClient'], ['OS', 'edit: new StripeClient() + Stripe error codes inside place()'], ['RS', 'edit: refunds call Stripe directly'], ['CTL', 'every controller test now hits the real Razorpay sandbox']], clean: [['SA', 'add RazorpayAdapter implements PaymentPort'], ['MAIN', 'change ONE line: new RazorpayAdapter()']] },
          database: { ask: 'Move from MySQL to PostgreSQL', target: 'DAO', ripple: [['DAO', 'rewrite SQL dialect'], ['OS', 'edit: new MySqlOrderDao() + MySQL exceptions caught here'], ['AT', 'edit: AdminTool also says new MySqlOrderDao()'], ['RS', 'refunds read order rows with MySQL-specific SQL']], clean: [['JR', 'add PostgresOrderRepo implements OrderRepository'], ['MAIN', 'change ONE line in the composition root']] },
          email: { ask: 'Send WhatsApp messages instead of email', target: 'SMTP', ripple: [['SMTP', 'replace SmtpMailer'], ['OS', 'edit: mailer.send(address, body) assumes email addresses'], ['RS', 'edit: refund mails built inline']], clean: [['SM', 'add WhatsAppAdapter implements Notifier'], ['MAIN', 'change ONE line']] },
          rule: { ask: 'New rule: a SHIPPED order can never be cancelled', target: 'ORD', ripple: [['OS', 'add the check in cancel()'], ['RS', 'add the check in refundAndCancel()'], ['AT', 'FORGOTTEN: forceCancel() still calls setStatus("CANCELLED")']], clean: [['ORD', 'add one require(...) inside Order.cancel(); nobody can bypass it']] }
        }, 'Type one of: payment, database, email, rule');
        var cn = [B('CTL', 'Controller', 9, 32), B('AT', 'AdminTool', 32, 6), B('OS', 'OrderService', 32, 32), B('RS', 'RefundService', 32, 58),
          B('ORD', 'Order (anemic)', 60, 64), B('DAO', 'MySqlOrderDao', 87, 8), B('STR', 'StripeClient', 87, 32), B('SMTP', 'SmtpMailer', 87, 56)];
        var ce = [['CTL', 'OS', 'new'], ['OS', 'DAO', 'new'], ['OS', 'STR', 'new'], ['OS', 'SMTP', 'new'], ['OS', 'ORD', 'set*'], ['RS', 'STR', 'new'], ['RS', 'ORD', 'set*'], ['AT', 'ORD', 'set*'], ['AT', 'DAO', 'new'], ['RS', 'SMTP', 'new']];
        var kn = [B('MAIN', 'Main (root)', 9, 8), B('CTL', 'Controller', 9, 34), B('OS', 'OrderService', 33, 34), B('ORD', 'Order (rich)', 33, 60),
          B('PP', 'PaymentPort', 60, 10), B('RP', 'OrderRepository', 60, 34), B('NP', 'Notifier', 60, 58), B('SA', 'StripeAdapter', 88, 10), B('JR', 'JdbcOrderRepo', 88, 34), B('SM', 'SmtpAdapter', 88, 58)];
        var ke = [['MAIN', 'CTL', 'wires'], ['CTL', 'OS'], ['OS', 'ORD', 'tell'], ['OS', 'PP'], ['OS', 'RP'], ['OS', 'NP'], ['SA', 'PP', 'impl'], ['JR', 'RP', 'impl'], ['SM', 'NP', 'impl']];
        var frames = [];
        frames.push(F('This is the <b>brute-force design</b>. Arrows labelled <code>new</code> mean "this class builds its own helper", so it is welded to that brand. Arrows labelled <code>set*</code> mean "this class changes the Order\'s fields directly" — the Order cannot defend itself.', [G('Coupled + anemic', cn, ce, { h: 70 }), VARS('cost so far', { filesTouched: 0, rulesCopies: 3, testsNeedingRealInfra: 'all' })]));
        var hl = {}; hl[ch.target] = 'cur';
        frames.push(F('Change request arrives: <b>' + esc(ch.ask) + '</b>. Let us follow the ripple: every class that depends on the changed thing must be opened, edited, re-tested.', [G('Coupled + anemic', cn, ce, { h: 70, hl: hl }), TXT('<b>Ticket:</b> ' + esc(ch.ask))]));
        var touched = 0;
        ch.ripple.forEach(function (r) {
          touched++;
          hl = clone(hl); hl[r[0]] = /FORGOTTEN/.test(r[1]) ? 'bad' : 'cur';
          frames.push(F((/FORGOTTEN/.test(r[1]) ? '<span class="c-r">Bug!</span> ' : '') + 'Ripple: <b>' + esc(r[0]) + '</b> — ' + esc(r[1]) + '. Every red/amber box is a file someone must edit and re-test.', [G('Coupled + anemic', cn, ce, { h: 70, hl: hl }), VARS('cost so far', { filesTouched: touched, risk: touched > 2 ? 'high' : 'medium' }, { filesTouched: 'cur' })]));
        });
        frames.push(F('Total damage for one business change: <b>' + touched + ' files</b>, and none of them can be unit-tested without real infrastructure. This is why teams fear "small" changes.', [G('Coupled + anemic', cn, ce, { h: 70, hl: hl }), CODE('the root cause', 'private final StripeClient stripe = new StripeClient();\nprivate final MySqlOrderDao dao = new MySqlOrderDao();\n// and in 3 services:\norder.setStatus("CANCELLED");', { 1: 'bad', 2: 'bad', 4: 'bad' })]));
        frames.push(F('Now the <b>same system</b> built with this module\'s tools: the service depends on <b>ports</b> (interfaces), adapters <b>implement</b> them, and only <b>Main</b> (the composition root) picks brands. The Order is <b>rich</b>: it owns its rules.', [G('Ports + rich model', kn, ke, { h: 66 })]));
        var hl2 = {}, n2 = 0;
        ch.clean.forEach(function (r) {
          n2++; hl2 = clone(hl2); hl2[r[0]] = 'ok';
          frames.push(F('Same ticket, clean design: <b>' + esc(r[0]) + '</b> — ' + esc(r[1]) + '.', [G('Ports + rich model', kn, ke, { h: 66, hl: hl2 }), VARS('cost so far', { filesTouched: n2, existingClassesEdited: r[0] === 'MAIN' || r[0] === 'ORD' ? 1 : 0 }, { filesTouched: 'ok' })]));
        });
        frames.push(F('Compare: <b>' + touched + '</b> files vs <b>' + n2 + '</b>. The business code (OrderService) was <b>not touched</b> in the clean design, and it can be tested with fakes in milliseconds.', [TABLE('scorecard', ['', 'coupled + anemic', 'ports + rich'], [['files edited', String(touched), String(n2)], ['rule copies', '3 (one forgotten)', '1 (inside Order)'], ['unit-testable', 'no', 'yes, with fakes']], { 0: 'sel' })]));
        return frames;
      }
    },
    examples: [
      { title: 'Anemic bank account — the forgotten check', html: `<p><code>Account</code> has <code>getBalance()</code>/<code>setBalance()</code>. <code>AtmService</code> checks "balance ≥ amount" before withdrawing. <code>UpiService</code> was written later by another dev who copied the code but missed the check. Result: ${H.c('r', 'balance = -500')}. A rich <code>Account.withdraw(amount)</code> that throws on insufficient funds makes the bug <b>impossible</b>, not just unlikely.</p>`, code: `class Account {
    private long balance;
    void deposit(long amt) { if (amt <= 0) throw new IllegalArgumentException("amount > 0"); balance += amt; }
    void withdraw(long amt) {
        if (amt <= 0) throw new IllegalArgumentException("amount > 0");
        if (amt > balance) throw new IllegalStateException("insufficient funds");
        balance -= amt;
    }
    long balance() { return balance; }   // read-only view, no setter
}` },
      { title: '"new" is a hard-coded phone number', html: `<p>Writing <code>new SmtpMailer()</code> inside <code>OrderService</code> is like a shop that can only ever call one courier because the number is painted on the wall. Passing the courier in through the constructor (<code>OrderService(Notifier n)</code>) is like keeping a contacts list: the shop says "call the courier" and the manager decides which one. ${H.chips(['SmtpMailer', 'WhatsAppNotifier', 'FakeNotifier (tests)'], { label: 'Anything that implements Notifier can be passed in' })}</p>` },
      { title: 'Ask vs Tell', html: `${H.table(['Ask (anemic)', 'Tell (rich)'], [['<code>if (o.getStatus() != SHIPPED) o.setStatus(CANCELLED);</code>', '<code>o.cancel();</code>'], ['Caller must know the rule', 'Only Order knows the rule'], ['Rule repeated in every caller', 'Rule written once']])}<p>A good smell test: if a method mostly calls <code>getX()</code> on one object and then <code>setY()</code> on the same object, that logic belongs <i>inside</i> that object.</p>` },
      { title: 'When anemic is actually fine', html: `<p>A pure CRUD admin screen ("edit the list of countries") has no rules to protect. A plain record and a simple service (Fowler calls this a <b>Transaction Script</b>) is the simplest thing that works. ${H.c('g', 'Use rich models where the rules are')}: money, bookings, inventory, permissions. Do not wrap a phone-book in aggregates and events.</p>` }
    ],
    deepDive: `<p><b>Where the name comes from.</b> Martin Fowler called the "Anemic Domain Model" an anti-pattern in 2003: objects that look like a domain model (named after business nouns) but contain no behaviour, so it is really procedural code with extra classes. Eric Evans' <i>Domain-Driven Design</i> (2003) and Vaughn Vernon's <i>Implementing DDD</i> (2013) are the books behind most of this module.</p>
<p><b>Measuring coupling.</b> Robert C. Martin's package metrics: <b>Ca</b> (afferent — who depends on me), <b>Ce</b> (efferent — whom I depend on), <b>Instability I = Ce / (Ca + Ce)</b>. Example: <code>OrderService</code> depends on 3 concrete classes and 1 class depends on it → I = 3/4 = 0.75 (unstable, fine for a service). Trouble is when a <i>stable</i> thing (many dependents, like <code>Order</code>) depends on something volatile (like Stripe). The <b>Stable Dependencies Principle</b>: depend in the direction of stability. Interfaces are the most stable things you can depend on.</p>
<p><b>Connascence</b> is a finer vocabulary: two pieces are connascent if changing one forces changing the other. "Connascence of name" (both use <code>charge()</code>) is mild; "connascence of algorithm" (two services both implement the cancel rule) is severe — that is exactly the anemic-model bug.</p>
<p><b>Production reality.</b> Most legacy code is anemic-and-coupled because frameworks (JPA entities with public setters, Spring <code>@Service</code> classes) make that the path of least resistance. You rarely rewrite it; you <b>strangle</b> it: wrap one risky rule in a rich method, add a seam (interface) at one painful dependency, add tests, repeat. Michael Feathers' <i>Working Effectively with Legacy Code</i> calls these seams.</p>
<p><b>Cost of the cure.</b> Every interface is one more file and one more indirection. If something has exactly one implementation and is not a slow/external dependency, an interface may be ceremony. Add seams at <b>boundaries</b> (I/O, money, third parties, time, randomness) — not between every pair of classes.</p>`,
    aiEra: `<p><b>What AI changes:</b> code assistants produce the brute-force shape by default: a <code>@Service</code> with setters on entities and <code>new</code>-ed clients, because that is the most common code they were trained on. They also make it <i>cheap</i> to generate 20 files, which makes coupled code grow faster than ever. Your value is spotting the axis of change and asking for seams.</p>
<p><b>Use AI as a partner:</b> paste a service and ask <code>List every concrete dependency this class creates with new, and every place it mutates another object's fields. Suggest the minimum interfaces to make it unit-testable.</code> Or <code>Find every place in this repo where Order.setStatus is called and list the rule each caller checks first</code> — an excellent way to discover scattered rule copies before refactoring.</p>
<p><b>Rich models help AI too:</b> when rules live in one method (<code>Order.cancel()</code>), an AI agent editing the code has one place to read and one place to change. Scattered rules mean the agent fixes 2 of 3 copies — exactly the bug humans make. Well-named domain methods are also better "documentation" for retrieval-based coding tools.</p>
<p><b>What you must still own:</b> deciding where boundaries go, which rules are invariants, and when a simple CRUD script is the right answer. AI cannot know your business's future change requests; you can ask the product team.</p>`,
    problems: [{
      title: 'Refactor an Anemic Wallet into a Rich Model', level: 'Easy', tags: ['anemic model', 'encapsulation', 'tell dont ask'], companies: ['Paytm', 'PhonePe', 'Amazon'],
      statement: `<p>A wallet app has <code>Wallet</code> with public getters/setters for <code>balance</code> and <code>frozen</code>. Three services (<code>TopUpService</code>, <code>PayService</code>, <code>AdminService</code>) each check rules before calling setters. Rules: amounts must be positive; a frozen wallet cannot pay (but can be topped up); balance can never go negative; a daily spend limit of ₹10,000. Refactor so that <b>no caller can break a rule</b>, and the rules live in one place.</p>`,
      constraints: `Amounts in paise (long). Daily limit resets when the date changes (inject a clock, do not call LocalDate.now() inside the entity).`,
      example: `<p>Balance 5000, pay 3000 → ${H.c('g', 'ok, balance 2000')}. Pay 3000 again → ${H.c('r', 'insufficient funds')}. Freeze, top up 1000 → ${H.c('g', 'ok, 3000')}. Pay 100 → ${H.c('r', 'wallet frozen')}. Each rule fires from <b>inside</b> <code>Wallet</code>, so no service can forget it.</p>`,
      brute: { why: `<p>Each service repeats the checks; <code>AdminService.adjust</code> forgot the negative-balance check, and the daily limit exists only in <code>PayService</code>. A new <code>RefundService</code> will copy one of them — probably the buggy one. Nothing stops <code>wallet.setBalance(-1)</code>.</p>`, code: `class Wallet {
    private long balance; private boolean frozen;
    public long getBalance() { return balance; } public void setBalance(long b) { balance = b; }
    public boolean isFrozen() { return frozen; } public void setFrozen(boolean f) { frozen = f; }
}
class PayService {
    long spentToday = 0;
    void pay(Wallet w, long amt) {
        if (w.isFrozen()) throw new IllegalStateException("frozen");
        if (w.getBalance() < amt) throw new IllegalStateException("insufficient");
        if (spentToday + amt > 1_000_000) throw new IllegalStateException("limit");
        w.setBalance(w.getBalance() - amt); spentToday += amt;
    }
}
class AdminService {
    void adjust(Wallet w, long delta) { w.setBalance(w.getBalance() + delta); } // can go negative!
}` },
      mcq: { q: 'Where should the "daily spend limit" rule live?', options: ['Inside Wallet.pay(), using an injected clock to know the date', 'In PayService, because it is about paying', 'In a database trigger', 'In the controller, validated from the request'], answer: 0, explain: 'The limit protects the wallet\'s own state, so it is an invariant of Wallet. The clock is injected so the rule stays testable and the entity stays free of infrastructure.' },
      hints: [`<p>Hint 1: Delete the setters. Replace them with verbs from the business: <code>topUp</code>, <code>pay</code>, <code>freeze</code>, <code>unfreeze</code>.</p>`, `<p>Hint 2: The daily limit needs "today". Pass a <code>java.time.Clock</code> (or a <code>Supplier&lt;LocalDate&gt;</code>) into the constructor; keep <code>spentToday</code> and <code>spentOn</code> as private fields.</p>`, `<p>Hint 3: Recipe: guard positive amount → guard frozen → reset daily counter if date changed → guard limit → guard balance → mutate. Order matters only for which error message wins.</p>`],
      solution: {
        approach: `<p>Turn <code>Wallet</code> into a <b>rich entity</b>: private fields, no setters, behaviour methods named after business verbs, every invariant checked inside. Time comes from an injected <code>Clock</code> so tests can move the date. Services shrink to "load wallet, call one method, save" — they cannot break the rules even if they try.</p>`,
        code: `class Wallet {
    static final long DAILY_LIMIT = 1_000_000;          // Rs 10,000 in paise
    private final String id; private final Clock clock;
    private long balance; private boolean frozen;
    private long spentToday; private LocalDate spentOn;

    Wallet(String id, Clock clock) { this.id = id; this.clock = clock; this.spentOn = LocalDate.now(clock); }

    void topUp(long amt) { positive(amt); balance += amt; }      // allowed even when frozen
    void pay(long amt) {
        positive(amt);
        if (frozen) throw new IllegalStateException("wallet frozen");
        LocalDate today = LocalDate.now(clock);
        if (!today.equals(spentOn)) { spentOn = today; spentToday = 0; }   // new day, reset counter
        if (spentToday + amt > DAILY_LIMIT) throw new IllegalStateException("daily limit exceeded");
        if (amt > balance) throw new IllegalStateException("insufficient funds");
        balance -= amt; spentToday += amt;
    }
    void freeze() { frozen = true; }
    void unfreeze() { frozen = false; }
    long balance() { return balance; }
    String id() { return id; }
    private static void positive(long amt) { if (amt <= 0) throw new IllegalArgumentException("amount must be > 0"); }

    public static void main(String[] args) {
        Clock fixed = Clock.fixed(Instant.parse("2026-01-01T10:00:00Z"), ZoneOffset.UTC);
        Wallet w = new Wallet("W1", fixed);
        w.topUp(5000); w.pay(3000);
        System.out.println("balance " + w.balance());            // 2000
        try { w.pay(3000); } catch (IllegalStateException e) { System.out.println(e.getMessage()); }
        w.freeze(); w.topUp(1000);
        try { w.pay(100); } catch (IllegalStateException e) { System.out.println(e.getMessage()); }
        System.out.println("balance " + w.balance());            // 3000
    }
}`,
        complexity: `<p>O(1) per operation. Rule copies: 1. Number of ways to put the wallet into an invalid state from outside: 0.</p>`,
        followUps: ['How would an admin correction work without a raw setter? (An explicit <code>adjust(amount, reason)</code> method that still enforces non-negative balance and records an audit event.)', 'Why inject Clock instead of calling LocalDate.now()?', 'How would you make Wallet safe under concurrent pay() calls?']
      }
    }]
  });
  /* ======================= TOPIC 2: DEPENDENCY INJECTION BY HAND ======================= */
  topics.push({
    title: 'Dependency Injection by Hand: Composition Root and a Tiny Container',
    analogy: `<p>A <b>restaurant chef</b> does not grow tomatoes, raise chickens and forge knives before cooking. Ingredients and tools are <b>delivered</b> to the kitchen, and the chef just cooks. If the supplier changes, the chef does not care, as long as tomatoes are tomatoes. The <b>restaurant manager</b> is the one person who decides which supplier to use. In code, the chef is your class, the deliveries are constructor parameters, and the manager is the <b>composition root</b> (your <code>main</code>).</p>`,
    explain: `<p><b>Dependency</b> = something your class needs to do its job (a repository, a payment client, a clock). <b>Injection</b> = someone else hands it to you instead of you building it with <code>new</code>. That is the whole idea; no framework required.</p>
${H.table(['Style', 'Code', 'Verdict'], [
  ['<b>Constructor injection</b>', '<code>OrderService(OrderRepository r, PaymentPort p)</code>', '<span class="c-g">Default choice.</span> Fields can be <code>final</code>; object is complete the moment it exists; missing dependency = compile error'],
  ['Setter injection', '<code>svc.setRepo(r)</code>', 'Only for truly optional dependencies; object can exist half-built'],
  ['Field injection', '<code>@Inject private Repo r;</code>', '<span class="c-r">Avoid.</span> Needs a framework + reflection, hides dependencies, cannot be <code>final</code>, hard to test'],
  ['Method injection', '<code>report.render(Clock clock)</code>', 'When the dependency changes per call']
])}
<p><b>The composition root</b> is the single place (usually <code>main</code> or app startup) where you call <code>new</code> on concrete classes and connect them. Everything else only receives interfaces. Wiring by hand looks like this:</p>
${H.table(['Step', 'Line in main()', 'Why'], [
  ['1', '<code>var clock = Clock.systemUTC();</code>', 'leaves first (no dependencies)'],
  ['2', '<code>var repo = new JdbcOrderRepository(dataSource);</code>', 'needs the data source'],
  ['3', '<code>var pay = new StripePayments(http, clock);</code>', 'needs http + clock'],
  ['4', '<code>var svc = new OrderService(repo, pay, clock);</code>', 'root of the graph, built last']
])}
<p>You build the <b>dependency graph from the leaves up</b>. Tests do the same thing with fakes: <code>new OrderService(new InMemoryRepo(), new FakePayments(), fixedClock)</code>. No mocking library, no database, runs in a millisecond.</p>
<p>When the graph gets big (50+ classes), hand wiring gets long. A <b>DI container</b> automates it: you <i>register</i> how to build each type, then ask for the root, and the container resolves the graph recursively. A container also manages <b>scope</b> (lifetime): <b>singleton</b> (one shared instance), <b>prototype/transient</b> (new each time), <b>request</b> (one per web request). Spring, Guice and Dagger are containers; below you will write a tiny one in ~30 lines to see there is no magic.</p>
<p><b>DI vs DIP:</b> the Dependency <i>Inversion</i> Principle (SOLID "D") says "depend on abstractions". Dependency <i>Injection</i> is the delivery technique. You can inject concrete classes (DI without DIP) and you can depend on interfaces but look them up from a global (DIP without DI — the Service Locator). You want both.</p>`,
    clues: [
      '"How would you <b>test</b> this without hitting the real payment gateway?" → constructor injection + fake.',
      '"Make the <b>time</b> / random / UUID controllable" → inject <code>Clock</code>, <code>Supplier&lt;UUID&gt;</code>, <code>RandomGenerator</code>.',
      '"Explain how Spring <code>@Autowired</code> works" → container: registry of bindings + recursive resolution + scopes + proxies.',
      '"Singleton pattern" in an LLD answer → interviewer may push back: prefer one instance <b>managed by the composition root</b> (DI singleton scope) over a static <code>getInstance()</code>.',
      '"Circular dependency error at startup" → resolution stack detected A → B → A; fix the design, do not reach for setter injection.',
      'Class has <b>7+ constructor parameters</b> → the class does too much (SRP smell), not a DI problem.'
    ],
    code: [`// 1) Pure manual DI. No framework. main() is the composition root.
interface OrderRepository { void save(String id); List<String> all(); }
interface PaymentPort { boolean charge(String orderId, long paise); }

class InMemoryOrderRepository implements OrderRepository {
    private final List<String> rows = new ArrayList<>();
    public void save(String id) { rows.add(id); }
    public List<String> all() { return List.copyOf(rows); }
}
class FakePayments implements PaymentPort {
    private final long limit;
    FakePayments(long limit) { this.limit = limit; }
    public boolean charge(String orderId, long paise) { return paise <= limit; }
}

class OrderService {
    private final OrderRepository repo; private final PaymentPort payments; private final Clock clock;
    // Every dependency is visible in ONE place, final, and required.
    OrderService(OrderRepository repo, PaymentPort payments, Clock clock) {
        this.repo = Objects.requireNonNull(repo); this.payments = Objects.requireNonNull(payments); this.clock = Objects.requireNonNull(clock);
    }
    String place(String id, long paise) {
        if (!payments.charge(id, paise)) return "DECLINED " + id;
        repo.save(id);
        return "PLACED " + id + " at " + LocalTime.now(clock);
    }
}

class App {
    public static void main(String[] args) {
        // Leaves first...
        Clock clock = Clock.fixed(Instant.parse("2026-03-01T09:30:00Z"), ZoneOffset.UTC);
        OrderRepository repo = new InMemoryOrderRepository();
        PaymentPort payments = new FakePayments(100_000);
        // ...root last.
        OrderService svc = new OrderService(repo, payments, clock);
        System.out.println(svc.place("A-1", 50_000));    // PLACED A-1 at 09:30
        System.out.println(svc.place("A-2", 500_000));   // DECLINED A-2
        System.out.println(repo.all());                  // [A-1]
    }
}`, `// 2) A tiny DI container: bindings + scopes + recursive resolution + cycle detection.
class Container {
    enum Scope { SINGLETON, PROTOTYPE }
    private record Binding(Function<Container, Object> factory, Scope scope) {}

    private final Map<Class<?>, Binding> bindings = new HashMap<>();
    private final Map<Class<?>, Object> singletons = new HashMap<>();
    private final Deque<Class<?>> resolving = new ArrayDeque<>();   // the "resolution stack"

    <T> Container singleton(Class<T> type, Function<Container, ? extends T> f) {
        bindings.put(type, new Binding(c -> f.apply(c), Scope.SINGLETON)); return this;
    }
    <T> Container prototype(Class<T> type, Function<Container, ? extends T> f) {
        bindings.put(type, new Binding(c -> f.apply(c), Scope.PROTOTYPE)); return this;
    }

    <T> T get(Class<T> type) {
        Binding b = bindings.get(type);
        if (b == null) throw new IllegalStateException("No binding for " + type.getSimpleName());
        if (b.scope() == Scope.SINGLETON && singletons.containsKey(type)) return type.cast(singletons.get(type)); // cache hit
        if (resolving.contains(type)) {                     // we are already building this type higher up the stack
            List<String> path = new ArrayList<>();
            resolving.descendingIterator().forEachRemaining(c -> path.add(c.getSimpleName()));
            path.add(type.getSimpleName());
            throw new IllegalStateException("Dependency cycle: " + String.join(" -> ", path));
        }
        resolving.push(type);
        try {
            Object instance = b.factory().apply(this);      // factory calls get(...) for its own dependencies
            if (b.scope() == Scope.SINGLETON) singletons.put(type, instance);
            return type.cast(instance);
        } finally {
            resolving.pop();
        }
    }
}

interface Greeter { String greet(String name); }
class Prefix { final String text; Prefix(String t) { text = t; } }
class PoliteGreeter implements Greeter {
    private final Prefix prefix; private final Clock clock;
    PoliteGreeter(Prefix p, Clock c) { prefix = p; clock = c; }
    public String greet(String n) { return prefix.text + " " + n + " (" + LocalDate.now(clock) + ")"; }
}
class A { A(B b) {} }
class B { B(A a) {} }

class ContainerDemo {
    public static void main(String[] args) {
        Container c = new Container()
            .singleton(Clock.class, k -> Clock.fixed(Instant.parse("2026-05-05T00:00:00Z"), ZoneOffset.UTC))
            .singleton(Prefix.class, k -> new Prefix("Namaste"))
            .prototype(Greeter.class, k -> new PoliteGreeter(k.get(Prefix.class), k.get(Clock.class)));
        System.out.println(c.get(Greeter.class).greet("Asha"));
        System.out.println("same Clock? " + (c.get(Clock.class) == c.get(Clock.class)));        // true  (singleton)
        System.out.println("same Greeter? " + (c.get(Greeter.class) == c.get(Greeter.class)));  // false (prototype)
        c.singleton(A.class, k -> new A(k.get(B.class))).singleton(B.class, k -> new B(k.get(A.class)));
        try { c.get(A.class); } catch (IllegalStateException e) { System.out.println(e.getMessage()); } // A -> B -> A
    }
}`, { lang: 'java', check: false, title: 'For comparison only: the same wiring in Spring (needs the framework)', code: `@Configuration
class AppConfig {
    @Bean Clock clock() { return Clock.systemUTC(); }
    @Bean OrderRepository orderRepository(DataSource ds) { return new JdbcOrderRepository(ds); }
    @Bean OrderService orderService(OrderRepository r, PaymentPort p, Clock c) { return new OrderService(r, p, c); }
}
// Spring scans @Bean methods, builds a graph of BeanDefinitions, resolves it like our Container,
// caches singletons, and wraps beans in proxies for @Transactional / @Async.` }],
    codeTitle: ['Manual DI: composition root in main()', 'Build your own DI container (singleton/prototype + cycle detection)', 'Framework version (not compiled)'],
    viz: {
      title: 'DI container wiring: resolve the graph from the root down, build from the leaves up',
      input: 'OrderService: OrderRepo PaymentGateway Clock; OrderRepo: DataSource; PaymentGateway: HttpClient Clock; DataSource; HttpClient; Clock',
      inputLabel: 'Bindings "Type: dep dep; Type: dep; Leaf" — first type is the one requested (try adding "; Clock: OrderService" for a cycle)',
      gen: function (input) {
        var parts = tokens(input, ';', 10, 'Format: "A: B C; B: C; C" (max 10 types)');
        var deps = {}, order = [];
        parts.forEach(function (p) {
          var m = p.split(':'), name = m[0].trim();
          if (!/^[A-Za-z][A-Za-z0-9]{0,15}$/.test(name)) throw new Error('Type names must be words up to 16 letters, e.g. "OrderRepo"');
          var ds = (m[1] || '').trim().split(/[\s,]+/).filter(function (s) { return s; });
          if (ds.length > 5) throw new Error('At most 5 dependencies per type');
          if (!deps[name]) order.push(name);
          deps[name] = ds;
        });
        order.forEach(function (n) { deps[n].forEach(function (d) { if (!deps[d] && order.indexOf(d) < 0) { order.push(d); deps[d] = null; } }); });
        if (order.length > 12) throw new Error('Too many types (max 12 including unknown ones)');
        // layout: depth = BFS distance from the root
        var depth = {}, q = [order[0]]; depth[order[0]] = 0;
        while (q.length) { var u = q.shift(); (deps[u] || []).forEach(function (v) { if (depth[v] === undefined) { depth[v] = depth[u] + 1; q.push(v); } }); }
        order.forEach(function (n) { if (depth[n] === undefined) depth[n] = 0; });
        var maxD = 0; order.forEach(function (n) { maxD = Math.max(maxD, depth[n]); });
        var byD = {}; order.forEach(function (n) { (byD[depth[n]] = byD[depth[n]] || []).push(n); });
        var nodes = order.map(function (n) {
          var lvl = byD[depth[n]], i = lvl.indexOf(n);
          return B(n, n + (deps[n] === null ? ' ?' : ''), maxD ? 10 + depth[n] * (80 / maxD) : 50, (i + 1) * 64 / (lvl.length + 1));
        });
        var edges = []; order.forEach(function (n) { (deps[n] || []).forEach(function (d) { edges.push([n, d]); }); });
        var frames = [], stack = [], cache = [], hl = {}, ehl = {}, built = 0, failed = false;
        function snap(narr, extra) {
          var mp = cache.map(function (c) { return [c, 'instance #' + (cache.indexOf(c) + 1)]; });
          var ps = [G('Dependency graph (arrow = "needs")', nodes, edges, { h: 66, hl: clone(hl), ehl: clone(ehl) }), STACK('resolution stack (top = being built)', stack, stack.length ? (function () { var h = {}; h[stack.length - 1] = failed ? 'bad' : 'cur'; return h; })() : {}), MAP('singleton cache', mp, extra || {})];
          frames.push(F(narr, ps));
        }
        snap('Container is configured with <b>' + order.length + '</b> bindings. You ask for <b>' + esc(order[0]) + '</b>. The container must first build everything it needs. Nothing exists yet.', {});
        function resolve(n, from) {
          if (failed) return;
          if (from) ehl[from + '-' + n] = 'cur';
          if (deps[n] === null) { failed = true; hl[n] = 'bad'; snap('<span class="c-r">No binding for <b>' + esc(n) + '</b>!</span> Real containers fail <b>at startup</b> with exactly this error — good, because it fails fast instead of at 3 a.m. on the first request.'); return; }
          if (cache.indexOf(n) >= 0) { hl[n] = 'sel'; var h = {}; h[n] = 'sel'; if (from) ehl[from + '-' + n] = 'ok'; snap('<b>' + esc(n) + '</b> is a singleton that already exists → <b>reuse it</b> from the cache. Both consumers now share the same instance.', h); hl[n] = 'ok'; return; }
          if (stack.indexOf(n) >= 0) { failed = true; hl[n] = 'bad'; if (from) ehl[from + '-' + n] = 'bad'; stack.push(n); snap('<span class="c-r">Cycle!</span> <b>' + esc(n) + '</b> is already on the resolution stack: ' + stack.map(esc).join(' → ') + '. Neither object can be constructed first. Fix the design (extract the shared part, or use a domain event) instead of hiding it with setter injection.'); return; }
          stack.push(n); hl[n] = 'cur';
          snap('Resolve <b>' + esc(n) + '</b>: push it on the stack. Its constructor needs ' + (deps[n].length ? '<b>' + deps[n].map(esc).join(', ') + '</b> → resolve those first.' : '<b>nothing</b> → it is a leaf, build it now.'));
          for (var i = 0; i < deps[n].length && !failed; i++) resolve(deps[n][i], n);
          if (failed) return;
          stack.pop(); cache.push(n); built++; hl[n] = 'ok';
          if (from) ehl[from + '-' + n] = 'ok';
          var h2 = {}; h2[n] = 'ok';
          snap('All dependencies of <b>' + esc(n) + '</b> are ready → call <code>new ' + esc(n) + '(' + deps[n].map(esc).join(', ') + ')</code>, put it in the singleton cache, pop it from the stack.', h2);
        }
        resolve(order[0], null);
        if (!failed) snap('<span class="c-g">Done.</span> ' + built + ' objects built, leaves first, root last — exactly the order you would write by hand in <code>main()</code>. A container is just this recursion plus a cache.', {});
        else snap('Startup aborted. The stack shows the exact path that failed — real containers print the same chain (Spring: "BeanCurrentlyInCreationException", Guice: "circular dependency").');
        return frames;
      }
    },
    examples: [
      { title: 'Testing with a hand-written fake (no mocking library)', html: `<p>Because <code>OrderService</code> takes a <code>PaymentPort</code>, a test can pass a 3-line fake that always declines and assert the order is not saved. ${H.kv([['real wiring', 'StripeAdapter + JdbcRepo'], ['test wiring', 'FakePayments(limit=0) + InMemoryRepo']], { label: 'same class, two compositions' })}</p>`, code: `interface PaymentPort { boolean charge(String orderId, long paise); }
class DeclineAll implements PaymentPort { public boolean charge(String id, long p) { return false; } }
// test:
// var repo = new InMemoryOrderRepository();
// var svc = new OrderService(repo, new DeclineAll(), Clock.systemUTC());
// assert svc.place("X", 100).startsWith("DECLINED") && repo.all().isEmpty();` },
      { title: 'Injecting time and randomness', html: `<p>Any code that calls <code>LocalDate.now()</code>, <code>UUID.randomUUID()</code> or <code>Math.random()</code> has a <b>hidden dependency</b> on the world. Inject <code>Clock</code> and <code>Supplier&lt;String&gt; idGen</code>. Tests use <code>Clock.fixed(...)</code> and <code>() -&gt; "id-1"</code>; production uses <code>Clock.systemUTC()</code> and <code>UUID::randomUUID</code>.</p>`, code: `class TicketFactory {
    private final Clock clock; private final Supplier<String> ids;
    TicketFactory(Clock clock, Supplier<String> ids) { this.clock = clock; this.ids = ids; }
    String newTicket() { return ids.get() + "@" + Instant.now(clock); }
}` },
      { title: 'Per-request objects: inject a factory, not the object', html: `<p>A singleton <code>CheckoutService</code> cannot hold a <code>ShoppingCart</code> (that is per user). Inject a <code>Supplier&lt;ShoppingCart&gt;</code> or a <code>CartFactory</code>; the service calls it when it needs a fresh cart. This is how containers implement "request scope" under the hood (a proxy that looks up the current request's instance).</p>` },
      { title: 'Service Locator: the look-alike anti-pattern', html: `<p><code>Registry.get(PaymentPort.class)</code> called <i>inside</i> a method also avoids <code>new</code>, but the dependency is now <b>hidden</b>: the constructor lies about what the class needs, tests must remember to fill the global registry, and a missing binding fails at runtime deep in a call. ${H.c('g', 'DI pushes dependencies in')}; ${H.c('r', 'a locator lets classes pull them out of a global')}.</p>` }
    ],
    deepDive: `<p><b>How real containers work.</b> Spring reads <code>@Bean</code>/<code>@Component</code> into <code>BeanDefinition</code>s (type, scope, factory, dependencies), sorts them, and instantiates singletons eagerly at startup — exactly our <code>get()</code> recursion with a cache. Extra machinery: <b>BeanPostProcessors</b> wrap beans in proxies (that is how <code>@Transactional</code> works — and why calling a <code>@Transactional</code> method from the same class skips the proxy). Spring resolves <i>setter/field</i> cycles via an "early reference" cache (three-level cache) but constructor cycles fail; since Spring Boot 2.6 cycles are rejected by default.</p>
<p><b>Compile-time DI.</b> <b>Dagger</b> (Android) and <b>Micronaut</b>/<b>Quarkus</b> generate the wiring code at build time with annotation processors — the generated code looks like your hand-written <code>main()</code>. Benefits: no reflection, faster startup, cycles and missing bindings are <b>compile errors</b>. GraalVM native images prefer this.</p>
<p><b>Scopes and the captive dependency bug.</b> If a singleton holds a reference to a request-scoped or prototype object, that object is "captured" and lives forever — shared across users. Rule: a longer-lived object may only depend on equal-or-longer-lived ones, or on a <i>factory/provider</i> of shorter-lived ones.</p>
<p><b>Thread safety of our container.</b> Our <code>get()</code> is not thread-safe (HashMap + shared stack). Real containers either build all singletons at startup on one thread (then the map is read-only) or use <code>ConcurrentHashMap.computeIfAbsent</code> with per-thread resolution stacks. Note <code>computeIfAbsent</code> must not be called recursively on the same map (it throws <code>IllegalStateException: Recursive update</code>), which is why containers keep their own creation lock.</p>
<p><b>Constructor over-injection</b> (8 parameters) is a design smell, not a DI smell: split the class, or group parameters into a cohesive object. <b>Optional dependencies</b>: prefer a Null Object (<code>Notifier.NONE</code>) over nullable fields.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants know Spring idioms extremely well and will default to <code>@Autowired</code> field injection — the one style you should avoid. Ask explicitly for "constructor injection, final fields, no field injection". They are excellent at generating the boring composition root and test fakes once you show one example.</p>
<p><b>DI makes AI-written tests possible.</b> An agent can generate meaningful unit tests only if dependencies can be replaced. Prompt: <code>Write JUnit 5 tests for OrderService using hand-written fakes for PaymentPort and OrderRepository; cover declined payment, repo failure and a fixed Clock</code>. With a coupled class, the AI will either produce tests that hit real services or reach for heavy mocking of static calls.</p>
<p><b>LLM apps are DI-heavy:</b> the model client, vector store, tool registry and prompt templates are all dependencies. Injecting a <code>ChatModel</code> interface lets you run evals with a cheap model, record/replay responses in tests, and switch providers — exactly the "switch Stripe to Razorpay" problem in new clothes.</p>
<p><b>Where AI goes wrong:</b> creates a static "ServiceLocator" when asked to "avoid passing parameters everywhere", mixes scopes (singleton holding a per-request object), or hides <code>new HttpClient()</code> deep inside helpers. <b>What you must own:</b> the shape of the object graph and the lifetimes of each node.</p>`,
    problems: [{
      title: 'Composition Root for a Food Delivery Checkout', level: 'Medium', tags: ['dependency injection', 'composition root', 'testing'], companies: ['Swiggy', 'Zomato', 'DoorDash'],
      statement: `<p><code>CheckoutService.checkout(cartId)</code> loads a cart, computes delivery fee (₹30 flat; free above ₹500), charges payment, saves the order and sends an SMS. Today the class does <code>new MySqlCartDao()</code>, <code>new RazorpayClient()</code>, <code>new Msg91Sms()</code> and <code>LocalDateTime.now()</code> (orders after 11 pm add ₹20 night fee). Redesign with <b>constructor injection</b>, write a <b>composition root</b> for production and another for tests using hand-written fakes, and show a test that proves the night fee.</p>`,
      constraints: `No frameworks. All infrastructure behind interfaces. Time must be controllable in tests.`,
      example: `<p>Cart total ₹450 at 23:30 → fee 30 + night 20 → charge ${H.c('b', '₹500')}. Cart ₹600 at 12:00 → ${H.c('g', 'free delivery')}, charge ₹600. In the test composition the clock is <code>Clock.fixed(23:30)</code>, payment is a fake that records charges, SMS is a fake that stores messages in a list.</p>`,
      brute: { why: `<p>The fee logic is correct but untestable: to test the night fee you must run the test after 11 pm, it charges real money in Razorpay's sandbox, and sends real SMS. Switching SMS vendor edits <code>CheckoutService</code>.</p>`, code: `class CheckoutServiceBrute {
    long checkout(String cartId) {
        long total = 450 * 100;                                   // pretend: new MySqlCartDao().load(cartId)
        long fee = total > 50_000 ? 0 : 3_000;
        if (LocalDateTime.now().getHour() >= 23) fee += 2_000;   // hidden dependency on the real clock
        long charge = total + fee;
        System.out.println("Razorpay charge " + charge);         // pretend: new RazorpayClient().charge(...)
        System.out.println("MSG91 SMS: order placed");           // pretend: new Msg91Sms().send(...)
        return charge;
    }
}` },
      mcq: { q: 'Which dependency is the easiest to forget when making this class testable?', options: ['The system clock (LocalDateTime.now())', 'The cart DAO', 'The payment client', 'The SMS client'], answer: 0, explain: 'Static calls like LocalDateTime.now(), UUID.randomUUID() and Math.random() are hidden dependencies: they do not appear in the constructor, yet they make behaviour depend on the outside world.' },
      hints: [`<p>Hint 1: List everything the class touches outside its own memory: DB, payment, SMS, <b>time</b>. Each becomes a constructor parameter typed as an interface (time as <code>java.time.Clock</code>).</p>`, `<p>Hint 2: Fakes are tiny classes (or lambdas) that record calls in a list. A fake beats a mock when you want to assert on state ("was exactly one SMS sent?").</p>`, `<p>Hint 3: Recipe: interfaces CartRepository, PaymentPort, SmsPort → CheckoutService(repo, pay, sms, clock) → FeePolicy pure function → two composition roots: prodMain() and testMain().</p>`],
      solution: {
        approach: `<p>Extract four seams: <code>CartRepository</code>, <code>PaymentPort</code>, <code>SmsPort</code> and <code>Clock</code>. Pull the fee rule into a small pure <code>FeePolicy</code> so it can be tested alone. <code>CheckoutService</code> receives everything through its constructor. Two composition roots exist: production wires real adapters (shown as stubs here), the test wires fakes and a fixed clock. The business class is identical in both.</p>`,
        code: `interface CartRepository { long totalPaise(String cartId); }
interface PaymentPort { void charge(String ref, long paise); }
interface SmsPort { void send(String msg); }

final class FeePolicy {                                    // pure, trivially testable
    static long fee(long total, LocalTime at) {
        long fee = total > 50_000 ? 0 : 3_000;
        if (!at.isBefore(LocalTime.of(23, 0))) fee += 2_000;
        return fee;
    }
}

class CheckoutService {
    private final CartRepository carts; private final PaymentPort pay; private final SmsPort sms; private final Clock clock;
    CheckoutService(CartRepository carts, PaymentPort pay, SmsPort sms, Clock clock) {
        this.carts = carts; this.pay = pay; this.sms = sms; this.clock = clock;
    }
    long checkout(String cartId) {
        long total = carts.totalPaise(cartId);
        long charge = total + FeePolicy.fee(total, LocalTime.now(clock));
        pay.charge(cartId, charge);
        sms.send("Order for " + cartId + " placed, paid " + charge / 100);
        return charge;
    }
}

class RecordingPayments implements PaymentPort {
    final List<Long> charges = new ArrayList<>();
    public void charge(String ref, long paise) { charges.add(paise); }
}

class Roots {
    // Production root would be: new CheckoutService(new JdbcCartRepository(ds), new RazorpayAdapter(http), new Msg91Adapter(http), Clock.systemDefaultZone())
    public static void main(String[] args) {
        // Test composition root: fakes + fixed clock at 23:30
        Clock lateNight = Clock.fixed(Instant.parse("2026-02-10T23:30:00Z"), ZoneOffset.UTC);
        RecordingPayments pay = new RecordingPayments();
        List<String> smsOutbox = new ArrayList<>();
        CheckoutService svc = new CheckoutService(id -> 45_000, pay, smsOutbox::add, lateNight);
        long charged = svc.checkout("C-9");
        System.out.println(charged == 50_000 ? "night fee test PASSED" : "FAILED " + charged);
        System.out.println(pay.charges + " " + smsOutbox);
    }
}`,
        complexity: `<p>O(1) per checkout. Test runtime: microseconds, no network. Swapping SMS vendor: one new adapter + one line in the production root.</p>`,
        followUps: ['Where would you put retries for the payment call — in the service or in a decorator around PaymentPort?', 'How do you make sure the production root and test root do not drift apart (e.g. a smoke test that builds the prod graph with stub endpoints)?', 'If SMS fails after payment succeeded, what should happen? (Leads to domain events + outbox.)']
      }
    }]
  });
  /* ======================= TOPIC 3: PLUGIN ARCHITECTURES ======================= */
  topics.push({
    title: 'Plugin Architectures: A Small Core with Sockets for Everything Else',
    analogy: `<p>A <b>power strip</b> has a fixed shape of socket. The strip does not know whether you will plug in a phone charger, a lamp or a kettle — it only promises "230 V through this shape". Anyone in the world can build a new device that fits, without asking the strip manufacturer. A <b>smartphone and its app store</b> is the same deal: the phone is the core, apps are plugins, and the OS defines what an app is allowed to do (camera permission, notifications). A buggy app crashes itself, not the phone.</p>`,
    explain: `<p>A <b>plugin architecture</b> (also called <i>microkernel</i>) splits a system into a small, stable <b>core</b> and many <b>plugins</b> that add features. The core defines <b>extension points</b> — interfaces that say "if you want to add an exporter / payment method / lint rule, implement this". Adding a feature = adding a plugin; the core is never edited. This is the Open/Closed Principle at the size of a whole application.</p>
${H.table(['Piece', 'What it is', 'Example (report exporter)'], [
  ['<b>Extension point</b>', 'A stable interface owned by the core', '<code>interface Exporter { String format(); byte[] export(Report r); }</code>'],
  ['<b>Plugin</b>', 'A class implementing it, often in its own JAR', '<code>CsvExporter</code>, <code>PdfExporter</code>'],
  ['<b>Metadata</b>', 'Name, version, which API version it targets', '<code>pdf 1.3.0, api 1</code>'],
  ['<b>Registry</b>', 'Map from key to plugin, filled at startup', '<code>Map&lt;String, Exporter&gt;</code>'],
  ['<b>Discovery</b>', 'How the core finds plugins', 'manual list, <code>ServiceLoader</code>, scanning a folder of JARs'],
  ['<b>Lifecycle</b>', 'init → start → stop hooks', 'open a font cache on start, close on stop']
])}
<p><b>How the core finds plugins.</b> Three common ways, simplest first:</p>
<ul><li><b>Manual registration</b> — <code>registry.register(new CsvExporter())</code> in the composition root. Simple and explicit; adding a plugin still needs one line in main.</li>
<li><b>Java <code>ServiceLoader</code></b> — each plugin JAR contains a text file <code>META-INF/services/com.acme.Exporter</code> listing its class name (or <code>provides Exporter with PdfExporter;</code> in <code>module-info.java</code>). The core calls <code>ServiceLoader.load(Exporter.class)</code> and gets instances of every plugin on the classpath. This is how JDBC drivers, logging backends and <code>java.time</code> zone providers are found.</li>
<li><b>Folder scanning + own class loader</b> — the app watches a <code>plugins/</code> folder and loads each JAR with its own <code>URLClassLoader</code>. This allows install/uninstall at runtime and isolates plugins' libraries from each other (IntelliJ, Jenkins, Minecraft servers).</li></ul>
<p><b>Rules for a good core:</b> keep extension points <b>small and stable</b> (every change breaks every plugin), <b>version</b> them (core supports API v1 and v2), <b>never let one plugin crash the core</b> (catch exceptions at the boundary, quarantine the plugin), and decide <b>conflict rules</b> (two plugins claim "pdf" → priority or error). Plugins talk to the core only through the API you hand them — never by reaching into core internals.</p>`,
    clues: [
      '"New <b>payment methods / file formats / rules</b> will be added by other teams or third parties" → extension point + registry.',
      '"Without redeploying the core" / "customers write their own extensions" → plugin discovery (ServiceLoader or folder scanning).',
      '"A buggy extension must not bring the system down" → isolation: try/catch at the boundary, quarantine, timeouts, separate class loaders or processes.',
      '"Design an IDE / text editor / linter / Jenkins-like CI" → microkernel architecture.',
      '"Support old plugins after we change the interface" → API versioning, default methods, adapters for old versions.',
      'The word <b>"pluggable"</b> or <b>"configurable at runtime"</b> in the requirements.'
    ],
    code: [`// Core: extension point + metadata + registry with version check, lifecycle and failure isolation.
record Report(String title, List<String> rows) {}

interface ExporterPlugin {                    // the EXTENSION POINT (owned by the core, kept tiny)
    int API_VERSION = 1;                      // what this core speaks
    String format();                          // registry key, e.g. "csv"
    default int apiVersion() { return 1; }    // what the plugin was built against
    default void start() {}                   // lifecycle hooks with safe defaults
    default void stop() {}
    String export(Report r);
}

class PluginRegistry {
    private final Map<String, ExporterPlugin> active = new LinkedHashMap<>();
    private final List<String> rejected = new ArrayList<>();

    void install(ExporterPlugin p) {
        String key = p.format().toLowerCase();
        if (p.apiVersion() != ExporterPlugin.API_VERSION) { rejected.add(key + " (needs API v" + p.apiVersion() + ")"); return; }
        if (active.containsKey(key)) { rejected.add(key + " (duplicate format)"); return; }
        try {
            p.start();                                  // a plugin that throws on start is quarantined,
            active.put(key, p);                         // the core keeps running
        } catch (RuntimeException e) {
            rejected.add(key + " (failed to start: " + e.getMessage() + ")");
        }
    }
    String export(String format, Report r) {
        ExporterPlugin p = active.get(format.toLowerCase());
        if (p == null) throw new IllegalArgumentException("No exporter for '" + format + "'. Available: " + active.keySet());
        try { return p.export(r); }
        catch (RuntimeException e) { throw new IllegalStateException("Plugin '" + format + "' failed: " + e.getMessage(), e); }
    }
    void shutdown() { active.values().forEach(p -> { try { p.stop(); } catch (RuntimeException ignored) { } }); }
    Set<String> formats() { return active.keySet(); }
    List<String> rejected() { return rejected; }
}

// Plugins: could live in separate JARs. The core never names them.
class CsvExporter implements ExporterPlugin {
    public String format() { return "csv"; }
    public String export(Report r) { return String.join(",", r.rows()); }
}
class MarkdownExporter implements ExporterPlugin {
    public String format() { return "md"; }
    public String export(Report r) { return "# " + r.title() + " | " + String.join(" | ", r.rows()); }
}
class FutureXmlExporter implements ExporterPlugin {
    public String format() { return "xml"; }
    public int apiVersion() { return 2; }           // built for a newer core -> rejected safely
    public String export(Report r) { return "<report/>"; }
}
class BrokenPdfExporter implements ExporterPlugin {
    public String format() { return "pdf"; }
    public void start() { throw new IllegalStateException("font file missing"); }
    public String export(Report r) { return "%PDF"; }
}

class PluginDemo {
    public static void main(String[] args) {
        PluginRegistry reg = new PluginRegistry();
        List.of(new CsvExporter(), new MarkdownExporter(), new FutureXmlExporter(), new BrokenPdfExporter()).forEach(reg::install);
        Report r = new Report("Sales", List.of("north=10", "south=7"));
        System.out.println("active:   " + reg.formats());
        System.out.println("rejected: " + reg.rejected());
        System.out.println(reg.export("md", r));
        try { reg.export("pdf", r); } catch (IllegalArgumentException e) { System.out.println(e.getMessage()); }
        reg.shutdown();
    }
}`, `// Discovery with the JDK's built-in ServiceLoader (no framework).
// Each plugin JAR ships a text file:  META-INF/services/ExporterSpi   containing one line per class, e.g.  com.acme.pdf.PdfExporter
// (or, with Java modules:  provides ExporterSpi with com.acme.pdf.PdfExporter;  in module-info.java)
interface ExporterSpi { String format(); String export(List<String> rows); }

class Discovery {
    static Map<String, ExporterSpi> discover(ClassLoader loader) {
        Map<String, ExporterSpi> found = new TreeMap<>();
        // Iterate providers one by one so a single broken plugin does not stop discovery.
        Iterator<ServiceLoader.Provider<ExporterSpi>> it = ServiceLoader.load(ExporterSpi.class, loader).stream().iterator();
        while (it.hasNext()) {
            try {
                ExporterSpi p = it.next().get();          // instantiates lazily
                found.putIfAbsent(p.format(), p);
            } catch (ServiceConfigurationError e) {
                System.out.println("skipping bad plugin: " + e.getMessage());
            }
        }
        return found;
    }
    public static void main(String[] args) {
        Map<String, ExporterSpi> plugins = discover(Thread.currentThread().getContextClassLoader());
        System.out.println("discovered " + plugins.size() + " exporters: " + plugins.keySet()); // 0 here: no plugin JARs on the classpath
    }
}`, `// Hook-style plugins: plugins subscribe to named hooks in the core's pipeline, ordered by priority.
interface SavePlugin { int priority(); String beforeSave(String text); }

class Editor {
    private final List<SavePlugin> hooks = new ArrayList<>();
    void register(SavePlugin p) { hooks.add(p); hooks.sort(Comparator.comparingInt(SavePlugin::priority)); }
    String save(String text) {
        for (SavePlugin p : hooks) {
            try { text = p.beforeSave(text); }                 // each plugin transforms the text in turn
            catch (RuntimeException e) { System.out.println("hook failed, skipped: " + e.getMessage()); }
        }
        return text;
    }
    public static void main(String[] args) {
        Editor ed = new Editor();
        ed.register(new SavePlugin() { public int priority() { return 20; } public String beforeSave(String t) { return t.strip(); } });
        ed.register(new SavePlugin() { public int priority() { return 10; } public String beforeSave(String t) { return t.replace("teh", "the"); } });
        ed.register(new SavePlugin() { public int priority() { return 30; } public String beforeSave(String t) { throw new RuntimeException("spellcheck server down"); } });
        System.out.println("[" + ed.save("   fix teh bug   ") + "]");   // [fix the bug]
    }
}`],
    codeTitle: ['Plugin registry with versioning, lifecycle and isolation', 'Discovery with java.util.ServiceLoader', 'Hook pipeline plugins ordered by priority'],
    viz: {
      title: 'Plugin boot + dispatch: discover → version check → start → register → route a request',
      input: 'csv, json, xml@2, pdf!, md -> pdf',
      inputLabel: 'Plugins (name@2 = built for API v2, name! = crashes on start) -> requested format',
      gen: function (input) {
        var s = String(input || '');
        var halves = s.split('->');
        if (halves.length !== 2) throw new Error('Format: "csv, json, xml@2, pdf! -> json"');
        var raw = tokens(halves[0], ',', 7, 'List plugins separated by commas');
        var want = halves[1].trim().toLowerCase();
        if (!/^[a-z0-9]{1,8}$/.test(want)) throw new Error('Requested format must be a short word, e.g. pdf');
        var plugs = raw.map(function (t) {
          var m = t.toLowerCase().match(/^([a-z0-9]{1,8})(@(\d))?(!)?$/);
          if (!m) throw new Error('Bad plugin "' + t + '". Use letters, optional @2 and/or !, e.g. xml@2 or pdf!');
          return { name: m[1], api: m[3] ? +m[3] : 1, crash: !!m[4] };
        });
        var nodes = [B('CORE', 'Core app', 10, 36), B('API', 'Exporter API v1', 40, 36), B('REG', 'Registry', 40, 64)];
        plugs.forEach(function (p, i) { nodes.push(B('P' + i, p.name + (p.api !== 1 ? ' (api ' + p.api + ')' : ''), 82, (i + 1) * 72 / (plugs.length + 1))); });
        var edges = [['CORE', 'API', 'owns'], ['CORE', 'REG', 'looks up']];
        var hl = { CORE: 'cur', API: 'sel' }, ehl = {}, tags = {}, reg = [], frames = [], regHl = {};
        function snap(narr, extra) { frames.push(F(narr, [G('Microkernel: core, extension point, plugins', nodes, edges, { h: 72, hl: clone(hl), ehl: clone(ehl), tags: clone(tags) }), MAP('registry: format → plugin', reg, clone(regHl))].concat(extra || []))); }
        snap('Boot: the <b>core</b> owns one extension point, <code>ExporterPlugin</code> (API v1). It knows <b>no plugin by name</b>. Discovery (ServiceLoader / plugins folder) found <b>' + plugs.length + '</b> candidates on the right.');
        plugs.forEach(function (p, i) {
          var id = 'P' + i; hl = clone(hl); hl[id] = 'cur'; regHl = {};
          edges.push([id, 'API', 'implements']);
          ehl = clone(ehl); ehl[id + '-API'] = 'cur';
          snap('Discovered <b>' + esc(p.name) + '</b>. Step 1: read its metadata. It was built against <b>API v' + p.api + '</b>; this core speaks v1.', [VARS('checking', { plugin: p.name, pluginApi: p.api, coreApi: 1 }, { pluginApi: p.api === 1 ? 'ok' : 'bad' })]);
          if (p.api !== 1) { hl[id] = 'bad'; ehl[id + '-API'] = 'bad'; tags[id] = 'rejected'; snap('<span class="c-r">Rejected</span> <b>' + esc(p.name) + '</b>: incompatible API version. The core logs it and <b>keeps booting</b> — a version check at the boundary is far better than a <code>NoSuchMethodError</code> in production later.'); return; }
          if (reg.some(function (e) { return e[0] === p.name; })) { hl[id] = 'bad'; ehl[id + '-API'] = 'bad'; tags[id] = 'duplicate'; snap('<span class="c-r">Conflict</span>: another plugin already owns <b>' + esc(p.name) + '</b>. Rule chosen here: first one wins, second is rejected (alternatives: priority numbers, or fail startup).'); return; }
          if (p.crash) { hl[id] = 'bad'; ehl[id + '-API'] = 'bad'; tags[id] = 'quarantined'; snap('Step 2: call <code>start()</code> → <span class="c-r">it threw an exception</span> (e.g. "font file missing"). The core catches it at the boundary and <b>quarantines</b> the plugin. Other plugins and the core are unaffected.', [CODE('PluginRegistry.install', 'try {\n  p.start();\n  active.put(key, p);\n} catch (RuntimeException e) {\n  rejected.add(key);\n}', { 2: 'bad', 5: 'cur' })]); return; }
          hl[id] = 'ok'; ehl[id + '-API'] = 'ok'; tags[id] = 'active'; reg.push([p.name, p.name + 'Exporter']); regHl = {}; regHl[p.name] = 'ok';
          snap('Step 2: <code>start()</code> succeeded → <span class="c-g">register</span> <b>' + esc(p.name) + '</b> in the registry map. Adding this feature changed <b>zero</b> lines of the core.');
        });
        hl = clone(hl); hl.REG = 'cur'; ehl = clone(ehl); ehl['CORE-REG'] = 'cur'; regHl = {};
        var hit = null; reg.forEach(function (e) { if (e[0] === want) hit = e; });
        if (hit) regHl[want] = 'sel';
        snap('Request arrives: <b>export as "' + esc(want) + '"</b>. The core does one map lookup: <code>registry.get("' + esc(want) + '")</code> — no if/else chain over formats, ever.');
        if (hit) {
          var idx = -1; plugs.forEach(function (p, i) { if (p.name === want && tags['P' + i] === 'active') idx = i; });
          hl['P' + idx] = 'sel'; ehl['P' + idx + '-API'] = 'sel';
          snap('<span class="c-g">Found.</span> The core calls <code>export(report)</code> through the <b>interface</b>; the plugin does the work. If the plugin throws during export, the core wraps the error with the plugin\'s name so support knows whom to blame.', [TXT('Output: <b>report.' + esc(want) + '</b> generated by plugin <b>' + esc(want) + '</b>')]);
        } else {
          snap('<span class="c-r">No active plugin for "' + esc(want) + '".</span> The core answers with a helpful error listing what IS available: <b>' + (reg.length ? reg.map(function (e) { return esc(e[0]); }).join(', ') : 'nothing') + '</b>. (If it was quarantined or rejected, the boot log says why.)');
        }
        snap('Summary: core lines changed for all these plugins: <b>0</b>. Active: <b>' + reg.length + '</b>, rejected/quarantined: <b>' + (plugs.length - reg.length) + '</b>. This is Open/Closed at application scale.');
        return frames;
      }
    },
    examples: [
      { title: 'JDBC drivers are plugins', html: `<p><code>DriverManager.getConnection("jdbc:postgresql://...")</code> works without your code naming the Postgres driver class. The driver JAR lists itself in <code>META-INF/services/java.sql.Driver</code>; <code>DriverManager</code> uses <code>ServiceLoader</code> to find every driver and asks each "do you accept this URL?". Swap the JAR → swap the database. ${H.chips(['java.sql.Driver', 'org.postgresql.Driver', 'com.mysql.cj.jdbc.Driver'], { label: 'extension point → plugins' })}</p>` },
      { title: 'A payment-method registry in an e-commerce app', html: `<p>Extension point <code>PaymentMethod { String id(); boolean supports(Country c); Receipt pay(Money m); }</code>. Plugins: UPI, Card, PayPal, BNPL. At checkout the core asks the registry for all methods whose <code>supports(country)</code> is true and shows them. A new country launch = new plugin + config, no core release.</p>`, code: `interface PaymentMethod { String id(); boolean supports(String country); }
class PaymentMethods {
    private final List<PaymentMethod> all = new ArrayList<>();
    void register(PaymentMethod m) { all.add(m); }
    List<String> availableIn(String country) {
        return all.stream().filter(m -> m.supports(country)).map(PaymentMethod::id).sorted().toList();
    }
}` },
      { title: 'Evolving an extension point without breaking plugins', html: `<p>You want to add <code>mimeType()</code> to <code>ExporterPlugin</code>. Adding an abstract method breaks every existing plugin. Instead add a <b>default method</b>: <code>default String mimeType() { return "application/octet-stream"; }</code>. Old plugins keep compiling; new ones override it. For bigger changes ship <code>ExporterPluginV2</code> and an adapter that wraps V1 plugins.</p>` },
      { title: 'Plugins vs strategies', html: `${H.table(['', 'Strategy pattern', 'Plugin architecture'], [['Scale', 'one class', 'whole application'], ['Who writes the variants', 'your team', 'other teams / third parties'], ['Discovery', 'chosen in code', 'found at startup or runtime'], ['Needs versioning, isolation, lifecycle', 'no', 'yes']])}<p>A plugin system is a strategy registry plus discovery, versioning, lifecycle and isolation.</p>` }
    ],
    deepDive: `<p><b>Class loader isolation.</b> Two plugins may need different versions of the same library (Jackson 2.12 vs 2.17). Loading each plugin JAR in its own <code>URLClassLoader</code> whose parent is the core's API loader gives each plugin its own copy, while both still see the <i>same</i> <code>ExporterPlugin</code> interface (it must be loaded by the shared parent, or <code>instanceof</code> fails with the famous "ClassCastException: X cannot be cast to X"). Unloading a plugin = dropping every reference to its loader so it can be garbage-collected — any leaked thread or static cache pins it in memory forever (a common metaspace leak).</p>
<p><b>OSGi</b> (Eclipse, older app servers) formalised this: bundles declare imported/exported packages with version ranges, and the framework wires them. <b>JPMS</b> (Java modules) gives <code>uses</code>/<code>provides</code> with strong encapsulation. Most modern apps stay simpler: ServiceLoader + one flat classpath, restart to add plugins.</p>
<p><b>Security and stronger isolation.</b> The Java <code>SecurityManager</code> is deprecated for removal (JEP 411), so in-process plugins are fully trusted. For untrusted code run plugins <b>out of process</b> (separate JVM, container, WebAssembly sandbox) and talk over a protocol — VS Code runs extensions in a separate "extension host" process; Language Server Protocol and MCP servers are plugin protocols over JSON-RPC.</p>
<p><b>Failure modes to design for:</b> slow plugin (wrap calls with timeouts on an executor), plugin that leaks threads, plugin that mutates shared core objects (hand plugins immutable views/records), ordering dependencies between plugins (explicit priorities or declared <code>after = "x"</code> constraints, sorted topologically), and duplicate keys.</p>
<p><b>Stable API discipline:</b> keep the API package tiny, put data in records, prefer adding default methods, document semantic versioning (MAJOR = breaking), and run plugin contract tests in CI against every supported API version.</p>`,
    aiEra: `<p><b>AI tools ARE plugin systems.</b> LLM "tool calling" and the <b>Model Context Protocol (MCP)</b> are textbook microkernels: the agent host is the core, each MCP server exposes tools through a fixed protocol (the extension point), tools are discovered at startup (<code>tools/list</code>), described with metadata (name, JSON schema) and invoked by key. Everything in this topic — versioning, quarantining a crashing server, timeouts, permission boundaries, untrusted plugins in separate processes — applies directly.</p>
<p><b>Use AI as a partner:</b> <code>Here is my ExporterPlugin interface. Generate a new plugin for XLSX that follows the same contract, plus a contract test that every plugin must pass.</code> A small, well-documented extension point is the perfect unit of work for an AI coding agent: it can add a plugin without understanding the whole core.</p>
<p><b>Where AI goes wrong:</b> adds a new format by editing the core's switch statement instead of writing a plugin; changes the extension interface (breaking all plugins) to make one plugin easier; forgets to catch plugin exceptions at the boundary; trusts tool/plugin output as instructions (prompt injection through a plugin's response).</p>
<p><b>What you must own:</b> the shape and stability of the extension point, the trust model (which plugins can do what), and the compatibility policy.</p>`,
    problems: [{
      title: 'A Code Linter with Pluggable Rules', level: 'Medium', tags: ['plugin', 'registry', 'isolation'], companies: ['JetBrains', 'GitHub', 'Atlassian'],
      statement: `<p>Build the core of a linter. Rules are plugins with an id (e.g. <code>no-fixme</code>, <code>max-len</code>), a default severity, and a <code>check(lineNo, line)</code> that returns issues. Config enables/disables rules and overrides severity. Requirements: (1) adding a rule never edits the core; (2) a rule that throws must be reported as an internal error and must not stop other rules; (3) output issues sorted by line, then rule id.</p>`,
      constraints: `Up to 10<sup>5</sup> lines, up to 50 rules. Rules are stateless.`,
      example: `<p>Input lines: <code>int x = 1; // FIXME later</code>, a 130-char line. Rules: no-fixme (WARN), max-len 120 (ERROR), crashy-rule. Output: ${H.c('y', 'L1 WARN no-fixme')}, ${H.c('r', 'L2 ERROR max-len')}, ${H.c('m', 'internal: crashy-rule failed on L1')}. The crash is visible but harmless.</p>`,
      brute: { why: `<p>One giant <code>lint()</code> method with an if-block per rule and boolean flags for enabling. Every new rule edits it, one exception aborts the whole run, and third-party rules are impossible.</p>`, code: `class LinterBrute {
    List<String> lint(List<String> lines, boolean todoOn, boolean lenOn) {
        List<String> out = new ArrayList<>();
        for (int i = 0; i < lines.size(); i++) {
            String l = lines.get(i);
            if (todoOn && l.contains("FIXME")) out.add("L" + (i + 1) + " WARN no-fixme");
            if (lenOn && l.length() > 120) out.add("L" + (i + 1) + " ERROR max-len");
            // every new rule = another if here; an exception here kills the whole lint run
        }
        return out;
    }
}` },
      mcq: { q: 'A rule throws NullPointerException on line 40. What should the core do?', options: ['Catch it at the plugin boundary, record an internal-error issue naming the rule, continue with other rules and lines', 'Abort the whole lint run so the user notices', 'Silently ignore it', 'Disable all rules'], answer: 0, explain: 'Failure isolation: plugin bugs are reported with the plugin\'s name but never take down the core or other plugins.' },
      hints: [`<p>Hint 1: Extension point: <code>interface Rule { String id(); Severity defaultSeverity(); List&lt;String&gt; check(int lineNo, String line); }</code>.</p>`, `<p>Hint 2: Registry = <code>Map&lt;String, Rule&gt;</code>; config = <code>Map&lt;String, Severity&gt;</code> where <code>OFF</code> disables.</p>`, `<p>Hint 3: Loop lines × enabled rules; wrap each <code>check</code> in try/catch; collect <code>Issue</code> records; sort with <code>Comparator.comparingInt(Issue::line).thenComparing(Issue::rule)</code>.</p>`],
      solution: {
        approach: `<p>The core owns the <code>Rule</code> extension point, a registry, config and the run loop. Each rule is a tiny class (or lambda-built object). The run loop wraps every rule call in try/catch so a broken rule produces an <code>INTERNAL</code> issue tagged with its id. Severity comes from config if present, else the rule's default. Sorting happens once at the end.</p>`,
        code: `enum Severity { OFF, INFO, WARN, ERROR, INTERNAL }
record Issue(int line, String rule, Severity severity, String msg) {}

interface Rule {
    String id();
    Severity defaultSeverity();
    List<String> check(int lineNo, String line);     // returns messages; empty = clean
}

class Linter {
    private final Map<String, Rule> rules = new TreeMap<>();
    private final Map<String, Severity> config;
    Linter(Map<String, Severity> config) { this.config = config; }
    void register(Rule r) { if (rules.putIfAbsent(r.id(), r) != null) throw new IllegalArgumentException("duplicate rule " + r.id()); }

    List<Issue> run(List<String> lines) {
        List<Issue> out = new ArrayList<>();
        for (int i = 0; i < lines.size(); i++) {
            for (Rule r : rules.values()) {
                Severity sev = config.getOrDefault(r.id(), r.defaultSeverity());
                if (sev == Severity.OFF) continue;
                try {
                    for (String m : r.check(i + 1, lines.get(i))) out.add(new Issue(i + 1, r.id(), sev, m));
                } catch (RuntimeException e) {
                    out.add(new Issue(i + 1, r.id(), Severity.INTERNAL, "rule crashed: " + e));
                }
            }
        }
        out.sort(Comparator.comparingInt(Issue::line).thenComparing(Issue::rule));
        return out;
    }
}

class NoFixme implements Rule {
    public String id() { return "no-fixme"; }
    public Severity defaultSeverity() { return Severity.WARN; }
    public List<String> check(int n, String l) { return l.contains("FIXME") ? List.of("FIXME left in code") : List.of(); }
}
class MaxLen implements Rule {
    private final int max; MaxLen(int max) { this.max = max; }
    public String id() { return "max-len"; }
    public Severity defaultSeverity() { return Severity.ERROR; }
    public List<String> check(int n, String l) { return l.length() > max ? List.of(l.length() + " > " + max) : List.of(); }
}
class Crashy implements Rule {
    public String id() { return "crashy"; }
    public Severity defaultSeverity() { return Severity.INFO; }
    public List<String> check(int n, String l) { String s = null; return List.of(s.trim()); }
}

class LintDemo {
    public static void main(String[] args) {
        Linter lint = new Linter(Map.of("max-len", Severity.WARN));      // config overrides severity
        lint.register(new NoFixme()); lint.register(new MaxLen(20)); lint.register(new Crashy());
        lint.run(List.of("int x = 1; // FIXME later", "ok")).forEach(System.out::println);
    }
}`,
        complexity: `<p>O(L × R) rule calls for L lines and R rules; O(I log I) to sort I issues. Adding a rule: one class + one <code>register</code> (or a ServiceLoader entry).</p>`,
        followUps: ['How would you load third-party rules from JARs at startup (ServiceLoader)?', 'How do you stop a rule that loops forever? (Run rules on an executor with a per-file timeout.)', 'How would rules that need the whole file (not one line) fit the API without breaking existing rules? (A second extension point or a default method.)']
      }
    }]
  });
  /* ======================= TOPIC 4: HEXAGONAL ARCHITECTURE ======================= */
  topics.push({
    title: 'Hexagonal Architecture (Ports & Adapters) at Class Level',
    analogy: `<p>Think of a <b>laptop</b>. Inside is the part that matters: CPU and memory (your business logic). Around the edge are <b>ports</b>: USB-C, HDMI, a headphone jack. The laptop defines each port's shape; it does not care whether you plug in a Dell monitor or an LG one. The <b>adapters</b> are the dongles and cables: HDMI-to-VGA, USB-C-to-Ethernet. When projectors change from VGA to HDMI, you buy a new dongle — you do not open the laptop and resolder the CPU.</p>
<p>Some ports are for things that <b>drive</b> the laptop (keyboard, mouse — they tell it what to do). Others are for things the laptop <b>drives</b> (monitor, printer — it tells them what to do). Hexagonal architecture has exactly these two kinds.</p>`,
    explain: `<p><b>Hexagonal architecture</b> (Alistair Cockburn, 2005; also "Ports and Adapters") puts your <b>business logic in the middle</b> and all technology (web, database, email, message queues, files) <b>outside</b>. The two meet only at <b>ports</b> — plain Java interfaces owned by the inside. The hexagon shape just means "many sides, many ports"; there is nothing special about six.</p>
${H.table(['Ring', 'Contains', 'Example classes', 'Knows about'], [
  ['<b>Domain</b> (centre)', 'Entities, value objects, rules', '<code>Book</code>, <code>BookId</code>, <code>DomainException</code>', 'nothing but itself and <code>java.*</code>'],
  ['<b>Application</b>', 'Use cases + port interfaces', '<code>BorrowBookUseCase</code> (in-port), <code>BookRepository</code> (out-port), <code>BorrowBookService</code>', 'domain'],
  ['<b>Adapters</b> (outside)', 'Technology', '<code>RestLoanController</code>, <code>CliAdapter</code>, <code>JdbcBookRepository</code>, <code>EmailNotifier</code>', 'application ports + their tech']
])}
<p><b>Two kinds of ports:</b></p>
<ul><li><b>Driving / primary / inbound port</b> — how the outside world asks the app to do something. Usually a use-case interface: <code>BorrowBookUseCase.borrow(cmd)</code>. A <b>driving adapter</b> (REST controller, CLI, message consumer, a test) <i>calls</i> it.</li>
<li><b>Driven / secondary / outbound port</b> — what the app needs from the outside world: <code>BookRepository</code>, <code>MemberNotifier</code>, <code>Clock</code>, <code>PaymentGateway</code>. A <b>driven adapter</b> (JDBC repository, email sender, Stripe client) <i>implements</i> it.</li></ul>
<p><b>The dependency rule:</b> source-code dependencies only point <b>inward</b>. The domain never imports a controller, a JDBC class or a JSON annotation. Adapters depend on ports; ports live in the core. At runtime the call goes outward (service → repository adapter → database), but the <i>compile-time</i> arrow points inward because the adapter implements an interface defined inside. That inversion is the Dependency Inversion Principle applied to the whole app.</p>
<p><b>What you gain:</b> (1) test every use case with in-memory adapters in milliseconds; (2) swap Postgres for Mongo, or REST for gRPC, by writing one adapter; (3) business rules readable without framework noise; (4) the same use case driven by REST, a CLI, a batch job and a Kafka consumer.</p>
<p><b>Translate at the border.</b> Adapters convert outside formats into inside ones: JSON → <code>BorrowBookCommand</code>, SQL row → <code>Book</code>, <code>DomainException</code> → HTTP 409. Never let a JPA entity or an HTTP request object leak into the domain.</p>`,
    clues: [
      '"Expose the same logic via <b>REST and a CLI / batch job / queue consumer</b>" → one inbound port, several driving adapters.',
      '"We may move from MySQL to DynamoDB" / "vendor lock-in" → outbound port + adapter per vendor.',
      '"Business logic must be <b>testable without the database</b>" → in-memory driven adapters.',
      '"Clean Architecture / Onion Architecture / Ports and Adapters" in the question — they are the same family; know the dependency rule.',
      'Framework annotations (<code>@Entity</code>, <code>@JsonProperty</code>) appearing on domain classes → the interviewer wants you to separate domain model from persistence/web models.',
      '"Where does validation go?" → format validation in the adapter (is it a number?), business validation in the domain (is the book available?).'
    ],
    code: [`// ================= DOMAIN (centre): plain Java, zero technology =================
record BookId(String value) { BookId { if (value == null || value.isBlank()) throw new IllegalArgumentException("blank id"); } }
record MemberId(String value) {}
class DomainException extends RuntimeException { DomainException(String m) { super(m); } }

class Book {
    private final BookId id; private final String title;
    private MemberId borrowedBy; private LocalDate due;
    Book(BookId id, String title) { this.id = id; this.title = title; }
    void borrow(MemberId member, LocalDate today) {
        if (borrowedBy != null) throw new DomainException("'" + title + "' is already borrowed");
        borrowedBy = member; due = today.plusDays(14);
    }
    void giveBack() { if (borrowedBy == null) throw new DomainException("not borrowed"); borrowedBy = null; due = null; }
    BookId id() { return id; } String title() { return title; } LocalDate due() { return due; }
    Optional<MemberId> borrower() { return Optional.ofNullable(borrowedBy); }
}

// ================= APPLICATION: ports + use case =================
record BorrowBookCommand(String memberId, String bookId) {}
interface BorrowBookUseCase { LocalDate borrow(BorrowBookCommand cmd); }            // DRIVING (inbound) port
interface BookRepository {                                                          // DRIVEN (outbound) port
    Optional<Book> find(BookId id); void save(Book b); long loansOf(MemberId m);
}
interface MemberNotifier { void loanCreated(MemberId m, String title, LocalDate due); } // DRIVEN port

class BorrowBookService implements BorrowBookUseCase {
    static final int MAX_LOANS = 3;
    private final BookRepository books; private final MemberNotifier notifier; private final Clock clock;
    BorrowBookService(BookRepository books, MemberNotifier notifier, Clock clock) { this.books = books; this.notifier = notifier; this.clock = clock; }
    public LocalDate borrow(BorrowBookCommand cmd) {
        MemberId member = new MemberId(cmd.memberId());
        Book book = books.find(new BookId(cmd.bookId())).orElseThrow(() -> new DomainException("no book " + cmd.bookId()));
        if (books.loansOf(member) >= MAX_LOANS) throw new DomainException("loan limit " + MAX_LOANS + " reached");
        book.borrow(member, LocalDate.now(clock));       // the rule lives in the domain
        books.save(book);
        notifier.loanCreated(member, book.title(), book.due());
        return book.due();
    }
}

// ================= ADAPTERS (outside) =================
class InMemoryBookRepository implements BookRepository {                    // driven adapter
    private final Map<BookId, Book> store = new LinkedHashMap<>();
    public Optional<Book> find(BookId id) { return Optional.ofNullable(store.get(id)); }
    public void save(Book b) { store.put(b.id(), b); }
    public long loansOf(MemberId m) { return store.values().stream().filter(b -> b.borrower().filter(m::equals).isPresent()).count(); }
}
class ConsoleNotifier implements MemberNotifier {                            // driven adapter
    public void loanCreated(MemberId m, String title, LocalDate due) { System.out.println("  [mail to " + m.value() + "] '" + title + "' due " + due); }
}
class CliAdapter {                                                           // DRIVING adapter
    private final BorrowBookUseCase useCase;
    CliAdapter(BorrowBookUseCase useCase) { this.useCase = useCase; }
    String handle(String line) {                       // "borrow <member> <book>"
        String[] p = line.trim().split(" +");
        if (p.length != 3 || !p[0].equals("borrow")) return "usage: borrow <member> <book>";   // FORMAT validation here
        try { return "OK, due " + useCase.borrow(new BorrowBookCommand(p[1], p[2])); }
        catch (DomainException e) { return "REFUSED: " + e.getMessage(); }    // translate domain error to CLI text
    }
}

// ================= COMPOSITION ROOT =================
class LibraryApp {
    public static void main(String[] args) {
        InMemoryBookRepository repo = new InMemoryBookRepository();
        repo.save(new Book(new BookId("b1"), "Clean Architecture"));
        repo.save(new Book(new BookId("b2"), "Domain-Driven Design"));
        Clock clock = Clock.fixed(Instant.parse("2026-04-01T10:00:00Z"), ZoneOffset.UTC);
        CliAdapter cli = new CliAdapter(new BorrowBookService(repo, new ConsoleNotifier(), clock));
        for (String cmd : List.of("borrow asha b1", "borrow ravi b1", "borrow ravi b9", "lend b2")) System.out.println(cmd + " -> " + cli.handle(cmd));
    }
}`, { lang: 'text', title: 'Package layout that makes the rings visible', code: `com.library
 ├── domain                      <- Book, BookId, MemberId, DomainException   (imports: java.* only)
 ├── application
 │    ├── port.in                <- BorrowBookUseCase, BorrowBookCommand
 │    ├── port.out               <- BookRepository, MemberNotifier
 │    └── service                <- BorrowBookService implements BorrowBookUseCase
 ├── adapter
 │    ├── in.web                 <- RestLoanController   (Spring / JSON live here)
 │    ├── in.cli                 <- CliAdapter
 │    ├── out.persistence        <- JdbcBookRepository, BookRow (DB model), BookMapper
 │    └── out.notification       <- EmailNotifier
 └── config                      <- composition root (main / @Configuration)` }, { lang: 'java', check: false, title: 'A REST driving adapter + ArchUnit rule (needs Spring / ArchUnit)', code: `@RestController
class RestLoanController {
    private final BorrowBookUseCase useCase;               // depends on the PORT, not the service class
    RestLoanController(BorrowBookUseCase useCase) { this.useCase = useCase; }

    record LoanRequest(String memberId, String bookId) {}  // web DTO stays in the adapter
    @PostMapping("/loans")
    ResponseEntity<?> borrow(@RequestBody LoanRequest r) {
        try { return ResponseEntity.status(201).body(Map.of("due", useCase.borrow(new BorrowBookCommand(r.memberId(), r.bookId())))); }
        catch (DomainException e) { return ResponseEntity.status(409).body(Map.of("error", e.getMessage())); }
    }
}

// Enforce the dependency rule in CI:
@ArchTest
static final ArchRule domainIsPure = noClasses().that().resideInAPackage("..domain..")
    .should().dependOnClassesThat().resideInAnyPackage("..adapter..", "org.springframework..", "jakarta.persistence..");` }],
    codeTitle: ['Complete hexagon in plain Java: domain, ports, service, adapters, root', 'Package layout', 'Framework adapters (not compiled)'],
    viz: {
      title: 'Ports & adapters rings: follow one request in and out',
      input: 'rest + postgres',
      inputLabel: 'driving adapter (rest | cli | test | kafka) + persistence adapter (postgres | memory | mongo)',
      gen: function (input) {
        var p = String(input || '').toLowerCase().split('+').map(function (s) { return s.trim(); });
        if (p.length !== 2) throw new Error('Format: "rest + postgres" or "test + memory"');
        var drv = pick(p[0], { rest: 'REST', cli: 'CLI', test: 'TEST', kafka: 'KAFKA' }, 'Driving adapter must be rest, cli, test or kafka');
        var per = pick(p[1], { postgres: 'PG', memory: 'MEM', mongo: 'MG' }, 'Persistence adapter must be postgres, memory or mongo');
        var note = drv === 'TEST' ? 'FAKE' : 'EMAIL';
        var nodes = [B('REST', 'REST controller', 14, 6), B('CLI', 'CLI adapter', 38, 6), B('TEST', 'JUnit test', 62, 6), B('KAFKA', 'Kafka consumer', 86, 6),
          B('IN', 'BorrowBookUseCase', 50, 22), B('SVC', 'BorrowBookService', 30, 38), B('DOM', 'Book (domain)', 72, 38),
          B('RP', 'BookRepository', 28, 54), B('NP', 'MemberNotifier', 72, 54),
          B('PG', 'PostgresRepo', 9, 70), B('MEM', 'InMemoryRepo', 29, 70), B('MG', 'MongoRepo', 48, 70), B('EMAIL', 'EmailAdapter', 72, 70), B('FAKE', 'FakeNotifier', 92, 70)];
        var edges = [['REST', 'IN'], ['CLI', 'IN'], ['TEST', 'IN'], ['KAFKA', 'IN'], ['SVC', 'IN', 'impl'], ['SVC', 'DOM', 'uses'], ['SVC', 'RP'], ['SVC', 'NP'],
          ['PG', 'RP', 'impl'], ['MEM', 'RP', 'impl'], ['MG', 'RP', 'impl'], ['EMAIL', 'NP', 'impl'], ['FAKE', 'NP', 'impl']];
        var tags = { REST: 'adapter', IN: 'in-port', SVC: 'core', DOM: 'core', RP: 'out-port', NP: 'out-port', PG: 'adapter', EMAIL: 'adapter' };
        var base = { IN: 'sel', RP: 'sel', NP: 'sel', SVC: 'win', DOM: 'win' };
        var frames = [], hl, ehl;
        function g(h, e) { return G('Hexagon (top = driving side, bottom = driven side)', nodes, edges, { h: 76, hl: h, ehl: e, tags: tags }); }
        var drvName = { REST: 'REST controller', CLI: 'CLI adapter', TEST: 'JUnit test', KAFKA: 'Kafka consumer' }[drv];
        var perName = { PG: 'PostgresRepo', MEM: 'InMemoryRepo', MG: 'MongoRepo' }[per];
        var input0 = { REST: 'POST /loans {"memberId":"asha","bookId":"b1"}', CLI: 'borrow asha b1', TEST: 'useCase.borrow(new BorrowBookCommand("asha","b1"))', KAFKA: 'record on topic loan-requests: asha,b1' }[drv];
        frames.push(F('The rings: <b>purple</b> boxes are <b>ports</b> (interfaces owned by the core), <b>blue</b> boxes are the <b>core</b> (use case + domain), everything on the top and bottom rows is an <b>adapter</b> (technology). Every arrow is a <b>source-code dependency</b> and every arrow points <b>toward the core</b>.', [g(clone(base), {})]));
        hl = clone(base); hl[drv] = 'cur';
        frames.push(F('A request arrives at the <b>' + esc(drvName) + '</b> (a driving adapter). Its first job is <b>translation</b>: turn the outside format into a plain command object. Format checks ("is bookId present?") happen here.', [g(hl, {}), TXT('<b>raw input:</b> <code>' + esc(input0) + '</code><br>→ <code>new BorrowBookCommand("asha", "b1")</code>')]));
        ehl = {}; ehl[drv + '-IN'] = 'cur'; hl = clone(hl); hl.IN = 'cur';
        frames.push(F('The adapter calls the <b>inbound port</b> <code>BorrowBookUseCase.borrow(cmd)</code>. It does not know which class implements it — only the interface.', [g(hl, ehl)]));
        ehl = clone(ehl); ehl[drv + '-IN'] = 'ok'; ehl['SVC-IN'] = 'cur'; hl = clone(hl); hl.IN = 'ok'; hl.SVC = 'cur';
        frames.push(F('At runtime the port is implemented by <b>BorrowBookService</b> (wired in the composition root). The use case now orchestrates: load, decide, save, notify.', [g(hl, ehl), CODE('BorrowBookService.borrow', 'Book book = books.find(id).orElseThrow();\nif (books.loansOf(member) >= MAX_LOANS) throw ...;\nbook.borrow(member, LocalDate.now(clock));\nbooks.save(book);\nnotifier.loanCreated(member, title, due);', { 1: 'cur' })]));
        ehl = clone(ehl); ehl['SVC-IN'] = 'ok'; ehl['SVC-RP'] = 'cur'; ehl[per + '-RP'] = 'cur'; hl = clone(hl); hl.RP = 'cur'; hl[per] = 'cur';
        var how = { PG: 'SELECT * FROM books WHERE id = ? → map the row to a Book', MEM: 'map.get(bookId) — no database at all', MG: 'collection.find({_id: "b1"}) → map the document to a Book' }[per];
        frames.push(F('Service calls the <b>outbound port</b> <code>BookRepository.find</code>. The <b>' + esc(perName) + '</b> adapter does the real work: <i>' + esc(how) + '</i>. The service never sees SQL or Mongo.', [g(hl, ehl), CODE('BorrowBookService.borrow', 'Book book = books.find(id).orElseThrow();\nif (books.loansOf(member) >= MAX_LOANS) throw ...;\nbook.borrow(member, LocalDate.now(clock));\nbooks.save(book);\nnotifier.loanCreated(member, title, due);', { 1: 'ok', 2: 'cur' })]));
        ehl = clone(ehl); ehl['SVC-RP'] = 'ok'; ehl[per + '-RP'] = 'ok'; ehl['SVC-DOM'] = 'cur'; hl = clone(hl); hl.RP = 'ok'; hl[per] = 'ok'; hl.DOM = 'cur';
        frames.push(F('Now the <b>domain</b> decides: <code>book.borrow(member, today)</code>. The rule "a borrowed book cannot be borrowed again" lives inside <code>Book</code>, which imports nothing but <code>java.time</code>. This is the most valuable code in the app and the easiest to test.', [g(hl, ehl), VARS('Book b1 after borrow', { borrowedBy: 'asha', due: '2026-04-15', importsFromAdapters: 0 }, { borrowedBy: 'ok', importsFromAdapters: 'sel' })]));
        ehl = clone(ehl); ehl['SVC-DOM'] = 'ok'; ehl['SVC-RP'] = 'cur'; ehl[per + '-RP'] = 'cur'; hl = clone(hl); hl.DOM = 'ok';
        frames.push(F('Service saves through the same outbound port: <code>books.save(book)</code>. The adapter maps the domain object back to its storage format (row / document / map entry).', [g(hl, ehl)]));
        ehl = clone(ehl); ehl['SVC-RP'] = 'ok'; ehl[per + '-RP'] = 'ok'; ehl['SVC-NP'] = 'cur'; ehl[note + '-NP'] = 'cur'; hl = clone(hl); hl.NP = 'cur'; hl[note] = 'cur';
        frames.push(F('Notify the member via the <b>MemberNotifier</b> port → <b>' + (note === 'FAKE' ? 'FakeNotifier' : 'EmailAdapter') + '</b>. ' + (note === 'FAKE' ? 'In tests the fake just records the message in a list so the test can assert on it.' : 'In production this sends an email via SMTP/SES.'), [g(hl, ehl)]));
        ehl = clone(ehl); ehl['SVC-NP'] = 'ok'; ehl[note + '-NP'] = 'ok'; hl = clone(hl); hl.NP = 'ok'; hl[note] = 'ok'; hl[drv] = 'sel';
        var out = { REST: 'HTTP 201 {"due":"2026-04-15"} (DomainException → HTTP 409)', CLI: 'prints "OK, due 2026-04-15"', TEST: 'assertEquals(LocalDate.of(2026,4,15), due)', KAFKA: 'commits the offset, publishes loan-created' }[drv];
        frames.push(F('The result returns to the driving adapter, which translates it back to <b>its</b> world: ' + esc(out) + '.', [g(hl, ehl)]));
        frames.push(F('<b>Dependency rule check:</b> list every import of the core. Domain → only <code>java.*</code>. Application → domain + its own port interfaces. Adapters → ports + their technology. <span class="c-g">No arrow leaves the core toward an adapter.</span>', [g({ DOM: 'ok', SVC: 'ok', IN: 'sel', RP: 'sel', NP: 'sel' }, paint(edges, 'ok')), TABLE('who imports whom', ['class', 'imports'], [['Book', 'java.time'], ['BorrowBookService', 'domain, port interfaces, java.time'], [perName, 'BookRepository + ' + (per === 'PG' ? 'java.sql' : per === 'MG' ? 'mongo driver' : 'java.util')], [drvName, 'BorrowBookUseCase + ' + (drv === 'REST' ? 'Spring Web' : drv === 'KAFKA' ? 'Kafka client' : drv === 'TEST' ? 'JUnit' : 'java.io')]], {})]));
        var other = per === 'MEM' ? 'PG' : 'MEM';
        var hs = {}; hs[other] = 'ok';
        frames.push(F('<b>Swap test:</b> replace <b>' + esc(perName) + '</b> with <b>' + (other === 'PG' ? 'PostgresRepo' : 'InMemoryRepo') + '</b>. Changed: one adapter class + one line in the composition root. Unchanged: every box in the middle two rows. That is the entire point of the hexagon.', [g(hs, {}), VARS('change cost', { coreFilesEdited: 0, adaptersAdded: 1, rootLinesChanged: 1 }, { coreFilesEdited: 'ok' })]));
        return frames;
      }
    },
    examples: [
      { title: 'Same use case, three driving adapters', html: `<p>A "transfer money" use case is called by: the mobile app (REST adapter), a nightly standing-instruction job (scheduler adapter) and support staff (admin CLI adapter). All three call <code>TransferMoneyUseCase.transfer(cmd)</code>. Rules are written once; each adapter only translates input and output.</p>${H.chips(['REST', 'Scheduler', 'Admin CLI'], { label: 'driving adapters → one in-port' })}` },
      { title: 'Separate domain model and persistence model', html: `<p>The JPA row class <code>BookRow</code> (public no-arg constructor, setters, <code>@Entity</code>, nullable columns) lives in the persistence adapter. A <code>BookMapper</code> converts <code>BookRow ↔ Book</code>. Costs: one mapper per aggregate. Benefits: the domain can use records, final fields and invariants that JPA would fight against, and a schema change does not ripple into business code.</p>`, code: `record Book(String id, String title, String borrower) {}
class BookRow { public String id; public String title; public String borrower_id; }   // DB-shaped
class BookMapper {
    static Book toDomain(BookRow r) { return new Book(r.id, r.title, r.borrower_id); }
    static BookRow toRow(Book b) { BookRow r = new BookRow(); r.id = b.id(); r.title = b.title(); r.borrower_id = b.borrower(); return r; }
}` },
      { title: 'A test is just another driving adapter', html: `<p>Cockburn's original motivation: "allow an application to be equally driven by users, programs, automated tests or batch scripts". A use-case test wires <code>InMemoryBookRepository</code> + a recording notifier + fixed clock and calls the in-port. ${H.table(['Test level', 'Adapters used', 'Speed'], [['Use case (core)', 'in-memory fakes', '~1 ms'], ['Adapter contract', 'real Postgres (Testcontainers)', '~1 s'], ['End-to-end', 'everything real', '~10 s']])}</p>` },
      { title: 'Hexagonal vs layered vs clean', html: `${H.table(['Style', 'Arrow direction', 'Main idea'], [['Classic layered', 'UI → Service → DAO → DB (DB at the bottom, everything depends on it)', 'horizontal layers'], ['Hexagonal', 'all adapters → core', 'inside vs outside, ports'], ['Onion / Clean', 'outer rings → inner rings', 'same rule with more named rings (entities, use cases, interface adapters, frameworks)']])}<p>The key difference from layered: the database is <b>not</b> at the bottom; it is just another adapter plugged into a port the core owns.</p>` }
    ],
    deepDive: `<p><b>Where ports belong.</b> An outbound port is defined by the needs of the core, in the core's language (<code>loansOf(MemberId)</code>), not by the capabilities of the technology (<code>executeQuery(String sql)</code>). If a port method looks like a JDBC or HTTP call, the abstraction leaked. Prefer narrow, use-case-specific ports (Interface Segregation): <code>LoadBookPort</code> and <code>SaveBookPort</code> can be separate if different use cases need different subsets.</p>
<p><b>Transactions</b> are an adapter concern but a use-case boundary: a common pattern is a decorator or a <code>UnitOfWork</code> port around each use-case call (<code>tx.inTransaction(() -&gt; useCase.borrow(cmd))</code>) so the core stays free of <code>@Transactional</code>. Pragmatic teams allow the one annotation on the service; know the trade-off.</p>
<p><b>Mapping strategies</b> (Hombergs, <i>Get Your Hands Dirty on Clean Architecture</i>): no mapping (share one model everywhere — fast, leaky), two-way mapping (domain ↔ each adapter model — the default), full mapping (separate command/result object per use case — most explicit), one-way mapping (shared read-only interfaces). Choose per boundary, not globally.</p>
<p><b>Enforcement:</b> conventions rot. Use Gradle/Maven modules (domain module has no dependency on spring or jdbc), JPMS <code>module-info</code> exports, or ArchUnit tests in CI. Package-private service classes + public port interfaces stop adapters from bypassing ports.</p>
<p><b>When it is overkill:</b> a 3-endpoint CRUD service with no rules gains little from four rings and mappers. Hexagonal pays off when business rules are rich, there are multiple entry points, or infrastructure is likely to change. A good middle ground: ports only for things that are slow, external or non-deterministic (DB, HTTP, time, randomness).</p>`,
    aiEra: `<p><b>What AI changes:</b> hexagonal structure is unusually AI-friendly. Each adapter is a small, well-bounded task with a clear contract (the port), so "write a DynamoDB adapter for <code>BookRepository</code> and run the same contract tests as the in-memory one" is a perfect prompt for a coding agent. The core stays small enough to fit in context and be reviewed carefully by a human.</p>
<p><b>LLMs are just another adapter.</b> If your app uses an LLM (summarise a document, classify a ticket), put it behind an outbound port like <code>TicketClassifier</code>. The core does not know it is an LLM; tests use a deterministic fake; you can switch providers or fall back to rules when the model is down. Agent tool calls are <b>driving adapters</b>: the agent calls your in-ports just like a REST client would — and you validate its input at the border exactly as you would a human's.</p>
<p><b>Where AI goes wrong:</b> generated code imports Spring/JPA annotations into domain classes, puts SQL in the service "for simplicity", returns HTTP status codes from use cases, or makes the port mirror the vendor SDK. Review AI diffs specifically for imports in the domain package — ask the AI to add an ArchUnit rule so CI catches it next time.</p>
<p><b>What you must own:</b> where the boundary sits, what the ports are called (domain language), and which details are allowed to leak.</p>`,
    problems: [{
      title: 'URL Shortener Core as a Hexagon', level: 'Medium', tags: ['hexagonal', 'ports and adapters', 'testing'], companies: ['Bitly', 'Google', 'Atlassian'],
      statement: `<p>Design the core of a URL shortener with ports and adapters. Use cases: <code>shorten(longUrl, owner)</code> returns a 7-char code; <code>resolve(code)</code> returns the long URL and counts the click. Rules: URL must start with http(s); the same owner shortening the same URL gets the same code; a code expires after 30 days. Provide: domain, inbound ports, outbound ports (store, code generator, clock), an in-memory store, a CLI driving adapter, and a composition root. No frameworks.</p>`,
      constraints: `Codes from a generator port (so tests are deterministic). Expiry decided with an injected Clock.`,
      example: `<p><code>shorten https://a.com/x asha</code> → ${H.c('g', 'abc1234')}. Again with the same owner → ${H.c('g', 'abc1234')} (idempotent). <code>resolve abc1234</code> → https://a.com/x, clicks 1. Move the clock 31 days → ${H.c('r', 'expired')}.</p>`,
      brute: { why: `<p>A single <code>ShortenerController</code> holds a static <code>HashMap</code>, calls <code>Random</code> and <code>LocalDate.now()</code> directly and prints to <code>System.out</code>. The rules are mixed with I/O, tests cannot control the code or the date, and moving to Redis means rewriting the controller.</p>`, code: `class ShortenerBrute {
    static final Map<String, String> DB = new HashMap<>();
    static final Map<String, LocalDate> CREATED = new HashMap<>();
    static String shorten(String url) {
        String code = Long.toString(new Random().nextLong() & Long.MAX_VALUE, 36).substring(0, 7);
        DB.put(code, url); CREATED.put(code, LocalDate.now());
        return code;
    }
    static String resolve(String code) {
        if (CREATED.get(code).plusDays(30).isBefore(LocalDate.now())) return "expired";
        return DB.get(code);
    }
}` },
      mcq: { q: 'Which of these should be an OUTBOUND (driven) port?', options: ['CodeGenerator — the core needs codes from somewhere', 'ShortenUseCase — the CLI calls it', 'ShortLink — the domain entity', 'CliAdapter — it reads user input'], answer: 0, explain: 'Outbound ports describe what the core needs from the outside (storage, codes, time). Inbound ports describe what the outside can ask the core to do.' },
      hints: [`<p>Hint 1: Domain: <code>ShortLink</code> (code, url, owner, createdAt, clicks) with methods <code>isExpired(now)</code> and <code>recordClick()</code>.</p>`, `<p>Hint 2: Inbound: <code>ShortenUseCase</code>, <code>ResolveUseCase</code>. Outbound: <code>LinkStore</code> (save, byCode, byOwnerAndUrl), <code>CodeGenerator</code>, <code>Clock</code>.</p>`, `<p>Hint 3: Idempotency: look up <code>byOwnerAndUrl</code> before generating. Validation of URL format belongs in the domain (it is a business rule here); parsing the CLI line belongs in the adapter.</p>`],
      solution: {
        approach: `<p>The domain entity owns expiry and click counting. One application service implements both inbound ports and depends only on outbound ports. The in-memory store and a counter-based code generator are driven adapters; the CLI is a driving adapter that parses text and maps exceptions. The root wires production-like adapters; a test would wire a fixed clock and a predictable generator.</p>`,
        code: `class ShortLink {                                            // domain
    private final String code, url, owner; private final Instant createdAt; private long clicks;
    ShortLink(String code, String url, String owner, Instant createdAt) {
        if (!url.startsWith("http://") && !url.startsWith("https://")) throw new IllegalArgumentException("URL must be http(s)");
        this.code = code; this.url = url; this.owner = owner; this.createdAt = createdAt;
    }
    boolean isExpired(Instant now) { return now.isAfter(createdAt.plus(Duration.ofDays(30))); }
    String visit(Instant now) { if (isExpired(now)) throw new IllegalStateException("link expired"); clicks++; return url; }
    String code() { return code; } String url() { return url; } String owner() { return owner; } long clicks() { return clicks; }
}

interface ShortenUseCase { String shorten(String url, String owner); }      // inbound ports
interface ResolveUseCase { String resolve(String code); }
interface LinkStore {                                                      // outbound ports
    void save(ShortLink l); Optional<ShortLink> byCode(String code); Optional<ShortLink> byOwnerAndUrl(String owner, String url);
}
interface CodeGenerator { String next(); }

class ShortenerService implements ShortenUseCase, ResolveUseCase {
    private final LinkStore store; private final CodeGenerator codes; private final Clock clock;
    ShortenerService(LinkStore s, CodeGenerator g, Clock c) { store = s; codes = g; clock = c; }
    public String shorten(String url, String owner) {
        return store.byOwnerAndUrl(owner, url).map(ShortLink::code).orElseGet(() -> {
            ShortLink l = new ShortLink(codes.next(), url, owner, clock.instant());
            store.save(l);
            return l.code();
        });
    }
    public String resolve(String code) {
        ShortLink l = store.byCode(code).orElseThrow(() -> new NoSuchElementException("unknown code " + code));
        String url = l.visit(clock.instant());
        store.save(l);
        return url;
    }
}

class InMemoryLinkStore implements LinkStore {                            // driven adapter
    private final Map<String, ShortLink> byCode = new HashMap<>();
    public void save(ShortLink l) { byCode.put(l.code(), l); }
    public Optional<ShortLink> byCode(String c) { return Optional.ofNullable(byCode.get(c)); }
    public Optional<ShortLink> byOwnerAndUrl(String o, String u) { return byCode.values().stream().filter(l -> l.owner().equals(o) && l.url().equals(u)).findFirst(); }
}
class Base36Counter implements CodeGenerator {                             // driven adapter
    private long n = 1_000_000_000L;
    public String next() { return Long.toString(n++, 36); }               // 7 chars, unique, predictable in tests
}

class ShortenerCli {                                                       // driving adapter
    private final ShortenUseCase shorten; private final ResolveUseCase resolve;
    ShortenerCli(ShortenUseCase s, ResolveUseCase r) { shorten = s; resolve = r; }
    String run(String line) {
        String[] p = line.trim().split(" +");
        try {
            if (p[0].equals("shorten") && p.length == 3) return shorten.shorten(p[1], p[2]);
            if (p[0].equals("resolve") && p.length == 2) return resolve.resolve(p[1]);
            return "usage: shorten <url> <owner> | resolve <code>";
        } catch (RuntimeException e) { return "error: " + e.getMessage(); }
    }
    public static void main(String[] args) {
        ShortenerService svc = new ShortenerService(new InMemoryLinkStore(), new Base36Counter(), Clock.systemUTC());
        ShortenerCli cli = new ShortenerCli(svc, svc);
        String code = cli.run("shorten https://a.com/x asha");
        System.out.println(code + " " + cli.run("shorten https://a.com/x asha") + " " + cli.run("resolve " + code) + " | " + cli.run("shorten ftp://bad asha"));
    }
}`,
        complexity: `<p>O(1) shorten/resolve with a hash map (byOwnerAndUrl is O(n) here; a real adapter adds an index). Swapping to Redis: one new <code>LinkStore</code> adapter.</p>`,
        followUps: ['How would you test expiry in under a millisecond? (Inject a mutable test clock.)', 'Where do click counts go if resolve must be very fast? (A separate outbound port that buffers increments asynchronously.)', 'Who owns the 7-char code format: the domain or the generator adapter?']
      }
    }]
  });
  /* ======================= TOPIC 5: ENTITIES & VALUE OBJECTS ======================= */
  topics.push({
    title: 'DDD Building Blocks I: Entities and Value Objects',
    analogy: `<p>Two <b>₹500 notes</b> in your wallet: you do not care which one you hand to the shopkeeper. They are equal because their <b>value</b> is equal. That is a <b>value object</b>. Now think of your <b>passport</b>: if you change your address, your photo or even your name after marriage, it is still <i>your</i> passport, tracked by its passport number. Two people named "Rahul Sharma" born on the same day are still two different people. That is an <b>entity</b>: it has an <b>identity</b> that stays the same while its details change.</p>
<p>Funny twist: to the Reserve Bank, each ₹500 note <i>is</i> an entity (it has a serial number they track). Whether something is an entity depends on whether <b>your business</b> cares "which one".</p>`,
    explain: `<p><b>Domain-Driven Design</b> (DDD, Eric Evans 2003) gives names to the kinds of objects in a business model. The two most basic:</p>
${H.table(['', '<b>Entity</b>', '<b>Value Object</b>'], [
  ['Defined by', 'an <b>identity</b> (ID) that lasts', 'its <b>attributes</b> (what it is)'],
  ['Equality', '<code>equals</code> compares IDs only', '<code>equals</code> compares all fields'],
  ['Changes', 'mutable through business methods', '<b>immutable</b>; "changing" returns a new object'],
  ['Lifecycle', 'created, changed, archived', 'none; created and thrown away freely'],
  ['Examples', 'Customer, Order, BankAccount, Booking', 'Money, Email, Address, DateRange, Quantity, OrderId'],
  ['Java tool', 'class with private fields + methods', '<code>record</code> with a validating constructor']
])}
<p><b>Value objects kill "primitive obsession".</b> A method <code>book(String from, String to, double amount, String currency, String email)</code> is easy to call wrongly: swap <code>from</code>/<code>to</code>, pass dollars as rupees, pass an invalid email. With value objects it becomes <code>book(Airport from, Airport to, Money price, Email contact)</code>. Each type <b>validates itself once in its constructor</b>, so an invalid <code>Email</code> cannot exist anywhere in the system. The compiler now catches swapped arguments.</p>
<p><b>Value objects carry behaviour</b>, not just data: <code>Money.add</code> refuses to add INR to USD; <code>DateRange.overlaps(other)</code>; <code>Quantity.minus</code> refuses to go below zero. Because they are immutable, they are thread-safe, can be shared and cached, and are perfect map keys.</p>
<p><b>Entities protect their identity and their rules.</b> A <code>Customer</code> keeps the same <code>CustomerId</code> when the email changes. Use a <b>typed ID</b> (<code>record CustomerId(UUID value)</code>) instead of a bare <code>long</code> so you cannot pass an <code>OrderId</code> where a <code>CustomerId</code> is expected. Implement <code>equals</code>/<code>hashCode</code> on the ID only.</p>
<p><b>Rule of thumb:</b> make everything a value object by default; promote to an entity only when the business needs to track "this specific one" over time. Most of a good domain model is value objects; entities are fewer and are the things you load and save.</p>`,
    clues: [
      'Method signatures with many <code>String</code>/<code>double</code> parameters → primitive obsession → introduce value objects.',
      '"Two objects with the same data — are they the same?" → identity question: entity vs value object.',
      '<b>Money</b> appears anywhere → never <code>double</code>; a Money VO with currency and minor units (or <code>BigDecimal</code>).',
      '"Track the history / lifecycle of X" or "X can be renamed" → X is an entity with a stable ID.',
      '"Thread-safe", "can be cached", "used as a map key" → immutable value object.',
      'Validation duplicated in many places (email regex in 5 services) → move it into a VO constructor.'
    ],
    code: [`// VALUE OBJECT: Money. Immutable record, self-validating, behaviour-rich, equality by value.
record Money(long minor, String currency) {               // minor units: paise / cents. Never double for money.
    Money {                                               // compact constructor = validation, runs for EVERY instance
        Objects.requireNonNull(currency);
        if (!currency.matches("[A-Z]{3}")) throw new IllegalArgumentException("ISO currency like INR: " + currency);
    }
    static Money of(long major, String cur) { return new Money(Math.multiplyExact(major, 100), cur); }
    static Money zero(String cur) { return new Money(0, cur); }

    Money plus(Money o)  { same(o); return new Money(Math.addExact(minor, o.minor), currency); }      // NEW object
    Money minus(Money o) { same(o); return new Money(Math.subtractExact(minor, o.minor), currency); }
    Money times(int n)   { return new Money(Math.multiplyExact(minor, n), currency); }
    boolean isNegative() { return minor < 0; }
    boolean greaterThan(Money o) { same(o); return minor > o.minor; }

    // Split fairly: 100.00 / 3 -> 33.34, 33.33, 33.33 (no paisa lost, no paisa invented)
    List<Money> allocate(int parts) {
        if (parts <= 0) throw new IllegalArgumentException("parts > 0");
        long base = minor / parts, extra = minor % parts;
        List<Money> out = new ArrayList<>();
        for (int i = 0; i < parts; i++) out.add(new Money(base + (i < extra ? 1 : 0), currency));
        return out;
    }
    private void same(Money o) { if (!currency.equals(o.currency)) throw new IllegalArgumentException(currency + " vs " + o.currency); }
    @Override public String toString() { return currency + " " + minor / 100 + "." + String.format("%02d", Math.abs(minor % 100)); }

    public static void main(String[] args) {
        Money a = Money.of(100, "INR"), b = Money.of(100, "INR");
        System.out.println(a.equals(b) + " " + (a == b));        // true false: equal by value, different objects
        Money c = a.plus(Money.of(50, "INR"));
        System.out.println(a + " -> " + c);                      // a is unchanged: INR 100.00 -> INR 150.00
        System.out.println(Money.of(100, "INR").allocate(3));    // [INR 33.34, INR 33.33, INR 33.33]
        try { a.plus(Money.of(1, "USD")); } catch (IllegalArgumentException e) { System.out.println("refused: " + e.getMessage()); }
    }
}`, `// ENTITY: Customer. Identity = CustomerId. Attributes are value objects and can change.
record CustomerId(UUID value) { static CustomerId random() { return new CustomerId(UUID.randomUUID()); } }

record Email(String value) {
    Email {
        value = value.trim().toLowerCase();                          // normalise once
        if (!value.matches("[^@ ]+@[^@ ]+[.][a-z]{2,}")) throw new IllegalArgumentException("bad email: " + value);
    }
}
record Address(String line, String city, String pin) {
    Address { if (!pin.matches("[0-9]{6}")) throw new IllegalArgumentException("PIN must be 6 digits"); }
}

final class Customer {
    private final CustomerId id;                 // never changes
    private String name; private Email email; private Address address;
    private final List<Email> previousEmails = new ArrayList<>();

    Customer(CustomerId id, String name, Email email, Address address) {
        this.id = Objects.requireNonNull(id); this.name = name; this.email = email; this.address = address;
    }
    void changeEmail(Email newEmail) {            // behaviour, not a setter: keeps history
        if (newEmail.equals(email)) return;
        previousEmails.add(email); email = newEmail;
    }
    void moveTo(Address a) { address = a; }        // replace the whole VO, never mutate it
    CustomerId id() { return id; } Email email() { return email; } Address address() { return address; }

    @Override public boolean equals(Object o) { return o instanceof Customer c && c.id.equals(id); }  // ID only!
    @Override public int hashCode() { return id.hashCode(); }

    public static void main(String[] args) {
        CustomerId id = CustomerId.random();
        Customer a = new Customer(id, "Asha", new Email(" Asha@Mail.com "), new Address("1 MG Rd", "Pune", "411001"));
        Customer sameRowLoadedAgain = new Customer(id, "Asha K", new Email("asha.k@mail.com"), new Address("9 FC Rd", "Pune", "411004"));
        System.out.println("same customer? " + a.equals(sameRowLoadedAgain));   // true: same identity, different data
        a.changeEmail(new Email("asha.new@mail.com"));
        System.out.println(a.email() + " " + a.previousEmails);
        try { new Email("not-an-email"); } catch (IllegalArgumentException e) { System.out.println(e.getMessage()); }
    }
}`, `// VALUE OBJECT with real behaviour: DateRange (used by bookings, leases, discounts)
record DateRange(LocalDate start, LocalDate endExclusive) {
    DateRange {
        if (!start.isBefore(endExclusive)) throw new IllegalArgumentException("start must be before end");
    }
    long nights() { return java.time.temporal.ChronoUnit.DAYS.between(start, endExclusive); }
    boolean overlaps(DateRange o) { return start.isBefore(o.endExclusive) && o.start.isBefore(endExclusive); }
    boolean contains(LocalDate d) { return !d.isBefore(start) && d.isBefore(endExclusive); }

    public static void main(String[] args) {
        DateRange a = new DateRange(LocalDate.of(2026, 5, 1), LocalDate.of(2026, 5, 4));
        DateRange b = new DateRange(LocalDate.of(2026, 5, 4), LocalDate.of(2026, 5, 6));   // checkout day = next check-in
        System.out.println(a.nights() + " nights, overlaps? " + a.overlaps(b));            // 3 nights, overlaps? false
    }
}`],
    codeTitle: ['Value object: Money (immutable, validating, fair allocation)', 'Entity: Customer with typed ID and VO attributes', 'Value object: DateRange with overlap logic'],
    viz: [{
      title: 'Value objects are immutable: every operation makes a NEW object',
      input: '100 INR + 250 INR - 30 INR * 2 + 20 USD',
      inputLabel: 'Money expression: amount CUR then (+|-) amount CUR or * n',
      gen: function (input) {
        var t = String(input || '').trim().split(/\s+/);
        if (t.length < 2 || t.length > 22) throw new Error('Example: 100 INR + 50 INR * 2 (max ~10 operations)');
        function num(s) { if (!/^\d{1,7}$/.test(s)) throw new Error('Amounts must be whole numbers up to 7 digits: ' + s); return +s; }
        function cur(s) { if (!/^[A-Za-z]{3}$/.test(s)) throw new Error('Currency must be 3 letters like INR: ' + s); return s.toUpperCase(); }
        var heap = [], frames = [], i = 2;
        var curV = { amt: num(t[0]), cur: cur(t[1]) };
        heap.push(curV.cur + ' ' + curV.amt);
        frames.push(F('<code>Money a = Money.of(' + curV.amt + ', "' + curV.cur + '")</code>. The constructor validates the currency once; from now on this object can never change.', [ARR('objects on the heap (oldest → newest)', heap, { 0: 'ok' }, { 0: 'a' }), VARS('variable', { a: curV.cur + ' ' + curV.amt }, { a: 'ok' })]));
        var name = 'a', nameCode = 98;
        while (i < t.length) {
          var op = t[i];
          if (op === '*') {
            if (i + 1 >= t.length) throw new Error('"*" needs a number after it');
            var n = num(t[i + 1]); i += 2;
            var nv = { amt: curV.amt * n, cur: curV.cur };
            heap.push(nv.cur + ' ' + nv.amt);
            var nn = String.fromCharCode(nameCode++);
            var hl = {}; heap.forEach(function (_, k) { hl[k] = 'done'; }); hl[heap.length - 1] = 'ok'; hl[heap.length - 2] = 'cur';
            var ptr = {}; ptr[heap.length - 1] = nn;
            frames.push(F('<code>' + name + '.times(' + n + ')</code> does <b>not</b> touch ' + name + '. It returns a brand-new Money <b>' + nn + '</b> = ' + nv.cur + ' ' + nv.amt + '. The old object is still exactly what it was (faded = no longer referenced, garbage collector will clean it).', [ARR('objects on the heap (oldest → newest)', heap, hl, ptr), VARS('variables', { old: curV.cur + ' ' + curV.amt, 'new': nv.cur + ' ' + nv.amt }, { 'new': 'ok' })]));
            curV = nv; name = nn; continue;
          }
          if (op !== '+' && op !== '-') throw new Error('Operators must be +, - or * (got "' + op + '")');
          if (i + 2 >= t.length) throw new Error('"' + op + '" needs "amount CUR" after it');
          var o = { amt: num(t[i + 1]), cur: cur(t[i + 2] || '') }; i += 3;
          if (o.cur !== curV.cur) {
            var hb = {}; heap.forEach(function (_, k) { hb[k] = 'done'; }); hb[heap.length - 1] = 'bad';
            frames.push(F('<code>' + name + '.' + (op === '+' ? 'plus' : 'minus') + '(Money.of(' + o.amt + ', "' + o.cur + '"))</code> → <span class="c-r">IllegalArgumentException: ' + curV.cur + ' vs ' + o.cur + '</span>. With a plain <code>double</code> this bug would silently add rupees to dollars. The VO makes the mistake impossible.', [ARR('objects on the heap (oldest → newest)', heap, hb), VARS('variables', { result: 'exception', reason: curV.cur + ' ≠ ' + o.cur }, { result: 'bad' })]));
            return frames;
          }
          var r = { amt: op === '+' ? curV.amt + o.amt : curV.amt - o.amt, cur: curV.cur };
          heap.push(o.cur + ' ' + o.amt); heap.push(r.cur + ' ' + r.amt);
          var nm = String.fromCharCode(nameCode++);
          var h2 = {}; heap.forEach(function (_, k) { h2[k] = 'done'; }); h2[heap.length - 1] = 'ok'; h2[heap.length - 2] = 'win'; h2[heap.length - 3] = 'cur';
          var p2 = {}; p2[heap.length - 1] = nm;
          frames.push(F('<code>' + name + '.' + (op === '+' ? 'plus' : 'minus') + '(' + o.cur + ' ' + o.amt + ')</code>: same currency ✔. Result is a <b>new</b> object <b>' + nm + '</b> = ' + r.cur + ' ' + r.amt + '. Both inputs are unchanged — anyone else holding them is safe.' + (r.amt < 0 ? ' <span class="c-y">(Negative money is allowed here; a <code>Balance</code> VO could forbid it.)</span>' : ''), [ARR('objects on the heap (oldest → newest)', heap, h2, p2), VARS('variables', { left: curV.cur + ' ' + curV.amt, right: o.cur + ' ' + o.amt, result: r.cur + ' ' + r.amt }, { result: 'ok' })]));
          curV = r; name = nm;
        }
        frames.push(F('Final value <b>' + curV.cur + ' ' + curV.amt + '</b>. ' + heap.length + ' objects were created and <b>none was ever modified</b>. That is why value objects are thread-safe and safe to share: nobody can change one under your feet.', [ARR('objects on the heap', heap, (function () { var h = {}; h[heap.length - 1] = 'sel'; return h; })()), VARS('summary', { objectsCreated: heap.length, mutations: 0 }, { mutations: 'ok' })]));
        return frames;
      }
    }, {
      title: 'Entity or value object? Equality tells you',
      gen: function () {
        var rows = [], frames = [];
        var cases = [
          ['Money(100, INR) vs Money(100, INR)', 'value object', 'equal', 'all fields equal → same value'],
          ['Email("a@x.com") vs Email(" A@X.com ")', 'value object', 'equal', 'constructor normalises, then fields equal'],
          ['Customer#42 "Asha" vs Customer#42 "Asha K"', 'entity', 'equal', 'same ID; name changed over time'],
          ['Customer#42 "Ravi" vs Customer#43 "Ravi"', 'entity', 'NOT equal', 'different IDs: two different people'],
          ['Seat A7 at 6 pm show vs Seat A7 at 9 pm show', 'entity (cinema)', 'NOT equal', 'business tracks each show-seat separately'],
          ['₹500 note vs another ₹500 note (shop)', 'value object', 'equal', 'shop does not care which note']
        ];
        frames.push(F('Rule: <b>entities</b> compare by <b>ID only</b>; <b>value objects</b> compare by <b>all attributes</b>. Let us classify some pairs.', [TABLE('pairs', ['pair', 'kind', 'equals?', 'why'], [])]));
        cases.forEach(function (c, k) {
          rows.push(c);
          var hl = {}; hl[k] = c[2] === 'equal' ? 'ok' : 'bad';
          frames.push(F('<b>' + esc(c[0]) + '</b> → ' + esc(c[1]) + ', <b>' + esc(c[2]) + '</b>: ' + esc(c[3]) + '.', [TABLE('pairs', ['pair', 'kind', 'equals?', 'why'], rows, hl), CODE(c[1].indexOf('entity') === 0 ? 'entity equals' : 'value object equals (record does this for you)', c[1].indexOf('entity') === 0 ? 'public boolean equals(Object o) {\n  return o instanceof Customer c\n      && c.id.equals(id);  // ID only\n}' : 'record Money(long minor, String currency) {}\n// equals = minor == o.minor\n//       && currency.equals(o.currency)', { 3: 'cur' })]));
        });
        frames.push(F('Question to ask the business: <b>"if I swap these two, would anyone care?"</b> No → value object. Yes → entity with an ID.', [TABLE('pairs', ['pair', 'kind', 'equals?', 'why'], rows, {})]));
        return frames;
      }
    }],
    examples: [
      { title: 'Primitive obsession → value objects', html: `${H.table(['Before', 'After'], [['<code>transfer(String from, String to, double amt)</code>', '<code>transfer(AccountNo from, AccountNo to, Money amt)</code>'], ['email validated in 5 services', '<code>new Email(raw)</code> validates once'], ['<code>double price = 0.1 + 0.2</code> → 0.30000000000000004', '<code>Money</code> in paise: exact']])}<p>The VO version is longer by a few small records but removes whole classes of bugs, and makes method signatures self-documenting.</p>` },
      { title: 'A cinema seat: entity or value?', html: `<p>In a <b>seat map template</b> ("Screen 1 has seats A1–J20"), a seat position is a value object <code>SeatNo("A7")</code>. In a <b>show booking</b>, "A7 for the 6 pm show on 5 May" has a lifecycle (available → held → booked → cancelled) and must be tracked → entity <code>ShowSeat</code> with ID <code>(showId, seatNo)</code>. Same real-world thing, different role, different modelling choice.</p>` },
      { title: 'Value objects as map keys and in sets', html: `<p>Because records implement <code>equals</code>/<code>hashCode</code> on all fields and never change, they are safe keys: <code>Map&lt;DateRange, Price&gt;</code>, <code>Set&lt;Email&gt;</code>. A <b>mutable</b> key is a classic bug: put it in a <code>HashSet</code>, change a field, and <code>contains</code> returns false because the hash moved.</p>`, code: `record Sku(String code) {}
class KeyDemo {
    public static void main(String[] args) {
        Map<Sku, Integer> stock = new HashMap<>();
        stock.merge(new Sku("TEA-1"), 5, Integer::sum);
        stock.merge(new Sku("TEA-1"), 3, Integer::sum);       // a different object, same value -> same key
        System.out.println(stock);                             // {Sku[code=TEA-1]=8}
    }
}` },
      { title: 'Typed IDs stop mix-ups', html: `<p><code>void ship(long orderId, long customerId)</code> — callers can swap them silently. <code>void ship(OrderId o, CustomerId c)</code> — swapping is a compile error. Records make typed IDs nearly free: <code>record OrderId(UUID value) {}</code>.</p>` }
    ],
    deepDive: `<p><b>Equality and JPA.</b> Entities with database-generated IDs have no ID before the first save, so ID-based <code>equals</code> breaks for new objects placed in a <code>HashSet</code> (hash changes after save). Fixes: assign IDs in the domain (UUID/ULID/Snowflake) at construction time — the DDD-preferred approach — or use a stable business key. Never base entity equality on mutable fields.</p>
<p><b>Value objects and persistence.</b> VOs have no table of their own: they are stored as columns of their owner (<code>price_minor, price_currency</code>; JPA <code>@Embeddable</code>) or serialized (JSON column). A collection of VOs becomes a child table without its own identity, typically replaced wholesale on update.</p>
<p><b>Money done right:</b> store minor units in <code>long</code> or use <code>BigDecimal</code> with explicit <code>RoundingMode</code> (never <code>new BigDecimal(0.1)</code>; use <code>BigDecimal.valueOf</code> or string constructor). Different currencies have different minor units (JPY 0, INR 2, BHD 3) — <code>java.util.Currency.getDefaultFractionDigits()</code>. Allocation (splitting) must distribute remainders so the parts sum to the whole — Fowler's <i>allocate</i>. Overflow: <code>Math.addExact</code> throws instead of wrapping silently.</p>
<p><b>Records caveats:</b> a record is shallowly immutable; a <code>record Basket(List&lt;Item&gt; items)</code> exposes a mutable list unless the compact constructor does <code>items = List.copyOf(items)</code>. Records cannot extend classes; use sealed interfaces for VO families (<code>sealed interface Shape permits Circle, Square</code>).</p>
<p><b>Value objects can be big ideas:</b> a <code>Schedule</code>, a <code>PricingRule</code> or a <code>Route</code> can be VOs with rich logic. Many domain rules are easiest to test as pure functions on VOs, leaving entities thin coordinators of state over time. <b>Side-effect-free functions</b> (Evans) are the reason DDD models stay testable.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI assistants happily generate DTO-style classes with <code>String</code> everywhere and <code>double</code> for money — primitive obsession at machine speed. Ask explicitly: <code>Model price as a Money value object in minor units with currency; use records with validating compact constructors; no setters</code>. They do this well once asked, and are great at producing the boring parts: <code>toString</code>, parsing, exhaustive tests for validation edge cases.</p>
<p><b>Value objects protect you from AI inputs.</b> When an LLM produces structured output (an extracted email, an amount, a date range), parse it into VOs at the boundary. If the model hallucinates "31 Feb" or "₹12,00,0", the VO constructor rejects it before it reaches business code. Typed IDs prevent an agent from passing a customer ID where an order ID was expected in a tool call.</p>
<p><b>Use AI as a partner:</b> <code>List every method parameter in this package that is a String or double but represents a domain concept; propose value objects</code>. It is a fast way to find primitive obsession across a codebase.</p>
<p><b>What you must own:</b> the identity decision (entity or VO) is a business question — ask "do we track this one specifically?" — and AI cannot interview your stakeholders.</p>`,
    problems: [{
      title: 'Bill Splitting with a Money Value Object', level: 'Medium', tags: ['value object', 'money', 'immutability'], companies: ['Splitwise', 'Razorpay', 'Stripe'],
      statement: `<p>Implement <code>Money</code> for a bill-splitting app. Requirements: currency-safe <code>plus</code>/<code>minus</code>; <code>percent(p)</code> with banker's rounding to the minor unit; <code>allocate(int... ratios)</code> that splits an amount by ratios with <b>no paisa lost or invented</b> (e.g. ₹100 by 1:1:1 → 33.34, 33.33, 33.33; ₹10 by 3:7 → 3.00, 7.00). Equality by value; immutable.</p>`,
      constraints: `Amounts up to 10<sup>12</sup> minor units; ratios positive; at most 100 parts.`,
      example: `<p>Bill ₹1,000 + 18% GST = ${H.c('b', '₹1,180.00')}. Split by 2:1:1 → ${H.arr(['590.00', '295.00', '295.00'], { label: 'shares' })} sum = 1180.00 ✔. ₹0.05 split 1:1:1 → 0.02, 0.02, 0.01 (remainder goes to the first parts).</p>`,
      brute: { why: `<p>Using <code>double</code>: <code>1180.0 / 3 = 393.333…</code> rounded three times → 393.33 × 3 = 1179.99 — one paisa vanishes and the ledger does not balance. Adding INR to USD compiles fine. A shared mutable <code>total</code> field changed by one screen corrupts another.</p>`, code: `class BillBrute {
    static double[] split(double total, int people) {
        double[] out = new double[people];
        for (int i = 0; i < people; i++) out[i] = Math.round(total / people * 100) / 100.0;
        return out;                                   // 1180.0 / 3 -> 393.33 x3 = 1179.99 : a paisa is lost
    }
    public static void main(String[] a) { System.out.println(Arrays.toString(split(1180.0, 3))); }
}` },
      mcq: { q: 'Splitting 100 paise by ratio 1:1:1, where should the leftover 1 paisa go?', options: ['To one part (e.g. the first), so the parts still sum to exactly 100', 'Drop it — it is only one paisa', 'Round every part up to 34', 'Throw an exception'], answer: 0, explain: 'Allocation must conserve money: compute floor shares, then hand out the remainder one unit at a time. The sum of parts equals the whole, always.' },
      hints: [`<p>Hint 1: Work in <code>long</code> minor units. Floor-divide each share: <code>minor * ratio[i] / totalRatio</code>.</p>`, `<p>Hint 2: Remainder = whole − sum(floor shares), which is less than the number of parts. Give 1 extra unit to parts 0, 1, 2… until the remainder is used.</p>`, `<p>Hint 3: For percent use <code>BigDecimal.valueOf(minor).multiply(p).divide(100, 0, RoundingMode.HALF_EVEN)</code>. Watch overflow on <code>minor * ratio</code> — use <code>Math.multiplyExact</code>.</p>`],
      solution: {
        approach: `<p>A <code>record Money(long minor, String currency)</code> validates in its compact constructor. Arithmetic returns new instances and checks currency. <code>allocate</code> computes floor shares by ratio and distributes the remainder one unit at a time, so the sum is always exact. <code>percent</code> uses <code>BigDecimal</code> with <code>HALF_EVEN</code> (banker's rounding) to avoid bias across many transactions.</p>`,
        code: `record Money(long minor, String currency) {
    Money { if (currency == null || !currency.matches("[A-Z]{3}")) throw new IllegalArgumentException("currency"); }
    static Money of(String amount, String cur) {
        return new Money(new BigDecimal(amount).movePointRight(2).setScale(0, RoundingMode.UNNECESSARY).longValueExact(), cur);
    }
    Money plus(Money o) { same(o); return new Money(Math.addExact(minor, o.minor), currency); }
    Money minus(Money o) { same(o); return new Money(Math.subtractExact(minor, o.minor), currency); }
    Money percent(String p) {
        BigDecimal r = BigDecimal.valueOf(minor).multiply(new BigDecimal(p)).divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_EVEN);
        return new Money(r.longValueExact(), currency);
    }
    List<Money> allocate(int... ratios) {
        if (ratios.length == 0 || ratios.length > 100) throw new IllegalArgumentException("1..100 parts");
        long total = 0; for (int r : ratios) { if (r <= 0) throw new IllegalArgumentException("ratio > 0"); total += r; }
        long[] shares = new long[ratios.length]; long used = 0;
        for (int i = 0; i < ratios.length; i++) { shares[i] = Math.multiplyExact(minor, (long) ratios[i]) / total; used += shares[i]; }
        for (int i = 0; used < minor; i++, used++) shares[i]++;     // hand out the remainder, 1 unit each
        List<Money> out = new ArrayList<>();
        for (long s : shares) out.add(new Money(s, currency));
        return List.copyOf(out);
    }
    private void same(Money o) { if (!currency.equals(o.currency)) throw new IllegalArgumentException(currency + " vs " + o.currency); }
    @Override public String toString() { return BigDecimal.valueOf(minor, 2).toPlainString(); }

    public static void main(String[] args) {
        Money bill = Money.of("1000.00", "INR");
        Money total = bill.plus(bill.percent("18"));
        System.out.println(total + " -> " + total.allocate(2, 1, 1));          // 1180.00 -> [590.00, 295.00, 295.00]
        System.out.println(Money.of("100.00", "INR").allocate(1, 1, 1));       // [33.34, 33.33, 33.33]
        System.out.println(Money.of("0.05", "INR").allocate(1, 1, 1));         // [0.02, 0.02, 0.01]
        System.out.println(Money.of("5", "INR").equals(Money.of("5.00", "INR"))); // true
    }
}`,
        complexity: `<p>O(k) for k parts. No floating point anywhere; sum of parts == whole by construction.</p>`,
        followUps: ['How would you support currencies with 0 or 3 decimal places (JPY, BHD)?', 'Should negative amounts be allowed in Money or in a separate Balance type?', 'How would you store Money in a SQL table and in JSON?']
      }
    }]
  });
  /* ======================= TOPIC 6: AGGREGATES & REPOSITORIES ======================= */
  topics.push({
    title: 'DDD Building Blocks II: Aggregates, Boundaries and Repositories',
    analogy: `<p>Think of a <b>car</b>. It has an engine, four wheels and seats inside. You never walk up to a moving car and swap one wheel directly — you deal with <b>the car</b> as a whole: you take it to the garage, the garage works on the car, and the car leaves in a safe state (all four wheels tightened). The car is the <b>aggregate root</b>; the wheels are inside its <b>boundary</b>. The parking lot (the <b>repository</b>) stores and returns <i>whole cars</i>, never loose wheels.</p>
<p>The car does <b>not</b> contain the road or the petrol pump. It only knows "I am at pump #7" — a reference by ID. That keeps each thing small and independent.</p>`,
    explain: `<p>Entities and value objects rarely live alone. An <code>Order</code> has <code>OrderLine</code>s, a shipping <code>Address</code>, a total. Some rules span several of them: <i>"order total must not exceed ₹1,500 for COD"</i>, <i>"no changes after submit"</i>. If any code could grab an <code>OrderLine</code> and change its quantity directly, nobody would re-check the total. The fix is the <b>aggregate</b>.</p>
${H.table(['Term', 'Plain meaning', 'Order example'], [
  ['<b>Aggregate</b>', 'A small cluster of objects that must always be consistent <b>together</b>, changed as one unit', 'Order + its OrderLines + Address'],
  ['<b>Aggregate root</b>', 'The single entity outsiders may talk to; it checks every rule', '<code>Order</code>'],
  ['<b>Boundary</b>', 'Which objects are inside; outsiders cannot hold references to inner objects', 'OrderLine is inside; Product and Customer are outside'],
  ['<b>Invariant</b>', 'A rule that must be true after every change, immediately', 'total ≤ limit, qty 1–10, frozen after submit'],
  ['<b>Repository</b>', 'A collection-like store of whole aggregates, one per root type', '<code>OrderRepository.byId / save</code>']
])}
<p><b>Vaughn Vernon's four rules</b> (the interview gold):</p>
<ol><li><b>Model true invariants in consistency boundaries.</b> Put inside the aggregate only what must be consistent <i>immediately</i>.</li>
<li><b>Design small aggregates.</b> Big aggregates = big locks, slow loads, lots of concurrent-edit conflicts.</li>
<li><b>Reference other aggregates by identity.</b> <code>Order</code> stores <code>CustomerId</code>, not a <code>Customer</code> object; an <code>OrderLine</code> stores <code>ProductId</code> plus a <i>snapshot</i> of the price.</li>
<li><b>Use eventual consistency outside the boundary.</b> "When an order is placed, reduce stock" touches another aggregate → do it in a separate transaction triggered by a domain event (next topic).</li></ol>
<p><b>One transaction = one aggregate.</b> Loading, changing and saving a single aggregate is the unit of consistency. The aggregate carries a <b>version</b> number; the repository rejects a save if someone else saved a newer version first (optimistic locking).</p>
<p><b>Repositories</b> pretend to be an in-memory collection of aggregates: <code>byId</code>, <code>save</code>, maybe a few business queries. One repository per <b>aggregate root</b> — there is no <code>OrderLineRepository</code>, because lines are only reachable through their order. The interface is a domain/outbound port; the JDBC/Mongo implementation is an adapter.</p>
<p><b>How to find the boundary (recipe):</b> (1) write down every invariant; (2) for each, list the data it needs; (3) data that must be checked <i>together, instantly</i> goes in one aggregate; (4) everything else is referenced by ID and synchronised by events; (5) if an aggregate grows huge, ask the business whether the rule really must be instant ("Is it OK if stock is corrected within a second?").</p>`,
    clues: [
      '"These rules must always hold together" / "never exceed limit X across items" → those items share one aggregate.',
      '"Two users edit the same order at once" → aggregate version + optimistic locking in the repository.',
      '"Placing an order should also reduce stock and add loyalty points" → three aggregates, one transaction each, linked by domain events.',
      'Class diagram with a giant object graph (Customer → Orders → Lines → Products → Suppliers) → interviewer wants you to cut it into small aggregates referencing by ID.',
      '"Where do I put a repository for OrderLine?" → trick question: none, lines live inside the Order aggregate.',
      'Performance complaint: "loading a customer loads 10,000 orders" → aggregate too big.'
    ],
    code: [`// AGGREGATE: Order is the root. OrderLine lives INSIDE and is never handed out.
record OrderId(String value) {}
record ProductId(String value) {}
record CustomerId(String value) {}

class Order {
    static final long LIMIT_PAISE = 150_000;                 // invariant: total <= Rs 1500
    enum Status { DRAFT, SUBMITTED }

    private static final class OrderLine {                   // inner ENTITY (local identity = productId)
        final ProductId product; final long unitPrice; int qty;
        OrderLine(ProductId p, long unitPrice, int qty) { this.product = p; this.unitPrice = unitPrice; this.qty = qty; }
        long subtotal() { return unitPrice * qty; }
    }
    record LineView(String product, long unitPrice, int qty) {}   // read-only copy for outsiders

    private final OrderId id; private final CustomerId customer; // other aggregate referenced BY ID
    private final Map<ProductId, OrderLine> lines = new LinkedHashMap<>();
    private Status status = Status.DRAFT;
    private long version;                                        // for optimistic locking

    Order(OrderId id, CustomerId customer) { this.id = id; this.customer = customer; }

    void addItem(ProductId p, long unitPriceSnapshot, int qty) {
        requireDraft();
        if (qty < 1 || qty > 10) throw new IllegalArgumentException("qty 1-10");
        OrderLine existing = lines.get(p);
        int newQty = (existing == null ? 0 : existing.qty) + qty;
        if (newQty > 10) throw new IllegalArgumentException("max 10 per product");
        long newTotal = total() + unitPriceSnapshot * qty;
        if (newTotal > LIMIT_PAISE) throw new IllegalStateException("limit exceeded: " + newTotal);   // rule spanning ALL lines
        if (existing == null) lines.put(p, new OrderLine(p, unitPriceSnapshot, qty)); else existing.qty = newQty;
    }
    void removeItem(ProductId p) { requireDraft(); if (lines.remove(p) == null) throw new IllegalArgumentException("not in order"); }
    void submit() { requireDraft(); if (lines.isEmpty()) throw new IllegalStateException("empty order"); status = Status.SUBMITTED; }

    long total() { return lines.values().stream().mapToLong(OrderLine::subtotal).sum(); }
    List<LineView> lines() { return lines.values().stream().map(l -> new LineView(l.product.value(), l.unitPrice, l.qty)).toList(); }
    OrderId id() { return id; } Status status() { return status; } long version() { return version; } CustomerId customer() { return customer; }
    void markSaved(long newVersion) { this.version = newVersion; }   // called by the repository only
    private void requireDraft() { if (status != Status.DRAFT) throw new IllegalStateException("order already submitted"); }

    public static void main(String[] args) {
        Order o = new Order(new OrderId("o1"), new CustomerId("c9"));
        o.addItem(new ProductId("mug"), 25_000, 2);
        o.addItem(new ProductId("tea"), 12_000, 3);
        try { o.addItem(new ProductId("kettle"), 60_000, 2); } catch (IllegalStateException e) { System.out.println(e.getMessage()); }
        o.submit();
        System.out.println(o.lines() + " total=" + o.total() + " " + o.status());
        try { o.removeItem(new ProductId("tea")); } catch (IllegalStateException e) { System.out.println(e.getMessage()); }
    }
}`, `// REPOSITORY: collection-like port in the domain + in-memory adapter with optimistic locking.
class ConcurrencyConflict extends RuntimeException { ConcurrencyConflict(String m) { super(m); } }

final class Account {                                   // tiny aggregate to keep the demo short
    private final String id; private long balance; private long version;
    Account(String id, long balance, long version) { this.id = id; this.balance = balance; this.version = version; }
    void withdraw(long amt) { if (amt > balance) throw new IllegalStateException("insufficient"); balance -= amt; }
    void deposit(long amt) { balance += amt; }
    String id() { return id; } long balance() { return balance; } long version() { return version; }
}

interface AccountRepository {                           // PORT: speaks in aggregates, not rows
    Optional<Account> byId(String id);
    void save(Account a);                               // throws ConcurrencyConflict on stale version
}

class InMemoryAccountRepository implements AccountRepository {
    private record Stored(long balance, long version) {}    // what the "database" keeps (a copy, not the live object)
    private final Map<String, Stored> table = new HashMap<>();

    public Optional<Account> byId(String id) {
        Stored s = table.get(id);
        return s == null ? Optional.empty() : Optional.of(new Account(id, s.balance(), s.version()));  // fresh object per load
    }
    public synchronized void save(Account a) {
        Stored cur = table.get(a.id());
        long expected = cur == null ? 0 : cur.version();
        if (a.version() != expected)                    // like: UPDATE ... SET version = v+1 WHERE id = ? AND version = ?
            throw new ConcurrencyConflict("account " + a.id() + " changed by someone else (v" + expected + " vs v" + a.version() + ")");
        table.put(a.id(), new Stored(a.balance(), expected + 1));
    }
}

class RepoDemo {
    public static void main(String[] args) {
        AccountRepository repo = new InMemoryAccountRepository();
        repo.save(new Account("acc-1", 1000, 0));                  // v0 -> stored v1

        Account tab1 = repo.byId("acc-1").orElseThrow();           // both users load v1
        Account tab2 = repo.byId("acc-1").orElseThrow();
        tab1.withdraw(800); repo.save(tab1);                       // ok, stored v2, balance 200
        tab2.withdraw(800);                                        // tab2 still thinks balance is 1000!
        try { repo.save(tab2); } catch (ConcurrencyConflict e) { System.out.println("rejected: " + e.getMessage()); }
        System.out.println("balance now " + repo.byId("acc-1").orElseThrow().balance());   // 200, not -600
    }
}`],
    codeTitle: ['Order aggregate: root, inner entity, invariants spanning lines', 'Repository port + adapter with optimistic locking'],
    viz: {
      title: 'Aggregate boundary: every command goes through the root, which checks every invariant',
      input: 'add mug 2, add tea 3, add kettle 2, remove mug, add kettle 1, bypass, submit, add spoon 1, stale save',
      inputLabel: 'Commands: add <tea|mug|kettle|spoon> <qty>, remove <item>, submit, bypass, stale save',
      gen: function (input) {
        var price = { tea: 120, mug: 250, kettle: 600, spoon: 30 }, LIMIT = 1500;
        var cmds = tokens(input, ',', 12, 'Example: add mug 2, remove mug, submit');
        var lines = [], status = 'DRAFT', version = 1, frames = [];
        function total() { return lines.reduce(function (s, l) { return s + l.p * l.q; }, 0); }
        function graph(hl, ehl) {
          var nodes = [B('CLIENT', 'Client code', 11, 8), B('REPO', 'OrderRepository', 13, 60), B('ROOT', 'Order (root)', 38, 34), B('ADDR', 'Address (VO)', 38, 58),
            B('CUST', 'Customer', 88, 6), B('CAT', 'Product catalog', 88, 62)];
          var edges = [['CLIENT', 'ROOT', 'commands'], ['REPO', 'ROOT', 'load/save whole'], ['ROOT', 'ADDR'], ['ROOT', 'CUST', 'customerId']];
          var tags = { ROOT: 'root', ADDR: 'inside', CUST: 'other aggregate', CAT: 'other aggregate' };
          var base = { ROOT: 'win', ADDR: 'win' };
          lines.forEach(function (l, k) {
            var id = 'L' + k; nodes.push(B(id, l.n + ' ×' + l.q, 64, 12 + k * 13)); edges.push(['ROOT', id, 'owns']); edges.push([id, 'CAT', k === 0 ? 'productId' : '']); tags[id] = 'inside'; base[id] = 'win';
          });
          var h = clone(base); for (var k in hl) h[k] = hl[k];
          return G('Blue boxes = inside the aggregate boundary', nodes, edges, { h: 68, hl: h, ehl: ehl || {}, tags: tags });
        }
        function state(hl) { return VARS('Order o1', { status: status, total: '₹' + total(), limit: '₹' + LIMIT, version: version, lines: lines.length }, hl || {}); }
        function lineTable(hl) { return TABLE('lines (inside)', ['product', 'unit price', 'qty', 'subtotal'], lines.map(function (l) { return [l.n, '₹' + l.p, String(l.q), '₹' + l.p * l.q]; }), hl || {}); }
        frames.push(F('The <b>Order aggregate</b>: root <code>Order</code>, its <code>OrderLine</code>s and its <code>Address</code> are inside the boundary (blue). <b>Customer</b> and <b>Product catalog</b> are other aggregates, referenced only by ID. Invariants: total ≤ ₹' + LIMIT + ', qty 1–10 per product, no edits after submit, cannot submit empty.', [graph({}), state(), lineTable()]));
        cmds.forEach(function (raw) {
          var c = raw.toLowerCase().split(/\s+/);
          if (c[0] === 'add') {
            if (!price[c[1]] || !/^\d{1,2}$/.test(c[2] || '')) throw new Error('Use "add tea 2" (items: tea, mug, kettle, spoon)');
            var q = +c[2], ex = null, k;
            for (k = 0; k < lines.length; k++) if (lines[k].n === c[1]) ex = lines[k];
            var why = null;
            if (status !== 'DRAFT') why = 'order already submitted — the root refuses all edits';
            else if (q < 1 || q > 10) why = 'qty must be 1–10';
            else if ((ex ? ex.q : 0) + q > 10) why = 'max 10 per product';
            else if (total() + price[c[1]] * q > LIMIT) why = 'total would be ₹' + (total() + price[c[1]] * q) + ' > limit ₹' + LIMIT + ' (a rule that needs ALL lines — that is why lines live inside the aggregate)';
            if (why) { frames.push(F('<code>order.addItem(' + c[1] + ', ' + q + ')</code> → <span class="c-r">rejected</span>: ' + why + '. State is unchanged; nothing to roll back.', [graph({ ROOT: 'bad', CLIENT: 'cur' }, { 'CLIENT-ROOT': 'bad' }), state({ total: 'bad' }), lineTable()])); return; }
            if (ex) ex.q += q; else lines.push({ n: c[1], p: price[c[1]], q: q });
            if (lines.length > 4) { lines.pop(); frames.push(F('Demo limit: at most 4 distinct products in this picture.', [graph({}), state()])); return; }
            var idx = 0; lines.forEach(function (l, j) { if (l.n === c[1]) idx = j; });
            var gh = { CLIENT: 'cur', ROOT: 'ok' }; gh['L' + idx] = 'ok'; var th = {}; th[idx] = 'ok';
            frames.push(F('<code>order.addItem(' + c[1] + ', ₹' + price[c[1]] + ' snapshot, ' + q + ')</code> → root checks qty, per-product max, and the <b>whole-order</b> total (₹' + total() + ' ≤ ₹' + LIMIT + ') → <span class="c-g">accepted</span>. The price is <b>copied</b> from the catalog (snapshot) so later price changes do not alter this order.', [graph(gh, { 'CLIENT-ROOT': 'ok' }), state({ total: 'ok' }), lineTable(th)]));
          } else if (c[0] === 'remove') {
            var j2 = -1; lines.forEach(function (l, j) { if (l.n === c[1]) j2 = j; });
            if (status !== 'DRAFT' || j2 < 0) { frames.push(F('<code>order.removeItem(' + esc(c[1] || '?') + ')</code> → <span class="c-r">rejected</span>: ' + (status !== 'DRAFT' ? 'order already submitted' : 'not in the order') + '.', [graph({ ROOT: 'bad' }, { 'CLIENT-ROOT': 'bad' }), state(), lineTable()])); return; }
            lines.splice(j2, 1);
            frames.push(F('<code>order.removeItem(' + c[1] + ')</code> → <span class="c-g">accepted</span>. Removing can only lower the total, so no limit check needed; the root still checks status.', [graph({ ROOT: 'ok', CLIENT: 'cur' }, { 'CLIENT-ROOT': 'ok' }), state({ total: 'ok' }), lineTable()]));
          } else if (c[0] === 'bypass') {
            var gb = { CLIENT: 'bad' }; if (lines.length) gb.L0 = 'bad';
            frames.push(F('Sneaky code tries to skip the root: <code>order.lines().get(0).qty = 99</code>. <span class="c-g">Blocked:</span> <code>lines()</code> returns read-only <code>LineView</code> copies and <code>OrderLine</code> is a private inner class. Outsiders can <b>see</b> inside the boundary but never <b>hold</b> or <b>change</b> an inner object. That is what makes the invariants trustworthy.', [graph(gb, {}), CODE('Order', 'private static final class OrderLine { ... }\nList<LineView> lines() {\n  return lines.values().stream()\n    .map(l -> new LineView(...)).toList();\n}', { 1: 'ok', 4: 'ok' }), state()]));
          } else if (c[0] === 'submit') {
            if (status !== 'DRAFT' || !lines.length) { frames.push(F('<code>order.submit()</code> → <span class="c-r">rejected</span>: ' + (lines.length ? 'already submitted' : 'cannot submit an empty order') + '.', [graph({ ROOT: 'bad' }), state({ status: 'bad' })])); return; }
            status = 'SUBMITTED'; version++;
            frames.push(F('<code>order.submit()</code> → status SUBMITTED. Then <code>repository.save(order)</code> stores the <b>whole aggregate</b> in <b>one transaction</b> and bumps the version to ' + version + '. Reducing stock (Product aggregate) is NOT done here — it happens later via a domain event.', [graph({ ROOT: 'ok', REPO: 'ok' }, { 'REPO-ROOT': 'ok' }), state({ status: 'ok', version: 'ok' }), lineTable()]));
          } else if (c[0] === 'stale') {
            frames.push(F('Two support agents loaded the order at <b>version ' + version + '</b>. Agent A saves first → version ' + (version + 1) + '. Agent B now saves with expected version ' + version + ' → <span class="c-r">ConcurrencyConflict</span>. The repository did <code>UPDATE ... WHERE id = ? AND version = ' + version + '</code> and 0 rows matched. B must reload and retry — no lost update.', [graph({ REPO: 'bad' }, { 'REPO-ROOT': 'bad' }), TABLE('optimistic locking', ['who', 'loaded v', 'saves with', 'result'], [['Agent A', String(version), 'v' + version, 'OK → v' + (version + 1)], ['Agent B', String(version), 'v' + version, 'CONFLICT']], { 0: 'ok', 1: 'bad' })]));
            version++;
          } else throw new Error('Unknown command "' + raw + '". Use add, remove, submit, bypass, stale save');
        });
        frames.push(F('Every change went through <b>one door</b> (the root), every invariant was checked in <b>one place</b>, and the repository saved the aggregate <b>as a whole</b>. Other aggregates (Customer, Product) were only referenced by ID.', [graph({ ROOT: 'sel' }), state()]));
        return frames;
      }
    },
    examples: [
      { title: 'Finding the boundary: e-commerce', html: `${H.table(['Invariant', 'Data needed', 'Decision'], [['order total ≤ COD limit', 'all lines of one order', '<b>Order</b> aggregate holds its lines'], ['stock never negative', 'one product\'s stock', '<b>Inventory</b> aggregate per product (not inside Order!)'], ['customer has ≤ 3 unpaid orders', 'count of a customer\'s orders', 'query + event-driven check, or a small <b>CustomerCredit</b> aggregate'], ['product price changes', 'catalog', '<b>Product</b> aggregate; Order keeps a price snapshot']])}<p>Result: four small aggregates linked by IDs and events instead of one giant object graph.</p>` },
      { title: 'Why "stock" is not inside Order', html: `<p>If <code>Order</code> held <code>Product</code> objects and decremented stock directly, then every order for a popular product would lock the same product row: 1,000 shoppers on Black Friday would conflict on one aggregate. Instead: Order is saved → event <code>OrderPlaced</code> → Inventory aggregate reserves stock in its own transaction. If stock is short, a compensating event (<code>OrderRejected</code>) follows. ${H.c('y', 'Trade-off')}: a few seconds of inconsistency in exchange for scalability.</p>` },
      { title: 'Repository interface shapes', html: `${H.table(['Good', 'Smell'], [['<code>Optional&lt;Order&gt; byId(OrderId)</code>', '<code>List&lt;OrderLine&gt; findLinesByOrderId(long)</code> — inner objects escape'], ['<code>void save(Order)</code>', '<code>void updateStatus(long id, String s)</code> — bypasses the root\'s rules'], ['<code>List&lt;Order&gt; openOrdersOf(CustomerId)</code>', '<code>ResultSet query(String sql)</code> — leaks technology']])}<p>Read-heavy screens (reports, search) may skip repositories and query a <b>read model</b> directly — that is CQRS, fine because reads cannot break invariants.</p>` },
      { title: 'Factories for complex creation', html: `<p>When creating an aggregate needs several steps or other services (e.g. "a new <code>Booking</code> needs a price quote and a hold ID"), put that in a <b>factory</b> method (<code>Booking.create(...)</code> static method or <code>BookingFactory</code>). The constructor stays private, so the only way to get a Booking is a valid one.</p>`, code: `final class Booking {
    private final String id; private final String room; private final long pricePaise;
    private Booking(String id, String room, long price) { this.id = id; this.room = room; this.pricePaise = price; }
    static Booking create(String room, long quotedPrice, Supplier<String> ids) {
        if (quotedPrice <= 0) throw new IllegalArgumentException("quote must be positive");
        return new Booking(ids.get(), room, quotedPrice);
    }
    @Override public String toString() { return id + ":" + room + ":" + pricePaise; }
}` }
    ],
    deepDive: `<p><b>Aggregate size in practice.</b> Most aggregates should be a root plus a handful of value objects. Collections inside an aggregate should be bounded (an order has tens of lines, not millions). An unbounded collection (a <code>Forum</code> with all its <code>Post</code>s) is a sign the child should be its own aggregate referencing the parent by ID, with the invariant re-phrased ("posts can be added only while the forum is open" → Post checks a <code>ForumStatus</code> snapshot or the application service checks the forum first).</p>
<p><b>Optimistic vs pessimistic locking.</b> Optimistic (version column, retry on conflict) suits low-contention aggregates and keeps no DB locks between load and save. Pessimistic (<code>SELECT ... FOR UPDATE</code>) suits hot aggregates where retries would storm. JPA: <code>@Version</code> field gives optimistic locking automatically. A retry loop must reload the aggregate and re-run the command — never re-save the stale object.</p>
<p><b>Invariants across aggregates.</b> "Usernames must be unique" spans all User aggregates. Options: a unique DB index (pragmatic, set-validation at the storage layer), a dedicated <code>UsernameRegistry</code> aggregate, or accept-then-compensate. Interviewers like hearing you name the trade-off rather than putting all users in one aggregate.</p>
<p><b>Repositories and the Unit of Work.</b> JPA's <code>EntityManager</code> is a Unit of Work: it tracks loaded objects and flushes changes at commit (dirty checking), so <code>save()</code> may be implicit. In explicit-save repositories (our style, Spring Data JDBC, event-sourced stores) every change is visible in code. Collection-oriented vs persistence-oriented repositories (Vernon) — choose one and be consistent.</p>
<p><b>Lazy loading traps:</b> an ORM that lazily loads inner collections outside the transaction (<code>LazyInitializationException</code>) or N+1 queries for lines. Aggregates are loaded <i>whole</i> by design — small aggregates make that cheap.</p>`,
    aiEra: `<p><b>What AI changes:</b> asked to "design an e-commerce domain", an LLM typically produces one huge object graph with bidirectional JPA relations (<code>Customer.orders</code>, <code>Order.customer</code>, <code>Product.orderLines</code>) — the opposite of small aggregates. Steer it with constraints: <code>Each aggregate must be loadable in one query, reference other aggregates by ID only, and list the invariants each aggregate protects</code>. Then review the invariant list yourself — that is the real design.</p>
<p><b>Aggregates make agents safer.</b> When an AI agent gets tools like <code>addItemToOrder(orderId, sku, qty)</code> that call the aggregate root, it physically cannot put the order in an invalid state, however confused it is. Tools that expose raw <code>updateOrderLine(id, field, value)</code> let a hallucinating agent corrupt data. Design agent tools around aggregate commands.</p>
<p><b>Use AI as a partner:</b> paste requirements and ask <code>Extract every invariant as a one-line rule and, for each, the minimal data it needs</code> — a strong first step in boundary discovery; then decide the grouping yourself.</p>
<p><b>What you must own:</b> which rules must be instant vs eventually consistent — a business decision with money and UX consequences.</p>`,
    problems: [{
      title: 'Online Auction: Find the Aggregate and Enforce Bidding Rules', level: 'Hard', tags: ['aggregate', 'invariants', 'optimistic locking'], companies: ['eBay', 'Amazon', 'OLX'],
      statement: `<p>An auction has an item, a seller, a reserve price, a minimum increment, an end time and bids. Rules: (1) a bid must exceed the current highest by at least the increment (first bid ≥ start price); (2) the seller cannot bid; (3) no bids after the end time; (4) a bidder cannot outbid themselves; (5) when closed, the winner is the highest bidder only if the reserve is met. Design the aggregate(s), the repository with optimistic locking, and show two bidders racing.</p>`,
      constraints: `Thousands of bids per auction near the end; each bid must be validated against the latest highest bid.`,
      example: `<p>Start ₹1000, increment ₹100, reserve ₹1500. Asha 1000 ✔, Ravi 1050 ${H.c('r', '✘ (needs ≥ 1100)')}, Ravi 1100 ✔, Ravi 1300 ${H.c('r', '✘ (already highest)')}, Asha 1600 ✔, close → ${H.c('g', 'Asha wins at 1600')}. Two bidders loading version 5 at the same time: the second save gets a conflict and retries against the new highest bid.</p>`,
      brute: { why: `<p>Bids stored as independent rows saved by a <code>BidService</code> that checks "highest so far" with a separate query. Two concurrent bids both read highest = 1000 and both get saved: two "highest" bids. The seller rule and end time are checked in the controller only, so the batch importer bypasses them.</p>`, code: `class BidServiceBrute {
    final List<long[]> bidsTable = new ArrayList<>();            // rows of {auctionId, amount}
    void bid(long auctionId, long amount) {
        long highest = bidsTable.stream().filter(r -> r[0] == auctionId).mapToLong(r -> r[1]).max().orElse(0);
        // ...another thread can insert between this read and the write below
        if (amount > highest) bidsTable.add(new long[]{auctionId, amount});
    }
}` },
      mcq: { q: 'Which is the best aggregate design?', options: ['Auction is the root and holds the current highest bid (and recent bids); every bid goes through Auction.placeBid(), saved with a version check', 'Each Bid is its own aggregate with no link to Auction', 'User aggregate holds all their bids across auctions', 'One global AuctionHouse aggregate holding every auction'], answer: 0, explain: 'The rule "must beat the current highest" needs the highest bid and the auction state together, instantly — so they share one aggregate. Small enough to load fast; the version check serialises racing bids.' },
      hints: [`<p>Hint 1: Which data does the "beat the highest by increment" rule need? The auction's highest bid, increment, end time and seller — put exactly that in the <code>Auction</code> aggregate.</p>`, `<p>Hint 2: Bid history can grow large; keep only the highest (plus maybe last N) inside, and publish each accepted bid as an event for a separate history read model.</p>`, `<p>Hint 3: Repository <code>save</code> compares versions; the application service retries: reload → <code>placeBid</code> again (it may now be rejected because someone bid higher) → save.</p>`],
      solution: {
        approach: `<p><code>Auction</code> is the aggregate root holding seller, prices, end time, status, the current highest bid (a value object) and a version. <code>placeBid</code> checks all five rules. The repository stores snapshots and rejects stale versions. The application service wraps "load → placeBid → save" in a bounded retry loop so a losing racer is re-validated against the fresh highest bid.</p>`,
        code: `record Bid(String bidder, long amount) {}

final class Auction {
    private final String id, seller; private final long startPrice, increment, reserve; private final Instant endsAt;
    private Bid highest; private boolean closed; private long version;
    Auction(String id, String seller, long start, long inc, long reserve, Instant endsAt, Bid highest, boolean closed, long version) {
        this.id = id; this.seller = seller; this.startPrice = start; this.increment = inc; this.reserve = reserve;
        this.endsAt = endsAt; this.highest = highest; this.closed = closed; this.version = version;
    }
    void placeBid(String bidder, long amount, Instant now) {
        if (closed || !now.isBefore(endsAt)) throw new IllegalStateException("auction ended");
        if (bidder.equals(seller)) throw new IllegalStateException("seller cannot bid");
        if (highest != null && highest.bidder().equals(bidder)) throw new IllegalStateException("already highest bidder");
        long min = highest == null ? startPrice : highest.amount() + increment;
        if (amount < min) throw new IllegalArgumentException("bid must be >= " + min);
        highest = new Bid(bidder, amount);
    }
    Optional<Bid> close(Instant now) {
        if (now.isBefore(endsAt)) throw new IllegalStateException("too early");
        closed = true;
        return highest != null && highest.amount() >= reserve ? Optional.of(highest) : Optional.empty();
    }
    Auction copy() { return new Auction(id, seller, startPrice, increment, reserve, endsAt, highest, closed, version); }
    String id() { return id; } long version() { return version; } void bumpVersion() { version++; }
}

class StaleAuction extends RuntimeException { StaleAuction() { super("stale version"); } }

class AuctionRepository {
    private final Map<String, Auction> db = new HashMap<>();
    synchronized Auction load(String id) { return db.get(id).copy(); }               // detached copy per caller
    synchronized void save(Auction a) {
        Auction cur = db.get(a.id());
        if (cur != null && cur.version() != a.version()) throw new StaleAuction();
        Auction stored = a.copy(); stored.bumpVersion(); db.put(a.id(), stored);
    }
}

class BidService {
    private final AuctionRepository repo; private final Clock clock;
    BidService(AuctionRepository r, Clock c) { repo = r; clock = c; }
    String bid(String auctionId, String bidder, long amount) {
        for (int attempt = 1; attempt <= 3; attempt++) {
            Auction a = repo.load(auctionId);
            try { a.placeBid(bidder, amount, clock.instant()); }
            catch (RuntimeException rule) { return "REJECTED " + bidder + " " + amount + ": " + rule.getMessage(); }
            try { repo.save(a); return "OK " + bidder + " " + amount; }
            catch (StaleAuction e) { /* someone else won the race: reload and re-validate */ }
        }
        return "BUSY, try again";
    }
    public static void main(String[] args) {
        Instant now = Instant.parse("2026-06-01T10:00:00Z");
        AuctionRepository repo = new AuctionRepository();
        repo.save(new Auction("a1", "sam", 1000, 100, 1500, now.plusSeconds(3600), null, false, 0));
        BidService svc = new BidService(repo, Clock.fixed(now, ZoneOffset.UTC));
        for (Object[] b : new Object[][]{{"asha", 1000L}, {"ravi", 1050L}, {"ravi", 1100L}, {"ravi", 1300L}, {"sam", 2000L}, {"asha", 1600L}})
            System.out.println(svc.bid("a1", (String) b[0], (Long) b[1]));
        // race: two copies loaded at the same version
        Auction x = repo.load("a1"), y = repo.load("a1");
        x.placeBid("ravi", 1700, now); repo.save(x);
        y.placeBid("meera", 1700, now);
        try { repo.save(y); } catch (StaleAuction e) { System.out.println("meera's save rejected: " + e.getMessage() + " -> retry sees ravi at 1700"); }
        System.out.println("winner: " + repo.load("a1").close(now.plusSeconds(7200)));
    }
}`,
        complexity: `<p>O(1) per bid. Contention: racing bids on one hot auction serialise via version checks; under extreme load, switch to a single-writer queue per auction (actor) or pessimistic locking.</p>`,
        followUps: ['How would you show full bid history without growing the aggregate? (BidPlaced events → read model.)', 'How would you implement automatic proxy bidding (eBay max bid) inside the aggregate?', 'What happens at the exact end time across servers with clock skew?']
      }
    }]
  });
  /* ======================= TOPIC 7: DOMAIN EVENTS ======================= */
  topics.push({
    title: 'Domain Events: "Something Happened" — Decoupling Side Effects Safely',
    analogy: `<p>When a baby is born in a hospital, the doctor does not personally phone the registrar, the insurance company, the grandparents and the vaccination centre. The hospital simply records <b>"Baby born, 14 Oct, 3.2 kg"</b> on an official form. Each interested office reads that record and does its own job, in its own time. If the insurance office is closed today, it processes the form tomorrow — the birth does not "fail". That form is a <b>domain event</b>: a fact about the past that others react to.</p>`,
    explain: `<p>A <b>domain event</b> is a record that <b>something meaningful happened</b> in the business: <code>OrderPlaced</code>, <code>PaymentCaptured</code>, <code>BookReturned</code>, <code>SeatReleased</code>. It is named in the <b>past tense</b> (it already happened; you cannot refuse it), it is <b>immutable</b>, and it carries the IDs and data handlers need, plus an <code>eventId</code> and <code>occurredAt</code>.</p>
${H.table(['Without events', 'With events'], [
  ['<code>OrderService.place()</code> calls inventory, email, loyalty, analytics, fraud…', '<code>Order.place()</code> records <code>OrderPlaced</code>; each module subscribes'],
  ['Adding "send to warehouse" edits OrderService', 'Adding it = one new handler class'],
  ['Email server down → order placement fails', 'Order saved; email handler retries later'],
  ['One transaction locks Order + Stock + Points', 'One aggregate per transaction; others updated <b>eventually</b>']
])}
<p><b>The life of a domain event (in-process version):</b></p>
<ol><li>An aggregate method changes state <b>and records</b> an event in a private list: <code>events.add(new OrderPlaced(id, total, now))</code>.</li>
<li>The application service saves the aggregate.</li>
<li><b>After the save succeeds</b>, it pulls the recorded events (<code>order.pullEvents()</code>) and hands them to a dispatcher.</li>
<li>The dispatcher calls every handler subscribed to that event type. Each handler typically loads a <i>different</i> aggregate and runs its own transaction (e.g. <code>Inventory.reserve</code>).</li></ol>
<p><b>Why "after the save"?</b> If you send the "order confirmed" email first and the save then fails, the customer gets an email for an order that does not exist. Events describe <b>committed</b> facts.</p>
<p><b>The dual-write problem.</b> Saving to the database and publishing to a message broker (Kafka, SQS) are two separate systems — one can succeed while the other fails. The standard fix is the <b>transactional outbox</b>: in the <i>same</i> database transaction as the aggregate, insert the event into an <code>outbox</code> table. A separate <b>relay</b> polls the outbox (or tails the DB log with CDC, e.g. Debezium), publishes each event, then marks it sent. If the relay crashes between "publish" and "mark sent", it publishes again — so delivery is <b>at-least-once</b> and handlers must be <b>idempotent</b> (remember processed <code>eventId</code>s).</p>
<p><b>Domain vs integration events:</b> domain events are internal (rich, can change freely); <b>integration events</b> are published to other services and are a public contract (versioned, minimal, stable). Often a handler translates one into the other.</p>`,
    clues: [
      '"When X happens, also do A, B and C" — and A, B, C belong to other modules → domain event + handlers.',
      '"Email/notification failure must not fail the order" → side effect in an event handler with retries.',
      '"Keep the order service and inventory service consistent" with separate databases → outbox + at-least-once + idempotent consumers.',
      '"Exactly once?" → answer: at-least-once delivery + idempotent handling (dedupe on eventId) = effectively once.',
      'An aggregate method that must update another aggregate → split: record an event, update the other aggregate in its own transaction.',
      '"Audit trail" / "notify other teams" / "analytics feed" → events are natural.'
    ],
    code: [`// Domain events recorded by the aggregate, dispatched AFTER save by the application service.
sealed interface DomainEvent permits OrderPlaced, OrderPaid {
    String eventId(); Instant occurredAt();
}
record OrderPlaced(String eventId, Instant occurredAt, String orderId, String customerId, long totalPaise) implements DomainEvent {}
record OrderPaid(String eventId, Instant occurredAt, String orderId, long amountPaise) implements DomainEvent {}

abstract class AggregateRoot {
    private final List<DomainEvent> pending = new ArrayList<>();
    protected void record(DomainEvent e) { pending.add(e); }
    List<DomainEvent> pullEvents() { List<DomainEvent> out = List.copyOf(pending); pending.clear(); return out; }
}

class Order extends AggregateRoot {
    private final String id, customerId; private final long total; private String status = "NEW";
    Order(String id, String customerId, long total) { this.id = id; this.customerId = customerId; this.total = total; }
    void place(Clock clock, Supplier<String> ids) {
        if (!status.equals("NEW")) throw new IllegalStateException("already placed");
        status = "PLACED";
        record(new OrderPlaced(ids.get(), clock.instant(), id, customerId, total));   // a FACT, past tense
    }
    void pay(long amount, Clock clock, Supplier<String> ids) {
        if (!status.equals("PLACED") || amount != total) throw new IllegalStateException("cannot pay");
        status = "PAID";
        record(new OrderPaid(ids.get(), clock.instant(), id, amount));
    }
}

class EventBus {                                          // in-process dispatcher, subscription by type
    private final Map<Class<?>, List<Consumer<DomainEvent>>> handlers = new HashMap<>();
    <E extends DomainEvent> void subscribe(Class<E> type, Consumer<E> h) {
        handlers.computeIfAbsent(type, k -> new ArrayList<>()).add(e -> h.accept(type.cast(e)));
    }
    void publish(List<DomainEvent> events) {
        for (DomainEvent e : events)
            for (Consumer<DomainEvent> h : handlers.getOrDefault(e.getClass(), List.of())) {
                try { h.accept(e); }                      // one failing handler must not stop the others
                catch (RuntimeException ex) { System.out.println("  handler failed for " + e.eventId() + ", will retry: " + ex.getMessage()); }
            }
    }
}

class PlaceOrderService {
    private final Map<String, Order> repo = new HashMap<>(); private final EventBus bus;
    private final Clock clock; private final Supplier<String> ids;
    PlaceOrderService(EventBus bus, Clock clock, Supplier<String> ids) { this.bus = bus; this.clock = clock; this.ids = ids; }
    void placeAndPay(String orderId, String customer, long total) {
        Order o = new Order(orderId, customer, total);
        o.place(clock, ids);
        o.pay(total, clock, ids);
        repo.put(orderId, o);                             // 1) save (commit)
        bus.publish(o.pullEvents());                      // 2) THEN dispatch committed facts
    }
    public static void main(String[] args) {
        EventBus bus = new EventBus();
        int[] seq = {0};
        bus.subscribe(OrderPlaced.class, e -> System.out.println("  inventory: reserve stock for " + e.orderId()));
        bus.subscribe(OrderPlaced.class, e -> System.out.println("  email: confirmation to " + e.customerId()));
        bus.subscribe(OrderPaid.class, e -> System.out.println("  loyalty: +" + e.amountPaise() / 10_000 + " points"));
        bus.subscribe(OrderPaid.class, e -> { throw new RuntimeException("SMS gateway down"); });
        new PlaceOrderService(bus, Clock.systemUTC(), () -> "evt-" + (++seq[0])).placeAndPay("o-7", "asha", 250_000);
    }
}`, `// Transactional OUTBOX + relay + idempotent consumer, simulated in memory.
record OutboxRow(String eventId, String type, String payload, boolean sent) {}

class Database {                                           // pretend this is one SQL database
    final Map<String, String> orders = new LinkedHashMap<>();
    final List<OutboxRow> outbox = new ArrayList<>();
    synchronized void inTransaction(Runnable work) { work.run(); }   // a real DB gives atomicity here
}

class Broker {                                             // pretend Kafka topic
    final List<OutboxRow> topic = new ArrayList<>();
    void publish(OutboxRow r) { topic.add(r); }
}

class OutboxRelay {
    private final Database db; private final Broker broker;
    OutboxRelay(Database db, Broker b) { this.db = db; this.broker = b; }
    void pollOnce(boolean crashBeforeMarking) {
        for (int i = 0; i < db.outbox.size(); i++) {
            OutboxRow r = db.outbox.get(i);
            if (r.sent()) continue;
            broker.publish(r);                             // step 1: publish
            if (crashBeforeMarking) return;                // simulated crash: row NOT marked -> will be re-sent
            db.outbox.set(i, new OutboxRow(r.eventId(), r.type(), r.payload(), true));   // step 2: mark sent
        }
    }
}

class LoyaltyConsumer {                                    // idempotent: remembers processed event ids
    private final Set<String> processed = new HashSet<>(); int points;
    void onMessage(OutboxRow r) {
        if (!processed.add(r.eventId())) { System.out.println("duplicate " + r.eventId() + " ignored"); return; }
        points += 10;
        System.out.println("processed " + r.eventId() + ", points = " + points);
    }
}

class OutboxDemo {
    public static void main(String[] args) {
        Database db = new Database(); Broker broker = new Broker();
        db.inTransaction(() -> {                           // aggregate row + event row: both or neither
            db.orders.put("o-1", "PLACED");
            db.outbox.add(new OutboxRow("evt-1", "OrderPlaced", "{orderId:o-1}", false));
        });
        OutboxRelay relay = new OutboxRelay(db, broker);
        relay.pollOnce(true);                              // publishes evt-1, then "crashes"
        relay.pollOnce(false);                             // restart: publishes evt-1 AGAIN, marks it sent
        LoyaltyConsumer loyalty = new LoyaltyConsumer();
        broker.topic.forEach(loyalty::onMessage);          // at-least-once delivery, effectively-once effect
        System.out.println("outbox: " + db.outbox);
    }
}`],
    codeTitle: ['Aggregate records events; dispatcher runs after save', 'Transactional outbox, relay and idempotent consumer'],
    viz: {
      title: 'Event flow: record → save with outbox → relay → handlers (with failures and duplicates)',
      input: 'relay-crash',
      inputLabel: 'Failure to simulate: none | email | inventory | loyalty | relay-crash',
      gen: function (input) {
        var fail = pick(input, { none: 'none', email: 'EMAIL', inventory: 'INV', loyalty: 'LOY', 'relay-crash': 'RELAY' }, 'Type one of: none, email, inventory, loyalty, relay-crash');
        var nodes = [B('SVC', 'App service', 10, 10), B('ORD', 'Order aggregate', 10, 34), B('DB', 'DB: orders+outbox', 10, 60), B('RELAY', 'Outbox relay', 40, 60),
          B('BUS', 'Broker / bus', 52, 34), B('INV', 'Inventory', 88, 10), B('EMAIL', 'Email', 88, 34), B('LOY', 'Loyalty', 88, 60)];
        var edges = [['SVC', 'ORD', 'place(), pay()'], ['SVC', 'DB', 'save in 1 tx'], ['RELAY', 'DB', 'poll'], ['RELAY', 'BUS', 'publish'], ['BUS', 'INV'], ['BUS', 'EMAIL'], ['BUS', 'LOY']];
        var routes = { OrderPlaced: ['INV', 'EMAIL'], OrderPaid: ['LOY', 'EMAIL'] };
        var names = { INV: 'Inventory (reserve stock)', EMAIL: 'Email (send mail)', LOY: 'Loyalty (+points)' };
        var pending = [], outbox = [], topic = [], processed = { INV: [], EMAIL: [], LOY: [] }, frames = [], retry = [];
        function ob() { return TABLE('outbox table (same DB as orders)', ['eventId', 'type', 'sent?'], outbox.map(function (r) { return [r.id, r.t, r.s ? 'yes' : 'no']; }), {}); }
        function pm() { return MAP('handled eventIds per handler (for idempotency)', [['Inventory', processed.INV.join(', ') || '—'], ['Email', processed.EMAIL.join(', ') || '—'], ['Loyalty', processed.LOY.join(', ') || '—']]); }
        function snap(narr, hl, ehl, extra) { frames.push(F(narr, [G('Domain events end to end', nodes, edges, { h: 68, hl: hl || {}, ehl: ehl || {} })].concat(extra || []))); }
        snap('Customer places and pays for order <b>o-7</b>. Inventory, Email and Loyalty all care — but the Order must not call them directly.', { SVC: 'cur' }, {}, [QUEUE('events recorded inside the aggregate (not yet published)', []), ob()]);
        pending.push('e1 OrderPlaced');
        snap('<code>order.place()</code> changes status <b>and records</b> <code>OrderPlaced(e1)</code> in the aggregate\'s private list. Nothing is sent yet — the order is not saved.', { ORD: 'cur' }, { 'SVC-ORD': 'cur' }, [QUEUE('events recorded inside the aggregate (not yet published)', pending, { 0: 'ok' }), ob()]);
        pending.push('e2 OrderPaid');
        snap('<code>order.pay()</code> records <code>OrderPaid(e2)</code>. Events are <b>past-tense facts</b>: by the time anyone reads them, they have happened.', { ORD: 'cur' }, { 'SVC-ORD': 'cur' }, [QUEUE('events recorded inside the aggregate (not yet published)', pending, { 1: 'ok' }), ob()]);
        outbox.push({ id: 'e1', t: 'OrderPlaced', s: false }); outbox.push({ id: 'e2', t: 'OrderPaid', s: false });
        pending = [];
        snap('<b>One transaction</b>: <code>UPDATE orders ...</code> + <code>INSERT INTO outbox (e1), (e2)</code>, then COMMIT. Either the order and its events are both saved, or neither is. This solves the dual-write problem.', { DB: 'ok', SVC: 'cur' }, { 'SVC-DB': 'ok' }, [QUEUE('events recorded inside the aggregate (not yet published)', []), ob()]);
        function deliver(ev, extraNarr) {
          var hs = routes[ev.t];
          hs.forEach(function (h) {
            var e = {}; e['BUS-' + h] = 'cur'; var hl = { BUS: 'cur' };
            if (processed[h].indexOf(ev.id) >= 0) {
              hl[h] = 'sel';
              snap('Bus delivers <b>' + ev.id + ' ' + ev.t + '</b> to <b>' + names[h] + '</b> again. The handler sees <b>' + ev.id + '</b> is already in its processed set → <span class="c-y">ignore duplicate</span>. Idempotency turns at-least-once delivery into an exactly-once <i>effect</i>.', hl, e, [QUEUE('broker topic', topic.map(function (x) { return x.id + ' ' + x.t; })), pm()]);
              return;
            }
            if (fail === h && retry.indexOf(h + ev.id) < 0 && h !== 'EMAIL' || (fail === 'EMAIL' && h === 'EMAIL' && retry.indexOf(h + ev.id) < 0 && ev.id === 'e1')) {
              retry.push(h + ev.id); hl[h] = 'bad'; e['BUS-' + h] = 'bad';
              snap('<b>' + names[h] + '</b> throws while handling ' + ev.id + ' (service down). <span class="c-r">Only this handler fails</span>; the order is already committed and the other handlers are unaffected. The message is <b>not acknowledged</b>, so it will be redelivered (retry with backoff; after N tries → dead-letter queue).', hl, e, [QUEUE('broker topic', topic.map(function (x) { return x.id + ' ' + x.t; })), pm()]);
              return;
            }
            processed[h].push(ev.id); hl[h] = 'ok'; e['BUS-' + h] = 'ok';
            snap('Bus delivers <b>' + ev.id + ' ' + ev.t + '</b> → <b>' + names[h] + '</b> runs in <b>its own transaction</b> on its own aggregate and records ' + ev.id + ' as processed.' + (extraNarr || ''), hl, e, [QUEUE('broker topic', topic.map(function (x) { return x.id + ' ' + x.t; })), pm()]);
          });
        }
        outbox.forEach(function (r, k) {
          topic.push({ id: r.id, t: r.t });
          snap('Relay polls the outbox, finds unsent <b>' + r.id + '</b>, publishes it to the broker.', { RELAY: 'cur', BUS: 'ok' }, { 'RELAY-DB': 'cur', 'RELAY-BUS': 'ok' }, [ob(), QUEUE('broker topic', topic.map(function (x) { return x.id + ' ' + x.t; }), (function () { var h = {}; h[topic.length - 1] = 'ok'; return h; })())]);
          if (fail === 'RELAY' && k === 0) {
            snap('<span class="c-r">Relay crashes</span> right after publishing e1 but <b>before</b> marking it sent. On restart, the outbox still says e1 is unsent…', { RELAY: 'bad' }, { 'RELAY-DB': 'bad' }, [ob()]);
            topic.push({ id: r.id, t: r.t });
            snap('…so the restarted relay publishes <b>e1 again</b>. The broker now holds a duplicate. This is normal: outbox delivery is <b>at-least-once</b>.', { RELAY: 'cur', BUS: 'cur' }, { 'RELAY-BUS': 'cur' }, [QUEUE('broker topic', topic.map(function (x) { return x.id + ' ' + x.t; }), (function () { var h = {}; h[topic.length - 1] = 'bad'; return h; })())]);
          }
          r.s = true;
          snap('Relay marks <b>' + r.id + '</b> as sent.', { RELAY: 'ok', DB: 'ok' }, { 'RELAY-DB': 'ok' }, [ob()]);
        });
        topic.forEach(function (ev) { deliver(ev); });
        if (retry.length) {
          snap('Retry round: the broker redelivers the unacknowledged messages to the handler that failed.', { BUS: 'cur' }, {}, [QUEUE('redelivery', retry.map(function (r) { return r; }))]);
          retry.slice().forEach(function (key) {
            var h = key.replace(/e\d+$/, ''), id = key.slice(h.length), ev = null;
            topic.forEach(function (x) { if (x.id === id) ev = x; });
            processed[h].push(id);
            var hl = { BUS: 'cur' }; hl[h] = 'ok'; var e = {}; e['BUS-' + h] = 'ok';
            snap('Redelivery of <b>' + id + ' ' + ev.t + '</b> to <b>' + names[h] + '</b> → <span class="c-g">succeeds</span> now that the service is back. Eventually consistent: a few seconds late, but correct.', hl, e, [pm()]);
          });
        }
        snap('End state: order committed once, every handler applied every event <b>exactly once in effect</b>, failures were isolated and retried. The Order class never imported Inventory, Email or Loyalty.', { ORD: 'sel', INV: 'ok', EMAIL: 'ok', LOY: 'ok' }, {}, [ob(), pm()]);
        return frames;
      }
    },
    examples: [
      { title: 'Naming events well', html: `${H.table(['Weak name', 'Better', 'Why'], [['<code>OrderUpdated</code>', '<code>ShippingAddressChanged</code>', 'says what happened in business terms'], ['<code>SendEmailEvent</code>', '<code>OrderPlaced</code>', 'an event states a fact, not a command to someone'], ['<code>StatusChangedToCancelled</code>', '<code>OrderCancelled</code> (with reason)', 'domain language, carries the data handlers need']])}` },
      { title: 'Eventual consistency between aggregates', html: `<p>Seat booking: <code>Booking.confirm()</code> records <code>BookingConfirmed</code>. A handler loads the <code>ShowSeats</code> aggregate and marks seats sold. If the handler finds the seat already sold (rare race), it records <code>BookingFailed</code>, and another handler refunds — a <b>compensating action</b>. Each step is one aggregate, one transaction.</p>` },
      { title: 'Idempotent handler in 6 lines', html: `<p>Keep a set (in production: a table with a unique key on <code>event_id</code>, written in the same transaction as the handler's effect).</p>`, code: `class PointsHandler {
    private final Set<String> seen = new HashSet<>();
    private final Map<String, Integer> points = new HashMap<>();
    void on(String eventId, String customer, int earned) {
        if (!seen.add(eventId)) return;               // already applied: do nothing
        points.merge(customer, earned, Integer::sum);
    }
}` },
      { title: 'Events vs commands', html: `${H.table(['', 'Command', 'Event'], [['Tense', 'imperative: <code>PlaceOrder</code>', 'past: <code>OrderPlaced</code>'], ['Can be rejected?', 'yes', 'no — it already happened'], ['Receivers', 'exactly one handler', 'zero to many subscribers'], ['Coupling', 'sender knows the receiver', 'publisher does not know subscribers']])}` }
    ],
    deepDive: `<p><b>When to dispatch.</b> Three styles: (1) <b>immediately inside the aggregate</b> via a static <code>DomainEvents.raise()</code> — simple but fires before commit and hides a global; (2) <b>collect and dispatch after save</b> (our style; Spring Data's <code>@DomainEvents</code>/<code>AbstractAggregateRoot</code> does this, and <code>@TransactionalEventListener(phase = AFTER_COMMIT)</code> runs handlers after commit); (3) <b>outbox</b> for anything crossing a process boundary. In-process after-commit handlers still lose events if the JVM dies between commit and dispatch — only the outbox is durable.</p>
<p><b>Outbox details:</b> the relay can poll (<code>SELECT ... WHERE sent = false ORDER BY id LIMIT 100 FOR UPDATE SKIP LOCKED</code>) or use change-data-capture from the DB's write-ahead log (Debezium → Kafka), which avoids polling load and preserves commit order. Ordering per aggregate is preserved by using the aggregate ID as the Kafka partition key. Clean up sent rows periodically.</p>
<p><b>Idempotency options:</b> processed-ID table with a unique constraint (insert in the same transaction as the effect); natural idempotency (<code>SET status = 'SHIPPED'</code> is idempotent, <code>points = points + 10</code> is not); version checks (apply event only if <code>event.version == aggregate.version + 1</code>).</p>
<p><b>Event payload design:</b> "fat" events (carry all data handlers need — fewer callbacks, bigger contract) vs "thin" events (IDs only — handlers call back for details, risk reading newer state). For integration events prefer explicit schemas (Avro/Protobuf/JSON Schema), additive changes only, and a version field.</p>
<p><b>Pitfalls:</b> event chains that are impossible to follow (A → B → C → A), handlers that throw and silently drop events, using events for things that need an immediate answer (use a direct call), and putting everything in events "just in case" — every published event is a contract you must maintain.</p>`,
    aiEra: `<p><b>What AI changes:</b> event-driven systems are hard to read because the flow is implicit. AI assistants are genuinely helpful here: <code>List every publisher and every subscriber of OrderPlaced in this repo and draw the flow as a sequence</code> turns scattered handlers into a map in seconds. Ask them to generate an <b>event catalog</b> (name, payload, producers, consumers) and keep it in the repo.</p>
<p><b>Agents and events:</b> AI agents increasingly react to events ("when a support ticket is created, triage it"). Treat an agent as just another subscriber: it must be idempotent (a redelivered event must not create two replies), its failures must be isolated and retried, and its outputs should themselves be events (<code>TicketTriaged</code>) rather than direct writes into other aggregates.</p>
<p><b>Where AI goes wrong:</b> publishes to Kafka inside the DB transaction ("it works locally"), forgets idempotency, uses events named like commands, or emits events before the save. Also, generated consumers often catch-and-log exceptions, silently losing messages — insist on retry + dead-letter.</p>
<p><b>What you must own:</b> which consistency is acceptable where, the event contracts other teams depend on, and the failure semantics (what happens when a handler is down for an hour).</p>`,
    problems: [{
      title: 'Library Returns: Late Fees and Reservations via Domain Events', level: 'Medium', tags: ['domain events', 'idempotency', 'eventual consistency'], companies: ['Amazon', 'Flipkart', 'Atlassian'],
      statement: `<p>When a member returns a book: (1) the <code>Loan</code> aggregate closes; (2) if late, the member's <code>FineAccount</code> is charged ₹10 per late day; (3) if someone reserved the book, the first person in the <code>ReservationQueue</code> is notified and gets a 2-day hold. Each of these is a separate aggregate. Implement <code>Loan.returnBook()</code> recording a <code>BookReturned</code> event, an event dispatcher, and two idempotent handlers. Show that delivering the same event twice charges the fine only once.</p>`,
      constraints: `One aggregate per transaction. Handlers must tolerate redelivery. Use an injected Clock.`,
      example: `<p>Loan due 1 Mar, returned 4 Mar → event <code>BookReturned(e1, loan L1, member asha, book b1, lateDays 3)</code>. FineAccount asha: ${H.c('r', '₹30')}. ReservationQueue b1 = [ravi, meera] → ravi gets a hold until 6 Mar. Redeliver e1 → ${H.c('g', 'fine stays ₹30')}, ravi not notified twice.</p>`,
      brute: { why: `<p><code>LoanService.returnBook</code> updates the loan, computes the fine, updates the member, pops the reservation queue and sends the notification in one method and one transaction. Any failure (notification server down) rolls back the <i>return itself</i>, so the book shows as still borrowed. Retrying charges the fine twice.</p>`, code: `class LoanServiceBrute {
    final Map<String, Integer> fines = new HashMap<>();
    final Map<String, Deque<String>> queues = new HashMap<>();
    void returnBook(String member, String book, int lateDays) {
        fines.merge(member, lateDays * 10, Integer::sum);          // not idempotent: retry = double fine
        Deque<String> q = queues.getOrDefault(book, new ArrayDeque<>());
        if (!q.isEmpty()) System.out.println("notify " + q.poll());  // if this throws, the whole return fails
    }
}` },
      mcq: { q: 'The notification service is down when a book is returned. What should happen?', options: ['The return is committed; the BookReturned handler for reservations retries later', 'The return is rolled back so everything stays consistent', 'The fine is cancelled', 'The librarian must retry the return manually'], answer: 0, explain: 'The return is a fact that already happened in the real world. Side effects in other aggregates are eventually consistent and retried; they must not undo the fact.' },
      hints: [`<p>Hint 1: <code>Loan.returnBook(LocalDate today)</code> computes late days inside the aggregate and records <code>BookReturned</code> with everything handlers need.</p>`, `<p>Hint 2: Each handler keeps a <code>Set&lt;String&gt;</code> of processed event IDs (in production, a table with a unique key written in the same transaction).</p>`, `<p>Hint 3: Dispatcher = <code>Map&lt;Class, List&lt;Consumer&gt;&gt;</code>; wrap each handler call in try/catch and keep failed deliveries in a retry list.</p>`],
      solution: {
        approach: `<p><code>Loan</code> records a <code>BookReturned</code> fact after validating the return. The application service saves the loan and then dispatches. <code>FineHandler</code> and <code>ReservationHandler</code> each update their own aggregate and remember processed event IDs, so redelivery has no extra effect. A failing handler goes to a retry list without affecting the committed return.</p>`,
        code: `record BookReturned(String eventId, String loanId, String member, String book, long lateDays) {}

class Loan {
    private final String id, member, book; private final LocalDate due; private boolean returned;
    private final List<BookReturned> events = new ArrayList<>();
    Loan(String id, String member, String book, LocalDate due) { this.id = id; this.member = member; this.book = book; this.due = due; }
    void returnBook(LocalDate today, String eventId) {
        if (returned) throw new IllegalStateException("already returned");
        returned = true;
        long late = Math.max(0, java.time.temporal.ChronoUnit.DAYS.between(due, today));
        events.add(new BookReturned(eventId, id, member, book, late));
    }
    List<BookReturned> pullEvents() { List<BookReturned> e = List.copyOf(events); events.clear(); return e; }
}

class FineHandler {                                        // updates the FineAccount aggregate
    final Map<String, Long> fines = new HashMap<>(); private final Set<String> done = new HashSet<>();
    void on(BookReturned e) {
        if (!done.add(e.eventId())) return;                 // idempotent
        if (e.lateDays() > 0) fines.merge(e.member(), e.lateDays() * 10, Long::sum);
    }
}
class ReservationHandler {                                 // updates the ReservationQueue aggregate
    final Map<String, Deque<String>> queues = new HashMap<>(); final List<String> holds = new ArrayList<>();
    private final Set<String> done = new HashSet<>(); private final Clock clock;
    ReservationHandler(Clock clock) { this.clock = clock; }
    void on(BookReturned e) {
        if (done.contains(e.eventId())) return;
        Deque<String> q = queues.getOrDefault(e.book(), new ArrayDeque<>());
        if (!q.isEmpty()) holds.add(q.poll() + " holds " + e.book() + " until " + LocalDate.now(clock).plusDays(2));
        done.add(e.eventId());                              // mark only after success
    }
}

class ReturnService {
    public static void main(String[] args) {
        Clock clock = Clock.fixed(Instant.parse("2026-03-04T09:00:00Z"), ZoneOffset.UTC);
        FineHandler fines = new FineHandler(); ReservationHandler res = new ReservationHandler(clock);
        res.queues.put("b1", new ArrayDeque<>(List.of("ravi", "meera")));
        List<Consumer<BookReturned>> subscribers = List.of(fines::on, res::on);

        Loan loan = new Loan("L1", "asha", "b1", LocalDate.of(2026, 3, 1));
        loan.returnBook(LocalDate.now(clock), "e1");
        List<BookReturned> committed = loan.pullEvents();   // (save loan here, then dispatch)
        for (int delivery = 1; delivery <= 2; delivery++)    // at-least-once: same event delivered twice
            for (BookReturned e : committed) for (Consumer<BookReturned> s : subscribers) s.accept(e);

        System.out.println("fines " + fines.fines + ", holds " + res.holds);   // fines {asha=30}, one hold for ravi
    }
}`,
        complexity: `<p>O(1) per event per handler. Each handler's processed-ID set grows with events; in production, expire IDs after the broker's maximum redelivery window.</p>`,
        followUps: ['Where would you store processed IDs so that "apply effect" and "remember ID" are atomic?', 'What if the hold expires without pickup? (A scheduled check records HoldExpired → next in queue.)', 'How would a separate Notification service receive this — domain event or integration event?']
      }
    }]
  });
  /* ======================= TOPIC 8: EVENT SOURCING ======================= */
  topics.push({
    title: 'Event Sourcing in Code: Store the Story, Rebuild the State',
    analogy: `<p>Your <b>bank passbook</b> does not store "balance = ₹4,250" and nothing else. It stores every line: <i>opened, +5,000 salary, −500 ATM, −250 electricity…</i>. The balance at the bottom is just the result of adding up the lines. If the bank's display ever showed a wrong balance, they could recompute it from the lines. They can also answer "what was my balance on 1st March?" by adding lines only up to that date. A <b>cricket scorecard</b> works the same way: ball-by-ball events; the score is derived.</p>`,
    explain: `<p>Normal apps store the <b>current state</b> and overwrite it on every change (<code>UPDATE accounts SET balance = 4250</code>). The history is lost. <b>Event sourcing</b> flips this: the <b>source of truth is the list of events</b> (append-only), and current state is <b>derived</b> by replaying them.</p>
${H.table(['', 'State-oriented (CRUD)', 'Event-sourced'], [
  ['What is saved', 'latest row', 'every event, in order, forever'],
  ['A change', '<code>UPDATE</code> overwrites', '<code>APPEND</code> a new event'],
  ['Load an object', '<code>SELECT</code> one row', 'read its events and replay them'],
  ['History / audit', 'separate audit table (often incomplete)', 'free and complete'],
  ['"What was it on 1 March?"', 'usually impossible', 'replay events up to that date']
])}
<p><b>The code pattern has two halves</b> — keep them separate:</p>
<ul><li><b>decide(command, state) → events</b>: validates the command against current state ("enough balance?"). May <b>reject</b>. Produces new events. This is where business rules live.</li>
<li><b>apply / evolve(state, event) → new state</b>: just updates fields. <b>Never validates, never fails, never has side effects</b>, because events are facts that already happened. Replaying must always succeed.</li></ul>
<p><b>Loading</b> = start from an empty object and <code>apply</code> every event in its <b>stream</b> (one stream per aggregate, e.g. <code>account-42</code>). <b>Saving</b> = append the new events with an <b>expected version</b>: "I loaded version 7, append these after 7". If someone appended in between, the store rejects it — the same optimistic locking you saw with aggregates.</p>
${H.arr(['Opened', 'Deposited 100', 'Withdrew 30', 'Deposited 50'], { label: 'stream account-42 (versions 1..4)' })}
${H.table(['replay step', 'event', 'balance after'], [['1', 'Opened', '0'], ['2', 'Deposited 100', '100'], ['3', 'Withdrew 30', '70'], ['4', 'Deposited 50', '<b>120</b>']])}
<p><b>Projections (read models).</b> Because the log has everything, you can build any number of query-friendly views by subscribing to events: a "statement" table, a "monthly totals" table, a search index. If a projection has a bug, fix it and <b>rebuild it from the log</b>. This pairs naturally with CQRS (separate write model and read models).</p>
<p><b>Snapshots.</b> A stream with 100,000 events is slow to replay. Every N events, store a snapshot of the state with its version; loading = latest snapshot + events after it. Snapshots are a cache — you can delete them and rebuild.</p>`,
    clues: [
      '"We need a complete <b>audit trail</b> / <b>history</b> of every change" (banking, ledgers, trading, healthcare) → event sourcing is a strong candidate.',
      '"What was the state at time T?" / "replay" / "undo" / "time travel debugging" → events as source of truth.',
      '"Rebuild state from events" / "the balance is the sum of transactions" in the problem statement.',
      '"Many different read views of the same data" → projections from one event log (CQRS).',
      '"Concurrent updates to the same stream" → expected-version append.',
      'Caution clue: simple CRUD, heavy ad-hoc querying, or "delete user data on request" → event sourcing adds real cost; say so.'
    ],
    code: [`// Event-sourced BankAccount: decide (validate) vs apply (evolve), event store with expected version.
sealed interface AccountEvent permits Opened, Deposited, Withdrew, Frozen {}
record Opened(String owner) implements AccountEvent {}
record Deposited(long amount) implements AccountEvent {}
record Withdrew(long amount) implements AccountEvent {}
record Frozen(String reason) implements AccountEvent {}

class ConcurrencyException extends RuntimeException { ConcurrencyException(String m) { super(m); } }

class EventStore {                                          // append-only, one stream per aggregate
    private final Map<String, List<AccountEvent>> streams = new HashMap<>();
    synchronized List<AccountEvent> read(String streamId) { return List.copyOf(streams.getOrDefault(streamId, List.of())); }
    synchronized void append(String streamId, long expectedVersion, List<AccountEvent> events) {
        List<AccountEvent> s = streams.computeIfAbsent(streamId, k -> new ArrayList<>());
        if (s.size() != expectedVersion) throw new ConcurrencyException(streamId + ": expected v" + expectedVersion + " but is v" + s.size());
        s.addAll(events);
    }
}

class BankAccount {
    private final String id;
    private boolean open, frozen; private long balance; private long version;   // derived state
    private final List<AccountEvent> uncommitted = new ArrayList<>();

    private BankAccount(String id) { this.id = id; }

    static BankAccount rehydrate(String id, List<AccountEvent> history) {      // LOAD = replay
        BankAccount a = new BankAccount(id);
        history.forEach(e -> { a.apply(e); a.version++; });
        return a;
    }
    // ---------- decide: rules live here; may throw; produces events ----------
    void open(String owner)   { if (open) throw new IllegalStateException("already open"); raise(new Opened(owner)); }
    void deposit(long amt)    { requireOpen(); if (amt <= 0) throw new IllegalArgumentException("amount > 0"); raise(new Deposited(amt)); }
    void withdraw(long amt)   {
        requireOpen();
        if (frozen) throw new IllegalStateException("account frozen");
        if (amt <= 0 || amt > balance) throw new IllegalStateException("insufficient funds: balance " + balance);
        raise(new Withdrew(amt));
    }
    void freeze(String why)   { requireOpen(); if (!frozen) raise(new Frozen(why)); }

    // ---------- apply: pure state change; never validates, never fails ----------
    private void apply(AccountEvent e) {
        switch (e) {
            case Opened o    -> open = true;
            case Deposited d -> balance += d.amount();
            case Withdrew w  -> balance -= w.amount();
            case Frozen f    -> frozen = true;
        }
    }
    private void raise(AccountEvent e) { apply(e); uncommitted.add(e); }
    private void requireOpen() { if (!open) throw new IllegalStateException("not open"); }

    void saveTo(EventStore store) { store.append(id, version, uncommitted); version += uncommitted.size(); uncommitted.clear(); }
    long balance() { return balance; } long version() { return version; }

    public static void main(String[] args) {
        EventStore store = new EventStore();
        BankAccount a = BankAccount.rehydrate("acc-42", store.read("acc-42"));
        a.open("asha"); a.deposit(100); a.withdraw(30); a.deposit(50);
        a.saveTo(store);
        System.out.println("log: " + store.read("acc-42"));

        BankAccount again = BankAccount.rehydrate("acc-42", store.read("acc-42"));     // fresh process, same state
        System.out.println("rebuilt balance " + again.balance() + " at v" + again.version()); // 120 at v4
        try { again.withdraw(500); } catch (IllegalStateException e) { System.out.println("rejected: " + e.getMessage()); }

        BankAccount tab1 = BankAccount.rehydrate("acc-42", store.read("acc-42"));
        BankAccount tab2 = BankAccount.rehydrate("acc-42", store.read("acc-42"));
        tab1.withdraw(100); tab1.saveTo(store);
        tab2.withdraw(100);                                                          // based on stale v4
        try { tab2.saveTo(store); } catch (ConcurrencyException e) { System.out.println("conflict: " + e.getMessage()); }
    }
}`, `// Functional style (Java 21): state = fold(evolve, initial, events); decide returns events.
sealed interface CartEvent permits ItemAdded, ItemRemoved, CheckedOut {}
record ItemAdded(String sku, int qty) implements CartEvent {}
record ItemRemoved(String sku) implements CartEvent {}
record CheckedOut() implements CartEvent {}

record CartState(Map<String, Integer> items, boolean checkedOut) {
    static final CartState EMPTY = new CartState(Map.of(), false);
}

final class Cart {
    static CartState evolve(CartState s, CartEvent e) {       // pure: (state, event) -> new state
        return switch (e) {
            case ItemAdded a -> { Map<String, Integer> m = new TreeMap<>(s.items()); m.merge(a.sku(), a.qty(), Integer::sum); yield new CartState(Map.copyOf(m), false); }
            case ItemRemoved r -> { Map<String, Integer> m = new TreeMap<>(s.items()); m.remove(r.sku()); yield new CartState(Map.copyOf(m), false); }
            case CheckedOut c -> new CartState(s.items(), true);
        };
    }
    static CartState replay(List<CartEvent> events) {
        CartState s = CartState.EMPTY;
        for (CartEvent e : events) s = evolve(s, e);
        return s;
    }
    static List<CartEvent> checkout(CartState s) {             // decide: validates, returns new events
        if (s.checkedOut()) throw new IllegalStateException("already checked out");
        if (s.items().isEmpty()) throw new IllegalStateException("empty cart");
        return List.of(new CheckedOut());
    }
    public static void main(String[] args) {
        List<CartEvent> log = new ArrayList<>(List.of(new ItemAdded("tea", 2), new ItemAdded("mug", 1), new ItemAdded("tea", 1), new ItemRemoved("mug")));
        CartState now = replay(log);
        System.out.println(now);                                   // {tea=3}, not checked out
        log.addAll(checkout(now));
        System.out.println(replay(log));                           // checkedOut=true
        System.out.println("as of event 2: " + replay(log.subList(0, 2)));   // time travel
    }
}`, `// Snapshots + a projection (read model) built from the same events.
record Event(long version, String type, long amount) {}
record Snapshot(long version, long balance) {}

class SnapshottingRepo {
    static final int EVERY = 3;
    final List<Event> log = new ArrayList<>();
    Snapshot latest = new Snapshot(0, 0);
    int eventsReplayedOnLastLoad;

    void append(String type, long amount) {
        log.add(new Event(log.size() + 1, type, amount));
        if (log.size() % EVERY == 0) latest = new Snapshot(log.size(), load());     // take a snapshot every 3 events
    }
    long load() {                                                 // snapshot + only the events after it
        long bal = latest.balance(); int n = 0;
        for (Event e : log) if (e.version() > latest.version()) { bal += e.type().equals("DEP") ? e.amount() : -e.amount(); n++; }
        eventsReplayedOnLastLoad = n;
        return bal;
    }
}

class MonthlyTotalsProjection {                                   // a read model: rebuildable at any time
    final Map<String, Long> totals = new TreeMap<>();
    void on(Event e) { totals.merge(e.type(), e.amount(), Long::sum); }
    static MonthlyTotalsProjection rebuild(List<Event> log) { MonthlyTotalsProjection p = new MonthlyTotalsProjection(); log.forEach(p::on); return p; }
}

class SnapshotDemo {
    public static void main(String[] args) {
        SnapshottingRepo r = new SnapshottingRepo();
        r.append("DEP", 100); r.append("WD", 30); r.append("DEP", 50); r.append("WD", 20);
        long bal = r.load();
        System.out.println("balance " + bal + " (snapshot v" + r.latest.version() + " + " + r.eventsReplayedOnLastLoad + " event)");
        System.out.println("projection " + MonthlyTotalsProjection.rebuild(r.log).totals);   // {DEP=150, WD=50}
    }
}`],
    codeTitle: ['Event-sourced aggregate: decide vs apply, expected-version append', 'Functional event sourcing with sealed events + pattern matching', 'Snapshots and a rebuildable projection'],
    viz: {
      title: 'Event log replay: commands become events, events rebuild state step by step',
      input: 'open, deposit 100, withdraw 30, deposit 50, withdraw 500, freeze, deposit 20, withdraw 10 | snap 3',
      inputLabel: 'Commands: open, deposit N, withdraw N, freeze, unfreeze (optional "| snap K")',
      gen: function (input) {
        var s = String(input || ''), halves = s.split('|');
        var cmds = tokens(halves[0], ',', 12, 'Example: open, deposit 100, withdraw 30 | snap 2');
        var snapAt = 0;
        if (halves[1]) { var m = halves[1].trim().match(/^snap\s+(\d{1,2})$/i); if (!m) throw new Error('Snapshot part must look like "| snap 3"'); snapAt = +m[1]; }
        var st = { open: false, frozen: false, balance: 0, version: 0 }, log = [], frames = [], rejected = [];
        function lv() { return log.map(function (e) { return e.t + (e.a !== undefined ? ' ' + e.a : ''); }); }
        function apply(o, e) { if (e.t === 'Opened') o.open = true; else if (e.t === 'Deposited') o.balance += e.a; else if (e.t === 'Withdrew') o.balance -= e.a; else if (e.t === 'Frozen') o.frozen = true; else if (e.t === 'Unfrozen') o.frozen = false; o.version++; }
        frames.push(F('<b>Write side.</b> Each command is checked by <b>decide</b> against the current state. If valid, it produces an <b>event</b> that is <b>appended</b> to the log and <b>applied</b> to the state. If invalid, nothing is appended.', [ARR('event log (append-only)', [], {}), VARS('current state (derived)', st)]));
        cmds.forEach(function (raw) {
          var c = raw.toLowerCase().split(/\s+/), ev = null, why = null;
          var amt = c[1] !== undefined ? c[1] : null;
          if ((c[0] === 'deposit' || c[0] === 'withdraw') && !/^\d{1,6}$/.test(amt || '')) throw new Error('"' + raw + '" needs a whole amount, e.g. deposit 100');
          if (c[0] === 'open') { if (st.open) why = 'already open'; else ev = { t: 'Opened' }; }
          else if (c[0] === 'deposit') { if (!st.open) why = 'account not open'; else if (+amt <= 0) why = 'amount must be > 0'; else ev = { t: 'Deposited', a: +amt }; }
          else if (c[0] === 'withdraw') { if (!st.open) why = 'account not open'; else if (st.frozen) why = 'account is frozen'; else if (+amt <= 0 || +amt > st.balance) why = 'insufficient funds (balance ' + st.balance + ')'; else ev = { t: 'Withdrew', a: +amt }; }
          else if (c[0] === 'freeze') { if (!st.open) why = 'account not open'; else if (st.frozen) why = 'already frozen'; else ev = { t: 'Frozen' }; }
          else if (c[0] === 'unfreeze') { if (!st.frozen) why = 'not frozen'; else ev = { t: 'Unfrozen' }; }
          else throw new Error('Unknown command "' + raw + '". Use open, deposit N, withdraw N, freeze, unfreeze');
          if (why) {
            rejected.push(raw);
            var h0 = {}; log.forEach(function (_, k) { h0[k] = 'done'; });
            frames.push(F('Command <code>' + esc(raw) + '</code> → <b>decide</b> says <span class="c-r">no: ' + esc(why) + '</span>. <b>No event is appended.</b> A rejected command leaves no trace in the log (log it separately if you need to).', [ARR('event log (append-only)', lv(), h0), VARS('current state (derived)', st, {}), QUEUE('rejected commands', rejected, (function () { var h = {}; h[rejected.length - 1] = 'bad'; return h; })())]));
            return;
          }
          log.push(ev); apply(st, ev);
          var h1 = {}; log.forEach(function (_, k) { h1[k] = 'done'; }); h1[log.length - 1] = 'ok';
          var p1 = {}; p1[log.length - 1] = 'v' + log.length;
          frames.push(F('Command <code>' + esc(raw) + '</code> → valid → event <b>' + ev.t + (ev.a !== undefined ? ' ' + ev.a : '') + '</b> appended at version <b>' + log.length + '</b> (expected version was ' + (log.length - 1) + '), then applied to the state.', [ARR('event log (append-only)', lv(), h1, p1), VARS('current state (derived)', st, ev.t === 'Deposited' || ev.t === 'Withdrew' ? { balance: 'ok' } : ev.t === 'Opened' ? { open: 'ok' } : { frozen: 'ok' })]));
        });
        if (!log.length) { frames.push(F('No valid events were produced, so there is nothing to replay. Start with <code>open</code>.', [ARR('event log (append-only)', [], {})])); return frames; }
        var fin = clone(st);
        var r = { open: false, frozen: false, balance: 0, version: 0 };
        frames.push(F('<b>Server restarts.</b> The in-memory object is gone. Only the event log survives. Rebuild: start from an <b>empty</b> state and <b>apply</b> every event in order. Apply never validates — events are facts.', [ARR('event log (append-only)', lv(), {}, { 0: 'next' }), VARS('rebuilt state', r)]));
        log.forEach(function (e, k) {
          apply(r, e);
          var h = {}; for (var j = 0; j < k; j++) h[j] = 'done'; h[k] = 'cur';
          var p = {}; p[k] = 'apply';
          frames.push(F('Replay #' + (k + 1) + ': apply <b>' + e.t + (e.a !== undefined ? ' ' + e.a : '') + '</b> → ' + (e.t === 'Deposited' ? 'balance += ' + e.a : e.t === 'Withdrew' ? 'balance -= ' + e.a : e.t === 'Opened' ? 'open = true' : e.t === 'Frozen' ? 'frozen = true' : 'frozen = false') + '. State is now exactly what it was right after this event originally happened.', [ARR('event log (append-only)', lv(), h, p), VARS('rebuilt state', r, e.t === 'Deposited' || e.t === 'Withdrew' ? { balance: 'cur' } : { version: 'cur' }), CODE('apply(event)', 'switch (e) {\n  case Opened o    -> open = true;\n  case Deposited d -> balance += d.amount();\n  case Withdrew w  -> balance -= w.amount();\n  case Frozen f    -> frozen = true;\n}', (function () { var hh = {}; hh[{ Opened: 2, Deposited: 3, Withdrew: 4, Frozen: 5 }[e.t] || 1] = 'cur'; return hh; })())]));
        });
        frames.push(F('<span class="c-g">Rebuilt state equals the original</span>: balance ' + r.balance + ', version ' + r.version + '. Same events + same apply function = same state, every time (determinism).', [VARS('rebuilt state', r, { balance: 'ok', version: 'ok' }), VARS('state before restart', fin, { balance: 'ok', version: 'ok' })]));
        var K = snapAt && snapAt <= log.length ? snapAt : Math.max(1, Math.floor(log.length / 2));
        var snap = { open: false, frozen: false, balance: 0, version: 0 };
        for (var i = 0; i < K; i++) apply(snap, log[i]);
        var hs = {}; for (var a = 0; a < log.length; a++) hs[a] = a < K ? 'done' : 'win';
        frames.push(F('<b>Snapshot</b> taken at version <b>' + K + '</b> (state stored: balance ' + snap.balance + '). Next load reads the snapshot and replays only the <b>' + (log.length - K) + '</b> event(s) after it (blue range) instead of all ' + log.length + '. Snapshots are a cache: delete them and you can still rebuild from the log.', [{ type: 'array', label: 'event log (append-only)', values: lv(), hl: hs, range: [K, log.length - 1] }, VARS('snapshot v' + K, snap, { balance: 'sel' })]));
        var dep = 0, wd = 0, cnt = {};
        log.forEach(function (e) { cnt[e.t] = (cnt[e.t] || 0) + 1; if (e.t === 'Deposited') dep += e.a; if (e.t === 'Withdrew') wd += e.a; });
        frames.push(F('<b>Projection</b>: a separate read model built by subscribing to the same events — here "statement totals". Add a new projection next year and <b>backfill it from the full history</b>. Impossible with an <code>UPDATE</code>-only table.', [MAP('read model: totals', [['total deposited', dep], ['total withdrawn', wd], ['events by type', Object.keys(cnt).map(function (k) { return k + '×' + cnt[k]; }).join(', ')]], { 'total deposited': 'ok' })]));
        var T = Math.max(1, Math.min(log.length, 3)), tt = { open: false, frozen: false, balance: 0, version: 0 };
        for (var q = 0; q < T; q++) apply(tt, log[q]);
        var ht = {}; for (var b = 0; b < T; b++) ht[b] = 'sel';
        frames.push(F('<b>Time travel</b>: "what was the balance after the first ' + T + ' event(s)?" → replay only those: balance <b>' + tt.balance + '</b>. Auditors and debuggers love this.', [ARR('event log (append-only)', lv(), ht), VARS('state as of v' + T, tt, { balance: 'sel' })]));
        return frames;
      }
    },
    examples: [
      { title: 'A shopping cart that remembers what you removed', html: `<p>CRUD cart stores <code>{tea: 3}</code>. Event-sourced cart stores <i>ItemAdded tea 2, ItemAdded mug 1, ItemAdded tea 1, ItemRemoved mug</i>. Same current state, but marketing can now ask "which items do people add and then remove?" — a question nobody thought of when the system was built, answered by a new projection over old events.</p>${H.arr(['+tea 2', '+mug 1', '+tea 1', '−mug'], { label: 'cart stream', hl: { 3: 'r' } })}` },
      { title: 'Upcasting an old event version', html: `<p>v1 events stored <code>Deposited(amount)</code> in rupees; v2 stores paise and a currency. You never edit old events (they are history). Instead, an <b>upcaster</b> converts v1 → v2 while reading, before <code>apply</code> sees it.</p>`, code: `record DepositedV1(long rupees) {}
record DepositedV2(long paise, String currency) {}
class Upcaster {
    static DepositedV2 upcast(Object raw) {
        if (raw instanceof DepositedV2 v2) return v2;
        if (raw instanceof DepositedV1 v1) return new DepositedV2(v1.rupees() * 100, "INR");   // old data was always INR
        throw new IllegalArgumentException("unknown event " + raw);
    }
}` },
      { title: 'Why apply must never throw', html: `<p>Suppose a later code change adds "withdraw limit ₹10,000" and someone puts that check inside <code>apply(Withdrew)</code>. Old streams containing a legal-at-the-time ₹20,000 withdrawal can now <b>never be loaded again</b>. ${H.c('r', 'Rules belong in decide (commands), not in apply (facts).')} New rules apply only to new commands.</p>` },
      { title: 'Event sourcing ≠ event-driven', html: `${H.table(['', 'Domain events / event-driven', 'Event sourcing'], [['Events used for', 'notifying others', 'storing the aggregate itself'], ['Current state stored?', 'yes (normal tables)', 'no — derived from events'], ['Can you have one without the other?', 'yes, very common', 'yes, but you usually also publish the events']])}` }
    ],
    deepDive: `<p><b>Event store requirements:</b> append-only streams, per-stream ordering, <b>atomic append with expected version</b>, reading a stream from a version, and a global ordered feed (for projections). Options: a dedicated store (EventStoreDB/Kurrent), a relational table <code>(stream_id, version, type, payload, metadata, PRIMARY KEY(stream_id, version))</code> — the primary key itself enforces optimistic concurrency, since two writers inserting version 8 collide — or frameworks like Axon. Kafka is a great event <i>transport</i> but a poor per-aggregate store (no per-key expected-version append, compaction semantics).</p>
<p><b>Projections in production:</b> each projection tracks a checkpoint (last processed global position) and must be idempotent; rebuilding = reset checkpoint, truncate the read table, replay. Read models are eventually consistent — the UI may need "read your own writes" tricks (return the new version and wait/poll, or update optimistically).</p>
<p><b>Schema evolution:</b> events are immutable forever, so plan for versioning: weak schema (tolerant JSON readers, additive fields), upcasters on read, or copy-and-transform migrations into a new stream (rare). Name events carefully up front; they are your most durable API.</p>
<p><b>Privacy / GDPR:</b> "right to be forgotten" vs immutable logs. Standard answer: <b>crypto-shredding</b> (encrypt personal fields with a per-person key; delete the key) or keep personal data outside the events and reference it by ID.</p>
<p><b>Costs (say them in interviews):</b> more moving parts, eventual consistency of reads, harder ad-hoc queries, versioning discipline, larger storage (cheap), and a steep learning curve. Use it where history is the business (ledgers, trading, logistics tracking, collaborative editing, compliance), not for a settings page. Martin Fowler and Greg Young both warn against applying it system-wide; apply it to the aggregates that benefit.</p>`,
    aiEra: `<p><b>What AI changes:</b> event-sourced code is formulaic (sealed events, a switch in <code>apply</code>, a decide method per command), which AI generates quickly and correctly — and a sealed interface plus pattern-matching <code>switch</code> means the compiler catches the classic AI mistake of forgetting to handle a new event type. Ask for <b>given-when-then tests</b>: <code>given [Opened, Deposited 100] when Withdraw 150 then rejected</code> — the natural testing style for event sourcing, and AI writes them fast.</p>
<p><b>Event logs are perfect AI context.</b> An agent debugging "why is this balance wrong?" can read the stream and replay it step by step — far better evidence than a single row. AI agent frameworks themselves increasingly use event-sourced state: an agent run is a log of steps (thought, tool call, result), which enables replay, resume after crash, and audit of what the agent did and why.</p>
<p><b>Where AI goes wrong:</b> puts validation inside <code>apply</code>, mutates or "fixes" old events, uses the event list as the read model for queries (slow), forgets the expected-version check, or proposes event sourcing for CRUD because it sounds advanced.</p>
<p><b>What you must own:</b> whether the domain benefits enough to pay the complexity cost, and the event names/contracts you will live with for years.</p>`,
    problems: [{
      title: 'Event-Sourced Warehouse Stock Item', level: 'Medium', tags: ['event sourcing', 'replay', 'decide/apply'], companies: ['Amazon', 'Flipkart', 'Shopify'],
      statement: `<p>Model a warehouse <code>StockItem</code> with event sourcing. Commands: <code>receive(qty)</code>, <code>reserve(orderId, qty)</code>, <code>release(orderId)</code>, <code>ship(orderId)</code>. Rules: available = onHand − reserved; cannot reserve more than available; an order can hold only one reservation; ship only a reserved order (reduces onHand and reserved). Events: <code>Received</code>, <code>Reserved</code>, <code>Released</code>, <code>Shipped</code>. Implement decide/apply, rebuild from history, and answer "what was available after event k?".</p>`,
      constraints: `Quantities positive ints. Apply must never throw. Up to 10<sup>5</sup> events per item (mention snapshots).`,
      example: `<p>Events: Received 10, Reserved o1 4, Reserved o2 5, Shipped o1, Released o2 → onHand ${H.c('b', '6')}, reserved ${H.c('b', '0')}, available ${H.c('g', '6')}. Command reserve o3 7 → ${H.c('r', 'rejected: only 6 available')}. As of event 3: available = 10 − 9 = 1.</p>`,
      brute: { why: `<p>A single row <code>(sku, on_hand, reserved)</code> updated in place. When numbers look wrong ("why is available negative?") there is no history to investigate; reservations per order are not tracked so a double <code>release</code> silently subtracts twice.</p>`, code: `class StockRowBrute {
    int onHand, reserved;
    void receive(int q) { onHand += q; }
    void reserve(int q) { reserved += q; }                 // no per-order tracking, no availability check
    void release(int q) { reserved -= q; }                 // releasing twice -> negative reserved
    void ship(int q) { onHand -= q; reserved -= q; }
    int available() { return onHand - reserved; }
}` },
      mcq: { q: 'An old stream contains "Reserved o9 50" from before a new rule "max 20 per order" was added. What happens on replay?', options: ['It replays fine: apply never validates; the new rule only affects new reserve commands', 'Replay fails with a rule violation', 'The event must be edited to 20', 'The whole stream must be deleted'], answer: 0, explain: 'Events are historical facts. Rules live in decide (command handling). Apply only changes state, so old histories always load.' },
      hints: [`<p>Hint 1: State = <code>onHand</code>, <code>Map&lt;orderId, qty&gt; reservations</code>; reserved = sum of the map.</p>`, `<p>Hint 2: Each command: check rules on current state → create event → apply it → add to uncommitted list.</p>`, `<p>Hint 3: "As of event k" = rehydrate from <code>history.subList(0, k)</code>. Snapshots: store (version, onHand, reservations) every N events.</p>`],
      solution: {
        approach: `<p>Sealed event records; a <code>StockItem</code> with private derived state; command methods validate and raise events; a single <code>apply</code> switch updates state. <code>rehydrate(history)</code> replays; time travel replays a prefix. Rules live only in command methods, so old events always replay.</p>`,
        code: `sealed interface StockEvent permits Received, Reserved, Released, Shipped {}
record Received(int qty) implements StockEvent {}
record Reserved(String orderId, int qty) implements StockEvent {}
record Released(String orderId) implements StockEvent {}
record Shipped(String orderId) implements StockEvent {}

class StockItem {
    private int onHand; private final Map<String, Integer> reservations = new LinkedHashMap<>();
    private final List<StockEvent> uncommitted = new ArrayList<>();

    static StockItem rehydrate(List<StockEvent> history) { StockItem s = new StockItem(); history.forEach(s::apply); return s; }

    int reserved() { return reservations.values().stream().mapToInt(Integer::intValue).sum(); }
    int available() { return onHand - reserved(); }

    // decide
    void receive(int qty) { if (qty <= 0) throw new IllegalArgumentException("qty > 0"); raise(new Received(qty)); }
    void reserve(String order, int qty) {
        if (qty <= 0) throw new IllegalArgumentException("qty > 0");
        if (reservations.containsKey(order)) throw new IllegalStateException(order + " already has a reservation");
        if (qty > available()) throw new IllegalStateException("only " + available() + " available");
        raise(new Reserved(order, qty));
    }
    void release(String order) { if (!reservations.containsKey(order)) throw new IllegalStateException("no reservation for " + order); raise(new Released(order)); }
    void ship(String order) { if (!reservations.containsKey(order)) throw new IllegalStateException("nothing reserved for " + order); raise(new Shipped(order)); }

    // apply: pure state change, never throws
    private void apply(StockEvent e) {
        switch (e) {
            case Received r -> onHand += r.qty();
            case Reserved r -> reservations.put(r.orderId(), r.qty());
            case Released r -> reservations.remove(r.orderId());
            case Shipped s  -> onHand -= reservations.getOrDefault(s.orderId(), 0);
        }
        if (e instanceof Shipped s) reservations.remove(s.orderId());
    }
    private void raise(StockEvent e) { apply(e); uncommitted.add(e); }
    List<StockEvent> pullUncommitted() { List<StockEvent> l = List.copyOf(uncommitted); uncommitted.clear(); return l; }

    public static void main(String[] args) {
        StockItem item = StockItem.rehydrate(List.of());
        item.receive(10); item.reserve("o1", 4); item.reserve("o2", 5); item.ship("o1"); item.release("o2");
        List<StockEvent> history = item.pullUncommitted();                 // what we would append to the store
        StockItem rebuilt = StockItem.rehydrate(history);
        System.out.println("onHand=" + rebuilt.onHand + " reserved=" + rebuilt.reserved() + " available=" + rebuilt.available());
        try { rebuilt.reserve("o3", 7); } catch (IllegalStateException e) { System.out.println("rejected: " + e.getMessage()); }
        System.out.println("available as of event 3: " + StockItem.rehydrate(history.subList(0, 3)).available());   // 1
    }
}`,
        complexity: `<p>Load O(E) for E events (O(events since snapshot) with snapshots); commands O(R) to sum R reservations (keep a running total for O(1)).</p>`,
        followUps: ['How do two warehouse workers reserving at the same moment get serialised? (Expected-version append.)', 'Design a projection "low stock alerts" from these events.', 'How would you correct a wrong Received 100 that should have been 10? (Append a compensating StockAdjusted −90; never edit history.)']
      }
    }]
  });
  /* ======================= PRACTICE: EASY ======================= */
  practice.push({
    title: 'Email and Phone Number Value Objects', level: 'Easy', tags: ['value object', 'validation', 'primitive obsession'], companies: ['Freshworks', 'Zoho', 'Twilio'],
    statement: `<p>A CRM stores contacts as <code>Contact(String name, String email, String phone)</code>. The same email appears as <code>Asha@Mail.com</code> and <code>asha@mail.com </code>, so duplicates pile up; phones appear as <code>98450 12345</code>, <code>+91-9845012345</code> and <code>09845012345</code>. Create <code>Email</code> and <code>IndianMobile</code> value objects that <b>validate and normalise</b> in their constructors, then show that a <code>Set&lt;Email&gt;</code> deduplicates automatically.</p>`,
    constraints: `Email: one @, non-empty local part, domain with a dot. Mobile: 10 digits starting 6-9 after stripping spaces, dashes, a leading +91 or 0. Store mobile as "+91XXXXXXXXXX".`,
    example: `<p><code>new Email(" Asha@Mail.com ")</code> equals <code>new Email("asha@mail.com")</code> → ${H.c('g', 'true')}. <code>new IndianMobile("098450-12345")</code> → ${H.c('g', '+919845012345')}. <code>new IndianMobile("12345")</code> → ${H.c('r', 'IllegalArgumentException')}. A set of 4 raw emails with 2 duplicates has size ${H.c('b', '2')}.</p>`,
    brute: { why: `<p>Validation and normalisation are copy-pasted into the signup form, the import job and the API; one of them forgets <code>toLowerCase()</code>, so duplicates appear. Strings can also be swapped: <code>new Contact(name, phone, email)</code> compiles.</p>`, code: `class ContactBrute {
    String name, email, phone;
    ContactBrute(String name, String email, String phone) { this.name = name; this.email = email; this.phone = phone; }
    static boolean sameEmail(String a, String b) { return a.equalsIgnoreCase(b); }   // forgot trim(); other callers forget even this
}` },
    mcq: { q: 'Where should email normalisation (trim + lowercase) happen?', options: ['In the Email value object constructor, so every Email is normalised', 'In each service before comparing', 'In the database with a trigger', 'In the UI form'], answer: 0, explain: 'If the VO constructor normalises, no un-normalised Email can exist anywhere. Every other place gets it for free.' },
    hints: [`<p>Hint 1: Use records with compact constructors; reassign the parameter (<code>value = value.trim().toLowerCase();</code>) before validating.</p>`, `<p>Hint 2: For the phone, strip everything except digits and a leading +, then remove a +91 or 0 prefix, then check 10 digits starting 6-9.</p>`, `<p>Hint 3: Records give you <code>equals</code>/<code>hashCode</code> on the normalised value, so <code>HashSet</code> dedupes with no extra code.</p>`],
    solution: {
      approach: `<p>Two records. Each compact constructor normalises, then validates, then the record stores only the canonical form. Equality and hashing come from the record. A <code>Contact</code> record now takes <code>Email</code> and <code>IndianMobile</code>, so arguments cannot be swapped.</p>`,
      code: `record Email(String value) {
    Email {
        if (value == null) throw new IllegalArgumentException("email required");
        value = value.trim().toLowerCase();
        int at = value.indexOf('@');
        if (at <= 0 || at != value.lastIndexOf('@') || !value.substring(at + 1).contains(".") || value.endsWith("."))
            throw new IllegalArgumentException("invalid email: " + value);
    }
}
record IndianMobile(String value) {
    IndianMobile {
        if (value == null) throw new IllegalArgumentException("phone required");
        String d = value.replaceAll("[^0-9+]", "");
        if (d.startsWith("+91")) d = d.substring(3); else if (d.startsWith("0")) d = d.substring(1);
        if (!d.matches("[6-9][0-9]{9}")) throw new IllegalArgumentException("invalid mobile: " + value);
        value = "+91" + d;
    }
}
record Contact(String name, Email email, IndianMobile phone) {}

class ContactDemo {
    public static void main(String[] args) {
        Set<Email> emails = new HashSet<>();
        for (String raw : List.of(" Asha@Mail.com ", "asha@mail.com", "ravi@x.in", "RAVI@X.IN")) emails.add(new Email(raw));
        System.out.println(emails.size() + " " + emails);                         // 2
        System.out.println(new IndianMobile("098450-12345").value());             // +919845012345
        System.out.println(new IndianMobile("+91 98450 12345").equals(new IndianMobile("9845012345")));  // true
        try { new IndianMobile("12345"); } catch (IllegalArgumentException e) { System.out.println(e.getMessage()); }
        System.out.println(new Contact("Asha", new Email("a@b.co"), new IndianMobile("9845012345")));
    }
}`,
      complexity: `<p>O(length of input) per construction. Duplicates handled by hashing in O(1) average.</p>`,
      followUps: ['How would you support international numbers (libphonenumber behind a port)?', 'Should Email know about disposable-domain blocklists, or is that a separate policy?', 'How would you store these VOs in a database column?']
    }
  });

  practice.push({
    title: 'Inject the Dependencies of a Daily Report Mailer', level: 'Easy', tags: ['dependency injection', 'testing', 'clock'], companies: ['Microsoft', 'Salesforce', 'Infosys'],
    statement: `<p><code>DailyReportJob.run()</code> creates <code>new SalesDao()</code>, <code>new SmtpClient()</code> and calls <code>LocalDate.now()</code>. It emails yesterday's total sales to the manager, but on Sundays it skips sending. Refactor to <b>constructor injection</b> with interfaces and an injected <code>Clock</code>, and write a "test" in <code>main</code> using fakes proving: (1) Monday sends one mail with Sunday's total, (2) Sunday sends nothing.</p>`,
    constraints: `No frameworks or mocking libraries. Tests must not depend on today's real date.`,
    example: `<p>Clock fixed at Monday 2026-03-02 → sales for 2026-03-01 = ₹12,500 → mail "Sales 2026-03-01: 12500" ${H.c('g', 'sent')}. Clock fixed at Sunday 2026-03-01 → ${H.c('m', 'no mail')}.</p>`,
    brute: { why: `<p>Three hidden dependencies: the DB, SMTP and the system clock. Testing the Sunday rule requires running the test on a Sunday against a real database and mail server.</p>`, code: `class DailyReportJobBrute {
    void run() {
        LocalDate today = LocalDate.now();                       // hidden dependency
        if (today.getDayOfWeek() == DayOfWeek.SUNDAY) return;
        long total = 12_500;                                     // pretend: new SalesDao().totalFor(today.minusDays(1))
        System.out.println("SMTP: Sales " + today.minusDays(1) + ": " + total);   // pretend: new SmtpClient().send(...)
    }
}` },
    mcq: { q: 'What is the simplest way to make the Sunday rule testable?', options: ['Inject java.time.Clock and use LocalDate.now(clock)', 'Add a boolean parameter isSunday to run()', 'Use a static mutable "today" field', 'Mock LocalDate.now() with bytecode tricks'], answer: 0, explain: 'Clock is the JDK\'s built-in seam for time. Production passes Clock.systemDefaultZone(); tests pass Clock.fixed(...).' },
    hints: [`<p>Hint 1: Interfaces: <code>SalesQuery { long totalFor(LocalDate d); }</code>, <code>Mailer { void send(String to, String body); }</code>.</p>`, `<p>Hint 2: Both are single-method interfaces, so fakes can be lambdas.</p>`, `<p>Hint 3: Collect sent mails in a <code>List&lt;String&gt;</code> inside the fake mailer and assert on its size and content.</p>`],
    solution: {
      approach: `<p>Introduce two ports and inject them plus a <code>Clock</code>. The job contains only the business rule. Tests build the job with lambdas and fixed clocks — two compositions, one class.</p>`,
      code: `interface SalesQuery { long totalFor(LocalDate day); }
interface Mailer { void send(String to, String body); }

class DailyReportJob {
    private final SalesQuery sales; private final Mailer mailer; private final Clock clock; private final String manager;
    DailyReportJob(SalesQuery sales, Mailer mailer, Clock clock, String manager) {
        this.sales = sales; this.mailer = mailer; this.clock = clock; this.manager = manager;
    }
    void run() {
        LocalDate today = LocalDate.now(clock);
        if (today.getDayOfWeek() == DayOfWeek.SUNDAY) return;
        LocalDate yesterday = today.minusDays(1);
        mailer.send(manager, "Sales " + yesterday + ": " + sales.totalFor(yesterday));
    }

    static Clock at(String date) { return Clock.fixed(Instant.parse(date + "T06:00:00Z"), ZoneOffset.UTC); }

    public static void main(String[] args) {
        List<String> outbox = new ArrayList<>();
        SalesQuery fakeSales = day -> day.equals(LocalDate.of(2026, 3, 1)) ? 12_500 : 0;
        Mailer fakeMailer = (to, body) -> outbox.add(to + " | " + body);

        new DailyReportJob(fakeSales, fakeMailer, at("2026-03-02"), "boss@shop.in").run();   // Monday
        System.out.println(outbox.size() == 1 && outbox.get(0).endsWith("2026-03-01: 12500") ? "Monday test PASSED" : "FAILED " + outbox);

        outbox.clear();
        new DailyReportJob(fakeSales, fakeMailer, at("2026-03-01"), "boss@shop.in").run();   // Sunday
        System.out.println(outbox.isEmpty() ? "Sunday test PASSED" : "FAILED " + outbox);
    }
}`,
      complexity: `<p>O(1). Tests run in microseconds with no I/O.</p>`,
      followUps: ['What timezone should the Clock use for "yesterday" in a multi-country business?', 'How would you add retries to Mailer without changing DailyReportJob? (Decorator implementing Mailer.)', 'Where is the composition root for a scheduled job?']
    }
  });

  practice.push({
    title: 'Rebuild a Shopping Cart from Its Events', level: 'Easy', tags: ['event sourcing', 'replay', 'fold'], companies: ['Amazon', 'Myntra', 'Shopify'],
    statement: `<p>You receive the event stream of one cart: <code>ItemAdded(sku, qty, unitPrice)</code>, <code>QuantityChanged(sku, qty)</code>, <code>ItemRemoved(sku)</code>, <code>CouponApplied(percent)</code>, <code>CheckedOut</code>. Write <code>replay(events)</code> that returns the current cart (items with quantities, total after coupon, checked-out flag), and <code>stateAt(events, k)</code> for the cart after the first k events.</p>`,
    constraints: `Up to 10<sup>5</sup> events. Prices in paise. Coupon percent applies to the total at the end (latest coupon wins). Events are facts: apply never throws.`,
    example: `<p>Events: +tea 2 @12000, +mug 1 @25000, qty tea→3, coupon 10%, −mug → items {tea: 3}, subtotal 36000, total ${H.c('g', '32400')}. <code>stateAt(k=2)</code> → {tea 2, mug 1}, total 49000.</p>`,
    brute: { why: `<p>Storing only the latest cart row loses the story; and writing replay with validation inside (e.g. "throw if qty changed for a missing sku") makes some historical streams impossible to load.</p>`, code: `class CartRowBrute {
    final Map<String, Integer> items = new HashMap<>();
    void changeQty(String sku, int q) {
        if (!items.containsKey(sku)) throw new IllegalStateException("unknown sku");   // validation inside replay: old streams may fail to load
        items.put(sku, q);
    }
}` },
    mcq: { q: 'During replay you find QuantityChanged for a sku that is not in the cart (an old bug wrote it). Best behaviour?', options: ['Apply defensively (ignore or treat as add) — never throw during replay; fix future writes in decide', 'Throw and refuse to load the cart', 'Delete the event from the store', 'Skip the whole stream'], answer: 0, explain: 'Replay must be total. Historical oddities are handled leniently in apply; correctness rules are enforced when new commands are decided.' },
    hints: [`<p>Hint 1: Use a sealed interface of records and a <code>switch</code> with pattern matching in <code>apply</code>.</p>`, `<p>Hint 2: Keep items in a <code>LinkedHashMap&lt;String, Line&gt;</code> so output order is stable.</p>`, `<p>Hint 3: <code>stateAt(k)</code> is just <code>replay(events.subList(0, k))</code>.</p>`],
    solution: {
      approach: `<p>A mutable <code>Cart</code> state with an <code>apply(event)</code> switch; <code>replay</code> folds the list. Unknown skus in <code>QuantityChanged</code> are ignored rather than thrown. Total = sum(qty × price) × (100 − coupon) / 100 with integer rounding.</p>`,
      code: `sealed interface CartEvent permits ItemAdded, QuantityChanged, ItemRemoved, CouponApplied, CheckedOut {}
record ItemAdded(String sku, int qty, long unitPrice) implements CartEvent {}
record QuantityChanged(String sku, int qty) implements CartEvent {}
record ItemRemoved(String sku) implements CartEvent {}
record CouponApplied(int percent) implements CartEvent {}
record CheckedOut() implements CartEvent {}

class Cart {
    record Line(int qty, long unitPrice) {}
    final Map<String, Line> items = new LinkedHashMap<>();
    int coupon; boolean checkedOut;

    void apply(CartEvent e) {
        switch (e) {
            case ItemAdded a -> items.merge(a.sku(), new Line(a.qty(), a.unitPrice()), (o, n) -> new Line(o.qty() + n.qty(), n.unitPrice()));
            case QuantityChanged q -> items.computeIfPresent(q.sku(), (k, l) -> new Line(q.qty(), l.unitPrice()));   // lenient: ignore unknown sku
            case ItemRemoved r -> items.remove(r.sku());
            case CouponApplied c -> coupon = c.percent();
            case CheckedOut c -> checkedOut = true;
        }
    }
    long subtotal() { return items.values().stream().mapToLong(l -> l.qty() * l.unitPrice()).sum(); }
    long total() { return subtotal() * (100 - coupon) / 100; }

    static Cart replay(List<CartEvent> events) { Cart c = new Cart(); events.forEach(c::apply); return c; }
    static Cart stateAt(List<CartEvent> events, int k) { return replay(events.subList(0, Math.min(k, events.size()))); }

    public static void main(String[] args) {
        List<CartEvent> log = List.of(new ItemAdded("tea", 2, 12_000), new ItemAdded("mug", 1, 25_000),
            new QuantityChanged("tea", 3), new CouponApplied(10), new ItemRemoved("mug"), new QuantityChanged("ghost", 9));
        Cart now = replay(log);
        System.out.println(now.items + " subtotal=" + now.subtotal() + " total=" + now.total() + " checkedOut=" + now.checkedOut);
        Cart early = stateAt(log, 2);
        System.out.println(early.items + " total=" + early.total());
    }
}`,
      complexity: `<p>O(E) for E events, O(distinct skus) memory. Snapshots make repeated loads O(events since snapshot).</p>`,
      followUps: ['How would a projection compute "most-removed products" across all carts?', 'What if the unit price changes between two ItemAdded events for the same sku?', 'Where do the rules "max 10 per sku" and "no edits after checkout" go?']
    }
  });

  /* ======================= PRACTICE: MEDIUM ======================= */
  practice.push({
    title: 'Library System: Find the Aggregate Boundaries', level: 'Medium', tags: ['aggregate', 'boundary', 'reference by id'], companies: ['Amazon', 'Oracle', 'ThoughtWorks'],
    statement: `<p>Library rules: (1) a member can hold at most 5 loans at once; (2) a <b>copy</b> (physical book) can be lent to only one member at a time; (3) a member with unpaid fines ≥ ₹100 cannot borrow; (4) a <b>title</b> (ISBN) can have many copies; catalog data (author, summary) is edited by librarians. Decide the aggregates, what each holds, how they reference each other, and implement <code>borrow(memberId, copyId)</code> so that both invariants (1)–(3) and (2) hold. Explain which rule is checked in which aggregate.</p>`,
    constraints: `100k members, 1M copies. Two librarians may lend at the same moment. One aggregate per transaction is preferred; explain any exception.`,
    example: `<p>Aggregates: ${H.chips(['Member (loanCount, fines)', 'Copy (status, borrower id)', 'Title (catalog data)'], { label: 'three small aggregates' })} Asha with 5 loans borrows copy c9 → ${H.c('r', 'rejected by Member')}. Ravi borrows c9 already lent → ${H.c('r', 'rejected by Copy')}.</p>`,
    brute: { why: `<p>One giant <code>Library</code> object holding all members, titles and copies. Every borrow locks the whole library (no concurrency), loading it means loading millions of objects, and catalog edits conflict with lending.</p>`, code: `class LibraryBrute {
    final Map<String, List<String>> loansByMember = new HashMap<>();   // everything in one object
    final Map<String, String> copyHolder = new HashMap<>();
    synchronized void borrow(String member, String copy) {              // one lock for the entire library
        if (copyHolder.containsKey(copy)) throw new IllegalStateException("copy taken");
        loansByMember.computeIfAbsent(member, k -> new ArrayList<>()).add(copy);
        copyHolder.put(copy, member);
    }
}` },
    mcq: { q: 'Rule (2) "one borrower per copy" must be instant. Which aggregate owns it?', options: ['Copy — status and borrower id live there; concurrent lends of the same copy conflict on its version', 'Member', 'Title', 'A global Library aggregate'], answer: 0, explain: 'The invariant needs only the copy\'s own state, so a small Copy aggregate enforces it and optimistic locking on that copy serialises racing lends.' },
    hints: [`<p>Hint 1: List each rule and the data it needs: loans count + fines → Member; copy status → Copy; catalog → Title.</p>`, `<p>Hint 2: <code>borrow</code> touches Member and Copy. Options: (a) modify both in one transaction (pragmatic, documented exception), or (b) Copy first, then a <code>CopyLent</code> event updates Member, with a compensating return if Member rejects.</p>`, `<p>Hint 3: Reference by ID: <code>Copy.borrower</code> is a <code>MemberId</code>, <code>Copy.title</code> is an ISBN; Member keeps a set of <code>CopyId</code>s (bounded by 5).</p>`],
    solution: {
      approach: `<p>Three aggregates: <b>Member</b> (active loan copy IDs ≤ 5, fines), <b>Copy</b> (AVAILABLE/LENT, borrower MemberId, ISBN), <b>Title</b> (catalog). Borrowing checks Member rules via <code>member.canBorrow()</code> + <code>member.recordLoan</code>, and Copy rules via <code>copy.lendTo</code>. Here both are saved in one unit of work (an explicit, small exception justified because both are tiny and the rule must be instant); the eventual alternative is described in follow-ups. Versions on both aggregates prevent double lending under concurrency.</p>`,
      code: `record MemberId(String v) {} record CopyId(String v) {} record Isbn(String v) {}

final class Member {
    static final int MAX = 5; static final long FINE_BLOCK = 10_000;
    final MemberId id; private final Set<CopyId> loans = new LinkedHashSet<>(); private long finesPaise; long version;
    Member(MemberId id, long fines) { this.id = id; this.finesPaise = fines; }
    void recordLoan(CopyId c) {
        if (finesPaise >= FINE_BLOCK) throw new IllegalStateException("unpaid fines");
        if (loans.size() >= MAX) throw new IllegalStateException("loan limit " + MAX);
        loans.add(c);
    }
    void recordReturn(CopyId c) { loans.remove(c); }
    int loanCount() { return loans.size(); }
}
final class Copy {
    enum Status { AVAILABLE, LENT }
    final CopyId id; final Isbn title; private Status status = Status.AVAILABLE; private MemberId borrower; long version;
    Copy(CopyId id, Isbn title) { this.id = id; this.title = title; }
    void lendTo(MemberId m) { if (status == Status.LENT) throw new IllegalStateException("copy already lent"); status = Status.LENT; borrower = m; }
    void giveBack() { status = Status.AVAILABLE; borrower = null; }
    Optional<MemberId> borrower() { return Optional.ofNullable(borrower); }
}

class LendingService {
    final Map<MemberId, Member> members = new HashMap<>(); final Map<CopyId, Copy> copies = new HashMap<>();
    String borrow(MemberId m, CopyId c) {
        Member member = members.get(m); Copy copy = copies.get(c);
        try {
            copy.lendTo(m);                       // Copy invariant: one borrower
            try { member.recordLoan(c); }         // Member invariants: limit + fines
            catch (IllegalStateException e) { copy.giveBack(); throw e; }   // keep both consistent (one unit of work)
            copy.version++; member.version++;     // save both
            return "OK " + m.v() + " <- " + c.v();
        } catch (IllegalStateException e) { return "REJECTED " + m.v() + " " + c.v() + ": " + e.getMessage(); }
    }
    public static void main(String[] args) {
        LendingService s = new LendingService();
        MemberId asha = new MemberId("asha"), ravi = new MemberId("ravi"), dev = new MemberId("dev");
        s.members.put(asha, new Member(asha, 0)); s.members.put(ravi, new Member(ravi, 0)); s.members.put(dev, new Member(dev, 15_000));
        for (int i = 1; i <= 7; i++) { CopyId c = new CopyId("c" + i); s.copies.put(c, new Copy(c, new Isbn("978-1"))); }
        for (int i = 1; i <= 6; i++) System.out.println(s.borrow(asha, new CopyId("c" + i)));   // 6th rejected
        System.out.println(s.borrow(ravi, new CopyId("c1")));   // copy already lent
        System.out.println(s.borrow(dev, new CopyId("c7")));    // fines
        System.out.println("c6 still available? " + s.copies.get(new CopyId("c6")).borrower().isEmpty());
    }
}`,
      complexity: `<p>O(1) per borrow; each aggregate is tiny (Member ≤ 5 loan IDs). Contention only when two people want the same copy or the same member acts twice concurrently.</p>`,
      followUps: ['Rewrite borrow with eventual consistency: Copy lent → CopyLent event → Member.recordLoan, with CopyReturnForced as compensation.', 'Where do reservations (waitlist per title) live?', 'Why should Title not hold a list of all its Copy objects?']
    }
  });

  practice.push({
    title: 'Payment Methods as Plugins with Capability Selection', level: 'Medium', tags: ['plugin', 'registry', 'open closed'], companies: ['Razorpay', 'Stripe', 'Adyen'],
    statement: `<p>Checkout must show the payment methods that support the buyer's <b>country</b>, <b>currency</b> and <b>amount</b>, sorted by a plugin-provided priority. Plugins: UPI (IN, INR, ≤ ₹1,00,000), Card (any country, INR/USD), PayPal (US/GB, USD/GBP), BNPL (IN, INR, ₹1,000–₹50,000). Requirements: adding a method never edits checkout code; a plugin whose <code>supports</code> throws is skipped and logged; a disabled plugin (by config) never appears; <code>pay(methodId, …)</code> routes to the plugin.</p>`,
    constraints: `Up to 50 plugins; selection per checkout must be fast. Plugins are third-party code: do not trust them not to throw.`,
    example: `<p>Buyer IN, INR, ₹2,000 → ${H.chips(['UPI (p1)', 'BNPL (p2)', 'Card (p3)'])}. Buyer US, USD, $50 → ${H.chips(['PayPal', 'Card'])}. Config disables BNPL → it disappears without code changes.</p>`,
    brute: { why: `<p><code>CheckoutService.methodsFor()</code> is a chain of if/else per method, with country and amount rules for every provider inline. Every new provider or rule change edits and redeploys checkout; a bug in one branch hides all methods.</p>`, code: `class CheckoutBrute {
    List<String> methodsFor(String country, String cur, long amount) {
        List<String> out = new ArrayList<>();
        if (country.equals("IN") && cur.equals("INR") && amount <= 10_000_000) out.add("UPI");
        if (cur.equals("INR") || cur.equals("USD")) out.add("CARD");
        if ((country.equals("US") || country.equals("GB")) && !cur.equals("INR")) out.add("PAYPAL");
        // a new provider = another if here, in the core checkout code
        return out;
    }
}` },
    mcq: { q: 'A plugin\'s supports() throws NullPointerException for some country. What should the registry do?', options: ['Catch it, log with the plugin id, treat as "not supported" and continue', 'Let the checkout page fail', 'Remove all plugins', 'Retry forever'], answer: 0, explain: 'Plugin failures are isolated at the boundary; the core degrades gracefully.' },
    hints: [`<p>Hint 1: Extension point: <code>id()</code>, <code>priority()</code>, <code>supports(PaymentContext)</code>, <code>pay(...)</code>.</p>`, `<p>Hint 2: <code>PaymentContext</code> is a record (country, currency, amountMinor) — a value object handed to plugins, so they cannot mutate core state.</p>`, `<p>Hint 3: <code>available(ctx)</code> = filter enabled → safe supports → sort by priority then id.</p>`],
    solution: {
      approach: `<p>The core defines <code>PaymentPlugin</code> and an immutable <code>PaymentContext</code>. A <code>PaymentRegistry</code> holds plugins by id, filters by config and capability with a guarded call, sorts by priority, and routes <code>pay</code> by id. Each provider is one class; config is a plain set of disabled ids.</p>`,
      code: `record PaymentContext(String country, String currency, long amountMinor) {}

interface PaymentPlugin {
    String id(); int priority();
    boolean supports(PaymentContext ctx);
    String pay(PaymentContext ctx, String ref);
}

class PaymentRegistry {
    private final Map<String, PaymentPlugin> plugins = new LinkedHashMap<>();
    private final Set<String> disabled;
    final List<String> log = new ArrayList<>();
    PaymentRegistry(Set<String> disabled) { this.disabled = disabled; }
    void register(PaymentPlugin p) { if (plugins.putIfAbsent(p.id(), p) != null) throw new IllegalArgumentException("duplicate " + p.id()); }

    List<String> available(PaymentContext ctx) {
        return plugins.values().stream()
            .filter(p -> !disabled.contains(p.id()))
            .filter(p -> safeSupports(p, ctx))
            .sorted(Comparator.comparingInt(PaymentPlugin::priority).thenComparing(PaymentPlugin::id))
            .map(PaymentPlugin::id).toList();
    }
    private boolean safeSupports(PaymentPlugin p, PaymentContext ctx) {
        try { return p.supports(ctx); } catch (RuntimeException e) { log.add(p.id() + " supports() failed: " + e); return false; }
    }
    String pay(String id, PaymentContext ctx, String ref) {
        if (!available(ctx).contains(id)) throw new IllegalArgumentException(id + " not available for " + ctx);
        return plugins.get(id).pay(ctx, ref);
    }
}

class Upi implements PaymentPlugin {
    public String id() { return "upi"; } public int priority() { return 1; }
    public boolean supports(PaymentContext c) { return c.country().equals("IN") && c.currency().equals("INR") && c.amountMinor() <= 10_000_000; }
    public String pay(PaymentContext c, String ref) { return "UPI collect request for " + ref; }
}
class Card implements PaymentPlugin {
    public String id() { return "card"; } public int priority() { return 3; }
    public boolean supports(PaymentContext c) { return Set.of("INR", "USD").contains(c.currency()); }
    public String pay(PaymentContext c, String ref) { return "card auth for " + ref; }
}
class PayPal implements PaymentPlugin {
    public String id() { return "paypal"; } public int priority() { return 2; }
    public boolean supports(PaymentContext c) { return Set.of("US", "GB").contains(c.country()) && Set.of("USD", "GBP").contains(c.currency()); }
    public String pay(PaymentContext c, String ref) { return "paypal redirect for " + ref; }
}
class Bnpl implements PaymentPlugin {
    public String id() { return "bnpl"; } public int priority() { return 2; }
    public boolean supports(PaymentContext c) { return c.country().equals("IN") && c.amountMinor() >= 100_000 && c.amountMinor() <= 5_000_000; }
    public String pay(PaymentContext c, String ref) { return "bnpl plan for " + ref; }
}
class Flaky implements PaymentPlugin {
    public String id() { return "flaky"; } public int priority() { return 0; }
    public boolean supports(PaymentContext c) { throw new NullPointerException("region table not loaded"); }
    public String pay(PaymentContext c, String ref) { return "never"; }
}

class PaymentDemo {
    public static void main(String[] args) {
        PaymentRegistry reg = new PaymentRegistry(Set.of());
        List.of(new Upi(), new Card(), new PayPal(), new Bnpl(), new Flaky()).forEach(reg::register);
        PaymentContext in = new PaymentContext("IN", "INR", 200_000);
        System.out.println(reg.available(in));                                         // [upi, bnpl, card]
        System.out.println(reg.available(new PaymentContext("US", "USD", 5_000)));    // [paypal, card]
        System.out.println(reg.pay("upi", in, "order-17"));
        PaymentRegistry noBnpl = new PaymentRegistry(Set.of("bnpl"));
        List.of(new Upi(), new Card(), new Bnpl()).forEach(noBnpl::register);
        System.out.println(noBnpl.available(in) + " " + reg.log);
    }
}`,
      complexity: `<p>O(P log P) per checkout for P plugins (tiny). Adding a method: one class + one registration (or a ServiceLoader entry).</p>`,
      followUps: ['How would you A/B test the ordering of payment methods without touching plugins?', 'How do you time-box a slow supports() call?', 'How would plugins declare required config (API keys) and fail startup cleanly if missing?']
    }
  });

  practice.push({
    title: 'Hotel Booking: Model the Domain with a No-Overlap Invariant', level: 'Medium', tags: ['aggregate', 'value object', 'repository', 'invariants'], companies: ['Booking.com', 'OYO', 'Airbnb', 'MakeMyTrip'],
    statement: `<p>Model hotel room booking. A <b>room</b> cannot have two confirmed bookings with overlapping dates (checkout day may equal the next check-in day). Bookings can be cancelled (frees the dates). Price = nightly rate × nights, with weekend nights (Fri, Sat) at +20%. Identify entities, value objects and the aggregate that owns the no-overlap rule; implement it with a repository port and in-memory adapter with optimistic locking.</p>`,
    constraints: `Thousands of bookings per room per year. Two guests may try to book the same room for overlapping dates at the same time.`,
    example: `<p>Room 101: booked 1–4 May (${H.c('g', 'ok')}), 4–6 May (${H.c('g', 'ok, checkout = check-in')}), 3–5 May (${H.c('r', 'overlap')}). Cancel 1–4 May, then 3–5 May overlaps 4–6 May → still ${H.c('r', 'rejected')}. Price for Thu–Sun (3 nights: Thu, Fri, Sat) at ₹3,000 = 3000 + 3600 + 3600 = ${H.c('b', '₹10,200')}.</p>`,
    brute: { why: `<p><code>BookingService</code> queries "any overlapping booking?" then inserts a new <code>Booking</code> row. Two concurrent requests both see "no overlap" and both insert: double booking. Dates are strings, so <code>end &lt; start</code> slips through, and price logic lives in the controller.</p>`, code: `class BookingServiceBrute {
    final List<String[]> rows = new ArrayList<>();          // {room, start, end} as strings
    void book(String room, String start, String end) {
        boolean clash = rows.stream().anyMatch(r -> r[0].equals(room) && r[1].compareTo(end) < 0 && start.compareTo(r[2]) < 0);
        // race window: another request can insert here
        if (!clash) rows.add(new String[]{room, start, end});
    }
}` },
    mcq: { q: 'Which aggregate best enforces "no overlapping bookings for a room"?', options: ['RoomCalendar (per room): holds that room\'s confirmed date ranges and a version', 'Booking (each booking is independent)', 'Hotel (all rooms and all bookings)', 'Guest'], answer: 0, explain: 'The invariant needs all bookings of one room together, instantly. A per-room calendar is the smallest boundary that contains that data; its version serialises concurrent bookings for the same room only.' },
    hints: [`<p>Hint 1: Value objects: <code>DateRange</code> (half-open [start, end)), <code>Money</code>/<code>long paise</code>, <code>RoomNo</code>. Entity inside the aggregate: <code>Reservation</code> with id and status.</p>`, `<p>Hint 2: <code>RoomCalendar.reserve(range, guest)</code> checks overlap against CONFIRMED reservations only.</p>`, `<p>Hint 3: To keep the aggregate small, keep only future reservations (archive past ones). Pricing is a pure function over the DateRange.</p>`],
    solution: {
      approach: `<p><code>DateRange</code> VO owns overlap and night iteration. <code>RoomCalendar</code> aggregate (root) holds reservations for one room and enforces no-overlap; cancel marks a reservation CANCELLED. <code>Pricing</code> is a pure function. The repository stores per-room snapshots with a version and rejects stale saves; the service retries on conflict.</p>`,
      code: `record DateRange(LocalDate start, LocalDate end) {                 // [start, end)
    DateRange { if (!start.isBefore(end)) throw new IllegalArgumentException("start < end required"); }
    boolean overlaps(DateRange o) { return start.isBefore(o.end) && o.start.isBefore(end); }
    List<LocalDate> nights() { return start.datesUntil(end).toList(); }
}

final class Pricing {
    static long price(DateRange r, long nightly) {
        long total = 0;
        for (LocalDate d : r.nights()) {
            boolean weekend = d.getDayOfWeek() == DayOfWeek.FRIDAY || d.getDayOfWeek() == DayOfWeek.SATURDAY;
            total += weekend ? nightly * 120 / 100 : nightly;
        }
        return total;
    }
}

final class RoomCalendar {                                         // aggregate root, one per room
    enum Status { CONFIRMED, CANCELLED }
    static final class Reservation { final String id, guest; final DateRange range; Status status = Status.CONFIRMED;
        Reservation(String id, String guest, DateRange r) { this.id = id; this.guest = guest; this.range = r; } }
    final String room; long version; private final Map<String, Reservation> reservations = new LinkedHashMap<>();
    RoomCalendar(String room) { this.room = room; }

    String reserve(String id, String guest, DateRange r) {
        for (Reservation x : reservations.values())
            if (x.status == Status.CONFIRMED && x.range.overlaps(r)) throw new IllegalStateException(room + " busy " + x.range.start() + ".." + x.range.end());
        reservations.put(id, new Reservation(id, guest, r));
        return id;
    }
    void cancel(String id) {
        Reservation x = reservations.get(id);
        if (x == null || x.status == Status.CANCELLED) throw new IllegalStateException("nothing to cancel");
        x.status = Status.CANCELLED;
    }
    RoomCalendar copy() { RoomCalendar c = new RoomCalendar(room); c.version = version;
        reservations.forEach((k, v) -> { Reservation n = new Reservation(v.id, v.guest, v.range); n.status = v.status; c.reservations.put(k, n); }); return c; }
}

interface RoomCalendarRepository { RoomCalendar load(String room); void save(RoomCalendar c); }
class InMemoryCalendars implements RoomCalendarRepository {
    private final Map<String, RoomCalendar> db = new HashMap<>();
    public synchronized RoomCalendar load(String room) { return db.computeIfAbsent(room, RoomCalendar::new).copy(); }
    public synchronized void save(RoomCalendar c) {
        RoomCalendar cur = db.get(c.room);
        if (cur != null && cur.version != c.version) throw new IllegalStateException("conflict on " + c.room);
        RoomCalendar s = c.copy(); s.version++; db.put(c.room, s);
    }
}

class BookingDemo {
    static final LocalDate MAY = LocalDate.of(2026, 5, 1);
    static String book(RoomCalendarRepository repo, String room, String id, int from, int to) {
        RoomCalendar cal = repo.load(room);
        try { cal.reserve(id, "guest-" + id, new DateRange(MAY.plusDays(from - 1), MAY.plusDays(to - 1))); repo.save(cal); return id + " ok"; }
        catch (IllegalStateException e) { return id + " rejected: " + e.getMessage(); }
    }
    public static void main(String[] args) {
        RoomCalendarRepository repo = new InMemoryCalendars();
        System.out.println(book(repo, "101", "b1", 1, 4) + " | " + book(repo, "101", "b2", 4, 6) + " | " + book(repo, "101", "b3", 3, 5));
        RoomCalendar cal = repo.load("101"); cal.cancel("b1"); repo.save(cal);
        System.out.println(book(repo, "101", "b4", 3, 5));                          // still overlaps b2
        RoomCalendar x = repo.load("101"), y = repo.load("101");                     // race for 10..12
        x.reserve("r1", "a", new DateRange(MAY.plusDays(9), MAY.plusDays(11))); repo.save(x);
        y.reserve("r2", "b", new DateRange(MAY.plusDays(9), MAY.plusDays(11)));
        try { repo.save(y); } catch (IllegalStateException e) { System.out.println("second guest: " + e.getMessage()); }
        System.out.println("Thu-Sun price: " + Pricing.price(new DateRange(LocalDate.of(2026, 5, 7), LocalDate.of(2026, 5, 10)), 3000));
    }
}`,
      complexity: `<p>O(R) overlap check for R future reservations of one room (use a <code>TreeMap</code> keyed by start date for O(log R)). Contention is per room, not per hotel.</p>`,
      followUps: ['How would "hold for 10 minutes during payment" fit (a HELD status with expiry)?', 'If a room type (not a specific room) is booked, where does the invariant move?', 'How do you price with dynamic rates without putting the rate engine inside the aggregate?']
    }
  });

  practice.push({
    title: 'Expense Approvals as a Hexagon with Two Driving Adapters', level: 'Medium', tags: ['hexagonal', 'ports', 'use case'], companies: ['SAP', 'Zoho', 'Expensify'],
    statement: `<p>Employees submit expenses; managers approve or reject. Rules: amount &gt; 0; expenses above ₹50,000 need a second approval from finance; an expense unapproved after 7 days is auto-escalated. Build the core with ports and two <b>driving adapters</b>: a command-line adapter (submit/approve) and a <b>scheduler adapter</b> that triggers escalation. Outbound ports: repository, notifier, clock. Show both adapters calling the same core.</p>`,
    constraints: `No frameworks. Use cases must be testable with in-memory adapters. Escalation must be idempotent (running the job twice does not notify twice).`,
    example: `<p>Submit ₹80,000 (day 0) → manager approves → status ${H.c('y', 'NEEDS_FINANCE')}. Submit ₹2,000 (day 0) → no action → scheduler on day 8 → ${H.c('r', 'ESCALATED')}, one notification; scheduler again → no new notification.</p>`,
    brute: { why: `<p>An <code>ExpenseController</code> handles HTTP, the approval rules, SQL and email; the nightly cron is a separate script that copy-pastes the rules with raw SQL. The two drift apart; testing escalation means waiting a week or editing DB timestamps.</p>`, code: `class ExpenseControllerBrute {
    final Map<String, String> status = new HashMap<>();
    void approve(String id, long amount) {
        status.put(id, amount > 5_000_000 ? "NEEDS_FINANCE" : "APPROVED");   // rule copy #1
        System.out.println("SMTP: approved " + id);
    }
}
// escalate.sh: UPDATE expenses SET status='ESCALATED' WHERE created < now() - 7  -- rule copy #2, no notification dedupe` },
    mcq: { q: 'The nightly scheduler is which kind of adapter?', options: ['A driving (inbound) adapter: it calls an inbound port such as EscalateOverdueUseCase', 'A driven adapter implementing a repository', 'Part of the domain', 'Not an adapter; it should contain the escalation rules'], answer: 0, explain: 'Anything that triggers the application — HTTP, CLI, cron, a message — is a driving adapter. It contains no rules; it just calls the use case.' },
    hints: [`<p>Hint 1: Domain: <code>Expense</code> with status machine SUBMITTED → APPROVED | NEEDS_FINANCE → APPROVED, REJECTED, ESCALATED; method <code>escalateIfOverdue(now)</code> returns whether it changed.</p>`, `<p>Hint 2: Inbound ports: <code>SubmitExpense</code>, <code>ApproveExpense</code>, <code>EscalateOverdue</code>. Outbound: <code>ExpenseRepository</code>, <code>Notifier</code>, <code>Clock</code>.</p>`, `<p>Hint 3: Idempotency for free: <code>escalateIfOverdue</code> returns false when already escalated, and only a true result triggers notification.</p>`],
    solution: {
      approach: `<p>The <code>Expense</code> entity owns all state transitions. One application service implements three inbound ports. The CLI adapter parses text commands; the scheduler adapter simply calls <code>escalateOverdue()</code>. Both run against the same service, wired in the composition root with in-memory repository, a recording notifier and a mutable test clock.</p>`,
      code: `enum ExpenseStatus { SUBMITTED, NEEDS_FINANCE, APPROVED, REJECTED, ESCALATED }

class Expense {
    static final long FINANCE_LIMIT = 5_000_000;
    final String id, employee; final long amount; final Instant submittedAt; ExpenseStatus status = ExpenseStatus.SUBMITTED;
    Expense(String id, String employee, long amount, Instant at) {
        if (amount <= 0) throw new IllegalArgumentException("amount > 0");
        this.id = id; this.employee = employee; this.amount = amount; this.submittedAt = at;
    }
    void approveByManager() { require(ExpenseStatus.SUBMITTED, ExpenseStatus.ESCALATED); status = amount > FINANCE_LIMIT ? ExpenseStatus.NEEDS_FINANCE : ExpenseStatus.APPROVED; }
    void approveByFinance() { require(ExpenseStatus.NEEDS_FINANCE); status = ExpenseStatus.APPROVED; }
    boolean escalateIfOverdue(Instant now) {
        if (status != ExpenseStatus.SUBMITTED || now.isBefore(submittedAt.plus(Duration.ofDays(7)))) return false;
        status = ExpenseStatus.ESCALATED; return true;
    }
    private void require(ExpenseStatus... ok) { if (!Arrays.asList(ok).contains(status)) throw new IllegalStateException(id + " is " + status); }
}

interface SubmitExpense { String submit(String employee, long amount); }            // inbound ports
interface ApproveExpense { ExpenseStatus approve(String id, String role); }
interface EscalateOverdue { int escalateOverdue(); }
interface ExpenseRepository { void save(Expense e); Expense get(String id); List<Expense> all(); }  // outbound
interface Notifier { void notify(String msg); }

class ExpenseService implements SubmitExpense, ApproveExpense, EscalateOverdue {
    private final ExpenseRepository repo; private final Notifier notifier; private final Clock clock; private int seq;
    ExpenseService(ExpenseRepository r, Notifier n, Clock c) { repo = r; notifier = n; clock = c; }
    public String submit(String emp, long amount) { Expense e = new Expense("x" + (++seq), emp, amount, clock.instant()); repo.save(e); return e.id; }
    public ExpenseStatus approve(String id, String role) {
        Expense e = repo.get(id);
        if (role.equals("finance")) e.approveByFinance(); else e.approveByManager();
        repo.save(e); return e.status;
    }
    public int escalateOverdue() {
        int n = 0;
        for (Expense e : repo.all()) if (e.escalateIfOverdue(clock.instant())) { repo.save(e); notifier.notify("escalated " + e.id); n++; }
        return n;
    }
}

class InMemoryExpenses implements ExpenseRepository {
    private final Map<String, Expense> m = new LinkedHashMap<>();
    public void save(Expense e) { m.put(e.id, e); } public Expense get(String id) { return m.get(id); } public List<Expense> all() { return List.copyOf(m.values()); }
}
class MutableClock extends Clock {                                   // test clock we can move forward
    Instant now; MutableClock(Instant start) { now = start; }
    public ZoneId getZone() { return ZoneOffset.UTC; } public Clock withZone(ZoneId z) { return this; } public Instant instant() { return now; }
}
class ExpenseCli {                                                   // driving adapter #1
    private final SubmitExpense submit; private final ApproveExpense approve;
    ExpenseCli(SubmitExpense s, ApproveExpense a) { submit = s; approve = a; }
    String run(String line) {
        String[] p = line.split(" ");
        try {
            return switch (p[0]) {
                case "submit" -> submit.submit(p[1], Long.parseLong(p[2]) * 100);
                case "approve" -> approve.approve(p[1], p[2]).toString();
                default -> "usage: submit <emp> <rupees> | approve <id> <manager|finance>";
            };
        } catch (RuntimeException e) { return "error: " + e.getMessage(); }
    }
}
class NightlyEscalationJob {                                         // driving adapter #2
    private final EscalateOverdue useCase; NightlyEscalationJob(EscalateOverdue u) { useCase = u; }
    void tick() { System.out.println("job escalated " + useCase.escalateOverdue()); }
}

class ExpenseApp {
    public static void main(String[] args) {
        MutableClock clock = new MutableClock(Instant.parse("2026-01-01T09:00:00Z"));
        List<String> sent = new ArrayList<>();
        ExpenseService svc = new ExpenseService(new InMemoryExpenses(), sent::add, clock);
        ExpenseCli cli = new ExpenseCli(svc, svc); NightlyEscalationJob job = new NightlyEscalationJob(svc);
        String big = cli.run("submit asha 80000"), small = cli.run("submit ravi 2000");
        System.out.println(cli.run("approve " + big + " manager"));      // NEEDS_FINANCE
        clock.now = clock.now.plus(Duration.ofDays(8));
        job.tick(); job.tick();                                          // 1 then 0: idempotent
        System.out.println(cli.run("approve " + big + " finance") + " " + sent);
    }
}`,
      complexity: `<p>O(1) per approval; escalation O(N) over open expenses (a real repository would query only SUBMITTED ones older than 7 days).</p>`,
      followUps: ['How would a third driving adapter (Slack bot buttons) be added?', 'Where would you put "managers cannot approve their own expenses"?', 'How do you prevent two scheduler instances escalating concurrently? (Optimistic locking or a job lock port.)']
    }
  });

  practice.push({
    title: 'Build an Account Statement Projection with Checkpoints', level: 'Medium', tags: ['event sourcing', 'projection', 'cqrs', 'idempotency'], companies: ['Goldman Sachs', 'Revolut', 'PhonePe'],
    statement: `<p>An event store has a <b>global ordered feed</b> of events from many account streams: <code>(position, accountId, type, amount, day)</code>. Build a <code>StatementProjection</code> that maintains, per account, the running balance and a list of statement lines, and per day the total volume. It must track a <b>checkpoint</b> (last processed position) so it can resume after a crash, ignore already-processed positions on redelivery, and be <b>rebuildable from scratch</b>.</p>`,
    constraints: `Millions of events; projection processes them in batches. Redelivery after crash is possible (at-least-once).`,
    example: `<p>Feed: 1 A Dep 100 d1, 2 B Dep 50 d1, 3 A Wd 30 d2 → A: balance ${H.c('b', '70')}, lines [+100, −30]; B: 50; volume d1=150, d2=30; checkpoint 3. Crash after position 2 and redeliver 1..3 → same result (positions ≤ checkpoint skipped).</p>`,
    brute: { why: `<p>The UI computes statements by reading every event of every account on each page view (O(all events) per request), or the projection blindly applies every delivered message, so a redelivery after a crash doubles deposits.</p>`, code: `class StatementBrute {
    static long balance(List<long[]> allEvents, long account) {          // {pos, account, sign*amount}
        long b = 0;
        for (long[] e : allEvents) if (e[1] == account) b += e[2];     // full scan on every page view
        return b;
    }
}` },
    mcq: { q: 'The projection crashes after updating balances for position 42 but before saving checkpoint 42. On restart, position 42 is delivered again. What prevents a double count?', options: ['Store the checkpoint atomically with the read-model update (same transaction), or make each update idempotent per position', 'Nothing: projections are approximate', 'Delete the event', 'Increase the batch size'], answer: 0, explain: 'Projection state and checkpoint must move together, or each event\'s effect must be idempotent. Then at-least-once delivery yields exactly-once results.' },
    hints: [`<p>Hint 1: Projection state = <code>Map&lt;account, Long&gt;</code> balances, <code>Map&lt;account, List&lt;String&gt;&gt;</code> lines, <code>Map&lt;day, Long&gt;</code> volume, <code>long checkpoint</code>.</p>`, `<p>Hint 2: <code>handle(event)</code>: if <code>position ≤ checkpoint</code> return; else update all maps and set checkpoint = position (atomically in a real DB).</p>`, `<p>Hint 3: <code>rebuild(feed)</code> = new empty projection + handle every event. Compare with the live one to verify.</p>`],
    solution: {
      approach: `<p>The projection is a pure consumer of the global feed. Each event updates three read structures and advances the checkpoint. Positions at or below the checkpoint are skipped, making redelivery harmless. Rebuild creates a fresh instance and replays from position 1.</p>`,
      code: `record FeedEvent(long position, String account, String type, long amount, String day) {}

class StatementProjection {
    final Map<String, Long> balances = new TreeMap<>();
    final Map<String, List<String>> lines = new TreeMap<>();
    final Map<String, Long> volumeByDay = new TreeMap<>();
    long checkpoint;

    void handle(FeedEvent e) {
        if (e.position() <= checkpoint) return;                           // already applied: idempotent skip
        long signed = e.type().equals("Deposited") ? e.amount() : -e.amount();
        balances.merge(e.account(), signed, Long::sum);
        lines.computeIfAbsent(e.account(), k -> new ArrayList<>()).add(e.day() + " " + (signed > 0 ? "+" : "") + signed);
        volumeByDay.merge(e.day(), e.amount(), Long::sum);
        checkpoint = e.position();                                        // in a DB: same transaction as the updates
    }
    static StatementProjection rebuild(List<FeedEvent> feed) { StatementProjection p = new StatementProjection(); feed.forEach(p::handle); return p; }

    public static void main(String[] args) {
        List<FeedEvent> feed = List.of(new FeedEvent(1, "A", "Deposited", 100, "d1"), new FeedEvent(2, "B", "Deposited", 50, "d1"),
            new FeedEvent(3, "A", "Withdrew", 30, "d2"), new FeedEvent(4, "B", "Withdrew", 10, "d2"));
        StatementProjection live = new StatementProjection();
        feed.subList(0, 2).forEach(live::handle);                         // processed 1..2, then "crash"
        feed.forEach(live::handle);                                       // redelivery from position 1
        System.out.println(live.balances + " " + live.lines + " " + live.volumeByDay + " cp=" + live.checkpoint);
        System.out.println("rebuild matches: " + rebuild(feed).balances.equals(live.balances));
    }
}`,
      complexity: `<p>O(1) amortised per event; reads are O(1) lookups instead of scans. Rebuild is O(total events) and can run in the background into a new table, then swap.</p>`,
      followUps: ['How do you rebuild a projection without downtime (blue/green read tables)?', 'How would the UI show a just-made deposit before the projection catches up?', 'What if events for one account must be processed in order but different accounts in parallel?']
    }
  });
  /* ======================= PRACTICE: HARD ======================= */
  practice.push({
    title: 'Event-Sourced Wallet with Snapshots and Concurrency Control', level: 'Hard', tags: ['event sourcing', 'snapshots', 'optimistic concurrency'], companies: ['Paytm', 'Stripe', 'Coinbase', 'JPMorgan'],
    statement: `<p>Build an event-sourced wallet: commands <code>credit(amount, ref)</code>, <code>debit(amount, ref)</code>; rules: balance never negative, each <code>ref</code> processed at most once (payment-gateway retries reuse the ref), daily debit limit ₹20,000. Provide: an event store with per-stream <b>expected-version append</b>; <b>snapshots</b> every 50 events (load = snapshot + tail); a command handler that <b>retries</b> on version conflicts (reload, re-decide). Show two concurrent debits that would together overdraw the wallet: exactly one must succeed.</p>`,
    constraints: `Streams up to 10<sup>6</sup> events; loading must not replay all of them. Amounts in paise. Clock injected.`,
    example: `<p>Balance ₹1,000. Two tabs debit ₹800 at the same time: tab A appends at v7 ${H.c('g', 'ok')}; tab B's append at v7 ${H.c('r', 'conflicts')} → retry reloads (balance 200) → ${H.c('r', 'rejected: insufficient funds')}. A retried credit with the same ref → ${H.c('m', 'no new event (idempotent)')}.</p>`,
    brute: { why: `<p>A <code>balance</code> column updated with <code>read → compute → write</code> in two requests loses an update (both read 1000, both write 200 — ₹1,600 spent, balance shows 200). Retries of the same gateway callback credit twice. Replaying a million events per request is too slow, so someone adds a cache that drifts from the truth.</p>`, code: `class WalletBrute {
    long balance = 100_000;
    void debit(long amt) {
        long read = balance;                 // thread A and B both read 100000
        if (read >= amt) balance = read - amt;   // both write 20000 -> lost update
    }
}` },
    mcq: { q: 'Where is "each ref processed at most once" best enforced in an event-sourced wallet?', options: ['In decide: the wallet state keeps the set of processed refs (rebuilt from events), so a duplicate command produces no event', 'In apply: skip duplicate events', 'In the HTTP layer with a cache', 'It cannot be enforced with event sourcing'], answer: 0, explain: 'Idempotency is a business rule over the stream\'s history, so it belongs in command handling. The processed refs are part of the derived state (and of the snapshot).' },
    hints: [`<p>Hint 1: State = balance, processed refs, debits per day, version. Snapshot = a copy of that state + its version.</p>`, `<p>Hint 2: <code>append(stream, expectedVersion, events)</code> throws if the stream length differs. Handler loop: load → decide → append; on conflict repeat up to N times.</p>`, `<p>Hint 3: Take a snapshot after an append crosses a multiple of 50; loading reads the latest snapshot and only events with version &gt; snapshot.version.</p>`],
    solution: {
      approach: `<p>Events: <code>Credited(ref, amount, day)</code>, <code>Debited(ref, amount, day)</code>. <code>WalletState</code> is derived via <code>apply</code>, includes processed refs and per-day debits, and is copyable for snapshots. <code>decide</code> returns zero or one event. The store enforces expected versions; the handler retries on conflict, re-deciding against fresh state, so the losing concurrent debit is correctly rejected.</p>`,
      code: `sealed interface WalletEvent permits Credited, Debited {}
record Credited(String ref, long amount, LocalDate day) implements WalletEvent {}
record Debited(String ref, long amount, LocalDate day) implements WalletEvent {}

class Conflict extends RuntimeException { Conflict() { super("version conflict"); } }

final class WalletState {
    long balance, version; final Set<String> refs = new HashSet<>(); final Map<LocalDate, Long> debitsByDay = new HashMap<>();
    void apply(WalletEvent e) {
        switch (e) {
            case Credited c -> { balance += c.amount(); refs.add(c.ref()); }
            case Debited d -> { balance -= d.amount(); refs.add(d.ref()); debitsByDay.merge(d.day(), d.amount(), Long::sum); }
        }
        version++;
    }
    WalletState copy() { WalletState s = new WalletState(); s.balance = balance; s.version = version; s.refs.addAll(refs); s.debitsByDay.putAll(debitsByDay); return s; }
}

class WalletStore {
    static final int SNAPSHOT_EVERY = 50;
    private final Map<String, List<WalletEvent>> streams = new HashMap<>();
    private final Map<String, WalletState> snapshots = new HashMap<>();
    int lastTailReplayed;
    synchronized WalletState load(String id) {
        WalletState s = snapshots.containsKey(id) ? snapshots.get(id).copy() : new WalletState();
        List<WalletEvent> all = streams.getOrDefault(id, List.of());
        lastTailReplayed = 0;
        for (int i = (int) s.version; i < all.size(); i++) { s.apply(all.get(i)); lastTailReplayed++; }
        return s;
    }
    synchronized void append(String id, long expected, List<WalletEvent> events) {
        List<WalletEvent> s = streams.computeIfAbsent(id, k -> new ArrayList<>());
        if (s.size() != expected) throw new Conflict();
        s.addAll(events);
        if (s.size() / SNAPSHOT_EVERY > expected / SNAPSHOT_EVERY) {             // crossed a multiple of 50
            WalletState snap = new WalletState(); s.forEach(snap::apply); snapshots.put(id, snap);
        }
    }
}

final class Wallet {
    static final long DAILY_DEBIT_LIMIT = 2_000_000;
    static List<WalletEvent> decideCredit(WalletState s, String ref, long amt, LocalDate day) {
        if (amt <= 0) throw new IllegalArgumentException("amount > 0");
        return s.refs.contains(ref) ? List.of() : List.of(new Credited(ref, amt, day));
    }
    static List<WalletEvent> decideDebit(WalletState s, String ref, long amt, LocalDate day) {
        if (amt <= 0) throw new IllegalArgumentException("amount > 0");
        if (s.refs.contains(ref)) return List.of();                                    // idempotent retry
        if (amt > s.balance) throw new IllegalStateException("insufficient funds: " + s.balance);
        if (s.debitsByDay.getOrDefault(day, 0L) + amt > DAILY_DEBIT_LIMIT) throw new IllegalStateException("daily limit");
        return List.of(new Debited(ref, amt, day));
    }
}

class WalletHandler {
    private final WalletStore store; private final Clock clock;
    WalletHandler(WalletStore s, Clock c) { store = s; clock = c; }
    String debit(String wallet, String ref, long amt) {
        for (int attempt = 0; attempt < 5; attempt++) {
            WalletState s = store.load(wallet);
            try {
                List<WalletEvent> ev = Wallet.decideDebit(s, ref, amt, LocalDate.now(clock));
                store.append(wallet, s.version, ev);
                return ev.isEmpty() ? "duplicate ignored" : "debited " + amt;
            } catch (Conflict c) { /* someone appended first: reload and decide again */ }
            catch (IllegalStateException e) { return "rejected: " + e.getMessage(); }
        }
        return "gave up after retries";
    }
    public static void main(String[] args) {
        WalletStore store = new WalletStore(); Clock clock = Clock.fixed(Instant.parse("2026-07-01T10:00:00Z"), ZoneOffset.UTC);
        LocalDate today = LocalDate.now(clock);
        for (int i = 0; i < 60; i++) { WalletState s = store.load("w1"); store.append("w1", s.version, Wallet.decideCredit(s, "c" + i, 1_000, today)); }
        WalletState loaded = store.load("w1");
        System.out.println("balance " + loaded.balance + " v" + loaded.version + ", replayed only " + store.lastTailReplayed + " events after snapshot");
        WalletState tabA = store.load("w1"), tabB = store.load("w1");                     // both see balance 60000
        store.append("w1", tabA.version, Wallet.decideDebit(tabA, "d1", 50_000, today)); // A wins
        try { store.append("w1", tabB.version, Wallet.decideDebit(tabB, "d2", 50_000, today)); }
        catch (Conflict c) { System.out.println("tab B conflict -> handler retry: " + new WalletHandler(store, clock).debit("w1", "d2", 50_000)); }
        System.out.println(new WalletHandler(store, clock).debit("w1", "d1", 50_000));   // same ref again
        System.out.println("final balance " + store.load("w1").balance);                  // 10000
    }
}`,
      complexity: `<p>Load O(snapshot copy + ≤ 50 tail events). Append O(k). Conflicts cost a reload + re-decide; under heavy contention on one wallet, serialise commands per stream (single writer) instead of retrying.</p>`,
      followUps: ['The processed-refs set grows forever — how would you bound it (expire refs older than the gateway retry window)?', 'How would you make snapshots asynchronous so appends stay fast?', 'Design a projection for "daily statement emails" from the global feed.']
    }
  });

  practice.push({
    title: 'Write a Reflection-Based DI Container (Autowiring, Scopes, Cycles)', level: 'Hard', tags: ['dependency injection', 'reflection', 'container design'], companies: ['Google', 'JetBrains', 'Pivotal'],
    statement: `<p>Implement a mini Guice/Spring: <code>bind(Interface.class, Impl.class)</code>, <code>singleton(Type.class)</code> (default prototype), <code>instance(Type.class, obj)</code>, and <code>get(Type.class)</code> which <b>autowires</b> by finding the type's single constructor and recursively resolving its parameter types. Requirements: clear error for missing bindings of interfaces, ambiguous constructors, and <b>dependency cycles</b> (print the path); singletons created once; thread-safe <code>get</code>.</p>`,
    constraints: `Plain Java (java.lang.reflect). Up to a few hundred types. No field injection.`,
    example: `<p><code>OrderService(OrderRepo, Clock)</code>, <code>OrderRepo → InMemoryOrderRepo(Clock)</code>, Clock as an instance → <code>get(OrderService.class)</code> builds InMemoryOrderRepo then OrderService; Clock shared. A ↔ B constructors → ${H.c('r', 'Dependency cycle: A -> B -> A')}.</p>`,
    brute: { why: `<p>A giant hand-written factory with one method per class, edited for every new constructor parameter; or a static service locator map that classes query from inside methods, hiding dependencies and failing at runtime on first use.</p>`, code: `class FactoryBrute {
    static Object create(String name) {
        switch (name) {                                   // edited for every class and every new constructor parameter
            case "clock": return Clock.systemUTC();
            case "service": return new Object();          // imagine: new OrderService(new InMemoryOrderRepo(Clock.systemUTC()), Clock.systemUTC())
            default: throw new IllegalArgumentException(name);
        }
    }
}` },
    mcq: { q: 'Resolving A needs B, and B needs A (both via constructors). What is the correct container behaviour?', options: ['Fail fast at resolution with the cycle path A -> B -> A', 'Create A with null for B', 'Recurse until StackOverflowError', 'Silently switch to setter injection'], answer: 0, explain: 'A constructor cycle cannot be satisfied. A good container detects it with a resolution stack and reports the full path so the developer can fix the design.' },
    hints: [`<p>Hint 1: <code>Class.getDeclaredConstructors()</code>; require exactly one (or one marked with an annotation you define). <code>ctor.getParameterTypes()</code> gives the dependency types.</p>`, `<p>Hint 2: Keep a <code>ThreadLocal&lt;Deque&lt;Class&lt;?&gt;&gt;&gt;</code> resolution stack for cycle detection; a <code>ConcurrentHashMap</code> for singletons guarded by a lock to avoid creating two singletons concurrently.</p>`, `<p>Hint 3: Interfaces/abstract classes without a binding → error "No binding for X (needed by Y)". Unwrap <code>InvocationTargetException</code> to show the real constructor error.</p>`],
    solution: {
      approach: `<p>Bindings map an abstraction to a concrete class; instances map a type to a ready object; a singleton set marks cached types. <code>get</code> resolves the binding, checks caches, detects cycles via a thread-local stack, picks the single constructor, recursively <code>get</code>s each parameter type and invokes it. Singleton creation is done under one re-entrant lock so concurrent callers never create duplicates (re-entrancy allows the recursive resolution).</p>`,
      code: `import java.lang.reflect.*;

class MiniInjector {
    private final Map<Class<?>, Class<?>> bindings = new HashMap<>();
    private final Map<Class<?>, Object> instances = new ConcurrentHashMap<>();
    private final Set<Class<?>> singletonTypes = ConcurrentHashMap.newKeySet();
    private final ReentrantLock creationLock = new ReentrantLock();
    private final ThreadLocal<Deque<Class<?>>> resolving = ThreadLocal.withInitial(ArrayDeque::new);

    <T> MiniInjector bind(Class<T> api, Class<? extends T> impl) { bindings.put(api, impl); return this; }
    <T> MiniInjector instance(Class<T> type, T obj) { instances.put(type, obj); return this; }
    MiniInjector singleton(Class<?> type) { singletonTypes.add(type); return this; }

    <T> T get(Class<T> type) {
        Object ready = instances.get(type);
        if (ready != null) return type.cast(ready);
        Class<?> impl = bindings.getOrDefault(type, type);
        if (impl.isInterface() || Modifier.isAbstract(impl.getModifiers())) {
            Deque<Class<?>> st = resolving.get();
            throw new IllegalStateException("No binding for " + type.getSimpleName() + (st.isEmpty() ? "" : " (needed by " + st.peek().getSimpleName() + ")"));
        }
        boolean single = singletonTypes.contains(type) || singletonTypes.contains(impl);
        if (!single) return type.cast(create(impl));
        creationLock.lock();
        try {
            Object cached = instances.get(type);
            if (cached == null) { cached = create(impl); instances.put(type, cached); }
            return type.cast(cached);
        } finally { creationLock.unlock(); }
    }

    private Object create(Class<?> impl) {
        Deque<Class<?>> stack = resolving.get();
        if (stack.contains(impl)) {
            List<String> path = new ArrayList<>();
            stack.descendingIterator().forEachRemaining(c -> path.add(c.getSimpleName()));
            path.add(impl.getSimpleName());
            throw new IllegalStateException("Dependency cycle: " + String.join(" -> ", path));
        }
        Constructor<?>[] ctors = impl.getDeclaredConstructors();
        if (ctors.length != 1) throw new IllegalStateException(impl.getSimpleName() + " must have exactly one constructor, has " + ctors.length);
        stack.push(impl);
        try {
            Class<?>[] params = ctors[0].getParameterTypes();
            Object[] args = new Object[params.length];
            for (int i = 0; i < params.length; i++) args[i] = get(params[i]);
            ctors[0].setAccessible(true);
            return ctors[0].newInstance(args);
        } catch (InvocationTargetException e) {
            throw new IllegalStateException("constructor of " + impl.getSimpleName() + " failed: " + e.getCause(), e.getCause());
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException("cannot create " + impl.getSimpleName(), e);
        } finally { stack.pop(); }
    }
}

interface OrderRepo { int count(); }
class InMemoryOrderRepo implements OrderRepo { final Clock clock; InMemoryOrderRepo(Clock c) { clock = c; } public int count() { return 0; } }
class OrderService { final OrderRepo repo; final Clock clock; OrderService(OrderRepo r, Clock c) { repo = r; clock = c; } }
class Ping { Ping(Pong p) {} }
class Pong { Pong(Ping p) {} }
interface Unbound {}
class NeedsUnbound { NeedsUnbound(Unbound u) {} }

class InjectorDemo {
    public static void main(String[] args) {
        MiniInjector inj = new MiniInjector()
            .instance(Clock.class, Clock.systemUTC())
            .bind(OrderRepo.class, InMemoryOrderRepo.class).singleton(OrderRepo.class);
        OrderService a = inj.get(OrderService.class), b = inj.get(OrderService.class);
        System.out.println("service prototype? " + (a != b) + ", repo singleton? " + (a.repo == b.repo) + ", clock shared? " + (a.clock == ((InMemoryOrderRepo) a.repo).clock));
        for (Class<?> bad : List.of(Ping.class, NeedsUnbound.class))
            try { inj.get(bad); } catch (IllegalStateException e) { System.out.println(e.getMessage()); }
    }
}`,
      complexity: `<p>Resolution is O(size of the dependency graph) per prototype <code>get</code>; singletons are O(1) after the first build. Reflection cost is paid at startup; compile-time DI (Dagger) removes it entirely.</p>`,
      followUps: ['How would you add request scope (one instance per HTTP request)? (Scope interface + ThreadLocal/request map.)', 'How would you validate the whole graph at startup instead of on first get?', 'Why does Spring need proxies for @Transactional, and why does self-invocation bypass them?']
    }
  });

  practice.push({
    title: 'Evolve Event Schemas: Upcasters and a Projection Rebuild', level: 'Hard', tags: ['event sourcing', 'upcasting', 'schema evolution', 'projection'], companies: ['Uber', 'Zalando', 'ING'],
    statement: `<p>An order stream was written by three app versions. v1: <code>OrderPlaced{orderId, amountRupees}</code>. v2: <code>OrderPlaced{orderId, amountPaise, currency}</code>. v3: renamed to <code>OrderSubmitted{orderId, money{paise, currency}, channel}</code> with <code>channel</code> defaulting to "web" for older events. Events are stored as <code>(type, version, Map payload)</code>. Write an <b>upcaster chain</b> so the domain only ever sees the latest <code>OrderSubmitted</code> record, then rebuild a "revenue by channel" projection from the mixed history. Unknown future versions must fail loudly, not silently.</p>`,
    constraints: `History is immutable (no rewriting stored events). Up to 10<sup>7</sup> events: upcasting must be a cheap per-event transformation.`,
    example: `<p>Stored: (OrderPlaced v1, 499 rupees), (OrderPlaced v2, 25000 paise INR), (OrderSubmitted v3, 1000 paise INR, app) → upcast to three <code>OrderSubmitted</code> records: 49900/INR/web, 25000/INR/web, 1000/INR/app → revenue ${H.c('b', 'web 74900, app 1000')}.</p>`,
    brute: { why: `<p>The projection code has <code>if (version == 1) … else if (version == 2) …</code> branches everywhere events are read; each new consumer re-implements them, slightly differently. Or a migration script rewrites history in place — losing the original facts and risking corruption of the audit log.</p>`, code: `class RevenueBrute {
    static long amount(Map<String, Object> p, int version) {
        if (version == 1) return ((Number) p.get("amountRupees")).longValue() * 100;   // copied into every consumer...
        if (version == 2) return ((Number) p.get("amountPaise")).longValue();
        return ((Number) ((Map<?, ?>) p.get("money")).get("paise")).longValue();       // ...and each copy drifts
    }
}` },
    mcq: { q: 'Why upcast on read instead of rewriting stored v1 events into v3?', options: ['Stored events are historical facts and the audit trail; upcasting keeps them intact while giving code one modern shape', 'Rewriting is impossible in any database', 'Upcasting is always faster than reading', 'v1 events are never read again'], answer: 0, explain: 'Immutability of the log is the core promise of event sourcing. Upcasters translate at the edge; copy-transform migrations into a new stream are a rare, deliberate last resort.' },
    hints: [`<p>Hint 1: Model a stored event as <code>record StoredEvent(String type, int version, Map&lt;String, Object&gt; payload)</code>.</p>`, `<p>Hint 2: Each upcaster handles one step (type, version) → next (type, version). Apply repeatedly until the event is at the latest version. Chain steps, never jump v1 → v3 directly (each step stays tiny).</p>`, `<p>Hint 3: After upcasting, deserialize into the typed record. Throw on unknown (type, version) so a newer writer deployed before the reader is noticed.</p>`],
    solution: {
      approach: `<p>A registry of single-step upcasters keyed by "type@version". <code>upcast</code> loops until the event reaches <code>OrderSubmitted@3</code>, then maps the payload to a record. The projection consumes only the typed record. Old data stays untouched; adding v4 later is one more step plus a new latest mapping.</p>`,
      code: `record StoredEvent(String type, int version, Map<String, Object> payload) {}
record OrderSubmitted(String orderId, long paise, String currency, String channel) {}

class Upcasters {
    private final Map<String, UnaryOperator<StoredEvent>> steps = new HashMap<>();
    static final String LATEST = "OrderSubmitted@3";

    Upcasters() {
        steps.put("OrderPlaced@1", e -> {                                     // rupees -> paise, assume INR
            Map<String, Object> p = new HashMap<>(e.payload());
            p.put("amountPaise", ((Number) p.remove("amountRupees")).longValue() * 100);
            p.put("currency", "INR");
            return new StoredEvent("OrderPlaced", 2, p);
        });
        steps.put("OrderPlaced@2", e -> {                                     // rename + nest money + default channel
            Map<String, Object> p = new HashMap<>();
            p.put("orderId", e.payload().get("orderId"));
            p.put("money", Map.of("paise", e.payload().get("amountPaise"), "currency", e.payload().get("currency")));
            p.put("channel", "web");
            return new StoredEvent("OrderSubmitted", 3, p);
        });
    }
    OrderSubmitted upcast(StoredEvent e) {
        int guard = 0;
        while (!(e.type() + "@" + e.version()).equals(LATEST)) {
            UnaryOperator<StoredEvent> step = steps.get(e.type() + "@" + e.version());
            if (step == null || ++guard > 10) throw new IllegalStateException("no upcaster for " + e.type() + "@" + e.version());
            e = step.apply(e);
        }
        Map<?, ?> money = (Map<?, ?>) e.payload().get("money");
        return new OrderSubmitted((String) e.payload().get("orderId"), ((Number) money.get("paise")).longValue(),
            (String) money.get("currency"), (String) e.payload().getOrDefault("channel", "web"));
    }
}

class RevenueByChannel {
    final Map<String, Long> revenue = new TreeMap<>();
    void on(OrderSubmitted e) { revenue.merge(e.channel(), e.paise(), Long::sum); }
    static RevenueByChannel rebuild(List<StoredEvent> history, Upcasters up) {
        RevenueByChannel p = new RevenueByChannel();
        for (StoredEvent raw : history) p.on(up.upcast(raw));
        return p;
    }
    public static void main(String[] args) {
        List<StoredEvent> history = List.of(
            new StoredEvent("OrderPlaced", 1, Map.of("orderId", "o1", "amountRupees", 499)),
            new StoredEvent("OrderPlaced", 2, Map.of("orderId", "o2", "amountPaise", 25_000L, "currency", "INR")),
            new StoredEvent("OrderSubmitted", 3, Map.of("orderId", "o3", "money", Map.of("paise", 1_000L, "currency", "INR"), "channel", "app")));
        Upcasters up = new Upcasters();
        history.forEach(e -> System.out.println(up.upcast(e)));
        System.out.println(rebuild(history, up).revenue);                     // {app=1000, web=74900}
        try { up.upcast(new StoredEvent("OrderSubmitted", 4, Map.of())); } catch (IllegalStateException e) { System.out.println(e.getMessage()); }
        System.out.println("stored v1 untouched: " + history.get(0));
    }
}`,
      complexity: `<p>O(steps) per event (a few map copies); rebuild O(N). Stored data never changes.</p>`,
      followUps: ['How do you deploy a new event version safely when old readers are still running (tolerant readers, deploy readers first)?', 'When would you choose a copy-and-transform migration into a new stream instead?', 'How would Avro/Protobuf schema registries help here?']
    }
  });

  practice.push({
    title: 'Ride-Hailing: Aggregates, Domain Events and a Process Manager', level: 'Hard', tags: ['aggregate', 'domain events', 'eventual consistency', 'saga'], companies: ['Uber', 'Ola', 'Grab', 'Lyft'],
    statement: `<p>When a <b>Trip</b> completes: the rider's <b>Payment</b> must be charged; on success the <b>Driver</b>'s earnings are credited (80% of fare) and the driver becomes available; if the charge fails, the trip is marked PAYMENT_PENDING and the rider is blocked from new trips until paid. Trip, Payment and Driver are separate aggregates (separate transactions). Design the aggregates, the events (<code>TripCompleted</code>, <code>PaymentCaptured</code>, <code>PaymentFailed</code>), and a <b>process manager</b> that reacts to events and sends the next command. Handlers must be idempotent.</p>`,
    constraints: `Millions of trips/day. No distributed transaction across aggregates. Event delivery is at-least-once.`,
    example: `<p>Trip t1 fare ₹250 completes → PaymentCaptured → driver d1 earnings ${H.c('g', '+₹200')}, available. Trip t2 card declined → PaymentFailed → trip ${H.c('y', 'PAYMENT_PENDING')}, rider blocked; duplicate TripCompleted(t1) → ${H.c('m', 'ignored, no second charge')}.</p>`,
    brute: { why: `<p><code>TripService.complete()</code> charges the card, updates the driver row and the trip row in one long method (and one DB transaction holding locks during a slow card call). If the card call times out after charging, the transaction rolls back trip and driver updates while money was taken; retrying charges twice.</p>`, code: `class TripServiceBrute {
    final Map<String, Long> driverEarnings = new HashMap<>();
    void complete(String trip, String driver, long fare) {
        boolean charged = Math.random() > 0.1;           // slow remote call inside the "transaction"
        if (!charged) throw new IllegalStateException("roll back everything?!");
        driverEarnings.merge(driver, fare * 80 / 100, Long::sum);   // retry after a timeout = double credit
    }
}` },
    mcq: { q: 'Charging succeeded but crediting the driver failed (driver DB down). What is the right recovery?', options: ['Keep the charge; the PaymentCaptured event is redelivered until the idempotent driver-credit handler succeeds', 'Refund the rider immediately', 'Roll back the trip', 'Ask the driver to call support'], answer: 0, explain: 'Each step is a committed fact. The process continues forward by retrying the next idempotent step; compensation (refund) is only for genuine business failure, not a temporarily unavailable service.' },
    hints: [`<p>Hint 1: Trip (status, riderId, driverId, fare), Payment (per trip: status, attempt ref), Driver (available flag, earnings, credited trip IDs), RiderAccount (blocked flag).</p>`, `<p>Hint 2: Process manager: on TripCompleted → command Payment.charge; on PaymentCaptured → Driver.credit + Driver.makeAvailable; on PaymentFailed → Trip.markPaymentPending + Rider.block.</p>`, `<p>Hint 3: Idempotency inside aggregates: Payment ignores a second charge for the same trip; Driver keeps the set of credited trip IDs.</p>`],
    solution: {
      approach: `<p>Four small aggregates, each enforcing its own rules and making repeated commands harmless. Events flow through a simple in-memory bus with a queue (to mimic asynchronous delivery). The <code>TripProcessManager</code> has no business state of its own beyond routing: it translates events into the next aggregate command. A duplicate event replays harmlessly because every step is idempotent.</p>`,
      code: `sealed interface RideEvent permits TripCompleted, PaymentCaptured, PaymentFailed {}
record TripCompleted(String tripId, String rider, String driver, long fare) implements RideEvent {}
record PaymentCaptured(String tripId, String driver, long fare) implements RideEvent {}
record PaymentFailed(String tripId, String rider, String reason) implements RideEvent {}

class Trip {
    final String id, rider, driver; final long fare; String status = "ONGOING";
    Trip(String id, String rider, String driver, long fare) { this.id = id; this.rider = rider; this.driver = driver; this.fare = fare; }
    Optional<RideEvent> complete() { if (!status.equals("ONGOING")) return Optional.empty(); status = "COMPLETED"; return Optional.of(new TripCompleted(id, rider, driver, fare)); }
    void markPaymentPending() { if (status.equals("COMPLETED")) status = "PAYMENT_PENDING"; }
}
class Payment {                                                   // one per trip
    final String tripId; String status = "NONE";
    Payment(String tripId) { this.tripId = tripId; }
    Optional<RideEvent> charge(TripCompleted t, Predicate<String> gateway) {
        if (!status.equals("NONE")) return Optional.empty();       // idempotent: already charged or failed
        if (gateway.test(t.rider())) { status = "CAPTURED"; return Optional.of(new PaymentCaptured(t.tripId(), t.driver(), t.fare())); }
        status = "FAILED"; return Optional.of(new PaymentFailed(t.tripId(), t.rider(), "card declined"));
    }
}
class Driver {
    final String id; long earnings; boolean available; private final Set<String> creditedTrips = new HashSet<>();
    Driver(String id) { this.id = id; }
    void creditFor(String tripId, long fare) { if (creditedTrips.add(tripId)) earnings += fare * 80 / 100; available = true; }
}
class RiderAccount { final String id; boolean blocked; RiderAccount(String id) { this.id = id; } void block() { blocked = true; } }

class TripProcessManager {
    final Map<String, Trip> trips = new HashMap<>(); final Map<String, Payment> payments = new HashMap<>();
    final Map<String, Driver> drivers = new HashMap<>(); final Map<String, RiderAccount> riders = new HashMap<>();
    final Deque<RideEvent> bus = new ArrayDeque<>(); final Predicate<String> gateway;
    TripProcessManager(Predicate<String> gateway) { this.gateway = gateway; }

    void publish(Optional<RideEvent> e) { e.ifPresent(bus::add); }
    void drain() {
        while (!bus.isEmpty()) {
            RideEvent e = bus.poll();
            switch (e) {
                case TripCompleted t -> publish(payments.computeIfAbsent(t.tripId(), Payment::new).charge(t, gateway));
                case PaymentCaptured p -> drivers.computeIfAbsent(p.driver(), Driver::new).creditFor(p.tripId(), p.fare());
                case PaymentFailed f -> { trips.get(f.tripId()).markPaymentPending(); riders.computeIfAbsent(f.rider(), RiderAccount::new).block(); }
            }
        }
    }
    public static void main(String[] args) {
        TripProcessManager pm = new TripProcessManager(rider -> !rider.equals("ravi"));   // ravi's card declines
        pm.trips.put("t1", new Trip("t1", "asha", "d1", 25_000));
        pm.trips.put("t2", new Trip("t2", "ravi", "d1", 18_000));
        pm.publish(pm.trips.get("t1").complete()); pm.publish(pm.trips.get("t2").complete());
        pm.drain();
        pm.bus.add(new TripCompleted("t1", "asha", "d1", 25_000));                        // duplicate delivery
        pm.drain();
        Driver d1 = pm.drivers.get("d1");
        System.out.println("d1 earnings " + d1.earnings + ", available " + d1.available);     // 20000 once
        System.out.println("t2 " + pm.trips.get("t2").status + ", ravi blocked " + pm.riders.get("ravi").blocked);
    }
}`,
      complexity: `<p>O(1) per event per handler. Each aggregate is tiny and locked only during its own step, so millions of trips scale horizontally (partition by trip/driver ID).</p>`,
      followUps: ['Where would timeouts go (payment pending for 24 hours → collections)? (Process manager schedules a deadline event.)', 'How do you show the rider a consistent trip receipt while steps are still in flight?', 'Choreography (handlers react independently) vs orchestration (this process manager) — trade-offs?']
    }
  });
  /* ======================= QUIZ ======================= */
  quiz.push(
    { q: 'What is an "anemic domain model"?', options: ['Domain classes with only getters/setters while all rules live in service classes', 'A model with too few classes', 'A model that uses value objects everywhere', 'A database with no indexes'], answer: 0, explain: 'Anemic objects hold data but no behaviour, so rules are duplicated across services and nothing stops invalid state.' },
    { q: 'Which injection style should be your default in plain Java?', options: ['Constructor injection with final fields', 'Field injection with reflection', 'Setter injection', 'A static service locator'], answer: 0, explain: 'Constructor injection makes dependencies explicit, required and immutable, and needs no framework for tests.' },
    { q: 'In a hand-written DI container, what is the "resolution stack" for?', options: ['Detecting dependency cycles and reporting the path', 'Caching singletons', 'Sorting beans alphabetically', 'Running constructors in parallel'], answer: 0, explain: 'If a type is requested while it is already being built higher up the stack, there is a cycle (A → B → A).' },
    { q: 'In hexagonal architecture, a JDBC repository implementing <code>BookRepository</code> is a…', options: ['Driven (secondary) adapter implementing an outbound port', 'Driving adapter', 'Inbound port', 'Domain entity'], answer: 0, explain: 'The core needs storage; it defines the BookRepository port; the JDBC class is the driven adapter that implements it.' },
    { q: 'Which statement about source-code dependencies in hexagonal architecture is true?', options: ['They all point inward: adapters depend on ports, the domain depends on nothing external', 'The domain depends on the database layer', 'Ports depend on adapters', 'Controllers and repositories depend on each other'], answer: 0, explain: 'The dependency rule: the core owns the interfaces; technology plugs in from outside.' },
    { q: 'Two <code>Money(100, "INR")</code> objects created separately are…', options: ['Equal, because value objects compare by value', 'Different, because they are different objects', 'Equal only if they are the same reference', 'Not comparable'], answer: 0, explain: 'Value objects have no identity; equality is defined by their attributes (records do this automatically).' },
    { q: 'How should an entity implement <code>equals</code>?', options: ['By its identity (ID) only', 'By all fields', 'By reference only', 'It should never override equals'], answer: 0, explain: 'An entity stays the same entity even when its attributes change, so only the ID matters.' },
    { q: 'Which is NOT one of Vernon\'s aggregate design rules?', options: ['Make aggregates as large as possible to keep everything consistent', 'Reference other aggregates by identity', 'Design small aggregates', 'Use eventual consistency outside the boundary'], answer: 0, explain: 'Large aggregates cause contention and slow loads. Keep them small; only true invariants share a boundary.' },
    { q: 'Should there be an <code>OrderLineRepository</code> when OrderLine is inside the Order aggregate?', options: ['No — repositories exist only for aggregate roots; lines are loaded and saved with their Order', 'Yes, every table needs a repository', 'Yes, for performance', 'Only in event sourcing'], answer: 0, explain: 'Exposing inner entities through their own repository lets callers bypass the root and its invariants.' },
    { q: 'Why dispatch domain events <i>after</i> the aggregate is saved?', options: ['So handlers only react to committed facts (no emails for orders that failed to save)', 'Because events are slow', 'Because handlers need the database lock', 'It does not matter'], answer: 0, explain: 'Publishing before commit can announce something that never happened. The outbox makes "save + record event" atomic.' },
    { q: 'The transactional outbox gives which delivery guarantee?', options: ['At-least-once, so consumers must be idempotent', 'Exactly-once with no extra work', 'At-most-once', 'No guarantee'], answer: 0, explain: 'The relay may publish and crash before marking sent, so duplicates are possible. Idempotent consumers make the effect exactly-once.' },
    { q: 'In event sourcing, where must business-rule validation happen?', options: ['When deciding on a command, before producing events — never inside apply', 'Inside apply while replaying', 'In the event store', 'In projections'], answer: 0, explain: 'Apply must always succeed for historical events; rules only gate new commands.' },
    { q: 'What is a snapshot in event sourcing?', options: ['A cached state at version N so loading replays only later events', 'A backup of the database', 'A projection for the UI', 'A deleted event'], answer: 0, explain: 'Snapshots speed up loading; they can be deleted and rebuilt from the log at any time.' },
    { q: 'Which is the best sign that a plugin architecture (not just a strategy) is needed?', options: ['Third parties or other teams add features without changing or redeploying the core', 'There are two algorithms', 'The code has an if statement', 'You use Java'], answer: 0, explain: 'Plugin systems add discovery, versioning, lifecycle and isolation on top of the strategy idea — worth it when extension is external.' }
  );

  /* ======================= INTERVIEW ======================= */
  interview.push(
    { q: 'What is wrong with a "tightly coupled, anemic" design, and how would you fix it incrementally?', level: 'B', a: `<p><b>Coupling:</b> services build their own dependencies with <code>new</code> (DB client, payment SDK, mailer), so any vendor change edits business code and nothing is unit-testable without real infrastructure. <b>Anemia:</b> entities are getter/setter bags; rules live in many services and get duplicated, and one copy is eventually wrong. <b>Incremental fix:</b> add seams at boundaries (interfaces for I/O, time, randomness) with constructor injection; move one rule at a time into an entity method (<code>order.cancel()</code>) and delete the setter; cover each step with fast tests using fakes. Strangle, do not rewrite.</p>`, followUps: ['How do you find all copies of a rule in a big codebase?', 'When is an anemic model acceptable?'] },
    { q: 'Explain dependency injection without mentioning any framework.', level: 'B', a: `<p>A class receives what it needs through its constructor instead of creating it. <code>OrderService(OrderRepository repo, PaymentPort pay, Clock clock)</code>. One place — the <b>composition root</b>, usually <code>main</code> — builds the concrete objects from the leaves up and passes them in. Tests build the same class with fakes. Benefits: dependencies are visible, swappable and testable; the class depends on abstractions (DIP). A container (Spring, Guice, Dagger) only automates the composition root: registry of bindings + recursive resolution + scopes + lifecycle.</p>`, followUps: ['DI vs Service Locator?', 'What is a captive dependency?', 'How would you write a container in 30 lines?'] },
    { q: 'How does a DI container resolve a dependency graph, and how does it detect cycles?', level: 'I', a: `<p>For a requested type it looks up the binding (interface → implementation or factory), checks the singleton cache, otherwise pushes the type onto a <b>resolution stack</b>, recursively resolves each constructor parameter, invokes the constructor, caches it if singleton, and pops. If a type is requested while already on the stack, there is a cycle; the stack contents give the exact path (A → B → A). Spring can break some setter/field cycles via early references but constructor cycles fail, and Spring Boot rejects cycles by default since 2.6. The right fix is usually a design change: extract the shared part into a third class or decouple with an event.</p>`, followUps: ['How do scopes (singleton/prototype/request) change resolution?', 'Compile-time DI (Dagger) — what is different?'] },
    { q: 'Design a plugin system for exporting reports in many formats, built by third parties.', level: 'I', a: `<p><b>Extension point:</b> a tiny, stable <code>ExporterPlugin</code> interface (<code>format()</code>, <code>apiVersion()</code>, <code>start/stop</code>, <code>export(Report)</code>) with immutable inputs (records). <b>Discovery:</b> <code>ServiceLoader</code> with <code>META-INF/services</code> or <code>provides … with</code>; or a plugins folder with one <code>URLClassLoader</code> per JAR for dependency isolation and hot install. <b>Registry:</b> map format → plugin, with conflict rules. <b>Safety:</b> version check at load, try/catch around start and every call, timeouts on an executor, quarantine failing plugins, and out-of-process execution for untrusted code. <b>Evolution:</b> add default methods, semantic versioning, contract tests run against every plugin.</p>`, followUps: ['How do you unload a plugin without leaking memory?', 'How is MCP similar to this?'] },
    { q: 'Walk through hexagonal architecture at class level for a "borrow book" feature.', level: 'I', a: `<p><b>Domain:</b> <code>Book</code> (entity with <code>borrow(member, today)</code>), <code>BookId</code>, <code>MemberId</code> (VOs). <b>Inbound port:</b> <code>BorrowBookUseCase.borrow(BorrowBookCommand)</code>. <b>Outbound ports:</b> <code>BookRepository</code>, <code>MemberNotifier</code>, <code>Clock</code>. <b>Application service:</b> <code>BorrowBookService implements BorrowBookUseCase</code> — load via port, call the domain, save, notify. <b>Driving adapters:</b> REST controller, CLI, Kafka consumer, tests — each translates its input to the command and maps errors (DomainException → 409). <b>Driven adapters:</b> JDBC/Mongo repositories, email notifier. Composition root wires them. Every compile-time arrow points inward; enforce with modules or ArchUnit.</p>`, followUps: ['Where do transactions go?', 'Do you map between domain and persistence models? Trade-offs?'] },
    { q: 'Entity vs value object: how do you decide, and how do you implement each in modern Java?', level: 'B', a: `<p>Ask: "does the business track <i>this particular one</i> over time?" Yes → <b>entity</b>: stable typed ID (<code>record CustomerId(UUID value)</code>), behaviour methods instead of setters, <code>equals/hashCode</code> on ID only. No → <b>value object</b>: a <code>record</code> with a validating compact constructor, immutable, operations return new instances (<code>money.plus(other)</code>), equality by all fields. Default to value objects; they remove primitive obsession, centralise validation, are thread-safe and make great map keys. The same real-world thing can be either depending on context (a ₹500 note for a shop vs for the central bank).</p>`, followUps: ['How do you persist value objects?', 'Why never use double for money?'] },
    { q: 'How do you find aggregate boundaries for a new domain?', level: 'A', a: `<p>(1) List every invariant as a one-line rule. (2) For each, list the minimal data it needs. (3) Data that must be consistent <b>immediately and together</b> forms one aggregate with a root that enforces the rule. (4) Everything else is referenced <b>by ID</b> and synchronised with domain events (eventual consistency). (5) Check size and contention: if one aggregate would be loaded by thousands of concurrent users (a product's stock inside every order), split it and ask the business whether the rule can tolerate a short delay. (6) One repository per root; one aggregate per transaction (justify exceptions). Example: Order(lines, total limit) vs Inventory(stock per SKU) vs Customer(credit).</p>`, followUps: ['How do you handle a uniqueness rule across all users?', 'What if two aggregates truly must change atomically?'] },
    { q: 'What is optimistic locking on aggregates and when would you choose pessimistic locking?', level: 'I', a: `<p>Each aggregate carries a <b>version</b>. Save does <code>UPDATE … SET version = v+1 WHERE id = ? AND version = v</code> (or appends events with expected version). If 0 rows match, someone else saved first → <code>ConcurrencyConflict</code>; the application reloads, re-runs the command against fresh state (it may now be rejected) and saves again with bounded retries. No locks are held while the user thinks. <b>Pessimistic</b> (<code>SELECT … FOR UPDATE</code>) suits hot aggregates where retries would storm (a flash-sale counter) or long critical sections — at the cost of blocking and deadlock risk. Very hot single aggregates are better served by a single-writer queue per aggregate.</p>`, followUps: ['How do you surface a conflict to a user editing a form?', 'Lost update vs write skew?'] },
    { q: 'Explain domain events and the dual-write problem. How does the transactional outbox solve it?', level: 'A', a: `<p>A domain event is a past-tense fact (<code>OrderPlaced</code>) recorded by an aggregate, used to trigger work in other aggregates/services without coupling. The <b>dual-write problem</b>: saving to the DB and publishing to a broker are two systems — one can succeed while the other fails, causing lost or phantom events. <b>Outbox:</b> in the same DB transaction as the aggregate, insert the event into an <code>outbox</code> table. A relay (polling with <code>FOR UPDATE SKIP LOCKED</code>, or CDC like Debezium) publishes rows and marks them sent. Crashes between publish and mark cause duplicates → <b>at-least-once</b>; consumers dedupe on <code>eventId</code> (processed table in the same transaction as their effect). Partition by aggregate ID to keep per-aggregate order.</p>`, followUps: ['Domain events vs integration events?', 'Why not publish inside the DB transaction?'] },
    { q: 'What is event sourcing? Write the core loop in pseudo-Java.', level: 'A', a: `<p>The source of truth is an append-only stream of events per aggregate; state is derived. <b>Load:</b> <code>state = empty; for (e : store.read(id)) state.apply(e);</code>. <b>Handle command:</b> <code>events = decide(command, state)</code> — validates and may reject. <b>Save:</b> <code>store.append(id, expectedVersion = state.version, events)</code> — fails if someone appended first; retry. <b>apply</b> is a pure state change that never validates or throws. Add <b>snapshots</b> for long streams and <b>projections</b> (read models) fed by the global event feed, rebuildable at any time. Benefits: full audit, time travel, new read models from old data. Costs: schema evolution (upcasters), eventual consistency of reads, GDPR (crypto-shredding), learning curve.</p>`, followUps: ['How do you fix a wrong event that was already stored?', 'Event store on Postgres — schema?'] },
    { q: 'When would you NOT use event sourcing or full DDD tactical patterns?', level: 'E', a: `<p>For CRUD-heavy areas with few rules (admin settings, reference data, simple catalogues), a transaction script or plain repository over tables is simpler and faster to build. Event sourcing adds versioning discipline, projection infrastructure, eventual consistency in the UI and harder ad-hoc querying; DDD aggregates add mapping and ceremony. Apply them selectively to the <b>core domain</b> where rules, auditability or concurrency matter (payments, bookings, inventory, ledgers). Mixed architectures are normal: one bounded context event-sourced, another CRUD. Saying this in an interview shows judgement rather than pattern enthusiasm.</p>`, followUps: ['How do you migrate one aggregate to event sourcing later?', 'What is a bounded context and how does it relate?'] },
    { q: 'How do you evolve event schemas once events are stored forever?', level: 'E', a: `<p>Never edit stored events. Options: (1) <b>weak schema / tolerant reader</b>: only additive changes with defaults; (2) <b>upcasters</b>: single-step transformers applied on read (v1 → v2 → v3) so domain code sees only the latest shape; (3) <b>new event type</b> for changed meaning (OrderSubmitted alongside OrderPlaced); (4) <b>copy-and-transform</b> into a new stream as a rare migration. Use a version field and schemas (Avro/Protobuf/JSON Schema with a registry) for integration events; deploy readers before writers; fail loudly on unknown versions. Name events in domain language from day one — they are your most durable API.</p>`, followUps: ['How do you handle renamed fields with Avro?', 'What does "deploy readers first" protect against?'] },
    { q: 'How do AI tools change the way you design and maintain these architectures?', level: 'E', a: `<p>AI generates code fast, which makes coupling and anemic models grow fast too, so explicit boundaries matter more. Small, well-named ports and plugin interfaces are ideal units of work for coding agents ("write a DynamoDB adapter that passes the repository contract tests"). LLMs themselves belong behind outbound ports (swap providers, deterministic fakes in tests). Agent tool calls are driving adapters and should map to aggregate commands, so a confused agent cannot corrupt state. AI is great at discovery tasks (find all rule copies, map event publishers/subscribers, list invariants) but humans must own boundary decisions, consistency trade-offs and long-lived contracts like event schemas.</p>`, followUps: ['How would you review an AI-generated domain model?', 'How do you make an agent\'s actions auditable? (Event-sourced run logs.)'] }
  );
  registerModule({
    id: 'lld11',
    title: 'Extensible Architecture & DDD Tactical Patterns',
    intro: `<p>Most code works on day one. The hard part is day three hundred, when the payment provider changes, a new rule arrives, three teams want to add features and an auditor asks "what was this balance on 1st March?". This module teaches the tools senior engineers use to build code that <b>survives change</b>.</p>
<p>We start with the <b>brute force</b> almost everyone writes first — tightly coupled services and anemic data classes — and watch a single change ripple through it. Then we fix it, one tool at a time: <b>dependency injection by hand</b> (and a container you write yourself), <b>plugin architectures</b>, <b>hexagonal architecture</b> (ports and adapters) at class level, the DDD building blocks — <b>entities, value objects, aggregates, repositories, domain events</b> — and finally <b>event sourcing</b>, where you store the story and rebuild the state.</p>
<p>Every topic has an everyday analogy first, an interactive visualizer (change ripples, DI wiring, plugin boot, ports-and-adapters rings, aggregate boundaries, event flow with outbox, and event-log replay step by step), compilable plain-Java code with no frameworks, worked examples, an expert deep dive and an AI-era section. Practice problems ask you to model domains, find aggregate boundaries and rebuild state from events.</p>`,
    goals: [
      'Explain why tightly coupled, anemic designs hurt and refactor them step by step into rich, testable models',
      'Wire an application by hand with constructor injection and a composition root, and build a small DI container with scopes and cycle detection',
      'Design a plugin architecture with extension points, discovery (ServiceLoader), versioning, lifecycle and failure isolation',
      'Structure a feature as a hexagon: domain, inbound/outbound ports, driving/driven adapters, with all dependencies pointing inward',
      'Model a domain with entities, value objects, small aggregates and repositories, and find aggregate boundaries from invariants',
      'Use domain events with the transactional outbox and idempotent handlers for eventual consistency between aggregates',
      'Implement event sourcing in Java: decide/apply, rehydration, expected-version appends, snapshots, projections and upcasting'
    ],
    prereqs: `LLD 2 (SOLID — especially Dependency Inversion), LLD 4–6 (creational, structural and behavioral patterns: Strategy, Observer, Decorator), LLD 10 (Concurrency in LLD) for optimistic locking intuition, and comfortable modern Java (interfaces, records, sealed types, lambdas, generics).`,
    hours: 16,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
