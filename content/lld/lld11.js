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
      statement: `<p>Build the core of a linter. Rules are plugins with an id (e.g. <code>no-todo</code>, <code>max-len</code>), a default severity, and a <code>check(lineNo, line)</code> that returns issues. Config enables/disables rules and overrides severity. Requirements: (1) adding a rule never edits the core; (2) a rule that throws must be reported as an internal error and must not stop other rules; (3) output issues sorted by line, then rule id.</p>`,
      constraints: `Up to 10<sup>5</sup> lines, up to 50 rules. Rules are stateless.`,
      example: `<p>Input lines: <code>int x = 1; // TODO fix</code>, a 130-char line. Rules: no-todo (WARN), max-len 120 (ERROR), crashy-rule. Output: ${H.c('y', 'L1 WARN no-todo')}, ${H.c('r', 'L2 ERROR max-len')}, ${H.c('m', 'internal: crashy-rule failed on L1')}. The crash is visible but harmless.</p>`,
      brute: { why: `<p>One giant <code>lint()</code> method with an if-block per rule and boolean flags for enabling. Every new rule edits it, one exception aborts the whole run, and third-party rules are impossible.</p>`, code: `class LinterBrute {
    List<String> lint(List<String> lines, boolean todoOn, boolean lenOn) {
        List<String> out = new ArrayList<>();
        for (int i = 0; i < lines.size(); i++) {
            String l = lines.get(i);
            if (todoOn && l.contains("TODO")) out.add("L" + (i + 1) + " WARN no-todo");
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

class NoTodo implements Rule {
    public String id() { return "no-todo"; }
    public Severity defaultSeverity() { return Severity.WARN; }
    public List<String> check(int n, String l) { return l.contains("TODO") ? List.of("TODO left in code") : List.of(); }
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
        lint.register(new NoTodo()); lint.register(new MaxLen(20)); lint.register(new Crashy());
        lint.run(List.of("int x = 1; // TODO fix", "ok")).forEach(System.out::println);
    }
}`,
        complexity: `<p>O(L × R) rule calls for L lines and R rules; O(I log I) to sort I issues. Adding a rule: one class + one <code>register</code> (or a ServiceLoader entry).</p>`,
        followUps: ['How would you load third-party rules from JARs at startup (ServiceLoader)?', 'How do you stop a rule that loops forever? (Run rules on an executor with a per-file timeout.)', 'How would rules that need the whole file (not one line) fit the API without breaking existing rules? (A second extension point or a default method.)']
      }
    }]
  });
registerModule({ id: 'lld11', title: 'x', intro: '<p>x</p>', goals: [], prereqs: 'x', hours: 1, topics: topics, practice: practice, quiz: quiz, interview: interview }); })();
