(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ---------- tiny helpers shared by all visualizers ---------- */
  function B(id, label, x, y, w) { var n = { id: id, label: label, x: x, y: y, shape: 'box' }; if (w) n.w = w; return n; }
  function G(label, nodes, edges, o) {
    o = o || {};
    return { type: 'graph', label: label, directed: o.undirected ? false : true, height: o.h || 60, nodes: nodes, edges: edges, hl: o.hl || {}, ehl: o.ehl || {}, tags: o.tags || {} };
  }
  function CODE(label, code, hl, alt) { var p = { type: 'code', label: label, lang: 'java', code: code, hl: hl || {} }; if (alt) p.alt = alt; return p; }
  var ROOT_PY = [
    "self.stripe = StripeClient()",
    "self.dao = MySqlOrderDao()",
    "# and in 3 services:",
    "order.status = \"CANCELLED\""
  ].join('\n');
  var ROOT_TS = [
    "this.stripe = new StripeClient();",
    "this.dao = new MySqlOrderDao();",
    "// and in 3 services:",
    "order.status = \"CANCELLED\";"
  ].join('\n');
  var ROOT_CPP = [
    "unique_ptr<StripeClient> stripe = make_unique<StripeClient>();",
    "unique_ptr<MySqlOrderDao> dao = make_unique<MySqlOrderDao>();",
    "// and in 3 services:",
    "order.status = \"CANCELLED\";"
  ].join('\n');
  var ROOT_ALT = { python: { code: ROOT_PY, map: {} }, js: { lang: 'ts', code: ROOT_TS, map: {} }, cpp: { code: ROOT_CPP, map: {} } };
  var REG_PY = [
    "try:",
    "    p.start()",
    "    active[key] = p",
    "except Exception:",
    "    rejected.add(key)"
  ].join('\n');
  var REG_TS = [
    "try {",
    "  p.start();",
    "  active.set(key, p);",
    "} catch (e) {",
    "  rejected.add(key);",
    "}"
  ].join('\n');
  var REG_CPP = [
    "try {",
    "  p->start();",
    "  active[key] = p;",
    "} catch (const exception& e) {",
    "  rejected.insert(key);",
    "}"
  ].join('\n');
  var REG_ALT = { python: { code: REG_PY, map: {} }, js: { lang: 'ts', code: REG_TS, map: {} }, cpp: { code: REG_CPP, map: {} } };
  var BORROW_PY = [
    "book = books.find(id)                      # raises NotFound when missing",
    "if books.loans_of(member) >= MAX_LOANS: raise LimitReached()",
    "book.borrow(member, clock.today())",
    "books.save(book)",
    "notifier.loan_created(member, title, due)"
  ].join('\n');
  var BORROW_TS = [
    "const book = books.find(id);                  // throws NotFound when missing",
    "if (books.loansOf(member) >= MAX_LOANS) throw new LimitReached();",
    "book.borrow(member, clock.today());",
    "books.save(book);",
    "notifier.loanCreated(member, title, due);"
  ].join('\n');
  var BORROW_CPP = [
    "Book book = books.find(id);                   // throws NotFound when missing",
    "if (books.loansOf(member) >= MAX_LOANS) throw LimitReached();",
    "book.borrow(member, clock.today());",
    "books.save(book);",
    "notifier.loanCreated(member, title, due);"
  ].join('\n');
  var BORROW_ALT = { python: { code: BORROW_PY, map: {} }, js: { lang: 'ts', code: BORROW_TS, map: {} }, cpp: { code: BORROW_CPP, map: {} } };
  var ENT_PY = [
    "def __eq__(self, o):",
    "    return (isinstance(o, Customer)",
    "            and o.id == self.id)  # ID only"
  ].join('\n');
  var ENT_TS = [
    "equals(o: unknown): boolean {",
    "  return o instanceof Customer",
    "      && o.id === this.id;  // ID only",
    "}"
  ].join('\n');
  var ENT_CPP = [
    "bool operator==(const Customer& o) const {",
    "  // same type is guaranteed by the signature",
    "  return id == o.id;  // ID only",
    "}"
  ].join('\n');
  var ENT_ALT = { python: { code: ENT_PY, map: {} }, js: { lang: 'ts', code: ENT_TS, map: {} }, cpp: { code: ENT_CPP, map: {} } };
  var VO_PY = [
    "@dataclass(frozen=True)   # equals is generated for you",
    "class Money:",
    "    minor: int; currency: str   # equals = minor == o.minor and currency == o.currency"
  ].join('\n');
  var VO_TS = [
    "class Money { constructor(readonly minor: number, readonly currency: string) {}",
    "  // equals by value:",
    "  equals(o: Money): boolean { return this.minor === o.minor",
    "      && this.currency === o.currency; }",
    "}"
  ].join('\n');
  var VO_CPP = [
    "struct Money { long long minor; string currency;",
    "  // defaulted == compares every member:",
    "  bool operator==(const Money&) const = default;  // minor == o.minor && currency == o.currency",
    "};"
  ].join('\n');
  var VO_ALT = { python: { code: VO_PY, map: {} }, js: { lang: 'ts', code: VO_TS, map: {"3":4} }, cpp: { code: VO_CPP, map: {} } };
  var LINES_PY = [
    "class _OrderLine(NamedTuple): sku: str; qty: int   # private to Order",
    "def lines(self) -> list[LineView]:",
    "    return [LineView(l.sku, l.qty)",
    "            for l in self._lines.values()]"
  ].join('\n');
  var LINES_TS = [
    "private static OrderLine = class { constructor(public sku: string, public qty: number) {} };   // not exported",
    "lines(): LineView[] {",
    "  return [...this._lines.values()]",
    "    .map((l) => new LineView(l.sku, l.qty));",
    "}"
  ].join('\n');
  var LINES_CPP = [
    "struct OrderLine { string sku; int qty; };   // private to Order",
    "vector<LineView> lines() const {",
    "  vector<LineView> out;",
    "  for (auto& [sku, l] : lines_) out.push_back(LineView{l.sku, l.qty});",
    "  return out; }"
  ].join('\n');
  var LINES_ALT = { python: { code: LINES_PY, map: {} }, js: { lang: 'ts', code: LINES_TS, map: {} }, cpp: { code: LINES_CPP, map: {} } };
  var APPLY_PY = [
    "match e:",
    "    case Opened(): self.open = True",
    "    case Deposited(amount=a): self.balance += a",
    "    case Withdrew(amount=a): self.balance -= a",
    "    case Frozen(): self.frozen = True"
  ].join('\n');
  var APPLY_TS = [
    "switch (e.type) {",
    "  case \"Opened\": this.open = true; break;",
    "  case \"Deposited\": this.balance += e.amount; break;",
    "  case \"Withdrew\": this.balance -= e.amount; break;",
    "  case \"Frozen\": this.frozen = true; break;",
    "}"
  ].join('\n');
  var APPLY_CPP = [
    "visit(overloaded{",
    "  [&](const Opened&)       { open = true; },",
    "  [&](const Deposited& d)  { balance += d.amount; },",
    "  [&](const Withdrew& w)   { balance -= w.amount; },",
    "  [&](const Frozen&)       { frozen = true; }",
    "}, e);"
  ].join('\n');
  var APPLY_ALT = { python: { code: APPLY_PY, map: {} }, js: { lang: 'ts', code: APPLY_TS, map: {} }, cpp: { code: APPLY_CPP, map: {} } };
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
    code: [{ lang: 'java', code: `// BRUTE FORCE: tightly coupled + anemic. Compiles, works on day one, hurts on day thirty.
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
}`, alt: [
          { lang: 'python', code: `# BRUTE FORCE: tightly coupled + anemic. Works on day one, hurts on day thirty.
class Order:  # anemic: data only, no protection
    def __init__(self) -> None:
        self.id = ""
        self.status = "NEW"
        self.total = 0.0


class MySqlOrderDao:
    def save(self, o: Order) -> None:
        print("INSERT INTO orders ...", o.id)


class StripeClient:
    def charge(self, amt: float) -> bool:
        print("Stripe charge", amt)
        return True


class SmtpMailer:
    def send(self, to: str, body: str) -> None:
        print(f"SMTP to {to}: {body}")


class OrderService:
    def __init__(self) -> None:
        self._dao = MySqlOrderDao()  # welded to MySQL
        self._stripe = StripeClient()  # welded to Stripe
        self._mailer = SmtpMailer()  # welded to SMTP

    def place(self, o: Order) -> None:
        if o.total <= 0:
            raise RuntimeError("empty order")  # rule copy #1
        self._stripe.charge(o.total)
        o.status = "PAID"
        self._dao.save(o)
        self._mailer.send("customer@example.com", f"Order {o.id} paid")

    def cancel(self, o: Order) -> None:
        if o.status == "SHIPPED":
            raise RuntimeError("too late")  # rule copy #1
        o.status = "CANCELLED"
        self._dao.save(o)


class AdminTool:  # another team, another copy of the rules...
    def force_cancel(self, o: Order) -> None:
        o.status = "CANCELLED"  # forgot the SHIPPED rule!
        MySqlOrderDao().save(o)` },
          { lang: 'ts', code: `// BRUTE FORCE: tightly coupled + anemic. Works on day one, hurts on day thirty.
class Order { // anemic: data only, no protection
  id = "";
  status = "NEW";
  total = 0;
}

class MySqlOrderDao {
  save(o: Order): void { console.log("INSERT INTO orders ... " + o.id); }
}
class StripeClient {
  charge(amt: number): boolean { console.log("Stripe charge " + amt); return true; }
}
class SmtpMailer {
  send(to: string, body: string): void { console.log(\`SMTP to \${to}: \${body}\`); }
}

class OrderService {
  private readonly dao = new MySqlOrderDao(); // welded to MySQL
  private readonly stripe = new StripeClient(); // welded to Stripe
  private readonly mailer = new SmtpMailer(); // welded to SMTP

  place(o: Order): void {
    if (o.total <= 0) throw new Error("empty order"); // rule copy #1
    this.stripe.charge(o.total);
    o.status = "PAID";
    this.dao.save(o);
    this.mailer.send("customer@example.com", \`Order \${o.id} paid\`);
  }

  cancel(o: Order): void {
    if (o.status === "SHIPPED") throw new Error("too late"); // rule copy #1
    o.status = "CANCELLED";
    this.dao.save(o);
  }
}

class AdminTool { // another team, another copy of the rules...
  forceCancel(o: Order): void {
    o.status = "CANCELLED"; // forgot the SHIPPED rule!
    new MySqlOrderDao().save(o);
  }
}` },
          { lang: 'cpp', code: `// BRUTE FORCE: tightly coupled + anemic. Works on day one, hurts on day thirty.
struct Order {  // anemic: data only, no protection
    string id;
    string status = "NEW";
    double total = 0;
};

struct MySqlOrderDao {
    void save(const Order& o) { cout << "INSERT INTO orders ... " << o.id << "\\n"; }
};
struct StripeClient {
    bool charge(double amt) { cout << "Stripe charge " << amt << "\\n"; return true; }
};
struct SmtpMailer {
    void send(const string& to, const string& body) { cout << "SMTP to " << to << ": " << body << "\\n"; }
};

class OrderService {
    MySqlOrderDao dao_;    // welded to MySQL
    StripeClient stripe_;  // welded to Stripe
    SmtpMailer mailer_;    // welded to SMTP

public:
    void place(Order& o) {
        if (o.total <= 0) throw runtime_error("empty order");  // rule copy #1
        stripe_.charge(o.total);
        o.status = "PAID";
        dao_.save(o);
        mailer_.send("customer@example.com", "Order " + o.id + " paid");
    }
    void cancel(Order& o) {
        if (o.status == "SHIPPED") throw runtime_error("too late");  // rule copy #1
        o.status = "CANCELLED";
        dao_.save(o);
    }
};

struct AdminTool {  // another team, another copy of the rules...
    void forceCancel(Order& o) {
        o.status = "CANCELLED";  // forgot the SHIPPED rule!
        MySqlOrderDao().save(o);
    }
};` }
        ] }, { lang: 'java', code: `// THE FIX (preview of the whole module): rich entity + ports + constructor injection.
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
}`, alt: [
          { lang: 'python', code: `# THE FIX (preview of the whole module): rich entity + ports + constructor injection.
from abc import ABC, abstractmethod
from enum import Enum


class PaymentPort(ABC):
    @abstractmethod
    def charge(self, order_id: str, paise: int) -> bool: ...


class Status(Enum):
    NEW = 1
    PAID = 2
    SHIPPED = 3
    CANCELLED = 4


class Order:  # rich: rules live HERE, once
    def __init__(self, order_id: str, total_paise: int) -> None:
        if total_paise <= 0:
            raise ValueError("empty order")
        self._id, self._total_paise, self._status = order_id, total_paise, Status.NEW

    def mark_paid(self) -> None:
        self._require(self._status == Status.NEW, "only NEW orders can be paid")
        self._status = Status.PAID

    def ship(self) -> None:
        self._require(self._status == Status.PAID, "only PAID orders ship")
        self._status = Status.SHIPPED

    def cancel(self) -> None:
        self._require(self._status != Status.SHIPPED, "cannot cancel after shipping")
        self._status = Status.CANCELLED

    @property
    def id(self) -> str:
        return self._id

    @property
    def total_paise(self) -> int:
        return self._total_paise

    @property
    def status(self) -> Status:
        return self._status

    @staticmethod
    def _require(ok: bool, msg: str) -> None:
        if not ok:
            raise RuntimeError(msg)


class OrderRepository(ABC):
    @abstractmethod
    def save(self, o: Order) -> None: ...


class Notifier(ABC):
    @abstractmethod
    def notify(self, order_id: str, message: str) -> None: ...


class OrderService:  # knows only interfaces: no construction of infrastructure
    def __init__(self, payments: PaymentPort, repo: OrderRepository, notifier: Notifier) -> None:
        self._payments, self._repo, self._notifier = payments, repo, notifier

    def place(self, o: Order) -> None:
        if not self._payments.charge(o.id, o.total_paise):
            raise RuntimeError("payment declined")
        o.mark_paid()  # the entity enforces its own rule
        self._repo.save(o)
        self._notifier.notify(o.id, "paid")


class LoggingFakes(PaymentPort, OrderRepository, Notifier):  # one test double playing three ports
    def __init__(self) -> None:
        self.log: list[str] = []

    def charge(self, order_id: str, paise: int) -> bool:
        self.log.append(f"charged {order_id} {paise}")
        return True

    def save(self, o: Order) -> None:
        self.log.append(f"saved {o.id} {o.status.name}")

    def notify(self, order_id: str, message: str) -> None:
        self.log.append(f"notified {order_id} {message}")


def main() -> None:  # composition root: the ONLY place that picks brands
    fakes = LoggingFakes()
    svc = OrderService(fakes, fakes, fakes)
    o = Order("A-1", 49_900)
    svc.place(o)
    o.ship()
    try:
        o.cancel()
    except RuntimeError as e:
        fakes.log.append(f"blocked: {e}")
    for line in fakes.log:
        print(line)


main()` },
          { lang: 'ts', code: `// THE FIX (preview of the whole module): rich entity + ports + constructor injection.
interface PaymentPort { charge(orderId: string, paise: number): boolean; }
interface OrderRepository { save(o: Order): void; }
interface Notifier { notify(orderId: string, message: string): void; }

type Status = "NEW" | "PAID" | "SHIPPED" | "CANCELLED";

class Order { // rich: rules live HERE, once
  private currentStatus: Status = "NEW";

  constructor(readonly id: string, readonly totalPaise: number) {
    if (totalPaise <= 0) throw new Error("empty order");
  }

  markPaid(): void { Order.require(this.currentStatus === "NEW", "only NEW orders can be paid"); this.currentStatus = "PAID"; }
  ship(): void { Order.require(this.currentStatus === "PAID", "only PAID orders ship"); this.currentStatus = "SHIPPED"; }
  cancel(): void { Order.require(this.currentStatus !== "SHIPPED", "cannot cancel after shipping"); this.currentStatus = "CANCELLED"; }
  status(): Status { return this.currentStatus; }

  private static require(ok: boolean, msg: string): void {
    if (!ok) throw new Error(msg);
  }
}

class OrderService { // knows only interfaces: no construction of infrastructure
  constructor(
    private readonly payments: PaymentPort,
    private readonly repo: OrderRepository,
    private readonly notifier: Notifier,
  ) {}

  place(o: Order): void {
    if (!this.payments.charge(o.id, o.totalPaise)) throw new Error("payment declined");
    o.markPaid(); // the entity enforces its own rule
    this.repo.save(o);
    this.notifier.notify(o.id, "paid");
  }
}

// composition root: the ONLY place that picks brands
const log: string[] = [];
const svc = new OrderService(
  { charge: (id, amt) => { log.push(\`charged \${id} \${amt}\`); return true; } }, // fake payment for a test
  { save: (o) => { log.push(\`saved \${o.id} \${o.status()}\`); } },
  { notify: (id, msg) => { log.push(\`notified \${id} \${msg}\`); } },
);
const o = new Order("A-1", 49_900);
svc.place(o);
o.ship();
try { o.cancel(); } catch (e) { log.push(\`blocked: \${(e as Error).message}\`); }
log.forEach((line) => console.log(line));` },
          { lang: 'cpp', code: `// THE FIX (preview of the whole module): rich entity + ports + constructor injection.
enum class Status { NEW, PAID, SHIPPED, CANCELLED };

string name(Status s) {
    static const char* names[] = {"NEW", "PAID", "SHIPPED", "CANCELLED"};
    return names[static_cast<int>(s)];
}

class Order {  // rich: rules live HERE, once
    string id_;
    long long totalPaise_;
    Status status_ = Status::NEW;

    static void require(bool ok, const string& msg) {
        if (!ok) throw runtime_error(msg);
    }

public:
    Order(string id, long long totalPaise) : id_(move(id)), totalPaise_(totalPaise) {
        if (totalPaise <= 0) throw invalid_argument("empty order");
    }
    void markPaid() { require(status_ == Status::NEW, "only NEW orders can be paid"); status_ = Status::PAID; }
    void ship() { require(status_ == Status::PAID, "only PAID orders ship"); status_ = Status::SHIPPED; }
    void cancel() { require(status_ != Status::SHIPPED, "cannot cancel after shipping"); status_ = Status::CANCELLED; }
    const string& id() const { return id_; }
    long long totalPaise() const { return totalPaise_; }
    Status status() const { return status_; }
};

struct PaymentPort {
    virtual ~PaymentPort() = default;
    virtual bool charge(const string& orderId, long long paise) = 0;
};
struct OrderRepository {
    virtual ~OrderRepository() = default;
    virtual void save(const Order& o) = 0;
};
struct Notifier {
    virtual ~Notifier() = default;
    virtual void notify(const string& orderId, const string& message) = 0;
};

class OrderService {  // knows only interfaces; the caller owns them and outlives the service
    PaymentPort& payments_;
    OrderRepository& repo_;
    Notifier& notifier_;

public:
    OrderService(PaymentPort& p, OrderRepository& r, Notifier& n) : payments_(p), repo_(r), notifier_(n) {}
    void place(Order& o) {
        if (!payments_.charge(o.id(), o.totalPaise())) throw runtime_error("payment declined");
        o.markPaid();  // the entity enforces its own rule
        repo_.save(o);
        notifier_.notify(o.id(), "paid");
    }
};

struct LoggingFakes : PaymentPort, OrderRepository, Notifier {  // one test double playing three ports
    vector<string> log;
    bool charge(const string& id, long long amt) override { log.push_back("charged " + id + " " + to_string(amt)); return true; }
    void save(const Order& o) override { log.push_back("saved " + o.id() + " " + name(o.status())); }
    void notify(const string& id, const string& msg) override { log.push_back("notified " + id + " " + msg); }
};

int main() {  // composition root: the ONLY place that picks brands
    LoggingFakes fakes;
    OrderService svc(fakes, fakes, fakes);
    Order o("A-1", 49'900);
    svc.place(o);
    o.ship();
    try {
        o.cancel();
    } catch (const runtime_error& e) {
        fakes.log.push_back(string("blocked: ") + e.what());
    }
    for (const auto& line : fakes.log) cout << line << "\\n";
}` }
        ] }],
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
        frames.push(F('Total damage for one business change: <b>' + touched + ' files</b>, and none of them can be unit-tested without real infrastructure. This is why teams fear "small" changes.', [G('Coupled + anemic', cn, ce, { h: 70, hl: hl }), CODE('the root cause', 'private final StripeClient stripe = new StripeClient();\nprivate final MySqlOrderDao dao = new MySqlOrderDao();\n// and in 3 services:\norder.setStatus("CANCELLED");', { 1: 'bad', 2: 'bad', 4: 'bad' }, ROOT_ALT)]));
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
}`, alt: [
          { lang: 'python', code: `class Account:
    def __init__(self) -> None:
        self._balance = 0

    def deposit(self, amt: int) -> None:
        if amt <= 0:
            raise ValueError("amount > 0")
        self._balance += amt

    def withdraw(self, amt: int) -> None:
        if amt <= 0:
            raise ValueError("amount > 0")
        if amt > self._balance:
            raise RuntimeError("insufficient funds")
        self._balance -= amt

    @property
    def balance(self) -> int:  # read-only view, no setter
        return self._balance` },
          { lang: 'ts', code: `class Account {
  private amount = 0;

  deposit(amt: number): void {
    if (amt <= 0) throw new Error("amount > 0");
    this.amount += amt;
  }

  withdraw(amt: number): void {
    if (amt <= 0) throw new Error("amount > 0");
    if (amt > this.amount) throw new Error("insufficient funds");
    this.amount -= amt;
  }

  balance(): number { return this.amount; } // read-only view, no setter
}` },
          { lang: 'cpp', code: `class Account {
    long long balance_ = 0;

public:
    void deposit(long long amt) {
        if (amt <= 0) throw invalid_argument("amount > 0");
        balance_ += amt;
    }
    void withdraw(long long amt) {
        if (amt <= 0) throw invalid_argument("amount > 0");
        if (amt > balance_) throw runtime_error("insufficient funds");
        balance_ -= amt;
    }
    long long balance() const { return balance_; }  // read-only view, no setter
};` }
        ] },
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
      constraints: `Amounts in paise (long). Daily limit resets when the date changes (inject a clock; do not read the system date inside the entity).`,
      example: `<p>Balance 5000, pay 3000 → ${H.c('g', 'ok, balance 2000')}. Pay 3000 again → ${H.c('r', 'insufficient funds')}. Freeze, top up 1000 → ${H.c('g', 'ok, 3000')}. Pay 100 → ${H.c('r', 'wallet frozen')}. Each rule fires from <b>inside</b> <code>Wallet</code>, so no service can forget it.</p>`,
      brute: { why: `<p>Each service repeats the checks; <code>AdminService.adjust</code> forgot the negative-balance check, and the daily limit exists only in <code>PayService</code>. A new <code>RefundService</code> will copy one of them — probably the buggy one. Nothing stops <code>wallet.setBalance(-1)</code>.</p>`, code: { lang: 'java', code: `class Wallet {
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
}`, alt: [{ lang: 'python', code: "class Wallet:                                   # a bag of data: no rules of its own\n    def __init__(self):\n        self.balance, self.frozen = 0, False\n\nclass PayService:\n    def __init__(self): self.spent_today = 0\n    def pay(self, w, amt):\n        if w.frozen: raise RuntimeError(\"frozen\")\n        if w.balance < amt: raise RuntimeError(\"insufficient\")\n        if self.spent_today + amt > 1_000_000: raise RuntimeError(\"limit\")\n        w.balance -= amt; self.spent_today += amt\n\nclass AdminService:\n    def adjust(self, w, delta): w.balance += delta   # can go negative!\n" }, { lang: 'ts', code: "class Wallet {                                   // a bag of data: no rules of its own\n  balance = 0; frozen = false;\n}\nclass PayService {\n  spentToday = 0;\n  pay(w: Wallet, amt: number): void {\n    if (w.frozen) throw new Error(\"frozen\");\n    if (w.balance < amt) throw new Error(\"insufficient\");\n    if (this.spentToday + amt > 1_000_000) throw new Error(\"limit\");\n    w.balance -= amt; this.spentToday += amt;\n  }\n}\nclass AdminService {\n  adjust(w: Wallet, delta: number): void { w.balance += delta; }   // can go negative!\n}\n" }, { lang: 'cpp', code: "struct Wallet {                                 // a bag of data: no rules of its own\n    long long balance = 0; bool frozen = false;\n};\nstruct PayService {\n    long long spentToday = 0;\n    void pay(Wallet& w, long long amt) {\n        if (w.frozen) throw runtime_error(\"frozen\");\n        if (w.balance < amt) throw runtime_error(\"insufficient\");\n        if (spentToday + amt > 1'000'000) throw runtime_error(\"limit\");\n        w.balance -= amt; spentToday += amt;\n    }\n};\nstruct AdminService {\n    void adjust(Wallet& w, long long delta) { w.balance += delta; }   // can go negative!\n};\n" }] } },
      mcq: { q: 'Where should the "daily spend limit" rule live?', options: ['Inside Wallet.pay(), using an injected clock to know the date', 'In PayService, because it is about paying', 'In a database trigger', 'In the controller, validated from the request'], answer: 0, explain: 'The limit protects the wallet\'s own state, so it is an invariant of Wallet. The clock is injected so the rule stays testable and the entity stays free of infrastructure.' },
      hints: [`<p>Hint 1: Delete the setters. Replace them with verbs from the business: <code>topUp</code>, <code>pay</code>, <code>freeze</code>, <code>unfreeze</code>.</p>`, `<p>Hint 2: The daily limit needs "today". Pass a clock into the constructor (Java <code>java.time.Clock</code>, a <code>() -&gt; date</code> function in Python and TypeScript, a clock interface or <code>std::function</code> in C++); keep <code>spentToday</code> and <code>spentOn</code> as private fields.</p>`, `<p>Hint 3: Recipe: guard positive amount → guard frozen → reset daily counter if date changed → guard limit → guard balance → mutate. Order matters only for which error message wins.</p>`],
      tests: { io: true, cases: [{ stdin: '', stdout: "balance 2000\ninsufficient funds\nwallet frozen\nbalance 3000\namount must be > 0\ndaily limit exceeded\nbalance 1005999\n" }] },
      solution: {
        approach: `<p>Turn <code>Wallet</code> into a <b>rich entity</b>: private fields, no setters, behaviour methods named after business verbs, every invariant checked inside. Time comes from an injected <code>Clock</code> so tests can move the date. Services shrink to "load wallet, call one method, save" — they cannot break the rules even if they try.</p>`,
        code: `class MutableClock extends Clock {                      // test double: the date moves when we say so
    private Instant now;
    MutableClock(Instant start) { now = start; }
    void plusDays(long days) { now = now.plusSeconds(days * 86_400); }
    public Instant instant() { return now; }
    public ZoneId getZone() { return ZoneOffset.UTC; }
    public Clock withZone(ZoneId zone) { return this; }
}

class Wallet {
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

    static void attempt(Runnable action) {
        try { action.run(); } catch (RuntimeException e) { System.out.println(e.getMessage()); }
    }

    public static void main(String[] args) {
        MutableClock clock = new MutableClock(Instant.parse("2026-01-01T10:00:00Z"));
        Wallet w = new Wallet("W1", clock);
        w.topUp(5000); w.pay(3000);
        System.out.println("balance " + w.balance());            // 2000
        attempt(() -> w.pay(3000));                              // insufficient funds
        w.freeze(); w.topUp(1000);
        attempt(() -> w.pay(100));                               // wallet frozen
        System.out.println("balance " + w.balance());            // 3000
        w.unfreeze();
        attempt(() -> w.topUp(0));                               // amount must be > 0
        w.topUp(2_000_000); w.pay(997_000);                      // today's spend is now exactly 10,000
        attempt(() -> w.pay(1));                                 // daily limit exceeded
        clock.plusDays(1); w.pay(1);                             // next day the counter resets
        System.out.println("balance " + w.balance());            // 1005999
    }
}`,
        alt: [
          { lang: 'python', code: `from datetime import date, timedelta
from typing import Callable

DAILY_LIMIT = 1_000_000  # Rs 10,000 in paise


class MutableClock:  # test double: the date moves when we say so
    def __init__(self, today: date) -> None:
        self._today = today

    def plus_days(self, days: int) -> None:
        self._today += timedelta(days=days)

    def __call__(self) -> date:
        return self._today


class Wallet:
    def __init__(self, wallet_id: str, clock: Callable[[], date]) -> None:
        self._id = wallet_id
        self._clock = clock
        self._balance = 0
        self._frozen = False
        self._spent_today = 0
        self._spent_on = clock()

    def top_up(self, amt: int) -> None:  # allowed even when frozen
        self._positive(amt)
        self._balance += amt

    def pay(self, amt: int) -> None:
        self._positive(amt)
        if self._frozen:
            raise RuntimeError("wallet frozen")
        today = self._clock()
        if today != self._spent_on:  # new day, reset counter
            self._spent_on, self._spent_today = today, 0
        if self._spent_today + amt > DAILY_LIMIT:
            raise RuntimeError("daily limit exceeded")
        if amt > self._balance:
            raise RuntimeError("insufficient funds")
        self._balance -= amt
        self._spent_today += amt

    def freeze(self) -> None:
        self._frozen = True

    def unfreeze(self) -> None:
        self._frozen = False

    @property
    def balance(self) -> int:
        return self._balance

    @property
    def id(self) -> str:
        return self._id

    @staticmethod
    def _positive(amt: int) -> None:
        if amt <= 0:
            raise ValueError("amount must be > 0")


def attempt(action: Callable[[], None]) -> None:
    try:
        action()
    except (ValueError, RuntimeError) as e:
        print(e)


clock = MutableClock(date(2026, 1, 1))
w = Wallet("W1", clock)
w.top_up(5000)
w.pay(3000)
print(f"balance {w.balance}")  # 2000
attempt(lambda: w.pay(3000))  # insufficient funds
w.freeze()
w.top_up(1000)
attempt(lambda: w.pay(100))  # wallet frozen
print(f"balance {w.balance}")  # 3000
w.unfreeze()
attempt(lambda: w.top_up(0))  # amount must be > 0
w.top_up(2_000_000)
w.pay(997_000)  # today's spend is now exactly 10,000
attempt(lambda: w.pay(1))  # daily limit exceeded
clock.plus_days(1)
w.pay(1)  # next day the counter resets
print(f"balance {w.balance}")  # 1005999` },
          { lang: 'ts', code: `const DAILY_LIMIT = 1_000_000; // Rs 10,000 in paise

type Clock = () => number; // returns today as a day number

class MutableClock { // test double: the date moves when we say so
  constructor(private day: number) {}
  plusDays(days: number): void { this.day += days; }
  readonly now: Clock = () => this.day;
}

class Wallet {
  private balanceValue = 0;
  private frozen = false;
  private spentToday = 0;
  private spentOn: number;

  constructor(private readonly id: string, private readonly clock: Clock) {
    this.spentOn = clock();
  }

  topUp(amt: number): void { // allowed even when frozen
    Wallet.positive(amt);
    this.balanceValue += amt;
  }

  pay(amt: number): void {
    Wallet.positive(amt);
    if (this.frozen) throw new Error("wallet frozen");
    const today = this.clock();
    if (today !== this.spentOn) { this.spentOn = today; this.spentToday = 0; } // new day, reset counter
    if (this.spentToday + amt > DAILY_LIMIT) throw new Error("daily limit exceeded");
    if (amt > this.balanceValue) throw new Error("insufficient funds");
    this.balanceValue -= amt;
    this.spentToday += amt;
  }

  freeze(): void { this.frozen = true; }
  unfreeze(): void { this.frozen = false; }
  balance(): number { return this.balanceValue; }
  walletId(): string { return this.id; }

  private static positive(amt: number): void {
    if (amt <= 0) throw new Error("amount must be > 0");
  }
}

function attempt(action: () => void): void {
  try { action(); } catch (e) { console.log((e as Error).message); }
}

const clock = new MutableClock(20454);
const w = new Wallet("W1", clock.now);
w.topUp(5000);
w.pay(3000);
console.log(\`balance \${w.balance()}\`); // 2000
attempt(() => w.pay(3000)); // insufficient funds
w.freeze();
w.topUp(1000);
attempt(() => w.pay(100)); // wallet frozen
console.log(\`balance \${w.balance()}\`); // 3000
w.unfreeze();
attempt(() => w.topUp(0)); // amount must be > 0
w.topUp(2_000_000);
w.pay(997_000); // today's spend is now exactly 10,000
attempt(() => w.pay(1)); // daily limit exceeded
clock.plusDays(1);
w.pay(1); // next day the counter resets
console.log(\`balance \${w.balance()}\`); // 1005999` },
          { lang: 'cpp', code: `constexpr long long DAILY_LIMIT = 1'000'000;  // Rs 10,000 in paise

struct Clock {
    virtual ~Clock() = default;
    virtual long long today() const = 0;  // day number
};

class MutableClock : public Clock {  // test double: the date moves when we say so
    long long day_;
public:
    explicit MutableClock(long long day) : day_(day) {}
    void plusDays(long long days) { day_ += days; }
    long long today() const override { return day_; }
};

class Wallet {
    string id_;
    const Clock& clock_;  // the caller owns the clock and outlives the wallet
    long long balance_ = 0;
    bool frozen_ = false;
    long long spentToday_ = 0;
    long long spentOn_;

    static void positive(long long amt) {
        if (amt <= 0) throw invalid_argument("amount must be > 0");
    }

public:
    Wallet(string id, const Clock& clock) : id_(move(id)), clock_(clock), spentOn_(clock.today()) {}

    void topUp(long long amt) { positive(amt); balance_ += amt; }  // allowed even when frozen
    void pay(long long amt) {
        positive(amt);
        if (frozen_) throw runtime_error("wallet frozen");
        long long today = clock_.today();
        if (today != spentOn_) { spentOn_ = today; spentToday_ = 0; }  // new day, reset counter
        if (spentToday_ + amt > DAILY_LIMIT) throw runtime_error("daily limit exceeded");
        if (amt > balance_) throw runtime_error("insufficient funds");
        balance_ -= amt;
        spentToday_ += amt;
    }
    void freeze() { frozen_ = true; }
    void unfreeze() { frozen_ = false; }
    long long balance() const { return balance_; }
    const string& id() const { return id_; }
};

void attempt(const function<void()>& action) {
    try { action(); } catch (const exception& e) { cout << e.what() << "\\n"; }
}

int main() {
    MutableClock clock(20454);
    Wallet w("W1", clock);
    w.topUp(5000);
    w.pay(3000);
    cout << "balance " << w.balance() << "\\n";  // 2000
    attempt([&] { w.pay(3000); });               // insufficient funds
    w.freeze();
    w.topUp(1000);
    attempt([&] { w.pay(100); });                // wallet frozen
    cout << "balance " << w.balance() << "\\n";  // 3000
    w.unfreeze();
    attempt([&] { w.topUp(0); });                // amount must be > 0
    w.topUp(2'000'000);
    w.pay(997'000);                              // today's spend is now exactly 10,000
    attempt([&] { w.pay(1); });                  // daily limit exceeded
    clock.plusDays(1);
    w.pay(1);                                    // next day the counter resets
    cout << "balance " << w.balance() << "\\n";  // 1005999
}` }
        ],
        complexity: `<p>O(1) per operation. Rule copies: 1. Number of ways to put the wallet into an invalid state from outside: 0.</p>`,
        followUps: ['How would an admin correction work without a raw setter? (An explicit <code>adjust(amount, reason)</code> method that still enforces non-negative balance and records an audit event.)', 'Why inject a clock instead of reading the current date inside the entity?', 'How would you make Wallet safe under concurrent pay() calls?']
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
      '"Make the <b>time</b> / random / UUID controllable" → inject a clock, an id supplier and a random generator (Java <code>Clock</code>, <code>Supplier&lt;UUID&gt;</code>, <code>RandomGenerator</code>; in other languages plain functions or small interfaces).',
      '"Explain how Spring <code>@Autowired</code> works" → container: registry of bindings + recursive resolution + scopes + proxies.',
      '"Singleton pattern" in an LLD answer → interviewer may push back: prefer one instance <b>managed by the composition root</b> (DI singleton scope) over a static <code>getInstance()</code>.',
      '"Circular dependency error at startup" → resolution stack detected A → B → A; fix the design, do not reach for setter injection.',
      'Class has <b>7+ constructor parameters</b> → the class does too much (SRP smell), not a DI problem.'
    ],
    code: [{ lang: 'java', code: `// 1) Pure manual DI. No framework. main() is the composition root.
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
}`, alt: [
          { lang: 'python', code: `# 1) Pure manual DI. No framework. The bottom of the file is the composition root.
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Callable


class OrderRepository(ABC):
    @abstractmethod
    def save(self, order_id: str) -> None: ...

    @abstractmethod
    def all(self) -> list[str]: ...


class PaymentPort(ABC):
    @abstractmethod
    def charge(self, order_id: str, paise: int) -> bool: ...


class InMemoryOrderRepository(OrderRepository):
    def __init__(self) -> None:
        self._rows: list[str] = []

    def save(self, order_id: str) -> None:
        self._rows.append(order_id)

    def all(self) -> list[str]:
        return list(self._rows)


class FakePayments(PaymentPort):
    def __init__(self, limit: int) -> None:
        self._limit = limit

    def charge(self, order_id: str, paise: int) -> bool:
        return paise <= self._limit


class OrderService:
    # Every dependency is visible in ONE place and required.
    def __init__(self, repo: OrderRepository, payments: PaymentPort, clock: Callable[[], datetime]) -> None:
        self._repo, self._payments, self._clock = repo, payments, clock

    def place(self, order_id: str, paise: int) -> str:
        if not self._payments.charge(order_id, paise):
            return f"DECLINED {order_id}"
        self._repo.save(order_id)
        return f"PLACED {order_id} at {self._clock():%H:%M}"


# Leaves first...
clock = lambda: datetime(2026, 3, 1, 9, 30, tzinfo=timezone.utc)  # noqa: E731
repo = InMemoryOrderRepository()
payments = FakePayments(100_000)
# ...root last.
svc = OrderService(repo, payments, clock)
print(svc.place("A-1", 50_000))  # PLACED A-1 at 09:30
print(svc.place("A-2", 500_000))  # DECLINED A-2
print(repo.all())  # ['A-1']` },
          { lang: 'ts', code: `// 1) Pure manual DI. No framework. The bottom of the file is the composition root.
interface OrderRepository { save(id: string): void; all(): string[]; }
interface PaymentPort { charge(orderId: string, paise: number): boolean; }

class InMemoryOrderRepository implements OrderRepository {
  private readonly rows: string[] = [];
  save(id: string): void { this.rows.push(id); }
  all(): string[] { return [...this.rows]; }
}
class FakePayments implements PaymentPort {
  constructor(private readonly limit: number) {}
  charge(_orderId: string, paise: number): boolean { return paise <= this.limit; }
}

class OrderService {
  // Every dependency is visible in ONE place, readonly, and required.
  constructor(
    private readonly repo: OrderRepository,
    private readonly payments: PaymentPort,
    private readonly clock: () => Date,
  ) {}

  place(id: string, paise: number): string {
    if (!this.payments.charge(id, paise)) return \`DECLINED \${id}\`;
    this.repo.save(id);
    return \`PLACED \${id} at \${this.clock().toISOString().slice(11, 16)}\`;
  }
}

// Leaves first...
const clock = (): Date => new Date("2026-03-01T09:30:00Z");
const repo = new InMemoryOrderRepository();
const payments = new FakePayments(100_000);
// ...root last.
const svc = new OrderService(repo, payments, clock);
console.log(svc.place("A-1", 50_000)); // PLACED A-1 at 09:30
console.log(svc.place("A-2", 500_000)); // DECLINED A-2
console.log(repo.all()); // [ 'A-1' ]` },
          { lang: 'cpp', code: `// 1) Pure manual DI. No framework. main() is the composition root.
struct OrderRepository {
    virtual ~OrderRepository() = default;
    virtual void save(const string& id) = 0;
    virtual vector<string> all() const = 0;
};
struct PaymentPort {
    virtual ~PaymentPort() = default;
    virtual bool charge(const string& orderId, long long paise) = 0;
};

class InMemoryOrderRepository : public OrderRepository {
    vector<string> rows_;
public:
    void save(const string& id) override { rows_.push_back(id); }
    vector<string> all() const override { return rows_; }
};
class FakePayments : public PaymentPort {
    long long limit_;
public:
    explicit FakePayments(long long limit) : limit_(limit) {}
    bool charge(const string&, long long paise) override { return paise <= limit_; }
};

class OrderService {
    OrderRepository& repo_;  // main owns the parts and outlives the service
    PaymentPort& payments_;
    function<int()> clock_;  // minutes since midnight

public:
    // Every dependency is visible in ONE place and required (references cannot be null).
    OrderService(OrderRepository& repo, PaymentPort& payments, function<int()> clock)
        : repo_(repo), payments_(payments), clock_(move(clock)) {}

    string place(const string& id, long long paise) {
        if (!payments_.charge(id, paise)) return "DECLINED " + id;
        repo_.save(id);
        char hhmm[8];
        snprintf(hhmm, sizeof hhmm, "%02d:%02d", clock_() / 60, clock_() % 60);
        return "PLACED " + id + " at " + hhmm;
    }
};

int main() {
    // Leaves first...
    auto clock = [] { return 9 * 60 + 30; };
    InMemoryOrderRepository repo;
    FakePayments payments(100'000);
    // ...root last.
    OrderService svc(repo, payments, clock);
    cout << svc.place("A-1", 50'000) << "\\n";   // PLACED A-1 at 09:30
    cout << svc.place("A-2", 500'000) << "\\n";  // DECLINED A-2
    cout << "[" << repo.all()[0] << "]\\n";      // [A-1]
}` }
        ] }, { lang: 'java', code: `// 2) A tiny DI container: bindings + scopes + recursive resolution + cycle detection.
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
}`, alt: [
          { lang: 'python', code: `# 2) A tiny DI container: bindings + scopes + recursive resolution + cycle detection.
from enum import Enum
from typing import Any, Callable


class Scope(Enum):
    SINGLETON = 1
    PROTOTYPE = 2


class Container:
    def __init__(self) -> None:
        self._bindings: dict[type, tuple[Callable[["Container"], Any], Scope]] = {}
        self._singletons: dict[type, Any] = {}
        self._resolving: list[type] = []  # the "resolution stack"

    def singleton(self, type_: type, factory: Callable[["Container"], Any]) -> "Container":
        self._bindings[type_] = (factory, Scope.SINGLETON)
        return self

    def prototype(self, type_: type, factory: Callable[["Container"], Any]) -> "Container":
        self._bindings[type_] = (factory, Scope.PROTOTYPE)
        return self

    def get(self, type_: type) -> Any:
        if type_ not in self._bindings:
            raise RuntimeError(f"No binding for {type_.__name__}")
        factory, scope = self._bindings[type_]
        if scope is Scope.SINGLETON and type_ in self._singletons:
            return self._singletons[type_]  # cache hit
        if type_ in self._resolving:  # we are already building this type higher up the stack
            path = [t.__name__ for t in self._resolving] + [type_.__name__]
            raise RuntimeError("Dependency cycle: " + " -> ".join(path))
        self._resolving.append(type_)
        try:
            instance = factory(self)  # factory calls get(...) for its own dependencies
            if scope is Scope.SINGLETON:
                self._singletons[type_] = instance
            return instance
        finally:
            self._resolving.pop()


class Greeter:
    def greet(self, name: str) -> str:
        raise NotImplementedError


class Clock:
    def __init__(self, today: str) -> None:
        self.today = today


class Prefix:
    def __init__(self, text: str) -> None:
        self.text = text


class PoliteGreeter(Greeter):
    def __init__(self, prefix: Prefix, clock: Clock) -> None:
        self._prefix, self._clock = prefix, clock

    def greet(self, name: str) -> str:
        return f"{self._prefix.text} {name} ({self._clock.today})"


class A:
    def __init__(self, b: "B") -> None:
        self.b = b


class B:
    def __init__(self, a: A) -> None:
        self.a = a


c = (Container()
     .singleton(Clock, lambda k: Clock("2026-05-05"))
     .singleton(Prefix, lambda k: Prefix("Namaste"))
     .prototype(Greeter, lambda k: PoliteGreeter(k.get(Prefix), k.get(Clock))))
print(c.get(Greeter).greet("Asha"))
print("same Clock?", str(c.get(Clock) is c.get(Clock)).lower())  # true  (singleton)
print("same Greeter?", str(c.get(Greeter) is c.get(Greeter)).lower())  # false (prototype)
c.singleton(A, lambda k: A(k.get(B))).singleton(B, lambda k: B(k.get(A)))
try:
    c.get(A)
except RuntimeError as e:
    print(e)  # A -> B -> A` },
          { lang: 'ts', code: `// 2) A tiny DI container: bindings + scopes + recursive resolution + cycle detection.
type Token<T> = abstract new (...args: any[]) => T;
type Scope = "SINGLETON" | "PROTOTYPE";
interface Binding { readonly factory: (c: Container) => unknown; readonly scope: Scope; }

class Container {
  private readonly bindings = new Map<Token<unknown>, Binding>();
  private readonly singletons = new Map<Token<unknown>, unknown>();
  private readonly resolving: Token<unknown>[] = []; // the "resolution stack"

  singleton<T>(type: Token<T>, factory: (c: Container) => T): this {
    this.bindings.set(type, { factory, scope: "SINGLETON" });
    return this;
  }
  prototype<T>(type: Token<T>, factory: (c: Container) => T): this {
    this.bindings.set(type, { factory, scope: "PROTOTYPE" });
    return this;
  }

  get<T>(type: Token<T>): T {
    const b = this.bindings.get(type);
    if (b === undefined) throw new Error(\`No binding for \${type.name}\`);
    if (b.scope === "SINGLETON" && this.singletons.has(type)) return this.singletons.get(type) as T; // cache hit
    if (this.resolving.includes(type)) { // we are already building this type higher up the stack
      const path = [...this.resolving.map((t) => t.name), type.name];
      throw new Error("Dependency cycle: " + path.join(" -> "));
    }
    this.resolving.push(type);
    try {
      const instance = b.factory(this); // factory calls get(...) for its own dependencies
      if (b.scope === "SINGLETON") this.singletons.set(type, instance);
      return instance as T;
    } finally {
      this.resolving.pop();
    }
  }
}

abstract class Greeter { abstract greet(name: string): string; }
class Clock { constructor(readonly today: string) {} }
class Prefix { constructor(readonly text: string) {} }
class PoliteGreeter extends Greeter {
  constructor(private readonly prefix: Prefix, private readonly clock: Clock) { super(); }
  greet(n: string): string { return \`\${this.prefix.text} \${n} (\${this.clock.today})\`; }
}
class A { constructor(readonly b: B) {} }
class B { constructor(readonly a: A) {} }

const c = new Container()
  .singleton(Clock, () => new Clock("2026-05-05"))
  .singleton(Prefix, () => new Prefix("Namaste"))
  .prototype(Greeter, (k) => new PoliteGreeter(k.get(Prefix), k.get(Clock)));
console.log(c.get(Greeter).greet("Asha"));
console.log("same Clock? " + (c.get(Clock) === c.get(Clock))); // true  (singleton)
console.log("same Greeter? " + (c.get(Greeter) === c.get(Greeter))); // false (prototype)
c.singleton(A, (k) => new A(k.get(B))).singleton(B, (k) => new B(k.get(A)));
try { c.get(A); } catch (e) { console.log((e as Error).message); } // A -> B -> A` },
          { lang: 'cpp', code: `// 2) A tiny DI container: bindings + scopes + recursive resolution + cycle detection.
// C++ has no portable run-time type names, so each binding carries its display name.
class Container {
    enum class Scope { SINGLETON, PROTOTYPE };
    struct Binding {
        string name;
        function<shared_ptr<void>(Container&)> factory;
        Scope scope;
    };

    unordered_map<type_index, Binding> bindings_;
    unordered_map<type_index, shared_ptr<void>> singletons_;
    vector<type_index> resolving_;  // the "resolution stack"

    template <class T, class F>
    Container& bind(string name, F f, Scope scope) {
        bindings_.insert_or_assign(type_index(typeid(T)), Binding{move(name), [f](Container& c) {
            return static_pointer_cast<void>(shared_ptr<T>(f(c)));
        }, scope});
        return *this;
    }

public:
    template <class T, class F>
    Container& singleton(string name, F f) { return bind<T>(move(name), f, Scope::SINGLETON); }
    template <class T, class F>
    Container& prototype(string name, F f) { return bind<T>(move(name), f, Scope::PROTOTYPE); }

    template <class T>
    shared_ptr<T> get() {
        type_index key(typeid(T));
        auto it = bindings_.find(key);
        if (it == bindings_.end()) throw runtime_error(string("No binding for ") + typeid(T).name());
        const Binding& b = it->second;
        if (b.scope == Scope::SINGLETON) {
            if (auto hit = singletons_.find(key); hit != singletons_.end()) return static_pointer_cast<T>(hit->second);  // cache hit
        }
        if (find(resolving_.begin(), resolving_.end(), key) != resolving_.end()) {  // already building this type higher up
            string path;
            for (const auto& t : resolving_) path += bindings_.at(t).name + " -> ";
            throw runtime_error("Dependency cycle: " + path + b.name);
        }
        resolving_.push_back(key);
        struct Pop { vector<type_index>& s; ~Pop() { s.pop_back(); } } pop{resolving_};  // like a finally block
        shared_ptr<void> instance = b.factory(*this);  // factory calls get<...>() for its own dependencies
        if (b.scope == Scope::SINGLETON) singletons_[key] = instance;
        return static_pointer_cast<T>(instance);
    }
};

struct Greeter {
    virtual ~Greeter() = default;
    virtual string greet(const string& name) const = 0;
};
struct Clock { string today; };
struct Prefix { string text; };
struct PoliteGreeter : Greeter {
    shared_ptr<Prefix> prefix;
    shared_ptr<Clock> clock;
    PoliteGreeter(shared_ptr<Prefix> p, shared_ptr<Clock> c) : prefix(move(p)), clock(move(c)) {}
    string greet(const string& n) const override { return prefix->text + " " + n + " (" + clock->today + ")"; }
};
struct B;
struct A { shared_ptr<B> b; };
struct B { shared_ptr<A> a; };

int main() {
    Container c;
    c.singleton<Clock>("Clock", [](Container&) { return make_shared<Clock>(Clock{"2026-05-05"}); })
     .singleton<Prefix>("Prefix", [](Container&) { return make_shared<Prefix>(Prefix{"Namaste"}); })
     .prototype<Greeter>("Greeter", [](Container& k) { return make_shared<PoliteGreeter>(k.get<Prefix>(), k.get<Clock>()); });
    cout << c.get<Greeter>()->greet("Asha") << "\\n";
    cout << boolalpha << "same Clock? " << (c.get<Clock>() == c.get<Clock>()) << "\\n";        // true  (singleton)
    cout << "same Greeter? " << (c.get<Greeter>() == c.get<Greeter>()) << "\\n";               // false (prototype)
    c.singleton<A>("A", [](Container& k) { return make_shared<A>(A{k.get<B>()}); })
     .singleton<B>("B", [](Container& k) { return make_shared<B>(B{k.get<A>()}); });
    try {
        c.get<A>();
    } catch (const runtime_error& e) {
        cout << e.what() << "\\n";  // A -> B -> A
    }
}` }
        ] }, { lang: 'java', check: false, title: 'For comparison only: the same wiring in Spring (needs the framework)', code: `@Configuration
class AppConfig {
    @Bean Clock clock() { return Clock.systemUTC(); }
    @Bean OrderRepository orderRepository(DataSource ds) { return new JdbcOrderRepository(ds); }
    @Bean OrderService orderService(OrderRepository r, PaymentPort p, Clock c) { return new OrderService(r, p, c); }
}
// Spring scans @Bean methods, builds a graph of BeanDefinitions, resolves it like our Container,
// caches singletons, and wraps beans in proxies for @Transactional / @Async.` }],
    codeTitle: ['Manual DI: composition root in main()', 'Build your own DI container (singleton/prototype + cycle detection)', 'Framework version in Java/Spring (not compiled)'],
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
// assert svc.place("X", 100).startsWith("DECLINED") && repo.all().isEmpty();`, alt: [
          { lang: 'python', code: `from abc import ABC, abstractmethod


class PaymentPort(ABC):
    @abstractmethod
    def charge(self, order_id: str, paise: int) -> bool: ...


class DeclineAll(PaymentPort):
    def charge(self, order_id: str, paise: int) -> bool:
        return False


# test:
# repo = InMemoryOrderRepository()
# svc = OrderService(repo, DeclineAll(), clock)
# assert svc.place("X", 100).startswith("DECLINED") and not repo.all()` },
          { lang: 'ts', code: `interface PaymentPort { charge(orderId: string, paise: number): boolean; }
const declineAll: PaymentPort = { charge: () => false };
// test:
// const repo = new InMemoryOrderRepository();
// const svc = new OrderService(repo, declineAll, clock);
// console.assert(svc.place("X", 100).startsWith("DECLINED") && repo.all().length === 0);` },
          { lang: 'cpp', code: `struct PaymentPort {
    virtual ~PaymentPort() = default;
    virtual bool charge(const string& orderId, long long paise) = 0;
};
struct DeclineAll : PaymentPort {
    bool charge(const string&, long long) override { return false; }
};
// test:
// InMemoryOrderRepository repo;
// DeclineAll decline;
// OrderService svc(repo, decline, clock);
// assert(svc.place("X", 100).starts_with("DECLINED") && repo.all().empty());` }
        ] },
      { title: 'Injecting time and randomness', html: `<p>Any code that calls <code>LocalDate.now()</code>, <code>UUID.randomUUID()</code> or <code>Math.random()</code> has a <b>hidden dependency</b> on the world. Inject <code>Clock</code> and <code>Supplier&lt;String&gt; idGen</code>. Tests use <code>Clock.fixed(...)</code> and <code>() -&gt; "id-1"</code>; production uses <code>Clock.systemUTC()</code> and <code>UUID::randomUUID</code>.</p>`, code: `class TicketFactory {
    private final Clock clock; private final Supplier<String> ids;
    TicketFactory(Clock clock, Supplier<String> ids) { this.clock = clock; this.ids = ids; }
    String newTicket() { return ids.get() + "@" + Instant.now(clock); }
}`, alt: [
          { lang: 'python', code: `from datetime import datetime
from typing import Callable


class TicketFactory:
    def __init__(self, clock: Callable[[], datetime], ids: Callable[[], str]) -> None:
        self._clock, self._ids = clock, ids

    def new_ticket(self) -> str:
        return f"{self._ids()}@{self._clock().isoformat()}"` },
          { lang: 'ts', code: `class TicketFactory {
  constructor(private readonly clock: () => Date, private readonly ids: () => string) {}
  newTicket(): string { return \`\${this.ids()}@\${this.clock().toISOString()}\`; }
}` },
          { lang: 'cpp', code: `class TicketFactory {
    function<string()> clock_, ids_;  // the clock returns an ISO timestamp, tests pass fixed lambdas

public:
    TicketFactory(function<string()> clock, function<string()> ids) : clock_(move(clock)), ids_(move(ids)) {}
    string newTicket() const { return ids_() + "@" + clock_(); }
};` }
        ] },
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
      brute: { why: `<p>The fee logic is correct but untestable: to test the night fee you must run the test after 11 pm, it charges real money in Razorpay's sandbox, and sends real SMS. Switching SMS vendor edits <code>CheckoutService</code>.</p>`, code: { lang: 'java', code: `class CheckoutServiceBrute {
    long checkout(String cartId) {
        long total = 450 * 100;                                   // pretend: new MySqlCartDao().load(cartId)
        long fee = total > 50_000 ? 0 : 3_000;
        if (LocalDateTime.now().getHour() >= 23) fee += 2_000;   // hidden dependency on the real clock
        long charge = total + fee;
        System.out.println("Razorpay charge " + charge);         // pretend: new RazorpayClient().charge(...)
        System.out.println("MSG91 SMS: order placed");           // pretend: new Msg91Sms().send(...)
        return charge;
    }
}`, alt: [{ lang: 'python', code: "from datetime import datetime\n\nclass CheckoutServiceBrute:\n    def checkout(self, cart_id):\n        total = 450 * 100                                  # pretend: MySqlCartDao().load(cart_id)\n        fee = 0 if total > 50_000 else 3_000\n        if datetime.now().hour >= 23: fee += 2_000         # hidden dependency on the real clock\n        charge = total + fee\n        print(\"Razorpay charge\", charge)                   # pretend: RazorpayClient().charge(...)\n        print(\"MSG91 SMS: order placed\")                   # pretend: Msg91Sms().send(...)\n        return charge\n" }, { lang: 'ts', code: "class CheckoutServiceBrute {\n  checkout(cartId: string): number {\n    const total = 450 * 100;                                    // pretend: new MySqlCartDao().load(cartId)\n    let fee = total > 50_000 ? 0 : 3_000;\n    if (new Date().getHours() >= 23) fee += 2_000;              // hidden dependency on the real clock\n    const charge = total + fee;\n    console.log(\"Razorpay charge \" + charge);                   // pretend: new RazorpayClient().charge(...)\n    console.log(\"MSG91 SMS: order placed\");                     // pretend: new Msg91Sms().send(...)\n    return charge;\n  }\n}\n" }, { lang: 'cpp', code: "class CheckoutServiceBrute {\npublic:\n    long long checkout(const string& cartId) {\n        long long total = 450 * 100;                            // pretend: MySqlCartDao().load(cartId)\n        long long fee = total > 50'000 ? 0 : 3'000;\n        time_t now = time(nullptr);\n        if (localtime(&now)->tm_hour >= 23) fee += 2'000;       // hidden dependency on the real clock\n        long long charge = total + fee;\n        cout << \"Razorpay charge \" << charge << endl;          // pretend: RazorpayClient().charge(...)\n        cout << \"MSG91 SMS: order placed\" << endl;             // pretend: Msg91Sms().send(...)\n        return charge;\n    }\n};\n" }] } },
      mcq: { q: 'Which dependency is the easiest to forget when making this class testable?', options: ['The system clock (LocalDateTime.now())', 'The cart DAO', 'The payment client', 'The SMS client'], answer: 0, explain: 'Static calls like LocalDateTime.now(), UUID.randomUUID() and Math.random() are hidden dependencies: they do not appear in the constructor, yet they make behaviour depend on the outside world.' },
      hints: [`<p>Hint 1: List everything the class touches outside its own memory: DB, payment, SMS, <b>time</b>. Each becomes a constructor parameter typed as an interface (time as a clock, for example <code>java.time.Clock</code> in Java or a function returning the current time).</p>`, `<p>Hint 2: Fakes are tiny classes (or lambdas) that record calls in a list. A fake beats a mock when you want to assert on state ("was exactly one SMS sent?").</p>`, `<p>Hint 3: Recipe: interfaces CartRepository, PaymentPort, SmsPort → CheckoutService(repo, pay, sms, clock) → FeePolicy pure function → two composition roots: prodMain() and testMain().</p>`],
      tests: { io: true, cases: [{ stdin: '', stdout: "night fee test PASSED\nday charge 60000\ndeclined: card declined\ncharges [50000, 60000]\nsms [Order for C-9 placed, paid 500, Order for C-1 placed, paid 600]\nfees 3000 2000 0\n" }] },
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
    static void attempt(Runnable action) {
        try { action.run(); } catch (RuntimeException e) { System.out.println("declined: " + e.getMessage()); }
    }

    // Production root would be: new CheckoutService(new JdbcCartRepository(ds), new RazorpayAdapter(http), new Msg91Adapter(http), Clock.systemDefaultZone())
    public static void main(String[] args) {
        // Test composition root: fakes + a fixed clock at 23:30
        Clock lateNight = Clock.fixed(Instant.parse("2026-02-10T23:30:00Z"), ZoneOffset.UTC);
        RecordingPayments pay = new RecordingPayments();
        List<String> smsOutbox = new ArrayList<>();
        CheckoutService svc = new CheckoutService(id -> 45_000, pay, smsOutbox::add, lateNight);
        long charged = svc.checkout("C-9");
        System.out.println(charged == 50_000 ? "night fee test PASSED" : "FAILED " + charged);

        // Same class, second composition: daytime clock, bigger cart, so no delivery fee
        Clock noon = Clock.fixed(Instant.parse("2026-02-10T12:00:00Z"), ZoneOffset.UTC);
        System.out.println("day charge " + new CheckoutService(id -> 60_000, pay, smsOutbox::add, noon).checkout("C-1"));

        // Third composition: the card is declined, so nothing is recorded and no SMS goes out
        PaymentPort declining = (ref, paise) -> { throw new IllegalStateException("card declined"); };
        attempt(() -> new CheckoutService(id -> 45_000, declining, smsOutbox::add, noon).checkout("C-2"));

        System.out.println("charges " + pay.charges);
        System.out.println("sms " + smsOutbox);
        System.out.println("fees " + FeePolicy.fee(50_000, LocalTime.of(22, 59)) + " "
                + FeePolicy.fee(50_001, LocalTime.of(23, 0)) + " " + FeePolicy.fee(50_001, LocalTime.of(10, 0)));
    }
}`,
        alt: [
          { lang: 'python', code: `from abc import ABC, abstractmethod
from datetime import time
from typing import Callable

Clock = Callable[[], time]


class CartRepository(ABC):
    @abstractmethod
    def total_paise(self, cart_id: str) -> int: ...


class PaymentPort(ABC):
    @abstractmethod
    def charge(self, ref: str, paise: int) -> None: ...


class SmsPort(ABC):
    @abstractmethod
    def send(self, msg: str) -> None: ...


class FeePolicy:  # pure, trivially testable
    @staticmethod
    def fee(total: int, at: time) -> int:
        fee = 0 if total > 50_000 else 3_000
        if at >= time(23, 0):
            fee += 2_000
        return fee


class CheckoutService:
    def __init__(self, carts: CartRepository, pay: PaymentPort, sms: SmsPort, clock: Clock) -> None:
        self._carts = carts
        self._pay = pay
        self._sms = sms
        self._clock = clock

    def checkout(self, cart_id: str) -> int:
        total = self._carts.total_paise(cart_id)
        charge = total + FeePolicy.fee(total, self._clock())
        self._pay.charge(cart_id, charge)
        self._sms.send(f"Order for {cart_id} placed, paid {charge // 100}")
        return charge


class FixedCart(CartRepository):  # test fakes: a few lines each
    def __init__(self, total: int) -> None:
        self._total = total

    def total_paise(self, cart_id: str) -> int:
        return self._total


class RecordingPayments(PaymentPort):
    def __init__(self) -> None:
        self.charges: list[int] = []

    def charge(self, ref: str, paise: int) -> None:
        self.charges.append(paise)


class DecliningPayments(PaymentPort):
    def charge(self, ref: str, paise: int) -> None:
        raise RuntimeError("card declined")


class SmsOutbox(SmsPort):
    def __init__(self) -> None:
        self.messages: list[str] = []

    def send(self, msg: str) -> None:
        self.messages.append(msg)


def show(items: list) -> str:
    return "[" + ", ".join(str(i) for i in items) + "]"


# Production root would be:
# CheckoutService(JdbcCartRepository(ds), RazorpayAdapter(http), Msg91Adapter(http), datetime.now().time)
# Test composition root: fakes + a fixed clock at 23:30
late_night: Clock = lambda: time(23, 30)
pay = RecordingPayments()
sms_outbox = SmsOutbox()
svc = CheckoutService(FixedCart(45_000), pay, sms_outbox, late_night)
charged = svc.checkout("C-9")
print("night fee test PASSED" if charged == 50_000 else f"FAILED {charged}")

# Same class, second composition: daytime clock, bigger cart, so no delivery fee
noon: Clock = lambda: time(12, 0)
print("day charge", CheckoutService(FixedCart(60_000), pay, sms_outbox, noon).checkout("C-1"))

# Third composition: the card is declined, so nothing is recorded and no SMS goes out
try:
    CheckoutService(FixedCart(45_000), DecliningPayments(), sms_outbox, noon).checkout("C-2")
except RuntimeError as e:
    print("declined:", e)

print("charges", show(pay.charges))
print("sms", show(sms_outbox.messages))
print("fees", FeePolicy.fee(50_000, time(22, 59)), FeePolicy.fee(50_001, time(23, 0)), FeePolicy.fee(50_001, time(10, 0)))` },
          { lang: 'ts', code: `interface CartRepository { totalPaise(cartId: string): number; }
interface PaymentPort { charge(ref: string, paise: number): void; }
interface SmsPort { send(msg: string): void; }
type Clock = () => number; // minutes since midnight

class FeePolicy { // pure, trivially testable
  static fee(total: number, minuteOfDay: number): number {
    let fee = total > 50_000 ? 0 : 3_000;
    if (minuteOfDay >= 23 * 60) fee += 2_000;
    return fee;
  }
}

class CheckoutService {
  constructor(
    private readonly carts: CartRepository,
    private readonly pay: PaymentPort,
    private readonly sms: SmsPort,
    private readonly clock: Clock,
  ) {}

  checkout(cartId: string): number {
    const total = this.carts.totalPaise(cartId);
    const charge = total + FeePolicy.fee(total, this.clock());
    this.pay.charge(cartId, charge);
    this.sms.send(\`Order for \${cartId} placed, paid \${Math.floor(charge / 100)}\`);
    return charge;
  }
}

class RecordingPayments implements PaymentPort {
  readonly charges: number[] = [];
  charge(_ref: string, paise: number): void { this.charges.push(paise); }
}

function attempt(action: () => void): void {
  try { action(); } catch (e) { console.log("declined: " + (e as Error).message); }
}

const show = (items: unknown[]): string => "[" + items.join(", ") + "]";
const at = (h: number, m: number): number => h * 60 + m;

// Production root would be:
// new CheckoutService(new JdbcCartRepository(ds), new RazorpayAdapter(http), new Msg91Adapter(http), systemClock)
// Test composition root: fakes (object literals fit the interfaces) + a fixed clock at 23:30
const lateNight: Clock = () => at(23, 30);
const pay = new RecordingPayments();
const smsOutbox: string[] = [];
const sms: SmsPort = { send: (m) => { smsOutbox.push(m); } };
const svc = new CheckoutService({ totalPaise: () => 45_000 }, pay, sms, lateNight);
const charged = svc.checkout("C-9");
console.log(charged === 50_000 ? "night fee test PASSED" : \`FAILED \${charged}\`);

// Same class, second composition: daytime clock, bigger cart, so no delivery fee
const noon: Clock = () => at(12, 0);
console.log("day charge " + new CheckoutService({ totalPaise: () => 60_000 }, pay, sms, noon).checkout("C-1"));

// Third composition: the card is declined, so nothing is recorded and no SMS goes out
const declining: PaymentPort = { charge: () => { throw new Error("card declined"); } };
attempt(() => new CheckoutService({ totalPaise: () => 45_000 }, declining, sms, noon).checkout("C-2"));

console.log("charges " + show(pay.charges));
console.log("sms " + show(smsOutbox));
console.log(\`fees \${FeePolicy.fee(50_000, at(22, 59))} \${FeePolicy.fee(50_001, at(23, 0))} \${FeePolicy.fee(50_001, at(10, 0))}\`);` },
          { lang: 'cpp', code: `using Clock = function<int()>;  // minutes since midnight

struct CartRepository {
    virtual ~CartRepository() = default;
    virtual long long totalPaise(const string& cartId) const = 0;
};
struct PaymentPort {
    virtual ~PaymentPort() = default;
    virtual void charge(const string& ref, long long paise) = 0;
};
struct SmsPort {
    virtual ~SmsPort() = default;
    virtual void send(const string& msg) = 0;
};

struct FeePolicy {  // pure, trivially testable
    static long long fee(long long total, int minuteOfDay) {
        long long fee = total > 50'000 ? 0 : 3'000;
        if (minuteOfDay >= 23 * 60) fee += 2'000;
        return fee;
    }
};

class CheckoutService {
    const CartRepository& carts_;  // the composition root owns the parts and outlives the service
    PaymentPort& pay_;
    SmsPort& sms_;
    Clock clock_;

public:
    CheckoutService(const CartRepository& carts, PaymentPort& pay, SmsPort& sms, Clock clock)
        : carts_(carts), pay_(pay), sms_(sms), clock_(move(clock)) {}

    long long checkout(const string& cartId) {
        long long total = carts_.totalPaise(cartId);
        long long charge = total + FeePolicy::fee(total, clock_());
        pay_.charge(cartId, charge);
        sms_.send("Order for " + cartId + " placed, paid " + to_string(charge / 100));
        return charge;
    }
};

// test fakes: a few lines each
class FixedCart : public CartRepository {
    long long total_;
public:
    explicit FixedCart(long long total) : total_(total) {}
    long long totalPaise(const string&) const override { return total_; }
};
class RecordingPayments : public PaymentPort {
public:
    vector<long long> charges;
    void charge(const string&, long long paise) override { charges.push_back(paise); }
};
class DecliningPayments : public PaymentPort {
public:
    void charge(const string&, long long) override { throw runtime_error("card declined"); }
};
class SmsOutbox : public SmsPort {
public:
    vector<string> messages;
    void send(const string& msg) override { messages.push_back(msg); }
};

template <class T>
string show(const vector<T>& items) {
    ostringstream out;
    out << "[";
    for (size_t i = 0; i < items.size(); i++) out << (i ? ", " : "") << items[i];
    out << "]";
    return out.str();
}

int at(int h, int m) { return h * 60 + m; }

int main() {
    // Production root would be:
    // CheckoutService(JdbcCartRepository(ds), RazorpayAdapter(http), Msg91Adapter(http), systemClock)
    // Test composition root: fakes + a fixed clock at 23:30
    Clock lateNight = [] { return at(23, 30); };
    RecordingPayments pay;
    SmsOutbox sms;
    FixedCart small(45'000), big(60'000);
    CheckoutService svc(small, pay, sms, lateNight);
    long long charged = svc.checkout("C-9");
    cout << (charged == 50'000 ? "night fee test PASSED" : "FAILED " + to_string(charged)) << "\\n";

    // Same class, second composition: daytime clock, bigger cart, so no delivery fee
    Clock noon = [] { return at(12, 0); };
    cout << "day charge " << CheckoutService(big, pay, sms, noon).checkout("C-1") << "\\n";

    // Third composition: the card is declined, so nothing is recorded and no SMS goes out
    DecliningPayments declining;
    try {
        CheckoutService(small, declining, sms, noon).checkout("C-2");
    } catch (const runtime_error& e) {
        cout << "declined: " << e.what() << "\\n";
    }

    cout << "charges " << show(pay.charges) << "\\n";
    cout << "sms " << show(sms.messages) << "\\n";
    cout << "fees " << FeePolicy::fee(50'000, at(22, 59)) << " " << FeePolicy::fee(50'001, at(23, 0)) << " "
         << FeePolicy::fee(50'001, at(10, 0)) << "\\n";
}` }
        ],
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
  ['<b>Plugin</b>', 'A class implementing it, often in its own package (JAR, wheel, npm package, shared library)', '<code>CsvExporter</code>, <code>PdfExporter</code>'],
  ['<b>Metadata</b>', 'Name, version, which API version it targets', '<code>pdf 1.3.0, api 1</code>'],
  ['<b>Registry</b>', 'Map from key to plugin, filled at startup', '<code>Map&lt;String, Exporter&gt;</code>'],
  ['<b>Discovery</b>', 'How the core finds plugins', 'manual list, a service loader (<code>ServiceLoader</code>, Python entry points), scanning a plugins folder'],
  ['<b>Lifecycle</b>', 'init → start → stop hooks', 'open a font cache on start, close on stop']
])}
<p><b>How the core finds plugins.</b> Three common ways, simplest first:</p>
<ul><li><b>Manual registration</b> — <code>registry.register(new CsvExporter())</code> in the composition root. Simple and explicit; adding a plugin still needs one line in main.</li>
<li><b>Java <code>ServiceLoader</code></b> — each plugin JAR contains a text file <code>META-INF/services/com.acme.Exporter</code> listing its class name (or <code>provides Exporter with PdfExporter;</code> in <code>module-info.java</code>). The core calls <code>ServiceLoader.load(Exporter.class)</code> and gets instances of every plugin on the classpath. This is how JDBC drivers, logging backends and <code>java.time</code> zone providers are found.</li>
<li><b>Folder scanning + own class loader</b> — the app watches a <code>plugins/</code> folder and loads each JAR with its own <code>URLClassLoader</code>. This allows install/uninstall at runtime and isolates plugins' libraries from each other (IntelliJ, Jenkins, Minecraft servers).</li></ul>
<p><b>Rules for a good core:</b> keep extension points <b>small and stable</b> (every change breaks every plugin), <b>version</b> them (core supports API v1 and v2), <b>never let one plugin crash the core</b> (catch exceptions at the boundary, quarantine the plugin), and decide <b>conflict rules</b> (two plugins claim "pdf" → priority or error). Plugins talk to the core only through the API you hand them — never by reaching into core internals.</p>`,
    clues: [
      '"New <b>payment methods / file formats / rules</b> will be added by other teams or third parties" → extension point + registry.',
      '"Without redeploying the core" / "customers write their own extensions" → plugin discovery (a service loader or folder scanning).',
      '"A buggy extension must not bring the system down" → isolation: try/catch at the boundary, quarantine, timeouts, separate class loaders or processes.',
      '"Design an IDE / text editor / linter / Jenkins-like CI" → microkernel architecture.',
      '"Support old plugins after we change the interface" → API versioning, default methods, adapters for old versions.',
      'The word <b>"pluggable"</b> or <b>"configurable at runtime"</b> in the requirements.'
    ],
    code: [{ lang: 'java', code: `// Core: extension point + metadata + registry with version check, lifecycle and failure isolation.
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
}`, alt: [
          { lang: 'python', code: `# Core: extension point + metadata + registry with version check, lifecycle and failure isolation.
from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass(frozen=True)
class Report:
    title: str
    rows: list[str]


class ExporterPlugin(ABC):  # the EXTENSION POINT (owned by the core, kept tiny)
    API_VERSION = 1  # what this core speaks

    @abstractmethod
    def format(self) -> str: ...  # registry key, e.g. "csv"

    def api_version(self) -> int:  # what the plugin was built against
        return 1

    def start(self) -> None:  # lifecycle hooks with safe defaults
        pass

    def stop(self) -> None:
        pass

    @abstractmethod
    def export(self, r: Report) -> str: ...


class PluginRegistry:
    def __init__(self) -> None:
        self._active: dict[str, ExporterPlugin] = {}
        self._rejected: list[str] = []

    def install(self, p: ExporterPlugin) -> None:
        key = p.format().lower()
        if p.api_version() != ExporterPlugin.API_VERSION:
            self._rejected.append(f"{key} (needs API v{p.api_version()})")
            return
        if key in self._active:
            self._rejected.append(f"{key} (duplicate format)")
            return
        try:
            p.start()  # a plugin that throws on start is quarantined,
            self._active[key] = p  # the core keeps running
        except Exception as e:
            self._rejected.append(f"{key} (failed to start: {e})")

    def export(self, fmt: str, r: Report) -> str:
        p = self._active.get(fmt.lower())
        if p is None:
            raise ValueError(f"No exporter for '{fmt}'. Available: [{', '.join(self.formats())}]")
        try:
            return p.export(r)
        except Exception as e:
            raise RuntimeError(f"Plugin '{fmt}' failed: {e}") from e

    def shutdown(self) -> None:
        for p in self._active.values():
            try:
                p.stop()
            except Exception:
                pass

    def formats(self) -> list[str]:
        return list(self._active)

    def rejected(self) -> list[str]:
        return self._rejected


# Plugins: could live in separate packages. The core never names them.
class CsvExporter(ExporterPlugin):
    def format(self) -> str:
        return "csv"

    def export(self, r: Report) -> str:
        return ",".join(r.rows)


class MarkdownExporter(ExporterPlugin):
    def format(self) -> str:
        return "md"

    def export(self, r: Report) -> str:
        return f"# {r.title} | " + " | ".join(r.rows)


class FutureXmlExporter(ExporterPlugin):
    def format(self) -> str:
        return "xml"

    def api_version(self) -> int:  # built for a newer core -> rejected safely
        return 2

    def export(self, r: Report) -> str:
        return "<report/>"


class BrokenPdfExporter(ExporterPlugin):
    def format(self) -> str:
        return "pdf"

    def start(self) -> None:
        raise RuntimeError("font file missing")

    def export(self, r: Report) -> str:
        return "%PDF"


reg = PluginRegistry()
for plugin in (CsvExporter(), MarkdownExporter(), FutureXmlExporter(), BrokenPdfExporter()):
    reg.install(plugin)
report = Report("Sales", ["north=10", "south=7"])
print("active:  ", "[" + ", ".join(reg.formats()) + "]")
print("rejected:", "[" + ", ".join(reg.rejected()) + "]")
print(reg.export("md", report))
try:
    reg.export("pdf", report)
except ValueError as e:
    print(e)
reg.shutdown()` },
          { lang: 'ts', code: `// Core: extension point + metadata + registry with version check, lifecycle and failure isolation.
interface Report { readonly title: string; readonly rows: readonly string[]; }

abstract class ExporterPlugin { // the EXTENSION POINT (owned by the core, kept tiny)
  static readonly API_VERSION = 1; // what this core speaks
  abstract format(): string; // registry key, e.g. "csv"
  apiVersion(): number { return 1; } // what the plugin was built against
  start(): void {} // lifecycle hooks with safe defaults
  stop(): void {}
  abstract export(r: Report): string;
}

class PluginRegistry {
  private readonly active = new Map<string, ExporterPlugin>();
  private readonly rejectedList: string[] = [];

  install(p: ExporterPlugin): void {
    const key = p.format().toLowerCase();
    if (p.apiVersion() !== ExporterPlugin.API_VERSION) { this.rejectedList.push(\`\${key} (needs API v\${p.apiVersion()})\`); return; }
    if (this.active.has(key)) { this.rejectedList.push(\`\${key} (duplicate format)\`); return; }
    try {
      p.start(); // a plugin that throws on start is quarantined,
      this.active.set(key, p); // the core keeps running
    } catch (e) {
      this.rejectedList.push(\`\${key} (failed to start: \${(e as Error).message})\`);
    }
  }

  export(format: string, r: Report): string {
    const p = this.active.get(format.toLowerCase());
    if (p === undefined) throw new Error(\`No exporter for '\${format}'. Available: [\${this.formats().join(", ")}]\`);
    try {
      return p.export(r);
    } catch (e) {
      throw new Error(\`Plugin '\${format}' failed: \${(e as Error).message}\`);
    }
  }

  shutdown(): void {
    for (const p of this.active.values()) {
      try { p.stop(); } catch { /* one bad plugin must not stop the others */ }
    }
  }

  formats(): string[] { return [...this.active.keys()]; }
  rejected(): string[] { return this.rejectedList; }
}

// Plugins: could live in separate npm packages. The core never names them.
class CsvExporter extends ExporterPlugin {
  format(): string { return "csv"; }
  export(r: Report): string { return r.rows.join(","); }
}
class MarkdownExporter extends ExporterPlugin {
  format(): string { return "md"; }
  export(r: Report): string { return \`# \${r.title} | \` + r.rows.join(" | "); }
}
class FutureXmlExporter extends ExporterPlugin {
  format(): string { return "xml"; }
  override apiVersion(): number { return 2; } // built for a newer core -> rejected safely
  export(_r: Report): string { return "<report/>"; }
}
class BrokenPdfExporter extends ExporterPlugin {
  format(): string { return "pdf"; }
  override start(): void { throw new Error("font file missing"); }
  export(_r: Report): string { return "%PDF"; }
}

const reg = new PluginRegistry();
for (const plugin of [new CsvExporter(), new MarkdownExporter(), new FutureXmlExporter(), new BrokenPdfExporter()]) reg.install(plugin);
const report: Report = { title: "Sales", rows: ["north=10", "south=7"] };
console.log("active:   [" + reg.formats().join(", ") + "]");
console.log("rejected: [" + reg.rejected().join(", ") + "]");
console.log(reg.export("md", report));
try { reg.export("pdf", report); } catch (e) { console.log((e as Error).message); }
reg.shutdown();` },
          { lang: 'cpp', code: `// Core: extension point + metadata + registry with version check, lifecycle and failure isolation.
struct Report {
    string title;
    vector<string> rows;
};

string join(const vector<string>& items, const string& sep) {
    string out;
    for (size_t i = 0; i < items.size(); i++) out += (i ? sep : "") + items[i];
    return out;
}

class ExporterPlugin {  // the EXTENSION POINT (owned by the core, kept tiny)
public:
    static constexpr int API_VERSION = 1;  // what this core speaks
    virtual ~ExporterPlugin() = default;
    virtual string format() const = 0;  // registry key, e.g. "csv"
    virtual int apiVersion() const { return 1; }  // what the plugin was built against
    virtual void start() {}  // lifecycle hooks with safe defaults
    virtual void stop() {}
    virtual string exportReport(const Report& r) const = 0;  // \`export\` is a C++ keyword
};

class PluginRegistry {
    vector<pair<string, unique_ptr<ExporterPlugin>>> active_;  // insertion order; the registry owns the plugins
    vector<string> rejected_;

    ExporterPlugin* find(const string& key) const {
        for (const auto& [k, p] : active_) if (k == key) return p.get();
        return nullptr;
    }
    static string lower(string s) {
        transform(s.begin(), s.end(), s.begin(), [](unsigned char c) { return static_cast<char>(tolower(c)); });
        return s;
    }

public:
    void install(unique_ptr<ExporterPlugin> p) {
        string key = lower(p->format());
        if (p->apiVersion() != ExporterPlugin::API_VERSION) { rejected_.push_back(key + " (needs API v" + to_string(p->apiVersion()) + ")"); return; }
        if (find(key)) { rejected_.push_back(key + " (duplicate format)"); return; }
        try {
            p->start();  // a plugin that throws on start is quarantined,
            active_.emplace_back(key, move(p));  // the core keeps running
        } catch (const exception& e) {
            rejected_.push_back(key + " (failed to start: " + e.what() + ")");
        }
    }
    string exportAs(const string& format, const Report& r) const {
        ExporterPlugin* p = find(lower(format));
        if (!p) throw invalid_argument("No exporter for '" + format + "'. Available: [" + join(formats(), ", ") + "]");
        try {
            return p->exportReport(r);
        } catch (const exception& e) {
            throw runtime_error("Plugin '" + format + "' failed: " + e.what());
        }
    }
    void shutdown() {
        for (auto& [k, p] : active_) {
            try { p->stop(); } catch (...) {}
        }
    }
    vector<string> formats() const {
        vector<string> out;
        for (const auto& [k, p] : active_) out.push_back(k);
        return out;
    }
    const vector<string>& rejected() const { return rejected_; }
};

// Plugins: could live in separate shared libraries. The core never names them.
struct CsvExporter : ExporterPlugin {
    string format() const override { return "csv"; }
    string exportReport(const Report& r) const override { return join(r.rows, ","); }
};
struct MarkdownExporter : ExporterPlugin {
    string format() const override { return "md"; }
    string exportReport(const Report& r) const override { return "# " + r.title + " | " + join(r.rows, " | "); }
};
struct FutureXmlExporter : ExporterPlugin {
    string format() const override { return "xml"; }
    int apiVersion() const override { return 2; }  // built for a newer core -> rejected safely
    string exportReport(const Report&) const override { return "<report/>"; }
};
struct BrokenPdfExporter : ExporterPlugin {
    string format() const override { return "pdf"; }
    void start() override { throw runtime_error("font file missing"); }
    string exportReport(const Report&) const override { return "%PDF"; }
};

int main() {
    PluginRegistry reg;
    reg.install(make_unique<CsvExporter>());
    reg.install(make_unique<MarkdownExporter>());
    reg.install(make_unique<FutureXmlExporter>());
    reg.install(make_unique<BrokenPdfExporter>());
    Report r{"Sales", {"north=10", "south=7"}};
    cout << "active:   [" << join(reg.formats(), ", ") << "]\\n";
    cout << "rejected: [" << join(reg.rejected(), ", ") << "]\\n";
    cout << reg.exportAs("md", r) << "\\n";
    try {
        reg.exportAs("pdf", r);
    } catch (const invalid_argument& e) {
        cout << e.what() << "\\n";
    }
    reg.shutdown();
}` }
        ] }, { lang: 'java', code: `// Discovery with the JDK's built-in ServiceLoader (no framework).
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
}`, alt: [
          { lang: 'python', code: `# Discovery with Python entry points (no framework).
# Each plugin package declares, in its pyproject.toml:
#   [project.entry-points."exporters"]
#   pdf = "acme_pdf:PdfExporter"
from importlib.metadata import entry_points
from typing import Protocol


class ExporterSpi(Protocol):
    def format(self) -> str: ...
    def export(self, rows: list[str]) -> str: ...


def discover() -> dict[str, ExporterSpi]:
    found: dict[str, ExporterSpi] = {}
    # Load entry points one by one so a single broken plugin does not stop discovery.
    for ep in entry_points(group="exporters"):
        try:
            p = ep.load()()  # imports the module lazily, then instantiates the class
            found.setdefault(p.format(), p)
        except Exception as e:
            print(f"skipping bad plugin: {e}")
    return dict(sorted(found.items()))


plugins = discover()
print(f"discovered {len(plugins)} exporters: [{', '.join(plugins)}]")  # 0 here: no plugin packages installed` },
          { lang: 'ts', code: `// Discovery in Node: each plugin is a package whose default export is a factory. The host lists the folder
// (fs.readdirSync) and passes the module paths in; dynamic import() loads them lazily.
interface ExporterSpi { format(): string; export(rows: string[]): string; }
type Factory = () => ExporterSpi;

async function discover(modulePaths: string[]): Promise<Map<string, ExporterSpi>> {
  const found = new Map<string, ExporterSpi>();
  // Load modules one by one so a single broken plugin does not stop discovery.
  for (const path of modulePaths) {
    try {
      const mod = (await import(path)) as { default: Factory };
      const p = mod.default(); // instantiates lazily
      if (!found.has(p.format())) found.set(p.format(), p);
    } catch (e) {
      console.log("skipping bad plugin: " + (e as Error).message);
    }
  }
  return new Map([...found].sort((a, b) => (a[0] < b[0] ? -1 : 1)));
}

discover([]).then((plugins) => {
  console.log(\`discovered \${plugins.size} exporters: [\${[...plugins.keys()].join(", ")}]\`); // 0 here: no plugin folders given
});` },
          { lang: 'cpp', code: `// Discovery with dlopen (POSIX): each plugin is a shared library that exports \`extern "C" ExporterSpi* make_exporter()\`.
#include <dlfcn.h>

struct ExporterSpi {
    virtual ~ExporterSpi() = default;
    virtual string format() const = 0;
    virtual string exportRows(const vector<string>& rows) const = 0;  // \`export\` is a C++ keyword
};

map<string, unique_ptr<ExporterSpi>> discover(const filesystem::path& dir) {
    map<string, unique_ptr<ExporterSpi>> found;
    if (!filesystem::exists(dir)) return found;
    // Load libraries one by one so a single broken plugin does not stop discovery.
    for (const auto& entry : filesystem::directory_iterator(dir)) {
        if (entry.path().extension() != ".so") continue;
        void* lib = dlopen(entry.path().c_str(), RTLD_NOW);  // handles stay open while plugins live
        auto make = lib ? reinterpret_cast<ExporterSpi* (*)()>(dlsym(lib, "make_exporter")) : nullptr;
        if (!make) {
            cout << "skipping bad plugin: " << entry.path().filename().string() << "\\n";
            continue;
        }
        unique_ptr<ExporterSpi> p(make());
        string key = p->format();
        found.try_emplace(key, move(p));
    }
    return found;
}

int main() {
    auto plugins = discover("plugins");
    string names;
    for (const auto& [format, p] : plugins) names += (names.empty() ? "" : ", ") + format;
    cout << "discovered " << plugins.size() << " exporters: [" << names << "]\\n";  // 0 here: no plugin folder
}` }
        ] }, { lang: 'java', code: `// Hook-style plugins: plugins subscribe to named hooks in the core's pipeline, ordered by priority.
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
}`, alt: [
          { lang: 'python', code: `# Hook-style plugins: plugins subscribe to named hooks in the core's pipeline, ordered by priority.
from abc import ABC, abstractmethod


class SavePlugin(ABC):
    @property
    @abstractmethod
    def priority(self) -> int: ...

    @abstractmethod
    def before_save(self, text: str) -> str: ...


class Editor:
    def __init__(self) -> None:
        self._hooks: list[SavePlugin] = []

    def register(self, p: SavePlugin) -> None:
        self._hooks.append(p)
        self._hooks.sort(key=lambda h: h.priority)

    def save(self, text: str) -> str:
        for p in self._hooks:
            try:
                text = p.before_save(text)  # each plugin transforms the text in turn
            except Exception as e:
                print(f"hook failed, skipped: {e}")
        return text


class Trim(SavePlugin):
    priority = 20

    def before_save(self, text: str) -> str:
        return text.strip()


class FixTypo(SavePlugin):
    priority = 10

    def before_save(self, text: str) -> str:
        return text.replace("teh", "the")


class Spellcheck(SavePlugin):
    priority = 30

    def before_save(self, text: str) -> str:
        raise RuntimeError("spellcheck server down")


ed = Editor()
for hook in (Trim(), FixTypo(), Spellcheck()):
    ed.register(hook)
print("[" + ed.save("   fix teh bug   ") + "]")  # [fix the bug]` },
          { lang: 'ts', code: `// Hook-style plugins: plugins subscribe to named hooks in the core's pipeline, ordered by priority.
interface SavePlugin { readonly priority: number; beforeSave(text: string): string; }

class Editor {
  private readonly hooks: SavePlugin[] = [];

  register(p: SavePlugin): void {
    this.hooks.push(p);
    this.hooks.sort((a, b) => a.priority - b.priority);
  }

  save(text: string): string {
    for (const p of this.hooks) {
      try {
        text = p.beforeSave(text); // each plugin transforms the text in turn
      } catch (e) {
        console.log("hook failed, skipped: " + (e as Error).message);
      }
    }
    return text;
  }
}

const ed = new Editor();
ed.register({ priority: 20, beforeSave: (t) => t.trim() });
ed.register({ priority: 10, beforeSave: (t) => t.replace("teh", "the") });
ed.register({ priority: 30, beforeSave: () => { throw new Error("spellcheck server down"); } });
console.log("[" + ed.save("   fix teh bug   ") + "]"); // [fix the bug]` },
          { lang: 'cpp', code: `// Hook-style plugins: plugins subscribe to named hooks in the core's pipeline, ordered by priority.
struct SavePlugin {
    virtual ~SavePlugin() = default;
    virtual int priority() const = 0;
    virtual string beforeSave(string text) const = 0;
};

class Editor {
    vector<unique_ptr<SavePlugin>> hooks_;  // the editor owns the plugins

public:
    void registerHook(unique_ptr<SavePlugin> p) {
        hooks_.push_back(move(p));
        stable_sort(hooks_.begin(), hooks_.end(), [](const auto& a, const auto& b) { return a->priority() < b->priority(); });
    }
    string save(string text) const {
        for (const auto& p : hooks_) {
            try {
                text = p->beforeSave(text);  // each plugin transforms the text in turn
            } catch (const exception& e) {
                cout << "hook failed, skipped: " << e.what() << "\\n";
            }
        }
        return text;
    }
};

template <class F>
struct LambdaPlugin : SavePlugin {  // adapts a lambda to the interface, like Java's anonymous classes
    int prio;
    F fn;
    LambdaPlugin(int p, F f) : prio(p), fn(move(f)) {}
    int priority() const override { return prio; }
    string beforeSave(string text) const override { return fn(move(text)); }
};
template <class F>
unique_ptr<SavePlugin> hook(int priority, F fn) { return make_unique<LambdaPlugin<F>>(priority, move(fn)); }

int main() {
    Editor ed;
    ed.registerHook(hook(20, [](string t) {
        size_t a = t.find_first_not_of(' '), b = t.find_last_not_of(' ');
        return a == string::npos ? string() : t.substr(a, b - a + 1);
    }));
    ed.registerHook(hook(10, [](string t) {
        size_t at = t.find("teh");
        if (at != string::npos) t.replace(at, 3, "the");
        return t;
    }));
    ed.registerHook(hook(30, [](string) -> string { throw runtime_error("spellcheck server down"); }));
    string saved = ed.save("   fix teh bug   ");  // the failing hook prints before the result
    cout << "[" << saved << "]\\n";  // [fix the bug]
}` }
        ] }],
    codeTitle: ['Plugin registry with versioning, lifecycle and isolation', 'Discovery without naming plugins (ServiceLoader, entry points, dynamic import, dlopen)', 'Hook pipeline plugins ordered by priority'],
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
          if (p.crash) { hl[id] = 'bad'; ehl[id + '-API'] = 'bad'; tags[id] = 'quarantined'; snap('Step 2: call <code>start()</code> → <span class="c-r">it threw an exception</span> (e.g. "font file missing"). The core catches it at the boundary and <b>quarantines</b> the plugin. Other plugins and the core are unaffected.', [CODE('PluginRegistry.install', 'try {\n  p.start();\n  active.put(key, p);\n} catch (RuntimeException e) {\n  rejected.add(key);\n}', { 2: 'bad', 5: 'cur' }, REG_ALT)]); return; }
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
      { title: 'JDBC drivers are plugins', html: `<p><code>DriverManager.getConnection("jdbc:postgresql://...")</code> works without your code naming the Postgres driver class. In Java's JDBC the driver JAR lists itself in <code>META-INF/services/java.sql.Driver</code>; <code>DriverManager</code> uses <code>ServiceLoader</code> to find every driver and asks each "do you accept this URL?". Swap the JAR → swap the database. ${H.chips(['java.sql.Driver', 'org.postgresql.Driver', 'com.mysql.cj.jdbc.Driver'], { label: 'extension point → plugins' })}</p>` },
      { title: 'A payment-method registry in an e-commerce app', html: `<p>Extension point <code>PaymentMethod { String id(); boolean supports(Country c); Receipt pay(Money m); }</code>. Plugins: UPI, Card, PayPal, BNPL. At checkout the core asks the registry for all methods whose <code>supports(country)</code> is true and shows them. A new country launch = new plugin + config, no core release.</p>`, code: `interface PaymentMethod { String id(); boolean supports(String country); }
class PaymentMethods {
    private final List<PaymentMethod> all = new ArrayList<>();
    void register(PaymentMethod m) { all.add(m); }
    List<String> availableIn(String country) {
        return all.stream().filter(m -> m.supports(country)).map(PaymentMethod::id).sorted().toList();
    }
}`, alt: [
          { lang: 'python', code: `from typing import Protocol


class PaymentMethod(Protocol):
    def id(self) -> str: ...
    def supports(self, country: str) -> bool: ...


class PaymentMethods:
    def __init__(self) -> None:
        self._all: list[PaymentMethod] = []

    def register(self, m: PaymentMethod) -> None:
        self._all.append(m)

    def available_in(self, country: str) -> list[str]:
        return sorted(m.id() for m in self._all if m.supports(country))` },
          { lang: 'ts', code: `interface PaymentMethod { id(): string; supports(country: string): boolean; }

class PaymentMethods {
  private readonly all: PaymentMethod[] = [];
  register(m: PaymentMethod): void { this.all.push(m); }
  availableIn(country: string): string[] {
    return this.all.filter((m) => m.supports(country)).map((m) => m.id()).sort();
  }
}` },
          { lang: 'cpp', code: `struct PaymentMethod {
    virtual ~PaymentMethod() = default;
    virtual string id() const = 0;
    virtual bool supports(const string& country) const = 0;
};

class PaymentMethods {
    vector<unique_ptr<PaymentMethod>> all_;

public:
    void registerMethod(unique_ptr<PaymentMethod> m) { all_.push_back(move(m)); }
    vector<string> availableIn(const string& country) const {
        vector<string> ids;
        for (const auto& m : all_) if (m->supports(country)) ids.push_back(m->id());
        sort(ids.begin(), ids.end());
        return ids;
    }
};` }
        ] },
      { title: 'Evolving an extension point without breaking plugins', html: `<p>You want to add <code>mimeType()</code> to <code>ExporterPlugin</code>. Adding an abstract method breaks every existing plugin. Instead add a <b>default method</b>: <code>default String mimeType() { return "application/octet-stream"; }</code>. Old plugins keep compiling; new ones override it. For bigger changes ship <code>ExporterPluginV2</code> and an adapter that wraps V1 plugins.</p>` },
      { title: 'Plugins vs strategies', html: `${H.table(['', 'Strategy pattern', 'Plugin architecture'], [['Scale', 'one class', 'whole application'], ['Who writes the variants', 'your team', 'other teams / third parties'], ['Discovery', 'chosen in code', 'found at startup or runtime'], ['Needs versioning, isolation, lifecycle', 'no', 'yes']])}<p>A plugin system is a strategy registry plus discovery, versioning, lifecycle and isolation.</p>` }
    ],
    deepDive: `<p><b>Dependency isolation.</b> In Java the answer is class loaders; Python, Node and C++ have no equivalent in-process, so they lean on separate processes (or, in Node, worker threads) and the Java details below map onto "one isolated environment per plugin". Two plugins may need different versions of the same library (Jackson 2.12 vs 2.17). Loading each plugin JAR in its own <code>URLClassLoader</code> whose parent is the core's API loader gives each plugin its own copy, while both still see the <i>same</i> <code>ExporterPlugin</code> interface (it must be loaded by the shared parent, or <code>instanceof</code> fails with the famous "ClassCastException: X cannot be cast to X"). Unloading a plugin = dropping every reference to its loader so it can be garbage-collected — any leaked thread or static cache pins it in memory forever (a common metaspace leak).</p>
<p><b>OSGi</b> (Eclipse, older app servers) formalised this: bundles declare imported/exported packages with version ranges, and the framework wires them. <b>JPMS</b> (Java modules) gives <code>uses</code>/<code>provides</code> with strong encapsulation. Most modern apps stay simpler: one flat set of dependencies (a classpath, a virtualenv, <code>node_modules</code>) and a restart to add plugins.</p>
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
      brute: { why: `<p>One giant <code>lint()</code> method with an if-block per rule and boolean flags for enabling. Every new rule edits it, one exception aborts the whole run, and third-party rules are impossible.</p>`, code: { lang: 'java', code: `class LinterBrute {
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
}`, alt: [{ lang: 'python', code: "class LinterBrute:\n    def lint(self, lines, todo_on, len_on):\n        out = []\n        for i, l in enumerate(lines):\n            if todo_on and \"FIXME\" in l: out.append(f\"L{i + 1} WARN no-fixme\")\n            if len_on and len(l) > 120: out.append(f\"L{i + 1} ERROR max-len\")\n            # every new rule = another if here; an exception here kills the whole lint run\n        return out\n" }, { lang: 'ts', code: "class LinterBrute {\n  lint(lines: string[], todoOn: boolean, lenOn: boolean): string[] {\n    const out: string[] = [];\n    for (let i = 0; i < lines.length; i++) {\n      const l = lines[i];\n      if (todoOn && l.includes(\"FIXME\")) out.push(\"L\" + (i + 1) + \" WARN no-fixme\");\n      if (lenOn && l.length > 120) out.push(\"L\" + (i + 1) + \" ERROR max-len\");\n      // every new rule = another if here; an exception here kills the whole lint run\n    }\n    return out;\n  }\n}\n" }, { lang: 'cpp', code: "class LinterBrute {\npublic:\n    vector<string> lint(const vector<string>& lines, bool todoOn, bool lenOn) {\n        vector<string> out;\n        for (int i = 0; i < (int)lines.size(); i++) {\n            const string& l = lines[i];\n            if (todoOn && l.find(\"FIXME\") != string::npos) out.push_back(\"L\" + to_string(i + 1) + \" WARN no-fixme\");\n            if (lenOn && l.size() > 120) out.push_back(\"L\" + to_string(i + 1) + \" ERROR max-len\");\n            // every new rule = another if here; an exception here kills the whole lint run\n        }\n        return out;\n    }\n};\n" }] } },
      mcq: { q: 'A rule throws an unexpected error (a null dereference) on line 40. What should the core do?', options: ['Catch it at the plugin boundary, record an internal-error issue naming the rule, continue with other rules and lines', 'Abort the whole lint run so the user notices', 'Silently ignore it', 'Disable all rules'], answer: 0, explain: 'Failure isolation: plugin bugs are reported with the plugin\'s name but never take down the core or other plugins.' },
      hints: [`<p>Hint 1: Extension point: <code>interface Rule { String id(); Severity defaultSeverity(); List&lt;String&gt; check(int lineNo, String line); }</code>.</p>`, `<p>Hint 2: Registry = <code>Map&lt;String, Rule&gt;</code>; config = <code>Map&lt;String, Severity&gt;</code> where <code>OFF</code> disables.</p>`, `<p>Hint 3: Loop lines × enabled rules; wrap each <code>check</code> in try/catch; collect <code>Issue</code> records; sort by (line, rule), for example <code>Comparator.comparingInt(Issue::line).thenComparing(Issue::rule)</code> in Java or a key tuple in Python.</p>`],
      tests: { io: true, cases: [{ stdin: '', stdout: "1 INTERNAL crashy: rule crashed: boom\n1 WARN max-len: 25 > 20\n1 WARN no-fixme: FIXME left in code\n2 INTERNAL crashy: rule crashed: boom\nrejected: duplicate rule max-len\n--- no-fixme and crashy switched off\n1 ERROR max-len: 25 > 20\n0 issues in a clean file\n" }] },
      solution: {
        approach: `<p>The core owns the <code>Rule</code> extension point, a registry, config and the run loop. Each rule is a tiny class (or lambda-built object). The run loop wraps every rule call in try/catch so a broken rule produces an <code>INTERNAL</code> issue tagged with its id. Severity comes from config if present, else the rule's default. Sorting happens once at the end.</p>`,
        code: `enum Severity { OFF, INFO, WARN, ERROR, INTERNAL }
record Issue(int line, String rule, Severity severity, String msg) {
    @Override public String toString() { return line + " " + severity + " " + rule + ": " + msg; }
}

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
                    out.add(new Issue(i + 1, r.id(), Severity.INTERNAL, "rule crashed: " + e.getMessage()));
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
    public List<String> check(int n, String l) { throw new IllegalStateException("boom"); }
}

class LintDemo {
    public static void main(String[] args) {
        Linter lint = new Linter(Map.of("max-len", Severity.WARN));      // config overrides severity
        lint.register(new NoFixme()); lint.register(new MaxLen(20)); lint.register(new Crashy());
        List<String> source = List.of("int x = 1; // FIXME later", "ok");
        lint.run(source).forEach(System.out::println);                    // a crashing rule does not stop the others
        try { lint.register(new MaxLen(30)); }
        catch (IllegalArgumentException e) { System.out.println("rejected: " + e.getMessage()); }

        System.out.println("--- no-fixme and crashy switched off");
        Linter quiet = new Linter(Map.of("no-fixme", Severity.OFF, "crashy", Severity.OFF));
        quiet.register(new NoFixme()); quiet.register(new MaxLen(20)); quiet.register(new Crashy());
        quiet.run(source).forEach(System.out::println);                   // max-len keeps its default severity
        System.out.println(quiet.run(List.of("ok")).size() + " issues in a clean file");
    }
}`,
        alt: [
          { lang: 'python', code: `from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import IntEnum


class Severity(IntEnum):
    OFF = 0
    INFO = 1
    WARN = 2
    ERROR = 3
    INTERNAL = 4


@dataclass(frozen=True)
class Issue:
    line: int
    rule: str
    severity: Severity
    msg: str

    def __str__(self) -> str:
        return f"{self.line} {self.severity.name} {self.rule}: {self.msg}"


class Rule(ABC):  # the extension point
    @property
    @abstractmethod
    def id(self) -> str: ...

    @property
    @abstractmethod
    def default_severity(self) -> Severity: ...

    @abstractmethod
    def check(self, line_no: int, line: str) -> list[str]: ...  # empty = clean


class Linter:
    def __init__(self, config: dict[str, Severity]) -> None:
        self._rules: dict[str, Rule] = {}
        self._config = dict(config)

    def register(self, rule: Rule) -> None:
        if rule.id in self._rules:
            raise ValueError(f"duplicate rule {rule.id}")
        self._rules[rule.id] = rule

    def run(self, lines: list[str]) -> list[Issue]:
        out: list[Issue] = []
        for i, line in enumerate(lines, start=1):
            for rule_id in sorted(self._rules):
                rule = self._rules[rule_id]
                sev = self._config.get(rule_id, rule.default_severity)
                if sev == Severity.OFF:
                    continue
                try:
                    out.extend(Issue(i, rule_id, sev, m) for m in rule.check(i, line))
                except Exception as e:  # one bad plugin must not stop the run
                    out.append(Issue(i, rule_id, Severity.INTERNAL, f"rule crashed: {e}"))
        out.sort(key=lambda issue: (issue.line, issue.rule))
        return out


class NoFixme(Rule):
    id = "no-fixme"
    default_severity = Severity.WARN

    def check(self, line_no: int, line: str) -> list[str]:
        return ["FIXME left in code"] if "FIXME" in line else []


class MaxLen(Rule):
    id = "max-len"
    default_severity = Severity.ERROR

    def __init__(self, max_len: int) -> None:
        self._max = max_len

    def check(self, line_no: int, line: str) -> list[str]:
        return [f"{len(line)} > {self._max}"] if len(line) > self._max else []


class Crashy(Rule):
    id = "crashy"
    default_severity = Severity.INFO

    def check(self, line_no: int, line: str) -> list[str]:
        raise RuntimeError("boom")


lint = Linter({"max-len": Severity.WARN})  # config overrides severity
for r in (NoFixme(), MaxLen(20), Crashy()):
    lint.register(r)
source = ["int x = 1; // FIXME later", "ok"]
for issue in lint.run(source):  # a crashing rule does not stop the others
    print(issue)
try:
    lint.register(MaxLen(30))
except ValueError as e:
    print(f"rejected: {e}")

print("--- no-fixme and crashy switched off")
quiet = Linter({"no-fixme": Severity.OFF, "crashy": Severity.OFF})
for r in (NoFixme(), MaxLen(20), Crashy()):
    quiet.register(r)
for issue in quiet.run(source):  # max-len keeps its default severity
    print(issue)
print(f"{len(quiet.run(['ok']))} issues in a clean file")` },
          { lang: 'ts', code: `enum Severity { OFF, INFO, WARN, ERROR, INTERNAL }

interface Issue {
  readonly line: number;
  readonly rule: string;
  readonly severity: Severity;
  readonly msg: string;
}

const describe = (i: Issue): string => \`\${i.line} \${Severity[i.severity]} \${i.rule}: \${i.msg}\`;

interface Rule { // the extension point
  readonly id: string;
  readonly defaultSeverity: Severity;
  check(lineNo: number, line: string): string[]; // empty = clean
}

class Linter {
  private readonly rules = new Map<string, Rule>();
  private readonly config: Map<string, Severity>;

  constructor(config: Map<string, Severity>) { this.config = new Map(config); }

  register(r: Rule): void {
    if (this.rules.has(r.id)) throw new Error(\`duplicate rule \${r.id}\`);
    this.rules.set(r.id, r);
  }

  run(lines: string[]): Issue[] {
    const out: Issue[] = [];
    const ids = [...this.rules.keys()].sort();
    lines.forEach((text, idx) => {
      const line = idx + 1;
      for (const id of ids) {
        const rule = this.rules.get(id)!;
        const severity = this.config.get(id) ?? rule.defaultSeverity;
        if (severity === Severity.OFF) continue;
        try {
          for (const msg of rule.check(line, text)) out.push({ line, rule: id, severity, msg });
        } catch (e) { // one bad plugin must not stop the run
          out.push({ line, rule: id, severity: Severity.INTERNAL, msg: \`rule crashed: \${(e as Error).message}\` });
        }
      }
    });
    return out.sort((a, b) => a.line - b.line || (a.rule < b.rule ? -1 : a.rule > b.rule ? 1 : 0));
  }
}

class NoFixme implements Rule {
  readonly id = "no-fixme";
  readonly defaultSeverity = Severity.WARN;
  check(_n: number, line: string): string[] { return line.includes("FIXME") ? ["FIXME left in code"] : []; }
}

class MaxLen implements Rule {
  readonly id = "max-len";
  readonly defaultSeverity = Severity.ERROR;
  constructor(private readonly max: number) {}
  check(_n: number, line: string): string[] { return line.length > this.max ? [\`\${line.length} > \${this.max}\`] : []; }
}

class Crashy implements Rule {
  readonly id = "crashy";
  readonly defaultSeverity = Severity.INFO;
  check(): string[] { throw new Error("boom"); }
}

const lint = new Linter(new Map([["max-len", Severity.WARN]])); // config overrides severity
for (const r of [new NoFixme(), new MaxLen(20), new Crashy()]) lint.register(r);
const source = ["int x = 1; // FIXME later", "ok"];
lint.run(source).forEach((i) => console.log(describe(i))); // a crashing rule does not stop the others
try { lint.register(new MaxLen(30)); } catch (e) { console.log(\`rejected: \${(e as Error).message}\`); }

console.log("--- no-fixme and crashy switched off");
const quiet = new Linter(new Map([["no-fixme", Severity.OFF], ["crashy", Severity.OFF]]));
for (const r of [new NoFixme(), new MaxLen(20), new Crashy()]) quiet.register(r);
quiet.run(source).forEach((i) => console.log(describe(i))); // max-len keeps its default severity
console.log(\`\${quiet.run(["ok"]).length} issues in a clean file\`);` },
          { lang: 'cpp', code: `enum class Severity { OFF, INFO, WARN, ERROR, INTERNAL };

string name(Severity s) {
    static const char* names[] = {"OFF", "INFO", "WARN", "ERROR", "INTERNAL"};
    return names[static_cast<int>(s)];
}

struct Issue {
    int line;
    string rule;
    Severity severity;
    string msg;
    string str() const { return to_string(line) + " " + name(severity) + " " + rule + ": " + msg; }
};

class Rule {  // the extension point
public:
    virtual ~Rule() = default;
    virtual string id() const = 0;
    virtual Severity defaultSeverity() const = 0;
    virtual vector<string> check(int lineNo, const string& line) const = 0;  // empty = clean
};

class Linter {
    map<string, unique_ptr<Rule>> rules_;  // std::map iterates in id order; the linter owns the rules
    map<string, Severity> config_;

public:
    explicit Linter(map<string, Severity> config) : config_(move(config)) {}

    void registerRule(unique_ptr<Rule> r) {
        string id = r->id();
        if (rules_.count(id)) throw invalid_argument("duplicate rule " + id);
        rules_[id] = move(r);
    }

    vector<Issue> run(const vector<string>& lines) const {
        vector<Issue> out;
        for (size_t i = 0; i < lines.size(); i++) {
            int line = static_cast<int>(i) + 1;
            for (const auto& [id, rule] : rules_) {
                auto it = config_.find(id);
                Severity sev = it != config_.end() ? it->second : rule->defaultSeverity();
                if (sev == Severity::OFF) continue;
                try {
                    for (const string& m : rule->check(line, lines[i])) out.push_back({line, id, sev, m});
                } catch (const exception& e) {  // one bad plugin must not stop the run
                    out.push_back({line, id, Severity::INTERNAL, string("rule crashed: ") + e.what()});
                }
            }
        }
        sort(out.begin(), out.end(), [](const Issue& a, const Issue& b) {
            return tie(a.line, a.rule) < tie(b.line, b.rule);
        });
        return out;
    }
};

class NoFixme : public Rule {
public:
    string id() const override { return "no-fixme"; }
    Severity defaultSeverity() const override { return Severity::WARN; }
    vector<string> check(int, const string& l) const override {
        return l.find("FIXME") != string::npos ? vector<string>{"FIXME left in code"} : vector<string>{};
    }
};

class MaxLen : public Rule {
    size_t max_;
public:
    explicit MaxLen(size_t max) : max_(max) {}
    string id() const override { return "max-len"; }
    Severity defaultSeverity() const override { return Severity::ERROR; }
    vector<string> check(int, const string& l) const override {
        return l.size() > max_ ? vector<string>{to_string(l.size()) + " > " + to_string(max_)} : vector<string>{};
    }
};

class Crashy : public Rule {
public:
    string id() const override { return "crashy"; }
    Severity defaultSeverity() const override { return Severity::INFO; }
    vector<string> check(int, const string&) const override { throw runtime_error("boom"); }
};

void addAll(Linter& lint) {
    lint.registerRule(make_unique<NoFixme>());
    lint.registerRule(make_unique<MaxLen>(20));
    lint.registerRule(make_unique<Crashy>());
}

int main() {
    Linter lint({{"max-len", Severity::WARN}});  // config overrides severity
    addAll(lint);
    vector<string> source = {"int x = 1; // FIXME later", "ok"};
    for (const Issue& i : lint.run(source)) cout << i.str() << "\\n";  // a crashing rule does not stop the others
    try {
        lint.registerRule(make_unique<MaxLen>(30));
    } catch (const invalid_argument& e) {
        cout << "rejected: " << e.what() << "\\n";
    }

    cout << "--- no-fixme and crashy switched off\\n";
    Linter quiet({{"no-fixme", Severity::OFF}, {"crashy", Severity::OFF}});
    addAll(quiet);
    for (const Issue& i : quiet.run(source)) cout << i.str() << "\\n";  // max-len keeps its default severity
    cout << quiet.run({"ok"}).size() << " issues in a clean file\\n";
}` }
        ],
        complexity: `<p>O(L × R) rule calls for L lines and R rules; O(I log I) to sort I issues. Adding a rule: one class + one <code>register</code> (or a discovered entry).</p>`,
        followUps: ['How would you load third-party rules from separate packages at startup (ServiceLoader, entry points, dynamic import, dlopen)?', 'How do you stop a rule that loops forever? (Run rules on an executor with a per-file timeout.)', 'How would rules that need the whole file (not one line) fit the API without breaking existing rules? (A second extension point or a default method.)']
      }
    }]
  });
  /* ======================= TOPIC 4: HEXAGONAL ARCHITECTURE ======================= */
  topics.push({
    title: 'Hexagonal Architecture (Ports & Adapters) at Class Level',
    analogy: `<p>Think of a <b>laptop</b>. Inside is the part that matters: CPU and memory (your business logic). Around the edge are <b>ports</b>: USB-C, HDMI, a headphone jack. The laptop defines each port's shape; it does not care whether you plug in a Dell monitor or an LG one. The <b>adapters</b> are the dongles and cables: HDMI-to-VGA, USB-C-to-Ethernet. When projectors change from VGA to HDMI, you buy a new dongle — you do not open the laptop and resolder the CPU.</p>
<p>Some ports are for things that <b>drive</b> the laptop (keyboard, mouse — they tell it what to do). Others are for things the laptop <b>drives</b> (monitor, printer — it tells them what to do). Hexagonal architecture has exactly these two kinds.</p>`,
    explain: `<p><b>Hexagonal architecture</b> (Alistair Cockburn, 2005; also "Ports and Adapters") puts your <b>business logic in the middle</b> and all technology (web, database, email, message queues, files) <b>outside</b>. The two meet only at <b>ports</b> — plain interfaces (abstract classes or protocols) owned by the inside. The hexagon shape just means "many sides, many ports"; there is nothing special about six.</p>
${H.table(['Ring', 'Contains', 'Example classes', 'Knows about'], [
  ['<b>Domain</b> (centre)', 'Entities, value objects, rules', '<code>Book</code>, <code>BookId</code>, <code>DomainException</code>', 'nothing but itself and the standard library'],
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
    code: [{ lang: 'java', code: `// ================= DOMAIN (centre): plain Java, zero technology =================
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
}`, alt: [
          { lang: 'python', code: `# ================= DOMAIN (centre): plain Python, zero technology =================
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from typing import Callable, Optional


@dataclass(frozen=True)
class BookId:
    value: str

    def __post_init__(self) -> None:
        if not self.value or not self.value.strip():
            raise ValueError("blank id")


@dataclass(frozen=True)
class MemberId:
    value: str


class DomainException(Exception):
    pass


class Book:
    def __init__(self, book_id: BookId, title: str) -> None:
        self.id, self.title = book_id, title
        self._borrowed_by: Optional[MemberId] = None
        self.due: Optional[date] = None

    def borrow(self, member: MemberId, today: date) -> None:
        if self._borrowed_by is not None:
            raise DomainException(f"'{self.title}' is already borrowed")
        self._borrowed_by, self.due = member, today + timedelta(days=14)

    def give_back(self) -> None:
        if self._borrowed_by is None:
            raise DomainException("not borrowed")
        self._borrowed_by, self.due = None, None

    @property
    def borrower(self) -> Optional[MemberId]:
        return self._borrowed_by


# ================= APPLICATION: ports + use case =================
@dataclass(frozen=True)
class BorrowBookCommand:
    member_id: str
    book_id: str


class BorrowBookUseCase(ABC):  # DRIVING (inbound) port
    @abstractmethod
    def borrow(self, cmd: BorrowBookCommand) -> date: ...


class BookRepository(ABC):  # DRIVEN (outbound) port
    @abstractmethod
    def find(self, book_id: BookId) -> Optional[Book]: ...

    @abstractmethod
    def save(self, b: Book) -> None: ...

    @abstractmethod
    def loans_of(self, m: MemberId) -> int: ...


class MemberNotifier(ABC):  # DRIVEN port
    @abstractmethod
    def loan_created(self, m: MemberId, title: str, due: date) -> None: ...


class BorrowBookService(BorrowBookUseCase):
    MAX_LOANS = 3

    def __init__(self, books: BookRepository, notifier: MemberNotifier, clock: Callable[[], datetime]) -> None:
        self._books, self._notifier, self._clock = books, notifier, clock

    def borrow(self, cmd: BorrowBookCommand) -> date:
        member = MemberId(cmd.member_id)
        book = self._books.find(BookId(cmd.book_id))
        if book is None:
            raise DomainException(f"no book {cmd.book_id}")
        if self._books.loans_of(member) >= self.MAX_LOANS:
            raise DomainException(f"loan limit {self.MAX_LOANS} reached")
        book.borrow(member, self._clock().date())  # the rule lives in the domain
        self._books.save(book)
        assert book.due is not None
        self._notifier.loan_created(member, book.title, book.due)
        return book.due


# ================= ADAPTERS (outside) =================
class InMemoryBookRepository(BookRepository):  # driven adapter
    def __init__(self) -> None:
        self._store: dict[BookId, Book] = {}

    def find(self, book_id: BookId) -> Optional[Book]:
        return self._store.get(book_id)

    def save(self, b: Book) -> None:
        self._store[b.id] = b

    def loans_of(self, m: MemberId) -> int:
        return sum(1 for b in self._store.values() if b.borrower == m)


class ConsoleNotifier(MemberNotifier):  # driven adapter
    def loan_created(self, m: MemberId, title: str, due: date) -> None:
        print(f"  [mail to {m.value}] '{title}' due {due.isoformat()}")


class CliAdapter:  # DRIVING adapter
    def __init__(self, use_case: BorrowBookUseCase) -> None:
        self._use_case = use_case

    def handle(self, line: str) -> str:  # "borrow <member> <book>"
        p = line.split()
        if len(p) != 3 or p[0] != "borrow":
            return "usage: borrow <member> <book>"  # FORMAT validation here
        try:
            return f"OK, due {self._use_case.borrow(BorrowBookCommand(p[1], p[2])).isoformat()}"
        except DomainException as e:
            return f"REFUSED: {e}"  # translate domain error to CLI text


# ================= COMPOSITION ROOT =================
repo = InMemoryBookRepository()
repo.save(Book(BookId("b1"), "Clean Architecture"))
repo.save(Book(BookId("b2"), "Domain-Driven Design"))
clock = lambda: datetime(2026, 4, 1, 10, 0, tzinfo=timezone.utc)  # noqa: E731
cli = CliAdapter(BorrowBookService(repo, ConsoleNotifier(), clock))
for cmd in ["borrow asha b1", "borrow ravi b1", "borrow ravi b9", "lend b2"]:
    reply = cli.handle(cmd)
    print(f"{cmd} -> {reply}")` },
          { lang: 'ts', code: `// ================= DOMAIN (centre): plain TypeScript, zero technology =================
class BookId {
  constructor(readonly value: string) {
    if (value.trim() === "") throw new Error("blank id");
  }
}
class MemberId { constructor(readonly value: string) {} }
class DomainException extends Error {}

const DAY_MS = 86_400_000;
const isoDay = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

class Book {
  private borrowedBy: MemberId | undefined;
  private dueMs: number | undefined; // epoch milliseconds

  constructor(readonly id: BookId, readonly title: string) {}

  borrow(member: MemberId, todayMs: number): void {
    if (this.borrowedBy !== undefined) throw new DomainException(\`'\${this.title}' is already borrowed\`);
    this.borrowedBy = member;
    this.dueMs = todayMs + 14 * DAY_MS;
  }
  giveBack(): void {
    if (this.borrowedBy === undefined) throw new DomainException("not borrowed");
    this.borrowedBy = undefined;
    this.dueMs = undefined;
  }
  due(): number | undefined { return this.dueMs; }
  borrower(): MemberId | undefined { return this.borrowedBy; }
}

// ================= APPLICATION: ports + use case =================
interface BorrowBookCommand { readonly memberId: string; readonly bookId: string; }
interface BorrowBookUseCase { borrow(cmd: BorrowBookCommand): number; } // DRIVING (inbound) port
interface BookRepository { // DRIVEN (outbound) port
  find(id: BookId): Book | undefined;
  save(b: Book): void;
  loansOf(m: MemberId): number;
}
interface MemberNotifier { loanCreated(m: MemberId, title: string, dueMs: number): void; } // DRIVEN port

class BorrowBookService implements BorrowBookUseCase {
  static readonly MAX_LOANS = 3;
  constructor(
    private readonly books: BookRepository,
    private readonly notifier: MemberNotifier,
    private readonly clock: () => number,
  ) {}

  borrow(cmd: BorrowBookCommand): number {
    const member = new MemberId(cmd.memberId);
    const book = this.books.find(new BookId(cmd.bookId));
    if (book === undefined) throw new DomainException(\`no book \${cmd.bookId}\`);
    if (this.books.loansOf(member) >= BorrowBookService.MAX_LOANS) {
      throw new DomainException(\`loan limit \${BorrowBookService.MAX_LOANS} reached\`);
    }
    book.borrow(member, this.clock()); // the rule lives in the domain
    this.books.save(book);
    const due = book.due()!;
    this.notifier.loanCreated(member, book.title, due);
    return due;
  }
}

// ================= ADAPTERS (outside) =================
class InMemoryBookRepository implements BookRepository { // driven adapter
  private readonly store = new Map<string, Book>(); // ids are objects, so key by their value
  find(id: BookId): Book | undefined { return this.store.get(id.value); }
  save(b: Book): void { this.store.set(b.id.value, b); }
  loansOf(m: MemberId): number {
    return [...this.store.values()].filter((b) => b.borrower()?.value === m.value).length;
  }
}
class ConsoleNotifier implements MemberNotifier { // driven adapter
  loanCreated(m: MemberId, title: string, dueMs: number): void {
    console.log(\`  [mail to \${m.value}] '\${title}' due \${isoDay(dueMs)}\`);
  }
}
class CliAdapter { // DRIVING adapter
  constructor(private readonly useCase: BorrowBookUseCase) {}

  handle(line: string): string { // "borrow <member> <book>"
    const p = line.trim().split(/ +/);
    if (p.length !== 3 || p[0] !== "borrow") return "usage: borrow <member> <book>"; // FORMAT validation here
    try {
      return \`OK, due \${isoDay(this.useCase.borrow({ memberId: p[1], bookId: p[2] }))}\`;
    } catch (e) {
      if (e instanceof DomainException) return \`REFUSED: \${e.message}\`; // translate domain error to CLI text
      throw e;
    }
  }
}

// ================= COMPOSITION ROOT =================
const repo = new InMemoryBookRepository();
repo.save(new Book(new BookId("b1"), "Clean Architecture"));
repo.save(new Book(new BookId("b2"), "Domain-Driven Design"));
const clock = (): number => Date.UTC(2026, 3, 1, 10, 0);
const cli = new CliAdapter(new BorrowBookService(repo, new ConsoleNotifier(), clock));
for (const cmd of ["borrow asha b1", "borrow ravi b1", "borrow ravi b9", "lend b2"]) {
  const reply = cli.handle(cmd);
  console.log(\`\${cmd} -> \${reply}\`);
}` },
          { lang: 'cpp', code: `// ================= DOMAIN (centre): plain C++, zero technology =================
// Dates are day numbers since 1970-01-01 (Howard Hinnant's civil-date algorithms).
long long daysFromCivil(int y, int m, int d) {
    y -= m <= 2;
    long long era = (y >= 0 ? y : y - 399) / 400;
    long long yoe = y - era * 400;
    long long doy = (153 * (m + (m > 2 ? -3 : 9)) + 2) / 5 + d - 1;
    long long doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    return era * 146097 + doe - 719468;
}

string isoDate(long long z) {
    z += 719468;
    long long era = (z >= 0 ? z : z - 146096) / 146097;
    long long doe = z - era * 146097;
    long long yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    long long doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    long long mp = (5 * doy + 2) / 153;
    int d = static_cast<int>(doy - (153 * mp + 2) / 5 + 1);
    int m = static_cast<int>(mp < 10 ? mp + 3 : mp - 9);
    long long y = yoe + era * 400 + (m <= 2);
    char buf[16];
    snprintf(buf, sizeof buf, "%04lld-%02d-%02d", y, m, d);
    return buf;
}

struct BookId {
    string value;
    explicit BookId(string v) : value(move(v)) {
        if (value.find_first_not_of(" \\t") == string::npos) throw invalid_argument("blank id");
    }
    auto operator<=>(const BookId&) const = default;
};
struct MemberId {
    string value;
    auto operator<=>(const MemberId&) const = default;
};
struct DomainException : runtime_error {
    using runtime_error::runtime_error;
};

class Book {
    BookId id_;
    string title_;
    optional<MemberId> borrowedBy_;
    optional<long long> due_;

public:
    Book(BookId id, string title) : id_(move(id)), title_(move(title)) {}
    void borrow(const MemberId& member, long long today) {
        if (borrowedBy_) throw DomainException("'" + title_ + "' is already borrowed");
        borrowedBy_ = member;
        due_ = today + 14;
    }
    void giveBack() {
        if (!borrowedBy_) throw DomainException("not borrowed");
        borrowedBy_.reset();
        due_.reset();
    }
    const BookId& id() const { return id_; }
    const string& title() const { return title_; }
    long long due() const { return *due_; }
    const optional<MemberId>& borrower() const { return borrowedBy_; }
};

// ================= APPLICATION: ports + use case =================
struct BorrowBookCommand { string memberId, bookId; };
struct BorrowBookUseCase {  // DRIVING (inbound) port
    virtual ~BorrowBookUseCase() = default;
    virtual long long borrow(const BorrowBookCommand& cmd) = 0;
};
struct BookRepository {  // DRIVEN (outbound) port
    virtual ~BookRepository() = default;
    virtual Book* find(const BookId& id) = 0;
    virtual void save(const Book& b) = 0;
    virtual long long loansOf(const MemberId& m) const = 0;
};
struct MemberNotifier {  // DRIVEN port
    virtual ~MemberNotifier() = default;
    virtual void loanCreated(const MemberId& m, const string& title, long long due) = 0;
};

class BorrowBookService : public BorrowBookUseCase {
    BookRepository& books_;  // the composition root owns the parts and outlives the service
    MemberNotifier& notifier_;
    function<long long()> clock_;

public:
    static constexpr int MAX_LOANS = 3;
    BorrowBookService(BookRepository& books, MemberNotifier& notifier, function<long long()> clock)
        : books_(books), notifier_(notifier), clock_(move(clock)) {}

    long long borrow(const BorrowBookCommand& cmd) override {
        MemberId member{cmd.memberId};
        Book* book = books_.find(BookId(cmd.bookId));
        if (!book) throw DomainException("no book " + cmd.bookId);
        if (books_.loansOf(member) >= MAX_LOANS) throw DomainException("loan limit " + to_string(MAX_LOANS) + " reached");
        book->borrow(member, clock_());  // the rule lives in the domain
        books_.save(*book);
        notifier_.loanCreated(member, book->title(), book->due());
        return book->due();
    }
};

// ================= ADAPTERS (outside) =================
class InMemoryBookRepository : public BookRepository {  // driven adapter
    map<BookId, Book> store_;
public:
    Book* find(const BookId& id) override {
        auto it = store_.find(id);
        return it == store_.end() ? nullptr : &it->second;
    }
    void save(const Book& b) override { store_.insert_or_assign(b.id(), b); }
    long long loansOf(const MemberId& m) const override {
        return count_if(store_.begin(), store_.end(), [&](const auto& kv) { return kv.second.borrower() == m; });
    }
};
class ConsoleNotifier : public MemberNotifier {  // driven adapter
public:
    void loanCreated(const MemberId& m, const string& title, long long due) override {
        cout << "  [mail to " << m.value << "] '" << title << "' due " << isoDate(due) << "\\n";
    }
};
class CliAdapter {  // DRIVING adapter
    BorrowBookUseCase& useCase_;
public:
    explicit CliAdapter(BorrowBookUseCase& u) : useCase_(u) {}
    string handle(const string& line) {  // "borrow <member> <book>"
        istringstream in(line);
        vector<string> p;
        for (string w; in >> w;) p.push_back(w);
        if (p.size() != 3 || p[0] != "borrow") return "usage: borrow <member> <book>";  // FORMAT validation here
        try {
            return "OK, due " + isoDate(useCase_.borrow({p[1], p[2]}));
        } catch (const DomainException& e) {
            return string("REFUSED: ") + e.what();  // translate domain error to CLI text
        }
    }
};

// ================= COMPOSITION ROOT =================
int main() {
    InMemoryBookRepository repo;
    repo.save(Book(BookId("b1"), "Clean Architecture"));
    repo.save(Book(BookId("b2"), "Domain-Driven Design"));
    ConsoleNotifier notifier;
    BorrowBookService service(repo, notifier, [] { return daysFromCivil(2026, 4, 1); });
    CliAdapter cli(service);
    for (const string cmd : {"borrow asha b1", "borrow ravi b1", "borrow ravi b9", "lend b2"}) {
        string reply = cli.handle(cmd);
        cout << cmd << " -> " << reply << "\\n";
    }
}` }
        ] }, { lang: 'text', title: 'Package layout that makes the rings visible', code: `com.library
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
    codeTitle: ['Complete hexagon without a framework: domain, ports, service, adapters, root', 'Package layout', 'Framework adapters in Java/Spring (not compiled)'],
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
        frames.push(F('At runtime the port is implemented by <b>BorrowBookService</b> (wired in the composition root). The use case now orchestrates: load, decide, save, notify.', [g(hl, ehl), CODE('BorrowBookService.borrow', 'Book book = books.find(id).orElseThrow();\nif (books.loansOf(member) >= MAX_LOANS) throw ...;\nbook.borrow(member, LocalDate.now(clock));\nbooks.save(book);\nnotifier.loanCreated(member, title, due);', { 1: 'cur' }, BORROW_ALT)]));
        ehl = clone(ehl); ehl['SVC-IN'] = 'ok'; ehl['SVC-RP'] = 'cur'; ehl[per + '-RP'] = 'cur'; hl = clone(hl); hl.RP = 'cur'; hl[per] = 'cur';
        var how = { PG: 'SELECT * FROM books WHERE id = ? → map the row to a Book', MEM: 'map.get(bookId) — no database at all', MG: 'collection.find({_id: "b1"}) → map the document to a Book' }[per];
        frames.push(F('Service calls the <b>outbound port</b> <code>BookRepository.find</code>. The <b>' + esc(perName) + '</b> adapter does the real work: <i>' + esc(how) + '</i>. The service never sees SQL or Mongo.', [g(hl, ehl), CODE('BorrowBookService.borrow', 'Book book = books.find(id).orElseThrow();\nif (books.loansOf(member) >= MAX_LOANS) throw ...;\nbook.borrow(member, LocalDate.now(clock));\nbooks.save(book);\nnotifier.loanCreated(member, title, due);', { 1: 'ok', 2: 'cur' }, BORROW_ALT)]));
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
}`, alt: [
          { lang: 'python', code: `from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True)
class Book:  # domain
    id: str
    title: str
    borrower: Optional[str]


@dataclass
class BookRow:  # DB-shaped
    id: str = ""
    title: str = ""
    borrower_id: Optional[str] = None


class BookMapper:
    @staticmethod
    def to_domain(r: BookRow) -> Book:
        return Book(r.id, r.title, r.borrower_id)

    @staticmethod
    def to_row(b: Book) -> BookRow:
        return BookRow(b.id, b.title, b.borrower)` },
          { lang: 'ts', code: `interface Book { readonly id: string; readonly title: string; readonly borrower: string | null; } // domain
interface BookRow { id: string; title: string; borrower_id: string | null; } // DB-shaped

const BookMapper = {
  toDomain: (r: BookRow): Book => ({ id: r.id, title: r.title, borrower: r.borrower_id }),
  toRow: (b: Book): BookRow => ({ id: b.id, title: b.title, borrower_id: b.borrower }),
};` },
          { lang: 'cpp', code: `struct Book {  // domain
    string id, title;
    optional<string> borrower;
};
struct BookRow {  // DB-shaped
    string id, title;
    optional<string> borrowerId;
};

struct BookMapper {
    static Book toDomain(const BookRow& r) { return Book{r.id, r.title, r.borrowerId}; }
    static BookRow toRow(const Book& b) { return BookRow{b.id, b.title, b.borrower}; }
};` }
        ] },
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
      statement: `<p>Design the core of a URL shortener with ports and adapters. Use cases: <code>shorten(longUrl, owner)</code> returns a short code; <code>resolve(code)</code> returns the long URL and counts the click. Rules: URL must start with http(s); the same owner shortening the same URL gets the same code (unless that link has expired, then a fresh code is issued); a code expires after 30 days. Provide: domain, inbound ports, outbound ports (store, code generator, clock), an in-memory store, a CLI driving adapter, and a composition root. No frameworks.</p>`,
      constraints: `Codes from a generator port (so tests are deterministic). Expiry decided with an injected Clock.`,
      example: `<p><code>shorten https://a.com/x asha</code> → ${H.c('g', 'gjdgxs')}. Again with the same owner → ${H.c('g', 'gjdgxs')} (idempotent). <code>resolve gjdgxs</code> → https://a.com/x, clicks 1. Move the clock 31 days → ${H.c('r', 'expired')}.</p>`,
      brute: { why: `<p>A single <code>ShortenerController</code> holds a static <code>HashMap</code>, calls <code>Random</code> and <code>LocalDate.now()</code> directly and prints to <code>System.out</code>. The rules are mixed with I/O, tests cannot control the code or the date, and moving to Redis means rewriting the controller.</p>`, code: { lang: 'java', code: `class ShortenerBrute {
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
}`, alt: [{ lang: 'python', code: "import random, string\nfrom datetime import date, timedelta\n\nclass ShortenerBrute:\n    DB = {}\n    CREATED = {}\n\n    @staticmethod\n    def shorten(url):\n        code = \"\".join(random.choices(string.digits + string.ascii_lowercase, k=7))\n        ShortenerBrute.DB[code] = url\n        ShortenerBrute.CREATED[code] = date.today()\n        return code\n\n    @staticmethod\n    def resolve(code):\n        if ShortenerBrute.CREATED[code] + timedelta(days=30) < date.today(): return \"expired\"\n        return ShortenerBrute.DB[code]\n" }, { lang: 'ts', code: "class ShortenerBrute {\n  static DB = new Map<string, string>();\n  static CREATED = new Map<string, number>();            // code -> creation time (ms)\n  static shorten(url: string): string {\n    const code = Math.random().toString(36).slice(2, 9);\n    ShortenerBrute.DB.set(code, url); ShortenerBrute.CREATED.set(code, Date.now());\n    return code;\n  }\n  static resolve(code: string): string | undefined {\n    if (ShortenerBrute.CREATED.get(code)! + 30 * 86_400_000 < Date.now()) return \"expired\";\n    return ShortenerBrute.DB.get(code);\n  }\n}\n" }, { lang: 'cpp', code: "struct ShortenerBrute {\n    static inline unordered_map<string, string> DB;\n    static inline unordered_map<string, long long> CREATED;   // code -> creation day\n    static long long today() { return time(nullptr) / 86400; }\n\n    static string shorten(const string& url) {\n        static const string digits = \"0123456789abcdefghijklmnopqrstuvwxyz\";\n        string code;\n        for (int i = 0; i < 7; i++) code += digits[rand() % 36];\n        DB[code] = url; CREATED[code] = today();\n        return code;\n    }\n    static string resolve(const string& code) {\n        if (CREATED[code] + 30 < today()) return \"expired\";\n        return DB[code];\n    }\n};\n" }] } },
      mcq: { q: 'Which of these should be an OUTBOUND (driven) port?', options: ['CodeGenerator — the core needs codes from somewhere', 'ShortenUseCase — the CLI calls it', 'ShortLink — the domain entity', 'CliAdapter — it reads user input'], answer: 0, explain: 'Outbound ports describe what the core needs from the outside (storage, codes, time). Inbound ports describe what the outside can ask the core to do.' },
      hints: [`<p>Hint 1: Domain: <code>ShortLink</code> (code, url, owner, createdAt, clicks) with methods <code>isExpired(now)</code> and <code>recordClick()</code>.</p>`, `<p>Hint 2: Inbound: <code>ShortenUseCase</code>, <code>ResolveUseCase</code>. Outbound: <code>LinkStore</code> (save, byCode, byOwnerAndUrl), <code>CodeGenerator</code>, <code>Clock</code>.</p>`, `<p>Hint 3: Idempotency: look up <code>byOwnerAndUrl</code> before generating. Validation of URL format belongs in the domain (it is a business rule here); parsing the CLI line belongs in the adapter.</p>`],
      tests: { io: true, cases: [{ stdin: '', stdout: "shorten https://a.com/x asha => gjdgxs\nshorten https://a.com/x asha => gjdgxs\nshorten https://a.com/x bob => gjdgxt\nshorten ftp://bad asha => error: URL must be http(s)\nresolve nope => error: unknown code nope\nhello => usage: shorten <url> <owner> | resolve <code>\nresolve gjdgxs => https://a.com/x\nresolve gjdgxs => error: link expired\nshorten https://a.com/x asha => gjdgxv\nresolve gjdgxv => https://a.com/x\n" }] },
      solution: {
        approach: `<p>The domain entity owns expiry and click counting. One application service implements both inbound ports and depends only on outbound ports. The in-memory store and a counter-based code generator are driven adapters; the CLI is a driving adapter that parses text and maps exceptions. The root wires production-like adapters; a test would wire a fixed clock and a predictable generator. An expired link is never reused: shortening the same URL again after 30 days issues a new code.</p>`,
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
        Instant now = clock.instant();
        return store.byOwnerAndUrl(owner, url).filter(l -> !l.isExpired(now)).map(ShortLink::code).orElseGet(() -> {
            ShortLink l = new ShortLink(codes.next(), url, owner, now);
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
    private final Map<String, ShortLink> byCode = new LinkedHashMap<>();   // insertion order = oldest first
    public void save(ShortLink l) { byCode.put(l.code(), l); }
    public Optional<ShortLink> byCode(String c) { return Optional.ofNullable(byCode.get(c)); }
    public Optional<ShortLink> byOwnerAndUrl(String o, String u) {         // newest match wins
        ShortLink found = null;
        for (ShortLink l : byCode.values()) if (l.owner().equals(o) && l.url().equals(u)) found = l;
        return Optional.ofNullable(found);
    }
}
class Base36Counter implements CodeGenerator {                             // driven adapter
    private long n = 1_000_000_000L;
    public String next() { return Long.toString(n++, 36); }               // 6 chars, unique, predictable in tests
}

class MutableClock extends Clock {                                         // test double: time moves when we say so
    private Instant now;
    MutableClock(Instant start) { now = start; }
    void plusSeconds(long s) { now = now.plusSeconds(s); }
    public Instant instant() { return now; }
    public ZoneId getZone() { return ZoneOffset.UTC; }
    public Clock withZone(ZoneId zone) { return this; }
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
    static void say(ShortenerCli cli, String cmd) { System.out.println(cmd + " => " + cli.run(cmd)); }

    public static void main(String[] args) {
        MutableClock clock = new MutableClock(Instant.parse("2026-03-01T00:00:00Z"));
        ShortenerService svc = new ShortenerService(new InMemoryLinkStore(), new Base36Counter(), clock);
        ShortenerCli cli = new ShortenerCli(svc, svc);
        say(cli, "shorten https://a.com/x asha");
        say(cli, "shorten https://a.com/x asha");              // same owner and URL: same code
        say(cli, "shorten https://a.com/x bob");               // another owner gets another code
        say(cli, "shorten ftp://bad asha");                    // only http(s) is allowed
        say(cli, "resolve nope");
        say(cli, "hello");
        clock.plusSeconds(30 * 86_400L);
        say(cli, "resolve gjdgxs");                         // day 30: still alive
        clock.plusSeconds(1);
        say(cli, "resolve gjdgxs");                         // one second later: expired
        say(cli, "shorten https://a.com/x asha");              // an expired link is not reused
        say(cli, "resolve gjdgxv");
    }
}`,
        alt: [
          { lang: 'python', code: `from abc import ABC, abstractmethod
from datetime import datetime, timedelta, timezone
from typing import Callable, Optional

Clock = Callable[[], datetime]
DIGITS = "0123456789abcdefghijklmnopqrstuvwxyz"


class ShortLink:  # domain
    def __init__(self, code: str, url: str, owner: str, created_at: datetime) -> None:
        if not url.startswith(("http://", "https://")):
            raise ValueError("URL must be http(s)")
        self._code, self._url, self._owner, self._created_at = code, url, owner, created_at
        self._clicks = 0

    def is_expired(self, now: datetime) -> bool:
        return now > self._created_at + timedelta(days=30)

    def visit(self, now: datetime) -> str:
        if self.is_expired(now):
            raise RuntimeError("link expired")
        self._clicks += 1
        return self._url

    @property
    def code(self) -> str:
        return self._code

    @property
    def url(self) -> str:
        return self._url

    @property
    def owner(self) -> str:
        return self._owner

    @property
    def clicks(self) -> int:
        return self._clicks


class ShortenUseCase(ABC):  # inbound ports
    @abstractmethod
    def shorten(self, url: str, owner: str) -> str: ...


class ResolveUseCase(ABC):
    @abstractmethod
    def resolve(self, code: str) -> str: ...


class LinkStore(ABC):  # outbound ports
    @abstractmethod
    def save(self, link: ShortLink) -> None: ...

    @abstractmethod
    def by_code(self, code: str) -> Optional[ShortLink]: ...

    @abstractmethod
    def by_owner_and_url(self, owner: str, url: str) -> Optional[ShortLink]: ...


class CodeGenerator(ABC):
    @abstractmethod
    def next(self) -> str: ...


class ShortenerService(ShortenUseCase, ResolveUseCase):
    def __init__(self, store: LinkStore, codes: CodeGenerator, clock: Clock) -> None:
        self._store, self._codes, self._clock = store, codes, clock

    def shorten(self, url: str, owner: str) -> str:
        now = self._clock()
        existing = self._store.by_owner_and_url(owner, url)
        if existing is not None and not existing.is_expired(now):
            return existing.code
        link = ShortLink(self._codes.next(), url, owner, now)
        self._store.save(link)
        return link.code

    def resolve(self, code: str) -> str:
        link = self._store.by_code(code)
        if link is None:
            raise LookupError(f"unknown code {code}")
        url = link.visit(self._clock())
        self._store.save(link)
        return url


class InMemoryLinkStore(LinkStore):  # driven adapter
    def __init__(self) -> None:
        self._by_code: dict[str, ShortLink] = {}  # insertion order = oldest first

    def save(self, link: ShortLink) -> None:
        self._by_code[link.code] = link

    def by_code(self, code: str) -> Optional[ShortLink]:
        return self._by_code.get(code)

    def by_owner_and_url(self, owner: str, url: str) -> Optional[ShortLink]:  # newest match wins
        found = None
        for link in self._by_code.values():
            if link.owner == owner and link.url == url:
                found = link
        return found


class Base36Counter(CodeGenerator):  # driven adapter
    def __init__(self) -> None:
        self._n = 1_000_000_000

    def next(self) -> str:  # 6 chars, unique, predictable in tests
        n, self._n = self._n, self._n + 1
        out = ""
        while n:
            n, d = divmod(n, 36)
            out = DIGITS[d] + out
        return out


class MutableClock:  # test double: time moves when we say so
    def __init__(self, start: datetime) -> None:
        self._now = start

    def plus_seconds(self, s: int) -> None:
        self._now += timedelta(seconds=s)

    def __call__(self) -> datetime:
        return self._now


class ShortenerCli:  # driving adapter
    def __init__(self, shorten: ShortenUseCase, resolve: ResolveUseCase) -> None:
        self._shorten, self._resolve = shorten, resolve

    def run(self, line: str) -> str:
        p = line.split()
        try:
            if p[0] == "shorten" and len(p) == 3:
                return self._shorten.shorten(p[1], p[2])
            if p[0] == "resolve" and len(p) == 2:
                return self._resolve.resolve(p[1])
            return "usage: shorten <url> <owner> | resolve <code>"
        except (ValueError, RuntimeError, LookupError) as e:
            return "error: " + (e.args[0] if e.args else "")


def say(cli: ShortenerCli, cmd: str) -> None:
    print(f"{cmd} => {cli.run(cmd)}")


clock = MutableClock(datetime(2026, 3, 1, tzinfo=timezone.utc))
svc = ShortenerService(InMemoryLinkStore(), Base36Counter(), clock)
cli = ShortenerCli(svc, svc)
say(cli, "shorten https://a.com/x asha")
say(cli, "shorten https://a.com/x asha")  # same owner and URL: same code
say(cli, "shorten https://a.com/x bob")  # another owner gets another code
say(cli, "shorten ftp://bad asha")  # only http(s) is allowed
say(cli, "resolve nope")
say(cli, "hello")
clock.plus_seconds(30 * 86_400)
say(cli, "resolve gjdgxs")  # day 30: still alive
clock.plus_seconds(1)
say(cli, "resolve gjdgxs")  # one second later: expired
say(cli, "shorten https://a.com/x asha")  # an expired link is not reused
say(cli, "resolve gjdgxv")` },
          { lang: 'ts', code: `const THIRTY_DAYS_MS = 30 * 86_400_000;

class ShortLink { // domain
  private clickCount = 0;
  constructor(
    readonly code: string,
    readonly url: string,
    readonly owner: string,
    private readonly createdAt: number,
  ) {
    if (!url.startsWith("http://") && !url.startsWith("https://")) throw new Error("URL must be http(s)");
  }
  isExpired(now: number): boolean { return now > this.createdAt + THIRTY_DAYS_MS; }
  visit(now: number): string {
    if (this.isExpired(now)) throw new Error("link expired");
    this.clickCount++;
    return this.url;
  }
  clicks(): number { return this.clickCount; }
}

interface ShortenUseCase { shorten(url: string, owner: string): string; } // inbound ports
interface ResolveUseCase { resolve(code: string): string; }
interface LinkStore { // outbound ports
  save(link: ShortLink): void;
  byCode(code: string): ShortLink | undefined;
  byOwnerAndUrl(owner: string, url: string): ShortLink | undefined;
}
interface CodeGenerator { next(): string; }
type Clock = () => number; // epoch milliseconds

class ShortenerService implements ShortenUseCase, ResolveUseCase {
  constructor(private readonly store: LinkStore, private readonly codes: CodeGenerator, private readonly clock: Clock) {}

  shorten(url: string, owner: string): string {
    const now = this.clock();
    const existing = this.store.byOwnerAndUrl(owner, url);
    if (existing !== undefined && !existing.isExpired(now)) return existing.code;
    const link = new ShortLink(this.codes.next(), url, owner, now);
    this.store.save(link);
    return link.code;
  }

  resolve(code: string): string {
    const link = this.store.byCode(code);
    if (link === undefined) throw new Error(\`unknown code \${code}\`);
    const url = link.visit(this.clock());
    this.store.save(link);
    return url;
  }
}

class InMemoryLinkStore implements LinkStore { // driven adapter
  private readonly links = new Map<string, ShortLink>(); // insertion order = oldest first
  save(link: ShortLink): void { this.links.set(link.code, link); }
  byCode(code: string): ShortLink | undefined { return this.links.get(code); }
  byOwnerAndUrl(owner: string, url: string): ShortLink | undefined { // newest match wins
    let found: ShortLink | undefined;
    for (const l of this.links.values()) if (l.owner === owner && l.url === url) found = l;
    return found;
  }
}

class Base36Counter implements CodeGenerator { // driven adapter
  private n = 1_000_000_000;
  next(): string { return (this.n++).toString(36); } // 6 chars, unique, predictable in tests
}

class MutableClock { // test double: time moves when we say so
  constructor(private nowMs: number) {}
  plusSeconds(s: number): void { this.nowMs += s * 1000; }
  readonly now: Clock = () => this.nowMs;
}

class ShortenerCli { // driving adapter
  constructor(private readonly shorten: ShortenUseCase, private readonly resolve: ResolveUseCase) {}
  run(line: string): string {
    const p = line.trim().split(/ +/);
    try {
      if (p[0] === "shorten" && p.length === 3) return this.shorten.shorten(p[1], p[2]);
      if (p[0] === "resolve" && p.length === 2) return this.resolve.resolve(p[1]);
      return "usage: shorten <url> <owner> | resolve <code>";
    } catch (e) { return "error: " + (e as Error).message; }
  }
}

function say(cli: ShortenerCli, cmd: string): void { console.log(\`\${cmd} => \${cli.run(cmd)}\`); }

const clock = new MutableClock(Date.UTC(2026, 2, 1));
const svc = new ShortenerService(new InMemoryLinkStore(), new Base36Counter(), clock.now);
const cli = new ShortenerCli(svc, svc);
say(cli, "shorten https://a.com/x asha");
say(cli, "shorten https://a.com/x asha"); // same owner and URL: same code
say(cli, "shorten https://a.com/x bob"); // another owner gets another code
say(cli, "shorten ftp://bad asha"); // only http(s) is allowed
say(cli, "resolve nope");
say(cli, "hello");
clock.plusSeconds(30 * 86_400);
say(cli, "resolve gjdgxs"); // day 30: still alive
clock.plusSeconds(1);
say(cli, "resolve gjdgxs"); // one second later: expired
say(cli, "shorten https://a.com/x asha"); // an expired link is not reused
say(cli, "resolve gjdgxv");` },
          { lang: 'cpp', code: `using Clock = function<long long()>;  // epoch seconds
constexpr long long THIRTY_DAYS = 30LL * 86'400;

class ShortLink {  // domain
    string code_, url_, owner_;
    long long createdAt_;
    long long clicks_ = 0;

public:
    ShortLink(string code, string url, string owner, long long createdAt)
        : code_(move(code)), url_(move(url)), owner_(move(owner)), createdAt_(createdAt) {
        if (url_.rfind("http://", 0) != 0 && url_.rfind("https://", 0) != 0) throw invalid_argument("URL must be http(s)");
    }
    bool isExpired(long long now) const { return now > createdAt_ + THIRTY_DAYS; }
    string visit(long long now) {
        if (isExpired(now)) throw runtime_error("link expired");
        clicks_++;
        return url_;
    }
    const string& code() const { return code_; }
    const string& url() const { return url_; }
    const string& owner() const { return owner_; }
    long long clicks() const { return clicks_; }
};

struct ShortenUseCase {  // inbound ports
    virtual ~ShortenUseCase() = default;
    virtual string shorten(const string& url, const string& owner) = 0;
};
struct ResolveUseCase {
    virtual ~ResolveUseCase() = default;
    virtual string resolve(const string& code) = 0;
};
struct LinkStore {  // outbound ports
    virtual ~LinkStore() = default;
    virtual void save(const ShortLink& link) = 0;
    virtual optional<ShortLink> byCode(const string& code) const = 0;
    virtual optional<ShortLink> byOwnerAndUrl(const string& owner, const string& url) const = 0;
};
struct CodeGenerator {
    virtual ~CodeGenerator() = default;
    virtual string next() = 0;
};

class ShortenerService : public ShortenUseCase, public ResolveUseCase {
    LinkStore& store_;
    CodeGenerator& codes_;
    Clock clock_;

public:
    ShortenerService(LinkStore& s, CodeGenerator& g, Clock c) : store_(s), codes_(g), clock_(move(c)) {}

    string shorten(const string& url, const string& owner) override {
        long long now = clock_();
        auto existing = store_.byOwnerAndUrl(owner, url);
        if (existing && !existing->isExpired(now)) return existing->code();
        ShortLink link(codes_.next(), url, owner, now);
        store_.save(link);
        return link.code();
    }
    string resolve(const string& code) override {
        auto link = store_.byCode(code);
        if (!link) throw out_of_range("unknown code " + code);
        string url = link->visit(clock_());
        store_.save(*link);
        return url;
    }
};

class InMemoryLinkStore : public LinkStore {  // driven adapter
    vector<ShortLink> links_;                 // insertion order = oldest first
public:
    void save(const ShortLink& link) override {
        for (auto& l : links_) if (l.code() == link.code()) { l = link; return; }
        links_.push_back(link);
    }
    optional<ShortLink> byCode(const string& code) const override {
        for (const auto& l : links_) if (l.code() == code) return l;
        return nullopt;
    }
    optional<ShortLink> byOwnerAndUrl(const string& owner, const string& url) const override {  // newest match wins
        optional<ShortLink> found;
        for (const auto& l : links_) if (l.owner() == owner && l.url() == url) found = l;
        return found;
    }
};

class Base36Counter : public CodeGenerator {  // driven adapter
    long long n_ = 1'000'000'000;
public:
    string next() override {  // 6 chars, unique, predictable in tests
        static const string digits = "0123456789abcdefghijklmnopqrstuvwxyz";
        string out;
        for (long long n = n_++; n > 0; n /= 36) out += digits[n % 36];
        reverse(out.begin(), out.end());
        return out;
    }
};

class MutableClock {  // test double: time moves when we say so
    long long now_;
public:
    explicit MutableClock(long long start) : now_(start) {}
    void plusSeconds(long long s) { now_ += s; }
    Clock clock() { return [this] { return now_; }; }
};

class ShortenerCli {  // driving adapter
    ShortenUseCase& shorten_;
    ResolveUseCase& resolve_;

public:
    ShortenerCli(ShortenUseCase& s, ResolveUseCase& r) : shorten_(s), resolve_(r) {}
    string run(const string& line) {
        istringstream in(line);
        vector<string> p;
        for (string w; in >> w;) p.push_back(w);
        try {
            if (p[0] == "shorten" && p.size() == 3) return shorten_.shorten(p[1], p[2]);
            if (p[0] == "resolve" && p.size() == 2) return resolve_.resolve(p[1]);
            return "usage: shorten <url> <owner> | resolve <code>";
        } catch (const exception& e) {
            return string("error: ") + e.what();
        }
    }
};

void say(ShortenerCli& cli, const string& cmd) { cout << cmd << " => " << cli.run(cmd) << "\\n"; }

int main() {
    MutableClock clock(1'772'323'200);  // 2026-03-01T00:00:00Z
    InMemoryLinkStore store;
    Base36Counter counter;
    ShortenerService svc(store, counter, clock.clock());
    ShortenerCli cli(svc, svc);
    say(cli, "shorten https://a.com/x asha");
    say(cli, "shorten https://a.com/x asha");  // same owner and URL: same code
    say(cli, "shorten https://a.com/x bob");   // another owner gets another code
    say(cli, "shorten ftp://bad asha");        // only http(s) is allowed
    say(cli, "resolve nope");
    say(cli, "hello");
    clock.plusSeconds(30 * 86'400);
    say(cli, "resolve gjdgxs");                // day 30: still alive
    clock.plusSeconds(1);
    say(cli, "resolve gjdgxs");                // one second later: expired
    say(cli, "shorten https://a.com/x asha");  // an expired link is not reused
    say(cli, "resolve gjdgxv");
}` }
        ],
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
  ['Language tool', 'class with private fields + methods', 'immutable class with a validating constructor (<code>record</code> in Java, frozen dataclass in Python, <code>readonly</code> class in TypeScript, <code>const</code>-member class in C++)']
])}
<p><b>Value objects kill "primitive obsession".</b> A method <code>book(String from, String to, double amount, String currency, String email)</code> is easy to call wrongly: swap <code>from</code>/<code>to</code>, pass dollars as rupees, pass an invalid email. With value objects it becomes <code>book(Airport from, Airport to, Money price, Email contact)</code>. Each type <b>validates itself once in its constructor</b>, so an invalid <code>Email</code> cannot exist anywhere in the system. The compiler now catches swapped arguments.</p>
<p><b>Value objects carry behaviour</b>, not just data: <code>Money.add</code> refuses to add INR to USD; <code>DateRange.overlaps(other)</code>; <code>Quantity.minus</code> refuses to go below zero. Because they are immutable, they are thread-safe, can be shared and cached, and are perfect map keys.</p>
<p><b>Entities protect their identity and their rules.</b> A <code>Customer</code> keeps the same <code>CustomerId</code> when the email changes. Use a <b>typed ID</b> (a small <code>CustomerId</code> value object wrapping a UUID) instead of a bare <code>long</code> so you cannot pass an <code>OrderId</code> where a <code>CustomerId</code> is expected. Implement <code>equals</code>/<code>hashCode</code> on the ID only.</p>
<p><b>Rule of thumb:</b> make everything a value object by default; promote to an entity only when the business needs to track "this specific one" over time. Most of a good domain model is value objects; entities are fewer and are the things you load and save.</p>`,
    clues: [
      'Method signatures with many <code>String</code>/<code>double</code> parameters → primitive obsession → introduce value objects.',
      '"Two objects with the same data — are they the same?" → identity question: entity vs value object.',
      '<b>Money</b> appears anywhere → never <code>double</code>; a Money VO with currency and minor units (or <code>BigDecimal</code>).',
      '"Track the history / lifecycle of X" or "X can be renamed" → X is an entity with a stable ID.',
      '"Thread-safe", "can be cached", "used as a map key" → immutable value object.',
      'Validation duplicated in many places (email regex in 5 services) → move it into a VO constructor.'
    ],
    code: [{ lang: 'java', code: `// VALUE OBJECT: Money. Immutable record, self-validating, behaviour-rich, equality by value.
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
        long base = Math.floorDiv(minor, parts), extra = Math.floorMod(minor, parts);   // floor, so negative amounts split correctly too
        List<Money> out = new ArrayList<>();
        for (int i = 0; i < parts; i++) out.add(new Money(base + (i < extra ? 1 : 0), currency));
        return out;
    }
    private void same(Money o) { if (!currency.equals(o.currency)) throw new IllegalArgumentException(currency + " vs " + o.currency); }
    @Override public String toString() {
        long abs = Math.abs(minor);
        return currency + " " + (minor < 0 ? "-" : "") + abs / 100 + "." + String.format("%02d", abs % 100);
    }

    public static void main(String[] args) {
        Money a = Money.of(100, "INR"), b = Money.of(100, "INR");
        System.out.println(a.equals(b) + " " + (a == b));        // true false: equal by value, different objects
        Money c = a.plus(Money.of(50, "INR"));
        System.out.println(a + " -> " + c);                      // a is unchanged: INR 100.00 -> INR 150.00
        System.out.println(Money.of(100, "INR").allocate(3));    // [INR 33.34, INR 33.33, INR 33.33]
        System.out.println(new Money(-50, "INR") + " " + Money.of(-1, "INR").allocate(3));   // INR -0.50 [INR -0.33, INR -0.33, INR -0.34]
        try { a.plus(Money.of(1, "USD")); } catch (IllegalArgumentException e) { System.out.println("refused: " + e.getMessage()); }
    }
}`, alt: [
          { lang: 'python', code: `# VALUE OBJECT: Money. Immutable dataclass, self-validating, behaviour-rich, equality by value.
import re
from dataclasses import dataclass


@dataclass(frozen=True)  # frozen: no setters; eq=True (default): equal by value, and hashable
class Money:
    minor: int  # minor units: paise / cents. Never float for money.
    currency: str

    def __post_init__(self) -> None:  # validation, runs for EVERY instance
        if not isinstance(self.currency, str) or not re.fullmatch(r"[A-Z]{3}", self.currency):
            raise ValueError(f"ISO currency like INR: {self.currency}")

    @staticmethod
    def of(major: int, cur: str) -> "Money":
        return Money(major * 100, cur)

    @staticmethod
    def zero(cur: str) -> "Money":
        return Money(0, cur)

    def plus(self, o: "Money") -> "Money":  # NEW object
        self._same(o)
        return Money(self.minor + o.minor, self.currency)

    def minus(self, o: "Money") -> "Money":
        self._same(o)
        return Money(self.minor - o.minor, self.currency)

    def times(self, n: int) -> "Money":
        return Money(self.minor * n, self.currency)

    def is_negative(self) -> bool:
        return self.minor < 0

    def greater_than(self, o: "Money") -> bool:
        self._same(o)
        return self.minor > o.minor

    # Split fairly: 100.00 / 3 -> 33.34, 33.33, 33.33 (no paisa lost, no paisa invented)
    def allocate(self, parts: int) -> list["Money"]:
        if parts <= 0:
            raise ValueError("parts > 0")
        base, extra = divmod(self.minor, parts)  # floor division, so negative amounts split correctly too
        return [Money(base + (1 if i < extra else 0), self.currency) for i in range(parts)]

    def _same(self, o: "Money") -> None:
        if self.currency != o.currency:
            raise ValueError(f"{self.currency} vs {o.currency}")

    def __str__(self) -> str:
        sign = "-" if self.minor < 0 else ""
        return f"{self.currency} {sign}{abs(self.minor) // 100}.{abs(self.minor) % 100:02d}"


a, b = Money.of(100, "INR"), Money.of(100, "INR")
print(str(a == b).lower(), str(a is b).lower())  # true false: equal by value, different objects
c = a.plus(Money.of(50, "INR"))
print(f"{a} -> {c}")  # a is unchanged: INR 100.00 -> INR 150.00
print("[" + ", ".join(str(m) for m in Money.of(100, "INR").allocate(3)) + "]")  # [INR 33.34, INR 33.33, INR 33.33]
print(Money(-50, "INR"), "[" + ", ".join(str(m) for m in Money.of(-1, "INR").allocate(3)) + "]")  # INR -0.50 [INR -0.33, INR -0.33, INR -0.34]
try:
    a.plus(Money.of(1, "USD"))
except ValueError as e:
    print(f"refused: {e}")` },
          { lang: 'ts', code: `// VALUE OBJECT: Money. Immutable class, self-validating, behaviour-rich, equality by value.
class Money {
  // minor units: paise / cents, kept as integers. Never fractional numbers for money.
  constructor(readonly minor: number, readonly currency: string) {
    if (!/^[A-Z]{3}$/.test(currency)) throw new Error(\`ISO currency like INR: \${currency}\`); // runs for EVERY instance
    if (!Number.isSafeInteger(minor)) throw new Error("amount out of range");
  }

  static of(major: number, cur: string): Money { return new Money(major * 100, cur); }
  static zero(cur: string): Money { return new Money(0, cur); }

  plus(o: Money): Money { this.same(o); return new Money(this.minor + o.minor, this.currency); } // NEW object
  minus(o: Money): Money { this.same(o); return new Money(this.minor - o.minor, this.currency); }
  times(n: number): Money { return new Money(this.minor * n, this.currency); }
  isNegative(): boolean { return this.minor < 0; }
  greaterThan(o: Money): boolean { this.same(o); return this.minor > o.minor; }
  equals(o: Money): boolean { return this.minor === o.minor && this.currency === o.currency; } // === would compare identity

  // Split fairly: 100.00 / 3 -> 33.34, 33.33, 33.33 (no paisa lost, no paisa invented)
  allocate(parts: number): Money[] {
    if (parts <= 0) throw new Error("parts > 0");
    const base = Math.floor(this.minor / parts); // floor, so negative amounts split correctly too
    const extra = this.minor - base * parts;
    return Array.from({ length: parts }, (_, i) => new Money(base + (i < extra ? 1 : 0), this.currency));
  }

  private same(o: Money): void {
    if (this.currency !== o.currency) throw new Error(\`\${this.currency} vs \${o.currency}\`);
  }

  toString(): string {
    const abs = Math.abs(this.minor);
    return \`\${this.currency} \${this.minor < 0 ? "-" : ""}\${Math.floor(abs / 100)}.\${String(abs % 100).padStart(2, "0")}\`;
  }
}

const a = Money.of(100, "INR");
const b = Money.of(100, "INR");
console.log(a.equals(b) + " " + (a === b)); // true false: equal by value, different objects
const c = a.plus(Money.of(50, "INR"));
console.log(\`\${a} -> \${c}\`); // a is unchanged: INR 100.00 -> INR 150.00
console.log("[" + Money.of(100, "INR").allocate(3).join(", ") + "]"); // [INR 33.34, INR 33.33, INR 33.33]
console.log(\`\${new Money(-50, "INR")} [\${Money.of(-1, "INR").allocate(3).join(", ")}]\`); // INR -0.50 [INR -0.33, INR -0.33, INR -0.34]
try { a.plus(Money.of(1, "USD")); } catch (e) { console.log("refused: " + (e as Error).message); }` },
          { lang: 'cpp', code: `// VALUE OBJECT: Money. Immutable class, self-validating, behaviour-rich, equality by value.
class Money {
    long long minor_;  // minor units: paise / cents. Never double for money.
    string currency_;

    void same(const Money& o) const {
        if (currency_ != o.currency_) throw invalid_argument(currency_ + " vs " + o.currency_);
    }

public:
    Money(long long minor, string currency) : minor_(minor), currency_(move(currency)) {  // runs for EVERY instance
        bool ok = currency_.size() == 3 && all_of(currency_.begin(), currency_.end(), [](char c) { return c >= 'A' && c <= 'Z'; });
        if (!ok) throw invalid_argument("ISO currency like INR: " + currency_);
    }
    static Money of(long long major, const string& cur) { return Money(major * 100, cur); }
    static Money zero(const string& cur) { return Money(0, cur); }

    long long minor() const { return minor_; }
    const string& currency() const { return currency_; }

    Money plus(const Money& o) const { same(o); return Money(minor_ + o.minor_, currency_); }  // NEW object
    Money minus(const Money& o) const { same(o); return Money(minor_ - o.minor_, currency_); }
    Money times(int n) const { return Money(minor_ * n, currency_); }
    bool isNegative() const { return minor_ < 0; }
    bool greaterThan(const Money& o) const { same(o); return minor_ > o.minor_; }
    bool operator==(const Money&) const = default;  // equal by value

    // Split fairly: 100.00 / 3 -> 33.34, 33.33, 33.33 (no paisa lost, no paisa invented)
    vector<Money> allocate(int parts) const {
        if (parts <= 0) throw invalid_argument("parts > 0");
        long long base = minor_ / parts, extra = minor_ % parts;
        if (extra < 0) { base -= 1; extra += parts; }  // floor, so negative amounts split correctly too
        vector<Money> out;
        for (int i = 0; i < parts; i++) out.emplace_back(base + (i < extra ? 1 : 0), currency_);
        return out;
    }

    string str() const {
        long long abs = minor_ < 0 ? -minor_ : minor_;
        string cents = to_string(abs % 100);
        return currency_ + " " + (minor_ < 0 ? "-" : "") + to_string(abs / 100) + "." + (cents.size() < 2 ? "0" : "") + cents;
    }
};

string show(const vector<Money>& items) {
    string out = "[";
    for (size_t i = 0; i < items.size(); i++) out += (i ? ", " : "") + items[i].str();
    return out + "]";
}

int main() {
    Money a = Money::of(100, "INR"), b = Money::of(100, "INR");
    cout << boolalpha << (a == b) << " " << (&a == &b) << "\\n";  // true false: equal by value, different objects
    Money c = a.plus(Money::of(50, "INR"));
    cout << a.str() << " -> " << c.str() << "\\n";                // a is unchanged: INR 100.00 -> INR 150.00
    cout << show(Money::of(100, "INR").allocate(3)) << "\\n";     // [INR 33.34, INR 33.33, INR 33.33]
    cout << Money(-50, "INR").str() << " " << show(Money::of(-1, "INR").allocate(3)) << "\\n";  // INR -0.50 [INR -0.33, INR -0.33, INR -0.34]
    try {
        a.plus(Money::of(1, "USD"));
    } catch (const invalid_argument& e) {
        cout << "refused: " << e.what() << "\\n";
    }
}` }
        ] }, { lang: 'java', code: `// ENTITY: Customer. Identity = CustomerId. Attributes are value objects and can change.
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
        System.out.println(a.email().value() + " " + a.previousEmails.stream().map(Email::value).toList());
        try { new Email("not-an-email"); } catch (IllegalArgumentException e) { System.out.println(e.getMessage()); }
    }
}`, alt: [
          { lang: 'python', code: `# ENTITY: Customer. Identity = CustomerId. Attributes are value objects and can change.
import re
import uuid
from dataclasses import dataclass


@dataclass(frozen=True)
class CustomerId:
    value: uuid.UUID

    @staticmethod
    def random() -> "CustomerId":
        return CustomerId(uuid.uuid4())


@dataclass(frozen=True)
class Email:
    value: str

    def __post_init__(self) -> None:
        v = self.value.strip().lower()  # normalise once
        if not re.fullmatch(r"[^@ ]+@[^@ ]+[.][a-z]{2,}", v):
            raise ValueError(f"bad email: {v}")
        object.__setattr__(self, "value", v)


@dataclass(frozen=True)
class Address:
    line: str
    city: str
    pin: str

    def __post_init__(self) -> None:
        if not re.fullmatch(r"[0-9]{6}", self.pin):
            raise ValueError("PIN must be 6 digits")


class Customer:
    def __init__(self, customer_id: CustomerId, name: str, email: Email, address: Address) -> None:
        self._id = customer_id  # never changes
        self.name, self._email, self._address = name, email, address
        self.previous_emails: list[Email] = []

    def change_email(self, new_email: Email) -> None:  # behaviour, not a setter: keeps history
        if new_email == self._email:
            return
        self.previous_emails.append(self._email)
        self._email = new_email

    def move_to(self, a: Address) -> None:  # replace the whole VO, never mutate it
        self._address = a

    @property
    def id(self) -> CustomerId:
        return self._id

    @property
    def email(self) -> Email:
        return self._email

    @property
    def address(self) -> Address:
        return self._address

    def __eq__(self, other: object) -> bool:  # ID only!
        return isinstance(other, Customer) and other._id == self._id

    def __hash__(self) -> int:
        return hash(self._id)


cid = CustomerId.random()
a = Customer(cid, "Asha", Email(" Asha@Mail.com "), Address("1 MG Rd", "Pune", "411001"))
same_row_loaded_again = Customer(cid, "Asha K", Email("asha.k@mail.com"), Address("9 FC Rd", "Pune", "411004"))
print("same customer?", str(a == same_row_loaded_again).lower())  # true: same identity, different data
a.change_email(Email("asha.new@mail.com"))
print(a.email.value, "[" + ", ".join(e.value for e in a.previous_emails) + "]")
try:
    Email("not-an-email")
except ValueError as e:
    print(e)` },
          { lang: 'ts', code: `// ENTITY: Customer. Identity = CustomerId. Attributes are value objects and can change.
class CustomerId {
  constructor(readonly value: string) {}
  static random(): CustomerId { return new CustomerId(crypto.randomUUID()); }
  equals(o: CustomerId): boolean { return this.value === o.value; }
}

class Email {
  readonly value: string;
  constructor(raw: string) {
    const v = raw.trim().toLowerCase(); // normalise once
    if (!/^[^@ ]+@[^@ ]+[.][a-z]{2,}$/.test(v)) throw new Error(\`bad email: \${v}\`);
    this.value = v;
  }
  equals(o: Email): boolean { return this.value === o.value; }
}

class Address {
  constructor(readonly line: string, readonly city: string, readonly pin: string) {
    if (!/^[0-9]{6}$/.test(pin)) throw new Error("PIN must be 6 digits");
  }
}

class Customer {
  private emailValue: Email;
  private addressValue: Address;
  readonly previousEmails: Email[] = [];

  constructor(readonly id: CustomerId, readonly name: string, email: Email, address: Address) { // id never changes
    this.emailValue = email;
    this.addressValue = address;
  }

  changeEmail(newEmail: Email): void { // behaviour, not a setter: keeps history
    if (newEmail.equals(this.emailValue)) return;
    this.previousEmails.push(this.emailValue);
    this.emailValue = newEmail;
  }
  moveTo(a: Address): void { this.addressValue = a; } // replace the whole VO, never mutate it
  email(): Email { return this.emailValue; }
  address(): Address { return this.addressValue; }

  equals(o: Customer): boolean { return o.id.equals(this.id); } // ID only!
}

const id = CustomerId.random();
const a = new Customer(id, "Asha", new Email(" Asha@Mail.com "), new Address("1 MG Rd", "Pune", "411001"));
const sameRowLoadedAgain = new Customer(id, "Asha K", new Email("asha.k@mail.com"), new Address("9 FC Rd", "Pune", "411004"));
console.log("same customer? " + a.equals(sameRowLoadedAgain)); // true: same identity, different data
a.changeEmail(new Email("asha.new@mail.com"));
console.log(a.email().value + " [" + a.previousEmails.map((e) => e.value).join(", ") + "]");
try { new Email("not-an-email"); } catch (e) { console.log((e as Error).message); }` },
          { lang: 'cpp', code: `// ENTITY: Customer. Identity = CustomerId. Attributes are value objects and can change.
struct CustomerId {
    string value;
    static CustomerId random() {  // the standard library has no UUID, so draw 128 random bits
        static mt19937_64 gen{random_device{}()};
        char buf[33];
        snprintf(buf, sizeof buf, "%016llx%016llx", static_cast<unsigned long long>(gen()), static_cast<unsigned long long>(gen()));
        return CustomerId{buf};
    }
    bool operator==(const CustomerId&) const = default;
};

class Email {
    string value_;

public:
    explicit Email(string raw) {
        auto notSpace = [](unsigned char c) { return !isspace(c); };
        raw.erase(raw.begin(), find_if(raw.begin(), raw.end(), notSpace));
        raw.erase(find_if(raw.rbegin(), raw.rend(), notSpace).base(), raw.end());
        for (char& c : raw) c = static_cast<char>(tolower(static_cast<unsigned char>(c)));  // normalise once
        static const regex pattern("[^@ ]+@[^@ ]+[.][a-z]{2,}");
        if (!regex_match(raw, pattern)) throw invalid_argument("bad email: " + raw);
        value_ = raw;
    }
    const string& value() const { return value_; }
    bool operator==(const Email&) const = default;
};

struct Address {
    string line, city, pin;
    Address(string l, string c, string p) : line(move(l)), city(move(c)), pin(move(p)) {
        if (!regex_match(pin, regex("[0-9]{6}"))) throw invalid_argument("PIN must be 6 digits");
    }
};

class Customer {
    CustomerId id_;  // never changes
    string name_;
    Email email_;
    Address address_;
    vector<Email> previousEmails_;

public:
    Customer(CustomerId id, string name, Email email, Address address)
        : id_(move(id)), name_(move(name)), email_(move(email)), address_(move(address)) {}

    void changeEmail(const Email& newEmail) {  // behaviour, not a setter: keeps history
        if (newEmail == email_) return;
        previousEmails_.push_back(email_);
        email_ = newEmail;
    }
    void moveTo(const Address& a) { address_ = a; }  // replace the whole VO, never mutate it
    const CustomerId& id() const { return id_; }
    const Email& email() const { return email_; }
    const vector<Email>& previousEmails() const { return previousEmails_; }

    bool operator==(const Customer& o) const { return id_ == o.id_; }  // ID only!
};

int main() {
    CustomerId id = CustomerId::random();
    Customer a(id, "Asha", Email(" Asha@Mail.com "), Address("1 MG Rd", "Pune", "411001"));
    Customer sameRowLoadedAgain(id, "Asha K", Email("asha.k@mail.com"), Address("9 FC Rd", "Pune", "411004"));
    cout << boolalpha << "same customer? " << (a == sameRowLoadedAgain) << "\\n";  // true: same identity, different data
    a.changeEmail(Email("asha.new@mail.com"));
    string previous;
    for (const Email& e : a.previousEmails()) previous += (previous.empty() ? "" : ", ") + e.value();
    cout << a.email().value() << " [" << previous << "]\\n";
    try {
        Email bad("not-an-email");
    } catch (const invalid_argument& e) {
        cout << e.what() << "\\n";
    }
}` }
        ] }, { lang: 'java', code: `// VALUE OBJECT with real behaviour: DateRange (used by bookings, leases, discounts)
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
}`, alt: [
          { lang: 'python', code: `# VALUE OBJECT with real behaviour: DateRange (used by bookings, leases, discounts)
from dataclasses import dataclass
from datetime import date


@dataclass(frozen=True)
class DateRange:
    start: date
    end_exclusive: date

    def __post_init__(self) -> None:
        if not self.start < self.end_exclusive:
            raise ValueError("start must be before end")

    def nights(self) -> int:
        return (self.end_exclusive - self.start).days

    def overlaps(self, o: "DateRange") -> bool:
        return self.start < o.end_exclusive and o.start < self.end_exclusive

    def contains(self, d: date) -> bool:
        return self.start <= d < self.end_exclusive


a = DateRange(date(2026, 5, 1), date(2026, 5, 4))
b = DateRange(date(2026, 5, 4), date(2026, 5, 6))  # checkout day = next check-in
print(f"{a.nights()} nights, overlaps? {str(a.overlaps(b)).lower()}")  # 3 nights, overlaps? false` },
          { lang: 'ts', code: `// VALUE OBJECT with real behaviour: DateRange (used by bookings, leases, discounts)
const DAY_MS = 86_400_000;

class DateRange { // dates as UTC milliseconds at midnight
  constructor(readonly start: number, readonly endExclusive: number) {
    if (!(start < endExclusive)) throw new Error("start must be before end");
  }
  nights(): number { return Math.round((this.endExclusive - this.start) / DAY_MS); }
  overlaps(o: DateRange): boolean { return this.start < o.endExclusive && o.start < this.endExclusive; }
  contains(d: number): boolean { return d >= this.start && d < this.endExclusive; }
}

const a = new DateRange(Date.UTC(2026, 4, 1), Date.UTC(2026, 4, 4));
const b = new DateRange(Date.UTC(2026, 4, 4), Date.UTC(2026, 4, 6)); // checkout day = next check-in
console.log(\`\${a.nights()} nights, overlaps? \${a.overlaps(b)}\`); // 3 nights, overlaps? false` },
          { lang: 'cpp', code: `// VALUE OBJECT with real behaviour: DateRange (used by bookings, leases, discounts)
// Dates are day numbers since 1970-01-01 (Howard Hinnant's algorithm).
long long daysFromCivil(int y, int m, int d) {
    y -= m <= 2;
    long long era = (y >= 0 ? y : y - 399) / 400;
    long long yoe = y - era * 400;
    long long doy = (153 * (m + (m > 2 ? -3 : 9)) + 2) / 5 + d - 1;
    long long doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    return era * 146097 + doe - 719468;
}

class DateRange {
    long long start_, endExclusive_;

public:
    DateRange(long long start, long long endExclusive) : start_(start), endExclusive_(endExclusive) {
        if (!(start < endExclusive)) throw invalid_argument("start must be before end");
    }
    long long nights() const { return endExclusive_ - start_; }
    bool overlaps(const DateRange& o) const { return start_ < o.endExclusive_ && o.start_ < endExclusive_; }
    bool contains(long long d) const { return d >= start_ && d < endExclusive_; }
};

int main() {
    DateRange a(daysFromCivil(2026, 5, 1), daysFromCivil(2026, 5, 4));
    DateRange b(daysFromCivil(2026, 5, 4), daysFromCivil(2026, 5, 6));  // checkout day = next check-in
    cout << a.nights() << " nights, overlaps? " << boolalpha << a.overlaps(b) << "\\n";  // 3 nights, overlaps? false
}` }
        ] }],
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
          frames.push(F('<b>' + esc(c[0]) + '</b> → ' + esc(c[1]) + ', <b>' + esc(c[2]) + '</b>: ' + esc(c[3]) + '.', [TABLE('pairs', ['pair', 'kind', 'equals?', 'why'], rows, hl), CODE(c[1].indexOf('entity') === 0 ? 'entity equals' : 'value object equals (record does this for you)', c[1].indexOf('entity') === 0 ? 'public boolean equals(Object o) {\n  return o instanceof Customer c\n      && c.id.equals(id);  // ID only\n}' : 'record Money(long minor, String currency) {}\n// equals = minor == o.minor\n//       && currency.equals(o.currency)', { 3: 'cur' }, c[1].indexOf('entity') === 0 ? ENT_ALT : VO_ALT)]));
        });
        frames.push(F('Question to ask the business: <b>"if I swap these two, would anyone care?"</b> No → value object. Yes → entity with an ID.', [TABLE('pairs', ['pair', 'kind', 'equals?', 'why'], rows, {})]));
        return frames;
      }
    }],
    examples: [
      { title: 'Primitive obsession → value objects', html: `${H.table(['Before', 'After'], [['<code>transfer(String from, String to, double amt)</code>', '<code>transfer(AccountNo from, AccountNo to, Money amt)</code>'], ['email validated in 5 services', '<code>new Email(raw)</code> validates once'], ['<code>double price = 0.1 + 0.2</code> → 0.30000000000000004', '<code>Money</code> in paise: exact']])}<p>The VO version is longer by a few small records but removes whole classes of bugs, and makes method signatures self-documenting.</p>` },
      { title: 'A cinema seat: entity or value?', html: `<p>In a <b>seat map template</b> ("Screen 1 has seats A1–J20"), a seat position is a value object <code>SeatNo("A7")</code>. In a <b>show booking</b>, "A7 for the 6 pm show on 5 May" has a lifecycle (available → held → booked → cancelled) and must be tracked → entity <code>ShowSeat</code> with ID <code>(showId, seatNo)</code>. Same real-world thing, different role, different modelling choice.</p>` },
      { title: 'Value objects as map keys and in sets', html: `<p>Because value objects (Java records, frozen dataclasses, structs with a defaulted comparison) get equality and hashing from all their fields and never change, they are safe keys: <code>Map&lt;DateRange, Price&gt;</code>, <code>Set&lt;Email&gt;</code>. A <b>mutable</b> key is a classic bug: put it in a <code>HashSet</code>, change a field, and <code>contains</code> returns false because the hash moved.</p>`, code: `record Sku(String code) {}
class KeyDemo {
    public static void main(String[] args) {
        Map<Sku, Integer> stock = new HashMap<>();
        stock.merge(new Sku("TEA-1"), 5, Integer::sum);
        stock.merge(new Sku("TEA-1"), 3, Integer::sum);       // a different object, same value -> same key
        System.out.println(stock);                             // {Sku[code=TEA-1]=8}
    }
}`, alt: [
          { lang: 'python', code: `from dataclasses import dataclass


@dataclass(frozen=True)
class Sku:
    code: str


stock: dict[Sku, int] = {}
for qty in (5, 3):
    sku = Sku("TEA-1")  # a different object each time, same value -> same key
    stock[sku] = stock.get(sku, 0) + qty
print(stock)  # {Sku(code='TEA-1'): 8}` },
          { lang: 'ts', code: `// Objects compare by identity in a Map, so a value object is keyed by its value (here: the code).
class Sku {
  constructor(readonly code: string) {}
}

const stock = new Map<string, number>();
for (const qty of [5, 3]) {
  const sku = new Sku("TEA-1"); // a different object each time, same value -> same key
  stock.set(sku.code, (stock.get(sku.code) ?? 0) + qty);
}
console.log(stock); // Map(1) { 'TEA-1' => 8 }` },
          { lang: 'cpp', code: `struct Sku {
    string code;
    auto operator<=>(const Sku&) const = default;  // ordering and equality by value, so it can be a map key
};

int main() {
    map<Sku, int> stock;
    for (int qty : {5, 3}) {
        stock[Sku{"TEA-1"}] += qty;  // a different object each time, same value -> same key
    }
    cout << "{Sku[code=" << stock.begin()->first.code << "]=" << stock.begin()->second << "}\\n";  // {Sku[code=TEA-1]=8}
}` }
        ] },
      { title: 'Typed IDs stop mix-ups', html: `<p><code>void ship(long orderId, long customerId)</code> — callers can swap them silently. <code>void ship(OrderId o, CustomerId c)</code> — swapping is a compile error. Value objects make typed IDs nearly free: <code>record OrderId(UUID value) {}</code> in Java, <code>@dataclass(frozen=True) class OrderId</code> in Python.</p>` }
    ],
    deepDive: `<p><b>Equality and JPA.</b> Entities with database-generated IDs have no ID before the first save, so ID-based <code>equals</code> breaks for new objects placed in a <code>HashSet</code> (hash changes after save). Fixes: assign IDs in the domain (UUID/ULID/Snowflake) at construction time — the DDD-preferred approach — or use a stable business key. Never base entity equality on mutable fields.</p>
<p><b>Value objects and persistence.</b> VOs have no table of their own: they are stored as columns of their owner (<code>price_minor, price_currency</code>; JPA <code>@Embeddable</code>) or serialized (JSON column). A collection of VOs becomes a child table without its own identity, typically replaced wholesale on update.</p>
<p><b>Money done right:</b> store minor units in <code>long</code> or use <code>BigDecimal</code> with explicit <code>RoundingMode</code> (never <code>new BigDecimal(0.1)</code>; use <code>BigDecimal.valueOf</code> or string constructor). Different currencies have different minor units (JPY 0, INR 2, BHD 3) — <code>java.util.Currency.getDefaultFractionDigits()</code>. Allocation (splitting) must distribute remainders so the parts sum to the whole — Fowler's <i>allocate</i>. Overflow: <code>Math.addExact</code> throws instead of wrapping silently.</p>
<p><b>Java record caveats (other languages have the same trap with their immutable types):</b> a record is shallowly immutable; a <code>record Basket(List&lt;Item&gt; items)</code> exposes a mutable list unless the compact constructor does <code>items = List.copyOf(items)</code>. Records cannot extend classes; use sealed interfaces for VO families (<code>sealed interface Shape permits Circle, Square</code>).</p>
<p><b>Value objects can be big ideas:</b> a <code>Schedule</code>, a <code>PricingRule</code> or a <code>Route</code> can be VOs with rich logic. Many domain rules are easiest to test as pure functions on VOs, leaving entities thin coordinators of state over time. <b>Side-effect-free functions</b> (Evans) are the reason DDD models stay testable.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI assistants happily generate DTO-style classes with <code>String</code> everywhere and <code>double</code> for money — primitive obsession at machine speed. Ask explicitly: <code>Model price as a Money value object in minor units with currency; use immutable value objects with validating constructors; no setters</code>. They do this well once asked, and are great at producing the boring parts: <code>toString</code>, parsing, exhaustive tests for validation edge cases.</p>
<p><b>Value objects protect you from AI inputs.</b> When an LLM produces structured output (an extracted email, an amount, a date range), parse it into VOs at the boundary. If the model hallucinates "31 Feb" or "₹12,00,0", the VO constructor rejects it before it reaches business code. Typed IDs prevent an agent from passing a customer ID where an order ID was expected in a tool call.</p>
<p><b>Use AI as a partner:</b> <code>List every method parameter in this package that is a String or double but represents a domain concept; propose value objects</code>. It is a fast way to find primitive obsession across a codebase.</p>
<p><b>What you must own:</b> the identity decision (entity or VO) is a business question — ask "do we track this one specifically?" — and AI cannot interview your stakeholders.</p>`,
    problems: [{
      title: 'Bill Splitting with a Money Value Object', level: 'Medium', tags: ['value object', 'money', 'immutability'], companies: ['Splitwise', 'Razorpay', 'Stripe'],
      statement: `<p>Implement <code>Money</code> for a bill-splitting app. Requirements: currency-safe <code>plus</code>/<code>minus</code>; <code>percent(p)</code> with banker's rounding to the minor unit; <code>allocate(ratios)</code> that splits an amount by ratios with <b>no paisa lost or invented</b> (e.g. ₹100 by 1:1:1 → 33.34, 33.33, 33.33; ₹10 by 3:7 → 3.00, 7.00; −₹1.00 by 1:1:1 → −0.34, −0.33, −0.33). Reject amounts with more than two decimals and mixed currencies. Equality by value; immutable.</p>`,
      constraints: `Amounts up to 10<sup>12</sup> minor units; ratios positive; at most 100 parts.`,
      example: `<p>Bill ₹1,000 + 18% GST = ${H.c('b', '₹1,180.00')}. Split by 2:1:1 → ${H.arr(['590.00', '295.00', '295.00'], { label: 'shares' })} sum = 1180.00 ✔. ₹0.05 split 1:1:1 → 0.02, 0.02, 0.01 (remainder goes to the first parts).</p>`,
      brute: { why: `<p>Using <code>double</code>: <code>1180.0 / 3 = 393.333…</code> rounded three times → 393.33 × 3 = 1179.99 — one paisa vanishes and the ledger does not balance. Adding INR to USD compiles fine. A shared mutable <code>total</code> field changed by one screen corrupts another.</p>`, code: { lang: 'java', code: `class BillBrute {
    static double[] split(double total, int people) {
        double[] out = new double[people];
        for (int i = 0; i < people; i++) out[i] = Math.round(total / people * 100) / 100.0;
        return out;                                   // 1180.0 / 3 -> 393.33 x3 = 1179.99 : a paisa is lost
    }
    public static void main(String[] a) { System.out.println(Arrays.toString(split(1180.0, 3))); }
}`, alt: [{ lang: 'python', code: "class BillBrute:\n    @staticmethod\n    def split(total, people):\n        return [round(total / people * 100) / 100 for _ in range(people)]   # 1180.0 / 3 -> 393.33 x3 = 1179.99 : a paisa is lost\n\nif __name__ == \"__main__\":\n    print(BillBrute.split(1180.0, 3))\n" }, { lang: 'ts', code: "class BillBrute {\n  static split(total: number, people: number): number[] {\n    const out: number[] = [];\n    for (let i = 0; i < people; i++) out.push(Math.round(total / people * 100) / 100);\n    return out;                                   // 1180.0 / 3 -> 393.33 x3 = 1179.99 : a paisa is lost\n  }\n}\nconsole.log(BillBrute.split(1180.0, 3));\n" }, { lang: 'cpp', code: "struct BillBrute {\n    static vector<double> split(double total, int people) {\n        vector<double> out(people);\n        for (int i = 0; i < people; i++) out[i] = round(total / people * 100) / 100.0;\n        return out;                               // 1180.0 / 3 -> 393.33 x3 = 1179.99 : a paisa is lost\n    }\n};\nint main() { for (double d : BillBrute::split(1180.0, 3)) cout << d << \" \"; cout << endl; }\n" }] } },
      mcq: { q: 'Splitting 100 paise by ratio 1:1:1, where should the leftover 1 paisa go?', options: ['To one part (e.g. the first), so the parts still sum to exactly 100', 'Drop it — it is only one paisa', 'Round every part up to 34', 'Throw an exception'], answer: 0, explain: 'Allocation must conserve money: compute floor shares, then hand out the remainder one unit at a time. The sum of parts equals the whole, always.' },
      hints: [`<p>Hint 1: Work in <code>long</code> minor units. Floor-divide each share: <code>minor * ratio[i] / totalRatio</code>.</p>`, `<p>Hint 2: Remainder = whole − sum(floor shares), which is less than the number of parts. Give 1 extra unit to parts 0, 1, 2… until the remainder is used.</p>`, `<p>Hint 3: For percent use exact decimal arithmetic with half-even rounding (Java <code>BigDecimal.valueOf(minor).multiply(p).divide(100, 0, RoundingMode.HALF_EVEN)</code>, Python <code>Decimal</code> with <code>ROUND_HALF_EVEN</code>, TypeScript <code>bigint</code>, C++ <code>__int128</code>). Watch overflow on <code>minor * ratio</code>: Java <code>Math.multiplyExact</code>, a 128-bit intermediate in C++, an explicit range check in Python and TypeScript.</p>`],
      tests: { io: true, cases: [{ stdin: '', stdout: "1180.00 -> [590.00, 295.00, 295.00]\n[33.34, 33.33, 33.33]\n[0.02, 0.02, 0.01]\n[-0.34, -0.33, -0.33]\ntrue\n0.00 0.02\n-0.50\nINR vs USD\ncurrency\nat most 2 decimals\nratio > 0\n1..100 parts\nlong overflow\n" }] },
      solution: {
        approach: `<p>An immutable <code>Money(minor, currency)</code> value object (a <code>record</code> in Java) validates in its constructor. Arithmetic returns new instances and checks currency. <code>allocate</code> computes floor shares by ratio and distributes the remainder one unit at a time, so the sum is always exact. <code>percent</code> uses exact decimal arithmetic with half-even (banker's) rounding to avoid bias across many transactions. A negative amount is split by magnitude and the sign restored, so the parts still add up exactly.</p>`,
        code: `record Money(long minor, String currency) {
    Money { if (currency == null || !currency.matches("[A-Z]{3}")) throw new IllegalArgumentException("currency"); }
    static Money of(String amount, String cur) {
        BigDecimal d = new BigDecimal(amount);
        if (d.stripTrailingZeros().scale() > 2) throw new IllegalArgumentException("at most 2 decimals");
        return new Money(d.movePointRight(2).setScale(0, RoundingMode.UNNECESSARY).longValueExact(), cur);
    }
    Money plus(Money o) { same(o); return new Money(Math.addExact(minor, o.minor), currency); }
    Money minus(Money o) { same(o); return new Money(Math.subtractExact(minor, o.minor), currency); }
    Money percent(String p) {
        BigDecimal r = BigDecimal.valueOf(minor).multiply(new BigDecimal(p)).divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_EVEN);
        return new Money(r.longValueExact(), currency);
    }
    List<Money> allocate(int... ratios) {
        if (ratios.length == 0 || ratios.length > 100) throw new IllegalArgumentException("1..100 parts");
        if (minor < 0) {                                           // split the magnitude, then restore the sign
            List<Money> parts = new Money(Math.negateExact(minor), currency).allocate(ratios);
            return parts.stream().map(m -> new Money(-m.minor, currency)).toList();
        }
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

    static void attempt(Runnable action) {
        try { action.run(); } catch (RuntimeException e) { System.out.println(e.getMessage()); }
    }

    public static void main(String[] args) {
        Money bill = Money.of("1000.00", "INR");
        Money total = bill.plus(bill.percent("18"));
        System.out.println(total + " -> " + total.allocate(2, 1, 1));          // 1180.00 -> [590.00, 295.00, 295.00]
        System.out.println(Money.of("100.00", "INR").allocate(1, 1, 1));       // [33.34, 33.33, 33.33]
        System.out.println(Money.of("0.05", "INR").allocate(1, 1, 1));         // [0.02, 0.02, 0.01]
        System.out.println(Money.of("-1.00", "INR").allocate(1, 1, 1));        // [-0.34, -0.33, -0.33]
        System.out.println(Money.of("5", "INR").equals(Money.of("5.00", "INR"))); // true
        System.out.println(Money.of("0.50", "INR").percent("1") + " " + Money.of("1.50", "INR").percent("1")); // half-even: 0.00 0.02
        System.out.println(Money.of("1.00", "INR").minus(Money.of("1.50", "INR")));   // -0.50
        attempt(() -> bill.plus(Money.of("1", "USD")));
        attempt(() -> new Money(1, "inr"));
        attempt(() -> Money.of("1.005", "INR"));
        attempt(() -> bill.allocate(1, 0));
        attempt(() -> bill.allocate());
        attempt(() -> new Money(Long.MAX_VALUE, "INR").plus(Money.of("0.01", "INR")));
    }
}`,
        alt: [
          { lang: 'python', code: `import re
from dataclasses import dataclass
from decimal import ROUND_HALF_EVEN, Decimal

LONG_MIN, LONG_MAX = -(2**63), 2**63 - 1


def exact(x: int) -> int:  # Python ints never overflow, so keep the 64-bit rule explicit
    if not LONG_MIN <= x <= LONG_MAX:
        raise OverflowError("long overflow")
    return x


@dataclass(frozen=True)  # generates __eq__ and __hash__: equality by value
class Money:
    minor: int
    currency: str

    def __post_init__(self) -> None:
        if not isinstance(self.currency, str) or not re.fullmatch(r"[A-Z]{3}", self.currency):
            raise ValueError("currency")

    @staticmethod
    def of(amount: str, cur: str) -> "Money":
        d = Decimal(amount)
        if d != d.quantize(Decimal("0.01")):
            raise ValueError("at most 2 decimals")
        return Money(exact(int(d.scaleb(2))), cur)

    def plus(self, o: "Money") -> "Money":
        self._same(o)
        return Money(exact(self.minor + o.minor), self.currency)

    def minus(self, o: "Money") -> "Money":
        self._same(o)
        return Money(exact(self.minor - o.minor), self.currency)

    def percent(self, p: str) -> "Money":
        r = (Decimal(self.minor) * Decimal(p) / 100).quantize(Decimal(1), rounding=ROUND_HALF_EVEN)
        return Money(exact(int(r)), self.currency)

    def allocate(self, *ratios: int) -> list["Money"]:
        if not 1 <= len(ratios) <= 100:
            raise ValueError("1..100 parts")
        if self.minor < 0:  # split the magnitude, then restore the sign
            return [Money(-m.minor, self.currency) for m in Money(-self.minor, self.currency).allocate(*ratios)]
        if any(r <= 0 for r in ratios):
            raise ValueError("ratio > 0")
        total = sum(ratios)
        shares = [exact(self.minor * r) // total for r in ratios]
        for i in range(self.minor - sum(shares)):  # hand out the remainder, 1 unit each
            shares[i] += 1
        return [Money(s, self.currency) for s in shares]

    def _same(self, o: "Money") -> None:
        if self.currency != o.currency:
            raise ValueError(f"{self.currency} vs {o.currency}")

    def __str__(self) -> str:
        sign = "-" if self.minor < 0 else ""
        return f"{sign}{abs(self.minor) // 100}.{abs(self.minor) % 100:02d}"


def show(items: list[Money]) -> str:
    return "[" + ", ".join(str(m) for m in items) + "]"


def attempt(action) -> None:
    try:
        action()
    except (ValueError, ArithmeticError) as e:
        print(e)


bill = Money.of("1000.00", "INR")
total = bill.plus(bill.percent("18"))
print(f"{total} -> {show(total.allocate(2, 1, 1))}")  # 1180.00 -> [590.00, 295.00, 295.00]
print(show(Money.of("100.00", "INR").allocate(1, 1, 1)))  # [33.34, 33.33, 33.33]
print(show(Money.of("0.05", "INR").allocate(1, 1, 1)))  # [0.02, 0.02, 0.01]
print(show(Money.of("-1.00", "INR").allocate(1, 1, 1)))  # [-0.34, -0.33, -0.33]
print("true" if Money.of("5", "INR") == Money.of("5.00", "INR") else "false")
print(Money.of("0.50", "INR").percent("1"), Money.of("1.50", "INR").percent("1"))  # half-even: 0.00 0.02
print(Money.of("1.00", "INR").minus(Money.of("1.50", "INR")))  # -0.50
attempt(lambda: bill.plus(Money.of("1", "USD")))
attempt(lambda: Money(1, "inr"))
attempt(lambda: Money.of("1.005", "INR"))
attempt(lambda: bill.allocate(1, 0))
attempt(lambda: bill.allocate())
attempt(lambda: Money(LONG_MAX, "INR").plus(Money.of("0.01", "INR")))` },
          { lang: 'ts', code: `const LONG_MIN = -(2n ** 63n);
const LONG_MAX = 2n ** 63n - 1n;

function exact(x: bigint): bigint { // bigint never overflows, so keep the 64-bit rule explicit
  if (x < LONG_MIN || x > LONG_MAX) throw new Error("long overflow");
  return x;
}

function parseDecimal(s: string): { num: bigint; scale: number } {
  const m = /^(-?)(\\d+)(?:\\.(\\d+))?$/.exec(s.trim());
  if (m === null) throw new Error(\`not a number: \${s}\`);
  const frac = m[3] ?? "";
  return { num: BigInt(m[1] + m[2] + frac), scale: frac.length };
}

function divHalfEven(n: bigint, d: bigint): bigint { // d > 0
  const q = n / d; // truncates toward zero
  const r = n % d;
  const twice = (r < 0n ? -r : r) * 2n;
  if (twice < d || (twice === d && q % 2n === 0n)) return q;
  return n < 0n ? q - 1n : q + 1n;
}

class Money { // immutable: readonly fields, every operation returns a new object
  constructor(readonly minor: bigint, readonly currency: string) {
    if (!/^[A-Z]{3}$/.test(currency)) throw new Error("currency");
  }

  static of(amount: string, cur: string): Money {
    let { num, scale } = parseDecimal(amount);
    while (scale > 2 && num % 10n === 0n) { num /= 10n; scale--; }
    if (scale > 2) throw new Error("at most 2 decimals");
    return new Money(exact(num * 10n ** BigInt(2 - scale)), cur);
  }

  plus(o: Money): Money { this.same(o); return new Money(exact(this.minor + o.minor), this.currency); }
  minus(o: Money): Money { this.same(o); return new Money(exact(this.minor - o.minor), this.currency); }

  percent(p: string): Money {
    const { num, scale } = parseDecimal(p);
    return new Money(exact(divHalfEven(this.minor * num, 100n * 10n ** BigInt(scale))), this.currency);
  }

  allocate(...ratios: number[]): Money[] {
    if (ratios.length === 0 || ratios.length > 100) throw new Error("1..100 parts");
    if (this.minor < 0n) { // split the magnitude, then restore the sign
      return new Money(-this.minor, this.currency).allocate(...ratios).map((m) => new Money(-m.minor, this.currency));
    }
    if (ratios.some((r) => r <= 0)) throw new Error("ratio > 0");
    const total = BigInt(ratios.reduce((a, b) => a + b, 0));
    const shares = ratios.map((r) => exact(this.minor * BigInt(r)) / total);
    let left = this.minor - shares.reduce((a, b) => a + b, 0n);
    for (let i = 0; left > 0n; i++, left--) shares[i]++; // hand out the remainder, 1 unit each
    return shares.map((s) => new Money(s, this.currency));
  }

  equals(o: Money): boolean { return this.minor === o.minor && this.currency === o.currency; }

  private same(o: Money): void {
    if (this.currency !== o.currency) throw new Error(\`\${this.currency} vs \${o.currency}\`);
  }

  toString(): string {
    const abs = this.minor < 0n ? -this.minor : this.minor;
    return \`\${this.minor < 0n ? "-" : ""}\${abs / 100n}.\${(abs % 100n).toString().padStart(2, "0")}\`;
  }
}

const show = (items: Money[]): string => "[" + items.join(", ") + "]";

function attempt(action: () => void): void {
  try { action(); } catch (e) { console.log((e as Error).message); }
}

const bill = Money.of("1000.00", "INR");
const total = bill.plus(bill.percent("18"));
console.log(\`\${total} -> \${show(total.allocate(2, 1, 1))}\`); // 1180.00 -> [590.00, 295.00, 295.00]
console.log(show(Money.of("100.00", "INR").allocate(1, 1, 1))); // [33.34, 33.33, 33.33]
console.log(show(Money.of("0.05", "INR").allocate(1, 1, 1))); // [0.02, 0.02, 0.01]
console.log(show(Money.of("-1.00", "INR").allocate(1, 1, 1))); // [-0.34, -0.33, -0.33]
console.log(String(Money.of("5", "INR").equals(Money.of("5.00", "INR"))));
console.log(\`\${Money.of("0.50", "INR").percent("1")} \${Money.of("1.50", "INR").percent("1")}\`); // half-even: 0.00 0.02
console.log(String(Money.of("1.00", "INR").minus(Money.of("1.50", "INR")))); // -0.50
attempt(() => bill.plus(Money.of("1", "USD")));
attempt(() => new Money(1n, "inr"));
attempt(() => Money.of("1.005", "INR"));
attempt(() => bill.allocate(1, 0));
attempt(() => bill.allocate());
attempt(() => new Money(LONG_MAX, "INR").plus(Money.of("0.01", "INR")));` },
          { lang: 'cpp', code: `using i128 = __int128;

long long exact(i128 x) {  // do the arithmetic in 128 bits, then check it fits in 64
    if (x < numeric_limits<long long>::min() || x > numeric_limits<long long>::max()) throw overflow_error("long overflow");
    return static_cast<long long>(x);
}

struct Decimal { i128 num; int scale; };

Decimal parseDecimal(const string& s) {
    size_t i = 0;
    bool neg = !s.empty() && s[0] == '-';
    if (neg) i++;
    i128 num = 0;
    int scale = 0;
    bool frac = false;
    for (; i < s.size(); i++) {
        if (s[i] == '.') { frac = true; continue; }
        if (!isdigit(static_cast<unsigned char>(s[i]))) throw invalid_argument("not a number: " + s);
        num = num * 10 + (s[i] - '0');
        if (frac) scale++;
    }
    return {neg ? -num : num, scale};
}

i128 pow10(int n) { i128 r = 1; while (n-- > 0) r *= 10; return r; }

i128 divHalfEven(i128 n, i128 d) {  // d > 0
    i128 q = n / d, r = n % d;
    i128 twice = (r < 0 ? -r : r) * 2;
    if (twice < d || (twice == d && q % 2 == 0)) return q;
    return n < 0 ? q - 1 : q + 1;
}

class Money {  // immutable: const members, every operation returns a new object
    long long minor_;
    string currency_;

    void same(const Money& o) const {
        if (currency_ != o.currency_) throw invalid_argument(currency_ + " vs " + o.currency_);
    }

public:
    Money(long long minor, string currency) : minor_(minor), currency_(move(currency)) {
        bool ok = currency_.size() == 3 && all_of(currency_.begin(), currency_.end(), [](char c) { return c >= 'A' && c <= 'Z'; });
        if (!ok) throw invalid_argument("currency");
    }

    static Money of(const string& amount, const string& cur) {
        Decimal d = parseDecimal(amount);
        while (d.scale > 2 && d.num % 10 == 0) { d.num /= 10; d.scale--; }
        if (d.scale > 2) throw invalid_argument("at most 2 decimals");
        return Money(exact(d.num * pow10(2 - d.scale)), cur);
    }

    long long minor() const { return minor_; }
    const string& currency() const { return currency_; }

    Money plus(const Money& o) const { same(o); return Money(exact((i128)minor_ + o.minor_), currency_); }
    Money minus(const Money& o) const { same(o); return Money(exact((i128)minor_ - o.minor_), currency_); }

    Money percent(const string& p) const {
        Decimal d = parseDecimal(p);
        return Money(exact(divHalfEven((i128)minor_ * d.num, 100 * pow10(d.scale))), currency_);
    }

    vector<Money> allocate(const vector<int>& ratios) const {
        if (ratios.empty() || ratios.size() > 100) throw invalid_argument("1..100 parts");
        if (minor_ < 0) {  // split the magnitude, then restore the sign
            vector<Money> out;
            for (const Money& m : Money(exact(-(i128)minor_), currency_).allocate(ratios)) out.emplace_back(-m.minor_, currency_);
            return out;
        }
        long long total = 0;
        for (int r : ratios) {
            if (r <= 0) throw invalid_argument("ratio > 0");
            total += r;
        }
        vector<long long> shares;
        long long used = 0;
        for (int r : ratios) {
            shares.push_back(exact((i128)minor_ * r) / total);
            used += shares.back();
        }
        for (size_t i = 0; used < minor_; i++, used++) shares[i]++;  // hand out the remainder, 1 unit each
        vector<Money> out;
        for (long long s : shares) out.emplace_back(s, currency_);
        return out;
    }

    bool operator==(const Money& o) const { return minor_ == o.minor_ && currency_ == o.currency_; }

    string str() const {
        long long abs = minor_ < 0 ? -minor_ : minor_;
        string cents = to_string(abs % 100);
        return string(minor_ < 0 ? "-" : "") + to_string(abs / 100) + "." + (cents.size() < 2 ? "0" : "") + cents;
    }
};

string show(const vector<Money>& items) {
    string out = "[";
    for (size_t i = 0; i < items.size(); i++) out += (i ? ", " : "") + items[i].str();
    return out + "]";
}

void attempt(const function<void()>& action) {
    try { action(); } catch (const exception& e) { cout << e.what() << "\\n"; }
}

int main() {
    Money bill = Money::of("1000.00", "INR");
    Money total = bill.plus(bill.percent("18"));
    cout << total.str() << " -> " << show(total.allocate({2, 1, 1})) << "\\n";  // 1180.00 -> [590.00, 295.00, 295.00]
    cout << show(Money::of("100.00", "INR").allocate({1, 1, 1})) << "\\n";        // [33.34, 33.33, 33.33]
    cout << show(Money::of("0.05", "INR").allocate({1, 1, 1})) << "\\n";          // [0.02, 0.02, 0.01]
    cout << show(Money::of("-1.00", "INR").allocate({1, 1, 1})) << "\\n";         // [-0.34, -0.33, -0.33]
    cout << boolalpha << (Money::of("5", "INR") == Money::of("5.00", "INR")) << "\\n";
    cout << Money::of("0.50", "INR").percent("1").str() << " " << Money::of("1.50", "INR").percent("1").str() << "\\n";  // 0.00 0.02
    cout << Money::of("1.00", "INR").minus(Money::of("1.50", "INR")).str() << "\\n";  // -0.50
    attempt([&] { bill.plus(Money::of("1", "USD")); });
    attempt([&] { Money(1, "inr"); });
    attempt([&] { Money::of("1.005", "INR"); });
    attempt([&] { bill.allocate({1, 0}); });
    attempt([&] { bill.allocate({}); });
    attempt([&] { Money(numeric_limits<long long>::max(), "INR").plus(Money::of("0.01", "INR")); });
}` }
        ],
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
    code: [{ lang: 'java', code: `// AGGREGATE: Order is the root. OrderLine lives INSIDE and is never handed out.
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
        System.out.println(o.lines().stream().map(l -> l.product() + " x" + l.qty() + " @" + l.unitPrice()).toList() + " total=" + o.total() + " " + o.status());
        try { o.removeItem(new ProductId("tea")); } catch (IllegalStateException e) { System.out.println(e.getMessage()); }
    }
}`, alt: [
          { lang: 'python', code: `# AGGREGATE: Order is the root. OrderLine lives INSIDE and is never handed out.
from dataclasses import dataclass
from enum import Enum


@dataclass(frozen=True)
class OrderId:
    value: str


@dataclass(frozen=True)
class ProductId:
    value: str


@dataclass(frozen=True)
class CustomerId:
    value: str


@dataclass(frozen=True)
class LineView:  # read-only copy for outsiders
    product: str
    unit_price: int
    qty: int


class _OrderLine:  # inner ENTITY (local identity = product id); the leading underscore keeps it private
    def __init__(self, product: ProductId, unit_price: int, qty: int) -> None:
        self.product, self.unit_price, self.qty = product, unit_price, qty

    def subtotal(self) -> int:
        return self.unit_price * self.qty


class Status(Enum):
    DRAFT = 1
    SUBMITTED = 2


class Order:
    LIMIT_PAISE = 150_000  # invariant: total <= Rs 1500

    def __init__(self, order_id: OrderId, customer: CustomerId) -> None:
        self._id, self._customer = order_id, customer  # other aggregate referenced BY ID
        self._lines: dict[ProductId, _OrderLine] = {}
        self._status = Status.DRAFT
        self._version = 0  # for optimistic locking

    def add_item(self, p: ProductId, unit_price_snapshot: int, qty: int) -> None:
        self._require_draft()
        if not 1 <= qty <= 10:
            raise ValueError("qty 1-10")
        existing = self._lines.get(p)
        new_qty = (existing.qty if existing else 0) + qty
        if new_qty > 10:
            raise ValueError("max 10 per product")
        new_total = self.total() + unit_price_snapshot * qty
        if new_total > self.LIMIT_PAISE:
            raise RuntimeError(f"limit exceeded: {new_total}")  # rule spanning ALL lines
        if existing is None:
            self._lines[p] = _OrderLine(p, unit_price_snapshot, qty)
        else:
            existing.qty = new_qty

    def remove_item(self, p: ProductId) -> None:
        self._require_draft()
        if self._lines.pop(p, None) is None:
            raise ValueError("not in order")

    def submit(self) -> None:
        self._require_draft()
        if not self._lines:
            raise RuntimeError("empty order")
        self._status = Status.SUBMITTED

    def total(self) -> int:
        return sum(l.subtotal() for l in self._lines.values())

    def lines(self) -> list[LineView]:
        return [LineView(l.product.value, l.unit_price, l.qty) for l in self._lines.values()]

    @property
    def id(self) -> OrderId:
        return self._id

    @property
    def status(self) -> Status:
        return self._status

    @property
    def version(self) -> int:
        return self._version

    @property
    def customer(self) -> CustomerId:
        return self._customer

    def mark_saved(self, new_version: int) -> None:  # called by the repository only
        self._version = new_version

    def _require_draft(self) -> None:
        if self._status != Status.DRAFT:
            raise RuntimeError("order already submitted")


o = Order(OrderId("o1"), CustomerId("c9"))
o.add_item(ProductId("mug"), 25_000, 2)
o.add_item(ProductId("tea"), 12_000, 3)
try:
    o.add_item(ProductId("kettle"), 60_000, 2)
except RuntimeError as e:
    print(e)
o.submit()
print("[" + ", ".join(f"{l.product} x{l.qty} @{l.unit_price}" for l in o.lines()) + f"] total={o.total()} {o.status.name}")
try:
    o.remove_item(ProductId("tea"))
except RuntimeError as e:
    print(e)` },
          { lang: 'ts', code: `// AGGREGATE: Order is the root. OrderLine lives INSIDE and is never handed out.
class OrderId { constructor(readonly value: string) {} }
class ProductId { constructor(readonly value: string) {} }
class CustomerId { constructor(readonly value: string) {} }

interface LineView { readonly product: string; readonly unitPrice: number; readonly qty: number; } // read-only copy for outsiders

class OrderLine { // inner ENTITY (local identity = product id); not exported, so outsiders cannot name it
  constructor(readonly product: ProductId, readonly unitPrice: number, public qty: number) {}
  subtotal(): number { return this.unitPrice * this.qty; }
}

type Status = "DRAFT" | "SUBMITTED";

class Order {
  static readonly LIMIT_PAISE = 150_000; // invariant: total <= Rs 1500
  private readonly lines_ = new Map<string, OrderLine>(); // keyed by the product id's value
  private currentStatus: Status = "DRAFT";
  private currentVersion = 0; // for optimistic locking

  constructor(readonly id: OrderId, readonly customer: CustomerId) {} // other aggregate referenced BY ID

  addItem(p: ProductId, unitPriceSnapshot: number, qty: number): void {
    this.requireDraft();
    if (qty < 1 || qty > 10) throw new Error("qty 1-10");
    const existing = this.lines_.get(p.value);
    const newQty = (existing?.qty ?? 0) + qty;
    if (newQty > 10) throw new Error("max 10 per product");
    const newTotal = this.total() + unitPriceSnapshot * qty;
    if (newTotal > Order.LIMIT_PAISE) throw new Error(\`limit exceeded: \${newTotal}\`); // rule spanning ALL lines
    if (existing === undefined) this.lines_.set(p.value, new OrderLine(p, unitPriceSnapshot, qty));
    else existing.qty = newQty;
  }

  removeItem(p: ProductId): void {
    this.requireDraft();
    if (!this.lines_.delete(p.value)) throw new Error("not in order");
  }

  submit(): void {
    this.requireDraft();
    if (this.lines_.size === 0) throw new Error("empty order");
    this.currentStatus = "SUBMITTED";
  }

  total(): number {
    let sum = 0;
    for (const l of this.lines_.values()) sum += l.subtotal();
    return sum;
  }
  lines(): LineView[] {
    return [...this.lines_.values()].map((l) => ({ product: l.product.value, unitPrice: l.unitPrice, qty: l.qty }));
  }
  status(): Status { return this.currentStatus; }
  version(): number { return this.currentVersion; }
  markSaved(newVersion: number): void { this.currentVersion = newVersion; } // called by the repository only
  private requireDraft(): void {
    if (this.currentStatus !== "DRAFT") throw new Error("order already submitted");
  }
}

const o = new Order(new OrderId("o1"), new CustomerId("c9"));
o.addItem(new ProductId("mug"), 25_000, 2);
o.addItem(new ProductId("tea"), 12_000, 3);
try { o.addItem(new ProductId("kettle"), 60_000, 2); } catch (e) { console.log((e as Error).message); }
o.submit();
console.log("[" + o.lines().map((l) => \`\${l.product} x\${l.qty} @\${l.unitPrice}\`).join(", ") + \`] total=\${o.total()} \${o.status()}\`);
try { o.removeItem(new ProductId("tea")); } catch (e) { console.log((e as Error).message); }` },
          { lang: 'cpp', code: `// AGGREGATE: Order is the root. OrderLine lives INSIDE and is never handed out.
struct OrderId { string value; };
struct ProductId {
    string value;
    bool operator==(const ProductId&) const = default;
};
struct CustomerId { string value; };

class Order {
public:
    static constexpr long long LIMIT_PAISE = 150'000;  // invariant: total <= Rs 1500
    enum class Status { DRAFT, SUBMITTED };
    struct LineView { string product; long long unitPrice; int qty; };  // read-only copy for outsiders

private:
    struct OrderLine {  // inner ENTITY (local identity = product id); private, so outsiders cannot name it
        ProductId product;
        long long unitPrice;
        int qty;
        long long subtotal() const { return unitPrice * qty; }
    };

    OrderId id_;
    CustomerId customer_;  // other aggregate referenced BY ID
    vector<OrderLine> lines_;  // insertion order
    Status status_ = Status::DRAFT;
    long long version_ = 0;  // for optimistic locking

    void requireDraft() const {
        if (status_ != Status::DRAFT) throw runtime_error("order already submitted");
    }

public:
    Order(OrderId id, CustomerId customer) : id_(move(id)), customer_(move(customer)) {}

    void addItem(const ProductId& p, long long unitPriceSnapshot, int qty) {
        requireDraft();
        if (qty < 1 || qty > 10) throw invalid_argument("qty 1-10");
        auto existing = find_if(lines_.begin(), lines_.end(), [&](const OrderLine& l) { return l.product == p; });
        int newQty = (existing == lines_.end() ? 0 : existing->qty) + qty;
        if (newQty > 10) throw invalid_argument("max 10 per product");
        long long newTotal = total() + unitPriceSnapshot * qty;
        if (newTotal > LIMIT_PAISE) throw runtime_error("limit exceeded: " + to_string(newTotal));  // rule spanning ALL lines
        if (existing == lines_.end()) lines_.push_back({p, unitPriceSnapshot, qty});
        else existing->qty = newQty;
    }
    void removeItem(const ProductId& p) {
        requireDraft();
        auto it = find_if(lines_.begin(), lines_.end(), [&](const OrderLine& l) { return l.product == p; });
        if (it == lines_.end()) throw invalid_argument("not in order");
        lines_.erase(it);
    }
    void submit() {
        requireDraft();
        if (lines_.empty()) throw runtime_error("empty order");
        status_ = Status::SUBMITTED;
    }

    long long total() const {
        long long sum = 0;
        for (const auto& l : lines_) sum += l.subtotal();
        return sum;
    }
    vector<LineView> lines() const {
        vector<LineView> out;
        for (const auto& l : lines_) out.push_back({l.product.value, l.unitPrice, l.qty});
        return out;
    }
    Status status() const { return status_; }
    long long version() const { return version_; }
    void markSaved(long long newVersion) { version_ = newVersion; }  // called by the repository only
};

int main() {
    Order o(OrderId{"o1"}, CustomerId{"c9"});
    o.addItem(ProductId{"mug"}, 25'000, 2);
    o.addItem(ProductId{"tea"}, 12'000, 3);
    try {
        o.addItem(ProductId{"kettle"}, 60'000, 2);
    } catch (const runtime_error& e) {
        cout << e.what() << "\\n";
    }
    o.submit();
    string list;
    for (const auto& l : o.lines()) list += (list.empty() ? "" : ", ") + l.product + " x" + to_string(l.qty) + " @" + to_string(l.unitPrice);
    cout << "[" << list << "] total=" << o.total() << " " << (o.status() == Order::Status::SUBMITTED ? "SUBMITTED" : "DRAFT") << "\\n";
    try {
        o.removeItem(ProductId{"tea"});
    } catch (const runtime_error& e) {
        cout << e.what() << "\\n";
    }
}` }
        ] }, { lang: 'java', code: `// REPOSITORY: collection-like port in the domain + in-memory adapter with optimistic locking.
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
}`, alt: [
          { lang: 'python', code: `# REPOSITORY: collection-like port in the domain + in-memory adapter with optimistic locking.
import threading
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional


class ConcurrencyConflict(Exception):
    pass


class Account:  # tiny aggregate to keep the demo short
    def __init__(self, account_id: str, balance: int, version: int) -> None:
        self._id, self._balance, self._version = account_id, balance, version

    def withdraw(self, amt: int) -> None:
        if amt > self._balance:
            raise RuntimeError("insufficient")
        self._balance -= amt

    def deposit(self, amt: int) -> None:
        self._balance += amt

    @property
    def id(self) -> str:
        return self._id

    @property
    def balance(self) -> int:
        return self._balance

    @property
    def version(self) -> int:
        return self._version


class AccountRepository(ABC):  # PORT: speaks in aggregates, not rows
    @abstractmethod
    def by_id(self, account_id: str) -> Optional[Account]: ...

    @abstractmethod
    def save(self, a: Account) -> None: ...  # raises ConcurrencyConflict on stale version


@dataclass(frozen=True)
class _Stored:  # what the "database" keeps (a copy, not the live object)
    balance: int
    version: int


class InMemoryAccountRepository(AccountRepository):
    def __init__(self) -> None:
        self._table: dict[str, _Stored] = {}
        self._lock = threading.Lock()

    def by_id(self, account_id: str) -> Optional[Account]:
        s = self._table.get(account_id)
        return None if s is None else Account(account_id, s.balance, s.version)  # fresh object per load

    def save(self, a: Account) -> None:
        with self._lock:
            cur = self._table.get(a.id)
            expected = cur.version if cur else 0
            if a.version != expected:  # like: UPDATE ... SET version = v+1 WHERE id = ? AND version = ?
                raise ConcurrencyConflict(f"account {a.id} changed by someone else (v{expected} vs v{a.version})")
            self._table[a.id] = _Stored(a.balance, expected + 1)


def load(repo: AccountRepository, account_id: str) -> Account:
    found = repo.by_id(account_id)
    if found is None:
        raise LookupError(account_id)
    return found


repo = InMemoryAccountRepository()
repo.save(Account("acc-1", 1000, 0))  # v0 -> stored v1

tab1 = load(repo, "acc-1")  # both users load v1
tab2 = load(repo, "acc-1")
tab1.withdraw(800)
repo.save(tab1)  # ok, stored v2, balance 200
tab2.withdraw(800)  # tab2 still thinks balance is 1000!
try:
    repo.save(tab2)
except ConcurrencyConflict as e:
    print(f"rejected: {e}")
print(f"balance now {load(repo, 'acc-1').balance}")  # 200, not -600` },
          { lang: 'ts', code: `// REPOSITORY: collection-like port in the domain + in-memory adapter with optimistic locking.
class ConcurrencyConflict extends Error {}

class Account { // tiny aggregate to keep the demo short
  constructor(readonly id: string, private balanceValue: number, readonly version: number) {}
  withdraw(amt: number): void {
    if (amt > this.balanceValue) throw new Error("insufficient");
    this.balanceValue -= amt;
  }
  deposit(amt: number): void { this.balanceValue += amt; }
  balance(): number { return this.balanceValue; }
}

interface AccountRepository { // PORT: speaks in aggregates, not rows
  byId(id: string): Account | undefined;
  save(a: Account): void; // throws ConcurrencyConflict on stale version
}

class InMemoryAccountRepository implements AccountRepository {
  private readonly table = new Map<string, { balance: number; version: number }>(); // what the "database" keeps (a copy)

  byId(id: string): Account | undefined {
    const s = this.table.get(id);
    return s === undefined ? undefined : new Account(id, s.balance, s.version); // fresh object per load
  }

  save(a: Account): void {
    const cur = this.table.get(a.id);
    const expected = cur === undefined ? 0 : cur.version;
    if (a.version !== expected) { // like: UPDATE ... SET version = v+1 WHERE id = ? AND version = ?
      throw new ConcurrencyConflict(\`account \${a.id} changed by someone else (v\${expected} vs v\${a.version})\`);
    }
    this.table.set(a.id, { balance: a.balance(), version: expected + 1 });
  }
}

function load(repo: AccountRepository, id: string): Account {
  const found = repo.byId(id);
  if (found === undefined) throw new Error(id);
  return found;
}

const repo = new InMemoryAccountRepository();
repo.save(new Account("acc-1", 1000, 0)); // v0 -> stored v1

const tab1 = load(repo, "acc-1"); // both users load v1
const tab2 = load(repo, "acc-1");
tab1.withdraw(800);
repo.save(tab1); // ok, stored v2, balance 200
tab2.withdraw(800); // tab2 still thinks balance is 1000!
try { repo.save(tab2); } catch (e) { if (e instanceof ConcurrencyConflict) console.log("rejected: " + e.message); }
console.log("balance now " + load(repo, "acc-1").balance()); // 200, not -600` },
          { lang: 'cpp', code: `// REPOSITORY: collection-like port in the domain + in-memory adapter with optimistic locking.
struct ConcurrencyConflict : runtime_error {
    using runtime_error::runtime_error;
};

class Account {  // tiny aggregate to keep the demo short
    string id_;
    long long balance_, version_;

public:
    Account(string id, long long balance, long long version) : id_(move(id)), balance_(balance), version_(version) {}
    void withdraw(long long amt) {
        if (amt > balance_) throw logic_error("insufficient");
        balance_ -= amt;
    }
    void deposit(long long amt) { balance_ += amt; }
    const string& id() const { return id_; }
    long long balance() const { return balance_; }
    long long version() const { return version_; }
};

struct AccountRepository {  // PORT: speaks in aggregates, not rows
    virtual ~AccountRepository() = default;
    virtual optional<Account> byId(const string& id) const = 0;  // returns a copy: a fresh object per load
    virtual void save(const Account& a) = 0;                    // throws ConcurrencyConflict on stale version
};

class InMemoryAccountRepository : public AccountRepository {
    struct Stored { long long balance, version; };  // what the "database" keeps (a copy, not the live object)
    map<string, Stored> table_;
    mutex m_;

public:
    optional<Account> byId(const string& id) const override {
        auto it = table_.find(id);
        if (it == table_.end()) return nullopt;
        return Account(id, it->second.balance, it->second.version);
    }
    void save(const Account& a) override {
        lock_guard<mutex> lock(m_);
        auto cur = table_.find(a.id());
        long long expected = cur == table_.end() ? 0 : cur->second.version;
        if (a.version() != expected)  // like: UPDATE ... SET version = v+1 WHERE id = ? AND version = ?
            throw ConcurrencyConflict("account " + a.id() + " changed by someone else (v" + to_string(expected) + " vs v" + to_string(a.version()) + ")");
        table_[a.id()] = Stored{a.balance(), expected + 1};
    }
};

int main() {
    InMemoryAccountRepository repo;
    repo.save(Account("acc-1", 1000, 0));  // v0 -> stored v1

    Account tab1 = repo.byId("acc-1").value();  // both users load v1
    Account tab2 = repo.byId("acc-1").value();
    tab1.withdraw(800);
    repo.save(tab1);    // ok, stored v2, balance 200
    tab2.withdraw(800);  // tab2 still thinks balance is 1000!
    try {
        repo.save(tab2);
    } catch (const ConcurrencyConflict& e) {
        cout << "rejected: " << e.what() << "\\n";
    }
    cout << "balance now " << repo.byId("acc-1").value().balance() << "\\n";  // 200, not -600
}` }
        ] }],
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
            frames.push(F('Sneaky code tries to skip the root: <code>order.lines().get(0).qty = 99</code>. <span class="c-g">Blocked:</span> <code>lines()</code> returns read-only <code>LineView</code> copies and <code>OrderLine</code> is a private inner class. Outsiders can <b>see</b> inside the boundary but never <b>hold</b> or <b>change</b> an inner object. That is what makes the invariants trustworthy.', [graph(gb, {}), CODE('Order', 'private static final class OrderLine { ... }\nList<LineView> lines() {\n  return lines.values().stream()\n    .map(l -> new LineView(...)).toList();\n}', { 1: 'ok', 4: 'ok' }, LINES_ALT), state()]));
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
}`, alt: [
          { lang: 'python', code: `from typing import Callable


class Booking:
    def __init__(self, booking_id: str, room: str, price_paise: int) -> None:  # internal: use create()
        self._id, self._room, self._price_paise = booking_id, room, price_paise

    @staticmethod
    def create(room: str, quoted_price: int, ids: Callable[[], str]) -> "Booking":
        if quoted_price <= 0:
            raise ValueError("quote must be positive")
        return Booking(ids(), room, quoted_price)

    def __str__(self) -> str:
        return f"{self._id}:{self._room}:{self._price_paise}"` },
          { lang: 'ts', code: `class Booking {
  private constructor(private readonly id: string, private readonly room: string, private readonly pricePaise: number) {}

  static create(room: string, quotedPrice: number, ids: () => string): Booking {
    if (quotedPrice <= 0) throw new Error("quote must be positive");
    return new Booking(ids(), room, quotedPrice);
  }

  toString(): string { return \`\${this.id}:\${this.room}:\${this.pricePaise}\`; }
}` },
          { lang: 'cpp', code: `class Booking {
    string id_, room_;
    long long pricePaise_;
    Booking(string id, string room, long long price) : id_(move(id)), room_(move(room)), pricePaise_(price) {}

public:
    static Booking create(const string& room, long long quotedPrice, const function<string()>& ids) {
        if (quotedPrice <= 0) throw invalid_argument("quote must be positive");
        return Booking(ids(), room, quotedPrice);
    }
    string str() const { return id_ + ":" + room_ + ":" + to_string(pricePaise_); }
};` }
        ] }
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
      brute: { why: `<p>Bids stored as independent rows saved by a <code>BidService</code> that checks "highest so far" with a separate query. Two concurrent bids both read highest = 1000 and both get saved: two "highest" bids. The seller rule and end time are checked in the controller only, so the batch importer bypasses them.</p>`, code: { lang: 'java', code: `class BidServiceBrute {
    final List<long[]> bidsTable = new ArrayList<>();            // rows of {auctionId, amount}
    void bid(long auctionId, long amount) {
        long highest = bidsTable.stream().filter(r -> r[0] == auctionId).mapToLong(r -> r[1]).max().orElse(0);
        // ...another thread can insert between this read and the write below
        if (amount > highest) bidsTable.add(new long[]{auctionId, amount});
    }
}`, alt: [{ lang: 'python', code: "class BidServiceBrute:\n    def __init__(self):\n        self.bids_table = []                          # rows of (auction_id, amount)\n\n    def bid(self, auction_id, amount):\n        highest = max((a for i, a in self.bids_table if i == auction_id), default=0)\n        # ...another thread can insert between this read and the write below\n        if amount > highest: self.bids_table.append((auction_id, amount))\n" }, { lang: 'ts', code: "class BidServiceBrute {\n  private bidsTable: Array<[number, number]> = [];    // rows of [auctionId, amount]\n  bid(auctionId: number, amount: number): void {\n    const highest = Math.max(0, ...this.bidsTable.filter((r) => r[0] === auctionId).map((r) => r[1]));\n    // ...another worker (or an await) can insert between this read and the write below\n    if (amount > highest) this.bidsTable.push([auctionId, amount]);\n  }\n}\n" }, { lang: 'cpp', code: "class BidServiceBrute {\n    vector<pair<long long, long long>> bidsTable;     // rows of {auctionId, amount}\npublic:\n    void bid(long long auctionId, long long amount) {\n        long long highest = 0;\n        for (auto& r : bidsTable) if (r.first == auctionId) highest = max(highest, r.second);\n        // ...another thread can insert between this read and the write below\n        if (amount > highest) bidsTable.push_back({auctionId, amount});\n    }\n};\n" }] } },
      mcq: { q: 'Which is the best aggregate design?', options: ['Auction is the root and holds the current highest bid (and recent bids); every bid goes through Auction.placeBid(), saved with a version check', 'Each Bid is its own aggregate with no link to Auction', 'User aggregate holds all their bids across auctions', 'One global AuctionHouse aggregate holding every auction'], answer: 0, explain: 'The rule "must beat the current highest" needs the highest bid and the auction state together, instantly — so they share one aggregate. Small enough to load fast; the version check serialises racing bids.' },
      hints: [`<p>Hint 1: Which data does the "beat the highest by increment" rule need? The auction's highest bid, increment, end time and seller — put exactly that in the <code>Auction</code> aggregate.</p>`, `<p>Hint 2: Bid history can grow large; keep only the highest (plus maybe last N) inside, and publish each accepted bid as an event for a separate history read model.</p>`, `<p>Hint 3: Repository <code>save</code> compares versions; the application service retries: reload → <code>placeBid</code> again (it may now be rejected because someone bid higher) → save.</p>`],
      tests: { io: true, cases: [{ stdin: '', stdout: "OK asha 1000\nREJECTED ravi 1050: bid must be >= 1100\nOK ravi 1100\nREJECTED ravi 1300: already highest bidder\nREJECTED sam 2000: seller cannot bid\nOK asha 1600\nmeera's save rejected: stale version -> retry sees ravi at 1700\nwinner: ravi 1700\ntoo early\nREJECTED asha 2000: auction ended\nREJECTED asha 100: unknown auction zz\nOK asha 600\na2 winner: none\n" }] },
      solution: {
        approach: `<p><code>Auction</code> is the aggregate root holding seller, prices, end time, status, the current highest bid (a value object) and a version. <code>placeBid</code> checks all five rules. The repository stores snapshots and rejects stale versions. The application service wraps "load → placeBid → save" in a bounded retry loop so a losing racer is re-validated against the fresh highest bid. A bid on an unknown auction id is a rejection, not a crash.</p>`,
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
    synchronized Auction load(String id) {                                          // detached copy per caller
        Auction a = db.get(id);
        if (a == null) throw new NoSuchElementException("unknown auction " + id);
        return a.copy();
    }
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
            Auction a;
            try { a = repo.load(auctionId); a.placeBid(bidder, amount, clock.instant()); }
            catch (RuntimeException rule) { return "REJECTED " + bidder + " " + amount + ": " + rule.getMessage(); }
            try { repo.save(a); return "OK " + bidder + " " + amount; }
            catch (StaleAuction e) { /* someone else won the race: reload and re-validate */ }
        }
        return "BUSY, try again";
    }
    static String winner(Optional<Bid> w) { return w.map(b -> b.bidder() + " " + b.amount()).orElse("none"); }

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
        System.out.println("winner: " + winner(repo.load("a1").close(now.plusSeconds(7200))));
        try { repo.load("a1").close(now); } catch (IllegalStateException e) { System.out.println(e.getMessage()); }
        BidService late = new BidService(repo, Clock.fixed(now.plusSeconds(3600), ZoneOffset.UTC));
        System.out.println(late.bid("a1", "asha", 2000));                 // the end time itself is already too late
        System.out.println(svc.bid("zz", "asha", 100));
        repo.save(new Auction("a2", "sam", 500, 50, 5000, now.plusSeconds(3600), null, false, 0));
        System.out.println(svc.bid("a2", "asha", 600));
        System.out.println("a2 winner: " + winner(repo.load("a2").close(now.plusSeconds(3600))));   // reserve not met
    }
}`,
        alt: [
          { lang: 'python', code: `import threading
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Callable, Optional


@dataclass(frozen=True)
class Bid:
    bidder: str
    amount: int


class Auction:  # aggregate root: every rule about bids lives here
    def __init__(self, auction_id: str, seller: str, start_price: int, increment: int, reserve: int,
                 ends_at: datetime, highest: Optional[Bid] = None, closed: bool = False, version: int = 0) -> None:
        self.id, self._seller = auction_id, seller
        self._start_price, self._increment, self._reserve = start_price, increment, reserve
        self._ends_at, self._highest, self._closed = ends_at, highest, closed
        self.version = version

    def place_bid(self, bidder: str, amount: int, now: datetime) -> None:
        if self._closed or now >= self._ends_at:
            raise RuntimeError("auction ended")
        if bidder == self._seller:
            raise RuntimeError("seller cannot bid")
        if self._highest is not None and self._highest.bidder == bidder:
            raise RuntimeError("already highest bidder")
        minimum = self._start_price if self._highest is None else self._highest.amount + self._increment
        if amount < minimum:
            raise ValueError(f"bid must be >= {minimum}")
        self._highest = Bid(bidder, amount)

    def close(self, now: datetime) -> Optional[Bid]:
        if now < self._ends_at:
            raise RuntimeError("too early")
        self._closed = True
        if self._highest is not None and self._highest.amount >= self._reserve:
            return self._highest
        return None

    def copy(self) -> "Auction":
        return Auction(self.id, self._seller, self._start_price, self._increment, self._reserve,
                       self._ends_at, self._highest, self._closed, self.version)


class StaleAuction(RuntimeError):
    def __init__(self) -> None:
        super().__init__("stale version")


class AuctionRepository:
    def __init__(self) -> None:
        self._db: dict[str, Auction] = {}
        self._lock = threading.Lock()

    def load(self, auction_id: str) -> Auction:  # detached copy per caller
        with self._lock:
            a = self._db.get(auction_id)
            if a is None:
                raise LookupError(f"unknown auction {auction_id}")
            return a.copy()

    def save(self, a: Auction) -> None:
        with self._lock:
            cur = self._db.get(a.id)
            if cur is not None and cur.version != a.version:
                raise StaleAuction()
            stored = a.copy()
            stored.version += 1
            self._db[a.id] = stored


class BidService:
    def __init__(self, repo: AuctionRepository, clock: Callable[[], datetime]) -> None:
        self._repo, self._clock = repo, clock

    def bid(self, auction_id: str, bidder: str, amount: int) -> str:
        for _ in range(3):
            try:
                a = self._repo.load(auction_id)
                a.place_bid(bidder, amount, self._clock())
            except (ValueError, RuntimeError, LookupError) as rule:
                return f"REJECTED {bidder} {amount}: {rule.args[0]}"
            try:
                self._repo.save(a)
                return f"OK {bidder} {amount}"
            except StaleAuction:
                pass  # someone else won the race: reload and re-validate
        return "BUSY, try again"


def winner(w: Optional[Bid]) -> str:
    return f"{w.bidder} {w.amount}" if w else "none"


now = datetime(2026, 6, 1, 10, 0, tzinfo=timezone.utc)
hour = timedelta(hours=1)
repo = AuctionRepository()
repo.save(Auction("a1", "sam", 1000, 100, 1500, now + hour))
svc = BidService(repo, lambda: now)
for who, amt in [("asha", 1000), ("ravi", 1050), ("ravi", 1100), ("ravi", 1300), ("sam", 2000), ("asha", 1600)]:
    print(svc.bid("a1", who, amt))
# race: two copies loaded at the same version
x, y = repo.load("a1"), repo.load("a1")
x.place_bid("ravi", 1700, now)
repo.save(x)
y.place_bid("meera", 1700, now)
try:
    repo.save(y)
except StaleAuction as e:
    print(f"meera's save rejected: {e} -> retry sees ravi at 1700")
print("winner:", winner(repo.load("a1").close(now + 2 * hour)))
try:
    repo.load("a1").close(now)
except RuntimeError as e:
    print(e)
late = BidService(repo, lambda: now + hour)
print(late.bid("a1", "asha", 2000))  # the end time itself is already too late
print(svc.bid("zz", "asha", 100))
repo.save(Auction("a2", "sam", 500, 50, 5000, now + hour))
print(svc.bid("a2", "asha", 600))
print("a2 winner:", winner(repo.load("a2").close(now + hour)))  # reserve not met` },
          { lang: 'ts', code: `interface Bid { readonly bidder: string; readonly amount: number; }

class Auction { // aggregate root: every rule about bids lives here
  version: number;
  private highest: Bid | undefined;
  private closed: boolean;

  constructor(
    readonly id: string,
    private readonly seller: string,
    private readonly startPrice: number,
    private readonly increment: number,
    private readonly reserve: number,
    private readonly endsAt: number, // epoch seconds
    highest?: Bid,
    closed = false,
    version = 0,
  ) {
    this.highest = highest;
    this.closed = closed;
    this.version = version;
  }

  placeBid(bidder: string, amount: number, now: number): void {
    if (this.closed || now >= this.endsAt) throw new Error("auction ended");
    if (bidder === this.seller) throw new Error("seller cannot bid");
    if (this.highest !== undefined && this.highest.bidder === bidder) throw new Error("already highest bidder");
    const min = this.highest === undefined ? this.startPrice : this.highest.amount + this.increment;
    if (amount < min) throw new Error(\`bid must be >= \${min}\`);
    this.highest = { bidder, amount };
  }

  close(now: number): Bid | undefined {
    if (now < this.endsAt) throw new Error("too early");
    this.closed = true;
    return this.highest !== undefined && this.highest.amount >= this.reserve ? this.highest : undefined;
  }

  copy(): Auction {
    return new Auction(this.id, this.seller, this.startPrice, this.increment, this.reserve,
      this.endsAt, this.highest, this.closed, this.version);
  }
}

class StaleAuction extends Error {
  constructor() { super("stale version"); }
}

class AuctionRepository { // single-threaded runtime: no lock needed around the check-and-store
  private readonly db = new Map<string, Auction>();

  load(id: string): Auction { // detached copy per caller
    const a = this.db.get(id);
    if (a === undefined) throw new Error(\`unknown auction \${id}\`);
    return a.copy();
  }

  save(a: Auction): void {
    const cur = this.db.get(a.id);
    if (cur !== undefined && cur.version !== a.version) throw new StaleAuction();
    const stored = a.copy();
    stored.version++;
    this.db.set(a.id, stored);
  }
}

class BidService {
  constructor(private readonly repo: AuctionRepository, private readonly clock: () => number) {}

  bid(auctionId: string, bidder: string, amount: number): string {
    for (let attempt = 1; attempt <= 3; attempt++) {
      let a: Auction;
      try {
        a = this.repo.load(auctionId);
        a.placeBid(bidder, amount, this.clock());
      } catch (rule) {
        return \`REJECTED \${bidder} \${amount}: \${(rule as Error).message}\`;
      }
      try {
        this.repo.save(a);
        return \`OK \${bidder} \${amount}\`;
      } catch (e) {
        if (!(e instanceof StaleAuction)) throw e; // someone else won the race: reload and re-validate
      }
    }
    return "BUSY, try again";
  }
}

const winner = (w: Bid | undefined): string => (w ? \`\${w.bidder} \${w.amount}\` : "none");

const now = Date.UTC(2026, 5, 1, 10, 0) / 1000;
const HOUR = 3600;
const repo = new AuctionRepository();
repo.save(new Auction("a1", "sam", 1000, 100, 1500, now + HOUR));
const svc = new BidService(repo, () => now);
const bids: [string, number][] = [["asha", 1000], ["ravi", 1050], ["ravi", 1100], ["ravi", 1300], ["sam", 2000], ["asha", 1600]];
for (const [who, amt] of bids) console.log(svc.bid("a1", who, amt));
// race: two copies loaded at the same version
const x = repo.load("a1");
const y = repo.load("a1");
x.placeBid("ravi", 1700, now);
repo.save(x);
y.placeBid("meera", 1700, now);
try { repo.save(y); } catch (e) { console.log(\`meera's save rejected: \${(e as Error).message} -> retry sees ravi at 1700\`); }
console.log("winner: " + winner(repo.load("a1").close(now + 2 * HOUR)));
try { repo.load("a1").close(now); } catch (e) { console.log((e as Error).message); }
const late = new BidService(repo, () => now + HOUR);
console.log(late.bid("a1", "asha", 2000)); // the end time itself is already too late
console.log(svc.bid("zz", "asha", 100));
repo.save(new Auction("a2", "sam", 500, 50, 5000, now + HOUR));
console.log(svc.bid("a2", "asha", 600));
console.log("a2 winner: " + winner(repo.load("a2").close(now + HOUR))); // reserve not met` },
          { lang: 'cpp', code: `struct Bid {
    string bidder;
    long long amount;
};

class Auction {  // aggregate root: every rule about bids lives here; copying it is cheap and safe
    string id_, seller_;
    long long startPrice_, increment_, reserve_;
    long long endsAt_;  // epoch seconds
    optional<Bid> highest_;
    bool closed_ = false;
    long long version_ = 0;

public:
    Auction(string id, string seller, long long start, long long inc, long long reserve, long long endsAt)
        : id_(move(id)), seller_(move(seller)), startPrice_(start), increment_(inc), reserve_(reserve), endsAt_(endsAt) {}

    void placeBid(const string& bidder, long long amount, long long now) {
        if (closed_ || now >= endsAt_) throw runtime_error("auction ended");
        if (bidder == seller_) throw runtime_error("seller cannot bid");
        if (highest_ && highest_->bidder == bidder) throw runtime_error("already highest bidder");
        long long min = highest_ ? highest_->amount + increment_ : startPrice_;
        if (amount < min) throw invalid_argument("bid must be >= " + to_string(min));
        highest_ = Bid{bidder, amount};
    }
    optional<Bid> close(long long now) {
        if (now < endsAt_) throw runtime_error("too early");
        closed_ = true;
        if (highest_ && highest_->amount >= reserve_) return highest_;
        return nullopt;
    }
    const string& id() const { return id_; }
    long long version() const { return version_; }
    void bumpVersion() { version_++; }
};

struct StaleAuction : runtime_error {
    StaleAuction() : runtime_error("stale version") {}
};

class AuctionRepository {
    map<string, Auction> db_;
    mutex m_;

public:
    Auction load(const string& id) {  // the returned value is a detached copy
        lock_guard<mutex> lock(m_);
        auto it = db_.find(id);
        if (it == db_.end()) throw out_of_range("unknown auction " + id);
        return it->second;
    }
    void save(const Auction& a) {
        lock_guard<mutex> lock(m_);
        auto it = db_.find(a.id());
        if (it != db_.end() && it->second.version() != a.version()) throw StaleAuction();
        Auction stored = a;
        stored.bumpVersion();
        db_.insert_or_assign(a.id(), stored);
    }
};

class BidService {
    AuctionRepository& repo_;
    function<long long()> clock_;

public:
    BidService(AuctionRepository& r, function<long long()> c) : repo_(r), clock_(move(c)) {}

    string bid(const string& auctionId, const string& bidder, long long amount) {
        for (int attempt = 1; attempt <= 3; attempt++) {
            try {
                Auction a = repo_.load(auctionId);
                a.placeBid(bidder, amount, clock_());
                repo_.save(a);
                return "OK " + bidder + " " + to_string(amount);
            } catch (const StaleAuction&) {
                // someone else won the race: reload and re-validate
            } catch (const exception& rule) {
                return "REJECTED " + bidder + " " + to_string(amount) + ": " + rule.what();
            }
        }
        return "BUSY, try again";
    }
};

string winner(const optional<Bid>& w) { return w ? w->bidder + " " + to_string(w->amount) : "none"; }

int main() {
    const long long now = 1'780'308'000;  // 2026-06-01T10:00:00Z
    const long long HOUR = 3600;
    AuctionRepository repo;
    repo.save(Auction("a1", "sam", 1000, 100, 1500, now + HOUR));
    BidService svc(repo, [=] { return now; });
    vector<pair<string, long long>> bids = {{"asha", 1000}, {"ravi", 1050}, {"ravi", 1100}, {"ravi", 1300}, {"sam", 2000}, {"asha", 1600}};
    for (const auto& [who, amt] : bids) cout << svc.bid("a1", who, amt) << "\\n";
    // race: two copies loaded at the same version
    Auction x = repo.load("a1"), y = repo.load("a1");
    x.placeBid("ravi", 1700, now);
    repo.save(x);
    y.placeBid("meera", 1700, now);
    try {
        repo.save(y);
    } catch (const StaleAuction& e) {
        cout << "meera's save rejected: " << e.what() << " -> retry sees ravi at 1700\\n";
    }
    cout << "winner: " << winner(repo.load("a1").close(now + 2 * HOUR)) << "\\n";
    try {
        repo.load("a1").close(now);
    } catch (const runtime_error& e) {
        cout << e.what() << "\\n";
    }
    BidService late(repo, [=] { return now + HOUR; });
    cout << late.bid("a1", "asha", 2000) << "\\n";  // the end time itself is already too late
    cout << svc.bid("zz", "asha", 100) << "\\n";
    repo.save(Auction("a2", "sam", 500, 50, 5000, now + HOUR));
    cout << svc.bid("a2", "asha", 600) << "\\n";
    cout << "a2 winner: " << winner(repo.load("a2").close(now + HOUR)) << "\\n";  // reserve not met
}` }
        ],
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
    code: [{ lang: 'java', code: `// Domain events recorded by the aggregate, dispatched AFTER save by the application service.
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
}`, alt: [
          { lang: 'python', code: `# Domain events recorded by the aggregate, dispatched AFTER save by the application service.
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Callable, TypeVar, Union

E = TypeVar("E")


@dataclass(frozen=True)
class OrderPlaced:  # a FACT, past tense
    event_id: str
    occurred_at: datetime
    order_id: str
    customer_id: str
    total_paise: int


@dataclass(frozen=True)
class OrderPaid:
    event_id: str
    occurred_at: datetime
    order_id: str
    amount_paise: int


DomainEvent = Union[OrderPlaced, OrderPaid]


class AggregateRoot:
    def __init__(self) -> None:
        self._pending: list[DomainEvent] = []

    def _record(self, e: DomainEvent) -> None:
        self._pending.append(e)

    def pull_events(self) -> list[DomainEvent]:
        out, self._pending = self._pending, []
        return out


class Order(AggregateRoot):
    def __init__(self, order_id: str, customer_id: str, total: int) -> None:
        super().__init__()
        self._id, self._customer_id, self._total, self._status = order_id, customer_id, total, "NEW"

    def place(self, clock: Callable[[], datetime], ids: Callable[[], str]) -> None:
        if self._status != "NEW":
            raise RuntimeError("already placed")
        self._status = "PLACED"
        self._record(OrderPlaced(ids(), clock(), self._id, self._customer_id, self._total))

    def pay(self, amount: int, clock: Callable[[], datetime], ids: Callable[[], str]) -> None:
        if self._status != "PLACED" or amount != self._total:
            raise RuntimeError("cannot pay")
        self._status = "PAID"
        self._record(OrderPaid(ids(), clock(), self._id, amount))


class EventBus:  # in-process dispatcher, subscription by type
    def __init__(self) -> None:
        self._handlers: dict[type, list[Callable[[DomainEvent], None]]] = {}

    def subscribe(self, event_type: type[E], handler: Callable[[E], None]) -> None:
        self._handlers.setdefault(event_type, []).append(handler)  # type: ignore[arg-type]

    def publish(self, events: list[DomainEvent]) -> None:
        for e in events:
            for h in self._handlers.get(type(e), []):
                try:
                    h(e)  # one failing handler must not stop the others
                except Exception as ex:
                    print(f"  handler failed for {e.event_id}, will retry: {ex}")


class PlaceOrderService:
    def __init__(self, bus: EventBus, clock: Callable[[], datetime], ids: Callable[[], str]) -> None:
        self._repo: dict[str, Order] = {}
        self._bus, self._clock, self._ids = bus, clock, ids

    def place_and_pay(self, order_id: str, customer: str, total: int) -> None:
        o = Order(order_id, customer, total)
        o.place(self._clock, self._ids)
        o.pay(total, self._clock, self._ids)
        self._repo[order_id] = o  # 1) save (commit)
        self._bus.publish(o.pull_events())  # 2) THEN dispatch committed facts


def fail_sms(e: OrderPaid) -> None:
    raise RuntimeError("SMS gateway down")


bus = EventBus()
counter = iter(range(1, 1000))
bus.subscribe(OrderPlaced, lambda e: print(f"  inventory: reserve stock for {e.order_id}"))
bus.subscribe(OrderPlaced, lambda e: print(f"  email: confirmation to {e.customer_id}"))
bus.subscribe(OrderPaid, lambda e: print(f"  loyalty: +{e.amount_paise // 10_000} points"))
bus.subscribe(OrderPaid, fail_sms)
PlaceOrderService(bus, lambda: datetime.now(timezone.utc), lambda: f"evt-{next(counter)}").place_and_pay("o-7", "asha", 250_000)` },
          { lang: 'ts', code: `// Domain events recorded by the aggregate, dispatched AFTER save by the application service.
interface OrderPlaced { // a FACT, past tense
  readonly kind: "OrderPlaced";
  readonly eventId: string;
  readonly occurredAt: Date;
  readonly orderId: string;
  readonly customerId: string;
  readonly totalPaise: number;
}
interface OrderPaid {
  readonly kind: "OrderPaid";
  readonly eventId: string;
  readonly occurredAt: Date;
  readonly orderId: string;
  readonly amountPaise: number;
}
type DomainEvent = OrderPlaced | OrderPaid;

abstract class AggregateRoot {
  private pending: DomainEvent[] = [];
  protected record(e: DomainEvent): void { this.pending.push(e); }
  pullEvents(): DomainEvent[] { const out = this.pending; this.pending = []; return out; }
}

class Order extends AggregateRoot {
  private status = "NEW";
  constructor(private readonly id: string, private readonly customerId: string, private readonly total: number) { super(); }

  place(clock: () => Date, ids: () => string): void {
    if (this.status !== "NEW") throw new Error("already placed");
    this.status = "PLACED";
    this.record({ kind: "OrderPlaced", eventId: ids(), occurredAt: clock(), orderId: this.id, customerId: this.customerId, totalPaise: this.total });
  }
  pay(amount: number, clock: () => Date, ids: () => string): void {
    if (this.status !== "PLACED" || amount !== this.total) throw new Error("cannot pay");
    this.status = "PAID";
    this.record({ kind: "OrderPaid", eventId: ids(), occurredAt: clock(), orderId: this.id, amountPaise: amount });
  }
}

class EventBus { // in-process dispatcher, subscription by type
  private readonly handlers = new Map<DomainEvent["kind"], ((e: DomainEvent) => void)[]>();

  subscribe<K extends DomainEvent["kind"]>(kind: K, h: (e: Extract<DomainEvent, { kind: K }>) => void): void {
    const list = this.handlers.get(kind) ?? [];
    list.push((e) => h(e as Extract<DomainEvent, { kind: K }>));
    this.handlers.set(kind, list);
  }

  publish(events: DomainEvent[]): void {
    for (const e of events) {
      for (const h of this.handlers.get(e.kind) ?? []) {
        try {
          h(e); // one failing handler must not stop the others
        } catch (ex) {
          console.log(\`  handler failed for \${e.eventId}, will retry: \${(ex as Error).message}\`);
        }
      }
    }
  }
}

class PlaceOrderService {
  private readonly repo = new Map<string, Order>();
  constructor(private readonly bus: EventBus, private readonly clock: () => Date, private readonly ids: () => string) {}

  placeAndPay(orderId: string, customer: string, total: number): void {
    const o = new Order(orderId, customer, total);
    o.place(this.clock, this.ids);
    o.pay(total, this.clock, this.ids);
    this.repo.set(orderId, o); // 1) save (commit)
    this.bus.publish(o.pullEvents()); // 2) THEN dispatch committed facts
  }
}

const bus = new EventBus();
let seq = 0;
bus.subscribe("OrderPlaced", (e) => console.log(\`  inventory: reserve stock for \${e.orderId}\`));
bus.subscribe("OrderPlaced", (e) => console.log(\`  email: confirmation to \${e.customerId}\`));
bus.subscribe("OrderPaid", (e) => console.log(\`  loyalty: +\${Math.floor(e.amountPaise / 10_000)} points\`));
bus.subscribe("OrderPaid", () => { throw new Error("SMS gateway down"); });
new PlaceOrderService(bus, () => new Date(), () => \`evt-\${++seq}\`).placeAndPay("o-7", "asha", 250_000);` },
          { lang: 'cpp', code: `// Domain events recorded by the aggregate, dispatched AFTER save by the application service.
struct OrderPlaced {  // a FACT, past tense
    string eventId;
    long long occurredAt;
    string orderId, customerId;
    long long totalPaise;
};
struct OrderPaid {
    string eventId;
    long long occurredAt;
    string orderId;
    long long amountPaise;
};
using DomainEvent = variant<OrderPlaced, OrderPaid>;

string eventId(const DomainEvent& e) {
    return visit([](const auto& ev) { return ev.eventId; }, e);
}

class AggregateRoot {
    vector<DomainEvent> pending_;

protected:
    void record(DomainEvent e) { pending_.push_back(move(e)); }

public:
    virtual ~AggregateRoot() = default;
    vector<DomainEvent> pullEvents() { return exchange(pending_, {}); }
};

class Order : public AggregateRoot {
    string id_, customerId_;
    long long total_;
    string status_ = "NEW";

public:
    Order(string id, string customerId, long long total) : id_(move(id)), customerId_(move(customerId)), total_(total) {}

    void place(const function<long long()>& clock, const function<string()>& ids) {
        if (status_ != "NEW") throw runtime_error("already placed");
        status_ = "PLACED";
        record(OrderPlaced{ids(), clock(), id_, customerId_, total_});
    }
    void pay(long long amount, const function<long long()>& clock, const function<string()>& ids) {
        if (status_ != "PLACED" || amount != total_) throw runtime_error("cannot pay");
        status_ = "PAID";
        record(OrderPaid{ids(), clock(), id_, amount});
    }
};

class EventBus {  // in-process dispatcher, subscription by type
    map<size_t, vector<function<void(const DomainEvent&)>>> handlers_;  // key: the variant alternative's index

    template <class E, size_t I = 0>
    static constexpr size_t indexOf() {
        if constexpr (is_same_v<E, variant_alternative_t<I, DomainEvent>>) return I;
        else return indexOf<E, I + 1>();
    }

public:
    template <class E>
    void subscribe(function<void(const E&)> h) {
        handlers_[indexOf<E>()].push_back([h](const DomainEvent& e) { h(get<E>(e)); });
    }
    void publish(const vector<DomainEvent>& events) {
        for (const auto& e : events) {
            auto it = handlers_.find(e.index());
            if (it == handlers_.end()) continue;
            for (const auto& h : it->second) {
                try {
                    h(e);  // one failing handler must not stop the others
                } catch (const exception& ex) {
                    cout << "  handler failed for " << eventId(e) << ", will retry: " << ex.what() << "\\n";
                }
            }
        }
    }
};

class PlaceOrderService {
    map<string, Order> repo_;
    EventBus& bus_;
    function<long long()> clock_;
    function<string()> ids_;

public:
    PlaceOrderService(EventBus& bus, function<long long()> clock, function<string()> ids)
        : bus_(bus), clock_(move(clock)), ids_(move(ids)) {}

    void placeAndPay(const string& orderId, const string& customer, long long total) {
        Order o(orderId, customer, total);
        o.place(clock_, ids_);
        o.pay(total, clock_, ids_);
        auto events = o.pullEvents();
        repo_.insert_or_assign(orderId, move(o));  // 1) save (commit)
        bus_.publish(events);                      // 2) THEN dispatch committed facts
    }
};

int main() {
    EventBus bus;
    int seq = 0;
    bus.subscribe<OrderPlaced>([](const OrderPlaced& e) { cout << "  inventory: reserve stock for " << e.orderId << "\\n"; });
    bus.subscribe<OrderPlaced>([](const OrderPlaced& e) { cout << "  email: confirmation to " << e.customerId << "\\n"; });
    bus.subscribe<OrderPaid>([](const OrderPaid& e) { cout << "  loyalty: +" << e.amountPaise / 10'000 << " points\\n"; });
    bus.subscribe<OrderPaid>([](const OrderPaid&) { throw runtime_error("SMS gateway down"); });
    PlaceOrderService(bus, [] { return time(nullptr); }, [&seq] { return "evt-" + to_string(++seq); }).placeAndPay("o-7", "asha", 250'000);
}` }
        ] }, { lang: 'java', code: `// Transactional OUTBOX + relay + idempotent consumer, simulated in memory.
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
        System.out.println("outbox: " + db.outbox.stream().map(r -> r.eventId() + " " + r.type() + " sent=" + r.sent()).toList());
    }
}`, alt: [
          { lang: 'python', code: `# Transactional OUTBOX + relay + idempotent consumer, simulated in memory.
import threading
from dataclasses import dataclass
from typing import Callable


@dataclass(frozen=True)
class OutboxRow:
    event_id: str
    type: str
    payload: str
    sent: bool


class Database:  # pretend this is one SQL database
    def __init__(self) -> None:
        self.orders: dict[str, str] = {}
        self.outbox: list[OutboxRow] = []
        self._lock = threading.Lock()

    def in_transaction(self, work: Callable[[], None]) -> None:  # a real DB gives atomicity here
        with self._lock:
            work()


class Broker:  # pretend Kafka topic
    def __init__(self) -> None:
        self.topic: list[OutboxRow] = []

    def publish(self, r: OutboxRow) -> None:
        self.topic.append(r)


class OutboxRelay:
    def __init__(self, db: Database, broker: Broker) -> None:
        self._db, self._broker = db, broker

    def poll_once(self, crash_before_marking: bool) -> None:
        for i, r in enumerate(self._db.outbox):
            if r.sent:
                continue
            self._broker.publish(r)  # step 1: publish
            if crash_before_marking:
                return  # simulated crash: row NOT marked -> will be re-sent
            self._db.outbox[i] = OutboxRow(r.event_id, r.type, r.payload, True)  # step 2: mark sent


class LoyaltyConsumer:  # idempotent: remembers processed event ids
    def __init__(self) -> None:
        self._processed: set[str] = set()
        self.points = 0

    def on_message(self, r: OutboxRow) -> None:
        if r.event_id in self._processed:
            print(f"duplicate {r.event_id} ignored")
            return
        self._processed.add(r.event_id)
        self.points += 10
        print(f"processed {r.event_id}, points = {self.points}")


db, broker = Database(), Broker()


def place_order() -> None:  # aggregate row + event row: both or neither
    db.orders["o-1"] = "PLACED"
    db.outbox.append(OutboxRow("evt-1", "OrderPlaced", "{orderId:o-1}", False))


db.in_transaction(place_order)
relay = OutboxRelay(db, broker)
relay.poll_once(True)  # publishes evt-1, then "crashes"
relay.poll_once(False)  # restart: publishes evt-1 AGAIN, marks it sent
loyalty = LoyaltyConsumer()
for message in broker.topic:  # at-least-once delivery, effectively-once effect
    loyalty.on_message(message)
print("outbox: [" + ", ".join(f"{r.event_id} {r.type} sent={str(r.sent).lower()}" for r in db.outbox) + "]")` },
          { lang: 'ts', code: `// Transactional OUTBOX + relay + idempotent consumer, simulated in memory.
interface OutboxRow { readonly eventId: string; readonly type: string; readonly payload: string; readonly sent: boolean; }

class Database { // pretend this is one SQL database
  readonly orders = new Map<string, string>();
  readonly outbox: OutboxRow[] = [];
  inTransaction(work: () => void): void { work(); } // a real DB gives atomicity here
}

class Broker { // pretend Kafka topic
  readonly topic: OutboxRow[] = [];
  publish(r: OutboxRow): void { this.topic.push(r); }
}

class OutboxRelay {
  constructor(private readonly db: Database, private readonly broker: Broker) {}

  pollOnce(crashBeforeMarking: boolean): void {
    for (let i = 0; i < this.db.outbox.length; i++) {
      const r = this.db.outbox[i];
      if (r.sent) continue;
      this.broker.publish(r); // step 1: publish
      if (crashBeforeMarking) return; // simulated crash: row NOT marked -> will be re-sent
      this.db.outbox[i] = { ...r, sent: true }; // step 2: mark sent
    }
  }
}

class LoyaltyConsumer { // idempotent: remembers processed event ids
  private readonly processed = new Set<string>();
  points = 0;

  onMessage(r: OutboxRow): void {
    if (this.processed.has(r.eventId)) { console.log(\`duplicate \${r.eventId} ignored\`); return; }
    this.processed.add(r.eventId);
    this.points += 10;
    console.log(\`processed \${r.eventId}, points = \${this.points}\`);
  }
}

const db = new Database();
const broker = new Broker();
db.inTransaction(() => { // aggregate row + event row: both or neither
  db.orders.set("o-1", "PLACED");
  db.outbox.push({ eventId: "evt-1", type: "OrderPlaced", payload: "{orderId:o-1}", sent: false });
});
const relay = new OutboxRelay(db, broker);
relay.pollOnce(true); // publishes evt-1, then "crashes"
relay.pollOnce(false); // restart: publishes evt-1 AGAIN, marks it sent
const loyalty = new LoyaltyConsumer();
broker.topic.forEach((m) => loyalty.onMessage(m)); // at-least-once delivery, effectively-once effect
console.log("outbox: [" + db.outbox.map((r) => \`\${r.eventId} \${r.type} sent=\${r.sent}\`).join(", ") + "]");` },
          { lang: 'cpp', code: `// Transactional OUTBOX + relay + idempotent consumer, simulated in memory.
struct OutboxRow {
    string eventId, type, payload;
    bool sent;
};

class Database {  // pretend this is one SQL database
    mutex m_;

public:
    map<string, string> orders;
    vector<OutboxRow> outbox;
    void inTransaction(const function<void()>& work) {  // a real DB gives atomicity here
        lock_guard<mutex> lock(m_);
        work();
    }
};

struct Broker {  // pretend Kafka topic
    vector<OutboxRow> topic;
    void publish(const OutboxRow& r) { topic.push_back(r); }
};

class OutboxRelay {
    Database& db_;
    Broker& broker_;

public:
    OutboxRelay(Database& db, Broker& b) : db_(db), broker_(b) {}
    void pollOnce(bool crashBeforeMarking) {
        for (auto& r : db_.outbox) {
            if (r.sent) continue;
            broker_.publish(r);                 // step 1: publish
            if (crashBeforeMarking) return;     // simulated crash: row NOT marked -> will be re-sent
            r.sent = true;                      // step 2: mark sent
        }
    }
};

class LoyaltyConsumer {  // idempotent: remembers processed event ids
    set<string> processed_;

public:
    int points = 0;
    void onMessage(const OutboxRow& r) {
        if (!processed_.insert(r.eventId).second) { cout << "duplicate " << r.eventId << " ignored\\n"; return; }
        points += 10;
        cout << "processed " << r.eventId << ", points = " << points << "\\n";
    }
};

int main() {
    Database db;
    Broker broker;
    db.inTransaction([&] {  // aggregate row + event row: both or neither
        db.orders["o-1"] = "PLACED";
        db.outbox.push_back({"evt-1", "OrderPlaced", "{orderId:o-1}", false});
    });
    OutboxRelay relay(db, broker);
    relay.pollOnce(true);   // publishes evt-1, then "crashes"
    relay.pollOnce(false);  // restart: publishes evt-1 AGAIN, marks it sent
    LoyaltyConsumer loyalty;
    for (const auto& m : broker.topic) loyalty.onMessage(m);  // at-least-once delivery, effectively-once effect
    string rows;
    for (const auto& r : db.outbox) rows += (rows.empty() ? "" : ", ") + r.eventId + " " + r.type + " sent=" + (r.sent ? "true" : "false");
    cout << "outbox: [" << rows << "]\\n";
}` }
        ] }],
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
}`, alt: [
          { lang: 'python', code: `class PointsHandler:
    def __init__(self) -> None:
        self._seen: set[str] = set()
        self._points: dict[str, int] = {}

    def on(self, event_id: str, customer: str, earned: int) -> None:
        if event_id in self._seen:  # already applied: do nothing
            return
        self._seen.add(event_id)
        self._points[customer] = self._points.get(customer, 0) + earned` },
          { lang: 'ts', code: `class PointsHandler {
  private readonly seen = new Set<string>();
  private readonly points = new Map<string, number>();

  on(eventId: string, customer: string, earned: number): void {
    if (this.seen.has(eventId)) return; // already applied: do nothing
    this.seen.add(eventId);
    this.points.set(customer, (this.points.get(customer) ?? 0) + earned);
  }
}` },
          { lang: 'cpp', code: `class PointsHandler {
    set<string> seen_;
    map<string, int> points_;

public:
    void on(const string& eventId, const string& customer, int earned) {
        if (!seen_.insert(eventId).second) return;  // already applied: do nothing
        points_[customer] += earned;
    }
};` }
        ] },
      { title: 'Events vs commands', html: `${H.table(['', 'Command', 'Event'], [['Tense', 'imperative: <code>PlaceOrder</code>', 'past: <code>OrderPlaced</code>'], ['Can be rejected?', 'yes', 'no — it already happened'], ['Receivers', 'exactly one handler', 'zero to many subscribers'], ['Coupling', 'sender knows the receiver', 'publisher does not know subscribers']])}` }
    ],
    deepDive: `<p><b>When to dispatch.</b> Three styles: (1) <b>immediately inside the aggregate</b> via a static <code>DomainEvents.raise()</code> — simple but fires before commit and hides a global; (2) <b>collect and dispatch after save</b> (our style; Spring Data's <code>@DomainEvents</code>/<code>AbstractAggregateRoot</code> does this, and <code>@TransactionalEventListener(phase = AFTER_COMMIT)</code> runs handlers after commit); (3) <b>outbox</b> for anything crossing a process boundary. In-process after-commit handlers still lose events if the process dies between commit and dispatch — only the outbox is durable.</p>
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
      brute: { why: `<p><code>LoanService.returnBook</code> updates the loan, computes the fine, updates the member, pops the reservation queue and sends the notification in one method and one transaction. Any failure (notification server down) rolls back the <i>return itself</i>, so the book shows as still borrowed. Retrying charges the fine twice.</p>`, code: { lang: 'java', code: `class LoanServiceBrute {
    final Map<String, Integer> fines = new HashMap<>();
    final Map<String, Deque<String>> queues = new HashMap<>();
    void returnBook(String member, String book, int lateDays) {
        fines.merge(member, lateDays * 10, Integer::sum);          // not idempotent: retry = double fine
        Deque<String> q = queues.getOrDefault(book, new ArrayDeque<>());
        if (!q.isEmpty()) System.out.println("notify " + q.poll());  // if this throws, the whole return fails
    }
}`, alt: [{ lang: 'python', code: "from collections import deque\n\nclass LoanServiceBrute:\n    def __init__(self):\n        self.fines = {}\n        self.queues = {}\n\n    def return_book(self, member, book, late_days):\n        self.fines[member] = self.fines.get(member, 0) + late_days * 10   # not idempotent: retry = double fine\n        q = self.queues.get(book, deque())\n        if q: print(\"notify\", q.popleft())                               # if this raises, the whole return fails\n" }, { lang: 'ts', code: "class LoanServiceBrute {\n  fines = new Map<string, number>();\n  queues = new Map<string, string[]>();\n  returnBook(member: string, book: string, lateDays: number): void {\n    this.fines.set(member, (this.fines.get(member) ?? 0) + lateDays * 10);   // not idempotent: retry = double fine\n    const q = this.queues.get(book) ?? [];\n    if (q.length > 0) console.log(\"notify \" + q.shift());                   // if this throws, the whole return fails\n  }\n}\n" }, { lang: 'cpp', code: "class LoanServiceBrute {\npublic:\n    unordered_map<string, int> fines;\n    unordered_map<string, deque<string>> queues;\n    void returnBook(const string& member, const string& book, int lateDays) {\n        fines[member] += lateDays * 10;                                      // not idempotent: retry = double fine\n        auto& q = queues[book];\n        if (!q.empty()) { cout << \"notify \" << q.front() << endl; q.pop_front(); }   // if this throws, the whole return fails\n    }\n};\n" }] } },
      mcq: { q: 'The notification service is down when a book is returned. What should happen?', options: ['The return is committed; the BookReturned handler for reservations retries later', 'The return is rolled back so everything stays consistent', 'The fine is cancelled', 'The librarian must retry the return manually'], answer: 0, explain: 'The return is a fact that already happened in the real world. Side effects in other aggregates are eventually consistent and retried; they must not undo the fact.' },
      hints: [`<p>Hint 1: <code>Loan.returnBook(LocalDate today)</code> computes late days inside the aggregate and records <code>BookReturned</code> with everything handlers need.</p>`, `<p>Hint 2: Each handler keeps a <code>Set&lt;String&gt;</code> of processed event IDs (in production, a table with a unique key written in the same transaction).</p>`, `<p>Hint 3: Dispatcher = a list of handlers (functions); wrap each handler call in try/catch and keep failed deliveries in a retry list.</p>`],
      tests: { io: true, cases: [{ stdin: '', stdout: "delivery 1: handler failed: db down\nfines {asha=30}, holds [ravi holds b1 until 2026-03-06]\nqueue b1: [meera]\nalready returned\nfines {asha=30}, holds 1\n" }] },
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
    final Map<String, Long> fines = new TreeMap<>(); private final Set<String> done = new HashSet<>();
    void on(BookReturned e) {
        if (!done.add(e.eventId())) return;                 // idempotent
        if (e.lateDays() > 0) fines.merge(e.member(), e.lateDays() * 10, Long::sum);
    }
}
class ReservationHandler {                                 // updates the ReservationQueue aggregate
    final Map<String, Deque<String>> queues = new TreeMap<>(); final List<String> holds = new ArrayList<>();
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
        LocalDate today = LocalDate.now(clock);
        FineHandler fines = new FineHandler(); ReservationHandler res = new ReservationHandler(clock);
        res.queues.put("b1", new ArrayDeque<>(List.of("ravi", "meera")));
        int[] calls = {0};
        Consumer<BookReturned> flakyReservations = e -> {          // fails on its first delivery only
            if (calls[0]++ == 0) throw new IllegalStateException("db down");
            res.on(e);
        };
        List<Consumer<BookReturned>> subscribers = List.of(fines::on, flakyReservations);

        Loan loan = new Loan("L1", "asha", "b1", LocalDate.of(2026, 3, 1));
        loan.returnBook(today, "e1");
        List<BookReturned> committed = loan.pullEvents();   // (save loan here, then dispatch)
        for (int delivery = 1; delivery <= 2; delivery++)    // at-least-once: same event delivered twice
            for (BookReturned e : committed) for (Consumer<BookReturned> s : subscribers) {
                try { s.accept(e); }
                catch (RuntimeException ex) { System.out.println("delivery " + delivery + ": handler failed: " + ex.getMessage()); }
            }
        System.out.println("fines " + fines.fines + ", holds " + res.holds);
        System.out.println("queue b1: " + res.queues.get("b1"));

        try { loan.returnBook(today, "e2"); } catch (IllegalStateException e) { System.out.println(e.getMessage()); }
        Loan early = new Loan("L2", "ravi", "b2", LocalDate.of(2026, 3, 10));
        early.returnBook(today, "e3");                        // returned before the due date: no fine
        for (BookReturned e : early.pullEvents()) for (Consumer<BookReturned> s : subscribers) s.accept(e);
        System.out.println("fines " + fines.fines + ", holds " + res.holds.size());
    }
}`,
        alt: [
          { lang: 'python', code: `from collections import deque
from dataclasses import dataclass
from datetime import date, timedelta
from typing import Callable


@dataclass(frozen=True)
class BookReturned:  # a past-tense fact
    event_id: str
    loan_id: str
    member: str
    book: str
    late_days: int


class Loan:  # aggregate: records the event, never calls other aggregates
    def __init__(self, loan_id: str, member: str, book: str, due: date) -> None:
        self._id, self._member, self._book, self._due = loan_id, member, book, due
        self._returned = False
        self._events: list[BookReturned] = []

    def return_book(self, today: date, event_id: str) -> None:
        if self._returned:
            raise RuntimeError("already returned")
        self._returned = True
        late = max(0, (today - self._due).days)
        self._events.append(BookReturned(event_id, self._id, self._member, self._book, late))

    def pull_events(self) -> list[BookReturned]:
        events, self._events = self._events, []
        return events


class FineHandler:  # updates the FineAccount aggregate
    def __init__(self) -> None:
        self.fines: dict[str, int] = {}
        self._done: set[str] = set()

    def on(self, e: BookReturned) -> None:
        if e.event_id in self._done:  # idempotent
            return
        self._done.add(e.event_id)
        if e.late_days > 0:
            self.fines[e.member] = self.fines.get(e.member, 0) + e.late_days * 10


class ReservationHandler:  # updates the ReservationQueue aggregate
    def __init__(self, clock: Callable[[], date]) -> None:
        self.queues: dict[str, deque[str]] = {}
        self.holds: list[str] = []
        self._done: set[str] = set()
        self._clock = clock

    def on(self, e: BookReturned) -> None:
        if e.event_id in self._done:
            return
        q = self.queues.get(e.book)
        if q:
            until = self._clock() + timedelta(days=2)
            self.holds.append(f"{q.popleft()} holds {e.book} until {until.isoformat()}")
        self._done.add(e.event_id)  # mark only after success


def fmt_fines(fines: dict[str, int]) -> str:
    return "{" + ", ".join(f"{k}={v}" for k, v in sorted(fines.items())) + "}"


def fmt_list(items) -> str:
    return "[" + ", ".join(items) + "]"


today = date(2026, 3, 4)
fines = FineHandler()
res = ReservationHandler(lambda: today)
res.queues["b1"] = deque(["ravi", "meera"])
calls = 0


def flaky_reservations(e: BookReturned) -> None:  # fails on its first delivery only
    global calls
    calls += 1
    if calls == 1:
        raise RuntimeError("db down")
    res.on(e)


subscribers: list[Callable[[BookReturned], None]] = [fines.on, flaky_reservations]

loan = Loan("L1", "asha", "b1", date(2026, 3, 1))
loan.return_book(today, "e1")
committed = loan.pull_events()  # (save loan here, then dispatch)
for delivery in (1, 2):  # at-least-once: same event delivered twice
    for event in committed:
        for sub in subscribers:
            try:
                sub(event)
            except RuntimeError as ex:
                print(f"delivery {delivery}: handler failed: {ex}")
print(f"fines {fmt_fines(fines.fines)}, holds {fmt_list(res.holds)}")
print(f"queue b1: {fmt_list(res.queues['b1'])}")

try:
    loan.return_book(today, "e2")
except RuntimeError as ex:
    print(ex)
early = Loan("L2", "ravi", "b2", date(2026, 3, 10))
early.return_book(today, "e3")  # returned before the due date: no fine
for event in early.pull_events():
    for sub in subscribers:
        sub(event)
print(f"fines {fmt_fines(fines.fines)}, holds {len(res.holds)}")` },
          { lang: 'ts', code: `interface BookReturned { // a past-tense fact
  readonly eventId: string;
  readonly loanId: string;
  readonly member: string;
  readonly book: string;
  readonly lateDays: number;
}

const DAY_MS = 86_400_000;
const isoDate = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

class Loan { // aggregate: records the event, never calls other aggregates
  private returned = false;
  private events: BookReturned[] = [];

  constructor(
    private readonly id: string,
    private readonly member: string,
    private readonly book: string,
    private readonly dueMs: number,
  ) {}

  returnBook(todayMs: number, eventId: string): void {
    if (this.returned) throw new Error("already returned");
    this.returned = true;
    const late = Math.max(0, Math.round((todayMs - this.dueMs) / DAY_MS));
    this.events.push({ eventId, loanId: this.id, member: this.member, book: this.book, lateDays: late });
  }

  pullEvents(): BookReturned[] {
    const out = this.events;
    this.events = [];
    return out;
  }
}

class FineHandler { // updates the FineAccount aggregate
  readonly fines = new Map<string, number>();
  private readonly done = new Set<string>();

  on(e: BookReturned): void {
    if (this.done.has(e.eventId)) return; // idempotent
    this.done.add(e.eventId);
    if (e.lateDays > 0) this.fines.set(e.member, (this.fines.get(e.member) ?? 0) + e.lateDays * 10);
  }
}

class ReservationHandler { // updates the ReservationQueue aggregate
  readonly queues = new Map<string, string[]>();
  readonly holds: string[] = [];
  private readonly done = new Set<string>();

  constructor(private readonly clock: () => number) {}

  on(e: BookReturned): void {
    if (this.done.has(e.eventId)) return;
    const q = this.queues.get(e.book) ?? [];
    const next = q.shift();
    if (next !== undefined) this.holds.push(\`\${next} holds \${e.book} until \${isoDate(this.clock() + 2 * DAY_MS)}\`);
    this.done.add(e.eventId); // mark only after success
  }
}

const fmtFines = (m: Map<string, number>): string =>
  "{" + [...m.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([k, v]) => \`\${k}=\${v}\`).join(", ") + "}";
const fmtList = (items: string[]): string => "[" + items.join(", ") + "]";

const today = Date.UTC(2026, 2, 4);
const fines = new FineHandler();
const res = new ReservationHandler(() => today);
res.queues.set("b1", ["ravi", "meera"]);
let calls = 0;
const flakyReservations = (e: BookReturned): void => { // fails on its first delivery only
  if (calls++ === 0) throw new Error("db down");
  res.on(e);
};
const subscribers: ((e: BookReturned) => void)[] = [(e) => fines.on(e), flakyReservations];

const loan = new Loan("L1", "asha", "b1", Date.UTC(2026, 2, 1));
loan.returnBook(today, "e1");
const committed = loan.pullEvents(); // (save loan here, then dispatch)
for (const delivery of [1, 2]) { // at-least-once: same event delivered twice
  for (const event of committed) {
    for (const sub of subscribers) {
      try { sub(event); } catch (ex) { console.log(\`delivery \${delivery}: handler failed: \${(ex as Error).message}\`); }
    }
  }
}
console.log(\`fines \${fmtFines(fines.fines)}, holds \${fmtList(res.holds)}\`);
console.log(\`queue b1: \${fmtList(res.queues.get("b1") ?? [])}\`);

try { loan.returnBook(today, "e2"); } catch (ex) { console.log((ex as Error).message); }
const early = new Loan("L2", "ravi", "b2", Date.UTC(2026, 2, 10));
early.returnBook(today, "e3"); // returned before the due date: no fine
for (const event of early.pullEvents()) for (const sub of subscribers) sub(event);
console.log(\`fines \${fmtFines(fines.fines)}, holds \${res.holds.length}\`);` },
          { lang: 'cpp', code: `// Dates are day numbers since 1970-01-01 (Howard Hinnant's civil-date algorithms).
long long daysFromCivil(int y, int m, int d) {
    y -= m <= 2;
    long long era = (y >= 0 ? y : y - 399) / 400;
    long long yoe = y - era * 400;
    long long doy = (153 * (m + (m > 2 ? -3 : 9)) + 2) / 5 + d - 1;
    long long doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    return era * 146097 + doe - 719468;
}

string isoDate(long long z) {
    z += 719468;
    long long era = (z >= 0 ? z : z - 146096) / 146097;
    long long doe = z - era * 146097;
    long long yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    long long doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    long long mp = (5 * doy + 2) / 153;
    int d = static_cast<int>(doy - (153 * mp + 2) / 5 + 1);
    int m = static_cast<int>(mp < 10 ? mp + 3 : mp - 9);
    long long y = yoe + era * 400 + (m <= 2);
    char buf[16];
    snprintf(buf, sizeof buf, "%04lld-%02d-%02d", y, m, d);
    return buf;
}

struct BookReturned {  // a past-tense fact
    string eventId, loanId, member, book;
    long long lateDays;
};

class Loan {  // aggregate: records the event, never calls other aggregates
    string id_, member_, book_;
    long long due_;
    bool returned_ = false;
    vector<BookReturned> events_;

public:
    Loan(string id, string member, string book, long long due)
        : id_(move(id)), member_(move(member)), book_(move(book)), due_(due) {}

    void returnBook(long long today, const string& eventId) {
        if (returned_) throw runtime_error("already returned");
        returned_ = true;
        events_.push_back({eventId, id_, member_, book_, max(0LL, today - due_)});
    }
    vector<BookReturned> pullEvents() { return exchange(events_, {}); }
};

class FineHandler {  // updates the FineAccount aggregate
    set<string> done_;

public:
    map<string, long long> fines;
    void on(const BookReturned& e) {
        if (!done_.insert(e.eventId).second) return;  // idempotent
        if (e.lateDays > 0) fines[e.member] += e.lateDays * 10;
    }
};

class ReservationHandler {  // updates the ReservationQueue aggregate
    set<string> done_;
    function<long long()> clock_;

public:
    map<string, deque<string>> queues;
    vector<string> holds;
    explicit ReservationHandler(function<long long()> clock) : clock_(move(clock)) {}

    void on(const BookReturned& e) {
        if (done_.count(e.eventId)) return;
        auto& q = queues[e.book];
        if (!q.empty()) {
            holds.push_back(q.front() + " holds " + e.book + " until " + isoDate(clock_() + 2));
            q.pop_front();
        }
        done_.insert(e.eventId);  // mark only after success
    }
};

string fmtFines(const map<string, long long>& m) {  // std::map is already sorted by key
    string out = "{";
    for (const auto& [k, v] : m) out += (out.size() > 1 ? ", " : "") + k + "=" + to_string(v);
    return out + "}";
}

template <class Range>
string fmtList(const Range& items) {
    string out = "[";
    for (const auto& s : items) out += (out.size() > 1 ? ", " : "") + s;
    return out + "]";
}

int main() {
    const long long today = daysFromCivil(2026, 3, 4);
    FineHandler fines;
    ReservationHandler res([=] { return today; });
    res.queues["b1"] = deque<string>{"ravi", "meera"};
    int calls = 0;
    auto flakyReservations = [&](const BookReturned& e) {  // fails on its first delivery only
        if (calls++ == 0) throw runtime_error("db down");
        res.on(e);
    };
    vector<function<void(const BookReturned&)>> subscribers = {
        [&](const BookReturned& e) { fines.on(e); }, flakyReservations};

    Loan loan("L1", "asha", "b1", daysFromCivil(2026, 3, 1));
    loan.returnBook(today, "e1");
    vector<BookReturned> committed = loan.pullEvents();  // (save loan here, then dispatch)
    for (int delivery = 1; delivery <= 2; delivery++)    // at-least-once: same event delivered twice
        for (const auto& e : committed)
            for (const auto& s : subscribers) {
                try {
                    s(e);
                } catch (const runtime_error& ex) {
                    cout << "delivery " << delivery << ": handler failed: " << ex.what() << "\\n";
                }
            }
    cout << "fines " << fmtFines(fines.fines) << ", holds " << fmtList(res.holds) << "\\n";
    cout << "queue b1: " << fmtList(res.queues["b1"]) << "\\n";

    try {
        loan.returnBook(today, "e2");
    } catch (const runtime_error& ex) {
        cout << ex.what() << "\\n";
    }
    Loan early("L2", "ravi", "b2", daysFromCivil(2026, 3, 10));
    early.returnBook(today, "e3");  // returned before the due date: no fine
    for (const auto& e : early.pullEvents())
        for (const auto& s : subscribers) s(e);
    cout << "fines " << fmtFines(fines.fines) << ", holds " << res.holds.size() << "\\n";
}` }
        ],
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
    code: [{ lang: 'java', code: `// Event-sourced BankAccount: decide (validate) vs apply (evolve), event store with expected version.
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
    static String describe(AccountEvent e) {
        return switch (e) {
            case Opened o -> "Opened " + o.owner();
            case Deposited d -> "Deposited " + d.amount();
            case Withdrew w -> "Withdrew " + w.amount();
            case Frozen f -> "Frozen " + f.reason();
        };
    }

    public static void main(String[] args) {
        EventStore store = new EventStore();
        BankAccount a = BankAccount.rehydrate("acc-42", store.read("acc-42"));
        a.open("asha"); a.deposit(100); a.withdraw(30); a.deposit(50);
        a.saveTo(store);
        System.out.println("log: " + store.read("acc-42").stream().map(BankAccount::describe).toList());

        BankAccount again = BankAccount.rehydrate("acc-42", store.read("acc-42"));     // fresh process, same state
        System.out.println("rebuilt balance " + again.balance() + " at v" + again.version()); // 120 at v4
        try { again.withdraw(500); } catch (IllegalStateException e) { System.out.println("rejected: " + e.getMessage()); }

        BankAccount tab1 = BankAccount.rehydrate("acc-42", store.read("acc-42"));
        BankAccount tab2 = BankAccount.rehydrate("acc-42", store.read("acc-42"));
        tab1.withdraw(100); tab1.saveTo(store);
        tab2.withdraw(100);                                                          // based on stale v4
        try { tab2.saveTo(store); } catch (ConcurrencyException e) { System.out.println("conflict: " + e.getMessage()); }
    }
}`, alt: [
          { lang: 'python', code: `# Event-sourced BankAccount: decide (validate) vs apply (evolve), event store with expected version.
import threading
from dataclasses import dataclass
from typing import Union


@dataclass(frozen=True)
class Opened:
    owner: str


@dataclass(frozen=True)
class Deposited:
    amount: int


@dataclass(frozen=True)
class Withdrew:
    amount: int


@dataclass(frozen=True)
class Frozen:
    reason: str


AccountEvent = Union[Opened, Deposited, Withdrew, Frozen]


class ConcurrencyException(Exception):
    pass


class EventStore:  # append-only, one stream per aggregate
    def __init__(self) -> None:
        self._streams: dict[str, list[AccountEvent]] = {}
        self._lock = threading.Lock()

    def read(self, stream_id: str) -> list[AccountEvent]:
        with self._lock:
            return list(self._streams.get(stream_id, []))

    def append(self, stream_id: str, expected_version: int, events: list[AccountEvent]) -> None:
        with self._lock:
            s = self._streams.setdefault(stream_id, [])
            if len(s) != expected_version:
                raise ConcurrencyException(f"{stream_id}: expected v{expected_version} but is v{len(s)}")
            s.extend(events)


class BankAccount:
    def __init__(self, account_id: str) -> None:
        self._id = account_id
        self._open = self._frozen = False
        self._balance = self._version = 0  # derived state
        self._uncommitted: list[AccountEvent] = []

    @staticmethod
    def rehydrate(account_id: str, history: list[AccountEvent]) -> "BankAccount":  # LOAD = replay
        a = BankAccount(account_id)
        for e in history:
            a._apply(e)
            a._version += 1
        return a

    # ---------- decide: rules live here; may throw; produces events ----------
    def open(self, owner: str) -> None:
        if self._open:
            raise RuntimeError("already open")
        self._raise(Opened(owner))

    def deposit(self, amt: int) -> None:
        self._require_open()
        if amt <= 0:
            raise ValueError("amount > 0")
        self._raise(Deposited(amt))

    def withdraw(self, amt: int) -> None:
        self._require_open()
        if self._frozen:
            raise RuntimeError("account frozen")
        if amt <= 0 or amt > self._balance:
            raise RuntimeError(f"insufficient funds: balance {self._balance}")
        self._raise(Withdrew(amt))

    def freeze(self, why: str) -> None:
        self._require_open()
        if not self._frozen:
            self._raise(Frozen(why))

    # ---------- apply: pure state change; never validates, never fails ----------
    def _apply(self, e: AccountEvent) -> None:
        match e:
            case Opened():
                self._open = True
            case Deposited(amount):
                self._balance += amount
            case Withdrew(amount):
                self._balance -= amount
            case Frozen():
                self._frozen = True

    def _raise(self, e: AccountEvent) -> None:
        self._apply(e)
        self._uncommitted.append(e)

    def _require_open(self) -> None:
        if not self._open:
            raise RuntimeError("not open")

    def save_to(self, store: EventStore) -> None:
        store.append(self._id, self._version, self._uncommitted)
        self._version += len(self._uncommitted)
        self._uncommitted = []

    @property
    def balance(self) -> int:
        return self._balance

    @property
    def version(self) -> int:
        return self._version

    @staticmethod
    def describe(e: AccountEvent) -> str:
        match e:
            case Opened(owner):
                return f"Opened {owner}"
            case Deposited(amount):
                return f"Deposited {amount}"
            case Withdrew(amount):
                return f"Withdrew {amount}"
            case Frozen(reason):
                return f"Frozen {reason}"


store = EventStore()
a = BankAccount.rehydrate("acc-42", store.read("acc-42"))
a.open("asha")
a.deposit(100)
a.withdraw(30)
a.deposit(50)
a.save_to(store)
print("log: [" + ", ".join(BankAccount.describe(e) for e in store.read("acc-42")) + "]")

again = BankAccount.rehydrate("acc-42", store.read("acc-42"))  # fresh process, same state
print(f"rebuilt balance {again.balance} at v{again.version}")  # 120 at v4
try:
    again.withdraw(500)
except RuntimeError as e:
    print(f"rejected: {e}")

tab1 = BankAccount.rehydrate("acc-42", store.read("acc-42"))
tab2 = BankAccount.rehydrate("acc-42", store.read("acc-42"))
tab1.withdraw(100)
tab1.save_to(store)
tab2.withdraw(100)  # based on stale v4
try:
    tab2.save_to(store)
except ConcurrencyException as e:
    print(f"conflict: {e}")` },
          { lang: 'ts', code: `// Event-sourced BankAccount: decide (validate) vs apply (evolve), event store with expected version.
type AccountEvent =
  | { readonly kind: "Opened"; readonly owner: string }
  | { readonly kind: "Deposited"; readonly amount: number }
  | { readonly kind: "Withdrew"; readonly amount: number }
  | { readonly kind: "Frozen"; readonly reason: string };

class ConcurrencyException extends Error {}

class EventStore { // append-only, one stream per aggregate
  private readonly streams = new Map<string, AccountEvent[]>();

  read(streamId: string): AccountEvent[] { return [...(this.streams.get(streamId) ?? [])]; }

  append(streamId: string, expectedVersion: number, events: AccountEvent[]): void {
    let s = this.streams.get(streamId);
    if (s === undefined) { s = []; this.streams.set(streamId, s); }
    if (s.length !== expectedVersion) throw new ConcurrencyException(\`\${streamId}: expected v\${expectedVersion} but is v\${s.length}\`);
    s.push(...events);
  }
}

class BankAccount {
  private isOpen = false;
  private isFrozen = false;
  private balanceValue = 0; // derived state
  private versionValue = 0;
  private uncommitted: AccountEvent[] = [];

  private constructor(private readonly id: string) {}

  static rehydrate(id: string, history: AccountEvent[]): BankAccount { // LOAD = replay
    const a = new BankAccount(id);
    for (const e of history) { a.apply(e); a.versionValue++; }
    return a;
  }

  // ---------- decide: rules live here; may throw; produces events ----------
  open(owner: string): void {
    if (this.isOpen) throw new Error("already open");
    this.raise({ kind: "Opened", owner });
  }
  deposit(amt: number): void {
    this.requireOpen();
    if (amt <= 0) throw new Error("amount > 0");
    this.raise({ kind: "Deposited", amount: amt });
  }
  withdraw(amt: number): void {
    this.requireOpen();
    if (this.isFrozen) throw new Error("account frozen");
    if (amt <= 0 || amt > this.balanceValue) throw new Error(\`insufficient funds: balance \${this.balanceValue}\`);
    this.raise({ kind: "Withdrew", amount: amt });
  }
  freeze(why: string): void {
    this.requireOpen();
    if (!this.isFrozen) this.raise({ kind: "Frozen", reason: why });
  }

  // ---------- apply: pure state change; never validates, never fails ----------
  private apply(e: AccountEvent): void {
    switch (e.kind) {
      case "Opened": this.isOpen = true; break;
      case "Deposited": this.balanceValue += e.amount; break;
      case "Withdrew": this.balanceValue -= e.amount; break;
      case "Frozen": this.isFrozen = true; break;
    }
  }
  private raise(e: AccountEvent): void { this.apply(e); this.uncommitted.push(e); }
  private requireOpen(): void { if (!this.isOpen) throw new Error("not open"); }

  saveTo(store: EventStore): void {
    store.append(this.id, this.versionValue, this.uncommitted);
    this.versionValue += this.uncommitted.length;
    this.uncommitted = [];
  }
  balance(): number { return this.balanceValue; }
  version(): number { return this.versionValue; }

  static describe(e: AccountEvent): string {
    switch (e.kind) {
      case "Opened": return \`Opened \${e.owner}\`;
      case "Deposited": return \`Deposited \${e.amount}\`;
      case "Withdrew": return \`Withdrew \${e.amount}\`;
      case "Frozen": return \`Frozen \${e.reason}\`;
    }
  }
}

const store = new EventStore();
const a = BankAccount.rehydrate("acc-42", store.read("acc-42"));
a.open("asha"); a.deposit(100); a.withdraw(30); a.deposit(50);
a.saveTo(store);
console.log("log: [" + store.read("acc-42").map(BankAccount.describe).join(", ") + "]");

const again = BankAccount.rehydrate("acc-42", store.read("acc-42")); // fresh process, same state
console.log(\`rebuilt balance \${again.balance()} at v\${again.version()}\`); // 120 at v4
try { again.withdraw(500); } catch (e) { console.log(\`rejected: \${(e as Error).message}\`); }

const tab1 = BankAccount.rehydrate("acc-42", store.read("acc-42"));
const tab2 = BankAccount.rehydrate("acc-42", store.read("acc-42"));
tab1.withdraw(100);
tab1.saveTo(store);
tab2.withdraw(100); // based on stale v4
try { tab2.saveTo(store); } catch (e) { if (e instanceof ConcurrencyException) console.log(\`conflict: \${e.message}\`); }` },
          { lang: 'cpp', code: `// Event-sourced BankAccount: decide (validate) vs apply (evolve), event store with expected version.
struct Opened { string owner; };
struct Deposited { long long amount; };
struct Withdrew { long long amount; };
struct Frozen { string reason; };
using AccountEvent = variant<Opened, Deposited, Withdrew, Frozen>;

template <class... Ts>
struct Overloaded : Ts... { using Ts::operator()...; };
template <class... Ts>
Overloaded(Ts...) -> Overloaded<Ts...>;

struct ConcurrencyException : runtime_error {
    using runtime_error::runtime_error;
};

class EventStore {  // append-only, one stream per aggregate
    map<string, vector<AccountEvent>> streams_;
    mutex m_;

public:
    vector<AccountEvent> read(const string& streamId) {
        lock_guard<mutex> lock(m_);
        return streams_[streamId];  // a copy
    }
    void append(const string& streamId, long long expectedVersion, const vector<AccountEvent>& events) {
        lock_guard<mutex> lock(m_);
        auto& s = streams_[streamId];
        if (static_cast<long long>(s.size()) != expectedVersion)
            throw ConcurrencyException(streamId + ": expected v" + to_string(expectedVersion) + " but is v" + to_string(s.size()));
        s.insert(s.end(), events.begin(), events.end());
    }
};

class BankAccount {
    string id_;
    bool open_ = false, frozen_ = false;
    long long balance_ = 0, version_ = 0;  // derived state
    vector<AccountEvent> uncommitted_;

    explicit BankAccount(string id) : id_(move(id)) {}

    // ---------- apply: pure state change; never validates, never fails ----------
    void apply(const AccountEvent& e) {
        visit(Overloaded{
            [&](const Opened&) { open_ = true; },
            [&](const Deposited& d) { balance_ += d.amount; },
            [&](const Withdrew& w) { balance_ -= w.amount; },
            [&](const Frozen&) { frozen_ = true; }}, e);
    }
    void raise(AccountEvent e) { apply(e); uncommitted_.push_back(move(e)); }
    void requireOpen() const { if (!open_) throw runtime_error("not open"); }

public:
    static BankAccount rehydrate(const string& id, const vector<AccountEvent>& history) {  // LOAD = replay
        BankAccount a(id);
        for (const auto& e : history) { a.apply(e); a.version_++; }
        return a;
    }

    // ---------- decide: rules live here; may throw; produces events ----------
    void open(const string& owner) {
        if (open_) throw runtime_error("already open");
        raise(Opened{owner});
    }
    void deposit(long long amt) {
        requireOpen();
        if (amt <= 0) throw invalid_argument("amount > 0");
        raise(Deposited{amt});
    }
    void withdraw(long long amt) {
        requireOpen();
        if (frozen_) throw runtime_error("account frozen");
        if (amt <= 0 || amt > balance_) throw runtime_error("insufficient funds: balance " + to_string(balance_));
        raise(Withdrew{amt});
    }
    void freeze(const string& why) {
        requireOpen();
        if (!frozen_) raise(Frozen{why});
    }

    void saveTo(EventStore& store) {
        store.append(id_, version_, uncommitted_);
        version_ += static_cast<long long>(uncommitted_.size());
        uncommitted_.clear();
    }
    long long balance() const { return balance_; }
    long long version() const { return version_; }

    static string describe(const AccountEvent& e) {
        return visit(Overloaded{
            [](const Opened& o) { return "Opened " + o.owner; },
            [](const Deposited& d) { return "Deposited " + to_string(d.amount); },
            [](const Withdrew& w) { return "Withdrew " + to_string(w.amount); },
            [](const Frozen& f) { return "Frozen " + f.reason; }}, e);
    }
};

int main() {
    EventStore store;
    BankAccount a = BankAccount::rehydrate("acc-42", store.read("acc-42"));
    a.open("asha"); a.deposit(100); a.withdraw(30); a.deposit(50);
    a.saveTo(store);
    string log;
    for (const auto& e : store.read("acc-42")) log += (log.empty() ? "" : ", ") + BankAccount::describe(e);
    cout << "log: [" << log << "]\\n";

    BankAccount again = BankAccount::rehydrate("acc-42", store.read("acc-42"));  // fresh process, same state
    cout << "rebuilt balance " << again.balance() << " at v" << again.version() << "\\n";  // 120 at v4
    try {
        again.withdraw(500);
    } catch (const runtime_error& e) {
        cout << "rejected: " << e.what() << "\\n";
    }

    BankAccount tab1 = BankAccount::rehydrate("acc-42", store.read("acc-42"));
    BankAccount tab2 = BankAccount::rehydrate("acc-42", store.read("acc-42"));
    tab1.withdraw(100);
    tab1.saveTo(store);
    tab2.withdraw(100);  // based on stale v4
    try {
        tab2.saveTo(store);
    } catch (const ConcurrencyException& e) {
        cout << "conflict: " << e.what() << "\\n";
    }
}` }
        ] }, { lang: 'java', code: `// Functional style (Java 21): state = fold(evolve, initial, events); decide returns events.
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
            case ItemAdded a -> { Map<String, Integer> m = new TreeMap<>(s.items()); m.merge(a.sku(), a.qty(), Integer::sum); yield new CartState(Map.copyOf(m), s.checkedOut()); }
            case ItemRemoved r -> { Map<String, Integer> m = new TreeMap<>(s.items()); m.remove(r.sku()); yield new CartState(Map.copyOf(m), s.checkedOut()); }
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
    static String show(CartState s) { return new TreeMap<>(s.items()) + " checkedOut=" + s.checkedOut(); }

    public static void main(String[] args) {
        List<CartEvent> log = new ArrayList<>(List.of(new ItemAdded("tea", 2), new ItemAdded("mug", 1), new ItemAdded("tea", 1), new ItemRemoved("mug")));
        CartState now = replay(log);
        System.out.println(show(now));                             // {tea=3} checkedOut=false
        log.addAll(checkout(now));
        System.out.println(show(replay(log)));                     // {tea=3} checkedOut=true
        System.out.println("as of event 2: " + show(replay(log.subList(0, 2))));   // time travel
        try { checkout(replay(log)); } catch (IllegalStateException e) { System.out.println(e.getMessage()); }
        try { checkout(CartState.EMPTY); } catch (IllegalStateException e) { System.out.println(e.getMessage()); }
    }
}`, alt: [
          { lang: 'python', code: `# Functional style: state = fold(evolve, initial, events); decide returns events.
from dataclasses import dataclass
from functools import reduce
from types import MappingProxyType
from typing import Mapping, Union


@dataclass(frozen=True)
class ItemAdded:
    sku: str
    qty: int


@dataclass(frozen=True)
class ItemRemoved:
    sku: str


@dataclass(frozen=True)
class CheckedOut:
    pass


CartEvent = Union[ItemAdded, ItemRemoved, CheckedOut]


@dataclass(frozen=True)
class CartState:
    items: Mapping[str, int]
    checked_out: bool


EMPTY = CartState(MappingProxyType({}), False)


def evolve(s: CartState, e: CartEvent) -> CartState:  # pure: (state, event) -> new state
    match e:
        case ItemAdded(sku, qty):
            m = dict(s.items)
            m[sku] = m.get(sku, 0) + qty
            return CartState(MappingProxyType(m), s.checked_out)
        case ItemRemoved(sku):
            m = dict(s.items)
            m.pop(sku, None)
            return CartState(MappingProxyType(m), s.checked_out)
        case CheckedOut():
            return CartState(s.items, True)


def replay(events: list[CartEvent]) -> CartState:
    return reduce(evolve, events, EMPTY)


def checkout(s: CartState) -> list[CartEvent]:  # decide: validates, returns new events
    if s.checked_out:
        raise RuntimeError("already checked out")
    if not s.items:
        raise RuntimeError("empty cart")
    return [CheckedOut()]


def show(s: CartState) -> str:
    return "{" + ", ".join(f"{k}={v}" for k, v in sorted(s.items.items())) + f"}} checkedOut={str(s.checked_out).lower()}"


log: list[CartEvent] = [ItemAdded("tea", 2), ItemAdded("mug", 1), ItemAdded("tea", 1), ItemRemoved("mug")]
now = replay(log)
print(show(now))  # {tea=3} checkedOut=false
log += checkout(now)
print(show(replay(log)))  # {tea=3} checkedOut=true
print("as of event 2:", show(replay(log[:2])))  # time travel
for state in (replay(log), EMPTY):
    try:
        checkout(state)
    except RuntimeError as e:
        print(e)` },
          { lang: 'ts', code: `// Functional style: state = fold(evolve, initial, events); decide returns events.
type CartEvent =
  | { readonly kind: "ItemAdded"; readonly sku: string; readonly qty: number }
  | { readonly kind: "ItemRemoved"; readonly sku: string }
  | { readonly kind: "CheckedOut" };

interface CartState { readonly items: ReadonlyMap<string, number>; readonly checkedOut: boolean; }

const EMPTY: CartState = { items: new Map(), checkedOut: false };

function evolve(s: CartState, e: CartEvent): CartState { // pure: (state, event) -> new state
  switch (e.kind) {
    case "ItemAdded": {
      const m = new Map(s.items);
      m.set(e.sku, (m.get(e.sku) ?? 0) + e.qty);
      return { items: m, checkedOut: s.checkedOut };
    }
    case "ItemRemoved": {
      const m = new Map(s.items);
      m.delete(e.sku);
      return { items: m, checkedOut: s.checkedOut };
    }
    case "CheckedOut":
      return { items: s.items, checkedOut: true };
  }
}

const replay = (events: readonly CartEvent[]): CartState => events.reduce(evolve, EMPTY);

function checkout(s: CartState): CartEvent[] { // decide: validates, returns new events
  if (s.checkedOut) throw new Error("already checked out");
  if (s.items.size === 0) throw new Error("empty cart");
  return [{ kind: "CheckedOut" }];
}

const show = (s: CartState): string =>
  "{" + [...s.items].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([k, v]) => \`\${k}=\${v}\`).join(", ") + \`} checkedOut=\${s.checkedOut}\`;

const log: CartEvent[] = [
  { kind: "ItemAdded", sku: "tea", qty: 2 }, { kind: "ItemAdded", sku: "mug", qty: 1 },
  { kind: "ItemAdded", sku: "tea", qty: 1 }, { kind: "ItemRemoved", sku: "mug" },
];
const now = replay(log);
console.log(show(now)); // {tea=3} checkedOut=false
log.push(...checkout(now));
console.log(show(replay(log))); // {tea=3} checkedOut=true
console.log("as of event 2: " + show(replay(log.slice(0, 2)))); // time travel
for (const state of [replay(log), EMPTY]) {
  try { checkout(state); } catch (e) { console.log((e as Error).message); }
}` },
          { lang: 'cpp', code: `// Functional style: state = fold(evolve, initial, events); decide returns events.
struct ItemAdded { string sku; int qty; };
struct ItemRemoved { string sku; };
struct CheckedOut {};
using CartEvent = variant<ItemAdded, ItemRemoved, CheckedOut>;

template <class... Ts>
struct Overloaded : Ts... { using Ts::operator()...; };
template <class... Ts>
Overloaded(Ts...) -> Overloaded<Ts...>;

struct CartState {
    map<string, int> items;  // sorted by key
    bool checkedOut = false;
};

CartState evolve(CartState s, const CartEvent& e) {  // pure: the state is a value, so the copy IS the "new state"
    visit(Overloaded{
        [&](const ItemAdded& a) { s.items[a.sku] += a.qty; },
        [&](const ItemRemoved& r) { s.items.erase(r.sku); },
        [&](const CheckedOut&) { s.checkedOut = true; }}, e);
    return s;
}

CartState replay(const vector<CartEvent>& events) {
    return accumulate(events.begin(), events.end(), CartState{}, evolve);
}

vector<CartEvent> checkout(const CartState& s) {  // decide: validates, returns new events
    if (s.checkedOut) throw runtime_error("already checked out");
    if (s.items.empty()) throw runtime_error("empty cart");
    return {CheckedOut{}};
}

string show(const CartState& s) {
    string out = "{";
    for (const auto& [sku, qty] : s.items) out += (out.size() > 1 ? ", " : "") + sku + "=" + to_string(qty);
    return out + "} checkedOut=" + (s.checkedOut ? "true" : "false");
}

int main() {
    vector<CartEvent> log = {ItemAdded{"tea", 2}, ItemAdded{"mug", 1}, ItemAdded{"tea", 1}, ItemRemoved{"mug"}};
    CartState now = replay(log);
    cout << show(now) << "\\n";  // {tea=3} checkedOut=false
    for (auto& e : checkout(now)) log.push_back(e);
    cout << show(replay(log)) << "\\n";  // {tea=3} checkedOut=true
    cout << "as of event 2: " << show(replay(vector<CartEvent>(log.begin(), log.begin() + 2))) << "\\n";  // time travel
    for (const CartState& state : {replay(log), CartState{}}) {
        try {
            checkout(state);
        } catch (const runtime_error& e) {
            cout << e.what() << "\\n";
        }
    }
}` }
        ] }, { lang: 'java', code: `// Snapshots + a projection (read model) built from the same events.
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
}`, alt: [
          { lang: 'python', code: `# Snapshots + a projection (read model) built from the same events.
from dataclasses import dataclass


@dataclass(frozen=True)
class Event:
    version: int
    type: str
    amount: int


@dataclass(frozen=True)
class Snapshot:
    version: int
    balance: int


class SnapshottingRepo:
    EVERY = 3

    def __init__(self) -> None:
        self.log: list[Event] = []
        self.latest = Snapshot(0, 0)
        self.events_replayed_on_last_load = 0

    def append(self, type_: str, amount: int) -> None:
        self.log.append(Event(len(self.log) + 1, type_, amount))
        if len(self.log) % self.EVERY == 0:
            self.latest = Snapshot(len(self.log), self.load())  # take a snapshot every 3 events

    def load(self) -> int:  # snapshot + only the events after it
        bal, n = self.latest.balance, 0
        for e in self.log:
            if e.version > self.latest.version:
                bal += e.amount if e.type == "DEP" else -e.amount
                n += 1
        self.events_replayed_on_last_load = n
        return bal


class MonthlyTotalsProjection:  # a read model: rebuildable at any time
    def __init__(self) -> None:
        self.totals: dict[str, int] = {}

    def on(self, e: Event) -> None:
        self.totals[e.type] = self.totals.get(e.type, 0) + e.amount

    @staticmethod
    def rebuild(log: list[Event]) -> "MonthlyTotalsProjection":
        p = MonthlyTotalsProjection()
        for e in log:
            p.on(e)
        return p


r = SnapshottingRepo()
r.append("DEP", 100)
r.append("WD", 30)
r.append("DEP", 50)
r.append("WD", 20)
bal = r.load()
print(f"balance {bal} (snapshot v{r.latest.version} + {r.events_replayed_on_last_load} event)")
totals = MonthlyTotalsProjection.rebuild(r.log).totals
print("projection {" + ", ".join(f"{k}={totals[k]}" for k in sorted(totals)) + "}")  # {DEP=150, WD=50}` },
          { lang: 'ts', code: `// Snapshots + a projection (read model) built from the same events.
interface LogEvent { readonly version: number; readonly type: string; readonly amount: number; }
interface Snapshot { readonly version: number; readonly balance: number; }

class SnapshottingRepo {
  static readonly EVERY = 3;
  readonly log: LogEvent[] = [];
  latest: Snapshot = { version: 0, balance: 0 };
  eventsReplayedOnLastLoad = 0;

  append(type: string, amount: number): void {
    this.log.push({ version: this.log.length + 1, type, amount });
    if (this.log.length % SnapshottingRepo.EVERY === 0) {
      this.latest = { version: this.log.length, balance: this.load() }; // take a snapshot every 3 events
    }
  }

  load(): number { // snapshot + only the events after it
    let bal = this.latest.balance;
    let n = 0;
    for (const e of this.log) {
      if (e.version > this.latest.version) {
        bal += e.type === "DEP" ? e.amount : -e.amount;
        n++;
      }
    }
    this.eventsReplayedOnLastLoad = n;
    return bal;
  }
}

class MonthlyTotalsProjection { // a read model: rebuildable at any time
  readonly totals = new Map<string, number>();
  on(e: LogEvent): void { this.totals.set(e.type, (this.totals.get(e.type) ?? 0) + e.amount); }
  static rebuild(log: readonly LogEvent[]): MonthlyTotalsProjection {
    const p = new MonthlyTotalsProjection();
    log.forEach((e) => p.on(e));
    return p;
  }
}

const r = new SnapshottingRepo();
r.append("DEP", 100); r.append("WD", 30); r.append("DEP", 50); r.append("WD", 20);
const bal = r.load();
console.log(\`balance \${bal} (snapshot v\${r.latest.version} + \${r.eventsReplayedOnLastLoad} event)\`);
const totals = MonthlyTotalsProjection.rebuild(r.log).totals;
console.log("projection {" + [...totals.keys()].sort().map((k) => \`\${k}=\${totals.get(k)}\`).join(", ") + "}"); // {DEP=150, WD=50}` },
          { lang: 'cpp', code: `// Snapshots + a projection (read model) built from the same events.
struct Event {
    long long version;
    string type;
    long long amount;
};
struct Snapshot {
    long long version, balance;
};

class SnapshottingRepo {
public:
    static constexpr int EVERY = 3;
    vector<Event> log;
    Snapshot latest{0, 0};
    int eventsReplayedOnLastLoad = 0;

    void append(const string& type, long long amount) {
        log.push_back({static_cast<long long>(log.size()) + 1, type, amount});
        if (log.size() % EVERY == 0) latest = Snapshot{static_cast<long long>(log.size()), load()};  // take a snapshot every 3 events
    }
    long long load() {  // snapshot + only the events after it
        long long bal = latest.balance;
        int n = 0;
        for (const Event& e : log) {
            if (e.version > latest.version) {
                bal += e.type == "DEP" ? e.amount : -e.amount;
                n++;
            }
        }
        eventsReplayedOnLastLoad = n;
        return bal;
    }
};

class MonthlyTotalsProjection {  // a read model: rebuildable at any time
public:
    map<string, long long> totals;  // sorted by key
    void on(const Event& e) { totals[e.type] += e.amount; }
    static MonthlyTotalsProjection rebuild(const vector<Event>& log) {
        MonthlyTotalsProjection p;
        for (const Event& e : log) p.on(e);
        return p;
    }
};

int main() {
    SnapshottingRepo r;
    r.append("DEP", 100); r.append("WD", 30); r.append("DEP", 50); r.append("WD", 20);
    long long bal = r.load();
    cout << "balance " << bal << " (snapshot v" << r.latest.version << " + " << r.eventsReplayedOnLastLoad << " event)\\n";
    string line;
    for (const auto& [type, total] : MonthlyTotalsProjection::rebuild(r.log).totals)
        line += (line.empty() ? "" : ", ") + type + "=" + to_string(total);
    cout << "projection {" << line << "}\\n";  // {DEP=150, WD=50}
}` }
        ] }],
    codeTitle: ['Event-sourced aggregate: decide vs apply, expected-version append', 'Functional event sourcing with a closed set of events + exhaustive matching', 'Snapshots and a rebuildable projection'],
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
          frames.push(F('Replay #' + (k + 1) + ': apply <b>' + e.t + (e.a !== undefined ? ' ' + e.a : '') + '</b> → ' + (e.t === 'Deposited' ? 'balance += ' + e.a : e.t === 'Withdrew' ? 'balance -= ' + e.a : e.t === 'Opened' ? 'open = true' : e.t === 'Frozen' ? 'frozen = true' : 'frozen = false') + '. State is now exactly what it was right after this event originally happened.', [ARR('event log (append-only)', lv(), h, p), VARS('rebuilt state', r, e.t === 'Deposited' || e.t === 'Withdrew' ? { balance: 'cur' } : { version: 'cur' }), CODE('apply(event)', 'switch (e) {\n  case Opened o    -> open = true;\n  case Deposited d -> balance += d.amount();\n  case Withdrew w  -> balance -= w.amount();\n  case Frozen f    -> frozen = true;\n}', (function () { var hh = {}; hh[{ Opened: 2, Deposited: 3, Withdrew: 4, Frozen: 5 }[e.t] || 1] = 'cur'; return hh; })(), APPLY_ALT)]));
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
}`, alt: [
          { lang: 'python', code: `from dataclasses import dataclass


@dataclass(frozen=True)
class DepositedV1:
    rupees: int


@dataclass(frozen=True)
class DepositedV2:
    paise: int
    currency: str


def upcast(raw: object) -> DepositedV2:
    if isinstance(raw, DepositedV2):
        return raw
    if isinstance(raw, DepositedV1):
        return DepositedV2(raw.rupees * 100, "INR")  # old data was always INR
    raise ValueError(f"unknown event {raw}")` },
          { lang: 'ts', code: `interface DepositedV1 { readonly version: 1; readonly rupees: number; }
interface DepositedV2 { readonly version: 2; readonly paise: number; readonly currency: string; }

function upcast(raw: DepositedV1 | DepositedV2): DepositedV2 {
  switch (raw.version) {
    case 2: return raw;
    case 1: return { version: 2, paise: raw.rupees * 100, currency: "INR" }; // old data was always INR
    default: throw new Error(\`unknown event \${JSON.stringify(raw)}\`);
  }
}` },
          { lang: 'cpp', code: `struct DepositedV1 { long long rupees; };
struct DepositedV2 { long long paise; string currency; };

template <class... Ts>
struct Overloaded : Ts... { using Ts::operator()...; };
template <class... Ts>
Overloaded(Ts...) -> Overloaded<Ts...>;

DepositedV2 upcast(const variant<DepositedV1, DepositedV2>& raw) {
    return visit(Overloaded{
        [](const DepositedV2& v2) { return v2; },
        [](const DepositedV1& v1) { return DepositedV2{v1.rupees * 100, "INR"}; }}, raw);  // old data was always INR
}` }
        ] },
      { title: 'Why apply must never throw', html: `<p>Suppose a later code change adds "withdraw limit ₹10,000" and someone puts that check inside <code>apply(Withdrew)</code>. Old streams containing a legal-at-the-time ₹20,000 withdrawal can now <b>never be loaded again</b>. ${H.c('r', 'Rules belong in decide (commands), not in apply (facts).')} New rules apply only to new commands.</p>` },
      { title: 'Event sourcing ≠ event-driven', html: `${H.table(['', 'Domain events / event-driven', 'Event sourcing'], [['Events used for', 'notifying others', 'storing the aggregate itself'], ['Current state stored?', 'yes (normal tables)', 'no — derived from events'], ['Can you have one without the other?', 'yes, very common', 'yes, but you usually also publish the events']])}` }
    ],
    deepDive: `<p><b>Event store requirements:</b> append-only streams, per-stream ordering, <b>atomic append with expected version</b>, reading a stream from a version, and a global ordered feed (for projections). Options: a dedicated store (EventStoreDB/Kurrent), a relational table <code>(stream_id, version, type, payload, metadata, PRIMARY KEY(stream_id, version))</code> — the primary key itself enforces optimistic concurrency, since two writers inserting version 8 collide — or frameworks like Axon. Kafka is a great event <i>transport</i> but a poor per-aggregate store (no per-key expected-version append, compaction semantics).</p>
<p><b>Projections in production:</b> each projection tracks a checkpoint (last processed global position) and must be idempotent; rebuilding = reset checkpoint, truncate the read table, replay. Read models are eventually consistent — the UI may need "read your own writes" tricks (return the new version and wait/poll, or update optimistically).</p>
<p><b>Schema evolution:</b> events are immutable forever, so plan for versioning: weak schema (tolerant JSON readers, additive fields), upcasters on read, or copy-and-transform migrations into a new stream (rare). Name events carefully up front; they are your most durable API.</p>
<p><b>Privacy / GDPR:</b> "right to be forgotten" vs immutable logs. Standard answer: <b>crypto-shredding</b> (encrypt personal fields with a per-person key; delete the key) or keep personal data outside the events and reference it by ID.</p>
<p><b>Costs (say them in interviews):</b> more moving parts, eventual consistency of reads, harder ad-hoc queries, versioning discipline, larger storage (cheap), and a steep learning curve. Use it where history is the business (ledgers, trading, logistics tracking, collaborative editing, compliance), not for a settings page. Martin Fowler and Greg Young both warn against applying it system-wide; apply it to the aggregates that benefit.</p>`,
    aiEra: `<p><b>What AI changes:</b> event-sourced code is formulaic (a closed set of event types, a switch in <code>apply</code>, a decide method per command), which AI generates quickly and correctly — and a sealed interface (Java), a union type (TypeScript) or a <code>std::variant</code> (C++) with an exhaustive <code>switch</code> means the compiler catches the classic AI mistake of forgetting to handle a new event type. Ask for <b>given-when-then tests</b>: <code>given [Opened, Deposited 100] when Withdraw 150 then rejected</code> — the natural testing style for event sourcing, and AI writes them fast.</p>
<p><b>Event logs are perfect AI context.</b> An agent debugging "why is this balance wrong?" can read the stream and replay it step by step — far better evidence than a single row. AI agent frameworks themselves increasingly use event-sourced state: an agent run is a log of steps (thought, tool call, result), which enables replay, resume after crash, and audit of what the agent did and why.</p>
<p><b>Where AI goes wrong:</b> puts validation inside <code>apply</code>, mutates or "fixes" old events, uses the event list as the read model for queries (slow), forgets the expected-version check, or proposes event sourcing for CRUD because it sounds advanced.</p>
<p><b>What you must own:</b> whether the domain benefits enough to pay the complexity cost, and the event names/contracts you will live with for years.</p>`,
    problems: [{
      title: 'Event-Sourced Warehouse Stock Item', level: 'Medium', tags: ['event sourcing', 'replay', 'decide/apply'], companies: ['Amazon', 'Flipkart', 'Shopify'],
      statement: `<p>Model a warehouse <code>StockItem</code> with event sourcing. Commands: <code>receive(qty)</code>, <code>reserve(orderId, qty)</code>, <code>release(orderId)</code>, <code>ship(orderId)</code>. Rules: available = onHand − reserved; cannot reserve more than available; an order can hold only one reservation; ship only a reserved order (reduces onHand and reserved). Events: <code>Received</code>, <code>Reserved</code>, <code>Released</code>, <code>Shipped</code>. Implement decide/apply, rebuild from history, and answer "what was available after event k?".</p>`,
      constraints: `Quantities positive ints. Apply must never throw. Up to 10<sup>5</sup> events per item (mention snapshots).`,
      example: `<p>Events: Received 10, Reserved o1 4, Reserved o2 5, Shipped o1, Released o2 → onHand ${H.c('b', '6')}, reserved ${H.c('b', '0')}, available ${H.c('g', '6')}. Command reserve o3 7 → ${H.c('r', 'rejected: only 6 available')}. As of event 3: available = 10 − 9 = 1.</p>`,
      brute: { why: `<p>A single row <code>(sku, on_hand, reserved)</code> updated in place. When numbers look wrong ("why is available negative?") there is no history to investigate; reservations per order are not tracked so a double <code>release</code> silently subtracts twice.</p>`, code: { lang: 'java', code: `class StockRowBrute {
    int onHand, reserved;
    void receive(int q) { onHand += q; }
    void reserve(int q) { reserved += q; }                 // no per-order tracking, no availability check
    void release(int q) { reserved -= q; }                 // releasing twice -> negative reserved
    void ship(int q) { onHand -= q; reserved -= q; }
    int available() { return onHand - reserved; }
}`, alt: [{ lang: 'python', code: "class StockRowBrute:\n    def __init__(self): self.on_hand = self.reserved = 0\n    def receive(self, q): self.on_hand += q\n    def reserve(self, q): self.reserved += q                 # no per-order tracking, no availability check\n    def release(self, q): self.reserved -= q                 # releasing twice -> negative reserved\n    def ship(self, q): self.on_hand -= q; self.reserved -= q\n    def available(self): return self.on_hand - self.reserved\n" }, { lang: 'ts', code: "class StockRowBrute {\n  onHand = 0; reserved = 0;\n  receive(q: number): void { this.onHand += q; }\n  reserve(q: number): void { this.reserved += q; }           // no per-order tracking, no availability check\n  release(q: number): void { this.reserved -= q; }           // releasing twice -> negative reserved\n  ship(q: number): void { this.onHand -= q; this.reserved -= q; }\n  available(): number { return this.onHand - this.reserved; }\n}\n" }, { lang: 'cpp', code: "class StockRowBrute {\npublic:\n    int onHand = 0, reserved = 0;\n    void receive(int q) { onHand += q; }\n    void reserve(int q) { reserved += q; }                   // no per-order tracking, no availability check\n    void release(int q) { reserved -= q; }                   // releasing twice -> negative reserved\n    void ship(int q) { onHand -= q; reserved -= q; }\n    int available() const { return onHand - reserved; }\n};\n" }] } },
      mcq: { q: 'An old stream contains "Reserved o9 50" from before a new rule "max 20 per order" was added. What happens on replay?', options: ['It replays fine: apply never validates; the new rule only affects new reserve commands', 'Replay fails with a rule violation', 'The event must be edited to 20', 'The whole stream must be deleted'], answer: 0, explain: 'Events are historical facts. Rules live in decide (command handling). Apply only changes state, so old histories always load.' },
      hints: [`<p>Hint 1: State = <code>onHand</code>, <code>Map&lt;orderId, qty&gt; reservations</code>; reserved = sum of the map.</p>`, `<p>Hint 2: Each command: check rules on current state → create event → apply it → add to uncommitted list.</p>`, `<p>Hint 3: "As of event k" = rehydrate from <code>history.subList(0, k)</code>. Snapshots: store (version, onHand, reservations) every N events.</p>`],
      tests: { io: true, cases: [{ stdin: '', stdout: "5 events: Received 10, Reserved o1 4, Reserved o2 5, Shipped o1, Released o2\nonHand=6 reserved=0 available=6\nrejected: only 6 available\navailable after o3: 0\nrejected: o3 already has a reservation\nrejected: no reservation for zz\nrejected: nothing reserved for zz\nrejected: qty > 0\nuncommitted events: 1\navailable as of event 3: 1\n" }] },
      solution: {
        approach: `<p>A closed set of event types (sealed records in Java); a <code>StockItem</code> with private derived state; command methods validate and raise events; a single <code>apply</code> switch updates state. <code>rehydrate(history)</code> replays; time travel replays a prefix. Rules live only in command methods, so old events always replay.</p>`,
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

    static String describe(StockEvent e) {
        return switch (e) {
            case Received r -> "Received " + r.qty();
            case Reserved r -> "Reserved " + r.orderId() + " " + r.qty();
            case Released r -> "Released " + r.orderId();
            case Shipped s -> "Shipped " + s.orderId();
        };
    }

    static void attempt(Runnable command) {
        try { command.run(); } catch (RuntimeException e) { System.out.println("rejected: " + e.getMessage()); }
    }

    public static void main(String[] args) {
        StockItem item = StockItem.rehydrate(List.of());
        item.receive(10); item.reserve("o1", 4); item.reserve("o2", 5); item.ship("o1"); item.release("o2");
        List<StockEvent> history = item.pullUncommitted();                 // what we would append to the store
        System.out.println(history.size() + " events: " + history.stream().map(StockItem::describe).collect(Collectors.joining(", ")));
        StockItem rebuilt = StockItem.rehydrate(history);
        System.out.println("onHand=" + rebuilt.onHand + " reserved=" + rebuilt.reserved() + " available=" + rebuilt.available());
        attempt(() -> rebuilt.reserve("o3", 7));                           // only 6 available
        rebuilt.reserve("o3", 6);
        System.out.println("available after o3: " + rebuilt.available());
        attempt(() -> rebuilt.reserve("o3", 1));                           // one reservation per order
        attempt(() -> rebuilt.release("zz"));
        attempt(() -> rebuilt.ship("zz"));
        attempt(() -> rebuilt.receive(0));
        System.out.println("uncommitted events: " + rebuilt.pullUncommitted().size());   // rejected commands raise nothing
        System.out.println("available as of event 3: " + StockItem.rehydrate(history.subList(0, 3)).available());   // 1
    }
}`,
        alt: [
          { lang: 'python', code: `from dataclasses import dataclass
from typing import Union


@dataclass(frozen=True)
class Received:
    qty: int


@dataclass(frozen=True)
class Reserved:
    order_id: str
    qty: int


@dataclass(frozen=True)
class Released:
    order_id: str


@dataclass(frozen=True)
class Shipped:
    order_id: str


StockEvent = Union[Received, Reserved, Released, Shipped]  # a closed set of facts


class StockItem:
    def __init__(self) -> None:
        self.on_hand = 0
        self._reservations: dict[str, int] = {}
        self._uncommitted: list[StockEvent] = []

    @staticmethod
    def rehydrate(history: list[StockEvent]) -> "StockItem":
        item = StockItem()
        for e in history:
            item._apply(e)
        return item

    def reserved(self) -> int:
        return sum(self._reservations.values())

    def available(self) -> int:
        return self.on_hand - self.reserved()

    # decide
    def receive(self, qty: int) -> None:
        if qty <= 0:
            raise ValueError("qty > 0")
        self._raise(Received(qty))

    def reserve(self, order: str, qty: int) -> None:
        if qty <= 0:
            raise ValueError("qty > 0")
        if order in self._reservations:
            raise RuntimeError(f"{order} already has a reservation")
        if qty > self.available():
            raise RuntimeError(f"only {self.available()} available")
        self._raise(Reserved(order, qty))

    def release(self, order: str) -> None:
        if order not in self._reservations:
            raise RuntimeError(f"no reservation for {order}")
        self._raise(Released(order))

    def ship(self, order: str) -> None:
        if order not in self._reservations:
            raise RuntimeError(f"nothing reserved for {order}")
        self._raise(Shipped(order))

    # apply: pure state change, never throws
    def _apply(self, e: StockEvent) -> None:
        match e:
            case Received(qty):
                self.on_hand += qty
            case Reserved(order_id, qty):
                self._reservations[order_id] = qty
            case Released(order_id):
                self._reservations.pop(order_id, None)
            case Shipped(order_id):
                self.on_hand -= self._reservations.pop(order_id, 0)

    def _raise(self, e: StockEvent) -> None:
        self._apply(e)
        self._uncommitted.append(e)

    def pull_uncommitted(self) -> list[StockEvent]:
        events, self._uncommitted = self._uncommitted, []
        return events


def describe(e: StockEvent) -> str:
    match e:
        case Received(qty):
            return f"Received {qty}"
        case Reserved(order_id, qty):
            return f"Reserved {order_id} {qty}"
        case Released(order_id):
            return f"Released {order_id}"
        case Shipped(order_id):
            return f"Shipped {order_id}"


def attempt(command) -> None:
    try:
        command()
    except (ValueError, RuntimeError) as e:
        print(f"rejected: {e}")


item = StockItem.rehydrate([])
item.receive(10)
item.reserve("o1", 4)
item.reserve("o2", 5)
item.ship("o1")
item.release("o2")
history = item.pull_uncommitted()  # what we would append to the store
print(f"{len(history)} events: " + ", ".join(describe(e) for e in history))
rebuilt = StockItem.rehydrate(history)
print(f"onHand={rebuilt.on_hand} reserved={rebuilt.reserved()} available={rebuilt.available()}")
attempt(lambda: rebuilt.reserve("o3", 7))  # only 6 available
rebuilt.reserve("o3", 6)
print(f"available after o3: {rebuilt.available()}")
attempt(lambda: rebuilt.reserve("o3", 1))  # one reservation per order
attempt(lambda: rebuilt.release("zz"))
attempt(lambda: rebuilt.ship("zz"))
attempt(lambda: rebuilt.receive(0))
print(f"uncommitted events: {len(rebuilt.pull_uncommitted())}")  # rejected commands raise nothing
print(f"available as of event 3: {StockItem.rehydrate(history[:3]).available()}")  # 1` },
          { lang: 'ts', code: `type StockEvent = // a closed set of facts: the compiler checks every switch is exhaustive
  | { readonly kind: "Received"; readonly qty: number }
  | { readonly kind: "Reserved"; readonly orderId: string; readonly qty: number }
  | { readonly kind: "Released"; readonly orderId: string }
  | { readonly kind: "Shipped"; readonly orderId: string };

class StockItem {
  onHand = 0;
  private readonly reservations = new Map<string, number>();
  private uncommitted: StockEvent[] = [];

  static rehydrate(log: StockEvent[]): StockItem {
    const item = new StockItem();
    log.forEach((e) => item.apply(e));
    return item;
  }

  reserved(): number {
    let sum = 0;
    for (const q of this.reservations.values()) sum += q;
    return sum;
  }
  available(): number { return this.onHand - this.reserved(); }

  // decide
  receive(qty: number): void {
    if (qty <= 0) throw new Error("qty > 0");
    this.raise({ kind: "Received", qty });
  }
  reserve(orderId: string, qty: number): void {
    if (qty <= 0) throw new Error("qty > 0");
    if (this.reservations.has(orderId)) throw new Error(\`\${orderId} already has a reservation\`);
    if (qty > this.available()) throw new Error(\`only \${this.available()} available\`);
    this.raise({ kind: "Reserved", orderId, qty });
  }
  release(orderId: string): void {
    if (!this.reservations.has(orderId)) throw new Error(\`no reservation for \${orderId}\`);
    this.raise({ kind: "Released", orderId });
  }
  ship(orderId: string): void {
    if (!this.reservations.has(orderId)) throw new Error(\`nothing reserved for \${orderId}\`);
    this.raise({ kind: "Shipped", orderId });
  }

  // apply: pure state change, never throws
  private apply(e: StockEvent): void {
    switch (e.kind) {
      case "Received": this.onHand += e.qty; break;
      case "Reserved": this.reservations.set(e.orderId, e.qty); break;
      case "Released": this.reservations.delete(e.orderId); break;
      case "Shipped":
        this.onHand -= this.reservations.get(e.orderId) ?? 0;
        this.reservations.delete(e.orderId);
        break;
    }
  }
  private raise(e: StockEvent): void { this.apply(e); this.uncommitted.push(e); }
  pullUncommitted(): StockEvent[] { const l = this.uncommitted; this.uncommitted = []; return l; }
}

function describe(e: StockEvent): string {
  switch (e.kind) {
    case "Received": return \`Received \${e.qty}\`;
    case "Reserved": return \`Reserved \${e.orderId} \${e.qty}\`;
    case "Released": return \`Released \${e.orderId}\`;
    case "Shipped": return \`Shipped \${e.orderId}\`;
  }
}

function attempt(command: () => void): void {
  try { command(); } catch (e) { console.log(\`rejected: \${(e as Error).message}\`); }
}

const item = StockItem.rehydrate([]);
item.receive(10);
item.reserve("o1", 4);
item.reserve("o2", 5);
item.ship("o1");
item.release("o2");
const log = item.pullUncommitted(); // what we would append to the store
console.log(\`\${log.length} events: \${log.map(describe).join(", ")}\`);
const rebuilt = StockItem.rehydrate(log);
console.log(\`onHand=\${rebuilt.onHand} reserved=\${rebuilt.reserved()} available=\${rebuilt.available()}\`);
attempt(() => rebuilt.reserve("o3", 7)); // only 6 available
rebuilt.reserve("o3", 6);
console.log(\`available after o3: \${rebuilt.available()}\`);
attempt(() => rebuilt.reserve("o3", 1)); // one reservation per order
attempt(() => rebuilt.release("zz"));
attempt(() => rebuilt.ship("zz"));
attempt(() => rebuilt.receive(0));
console.log(\`uncommitted events: \${rebuilt.pullUncommitted().length}\`); // rejected commands raise nothing
console.log(\`available as of event 3: \${StockItem.rehydrate(log.slice(0, 3)).available()}\`); // 1` },
          { lang: 'cpp', code: `struct Received { int qty; };
struct Reserved { string orderId; int qty; };
struct Released { string orderId; };
struct Shipped { string orderId; };
using StockEvent = variant<Received, Reserved, Released, Shipped>;  // a closed set of facts

template <class... Ts>
struct Overloaded : Ts... { using Ts::operator()...; };
template <class... Ts>
Overloaded(Ts...) -> Overloaded<Ts...>;

class StockItem {
    int onHand_ = 0;
    map<string, int> reservations_;
    vector<StockEvent> uncommitted_;

    // apply: pure state change, never throws
    void apply(const StockEvent& e) {
        visit(Overloaded{
            [&](const Received& r) { onHand_ += r.qty; },
            [&](const Reserved& r) { reservations_[r.orderId] = r.qty; },
            [&](const Released& r) { reservations_.erase(r.orderId); },
            [&](const Shipped& s) {
                auto it = reservations_.find(s.orderId);
                if (it != reservations_.end()) { onHand_ -= it->second; reservations_.erase(it); }
            }}, e);
    }
    void raise(StockEvent e) { apply(e); uncommitted_.push_back(move(e)); }

public:
    static StockItem rehydrate(const vector<StockEvent>& history) {
        StockItem item;
        for (const auto& e : history) item.apply(e);
        return item;
    }

    int onHand() const { return onHand_; }
    int reserved() const {
        int sum = 0;
        for (const auto& [order, qty] : reservations_) sum += qty;
        return sum;
    }
    int available() const { return onHand_ - reserved(); }

    // decide
    void receive(int qty) {
        if (qty <= 0) throw invalid_argument("qty > 0");
        raise(Received{qty});
    }
    void reserve(const string& order, int qty) {
        if (qty <= 0) throw invalid_argument("qty > 0");
        if (reservations_.count(order)) throw runtime_error(order + " already has a reservation");
        if (qty > available()) throw runtime_error("only " + to_string(available()) + " available");
        raise(Reserved{order, qty});
    }
    void release(const string& order) {
        if (!reservations_.count(order)) throw runtime_error("no reservation for " + order);
        raise(Released{order});
    }
    void ship(const string& order) {
        if (!reservations_.count(order)) throw runtime_error("nothing reserved for " + order);
        raise(Shipped{order});
    }
    vector<StockEvent> pullUncommitted() { return exchange(uncommitted_, {}); }
};

string describe(const StockEvent& e) {
    return visit(Overloaded{
        [](const Received& r) { return "Received " + to_string(r.qty); },
        [](const Reserved& r) { return "Reserved " + r.orderId + " " + to_string(r.qty); },
        [](const Released& r) { return "Released " + r.orderId; },
        [](const Shipped& s) { return "Shipped " + s.orderId; }}, e);
}

void attempt(const function<void()>& command) {
    try { command(); } catch (const exception& e) { cout << "rejected: " << e.what() << "\\n"; }
}

int main() {
    StockItem item = StockItem::rehydrate({});
    item.receive(10);
    item.reserve("o1", 4);
    item.reserve("o2", 5);
    item.ship("o1");
    item.release("o2");
    vector<StockEvent> history = item.pullUncommitted();  // what we would append to the store
    string line = to_string(history.size()) + " events: ";
    for (size_t i = 0; i < history.size(); i++) line += (i ? ", " : "") + describe(history[i]);
    cout << line << "\\n";
    StockItem rebuilt = StockItem::rehydrate(history);
    cout << "onHand=" << rebuilt.onHand() << " reserved=" << rebuilt.reserved() << " available=" << rebuilt.available() << "\\n";
    attempt([&] { rebuilt.reserve("o3", 7); });  // only 6 available
    rebuilt.reserve("o3", 6);
    cout << "available after o3: " << rebuilt.available() << "\\n";
    attempt([&] { rebuilt.reserve("o3", 1); });  // one reservation per order
    attempt([&] { rebuilt.release("zz"); });
    attempt([&] { rebuilt.ship("zz"); });
    attempt([&] { rebuilt.receive(0); });
    cout << "uncommitted events: " << rebuilt.pullUncommitted().size() << "\\n";  // rejected commands raise nothing
    cout << "available as of event 3: "
         << StockItem::rehydrate(vector<StockEvent>(history.begin(), history.begin() + 3)).available() << "\\n";  // 1
}` }
        ],
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
    brute: { why: `<p>Validation and normalisation are copy-pasted into the signup form, the import job and the API; one of them forgets <code>toLowerCase()</code>, so duplicates appear. Strings can also be swapped: <code>new Contact(name, phone, email)</code> compiles.</p>`, code: { lang: 'java', code: `class ContactBrute {
    String name, email, phone;
    ContactBrute(String name, String email, String phone) { this.name = name; this.email = email; this.phone = phone; }
    static boolean sameEmail(String a, String b) { return a.equalsIgnoreCase(b); }   // forgot trim(); other callers forget even this
}`, alt: [{ lang: 'python', code: "class ContactBrute:\n    def __init__(self, name, email, phone):\n        self.name, self.email, self.phone = name, email, phone\n\n    @staticmethod\n    def same_email(a, b): return a.lower() == b.lower()   # forgot strip(); other callers forget even this\n" }, { lang: 'ts', code: "class ContactBrute {\n  constructor(public name: string, public email: string, public phone: string) {}\n  static sameEmail(a: string, b: string): boolean { return a.toLowerCase() === b.toLowerCase(); }   // forgot trim(); other callers forget even this\n}\n" }, { lang: 'cpp', code: "struct ContactBrute {\n    string name, email, phone;\n    ContactBrute(string name, string email, string phone) : name(name), email(email), phone(phone) {}\n    static bool sameEmail(string a, string b) {            // forgot trimming; other callers forget even the lower-casing\n        for (char& c : a) c = tolower(c);\n        for (char& c : b) c = tolower(c);\n        return a == b;\n    }\n};\n" }] } },
    mcq: { q: 'Where should email normalisation (trim + lowercase) happen?', options: ['In the Email value object constructor, so every Email is normalised', 'In each service before comparing', 'In the database with a trigger', 'In the UI form'], answer: 0, explain: 'If the VO constructor normalises, no un-normalised Email can exist anywhere. Every other place gets it for free.' },
    hints: [`<p>Hint 1: Use immutable value objects whose constructor normalises first (<code>value = value.trim().toLowerCase();</code>) and then validates.</p>`, `<p>Hint 2: For the phone, strip everything except digits and a leading +, then remove a +91 or 0 prefix, then check 10 digits starting 6-9.</p>`, `<p>Hint 3: Value objects give you equality and hashing on the normalised value (Java records, Python frozen dataclasses, a defaulted <code>operator&lt;=&gt;</code> in C++), so a set dedupes with no extra code; in TypeScript key a <code>Map</code> by the normalised string.</p>`],
      tests: { io: true, cases: [{ stdin: '', stdout: "2 [asha@mail.com, ravi@x.in]\n+919845012345\ntrue\ninvalid mobile: 12345\ninvalid mobile: 5845012345\nphone required\nemail required\ninvalid email: a@@b.com\ninvalid email: noat\ninvalid email: x@y\ninvalid email: a@b.\ninvalid email: @x.com\nAsha <a@b.co> +919845012345\n" }] },
      solution: {
      approach: `<p>Two value objects (records in Java, frozen dataclasses in Python). Each constructor normalises, then validates, then stores only the canonical form. Equality and hashing come from the value object. A <code>Contact</code> now takes <code>Email</code> and <code>IndianMobile</code>, so arguments cannot be swapped.</p>`,
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
    static void attempt(Runnable action) {
        try { action.run(); } catch (IllegalArgumentException e) { System.out.println(e.getMessage()); }
    }

    public static void main(String[] args) {
        Set<Email> emails = new HashSet<>();
        for (String raw : List.of(" Asha@Mail.com ", "asha@mail.com", "ravi@x.in", "RAVI@X.IN")) emails.add(new Email(raw));
        System.out.println(emails.size() + " " + emails.stream().map(Email::value).sorted().toList());   // 2: equal by value
        System.out.println(new IndianMobile("098450-12345").value());             // +919845012345
        System.out.println(new IndianMobile("+91 98450 12345").equals(new IndianMobile("9845012345")));  // true
        for (String bad : new String[]{"12345", "5845012345", null}) attempt(() -> new IndianMobile(bad));
        for (String bad : new String[]{null, "a@@b.com", "NoAt", "x@y", "a@b.", "  @x.com"}) attempt(() -> new Email(bad));
        Contact c = new Contact("Asha", new Email(" A@B.co "), new IndianMobile("9845012345"));
        System.out.println(c.name() + " <" + c.email().value() + "> " + c.phone().value());
    }
}`,
        alt: [
          { lang: 'python', code: `import re
from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True)  # frozen + eq: equal by value, hashable, safe in sets
class Email:
    value: str

    def __post_init__(self) -> None:
        if self.value is None:
            raise ValueError("email required")
        v = self.value.strip().lower()
        at = v.find("@")
        if at <= 0 or at != v.rfind("@") or "." not in v[at + 1:] or v.endswith("."):
            raise ValueError(f"invalid email: {v}")
        object.__setattr__(self, "value", v)  # normalise inside the constructor


@dataclass(frozen=True)
class IndianMobile:
    value: str

    def __post_init__(self) -> None:
        if self.value is None:
            raise ValueError("phone required")
        d = re.sub(r"[^0-9+]", "", self.value)
        if d.startswith("+91"):
            d = d[3:]
        elif d.startswith("0"):
            d = d[1:]
        if not re.fullmatch(r"[6-9][0-9]{9}", d):
            raise ValueError(f"invalid mobile: {self.value}")
        object.__setattr__(self, "value", "+91" + d)


@dataclass(frozen=True)
class Contact:
    name: str
    email: Email
    phone: IndianMobile


def attempt(action) -> None:
    try:
        action()
    except ValueError as e:
        print(e)


emails = {Email(raw) for raw in [" Asha@Mail.com ", "asha@mail.com", "ravi@x.in", "RAVI@X.IN"]}
print(f"{len(emails)} [{', '.join(sorted(e.value for e in emails))}]")  # 2: equal by value
print(IndianMobile("098450-12345").value)  # +919845012345
print("true" if IndianMobile("+91 98450 12345") == IndianMobile("9845012345") else "false")
bad_phones: list[Optional[str]] = ["12345", "5845012345", None]
for bad in bad_phones:
    attempt(lambda: IndianMobile(bad))  # type: ignore[arg-type]
bad_emails: list[Optional[str]] = [None, "a@@b.com", "NoAt", "x@y", "a@b.", "  @x.com"]
for bad in bad_emails:
    attempt(lambda: Email(bad))  # type: ignore[arg-type]
c = Contact("Asha", Email(" A@B.co "), IndianMobile("9845012345"))
print(f"{c.name} <{c.email.value}> {c.phone.value}")` },
          { lang: 'ts', code: `class Email { // immutable value object: validates and normalises in the constructor
  readonly value: string;

  constructor(raw: string | null) {
    if (raw === null) throw new Error("email required");
    const v = raw.trim().toLowerCase();
    const at = v.indexOf("@");
    if (at <= 0 || at !== v.lastIndexOf("@") || !v.substring(at + 1).includes(".") || v.endsWith(".")) {
      throw new Error(\`invalid email: \${v}\`);
    }
    this.value = v;
  }

  equals(o: Email): boolean { return this.value === o.value; }
}

class IndianMobile {
  readonly value: string;

  constructor(raw: string | null) {
    if (raw === null) throw new Error("phone required");
    let d = raw.replace(/[^0-9+]/g, "");
    if (d.startsWith("+91")) d = d.substring(3);
    else if (d.startsWith("0")) d = d.substring(1);
    if (!/^[6-9][0-9]{9}$/.test(d)) throw new Error(\`invalid mobile: \${raw}\`);
    this.value = "+91" + d;
  }

  equals(o: IndianMobile): boolean { return this.value === o.value; }
}

interface Contact { readonly name: string; readonly email: Email; readonly phone: IndianMobile; }

function attempt(action: () => void): void {
  try { action(); } catch (e) { console.log((e as Error).message); }
}

// Objects compare by identity in a Set, so key the set by the normalised value.
const emails = new Map<string, Email>();
for (const raw of [" Asha@Mail.com ", "asha@mail.com", "ravi@x.in", "RAVI@X.IN"]) {
  const e = new Email(raw);
  emails.set(e.value, e);
}
console.log(\`\${emails.size} [\${[...emails.keys()].sort().join(", ")}]\`); // 2: equal by value
console.log(new IndianMobile("098450-12345").value); // +919845012345
console.log(String(new IndianMobile("+91 98450 12345").equals(new IndianMobile("9845012345"))));
for (const bad of ["12345", "5845012345", null]) attempt(() => new IndianMobile(bad));
for (const bad of [null, "a@@b.com", "NoAt", "x@y", "a@b.", "  @x.com"]) attempt(() => new Email(bad));
const c: Contact = { name: "Asha", email: new Email(" A@B.co "), phone: new IndianMobile("9845012345") };
console.log(\`\${c.name} <\${c.email.value}> \${c.phone.value}\`);` },
          { lang: 'cpp', code: `class Email {  // immutable value object: validates and normalises in the constructor
    string value_;

public:
    explicit Email(const optional<string>& raw) {
        if (!raw) throw invalid_argument("email required");
        string v = *raw;
        auto notSpace = [](unsigned char c) { return !isspace(c); };
        v.erase(v.begin(), find_if(v.begin(), v.end(), notSpace));
        v.erase(find_if(v.rbegin(), v.rend(), notSpace).base(), v.end());
        for (char& ch : v) ch = static_cast<char>(tolower(static_cast<unsigned char>(ch)));
        size_t at = v.find('@');
        if (at == string::npos || at == 0 || at != v.rfind('@') || v.find('.', at + 1) == string::npos || v.back() == '.')
            throw invalid_argument("invalid email: " + v);
        value_ = v;
    }
    const string& value() const { return value_; }
    auto operator<=>(const Email&) const = default;  // equality and ordering by value
};

class IndianMobile {
    string value_;

public:
    explicit IndianMobile(const optional<string>& raw) {
        if (!raw) throw invalid_argument("phone required");
        string d;
        for (char c : *raw) if (isdigit(static_cast<unsigned char>(c)) || c == '+') d += c;
        if (d.rfind("+91", 0) == 0) d = d.substr(3);
        else if (d.rfind("0", 0) == 0) d = d.substr(1);
        bool ok = d.size() == 10 && d[0] >= '6' && all_of(d.begin(), d.end(), [](unsigned char c) { return isdigit(c); });
        if (!ok) throw invalid_argument("invalid mobile: " + *raw);
        value_ = "+91" + d;
    }
    const string& value() const { return value_; }
    bool operator==(const IndianMobile&) const = default;
};

struct Contact {
    string name;
    Email email;
    IndianMobile phone;
};

void attempt(const function<void()>& action) {
    try { action(); } catch (const invalid_argument& e) { cout << e.what() << "\\n"; }
}

int main() {
    set<Email> emails;  // ordered by value, so it prints sorted
    for (const char* raw : {" Asha@Mail.com ", "asha@mail.com", "ravi@x.in", "RAVI@X.IN"}) emails.insert(Email(string(raw)));
    string list;
    for (const Email& e : emails) list += (list.empty() ? "" : ", ") + e.value();
    cout << emails.size() << " [" << list << "]\\n";  // 2: equal by value
    cout << IndianMobile(string("098450-12345")).value() << "\\n";  // +919845012345
    cout << boolalpha << (IndianMobile(string("+91 98450 12345")) == IndianMobile(string("9845012345"))) << "\\n";
    for (optional<string> bad : {optional<string>("12345"), optional<string>("5845012345"), optional<string>()})
        attempt([&] { IndianMobile m(bad); });
    for (optional<string> bad : {optional<string>(), optional<string>("a@@b.com"), optional<string>("NoAt"),
                                 optional<string>("x@y"), optional<string>("a@b."), optional<string>("  @x.com")})
        attempt([&] { Email e(bad); });
    Contact c{"Asha", Email(string(" A@B.co ")), IndianMobile(string("9845012345"))};
    cout << c.name << " <" << c.email.value() << "> " << c.phone.value() << "\\n";
}` }
        ],
      complexity: `<p>O(length of input) per construction. Duplicates handled by hashing in O(1) average.</p>`,
      followUps: ['How would you support international numbers (libphonenumber behind a port)?', 'Should Email know about disposable-domain blocklists, or is that a separate policy?', 'How would you store these VOs in a database column?']
    }
  });

  practice.push({
    title: 'Inject the Dependencies of a Daily Report Mailer', level: 'Easy', tags: ['dependency injection', 'testing', 'clock'], companies: ['Microsoft', 'Salesforce', 'Infosys'],
    statement: `<p><code>DailyReportJob.run()</code> creates <code>new SalesDao()</code>, <code>new SmtpClient()</code> and calls <code>LocalDate.now()</code>. It emails yesterday's total sales to the manager, but on Sundays it skips sending. Refactor to <b>constructor injection</b> with interfaces and an injected <code>Clock</code>, and write a "test" in <code>main</code> using fakes proving: (1) Monday sends one mail with Sunday's total, (2) Sunday sends nothing.</p>`,
    constraints: `No frameworks or mocking libraries. Tests must not depend on today's real date.`,
    example: `<p>Clock fixed at Monday 2026-03-02 → sales for 2026-03-01 = ₹12,500 → mail "Sales 2026-03-01: 12500" ${H.c('g', 'sent')}. Clock fixed at Sunday 2026-03-01 → ${H.c('m', 'no mail')}.</p>`,
    brute: { why: `<p>Three hidden dependencies: the DB, SMTP and the system clock. Testing the Sunday rule requires running the test on a Sunday against a real database and mail server.</p>`, code: { lang: 'java', code: `class DailyReportJobBrute {
    void run() {
        LocalDate today = LocalDate.now();                       // hidden dependency
        if (today.getDayOfWeek() == DayOfWeek.SUNDAY) return;
        long total = 12_500;                                     // pretend: new SalesDao().totalFor(today.minusDays(1))
        System.out.println("SMTP: Sales " + today.minusDays(1) + ": " + total);   // pretend: new SmtpClient().send(...)
    }
}`, alt: [{ lang: 'python', code: "from datetime import date, timedelta\n\nclass DailyReportJobBrute:\n    def run(self):\n        today = date.today()                                     # hidden dependency\n        if today.weekday() == 6: return                          # Sunday\n        total = 12_500                                           # pretend: SalesDao().total_for(today - 1 day)\n        print(f\"SMTP: Sales {today - timedelta(days=1)}: {total}\")   # pretend: SmtpClient().send(...)\n" }, { lang: 'ts', code: "class DailyReportJobBrute {\n  run(): void {\n    const today = new Date();                                    // hidden dependency\n    if (today.getDay() === 0) return;                            // Sunday\n    const total = 12_500;                                        // pretend: new SalesDao().totalFor(yesterday)\n    const yesterday = new Date(today.getTime() - 86_400_000).toISOString().slice(0, 10);\n    console.log(\"SMTP: Sales \" + yesterday + \": \" + total);      // pretend: new SmtpClient().send(...)\n  }\n}\n" }, { lang: 'cpp', code: "class DailyReportJobBrute {\npublic:\n    void run() {\n        time_t today = time(nullptr);                            // hidden dependency\n        if (localtime(&today)->tm_wday == 0) return;             // Sunday\n        long long total = 12'500;                                // pretend: SalesDao().totalFor(yesterday)\n        time_t y = today - 86400;\n        char buf[16]; strftime(buf, sizeof buf, \"%Y-%m-%d\", localtime(&y));\n        cout << \"SMTP: Sales \" << buf << \": \" << total << endl;  // pretend: SmtpClient().send(...)\n    }\n};\n" }] } },
    mcq: { q: 'What is the simplest way to make the Sunday rule testable?', options: ['Inject a clock (java.time.Clock in Java) and ask it for today', 'Add a boolean parameter isSunday to run()', 'Use a static mutable "today" field', 'Mock LocalDate.now() with bytecode tricks'], answer: 0, explain: 'A clock is the seam for time: Java ships java.time.Clock, other languages pass a function or an interface. Production passes the system clock; tests pass a fixed one.' },
    hints: [`<p>Hint 1: Interfaces: <code>SalesQuery { long totalFor(LocalDate d); }</code>, <code>Mailer { void send(String to, String body); }</code>.</p>`, `<p>Hint 2: Both are single-method interfaces, so fakes can be lambdas.</p>`, `<p>Hint 3: Collect sent mails in a <code>List&lt;String&gt;</code> inside the fake mailer and assert on its size and content.</p>`],
      tests: { io: true, cases: [{ stdin: '', stdout: "boss@shop.in | Sales 2026-03-01: 12500\nMonday test PASSED\nSunday test PASSED\nboss@shop.in | Sales 2026-03-02: 0\nmailer failed: smtp down\n" }] },
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
        System.out.println(outbox.get(0));
        System.out.println(outbox.size() == 1 && outbox.get(0).endsWith("2026-03-01: 12500") ? "Monday test PASSED" : "FAILED " + outbox);

        outbox.clear();
        new DailyReportJob(fakeSales, fakeMailer, at("2026-03-01"), "boss@shop.in").run();   // Sunday
        System.out.println(outbox.isEmpty() ? "Sunday test PASSED" : "FAILED " + outbox);

        new DailyReportJob(fakeSales, fakeMailer, at("2026-03-03"), "boss@shop.in").run();   // Tuesday, no sales yesterday
        System.out.println(outbox.get(0));

        Mailer down = (to, body) -> { throw new IllegalStateException("smtp down"); };
        try { new DailyReportJob(fakeSales, down, at("2026-03-04"), "boss@shop.in").run(); }
        catch (IllegalStateException e) { System.out.println("mailer failed: " + e.getMessage()); }
    }
}`,
        alt: [
          { lang: 'python', code: `from abc import ABC, abstractmethod
from datetime import date, timedelta
from typing import Callable

Clock = Callable[[], date]


class SalesQuery(ABC):
    @abstractmethod
    def total_for(self, day: date) -> int: ...


class Mailer(ABC):
    @abstractmethod
    def send(self, to: str, body: str) -> None: ...


class DailyReportJob:
    def __init__(self, sales: SalesQuery, mailer: Mailer, clock: Clock, manager: str) -> None:
        self._sales, self._mailer, self._clock, self._manager = sales, mailer, clock, manager

    def run(self) -> None:
        today = self._clock()
        if today.weekday() == 6:  # Sunday
            return
        yesterday = today - timedelta(days=1)
        self._mailer.send(self._manager, f"Sales {yesterday.isoformat()}: {self._sales.total_for(yesterday)}")


class FakeSales(SalesQuery):  # test fakes: a few lines each
    def total_for(self, day: date) -> int:
        return 12_500 if day == date(2026, 3, 1) else 0


class RecordingMailer(Mailer):
    def __init__(self) -> None:
        self.outbox: list[str] = []

    def send(self, to: str, body: str) -> None:
        self.outbox.append(f"{to} | {body}")


class DownMailer(Mailer):
    def send(self, to: str, body: str) -> None:
        raise RuntimeError("smtp down")


def at(day: str) -> Clock:
    d = date.fromisoformat(day)
    return lambda: d


fake_sales = FakeSales()
mailer = RecordingMailer()
outbox = mailer.outbox

DailyReportJob(fake_sales, mailer, at("2026-03-02"), "boss@shop.in").run()  # Monday
print(outbox[0])
print("Monday test PASSED" if len(outbox) == 1 and outbox[0].endswith("2026-03-01: 12500") else f"FAILED {outbox}")

outbox.clear()
DailyReportJob(fake_sales, mailer, at("2026-03-01"), "boss@shop.in").run()  # Sunday
print("Sunday test PASSED" if not outbox else f"FAILED {outbox}")

DailyReportJob(fake_sales, mailer, at("2026-03-03"), "boss@shop.in").run()  # Tuesday, no sales yesterday
print(outbox[0])

try:
    DailyReportJob(fake_sales, DownMailer(), at("2026-03-04"), "boss@shop.in").run()
except RuntimeError as e:
    print(f"mailer failed: {e}")` },
          { lang: 'ts', code: `interface SalesQuery { totalFor(day: string): number; } // day as yyyy-mm-dd
interface Mailer { send(to: string, body: string): void; }
type Clock = () => Date;

class DailyReportJob {
  constructor(
    private readonly sales: SalesQuery,
    private readonly mailer: Mailer,
    private readonly clock: Clock,
    private readonly manager: string,
  ) {}

  run(): void {
    const today = this.clock();
    if (today.getUTCDay() === 0) return; // Sunday
    const yesterday = new Date(today.getTime() - 86_400_000).toISOString().slice(0, 10);
    this.mailer.send(this.manager, \`Sales \${yesterday}: \${this.sales.totalFor(yesterday)}\`);
  }
}

const at = (day: string): Clock => () => new Date(day + "T06:00:00Z");

const outbox: string[] = [];
const fakeSales: SalesQuery = { totalFor: (day) => (day === "2026-03-01" ? 12_500 : 0) }; // object literals are fakes
const fakeMailer: Mailer = { send: (to, body) => { outbox.push(\`\${to} | \${body}\`); } };

new DailyReportJob(fakeSales, fakeMailer, at("2026-03-02"), "boss@shop.in").run(); // Monday
console.log(outbox[0]);
console.log(outbox.length === 1 && outbox[0].endsWith("2026-03-01: 12500") ? "Monday test PASSED" : \`FAILED \${outbox}\`);

outbox.length = 0;
new DailyReportJob(fakeSales, fakeMailer, at("2026-03-01"), "boss@shop.in").run(); // Sunday
console.log(outbox.length === 0 ? "Sunday test PASSED" : \`FAILED \${outbox}\`);

new DailyReportJob(fakeSales, fakeMailer, at("2026-03-03"), "boss@shop.in").run(); // Tuesday, no sales yesterday
console.log(outbox[0]);

const down: Mailer = { send: () => { throw new Error("smtp down"); } };
try {
  new DailyReportJob(fakeSales, down, at("2026-03-04"), "boss@shop.in").run();
} catch (e) {
  console.log(\`mailer failed: \${(e as Error).message}\`);
}` },
          { lang: 'cpp', code: `// Days are counted since 1970-01-01 (Howard Hinnant's civil-date algorithms).
long long daysFromCivil(int y, int m, int d) {
    y -= m <= 2;
    long long era = (y >= 0 ? y : y - 399) / 400;
    long long yoe = y - era * 400;
    long long doy = (153 * (m + (m > 2 ? -3 : 9)) + 2) / 5 + d - 1;
    long long doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    return era * 146097 + doe - 719468;
}

string isoDate(long long z) {
    z += 719468;
    long long era = (z >= 0 ? z : z - 146096) / 146097;
    long long doe = z - era * 146097;
    long long yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    long long doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    long long mp = (5 * doy + 2) / 153;
    int d = static_cast<int>(doy - (153 * mp + 2) / 5 + 1);
    int m = static_cast<int>(mp < 10 ? mp + 3 : mp - 9);
    long long y = yoe + era * 400 + (m <= 2);
    char buf[16];
    snprintf(buf, sizeof buf, "%04lld-%02d-%02d", y, m, d);
    return buf;
}

using Clock = function<long long()>;  // today as a day number

struct SalesQuery {
    virtual ~SalesQuery() = default;
    virtual long long totalFor(long long day) const = 0;
};
struct Mailer {
    virtual ~Mailer() = default;
    virtual void send(const string& to, const string& body) = 0;
};

class DailyReportJob {
    const SalesQuery& sales_;  // the caller owns the collaborators and outlives the job
    Mailer& mailer_;
    Clock clock_;
    string manager_;

public:
    DailyReportJob(const SalesQuery& sales, Mailer& mailer, Clock clock, string manager)
        : sales_(sales), mailer_(mailer), clock_(move(clock)), manager_(move(manager)) {}

    void run() {
        long long today = clock_();
        if (today % 7 == 3) return;  // 1970-01-01 was a Thursday, so day % 7 == 3 is a Sunday
        long long yesterday = today - 1;
        mailer_.send(manager_, "Sales " + isoDate(yesterday) + ": " + to_string(sales_.totalFor(yesterday)));
    }
};

class FakeSales : public SalesQuery {  // test fakes: a few lines each
public:
    long long totalFor(long long day) const override { return day == daysFromCivil(2026, 3, 1) ? 12'500 : 0; }
};
class RecordingMailer : public Mailer {
public:
    vector<string> outbox;
    void send(const string& to, const string& body) override { outbox.push_back(to + " | " + body); }
};
class DownMailer : public Mailer {
public:
    void send(const string&, const string&) override { throw runtime_error("smtp down"); }
};

Clock at(int y, int m, int d) {
    long long day = daysFromCivil(y, m, d);
    return [day] { return day; };
}

int main() {
    FakeSales sales;
    RecordingMailer mailer;
    auto& outbox = mailer.outbox;

    DailyReportJob(sales, mailer, at(2026, 3, 2), "boss@shop.in").run();  // Monday
    cout << outbox[0] << "\\n";
    bool ok = outbox.size() == 1 && outbox[0].ends_with("2026-03-01: 12500");
    cout << (ok ? "Monday test PASSED" : "FAILED") << "\\n";

    outbox.clear();
    DailyReportJob(sales, mailer, at(2026, 3, 1), "boss@shop.in").run();  // Sunday
    cout << (outbox.empty() ? "Sunday test PASSED" : "FAILED") << "\\n";

    DailyReportJob(sales, mailer, at(2026, 3, 3), "boss@shop.in").run();  // Tuesday, no sales yesterday
    cout << outbox[0] << "\\n";

    DownMailer down;
    try {
        DailyReportJob(sales, down, at(2026, 3, 4), "boss@shop.in").run();
    } catch (const runtime_error& e) {
        cout << "mailer failed: " << e.what() << "\\n";
    }
}` }
        ],
      complexity: `<p>O(1). Tests run in microseconds with no I/O.</p>`,
      followUps: ['What timezone should the Clock use for "yesterday" in a multi-country business?', 'How would you add retries to Mailer without changing DailyReportJob? (Decorator implementing Mailer.)', 'Where is the composition root for a scheduled job?']
    }
  });

  practice.push({
    title: 'Rebuild a Shopping Cart from Its Events', level: 'Easy', tags: ['event sourcing', 'replay', 'fold'], companies: ['Amazon', 'Myntra', 'Shopify'],
    statement: `<p>You receive the event stream of one cart: <code>ItemAdded(sku, qty, unitPrice)</code>, <code>QuantityChanged(sku, qty)</code>, <code>ItemRemoved(sku)</code>, <code>CouponApplied(percent)</code>, <code>CheckedOut</code>. Write <code>replay(events)</code> that returns the current cart (items with quantities, total after coupon, checked-out flag), and <code>stateAt(events, k)</code> for the cart after the first k events.</p>`,
    constraints: `Up to 10<sup>5</sup> events. Prices in paise. Coupon percent applies to the total at the end (latest coupon wins). Events are facts: apply never throws.`,
    example: `<p>Events: +tea 2 @12000, +mug 1 @25000, qty tea→3, coupon 10%, −mug → items {tea: 3}, subtotal 36000, total ${H.c('g', '32400')}. <code>stateAt(k=2)</code> → {tea 2, mug 1}, total 49000.</p>`,
    brute: { why: `<p>Storing only the latest cart row loses the story; and writing replay with validation inside (e.g. "throw if qty changed for a missing sku") makes some historical streams impossible to load.</p>`, code: { lang: 'java', code: `class CartRowBrute {
    final Map<String, Integer> items = new HashMap<>();
    void changeQty(String sku, int q) {
        if (!items.containsKey(sku)) throw new IllegalStateException("unknown sku");   // validation inside replay: old streams may fail to load
        items.put(sku, q);
    }
}`, alt: [{ lang: 'python', code: "class CartRowBrute:\n    def __init__(self): self.items = {}\n\n    def change_qty(self, sku, q):\n        if sku not in self.items: raise RuntimeError(\"unknown sku\")   # validation inside replay: old streams may fail to load\n        self.items[sku] = q\n" }, { lang: 'ts', code: "class CartRowBrute {\n  items = new Map<string, number>();\n  changeQty(sku: string, q: number): void {\n    if (!this.items.has(sku)) throw new Error(\"unknown sku\");   // validation inside replay: old streams may fail to load\n    this.items.set(sku, q);\n  }\n}\n" }, { lang: 'cpp', code: "class CartRowBrute {\npublic:\n    unordered_map<string, int> items;\n    void changeQty(const string& sku, int q) {\n        if (!items.count(sku)) throw runtime_error(\"unknown sku\");   // validation inside replay: old streams may fail to load\n        items[sku] = q;\n    }\n};\n" }] } },
    mcq: { q: 'During replay you find QuantityChanged for a sku that is not in the cart (an old bug wrote it). Best behaviour?', options: ['Apply defensively (ignore or treat as add) — never throw during replay; fix future writes in decide', 'Throw and refuse to load the cart', 'Delete the event from the store', 'Skip the whole stream'], answer: 0, explain: 'Replay must be total. Historical oddities are handled leniently in apply; correctness rules are enforced when new commands are decided.' },
    hints: [`<p>Hint 1: Use a closed set of event types (a sealed interface of records, a union, a <code>std::variant</code>) and an exhaustive <code>switch</code>/<code>match</code> in <code>apply</code>.</p>`, `<p>Hint 2: Keep items in an insertion-ordered map so output order is stable (Java <code>LinkedHashMap</code>; Python <code>dict</code> and JavaScript <code>Map</code> already keep insertion order; in C++ a vector of pairs).</p>`, `<p>Hint 3: <code>stateAt(k)</code> is just <code>replay(events.subList(0, k))</code>.</p>`],
      tests: { io: true, cases: [{ stdin: '', stdout: "tea:4@13000 subtotal=52000 total=46800 checkedOut=true\ntea:2@12000 mug:1@25000 total=49000\ntea:3@12000 total=32400\n(empty) total=0\ntea:4@13000 total=46800\n" }] },
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

    String describe() {
        if (items.isEmpty()) return "(empty)";
        return items.entrySet().stream().map(e -> e.getKey() + ":" + e.getValue().qty() + "@" + e.getValue().unitPrice()).collect(Collectors.joining(" "));
    }
}

class CartDemo {
    public static void main(String[] args) {
        List<CartEvent> log = List.of(new ItemAdded("tea", 2, 12_000), new ItemAdded("mug", 1, 25_000),
            new QuantityChanged("tea", 3), new CouponApplied(10), new ItemRemoved("mug"), new QuantityChanged("ghost", 9),
            new ItemAdded("tea", 1, 13_000), new CheckedOut());
        Cart now = Cart.replay(log);
        System.out.println(now.describe() + " subtotal=" + now.subtotal() + " total=" + now.total() + " checkedOut=" + now.checkedOut);
        Cart early = Cart.stateAt(log, 2);
        System.out.println(early.describe() + " total=" + early.total());
        Cart six = Cart.stateAt(log, 6);                       // the unknown sku "ghost" changed nothing
        System.out.println(six.describe() + " total=" + six.total());
        System.out.println(Cart.stateAt(log, 0).describe() + " total=" + Cart.stateAt(log, 0).total());
        System.out.println(Cart.stateAt(log, 99).describe() + " total=" + Cart.stateAt(log, 99).total());   // k past the end is clamped
    }
}`,
        alt: [
          { lang: 'python', code: `from dataclasses import dataclass
from typing import Union


@dataclass(frozen=True)
class ItemAdded:
    sku: str
    qty: int
    unit_price: int


@dataclass(frozen=True)
class QuantityChanged:
    sku: str
    qty: int


@dataclass(frozen=True)
class ItemRemoved:
    sku: str


@dataclass(frozen=True)
class CouponApplied:
    percent: int


@dataclass(frozen=True)
class CheckedOut:
    pass


CartEvent = Union[ItemAdded, QuantityChanged, ItemRemoved, CouponApplied, CheckedOut]


@dataclass(frozen=True)
class Line:
    qty: int
    unit_price: int


class Cart:
    def __init__(self) -> None:
        self.items: dict[str, Line] = {}
        self.coupon = 0
        self.checked_out = False

    def apply(self, e: CartEvent) -> None:  # pure state change, never throws
        match e:
            case ItemAdded(sku, qty, unit_price):
                old = self.items.get(sku)
                self.items[sku] = Line((old.qty if old else 0) + qty, unit_price)
            case QuantityChanged(sku, qty):
                if sku in self.items:  # lenient: ignore unknown sku
                    self.items[sku] = Line(qty, self.items[sku].unit_price)
            case ItemRemoved(sku):
                self.items.pop(sku, None)
            case CouponApplied(percent):
                self.coupon = percent
            case CheckedOut():
                self.checked_out = True

    def subtotal(self) -> int:
        return sum(l.qty * l.unit_price for l in self.items.values())

    def total(self) -> int:
        return self.subtotal() * (100 - self.coupon) // 100

    def describe(self) -> str:
        if not self.items:
            return "(empty)"
        return " ".join(f"{sku}:{l.qty}@{l.unit_price}" for sku, l in self.items.items())

    @staticmethod
    def replay(events: list[CartEvent]) -> "Cart":
        cart = Cart()
        for e in events:
            cart.apply(e)
        return cart

    @staticmethod
    def state_at(events: list[CartEvent], k: int) -> "Cart":
        return Cart.replay(events[:k])  # slicing clamps k past the end


log: list[CartEvent] = [
    ItemAdded("tea", 2, 12_000), ItemAdded("mug", 1, 25_000), QuantityChanged("tea", 3), CouponApplied(10),
    ItemRemoved("mug"), QuantityChanged("ghost", 9), ItemAdded("tea", 1, 13_000), CheckedOut(),
]
now = Cart.replay(log)
print(f"{now.describe()} subtotal={now.subtotal()} total={now.total()} checkedOut={str(now.checked_out).lower()}")
early = Cart.state_at(log, 2)
print(f"{early.describe()} total={early.total()}")
six = Cart.state_at(log, 6)  # the unknown sku "ghost" changed nothing
print(f"{six.describe()} total={six.total()}")
print(f"{Cart.state_at(log, 0).describe()} total={Cart.state_at(log, 0).total()}")
print(f"{Cart.state_at(log, 99).describe()} total={Cart.state_at(log, 99).total()}")  # k past the end is clamped` },
          { lang: 'ts', code: `type CartEvent =
  | { readonly kind: "ItemAdded"; readonly sku: string; readonly qty: number; readonly unitPrice: number }
  | { readonly kind: "QuantityChanged"; readonly sku: string; readonly qty: number }
  | { readonly kind: "ItemRemoved"; readonly sku: string }
  | { readonly kind: "CouponApplied"; readonly percent: number }
  | { readonly kind: "CheckedOut" };

interface Line { readonly qty: number; readonly unitPrice: number; }

class Cart {
  readonly items = new Map<string, Line>(); // a Map keeps insertion order
  coupon = 0;
  checkedOut = false;

  apply(e: CartEvent): void { // pure state change, never throws
    switch (e.kind) {
      case "ItemAdded": {
        const old = this.items.get(e.sku);
        this.items.set(e.sku, { qty: (old?.qty ?? 0) + e.qty, unitPrice: e.unitPrice });
        break;
      }
      case "QuantityChanged": {
        const old = this.items.get(e.sku);
        if (old !== undefined) this.items.set(e.sku, { qty: e.qty, unitPrice: old.unitPrice }); // lenient: ignore unknown sku
        break;
      }
      case "ItemRemoved": this.items.delete(e.sku); break;
      case "CouponApplied": this.coupon = e.percent; break;
      case "CheckedOut": this.checkedOut = true; break;
    }
  }

  subtotal(): number {
    let sum = 0;
    for (const l of this.items.values()) sum += l.qty * l.unitPrice;
    return sum;
  }
  total(): number { return Math.floor((this.subtotal() * (100 - this.coupon)) / 100); }

  describe(): string {
    if (this.items.size === 0) return "(empty)";
    return [...this.items].map(([sku, l]) => \`\${sku}:\${l.qty}@\${l.unitPrice}\`).join(" ");
  }

  static replay(events: CartEvent[]): Cart {
    const cart = new Cart();
    events.forEach((e) => cart.apply(e));
    return cart;
  }
  static stateAt(events: CartEvent[], k: number): Cart { return Cart.replay(events.slice(0, k)); } // slice clamps k
}

const log: CartEvent[] = [
  { kind: "ItemAdded", sku: "tea", qty: 2, unitPrice: 12_000 },
  { kind: "ItemAdded", sku: "mug", qty: 1, unitPrice: 25_000 },
  { kind: "QuantityChanged", sku: "tea", qty: 3 },
  { kind: "CouponApplied", percent: 10 },
  { kind: "ItemRemoved", sku: "mug" },
  { kind: "QuantityChanged", sku: "ghost", qty: 9 },
  { kind: "ItemAdded", sku: "tea", qty: 1, unitPrice: 13_000 },
  { kind: "CheckedOut" },
];
const now = Cart.replay(log);
console.log(\`\${now.describe()} subtotal=\${now.subtotal()} total=\${now.total()} checkedOut=\${now.checkedOut}\`);
const early = Cart.stateAt(log, 2);
console.log(\`\${early.describe()} total=\${early.total()}\`);
const six = Cart.stateAt(log, 6); // the unknown sku "ghost" changed nothing
console.log(\`\${six.describe()} total=\${six.total()}\`);
console.log(\`\${Cart.stateAt(log, 0).describe()} total=\${Cart.stateAt(log, 0).total()}\`);
console.log(\`\${Cart.stateAt(log, 99).describe()} total=\${Cart.stateAt(log, 99).total()}\`); // k past the end is clamped` },
          { lang: 'cpp', code: `struct ItemAdded { string sku; int qty; long long unitPrice; };
struct QuantityChanged { string sku; int qty; };
struct ItemRemoved { string sku; };
struct CouponApplied { int percent; };
struct CheckedOut {};
using CartEvent = variant<ItemAdded, QuantityChanged, ItemRemoved, CouponApplied, CheckedOut>;

template <class... Ts>
struct Overloaded : Ts... { using Ts::operator()...; };
template <class... Ts>
Overloaded(Ts...) -> Overloaded<Ts...>;

class Cart {
    struct Line {
        string sku;
        int qty;
        long long unitPrice;
    };
    vector<Line> items_;  // insertion order, like LinkedHashMap
    int coupon_ = 0;
    bool checkedOut_ = false;

    vector<Line>::iterator find(const string& sku) {
        return find_if(items_.begin(), items_.end(), [&](const Line& l) { return l.sku == sku; });
    }

public:
    void apply(const CartEvent& e) {  // pure state change, never throws
        visit(Overloaded{
            [&](const ItemAdded& a) {
                auto it = find(a.sku);
                if (it == items_.end()) items_.push_back({a.sku, a.qty, a.unitPrice});
                else { it->qty += a.qty; it->unitPrice = a.unitPrice; }
            },
            [&](const QuantityChanged& q) {
                auto it = find(q.sku);
                if (it != items_.end()) it->qty = q.qty;  // lenient: ignore unknown sku
            },
            [&](const ItemRemoved& r) {
                auto it = find(r.sku);
                if (it != items_.end()) items_.erase(it);
            },
            [&](const CouponApplied& c) { coupon_ = c.percent; },
            [&](const CheckedOut&) { checkedOut_ = true; }}, e);
    }

    long long subtotal() const {
        long long sum = 0;
        for (const Line& l : items_) sum += l.qty * l.unitPrice;
        return sum;
    }
    long long total() const { return subtotal() * (100 - coupon_) / 100; }
    bool checkedOut() const { return checkedOut_; }

    string describe() const {
        if (items_.empty()) return "(empty)";
        string out;
        for (const Line& l : items_)
            out += (out.empty() ? "" : " ") + l.sku + ":" + to_string(l.qty) + "@" + to_string(l.unitPrice);
        return out;
    }

    static Cart replay(const vector<CartEvent>& events) {
        Cart cart;
        for (const auto& e : events) cart.apply(e);
        return cart;
    }
    static Cart stateAt(const vector<CartEvent>& events, size_t k) {
        return replay(vector<CartEvent>(events.begin(), events.begin() + min(k, events.size())));
    }
};

int main() {
    vector<CartEvent> log = {ItemAdded{"tea", 2, 12'000}, ItemAdded{"mug", 1, 25'000}, QuantityChanged{"tea", 3},
                             CouponApplied{10}, ItemRemoved{"mug"}, QuantityChanged{"ghost", 9},
                             ItemAdded{"tea", 1, 13'000}, CheckedOut{}};
    Cart now = Cart::replay(log);
    cout << now.describe() << " subtotal=" << now.subtotal() << " total=" << now.total()
         << " checkedOut=" << boolalpha << now.checkedOut() << "\\n";
    Cart early = Cart::stateAt(log, 2);
    cout << early.describe() << " total=" << early.total() << "\\n";
    Cart six = Cart::stateAt(log, 6);  // the unknown sku "ghost" changed nothing
    cout << six.describe() << " total=" << six.total() << "\\n";
    cout << Cart::stateAt(log, 0).describe() << " total=" << Cart::stateAt(log, 0).total() << "\\n";
    cout << Cart::stateAt(log, 99).describe() << " total=" << Cart::stateAt(log, 99).total() << "\\n";  // k past the end is clamped
}` }
        ],
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
    brute: { why: `<p>One giant <code>Library</code> object holding all members, titles and copies. Every borrow locks the whole library (no concurrency), loading it means loading millions of objects, and catalog edits conflict with lending.</p>`, code: { lang: 'java', code: `class LibraryBrute {
    final Map<String, List<String>> loansByMember = new HashMap<>();   // everything in one object
    final Map<String, String> copyHolder = new HashMap<>();
    synchronized void borrow(String member, String copy) {              // one lock for the entire library
        if (copyHolder.containsKey(copy)) throw new IllegalStateException("copy taken");
        loansByMember.computeIfAbsent(member, k -> new ArrayList<>()).add(copy);
        copyHolder.put(copy, member);
    }
}`, alt: [{ lang: 'python', code: "import threading\n\nclass LibraryBrute:\n    def __init__(self):\n        self.loans_by_member = {}                      # everything in one object\n        self.copy_holder = {}\n        self.lock = threading.Lock()                   # one lock for the entire library\n\n    def borrow(self, member, copy):\n        with self.lock:\n            if copy in self.copy_holder: raise RuntimeError(\"copy taken\")\n            self.loans_by_member.setdefault(member, []).append(copy)\n            self.copy_holder[copy] = member\n" }, { lang: 'ts', code: "import { Mutex } from \"async-mutex\";\n\nclass LibraryBrute {\n  loansByMember = new Map<string, string[]>();         // everything in one object\n  copyHolder = new Map<string, string>();\n  private mutex = new Mutex();                         // one lock for the entire library\n\n  borrow(member: string, copy: string): Promise<void> {\n    return this.mutex.runExclusive(() => {\n      if (this.copyHolder.has(copy)) throw new Error(\"copy taken\");\n      if (!this.loansByMember.has(member)) this.loansByMember.set(member, []);\n      this.loansByMember.get(member)!.push(copy);\n      this.copyHolder.set(copy, member);\n    });\n  }\n}\n" }, { lang: 'cpp', code: "class LibraryBrute {\n    unordered_map<string, vector<string>> loansByMember;   // everything in one object\n    unordered_map<string, string> copyHolder;\n    mutex m;                                               // one lock for the entire library\npublic:\n    void borrow(const string& member, const string& copy) {\n        lock_guard<mutex> g(m);\n        if (copyHolder.count(copy)) throw runtime_error(\"copy taken\");\n        loansByMember[member].push_back(copy);\n        copyHolder[copy] = member;\n    }\n};\n" }] } },
    mcq: { q: 'Rule (2) "one borrower per copy" must be instant. Which aggregate owns it?', options: ['Copy — status and borrower id live there; concurrent lends of the same copy conflict on its version', 'Member', 'Title', 'A global Library aggregate'], answer: 0, explain: 'The invariant needs only the copy\'s own state, so a small Copy aggregate enforces it and optimistic locking on that copy serialises racing lends.' },
    hints: [`<p>Hint 1: List each rule and the data it needs: loans count + fines → Member; copy status → Copy; catalog → Title.</p>`, `<p>Hint 2: <code>borrow</code> touches Member and Copy. Options: (a) modify both in one transaction (pragmatic, documented exception), or (b) Copy first, then a <code>CopyLent</code> event updates Member, with a compensating return if Member rejects.</p>`, `<p>Hint 3: Reference by ID: <code>Copy.borrower</code> is a <code>MemberId</code>, <code>Copy.title</code> is an ISBN; Member keeps a set of <code>CopyId</code>s (bounded by 5).</p>`],
      tests: { io: true, cases: [{ stdin: '', stdout: "OK asha <- c1\nOK asha <- c2\nOK asha <- c3\nOK asha <- c4\nOK asha <- c5\nREJECTED asha c6: loan limit 5\nREJECTED ravi c1: copy already lent\nREJECTED dev c7: unpaid fines\nc6 still available? true\nc7 still available? true\nREJECTED zed c1: unknown member zed\nREJECTED ravi c99: unknown copy c99\nc1 borrower: asha\nversions: asha 5, c1 1, c6 0\n" }] },
      solution: {
      approach: `<p>Three aggregates: <b>Member</b> (active loan copy IDs ≤ 5, fines), <b>Copy</b> (AVAILABLE/LENT, borrower MemberId, ISBN), <b>Title</b> (catalog). Borrowing checks Member rules via <code>member.canBorrow()</code> + <code>member.recordLoan</code>, and Copy rules via <code>copy.lendTo</code>. Here both are saved in one unit of work (an explicit, small exception justified because both are tiny and the rule must be instant); the eventual alternative is described in follow-ups. Versions on both aggregates prevent double lending under concurrency. An unknown member or copy id is a rejection, not a crash.</p>`,
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
        try {
            Member member = members.get(m); Copy copy = copies.get(c);
            if (member == null) throw new IllegalStateException("unknown member " + m.v());
            if (copy == null) throw new IllegalStateException("unknown copy " + c.v());
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
        System.out.println("c7 still available? " + s.copies.get(new CopyId("c7")).borrower().isEmpty());
        System.out.println(s.borrow(new MemberId("zed"), new CopyId("c1")));
        System.out.println(s.borrow(ravi, new CopyId("c99")));
        System.out.println("c1 borrower: " + s.copies.get(new CopyId("c1")).borrower().map(MemberId::v).orElse("nobody"));
        System.out.println("versions: asha " + s.members.get(asha).version + ", c1 " + s.copies.get(new CopyId("c1")).version
                + ", c6 " + s.copies.get(new CopyId("c6")).version);
    }
}`,
        alt: [
          { lang: 'python', code: `from dataclasses import dataclass
from enum import Enum
from typing import Optional


@dataclass(frozen=True)  # value objects: hashable, so they work as dict keys
class MemberId:
    v: str


@dataclass(frozen=True)
class CopyId:
    v: str


@dataclass(frozen=True)
class Isbn:
    v: str


class Member:  # aggregate: lending limits and fines
    MAX = 5
    FINE_BLOCK = 10_000

    def __init__(self, member_id: MemberId, fines_paise: int) -> None:
        self.id = member_id
        self._loans: set[CopyId] = set()
        self._fines_paise = fines_paise
        self.version = 0

    def record_loan(self, c: CopyId) -> None:
        if self._fines_paise >= Member.FINE_BLOCK:
            raise RuntimeError("unpaid fines")
        if len(self._loans) >= Member.MAX:
            raise RuntimeError(f"loan limit {Member.MAX}")
        self._loans.add(c)

    def record_return(self, c: CopyId) -> None:
        self._loans.discard(c)

    def loan_count(self) -> int:
        return len(self._loans)


class Status(Enum):
    AVAILABLE = 1
    LENT = 2


class Copy:  # aggregate: one physical book, one borrower at a time
    def __init__(self, copy_id: CopyId, title: Isbn) -> None:
        self.id, self.title = copy_id, title
        self._status = Status.AVAILABLE
        self._borrower: Optional[MemberId] = None
        self.version = 0

    def lend_to(self, m: MemberId) -> None:
        if self._status == Status.LENT:
            raise RuntimeError("copy already lent")
        self._status, self._borrower = Status.LENT, m

    def give_back(self) -> None:
        self._status, self._borrower = Status.AVAILABLE, None

    @property
    def borrower(self) -> Optional[MemberId]:
        return self._borrower


class LendingService:
    def __init__(self) -> None:
        self.members: dict[MemberId, Member] = {}
        self.copies: dict[CopyId, Copy] = {}

    def borrow(self, m: MemberId, c: CopyId) -> str:
        try:
            member, copy = self.members.get(m), self.copies.get(c)
            if member is None:
                raise RuntimeError(f"unknown member {m.v}")
            if copy is None:
                raise RuntimeError(f"unknown copy {c.v}")
            copy.lend_to(m)  # Copy invariant: one borrower
            try:
                member.record_loan(c)  # Member invariants: limit + fines
            except RuntimeError:
                copy.give_back()  # keep both consistent (one unit of work)
                raise
            copy.version += 1
            member.version += 1  # save both
            return f"OK {m.v} <- {c.v}"
        except RuntimeError as e:
            return f"REJECTED {m.v} {c.v}: {e}"


s = LendingService()
asha, ravi, dev = MemberId("asha"), MemberId("ravi"), MemberId("dev")
for member in (Member(asha, 0), Member(ravi, 0), Member(dev, 15_000)):
    s.members[member.id] = member
for i in range(1, 8):
    cid = CopyId(f"c{i}")
    s.copies[cid] = Copy(cid, Isbn("978-1"))
for i in range(1, 7):
    print(s.borrow(asha, CopyId(f"c{i}")))  # 6th rejected
print(s.borrow(ravi, CopyId("c1")))  # copy already lent
print(s.borrow(dev, CopyId("c7")))  # fines
print("c6 still available?", str(s.copies[CopyId("c6")].borrower is None).lower())
print("c7 still available?", str(s.copies[CopyId("c7")].borrower is None).lower())
print(s.borrow(MemberId("zed"), CopyId("c1")))
print(s.borrow(ravi, CopyId("c99")))
holder = s.copies[CopyId("c1")].borrower
print("c1 borrower:", holder.v if holder else "nobody")
print(f"versions: asha {s.members[asha].version}, c1 {s.copies[CopyId('c1')].version}, c6 {s.copies[CopyId('c6')].version}")` },
          { lang: 'ts', code: `// Value objects as ids. Map keys compare by identity in TypeScript, so the maps are keyed by the id's string.
class MemberId { constructor(readonly v: string) {} }
class CopyId { constructor(readonly v: string) {} }
class Isbn { constructor(readonly v: string) {} }

class Member { // aggregate: lending limits and fines
  static readonly MAX = 5;
  static readonly FINE_BLOCK = 10_000;
  private readonly loans = new Set<string>();
  version = 0;

  constructor(readonly id: MemberId, private readonly finesPaise: number) {}

  recordLoan(c: CopyId): void {
    if (this.finesPaise >= Member.FINE_BLOCK) throw new Error("unpaid fines");
    if (this.loans.size >= Member.MAX) throw new Error(\`loan limit \${Member.MAX}\`);
    this.loans.add(c.v);
  }
  recordReturn(c: CopyId): void { this.loans.delete(c.v); }
  loanCount(): number { return this.loans.size; }
}

type Status = "AVAILABLE" | "LENT";

class Copy { // aggregate: one physical book, one borrower at a time
  private status: Status = "AVAILABLE";
  private holder: MemberId | undefined;
  version = 0;

  constructor(readonly id: CopyId, readonly title: Isbn) {}

  lendTo(m: MemberId): void {
    if (this.status === "LENT") throw new Error("copy already lent");
    this.status = "LENT";
    this.holder = m;
  }
  giveBack(): void { this.status = "AVAILABLE"; this.holder = undefined; }
  borrower(): MemberId | undefined { return this.holder; }
}

class LendingService {
  readonly members = new Map<string, Member>();
  readonly copies = new Map<string, Copy>();

  borrow(m: MemberId, c: CopyId): string {
    try {
      const member = this.members.get(m.v);
      const copy = this.copies.get(c.v);
      if (member === undefined) throw new Error(\`unknown member \${m.v}\`);
      if (copy === undefined) throw new Error(\`unknown copy \${c.v}\`);
      copy.lendTo(m); // Copy invariant: one borrower
      try {
        member.recordLoan(c); // Member invariants: limit + fines
      } catch (e) {
        copy.giveBack(); // keep both consistent (one unit of work)
        throw e;
      }
      copy.version++;
      member.version++; // save both
      return \`OK \${m.v} <- \${c.v}\`;
    } catch (e) {
      return \`REJECTED \${m.v} \${c.v}: \${(e as Error).message}\`;
    }
  }
}

const s = new LendingService();
const asha = new MemberId("asha");
const ravi = new MemberId("ravi");
const dev = new MemberId("dev");
for (const member of [new Member(asha, 0), new Member(ravi, 0), new Member(dev, 15_000)]) s.members.set(member.id.v, member);
for (let i = 1; i <= 7; i++) {
  const cid = new CopyId("c" + i);
  s.copies.set(cid.v, new Copy(cid, new Isbn("978-1")));
}
for (let i = 1; i <= 6; i++) console.log(s.borrow(asha, new CopyId("c" + i))); // 6th rejected
console.log(s.borrow(ravi, new CopyId("c1"))); // copy already lent
console.log(s.borrow(dev, new CopyId("c7"))); // fines
console.log("c6 still available? " + (s.copies.get("c6")!.borrower() === undefined));
console.log("c7 still available? " + (s.copies.get("c7")!.borrower() === undefined));
console.log(s.borrow(new MemberId("zed"), new CopyId("c1")));
console.log(s.borrow(ravi, new CopyId("c99")));
console.log("c1 borrower: " + (s.copies.get("c1")!.borrower()?.v ?? "nobody"));
console.log(\`versions: asha \${s.members.get("asha")!.version}, c1 \${s.copies.get("c1")!.version}, c6 \${s.copies.get("c6")!.version}\`);` },
          { lang: 'cpp', code: `struct MemberId { string v; auto operator<=>(const MemberId&) const = default; };  // value objects: ordered by value
struct CopyId { string v; auto operator<=>(const CopyId&) const = default; };
struct Isbn { string v; };

class Member {  // aggregate: lending limits and fines
    MemberId id_;
    set<CopyId> loans_;
    long long finesPaise_;

public:
    static constexpr int MAX = 5;
    static constexpr long long FINE_BLOCK = 10'000;
    long long version = 0;

    Member(MemberId id, long long fines) : id_(move(id)), finesPaise_(fines) {}
    const MemberId& id() const { return id_; }
    void recordLoan(const CopyId& c) {
        if (finesPaise_ >= FINE_BLOCK) throw runtime_error("unpaid fines");
        if (static_cast<int>(loans_.size()) >= MAX) throw runtime_error("loan limit " + to_string(MAX));
        loans_.insert(c);
    }
    void recordReturn(const CopyId& c) { loans_.erase(c); }
    int loanCount() const { return static_cast<int>(loans_.size()); }
};

class Copy {  // aggregate: one physical book, one borrower at a time
    enum class Status { AVAILABLE, LENT };
    CopyId id_;
    Isbn title_;
    Status status_ = Status::AVAILABLE;
    optional<MemberId> borrower_;

public:
    long long version = 0;

    Copy(CopyId id, Isbn title) : id_(move(id)), title_(move(title)) {}
    void lendTo(const MemberId& m) {
        if (status_ == Status::LENT) throw runtime_error("copy already lent");
        status_ = Status::LENT;
        borrower_ = m;
    }
    void giveBack() { status_ = Status::AVAILABLE; borrower_.reset(); }
    const optional<MemberId>& borrower() const { return borrower_; }
};

class LendingService {
public:
    map<MemberId, Member> members;
    map<CopyId, Copy> copies;

    string borrow(const MemberId& m, const CopyId& c) {
        try {
            auto mi = members.find(m);
            auto ci = copies.find(c);
            if (mi == members.end()) throw runtime_error("unknown member " + m.v);
            if (ci == copies.end()) throw runtime_error("unknown copy " + c.v);
            Member& member = mi->second;
            Copy& copy = ci->second;
            copy.lendTo(m);  // Copy invariant: one borrower
            try {
                member.recordLoan(c);  // Member invariants: limit + fines
            } catch (const runtime_error&) {
                copy.giveBack();  // keep both consistent (one unit of work)
                throw;
            }
            copy.version++;
            member.version++;  // save both
            return "OK " + m.v + " <- " + c.v;
        } catch (const runtime_error& e) {
            return "REJECTED " + m.v + " " + c.v + ": " + e.what();
        }
    }
};

int main() {
    LendingService s;
    MemberId asha{"asha"}, ravi{"ravi"}, dev{"dev"};
    s.members.emplace(asha, Member(asha, 0));
    s.members.emplace(ravi, Member(ravi, 0));
    s.members.emplace(dev, Member(dev, 15'000));
    for (int i = 1; i <= 7; i++) {
        CopyId cid{"c" + to_string(i)};
        s.copies.emplace(cid, Copy(cid, Isbn{"978-1"}));
    }
    for (int i = 1; i <= 6; i++) cout << s.borrow(asha, CopyId{"c" + to_string(i)}) << "\\n";  // 6th rejected
    cout << s.borrow(ravi, CopyId{"c1"}) << "\\n";  // copy already lent
    cout << s.borrow(dev, CopyId{"c7"}) << "\\n";   // fines
    cout << boolalpha;
    cout << "c6 still available? " << !s.copies.at(CopyId{"c6"}).borrower().has_value() << "\\n";
    cout << "c7 still available? " << !s.copies.at(CopyId{"c7"}).borrower().has_value() << "\\n";
    cout << s.borrow(MemberId{"zed"}, CopyId{"c1"}) << "\\n";
    cout << s.borrow(ravi, CopyId{"c99"}) << "\\n";
    const auto& holder = s.copies.at(CopyId{"c1"}).borrower();
    cout << "c1 borrower: " << (holder ? holder->v : "nobody") << "\\n";
    cout << "versions: asha " << s.members.at(asha).version << ", c1 " << s.copies.at(CopyId{"c1"}).version
         << ", c6 " << s.copies.at(CopyId{"c6"}).version << "\\n";
}` }
        ],
      complexity: `<p>O(1) per borrow; each aggregate is tiny (Member ≤ 5 loan IDs). Contention only when two people want the same copy or the same member acts twice concurrently.</p>`,
      followUps: ['Rewrite borrow with eventual consistency: Copy lent → CopyLent event → Member.recordLoan, with CopyReturnForced as compensation.', 'Where do reservations (waitlist per title) live?', 'Why should Title not hold a list of all its Copy objects?']
    }
  });

  practice.push({
    title: 'Payment Methods as Plugins with Capability Selection', level: 'Medium', tags: ['plugin', 'registry', 'open closed'], companies: ['Razorpay', 'Stripe', 'Adyen'],
    statement: `<p>Checkout must show the payment methods that support the buyer's <b>country</b>, <b>currency</b> and <b>amount</b>, sorted by a plugin-provided priority. Plugins: UPI (IN, INR, ≤ ₹1,00,000), Card (any country, INR/USD), PayPal (US/GB, USD/GBP), BNPL (IN, INR, ₹1,000–₹50,000). Requirements: adding a method never edits checkout code; a plugin whose <code>supports</code> throws is skipped and logged; a disabled plugin (by config) never appears; <code>pay(methodId, …)</code> routes to the plugin.</p>`,
    constraints: `Up to 50 plugins; selection per checkout must be fast. Plugins are third-party code: do not trust them not to throw.`,
    example: `<p>Buyer IN, INR, ₹2,000 → ${H.chips(['UPI (p1)', 'BNPL (p2)', 'Card (p3)'])}. Buyer US, USD, $50 → ${H.chips(['PayPal', 'Card'])}. Config disables BNPL → it disappears without code changes.</p>`,
    brute: { why: `<p><code>CheckoutService.methodsFor()</code> is a chain of if/else per method, with country and amount rules for every provider inline. Every new provider or rule change edits and redeploys checkout; a bug in one branch hides all methods.</p>`, code: { lang: 'java', code: `class CheckoutBrute {
    List<String> methodsFor(String country, String cur, long amount) {
        List<String> out = new ArrayList<>();
        if (country.equals("IN") && cur.equals("INR") && amount <= 10_000_000) out.add("UPI");
        if (cur.equals("INR") || cur.equals("USD")) out.add("CARD");
        if ((country.equals("US") || country.equals("GB")) && !cur.equals("INR")) out.add("PAYPAL");
        // a new provider = another if here, in the core checkout code
        return out;
    }
}`, alt: [{ lang: 'python', code: "class CheckoutBrute:\n    def methods_for(self, country, cur, amount):\n        out = []\n        if country == \"IN\" and cur == \"INR\" and amount <= 10_000_000: out.append(\"UPI\")\n        if cur == \"INR\" or cur == \"USD\": out.append(\"CARD\")\n        if country in (\"US\", \"GB\") and cur != \"INR\": out.append(\"PAYPAL\")\n        # a new provider = another if here, in the core checkout code\n        return out\n" }, { lang: 'ts', code: "class CheckoutBrute {\n  methodsFor(country: string, cur: string, amount: number): string[] {\n    const out: string[] = [];\n    if (country === \"IN\" && cur === \"INR\" && amount <= 10_000_000) out.push(\"UPI\");\n    if (cur === \"INR\" || cur === \"USD\") out.push(\"CARD\");\n    if ((country === \"US\" || country === \"GB\") && cur !== \"INR\") out.push(\"PAYPAL\");\n    // a new provider = another if here, in the core checkout code\n    return out;\n  }\n}\n" }, { lang: 'cpp', code: "class CheckoutBrute {\npublic:\n    vector<string> methodsFor(const string& country, const string& cur, long long amount) {\n        vector<string> out;\n        if (country == \"IN\" && cur == \"INR\" && amount <= 10'000'000) out.push_back(\"UPI\");\n        if (cur == \"INR\" || cur == \"USD\") out.push_back(\"CARD\");\n        if ((country == \"US\" || country == \"GB\") && cur != \"INR\") out.push_back(\"PAYPAL\");\n        // a new provider = another if here, in the core checkout code\n        return out;\n    }\n};\n" }] } },
    mcq: { q: 'A plugin\'s supports() throws an unexpected error for some country. What should the registry do?', options: ['Catch it, log with the plugin id, treat as "not supported" and continue', 'Let the checkout page fail', 'Remove all plugins', 'Retry forever'], answer: 0, explain: 'Plugin failures are isolated at the boundary; the core degrades gracefully.' },
    hints: [`<p>Hint 1: Extension point: <code>id()</code>, <code>priority()</code>, <code>supports(PaymentContext)</code>, <code>pay(...)</code>.</p>`, `<p>Hint 2: <code>PaymentContext</code> is an immutable value object (country, currency, amountMinor) — a value object handed to plugins, so they cannot mutate core state.</p>`, `<p>Hint 3: <code>available(ctx)</code> = filter enabled → safe supports → sort by priority then id.</p>`],
      tests: { io: true, cases: [{ stdin: '', stdout: "[upi, bnpl, card]\n[paypal, card]\nUPI collect request for order-17\n[upi, card]\n[upi, card]\n[upi, bnpl, card]\n[card]\npaypal not available for IN INR 200000\nbitcoin not available for IN INR 200000\nduplicate upi\nlog: 8 x flaky supports() failed: region table not loaded\n" }] },
      solution: {
      approach: `<p>The core defines <code>PaymentPlugin</code> and an immutable <code>PaymentContext</code>. A <code>PaymentRegistry</code> holds plugins by id, filters by config and capability with a guarded call, sorts by priority, and routes <code>pay</code> by id. Each provider is one class; config is a plain set of disabled ids.</p>`,
      code: `record PaymentContext(String country, String currency, long amountMinor) {
    @Override public String toString() { return country + " " + currency + " " + amountMinor; }
}

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
        try { return p.supports(ctx); } catch (RuntimeException e) { log.add(p.id() + " supports() failed: " + e.getMessage()); return false; }
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
    public boolean supports(PaymentContext c) { throw new IllegalStateException("region table not loaded"); }
    public String pay(PaymentContext c, String ref) { return "never"; }
}

class PaymentDemo {
    static void attempt(Runnable action) {
        try { action.run(); } catch (IllegalArgumentException e) { System.out.println(e.getMessage()); }
    }

    public static void main(String[] args) {
        PaymentRegistry reg = new PaymentRegistry(Set.of());
        List.of(new Upi(), new Card(), new PayPal(), new Bnpl(), new Flaky()).forEach(reg::register);
        PaymentContext in = new PaymentContext("IN", "INR", 200_000);
        System.out.println(reg.available(in));                                         // [upi, bnpl, card]
        System.out.println(reg.available(new PaymentContext("US", "USD", 5_000)));    // [paypal, card]
        System.out.println(reg.pay("upi", in, "order-17"));
        PaymentRegistry noBnpl = new PaymentRegistry(Set.of("bnpl"));
        List.of(new Upi(), new Card(), new Bnpl()).forEach(noBnpl::register);
        System.out.println(noBnpl.available(in));                                      // [upi, card]
        System.out.println(reg.available(new PaymentContext("IN", "INR", 99_999)));   // BNPL needs at least 100000
        System.out.println(reg.available(new PaymentContext("IN", "INR", 100_000)));  // the bound is inclusive
        System.out.println(reg.available(new PaymentContext("IN", "INR", 20_000_000))); // above the UPI and BNPL limits
        attempt(() -> reg.pay("paypal", in, "order-18"));
        attempt(() -> reg.pay("bitcoin", in, "order-19"));
        attempt(() -> reg.register(new Upi()));
        System.out.println("log: " + reg.log.size() + " x " + reg.log.get(0));          // one entry per call, the broken plugin never hides the others
    }
}`,
        alt: [
          { lang: 'python', code: `from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass(frozen=True)
class PaymentContext:
    country: str
    currency: str
    amount_minor: int

    def __str__(self) -> str:
        return f"{self.country} {self.currency} {self.amount_minor}"


class PaymentPlugin(ABC):  # the extension point
    id: str
    priority: int

    @abstractmethod
    def supports(self, ctx: PaymentContext) -> bool: ...

    @abstractmethod
    def pay(self, ctx: PaymentContext, ref: str) -> str: ...


class PaymentRegistry:
    def __init__(self, disabled: set[str]) -> None:
        self._plugins: dict[str, PaymentPlugin] = {}
        self._disabled = set(disabled)
        self.log: list[str] = []

    def register(self, p: PaymentPlugin) -> None:
        if p.id in self._plugins:
            raise ValueError(f"duplicate {p.id}")
        self._plugins[p.id] = p

    def available(self, ctx: PaymentContext) -> list[str]:
        usable = [p for p in self._plugins.values() if p.id not in self._disabled and self._safe_supports(p, ctx)]
        usable.sort(key=lambda p: (p.priority, p.id))
        return [p.id for p in usable]

    def _safe_supports(self, p: PaymentPlugin, ctx: PaymentContext) -> bool:
        try:
            return p.supports(ctx)
        except Exception as e:  # a broken plugin must not hide the others
            self.log.append(f"{p.id} supports() failed: {e}")
            return False

    def pay(self, plugin_id: str, ctx: PaymentContext, ref: str) -> str:
        if plugin_id not in self.available(ctx):
            raise ValueError(f"{plugin_id} not available for {ctx}")
        return self._plugins[plugin_id].pay(ctx, ref)


class Upi(PaymentPlugin):
    id, priority = "upi", 1

    def supports(self, c: PaymentContext) -> bool:
        return c.country == "IN" and c.currency == "INR" and c.amount_minor <= 10_000_000

    def pay(self, c: PaymentContext, ref: str) -> str:
        return f"UPI collect request for {ref}"


class Card(PaymentPlugin):
    id, priority = "card", 3

    def supports(self, c: PaymentContext) -> bool:
        return c.currency in {"INR", "USD"}

    def pay(self, c: PaymentContext, ref: str) -> str:
        return f"card auth for {ref}"


class PayPal(PaymentPlugin):
    id, priority = "paypal", 2

    def supports(self, c: PaymentContext) -> bool:
        return c.country in {"US", "GB"} and c.currency in {"USD", "GBP"}

    def pay(self, c: PaymentContext, ref: str) -> str:
        return f"paypal redirect for {ref}"


class Bnpl(PaymentPlugin):
    id, priority = "bnpl", 2

    def supports(self, c: PaymentContext) -> bool:
        return c.country == "IN" and 100_000 <= c.amount_minor <= 5_000_000

    def pay(self, c: PaymentContext, ref: str) -> str:
        return f"bnpl plan for {ref}"


class Flaky(PaymentPlugin):
    id, priority = "flaky", 0

    def supports(self, c: PaymentContext) -> bool:
        raise RuntimeError("region table not loaded")

    def pay(self, c: PaymentContext, ref: str) -> str:
        return "never"


def show(items: list[str]) -> str:
    return "[" + ", ".join(items) + "]"


def attempt(action) -> None:
    try:
        action()
    except ValueError as e:
        print(e)


reg = PaymentRegistry(set())
for plugin in (Upi(), Card(), PayPal(), Bnpl(), Flaky()):
    reg.register(plugin)
ctx_in = PaymentContext("IN", "INR", 200_000)
print(show(reg.available(ctx_in)))  # [upi, bnpl, card]
print(show(reg.available(PaymentContext("US", "USD", 5_000))))  # [paypal, card]
print(reg.pay("upi", ctx_in, "order-17"))
no_bnpl = PaymentRegistry({"bnpl"})
for plugin in (Upi(), Card(), Bnpl()):
    no_bnpl.register(plugin)
print(show(no_bnpl.available(ctx_in)))  # [upi, card]
print(show(reg.available(PaymentContext("IN", "INR", 99_999))))  # BNPL needs at least 100000
print(show(reg.available(PaymentContext("IN", "INR", 100_000))))  # the bound is inclusive
print(show(reg.available(PaymentContext("IN", "INR", 20_000_000))))  # above the UPI and BNPL limits
attempt(lambda: reg.pay("paypal", ctx_in, "order-18"))
attempt(lambda: reg.pay("bitcoin", ctx_in, "order-19"))
attempt(lambda: reg.register(Upi()))
print(f"log: {len(reg.log)} x {reg.log[0]}")  # one entry per call, the broken plugin never hides the others` },
          { lang: 'ts', code: `interface PaymentContext { readonly country: string; readonly currency: string; readonly amountMinor: number; }
const describe = (c: PaymentContext): string => \`\${c.country} \${c.currency} \${c.amountMinor}\`;

interface PaymentPlugin { // the extension point
  readonly id: string;
  readonly priority: number;
  supports(ctx: PaymentContext): boolean;
  pay(ctx: PaymentContext, ref: string): string;
}

class PaymentRegistry {
  private readonly plugins = new Map<string, PaymentPlugin>();
  readonly log: string[] = [];

  constructor(private readonly disabled: ReadonlySet<string>) {}

  register(p: PaymentPlugin): void {
    if (this.plugins.has(p.id)) throw new Error(\`duplicate \${p.id}\`);
    this.plugins.set(p.id, p);
  }

  available(ctx: PaymentContext): string[] {
    return [...this.plugins.values()]
      .filter((p) => !this.disabled.has(p.id) && this.safeSupports(p, ctx))
      .sort((a, b) => a.priority - b.priority || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
      .map((p) => p.id);
  }

  private safeSupports(p: PaymentPlugin, ctx: PaymentContext): boolean {
    try {
      return p.supports(ctx);
    } catch (e) { // a broken plugin must not hide the others
      this.log.push(\`\${p.id} supports() failed: \${(e as Error).message}\`);
      return false;
    }
  }

  pay(id: string, ctx: PaymentContext, ref: string): string {
    if (!this.available(ctx).includes(id)) throw new Error(\`\${id} not available for \${describe(ctx)}\`);
    return this.plugins.get(id)!.pay(ctx, ref);
  }
}

class Upi implements PaymentPlugin {
  readonly id = "upi";
  readonly priority = 1;
  supports(c: PaymentContext): boolean { return c.country === "IN" && c.currency === "INR" && c.amountMinor <= 10_000_000; }
  pay(_c: PaymentContext, ref: string): string { return \`UPI collect request for \${ref}\`; }
}
class Card implements PaymentPlugin {
  readonly id = "card";
  readonly priority = 3;
  supports(c: PaymentContext): boolean { return ["INR", "USD"].includes(c.currency); }
  pay(_c: PaymentContext, ref: string): string { return \`card auth for \${ref}\`; }
}
class PayPal implements PaymentPlugin {
  readonly id = "paypal";
  readonly priority = 2;
  supports(c: PaymentContext): boolean { return ["US", "GB"].includes(c.country) && ["USD", "GBP"].includes(c.currency); }
  pay(_c: PaymentContext, ref: string): string { return \`paypal redirect for \${ref}\`; }
}
class Bnpl implements PaymentPlugin {
  readonly id = "bnpl";
  readonly priority = 2;
  supports(c: PaymentContext): boolean { return c.country === "IN" && c.amountMinor >= 100_000 && c.amountMinor <= 5_000_000; }
  pay(_c: PaymentContext, ref: string): string { return \`bnpl plan for \${ref}\`; }
}
class Flaky implements PaymentPlugin {
  readonly id = "flaky";
  readonly priority = 0;
  supports(): boolean { throw new Error("region table not loaded"); }
  pay(): string { return "never"; }
}

const show = (items: string[]): string => "[" + items.join(", ") + "]";

function attempt(action: () => void): void {
  try { action(); } catch (e) { console.log((e as Error).message); }
}

const reg = new PaymentRegistry(new Set());
for (const plugin of [new Upi(), new Card(), new PayPal(), new Bnpl(), new Flaky()]) reg.register(plugin);
const ctxIn: PaymentContext = { country: "IN", currency: "INR", amountMinor: 200_000 };
console.log(show(reg.available(ctxIn))); // [upi, bnpl, card]
console.log(show(reg.available({ country: "US", currency: "USD", amountMinor: 5_000 }))); // [paypal, card]
console.log(reg.pay("upi", ctxIn, "order-17"));
const noBnpl = new PaymentRegistry(new Set(["bnpl"]));
for (const plugin of [new Upi(), new Card(), new Bnpl()]) noBnpl.register(plugin);
console.log(show(noBnpl.available(ctxIn))); // [upi, card]
console.log(show(reg.available({ country: "IN", currency: "INR", amountMinor: 99_999 }))); // BNPL needs at least 100000
console.log(show(reg.available({ country: "IN", currency: "INR", amountMinor: 100_000 }))); // the bound is inclusive
console.log(show(reg.available({ country: "IN", currency: "INR", amountMinor: 20_000_000 }))); // above the UPI and BNPL limits
attempt(() => reg.pay("paypal", ctxIn, "order-18"));
attempt(() => reg.pay("bitcoin", ctxIn, "order-19"));
attempt(() => reg.register(new Upi()));
console.log(\`log: \${reg.log.length} x \${reg.log[0]}\`); // one entry per call, the broken plugin never hides the others` },
          { lang: 'cpp', code: `struct PaymentContext {
    string country, currency;
    long long amountMinor;
    string str() const { return country + " " + currency + " " + to_string(amountMinor); }
};

class PaymentPlugin {  // the extension point
public:
    virtual ~PaymentPlugin() = default;
    virtual string id() const = 0;
    virtual int priority() const = 0;
    virtual bool supports(const PaymentContext& ctx) const = 0;
    virtual string pay(const PaymentContext& ctx, const string& ref) const = 0;
};

class PaymentRegistry {
    vector<unique_ptr<PaymentPlugin>> plugins_;  // the registry owns its plugins
    set<string> disabled_;

    bool safeSupports(const PaymentPlugin& p, const PaymentContext& ctx) {
        try {
            return p.supports(ctx);
        } catch (const exception& e) {  // a broken plugin must not hide the others
            log.push_back(p.id() + " supports() failed: " + e.what());
            return false;
        }
    }

public:
    vector<string> log;
    explicit PaymentRegistry(set<string> disabled) : disabled_(move(disabled)) {}

    void registerPlugin(unique_ptr<PaymentPlugin> p) {
        for (const auto& q : plugins_) if (q->id() == p->id()) throw invalid_argument("duplicate " + p->id());
        plugins_.push_back(move(p));
    }

    vector<string> available(const PaymentContext& ctx) {
        vector<const PaymentPlugin*> usable;
        for (const auto& p : plugins_) if (!disabled_.count(p->id()) && safeSupports(*p, ctx)) usable.push_back(p.get());
        sort(usable.begin(), usable.end(), [](const PaymentPlugin* a, const PaymentPlugin* b) {
            return make_pair(a->priority(), a->id()) < make_pair(b->priority(), b->id());
        });
        vector<string> ids;
        for (const auto* p : usable) ids.push_back(p->id());
        return ids;
    }

    string pay(const string& id, const PaymentContext& ctx, const string& ref) {
        auto ids = available(ctx);
        if (find(ids.begin(), ids.end(), id) == ids.end()) throw invalid_argument(id + " not available for " + ctx.str());
        for (const auto& p : plugins_) if (p->id() == id) return p->pay(ctx, ref);
        throw logic_error("unreachable");
    }
};

class Upi : public PaymentPlugin {
public:
    string id() const override { return "upi"; }
    int priority() const override { return 1; }
    bool supports(const PaymentContext& c) const override { return c.country == "IN" && c.currency == "INR" && c.amountMinor <= 10'000'000; }
    string pay(const PaymentContext&, const string& ref) const override { return "UPI collect request for " + ref; }
};
class Card : public PaymentPlugin {
public:
    string id() const override { return "card"; }
    int priority() const override { return 3; }
    bool supports(const PaymentContext& c) const override { return c.currency == "INR" || c.currency == "USD"; }
    string pay(const PaymentContext&, const string& ref) const override { return "card auth for " + ref; }
};
class PayPal : public PaymentPlugin {
public:
    string id() const override { return "paypal"; }
    int priority() const override { return 2; }
    bool supports(const PaymentContext& c) const override {
        return (c.country == "US" || c.country == "GB") && (c.currency == "USD" || c.currency == "GBP");
    }
    string pay(const PaymentContext&, const string& ref) const override { return "paypal redirect for " + ref; }
};
class Bnpl : public PaymentPlugin {
public:
    string id() const override { return "bnpl"; }
    int priority() const override { return 2; }
    bool supports(const PaymentContext& c) const override { return c.country == "IN" && c.amountMinor >= 100'000 && c.amountMinor <= 5'000'000; }
    string pay(const PaymentContext&, const string& ref) const override { return "bnpl plan for " + ref; }
};
class Flaky : public PaymentPlugin {
public:
    string id() const override { return "flaky"; }
    int priority() const override { return 0; }
    bool supports(const PaymentContext&) const override { throw runtime_error("region table not loaded"); }
    string pay(const PaymentContext&, const string&) const override { return "never"; }
};

string show(const vector<string>& items) {
    string out = "[";
    for (size_t i = 0; i < items.size(); i++) out += (i ? ", " : "") + items[i];
    return out + "]";
}

void attempt(const function<void()>& action) {
    try { action(); } catch (const invalid_argument& e) { cout << e.what() << "\\n"; }
}

int main() {
    PaymentRegistry reg({});
    reg.registerPlugin(make_unique<Upi>());
    reg.registerPlugin(make_unique<Card>());
    reg.registerPlugin(make_unique<PayPal>());
    reg.registerPlugin(make_unique<Bnpl>());
    reg.registerPlugin(make_unique<Flaky>());
    PaymentContext in{"IN", "INR", 200'000};
    cout << show(reg.available(in)) << "\\n";                                // [upi, bnpl, card]
    cout << show(reg.available({"US", "USD", 5'000})) << "\\n";              // [paypal, card]
    cout << reg.pay("upi", in, "order-17") << "\\n";
    PaymentRegistry noBnpl({"bnpl"});
    noBnpl.registerPlugin(make_unique<Upi>());
    noBnpl.registerPlugin(make_unique<Card>());
    noBnpl.registerPlugin(make_unique<Bnpl>());
    cout << show(noBnpl.available(in)) << "\\n";                            // [upi, card]
    cout << show(reg.available({"IN", "INR", 99'999})) << "\\n";            // BNPL needs at least 100000
    cout << show(reg.available({"IN", "INR", 100'000})) << "\\n";           // the bound is inclusive
    cout << show(reg.available({"IN", "INR", 20'000'000})) << "\\n";        // above the UPI and BNPL limits
    attempt([&] { reg.pay("paypal", in, "order-18"); });
    attempt([&] { reg.pay("bitcoin", in, "order-19"); });
    attempt([&] { reg.registerPlugin(make_unique<Upi>()); });
    cout << "log: " << reg.log.size() << " x " << reg.log[0] << "\\n";       // one entry per call, the broken plugin never hides the others
}` }
        ],
      complexity: `<p>O(P log P) per checkout for P plugins (tiny). Adding a method: one class + one registration (or a discovered entry).</p>`,
      followUps: ['How would you A/B test the ordering of payment methods without touching plugins?', 'How do you time-box a slow supports() call?', 'How would plugins declare required config (API keys) and fail startup cleanly if missing?']
    }
  });

  practice.push({
    title: 'Hotel Booking: Model the Domain with a No-Overlap Invariant', level: 'Medium', tags: ['aggregate', 'value object', 'repository', 'invariants'], companies: ['Booking.com', 'OYO', 'Airbnb', 'MakeMyTrip'],
    statement: `<p>Model hotel room booking. A <b>room</b> cannot have two confirmed bookings with overlapping dates (checkout day may equal the next check-in day). Bookings can be cancelled (frees the dates). Price = nightly rate × nights, with weekend nights (Fri, Sat) at +20%. Identify entities, value objects and the aggregate that owns the no-overlap rule; implement it with a repository port and in-memory adapter with optimistic locking.</p>`,
    constraints: `Thousands of bookings per room per year. Two guests may try to book the same room for overlapping dates at the same time.`,
    example: `<p>Room 101: booked 1–4 May (${H.c('g', 'ok')}), 4–6 May (${H.c('g', 'ok, checkout = check-in')}), 3–5 May (${H.c('r', 'overlap')}). Cancel 1–4 May, then 3–5 May overlaps 4–6 May → still ${H.c('r', 'rejected')}. Price for Thu–Sun (3 nights: Thu, Fri, Sat) at ₹3,000 = 3000 + 3600 + 3600 = ${H.c('b', '₹10,200')}.</p>`,
    brute: { why: `<p><code>BookingService</code> queries "any overlapping booking?" then inserts a new <code>Booking</code> row. Two concurrent requests both see "no overlap" and both insert: double booking. Dates are strings, so <code>end &lt; start</code> slips through, and price logic lives in the controller.</p>`, code: { lang: 'java', code: `class BookingServiceBrute {
    final List<String[]> rows = new ArrayList<>();          // {room, start, end} as strings
    void book(String room, String start, String end) {
        boolean clash = rows.stream().anyMatch(r -> r[0].equals(room) && r[1].compareTo(end) < 0 && start.compareTo(r[2]) < 0);
        // race window: another request can insert here
        if (!clash) rows.add(new String[]{room, start, end});
    }
}`, alt: [{ lang: 'python', code: "class BookingServiceBrute:\n    def __init__(self):\n        self.rows = []                                 # (room, start, end) with dates as strings\n\n    def book(self, room, start, end):\n        clash = any(r[0] == room and r[1] < end and start < r[2] for r in self.rows)\n        # race window: another request can insert here\n        if not clash: self.rows.append((room, start, end))\n" }, { lang: 'ts', code: "class BookingServiceBrute {\n  private rows: string[][] = [];                      // [room, start, end] as strings\n  book(room: string, start: string, end: string): void {\n    const clash = this.rows.some((r) => r[0] === room && r[1] < end && start < r[2]);\n    // race window: another request can insert here\n    if (!clash) this.rows.push([room, start, end]);\n  }\n}\n" }, { lang: 'cpp', code: "class BookingServiceBrute {\n    vector<array<string, 3>> rows;                     // {room, start, end} as strings\npublic:\n    void book(const string& room, const string& start, const string& end) {\n        bool clash = any_of(rows.begin(), rows.end(), [&](auto& r) { return r[0] == room && r[1] < end && start < r[2]; });\n        // race window: another request can insert here\n        if (!clash) rows.push_back({room, start, end});\n    }\n};\n" }] } },
    mcq: { q: 'Which aggregate best enforces "no overlapping bookings for a room"?', options: ['RoomCalendar (per room): holds that room\'s confirmed date ranges and a version', 'Booking (each booking is independent)', 'Hotel (all rooms and all bookings)', 'Guest'], answer: 0, explain: 'The invariant needs all bookings of one room together, instantly. A per-room calendar is the smallest boundary that contains that data; its version serialises concurrent bookings for the same room only.' },
    hints: [`<p>Hint 1: Value objects: <code>DateRange</code> (half-open [start, end)), <code>Money</code>/<code>long paise</code>, <code>RoomNo</code>. Entity inside the aggregate: <code>Reservation</code> with id and status.</p>`, `<p>Hint 2: <code>RoomCalendar.reserve(range, guest)</code> checks overlap against CONFIRMED reservations only.</p>`, `<p>Hint 3: To keep the aggregate small, keep only future reservations (archive past ones). Pricing is a pure function over the DateRange.</p>`],
      tests: { io: true, cases: [{ stdin: '', stdout: "b1 ok | b2 ok | b3 rejected: 101 busy 2026-05-01..2026-05-04\nb4 rejected: 101 busy 2026-05-04..2026-05-06\nc1 ok\nc1 rejected: duplicate reservation c1\nsecond guest: conflict on 101\nThu-Sun price: 10200\nstart < end required\nnothing to cancel\n" }] },
      solution: {
      approach: `<p><code>DateRange</code> VO owns overlap and night iteration. <code>RoomCalendar</code> aggregate (root) holds reservations for one room and enforces no-overlap; cancel marks a reservation CANCELLED. <code>Pricing</code> is a pure function. The repository stores per-room snapshots with a version and rejects stale saves; the service retries on conflict. A reservation id can be used once, so history is never overwritten.</p>`,
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
        if (reservations.containsKey(id)) throw new IllegalStateException("duplicate reservation " + id);   // never overwrite history
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
    static void attempt(Runnable action) {
        try { action.run(); } catch (RuntimeException e) { System.out.println(e.getMessage()); }
    }

    public static void main(String[] args) {
        RoomCalendarRepository repo = new InMemoryCalendars();
        System.out.println(book(repo, "101", "b1", 1, 4) + " | " + book(repo, "101", "b2", 4, 6) + " | " + book(repo, "101", "b3", 3, 5));
        RoomCalendar cal = repo.load("101"); cal.cancel("b1"); repo.save(cal);
        System.out.println(book(repo, "101", "b4", 3, 5));                          // still overlaps b2
        System.out.println(book(repo, "102", "c1", 1, 4));                          // another room is another aggregate
        System.out.println(book(repo, "102", "c1", 10, 12));                        // a reservation id is used once
        RoomCalendar x = repo.load("101"), y = repo.load("101");                     // race for 10..12
        x.reserve("r1", "a", new DateRange(MAY.plusDays(9), MAY.plusDays(11))); repo.save(x);
        y.reserve("r2", "b", new DateRange(MAY.plusDays(9), MAY.plusDays(11)));
        try { repo.save(y); } catch (IllegalStateException e) { System.out.println("second guest: " + e.getMessage()); }
        System.out.println("Thu-Sun price: " + Pricing.price(new DateRange(LocalDate.of(2026, 5, 7), LocalDate.of(2026, 5, 10)), 3000));
        attempt(() -> new DateRange(MAY, MAY));
        attempt(() -> repo.load("101").cancel("b1"));                               // already cancelled
    }
}`,
        alt: [
          { lang: 'python', code: `import copy as copymod
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import date, timedelta
from enum import Enum
from typing import Callable


@dataclass(frozen=True)  # value object: equal by value, immutable
class DateRange:  # [start, end)
    start: date
    end: date

    def __post_init__(self) -> None:
        if not self.start < self.end:
            raise ValueError("start < end required")

    def overlaps(self, o: "DateRange") -> bool:
        return self.start < o.end and o.start < self.end

    def nights(self) -> list[date]:
        return [self.start + timedelta(days=i) for i in range((self.end - self.start).days)]


class Pricing:
    @staticmethod
    def price(r: DateRange, nightly: int) -> int:
        total = 0
        for d in r.nights():
            weekend = d.weekday() in (4, 5)  # Friday, Saturday
            total += nightly * 120 // 100 if weekend else nightly
        return total


class Status(Enum):
    CONFIRMED = 1
    CANCELLED = 2


class Reservation:
    def __init__(self, res_id: str, guest: str, rng: DateRange) -> None:
        self.id, self.guest, self.range = res_id, guest, rng
        self.status = Status.CONFIRMED


class RoomCalendar:  # aggregate root, one per room
    def __init__(self, room: str) -> None:
        self.room = room
        self.version = 0
        self._reservations: dict[str, Reservation] = {}

    def reserve(self, res_id: str, guest: str, r: DateRange) -> str:
        if res_id in self._reservations:
            raise RuntimeError(f"duplicate reservation {res_id}")  # never overwrite history
        for x in self._reservations.values():
            if x.status == Status.CONFIRMED and x.range.overlaps(r):
                raise RuntimeError(f"{self.room} busy {x.range.start.isoformat()}..{x.range.end.isoformat()}")
        self._reservations[res_id] = Reservation(res_id, guest, r)
        return res_id

    def cancel(self, res_id: str) -> None:
        x = self._reservations.get(res_id)
        if x is None or x.status == Status.CANCELLED:
            raise RuntimeError("nothing to cancel")
        x.status = Status.CANCELLED

    def copy(self) -> "RoomCalendar":
        return copymod.deepcopy(self)


class RoomCalendarRepository(ABC):
    @abstractmethod
    def load(self, room: str) -> RoomCalendar: ...

    @abstractmethod
    def save(self, c: RoomCalendar) -> None: ...


class InMemoryCalendars(RoomCalendarRepository):
    def __init__(self) -> None:
        self._db: dict[str, RoomCalendar] = {}

    def load(self, room: str) -> RoomCalendar:
        return self._db.setdefault(room, RoomCalendar(room)).copy()

    def save(self, c: RoomCalendar) -> None:
        cur = self._db.get(c.room)
        if cur is not None and cur.version != c.version:
            raise RuntimeError(f"conflict on {c.room}")
        stored = c.copy()
        stored.version += 1
        self._db[c.room] = stored


MAY = date(2026, 5, 1)


def book(repo: RoomCalendarRepository, room: str, res_id: str, start: int, end: int) -> str:
    cal = repo.load(room)
    try:
        cal.reserve(res_id, "guest-" + res_id, DateRange(MAY + timedelta(days=start - 1), MAY + timedelta(days=end - 1)))
        repo.save(cal)
        return f"{res_id} ok"
    except RuntimeError as e:
        return f"{res_id} rejected: {e}"


def attempt(action: Callable[[], object]) -> None:
    try:
        action()
    except (ValueError, RuntimeError) as e:
        print(e)


repo = InMemoryCalendars()
print(f"{book(repo, '101', 'b1', 1, 4)} | {book(repo, '101', 'b2', 4, 6)} | {book(repo, '101', 'b3', 3, 5)}")
cal = repo.load("101")
cal.cancel("b1")
repo.save(cal)
print(book(repo, "101", "b4", 3, 5))  # still overlaps b2
print(book(repo, "102", "c1", 1, 4))  # another room is another aggregate
print(book(repo, "102", "c1", 10, 12))  # a reservation id is used once
x, y = repo.load("101"), repo.load("101")  # race for 10..12
x.reserve("r1", "a", DateRange(MAY + timedelta(days=9), MAY + timedelta(days=11)))
repo.save(x)
y.reserve("r2", "b", DateRange(MAY + timedelta(days=9), MAY + timedelta(days=11)))
try:
    repo.save(y)
except RuntimeError as e:
    print(f"second guest: {e}")
print("Thu-Sun price:", Pricing.price(DateRange(date(2026, 5, 7), date(2026, 5, 10)), 3000))
attempt(lambda: DateRange(MAY, MAY))
attempt(lambda: repo.load("101").cancel("b1"))  # already cancelled` },
          { lang: 'ts', code: `const DAY_MS = 86_400_000;
const isoDay = (day: number): string => new Date(day * DAY_MS).toISOString().slice(0, 10);

class DateRange { // [start, end) in whole days since 1970-01-01; immutable
  constructor(readonly start: number, readonly end: number) {
    if (!(start < end)) throw new Error("start < end required");
  }
  overlaps(o: DateRange): boolean { return this.start < o.end && o.start < this.end; }
  nights(): number[] {
    const out: number[] = [];
    for (let d = this.start; d < this.end; d++) out.push(d);
    return out;
  }
}

class Pricing {
  static price(r: DateRange, nightly: number): number {
    let total = 0;
    for (const d of r.nights()) {
      const dow = new Date(d * DAY_MS).getUTCDay();
      const weekend = dow === 5 || dow === 6; // Friday, Saturday
      total += weekend ? Math.floor((nightly * 120) / 100) : nightly;
    }
    return total;
  }
}

type Status = "CONFIRMED" | "CANCELLED";
interface Reservation { readonly id: string; readonly guest: string; readonly range: DateRange; status: Status; }

class RoomCalendar { // aggregate root, one per room
  version = 0;
  private reservations = new Map<string, Reservation>();

  constructor(readonly room: string) {}

  reserve(id: string, guest: string, r: DateRange): string {
    if (this.reservations.has(id)) throw new Error(\`duplicate reservation \${id}\`); // never overwrite history
    for (const x of this.reservations.values()) {
      if (x.status === "CONFIRMED" && x.range.overlaps(r)) {
        throw new Error(\`\${this.room} busy \${isoDay(x.range.start)}..\${isoDay(x.range.end)}\`);
      }
    }
    this.reservations.set(id, { id, guest, range: r, status: "CONFIRMED" });
    return id;
  }

  cancel(id: string): void {
    const x = this.reservations.get(id);
    if (x === undefined || x.status === "CANCELLED") throw new Error("nothing to cancel");
    x.status = "CANCELLED";
  }

  copy(): RoomCalendar {
    const c = new RoomCalendar(this.room);
    c.version = this.version;
    for (const [k, v] of this.reservations) c.reservations.set(k, { ...v });
    return c;
  }
}

interface RoomCalendarRepository { load(room: string): RoomCalendar; save(c: RoomCalendar): void; }

class InMemoryCalendars implements RoomCalendarRepository {
  private readonly db = new Map<string, RoomCalendar>();

  load(room: string): RoomCalendar {
    let c = this.db.get(room);
    if (c === undefined) { c = new RoomCalendar(room); this.db.set(room, c); }
    return c.copy();
  }

  save(c: RoomCalendar): void {
    const cur = this.db.get(c.room);
    if (cur !== undefined && cur.version !== c.version) throw new Error(\`conflict on \${c.room}\`);
    const stored = c.copy();
    stored.version++;
    this.db.set(c.room, stored);
  }
}

const MAY = Date.UTC(2026, 4, 1) / DAY_MS;

function book(repo: RoomCalendarRepository, room: string, id: string, from: number, to: number): string {
  const cal = repo.load(room);
  try {
    cal.reserve(id, "guest-" + id, new DateRange(MAY + from - 1, MAY + to - 1));
    repo.save(cal);
    return \`\${id} ok\`;
  } catch (e) {
    return \`\${id} rejected: \${(e as Error).message}\`;
  }
}

function attempt(action: () => void): void {
  try { action(); } catch (e) { console.log((e as Error).message); }
}

const repo = new InMemoryCalendars();
console.log(\`\${book(repo, "101", "b1", 1, 4)} | \${book(repo, "101", "b2", 4, 6)} | \${book(repo, "101", "b3", 3, 5)}\`);
const cal = repo.load("101");
cal.cancel("b1");
repo.save(cal);
console.log(book(repo, "101", "b4", 3, 5)); // still overlaps b2
console.log(book(repo, "102", "c1", 1, 4)); // another room is another aggregate
console.log(book(repo, "102", "c1", 10, 12)); // a reservation id is used once
const x = repo.load("101");
const y = repo.load("101"); // race for 10..12
x.reserve("r1", "a", new DateRange(MAY + 9, MAY + 11));
repo.save(x);
y.reserve("r2", "b", new DateRange(MAY + 9, MAY + 11));
try { repo.save(y); } catch (e) { console.log(\`second guest: \${(e as Error).message}\`); }
console.log("Thu-Sun price: " + Pricing.price(new DateRange(Date.UTC(2026, 4, 7) / DAY_MS, Date.UTC(2026, 4, 10) / DAY_MS), 3000));
attempt(() => new DateRange(MAY, MAY));
attempt(() => repo.load("101").cancel("b1")); // already cancelled` },
          { lang: 'cpp', code: `// Dates are day numbers since 1970-01-01 (Howard Hinnant's civil-date algorithms).
long long daysFromCivil(int y, int m, int d) {
    y -= m <= 2;
    long long era = (y >= 0 ? y : y - 399) / 400;
    long long yoe = y - era * 400;
    long long doy = (153 * (m + (m > 2 ? -3 : 9)) + 2) / 5 + d - 1;
    long long doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    return era * 146097 + doe - 719468;
}

string isoDate(long long z) {
    z += 719468;
    long long era = (z >= 0 ? z : z - 146096) / 146097;
    long long doe = z - era * 146097;
    long long yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    long long doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    long long mp = (5 * doy + 2) / 153;
    int d = static_cast<int>(doy - (153 * mp + 2) / 5 + 1);
    int m = static_cast<int>(mp < 10 ? mp + 3 : mp - 9);
    long long y = yoe + era * 400 + (m <= 2);
    char buf[16];
    snprintf(buf, sizeof buf, "%04lld-%02d-%02d", y, m, d);
    return buf;
}

class DateRange {  // [start, end), immutable value object
    long long start_, end_;

public:
    DateRange(long long start, long long end) : start_(start), end_(end) {
        if (!(start < end)) throw invalid_argument("start < end required");
    }
    long long start() const { return start_; }
    long long end() const { return end_; }
    bool overlaps(const DateRange& o) const { return start_ < o.end_ && o.start_ < end_; }
};

struct Pricing {
    static long long price(const DateRange& r, long long nightly) {
        long long total = 0;
        for (long long d = r.start(); d < r.end(); d++) {
            long long dow = (d + 4) % 7;  // 0 = Sunday, because 1970-01-01 was a Thursday
            bool weekend = dow == 5 || dow == 6;  // Friday, Saturday
            total += weekend ? nightly * 120 / 100 : nightly;
        }
        return total;
    }
};

class RoomCalendar {  // aggregate root, one per room; copying it gives a detached snapshot
public:
    enum class Status { CONFIRMED, CANCELLED };
    struct Reservation {
        string id, guest;
        DateRange range;
        Status status = Status::CONFIRMED;
    };

    string room;
    long long version = 0;

    explicit RoomCalendar(string r) : room(move(r)) {}

    string reserve(const string& id, const string& guest, const DateRange& r) {
        for (const auto& x : reservations_) if (x.id == id) throw runtime_error("duplicate reservation " + id);  // never overwrite history
        for (const auto& x : reservations_)
            if (x.status == Status::CONFIRMED && x.range.overlaps(r))
                throw runtime_error(room + " busy " + isoDate(x.range.start()) + ".." + isoDate(x.range.end()));
        reservations_.push_back({id, guest, r});
        return id;
    }
    void cancel(const string& id) {
        for (auto& x : reservations_) {
            if (x.id != id) continue;
            if (x.status == Status::CANCELLED) break;
            x.status = Status::CANCELLED;
            return;
        }
        throw runtime_error("nothing to cancel");
    }

private:
    vector<Reservation> reservations_;
};

class RoomCalendarRepository {
public:
    virtual ~RoomCalendarRepository() = default;
    virtual RoomCalendar load(const string& room) = 0;
    virtual void save(const RoomCalendar& c) = 0;
};

class InMemoryCalendars : public RoomCalendarRepository {
    map<string, RoomCalendar> db_;
    mutex m_;

public:
    RoomCalendar load(const string& room) override {
        lock_guard<mutex> lock(m_);
        return db_.try_emplace(room, room).first->second;  // returns a copy
    }
    void save(const RoomCalendar& c) override {
        lock_guard<mutex> lock(m_);
        auto it = db_.find(c.room);
        if (it != db_.end() && it->second.version != c.version) throw runtime_error("conflict on " + c.room);
        RoomCalendar stored = c;
        stored.version++;
        db_.insert_or_assign(c.room, stored);
    }
};

const long long MAY = daysFromCivil(2026, 5, 1);

string book(RoomCalendarRepository& repo, const string& room, const string& id, int from, int to) {
    RoomCalendar cal = repo.load(room);
    try {
        cal.reserve(id, "guest-" + id, DateRange(MAY + from - 1, MAY + to - 1));
        repo.save(cal);
        return id + " ok";
    } catch (const runtime_error& e) {
        return id + " rejected: " + e.what();
    }
}

void attempt(const function<void()>& action) {
    try { action(); } catch (const exception& e) { cout << e.what() << "\\n"; }
}

int main() {
    InMemoryCalendars repo;
    cout << book(repo, "101", "b1", 1, 4) << " | " << book(repo, "101", "b2", 4, 6) << " | " << book(repo, "101", "b3", 3, 5) << "\\n";
    RoomCalendar cal = repo.load("101");
    cal.cancel("b1");
    repo.save(cal);
    cout << book(repo, "101", "b4", 3, 5) << "\\n";   // still overlaps b2
    cout << book(repo, "102", "c1", 1, 4) << "\\n";   // another room is another aggregate
    cout << book(repo, "102", "c1", 10, 12) << "\\n"; // a reservation id is used once
    RoomCalendar x = repo.load("101"), y = repo.load("101");  // race for 10..12
    x.reserve("r1", "a", DateRange(MAY + 9, MAY + 11));
    repo.save(x);
    y.reserve("r2", "b", DateRange(MAY + 9, MAY + 11));
    try {
        repo.save(y);
    } catch (const runtime_error& e) {
        cout << "second guest: " << e.what() << "\\n";
    }
    cout << "Thu-Sun price: " << Pricing::price(DateRange(daysFromCivil(2026, 5, 7), daysFromCivil(2026, 5, 10)), 3000) << "\\n";
    attempt([&] { DateRange r(MAY, MAY); });
    attempt([&] { repo.load("101").cancel("b1"); });  // already cancelled
}` }
        ],
      complexity: `<p>O(R) overlap check for R future reservations of one room (use a sorted map keyed by start date, such as <code>TreeMap</code> or <code>std::map</code>, for O(log R)). Contention is per room, not per hotel.</p>`,
      followUps: ['How would "hold for 10 minutes during payment" fit (a HELD status with expiry)?', 'If a room type (not a specific room) is booked, where does the invariant move?', 'How do you price with dynamic rates without putting the rate engine inside the aggregate?']
    }
  });

  practice.push({
    title: 'Expense Approvals as a Hexagon with Two Driving Adapters', level: 'Medium', tags: ['hexagonal', 'ports', 'use case'], companies: ['SAP', 'Zoho', 'Expensify'],
    statement: `<p>Employees submit expenses; managers approve or reject. Rules: amount &gt; 0; expenses above ₹50,000 need a second approval from finance; an expense unapproved after 7 days is auto-escalated. Build the core with ports and two <b>driving adapters</b>: a command-line adapter (submit/approve) and a <b>scheduler adapter</b> that triggers escalation. Outbound ports: repository, notifier, clock. Show both adapters calling the same core.</p>`,
    constraints: `No frameworks. Use cases must be testable with in-memory adapters. Escalation must be idempotent (running the job twice does not notify twice).`,
    example: `<p>Submit ₹80,000 (day 0) → manager approves → status ${H.c('y', 'NEEDS_FINANCE')}. Submit ₹2,000 (day 0) → no action → scheduler on day 8 → ${H.c('r', 'ESCALATED')}, one notification; scheduler again → no new notification.</p>`,
    brute: { why: `<p>An <code>ExpenseController</code> handles HTTP, the approval rules, SQL and email; the nightly cron is a separate script that copy-pastes the rules with raw SQL. The two drift apart; testing escalation means waiting a week or editing DB timestamps.</p>`, code: { lang: 'java', code: `class ExpenseControllerBrute {
    final Map<String, String> status = new HashMap<>();
    void approve(String id, long amount) {
        status.put(id, amount > 5_000_000 ? "NEEDS_FINANCE" : "APPROVED");   // rule copy #1
        System.out.println("SMTP: approved " + id);
    }
}
// escalate.sh: UPDATE expenses SET status='ESCALATED' WHERE created < now() - 7  -- rule copy #2, no notification dedupe`, alt: [{ lang: 'python', code: "class ExpenseControllerBrute:\n    def __init__(self): self.status = {}\n\n    def approve(self, id_, amount):\n        self.status[id_] = \"NEEDS_FINANCE\" if amount > 5_000_000 else \"APPROVED\"   # rule copy #1\n        print(\"SMTP: approved\", id_)\n\n# escalate.sh: UPDATE expenses SET status='ESCALATED' WHERE created < now() - 7  -- rule copy #2, no notification dedupe\n" }, { lang: 'ts', code: "class ExpenseControllerBrute {\n  status = new Map<string, string>();\n  approve(id: string, amount: number): void {\n    this.status.set(id, amount > 5_000_000 ? \"NEEDS_FINANCE\" : \"APPROVED\");   // rule copy #1\n    console.log(\"SMTP: approved \" + id);\n  }\n}\n// escalate.sh: UPDATE expenses SET status='ESCALATED' WHERE created < now() - 7  -- rule copy #2, no notification dedupe\n" }, { lang: 'cpp', code: "class ExpenseControllerBrute {\npublic:\n    unordered_map<string, string> status;\n    void approve(const string& id, long long amount) {\n        status[id] = amount > 5'000'000 ? \"NEEDS_FINANCE\" : \"APPROVED\";   // rule copy #1\n        cout << \"SMTP: approved \" << id << endl;\n    }\n};\n// escalate.sh: UPDATE expenses SET status='ESCALATED' WHERE created < now() - 7  -- rule copy #2, no notification dedupe\n" }] } },
    mcq: { q: 'The nightly scheduler is which kind of adapter?', options: ['A driving (inbound) adapter: it calls an inbound port such as EscalateOverdueUseCase', 'A driven adapter implementing a repository', 'Part of the domain', 'Not an adapter; it should contain the escalation rules'], answer: 0, explain: 'Anything that triggers the application — HTTP, CLI, cron, a message — is a driving adapter. It contains no rules; it just calls the use case.' },
    hints: [`<p>Hint 1: Domain: <code>Expense</code> with status machine SUBMITTED → APPROVED | NEEDS_FINANCE → APPROVED, REJECTED, ESCALATED; method <code>escalateIfOverdue(now)</code> returns whether it changed.</p>`, `<p>Hint 2: Inbound ports: <code>SubmitExpense</code>, <code>ApproveExpense</code>, <code>EscalateOverdue</code>. Outbound: <code>ExpenseRepository</code>, <code>Notifier</code>, <code>Clock</code>.</p>`, `<p>Hint 3: Idempotency for free: <code>escalateIfOverdue</code> returns false when already escalated, and only a true result triggers notification.</p>`],
      tests: { io: true, cases: [{ stdin: '', stdout: "submitted x1 x2\nNEEDS_FINANCE\nerror: x1 is NEEDS_FINANCE\nerror: unknown role ceo\nerror: unknown expense x9\nerror: amount must be a number\nerror: amount > 0\nusage: submit <emp> <rupees> | approve <id> <manager|finance>\njob escalated 1\njob escalated 0\nerror: x2 is ESCALATED\nAPPROVED\nAPPROVED [escalated x2]\n" }] },
      solution: {
      approach: `<p>The <code>Expense</code> entity owns all state transitions. One application service implements three inbound ports. The CLI adapter parses text commands; the scheduler adapter simply calls <code>escalateOverdue()</code>. Both run against the same service, wired in the composition root with in-memory repository, a recording notifier and a mutable test clock. Only the roles manager and finance are accepted, and an unknown expense id or role is an error rather than a silent manager approval.</p>`,
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
        if (e == null) throw new NoSuchElementException("unknown expense " + id);
        switch (role) {
            case "finance" -> e.approveByFinance();
            case "manager" -> e.approveByManager();
            default -> throw new IllegalArgumentException("unknown role " + role);   // a typo must not grant manager rights
        }
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
        String[] p = line.trim().split(" +");
        try {
            if (p[0].equals("submit") && p.length == 3) return submit.submit(p[1], rupees(p[2]) * 100);
            if (p[0].equals("approve") && p.length == 3) return approve.approve(p[1], p[2]).toString();
            return "usage: submit <emp> <rupees> | approve <id> <manager|finance>";
        } catch (RuntimeException e) { return "error: " + e.getMessage(); }
    }
    private static long rupees(String s) {
        try { return Long.parseLong(s); } catch (NumberFormatException e) { throw new IllegalArgumentException("amount must be a number"); }
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
        System.out.println("submitted " + big + " " + small);
        System.out.println(cli.run("approve " + big + " manager"));      // NEEDS_FINANCE
        System.out.println(cli.run("approve " + big + " manager"));      // already moved on
        System.out.println(cli.run("approve " + big + " ceo"));
        System.out.println(cli.run("approve x9 manager"));
        System.out.println(cli.run("submit sam abc"));
        System.out.println(cli.run("submit sam 0"));
        System.out.println(cli.run("hello"));
        clock.now = clock.now.plus(Duration.ofDays(8));
        job.tick(); job.tick();                                          // 1 then 0: idempotent
        System.out.println(cli.run("approve " + small + " finance"));    // finance only sees big claims
        System.out.println(cli.run("approve " + small + " manager"));    // an escalated claim can still be approved
        System.out.println(cli.run("approve " + big + " finance") + " " + sent);
    }
}`,
        alt: [
          { lang: 'python', code: `from abc import ABC, abstractmethod
from datetime import datetime, timedelta, timezone
from enum import Enum
from typing import Callable, Optional


class ExpenseStatus(Enum):
    SUBMITTED = 1
    NEEDS_FINANCE = 2
    APPROVED = 3
    REJECTED = 4
    ESCALATED = 5


class Expense:  # domain: the rules live here, no I/O
    FINANCE_LIMIT = 5_000_000

    def __init__(self, expense_id: str, employee: str, amount: int, at: datetime) -> None:
        if amount <= 0:
            raise ValueError("amount > 0")
        self.id, self.employee, self.amount, self.submitted_at = expense_id, employee, amount, at
        self.status = ExpenseStatus.SUBMITTED

    def approve_by_manager(self) -> None:
        self._require(ExpenseStatus.SUBMITTED, ExpenseStatus.ESCALATED)
        self.status = ExpenseStatus.NEEDS_FINANCE if self.amount > Expense.FINANCE_LIMIT else ExpenseStatus.APPROVED

    def approve_by_finance(self) -> None:
        self._require(ExpenseStatus.NEEDS_FINANCE)
        self.status = ExpenseStatus.APPROVED

    def escalate_if_overdue(self, now: datetime) -> bool:
        if self.status != ExpenseStatus.SUBMITTED or now < self.submitted_at + timedelta(days=7):
            return False
        self.status = ExpenseStatus.ESCALATED
        return True

    def _require(self, *ok: ExpenseStatus) -> None:
        if self.status not in ok:
            raise RuntimeError(f"{self.id} is {self.status.name}")


class SubmitExpense(ABC):  # inbound ports
    @abstractmethod
    def submit(self, employee: str, amount: int) -> str: ...


class ApproveExpense(ABC):
    @abstractmethod
    def approve(self, expense_id: str, role: str) -> ExpenseStatus: ...


class EscalateOverdue(ABC):
    @abstractmethod
    def escalate_overdue(self) -> int: ...


class ExpenseRepository(ABC):  # outbound ports
    @abstractmethod
    def save(self, e: Expense) -> None: ...

    @abstractmethod
    def get(self, expense_id: str) -> Optional[Expense]: ...

    @abstractmethod
    def all(self) -> list[Expense]: ...


class Notifier(ABC):
    @abstractmethod
    def notify(self, msg: str) -> None: ...


class ExpenseService(SubmitExpense, ApproveExpense, EscalateOverdue):
    def __init__(self, repo: ExpenseRepository, notifier: Notifier, clock: Callable[[], datetime]) -> None:
        self._repo, self._notifier, self._clock = repo, notifier, clock
        self._seq = 0

    def submit(self, employee: str, amount: int) -> str:
        self._seq += 1
        e = Expense(f"x{self._seq}", employee, amount, self._clock())
        self._repo.save(e)
        return e.id

    def approve(self, expense_id: str, role: str) -> ExpenseStatus:
        e = self._repo.get(expense_id)
        if e is None:
            raise LookupError(f"unknown expense {expense_id}")
        if role == "finance":
            e.approve_by_finance()
        elif role == "manager":
            e.approve_by_manager()
        else:
            raise ValueError(f"unknown role {role}")  # a typo must not grant manager rights
        self._repo.save(e)
        return e.status

    def escalate_overdue(self) -> int:
        n = 0
        for e in self._repo.all():
            if e.escalate_if_overdue(self._clock()):
                self._repo.save(e)
                self._notifier.notify(f"escalated {e.id}")
                n += 1
        return n


class InMemoryExpenses(ExpenseRepository):  # driven adapter
    def __init__(self) -> None:
        self._m: dict[str, Expense] = {}

    def save(self, e: Expense) -> None:
        self._m[e.id] = e

    def get(self, expense_id: str) -> Optional[Expense]:
        return self._m.get(expense_id)

    def all(self) -> list[Expense]:
        return list(self._m.values())


class ListNotifier(Notifier):
    def __init__(self) -> None:
        self.sent: list[str] = []

    def notify(self, msg: str) -> None:
        self.sent.append(msg)


class MutableClock:  # test clock we can move forward
    def __init__(self, start: datetime) -> None:
        self.now = start

    def __call__(self) -> datetime:
        return self.now


class ExpenseCli:  # driving adapter #1
    def __init__(self, submit: SubmitExpense, approve: ApproveExpense) -> None:
        self._submit, self._approve = submit, approve

    def run(self, line: str) -> str:
        p = line.split()
        try:
            if p and p[0] == "submit" and len(p) == 3:
                return self._submit.submit(p[1], self._rupees(p[2]) * 100)
            if p and p[0] == "approve" and len(p) == 3:
                return self._approve.approve(p[1], p[2]).name
            return "usage: submit <emp> <rupees> | approve <id> <manager|finance>"
        except (ValueError, RuntimeError, LookupError) as e:
            return f"error: {e.args[0]}"

    @staticmethod
    def _rupees(s: str) -> int:
        try:
            return int(s)
        except ValueError:
            raise ValueError("amount must be a number") from None


class NightlyEscalationJob:  # driving adapter #2
    def __init__(self, use_case: EscalateOverdue) -> None:
        self._use_case = use_case

    def tick(self) -> None:
        print(f"job escalated {self._use_case.escalate_overdue()}")


clock = MutableClock(datetime(2026, 1, 1, 9, 0, tzinfo=timezone.utc))
notifier = ListNotifier()
svc = ExpenseService(InMemoryExpenses(), notifier, clock)
cli = ExpenseCli(svc, svc)
job = NightlyEscalationJob(svc)
big, small = cli.run("submit asha 80000"), cli.run("submit ravi 2000")
print(f"submitted {big} {small}")
print(cli.run(f"approve {big} manager"))  # NEEDS_FINANCE
print(cli.run(f"approve {big} manager"))  # already moved on
print(cli.run(f"approve {big} ceo"))
print(cli.run("approve x9 manager"))
print(cli.run("submit sam abc"))
print(cli.run("submit sam 0"))
print(cli.run("hello"))
clock.now += timedelta(days=8)
job.tick()
job.tick()  # 1 then 0: idempotent
print(cli.run(f"approve {small} finance"))  # finance only sees big claims
print(cli.run(f"approve {small} manager"))  # an escalated claim can still be approved
print(cli.run(f"approve {big} finance") + " [" + ", ".join(notifier.sent) + "]")` },
          { lang: 'ts', code: `type ExpenseStatus = "SUBMITTED" | "NEEDS_FINANCE" | "APPROVED" | "REJECTED" | "ESCALATED";

class Expense { // domain: the rules live here, no I/O
  static readonly FINANCE_LIMIT = 5_000_000;
  status: ExpenseStatus = "SUBMITTED";

  constructor(readonly id: string, readonly employee: string, readonly amount: number, readonly submittedAt: number) {
    if (amount <= 0) throw new Error("amount > 0");
  }

  approveByManager(): void {
    this.require("SUBMITTED", "ESCALATED");
    this.status = this.amount > Expense.FINANCE_LIMIT ? "NEEDS_FINANCE" : "APPROVED";
  }
  approveByFinance(): void {
    this.require("NEEDS_FINANCE");
    this.status = "APPROVED";
  }
  escalateIfOverdue(nowMs: number): boolean {
    if (this.status !== "SUBMITTED" || nowMs < this.submittedAt + 7 * 86_400_000) return false;
    this.status = "ESCALATED";
    return true;
  }
  private require(...ok: ExpenseStatus[]): void {
    if (!ok.includes(this.status)) throw new Error(\`\${this.id} is \${this.status}\`);
  }
}

interface SubmitExpense { submit(employee: string, amount: number): string; } // inbound ports
interface ApproveExpense { approve(id: string, role: string): ExpenseStatus; }
interface EscalateOverdue { escalateOverdue(): number; }
interface ExpenseRepository { save(e: Expense): void; get(id: string): Expense | undefined; all(): Expense[]; } // outbound
interface Notifier { notify(msg: string): void; }

class ExpenseService implements SubmitExpense, ApproveExpense, EscalateOverdue {
  private seq = 0;
  constructor(private readonly repo: ExpenseRepository, private readonly notifier: Notifier, private readonly clock: () => number) {}

  submit(employee: string, amount: number): string {
    const e = new Expense(\`x\${++this.seq}\`, employee, amount, this.clock());
    this.repo.save(e);
    return e.id;
  }

  approve(id: string, role: string): ExpenseStatus {
    const e = this.repo.get(id);
    if (e === undefined) throw new Error(\`unknown expense \${id}\`);
    if (role === "finance") e.approveByFinance();
    else if (role === "manager") e.approveByManager();
    else throw new Error(\`unknown role \${role}\`); // a typo must not grant manager rights
    this.repo.save(e);
    return e.status;
  }

  escalateOverdue(): number {
    let n = 0;
    for (const e of this.repo.all()) {
      if (e.escalateIfOverdue(this.clock())) {
        this.repo.save(e);
        this.notifier.notify(\`escalated \${e.id}\`);
        n++;
      }
    }
    return n;
  }
}

class InMemoryExpenses implements ExpenseRepository { // driven adapter
  private readonly m = new Map<string, Expense>();
  save(e: Expense): void { this.m.set(e.id, e); }
  get(id: string): Expense | undefined { return this.m.get(id); }
  all(): Expense[] { return [...this.m.values()]; }
}

class MutableClock { // test clock we can move forward
  constructor(public nowMs: number) {}
  readonly read = (): number => this.nowMs;
}

class ExpenseCli { // driving adapter #1
  constructor(private readonly submit: SubmitExpense, private readonly approve: ApproveExpense) {}

  run(line: string): string {
    const p = line.trim().split(/ +/);
    try {
      if (p[0] === "submit" && p.length === 3) return this.submit.submit(p[1], ExpenseCli.rupees(p[2]) * 100);
      if (p[0] === "approve" && p.length === 3) return this.approve.approve(p[1], p[2]);
      return "usage: submit <emp> <rupees> | approve <id> <manager|finance>";
    } catch (e) { return \`error: \${(e as Error).message}\`; }
  }

  private static rupees(s: string): number {
    if (!/^-?\\d+$/.test(s)) throw new Error("amount must be a number");
    return Number(s);
  }
}

class NightlyEscalationJob { // driving adapter #2
  constructor(private readonly useCase: EscalateOverdue) {}
  tick(): void { console.log(\`job escalated \${this.useCase.escalateOverdue()}\`); }
}

const clock = new MutableClock(Date.UTC(2026, 0, 1, 9, 0));
const sent: string[] = [];
const svc = new ExpenseService(new InMemoryExpenses(), { notify: (m) => { sent.push(m); } }, clock.read);
const cli = new ExpenseCli(svc, svc);
const job = new NightlyEscalationJob(svc);
const big = cli.run("submit asha 80000");
const small = cli.run("submit ravi 2000");
console.log(\`submitted \${big} \${small}\`);
console.log(cli.run(\`approve \${big} manager\`)); // NEEDS_FINANCE
console.log(cli.run(\`approve \${big} manager\`)); // already moved on
console.log(cli.run(\`approve \${big} ceo\`));
console.log(cli.run("approve x9 manager"));
console.log(cli.run("submit sam abc"));
console.log(cli.run("submit sam 0"));
console.log(cli.run("hello"));
clock.nowMs += 8 * 86_400_000;
job.tick();
job.tick(); // 1 then 0: idempotent
console.log(cli.run(\`approve \${small} finance\`)); // finance only sees big claims
console.log(cli.run(\`approve \${small} manager\`)); // an escalated claim can still be approved
console.log(\`\${cli.run(\`approve \${big} finance\`)} [\${sent.join(", ")}]\`);` },
          { lang: 'cpp', code: `enum class ExpenseStatus { SUBMITTED, NEEDS_FINANCE, APPROVED, REJECTED, ESCALATED };

string name(ExpenseStatus s) {
    static const char* names[] = {"SUBMITTED", "NEEDS_FINANCE", "APPROVED", "REJECTED", "ESCALATED"};
    return names[static_cast<int>(s)];
}

class Expense {  // domain: the rules live here, no I/O
    string id_, employee_;
    long long amount_, submittedAt_;  // seconds
    ExpenseStatus status_ = ExpenseStatus::SUBMITTED;

    void require(initializer_list<ExpenseStatus> ok) const {
        if (find(ok.begin(), ok.end(), status_) == ok.end()) throw runtime_error(id_ + " is " + name(status_));
    }

public:
    static constexpr long long FINANCE_LIMIT = 5'000'000;

    Expense(string id, string employee, long long amount, long long at)
        : id_(move(id)), employee_(move(employee)), amount_(amount), submittedAt_(at) {
        if (amount <= 0) throw invalid_argument("amount > 0");
    }
    const string& id() const { return id_; }
    ExpenseStatus status() const { return status_; }

    void approveByManager() {
        require({ExpenseStatus::SUBMITTED, ExpenseStatus::ESCALATED});
        status_ = amount_ > FINANCE_LIMIT ? ExpenseStatus::NEEDS_FINANCE : ExpenseStatus::APPROVED;
    }
    void approveByFinance() {
        require({ExpenseStatus::NEEDS_FINANCE});
        status_ = ExpenseStatus::APPROVED;
    }
    bool escalateIfOverdue(long long now) {
        if (status_ != ExpenseStatus::SUBMITTED || now < submittedAt_ + 7 * 86'400) return false;
        status_ = ExpenseStatus::ESCALATED;
        return true;
    }
};

struct SubmitExpense {  // inbound ports
    virtual ~SubmitExpense() = default;
    virtual string submit(const string& employee, long long amount) = 0;
};
struct ApproveExpense {
    virtual ~ApproveExpense() = default;
    virtual ExpenseStatus approve(const string& id, const string& role) = 0;
};
struct EscalateOverdue {
    virtual ~EscalateOverdue() = default;
    virtual int escalateOverdue() = 0;
};
struct ExpenseRepository {  // outbound ports
    virtual ~ExpenseRepository() = default;
    virtual void save(shared_ptr<Expense> e) = 0;
    virtual shared_ptr<Expense> get(const string& id) const = 0;
    virtual vector<shared_ptr<Expense>> all() const = 0;
};
struct Notifier {
    virtual ~Notifier() = default;
    virtual void notify(const string& msg) = 0;
};

class ExpenseService : public SubmitExpense, public ApproveExpense, public EscalateOverdue {
    ExpenseRepository& repo_;
    Notifier& notifier_;
    function<long long()> clock_;
    int seq_ = 0;

public:
    ExpenseService(ExpenseRepository& r, Notifier& n, function<long long()> c) : repo_(r), notifier_(n), clock_(move(c)) {}

    string submit(const string& employee, long long amount) override {
        auto e = make_shared<Expense>("x" + to_string(++seq_), employee, amount, clock_());
        repo_.save(e);
        return e->id();
    }
    ExpenseStatus approve(const string& id, const string& role) override {
        auto e = repo_.get(id);
        if (!e) throw out_of_range("unknown expense " + id);
        if (role == "finance") e->approveByFinance();
        else if (role == "manager") e->approveByManager();
        else throw invalid_argument("unknown role " + role);  // a typo must not grant manager rights
        repo_.save(e);
        return e->status();
    }
    int escalateOverdue() override {
        int n = 0;
        for (const auto& e : repo_.all()) {
            if (e->escalateIfOverdue(clock_())) {
                repo_.save(e);
                notifier_.notify("escalated " + e->id());
                n++;
            }
        }
        return n;
    }
};

class InMemoryExpenses : public ExpenseRepository {  // driven adapter
    vector<shared_ptr<Expense>> items_;              // insertion order
public:
    void save(shared_ptr<Expense> e) override {
        for (auto& x : items_) if (x->id() == e->id()) { x = e; return; }
        items_.push_back(move(e));
    }
    shared_ptr<Expense> get(const string& id) const override {
        for (const auto& x : items_) if (x->id() == id) return x;
        return nullptr;
    }
    vector<shared_ptr<Expense>> all() const override { return items_; }
};

class ListNotifier : public Notifier {
public:
    vector<string> sent;
    void notify(const string& msg) override { sent.push_back(msg); }
};

class ExpenseCli {  // driving adapter #1
    SubmitExpense& submit_;
    ApproveExpense& approve_;

    static long long rupees(const string& s) {
        size_t used = 0;
        try {
            long long v = stoll(s, &used);
            if (used == s.size()) return v;
        } catch (const exception&) {}
        throw invalid_argument("amount must be a number");
    }

public:
    ExpenseCli(SubmitExpense& s, ApproveExpense& a) : submit_(s), approve_(a) {}

    string run(const string& line) {
        istringstream in(line);
        vector<string> p;
        for (string w; in >> w;) p.push_back(w);
        try {
            if (!p.empty() && p[0] == "submit" && p.size() == 3) return submit_.submit(p[1], rupees(p[2]) * 100);
            if (!p.empty() && p[0] == "approve" && p.size() == 3) return name(approve_.approve(p[1], p[2]));
            return "usage: submit <emp> <rupees> | approve <id> <manager|finance>";
        } catch (const exception& e) {
            return string("error: ") + e.what();
        }
    }
};

class NightlyEscalationJob {  // driving adapter #2
    EscalateOverdue& useCase_;
public:
    explicit NightlyEscalationJob(EscalateOverdue& u) : useCase_(u) {}
    void tick() { cout << "job escalated " << useCase_.escalateOverdue() << "\\n"; }
};

int main() {
    long long now = 1'767'258'000;  // 2026-01-01T09:00:00Z, the test clock we can move forward
    InMemoryExpenses repo;
    ListNotifier notifier;
    ExpenseService svc(repo, notifier, [&now] { return now; });
    ExpenseCli cli(svc, svc);
    NightlyEscalationJob job(svc);
    string big = cli.run("submit asha 80000"), small = cli.run("submit ravi 2000");
    cout << "submitted " << big << " " << small << "\\n";
    cout << cli.run("approve " + big + " manager") << "\\n";  // NEEDS_FINANCE
    cout << cli.run("approve " + big + " manager") << "\\n";  // already moved on
    cout << cli.run("approve " + big + " ceo") << "\\n";
    cout << cli.run("approve x9 manager") << "\\n";
    cout << cli.run("submit sam abc") << "\\n";
    cout << cli.run("submit sam 0") << "\\n";
    cout << cli.run("hello") << "\\n";
    now += 8 * 86'400;
    job.tick();
    job.tick();  // 1 then 0: idempotent
    cout << cli.run("approve " + small + " finance") << "\\n";  // finance only sees big claims
    cout << cli.run("approve " + small + " manager") << "\\n";  // an escalated claim can still be approved
    string joined;
    for (const string& m : notifier.sent) joined += (joined.empty() ? "" : ", ") + m;
    cout << cli.run("approve " + big + " finance") << " [" << joined << "]\\n";
}` }
        ],
      complexity: `<p>O(1) per approval; escalation O(N) over open expenses (a real repository would query only SUBMITTED ones older than 7 days).</p>`,
      followUps: ['How would a third driving adapter (Slack bot buttons) be added?', 'Where would you put "managers cannot approve their own expenses"?', 'How do you prevent two scheduler instances escalating concurrently? (Optimistic locking or a job lock port.)']
    }
  });

  practice.push({
    title: 'Build an Account Statement Projection with Checkpoints', level: 'Medium', tags: ['event sourcing', 'projection', 'cqrs', 'idempotency'], companies: ['Goldman Sachs', 'Revolut', 'PhonePe'],
    statement: `<p>An event store has a <b>global ordered feed</b> of events from many account streams: <code>(position, accountId, type, amount, day)</code>. Build a <code>StatementProjection</code> that maintains, per account, the running balance and a list of statement lines, and per day the total volume. It must track a <b>checkpoint</b> (last processed position) so it can resume after a crash, ignore already-processed positions on redelivery, and be <b>rebuildable from scratch</b>.</p>`,
    constraints: `Millions of events; projection processes them in batches. Redelivery after crash is possible (at-least-once).`,
    example: `<p>Feed: 1 A Dep 100 d1, 2 B Dep 50 d1, 3 A Wd 30 d2 → A: balance ${H.c('b', '70')}, lines [+100, −30]; B: 50; volume d1=150, d2=30; checkpoint 3. Crash after position 2 and redeliver 1..3 → same result (positions ≤ checkpoint skipped).</p>`,
    brute: { why: `<p>The UI computes statements by reading every event of every account on each page view (O(all events) per request), or the projection blindly applies every delivered message, so a redelivery after a crash doubles deposits.</p>`, code: { lang: 'java', code: `class StatementBrute {
    static long balance(List<long[]> allEvents, long account) {          // {pos, account, sign*amount}
        long b = 0;
        for (long[] e : allEvents) if (e[1] == account) b += e[2];     // full scan on every page view
        return b;
    }
}`, alt: [{ lang: 'python', code: "class StatementBrute:\n    @staticmethod\n    def balance(all_events, account):                  # (pos, account, sign*amount)\n        b = 0\n        for e in all_events:\n            if e[1] == account: b += e[2]              # full scan on every page view\n        return b\n" }, { lang: 'ts', code: "class StatementBrute {\n  static balance(allEvents: number[][], account: number): number {   // [pos, account, sign*amount]\n    let b = 0;\n    for (const e of allEvents) if (e[1] === account) b += e[2];      // full scan on every page view\n    return b;\n  }\n}\n" }, { lang: 'cpp', code: "struct StatementBrute {\n    static long long balance(const vector<array<long long, 3>>& allEvents, long long account) {   // {pos, account, sign*amount}\n        long long b = 0;\n        for (auto& e : allEvents) if (e[1] == account) b += e[2];     // full scan on every page view\n        return b;\n    }\n};\n" }] } },
    mcq: { q: 'The projection crashes after updating balances for position 42 but before saving checkpoint 42. On restart, position 42 is delivered again. What prevents a double count?', options: ['Store the checkpoint atomically with the read-model update (same transaction), or make each update idempotent per position', 'Nothing: projections are approximate', 'Delete the event', 'Increase the batch size'], answer: 0, explain: 'Projection state and checkpoint must move together, or each event\'s effect must be idempotent. Then at-least-once delivery yields exactly-once results.' },
    hints: [`<p>Hint 1: Projection state = <code>Map&lt;account, Long&gt;</code> balances, <code>Map&lt;account, List&lt;String&gt;&gt;</code> lines, <code>Map&lt;day, Long&gt;</code> volume, <code>long checkpoint</code>.</p>`, `<p>Hint 2: <code>handle(event)</code>: if <code>position ≤ checkpoint</code> return; else update all maps and set checkpoint = position (atomically in a real DB).</p>`, `<p>Hint 3: <code>rebuild(feed)</code> = new empty projection + handle every event. Compare with the live one to verify.</p>`],
      tests: { io: true, cases: [{ stdin: '', stdout: "{A=70, B=40} {A=[d1 +100, d2 -30], B=[d1 +50, d2 -10]} {d1=150, d2=40} cp=4\nrebuild matches: true\nunknown event type Refunded\ncp=4\n{A=75, B=40} {d1=150, d2=40, d3=5} cp=5\n" }] },
      solution: {
      approach: `<p>The projection is a pure consumer of the global feed. Each event updates three read structures and advances the checkpoint. Positions at or below the checkpoint are skipped, making redelivery harmless. Rebuild creates a fresh instance and replays from position 1. An unknown event type is rejected before any state changes, so the sign of an amount is never guessed.</p>`,
      code: `record FeedEvent(long position, String account, String type, long amount, String day) {}

class StatementProjection {
    final Map<String, Long> balances = new TreeMap<>();
    final Map<String, List<String>> lines = new TreeMap<>();
    final Map<String, Long> volumeByDay = new TreeMap<>();
    long checkpoint;

    void handle(FeedEvent e) {
        if (e.position() <= checkpoint) return;                           // already applied: idempotent skip
        long signed = switch (e.type()) {
            case "Deposited" -> e.amount();
            case "Withdrew" -> -e.amount();
            default -> throw new IllegalArgumentException("unknown event type " + e.type());   // never guess the sign
        };
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
        try { live.handle(new FeedEvent(5, "A", "Refunded", 5, "d3")); }
        catch (IllegalArgumentException ex) { System.out.println(ex.getMessage()); }
        System.out.println("cp=" + live.checkpoint);                      // the bad event changed nothing
        live.handle(new FeedEvent(5, "A", "Deposited", 5, "d3"));
        live.handle(feed.get(2));                                         // old event again: skipped
        System.out.println(live.balances + " " + live.volumeByDay + " cp=" + live.checkpoint);
    }
}`,
        alt: [
          { lang: 'python', code: `from dataclasses import dataclass


@dataclass(frozen=True)
class FeedEvent:
    position: int
    account: str
    type: str
    amount: int
    day: str


class StatementProjection:  # a read model fed by the global event feed
    def __init__(self) -> None:
        self.balances: dict[str, int] = {}
        self.lines: dict[str, list[str]] = {}
        self.volume_by_day: dict[str, int] = {}
        self.checkpoint = 0

    def handle(self, e: FeedEvent) -> None:
        if e.position <= self.checkpoint:  # already applied: idempotent skip
            return
        if e.type == "Deposited":
            signed = e.amount
        elif e.type == "Withdrew":
            signed = -e.amount
        else:
            raise ValueError(f"unknown event type {e.type}")  # never guess the sign
        self.balances[e.account] = self.balances.get(e.account, 0) + signed
        self.lines.setdefault(e.account, []).append(f"{e.day} {'+' if signed > 0 else ''}{signed}")
        self.volume_by_day[e.day] = self.volume_by_day.get(e.day, 0) + e.amount
        self.checkpoint = e.position  # in a DB: same transaction as the updates

    @staticmethod
    def rebuild(feed: list[FeedEvent]) -> "StatementProjection":
        p = StatementProjection()
        for e in feed:
            p.handle(e)
        return p


def fmt(m: dict) -> str:  # sorted by key, like Java's TreeMap
    def val(v) -> str:
        return "[" + ", ".join(v) + "]" if isinstance(v, list) else str(v)

    return "{" + ", ".join(f"{k}={val(m[k])}" for k in sorted(m)) + "}"


feed = [FeedEvent(1, "A", "Deposited", 100, "d1"), FeedEvent(2, "B", "Deposited", 50, "d1"),
        FeedEvent(3, "A", "Withdrew", 30, "d2"), FeedEvent(4, "B", "Withdrew", 10, "d2")]
live = StatementProjection()
for e in feed[:2]:  # processed 1..2, then "crash"
    live.handle(e)
for e in feed:  # redelivery from position 1
    live.handle(e)
print(f"{fmt(live.balances)} {fmt(live.lines)} {fmt(live.volume_by_day)} cp={live.checkpoint}")
print("rebuild matches:", str(StatementProjection.rebuild(feed).balances == live.balances).lower())
try:
    live.handle(FeedEvent(5, "A", "Refunded", 5, "d3"))
except ValueError as ex:
    print(ex)
print(f"cp={live.checkpoint}")  # the bad event changed nothing
live.handle(FeedEvent(5, "A", "Deposited", 5, "d3"))
live.handle(feed[2])  # old event again: skipped
print(f"{fmt(live.balances)} {fmt(live.volume_by_day)} cp={live.checkpoint}")` },
          { lang: 'ts', code: `interface FeedEvent {
  readonly position: number;
  readonly account: string;
  readonly type: string;
  readonly amount: number;
  readonly day: string;
}

class StatementProjection { // a read model fed by the global event feed
  readonly balances = new Map<string, number>();
  readonly lines = new Map<string, string[]>();
  readonly volumeByDay = new Map<string, number>();
  checkpoint = 0;

  handle(e: FeedEvent): void {
    if (e.position <= this.checkpoint) return; // already applied: idempotent skip
    let signed: number;
    if (e.type === "Deposited") signed = e.amount;
    else if (e.type === "Withdrew") signed = -e.amount;
    else throw new Error(\`unknown event type \${e.type}\`); // never guess the sign
    this.balances.set(e.account, (this.balances.get(e.account) ?? 0) + signed);
    const list = this.lines.get(e.account) ?? [];
    list.push(\`\${e.day} \${signed > 0 ? "+" : ""}\${signed}\`);
    this.lines.set(e.account, list);
    this.volumeByDay.set(e.day, (this.volumeByDay.get(e.day) ?? 0) + e.amount);
    this.checkpoint = e.position; // in a DB: same transaction as the updates
  }

  static rebuild(feed: FeedEvent[]): StatementProjection {
    const p = new StatementProjection();
    feed.forEach((e) => p.handle(e));
    return p;
  }
}

function fmt(m: Map<string, number | string[]>): string { // sorted by key, like Java's TreeMap
  const val = (v: number | string[]): string => (Array.isArray(v) ? "[" + v.join(", ") + "]" : String(v));
  return "{" + [...m.keys()].sort().map((k) => \`\${k}=\${val(m.get(k)!)}\`).join(", ") + "}";
}

const same = (a: Map<string, number>, b: Map<string, number>): boolean =>
  a.size === b.size && [...a].every(([k, v]) => b.get(k) === v);

const feed: FeedEvent[] = [
  { position: 1, account: "A", type: "Deposited", amount: 100, day: "d1" },
  { position: 2, account: "B", type: "Deposited", amount: 50, day: "d1" },
  { position: 3, account: "A", type: "Withdrew", amount: 30, day: "d2" },
  { position: 4, account: "B", type: "Withdrew", amount: 10, day: "d2" },
];
const live = new StatementProjection();
feed.slice(0, 2).forEach((e) => live.handle(e)); // processed 1..2, then "crash"
feed.forEach((e) => live.handle(e)); // redelivery from position 1
console.log(\`\${fmt(live.balances)} \${fmt(live.lines)} \${fmt(live.volumeByDay)} cp=\${live.checkpoint}\`);
console.log("rebuild matches: " + same(StatementProjection.rebuild(feed).balances, live.balances));
try {
  live.handle({ position: 5, account: "A", type: "Refunded", amount: 5, day: "d3" });
} catch (ex) {
  console.log((ex as Error).message);
}
console.log(\`cp=\${live.checkpoint}\`); // the bad event changed nothing
live.handle({ position: 5, account: "A", type: "Deposited", amount: 5, day: "d3" });
live.handle(feed[2]); // old event again: skipped
console.log(\`\${fmt(live.balances)} \${fmt(live.volumeByDay)} cp=\${live.checkpoint}\`);` },
          { lang: 'cpp', code: `struct FeedEvent {
    long long position;
    string account, type;
    long long amount;
    string day;
};

class StatementProjection {  // a read model fed by the global event feed
public:
    map<string, long long> balances;  // std::map keeps keys sorted, like Java's TreeMap
    map<string, vector<string>> lines;
    map<string, long long> volumeByDay;
    long long checkpoint = 0;

    void handle(const FeedEvent& e) {
        if (e.position <= checkpoint) return;  // already applied: idempotent skip
        long long signedAmount;
        if (e.type == "Deposited") signedAmount = e.amount;
        else if (e.type == "Withdrew") signedAmount = -e.amount;
        else throw invalid_argument("unknown event type " + e.type);  // never guess the sign
        balances[e.account] += signedAmount;
        lines[e.account].push_back(e.day + " " + (signedAmount > 0 ? "+" : "") + to_string(signedAmount));
        volumeByDay[e.day] += e.amount;
        checkpoint = e.position;  // in a DB: same transaction as the updates
    }

    static StatementProjection rebuild(const vector<FeedEvent>& feed) {
        StatementProjection p;
        for (const auto& e : feed) p.handle(e);
        return p;
    }
};

string fmt(const map<string, long long>& m) {
    string out = "{";
    for (const auto& [k, v] : m) out += (out.size() > 1 ? ", " : "") + k + "=" + to_string(v);
    return out + "}";
}

string fmt(const map<string, vector<string>>& m) {
    string out = "{";
    for (const auto& [k, v] : m) {
        string list = "[";
        for (size_t i = 0; i < v.size(); i++) list += (i ? ", " : "") + v[i];
        out += (out.size() > 1 ? ", " : "") + k + "=" + list + "]";
    }
    return out + "}";
}

int main() {
    vector<FeedEvent> feed = {{1, "A", "Deposited", 100, "d1"}, {2, "B", "Deposited", 50, "d1"},
                              {3, "A", "Withdrew", 30, "d2"}, {4, "B", "Withdrew", 10, "d2"}};
    StatementProjection live;
    for (size_t i = 0; i < 2; i++) live.handle(feed[i]);  // processed 1..2, then "crash"
    for (const auto& e : feed) live.handle(e);            // redelivery from position 1
    cout << fmt(live.balances) << " " << fmt(live.lines) << " " << fmt(live.volumeByDay) << " cp=" << live.checkpoint << "\\n";
    cout << "rebuild matches: " << boolalpha << (StatementProjection::rebuild(feed).balances == live.balances) << "\\n";
    try {
        live.handle({5, "A", "Refunded", 5, "d3"});
    } catch (const invalid_argument& ex) {
        cout << ex.what() << "\\n";
    }
    cout << "cp=" << live.checkpoint << "\\n";  // the bad event changed nothing
    live.handle({5, "A", "Deposited", 5, "d3"});
    live.handle(feed[2]);  // old event again: skipped
    cout << fmt(live.balances) << " " << fmt(live.volumeByDay) << " cp=" << live.checkpoint << "\\n";
}` }
        ],
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
    brute: { why: `<p>A <code>balance</code> column updated with <code>read → compute → write</code> in two requests loses an update (both read 1000, both write 200 — ₹1,600 spent, balance shows 200). Retries of the same gateway callback credit twice. Replaying a million events per request is too slow, so someone adds a cache that drifts from the truth.</p>`, code: { lang: 'java', code: `class WalletBrute {
    long balance = 100_000;
    void debit(long amt) {
        long read = balance;                 // thread A and B both read 100000
        if (read >= amt) balance = read - amt;   // both write 20000 -> lost update
    }
}`, alt: [{ lang: 'python', code: "class WalletBrute:\n    def __init__(self): self.balance = 100_000\n\n    def debit(self, amt):\n        read = self.balance                     # thread A and B both read 100000\n        if read >= amt: self.balance = read - amt   # both write 20000 -> lost update\n" }, { lang: 'ts', code: "class WalletBrute {\n  balance = 100_000;\n  debit(amt: number): void {\n    const read = this.balance;                  // request A and B both read 100000\n    if (read >= amt) this.balance = read - amt; // both write 20000 -> lost update\n  }\n}\n" }, { lang: 'cpp', code: "class WalletBrute {\npublic:\n    long long balance = 100'000;\n    void debit(long long amt) {\n        long long read = balance;                   // thread A and B both read 100000\n        if (read >= amt) balance = read - amt;      // both write 20000 -> lost update\n    }\n};\n" }] } },
    mcq: { q: 'Where is "each ref processed at most once" best enforced in an event-sourced wallet?', options: ['In decide: the wallet state keeps the set of processed refs (rebuilt from events), so a duplicate command produces no event', 'In apply: skip duplicate events', 'In the HTTP layer with a cache', 'It cannot be enforced with event sourcing'], answer: 0, explain: 'Idempotency is a business rule over the stream\'s history, so it belongs in command handling. The processed refs are part of the derived state (and of the snapshot).' },
    hints: [`<p>Hint 1: State = balance, processed refs, debits per day, version. Snapshot = a copy of that state + its version.</p>`, `<p>Hint 2: <code>append(stream, expectedVersion, events)</code> throws if the stream length differs. Handler loop: load → decide → append; on conflict repeat up to N times.</p>`, `<p>Hint 3: Take a snapshot after an append crosses a multiple of 50; loading reads the latest snapshot and only events with version &gt; snapshot.version.</p>`],
      tests: { io: true, cases: [{ stdin: '', stdout: "balance 60000 v60, replayed only 10 events after snapshot\ntab B conflict -> handler retry: rejected: insufficient funds: 10000\nduplicate ignored\nfinal balance 10000\nbalance after the same credit twice: 5010000\ndebited 1500000\nrejected: daily limit\ndebited 600000\nrejected: amount > 0\nfinal balance 2910000\n" }] },
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
            catch (IllegalStateException | IllegalArgumentException e) { return "rejected: " + e.getMessage(); }
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

        for (int i = 0; i < 2; i++) { WalletState s = store.load("w1"); store.append("w1", s.version, Wallet.decideCredit(s, "big", 5_000_000, today)); }
        System.out.println("balance after the same credit twice: " + store.load("w1").balance);   // credited once
        WalletHandler today1 = new WalletHandler(store, clock);
        System.out.println(today1.debit("w1", "d3", 1_500_000));
        System.out.println(today1.debit("w1", "d4", 600_000));                           // today's debits would pass 2,000,000
        Clock tomorrow = Clock.fixed(Instant.parse("2026-07-02T10:00:00Z"), ZoneOffset.UTC);
        System.out.println(new WalletHandler(store, tomorrow).debit("w1", "d4", 600_000));   // the daily limit starts again
        System.out.println(today1.debit("w1", "d5", 0));
        System.out.println("final balance " + store.load("w1").balance);
    }
}`,
        alt: [
          { lang: 'python', code: `import threading
from dataclasses import dataclass
from datetime import date
from typing import Callable, Union


@dataclass(frozen=True)
class Credited:
    ref: str
    amount: int
    day: date


@dataclass(frozen=True)
class Debited:
    ref: str
    amount: int
    day: date


WalletEvent = Union[Credited, Debited]


class Conflict(Exception):
    def __init__(self) -> None:
        super().__init__("version conflict")


class WalletState:
    def __init__(self) -> None:
        self.balance = 0
        self.version = 0
        self.refs: set[str] = set()
        self.debits_by_day: dict[date, int] = {}

    def apply(self, e: WalletEvent) -> None:
        match e:
            case Credited(ref, amount, _):
                self.balance += amount
                self.refs.add(ref)
            case Debited(ref, amount, day):
                self.balance -= amount
                self.refs.add(ref)
                self.debits_by_day[day] = self.debits_by_day.get(day, 0) + amount
        self.version += 1

    def copy(self) -> "WalletState":
        s = WalletState()
        s.balance, s.version = self.balance, self.version
        s.refs, s.debits_by_day = set(self.refs), dict(self.debits_by_day)
        return s


class WalletStore:
    SNAPSHOT_EVERY = 50

    def __init__(self) -> None:
        self._streams: dict[str, list[WalletEvent]] = {}
        self._snapshots: dict[str, WalletState] = {}
        self._lock = threading.Lock()
        self.last_tail_replayed = 0

    def load(self, wallet_id: str) -> WalletState:
        with self._lock:
            snap = self._snapshots.get(wallet_id)
            s = snap.copy() if snap else WalletState()
            events = self._streams.get(wallet_id, [])
            self.last_tail_replayed = 0
            for e in events[s.version:]:
                s.apply(e)
                self.last_tail_replayed += 1
            return s

    def append(self, wallet_id: str, expected: int, events: list[WalletEvent]) -> None:
        with self._lock:
            stream = self._streams.setdefault(wallet_id, [])
            if len(stream) != expected:
                raise Conflict()
            stream.extend(events)
            if len(stream) // self.SNAPSHOT_EVERY > expected // self.SNAPSHOT_EVERY:  # crossed a multiple of 50
                snap = WalletState()
                for e in stream:
                    snap.apply(e)
                self._snapshots[wallet_id] = snap


class Wallet:
    DAILY_DEBIT_LIMIT = 2_000_000

    @staticmethod
    def decide_credit(s: WalletState, ref: str, amt: int, day: date) -> list[WalletEvent]:
        if amt <= 0:
            raise ValueError("amount > 0")
        return [] if ref in s.refs else [Credited(ref, amt, day)]

    @staticmethod
    def decide_debit(s: WalletState, ref: str, amt: int, day: date) -> list[WalletEvent]:
        if amt <= 0:
            raise ValueError("amount > 0")
        if ref in s.refs:
            return []  # idempotent retry
        if amt > s.balance:
            raise RuntimeError(f"insufficient funds: {s.balance}")
        if s.debits_by_day.get(day, 0) + amt > Wallet.DAILY_DEBIT_LIMIT:
            raise RuntimeError("daily limit")
        return [Debited(ref, amt, day)]


class WalletHandler:
    def __init__(self, store: WalletStore, clock: Callable[[], date]) -> None:
        self._store, self._clock = store, clock

    def debit(self, wallet: str, ref: str, amt: int) -> str:
        for _ in range(5):
            s = self._store.load(wallet)
            try:
                ev = Wallet.decide_debit(s, ref, amt, self._clock())
                self._store.append(wallet, s.version, ev)
                return "duplicate ignored" if not ev else f"debited {amt}"
            except Conflict:
                pass  # someone appended first: reload and decide again
            except (RuntimeError, ValueError) as e:
                return f"rejected: {e}"
        return "gave up after retries"


store = WalletStore()
today, next_day = date(2026, 7, 1), date(2026, 7, 2)
clock = lambda: today  # noqa: E731
for i in range(60):
    s = store.load("w1")
    store.append("w1", s.version, Wallet.decide_credit(s, f"c{i}", 1_000, today))
loaded = store.load("w1")
print(f"balance {loaded.balance} v{loaded.version}, replayed only {store.last_tail_replayed} events after snapshot")
tab_a, tab_b = store.load("w1"), store.load("w1")  # both see balance 60000
store.append("w1", tab_a.version, Wallet.decide_debit(tab_a, "d1", 50_000, today))  # A wins
try:
    store.append("w1", tab_b.version, Wallet.decide_debit(tab_b, "d2", 50_000, today))
except Conflict:
    print("tab B conflict -> handler retry:", WalletHandler(store, clock).debit("w1", "d2", 50_000))
print(WalletHandler(store, clock).debit("w1", "d1", 50_000))  # same ref again
print("final balance", store.load("w1").balance)  # 10000

for _ in range(2):
    s = store.load("w1")
    store.append("w1", s.version, Wallet.decide_credit(s, "big", 5_000_000, today))
print("balance after the same credit twice:", store.load("w1").balance)  # credited once
today_handler = WalletHandler(store, clock)
print(today_handler.debit("w1", "d3", 1_500_000))
print(today_handler.debit("w1", "d4", 600_000))  # today's debits would pass 2,000,000
print(WalletHandler(store, lambda: next_day).debit("w1", "d4", 600_000))  # the daily limit starts again
print(today_handler.debit("w1", "d5", 0))
print("final balance", store.load("w1").balance)` },
          { lang: 'ts', code: `type WalletEvent =
  | { readonly kind: "Credited"; readonly ref: string; readonly amount: number; readonly day: string }
  | { readonly kind: "Debited"; readonly ref: string; readonly amount: number; readonly day: string };

class Conflict extends Error {
  constructor() { super("version conflict"); }
}

class WalletState {
  balance = 0;
  version = 0;
  refs = new Set<string>();
  debitsByDay = new Map<string, number>();

  apply(e: WalletEvent): void {
    switch (e.kind) {
      case "Credited":
        this.balance += e.amount;
        this.refs.add(e.ref);
        break;
      case "Debited":
        this.balance -= e.amount;
        this.refs.add(e.ref);
        this.debitsByDay.set(e.day, (this.debitsByDay.get(e.day) ?? 0) + e.amount);
        break;
    }
    this.version++;
  }

  copy(): WalletState {
    const s = new WalletState();
    s.balance = this.balance;
    s.version = this.version;
    s.refs = new Set(this.refs);
    s.debitsByDay = new Map(this.debitsByDay);
    return s;
  }
}

class WalletStore { // single-threaded runtime: each method runs to completion, so no lock is needed
  static readonly SNAPSHOT_EVERY = 50;
  private readonly streams = new Map<string, WalletEvent[]>();
  private readonly snapshots = new Map<string, WalletState>();
  lastTailReplayed = 0;

  load(id: string): WalletState {
    const snap = this.snapshots.get(id);
    const s = snap ? snap.copy() : new WalletState();
    const all = this.streams.get(id) ?? [];
    this.lastTailReplayed = 0;
    for (let i = s.version; i < all.length; i++) {
      s.apply(all[i]);
      this.lastTailReplayed++;
    }
    return s;
  }

  append(id: string, expected: number, events: WalletEvent[]): void {
    let stream = this.streams.get(id);
    if (stream === undefined) { stream = []; this.streams.set(id, stream); }
    if (stream.length !== expected) throw new Conflict();
    stream.push(...events);
    const every = WalletStore.SNAPSHOT_EVERY;
    if (Math.floor(stream.length / every) > Math.floor(expected / every)) { // crossed a multiple of 50
      const snap = new WalletState();
      stream.forEach((e) => snap.apply(e));
      this.snapshots.set(id, snap);
    }
  }
}

class Wallet {
  static readonly DAILY_DEBIT_LIMIT = 2_000_000;

  static decideCredit(s: WalletState, ref: string, amt: number, day: string): WalletEvent[] {
    if (amt <= 0) throw new Error("amount > 0");
    return s.refs.has(ref) ? [] : [{ kind: "Credited", ref, amount: amt, day }];
  }

  static decideDebit(s: WalletState, ref: string, amt: number, day: string): WalletEvent[] {
    if (amt <= 0) throw new Error("amount > 0");
    if (s.refs.has(ref)) return []; // idempotent retry
    if (amt > s.balance) throw new Error(\`insufficient funds: \${s.balance}\`);
    if ((s.debitsByDay.get(day) ?? 0) + amt > Wallet.DAILY_DEBIT_LIMIT) throw new Error("daily limit");
    return [{ kind: "Debited", ref, amount: amt, day }];
  }
}

class WalletHandler {
  constructor(private readonly store: WalletStore, private readonly clock: () => string) {}

  debit(wallet: string, ref: string, amt: number): string {
    for (let attempt = 0; attempt < 5; attempt++) {
      const s = this.store.load(wallet);
      try {
        const ev = Wallet.decideDebit(s, ref, amt, this.clock());
        this.store.append(wallet, s.version, ev);
        return ev.length === 0 ? "duplicate ignored" : \`debited \${amt}\`;
      } catch (e) {
        if (e instanceof Conflict) continue; // someone appended first: reload and decide again
        return \`rejected: \${(e as Error).message}\`;
      }
    }
    return "gave up after retries";
  }
}

const store = new WalletStore();
const today = "2026-07-01";
const clock = (): string => today;
for (let i = 0; i < 60; i++) {
  const s = store.load("w1");
  store.append("w1", s.version, Wallet.decideCredit(s, \`c\${i}\`, 1_000, today));
}
const loaded = store.load("w1");
console.log(\`balance \${loaded.balance} v\${loaded.version}, replayed only \${store.lastTailReplayed} events after snapshot\`);
const tabA = store.load("w1");
const tabB = store.load("w1"); // both see balance 60000
store.append("w1", tabA.version, Wallet.decideDebit(tabA, "d1", 50_000, today)); // A wins
try {
  store.append("w1", tabB.version, Wallet.decideDebit(tabB, "d2", 50_000, today));
} catch (e) {
  if (!(e instanceof Conflict)) throw e;
  console.log("tab B conflict -> handler retry: " + new WalletHandler(store, clock).debit("w1", "d2", 50_000));
}
console.log(new WalletHandler(store, clock).debit("w1", "d1", 50_000)); // same ref again
console.log("final balance " + store.load("w1").balance); // 10000

for (let i = 0; i < 2; i++) {
  const s = store.load("w1");
  store.append("w1", s.version, Wallet.decideCredit(s, "big", 5_000_000, today));
}
console.log("balance after the same credit twice: " + store.load("w1").balance); // credited once
const todayHandler = new WalletHandler(store, clock);
console.log(todayHandler.debit("w1", "d3", 1_500_000));
console.log(todayHandler.debit("w1", "d4", 600_000)); // today's debits would pass 2,000,000
console.log(new WalletHandler(store, () => "2026-07-02").debit("w1", "d4", 600_000)); // the daily limit starts again
console.log(todayHandler.debit("w1", "d5", 0));
console.log("final balance " + store.load("w1").balance);` },
          { lang: 'cpp', code: `struct Credited { string ref; long long amount; string day; };
struct Debited { string ref; long long amount; string day; };
using WalletEvent = variant<Credited, Debited>;

struct Conflict : runtime_error {
    Conflict() : runtime_error("version conflict") {}
};
struct Rejected : runtime_error {  // a business rule said no
    using runtime_error::runtime_error;
};

struct WalletState {
    long long balance = 0, version = 0;
    set<string> refs;
    map<string, long long> debitsByDay;

    void apply(const WalletEvent& e) {
        if (const auto* c = get_if<Credited>(&e)) {
            balance += c->amount;
            refs.insert(c->ref);
        } else if (const auto* d = get_if<Debited>(&e)) {
            balance -= d->amount;
            refs.insert(d->ref);
            debitsByDay[d->day] += d->amount;
        }
        version++;
    }
};  // plain value type: copying it is the snapshot copy

class WalletStore {
    map<string, vector<WalletEvent>> streams_;
    map<string, WalletState> snapshots_;
    mutex m_;

public:
    static constexpr int SNAPSHOT_EVERY = 50;
    int lastTailReplayed = 0;

    WalletState load(const string& id) {
        lock_guard<mutex> lock(m_);
        auto snap = snapshots_.find(id);
        WalletState s = snap != snapshots_.end() ? snap->second : WalletState();
        const auto& all = streams_[id];
        lastTailReplayed = 0;
        for (size_t i = static_cast<size_t>(s.version); i < all.size(); i++) {
            s.apply(all[i]);
            lastTailReplayed++;
        }
        return s;
    }

    void append(const string& id, long long expected, const vector<WalletEvent>& events) {
        lock_guard<mutex> lock(m_);
        auto& stream = streams_[id];
        if (static_cast<long long>(stream.size()) != expected) throw Conflict();
        stream.insert(stream.end(), events.begin(), events.end());
        if (static_cast<long long>(stream.size()) / SNAPSHOT_EVERY > expected / SNAPSHOT_EVERY) {  // crossed a multiple of 50
            WalletState snap;
            for (const auto& e : stream) snap.apply(e);
            snapshots_[id] = snap;
        }
    }
};

struct Wallet {
    static constexpr long long DAILY_DEBIT_LIMIT = 2'000'000;

    static vector<WalletEvent> decideCredit(const WalletState& s, const string& ref, long long amt, const string& day) {
        if (amt <= 0) throw Rejected("amount > 0");
        if (s.refs.count(ref)) return {};
        return {Credited{ref, amt, day}};
    }
    static vector<WalletEvent> decideDebit(const WalletState& s, const string& ref, long long amt, const string& day) {
        if (amt <= 0) throw Rejected("amount > 0");
        if (s.refs.count(ref)) return {};  // idempotent retry
        if (amt > s.balance) throw Rejected("insufficient funds: " + to_string(s.balance));
        auto it = s.debitsByDay.find(day);
        if ((it == s.debitsByDay.end() ? 0 : it->second) + amt > DAILY_DEBIT_LIMIT) throw Rejected("daily limit");
        return {Debited{ref, amt, day}};
    }
};

class WalletHandler {
    WalletStore& store_;
    function<string()> clock_;

public:
    WalletHandler(WalletStore& s, function<string()> c) : store_(s), clock_(move(c)) {}

    string debit(const string& wallet, const string& ref, long long amt) {
        for (int attempt = 0; attempt < 5; attempt++) {
            WalletState s = store_.load(wallet);
            try {
                auto ev = Wallet::decideDebit(s, ref, amt, clock_());
                store_.append(wallet, s.version, ev);
                return ev.empty() ? "duplicate ignored" : "debited " + to_string(amt);
            } catch (const Conflict&) {
                // someone appended first: reload and decide again
            } catch (const Rejected& e) {
                return string("rejected: ") + e.what();
            }
        }
        return "gave up after retries";
    }
};

int main() {
    WalletStore store;
    const string today = "2026-07-01";
    auto clock = [&] { return today; };
    for (int i = 0; i < 60; i++) {
        WalletState s = store.load("w1");
        store.append("w1", s.version, Wallet::decideCredit(s, "c" + to_string(i), 1'000, today));
    }
    WalletState loaded = store.load("w1");
    cout << "balance " << loaded.balance << " v" << loaded.version << ", replayed only " << store.lastTailReplayed
         << " events after snapshot\\n";
    WalletState tabA = store.load("w1"), tabB = store.load("w1");  // both see balance 60000
    store.append("w1", tabA.version, Wallet::decideDebit(tabA, "d1", 50'000, today));  // A wins
    try {
        store.append("w1", tabB.version, Wallet::decideDebit(tabB, "d2", 50'000, today));
    } catch (const Conflict&) {
        cout << "tab B conflict -> handler retry: " << WalletHandler(store, clock).debit("w1", "d2", 50'000) << "\\n";
    }
    cout << WalletHandler(store, clock).debit("w1", "d1", 50'000) << "\\n";  // same ref again
    cout << "final balance " << store.load("w1").balance << "\\n";            // 10000

    for (int i = 0; i < 2; i++) {
        WalletState s = store.load("w1");
        store.append("w1", s.version, Wallet::decideCredit(s, "big", 5'000'000, today));
    }
    cout << "balance after the same credit twice: " << store.load("w1").balance << "\\n";  // credited once
    WalletHandler todayHandler(store, clock);
    cout << todayHandler.debit("w1", "d3", 1'500'000) << "\\n";
    cout << todayHandler.debit("w1", "d4", 600'000) << "\\n";  // today's debits would pass 2,000,000
    cout << WalletHandler(store, [] { return string("2026-07-02"); }).debit("w1", "d4", 600'000) << "\\n";  // the daily limit starts again
    cout << todayHandler.debit("w1", "d5", 0) << "\\n";
    cout << "final balance " << store.load("w1").balance << "\\n";
}` }
        ],
      complexity: `<p>Load O(snapshot copy + ≤ 50 tail events). Append O(k). Conflicts cost a reload + re-decide; under heavy contention on one wallet, serialise commands per stream (single writer) instead of retrying.</p>`,
      followUps: ['The processed-refs set grows forever — how would you bound it (expire refs older than the gateway retry window)?', 'How would you make snapshots asynchronous so appends stay fast?', 'Design a projection for "daily statement emails" from the global feed.']
    }
  });

  practice.push({
    title: 'Write a Reflection-Based DI Container (Autowiring, Scopes, Cycles)', level: 'Hard', tags: ['dependency injection', 'reflection', 'container design'], companies: ['Google', 'JetBrains', 'Pivotal'],
    statement: `<p>Implement a mini Guice/Spring: <code>bind(Interface.class, Impl.class)</code>, <code>singleton(Type.class)</code> (default prototype), <code>instance(Type.class, obj)</code>, and <code>get(Type.class)</code> (the names are Java's; every language has the same four operations) which <b>autowires</b> by finding the type's constructor and recursively resolving its parameter types. Requirements: clear error for missing bindings of interfaces, ambiguous constructors (Java), and <b>dependency cycles</b> (print the path); singletons created once; thread-safe <code>get</code>.</p>`,
    constraints: `Standard library only. Java and Python read constructor parameter types at run time (<code>java.lang.reflect</code>, type hints with <code>inspect</code>); TypeScript and C++ cannot, so each class declares its dependencies. Up to a few hundred types. No field injection.`,
    example: `<p><code>OrderService(OrderRepo, Clock)</code>, <code>OrderRepo → InMemoryOrderRepo(Clock)</code>, Clock as an instance → <code>get(OrderService.class)</code> builds InMemoryOrderRepo then OrderService; Clock shared. A ↔ B constructors → ${H.c('r', 'Dependency cycle: A -> B -> A')}.</p>`,
    brute: { why: `<p>A giant hand-written factory with one method per class, edited for every new constructor parameter; or a static service locator map that classes query from inside methods, hiding dependencies and failing at runtime on first use.</p>`, code: { lang: 'java', code: `class FactoryBrute {
    static Object create(String name) {
        switch (name) {                                   // edited for every class and every new constructor parameter
            case "clock": return Clock.systemUTC();
            case "service": return new Object();          // imagine: new OrderService(new InMemoryOrderRepo(Clock.systemUTC()), Clock.systemUTC())
            default: throw new IllegalArgumentException(name);
        }
    }
}`, alt: [{ lang: 'python', code: "class FactoryBrute:\n    @staticmethod\n    def create(name):\n        # edited for every class and every new constructor parameter\n        if name == \"clock\": return SystemClock()\n        if name == \"service\": return object()          # imagine: OrderService(InMemoryOrderRepo(SystemClock()), SystemClock())\n        raise ValueError(name)\n" }, { lang: 'ts', code: "class FactoryBrute {\n  static create(name: string): unknown {\n    switch (name) {                                    // edited for every class and every new constructor parameter\n      case \"clock\": return new SystemClock();\n      case \"service\": return {};                       // imagine: new OrderService(new InMemoryOrderRepo(new SystemClock()), new SystemClock())\n      default: throw new Error(name);\n    }\n  }\n}\n" }, { lang: 'cpp', code: "struct FactoryBrute {\n    static any create(const string& name) {\n        // edited for every class and every new constructor parameter\n        if (name == \"clock\") return chrono::system_clock::now();\n        if (name == \"service\") return string(\"service\");   // imagine: OrderService(InMemoryOrderRepo(clock), clock)\n        throw invalid_argument(name);\n    }\n};\n" }] } },
    mcq: { q: 'Resolving A needs B, and B needs A (both via constructors). What is the correct container behaviour?', options: ['Fail fast at resolution with the cycle path A -> B -> A', 'Create A with null for B', 'Recurse until StackOverflowError', 'Silently switch to setter injection'], answer: 0, explain: 'A constructor cycle cannot be satisfied. A good container detects it with a resolution stack and reports the full path so the developer can fix the design.' },
    hints: [`<p>Hint 1: <code>Class.getDeclaredConstructors()</code>; require exactly one (or one marked with an annotation you define). <code>ctor.getParameterTypes()</code> gives the dependency types.</p>`, `<p>Hint 2: Keep a per-thread resolution stack for cycle detection (<code>ThreadLocal</code>, <code>threading.local</code>, <code>thread_local</code>; a single-threaded TypeScript runtime needs only an array); keep singletons in a map guarded by a lock to avoid creating two singletons concurrently.</p>`, `<p>Hint 3: Interfaces/abstract classes without a binding → error "No binding for X (needed by Y)". Show the real constructor error (Java: unwrap <code>InvocationTargetException</code>).</p>`],
      tests: { io: true, cases: [{ stdin: '', stdout: "service prototype? true, repo singleton? true, clock shared? true\nDependency cycle: Ping -> Pong -> Ping\nNo binding for Unbound (needed by NeedsUnbound)\nconstructor of Exploding failed: boom\n" }] },
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
            throw new IllegalStateException("constructor of " + impl.getSimpleName() + " failed: " + e.getCause().getMessage(), e.getCause());
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

class Exploding { Exploding() { throw new IllegalArgumentException("boom"); } }

class InjectorDemo {
    public static void main(String[] args) {
        MiniInjector inj = new MiniInjector()
            .instance(Clock.class, Clock.systemUTC())
            .bind(OrderRepo.class, InMemoryOrderRepo.class).singleton(OrderRepo.class);
        OrderService a = inj.get(OrderService.class), b = inj.get(OrderService.class);
        System.out.println("service prototype? " + (a != b) + ", repo singleton? " + (a.repo == b.repo) + ", clock shared? " + (a.clock == ((InMemoryOrderRepo) a.repo).clock));
        for (Class<?> bad : List.of(Ping.class, NeedsUnbound.class, Exploding.class))
            try { inj.get(bad); } catch (IllegalStateException e) { System.out.println(e.getMessage()); }
    }
}`,
        alt: [
          { lang: 'python', code: `import inspect
import threading
import typing
from abc import ABC, abstractmethod
from typing import Any, Optional


class MiniInjector:
    def __init__(self) -> None:
        self._bindings: dict[type, type] = {}
        self._instances: dict[type, object] = {}
        self._singleton_types: set[type] = set()
        self._creation_lock = threading.RLock()
        self._local = threading.local()  # one "currently resolving" stack per thread

    def bind(self, api: type, impl: type) -> "MiniInjector":
        self._bindings[api] = impl
        return self

    def instance(self, type_: type, obj: object) -> "MiniInjector":
        self._instances[type_] = obj
        return self

    def singleton(self, type_: type) -> "MiniInjector":
        self._singleton_types.add(type_)
        return self

    def _stack(self) -> list[type]:
        if not hasattr(self._local, "stack"):
            self._local.stack = []
        return self._local.stack

    def get(self, type_: type) -> Any:
        ready = self._instances.get(type_)
        if ready is not None:
            return ready
        impl = self._bindings.get(type_, type_)
        if inspect.isabstract(impl):
            st = self._stack()
            needed_by = f" (needed by {st[-1].__name__})" if st else ""
            raise RuntimeError(f"No binding for {type_.__name__}{needed_by}")
        if type_ not in self._singleton_types and impl not in self._singleton_types:
            return self._create(impl)
        with self._creation_lock:
            cached = self._instances.get(type_)
            if cached is None:
                cached = self._create(impl)
                self._instances[type_] = cached
            return cached

    def _create(self, impl: type) -> object:
        stack = self._stack()
        if impl in stack:
            path = [c.__name__ for c in stack] + [impl.__name__]
            raise RuntimeError("Dependency cycle: " + " -> ".join(path))
        stack.append(impl)
        try:
            args = self._dependencies(impl)
            try:
                return impl(*args)
            except Exception as e:
                raise RuntimeError(f"constructor of {impl.__name__} failed: {e}") from e
        finally:
            stack.pop()

    def _dependencies(self, impl: type) -> list[object]:
        if impl.__init__ is object.__init__:  # no constructor declared: nothing to inject
            return []
        hints = typing.get_type_hints(impl.__init__)  # the "reflection": read the type hints
        params = [p for name, p in inspect.signature(impl.__init__).parameters.items() if name != "self"]
        missing = [p.name for p in params if p.name not in hints]
        if missing:
            raise RuntimeError(f"cannot resolve parameter {missing[0]} of {impl.__name__}")
        return [self.get(hints[p.name]) for p in params]


class Clock:
    pass


class OrderRepo(ABC):
    @abstractmethod
    def count(self) -> int: ...


class InMemoryOrderRepo(OrderRepo):
    def __init__(self, clock: Clock) -> None:
        self.clock = clock

    def count(self) -> int:
        return 0


class OrderService:
    def __init__(self, repo: OrderRepo, clock: Clock) -> None:
        self.repo, self.clock = repo, clock


class Ping:
    def __init__(self, pong: "Pong") -> None:
        pass


class Pong:
    def __init__(self, ping: Ping) -> None:
        pass


class Unbound(ABC):
    @abstractmethod
    def run(self) -> None: ...


class NeedsUnbound:
    def __init__(self, unbound: Unbound) -> None:
        pass


class Exploding:
    def __init__(self) -> None:
        raise ValueError("boom")


inj = MiniInjector().instance(Clock, Clock()).bind(OrderRepo, InMemoryOrderRepo).singleton(OrderRepo)
a, b = inj.get(OrderService), inj.get(OrderService)
repo_clock: Optional[Clock] = a.repo.clock  # type: ignore[attr-defined]
print(f"service prototype? {str(a is not b).lower()}, repo singleton? {str(a.repo is b.repo).lower()}, "
      f"clock shared? {str(a.clock is repo_clock).lower()}")
for bad in (Ping, NeedsUnbound, Exploding):
    try:
        inj.get(bad)
    except RuntimeError as e:
        print(e)` },
          { lang: 'ts', code: `// TypeScript erases types at run time, so a class declares its constructor dependencies in \`inject\`.
type Token<T> = abstract new (...args: any[]) => T;
type Impl<T> = (new (...args: any[]) => T) & { readonly inject?: () => readonly Token<unknown>[] };

class MiniInjector {
  private readonly bindings = new Map<Token<unknown>, Impl<unknown>>();
  private readonly instances = new Map<Token<unknown>, unknown>();
  private readonly singletonTypes = new Set<Token<unknown>>();
  private readonly resolving: Impl<unknown>[] = []; // what we are building right now (single-threaded runtime: no lock)

  bind<T>(api: Token<T>, impl: Impl<T>): this { this.bindings.set(api, impl); return this; }
  instance<T>(type: Token<T>, obj: T): this { this.instances.set(type, obj); return this; }
  singleton(type: Token<unknown>): this { this.singletonTypes.add(type); return this; }

  get<T>(type: Token<T>): T {
    const ready = this.instances.get(type);
    if (ready !== undefined) return ready as T;
    const impl = (this.bindings.get(type) ?? type) as Impl<T>;
    if (!Object.hasOwn(impl, "inject")) { // an interface-like class, or a class that did not declare itself injectable
      const top = this.resolving[this.resolving.length - 1];
      throw new Error(\`No binding for \${type.name}\` + (top ? \` (needed by \${top.name})\` : ""));
    }
    if (!this.singletonTypes.has(type) && !this.singletonTypes.has(impl)) return this.create(impl);
    let cached = this.instances.get(type) as T | undefined;
    if (cached === undefined) {
      cached = this.create(impl);
      this.instances.set(type, cached);
    }
    return cached;
  }

  private create<T>(impl: Impl<T>): T {
    if (this.resolving.includes(impl)) {
      const path = [...this.resolving.map((c) => c.name), impl.name];
      throw new Error("Dependency cycle: " + path.join(" -> "));
    }
    this.resolving.push(impl);
    try {
      const args = impl.inject!().map((t) => this.get(t));
      try {
        return new impl(...args);
      } catch (e) {
        throw new Error(\`constructor of \${impl.name} failed: \${(e as Error).message}\`);
      }
    } finally {
      this.resolving.pop();
    }
  }
}

class Clock {
  static readonly inject = (): Token<unknown>[] => [];
}

abstract class OrderRepo { // interface-like: no \`inject\`, so it needs a binding
  abstract count(): number;
}

class InMemoryOrderRepo extends OrderRepo {
  static readonly inject = (): Token<unknown>[] => [Clock];
  constructor(readonly clock: Clock) { super(); }
  count(): number { return 0; }
}

class OrderService {
  static readonly inject = (): Token<unknown>[] => [OrderRepo, Clock];
  constructor(readonly repo: OrderRepo, readonly clock: Clock) {}
}

class Ping {
  static readonly inject = (): Token<unknown>[] => [Pong];
  constructor(_pong: Pong) {}
}
class Pong {
  static readonly inject = (): Token<unknown>[] => [Ping];
  constructor(_ping: Ping) {}
}

abstract class Unbound {
  abstract run(): void;
}
class NeedsUnbound {
  static readonly inject = (): Token<unknown>[] => [Unbound];
  constructor(_u: Unbound) {}
}

class Exploding {
  static readonly inject = (): Token<unknown>[] => [];
  constructor() { throw new Error("boom"); }
}

const inj = new MiniInjector()
  .instance(Clock, new Clock())
  .bind(OrderRepo, InMemoryOrderRepo)
  .singleton(OrderRepo);
const a = inj.get(OrderService);
const b = inj.get(OrderService);
console.log(\`service prototype? \${a !== b}, repo singleton? \${a.repo === b.repo}, clock shared? \${a.clock === (a.repo as InMemoryOrderRepo).clock}\`);
for (const bad of [Ping, NeedsUnbound, Exploding] as Token<unknown>[]) {
  try { inj.get(bad); } catch (e) { console.log((e as Error).message); }
}` },
          { lang: 'cpp', code: `// C++ has no run-time reflection on constructors, so each class declares NAME and the types it needs (Deps).
template <class... Ts> struct TypeList {};

class MiniInjector {
    struct Binding {
        type_index impl;
        function<shared_ptr<void>()> make;  // builds an Impl and hands it back as a shared_ptr<Api>
    };
    unordered_map<type_index, Binding> bindings_;
    unordered_map<type_index, shared_ptr<void>> instances_;
    unordered_set<type_index> singletonTypes_;
    recursive_mutex creationLock_;
    static inline thread_local vector<pair<type_index, string>> resolving_;  // what this thread is building

    template <class Impl, class... Ds>
    shared_ptr<Impl> build(TypeList<Ds...>) {
        tuple<shared_ptr<Ds>...> deps{get<Ds>()...};  // braces: evaluated left to right
        try {
            return apply([](auto&... d) { return make_shared<Impl>(d...); }, deps);
        } catch (const exception& e) {
            throw runtime_error(string("constructor of ") + Impl::NAME + " failed: " + e.what());
        }
    }

    template <class Impl>
    shared_ptr<Impl> create() {
        type_index key(typeid(Impl));
        for (const auto& frame : resolving_) {
            if (frame.first == key) {
                string path;
                for (const auto& f : resolving_) path += f.second + " -> ";
                throw runtime_error("Dependency cycle: " + path + Impl::NAME);
            }
        }
        resolving_.emplace_back(key, Impl::NAME);
        struct Pop { ~Pop() { resolving_.pop_back(); } } pop;  // like a finally block
        return build<Impl>(typename Impl::Deps{});
    }

public:
    template <class Api, class Impl>
    MiniInjector& bind() {
        bindings_.insert_or_assign(type_index(typeid(Api)), Binding{type_index(typeid(Impl)), [this] {
            return static_pointer_cast<void>(shared_ptr<Api>(create<Impl>()));
        }});
        return *this;
    }
    template <class T>
    MiniInjector& instance(shared_ptr<T> obj) { instances_[type_index(typeid(T))] = static_pointer_cast<void>(obj); return *this; }
    template <class T>
    MiniInjector& singleton() { singletonTypes_.insert(type_index(typeid(T))); return *this; }

    template <class T>
    shared_ptr<T> get() {
        type_index key(typeid(T));
        if (auto it = instances_.find(key); it != instances_.end()) return static_pointer_cast<T>(it->second);
        auto b = bindings_.find(key);
        if (b == bindings_.end()) {
            if constexpr (is_abstract_v<T>) {
                string neededBy = resolving_.empty() ? "" : " (needed by " + resolving_.back().second + ")";
                throw runtime_error(string("No binding for ") + T::NAME + neededBy);
            } else {
                bind<T, T>();  // a concrete class can be built as itself
                b = bindings_.find(key);
            }
        }
        if (!singletonTypes_.count(key) && !singletonTypes_.count(b->second.impl)) return static_pointer_cast<T>(b->second.make());
        lock_guard<recursive_mutex> lock(creationLock_);
        auto cached = instances_.find(key);
        if (cached == instances_.end()) cached = instances_.emplace(key, b->second.make()).first;
        return static_pointer_cast<T>(cached->second);
    }
};

struct Clock {
    static constexpr const char* NAME = "Clock";
    using Deps = TypeList<>;
    virtual ~Clock() = default;
};

struct OrderRepo {  // interface: abstract, so it needs a binding
    static constexpr const char* NAME = "OrderRepo";
    virtual ~OrderRepo() = default;
    virtual int count() const = 0;
};

struct InMemoryOrderRepo : OrderRepo {
    static constexpr const char* NAME = "InMemoryOrderRepo";
    using Deps = TypeList<Clock>;
    shared_ptr<Clock> clock;
    explicit InMemoryOrderRepo(shared_ptr<Clock> c) : clock(move(c)) {}
    int count() const override { return 0; }
};

struct OrderService {
    static constexpr const char* NAME = "OrderService";
    using Deps = TypeList<OrderRepo, Clock>;
    shared_ptr<OrderRepo> repo;
    shared_ptr<Clock> clock;
    OrderService(shared_ptr<OrderRepo> r, shared_ptr<Clock> c) : repo(move(r)), clock(move(c)) {}
};

struct Pong;
struct Ping {
    static constexpr const char* NAME = "Ping";
    using Deps = TypeList<Pong>;
    explicit Ping(shared_ptr<Pong>) {}
};
struct Pong {
    static constexpr const char* NAME = "Pong";
    using Deps = TypeList<Ping>;
    explicit Pong(shared_ptr<Ping>) {}
};

struct Unbound {
    static constexpr const char* NAME = "Unbound";
    virtual ~Unbound() = default;
    virtual void run() = 0;
};
struct NeedsUnbound {
    static constexpr const char* NAME = "NeedsUnbound";
    using Deps = TypeList<Unbound>;
    explicit NeedsUnbound(shared_ptr<Unbound>) {}
};

struct Exploding {
    static constexpr const char* NAME = "Exploding";
    using Deps = TypeList<>;
    Exploding() { throw invalid_argument("boom"); }
};

int main() {
    MiniInjector inj;
    inj.instance(make_shared<Clock>()).bind<OrderRepo, InMemoryOrderRepo>().singleton<OrderRepo>();
    auto a = inj.get<OrderService>(), b = inj.get<OrderService>();
    auto repoClock = dynamic_pointer_cast<InMemoryOrderRepo>(a->repo)->clock;
    cout << boolalpha << "service prototype? " << (a != b) << ", repo singleton? " << (a->repo == b->repo)
         << ", clock shared? " << (a->clock == repoClock) << "\\n";
    auto attempt = [](auto&& action) {
        try { action(); } catch (const runtime_error& e) { cout << e.what() << "\\n"; }
    };
    attempt([&] { inj.get<Ping>(); });
    attempt([&] { inj.get<NeedsUnbound>(); });
    attempt([&] { inj.get<Exploding>(); });
}` }
        ],
      complexity: `<p>Resolution is O(size of the dependency graph) per prototype <code>get</code>; singletons are O(1) after the first build. Reflection cost is paid at startup; compile-time DI (Dagger) removes it entirely.</p>`,
      followUps: ['How would you add request scope (one instance per HTTP request)? (Scope interface + ThreadLocal/request map.)', 'How would you validate the whole graph at startup instead of on first get?', 'Why does Spring need proxies for @Transactional, and why does self-invocation bypass them?']
    }
  });

  practice.push({
    title: 'Evolve Event Schemas: Upcasters and a Projection Rebuild', level: 'Hard', tags: ['event sourcing', 'upcasting', 'schema evolution', 'projection'], companies: ['Uber', 'Zalando', 'ING'],
    statement: `<p>An order stream was written by three app versions. v1: <code>OrderPlaced{orderId, amountRupees}</code>. v2: <code>OrderPlaced{orderId, amountPaise, currency}</code>. v3: renamed to <code>OrderSubmitted{orderId, money{paise, currency}, channel}</code> with <code>channel</code> defaulting to "web" for older events. Events are stored as <code>(type, version, Map payload)</code>. Write an <b>upcaster chain</b> so the domain only ever sees the latest <code>OrderSubmitted</code> record, then rebuild a "revenue by channel" projection from the mixed history. Unknown future versions must fail loudly, not silently.</p>`,
    constraints: `History is immutable (no rewriting stored events). Up to 10<sup>7</sup> events: upcasting must be a cheap per-event transformation.`,
    example: `<p>Stored: (OrderPlaced v1, 499 rupees), (OrderPlaced v2, 25000 paise INR), (OrderSubmitted v3, 1000 paise INR, app) → upcast to three <code>OrderSubmitted</code> records: 49900/INR/web, 25000/INR/web, 1000/INR/app → revenue ${H.c('b', 'web 74900, app 1000')}.</p>`,
    brute: { why: `<p>The projection code has <code>if (version == 1) … else if (version == 2) …</code> branches everywhere events are read; each new consumer re-implements them, slightly differently. Or a migration script rewrites history in place — losing the original facts and risking corruption of the audit log.</p>`, code: { lang: 'java', code: `class RevenueBrute {
    static long amount(Map<String, Object> p, int version) {
        if (version == 1) return ((Number) p.get("amountRupees")).longValue() * 100;   // copied into every consumer...
        if (version == 2) return ((Number) p.get("amountPaise")).longValue();
        return ((Number) ((Map<?, ?>) p.get("money")).get("paise")).longValue();       // ...and each copy drifts
    }
}`, alt: [{ lang: 'python', code: "class RevenueBrute:\n    @staticmethod\n    def amount(p, version):\n        if version == 1: return int(p[\"amountRupees\"]) * 100   # copied into every consumer...\n        if version == 2: return int(p[\"amountPaise\"])\n        return int(p[\"money\"][\"paise\"])                        # ...and each copy drifts\n" }, { lang: 'ts', code: "class RevenueBrute {\n  static amount(p: Record<string, any>, version: number): number {\n    if (version === 1) return Number(p[\"amountRupees\"]) * 100;   // copied into every consumer...\n    if (version === 2) return Number(p[\"amountPaise\"]);\n    return Number(p[\"money\"][\"paise\"]);                          // ...and each copy drifts\n  }\n}\n" }, { lang: 'cpp', code: "struct RevenueBrute {\n    // payload fields flattened to \"a.b\" keys, e.g. \"money.paise\"\n    static long long amount(const map<string, long long>& p, int version) {\n        if (version == 1) return p.at(\"amountRupees\") * 100;     // copied into every consumer...\n        if (version == 2) return p.at(\"amountPaise\");\n        return p.at(\"money.paise\");                              // ...and each copy drifts\n    }\n};\n" }] } },
    mcq: { q: 'Why upcast on read instead of rewriting stored v1 events into v3?', options: ['Stored events are historical facts and the audit trail; upcasting keeps them intact while giving code one modern shape', 'Rewriting is impossible in any database', 'Upcasting is always faster than reading', 'v1 events are never read again'], answer: 0, explain: 'Immutability of the log is the core promise of event sourcing. Upcasters translate at the edge; copy-transform migrations into a new stream are a rare, deliberate last resort.' },
    hints: [`<p>Hint 1: Model a stored event as a small immutable value: <code>StoredEvent(type, version, payload)</code> where the payload is a map from field name to value.</p>`, `<p>Hint 2: Each upcaster handles one step (type, version) → next (type, version). Apply repeatedly until the event is at the latest version. Chain steps, never jump v1 → v3 directly (each step stays tiny).</p>`, `<p>Hint 3: After upcasting, deserialize into the typed event. Throw on unknown (type, version) so a newer writer deployed before the reader is noticed.</p>`],
      tests: { io: true, cases: [{ stdin: '', stdout: "o1 49900 INR web\no2 25000 INR web\no3 1000 INR app\n{app=1000, web=74900}\nno upcaster for OrderSubmitted@4\nOrderPlaced@1 is missing amountRupees\nstored v1 untouched: OrderPlaced@1 {amountRupees=499, orderId=o1}\n" }] },
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
            Object rupees = p.remove("amountRupees");
            if (rupees == null) throw new IllegalStateException("OrderPlaced@1 is missing amountRupees");
            p.put("amountPaise", ((Number) rupees).longValue() * 100);
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
        for (StoredEvent e : history) {
            OrderSubmitted o = up.upcast(e);
            System.out.println(o.orderId() + " " + o.paise() + " " + o.currency() + " " + o.channel());
        }
        System.out.println(rebuild(history, up).revenue);                     // {app=1000, web=74900}
        try { up.upcast(new StoredEvent("OrderSubmitted", 4, Map.of())); } catch (IllegalStateException e) { System.out.println(e.getMessage()); }
        try { up.upcast(new StoredEvent("OrderPlaced", 1, Map.of("orderId", "o9"))); } catch (IllegalStateException e) { System.out.println(e.getMessage()); }
        StoredEvent first = history.get(0);
        System.out.println("stored v1 untouched: " + first.type() + "@" + first.version() + " " + new TreeMap<>(first.payload()));
    }
}`,
        alt: [
          { lang: 'python', code: `from dataclasses import dataclass
from typing import Any, Callable


@dataclass(frozen=True)
class StoredEvent:  # what the event store keeps: a type, a version and a payload
    type: str
    version: int
    payload: dict[str, Any]


@dataclass(frozen=True)
class OrderSubmitted:  # the only shape the domain code ever sees
    order_id: str
    paise: int
    currency: str
    channel: str


class Upcasters:
    LATEST = "OrderSubmitted@3"

    def __init__(self) -> None:
        self._steps: dict[str, Callable[[StoredEvent], StoredEvent]] = {
            "OrderPlaced@1": self._v1_to_v2,
            "OrderPlaced@2": self._v2_to_v3,
        }

    @staticmethod
    def _v1_to_v2(e: StoredEvent) -> StoredEvent:  # rupees -> paise, assume INR
        p = dict(e.payload)  # copy: stored history is never edited
        rupees = p.pop("amountRupees", None)
        if rupees is None:
            raise RuntimeError("OrderPlaced@1 is missing amountRupees")
        p["amountPaise"] = int(rupees) * 100
        p["currency"] = "INR"
        return StoredEvent("OrderPlaced", 2, p)

    @staticmethod
    def _v2_to_v3(e: StoredEvent) -> StoredEvent:  # rename + nest money + default channel
        p = {
            "orderId": e.payload["orderId"],
            "money": {"paise": e.payload["amountPaise"], "currency": e.payload["currency"]},
            "channel": "web",
        }
        return StoredEvent("OrderSubmitted", 3, p)

    def upcast(self, e: StoredEvent) -> OrderSubmitted:
        guard = 0
        while f"{e.type}@{e.version}" != self.LATEST:
            step = self._steps.get(f"{e.type}@{e.version}")
            guard += 1
            if step is None or guard > 10:
                raise RuntimeError(f"no upcaster for {e.type}@{e.version}")
            e = step(e)
        money = e.payload["money"]
        return OrderSubmitted(e.payload["orderId"], int(money["paise"]), money["currency"], e.payload.get("channel", "web"))


class RevenueByChannel:
    def __init__(self) -> None:
        self.revenue: dict[str, int] = {}

    def on(self, e: OrderSubmitted) -> None:
        self.revenue[e.channel] = self.revenue.get(e.channel, 0) + e.paise

    @staticmethod
    def rebuild(history: list[StoredEvent], up: Upcasters) -> "RevenueByChannel":
        p = RevenueByChannel()
        for raw in history:
            p.on(up.upcast(raw))
        return p


def fmt(m: dict[str, Any]) -> str:  # sorted by key, like Java's TreeMap
    return "{" + ", ".join(f"{k}={m[k]}" for k in sorted(m)) + "}"


history = [
    StoredEvent("OrderPlaced", 1, {"orderId": "o1", "amountRupees": 499}),
    StoredEvent("OrderPlaced", 2, {"orderId": "o2", "amountPaise": 25_000, "currency": "INR"}),
    StoredEvent("OrderSubmitted", 3, {"orderId": "o3", "money": {"paise": 1_000, "currency": "INR"}, "channel": "app"}),
]
up = Upcasters()
for stored in history:
    o = up.upcast(stored)
    print(f"{o.order_id} {o.paise} {o.currency} {o.channel}")
print(fmt(RevenueByChannel.rebuild(history, up).revenue))  # {app=1000, web=74900}
for bad in (StoredEvent("OrderSubmitted", 4, {}), StoredEvent("OrderPlaced", 1, {"orderId": "o9"})):
    try:
        up.upcast(bad)
    except RuntimeError as err:
        print(err)
first = history[0]
print(f"stored v1 untouched: {first.type}@{first.version} {fmt(first.payload)}")` },
          { lang: 'ts', code: `type Payload = Record<string, unknown>;

interface StoredEvent { // what the event store keeps: a type, a version and a payload
  readonly type: string;
  readonly version: number;
  readonly payload: Payload;
}

interface OrderSubmitted { // the only shape the domain code ever sees
  readonly orderId: string;
  readonly paise: number;
  readonly currency: string;
  readonly channel: string;
}

class Upcasters {
  static readonly LATEST = "OrderSubmitted@3";
  private readonly steps = new Map<string, (e: StoredEvent) => StoredEvent>();

  constructor() {
    this.steps.set("OrderPlaced@1", (e) => { // rupees -> paise, assume INR
      const { amountRupees, ...rest } = e.payload; // rest is a copy: stored stream is never edited
      if (amountRupees === undefined || amountRupees === null) throw new Error("OrderPlaced@1 is missing amountRupees");
      return { type: "OrderPlaced", version: 2, payload: { ...rest, amountPaise: Number(amountRupees) * 100, currency: "INR" } };
    });
    this.steps.set("OrderPlaced@2", (e) => ({ // rename + nest money + default channel
      type: "OrderSubmitted",
      version: 3,
      payload: { orderId: e.payload.orderId, money: { paise: e.payload.amountPaise, currency: e.payload.currency }, channel: "web" },
    }));
  }

  upcast(stored: StoredEvent): OrderSubmitted {
    let e = stored;
    let guard = 0;
    while (\`\${e.type}@\${e.version}\` !== Upcasters.LATEST) {
      const step = this.steps.get(\`\${e.type}@\${e.version}\`);
      if (step === undefined || ++guard > 10) throw new Error(\`no upcaster for \${e.type}@\${e.version}\`);
      e = step(e);
    }
    const money = e.payload.money as { paise: number; currency: string };
    return {
      orderId: e.payload.orderId as string,
      paise: Number(money.paise),
      currency: money.currency,
      channel: (e.payload.channel as string | undefined) ?? "web",
    };
  }
}

class RevenueByChannel {
  readonly revenue = new Map<string, number>();

  on(e: OrderSubmitted): void {
    this.revenue.set(e.channel, (this.revenue.get(e.channel) ?? 0) + e.paise);
  }

  static rebuild(stream: StoredEvent[], up: Upcasters): RevenueByChannel {
    const p = new RevenueByChannel();
    for (const raw of stream) p.on(up.upcast(raw));
    return p;
  }
}

function fmt(m: Map<string, unknown>): string { // sorted by key, like Java's TreeMap
  return "{" + [...m.keys()].sort().map((k) => \`\${k}=\${m.get(k)}\`).join(", ") + "}";
}

const stream: StoredEvent[] = [
  { type: "OrderPlaced", version: 1, payload: { orderId: "o1", amountRupees: 499 } },
  { type: "OrderPlaced", version: 2, payload: { orderId: "o2", amountPaise: 25_000, currency: "INR" } },
  { type: "OrderSubmitted", version: 3, payload: { orderId: "o3", money: { paise: 1_000, currency: "INR" }, channel: "app" } },
];
const up = new Upcasters();
for (const stored of stream) {
  const o = up.upcast(stored);
  console.log(\`\${o.orderId} \${o.paise} \${o.currency} \${o.channel}\`);
}
console.log(fmt(RevenueByChannel.rebuild(stream, up).revenue)); // {app=1000, web=74900}
const bad: StoredEvent[] = [
  { type: "OrderSubmitted", version: 4, payload: {} },
  { type: "OrderPlaced", version: 1, payload: { orderId: "o9" } },
];
for (const b of bad) {
  try { up.upcast(b); } catch (err) { console.log((err as Error).message); }
}
const first = stream[0];
console.log(\`stored v1 untouched: \${first.type}@\${first.version} \${fmt(new Map(Object.entries(first.payload)))}\`);` },
          { lang: 'cpp', code: `using Payload = map<string, any>;  // like Map<String, Object>: sorted by key, values of any type

struct StoredEvent {  // what the event store keeps: a type, a version and a payload
    string type;
    int version;
    Payload payload;
};

struct OrderSubmitted {  // the only shape the domain code ever sees
    string orderId;
    long long paise;
    string currency, channel;
};

class Upcasters {
    map<string, function<StoredEvent(const StoredEvent&)>> steps_;

public:
    static inline const string LATEST = "OrderSubmitted@3";

    Upcasters() {
        steps_["OrderPlaced@1"] = [](const StoredEvent& e) {  // rupees -> paise, assume INR
            Payload p = e.payload;  // copy: stored history is never edited
            auto it = p.find("amountRupees");
            if (it == p.end()) throw runtime_error("OrderPlaced@1 is missing amountRupees");
            long long paise = any_cast<long long>(it->second) * 100;
            p.erase(it);
            p["amountPaise"] = paise;
            p["currency"] = string("INR");
            return StoredEvent{"OrderPlaced", 2, p};
        };
        steps_["OrderPlaced@2"] = [](const StoredEvent& e) {  // rename + nest money + default channel
            Payload money{{"paise", e.payload.at("amountPaise")}, {"currency", e.payload.at("currency")}};
            Payload p{{"orderId", e.payload.at("orderId")}, {"money", money}, {"channel", string("web")}};
            return StoredEvent{"OrderSubmitted", 3, p};
        };
    }

    OrderSubmitted upcast(StoredEvent e) const {
        int guard = 0;
        while (e.type + "@" + to_string(e.version) != LATEST) {
            auto step = steps_.find(e.type + "@" + to_string(e.version));
            if (step == steps_.end() || ++guard > 10) throw runtime_error("no upcaster for " + e.type + "@" + to_string(e.version));
            e = step->second(e);
        }
        const auto money = any_cast<Payload>(e.payload.at("money"));
        auto channel = e.payload.find("channel");
        return {any_cast<string>(e.payload.at("orderId")), any_cast<long long>(money.at("paise")),
                any_cast<string>(money.at("currency")), channel == e.payload.end() ? "web" : any_cast<string>(channel->second)};
    }
};

class RevenueByChannel {
public:
    map<string, long long> revenue;  // sorted by key, like Java's TreeMap
    void on(const OrderSubmitted& e) { revenue[e.channel] += e.paise; }
    static RevenueByChannel rebuild(const vector<StoredEvent>& history, const Upcasters& up) {
        RevenueByChannel p;
        for (const auto& raw : history) p.on(up.upcast(raw));
        return p;
    }
};

string show(const any& v) {
    if (v.type() == typeid(long long)) return to_string(any_cast<long long>(v));
    return any_cast<string>(v);
}

int main() {
    vector<StoredEvent> history = {
        {"OrderPlaced", 1, {{"orderId", string("o1")}, {"amountRupees", 499LL}}},
        {"OrderPlaced", 2, {{"orderId", string("o2")}, {"amountPaise", 25'000LL}, {"currency", string("INR")}}},
        {"OrderSubmitted", 3, {{"orderId", string("o3")},
                               {"money", Payload{{"paise", 1'000LL}, {"currency", string("INR")}}},
                               {"channel", string("app")}}}};
    Upcasters up;
    for (const auto& stored : history) {
        OrderSubmitted o = up.upcast(stored);
        cout << o.orderId << " " << o.paise << " " << o.currency << " " << o.channel << "\\n";
    }
    string line = "{";
    for (const auto& [channel, total] : RevenueByChannel::rebuild(history, up).revenue)
        line += (line.size() > 1 ? ", " : "") + channel + "=" + to_string(total);
    cout << line << "}\\n";  // {app=1000, web=74900}
    vector<StoredEvent> bad = {{"OrderSubmitted", 4, {}}, {"OrderPlaced", 1, {{"orderId", string("o9")}}}};
    for (const auto& b : bad) {
        try {
            up.upcast(b);
        } catch (const runtime_error& err) {
            cout << err.what() << "\\n";
        }
    }
    const auto& first = history[0];
    string payload = "{";
    for (const auto& [k, v] : first.payload) payload += (payload.size() > 1 ? ", " : "") + k + "=" + show(v);
    cout << "stored v1 untouched: " << first.type << "@" << first.version << " " << payload << "}\\n";
}` }
        ],
      complexity: `<p>O(steps) per event (a few map copies); rebuild O(N). Stored data never changes.</p>`,
      followUps: ['How do you deploy a new event version safely when old readers are still running (tolerant readers, deploy readers first)?', 'When would you choose a copy-and-transform migration into a new stream instead?', 'How would Avro/Protobuf schema registries help here?']
    }
  });

  practice.push({
    title: 'Ride-Hailing: Aggregates, Domain Events and a Process Manager', level: 'Hard', tags: ['aggregate', 'domain events', 'eventual consistency', 'saga'], companies: ['Uber', 'Ola', 'Grab', 'Lyft'],
    statement: `<p>When a <b>Trip</b> completes: the rider's <b>Payment</b> must be charged; on success the <b>Driver</b>'s earnings are credited (80% of fare) and the driver becomes available; if the charge fails, the trip is marked PAYMENT_PENDING and the rider is blocked from new trips until paid. Trip, Payment and Driver are separate aggregates (separate transactions). Design the aggregates, the events (<code>TripCompleted</code>, <code>PaymentCaptured</code>, <code>PaymentFailed</code>), and a <b>process manager</b> that reacts to events and sends the next command. Handlers must be idempotent.</p>`,
    constraints: `Millions of trips/day. No distributed transaction across aggregates. Event delivery is at-least-once.`,
    example: `<p>Trip t1 fare ₹250 completes → PaymentCaptured → driver d1 earnings ${H.c('g', '+₹200')}, available. Trip t2 card declined → PaymentFailed → trip ${H.c('y', 'PAYMENT_PENDING')}, rider blocked; duplicate TripCompleted(t1) → ${H.c('m', 'ignored, no second charge')}.</p>`,
    brute: { why: `<p><code>TripService.complete()</code> charges the card, updates the driver row and the trip row in one long method (and one DB transaction holding locks during a slow card call). If the card call times out after charging, the transaction rolls back trip and driver updates while money was taken; retrying charges twice.</p>`, code: { lang: 'java', code: `class TripServiceBrute {
    final Map<String, Long> driverEarnings = new HashMap<>();
    void complete(String trip, String driver, long fare) {
        boolean charged = Math.random() > 0.1;           // slow remote call inside the "transaction"
        if (!charged) throw new IllegalStateException("roll back everything?!");
        driverEarnings.merge(driver, fare * 80 / 100, Long::sum);   // retry after a timeout = double credit
    }
}`, alt: [{ lang: 'python', code: "import random\n\nclass TripServiceBrute:\n    def __init__(self): self.driver_earnings = {}\n\n    def complete(self, trip, driver, fare):\n        charged = random.random() > 0.1                # slow remote call inside the \"transaction\"\n        if not charged: raise RuntimeError(\"roll back everything?!\")\n        self.driver_earnings[driver] = self.driver_earnings.get(driver, 0) + fare * 80 // 100   # retry after a timeout = double credit\n" }, { lang: 'ts', code: "class TripServiceBrute {\n  driverEarnings = new Map<string, number>();\n  complete(trip: string, driver: string, fare: number): void {\n    const charged = Math.random() > 0.1;               // slow remote call inside the \"transaction\"\n    if (!charged) throw new Error(\"roll back everything?!\");\n    this.driverEarnings.set(driver, (this.driverEarnings.get(driver) ?? 0) + Math.floor(fare * 80 / 100));   // retry after a timeout = double credit\n  }\n}\n" }, { lang: 'cpp', code: "class TripServiceBrute {\npublic:\n    unordered_map<string, long long> driverEarnings;\n    void complete(const string& trip, const string& driver, long long fare) {\n        bool charged = rand() / (double)RAND_MAX > 0.1;   // slow remote call inside the \"transaction\"\n        if (!charged) throw runtime_error(\"roll back everything?!\");\n        driverEarnings[driver] += fare * 80 / 100;        // retry after a timeout = double credit\n    }\n};\n" }] } },
    mcq: { q: 'Charging succeeded but crediting the driver failed (driver DB down). What is the right recovery?', options: ['Keep the charge; the PaymentCaptured event is redelivered until the idempotent driver-credit handler succeeds', 'Refund the rider immediately', 'Roll back the trip', 'Ask the driver to call support'], answer: 0, explain: 'Each step is a committed fact. The process continues forward by retrying the next idempotent step; compensation (refund) is only for genuine business failure, not a temporarily unavailable service.' },
    hints: [`<p>Hint 1: Trip (status, riderId, driverId, fare), Payment (per trip: status, attempt ref), Driver (available flag, earnings, credited trip IDs), RiderAccount (blocked flag).</p>`, `<p>Hint 2: Process manager: on TripCompleted → command Payment.charge; on PaymentCaptured → Driver.credit + Driver.makeAvailable; on PaymentFailed → Trip.markPaymentPending + Rider.block.</p>`, `<p>Hint 3: Idempotency inside aggregates: Payment ignores a second charge for the same trip; Driver keeps the set of credited trip IDs.</p>`],
      tests: { io: true, cases: [{ stdin: '', stdout: "d1 earnings 20000, available true\nt2 PAYMENT_PENDING, ravi blocked true\nsecond complete publishes nothing: true\nd1 earnings after duplicates 20000\nd1 earnings after t3 28000\nzed blocked true\n" }] },
      solution: {
      approach: `<p>Four small aggregates, each enforcing its own rules and making repeated commands harmless. Events flow through a simple in-memory bus with a queue (to mimic asynchronous delivery). The <code>TripProcessManager</code> has no business state of its own beyond routing: it translates events into the next aggregate command. A duplicate event replays harmlessly because every step is idempotent. A <code>PaymentFailed</code> for a trip this manager has never seen still blocks the rider and does not stop the loop.</p>`,
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
                case PaymentFailed f -> {
                    Trip t = trips.get(f.tripId());
                    if (t != null) t.markPaymentPending();                                 // an unknown trip must not crash the loop
                    riders.computeIfAbsent(f.rider(), RiderAccount::new).block();
                }
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

        System.out.println("second complete publishes nothing: " + pm.trips.get("t1").complete().isEmpty());
        pm.bus.add(new PaymentCaptured("t1", "d1", 25_000));                              // duplicate delivery
        pm.drain();
        System.out.println("d1 earnings after duplicates " + d1.earnings);
        pm.trips.put("t3", new Trip("t3", "asha", "d1", 10_000));
        pm.publish(pm.trips.get("t3").complete());
        pm.drain();
        System.out.println("d1 earnings after t3 " + d1.earnings);                        // 20000 + 8000
        pm.bus.add(new PaymentFailed("t9", "zed", "card declined"));                      // a trip this manager never saw
        pm.drain();
        System.out.println("zed blocked " + pm.riders.get("zed").blocked);
    }
}`,
        alt: [
          { lang: 'python', code: `from collections import deque
from dataclasses import dataclass
from typing import Callable, Optional, Union


@dataclass(frozen=True)
class TripCompleted:
    trip_id: str
    rider: str
    driver: str
    fare: int


@dataclass(frozen=True)
class PaymentCaptured:
    trip_id: str
    driver: str
    fare: int


@dataclass(frozen=True)
class PaymentFailed:
    trip_id: str
    rider: str
    reason: str


RideEvent = Union[TripCompleted, PaymentCaptured, PaymentFailed]


class Trip:
    def __init__(self, trip_id: str, rider: str, driver: str, fare: int) -> None:
        self.id, self.rider, self.driver, self.fare = trip_id, rider, driver, fare
        self.status = "ONGOING"

    def complete(self) -> Optional[RideEvent]:
        if self.status != "ONGOING":
            return None
        self.status = "COMPLETED"
        return TripCompleted(self.id, self.rider, self.driver, self.fare)

    def mark_payment_pending(self) -> None:
        if self.status == "COMPLETED":
            self.status = "PAYMENT_PENDING"


class Payment:  # one per trip
    def __init__(self, trip_id: str) -> None:
        self.trip_id = trip_id
        self.status = "NONE"

    def charge(self, t: TripCompleted, gateway: Callable[[str], bool]) -> Optional[RideEvent]:
        if self.status != "NONE":  # idempotent: already charged or failed
            return None
        if gateway(t.rider):
            self.status = "CAPTURED"
            return PaymentCaptured(t.trip_id, t.driver, t.fare)
        self.status = "FAILED"
        return PaymentFailed(t.trip_id, t.rider, "card declined")


class Driver:
    def __init__(self, driver_id: str) -> None:
        self.id = driver_id
        self.earnings = 0
        self.available = False
        self._credited_trips: set[str] = set()

    def credit_for(self, trip_id: str, fare: int) -> None:
        if trip_id not in self._credited_trips:
            self._credited_trips.add(trip_id)
            self.earnings += fare * 80 // 100
        self.available = True


class RiderAccount:
    def __init__(self, rider_id: str) -> None:
        self.id = rider_id
        self.blocked = False

    def block(self) -> None:
        self.blocked = True


class TripProcessManager:  # coordinates the aggregates only through events
    def __init__(self, gateway: Callable[[str], bool]) -> None:
        self.trips: dict[str, Trip] = {}
        self.payments: dict[str, Payment] = {}
        self.drivers: dict[str, Driver] = {}
        self.riders: dict[str, RiderAccount] = {}
        self.bus: deque[RideEvent] = deque()
        self.gateway = gateway

    def publish(self, e: Optional[RideEvent]) -> None:
        if e is not None:
            self.bus.append(e)

    def drain(self) -> None:
        while self.bus:
            e = self.bus.popleft()
            match e:
                case TripCompleted():
                    payment = self.payments.setdefault(e.trip_id, Payment(e.trip_id))
                    self.publish(payment.charge(e, self.gateway))
                case PaymentCaptured():
                    self.drivers.setdefault(e.driver, Driver(e.driver)).credit_for(e.trip_id, e.fare)
                case PaymentFailed():
                    trip = self.trips.get(e.trip_id)
                    if trip is not None:  # an unknown trip must not crash the loop
                        trip.mark_payment_pending()
                    self.riders.setdefault(e.rider, RiderAccount(e.rider)).block()


pm = TripProcessManager(lambda rider: rider != "ravi")  # ravi's card declines
pm.trips["t1"] = Trip("t1", "asha", "d1", 25_000)
pm.trips["t2"] = Trip("t2", "ravi", "d1", 18_000)
pm.publish(pm.trips["t1"].complete())
pm.publish(pm.trips["t2"].complete())
pm.drain()
pm.bus.append(TripCompleted("t1", "asha", "d1", 25_000))  # duplicate delivery
pm.drain()
d1 = pm.drivers["d1"]
print(f"d1 earnings {d1.earnings}, available {str(d1.available).lower()}")  # 20000 once
print(f"t2 {pm.trips['t2'].status}, ravi blocked {str(pm.riders['ravi'].blocked).lower()}")
print("second complete publishes nothing:", str(pm.trips["t1"].complete() is None).lower())
pm.bus.append(PaymentCaptured("t1", "d1", 25_000))  # duplicate delivery
pm.drain()
print(f"d1 earnings after duplicates {d1.earnings}")
pm.trips["t3"] = Trip("t3", "asha", "d1", 10_000)
pm.publish(pm.trips["t3"].complete())
pm.drain()
print(f"d1 earnings after t3 {d1.earnings}")  # 20000 + 8000
pm.bus.append(PaymentFailed("t9", "zed", "card declined"))  # a trip this manager never saw
pm.drain()
print(f"zed blocked {str(pm.riders['zed'].blocked).lower()}")` },
          { lang: 'ts', code: `type RideEvent =
  | { readonly kind: "TripCompleted"; readonly tripId: string; readonly rider: string; readonly driver: string; readonly fare: number }
  | { readonly kind: "PaymentCaptured"; readonly tripId: string; readonly driver: string; readonly fare: number }
  | { readonly kind: "PaymentFailed"; readonly tripId: string; readonly rider: string; readonly reason: string };

type TripCompleted = Extract<RideEvent, { kind: "TripCompleted" }>;

class Trip {
  status = "ONGOING";
  constructor(readonly id: string, readonly rider: string, readonly driver: string, readonly fare: number) {}

  complete(): RideEvent | undefined {
    if (this.status !== "ONGOING") return undefined;
    this.status = "COMPLETED";
    return { kind: "TripCompleted", tripId: this.id, rider: this.rider, driver: this.driver, fare: this.fare };
  }
  markPaymentPending(): void {
    if (this.status === "COMPLETED") this.status = "PAYMENT_PENDING";
  }
}

class Payment { // one per trip
  status = "NONE";
  constructor(readonly tripId: string) {}

  charge(t: TripCompleted, gateway: (rider: string) => boolean): RideEvent | undefined {
    if (this.status !== "NONE") return undefined; // idempotent: already charged or failed
    if (gateway(t.rider)) {
      this.status = "CAPTURED";
      return { kind: "PaymentCaptured", tripId: t.tripId, driver: t.driver, fare: t.fare };
    }
    this.status = "FAILED";
    return { kind: "PaymentFailed", tripId: t.tripId, rider: t.rider, reason: "card declined" };
  }
}

class Driver {
  earnings = 0;
  available = false;
  private readonly creditedTrips = new Set<string>();
  constructor(readonly id: string) {}

  creditFor(tripId: string, fare: number): void {
    if (!this.creditedTrips.has(tripId)) {
      this.creditedTrips.add(tripId);
      this.earnings += Math.floor((fare * 80) / 100);
    }
    this.available = true;
  }
}

class RiderAccount {
  blocked = false;
  constructor(readonly id: string) {}
  block(): void { this.blocked = true; }
}

class TripProcessManager { // coordinates the aggregates only through events
  readonly trips = new Map<string, Trip>();
  readonly payments = new Map<string, Payment>();
  readonly drivers = new Map<string, Driver>();
  readonly riders = new Map<string, RiderAccount>();
  readonly bus: RideEvent[] = [];

  constructor(private readonly gateway: (rider: string) => boolean) {}

  publish(e: RideEvent | undefined): void {
    if (e !== undefined) this.bus.push(e);
  }

  drain(): void {
    for (let e = this.bus.shift(); e !== undefined; e = this.bus.shift()) {
      switch (e.kind) {
        case "TripCompleted": {
          let payment = this.payments.get(e.tripId);
          if (payment === undefined) { payment = new Payment(e.tripId); this.payments.set(e.tripId, payment); }
          this.publish(payment.charge(e, this.gateway));
          break;
        }
        case "PaymentCaptured": {
          let driver = this.drivers.get(e.driver);
          if (driver === undefined) { driver = new Driver(e.driver); this.drivers.set(e.driver, driver); }
          driver.creditFor(e.tripId, e.fare);
          break;
        }
        case "PaymentFailed": {
          this.trips.get(e.tripId)?.markPaymentPending(); // an unknown trip must not crash the loop
          let rider = this.riders.get(e.rider);
          if (rider === undefined) { rider = new RiderAccount(e.rider); this.riders.set(e.rider, rider); }
          rider.block();
          break;
        }
      }
    }
  }
}

const pm = new TripProcessManager((rider) => rider !== "ravi"); // ravi's card declines
pm.trips.set("t1", new Trip("t1", "asha", "d1", 25_000));
pm.trips.set("t2", new Trip("t2", "ravi", "d1", 18_000));
pm.publish(pm.trips.get("t1")!.complete());
pm.publish(pm.trips.get("t2")!.complete());
pm.drain();
pm.bus.push({ kind: "TripCompleted", tripId: "t1", rider: "asha", driver: "d1", fare: 25_000 }); // duplicate delivery
pm.drain();
const d1 = pm.drivers.get("d1")!;
console.log(\`d1 earnings \${d1.earnings}, available \${d1.available}\`); // 20000 once
console.log(\`t2 \${pm.trips.get("t2")!.status}, ravi blocked \${pm.riders.get("ravi")!.blocked}\`);
console.log("second complete publishes nothing: " + (pm.trips.get("t1")!.complete() === undefined));
pm.bus.push({ kind: "PaymentCaptured", tripId: "t1", driver: "d1", fare: 25_000 }); // duplicate delivery
pm.drain();
console.log(\`d1 earnings after duplicates \${d1.earnings}\`);
pm.trips.set("t3", new Trip("t3", "asha", "d1", 10_000));
pm.publish(pm.trips.get("t3")!.complete());
pm.drain();
console.log(\`d1 earnings after t3 \${d1.earnings}\`); // 20000 + 8000
pm.bus.push({ kind: "PaymentFailed", tripId: "t9", rider: "zed", reason: "card declined" }); // a trip this manager never saw
pm.drain();
console.log(\`zed blocked \${pm.riders.get("zed")!.blocked}\`);` },
          { lang: 'cpp', code: `struct TripCompleted { string tripId, rider, driver; long long fare; };
struct PaymentCaptured { string tripId, driver; long long fare; };
struct PaymentFailed { string tripId, rider, reason; };
using RideEvent = variant<TripCompleted, PaymentCaptured, PaymentFailed>;

template <class... Ts>
struct Overloaded : Ts... { using Ts::operator()...; };
template <class... Ts>
Overloaded(Ts...) -> Overloaded<Ts...>;

struct Trip {
    string id, rider, driver;
    long long fare;
    string status = "ONGOING";

    Trip(string i, string r, string d, long long f) : id(move(i)), rider(move(r)), driver(move(d)), fare(f) {}
    optional<RideEvent> complete() {
        if (status != "ONGOING") return nullopt;
        status = "COMPLETED";
        return TripCompleted{id, rider, driver, fare};
    }
    void markPaymentPending() {
        if (status == "COMPLETED") status = "PAYMENT_PENDING";
    }
};

struct Payment {  // one per trip
    string tripId;
    string status = "NONE";

    optional<RideEvent> charge(const TripCompleted& t, const function<bool(const string&)>& gateway) {
        if (status != "NONE") return nullopt;  // idempotent: already charged or failed
        if (gateway(t.rider)) {
            status = "CAPTURED";
            return PaymentCaptured{t.tripId, t.driver, t.fare};
        }
        status = "FAILED";
        return PaymentFailed{t.tripId, t.rider, "card declined"};
    }
};

struct Driver {
    string id;
    long long earnings = 0;
    bool available = false;
    set<string> creditedTrips;

    void creditFor(const string& tripId, long long fare) {
        if (creditedTrips.insert(tripId).second) earnings += fare * 80 / 100;
        available = true;
    }
};

struct RiderAccount {
    string id;
    bool blocked = false;
    void block() { blocked = true; }
};

class TripProcessManager {  // coordinates the aggregates only through events
public:
    map<string, Trip> trips;
    map<string, Payment> payments;
    map<string, Driver> drivers;
    map<string, RiderAccount> riders;
    deque<RideEvent> bus;
    function<bool(const string&)> gateway;

    explicit TripProcessManager(function<bool(const string&)> g) : gateway(move(g)) {}

    void publish(const optional<RideEvent>& e) {
        if (e) bus.push_back(*e);
    }

    void drain() {
        while (!bus.empty()) {
            RideEvent e = bus.front();
            bus.pop_front();
            visit(Overloaded{
                [&](const TripCompleted& t) {
                    auto it = payments.try_emplace(t.tripId, Payment{t.tripId}).first;
                    publish(it->second.charge(t, gateway));
                },
                [&](const PaymentCaptured& p) {
                    auto it = drivers.try_emplace(p.driver, Driver{p.driver}).first;
                    it->second.creditFor(p.tripId, p.fare);
                },
                [&](const PaymentFailed& f) {
                    auto trip = trips.find(f.tripId);
                    if (trip != trips.end()) trip->second.markPaymentPending();  // an unknown trip must not crash the loop
                    riders.try_emplace(f.rider, RiderAccount{f.rider}).first->second.block();
                }}, e);
        }
    }
};

int main() {
    TripProcessManager pm([](const string& rider) { return rider != "ravi"; });  // ravi's card declines
    pm.trips.emplace("t1", Trip("t1", "asha", "d1", 25'000));
    pm.trips.emplace("t2", Trip("t2", "ravi", "d1", 18'000));
    pm.publish(pm.trips.at("t1").complete());
    pm.publish(pm.trips.at("t2").complete());
    pm.drain();
    pm.bus.push_back(TripCompleted{"t1", "asha", "d1", 25'000});  // duplicate delivery
    pm.drain();
    const Driver& d1 = pm.drivers.at("d1");
    cout << boolalpha;
    cout << "d1 earnings " << d1.earnings << ", available " << d1.available << "\\n";  // 20000 once
    cout << "t2 " << pm.trips.at("t2").status << ", ravi blocked " << pm.riders.at("ravi").blocked << "\\n";
    cout << "second complete publishes nothing: " << !pm.trips.at("t1").complete().has_value() << "\\n";
    pm.bus.push_back(PaymentCaptured{"t1", "d1", 25'000});  // duplicate delivery
    pm.drain();
    cout << "d1 earnings after duplicates " << d1.earnings << "\\n";
    pm.trips.emplace("t3", Trip("t3", "asha", "d1", 10'000));
    pm.publish(pm.trips.at("t3").complete());
    pm.drain();
    cout << "d1 earnings after t3 " << d1.earnings << "\\n";  // 20000 + 8000
    pm.bus.push_back(PaymentFailed{"t9", "zed", "card declined"});  // a trip this manager never saw
    pm.drain();
    cout << "zed blocked " << pm.riders.at("zed").blocked << "\\n";
}` }
        ],
      complexity: `<p>O(1) per event per handler. Each aggregate is tiny and locked only during its own step, so millions of trips scale horizontally (partition by trip/driver ID).</p>`,
      followUps: ['Where would timeouts go (payment pending for 24 hours → collections)? (Process manager schedules a deadline event.)', 'How do you show the rider a consistent trip receipt while steps are still in flight?', 'Choreography (handlers react independently) vs orchestration (this process manager) — trade-offs?']
    }
  });
  /* ======================= QUIZ ======================= */
  quiz.push(
    { q: 'What is an "anemic domain model"?', options: ['Domain classes with only getters/setters while all rules live in service classes', 'A model with too few classes', 'A model that uses value objects everywhere', 'A database with no indexes'], answer: 0, explain: 'Anemic objects hold data but no behaviour, so rules are duplicated across services and nothing stops invalid state.' },
    { q: 'Which injection style should be your default in plain code?', options: ['Constructor injection with read-only fields (final / readonly / const)', 'Field injection with reflection', 'Setter injection', 'A static service locator'], answer: 0, explain: 'Constructor injection makes dependencies explicit, required and immutable, and needs no framework for tests.' },
    { q: 'In a hand-written DI container, what is the "resolution stack" for?', options: ['Detecting dependency cycles and reporting the path', 'Caching singletons', 'Sorting beans alphabetically', 'Running constructors in parallel'], answer: 0, explain: 'If a type is requested while it is already being built higher up the stack, there is a cycle (A → B → A).' },
    { q: 'In hexagonal architecture, a JDBC repository implementing <code>BookRepository</code> is a…', options: ['Driven (secondary) adapter implementing an outbound port', 'Driving adapter', 'Inbound port', 'Domain entity'], answer: 0, explain: 'The core needs storage; it defines the BookRepository port; the JDBC class is the driven adapter that implements it.' },
    { q: 'Which statement about source-code dependencies in hexagonal architecture is true?', options: ['They all point inward: adapters depend on ports, the domain depends on nothing external', 'The domain depends on the database layer', 'Ports depend on adapters', 'Controllers and repositories depend on each other'], answer: 0, explain: 'The dependency rule: the core owns the interfaces; technology plugs in from outside.' },
    { q: 'Two <code>Money(100, "INR")</code> objects created separately are…', options: ['Equal, because value objects compare by value', 'Different, because they are different objects', 'Equal only if they are the same reference', 'Not comparable'], answer: 0, explain: 'Value objects have no identity; equality is defined by their attributes (records, frozen dataclasses and structs with a defaulted comparison do this automatically).' },
    { q: 'How should an entity implement <code>equals</code>?', options: ['By its identity (ID) only', 'By all fields', 'By reference only', 'It should never override equals'], answer: 0, explain: 'An entity stays the same entity even when its attributes change, so only the ID matters.' },
    { q: 'Which is NOT one of Vernon\'s aggregate design rules?', options: ['Make aggregates as large as possible to keep everything consistent', 'Reference other aggregates by identity', 'Design small aggregates', 'Use eventual consistency outside the boundary'], answer: 0, explain: 'Large aggregates cause contention and slow loads. Keep them small; only true invariants share a boundary.' },
    { q: 'Should there be an <code>OrderLineRepository</code> when OrderLine is inside the Order aggregate?', options: ['No — repositories exist only for aggregate roots; lines are loaded and saved with their Order', 'Yes, every table needs a repository', 'Yes, for performance', 'Only in event sourcing'], answer: 0, explain: 'Exposing inner entities through their own repository lets callers bypass the root and its invariants.' },
    { q: 'Why dispatch domain events <i>after</i> the aggregate is saved?', options: ['So handlers only react to committed facts (no emails for orders that failed to save)', 'Because events are slow', 'Because handlers need the database lock', 'It does not matter'], answer: 0, explain: 'Publishing before commit can announce something that never happened. The outbox makes "save + record event" atomic.' },
    { q: 'The transactional outbox gives which delivery guarantee?', options: ['At-least-once, so consumers must be idempotent', 'Exactly-once with no extra work', 'At-most-once', 'No guarantee'], answer: 0, explain: 'The relay may publish and crash before marking sent, so duplicates are possible. Idempotent consumers make the effect exactly-once.' },
    { q: 'In event sourcing, where must business-rule validation happen?', options: ['When deciding on a command, before producing events — never inside apply', 'Inside apply while replaying', 'In the event store', 'In projections'], answer: 0, explain: 'Apply must always succeed for historical events; rules only gate new commands.' },
    { q: 'What is a snapshot in event sourcing?', options: ['A cached state at version N so loading replays only later events', 'A backup of the database', 'A projection for the UI', 'A deleted event'], answer: 0, explain: 'Snapshots speed up loading; they can be deleted and rebuilt from the log at any time.' },
    { q: 'Which is the best sign that a plugin architecture (not just a strategy) is needed?', options: ['Third parties or other teams add features without changing or redeploying the core', 'There are two algorithms', 'The code has an if statement', 'You use an object-oriented language'], answer: 0, explain: 'Plugin systems add discovery, versioning, lifecycle and isolation on top of the strategy idea — worth it when extension is external.' }
  );

  /* ======================= INTERVIEW ======================= */
  interview.push(
    { q: 'What is wrong with a "tightly coupled, anemic" design, and how would you fix it incrementally?', level: 'B', a: `<p><b>Coupling:</b> services build their own dependencies with <code>new</code> (DB client, payment SDK, mailer), so any vendor change edits business code and nothing is unit-testable without real infrastructure. <b>Anemia:</b> entities are getter/setter bags; rules live in many services and get duplicated, and one copy is eventually wrong. <b>Incremental fix:</b> add seams at boundaries (interfaces for I/O, time, randomness) with constructor injection; move one rule at a time into an entity method (<code>order.cancel()</code>) and delete the setter; cover each step with fast tests using fakes. Strangle, do not rewrite.</p>`, followUps: ['How do you find all copies of a rule in a big codebase?', 'When is an anemic model acceptable?'] },
    { q: 'Explain dependency injection without mentioning any framework.', level: 'B', a: `<p>A class receives what it needs through its constructor instead of creating it. <code>OrderService(OrderRepository repo, PaymentPort pay, Clock clock)</code>. One place — the <b>composition root</b>, usually <code>main</code> — builds the concrete objects from the leaves up and passes them in. Tests build the same class with fakes. Benefits: dependencies are visible, swappable and testable; the class depends on abstractions (DIP). A container (Spring, Guice, Dagger) only automates the composition root: registry of bindings + recursive resolution + scopes + lifecycle.</p>`, followUps: ['DI vs Service Locator?', 'What is a captive dependency?', 'How would you write a container in 30 lines?'] },
    { q: 'How does a DI container resolve a dependency graph, and how does it detect cycles?', level: 'I', a: `<p>For a requested type it looks up the binding (interface → implementation or factory), checks the singleton cache, otherwise pushes the type onto a <b>resolution stack</b>, recursively resolves each constructor parameter, invokes the constructor, caches it if singleton, and pops. If a type is requested while already on the stack, there is a cycle; the stack contents give the exact path (A → B → A). Spring can break some setter/field cycles via early references but constructor cycles fail, and Spring Boot rejects cycles by default since 2.6. The right fix is usually a design change: extract the shared part into a third class or decouple with an event.</p>`, followUps: ['How do scopes (singleton/prototype/request) change resolution?', 'Compile-time DI (Dagger) — what is different?'] },
    { q: 'Design a plugin system for exporting reports in many formats, built by third parties.', level: 'I', a: `<p><b>Extension point:</b> a tiny, stable <code>ExporterPlugin</code> interface (<code>format()</code>, <code>apiVersion()</code>, <code>start/stop</code>, <code>export(Report)</code>) with immutable inputs (value types such as records or frozen dataclasses). <b>Discovery:</b> a service loader (Java <code>ServiceLoader</code> with <code>META-INF/services</code>, Python entry points, Node dynamic <code>import()</code>, C++ <code>dlopen</code>) or a plugins folder, optionally one isolated loader or process per plugin for dependency isolation and hot install. <b>Registry:</b> map format → plugin, with conflict rules. <b>Safety:</b> version check at load, try/catch around start and every call, timeouts on an executor, quarantine failing plugins, and out-of-process execution for untrusted code. <b>Evolution:</b> add default methods, semantic versioning, contract tests run against every plugin.</p>`, followUps: ['How do you unload a plugin without leaking memory?', 'How is MCP similar to this?'] },
    { q: 'Walk through hexagonal architecture at class level for a "borrow book" feature.', level: 'I', a: `<p><b>Domain:</b> <code>Book</code> (entity with <code>borrow(member, today)</code>), <code>BookId</code>, <code>MemberId</code> (VOs). <b>Inbound port:</b> <code>BorrowBookUseCase.borrow(BorrowBookCommand)</code>. <b>Outbound ports:</b> <code>BookRepository</code>, <code>MemberNotifier</code>, <code>Clock</code>. <b>Application service:</b> <code>BorrowBookService implements BorrowBookUseCase</code> — load via port, call the domain, save, notify. <b>Driving adapters:</b> REST controller, CLI, Kafka consumer, tests — each translates its input to the command and maps errors (DomainException → 409). <b>Driven adapters:</b> JDBC/Mongo repositories, email notifier. Composition root wires them. Every compile-time arrow points inward; enforce with modules or ArchUnit.</p>`, followUps: ['Where do transactions go?', 'Do you map between domain and persistence models? Trade-offs?'] },
    { q: 'Entity vs value object: how do you decide, and how do you implement each in code?', level: 'B', a: `<p>Ask: "does the business track <i>this particular one</i> over time?" Yes → <b>entity</b>: stable typed ID (<code>record CustomerId(UUID value)</code>), behaviour methods instead of setters, <code>equals/hashCode</code> on ID only. No → <b>value object</b>: an immutable type (a Java <code>record</code>, frozen dataclass, readonly class or C++ struct) that validates in its constructor, operations return new instances (<code>money.plus(other)</code>), equality by all fields. Default to value objects; they remove primitive obsession, centralise validation, are thread-safe and make great map keys. The same real-world thing can be either depending on context (a ₹500 note for a shop vs for the central bank).</p>`, followUps: ['How do you persist value objects?', 'Why never use double for money?'] },
    { q: 'How do you find aggregate boundaries for a new domain?', level: 'A', a: `<p>(1) List every invariant as a one-line rule. (2) For each, list the minimal data it needs. (3) Data that must be consistent <b>immediately and together</b> forms one aggregate with a root that enforces the rule. (4) Everything else is referenced <b>by ID</b> and synchronised with domain events (eventual consistency). (5) Check size and contention: if one aggregate would be loaded by thousands of concurrent users (a product's stock inside every order), split it and ask the business whether the rule can tolerate a short delay. (6) One repository per root; one aggregate per transaction (justify exceptions). Example: Order(lines, total limit) vs Inventory(stock per SKU) vs Customer(credit).</p>`, followUps: ['How do you handle a uniqueness rule across all users?', 'What if two aggregates truly must change atomically?'] },
    { q: 'What is optimistic locking on aggregates and when would you choose pessimistic locking?', level: 'I', a: `<p>Each aggregate carries a <b>version</b>. Save does <code>UPDATE … SET version = v+1 WHERE id = ? AND version = v</code> (or appends events with expected version). If 0 rows match, someone else saved first → <code>ConcurrencyConflict</code>; the application reloads, re-runs the command against fresh state (it may now be rejected) and saves again with bounded retries. No locks are held while the user thinks. <b>Pessimistic</b> (<code>SELECT … FOR UPDATE</code>) suits hot aggregates where retries would storm (a flash-sale counter) or long critical sections — at the cost of blocking and deadlock risk. Very hot single aggregates are better served by a single-writer queue per aggregate.</p>`, followUps: ['How do you surface a conflict to a user editing a form?', 'Lost update vs write skew?'] },
    { q: 'Explain domain events and the dual-write problem. How does the transactional outbox solve it?', level: 'A', a: `<p>A domain event is a past-tense fact (<code>OrderPlaced</code>) recorded by an aggregate, used to trigger work in other aggregates/services without coupling. The <b>dual-write problem</b>: saving to the DB and publishing to a broker are two systems — one can succeed while the other fails, causing lost or phantom events. <b>Outbox:</b> in the same DB transaction as the aggregate, insert the event into an <code>outbox</code> table. A relay (polling with <code>FOR UPDATE SKIP LOCKED</code>, or CDC like Debezium) publishes rows and marks them sent. Crashes between publish and mark cause duplicates → <b>at-least-once</b>; consumers dedupe on <code>eventId</code> (processed table in the same transaction as their effect). Partition by aggregate ID to keep per-aggregate order.</p>`, followUps: ['Domain events vs integration events?', 'Why not publish inside the DB transaction?'] },
    { q: 'What is event sourcing? Write the core loop in pseudocode.', level: 'A', a: `<p>The source of truth is an append-only stream of events per aggregate; state is derived. <b>Load:</b> <code>state = empty; for (e : store.read(id)) state.apply(e);</code>. <b>Handle command:</b> <code>events = decide(command, state)</code> — validates and may reject. <b>Save:</b> <code>store.append(id, expectedVersion = state.version, events)</code> — fails if someone appended first; retry. <b>apply</b> is a pure state change that never validates or throws. Add <b>snapshots</b> for long streams and <b>projections</b> (read models) fed by the global event feed, rebuildable at any time. Benefits: full audit, time travel, new read models from old data. Costs: schema evolution (upcasters), eventual consistency of reads, GDPR (crypto-shredding), learning curve.</p>`, followUps: ['How do you fix a wrong event that was already stored?', 'Event store on Postgres — schema?'] },
    { q: 'When would you NOT use event sourcing or full DDD tactical patterns?', level: 'E', a: `<p>For CRUD-heavy areas with few rules (admin settings, reference data, simple catalogues), a transaction script or plain repository over tables is simpler and faster to build. Event sourcing adds versioning discipline, projection infrastructure, eventual consistency in the UI and harder ad-hoc querying; DDD aggregates add mapping and ceremony. Apply them selectively to the <b>core domain</b> where rules, auditability or concurrency matter (payments, bookings, inventory, ledgers). Mixed architectures are normal: one bounded context event-sourced, another CRUD. Saying this in an interview shows judgement rather than pattern enthusiasm.</p>`, followUps: ['How do you migrate one aggregate to event sourcing later?', 'What is a bounded context and how does it relate?'] },
    { q: 'How do you evolve event schemas once events are stored forever?', level: 'E', a: `<p>Never edit stored events. Options: (1) <b>weak schema / tolerant reader</b>: only additive changes with defaults; (2) <b>upcasters</b>: single-step transformers applied on read (v1 → v2 → v3) so domain code sees only the latest shape; (3) <b>new event type</b> for changed meaning (OrderSubmitted alongside OrderPlaced); (4) <b>copy-and-transform</b> into a new stream as a rare migration. Use a version field and schemas (Avro/Protobuf/JSON Schema with a registry) for integration events; deploy readers before writers; fail loudly on unknown versions. Name events in domain language from day one — they are your most durable API.</p>`, followUps: ['How do you handle renamed fields with Avro?', 'What does "deploy readers first" protect against?'] },
    { q: 'How do AI tools change the way you design and maintain these architectures?', level: 'E', a: `<p>AI generates code fast, which makes coupling and anemic models grow fast too, so explicit boundaries matter more. Small, well-named ports and plugin interfaces are ideal units of work for coding agents ("write a DynamoDB adapter that passes the repository contract tests"). LLMs themselves belong behind outbound ports (swap providers, deterministic fakes in tests). Agent tool calls are driving adapters and should map to aggregate commands, so a confused agent cannot corrupt state. AI is great at discovery tasks (find all rule copies, map event publishers/subscribers, list invariants) but humans must own boundary decisions, consistency trade-offs and long-lived contracts like event schemas.</p>`, followUps: ['How would you review an AI-generated domain model?', 'How do you make an agent\'s actions auditable? (Event-sourced run logs.)'] }
  );
  registerModule({
    id: 'lld11',
    title: 'Extensible Architecture & DDD Tactical Patterns',
    intro: `<p>Most code works on day one. The hard part is day three hundred, when the payment provider changes, a new rule arrives, three teams want to add features and an auditor asks "what was this balance on 1st March?". This module teaches the tools senior engineers use to build code that <b>survives change</b>.</p>
<p>We start with the <b>brute force</b> almost everyone writes first — tightly coupled services and anemic data classes — and watch a single change ripple through it. Then we fix it, one tool at a time: <b>dependency injection by hand</b> (and a container you write yourself), <b>plugin architectures</b>, <b>hexagonal architecture</b> (ports and adapters) at class level, the DDD building blocks — <b>entities, value objects, aggregates, repositories, domain events</b> — and finally <b>event sourcing</b>, where you store the story and rebuild the state.</p>
<p>Every topic has an everyday analogy first, an interactive visualizer (change ripples, DI wiring, plugin boot, ports-and-adapters rings, aggregate boundaries, event flow with outbox, and event-log replay step by step), compilable code with no frameworks in Java, Python, TypeScript and C++, worked examples, an expert deep dive and an AI-era section. Practice problems ask you to model domains, find aggregate boundaries and rebuild state from events.</p>`,
    goals: [
      'Explain why tightly coupled, anemic designs hurt and refactor them step by step into rich, testable models',
      'Wire an application by hand with constructor injection and a composition root, and build a small DI container with scopes and cycle detection',
      'Design a plugin architecture with extension points, discovery (a service loader, entry points or a plugin folder), versioning, lifecycle and failure isolation',
      'Structure a feature as a hexagon: domain, inbound/outbound ports, driving/driven adapters, with all dependencies pointing inward',
      'Model a domain with entities, value objects, small aggregates and repositories, and find aggregate boundaries from invariants',
      'Use domain events with the transactional outbox and idempotent handlers for eventual consistency between aggregates',
      'Implement event sourcing in code: decide/apply, rehydration, expected-version appends, snapshots, projections and upcasting'
    ],
    prereqs: `LLD 2 (SOLID — especially Dependency Inversion), LLD 4–6 (creational, structural and behavioral patterns: Strategy, Observer, Decorator), LLD 10 (Concurrency in LLD) for optimistic locking intuition, and comfortable modern Java (interfaces, records, sealed types, lambdas, generics).`,
    hours: 16,
    langNotes: {
      java: `<p><b>Ports, plugins and closed sets.</b> A port is a plain <code>interface</code>; keep it small enough that a lambda can be a test fake (<code>PaymentPort</code> with one method). <code>default</code> methods let an extension point grow without breaking old plugins, but a default that throws is an LSP lie. <code>sealed</code> interfaces with <code>record</code>s and an exhaustive pattern-matching <code>switch</code> are the closed set for domain events: adding an event type becomes a compile error in every <code>apply</code> that forgot it. <b>Equality and hashing.</b> A <code>record</code> gets <code>equals</code>, <code>hashCode</code> and <code>toString</code> from all its fields, which is exactly a value object; an entity overrides <code>equals</code>/<code>hashCode</code> on its ID only and must never use mutable fields in the hash. Mutable keys in a <code>HashSet</code> are the classic bug. <b>Immutability.</b> A record is only shallowly immutable: copy collections in the compact constructor (<code>List.copyOf</code>) and validate there so every instance is valid. <b>Injection and discovery.</b> Constructor injection with <code>final</code> fields; time is a <code>java.time.Clock</code> (<code>Clock.fixed</code> in tests). Reflection (<code>getDeclaredConstructors</code>, <code>getParameterTypes</code>) powers containers, and <code>ServiceLoader</code> discovers plugins; unwrap <code>InvocationTargetException</code> to show the real error. <b>Numbers and time.</b> Money is a <code>long</code> of minor units (<code>Math.addExact</code>/<code>multiplyExact</code> throw instead of wrapping) or <code>BigDecimal</code> with an explicit <code>RoundingMode</code>; integer <code>/</code> truncates toward zero, so use <code>Math.floorDiv</code>/<code>floorMod</code> when splitting negative amounts. <b>Concurrency.</b> Optimistic locking is a version field checked inside a <code>synchronized</code> save; <code>ThreadLocal</code> keeps a per-thread resolution stack.</p>`,
      python: `<p><b>Ports, plugins and closed sets.</b> Use <code>abc.ABC</code> with <code>@abstractmethod</code> for a port that implementers must complete, or <code>typing.Protocol</code> when any object with the right methods should fit (a plugin from another package never has to inherit from your class). An abstract property such as <code>id</code> can be satisfied by a plain class attribute (<code>id = "csv"</code>). Closed sets of events are a <code>Union</code> of frozen dataclasses handled with <code>match</code>; a type checker (mypy, pyright) reports a missing case, the interpreter does not. <b>Equality and hashing.</b> <code>@dataclass(frozen=True)</code> generates <code>__eq__</code> and <code>__hash__</code> from the fields, which makes value objects usable as dictionary keys and set members; normalise in <code>__post_init__</code> with <code>object.__setattr__</code> because a frozen dataclass refuses assignment. An entity defines <code>__eq__</code> and <code>__hash__</code> on its ID only (defining <code>__eq__</code> alone removes <code>__hash__</code>). <b>Immutability.</b> Frozen dataclasses are shallow: use tuples and <code>MappingProxyType</code> for collections that must not change. <b>Injection and discovery.</b> A <code>Callable</code> is the one-method port (<code>Callable[[], datetime]</code> for a clock). A container reads constructor type hints with <code>typing.get_type_hints</code> and <code>inspect.signature</code>; <code>inspect.isabstract</code> detects unbound interfaces; plugins are found with <code>importlib.metadata.entry_points</code>. <b>Numbers and time.</b> Integers never overflow, so enforce a 64-bit range yourself when the model says so; use <code>Decimal</code> with <code>ROUND_HALF_EVEN</code> for percentages, because <code>round()</code> also rounds halves to even but <code>float</code> cannot hold 0.1; <code>//</code> and <code>divmod</code> floor, which is what fair allocation of negative amounts needs. <b>Concurrency.</b> Guard a check-then-store with <code>threading.Lock</code>; use <code>threading.local</code> for a per-thread resolution stack.</p>`,
      js: `<p><b>TypeScript.</b> <b>Ports, plugins and closed sets.</b> An <code>interface</code> is erased at run time and structural, so an object literal is a valid fake (<code>{ charge: () =&gt; false }</code>) and a plugin never has to import your type. TypeScript has no default methods on interfaces: use an <code>abstract class</code> with default hooks (<code>start()</code>, <code>stop()</code>), and use an abstract class as a run-time <b>token</b> when a container must key on it. Closed sets are discriminated unions (<code>kind: "OrderPlaced" | "OrderPaid"</code>); a <code>switch</code> over <code>kind</code> is checked for exhaustiveness by the compiler. <b>Equality and hashing.</b> <code>===</code>, <code>Map</code> and <code>Set</code> compare objects by identity, so a value object needs an <code>equals</code> method and must be keyed by a string built from its fields (<code>map.set(email.value, email)</code>); entities compare IDs. <b>Immutability.</b> <code>readonly</code> and <code>ReadonlyMap</code> exist only at compile time; copy in constructors (<code>new Map(items)</code>, spread) or <code>Object.freeze</code>. <b>Injection and discovery.</b> Types are erased, so there is no constructor reflection: each injectable class declares its dependencies (a static <code>inject</code> list), and plugins are loaded with dynamic <code>import()</code> from paths the host lists. Constructor parameter properties (<code>constructor(private readonly repo: Repo) {}</code>) are the shortest injection. Time is a <code>() =&gt; Date</code>. <b>Numbers and time.</b> <code>number</code> is exact only to 2^53: keep money in integer minor units and use <code>bigint</code> when a 64-bit range or an exact percentage matters; <code>/</code> does not truncate, so use <code>Math.floor</code> when splitting. <b>Concurrency.</b> The runtime is single-threaded, so a repository method that checks a version and stores runs to completion without a lock; optimistic locking still matters across processes. Avoid names that clash with DOM types (<code>history</code>, <code>Event</code>, <code>Location</code>).</p>`,
      cpp: `<p><b>Ports, plugins and closed sets.</b> A port is a class of pure virtual functions with a <b>virtual destructor</b>; mark implementations <code>override</code>. A word to avoid: <code>export</code> is a keyword, so plugin methods are named <code>exportReport</code>/<code>exportRows</code>. Closed sets of events are <code>std::variant</code> with <code>std::visit</code> and an <code>Overloaded</code> helper, which fails to compile if a case is missing. <b>Ownership and lifetimes.</b> A registry that creates or accepts plugins owns them as <code>std::unique_ptr&lt;Plugin&gt;</code>; a service that merely uses collaborators takes references and relies on <code>main</code> (the composition root) outliving it; <code>std::shared_ptr</code> is for objects with several real owners, such as singletons in a container. Never return a reference into a container you might modify, and never copy a polymorphic object by value (slicing). RAII replaces <code>finally</code>: a small guard object pops the resolution stack on every exit path. <b>Equality and hashing.</b> A value object is a class with private members and <code>bool operator==(const T&amp;) const = default;</code> (or <code>auto operator&lt;=&gt;</code>, which also makes it usable as a <code>std::map</code> key); an entity compares IDs only. A value type such as an aggregate snapshot is cheap to copy, which is how a repository hands out detached copies. <b>Injection and discovery.</b> C++ has no run-time reflection on constructors, so each injectable type declares <code>NAME</code> and a <code>Deps</code> type list that the container expands with a template; plugins are found with <code>dlopen</code>/<code>dlsym</code> and a stable <code>extern "C"</code> factory. <b>Numbers and time.</b> Signed overflow is undefined behaviour: do the arithmetic in a wider type (<code>__int128</code>) and check the range, as the money examples do; <code>/</code> and <code>%</code> truncate toward zero, so floor the quotient by hand for negative amounts. Evaluation order of function arguments is unspecified, so build ordered output in a variable first. The standard library has no UUID or date arithmetic: generate random bits and use day numbers. <b>Concurrency.</b> Guard version checks with <code>std::mutex</code> and <code>std::lock_guard</code>; use <code>thread_local</code> for a per-thread stack.</p>`
    },
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
